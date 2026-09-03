import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';

import { db, ensureDatabase } from '#lib/server/db/index.js';
import { sessionHistory, users, type User } from '#lib/server/db/schema.js';
import { callRemote } from '#lib/server/remote-command-harness.js';
import {
  SESSION_HISTORY_LIMIT,
  readSessionHistory,
  recordSessionEvent
} from '#lib/server/session-history.js';

/**
 * The Session History pane — `SC-01`, and it was the emptiest kind of empty.
 *
 * ## What was there
 *
 * ```svelte
 * <div class="p-4 text-center">No session history.</div>
 * <div class="p-4 text-center">
 *   <button class="btn btn-primary"><i class="fas fa fa-sync"></i> Load History </button>
 * </div>
 * ```
 *
 * `No session history.` rendered unconditionally, and a button with **no `onclick` at all** — not a
 * handler that did nothing, no handler. There was no table, no query, and nothing recording an
 * event anywhere in the room.
 *
 * ## Evidence, and the one decision
 *
 * The WIRE and the ROW SHAPE are evidence. `fetchSessionHistory()` at byte 1,145,917 calls
 * `invokeServerCommand("getSessionHistory", {})` and assigns `rc.data`; `TDe` at byte 2,146,069
 * renders `eventName`, `created` through `date:'medium'`, and `eventValue`. Both branches and every
 * class string are decoded from `app-session-control-modal`'s own consts table.
 *
 * WHICH EVENTS is a decision. The reference's server is not in the capture, so what it logs cannot
 * be read out of anything held here — the same position `room_state.closed_message` was in. This
 * room records the acts it already has a presenter-gated, room-scoped command for, which is the
 * `room_state` test: a fact somebody arriving later has to be able to find.
 */

/*
  The pane left `ModalHost.svelte` on 2026-08-30 and this file followed it rather than being
  loosened: SC-17's gate and its evidence pushed that component over its ceiling, ceilings only go
  down, and `SessionHistoryPane.svelte` is what was sent out instead. Every assertion below is
  unchanged — only where they are read from moved.
*/
const MODAL = readFileSync(
  new URL('./components/SessionHistoryPane.svelte', import.meta.url),
  'utf8'
);
/* Comments stripped — the component quotes the markup it renders, and this file quotes the old one. */
const modalCode = MODAL.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<!--[\s\S]*?-->/g, ' ');

const ROOM = 'session-history-a';
const OTHER_ROOM = 'session-history-b';

const controller = { settings: {} as Record<string, unknown> };
/*
  `stateWrites` is the controller's `rooms.state` column standing in for itself.

  It is here rather than left as a bare `vi.fn()` because of what `openSession` and `closeSession`
  became on 2026-09-03: both now write the column `decideRoomEntry` refuses entry on BEFORE they
  record anything, so a history row saying "Session closed" is only as true as the write above it.
  Recording the calls lets the two cases below assert the row and the door together, which is the
  pairing the defect broke — the room told a presenter the session had closed for months while
  nothing anywhere could shut it.
*/
const stateWrites: Array<{ shortCode: string; email: string; state: string }> = [];
vi.mock('#lib/server/room-config-client.js', () => ({
  RoomConfigUnavailable: class RoomConfigUnavailable extends Error {},
  readRoomConfig: async (_request: unknown, shortCode: string) => ({
    room: { shortCode, name: shortCode, state: 'open', logoUrl: null, publicId: null, maxUsers: 0 },
    settings: controller.settings,
    locked: [],
    member: null
  }),
  writeRoomState: async (shortCode: string, email: string, state: string) => {
    stateWrites.push({ shortCode, email, state });
  }
}));

const { getSessionHistory } = await import('../routes/session-history.remote');
const { changeChatMode } = await import('../routes/chat-mode.remote');
const { softReset, hardReset, openSession, closeSession, saveCloseMessage } =
  await import('../routes/session-commands.remote');

