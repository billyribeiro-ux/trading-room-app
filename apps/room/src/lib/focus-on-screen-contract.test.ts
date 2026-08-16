import { readFileSync } from 'node:fs';
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
const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
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
  The gate itself moved a SECOND time, to `$lib/server/auth.ts`, when `for-all-broadcast.remote.ts`
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

const serverCode = stripComments(SERVER);
const pageCode = stripComments(PAGE);
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
    */
    const body = presenterCommandBody();
    expect(body).toContain("z.enum(['mutemic', 'mutecam', 'mutescreens'])");
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
    const from = pageCode.indexOf('function bringEveryoneToScreen(');
    const body = pageCode.slice(from, pageCode.indexOf('\n  }', from));
    expect(body).toContain('void focusOnScreen(screenId).catch(');
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
    expect(pageCode).toContain("if (command?.cmd === 'focusOnScreen') {");
    expect(pageCode).toContain(
      "if (typeof command.screenId === 'string') selectScreenTabOfId(command.screenId);"
    );
  });

  it('only the USER-initiated tab click broadcasts — the loop guard', () => {
    expect(pageCode).toContain('function selectScreenTabByUser(screenId: string) {');
    expect(pageCode).toContain(
      'if (isPresenter && prefs.makeUsersFollowMyScreens) bringEveryoneToScreen(screenId);'
    );
    // The tab strip moved to `PresentationArea.svelte`; the handler behind it did not.
    const paneCode = readFileSync(
      new URL('./components/PresentationArea.svelte', import.meta.url),
      'utf8'
    );
    expect(paneCode).toContain('onselect={selectScreenTabByUser}');
    expect(pageCode).toContain('{selectScreenTabByUser}');

    // The programmatic path must NOT broadcast, or receiving a focus command would send one back.
    const from = pageCode.indexOf('function selectScreenTabOfId(');
    const body = pageCode.slice(from, pageCode.indexOf('\n  }', from));
    expect(body).not.toContain('bringEveryoneToScreen');
    expect(body).not.toContain('focusOnScreen');
  });
});
