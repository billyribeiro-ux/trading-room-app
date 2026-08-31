/**
 * Polling MediaMTX for the truth about which streams are live, and publishing what changed.
 *
 * **Hooks for latency, reconciliation for truth.** `/internal/media-hook` is a `curl` MediaMTX
 * spawns — no retry, no ordering, no delivery guarantee, and it reaches exactly one room process.
 * `room-events.ts` says of itself that the hub "does not survive a restart and does not span
 * instances", and the room defaults to the Vercel adapter. So a hook can be lost outright, and the
 * only thing that repairs a wrong stream list is asking MediaMTX.
 *
 * This is instance-independent by construction: every process polls for its OWN subscribers, so it
 * does not matter which instance a hook reached or whether one arrived at all.
 *
 * ## A stated divergence, not a transcription
 *
 * The reference does not poll. It asks for the full list on init and again after a soft reset
 * (`fetchSessionMediaStateMTX`, bundle bytes 1137614 and 1138594) and otherwise trusts its
 * SocketCluster socket, which is a real pub/sub connection with delivery semantics a spawned shell
 * command does not have. Polling is taken here because our delivery path is weaker, and it is
 * recorded as a divergence rather than presented as a clone.
 *
 * ## Why DELTAS and not the full list
 *
 * `applySessionMediaState` moves the selection to `list[0]` every time it runs. On a timer that
 * would drag every viewer's tab back to the first stream on every tick. `mtx-reconcile.test.ts`
 * asserts both halves of this — the yank, and that the delta path leaves the viewer alone.
 *
 * One consequence worth stating: deltas are keyed on the PATH, so a presenter who renames themselves
 * mid-stream keeps the tab label they started with until the stream stops and starts again. Emitting
 * a delta to relabel would tear down the `<video>` element and its hls.js instance to change a
 * string, which is a worse trade than a label that is one rename out of date.
 *
 * ## Lifecycle
 *
 * One timer per ROOM, not per connection: ten members watching one room must not mean ten polls of
 * the same endpoint. Started when a room gains its first subscriber and stopped when it loses its
 * last, so an empty room costs nothing and a process with no rooms has no timers at all.
 */

import { MEDIA_API_URL } from '$app/env/private';
import { MTX_PAGE_SIZE, mtxStreamDeltas, mtxStreamsFromPathList } from '#lib/mtx-reconcile.js';
import type { MtxStream } from '#lib/mtx-streams.js';
import { publishToRoom, roomSubscriberCount } from './room-events';
import { streamNamesForRoom } from './stream-names';

/**
 * How often a room asks MediaMTX what is live.
 *
 * Five seconds is a deliberate middle: a stream appearing takes at most this long to show up when a
 * hook was lost, while a room with a hundred members still makes one request per five seconds rather
 * than one per member. The hook path is what makes the common case immediate, so this interval is
 * the REPAIR rate, not the discovery rate, and it does not need to be aggressive.
 */
export const MTX_RECONCILE_INTERVAL_MS = 5_000;

/**
 * A request that hangs must not pile timers up behind it.
 *
 * Three seconds assumes the control API is on a network the operator controls, which is a
 * DEPLOYMENT property and not a default — `mtx-reconcile.ts` records the measurement showing
 * MediaMTX binds `:9997` on every interface and fences the API by IP rather than by bind.
 */
const MTX_REQUEST_TIMEOUT_MS = 3_000;

/** Everything a running reconcile needs. Module state, for the same reason the SSE hub is. */
type RoomReconcile = {
  timer: ReturnType<typeof setInterval>;
  /**
   * What the room has ALREADY been told is live — not what the last poll returned.
   *
   * The distinction is the whole of the 2026-08-31 fix. This is the baseline every delta is measured
   * from, so anything that publishes a start or a stop has to land in here, whether it came from a
   * poll or from a hook. See {@link noteHookPublished}.
   */
  known: MtxStream[];
  /** Guards against a slow poll overlapping the next tick and publishing deltas out of order. */
  polling: boolean;
  /**
   * Bumped by every hook note, so a poll can tell that the world moved under its own `fetch`.
   *
   * A poll's answer describes the instant MediaMTX served it. If a hook lands while that request is
   * in flight, the answer is already stale in a way the code cannot detect by looking at it — and
   * acting on it publishes an event that did not happen. Read before the await, compared after.
   */
  epoch: number;
};

