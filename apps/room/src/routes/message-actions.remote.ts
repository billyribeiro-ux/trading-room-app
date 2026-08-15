import { error } from '@sveltejs/kit';
import { command, getRequestEvent } from '$app/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { stripHtmlToText } from '$lib/chat-plain-text';
import { MAX_MESSAGE_BODY } from '$lib/message-bounds';
import { isPresenterRole, requireRoomShortCode, requireUser } from '$lib/server/auth';
import { capturedRoomItem } from '$lib/server/captured-room';
import { isEmptyChatHtml, sanitizeChatHtml } from '$lib/server/chat-html';
import { hashEmail } from '$lib/server/connection';
import { db, ensureDatabase } from '$lib/server/db';
import {
  alertQuestions,
  alerts,
  capturedItemOverrides,
  chatMutes,
  hiddenRoomItems,
  messages
} from '$lib/server/db/schema';
import { toggleReaction } from '$lib/reaction-toggle';
import { parseReactions } from '$lib/server/reactions';

/*
  Everything the message context menu does — delete, edit, react, mark answered, mute for 24 hours,
  show to all.

  ## One command, six operations, and why it is not six commands

  The reference has one `messageAction` endpoint and the client has three entry points into it. Six
  separate commands would have been more idiomatic for remote functions and WRONG here, because the
  six share almost everything: the room scope, the captured-fixture resolution, the override upsert,
  and — for four of them — the "presenter, or the author" rule. Split six ways, those become six
  copies, which is the failure that made `sendMessage` and `replyMessage` drift apart.

  What the six do NOT share is their argument shape, and as a form action that was invisible: every
  field was an optional string, so `delete` sent a `targetUserId` nothing read and `edit` sent none
  at all, and nothing anywhere checked. `z.discriminatedUnion` on `operation` gives each one exactly
  its own fields and refuses the rest.

  ## Three tightenings, none of them a move

    1. `kind` is `z.enum(['alert', 'chat'])`. It was `String(data.get('kind') ?? '')` compared with
       `kind === 'alert'`, so EVERY other string — including a typo and the empty string — fell
       through to the chat branch and acted on the messages table.
    2. `mute24`'s `targetUserId` is `.positive()`. `Number.isInteger` let 0 and negatives through to
       insert a mute row against a user id that cannot exist.
    3. The edit path is bounded by `MAX_MESSAGE_BODY`. It had no bound at all — the same asymmetry
       `replyMessage` had against `sendMessage`, found the same way and fixed the same way.

  ## Negative ids are the captured fixture, and that is why every branch forks

  Captured items have no row anywhere: they live in the fixture and their edits are recorded as
  OVERRIDES. So each operation decides between "update a table" and "record an override" before it
  can look anything up. `hidden_room_items` is the same idea for deletion — the load filters the
  fixture through it, which makes a delete stick for everyone rather than only for the browser that
  asked.
*/

/** Both tables use the same two coordinates, and both are validated the same way. */
const target = {
  /*
    Deny by default. `'alert'` or `'chat'` — see tightening (1) above for what this replaced.
  */
  kind: z.enum(['alert', 'chat']),
  /*
    No `.positive()`: a NEGATIVE id addresses the captured fixture, which is the whole reason every
    branch below forks. `z.number().int()` is exactly what `Number.isInteger` allowed.
  */
  id: z.number().int()
};

const messageActionArgs = z.discriminatedUnion('operation', [
  z.strictObject({ operation: z.literal('delete'), ...target }),
  z.strictObject({ operation: z.literal('markAnswered'), ...target }),
  z.strictObject({ operation: z.literal('showMsgToAll'), ...target }),
  z.strictObject({
    operation: z.literal('mute24'),
    ...target,
    targetUserId: z.number().int().positive()
  }),
  z.strictObject({
    operation: z.literal('reaction'),
    ...target,
    reactionKey: z.string().trim().min(1),
    reactionEmoji: z.string().trim().min(1)
  }),
  z.strictObject({
    operation: z.literal('edit'),
    ...target,
    newBody: z.string(),
    newBodyHtml: z.string().optional()
  })
]);

/**
 * The message context menu's whole surface.
 *
 * Returns nothing. The action returned `{ success: true }` and, for a reaction, the recomputed
 * `reactions` map — which the client never read: it calls `invalidateAll()` and re-renders from the
 * row, because the row is the one copy nobody can disagree with. Handing back a second copy would
 * invite exactly that disagreement.
 */
