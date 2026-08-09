import { describe, expect, it } from 'vitest';
import { isRegistrationMode, isSsoMode, showsRoomLinks, usesRoomPassword } from './auth-modes';

describe('captured room authorization-mode predicates', () => {
  it('accepts both source spellings of the single SSO/JWT mode', () => {
    expect(isSsoMode('sso')).toBe(true);
    expect(isSsoMode('jwt')).toBe(true);
    expect(isSsoMode('open')).toBe(false);
  });

  it('recognizes only the two captured registration modes', () => {
    expect(isRegistrationMode('registrationA')).toBe(true);
    expect(isRegistrationMode('registrationM')).toBe(true);
    expect(isRegistrationMode('webinarRoom')).toBe(false);
  });

  it.each(['webinarRoom', 'open', 'unamePW'])('shows room links for %s', (mode) => {
    expect(showsRoomLinks(mode, false)).toBe(true);
  });

  it('uses the captured SSO password override for links and passwords', () => {
    expect(showsRoomLinks('sso', true)).toBe(true);
    expect(usesRoomPassword('sso', true)).toBe(true);
  });

  it('limits room passwords when the SSO override is absent', () => {
    expect(usesRoomPassword('webinarRoom', false)).toBe(true);
    expect(usesRoomPassword('open', false)).toBe(false);
  });
});
