<script lang="ts">
  /*
    See the block below: this component is the DOCUMENT for a decision, which is why a static card
    with no props is a component at all. `source-size-contract` refused `ModalHost.svelte` the forty
    lines that decision cost, and the answer that rule gives is extract rather than raise.
  */
</script>

<!--
  ── `app-rec-preview` — TRANSCRIBED, UNREACHABLE, AND BOTH FACTS ARE DELIBERATE ─────────────────

  Measured on 2026-09-01 by `gate/audit-surface.mjs`, which is what turned a quiet piece of markup
  into a decision. What it found:

    * `.recsHolderScreen` carries `display: none` — the reference's OWN rule (byte 2,353,745, and in
      `css/complete-app-styles.css`) — and nothing in this room ever removes it. One markup site, no
      gate, no class toggle. `grep` for `recLocalPreviewHolder` across `src/` returns this line and a
      docblock in `panel-drag.test.ts` quoting the CAPTURE's drag config, not a wiring here.
    * The two icons have no handlers. Upstream both are `x("click", …)` — `closePreview()` and
      `expandPreview()` — and the expand icon swaps to `fa-compress-arrows-alt` under
      `O(8, expandRecPreview ? 8 : 9)`.
    * "Recording paused." is the `-1` arm of `O(10, isRecording && !isRecordingPaused ? 10 : 11)`;
      the other arm is an `<img id="recScreenLocalPreview" class="recPreviewScreen">`.

  ## Why it stays, having been deleted once and restored

  It was removed, and `captured-css-ancestor-contract` failed: `app-rec-preview` is a scoped host in
  the generated stylesheet, so with no element its rules match nothing and ship dead. That gate is
  right, and it is the answer to "delete unreachable markup" here — the CSS is GENERATED from the
  capture and cannot be trimmed by hand, so the host is what keeps its rules attached to something.

  ## Why the two inert icons are not the inert-control defect

  `user-action-disposition-contract` exists because a control that reports success and does nothing
  lies to the person pressing it. **Nobody can press these.** The card is `display: none` with no
  writer, so the icons are inert the way a comment is inert.

  What makes that safe rather than merely true today is the gate: `rec-preview-contract.test.ts`
  fails if the card ever becomes reachable — a gate on it, or the `display: none` going — while the
  handlers are still missing. The day this can be seen is the day it has to work.

  ## And the reason there is no `<img>` here

  This room's preview is a separate WINDOW, argued in `room/recording.ts`: upstream points its card
  at a server-supplied `recPreviewLocation`, there is no such URL here, and `showRecPreview()` opens
  a window showing the local recording instead. `recScreenLocalPreview` and `recPreviewScreen` are
  recorded residuals for exactly that reason.
-->
<app-rec-preview>
  <div id="recLocalPreviewHolder" class="card recsHolderScreen">
    <div class="card-body">
      <h5 class="card-title m-0">
        <div class="d-inline-block p-2 text-white">Recording Preview. (DELAYED UPTO 20s)</div>
        <span class="float-right p-2"><i class="fas fa-times text-white"></i></span>
        <span class="float-right p-2 mx-1"><i class="fas fa-expand text-white"></i></span>
      </h5>
      <div class="text-center py-4 text-white"><h4>Recording paused.</h4></div>
    </div>
  </div>
</app-rec-preview>
