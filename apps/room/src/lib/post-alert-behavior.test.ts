import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from '#lib/source-comments.js';
import {
  composePastedImageAlert,
  composePostAlert,
  composeUploadedAlert,
  POST_ALERT_LEGAL_DISCLOSURE,
  POST_ALERT_URL_SCHEME_ERROR,
  postOnXIntent,
  type PostAlertDraft
} from './post-alert-behavior';

const baseDraft: PostAlertDraft = {
  tab: 'text',
  alertText: '',
  alertUrl: '',
  linkAlertText: '',
  imageAlertText: '',
  legalDisclosure: false,
  legalDisclosureText: POST_ALERT_LEGAL_DISCLOSURE,
  filesTouched: false
};

describe('decoded Post Alert behavior', () => {
  it('silently aborts each source-proven empty branch', () => {
    expect(composePostAlert(baseDraft)).toEqual({ status: 'noop', reason: 'empty-text' });
    expect(composePostAlert({ ...baseDraft, tab: 'url' })).toEqual({
      status: 'noop',
      reason: 'empty-url'
    });
    expect(composePostAlert({ ...baseDraft, tab: 'media' })).toEqual({
      status: 'noop',
      reason: 'empty-media'
    });
  });

  it('preserves text and appends the exact legal disclosure spacing', () => {
    expect(
      composePostAlert({
        ...baseDraft,
        alertText: 'Buy 100 shares',
        legalDisclosure: true
      })
    ).toEqual({
      status: 'post',
      kind: 'text',
      body: `Buy 100 shares \n ${POST_ALERT_LEGAL_DISCLOSURE}`
    });
  });

  it('uses the exact URL validation rule and exact Bootbox copy', () => {
    expect(
      composePostAlert({
        ...baseDraft,
        tab: 'url',
        alertUrl: 'example.com'
      })
    ).toEqual({ status: 'error', message: POST_ALERT_URL_SCHEME_ERROR });

    expect(
      composePostAlert({
        ...baseDraft,
        tab: 'url',
        alertUrl: 'prefix HTTPS://example.com',
        linkAlertText: 'Caption'
      })
    ).toEqual({
      status: 'post',
      kind: 'url',
      body: 'Caption\nprefix HTTPS://example.com '
    });
  });

  it('shares the URL branch semantics with media and defers selected files to upload', () => {
    expect(
      composePostAlert({
        ...baseDraft,
        tab: 'media',
        imageAlertText: 'Chart',
        filesTouched: true
      })
    ).toEqual({
      status: 'upload',
      kind: 'media',
      bodyBeforeUploads: 'Chart\n'
    });

    expect(
      composeUploadedAlert('Chart\n', ['https://cdn/one.png', 'https://cdn/two.png'], true, 'LEGAL')
    ).toBe('Chart\n https://cdn/one.png https://cdn/two.png \n LEGAL');
  });

  it('matches the separate pasted-image body branch and X intent URL', () => {
    expect(composePastedImageAlert('Caption', 'https://cdn/image.png', false, '')).toBe(
      'Caption\nhttps://cdn/image.png'
    );
    expect(postOnXIntent('Buy $AAPL')).toBe('https://twitter.com/intent/tweet?text=Buy%20%24AAPL');
  });
});

