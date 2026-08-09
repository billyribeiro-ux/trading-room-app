import { describe, expect, it } from 'vitest';
import { ROOM_SETTINGS } from './room-settings-schema';
import { classify, isUserEditable, resolveRoomConfig } from './room-config';

describe('setting classification', () => {
  it('treats *AsDefault as a user-overridable default', () => {
    expect(classify('darkThemeAsDefault')).toBe('default');
  });

  it('treats hide*/disable*/allow*/*VisibleToViewers as owner policy', () => {
    for (const name of [
      'hideNotes',
      'hideFiles',
      'disableEmojis',
      'allowUsersToChangeUsername',
      'rosterVisibleToViewers'
    ]) {
      expect(classify(name), name).toBe('policy');
    }
  });

  it('leaves everything else room-only', () => {
    expect(classify('chatServerURL')).toBe('room-only');
    expect(classify('media_max_bitrate')).toBe('room-only');
  });

  it('classifies every generated setting into exactly one class', () => {
    for (const def of ROOM_SETTINGS) {
      expect(['policy', 'default', 'room-only']).toContain(classify(def.name));
    }
  });
});

describe('precedence', () => {
  it('lets a user preference override a *AsDefault setting', () => {
    const resolved = resolveRoomConfig({ darkThemeAsDefault: true }, { theme: 'light' });
    expect(resolved.values.darkThemeAsDefault).toBe('light');
  });

  it('falls back to the room value when the user expressed no preference', () => {
    const resolved = resolveRoomConfig({ darkThemeAsDefault: true }, {});
    expect(resolved.values.darkThemeAsDefault).toBe(true);
  });

  it('never lets a user preference reach a policy setting', () => {
    // Even if a preference key collided, policy is read straight from the room.
    const resolved = resolveRoomConfig({ hideNotes: true }, { theme: 'dark' });
    expect(resolved.values.hideNotes).toBe(true);
    expect(resolved.locked.has('hideNotes')).toBe(true);
  });

  it('does not lock a policy setting the owner left off', () => {
    const resolved = resolveRoomConfig({ hideNotes: false });
    expect(resolved.locked.has('hideNotes')).toBe(false);
  });

  it('reports every unwired setting, so the UI can say so', () => {
    const resolved = resolveRoomConfig({});
    const unwiredInSchema = ROOM_SETTINGS.filter((s) => !s.wired).length;
    expect(resolved.unwired.size).toBe(unwiredInSchema);
  });
});

describe('isUserEditable', () => {
  it('offers a default to the user', () => {
    expect(isUserEditable('darkThemeAsDefault', {})).toBe(true);
  });

  it('withholds a policy the owner is enforcing', () => {
    expect(isUserEditable('hideNotes', { hideNotes: true })).toBe(false);
  });

  it('offers a policy the owner has not enforced', () => {
    expect(isUserEditable('hideNotes', {})).toBe(true);
  });

  it('never offers a room-only setting', () => {
    expect(isUserEditable('chatServerURL', {})).toBe(false);
  });
});
