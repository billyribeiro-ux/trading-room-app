import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The one assertion in the alerts-background family that needs a CAPTURE, split out on 2026-09-03.
 *
 * ## What it was costing
 *
 * `alerts-background-contract.test.ts` holds nine cases about a real, user-visible defect: an alert
 * card and a chat message shared a background because ONE function was returning the follow-a-user
 * default for both roles. Eight of the nine read `app.css`, `styles/tokens.css`,
 * `css/complete-app-styles.css` and `#lib/chat-style.ts` — all committed. One reads
 * `docs/source/main.d6d3c112b59b7d0d.js`, which is gitignored, and because
 * `gate/evidence-bound-tests.mjs` excludes by FILE that one read took all nine out of every checkout
 * without the dumps.
 *
 * Excluded with them: `proves the two are not the same colour`, which is the assertion the file was
 * written for.
 *
 * ## What is here
 *
 * The two DEFAULTS as the reference itself declares them — the room's own `chatStyle` at `#e8e8e8`
 * and the follow-a-user default at `#ffffff`. They are the evidence that these are two objects and
 * not one, which is the whole shape of the defect: `alertStyle` carrying the same `#e8e8e8` is why
 * an alert and a chat message shared a background in the capture.
 */

const main = readFileSync(
  new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  'utf8'
);

describe('chat message background, against the capture', () => {
  it('reads both captured defaults, so neither can be quietly dropped', () => {
    expect(main).toContain(
      'chatStyle={lightTheme:{color:"#1a1a1a",tickerColor:"#1a1a1a",usernameColor:"#365d7d",bgColor:"#e8e8e8",fontSize:"13"}'
    );
    expect(main).toContain('bgColor:"#ffffff",fontSize:14,playSound:!0');
  });
});
