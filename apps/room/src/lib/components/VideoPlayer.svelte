<script lang="ts">
  import { onMount } from 'svelte';
  import BootboxDialog from './BootboxDialog.svelte';

  interface Props {
    sessionId: string;
    isPresenter: boolean;
    /**
     * What is playing IN THE ROOM, owned by the page.
     *
     * It used to be this component's own `$state`, which is why both "For All" buttons only ever
     * moved the presenter's own screen. It is the page that holds the `cmds` subscription, so the
     * room's answer to "what is playing" has to live there and arrive here as a prop — the same
     * shape `mp3Url` already had.
     */
    videoPlayerUrl: string;
    /**
     * `this.scheduledVideo` — the pending play a presenter has armed but not yet sent.
     *
     * Page-owned for the same reason, and for one more: `stopVideoForAll` clears it for EVERY
     * client (`scheduledVideo.videoURL = ''; scheduledVideo.videoPlayTime = null`, byte
     * 1,966,882), so a second presenter pressing stop has to be able to cancel the first
     * presenter's armed timer. A copy held privately here could not be reached by that command.
     */
    scheduledVideo: { videoURL: string; videoPlayTime: string | null };
    /** "Play now" — broadcast this url to the room immediately. */
    onplaynow: (url: string) => void;
    /** "Send" on the datetime dialog — arm it for `whenLocal`, a `datetime-local` value. */
    onschedule: (url: string, whenLocal: string) => void;
    /** "Stop For All" and "Remove Scheduled Video" — both send `stopVideoForAll`, byte 1,981,811. */
    onstopforall: () => void;
  }

  let {
    sessionId,
    isPresenter,
    videoPlayerUrl,
    scheduledVideo,
    onplaynow,
    onschedule,
    onstopforall
  }: Props = $props();

  let videoURL = $state('');
  let videoList = $state<string[]>([]);
  let alertMessage = $state<string | null>(null);
  let confirmDialog = $state<{ message: string; onconfirm: () => void } | null>(null);
  let playChoiceUrl = $state<string | null>(null);
  let scheduleChoiceUrl = $state<string | null>(null);
  let scheduledDateTime = $state('');

  const storageKey = $derived(`videos-${sessionId}`);

  onMount(() => {
    if (!isPresenter) return;

    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
          videoList = parsed;
        }
      } catch {
        videoList = [];
      }
    }
  });

  function saveVideoList() {
    localStorage.setItem(storageKey, JSON.stringify(videoList));
  }

  function validURL(value: string) {
    return value.toLowerCase().includes('http://') || value.toLowerCase().includes('https://');
  }

  function sendVideoToRoom() {
    let value = videoURL?.trim() || '';
    if (!value) {
      alertMessage = 'Error. URL is empty.';
      return;
    }

    if (!validURL(value)) {
      alertMessage = 'The link seems to be missing "https://" or "http://"';
      return;
    }

    if (value.includes('youtube')) {
      /* Verbatim from the bundle (byte 1503474 / 1977968 / 2295405): the escapes are redundant to
         a regex engine and kept because the capture is reproduced, not tidied. */
      // eslint-disable-next-line no-useless-escape
      const videoPattern = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const videoId = value.match(videoPattern) ? value.match(videoPattern)?.[2] : null;
      /* Verbatim from the bundle (byte 1503474 / 1977968 / 2295405): the escapes are redundant to
         a regex engine and kept because the capture is reproduced, not tidied. */
      // eslint-disable-next-line no-useless-escape
      const playlistPattern = /[?&]list=([^#\&\?]+)/;
      const playlistId = value.match(playlistPattern) ? value.match(playlistPattern)?.[1] : null;

      // This restrictive two-part guard is present in the compiled source.
      if (!videoId || !playlistId) {
        alertMessage = 'The youtube link seems wrong.';
        return;
      }

      if (videoId) {
        value = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      } else if (playlistId) {
        value = `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&loop=1&rel=0`;
      }
    }

    if (videoList.length > 0 && videoList.includes(value)) {
      alertMessage = 'Video already exists.';
      return;
    }

    videoList.push(value);
    saveVideoList();
    videoURL = '';
    alertMessage = 'Video added.';
  }

  function requestDeleteVideo(value: string) {
    confirmDialog = {
      message: `Are you sure you want to delete this video url: ${value}?`,
      onconfirm: () => {
        confirmDialog = null;
        videoList.splice(videoList.indexOf(value), 1);
        saveVideoList();
      }
    };
  }

  function requestPlayVideo(value: string) {
    playChoiceUrl = value;
  }

  function playVideoNow(value: string) {
    playChoiceUrl = null;
    scheduleChoiceUrl = null;
    onplaynow(value);
  }

  function chooseScheduledTime(value: string) {
    playChoiceUrl = null;
    scheduledDateTime = '';
    scheduleChoiceUrl = value;
  }

  function scheduleVideo() {
    if (!scheduleChoiceUrl) return;

    const value = scheduleChoiceUrl;
    scheduleChoiceUrl = null;
    onschedule(value, scheduledDateTime);
  }

  /**
   * "Stop For All" (`stop`) and "Remove Scheduled Video" (`remove`).
   *
   * The verb is only ever the confirm STRING — `stopVideoForAll(e)` interpolates it into the
   * question and then sends the same bare `stopVideoForAll` either way (byte 1,981,811). Which is
   * why the callback takes no argument: two prompts, one command.
   */
  function requestStopVideo(action: 'stop' | 'remove') {
    confirmDialog = {
      message: `Are you sure you want to ${action} this video for all?`,
      onconfirm: () => {
        confirmDialog = null;
        onstopforall();
      }
    };
  }

  function formatScheduledDate(value: string | null) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Invalid Date';
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  }
</script>

{#if isPresenter && !videoPlayerUrl}
  {#if scheduledVideo.videoPlayTime}
    {#if scheduledVideo.videoURL}
      <div class="m-2">
        Video URL:
        <strong>{scheduledVideo.videoURL}</strong>
        <p>
          IMPORTANT: The video URL needs to be a link to an mp4 video hosted on a website or
          something like S3, not a YouTube/Vimeo etc...
        </p>
      </div>
    {/if}
    <div class="m-2">
      Video scheduled for:
      <span class="mx-2">{formatScheduledDate(scheduledVideo.videoPlayTime)}</span>
    </div>
    <button
      type="button"
      title="Remove For All"
      class="btn btn-danger btn-sm ms-4"
      onclick={() => requestStopVideo('remove')}
    >
      <i class="fa fa-trash mr-2"></i>
      Remove Scheduled Video
    </button>
  {:else}
    {#each videoList as video (video)}
      <div class="w-100 d-flex justify-content-between align-items-center m-2 border-bottom">
        <span class="ms-4 me-2">
          <i
            class="fas fa-trash me-2 text-danger video-player-delete-btn"
            role="button"
            tabindex="0"
            onclick={() => requestDeleteVideo(video)}
            onkeydown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') requestDeleteVideo(video);
            }}
          ></i>
          {video}
        </span>
        <span class="video-player-btns">
          <button
            type="button"
            title="Play For All"
            class="btn btn-primary m-2 me-4"
            onclick={() => requestPlayVideo(video)}
          >
            <i class="fa fa-play-circle mr-2"></i>
            Play For All
          </button>
        </span>
      </div>
    {:else}
      <div class="m-2">No videos.</div>
    {/each}
    <div class="d-flex align-items-center flex-column">
      <div class="input-group m-2">
        <input
          id="video-url"
          name="videoUrl"
          type="text"
          placeholder="Video url..."
          aria-label="video url"
          aria-describedby="addon-video-url"
          class="form-control ms-4 ng-untouched ng-pristine ng-valid"
          value={videoURL || undefined}
          oninput={(event) => (videoURL = event.currentTarget.value)}
          onkeydown={(event) => {
            if (event.key === 'Enter') sendVideoToRoom();
          }}
        />
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <span
          id="addon-video-url"
          class="input-group-text btn btn-outline-primary me-4"
          onclick={sendVideoToRoom}
        >
          <i class="fas fa-plus-circle px-2"></i>
        </span>
      </div>
    </div>
  {/if}
{/if}

{#if videoPlayerUrl}
  <div class="w-100 h-100">
    {#if isPresenter}
      <div class="text-right video-player-btns">
        <button
          type="button"
          title="Stop For All"
          class="btn btn-danger btn-sm m-1"
          onclick={() => requestStopVideo('stop')}
        >
          <i class="fa fa-stop-circle mr-2"></i>
          Stop For All
        </button>
      </div>
    {/if}
    {#if videoPlayerUrl.includes('youtube')}
      <iframe
        title="Room video"
        width="100%"
        height="90%"
        allow="autoplay; encrypted-media"
        frameborder="0"
        allowfullscreen
        class="videoPlayerUrl-iframe"
        src={videoPlayerUrl}
      ></iframe>
    {:else}
      <!-- svelte-ignore a11y_media_has_caption -->
      <video autoplay playsinline controls class="room-video-player" src={videoPlayerUrl}></video>
    {/if}
  </div>
{/if}

{#if alertMessage}
  <BootboxDialog mode="alert" message={alertMessage} onclose={() => (alertMessage = null)} />
{/if}

{#if confirmDialog}
  <BootboxDialog
    mode="confirm"
    message={confirmDialog.message}
    onclose={() => (confirmDialog = null)}
    onconfirm={confirmDialog.onconfirm}
  />
{/if}

{#if playChoiceUrl}
  <div
    class="bootbox modal fade show"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    style="display: block;"
  >
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Video</h5>
          <button
            type="button"
            class="bootbox-close-button close btn-close"
            aria-hidden="true"
            aria-label="Close"
            onclick={() => (playChoiceUrl = null)}
          ></button>
        </div>
        <div class="modal-body">
          <div class="bootbox-body"><p>Do you want to play this video at a specific time?</p></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-danger" onclick={() => (playChoiceUrl = null)}>
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-success"
            onclick={() => playChoiceUrl && chooseScheduledTime(playChoiceUrl)}
          >
            Choose time?
          </button>
          <button
            type="button"
            class="btn btn-primary"
            onclick={() => playChoiceUrl && playVideoNow(playChoiceUrl)}
          >
            Play now
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if scheduleChoiceUrl}
  <div
    class="bootbox modal fade show"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    style="display: block;"
  >
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Choose time:</h5>
          <button
            type="button"
            class="bootbox-close-button close btn-close"
            aria-hidden="true"
            aria-label="Close"
            onclick={() => (scheduleChoiceUrl = null)}
          ></button>
        </div>
        <div class="modal-body">
          <div class="bootbox-body">
            <p>
              <input
                type="datetime-local"
                id="video-start-datetime"
                name="video-start-datetime"
                class="form-control"
                bind:value={scheduledDateTime}
              />
            </p>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-danger" onclick={() => (scheduleChoiceUrl = null)}>
            Cancel
          </button>
          <button type="button" class="btn btn-primary" onclick={scheduleVideo}>Send</button>
        </div>
      </div>
    </div>
  </div>
{/if}
