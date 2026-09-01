import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { REPEAT_MODES, REPEAT_MODE_LABEL } from './scheduled-alert.js';

/**
 * PAM-05, PAM-07, PAM-08 and PAM-09 — the send-later pane, and the one finding among them that is
 * not a label.
 *
 * **PAM-05 is a lost-work bug.** `O(71, showSendLater ? -1 : 71)` at byte 2,139,561 removes "Post
 * Alert" while the scheduler is open. This room rendered the whole scheduling pane inline and kept
 * the green button beside it, so a presenter who had filled in a date and a repeat could still send
 * the alert immediately — losing the schedule they had just typed, with nothing on screen to say
 * so. The other three are text.
 *
 * Source assertions, and the reason is the same for all four: every one is a `{#if}` or a literal
 * inside `app-post-alert-modal`, whose render needs the whole composer's props and a room. What can
 * regress is the gate and the string.
 */

const MODAL = readFileSync(new URL('./components/PostAlertModal.svelte', import.meta.url), 'utf8');
const PANE = readFileSync(new URL('./components/ScheduledAlerts.svelte', import.meta.url), 'utf8');
/*
  PAM-07, PAM-08 and PAM-09 are all FIELDS, and on 2026-09-01 the fields left the pane for
  `ScheduledAlertFields.svelte` — `source-size-contract` refused `ScheduledAlerts.svelte` the 22
  lines that transcribing `XTe` cost it, and the answer that rule gives is extract, not raise.

  Read as its own file rather than concatenated onto `pane`, because WHICH component holds a literal
  is part of what these cases assert. A joined string would keep every case green through a move
  that put the timezone note in the manage table, and the point of naming a component is that it is
  the wrong place for some things.
*/
const FIELDS = readFileSync(
  new URL('./components/ScheduledAlertFields.svelte', import.meta.url),
  'utf8'
);

/** Comments stripped: this file's citations quote every literal it asserts on. */
const code = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const BUNDLE = readFileSync(
  new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url),
  'utf8'
);

const modal = code(MODAL);
const pane = code(PANE);
const fields = code(FIELDS);

describe('PAM-05 — the two halves of one decision', () => {
  it('hides Post Alert while the scheduler is open', () => {
    /*
      The finding. Both were on screen, and pressing the green one discarded the schedule.

      ## The first version of this assertion could not fail

      It read `expect(branch.indexOf('{:else}')).toBeLessThan(branch.indexOf('Post Alert'))`, and
      its negative control — moving Post Alert OUT of the else so both render together — stayed
      green. `indexOf` returns **-1** when the marker is gone, and -1 is less than every index, so
      deleting the `{:else}` satisfied the very assertion that was there to require it. That is the
      same -1 trap `slice-anchor-contract` guards for slice bounds, met here in a comparison.

      Asserted as the exact structure instead. It is brittle to formatting, which is the correct
      trade for a mutual exclusion: the two buttons being in one `{#if}/{:else}` IS the feature, and
      a reformat that separates them is a change worth failing on.
    */
    expect(modal).toContain(`{#if showSendLater}
          <button class="btn btn-primary me-1" onclick={() => (showSendLater = false)}
            >{' Cancel '}</button
          >
        {:else}
          <button class="btn btn-success" onclick={postAlert}>Post Alert</button>
        {/if}`);
    /* And exactly one Post Alert button, so the else branch is the only place it can appear. */
    expect(modal.match(/>Post Alert</g)).toHaveLength(1);
  });

  it('offers "Send Later?" only when the pane is CLOSED and the room has the scheduler', () => {
    /* `O(69, !showSendLater && hasAlertScheduler ? 69 : -1)`. */
    expect(modal).toContain('{#if schedulerAvailable && !showSendLater}');
    expect(modal).toContain("{' Send Later? '}");
    expect(modal).toContain('<i class="fas fa-calendar"></i>');
  });

  it('renders the PANE only when it is open, which it did not', () => {
    /* `O(66, showSendLater && hasAlertScheduler ? 66 : -1)`. */
    expect(modal).toContain('{#if schedulerAvailable && showSendLater}');
  });

  it('closes itself after a successful schedule', () => {
    /*
      Ours, and it follows from the exclusion rather than from a captured line: leaving the pane
      open after the alert is scheduled would leave Post Alert hidden with nothing left to post.
    */
    const at = modal.indexOf('onscheduled={');
    expect(at, 'the pane is not wired').toBeGreaterThan(-1);
    expect(modal.slice(at, at + 200)).toContain('showSendLater = false;');
  });

  it('keeps the reference s surrounding spaces on both labels', () => {
    /* `v(2," Send Later? ")` and `v(1," Cancel ")` — expressions, because Svelte normalises. */
    expect(modal).toContain("{' Send Later? '}");
    expect(modal).toContain("{' Cancel '}");
  });
});

