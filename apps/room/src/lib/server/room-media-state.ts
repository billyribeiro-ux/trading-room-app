import { and, eq, isNotNull, lte } from 'drizzle-orm';

import { db, ensureDatabase } from './db/index.js';
import { roomState } from './db/schema.js';
import { publishToRoom } from './room-events.js';

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

/**
 * ── THE SERVER-SIDE SCHEDULER ─────────────────────────────────────────────────────────────────────
 *
 * `TODO.md`'s consequence 2, and the last of the three: *"a scheduled play lives in the presenter's
 * browser… closing that tab cancels the play."*
 *
 * ```js
 * // "Play later" — posted the MOMENT Send is pressed, carrying the time
 * sendServerAdminCommand("playVideoForAll", {url: e, videoPlayTime: i})       // byte 1,981,560
 * // "Play now"
 * sendServerAdminCommand("playVideoForAll", {url: e, videoPlayTime: null})    // byte 1,981,700
 * // and the dispatch forwards only the url, so the SERVER decides WHEN
 * case "playVideoForAll": guiEventBus.emit("playVideoForAll", {url: i.url})   // byte 1,024,587
 * ```
 *
 * That third line is the one that settles it. If the browser were the scheduler there would be
 * nothing for the server to hold, and the payload would not carry a time at all.
 *
 * ## The schedule and the claim are the SAME COLUMN, which is what makes this small
 *
 * `video_play_time` is NULL for "playing now" and a moment for "armed". Firing is therefore one
 * atomic `UPDATE … SET video_play_time = NULL WHERE video_play_time <= now RETURNING` — the row
 * becomes live in the same statement that claims it, and the replay gate
 * (`videoUrl && !videoPlayTime`) starts answering with it immediately and for the same reason.
 *
 * No second column, no separate `claimed_at`. `scheduled_alerts` needs one because a repeating
 * series must stay a row after it fires; a video has one state at a time.
 *
 * ## Why a conditional UPDATE and not SELECT-then-UPDATE
 *
 * `CLAUDE.md` names it: a SELECT-then-UPDATE is a TOCTOU, and two sweeps that both read a due row
 * would both broadcast it. Zero rows back means nothing was due or another sweep won, and losing
 * that race is the normal path rather than an error.
 *
 * ── One room whose armed play has come due ───────────────────────────────────────────────────────
 */
export interface DueVideo {
  readonly roomShortCode: string;
  readonly url: string;
}

/**
 * Take ownership of every room whose armed play is due, atomically, and mark them live.
 *
 * Unbounded, unlike `claimDueScheduledAlerts`'s `MAX_PER_SWEEP`, and the difference is real rather
 * than an oversight: that bound exists because a repeating series can build a BACKLOG for one room,
 * and posting it in one pass would put a wall of alerts on one member's screen. A video has one
 * armed play per room, so the batch size here is bounded by the number of rooms that scheduled one
 * for the same moment — and pacing it would mean some rooms starting late for no benefit.
 *
 * `video_url IS NOT NULL` guards the SIDE EFFECT, not the return value, and the difference is what
 * a negative control taught: the `flatMap` below already drops a row with no url, so removing this
 * predicate leaves every assertion about what comes back GREEN. What changes is that the row gets
 * claimed on the way — its `video_play_time` nulled and then thrown away — which is a schedule
 * silently consumed by a sweep that could not act on it. `room-media-state.test.ts` reads the row
 * back for exactly that reason.
 */
export function claimDueVideos(now: Date): DueVideo[] {
  ensureDatabase();
  const rows = db
    .update(roomState)
    .set({ videoPlayTime: null, updatedAt: now })
    .where(
      and(
        isNotNull(roomState.videoPlayTime),
        isNotNull(roomState.videoUrl),
        lte(roomState.videoPlayTime, now)
      )
    )
    .returning({ roomShortCode: roomState.roomShortCode, videoUrl: roomState.videoUrl })
    .all();
  /*
    The `videoUrl` non-null is enforced by the predicate above; this narrows the TYPE rather than
    re-checking the fact, because `.returning()` cannot know what the `where` guaranteed. Filtering
    rather than asserting, so a row that somehow arrives without one is dropped instead of
    broadcasting `undefined` to a room.
  */
  return rows.flatMap((row) =>
    row.videoUrl ? [{ roomShortCode: row.roomShortCode, url: row.videoUrl }] : []
  );
}

/** How often the sweep looks for due rows — the alert scheduler's interval, for the same reasons. */
export const VIDEO_SWEEP_INTERVAL_MS = 15_000;

/**
 * Fire every armed play that has come due, and answer how many.
 *
 * `publish` is injected rather than imported so this module keeps no dependency on the event hub —
 * which is also what lets a test drive a whole sweep without a subscriber. The sweep is exported for
 * the same reason `sweepScheduledAlerts` is: a timer is not a thing a test should have to wait on.
 */
export function sweepDueVideos(
  publish: (roomShortCode: string, url: string) => void,
  now: Date = new Date()
): number {
  const due = claimDueVideos(now);
  for (const row of due) {
    try {
      publish(row.roomShortCode, row.url);
    } catch (error) {
      /*
        One room failing must not take the rest of the batch with it, and it will NOT be retried —
        deliberately, and for the reason the alert sweep records: the row is already live, so a retry
        would need to re-arm a schedule the presenter did not ask for. It is reported instead, which
        is the loud failure `CLAUDE.md` asks for rather than a silent loop.
      */
      console.error(
        '[video-scheduler] a due video could not be broadcast',
        row.roomShortCode,
        error
      );
    }
  }
  return due.length;
}

/**
 * Start the video sweep, and hand back the way to stop it.
 *
 * The same shape as `startAlertScheduler`, and the same argument for why a `setInterval` is an
 * acceptable answer: the timer holds NO schedule. Every question it asks is answered from
 * `room_state`, so a restart resumes rather than recovers — a play armed for 18:00 fires at 18:00
 * whether or not this process was alive at 17:59.
 *
 * `publishToRoom` is imported here rather than injected, unlike in `sweepDueVideos`: this is the
 * production wiring and the injection point exists one level down, where a test needs it.
 */
export function startVideoScheduler(): () => void {
  const timer = setInterval(() => {
    try {
      sweepDueVideos((roomShortCode, url) =>
        publishToRoom(roomShortCode, {
          channel: 'cmds',
          /*
            The URL and nothing else, which is the reference's own dispatch: `case
            "playVideoForAll": guiEventBus.emit("playVideoForAll", {url: i.url})` at byte 1,024,587.
            The time was the server's to hold and its job is finished.
          */
          data: { cmd: 'playVideoForAll', url }
        })
      );
    } catch (error) {
      // The sweep must never kill its own interval — the room would be left with no scheduler and
      // nothing would say so. Same guard, same reason, as the alert sweep's.
      console.error('[video-scheduler] sweep failed', error);
    }
  }, VIDEO_SWEEP_INTERVAL_MS);

  // `unref` so the timer cannot hold a test runner or a shutdown open; guarded because the method is
  // Node's and not on the DOM `setInterval` the type resolves to in some configs.
  (timer as unknown as { unref?: () => void }).unref?.();

  return () => clearInterval(timer);
}
