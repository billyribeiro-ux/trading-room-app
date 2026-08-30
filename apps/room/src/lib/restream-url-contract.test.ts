import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments';

/**
 * SC-12 and SC-13 — the restream destination, seeded from the room and written back to it.
 *
 * ## One defect with two halves, and neither half is visible on screen
 *
 * ```js
 * e.restreamLink = e.appService.globals.sessData.restreamToURL
 *   ? e.appService.globals.sessData.restreamToURL : ""            // byte 2,160,049   SC-12
 *
 * startRestream(e = !1) {
 *   if (e) return this.appService.invokeAdminCmd("setRestreamURL", { restreamToURL: "" }),
 *              void (this.restreamLink = "");
 *   this.restreamLink.startsWith("rtmp://") && !this.restreamLink.includes(" ")
 *     ? this.appService.invokeAdminCmd("setRestreamURL", { restreamToURL: this.restreamLink })
 *     : …                                                          // byte 2,174,659   SC-13
 * }
 * ```
 *
 * Ours had `let restreamLink = $state('')` — a constant with no prop and no read of the room
 * config — and two handlers calling `onPreferenceChange('restreamToURL', …)`. That call is
 * `prefs.save`: this VIEWER's settings row. The two lines were the ONLY occurrences of the name in
 * `apps/room/src`, so nothing read what they wrote.
 *
 * Put together, a presenter typed a destination, pressed Set, and the pane went on displaying the
 * value while the room republished nowhere. **The display is what let it survive** — a control whose
 * only effect is on the person pressing it looks exactly like one that works.
 *
 * ## What is asserted here, and what is asserted on the controller
 *
 * This file pins the ROOM's half: the seed, the two write paths, the validation, and the absence of
 * the preference call. `room-config-boundary.test.ts` pins the controller's — that `restreamToURL`
 * crosses to a presenter and to nobody else, that it is writable, and that nothing else moved onto
 * the presenter list with it.
 */

const read = (path: string) => readFileSync(path, 'utf8');

const PANE = () => read('src/lib/components/RestreamPane.svelte');
const MODAL = () => read('src/lib/components/ModalHost.svelte');
const OVERLAYS = () => read('src/lib/components/RoomOverlays.svelte');
const MODULE = () => read('src/lib/room/restream-url.ts');
const COMMAND = () => read('src/routes/session-commands.remote.ts');

/**
 * The text from `opening` up to `closing`, with BOTH positions asserted.
 *
 * `indexOf` answers -1 when it fails and -1 is a valid `slice` argument, so a slice bound by an
 * inlined `indexOf` silently becomes "from the end" or "to the last character" instead of throwing.
 * `slice-anchor-contract.test.ts` ratchets that shape down and refused the first draft of this file.
 */
const between = (source: string, opening: string, closing: string) => {
  const from = source.indexOf(opening);
  expect(from, `\`${opening}\` is not in the source`).toBeGreaterThan(-1);
  const to = source.indexOf(closing, from + opening.length);
  expect(to, `\`${opening}\` is never followed by \`${closing}\``).toBeGreaterThan(from);
  return source.slice(from, to);
};

/** The rest of the file from `opening`, with the position asserted. */
const after = (source: string, opening: string) => {
  const from = source.indexOf(opening);
  expect(from, `\`${opening}\` is not in the source`).toBeGreaterThan(-1);
  return source.slice(from);
};

describe('SC-12 — the textarea is seeded from the room', () => {
  it('reads the room s stored destination rather than an empty string', () => {
    expect(PANE()).toContain("let restreamLink = $state(untrack(() => restreamUrl ?? ''));");
  });

  it('seeds ONCE, because the presenter has to be able to type', () => {
    /*
      `untrack`, exactly as `streamingProtocol` above it does and for the written reason: this is a
      seed and then locally owned. A `$derived` here would overwrite what is being typed on any
      re-read of page data — `invalidateAll()` after a successful save is one.
    */
    expect(between(PANE(), 'let restreamLink =', '\n')).toContain('untrack');
  });

  it('is fed from sessData by the component that holds the page data', () => {
    expect(OVERLAYS()).toContain('restreamUrl={data.sessData?.restreamToURL}');
  });
});

