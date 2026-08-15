import { describe, expect, it } from 'vitest';

import {
  MISSING_SCHEME_ALERT,
  TOAST_ONLY_ACTIONS,
  addVideoToList,
  isAcceptableSendUrl,
  userActionAlert
} from './user-action-intent';

/*
  Decisions lifted out of the 253-line `handleUserAction`, none of which had a test, because
  reaching any of them meant driving a modal in a mounted room page.
*/

describe('the URL check keeps the reference behaviour, quirk included', () => {
  it('accepts a plain http or https URL', () => {
    expect(isAcceptableSendUrl('https://example.com/a.png')).toBe(true);
    expect(isAcceptableSendUrl('http://example.com')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isAcceptableSendUrl('HTTPS://EXAMPLE.COM')).toBe(true);
  });

  it('uses CONTAINS, not starts-with — locked deliberately', () => {
    /*
      The reference tests whether the string contains a scheme ANYWHERE. Both of these pass upstream
      and must pass here. Tightening this to `startsWith` would reject input the reference accepts,
      which is a behaviour change dressed as a bug fix — so it is pinned rather than corrected.
    */
    expect(isAcceptableSendUrl('see http://example.com for details')).toBe(true);
    expect(isAcceptableSendUrl('xxhttps://example.com')).toBe(true);
  });

  it('rejects a URL with no scheme at all', () => {
    expect(isAcceptableSendUrl('example.com')).toBe(false);
    expect(isAcceptableSendUrl('')).toBe(false);
    expect(isAcceptableSendUrl('ftp://example.com')).toBe(false);
  });

  it('carries the capture’s own mixed-quote alert verbatim', () => {
    expect(MISSING_SCHEME_ALERT).toBe('The link seems to be missing "https://" or "http://"');
  });
});

describe('the saved video list', () => {
  it('appends to the end', () => {
    const result = addVideoToList(['a'], 'b');
    expect(result.added).toBe(true);
    expect(result.added && result.videos).toEqual(['a', 'b']);
  });

  it('refuses an exact duplicate', () => {
    expect(addVideoToList(['a'], 'a')).toEqual({ added: false, reason: 'duplicate' });
  });

  it('does not mutate the list it was given', () => {
    // The caller holds the array read out of localStorage; a push would edit it behind their back.
    const existing = ['a'];
    addVideoToList(existing, 'b');
    expect(existing).toEqual(['a']);
  });

  it('treats case and trailing slash as DIFFERENT entries, as upstream does', () => {
    expect(addVideoToList(['http://x.com'], 'http://X.com').added).toBe(true);
    expect(addVideoToList(['http://x.com'], 'http://x.com/').added).toBe(true);
  });
});

describe('the actions that report success and send nothing', () => {
  it('returns the fixed alert for each', () => {
    expect(userActionAlert('save-permissions')).toBe(
      'Permissions applied, user will reload the page now to apply...'
    );
    expect(userActionAlert('mute-chat-24')).toBe('user chat muted');
    expect(userActionAlert('mute-chat-indefinitely')).toBe('user chat muted');
    expect(userActionAlert('restart-audio')).toBe('Audio restart request sent OK');
    expect(userActionAlert('force-reload')).toBe('Reload request sent OK');
  });

  it('returns null for anything that does real work', () => {
    // `unmute-chat` was in this table until it was wired for real; it must never come back.
    expect(userActionAlert('unmute-chat')).toBeNull();
    expect(userActionAlert('kick')).toBeNull();
    expect(userActionAlert('nonsense')).toBeNull();
  });

  it('is FIVE, and that number is meant to go DOWN', () => {
    /*
      Counted on purpose. Each of these is a control that reports success and sends nothing — TODO
      row W — so wiring one up for real is a visible change to this number rather than a quiet edit
      inside a 253-line function. If this fails because the count DROPPED, delete the entry and
      lower the number; if it rose, something was added that should have been built instead.
    */
    expect(TOAST_ONLY_ACTIONS).toHaveLength(5);
  });
});
