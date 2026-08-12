import { describe, expect, it } from 'vitest';
import { tawkAttributes, tawkScript, tawkSupportAvailable } from './tawk-support';

/**
 * The gates and the payload for Tawk.to presenter support
 * (`docs/source/components/app-room.full.js:2224-2298`).
 *
 * The case that matters most is the one the reference does NOT have: with no property configured
 * the feature is off. Upstream the id is a literal in the source, so it can never be absent there —
 * which is exactly why it must be absent-able here, and why that is tested.
 */

const PRESENTER = { isPresenter: true };
const MEMBER = { isPresenter: false };
const ROOM_ON = { tawkPresenterSupport: true };

describe('tawkSupportAvailable', () => {
  it('is available to a presenter in a room that enabled it, with a property configured', () => {
    expect(tawkSupportAvailable(PRESENTER, ROOM_ON, 'prop-123')).toBe(true);
  });

  /*
    The member case is not cosmetic. `loadTawkSupport` injects the script only
    `if (globals.isPresenter)`, so a member's browser never makes the third-party request at all -
    the difference between a support tool and a tracker on every member's page.
  */
  it('is never available to a member, so the script is never injected in their browser', () => {
    expect(tawkSupportAvailable(MEMBER, ROOM_ON, 'prop-123')).toBe(false);
  });

  it('is unavailable when the room has not enabled it', () => {
    expect(tawkSupportAvailable(PRESENTER, { tawkPresenterSupport: false }, 'prop-123')).toBe(false);
    expect(tawkSupportAvailable(PRESENTER, {}, 'prop-123')).toBe(false);
  });

  /*
    THE DIVERGENCE, pinned. The reference hardcodes its own property id
    (5aecb59f227d3d7edc24f7c2), so copying it would open every presenter's support chat into
    protradingroom's inbox and post their name and email there. With no id configured here the
    feature is simply off.
  */
  it('is unavailable with no property configured, rather than falling back to a default', () => {
    expect(tawkSupportAvailable(PRESENTER, ROOM_ON, undefined)).toBe(false);
    expect(tawkSupportAvailable(PRESENTER, ROOM_ON, null)).toBe(false);
    expect(tawkSupportAvailable(PRESENTER, ROOM_ON, '')).toBe(false);
    expect(tawkSupportAvailable(PRESENTER, ROOM_ON, '   ')).toBe(false);
  });
});

describe('tawkScript', () => {
  it('builds the reference URL shape with the configured property', () => {
    expect(tawkScript('prop-123')).toEqual({
      src: 'https://embed.tawk.to/prop-123/default',
      async: true,
      charset: 'UTF-8',
      crossorigin: '*'
    });
  });

  it('never contains the reference own property id', () => {
    expect(tawkScript('prop-123')?.src).not.toContain('5aecb59f227d3d7edc24f7c2');
  });

  it('encodes the property rather than interpolating it raw', () => {
    expect(tawkScript('a/b')?.src).toBe('https://embed.tawk.to/a%2Fb/default');
  });

  it('returns nothing with no property, so there is no script to inject', () => {
    expect(tawkScript(undefined)).toBeNull();
    expect(tawkScript('  ')).toBeNull();
  });
});

describe('tawkAttributes', () => {
  it('prefers the saved nick, then the nick, then the name', () => {
    expect(tawkAttributes({ savedNick: 'A', nick: 'B', name: 'C' }).name).toBe('A');
    expect(tawkAttributes({ nick: 'B', name: 'C' }).name).toBe('B');
    expect(tawkAttributes({ name: 'C' }).name).toBe('C');
  });

  it('prefers the saved email, then the email', () => {
    expect(tawkAttributes({ savedEmail: 'a@x.test', email: 'b@x.test' }).email).toBe('a@x.test');
    expect(tawkAttributes({ email: 'b@x.test' }).email).toBe('b@x.test');
  });

  /*
    Empty strings, not undefined: `|| ''` is the reference's own tail, and tawk's API rejects a
    non-string. An anonymous reader posts two empty strings rather than nothing.
  */
  it('falls through to empty strings, never undefined', () => {
    expect(tawkAttributes({})).toEqual({ name: '', email: '' });
    expect(tawkAttributes({ savedNick: '', nick: '', name: '' }).name).toBe('');
  });
});
