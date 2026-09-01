import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  `app-rec-preview` — the recording preview card, transcribed and UNREACHABLE, and this is what makes
  that pair safe instead of merely true.

  ## The measurement, 2026-09-01

  `gate/audit-surface.mjs` reported three absent const values for this surface and the read behind
  them found more than three:

    * `.recsHolderScreen` carries `display: none` — the reference's own rule — and **nothing in this
      room ever removes it**. One markup site, no gate, no class toggle, no writer.
    * Its two icons have NO click handlers. Upstream both are `x("click", …)` on `closePreview()` and
      `expandPreview()`, and the expand icon swaps to `fa-compress-arrows-alt` under
      `O(8, expandRecPreview ? 8 : 9)`.
    * "Recording paused." is the `-1` arm of `O(10, isRecording && !isRecordingPaused ? 10 : 11)`;
      the other arm is an `<img id="recScreenLocalPreview" class="recPreviewScreen">` this room has
      no source for, because its preview is a separate WINDOW (`room/recording.ts`).

  ## Why the card was not simply deleted

  It was, and `captured-css-ancestor-contract` went red: `app-rec-preview` is a scoped host in the
  generated stylesheet, so an absent host leaves its rules matching nothing and those components
  *"ship unstyled and silently"*. The generated sheet cannot be trimmed by hand — it is regenerated
  from the capture — so the host is what keeps its rules attached to an element.

  ## What this file guards, and why it is not "we did not build it"

  A test asserting an absence passes forever and stops nobody; `alert-report-modal-contract.test.ts`
  makes the same argument for its own refusal. So the assertion here is the CONDITIONAL:

  > the card may stay handler-less only while it stays unreachable.

  The day somebody removes `display: none`, or wraps the card in a gate, this file goes red and the
  two handlers become required. That is the whole point — an inert control nobody can press is a
  comment; the same control on screen is the defect `user-action-disposition-contract` exists for.
*/

/*
  The card is its OWN component since 2026-09-01, and the split is `source-size-contract`'s doing:
  the decision recorded at it is forty lines, `ModalHost.svelte` was refused them, and the answer that
  rule gives is extract rather than raise. `ModalHost` is still read — separately — because "the host
  renders it exactly once" is a fact about the HOST, and asserting it against a concatenation would
  keep the case green through a move that dropped the call site.
*/
const MODAL_HOST = readFileSync(
  new URL('./components/RecordingPreviewCard.svelte', import.meta.url),
  'utf8'
);
const HOST_CALLER = readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8');
const APP_CSS = readFileSync(new URL('../app.css', import.meta.url), 'utf8');
const strip = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
const markup = strip(MODAL_HOST);

/**
 * The card's markup, from its host element to the closing one.
 *
 * Bound to asserted positions rather than sliced inline: `slice-anchor-contract` refuses an
 * unchecked `indexOf` bound, and for the reason it records — `slice(-1)` is a legal operation
 * returning one character, and every assertion below would then be about that character.
 */
const cardFrom = markup.indexOf('<app-rec-preview>');
const cardTo = markup.indexOf('</app-rec-preview>');

describe('the card is still exactly where the reasoning says it is', () => {
  it('is rendered once, as the scoped host the generated sheet needs', () => {
    expect(cardFrom, 'the <app-rec-preview> host must exist').toBeGreaterThan(-1);
    expect(cardTo, 'the host must be closed').toBeGreaterThan(cardFrom);
    expect(markup.match(/<app-rec-preview>/g) ?? []).toHaveLength(1);
  });

  it('and the modal host mounts it exactly once', () => {
    /*
      The call site, asserted against `ModalHost.svelte` itself. A component nobody renders would
      satisfy every other case in this file while leaving `captured-css-ancestor-contract`'s reason
      for keeping the card — that its generated rules need an element — quietly false.
    */
    expect(strip(HOST_CALLER).match(/<RecordingPreviewCard\s*\/>/g) ?? []).toHaveLength(1);
  });

  it('carries the captured holder and the reference class', () => {
    const card = markup.slice(cardFrom, cardTo);
    expect(card).toContain('id="recLocalPreviewHolder"');
    expect(card).toContain('class="card recsHolderScreen"');
    expect(card).toContain('Recording Preview. (DELAYED UPTO 20s)');
    expect(card).toContain('Recording paused.');
  });
});

