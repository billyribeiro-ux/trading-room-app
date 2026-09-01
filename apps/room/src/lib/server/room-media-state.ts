import { eq } from 'drizzle-orm';

import { db, ensureDatabase } from './db/index.js';
import { roomState } from './db/schema.js';

/**
 * WHAT THE ROOM IS PLAYING, SO SOMEBODY WHO ARRIVES LATE GETS TO SEE IT.
 *
 * ## The gap this closes, and why it was a gap rather than a divergence
 *
 * `TODO.md` carried this as an evidence gap for weeks: *"No persisted room video/YouTube state, so
 * the four 'For All' commands have no LATE-JOIN REPLAY."* The commands broadcast and are received;
 * what was missing is the reference's server side of them, and it was missing because `room_state`
 * had nowhere to put it. Its own closing line was *"a decision, not evidence — whether this room
 * persists playing-media state, or stays process-local as the SSE hub itself already is."*
 *
 * The decision is to match the reference, and the reference is unambiguous at three sites:
 *
 * ```js
 * roomState.videoURL && !roomState.videoPlayTime &&
 *   (hideVideoPlayer = !0, videoPlayerUrl = roomState.videoURL,
 *    onMainTabChange("presAreaTabs-videoplayer"))                             // byte 1,967,330
 * roomState.ytURL && emit("playYTForAll",
 *   {url: roomState.ytURL, startTime: roomState.ytStartTime})                 // byte 1,965,054
 * subscribe("playYTForAll", e => { let i = 0;
 *   if (e.startTime) { let o = Number(e.startTime), s = Date.now();
 *     i = Math.round((s - o) / 1e3), this.startTime = i } else this.startTime = 0 })
 *                                                                            // byte 1,964,799
 * ```
 *
 * ## Three things the capture decides that a reasonable design would get wrong
 *
 * **The video replay is gated on `!videoPlayTime`.** A play SCHEDULED for later has a url in the
 * row and nothing on screen, so replaying it would drop an arriving member onto an empty
 * VideoPlayer tab minutes before the video exists. The reference's `&& !roomState.videoPlayTime` is
 * the whole of that rule and it is easy to read past.
 *
 * **The YouTube seek offset is DERIVED, never sent.** `ytStartTime` is a start TIMESTAMP; the
 * subscriber turns it into elapsed seconds itself. It occurs exactly once in 2,891,205 bytes, in
 * the replay above — the live command carries `url` alone. So this module stores a moment, not a
 * duration, and nothing computes an offset on the server.
 *
 * **There is no scheduled case for YouTube.** The modal has no Play-later button, so `ytStartTime`
 * is written when the play goes out and there is no `ytPlayTime` to mirror `videoPlayTime`. A
 * symmetric design would have invented one, and a column nothing writes is the dead scaffolding
 * this repository forbids.
 *
 * ## Why a module rather than four queries at the call sites
 *
 * Every write here is an UPSERT against a primary key, and every one of them has to leave the other
 * media alone — a video starting must not clear the room's YouTube overlay, because upstream's two
 * are independent and both replay. Written inline that is four chances to name the wrong column set
 * in a `set:` clause, and the failure is silent: the room keeps working and the replay quietly
 * stops. One module, one `set` per fact.
 */

/** What a joining member needs to know, in the shape the page's replay reads. */
export interface RoomMediaState {
  /** `roomState.videoURL`, or null when nothing is playing. */
  readonly videoUrl: string | null;
  /**
   * `roomState.videoPlayTime` as epoch milliseconds, or null for "playing now".
   *
   * Returned rather than folded into `videoUrl` because the REPLAY needs both: the reference's gate
   * is `videoURL && !videoPlayTime`, so a caller that only received the url could not tell a live
   * play from an armed one and would show the arriving member an empty tab.
   */
  readonly videoPlayTime: number | null;
  /** `roomState.ytURL`, or null. */
  readonly ytUrl: string | null;
  /**
   * `roomState.ytStartTime` as epoch milliseconds — WHEN the room started playing, not how far in.
   *
   * The offset is the subscriber's to compute: `Math.round((Date.now() - startTime) / 1000)`. Sent
   * as the moment for the reason the reference sends it as the moment — the answer is different for
   * every member and it depends on when each of them arrives.
   */
  readonly ytStartTime: number | null;
}

