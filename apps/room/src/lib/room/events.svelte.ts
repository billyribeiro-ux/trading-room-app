import { invalidate, invalidateAll } from '$app/navigation';

import { isMtxStream } from '$lib/mtx-streams';
import type { MtxStreamTabs } from '$lib/room-mtx.svelte';
import { formatUserLocation } from '$lib/roster-gates';
import { playSoundEffect } from '$lib/sound-effects';

import type { RoomBroadcasts } from './broadcasts.svelte';
import type { RoomMedia } from './media.svelte';
import type { RoomMediaTransport } from './media-transport.svelte';
import type { RoomPrefs } from './prefs.svelte';
import type { PrivateChatMessage } from './private-chat.svelte';
import type { RoomToasts } from './toasts.svelte';

/** What the stream reads off the loaded page data. Narrow on purpose: it consults, never owns. */
interface EventStreamSession {
  room: { shortCode: string };
  user: { id: number };
  sessData?: {
    userJoinAndLeavePopup?: boolean;
    beepOnUserJoin?: boolean;
    dingOnNewMessage?: boolean;
  } | null;
}

/** `setTimeout(…, 3e3)`. */
const RECONNECTED_FLASH_MS = 3000;
/**
 * The room's REALTIME CHANNEL, and the browser-side geolocation that rides beside it.
 *
 * Phase 5 slice 5. `subscribeToRoomEvents` was 575 lines — the single largest function left on the
 * page after slice 4 — and it is one subject: every frame the server pushes arrives here and is
 * routed, on six channels, to the class that owns the state it changes.
 *
 * **It is a ROUTER, and it owns almost nothing.** That is the shape, not an accident of extraction:
 * eleven collaborators are injected and exactly four fields travel, all four describing the
 * CONNECTION rather than the room. A frame about a poll answer does not teach this class what a
 * poll is; it calls `invalidateAll()` and the loader decides. That is why the file is 700 lines of
 * transcription and barely any state.
 *
 * **`invalidate` rather than a local push**, wherever the payload could have been believed: the
 * alert list is server-derived — it carries the sender's avatar, role and evidence state, joined in
 * `+page.server.ts` — so refetching keeps one source of truth instead of two shapes of the same
 * row. The event is the TRIGGER, not the payload. `changeChatMode` carries the new mode and it is
 * deliberately not read, because trusting it would put room policy in the gift of whatever arrives
 * on a socket.
 *
 * **`createSubscriber` was evaluated here and REJECTED, which is the opposite of what the phase
 * plan proposed, so the reason is recorded rather than the conclusion.** `roomEventsConnected` is
 * a getter over an external source and looked like the one honest candidate in this file. The docs
 * decide it: *"the returned teardown function will only be called when all effects are destroyed."*
 * That is correct for `MediaQuery`, whose `matchMedia` is free to re-create, and wrong here — it
 * would tie the life of the room's realtime connection to whether anything happens to be reading
 * the sidebar's indicator. The stream must run whether or not anyone is watching the light. A
 * `$state` field written by the two handlers we already own is both simpler and correct, and
 * `createSubscriber` is for integrating state you do NOT own.
 */
/*
  Three collaborators arrive as the NARROW SURFACE the stream uses, not as their whole class.

  `RoomRoster<Entry>`, `RoomPrivateChat<User>` and `RoomUserActions<User>` are each generic over a
  user shape, and this router touches none of it: it hands the roster a list it never inspects, the
  private chat one message, and reads a single boolean off the follow style. Threading three
  unrelated type parameters through a class that never reads a field of any of them would make the
  signature describe work this file does not do — and would make it impossible to test the router
  without building the whole object graph.

  So the dependency is on what is CALLED. `Entry` stays generic because the roster list genuinely
  passes through; the other two are structural.
*/
interface RosterSink<Entry> {
  countArrived(count: number): void;
  rosterArrived(users: readonly Entry[]): void;
}

interface PrivateChatSink {
  ingest(message: PrivateChatMessage): void;
}

interface FollowStyleSource {
  readonly followedUsers: Record<string, { followChatStyle?: { playSound?: boolean } } | undefined>;
}

