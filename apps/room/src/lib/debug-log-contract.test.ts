import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CAPACITY,
  DebugLogBuffer,
  MAX_LINE,
  REDACTED,
  formatArguments,
  scrubLine
} from '#lib/debug-log-buffer.js';
import {
  DEBUG_LOG_REQUEST_TTL_MS,
  noteDebugLogRequested,
  pendingDebugLogRoomCount,
  resetDebugLogRequests,
  takeDebugLogRequestor
} from '#lib/server/debug-log-requests.js';
import { RoomPrivateCommands } from '#lib/room/private-commands.js';
import type { RoomChatMute } from '#lib/room/chat-mute.js';

/**
 * `getDebugLog` / `debugLogResp` — the one frame in this room that travels MEMBER -> PRESENTER.
 *
 * ## The property this file exists for
 *
 * Upstream's member replies `{requestor: xe.requestor, log: V1}`: the replying CLIENT names who
 * receives the log. Every other frame on `privCmds` runs the other way, where a forged field costs
 * the forger nothing. This one does not, and a member who names an arbitrary requestor can push
 * arbitrary text into any presenter's Debug Log modal — indistinguishable from a real answer,
 * because a real answer is also arbitrary text.
 *
 * `private-commands.ts` has carried that warning since the channel was written. The resolution is
 * not a validated field but an ABSENT one: `sendDebugLog` takes no requestor argument, and the
 * server looks up who asked. **The assertion below is that the argument does not exist**, which is
 * the only form of this check that a future edit cannot quietly loosen.
 *
 * ## Why the registry is tested through its own clock
 *
 * `noteDebugLogRequested` and `takeDebugLogRequestor` both accept `now`, for the reason
 * `RoomAlerts.archive(now)` gives: a TTL tested against the wall clock is a test that either sleeps
 * or lies. Every expiry case below is driven by arithmetic.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));

afterEach(() => resetDebugLogRequests());

describe('the buffer is bounded and scrubbed', () => {
  it('keeps the newest CAPACITY lines and drops the oldest', () => {
    const buffer = new DebugLogBuffer(3);
    for (const line of ['a', 'b', 'c', 'd']) buffer.record(line);
    expect(buffer.size).toBe(3);
    expect(buffer.toText()).toBe('b\nc\nd');
  });

  it('is bounded in the real configuration too, not only in the test one', () => {
    /*
      The default capacity is what actually ships, and a bound that only holds for a hand-picked
      constructor argument is not a bound. Written as CAPACITY + 50 so raising the constant cannot
      leave this asserting something weaker than the code.
    */
    const buffer = new DebugLogBuffer();
    for (let index = 0; index < CAPACITY + 50; index += 1) buffer.record(`line ${index}`);
    expect(buffer.size).toBe(CAPACITY);
    expect(buffer.toText().startsWith('line 50\n')).toBe(true);
  });

  it('truncates one long line rather than dropping it', () => {
    const buffer = new DebugLogBuffer();
    buffer.record('x'.repeat(MAX_LINE * 2));
    /* Truncated, but STILL THERE — a dropped line is a lost diagnostic. */
    expect(buffer.size).toBe(1);
    expect(buffer.toText().length).toBeLessThan(MAX_LINE + 64);
    expect(buffer.toText()).toContain(`[${MAX_LINE * 2} chars]`);
  });

  it('removes credentials and KEEPS the name of what it removed', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1g';
    expect(scrubLine(`grant failed ${jwt} retrying`)).toBe(`grant failed ${REDACTED} retrying`);

    /*
      The parameter NAME survives. `?token=[redacted]` tells a reader which credential was dropped;
      `[redacted]` alone tells them only that something was, which is the difference between a
      usable log and a censored one.
    */
    expect(scrubLine('GET /whep?token=abc123def456&x=1')).toBe(`GET /whep?token=${REDACTED}&x=1`);
    expect(scrubLine('authorization: Bearer abcdefghijklmnopqrstuvwxyz')).toBe(
      `authorization: Bearer ${REDACTED}`
    );
  });

  it('leaves ordinary identifiers alone, which is what makes it a log at all', () => {
    /*
      The negative half, and the one that keeps the redaction honest. A rule broad enough to catch
      "anything long and random" eats message ids, room codes and stack offsets — and a debug log
      with its identifiers scrubbed cannot be used to debug anything.
    */
    const line = 'room 7301 message 0f8a2c1e-44bd-4a91-9f3e-7c2d55ab19e0 at chunk-XY7Q2.js:1180';
    expect(scrubLine(line)).toBe(line);
  });

  it('renders arguments without producing the marker the browser suite forbids', () => {
    /*
      `String({})` is `[object Object]`, which `room-renders.spec.ts` asserts must never reach a
      page — and it is no more useful in a log than on screen.
    */
    expect(formatArguments(['a', { b: 1 }, 2])).toBe('a {"b":1} 2');
    expect(formatArguments([new Error('boom')])).toBe('Error: boom');

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    /* A circular structure throws in `JSON.stringify`; the line must survive rather than be lost. */
    expect(() => formatArguments([circular])).not.toThrow();
  });
});

