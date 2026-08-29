import { describe, expect, it } from 'vitest';

import {
  ROOM_DEFAULT_RULES,
  applyRoomDefaults,
  decideRoomDefaults,
  type RoomDefaultWriters
} from './room-defaults.js';

/**
 * The three room defaults, and the latch that makes them defaults rather than overrides.
 *
 * The failure this file exists to prevent is not "the setting does nothing" — that one is loud and
 * somebody reports it. It is the opposite: a room default that keeps re-applying, silencing a
 * member's alerts on every page load while their own switch says they are on. That reads as a
 * broken settings modal, and nothing points at the room setting that is actually doing it.
 */

function writers() {
  const calls: [string, unknown][] = [];
  const spy: RoomDefaultWriters = {
    setTheme: (theme) => calls.push(['theme', theme]),
    savePreference: (key, value) => calls.push([key, value])
  };
  return { calls, spy };
}

describe('deciding which room defaults still apply', () => {
  it('applies nothing to a room that asks for nothing', () => {
    expect(decideRoomDefaults({ sessData: {}, loaded: {} })).toEqual([]);
  });

  it('applies nothing when sessData is absent entirely', () => {
    // The load can hand back a room with no settings at all; that must not throw or apply.
    expect(decideRoomDefaults({ sessData: null, loaded: {} })).toEqual([]);
    expect(decideRoomDefaults({ sessData: undefined, loaded: {} })).toEqual([]);
  });

  it('names all three, in the order the reference evaluates them', () => {
    expect(
      decideRoomDefaults({
        sessData: { darkThemeAsDefault: true, alertSoundOff: true, alertsChatOnBottom: true },
        loaded: {}
      })
    ).toEqual(['dark-theme', 'alert-sound-off', 'chat-on-bottom']);
  });

  /*
    THE POINT OF THE WHOLE MODULE. A latched default is finished: the member owns the value now.
  */
  it('skips a default this viewer has already had', () => {
    expect(
      decideRoomDefaults({
        sessData: { alertSoundOff: true },
        loaded: { defaultAlertSoundOff: true }
      })
    ).toEqual([]);
  });

  it('latches independently — one applied does not suppress the others', () => {
    expect(
      decideRoomDefaults({
        sessData: { darkThemeAsDefault: true, alertSoundOff: true, alertsChatOnBottom: true },
        loaded: { defaultAlertSoundOff: true }
      })
    ).toEqual(['dark-theme', 'chat-on-bottom']);
  });

  /*
    The two asymmetric reads, asserted rather than described.

    The SETTING is `=== true` because the controller omits unset values rather than sending null, so
    anything that is not literally true means the owner did not ask. The LATCH is truthy because
    this room did not necessarily write it — a member arriving from the original application brings
    these exact keys in their blob, and re-applying every default to them would be the bug.
  */
  it('refuses a setting that is truthy but not true', () => {
    expect(decideRoomDefaults({ sessData: { alertSoundOff: 'yes' }, loaded: {} })).toEqual([]);
    expect(decideRoomDefaults({ sessData: { alertSoundOff: 1 }, loaded: {} })).toEqual([]);
  });

  it('honours a latch that is truthy but not true', () => {
    expect(
      decideRoomDefaults({ sessData: { alertSoundOff: true }, loaded: { defaultAlertSoundOff: 1 } })
    ).toEqual([]);
  });

  it('applies again when the latch is present but falsy', () => {
    expect(
      decideRoomDefaults({
        sessData: { alertSoundOff: true },
        loaded: { defaultAlertSoundOff: false }
      })
    ).toEqual(['alert-sound-off']);
  });
});

describe('applying them', () => {
  /*
    Every write, in order, against the transcription in the module header. The LATCH IS LAST in each
    group, which is the one ordering claim the module makes: a throw between the two leaves the
    default un-applied and un-latched, so the next load retries it.
  */
  it('writes exactly what the reference writes', () => {
    const { calls, spy } = writers();
    applyRoomDefaults(
      {
        sessData: { darkThemeAsDefault: true, alertSoundOff: true, alertsChatOnBottom: true },
        loaded: {}
      },
      spy
    );

    expect(calls).toEqual([
      ['theme', 'dark'],
      ['defaultDarkTheme', true],
      ['alertSoundOn', false],
      ['defaultAlertSoundOff', true],
      ['roomSplitDir', 'btt'],
      ['defaultAlertsChatOnBottom', true]
    ]);
  });

  it('writes nothing at all for a room that asks for nothing', () => {
    const { calls, spy } = writers();
    applyRoomDefaults({ sessData: { darkThemeAsDefault: false }, loaded: {} }, spy);
    expect(calls).toEqual([]);
  });

  /*
    The regression this module is named for: a member who has already been given the room's default
    and then turned it back on. A second load must leave them alone.
  */
  it('leaves a member who overrode a default alone', () => {
    const { calls, spy } = writers();
    applyRoomDefaults(
      {
        sessData: { alertSoundOff: true },
        loaded: { defaultAlertSoundOff: true, alertSoundOn: true }
      },
      spy
    );
    expect(calls).toEqual([]);
  });

  it('applies only the one that is still outstanding', () => {
    const { calls, spy } = writers();
    applyRoomDefaults(
      {
        sessData: { darkThemeAsDefault: true, alertsChatOnBottom: true },
        loaded: { defaultDarkTheme: true }
      },
      spy
    );
    expect(calls).toEqual([
      ['roomSplitDir', 'btt'],
      ['defaultAlertsChatOnBottom', true]
    ]);
  });
});

describe('the rule table itself', () => {
  /*
    The latch names are the REFERENCE's, and that is load-bearing rather than cosmetic: a member
    arriving from the original application carries these exact keys in their preferences blob, so
    renaming one would apply that default a second time to every existing member. Pinned as literal
    strings, because a rename is precisely the edit that must be a deliberate diff.
  */
  it('keeps the captured setting and latch names', () => {
    expect(ROOM_DEFAULT_RULES.map((rule) => [rule.setting, rule.latch])).toEqual([
      ['darkThemeAsDefault', 'defaultDarkTheme'],
      ['alertSoundOff', 'defaultAlertSoundOff'],
      ['alertsChatOnBottom', 'defaultAlertsChatOnBottom']
    ]);
  });

  it('gives every rule a distinct latch, or one default would silence another', () => {
    expect(new Set(ROOM_DEFAULT_RULES.map((rule) => rule.latch)).size).toBe(
      ROOM_DEFAULT_RULES.length
    );
  });
});