export class RoomEventStream<Entry> {
  #roomEventsConnected: boolean;
  #hasConnectedBefore: boolean;
  #reconnectedFlash: boolean;
  constructor(options: {
    prefs: RoomPrefs;
    toasts: RoomToasts;
    media: RoomMedia;
    broadcasts: RoomBroadcasts;
    mediaTransport: RoomMediaTransport;
    mtx: MtxStreamTabs;
    roster: RosterSink<Entry>;
    privateChat: PrivateChatSink;
    userActions: FollowStyleSource;
    /** The loaded page data, through a thunk because the load can replace it. */
    session: () => EventStreamSession;
    isPresenter: () => boolean;
    /** Whether this tab is focused, which decides if a chat frame refetches or is deferred. */
    appHasFocus: () => boolean;
    /**
     * Rebuild the media session. Optional because the page only defines it once `onMount` has run,
     * and a `giveMicScreen` frame can arrive before that.
     */
    restartMediaSession: () => (() => Promise<void>) | null;
    /** `mainTab = …` — the tab strip is the page's, so this is a receiver rather than a field. */
    showTab: (tab: 'screens' | 'videoplayer') => void;
    /**
     * A chat frame arrived while the tab was hidden.
     *
     * A RECEIVER, not a field, because `missedChatWhileHidden` is written on BOTH sides of this
     * boundary — set here, cleared by the visibility handler that stayed on the page. A field
     * written on both sides is shared, not extracted; that is the rule slice 13 paid for with
     * `followedUsers`.
     */
    chatMissedWhileHidden: () => void;
  }) {
    this.#prefs = options.prefs;
    this.#toasts = options.toasts;
    this.#media = options.media;
    this.#broadcasts = options.broadcasts;
    this.#mediaTransport = options.mediaTransport;
    this.#mtx = options.mtx;
    this.#roster = options.roster;
    this.#privateChat = options.privateChat;
    this.#userActions = options.userActions;
    this.#session = options.session;
    this.#isPresenter = options.isPresenter;
    this.#appHasFocus = options.appHasFocus;
    this.#restartMediaSession = options.restartMediaSession;
    this.#showTab = options.showTab;
    this.#chatMissedWhileHidden = options.chatMissedWhileHidden;

    /**
     * Live connected count, from `/sess/{id}/roster/`.
     *
     * `handleRosterCmd` sets `globals.rosterCount = parseInt(i.data)` and the header badge renders
     * it. Seeded from the server-rendered roster so the badge is right before the first event
     * arrives, then kept current by the channel - previously it only ever showed the value baked in
     * at page load, so a member joining or leaving never changed it for anyone else.
     */
    /** Whether the SSE channel is up. The sidebar's "Chat" line reports it. */
    /**
     * `archivesAvailableTo()`, transcribed:
     *
     * ```js
     * return isPresenter && !media.limitedPresenter
     *   ? !(sessData.showArchivesToSpecificPresenters &&
     *       !sessData.showArchivesToSpecificPresenters.includes(user.email))
     *   : !(!sessData.showArchivesToUsers || user.denyArchivesAccess);
     * ```
     *
     * A full presenter gets archives unless an explicit allowlist exists and leaves them out;
     * everyone else needs the session to have opened archives to users AND not be individually
     * denied. Ours showed Archives to everybody unconditionally.
     */
    this.#roomEventsConnected = $state(false);

    /**
     * The "Conected" flash and its one-shot guard — `app-room.full.js:2035-2041`.
     *
     * `hasConnectedBefore` is a plain `let`, not `$state`: nothing renders from it, it only decides
     * whether an `open` is a RE-connect, and making it reactive would buy a dependency and no redraw.
     * `reconnectedFlash` is `$state` because the overlay's `display` follows it.
     *
     * The reference's misspelling — "Conected" — is in the markup and stays there.
     */
    this.#hasConnectedBefore = false;

    this.#reconnectedFlash = $state(false);
  }

  readonly #prefs: RoomPrefs;
  readonly #toasts: RoomToasts;
  readonly #media: RoomMedia;
  readonly #broadcasts: RoomBroadcasts;
  readonly #mediaTransport: RoomMediaTransport;
  readonly #mtx: MtxStreamTabs;
  readonly #roster: RosterSink<Entry>;
  readonly #privateChat: PrivateChatSink;
  readonly #userActions: FollowStyleSource;
  readonly #session: () => EventStreamSession;
  readonly #isPresenter: () => boolean;
  readonly #appHasFocus: () => boolean;
  readonly #restartMediaSession: () => (() => Promise<void>) | null;
  readonly #showTab: (tab: 'screens' | 'videoplayer') => void;
  readonly #chatMissedWhileHidden: () => void;

  get connected(): boolean {
    return this.#roomEventsConnected;
  }

  /** The "Conected" overlay's own flag — the sidebar renders `display` straight off it. */
  get reconnectedFlash(): boolean {
    return this.#reconnectedFlash;
  }

