import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * THE CHAT ARCHIVE — `archiveLogs`, `getArchiveList` and `unarchiveLogs`.
 *
 * ## The last two rows the census carried as work
 *
 * `missing-commands-triage.md` had six commands marked NOT BUILT. Four were measured to real
 * blockers on 2026-08-30 and reclassified; these two were the remainder, and they are the reason
 * that split was worth making — a tracker that files four unbuildable things beside two buildable
 * ones under one word costs somebody a day finding out which is which.
 *
 * ## The capture, transcribed
 *
 * `archiveOptions()` @ bundle byte 1,444,182 is a bootbox dialog titled "Archive Chat Messages"
 * with `<input type="date" id="date-archive-chat">` and four buttons. Two send:
 *
 * ```js
 * all:       confirm("Are you sure you want to archive the chats for everyone?")
 *              -> archiveChatDate(new Date)
 * dateRange: const o = new Date($("#date-archive-chat").val());
 *            if (isNaN(o.getTime())) return bootbox.alert("Please select a date."), !1;
 *            confirm("Are you sure you want to archive the chats older than selected date?")
 *              -> archiveChatDate(o)
 * ```
 *
 * `archiveChatDate(e)` sends `{type:"chat", date:e, channel:this.channel}`; `unarchiveLog()` @
 * 2,304,726 confirms *"Are you sure you want to unarchive (restore) this chatlog?"*, sends
 * `{type, roomID, archiveID}` and alerts "Chatlog restored".
 *
 * **"Archive All" is not a second operation.** It passes `new Date()`, so one predicate serves both
 * buttons and the sweep has exactly one parameter.
 *
 * ## What this file guards, and why each one is the thing that would break silently
 *
 * 1. **The exclusion.** `chatRows` must filter `archiveId`. Without it the sweep writes every row,
 *    the browser fills, restore works, and nothing ever leaves anybody's screen — a whole feature,
 *    green and inert. This is the assertion the rest of the feature is worthless without.
 * 2. **The predicate is a PARAMETER.** Drizzle's `.where()` SETS the clause rather than ANDing it,
 *    so a `chatRows().where(…)` at a call site would drop the exclusion with every test still green.
 * 3. **The room is never an argument.** Upstream's unarchive carries `roomID` from
 *    `globals.sessData`; ours takes it from the session, which is the 2026-08-07 rule.
 * 4. **The channel is checked against the caller's own allow-list**, so a badge channel a presenter
 *    cannot see cannot be swept either.
 * 5. **An empty sweep is refused**, rather than recorded as an archive that restores nothing.
 */
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (file: string) => readFileSync(`${ROOT}${file}`, 'utf8');

const LOG = read('lib/server/chat-log.ts');
const SERVER = read('lib/server/chat-archive.ts');
const REMOTE = read('../src/routes/chat-archive.remote.ts');
const HOLDER = read('lib/room/chat-archive.svelte.ts');
const PANE = read('lib/components/ChatArchivePane.svelte');
const SCHEMA = read('lib/server/db/schema.ts');

