import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  One name, TWO values, and only one of them is a setting.

  Upstream `recordingReminder` is both a room setting and a local runtime flag, and the gate at
  bundle byte 2,477,770 requires both:

    O(5, !sessData.recordingReminder || !e.recordingReminder || e.micDisabled
         || micMuted || (!isRecordingPaused && isRecording) ? -1 : 5)

  This room had the local flag and rendered the banner from it alone, so the OWNER could not switch
  the reminder off at all. That is the failure this guards, and it is invisible: the banner works,
  it just ignores the setting.

  The shared name is also the trap. Reading `recordingReminder` in the page and assuming it is the
  setting - or wiring the setting onto that same identifier - would silently collapse two values
  into one and make the local flag unsettable. The two names are asserted to stay distinct.
*/

const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

describe('the recording reminder needs the owner AND the runtime flag', () => {
  it('reads the policy from sessData under its own name', () => {
    expect(code).toContain(
      'const recordingReminderAllowed = $derived(data.sessData?.recordingReminder === true);'
    );
  });

  it('keeps the local runtime flag separate from the setting', () => {
    // The recorder raises and lowers this one; it is not the owner's value and must stay writable.
    expect(code).toContain('let recordingReminder = $state(false);');
    expect(code).not.toContain('let recordingReminder = $derived');
  });

  it('ANDs the policy into the banner gate rather than beside it', () => {
    expect(code).toContain(
      '{#if recordingReminderAllowed && recordingReminder && (!recording || recordingPaused)}'
    );
  });

  it('renders the banner nowhere the policy is not consulted', () => {
    /*
      A second, ungated copy of the banner would restore the exact bug. Every place the local flag
      gates markup must carry the policy term with it, so the count of gated sites and the count of
      policy-carrying sites are the same.
    */
    const gatedSites = code.split('{#if recordingReminder').length - 1;
    const policySites = code.split('{#if recordingReminderAllowed && recordingReminder').length - 1;
    expect(gatedSites).toBe(policySites);
  });
});
