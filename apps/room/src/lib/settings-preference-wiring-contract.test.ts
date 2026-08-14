import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { DEAD_PREFERENCE_KEYS, pruneDeadPreferenceKeys } from './dead-preference-keys';

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
const SERVER = readFileSync(new URL('../routes/+page.server.ts', import.meta.url), 'utf8');

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
  },
  {
    id: 'chat-always-scroll',
    preference: 'alwaysScrollToBottom',
    handler: 'chatAlwaysScrollToBottomChange',
    assignment: "if (key === 'alwaysScrollToBottom') alwaysScrollToBottom = value;"
  },
  {
    id: 'presenter-follow-my-screens',
    preference: 'makeUsersFollowMyScreens',
    handler: 'makeUsersFollowMyScreensOnChange',
    assignment: "if (key === 'makeUsersFollowMyScreens') makeUsersFollowMyScreens = value;"
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
  it('there is no element-id fallback: an unmapped checkbox persists NOTHING', () => {
    /*
      This assertion used to say the opposite — that `?? input.id` was still there — with a note
      that removing it should be a deliberate edit that trips this test rather than a silent one.
      It was removed deliberately, and it did trip.

      The `??` is what wrote nineteen HTML ids into every user's settings blob as if they were
      preferences. An unmapped id now persists nothing, which is honest: its checkbox has no
      consumer, so there is nothing for a stored value to restore. The guard is `if (preferenceKey)`
      — the same shape `updateSoundCheck` has always used.
    */
    expect(modalCode).not.toContain('?? input.id');
    expect(modalCode).toContain('const preferenceKey = preferenceKeyByInputId[input.id];');
    expect(modalCode).toContain(
      'if (preferenceKey) onPreferenceChange(preferenceKey, input.checked);'
    );
  });

  it('the four counts the CHANGELOG states are the ones in the source', () => {
    /*
      26 reach the handler, 1 returns early, **14 are mapped, 11 are unmapped** with no consumer —
      and the dead list is 19, which answers a DIFFERENT question: every id that could have been
      written as junk, i.e. the 26 minus the 6 mapped before this work minus the early-returning
      one. The dead list does NOT shrink as wires are added: `chat-always-scroll` is mapped now, but
      the junk it wrote under its element id before that is still in people's blobs.

      Was 12/13, then 13/12 when `chat-always-scroll` landed, now 14/11 with
      `presenter-follow-my-screens`. This assertion has gone red on every one of those and been
      updated deliberately each time, which is the point of pinning it.

      Pinned because I gave two wrong counts writing this up — fifteen, then fourteen — by counting
      `app-disable-video`, which was already reaching `savePreference` by its raw id, and
      `pm-window-layout`, which never went through the fallback. A number stated in prose and
      nowhere else is a number that drifts; these are now read from the files.
    */
    const reaching = MODAL.split('onchange={updateSettingCheck}').length - 1;
    const table = /const preferenceKeyByInputId[\s\S]*?\n    \};/.exec(modalCode)?.[0] ?? '';
    const mapped = (table.match(/': '/g) ?? []).length;

    expect(reaching).toBe(26);
    expect(mapped).toBe(14);
    expect(reaching - 1 - mapped).toBe(11);
    expect(DEAD_PREFERENCE_KEYS).toHaveLength(reaching - 1 - 6);
  });

  it('every dead key is gone from both stores, and pm-window-layout is not mistaken for one', () => {
    /*
      Removing the WRITE does not remove what was written. The server prunes the blob it is already
      rewriting, and the page prunes localStorage, because `savePreference` wrote to both.

      `pm-window-layout` looks exactly like one of these and is not: it has its own handler and has
      always persisted under `pmLogsOnRight`. Deleting it would throw away a real preference, so its
      absence from the list is asserted rather than assumed.
    */
    expect(DEAD_PREFERENCE_KEYS).not.toContain('pm-window-layout');
    expect(DEAD_PREFERENCE_KEYS).toContain('app-disable-video');
    expect(DEAD_PREFERENCE_KEYS).toHaveLength(19);

    expect(SERVER).toContain('pruneDeadPreferenceKeys(settings);');
    expect(pageCode).toContain(
      'for (const dead of DEAD_PREFERENCE_KEYS) localStorage.removeItem(dead);'
    );

    /*
      Every id that REACHES the handler is either mapped, dead, or the early-returning one.

      Keyed on `onchange={updateSettingCheck}` and not on `class="form-check-input"`: the first
      attempt at this used the class and reported `follow-chat-text-color`, which is a colour
      picker on a different handler entirely. That was the check being wrong, not the app — the
      failure this repository's rules put ahead of reporting anything.
    */
    const ids = MODAL.split('onchange={updateSettingCheck}')
      .slice(0, -1)
      .map((before) => [...before.matchAll(/id="([a-z-]+)"/g)].pop()?.[1]);
    expect(ids, 'every checkbox on the handler must resolve to an id').not.toContain(undefined);
    for (const name of ids) {
      if (!name || name === 'settings-app-donot-disturb') continue;
      const mapped = modalCode.includes(`'${name}': '`);
      const dead = DEAD_PREFERENCE_KEYS.includes(name);
      const ownHandler = name === 'pm-window-layout';
      expect(mapped || dead || ownHandler, `${name} is neither mapped nor listed as dead`).toBe(
        true
      );
    }
  });

  it('the prune is idempotent and leaves real preferences alone', () => {
    const settings: Record<string, unknown> = {
      recordingStartSound: false,
      'app-recording-start-sound': true,
      'chat-gif-donot-disturb': false,
      pmLogsOnRight: true,
      audioVolumeFor: { 7: 40 }
    };
    expect(pruneDeadPreferenceKeys(settings)).toBe(2);
    expect(settings).toEqual({
      recordingStartSound: false,
      pmLogsOnRight: true,
      audioVolumeFor: { 7: 40 }
    });
    // Second pass removes nothing, so a converged account pays no write.
    expect(pruneDeadPreferenceKeys(settings)).toBe(0);
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

  it('alwaysScrollToBottom defaults OFF, and only the CHAT scroller takes it', () => {
    /*
      Both halves of this were found by running the negative controls and watching them PASS.
      Neither was caught by anything, and each is a defect that renders perfectly.

      1. THE DEFAULT. `=== true`, not `!== false`. The preferences blob ships
         `alwaysScrollToBottom:!1` (`main.d6d3c112b59b7d0d.js` byte 979602), so seeding it on would
         drag every viewer who has never touched the checkbox out of the history they are reading.
         Note this is the OPPOSITE comparison to `showSpeechRecoOverlay`, where `=== true` was the
         bug — the reference's own default decides which is right, and there is no house style to
         fall back on.

      2. THE SCOPE. The subscriber lives on the component that owns `this.channel`, `this.msgs`,
         `this.searchTerm` and `chatLog[o.c]` — the chat scroller. The alerts scroller shares
         `shouldAutoScrollForMessage`, and passing the override there would yank a reader out of the
         alert history they were scrolled into, from a checkbox whose label says "chat".
    */
    expect(pageCode).toContain(
      'let alwaysScrollToBottom = $state(loadedSettings.alwaysScrollToBottom === true);'
    );
    expect(pageCode).not.toContain(
      'let alwaysScrollToBottom = $state(loadedSettings.alwaysScrollToBottom !== false);'
    );

    const alerts = /shouldAutoScrollForMessage\(\s*alertsScrollingUp[\s\S]{0,140}?\)/.exec(
      pageCode
    )?.[0];
    expect(alerts, 'the alerts scroller call must be findable').toBeTruthy();
    expect(alerts, 'the alerts scroller must NOT take the chat override').not.toContain(
      'alwaysScrollToBottom'
    );
  });

  it('the consumers the wires feed are still there', () => {
    // If a consumer is deleted, the assignment above becomes dead and this file should say so.
    expect(pageCode).toContain('pushToTalkShouldUnmute(event, { pushToTalk, micMuted })');
    expect(pageCode).toContain('!doSpeechReco');
    expect(pageCode).toContain("&& recordingStartSound) playSoundEffect('recordingStart')");
    expect(pageCode).toContain("&& recordingStopSound) playSoundEffect('recordingStop')");
  });
});
