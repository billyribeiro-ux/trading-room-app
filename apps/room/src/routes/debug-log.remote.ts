import { command, getRequestEvent } from '$app/server';
import { z } from 'zod';
import { presenterRoom, requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import { ensureDatabase } from '#lib/server/db/index.js';
import { publishToUsers } from '#lib/server/room-events.js';
import { noteDebugLogRequested, takeDebugLogRequestor } from '#lib/server/debug-log-requests.js';
import { CAPACITY, MAX_LINE } from '#lib/debug-log-buffer.js';

/*
  `getDebugLog` / `debugLogResp` — a presenter pulls the in-memory console log out of ONE member's
  browser.

  Sender, byte 2,080,323:

    getDebugLog(){ this.appService.sendServerAdminCommand("getDebugLog", this.user) }

  No confirm and no local alert; the presenter's modal simply fills when the answer arrives. The
  reply, byte 996,046: `{requestor: xe.requestor, log: V1}`.

  ## THE ONE FRAME THAT TRAVELS MEMBER -> PRESENTER

  Every other command on `privCmds` goes presenter->member. This pair is the exception, and that is
  the whole reason it needed design rather than transcription.

  Upstream's reply echoes the requestor field back, so the CLIENT names who receives the log. A
  member could then post arbitrary text into any presenter's Debug Log modal — and the presenter has
  no way to tell it apart from a real answer, because a real answer is also arbitrary text.

  So `sendDebugLog` BELOW TAKES NO REQUESTOR ARGUMENT AT ALL. The server recorded who asked when the
  presenter asked, and looks it up by the caller's own session. A field that does not exist cannot be
  trusted by a future edit, which is a stronger guarantee than validating one — and it is the
  2026-08-07 rule (authority is decided on the server, from data the server owns) arriving on the one
  frame that runs the other way.

  ## Both directions are ADDRESSED

  `publishToUsers`, like `forceReload` and `restartAudio`. This room's transport is per ROOM, so a
  broadcast reply would hand one member's console to everybody. Both frames name exactly one
  recipient and the receiver checks it again in `RoomPrivateCommands`, which is deny-by-default.
*/

/**
 * A presenter asks one member for its log.
 *
 * `presenterRoom()` is the gate and the tenant in one call, for the reason `auth.ts` gives: handed
 * out separately they can be applied separately, and applying only the first is a presenter of one
 * room reaching another.
 *
 * Nothing is returned. Upstream raises no alert here either — the answer IS the modal filling, and
 * inventing a "request sent OK" would be exactly the `EXACT_ALERTS` shape this repository has spent
 * four commits removing.
 */
export const requestDebugLog = command(z.number().int().positive(), async (targetUserId) => {
  ensureDatabase();
  const room = presenterRoom();
  const { locals } = getRequestEvent();
  const requestor = requireUser(locals);

  /*
    RECORDED BEFORE THE FRAME IS SENT, and the order is load-bearing. A member's browser can answer
    fast enough to race a slow write, and a reply that arrives before the claim exists is dropped by
    `takeDebugLogRequestor` with no way to tell it from a forged one.
  */
  noteDebugLogRequested(room, targetUserId, requestor.id);

  publishToUsers(room, [targetUserId], {
    channel: 'privCmds',
    data: { cmd: 'getDebugLog', targetUserId }
  });
});

/**
 * A member answers with its log. Callable by anyone — the gate is that somebody ASKED.
 *
 * Not presenter-gated on purpose: the member replying is an ordinary participant, and requiring a
 * role here would make the feature work only between presenters. The authority that matters is
 * whether a live request exists for this caller, which is a fact the server owns.
 *
 * The bound is `CAPACITY * MAX_LINE` plus the newlines between them, which is the largest text
 * `DebugLogBuffer` can produce. Stated in terms of the buffer's own constants rather than as a
 * number, so a change to either cannot leave this schema quietly refusing valid logs.
 */
export const sendDebugLog = command(
  z.strictObject({ log: z.string().max(CAPACITY * (MAX_LINE + 1)) }),
  async ({ log }) => {
    ensureDatabase();
    const { locals } = getRequestEvent();
    const sender = requireUser(locals);
    const room = requireRoomShortCode(locals);

    const requestorUserId = takeDebugLogRequestor(room, sender.id);

    /*
      NO LIVE REQUEST, SO NO DELIVERY — and it fails quietly rather than loudly.

      A 403 here would tell an unprompted caller that the endpoint exists and that its guess was
      merely mistimed. There is also an ordinary, blameless way to reach this line: the presenter's
      thirty seconds elapsed while the member's browser was in a background tab. Both want the same
      answer, which is nothing at all.
    */
    if (requestorUserId === null) return;

    publishToUsers(room, [requestorUserId], {
      channel: 'privCmds',
      data: {
        cmd: 'debugLogResp',
        targetUserId: requestorUserId,
        /*
          WHOSE LOG THIS IS, named by the SERVER from the caller's session rather than by the
          payload. The presenter needs it to title the modal, and it is the second field upstream
          would have let the client choose. `displayName` is the column this room actually has -
          the reference calls the same value `nick`.
        */
        fromUserId: sender.id,
        fromName: sender.displayName,
        log
      }
    });
  }
);
