import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  The recording state, end to end — and this file exists because there was NOTHING.

  `recordingState` was a form action from the day the `[ REC ]` badge was fixed, and no test
  anywhere read it. The whole story lived in a docstring: that the badge shows to every member
  because the room learns the recording state from the SERVER rather than from each browser's own
  `MediaRecorder` flag, which is the bug that made a member's copy permanently false. A docstring is
  not a guard. Somebody folding the announcement back into the local flag would have moved the code
  and the comment together and stayed green.

  Written when the action became `src/routes/recording-state.remote.ts`, so the conversion is the
  first thing it has ever been checked against.
*/

const COMMAND = readFileSync(
  new URL('../routes/recording-state.remote.ts', import.meta.url),
  'utf8'
);
const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
const SERVER = readFileSync(new URL('../routes/+page.server.ts', import.meta.url), 'utf8');

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const commandCode = stripComments(COMMAND);
const pageCode = stripComments(PAGE);
const recorderCode = stripComments(
  readFileSync(new URL('./room/recording.ts', import.meta.url), 'utf8')
);
const serverCode = stripComments(SERVER);

describe('the command', () => {
  it('is presenter-only and scoped to the caller’s own room by the same call', () => {
    expect(commandCode).toContain('publishToRoom(presenterRoom(), {');
    /*
      `presenterRoom()` checks the role and only then returns the room, so a presenter of one room
      cannot announce a recording into another. There is no room on the argument to override it.
    */
    expect(commandCode).not.toContain('requireRoomShortCode');
    expect(commandCode).not.toContain('roomShortCode');
  });

  it('accepts the four transitions and nothing else', () => {
    /*
      The capture's own four, and deny-by-default. An unknown string would be forwarded to every
      client in the room and dispatched by none — a silent no-op, which is worse than a refusal
      because nothing anywhere reports it.
    */
    expect(commandCode).toContain("cmd: z.enum(['startRec', 'stopRec', 'pauseRec', 'resumeRec'])");
    expect(commandCode).toContain('z.strictObject({');
  });

  it('REFUSES an over-long name where the action silently truncated it', () => {
    /*
      The form action read `String(data.get('recName') ?? '').slice(0, 200)`. A truncation turns a
      wrong input into a plausible one and tells nobody, which is the silent fallback this
      repository forbids. The bound is unreachable from the UI either way — the one caller that
      supplies a name generates a 39-character ISO timestamp.
    */
    expect(commandCode).toContain('recName: z.string().max(200).optional()');
    expect(commandCode).not.toContain('.slice(0, 200)');
  });

  it('never lets an empty name ride along as an empty string', () => {
    // The badge tooltip reads the field to decide whether it has a name to show at all.
    expect(commandCode).toContain('recName: recName || undefined');
  });

  it('stores nothing, which is the one thing separating it from the chat mode', () => {
    /*
      Recording is MOMENTARY: a member who joins after the recorder stopped has missed nothing, and
      a row would be a second opinion to keep in step with a `MediaRecorder` that can die with the
      tab that owns it. `chat-mode.remote.ts` is the same presenter broadcast WITH a row, because a
      disabled chat is a standing fact somebody arriving later has to find.
    */
    expect(commandCode).not.toContain('db.insert');
    expect(commandCode).not.toContain('db.update');
  });

  it('and the form action it replaced is gone from the file that held it', () => {
    // `+page.server.ts` did contain this, so the guard is real rather than pointed at a new file.
    expect(serverCode).toContain('export const actions: Actions = {');
    expect(serverCode).not.toContain('recordingState: async');
    expect(serverCode).not.toContain("const allowed = new Set(['startRec'");
  });
});

describe('the page announces rather than inferring', () => {
  it('the four call sites go through one wrapper that catches', () => {
    /*
      All four callers are `void`-ed fire-and-forget, because upstream shows the presenter nothing
      when a broadcast fails and inventing a toast would change what the room does. A `void` on a
      promise that can reject is an unhandled rejection, and a dropped one is the swallowed catch
      this repository forbids — so the catch is inside the wrapper, once, and it LOGS.
    */
    const from = recorderCode.indexOf('async #broadcastRecordingState(');
    expect(from, 'the wrapper must exist').toBeGreaterThan(-1);
    const wrapper = recorderCode.slice(from, recorderCode.indexOf('\n  }', from));
    expect(wrapper).toContain('await recordingState({ cmd, recName });');
    expect(wrapper).toContain("console.error('recordingState', cmd, error);");
    expect(wrapper).not.toContain("fetch('?/recordingState'");
  });

  it('and its parameter is the command’s own union, not a bare string', () => {
    /*
      `Parameters<typeof recordingState>[0]['cmd']` rather than the four strings restated on the
      client. A typo at a call site is now a compile error instead of a 400 nobody sees, and the
      allow-list has exactly one home.
    */
    expect(recorderCode).toContain(
      "type RecordingTransition = Parameters<typeof recordingState>[0]['cmd'];"
    );
    expect(recorderCode).toContain('async #broadcastRecordingState(cmd: RecordingTransition');
  });

  it('every transition the recorder makes is announced', () => {
    // The badge and its pause state are driven entirely by these; a missed one desyncs the room.
    expect(recorderCode).toMatch(
      /void this\.#broadcastRecordingState\(\s*'startRec'/
    );
    expect(recorderCode).toContain("void this.#broadcastRecordingState('stopRec')");
    expect(recorderCode).toContain("void this.#broadcastRecordingState('pauseRec')");
    expect(recorderCode).toContain("void this.#broadcastRecordingState('resumeRec')");
  });

  it('and a stop is announced only when a start was', () => {
    /*
      `stopScreenSharing()` calls `stopRecording()` unconditionally, so an unguarded announcement
      would clear the badge for a room that is still recording.
    */
    expect(recorderCode).toContain(
      "if (wasRecording) void this.#broadcastRecordingState('stopRec');"
    );
  });
});
