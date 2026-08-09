import { signedOutDestination } from '$lib/server/control-plane';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, ensureDatabase } from '$lib/server/db';
import { notes, sessions, userSettings, users, type User } from '$lib/server/db/schema';
import { actions } from '../routes/+page.server';

/*
  Characterization tests for the last nine actions: the six session-note commands, plus
  editUsername, saveTheme and logout.

  Lower risk than the content actions - the notes six are thin wrappers over
  `notes-repository.ts`, which `notes-repository.test.ts` already covers - so what these pin is
  the WRAPPER: the role gate, the zod rejection, and the null-to-404 translation. The cutover
  replaces the wrapper and keeps none of the repository, so the wrapper is the part at risk.

  `editUsername` gets the most attention here despite being 29 lines, because its guard was
  a live defect once and the shape of that defect is invisible: a condition that never fires
  looks exactly like one that works.
*/

type ActionArgs = Parameters<(typeof actions)['saveSessionNote']>[0];

function event(user: User, fields: Record<string, string> = {}) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  return {
    request: new Request('http://localhost/', { method: 'POST', body }),
    // Notes are per room — the actions resolve `requireRoomShortCode(locals)`.
    locals: { user, sessionId: 'notes-account-contract', roomShortCode: '3625' }
  } as unknown as ActionArgs;
}

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

/** Every notes action returns `{success, note}`; this narrows it for the assertions. */
function note(result: unknown) {
  return (result as { note: { id: number; name: string; isWelcomeMat: boolean } }).note;
}

async function newNote(name: string) {
  return note(await actions.newSessionNoteTab(event(presenter, { name })));
}

describe('the six session-note commands', () => {
  /*
    The role gate is repeated in all six with a DIFFERENT message each time.

    Pinned as a set rather than one at a time: the cutover replaces six wrappers with calls to
    the same API, and the easy mistake is to keep one gate and drop the other five - which is
    invisible until a member opens the notes pane.
  */
  it('refuses a member from every one of them, each with its own message', async () => {
    // Wrapped in Promise.resolve: an action is typed MaybePromise, not Promise.
    const attempts: [string, Promise<unknown>][] = [
      [
        'newSessionNoteTab',
        Promise.resolve(actions.newSessionNoteTab(event(member, { name: 'mine' })))
      ],
      [
        'saveSessionNote',
        Promise.resolve(actions.saveSessionNote(event(member, { noteId: '1', contentHtml: 'x' })))
      ],
      [
        'renameSessionNoteTab',
        Promise.resolve(actions.renameSessionNoteTab(event(member, { noteId: '1', newName: 'x' })))
      ],
      [
        'deleteSessionNoteTab',
        Promise.resolve(actions.deleteSessionNoteTab(event(member, { noteId: '1' })))
      ],
      [
        'restoreNoteVersion',
        Promise.resolve(actions.restoreNoteVersion(event(member, { noteId: '1', versionId: '1' })))
      ],
      [
        'setWelcomeMatNoteTab',
        Promise.resolve(
          actions.setWelcomeMatNoteTab(event(member, { noteId: '1', allRooms: 'false' }))
        )
      ]
    ];

    for (const [name, pending] of attempts) {
      expect(await pending, `${name} must refuse a member`).toMatchObject({ status: 403 });
    }
  });

  it('creates, renames, saves and deletes a note for a presenter', async () => {
    const created = await newNote('Trading plan');
    expect(created.name).toBe('Trading plan');

    const renamed = note(
      await actions.renameSessionNoteTab(
        event(presenter, { noteId: String(created.id), newName: 'Plan B' })
      )
    );
    expect(renamed.name).toBe('Plan B');

    const saved = await actions.saveSessionNote(
      event(presenter, { noteId: String(created.id), contentHtml: '<p>hello</p>' })
    );
    expect(saved).toMatchObject({ success: true });

    const deleted = await actions.deleteSessionNoteTab(
      event(presenter, { noteId: String(created.id) })
    );
    expect(deleted).toMatchObject({ success: true });

    // Soft delete: the row stays, `deletedAt` is set. Version history has to survive a delete.
    const row = db.select().from(notes).where(eq(notes.id, created.id)).get();
    expect(row?.deletedAt).not.toBeNull();
  });

  /*
    The repository returns null for "not found"; the action turns that into 404.

    That translation is the whole job of these wrappers, and it is the thing a rewrite drops -
    an API call that 404s already would be returned as a 500 or, worse, as success.
  */
  it('turns a missing note into a 404 rather than a crash or a success', async () => {
    const missing = '999999';
    expect(
      await actions.saveSessionNote(event(presenter, { noteId: missing, contentHtml: 'x' }))
    ).toMatchObject({ status: 404 });
    expect(
      await actions.renameSessionNoteTab(event(presenter, { noteId: missing, newName: 'x' }))
    ).toMatchObject({ status: 404 });
    expect(await actions.deleteSessionNoteTab(event(presenter, { noteId: missing }))).toMatchObject(
      {
        status: 404
      }
    );
    expect(
      await actions.setWelcomeMatNoteTab(event(presenter, { noteId: missing, allRooms: 'false' }))
    ).toMatchObject({ status: 404 });
    expect(
      await actions.restoreNoteVersion(event(presenter, { noteId: missing, versionId: '1' }))
    ).toMatchObject({ status: 404 });
  });

  it('rejects input the schema refuses, before touching the repository', async () => {
    expect(await actions.newSessionNoteTab(event(presenter, { name: '' }))).toMatchObject({
      status: 400
    });
    expect(
      await actions.saveSessionNote(event(presenter, { noteId: 'abc', contentHtml: 'x' }))
    ).toMatchObject({ status: 400 });
    expect(db.select().from(notes).all()).toHaveLength(0);
  });

  /*
    The welcome mat is EXCLUSIVE, and that is enforced in the repository's transaction: it clears
    the flag on every live note before setting it on the target. Nothing in the action says so.
  */
  it('moves the welcome mat rather than adding a second one', async () => {
    const first = await newNote('First');
    const second = await newNote('Second');

    await actions.setWelcomeMatNoteTab(
      event(presenter, { noteId: String(first.id), allRooms: 'false' })
    );
    await actions.setWelcomeMatNoteTab(
      event(presenter, { noteId: String(second.id), allRooms: 'false' })
    );

    const flagged = db
      .select()
      .from(notes)
      .all()
      .filter((row) => row.isWelcomeMat);
    expect(flagged.map((row) => row.id)).toEqual([second.id]);
  });
});

