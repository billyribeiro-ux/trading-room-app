<script lang="ts">
  import { onMount } from 'svelte';

  import { mediumDate } from '#lib/message-formatters.js';
  import {
    readVideoList,
    videoListEntry,
    videoListStorageKey,
    writeVideoList
  } from '#lib/video-list.js';
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

  const storageKey = $derived(videoListStorageKey(sessionId));

  /* `loadVideos()` is gated on `isPresenter` upstream too — byte 1,967,675. */
  onMount(() => {
    if (isPresenter) videoList = readVideoList(localStorage, storageKey);
  });

  function saveVideoList() {
    writeVideoList(localStorage, storageKey, videoList);
  }

  /**
   * The `+` button — `sendVideoToRoom()`, byte 1,979,646.
   *
   * The ladder it walks (empty, then scheme, then the YouTube normalisation, then the duplicate) is
   * `#lib/video-url-entry.ts`, which is where the four captured refusal sentences and the reference's
   * own dead playlist arm are argued and executed. What is left here is what this component owns:
   * the list, the field, and which dialog the answer becomes.
   */
  function sendVideoToRoom() {
    const entry = videoListEntry(videoURL, videoList);
    if (!entry.ok) {
      alertMessage = entry.alert;
      return;
    }

    videoList.push(entry.url);
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

  /**
   * ── VID-05 — `{{ scheduledVideo.videoPlayTime | date:'medium' }}`, THROUGH THE ROOM'S FORMATTER ─
   *
   * `Ze(Ct(5, 2, e.scheduledVideo.videoPlayTime, "medium"))` at byte 1,930,918 — Angular's `date`
   * pipe with format `medium`, which is `MMM d, y, h:mm:ss a`.
   *
   * This built a fresh `Intl.DateTimeFormat` INSIDE the function, with an inline options object and
   * a `undefined` locale, and both halves were wrong for the reasons `#lib/message-formatters.ts`
   * already states about the four formatters it holds:
   *
   * **Built per call.** Constructing an `Intl.DateTimeFormat` is a locale-data lookup. `mediumDate`
   * is built once at module scope and shared, which is the whole argument that module records — and
   * the same one `#lib/short-when.ts` makes for the three copies IT collapsed.
   *
   * **`en-US`, not the viewer's locale.** Angular resolves `date:'medium'` against `LOCALE_ID`, and
   * this bundle never calls `registerLocaleData` — the only occurrence of that name in 2,891,205
   * bytes is inside Angular's own "Missing extra locale data" error string at byte 147,099. So the
   * reference renders `Aug 31, 2026, 5:04:00 PM` for every viewer on earth, and `undefined` here
   * rendered `31.08.2026, 17:04:00` for some of them. A pinned locale is the transcription; the
   * viewer's own was an improvement nobody asked for and nobody could see.
   *
   * The empty guard stays and the `Invalid Date` guard goes: `mediumDate` would throw a `RangeError`
   * out of the template on an unparseable value, and the only writer — `scheduleVideoForAll` in
   * `#lib/room/broadcasts.svelte.ts` — refuses to arm one (`if (!Number.isFinite(delay)) return`).
   * A guard against a state its own writer cannot produce is a claim that the writer might.
   */
  function formatScheduledDate(value: string | null) {
    return value ? mediumDate(value) : '';
  }
</script>

{#if isPresenter && !videoPlayerUrl}
  {#if scheduledVideo.videoPlayTime}
    {#if scheduledVideo.videoURL}
      <!--
        ── VID-02, VID-03 and VID-04 — THE PENDING-VIDEO HEADER, DECODED BY VALUE ────────────────

        ```js
        function WSe(t,n){1&t&&(d(0,"div",141),v(1," Video URL: "),d(2,"strong",142),v(3),u()(),
          d(4,"p"),v(5," IMPORTANT: … "),u())}
        141 [1,"m-4"]   142 [1,"mx-2"]
        ```
        (byte 1,930,621; the two consts read at 2,003,492 and 2,003,502 by walking the room
        component's own table, which is the only way to know what a slot number means.)

        Three differences, and none of them is the one a reader would guess from the class names:

        **`m-4`, not `m-2`.** Both this block and the "Video scheduled for:" block below take const
        141. `m-2` is const 146 and belongs to "No videos." — the list state, which this replaces.
        The pending-video notice indents further than the list precisely because it is not one.

        **The `<strong>` carries `mx-2`.** It had no class, so the url ran straight into the label.

        **`u()()` closes the `strong` AND the `div` before `d(4,"p")`** — the IMPORTANT paragraph is
        a SIBLING of the block, not inside it. Nested, it inherited the indent and read as a caption
        on the url; as a sibling it is a statement about the feature, which is what it says.
      -->
      <div class="m-4">
        Video URL:
        <strong class="mx-2">{scheduledVideo.videoURL}</strong>
      </div>
      <p>
        IMPORTANT: The video URL needs to be a link to an mp4 video hosted on a website or something
        like S3, not a YouTube/Vimeo etc...
      </p>
    {/if}
    <div class="m-4">
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

<!--
  ── VID-01 — TWO BOOTBOX DIALOGS, HAND-ROLLED, WITH NEITHER BACKDROP NOR FOCUS ────────────────────

  Both of these are one `bootbox.dialog` call upstream, byte 1,980,807:

  ```js
  playVideoForAll(e){bootbox.dialog({title:"Video",
    message:"<p>Do you want to play this video at a specific time?",
    buttons:{cancel:{label:"Cancel",className:"btn-danger",callback:()=>{…}},
             noclose:{label:"Choose time?",className:"btn-success",callback:()=>{bootbox.dialog({
               title:"Choose time:",
               message:"<p><input type='datetime-local' id='video-start-datetime' … class='form-control' /></p>",
               buttons:{cancel:{label:"Cancel",className:"btn-danger",…},
                        ok:{label:"Send",className:"btn-primary",callback:()=>{…}}}})}},
             ok:{label:"Play now",className:"btn-primary",callback:()=>{…}}}})}
  ```

  This file answered them with about ninety lines of `<div class="bootbox modal fade show">` copied
  by hand, and the copy was missing the three things that are not markup: **no `.modal-backdrop`**,
  so the room stayed clickable behind a dialog that is modal by construction and `aria-modal="true"`
  by assertion; **no focus move and no focus restore**, so a keyboard user's focus stayed on the Play
  For All button they had just left, behind the dialog; and **no `bootbox-alert` class**, which is
  what the room's own captured stylesheet and every other dialog here are keyed on.

  `BootboxDialog.svelte` does all three, and it is the primitive this repository already models
  `bootbox.dialog` with: `mode="alert"` plus a `footer` snippet, which is exactly how `RoomOverlays`
  renders `randomUser()`'s two-button dialog and why that snippet exists at all. Passing `footer`
  REPLACES the default OK, so the reference's own button set is the dialog's only control — the same
  reasoning `dta-02` records for the alert-pane lightbox.

  Not a refactor for tidiness: a hand-rolled copy of a primitive is a copy that stops tracking it,
  and these two had already stopped.
-->
{#if playChoiceUrl}
  <BootboxDialog mode="alert" message="" title="Video" onclose={() => (playChoiceUrl = null)}>
    <p>Do you want to play this video at a specific time?</p>
    {#snippet footer()}
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
    {/snippet}
  </BootboxDialog>
{/if}

{#if scheduleChoiceUrl}
  <BootboxDialog
    mode="alert"
    message=""
    title="Choose time:"
    onclose={() => (scheduleChoiceUrl = null)}
  >
    <p>
      <!-- The id is the reference's own; `ii("#video-start-datetime").val()` is how it reads back. -->
      <input
        type="datetime-local"
        id="video-start-datetime"
        name="video-start-datetime"
        class="form-control"
        bind:value={scheduledDateTime}
      />
    </p>
    {#snippet footer()}
      <button type="button" class="btn btn-danger" onclick={() => (scheduleChoiceUrl = null)}>
        Cancel
      </button>
      <button type="button" class="btn btn-primary" onclick={scheduleVideo}>Send</button>
    {/snippet}
  </BootboxDialog>
{/if}
