/**
 * Who asked for whose debug log, remembered on the SERVER.
 *
 * ## This module exists because the reference cannot be ported as written
 *
 * Upstream's member replies `{requestor: xe.requestor, log: V1}` — it echoes back the requestor
 * field the REQUEST carried, so the client names who receives the log. Every other frame in this
 * system travels presenter→member, where a forged field costs the forger nothing; this one travels
 * member→presenter, and a member who names an arbitrary requestor can push content into any
 * presenter's modal.
 *
 * `private-commands.ts` has carried that warning in its docblock since the channel was written:
 * *"Whoever builds it must have the server remember who asked and ignore that field. It is the
 * 2026-08-07 rule arriving on the one frame that travels member→presenter instead of the other way."*
 * This is that memory.
 *
 * **The reply command takes no requestor argument at all.** That is the shape of the fix, and it is
 * stronger than validating one: a field that does not exist cannot be trusted by a future edit.
 *
 * ## Memory, not a table, for the reasons `typing.ts` gives
 *
 * The same argument, and it is worth restating rather than cross-referencing because the risk
 * profile differs. A pending request is worthless thirty seconds later, it is written once per
 * presenter click, and the room is a single Node process whose SSE subscriber map is exactly as
 * durable as this. What a restart costs here is one unanswered request: the presenter's modal stays
 * empty and they click again. Nothing is lost that a retry does not recover.
 *
 * ## Expiry is on READ and on WRITE, never on a timer
 *
 * A background interval per room would outlive every listener. Both entry points sweep, so an
 * abandoned request cannot accumulate: a member who never answers leaves one entry that the next
 * touch of that room removes.
 *
 * ## One pending request per target, newest wins
 *
 * Two presenters asking the same member at once is real — a room can have several. The alternative,
 * a list, means one member's console fanning out to several presenters from a single collection,
 * which widens who sees it for no evidenced benefit: upstream has exactly one requestor field. The
 * second presenter's click replaces the first's claim, and the first simply sees nothing and can ask
 * again. Narrower than the reference in who receives it, never wider.
 */

/**
 * How long a request waits for its answer.
 *
 * Long enough for a member's browser to receive the frame, read its buffer and post it back over a
 * slow connection; short enough that a stale claim cannot collect a log the presenter has forgotten
 * asking for. The failure mode of too LONG is the one that matters — a log arriving at a presenter
 * who has moved on — so this is deliberately nearer a click than a session.
 */
export const DEBUG_LOG_REQUEST_TTL_MS = 30_000;

type PendingRequest = { readonly requestorUserId: number; readonly at: number };

/** `room -> targetUserId -> {requestorUserId, at}`. Rooms are dropped when they empty. */
const pending = new Map<string, Map<number, PendingRequest>>();

function sweep(room: string, now: number): Map<number, PendingRequest> | undefined {
  const byTarget = pending.get(room);
  if (!byTarget) return undefined;
  for (const [targetUserId, request] of byTarget)
    if (now - request.at >= DEBUG_LOG_REQUEST_TTL_MS) byTarget.delete(targetUserId);
  if (byTarget.size === 0) {
    pending.delete(room);
    return undefined;
  }
  return byTarget;
}

/**
 * Record that `requestorUserId` asked `targetUserId` for its log.
 *
 * The caller has already been established as a presenter of `room` — this module does not re-check,
 * and says so rather than implying a gate it does not have. Its single job is memory.
 */
export function noteDebugLogRequested(
  room: string,
  targetUserId: number,
  requestorUserId: number,
  now: number = Date.now()
): void {
  const byTarget = sweep(room, now) ?? new Map<number, PendingRequest>();
  byTarget.set(targetUserId, { requestorUserId, at: now });
  pending.set(room, byTarget);
}

/**
 * Who — if anyone — is still waiting for `targetUserId`'s log, consuming the claim.
 *
 * SINGLE USE. The entry is removed as it is read, so one request yields one reply: a member cannot
 * post its log ten times off one click and flood a presenter's modal, and a late duplicate answers
 * nobody. Returns `null` when there is no live request, which is the case the caller must treat as
 * "drop this reply on the floor" rather than as "send it somewhere sensible".
 */
export function takeDebugLogRequestor(
  room: string,
  targetUserId: number,
  now: number = Date.now()
): number | null {
  const byTarget = sweep(room, now);
  const request = byTarget?.get(targetUserId);
  if (!request || !byTarget) return null;
  byTarget.delete(targetUserId);
  if (byTarget.size === 0) pending.delete(room);
  return request.requestorUserId;
}

/** Test seam: how many rooms hold a live request. Used to prove the sweep actually frees memory. */
export function pendingDebugLogRoomCount(): number {
  return pending.size;
}

/** Test seam: drop everything, so one test's rooms cannot be visible to the next. */
export function resetDebugLogRequests(): void {
  pending.clear();
}
