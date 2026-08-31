import { error } from '@sveltejs/kit';
import { command, getRequestEvent, query } from '$app/server';
import { z } from 'zod';
import { presenterRoom, requireUser } from '#lib/server/auth.js';
import { ensureDatabase } from '#lib/server/db/index.js';
import {
  archiveChatChannel,
  chatArchiveById,
  listChatArchivesFor,
  unarchiveChatLog,
  type ChatArchiveBrowser,
  type ChatArchiveLog
} from '#lib/server/chat-archive.js';
import { CHAT_ARCHIVE_LOG_LIMIT, loadArchivedChatLog } from '#lib/server/chat-log.js';
import { isMemberChatChannel, memberChatChannels } from '#lib/server/chat-channels.js';
import { publishToRoom } from '#lib/server/room-events.js';

/*
  `archiveLogs` / `getArchiveList` / `unarchiveLogs` — the chat half of the archive.

  These were the last two rows on `missing-commands-triage.md` still marked NOT BUILT after the
  other four were measured to real blockers. The capture is transcribed in
  `#lib/server/chat-archive.ts`; this file is the door.

  ## THE CHANNEL IS CHECKED AGAINST THIS PRESENTER'S OWN ALLOW-LIST

  The reference sends `this.channel` — whatever column the toolbar was open on — and its server
  takes it. Here the channel is an argument, so it is a name the caller chose, and
  `memberChatChannels` is the only thing that says which names this account may act on. Badge
  channels are the reason it matters: `chat-channels.ts` records that a channel a member cannot see
  must be indistinguishable from one that was never configured, "or the refusal itself enumerates
  the room's private channels". Sweeping one you cannot see would be worse than reading it.

  ## THE ROOM IS NEVER AN ARGUMENT

  Upstream's `unarchiveLogs` carries `roomID` from `globals.sessData.roomID` — a client-held value
  naming which room to act on. Every function here takes the room from the session through
  `presenterRoom()`, and the archive id is checked against it, so a presenter of room A naming room
  B's archive matches zero rows. That is the 2026-08-07 rule and it is why the unarchive argument is
  one integer.
*/

/**
 * The channel this caller is allowed to name, or a refusal.
 *
 * Deny-by-default and by exact match, delegating the list to `memberChatChannels` so there is one
 * definition of "channels this account holds" rather than a second one that drifts.
 */
async function presenterChannel(channel: string): Promise<string> {
  const room = presenterRoom();
  const { locals, request } = getRequestEvent();
  const user = requireUser(locals);
  const allowed = await memberChatChannels(request, room, user);
  if (!isMemberChatChannel(allowed, channel)) error(404, 'No such chat channel in this room.');
  return room;
}

/**
 * Tell the whole room its chat log changed.
 *
 * `invalidateAll` on every client, which is heavier than patching a list and is the right weight
 * here: archiving is an administrative act somebody performs by hand, at most a few times a day,
 * and the alternative — every client reconciling a set of ids it may or may not be holding — is a
 * second implementation of the log's own paging with its own drift.
 *
 * It is broadcast rather than left to the presenter's own screen because the messages leave
 * EVERYBODY's log. The reference reloads only the actor's list and lets everyone else find out on
 * their next page load, which is a divergence recorded rather than copied: a member reading a
 * message a presenter has already archived is reading something the room no longer has.
 */
function announceArchiveChange(room: string): void {
  /*
    NO PAYLOAD, deliberately. A `chatChannel` field was written first and had no reader: the handler
    reloads the page, which reloads every channel. A field nothing reads is the thing this repository
    refuses, and on a WIRE it is worse than elsewhere — the two declarations of this frame live in
    files that cannot import each other, so an unused field is a drift with nothing to notice it.
  */
  publishToRoom(room, { channel: 'cmds', data: { cmd: 'chatArchiveChanged' } });
}

/**
 * Everything the browser renders — upstream's `getArchiveList {type:"chat"}`, plus the channels.
 *
 * The channel list rides along rather than being a second query because the two are read together
 * exactly once, by one component, and a second round trip for a list of at most a handful of
 * strings would be a request whose only purpose is tidiness. See `ChatArchiveBrowser` for why the
 * SERVER names them at all.
 */
export const listChatArchives = query(async (): Promise<ChatArchiveBrowser> => {
  ensureDatabase();
  const room = presenterRoom();
  const { locals, request } = getRequestEvent();
  return {
    archives: listChatArchivesFor(room),
    channels: await memberChatChannels(request, room, requireUser(locals))
  };
});

