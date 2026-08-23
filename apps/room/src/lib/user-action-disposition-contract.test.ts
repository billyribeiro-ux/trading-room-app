// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { INERT_ACTIONS, INERT_ACTION_NAMES, TOAST_ONLY_ACTIONS } from './user-action-intent.js';

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
  const source = readFileSync('src/lib/room/user-actions.svelte.ts', 'utf8');
  const tail = source.indexOf('const fixedAlert = userActionAlert(action)');
  expect(
    tail,
    "handle()'s alert tail was not found — this scanner would read the whole file and mis-bucket the alert path"
  ).toBeGreaterThan(-1);
  const dispatchBody = source.slice(0, tail);
  return new Set([...dispatchBody.matchAll(/action === '([a-z0-9-]+)'/g)].map((m) => m[1]));
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
  const alerted = new Set(TOAST_ONLY_ACTIONS);
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
    const { actions, dialogs } = make();
    actions.handle('session-save-close-message', {
      id: 5,
      nick: 'Bo',
      emailHash: 'h',
      pic: '',
      status: 'online'
    } as never);
    expect(dialogs.alert, 'a handled action must produce its observable effect').toBe(
      'Message Saved'
    );
  });

  it('an ALERTED action raises its fixed alert — the second control', () => {
    const { actions, dialogs } = make();
    actions.handle('restart-audio', {
      id: 5,
      nick: 'Bo',
      emailHash: 'h',
      pic: '',
      status: 'online'
    } as never);
    expect(dialogs.alert, "row W's family lies, and the lie is observable").toBe(
      'Audio restart request sent OK'
    );
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
