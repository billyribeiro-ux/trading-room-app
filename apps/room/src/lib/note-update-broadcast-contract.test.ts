import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { codeOf } from './source-comments';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { notes, users, type User } from '#lib/server/db/schema.js';
import { callRemote } from '#lib/server/remote-command-harness.js';
import { subscribeToRoom, type RoomEvent } from '#lib/server/room-events.js';

const { newSessionNoteTab } = await import('../routes/session-notes.remote');

/**
 * USM-11 — the Note Update Popup, and the broadcast it needed underneath it.
 *
 * ## The row named the popup; the defect was one level down
 *
 * `saveSessionNote` in `+page.server.ts` wrote its row and **published nothing**. Every other
 * viewer's Notes pane kept the previous text until they happened to reload, so a presenter editing
 * the room's notes during a session was invisible to the room — which is the entire point of the
 * pane. The audit row asks for a checkbox; the checkbox could not exist without the frame.
 *
 * ```js
 * case "updatedSessionNote":
 *   for (let se = 0; se < this.globals.sessionNotes.length; se++) {
 *     let _e = this.globals.sessionNotes[se];
 *     _e._id == i.tab._id && (this.globals.sessionNotes[se].noteContent = i.tab.noteContent,
 *       this.appEventBus.emit("noteTabUpdated", { id: _e._id, name: _e.name })) }
 *   break;                                                            // bundle byte 1,022,762
 *
 * subscribe("noteTabUpdated", e => { …
 *   preferences.noteUpdatePopup && this.alertsService.info(`Note "${e.name}" updated`) })
 *                                                                     // bundle byte 1,962,777
 * ```
 *
 * The frame name is the reference's own. `message-mutation-frames.ts` states the rule this obeys:
 * *"Adding a fifth means finding it in the bundle first — an invented frame name is the
 * `alertDisplayMode` defect wearing a wire format."*
 */

const read = (path: string) => readFileSync(path, 'utf8');
/*
  The `server()` reader is gone with the three assertions that used it: `saveSessionNote` left
  `+page.server.ts` for `session-notes.remote.ts` on 2026-08-30, and those three were rewritten to
  EXECUTE rather than re-pointed at the new file. See the note above the replacement below.
*/
/*
  The handler left `events.svelte.ts` for `note-update-notice.ts` in the same commit that added it:
  the dispatcher went over its ceiling, ceilings only go down, and the reasoning belongs beside the
  behaviour rather than inside a switch. The assertions are unchanged; only where they read.
*/
const notice = () =>
  codeOf('src/lib/room/note-update-notice.ts', read('src/lib/room/note-update-notice.ts'));
const events = () => codeOf('src/lib/room/events.svelte.ts', read('src/lib/room/events.svelte.ts'));
const modal = () =>
  codeOf('src/lib/components/ModalHost.svelte', read('src/lib/components/ModalHost.svelte'));
const prefs = () => codeOf('src/lib/room/prefs.svelte.ts', read('src/lib/room/prefs.svelte.ts'));

/** The rest of the file from `opening`, with the position asserted — never a bare `indexOf`. */
const after = (source: string, opening: string) => {
  const from = source.indexOf(opening);
  expect(from, `\`${opening}\` is not in the source`).toBeGreaterThan(-1);
  return source.slice(from);
};

/*
  REWRITTEN, not re-pointed, when `saveSessionNote` became a remote command on 2026-08-30.

  These three read `+page.server.ts` for the text of the publish. Re-pointing them at
  `session-notes.remote.ts` would have been one character of work and would have proven strictly
  less than they did before, because a text assertion about a frame cannot tell a live publish from
  a dead one — which is the exact failure `poll-actions-contract.test.ts` records, where
  `gotPollAnswer` sat after a `return` for weeks with a comment above it explaining what it did.

  So they execute instead. `callRemote` establishes the request store the command's wrapper reads,
  `subscribeToRoom` is a real listener on the room, and what is asserted is the frame that actually
  arrived. The three properties are unchanged: it publishes on a save, it carries the id and the
  NAME and not the content, and it does not publish at all when the save was refused.
*/
const { saveSessionNote } = await import('../routes/session-notes.remote');

/** The room the frame must reach, and the one the notes are written in. */
const ROOM = '3625';

