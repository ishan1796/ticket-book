'use client';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * One shared socket per browser tab. Components subscribe/unsubscribe to
 * show rooms as they mount/unmount — the connection itself persists across
 * page navigations so we don't pay a reconnect cost on every seat map view.
 *
 * IMPORTANT: this connection is a notification channel only (see backend
 * realtime.gateway.ts doc comment). No component ever treats a socket
 * event as authorization to complete a booking — every state-changing
 * action still goes through the REST API, which is the actual source of
 * truth and where the real concurrency guarantee lives.
 */
export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';
    socket = io(`${url}/realtime`, { transports: ['websocket'], autoConnect: true });
  }
  return socket;
}