describe('the server remembers who asked', () => {
  it('returns the requestor once, and only once', () => {
    noteDebugLogRequested('7301', 42, 7, 1_000);
    expect(takeDebugLogRequestor('7301', 42, 1_500)).toBe(7);
    /*
      SINGLE USE. One request yields one reply, so a member cannot post its log ten times off one
      click and flood a presenter's modal.
    */
    expect(takeDebugLogRequestor('7301', 42, 1_600)).toBeNull();
  });

  it('answers null for a member nobody asked', () => {
    noteDebugLogRequested('7301', 42, 7, 1_000);
    expect(takeDebugLogRequestor('7301', 99, 1_500)).toBeNull();
  });

  it('does not let one room answer for another', () => {
    /* The tenancy rule, on the one lookup in this feature that takes a room as an argument. */
    noteDebugLogRequested('7301', 42, 7, 1_000);
    expect(takeDebugLogRequestor('9999', 42, 1_500)).toBeNull();
    expect(takeDebugLogRequestor('7301', 42, 1_500)).toBe(7);
  });

  it('expires a claim rather than collecting a log the presenter has forgotten asking for', () => {
    noteDebugLogRequested('7301', 42, 7, 1_000);
    expect(takeDebugLogRequestor('7301', 42, 1_000 + DEBUG_LOG_REQUEST_TTL_MS)).toBeNull();
  });

  it('frees the room when its last claim expires, so an abandoned request cannot accumulate', () => {
    noteDebugLogRequested('7301', 42, 7, 1_000);
    expect(pendingDebugLogRoomCount()).toBe(1);
    /* Expiry is on READ and on WRITE, never on a timer — a touch of any room sweeps it. */
    noteDebugLogRequested('other', 1, 2, 1_000 + DEBUG_LOG_REQUEST_TTL_MS);
    expect(takeDebugLogRequestor('7301', 42, 1_000 + DEBUG_LOG_REQUEST_TTL_MS)).toBeNull();
    expect(pendingDebugLogRoomCount()).toBe(1);
  });

  it('lets the newest presenter replace the previous claim rather than fanning out', () => {
    noteDebugLogRequested('7301', 42, 7, 1_000);
    noteDebugLogRequested('7301', 42, 8, 1_100);
    expect(takeDebugLogRequestor('7301', 42, 1_200)).toBe(8);
  });
});

