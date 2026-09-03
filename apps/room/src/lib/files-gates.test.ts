import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  alertSoundButtonFor,
  alertSoundCommandValue,
  filesSectionHidden,
  type FileRow
} from './files-gates';

/*
  The Files pane's two gates, EXECUTED here and anchored in `files-gates-capture.test.ts`.

  Both used to be unbuildable for the same reason: the settings that feed them were not on the
  controller's `ROOM_VISIBLE_SETTINGS` allow-list, so the room never received them. The gate for
  the alert-sound buttons is the one worth having a test for — its two branches are complements, so
  a missing input does not hide both buttons, it shows both at once.
*/

/*
  THE CAPTURE READ THAT SAT HERE IS IN `files-gates-capture.test.ts`.

  It was a MODULE-SCOPE read of the gitignored `docs/source`, and `gate/evidence-bound-tests.mjs`
  excludes by FILE, so four anchors took all ELEVEN cases here out of every checkout without the
  dumps — this container, and CI. The seven that stayed EXECUTE the two gates, and one of them is
  `offers exactly ONE of the two for any file, in every configuration`: the property this file was
  written for, because these branches are complements and a missing input shows both buttons rather
  than neither.
*/

/*
  `FP-13` — the fixtures carry `kind`, because that is what the gate reads now.

  This pane had TWO answers to "is this a sound": the row filter, the tab counts and the Play button
  all read the stored `kind`, while this gate alone ran `contentType.indexOf('audio/')`. `kind` is
  written by `kindForContentType`, which uses `startsWith`, so the two parted company on a type like
  `application/x-audio/foo` — absent from the Sounds tab and offered the Set-Alert-Sound button.
*/
const mp3: FileRow = { kind: 'sound', url: '/uploads/chaching.mp3' };
const png: FileRow = { kind: 'image', url: '/uploads/chart.png' };

const presenter = { isPresenter: true };
const member = { isPresenter: false };

describe('hideFiles', () => {
  /*
    The anchor — that `hideFiles` is still bound to BOTH the main-tab `li` and the `#files` pane
    upstream — is `files-gates-capture.test.ts`, which reads a gitignored capture.
  */
  it('hides the section when the owner has ticked it', () => {
    expect(filesSectionHidden({ hideFiles: true })).toBe(true);
  });

  it('leaves it visible when the setting is off or absent', () => {
    // Absent is the state of a room whose settings row has never been written.
    expect(filesSectionHidden({})).toBe(false);
    expect(filesSectionHidden({ hideFiles: false })).toBe(false);
  });

  it('reads hideFiles ALONE, because the reference ORs in a mode this room does not have', () => {
    /*
      `sessData.hideFiles || globals.videoOnlyMode` (full.js:2289-2290). `videoOnlyMode` is not a
      setting: `main.d6d3c112b59b7d0d.js` sets it from the `r` query parameter — the recording-bot
      mode — which this room has no equivalent of. Recorded as an absent term rather than invented.
    */
    // That upstream really does OR it in is anchored in `files-gates-capture.test.ts`.
    const gate = readFileSync(new URL('files-gates.ts', import.meta.url), 'utf8');
    // The function body, not the file: the docblock above it names the term it does not implement.
    const body = gate.slice(gate.indexOf('export function filesSectionHidden'));
    expect(body.slice(0, body.indexOf('}'))).not.toContain('videoOnlyMode');
  });
});

describe('the alert-sound row buttons', () => {
  /*
    The anchor — consts 22 and 23, whose two conditions are exact complements — is
    `files-gates-capture.test.ts`. That complementarity is the whole reason this gate has a test:
    a missing input does not hide both buttons, it shows both at once.
  */
  it('offers "Set as alert sound" on a sound with no override configured', () => {
    expect(alertSoundButtonFor(presenter, {}, mp3)).toBe('set');
    // `''` is what REMOVING stores, and the controller keeps it as null. Both mean no override.
    expect(alertSoundButtonFor(presenter, { overwriteCashRegisterSound: '' }, mp3)).toBe('set');
    expect(alertSoundButtonFor(presenter, { overwriteCashRegisterSound: null }, mp3)).toBe('set');
  });

  it('offers "Remove as alert sound" on the file that IS the override', () => {
    expect(alertSoundButtonFor(presenter, { overwriteCashRegisterSound: mp3.url }, mp3)).toBe(
      'remove'
    );
  });

  it('offers exactly ONE of the two for any file, in every configuration', () => {
    /*
      The point of returning one answer rather than two booleans.

      Written as two independent `{#if}` blocks in the template, a room that never received
      `overwriteCashRegisterSound` renders BOTH buttons on every sound file — which is precisely
      what happened before the setting was allow-listed across, and is how you know the read half
      is missing.
    */
    const other: FileRow = { kind: 'sound', url: '/uploads/other.mp3' };
    for (const override of [undefined, null, '', mp3.url, other.url]) {
      for (const file of [mp3, other]) {
        const answer = alertSoundButtonFor(
          presenter,
          { overwriteCashRegisterSound: override },
          file
        );
        expect(answer === 'set' || answer === 'remove', `${String(override)} / ${file.url}`).toBe(
          true
        );
      }
    }
  });

  it('offers neither to a member, and neither on a file that is not audio', () => {
    expect(alertSoundButtonFor(member, {}, mp3)).toBeNull();
    expect(alertSoundButtonFor(member, { overwriteCashRegisterSound: mp3.url }, mp3)).toBeNull();
    expect(alertSoundButtonFor(presenter, {}, png)).toBeNull();
  });

  it('matches on the stored kind, not the file extension', () => {
    /*
      `e.contentType.indexOf('audio/') >= 0` is the row's own test upstream, and the reason the
      server action re-checks what it stored rather than trusting a url that ends in `.mp3`. `FP-13`
      moved the read to `kind` — the SAME decision, taken once at upload from the content type by
      `kindForContentType`, rather than four times at render from a string.
    */
    expect(alertSoundButtonFor(presenter, {}, { kind: 'sound', url: '/a' })).toBe('set');
    expect(alertSoundButtonFor(presenter, {}, { kind: 'file', url: '/a.mp3' })).toBeNull();
    // An IMAGE named like a sound is still an image, which the extension test could not tell you.
    expect(alertSoundButtonFor(presenter, {}, { kind: 'image', url: '/a.mp3' })).toBeNull();
  });

  it('sends the EMPTY STRING to remove, not the url being removed', () => {
    // `{ url: i ? e : '' }` — full.js:3084-3086, anchored in `files-gates-capture.test.ts`.
    expect(alertSoundCommandValue(mp3.url, true)).toBe(mp3.url);
    expect(alertSoundCommandValue(mp3.url, false)).toBe('');
  });
});
