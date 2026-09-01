<script lang="ts">
  interface Props {
    url: string;
    /**
     * `playYTURL(e, i = 0)`'s second argument — how many SECONDS into the video the room already is.
     *
     * Zero for a live play, which is every play a member is present for: the live `playYTForAll`
     * command carries `url` alone (byte 1,024,137) and its subscriber sets `startTime = 0`. It is
     * non-zero only on the LATE-JOIN REPLAY, where `emit("playYTForAll", {url: roomState.ytURL,
     * startTime: roomState.ytStartTime})` hands over the start MOMENT and the subscriber derives
     * the elapsed seconds: `Math.round((Date.now() - startTime) / 1e3)`, byte 1,964,799.
     *
     * Defaulted for the same reason upstream defaults it — `playYTURL(e, i = 0)` — so a caller that
     * has no offset to give does not have to invent one.
     */
    startSeconds?: number;
    isPresenter: boolean;
    muted: boolean;
    onstop: () => void;
    onclose: () => void;
  }

  let { url, startSeconds = 0, isPresenter, muted, onstop, onclose }: Props = $props();

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

    /*
      `(i ? `start=${i}` : "")` — byte 1,503,354, appended to the trailing `&` this line already
      carries and which had no other purpose.

      Two details are the capture's rather than choices, and both are easy to normalise away:

      * it goes on the VIDEO-ID form only. The playlist branch below has no `start=` upstream and
        does not get one here — a playlist seek would be a seek into whichever item happens to be
        first, which is not a position anybody asked for;
      * `i ? … : ""` and not `start=0`. A zero offset is every live play, and appending `start=0` to
        all of them would change the request every member makes for the sake of a branch that only
        matters on a late join.
    */
    const start = startSeconds > 0 ? `start=${startSeconds}` : '';
    if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=1${mute}&${start}`;
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
