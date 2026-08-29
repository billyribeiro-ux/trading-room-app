// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TalkingEntry } from '#lib/mute-all-non-admins.js';
import type { ModalTargetUser } from '#lib/types.js';
import { MISSING_SCHEME_ALERT, TOAST_ONLY_ACTIONS } from '#lib/user-action-intent.js';

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

const make = (
  options: { isPresenter?: boolean; talking?: TalkingEntry[]; roster?: User[] } = {}
) => {
  const dialogs = new RoomDialogs();
  const toasts = new RoomToasts();
  const sent: { subCmd: string; targetUserId: number }[] = [];
  const reloadsSent: number[] = [];
  const kicksSent: { targetUserId: number; message: string; ban?: boolean }[] = [];
  const urlsSent: { cmd: string; url: string }[] = [];
  const mutesSent: { targetUserId: number }[] = [];
  const debugLogsAsked: number[] = [];
  const profilePicturesSent: { targetUserId: number; file: File }[] = [];
  const audioRestarts: number[] = [];
  const opened: string[] = [];
  const mentioned: string[] = [];
  const saved: [string, boolean][] = [];
  let modalClosed = 0;
  let messageCleared = 0;
  let previewsHidden = 0;
  let reloaded = 0;
  let unmuteFails = false;
  let presenterFails = false;
  let profilePictureFails = false;
  /* The five checkboxes as they left the class, and a switch to make the control plane refuse. */
  const permsSent: { targetUserId: number; granted: string[] }[] = [];
  const indefiniteMutesSent: { targetUserId: number }[] = [];
  let permsFails = false;

  /*
    The notes-password door, as a controllable stub.

    `notesAnswers` is a QUEUE rather than one value, because the control makes TWO calls per
    interaction — an empty candidate to ask whether a password is required at all, then the typed
    one — and a stub that answered the same thing to both could not tell the two apart. Every case
    below states exactly what the controller says, in order.
  */
  const notesAsked: { candidate: string }[] = [];
  /*
    `null` means REJECT that call. The control makes two round trips and each has its own catch, so a
    stub that could only fail every call left the second one untested — which is exactly what the
    negative control for it reported: it did not fire.
  */
  let notesAnswers: ({ required: boolean; ok: boolean } | null)[] = [];
  let notesFails = false;

  const actions = new RoomUserActions<User>({
    dialogs,
    toasts,
    notesCheck: (payload: { candidate: string }) => {
      notesAsked.push(payload);
      if (notesFails) return Promise.reject(new Error('controller unreachable'));
      const next = notesAnswers.shift();
      if (next === null) return Promise.reject(new Error('controller unreachable'));
      return Promise.resolve(next ?? { required: true, ok: false });
    },
    commands: {
      presenter: (payload) =>
        presenterFails
          ? Promise.reject(new Error('refused'))
          : (sent.push(payload), Promise.resolve(null)),
      editUsername: () => Promise.resolve(null),
      /* `debug-log` sends and says nothing — the recorded ids are what its branch is asserted on. */
      requestDebugLog: (targetUserId: number) => (
        debugLogsAsked.push(targetUserId),
        Promise.resolve(null)
      ),
      /* Records the payload AND can be made to refuse, which is what the failure path is asserted on. */
      uploadProfilePicture: (payload: { targetUserId: number; file: File }) =>
        profilePictureFails
          ? Promise.reject(new Error('That is not an image.'))
          : (profilePicturesSent.push(payload), Promise.resolve(null)),
      muteChat: (payload: { targetUserId: number }) => (
        mutesSent.push(payload),
        Promise.resolve(null)
      ),
      // Recorded separately from the 24-hour mute: they write two different stores, and a harness
      // that funnelled both into one list could not tell a fixed control from a mislabelled one.
      muteChatIndefinitely: (payload: { targetUserId: number }) => (
        indefiniteMutesSent.push(payload),
        Promise.resolve(null)
      ),
      unmuteChat: () =>
        unmuteFails ? Promise.reject(new Error('refused')) : Promise.resolve(null),
      sessionSendUrl: (payload: { cmd: string; url: string }) => (
        urlsSent.push(payload),
        Promise.resolve(null)
      ),
      restartAudio: (targetUserId: number) => (
        audioRestarts.push(targetUserId),
        Promise.resolve(null)
      ),
      kickUser: (payload: { targetUserId: number; message: string; ban?: boolean }) => (
        kicksSent.push(payload),
        Promise.resolve(null)
      ),
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
      connectedUsers: options.roster ?? [
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
    notesAsked,
    setNotesAnswers: (answers: ({ required: boolean; ok: boolean } | null)[]) => {
      notesAnswers = answers;
    },
    failNotesCheck: () => {
      notesFails = true;
    },
    sent,
    opened,
    mentioned,
    saved,
    reloadsSent,
    kicksSent,
    urlsSent,
    mutesSent,
    debugLogsAsked,
    profilePicturesSent,
    failProfilePicture: () => (profilePictureFails = true),
    indefiniteMutesSent,
    audioRestarts,
    permsSent,
    failPerms: () => (permsFails = true),
    failUnmute: () => (unmuteFails = true),
    failPresenter: () => (presenterFails = true),
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

  it('mute-chat-24 sends a real mute and says the captured words, in that order', () => {
    /*
      The third entry ever removed from `EXACT_ALERTS`. This button raised the reference's own
      "user chat muted" over nothing at all while a working mute — the message context menu's
      `mute24` — sat in the same source with nothing joining them.

      Both halves are asserted, because either alone passes against the bug: the ALERT alone passed
      for months while nothing was sent, and the SEND alone would not catch the wording drifting off
      the capture.
    */
    const { actions, dialogs, mutesSent } = make();
    actions.handle('mute-chat-24', TARGET);
    expect(mutesSent, 'the command is sent, to the member the modal is open on').toEqual([
      { targetUserId: TARGET.id }
    ]);
    expect(dialogs.alert, "the capture's own wording, from muteChat(e) at byte 2080089").toBe(
      'user chat muted'
    );
  });

  it('mute-chat-indefinitely sends the INDEFINITE command, not the 24-hour one', () => {
    /*
      The FOURTH and last entry removed from `EXACT_ALERTS`, and the one that stayed longest for a
      real reason: the indefinite mute already existed as the controller's opcode 3 and what was
      missing was a door from the room to it. It raised the capture's "user chat muted" and the
      member kept posting.

      WHICH command is asserted, not merely that one was sent. Folding this button onto `muteChat`
      would have been the tempting fix — one line, and every "did it send" assertion would pass —
      and it would have written a 24-hour row while telling the presenter the mute was indefinite.
      A control whose label and behaviour disagree is worse than one honestly listed as inert.
    */
    const { actions, dialogs, mutesSent, indefiniteMutesSent } = make();
    actions.handle('mute-chat-indefinitely', TARGET);
    expect(
      indefiniteMutesSent,
      'the indefinite command, to the member the modal is open on'
    ).toEqual([{ targetUserId: TARGET.id }]);
    expect(mutesSent, 'and NOT the 24-hour one, which writes a different store').toEqual([]);
    /*
      The same wording as its neighbour, and that is the capture's rather than an oversight: upstream
      `muteChat(e)` alerts once, before the send, whatever `e` is. Two sentences here would be an
      invention that reads like a fix.
    */
    expect(dialogs.alert).toBe('user chat muted');
  });

  it('the three peer commands each send their own subCmd to the named member', () => {
    /*
      These three buttons were DEAD while their command, their receiver and a neighbouring caller
      (`muteAllNonAdmins`) all existed — `user-action-intent.ts` carries the account. The assertion
      is per-action rather than "something was sent", because the failure that matters here is a
      CROSSED mapping: `mute-camera` reaching `mutemic` would cut the wrong stream on somebody
      else's machine and nothing on screen would say so.
    */
    const { actions, sent } = make();
    actions.handle('mute-mic', TARGET);
    actions.handle('mute-camera', TARGET);
    actions.handle('stop-screens', TARGET);
    expect(sent).toEqual([
      { subCmd: 'mutemic', targetUserId: TARGET.id },
      { subCmd: 'mutecam', targetUserId: TARGET.id },
      { subCmd: 'mutescreens', targetUserId: TARGET.id }
    ]);
  });

  it('raises NO success alert for them, because the capture raises none', () => {
    /*
      `remotePresCommand(c)` at byte 2080529 is one line with no `bootbox` after it, unlike
      `forceReload` and `remoteRestartAudio` directly below it, which both raise one. An alert here
      would be an invented string — and the three were in `INERT_ACTIONS`, not `EXACT_ALERTS`, which
      is the same fact recorded from the other side.
    */
    const { actions, dialogs, toasts } = make();
    actions.handle('mute-mic', TARGET);
    expect(dialogs.alert).toBeNull();
    expect(toasts.notices).toEqual([]);
  });

  it('surfaces a refused peer command rather than dropping it', async () => {
    // Silent on success is the reference. Silent on FAILURE is the defect class being removed: a
    // presenter whose mute did not land has to know.
    const { actions, dialogs, failPresenter } = make();
    failPresenter();
    actions.handle('stop-screens', TARGET);
    await vi.waitFor(() => expect(dialogs.alert).toBe('Command failed.'));
  });

  it("restart-audio sends to the named member and keeps the capture's own alert", () => {
    /*
      The fourth and last liar with a captured wire already waiting for it. Unlike the three peer
      mutes above, this sender DOES raise an alert upstream —
      `sendServerAdminCommand("remoteRestartAudio", this.user), bootbox.alert("Audio restart request
      sent OK")` at byte 2080461 — so the alert is asserted as well as the send. Two neighbouring
      methods in the same capture, two different behaviours, both reproduced.
    */
    const { actions, dialogs, audioRestarts } = make();
    actions.handle('restart-audio', TARGET);
    expect(audioRestarts).toEqual([TARGET.id]);
    expect(dialogs.alert).toBe('Audio restart request sent OK');
  });

  it('grants notes management WITHOUT prompting when no password is configured', async () => {
    /*
      Upstream's first branch, at bundle byte 2,081,768:
      `needPasswordForUserNotes && !allowToManageNotes ? bootbox.prompt(...) : allowToManageNotes = !0`.

      A room with nothing configured never sees a dialog. The room cannot make that decision itself —
      the setting is credential-shaped and never crosses — so it asks with an EMPTY candidate and the
      controller answers `required:false`. That round trip is what this asserts, including that no
      prompt was raised.
    */
    const { actions, dialogs, notesAsked, setNotesAnswers } = make();
    setNotesAnswers([{ required: false, ok: true }]);

    actions.handle('admin-notes-password', TARGET);
    await vi.waitFor(() => expect(actions.canManageNotes).toBe(true));

    expect(notesAsked).toEqual([{ candidate: '' }]);
    expect(dialogs.prompt, 'upstream raises no dialog when nothing is configured').toBeNull();
    expect(dialogs.alert).toBeNull();
  });

  it('prompts when a password IS configured, and grants on the right one', async () => {
    const { actions, dialogs, notesAsked, setNotesAnswers } = make();
    setNotesAnswers([
      { required: true, ok: false }, // the empty probe: configured, so prompt
      { required: true, ok: true } //  the typed value: correct
    ]);

    actions.handle('admin-notes-password', TARGET);
    await vi.waitFor(() => expect(dialogs.prompt).not.toBeNull());
    expect(dialogs.prompt?.title).toBe("Please enter the password to manage user's notes:");
    expect(actions.canManageNotes, 'not granted before anything is typed').toBe(false);

    dialogs.prompt?.onconfirm('  hunter2  ');
    await vi.waitFor(() => expect(actions.canManageNotes).toBe(true));

    /*
      The typed value REACHES the server untrimmed. Trimming is the controller's job — it reproduces
      upstream's `e.trim() === needPasswordForUserNotes`, where the candidate is trimmed and the
      stored value is not — and doing it in both places is how the two would later disagree.
    */
    expect(notesAsked).toEqual([{ candidate: '' }, { candidate: '  hunter2  ' }]);
    expect(dialogs.alert).toBeNull();
  });

  it('says "Wrong password!" on the wrong one, and grants nothing', async () => {
    const { actions, dialogs, setNotesAnswers } = make();
    setNotesAnswers([
      { required: true, ok: false },
      { required: true, ok: false }
    ]);

    actions.handle('admin-notes-password', TARGET);
    await vi.waitFor(() => expect(dialogs.prompt).not.toBeNull());
    dialogs.prompt?.onconfirm('nope');

    // The reference's exact string, and the one thing about this control that was always right.
    await vi.waitFor(() => expect(dialogs.alert).toBe('Wrong password!'));
    expect(actions.canManageNotes).toBe(false);
  });

  it('an EMPTY answer closes the prompt and says nothing, as upstream does', async () => {
    /*
      `e && (…)` upstream: dismissing the dialog is not a failed attempt. Telling a presenter they
      typed the wrong password when they typed nothing would be a second lie in the control that just
      lost its first.
    */
    const { actions, dialogs, notesAsked, setNotesAnswers } = make();
    setNotesAnswers([{ required: true, ok: false }]);

    actions.handle('admin-notes-password', TARGET);
    await vi.waitFor(() => expect(dialogs.prompt).not.toBeNull());
    dialogs.prompt?.onconfirm('   ');

    expect(dialogs.prompt).toBeNull();
    expect(dialogs.alert).toBeNull();
    expect(actions.canManageNotes).toBe(false);
    expect(notesAsked, 'nothing is sent for an empty answer').toEqual([{ candidate: '' }]);
  });

  it('an unreachable controller neither grants NOR claims the password was wrong', async () => {
    /*
      A DIVERGENCE from the reference, and the assertion that pins it. Upstream has no network in
      this path at all — it compares a value it already holds — so "could not ask" is a third outcome
      that only exists here. Collapsing it into the refusal would reproduce the exact defect this
      control was repaired for: telling a presenter their correct password was wrong.
    */
    const { actions, dialogs, failNotesCheck } = make();
    failNotesCheck();

    actions.handle('admin-notes-password', TARGET);
    await vi.waitFor(() => expect(dialogs.alert).not.toBeNull());

    expect(dialogs.alert).not.toBe('Wrong password!');
    expect(actions.canManageNotes, 'a network failure must not grant').toBe(false);
  });

  it('a controller that fails on the SECOND call also refuses to grant or blame', async () => {
    /*
      The other half of the unreachable case, and it exists because its negative control did not
      fire. The first test fails the empty PROBE, which is caught in `#askToManageNotes`; the typed
      submission is caught in `#submitNotesPassword`, a different branch that nothing reached. A
      control that cannot fail is worse than no control, and this is the test that answer produced.
    */
    const { actions, dialogs, setNotesAnswers } = make();
    setNotesAnswers([{ required: true, ok: false }, null]);

    actions.handle('admin-notes-password', TARGET);
    await vi.waitFor(() => expect(dialogs.prompt).not.toBeNull());
    dialogs.prompt?.onconfirm('hunter2');

    await vi.waitFor(() => expect(dialogs.alert).not.toBeNull());
    expect(dialogs.alert, 'a network failure must not read as a wrong password').not.toBe(
      'Wrong password!'
    );
    expect(actions.canManageNotes).toBe(false);
  });

  it('NEITHER mute is one of the controls that only talk any more', () => {
    /*
      The structural half. Re-adding either entry to `EXACT_ALERTS` would restore the exact original
      defect — `handle` consults that table last, so an entry there is reached only when no branch
      claimed the action, and the branch above would simply be dead. This is what makes that visible.

      This case asserted the OPPOSITE for the indefinite one until 2026-08-27 — *"it is still
      honestly listed, it has no door to the controller yet"* — and that was true and is the reason
      the assertion is migrated with the code rather than deleted. `internal/room-mute` is the door;
      the entry is gone; a negative assertion that quietly started passing for the wrong reason is
      the failure mode this repository has met four times.
    */
    expect(TOAST_ONLY_ACTIONS).not.toContain('mute-chat-24');
    expect(TOAST_ONLY_ACTIONS).not.toContain('mute-chat-indefinitely');
    /*
      WHAT IS LEFT IN THAT TABLE IS ASSERTED ONCE, AND NOT HERE.

      This block used to end with a second, character-identical
      `expect([...TOAST_ONLY_ACTIONS].sort()).toEqual(['restart-audio', 'save-permissions'])`, the
      same assertion `user-action-intent.test.ts` makes on the same imported constant. Found by a
      duplication audit on 2026-08-29 and removed here rather than there, because the catalog's own
      test is where that assertion belongs: its docblock carries the history of the number — twelve,
      then four, then three, then two — and what each removal meant.

      The two `.not.toContain` assertions above are NOT duplicates and stay. They are behavioural:
      `handle` consults `EXACT_ALERTS` last, so re-adding either entry would make the branch above
      dead, and only a test that exercises the handler can see that.

      A third entry arriving is the thing to look at, because it would be the first liar back in the
      room — and `user-action-intent.test.ts` is where that fails.
    */
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

/**
 * `kick` SENDS, and `kick-ban` deliberately does not.
 *
 * ## What this replaces
 *
 * Until 2026-08-23 both actions shared one branch that opened a prompt, closed the modal and raised
 * *"User kicked OK"* — while sending nothing, because this room had no kick command to call. A
 * presenter clicked Kick, was told the person was gone, and the person stayed.
 *
 * It passed `user-action-disposition-contract.test.ts` the whole time, counted as `handled` because
 * a branch existed. A branch that dialogs and does not act is a fourth disposition that contract
 * cannot see; `TODO.md` row 7 carries that hole.
 *
 * ## Why `kick-ban` is asserted as SILENT rather than as sending
 *
 * The reference's payload is `{user, msg, ban, kickAllInstances}`. A ban has to outlive the frame,
 * and this room has nowhere durable to record that somebody may not return. Pointing `kick-ban` at
 * the plain kick would drop the ban silently — the same shape of defect the kick fix removes — so it
 * is inert, declared in `INERT_ACTIONS`, and this asserts that it stays that way rather than
 * quietly acquiring the wrong behaviour.
 */
describe('kick', () => {
  it('sends the typed message to the selected member, and says so', () => {
    const harness = make({ isPresenter: true });
    harness.actions.handle('kick', TARGET);

    // The prompt is seeded with the reference's own default before anything is sent.
    expect(harness.dialogs.prompt?.value).toBe(
      'You have been kicked from the room by an administrator'
    );
    expect(harness.kicksSent).toEqual([]);

    harness.dialogs.prompt?.onconfirm('Please stop.');

    expect(harness.kicksSent).toEqual([
      { targetUserId: TARGET.id, message: 'Please stop.', ban: false }
    ]);
    expect(harness.dialogs.alert).toBe('User kicked OK');
  });

  /*
    THIS TEST USED TO ASSERT THE OPPOSITE, and its old name recorded a reason that was false:
    "kick-ban sends NOTHING — a ban needs storage this room does not have". The store,
    `roomUsers.banned`, had been in the controller's schema the whole time. Inverted 2026-08-23 with
    the endpoint that reaches it.
  */
  it('kick-ban sends the SAME command with ban:true, as upstream does in one payload', () => {
    const harness = make({ isPresenter: true });
    harness.actions.handle('kick-ban', TARGET);
    harness.dialogs.prompt?.onconfirm('Banned.');

    expect(harness.kicksSent).toEqual([{ targetUserId: TARGET.id, message: 'Banned.', ban: true }]);
  });

  /*
    The two share ONE branch, as upstream shares one payload — so the flag is what distinguishes
    them, and it is asserted EXPLICITLY on both sides. `false` rather than absent: the schema
    defaults it, but a plain kick that silently omitted the field would make "did this ban?"
    depend on a default rather than on what was sent.
  */
  it('a plain kick sends ban:false explicitly, so the two cannot be confused', () => {
    const harness = make({ isPresenter: true });
    harness.actions.handle('kick', TARGET);
    harness.dialogs.prompt?.onconfirm('Please stop.');

    expect(harness.kicksSent[0]?.ban).toBe(false);
  });
});

/**
 * `kick-duplicates` KICKS, which it never did before.
 *
 * It alerted ``"No duplicates found for "+nick`` unconditionally and never read a roster — one of
 * the five controls that reported success while doing nothing. The rule is
 * `#lib/kick-duplicates.ts`; this asserts the wiring, which is the part a pure test cannot see.
 *
 * `ROW({ id: 3, … emailHash: 'hash-cy' })` is a DIFFERENT person, and it must survive: matching on
 * anything other than `emailHash` would kick them too, which is the failure that makes this feature
 * dangerous rather than merely broken.
 */
describe('kick-duplicates', () => {
  /*
    A roster with TWO other logins of Bo (`hash-bo`, ids 7 and 8), one unrelated person (`hash-cy`),
    and Bo's own row. Cy must survive: matching on anything but `emailHash` would kick a stranger,
    which is the failure that makes this feature dangerous rather than merely broken.
  */
  const CROWD = [
    ROW({ id: 5, displayName: 'Bo', emailHash: 'hash-bo' }),
    ROW({ id: 7, displayName: 'Bo', emailHash: 'hash-bo' }),
    ROW({ id: 8, displayName: 'Bo', emailHash: 'hash-bo' }),
    ROW({ id: 3, displayName: 'Cy', emailHash: 'hash-cy' })
  ];

  it('kicks every OTHER login of the same person, never the target, never a stranger', () => {
    const harness = make({ isPresenter: true, roster: CROWD });
    harness.actions.handle('kick-duplicates', TARGET);
    harness.dialogs.prompt?.onconfirm('Two of you.');

    expect(harness.kicksSent.map((k) => k.targetUserId).sort()).toEqual([7, 8]);
    expect(harness.kicksSent.every((k) => k.message === 'Two of you.')).toBe(true);
    expect(harness.dialogs.alert).toBe('Kicked 2 duplicate(s) of Bo');
  });

  it('says so when there are none, without sending anything', () => {
    const harness = make({ isPresenter: true, roster: [ROW({ id: 3, emailHash: 'hash-cy' })] });
    harness.actions.handle('kick-duplicates', TARGET);
    harness.dialogs.prompt?.onconfirm('Please stop.');

    expect(harness.kicksSent).toEqual([]);
    expect(harness.dialogs.alert).toBe('No duplicates found for Bo');
  });
});

/**
 * The two Session Control broadcasts that alerted `Command send OK.` and sent nothing.
 *
 * They shared a branch with `session-send-video`, which is GENUINE — it validates, refuses a
 * duplicate and writes `localStorage`. That is why they lasted: the branch reads as working code.
 * Command names are the capture's, at bytes 1015180 and 1015357.
 */
describe('session send-to-room broadcasts', () => {
  it('sends the sales image under the captured command name', () => {
    const harness = make({ isPresenter: true });
    harness.actions.handle('session-send-sales-image', TARGET);
    harness.dialogs.prompt?.onconfirm('https://example.test/a.png');

    expect(harness.urlsSent).toEqual([
      { cmd: 'sendSalesImageToChat', url: 'https://example.test/a.png' }
    ]);
    expect(harness.dialogs.alert).toBe('Command send OK.');
  });

  it('sends the users URL under its own command name, not the image one', () => {
    const harness = make({ isPresenter: true });
    harness.actions.handle('session-send-users-url', TARGET);
    harness.dialogs.prompt?.onconfirm('https://example.test/go');

    expect(harness.urlsSent).toEqual([{ cmd: 'sendUsersToURL', url: 'https://example.test/go' }]);
  });

  it('refuses a url with no scheme, and sends nothing', () => {
    const harness = make({ isPresenter: true });
    harness.actions.handle('session-send-users-url', TARGET);
    harness.dialogs.prompt?.onconfirm('example.test/go');

    expect(harness.urlsSent).toEqual([]);
  });
});
