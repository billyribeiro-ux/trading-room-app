import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

import {
  IFRAME_BREAKOUT_PARAM,
  IFRAME_BREAKOUT_PROMPT,
  decideIframeBreakout,
  iframeBreakoutTarget,
  offerIframeBreakout
} from './room/iframe-breakout.js';
import { codeOf } from './source-comments.js';

/**
 * R-12's last genuinely absent row: the presenter-in-an-iframe break-out.
 *
 * ## What was re-measured on 2026-09-03, and what it found
 *
 * `docs/reference/room-component-gap-register.md`'s R-12 lists thirteen `app-root` subscriptions and
 * three init behaviours as "all absent from `apps/room/src`". Re-measured against the tree:
 * **eleven of the thirteen are built**, `usersDoMsgDelete`'s string is at `message-delete.ts:173`,
 * `deleteAlertPW` reaches eleven files, and the favicon/customCSS/title trio all ship. What survived
 * the sweep was this one control.
 *
 * ## What is asserted here, and what deliberately is not
 *
 * Not that a browser navigates — that is one assignment and a browser is the only thing that can
 * run it. The RULE, which is where every version of this can go wrong:
 *
 *   deny-by-default twice   a non-presenter is never offered it, and a cross-origin parent — the
 *                           case where reading `window.parent.location` THROWS — is not read as
 *                           "framed"
 *   the server decides      `isPresenter` comes from the membership row the server read. Upstream
 *                           decodes the URL token in the browser and trusts its `perms` claim, and
 *                           that is the 2026-08-07 privilege escalation by name
 *   the URL stays a URL     upstream concatenates `"&kt=1"` onto `window.location`, which is
 *                           correct only because it is reached with a token in the query. This room
 *                           strips the token on entry, so the same concatenation would produce a
 *                           parameter glued to the path
 *
 * ## Read comment-stripped where absence is the claim
 *
 * The module's own header quotes `decodeToken(a).perms` in order to explain why that half is not
 * transcribed. A raw-source assertion that no token is decoded would match the sentence saying none
 * is — the trap this repository hit four times on 2026-09-02.
 */

/**
 * The pinned bundle, read here rather than in a file of its own.
 *
 * A separate capture-bound file was written first and then deleted, because its stated reason was
 * wrong and worth recording: it claimed that reading the bundle made it evidence-bound and excluded
 * on CI. It does not. `docs/source-v4-2026-08-15/` is COMMITTED — five files, `git ls-files` — and
 * the gitignored root `evidence-bound-tests.mjs` matches is `docs/source`, a different path and a
 * different thing. `evidence-partition.test.ts` stayed at 42 through the whole exercise, which is
 * the measurement that settled it.
 */
const BUNDLE = readFileSync(
  new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url),
  'utf8'
);
const MODULE = readFileSync(new URL('./room/iframe-breakout.ts', import.meta.url), 'utf8');
const MODULE_CODE = codeOf('iframe-breakout.ts', MODULE);
const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');

describe('who is offered the break-out', () => {
  it('a presenter in a frame, and nobody else', () => {
    expect(decideIframeBreakout({ isPresenter: true, framed: true })).toBe(true);
    expect(decideIframeBreakout({ isPresenter: false, framed: true })).toBe(false);
    expect(decideIframeBreakout({ isPresenter: true, framed: false })).toBe(false);
    expect(decideIframeBreakout({ isPresenter: false, framed: false })).toBe(false);
  });

  it('and a parent it cannot READ is not a parent it may assume', () => {
    /*
      `framed: null` is the cross-origin `SecurityError`. `null` is falsy, so a rule written as
      `isPresenter && framed` would pass this line by accident; `framed === true` is what makes the
      third state a decision. Asserted for a presenter, because that is the only case where the
      other term could carry it.
    */
    expect(decideIframeBreakout({ isPresenter: true, framed: null })).toBe(false);
    expect(decideIframeBreakout({ isPresenter: false, framed: null })).toBe(false);
  });
});

describe('where the top frame is sent', () => {
  it('carries kt=1 onto a URL that already has a query', () => {
    expect(iframeBreakoutTarget('https://room.example/r/abc?tab=chat')).toBe(
      'https://room.example/r/abc?tab=chat&kt=1'
    );
  });

  it('and onto one that has NONE, which is what upstream cannot do', () => {
    /*
      THE DIVERGENCE, asserted rather than described. `window.location + "&kt=1"` on this address
      yields `https://room.example/r/abc&kt=1` — a parameter glued to the path, which is a different
      path and not a query at all. Upstream never produces it because it is only reached with a
      token in the URL; this room strips the token on entry, so this is the case that would have
      shipped broken.
    */
    expect(iframeBreakoutTarget('https://room.example/r/abc')).toBe(
      'https://room.example/r/abc?kt=1'
    );
    expect(iframeBreakoutTarget('https://room.example/r/abc')).not.toContain('abc&kt');
  });

  it('replaces rather than appends a second copy', () => {
    // A presenter who accepts twice must not accumulate `?kt=1&kt=1`.
    expect(iframeBreakoutTarget('https://room.example/r/abc?kt=1')).toBe(
      'https://room.example/r/abc?kt=1'
    );
  });
});