function account(email: string, role: string): User {
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return existing;
  return db
    .insert(users)
    .values({
      displayName: `history ${role}`,
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

const as = <T>(user: User, room: string, run: () => T | Promise<T>) =>
  callRemote(
    { user, sessionId: 'session-history-contract', roomShortCode: room } as App.Locals,
    run
  );

beforeAll(() => {
  ensureDatabase();
  presenter = account('session-history-presenter@example.test', 'staff');
  member = account('session-history-member@example.test', 'member');
});

beforeEach(() => {
  db.delete(sessionHistory).run();
  controller.settings = {};
  stateWrites.length = 0;
});

describe('the log itself', () => {
  it('reads back newest first, scoped to one room', () => {
    recordSessionEvent(ROOM, 'First', 'one');
    recordSessionEvent(OTHER_ROOM, 'Elsewhere', 'not ours');
    recordSessionEvent(ROOM, 'Second', 'two');

    expect(readSessionHistory(ROOM).map((entry) => entry.eventName)).toEqual(['Second', 'First']);
    expect(readSessionHistory(OTHER_ROOM).map((entry) => entry.eventName)).toEqual(['Elsewhere']);
  });

  it('caps the read, dropping the OLDEST', () => {
    /*
      The reference has no cap — `pt(globals.sessionHistory)` renders whatever its server sent. This
      one exists because presenter acts accumulate for the life of a room; it drops the oldest
      because the pane is for "what just happened", and a cap that hid today to keep last month
      would be useless. Both halves are asserted, because only the pair says which end went.
    */
    for (let index = 0; index < SESSION_HISTORY_LIMIT + 5; index += 1) {
      recordSessionEvent(ROOM, `Event ${index}`, '');
    }
    const read = readSessionHistory(ROOM);
    expect(read).toHaveLength(SESSION_HISTORY_LIMIT);
    expect(read[0].eventName).toBe(`Event ${SESSION_HISTORY_LIMIT + 4}`);
    expect(read.at(-1)?.eventName).toBe('Event 5');
  });

  it('hands back epoch milliseconds, not a Date', () => {
    // A `Date` would not survive the remote function's serialisation unchanged; the pane formats it.
    recordSessionEvent(ROOM, 'Timed', '');
    expect(typeof readSessionHistory(ROOM)[0].created).toBe('number');
  });
});

describe('what gets recorded', () => {
  const names = () => readSessionHistory(ROOM).map((entry) => entry.eventName);
  const values = () => readSessionHistory(ROOM).map((entry) => entry.eventValue);

  it('a chat-mode change, by NAME and not by letter', async () => {
    await as(presenter, ROOM, () => changeChatMode('p'));
    expect(names()).toEqual(['Chat mode changed']);
    // `g` in a presenter's history says nothing — `CHAT_MODE_LABELS` is the one place the words live.
    expect(values()).toEqual(['Chat is now Webinar Mode.']);
  });

  it('the two resets, told apart in the VALUE', async () => {
    await as(presenter, ROOM, () => softReset());
    await as(presenter, ROOM, () => hardReset({ revoke: false }));
    expect(names()).toEqual(['Session reset', 'Session reset']);
    expect(values()[0]).toContain('Hard reset');
    expect(values()[1]).toContain('Soft reset');
  });

  it('and the two HARD resets are told apart too, which they were not', async () => {
    /*
      Added 2026-09-03 with the flag. *"Hard Reset"* and *"Hard Reset and Revoke Tokens"* are two
      menu entries over one upstream command distinguished only by `{revoke}` — and this room wrote
      a per-user preference with zero readers instead of sending it, so the two did the same thing
      and the history could not tell them apart either.

      Asserted on the VALUE rather than the name, because the name is the same act: a presenter
      reading their own history needs to know which of the two they pressed, and the row is the only
      record that survives the reload both of them trigger.
    */
    await as(presenter, ROOM, () => hardReset({ revoke: true }));
    expect(names()).toEqual(['Session reset']);
    expect(values()[0]).toContain('every session in this room revoked');
  });

  it('a session reopening, and the DOOR it opened', async () => {
    /*
      Both halves in one case, because separating them is how the defect lived: `openSession`
      published a reload prompt and recorded a row, and the column a returning member is refused on
      stayed exactly where it was. A row that says "Session opened" over a room that is still shut is
      worse than no row.
    */
    await as(presenter, ROOM, () => openSession());
    expect(names()).toEqual(['Session opened']);
    expect(stateWrites).toEqual([{ shortCode: ROOM, email: presenter.email, state: 'open' }]);
  });

  it('a session closing, and the DOOR it shut', async () => {
    /*
      The larger half. "Save Message and Close Session" wrote `savePreference('sessionOpen', false)`
      — a key with zero readers — and told the presenter the message was saved. This asserts the act
      the button now performs: `rooms.state` moves to `closed`, in this presenter's own room.
    */
    await as(presenter, ROOM, () => closeSession());
    expect(names()).toEqual(['Session closed']);
    expect(stateWrites).toEqual([{ shortCode: ROOM, email: presenter.email, state: 'closed' }]);
  });

  it('a close message saved AND cleared, without copying the text', async () => {
    /*
      Empty is how a presenter clears it, so the value says WHICH of the two happened. The message
      itself is deliberately not copied: it is presenter-authored text of up to 2000 characters and
      the pane renders `eventValue` inline.
    */
    await as(presenter, ROOM, () => saveCloseMessage({ message: 'Back at 9. Secret plan: none.' }));
    await as(presenter, ROOM, () => saveCloseMessage({ message: '' }));

    expect(names()).toEqual(['Close message saved', 'Close message saved']);
    expect(values()[0]).toBe('The close message was cleared.');
    expect(values()[1]).toBe('The room now has a close message.');
    expect(
      readSessionHistory(ROOM)
        .map((entry) => entry.eventValue)
        .join(' ')
    ).not.toContain('Secret plan');
  });

  it('nothing at all when the act was REFUSED', async () => {
    /*
      The half that matters as much as the recording: a member's rejected command must not leave a
      row claiming it happened. Every one of these is presenter-gated on the server, and the record
      is written after the act rather than before it.
    */
    await expect(as(member, ROOM, () => changeChatMode('d'))).rejects.toMatchObject({
      status: 403
    });
    await expect(as(member, ROOM, () => softReset())).rejects.toMatchObject({ status: 403 });
    await expect(as(member, ROOM, () => openSession())).rejects.toMatchObject({ status: 403 });
    /*
      `closeSession` is the one worth naming twice: a member who could reach it could shut the room
      on everybody. Its refusal must leave BOTH the log and the door untouched, so the state writes
      are asserted empty beside the history.
    */
    await expect(as(member, ROOM, () => closeSession())).rejects.toMatchObject({ status: 403 });
    expect(readSessionHistory(ROOM)).toEqual([]);
    expect(stateWrites).toEqual([]);
  });

  it('and it lands in the acting presenter s OWN room', async () => {
    await as(presenter, OTHER_ROOM, () => openSession());
    expect(stateWrites).toEqual([{ shortCode: OTHER_ROOM, email: presenter.email, state: 'open' }]);
    expect(readSessionHistory(ROOM)).toEqual([]);
    expect(readSessionHistory(OTHER_ROOM).map((entry) => entry.eventName)).toEqual([
      'Session opened'
    ]);
  });
});

describe('the query', () => {
  it('returns this room s history to a presenter', async () => {
    recordSessionEvent(ROOM, 'Session opened', 'The room was reopened to members.');
    const read = await as(presenter, ROOM, () => getSessionHistory());
    expect(read.map((entry) => entry.eventName)).toEqual(['Session opened']);
  });

  it('REFUSES a member — the history is what presenters have done to the room', async () => {
    recordSessionEvent(ROOM, 'Session opened', '');
    await expect(as(member, ROOM, () => getSessionHistory())).rejects.toMatchObject({
      status: 403
    });
  });

  it('takes no argument, so no caller can name another room', () => {
    const source = readFileSync(
      new URL('../routes/session-history.remote.ts', import.meta.url),
      'utf8'
    );
    expect(source).toContain('query(z.void()');
    expect(source).toContain('readSessionHistory(presenterRoom())');
    expect(source).not.toContain('roomShortCode:');
  });
});

describe('the pane', () => {
  it('no longer claims an empty history unconditionally', () => {
    expect(modalCode).toContain('{#if sessionHistoryEntries.length === 0}');
  });

  it('both buttons call the loader — this is the defect', () => {
    /*
      `Load History` had NO onclick. Counted rather than merely found: there are two buttons, the
      empty branch's and the loaded branch's `Refresh`, and upstream binds `fetchSessionHistory()`
      to both.
    */
    expect(modalCode.match(/onclick=\{loadSessionHistory\}/g) ?? []).toHaveLength(2);
    expect(modalCode).toContain('Load History');
    expect(modalCode).toContain('Refresh');
  });

  it('draws the reference s row, with its own class strings', () => {
    expect(modalCode).toContain('class="list-group text-dark"');
    expect(modalCode).toContain(
      'class="list-group-item list-group-item-action border-bottom border-top border-dark"'
    );
    expect(modalCode).toContain('class="d-flex w-100 justify-content-between"');
    expect(modalCode).toContain('<h5 class="mb-1">{entry.eventName}</h5>');
    expect(modalCode).toContain('<p class="mb-1">{entry.eventValue}</p>');
    /* Angular's `date:'medium'`, resolved in the one place this room already resolves it. */
    expect(modalCode).toContain('mediumDateFormatter.format(new Date(entry.created))');
  });

  it('shows a failure instead of swallowing it, which the reference does not', () => {
    /*
      Upstream: `i && i.data && (globals.sessionHistory = i.data)` — no failure path at all, so a
      Refresh on a broken connection looks exactly like a Refresh with nothing to show.
    */
    expect(modalCode).toContain('{#if sessionHistoryError}');
    expect(modalCode).toContain("refusalMessage(cause, 'Could not load the session history.')");
  });

  it('does NOT fetch when the modal opens', () => {
    /*
      Upstream's empty branch draws a `Load History` button, which only makes sense if the pane
      starts empty — the presenter asks. A fetch on open would make that button unreachable and would
      query on every open of a modal whose other six tabs are the common ones.
    */
    expect(modalCode).not.toContain('void loadSessionHistory()');
    const at = modalCode.indexOf('async function loadSessionHistory');
    expect(at, 'the loader must exist').toBeGreaterThan(-1);
    const closes = modalCode.indexOf('\n  }', at);
    expect(closes, 'the loader must be closed').toBeGreaterThan(at);
    expect(modalCode.slice(at, closes)).toContain('if (sessionHistoryLoading) return;');
  });
});