describe('SC-13 — the write goes to the room, not to the viewer', () => {
  it('no longer writes it as a per-user preference ANYWHERE in the room', () => {
    /*
      The assertion that would have caught the original defect, and the one that keeps it fixed.
      `user-action-disposition-contract` treats a deleted entry as the declaration that a control is
      real; this is the same idea one level down — the preference write is gone, not merely
      supplemented.

      ## Comments stripped first, and this test is why that helper exists

      The first run of this assertion went RED against correct code: the docblock two lines above
      `saveRestreamLink` QUOTES the call it is describing, and the raw source contains that quote.
      Prose must never vote in a source assertion — the room's feature-coverage scanner learned the
      same lesson on 2026-08-30 by over-reporting twenty-one commands and four tabs it had read out
      of its own comments. `codeOf` dispatches on the extension so a `.svelte` file loses its
      `<!-- -->` AND the JavaScript comments inside its `<script>`.
    */
    for (const [path, source] of [
      ['src/lib/components/RestreamPane.svelte', PANE()],
      ['src/lib/components/ModalHost.svelte', MODAL()],
      ['src/lib/components/RoomOverlays.svelte', OVERLAYS()]
    ] as const) {
      expect(codeOf(path, source), path).not.toContain("onPreferenceChange('restreamToURL'");
    }
  });

  it('and the stripper is not simply deleting the file', () => {
    /*
      A positive control on the line above: `codeOf` returning '' would satisfy every `not.toContain`
      in this file. The call it DOES have to keep is the one that replaced the preference write.
    */
    const code = codeOf('src/lib/components/RestreamPane.svelte', PANE());
    expect(code).toContain('onSaveRestreamUrl(restreamLink);');
    expect(code).toContain('bind:value={restreamLink}');
  });

  it('calls the room-level command from both buttons', () => {
    const pane = PANE();
    expect(pane).toContain('onSaveRestreamUrl(restreamLink);');
    expect(pane).toContain("onSaveRestreamUrl('');");
  });

  it('keeps the reference s validation on the Set path', () => {
    /* `startsWith("rtmp://") && !includes(" ")` — and the reference's own alert on the other arm. */
    const body = between(PANE(), 'function saveRestreamLink()', '\n  }');
    expect(body).toContain("restreamLink.startsWith('rtmp://') && !restreamLink.includes(' ')");
    expect(body).toContain('oninvalid()');
    /* …and the modal is what turns that into the reference's own refusal. */
    expect(MODAL()).toContain(
      "oninvalid={() => onUserAction('invalid-restream-link', targetUser)}"
    );
  });

  it('re-checks that validation on the SERVER, because the pane is not the only way in', () => {
    const body = after(COMMAND(), 'export const setRestreamUrl');
    expect(body).toContain("url.startsWith('rtmp://') && !url.includes(' ')");
    /* `''` is the documented clear and must survive the check the reference applies to it. */
    expect(body).toContain("url !== ''");
  });

  it('is presenter-gated on the room server as well as hidden in the pane', () => {
    expect(after(COMMAND(), 'export const setRestreamUrl')).toContain('presenterRoom()');
  });

  it('writes through the control plane, where the setting actually lives', () => {
    const body = after(COMMAND(), 'export const setRestreamUrl');
    expect(body).toContain(
      "writeRoomSetting(room, requireUser(locals).email, 'restreamToURL', url)"
    );
  });

  it('fails LOUDLY, because the pane clears itself before the write is awaited', () => {
    expect(MODULE()).toContain("deps.dialogs.alert = 'Command failed.'");
    /* And the page data is put back in step on success, so the next open seeds from the truth. */
    expect(MODULE()).toContain('await invalidateAll();');
  });
});
