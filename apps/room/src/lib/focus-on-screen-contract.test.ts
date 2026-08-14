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

const stripComments = (source: string) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const serverCode = stripComments(SERVER);
const pageCode = stripComments(PAGE);

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
    const from = serverCode.indexOf('focusOnScreen: async (');
    expect(from, 'the action must exist').toBeGreaterThan(-1);
    const body = serverCode.slice(from, serverCode.indexOf('\n  },', from));

    expect(body).toContain("requireUser(locals).role === 'staff'");
    expect(body).toContain("requireUser(locals).role === 'admin'");
    expect(body).toContain('if (!isPresenter) return fail(403);');
  });

  it('scopes the broadcast to the caller’s own room', () => {
    const from = serverCode.indexOf('focusOnScreen: async (');
    const body = serverCode.slice(from, serverCode.indexOf('\n  },', from));
    // Not a room id taken from the request — the session's, so room A cannot move room B.
    expect(body).toContain('publishToRoom(requireRoomShortCode(locals)');
    expect(body).not.toMatch(/publishToRoom\(\s*(String\()?data\.get/);
  });

  it('rejects an empty screen id rather than broadcasting one', () => {
    const from = serverCode.indexOf('focusOnScreen: async (');
    const body = serverCode.slice(from, serverCode.indexOf('\n  },', from));
    expect(body).toContain('if (!screenId) return fail(400');
  });

  it('does NOT loosen presenterCommand, which validates a person not a screen', () => {
    /*
      The temptation was to add `focusOnScreen` to that action's allow-list. Its payload check is
      `Number.isInteger(targetUserId)`, so carrying a screen id would have meant weakening a
      validation that currently rejects anything without an integer target. Two shapes, two actions.
    */
    const from = serverCode.indexOf('presenterCommand: async (');
    const body = serverCode.slice(from, serverCode.indexOf('\n  },', from));
    expect(body).toContain("new Set(['mutemic', 'mutecam', 'mutescreens'])");
    expect(body).toContain('if (!Number.isInteger(targetUserId))');
    expect(body).not.toContain('focusOnScreen');
  });
});

describe('the client', () => {
  it('broadcasts from the menu item, after moving locally', () => {
    const from = pageCode.indexOf('function bringEveryoneToScreen(');
    const body = pageCode.slice(from, pageCode.indexOf('\n  }', from));
    expect(body).toContain("void fetch('?/focusOnScreen', { method: 'POST', body });");
    // Local first, so the presenter's own view does not wait on a round trip.
    expect(body.indexOf('selectedScreenTab = screenId;')).toBeLessThan(
      body.indexOf("fetch('?/focusOnScreen'")
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
      'if (isPresenter && makeUsersFollowMyScreens) bringEveryoneToScreen(screenId);'
    );
    expect(pageCode).toContain('onselect={selectScreenTabByUser}');

    // The programmatic path must NOT broadcast, or receiving a focus command would send one back.
    const from = pageCode.indexOf('function selectScreenTabOfId(');
    const body = pageCode.slice(from, pageCode.indexOf('\n  }', from));
    expect(body).not.toContain('bringEveryoneToScreen');
    expect(body).not.toContain('focusOnScreen');
  });
});
