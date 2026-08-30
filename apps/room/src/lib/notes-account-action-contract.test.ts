import { signedOutDestination } from '#lib/server/control-plane.js';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { notes, sessions, userSettings, users, type User } from '#lib/server/db/schema.js';
import { actions as logoutActions } from '../routes/logout/+page.server';
import { callRemote, expectSchemaRefusal } from '#lib/server/remote-command-harness.js';

/*
  Characterization tests for the last nine actions: the six session-note commands, plus
  editUsername, saveTheme and logout — the last of which is now the `/logout` route's `default`
  rather than a `logout` action on the room page. See the note above `ActionArgs`.

  Lower risk than the content actions - the notes six are thin wrappers over
  `notes-repository.ts`, which `notes-repository.test.ts` already covers - so what these pin is
  the WRAPPER: the role gate, the zod rejection, and the null-to-404 translation. The cutover
  replaces the wrapper and keeps none of the repository, so the wrapper is the part at risk.

  `editUsername` gets the most attention here despite being 29 lines, because its guard was
  a live defect once and the shape of that defect is invisible: a condition that never fires
  looks exactly like one that works.
*/

/*
  THE LAST FORM ACTION IN THIS FILE'S SUBJECT, and it moved on 2026-08-30 — re-pointed rather than
  deleted, which is this repository's rule about migrating a test with the code it covers.

  `+page.server.ts` had exported a `logout` action that NOTHING could invoke: `routes/logout/
  +page.svelte` posts a form with no `action` attribute, so it reaches its own route's `default`,
  whose body was byte-identical. Two implementations, one unreachable. The dead one was deleted, and
  this test now exercises the one a browser actually runs — so its coverage went up rather than
  across.
*/
type ActionArgs = Parameters<(typeof logoutActions)['default']>[0];