/**
 * `getArchiveLog {id}` — open one archived log and read its messages.
 *
 * ## The half of the archive feature that was never built
 *
 * `app-chat-logs-modal` is two views, and only the first was here. `toggleShowLogs(entry)` swaps the
 * LIST for a log VIEWER — a Back button, a search box, Download Log, a presenter-only Unarchive, and
 * the messages themselves (`jxe` at bundle byte 2,309,873). This room drew the list, could sweep and
 * could restore, and offered no way to see what was IN an archive before restoring it — which is the
 * one thing a presenter standing at that dialog actually wants to know.
 *
 * ## It is presenter-gated, and that is stricter than the reference
 *
 * Upstream renders the viewer for anyone who reaches the modal and gates only the Unarchive button
 * on `isPresenter`. Here the whole read is `presenterRoom()`, for the reason the archive list
 * already is: an archive is every member's messages, swept by an administrator, and reading it back
 * is an administrative act rather than a member's view of their own room. A member who could read
 * archives could read a channel that was swept before they joined.
 *
 * ## The projection is NARROWER than the live log's, deliberately
 *
 * A live message carries reactions, reply context, colours, `bodyHtml` and the sender's avatar hash
 * because the room renders all of it. An archived log is read-only history: the viewer draws a name,
 * a time and a body, and nothing here can react to or reply to a message that is no longer in the
 * log. Sending the rest would be shipping fields with no consumer, and one of them — the avatar hash
 * — is derived from an address, so the narrow projection is also the smaller disclosure.
 */
export const readChatArchiveLog = query(
  z.strictObject({ archiveId: z.number().int().positive() }),
  async ({ archiveId }): Promise<ChatArchiveLog> => {
    ensureDatabase();
    const room = presenterRoom();

    const archive = chatArchiveById(room, archiveId);
    if (!archive) error(404, 'That archive is no longer there.');

    const rows = loadArchivedChatLog(room, archiveId);
    return {
      archive,
      messages: rows.map((row) => ({
        id: row.id,
        senderName: row.senderName,
        body: row.body,
        isAdmin: row.isAdmin,
        createdAt: row.createdAt
      })),
      /*
        Compared against the LIMIT and not against `messageCount`. They usually agree, and when they
        do not it is because a message was restored out of this archive individually — a fact about
        the archive, not about this read. What the viewer needs to say is "you are not looking at all
        of it", and only the limit answers that.
      */
      truncated: rows.length >= CHAT_ARCHIVE_LOG_LIMIT
    };
  }
);

/**
 * Sweep one channel's messages older than a moment — upstream's `archiveLogs {type,date,channel}`.
 *
 * ## Both dialog buttons are this one command, because upstream's are
 *
 * "Archive All" passes `new Date()` and "Archive Older than Selected Date" passes the picked date.
 * One predicate, one parameter. Modelling them apart would be two code paths for one rule.
 *
 * ## An empty sweep is an ERROR, not a quiet success
 *
 * A date before the room's first message archives nothing. Answering "done" would put an entry in
 * the browser that restores nothing and tell the presenter their log was swept when it was not —
 * the control-that-reports-success-it-did-not-achieve shape this repository refuses by name. The
 * archive row is removed by the sweep itself, so nothing dangling survives the refusal.
 */
export const archiveChatLog = command(
  z.strictObject({
    channel: z.string().min(1).max(64),
    /* Milliseconds, because a `Date` on the wire is devalue's job and a number is the thing the
       date input actually produces. Bounded so a caller cannot name a moment past the heat death. */
    olderThan: z.number().int().positive()
  }),
  async ({ channel, olderThan }) => {
    ensureDatabase();
    const room = await presenterChannel(channel);
    const { locals } = getRequestEvent();

    const swept = archiveChatChannel(room, channel, new Date(olderThan), requireUser(locals).id);
    if (!swept) error(409, 'There are no messages older than that to archive.');

    announceArchiveChange(room);
    return swept;
  }
);

/**
 * Put one archive back — upstream's `unarchiveLogs`, minus the client-supplied room.
 *
 * Answers the number of messages restored rather than nothing, because the reference alerts
 * "Chatlog restored" unconditionally and a presenter restoring an archive that turned out to be
 * empty would be told the same thing either way.
 */
export const unarchiveChatLogCommand = command(
  z.strictObject({ archiveId: z.number().int().positive() }),
  async ({ archiveId }) => {
    ensureDatabase();
    const room = presenterRoom();

    const restored = unarchiveChatLog(room, archiveId);
    if (restored === null) error(404, 'That archive is no longer there.');

    announceArchiveChange(room);
    return { restored };
  }
);
