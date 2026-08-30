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

/** Comments stripped: this file's citations quote every literal it asserts on. */
const code = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const modal = code(MODAL);
const pane = code(PANE);

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
    expect(pane).toContain('<option value={mode}>{REPEAT_MODE_LABEL[mode]}</option>');
    /* The values are what `isRepeatMode` refuses anything else against, and are untouched. */
    expect(REPEAT_MODES).toEqual(['', 'daily', 'weekly']);
  });

  it('carries the select s captured aria-label', () => {
    expect(pane).toContain('aria-label="Repeat Scheduled Alert"');
  });
});

describe('PAM-08 and PAM-09 — the three strings that were ours', () => {
  it('says "Ignore weekends?" where it said "Skip weekends"', () => {
    expect(pane).toContain('Ignore weekends?');
    expect(pane).not.toContain('Skip weekends');
  });

  it('carries the timezone NOTE, underlined as the reference underlines it', () => {
    /*
      A `datetime-local` input has no timezone in it, so a presenter scheduling for 09:00 had no way
      to know whose 09:00 it is. `[2,"text-decoration","underline"]` is const 60.
    */
    expect(pane).toContain('NOTE: All times should be on');
    expect(pane).toContain('class="tz-underline">your local time zone</span>');
    expect(pane).toContain('text-decoration: underline;');
  });

  it('labels both fields the way the reference labels them', () => {
    expect(pane).toContain('Send on this date &amp; time:');
    expect(pane).toContain('<span>Repeat:</span>');
    /* The bare words they replaced would still match a looser assertion, so both are exact. */
    expect(pane).not.toContain('<span>Send on</span>');
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