function account(email: string, role: string): User {
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return existing;
  return db
    .insert(users)
    .values({
      displayName: `notes contract ${role}`,
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
  presenter = account('notes-presenter@example.test', 'staff');
  member = account('notes-member@example.test', 'member');
});

beforeEach(() => {
  db.delete(notes).run();
});

/*
  REWRITTEN, not re-pointed, when the six became remote commands on 2026-08-30.

  Every assertion below still EXECUTES against the live database — `callRemote` establishes the
  request store a command's wrapper reads, and `remote-command-harness.ts` records which fields Kit
  needs and where each was read from. Turning these into `toContain` checks over
  `session-notes.remote.ts` would have traded proof for string matching, which is the downgrade this
  repository has been bitten by four times.

  Four shapes changed, and each is the conversion rather than a weakening:

    - a refusal REJECTS instead of returning `fail()`, so `toMatchObject({ status })` became
      `rejects.toMatchObject({ status })`. The MESSAGE is asserted too, which it was not before: the
      six gates carry six different sentences and *"pinned as a set"* was only ever pinning the
      status they share;
    - success returns the NOTE rather than `{ success: true, note }`, because `success: true` was a
      form action's way of saying "this is not an `ActionFailure`" and a command has no such union;
    - arguments are TYPED, so the "non-numeric id" case has to reach around the compiler to prove
      the runtime still refuses it. That the compiler refuses it first is the improvement, and the
      cast is how the test says so;
    - a schema refusal is a `ValidationError` carrying `issues`, not a 400 — `expectSchemaRefusal`
      is the one place that knows it.
*/
const {
  deleteSessionNoteTab,
  newSessionNoteTab,
  renameSessionNoteTab,
  restoreNoteVersion,
  saveSessionNote,
  setWelcomeMatNoteTab
} = await import('../routes/session-notes.remote');

/** Notes are per room — every command resolves the room from the SESSION, never from an argument. */
const ROOM = '3625';

const as = <T>(user: User, run: () => T | Promise<T>) =>
  callRemote({ user, sessionId: 'notes-account-contract', roomShortCode: ROOM } as App.Locals, run);

async function newNote(name: string) {
  return as(presenter, () => newSessionNoteTab({ name }));
}

describe('the six session-note commands', () => {
  /*
    The role gate is repeated in all six with a DIFFERENT message each time.

    Pinned as a set rather than one at a time: the cutover replaces six wrappers with calls to
    the same API, and the easy mistake is to keep one gate and drop the other five - which is
    invisible until a member opens the notes pane.

    The SENTENCES are pinned as well as the status, and that is new. Six gates carrying six
    messages is a decision — they are the reference's own phrasing — and a conversion that routed
    all six through `presenterRoom()` would have collapsed them to *"Presenters only."* while every
    assertion here stayed green. `notesRoom(verb)` exists because of this test.
  */
  it('refuses a member from every one of them, each with its own message', async () => {
    const attempts: [string, string, Promise<unknown>][] = [
      [
        'newSessionNoteTab',
        'You cannot create session notes.',
        as(member, () => newSessionNoteTab({ name: 'mine' }))
      ],
      [
        'saveSessionNote',
        'You cannot edit session notes.',
        as(member, () => saveSessionNote({ noteId: 1, contentHtml: 'x' }))
      ],
      [
        'renameSessionNoteTab',
        'You cannot rename session notes.',
        as(member, () => renameSessionNoteTab({ noteId: 1, newName: 'x' }))
      ],
      [
        'deleteSessionNoteTab',
        'You cannot delete session notes.',
        as(member, () => deleteSessionNoteTab({ noteId: 1 }))
      ],
      [
        'restoreNoteVersion',
        'You cannot restore session notes.',
        as(member, () => restoreNoteVersion({ noteId: 1, versionId: 1 }))
      ],
      [
        'setWelcomeMatNoteTab',
        'You cannot change the welcome mat.',
        as(member, () => setWelcomeMatNoteTab({ noteId: 1, allRooms: false, pw: '' }))
      ]
    ];

    for (const [name, message, pending] of attempts) {
      await expect(pending, `${name} must refuse a member`).rejects.toMatchObject({
        status: 403,
        body: { message }
      });
    }
    // The statuses alone would pass with a row already written. This is the half that matters.
    expect(db.select().from(notes).all()).toHaveLength(0);
  });

  it('creates, renames, saves and deletes a note for a presenter', async () => {
    const created = await newNote('Trading plan');
    expect(created.name).toBe('Trading plan');

    const renamed = await as(presenter, () =>
      renameSessionNoteTab({ noteId: created.id, newName: 'Plan B' })
    );
    expect(renamed.name).toBe('Plan B');

    const saved = await as(presenter, () =>
      saveSessionNote({ noteId: created.id, contentHtml: '<p>hello</p>' })
    );
    expect(saved.id).toBe(created.id);

    await as(presenter, () => deleteSessionNoteTab({ noteId: created.id }));

    // Soft delete: the row stays, `deletedAt` is set. Version history has to survive a delete.
    const row = db.select().from(notes).where(eq(notes.id, created.id)).get();
    expect(row?.deletedAt).not.toBeNull();
  });

  /*
    The repository returns null for "not found"; the command turns that into 404.

    That translation is the whole job of these wrappers, and it is the thing a rewrite drops -
    an API call that 404s already would be returned as a 500 or, worse, as success.
  */
  it('turns a missing note into a 404 rather than a crash or a success', async () => {
    const missing = 999999;
    await expect(
      as(presenter, () => saveSessionNote({ noteId: missing, contentHtml: 'x' }))
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      as(presenter, () => renameSessionNoteTab({ noteId: missing, newName: 'x' }))
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      as(presenter, () => deleteSessionNoteTab({ noteId: missing }))
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      as(presenter, () => setWelcomeMatNoteTab({ noteId: missing, allRooms: false, pw: '' }))
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      as(presenter, () => restoreNoteVersion({ noteId: missing, versionId: 1 }))
    ).rejects.toMatchObject({ status: 404 });
  });

  it('rejects input the schema refuses, before touching the repository', async () => {
    await expectSchemaRefusal(
      as(presenter, () => newSessionNoteTab({ name: '' })),
      'empty name'
    );
    /*
      `'abc'` reached the old action as text and became `NaN` through `Number(formData.get(…))`.
      There is no coercion step now, so the compiler refuses it first — which is the improvement —
      and the cast is how this test proves the RUNTIME refuses it too.
    */
    await expectSchemaRefusal(
      as(presenter, () =>
        saveSessionNote({ noteId: 'abc', contentHtml: 'x' } as unknown as {
          noteId: number;
          contentHtml: string;
        })
      ),
      'noteId=abc'
    );
    /* Tighter than `Number.isInteger`, which admitted both and matched no row. */
    for (const bad of [0, -1]) {
      await expectSchemaRefusal(
        as(presenter, () => deleteSessionNoteTab({ noteId: bad })),
        `noteId=${bad}`
      );
    }
    expect(db.select().from(notes).all()).toHaveLength(0);
  });

  /*
    The welcome mat is EXCLUSIVE, and that is enforced in the repository's transaction: it clears
    the flag on every live note before setting it on the target. Nothing in the command says so.
  */
  it('moves the welcome mat rather than adding a second one', async () => {
    const first = await newNote('First');
    const second = await newNote('Second');

    await as(presenter, () => setWelcomeMatNoteTab({ noteId: first.id, allRooms: false, pw: '' }));
    await as(presenter, () => setWelcomeMatNoteTab({ noteId: second.id, allRooms: false, pw: '' }));

    const flagged = db
      .select()
      .from(notes)
      .all()
      .filter((row) => row.isWelcomeMat);
    expect(flagged.map((row) => row.id)).toEqual([second.id]);
  });

  /*
    THE ROOM PREDICATE, proven by a note the caller must not reach.

    A presenter of room A holds a real presenter session. The only thing between them and room B's
    notes is that every one of these commands takes the room from `locals` and hands it to the
    repository, whose own WHERE clause pairs it with the id. Take the room from an argument instead
    — which is what a `roomShortCode` on any of these payloads would be — and this is the test that
    goes red.
  */
  it('cannot rename, save or delete a note belonging to another room', async () => {
    const elsewhere = await callRemote(
      { user: presenter, sessionId: 'notes-account-contract', roomShortCode: '9140' } as App.Locals,
      () => newSessionNoteTab({ name: 'Theirs' })
    );

    await expect(
      as(presenter, () => renameSessionNoteTab({ noteId: elsewhere.id, newName: 'Mine now' }))
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      as(presenter, () => saveSessionNote({ noteId: elsewhere.id, contentHtml: '<p>x</p>' }))
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      as(presenter, () => deleteSessionNoteTab({ noteId: elsewhere.id }))
    ).rejects.toMatchObject({ status: 404 });

    const row = db.select().from(notes).where(eq(notes.id, elsewhere.id)).get();
    expect(row?.name).toBe('Theirs');
    expect(row?.deletedAt).toBeNull();
  });
});

/*
  REWRITTEN, not re-pointed, when `editUsername`, `saveTheme` and `savePreference` became remote
  commands. Every assertion below still EXECUTES against the live database; `callRemote` establishes
  the request store a command's wrapper reads, and `remote-command-harness.ts` records which fields
  Kit needs and where each was read from.

  Three shapes changed, and each is the conversion rather than a weakening:

    - a refusal REJECTS instead of returning `fail()`, so `toMatchObject({ status })` became
      `rejects.toMatchObject({ status })`;
    - success returns `undefined` rather than `{ success: true }`, so what proves a write is the ROW,
      which is what mattered all along;
    - arguments are TYPED, so the "non-numeric id" and "not JSON" cases have to reach around the
      compiler to prove the runtime still refuses them. That the compiler now refuses them first is
      the improvement; the cast is how the test says so.
*/
const { editUsername } = await import('../routes/username.remote');
const { savePreference, saveTheme } = await import('../routes/user-settings.remote');

const locals = (user: User) =>
  ({ user, sessionId: `acct-${user.id}`, roomShortCode: '3625' }) as App.Locals;

describe('editUsername', () => {
  it('lets anyone rename themselves', async () => {
    await expect(
      callRemote(locals(member), () => editUsername({ userId: member.id, username: ' Renamed ' }))
    ).resolves.toBeUndefined();

    // `.trim()` is the schema's now, not the handler's, and the stored value proves it still runs.
    expect(db.select().from(users).where(eq(users.id, member.id)).get()?.displayName).toBe(
      'Renamed'
    );
  });

  /*
    THE DEAD-GUARD DEFECT, pinned so it cannot come back.

    This guard once read `role === 'user' && id !== userId`. No row ever holds the role `'user'` -
    the schema default is `'staff'` and provisioning issues admin|staff|member|guest - so the
    condition never fired and ANY authenticated caller could rename ANY other account by id,
    an admin's included.

    A condition that never fires looks exactly like one that works. This asserts the positive
    form: you may rename yourself, and a presenter may rename anyone.
  */
  it('refuses a member renaming somebody else, and allows a presenter to', async () => {
    const target = account('notes-rename-target@example.test', 'admin');
    const originalName = target.displayName;

    await expect(
      callRemote(locals(member), () => editUsername({ userId: target.id, username: 'hijacked' }))
    ).rejects.toMatchObject({ status: 403, body: { message: 'You cannot edit this username.' } });
    // The status alone would pass with the row already renamed. This is the half that matters.
    expect(db.select().from(users).where(eq(users.id, target.id)).get()?.displayName).toBe(
      originalName
    );

    await expect(
      callRemote(locals(presenter), () =>
        editUsername({ userId: target.id, username: 'Renamed by staff' })
      )
    ).resolves.toBeUndefined();
  });

  it('refuses a bad id and an empty username, at the SCHEMA now', async () => {
    /*
      `Number.isInteger` let 0 and negatives through to match no row and report success;
      `z.number().int().positive()` refuses them. The non-numeric case is a compile error before it
      is a runtime one, which is why it is cast.
    */
    for (const userId of ['abc', 0, -1, 1.5]) {
      await expectSchemaRefusal(
        callRemote(locals(member), () =>
          editUsername({ userId, username: 'x' } as unknown as { userId: number; username: string })
        ),
        String(userId)
      );
    }
    await expectSchemaRefusal(
      callRemote(locals(member), () => editUsername({ userId: member.id, username: '   ' }))
    );
  });

  /*
    NOTE for the cutover: renaming an id that does not exist reports success.

    The update affects zero rows and the command does not check — unchanged by the conversion, and
    pinned so the conversion cannot be blamed for it later. The API's
    PUT /rooms/{id}/me/display-name renames the CALLER and cannot be pointed at another id at
    all, which removes the case rather than answering it - worth knowing before translating.
  */
  it('currently succeeds for a presenter renaming an id that does not exist', async () => {
    await expect(
      callRemote(locals(presenter), () => editUsername({ userId: 999999, username: 'ghost' }))
    ).resolves.toBeUndefined();
  });
});

describe('saveTheme', () => {
  beforeEach(() => {
    db.delete(userSettings).run();
    db.insert(userSettings)
      .values({
        userId: member.id,
        theme: 'light',
        roomLayout: 'left',
        chatTextSize: 16,
        updatedAt: new Date()
      })
      .run();
  });

  it('stores dark, and stores light', async () => {
    for (const theme of ['dark', 'light'] as const) {
      await callRemote(locals(member), () => saveTheme(theme));
      expect(
        db.select().from(userSettings).where(eq(userSettings.userId, member.id)).get()?.theme
      ).toBe(theme);
    }
  });

  it('REFUSES anything else, where it used to silently coerce to light', async () => {
    /*
      The behaviour change this conversion made, pinned in its new form. The action read
      `data.get('theme') === 'dark' ? 'dark' : 'light'`, so a typo'd theme reset the user to light
      and reported success. `z.enum(['light', 'dark'])` refuses it.

      The row is asserted unchanged as well: a 400 with the write already made would be the failure
      that matters, and the status alone would not catch it.
    */
    await callRemote(locals(member), () => saveTheme('dark'));
    for (const theme of ['solarized', '', 'DARK']) {
      await expectSchemaRefusal(
        callRemote(locals(member), () => saveTheme(theme as 'dark')),
        theme
      );
      expect(
        db.select().from(userSettings).where(eq(userSettings.userId, member.id)).get()?.theme
      ).toBe('dark');
    }
  });

  it('writes only the acting user\u2019s row', async () => {
    db.insert(userSettings)
      .values({
        userId: presenter.id,
        theme: 'light',
        roomLayout: 'left',
        chatTextSize: 16,
        updatedAt: new Date()
      })
      .run();

    await callRemote(locals(member), () => saveTheme('dark'));

    expect(
      db.select().from(userSettings).where(eq(userSettings.userId, presenter.id)).get()?.theme
    ).toBe('light');
  });
});

describe('logout', () => {
  /*
    Three things happen and all three matter. The session row is deleted server-side, so a copied
    cookie is dead rather than merely un-sent; `locals` is cleared because `handle()` already ran
    and will not run again before the redirect's load, so a stale user would otherwise survive the
    round trip; and the redirect is what the browser follows.
  */
  it('deletes the session, clears locals, and sends the user back to the controller', async () => {
    const sessionId = 'logout-contract-session';
    db.insert(sessions)
      .values({ id: sessionId, userId: member.id, createdAt: new Date(), lastSeenAt: new Date() })
      .run();

    const deleted: string[] = [];
    const locals = { user: member, sessionId } as App.Locals;
    const args = {
      cookies: {
        get: () => sessionId,
        delete: (name: string) => deleted.push(name)
      },
      locals
    } as unknown as ActionArgs;

    // `redirect()` throws; that IS the mechanism, so the assertion has to catch it.
    let thrown: unknown = null;
    try {
      await logoutActions.default(args);
    } catch (error) {
      thrown = error;
    }

    /*
      `/` rather than a login page, because the room no longer has one — the controller is the
      front door. With `CONTROL_BASE_URL` set this is the controller's account page; unset, it is
      `/`, which `hooks.server.ts` answers with a 403 naming where to go. Either way the signed-out
      browser is not left holding a route this application cannot serve.
    */
    expect(thrown).toMatchObject({ status: 303, location: signedOutDestination() });
    expect(db.select().from(sessions).where(eq(sessions.id, sessionId)).get()).toBeUndefined();
    expect(deleted).toContain('ptr_connection');
    expect(locals.user).toBeNull();
    expect(locals.sessionId).toBeUndefined();
  });
});

describe('savePreference', () => {
  beforeEach(() => {
    db.delete(userSettings).run();
    db.insert(userSettings)
      .values({
        userId: member.id,
        theme: 'light',
        roomLayout: 'left',
        chatTextSize: 16,
        updatedAt: new Date()
      })
      .run();
  });

  function stored() {
    const row = db.select().from(userSettings).where(eq(userSettings.userId, member.id)).get();
    return JSON.parse(row?.settingsJson ?? '{}') as Record<string, unknown>;
  }

  /*
    A read-modify-write over one JSON column, so the thing worth pinning is that writing one key
    does not erase the others. The API replaces this with PATCH /account/preferences, and a PATCH
    that replaces the document instead of merging is the exact bug this catches.
  */
  it('merges a key rather than replacing the document', async () => {
    await callRemote(locals(member), () => savePreference({ key: 'chatTextSize', value: 18 }));
    await callRemote(locals(member), () =>
      savePreference({ key: 'chatBgColor', value: '#e8e8e8' })
    );

    expect(stored()).toEqual({ chatTextSize: 18, chatBgColor: '#e8e8e8' });
  });

  it('overwrites a key it already holds, and preserves JSON types', async () => {
    /*
      The values are REAL values now. The action took a string and ran `JSON.parse`; devalue carries
      the boolean itself, so `'true'` vs `true` is no longer a thing a caller can get wrong.
    */
    await callRemote(locals(member), () => savePreference({ key: 'soundEnabled', value: true }));
    expect(stored().soundEnabled).toBe(true);

    await callRemote(locals(member), () => savePreference({ key: 'soundEnabled', value: false }));
    expect(stored().soundEnabled).toBe(false);

    // Not stringified: `false` must not become "false", or every truthiness check inverts.
    expect(typeof stored().soundEnabled).toBe('boolean');
  });

  it('stores the shapes this room actually saves', async () => {
    // Objects and arrays cross intact — `chatStyle` is an object and the split sizes are a pair.
    await callRemote(locals(member), () =>
      savePreference({ key: 'chatStyle', value: { bold: true, size: 14 } })
    );
    await callRemote(locals(member), () => savePreference({ key: 'chatSplit', value: [40, 60] }));
    await callRemote(locals(member), () => savePreference({ key: 'sessionOpen', value: null }));

    expect(stored()).toEqual({
      chatStyle: { bold: true, size: 14 },
      chatSplit: [40, 60],
      sessionOpen: null
    });
  });

  it('refuses an empty key, an over-long one, and a value JSON cannot hold', async () => {
    /*
      The empty key was `fail(400)`; it is `z.string().trim().min(1)` now. The 100-character bound
      is NEW — this blob is parsed and rewritten on every preference write, so an unbounded key is a
      cost every later write for that account pays.

      "Not JSON" changed meaning, and that is the point. The action received a STRING and could only
      fail when `JSON.parse` threw. `z.json()` refuses values JSON cannot represent at all — a
      function, a `Date`, `undefined` — which is a stronger check than the one it replaced, applied
      to the real value rather than to somebody's stringification of it.
    */
    await expectSchemaRefusal(
      callRemote(locals(member), () => savePreference({ key: '   ', value: 1 }))
    );
    await expectSchemaRefusal(
      callRemote(locals(member), () => savePreference({ key: 'k'.repeat(101), value: 1 }))
    );

    for (const value of [() => {}, new Date(0), undefined]) {
      await expectSchemaRefusal(
        callRemote(locals(member), () =>
          savePreference({ key: 'ok', value } as unknown as { key: string; value: null })
        ),
        String(value)
      );
    }

    expect(stored()).toEqual({});
  });

  /*
    A corrupt or non-object `settings_json` is recovered from, not thrown on.

    Both the parse and the shape check fall back to `{}`, so one bad write cannot lock a user out
    of changing any preference afterwards. Silent recovery is right here and wrong almost
    everywhere else, which is why it is pinned rather than assumed — and why the command now says
    so in a comment beside the `catch` instead of leaving it to look like the swallowed error this
    repository forbids.
  */
  it('recovers from a corrupt settings document instead of failing every later write', async () => {
    db.update(userSettings)
      .set({ settingsJson: '["not", "an", "object"]' })
      .where(eq(userSettings.userId, member.id))
      .run();

    await expect(
      callRemote(locals(member), () => savePreference({ key: 'chatTextSize', value: 14 }))
    ).resolves.toBeUndefined();
    expect(stored()).toEqual({ chatTextSize: 14 });
  });

  it('prunes the nineteen dead element-id keys on the way past', async () => {
    /*
      Executed rather than read. The prune is idempotent and converge-on-use, so what proves it is a
      blob that HELD one and no longer does after any unrelated write.

      `chat-always-scroll` is taken from `DEAD_PREFERENCE_KEYS` itself rather than invented — my
      first attempt used `chat-text-size`, which is not on that list, and the test failed for being
      wrong about its own fixture rather than about the code.
    */
    db.update(userSettings)
      .set({ settingsJson: JSON.stringify({ 'chat-always-scroll': true, keepMe: 1 }) })
      .where(eq(userSettings.userId, member.id))
      .run();

    await callRemote(locals(member), () => savePreference({ key: 'chatTextSize', value: 15 }));

    const after = stored();
    expect(after.keepMe, 'a real preference must survive the prune').toBe(1);
    expect(after.chatTextSize).toBe(15);
    expect(Object.keys(after)).not.toContain('chat-always-scroll');
  });
});
