import { z } from 'zod';

/**
 * The four poll mutations' arguments, validated at the wire boundary.
 *
 * Shaped like `notes-command.ts` and `swing-alerts-command.ts`, with one deliberate difference:
 * those wrap each payload in `{cmd, data}` because they transcribe a captured websocket command
 * whose envelope carries the name. A poll is not sent that way — the reference posts
 * `savePollToStorage` and `sendPoll` as separate calls — so the schemas here ARE the payloads, and
 * the name is the exported remote function rather than a literal inside the object.
 *
 * **They live in a `.ts` and not in `polls.remote.ts` because a remote module cannot export a
 * constant.** That is the same reason `#lib/message-bounds.ts` exists, and the same reason these
 * bounds are declared once here rather than written out beside each command.
 */

/**
 * Caps on the two free-text fields, and on how many choices a poll may carry.
 *
 * **These are NEW.** As form actions the question and the choices were stored exactly as posted
 * with no length check of any kind — `poll-actions-contract.test.ts` pinned that as *"no validation
 * beyond the JSON shape"*, which was an accurate description of an unbounded, presenter-reachable
 * write. The composer has no `maxlength` on either input, so the only thing bounding a saved poll
 * was how much a presenter felt like typing, and nothing at all bounded a hand-posted one.
 *
 * They are set well above anything the composer can produce, so no reachable poll is refused: the
 * question box is a two-row `<textarea>` and a choice is a one-line `<input>`. The point is a
 * ceiling on the endpoint, not validation of the shape — a poll question is prose, and this
 * repository does not invent a format for prose.
 */
export const POLL_QUESTION_MAX_LENGTH = 1_000;
export const POLL_CHOICE_MAX_LENGTH = 500;
export const POLL_MAX_CHOICES = 100;

/**
 * A poll a presenter is saving or sending: the question, and the ordered choices.
 *
 * **Nothing is trimmed and an empty choice is accepted**, and both are load-bearing rather than an
 * oversight. The Pre-Canned tab is a scratchpad — the reference's own `savePollToStorage` validates
 * nothing at all — so a half-written draft has to be storable, and `poll-actions-contract.test.ts`
 * pins `'  Long or short?  '` and `[' Long ', '']` surviving the round trip. A `.trim()` here would
 * silently rewrite a presenter's draft, and `.min(1)` would refuse a row the composer can produce.
 *
 * `choices` crosses as a REAL ARRAY. As a form action it was `JSON.stringify`d by the browser and
 * re-parsed by `parsePollChoices` on the server, so "not an array of strings" was a runtime string
 * parse that answered `null` and became a hand-written `fail(400)`. devalue carries the array
 * itself, so that parse — and the failure mode that came with it — is gone rather than relocated.
 */
export const pollDraftSchema = z.strictObject({
  question: z.string().max(POLL_QUESTION_MAX_LENGTH),
  choices: z.array(z.string().max(POLL_CHOICE_MAX_LENGTH)).max(POLL_MAX_CHOICES)
});

/**
 * The saved poll being removed.
 *
 * `.positive()` is tighter than the `Number.isInteger(pollId)` guard it replaces, which admitted
 * `0` and negatives and let them reach the WHERE clause to match nothing. `saved_polls.id` is an
 * autoincrement primary key, so every real id is at least 1 and nothing legitimate is refused.
 */
export const deleteSavedPollSchema = z.strictObject({
  pollId: z.number().int().positive()
});

/**
 * A member's vote: the INDEX of the choice, which is what the wire carries.
 *
 * `.nonnegative()` rather than `.positive()` — index 0 is the first choice, and this is the one
 * place in the room where zero is a legitimate value. The upper bound cannot be a schema: it is
 * `choices.length` of whichever poll is active in the CALLER's room, so the command re-checks it
 * against the row it resolves.
 */
export const pollAnswerSchema = z.strictObject({
  choiceIndex: z.number().int().nonnegative()
});
