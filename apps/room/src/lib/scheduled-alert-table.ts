/*
  THE MANAGE TABLE — `app-scheduled-alerts-modal`'s two pieces that are neither markup nor
  arithmetic, decoded from the v4 bundle on 2026-08-31.

  `#lib/scheduled-alert.ts` owns WHEN an alert fires and what the modes are called; that file says in
  its own header that the arithmetic is its own module because it is the part that is wrong at 23:00
  on the last day of a month. This is the complement: the two VALUES the manage table needs, both of
  them transcriptions with a byte offset, and both of them things a component cannot be asked about
  without mounting it.

  They are here rather than in `scheduled-alert.ts` because that module is imported by the SERVER —
  `src/lib/server/scheduled-alerts.ts` runs its rescheduling — and a badge class name and a browser
  confirmation sentence have no business crossing that boundary.

  Same shape as `chatModeConfirmPrompt` in `#lib/chat-mode.ts`, and for the same recorded reason:
  when the capture's wording lives in one exported function, the two call sites cannot disagree about
  it and one test pins it.
*/

import type { RepeatMode } from '#lib/scheduled-alert.js';

/**
 * SCH-02 — the repeat pill's colour, per mode. **These three names were explicitly not read before.**
 *
 * `docs/decoded/alert-scheduler-filter-labels.md` decoded this table on 2026-08-15 and stopped at
 * exactly this point, in these words: *"The repeat `span` carries a three-way `ngClass` keyed on, in
 * order: `"" === e.repeat || !e.repeat`, `"daily" === e.repeat`, `"weekly" === e.repeat`. **The class
 * NAMES are in the const table and were not read; do not guess them.**"*
 *
 * They are read now, at byte 2,406,323, and they are not in a const table at all — which is why
 * looking for them there found nothing. Angular compiles a multi-key `ngClass` object literal into a
 * shared pure-function factory beside the template functions:
 *
 * ```js
 * const fMe = (t, n) => n.sendOn,
 *       mMe = (t, n, e) => ({ "text-bg-danger": t, "text-bg-info": n, "text-bg-warning": e });
 * ```
 *
 * and the row template calls it positionally, byte 2,406,725:
 * `z("ngClass", $a(9, mMe, "" === e.repeat || !e.repeat, "daily" === e.repeat, "weekly" === e.repeat))`.
 * So argument one is "off", two is daily, three is weekly, and the mapping is unambiguous.
 *
 * **The colours are the row's meaning, not decoration.** `text-bg-danger` on "off" is the one that
 * would never have been guessed: red for the alert that is NOT going to repeat, where a reader
 * predicting a palette would have put grey. It is the state a presenter most needs to spot in a table
 * of otherwise identical rows — this one fires once and then it is gone — and upstream spends its
 * loudest colour on saying so.
 *
 * `Record<RepeatMode, string>` for the reason `REPEAT_MODE_LABEL` gives: a mode added without a
 * colour does not compile, so the table cannot grow a row that renders an unstyled pill.
 */
export const REPEAT_BADGE_CLASS: Record<RepeatMode, string> = {
  '': 'text-bg-danger',
  daily: 'text-bg-info',
  weekly: 'text-bg-warning'
};

/**
 * SCH-01 — the question asked before a scheduled alert is deleted, byte 2,407,145.
 *
 * ```js
 * removeScheduledAlert(e){
 *   bootbox.confirm("Are you sure you want to delete this alert by " + e.alert.n + ". text: " + e.alert.txt,
 *     i => { i && this.appService.sendServerCommand("removeScheduledAlert", {scheduledAlertID: e._id}) })
 * }
 * ```
 *
 * `docs/decoded/alert-scheduler-filter-labels.md` records the punctuation and why it is odd:
 * *"The confirm string is built by concatenation, not a template literal, and the punctuation is
 * exact: a full stop and a space before `text:`, and no closing question mark. Reproduce it
 * verbatim."* A template literal is used here because the concatenation was an artefact of the
 * transpiler, not a decision — what is reproduced is the STRING, and the test asserts the string.
 *
 * **The room had no question at all.** `remove(id)` deleted on the click, so a presenter who meant to
 * press Remove on the 09:30 row and hit the 09:35 one destroyed an alert with no undo, no record of
 * what it said, and no way to know which one had gone — the table simply came back one row shorter.
 * That is a delete of the presenter's own unsent words, which is the case a confirmation exists for;
 * and quoting the TEXT is what makes the answer checkable, exactly as PAM-11 quotes the date.
 */
export function removeScheduledAlertQuestion(senderName: string, body: string): string {
  return `Are you sure you want to delete this alert by ${senderName}. text: ${body}`;
}