describe('the act', () => {
  const withWindow = (href: string, framed: boolean | 'throws', run: () => void) => {
    const location = { href } as Location;
    const parent =
      framed === 'throws'
        ? {
            get location(): Location {
              throw new DOMException('Blocked a frame', 'SecurityError');
            }
          }
        : { location: framed ? ({ href: 'https://embedder.example/' } as Location) : location };
    vi.stubGlobal('window', { location, parent });
    try {
      run();
    } finally {
      vi.unstubAllGlobals();
    }
  };

  it('raises the capture s sentence and navigates the PARENT on OK', () => {
    let asked: string | null = null;
    let accept: (() => void) | null = null;
    let navigated: string | null = null;

    withWindow('https://room.example/r/abc?tab=chat', true, () => {
      offerIframeBreakout(true, {
        confirm: (message, onconfirm) => {
          asked = message;
          accept = onconfirm;
        },
        navigateTop: (target) => {
          navigated = target;
        }
      });
    });

    expect(asked).toBe(IFRAME_BREAKOUT_PROMPT);
    // Nothing has moved yet: it is an OFFER, and a Cancel must leave the member where they were.
    expect(navigated).toBeNull();
    accept!();
    expect(navigated).toBe('https://room.example/r/abc?tab=chat&kt=1');
  });

  it('asks nothing at top level', () => {
    let asked = 0;
    withWindow('https://room.example/r/abc', false, () => {
      offerIframeBreakout(true, { confirm: () => (asked += 1), navigateTop: () => {} });
    });
    expect(asked).toBe(0);
  });

  it('asks nothing of a member, framed or not', () => {
    let asked = 0;
    for (const framed of [true, false] as const) {
      withWindow('https://room.example/r/abc', framed, () => {
        offerIframeBreakout(false, { confirm: () => (asked += 1), navigateTop: () => {} });
      });
    }
    expect(asked).toBe(0);
  });

  it('and stays SILENT rather than throwing when the parent is cross-origin', () => {
    /*
      The `try`/`catch` is transcribed including what it swallows: reading `window.parent.location`
      across origins throws, upstream's empty `catch` turns that into silence, and so does this. The
      half that matters here is that it does not become an unhandled error on the room's mount path.
    */
    let asked = 0;
    expect(() =>
      withWindow('https://room.example/r/abc', 'throws', () => {
        offerIframeBreakout(true, { confirm: () => (asked += 1), navigateTop: () => {} });
      })
    ).not.toThrow();
    expect(asked).toBe(0);
  });
});

describe('the authority is the server s', () => {
  it('the module decodes no token and reads no claim', () => {
    /*
      Comment-stripped, because the header quotes `decodeToken(a).perms` to explain why it is absent.
      The positive half is the signature: `offerIframeBreakout` takes a boolean the server computed,
      so there is nothing here that COULD read a claim.
    */
    expect(MODULE_CODE).not.toContain('decodeToken');
    expect(MODULE_CODE).not.toContain('perms');
    expect(MODULE_CODE).toContain('export function offerIframeBreakout(isPresenter: boolean');
  });

  it('and the page hands it the value it got from the load, not one it made up', () => {
    expect(codeOf('+page.svelte', PAGE)).toContain('offerIframeBreakout(isPresenter, {');
  });
});

describe('against the pinned bundle', () => {
  it('raises the sentence the reference raises, byte for byte', () => {
    expect(BUNDLE).toContain(IFRAME_BREAKOUT_PROMPT);
  });

  it('and the reference reaches it from a CONFIRM, not an alert', () => {
    /*
      The shape matters as much as the words: `bootbox.confirm` gives the presenter a Cancel, and an
      alert would not. This room uses `dialogs.confirm` for exactly that reason — `dialogs.alertThen`
      renders one OK button and would take away a refusal the reference does give.
    */
    const at = BUNDLE.indexOf(IFRAME_BREAKOUT_PROMPT);
    expect(at, 'the prompt must be findable').toBeGreaterThan(-1);
    expect(BUNDLE.slice(at - 40, at)).toContain('bootbox.confirm(');
  });

  it('appends kt=1, and NOTHING in the reference ever reads it', () => {
    /*
      The measurement the second divergence rests on, asserted rather than remembered. One
      occurrence, and it is the WRITE — so a reader arriving later cannot conclude that
      `URL.searchParams` dropped a value something upstream depended on.

      Counted as `&kt=1` because the bare two letters appear inside minified identifiers; the
      assertion is about the PARAMETER, and this is the only form the parameter takes.
    */
    expect(BUNDLE.split(`&${IFRAME_BREAKOUT_PARAM}=1`)).toHaveLength(2);

    const at = BUNDLE.indexOf(`&${IFRAME_BREAKOUT_PARAM}=1`);
    expect(at, 'the parameter must be findable').toBeGreaterThan(-1);
    expect(BUNDLE.slice(at - 60, at)).toContain('window.parent.location=window.location+');
  });

  it('and guards the parent read with a catch that SWALLOWS', () => {
    /*
      Transcribed including what it swallows — the module's divergence 3 argues at length why
      `window.self !== window.top` is not used instead. This pins that the `catch` is really there,
      so that argument rests on the capture rather than on a recollection of it.
    */
    const at = BUNDLE.indexOf(IFRAME_BREAKOUT_PROMPT);
    expect(at, 'the prompt must be findable').toBeGreaterThan(-1);
    const around = BUNDLE.slice(at - 260, at + 260);
    expect(around).toContain('window.location!==window.parent.location');
    expect(around).toContain('catch{}');
  });
});
