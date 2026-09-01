import { error } from '@sveltejs/kit';
import { command } from '$app/server';
import { z } from 'zod';
import { presenterRoom } from '#lib/server/auth.js';
import { ensureDatabase } from '#lib/server/db/index.js';
import { publishToRoom } from '#lib/server/room-events.js';
import {
  clearVideoForAll,
  clearYoutubeForAll,
  recordVideoForAll,
  recordYoutubeForAll
} from '#lib/server/room-media-state.js';

/*
  "For All" — a presenter plays a video, or a YouTube video, in every browser in the room.

  One module because they are one feature and one decision: a presenter's typed string becomes an
  `src` attribute in every member's browser. They share the gate (`presenterRoom()`), the `cmds`
  channel, and the length bound below. What they deliberately do NOT share is the URL check, and the
  reason is written out at each of them, because "make them consistent" is the tidy-up that would
  break one of them.

  Both broadcast and neither assigns anything locally. The sender learns its own command from the
  channel like everybody else — the same rule the private-chat module states — so there is no
  optimistic path that can disagree with what the room actually received.
*/

/*
  The cap on a url a presenter broadcasts to every browser in the room.

  2,000 is the length IE capped an address bar at and the number every server and proxy since has
  been built to survive; nothing this room plays is anywhere near it. It is a BOUND, not a
  validation — `broadcastableUrl` below decides whether the string is playable.

  Moved here from `+page.server.ts` with the only two actions that ever used it.
*/
const MAX_BROADCAST_URL = 2_000;

/**
 * A url this room is willing to put into an `src` attribute in every member's browser.
 *
 * **Deny by default, and PARSED rather than pattern-matched.** The client's own check is
 * `value.toLowerCase().includes('http://') || value.toLowerCase().includes('https://')` — a
 * substring test, so any string that merely CONTAINS `https://` anywhere in it passes, whatever
 * scheme it actually starts with. That was harmless while the value only ever reached the
 * presenter's own `<video>`; it is not harmless now that a presenter's typed string is broadcast
 * into an `src` attribute in every browser in the room. `new URL` plus an explicit two-entry
 * protocol allow-list is the check that actually holds.
 *
 * A zod `.url()` would not be the same thing: it accepts every scheme `new URL` does, including
 * `javascript:` and `data:`. The allow-list is the point, so the check stays hand-written and the
 * schema below only bounds the length.
 */
function broadcastableUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value || value.length > MAX_BROADCAST_URL) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    // Not a url at all. Loud refusal at the call site; never a silent fallback to "play it anyway".
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  return value;
}

/**
 * The shared argument shape.
 *
 * `url` is optional because both stop commands carry none — and `.max` rather than a URL check,
 * because the two commands validate the string differently and doing it here would force them to
 * agree. Length is the one bound they DO share.
 */
const forAllArgs = <const T extends readonly [string, ...string[]]>(commands: T) =>
  z.strictObject({
    cmd: z.enum(commands),
    url: z.string().max(MAX_BROADCAST_URL).optional()
  });

/**
 * `playVideoForAll` / `stopVideoForAll` — "Play For All", and the overlay's "Stop For All".
 *
 * The url IS parsed here, because it reaches a `<video src>` as itself. That is the difference from
 * the YouTube command below and it is not an inconsistency.
 */
export const videoForAll = command(
  forAllArgs(['playVideoForAll', 'stopVideoForAll']),
  async ({ cmd, url }) => {
    ensureDatabase();
    const room = presenterRoom();

    if (cmd === 'stopVideoForAll') {
      /*
        THE ROW FIRST, THEN THE BROADCAST, and the order is the one that fails safely.

        Between the two, a member joining sees the row — so writing the row first means the worst
        outcome of a crash in between is a member who is not shown a video the room is no longer
        watching. The other order leaves the row saying a stopped video is playing, and every
        arrival after it is dropped onto a dead VideoPlayer tab until somebody plays something else.
      */
      clearVideoForAll(room);
      publishToRoom(room, { channel: 'cmds', data: { cmd } });
      return;
    }

    const playable = broadcastableUrl(url ?? '');
    if (!playable) error(400, 'That is not a playable video url.');

    /*
      `videoPlayTime: null` — this room's Play is the reference's "Play now" button, whose callback
      is `sendServerAdminCommand("playVideoForAll", {url: e, videoPlayTime: null})` at byte
      1,981,700. The scheduled sibling posts a timestamp instead and is a separate gap: this room's
      scheduler is the presenter's own `setTimeout`, which `TODO.md` records and which persisting the
      url does not by itself fix.

      Recorded as null rather than omitted, because null is what the REPLAY gate reads —
      `videoURL && !videoPlayTime` — so "playing now" has to be written, not merely implied.
    */
    recordVideoForAll(room, playable, null);
    publishToRoom(room, { channel: 'cmds', data: { cmd, url: playable } });
  }
);

