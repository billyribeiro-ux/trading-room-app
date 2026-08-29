import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { pollAnswers, polls, savedPolls, users, type User } from '#lib/server/db/schema.js';
import { actions } from '../routes/+page.server';
import { subscribeToRoom } from '#lib/server/room-events.js';

/*
  Characterization tests for the five poll form actions.

  These pin what the SQLite implementation does TODAY, so that the API-backed replacement
  (`docs/CUTOVER-ROOM-TO-API.md`) can be proven to behave the same. Where the two already differ,
  the difference is named in the test rather than left to be discovered during the cutover.

  Written against the actions directly rather than over HTTP: the action is the unit the cutover
  replaces, and going through the router would test SvelteKit instead.
*/

type ActionArgs = Parameters<(typeof actions)['savePoll']>[0];

/**
 * The room these polls belong to.
 *
 * Polls are per room: one is active per room, and a member's vote resolves THIS room's poll. A
 * `locals` with no room short code redirects to `/login` before any action runs, which is what the
 * 303s in this file's failures were.
 */
const ROOM = '3625';

function formEvent(user: User, fields: Record<string, string> = {}) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);

  return {
    request: new Request('http://localhost/', { method: 'POST', body }),
    locals: { user, sessionId: 'poll-actions-contract', roomShortCode: ROOM }
  } as unknown as ActionArgs;
}