/**
 * Does ANY rule whose selector list includes `.recsHolderScreen` declare `display: none`?
 *
 * Every such block, not the first one, and that distinction is the bug this helper was written to
 * fix. `src/app.css` declares the class TWICE: once in a shared block with `.webcamsHolderScreen`
 * carrying the shared geometry, and once alone carrying `bottom` and `display: none`. A first-match
 * read finds the shared block, sees no `display`, and concludes the card is reachable — which turned
 * two cases red against a card that has been hidden since the day it was written.
 */
const hiddenByRule = (): boolean => {
  for (const match of APP_CSS.matchAll(/\.recsHolderScreen[^{]*\{/g)) {
    const close = APP_CSS.indexOf('}', match.index);
    if (close === -1) continue;
    if (APP_CSS.slice(match.index, close).includes('display: none')) return true;
  }
  return false;
};

describe('unreachable, and the two facts that make it so', () => {
  /*
    Both halves, because either one alone would let the card onto the screen. A `display: none` with
    a gate that renders it, or a gate-less card whose rule was removed, are the same failure.
  */
  it('the class is display:none in this app’s own sheet', () => {
    expect(APP_CSS).toContain('.recsHolderScreen');
    expect(hiddenByRule(), '.recsHolderScreen must still be hidden by a rule here').toBe(true);
  });

  it('and nothing in this room ever writes it, so no code path can show the card', () => {
    /*
      A repository-wide search rather than a look at the host: the way this card would become
      reachable is somebody adding a class toggle or a `{#if}` somewhere else entirely. `hidden`,
      `class:`, `classList` and a bare `{#if}` around the host are the four shapes that would do it.
    */
    const card = markup.slice(cardFrom, cardTo);
    expect(card).not.toContain('{#if');
    expect(card).not.toContain('class:');
    expect(markup.slice(Math.max(0, cardFrom - 200), cardFrom)).not.toContain('{#if');
    expect(MODAL_HOST).not.toContain('recsHolderScreen-lg');
  });
});

describe('the CONDITIONAL: handler-less only while unreachable', () => {
  /*
    THE ASSERTION THIS FILE EXISTS FOR.

    Not "the icons have no handlers" — that would pass forever and forbid the fix. What is asserted
    is the implication: if the card is reachable, the handlers are required.

    `reachable` is computed from the two facts above rather than passed in, so the test cannot be
    satisfied by editing a constant. Making the card visible turns `reachable` true and the second
    half of the expectation becomes the requirement.
  */
  const card = markup.slice(cardFrom, cardTo);
  const reachable = !hiddenByRule() || card.includes('{#if');

  it('either the card cannot be reached, or both icons act', () => {
    const closes = card.includes('onclick') && /fa-times/.test(card);
    const expands = /onclick[^>]*>\s*<i class="fas fa-(expand|compress-arrows-alt)/.test(card);
    expect(
      !reachable || (closes && expands),
      reachable
        ? 'The recording preview card is now reachable, so its close and expand icons must do ' +
            'something. Upstream they are `closePreview()` and `expandPreview()`, and the expand ' +
            'icon swaps to `fa-compress-arrows-alt` under `O(8, expandRecPreview ? 8 : 9)`. An ' +
            'inert control nobody can press is a comment; the same control on screen is a lie.'
        : 'unreachable, so the icons may stay inert'
    ).toBe(true);
  });

  it('and the room’s real preview mechanism is the window, not this card', () => {
    /*
      The premise the whole refusal rests on, read from the file that owns it. If `showRecPreview`
      ever stops opening a window, the card stops being the redundant one.
    */
    /*
      COMMENTS STRIPPED, and the strip is the assertion. Without it the negative control — renaming
      `showRecPreview` — stayed GREEN, because the method's own docblock quotes
      `showRecPreview()`/`hideRecPreview()` from the capture two lines above the declaration. That
      is the eighth time this session a check's subject matched the prose recording it, and the fix
      is always at the assertion's target rather than at the string.
    */
    const recording = strip(readFileSync(new URL('./room/recording.ts', import.meta.url), 'utf8'));
    expect(recording).toContain('showRecPreview() {');
    expect(recording).toContain('recPreviewWindow');
  });
});