describe('PAM-07 — the select showed its own storage format', () => {
  it('labels every mode, and the type makes a missing one impossible', () => {
    /* `Record<RepeatMode, string>` — a mode added without a label does not compile. */
    expect(Object.keys(REPEAT_MODE_LABEL).sort()).toEqual([...REPEAT_MODES].sort());
    expect(REPEAT_MODE_LABEL['']).toBe('Off');
    expect(REPEAT_MODE_LABEL.daily).toBe('Daily');
    expect(REPEAT_MODE_LABEL.weekly).toBe('Weekly');
  });

  it('renders the LABEL and keeps the value on the wire', () => {
    expect(fields).toContain('<option value={mode}>{REPEAT_MODE_LABEL[mode]}</option>');
    /* The values are what `isRepeatMode` refuses anything else against, and are untouched. */
    expect(REPEAT_MODES).toEqual(['', 'daily', 'weekly']);
  });

  it('carries the select s captured aria-label', () => {
    expect(fields).toContain('aria-label="Repeat Scheduled Alert"');
  });
});

describe('PAM-08 and PAM-09 — the three strings that were ours', () => {
  it('says "Ignore weekends?" where it said "Skip weekends"', () => {
    expect(fields).toContain('Ignore weekends?');
    expect(fields).not.toContain('Skip weekends');
  });

  it('carries the timezone NOTE, underlined as the reference underlines it', () => {
    /*
      A `datetime-local` input has no timezone in it, so a presenter scheduling for 09:00 had no way
      to know whose 09:00 it is. `[2,"text-decoration","underline"]` is const 60.
    */
    expect(fields).toContain('NOTE: All times should be on');
    /*
      An INLINE style, not a class, because that is what the const is: a `2,` entry in an Angular
      const array is a style binding. This carried a scoped `.tz-underline` rule until 2026-09-01 —
      equivalent output, and one more hand-computed equivalence between this room and the capture it
      was derived from.
    */
    expect(fields).toContain(
      '<span style="text-decoration: underline">your local time zone</span>'
    );
    expect(fields).not.toContain('tz-underline');
    /* Const 59, `[1,"mb-3","mt-1"]`, on the note itself — likewise the values rather than a rule. */
    expect(fields).toContain('<p class="mb-3 mt-1">');
  });

  it('labels both fields the way the reference labels them', () => {
    expect(fields).toContain('Send on this date &amp; time:');
    expect(fields).toContain('<span class="m-0 me-1">Repeat:</span>');
    /* The bare words they replaced would still match a looser assertion, so both are exact. */
    expect(fields).not.toContain('<span>Send on</span>');
  });
});

