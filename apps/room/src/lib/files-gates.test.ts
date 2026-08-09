import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  alertSoundButtonFor,
  alertSoundCommandValue,
  filesSectionHidden,
  type FileRow
} from './files-gates';

/*
  The Files pane's two gates, tested against the bundle they were transcribed from.

  Both used to be unbuildable for the same reason: the settings that feed them were not on the
  controller's `ROOM_VISIBLE_SETTINGS` allow-list, so the room never received them. The gate for
  the alert-sound buttons is the one worth having a test for — its two branches are complements, so
  a missing input does not hide both buttons, it shows both at once.
*/

const bundle = readFileSync(
  new URL('../../docs/source/components/app-presentationarea.full.js', import.meta.url),
  'utf8'
);

/** The flattened const table and update block — see `files-pane-contract.test.ts` for why. */
const flat = bundle.replace(/\n\s*/g, '');

const mp3: FileRow = { contentType: 'audio/mpeg', url: '/uploads/chaching.mp3' };
const png: FileRow = { contentType: 'image/png', url: '/uploads/chart.png' };

const presenter = { isPresenter: true };
const member = { isPresenter: false };

describe('hideFiles', () => {
  it('is still bound to both elements in the bundle', () => {
    // If this vanishes the assertions below are pinned to nothing and must be re-derived.
    // The main-tab `li`, at 5375 — one line, so it survives the flatten unchanged.
    expect(bundle).toContain("z('hidden', o.hideFiles)");
    // The `#files` pane, at 5410-5413 — broken across four lines, so only the flattened text has it.
    expect(flat).toContain(
      "z('ngClass', ut(61, Hr, 'presAreaTabs-files' == o.selectedMainTab))('hidden',o.hideFiles)"
    );
  });

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
    expect(bundle).toContain('this.appService.globals.videoOnlyMode');
    const gate = readFileSync(new URL('files-gates.ts', import.meta.url), 'utf8');
    // The function body, not the file: the docblock above it names the term it does not implement.
    const body = gate.slice(gate.indexOf('export function filesSectionHidden'));
    expect(body.slice(0, body.indexOf('}'))).not.toContain('videoOnlyMode');
  });
});

describe('the alert-sound row buttons', () => {
  it('still reads the captured gating out of the bundle', () => {
    expect(flat).toContain(
      "O(22,i.isP &&e.contentType.indexOf('audio/') >= 0 &&(!i.appService.globals.sessData.overwriteCashRegisterSound ||"
    );
    expect(flat).toContain(
      "O(23,i.isP &&e.contentType.indexOf('audio/') >= 0 &&i.appService.globals.sessData.overwriteCashRegisterSound &&"
    );
  });

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
    const other: FileRow = { contentType: 'audio/mpeg', url: '/uploads/other.mp3' };
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

  it('matches on the content type, not the file extension', () => {
    // `e.contentType.indexOf('audio/') >= 0` — the row's own test, and the reason the server action
    // re-checks the stored `content_type` rather than trusting a url that ends in `.mp3`.
    expect(alertSoundButtonFor(presenter, {}, { contentType: 'audio/wav', url: '/a' })).toBe('set');
    expect(
      alertSoundButtonFor(presenter, {}, { contentType: 'application/pdf', url: '/a.mp3' })
    ).toBeNull();
  });

  it('sends the EMPTY STRING to remove, not the url being removed', () => {
    // `{ url: i ? e : '' }` — full.js:3084-3086.
    expect(bundle).toContain(
      "sendServerAdminCommand('overwriteCashRegisterSound', { url: i ? e : '' })"
    );
    expect(alertSoundCommandValue(mp3.url, true)).toBe(mp3.url);
    expect(alertSoundCommandValue(mp3.url, false)).toBe('');
  });
});