/**
 * `playYTForAll` / `stopYTForAll` — the YouTube modal's Play, and the overlay's "Stop For All".
 *
 * ## The stop-then-play sequence is the reference's, and it is deliberate
 *
 * Byte 2,296,932:
 *
 * ```js
 * playYtVideo() {
 *   this.appService.sendServerAdminCommand('stopYTForAll', {url: this.youtubeURL});
 *   this.appService.sendServerAdminCommand('playYTForAll', {url: this.youtubeURL});
 * }
 * ```
 *
 * Two commands, in that order, so a second video replaces the first cleanly. What is READ, and
 * nothing beyond it: the room's `stopYTForAll` subscriber is `() => { this.ytURL = null }`, and the
 * overlay's `ytURL` setter is
 *
 * ```js
 * set ytURL(e) { this._ytURL = e; e && (…, this.playYTURL(e, this.startTime)) }
 * ```
 *
 * so a falsy value tears the frame down and a truthy one rebuilds the embed. The stop is what puts
 * the null in between, which is what makes replaying the SAME url a change rather than a no-op.
 *
 * Both go out from ONE call rather than two, because two in-flight requests can be answered in
 * either order and an inverted pair leaves every browser with a torn-down overlay.
 *
 * ## The overlay's own stop carries no url
 *
 * Byte 1,503,220: `stopYTForAll() { this.appService.sendServerAdminCommand('stopYTForAll') }`. The
 * url only rides on the stop that PRECEDES a play, and the receiver ignores it either way
 * (`case "stopYTForAll": this.guiEventBus.emit("stopYTForAll")`, byte 1,024,212 — no payload
 * forwarded). It is reproduced because it is what the wire carries, not because anything reads it.
 *
 * ## Why the url is NOT parsed here, unlike `videoForAll`
 *
 * It never reaches an attribute as itself. `YoutubePlayerOverlay` matches it against the two
 * captured patterns and interpolates the CAPTURED GROUP into a hard-coded
 * `https://www.youtube.com/embed/…` — and the video-id group is `([^#&?]*)`, so nothing it can
 * contain escapes that origin. Requiring a parseable URL would reject `www.youtube.com/watch?v=x`,
 * which the reference accepts and plays.
 */
export const youtubeForAll = command(
  forAllArgs(['playYTForAll', 'stopYTForAll']),
  async ({ cmd, url }) => {
    ensureDatabase();
    const room = presenterRoom();

    if (cmd === 'stopYTForAll') {
      /* Row first, then the broadcast — same ordering argument as `videoForAll` above. */
      clearYoutubeForAll(room);
      publishToRoom(room, { channel: 'cmds', data: { cmd } });
      return;
    }

    const trimmed = (url ?? '').trim();
    if (!trimmed) error(400, 'That is not a playable youtube url.');

    /*
      The reference's order, reproduced exactly. Publishing is synchronous, so the two arrive on
      every subscriber in this order and cannot be reordered by the network.
    */
    /*
      The START MOMENT, written before the pair goes out, so a member arriving one second later
      computes an offset from a time the room had already reached rather than from their own.

      It is written ONCE for the stop-then-play pair rather than cleared by the stop and set by the
      play: the stop exists to put a null between two urls in the OVERLAY (byte 2,296,932), and
      running the server's clear in the middle would leave a member who joined in that window with
      no video at all. The room never stopped watching anything.
    */
    recordYoutubeForAll(room, trimmed);
    publishToRoom(room, { channel: 'cmds', data: { cmd: 'stopYTForAll', url: trimmed } });
    publishToRoom(room, { channel: 'cmds', data: { cmd: 'playYTForAll', url: trimmed } });
  }
);

/**
 * `sendSalesImageToChat` and `sendUsersToURL` — the two Session Control broadcasts that told the
 * presenter *"Command send OK."* and sent nothing.
 *
 * ## What they were
 *
 * `session-send-sales-image` and `session-send-users-url` shared a branch with
 * `session-send-video`, which is GENUINE — it validates, refuses a duplicate and writes
 * `localStorage`. Its two siblings fell past all of that to `closeModal()` and an alert. A reader
 * checking that branch saw real work and moved on, which is exactly why they lasted.
 *
 * ## Both ends, read at bytes 1015180 and 1015357 of the v4 bundle
 *
 *     case"sendSalesImageToChat": if(!i||!i.url) return;
 *       this.globals.isPresenter || this.appEventBus.emit("sendSalesImageToChat",i); break;
 *     case"sendUsersToURL": if(!i||!i.url) return;
 *       this.globals.isPresenter || this.appEventBus.emit("sendUsersToURL",i); break;
 *
 * Two things there are easy to miss and both are reproduced by the receiver, not here:
 *
 *  - **the frame is IGNORED without a `url`** — `!i || !i.url` — so an empty broadcast is a no-op
 *    rather than a member being sent to nowhere;
 *  - **`globals.isPresenter ||` means the PRESENTER DOES NOT ACT ON THEIR OWN BROADCAST.** The
 *    sender is deliberately excluded, which is why this module's own note that "the sender learns
 *    its own command from the channel like everybody else" needs qualifying for these two: they
 *    learn it and then decline it.
 *
 * The senders are the buttons `" Send sales image to chat "` and `" Send users to URL "` at byte
 * 2147273ff, both taking no argument — the presenter is prompted for the URL first, which is what
 * our `Please enter the URL:` prompt already does.
 *
 * ## Why the same URL gate as the video
 *
 * `sendUsersToURL` navigates every member's browser and `sendSalesImageToChat` puts a presenter's
 * typed string into every member's chat. Both are a presenter's text reaching every browser in the
 * room, which is precisely the hazard `broadcastableUrl` was written for — parsed, deny-by-default,
 * not the client's substring test.
 */
export const sessionSendUrl = command(
  forAllArgs(['sendSalesImageToChat', 'sendUsersToURL']),
  async ({ cmd, url }) => {
    ensureDatabase();
    const room = presenterRoom();

    const target = broadcastableUrl(url ?? '');
    if (!target) error(400, 'That is not a url this room will send.');

    publishToRoom(room, { channel: 'cmds', data: { cmd, url: target } });
  }
);
