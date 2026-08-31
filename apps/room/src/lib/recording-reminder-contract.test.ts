import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
/*
  The media STATE moved to `room/media.svelte.ts` on 2026-08-15 — every flag the interface renders
  from. The TRANSPORT stayed in the page, so assertions about it are unchanged; only flags moved.
*/
const mediaClass = readFileSync(new URL('./room/media.svelte.ts', import.meta.url), 'utf8');

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

/*
  `.mainAppNav` became `RoomNavbar.svelte` on 2026-08-15 — the third of the five template regions.
  Reference-bundle assertions are untouched; ours follow the markup into the component.
*/
const NAVBAR = readFileSync(new URL('./components/RoomNavbar.svelte', import.meta.url), 'utf8');

const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

describe('the recording reminder needs the owner AND the runtime flag', () => {
  it('reads the policy from sessData under its own name', () => {
    /*
      The sixteen view gates moved to `room/gates.ts` in Phase 5 slice 27, and each became a
      GETTER — a `$derived` class field would initialise before the constructor assigned the thunks
      it reads, which `RoomFiles.filesHidden` paid for.
    */
    const gatesCode = readFileSync(new URL('./room/gates.ts', import.meta.url), 'utf8');
    expect(gatesCode).toContain('return this.#session().sessData?.recordingReminder === true;');
  });

  it('keeps the local runtime flag separate from the setting', () => {
    // The recorder raises and lowers this one; it is not the owner's value and must stay writable.
    expect(mediaClass).toContain('#recordingReminder = $state(false);');
    expect(mediaClass).not.toContain('#recordingReminder = $derived');
  });

  /**
   * `RNB-03`, 2026-08-31 — the `micMuted` term, which this file's own docblock has quoted since it
   * was written and this assertion did not require.
   *
   * The five-term gate is transcribed at the top of this file, `micMuted` included, and the
   * assertion below pinned three of the five. A presenter with the microphone muted was therefore
   * nagged "You are not recording!" for as long as the mute lasted, over the recording menu, and
   * the test that would have caught it was quoting the answer two screens up. That is the shape
   * `AGENTS.md` DPE rule 4 is about: a load-bearing claim in prose is a claim nothing checks.
   *
   * `micDisabled`, the remaining term, is deliberately NOT required. The only thing that raises it
   * is the `audioServerDisableMic` subscriber at bundle byte 2,503,063, whose very next statement is
   * `this.recordingReminder=!1` — so on the one path that can set the fourth term, the second is
   * already false. `G11` records that this room has no producer for that event, so requiring it
   * would model a signal we never receive in order to re-check something upstream has answered.
   */
  it('ANDs the policy AND the microphone into the banner gate rather than beside them', () => {
    expect(NAVBAR).toContain(
      '{#if recordingReminderAllowed && media.recordingReminder && !media.micMuted && (!media.recording || media.recordingPaused)}'
    );
  });

  it('renders the banner nowhere the policy is not consulted', () => {
    /*
      A second, ungated copy of the banner would restore the exact bug. Every place the local flag
      gates markup must carry the policy term with it, so the count of gated sites and the count of
      policy-carrying sites are the same.
    */
    // Counted across BOTH files, so moving the banner cannot make the count agree by emptying one.
    const both = code + NAVBAR;
    const gatedSites = both.split('media.recordingReminder &&').length - 1;
    const policySites =
      both.split('{#if recordingReminderAllowed && media.recordingReminder').length - 1;
    expect(gatedSites).toBe(policySites);
  });
});
