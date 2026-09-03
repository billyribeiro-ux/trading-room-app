/**
 * Whether an ALREADY-OPEN realtime connection may keep receiving.
 *
 * ## The two defects this closes, and why they are one module
 *
 * `NEW-TODO.md` Part 1 records two revenue leaks the original has that this room deliberately does
 * NOT reproduce. They were found separately and they turn out to be the same missing mechanism:
 *
 *   **1.1** An expired subscription keeps receiving alerts. Entitlement is checked when somebody
 *           ENTERS a room and never again, so a customer whose access lapsed keeps getting alerts
 *           for as long as their session lives.
 *   **1.2** One account, one active session. One login served many devices at once, so customers
 *           shared credentials and one subscription served several people.
 *
 * The room already refuses both at the DOOR — `session/+page.server.ts` turns a banned member away,
 * `+page.server.ts` ends the session of one banned mid-session, and `createSessionFor` now evicts an
 * account's other sessions. What neither reaches is a stream that is ALREADY OPEN: `sess/[room]/events`
 * authenticates once, at connect, and then delivers every alert in the room for as long as the
 * connection lives. That is the hole, it is the same hole for both, and this is the decision that
 * fills it.
 *
 * ## Why a self-CHECK and not a pushed revocation
 *
 * The obvious shape is to push a `sessionRevoked` frame from whoever evicts. It does not work here,
 * for two independent reasons, and both are worth writing down because the pushed version looks
 * correct:
 *
 * 1. **Newest-wins evicts a session belonging to the SAME account.** `publishToUsers` addresses a
 *    user id, and after the eviction the old and new connections share one. A push would revoke the
 *    login that just succeeded along with the one it replaced.
 * 2. **The event hub is process-local.** `publishToRoom` reaches only the instance it runs on — a
 *    limitation this repository already records for `focusOnScreen` and every other realtime
 *    feature. A pushed revocation would silently miss every connection held elsewhere, which is the
 *    worst possible failure for a revocation: it would look like it worked.
 *
 * A connection that asks about ITSELF has neither problem. It reads its own session row and its own
 * membership, so it needs no addressing, and it is right on whichever instance it happens to be.
 *
 * ## Pure, because the interesting part is the rule and not the I/O
 *
 * Everything here is a function of its arguments. The database read, the controller call and the
 * timer live in `sess/[room]/events/+server.ts`. Same split as `media-elevation.ts` and
 * `alert-filter.ts`, and for the same reason: a rule reachable only by holding an SSE connection
 * open is a rule nobody tests.
 */

/** How often an open connection re-asks. */
export const LIVE_ACCESS_CHECK_MS = 60_000;

/**
 * How long a connection may run without a CONFIRMED answer before it is closed anyway.
 *
 * Three checks. The owner chose bounded grace over both alternatives on 2026-08-27, and the two it
 * was chosen over are why the number is not zero and not infinite:
 *
 *   close immediately  one controller hiccup disconnects every member of every room at once —
 *                      an outage amplifier built out of a security control
 *   never close        an entitlement outlives its subscription for as long as the controller is
 *                      down, which is the leak this exists to stop, reopened by a timeout
 *
 * So an unreachable controller does not revoke anybody, and it does not refresh the stamp either.
 * Three minutes of not being able to confirm ends the stream. A lapse detected DEFINITELY still
 * closes on the next check, in under a minute — the grace applies only to not knowing.
 */
export const LIVE_ACCESS_GRACE_MS = 3 * LIVE_ACCESS_CHECK_MS;

/**
 * What the controller was able to say about this member's standing this time round.
 *
 * `unknown` is a first-class answer rather than an error, because "the controller did not respond"
 * and "the controller says no" must not collapse into one verdict. Collapsing them either way is
 * one of the two failures the grace window exists to avoid.
 */
export type EntitlementAnswer = 'entitled' | 'lapsed' | 'unknown';

export type LiveAccessDenial = 'session-ended' | 'entitlement-lapsed' | 'unconfirmed';

export type LiveAccessVerdict =
  { live: true } | { live: false; reason: LiveAccessDenial; message: string };

