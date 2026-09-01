import { isHttpError } from '@sveltejs/kit';

import type { RoomDialogs } from './dialogs.svelte';
import type { RoomMenus } from '#lib/room/menus.svelte.js';

/** The three wire commands this class sends, injected so it needs no route import and stays testable. */
export interface RoomBroadcastCommands {
  video: (payload: {
    cmd: 'playVideoForAll' | 'stopVideoForAll';
    url?: string;
    /**
     * `sendServerAdminCommand("playVideoForAll", {url: e, videoPlayTime: i})` — byte 1,981,560.
     *
     * Epoch milliseconds for an armed play, `null` for the reference's "Play now". It never reaches
     * another browser: the dispatch forwards only the url (byte 1,024,587), because holding the
     * schedule is the SERVER's job and that is what makes it survive the presenter closing the tab.
     */
    videoPlayTime?: number | null;
  }) => Promise<unknown>;
  youtube: (payload: { cmd: 'playYTForAll' | 'stopYTForAll'; url?: string }) => Promise<unknown>;
  fileMedia: (payload: {
    cmd: 'playMP3ForAll' | 'stopMp3ForAll';
    url?: string;
  }) => Promise<unknown>;
}

/*
  Everything a presenter plays FOR THE WHOLE ROOM: the video player, the YouTube overlay and the mp3.

  Phase 5 slice 12. Three features that look separate and are one thing — each is a presenter
  pressing a button, a server command going out, and every browser in the room reacting to what comes
  back on the `cmds` channel. They were spread across four hundred lines of `+page.svelte`, with the
  state at the top of the file and the senders in the middle.

  ## Receivers rather than setters, and this is a deliberate deviation from a pure move

  Six of these fields were assigned INLINE by the SSE dispatch — the `stopVideoForAll` case set four
  of them in a row. Exposing six public setters would have relocated the code and lost the invariant:
  stopping a video must ALSO clear the armed timer and blank the schedule, and a caller holding
  setters can do half of that and leave a play arriving minutes after the room was told it had been
  removed.

  So the wire events are named as methods and the dispatch calls those. It is the shape
  `RoomMedia.roomRecordingStarted` already uses in this directory, and it is why every field here is
  read-only from outside.

  ## The armed timer is this browser's, which is a recorded gap rather than a design

  Upstream the schedule is the SERVER's: `playVideoForAll` is posted the moment the presenter presses
  Send, carrying `videoPlayTime`, and the session record holds the pair until it fires. This room has
  no such store, so the browser that armed it is the one that posts. Closing the tab cancels the play
  and a late joiner never sees it — recorded in `TODO.md` rather than papered over.
*/
export class RoomBroadcasts {
  readonly #dialogs: RoomDialogs;
  readonly #menus: RoomMenus;
  readonly #setSoundCloudUrl: (url: string) => void;
  readonly #setSoundCloudPlaying: (playing: boolean) => void;
  readonly #commands: RoomBroadcastCommands;
  #youtubeForAllUrl;
  #youtubeStartSeconds;
  #videoPlayerUrl;
  #hideVideoPlayer;
  #scheduledVideoForAll;
  #mp3Playing;
  #mp3Url;
  #salesImageUrl;