  /**
   * The room's realtime channel - the half that makes this a room rather than a page.
   *
   * The capture subscribes to `/sess/{sessionID}/alerts/` (and nine sibling channels) over
   * SocketCluster and drains each with `for await`, pushing every message into `alertsLog` /
   * `chatLog` and re-emitting it on its event bus. This room subscribed to nothing: an alert a
   * presenter posted was invisible to every other member until that member reloaded, because
   * `invalidateAll()` only ever ran after the acting user's own submission.
   *
   * `invalidate` rather than a local push: the alert list is server-derived (it carries the
   * sender's avatar, role and evidence state, joined in `+page.server.ts`), so refetching keeps
   * one source of truth instead of two shapes of the same row. The event is the trigger, not the
   * payload - which is also why a message this peer caused is skipped, since its own action has
   * already invalidated.
   */
  subscribe() {
    if (typeof EventSource === 'undefined') return () => {};

    /*
      This room's own channel, not the constant `ptr-room`.

      The capture's paths are `/sess/{sessionID}/…` because it hosts many rooms, and so does this
      now. `data.room.shortCode` comes from the controller with the rest of the configuration, so
      it is what the session was actually handed off into - a client cannot put itself in another
      room by editing the URL, because the SERVER keys the subscription off the session too.
    */
    const source = new EventSource(
      `/sess/${encodeURIComponent(this.#session().room.shortCode)}/events`
    );

    source.addEventListener('message', (event) => {
      // No initialiser: the `catch` returns, so a value here could never be read.
      let payload: {
        channel?: string;
        data?: Record<string, unknown>;
        /** Set only on the `chat` channel, and only for the listener it was built for. */
        isMention?: boolean;
      };
      try {
        payload = JSON.parse((event as MessageEvent<string>).data);
      } catch {
        // A malformed frame must not kill the stream; the next one may be fine.
        return;
      }
      if (!payload?.channel) return;

      /*
        The command channel does not refetch - it ACTS.

        `remotePresCommand` is carried out by the peer it names, not by the presenter who sent it:
        `case "mutemic": muteMic()`, `case "mutecam": stopCam()`, `case "mutescreens":
        stopSharingAll()`. So a member's own browser is what turns their microphone off, which is
        also why the authority to send it is checked on the server rather than here.
      */
      if (payload.channel === 'cmds') {
        const command = payload.data as
          | {
              cmd?: string;
              subCmd?: string;
              targetUserId?: number;
              recName?: string;
              /** `giveMicScreen`'s payload: `{give: boolean}`. */
              give?: boolean;
              /** `playMP3ForAll`'s payload: `{url}`. Room-wide, so it carries no target. */
              url?: string;
              /** `focusOnScreen` — the producer id of the screen to move to. */
              screenId?: string;
              /**
               * `mtxStartStream` / `mtxStopStream` carry the stream under `muser` — the reference's
               * own key (byte 1010826), and the reason `mtx-streams.ts` describes an MTX stream as
               * "simply another muser". Typed `unknown` because `isMtxStream` is what decides.
               */
              muser?: unknown;
              /** `getSessionMTXMediaState`'s full list. Same reason: validated, not asserted. */
              data?: unknown;
            }
          | undefined;

        /*
          The room's media.recording state, for EVERYONE in it. Verbatim:

            subscribe("startRec",  i => { roomState.isRecording = !0;
              !prefs.doNotDisturbOn && prefs.recordingStartSound && !videoOnlyMode && recordingStart.play() })
            subscribe("stopRec",   i => { roomState.isRecording = !1;
              !prefs.doNotDisturbOn && prefs.recordingStopSound  && !videoOnlyMode && recordingStop.play() })
            subscribe("pauseRec",  () => { roomState.isRecordingPaused = !0;
              !prefs.doNotDisturbOn && prefs.recordingStopSound && recordingStop.play() })
            subscribe("resumeRec", () => { roomState.isRecordingPaused = !1;
              !prefs.doNotDisturbOn && prefs.recordingStopSound && recordingStart.play() })

          Two quirks kept because they are the capture's: pause and resume BOTH check
          `prefs.recordingStopSound` (resume plays the start sound behind the stop preference), and
          neither checks `videoOnlyMode` where start and stop do.
        */
        if (command?.cmd === 'startRec') {
          this.#media.roomRecordingStarted(command.recName ?? '');
          if (!this.#prefs.doNotDisturbOn && this.#prefs.recordingStartSound)
            playSoundEffect('recordingStart');
          return;
        }
        if (command?.cmd === 'stopRec') {
          this.#media.roomRecordingStopped();
          if (!this.#prefs.doNotDisturbOn && this.#prefs.recordingStopSound)
            playSoundEffect('recordingStop');
          return;
        }
        if (command?.cmd === 'pauseRec') {
          this.#media.roomRecordingPauseChanged(true);
          if (!this.#prefs.doNotDisturbOn && this.#prefs.recordingStopSound)
            playSoundEffect('recordingStop');
          return;
        }
        if (command?.cmd === 'resumeRec') {
          this.#media.roomRecordingPauseChanged(false);
          if (!this.#prefs.doNotDisturbOn && this.#prefs.recordingStopSound)
            playSoundEffect('recordingStart');
          return;
        }

        /*
          `case "giveMicScreen": P("giveMicScreen give: " + i.give);
                                 appEventBus.emit("giveMicScreen", i)`

          Its own top-level command carrying `{give}`, NOT a `remotePresCommand` subCmd - an
          earlier version of this dispatched it as one, which no sender would ever have matched.

          The subscriber assigns three things in one statement:
          `globals.user.isPresenter = globals.isLimitedPresenter = globals.isPresenter = e.give`.
          So being handed mic and screen makes a member a LIMITED presenter - presenter enough to
          speak and share, not enough for the archives or the administrative half of the user-info
          modal, both of which read `isPresenter && !media.limitedPresenter`. Taking it away puts them
          back.
        */
        if (command?.cmd === 'giveMicScreen') {
          if (command.targetUserId !== this.#session().user.id) return;
          this.#media.micScreenGranted(command.give === true);
          /*
            The recipient is told, in the reference's own words. From offset 2499228:

              appEventBus.subscribe('giveMicScreen', i =>
                i.give ? alertsService.success('You can now Talk / Screenshare')
                       : alertsService.error('You can no longer Talk / Screenshare'))

            `success` and `error`, not one skin for both — losing a capability is not good news, and
            the capture colours it accordingly.
          */
          this.#toasts.show({
            kind: command.give === true ? 'success' : 'error',
            message:
              command.give === true
                ? 'You can now Talk / Screenshare'
                : 'You can no longer Talk / Screenshare',
            enableHtml: false
          });
          /*
            The media actually restarts now — `TODO.md` gap 22. The capture's own handler:

              disconnectAll(), setTimeout(() => initWithGlobalsAndEventHandler(...), 3e3)

            The 3-second delay is the capture's, kept rather than tuned: the server tears the peer
            down when the socket's session ends, and reconnecting into a teardown that has not
            finished is how you get two peers for one person.

            **TAKING mic/screen away works completely.** The rebuild closes every producer this peer
            held, so a member who was talking stops, immediately and server-side.

            **GIVING is still half a feature, and the reason is architectural rather than a
            forgotten line.** The SFU decides who may produce from the GRANT's role, and
            `/api/media/grant` mints that from the CONTROLLER's membership —
            `joinsMediaAsProducer(isPresenter || hasCam || hasMic || hasScreen)`, read from
            `readRoomConfig`. `media.limitedPresenter` is runtime state that never touches the
            membership, so a rebuilt session re-mints the SAME `member` grant and the SFU answers
            `forbidden` to `produce`.

            Closing that needs a decision nobody has taken, and it is not ours to invent: either
            `giveMicScreen` writes `hasMic`/`hasScreen` onto the membership — durable, works, and
            diverges from the capture's explicitly transient model — or the grant learns to carry a
            runtime elevation, which means the client asserting its own authority. Recorded in
            `TODO.md` rather than guessed at.
          */
          const restart = this.#restartMediaSession();
          if (restart) {
            setTimeout(() => void restart(), 3000);
          }
          return;
        }

        /*
          `playMP3ForAll` / `stopMp3ForAll` — a sound every browser in the room plays.

          Room-wide, so unlike `giveMicScreen` there is no `targetUserId` to match on: everybody
          who receives it plays it, which is the whole point of "For All".
        */
        if (command?.cmd === 'playMP3ForAll') {
          this.#broadcasts.mp3Started(typeof command.url === 'string' ? command.url : null);
          return;
        }
        if (command?.cmd === 'stopMp3ForAll') {
          this.#broadcasts.mp3Stopped();
          return;
        }

        /*
          `playVideoForAll` / `stopVideoForAll`, verbatim (bytes 1,966,711 and 1,966,882):

            subscribe("playVideoForAll", e => { this.videoPlayerUrl = e.url;
              this.hideVideoPlayer = !0;
              this.isP || this.onMainTabChange("presAreaTabs-videoplayer") })
            subscribe("stopVideoForAll", () => { this.videoPlayerUrl = "";
              this.scheduledVideo.videoURL = ""; this.scheduledVideo.videoPlayTime = null;
              this.hideVideoPlayer = !1;
              this.isP || this.onMainTabChange("presAreaTabs-screens") })

          Room-wide, so no `targetUserId` to match on. The tab move is for NON-presenters only, and
          the reason is visible in the gate it pairs with: a presenter is already able to reach the
          VideoPlayer tab whenever they like, while a member's tab exists only while
          `hideVideoPlayer` is true — dragging them there is what makes it reachable at all, and
          putting them back on screens is what stops them staring at an empty pane afterwards.
        */
        if (command?.cmd === 'playVideoForAll') {
          if (typeof command.url !== 'string') return;
          this.#broadcasts.videoStarted(command.url);
          if (!this.#isPresenter()) this.#showTab('videoplayer');
          return;
        }
        if (command?.cmd === 'stopVideoForAll') {
          /*
            The armed timer dies here rather than in the sender, so that a stop sent by ANOTHER
            presenter also cancels this browser's pending play. Clearing it only where the button
            is pressed would leave the first presenter's video arriving minutes after the room was
            told it had been removed.
          */
          this.#broadcasts.videoStopped();
          if (!this.#isPresenter()) this.#showTab('screens');
          return;
        }

        /*
          `playYTForAll` / `stopYTForAll` — the floating overlay, on every screen in the room.

            case "playYTForAll": this.guiEventBus.emit("playYTForAll", {url: i.url});
            case "stopYTForAll": this.guiEventBus.emit("stopYTForAll");

          THE SEEK POSITION IS DERIVED, NEVER SENT. The subscriber at byte 1,964,799 is

            let i = 0;
            if (e.startTime) { let o = Number(e.startTime); i = Math.round((Date.now() - o) / 1e3) }
            else this.startTime = 0;

          and `startTime` is absent from the live command above — it arrives only on the late-join
          replay, `emit("playYTForAll", {url: roomState.ytURL, startTime: roomState.ytStartTime})`
          at byte 1,965,054. That replay needs a persisted room video state, which this room does
          not have, so the offset here is always the live command's 0 and no `start=` is appended.
          The gap is recorded in `TODO.md`. What must NOT happen is a `startTime` invented onto the
          wire to make the branch look implemented: the value is a function of when the room
          started playing, and nothing here knows that.
        */
        if (command?.cmd === 'playYTForAll') {
          if (typeof command.url === 'string') this.#broadcasts.youtubeStarted(command.url);
          return;
        }
        if (command?.cmd === 'stopYTForAll') {
          // No payload is read. A url rides with the stop that precedes a play (byte 2,296,932)
          // and the reference's dispatch forwards none of it.
          this.#broadcasts.youtubeStopped();
          return;
        }

        if (command?.cmd === 'changeChatMode') {
          /*
            The one command on this channel that refetches instead of acting, and the reason is in
            the note on `chatMode` above: it is room STATE, held in `room_state` and read by the
            load, so the row stays the only authority. The broadcast carries the new mode as well,
            and it is deliberately NOT read here — trusting it would put room policy in the gift of
            whatever arrives on a socket.
          */
          void invalidateAll();
        }
        if (command?.cmd === 'focusOnScreen') {
          /*
            A presenter pulled the room to a screen. `selectScreenTabOfId` rather than assigning
            `selectedScreenTab`, because it HONOURS THE LOCK — a member who has locked a screen is
            not dragged off it, which is the same rule `addRemoteScreen` relies on.

            No re-broadcast from here. Upstream that guard is the `i` parameter of
            `onScreenShareTabChange(e, i = !0)`, which callers pass false for programmatic changes;
            here the equivalent is simply that only the user-initiated tab click broadcasts.
          */
          if (typeof command.screenId === 'string')
            this.#mediaTransport.selectScreenTabOfId(command.screenId);
          return;
        }

        /*
          The three MediaMTX commands. TWO NAMES HERE ARE NEARLY IDENTICAL AND ARE NOT THE SAME
          THING — this cost a wrong first draft and is written down so it costs nobody else one:

            `getSessionMTXMediaState`  — MTX in the MIDDLE. The WIRE command, both directions. The
                                         client SENDS it bare to ask for the list, and the server
                                         REPLIES with the same name carrying `data`.
            `getSessionMediaStateMTX`  — MTX at the END. An INTERNAL bus event upstream, emitted
                                         with no payload after the reply has been stored in
                                         `globals.roomMediaStateMTX`.

          Decoded at bundle byte 1013960:

            case "getSessionMTXMediaState":
              this.globals.roomMediaStateMTX = i.data,
              this.appEventBus.emit("getSessionMediaStateMTX"); break;

          and byte 989729: `subscribe("fetchSessionMediaStateMTX", () => this.send("getSessionMTXMediaState"))`.

          There is no `globals` here, so the payload goes straight to the reducer and the internal
          event has nothing left to do — one hop instead of three, with no behaviour lost.
        */
        if (command?.cmd === 'mtxStartStream') {
          // `case "mtxStartStream": emit("mtxStartStream", i.muser)` — the key is `muser`, byte 1010826.
          if (isMtxStream(command.muser)) this.#mtx.started(command.muser);
          return;
        }
        if (command?.cmd === 'mtxStopStream') {
          if (isMtxStream(command.muser)) this.#mtx.stopped(command.muser);
          return;
        }
        if (command?.cmd === 'getSessionMTXMediaState') {
          /*
            The full list, and a REPLACE rather than a merge — `this.mtxStreams =
            this.globals.roomMediaStateMTX`. Non-array payloads are ignored rather than coerced to
            `[]`, because an empty list is a meaningful state (it renders "No one is streaming right
            now...") and a malformed frame must not be allowed to assert it.
          */
          if (Array.isArray(command.data)) {
            this.#mtx.replaceFromSession(command.data.filter(isMtxStream));
          }
          return;
        }

        if (command?.cmd !== 'remotePresCommand') return;
        // Addressed to one member; everyone else ignores it.
        if (command.targetUserId !== this.#session().user.id) return;

        if (command.subCmd === 'mutemic' && !this.#media.micMuted)
          void this.#mediaTransport.toggleMicrophone();
        if (command.subCmd === 'mutecam' && !this.#media.camMuted)
          void this.#mediaTransport.toggleWebcam();
        if (command.subCmd === 'mutescreens') this.#mediaTransport.stopScreenSharing();
        return;
      }

      /*
        `/roster/` - `handleRosterCmd`'s only load-bearing case:
          case "getRosterCount": this.globals.rosterCount = parseInt(i.data)
        Its sibling `getRosterQueue` logs and does nothing else, so it is not reproduced.
      */
      if (payload.channel === 'roster') {
        /*
          `frame`, not `roster` — the name it had until 2026-08-15, when `RoomRoster` took that
          identifier at the top of the file. A local `const roster` here would have shadowed the
          class for the whole block, and every write below would have gone to a payload object
          instead of the room. Renamed rather than aliased, because the payload is a frame and was
          never the roster.
        */
        const frame = payload.data as
          | {
              cmd?: string;
              data?: number;
              users?: Entry[];
              /** `onUserJoin` / `onUserLeave` carry the person, not a count. */
              userId?: number;
              nick?: string;
            }
          | undefined;
        if (frame?.cmd === 'getRosterCount' && typeof frame.data === 'number') {
          this.#roster.countArrived(frame.data);
        }
        /*
          `onUserJoin` / `onUserLeave` — `app-room.full.js:2134-2155`, verbatim in shape:

            isPresenter && user.userXrefID !== i.userXrefID && (
              sessData.userJoinAndLeavePopup && preferences.popupOnUserJoin
                && alertsService.info(`${i.nick} logged in.`),
              sessData.beepOnUserJoin && preferences.beepOnUserJoin
                && !preferences.doNotDisturbOn && soundEffectsService.userJoin.play())

          Four things about that are load-bearing:

          * PRESENTER ONLY. A member is not told who came and went.
          * NEVER YOURSELF — `user.userXrefID !== i.userXrefID`. Opening the room would otherwise
            announce your own arrival to you.
          * TWO GATES PER EFFECT, and they are different gates. The popup needs the ROOM setting
            `userJoinAndLeavePopup` and the VIEWER preference `prefs.popupOnUserJoin`; the beep needs the
            room's `prefs.beepOnUserJoin` and the viewer's `prefs.beepOnUserJoin`. An owner can turn the feature
            off for the room, and a presenter can turn it off for themselves.
          * `info` for a join, `warning` for a leave — the reference uses two different toast skins,
            and the strings are "logged in." / "logged out." with the full stop.

          THE QUIRK, reproduced: the LEAVE beep reads `sessData.beepOnUserJoin`, not a
          `prefs.beepOnUserLeave` room setting. There is no such room setting upstream — only the viewer
          preference is per-direction. Transcribed rather than tidied.
        */
        if (
          (frame?.cmd === 'onUserJoin' || frame?.cmd === 'onUserLeave') &&
          typeof frame.userId === 'number'
        ) {
          const joined = frame.cmd === 'onUserJoin';
          if (!this.#isPresenter() || frame.userId === this.#session().user.id) return;
          const nick = typeof frame.nick === 'string' ? frame.nick : '';

          if (
            this.#session().sessData?.userJoinAndLeavePopup &&
            (joined ? this.#prefs.popupOnUserJoin : this.#prefs.popupOnUserLeave)
          ) {
            this.#toasts.show({
              kind: joined ? 'info' : 'warning',
              message: `${nick} logged ${joined ? 'in' : 'out'}.`,
              enableHtml: false
            });
          }
          if (
            this.#session().sessData?.beepOnUserJoin &&
            (joined ? this.#prefs.beepOnUserJoin : this.#prefs.beepOnUserLeave) &&
            !this.#prefs.doNotDisturbOn
          ) {
            playSoundEffect(joined ? 'userJoin' : 'userLeave');
          }
          return;
        }
        // `getRoster` -> `globals.roster`, which is what the sidebar list and
        // `checkUserOnlineStatus` both read in the capture.
        if (frame?.cmd === 'getRoster' && Array.isArray(frame.users)) {
          /*
            `subscribe("getRoster", () => { this.visibleRoster = globals.roster; this.userSearchTermTxt = "" })`

            The list, the search snapshot and the term are ONE method, because a fresh roster clears
            the search rather than re-filtering it. Without that, a search run once would pin the
            sidebar to that snapshot for the rest of the session — people who joined afterwards
            would never appear, because nothing else ever reassigns it.
          */
          this.#roster.rosterArrived(frame.users);
        }
        return;
      }

      /*
        `/cmdsAdmin/` - `handleServerCmdAdmin` carries exactly one command, and only presenters
        subscribe to it, so a member answering a poll is not broadcast to the room.
      */
      if (payload.channel === 'cmdsAdmin') {
        const admin = payload.data as { cmd?: string } | undefined;
        if (admin?.cmd === 'gotPollAnswer' && this.#isPresenter()) void invalidateAll();
        return;
      }

      /* `/privCmdsIn/{uid}-{id}/` - emits `forceReload` and `unmuteChat`, addressed to one member. */
      if (payload.channel === 'privCmds') {
        const command = payload.data as { cmd?: string; targetUserId?: number } | undefined;
        if (command?.cmd === 'forceReload' && command.targetUserId === this.#session().user.id) {
          location.reload();
        }
        /*
          The capture's receiver toast for the unmute, verbatim: `Chat enabled`. It is a plain
          info toast, not the presenter's `user chat unmuted` - those are two different strings on
          two different screens and collapsing them would put the presenter's wording in front of
          the member.

          `invalidateAll()` is what actually re-opens the composer: `chatMutedTill` is read on the
          server, so the gate does not lift until the loader runs again. Toasting without it would
          tell the member they can type while the box stayed disabled.
        */
        if (command?.cmd === 'unmuteChat' && command.targetUserId === this.#session().user.id) {
          this.#toasts.show({ kind: 'info', message: 'Chat enabled', enableHtml: false });
          void invalidateAll();
        }
        return;
      }

      /*
        `/privChatIn/{uid}/` - a private message. Delivered to BOTH parties, so this fires for our
        own outgoing message too; `isMine` decides which side it belongs on, exactly as the capture
        does:

          let isMine = te.uid == myUserID;
          let peer = isMine ? te.recvdID : te.uid;
          privChatLog[peer].push(te);
          appEventBus.emit("privChatIn", te);

        The message travels with the event, so nothing has to refetch a thread to learn one line.
      */
      if (payload.channel === 'privChat') {
        const priv = payload.data as
          { toUserId?: number; message?: PrivateChatMessage } | undefined;
        if (priv?.toUserId !== this.#session().user.id) return;
        // A delete publishes without a message: the peer's copy is gone, so drop ours.
        if (!priv.message) {
          void invalidateAll();
          return;
        }
        this.#privateChat.ingest(priv.message);
        return;
      }

      // Our own post already refetched. Re-invalidating would refetch twice per alert.
      if (payload.data?.senderId === this.#session().user.id) return;

      /*
        The chat ding, transcribed from `app-chat.compiled.js:112-137`:

          !preferences.doNotDisturbOn && preferences.chatSoundOn
            ? userActions.followedUsers[e.avt].followChatStyle.playSound
                ? pling.play()
                : ((playChatMessageSoundFor.length && hashEmail(user.email) !== e.avt
                     && playChatMessageSoundFor.includes(e.avt))
                   || (sessData.dingOnNewMessage && hashEmail(user.email) !== e.avt))
                  && followed.play()

        Three things about it are worth stating, because each is easy to get wrong:

        * **A followed user wins, and plays a DIFFERENT sound.** `pling`, not `followed` — the
          per-user preference outranks the room-wide setting, and it is the only branch that does.
        * **`followed` is the sound for an ordinary new message.** The name is the reference's, and
          it is confusing: the sound file called "followed" is what the ROOM-WIDE ding uses, while
          a followed user gets "pling".
        * **Never for your own message.** The reference compares `hashEmail(user.email) !== e.avt`;
          the `senderId` guard directly above already does that here, so the check is not repeated.

        `playChatMessageSoundFor` — the per-email list — is NOT implemented. It is a room setting
        holding member email addresses, and the reference compares it against `e.avt`, an email
        HASH, so honouring it means the server sending hashed addresses rather than the raw list.
        Sending raw member emails to every browser to decide a sound would be the wrong trade;
        recorded rather than quietly skipped.
      */
      if (payload.channel === 'chat' && !this.#prefs.doNotDisturbOn && this.#prefs.chatSoundOn) {
        const senderHash = (payload.data as { senderEmailHash?: string } | undefined)
          ?.senderEmailHash;
        const followStyle = senderHash
          ? this.#userActions.followedUsers[senderHash]?.followChatStyle
          : undefined;
        if (followStyle?.playSound) playSoundEffect('pling');
        else if (this.#session().sessData?.dingOnNewMessage) playSoundEffect('followed');
      }

      /*
        `prefs.visibilityChangeEnabled && !appHasFocus` — do not re-read the room for a hidden tab.

        The DING above has already played, so a followed user is still heard on a hidden tab; what
        is skipped is the full refetch. `missedChatWhileHidden` records that there is something to
        catch up on, so returning to a tab where nothing happened costs nothing.

        **A MENTION PIERCES THE GATE, and it is the SERVER that says so.** Upstream keeps mentions
        alive on this branch — `visibilityChangeEnabled && !appHasFocus ? te.isMention &&
        emit('chatMsg', te) : push(...)` — and this room could not, because the popup is an
        `$effect` on the page reading `data.messages` (`mentionArrivals.fresh(data.messages)`) and
        `data.messages` only changes when the loader runs, which is exactly what the return below
        skips. So a member addressed by name waited until they came back.

        The reference computes `isMention(te)` on the client off `te.txt`, and this room cannot: its
        `subscribe(path)` is per CHANNEL while this hub's stream is per ROOM, so a frame carrying
        message text would put admin chat on every subscriber's wire. `publishChatToRoom` therefore
        answers the question in the hub, per recipient, against the name each listener joined with —
        the same `isMentionOf` rule this room already uses for the highlight. One bit about your own
        name, and the body never leaves the process.

        History, because the shape of the miss is worth keeping: the sentence that stood here said
        "the MENTION path above has already run", describing an ordering that never existed, and the
        contract meant to hold it compared the SOURCE POSITION of this gate against that of the
        `$effect` — which says nothing about execution order and could never have failed. Both were
        found in Phase 5 slice 5 by moving the handler into another file, where a cross-file index
        comparison is obviously meaningless.
      */
      if (this.#prefs.visibilityChangeEnabled && !this.#appHasFocus()) {
        this.#chatMissedWhileHidden();
        /*
          `!== true` rather than a falsy test: the field is optional on the wire, and a frame from a
          publisher that has not learned to send it must behave as it did before rather than
          announce every message as a mention.
        */
        if (payload.isMention !== true) return;
      }

      void invalidateAll();
    });

    // The sidebar reports this, so it has to be observable and not just logged.
    source.addEventListener('open', () => {
      /*
        `subscribe('reconnectedSocket', …)` — `app-room.full.js:2035-2041`:

          un('#connectedMsg').show(),
          setTimeout(() => { un('#connectedMsg').hide() }, 3e3),
          this.appService.loadSessionLogs()

        `#connectedMsg` was rendered here as a static `display: none` div and nothing ever showed
        it, so the room had the reassurance markup and never gave the reassurance. Its own scoped
        rule is `#connectedMsg { display: none }` (`app-room.component.css`), which is why the
        reference reaches for an inline `display` rather than a class — reproduced with a bound
        style for the same reason.

        RE-connect only, never the first. The event upstream is named `reconnectedSocket` and the
        message reads "Conected", which is an answer to having been disconnected; firing it on the
        first open of a fresh page would announce a recovery that never happened. `EventSource`
        re-fires `open` on every retry, so the flag is what distinguishes them.

        `loadSessionLogs()` is this room's `invalidate('room:data')` — the same "catch up on what
        was missed" the reference does, through the identifier the five-second poll already uses.
      */
      const isReconnect = this.#roomEventsConnected === false && this.#hasConnectedBefore;
      this.#roomEventsConnected = true;
      this.#hasConnectedBefore = true;

      if (!isReconnect) return;
      this.#reconnectedFlash = true;
      globalThis.setTimeout(() => {
        this.#reconnectedFlash = false;
      }, RECONNECTED_FLASH_MS);
      // `invalidate` directly rather than the poll's `refreshRoom`, which is scoped to `onMount`
      // and does not exist yet when this subscription is created.
      void invalidate('room:data').catch(() => {
        // A catch-up that fails is not worth an error in the room; the poll retries in 5s.
      });
    });

    source.addEventListener('error', () => {
      // EventSource reconnects on its own; log once rather than swallowing it entirely, because a
      // permanently dead channel looks exactly like a quiet room.
      this.#roomEventsConnected = false;
      console.warn('[room-events] channel interrupted; the browser will retry');
    });

    return () => source.close();
  }

  /**
   * The member's own city, resolved in the BROWSER and posted back for the roster.
   *
   * Faithful to the reference, which calls `reallyfreegeoip.org` over JSONP — a `<script>` tag, not
   * `fetch`, because the host serves no CORS headers. `ip-api.com` appears in the reference only as
   * a clickable link inside the User Info modal and is NOT the geolocation API; wiring that instead
   * is the obvious wrong guess.
   *
   * **Privacy cost, stated rather than buried:** every member's browser discloses their IP to a
   * third party with no SLA. Resolving it server-side from the connection would produce the same
   * roster line without that disclosure. Matching the reference is the current instruction and this
   * is on the improvement list, not forgotten.
   *
   * Failure is silent by design: no location simply means no line under the name, which is exactly
   * what a room whose members block third-party scripts already shows.
   */
  resolveOwnLocation(): () => void {
    if (typeof document === 'undefined') return () => {};

    const callback = `ptrGeo${Math.floor(Math.random() * 1e9)}`;
    const script = document.createElement('script');
    let settled = false;

    const cleanUp = () => {
      if (settled) return;
      settled = true;
      delete (window as unknown as Record<string, unknown>)[callback];
      script.remove();
    };

    (window as unknown as Record<string, unknown>)[callback] = (location: unknown) => {
      const locStr = formatUserLocation(location as Parameters<typeof formatUserLocation>[0]);
      cleanUp();
      if (!locStr) return;
      void fetch('/api/roster/location', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ locStr })
      }).catch(() => {
        // The roster line is cosmetic; a failed post must not surface as an error in the room.
      });
    };

    script.src = `https://reallyfreegeoip.org/json/?callback=${callback}`;
    script.onerror = cleanUp;
    document.head.append(script);
    return cleanUp;
  }
}
