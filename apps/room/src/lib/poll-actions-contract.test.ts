import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { pollAnswers, polls, savedPolls, users, type User } from '#lib/server/db/schema.js';
import { callRemote, expectSchemaRefusal } from '#lib/server/remote-command-harness.js';
import { subscribeToRoom } from '#lib/server/room-events.js';

const { deleteSavedPoll, pollDone, savePoll, sendPoll, sendPollAnswer } =
  await import('../routes/polls.remote');

/*
  The five poll commands, end to end against a live SQLite database.

  ## REWRITTEN, not re-pointed, when they stopped being form actions

  Every assertion below still EXECUTES. `callRemote` establishes the request store a command's
  wrapper reads before it runs anything, and `remote-command-harness.ts` records which fields Kit
  needs and where each was read from. The alternative — turning behavioural assertions into
  `toContain` checks over `polls.remote.ts` — would have traded proof for string matching, and this
  repository has been bitten four times by a negative assertion that started passing because the
  text it was scanning had moved.

  ## What these still pin, and what changed shape

  They began as characterization tests for the SQLite implementation, so that the API-backed
  replacement (`docs/CUTOVER-ROOM-TO-API.md`) can be proven to behave the same. That is unchanged:
  where the two already differ, the difference is named in the test rather than left to be
  discovered during the cutover.

  Three shapes changed at the boundary, and each is the conversion rather than a weakening:

    - **A refusal is a REJECTION, not a returned `ActionFailure`.** `fail(403, …)` was a value the
      caller was free to ignore — and `submitPollAction` did ignore it, answering `false` and
      discarding the response. `error(403, …)` rejects the promise, so `.rejects.toMatchObject({
      status: 403 })` is asserting the thing the call site can actually see.
    - **A bad ARGUMENT is a `ValidationError` carrying `issues`, not a 400.** `expectSchemaRefusal`
      is the one place that knows that, for the reason its own docblock gives: thirty-seven literals
      went red at once when SvelteKit 3 removed `handleValidationError`.
    - **`choices` is a real array.** It used to be `JSON.stringify`d into a form field and re-parsed
      by `parsePollChoices`, so "not an array of strings" was a string-parse failure. It is now a
      schema refusal, and the test that used to post `'not json'` casts past the compiler to prove
      the runtime refuses it too.

  `sendPoll` no longer answers with the new `pollId`: nothing consumed it — `submitPollAction`
  discarded every result — so it went rather than being carried across as an unread value. The
  assertions read the row instead, which is the authority either way.
*/

/**
 * The room these polls belong to.
 *
 * Polls are per room: one is active per room, and a member's vote resolves THIS room's poll. The
 * room is never on an argument — every command takes it from the session — so it is set here on
 * `locals` exactly as `hooks.server.ts` would have.
 */
const ROOM = '3625';

/** A second room, which exists to prove the room predicates are real rather than decorative. */
const OTHER_ROOM = '9140';

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

const as = <T>(user: User, room: string, run: () => T | Promise<T>) =>
  callRemote({ user, sessionId: 'poll-actions-contract', roomShortCode: room } as App.Locals, run);

let presenter: User;
let member: User;

beforeAll(() => {
  ensureDatabase();
  presenter = account('poll-actions-presenter@example.test', 'staff');
  member = account('poll-actions-member@example.test', 'member');
});

beforeEach(() => {
  // Each command resolves "the active poll" for its own room, so leftovers from a previous test
  // would be found instead of the one under test.
  db.delete(pollAnswers).run();
  db.delete(polls).run();
  db.delete(savedPolls).run();
});

