import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { codeOf } from '#lib/source-comments.js';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { alerts, messages, sessions, users, type User } from '#lib/server/db/schema.js';
import { callRemote } from '#lib/server/remote-command-harness.js';
import { RoomMessageDeletion } from '#lib/room/message-delete.js';
import { RoomDialogs } from '#lib/room/dialogs.svelte.js';
import type { MessageActionItem } from '#lib/types.js';

/**
 * `deleteAlertPW` — the configured password that did nothing, and the door that now enforces it.
 *
 * ## What this file exists to prevent
 *
 * `TODO.md` row AL, closed 2026-08-30. The setting's own help text is *"If set, Presenters will need
 * to enter the password to delete an alert"*, and **nothing in this product read it.**
 * `message-actions.remote.ts`'s delete branch asked `usersCanDeleteOwnMsgs` of a MEMBER and let a
 * presenter through unconditionally, so an owner could configure this password and watch every
 * presenter delete alerts unchallenged.
 *
 * The capture — and re-measuring the row's offset with `grep -abo` is what found the right one.
 * Row AL cites 2,048,903, inside `archiveChatDate`, which archives a whole DAY. **The per-alert
 * delete has its own copy of the same prompt**, at byte 2,601,823, and that is this surface:
 *
 * ```js
 * deleteAlertMessage(e){
 *   this.appService.globals.sessData.deleteAlertPW
 *     ? bootbox.prompt({ title:"Please enter the password to delete this alert:", value:"",
 *         callback: i => { i && (i.trim() === this.appService.globals.sessData.deleteAlertPW
 *           ? this.appService.deleteAlert(e) : bootbox.alert("Wrong password!")) } })
 *     : this.appService.deleteAlert(e)
 * }
 * ```
 *
 * Reached from `subscribe("doAlertDelete")` at 2,598,258, which confirms first and skips ONLY the
 * confirmation on `shiftDelete` — so the three orderings this file pins are upstream's own rather
 * than this room's, and `room/message-delete.ts` quotes all three.
 *
 * ## The three properties, and why each is asserted where it is
 *
 * 1. **The credential never reaches this room.** Asserted over the room's own source with comments
 *    stripped, because a contract test that reads raw text is satisfied by prose — this file's own
 *    transcription above would otherwise pass for a leak.
 * 2. **A wrong password is refused, on the SERVER.** Asserted by executing `messageAction` against
 *    the live database: a presenter with no grant gets a 403 and the alert is still there. The
 *    client's prompt is a convenience; the row is the evidence.
 * 3. **The prompt behaves as the capture does.** Asserted by driving `RoomMessageDeletion` with a
 *    stub, because the two-call shape (`required` first, candidate second) is the part a reader
 *    would otherwise have to re-derive from two files in two packages.
 */

/*
  THE CONTROLLER, stubbed — and it is a mutable object because the interesting assertions are on BOTH
  sides of it. A stub pinned to `{required:false}` would let every delete through and hide the gate;
  one pinned to `{ok:false}` would hide every other delete in this file behind a 403.
*/
const controller: {
  alertDelete: { required: boolean; ok: boolean };
  alertDeleteThrows: boolean;
  calls: string[];
} = {
  alertDelete: { required: false, ok: true },
  alertDeleteThrows: false,
  calls: []
};

class RoomConfigUnavailable extends Error {}

vi.mock('#lib/server/room-config-client.js', () => ({
  RoomConfigUnavailable,
  readRoomConfig: async (_request: unknown, shortCode: string) => ({
    room: {
      shortCode,
      name: `Room ${shortCode}`,
      state: 'open',
      logoUrl: null,
      publicId: null,
      maxUsers: 0
    },
    settings: { usersCanDeleteOwnMsgs: true },
    locked: [],
    member: null
  }),
  checkAlertDeletePasswordRemotely: async (_room: string, candidate: string) => {
    controller.calls.push(candidate);
    if (controller.alertDeleteThrows) throw new RoomConfigUnavailable('unreachable');
    return controller.alertDelete;
  },
  /*
    The NOTES door, stubbed beside it and never used by anything here. It is present because the two
    grants must be provably independent — see "two credentials, two columns" below — and a mock that
    omitted it would make that test fail for the wrong reason.
  */
  checkNotesPasswordRemotely: async () => ({ required: true, ok: false })
}));

