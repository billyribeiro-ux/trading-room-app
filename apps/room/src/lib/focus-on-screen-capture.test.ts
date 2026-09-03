import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The three assertions about the reference's own `focusOnScreen`, split out on 2026-09-03.
 *
 * ## What they were costing
 *
 * `focus-on-screen-contract.test.ts` holds eleven cases and eight of them are about authority on a
 * multi-tenant application: the command refuses a non-presenter, it is scoped to the caller's own
 * room, it rejects an empty screen id rather than broadcasting one, and `presenterCommand` was NOT
 * loosened to admit it — *"which validates a person, not a screen"*. Those eight read
 * `presenter-commands.remote.ts`, `+page.server.ts`, `events.svelte.ts` and the components, all
 * committed.
 *
 * These three read `docs/source/main.d6d3c112b59b7d0d.js` at MODULE SCOPE. `docs/source` is
 * gitignored and `gate/evidence-bound-tests.mjs` excludes by FILE, so they took all eleven out of
 * every checkout without the dumps.
 *
 * ## What is here
 *
 * The three facts the free file is a transcription of: that upstream sends this as a SERVER admin
 * command rather than over the media channel (which is why ours is a remote command the server
 * authorises, not a peer message), that the presenter's own tab change is what triggers it and only
 * while the preference is on, and that the preference ships OFF.
 */

const BUNDLE = readFileSync(
  new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  'utf8'
);

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
