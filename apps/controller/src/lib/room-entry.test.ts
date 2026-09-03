import { describe, expect, it } from 'vitest';
import { ROOM_SETTING_BY_NAME } from './room-settings-schema';
import {
  AUTH_MODES,
  UNENFORCED_SETTINGS,
  acceptsFreeTrialPassword,
  acceptsRoomPassword,
  decideRoomEntry,
  isBannedIp,
  isRegistrationMode,
  matchPassword,
  resolveAuthMode,
  type RoomEntryAttempt,
  type RoomEntrySettings
} from './room-entry';

/** A visitor who satisfies everything a default room asks for. */
const attempt = (over: Partial<RoomEntryAttempt> = {}): RoomEntryAttempt => ({
  name: 'Ada Visitor',
  email: 'ada@example.com',
  phone: '',
  password: '',
  roomState: 'open',
  ...over
});

const decide = (settings: RoomEntrySettings, over: Partial<RoomEntryAttempt> = {}) =>
  decideRoomEntry(settings, attempt(over));

describe('auth modes', () => {
  it('knows exactly the seven the reference compares against', () => {
    expect([...AUTH_MODES]).toEqual(['open', 'webinarRoom', 'unamePW', 'registrationA', 'registrationM', 'sso', 'jwt']);
  });

  it('falls back to open rather than refusing everybody on a bad value', () => {
    expect(resolveAuthMode(undefined)).toBe('open');
    expect(resolveAuthMode('')).toBe('open');
    expect(resolveAuthMode('nonsense')).toBe('open');
    expect(resolveAuthMode('jwt')).toBe('jwt');
  });

  /**
   * `ng-show="sess.authMode=='webinarRoom' || sess.allowPWLoginWithSSO"` gates all three room
   * passwords. This is the defect the module was written to fix: the route demanded `webinarPW`
   * in every mode, so an `open` room with a stale password refused everybody.
   */
  it('offers a room password only where the reference offers one', () => {
    expect(acceptsRoomPassword('webinarRoom', false)).toBe(true);
    expect(acceptsRoomPassword('open', false)).toBe(false);
    expect(acceptsRoomPassword('unamePW', false)).toBe(false);
    expect(acceptsRoomPassword('sso', false)).toBe(false);
    // allowPWLoginWithSSO widens it to every mode: "you can give a link and PW to enter the SSO
    // room as well".
    for (const mode of AUTH_MODES) expect(acceptsRoomPassword(mode, true)).toBe(true);
  });

  /** A WIDER guard than the room passwords, which is why it is its own predicate. */
  it('offers the free-trial password to webinarRoom AND unamePW', () => {
    expect(acceptsFreeTrialPassword('webinarRoom', false)).toBe(true);
    expect(acceptsFreeTrialPassword('unamePW', false)).toBe(true);
    expect(acceptsFreeTrialPassword('open', false)).toBe(false);
    // The asymmetry is the point: unamePW has a trial password but no room password.
    expect(acceptsRoomPassword('unamePW', false)).toBe(false);
  });

  it('routes registration modes away from the room door', () => {
    expect(isRegistrationMode('registrationA')).toBe(true);
    expect(isRegistrationMode('registrationM')).toBe(true);
    expect(isRegistrationMode('open')).toBe(false);
  });
});

describe('passwords', () => {
  const room: RoomEntrySettings = {
    authMode: 'webinarRoom',
    webinarPW: 'main',
    webinarPW2: 'temp',
    webinarPW3: 'temp2',
    webinarPWFreeTrial: 'trial'
  };

  it('accepts all three room passwords, because 2 and 3 work "in addition"', () => {
    for (const pw of ['main', 'temp', 'temp2']) {
      expect(matchPassword(room, 'webinarRoom', pw), pw).toBe('member');
    }
  });

  it('reports the free-trial password separately, so the member can be marked', () => {
    expect(matchPassword(room, 'webinarRoom', 'trial')).toBe('free-trial');
  });

  it('says none-configured when the mode has no password, whatever is stored', () => {
    // An `open` room carrying a stale webinarPW must not demand it. This is the exact bug.
    expect(matchPassword(room, 'open', '')).toBe('none-configured');
    expect(matchPassword(room, 'open', 'main')).toBe('none-configured');
  });

  it('prefers the member answer when an owner sets the same string for both', () => {
    const same = { ...room, webinarPWFreeTrial: 'main' };
    expect(matchPassword(same, 'webinarRoom', 'main')).toBe('member');
  });

  it('refuses a wrong password rather than falling through', () => {
    expect(matchPassword(room, 'webinarRoom', 'nope')).toBe('no-match');
  });
});

