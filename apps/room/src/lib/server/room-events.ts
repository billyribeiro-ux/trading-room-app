/**
 * The room's realtime fan-out.
 *
 * ## Why this exists
 *
 * The captured app carries every alert, chat message, roster change and admin command on a SECOND
 * socket - a SocketCluster pub/sub connection, entirely separate from the media SFU. Ten channels,
 * all keyed by session (`scripts/extract-realtime-protocol.mjs` decodes them out of the bundle):
 *
 *   /sess/{sessionID}/alerts/            /sess/{sessionID}/cmds/
 *   /sess/{sessionID}/chat/main/         /sess/{sessionID}/cmdsAdmin/
 *   /sess/{sessionID}/chat/{channel}/    /sess/{sessionID}/roster/
 *   /sess/{sessionID}/privChatIn/{uid}/  /sess/{sessionID}/rosterEvents[Admin]/
 *
 * subscribed as `socket.subscribe(path, { waitForAuth: true, priority: N })` and drained with
 * `for await` - 42 client commands out, 104 server cases in.
 *
 * This room reproduced NONE of it. Measured: zero `/api/v1` calls, no second socket, no polling,
 * and `invalidateAll()` only after the acting user's OWN submission. So an alert a presenter
 * posted never reached a member until that member reloaded - the core promise of a trading room,
 * silently absent.
 *
 * ## What this is, and what it is not
 *
 * A process-local publish/subscribe hub behind an SSE endpoint. It reproduces the OBSERVABLE
 * contract of the captured `/sess/{id}/alerts/` channel - a presenter posts, every other member's
 * screen updates without a reload - using the transport this stack already has, rather than adding
 * SocketCluster.
 *
 * It is deliberately NOT the durable answer. State here lives in one node process, so it does not
 * survive a restart and does not span instances. The durable path already exists and is unused:
 * `services/api` listens on PostgreSQL `room_events` (`services/api/src/jobs.rs`), which is exactly
 * this fan-out done properly across instances. Moving to it is `TODO.md` entry 5 ("Wire the room to
 * the API and delete SQLite"), and this hub is shaped to be replaced by it - one publish call, one
 * subscribe call, no other code aware of the transport.
 */

/** One realtime message, mirroring the capture's channel-per-topic shape. */
import { BUILT_IN_CHAT_TABS } from '../chat-tabs';
import { isMentionOf } from '../mention';

import type { PrivateChatMessage } from './private-chat';
import { reportRoomOccupancy } from './room-config-client';
import { typistsIn } from './typing';