describe('savePoll', () => {
  it('stores the question and choices verbatim, with no trimming and no minimum', async () => {
    // Deliberately a half-written draft with untrimmed text. The Pre-Canned tab is a scratchpad
    // and the shipped client's `savePollToStorage` has no validation at all, so this must be
    // storable. The API's POST /rooms/{id}/saved-polls was corrected on 2026-08-04 to match.
    await expect(
      as(presenter, ROOM, () =>
        savePoll({ question: '  Long or short?  ', choices: [' Long ', ''] })
      )
    ).resolves.toBeUndefined();

    const stored = db.select().from(savedPolls).all();
    expect(stored).toHaveLength(1);
    expect(stored[0].question).toBe('  Long or short?  ');
    expect(JSON.parse(stored[0].choicesJson)).toEqual([' Long ', '']);
    expect(stored[0].roomShortCode).toBe(ROOM);
  });

  it('refuses a member, and refuses choices that are not an array of strings', async () => {
    await expect(
      as(member, ROOM, () => savePoll({ question: 'Mine', choices: ['a'] }))
    ).rejects.toMatchObject({ status: 403 });

    /*
      The cast is deliberate and is the point of the test: the payload type already forbids this at
      compile time, and what is being proven is that the RUNTIME does too. As a form action this
      value reached the server as the literal string `not json` and `parsePollChoices` answered
      `null`; there is no parse to fail now, so the schema is what refuses it.
    */
    await expectSchemaRefusal(
      as(presenter, ROOM, () =>
        savePoll({ question: 'Bad', choices: 'not json' } as unknown as {
          question: string;
          choices: string[];
        })
      ),
      'choices=not json'
    );

    expect(db.select().from(savedPolls).all()).toHaveLength(0);
  });

  /*
    THE BOUND IS NEW, and it is asserted rather than only described.

    As an action the question and every choice were stored exactly as posted with no length check of
    any kind — an unbounded write on an endpoint anybody with a presenter session can reach. The
    caps in `#lib/poll-command.ts` are set far above anything the composer can produce, so the pair
    below is "one character under, one character over" rather than a guess at a realistic size.
  */
  it('bounds the question and each choice, at a ceiling the composer cannot reach', async () => {
    await expect(
      as(presenter, ROOM, () => savePoll({ question: 'q'.repeat(1_000), choices: [] }))
    ).resolves.toBeUndefined();

    await expectSchemaRefusal(
      as(presenter, ROOM, () => savePoll({ question: 'q'.repeat(1_001), choices: [] })),
      'question over the cap'
    );
    await expectSchemaRefusal(
      as(presenter, ROOM, () => savePoll({ question: 'q', choices: ['c'.repeat(501)] })),
      'choice over the cap'
    );
    await expectSchemaRefusal(
      as(presenter, ROOM, () =>
        savePoll({ question: 'q', choices: Array.from({ length: 101 }, () => 'c') })
      ),
      'too many choices'
    );

    expect(db.select().from(savedPolls).all()).toHaveLength(1);
  });
});

describe('deleteSavedPoll', () => {
  it('deletes by id, and any presenter may delete any entry', async () => {
    await as(presenter, ROOM, () => savePoll({ question: 'First', choices: ['a', 'b'] }));
    await as(presenter, ROOM, () => savePoll({ question: 'Second', choices: ['a', 'b'] }));
    const [first, second] = db.select().from(savedPolls).all();

    // Deleting the FIRST must leave the second alone. The reference splices an array index, so
    // this is the case that would take the wrong row if position were the key.
    await expect(
      as(presenter, ROOM, () => deleteSavedPoll({ pollId: first.id }))
    ).resolves.toBeUndefined();

    const remaining = db.select().from(savedPolls).all();
    expect(remaining.map((poll) => poll.id)).toEqual([second.id]);
  });

  it('refuses a member, and refuses a non-positive id before the WHERE clause', async () => {
    await as(presenter, ROOM, () => savePoll({ question: 'Kept', choices: ['a', 'b'] }));
    const [saved] = db.select().from(savedPolls).all();

    await expect(
      as(member, ROOM, () => deleteSavedPoll({ pollId: saved.id }))
    ).rejects.toMatchObject({ status: 403 });

    /*
      `Number.isInteger(pollId)` admitted both of these and let them reach the WHERE clause to match
      nothing, then reported success. `.positive()` refuses them at the boundary — a tightening, and
      one that cannot refuse a real row, because `saved_polls.id` is an autoincrement primary key.
    */
    for (const bad of [0, -1]) {
      await expectSchemaRefusal(
        as(presenter, ROOM, () => deleteSavedPoll({ pollId: bad })),
        `pollId=${bad}`
      );
    }

    expect(db.select().from(savedPolls).all()).toHaveLength(1);
  });

  /*
    NOTE for the cutover: deleting an id that does not exist succeeds here.

    Drizzle's `delete ... where id = ?` affects zero rows and the command still resolves. The API's
    DELETE /rooms/{id}/saved-polls/{id} returns 404 instead, which is the better answer - a client
    that thinks it deleted something should be told when it did not. Pinned so the change is a
    decision rather than a surprise, and deliberately NOT re-decided during the conversion.
  */
  it('currently succeeds when the id does not exist', async () => {
    await expect(
      as(presenter, ROOM, () => deleteSavedPoll({ pollId: 999999 }))
    ).resolves.toBeUndefined();
  });

  /*
    The room predicate, proven by a row it must NOT reach.

    A presenter of this room holds a real presenter session; the only thing standing between them
    and another room's Pre-Canned list is `eq(savedPolls.roomShortCode, room)`. Delete that and this
    test is the one that goes red.
  */
  it('cannot delete a saved poll belonging to another room', async () => {
    await as(presenter, OTHER_ROOM, () => savePoll({ question: 'Theirs', choices: ['a', 'b'] }));
    const [theirs] = db.select().from(savedPolls).all();

    await as(presenter, ROOM, () => deleteSavedPoll({ pollId: theirs.id }));

    expect(
      db
        .select()
        .from(savedPolls)
        .all()
        .map((poll) => poll.id)
    ).toEqual([theirs.id]);
  });
});

