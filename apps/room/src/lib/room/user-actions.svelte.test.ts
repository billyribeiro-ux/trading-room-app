// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TalkingEntry } from '#lib/mute-all-non-admins.js';
import type { ModalTargetUser } from '#lib/types.js';
import { MISSING_SCHEME_ALERT } from '#lib/user-action-intent.js';

import { RoomDialogs } from './dialogs.svelte';
import { RoomToasts } from './toasts.svelte';
import { RoomUserActions } from './user-actions.svelte';

/*
  Everything that can be done TO a user, EXECUTED.

  `user-action-intent.test.ts` owns the alert TABLE and `mute-all-non-admins.test.ts` owns the
  targeting rule; both are transcriptions tested where they live. What neither can do is run the
  dispatcher, and three of its behaviours are invariants rather than lookups:

  - `target` prefers the MESSAGE selection over the roster one, and both writers keep them agreeing;
  - the muted and followed lists are this BROWSER's, so every toggle writes `localStorage`;
  - "mute all" refuses for a non-presenter and staggers what it does send.
*/

type User = {
  id: number;
  displayName: string;
  email: string;
  emailHash: string;
  avatarUrl: string;
  status: string;
  role: string;
  hasAdminChat?: boolean;
  hasMic?: boolean;
  hasScreen?: boolean;
  hasCam?: boolean;
  canEditNotes?: boolean;
};

const ROW = (over: Partial<User> = {}): User => ({
  id: 2,
  displayName: 'Ada',
  email: 'ada@example.test',
  emailHash: 'hash-ada',
  avatarUrl: '/a.png',
  status: 'online',
  role: 'user',
  ...over
});

const TARGET: ModalTargetUser = {
  id: 5,
  nick: 'Bo',
  emailHash: 'hash-bo',
  pic: '/b.png',
  status: 'online'
};

const make = (options: { isPresenter?: boolean; talking?: TalkingEntry[] } = {}) => {
  const dialogs = new RoomDialogs();
  const toasts = new RoomToasts();
  const sent: { subCmd: string; targetUserId: number }[] = [];
  const reloadsSent: number[] = [];
  const opened: string[] = [];
  const mentioned: string[] = [];
  const saved: [string, boolean][] = [];
  let modalClosed = 0;
  let messageCleared = 0;
  let previewsHidden = 0;
  let reloaded = 0;
  let unmuteFails = false;
  /* The five checkboxes as they left the class, and a switch to make the control plane refuse. */
  const permsSent: { targetUserId: number; granted: string[] }[] = [];
  let permsFails = false;

  const actions = new RoomUserActions<User>({
    dialogs,
    toasts,
    commands: {
      presenter: (payload) => (sent.push(payload), Promise.resolve(null)),
      editUsername: () => Promise.resolve(null),
      unmuteChat: () =>
        unmuteFails ? Promise.reject(new Error('refused')) : Promise.resolve(null),
      forceReload: (targetUserId: number) => (
        reloadsSent.push(targetUserId),
        Promise.resolve(null)
      ),
      savePermissions: (payload) =>
        permsFails
          ? Promise.reject(new Error('refused'))
          : (permsSent.push(payload), Promise.resolve(null))
    },
    session: () => ({
      user: { id: 1 },
      sessionHandle: 'room-1',
      connectedUsers: [
        ROW(),
        ROW({ id: 3, displayName: 'Cy', emailHash: 'hash-cy', role: 'staff' })
      ]
    }),
    isPresenter: () => options.isPresenter ?? false,
    talking: () => options.talking ?? [],
    rosterUsers: () => [],
    savePreference: (key, value) => saved.push([key, value]),
    openModal: (name) => opened.push(name),
    closeModal: () => (modalClosed += 1),
    closeUserMenu: () => {},
    mentionUser: (name) => mentioned.push(name),
    clearSelectedMessage: () => (messageCleared += 1),
    hidePreviewWindows: () => (previewsHidden += 1),
    defaultFollowStyle: () => ({
      color: '#ffffff',
      tickerColor: '#ffffff',
      usernameColor: '#365d7d',
      bgColor: '#000000',
      fontSize: 14,
      playSound: true
    }),
    reload: () => ((reloaded += 1), Promise.resolve())
  });

  return {
    actions,
    dialogs,
    toasts,
    sent,
    opened,
    mentioned,
    saved,
    reloadsSent,
    permsSent,
    failPerms: () => (permsFails = true),
    failUnmute: () => (unmuteFails = true),
    modalClosed: () => modalClosed,
    messageCleared: () => messageCleared,
    previewsHidden: () => previewsHidden,
    reloaded: () => reloaded
  };
};

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});
afterEach(() => vi.useRealTimers());

