<script lang="ts">
  interface Props {
    url: string;
    isPresenter: boolean;
    muted: boolean;
    onstop: () => void;
    onclose: () => void;
  }

  let { url, isPresenter, muted, onstop, onclose }: Props = $props();

  const videoUrl = $derived.by(() => {
    /* Verbatim from the bundle (byte 1503474 / 1977968 / 2295405): the escapes are redundant to
       a regex engine and kept because the capture is reproduced, not tidied. */
    // eslint-disable-next-line no-useless-escape
    const videoPattern = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const videoId = url.match(videoPattern)?.[2] ?? null;
    /* Verbatim from the bundle (byte 1503474 / 1977968 / 2295405): the escapes are redundant to
       a regex engine and kept because the capture is reproduced, not tidied. */
    // eslint-disable-next-line no-useless-escape
    const playlistId = url.match(/[?&]list=([^#\&\?]+)/)?.[1] ?? null;
    const mute = muted ? '&mute=1' : '';

    if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=1${mute}&`;
    if (playlistId) {
      return `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1${mute}&loop=1&rel=0`;
    }
    return '';
  });
</script>

<app-ytplayer>
  <div class="posted-video-container">
    {#if isPresenter}
      <button
        class="btn btn-primary btn-sm yt-btn"
        style="position: absolute; top: -32px; right: 30px;"
        onclick={onstop}
      >
        Stop For All
      </button>
    {/if}
    <button
      class="btn btn-danger btn-sm yt-btn"
      style="position: absolute; top: -32px; right: 0;"
      onclick={onclose}
    >
      ×
    </button>
    <iframe
      title="YouTube video for all"
      width="640"
      height="320"
      allow="autoplay; encrypted-media"
      frameborder="0"
      allowfullscreen
      class="e2e-iframe-trusted-src"
      src={videoUrl}
    ></iframe>
  </div>
</app-ytplayer>
