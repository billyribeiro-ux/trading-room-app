import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments.js';

/**
 * WHAT PUTS A DETACHED PANE BACK, and the half that looks like it does and does not.
 *
 * ## What was measured on 2026-09-03
 *
 * `room-component-gap-register.md`'s R-6 recorded that `closeScreenPopout()` posts a message no
 * `window`-level listener ever receives. Re-measured, the finding is larger and it also has a
 * second instance: **there is no `window.addEventListener('message', …)` anywhere in
 * `apps/room/src`.** The only `addEventListener('message', …)` is `RoomEventStream`'s handler on an
 * `EventSource` — a different channel that never sees a `postMessage`.
 *
 * Two transcribed posts therefore reach nobody here: `windowClosing` from
 * `RoomWindowHandlers.beforeUnload`, and `{cmd:'screeenStopped'}` from `RoomScreens.closePopout`.
 * Upstream, the second one's receiver is unreachable too — R-6 records the `=` where the reference
 * meant `==`, which makes its `screeenStopped` branch dead in the shipped bundle.
 *
 * ## So what DOES re-attach, and why this file exists
 *
 * The opener keeps the child `Window` and registers `beforeunload` **on the child**, which is
 * available because the two are same-origin — and is also what upstream's screen popout does
 * (`s.onbeforeunload = () => emit("reatachScreenShare", i.pres._id)`).
 *
 * That listener is the whole feature, in both panes, and it is exactly the line somebody deletes:
 * it sits a few lines from a `postMessage` whose docblock, until today, read as though the message
 * were what brought the column back. A reader tidying "the duplicate" would remove the one that
 * works and leave the one that does not, and nothing else in the toolchain would notice — the
 * failure is a detached window closing and the pane never returning, which no unit test that does
 * not know to look for it can see.
 *
 * ## Read comment-stripped, because the absence is the claim
 *
 * Both modules QUOTE `window.addEventListener("message", …)` in order to explain that it is
 * upstream's mechanism and not this room's. A raw-source sweep for the listener would match the
 * sentence saying there is none.
 */

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), 'utf8');

const SOURCES = [
  'room/alerts-pane.ts',
  'room/screens.svelte.ts',
  'room/window-handlers.ts',
  'room/events.svelte.ts'
] as const;

describe('the listener that actually brings a detached pane back', () => {
  it.each([
    ['room/alerts-pane.ts', '#detachedWindow'],
    ['room/screens.svelte.ts', 'popout']
  ] as const)('%s registers beforeunload on the CHILD window', (path, holder) => {
    /*
      Asserted as `<child>.addEventListener('beforeunload'` and not merely as the string
      `beforeunload`: this room registers a `beforeunload` on its OWN window too
      (`window-handlers.ts`, the half that posts upstream's message), so a looser assertion would be
      satisfied by the line that reaches nobody while the one that works had gone.
    */
    const code = codeOf(path, read(`./${path}`));
    expect(code).toContain(`${holder}.addEventListener('beforeunload'`);
  });

  it('and each of those handlers actually re-attaches rather than only bookkeeping', () => {
    // The alerts pane clears the detached flag; the screens pane drops the id and re-selects the tab.
    const alerts = codeOf('room/alerts-pane.ts', read('./room/alerts-pane.ts'));
    expect(alerts).toContain('this.#setChatAlertsDetached(false)');

    const screens = codeOf('room/screens.svelte.ts', read('./room/screens.svelte.ts'));
    expect(screens).toContain('this.#selectTabOfId(screenId)');
  });
});

describe('the transcribed posts, and that nothing here pretends to receive them', () => {
  it('no module listens for a window message', () => {
    /*
      Comment-stripped: `window-handlers.ts` and `alerts-pane.ts` both quote upstream's listener in
      order to say it is upstream's. `events.svelte.ts` is included in the sweep precisely because
      it holds the one real `addEventListener('message', …)` in the room — on an `EventSource` — and
      a sweep that excluded it would be choosing its own answer.
    */
    for (const path of SOURCES) {
      const code = codeOf(path, read(`./${path}`));
      expect(code, `${path} must not add a window message listener`).not.toContain(
        "window.addEventListener('message'"
      );
      expect(code, `${path} must not add a window message listener`).not.toContain(
        'window.addEventListener("message"'
      );
    }
  });

  it('the SSE handler is on the EventSource, which is what makes the sweep above meaningful', () => {
    /*
      The positive control for the assertion above. Without this line a reader could believe the
      sweep passes because the room has no message handling at all, and would be one refactor away
      from moving the SSE listener onto `window` and quietly satisfying nothing.
    */
    const events = codeOf('room/events.svelte.ts', read('./room/events.svelte.ts'));
    expect(events).toContain("source.addEventListener('message'");
  });

  it('and both posts are still made, because they are transcription', () => {
    /*
      Kept rather than deleted, for the reason `alerts-pane.ts` gives about `sl=1`: the popout is a
      transcription, a member never sees this, it claims nothing, and removing a transcribed line
      because this deployment does not need it makes the next diff against the capture harder to
      read. What was wrong was a comment claiming an effect — corrected 2026-09-03 — not the line.
    */
    const handlers = codeOf('room/window-handlers.ts', read('./room/window-handlers.ts'));
    expect(handlers).toContain("window.opener?.postMessage('windowClosing'");

    const screens = codeOf('room/screens.svelte.ts', read('./room/screens.svelte.ts'));
    expect(screens).toContain("popout.postMessage({ cmd: 'screeenStopped'");
  });

  it('the opener post is GUARDED, where the reference dereferences window.opener bare', () => {
    /*
      A declared divergence with a failure behind it: `?co=1` is reachable by hand here — a member
      who bookmarks the popout URL — and there `window.opener` is null, so the reference's line
      would throw a `TypeError` on every unload. `?.` is the whole fix and it is easy to "simplify"
      away, so it is pinned.
    */
    const handlers = codeOf('room/window-handlers.ts', read('./room/window-handlers.ts'));
    expect(handlers).toContain('window.opener?.postMessage');
    expect(handlers).not.toContain('window.opener.postMessage');
  });
});
