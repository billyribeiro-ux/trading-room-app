/**
 * Turning MediaMTX's own view of the world into the room's stream list.
 *
 * ## Why reconciliation exists at all, when there are hooks
 *
 * **Hooks for latency, reconciliation for truth.**
 *
 * `runOnAvailable` / `runOnUnavailable` are shell commands MediaMTX spawns — a `curl` with no
 * delivery guarantee, no retry and no ordering. If the room process restarts, if the POST times
 * out, or if the hook lands on a different instance from the one holding the viewer's SSE
 * connection, the notification is simply gone and the room shows a stream list that is quietly
 * wrong until somebody reloads.
 *
 * `src/lib/server/room-events.ts` says the same thing about itself in its own header: the hub is
 * process-local, "does not survive a restart and does not span instances". This module is what makes
 * the feature correct anyway, because polling is instance-independent by construction — every
 * process asks MediaMTX and gets the same answer for its own subscribers.
 *
 * The REFERENCE does this too, in the weaker form available to it: it ships a full-list command
 * (`getSessionMTXMediaState`) alongside the two deltas, and asks for it on init and again after a
 * soft reset (`fetchSessionMediaStateMTX`, bundle bytes 1137614 and 1138594). It never polls. The
 * interval here is therefore a STATED DIVERGENCE, not a transcription, and it is taken because our
 * delivery path is weaker than a SocketCluster socket, not stronger.
 *
 * ## THE TRAP: why this emits deltas rather than the full list
 *
 * `applySessionMediaState` sets `selectedTabID` to `list[0]._id` every time it runs, unconditionally.
 * That is correct for the reference, which only ever sends the full list twice — at init and after a
 * reset. Sending it on a TIMER would drag every viewer's tab back to the first stream on every tick,
 * which is a worse bug than the stale list it was meant to fix, and it would look like the room
 * fighting the user rather than like a polling mistake.
 *
 * So a reconcile emits `mtxStartStream` / `mtxStopStream` for what actually changed. Those use
 * `applyMtxStartStream`, whose whole point is that a second stream arriving does NOT steal the
 * selection. The full list is sent once, to a client that has just connected and has no list yet —
 * which is exactly the moment the reference sends it too.
 *
 * ## The API this reads
 *
 * `GET /v3/paths/list` on the control API, which is `api: yes` in `mediamtx.yml` and listens on
 * `127.0.0.1:9997` by default, localhost-only unless configured otherwise. Schema quoted from the
 * project's own OpenAPI document (`api/openapi.yaml` in `bluenviron/mediamtx`), not from memory.
 */

import type { MtxStream } from './mtx-streams';

/**
 * One entry of `/v3/paths/list`, narrowed to the fields this module reads.
 *
 * `available` and NOT `ready`: the spec marks `ready` and `readyTime` **deprecated**, alongside
 * `bytesReceived` and `bytesSent`. The live pair is `available`/`availableTime`, with
 * `online`/`onlineTime` beside it — the same rename that turned `runOnReady` into `runOnAvailable`.
 * Reading `ready` would work today and silently stop working, which is the worst failure shape.
 */
export interface MtxPath {
  name?: unknown;
  available?: unknown;
}

/** The envelope. `pageCount` is the field that stops this truncating silently — see {@link MTX_PAGE_SIZE}. */
export interface MtxPathList {
  itemCount?: unknown;
  pageCount?: unknown;
  items?: unknown;
}

/**
 * `itemsPerPage` defaults to 100 upstream, and a room with more than that would be cut off with no
 * error. Named here so the caller can ask for a page size and, more importantly, so `pageCount` is
 * something the caller is obliged to look at rather than a field it never noticed.
 */
export const MTX_PAGE_SIZE = 100;