function codeOf(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

describe('an archived message leaves the live log', () => {
  it('reads the files it is measuring', () => {
    for (const [name, source] of Object.entries({ LOG, SERVER, REMOTE, HOLDER, PANE })) {
      expect(source.length, `${name} is empty`).toBeGreaterThan(400);
    }
  });

  it('EXCLUDES archived rows from every read of the chat log', () => {
    /*
      The assertion the whole feature rests on, and the one that would fail silently: the exclusion
      lives in the single builder every reader goes through, so it is stated once and cannot be
      forgotten at one of the three call sites.
    */
    const code = codeOf(LOG);
    expect(code).toContain('isNull(messages.archiveId)');
    expect(code, 'combined with the caller predicate, never replacing it').toContain(
      'and(isNull(messages.archiveId), where)'
    );

    /*
      And the SHAPE that makes it un-droppable. `chatRows()` taking no predicate would let a caller
      chain `.where(...)`, which in drizzle SETS the clause rather than ANDing — the exclusion would
      vanish and every test here would still pass, because they would all be measuring the builder
      rather than the query it produced.
    */
    expect(code).toContain('function chatRows(where: SQL | undefined)');
    expect(code, 'no caller may chain its own where onto the builder').not.toMatch(
      /chatRows\(\)\s*\n?\s*\.where/
    );
  });

  it('sweeps by ONE predicate, because both dialog buttons are one command', () => {
    const code = codeOf(SERVER);
    /* Strictly older than the moment, only live rows, and scoped to room AND channel. */
    expect(code).toContain('lt(messages.createdAt, olderThan)');
    expect(code).toContain('isNull(messages.archiveId)');
    expect(code).toContain('eq(messages.roomShortCode, room)');
    expect(code).toContain('eq(messages.room, channel)');

    /*
      The count comes from what the UPDATE returned, not from a SELECT before it. A prior count is a
      TOCTOU — a message posted between the two is swept but not counted, so the browser offers to
      restore forty when it holds forty-one — and this repository refuses read-then-write by name.
    */
    expect(code).toContain('.returning({ id: messages.id })');
    expect(code).toContain('messageCount: swept.length');
    expect(code, 'no count before the write').not.toMatch(/count\(\)/);
  });

  it('refuses an empty sweep instead of recording one', () => {
    /* An archive that restores nothing is the report-success-you-did-not-achieve shape. */
    expect(codeOf(SERVER)).toContain('if (swept.length === 0)');
    expect(codeOf(SERVER), 'and leaves nothing dangling').toContain(
      'db.delete(chatArchives).where(eq(chatArchives.id, archive.id)).run()'
    );
    expect(codeOf(REMOTE)).toContain(
      "error(409, 'There are no messages older than that to archive.')"
    );
  });

  it('takes the room from the session and the channel from an allow-list', () => {
    const code = codeOf(REMOTE);
    expect(code).toContain('presenterRoom()');
    expect(code).toContain('memberChatChannels(request, room, user)');
    expect(code).toContain('isMemberChatChannel(allowed, channel)');

    /*
      Upstream sends `roomID` from `globals.sessData.roomID` — a client-held value naming which room
      to act on. Nothing here may take one.
    */
    expect(code, 'the room must never be an argument').not.toMatch(/roomShortCode:\s*z\./);
    expect(code, 'nor a roomID by its reference name').not.toContain('roomID');

    /* And the unarchive is scoped by room as well as by id, so a foreign id matches zero rows. */
    expect(codeOf(SERVER)).toContain('eq(chatArchives.roomShortCode, room)');
  });

  it('transcribes the four capture strings exactly', () => {
    const code = codeOf(HOLDER);
    expect(code).toContain("'Are you sure you want to archive the chats for everyone?'");
    expect(code).toContain(
      "'Are you sure you want to archive the chats older than selected date?'"
    );
    expect(code).toContain("'Please select a date.'");
    expect(code).toContain("'Are you sure you want to unarchive (restore) this chatlog?'");
    expect(code).toContain("'Chatlog restored'");
    /* Upstream's own guard, kept: an unparseable date alerts rather than sweeping everything. */
    expect(code).toContain('Number.isNaN(picked.getTime())');
  });

  it('does NOT draw the irreversible button beside the reversible one', () => {
    /*
      `Delete Searched` deletes by a LIKE pattern the caller typed. Archiving is reversible and that
      is not; putting both on one surface blurs the distinction at exactly the moment a presenter is
      standing there making it. It stays its own row on the census.
    */
    for (const source of [PANE, REMOTE, HOLDER]) {
      expect(codeOf(source)).not.toContain('Delete Searched');
    }
  });

  it('bounds the archive list and indexes the read path', () => {
    expect(codeOf(SERVER)).toContain('.limit(ARCHIVE_LIST_LIMIT)');
    expect(codeOf(SCHEMA)).toContain("index('chat_archives_room_idx')");
    /* Null is LIVE, so every existing row stays live with no backfill. */
    expect(codeOf(SCHEMA)).toContain("archiveId: integer('archive_id')");
  });

  it('replaces the list wholesale, so the rune is raw', () => {
    expect(codeOf(HOLDER)).toContain('$state.raw<readonly ChatArchiveView[]>([])');
    expect(codeOf(HOLDER)).toContain('$state.raw<readonly string[]>([])');
  });

  it('names the channels from the SERVER, never guessing main', () => {
    /*
      The reference's dialog can only sweep the column it was opened from. This browser is a
      room-level modal, so it must name one — and the only alternatives are guessing `'main'`, which
      is a lie in any room with a second column, or asking. It asks, using the same allow-list the
      sweep is checked against, so the picker cannot offer a channel the sweep would refuse.
    */
    expect(codeOf(REMOTE)).toContain('channels: await memberChatChannels(');
    expect(codeOf(PANE), 'the picker binds the server list').toContain('{#each channels as name');
    expect(codeOf(PANE), 'no hardcoded default').not.toContain("'main'");
  });
});
