import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { sourceMessageBehavior } from '#lib/message-behavior.js';

/**
 * `editQAMessage` — EDITING ONE ENTRY OF A Q&A THREAD.
 *
 * ## The absence this closes was invisible, and that is the point
 *
 * `message-behavior.ts` carried `&& !input.isQaMessage` on its `edit` rule, and
 * `qa-thread-contract.test.ts` pinned it under a heading reading *"the three entries that are DEAD
 * upstream"*. The argument for all three was the same: each acts on `this.msg._id`, and a Q&A entry
 * has none.
 *
 * **It is true of two of them and false of `edit`.** Byte 1,351,806, read whole:
 *
 * ```js
 * bootbox.prompt({ title: `Edit ${this.isQAMsg ? "qa message" : "alert"} by <strong>${this.msg.n}:</strong>`,
 *                  inputType: "textarea", value: this.msg.txt,
 *   callback: i => { if (i) { const o = i.trim();
 *     this.isQAMsg ? sendServerCommand("editQAMessage",    {qaMsgID: this.qaMsgID, msgIndex: this.msgIndex, newAlertMsg: o})
 *                  : sendServerCommand("editAlertMessage", {alertID: this.msg._id, newAlertMsg: o}) } } })
 * ```
 *
 * The Q&A arm sends parent-plus-ordinal — the very shape the docblock cites for the controls that DO
 * work. `edit` was filed with the dead ones on the strength of a sentence rather than a read, and the
 * cost was undetectable by every other gate here: a suppressed menu item raises no alert, sends
 * nothing, breaks no test, and leaves no `INERT_ACTIONS` row. **A missing control is quieter than an
 * inert one**, which is why this file asserts the rule from the capture rather than from the
 * behaviour of the code that implements it.
 *
 * ## What is pinned
 *
 * The gate (the alerts rule, with no Q&A term and no self-edit clause), the routing (a thread entry
 * must reach `editQuestion` and NEVER `messageAction`), and the server's authority.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const REMOTE = readFileSync(`${ROOT}routes/alert-questions.remote.ts`, 'utf8');
const ACTIONS = readFileSync(`${ROOT}lib/room/message-actions.svelte.ts`, 'utf8');

/**
 * Source with its comments removed, for the assertions that test for an ABSENCE.
 *
 * This repository quotes its own symbols in prose constantly, so `not.toContain` over raw source
 * answers "no" for the wrong reason as soon as a note mentions the thing it forbids — which is
 * exactly what happened here on the first run: the Q&A arm's own comment EXPLAINS why it does not
 * call `#patchEvidence`, and that explanation made the assertion fail. Three earlier gates in this
 * repository have been caught by the same shape in the other direction, reading a transcription note
 * as an implementation.
 */
