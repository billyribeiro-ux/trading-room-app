<script lang="ts">
  /**
   * The Canvas host for the hero's WebGL field. This component is only ever loaded dynamically —
   * HeroCinematic imports it after probing for WebGL support in the browser — so three.js stays
   * out of the critical path and out of the server bundle entirely.
   */
  import { Canvas } from '@threlte/core';
  import { ACESFilmicToneMapping } from 'three';
  import CandleField from './CandleField.svelte';

  interface Props {
    /** Pauses the frame loop when the hero is offscreen. */
    active?: boolean;
  }

  let { active = true }: Props = $props();
</script>

<div class="scene" aria-hidden="true">
  <Canvas dpr={[1, 1.75]} toneMapping={ACESFilmicToneMapping}>
    <CandleField {active} />
  </Canvas>
</div>

<style>
  .scene {
    position: absolute;
    inset: 0;
    animation: scene-in 1.8s ease-out both;
  }

  .scene :global(canvas) {
    display: block;
  }

  @keyframes scene-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