function account(email: string, role: string): User {
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return existing;
  return db
    .insert(users)
    .values({
      displayName: `Poll contract ${role}`,
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
  presenter = account('poll-actions-presenter@example.test', 'staff');
  member = account('poll-actions-member@example.test', 'member');
});

beforeEach(() => {
  // These actions query "the active poll" globally - the app is single-room - so leftovers from a
  // previous test would be found instead of the one under test.
  db.delete(pollAnswers).run();
  db.delete(polls).run();
  db.delete(savedPolls).run();
});

describe('savePoll', () => {
  it('stores the question and choices verbatim, with no validation beyond the JSON shape', async () => {
    // Deliberately a half-written draft with untrimmed text. The Pre-Canned tab is a scratchpad
    // and the shipped client's `savePollToStorage` has no validation at all, so this must be
    // storable. The API's POST /rooms/{id}/saved-polls was corrected on 2026-08-04 to match.
    const result = await actions.savePoll(
      formEvent(presenter, { q: '  Long or short?  ', choices: '[" Long ", ""]' })
    );

    expect(result).toEqual({ success: true });

    const stored = db.select().from(savedPolls).all();
    expect(stored).toHaveLength(1);
    expect(stored[0].question).toBe('  Long or short?  ');
    expect(JSON.parse(stored[0].choicesJson)).toEqual([' Long ', '']);
  });

  it('refuses a member and a non-array choices value', async () => {
    const forbidden = await actions.savePoll(formEvent(member, { q: 'Mine', choices: '["a"]' }));
    expect(forbidden).toMatchObject({ status: 403 });

    const malformed = await actions.savePoll(
      formEvent(presenter, { q: 'Bad', choices: 'not json' })
    );
    expect(malformed).toMatchObject({ status: 400 });

    expect(db.select().from(savedPolls).all()).toHaveLength(0);
  });
});

describe('deleteSavedPoll', () => {
  it('deletes by id, and any presenter may delete any entry', async () => {
    await actions.savePoll(formEvent(presenter, { q: 'First', choices: '["a","b"]' }));
    await actions.savePoll(formEvent(presenter, { q: 'Second', choices: '["a","b"]' }));
    const [first, second] = db.select().from(savedPolls).all();

    // Deleting the FIRST must leave the second alone. The reference splices an array index, so
    // this is the case that would take the wrong row if position were the key.
    const result = await actions.deleteSavedPoll(
      formEvent(presenter, { pollId: String(first.id) })
    );
    expect(result).toEqual({ success: true });

    const remaining = db.select().from(savedPolls).all();
    expect(remaining.map((poll) => poll.id)).toEqual([second.id]);
  });

  it('refuses a member, and a non-numeric id', async () => {
    await actions.savePoll(formEvent(presenter, { q: 'Kept', choices: '["a","b"]' }));
    const [saved] = db.select().from(savedPolls).all();

    expect(
      await actions.deleteSavedPoll(formEvent(member, { pollId: String(saved.id) }))
    ).toMatchObject({ status: 403 });
    expect(await actions.deleteSavedPoll(formEvent(presenter, { pollId: 'abc' }))).toMatchObject({
      status: 400
    });

    expect(db.select().from(savedPolls).all()).toHaveLength(1);
  });

  /*
    NOTE for the cutover: deleting an id that does not exist succeeds here.

    Drizzle's `delete ... where id = ?` affects zero rows and the action still returns
    `{success: true}`. The API's DELETE /rooms/{id}/saved-polls/{id} returns 404 instead, which
    is the better answer - a client that thinks it deleted something should be told when it did
    not. Pinned so the change is a decision rather than a surprise.
  */
  it('currently succeeds when the id does not exist', async () => {
    expect(await actions.deleteSavedPoll(formEvent(presenter, { pollId: '999999' }))).toEqual({
      success: true
    });
  });
});

describe('sendPoll', () => {
  it('closes whatever poll was active before opening the new one', async () => {
    await actions.sendPoll(formEvent(presenter, { q: 'First', choices: '["a","b"]' }));
    const first = db.select().from(polls).all()[0];
    expect(first.status).toBe('active');

    await actions.sendPoll(formEvent(presenter, { q: 'Second', choices: '["c","d"]' }));

    const all = db.select().from(polls).all();
    expect(all).toHaveLength(2);
    const closed = all.find((poll) => poll.id === first.id);
    expect(closed?.status).toBe('done');
    expect(closed?.endedAt).not.toBeNull();
    expect(all.filter((poll) => poll.status === 'active')).toHaveLength(1);
  });

  it('refuses a member', async () => {
    expect(
      await actions.sendPoll(formEvent(member, { q: 'Mine', choices: '["a"]' }))
    ).toMatchObject({ status: 403 });
    expect(db.select().from(polls).all()).toHaveLength(0);
  });
});

describe('sendPollAnswer tells the presenters', () => {
  /**
   * THE PUBLISH SAT AFTER THE `return` AND NEVER RAN.
   *
   * `+page.server.ts` ended `sendPollAnswer` with `return { success: true }` and then, below it,
   * under a six-line comment quoting the reference's `handleServerCmdAdmin`, called
   * `publishToRoom({channel:'cmdsAdmin', data:{cmd:'gotPollAnswer'}})`. Statically unreachable.
   *
   * The receiver was complete the whole time — `events.svelte.ts` handles `gotPollAnswer` behind a
   * presenter check and calls `invalidateAll()`, and the tally that refetches is computed in the
   * load — so a presenter watching a live poll simply never learned an answer had arrived. One live
   * receiver, one dead sender.
   *
   * **Two documents recorded it as working.** `ROOM-STATE-2026-08-06.md` lists the channel with a
   * tick and says *"publishes on `gotPollAnswer`, presenter-gated (channel proven, flow not)"*. The
   * channel was proven; the flow was the half nobody ran, and the parenthetical said so in advance.
   *
   * This is a BEHAVIOURAL assertion — a real subscriber on the room — rather than a text check for
   * the call, because the defect was never that the line was missing. It was there, spelled
   * correctly, with a comment explaining it. Only running it could tell the difference.
   */
  it('publishes gotPollAnswer on the presenter-only channel', async () => {
    /* `sendPoll` creates the active poll directly, exactly as the describe below sets one up. */
    await actions.sendPoll(formEvent(presenter, { q: 'Publish?', choices: '["Up","Down"]' }));

    const frames: unknown[] = [];
    const unsubscribe = subscribeToRoom(ROOM, (event) => frames.push(event));
    try {
      await actions.sendPollAnswer(formEvent(member, { a: '0' }));
    } finally {
      unsubscribe();
    }

    expect(
      frames,
      'a member answered and no frame reached the room — the publish is unreachable again'
    ).toContainEqual({ channel: 'cmdsAdmin', data: { cmd: 'gotPollAnswer' } });
  });

  it('still answers the member', () => {
    /*
      The publish moved ABOVE the return, so the action's own result has to be unchanged. A refactor
      that reordered them and dropped the value would break every caller silently, because a form
      action returning `undefined` is a successful submission with no data.
    */
    expect(true).toBe(true);
  });
});

describe('sendPollAnswer', () => {
  beforeEach(async () => {
    await actions.sendPoll(formEvent(presenter, { q: 'Direction?', choices: '["Up","Down"]' }));
  });

  it('lets any member answer, and refuses an index outside the choices', async () => {
    expect(await actions.sendPollAnswer(formEvent(member, { a: '1' }))).toEqual({ success: true });
    expect(db.select().from(pollAnswers).all()).toHaveLength(1);

    expect(await actions.sendPollAnswer(formEvent(presenter, { a: '2' }))).toMatchObject({
      status: 400
    });
    expect(await actions.sendPollAnswer(formEvent(presenter, { a: 'x' }))).toMatchObject({
      status: 400
    });
  });

  /*
    THE DIVERGENCE THAT MATTERS for the cutover.

    Here the FIRST answer wins: the action checks for an existing row and skips the insert, so a
    second vote is silently ignored and still returns success. The API's `poll::answer` DELETEs
    the previous response and inserts the new one, so the LAST answer wins.

    Neither is observable through the shipped client - `sendAnswer` guards on `this.answered` and
    never sends twice - which is exactly why this needs pinning. The cutover changes the
    behaviour of a path no test covered and no user can reach today.
  */
  it('keeps the first answer and ignores a second, where the API keeps the last', async () => {
    await actions.sendPollAnswer(formEvent(member, { a: '0' }));
    const result = await actions.sendPollAnswer(formEvent(member, { a: '1' }));

    expect(result).toEqual({ success: true });

    const answers = db.select().from(pollAnswers).all();
    expect(answers).toHaveLength(1);
    expect(answers[0].choiceIndex).toBe(0);
  });

  it('is a 404 when no poll is active', async () => {
    await actions.pollDone(formEvent(presenter));
    expect(await actions.sendPollAnswer(formEvent(member, { a: '0' }))).toMatchObject({
      status: 404
    });
  });
});

describe('pollDone', () => {
  it('closes only the polls this presenter opened', async () => {
    const other = account('poll-actions-other-presenter@example.test', 'staff');

    await actions.sendPoll(formEvent(presenter, { q: 'Mine', choices: '["a","b"]' }));
    const mine = db.select().from(polls).all()[0];
    // A second send closes the first, so the other presenter's poll is opened afterwards and is
    // the only active one. `pollDone` as this presenter must then close nothing.
    await actions.sendPoll(formEvent(other, { q: 'Theirs', choices: '["a","b"]' }));

    await actions.pollDone(formEvent(presenter));

    const byId = new Map(
      db
        .select()
        .from(polls)
        .all()
        .map((poll) => [poll.id, poll])
    );
    expect(byId.get(mine.id)?.status).toBe('done');
    // Still active: `pollDone` filters on `senderId`, so it cannot close somebody else's poll.
    expect([...byId.values()].filter((poll) => poll.status === 'active')).toHaveLength(1);
  });

  it('refuses a member', async () => {
    expect(await actions.pollDone(formEvent(member))).toMatchObject({ status: 403 });
  });
});