describe('the ban list', () => {
  it('matches an address exactly and ignores surrounding space', () => {
    expect(isBannedIp('1.2.3.4, 5.6.7.8', '5.6.7.8')).toBe(true);
    expect(isBannedIp('1.2.3.4', '1.2.3.5')).toBe(false);
  });

  /**
   * Exact comparison is deliberate. The only evidence is "Comma separated list of banned IPs";
   * prefix or CIDR matching would silently ban a wider range than the owner typed.
   */
  it('does not invent prefix or range matching', () => {
    expect(isBannedIp('1.2.3.', '1.2.3.4')).toBe(false);
    expect(isBannedIp('1.2.3.0/24', '1.2.3.4')).toBe(false);
  });

  it('cannot ban an unknown address', () => {
    expect(isBannedIp('1.2.3.4', null)).toBe(false);
  });
});

describe('the door', () => {
  it('lets an ordinary visitor into an open room', () => {
    expect(decide({ authMode: 'open' })).toEqual({ ok: true, asFreeTrial: false });
  });

  it('refuses everybody when the room is locked, before looking at anything else', () => {
    // "If session is locked, nobody will be able to log in..."
    const locked = decide({ isLocked: true }, { name: '', email: 'not-an-email' });
    expect(locked.ok).toBe(false);
    // Not `name-required`: the lock is absolute and must not depend on what was typed.
    expect(locked).toMatchObject({ reason: 'room-locked' });
  });

  it('refuses a closed room', () => {
    expect(decide({}, { roomState: 'closed' })).toMatchObject({ reason: 'room-closed' });
  });

  it('refuses a banned address without revealing anything about credentials', () => {
    const refused = decide({ banIPList: '9.9.9.9', webinarPW: 'x' }, { remoteIp: '9.9.9.9' });
    expect(refused).toMatchObject({ reason: 'ip-banned' });
  });

  it('applies the nickname filter case-insensitively', () => {
    const settings = { nickFilter: 'SO_,John Carter' };
    expect(decide(settings, { name: 'john carter' })).toMatchObject({ reason: 'name-filtered' });
    expect(decide(settings, { name: 'Ada' }).ok).toBe(true);
  });

  it('requires a phone only when the room asks for one', () => {
    expect(decide({ hasRequiredPhoneInLogin: true })).toMatchObject({ reason: 'phone-required' });
    expect(decide({ hasRequiredPhoneInLogin: true }, { phone: '+1 555 0100' }).ok).toBe(true);
    expect(decide({}).ok).toBe(true);
  });

  it('enforces secTok when set, and treats a missing one as a mismatch', () => {
    // "Leave blank to let all members in" — so unset is not a gate.
    expect(decide({ secTok: '' }).ok).toBe(true);
    expect(decide({ secTok: 'abc' })).toMatchObject({ reason: 'secret-token-wrong' });
    expect(decide({ secTok: 'abc' }, { secretToken: 'abc' }).ok).toBe(true);
  });

  it('admits on the free-trial password and says so', () => {
    const settings = { authMode: 'webinarRoom', webinarPWFreeTrial: 'trial' };
    expect(decide(settings, { password: 'trial' })).toEqual({ ok: true, asFreeTrial: true });
  });

  it('does not demand a password in a mode that has none', () => {
    // The regression this module exists to prevent.
    expect(decide({ authMode: 'open', webinarPW: 'stale' }).ok).toBe(true);
  });

  it('demands the disclosure last, after everything else has passed', () => {
    const settings = { customEnterDisclosure: 'Trading is risky.', nickFilter: 'Ada Visitor' };
    // A filtered name loses on the name, not on the disclosure: no point asking somebody to agree
    // to terms for a room that would refuse them anyway.
    expect(decide(settings)).toMatchObject({ reason: 'name-filtered' });
    expect(decide({ customEnterDisclosure: 'Trading is risky.' })).toMatchObject({
      reason: 'disclosure-required'
    });
    expect(decide({ customEnterDisclosure: 'x' }, { agreedToDisclosure: true }).ok).toBe(true);
  });

  it('uses loginErrorMsg for every refusal, and carries loginErrorURL', () => {
    const settings = {
      isLocked: true,
      loginErrorMsg: 'Members only.',
      loginErrorURL: 'https://example.com/denied'
    };
    expect(decide(settings)).toEqual({
      ok: false,
      reason: 'room-locked',
      message: 'Members only.',
      redirectTo: 'https://example.com/denied'
    });
  });

  it('falls back to a specific message rather than a house style', () => {
    const refused = decide({ hasRequiredPhoneInLogin: true });
    expect(refused).toMatchObject({ message: 'A phone number is required for this room.' });
  });
});