export type RoomEvent =
  /** `/sess/{id}/alerts/` - the capture pushes the alert row and emits `alertMsg`. */
  | { channel: 'alerts'; data: unknown }
  /**
   * `/sess/{id}/chat/{name}/` - pushes the message and emits `chatMsg`.
   *
   * **The payload carries no message TEXT, deliberately, and `isMention` is why it can still say
   * whether you were named.** `room` may be an admin channel, so a frame carrying bodies would put
   * admin chat on every subscriber's wire. The reference does not have this problem — it publishes
   * per-channel and the client computes `isMention(te)` off `te.txt` locally — but its
   * `subscribe(path)` is per channel and this hub's SSE stream is per room, so the same trick here
   * would leak.
   *
   * So the SERVER decides, PER RECIPIENT, using the same `isMentionOf` rule the client uses for the
   * highlight: `publishChatToRoom` builds one event per listener from the name that listener joined
   * with. A member learns one bit about their own name and nothing about anyone else's, and the
   * body never leaves the process.
   */
  | { channel: 'chat'; data: unknown; isMention?: boolean }
  /**
   * `typingUpdated` — who is typing in one chat channel, right now.
   *
   * Upstream this arrives as a map of every channel at once (`e[this.channel]`, byte 1,433,553) and
   * each chat component picks its own out. This publishes ONE channel per frame, because the
   * recipient set is the same either way and a per-channel frame is the smaller thing to send.
   *
   * **The names are already filtered for the recipient**, which is why this is published with
   * `publishTypingToRoom` rather than `publishToRoom`: a viewer must never be shown their own name,
   * and doing it once on the server beats every client filtering itself out and one of them
   * forgetting. That is the same argument `publishChatToRoom` makes for `isMention` above.
   */
  | { channel: 'typing'; data: { chatChannel: string; names: string[] } }
  /**
   * `/sess/{id}/cmds/` - the room's command channel.
   *
   * Every message on it carries a `cmd`, and the capture dispatches the lot through one
   * `handleServerCmd(te.cmd, te)` switch with 104 cases. `remotePresCommand` is one of them, and
   * it carries a `subCmd` that the receiving peer acts on itself:
   *
   * ```js
   * subscribe("remotePresCommand", r => { switch (r) {
   *   case "mutemic":     this.mediaSoupService.muteMic();  break;
   *   case "mutecam":     this.mediaSoupService.stopCam();  break;
   *   case "mutescreens": this.stopSharingAll();            break;
   *   case "restartScreen": …; case "startRec": …
   * }})
   * ```
   *
   * `targetUserId` is how one member is addressed rather than the whole room. The capture's
   * channel is per-session and the payload names its target; the same shape is kept here so a
   * later move to the real API changes the transport and nothing else.
   */
  | {
      channel: 'cmds';
      // `url` carries `playMP3ForAll`: the capture dispatches it from the same switch as every
      // other server command - `case "playMP3ForAll": this.guiEventBus.emit("playMP3ForAll",
      // {url: i.url})` - not from `handleServerCmdAdmin`, which only knows `gotPollAnswer`.
      //
      // It carries the three other room-wide media commands from the same switch, all four of
      // which sit within 500 bytes of each other at `main.d1d09071be31f1ba.js` 1,024,137:
      //
      //   case "playYTForAll":    emit("playYTForAll",    {url: i.url})
      //   case "stopYTForAll":    emit("stopYTForAll")
      //   case "playVideoForAll": emit("playVideoForAll", {url: i.url})
      //   case "stopVideoForAll": emit("stopVideoForAll")
      //
      // The two stops forward NO payload, which is why neither carries a field of its own here.
      // `stopYTForAll` is nonetheless published WITH a url when it precedes a play (byte
      // 2,296,932) and WITHOUT one from the overlay's own button (byte 1,503,220); the difference
      // is on the wire and invisible to the receiver, and it is reproduced rather than tidied.
      //
      // `recName` rides with `startRec` - the capture stores it as `roomState.recName` and the
      // `[ REC ]` tooltip reads it back through `decodedRecName()`.
      data: {
        cmd: string;
        subCmd?: string;
        targetUserId?: number;
        url?: string;
        recName?: string;
        /**
         * `changeChatMode`'s payload — `g`, `p` or `d`.
         *
         * The row in `room_state` is the authority; this rides along so that tabs already open
         * change without waiting for a reload, exactly as `recName` rides with `startRec`. A
         * listener that trusted this instead of the row would be trusting the client with room
         * policy, which is why the load reads the row on every navigation regardless.
         */
        mode?: string;
        /**
         * `focusOnScreen`'s payload — the producer id of the screen a presenter is pulling the room
         * to. `sendServerAdminCommand("focusOnScreen", {id: e})` upstream; named `screenId` here
         * because `id` alone on a union this wide says nothing about what it identifies.
         */
        screenId?: string;
        /**
         * `focusOnSessionNote`'s payload — the note a presenter is pulling the room to. Named
         * `noteId` for the same reason `screenId` is not `id`: on a union this wide, `id` alone
         * says nothing about what it identifies. Byte 1023554 of the capture carries it as `{id}`.
         */
        noteId?: number;
        /**
         * `updatedSessionNote`'s tab NAME — USM-11.
         *
         * The frame carries the id and the name and deliberately not the content: `invalidateAll()`
         * re-reads the row, which is the authority, and a note's tab name is already rendered to
         * everyone who can see the pane. Byte 1,022,762 carries the whole `tab` upstream; ours
         * carries the two fields the toast needs, for the reason `message-mutation-frames.ts` gives
         * about this stream being per ROOM.
         */
        noteName?: string;
        /**
         * Who performed the act, on the four message-mutation frames.
         *
         * `updateChatMsg` / `updateAlertMsg` / `deleteChatMsg` / `deleteAlertMsg` —
         * `#lib/message-mutation-frames.ts` holds the names, the bytes they were read at, and why
         * ours carry no row where the reference's carry the whole thing.
         *
         * Its ONLY use is on the recipient's side, compared against that listener's own id to skip a
         * refetch the browser has already performed. It is not authority: the frame carries no
         * payload, so there is nothing a forged id could unlock, and every rule was applied on the
         * server before this was published. Stated because an id on a wire is exactly what the
         * 2026-08-07 escalation was, and the difference is what it is allowed to decide.
         */
        actorUserId?: number;
        /**
         * `giveMicScreen`'s payload.
         *
         * A top-level command of its own in the capture, not a `remotePresCommand` subCmd:
         * `case "giveMicScreen": appEventBus.emit("giveMicScreen", i)`, and the subscriber reads
         * `e.give`.
         */
        give?: boolean;
        /**
         * `mtxStartStream` / `mtxStopStream` — one MediaMTX stream going live or stopping.
         *
         * `muser` is the reference's own payload key: `case "mtxStartStream":
         * this.appEventBus.emit("mtxStartStream", i.muser)` (bundle byte 1010826). Typed `unknown`
         * on purpose — the page validates it with `isMtxStream` before it can reach a playlist URL,
         * and a type here that promised the shape would make that guard look optional.
         */
        muser?: unknown;
        /**
         * `getSessionMTXMediaState`'s full list. NOTE the name: MTX in the MIDDLE is the WIRE
         * command, while `getSessionMediaStateMTX` with MTX at the END is an internal bus event
         * upstream that carries no payload at all. Validated at the page, same as `muser`.
         */
        data?: unknown;
        /**
         * `sessionRevoked` — the one command on this channel that is OURS rather than the
         * reference's, and the only one sent to a single CONNECTION rather than to a room or a user.
         *
         * The reference has no equivalent because it never ends a live connection: entitlement is
         * checked at the door and one login serves any number of devices. Both are deliberate
         * divergences recorded in `NEW-TODO.md` Part 1, and `live-access.ts` is where the rule lives.
         *
         * It is delivered by `sess/[room]/events` writing to its OWN listener, never through
         * `publishToRoom` or `publishToUsers` — after a newest-wins eviction the revoked connection
         * and the one that replaced it share a user id, so an addressed publish would revoke both.
         * The fields are typed here so the client cannot read a message the server does not send.
         */
        reason?: 'session-ended' | 'entitlement-lapsed' | 'unconfirmed';
        message?: string;
      };
    }
  /**
   * `/sess/{id}/roster/` and `/sess/{id}/{serverID}/roster/`, both drained by `handleRosterCmd`.
   * Verbatim, the whole handler:
   *
   * ```js
   * handleRosterCmd(e, i) { switch (e) {
   *   case "getRosterCount": this.globals.rosterCount = parseInt(i.data); break;
   *   case "getRosterQueue": console.log("getRosterQueue:", i.data.length);
   * }}
   * ```
   *
   * So the roster channel is two commands, and only one of them does anything - `getRosterQueue`
   * logs and nothing more. Reproducing the count and leaving the queue out is faithful, not a gap.
   *
   * `getRosterCount` carries the number; `getRoster` carries the people. The capture drains both off
   * this channel - `handleRosterCmd` sets `globals.rosterCount` from one, and `loadRoster()` / the
   * `getRoster` event refresh `globals.roster`, which is what `checkUserOnlineStatus` reads.
   */
  | {
      channel: 'roster';
      data:
        | { cmd: 'getRosterCount'; data: number }
        | { cmd: 'getRoster'; users: RosterUser[] }
        /**
         * `onUserJoin` / `onUserLeave` — `app-room.full.js:2134-2155`.
         *
         * PERSON events, not connection events: the reference's roster is keyed on `userXrefID`
         * and these flip a single entry's `online` flag rather than appending a row, so one person
         * with three tabs announces once on the first and once on the last. `subscribeToRoom` is
         * where that is decided, because the subscriber map is the presence table.
         *
         * The payload is the reference's `{nick, userXrefID}` in this room's own key: the id it
         * already uses everywhere else, plus the name the message prints.
         */
        | { cmd: 'onUserJoin' | 'onUserLeave'; userId: number; nick: string };
    }
  /**
   * `/sess/{id}/cmdsAdmin/`, drained by `handleServerCmdAdmin` - which is one line:
   *
   * ```js
   * handleServerCmdAdmin(e, i) { "gotPollAnswer" === e && this.appEventBus.emit("gotPollAnswer", i) }
   * ```
   *
   * One command, presenters only. The admin channel's name promises far more than it carries.
   */
  | { channel: 'cmdsAdmin'; data: { cmd: 'gotPollAnswer'; pollId?: number } }
  /**
   * `/sess/{id}/privChatIn/{uid}/` - emits `privChatIn`.
   *
   * Delivered to BOTH parties, which is not an optimisation - it is the capture's design. The
   * receiving code is `isMine = te.uid == myUserID` and then
   * `privChatLog[isMine ? te.recvdID : te.uid].push(te)`, so the sender learns its own message from
   * the same channel and neither side inserts optimistically. `toUserId` is the delivery address;
   * `message.uid` / `message.recvdID` say who actually spoke to whom.
   *
   * The message travels WITH the event. Carrying only the two ids - which is what this used to do -
   * makes every recipient re-fetch the whole thread to discover one line.
   */
  | {
      channel: 'privChat';
      data: { toUserId: number; fromUserId: number; message?: PrivateChatMessage };
    }
  /**
   * `/sess/{id}/privCmdsIn/{uid}-{id}/` - emits `forceReload` and `unmuteChat`.
   *
   * Both are addressed to ONE member, which is what this channel is for. `unmuteChat` is a command
   * of its own on the capture's wire (bytes 996325, 1430505, 2080257, 2376996) carrying `{user}`,
   * and it is reached only through `muteChat(-1)` - there is no button bound directly to it.
   *
   * The target is named in the payload rather than in the channel because the transport here is
   * per room, not per user; the client compares `targetUserId` against its own id, exactly as it
   * already does for `forceReload`.
   */
  /*
    `privCmds` — addressed to ONE member. Two fields are optional because only one command each
    carries them: the reference's kick frame is `{cmd:"kickUser", msg}` and its receiver reads
    `xe.msg`, while `forceReload` and `unmuteChat` carry nothing but the target.

    `mutedTill` is `muteChat`'s, and it is an ISO string rather than a composed sentence ON PURPOSE.
    Upstream sends `msg` and the receiver renders it with `bootbox.alert(xe.msg)`, but that sentence
    is composed by a server which is not in the capture. Sending the INSTANT and letting the client
    format it means nothing is invented: the receiver builds the text from the `Chat Disabled` block
    and `formatChatMutedTill`, both of which were read off the reference. See `applyChatMute`.
  */
  | {
      channel: 'privCmds';
      data: {
        cmd:
          | 'forceReload'
          | 'unmuteChat'
          | 'kickUser'
          | 'muteChat'
          | 'remoteRestartAudio'
          | 'getDebugLog'
          | 'debugLogResp'
          | 'updateProfilePic'
          | 'forceStopScreen';
        targetUserId?: number;
        msg?: string;
        mutedTill?: string;
        /*
          `debugLogResp` only, and THE ONLY FRAME ON THIS CHANNEL THAT TRAVELS MEMBER -> PRESENTER.

          All three are filled by the SERVER from the replying member's own session. Upstream lets
          that member choose its recipient — `{requestor: xe.requestor}` — which is the one thing
          this pair could not be ported with, because it would let any member push text into any
          presenter's Debug Log modal. `routes/debug-log.remote.ts` resolves the recipient from a
          request the server recorded when the presenter asked, and `sendDebugLog` takes no
          requestor argument at all.

          `getDebugLog` itself carries nothing but the target, like `forceReload` beside it.
        */
        fromUserId?: number;
        fromName?: string;
        log?: string;
        /*
          `updateProfilePic` only — the member's new avatar, already stored and already written to
          `users.avatar_url` before this frame is published. The row is the authority; this rides
          along so the member's own page updates without a reload, exactly as `recName` rides with
          `startRec`.
        */
        avatarUrl?: string;
        /*
          `forceStopScreen` only — WHICH of this member's screens to stop, as the producer id every
          peer already knows the share by.

          The frame is addressed to the SHARER, not to the room. Upstream's server closes the
          producer itself (`sendServerAdminCommand("forceStopScreen", {id: e._id})` at bundle byte
          1,969,578, and there is no `case "forceStopScreen"` anywhere in the bundle), which this
          room cannot reproduce: the SFU accepts `closeProducer` from the session that owns the
          producer and from nobody else. So the ask travels to the owner's browser, which closes its
          own producer, and the SFU's `producerClosed` notification tears the tab down everywhere —
          the same path a sharer clicking their own Stop already takes.

          The id is a producer id and NOT a user id on purpose: a member may be sharing several
          screens at once, and the reference's menu item stops exactly the one whose gear was
          opened.
        */
        producerId?: string;
      };
    };

