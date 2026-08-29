// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  INERT_ACTIONS,
  INERT_ACTION_NAMES,
  PEER_SUBCMDS,
  TOAST_ONLY_ACTIONS
} from './user-action-intent.js';
import { SESSION_LOCK_WRITES } from './room/session-lock-writes.js';

import { RoomDialogs } from './room/dialogs.svelte.js';
import { RoomToasts } from './room/toasts.svelte.js';
import { RoomUserActions } from './room/user-actions.svelte.js';

/*
  EVERY USER ACTION HAS A DISPOSITION, AND THERE IS NO FOURTH OPTION.

  ## The defect this exists for, found 2026-08-23

  `ModalHost.svelte` dispatches user actions as STRINGS — `onUserAction('kick', targetUser)`. Nothing
  connects that string to a handler: not the compiler, not a type, not the build. `RoomUserActions.handle`
  is a chain of `if (action === '…')` tests ending on a bare `if (fixedAlert)` with **no `else`**, so an
  action nobody wrote a branch for returns having done nothing at all — no command, no toast, no error,
  nothing in the console. The presenter sees a button, clicks it, and the room does not move.

  Diffing all 42 dispatched strings against the 27 handled and the 5 in `EXACT_ALERTS` found **eleven**
  such controls. `TODO.md` knew about two. **Nine had never been recorded anywhere** — no test, no row,
  no comment. That is the signature of a defect class that cannot be found by eye: each one looks
  perfectly correct at its call site, and the absence is somewhere else entirely.

  It is the same shape as `presenterCommand`, which shipped dead for three commits, and as `forceReload`,
  which still has both ends and zero call sites. A string that names a behaviour is invisible to every
  tool that would otherwise notice the behaviour is missing.

  ## The rule, and why it is deny-by-default

  Every dispatched action must fall in EXACTLY ONE of three buckets:

    handled  — a real branch in `RoomUserActions.handle`
    alerted  — a key of `EXACT_ALERTS`: it lies, it is row W's family, and it is tracked as such
    inert    — a key of `INERT_ACTIONS`, carrying a REASON and what would unblock it

  Anything else fails. A twelfth silent control cannot be added without someone writing down why, and
  wiring one up means deleting its `INERT_ACTIONS` entry — at which point this test demands a real
  handler. The disposition cannot drift out of step with the code in either direction.

  An `INERT_ACTIONS` entry is **not permission** for a control to be dead. It is a record that it IS
  dead, and the reason. That distinction is the whole point: the entries are a to-do list with
  evidence attached, not a suppression file.
*/

/** Every `.svelte` file that could dispatch a user action. */
const TEMPLATES = globSync('src/**/*.svelte', { cwd: process.cwd() });

/** Every `onUserAction('literal'` in the source, with where it was found. */
function dispatchedActions(): Map<string, string> {
  const found = new Map<string, string>();
  for (const file of TEMPLATES) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/onUserAction\(\s*'([a-z0-9-]+)'/g)) {
      const line = source.slice(0, match.index).split('\n').length;
      if (!found.has(match[1])) found.set(match[1], `${file}:${line}`);
    }
  }
  return found;
}

/**
 * The actions `handle()` actually branches on — everything BEFORE the alert tail.
 *
 * The cut matters and is not cosmetic. `handle()` ends with:
 *
 *     const fixedAlert = userActionAlert(action);
 *     if (fixedAlert) {
 *       if (action === 'save-permissions') this.#closeModal();
 *       ...
 *
 * That inner test is not a handler. It is a modal-close special case ON the alert path, and
 * `save-permissions` is squarely one of row W's liars. A first draft of this scanner read the whole
 * file and reported `save-permissions` as "handled AND alerted" — an overlap that does not exist in
 * the code, produced entirely by the instrument. Reading only up to the tail is what makes the three
 * buckets mean what they say.
 */
