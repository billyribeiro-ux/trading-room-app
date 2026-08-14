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
 * ## Lifecycle
 *
 * One timer per ROOM, not per connection: ten members watching one room must not mean ten polls of
 * the same endpoint. Started when a room gains its first subscriber and stopped when it loses its
 * last, so an empty room costs nothing and a process with no rooms has no timers at all.
 */

import { MEDIA_API_URL } from '$app/env/private';
import { MTX_PAGE_SIZE, mtxStreamDeltas, mtxStreamsFromPathList } from '$lib/mtx-reconcile';
import type { MtxStream } from '$lib/mtx-streams';
import { publishToRoom, roomSubscriberCount } from './room-events';

/**
 * How often a room asks MediaMTX what is live.
 *
 * Five seconds is a deliberate middle: a stream appearing takes at most this long to show up when a
 * hook was lost, while a room with a hundred members still makes one request per five seconds rather
 * than one per member. The hook path is what makes the common case immediate, so this interval is
 * the REPAIR rate, not the discovery rate, and it does not need to be aggressive.
 */
export const MTX_RECONCILE_INTERVAL_MS = 5_000;

/** MediaMTX's control API is local; a request that hangs must not pile timers up behind it. */
const MTX_REQUEST_TIMEOUT_MS = 3_000;

/** Everything a running reconcile needs. Module state, for the same reason the SSE hub is. */
type RoomReconcile = {
  timer: ReturnType<typeof setInterval>;
  /** The last list published, so the next poll can be diffed against it rather than re-sent. */
  known: MtxStream[];
  /** Guards against a slow poll overlapping the next tick and publishing deltas out of order. */
  polling: boolean;
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
    streams.push(...mtxStreamsFromPathList(payload, room));

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
    const live = await fetchLiveStreams(room);
    // `null` is "could not ask", not "nothing is live". Publishing stops here would clear every
    // viewer's tabs because the media server blipped.
    if (live === null) return;

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
  running.set(room, { timer, known: [], polling: false });

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
