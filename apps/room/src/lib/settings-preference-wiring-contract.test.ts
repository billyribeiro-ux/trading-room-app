import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  The settings modal's checkboxes, and whether each one REACHES the thing it claims to control.

  This is the quietest defect class in the room, and it has now produced three separate bugs.

  `updateSettingCheck` in `ModalHost.svelte` reports every checkbox as
  `onPreferenceChange(preferenceKeyByInputId[input.id] ?? input.id, checked)`. The `?? input.id`
  fallback means an id with no entry in that table is still persisted — under the ELEMENT ID. The
  page reads preferences by their reference names, so the write and the read never meet, and
  nothing anywhere fails: the label flips, the POST returns 200, the value is durable, and the
  behaviour never changes. "Start recording sound" was off for anyone who turned it off, and the
  sound played anyway.

  So this file asserts the WIRE, end to end, for every preference where a control and a consumer
  both exist:

    modal checkbox id -> reference preference name -> live state on the page.

  The middle column is not inferred from the id. Every name is read out of the decoded
  `app-user-settings-modal.full.js` at runtime, from the `setPreference` call the reference's own
  handler makes, so a name typed from memory fails here.

  Source-level for the reason `badge-row-reveal.test.ts` gives: these are client-state assignments
  that SSR never exercises, so a rendered assertion is identical whether the wire exists or has
  been cut.
*/

const SETTINGS = readFileSync(
  new URL('../../docs/source/components/app-user-settings-modal.full.js', import.meta.url),
  'utf8'
);
const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
const MODAL = readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8');

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const pageCode = stripComments(PAGE);
const modalCode = stripComments(MODAL);

/**
 * The four wires repaired on 2026-08-14. Each already had BOTH ends built — a rendered checkbox and
 * a live consumer — and no middle.
 */
const WIRES = [
  {
    id: 'app-recording-start-sound',
    preference: 'recordingStartSound',
    handler: 'recordingStartSoundOnChange',
    assignment: "if (key === 'recordingStartSound') recordingStartSound = value;"
  },
  {
    id: 'app-recording-stop-sound',
    preference: 'recordingStopSound',
    handler: 'recordingStopSoundOnChange',
    assignment: "if (key === 'recordingStopSound') recordingStopSound = value;"
  },
  {
    id: 'presenter-push-to-talk',
    preference: 'pushToTalk',
    handler: 'pushToTalkOnChange',
    assignment: "if (key === 'pushToTalk') pushToTalk = value;"
  },
  {
    id: 'presenter-speech-recognition',
    preference: 'doSpeechReco',
    handler: 'speechRecoCCOnChange',
    assignment: "if (key === 'doSpeechReco') doSpeechReco = value;"
  },
  {
    id: 'app-speech-reco-overlay',
    preference: 'showSpeechRecoOverlay',
    handler: 'showSpeechRecoOverlayOnChange',
    assignment: "if (key === 'showSpeechRecoOverlay') {"
  }
] as const;

describe.each(WIRES)(
  '$id is wired all the way through',
  ({ id, preference, handler, assignment }) => {
    it('the preference name is the one the reference persists, not one inferred from the id', () => {
      const from = SETTINGS.indexOf(`${handler}() {`);
      expect(from, `${handler} must exist in the decoded settings modal`).toBeGreaterThan(-1);
      const body = SETTINGS.slice(from, SETTINGS.indexOf('\n    }', from));
      expect(body).toContain(`'${preference}'`);
      expect(body).toContain('setPreference');
    });

    it('the modal renders the checkbox', () => {
      expect(modalCode).toContain(`id="${id}"`);
      expect(modalCode).toContain(`settingChecks['${id}']`);
    });

    it('the modal translates the element id to that preference name', () => {
      /*
      Without this row the value is still persisted, under the element id, by the `?? input.id`
      fallback — which is exactly why "it saves fine" was never evidence that it worked.
    */
      expect(modalCode).toContain(`'${id}': '${preference}'`);
    });

    it('the page moves the preference into the state its consumer reads', () => {
      expect(pageCode).toContain(assignment);
    });
  }
);

describe('the wire has no silent break points', () => {
  it('the fallback that caused this is still the thing being guarded', () => {
    /*
      If someone later removes `?? input.id`, unmapped checkboxes stop persisting rather than
      persisting somewhere useless. That would be a defensible change — but it would also make
      every assertion above pass for a different reason, so it should be a deliberate edit that
      trips this test, not a silent one.
    */
    expect(modalCode).toContain('preferenceKeyByInputId[input.id] ?? input.id');
  });

  it('pushToTalk is $state, because $derived over loadedSettings would not react', () => {
    /*
      `loadedSettings` is a plain object, seeded once and mutated by `savePreference`. A `$derived`
      reading it holds its page-load value until an unrelated dependency changes, so push-to-talk
      would have started working only after a reload — the bug half-fixed, which is worse than the
      bug, because it looks tested.
    */
    expect(pageCode).toContain('let pushToTalk = $state(loadedSettings.pushToTalk === true);');
    expect(pageCode).not.toContain('$derived(loadedSettings.pushToTalk');
  });

  it('the caption overlay is seeded from the preference, not from false', () => {
    /*
      The bug this replaced: `subtitles` was `$state(false)` seeded from nothing, while the navbar
      checkbox seeded and rendered from `soundChecks['presentation-subtitles']`. The checkbox read
      "on" by default and the overlay was off, and ticking it changed neither.

      `!== false` is the reference's own gate — `isSpeechRecoOverlayEnabled()` is
      `null == e || !!e` (`app-presentationarea.full.js:2409-2412`), so absent and null both enable.
      `=== true` here would silently disable captions for every viewer who has never touched the
      checkbox, which is the exact defect the `soundChecks` seed was fixed for once already.
    */
    expect(pageCode).toContain(
      'let subtitles = $state(loadedSettings.showSpeechRecoOverlay !== false);'
    );
  });

  it('both controls for the overlay stay in agreement', () => {
    // The modal is the second control; without this the navbar checkbox would contradict it.
    expect(pageCode).toContain("soundChecks['presentation-subtitles'] = value;");
  });

  it('the consumers the wires feed are still there', () => {
    // If a consumer is deleted, the assignment above becomes dead and this file should say so.
    expect(pageCode).toContain('pushToTalkShouldUnmute(event, { pushToTalk, micMuted })');
    expect(pageCode).toContain('!doSpeechReco');
    expect(pageCode).toContain("&& recordingStartSound) playSoundEffect('recordingStart')");
    expect(pageCode).toContain("&& recordingStopSound) playSoundEffect('recordingStop')");
  });
});
