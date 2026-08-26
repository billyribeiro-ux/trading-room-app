import { readFileSync } from 'node:fs';
import { parse } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';

/*
  `focusOnScreen` — a presenter pulls the whole room to one screen.

  WHAT THIS REPLACED. `bringEveryoneToScreen` moved only the presenter, under a comment saying the
  broadcast "needs the media signalling channel, which is not wired yet". That was wrong about the
  mechanism and therefore wrong about the blocker: the reference does not use the media channel at
  all. `bringFocusToScreen(e) { e && this.appService.sendServerAdminCommand("focusOnScreen", {id: e}) }`
  is a SERVER command, and this room already carries server commands on the `cmds` channel — the
  same one `remotePresCommand` uses. The menu item said "Bring everyone here" and brought nobody.

  WHY THE SERVER HAS TO DECIDE. This is the one assertion in this file that is not about fidelity.
  A client that asked every other client to move screens, and was believed, is the shape of the
  2026-08-07 privilege escalation. The role is read from the session on the server, and
  `requireRoomShortCode` scopes the broadcast, so a presenter of one room cannot move another.

  THE LOOP GUARD. Upstream it is the `i` parameter of `onScreenShareTabChange(e, i = !0)`, passed
  false for programmatic changes. Here it is structural instead: `selectScreenTabByUser` is the only
  path that broadcasts, and `selectScreenTabOfId` — every programmatic caller, including the handler
  that receives this very command — does not. A boolean would let a future caller opt in by
  forgetting an argument.
*/

const BUNDLE = readFileSync(
  new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  'utf8'
);
const SERVER = readFileSync(new URL('../routes/+page.server.ts', import.meta.url), 'utf8');
const EVENTS = readFileSync(new URL('./room/events.svelte.ts', import.meta.url), 'utf8');
/*
  Added 2026-08-15: both actions became remote commands in `presenter-commands.remote.ts`. The
  assertions below were re-pointed in the same commit, not deleted — and the one that matters most
  is the LAST in this file, `does NOT loosen presenterCommand`. It is a `not.toContain`, so an
  extraction that left it reading `+page.server.ts` would have passed against a file no longer
  containing either command: green, guarding nothing, exactly the failure this suite shipped once
  today. It now reads the module that owns them, and asserts the slice was found first.
*/
const REMOTE = readFileSync(
  new URL('../routes/presenter-commands.remote.ts', import.meta.url),
  'utf8'
);
/*
  The gate itself moved a SECOND time, to `#lib/server/auth.ts`, when `for-all-broadcast.remote.ts`
  needed it too — leaving it in one `.remote.ts` would have recreated the duplication between
  modules instead of between actions. Asserted where it lives, so this stays a real check rather
  than a check of where a helper happens to sit today.
*/
const AUTH = readFileSync(new URL('./server/auth.ts', import.meta.url), 'utf8');

const stripComments = (source: string) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/.*$/gm, '');

/**
 * One component's one attribute, as the COMPILER sees it — the source text of the expression.
 *
 * `svelte.parse` rather than a regex, for the reason `each-key-contract.test.ts` gives: a pattern
 * built over markup matches the same characters wherever they sit, and what is being asserted here
 * is specifically that a named attribute of a named component carries a particular handler.
 *
 * Returns `null` when the component or the attribute is absent, so the caller asserts it was found
 * before asserting anything about it. A helper that returned `''` for "missing" would hand every
 * `not.toContain` below a free pass.
 */
