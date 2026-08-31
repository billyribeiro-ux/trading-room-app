<script lang="ts">
  /**
   * `app-streaming-view` — the HLS player for one MediaMTX stream.
   *
   * Transcribed from `app-streaming-view.full.js` of the v2 decode workspace, NOT in this
   * checkout — every `lines N-M` below points into it. Class `xCe` is v4 bytes 1,901,122-1,914,468:
   * 27 decls, 18 consts, 5 sub-templates at 1,901,148; `STV-01` of the room audit maps them all.
   *
   * ## Why this is HLS and not WebRTC
   *
   * `setupStream()` builds `…/index.m3u8?jwt=…` and hands it to hls.js. There is no WebRTC here and
   * no WHEP — an earlier draft of `OBS-XSPLIT-INGEST.md` guessed WHEP and was wrong. The ingest side
   * is WHIP/RTMP on 8889/1935; the playback side is HLS over 443. Two different protocols at the two
   * ends of the same MediaMTX path, which is exactly why the reference keeps two URL builders.
   *
   * ## Three rules that are easy to lose and cost a stream when lost
   *
   *  - `MEDIA_ATTACHED` is what triggers `loadSource`, not the other way round. Loading the source
   *    before the media is attached silently never plays.
   *  - A fatal error BEFORE playback has started destroys and retries after 2s. A fatal error AFTER
   *    playback has started ALSO degrades the buffer profile first. `hasStartedPlaying` is what
   *    separates them, and conflating the two turns one bad segment into a permanent downgrade.
   *  - Volume is read from the viewer's own preferences at attach time, not defaulted to 1.
   */
  import type { RoomMenus } from '#lib/room/menus.svelte.js';
  import { onDestroy } from 'svelte';
  import type Hls from 'hls.js';
  import { mtxPlaylistUrl, type MtxStream } from '#lib/mtx-streams.js';
  import { streamBufferLevel, streamBufferName } from '#lib/room/stream-buffer.js';

  interface Props {
    /** The stream to play. `muser` upstream — the same payload key every media command uses. */
    muser: MtxStream;
    streamServerMTX: string;
    /** `globals.mtxToken`. The viewer's read credential, spent as `?jwt=` on the playlist. */
    mtxToken: string;
    /**
     * The anti-leak watermark's text, or `null` for none — `#lib/user-id-watermark.ts`.
     *
     * ONE prop where there were two (`overlayUserIdOnScreenshare` and `userXrefID`), and the reason
     * is the defect that arrived with the second consumer. `ScreenPane` renders the other video this
     * setting is supposed to cover and had neither prop nor gate, so a room with the setting on was
     * watermarking a restreamed feed and not the screenshare the setting is named for. A gate spelled
     * out at each call site is a gate one of them will stop having; the answer arrives already
     * decided now, which is the same rule every other authority value in this component follows.
     */
    userIdWatermark: string | null;
    /** `globals.audioVolume`, 0-1. */
    audioVolume: number;
    /** `preferences.doNotDisturbOn` — mutes on attach without changing the stored volume. */
    doNotDisturbOn: boolean;
    /**
     * `preferences.bufferSizeLevel`: 1 Normal, 2 Increased, 3 Maximum. Upstream defaults to 3.
     *
     * PASSED SINCE 2026-08-28. Before that neither this nor `onBufferSizeChange` was supplied by any
     * call site, so the dropdown below read Maximum forever and clicking an entry called
     * `undefined?.()` — a live control whose only possible effect was nothing at all.
     */
    bufferSizeLevel?: number;
    /** `appService.setPreference('bufferSizeLevel', e)` — persists AND reloads the stream. */
    onBufferSizeChange?: (level: number) => void;
    /**
     * The room's dropdown state, for the buffer-size menu.
     *
     * PASSED SINCE 2026-08-29, finishing the repair the note above started: that one fixed the
     * three entries, which were calling `undefined?.()`, and could not see that the menu holding
     * them never opened. Two layers of one control, each dead for a different reason.
     */
    menus: RoomMenus;
  }

  let {
    muser,
    streamServerMTX,
    mtxToken,
    userIdWatermark,
    audioVolume,
    doNotDisturbOn,
    bufferSizeLevel = 3,
    onBufferSizeChange,
    menus
  }: Props = $props();

  /* The four tuning constants, verbatim from the constructor (lines 21-24). */
  const BUFFER_CHECK_WINDOW = 30_000;
  const BUFFER_THRESHOLD = 6;
  const MAX_RECOVERY_ATTEMPTS = 2;
  const MONITOR_INTERVAL_MS = 2_000;

  type PerformanceLevel = 'optimal' | 'balanced' | 'conservative';

  let videoPlayer = $state<HTMLVideoElement | null>(null);
  let isLoading = $state(true);
  let isMuted = $state(false);
  let volume = $state(1);
  let currentPerformanceLevel = $state<PerformanceLevel>('optimal');

  /*
    Deliberately NOT `$state`: none of these is read during render, and making them reactive would
    schedule an update on every buffering event — several a second on a struggling connection.
  */
  let hls: Hls | null = null;
  let bufferingEvents = 0;
  let lastBufferCheck = Date.now();
  let recoveryAttempts = 0;
  let hasStartedPlaying = false;
  let retryTimeout: ReturnType<typeof setTimeout> | undefined;
  let performanceMonitor: ReturnType<typeof setInterval> | undefined;

  /** `setupStream()` line 116 — via `mtxPlaylistUrl`, which is where the URL shape is tested. */
  const videoSrc = $derived(mtxPlaylistUrl(muser, streamServerMTX, mtxToken));

  /** `getBufferSizeName()`, lines 267-277. */
  /* The three names live with the clamp in `stream-buffer.ts`; this file used to spell them out and
     `RoomPrefs` would have been the second copy. */
  const bufferSizeName = $derived(streamBufferName(streamBufferLevel(bufferSizeLevel)));

  /**
   * `getHlsConfig()`, lines 50-111, every number transcribed.
   *
   * The base profile is level 1. Levels 2 and 3 widen the buffer and lengthen `liveSyncDuration`,
   * and level 3 turns `lowLatencyMode` OFF — a viewer choosing "Maximum" is explicitly trading
   * latency for stability. Then, only once playback has begun and only if the stream has misbehaved,
   * the level-2/3 profile is replaced wholesale by a degraded one.
   */
  function getHlsConfig() {
    const level = bufferSizeLevel || 3;
    const config: Record<string, unknown> = {
      enableWorker: true,
      startPosition: -1,
      manifestLoadingMaxRetry: 4,
      manifestLoadingRetryDelay: 500,
      manifestLoadingMaxRetryTimeout: 64_000,
      maxLiveSyncPlaybackRate: 1.5,
      lowLatencyMode: true,
      liveSyncDuration: 0,
      liveMaxLatencyDuration: 6,
      maxBufferLength: 25,
      maxMaxBufferLength: 35,
      stretchShortVideoTrack: true,
      abrBandWidthFactor: 0.9,
      abrBandWidthUpFactor: 0.7
    };

    if (level > 1) {
      if (level === 2) {
        config.maxBufferLength = 40;
        config.maxMaxBufferLength = 60;
        config.liveSyncDuration = 3;
        config.liveMaxLatencyDuration = 10;
        config.lowLatencyMode = true;
      } else if (level === 3) {
        config.maxBufferLength = 60;
        config.maxMaxBufferLength = 90;
        config.liveSyncDuration = 6;
        config.liveMaxLatencyDuration = 15;
        config.lowLatencyMode = false;
      }
    }

    if (hasStartedPlaying && currentPerformanceLevel !== 'optimal') {
      if (currentPerformanceLevel === 'conservative') {
        return {
          ...config,
          maxLiveSyncPlaybackRate: 1.2,
          lowLatencyMode: false,
          liveSyncDuration: 4,
          liveMaxLatencyDuration: 12,
          maxBufferLength: 40,
          maxMaxBufferLength: 60,
          abrBandWidthFactor: 0.7,
          abrBandWidthUpFactor: 0.5
        };
      }
      if (currentPerformanceLevel === 'balanced') {
        return {
          ...config,
          maxLiveSyncPlaybackRate: 1.3,
          lowLatencyMode: true,
          liveSyncDuration: 3,
          liveMaxLatencyDuration: 8,
          maxBufferLength: 30,
          maxMaxBufferLength: 45,
          abrBandWidthFactor: 0.8,
          abrBandWidthUpFactor: 0.6
        };
      }
    }
    return config;
  }

  /** `cleanup()`, lines 45-49. */
  function cleanup() {
    if (retryTimeout) clearTimeout(retryTimeout);
    if (performanceMonitor) clearInterval(performanceMonitor);
    hls?.destroy();
    hls = null;
  }

  /** `startPerformanceMonitoring()`, lines 133-139 — a no-op until playback has actually begun. */
  function startPerformanceMonitoring() {
    if (!hls || !hasStartedPlaying) return;
    performanceMonitor = setInterval(checkAndAdaptPerformance, MONITOR_INTERVAL_MS);
  }

  /**
   * `checkAndAdaptPerformance()`, lines 141-158.
   *
   * Two independent jobs on one timer: reset the buffering tally once the window has elapsed, and
   * catch up to the live edge. More than 10s behind speeds playback to 1.5×; more than 15s gives up
   * on catching up smoothly and SEEKS to 5s behind live.
   */
  function checkAndAdaptPerformance() {
    if (!hls || !videoPlayer || !hasStartedPlaying) return;
    const now = Date.now();
    const media = videoPlayer;

    if (now - lastBufferCheck >= BUFFER_CHECK_WINDOW) {
      bufferingEvents = 0;
      lastBufferCheck = now;
      recoveryAttempts = 0;
    }
    if (bufferingEvents >= BUFFER_THRESHOLD) adaptToPerformanceIssues();

    if (hls.liveSyncPosition) {
      const behind = hls.liveSyncPosition - media.currentTime;
      if (behind > 10 && currentPerformanceLevel === 'optimal') {
        media.playbackRate = 1.5;
      } else if (behind > 15) {
        media.currentTime = hls.liveSyncPosition - 5;
      } else {
        media.playbackRate = 1;
      }
    }
  }

  /**
   * `adaptToPerformanceIssues()`, lines 159-179 — a one-way ratchet, capped.
   *
   * optimal → balanced → conservative, and conservative returns early rather than degrading
   * further. `recoveryAttempts` caps it at 2 per window so a permanently bad connection cannot
   * reload the stream forever.
   */
  function adaptToPerformanceIssues() {
    if (!hasStartedPlaying || recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) return;

    if (currentPerformanceLevel === 'optimal') currentPerformanceLevel = 'balanced';
    else if (currentPerformanceLevel === 'balanced') currentPerformanceLevel = 'conservative';
    else return;

    recoveryAttempts += 1;
    bufferingEvents = 0;
    void loadStream();
  }

  /** `handleFatalError()`, lines 211-218 — only ever reached once playback has started. */
  function handleFatalError() {
    if (!hasStartedPlaying) return;
    hls?.destroy();
    if (currentPerformanceLevel !== 'conservative') adaptToPerformanceIssues();
    retryTimeout = setTimeout(() => void loadStream(), 2_000);
  }

  /** `setupHlsEventListeners()`, lines 180-210. */
  function setupHlsEventListeners(HlsCtor: typeof Hls, media: HTMLVideoElement) {
    if (!hls) return;

    hls.on(HlsCtor.Events.ERROR, (_event, data) => {
      if (!data.fatal) return;
      console.error('Fatal HLS error:', data.details);
      if (hasStartedPlaying) {
        handleFatalError();
        return;
      }
      hls?.destroy();
      retryTimeout = setTimeout(() => void loadStream(), 2_000);
    });

    /* Attach first, THEN load. Reversing these silently never plays. */
    hls.on(HlsCtor.Events.MEDIA_ATTACHED, () => {
      hls?.loadSource(videoSrc);
    });

    hls.on(HlsCtor.Events.MANIFEST_LOADED, () => {
      media.play().catch((error) => console.warn('Autoplay failed:', error));
      isLoading = false;
    });

    media.addEventListener('playing', () => {
      if (hasStartedPlaying) return;
      hasStartedPlaying = true;
      startPerformanceMonitoring();
    });

    media.addEventListener('waiting', () => {
      if (hasStartedPlaying) bufferingEvents += 1;
    });
  }

  /** `setupNativeHLS()`, lines 219-228 — Safari, which plays `application/vnd.apple.mpegurl`. */
  function setupNativeHLS(media: HTMLVideoElement) {
    media.src = videoSrc;
    media.addEventListener('loadedmetadata', () => {
      media.play().catch((error) => console.warn('Autoplay failed:', error));
      media.volume = doNotDisturbOn ? 0 : audioVolume;
      isLoading = false;
    });
  }

  /**
   * `loadStream()`, lines 121-132.
   *
   * hls.js is imported dynamically: it is a large library that touches `window` at module scope, so
   * a static import would break SSR and would ship to every viewer whether or not a stream exists.
   */
  async function loadStream() {
    const media = videoPlayer;
    if (!media) return;

    const HlsCtor = (await import('hls.js')).default;
    if (HlsCtor.isSupported()) {
      cleanup();
      hls = new HlsCtor(getHlsConfig());
      setupHlsEventListeners(HlsCtor, media);
      hls.attachMedia(media);
      media.volume = doNotDisturbOn ? 0 : audioVolume;
      return;
    }
    if (media.canPlayType('application/vnd.apple.mpegurl')) setupNativeHLS(media);
  }

  /*
    `ngAfterViewInit` -> `setupStream()`, plus the `bufferSizeLevel` subscription from `ngOnInit`
    (lines 29-36) which reloads the stream when the preference changes.

    Keyed on the URL and the buffer level only. `currentPerformanceLevel` is deliberately NOT a
    dependency — `adaptToPerformanceIssues` reloads directly, and tracking it here would make a
    degradation trigger a second reload on top of the one it already asked for.
  */
  $effect(() => {
    void videoSrc;
    void bufferSizeLevel;
    if (!videoPlayer) return;
    void loadStream();
    return cleanup;
  });

  onDestroy(cleanup);

  /** `toggleFullscreen()`, lines 229-238. */
  function toggleFullscreen() {
    const media = videoPlayer;
    if (!media) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
      return;
    }
    void media.requestFullscreen?.();
  }

  /** `toggleMute()`, lines 239-243. Upstream also flips a volume slider this template never shows. */
  function toggleMute() {
    isMuted = !isMuted;
    if (videoPlayer) videoPlayer.muted = isMuted;
  }

  /** `setBufferSize()`, lines 278-285 — refuses out-of-range and no-op changes before persisting. */
  function setBufferSize(level: number) {
    if (level < 1 || level > 3) return;
    if ((bufferSizeLevel || 3) === level) return;
    onBufferSizeChange?.(level);
  }