const { messageAction } = await import('../routes/message-actions.remote');
const { checkAlertDeletePassword } = await import('../routes/alert-delete-auth.remote');
const { ALERT_DELETE_ACCESS_TTL_MS } = await import('#lib/server/alert-delete-access.js');

const ROOM = '3625';
const SESSION = 'alert-delete-contract-session';

const act = <T>(user: User, run: () => T | Promise<T>) =>
  callRemote({ user, sessionId: SESSION, roomShortCode: ROOM } as App.Locals, run);

function account(email: string, role: string): User {
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return existing;
  return db
    .insert(users)
    .values({
      displayName: `alert delete ${role}`,
      email,
      role,
      passwordHash: 'scrypt$00$00',
      createdAt: new Date()
    })
    .returning()
    .get();
}

let presenter: User;
let member: User;

beforeAll(() => {
  ensureDatabase();
  presenter = account('alert-delete-presenter@example.test', 'staff');
  member = account('alert-delete-member@example.test', 'member');
});

beforeEach(() => {
  db.delete(alerts).run();
  db.delete(messages).run();
  db.delete(sessions).where(eq(sessions.id, SESSION)).run();
  db.insert(sessions)
    .values({
      id: SESSION,
      userId: presenter.id,
      roomShortCode: ROOM,
      createdAt: new Date(),
      lastSeenAt: new Date()
    })
    .run();
  controller.alertDelete = { required: false, ok: true };
  controller.alertDeleteThrows = false;
  controller.calls = [];
});

const newAlert = (sender: User) =>
  db
    .insert(alerts)
    .values({ roomShortCode: ROOM, senderId: sender.id, body: 'an alert', createdAt: new Date() })
    .returning()
    .get();

const newMessage = (sender: User) =>
  db
    .insert(messages)
    .values({
      roomShortCode: ROOM,
      senderId: sender.id,
      body: 'a message',
      isAdmin: false,
      createdAt: new Date()
    })
    .returning()
    .get();

const grantOf = () =>
  db.select().from(sessions).where(eq(sessions.id, SESSION)).get()?.alertDeleteAccessAt ?? null;