describe('who is selected, and the two writers that must agree', () => {
  it('prefers the MESSAGE selection over the roster one', () => {
    const { actions } = make();
    actions.selectUserId(2);
    expect(actions.target.nick).toBe('Ada');
    actions.selectedMessageUser = TARGET;
    expect(actions.target.nick, 'the message selection wins while it is set').toBe('Bo');
  });

  it('falls back to a blank target rather than throwing on an unknown id', () => {
    /*
      The capture renders the modal with an empty nick and the gravatar placeholder rather than
      refusing to open, so an id that has left the roster must resolve rather than blow up.
    */
    const { actions } = make();
    actions.selectUserId(9999);
    expect(actions.target.id).toBe(0);
    expect(actions.target.pic).toContain('gravatar');
  });

  it('selecting a roster row clears the message selection, and vice versa', () => {
    /*
      The invariant that makes `target` honest. A bare setter on `selectedUserId` would let a caller
      change WHO is selected while leaving the message selection pointing at somebody else, and
      `target` prefers the message one — so the modal would show the person you did not click.
    */
    const { actions, messageCleared } = make();
    actions.selectedMessageUser = TARGET;
    actions.select(ROW());
    expect(actions.target.nick).toBe('Ada');
    expect(messageCleared(), 'the message-action path is told too').toBe(1);

    actions.selectedMessageUser = TARGET;
    actions.selectUserId(2);
    expect(actions.target.nick, 'selectUserId must clear it as well').toBe('Ada');
  });

  it('opening info and mentioning both select first', () => {
    const { actions, opened, mentioned } = make();
    actions.openInfoFor(ROW());
    expect(opened).toEqual(['user']);
    actions.mentionFromRoster(ROW({ id: 3, displayName: 'Cy' }));
    expect(mentioned).toEqual(['Cy']);
    expect(actions.target.nick).toBe('Cy');
  });
});

describe('the muted and followed lists are this BROWSER’s', () => {
  it('writes localStorage on every toggle, and reads it back on load', () => {
    /*
      They are a local filter and not a room setting, which is why no command goes out. A member's
      mute list following them to another browser would be a different feature.
    */
    const { actions, dialogs } = make();
    actions.requestMuteToggle(TARGET);
    dialogs.confirmation?.onconfirm();
    expect(actions.mutedUsers['hash-bo']?.nick).toBe('Bo');
    expect(JSON.parse(localStorage.getItem('mutedUsers') ?? '{}')['hash-bo']).toBeTruthy();

    const second = make();
    second.actions.loadManaged();
    expect(second.actions.mutedUsers['hash-bo']?.nick, 'the list did not survive a reload').toBe(
      'Bo'
    );
  });

  it('asks before muting, and the prompt names the direction', () => {
    const { actions, dialogs } = make();
    actions.requestMuteToggle(TARGET);
    expect(dialogs.confirmation?.message).toBe('Do you want to mute Bo?');
    dialogs.confirmation?.onconfirm();

    actions.requestMuteToggle(TARGET);
    expect(dialogs.confirmation?.message, 'the second time it offers to UNmute').toBe(
      'Do you want to unmute Bo?'
    );
  });

  it('removes from the right list and leaves the other alone', () => {
    const { actions, dialogs } = make();
    actions.requestMuteToggle(TARGET);
    dialogs.confirmation?.onconfirm();
    actions.requestFollowToggle(TARGET);
    dialogs.confirmation?.onconfirm();
    expect(actions.mutedUsers['hash-bo']).toBeTruthy();
    expect(actions.followedUsers['hash-bo']).toBeTruthy();

    actions.requestManagedRemoval('mutedUsers', {
      nick: 'Bo',
      emailHash: 'hash-bo',
      pic: '/b.png'
    });
    dialogs.confirmation?.onconfirm();
    expect(actions.mutedUsers['hash-bo']).toBeUndefined();
    expect(actions.followedUsers['hash-bo'], 'unmuting must not unfollow').toBeTruthy();
  });
});

