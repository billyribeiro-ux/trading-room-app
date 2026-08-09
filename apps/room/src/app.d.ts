import type { User } from '$lib/server/db/schema';

declare module 'svelte/elements' {
  interface HTMLAttributes<T> {
    audiovolslider?: string;
  }

  interface HTMLInputAttributes {
    /**
     * The `search` event, which `<input type="search">` fires when its clear "x" is used or Enter
     * is pressed. It is not in the HTML standard - it is a WebKit/Chromium addition - so Svelte's
     * generated attribute types do not carry it, but the capture binds it:
     * `x("search", () => g(3).searchUsers())` on the roster's `#userSearchTermInput`.
     */
    onsearch?: (event: Event & { currentTarget: EventTarget & HTMLInputElement }) => void;
  }
}

declare global {
  namespace App {
    interface Locals {
      /**
       * Null only on `/session`, the handoff receiver. hooks.server.ts refuses every other
       * anonymous request, so guarded code narrows this with requireUser(locals) rather than
       * asserting.
       */
      user: User | null;
      sessionId: string | undefined;
      /**
       * The room this session was handed off into. Null for a session that predates the handoff,
       * which is the only case the room has to fall back for.
       */
      roomShortCode: string | null;
    }
  }
}

export {};