describe('the server refuses an alert delete when the password has not been cleared', () => {
  it('deletes freely when the room has configured NO alert-delete password', async () => {
    // `{required:false}` is the reference's own first branch: no password, no prompt, straight send.
    const alert = newAlert(presenter);
    await expect(
      act(presenter, () => messageAction({ operation: 'delete', kind: 'alert', id: alert.id }))
    ).resolves.toBeUndefined();
    expect(db.select().from(alerts).all()).toHaveLength(0);
    // …and it ASKED, with an empty candidate, rather than assuming.
    expect(controller.calls).toEqual(['']);
  });

  it('REFUSES a presenter with no grant when the password IS configured', async () => {
    controller.alertDelete = { required: true, ok: false };
    const alert = newAlert(presenter);

    await expect(
      act(presenter, () => messageAction({ operation: 'delete', kind: 'alert', id: alert.id }))
    ).rejects.toMatchObject({ status: 403 });

    // The row is the evidence. A refusal that still deleted would be the defect wearing a 403.
    expect(db.select().from(alerts).all()).toHaveLength(1);
  });

  it('accepts the delete once the CORRECT password has been answered', async () => {
    controller.alertDelete = { required: true, ok: true };
    await expect(
      act(presenter, () => checkAlertDeletePassword({ candidate: 'hunter2' }))
    ).resolves.toEqual({ required: true, ok: true });
    expect(grantOf()).not.toBeNull();

    const alert = newAlert(presenter);
    await expect(
      act(presenter, () => messageAction({ operation: 'delete', kind: 'alert', id: alert.id }))
    ).resolves.toBeUndefined();
    expect(db.select().from(alerts).all()).toHaveLength(0);
  });

  it('writes NO grant for a wrong password, so a refusal cannot extend an expiring one', async () => {
    controller.alertDelete = { required: true, ok: false };
    await expect(
      act(presenter, () => checkAlertDeletePassword({ candidate: 'wrong' }))
    ).resolves.toEqual({ required: true, ok: false });
    expect(grantOf()).toBeNull();
  });

  it('refuses a grant that has expired, and the window is the one the module names', async () => {
    controller.alertDelete = { required: true, ok: true };
    await act(presenter, () => checkAlertDeletePassword({ candidate: 'hunter2' }));

    // Age the grant past its TTL rather than waiting for it — the clock is the subject, not the test.
    db.update(sessions)
      .set({ alertDeleteAccessAt: new Date(Date.now() - ALERT_DELETE_ACCESS_TTL_MS - 1000) })
      .where(eq(sessions.id, SESSION))
      .run();

    const alert = newAlert(presenter);
    await expect(
      act(presenter, () => messageAction({ operation: 'delete', kind: 'alert', id: alert.id }))
    ).rejects.toMatchObject({ status: 403 });
    expect(db.select().from(alerts).all()).toHaveLength(1);
  });

  it('refuses rather than deletes when the controller cannot be reached', async () => {
    /*
      FAIL CLOSED, and this is the assertion that says which way. An unreachable controller means
      alerts cannot be deleted until it comes back — an outage. Deleting on a failed check would be
      a data loss no later repair can undo.
    */
    controller.alertDeleteThrows = true;
    const alert = newAlert(presenter);
    await expect(
      act(presenter, () => messageAction({ operation: 'delete', kind: 'alert', id: alert.id }))
    ).rejects.toBeInstanceOf(RoomConfigUnavailable);
    expect(db.select().from(alerts).all()).toHaveLength(1);
  });

  it('does not gate CHAT, which has its own rule', async () => {
    controller.alertDelete = { required: true, ok: false };
    const message = newMessage(presenter);
    await expect(
      act(presenter, () => messageAction({ operation: 'delete', kind: 'chat', id: message.id }))
    ).resolves.toBeUndefined();
    // It did not even ask: a chat delete must not spend a round trip on a question about alerts.
    expect(controller.calls).toEqual([]);
  });

  it('answers the prompt for PRESENTERS only', async () => {
    controller.alertDelete = { required: true, ok: true };
    await expect(
      act(member, () => checkAlertDeletePassword({ candidate: 'hunter2' }))
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe('two credentials, two columns', () => {
  /*
    The property the whole shape rests on, and the reason `alert_delete_access_at` is its own column
    rather than a shared "credential cleared" flag: an owner who sets a notes password and an
    alert-delete password has said two things, and clearing one must not answer the other.
  */
  it('clearing the alert-delete password leaves the NOTES grant untouched', async () => {
    controller.alertDelete = { required: true, ok: true };
    await act(presenter, () => checkAlertDeletePassword({ candidate: 'hunter2' }));

    const row = db.select().from(sessions).where(eq(sessions.id, SESSION)).get();
    expect(row?.alertDeleteAccessAt).not.toBeNull();
    expect(row?.notesAccessAt ?? null).toBeNull();
  });

  it('a notes grant does NOT open the alert-delete door', async () => {
    controller.alertDelete = { required: true, ok: false };
    db.update(sessions).set({ notesAccessAt: new Date() }).where(eq(sessions.id, SESSION)).run();

    const alert = newAlert(presenter);
    await expect(
      act(presenter, () => messageAction({ operation: 'delete', kind: 'alert', id: alert.id }))
    ).rejects.toMatchObject({ status: 403 });
  });
});

/*
  ── THE CLIENT PROMPT ────────────────────────────────────────────────────────────────────────────

  Driven with a stub rather than a server, which is the shape every other `lib/room/` class is tested
  in. What is being pinned is the two-call sequence and the four outcomes, because a reader
  reconstructing it from the source alone would have to hold three files in two packages at once.
*/
const ITEM: MessageActionItem = {
  id: 7,
  body: 'an alert',
  senderId: 3,
  senderName: 'Trendy Jon',
  senderEmailHash: 'hash',
  senderAvatarUrl: ''
} as MessageActionItem;

function harness(options: {
  role?: string;
  answers?: { required: boolean; ok: boolean }[];
  throws?: boolean;
}) {
  const dialogs = new RoomDialogs();
  const deleted: string[] = [];
  const candidates: string[] = [];
  const answers = options.answers ?? [{ required: false, ok: true }];
  let call = 0;

  const deletion = new RoomMessageDeletion({
    dialogs,
    session: () => ({ user: { role: options.role ?? 'staff' } }),
    runDelete: (kind) => (deleted.push(kind), Promise.resolve(true)),
    deleteQuestion: () => (deleted.push('question'), Promise.resolve()),
    patchEvidence: () => {},
    onChanged: () => Promise.resolve(),
    checkAlertDeletePassword: ({ candidate }) => {
      candidates.push(candidate);
      if (options.throws) return Promise.reject(new Error('unreachable'));
      return Promise.resolve(answers[Math.min(call++, answers.length - 1)]);
    }
  });

  return { deletion, dialogs, deleted, candidates };
}

/** Answer the confirmation the way a presenter clicking OK does. */
const confirm = (dialogs: RoomDialogs) => dialogs.confirmation?.onconfirm();

describe('the prompt reproduces the capture', () => {
  it('never prompts when the room has no alert-delete password', async () => {
    const { deletion, dialogs, deleted, candidates } = harness({});
    deletion.request('alert', ITEM, undefined, 'log');
    confirm(dialogs);
    await vi.waitFor(() => expect(deleted).toEqual(['alert']));
    // One call, with the empty candidate — the reference's own `deleteAlertPW ? … : send` branch.
    expect(candidates).toEqual(['']);
    expect(dialogs.prompt).toBeNull();
  });

  it('raises the capture’s exact title when a password IS configured', async () => {
    const { deletion, dialogs, deleted } = harness({
      answers: [{ required: true, ok: false }]
    });
    deletion.request('alert', ITEM, undefined, 'log');
    confirm(dialogs);
    await vi.waitFor(() =>
      expect(dialogs.prompt?.title).toBe('Please enter the password to delete this alert:')
    );
    expect(deleted).toEqual([]);
  });

  it('sends on the right password and says "Wrong password!" on the wrong one', async () => {
    const right = harness({
      answers: [
        { required: true, ok: false },
        { required: true, ok: true }
      ]
    });
    right.deletion.request('alert', ITEM, undefined, 'log');
    confirm(right.dialogs);
    await vi.waitFor(() => expect(right.dialogs.prompt).not.toBeNull());
    right.dialogs.prompt?.onconfirm('hunter2');
    await vi.waitFor(() => expect(right.deleted).toEqual(['alert']));
    expect(right.candidates).toEqual(['', 'hunter2']);

    const wrong = harness({ answers: [{ required: true, ok: false }] });
    wrong.deletion.request('alert', ITEM, undefined, 'log');
    confirm(wrong.dialogs);
    await vi.waitFor(() => expect(wrong.dialogs.prompt).not.toBeNull());
    wrong.dialogs.prompt?.onconfirm('nope');
    await vi.waitFor(() => expect(wrong.dialogs.alert).toBe('Wrong password!'));
    expect(wrong.deleted).toEqual([]);
  });

  it('says something OTHER than "Wrong password!" when the controller cannot be reached', async () => {
    const { deletion, dialogs, deleted } = harness({ throws: true });
    deletion.request('alert', ITEM, undefined, 'log');
    confirm(dialogs);
    await vi.waitFor(() => expect(dialogs.alert).not.toBeNull());
    expect(dialogs.alert).not.toBe('Wrong password!');
    expect(deleted).toEqual([]);
  });

  it('a dismissed prompt deletes nothing and says nothing', async () => {
    const { deletion, dialogs, deleted } = harness({ answers: [{ required: true, ok: false }] });
    deletion.request('alert', ITEM, undefined, 'log');
    confirm(dialogs);
    await vi.waitFor(() => expect(dialogs.prompt).not.toBeNull());
    dialogs.prompt?.onconfirm('   ');
    expect(deleted).toEqual([]);
    expect(dialogs.alert).toBeNull();
  });

  it('SHIFT skips the confirmation and NEVER the password', async () => {
    const { deletion, dialogs, deleted } = harness({ answers: [{ required: true, ok: false }] });
    /*
      A cast rather than a `new MouseEvent`, because this file runs in the NODE environment and
      there is no DOM constructor here. `request` reads exactly one property of the event —
      `event?.shiftKey` — so a stand-in with that property exercises the same branch; constructing a
      real event would only be proving jsdom works.
    */
    deletion.request('alert', ITEM, { shiftKey: true } as unknown as MouseEvent, 'log');
    // No confirmation was raised…
    expect(dialogs.confirmation).toBeNull();
    // …and the password still is.
    await vi.waitFor(() => expect(dialogs.prompt).not.toBeNull());
    expect(deleted).toEqual([]);
  });

  it('does not prompt for chat, for a member, or in the Q&A thread', async () => {
    const chat = harness({ answers: [{ required: true, ok: false }] });
    chat.deletion.request('chat', ITEM, undefined, 'log');
    confirm(chat.dialogs);
    await vi.waitFor(() => expect(chat.deleted).toEqual(['chat']));
    expect(chat.candidates).toEqual([]);

    const asMember = harness({ role: 'member', answers: [{ required: true, ok: false }] });
    asMember.deletion.request('alert', ITEM, undefined, 'log');
    confirm(asMember.dialogs);
    await vi.waitFor(() => expect(asMember.deleted).toEqual(['alert']));
    expect(asMember.candidates).toEqual([]);

    /*
      A Q&A entry is a row in `alert_questions`, deleted through `deleteQuestion` and never through
      `messageAction`, so the server does not gate it either. Prompting here would be this room
      inventing a rule.
    */
    const thread = harness({ answers: [{ required: true, ok: false }] });
    thread.deletion.request('alert', ITEM, undefined, 'qa');
    confirm(thread.dialogs);
    await vi.waitFor(() => expect(thread.deleted).toEqual(['question']));
    expect(thread.candidates).toEqual([]);
  });
});

/*
  ── THE CREDENTIAL STAYS ON THE CONTROLLER ───────────────────────────────────────────────────────

  Read with comments STRIPPED, through `codeOf`. A raw-text scan would be satisfied by prose — the
  transcription at the head of this very file names the setting four times — which is the exact
  false-negative `source-comments.ts` exists for.
*/
const roomSource = (path: string) =>
  codeOf(path, readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));

describe('the credential never crosses into the room', () => {
  const REACHABLE = [
    'lib/room/message-delete.ts',
    'lib/room/message-actions.svelte.ts',
    'lib/room/message-actions-port.ts',
    'routes/alert-delete-auth.remote.ts',
    'routes/message-actions.remote.ts',
    'lib/server/alert-delete-access.ts'
  ];

  it.each(REACHABLE)('%s does not name deleteAlertPW in code', (path) => {
    expect(roomSource(path)).not.toContain('deleteAlertPW');
  });

  it('the room asks a QUESTION and is answered with two booleans', () => {
    const client = roomSource('lib/server/room-config-client.ts');
    // Positive first: without this the negative below passes against a file that lost the function.
    expect(client).toContain('export async function checkAlertDeletePasswordRemotely(');
    expect(client).toContain('JSON.stringify({ candidate })');
    expect(client).toContain('return { required: decision.required, ok: decision.ok };');
    expect(client).not.toContain('deleteAlertPW');
  });

  it('the door is a SECOND route, so no credential NAME is ever on the wire', () => {
    const plane = roomSource('lib/server/control-plane.ts');
    expect(plane).toContain('/internal/room-alert-delete-auth/');
    expect(plane).toContain('/internal/room-notes-auth/');
    /*
      The oracle this shape refuses: one endpoint taking a credential name would let any holder of a
      `config-read` token walk all seven credential-shaped settings a guess at a time. Two URLs,
      neither parameterised by a setting.
      `room-credential-prompt.ts` on the controller carries the argument in full.
    */
    expect(plane).not.toMatch(/credential.*\$\{/);
  });
});

describe('the gate is where the delete is, and the grant is where the answer is', () => {
  it('every alert delete by a presenter goes through requireAlertDeleteAccess', () => {
    const remote = roomSource('routes/message-actions.remote.ts');
    expect(remote).toContain(
      "if (isPresenter && kind === 'alert') {\n      await requireAlertDeleteAccess(room, requireSessionId(locals));"
    );
    // Ahead of the three branches, so a NEGATIVE id cannot walk around it.
    expect(remote.indexOf('requireAlertDeleteAccess')).toBeLessThan(
      remote.indexOf('insert(hiddenRoomItems)')
    );
  });

  it('the grant is written only on ok, and only from the session the server owns', () => {
    const command = roomSource('routes/alert-delete-auth.remote.ts');
    expect(command).toContain('const room = presenterRoom();');
    expect(command).toContain(
      'if (decision.ok) grantAlertDeleteAccess(requireSessionId(getRequestEvent().locals));'
    );
    // Nothing the caller sends may name a room, a session or an alert.
    expect(command).toContain('z.strictObject({ candidate: z.string().max(512) })');
  });
});
