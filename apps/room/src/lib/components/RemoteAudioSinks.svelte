<script lang="ts">
  import type { RoomMediaTransport } from '#lib/room/media-transport.svelte.js';

  /*
    ONE HIDDEN <audio> PER REMOTE MICROPHONE — the only part of the overlay layer that is never seen.

    ## Why it is its own component

    `RoomOverlays` is a LAYER: everything in it is positioned over the room, and a reader who opens
    it is looking for why something appeared on screen. These elements never appear. They carry
    `display: none` by design, they render no UI at all, and their entire purpose is to give a
    consumed audio track somewhere to live so it makes sound.

    That is a different concern from an overlay, and it left on 2026-08-20 when `RoomOverlays` came
    up against its size ceiling. The ceiling only ever goes down and the comments are not shortened
    to fit under it, so the answer to "this file is five lines too big" is an extraction — and the
    honest seam to cut was the one thing in a visual layer that is not visual.

    ## Why the whole facade rather than three props

    It reads exactly three members of `RoomMediaTransport`, so `remoteAudioStreams`,
    `audioProducerOwners` and `attachRemoteAudio` could each be a prop. They are not, for the reason
    `RoomOverlays` states about its own nineteen class props: passing the object keeps the reactivity
    the getters carry and keeps ONE name pointing at one owner. Three props would be three chances
    for a caller to pass a stale copy of something that belongs together.
  */
  let { mediaTransport }: { mediaTransport: RoomMediaTransport } = $props();
</script>

<!--
  A consumed audio track produces no sound until it is attached to an element, and the room has no
  visible control for a peer's voice - the capture keeps its own audio elements out of sight the same
  way (`#mp3player` is `display: none`).
-->
{#each [...mediaTransport.remoteAudioStreams.keys()] as producerId (producerId)}
  <!--
    `msRemAudio-{userID}` is the capture's own id and it is load-bearing, not decorative:
    `adjustVol` does `$("[id^=msRemAudio-]").prop("roomVolume.volume", …)` (bundle byte 2517022),
    `adjustVolPres` targets one peer's element, and `reconnectAudio` does
    `$("[id^='msRemAudio-']").remove()` before re-subscribing. This room already queries that exact
    prefix in `roomVolume.setMasterVolume`, against elements that had no id at all - so the master
    roomVolume.volume slider moved nothing.
  -->
  <audio
    id="msRemAudio-{mediaTransport.audioProducerOwners.get(producerId)?.userID ?? producerId}"
    {@attach mediaTransport.attachRemoteAudio(producerId)}
    autoplay
    style="display: none;"
  ></audio>
{/each}