type Subscriber = (event: RoomEvent) => void;

/**
 * One person in the room, in the shape the roster renders.
 *
 * Decoded from the raw staff capture (`sidebar-forced-open`, 66 nodes): each row is
 * `.room-roster-container > .regUser|.presUser > .media > img.rosterImg + .media-body >
 * .nickName > span`. `presUser` versus `regUser` is the only role signal in the markup, and the
 * capture's own code keys presence off `userXrefID`, which is why the id travels with the entry.
 */
export type RosterUser = {
  id: number;
  userXrefID: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  role: string;
  status: string;
  /*
    `createdAt` STOOD HERE and was removed on 2026-08-18, because nothing read it.

    It was written once — `createdAt: user.createdAt` in the SSE route — and consumed by no client
    code at all: not `RosterMember`, not `RosterEntryFlags`, not `RoomSidebar`'s entry generic, not
    `targetFor`. So every member was being handed every other member's account creation date, on
    every join and every leave, for nothing.

    Deleted rather than redacted, because there is no reader to redact FOR. That is DPE rule 3 —
    nothing exists without a consumer — and it is the cheaper half of the same lesson `locStr` and
    `email` taught the hard way on the same day.

    Note that `data.user.createdAt` on the page load is untouched and correct: that is the viewer's
    OWN account, and `page-load-contract.test.ts` pins it in that object's allow-list deliberately.
  */
  emailHash: string;
  /**
   * `r.isP` - the entry is a presenter.
   *
   * Derived from `role`, but carried explicitly because four separate gates read it off the ENTRY
   * rather than recomputing it, and one of them (`getRandomUser`) filters on it before the viewer's
   * own role is known: `roster.filter(r => !r.isP)`.
   */
  isP: boolean;
  /** `r.isFT` - a free-trial account. `getRandomUser`'s "Trials only" branch filters on it. */
  isFT: boolean;
  /** Controller-derived membership-age policy; exposed only to presenters by roster fan-out. */
  isNew?: boolean;
  /**
   * `r.hasAdminChat` on the ENTRY, which is not the same flag as the viewer's.
   *
   * The per-row gate reads both:
   * `onlyPresentersVisibleToViewers && (e.isP || e.hasAdminChat) || ... || user.hasAdminChat && (e.isP || e.hasAdminChat || user.userXrefID === e.userXrefID)`
   * so an admin-chat account is visible wherever a presenter is, and can itself see presenters and
   * other admin-chat accounts even when the roster is otherwise closed.
   */
  hasAdminChat: boolean;
  /**
   * `locStr` — the member's city line, e.g. `Waterbury, CT, US`.
   *
   * Empty until the browser's geolocation lookup answers, which is why it arrives after subscribe
   * rather than with it: the reference rides it in `userLoggedIn` at join, but that lookup is a
   * third-party call and blocking the room's event stream on it would be worse than a roster line
   * appearing a moment late.
   *
   * It sits beside the IP under `privData` in the reference and is presenter-only on the way out —
   * `locationVisibleTo` is the gate, and nothing here may publish it to a member.
   */
  locStr: string;
  /**
   * The four remaining permission checkboxes, PRESENTER-ONLY on the way out.
   *
   * ## Why they had to arrive here
   *
   * `#permissionsModal` seeds its five boxes from the roster entry the presenter clicked
   * (`ModalHost.svelte`, the `name === 'user'` effect). Four of the five were never carried, so
   * `Boolean(undefined)` made them all read UNCHECKED however the membership actually stood — and
   * `hasAdminChat` was carried, which is what made the modal look right enough not to be questioned.
   *
   * Harmless while the Save button sent nothing. The moment it started sending (2026-08-23) it
   * became a silent REVOCATION: the endpoint writes `false` for every key absent from `granted`, so
   * a presenter opening the modal and pressing Save would have stripped mic, screen, cam and notes
   * from a member who had them, and been told "Permissions applied".
   *
   * Found by reading the subscribe payload while checking whether `targetUser.id` was the room's
   * `users.id`. Nothing failed; the write path was green and wrong.
   *
   * ## Presenter-only, unlike `hasAdminChat` beside them
   *
   * `hasAdminChat` is published to everyone because the per-row VISIBILITY gate above reads it off
   * other people's entries. These four gate nothing a member can see, and their only consumer is a
   * modal a member cannot open, so they are redacted in `publishRosterToRoom` exactly as `email` and
   * `locStr` are. The narrower disclosure is the default; carrying them to everybody would be four
   * more facts about a member in every other member's browser for no reader.
   *
   * ## FLAT, because `+page.server.ts` was already flat
   *
   * A first draft made this a nested `permissions` object and it was an invention: `connectedUser`
   * has emitted flat `hasMic` / `hasScreen` / `hasCam` / `canEditNotes` since long before this, and
   * `page-load-contract.test.ts` pins all four by name. A roster row reaches `targetFor` from EITHER
   * source, so two shapes would have meant the modal seeded correctly or not depending on which path
   * filled it. The existing shape wins; the new code matches it.
   */
  hasMic: boolean;
  hasScreen: boolean;
  hasCam: boolean;
  canEditNotes: boolean;
};

