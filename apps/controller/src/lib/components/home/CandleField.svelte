<script lang="ts">
  /**
   * The hero's WebGL scene: a breathing field of 2,700 instanced candlesticks — a market skyline
   * rolling waves toward the viewer — under a drift of particle dust, with the camera easing on a
   * slow orbit plus pointer parallax.
   *
   * Rendering choices are deliberate:
   * - One InstancedMesh, one draw call. Heights animate by rewriting instance matrices; colors are
   *   set once. This is the cheapest possible way to put thousands of moving lights on screen.
   * - MeshBasicMaterial + exponential fog, no lights. The instance colors ARE the light; fog gives
   *   depth falloff for free. No postprocessing pipeline to maintain or to fail on weak GPUs.
   * - The whole component only ever runs client-side: HeroScene is imported dynamically after a
   *   successful WebGL probe, and the task loop pauses whenever the hero leaves the viewport.
   */
  import { T, useTask, useThrelte } from '@threlte/core';
  import { onDestroy } from 'svelte';
  import {
    AdditiveBlending,
    BoxGeometry,
    BufferAttribute,
    BufferGeometry,
    Color,
    FogExp2,
    InstancedMesh,
    MeshBasicMaterial,
    Object3D,
    PerspectiveCamera,
    Points,
    PointsMaterial
  } from 'three';

  interface Props {
    /** Pauses the frame loop when the hero is offscreen. */
    active?: boolean;
  }

  let { active = true }: Props = $props();

  const COLS = 90;
  const ROWS = 30;
  const COUNT = COLS * ROWS;
  const SPACING = 0.62;

  const { scene } = useThrelte();
  scene.fog = new FogExp2(0x04050a, 0.04);

  /* Deterministic personality per column — same field on every load. */
  let randomState = 0x9e3779b9;
  function random(): number {
    randomState = (randomState + 0x6d2b79f5) >>> 0;
    let t = randomState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const geometry = new BoxGeometry(0.16, 1, 0.16);
  geometry.translate(0, 0.5, 0);
  const material = new MeshBasicMaterial();
  const field = new InstancedMesh(geometry, material, COUNT);

  const up = new Color('#14b877');
  const down = new Color('#e0374d');
  const scratch = new Color();
  const amplitude = new Float32Array(COUNT);
  const phase = new Float32Array(COUNT);

  const proxy = new Object3D();
  for (let iz = 0; iz < ROWS; iz += 1) {
    for (let ix = 0; ix < COLS; ix += 1) {
      const i = iz * COLS + ix;
      const centered = Math.abs(ix - COLS / 2) / (COLS / 2);
      amplitude[i] = 0.6 + random() * 2.6 * (1 - centered * 0.55);
      phase[i] = random() * Math.PI * 2;
      const rising = random() < 0.58;
      scratch.copy(rising ? up : down).multiplyScalar(0.45 + random() * 0.95);
      field.setColorAt(i, scratch);
    }
  }
  if (field.instanceColor) field.instanceColor.needsUpdate = true;

  /* Particle dust — slow embers of data rising through the field. */
  const DUST = 500;
  const dustPositions = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i += 1) {
    dustPositions[i * 3] = (random() - 0.5) * COLS * SPACING;
    dustPositions[i * 3 + 1] = random() * 12;
    dustPositions[i * 3 + 2] = (random() - 0.5) * ROWS * SPACING * 2;
  }
  const dustGeometry = new BufferGeometry();
  dustGeometry.setAttribute('position', new BufferAttribute(dustPositions, 3));
  const dustMaterial = new PointsMaterial({
    color: new Color('#6f8fce'),
    size: 0.055,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    blending: AdditiveBlending
  });
  const dust = new Points(dustGeometry, dustMaterial);

  let camera = $state<PerspectiveCamera>();
  let pointerX = 0;
  let pointerY = 0;
  let time = 0;

  useTask(
    (delta) => {
      time += Math.min(delta, 0.05);
      for (let iz = 0; iz < ROWS; iz += 1) {
        for (let ix = 0; ix < COLS; ix += 1) {
          const i = iz * COLS + ix;
          const x = (ix - COLS / 2) * SPACING;
          const z = (iz - ROWS / 2) * SPACING * 1.7;
          const wave =
            Math.sin(x * 0.32 + time * 0.9 + phase[i]) * 0.6 + Math.cos(z * 0.42 - time * 0.55) * 0.4;
          const height = 0.25 + amplitude[i] * Math.pow(wave * 0.5 + 0.5, 1.6) * 2.4;
          proxy.position.set(x, 0, z);
          proxy.scale.set(1, height, 1);
          proxy.updateMatrix();
          field.setMatrixAt(i, proxy.matrix);
        }
      }
      field.instanceMatrix.needsUpdate = true;

      dust.rotation.y += delta * 0.012;
      dust.position.y = Math.sin(time * 0.2) * 0.4;

      if (camera) {
        camera.position.x += (Math.sin(time * 0.05) * 1.3 + pointerX * 1.4 - camera.position.x) * 0.04;
        camera.position.y += (7.2 + pointerY * 0.9 - camera.position.y) * 0.04;
        camera.lookAt(0, 1.4, 0);
      }
    },
    { running: () => active }
  );

  function onPointerMove(event: MouseEvent) {
    pointerX = (event.clientX / window.innerWidth) * 2 - 1;
    pointerY = (event.clientY / window.innerHeight) * 2 - 1;
  }

  onDestroy(() => {
    geometry.dispose();
    material.dispose();
    dustGeometry.dispose();
    dustMaterial.dispose();
  });
</script>

<svelte:window onmousemove={onPointerMove} />

<T.PerspectiveCamera makeDefault bind:ref={camera} position={[0, 7.2, 23]} fov={38} />
<T is={field} position={[0, -1.2, 0]} />
<T is={dust} />
