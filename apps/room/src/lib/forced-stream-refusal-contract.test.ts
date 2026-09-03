import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments.js';

/**
 * `?forcedStream=` — the parameter this room GENERATED and refuses to READ, and the trap that is
 * now impossible rather than documented.
 *
 * ## What upstream does, and why it is not copied
 *
 * `app-root.full.js` reads `?forcedStream=` into `globals.forcedStreamServer`, and `setMyRepeater`
 * (bundle byte 1,026,712) prefers it over whatever the server assigns:
 * `globals.streamServer = globals.forcedStreamServer || e`. The user-info modal offers a `(test it)`
 * link that builds such a URL (`dTe`, byte 2,063,494).
 *
 * **A media host taken from a query parameter is an authority the client asserts.** A link reading
 * `?forcedStream=evil.example`, sent to a member, points their browser's PUBLISH at somebody else's
 * SFU — camera and microphone, in a multi-tenant fintech room. `CLAUDE.md` names the class by
 * itself, and the 2026-08-07 privilege escalation is what naming it cost.
 *
 * ## Why this file exists rather than a comment
 *
 * Until 2026-09-03 the anchor was transcribed and a forty-four-line note beside it explained that it
 * *"becomes a defect the moment a media host lands"*. That note was right, and a note was the wrong
 * instrument: it was honest only because `targetUser.streamServer` has no producer, so the `{#if}`
 * never opened. Whoever lands `STREAM_SERVER_MTX` will be editing `server/user-detail.ts` and the
 * MTX wiring — they have no reason to open `ModalHost.svelte`, and supplying the value from over
 * there arms the trap without anyone reading the paragraph that warns about it.
 *
 * So the anchor is gone, the value still renders, and the property is asserted HERE where a run of
 * the suite finds it rather than a reader who happened to look.
 *
 * ## Read comment-stripped, in both directions
 *
 * The markup's own note quotes `?forcedStream=` and the upstream reads in order to explain the
 * refusal, and this file quotes them again. Every assertion below is against comment-stripped
 * source, or it would be satisfied by the paragraph describing what must not exist.
 */

const LIB = new URL('.', import.meta.url).pathname;
/*
  Named relative to `src/`, not to `src/lib/`.

  The first draft sliced `ROOT.length` off every path, which is correct for `lib/**` and cuts three
  characters INTO the routes paths — a negative control reported its offender as `es/+page.svelte`.
  A security sweep whose failure message misnames the file is a sweep somebody argues with instead
  of fixing, so the prefix is the one both halves actually share.
*/
const SRC = LIB.replace(/lib\/$/, '');

/** Every shipped module and component. Tests are excluded: this file is one. */
const SOURCES = globSync(`${LIB}/**/*.{ts,svelte}`)
  .filter((path) => !path.includes('.test.') && !path.endsWith('.d.ts'))
  .concat(globSync(`${LIB}/../routes/**/*.{ts,svelte}`).filter((path) => !path.includes('.test.')));

describe('the parameter is never read', () => {
  /*
    The PARAMETER, and not every identifier that starts with those twelve characters.

    The first draft of this sweep matched the bare string and flagged `StreamTabs.svelte`, which was
    the test being wrong rather than the code: its `forcedStreamId` is `forcedScreenMTXID`, the eye
    badge on a stream tab, and has nothing to do with a query string. A sweep that had been "fixed"
    by renaming that prop would have bought nothing and lost a real name.

    So the boundary is explicit — `forcedStream` NOT followed by another identifier character — which
    matches the URL form, `get('forcedStream')`, and a destructure, and leaves the badge alone.
  */
  const PARAMETER = /forcedStream(?![A-Za-z0-9_$])/;

  it('no shipped file reads forcedStream out of a URL', () => {
    const offenders = SOURCES.filter((path) => {
      const code = codeOf(path, readFileSync(path, 'utf8'));
      return PARAMETER.test(code);
    }).map((path) => path.slice(SRC.length));

    expect(offenders, 'the forcedStream PARAMETER must not appear in shipped code').toEqual([]);
  });

  it('and the unrelated eye badge is still there, so the sweep cannot be passed by deleting it', () => {
    /*
      The positive control for the boundary above. `forcedStreamId` is a real prop with a real
      badge; if a later tightening of the regex swallowed it, this line says so instead of the sweep
      going quietly green over a deleted feature.
    */
    const tabs = codeOf(
      'StreamTabs.svelte',
      readFileSync(new URL('./components/StreamTabs.svelte', import.meta.url), 'utf8')
    );
    expect(tabs).toContain('forcedStreamId');
    expect(PARAMETER.test(tabs), 'the badge must not look like the parameter').toBe(false);
  });

  it('and the modal no longer BUILDS such a URL either', () => {
    /*
      The generating half. A link this room emits and cannot honour is the "wired at one end only"
      shape `room-component-gap-register.md`'s R-11 named, and here it was worse than inert: it was
      one supplied value away from being a control that reloads the room having tested nothing.

      `(test it)` is asserted absent as well as the parameter, because a future anchor could carry a
      different query and the LABEL is what a presenter would click.
    */
    const modal = codeOf(
      'ModalHost.svelte',
      readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8')
    );
    expect(modal).not.toContain('(test it)');
    expect(modal).not.toContain('forcedStream');
  });

  it('while the diagnostic VALUE still renders, which is the half that was worth keeping', () => {
    /*
      The positive control, and it is what stops this being a test satisfied by deleting the row.
      A presenter opening a member's card must still see which stream server that member is on —
      `n/a` today, a host when one lands. What is refused is the affordance to point a browser at an
      arbitrary one, not the fact.
    */
    const modal = codeOf(
      'ModalHost.svelte',
      readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8')
    );
    expect(modal).toContain("{targetUser.streamServer ?? 'n/a'}");
  });
});

describe('the one media endpoint is resolved on the SERVER', () => {
  it('mediaSignallingUrl reads the environment, not a request', () => {
    /*
      The shape this room keeps, asserted so that "we refuse the parameter" cannot quietly become
      "we take the host from somewhere else the client can reach". One endpoint, one environment
      variable, resolved server-side.
    */
    const grant = codeOf(
      'media-grant.ts',
      readFileSync(new URL('./server/media-grant.ts', import.meta.url), 'utf8')
    );
    expect(grant).toContain('export function mediaSignallingUrl(');
    expect(grant).toContain('env.MEDIA_WS_URL');
  });
});