/**
 * Subscribers per room.
 *
 * Module state, which this repository otherwise avoids on the server. It is justified here and
 * nowhere else: an SSE hub IS process-local state by definition, and the alternative - a database
 * poll per client - is the thing being replaced. The cost is stated above rather than hidden.
 */
const subscribers = new Map<string, Map<Subscriber, ListenerContext>>();

/**
 * What the hub knows about ONE connection.
 *
 * `user` is who it belongs to, or `null` for a subscriber that joined before an identity was known.
 * That has been the map's value since the roster was served from here.
 *
 * `chatChannels` joined it on 2026-08-28 with `chatTabsWithBadges`, and it is an entitlement rather
 * than a preference: a badge channel is readable by some members of a room and not others, so a
 * chat frame is no longer something the whole room is entitled to. `publishChatToRoom` and
 * `publishTypingToRoom` both consult it.
 *
 * ONE MAP, not two. A parallel `Map<Subscriber, Set<string>>` would have to be added and deleted in
 * step with this one at four sites, and the failure of that pattern is silent: a stale entry means
 * a closed connection's entitlement outliving it.
 */
export type ConnectionFacts = {
  /** `privData.ip` — the peer address SvelteKit reports for the request that opened the stream. */
  readonly address: string;
  /** `privData.uaStr` — the `User-Agent` header on that same request. */
  readonly userAgent: string;
  /** SvelteKit asset version for the server/client build that opened this connection. */
  readonly appVersion?: string;
  /** Controller-owned MediaMTX host selected for this room. */
  readonly streamServer?: string;
  /** Controller-owned cluster identifier, falling back to the media host. */
  readonly serverId?: string;
};

