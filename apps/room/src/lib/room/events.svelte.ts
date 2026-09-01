import { arrivalSoundFor } from '#lib/chat-arrival-sound.js';
import { isMessageMutationFrame } from '#lib/message-mutation-frames.js';
import { invalidate, invalidateAll } from '$app/navigation';

import { resolveArrivalAnnouncement } from '#lib/arrival-announcement.js';
import { isMtxStream } from '#lib/mtx-streams.js';
import type { MtxStreamTabs } from '#lib/room-mtx.svelte.js';
import { formatUserLocation } from '#lib/roster-gates.js';
import { playSoundEffect } from '#lib/sound-effects.js';
import { ROOM_RECORDING_COMMANDS } from './recording-commands';

import type { RoomBroadcasts } from './broadcasts.svelte';
import type { AddressedCommand, RoomPrivateCommands } from './private-commands';
import type { CmdsFrame } from './cmds-frame';
import { handleForAllBroadcast } from './for-all-broadcasts';
import type { RoomMedia } from './media.svelte';
import type { RoomMediaTransport } from './media-transport.svelte';
import type { RoomPrefs } from './prefs.svelte';
import type { PrivateChatMessage } from './private-chat.svelte';
import { noteUpdateNotice } from './note-update-notice.js';
import type { RoomToasts } from './toasts.svelte';

/** What the stream reads off the loaded page data. Narrow on purpose: it consults, never owns. */
/** The two methods a chat frame needs. Narrow on purpose: this stream does not own the columns. */
interface ChatSink {
  typingUpdated(chatChannel: string, names: readonly string[]): void;
  /** `acA-06` — one arrival, counted against whichever column is not showing that channel. */
  chatArrived(channel: string, options: { isMention: boolean; countMentions: boolean }): void;
}

/**
 * The screenshare overlay, seen as the one method this router uses.
 *
 * Structural rather than the class, for the reason `ChatSink` and `PrivateChatSink` are: the
 * router recognises a channel and hands the frame over. What an overlay IS — a canvas, an interval,
 * a producer-id map — is `#lib/room/screen-overlay.ts`'s business and no import of this file
 * should be able to reach it.
 */
interface ScreenOverlaySink {
  show(alert: { text: string; sender: string }): void;
}

interface EventStreamSession {
  room: { shortCode: string };
  user: { id: number };
  sessData?: {
    userJoinAndLeavePopup?: boolean;
    beepOnUserJoin?: boolean;
    dingOnNewMessage?: boolean;
  } | null;
  /**
   * "Play chat message sound for" — member email HASHES, derived on the controller.
   *
   * Not on `sessData`, because it is not a setting: the setting holds raw addresses and never
   * crosses. `internal/room-config/[code]` hashes it and the load passes the digests through.
   */
  chatSoundForEmailHashes?: readonly string[];
}

/** `setTimeout(…, 3e3)`. */
const RECONNECTED_FLASH_MS = 3000;

/**
 * `let oe = 3e3 * Math.random()` — the soft reset's per-client reconnect delay (byte 1023810).
 *
 * The same number as the flash above and a different reason, so it is a separate constant: this one
 * is a CEILING on a random spread, not a duration. Folding them together would make a later change
 * to one silently change the other.
 */
const SOFT_RESET_JITTER_MS = 3000;

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

