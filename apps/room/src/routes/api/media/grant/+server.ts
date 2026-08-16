/**
 * Mints this connection's media admission grant.
 *
 * `hooks.server.ts` already refuses every path but `/session` when there is no session
 * (`src/hooks.server.ts:5-16`), so reaching this handler means a cookie resolved to a real `users`
 * row. `requireUser` narrows that and is the second line of defence if a route is ever added
 * outside the guard (`src/lib/server/auth.ts:22-28`).
 *
 * **POST, not GET.** The one other JSON endpoint in this app is a GET
 * (`src/routes/api/notes/[noteId]/versions/+server.ts`), but that one returns note history. This
 * returns a bearer credential, and a GET is the shape browsers, proxies and history stores are
 * built to cache. `cache-control: no-store` says so explicitly as well.
 *
 * The signing key never appears in the response and never leaves the server: it is read only inside
 * `#lib/server/media-grant`, and SvelteKit refuses to bundle a `$lib/server` module into client
 * code. What the browser gets is the token, the room, its role and the expiry.
 */

import { json } from '@sveltejs/kit';
import { requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import {
  GrantConfigError,
  mediaIceServers,
  mediaSignallingUrl,
  mintGrant
} from '#lib/server/media-grant.js';
import { RoomConfigUnavailable, readRoomConfig } from '#lib/server/room-config-client.js';
import { hasMediaElevation } from '#lib/server/media-elevation.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
  const user = requireUser(locals);

  /*
    Media admission comes from the CONTROLLER's membership, not from this room's `users.role`.

    The five permissions are per room and live on `room_users`, so they are only knowable by asking
    the controller. The reference computes admission as
    `isPresenter || hasCam || hasMic || hasScreen` — see `joinsMediaAsProducer` — which is what
    lets an owner hand one Participant a microphone without promoting them.

    No fallback. If the controller cannot be reached we refuse rather than mint a grant from a
    guess: guessing high hands a stranger a producer transport, and guessing low silently mutes a
    presenter mid-session. Both are worse than a 503 the browser can retry.
  */
  let admission;
  try {
    const config = await readRoomConfig(request, requireRoomShortCode(locals), user.email);
    /*
      A live hand-over counts, and it is read from OUR database rather than claimed by the browser.

      `giveMicScreen` is the reference's runtime elevation: a presenter hands a member mic/screen
      for the session without changing their standing permissions. It never touches the controller's
      membership, so without this line the recipient restarts its media, re-mints the same `member`
      grant, and the SFU answers `forbidden` — the media restarts and nothing works.

      The reference makes it work by letting the client re-join asserting its own `isP`. That is the
      privilege escalation removed on 2026-08-07, so the decision stays here: the row is written by
      the presenter-gated `giveMicScreen` COMMAND — `routes/presenter-commands.remote.ts` since
      2026-08-15, an action before that — and simply read back. `TODO.md` gap 22.

      Note what this line does NOT do: it never sets `isPresenter`. A member handed a microphone is
      a member with a microphone, for the session, and nothing else — no alerts, no polls, no
      moderation. `media-elevation-contract.test.ts` asserts the absence.
    */
    const elevated = hasMediaElevation(requireRoomShortCode(locals), user.id);

    admission = {
      isPresenter: config.member?.isP === true,
      hasMic: (config.member?.permissions.hasMic ?? false) || elevated,
      hasCam: config.member?.permissions.hasCam ?? false,
      hasScreen: (config.member?.permissions.hasScreen ?? false) || elevated
    };
  } catch (error) {
    if (error instanceof RoomConfigUnavailable) {
      console.error('[media] cannot resolve media admission:', error.message);
      return json(
        { message: 'The room configuration is unavailable; media cannot start.' },
        { status: 503, headers: { 'cache-control': 'no-store' } }
      );
    }
    throw error;
  }

  let minted;
  try {
    minted = mintGrant(user, { admission, roomShortCode: requireRoomShortCode(locals) });
  } catch (error) {
    if (error instanceof GrantConfigError) {
      // A deployment misconfiguration, not a client error: the caller did nothing wrong and
      // cannot fix it by retrying. The message names the variable, because "every peer is
      // refused with no other symptom" is exactly how a key mismatch presents (`grant.rs:124-126`).
      console.error('[media] cannot mint an admission grant:', error.message);
      return json(
        { message: 'The media server is not configured on this deployment.' },
        { status: 503, headers: { 'cache-control': 'no-store' } }
      );
    }
    throw error;
  }

  return json(
    {
      grant: minted.grant,
      room: minted.room,
      role: minted.role,
      expiresAt: minted.expiresAt,
      url: mediaSignallingUrl(),
      // Minted here rather than shipped as a PUBLIC_ variable: the TURN credential is derived from
      // a long-term secret that must not reach the browser, and it expires. Empty when no relay is
      // configured, which is the normal local-development state.
      iceServers: mediaIceServers(user)
    },
    { headers: { 'cache-control': 'no-store' } }
  );
};
