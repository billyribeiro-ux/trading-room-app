/**
 * How long a body may be, for each of the three things a member can post.
 *
 * ## Why these are a module rather than constants in one file
 *
 * They were two `const`s at the top of `+page.server.ts` and a remote file cannot export anything
 * that is not a remote function — so when `sendMessage`, `replyMessage` and `askQuestion` moved to
 * two different `.remote.ts` modules, the choice was a shared module or the same number written
 * three times. A bound repeated per call site is a bound that gets raised in one place and left in
 * the others, which is the failure this whole conversion exists to remove.
 *
 * ## Two of the three are NEW, and that is a change rather than a move
 *
 * Only `sendMessage` ever checked a length. `replyMessage` and `askQuestion` accepted a body of any
 * size — every one of them lands in a table that every reader in the room loads on the next poll,
 * so an unbounded body is an unbounded payload for everybody, not just for the person who sent it.
 * They are bounded at the same 4,000 as a message because they ARE messages: a reply is a row in
 * `messages`, and a question is a row rendered in the same thread.
 */

/** A chat message, and a reply, which is a `messages` row too. */
export const MAX_MESSAGE_BODY = 4_000;

/** A question against an alert. Same reasoning, same size, its own name so it can diverge. */
export const MAX_QUESTION_BODY = 4_000;

/**
 * An alert. Larger because a `media` alert's body carries the composed markup for its uploads, so
 * it legitimately runs longer than anything typed by hand.
 */
export const MAX_ALERT_BODY = 8_000;