/**
 * The room's REALTIME CHANNEL, and the browser-side geolocation that rides beside it.
 *
 * Phase 5 slice 5. `subscribeToRoomEvents` was 575 lines — the single largest function left on the
 * page after slice 4 — and it is one subject: every frame the server pushes arrives here and is
 * routed, on six channels, to the class that owns the state it changes.
 *
 * **It is a ROUTER, and it owns almost nothing.** That is the shape, not an accident of extraction:
 * seventeen collaborators are injected and exactly three fields travel, all three describing the
 * CONNECTION rather than the room — `roomEventsConnected`, `hasConnectedBefore`, `reconnectedFlash`.
 * A frame about a poll answer does not teach this class what a poll is; it calls `invalidateAll()`
 * and the loader decides. That is why the file is mostly transcription and barely any state.
 *
 * That rule is also what sent the join/leave announcement to `#lib/arrival-announcement.js` on
 * 2026-08-23: it was the one block here that did not route, because a join changes no state and so
 * has no owner to route it to. Four gates, two toast skins and two sounds were being decided in a
 * router. The rule was already written down; the block simply predated it being applied.
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
export class RoomEventStream<Entry> {
  #roomEventsConnected: boolean;
  /** `ECP-02` — `isConnected`, which starts TRUE. See the constructor for why it is not the above. */
  #chatChannelUp: boolean;
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
    /** See `#chat`. Optional so existing constructions are unchanged. */
    chat?: ChatSink;
    /** See `#screenOverlay`. Optional for the same reason `chat` is. */
    screenOverlay?: ScreenOverlaySink;
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
     * A presenter pulled the room to a session note.
     *
     * A RECEIVER for the same reason `showTab` is one: acting on it means switching the main tab AND
     * selecting a note tab, and both of those belong to the page and to `NotesPane`, not here.
     */
    focusSessionNote: (noteId: number) => void;
    /**
     * A chat frame arrived while the tab was hidden.
     *
     * A RECEIVER, not a field, because `missedChatWhileHidden` is written on BOTH sides of this
     * boundary — set here, cleared by the visibility handler that stayed on the page. A field
     * written on both sides is shared, not extracted; that is the rule slice 13 paid for with
     * `followedUsers`.
     */
    chatMissedWhileHidden: () => void;
    /**
     * Read this sentence, then reload the page. THREE frames end a browser's page this way — a
     * revoked connection, a hard reset and a room being opened — and all three are a message plus a
     * reload, so they share one receiver rather than three that differ in nothing. The message is
     * always the SERVER'S: `#lib/server/live-access.ts` §"What the client does with it".
     */
    alertThenReload: (message: string) => void;
    /**
     * Every ADDRESSED command — `#lib/room/private-commands.ts`.
     *
     * One collaborator rather than three callbacks and a class. The router's job on this channel is
     * to recognise the channel and hand the frame over with a way to close the stream; deciding who
     * the frame is for, and what each command does, belongs to the thing that owns the channel.
     */
    privateCommands: RoomPrivateCommands;
  }) {
    this.#prefs = options.prefs;
    this.#toasts = options.toasts;
    this.#media = options.media;
    this.#broadcasts = options.broadcasts;
    this.#mediaTransport = options.mediaTransport;
    this.#mtx = options.mtx;
    this.#roster = options.roster;
    this.#privateChat = options.privateChat;
    this.#chat = options.chat;
    this.#screenOverlay = options.screenOverlay;
    this.#userActions = options.userActions;
    this.#session = options.session;
    this.#isPresenter = options.isPresenter;
    this.#appHasFocus = options.appHasFocus;
    this.#restartMediaSession = options.restartMediaSession;
    this.#showTab = options.showTab;
    this.#chatMissedWhileHidden = options.chatMissedWhileHidden;
    this.#focusSessionNote = options.focusSessionNote;
    this.#alertThenReload = options.alertThenReload;
    this.#privateCommands = options.privateCommands;

    /** Whether the SSE channel is up. The sidebar's "Chat" line reports it. */
    this.#roomEventsConnected = $state(false);

    /**
     * `ECP-02` — the same channel, asked a DIFFERENT question, which is why it is a second field
     * and not a second reader of the one above.
     *
     * `#roomEventsConnected` answers *has this channel ever opened?* and therefore starts FALSE —
     * its own docblock says so, because the sidebar's "Chat" line has to read *not connected*
     * before the first open. This one answers *has this channel DROPPED?* and starts TRUE.
     *
     * The reference has exactly this field and exactly this starting value:
     * `this.isConnected=!0,this.isMediaConnected=!1` in `app-extra-chat`'s constructor at bundle
     * byte 2,375,326, driven false by `socketDisconnected` (byte 2,376,472) and true again by
     * `socketConnected`. It gates the composer: `O(23, o.isConnected && o.chatEnabled ? 23 : 24)`
     * at byte 2,400,361 — slot 23 is the composer, slot 24 is the Chat Disabled block.
     *
     * **Sharing the first field was measured and refused, not skipped.** Gating the composer on it
     * would print "Chat Disabled" on first paint, before the browser has had a chance to open
     * anything — a room announcing its own chat is off for the duration of one connect, which
     * upstream never does. Starting the first field TRUE instead breaks the sidebar the other way:
     * it would report a connection that has not happened. Two questions, two answers, both driven
     * by the same two events so they cannot drift.
     */
    this.#chatChannelUp = $state(true);

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
  readonly #focusSessionNote: (noteId: number) => void;
  readonly #mtx: MtxStreamTabs;
  readonly #roster: RosterSink<Entry>;
  readonly #privateChat: PrivateChatSink;
  /**
   * The chat columns, for `typingUpdated` and nothing else.
   *
   * OPTIONAL, because `RoomChat` is constructed after this stream in `createRoom` and because every
   * test in `events.svelte.test.ts` builds this class without one. A typing frame arriving before
   * the columns exist is a frame with nowhere to land, which is the correct outcome and not an
   * error — nobody is looking at a column that has not been made yet.
   */
  readonly #chat: ChatSink | undefined;
  /**
   * The screenshare overlay, for arriving alerts and nothing else.
   *
   * OPTIONAL for the same two reasons `#chat` is: it is constructed alongside this stream rather
   * than before it, and an alert arriving with no overlay to draw on has nowhere to land, which is
   * the correct outcome in every room that did not tick the setting.
   */
  readonly #screenOverlay: ScreenOverlaySink | undefined;
  readonly #userActions: FollowStyleSource;
  readonly #session: () => EventStreamSession;
  readonly #isPresenter: () => boolean;
  readonly #appHasFocus: () => boolean;
  readonly #restartMediaSession: () => (() => Promise<void>) | null;
  readonly #showTab: (tab: 'screens' | 'videoplayer') => void;
  readonly #chatMissedWhileHidden: () => void;
  readonly #alertThenReload: (message: string) => void;
  readonly #privateCommands: RoomPrivateCommands;

  get connected(): boolean {
    return this.#roomEventsConnected;
  }

  /**
   * `ECP-02` — the composer's half of `o.isConnected && o.chatEnabled`.
   *
   * Both chat columns gated on `chatEnabled` alone while their docblocks quoted the whole expression
   * verbatim, `isConnected` included — a comment claiming what the next line does not do, which is
   * the one thing the root standard asks a reviewer to check for. A member whose channel had dropped
   * kept a live-looking composer, typed into it, pressed Enter, and watched nothing happen.
   */
  get chatChannelUp(): boolean {
    return this.#chatChannelUp;
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
        const command = payload.data as CmdsFrame | undefined;

        /*
          FIRST in this chain, and the placement is load-bearing: anything below it acting on a frame
          from the same batch would act for a member the server has just revoked. Why, in full:
          `#lib/server/live-access.ts` §"What the client does with it".
        */
        if (command?.cmd === 'sessionRevoked') {
          this.#alertThenReload(command.message ?? '');
          return;
        }

        /*
          The two ROOM-WIDE page-enders, whose senders shipped 2026-08-27 — the receivers were never
          the missing half. Their strings are the capture's, at bytes 2596540-2597340, and
          `hardReset` drops remote media first because upstream disconnects before it alerts.
        */
        if (command?.cmd === 'hardReset') {
          this.#mediaTransport.dropRemoteMedia();
          this.#alertThenReload(
            'The room is being reset by an administrator. Click OK to continue...'
          );
          return;
        }
        /* A presenter swept or restored the chat log — see `chat-archive.remote.ts` for the weight. */
        if (command?.cmd === 'chatArchiveChanged') {
          void invalidateAll();
          return;
        }
        if (command?.cmd === 'openSession') {
          this.#alertThenReload('The session is now open, click here to reload the page and enter');
          return;
        }

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
        /* The sound each one plays is a TABLE — see `recording-commands.ts` for the quirk it makes visible. */
        const recording = command?.cmd ? ROOM_RECORDING_COMMANDS[command.cmd] : undefined;
        if (recording && command?.cmd) {
          if (command.cmd === 'startRec') this.#media.roomRecordingStarted(command.recName ?? '');
          else if (command.cmd === 'stopRec') this.#media.roomRecordingStopped();
          else this.#media.roomRecordingPauseChanged(command.cmd === 'pauseRec');
          if (!this.#prefs.doNotDisturbOn && this.#prefs[recording.preference])
            playSoundEffect(recording.sound);
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
        /*
          `case "presenterTalking"` and `case "presenterNotTalking"`, byte 1,014,971 — two `case`
          labels that emit a payload-free GUI event each, and two subscribers that set one flag
          (1,117,020-1,117,129). One field, both directions, exactly as the recording pair above is
          one field and four transitions. `NavbarTalkingIndicator.svelte` carries the measurement.
        */
        if (command?.cmd === 'presenterTalking' || command?.cmd === 'presenterNotTalking') {
          this.#media.setPresenterTalking(command.cmd === 'presenterTalking');
          return;
        }

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

        if (handleForAllBroadcast(command, this.#broadcasts, this.#showTab, this.#isPresenter))
          return;

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
        if (isMessageMutationFrame(command?.cmd)) {
          /*
            A message in this room is no longer what this tab is holding — it was reacted to,
            edited, marked answered, deleted, or its Q&A thread changed.

            Nine commands used to do all of that and tell nobody: a presenter deleted a message and
            every other viewer kept it on screen, a reaction was visible only to the person who
            clicked it, and a question landed with no badge moving anywhere but the asker's tab.
            `#lib/message-mutation-frames.ts` holds the four reference frame names, the byte offsets
            they were read at, and why ours carry no payload where the reference's carry the whole
            row.

            The SKIP is the same one the `chat` and `alerts` channels make one screen down, in their
            own words: *"Our own post already refetched. Re-invalidating would refetch twice."* The
            browser that sent the command awaits it and then calls `invalidateAll()` itself.

            One refetch for all four, deliberately. `invalidateAll()` re-reads the whole page load,
            which is where messages, alerts, question counts and captured overrides all come from —
            so distinguishing them here would buy a reader four branches and the room nothing.
          */
          if (command.actorUserId !== this.#session().user.id) void invalidateAll();
          return;
        }
        if (command?.cmd === 'presenterColorsChanged') {
          /*
            A presenter saved or cleared their message colours. The reference replaces the whole map
            from the frame and redraws both logs:

              case "presenterColorsChanged":
                this.globals.sessData.presenterSettings = i.colors,
                this.guiEventBus.emit("redrawChatAndAlerts"); break;

            (bundle byte 1,025,162.) Ours refetches for the same reason `changeChatMode` directly
            above does, and the reason is stronger here rather than weaker: this frame decides how
            OTHER people's messages are painted for everyone in the room, so a payload arriving on a
            socket must not be what answers it. The rows are the authority; the frame is the trigger.

            No payload is sent at all — see `presenter-colors.remote.ts` — so there is nothing here
            to be tempted by.
          */
          void invalidateAll();
          return;
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
        if (command?.cmd === 'updatedSessionNote') {
          /* A note was saved by somebody else. `#lib/room/note-update-notice.ts` holds USM-11's
             reasoning, the two byte offsets and the two refusals. */
          noteUpdateNotice(command, {
            viewerId: this.#session().user.id,
            popupEnabled: this.#prefs.noteUpdatePopup,
            refetch: () => void invalidateAll(),
            toasts: this.#toasts
          });
          return;
        }
        if (command?.cmd === 'focusOnSessionNote') {
          /*
            A presenter pulled the room to a session note. The receiver upstream (byte 1962371)
            switches the main tab to notes and selects `noteTab-${id}`; ours calls the page's
            handler, which owns both halves of that.

            No re-broadcast from here, for the same reason the screen case gives: only the
            user-initiated control sends, so a member receiving this does not echo it back.
          */
          if (typeof command.noteId === 'number') this.#focusSessionNote(command.noteId);
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

        if (command?.cmd === 'softResetDone') {
          /*
            A presenter reset the room's media. Every client drops what it is consuming and rebuilds,
            AFTER A PER-CLIENT DELAY — `let oe = 3e3 * Math.random(); setTimeout(…, oe)` at byte
            1023810.

            THE JITTER IS THE FEATURE. The frame reaches everybody in the same instant; without the
            delay every client would re-consume every producer at once and the reset would arrive at
            the SFU as one burst from the whole room. That is the same thundering-herd reasoning
            `remoteRestartAudio` records for staying addressed to one member, and it is why the
            button's own text says the room reconnects *"gently"*.

            `dropRemoteMedia()` first and immediately, because that half is local and costs the SFU
            nothing: the tabs and sinks go now, the rebuild is what waits.

            NOT reproduced: upstream also cuts the PRESENTER'S own mic and camera
            (`isPresenter && (disableMic(), stopCam())`). That is a presenter silencing themselves by
            pressing a button labelled "reset the media state of the room", and this room's
            `restart()` re-establishes the local producers rather than dropping them. Stated as a
            deliberate divergence rather than left to be discovered as a gap.
          */
          this.#mediaTransport.dropRemoteMedia();
          globalThis.setTimeout(
            () => void this.#mediaTransport.restart(),
            Math.random() * SOFT_RESET_JITTER_MS
          );
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
        /*
          `restartScreen` — the fourth of the capture's six, built 2026-08-26. Note the SINGULAR
          subCmd against a plural " Restart Screens " label: upstream loops over every screen this
          peer owns, and `restartLocalScreens` is named for what it does rather than for the wire.

          It re-produces the SAME live track onto a new producer, so no `getDisplayMedia` prompt is
          raised — which is what makes a socket-driven restart possible at all. `startRec`/`stopRec`,
          the remaining two, are an honest gap; `presenterCommand` records why.
        */
        if (command.subCmd === 'restartScreen') void this.#mediaTransport.restartLocalScreens();
        return;
      }

      /*
        `/roster/` - `handleRosterCmd`, whose three load-bearing cases are `getRosterCount`,
        `getRoster` and the `onUserJoin` / `onUserLeave` pair. Its fourth, `getRosterQueue`, logs and
        does nothing else, so it is not reproduced.

        This sentence read "its ONLY load-bearing case" until 2026-08-23, having been written when
        the count was the only one handled; the other two arrived under it and it was never
        corrected. Recorded rather than silently fixed, because a comment that describes the code it
        used to sit above is the failure mode the whole comment discipline here exists to catch.
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
          `onUserJoin` / `onUserLeave`. The four gates, the two toast skins, the two strings and the
          transcribed `beepOnUserJoin` quirk are all in `#lib/arrival-announcement.js`, with the
          bundle offsets they were read from — this is the one frame on any channel that changes no
          state, so there was no class to route it to and the decision had grown here instead.

          What is left is the routing this file is for: match the frame, ask, deliver.
        */
        if (
          (frame?.cmd === 'onUserJoin' || frame?.cmd === 'onUserLeave') &&
          typeof frame.userId === 'number'
        ) {
          const announcement = resolveArrivalAnnouncement(
            {
              direction: frame.cmd === 'onUserJoin' ? 'join' : 'leave',
              nick: typeof frame.nick === 'string' ? frame.nick : '',
              isSelf: frame.userId === this.#session().user.id,
              viewerIsPresenter: this.#isPresenter()
            },
            this.#session().sessData ?? {},
            this.#prefs
          );
          if (announcement?.toast) this.#toasts.show(announcement.toast);
          if (announcement?.sound) playSoundEffect(announcement.sound);
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

      /*
        `/privCmdsIn/{uid}-{id}/` — every command addressed to ONE member, in
        `#lib/room/private-commands.ts`.

        The whole channel left this router on 2026-08-23, ahead of the receivers `TODO.md` row 9
        still owes. Five channels here carry frames for the room; this one names a person, and the
        `targetUserId` test that makes each frame safe was repeated on every branch — four copies of
        a security check, with more queued behind them. The slice makes it ONE early return, deny by
        default, so a receiver added later is covered without its author knowing the rule exists.

        `source.close()` is passed rather than held: the `EventSource` belongs to THIS subscription,
        and a field would be a stale handle to a closed stream after any reconnect.
      */
      if (payload.channel === 'privCmds') {
        this.#privateCommands.handle(payload.data as AddressedCommand | undefined, () =>
          source.close()
        );
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
      /*
        `typingUpdated` — who is typing in one chat channel. The server has already removed this
        viewer's own name, so nothing here filters; the frame is the answer.

        Handled BEFORE the `senderId` guard below, because a typing frame has no sender: it is a
        per-recipient snapshot rather than somebody's message, and the guard that stops a member
        refetching on their own post would drop every one of these that happened to carry no id.
      */
      if (payload.channel === 'typing') {
        const frame = payload.data as
          { chatChannel?: string; names?: readonly string[] } | undefined;
        if (typeof frame?.chatChannel === 'string') {
          this.#chat?.typingUpdated(frame.chatChannel, frame.names ?? []);
        }
        return;
      }

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

      /*
        `alertsOverlayOnScreenshare` — an arriving alert, handed to every screen this peer is sharing
        so it is burned into the frames the room receives. `#lib/room/screen-overlay.ts` is
        the gate; a room without the setting, or a presenter sharing nothing, fans out to nothing.

        BEFORE the own-sender guard below, and that is the whole point rather than an accident of
        ordering. The presenter posting the alert is usually the presenter sharing the screen, and
        skipping their own alert would mean the one member who cannot see it is the room that
        everybody else is watching. The guard exists to stop a REFETCH the poster already did; it
        was never about what the poster may be shown.

        The body travels on this channel already (`post-alert.remote.ts` publishes `body` and
        `senderName`), so nothing here refetches to learn a line of text.
      */
      if (payload.channel === 'alerts') {
        const alert = payload.data as { body?: string; senderName?: string } | undefined;
        if (typeof alert?.body === 'string') {
          this.#screenOverlay?.show({ text: alert.body, sender: alert.senderName ?? '' });
        }
      }

      /*
        `acA-06` — THE UNREAD COUNTERS, and they sit ABOVE the own-sender guard on purpose.

        Upstream's subscription has no sender filter at all:

        ```js
        subscribe("chatMsg", e => { e.c == this.channel ? emit("alwaysScrollToBottom")
          : this.unreadMsgs[e.c] = this.unreadMsgs[e.c] ? this.unreadMsgs[e.c]+1 : 1, … })
        ```                                                                   // byte 1,430,918

        and the guard below is about a REFETCH — "our own post already refetched" — not about what
        this member may be counted as having read. The one case the two differ in is real: a message
        typed into the EXTRA column's composer arrives on a channel the MAIN column may not be
        showing, and upstream badges it there. Moving the count below the guard would silently drop
        exactly that message, which is the kind of quiet divergence this repository writes rows
        about, so the count is taken where the reference takes it.

        `countMentions` is `isPresenter`, stated once — see `RoomChat.chatArrived`. `isMention` is
        the SERVER's answer, decided per recipient in `publishChatToRoom` against the name each
        listener joined with, because this hub's stream is per ROOM while chat is per CHANNEL and a
        frame carrying a body would put admin chat on every subscriber's wire.
      */
      if (payload.channel === 'chat') {
        const channel = (payload.data as { room?: string } | undefined)?.room;
        if (typeof channel === 'string') {
          this.#chat?.chatArrived(channel, {
            isMention: payload.isMention === true,
            countMentions: this.#isPresenter()
          });
        }
      }

      // Our own post already refetched. Re-invalidating would refetch twice per alert.
      if (payload.data?.senderId === this.#session().user.id) return;

      /*
        THE CHAT DING. The rule is `#lib/chat-arrival-sound.ts`, which carries the transcription,
        both upstream defects it does not reproduce, and the reason a rule with five inputs does not
        belong inside a dispatcher only reachable through nine collaborators.

        THE LOOKUP IS OPTIONAL, and that is the half of the fix that has to live HERE: upstream
        reads `followedUsers[e.avt].followChatStyle` after checking only that the map is non-empty,
        so it throws for every message from anyone a member does not follow. Resolving it at the
        call site with `?.` is what makes that impossible; the module takes the answer, not the map.
      */
      if (payload.channel === 'chat' && !this.#prefs.doNotDisturbOn && this.#prefs.chatSoundOn) {
        const senderHash = (payload.data as { senderEmailHash?: string } | undefined)
          ?.senderEmailHash;
        const sound = arrivalSoundFor({
          doNotDisturb: this.#prefs.doNotDisturbOn,
          chatSoundOn: this.#prefs.chatSoundOn,
          followedSenderPlaysSound:
            senderHash !== undefined &&
            this.#userActions.followedUsers[senderHash]?.followChatStyle?.playSound === true,
          dingOnNewMessage: this.#session().sessData?.dingOnNewMessage === true,
          senderEmailHash: senderHash,
          chatSoundForEmailHashes: this.#session().chatSoundForEmailHashes
        });
        if (sound) playSoundEffect(sound);
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
      // `ECP-02` — `socketConnected` sets `isConnected` back to true. Same event, second question.
      this.#chatChannelUp = true;
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
      // `ECP-02` — `socketDisconnected` (byte 2,376,472). The composer goes with it.
      this.#chatChannelUp = false;
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
