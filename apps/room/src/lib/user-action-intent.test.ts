import { describe, expect, it } from 'vitest';

import { RoomDialogs } from './room/dialogs.svelte';
import { RoomToasts } from './room/toasts.svelte';
import { RoomUserActions } from './room/user-actions.svelte';
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
    expect(userActionAlert('restart-audio')).toBe('Audio restart request sent OK');
  });

  it('returns null for anything that does real work', () => {
    // `unmute-chat` was in this table until it was wired for real; it must never come back.
    expect(userActionAlert('unmute-chat')).toBeNull();
    // And `force-reload` joined it on 2026-08-23, for the same reason. Nor may this one.
    expect(userActionAlert('force-reload')).toBeNull();
    /*
      `mute-chat-24` is the third, wired the same day — and `mute-chat-indefinitely` is the FOURTH,
      on 2026-08-27. The note that used to sit here said the indefinite one stays because the room
      has no door to the controller's opcode 3; `internal/room-mute` is that door. It is still not
      folded into the 24-hour mute: two stores, two commands, and a control whose label and
      behaviour disagree would be worse than one honestly listed as inert.
    */
    expect(userActionAlert('mute-chat-24')).toBeNull();
    expect(userActionAlert('mute-chat-indefinitely')).toBeNull();
    expect(userActionAlert('kick')).toBeNull();
    expect(userActionAlert('nonsense')).toBeNull();
  });

  it('is TWO, and neither of them is a liar any more', () => {
    /*
      Counted on purpose. Each of these is a control that reports success and sends nothing — TODO
      row W — so wiring one up for real is a visible change to this number rather than a quiet edit
      inside a 253-line function. If this fails because the count DROPPED, delete the entry and
      lower the number; if it rose, something was added that should have been built instead.

      5 -> 4 on 2026-08-23: `force-reload` was wired for real. Both ends of it already existed — a
      form action and a receiver — and NOTHING joined them, so this entry was covering for a working
      wire nobody called. Second entry ever removed, after `unmute-chat`.

      4 -> 3 later the same day: `mute-chat-24`, and the same story a third time. A working mute
      already existed — the message context menu's `mute24` — and this button raised the capture's
      own "user chat muted" beside it with nothing joining them. Both doors now call `applyChatMute`.

      3 -> 2 on 2026-08-27: `mute-chat-indefinitely`, and this one was NOT the same story. Its
      blocker was real — the indefinite mute is the controller's opcode 3 and the room genuinely had
      no door to it — which is why it outlasted the other three. `internal/room-mute` is the door.

      **THE TWO THAT REMAIN ARE NOT LIARS, and that changes what this number means.**
      `save-permissions` and `restart-audio` each announce a REAL send, and the reference raises both
      alerts too. So this is no longer a defect count: the table is down to what its docblock always
      claimed it was, "the fixed alert for an action". A THIRD entry arriving is now the thing to
      look at, because it would be the first liar back in the room.
    */
    expect([...TOAST_ONLY_ACTIONS].sort()).toEqual(['restart-audio', 'save-permissions']);
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
  it('dispatches to the command with the TARGET user, not the caller', () => {
    /*
      The id matters more than the call. `forceReload(user.id)` where `user` is the modal's target —
      passing the presenter's own id would reload the presenter, which looks like a working button
      right up until somebody uses it.

      The three room classes are imported at MODULE scope, like every other test that builds them.
      They were dynamic `await import()`s inside this body until 2026-08-30 — the only three in the
      suite — and that put the cost of compiling a rune module and its whole graph INSIDE vitest's
      per-test budget: 3,388ms of a 5,000ms default, measured. It timed out for real on a loaded
      box. A static import pays the same cost during the file's import phase, which vitest measures
      separately and does not time out, so nothing is hidden and nothing is slower.
    */
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
      /* The Admin Notes wire. Nothing here exercises it; it exists so the class can be built. */
      notesPort: {
        check: () => Promise.resolve({ required: false, ok: true }),
        list: () => Promise.resolve([]),
        add: () => Promise.resolve([]),
        remove: () => Promise.resolve([])
      },
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
