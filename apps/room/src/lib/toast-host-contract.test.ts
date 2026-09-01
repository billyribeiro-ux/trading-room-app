import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { svelteCodeOf } from '#lib/source-comments.js';

/**
 * THE TOAST, AS NGX-TOASTR DRAWS AND ANIMATES IT.
 *
 * ## Why this file and not `sound-effects-contract.test.ts`
 *
 * That file already holds two assertions about this component, and it is EVIDENCE-BOUND: it reads
 * `css/complete-app-styles.css`, a capture root that is gitignored, so `gate/evidence-bound-tests.mjs`
 * drops it from any checkout without the captures — this one included. An assertion nobody can run
 * locally is an assertion that goes stale between CI runs, and these three are about a component,
 * not about a capture, so they belong somewhere that always runs.
 *
 * ## The component, decoded at bundle byte 883,657
 *
 * ngx-toastr's toast is built imperatively, so there is no selector to point `gate/audit-surface.mjs`
 * at. Its host bindings, its five conditional children and its default config are all in one place:
 *
 * ```js
 * hostBindings: … x("click", tapToast)("mouseenter", stickAround)("mouseleave", delayedHideToast),
 *                 uy("@flyInOut", o.state), So(o.toastClasses), Lo("display", o.displayStyle)
 * consts: [ …closeButton…, [3,"class",4,"ngIf"], ["role","alert",3,"class","innerHTML",4,"ngIf"],
 *           ["role","alert",3,"class",4,"ngIf"], …[1,"toast-progress"] ]
 * data: { animation: [ mJ("flyInOut", [ WF("inactive", mp({opacity:0})),
 *                                       WF("active",   mp({opacity:1})),
 *                                       WF("removed",  mp({opacity:0})),
 *                                       X4("inactive => active", Q4("{{easeTime}}ms {{easing}}")),
 *                                       X4("active => removed", Q4("{{easeTime}}ms {{easing}}")) ])]}
 * ```
 *
 * with the defaults immediately above it: `closeButton:!1`, `progressBar:!1`, `enableHtml:!1`,
 * `timeOut:5e3`, `extendedTimeOut:1e3`, `easeTime:300`, `easing:"ease-in"`, `tapToDismiss:!0`,
 * `toastClass:"ngx-toastr"`, `positionClass:"toast-top-right"`, `titleClass:"toast-title"`,
 * `messageClass:"toast-message"`.
 *
 * **`@flyInOut` is named for a slide and defines none.** Three opacity states and two transitions:
 * that is the whole animation. Until 2026-09-01 this room's toasts flew in from 300px to the right,
 * which was invented and was the one thing on this surface a viewer would notice.
 */
const source = svelteCodeOf(readFileSync('src/lib/components/ToastHost.svelte', 'utf8'));

describe('the toast host is ngx-toastr, transcribed', () => {
  it('reads the component it says it reads', () => {
    expect(source.length).toBeGreaterThan(800);
    expect(source).toContain('{#each toasts as toast (toast.id)}');
  });

  it('builds both containers the way the service builds them', () => {
    /*
      Imperative upstream, so there is no template to diff — byte 878,628 for the outer
      (`classList.add("overlay-container")`, `setAttribute("aria-live","polite")`) and 879,514 for
      the inner (`o.id = "toast-container"`, then the position class, then `"toast-container"`).
    */
    expect(source).toContain('<div class="overlay-container" aria-live="polite">');
    expect(source).toContain('id="toast-container" class="toast-top-right toast-container"');
  });

  it('animates opacity only, 300ms, in BOTH directions', () => {
    /*
      Both are asserted because `active => removed` carries the same transition as
      `inactive => active`: a fix that corrected only the entrance would leave the pair mismatched
      and still look right on screen for the three hundred milliseconds anybody watches.
    */
    expect(source).toContain('in:fade={{ duration: 300, easing: cubicIn }}');
    expect(source).toContain('out:fade={{ duration: 300, easing: cubicIn }}');
    expect(source, 'no slide, in either direction').not.toContain('fly');
  });

  it('composes the two classes in the capture s own order', () => {
    /* `toastClasses = `${i.toastType} ${i.config.toastClass}`` — the type first. */
    expect(source).toContain('class={`toast-${toast.kind} ngx-toastr`}');
  });

  it('draws no close button and no progress bar, because both default OFF', () => {
    /*
      `closeButton:!1` and `progressBar:!1` in the default config, and this room passes no overrides
      — `alertService.warning(txt, o)` sets only `enableHtml`. Two controls that would be drawn for
      nobody, which is the shape this repository refuses by name.
    */
    expect(source).not.toContain('toast-close-button');
    expect(source).not.toContain('toast-progress');
  });

  it('reaches the dismiss from a keyboard, which upstream does not', () => {
    /*
      OURS. `tapToDismiss:!0` binds a host `click` on a plain element. The same divergence this room
      records at every captured click-on-a-div, and the reason the roles are here at all.
    */
    expect(source).toContain('role="button"');
    expect(source).toContain('onkeydown=');
    expect(source).toContain('onmouseenter=');
    expect(source).toContain('onmouseleave=');
  });
});