/**
 * What the SERVER observed about one connection, as opposed to what its client says about itself.
 *
 * ── WHY THIS IS ON THE HUB AND NOT ON THE WIRE ───────────────────────────────────────────────
 *
 * The reference's user card fills these from `socketService.getUserInfo(uid, rid, socketID, …)`
 * (bundle byte 1,159,275) — an invoke naming a live SOCKET, answered by the server that holds it.
 * The member's own browser is never asked, and it could not answer: a page has no way to learn its
 * own public address, and a `User-Agent` a client reports is a string it chose.
 *
 * So the same facts are taken from the same place here: the request that opened the SSE stream.
 * `getClientAddress()` and the request headers are the server's own observation of the connection,
 * which is `CLAUDE.md`'s rule — an authority decision is made on the server from data the server
 * owns — applied to telemetry rather than to permission.
 *
 * Unknown rather than absent, and never an empty string, so a reader downstream never has to
 * distinguish "no connection" from "a connection that reported nothing".
 */
export const UNKNOWN_CONNECTION: ConnectionFacts = {
  address: 'unknown',
  userAgent: 'unknown',
  appVersion: 'unknown',
  streamServer: 'not-configured',
  serverId: 'not-configured'
};

type ListenerContext = {
  user: RosterUser | null;
  /*
    Set once when the stream opens and never patched. A connection's address and user agent cannot
    change without a new connection, so unlike `user` — which `patchRosterUser` rewrites as
    permissions move — there is nothing here for a later frame to update, and a setter would only
    create a path for a client to overwrite the server's own observation.
  */
  connection: ConnectionFacts;
  /*
    Resolved on the SERVER when the stream opens, from the room's configuration and this member's
    badges — never asserted by the client. `memberChatChannels` is the one function that answers it,
    here and at the three other call sites.

    A subscriber that opened before the list could be resolved gets the two built-in channels, which
    is what every room had before badge channels existed and is the fail-closed answer: it can never
    widen access, only withhold a channel the member would have been allowed.
  */
  chatChannels: ReadonlySet<string>;
};

/**
 * Adds a listener; the returned function removes it. Always call it from the stream's `cancel`.
 *
 * The listener now carries WHO it belongs to. The hub already knew how many clients were in the
 * room and published that as `getRosterCount`, but the roster LIST was served from the page load
 * as `connectedUsers: [connectedUser]` - literally just yourself. So the badge counted everyone
 * and the list could only ever show one name, which is exactly what a presenter saw: "Users: 2"
 * above a list containing nobody but themselves.
 *
 * The subscriber set IS the presence table; it only needed an identity attached.
 */
export function subscribeToRoom(
  room: string,
  listener: Subscriber,
  user: RosterUser | null = null,
  /*
    The chat channels this connection is entitled to receive. Defaults to the built-in pair rather
    than to "everything": a caller that forgets to resolve them withholds a badge channel, which is
    the direction a mistake here has to fail in.
  */
  chatChannels: readonly string[] = BUILT_IN_CHAT_TABS,
  /*
    Defaults to `UNKNOWN_CONNECTION` rather than being required, for the same reason `chatChannels`
    defaults to the built-in pair: a caller that does not supply it withholds a fact, which is the
    direction a mistake here has to fail in. Every test double takes this default.
  */
  connection: ConnectionFacts = UNKNOWN_CONNECTION
): () => void {
  let listeners = subscribers.get(room);
  if (!listeners) {
    listeners = new Map();
    subscribers.set(room, listeners);
  }
  /*
    `onUserJoin` / `onUserLeave` — `app-room.full.js:2134-2155`, and the hub is the only thing that
    can know. The reference's roster is keyed on `userXrefID` and these two flip a single entry's
    `online` flag rather than appending a row, so they are PERSON events, not connection events.

    That distinction is the whole implementation: one person with three tabs must announce once on
    the first tab and once on the last. `heldBy` is asked BEFORE the set and AFTER the delete, so a
    second tab opening is silent and a second tab closing is silent.

    Anonymous listeners (`user === null`) announce nothing: there is no name to put in the message,
    and the reference's payload is `{nick, userXrefID}`.
  */
  const alreadyHere = user !== null && heldBy(listeners, user.id);
  listeners.set(listener, { user, chatChannels: new Set(chatChannels), connection });
  if (user !== null && !alreadyHere) {
    publishToRoom(room, {
      channel: 'roster',
      data: { cmd: 'onUserJoin', userId: user.id, nick: user.displayName }
    });
  }

  // A join is the only event that can raise a high-water mark. See `notePeakOccupancy`.
  notePeakOccupancy(room, listeners.size);

  return () => {
    listeners.delete(listener);
    if (user !== null && !heldBy(listeners, user.id)) {
      publishToRoom(room, {
        channel: 'roster',
        data: { cmd: 'onUserLeave', userId: user.id, nick: user.displayName }
      });
    }
    // Drop the room once nobody is listening, so an empty room costs nothing.
    if (listeners.size === 0) {
      subscribers.delete(room);
      // And its peak with it — the durable value is the controller's, which this never lowers.
      reportedPeak.delete(room);
    }
  };
}

/** Whether any remaining listener in this room belongs to that person. */
function heldBy(listeners: Map<Subscriber, ListenerContext>, userId: number): boolean {
  for (const held of listeners.values()) {
    if (held.user?.id === userId) return true;
  }
  return false;
}

/**
 * Attaches a location to every connection this person holds, and reports whether anything changed.
 *
 * Keyed by user id rather than by listener because one person may hold several tabs and the roster
 * dedupes by id — updating only the tab that reported would leave whichever entry `roomRoster`
 * happened to pick unchanged.
 */