describe('mute all non-admins', () => {
  it('refuses for a member, and does nothing when nobody is talking', () => {
    const member = make({
      isPresenter: false,
      talking: [{ userID: 2, mediaValue: { name: 'Ada' } }]
    });
    member.actions.muteAllNonAdmins();
    expect(member.dialogs.confirmation, 'a member must not even be asked').toBeNull();

    const quiet = make({ isPresenter: true, talking: [] });
    quiet.actions.muteAllNonAdmins();
    expect(quiet.dialogs.confirmation, 'nobody talking is nothing to mute').toBeNull();
  });

  it('asks a presenter, then STAGGERS the commands rather than sending them at once', () => {
    /*
      The stagger is the point: a room of thirty gets thirty commands, and firing them in one tick
      is what the reference spaces out. The delay is `MUTE_STAGGER_MS` per target.
    */
    const { actions, dialogs, sent } = make({
      isPresenter: true,
      talking: [
        { userID: 2, mediaValue: { name: 'Ada' } },
        { userID: 3, mediaValue: { name: 'Cy' } }
      ]
    });
    actions.muteAllNonAdmins();
    expect(dialogs.confirmation).not.toBeNull();
    dialogs.confirmation?.onconfirm();

    expect(sent, 'nothing goes out synchronously').toEqual([]);
    vi.runAllTimers();
    expect(sent.every((command) => command.subCmd === 'mutemic')).toBe(true);
  });
});

describe('the dispatcher', () => {
  it('locks the session with TWO preferences, not one', () => {
    /*
      `session-lock` and `session-lock-kick` are the same control with a different second flag, and
      writing only the first leaves a locked room that silently stops kicking.
    */
    const { actions, saved, dialogs } = make();
    actions.handle('session-lock-kick', TARGET);
    expect(saved).toEqual([
      ['sessionLocked', true],
      ['sessionLockKick', true]
    ]);
    expect(dialogs.alert).toBe('Session Locked');
  });

  it('renaming YOURSELF is validated; renaming somebody else is not', () => {
    /*
      Two different functions in the capture, and the rules exist on the self path because it is
      reachable by the person being renamed. Every string is the capture's, including "less than 30"
      on a `>= 30` test.
    */
    const { actions, dialogs } = make();
    actions.handle('edit-username-by-user', { ...TARGET, nick: 'Bo' });
    expect(dialogs.prompt?.title).toBe('Enter a new username for yourself:');
    dialogs.prompt?.onconfirm('has spaces');
    expect(dialogs.alert).toBe('Username can only contain letters and numbers');

    actions.handle('edit-username-by-user', { ...TARGET, nick: 'Bo' });
    dialogs.prompt?.onconfirm('ab');
    expect(dialogs.alert).toBe('Username must be at least 3 characters long');

    actions.handle('edit-username', { ...TARGET, nick: 'Bo' });
    expect(dialogs.prompt?.title, 'the presenter path has no pre-filled value').toBe(
      'Enter a new username for "Bo":'
    );
    expect(dialogs.prompt?.value).toBe('');
  });

  it('surfaces a refused unmute rather than dropping it', async () => {
    /*
      The original bug's exact shape: a form action answered `ok === false` and the call site was
      free to ignore it. A remote command rejects, so the refusal has to be caught to be dropped.
    */
    const { actions, dialogs, failUnmute } = make();
    failUnmute();
    actions.handle('unmute-chat', TARGET);
    expect(dialogs.alert, 'the optimistic wording comes first, as the capture does').toBe(
      'user chat unmuted'
    );
    await vi.waitFor(() => expect(dialogs.alert).toBe('Command failed.'));
  });

  it('raises a toast rather than a modal for the clipboard', () => {
    const { actions, toasts, dialogs } = make();
    actions.handle('copied-to-clipboard', TARGET);
    expect(toasts.notices.map((notice) => notice.message)).toEqual(['Copied to clipboard.']);
    expect(dialogs.alert, 'ngx-toastr is a toast, not a bootbox').toBeNull();
  });

  it('refuses a send URL with no scheme, and keeps a duplicate video out of the list', () => {
    const { actions, dialogs } = make();
    actions.handle('session-send-video', TARGET);
    dialogs.prompt?.onconfirm('example.com/a.mp4');
    // Against the CONSTANT, not against a guess at its wording - the first draft of this line
    // asserted 'rtmp' and the real sentence is about 'https'.
    expect(dialogs.alert).toBe(MISSING_SCHEME_ALERT);

    actions.handle('session-send-video', TARGET);
    dialogs.prompt?.onconfirm('https://example.test/a.mp4');
    expect(dialogs.alert).toBe('Video added.');

    actions.handle('session-send-video', TARGET);
    dialogs.prompt?.onconfirm('https://example.test/a.mp4');
    expect(dialogs.alert, 'the same url twice is refused').toBe('Video already exists.');
  });

  it('hides the preview windows through the page rather than owning them', () => {
    const { actions, previewsHidden } = make();
    actions.handle('remove-preview-windows', TARGET);
    expect(previewsHidden()).toBe(1);
  });
});

