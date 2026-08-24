# System Design — Ticket Booking Platform
*(word-limited to ~800 per deliverable requirements)*

## Architecture
Next.js (frontend) → NestJS REST API → PostgreSQL (source of truth), with
Redis/BullMQ for async email and a Socket.IO gateway for real-time seat-map
notifications. Business logic lives in NestJS services, never controllers;
every mutating service method runs inside a single Prisma transaction. The
WebSocket layer is purely advisory — every real seat action re-validates
against Postgres via REST, so a stale/dropped socket message can never
cause an incorrect booking.

## Database Model
Seats are modeled **per show**, not just per venue. `VenueSeat` is the
static physical layout (row, seat number, category, coordinates), created
once. `ShowSeat` is materialized once per `(show, venueSeat)` pair when a
show is scheduled, and carries the *mutable* state (`status`, `version`)
that bookings actually operate on. This matters because two different
showtimes sharing the same auditorium must have fully independent
availability — if we tried to derive availability by querying `VenueSeat`
directly, both shows would collide on the same rows and updates for one
show would corrupt the other's seat map. `ShowSeat.(showId, venueSeatId)`
is unique, which is also what makes seat acquisition a pure `UPDATE`
against an existing row rather than a racy insert-or-check.

## Seat Lifecycle
`AVAILABLE → HELD → BOOKED`, with `BOOKED → OFFERED → BOOKED` on the
cancellation/waitlist path, and expiry/release paths returning to
`AVAILABLE`. All transitions are centralized in
`seat-state-machine.ts` (single source of truth, no scattered status writes
in controllers) and independently enforced by an atomic database
compare-and-swap on every write.

## Concurrency Strategy — Why It's Correct
Every mutation that matters is a single SQL statement:
`UPDATE "Table" SET status = $to WHERE id = $id AND status = $from`.
Postgres takes a row-level write lock for the duration of this statement.
If two requests race for the same row, the database serializes them: the
first to acquire the lock commits its change; the second's `WHERE` clause
is then re-evaluated against the *already-updated* row and matches zero
rows. Prisma reports this as `updateMany(...).count === 0`, which every
call site checks and turns into a clean `409 Conflict` — never a silent
double-success. No mutex, distributed lock, or in-process flag is involved
anywhere, which is precisely why this holds across multiple backend
instances behind a load balancer: the guarantee lives inside one database
row, not in any process's memory. The same primitive covers hold
acquisition, hold-to-booking confirmation, hold-expiry reclaim, waitlist
candidate claiming, and offer acceptance. Idempotent booking creation uses
the equivalent guarantee via a `UNIQUE(userId, idempotencyKey)` constraint:
a retried request either finds the original booking already committed, or
loses a `P2002` unique-violation race and is transparently handed the
winner's result — never a duplicate.

Proof: `backend/test/concurrency/run-seat-race.js` runs this exact
algorithm under genuine concurrent async execution with randomized latency
jitter and demonstrates exactly 1 winner out of up to 1000 simultaneous
requests for one seat, plus three further scenarios (expiry-vs-new-hold,
duplicate confirmation, duplicate waitlist acceptance) — all passing. An
equivalent test runs against a real, ephemeral Postgres container via
Testcontainers in CI.

## Hold / TTL Mechanism
A hold atomically flips `AVAILABLE → HELD` and stores `expiresAt`. Two
independent, non-conflicting release paths exist: a 5-second cron sweep
(safe to run on multiple instances concurrently, since every mutation it
triggers is itself CAS-guarded — redundant sweeps are no-ops), and a lazy
inline reclaim triggered by the very next request that fails to acquire a
`HELD` seat, so a seat is never blocked longer than until someone else next
wants it, regardless of cron timing.

## Waitlist Algorithm
A real FIFO queue per `(show, category)`: `queuePosition` is assigned via
an atomic `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` against a
counter row, avoiding the classic `MAX(position)+1` race. On cancellation,
the release loop atomically claims the lowest-position `WAITING` entry; if
that claim loses a race to a concurrent release, it re-reads and tries the
next candidate — so two cancellations can never hand one person's slot to
two different seats.

## Time-Limited Offer Handling
Each offer carries its own `expiresAt`; a 5-second sweep expires unanswered
offers and cascades to the next candidate. Accepting is itself an atomic
`PENDING → ACCEPTED` compare-and-swap, so a double-click accept, or an
accept racing the exact moment the sweep expires the same offer, can only
ever produce one winner — there is no window where both "accepted" and
"expired" can be simultaneously true.

## Real-Time Architecture
Socket.IO rooms scoped per show; the server broadcasts `seat_update` events
after each committed transaction. Clients treat every event as "go
re-check," never as authorization — the REST layer remains the sole source
of truth.

## Failure Handling & Trade-offs
Email is decoupled from booking transactions via a BullMQ queue with
backoff retries, so a provider outage cannot corrupt booking state. No
payment gateway is wired in (out of scope); no multi-region active-active
deployment (would need seat sharding — not justified at this scale, and
avoided per the "don't over-engineer distributed systems" requirement).
