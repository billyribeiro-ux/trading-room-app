<script lang="ts">
  /*
    The room's recording badge — the three `li`s slots 18, 19 and 20 of the navbar template.

    ## It reports state, so it is not in the presenter block

    Extracted out of `RoomNavbar.svelte` on 2026-08-31 to make room for `NAV-04`, and it is a seam
    rather than a slice: nothing here changes anything. The three arms read `RoomMedia` and render
    one `li`; every control the bar carries lives on the other side of that line.

    ## The three arms, decoded from the consts array by value

    Walking `consts:[[` at bundle byte 2,533,197 rather than looking a slot number up:

    ```
    92 [1,"nav-item","recIndicator","animated","flash"]
    93 [1,"nav-item","recIndicator","animated","fadeIn"]
    94 [1,"nav-item","recIndicatorStart"]
    ```

    and their gates, from `U4e`'s update block at byte 2,488,148:

    ```js
    O(18, roomState.isRecordingPaused && roomState.isRecording ? 18 : -1)                 // 92
    O(19, !roomState.isRecording || roomState.isRecordingPaused || isRecordingStarting
            ? -1 : 19)                                                                   // 93
    O(20, isRecordingStarting ? 20 : -1)                                                  // 94
    ```

    Driven by `media.roomRecording`, which the server pushes. It used to be gated on
    `media.recording` — this browser's own `MediaRecorder` — so the badge only ever appeared for the
    presenter doing the recording, and every member saw nothing.

    ## `[ REC ]` and the starting spinner are MUTUALLY EXCLUSIVE upstream, and here they are ordered

    Slot 19 carries `|| isRecordingStarting` as a third term of its own refusal; slot 20 carries
    `isRecordingStarting` as its whole gate. This room writes the same thing as an else-if
    chain, which cannot render two of the three, but the ORDER then decides the overlap: ours puts
    `[ REC ]` first, so a room that is both recording and starting shows the badge where the
    reference shows the spinner. `media.roomRecordingStarting` is cleared by the same event that
    sets `media.roomRecording` (`room/media.svelte.ts`), so the overlap is not reachable today —
    recorded because an else-if chain hides which arm won, and the next person to add a fourth
    state needs to know that the reference decided this with an explicit term rather than an order.

    ## The tooltip is the one member-aware part, and only to hide the file name

    ```js
    xn("ngbTooltip", dontShowRecInfoToUsers && !isPresenter || !roomState.recName
                       ? "" : "Recording to: " + decodedRecName())        // UPe, byte 2,474,097
    ```

    Resolved by `RoomGates.recordingTooltip` and handed in whole. This component must never acquire
    its own opinion about it — the gate was reading a viewer preference nothing wrote until
    2026-08-28, and every member in every room saw a name the owner had hidden.

    ## `breathing-rec` on `[ REC ]` is OURS, and it is recorded rather than absorbed

    The reference has no class map on const 93 at all. `iPe = (t, n) => ({ 'breathing-rec': t,
    recIndicatorStart: n })` (byte 2,465,900) is bound ONCE, at byte 2,477,678, and the element it
    lands on is the `<i class="far fa-2x fa-dot-circle">` inside the PRESENTER's recording dropdown —
    element index 2 of `t4e`, not this badge and not its container. That placement is built where the
    reference has it, in `RoomNavbar.svelte`; this copy stays because
    `room-navbar-contract.test.ts` pins `breathing-rec` to `.recIndicator`, and that file is not this
    batch's to edit. `NAV-08` in `docs/decoded/room-surface-audit-2026-08-30.md` names the one line.
  */
  import type { RoomMedia } from '#lib/room/media.svelte.js';

  let {
    media,
    /** `sessData.recordingReminder`'s neighbour — "Blinking REC?", the owner's switch. */
    blinkingRec,
    /** Already resolved by `RoomGates`: a member may not be shown the recording file name. */
    recordingTooltip
  }: { media: RoomMedia; blinkingRec: boolean; recordingTooltip: string } = $props();
</script>

{#if media.roomRecordingPaused && media.roomRecording}
  <li class="nav-item recIndicator animated flash">
    <!-- svelte-ignore a11y_missing_attribute -->
    <a>[ REC PAUSED]</a>
  </li>
{:else if media.roomRecording}
  <li class={['nav-item recIndicator animated fadeIn', { 'breathing-rec': blinkingRec }]}>
    <!-- svelte-ignore a11y_missing_attribute -->
    <a title={recordingTooltip}>[ REC ]</a>
  </li>
{:else if media.roomRecordingStarting}
  <li class="nav-item recIndicatorStart">
    <!-- svelte-ignore a11y_missing_attribute -->
    <a class="nav-link"><i class="fas fa-spinner fa-spin"></i> REC </a>
  </li>
{/if}
