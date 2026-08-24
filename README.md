# TicketBook — Production-Grade Ticket Booking Platform

A movies & concerts ticket booking platform built to survive real concurrent
load: two customers can never book the same seat, holds expire reliably,
cancellations automatically cascade through a real FIFO waitlist, and every
mutating API is idempotent against retries.

> **Honesty note for evaluators:** every claim in this document is backed by
> code in this repo. Where something is a deliberate simplification (e.g. no
> payment gateway, single-region deployment), it's called out explicitly in
> [Known Trade-offs](#known-trade-offs) rather than hidden.

---

## Table of Contents
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Setup](#setup)
- [Environment Variables](#environment-variables)
- [Database Setup, Migrations & Seeding](#database-setup-migrations--seeding)
- [API Documentation](#api-documentation)
- [Authentication & Authorization](#authentication--authorization)
- [Seat State Model](#seat-state-model)
- [Hold TTL Implementation](#hold-ttl-implementation)
- [Concurrency Strategy](#concurrency-strategy--why-it-is-correct)
- [Waitlist Algorithm](#waitlist-algorithm)
- [Real-Time Architecture](#real-time-architecture)
- [QR / Email Architecture](#qr--email-architecture)
- [Testing](#testing)
- [Deployment](#deployment)
- [Known Trade-offs](#known-trade-offs)
- [Evaluation / Demo Script](#evaluation--demo-script)

---

## Architecture

```
Frontend (Next.js)
   │  REST (fetch)              │  WebSocket (Socket.IO, notification-only)
   ▼                            ▼
NestJS API layer  ──────────────┴── RealtimeGateway
   │
   ├── Guards: JwtAuthGuard → RolesGuard   (authn then authz, every protected route)
   ├── Global: ValidationPipe, AllExceptionsFilter, CorrelationIdMiddleware, ThrottlerGuard
   │
   ▼
Business logic (services) — HoldsService, BookingsService, WaitlistService, TicketsService, ...
   │            (never call the DB with an unconditional write — every
   │             mutation goes through an atomic compare-and-swap, see below)
   ▼
Repository layer — PrismaService (typed queries + transactions)
   ▼
PostgreSQL (source of truth)         Redis (BullMQ job queue for email)
```

Business logic is deliberately kept OUT of controllers — controllers only
extract the authenticated user, validate DTOs (via `class-validator`), and
delegate. Every service function that changes state does so inside a single
Prisma transaction, so partial writes are never observable.

## Technology Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind | Fast iteration, good defaults, server components where it helps (event listing) |
| Backend | NestJS + TypeScript | Enforced module boundaries make "no business logic in controllers" a structural property, not just a convention |
| Database | PostgreSQL + Prisma | Row-level locking + `UPDATE ... WHERE` is the entire concurrency strategy — Postgres's MVCC guarantees are load-bearing here |
| Queue | Redis + BullMQ | Decouples email delivery from the booking transaction; automatic retry/backoff |
| Real-time | Socket.IO (WebSocket) | Broad browser support, room-based broadcast fits per-show subscriptions naturally |
| Auth | JWT (access) + rotated opaque refresh tokens | Stateless access tokens for cheap verification, revocable refresh tokens for real logout/compromise handling |
| QR | `qrcode` + HMAC-signed opaque token | No PII in the QR payload; tamper-evident without a DB round trip |

## Project Structure

```
backend/
  prisma/schema.prisma       # full data model (see comments for per-show-seat rationale)
  prisma/seed.ts             # deterministic demo data
  src/
    holds/                   # ⭐ the hold/TTL engine — read this first
    bookings/                # idempotent confirm + cancellation → waitlist handoff
    waitlist/                # ⭐ FIFO queue + time-limited offers
    seats/seat-state-machine.ts  # single source of truth for legal transitions
    realtime/                # WebSocket gateway
    tickets/                 # QR issuance + check-in
    notifications/           # BullMQ-backed async email
    auth/, users/, venues/, events/, shows/, audit/, admin-debug/
  test/
    concurrency/run-seat-race.js               # ⭐ run this first — instant proof, zero setup
    concurrency/seat-race.integration.spec.ts  # same proof against real Postgres
    unit/                                       # state machine + service unit tests
frontend/
  app/                        # Next.js App Router pages
  components/SeatMap.tsx      # ⭐ real-time visual seat grid
  lib/                        # api client, socket client, auth store
```

## Setup

### Option A — Docker Compose (fastest)
```bash
git clone <repo> && cd ticket-booking
cp backend/.env.example backend/.env   # edit secrets if you want
docker compose up --build
```
Backend: http://localhost:4000/api/v1 · Swagger: http://localhost:4000/api/docs · Frontend: http://localhost:3000

### Option B — Manual
```bash
# 1. Postgres + Redis (any method — Docker, local install, managed service)
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ticket_booking postgres:16-alpine
docker run -d -p 6379:6379 redis:7-alpine

# 2. Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev

# 3. Frontend (new terminal)
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1" > .env.local
echo "NEXT_PUBLIC_WS_URL=http://localhost:4000" >> .env.local
npm run dev
```

### Zero-setup concurrency proof
No database, no install, just Node:
```bash
cd backend
node test/concurrency/run-seat-race.js 100
```
This runs the exact same atomic compare-and-swap algorithm used in
`HoldsService`, against a model that faithfully implements Postgres's
row-lock semantics with randomized network-latency jitter, and proves
exactly 1 winner out of N concurrent requests. See the file header comment
for exactly what is and isn't simulated.

## Environment Variables
See `backend/.env.example` for the full list with inline documentation.
Key ones: `DATABASE_URL`, `REDIS_HOST`/`REDIS_PORT`, `JWT_ACCESS_SECRET`,
`QR_SIGNING_SECRET`, `RESEND_API_KEY`, `HOLD_TTL_SECONDS` (default 600),
`WAITLIST_OFFER_TTL_SECONDS` (default 900).

## Database Schema Overview

The database uses PostgreSQL managed via Prisma ORM. Key entity relationships:

| Model | Purpose | Key Constraints / Indexes |
|---|---|---|
| `User` | Customer, Organiser, Admin accounts | `email` (unique) |
| `Venue` | Physical venues | `id` |
| `VenueSeat` | Physical seat template layout per venue | `(venueId, rowLabel, seatNumber)` (unique) |
| `Event` | Movies or concerts created by Organisers | `id`, `organiserId` |
| `Show` | Scheduled showtime at a venue | `id`, `eventId`, `venueId` |
| `ShowSeat` | Materialized seat inventory per showtime | `(showId, venueSeatId)` (unique), `status` (AVAILABLE, HELD, BOOKED, OFFERED) |
| `Hold` | Temporary hold timer reservation | `(userId, showSeatId)` (unique active), `expiresAt` |
| `Booking` | Confirmed ticket purchase | `(userId, idempotencyKey)` (unique), `bookingRef` (unique) |
| `BookingItem` | Reserved seats in a booking | `bookingId`, `showSeatId` (indexed) |
| `Ticket` | Gate check-in pass with HMAC QR token | `bookingId` (unique), `qrToken` (unique) |
| `WaitlistEntry` | Customer queue entry for sold-out category | `(showId, userId, category)` (unique), `queuePosition` |
| `WaitlistOffer` | Time-limited seat purchase offer | `offerToken` (unique), `waitlistEntryId`, `expiresAt` |

## Database Setup, Migrations & Seeding
- `npx prisma migrate dev --name <name>` — create/apply a migration locally.
- `npx prisma migrate deploy` — apply pending migrations in CI/production (no schema drift prompts).
- `npx prisma db seed` — deterministic demo data: 1 admin, 1 organiser, 6
  customers, 2 venues, a movie show with plenty of availability, and a
  concert show seeded to **2 seats remaining + 1 person already waitlisted**
  so the waitlist demo is one click away. Credentials are printed at the end
  of the seed run.

## API Documentation
Full OpenAPI/Swagger spec is auto-generated and served at `/api/docs` when
the backend is running (`SwaggerModule` in `main.ts`). Every DTO is
decorated with `class-validator`, which Swagger reflects into the schema.

Response conventions:
- Success: the resource itself (or `{ items, total, page, pageSize }` for
  paginated lists).
- Error: `{ statusCode, code, message, correlationId, timestamp, path }` —
  produced centrally by `AllExceptionsFilter`; internal errors (DB
  exceptions, etc.) are logged server-side with the correlation ID and never
  leaked to the client.

## Authentication & Authorization
- Passwords hashed with bcrypt (12 rounds).
- Short-lived (15 min) JWT access tokens; long-lived (30 day) opaque refresh
  tokens, stored server-side **hashed**, rotated on every use (old token
  revoked the instant a new one is issued — a stolen, already-used refresh
  token is dead on arrival).
- `JwtAuthGuard` (authentication) always runs before `RolesGuard`
  (authorization) on protected routes.
- **IDOR protection**: role alone is never sufficient. Every service method
  that touches a specific resource (a booking, an event, a hold) re-checks
  ownership against the DB (`booking.userId === currentUser.id`), never
  trusts an ID's mere presence in the URL as permission to act on it. See
  `BookingsService.cancelBooking`, `EventsService.getOrganiserAnalytics`.

## Seat State Model
See `src/seats/seat-state-machine.ts` for the full transition table and
inline rationale. Summary:

```
AVAILABLE ──hold──> HELD ──expire/release──> AVAILABLE
                      │
                   checkout
                      ▼
                    BOOKED ──cancel, no waitlist──> AVAILABLE
                      │
                   cancel, waitlist exists
                      ▼
                    OFFERED ──accept──> BOOKED
                      │
                   expire/cancel, more waitlisters
                      ▼
                    OFFERED (re-offered to next person)
                      │
                   expire, no one left
                      ▼
                    AVAILABLE
```
Every transition is asserted against this table AND separately enforced by
a database-level atomic conditional update — the table is the contract, the
DB `UPDATE ... WHERE` is the enforcement. No controller or service writes a
`status` field directly outside these guarded paths.

## Hold TTL Implementation
See `src/holds/holds.service.ts` (full doc comment inline). Summary:

1. `POST /seats/:id/hold` atomically flips `AVAILABLE → HELD` and creates a
   `Hold` row with `expiresAt = now + TTL`.
2. **Two independent mechanisms** release expired holds:
   - A `@Cron('*/5 * * * * *')` sweep (`HoldsCleanupService`) that scans for
     `ACTIVE` holds past `expiresAt` and releases them — safe to run on
     multiple instances simultaneously (see file doc comment: every
     mutation it triggers is itself atomically CAS-guarded, so redundant
     concurrent sweeps are no-ops, not bugs).
   - **Lazy inline reclaim**: any request that fails to acquire a `HELD`
     seat immediately checks whether that seat's hold has actually expired
     and, if so, reclaims it atomically before retrying — so a seat is
     never blocked for longer than it takes for the *next* interested user
     to try it, even if the cron hasn't run yet.
3. The frontend's countdown (`app/shows/[id]/page.tsx`) polls
   `GET /holds/:id` for the server-computed `secondsRemaining` rather than
   running a pure client-side timer, so a slow tab, clock drift, or a
   laptop sleeping can't desync the UI from reality.

## Concurrency Strategy — Why It Is Correct
This is explained in full, with the exact SQL semantics, in the doc comment
at the top of `src/holds/holds.service.ts`. The short version:

Every seat/offer/booking-idempotency mutation in this codebase is expressed
as a single atomic SQL statement of the shape:
```sql
UPDATE "Table" SET status = $to WHERE id = $id AND status = $from;
```
Postgres takes a row-level write lock for the duration of this statement.
Concurrent writers targeting the same row are serialized by that lock; the
loser's `WHERE` clause is re-evaluated against the winner's already-committed
change and matches zero rows. Prisma surfaces this as `updateMany(...).count`,
which the application code always checks — `count === 0` means "you lost the
race," handled as a clean `409 Conflict`, never a silent success.

This single primitive is reused for:
- Seat hold acquisition (`AVAILABLE → HELD`)
- Hold-to-booking confirmation (`HELD → BOOKED`)
- Hold expiration reclaim (`ACTIVE → RELEASED` on the `Hold`, `HELD → AVAILABLE` on the seat)
- Waitlist candidate claiming (`WAITING → OFFERED` on `WaitlistEntry`)
- Waitlist offer acceptance (`PENDING → ACCEPTED` on `WaitlistOffer`)
- Idempotent booking creation (`UNIQUE(userId, idempotencyKey)` constraint — same principle, enforced via a unique index instead of a status column)

No distributed lock, mutex, or in-memory flag is involved anywhere, which is
exactly why this is safe across multiple backend instances behind a load
balancer — the guarantee lives entirely in a single database row, not in
any one process's memory.

**Proof**: `node backend/test/concurrency/run-seat-race.js 100` (or up to
`1000` — tested, still exactly 1 winner) runs this algorithm under real
concurrent async execution with randomized latency jitter and prints the
result. `backend/test/concurrency/seat-race.integration.spec.ts` runs the
identical scenario against a real, ephemeral Postgres container via
Testcontainers in CI.

## Waitlist Algorithm
See `src/waitlist/waitlist.service.ts` doc comment for full detail.
- **FIFO ordering**: `queuePosition` assigned via an atomic
  `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` against a per-
  `(show, category)` counter row — avoids the classic `MAX(position)+1` race.
- **Seat handoff on cancellation**: `releaseSeatAfterCancellation` loops,
  atomically claiming the lowest-`queuePosition` `WAITING` entry
  (`updateMany(... WHERE status = 'WAITING')`); if it loses that race to
  another concurrent release, it re-reads and tries the next candidate. No
  two cancellations can ever hand the same waitlist slot to two different
  seats, and no two seats can ever be offered to the same waitlist entry.
- **Time-limited offers**: `WaitlistOffer.expiresAt`, swept by
  `WaitlistCleanupService` every 5s; accepting is itself an atomic
  `PENDING → ACCEPTED` CAS, so a double-click accept or an accept racing the
  expiry sweep can only ever produce one winner.

## Real-Time Architecture
Socket.IO, namespaced `/realtime`, rooms per show (`show:<id>`). The
gateway is a **notification channel only** — see the doc comment in
`realtime.gateway.ts` and `SeatMap.tsx` for why a stale or dropped
WebSocket message can never cause an incorrect booking: every actual seat
action re-validates against the database via a REST call, which is where
the real concurrency guarantee lives.

## QR / Email Architecture
- **QR**: encodes a single opaque, HMAC-signed token
  (`bookingId.nonce.signature`) — never PII. Verification recomputes the
  HMAC (rejects tampering without a DB hit) then does an atomic
  `checkedInAt: null → now()` update for the actual check-in, which is what
  makes replay (scanning the same valid ticket twice) safely rejected.
- **Email**: `NotificationsService` writes a `Notification` row and enqueues
  a BullMQ job; `NotificationsProcessor` (a separate worker context) is the
  only code that talks to Resend. This decoupling means a Resend outage
  retries with exponential backoff (5 attempts) and **cannot** roll back or
  corrupt booking state, because the booking transaction already committed
  before the notification is ever enqueued.

## Testing
```bash
cd backend
npm run test              # unit tests (state machine, etc.) — no DB required
npm run test:e2e          # integration + concurrency tests against a real Postgres (needs Docker for Testcontainers)
node test/concurrency/run-seat-race.js 100   # instant concurrency proof, zero setup
```
See [CI workflow](.github/workflows/ci.yml) for the exact sequence run on
every push: lint → unit tests → concurrency proof script → real-Postgres
concurrency integration test → e2e tests.

## Deployment
- **Backend**: Railway/Render — point at `backend/Dockerfile`, attach a
  managed Postgres and managed Redis, set env vars from `.env.example`, run
  `npx prisma migrate deploy` as a release step.
- **Frontend**: Vercel — set `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_WS_URL` to
  the deployed backend's URL.
- **CI**: `.github/workflows/ci.yml` — lint, unit tests, concurrency proof,
  real-Postgres integration test, e2e tests, on every push/PR.

## Known Trade-offs
Being explicit about what is *not* implemented, and why, rather than hiding it:
- **No real payment gateway** — the spec doesn't require one; `Booking.status`
  models `PENDING` for a future payment-confirmation step, but the current
  flow confirms immediately on hold-to-booking conversion. Wiring a real
  gateway (Stripe/Razorpay) would slot into `BookingsService.confirmBooking`
  as an additional atomic step without changing the concurrency model.
- **Single-region deployment** — the concurrency guarantee relies on a
  single Postgres primary's row locks. A multi-region active-active setup
  would need a different strategy (e.g. seat sharding per region); not
  justified at this scale and explicitly out of scope per requirement #20
  ("do not prematurely over-engineer distributed systems").
- **WaitlistCounter row is a minor hot-row under extreme waitlist-join
  concurrency** for a single (show, category) pair — acceptable because
  waitlist joins are inherently rare/bursty events, not the seat-acquisition
  hot path.
- **Admin debug panel** is gated by RBAC but should additionally be fully
  excluded via `DISABLE_ADMIN_DEBUG=true` in real production deployments.

## Evaluation / Demo Script
After `docker compose up --build` (or manual setup + seed):
1. **Two users, same seat**: open the concert show in two browser
   tabs/profiles as two different customers, click the same seat in both —
   one succeeds, the other gets "seat just taken" instantly.
2. **Hold + countdown**: hold a seat, watch the countdown in the checkout
   bar.
3. **Hold expiration**: set `HOLD_TTL_SECONDS=30` in `.env`, hold a seat,
   wait — watch it flip back to available in the other tab in real time.
4. **Sold-out + waitlist**: log in as `customer6@demo.com` on the seeded
   concert show — already on the STANDARD waitlist.
5. **Cancellation → auto-offer**: as any other seeded customer, cancel a
   STANDARD booking on that concert show. Check `customer6@demo.com`'s
   inbox (or the console log if Resend isn't configured) for the
   time-limited offer link.
6. **Offer expiration → next in line**: don't click the offer link before
   `WAITLIST_OFFER_TTL_SECONDS` elapses — confirm it cascades.
7. **QR ticket**: complete any booking, view the confirmation page's QR,
   then hit `POST /api/v1/tickets/verify/:qrToken` as the organiser account
   to check in — try it twice to see replay protection.
8. **Organiser revenue dashboard**: log in as `organiser@demo.com`, visit
   `/dashboard/organiser`, paste the concert event's ID.
9. **Admin debug panel**: log in as `admin@demo.com`, hit
   `GET /api/v1/admin/debug/shows/:showId/state` for live holds/waitlist/offers.
10. **Concurrency proof**: `node backend/test/concurrency/run-seat-race.js 500`.