/**
 * The messages the member actually sees, and they are OURS.
 *
 * Not captured, and they cannot be: the reference has no equivalent, because it never revokes a live
 * connection at all. Every other string in this room is transcribed from the bundle byte by byte, so
 * an invented one is recorded as invented rather than left to look captured.
 *
 * They say WHY. A silent disconnect is hostile and it is also worse commercially — a member who is
 * told their subscription has lapsed can renew, and a member who is told they signed in elsewhere
 * knows immediately whether it was them. That is `NEW-TODO.md`'s own argument, kept verbatim in
 * intent: *"Silent disconnect is hostile. A stated reason ... is the honest version, and it is also
 * the one that gets them to renew."*
 */
export const LIVE_ACCESS_MESSAGES: Readonly<Record<LiveAccessDenial, string>> = {
  /*
    THREE CAUSES, and until 2026-09-03 this sentence named one of them as if it were the only one.

    `decideLiveAccess`'s own docblock has always listed two — *"evicted by a newer login, or logged
    out on another device"* — and the message asserted the first. A presenter's Hard Reset and Revoke
    Tokens added a third that day, and a member told "this account signed in somewhere else" when a
    presenter had just reset the room would be reading a confident, specific, wrong explanation.

    The rule CANNOT tell them apart and is not made to: all three are "the session row is gone", the
    one local fact this room owns outright, and inventing a distinction the input does not carry is
    how a rule starts guessing. So the sentence covers its causes instead — keeping the newest-wins
    explanation, which this module argues is worth having commercially, as one case rather than the
    case.
  */
  'session-ended':
    'You have been signed out of this room. That happens when this account signs in somewhere else — only one device at a time — or when a presenter resets the room. Signing in again will bring you back.',
  'entitlement-lapsed':
    'Your access to this room has ended. If your subscription has lapsed, renewing it will let you back in.',
  unconfirmed:
    'We could not confirm your access to this room, so the live connection has been closed. Reload the page to try again.'
};

export interface LiveAccessInput {
  /** Does this connection's own session row still exist and still authenticate? */
  sessionAlive: boolean;
  /** What the controller said this time. */
  entitlement: EntitlementAnswer;
  /** Epoch ms of the last time entitlement was CONFIRMED — the connect-time read counts. */
  lastConfirmedAt: number;
  /** Epoch ms now. Passed in rather than read, so the grace window is testable without a clock. */
  now: number;
  /** Overridable only so a test can exercise the boundary without waiting three minutes. */
  graceMs?: number;
}

/**
 * May this connection keep receiving?
 *
 * The order of the three tests is the order of certainty, and it is deliberate:
 *
 * 1. **The session** is a local fact this room owns outright. If the row is gone the account was
 *    signed out here — evicted by a newer login, or logged out on another device — and no controller
 *    answer can override that. Checked first so a controller outage cannot delay an eviction.
 * 2. **A definite lapse** closes immediately. There is nothing to wait for: the controller answered,
 *    and the answer was no.
 * 3. **Not knowing** closes only after the grace window. See {@link LIVE_ACCESS_GRACE_MS}.
 */
export function decideLiveAccess(input: LiveAccessInput): LiveAccessVerdict {
  if (!input.sessionAlive) {
    return { live: false, reason: 'session-ended', message: LIVE_ACCESS_MESSAGES['session-ended'] };
  }

  if (input.entitlement === 'lapsed') {
    return {
      live: false,
      reason: 'entitlement-lapsed',
      message: LIVE_ACCESS_MESSAGES['entitlement-lapsed']
    };
  }

  if (input.entitlement === 'entitled') return { live: true };

  const graceMs = input.graceMs ?? LIVE_ACCESS_GRACE_MS;
  /*
    `>` and not `>=`, and a clock that has gone BACKWARDS does not revoke.

    `now - lastConfirmedAt` is negative if the host's clock steps back, and a negative age is not a
    stale one — it is a misconfigured machine. Treating it as stale would disconnect a whole room on
    an NTP correction.
  */
  if (input.now - input.lastConfirmedAt > graceMs) {
    return { live: false, reason: 'unconfirmed', message: LIVE_ACCESS_MESSAGES.unconfirmed };
  }

  return { live: true };
}
