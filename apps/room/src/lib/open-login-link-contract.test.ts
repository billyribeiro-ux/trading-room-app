import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  OPEN_LOGIN_LINK_FEATURES,
  OPEN_LOGIN_LINK_FEATURES_WITH_NOOPENER,
  openLoginLink,
  openLoginLinkTarget
} from './room/open-login-link.js';
import { codeOf } from './source-comments.js';

/**
 * `openLoginLink` — the operator's own page, opened once as a member enters.
 *
 * ## How this one was found, which is the reusable part
 *
 * `gate/audit-setting-coverage.mjs` enumerates the settings the REFERENCE reads in its own browser
 * and this room does not. On 2026-09-03 that list was nineteen, and every one of them was put
 * against the bundle:
 *
 *   seven      the credentials that stay on the controller by design — `deleteAlertPW`,
 *              `allRoomsWelcomeMatPW`, `obsStreamKey`, `banIPList`, `modAdminLoginList`,
 *              `twillioApiSID`, `needPasswordForUserNotes`. Wiring one would be a regression
 *   four       blocked on a host or a service that does not exist here (`recsInRoom`, `recordChat`,
 *              `backupClusterID`, `enableDiscord`)
 *   three      answered by another mechanism (the three credential prompts, which travel as a
 *              QUESTION rather than as a value)
 *   one        `isNewIndicatorOn`, blocked on an owner answer: `isNew` is server-produced in all
 *              fourteen of its bundle occurrences, so no capture holds the rule
 *   three      UNREACHABLE UPSTREAM, and this is the class worth naming:
 *                `advancedSearchAlerts` is gated on `ownerdID == "56ba547185ae93560d186ea8"` — a
 *                  hardcoded account id, so the branch is dead for every room but the vendor's own
 *                `h264Enabled` is read as `this.forceH264 = sessData.h264Enabled || !0`, so the
 *                  setting cannot change the value it feeds. Wiring it would give it an effect the
 *                  reference does not have
 *                `playChatMessageSoundFor` is a declared refusal — hashing happens server-side
 *                  upstream, and shipping raw member emails to every browser to decide a sound is
 *                  the wrong trade
 *   ONE        work. This one.
 *
 * ## The capture
 *
 * Bytes 1,437,913 and 2,384,175, in the room component's post-login setup, in the same statement
 * that applies `chatDisabledForTrials`:
 *
 * ```js
 * sessData.openLoginLink && window.open(sessData.openLoginLink, "_blank",
 *                                       "resizable=yes,top=0,left=0,width=800,height=400")
 * ```
 */

const BUNDLE = readFileSync(
  new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url),
  'utf8'
);
const MODULE = readFileSync(new URL('./room/open-login-link.ts', import.meta.url), 'utf8');
const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');

describe('what counts as a link to open', () => {
  it('a URL opens; nothing else does', () => {
    expect(openLoginLinkTarget('https://operator.example/welcome')).toBe(
      'https://operator.example/welcome'
    );
    expect(openLoginLinkTarget('')).toBeNull();
    expect(openLoginLinkTarget(undefined)).toBeNull();
    expect(openLoginLinkTarget(null)).toBeNull();
  });

  it('and WHITESPACE does not, which upstream gets wrong', () => {
    /*
      The one place this diverges on the RULE rather than on a feature string. Upstream's guard is
      bare truthiness, so a textarea holding a single newline is truthy and `window.open('\\n')`
      opens `about:blank` — a blank window in front of every member of that room, because somebody
      pressed Enter in a settings field.

      Reproducing that would be reproducing a defect with no upside: there is no room whose operator
      MEANT to publish a blank window.
    */
    expect(openLoginLinkTarget('   ')).toBeNull();
    expect(openLoginLinkTarget('\n')).toBeNull();
    expect(openLoginLinkTarget('\t\n ')).toBeNull();
  });

  it('but the URL itself is passed through untouched', () => {
    /*
      Trimmed at the ends and otherwise not the module's business. An operator's URL may carry a
      query, a fragment, a port, or a path this room has never seen, and a module that "cleaned" any
      of that would be a module deciding where somebody else's members go.
    */
    const messy = 'https://operator.example/a b?x=1&y=2#frag';
    expect(openLoginLinkTarget(`  ${messy}  `)).toBe(messy);
  });

  it('and a non-string is refused rather than coerced', () => {
    // The value arrives from a controller payload. `String(42)` would open `/42`.
    expect(openLoginLinkTarget(42)).toBeNull();
    expect(openLoginLinkTarget({ href: 'https://x.example' })).toBeNull();
    expect(openLoginLinkTarget(true)).toBeNull();
  });
});

