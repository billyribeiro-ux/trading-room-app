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
  });

  it('returns null for anything that does real work', () => {
    // `unmute-chat` was in this table until it was wired for real; it must never come back.
    expect(userActionAlert('unmute-chat')).toBeNull();
    // And `force-reload` joined it on 2026-08-23, for the same reason. Nor may this one.
    expect(userActionAlert('force-reload')).toBeNull();
    expect(userActionAlert('kick')).toBeNull();
    expect(userActionAlert('nonsense')).toBeNull();
  });

  it('is FOUR, and that number is meant to go DOWN', () => {
    /*
      Counted on purpose. Each of these is a control that reports success and sends nothing — TODO
      row W — so wiring one up for real is a visible change to this number rather than a quiet edit
      inside a 253-line function. If this fails because the count DROPPED, delete the entry and
      lower the number; if it rose, something was added that should have been built instead.

      5 -> 4 on 2026-08-23: `force-reload` was wired for real. Both ends of it already existed — a
      form action and a receiver — and NOTHING joined them, so this entry was covering for a working
      wire nobody called. Second entry ever removed, after `unmute-chat`.
    */
    expect(TOAST_ONLY_ACTIONS).toHaveLength(4);
  });
});

/*
  `force-reload` SENDS — the entry that used to cover for a wire nobody called.

  Two defects cancelled into silence here. A form action at `+page.server.ts` and a receiver in
  `events.svelte.ts` had both shipped and NOTHING joined them — `forceReload` appeared in the actions
  export and zero times as a caller, the same shape as `presenterCommand`, which shipped dead for
  three commits. At the same time the "Force Reload" button dispatched `force-reload`, a key of
  `EXACT_ALERTS`, so it raised "Reload request sent OK" and sent nothing.

  Each defect made the other invisible: nobody misses a wire that nothing calls, and nobody doubts a
  button that reports success. Joined 2026-08-23.
*/
describe('force-reload reaches the wire', () => {
  it('dispatches to the command with the TARGET user, not the caller', async () => {
    /*
      The id matters more than the call. `forceReload(user.id)` where `user` is the modal's target —
      passing the presenter's own id would reload the presenter, which looks like a working button
      right up until somebody uses it.
    */
    const { RoomUserActions } = await import('./room/user-actions.svelte.js');
    const { RoomDialogs } = await import('./room/dialogs.svelte.js');
    const { RoomToasts } = await import('./room/toasts.svelte.js');

    const reloaded: number[] = [];
    const dialogs = new RoomDialogs();
    /* The full row shape the class constrains its generic to, so the cast below hides nothing. */
    type Row = {
      id: number;
      displayName: string;
      email: string;
      emailHash: string;
      avatarUrl: string;
      status: string;
      role: string;
    };
    const actions = new RoomUserActions<Row>({
      dialogs,
      toasts: new RoomToasts(),
      commands: {
        presenter: () => Promise.resolve(null),
        editUsername: () => Promise.resolve(null),
        unmuteChat: () => Promise.resolve(null),
        forceReload: (targetUserId: number) => (reloaded.push(targetUserId), Promise.resolve(null))
      },
      session: () => ({ user: { id: 1 }, sessionHandle: 'r', connectedUsers: [] }),
      isPresenter: () => true,
      talking: () => [],
      rosterUsers: () => [],
      savePreference: () => {},
      openModal: () => {},
      closeModal: () => {},
      closeUserMenu: () => {},
      mentionUser: () => {},
      clearSelectedMessage: () => {},
      hidePreviewWindows: () => {},
      defaultFollowStyle: () => ({
        color: '#fff',
        tickerColor: '#fff',
        usernameColor: '#365d7d',
        bgColor: '#000',
        fontSize: 14,
        playSound: true
      }),
      reload: () => Promise.resolve()
    } as never);

    actions.handle('force-reload', {
      id: 9,
      nick: 'Bo',
      emailHash: 'h',
      pic: '',
      status: 'online'
    } as never);

    expect(reloaded, 'the TARGET is reloaded, not the presenter').toEqual([9]);
    expect(dialogs.alert, 'and the captured alert still shows').toBe('Reload request sent OK');
  });
});
