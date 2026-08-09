import { describe, expect, it } from 'vitest';
import { ROOM_SETTINGS, ROOM_SETTING_BY_NAME } from './room-settings-schema';
import {
  DELIBERATELY_OFF,
  FULL_EXPERIENCE_SETTINGS,
  newRoomSettings,
  unknownProfileSettings
} from './room-settings-profile';

/**
 * The seed a new room starts from.
 *
 * Two tables are hand-written — the features that go on, and the ones deliberately left off with a
 * reason — and hand-written tables drift from a generated schema. These pin them to it.
 *
 * The important assertions are the polarity ones. "Enable everything" is the instruction, and taken
 * literally it produces the emptiest room possible, because a third of the checkboxes are
 * `hide*`/`disable*`. That is not a hypothetical: it is the single most likely way somebody
 * "improves" this file later.
 */
describe('the full-experience seed', () => {
  it('names only settings that exist in the generated schema', () => {
    expect(unknownProfileSettings()).toEqual([]);
  });

  it('never lists a setting as both on and deliberately off', () => {
    const on = new Set(Object.keys(FULL_EXPERIENCE_SETTINGS));
    const off = DELIBERATELY_OFF.map((entry) => entry.name).filter((name) => on.has(name));
    expect(off).toEqual([]);
  });

  it('gives every exclusion a reason somebody can argue with', () => {
    for (const entry of DELIBERATELY_OFF) {
      expect(entry.because.length, `${entry.name} has no reason`).toBeGreaterThan(20);
    }
  });

  /**
   * The polarity trap, stated as a test.
   *
   * 33 of the 141 checkbox settings remove a feature when true. None of them may ever appear in
   * the seed, whatever a future "turn everything on" pass decides.
   */
  it('turns on NO setting whose effect is to hide or disable something', () => {
    const negative = /^(hide|disable|disalow|dont|deny|force|strict)/i;
    const wrong = Object.keys(FULL_EXPERIENCE_SETTINGS).filter((name) => negative.test(name));
    expect(wrong).toEqual([]);
  });

  it('turns on nothing from the reference’s "DON’T TOUCH" block', () => {
    const dontTouch = Object.keys(FULL_EXPERIENCE_SETTINGS).filter(
      (name) => ROOM_SETTING_BY_NAME.get(name)?.group === 'dont-touch'
    );
    expect(dontTouch).toEqual([]);
  });

  it('sets only booleans, because every entry is a checkbox', () => {
    for (const [name, value] of Object.entries(FULL_EXPERIENCE_SETTINGS)) {
      expect(ROOM_SETTING_BY_NAME.get(name)?.type, name).toBe('checkbox');
      expect(typeof value, name).toBe('boolean');
    }
  });

  /**
   * Owner decision, 2026-08-07. `regUserCanPresent` hands every visitor a microphone and screen
   * with no grant step; the reference's own help text is "***** CAREFULL ******". A tester still
   * gets the full experience because the owner grants mic/cam/screen per person, which is the path
   * the media-admission fix made real.
   */
  it('does not auto-present every visitor', () => {
    expect(FULL_EXPERIENCE_SETTINGS.regUserCanPresent).toBeUndefined();
    expect(DELIBERATELY_OFF.map((entry) => entry.name)).toContain('regUserCanPresent');
  });

  it('does not enable a setting that needs credentials we do not have', () => {
    // Each of these renders a control that cannot work until a key, URL or transport exists.
    for (const name of ['hasAppPairLink', 'positionsIframe', 'tipMeBtnEnabled', 'sendReportEmails']) {
      expect(FULL_EXPERIENCE_SETTINGS[name as keyof typeof FULL_EXPERIENCE_SETTINGS]).toBeUndefined();
    }
  });

  it('actually turns the room’s own wired features on', () => {
    // The subset with a consumer today. If the seed did not cover these, it would change nothing
    // observable and the whole exercise would be theatre.
    for (const name of [
      'rosterVisibleToViewers',
      'rosterCountVisibleToViewers',
      'showArchivesToUsers',
      'userUploads',
      'userPM',
      'userToPresenterPM'
    ]) {
      expect(FULL_EXPERIENCE_SETTINGS[name as keyof typeof FULL_EXPERIENCE_SETTINGS], name).toBe(true);
    }
  });

  it('hands back a fresh object, so one room cannot mutate the next room’s seed', () => {
    const first = newRoomSettings();
    (first as Record<string, unknown>).userPM = false;
    expect(newRoomSettings().userPM).toBe(true);
  });

  it('leaves the vast majority of settings unset, which still means off', () => {
    // A seed is not a place to express every key. Unset is the reference's "empty", and
    // resolveRoomConfig reads it as off.
    expect(Object.keys(FULL_EXPERIENCE_SETTINGS).length).toBeLessThan(ROOM_SETTINGS.length / 2);
  });
});