describe('PAM-11 — scheduling asks first, and it used to happen on one click', () => {
  it('quotes the DATE back before anything is scheduled', () => {
    /*
      `bootbox.confirm("Send this alert on: " + o.toString() + …)` at byte 2,130,310. The date is
      the whole reason for the question: a `datetime-local` with a typo in it — a month, a year, an
      AM for a PM — schedules an alert to the entire room at a time nobody meant, and the only way
      to notice was to open the manage table afterwards and read it back.
    */
    expect(pane).toContain('onconfirm(`Send this alert on: ${new Date(sendOnLocal).toString()} ?`');
    /* The send is INSIDE the callback, which is what makes it a question rather than a notice. */
    const at = pane.indexOf('onconfirm(`Send this alert on:');
    expect(pane.slice(at, at + 200)).toContain('void send();');
  });

  it('does NOT quote an identity, which is PAM-10 reaching this sentence', () => {
    /*
      Upstream ends "send as: <nick> (<email>) ?" because its form lets a presenter post under
      someone else's name. This room refuses those two fields and derives the sender from the
      session, so the clause would quote values that cannot vary.
    */
    expect(pane).not.toContain('send as:');
    expect(pane).not.toContain('sendLaterAsNick');
    expect(pane).not.toContain('sendLaterAsEmail');
  });

  it('says so afterwards, in the reference s own words', () => {
    /* `bootbox.alert("Alert scheduled OK.")` — full stop included. */
    expect(pane).toContain("onalert('Alert scheduled OK.')");
  });

  it('takes both dialogs as props rather than owning them', () => {
    /*
      Two components raising bootboxes from different places is how one replaces the other mid-read,
      which `dialogs.svelte.ts` records at length. `PostAlertModal` threads the room's own pair
      through, and `ModalHost` supplies the same `onConfirm` that `PollPanel` beside it uses.
    */
    expect(pane).toContain('onalert: (message: string) => void;');
    expect(pane).toContain('onconfirm: (message: string, accept: () => void) => void;');
    expect(modal).toContain('{onalert}');
    expect(modal).toContain('{onconfirm}');
  });
});

/**
 * Is a `<label>` still OPEN at `index` — i.e. is the control there WRAPPED by one?
 *
 * The question the two ids turn on, and it is not the same question as "is there a `</label>`
 * nearby". `<div class="check">` holds the checkbox and a SIBLING `<label for>`, so a nearby closing
 * tag proves nothing either way; what matters is whether the most recent label tag before the
 * control opened one or closed one.
 *
 * `fields` already has its comments stripped by `code()`, and the strip here is a second one on
 * purpose: this predicate takes a raw source string, and this component's docblocks quote both forms
 * of the markup they explain — an unclosed `<label` inside prose would otherwise answer for the code
 * at whichever call site forgot.
 */
const labelIsOpenAt = (source: string, index: number) => {
  expect(index, 'the control must be findable').toBeGreaterThan(-1);
  const before = source.slice(0, index).replace(/<!--[\s\S]*?-->/g, '');
  return before.lastIndexOf('<label') > before.lastIndexOf('</label>');
};

/**
 * Const 63 — `[1,"form-group","d-flex","align-items-center","justify-content-between"]` — carried on
 * the Repeat row's own element. It is a `<label>` here rather than upstream's `<div>`, which is the
 * one deliberate difference: upstream's inner label has no `for` and its select no `id`, so its
 * caption is unassociated; wrapping keeps the association without inventing an id the dump lacks.
 */
const REPEAT_ROW = '<label class="form-group d-flex align-items-center justify-content-between">';