export function setRosterLocation(room: string, userId: number, locStr: string): boolean {
  return patchRosterUser(room, userId, { locStr });
}

/**
 * Attaches a new avatar to every connection this person holds, and reports whether anything changed.
 *
 * ## Why the roster needs telling at all
 *
 * `RosterUser.avatarUrl` is captured into the subscriber context at SUBSCRIBE TIME, from the row as
 * it read then (`sess/[room]/events/+server.ts`). So a presenter changing `users.avatar_url` writes
 * the durable half and leaves every open roster showing the old picture until each member happens to
 * reconnect — which was true of the first draft of `uploadProfilePicture`, whose comment claimed the
 * roster push carried the new URL. It did not; it re-pushed the snapshot.
 *
 * This is the same problem `setRosterLocation` was written for and it now shares its body. Two
 * copies of "patch one field on every connection this person holds, deduping by user id" is how one
 * of them ends up not deduping.
 */
export function setRosterAvatar(room: string, userId: number, avatarUrl: string): boolean {
  return patchRosterUser(room, userId, { avatarUrl });
}

/**
 * Patch fields on every connection one person holds, reporting whether anything actually changed.
 *
 * Keyed by user id rather than by listener because one person may hold several tabs and the roster
 * dedupes by id — updating only the tab that reported would leave whichever entry `roomRoster`
 * happened to pick unchanged.
 *
 * The equality check is what makes the `changed` answer worth having: both callers use it to decide
 * whether to publish, and a geolocation lookup that answers with the city it already had must not
 * cost the room a roster broadcast.
 */
function patchRosterUser(room: string, userId: number, patch: Partial<RosterUser>): boolean {
  const listeners = subscribers.get(room);
  if (!listeners) return false;
  let changed = false;
  for (const [listener, context] of listeners) {
    const { user } = context;
    if (!user || user.id !== userId) continue;
    const differs = Object.entries(patch).some(
      ([key, value]) => user[key as keyof RosterUser] !== value
    );
    if (!differs) continue;
    listeners.set(listener, { ...context, user: { ...user, ...patch } });
    changed = true;
  }
  return changed;
}

/**
 * Everyone currently in the room, one entry per person.
 *
 * Deduped by user id, not by connection: two tabs are one person in the roster. The capture agrees
 * - its roster is keyed on `userXrefID` and `onUserJoin`/`onUserLeave` flip a single entry's
 * `online` flag rather than appending a second row.
 */
export function roomRoster(room: string): RosterUser[] {
  const listeners = subscribers.get(room);
  if (!listeners) return [];
  const byId = new Map<number, RosterUser>();
  for (const { user } of listeners.values()) {
    if (user && !byId.has(user.id)) byId.set(user.id, user);
  }
  return [...byId.values()].map((user) => ({ ...user, isNew: user.isNew === true }));
}

/**
 * What the server observed about a member's LIVE connections to this room, newest map order first.
 *
 * ── THE FIVE CELLS THIS EXISTS FOR ───────────────────────────────────────────────────────────
 *
 * `ModalHost.svelte`'s System tab renders `targetUser.ip`, `.userAgent`, `.appVersion`,
 * `.streamServer` and `.serverId`. Measured 2026-08-31: **none of the five had a producer anywhere
 * in this room** — one consumer each, one declaration each on `ModalTargetUser`, and nothing that
 * ever assigned them. Every one read `n/a` for everybody, always, on every path. That is the same
 * defect `server/user-detail.ts` was written to close for `loggedIn` and `email`, and it is the
 * socket half of the reference's `userInfo` that `TODO.md` row 9 tracks.
 *
 * TWO of the five are answered here, and three are not, which is recorded rather than filled in:
 *
 *   `ip` / `userAgent`  the server's own observation of the connection — this function
 *   `appVersion`        upstream's `data.cver`, a build string only the CLIENT knows. It would have
 *                       to be reported by the browser, and a member debugging badly can report any
 *                       string they like — which is the one thing that makes the cell worthless to
 *                       the presenter reading it. Not built, and not invented.
 *   `streamServer`      the media plane. Blocked on a `STREAM_SERVER_MTX` host, the same blocker
 *   `serverId`          `TODO.md` rows X, AC and R carry.
 *
 * `location` (upstream's `privData.locStr`) is the sixth and **is supplied, since 2026-09-01**.
 * This paragraph used to say it *"needs a geo-IP service this repository does not have"*, which was
 * wrong: the reference's geo lookup is CLIENT-side (bundle 1,145,213) and reaches its server on the
 * login frame, and this room does the same thing — `events.svelte.ts` POSTs to `api/roster/location`,
 * which calls `setRosterLocation` sixty lines below this docblock. The value has been on the roster,
 * and rendered in the sidebar, the whole time; what was missing was the field on
 * `RosterRowForTarget`, so the modal read `undefined` off the object that already held it.
 *
 * ## Returns null for somebody who is not here
 *
 * Presence is what this hub knows and nothing else. A member who has closed the tab has no
 * connection to describe, and answering with the LAST one would be reporting a fact about the past
 * as though it were current — which is exactly what the presenter opening this card is trying not
 * to be told.
 *
 * One connection is returned rather than all of them, matching `roomRoster`'s own dedupe: two tabs
 * are one person, and the card has one row per fact. Insertion order, so it is the FIRST connection
 * this person still holds — stable across a re-render, which a "most recent" rule would not be.
 */
export function liveConnectionFor(room: string, userId: number): ConnectionFacts | null {
  const listeners = subscribers.get(room);
  if (!listeners) return null;
  for (const { user, connection } of listeners.values()) {
    if (user?.id === userId) return connection;
  }
  return null;
}

/**
 * Fan one event out to every listener in a room.
 *
 * A throwing listener must not stop the others: one client's dead connection would otherwise
 * silence the whole room, which is the failure mode this code exists to prevent.
 */
export function publishToRoom(room: string, event: RoomEvent): void {
  const listeners = subscribers.get(room);
  if (!listeners) return;
  for (const listener of listeners.keys()) {
    try {
      listener(event);
    } catch (error) {
      console.error('[room-events] subscriber failed', error);
    }
  }
}