describe('what this module does NOT enforce', () => {
  /**
   * The list exists so nobody reads a stored setting as an active gate. Each entry needs something
   * that does not exist yet — a claim source, live presence, or an outbound call.
   */
  it('names every unenforced setting with what it needs first', () => {
    const names = UNENFORCED_SETTINGS.map((entry) => entry.name);
    expect(names).toContain('allowedMemberships');
    expect(names).toContain('allowedProducts');
    expect(names).toContain('allowedPerms');
    expect(names).toContain('disalowMultiLogins');
    for (const entry of UNENFORCED_SETTINGS) {
      expect(entry.needs.length, `${entry.name} has no reason`).toBeGreaterThan(20);
    }
  });

  it('and the two multi-login rows POINT at the thing that already enforces them', () => {
    /*
      Added 2026-09-03, with the correction it guards.

      Both rows carried the reason *"a live per-room presence count. The room owns connections, not
      the controller"* — a missing capability. It is not missing: `createSessionFor` deletes every
      prior session for the account in one transaction, on every entry to every room, which is
      STRICTER than either checkbox asks for. The reasons now say so.

      A prose correction with nothing holding it goes stale exactly the way the sentence it replaced
      did, and the sentence it replaced is the reason this repository re-measures rather than
      inherits. What holds it is the POINTER: the reason must name the function, so a reader who
      doubts it can go and read the enforcement, and a rewrite that drops the name fails here.
      `apps/room/src/lib/session-limit-contract.test.ts` owns the behaviour itself — eight cases,
      including that a presenter gets no exemption and that the account is never left with no
      session at all.
    */
    const multiLogin = UNENFORCED_SETTINGS.filter((entry) => entry.name.startsWith('disalow'));
    expect(multiLogin.map((entry) => entry.name)).toEqual(['disalowMultiLogins', 'disalowSporadicMultiLogins']);
    expect(multiLogin[0].needs).toContain('createSessionFor');
    // The sibling points at the sibling rather than repeating the argument.
    expect(multiLogin[1].needs).toContain('sibling');
    for (const entry of multiLogin) {
      // The half that would make this a lie: a reason claiming a presence count is still needed.
      expect(entry.needs).not.toContain('presence count');
    }
  });

  it('every unenforced name is a real setting, so the list cannot rot', () => {
    for (const entry of UNENFORCED_SETTINGS) {
      expect(ROOM_SETTING_BY_NAME.has(entry.name), entry.name).toBe(true);
    }
  });

  /**
   * `RoomEntrySettings` declares only what this module READS, which is why passing an entitlement
   * filter to it is a type error rather than a silent no-op. That is the design working: an
   * unenforced setting cannot be handed to the door and quietly ignored.
   *
   * The cast below is how a settings blob actually arrives at runtime — `resolveRoomConfig` returns
   * all 269 keys — so this pins that extra keys change nothing.
   */
  it('ignores settings it does not declare, rather than reacting to them', () => {
    const wholeBlob = {
      authMode: 'open',
      allowedMemberships: 'gold',
      allowedProducts: 'pro',
      allowedPerms: 'x',
      disalowMultiLogins: true,
      openLoginLink: 'https://example.com'
    } as unknown as RoomEntrySettings;
    expect(decide(wholeBlob)).toEqual({ ok: true, asFreeTrial: false });
  });
});