describe('every public getter is reactive', () => {
  /*
    Mutations and flushes INSIDE `$effect.root`, assertions OUTSIDE it — the root swallows a thrown
    assertion, as `room-mtx.svelte.test.ts` records.
  */
  it('re-runs a reader when the mute list changes', () => {
    const { actions, dialogs } = make();
    const seen: number[] = [];
    const stop = $effect.root(() => {
      $effect(() => void seen.push(Object.keys(actions.mutedUsers).length));
      flushSync();
      actions.requestMuteToggle(TARGET);
      dialogs.confirmation?.onconfirm();
      flushSync();
    });
    stop();
    expect(seen, 'the mutedUsers getter is not reactive').toEqual([0, 1]);
  });

  it('re-runs a reader when the follow list changes', () => {
    const { actions, dialogs } = make();
    const seen: number[] = [];
    const stop = $effect.root(() => {
      $effect(() => void seen.push(Object.keys(actions.followedUsers).length));
      flushSync();
      actions.requestFollowToggle(TARGET);
      dialogs.confirmation?.onconfirm();
      flushSync();
    });
    stop();
    expect(seen, 'the followedUsers getter is not reactive').toEqual([0, 1]);
  });

  it('re-runs a reader when the selection moves', () => {
    const { actions } = make();
    const seen: string[] = [];
    const stop = $effect.root(() => {
      $effect(() => void seen.push(actions.target.nick));
      flushSync();
      actions.select(ROW());
      flushSync();
    });
    stop();
    expect(seen, 'the target getter is not reactive').toEqual(['', 'Ada']);
  });
});