export const messageAction = command(messageActionArgs, async (args) => {
  ensureDatabase();
  const { locals } = getRequestEvent();
  const user = requireUser(locals);
  const room = requireRoomShortCode(locals);
  const isPresenter = isPresenterRole(user.role);
  const { kind, id } = args;

  /*
    Resolves a captured item, or null for a real one. Given the room, so a captured item that is
    hidden here or belongs elsewhere is a miss.
  */
  const captured =
    id < 0
      ? capturedRoomItem({ id: user.id, emailHash: hashEmail(user.email) }, kind, id, room)
      : null;

  /** Writes one override column, leaving the others as they were. */
  function recordOverride(
    evidenceKey: string,
    patch: { answered?: boolean; body?: string; reactionsJson?: string }
  ) {
    const now = new Date();
    db.insert(capturedItemOverrides)
      .values({
        evidenceKey,
        roomShortCode: room,
        ...patch,
        updatedByUserId: user.id,
        updatedAt: now
      })
      .onConflictDoUpdate({
        /*
          The conflict target is the whole key, room included. Keyed on `evidenceKey` alone this
          upsert would collapse every room's edit of the same captured item into one row, so editing
          it here rewrote it everywhere.
        */
        target: [capturedItemOverrides.evidenceKey, capturedItemOverrides.roomShortCode],
        // Only the columns in `patch` — an edit must not wipe an existing reaction override.
        set: { ...patch, updatedByUserId: user.id, updatedAt: now }
      })
      .run();
  }

  /*
    Every lookup is room-scoped, and that is load-bearing rather than tidy.

    `id` comes from the caller. Without the room predicate a presenter — who is a presenter only in
    their OWN room — could delete or edit any alert or message on the deployment by naming its id,
    and the ownership check would pass because the row really is theirs in the room it came from.
    Resolving nothing outside this room is what makes that check mean what it says.
  */
  const findAlert = () =>
    db
      .select()
      .from(alerts)
      .where(and(eq(alerts.roomShortCode, room), eq(alerts.id, id)))
      .get();

  const findMessage = () =>
    db
      .select()
      .from(messages)
      .where(and(eq(messages.roomShortCode, room), eq(messages.id, id)))
      .get();

  /*
    The toggle all three branches apply — the two real ones and the captured override — and the same
    one the page's optimistic copy uses. It was these nine lines written out three times; two of the
    copies were in this file and the third was in `+page.svelte` with no way to notice if they
    diverged. `$lib/reaction-toggle.ts` states the four rules once.
  */
  const toggledReactions = (source: string, key: string, emoji: string) =>
    toggleReaction(parseReactions(source), key, emoji, hashEmail(user.email));

  if (args.operation === 'delete') {
    /*
      Captured items carry negative ids and live in the fixture, not in a table, so there is no row
      to delete. Record the deletion instead. Same authorisation rule as a real delete — a presenter
      may remove anything, anyone else only what the capture attributes to them.
    */
    if (id < 0) {
      if (!captured) error(404, 'Message not found.');
      if (!isPresenter && captured.senderId !== user.id) error(403, 'Not yours to delete.');
      db.insert(hiddenRoomItems)
        .values({
          evidenceKey: captured.evidenceKey,
          // Hiding the fixture's copy in THIS room only — every room is served the same item.
          roomShortCode: room,
          hiddenByUserId: user.id,
          hiddenAt: new Date()
        })
        .onConflictDoNothing()
        .run();
      return;
    }

    if (kind === 'alert') {
      const alert = findAlert();
      if (!alert) error(404, 'Alert not found.');
      if (!isPresenter && alert.senderId !== user.id) error(403, 'Not yours to delete.');
      /*
        The questions belong to the alert, so they go with it. Left behind they are unreachable —
        nothing renders a question whose alert is gone — but they still count towards the pending
        total that decides whether the Q&A button flashes.
      */
      db.transaction((transaction) => {
        // `alertQuestions` reaches its room through `alertId`, which the lookup above just proved
        // belongs here.
        transaction.delete(alertQuestions).where(eq(alertQuestions.alertId, id)).run();
        transaction
          .delete(alerts)
          .where(and(eq(alerts.roomShortCode, room), eq(alerts.id, id)))
          .run();
      });
      return;
    }

    const message = findMessage();
    if (!message) error(404, 'Message not found.');
    if (!isPresenter && message.senderId !== user.id) error(403, 'Not yours to delete.');
    db.delete(messages)
      .where(and(eq(messages.roomShortCode, room), eq(messages.id, id)))
      .run();
    return;
  }

  if (args.operation === 'reaction') {
    const { reactionKey: key, reactionEmoji: emoji } = args;

    // Captured items: same toggle, written to the overlay instead of to a row. Anyone who can see
    // the item may react to it, which is what the real branches below allow too.
    if (id < 0) {
      if (!captured) error(404, 'Message not found.');
      const stored = db
        .select({ reactionsJson: capturedItemOverrides.reactionsJson })
        .from(capturedItemOverrides)
        .where(
          and(
            eq(capturedItemOverrides.roomShortCode, room),
            eq(capturedItemOverrides.evidenceKey, captured.evidenceKey)
          )
        )
        .get();
      // Start from the override if one exists, otherwise from the fixture's own reactions.
      const reactions = toggledReactions(
        stored?.reactionsJson ?? captured.reactionsJson,
        key,
        emoji
      );
      recordOverride(captured.evidenceKey, { reactionsJson: JSON.stringify(reactions) });
      return;
    }

    if (kind === 'alert') {
      const alert = findAlert();
      if (!alert) error(404, 'Alert not found.');
      db.update(alerts)
        .set({ reactionsJson: JSON.stringify(toggledReactions(alert.reactionsJson, key, emoji)) })
        .where(and(eq(alerts.roomShortCode, room), eq(alerts.id, id)))
        .run();
      return;
    }

    const message = findMessage();
    if (!message) error(404, 'Message not found.');
    db.update(messages)
      .set({ reactionsJson: JSON.stringify(toggledReactions(message.reactionsJson, key, emoji)) })
      .where(and(eq(messages.roomShortCode, room), eq(messages.id, id)))
      .run();
    return;
  }

  if (args.operation === 'edit') {
    /*
      RICH TEXT on the edit path — `editChatMessage` with `newMsg` set to the editor's content.

      Sanitised here and derived here, exactly as the post path does it, and for the same reason: the
      submitted value is never what gets stored.

      CHAT ONLY. The reference's rich edit branch is inside `if ("chat" === this.logType)`, the
      alerts table has no such column, and an alert edited through the presenter's prompt is plain
      text. Reading the field for an alert would be accepting input nothing can store.

      AND IT ALWAYS REWRITES BOTH COLUMNS. A chat edit sets `body_html` to the sanitised HTML or to
      NULL — never "leave whatever was there". Otherwise editing a rich message through the PLAIN
      prompt (which is what happens when the owner has since turned the editor off) would write a new
      `body` and leave the old markup behind, and the renderer picks the column: the message would
      keep displaying the sentence it no longer says.
    */
    const submittedHtml = kind === 'chat' ? (args.newBodyHtml ?? '').trim() : '';
    const sanitizedHtml = submittedHtml ? sanitizeChatHtml(submittedHtml) : '';
    const newBodyHtml = sanitizedHtml && !isEmptyChatHtml(sanitizedHtml) ? sanitizedHtml : null;

    const newBody = newBodyHtml ? stripHtmlToText(newBodyHtml) : args.newBody.trim();
    if (!newBody) error(400, 'A message is required.');
    // NEW: the bound the post path always had and this one never did.
    if (newBody.length > MAX_MESSAGE_BODY) error(400, 'That message is too long.');

    /*
      The edit rule, which is NOT the delete rule. A presenter may edit anybody's message EXCEPT
      another presenter's — `!isOwner && (!isPresenter || isAdmin)` — so an admin message can only be
      edited by whoever wrote it. An alert is presenter-only outright.
    */
    if (id < 0) {
      if (!captured) error(404, 'Message not found.');
      if (kind === 'alert') {
        if (!isPresenter) error(403, 'Presenters only.');
      } else if (captured.senderId !== user.id && (!isPresenter || captured.isAdmin)) {
        error(403, 'Not yours to edit.');
      }
      recordOverride(captured.evidenceKey, { body: newBody });
      return;
    }

    if (kind === 'alert') {
      if (!isPresenter) error(403, 'Presenters only.');
      if (!findAlert()) error(404, 'Alert not found.');
      db.update(alerts)
        .set({ body: newBody })
        .where(and(eq(alerts.roomShortCode, room), eq(alerts.id, id)))
        .run();
      return;
    }

    const message = findMessage();
    if (!message) error(404, 'Message not found.');
    if (message.senderId !== user.id && (!isPresenter || message.isAdmin)) {
      error(403, 'Not yours to edit.');
    }
    db.update(messages)
      .set({ body: newBody, bodyHtml: newBodyHtml })
      .where(and(eq(messages.roomShortCode, room), eq(messages.id, id)))
      .run();
    return;
  }

  // Everything past here is presenter-only, exactly as the action's single guard had it.
  if (!isPresenter) error(403, 'Presenters only.');

  if (args.operation === 'markAnswered') {
    /*
      Chat only. The action's guard was `operation === 'markAnswered' && kind === 'chat'`, and an
      alert fell through to the unsupported-operation refusal at the bottom — so this reproduces that
      404-shaped outcome as an explicit 400 rather than by falling off the end.
    */
    if (kind !== 'chat') error(400, 'Unsupported message operation.');
    if (id < 0) {
      if (!captured) error(404, 'Message not found.');
      recordOverride(captured.evidenceKey, { answered: true });
      return;
    }
    db.update(messages)
      .set({ answered: true })
      .where(and(eq(messages.roomShortCode, room), eq(messages.id, id)))
      .run();
    return;
  }

  if (args.operation === 'mute24') {
    const createdAt = new Date();
    db.insert(chatMutes)
      .values({
        /*
          A mute is granted in the room it was issued in. The controller models the same thing as
          role 3 CHAT MUTED on a `room_users` membership, which is per room — muting somebody here
          must not silence them in a room this presenter has no authority over.

          `unmuteChat` in `chat-mute.remote.ts` is the other half.
        */
        roomShortCode: room,
        targetUserId: args.targetUserId,
        mutedByUserId: user.id,
        expiresAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000),
        createdAt
      })
      .run();
    return;
  }

  /*
    `showMsgToAll` writes nothing and always succeeded, and that is reproduced rather than removed.
    The reference's own handler is a client-side broadcast; the server's part is to say yes. It is
    still presenter-gated by the guard above, which is the only thing this endpoint contributes.
  */
});
