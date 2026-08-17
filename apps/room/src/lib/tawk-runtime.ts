import { tawkAttributes, tawkScript } from '#lib/tawk-support.js';

/*
  THE TAWK WIDGET'S RUNTIME HALF — script injection, the API handle, and the once-only latch.

  `tawk-support.ts` beside this file already owns the RULES: which script tag to build from a
  property id, and which attributes to send for a given viewer. Both are pure and both are tested.
  What stayed on `+page.svelte` was everything imperative — `document.createElement`,
  `getElementsByTagName`, `window.Tawk_API`, a 100ms poll and a boolean latch — and that is the half
  worth getting out of a page.

  ## Why a factory returning an object, and NOT a `room/*.svelte.ts` class

  Every other extraction in Phase 5 produced a rune class, so the departure is worth stating. The
  test the docs give is: *"Only use the `$state` rune for variables that should be reactive — in
  other words, variables that cause an `$effect`, `$derived` or template expression to update.
  Everything else can be a normal variable."*

  This has exactly one piece of state, `widgetOpen`, and NOTHING renders from it. It is a latch that
  says "attributes have been sent once", read only by the next `toggle()`. Making it `$state` would
  buy a proxy and a signal for a value no template ever reads.

  A module-level `let` would have been simpler still and is refused for the reason `svelte/context`
  gives about shared modules: state at module scope during SSR *"may be accessible by the next
  user"*. The latch is per-viewer, so it lives in a closure created per call instead.

  ## The poll is the capture's, not a workaround

  Upstream's `waitForTawkAPI()` polls every 100ms until `window.Tawk_API` exists and then hides the
  widget, because the API object is created BY the script rather than at load time. That is
  reproduced rather than replaced with the script's `load` event alone — the event fires when the
  file is fetched, which is not the same moment the global appears.

  ## Teardown is real, not decorative

  `load()` returns a disposer that both removes the injected `<script>` and cancels the poll. Without
  the cancel, a viewer who leaves the room inside the first few hundred milliseconds leaves a
  `setTimeout` chain running against a detached document forever.
*/

/** The slice of `window.Tawk_API` this room actually calls. */
export interface TawkApi {
  toggleVisibility?: () => void;
  hideWidget?: () => void;
  setAttributes?: (
    attributes: { name: string; email: string },
    onerror: (error: unknown) => void
  ) => void;
}

/** Who this viewer is, as `tawkAttributes` wants it. Read at TOGGLE time, never captured. */
export interface TawkViewer {
  savedNick: string | null;
  nick: string;
  name: string;
  savedEmail: string | null;
  email: string;
}

export interface TawkRuntime {
  /** Injects the script and hides the widget once the API appears. Returns a disposer. */
  load(): () => void;
  /** Flips visibility every time; sends attributes only on the first open. */
  toggle(): void;
}

/** How often upstream's `waitForTawkAPI()` re-checks for the global. */
const API_POLL_MS = 100;

/**
 * @param propertyId `PUBLIC_PTR_TAWK_PROPERTY_ID`. An empty or missing id makes `tawkScript` return
 *   null, and `load()` then does nothing and hands back a no-op disposer rather than throwing — a
 *   room without support configured is a normal room, not a broken one.
 * @param viewer A THUNK, not a value. Attributes are sent on the first open, which can be minutes
 *   after this factory ran, and the display name can change in between; capturing the object here
 *   would send whatever it was at page load.
 */
export function createTawkRuntime(
  propertyId: string | undefined,
  viewer: () => TawkViewer
): TawkRuntime {
  /* The once-only latch. Not `$state`: nothing renders from it — see the note at the top. */
  let widgetOpen = false;

  const api = (): TawkApi | undefined =>
    (globalThis as typeof globalThis & { Tawk_API?: TawkApi }).Tawk_API;

  return {
    load() {
      const script = tawkScript(propertyId);
      if (!script) return () => {};

      const element = document.createElement('script');
      element.async = script.async;
      element.src = script.src;
      element.charset = script.charset;
      element.setAttribute('crossorigin', script.crossorigin);
      // `i.parentNode.insertBefore(e, i)` where `i` is the first existing script.
      const first = document.getElementsByTagName('script')[0];
      first?.parentNode?.insertBefore(element, first);

      // `waitForTawkAPI()` — then `hideWidget()`, so it is invisible until the control is used.
      let cancelled = false;
      const waitForApi = () => {
        if (cancelled) return;
        const found = api();
        if (found?.hideWidget) found.hideWidget();
        else globalThis.setTimeout(waitForApi, API_POLL_MS);
      };
      waitForApi();

      return () => {
        cancelled = true;
        element.remove();
      };
    },

    toggle() {
      const found = api();
      if (!found?.toggleVisibility) return;
      found.toggleVisibility();
      if (widgetOpen) return;
      found.setAttributes?.(tawkAttributes(viewer()), (error) => {
        if (error) console.error('Error setting Tawk.to attributes:', error);
      });
      widgetOpen = true;
    }
  };
}
