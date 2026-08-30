import { error } from '@sveltejs/kit';
import { command, getRequestEvent } from '$app/server';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { deleteSavedPollSchema, pollAnswerSchema, pollDraftSchema } from '#lib/poll-command.js';
import { parsePollChoices } from '#lib/poll-behavior.js';
import { presenterRoom, requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { pollAnswers, polls, savedPolls } from '#lib/server/db/schema.js';
import { publishToRoom } from '#lib/server/room-events.js';

/*
  THE FIVE POLL COMMANDS, which were the last dynamically-dispatched form actions in this room.

  ## What they were, and why that shape was the worst one

  `RoomModals.submitPollAction(action, values)` built its endpoint at runtime —
  ``fetch(`?/${action}`)`` over a five-member union — so the name of the thing being called existed
  only as a string assembled while the page ran. `remote-call-sites-contract.test.ts` opens with the
  cost of exactly that: `presenterCommand`'s action was deleted while `ModalHost.svelte` went on
  posting to it, and a presenter revoking a member's microphone did nothing for three commits with
  every gate green. A literal `'?/savePoll'` is at least greppable; an interpolated one is not
  reachable by the compiler, by a search, or by the build.

  As five exported functions the union is gone. Each call site names a symbol, so deleting one of
  these is a type error at the call site rather than a 404 nobody sees.

  ## Split on the GATE, which is why all five are in ONE module

  Four are presenter-only and one is not, and that looks at first like the split this repository
  makes everywhere else. It is not, because {@link sendPollAnswer} is not a lesser version of the
  other four — it is the OTHER SIDE of the same object. The four write the poll; the fifth writes an
  answer to it, and it can only be understood beside the poll it resolves: the range check that
  bounds `choiceIndex` is `choices.length` of the row `sendPoll` inserted, and the first-answer-wins
  rule is the thing `pollDone` ends.

  Splitting them would put the poll's lifecycle in one file and the vote in another, and the
  invariant that binds them — ONE active poll per room, resolved by `roomShortCode` and `status`,
  never by "the newest anywhere" — would then be written twice. It was written twice once already,
  and both copies were unscoped: a member's vote resolved whichever poll happened to be open
  anywhere on the deployment. The room predicate below is what fixed that, and keeping every reader
  of it in one file is what stops one copy being fixed and the other not.

  So the gate is not shared, and it is stated per command rather than hoisted. Three of the four
  presenter commands go through {@link presenterRoom}, which makes "may they" and "which room" one
  event, because handing those out separately is precisely the 2026-08-07 privilege escalation.

  ## `roomShortCode` is on NO argument here

  Every one of the five takes the room from the SESSION. A room on the wire would let a presenter of
  room A close room B's poll, and would let a member vote into a room they are not in. This is the
  rule `CLAUDE.md` states as *"every authority decision is made on the server from data the server
  owns"*, and the schemas are `strictObject`, so a room field cannot be added to a payload and
  quietly honoured later.

  ## Failure is `error(…)`, not `fail(…)`

  `fail` returns a value only a form action's caller understands, and a command has no such caller.
  `error` rejects the client's promise, which is the failure `RoomModals` can actually see — and
  does see: it logs the cause and answers `false`, which is what stops `PollPanel` raising
  *"Poll Saved to Pre-Canned polls..."* over a refusal.
*/

/**
 * `savePollToStorage` — add a poll to this room's Pre-Canned list.
 *
 * Deliberately permissive about its content and deliberately strict about its shape: see
 * `pollDraftSchema`, which records why nothing is trimmed and why an empty choice is stored.
 *
 * The row is keyed by the room, so one presenter's saved polls are not another room's. That was
 * already true as an action and is restated here because the room now arrives from
 * {@link presenterRoom} rather than from `locals` read twice.
 */
export const savePoll = command(pollDraftSchema, ({ question, choices }) => {
  ensureDatabase();

  const room = presenterRoom();
  const { locals } = getRequestEvent();

  db.insert(savedPolls)
    .values({
      // A saved poll is a presenter's re-usable template for THIS room's poll list.
      roomShortCode: room,
      question,
      choicesJson: JSON.stringify(choices),
      createdByUserId: requireUser(locals).id,
      createdAt: new Date()
    })
    .run();
});

/**
 * Remove one saved poll.
 *
 * ANY presenter of the room may delete ANY of its entries — the list is the room's, not the
 * author's, and `poll-actions-contract.test.ts` pins that. The room predicate is what keeps it from
 * being every room's.
 *
 * **Deleting an id that does not exist still succeeds**, unchanged from the action. That is a
 * recorded divergence from the API this room will eventually call, which answers 404; it is pinned
 * in the contract test so the change is a decision rather than a surprise. It is NOT re-decided
 * here, because a conversion that also changes an answer is two changes wearing one commit.
 */
export const deleteSavedPoll = command(deleteSavedPollSchema, ({ pollId }) => {
  ensureDatabase();

  const room = presenterRoom();

  db.delete(savedPolls)
    .where(and(eq(savedPolls.roomShortCode, room), eq(savedPolls.id, pollId)))
    .run();
});

/**
 * `sendPoll` — close whatever this room had open, then open this one.
 *
 * Two statements and no read between them, which is the point: there is no SELECT to decide whether
 * a poll is active, so there is no window in which two presenters both see "none active" and both
 * open one. The UPDATE is conditional on `status = 'active'` and simply affects zero rows when
 * nothing was.
 */
export const sendPoll = command(pollDraftSchema, ({ question, choices }) => {
  ensureDatabase();

  const room = presenterRoom();
  const { locals } = getRequestEvent();

  const now = new Date();
  /*
    Close the previously active poll in THIS room before opening another.

    Without the room predicate this closed the live poll in every room on the deployment: one
    presenter starting a poll ended everybody else's mid-vote. Only one poll is active per room,
    which is why the room has to be part of the condition.
  */
  db.update(polls)
    .set({ status: 'done', endedAt: now })
    .where(and(eq(polls.roomShortCode, room), eq(polls.status, 'active')))
    .run();

  db.insert(polls)
    .values({
      roomShortCode: room,
      senderId: requireUser(locals).id,
      question,
      choicesJson: JSON.stringify(choices),
      status: 'active',
      createdAt: now
    })
    .run();
});

/**
 * `sendAnswer` — a member votes, and the presenters are told.
 *
 * ## The one command here that is NOT presenter-gated, stated rather than implied
 *
 * Voting is what a member is in the room for, so the gate is membership: a live session, and a room
 * on it. {@link requireRoomShortCode} and {@link requireUser} are that gate, and the room they
 * answer is the one the vote is recorded against — a member cannot vote into a room they are not
 * in, because there is no room on the argument to point somewhere else.
 *
 * ## The range check cannot be a schema, and that is why it is here
 *
 * `pollAnswerSchema` bounds `choiceIndex` below at 0. The upper bound is `choices.length` of
 * whichever poll is active in THIS room, which is not knowable until the row is resolved — so it is
 * re-checked against that row. An index past the end would otherwise be recorded and then counted
 * by nothing, which is a vote that silently disappears rather than a refusal.
 *
 * ## THE FIRST ANSWER WINS
 *
 * A second vote is ignored and still resolves successfully. That is unchanged from the action, and
 * it is a pinned divergence from the API this room will eventually call, whose `poll::answer`
 * deletes the previous response so the LAST answer wins. Neither is reachable through the shipped
 * client — `sendAnswer` guards on `this.answered` — which is exactly why it needs pinning.
 *
 * ## `gotPollAnswer` SAT AFTER THE `return` AND NEVER RAN
 *
 * `handleServerCmdAdmin(e, i) { "gotPollAnswer" === e && emit("gotPollAnswer", i) }` — one command,
 * on presenter-only `/cmdsAdmin/`, which is also why the frame carries no payload. The action ended
 * `return { success: true }` and then, below it, published. Statically unreachable, with a live
 * receiver on the other end: a presenter watching a poll never learned an answer had arrived. It
 * was found on 2026-08-30 and it is a BEHAVIOURAL assertion in `poll-actions-contract.test.ts`,
 * because the line was there, spelled correctly, with a comment explaining it.
 *
 * A command has no `return` for it to hide behind now — there is nothing to return — which removes
 * the shape of that defect rather than only the instance of it.
 */
export const sendPollAnswer = command(pollAnswerSchema, ({ choiceIndex }) => {
  ensureDatabase();

  const { locals } = getRequestEvent();
  const room = requireRoomShortCode(locals);
  const voter = requireUser(locals);

  /*
    THIS room's active poll.

    Unscoped, a member voting resolved whichever poll was open anywhere on the deployment and
    recorded their answer against it — a vote cast into a room they are not in, and a stranger's
    vote counted in yours. `poll_answers` needs no room column of its own because it reaches its
    poll through `pollId`, and this is the lookup that makes that safe.
  */
  const activePoll = db
    .select()
    .from(polls)
    .where(and(eq(polls.roomShortCode, room), eq(polls.status, 'active')))
    .orderBy(desc(polls.createdAt))
    .get();
  if (!activePoll) error(404, 'No active poll was found.');

  const choices = parsePollChoices(activePoll.choicesJson) ?? [];
  if (choiceIndex >= choices.length) error(400, 'The poll choice is out of range.');

  const existingAnswer = db
    .select({ id: pollAnswers.id })
    .from(pollAnswers)
    .where(and(eq(pollAnswers.pollId, activePoll.id), eq(pollAnswers.senderId, voter.id)))
    .get();
  if (!existingAnswer) {
    db.insert(pollAnswers)
      .values({
        pollId: activePoll.id,
        senderId: voter.id,
        choiceIndex,
        createdAt: new Date()
      })
      .run();
  }

  publishToRoom(room, { channel: 'cmdsAdmin', data: { cmd: 'gotPollAnswer' } });
});

/**
 * `pollDone` — end the poll this presenter opened.
 *
 * Three predicates and every one of them earns its place: the ROOM, because ending a poll ends it
 * here and a presenter who owns rooms A and B would otherwise close both at once; `status`, so a
 * double click rewrites nothing and cannot move an already-recorded `endedAt`; and the SENDER, so
 * one presenter cannot close another's poll out from under them.
 *
 * One conditional UPDATE and no SELECT first. Reading the row and then updating it is the TOCTOU
 * this repository fixes everywhere else, and the update is already idempotent.
 */
export const pollDone = command(z.void(), () => {
  ensureDatabase();

  const room = presenterRoom();
  const { locals } = getRequestEvent();

  db.update(polls)
    .set({ status: 'done', endedAt: new Date() })
    .where(
      and(
        eq(polls.roomShortCode, room),
        eq(polls.status, 'active'),
        eq(polls.senderId, requireUser(locals).id)
      )
    )
    .run();
});
