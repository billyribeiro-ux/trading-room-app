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

    ## `NAV-08` — `breathing-rec` was OURS on this badge, and it is GONE

    The reference has no class map on const 93 at all. `UPe` (byte 2,474,097) renders
    `li` const 93 `[1,"nav-item","recIndicator","animated","fadeIn"]` and binds exactly one thing on
    it, `ngbTooltip`. Meanwhile `iPe = (t, n) => ({ 'breathing-rec': t, recIndicatorStart: n })`
    (byte 2,465,900) is bound ONCE in 2,891,205 bytes, at byte 2,477,678, onto the
    `<i class="far fa-2x fa-dot-circle">` inside the PRESENTER's Start/Stop Recording dropdown —
    element index 2 of `t4e`, not this badge and not its container.

    **So the pulse is a presenter's cue on their own recording button, and this bar was showing it to
    every member in the room.** `.breathing-rec` is a 5s scale pulse plus `color: red !important`
    (`captured-runtime-components.css:4281`), so the divergence was visible on every screen rather
    than theoretical.

    `NAV-04` built the real placement in `RoomNavbar.svelte`, where the reference has it. This copy
    stayed only because two contract tests pinned the class to `.recIndicator` and neither file
    belonged to that batch. Both are re-pointed now and the class is removed here, which leaves the
    badge exactly what `UPe` renders: a tooltip and the words.
  */
  import type { RoomMedia } from '#lib/room/media.svelte.js';

  /*
    `blinkingRec` LEFT this component with `NAV-08` on 2026-08-31, and the removal is the point.

    Its only reader was the `breathing-rec` class above, which the reference does not put here. A
    prop kept "in case" is a prop the next reader gates something on — and this one names an owner
    setting, so gating on it would look correct while showing every member a cue the reference shows
    only to the presenter who owns the recording. `RoomNavbar.svelte` still takes it, because that is
    where `NAV-04` built the real placement.
  */
  let {
    media,
    /** Already resolved by `RoomGates`: a member may not be shown the recording file name. */
    recordingTooltip
  }: { media: RoomMedia; recordingTooltip: string } = $props();
</script>

{#if media.roomRecordingPaused && media.roomRecording}
  <li class="nav-item recIndicator animated flash">
    <!-- svelte-ignore a11y_missing_attribute -->
    <a>[ REC PAUSED]</a>
  </li>
{:else if media.roomRecording}
  <li class="nav-item recIndicator animated fadeIn">
    <!-- svelte-ignore a11y_missing_attribute -->
    <a title={recordingTooltip}>[ REC ]</a>
  </li>
{:else if media.roomRecordingStarting}
  <li class="nav-item recIndicatorStart">
    <!-- svelte-ignore a11y_missing_attribute -->
    <a class="nav-link"><i class="fas fa-spinner fa-spin"></i> REC </a>
  </li>
{/if}
