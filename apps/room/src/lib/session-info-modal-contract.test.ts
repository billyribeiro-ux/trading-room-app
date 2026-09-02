import { readFileSync } from 'node:fs';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import SessionInfoModal from './components/SessionInfoModal.svelte';
import { INERT_ACTION_NAMES } from './user-action-intent.js';
import { codeOf } from './source-comments.js';

/**
 * "Session Information" — the dialog behind "Get my token", and the refusal inside it.
 *
 * `getMyToken()` at bundle byte **2,255,348** renders TWO fields. One is reproduced and one is
 * refused, and this file's whole job is that the refusal cannot quietly become a reproduction:
 * the token input must never be given a value, because the only way to give it one is for the
 * server to write an `httpOnly` cookie into the DOM.
 *
 * ## Rendered rather than read as text
 *
 * The markup assertions go through `render()` — SSR, no browser — rather than a source search,
 * because what matters is what reaches a reader's page. A source search would pass on a field
 * inside an `{#if}` that never opens, and would fail on a value that only differs by how prettier
 * broke the line.
 */

const SOURCE = readFileSync(
  new URL('./components/SessionInfoModal.svelte', import.meta.url),
  'utf8'
);
const CODE = codeOf('SessionInfoModal.svelte', SOURCE);

const open = () =>
  render(SessionInfoModal, {
    props: { open: true, shortCode: '7301', onclose: () => undefined }
  }).body;

describe('the half that is reproduced', () => {
  it('renders the Session ID field with the room’s short code', () => {
    const body = open();
    expect(body).toContain('Session ID:');
    expect(body).toContain('id="sessionId"');
    expect(body).toContain('7301');
  });

  it('keeps the capture’s own chrome — the label, the ids, the copy icon', () => {
    /*
      Transcribed by value from the interpolated message string, so a redesign that drops
      `btn-outline-secondary` or swaps `fa-copy` is a divergence somebody has to argue for rather
      than a diff nobody notices.
    */
    const body = open();
    expect(body).toContain('Session Information');
    expect(body).toContain('btn-outline-secondary');
    expect(body).toContain('fas fa-copy');
    expect(body).toContain('Close');
  });
});

describe('the half that is REFUSED, and cannot stop being refused', () => {
  it('renders the token field disabled and empty', () => {
    const body = open();
    expect(body).toContain('Session Token:');
    expect(body).toContain('id="sessionToken"');

    /*
      THE INPUT ELEMENT ITSELF, bounded by its own closing `>`.

      The first draft sliced a fixed 200 characters from `id="sessionToken"` and asserted `disabled`
      somewhere inside that window — which the COPY BUTTON's own `disabled` satisfies. Its negative
      control removed `disabled` from the input and the test stayed GREEN. Second vacuous assertion
      caught by its own control today, and the same shape as the first: a guard satisfied by a
      different element than the one it names.

      Both are asserted now, separately, because they are two different refusals: an enabled input
      is a place for a value to appear, and an enabled Copy button is a thing that reaches for one.
    */
    const inputAt = body.indexOf('id="sessionToken"');
    expect(inputAt, 'the token input must be rendered at all').toBeGreaterThan(-1);
    const inputEnds = body.indexOf('>', inputAt);
    expect(inputEnds, 'the token input element must be closed').toBeGreaterThan(inputAt);
    expect(
      body.slice(inputAt, inputEnds),
      'the token INPUT must be disabled — not merely its Copy button'
    ).toContain('disabled');

    const buttonAt = body.indexOf('<button', inputEnds);
    expect(buttonAt).toBeGreaterThan(inputEnds);
    const buttonEnds = body.indexOf('>', buttonAt);
    expect(buttonEnds, 'the token Copy button must be closed').toBeGreaterThan(buttonAt);
    expect(
      body.slice(buttonAt, buttonEnds),
      'the token Copy button must be disabled too'
    ).toContain('disabled');
  });

  it('never renders a session token, whatever it is handed', () => {
    /*
      THE ASSERTION THIS FILE EXISTS FOR.

      The component takes no token prop, so the only way one could appear is if somebody adds one.
      Asserted at the SOURCE, comment-stripped — the docblock quotes `sesionToken` (the reference's
      own typo) several times while explaining the refusal, so a raw search would match the
      explanation and report the defect it is describing.
    */
    expect(CODE).not.toContain('sesionToken');
    expect(CODE).not.toContain('sessionToken:');
    expect(CODE).not.toMatch(/value=\{[^}]*[Tt]oken/);
  });

  it('says WHY on screen rather than in a tooltip', () => {
    /*
      `stream-player-blocked-contract.test.ts`'s pattern: a control that cannot honestly work renders
      disabled with the reason visible. A reason a member has to hover to find is a reason most of
      them never read.
    */
    const body = open();
    expect(body).toContain('cookie the page itself');
    expect(body).toContain('aria-describedby="sessionTokenWhy"');
  });
});

describe('the two things the reference does that this must not', () => {
  it('copies through a handler, not an inline onclick in an interpolated string', () => {
    /*
      Upstream: `onclick="navigator.clipboard.writeText('${e}').then(() => alert('…'))"` INSIDE the
      interpolated `message`. A value crossing into executable attribute text is a stored-XSS
      primitive the moment it can contain a quote.
    */
    expect(CODE).toContain('onclick={copySessionId}');
    expect(CODE).not.toContain('onclick="');
  });

  it('never calls window.alert', () => {
    /* `CLAUDE.md` forbids `alert` / `confirm` / `prompt` by name. Upstream's copy handler ends in one. */
    expect(CODE).not.toMatch(/(?<![.\w])alert\(/);
  });

  it('says so when the clipboard refuses, rather than doing nothing', () => {
    /*
      `navigator.clipboard` is absent on an insecure origin and its write can be refused by
      permissions policy. Upstream's inline handler has no failure branch, so a refusal there is a
      button that silently does nothing — the silent-fallback shape this repository refuses.
    */
    expect(CODE).toContain('refused clipboard access');
    expect(CODE).not.toContain('.catch(() => {})');
  });
});

describe('the disposition record agrees with the code', () => {
  it('get-my-token is no longer listed as inert', () => {
    /*
      Deleting the `INERT_ACTIONS` entry is how this repository DECLARES a control fixed, and
      `user-action-disposition-contract.test.ts` then requires the action to be handled. This is the
      other direction of the same rule: the modal exists, so the entry must be gone.
    */
    expect(INERT_ACTION_NAMES).not.toContain('get-my-token');
  });
});
