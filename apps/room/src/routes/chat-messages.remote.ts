import { error } from '@sveltejs/kit';
import { command, getRequestEvent } from '$app/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { MAX_MESSAGE_BODY } from '#lib/message-bounds.js';
import { isChatTab, type ChatTab } from '#lib/types.js';
import { stripHtmlToText } from '#lib/chat-plain-text.js';
import { isPresenterRole, requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import { capturedRoomItem } from '#lib/server/captured-room.js';
import { isEmptyChatHtml, sanitizeChatHtml } from '#lib/server/chat-html.js';
import { hashEmail } from '#lib/server/connection.js';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { messages, users } from '#lib/server/db/schema.js';
import { consumeRateLimit } from '#lib/server/rate-limit.js';
import { refuseIfChatMuted } from '#lib/server/chat-mute.js';
import { publishChatToRoom } from '#lib/server/room-events.js';

/*
  Posting to the room's chat: a new message, and a reply to one.

  ## Why they are one module, and what putting them side by side revealed

  They are the same act — a row in `messages`, published on the `chat` channel — differing only in
  whether it quotes another row. As two actions eighty lines apart they had FOUR copies of the same
  reasoning between them, and the copies had drifted. Three ways, each found by reading them
  together and each fixed here:

    1. THE MUTE APPLIED TO ONE OF THEM. `sendMessage` refused while a live `chat_mutes` row existed;
       `replyMessage` did not look. A muted member could not send and could reply, into the same log,
       and `mute24` is a control that says it stops somebody posting for a day.
    2. THE LENGTH BOUND APPLIED TO ONE OF THEM. `MAX_MESSAGE_BODY` was checked on send and not on
       reply, so the bound was advisory to anyone who used the other path.
    3. The rate limit and the `chat` publish were written out twice, verbatim.

  (1) and (2) are BEHAVIOUR CHANGES and are called out as such rather than slipped in with a move: a
  muted member who could previously reply now cannot, and a reply over 4,000 characters is now
  refused. Both are pinned in `message-alert-action-contract.test.ts`, in both directions, so the
  asymmetry cannot come back by accident and its removal is visible to whoever reads that file next.

  The fix for all three is the same shape: the invariant is declared once, above, and both commands
  call it. That is the entire argument for converting by FEATURE rather than by call site.
*/

/**
 * The rate limit both share, and its message.
 *
 * `consumeRateLimit` is a consuming read — calling it costs a token — so it is called exactly once
 * per command and never speculatively.
 */
function requireMessageAllowance(userId: number): void {
  const limit = consumeRateLimit('message', userId);
  if (!limit.allowed) {
    error(
      429,
      `You are sending messages too quickly. Try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.`
    );
  }
}

/*
  The mute guard moved to `#lib/server/chat-mute.ts` on 2026-08-23 and is NOT duplicated here.

  Private chat needs the identical answer and a `.remote.ts` module cannot export a non-remote
  helper, so the invariant left rather than being written a second time — which is the same argument
  this module's own header makes for declaring it once and having both commands call it.
*/
/**
 * Tell the room.
 *
 * The capture carries chat on `/sess/{sessionID}/chat/{channel}/` — a sibling of the alerts channel,
 * sent with `socketService.send("chatMsg", {channel, msg, n})` and drained into `chatLog[channel]`
 * with an `emit("chatMsg")`. Without the publish, a message reached the database and nobody else's
 * screen until they reloaded.
 *
 * `room` here is the CHANNEL the capture keys by, carried so a later per-channel subscription can
 * filter without changing the wire shape. It is not the room short code, which is the session.
 */
function announceChatMessage(
  shortCode: string,
  channel: string,
  user: { id: number; email: string },
  message: { body: string | null | undefined; fromAdmin: boolean }
) {
  /*
    `publishChatToRoom`, not `publishToRoom`, and the difference is the one bit this frame carries
    that is DIFFERENT for each recipient.

    `body` and `fromAdmin` go no further than the hub: they are read there to answer "does this
    mention YOU" against the name each listener joined with, and the payload below is unchanged —
    still an id, a hash and a channel, still no text. That is the whole reason the decision is made
    server-side. `room` may be an admin channel, so a frame carrying bodies would put admin chat on
    every subscriber's wire, which is why the client cannot be handed the message and asked itself.

    It closes the divergence found on 2026-08-16: a member with `visibilityChangeEnabled` and a
    hidden tab does not refetch on a chat frame, so without this bit the one message addressed to
    them by name waited until they came back. Upstream keeps mentions alive on that branch —
    `visibilityChangeEnabled && !appHasFocus ? te.isMention && emit('chatMsg', te) : push(...)`.
  */
  publishChatToRoom(
    shortCode,
    { senderId: user.id, senderEmailHash: hashEmail(user.email), room: channel },
    message
  );
}

/**
 * A new chat message.
 *
 * ## Rich text, when the editor sent it
 *
 * `bodyHtml` arrives only from the RTE modal. It is sanitised HERE, on the server, and the sanitised
 * value is what is stored — never the submitted one. A client-side sanitiser is a convenience for
 * the person typing; it is not a control, because the request can be made without the client.
 *
 * `body` is then derived from the sanitised HTML with its tags stripped, so every existing reader
 * keeps working: the plain-text segment renderer, the mention rule, the popup, search, and any
 * client that never learns this column exists. Two representations of one message, and the HTML one
 * is never the only copy.
 *
 * The derivation is `stripHtmlToText` from `#lib/chat-plain-text` — the same function the composer's
 * optimistic copy uses. It was three lines written out here and three identical lines written out
 * there, with a docstring on the client one saying "the two must agree". Now they are one function,
 * so they cannot disagree. **That closes `TODO.md` row AF's first half**: two of the three copies of
 * this derivation were these; the third, `isEmptyChatHtml`, answers a different question and stays.
 *
 * ## The channel is checked
 *
 * `messages.room` is a channel label, not a foreign key, so nothing in the schema stops an arbitrary
 * string being written. The client only ever renders the two channels in `ChatTab`, so a crafted
 * request could park messages in a channel nobody displays — invisible content that still occupies
 * the table and still arrives in every reader's payload on the next poll.
 */
export const sendMessage = command(
  z.strictObject({
    body: z.string(),
    bodyHtml: z.string().optional(),
    room: z.custom<ChatTab>((value) => typeof value === 'string' && isChatTab(value), {
      message: 'Unknown channel.'
    })
  }),
  async ({ body: submittedBody, bodyHtml: submittedHtml, room }) => {
    ensureDatabase();
    const { locals, request } = getRequestEvent();
    const user = requireUser(locals);
    const shortCode = requireRoomShortCode(locals);

    requireMessageAllowance(user.id);

    const sanitizedHtml = submittedHtml?.trim() ? sanitizeChatHtml(submittedHtml.trim()) : '';
    const bodyHtml = sanitizedHtml && !isEmptyChatHtml(sanitizedHtml) ? sanitizedHtml : null;
    const body = bodyHtml ? stripHtmlToText(bodyHtml) : submittedBody.trim();

    if (!body) error(400, 'A message is required.');
    if (body.length > MAX_MESSAGE_BODY) error(400, 'That message is too long.');

    await refuseIfChatMuted(request, shortCode, user);

    /*
      Both segments of `/sess/${sessionID}/chat/${channel}/`.

      `roomShortCode` is the SESSION — which room this message belongs to. The local `room` is the
      CHANNEL within it, which is why it is almost always 'main'. They are different things and the
      original keeps both; conflating them is what let one room read another's chat.
    */
    db.insert(messages)
      .values({
        roomShortCode: shortCode,
        room,
        senderId: user.id,
        body,
        bodyHtml,
        isAdmin: isPresenterRole(user.role),
        createdAt: new Date()
      })
      .run();

    announceChatMessage(shortCode, room, user, {
      body,
      fromAdmin: isPresenterRole(user.role)
    });
  }
);

/**
 * A reply, which quotes the message it answers.
 *
 * The quoted name and body are copied onto the new row rather than joined at read time, because the
 * original can be edited or deleted afterwards and a reply should keep showing what it replied to.
 *
 * ## Negative ids are the captured fixture
 *
 * `capturedRoomItem` serves the reference's own seeded messages, which live in the fixture rather
 * than the table and carry negative ids. It is given the room as well, so a captured message
 * belonging elsewhere is a miss — and a miss is a 404, which is what refuses a reply that would
 * quote across the room boundary.
 *
 * `replyToMessageId` stays null for those, because there is no row to point at; the copied name and
 * body are the whole record of what was quoted.
 */
export const replyMessage = command(
  z.strictObject({
    body: z.string(),
    /*
      No `.positive()` here, unlike every other id in this application, and the exception is the
      point: a negative id is how the captured fixture is addressed. `z.number().int()` is the whole
      constraint the action had (`Number.isInteger`), preserved deliberately.
    */
    messageId: z.number().int()
  }),
  async ({ body: submittedBody, messageId }) => {
    ensureDatabase();
    const { locals, request } = getRequestEvent();
    const user = requireUser(locals);
    const shortCode = requireRoomShortCode(locals);

    requireMessageAllowance(user.id);

    const body = submittedBody.trim();
    if (!body) error(400, 'A message is required.');
    // NEW: the bound `sendMessage` always had and this path never did.
    if (body.length > MAX_MESSAGE_BODY) error(400, 'That message is too long.');

    // NEW: the mute `sendMessage` always honoured and this path never looked at.
    await refuseIfChatMuted(request, shortCode, user);

    const original =
      messageId < 0
        ? capturedRoomItem(
            { id: user.id, emailHash: hashEmail(user.email) },
            'chat',
            messageId,
            shortCode
          )
        : db
            .select({
              id: messages.id,
              room: messages.room,
              body: messages.body,
              senderName: users.displayName
            })
            .from(messages)
            .innerJoin(users, eq(messages.senderId, users.id))
            .where(and(eq(messages.roomShortCode, shortCode), eq(messages.id, messageId)))
            .get();

    // Refuses a message id from another room, so a reply cannot quote across the boundary.
    if (!original) error(404, 'Message not found.');

    db.insert(messages)
      .values({
        roomShortCode: shortCode,
        room: original.room,
        senderId: user.id,
        body,
        replyToMessageId: original.id > 0 ? original.id : null,
        replyToName: original.senderName,
        replyToBody: original.body,
        isAdmin: isPresenterRole(user.role),
        createdAt: new Date()
      })
      .run();

    announceChatMessage(shortCode, original.room, user, {
      body,
      fromAdmin: isPresenterRole(user.role)
    });
  }
);
