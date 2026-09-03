import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The three assertions about the reference's own chat popup, split out on 2026-09-03.
 *
 * ## What they were costing
 *
 * `chat-popup-contract.test.ts` holds eleven cases. Eight are the `ours` block, and the first of
 * them — `the SSE payload still carries no message text` — is a statement about what leaves the
 * server: the notification is composed in the browser from data the server already filtered for that
 * member, rather than by shipping message bodies to everyone so a popup can be drawn.
 *
 * Those eight read `+page.svelte`, the overlay layer, the SSE route and the shared mention rule, all
 * committed. These three read `docs/source/main.d6d3c112b59b7d0d.js` at MODULE SCOPE, and because
 * `gate/evidence-bound-tests.mjs` excludes by FILE they took all eleven out of every checkout without
 * the dumps.
 *
 * ## What is here
 *
 * The reference's own three: that the popup is gated on `doNotDisturbOn` AND `chatPopup` beside the
 * sound, its exact title, and that permission is asked when the PREFERENCE is enabled rather than
 * when a notification first fires.
 */

const BUNDLE = readFileSync(
  new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  'utf8'
);

describe('the reference', () => {
  it('gates the popup on doNotDisturbOn AND chatPopup, beside the sound', () => {
    const flat = BUNDLE.replace(/\s+/g, '');
    expect(flat).toContain(
      'preferences.doNotDisturbOn||(this.appService.globals.preferences.chatSoundOn'
    );
    expect(flat).toContain('preferences.chatPopup&&(this.alertService.info');
  });

  it('titles it "Mention from @"', () => {
    expect(BUNDLE).toContain('Mention from @');
  });

  it('asks permission when the preference is ENABLED, not only when one fires', () => {
    // `chatPopupChange()` ends with `chatPopup && window.Notification && requestPermission()`.
    expect(BUNDLE.replace(/\s+/g, '')).toContain(
      'preferences.chatPopup&&window.Notification&&Notification.requestPermission()'
    );
  });
});
