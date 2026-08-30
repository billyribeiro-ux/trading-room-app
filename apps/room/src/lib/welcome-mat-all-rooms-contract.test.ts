import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments.js';
import { setWelcomeMatNoteTabSchema } from './notes-command.js';

/**
 * The all-rooms Welcome Mat, and the authority that moved from the browser to the server.
 *
 * ```js
 * setAsWelcomeTab(e) {                                            // reference byte 1,474,217
 *   e ? this.appService.globals.sessData.allRoomsWelcomeMatPW
 *       ? bootbox.prompt({
 *           title: "Please enter the password to replace all the rooms Welcome Mats:", value: "",
 *           callback: i => { if (i) { const o = i.trim();
 *             o === this.appService.globals.sessData.allRoomsWelcomeMatPW
 *               ? this.appService.sendServerAdminCommand("setWelcomeMatNoteTab", {id, allRooms: e, pw: o})
 *               : bootbox.alert("Wrong password!") } } })
 *       : bootbox.confirm("Are you sure you want to replace all the rooms Welcome Mats with this note?")
 *     : bootbox.confirm("Are you sure you want to apply this note as Welcome Mat", …)
 * }
 * ```
 *
 * ## What was here
 *
 * The password branch existed nowhere, `pw` was never sent, and `+page.server.ts` carried its own
 * recorded gap: *"the all-rooms variant needs a controller endpoint that enumerates the account's
 * rooms and verifies `allRoomsWelcomeMatPW`."* So `allRooms: true` set this room's mat and no other,
 * silently.
 *
 * ## THE COMPARISON MOVED, AND THAT IS NOT A COMPROMISE
 *
 * `allRoomsWelcomeMatPW` is one of the seven credential-shaped settings that may never reach this
 * room. Upstream compares in the browser because `sessData` holds the value — which also means a
 * member who can read `sessData` can send this command with any `pw` at all and have it obeyed. The
 * check that mattered never ran on a server. Moving it to the controller is the FIX, not the
 * workaround for a place we could not copy.
 */

const read = (path: string) => codeOf(path, readFileSync(new URL(path, import.meta.url), 'utf8'));

const PANE = read('./components/notes/NotesPane.svelte');
const AREA = read('./components/PresentationArea.svelte');
const ACTION = read('../routes/+page.server.ts');
const REMOTE = read('../routes/welcome-mat.remote.ts');
const CLIENT = read('./server/room-config-client.ts');
const REPOSITORY = read('./server/notes-repository.ts');

describe('the credential never reaches the room', () => {
  it('is named in no room source but the reasons for its absence', () => {
    /*
      The one assertion this whole feature rests on. Every file that mentions the setting mentions it
      to explain why it is not here — a value, a comparison or a `sessData`-shaped read would all
      fail this, because comments are stripped before the search.
    */
    for (const [name, source] of [
      ['NotesPane', PANE],
      ['PresentationArea', AREA],
      ['+page.server.ts', ACTION],
      ['welcome-mat.remote.ts', REMOTE]
    ] as const) {
      expect(source, name).not.toContain('allRoomsWelcomeMatPW');
    }
  });

  it('forwards the typed value instead of comparing it', () => {
    expect(PANE).toContain('await onSetWelcomeMat(current.noteId, true, trimmed);');
    /* No `===` against anything, and no local verdict to report. */
    expect(PANE).not.toContain("'Wrong password!'");
  });

  it('trims, as the reference does', () => {
    /* `const o = i.trim()`. The controller trims the candidate too and not the stored value. */
    expect(PANE).toContain('const trimmed = value.trim();');
  });
});