describe('sendPoll', () => {
  it('closes whatever poll was active before opening the new one', async () => {
    await as(presenter, ROOM, () => sendPoll({ question: 'First', choices: ['a', 'b'] }));
    const first = db.select().from(polls).all()[0];
    expect(first.status).toBe('active');

    await as(presenter, ROOM, () => sendPoll({ question: 'Second', choices: ['c', 'd'] }));

    const all = db.select().from(polls).all();
    expect(all).toHaveLength(2);
    const closed = all.find((poll) => poll.id === first.id);
    expect(closed?.status).toBe('done');
    expect(closed?.endedAt).not.toBeNull();
    expect(all.filter((poll) => poll.status === 'active')).toHaveLength(1);
  });

  it('closes only THIS room s poll, not every room s', async () => {
    /*
      The predicate that was missing once: without `eq(polls.roomShortCode, room)` on the UPDATE,
      one presenter starting a poll ended every other room's mid-vote.
    */
    await as(presenter, OTHER_ROOM, () => sendPoll({ question: 'Theirs', choices: ['a'] }));
    await as(presenter, ROOM, () => sendPoll({ question: 'Ours', choices: ['a'] }));

    const byRoom = db.select().from(polls).all();
    expect(
      byRoom.filter((poll) => poll.roomShortCode === OTHER_ROOM).map((poll) => poll.status)
    ).toEqual(['active']);
  });

  it('refuses a member', async () => {
    await expect(
      as(member, ROOM, () => sendPoll({ question: 'Mine', choices: ['a'] }))
    ).rejects.toMatchObject({ status: 403 });
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
   *
   * **As a command there is no `return` for a publish to hide behind**, which removes the shape of
   * the defect and not only the instance. The assertion stays anyway: the command could still grow
   * an early `error(…)` above the publish.
   */
  it('publishes gotPollAnswer on the presenter-only channel', async () => {
    /* `sendPoll` creates the active poll directly, exactly as the describe below sets one up. */
    await as(presenter, ROOM, () => sendPoll({ question: 'Publish?', choices: ['Up', 'Down'] }));

    const frames: unknown[] = [];
    const unsubscribe = subscribeToRoom(ROOM, (event) => frames.push(event));
    try {
      await as(member, ROOM, () => sendPollAnswer({ choiceIndex: 0 }));
    } finally {
      unsubscribe();
    }

    expect(
      frames,
      'a member answered and no frame reached the room — the publish is unreachable again'
    ).toContainEqual({ channel: 'cmdsAdmin', data: { cmd: 'gotPollAnswer' } });
  });

  it('publishes into the ANSWERING member s room and no other', async () => {
    /*
      The publish takes its room from the same resolution the vote does. A frame addressed to the
      wrong room would tell the wrong presenters an answer had arrived, and — worse — would tell
      them nothing about their own.
    */
    await as(presenter, ROOM, () => sendPoll({ question: 'Publish?', choices: ['Up', 'Down'] }));

    const elsewhere: unknown[] = [];
    const unsubscribe = subscribeToRoom(OTHER_ROOM, (event) => elsewhere.push(event));
    try {
      await as(member, ROOM, () => sendPollAnswer({ choiceIndex: 0 }));
    } finally {
      unsubscribe();
    }

    expect(elsewhere).toEqual([]);
  });
});

describe('sendPollAnswer', () => {
  beforeEach(async () => {
    await as(presenter, ROOM, () => sendPoll({ question: 'Direction?', choices: ['Up', 'Down'] }));
  });

  it('lets any member answer, and refuses an index outside the choices', async () => {
    await expect(
      as(member, ROOM, () => sendPollAnswer({ choiceIndex: 1 }))
    ).resolves.toBeUndefined();
    expect(db.select().from(pollAnswers).all()).toHaveLength(1);

    /*
      The UPPER bound is not a schema and cannot be: it is `choices.length` of whichever poll is
      active in the caller's room. So this one is `error(400, …)` from our own code, asserted
      directly — `expectSchemaRefusal` would be the wrong helper and says so when misused.
    */
    await expect(
      as(presenter, ROOM, () => sendPollAnswer({ choiceIndex: 2 }))
    ).rejects.toMatchObject({ status: 400 });

    /* The LOWER bound is a schema, and -1 is what an off-by-one on the client produces. */
    await expectSchemaRefusal(
      as(presenter, ROOM, () => sendPollAnswer({ choiceIndex: -1 })),
      'choiceIndex=-1'
    );

    expect(db.select().from(pollAnswers).all()).toHaveLength(1);
  });

  it('accepts index 0, which is the one place a zero id is legitimate', async () => {
    /*
      `.nonnegative()` and not `.positive()`, unlike every other id in this file. The first choice IS
      index 0 — it is a position, not a row id — and tightening this the way `pollId` was tightened
      would refuse every vote for the first option.
    */
    await expect(
      as(member, ROOM, () => sendPollAnswer({ choiceIndex: 0 }))
    ).resolves.toBeUndefined();
    expect(db.select().from(pollAnswers).all()[0].choiceIndex).toBe(0);
  });

  /*
    THE DIVERGENCE THAT MATTERS for the cutover.

    Here the FIRST answer wins: the command checks for an existing row and skips the insert, so a
    second vote is silently ignored and still resolves. The API's `poll::answer` DELETEs the
    previous response and inserts the new one, so the LAST answer wins.

    Neither is observable through the shipped client - `sendAnswer` guards on `this.answered` and
    never sends twice - which is exactly why this needs pinning. The cutover changes the
    behaviour of a path no test covered and no user can reach today.
  */
  it('keeps the first answer and ignores a second, where the API keeps the last', async () => {
    await as(member, ROOM, () => sendPollAnswer({ choiceIndex: 0 }));
    await expect(
      as(member, ROOM, () => sendPollAnswer({ choiceIndex: 1 }))
    ).resolves.toBeUndefined();

    const answers = db.select().from(pollAnswers).all();
    expect(answers).toHaveLength(1);
    expect(answers[0].choiceIndex).toBe(0);
  });

  it('is a 404 when no poll is active IN THIS ROOM', async () => {
    await as(presenter, ROOM, () => pollDone());
    await expect(as(member, ROOM, () => sendPollAnswer({ choiceIndex: 0 }))).rejects.toMatchObject({
      status: 404
    });
  });

  it('cannot vote into another room s poll', async () => {
    /*
      The room predicate on the lookup. Without it, a member whose own room has no poll open
      resolves whichever poll is active anywhere and votes in a room they are not in — which is what
      this did before the predicate was added, and what this asserts cannot come back.
    */
    await as(presenter, ROOM, () => pollDone());
    await as(presenter, OTHER_ROOM, () => sendPoll({ question: 'Theirs', choices: ['a', 'b'] }));

    await expect(as(member, ROOM, () => sendPollAnswer({ choiceIndex: 0 }))).rejects.toMatchObject({
      status: 404
    });
    expect(db.select().from(pollAnswers).all()).toHaveLength(0);
  });
});

describe('pollDone', () => {
  it('closes only the polls this presenter opened', async () => {
    const other = account('poll-actions-other-presenter@example.test', 'staff');

    await as(presenter, ROOM, () => sendPoll({ question: 'Mine', choices: ['a', 'b'] }));
    const mine = db.select().from(polls).all()[0];
    // A second send closes the first, so the other presenter's poll is opened afterwards and is
    // the only active one. `pollDone` as this presenter must then close nothing.
    await as(other, ROOM, () => sendPoll({ question: 'Theirs', choices: ['a', 'b'] }));

    await as(presenter, ROOM, () => pollDone());

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

  it('closes only the poll in THIS room, for a presenter who holds two', async () => {
    /*
      The room predicate, and the case it exists for: one account presenting in two rooms. Without
      `eq(polls.roomShortCode, room)` this presenter ending a poll here would end their own poll
      there — the same account, so the `senderId` predicate cannot catch it.
    */
    await as(presenter, OTHER_ROOM, () => sendPoll({ question: 'There', choices: ['a'] }));
    await as(presenter, ROOM, () => sendPoll({ question: 'Here', choices: ['a'] }));

    await as(presenter, ROOM, () => pollDone());

    const there = db
      .select()
      .from(polls)
      .where(and(eq(polls.roomShortCode, OTHER_ROOM), eq(polls.status, 'active')))
      .all();
    expect(there).toHaveLength(1);
  });

  it('refuses a member', async () => {
    await expect(as(member, ROOM, () => pollDone())).rejects.toMatchObject({ status: 403 });
  });
});