describe('editUsername', () => {
  it('lets anyone rename themselves', async () => {
    expect(
      await actions.editUsername(
        event(member, { userId: String(member.id), username: ' Renamed ' })
      )
    ).toEqual({ success: true });

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

    expect(
      await actions.editUsername(event(member, { userId: String(target.id), username: 'hijacked' }))
    ).toMatchObject({ status: 403 });
    expect(db.select().from(users).where(eq(users.id, target.id)).get()?.displayName).toBe(
      originalName
    );

    expect(
      await actions.editUsername(
        event(presenter, { userId: String(target.id), username: 'Renamed by staff' })
      )
    ).toEqual({ success: true });
  });

  it('refuses a non-numeric id and an empty username', async () => {
    expect(
      await actions.editUsername(event(member, { userId: 'abc', username: 'x' }))
    ).toMatchObject({ status: 400 });
    expect(
      await actions.editUsername(event(member, { userId: String(member.id), username: '   ' }))
    ).toMatchObject({ status: 400 });
  });

  /*
    NOTE for the cutover: renaming an id that does not exist reports success.

    The update affects zero rows and the action does not check. The API's
    PUT /rooms/{id}/me/display-name renames the CALLER and cannot be pointed at another id at
    all, which removes the case rather than answering it - worth knowing before translating.
  */
  it('currently succeeds for a presenter renaming an id that does not exist', async () => {
    expect(
      await actions.editUsername(event(presenter, { userId: '999999', username: 'ghost' }))
    ).toEqual({ success: true });
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

  it('stores dark, and coerces everything else to light', async () => {
    await actions.saveTheme(event(member, { theme: 'dark' }));
    expect(
      db.select().from(userSettings).where(eq(userSettings.userId, member.id)).get()?.theme
    ).toBe('dark');

    // Anything that is not exactly "dark" is light - there is no validation and no 400. A
    // typo'd theme silently resets the user to light rather than being refused.
    for (const theme of ['light', 'solarized', '']) {
      await actions.saveTheme(event(member, { theme }));
      expect(
        db.select().from(userSettings).where(eq(userSettings.userId, member.id)).get()?.theme
      ).toBe('light');
    }
  });

  it('writes only the acting user’s row', async () => {
    db.insert(userSettings)
      .values({
        userId: presenter.id,
        theme: 'light',
        roomLayout: 'left',
        chatTextSize: 16,
        updatedAt: new Date()
      })
      .run();

    await actions.saveTheme(event(member, { theme: 'dark' }));

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
      await actions.logout(args);
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
    await actions.savePreference(event(member, { key: 'chatTextSize', value: '18' }));
    await actions.savePreference(event(member, { key: 'chatBgColor', value: '"#e8e8e8"' }));

    expect(stored()).toEqual({ chatTextSize: 18, chatBgColor: '#e8e8e8' });
  });

  it('overwrites a key it already holds, and preserves JSON types', async () => {
    await actions.savePreference(event(member, { key: 'soundEnabled', value: 'true' }));
    expect(stored().soundEnabled).toBe(true);

    await actions.savePreference(event(member, { key: 'soundEnabled', value: 'false' }));
    expect(stored().soundEnabled).toBe(false);

    // Not stringified: `false` must not become "false", or every truthiness check inverts.
    expect(typeof stored().soundEnabled).toBe('boolean');
  });

  it('refuses an empty key and a value that is not JSON', async () => {
    expect(await actions.savePreference(event(member, { key: '   ', value: '1' }))).toMatchObject({
      status: 400
    });
    expect(
      await actions.savePreference(event(member, { key: 'ok', value: 'not json' }))
    ).toMatchObject({ status: 400 });

    expect(stored()).toEqual({});
  });

  /*
    A corrupt or non-object `settings_json` is recovered from, not thrown on.

    Both the parse and the shape check fall back to `{}`, so one bad write cannot lock a user out
    of changing any preference afterwards. Silent recovery is right here and wrong almost
    everywhere else, which is why it is pinned rather than assumed.
  */
  it('recovers from a corrupt settings document instead of failing every later write', async () => {
    db.update(userSettings)
      .set({ settingsJson: '["not", "an", "object"]' })
      .where(eq(userSettings.userId, member.id))
      .run();

    expect(
      await actions.savePreference(event(member, { key: 'chatTextSize', value: '14' }))
    ).toEqual({ success: true });
    expect(stored()).toEqual({ chatTextSize: 14 });
  });
});