/**
 * Fan the ROSTER out, deciding per recipient which private fields they may see.
 *
 * Two fields are presenter-only: `locStr` and `email`. They are redacted together because they are
 * one question — "may this recipient see another member's personal details" — and splitting them
 * would be two answers to it.
 *
 * ## `email`, added 2026-08-18 on the owner's decision
 *
 * The REFERENCE never puts an address in a roster entry. `roster-gates.ts` records it verbatim:
 * *"The capture hashes the term because its roster entries carry only `emailHash`, never the
 * address. Ours carry `email`, so the second clause is a direct comparison — same result, without
 * an md5 implementation in the browser to reach it."* That shortcut put every member's address in
 * every other member's browser.
 *
 * The address is kept for PRESENTERS because two features need it — the roster's exact-email search
 * and the user-info modal's `mailto:` link — and a presenter is the role the reference trusts with
 * `privData` anyway. A member keeps `emailHash`, so avatars and badge lookups are unaffected; what
 * they lose is matching the roster search box against a full address, which is a flow that requires
 * already knowing the address. Recorded as the accepted cost of the choice rather than discovered
 * later as a regression.
 *
 * ## The defect this closes, found 2026-08-18
 *
 * `locStr` is documented three hundred lines above as *"presenter-only on the way out —
 * `locationVisibleTo` is the gate, and nothing here may publish it to a member."* The gate existed
 * and worked, but it is `roster-gates.ts:locationVisibleTo`, which runs in the BROWSER: the sidebar
 * wraps the city line in `{#if locationVisible(user)}` and draws nothing for a member.
 *
 * The wire was never filtered. `roomRoster()` returns whole `RosterUser` objects, `publishToRoom`
 * hands the same object to every listener, and three call sites published it on every join, every
 * leave, and every time a browser's geolocation lookup answered. So a member's DevTools network tab
 * showed every other member's city — the UI declined to draw data it had already been given.
 *
 * That is the exact shape the root standard forbids: *"Every authority decision is made on the
 * server from data the server owns — never asserted by the client, ever, for any reason."* A render
 * gate is not an authority decision; it is a decoration over one that was never made.
 *
 * ## Why the decision is safe to make here
 *
 * The subscriber map already holds WHO each listener is, and `RosterUser.isP` is set at subscribe
 * time from `membership?.isP` — read from the room's own membership row, server-side, and the note
 * at that assignment records deliberately choosing it as the SINGLE source rather than falling back
 * to the session role. So the authority is server-owned, and an anonymous listener (`user === null`)
 * is not a presenter and is redacted, which fails closed.
 *
 * This is `publishChatToRoom`'s shape, for `publishChatToRoom`'s reason: the answer differs per
 * recipient, and the hub is the only place that knows who each recipient is.
 */
export function publishRosterToRoom(room: string): void {
  const listeners = subscribers.get(room);
  if (!listeners) return;

  const forPresenters = roomRoster(room);
  /*
    Redacted ONCE per publish rather than per listener: this runs on every join and every leave, so
    a room of fifty is one pass over the roster and not fifty.

    An entry with neither field set is passed through BY REFERENCE — that is the common case for
    `locStr`, which stays empty until a browser's geolocation lookup answers.
  */
  /*
    `permissions` joins `locStr` and `email` in the redaction, and it is why the pass-through
    shortcut below had to go: those two can legitimately be empty, but the four permission flags are
    always present, so there is no "already blank" case to skip on. Copying every entry is the same
    one pass over the roster the comment above describes.
  */
  const forMembers = forPresenters.map((entry) => ({
    ...entry,
    locStr: '',
    email: '',
    hasMic: false,
    hasScreen: false,
    hasCam: false,
    canEditNotes: false,
    isNew: false
  }));

  for (const [listener, { user: viewer }] of listeners) {
    try {
      listener({
        channel: 'roster',
        data: { cmd: 'getRoster', users: viewer?.isP === true ? forPresenters : forMembers }
      });
    } catch (error) {
      // Same contract as `publishToRoom`: one dead connection must not silence the room.
      console.error('[room-events] subscriber failed', error);
    }
  }
}

/**
 * Fan a CHAT frame out, deciding per recipient whether it mentions them.
 *
 * ## Why this is not `publishToRoom`
 *
 * Every other channel sends one object to everybody. Chat cannot: the answer to "does this mention
 * you" is different for each listener, and the only place that can be computed without putting the
 * message text on the wire is here, where the subscriber map already holds who each listener is.
 *
 * ## Why it matters
 *
 * A member with `visibilityChangeEnabled` and a hidden tab does not refetch on a chat frame — that
 * is the whole point of the preference. Upstream keeps mentions alive on that branch:
 *
 * ```js
 * visibilityChangeEnabled && !appHasFocus ? te.isMention && emit('chatMsg', te) : push(...)
 * ```
 *
 * Without this bit the client cannot tell a mention from any other message, so the one message
 * addressed to you by name waited until you came back. That divergence was found on 2026-08-16 and
 * is closed here.
 *
 * ## What it does NOT publish
 *
 * `body` and `fromAdmin` are parameters, not payload. They are read to answer the question and
 * discarded; `data` is the same object every listener already received. The bit tells a recipient
 * about their OWN name and nothing about the message, the sender, or anybody else — and an
 * anonymous listener, which has no name to match, is told `false` by `isMentionOf`'s own guard.
 */
