import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';

import { codeOf } from './source-comments.js';
import { setWelcomeMatNoteTabSchema } from './notes-command.js';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { notes, users, type User } from '#lib/server/db/schema.js';
import { callRemote, expectSchemaRefusal } from '#lib/server/remote-command-harness.js';

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
/*
  THE THREE CAPTURED STRINGS MOVED, 2026-08-31 — to `note-dialogs.ts`, where the two Welcome Mat
  confirmations and the password prompt are declared as literal TYPES as well as values, so a
  mistyped one is a compile error rather than a silent divergence from the capture.

  `NotesPane.svelte` still owns the DECISION — which dialog to raise, and the `welcomeMatPasswordRequired`
  call that decides it — and that is what is still asserted against it below. What it no longer owns
  is the wording. Splitting the two assertions is the point: a test that read only the pane would go
  green on a pane that raised the right dialog with invented copy, and one that read only the module
  would go green on correct copy nothing raises.
*/
const DIALOGS = read('./note-dialogs.ts');
const AREA = read('./components/PresentationArea.svelte');
/*
  `+page.server.ts` no longer holds the write — `setWelcomeMatNoteTab` left for
  `session-notes.remote.ts` on 2026-08-30 — but it is still swept for the credential below, and that
  is deliberate: the assertion is that the setting is named in NO room source, so dropping a file
  from the sweep because it stopped writing would narrow the claim without saying so.
*/
const ACTION = read('../routes/+page.server.ts');
const NOTES_REMOTE = read('../routes/session-notes.remote.ts');
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
      ['session-notes.remote.ts', NOTES_REMOTE],
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
    /* The DECISION stays in the pane: which dialog, and the call to the controller that decides. */
    expect(PANE).toContain('if (allRooms && (await welcomeMatPasswordRequired()).required) {');
    /* The WORDING is the module's, verbatim. */
    expect(DIALOGS).toContain(
      "title: 'Please enter the password to replace all the rooms Welcome Mats:'"
    );
  });

  it('keeps both confirmations, verbatim', () => {
    expect(DIALOGS).toContain(
      "'Are you sure you want to replace all the rooms Welcome Mats with this note?'"
    );
    /* No full stop, and the all-rooms twin has one — upstream's own inconsistency, kept. */
    expect(DIALOGS).toContain("'Are you sure you want to apply this note as Welcome Mat'");
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

/*
  REWRITTEN, not re-pointed, when `setWelcomeMatNoteTab` became a remote command on 2026-08-30.

  These three read `+page.server.ts` and asserted on the TEXT of the branch: that it contained a
  `checkWelcomeMatPasswordRemotely` call, that one `indexOf` came before another, that a `fail(503)`
  was present. Re-pointing them at `session-notes.remote.ts` would have been one character of work
  and would have proven strictly less than they did before — a text assertion cannot tell a live
  refusal from one that a later edit put behind an `if` nothing enters.

  So they execute. The controller is stubbed at the module boundary, exactly as
  `scheduled-alert-contract.test.ts` stubs `readRoomConfig`, and what is asserted is what the
  command DID: the row it wrote, or the row it left alone.

  Only `checkWelcomeMatPasswordRemotely` is stubbed. It is the only export of that module the
  command under test reaches, and stubbing the file wholesale would have quietly disabled
  `readRoomConfig` for anything else that arrived in this file later.
*/
const controller = {
  answer: async (
    _candidate: string
  ): Promise<{ required: boolean; ok: boolean; rooms: string[] }> => {
    throw new RoomConfigUnavailableStub('no stub answer was configured');
  }
};

class RoomConfigUnavailableStub extends Error {}

vi.mock('#lib/server/room-config-client.js', () => ({
  RoomConfigUnavailable: RoomConfigUnavailableStub,
  checkWelcomeMatPasswordRemotely: (_shortCode: string, candidate: string) =>
    controller.answer(candidate)
}));

const { newSessionNoteTab, setWelcomeMatNoteTab } = await import('../routes/session-notes.remote');

/** The room the presenter is in. Every command takes it from the session, never from an argument. */
const ROOM = '3625';

function account(email: string, role: string): User {
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return existing;
  return db
    .insert(users)
    .values({
      displayName: `welcome mat ${role}`,
      email,
      role,
      passwordHash: 'scrypt$00$00',
      createdAt: new Date()
    })
    .returning()
    .get();
}

let presenter: User;

beforeAll(() => {
  ensureDatabase();
  presenter = account('welcome-mat-presenter@example.test', 'staff');
});

beforeEach(() => {
  db.delete(notes).run();
});

const as = <T>(run: () => T | Promise<T>) =>
  callRemote(
    { user: presenter, sessionId: 'welcome-mat-contract', roomShortCode: ROOM } as App.Locals,
    run
  );

const isWelcomeMat = (noteId: number) =>
  db.select().from(notes).where(eq(notes.id, noteId)).get()?.isWelcomeMat;

describe('the write path re-checks rather than trusting the prompt', () => {
  it('sends the password to the controller, and refuses the whole request when it is wrong', async () => {
    /*
      The prompt is a UI affordance and nothing more. A client that skipped it entirely and called
      the command directly reaches exactly this check — which is what this test does: there is no
      dialog anywhere in it, only the command and the controller's verdict.
    */
    const note = await as(() => newSessionNoteTab({ name: 'Everywhere' }));

    const asked: string[] = [];
    controller.answer = async (candidate: string) => {
      asked.push(candidate);
      return { required: true, ok: false, rooms: ['3625', '9140'] };
    };

    /* `Wrong password!` is the reference's own string, at byte 1,474,217. */
    await expect(
      as(() => setWelcomeMatNoteTab({ noteId: note.id, allRooms: true, pw: 'guess' }))
    ).rejects.toMatchObject({ status: 403, body: { message: 'Wrong password!' } });

    expect(asked, 'the candidate never reached the controller').toEqual(['guess']);
    // The status alone would pass with the mat already moved. This is the half that matters.
    expect(isWelcomeMat(note.id)).toBe(false);
  });

  it('applies to every room the controller named, once it says yes', async () => {
    /*
      The positive control for the assertion above. A refusal that is really "this branch does
      nothing at all" would pass the wrong-password test and fail here.
    */
    const note = await as(() => newSessionNoteTab({ name: 'Everywhere' }));
    controller.answer = async (_candidate: string) => ({ required: true, ok: true, rooms: [ROOM] });

    await as(() => setWelcomeMatNoteTab({ noteId: note.id, allRooms: true, pw: 'correct' }));

    expect(isWelcomeMat(note.id)).toBe(true);
  });

  it('fails CLOSED on an unreachable controller, with no per-room fallback', async () => {
    /*
      Applying to this room only would be a quiet, wrong answer to a request that named every room —
      and the presenter would have no way to tell which happened. So the 503 is asserted WITH the
      row: a `catch` that fell through to `setWelcomeMatNote({ room, … })` would answer 200 and set
      exactly one mat, which is the failure this is about and which no status check alone can see.
    */
    const note = await as(() => newSessionNoteTab({ name: 'Everywhere' }));
    controller.answer = async (_candidate: string) => {
      throw new RoomConfigUnavailableStub('the controller is down');
    };

    await expect(
      as(() => setWelcomeMatNoteTab({ noteId: note.id, allRooms: true, pw: 'correct' }))
    ).rejects.toMatchObject({ status: 503 });

    expect(isWelcomeMat(note.id)).toBe(false);
  });

  it('takes the room from the session, never from the payload', async () => {
    /*
      `z.strictObject` is what makes a room on the wire unrepresentable rather than merely unused: an
      extra field is REFUSED, so a future edit cannot quietly start honouring one. The cast is the
      point — the payload type already forbids this at compile time, and what is proven here is that
      the runtime does too.
    */
    const note = await as(() => newSessionNoteTab({ name: 'Here only' }));
    controller.answer = async (_candidate: string) => ({
      required: false,
      ok: true,
      rooms: [ROOM]
    });

    await expectSchemaRefusal(
      as(() =>
        setWelcomeMatNoteTab({
          noteId: note.id,
          allRooms: false,
          pw: '',
          roomShortCode: '9140'
        } as unknown as { noteId: number; allRooms: boolean; pw: string })
      ),
      'roomShortCode on the payload'
    );

    expect(isWelcomeMat(note.id)).toBe(false);
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
