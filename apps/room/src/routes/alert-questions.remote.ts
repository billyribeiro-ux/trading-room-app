import { error } from '@sveltejs/kit';
import { command, getRequestEvent } from '$app/server';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { MAX_QUESTION_BODY } from '#lib/message-bounds.js';
import { isPresenterRole, requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import { capturedRoomItem } from '#lib/server/captured-room.js';
import { hashEmail } from '#lib/server/connection.js';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { alertQuestions, alerts } from '#lib/server/db/schema.js';
import { consumeRateLimit } from '#lib/server/rate-limit.js';
import { readRoomConfig } from '#lib/server/room-config-client.js';
import { toggleReaction } from '#lib/reaction-toggle.js';
import { parseReactions } from '#lib/server/reactions.js';

/*
  Asking a question against an alert.

  Its own module, and NOT with `post-alert.remote.ts`, on the gate: posting an alert is
  presenter-only, asking about one is open to every member of the room. Two functions with two
  different answers to "who may do this" do not belong behind one name — the Files-pane conversion
  settled that cut and this is the same one.

  The count on the alert row and the question row are written in ONE transaction, so the badge can
  never disagree with the list, and the count is DERIVED from the rows rather than incremented
  blindly. An increment cannot be replayed or repaired; a recount from the rows always agrees with
  what is there.
*/

/**
 * `askQuestion` — a member asks, or the alert's own author answers.
 *
 * ## Answered-ness keys off AUTHORSHIP, not role
 *
 * A question stays outstanding until the presenter who posted the alert answers it, so the button
 * keeps flashing for everyone else until then. This deliberately keys off authorship rather than
 * role: `resolveConnectedIdentity` promotes every guest to `staff` (`connection.ts`), so a role
 * check would mark every question answered the moment it is asked, and nothing would ever write
 * `answered_at`.
 *
 * ## The alert must be in THIS room — it was a cross-tenant WRITE until 2026-08-14
 *
 * The author lookup was correctly scoped, but its answer was only ever used to decide `isAnswer`. A
 * miss produced `null`, `isAnswer` went false, and the insert ran anyway with whatever `alertId` the
 * form carried — so a member of one room could attach a question to another room's alert, and that
 * room's Q&A thread would display it.
 *
 * The paragraph here used to end *"`alert_questions` has no room column of its own, so nothing
 * downstream could catch it either."* **It has one now**, written by the insert below, and the
 * reason it was added is in `alert-log.ts`: the join that used to supply the room could not supply
 * it for a question asked on a CAPTURED alert, which this command accepts.
 *
 * `null` means exactly one thing: no alert with that id exists in THIS room. `senderId` is
 * `notNull`, so a found row always answers; and `capturedRoomItem` is given the room too, so a
 * captured alert that is hidden or belongs elsewhere is a miss as well. Refusing on `null` is
 * therefore the whole check, and it fails closed.
 *
 * ## The length bound is NEW
 *
 * This accepted a body of any size. A question lands in a thread every reader of that alert loads,
 * so an unbounded body is an unbounded payload for the room — see `#lib/message-bounds.ts`.
 */
export const askQuestion = command(
  z.strictObject({
    body: z.string(),
    // Negative ids address the captured fixture, so `.positive()` would refuse the reference's own
    // alerts. `z.number().int()` is exactly what `Number.isInteger` allowed.
    alertId: z.number().int()
  }),
  async ({ body: submittedBody, alertId }) => {
    ensureDatabase();
    const { locals } = getRequestEvent();
    const user = requireUser(locals);
    const shortCode = requireRoomShortCode(locals);

    /*
      Its own bucket — `'question'`, not `'message'`. Asking and chatting are separately budgeted
      upstream, and merging them would let a burst of chat silence the Q&A path or the reverse.
    */
    const limit = consumeRateLimit('question', user.id);
    if (!limit.allowed) {
      error(
        429,
        `You are asking questions too quickly. Try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.`
      );
    }

    const body = submittedBody.trim();
    if (!body) error(400, 'A question is required.');
    if (body.length > MAX_QUESTION_BODY) error(400, 'That question is too long.');

    const alertAuthorId =
      alertId > 0
        ? (db
            .select({ senderId: alerts.senderId })
            .from(alerts)
            .where(and(eq(alerts.roomShortCode, shortCode), eq(alerts.id, alertId)))
            .get()?.senderId ?? null)
        : (capturedRoomItem(
            { id: user.id, emailHash: hashEmail(user.email) },
            'alert',
            alertId,
            shortCode
          )?.senderId ?? null);

    if (alertAuthorId === null) error(404, 'Alert not found.');

    const isAnswer = alertAuthorId === user.id;
    const now = new Date();

    db.transaction((transaction) => {
      transaction
        .insert(alertQuestions)
        .values({
          alertId,
          /*
            The room, written on the row. Required by the schema, so this cannot be forgotten — and
            for a question on a CAPTURED alert it is the only room anchor that will ever exist: the
            fixture alert has no row to derive it from. See `alert-log.ts`.
          */
          roomShortCode: shortCode,
          senderId: user.id,
          body,
          createdAt: now
        })
        .run();

      if (isAnswer) {
        /*
          ROOM-SCOPED, added 2026-08-28 with the column. `alertId` alone is not a room: a CAPTURED
          alert carries the same negative id in every room that serves the fixture, so this sweep
          would have marked another room's outstanding questions answered. Real alert ids are
          globally unique and were never at risk — which is exactly why the hole was invisible.
        */
        transaction
          .update(alertQuestions)
          .set({ answeredAt: now })
          .where(
            and(
              eq(alertQuestions.roomShortCode, shortCode),
              eq(alertQuestions.alertId, alertId),
              isNull(alertQuestions.answeredAt)
            )
          )
          .run();
      }

      // Captured alerts have negative ids and live in the fixture, not the alerts table, so only a
      // real row gets its cached counters synchronised. Read through `transaction` so the rows just
      // written are included.
      if (alertId > 0) {
        const rows = transaction
          .select({ answeredAt: alertQuestions.answeredAt })
          .from(alertQuestions)
          .where(
            and(eq(alertQuestions.roomShortCode, shortCode), eq(alertQuestions.alertId, alertId))
          )
          .all();
        transaction
          .update(alerts)
          .set({
            questionCount: rows.length,
            questionAnswered: rows.length > 0 && rows.every((row) => row.answeredAt !== null)
          })
          .where(and(eq(alerts.roomShortCode, shortCode), eq(alerts.id, alertId)))
          .run();
      }
    });
  }
);

/*
  ── THE Q&A THREAD ACTS ────────────────────────────────────────────────────────────────────────────

  Two more commands, here rather than in `message-actions.remote.ts`, and the cut is the same one the
  docblock at the top of this file makes: what a command may do to a QUESTION is a different question
  from what it may do to a message, and the machinery that file is organised around does not apply.

  `message-actions.remote.ts` forks every branch on `id < 0` because a captured MESSAGE or ALERT has
  no row and its edits are recorded as overrides. A question always has a row — `askQuestion` writes
  one even when the alert it hangs off is a captured fixture — so there is nothing to fork, and its
  `{ kind, id }` target shape (`z.enum(['alert', 'chat'])`) has no third value that would mean this.

  ## Both address the question by its own id, and the reference cannot

  `manageChatReactions(this.isQAMsg ? this.qaMsgID : this.msg._id, …, this.msgIndex)` — bundle byte
  1,354,136 — sends the PARENT ALERT's id and the entry's ORDINAL, and `deleteQAAlert({qaMsgID,
  msgIndex})` (byte 1,159,097) does the same. That is forced on it: its `qa` entries live inside the
  alert document and have no identity of their own.

  Ours do. **DIVERGENCE, deliberate**, recorded here and in `db/schema.ts`: an ordinal is a race —
  delete the second question while somebody is reacting to the third and the reaction lands on what
  is now the third — and a stable id is not.
*/

/** One question, resolved only if it belongs to THIS room. Null is a miss and a miss is a 404. */
function questionInRoom(questionId: number, shortCode: string) {
  return (
    db
      .select({
        id: alertQuestions.id,
        alertId: alertQuestions.alertId,
        senderId: alertQuestions.senderId,
        reactionsJson: alertQuestions.reactionsJson
      })
      .from(alertQuestions)
      /*
        The room predicate is on the ROW, not on a join to `alerts`: a question asked on a captured
        alert has no alert row to join to, and refusing to resolve it here would make the thread's
        menu inert for exactly the entries the thread can display. See `alert-log.ts`.
      */
      .where(and(eq(alertQuestions.roomShortCode, shortCode), eq(alertQuestions.id, questionId)))
      .get() ?? null
  );
}

/**
 * `chatReactions` with `type: "alerts"` on a Q&A entry — one emoji toggled on one question.
 *
 * ## The entitlement is decided HERE, and that is the whole point of the setting
 *
 * `enableQAReactions` gates the control in the menu (`sourceMessageBehavior.react`), and a gate that
 * only removes a menu entry is not a gate: this command is reachable by anyone who can call it. An
 * owner who left the setting off gets a room where the reaction cannot be added, not a room where
 * the button is merely hidden.
 *
 * Read with `=== true` from the room's own configuration, which the SERVER fetches — never asserted
 * by the caller. Absent means off, which is what a room that has never configured it means.
 *
 * ## Who may react: anyone who can see the question
 *
 * The same answer the message and alert reaction branches give, and for the same reason — a reaction
 * is not an authority over the row, it is a mark that the reacting member made. `questionInRoom`
 * refusing everything outside this room is therefore the whole access check.
 */
export const reactToQuestion = command(
  z.strictObject({
    questionId: z.number().int().positive(),
    reactionKey: z.string().trim().min(1),
    reactionEmoji: z.string().trim().min(1)
  }),
  async ({ questionId, reactionKey, reactionEmoji }) => {
    ensureDatabase();
    const { locals } = getRequestEvent();
    const user = requireUser(locals);
    const shortCode = requireRoomShortCode(locals);

    const config = await readRoomConfig(locals, shortCode, user.email);
    if (config.settings?.enableQAReactions !== true) {
      error(403, 'Reactions are off for this room.');
    }

    const question = questionInRoom(questionId, shortCode);
    if (!question) error(404, 'Question not found.');

    const reactions = toggleReaction(
      parseReactions(question.reactionsJson),
      reactionKey,
      reactionEmoji,
      hashEmail(user.email)
    );

    db.update(alertQuestions)
      .set({ reactionsJson: JSON.stringify(reactions) })
      .where(and(eq(alertQuestions.roomShortCode, shortCode), eq(alertQuestions.id, questionId)))
      .run();
  }
);

/**
 * `deleteQAAlertMsg` — removing one entry from a Q&A thread.
 *
 * ## The rule is the message delete's rule, deliberately
 *
 * A presenter may remove anything in their room; anyone else may remove only their own, and only
 * when the room allows it. That last clause is `usersCanDeleteOwnMsgs`, checked on the server for
 * the reason `message-actions.remote.ts` gives at length: the room's menu not offering the control
 * is not the same as the endpoint refusing it.
 *
 * The reference does NOT check the setting on this path — `deleteQAAlert` goes straight to the
 * socket — but it does check it on the chat path (`canDeleteOwnMessage`, byte 1,158,799), and a
 * thread entry is a message a member wrote. Applying the narrower rule to both is a divergence in
 * the direction of the owner's stated intent.
 *
 * ## The alert's cached counters are recomputed, in the same transaction
 *
 * `question_count` and `question_answered` are a cache of these rows, and the Q&A button reads them.
 * Removing a row without recounting leaves the button claiming a question that is gone — and
 * recounting rather than decrementing is what `askQuestion` already does, for the reason stated
 * there: a decrement cannot be replayed or repaired.
 */
export const deleteQuestion = command(
  z.strictObject({ questionId: z.number().int().positive() }),
  async ({ questionId }) => {
    ensureDatabase();
    const { locals } = getRequestEvent();
    const user = requireUser(locals);
    const shortCode = requireRoomShortCode(locals);
    const isPresenter = isPresenterRole(user.role);

    const question = questionInRoom(questionId, shortCode);
    if (!question) error(404, 'Question not found.');

    if (!isPresenter) {
      if (question.senderId !== user.id) error(403, 'Not yours to delete.');
      const config = await readRoomConfig(locals, shortCode, user.email);
      if (config.settings?.usersCanDeleteOwnMsgs !== true) {
        error(403, 'Not yours to delete.');
      }
    }

    const { alertId } = question;

    db.transaction((transaction) => {
      transaction
        .delete(alertQuestions)
        .where(and(eq(alertQuestions.roomShortCode, shortCode), eq(alertQuestions.id, questionId)))
        .run();

      // Captured alerts have no row to update — the page derives their count from the fixture plus
      // whatever rows survive, so the delete above is the whole of it.
      if (alertId > 0) {
        const rows = transaction
          .select({ answeredAt: alertQuestions.answeredAt })
          .from(alertQuestions)
          .where(
            and(eq(alertQuestions.roomShortCode, shortCode), eq(alertQuestions.alertId, alertId))
          )
          .all();
        transaction
          .update(alerts)
          .set({
            questionCount: rows.length,
            questionAnswered: rows.length > 0 && rows.every((row) => row.answeredAt !== null)
          })
          .where(and(eq(alerts.roomShortCode, shortCode), eq(alerts.id, alertId)))
          .run();
      }
    });
  }
);
