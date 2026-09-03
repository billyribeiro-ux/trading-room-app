import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments.js';

/**
 * `app-scplayer`'s ONE corrected character, and the contract that keeps the correction declared.
 *
 * ## The divergence
 *
 * `app-scplayer.full.js:13-15` builds its iframe `src` character for character as:
 *
 * ```js
 * `https://w.soundcloud.com/player/?url=${this.scUrl}&amp;auto_play=true`
 * ```
 *
 * An **HTML entity inside a JavaScript template literal**. No HTML parser ever sees it, so the URL
 * the reference actually requests carries a parameter named `amp;auto_play`, and `auto_play=true`
 * never takes effect upstream. The element is also `visibility:hidden` and parked a full viewport
 * below the fold, so there is no control to press instead: their player simply does not start.
 *
 * Ours emits `&auto_play=true`. `room-component-gap-register.md`'s R-13 recorded that as *"a
 * deliberate behavioural divergence from the capture that was never declared"* and asked for one of
 * two things: keep the fix and write the reason at the call site, or restore the entity.
 *
 * ## What this file asserts, and why it is two halves rather than one
 *
 * The fix WITHOUT the reason is what R-13 objected to, so asserting the URL alone would pin exactly
 * the state the register called a defect. Both halves are asserted:
 *
 *   the CODE   emits `&auto_play=true` and never `&amp;auto_play`
 *   the PROSE  still carries the argument, at the markup
 *
 * A future reader restoring the entity has to delete the reason too, and a future reader deleting
 * the reason has to answer why the divergence is undeclared again. Neither can happen quietly.
 *
 * ## Read comment-stripped for the code half, raw for the prose half
 *
 * The docblock quotes `&amp;auto_play=true` in order to explain why it is wrong — the same trap
 * `transcript-authority-contract.test.ts` hit twice — so the "never emits the entity" assertion runs
 * over `codeOf` output and the "still explains itself" assertion over the raw file.
 */

const PATH = new URL('./components/PresentationArea.svelte', import.meta.url);
const RAW = readFileSync(PATH, 'utf8');
const CODE = codeOf('PresentationArea.svelte', RAW);

describe('the corrected character', () => {
  it('requests auto_play as a real parameter', () => {
    expect(CODE).toContain('&auto_play=true');
  });

  it('never emits the reference’s entity, which would silently disable the player', () => {
    /*
      The negative control for this is to paste the capture's literal back: `&amp;auto_play=true`
      type-checks, renders, and produces a player that never makes a sound — with nothing on screen
      to say so, because the element is hidden by design.
    */
    expect(CODE).not.toContain('&amp;auto_play');
  });

  it('keeps every other attribute of the captured element', () => {
    /*
      The point of declaring ONE divergence is that it is one. If the surrounding transcription
      drifts, "we changed a single character" stops being the true description of this component.
    */
    for (const attribute of [
      'id="soundCloudDiv"',
      'id="soundCloudIFrame"',
      'width="100%"',
      'height="150"',
      'scrolling="no"',
      'frameborder="no"',
      'allow="autoplay; encrypted-media"',
      'visibility: hidden'
    ]) {
      expect(CODE, `${attribute} is the capture's`).toContain(attribute);
    }
  });
});

describe('the declaration, which is the half R-13 actually asked for', () => {
  it('explains the entity, at the markup', () => {
    expect(RAW).toContain('HTML entity inside a JavaScript template literal');
    expect(RAW).toContain('app-scplayer.full.js:13-15');
  });

  it('says why the fix is kept rather than the entity restored', () => {
    /*
      Not that a reason EXISTS — that the specific argument survives. The load-bearing one is that
      the upstream behaviour is unreachable rather than merely different: the element is hidden and
      has no control, so a faithful transcription is a component that can never make a sound.
    */
    expect(RAW).toContain('unreachable, not merely different');
    expect(RAW).toContain('reversible');
  });
});