</script>

<div class="h-100">
  <!-- `wCe` — const 2 is `['id','loading-message']`, const 15 is `ml-2 fas fa-spinner fa-spin`. -->
  {#if isLoading}
    <div id="loading-message">
      <i class="ml-2 fas fa-spinner fa-spin"></i>&nbsp;Loading Stream...
    </div>
  {/if}

  <!--
    `autoplay` is an attribute upstream; `muted` and `volume` are property bindings. The id is
    `video-${muser._id}` (`ei('id','video-', o.muser._id, '')`).
  -->
  <video
    bind:this={videoPlayer}
    id="video-{muser._id}"
    autoplay
    class="video-streaming"
    muted={isMuted}
    {volume}
    ondblclick={toggleFullscreen}
  ></video>

  <!--
    `TCe` — shown to NON-presenters only, and only when the room setting is on. Both terms, and the
    empty-id case, are `#lib/user-id-watermark.ts` now; `ScreenPane` renders the same span from the
    same answer.
  -->
  {#if userIdWatermark}
    <span class="overlay-userID-container"> {userIdWatermark} </span>
  {/if}

  <div class="controls-container">
    <div class="buffer-size-dropdown">
      <div class="dropdown">
        <!--
          `data-bs-toggle="dropdown"` is the reference's whole mechanism and is INERT here, so the
          three `setBufferSize` calls below had never been reachable. Kept because the markup is a
          transcription; the open state comes from `RoomMenus`. See
          `bootstrap-dropdown-contract.test.ts`.
        -->
        <button
          type="button"
          id="bufferSizeDropdown"
          data-bs-toggle="dropdown"
          aria-expanded={menus.streamBuffer}
          class="btn btn-sm dropdown-toggle"
          onclick={() => menus.toggle('streamBuffer')}
        >
          <i class="fas fa-database"></i> Buffer: {bufferSizeName}
        </button>
        <!--
          Upstream these three are `<a class="dropdown-item">` with a click and no `href`
          (const 11: `[1,'dropdown-item',3,'click']`). A `<button class="dropdown-item">` is used
          instead: Bootstrap supports both and styles them identically, so nothing renders
          differently, while an anchor with no href is neither focusable nor operable by keyboard.
          Same substitution, same reasoning, as the restream cross-link in `ModalHost`.
        -->
        <ul
          aria-labelledby="bufferSizeDropdown"
          class={menus.streamBuffer
            ? 'dropdown-menu dropdown-menu-end show'
            : 'dropdown-menu dropdown-menu-end'}
        >
          <li>
            <button
              type="button"
              class="dropdown-item"
              onclick={() => {
                setBufferSize(1);
                menus.set('streamBuffer', false);
              }}>Normal</button
            >
          </li>
          <li>
            <button
              type="button"
              class="dropdown-item"
              onclick={() => {
                setBufferSize(2);
                menus.set('streamBuffer', false);
              }}>Increased</button
            >
          </li>
          <li>
            <button
              type="button"
              class="dropdown-item"
              onclick={() => {
                setBufferSize(3);
                menus.set('streamBuffer', false);
              }}>Maximum</button
            >
          </li>
        </ul>
      </div>
    </div>

    <!--
      `DCe` / `ECe` / `kCe` — signal bars: three checks optimal, two balanced, one conservative.

      The colon sits INSIDE the `<i>` on the optimal branch and OUTSIDE it on the other two. That
      asymmetry is upstream's (`d(0,"i",16),v(1,":"),u()` versus `T(0,"i",16),v(1,":\xa0 ")`) and is
      reproduced rather than tidied, because it is what the captured markup does.
    -->
    <div id="speed-indicator">
      {#if currentPerformanceLevel === 'optimal'}
        <i class="fas fa-signal">:</i>&nbsp;
        <span
          ><i class="fas fa-check"></i><i class="fas fa-check"></i><i class="fas fa-check"
          ></i></span
        >
      {:else if currentPerformanceLevel === 'balanced'}
        <i class="fas fa-signal"></i>:&nbsp;
        <span><i class="fas fa-check"></i><i class="fas fa-check"></i></span>
      {:else if currentPerformanceLevel === 'conservative'}
        <i class="fas fa-signal"></i>:&nbsp;
        <span><i class="fas fa-check"></i></span>
      {/if}
    </div>

    <!--
      The label is added, not captured: upstream this button contains only an icon, which a screen
      reader announces as nothing at all. `aria-label` changes no pixels.
    -->
    <button
      class="mute-unmute-button"
      aria-label={isMuted ? 'Unmute stream' : 'Mute stream'}
      onclick={toggleMute}
    >
      <i class={isMuted ? 'fas fa-2x fa-volume-off' : 'fas fa-2x fa-volume-up'}></i>
    </button>
  </div>
</div>

<style>
  /*
    The component's own stylesheet, transcribed from its `styles:` array with Angular's
    `[_ngcontent-%COMP%]` scoping markers removed — Svelte scopes these the same way.

    THREE RULES ARE DELIBERATELY NOT PORTED: `#message`, `#lang-icon` and `#lang-list`. They are
    dead upstream — the template has 27 declarations and none of them is any of those elements, so
    the rules style nothing. Copying them across would import three selectors with no markup, which
    is the mirror image of the `.flipped`-class-with-no-CSS defect this repository already refuses.
  */
  .video-streaming {
    width: 100%;
    height: 100%;
    background: #1e1e1e;
    object-fit: contain;
    vertical-align: top;
  }

  .controls-container {
    position: absolute;
    bottom: 10px;
    right: 10px;
    z-index: 1000;
    display: flex;
    align-items: center;
  }

  #speed-indicator {
    margin-right: 25px;
    opacity: 0.5;
  }

  .mute-unmute-button {
    padding: 3px 6px;
    font-size: 14px;
    border-radius: 4px;
    background-color: #fffc;
    border: none;
    cursor: pointer;
    opacity: 0.5;
  }

  .mute-unmute-button:hover {
    background-color: #fff;
  }

  #loading-message {
    position: absolute;
    top: 40px;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    color: #fff;
    background-color: #000000b3;
    z-index: 1;
  }

  .buffer-size-dropdown {
    margin-right: 10px;
    z-index: 10;
  }

  .buffer-size-dropdown :global(.dropdown-toggle) {
    background-color: #00000080;
    color: #fff;
    border: 1px solid rgb(255 255 255 / 20%);
    font-size: 12px;
    padding: 4px 8px;
  }

  .buffer-size-dropdown :global(.dropdown-toggle:hover),
  .buffer-size-dropdown :global(.dropdown-toggle:focus) {
    background-color: #000000b3;
  }

  .buffer-size-dropdown :global(.dropdown-menu) {
    background-color: #000c;
    border: 1px solid rgb(255 255 255 / 20%);
    min-width: 120px;
  }

  .buffer-size-dropdown :global(.dropdown-menu .dropdown-item) {
    color: #fff;
    font-size: 12px;
    padding: 4px 12px;
  }

  .buffer-size-dropdown :global(.dropdown-menu .dropdown-item:hover) {
    background-color: #ffffff1a;
    cursor: pointer;
  }
</style>