/*
  THE FIVE PERMISSION CHECKBOXES ARE SENT — the assertion the old code failed.

  Before 2026-08-23 the Save button closed the modal, raised the reference's own alert, and sent
  nothing. The checkbox values were `$state` local to `ModalHost.svelte` and `onUserAction` carried
  only `(action, user)`, so they had no way out of the component. An owner ticked "Admin Chat", was
  told it had applied, and the membership never changed.

  Worse than a dead control, because it reported success. `user-action-intent.ts` had the alert right
  and the FACT wrong.
*/
describe('saveCustomPerms sends the boxes, executed', () => {
  it('sends exactly the ticked keys, for the named target', () => {
    const { actions, permsSent } = make();
    actions.savePermissions({ id: 7 } as never, ['hasMic', 'hasAdminChat']);
    expect(permsSent, 'the control plane must be told').toEqual([
      { targetUserId: 7, granted: ['hasMic', 'hasAdminChat'] }
    ]);
  });

  it('an EMPTY list is a revocation, not a no-op', () => {
    /*
      The endpoint writes `false` for every key absent from `granted`, so unticking all five must
      still send. A guard that skipped an empty list would make "remove every permission" the one
      change this control could not perform.
    */
    const { actions, permsSent } = make();
    actions.savePermissions({ id: 7 } as never, []);
    expect(permsSent).toEqual([{ targetUserId: 7, granted: [] }]);
  });

  it('raises the captured alert and closes the modal', () => {
    const { actions, dialogs, modalClosed } = make();
    actions.savePermissions({ id: 7 } as never, ['hasCam']);
    expect(dialogs.alert).toBe('Permissions applied, user will reload the page now to apply...');
    expect(modalClosed(), 'the capture closes the modal before it alerts').toBe(1);
  });

  it('a REFUSAL replaces the alert instead of stacking a second dialog', async () => {
    /*
      `#announceThenSend`'s shape. A presenter reading "Permissions applied" over the top of "it did
      not" is the failure this avoids — and a silent rejection would put the old lie straight back.
    */
    const { actions, dialogs, failPerms } = make();
    failPerms();
    actions.savePermissions({ id: 7 } as never, ['hasMic']);
    await Promise.resolve();
    await Promise.resolve();
    expect(dialogs.alert).toBe('Command failed.');
  });
});

/*
  THE MODAL SEEDS FROM THE TRUTH — the half that made the write path dangerous.

  `targetFor` built the modal's target from a roster row and dropped all five permission flags, so
  `ModalHost`'s `Boolean(targetUser.hasMic)` read `undefined` and drew every box unchecked whatever
  the membership said. Harmless while Save sent nothing.

  The moment Save started sending it became a REVOCATION: the endpoint writes `false` for every key
  absent from `granted`, so a presenter opening the modal on a member with mic and screen and
  pressing Save would have stripped both — and been told "Permissions applied".

  Found by reading the subscribe payload in `sess/[room]/events/+server.ts` while checking something
  else entirely. Nothing failed; the write path was green and wrong.
*/
describe('the permission checkboxes seed from the roster row', () => {
  it('carries all five through targetFor', () => {
    const { actions } = make();
    const target = actions.targetFor(
      ROW({
        hasAdminChat: true,
        hasMic: true,
        hasScreen: false,
        hasCam: true,
        canEditNotes: false
      })
    );
    expect(target.hasMic).toBe(true);
    expect(target.hasScreen).toBe(false);
    expect(target.hasCam).toBe(true);
    expect(target.canEditNotes).toBe(false);
    expect(target.hasAdminChat).toBe(true);
  });

  it('does not collide with the unrelated `permissions` string on the same object', () => {
    /*
      `ModalTargetUser.permissions` is `'r' | 'a'` and predates all of this. The five flags land on
      FLAT fields precisely because that name was taken — writing the nested object over it would
      have been invisible to the compiler and would have broken whatever reads the letter.
    */
    const { actions } = make();
    const target = actions.targetFor(
      ROW({ role: 'user', hasMic: true, hasScreen: true, hasCam: true, canEditNotes: true })
    );
    expect(target.permissions, 'still the role letter').toBe('r');
    expect(target.hasMic, 'and the flag is beside it, not on top of it').toBe(true);
  });

  it('a REDACTED row seeds every box false rather than throwing', () => {
    // A member's copy of the roster is blanked at the hub, and a member cannot open this modal —
    // but the type must not promise the truth, only the shape.
    const { actions } = make();
    const target = actions.targetFor(ROW());
    expect([target.hasMic, target.hasScreen, target.hasCam, target.canEditNotes]).toEqual([
      false,
      false,
      false,
      false
    ]);
  });
});