describe('the reply cannot name its own recipient', () => {
  it('sendDebugLog takes a log and NOTHING else', () => {
    /*
      THE ASSERTION THIS FILE EXISTS FOR, and it is deliberately about the SHAPE rather than about a
      value. Validating a requestor field would leave the field there for a future edit to start
      trusting; not having one cannot be loosened by accident.
    */
    const source = readFileSync(`${ROOT}routes/debug-log.remote.ts`, 'utf8');
    const schema = /sendDebugLog = command\(\s*(z\.strictObject\(\{[^}]*\}\))/.exec(source);
    expect(schema, 'sendDebugLog no longer declares a strict object schema').not.toBeNull();
    expect(schema![1]).toContain('log:');
    expect(schema![1]).not.toContain('requestor');
    expect(schema![1]).not.toContain('targetUserId');
    expect(schema![1]).not.toContain('fromUserId');
  });

  it('fills the sender fields from the session rather than from the payload', () => {
    const source = readFileSync(`${ROOT}routes/debug-log.remote.ts`, 'utf8');
    /* `sender` is `requireUser(locals)` — the server's own view of who called. */
    expect(source).toContain('fromUserId: sender.id');
    expect(source).toContain('fromName: sender.displayName');
    /* And the recipient comes from the recorded claim, never from the caller. */
    expect(source).toContain('takeDebugLogRequestor(room, sender.id)');
  });
});

describe('the receiver refuses a malformed frame', () => {
  function router(received: unknown[]) {
    return new RoomPrivateCommands({
      viewerId: () => 5,
      chatMute: {} as RoomChatMute,
      forceReloadRequested: () => {},
      kicked: () => {},
      reconnectAudio: () => Promise.resolve(),
      collectDebugLog: () => 'the log',
      sendDebugLog: (log) => received.push({ sent: log }),
      debugLogReceived: (from) => received.push(from)
    });
  }

  it('answers getDebugLog with this browser buffer', () => {
    const received: unknown[] = [];
    expect(router(received).handle({ cmd: 'getDebugLog', targetUserId: 5 }, () => {})).toBe(true);
    expect(received).toEqual([{ sent: 'the log' }]);
  });

  it('does not answer a getDebugLog addressed to somebody else', () => {
    /*
      The addressing gate, on the frame where getting it wrong means every member in the room
      posting their console at once off one presenter click.
    */
    const received: unknown[] = [];
    expect(router(received).handle({ cmd: 'getDebugLog', targetUserId: 6 }, () => {})).toBe(false);
    expect(received).toEqual([]);
  });

  it('drops a debugLogResp whose fields are the wrong shape', () => {
    const received: unknown[] = [];
    const commands = router(received);
    /* A frame missing `log` would otherwise render the literal `undefined` into the textarea. */
    expect(commands.handle({ cmd: 'debugLogResp', targetUserId: 5, fromUserId: 1 }, () => {})).toBe(
      false
    );
    expect(
      commands.handle(
        { cmd: 'debugLogResp', targetUserId: 5, fromUserId: 1, fromName: 'A', log: 42 },
        () => {}
      )
    ).toBe(false);
    expect(received).toEqual([]);
  });

  it('accepts a well-formed debugLogResp addressed to this presenter', () => {
    const received: unknown[] = [];
    expect(
      router(received).handle(
        { cmd: 'debugLogResp', targetUserId: 5, fromUserId: 9, fromName: 'Ada', log: 'lines' },
        () => {}
      )
    ).toBe(true);
    expect(received).toEqual([{ fromUserId: 9, fromName: 'Ada', log: 'lines' }]);
  });
});

describe('the captured styling finally has a consumer', () => {
  it('the textarea wears the class app.css has been styling all along', () => {
    /*
      `.debug-area` had TWO rules and ZERO wearers until this feature was built — `app.css:2443` and
      the mobile override at `:3080`. CSS for a class no element carries is the same defect as a
      class with no CSS, and it is what made this feature's absence visible in the stylesheet.
    */
    const css = readFileSync(`${ROOT}app.css`, 'utf8');
    expect(css).toContain('.debug-area {');

    const modal = readFileSync(`${ROOT}lib/components/ModalHost.svelte`, 'utf8');
    expect(modal).toContain('class="form-control debug-area"');
    expect(modal).toContain('id="debugLogModalTxt"');
  });
});