const running = new Map<string, RoomReconcile>();

/**
 * Every live stream in a room, following pagination to the end.
 *
 * `itemsPerPage` defaults to 100 and `pageCount` says how many there are. Reading only the first
 * page would silently drop streams once a deployment passed that many paths — the kind of cap that
 * reads as "covered everything" right up until it does not. Returns `null` when MediaMTX could not
 * be asked, which is DIFFERENT from an empty list: no answer must never be published as "everybody
 * stopped streaming".
 */
async function fetchLiveStreams(room: string): Promise<MtxStream[] | null> {
  const base = MEDIA_API_URL;
  if (!base) return null;

  /*
    Read ONCE, before the pagination loop, and passed into every page.

    MediaMTX reports paths and nothing else, and a path carries only the sanitised form of a
    presenter's name — so this is what turns a tab reading `Dana_Vero` into one reading `Dana Vero`.
    Hoisted out of the loop because it is the same answer for every page of the same room, and a
    query per page would multiply by a number that grows with the deployment.
  */
  const names = streamNamesForRoom(room);

  const streams: MtxStream[] = [];
  let page = 0;
  let pageCount = 1;

  while (page < pageCount) {
    const url = `${base.replace(/\/$/, '')}/v3/paths/list?page=${page}&itemsPerPage=${MTX_PAGE_SIZE}`;
    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(MTX_REQUEST_TIMEOUT_MS) });
    } catch (cause) {
      console.warn('[mtx-reconcile] could not reach the MediaMTX control API', { room, cause });
      return null;
    }
    if (!response.ok) {
      console.warn('[mtx-reconcile] the control API refused', { room, status: response.status });
      return null;
    }

    const payload = (await response.json()) as { pageCount?: unknown };
    streams.push(...mtxStreamsFromPathList(payload, room, names));

    // Trust the server's own count, but never loop forever on a nonsense value.
    if (page === 0 && typeof payload.pageCount === 'number' && payload.pageCount > 1) {
      pageCount = Math.min(payload.pageCount, 100);
    }
    page += 1;
  }

  return streams;
}

/**
 * One poll: ask, diff, publish what changed.
 *
 * Exported so a test can drive a single cycle without a timer.
 */
export async function reconcileRoomOnce(room: string): Promise<void> {
  const state = running.get(room);
  if (!state || state.polling) return;
  state.polling = true;
  try {
    // Read BEFORE the request, compared after it. See `epoch` on RoomReconcile.
    const epoch = state.epoch;
    const live = await fetchLiveStreams(room);
    // `null` is "could not ask", not "nothing is live". Publishing stops here would clear every
    // viewer's tabs because the media server blipped.
    if (live === null) return;

    /*
      A hook landed while this request was in flight, so `live` describes a moment that has already
      been overtaken. Publishing from it would announce the opposite of what the hook just announced
      — a stop for a stream that started 40ms ago, or a start for one that has stopped — and then
      `state.known` would be overwritten with the stale list, so the NEXT poll would announce the
      correction as a third event. Dropping the snapshot costs at most one interval and the timer is
      already running.
    */
    if (state.epoch !== epoch) return;

    const { started, stopped } = mtxStreamDeltas(state.known, live);
    if (started.length === 0 && stopped.length === 0) return;

    state.known = live;
    for (const muser of stopped) {
      publishToRoom(room, { channel: 'cmds', data: { cmd: 'mtxStopStream', muser } });
    }
    for (const muser of started) {
      publishToRoom(room, { channel: 'cmds', data: { cmd: 'mtxStartStream', muser } });
    }
  } finally {
    state.polling = false;
  }
}