describe('which dialog is raised', () => {
  it('asks the controller, because the room cannot see the setting', () => {
    expect(PANE).toContain('if (allRooms && (await welcomeMatPasswordRequired()).required) {');
    expect(PANE).toContain(
      "title: 'Please enter the password to replace all the rooms Welcome Mats:'"
    );
  });

  it('keeps both confirmations, verbatim', () => {
    expect(PANE).toContain(
      "'Are you sure you want to replace all the rooms Welcome Mats with this note?'"
    );
    expect(PANE).toContain("'Are you sure you want to apply this note as Welcome Mat'");
  });

  it('does NOT ask for the per-room variant', () => {
    /*
      Upstream does not either, and a round trip before a confirmation nobody gated would be latency
      for nothing. The `allRooms &&` short-circuit is what says so.
    */
    const at = PANE.indexOf('async function requestWelcome');
    expect(at, 'the handler must exist').toBeGreaterThan(-1);
    const end = PANE.indexOf('\n  }', at);
    expect(end, 'the handler must be closed').toBeGreaterThan(at);
    expect(PANE.slice(at, end)).toContain('if (allRooms && (await');
  });
});

describe('the remote query', () => {
  it('takes no argument, so no caller can name another room', () => {
    /* `presenterRoom()` makes the gate and the room scope one event. */
    expect(REMOTE).toContain('query(z.void()');
    expect(REMOTE).toContain('const room = presenterRoom();');
    expect(REMOTE).not.toContain('roomShortCode:');
  });

  it('returns `required` and NOTHING else', () => {
    /*
      `ok` and the room list are this call's by-products, not its answer — it asks with an empty
      candidate, which never matches a configured password. Returning them would put an account's
      room list on a query that answers a yes/no question.
    */
    expect(REMOTE).toContain('return { required: decision.required };');
    expect(REMOTE).not.toContain('decision.rooms');
  });

  it('FAILS CLOSED, and closed here means prompt', () => {
    /*
      The two failure modes are not symmetric. Reporting `false` would raise a plain confirmation for
      an action the owner chose to gate; reporting `true` shows a prompt whose answer the write path
      re-checks against the same controller, so an outage costs one dialog and never opens the gate.
    */
    expect(REMOTE).toContain(
      'if (error instanceof RoomConfigUnavailable) return { required: true };'
    );
    expect(REMOTE).toContain('throw error;');
  });
});

describe('the write path re-checks rather than trusting the prompt', () => {
  it('sends the password to the controller before applying anything', () => {
    /*
      The prompt is a UI affordance and nothing more. A client that skipped it entirely and posted
      the form directly reaches exactly this check.
    */
    const at = ACTION.indexOf('if (command.data.data.allRooms) {');
    expect(at, 'the branch must exist').toBeGreaterThan(-1);
    const end = ACTION.indexOf('\n    }', at);
    expect(end, 'the branch must be closed').toBeGreaterThan(at);
    const branch = ACTION.slice(at, end);
    expect(branch).toContain('await checkWelcomeMatPasswordRemotely(room, command.data.data.pw)');
    expect(branch.indexOf('if (!decision.ok) return fail(403')).toBeLessThan(
      branch.indexOf('setWelcomeMatNoteEverywhere')
    );
    /* `Wrong password!` is the reference's own string. */
    expect(branch).toContain("message: 'Wrong password!'");
  });

  it('fails CLOSED on an unreachable controller, with no per-room fallback', () => {
    /*
      Applying to this room only would be a quiet, wrong answer to a request that named every room —
      and the presenter would have no way to tell which happened.
    */
    const at = ACTION.indexOf('if (command.data.data.allRooms) {');
    expect(at, 'the branch must exist').toBeGreaterThan(-1);
    const closes = ACTION.indexOf('\n    }', at);
    expect(closes, 'the branch must be closed').toBeGreaterThan(at);
    const branch = ACTION.slice(at, closes);
    expect(branch).toContain('return fail(503');
    expect(branch).not.toContain('setWelcomeMatNote({');
  });

  it('takes the room from the session, never from the form', () => {
    expect(ACTION).toContain('const room = requireRoomShortCode(locals);');
  });
});