function codeOf(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** One exported command's body, bounded by the next `export const`. */
function commandBody(name: string): string {
  const from = REMOTE.indexOf(`export const ${name} = command(`);
  expect(from, `${name} is no longer exported as a command`).toBeGreaterThan(-1);
  const next = REMOTE.indexOf('\nexport const ', from + 1);
  return REMOTE.slice(from, next === -1 ? REMOTE.length : next);
}

const BASE = {
  kind: 'alert' as const,
  isQaMessage: true,
  isOwnMessage: false,
  isAdminMessage: false,
  viewerIsPresenter: false,
  viewerIsLimitedPresenter: false,
  allowDeleteOwnMessage: false,
  usersPublicReply: false,
  enableReactions: false,
  enableQaReactions: false,
  enableEditMessage: false,
  enableEditAlerts: false,
  userPrivateMessaging: false,
  userToPresenterPrivateMessaging: false,
  currentUserIsTrial: false,
  disablePrivateMessagingForTrials: false
};

describe('the menu rule is the ALERT rule, unmodified', () => {
  it('offers edit inside the thread when the setting and the role are both there', () => {
    /*
      The assertion the `!isQaMessage` term made impossible. It is stated positively rather than as
      "the term is gone", because a term can be reintroduced under a different name.
    */
    expect(
      sourceMessageBehavior({ ...BASE, viewerIsPresenter: true, enableEditAlerts: true }).edit
    ).toBe(true);
  });

  it('reproduces the capture own asymmetry: no self-edit clause on the alerts side', () => {
    /*
      Byte 1,348,838 holds both branches in one expression:

        enableEditMessage && "chat"   === logType && (canEditMessage = hashEmail(email) === msg.avt || (isP && !msg.isA))
        enableEditAlerts  && "alerts" === logType && (canEditMessage = isPresenter)

      The chat branch has a self-edit clause and the alerts branch does not. Extending it to Q&A —
      "a member may fix their own question" — is reasonable design and unevidenced, so it is refused
      here rather than added quietly.
    */
    const own = { ...BASE, enableEditAlerts: true, isOwnMessage: true, viewerIsPresenter: false };
    expect(sourceMessageBehavior(own).edit).toBe(false);
  });

  it('keeps the two settings apart', () => {
    expect(
      sourceMessageBehavior({ ...BASE, viewerIsPresenter: true, enableEditMessage: true }).edit,
      'the chat setting must not unlock the thread'
    ).toBe(false);
  });
});

describe('the command decides authority on the server', () => {
  const body = commandBody('editQuestion');

  it('refuses a non-presenter outright', () => {
    /*
      The menu not offering a control is not the same as the endpoint refusing it — the rule
      `message-actions.remote.ts` states at length and the reason `deleteQuestion` re-checks
      `usersCanDeleteOwnMsgs` server-side. A presenter check that lived only in `sourceMessageBehavior`
      would be a client assertion of authority, which is the 2026-08-07 escalation.
    */
    expect(body).toContain("if (!isPresenterRole(user.role)) error(403, 'Presenters only.');");
  });

  it('scopes the lookup and the write to the caller own room', () => {
    /*
      `questionInRoom` applies the room predicate, and the UPDATE repeats it. Both, because a lookup
      and a write that disagree about scope is how a tenancy term gets dropped in a later refactor of
      one of them.
    */
    expect(body).toContain('questionInRoom(questionId, shortCode)');
    expect(body).toContain('eq(alertQuestions.roomShortCode, shortCode)');
  });

  it('checks membership of the room BEFORE writing', () => {
    const lookup = body.indexOf('questionInRoom(questionId, shortCode)');
    const write = body.indexOf('db.update(alertQuestions)');
    expect(lookup).toBeGreaterThan(-1);
    expect(write).toBeGreaterThan(-1);
    expect(lookup, 'a 404 raised after the UPDATE is not a check').toBeLessThan(write);
  });

  it('bounds the body with the same limit asking one uses', () => {
    /*
      An edit that could not be posted as a question must not be reachable as an edit. Sharing the
      constant rather than repeating a number is what keeps the two from drifting.
    */
    expect(body).toContain('MAX_QUESTION_BODY');
    expect(body).toContain("if (!body) error(400, 'A question is required.');");
  });

  it('touches the text and nothing else', () => {
    /*
      `answeredAt` and the alert's `questionCount` / `questionAnswered` cache are what `deleteQuestion`
      recomputes, because a delete moves both. An edit moves neither, and recomputing them here would
      be work with no reader — worse, it would put a second writer on a cache with one.
    */
    expect(body).toContain('.set({ body })');
    /* Stripped, for the reason `codeOf` records: an absence asserted over prose is not an absence. */
    const code = codeOf(body);
    expect(code).not.toContain('answeredAt');
    expect(code).not.toContain('questionCount');
  });
});

describe('a thread entry reaches editQuestion and never the message endpoint', () => {
  /** The `edit` branch of `RoomMessageActions.handle`, bounded by the next action branch. */
  function editBranch(): string {
    const from = ACTIONS.indexOf("if (action === 'edit') {");
    expect(from, 'the edit branch is gone').toBeGreaterThan(-1);
    const next = ACTIONS.indexOf("if (action === 'reaction'", from);
    return ACTIONS.slice(from, next === -1 ? ACTIONS.length : next);
  }

  const branch = editBranch();

  it('routes the Q&A surface to its own command', () => {
    /*
      THE ROUTING IS THE SAFETY PROPERTY. A question id sent to `messageAction` would be read as an
      alert id or a chat id and would edit a row in the wrong table — the same reason the delete and
      the reaction branch on `surface` before doing anything, recorded there.
    */
    const qa = branch.indexOf("surface === 'qa'");
    const editMessage = branch.indexOf('this.editMessage(');
    expect(qa, 'the Q&A arm is gone').toBeGreaterThan(-1);
    expect(editMessage, 'the message arm is gone').toBeGreaterThan(-1);
    expect(qa, 'the Q&A arm must be reached first, and must return').toBeLessThan(editMessage);
    expect(branch).toContain('this.#editQuestion({ questionId: item.id, body })');
  });

  it('uses the capture own noun for the prompt title', () => {
    /*
      `Edit ${this.isQAMsg ? "qa message" : "alert"} by …` — so "qa message" is transcribed, not a
      label invented to fill the branch. The `<strong>` is dropped for the reason the alert title
      beside it drops it: this room's dialog primitive renders text, and literal tags would be worse.
    */
    expect(branch).toContain('`Edit qa message by ${item.senderName}:`');
  });

  it('does not patch evidence for a thread entry', () => {
    /*
      The alert arm rolls a local fixture row back when the server refuses. A thread entry is never a
      fixture row — `askQuestion` writes a real row even for a captured alert, which is why
      `alert_questions` carries its own `room_short_code`. There is nothing to roll back, and calling
      `#patchEvidence` with a question would write into the alert fixture under its id.
    */
    /*
      Bound to LOCALS, not inlined into the slice: `slice-anchor-contract.test.ts` refuses an
      `indexOf` written inside a `slice` call, because an anchor that silently returns -1 makes the
      slice start at the end of the string and the assertion below pass over nothing.
    */
    const qaStart = branch.indexOf("if (surface === 'qa') {");
    const alertArmStart = branch.indexOf("title: kind === 'chat' ?");
    expect(qaStart, 'the Q&A arm is gone').toBeGreaterThan(-1);
    expect(alertArmStart, 'the alert arm is gone').toBeGreaterThan(qaStart);

    const qaArm = codeOf(branch.slice(qaStart, alertArmStart));
    expect(qaArm, 'the Q&A arm is empty; is this still measuring anything?').toContain(
      '#editQuestion'
    );
    expect(qaArm).not.toContain('#patchEvidence');
  });
});
