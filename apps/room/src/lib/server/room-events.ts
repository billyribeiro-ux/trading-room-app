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
import { isMentionOf } from '../mention';

import type { PrivateChatMessage } from './private-chat';

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
   */
  /**
   * `getRosterCount` carries the number; `getRoster` carries the people.
   *
   * The capture drains both off this channel - `handleRosterCmd` sets `globals.rosterCount` from
   * one, and `loadRoster()` / the `getRoster` event refresh `globals.roster`, which is what
   * `checkUserOnlineStatus` reads.
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
  | { channel: 'privCmds'; data: { cmd: 'forceReload' | 'unmuteChat'; targetUserId?: number } };

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
  createdAt: Date;
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
};

/**
 * Subscribers per room.
 *
 * Module state, which this repository otherwise avoids on the server. It is justified here and
 * nowhere else: an SSE hub IS process-local state by definition, and the alternative - a database
 * poll per client - is the thing being replaced. The cost is stated above rather than hidden.
 */
const subscribers = new Map<string, Map<Subscriber, RosterUser | null>>();

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
  user: RosterUser | null = null
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
  listeners.set(listener, user);
  if (user !== null && !alreadyHere) {
    publishToRoom(room, {
      channel: 'roster',
      data: { cmd: 'onUserJoin', userId: user.id, nick: user.displayName }
    });
  }

  return () => {
    listeners.delete(listener);
    if (user !== null && !heldBy(listeners, user.id)) {
      publishToRoom(room, {
        channel: 'roster',
        data: { cmd: 'onUserLeave', userId: user.id, nick: user.displayName }
      });
    }
    // Drop the room once nobody is listening, so an empty room costs nothing.
    if (listeners.size === 0) subscribers.delete(room);
  };
}

/** Whether any remaining listener in this room belongs to that person. */
function heldBy(listeners: Map<Subscriber, RosterUser | null>, userId: number): boolean {
  for (const held of listeners.values()) {
    if (held?.id === userId) return true;
  }
  return false;
}

/**
 * Everyone currently in the room, one entry per person.
 *
 * Deduped by user id, not by connection: two tabs are one person in the roster. The capture agrees
 * - its roster is keyed on `userXrefID` and `onUserJoin`/`onUserLeave` flip a single entry's
 * `online` flag rather than appending a second row.
 */
/**
 * Attaches a location to every connection this person holds, and reports whether anything changed.
 *
 * Keyed by user id rather than by listener because one person may hold several tabs and the roster
 * dedupes by id — updating only the tab that reported would leave whichever entry `roomRoster`
 * happened to pick unchanged.
 */
export function setRosterLocation(room: string, userId: number, locStr: string): boolean {
  const listeners = subscribers.get(room);
  if (!listeners) return false;
  let changed = false;
  for (const [listener, user] of listeners) {
    if (!user || user.id !== userId || user.locStr === locStr) continue;
    listeners.set(listener, { ...user, locStr });
    changed = true;
  }
  return changed;
}

export function roomRoster(room: string): RosterUser[] {
  const listeners = subscribers.get(room);
  if (!listeners) return [];
  const byId = new Map<number, RosterUser>();
  for (const user of listeners.values()) {
    if (user && !byId.has(user.id)) byId.set(user.id, user);
  }
  return [...byId.values()];
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
 * Fan the ROSTER out, deciding per recipient whether they may see anyone's location.
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

  const withLocation = roomRoster(room);
  /*
    Redacted ONCE per publish rather than per listener: this runs on every join and leave, so a room
    of fifty is one pass over the roster and not fifty. Entries with no location are passed through
    by reference, because the common case is a room where nobody's lookup has answered yet.
  */
  const withoutLocation = withLocation.map((entry) =>
    entry.locStr === '' ? entry : { ...entry, locStr: '' }
  );

  for (const [listener, viewer] of listeners) {
    try {
      listener({
        channel: 'roster',
        data: { cmd: 'getRoster', users: viewer?.isP === true ? withLocation : withoutLocation }
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
  data: unknown,
  message: { body: string | null | undefined; fromAdmin: boolean }
): void {
  const listeners = subscribers.get(room);
  if (!listeners) return;
  for (const [listener, user] of listeners) {
    try {
      listener({
        channel: 'chat',
        data,
        isMention: isMentionOf(message.body, user?.displayName, message.fromAdmin)
      });
    } catch (error) {
      console.error('[room-events] subscriber failed', error);
    }
  }
}

/** Listener count, for tests and for proving fan-out actually happened. */
export function roomSubscriberCount(room: string): number {
  return subscribers.get(room)?.size ?? 0;
}