describe('the command on the wire', () => {
  it('carries `pw`, defaulting to empty', () => {
    const parsed = setWelcomeMatNoteTabSchema.parse({
      cmd: 'setWelcomeMatNoteTab',
      data: { noteId: 7, allRooms: false }
    });
    expect(parsed.data.pw).toBe('');
  });

  it('refuses anything it does not name', () => {
    /* `z.strictObject`, so a field nobody validated cannot ride along. */
    expect(
      setWelcomeMatNoteTabSchema.safeParse({
        cmd: 'setWelcomeMatNoteTab',
        data: { noteId: 7, allRooms: true, pw: 'x', roomShortCode: '9999' }
      }).success
    ).toBe(false);
  });
});

describe('the controller client', () => {
  it('validates the room list before it becomes a query predicate', () => {
    /*
      Every entry, not just the array. These values become `WHERE room_short_code = ?` over another
      room's notes — a non-string in the list is a query built from something nobody checked.
    */
    expect(CLIENT).toContain(
      "if (!Array.isArray(decision.rooms) || decision.rooms.some((code) => typeof code !== 'string')) {"
    );
  });

  it('mints a READ capability, which the capability contract also asserts', () => {
    const at = CLIENT.indexOf('export async function checkWelcomeMatPasswordRemotely');
    expect(at, 'the client must exist').toBeGreaterThan(-1);
    const end = CLIENT.indexOf('\n}', at);
    expect(end, 'the client must be closed').toBeGreaterThan(at);
    const body = CLIENT.slice(at, end);
    expect(body).toContain('configReadToken(secret, shortCode)');
    expect(body).not.toContain('configWriteToken');
  });
});

describe('what applying it to every room means', () => {
  /*
    The function's body, bound once for the four assertions below.

    `'\n}\n'` and not `'\n}'`, which is what the first draft used and which cut the slice at the
    closing brace of the parameter's OBJECT TYPE — `}): RoomNote | null {` — 300 characters in. Four
    assertions then failed against a fragment, which is the loud half of the `slice(-1)` failure
    `slice-anchor-contract` exists for, met from a different direction: the bound was found, it was
    just the wrong one.
  */
  const at = REPOSITORY.indexOf('export function setWelcomeMatNoteEverywhere');
  const end = REPOSITORY.indexOf('\n}\n', at);
  const body = REPOSITORY.slice(at, end);

  it('bound the function it reads', () => {
    expect(at, 'the function must exist').toBeGreaterThan(-1);
    expect(end, 'the function must be closed').toBeGreaterThan(at);
    /* The vacuity floor: a fragment would satisfy several assertions below by omission. */
    expect(body.length, 'the whole body, not the parameter type').toBeGreaterThan(1500);
  });

  it('copies per room rather than sharing one note', () => {
    /*
      `notes.room_short_code` is the fence that keeps one room's notes out of another's, and every
      read in that file scopes by it. A shared note would require removing that scope from the
      welcome-mat read — the one change nothing here is allowed to make. The reference's server is
      not in the capture, so this is a decision taken in its absence and recorded as one.
    */
    expect(body).toContain('.insert(notes)');
    expect(body).toContain('roomShortCode: room,');
    expect(body).toContain('contentHtml: source.contentHtml,');
  });

  it('resolves the source note in the CALLER s room first', () => {
    /* Which is what makes every write below it safe — a note id from another room is refused. */
    expect(body).toContain('eq(notes.roomShortCode, input.sourceRoom)');
    expect(body.indexOf('if (source === undefined) return null;')).toBeLessThan(
      body.indexOf('for (const room of input.rooms)')
    );
  });

  it('demotes each room s previous mat without deleting it', () => {
    /*
      The old mat keeps existing, so a presenter in that room can put it back — which matters because
      the person who ran this was not necessarily in their room.
    */
    expect(body).toContain('.set({ isWelcomeMat: false })');
    expect(body).not.toContain('.delete(notes)');
  });

  it('is ONE transaction, so no account is left half-greeted', () => {
    expect(body).toContain('db.transaction((transaction) => {');
    /* And every write inside it goes through that handle, not through `db`. */
    const loop = body.indexOf('for (const room');
    expect(loop, 'the loop must exist').toBeGreaterThan(-1);
    expect(body.slice(loop)).not.toContain('db.');
  });
});
