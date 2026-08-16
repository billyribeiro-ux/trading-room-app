import { isHttpError } from '@sveltejs/kit';

import type { RoomDialogs } from './dialogs.svelte';

/** The three wire commands this class sends, injected so it needs no route import and stays testable. */
export interface RoomBroadcastCommands {
  video: (payload: {
    cmd: 'playVideoForAll' | 'stopVideoForAll';
    url?: string;
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
  readonly #commands: RoomBroadcastCommands;
  #youtubeForAllUrl;
  #videoPlayerUrl;
  #hideVideoPlayer;
  #scheduledVideoForAll;
  #scheduledVideoTimer: number | undefined;
  #mp3Playing;
  #mp3Url;

  constructor(options: { dialogs: RoomDialogs; commands: RoomBroadcastCommands }) {
    this.#dialogs = options.dialogs;
    this.#commands = options.commands;

    this.#youtubeForAllUrl = $state('');

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

    /*
      The armed play, held in the presenter's OWN browser.

      Upstream this timer is the server's: `playVideoForAll` is posted at the moment the presenter
      presses Send, carrying `videoPlayTime`, and the session record holds the pair until it fires
      (the late-join replay reads it back at byte 1,967,430). This room has no store for that and no
      server-side scheduler, so the browser that armed it is the one that posts when it fires. The
      consequences are real and recorded in `TODO.md`: closing the tab cancels the play, and a member
      who joins after a video started does not see it.
    */
    this.#scheduledVideoTimer = undefined;

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
  }

  get youtubeForAllUrl() {
    return this.#youtubeForAllUrl;
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
    this.clearScheduledVideoTimer();
    this.#videoPlayerUrl = '';
    this.#scheduledVideoForAll = { videoURL: '', videoPlayTime: null };
    this.#hideVideoPlayer = false;
  }

  /** `playYTForAll`. The seek offset is derived and never sent — see `playYoutubeForAll`. */
  youtubeStarted(url: string) {
    this.#youtubeForAllUrl = url;
  }

  /** `stopYTForAll`. No payload is read: the reference's own dispatch forwards none. */
  youtubeStopped() {
    this.#youtubeForAllUrl = '';
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

  async #sendVideoForAllCommand(cmd: 'playVideoForAll' | 'stopVideoForAll', url?: string) {
    try {
      await this.#commands.video({ cmd, url });
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
    this.clearScheduledVideoTimer();
    this.#scheduledVideoForAll = { videoURL: '', videoPlayTime: null };
    await this.#sendVideoForAllCommand('playVideoForAll', url);
  }

  /**
   * "Choose time?" → "Send". Arms the play locally and shows the presenter what is pending.
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
    this.clearScheduledVideoTimer();

    /*
      `svelte-autofixer` suggests `SvelteDate` here and the suggestion is declined, recorded so the
      next run does not re-litigate it. `SvelteDate` exists to make date READS reactive — reading it
      inside an effect or a derived re-runs when the date changes. This one is parsed once, converted
      to a number on the same line, and thrown away; nothing reads it at all, let alone reactively.
      Same trade as the timer map in `RoomToasts` and the room's eight copy-on-write `new Set()`
      sites: a signal per instance, and no pixel changes.
    */
    const delay = new Date(whenLocal).getTime() - Date.now();
    if (!Number.isFinite(delay)) return;
    if (delay <= 0) {
      void this.playVideoForAll(url);
      return;
    }

    this.#scheduledVideoForAll = { videoURL: url, videoPlayTime: whenLocal };
    this.#scheduledVideoTimer = window.setTimeout(() => {
      this.#scheduledVideoTimer = undefined;
      void this.playVideoForAll(url);
    }, delay);
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

  clearScheduledVideoTimer() {
    if (this.#scheduledVideoTimer !== undefined) window.clearTimeout(this.#scheduledVideoTimer);
    this.#scheduledVideoTimer = undefined;
  }
}
