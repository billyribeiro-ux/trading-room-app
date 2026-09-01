// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';

import { svelteCodeOf } from '#lib/source-comments.js';
import ImageUploadDialog from './components/ImageUploadDialog.svelte';

/**
 * `imgUpload()`'s BOOTBOX OPTIONS — the two this dialog never reproduced.
 *
 * ## The capture, byte 1,442,225
 *
 * ```js
 * bootbox.dialog({ message: "…<textarea id=\"msg-text\" …>…",
 *                  title: "Image Upload", backdrop: !0, onEscape: !0, size: "xl",
 *                  buttons: { success: { label: "Upload", className: "btn-success", … } } })
 * ```
 *
 * `title`, `size` and the button were built when this component was written. `backdrop` and
 * `onEscape` were not, and nothing had looked: `todo-next.md` listed this file as unread, and its
 * only comment was an `svelte-ignore` pragma.
 *
 * ## Why each is rendered surface rather than a bootbox implementation detail
 *
 * **`backdrop`.** This repository has already ruled that option rendered surface TWICE and built
 * the same element from it — `ROV-04` for `ImageLightbox.svelte` and `VID-01` for the video
 * player, both emitting `<div class="modal-backdrop fade show">`. This was the one dialog of that
 * family with none, and the consequence is measurable rather than aesthetic: `app.css:1556` sets
 * `.modal { background: transparent }` and `modal-open` occurs nowhere in the room, so the page
 * behind this dialog stayed at full brightness.
 *
 * **`onEscape`.** The room's one global Escape ladder is `room/window-handlers.ts`, and it closes
 * the emoji and GIF popovers, the image lightbox and `BootboxDialog`'s three modes. This dialog is
 * in none of them, and it has no key handler of its own — so Escape did nothing at all.
 *
 * ## The two things that made `onEscape` more than one line
 *
 * 1. **It needs the focus.** Bootbox binds Escape to the MODAL, and Bootstrap's plugin focuses the
 *    modal on show. This room ships no Bootstrap JavaScript (`bootstrap-dropdown-contract.test.ts`
 *    holds that premise for every app here), so a handler on this element would never have received
 *    a keystroke. `Modal.svelte` records the identical finding as `ASR-3` for the other
 *    twenty-three dialogs in the room.
 * 2. **It stops the event.** The global ladder's last arm is `else if (dialogs.alert) …`, and a
 *    failed upload raises exactly such an alert — so a `<svelte:window>` handler here would let one
 *    keystroke close two things. Binding to the element and calling `stopPropagation` keeps it off
 *    the bubble path, and is also where the reference binds.
 */
/*
  Read from the working directory rather than from `import.meta.url`: this file runs under jsdom,
  where `import.meta.url` is not a `file:` URL and `fileURLToPath` throws before a single case runs.
*/
const source = svelteCodeOf(readFileSync('src/lib/components/ImageUploadDialog.svelte', 'utf8'));

let target: HTMLElement | null = null;
let component: Record<string, unknown> | null = null;

afterEach(() => {
  if (component) void unmount(component);
  target?.remove();
  component = null;
  target = null;
});

function open() {
  const closed: true[] = [];
  target = document.createElement('div');
  document.body.append(target);
  component = mount(ImageUploadDialog, {
    target,
    props: { onclose: () => closed.push(true), onupload: () => {} }
  }) as Record<string, unknown>;
  flushSync();
  return { closed, root: target };
}

describe('`backdrop:!0` — the element bootbox emits behind the dialog', () => {
  it('renders one, with the classes its two siblings in this repository render', () => {
    const backdrop = open().root.querySelector('.modal-backdrop');
    expect(backdrop, 'ROV-04 and VID-01 built this from the same option').not.toBeNull();
    expect(backdrop?.className).toBe('modal-backdrop fade show');
  });

  it('as a SIBLING of the dialog, not a child of it', () => {
    /*
      Where `BootboxDialog.svelte` and `ImageLightbox.svelte` put theirs. A backdrop nested inside
      the element it is meant to sit behind is painted over by it.
    */
    const { root } = open();
    const dialog = root.querySelector('.bootbox.modal');
    const backdrop = root.querySelector('.modal-backdrop');
    expect(dialog?.contains(backdrop ?? null)).toBe(false);
  });

  it('carries no dismiss handler, for the reason its two siblings record', () => {
    /*
      The backdrop paints BEHIND a dialog element that already covers the viewport, so a click on
      the dimmed area never reaches it. A handler there would be a control that receives no events.

      The positive half is asserted FIRST and is not decoration: an absence assertion over source
      passes for the wrong reason the moment the region moves to another file, which is what
      `source-size-contract`'s vacuity check exists to catch.
    */
    expect(source, 'the element this is an absence claim about').toContain(
      '<div class="modal-backdrop fade show"></div>'
    );
    expect(source).not.toMatch(/modal-backdrop[^>]*onclick/);
  });
});

describe('`onEscape:!0` — the keystroke that dismisses it', () => {
  it('takes the focus when it opens, or the handler could never fire', () => {
    const { root } = open();
    expect(document.activeElement).toBe(root.querySelector('.bootbox.modal'));
  });

  it('closes on Escape', () => {
    const { root, closed } = open();
    root
      .querySelector('.bootbox.modal')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    flushSync();
    expect(closed).toHaveLength(1);
  });

  it('and on nothing else', () => {
    const { root, closed } = open();
    for (const key of ['Enter', ' ', 'Tab', 'a']) {
      root
        .querySelector('.bootbox.modal')
        ?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    }
    flushSync();
    expect(closed).toEqual([]);
  });

  it('stops the event, so the room s global ladder does not act on the same keystroke', () => {
    /*
      Asserted on the EVENT rather than in the source, because `stopPropagation` is only meaningful
      as a fact about what reaches the window. A listener there sees nothing.
    */
    const { root } = open();
    const seenAtWindow: string[] = [];
    const listener = (event: Event) => seenAtWindow.push((event as KeyboardEvent).key);
    window.addEventListener('keydown', listener);
    try {
      root
        .querySelector('.bootbox.modal')
        ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      flushSync();
    } finally {
      window.removeEventListener('keydown', listener);
    }
    expect(seenAtWindow).toEqual([]);
  });
});