export function publishChatToRoom(
  room: string,
  channel: string,
  data: unknown,
  message: { body: string | null | undefined; fromAdmin: boolean }
): void {
  const listeners = subscribers.get(room);
  if (!listeners) return;
  for (const [listener, context] of listeners) {
    /*
      THE SECOND THING THIS FAN-OUT DECIDES PER RECIPIENT, added 2026-08-28.

      `chatTabsWithBadges` makes a chat channel an ENTITLEMENT: a room's badge channels are readable
      by some of its members and not others. This frame carries no body — the mention bit above is
      the whole reason it is built per listener — but it does carry the sender's id, their email hash
      and the channel name, and it is what makes a client refetch. Sent to everyone, it would tell a
      member without the badge that a private channel exists and that somebody just posted in it,
      and their refetch would ask for a page the load has already refused them.

      The entitlement is the one `memberChatChannels` resolved when the stream opened. A listener
      that has none of it — an anonymous subscriber, or one that opened before the list was known —
      holds the two built-in channels, so this skips it for a badge channel and never for `main`.
    */
    if (!context.chatChannels.has(channel)) continue;
    try {
      listener({
        channel: 'chat',
        data,
        isMention: isMentionOf(message.body, context.user?.displayName, message.fromAdmin)
      });
    } catch (error) {
      console.error('[room-events] subscriber failed', error);
    }
  }
}

/**
 * Deliver an event to NAMED PEOPLE ONLY, rather than to everyone in the room.
 *
 * ## The defect this closes, found 2026-08-19 by tracing every publisher
 *
 * `publishToRoom` hands the identical object to every listener. That is correct for the channels it
 * was written for — a chat message, a screen command, a roster count are all things the whole room
 * is entitled to. It was also being used for PRIVATE CHAT, where it is not.
 *
 * The three `privChat` publishes sent a message carrying `txt` — the body — to every subscriber in
 * the room, and `events.svelte.ts` discarded the ones not addressed to it:
 *
 * ```js
 * if (priv?.toUserId !== this.#session().user.id) return;
 * ```
 *
 * A CLIENT-SIDE filter over a server-side broadcast. Every member of a room received every private
 * message sent in it, in plaintext, and their browser politely threw it away. Anyone with the
 * network tab open read the lot.
 *
 * This is the same shape as the roster's `locStr` and `email` on 2026-08-18, and the root standard
 * names it exactly: *"Every authority decision is made on the server from data the server owns —
 * never asserted by the client, ever, for any reason."* Private chat is the sharpest instance of it
 * in this application, because privacy is the entire product of the feature.
 *
 * ## Why an id list rather than a predicate
 *
 * The caller names WHO, and this decides HOW — the subscriber map is the only thing that knows
 * which connections belong to a person, and one person may hold several tabs. Passing ids keeps the
 * authority here and makes the call site read as the delivery address it is.
 *
 * ## Fails closed
 *
 * An anonymous listener has no `RosterUser`, so it matches no id and receives nothing. A room with
 * no such person delivers to nobody rather than to everybody, which is the direction a mistake here
 * has to fail in.
 */
export function publishToUsers(room: string, userIds: readonly number[], event: RoomEvent): void {
  const listeners = subscribers.get(room);
  if (!listeners) return;
  const addressed = new Set(userIds);

  for (const [listener, { user }] of listeners) {
    if (user === null || !addressed.has(user.id)) continue;
    try {
      listener(event);
    } catch (error) {
      // Same contract as every other fan-out here: one dead connection must not silence the rest.
      console.error('[room-events] subscriber failed', error);
    }
  }
}

/** Listener count, for tests and for proving fan-out actually happened. */
export function roomSubscriberCount(room: string): number {
  return subscribers.get(room)?.size ?? 0;
}

/**
 * The highest occupancy THIS PROCESS has already reported, per room.
 *
 * The reason a counter lives here rather than the reporter just POSTing on every join: without it a
 * busy room makes one control-plane request per arrival, forever, to move a number that changes a
 * handful of times a day. With it the requests are bounded by the number of NEW PEAKS this process
 * sees — at most `peak` of them over a room's whole life, and typically a short burst as a room
 * fills and then nothing.
 *
 * It is deliberately process-local and deliberately never lowered, which makes a restart re-report
 * from zero and re-establish the true mark on the way up. That is correct rather than merely
 * tolerable: the controller's write is `WHERE recorded_max_capacity < $1`, so a re-report below the
 * stored mark changes nothing, and the stored value is the one that outlives every process.
 *
 * Cleared when the room empties, for the same reason the listener map is: a `Map` that grows one key
 * per room that ever existed is a leak in a long-lived server.
 */
const reportedPeak = new Map<string, number>();

/**
 * Report `count` as this room's occupancy if it beats everything this process has reported.
 *
 * Fire-and-forget on purpose. `subscribeToRoom` runs on the request path of a member opening their
 * event stream, and awaiting a call to another service there would put the control plane's latency —
 * and its outages — in front of somebody joining a room. `reportRoomOccupancy` never throws and
 * logs its own failures, so there is nothing here to catch and nothing to swallow.
 */
function notePeakOccupancy(room: string, count: number): void {
  if (count <= (reportedPeak.get(room) ?? 0)) return;
  reportedPeak.set(room, count);
  void reportRoomOccupancy(room, count);
}

/**
 * Fan a typing update out, deciding per recipient which names they see.
 *
 * One frame per listener, because the answer differs per listener: their own name is removed. The
 * shape follows `publishRosterToRoom` directly — same reason, same structure.
 */
export function publishTypingToRoom(room: string, chatChannel: string): void {
  const listeners = subscribers.get(room);
  if (!listeners) return;
  for (const [listener, context] of listeners) {
    /*
      Same entitlement as the chat fan-out above, and it matters as much: a typing frame names the
      people typing in a channel, so sending a badge channel's to the whole room would leak both the
      channel's existence and who is active in it. See `publishChatToRoom`.
    */
    if (!context.chatChannels.has(chatChannel)) continue;
    try {
      listener({
        channel: 'typing',
        /*
          `context.user` is the listener's own `RosterUser`, or null for a subscriber that joined
          before one was known. A null user gets the UNFILTERED list, which is correct rather than a
          shortcut: it has no identity to remove, and `-1` matches no real user id.
        */
        data: { chatChannel, names: typistsIn(room, chatChannel, context.user?.id ?? -1) }
      });
    } catch (error) {
      console.error('[room-events] typing subscriber failed', error);
    }
  }
}