/**
 * The path a stream is published to, split back into the two segments the room needs.
 *
 * A path is `room__{sessionID}__{producerID}`. That is the SAME string the controller's
 * `ingestPathFor` builds as `room__{roomKey}__{sanitizedName}`, and it has to be: MediaMTX serves
 * HLS from the path that was published to, so an ingest path and its playback path are one path.
 * The two names differ because `muser` is shared with WebRTC screenshares, where `producerID`
 * really is a producer id.
 *
 * Split on `__` with an EQUALITY check on the prefix, never `startsWith` — `roomkey2` must not match
 * `roomkey`. This mirrors `roomKeyOfPath` in the controller's `stream-ingest.ts`, which is where the
 * rule was first written and why it is written the same way here.
 */
export function parseMtxPath(path: string): { roomKey: string; producerID: string } | null {
  const segments = path.split('__');
  if (segments.length < 3 || segments[0] !== 'room') return null;
  const roomKey = segments[1];
  // Everything after the second separator, so a name that itself contains `__` survives intact.
  const producerID = segments.slice(2).join('__');
  if (!roomKey || !producerID) return null;
  return { roomKey, producerID };
}

/**
 * One MediaMTX path, as a stream this room should show — or `null` if it belongs elsewhere.
 *
 * ## `_id` is the path, and that is deliberate
 *
 * Upstream the server assigns a Mongo ObjectId. There is no server here to assign one, and the id
 * has to be STABLE: it keys the `{#each}`, so an id that changed between reconciles would tear down
 * and rebuild the `<video>` element — and its hls.js instance — on every single poll. The path is
 * unique per live stream and is already the thing MediaMTX considers the identity, so it is the id.
 *
 * ## The display name is the SANITISED one, and this is an honest gap
 *
 * `ingestPathFor` replaces every character outside `[a-zA-Z0-9_-]` with `_` before the name reaches
 * MediaMTX, so a presenter called "Dana Vero" publishes to `..._Dana_Vero` and the only name
 * recoverable from the path is `Dana_Vero`. The underscores are the sanitiser's, not the person's.
 *
 * It is NOT reconstructed by guessing that `_` was once a space — that would rename anybody who
 * genuinely uses an underscore, and would be inventing data to make a tab look tidy. The real name
 * exists in the controller's `stream_ingest_keys` row, which already maps a path to the user who
 * minted it; resolving it needs that lookup, and until then this shows what the evidence supports.
 */
export function mtxStreamFromPath(path: string, roomKey: string): MtxStream | null {
  const parsed = parseMtxPath(path);
  if (!parsed || parsed.roomKey !== roomKey) return null;
  return {
    _id: path,
    sessionID: parsed.roomKey,
    producerID: parsed.producerID,
    mediaValue: { name: parsed.producerID }
  };
}

/**
 * Every live stream in this room, from a `/v3/paths/list` payload.
 *
 * Filters on `available === true` STRICTLY. A path can exist in the list while nothing is publishing
 * to it — a configured path, or one whose publisher has just gone — and showing those would put tabs
 * in the room for streams that play nothing. A missing or non-boolean `available` is treated as not
 * available, which fails closed.
 */
export function mtxStreamsFromPathList(payload: MtxPathList, roomKey: string): MtxStream[] {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const streams: MtxStream[] = [];
  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    const path = item as MtxPath;
    if (path.available !== true) continue;
    if (typeof path.name !== 'string') continue;
    const stream = mtxStreamFromPath(path.name, roomKey);
    if (stream) streams.push(stream);
  }
  return streams;
}

/** What changed between two reconciles. Empty arrays mean nothing to publish, which is the common case. */
export interface MtxDelta {
  started: MtxStream[];
  stopped: MtxStream[];
}

/**
 * The difference between what the room is showing and what MediaMTX says is live.
 *
 * Compared by `_id`, which is the path — so a stream that stopped and restarted between two polls
 * produces no delta at all, because it is the same path and it is still available. That is right:
 * the viewer's tab never went away, and telling them it stopped and started would interrupt playback
 * to report something they did not experience.
 */
export function mtxStreamDeltas(previous: MtxStream[], next: MtxStream[]): MtxDelta {
  const before = new Set(previous.map((stream) => stream._id));
  const after = new Set(next.map((stream) => stream._id));
  return {
    started: next.filter((stream) => !before.has(stream._id)),
    stopped: previous.filter((stream) => !after.has(stream._id))
  };
}