function handledActions(): Set<string> {
  /*
    BOTH dispatchers, since 2026-08-23. Eleven session actions moved to `RoomSessionControl` — they
    act on the ROOM, not on a user — and `RoomUserActions.handle` now delegates to it before its own
    chain. Reading only the original file would report every moved action as "dispatched into the
    void", which is a defect report about working code: the exact manufactured-defect failure this
    repository forbids. A gate that does not follow an extraction is worse than no gate, because it
    goes red on the refactor and green on the regression.
  */
  const session = readFileSync('src/lib/room/session-control.ts', 'utf8');
  /*
    `RoomKicks` joined them on 2026-08-23, when `kick` and `kick-duplicates` moved out under the
    owner's extraction ruling. Adding it here is not bookkeeping: this function's own note says a
    gate that does not follow an extraction "goes red on the refactor and green on the regression",
    and it did exactly that on this move — which is the second time that note has paid for itself.
  */
  const kicks = readFileSync('src/lib/room/kicks.ts', 'utf8');
  // `mute-chat-24` and `unmute-chat` moved into `RoomChatMute` on 2026-08-23. A scanner that does
  // not read it would file both as UNHANDLED and demand an `INERT_ACTIONS` entry for a live wire.
  const chatMute = readFileSync('src/lib/room/chat-mute.ts', 'utf8');
  /*
    `RoomSessionControl` SPLIT AGAIN on 2026-08-27 and the scanner followed it a THIRD time, which is
    the third payment on the note above. Its nine actions divide on whether anybody outside this
    browser learns about the act: five reach the server (`session-room-commands.ts`) and three write
    a preference (`session-lock-writes.ts`, a table rather than branches). Reading only the class
    would file eight live controls as dispatched into the void.

    The LOCK table is read as text like the rest. Its keys are the action names, so a scan for the
    string finds them — which is the property that makes a data table safe to move behind this gate,
    and would not hold if the keys were computed.
  */
  const sessionCommands = readFileSync('src/lib/room/session-room-commands.ts', 'utf8');
  const source = readFileSync('src/lib/room/user-actions.svelte.ts', 'utf8');
  const tail = source.indexOf('const fixedAlert = userActionAlert(action)');
  expect(
    tail,
    "handle()'s alert tail was not found — this scanner would read the whole file and mis-bucket the alert path"
  ).toBeGreaterThan(-1);
  const dispatchBody = source.slice(0, tail) + session + kicks + chatMute + sessionCommands;
  const literal = [...dispatchBody.matchAll(/action === '([a-z0-9-]+)'/g)].map((m) => m[1]);

  /*
    A FOURTH FORM OF HANDLING, and this scanner was blind to it — found 2026-08-23 the moment the
    first one appeared.

    `mute-mic`, `mute-camera` and `stop-screens` are handled by ONE branch, `if (action in
    PEER_SUBCMDS)`, because the three differ only in which sub-command they carry and three
    near-identical branches would be three chances for the mapping to cross. A literal
    `action === '…'` scan cannot see a table, so all three were reported as "dispatched into the
    void" — a defect report about a working wire, which is precisely the manufactured defect the
    note at the top of this function forbids.

    The KEYS are imported rather than matched out of the source. A regex over the table's text would
    re-introduce the same fragility one level down, and the import fails loudly if the export is
    renamed — where a regex would silently match nothing and quietly under-report again.
  */
  /*
    A FIFTH FORM, and it is the FOURTH one again: `SESSION_LOCK_WRITES` is a table for exactly the
    reason `PEER_SUBCMDS` is one — three lock actions differing only in which preferences they write.
    Its keys are IMPORTED for the reason recorded directly above: a regex over the table's text would
    re-introduce the fragility one level down and would silently match nothing on a rename, while an
    import fails loudly.

    This is the third extraction this scanner has had to follow, and the second table. The note at
    the top of the function — a gate that does not follow an extraction "goes red on the refactor and
    green on the regression" — has now paid for itself four times.
  */
  return new Set([...literal, ...Object.keys(PEER_SUBCMDS), ...Object.keys(SESSION_LOCK_WRITES)]);
}