function account(email: string, role: string): User {
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return existing;
  return db
    .insert(users)
    .values({
      displayName: `note broadcast ${role}`,
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
  presenter = account('note-broadcast-presenter@example.test', 'staff');
});

beforeEach(() => {
  db.delete(notes).run();
});

const as = <T>(run: () => T | Promise<T>) =>
  callRemote(
    { user: presenter, sessionId: 'note-update-broadcast', roomShortCode: ROOM } as App.Locals,
    run
  );

/** Everything that reached the room while `run` was in flight. */
async function framesDuring(run: () => Promise<unknown>): Promise<RoomEvent[]> {
  const frames: RoomEvent[] = [];
  const unsubscribe = subscribeToRoom(ROOM, (event) => frames.push(event));
  try {
    await run();
  } finally {
    unsubscribe();
  }
  return frames;
}

describe('the broadcast that did not exist', () => {
  it('publishes on a successful save', async () => {
    const note = await as(() => newSessionNoteTab({ name: 'Trading plan' }));

    const frames = await framesDuring(() =>
      as(() => saveSessionNote({ noteId: note.id, contentHtml: '<p>hello</p>' }))
    );

    expect(
      frames,
      'a presenter saved a note and no frame reached the room — every other viewer is stale'
    ).toContainEqual({
      channel: 'cmds',
      data: {
        cmd: 'updatedSessionNote',
        noteId: note.id,
        noteName: 'Trading plan',
        actorUserId: presenter.id
      }
    });
  });

  it('sends the id and the NAME, and not the content', async () => {
    /*
      `invalidateAll()` re-reads the row, which is the authority — the argument the four
      message-mutation frames already make. And this stream is per ROOM: a frame carrying note text
      would put it on every subscriber's wire, which is the second reason that module gives for
      trigger-only frames. A tab NAME is already drawn for anyone who can see the pane.

      Asserted on the frame that ARRIVED rather than on the source, so a future edit that starts
      attaching the body is caught even if it spells the field something this test has never heard
      of: the key set is pinned, not a list of forbidden names.
    */
    const note = await as(() => newSessionNoteTab({ name: 'Trading plan' }));
    const body = '<p>a paragraph nobody else should receive</p>';

    const frames = await framesDuring(() =>
      as(() => saveSessionNote({ noteId: note.id, contentHtml: body }))
    );

    const frame = frames.find(
      (event) => (event.data as { cmd?: string }).cmd === 'updatedSessionNote'
    );
    expect(frame, 'the frame is missing').toBeDefined();
    expect(Object.keys(frame!.data as object).sort()).toEqual([
      'actorUserId',
      'cmd',
      'noteId',
      'noteName'
    ]);
    expect(JSON.stringify(frame)).not.toContain('a paragraph nobody else should receive');
  });

  it('publishes only after the save is known to have worked', async () => {
    /*
      The order `close-message.ts` argues for at length: announcing a change that was refused tells
      the room something untrue. As an action this was a `return fail(404)` ABOVE the publish and
      the test read the two offsets; as a command it is `error(404, …)`, which THROWS — so the
      property is now proven by the absence of a frame rather than by the order of two lines, and it
      would survive somebody moving the publish above the check only by going red.
    */
    const frames = await framesDuring(async () => {
      await expect(
        as(() => saveSessionNote({ noteId: 999999, contentHtml: '<p>x</p>' }))
      ).rejects.toMatchObject({ status: 404 });
    });

    expect(frames, 'a save that was refused announced itself to the room').toEqual([]);
  });
});

describe('USM-11 — the popup, and who does NOT get it', () => {
  it('skips the browser that saved', () => {
    expect(notice()).toContain('if (frame.actorUserId === deps.viewerId) return;');
    /* …and the dispatcher hands it the viewer's own id rather than something off the wire. */
    expect(after(events(), "command?.cmd === 'updatedSessionNote'")).toContain(
      'viewerId: this.#session().user.id'
    );
  });

  it('refetches, then raises the toast behind the preference', () => {
    const handler = notice();
    const refetch = handler.indexOf('deps.refetch();');
    const toast = handler.indexOf('if (!deps.popupEnabled');
    expect(refetch, 'the refetch is missing').toBeGreaterThan(-1);
    expect(toast, 'the preference gate is missing').toBeGreaterThan(refetch);
    expect(handler).toContain('message: `Note "${frame.noteName}" updated`');
    /* The dispatcher supplies both, from the room's own state. */
    const wiring = after(events(), "command?.cmd === 'updatedSessionNote'");
    expect(wiring).toContain('popupEnabled: this.#prefs.noteUpdatePopup');
    expect(wiring).toContain('refetch: () => void invalidateAll()');
  });

  it('does NOT clear the other toasts, which the reference does', () => {
    /*
      `this.alertsService.clear()` sits in upstream's handler and is deliberately not reproduced: it
      wipes every toast on screen, and one of the things on screen may be the media-outage banner
      that `RoomToasts` deliberately gives `timeOut: 0`. A note being edited must not dismiss it.
      `RoomToasts` already de-duplicates, which is what that call was there for.
    */
    const handler = notice();
    expect(handler).not.toContain('dismissAll');
    expect(handler).not.toContain('.clear()');
  });

  it('has a preference, defaulting on as the reference does', () => {
    expect(prefs()).toContain('loadedSettings.noteUpdatePopup !== false');
    expect(prefs()).toContain("if (key === 'noteUpdatePopup') this.#noteUpdatePopup = value;");
  });
});

describe('USM-11 — the control', () => {
  it('renders with the reference s id and the on/off pair', () => {
    const source = modal();
    expect(source).toContain('id="note-update-popup"');
    expect(source).toContain("{settingChecks['note-update-popup'] ? 'on' : 'off'}");
  });

  it('is mapped, which is this file s declaration that it has a consumer', () => {
    expect(modal()).toContain("'note-update-popup': 'noteUpdatePopup'");
  });

  it('is NOT gated on the join beep, which upstream gates it on', () => {
    /*
      `z("ngIf", sessData.beepOnUserJoin)` at byte 2,285,196 renders this control under the JOIN-BEEP
      room setting, which has nothing to do with session notes: nothing else in that block shares
      the gate and no handler reads the two together. Reproducing it would mean an owner who
      switches off the join beep silently loses control of note popups. Refused, and the offset is
      recorded at the code.
    */
    const source = modal();
    const at = source.indexOf('id="note-update-popup"');
    expect(at, 'the control is missing').toBeGreaterThan(-1);
    const around = source.slice(Math.max(0, at - 1200), at);
    expect(around).not.toContain('beepOnUserJoin');
    /* And the refusal is recorded where the behaviour lives, not only absent from the markup. */
    expect(read('src/lib/room/note-update-notice.ts')).toContain('byte 2,285,196');
  });
});
