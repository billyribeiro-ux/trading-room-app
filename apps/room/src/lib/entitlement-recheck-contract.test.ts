import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The realtime endpoint actually RUNS the live-access rule — read, because it cannot be executed.
 *
 * `sess/[room]/events/+server.ts` is a `ReadableStream` behind an authenticated GET with a
 * one-minute timer. There is no way to drive it from a unit test: the decision it makes is covered
 * by `live-access-contract.test.ts` and the eviction it observes by `session-limit-contract.test.ts`,
 * but "the endpoint calls them at all" is exactly the join that has shipped broken here before —
 * `forceReload` had a working action and a working receiver with nothing between them for three
 * commits, and `presenterCommand` shipped dead for the same reason.
 *
 * So this asserts the SEAM by reading the source, and it names each thing it pins so a reader knows
 * what is and is not proven. It is the second lock, not the first.
 */

const ENDPOINT = readFileSync(
  new URL('../routes/sess/[room]/events/+server.ts', import.meta.url),
  'utf8'
);

describe('the realtime endpoint re-checks access on an open connection', () => {
  it('runs the rule on a timer, not only at connect', () => {
    expect(ENDPOINT).toContain('decideLiveAccess');
    expect(ENDPOINT).toContain('LIVE_ACCESS_CHECK_MS');
    expect(ENDPOINT).toContain('accessCheck = setInterval(');
  });

  it('asks BOTH questions — the session and the entitlement', () => {
    /*
      One timer, two leaks. Dropping either call would leave one of `NEW-TODO.md` Part 1's two
      halves open while the other looked done.
    */
    expect(ENDPOINT).toContain('sessionStillAuthenticates(locals.sessionId)');
    expect(ENDPOINT).toContain('isBannedFromRoom(current)');
    expect(ENDPOINT).toContain('isShutOutByRoomState(config.room.state, current)');
  });

  it('re-reads the controller with a FRESH cache key, or the poll re-confirms a stale answer', () => {
    /*
      The line the whole feature turns on. `readRoomConfig` caches per request object, deliberately,
      and this request object lives for the entire SSE connection — passing it would serve the
      connect-time membership back forever and the re-check would never re-check anything. It would
      pass every other assertion in this file.
    */
    expect(ENDPOINT).toContain('readRoomConfig({}, room, user.email)');
    expect(ENDPOINT).not.toContain('readRoomConfig(request, room, user.email)\n            ');
  });

  it('treats an unreachable controller as UNKNOWN, never as lapsed', () => {
    /*
      A controller that did not answer has not said no. Collapsing the two would turn one timeout
      into a room-wide disconnection — the outage amplifier the grace window exists to prevent.
    */
    const poll = ENDPOINT.slice(ENDPOINT.indexOf('accessCheck = setInterval('));
    expect(poll).toContain("let entitlement: EntitlementAnswer = 'unknown'");
    expect(poll).toContain('grace window applies');
    /* The catch must not assign a verdict of its own. */
    const catchBlock = poll.slice(poll.indexOf('} catch (cause) {'), poll.indexOf('const verdict'));
    expect(catchBlock).not.toContain("'lapsed'");
  });

  it('tells the member BEFORE it closes, and tells only THIS connection', () => {
    /*
      `send(...)` writes to this stream's own listener. `publishToUsers` would be wrong and would look
      right: after a newest-wins eviction the revoked connection and the one that replaced it share a
      user id, so an addressed publish would revoke the login that just succeeded.

      And the order matters: a teardown before the frame leaves the member disconnected with no
      reason, which is the silent disconnect this feature exists not to do.
    */
    const poll = ENDPOINT.slice(ENDPOINT.indexOf('accessCheck = setInterval('));
    const sendAt = poll.indexOf("cmd: 'sessionRevoked'");
    const teardownAt = poll.indexOf('teardown();', sendAt);
    expect(sendAt).toBeGreaterThan(-1);
    expect(teardownAt).toBeGreaterThan(sendAt);
    /*
      The CALL form, with its parenthesis, and that is not pedantry — the first draft asserted the
      bare name and failed against the comment three lines above the code explaining why the function
      is not used. An assertion a comment can satisfy is the same defect as a comment a parser reads
      as code, which this repository has already been bitten by once.
    */
    expect(poll.slice(0, sendAt)).not.toContain('publishToUsers(');
  });

  it('stops the timer everywhere the stream can end', () => {
    /*
      Three things race to end a connection — `teardown()`, the stream's `cancel()`, and a heartbeat
      write that throws. A timer left running on a closed stream would keep polling the controller
      once a minute for a member who left hours ago, which is the leak that `request.signal` was
      added to this endpoint to fix in the first place.
    */
    const clears = ENDPOINT.match(/if \(accessCheck\) clearInterval\(accessCheck\);/g) ?? [];
    expect(clears.length).toBeGreaterThanOrEqual(2);
    expect(ENDPOINT.slice(ENDPOINT.indexOf('const teardown = () => {'))).toContain(
      'if (accessCheck) clearInterval(accessCheck);'
    );
  });

  it('the frame the client reads is the frame the server sends', () => {
    /*
      Both ends of a wire named by a string, pinned together. `events.svelte.ts` branches on the same
      literal and `room-events.ts` types the fields; a rename on one side alone is the defect class
      this repository names as invisible to every tool.
    */
    const client = readFileSync(new URL('./room/events.svelte.ts', import.meta.url), 'utf8');
    const wire = readFileSync(new URL('./server/room-events.ts', import.meta.url), 'utf8');
    expect(client).toContain("command?.cmd === 'sessionRevoked'");
    expect(wire).toContain("reason?: 'session-ended' | 'entitlement-lapsed' | 'unconfirmed';");
  });
});