  constructor(options: {
    dialogs: RoomDialogs;
    menus: RoomMenus;
    commands: RoomBroadcastCommands;
    /*
      The SoundCloud pair are RECEIVERS rather than a handed-over `RoomMedia`, and the two are
      separate because the captured behaviour is asymmetric: starting a track sets the url AND the
      flag, while both stop paths clear only the FLAG and leave the url in place. One combined
      setter would have invited a caller to null the url on stop, which loses the track a presenter
      is about to resume.

      Handing over `media` itself would also have given this class write access to twenty-odd
      unrelated flags to reach two.
    */
    setSoundCloudUrl: (url: string) => void;
    setSoundCloudPlaying: (playing: boolean) => void;
  }) {
    this.#dialogs = options.dialogs;
    this.#menus = options.menus;
    this.#commands = options.commands;
    this.#setSoundCloudUrl = options.setSoundCloudUrl;
    this.#setSoundCloudPlaying = options.setSoundCloudPlaying;

    this.#youtubeForAllUrl = $state('');
    /** `this.startTime = 0` in the overlay's constructor, byte 1,503,354. */
    this.#youtubeStartSeconds = $state(0);

    /**
     * `videoPlayerUrl` / `hideVideoPlayer` / `scheduledVideo` — the VideoPlayer tab, for the ROOM.
     *
     * All three were `VideoPlayer.svelte`'s own `$state`, and that is why "Play For All" and
     * "Stop For All" only ever moved one browser. They live here because this is where the `cmds`
     * subscription is; the component receives them as props, exactly as `mp3Url` already worked.
     *
     * The two subscribers this reproduces, verbatim from `main.d1d09071be31f1ba.js` byte 1,966,711
     * and 1,966,882:
     *
     * ```js
     * subscribe("playVideoForAll", e => { this.videoPlayerUrl = e.url; this.hideVideoPlayer = !0;
     *                                     this.isP || this.onMainTabChange("presAreaTabs-videoplayer") })
     * subscribe("stopVideoForAll", () => { this.videoPlayerUrl = ""; this.scheduledVideo.videoURL = "";
     *                                      this.scheduledVideo.videoPlayTime = null;
     *                                      this.hideVideoPlayer = !1;
     *                                      this.isP || this.onMainTabChange("presAreaTabs-screens") })
     * ```
     *
     * `hideVideoPlayer` is named for what upstream called it and means the OPPOSITE of what it
     * sounds like: it is true while a video is playing, and it is the term that lets a MEMBER see
     * the tab at all (`O(25, o.hideVideoPlayer && !o.isP || o.isP ? 25 : -1)`, byte 2,016,864). It
     * was previously unmodelled here, which is recorded in the comment on the tab itself.
     */
    this.#videoPlayerUrl = $state('');

    this.#hideVideoPlayer = $state(false);

    /*
      Replaced wholesale rather than mutated, so `$state.raw`: the two writers both assign a fresh
      pair, and a deep proxy over an object that is never edited in place is cost with no reader.
    */
    this.#scheduledVideoForAll = $state.raw<{ videoURL: string; videoPlayTime: string | null }>({
      videoURL: '',
      videoPlayTime: null
    });

    /**
     * `mp3Playing` / `mp3Url` — the room-wide sound a presenter started.
     *
     * Transcribed from the bundle. The subscribers are at offset 1963827:
     *
     * ```js
     * guiEventBus.subscribe('playMP3ForAll', e => { this.mp3Url = e.url; this.mp3Playing = true })
     * guiEventBus.subscribe('stopMp3ForAll', () => { this.mp3Url = null; this.mp3Playing = false })
     * ```
     *
     * The sender for both already existed here; nothing RECEIVED them, so a presenter could hit
     * "Play For All" and no other browser made a sound — the same shape as every other missing
     * receiver in this file.
     *
     * `mp3Playing` is a separate flag rather than `mp3Url !== null` because the capture keeps both
     * and gates different things on each: the audio element binds `src` to the URL
     * (`z('src', o.mp3Url, Mt)`), while "Stop For All" is gated on `isP && mp3Playing`
     * (`O(83, o.isP && o.mp3Playing ? 83 : -1)`).
     */
    this.#mp3Playing = $state(false);

    this.#mp3Url = $state<string | null>(null);

    /*
      The pinned sales image: one url or none. The reference appends a FRESH div per arrival without
      removing the last, stacking overlays until each is closed in turn; a single value renders the
      same thing a reader sees, minus the pile.
    */
    this.#salesImageUrl = $state<string | null>(null);
  }

  get youtubeForAllUrl() {
    return this.#youtubeForAllUrl;
  }

  /** `playYTURL(e, i = 0)`'s `i` — seconds into the video, non-zero only on a late-join replay. */
  get youtubeStartSeconds() {
    return this.#youtubeStartSeconds;
  }

  get videoPlayerUrl() {
    return this.#videoPlayerUrl;
  }

  get hideVideoPlayer() {
    return this.#hideVideoPlayer;
  }

  get scheduledVideoForAll() {
    return this.#scheduledVideoForAll;
  }

  get mp3Playing() {
    return this.#mp3Playing;
  }

  get salesImageUrl(): string | null {
    return this.#salesImageUrl;
  }

  get mp3Url() {
    return this.#mp3Url;
  }

  /*
    THE RECEIVERS. Each is one case of the `cmds` channel, named for the wire command that drives it,
    so the invariants above cannot be half-applied by a caller holding a setter.
  */

  /** `playVideoForAll` — the room is shown a video. */
  videoStarted(url: string) {
    this.#videoPlayerUrl = url;
    this.#hideVideoPlayer = true;
  }

  /**
   * `stopVideoForAll` — and it clears the ARMED TIMER as well as the picture.
   *
   * The timer dies here rather than in the sender, so a stop sent by ANOTHER presenter cancels this
   * browser's pending play too. Clearing it only where the button is pressed would leave the first
   * presenter's video arriving minutes after the room was told it had been removed.
   */
  videoStopped() {
    this.#videoPlayerUrl = '';
    this.#scheduledVideoForAll = { videoURL: '', videoPlayTime: null };
    this.#hideVideoPlayer = false;
  }

  /**
   * `playYTForAll` — and the SECOND argument is the late-join seek, in seconds.
   *
   * ```js
   * subscribe("playYTForAll", e => { let i = 0;
   *   if (e.startTime) { let o = Number(e.startTime), s = Date.now();
   *     i = Math.round((s - o) / 1e3), this.startTime = i } else this.startTime = 0;
   *   this.ytURL = e.url })                                                   // byte 1,964,799
   * ```
   *
   * Zero for every live play, because the live command carries `url` alone (byte 1,024,137) and the
   * `else` branch is what runs. It is non-zero only on the replay a member gets when they JOIN a
   * room that is already playing, which is where `startTime` rides.
   *
   * The seconds are computed by the CALLER, not here, because the derivation reads `Date.now()` and
   * a store that reads the clock is a store whose value depends on when you look at it.
   */
  youtubeStarted(url: string, startSeconds = 0) {
    this.#youtubeForAllUrl = url;
    this.#youtubeStartSeconds = startSeconds;
  }

  /** `stopYTForAll`. No payload is read: the reference's own dispatch forwards none. */
  youtubeStopped() {
    this.#youtubeForAllUrl = '';
    /*
      The offset goes with the url. Leaving it behind would seek the NEXT video to wherever the last
      one had reached — the overlay's setter rebuilds the embed from `_ytURL` and `startTime`
      together (byte 1,503,095), so a stale offset is a real wrong position rather than dead state.
    */
    this.#youtubeStartSeconds = 0;
  }

  /** `playMP3ForAll` — room-wide, so unlike `giveMicScreen` there is no target to match on. */
  mp3Started(url: string | null) {
    this.#mp3Url = url;
    this.#mp3Playing = url !== null;
  }

  /** `stopMp3ForAll`. */
  mp3Stopped() {
    this.#mp3Url = null;
    this.#mp3Playing = false;
  }

  /**
   * `sendSalesImageToChat` — a presenter pins an image over the chat column.
   *
   * Receiver at byte 2502019: it adds `position-relative` to `.chat-box` and appends an
   * `#added-image-to-chat` div holding a close `<span>` and the url as both link and image. The
   * markup is transcribed at the render site in `AlertChatArea.svelte`, where the four already-
   * shipped CSS rules select it.
   *
   * **The presenter never sees their own image.** The dispatch guard is
   * `this.globals.isPresenter || emit(...)` (byte 1015228) — a guard, not a truthiness shorthand —
   * and it is the opposite of `softResetDone`, which deliberately returns to its sender. Reproduced
   * rather than normalised; the guard lives at the dispatch, where the capture puts it.
   */
  salesImageShown(url: string) {
    this.#salesImageUrl = url;
  }

  /**
   * The overlay's own close button — `onclick="removeImageFromChat()"` in the captured markup.
   *
   * A receiver rather than a setter, for this class's stated reason: a caller holding a setter can
   * half-apply a stop, and this value also drives `position-relative` on the pane around it.
   */
  salesImageDismissed() {
    this.#salesImageUrl = null;
  }

  async #sendPresenterFileCommand(cmd: 'playMP3ForAll' | 'stopMp3ForAll', url?: string) {
    try {
      await this.#commands.fileMedia({ cmd, url });
    } catch (cause) {
      this.#dialogs.alert = isHttpError(cause) ? cause.body.message : 'Command failed.';
    }
  }

  async #sendYoutubeForAllCommand(cmd: 'playYTForAll' | 'stopYTForAll', url?: string) {
    try {
      await this.#commands.youtube({ cmd, url });
    } catch (cause) {
      this.#dialogs.alert = isHttpError(cause) ? cause.body.message : 'Command failed.';
    }
  }

  async #sendVideoForAllCommand(
    cmd: 'playVideoForAll' | 'stopVideoForAll',
    url?: string,
    videoPlayTime?: number | null
  ) {
    try {
      await this.#commands.video({ cmd, url, videoPlayTime });
    } catch (cause) {
      this.#dialogs.alert = isHttpError(cause) ? cause.body.message : 'Command failed.';
    }
  }

  /** `playMp3ForAll(e) { sendServerAdminCommand('playMP3ForAll', { url: e }) }`. */
  async playMp3ForAll(url: string) {
    await this.#sendPresenterFileCommand('playMP3ForAll', url);
  }

  /** `stopMp3ForAll() { sendServerAdminCommand('stopMp3ForAll') }`. */
  async stopMp3ForAll() {
    await this.#sendPresenterFileCommand('stopMp3ForAll');
  }

  /**
   * The YouTube modal's Play button — `playYtVideo()`, byte 2,296,932.
   *
   * ```js
   * playYtVideo() {
   *   this.appService.sendServerAdminCommand('stopYTForAll', {url: this.youtubeURL});
   *   this.appService.sendServerAdminCommand('playYTForAll', {url: this.youtubeURL});
   * }
   * ```
   *
   * A stop and then a play, in that order, so a second video replaces the first cleanly. Both are
   * posted in ONE request — see the action — because two in-flight posts can be answered in either
   * order, and the inverted pair leaves every browser holding a torn-down overlay.
   *
   * This used to be `youtubeForAllUrl = url`, which played the video for the presenter alone.
   */
  async playYoutubeForAll(url: string) {
    await this.#sendYoutubeForAllCommand('playYTForAll', url);
  }

  /**
   * The overlay's "Stop For All" — `stopYTForAll() { sendServerAdminCommand('stopYTForAll') }`,
   * byte 1,503,220. Presenter-only in the markup, and re-checked on the server.
   */
  async stopYoutubeForAll() {
    await this.#sendYoutubeForAllCommand('stopYTForAll');
  }

  /**
   * The overlay's "×" — `closeYTFrame() { this.appService.guiEventBus.emit('stopYTForAll') }`,
   * byte 1,503,275.
   *
   * THE DISTINCTION IS THE POINT, and it is drawn by which bus the reference emits on: "Stop For
   * All" goes to the SERVER and takes the video off everyone's screen; "×" emits on the LOCAL gui
   * bus, so it dismisses this viewer's own iframe and nobody else's. That is also why "×" is not
   * presenter-gated in the markup and "Stop For All" is — a member must be able to close an
   * overlay sitting over their room, without taking it away from the room.
   *
   * Both were wired to the same function here, which collapsed the two into one and made the "×"
   * on a member's screen a no-op they had no authority to perform.
   */
  closeYoutubeFrame() {
    this.#youtubeForAllUrl = '';
    /* Same reason as `youtubeStopped`: the offset is part of the frame, not part of the room. */
    this.#youtubeStartSeconds = 0;
  }

  /**
   * "Play For All" → "Play now", and the moment an armed schedule fires.
   *
   * `sendServerAdminCommand('playVideoForAll', {url: e, videoPlayTime: null})`, byte 1,981,761.
   * Nothing is assigned locally: the broadcast comes back down the `cmds` channel to this browser
   * along with every other, which is the same rule the private chat note states — the sender learns
   * its own message from the channel and nobody inserts optimistically.
   */
  async playVideoForAll(url: string) {
    /* Playing now supersedes anything this presenter had armed, so the pending line goes with it. */
    this.clearScheduledVideoLine();
    await this.#sendVideoForAllCommand('playVideoForAll', url);
  }

  /**
   * "Choose time?" → "Send". POSTS the moment to the server and shows the presenter what is pending.
   *
   * `whenLocal` is the raw `datetime-local` value, kept as the string the reference keeps
   * (`this.scheduledVideo.videoPlayTime = i` before it is converted) because that is what the
   * "Video scheduled for:" line formats.
   *
   * A time already past plays immediately rather than never — `delay > 0` arms the timer, and a
   * finite non-positive delay falls through to the immediate path. An unparseable value arms
   * nothing and plays nothing, loudly: the pending line simply does not appear.
   */
  scheduleVideoForAll(url: string, whenLocal: string) {
    /*
      ── THE SCHEDULE IS THE SERVER'S NOW, 2026-09-01 ────────────────────────────────────────────

      This armed a `window.setTimeout` and posted when it fired, so closing the presenter's tab
      cancelled the play. That was `TODO.md`'s consequence 2 and it is closed: the moment is POSTED,
      the server holds it in `room_state.video_play_time`, and `sweepDueVideos` broadcasts when it
      arrives — which is exactly what the capture does. `sendServerAdminCommand("playVideoForAll",
      {url: e, videoPlayTime: i})` at byte 1,981,560 is posted the instant Send is pressed, and the
      dispatch forwards only `{url: i.url}` (byte 1,024,587), so the server is the only thing that
      could have been holding the time.

      `svelte-autofixer` suggests `SvelteDate` here and the suggestion is declined, recorded so the
      next run does not re-litigate it. `SvelteDate` exists to make date READS reactive; this one is
      parsed once, converted to a number on the same line and thrown away. Nothing reads it at all,
      let alone reactively.
    */
    const at = new Date(whenLocal).getTime();
    if (!Number.isFinite(at)) return;

    /*
      A past or due moment plays NOW rather than arming, which is what the previous local scheduler
      did (`delay <= 0`) and what the server does with one anyway. Kept on this side too so the
      pending line below never shows a time that has already gone.
    */
    if (at <= Date.now()) {
      void this.playVideoForAll(url);
      return;
    }

    /*
      The pending line is still LOCAL, and that is honest rather than lazy: it is what THIS presenter
      just armed, shown back to them so they can see it took. It is not a claim about room state —
      another presenter's armed play does not appear here, and upstream's does not either, because
      the value it renders from is the one its own Send populated.
    */
    this.#scheduledVideoForAll = { videoURL: url, videoPlayTime: whenLocal };
    void this.#sendVideoForAllCommand('playVideoForAll', url, at);
  }

  /**
   * "Stop For All" and "Remove Scheduled Video" — one command for both, byte 1,981,811.
   *
   * The armed timer is dropped when the command ARRIVES, not here, so that a stop sent by another
   * presenter cancels this browser's pending play too. See the `stopVideoForAll` case below.
   */
  async stopVideoForAll() {
    await this.#sendVideoForAllCommand('stopVideoForAll');
  }

  /**
   * Forget the pending line this presenter armed.
   *
   * ## It used to clear a TIMER, and there is no timer any more
   *
   * Until 2026-09-01 an armed play was a `window.setTimeout` in the presenter's own browser, and
   * this cleared it. The schedule is the SERVER's now — posted at Send, held in
   * `room_state.video_play_time`, broadcast by `sweepDueVideos` — which is what the capture does and
   * what makes a play survive the presenter closing their tab.
   *
   * So what is left to clear is the LINE: the local record of what this presenter just armed, shown
   * back to them so they can see it took. Renamed to what it does, because a method called
   * `clearScheduledVideoTimer` that clears no timer is the comment-that-lies this repository hunts.
   *
   * **Cancelling the actual play is `stopVideoForAll`'s**, and it works because `clearVideoForAll`
   * nulls both the url and the time — so a stop cancels an armed play server-side, for everyone,
   * including a play armed by a presenter who has since closed their browser. That was not possible
   * while the timer was local, and it is the second thing this change fixes.
   */
  clearScheduledVideoLine() {
    this.#scheduledVideoForAll = { videoURL: '', videoPlayTime: null };
  }
  /*
    SOUNDCLOUD FOR ALL — arrived from `+page.svelte` on 2026-08-17.

    It belongs here for the reason this class already states about the video player: this is where
    the room-wide "play for all" family lives. SoundCloud was the last member still on the page,
    beside `videoForAll`, `youtubeForAll` and the mp3 pair which are all methods here.

    ## The state is deliberately NOT moved with them, and that is recorded rather than tidy

    `soundCloudUrl` and `soundCloudPlaying` remain on `RoomMedia`, so they cross as the two
    receivers above. That is INCONSISTENT with `videoPlayerUrl` and `youtubeForAllUrl`, which live
    here — same feature family, two homes — and the inconsistency is real, not a subtlety.

    It was left because moving the state ripples through `PresentationArea` and `RoomNavbar`, which
    both read `media.soundCloudPlaying` and would each need a new prop. That is its own change with
    its own contract-test ripple, and folding it in would have made one commit that did two things.
  */

  /**
   * `playSoundCloudForAll()` — the prompt, its validation and the room-wide dispatch.
   *
   * The `https://soundcloud.com` prefix check is the capture's, and it is a PREFIX check
   * (`indexOf(...) !== 0`) rather than a parse: a share url from the app is always that origin, and
   * anything else is refused with the reference's own wording.
   */
  promptForSoundCloud(): void {
    this.#dialogs.prompt = {
      title:
        'You can play SoundCloud music for all. Click on "Share" from your track or playlist, copy and paste the share url here',
      value: '',
      onconfirm: (value) => {
        this.#dialogs.prompt = null;
        if (!value) return;
        if (value.indexOf('https://soundcloud.com') !== 0) {
          this.#dialogs.alert = 'Invalid SoundCloud URL...';
          return;
        }
        this.#setSoundCloudUrl(value);
        this.#setSoundCloudPlaying(true);
        this.#menus.set('soundcloud', false);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('playSoundCloudForAll', { detail: { url: value } }));
        }
      }
    };
  }

  /**
   * Stop it for the WHOLE ROOM — the flag and the broadcast.
   *
   * The url is deliberately left set. Only the flag clears, so a presenter who stops and starts
   * again keeps the track they had; nulling it here would lose it.
   */
  stopSoundCloud(): void {
    this.#setSoundCloudPlaying(false);
    this.#menus.set('soundcloud', false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('stopSoundCloudForAll', { detail: { url: null } }));
    }
  }

  /**
   * Stop it for THIS viewer only — the same two writes, and no broadcast.
   *
   * The absence of the dispatch is the entire difference between this and `stopSoundCloud`, which
   * is why they are two methods rather than one with a flag: a boolean argument here is one
   * mis-call away from silencing the room.
   */
  stopSoundCloudForMe(): void {
    this.#setSoundCloudPlaying(false);
    this.#menus.set('soundcloud', false);
  }
}
