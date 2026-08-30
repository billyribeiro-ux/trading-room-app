export interface MessageMenuRect {
  left: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

interface MessageMenuViewport {
  width: number;
  height: number;
  devicePixelRatio?: number;
}

export function calculateMessageMenuPosition(
  trigger: MessageMenuRect,
  menu: MessageMenuRect,
  viewport: MessageMenuViewport
) {
  const edge = 4;
  const gap = 2;
  const devicePixelRatio = viewport.devicePixelRatio || 1;
  const round = (value: number) => Math.round(value * devicePixelRatio) / devicePixelRatio;
  let left = trigger.left;
  let top = trigger.bottom + gap;
  let placement: 'bottom-start' | 'top-start' = 'bottom-start';

  if (top + menu.height > viewport.height - edge) {
    top = trigger.top - menu.height - gap;
    placement = 'top-start';
  }

  left = Math.max(edge, Math.min(left, viewport.width - menu.width - edge));
  top = Math.max(edge, Math.min(top, viewport.height - menu.height - edge));

  return {
    left: round(left),
    top: round(top),
    placement
  };
}

/**
 * The DOM half of the same job: apply {@link calculateMessageMenuPosition} to a live dropdown.
 *
 * An ATTACHMENT rather than an `$effect` inside the component, and that is not only about line
 * count. Svelte 5's `{@attach}` hands the element straight to the function and re-runs it whenever
 * a reactive value it READ changes — which is exactly the lifetime this plumbing wants: open,
 * place, listen, and tear the listeners down again on close or unmount. Written as an effect it
 * needed a `bind:this` for the element it was already going to be given, and the cleanup path had
 * to be repeated for two different reasons to stop.
 *
 * It lives beside the geometry it applies. `MessageMenu.svelte` had 55 lines of `getBoundingClient
 * Rect`, `ResizeObserver` and `style.cssText` sitting on top of one pure function that already knew
 * where the menu goes, so the component read as if placement were its business. It is not: the
 * component owns twelve entries and their gates.
 *
 * The written styles are the captured popper's, verbatim — `position: fixed; inset: 0px auto auto
 * 0px; margin: 0px; …; transform: translate3d(x, y, 0px)` with `data-popper-placement` beside it —
 * because the captured stylesheet selects on that attribute.
 *
 * @param isOpen  read reactively; closing removes every property this set, rather than hiding it
 * @param triggerOf  the anchor the menu is positioned against, or `null` before it mounts
 */
export function attachMenuPlacement(isOpen: () => boolean, triggerOf: () => HTMLElement | null) {
  return (menu: HTMLElement) => {
    const hide = () => {
      for (const property of [
        'position',
        'inset',
        'margin',
        'visibility',
        'display',
        'transform'
      ]) {
        menu.style.removeProperty(property);
      }
      delete menu.dataset.popperPlacement;
    };

    const place = () => {
      const trigger = triggerOf();
      if (!isOpen() || !trigger) return;

      const { left, top, placement } = calculateMessageMenuPosition(
        trigger.getBoundingClientRect(),
        menu.getBoundingClientRect(),
        {
          width: document.documentElement.clientWidth,
          height: document.documentElement.clientHeight,
          devicePixelRatio: window.devicePixelRatio
        }
      );

      menu.dataset.popperPlacement = placement;
      menu.style.cssText =
        `position: fixed; inset: 0px auto auto 0px; margin: 0px; visibility: visible; ` +
        `display: block; transform: translate3d(${left}px, ${top}px, 0px);`;
    };

    if (!isOpen()) {
      hide();
      return;
    }

    /*
      Laid out HIDDEN first, then measured, then revealed. `getBoundingClientRect` on a
      `display: none` element is all zeroes, so the menu has to be in the layout before its own
      height can decide whether it opens upwards — and a member must not see it flash at 0,0 while
      that happens.
    */
    menu.style.cssText =
      'position: fixed; inset: 0px auto auto 0px; visibility: hidden; display: block;';

    const frame = window.requestAnimationFrame(place);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    const resizeObserver = new ResizeObserver(place);
    const trigger = triggerOf();
    if (trigger) resizeObserver.observe(trigger);
    resizeObserver.observe(menu);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      resizeObserver.disconnect();
      hide();
    };
  };
}
