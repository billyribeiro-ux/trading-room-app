import { describe, expect, it } from 'vitest';
import {
  decideLiveAccess,
  LIVE_ACCESS_CHECK_MS,
  LIVE_ACCESS_GRACE_MS,
  LIVE_ACCESS_MESSAGES
} from './server/live-access.js';

/**
 * The two revenue leaks of `NEW-TODO.md` Part 1, as one rule.
 *
 * ## What is being asserted, and why it is asserted HERE
 *
 * The room already refuses a lapsed member at the door. What it could not do was end a connection
 * that was ALREADY OPEN — `sess/[room]/events` authenticates once, at connect, and then delivers
 * every alert in the room for as long as the stream lives. A subscription that lapses and a login
 * that is evicted by a newer one were equally invisible to it.
 *
 * The endpoint is a `ReadableStream` behind an authenticated GET with a one-minute timer, so the
 * rule inside it is not reachable from a test. `decideLiveAccess` is the rule with the I/O taken
 * out, which is the same split `media-elevation.ts` and `alert-filter.ts` use, for the same reason:
 * a rule that can only be exercised by holding an SSE connection open is a rule nobody exercises.
 *
 * ## The three orderings that matter
 *
 * Each case below is one of them, and each was gettable wrong in a way that looks correct:
 *
 *  - a dead session beats a live entitlement (an eviction must not wait on the controller)
 *  - a definite lapse beats the grace window (grace is for NOT KNOWING, never for a known no)
 *  - not knowing does NOT revoke inside the window (or one timeout empties every room)
 */
describe('an already-open connection', () => {
  const BASE = { lastConfirmedAt: 1_000_000, now: 1_000_000 };

  it('keeps receiving while the session lives and the controller says entitled', () => {
    expect(decideLiveAccess({ ...BASE, sessionAlive: true, entitlement: 'entitled' })).toEqual({
      live: true
    });
  });

  it('ENDS when this session no longer exists — one account, one active session', () => {
    /*
      1.2. `createSessionFor` deletes the account's other rows, so the evicted browser's session is
      gone. Its ordinary requests already redirect to signed out; this is the stream.
    */
    const verdict = decideLiveAccess({ ...BASE, sessionAlive: false, entitlement: 'entitled' });
    expect(verdict).toEqual({
      live: false,
      reason: 'session-ended',
      message: LIVE_ACCESS_MESSAGES['session-ended']
    });
  });

  it('ends on a dead session EVEN WHEN the controller cannot be reached', () => {
    /*
      The ordering that matters most. The session is a local fact this room owns; making an eviction
      wait for a controller answer would mean a controller outage kept an evicted device connected,
      which is the leak reopened by an unrelated failure.
    */
    expect(
      decideLiveAccess({ ...BASE, sessionAlive: false, entitlement: 'unknown' })
    ).toMatchObject({ live: false, reason: 'session-ended' });
  });

  it('ENDS when the controller says the entitlement has lapsed — the expired subscription', () => {
    /*
      1.1. In the original, entitlement is checked when somebody enters and never again, so a lapsed
      customer keeps receiving alerts for as long as their session lives. This is the re-check.
    */
    expect(decideLiveAccess({ ...BASE, sessionAlive: true, entitlement: 'lapsed' })).toEqual({
      live: false,
      reason: 'entitlement-lapsed',
      message: LIVE_ACCESS_MESSAGES['entitlement-lapsed']
    });
  });

  it('ends on a definite lapse immediately, without waiting out the grace window', () => {
    /* Grace is for not knowing. The controller answered, and the answer was no. */
    expect(
      decideLiveAccess({
        sessionAlive: true,
        entitlement: 'lapsed',
        lastConfirmedAt: 1_000_000,
        now: 1_000_000 + 1
      })
    ).toMatchObject({ live: false, reason: 'entitlement-lapsed' });
  });

  it('keeps receiving while the controller is unreachable, inside the grace window', () => {
    /*
      The owner chose bounded grace on 2026-08-27 over closing immediately. Closing on every failed
      re-check turns one controller hiccup into a room-wide disconnection — an outage amplifier built
      out of a security control.
    */
    expect(
      decideLiveAccess({
        sessionAlive: true,
        entitlement: 'unknown',
        lastConfirmedAt: 1_000_000,
        now: 1_000_000 + LIVE_ACCESS_GRACE_MS
      })
    ).toEqual({ live: true });
  });

  it('ENDS once the grace window has passed with no confirmation', () => {
    expect(
      decideLiveAccess({
        sessionAlive: true,
        entitlement: 'unknown',
        lastConfirmedAt: 1_000_000,
        now: 1_000_000 + LIVE_ACCESS_GRACE_MS + 1
      })
    ).toEqual({
      live: false,
      reason: 'unconfirmed',
      message: LIVE_ACCESS_MESSAGES.unconfirmed
    });
  });

  it('does not revoke on a clock that has stepped BACKWARDS', () => {
    /*
      `now - lastConfirmedAt` is negative when the host's clock is corrected backwards. A negative age
      is a misconfigured machine, not a stale confirmation, and treating it as stale would disconnect
      a whole room on an NTP step.
    */
    expect(
      decideLiveAccess({
        sessionAlive: true,
        entitlement: 'unknown',
        lastConfirmedAt: 1_000_000,
        now: 1_000_000 - LIVE_ACCESS_GRACE_MS * 10
      })
    ).toEqual({ live: true });
  });

  it('states a DIFFERENT reason for each of the three, and never an empty one', () => {
    /*
      The member acts on the reason: renew, or sign the other device out, or reload. One message for
      all three would be a silent disconnect wearing a sentence — which is what `NEW-TODO.md` names
      as the hostile version.
    */
    const messages = Object.values(LIVE_ACCESS_MESSAGES);
    expect(new Set(messages).size).toBe(3);
    for (const message of messages) expect(message.length).toBeGreaterThan(20);
  });

  it('checks often enough that a lapse is caught in under a minute, and the grace is three checks', () => {
    expect(LIVE_ACCESS_CHECK_MS).toBeLessThanOrEqual(60_000);
    expect(LIVE_ACCESS_GRACE_MS).toBe(3 * LIVE_ACCESS_CHECK_MS);
  });
});