/**
 * A hook has just published a start or a stop — fold it into the baseline the next poll diffs from.
 *
 * ## The defect this closes, measured on a live media plane rather than reasoned about
 *
 * On 2026-08-31 the whole chain was run for the first time against a real MediaMTX v1.20.1: Chromium
 * published over WHIP, MediaMTX spawned `runOnAvailable`, the hook reached `/internal/media-hook`,
 * and a subscribed presenter's SSE connection was read on the wire. Every event arrived **twice**:
 *
 * ```
 * 04:33:52.676  mtxStartStream   <- the hook   (media server logged runOnAvailable at 04:33:52)
 * 04:33:55.427  mtxStartStream   <- this poll, 2.75s later
 * 04:34:11.286  mtxStopStream    <- the hook   (runOnUnavailable at 04:34:11)
 * 04:34:15.429  mtxStopStream    <- this poll, 4.14s later, on the same 5s grid
 * ```
 *
 * The cause is one line that was missing rather than one that was wrong: the hook published to the
 * room's subscribers without telling this module, so `known` still said the stream was not live and
 * the next poll dutifully computed a delta for something every subscriber had already been told.
 *
 * Neither side's unit tests could see it. `media-hook`'s tests assert the hook publishes;
 * `mtx-reconciler.test.ts` asserts a poll publishes what changed. Both are correct, and the defect
 * lives only in the pair — which is exactly why it took a browser, a media server and a socket.
 *
 * ## What the duplicate did to a viewer
 *
 * `applyMtxStartStream` is `[...state.streams, stream]` — an unconditional append with no check on
 * `_id`, transcribed that way from the reference on purpose. So a presenter going live put **two
 * identical tabs** in every viewer's room. `applyMtxStopStream` removes exactly one entry per call,
 * also deliberately, so the pair happened to cancel at the end — the room was wrong for as long as
 * the stream was up, and correct again once it stopped, which is the failure shape that survives
 * casual testing longest.
 *
 * The fix is here and not in `applyMtxStartStream`, because a client that silently drops a duplicate
 * is a client that cannot tell a duplicate from a second camera. The server stops manufacturing them.
 *
 * ## Doing nothing is the correct answer sometimes
 *
 * No entry means no reconcile is running for this room — `MEDIA_API_URL` is unset, or the room has
 * no subscribers. There is no baseline to keep in step, so there is nothing to do, and the hook's
 * own publish stands on its own.
 */
export function noteHookPublished(
  room: string,
  stream: MtxStream,
  event: 'available' | 'unavailable'
): void {
  const state = running.get(room);
  if (!state) return;

  /*
    Bumped FIRST, so a poll already in flight discards its answer even if this note changes nothing.
    That request was served before the hook and cannot describe the world after it.
  */
  state.epoch += 1;

  if (event === 'available') {
    if (!state.known.some((candidate) => candidate._id === stream._id))
      state.known = [...state.known, stream];
    return;
  }
  state.known = state.known.filter((candidate) => candidate._id !== stream._id);
}

/**
 * Start reconciling this room, if it is not already being reconciled.
 *
 * Called on every subscribe and deliberately idempotent — the SSE route should not have to know
 * whether it is the first client. Does nothing when `MEDIA_API_URL` is unset, so a deployment with
 * no MediaMTX runs no timers at all.
 */
export function startMtxReconcile(room: string): void {
  if (!MEDIA_API_URL || running.has(room)) return;

  const timer = setInterval(() => {
    void reconcileRoomOnce(room);
  }, MTX_RECONCILE_INTERVAL_MS);

  /*
    `unref` so this timer cannot hold the process open. Without it a room that never empties would
    keep a Node server alive through a shutdown, and the SSE heartbeat sets the same expectation.
  */
  timer.unref?.();
  running.set(room, { timer, known: [], polling: false, epoch: 0 });

  // One immediate pass, so a member joining a room with a stream already running sees it now rather
  // than up to an interval later.
  void reconcileRoomOnce(room);
}

/**
 * Stop when the last subscriber leaves.
 *
 * The count is read from the hub rather than tracked here, so there is ONE refcount and not two that
 * can disagree. Call this after unsubscribing.
 */
export function stopMtxReconcileIfEmpty(room: string): void {
  if (roomSubscriberCount(room) > 0) return;
  const state = running.get(room);
  if (!state) return;
  clearInterval(state.timer);
  running.delete(room);
}

/** For tests: whether a room currently has a timer. */
export function isReconciling(room: string): boolean {
  return running.has(room);
}