describe('PAM-13 — the media guard tests whether a list EXISTS, as the reference does', () => {
  /*
    ── THE ROW WAS REFUSED ON TWO PREDICTED HARMS AND BOTH WERE MEASURED FALSE ─────────────────────

    Upstream: `return fc ? void this.doImagurFileListUpload(e) : void 0`, with `fc` read at all
    three of its sites — `var fc;` (2,122,856, undefined), `fc = []; for (…) fc.push(i)`
    (2,123,302, the picker) and `fc = []` (2,128,421, the modal's own reset, EMPTY and TRUTHY).

    The 2026-08-30 refusal said reproducing it *"means reproducing a bug whose only outcomes are a
    wasted request or an empty alert"*. Traced end to end on 2026-09-02, neither happens here:

      no wasted request — `RoomComposer.uploadAlertFiles(files)` is `for (const f of files)`, so an
                          empty list iterates nothing and no upload is issued at all;
      no empty alert    — `composeUploadedAlert('', [], …)` returns `""`, and
                          `post-alert.remote.ts:54` is `body: z.string().min(1)`, so the boundary
                          refuses it. Measured by calling the function, not read off the types.

    What the old guard DID cost is the case below: a caption with no file. That is a working
    upstream path this room silently refused, so matching added a behaviour rather than a bug.
  */

  it('dispatches the upload once a list exists, even when it is empty', () => {
    const composed = composePostAlert({
      ...baseDraft,
      tab: 'media',
      imageAlertText: 'caption',
      filesTouched: true
    });
    expect(composed).toEqual({
      status: 'upload',
      kind: 'media',
      bodyBeforeUploads: 'caption\n'
    });
  });

  it('and that body is what actually reaches the server, with zero uploads', () => {
    /*
      The half the guard alone cannot show. `composeUploadedAlert` is what `RoomComposer` calls
      AFTER the (empty) upload, so this is the string `postAlert` is handed.
    */
    expect(composeUploadedAlert('caption\n', [], false, '', '')).toBe('caption\n');
    /* And with no caption it is empty — which `z.string().min(1)` refuses, so nothing is stored. */
    expect(composeUploadedAlert('', [], false, '', '')).toBe('');
  });

  it("but a list that was never created still aborts, which is upstream's `var fc;`", () => {
    expect(composePostAlert({ ...baseDraft, tab: 'media', imageAlertText: 'caption' })).toEqual({
      status: 'noop',
      reason: 'empty-media'
    });
  });

  it('sets the latch at BOTH sites the reference assigns `fc`, and nowhere else', () => {
    /*
      ADDED because a negative control found this hole rather than because it was designed in:
      deleting the `filesTouched = true` from `clearInputFields` left the whole suite green. The
      cases above exercise the pure function, which cannot see whether the component ever sets the
      flag — so the latch could be silently un-wired at either end and only a person would notice.

      Asserted on the SOURCE because the two sites are the transcription: `fc` is assigned in
      exactly two places upstream, the picker at 2,123,302 and the reset at 2,128,421, and a latch
      set in one of them is a different guard from the reference's.
    */
    const path = 'src/lib/components/PostAlertModal.svelte';
    const code = codeOf(path, readFileSync(path, 'utf8'));

    expect(code, 'the latch is gone from the component').toContain(
      'let filesTouched = $state(false)'
    );
    expect(
      code.match(/filesTouched = true;/g) ?? [],
      'the latch must be set at exactly the two sites upstream assigns `fc`: the picker and the reset'
    ).toHaveLength(2);

    /*
      And each one is in the right function, not two copies in the same place.

      Each position is bound to a local and asserted found before it is sliced with, because
      `slice-anchor-contract.test.ts` refuses an inlined `indexOf` — and the reason is exactly this
      case: `indexOf` returning -1 slices from the END of the string, so a renamed function would
      leave both assertions below reading an empty tail and PASSING.
    */
    for (const [label, fn] of [
      ['the RESET site', 'function clearInputFields'],
      ['the PICKER site', 'function setFiles']
    ] as const) {
      const start = code.indexOf(fn);
      expect(start, `${fn} is gone from the component`).toBeGreaterThan(-1);
      const rest = code.slice(start);
      const end = rest.indexOf('\n  }');
      expect(end, `${fn} is unterminated`).toBeGreaterThan(-1);
      expect(rest.slice(0, end), label).toContain('filesTouched = true');
    }
  });

  it('and a URL still wins over the file path, in either state', () => {
    /*
      The guard sits INSIDE `if (!draft.alertUrl)`, so a URL short-circuits it. Asserted in both
      latch states because a regression that moved the guard outward would pass on one of them.
    */
    for (const filesTouched of [false, true]) {
      expect(
        composePostAlert({
          ...baseDraft,
          tab: 'media',
          alertUrl: 'https://example.com/a.png',
          filesTouched
        }).status,
        `a URL must post whatever the latch says (filesTouched=${filesTouched})`
      ).toBe('post');
    }
  });
});
