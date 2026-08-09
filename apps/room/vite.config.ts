import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

/**
 * Makes the Rust API reachable on this origin during `vite dev`.
 *
 * Nothing in this app calls it yet. It is here so that when the room does, the session works:
 * the API issues `__Host-` prefixed cookies, which a browser only sends to the origin that set
 * them and which cannot carry a `Domain`. Calling `127.0.0.1:8080` cross-origin would mean
 * either a `Domain=`-scoped cookie - readable by every present and future subdomain - or CORS
 * plus `credentials: 'include'` and a second `Origin` allowlist to get wrong.
 *
 * `ws: true` is what makes the realtime socket work: `/api/v1/rooms/{id}/events` is an upgrade
 * request, and without it Vite answers the handshake itself and the socket closes immediately.
 *
 * In production this is a reverse proxy in front of both processes.
 */
const API = process.env.TRADINGROOM_API_URL ?? 'http://127.0.0.1:8080';

/*
  The room's dev/preview port, declared here so the pair of applications agrees by construction
  rather than by memory.

  There was no port here at all, so the room took Vite's default 5173 — the very port the
  controller wants — while the CONTROLLER's `.env` pointed `ROOM_BASE_URL` at 5174 and the room's
  own `.env` pointed `CONTROL_BASE_URL` at 5180, a port nothing served. Every one of the four values disagreed, and the symptom was a bare
  500 on Launch: the room fetched its configuration from the controller, got ECONNREFUSED, and
  failed closed exactly as designed. The design was right; the wiring was never true.

  `strictPort` so a busy port is a loud failure instead of a silent bind to the next one. Declaring
  5174 here is also what frees 5173 for the controller, which is where the owner wants it.

  Paired with the controller's own SSOT (`vite.config.ts`, port 5173). Change either and change the
  matching `*_BASE_URL` in both `.env.example` files.
*/
const localHost = '127.0.0.1';
const localPort = 5174;

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    host: localHost,
    port: localPort,
    strictPort: true,
    proxy: {
      '/api/v1': { target: API, changeOrigin: false, ws: true },
      // Called server-side by `$lib/server/tradingroom-api`, so this is only here so a browser
      // that follows a redirect to one does not get a 404 from Vite.
      '/api/auth': { target: API, changeOrigin: false }
    }
  },
  preview: { host: localHost, port: localPort, strictPort: true },
  test: {
    // Points the suite at a throwaway database instead of the app's; see vitest.setup.ts.
    setupFiles: ['./vitest.setup.ts'],
    // `new-room-control` is a separate SvelteKit project that happens to sit in this directory. Its
    // files resolve `$lib` against ITS src, so collecting them from this root fails at import with
    // "Cannot find module '$lib/sanitize-html'" - five red files that are not this app's tests. It
    // has its own runner; this one stops at this project's boundary.
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', 'new-room-control/**']
  }
});
