import type { RequestHandler } from './$types';

/*
  This route is the room's realtime channel: a long-lived `text/event-stream` with a heartbeat.

  On a serverless platform it is the one endpoint whose natural lifetime exceeds the platform's.
  Left on the default, the stream would be cut after a few seconds and `EventSource` would
  reconnect immediately, producing a reconnect storm rather than a live room.

  `maxDuration` asks for the longest run the plan allows, which turns "reconnects constantly" into
  "reconnects rarely". It does NOT make the stream permanent — no serverless function is permanent
  — so the reconnect path stays load-bearing and must keep working.

  `svelte.config.js` documents the alternative: `ADAPTER=node` deploys this to a long-running host
  where the stream lives as long as the session does. This config is inert under that adapter.
*/
export const config = {
  runtime: 'nodejs22.x',
  maxDuration: 800
};
import {
  publishToRoom,
  roomRoster,
  subscribeToRoom,
  type RoomEvent
} from '#lib/server/room-events.js';
import { startMtxReconcile, stopMtxReconcileIfEmpty } from '#lib/server/mtx-reconciler.js';
import { error } from '@sveltejs/kit';
import { requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import { hashEmail } from '#lib/server/connection.js';
import { readRoomConfig, type RoomMembership } from '#lib/server/room-config-client.js';

/**
 * `GET /sess/{room}/events` - the room's realtime channel.
 *
 * The captured app opens ten SocketCluster channels under `/sess/{sessionID}/...`; this is the
 * same path shape carrying the same payloads over Server-Sent Events, which this stack already
 * supports without adding a socket library. Each message names its channel, so one connection
 * serves `alerts` and `chat` exactly as the capture's separate subscriptions do.
 *
 * Authenticated: `requireUser` throws for an anonymous request, so a stranger cannot read a
 * room's alert stream by guessing the path. That matters more here than on a form action - this
 * endpoint pushes every alert the moment it is posted.
 */
export const GET: RequestHandler = async ({ params, locals, request }) => {
  // Throws for an unauthenticated request rather than opening an anonymous firehose.
  const user = requireUser(locals);
  /*
    The room from the SESSION, not from the path.

    `params.room` is whatever the client typed. Subscribing on it would let anyone with a session
    read any room's alerts, chat and roster by changing one segment of a URL. `requireRoomShortCode`
    reads the value `/session` wrote when the controller handed this browser in, so the path is a
    label and the session is the authority. A mismatch is a client asking for a room it is not in.
  */
  const room = requireRoomShortCode(locals);
  if (params.room !== room) {
    error(403, 'That is not the room this session is in.');
  }

  /*
    Read before the stream opens, and deliberately allowed to fail soft.

    Everything else about this endpoint works without the controller; refusing the whole realtime
    channel because a config read timed out would take alerts and chat down for a reason that has
    nothing to do with them. A null membership falls back to what the session already proves — the
    room's own role — which is the same answer this endpoint gave before it asked at all.
  */
  let membership: RoomMembership | null = null;
  try {
    membership = (await readRoomConfig(request, room, user.email)).member;
  } catch (cause) {
    console.warn('[events] no membership for this subscriber; roster flags fall back', cause);
  }

  let unsubscribe: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  /**
   * Tear this connection down and tell the room, exactly once.
   *
   * Idempotent because three different things race to call it: the stream's `cancel()`, the
   * request's abort signal, and a heartbeat that fails to write. Publishing the roster twice would
   * be harmless, but unsubscribing twice then re-publishing a count that already excluded this
   * client is how a leave gets announced as a join.
   */
  let closed = false;
  const teardown = () => {
    if (closed) return;
    closed = true;
    unsubscribe?.();
    if (heartbeat) clearInterval(heartbeat);
    /*
      After unsubscribing, so the count this reads already excludes this client. One timer per room,
      stopped when the room empties — an idle room must not keep polling MediaMTX forever.
    */
    stopMtxReconcileIfEmpty(room);
    // Unsubscribing first means these already exclude this client.
    publishToRoom(room, {
      channel: 'roster',
      data: { cmd: 'getRosterCount', data: roomRoster(room).length }
    });
    publishToRoom(room, { channel: 'roster', data: { cmd: 'getRoster', users: roomRoster(room) } });
  };

  /*
    The abort signal, not just `cancel()`.

    `cancel()` fires for a graceful close - a navigation, a tab closed politely. It does NOT fire
    when the client simply vanishes: a killed process, a lost network, a laptop lid. Measured, those
    connections stayed in the subscriber set forever, so a room reported people who had left hours
    ago and the count above the roster never came back down.

    A heartbeat cannot detect it either: `controller.enqueue` on a dead SSE stream does not throw in
    Node, it is silently dropped. `request.signal` is the one thing that actually fires.
  */
  request.signal.addEventListener('abort', teardown);

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (event: RoomEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      // An immediate comment flushes headers, so the client's `onopen` fires now rather than on
      // the first alert - otherwise a quiet room looks like a failed connection.
      controller.enqueue(encoder.encode(': connected\n\n'));

      // The identity goes in with the listener, so the hub can answer WHO is here and not just
      // how many. See `subscribeToRoom`.
      unsubscribe = subscribeToRoom(room, send, {
        id: user.id,
        // `userXrefID` is what the capture keys presence on - `onUserJoin`/`onUserLeave` both
        // match against it. Carried as a string so it survives the uuid cutover unchanged.
        userXrefID: String(user.id),
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
        // They are holding an open stream, so they are online by definition - the stored column
        // is a stale snapshot from whenever it was last written.
        status: 'online',
        createdAt: user.createdAt,
        emailHash: hashEmail(user.email),
        /*
          The real per-room standing, read once when the connection opens.

          These were hardcoded false with a note saying the hub could not know them. It can: one
          config read at subscribe time is the same call the page load already makes, and it
          happens once per CONNECTION, not per message — an SSE connection is held for the whole
          session, so this is not on the message path at all.

          It matters because the roster is what other people see. `isFT` drives the TRIAL filter
          and "Only select from Trials?"; `hasAdminChat` decides whether a row is visible in a room
          that shows only presenters, and whether it carries `presUser` alongside `regUser`. False
          for everyone made a trial invisible to the filter and an admin-chat member indistinguish-
          able from a participant, in every other member's browser.
        */
        /*
          One source, not a fallback pair.

          This was `membership?.isP ?? isPresenterRole(user.role)`. Both sides happened to agree,
          because `role` is reconciled from this same membership — but two ways of computing one
          fact is exactly the shape of the privilege-escalation defect that survived a day in this
          file, where a token TYPE was read as authority. A guest has no membership row and is not
          a presenter in anybody's roster, so `false` is the honest answer rather than a second
          opinion derived from the room's own account table.
        */
        /* Filled in by `POST /api/roster/location` once the browser's lookup answers. */
        locStr: '',
        isP: membership?.isP === true,
        isFT: membership?.isFT ?? false,
        hasAdminChat: membership?.permissions.hasAdminChat ?? false
      });

      /*
        The roster count is the number of PEOPLE, not the number of connections.

        `handleRosterCmd` does one useful thing with this channel -
        `case "getRosterCount": this.globals.rosterCount = parseInt(i.data)` - and the number sits
        directly above the roster list in the sidebar, so the two have to agree. Counting
        subscribers instead counted TABS: one person with the room open twice read as two users,
        and a presenter saw "Users: 4" over a list of two names.
      */
      publishToRoom(room, {
        channel: 'roster',
        data: { cmd: 'getRosterCount', data: roomRoster(room).length }
      });
      // `onUserJoin` in the capture. The list goes out with the count so a client never has to
      // refetch the page to learn who arrived.
      publishToRoom(room, {
        channel: 'roster',
        data: { cmd: 'getRoster', users: roomRoster(room) }
      });

      /*
        Start reconciling this room's MediaMTX streams, if nothing already is.

        Idempotent, so this route does not have to know whether it is the first client, and a no-op
        when `MEDIA_API_URL` is unset — a deployment without MediaMTX runs no timers. One timer per
        ROOM rather than per connection: ten members watching one room is one poll, not ten.

        This is what makes the stream list correct rather than merely fast. `/internal/media-hook`
        is a shell `curl` MediaMTX spawns, with no retry and no delivery guarantee, and it reaches
        only the instance it happened to land on.
      */
      startMtxReconcile(room);

      // Proxies and browsers drop an idle stream. A comment every 25s keeps it open and costs
      // nothing; it is not an event, so no client handler sees it.
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          // A write that throws means the stream is already finished. Belt and braces behind the
          // abort signal, which is what actually catches a vanished client.
          teardown();
        }
      }, 25_000);
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
      // Tell whoever is left. Unsubscribing first means the count already excludes this client.
      publishToRoom(room, {
        channel: 'roster',
        data: { cmd: 'getRosterCount', data: roomRoster(room).length }
      });
      // `onUserLeave`.
      publishToRoom(room, {
        channel: 'roster',
        data: { cmd: 'getRoster', users: roomRoster(room) }
      });
    }
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      // Nginx and friends buffer by default, which turns a live stream into a batch delivered at
      // close. This is the header that stops it.
      'x-accel-buffering': 'no'
    }
  });
};
