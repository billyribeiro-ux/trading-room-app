<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { mtxPlaylistUrl, type MtxStream } from '#lib/mtx-streams.js';
  import './player.css';

  let { data } = $props();
  let selected = $state<MtxStream | null>(untrack(() => data.streams[0] ?? null));
  let video = $state<HTMLVideoElement | null>(null);
  let hls: import('hls.js').default | null = null;
  const source = $derived(
    selected ? mtxPlaylistUrl(selected, data.streamServerMTX, data.mtxToken) : ''
  );

  async function attach(nextSource: string) {
    hls?.destroy();
    hls = null;
    const target = video;
    if (!target || !nextSource) return;
    if (target.canPlayType('application/vnd.apple.mpegurl')) {
      target.src = nextSource;
      return;
    }
    const Hls = (await import('hls.js')).default;
    if (!Hls.isSupported() || video !== target || source !== nextSource) return;
    const player = new Hls({ lowLatencyMode: true });
    hls = player;
    player.loadSource(nextSource);
    player.attachMedia(target);
  }

  $effect(() => {
    void attach(source);
  });
  onDestroy(() => hls?.destroy());
</script>

<svelte:head>
  <title>Live stream · Room {data.room}</title>
  <meta name="robots" content="noindex,nofollow" />
</svelte:head>

<main>
  <header>
    <div><strong>Live room {data.room}</strong><span>Screenshare-only public player</span></div>
    <time datetime={new Date(data.expiresAt).toISOString()}>
      Link expires {new Date(data.expiresAt).toLocaleString()}
    </time>
  </header>
  {#if data.streams.length === 0}
    <section class="empty" aria-live="polite">
      <h1>No live stream</h1>
      <p>
        A presenter has not started an external stream yet. Refresh this page when they go live.
      </p>
    </section>
  {:else}
    <nav aria-label="Live streams">
      {#each data.streams as stream (stream._id)}
        <button class:active={selected?._id === stream._id} onclick={() => (selected = stream)}>
          {stream.mediaValue.name}
        </button>
      {/each}
    </nav>
    <video bind:this={video} controls autoplay playsinline></video>
  {/if}
</main>