describe('the dispatch surface is fully enumerated', () => {
  const dispatched = dispatchedActions();

  it('finds a plausible number of dispatched actions, so nothing below is vacuous', () => {
    /*
      If the pattern ever stops matching — the prop is renamed, the call site is reshaped — every
      assertion in this file passes against an empty set, and "no dead controls" would be indistinguishable
      from "no scan". Counted 42 on 2026-08-23; the floor is deliberately well below that so a genuine
      removal does not fail the gate, while a broken scanner does.
    */
    expect(
      dispatched.size,
      'the onUserAction scan matched almost nothing — fix the scanner, not the floor'
    ).toBeGreaterThan(30);
  });

  it('dispatches no action by a computed name, which would be invisible to this gate', () => {
    /*
      The one hole a literal scan cannot see. `onUserAction(someVariable)` would reach `handle()` with a
      name no test can enumerate — the `submitPollAction` defect in `TODO.md` row AG, which that row calls
      the WORST form because an interpolated name is assembled at runtime and connects to nothing.
      Deny it outright here rather than discover it later.
    */
    const computed: string[] = [];
    for (const file of TEMPLATES) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/onUserAction\(\s*([^'\s)][^,)]*)/g)) {
        const line = source.slice(0, match.index).split('\n').length;
        computed.push(`${file}:${line} — onUserAction(${match[1].trim().slice(0, 40)}`);
      }
    }
    expect(
      computed,
      `A user action is dispatched by a computed name. Nothing can enumerate it, so no gate can tell ` +
        `whether it reaches a handler:\n  ${computed.join('\n  ')}`
    ).toEqual([]);
  });
});

describe('every dispatched action has exactly one disposition', () => {
  const dispatched = dispatchedActions();
  const handled = handledActions();
  /*
    ALERTED means "reaches the alert tail and NOTHING ELSE" — the liars. It is DERIVED by subtracting
    the handled set rather than taken from `EXACT_ALERTS` directly, and that changed on 2026-08-23
    when `restart-audio` was wired.

    Why the subtraction is right rather than a loosening: `EXACT_ALERTS` is "the fixed alert for an
    action", not a defect list. Two entries in it belong to controls that genuinely send —
    `save-permissions`, which has always read its string from there, and now `restart-audio`, whose
    capture raises `bootbox.alert("Audio restart request sent OK")` immediately after the send at
    byte 2080461. Treating a table entry as proof of a lie would report both as dead controls, which
    is a defect report about working wires.

    The load-bearing rule is untouched: an action with NO branch and NO entry anywhere is still an
    orphan, and handled-AND-inert is still a contradiction. What is no longer a contradiction is
    "has a branch AND has a string", because that is what a working control with an alert looks like.
  */
  const alerted = new Set(TOAST_ONLY_ACTIONS.filter((name) => !handled.has(name)));
  const inert = new Set(INERT_ACTION_NAMES);

  it('handled, alerted and inert are the three buckets, and they do not overlap', () => {
    // A name in two buckets means two different answers to "what does this control do".
    const overlaps: string[] = [];
    for (const name of dispatched.keys()) {
      const buckets = [
        handled.has(name) ? 'handled' : null,
        alerted.has(name) ? 'alerted' : null,
        inert.has(name) ? 'inert' : null
      ].filter(Boolean);
      if (buckets.length > 1) overlaps.push(`${name} is ${buckets.join(' AND ')}`);
    }
    expect(
      overlaps,
      `An action has more than one disposition:\n  ${overlaps.join('\n  ')}`
    ).toEqual([]);
  });

  it('no action is dispatched into the void', () => {
    /*
      THE RULE. A failure here means a presenter can click something that does nothing and is told
      nothing — and that nobody has written down why.
    */
    const orphans: string[] = [];
    for (const [name, where] of dispatched) {
      if (handled.has(name) || alerted.has(name) || inert.has(name)) continue;
      orphans.push(`'${name}' at ${where}`);
    }

    expect(
      orphans,
      `These actions are dispatched but reach NOTHING — no branch in RoomUserActions.handle, no key in ` +
        `EXACT_ALERTS, no entry in INERT_ACTIONS. handle() ends on a bare 'if (fixedAlert)' with no ` +
        `fallback, so each of these returns having done nothing: no command, no toast, not even an ` +
        `error.\n  ${orphans.join('\n  ')}\n\nEither wire it up, or add it to INERT_ACTIONS with the ` +
        `reason it cannot be wired yet.`
    ).toEqual([]);
  });

  /**
   * THE FOURTH DISPOSITION, which this file spent months insisting did not exist.
   *
   * ## What it missed, and how
   *
   * The docblock at the top says every action falls in exactly one of handled / alerted / inert and
   * that "anything else fails". `kick` fell in none of them and passed anyway: it had a BRANCH, so
   * `handledActions()` counted it, and that branch opened a prompt, closed the modal and alerted
   * *"User kicked OK"* while sending nothing — because no kick command existed to send. A presenter
   * clicked Kick, was told the person was gone, and the person stayed.
   *
   * A branch that raises a dialog and does not act is the fourth option. It is WORSE than `inert`,
   * which at least stays silent, and worse than `alerted`, where the lie is at least tracked in
   * `EXACT_ALERTS`. Counting it as `handled` is how six of them accumulated unseen.
   *
   * ## The rule
   *
   * A handled branch must ACT: reach a command, write state, or delegate to a method that does.
   * Anything that only touches `#dialogs` / `#toasts` must be declared below with what is missing.
   *
   * ## Why a declared list rather than a cleverer scanner
   *
   * The same shape as `INERT_ACTIONS`: an entry is not permission, it is a record. Four of these
   * five cannot be built today — `kick-duplicates` needs `emailHash` on a roster that carries only
   * `{id, isP?}`, `admin-notes-password` needs `deleteAlertPW` to reach this room at all — and
   * inventing behaviour for them is what this repository forbids. Writing them down is what stops
   * a seventh joining them quietly.
   *
   * The probe that found them flagged SIX branches; three were false positives of its own marker
   * list and were read before being believed. That is why this is a list of names rather than a
   * heuristic left running: a heuristic that is right about five things and wrong about three is not
   * a gate, it is a rumour.
   */
  /**
   * NOTICES — a message ABOUT something the caller has already done or already refused.
   *
   * Deliberately separate from `DIALOG_ONLY_ACTIONS` below, which records LIES. These two are not
   * the same thing and collapsing them would turn that list into a suppression file, which is
   * exactly what this file's docblock says an entry must never be.
   *
   * `copied-to-clipboard` fires after the component has already copied; `invalid-restream-link`
   * reports a validation the caller has already failed. Neither claims the room did something it
   * did not. There is nothing for either to act on.
   */
  const NOTICE_ACTIONS: Readonly<Record<string, string>> = {
    'copied-to-clipboard': 'the copy already happened in the component; this is the confirmation',
    'invalid-restream-link': 'the caller already rejected the URL; this reports why'
  };

  /*
    `session-save-close-message` LEFT this table on 2026-08-27 — it saves for real now, through
    `saveCloseMessage`, and its action name is no longer dispatched at all: the editor's text cannot
    travel on an action STRING, so `ModalHost` calls a receiver instead.

    **`admin-notes-password` LEFT IT ON 2026-08-29, and the table is now EMPTY.** It was the last
    entry, and its own text named what it needed: *"needs `needPasswordForUserNotes` compared on the
    CONTROLLER, and a notes pane behind it to unlock."* The first half is built —
    `internal/room-notes-auth/[code]` compares, `notes-auth.remote.ts` asks, and
    `RoomUserActions` grants — so the branch reaches a server command and is no longer dialog-only.

    The second half is NOT built and is not pretended to be. Upstream gates two things on
    `allowToManageNotes`: the password panel (rendered while false) and the member's own notes with a
    delete per row (rendered while true). Only the first exists here, because `notes` is room-scoped —
    keyed by `room_short_code` with no member column — so there are no per-member notes to list. That
    is a schema change and its own feature. What is fixed is the LIE: the control compared nothing and
    said "Wrong password!" to a correct password, and now it compares and the panel it gates goes
    away. An empty table is the honest state, not a placeholder for the next entry.
  */
  const DIALOG_ONLY_ACTIONS: Readonly<Record<string, string>> = {};

  it('a handled branch that only raises a dialog is DECLARED, not silently counted as handled', () => {
    /*
      Reads each branch of the dispatch chain and asks whether it does anything beyond dialogs and
      toasts. The markers are the ways this class acts: a server command, the managed lists, a
      preference, a modal, a rename, a delegate method call, or writing its own selection state.
    */
    const session = readFileSync('src/lib/room/session-control.ts', 'utf8');
    const kicks = readFileSync('src/lib/room/kicks.ts', 'utf8');
    // `mute-chat-24` and `unmute-chat` moved into `RoomChatMute` on 2026-08-23. A scanner that does
    // not read it would file both as UNHANDLED and demand an `INERT_ACTIONS` entry for a live wire.
    const chatMute = readFileSync('src/lib/room/chat-mute.ts', 'utf8');
    // The 2026-08-27 split of `RoomSessionControl`; the note above about a gate following an
    // extraction, paid a third time. Both halves are read, or eight live controls read as inert.
    const sessionCommands = readFileSync('src/lib/room/session-room-commands.ts', 'utf8');
    const sessionLocks = readFileSync('src/lib/room/session-lock-writes.ts', 'utf8');
    const source = readFileSync('src/lib/room/user-actions.svelte.ts', 'utf8');
    const tail = source.indexOf('const fixedAlert = userActionAlert(action)');
    const body =
      source.slice(0, tail) + session + kicks + chatMute + sessionCommands + sessionLocks;

    /*
      THE MARKER LIST NEEDED A CATALOG HALF, and 2026-08-26 is when it cost something.

      `session-refresh-roster` and `session-soft-reset` were wired to real commands that day, and
      this assertion reported both as still dialog-only. The instrument was wrong, not the code:
      every marker below is a `this.#…` collaborator, and those two branches call an IMPORTED remote
      command directly — `refreshRoster()`, `softReset()` — because `RoomSessionControl` has no
      command port to route through.

      Adding two string literals would have worked once and left the next author in the same trap,
      which is the hand-kept-list failure `source-size-contract` and the orphan gate have each paid
      for already. So the remote commands are DISCOVERED: every name imported from a `*.remote`
      module, in any of the four sources, counts as acting. A `.remote` import is by construction a
      call to the server, which is the strongest possible evidence that a branch is not merely
      talking to the user.

      The hand-written markers stay for the collaborators, which are not discoverable this way.
    */
    const importedRemoteCommands = [
      ...body.matchAll(/import\s*\{([^}]+)\}\s*from\s*'[^']*\.remote'/g)
    ].flatMap((match) =>
      match[1]
        .split(',')
        .map((name) => name.split(' as ').pop()!.trim())
        .filter(Boolean)
        .map((name) => `${name}(`)
    );

    const ACTS = [
      ...importedRemoteCommands,
      'this.#commands.',
      'this.#managed.',
      'this.#savePreference',
      'this.#openModal',
      'this.#mentionUser',
      'this.#hidePreviewWindows',
      'this.#reload',
      'this.#clearSelectedMessage',
      'this.#selected',
      'this.#closeUserMenu',
      'this.#announceThenSend',
      'this.#updateUsername',
      'this.#unmuteChat',
      /*
        `admin-notes-password`, wired 2026-08-29. Its branch calls one private method because the
        control delegates to RoomNotesAccess, which makes two server round trips — an empty candidate to learn whether a password is
        configured at all, which is upstream's own pre-prompt branch, then the typed one — and
        `handle` is synchronous. Adding it here is the gate doing its job: it refused the wiring
        until the new effect was declared, which is exactly what it refuses a dead control for.
      */
      'this.#notes.',
      'this.muteAllNonAdmins',
      'localStorage.setItem',
      'playSoundEffect'
    ];

    const undeclared: string[] = [];
    /*
      TOP-LEVEL branches only — `\n    if (action === `, at four spaces.

      Splitting on every `if (action === ` cut the `session-send-*` branch at its NESTED
      `if (action === 'session-send-video')`, which put that branch's `localStorage.setItem` in a
      different chunk from its header and reported working code as dialog-only. The instrument was
      wrong, not the code; fixed here rather than by adding a true entry to the list below, which
      would have buried a real defect under a false one.
    */
    const branches = body.split(/(?=\n {4}if \(action === ')/g).slice(1);
    expect(
      branches.length,
      'the branch split matched nothing — this assertion would be vacuous'
    ).toBeGreaterThan(10);

    for (const branch of branches) {
      if (ACTS.some((marker) => branch.includes(marker))) continue;
      for (const name of [...branch.matchAll(/action === '([a-z0-9-]+)'/g)].map((m) => m[1])) {
        if (name in DIALOG_ONLY_ACTIONS || name in NOTICE_ACTIONS) continue;
        if (alerted.has(name) || inert.has(name)) continue;
        undeclared.push(name);
      }
    }

    expect(
      [...new Set(undeclared)],
      `These actions have a branch that raises a dialog and does NOTHING else — no command, no ` +
        `state, no delegate. They are counted as "handled" and they are not: the control reports ` +
        `success and the room does not move, which is the defect kick shipped with.\n  ` +
        `${[...new Set(undeclared)].join('\n  ')}\n\nEither make it act, or add it to ` +
        `DIALOG_ONLY_ACTIONS with what is missing.`
    ).toEqual([]);
  });

  it('every DIALOG_ONLY_ACTIONS entry is real: dispatched, and still not acting', () => {
    /*
      The staleness half, matching what `INERT_ACTIONS` gets next door. An entry that has since been
      wired must be DELETED from the list rather than left as a false accusation against working
      code — the same direction `kick` travelled out of it.
    */
    const stale: string[] = [];
    for (const name of Object.keys(DIALOG_ONLY_ACTIONS)) {
      if (!dispatched.has(name))
        stale.push(`${name} is declared dialog-only but nothing dispatches it`);
      if (!handled.has(name))
        stale.push(`${name} is declared dialog-only but has no branch at all`);
    }
    expect(stale, `Stale DIALOG_ONLY_ACTIONS entries:\n  ${stale.join('\n  ')}`).toEqual([]);
  });

  it('every INERT_ACTIONS entry is still dispatched somewhere, and still unhandled', () => {
    /*
      The other direction, which is what stops this map becoming a graveyard. An entry for a control
      that was deleted is a lie about the app; an entry for one that has since been WIRED is worse,
      because it records working code as broken and the next reader believes it.
    */
    const stale: string[] = [];
    for (const name of INERT_ACTION_NAMES) {
      if (!dispatched.has(name))
        stale.push(`'${name}' is listed inert but nothing dispatches it — delete the entry`);
      else if (handled.has(name))
        stale.push(
          `'${name}' is listed inert but handle() now branches on it — delete the entry, it is fixed`
        );
    }
    expect(stale, stale.join('\n  ')).toEqual([]);
  });

  it('every inert entry carries a real reason, not a placeholder', () => {
    // A reason like "TODO" is the dead scaffolding this repository forbids, one level up.
    for (const [name, reason] of Object.entries(INERT_ACTIONS)) {
      expect(reason.length, `${name}'s reason is too short to be one`).toBeGreaterThan(30);
      expect(reason, `${name} must cite where the control is`).toMatch(/\.svelte:\d+/);
    }
  });
});

/*
  THE RUNTIME HALF — the claim "these do nothing" is EXECUTED, not read.

  Everything above reads source text, and source text can be read wrongly. This mounts the real
  dispatcher and calls it with every inert action, then asserts that nothing observable happened: no
  dialog, no toast, no presenter command. If somebody wires one of these up without removing its entry,
  this goes red before the text-reading half does.
*/
describe('an inert action really does nothing, executed', () => {
  /* The row shape `RoomUserActions` constrains its generic to — every field, or the cast below
     would be hiding a real mismatch rather than a harness convenience. */
  type Row = {
    id: number;
    displayName: string;
    email: string;
    emailHash: string;
    avatarUrl: string;
    status: string;
    role: string;
  };

  function make() {
    const dialogs = new RoomDialogs();
    const toasts = new RoomToasts();
    const sent: { subCmd: string; targetUserId: number }[] = [];
    const opened: string[] = [];

    const actions = new RoomUserActions<Row>({
      dialogs,
      toasts,
      commands: {
        presenter: (payload: { subCmd: string; targetUserId: number }) => (
          sent.push(payload),
          Promise.resolve(null)
        ),
        editUsername: () => Promise.resolve(null),
        restartAudio: () => Promise.resolve(null),
        unmuteChat: () => Promise.resolve(null),
        forceReload: () => Promise.resolve(null)
      },
      session: () => ({
        user: { id: 1 },
        sessionHandle: 'room-1',
        connectedUsers: [
          {
            id: 2,
            displayName: 'Ada',
            email: 'a@example.test',
            emailHash: 'h-a',
            avatarUrl: '/a.png',
            status: 'online',
            role: 'user'
          }
        ]
      }),
      isPresenter: () => true,
      talking: () => [],
      rosterUsers: () => [],
      savePreference: () => {},
      openModal: (name: string) => opened.push(name),
      closeModal: () => {},
      closeUserMenu: () => {},
      mentionUser: () => {},
      clearSelectedMessage: () => {},
      hidePreviewWindows: () => {},
      defaultFollowStyle: () => ({
        color: '#ffffff',
        tickerColor: '#ffffff',
        usernameColor: '#365d7d',
        bgColor: '#000000',
        fontSize: 14,
        playSound: true
      }),
      reload: () => Promise.resolve()
    } as never);

    return { actions, dialogs, toasts, sent, opened };
  }

  it('a HANDLED action moves something — the positive control', () => {
    /*
      First, because every "nothing happened" assertion below passes trivially against a harness that
      is broken, mis-wired, or silently throwing. If this one does not move, none of the others means
      anything at all.
    */
    /*
      IT WAS `session-save-close-message` UNTIL 2026-08-27, when that control was wired for real and
      stopped being dispatched as an action at all. Re-pointed at another handled action rather than
      deleted, because a positive control that goes away with the thing it happened to name leaves
      every assertion below passing against a harness nobody checks.

      `session-lock` is a good replacement for the same reason it was easy to get wrong: it is
      handled through the `SESSION_LOCK_WRITES` table rather than an `action === '…'` branch, so a
      harness that could not reach a table would fail here first.
    */
    const { actions, dialogs } = make();
    actions.handle('session-lock', {
      id: 5,
      nick: 'Bo',
      emailHash: 'h',
      pic: '',
      status: 'online'
    } as never);
    expect(dialogs.alert, 'a handled action must produce its observable effect').toBe(
      'Session Locked'
    );
  });

  it('an ALERTED action raises its fixed alert — the second control', () => {
    /*
      The exemplar moved from `restart-audio` to `mute-chat-indefinitely` on 2026-08-23, because
      `restart-audio` was WIRED that day and is no longer one of these. This is the last dispatched
      control that reaches the alert tail and nothing else: it is `muteChat("0")` upstream, and an
      indefinite mute already exists as the controller's opcode 3 — what is missing is a door from
      the room to it.
    */
    const { actions, dialogs } = make();
    actions.handle('mute-chat-indefinitely', {
      id: 5,
      nick: 'Bo',
      emailHash: 'h',
      pic: '',
      status: 'online'
    } as never);
    expect(dialogs.alert, "row W's family lies, and the lie is observable").toBe('user chat muted');
  });

  it('every INERT action produces no dialog, no toast and no command', () => {
    for (const name of INERT_ACTION_NAMES) {
      const { actions, dialogs, toasts, sent, opened } = make();
      actions.handle(name, {
        id: 5,
        nick: 'Bo',
        emailHash: 'h',
        pic: '',
        status: 'online'
      } as never);

      expect(
        dialogs.alert,
        `'${name}' raised a dialog — it is no longer inert, remove its entry`
      ).toBeNull();
      expect(
        sent,
        `'${name}' sent a presenter command — it is no longer inert, remove its entry`
      ).toEqual([]);
      expect(opened, `'${name}' opened a modal — it is no longer inert, remove its entry`).toEqual(
        []
      );
      expect(
        toasts.notices.length,
        `'${name}' raised a toast — it is no longer inert, remove its entry`
      ).toBe(0);
    }
  });
});

/*
  ── THE CENSUS IN `TODO.md` ROW 4 IS THE ONE THIS FILE COMPUTES ───────────────────────────────────

  ## Why a prose sentence is asserted from a test

  Row 4 of `TODO.md` carries a one-line disposition census, and row 4 ends by naming THIS FILE as the
  authority — *"read it, not this row"*. That instruction was the whole enforcement: a reader who
  followed it got the truth, and a reader who did not got whatever the row last said.

  Row W, in the same file, records what that costs. Its own count of this family was written as
  seven, then nine, then twelve, and it says why in as many words: *"each was arithmetic over a
  previous number rather than a read"*. Row 4 then repeated the failure in a smaller way — its
  census said **40 dispatched, 6 inert, 3 carrying a fixed alert**, with `mute-chat-indefinitely`
  named as the one that sends nothing. That was true when written and stopped being true the SAME
  DAY: the control was wired on 2026-08-27 and its `EXACT_ALERTS` entry deleted. Row W recorded the
  change. Row 4 kept the superseded number, and the two rows contradicted each other in one file for
  two days.

  Measured 2026-08-29: **39 dispatched, 6 inert, 2 carrying a fixed alert, neither a liar.**

  ## What makes this cheap rather than ceremonial

  All three numbers are already computed above, for the buckets. Nothing new is measured here — the
  assertion only forbids the row from disagreeing with what this file already knew. A count that
  drifts now fails on the commit that drifts it, naming both numbers, instead of being discovered by
  somebody re-deriving it by hand a fortnight later.
*/
describe("TODO.md row 4's census still describes this code", () => {
  const TODO = readFileSync('../../TODO.md', 'utf8');
  const stated =
    /\*\*Disposition census, measured [\d-]+: (\d+) dispatched actions, (\d+) inert, (\d+) carrying a fixed alert/.exec(
      TODO
    );

  it('states a census in a form that can be checked', () => {
    /*
      Reworded away and this goes red rather than silently passing — the failure mode that makes a
      document-reading assertion worthless. `todo-next-coverage-contract.test.ts` guards its own
      totals line the same way, for the same reason.
    */
    expect(stated, 'row 4 no longer states a machine-checkable census').not.toBeNull();
  });

  it('counts the dispatched actions correctly', () => {
    expect(Number(stated![1])).toBe(dispatchedActions().size);
  });

  it('counts the inert actions correctly', () => {
    expect(Number(stated![2])).toBe(INERT_ACTION_NAMES.length);
  });

  it('counts the actions carrying a fixed alert correctly', () => {
    expect(Number(stated![3])).toBe(TOAST_ONLY_ACTIONS.length);
  });

  it('does not still name a control that has since been wired', () => {
    /*
      The specific way row 4 went stale, denied by name. `mute-chat-indefinitely` left `EXACT_ALERTS`
      on 2026-08-27; a census still calling it silent is describing a control that now sends.
    */
    const claimedSilent = /only `([a-z-]+)` sends nothing/.exec(TODO)?.[1];
    expect(
      claimedSilent && TOAST_ONLY_ACTIONS.includes(claimedSilent)
        ? []
        : [claimedSilent].filter(Boolean),
      `${claimedSilent} is named as sending nothing, but it is not in EXACT_ALERTS any more`
    ).toEqual([]);
  });
});
