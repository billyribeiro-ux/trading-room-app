import { error } from '@sveltejs/kit';
import { command, getRequestEvent } from '$app/server';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { MAX_QUESTION_BODY } from '$lib/message-bounds';
import { requireRoomShortCode, requireUser } from '$lib/server/auth';
import { capturedRoomItem } from '$lib/server/captured-room';
import { hashEmail } from '$lib/server/connection';
import { db, ensureDatabase } from '$lib/server/db';
import { alertQuestions, alerts } from '$lib/server/db/schema';
import { consumeRateLimit } from '$lib/server/rate-limit';

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
 * room's Q&A thread would display it. `alert_questions` has no room column of its own, so nothing
 * downstream could catch it either.
 *
 * `null` means exactly one thing: no alert with that id exists in THIS room. `senderId` is
 * `notNull`, so a found row always answers; and `capturedRoomItem` is given the room too, so a
 * captured alert that is hidden or belongs elsewhere is a miss as well. Refusing on `null` is
 * therefore the whole check, and it fails closed.
 *
 * ## The length bound is NEW
 *
 * This accepted a body of any size. A question lands in a thread every reader of that alert loads,
 * so an unbounded body is an unbounded payload for the room — see `$lib/message-bounds.ts`.
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
        .values({ alertId, senderId: user.id, body, createdAt: now })
        .run();

      if (isAnswer) {
        transaction
          .update(alertQuestions)
          .set({ answeredAt: now })
          .where(and(eq(alertQuestions.alertId, alertId), isNull(alertQuestions.answeredAt)))
          .run();
      }

      // Captured alerts have negative ids and live in the fixture, not the alerts table, so only a
      // real row gets its cached counters synchronised. Read through `transaction` so the rows just
      // written are included.
      if (alertId > 0) {
        const rows = transaction
          .select({ answeredAt: alertQuestions.answeredAt })
          .from(alertQuestions)
          .where(eq(alertQuestions.alertId, alertId))
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