const EMPTY: RoomMediaState = {
  videoUrl: null,
  videoPlayTime: null,
  ytUrl: null,
  ytStartTime: null
};

/**
 * The room's media state, for the page load.
 *
 * A room with no row answers `EMPTY` rather than throwing: a room nobody has played anything in has
 * no row, and that is the common case rather than an error.
 */
export function roomMediaState(shortCode: string | undefined): RoomMediaState {
  if (!shortCode) return EMPTY;
  ensureDatabase();
  const row = db
    .select({
      videoUrl: roomState.videoUrl,
      videoPlayTime: roomState.videoPlayTime,
      ytUrl: roomState.ytUrl,
      ytStartTime: roomState.ytStartTime
    })
    .from(roomState)
    .where(eq(roomState.roomShortCode, shortCode))
    .get();
  if (!row) return EMPTY;
  return {
    videoUrl: row.videoUrl ?? null,
    videoPlayTime: row.videoPlayTime?.getTime() ?? null,
    ytUrl: row.ytUrl ?? null,
    ytStartTime: row.ytStartTime?.getTime() ?? null
  };
}

/**
 * `playVideoForAll` — record what the room is watching, and when it starts.
 *
 * `playTime` is `null` for the reference's "Play now" button and a moment for "Play later". Stored
 * either way, because the REPLAY gate reads it: `videoURL && !videoPlayTime`.
 */
export function recordVideoForAll(
  shortCode: string,
  url: string,
  playTime: Date | null,
  now = new Date()
): void {
  ensureDatabase();
  db.insert(roomState)
    .values({ roomShortCode: shortCode, videoUrl: url, videoPlayTime: playTime, updatedAt: now })
    /*
      One row per room, so a second play UPDATES. The `set` names the video columns and NOTHING
      else — a video starting must not clear the room's YouTube overlay, its chat mode or its close
      message, and an over-wide `set` here would silently do all three.
    */
    .onConflictDoUpdate({
      target: roomState.roomShortCode,
      set: { videoUrl: url, videoPlayTime: playTime, updatedAt: now }
    })
    .run();
}

/**
 * `stopVideoForAll` — the room is watching nothing.
 *
 * Clears the schedule as well as the url, which is the receiver's own rule read back to the server:
 * `subscribe("stopVideoForAll", () => { videoPlayerUrl = ""; scheduledVideo.videoURL = "";
 * scheduledVideo.videoPlayTime = null; … })` at byte 1,966,882. A stop that left the timestamp
 * behind would leave a row saying a video is armed for a url that no longer exists.
 *
 * Inserts nothing when there is no row: stopping in a room that never played anything is a no-op,
 * and an upsert here would write a row whose every media column is null.
 */
export function clearVideoForAll(shortCode: string, now = new Date()): void {
  ensureDatabase();
  db.update(roomState)
    .set({ videoUrl: null, videoPlayTime: null, updatedAt: now })
    .where(eq(roomState.roomShortCode, shortCode))
    .run();
}

/**
 * `playYTForAll` — record the url and the MOMENT, so a late joiner drops into the middle.
 *
 * `now` is the start time, and that is the whole computation on this side. The elapsed seconds are
 * the subscriber's, for every member separately, because the answer depends on when each arrives.
 */
export function recordYoutubeForAll(shortCode: string, url: string, now = new Date()): void {
  ensureDatabase();
  db.insert(roomState)
    .values({ roomShortCode: shortCode, ytUrl: url, ytStartTime: now, updatedAt: now })
    .onConflictDoUpdate({
      target: roomState.roomShortCode,
      set: { ytUrl: url, ytStartTime: now, updatedAt: now }
    })
    .run();
}

/** `stopYTForAll` — `subscribe("stopYTForAll", () => { this.ytURL = null })`, byte 1,965,000. */
export function clearYoutubeForAll(shortCode: string, now = new Date()): void {
  ensureDatabase();
  db.update(roomState)
    .set({ ytUrl: null, ytStartTime: null, updatedAt: now })
    .where(eq(roomState.roomShortCode, shortCode))
    .run();
}