const componentAttribute = (
  source: string,
  component: string,
  attribute: string
): string | null => {
  const ast = parse(source, { modern: true });
  let found: string | null = null;

  const visit = (node: unknown): void => {
    if (found !== null || !node || typeof node !== 'object') return;
    const candidate = node as {
      type?: string;
      name?: string;
      attributes?: { type?: string; name?: string; value?: unknown }[];
    };

    if (candidate.type === 'Component' && candidate.name === component) {
      for (const attr of candidate.attributes ?? []) {
        if (attr.type !== 'Attribute' || attr.name !== attribute) continue;
        // An `ExpressionTag` value; its expression carries the offsets into the original source.
        const value = attr.value as { expression?: { start?: number; end?: number } } | undefined;
        const expression = value?.expression;
        if (expression?.start === undefined || expression.end === undefined) continue;
        found = source.slice(expression.start, expression.end);
        return;
      }
    }

    for (const value of Object.values(node as Record<string, unknown>)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  };

  visit(ast.fragment);
  return found;
};

const serverCode = stripComments(SERVER);
/*
  The screen viewer left the page for `RoomScreens` in Phase 5 slice 11. Read as its own source, so
  an assertion about which screen is shown cannot pass against a file that no longer decides it.
*/
const screensModule = readFileSync(new URL('room/screens.svelte.ts', import.meta.url), 'utf8');
/*
  `selectScreenTabOfId` is a METHOD on `RoomMediaTransport` now, not a function in `+page.svelte`.
  Added 2026-08-17 when the guard below was found asserting on the empty string.
*/
const transportCode = stripComments(
  readFileSync(new URL('room/media-transport.svelte.ts', import.meta.url), 'utf8')
);
/*
  `+page.svelte` IS NO LONGER READ HERE, and its absence is the finding rather than an oversight.

  Until 2026-08-18 the tab strip's wiring spanned two files: `PresentationArea` declared a
  `selectScreenTabByUser` prop and the page filled it with `(id) => screens.selectTab(id)`, so this
  contract needed both halves to say anything. The facade slice deleted the prop — the pane holds
  `screens` and calls the method — so the whole loop guard is now assertable in the one file that
  owns it. The constant is deleted rather than left reading a file nothing asks about, because an
  unread `readFileSync` is the exact shape that let this file's guard assert on the empty string
  once already, recorded a hundred lines below.
*/
const eventsCode = stripComments(EVENTS);
const remoteCode = stripComments(REMOTE);

/*
  The two commands, sliced apart. They share a gate and a room scope, so an assertion over the whole
  module proves nothing about either — and a slice that silently returns '' is how a `not.toContain`
  goes green while guarding nothing, so both markers are asserted found.
*/
const commandSlice = (start: string, end: string) => {
  const from = remoteCode.indexOf(start);
  expect(from, `${start} must exist`).toBeGreaterThan(-1);
  const to = end === '' ? remoteCode.length : remoteCode.indexOf(end, from);
  expect(to, `${end} must follow ${start}`).toBeGreaterThan(from);
  return remoteCode.slice(from, to);
};
const focusCommand = () => commandSlice('export const focusOnScreen = command(', '');
const presenterCommandBody = () =>
  commandSlice('export const presenterCommand = command(', 'export const focusOnScreen = command(');

describe('the reference', () => {
  it('sends it as a SERVER command, not over the media channel', () => {
    expect(BUNDLE).toContain('sendServerAdminCommand("focusOnScreen",{id:e}');
  });

  it('the presenter tab change is what triggers it, gated on the preference', () => {
    expect(BUNDLE.replace(/\s+/g, '')).toContain(
      'i&&this.appService.globals.isPresenter&&this.appService.globals.preferences.makeUsersFollowMyScreens&&this.bringFocusToScreen('
    );
  });

  it('and the preference ships OFF', () => {
    expect(BUNDLE).toContain('makeUsersFollowMyScreens:!1');
  });
});

describe('the server owns the authority', () => {
  it('refuses a non-presenter', () => {
    /*
      The gate was inlined in BOTH actions as
      `requireUser(locals).role === 'staff' || requireUser(locals).role === 'admin'` — which is
      `isPresenterRole` spelled out by hand, twice, next to each other. It is now `presenterRoom()`,
      declared once, so the assertion is that this command reaches it rather than that it repeats it.
    */
    expect(AUTH).toContain('export function presenterRoom(): string {');
    expect(AUTH).toContain(
      "if (!isPresenterRole(requireUser(locals).role)) error(403, 'Presenters only.');"
    );
    expect(focusCommand()).toContain('publishToRoom(presenterRoom()');
  });

  it('scopes the broadcast to the caller’s own room', () => {
    /*
      Not a room id taken from the request — the session's, so room A cannot move room B. There is
      no argument it could come from either: the whole payload is the screen id string.

      `presenterRoom()` returns the room ONLY after the role check, which is why the gate and the
      tenant scope are one call. Handed out separately they can be applied separately, and applying
      only the first is a presenter of one room reaching another.
    */
    expect(AUTH).toContain('return requireRoomShortCode(locals);');
    expect(remoteCode).not.toContain('roomShortCode:');
  });

  it('rejects an empty screen id rather than broadcasting one', () => {
    /*
      The reference's `e &&`. An empty broadcast would ask every client in the room to focus a screen
      that does not exist. `.trim()` before `.min(1)` so whitespace is not an id.
    */
    expect(focusCommand()).toContain('z.string().trim().min(1)');
  });

  it('does NOT loosen presenterCommand, which validates a person not a screen', () => {
    /*
      The temptation was to add `focusOnScreen` to that command's allow-list. Its payload check
      requires an integer target, so carrying a screen id would have meant weakening a validation
      that currently rejects anything without one. Two shapes, two schemas — which is exactly why
      putting them in ONE module was safe: they share a gate, not a payload.

      This is the assertion that would have gone quietly green if it had been left reading
      `+page.server.ts` after the extraction, so it reads the module that owns them now.

      ## The enum is read, not pinned — corrected 2026-08-26

      This asserted the literal `z.enum(['mutemic', 'mutecam', 'mutescreens'])` and went red when
      `restartScreen` was added, which is a FALSE ALARM: a fourth peer sub-command is not a
      loosening, and it is the capture's own — the reference's switch has six cases. Pinning the
      list made every legitimate addition look like the defect this test guards against, and a gate
      that cries wolf gets its expectation edited without thought, which is how the real thing would
      one day slip past.

      So the enum's MEMBERS are now parsed out and each one checked against the property that
      actually matters: it names an act on a PERSON's own browser, never a screen. `focusOnScreen`
      carries a string id and would fail this; `restartScreen` acts on whatever that peer is already
      sharing and carries nothing, which is why it is admissible and a screen id is not.
    */
    const body = presenterCommandBody();
    const enumMatch = /subCmd: z\.enum\(\[([^\]]*)\]\)/.exec(body);
    expect(enumMatch, 'presenterCommand no longer declares subCmd as a z.enum allow-list').not.toBe(
      null
    );
    const members = (enumMatch?.[1] ?? '').split(',').map((raw) => raw.trim().replace(/'/g, ''));
    expect(members.length, 'the enum parsed to nothing — the regex, not the code').toBeGreaterThan(
      2
    );
    /*
      The capture's own six, read whole at byte 1119400 of `main.d1d09071be31f1ba.js`. A member
      outside this set is either a typo the server would forward and no client would dispatch, or a
      payload of a different shape being smuggled through a command that validates a person.
    */
    const CAPTURED_SUBCMDS = [
      'mutemic',
      'mutecam',
      'mutescreens',
      'restartScreen',
      'startRec',
      'stopRec'
    ];
    for (const member of members) {
      expect(CAPTURED_SUBCMDS, `'${member}' is not one of the capture's subCmds`).toContain(member);
    }
    expect(body).toContain('targetUserId: z.number().int().positive()');
    expect(body).not.toContain('focusOnScreen');
    expect(body).not.toContain('screenId');
  });

  it('has left `+page.server.ts` entirely, so there is one way in and not two', () => {
    expect(serverCode).not.toContain('focusOnScreen: async (');
    expect(serverCode).not.toContain('presenterCommand: async (');
  });
});

describe('the client', () => {
  it('broadcasts from the menu item, after moving locally', () => {
    /*
      Comment-STRIPPED, because the note above this method quotes the claim it disproves - the
      broadcast "needs the media signalling channel, which is not wired yet". An assertion that a
      comment cannot mention is an assertion that forbids recording why the code changed.
    */
    const actionsCode = screensModule
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    const from = actionsCode.indexOf('bringEveryoneTo(screenId: string) {');
    const body = actionsCode.slice(from, actionsCode.indexOf('\n  }', from));
    expect(body).toContain('void this.#focusOnScreen(screenId).catch(');
    /*
      The catch is not a swallowed one. Upstream shows the presenter nothing when a broadcast fails
      and inventing a toast would change what the room does — but a dropped rejection is the
      swallowed catch this repository forbids, and this can only reject on a real fault (a network
      failure, or a 403 meaning client and server disagree about who is a presenter). `console.error`
      is loud where it costs the room nothing, and honest that the user has not been told.
    */
    expect(body).toContain("console.error('[focusOnScreen]', cause)");
    // Local first, so the presenter's own view does not wait on a round trip.
    expect(body.indexOf('selectedScreenTab = screenId;')).toBeLessThan(
      body.indexOf('focusOnScreen(screenId)')
    );
    // The stale claim that this needed the media channel must not come back.
    expect(body).not.toContain('not wired yet');
  });

  it('receives it and honours a member’s lock', () => {
    /*
      `selectScreenTabOfId` honours `lockedScreenId`; assigning `selectedScreenTab` directly would
      drag a member off a screen they deliberately locked.
    */
    // The dispatch moved to `RoomEventStream` in slice 5; the viewer it calls stayed put.
    expect(eventsCode).toContain("if (command?.cmd === 'focusOnScreen') {");
    expect(eventsCode).toContain(
      "if (typeof command.screenId === 'string')\n            this.#mediaTransport.selectScreenTabOfId(command.screenId);"
    );
  });

  it('only the USER-initiated tab click broadcasts — the loop guard', () => {
    expect(screensModule).toContain('selectTab(screenId: string) {');
    expect(screensModule).toContain(
      'if (this.#isPresenter() && this.#followMyScreens()) this.bringEveryoneTo(screenId);'
    );
    /*
      The tab strip moved to `PresentationArea.svelte`; the handler behind it did not.

      READ FROM THE AST SINCE 2026-08-18, and the re-point is why. This was two substring checks
      spanning two files — `onselect={selectScreenTabByUser}` in the pane and
      `selectScreenTabByUser={(id) => screens.selectTab(id)}` on the page — because the wiring
      travelled through a drilled prop. The facade slice deleted that prop, so both strings went,
      and re-typing them as one new string would rebuild the same weakness: a `toContain` cannot
      tell an attribute on `<ScreenTabs>` from the same characters in a comment, in a sibling
      component, or in dead markup.

      So the ATTRIBUTE is located instead. Find the `ScreenTabs` node, take its `onselect`, and
      read the expression's own source. It cannot pass on a missing node, because the node is
      asserted found first — which is the lesson the block below this one records paying for.
    */
    const paneSource = readFileSync(
      new URL('./components/PresentationArea.svelte', import.meta.url),
      'utf8'
    );
    const onselect = componentAttribute(paneSource, 'ScreenTabs', 'onselect');
    expect(onselect, '<ScreenTabs onselect> must exist in PresentationArea').not.toBeNull();
    // WRAPPED since slice 11: `selectTab` is a method, and a bare reference would lose `this`.
    expect(onselect).toBe('(id) => screens.selectTab(id)');
    /*
      And the strip must not reach the SILENT path. `selectScreenTabOfId` is what receives this very
      command; wiring the user's click to it would make a presenter's tab click move nobody.
    */
    expect(onselect).not.toContain('selectScreenTabOfId');

    /*
      The programmatic path must NOT broadcast, or receiving a focus command would send one back.

      RE-POINTED 2026-08-17, AND IT HAD BEEN ASSERTING ON THE EMPTY STRING. This read
      `pageCode.indexOf('function selectScreenTabOfId(')`; that function became a method on
      `RoomMediaTransport` during the decomposition, so `indexOf` returned -1, `pageCode.slice(-1)`
      was one character, and both `not.toContain`s below passed against `''`. The irony is exact —
      this is the file whose subject is a control that said "Bring everyone here" and brought
      nobody, and its own guard had stopped saying anything.

      The index is asserted found FIRST. A negative assertion cannot announce that its subject has
      left; only a positive one can, which is why this pattern is the fix rather than the
      re-pointing on its own.
    */
    const from = transportCode.indexOf('selectScreenTabOfId(producerId: string) {');
    expect(from, 'RoomMediaTransport.selectScreenTabOfId must exist').toBeGreaterThan(-1);
    const body = transportCode.slice(from, transportCode.indexOf('\n  }', from));
    expect(body.length, 'the method body must not be empty').toBeGreaterThan(0);
    expect(body).not.toContain('bringEveryoneToScreen');
    expect(body).not.toContain('focusOnScreen');
  });
});