describe('PAM-11 — every class on this pane resolves in the shipped sheet', () => {
  /*
    The condition that makes transcribing a class list an improvement rather than decoration. This
    repository does not ship a class no rule reads, and seven of these arrived on 2026-09-01 from
    `app-post-alert-modal`'s consts 59, 63, 64, 65 and 69 — so each is looked up rather than assumed
    to be "in Bootstrap", which is the kind of claim that stays true until a sheet is trimmed.
  */
  const SHEET = readFileSync(new URL('../../css/complete-app-styles.css', import.meta.url), 'utf8');

  it.each([
    'mb-3',
    'mt-1',
    'form-group',
    'd-flex',
    'align-items-center',
    'justify-content-between',
    'm-0',
    'me-1',
    'form-select',
    'form-select-sm',
    'form-check',
    'form-check-input',
    'mb-2'
  ])('.%s has a rule', (utility) => {
    expect(
      SHEET.includes(`.${utility} {`) || SHEET.includes(`.${utility}{`),
      `.${utility} is on the send-later pane but has no rule in the shipped stylesheet`
    ).toBe(true);
  });

  it('and the pane no longer carries a local rule standing in for a captured one', () => {
    /*
      `.tz-note`, `.tz-underline` and `.check` were hand-written equivalents of consts 59, 60 and 69,
      kept on a reason that was never checked and is false — *"this sheet is scoped, so they are
      written as rules rather than as bootstrap utility classes"*. Svelte's scoping ADDS a hash
      class; it does not strip global ones.

      `.row` and `.field` stay and are asserted present, because they are this component's own: the
      reference has no counterpart for either, its three controls being siblings inside the modal's
      footer form rather than a row of their own.
    */
    expect(fields).not.toContain('.tz-note');
    expect(fields).not.toContain('.tz-underline');
    expect(fields).not.toContain('.check {');
    expect(fields).toContain('.row {');
    expect(fields).toContain('.field {');
  });
});