describe('the open itself', () => {
  const capture = () => {
    const calls: Array<{ url: string; target: string; features: string }> = [];
    return {
      calls,
      deps: {
        open: (url: string, target: string, features: string) =>
          void calls.push({ url, target, features })
      }
    };
  };

  it('opens once, in a new window, with the capture s features plus noopener', () => {
    /*
      The expected features are written out as a LITERAL rather than as the module's own constant.
      Comparing the export to what the export produced would pass for any value; the literal is the
      only form of this assertion that can fail. The exported name is checked against it on the next
      line, so the two cannot drift apart either.
    */
    expect(OPEN_LOGIN_LINK_FEATURES_WITH_NOOPENER).toBe(
      'resizable=yes,top=0,left=0,width=800,height=400,noopener'
    );

    const { calls, deps } = capture();
    expect(openLoginLink('https://operator.example/welcome', deps)).toBe(true);
    expect(calls).toEqual([
      {
        url: 'https://operator.example/welcome',
        target: '_blank',
        features: 'resizable=yes,top=0,left=0,width=800,height=400,noopener'
      }
    ]);
  });

  it('and opens NOTHING when the setting is absent, empty or blank', () => {
    for (const value of [undefined, null, '', '   ', '\n', 7]) {
      const { calls, deps } = capture();
      expect(openLoginLink(value, deps), String(value)).toBe(false);
      expect(calls).toEqual([]);
    }
  });
});

describe('against the pinned bundle', () => {
  it('the feature string is the capture s, character for character', () => {
    expect(BUNDLE).toContain(OPEN_LOGIN_LINK_FEATURES);
  });

  it('and it is reached through a truthiness guard on the setting itself', () => {
    /*
      The guard is the whole gate — there is no separate enable flag in the capture, which is why
      the value is a string and an empty one is how an operator turns this off. Asserted against the
      bundle so that claim rests on the capture rather than on a reading of it.
    */
    const at = BUNDLE.indexOf(OPEN_LOGIN_LINK_FEATURES);
    expect(at, 'the feature string must be findable').toBeGreaterThan(-1);
    expect(BUNDLE.slice(at - 220, at)).toContain(
      'sessData.openLoginLink&&window.open(this.appService.globals.sessData.openLoginLink,"_blank"'
    );
  });

  it('and NOTHING in the reference passes noopener here, which is why ours is a divergence', () => {
    /*
      The negative half of divergence 1, taken from the capture rather than assumed. If upstream had
      passed it, the module's paragraph arguing the addition would be describing a match.
    */
    const at = BUNDLE.indexOf(OPEN_LOGIN_LINK_FEATURES);
    expect(BUNDLE.slice(at, at + OPEN_LOGIN_LINK_FEATURES.length + 40)).not.toContain('noopener');
  });
});

describe('the divergence is declared where the code is', () => {
  it('the module records noopener as an ADDITION and names this room s precedent', () => {
    /*
      Read raw, because here the CLAIM is the prose. The two named precedents matter more than the
      word: `alerts-pane.ts` and `RoomSidebar.svelte` already make this exact call with `noopener`,
      so this is the room's own convention applied rather than a decision invented at one call site.
    */
    expect(MODULE).toContain('`noopener` is added');
    expect(MODULE).toContain('alerts-pane.ts');
    expect(MODULE).toContain('RoomSidebar.svelte');
  });

  it('and the module reaches window only through its caller', () => {
    /*
      Comment-stripped: the header quotes `window.open` from the capture. The rule stays pure so it
      is testable without a browser — the same split as `room-defaults.ts` and `live-access.ts` —
      and a `window` reaching into this module would be that split quietly ending.
    */
    expect(codeOf('open-login-link.ts', MODULE)).not.toContain('window.');
  });

  it('and the page calls it from onMount with the setting the SERVER delivered', () => {
    const page = codeOf('+page.svelte', PAGE);
    expect(page).toContain('openLoginLink(data.sessData?.openLoginLink, {');
  });
});
