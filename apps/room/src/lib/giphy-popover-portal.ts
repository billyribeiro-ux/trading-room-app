/**
 * Put the GIF popover where ng-bootstrap puts it: a direct child of `<body>`.
 *
 * Const 65 of `app-privchat` (byte 2,214,572ff, decoded by bracket-walking the table) carries
 * `container: "body"`, and that is what ng-bootstrap's `container` option does — it lifts the
 * popover out of the trigger's subtree so an `overflow: hidden` ancestor cannot clip it. The private
 * panel has three of those between the composer and the document.
 *
 * ## What that costs, and it is the reason this file carries a paragraph
 *
 * Every captured rule for this popover is scoped to the HOST element it was extracted from —
 * `app-privchat .giphy-search`, `app-chat .giphy-search`, `app-note .giphy-search` and so on, at
 * `src/lib/styles/captured-runtime-components.css:6595` for this one. Once the node is appended to
 * `<body>` it is not a descendant of `app-privchat` any more, so **not one of those rules can
 * match**. What actually paints the picker is the unscoped copy in `src/app.css:551-610`.
 *
 * That is fine for the twelve rules whose value is the same on every host. It is not fine for the
 * one that is not: `app-privchat`'s `.giphy-search` is `height: 400px` (byte 2,224,360) where the
 * other four hosts say `700px`. The unscoped rule carries the majority value, so the private
 * chat's picker was three hundred pixels taller than the capture. `GiphyPicker` therefore takes its
 * own height as a prop and sets it inline, which outranks the class rule wherever the node lands.
 */
export function giphyPopoverPortal(node: HTMLElement) {
  const place = () => {
    const trigger = document.querySelector<HTMLElement>(`[aria-describedby="${node.id}"]`);
    if (!trigger) return;

    const triggerRect = trigger.getBoundingClientRect();
    const devicePixelRatio = window.devicePixelRatio || 1;
    const roundToDevicePixel = (value: number) =>
      Math.round(value * devicePixelRatio) / devicePixelRatio;
    const x = roundToDevicePixel(
      Math.max(0, Math.min(window.innerWidth - 400, triggerRect.left + triggerRect.width / 2 - 200))
    );
    const y = roundToDevicePixel(triggerRect.top - 8 - document.documentElement.clientHeight);
    node.style.transform = `translate3d(${x}px, ${y}px, 0px)`;
  };

  document.body.append(node);
  place();
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, true);

  const resizeObserver = new ResizeObserver(place);
  const trigger = document.querySelector<HTMLElement>(`[aria-describedby="${node.id}"]`);
  if (trigger) resizeObserver.observe(trigger);

  return () => {
    resizeObserver.disconnect();
    window.removeEventListener('resize', place);
    window.removeEventListener('scroll', place, true);
    node.remove();
  };
}
