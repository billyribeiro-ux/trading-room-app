<script lang="ts">
  /**
   * `SP2-03` — what a screen pane SAYS when it is not showing a picture.
   *
   * The three headings the reference renders ahead of its pan container, extracted from
   * `ScreenPane.svelte` so they stay one thing. They are one thing upstream too: the create block
   * of `app-screenshare-view` is a flat list of sub-templates under the component's own root
   * (`d(0,"div",0)`, const 0 `[1,"h-inherit"]`) and each of them is a gate over an `<h3>`:
   *
   * ```js
   * d(0,"div",0),H(1,z0e,2,0,"h3",1)(2,G0e,2,0,"h3",1)(3,W0e,2,1,"p",2)(4,q0e,3,2,"h3",3)
   *   (5,Y0e,6,4,"div",4),d(6,"div",5)(7,"pan-zoom",6)(8,"div",7)(9,"video",8)  // byte 1,501,256
   * ```
   *
   * **Nodes 1-5 are closed before `d(6,…)` opens the pan container**, so none of them is inside the
   * transform the pan/zoom library writes. They were inside `div.pan-element` here — the element
   * that carries `translate(...) scale(...)` — so with the shared zoom on, `Connecting To Screen
   * of …`, `Video Disabled` and the re-attach heading were scaled and dragged along with a picture
   * that was not being drawn. Zoom is GLOBAL in this application (`src/lib/screen-zoom.ts`
   * transcribes why: the capture broadcasts it by value to every view), so a reader zoomed into one
   * screen saw every other screen's status line at that zoom.
   *
   * Node 3 — `W0e`, the local-preview invitation — is deliberately absent; `SP2-04` in
   * `docs/decoded/room-surface-audit-2026-08-30.md` records the measurement that it cannot be
   * reached in this application.
   */
  type Props = {
    /** `o.isDetached` — THIS window has popped this screen out into its own window. */
    detachedHere: boolean;
    /** `o.mediaService.saveData` — the AV settings modal's Disable Video switch. */
    saveData: boolean;
    /** `!o.isConnected && !o.isPresentingThisScreen && !o.isDetached`, decided by the pane. */
    connecting: boolean;
    presenterName: string;
    screenName: string;
    /** `reAttachScren()` — the click on the blanked pane. */
    onreattach?: () => void;
  };

  let { detachedHere, saveData, connecting, presenterName, screenName, onreattach }: Props =
    $props();
</script>

{#if detachedHere}
  <!--
    `SV-SP-02` — `z0e` at byte 1,492,716, const 10 `[1,"mt-4","text-center",3,"click"]`, gated
    `O(1, o.isDetached ? 1 : -1)` at byte 1,501,523.

    The pane the screen was detached FROM blanks and offers the way back. Before this the source
    window kept rendering the same producer, so one share fed two live decoders and the only way
    to re-attach was to find and close the popout.

    ONE DIVERGENCE, and it is the accessible one. Upstream hangs the click on the `<h3>` itself,
    which is not focusable, not keyboard operable, and announced to a screen reader as a heading
    rather than as the control it is. Putting a real `<button>` inside the captured heading keeps
    the class, the text and the position exactly where the capture has them and makes the control
    an actual control — `role="button"` plus a `tabindex` on the heading was tried first and is
    what `a11y_no_noninteractive_element_to_interactive_role` refuses, with reason: it would have
    SAID button and still been a heading.

    The scoped rule below strips the button chrome, so nothing about the rendering changes.
  -->
  <h3 class="mt-4 text-center">
    <button type="button" class="reattach" onclick={() => onreattach?.()}>
      Screen Detached.. Click here to re-attach
    </button>
  </h3>
{/if}
<!--
  `Video Disabled` — `G0e` at byte 1,492,881, rendered by
  `O(2, o.mediaService.saveData ? 2 : -1)` at byte 1,501,550. Class order is `mt-4 text-center`,
  which is const 1 of that component and is NOT the order the presentation area uses for its own
  h3 (const 23 there is `text-center mt-4`). Reproduced as captured.
-->
{#if saveData}
  <h3 class="mt-4 text-center">Video Disabled</h3>
{/if}
<!--
  `SV-SP-03` — `q0e` at byte 1,493,190: const 3 is
  `[1,"text-center","mt-4","animated","fadeIn",2,"color","#fff"]` and const 12 the
  `fas fa-spinner fa-pulse` glyph.

  An un-arrived screen used to render NOTHING — the `<video>` is hidden while `stream` is null,
  and nothing stood in its place, so a viewer clicking a tab saw an empty box with no way to tell
  whether it was loading or broken. `StreamingView` has had its counterpart (`Loading Stream...`)
  all along; this pane did not.

  The hyphen between the two names is the capture's own separator, not a choice.
-->
{#if connecting}
  <h3 class="text-center mt-4 animated fadeIn" style="color: #fff;">
    <i class="fas fa-spinner fa-pulse"></i>
    Connecting To Screen of {presenterName}-{screenName}
  </h3>
{/if}

<style>
  /*
    `SV-SP-02`'s re-attach control. The capture's own element is the `<h3>` and its own styling is
    the two Bootstrap classes on it; this button exists only so the control is focusable and
    announced correctly, so it inherits everything and adds nothing.
  */
  .reattach {
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
</style>