describe('PAM-08 and PAM-09 — the two captured ids, TRANSCRIBED 2026-09-01', () => {
  /*
    ── A PREFERENCE IS NOT AN IMPOSSIBILITY ────────────────────────────────────────────────────────

    `reference-const-coverage-contract.test.ts` listed both ids as residuals with this reason:

    > ids this room does not need. Upstream pairs each control with a separate `<label for>`; ours
    > WRAPS the input in its label, which associates them without an id at all. A better association,
    > not a missing one.

    Both associations are valid HTML and the wrap is arguably the more robust — there is no id to
    break. But "better" is a preference, and the decision here is to match the dump wherever matching
    is POSSIBLE rather than wherever it is preferable.

    It was possible, and the measurement is the same one that settled the note-modal titles the same
    day: an id may be a literal when its component is mounted once. `PostAlertModal` is mounted at a
    single site behind `name === 'alert'`, so both are document-unique exactly as upstream's are.
  */

  it('reads both consts, with the id AND name the datetime field carries', () => {
    expect(BUNDLE).toContain(
      '["type","datetime-local","id","alert-send-later-time","name","alert-send-later-time",' +
        '3,"ngModelChange","ngModel"]'
    );
    expect(BUNDLE).toContain(
      '["type","checkbox","id","ignoreWeekendsChk",1,"form-check-input",3,"ngModelChange",' +
        '"ngModel","ngModelOptions"]'
    );
    expect(BUNDLE).toContain('["for","ignoreWeekendsChk"]');
  });

  it('pairs each control with its own label, as the reference does', () => {
    expect(fields).toContain('<label class="me-1" for="alert-send-later-time">');
    expect(fields).toContain('id="alert-send-later-time"');
    expect(fields).toContain('name="alert-send-later-time"');
    expect(fields).toContain('<label for="ignoreWeekendsChk">Ignore weekends?</label>');
    expect(fields).toContain('id="ignoreWeekendsChk"');
    /* `form-check-input` comes with the const and is carried. */
    expect(fields).toContain('class="form-check-input"');
  });

  it('and no longer WRAPS the two of them, because two associations would be one too many', () => {
    /*
      Leaving the wrap in place beside a `for` is not an error, and that is exactly why it is worth
      asserting: it would be invisible. One control, one label, one association.

      Scoped to the two controls this describe block is about, and the scoping is the finding. The
      first version of this assertion refused `<label class="field">` outright and went red on the
      REPEAT select, which is a different case and keeps its wrap deliberately — see the test below.
      A contract that refuses a construct everywhere is not evidence about the construct here.
    */
    expect(fields).toContain('<div class="field">');
    /* Const 69, `[1,"form-check","mb-2"]` — the reference's own wrapper since 2026-09-01. */
    expect(fields).toContain('<div class="form-check mb-2">');
    expect(labelIsOpenAt(fields, fields.indexOf('type="datetime-local"'))).toBe(false);
    expect(labelIsOpenAt(fields, fields.indexOf('type="checkbox"'))).toBe(false);
  });

  it('leaves the REPEAT select wrapped, because upstream has nothing to transcribe there', () => {
    /*
      ── THE ONE CONTROL WHERE THE WRAP IS AN IMPROVEMENT AND STAYS ──────────────────────────────

      ```js
      d(12,"label",64), v(13,"Repeat:")
      64  [1,"m-0","me-1"]
      ["aria-label","Repeat Scheduled Alert",1,"form-select","form-select-sm",3,"ngModelChange",
       "ngModel"]
      ```

      The label const carries no `for` and the select const carries no `id`. Upstream's Repeat label
      is UNASSOCIATED — clicking it does nothing and a screen reader reaches the select only through
      its `aria-label`. There is no id to transcribe, so the rule that moved the two ids above ("match
      the dump wherever matching is possible") says nothing here, and the wrap is a real improvement
      over the reference rather than a deviation from it.

      Asserted rather than left implicit because the obvious tidy-up — "make all three consistent" —
      would delete an association and gain nothing.
    */
    expect(BUNDLE).toContain('["aria-label","Repeat Scheduled Alert",1,"form-select",');
    expect(BUNDLE).not.toContain('"Repeat Scheduled Alert","id"');
    /*
      Anchored on the Repeat span and walked BACKWARDS to the label that opens it, not forwards from
      the first `<label class="field">` in the file. Under the negative control for the test above —
      re-wrapping the datetime field — a forward slice found THAT label and this case failed for a
      reason that had nothing to do with Repeat. A control must fail the case it is aimed at.
    */
    const span = fields.indexOf('<span class="m-0 me-1">Repeat:</span>');
    expect(span, 'the Repeat caption must be findable').toBeGreaterThan(-1);
    const opening = fields.lastIndexOf(REPEAT_ROW, span);
    expect(opening, 'the Repeat label must be findable').toBeGreaterThan(-1);
    const closing = fields.indexOf('</label>', opening);
    expect(closing, 'the Repeat label must be closed').toBeGreaterThan(-1);
    const wrap = fields.slice(opening, closing);
    /*
      The same predicate the test above uses, asserted TRUE here, and asserted FIRST so that an
      unwrap trips it rather than tripping a string case on the way past. That is what makes it a
      measurement rather than a spelling check: one call site says "no label is open at this
      control", the other says "one is", and no predicate that always answers the same way satisfies
      both.
    */
    expect(labelIsOpenAt(fields, fields.indexOf('aria-label="Repeat Scheduled Alert"'))).toBe(true);
    expect(wrap).toContain('<span class="m-0 me-1">Repeat:</span>');
    /*
      PAM-11, 2026-09-01: the row's own consts, which the const sweep structurally cannot report.
      It is a substring search over the WHOLE application, and `form-select`, `d-flex` and `m-0` all
      occur elsewhere in this room — so a value can be absent from THIS component while the sweep
      counts it present. Found by reading the component against its const table instead.
    */
    expect(wrap).toContain('class="form-select form-select-sm"');
    expect(BUNDLE).toContain(
      '[1,"form-group","d-flex","align-items-center","justify-content-between"]'
    );
    expect(BUNDLE).toContain('[1,"m-0","me-1"]');
    expect(wrap).toContain('aria-label="Repeat Scheduled Alert"');
    expect(wrap).not.toContain('for=');
  });

  it('the PREMISE that makes the ids safe — one mount, one modal name', () => {
    /*
      A fact about another file, so it is read rather than argued. A second `<PostAlertModal>`, or a
      `{#each}` around it, would put two of each id in one document while every word of the reasoning
      above still read as true.
    */
    const host = readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8');
    expect(host.match(/<PostAlertModal\b/g) ?? []).toHaveLength(1);
    expect(host).toContain("open={name === 'alert'}");
  });
});
