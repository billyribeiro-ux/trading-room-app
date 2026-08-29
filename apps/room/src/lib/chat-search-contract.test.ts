import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { RoomChat } from '#lib/room/chat.svelte.js';
import { RoomChatSearch } from '#lib/room/chat-search.svelte.js';

/**
 * `doChatLogSearch` — SEARCHING A CHAT CHANNEL, AND THE FILTER IT MUST NOT SKIP.
 *
 * ## What was missing
 *
 * Nothing. There was no chat search at all: no field, no filter, and no way to reach a message older
 * than the fifty a page delivers. The ALERTS toolbar has a search box, and
 * `alert-toolbar-search-scope.ts` argues at length that it should stay a LOCAL filter — but that
 * argument turns entirely on a premise that does not hold for chat: *"a correct search already
 * exists and is one click away"*, meaning the Advanced Search modal, which asks the database. The
 * chat columns had no such thing, so the resolution available there was not available here.
 *
 * ## The property this file exists for
 *
 * **Search results go through the same visibility pipeline as the log.** Upstream's handler assigns
 * them straight to `globals.chatSearchResults` (byte 1,020,422) and renders that, which it can
 * afford because it applies WEBINAR MODE as messages ARRIVE — its search results, coming from a
 * server rather than from arrival, are simply outside the filter.
 *
 * This room applies webinar mode as a VIEW filter, because it re-reads its log on every invalidate
 * and a drop-on-arrival would be undone by the next load. So the faithful port — results in front of
 * the pipeline — would have handed a member in webinar mode every other member's messages, **which
 * is precisely what that mode exists to hide, reachable by typing one letter into a box.**
 *
 * That is asserted here from the source rather than by rendering, because the alternative is a
 * component test that would pass for the wrong reason the moment the pipeline is reordered.
 *
 * ## And the two scope rules
 *
 * A search is scoped to a channel on the wire, so switching channels ends it; and the server checks
 * the channel against THIS member's list, because badge channels are visible to some members and not
 * others and a search takes a term as well as a channel.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FEEDS = readFileSync(`${ROOT}lib/room/feeds.svelte.ts`, 'utf8');
const REMOTE = readFileSync(`${ROOT}routes/log-pages.remote.ts`, 'utf8');
const SERVER = readFileSync(`${ROOT}lib/server/chat-log.ts`, 'utf8');

/** Comments stripped, for the assertions that test for an ABSENCE. See `qa-edit-contract.test.ts`. */
function codeOf(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** One exported symbol's body, bounded by the next `export`. */
function bodyOf(source: string, declaration: string): string {
  const from = source.indexOf(declaration);
  expect(from, `${declaration} is gone`).toBeGreaterThan(-1);
  const next = source.indexOf('\nexport ', from + 1);
  return source.slice(from, next === -1 ? source.length : next);
}

describe('results are filtered exactly as the log is', () => {
  const pipeline = bodyOf(
    FEEDS,
    'chatMessagesFor(tab: ChatTab, searchResults: readonly Message[] | null = null) {'
  );

  it('takes the results as a parameter and puts them where the merged log goes', () => {
    /*
      `searchResults ?? trimChatLog(...)` — the results REPLACE the log's own rows and then every
      filter below applies to them. The alternative shape, a second getter returning the raw rows, is
      what this refuses: it would look identical on screen and skip everything.
    */
    expect(pipeline).toContain('searchResults ??');
    const substitution = pipeline.indexOf('searchResults ??');
    const hidden = pipeline.indexOf('!this.#isHidden(item)');
    expect(hidden, 'the hidden-row filter is gone').toBeGreaterThan(-1);
    expect(substitution, 'the results must enter BEFORE the filters, not after').toBeLessThan(
      hidden
    );
  });

  it('runs webinar mode over whatever the column is showing', () => {
    /*
      THE ASSERTION THIS FILE EXISTS FOR. There is exactly one `webinarMessageVisible` call in this
      function and the results pass through it, because they enter above it. A second code path for
      results — the shape a faithful port takes — would show up here as a second call or as none.
    */
    const code = codeOf(pipeline);
    expect((code.match(/webinarMessageVisible\(/g) ?? []).length).toBe(1);
    const substitution = code.indexOf('searchResults ??');
    expect(substitution).toBeGreaterThan(-1);
    expect(substitution).toBeLessThan(code.indexOf('webinarMessageVisible('));
  });

  it('keeps no search branch anywhere else in the feed', () => {
    /*
      One entry point. A `if (searching) return rows` in `visibleChat` would satisfy every assertion
      above by making them unreachable, so the getters are checked to be pass-throughs.
    */
    expect(FEEDS).toContain(
      'return this.chatMessagesFor(this.#chat.tab, this.#chatSearchResults);'
    );
    expect(FEEDS).toContain(
      'return this.chatMessagesFor(this.#chat.extraTab, this.#extraChatSearchResults);'
    );
  });

  it('distinguishes no search from a search that found nothing', () => {
    /*
      `null` shows the log; `[]` shows an empty result. Collapsing them would make a search that
      matched none of the log look like no search at all — the reader would read their whole log as
      the answer, which is the failure mode the alerts side's scope notice exists to prevent.
    */
    expect(FEEDS).toContain('$state.raw<readonly Message[] | null>(null)');
    expect(FEEDS).toContain('!== null');
  });
});

describe('the server scopes the search the way it scopes a page', () => {
  const query = bodyOf(REMOTE, 'export const searchChatMessages = query(');

  it('checks the channel against THIS member list', () => {
    /*
      Badge channels are visible to some members and not others, so a name being a channel SOMEWHERE
      is no evidence that this member may read it — and a search is the shape that makes such a leak
      useful, since it takes a term as well as a channel.
    */
    expect(query).toContain('await memberChatChannels(request, shortCode, user)');
    expect(query).toContain(
      "if (!isMemberChatChannel(channels, channel)) error(403, 'No such channel.');"
    );
  });

  it('takes the room from the session, never the argument', () => {
    expect(query).toContain('requireRoomShortCode(locals)');
    expect(query).toContain('z.strictObject({');
    expect(codeOf(query)).not.toContain('roomShortCode:');
  });

  it('refuses the destructive half of the upstream command', () => {
    /*
      `doChatLogSearch` also carries `del: true` — a bulk delete of everything the term matched. A
      destructive operation whose blast radius is a LIKE pattern the caller typed needs its own
      authority argument and its own confirmation; putting it behind this endpoint's flag would mean
      one door for reading and erasing. Asserted rather than trusted, because "add a boolean" is how
      it would arrive.
    */
    const code = codeOf(query);
    expect(code).not.toContain('del');
    expect(code).not.toContain('delete');
  });
});

describe('the LIKE pattern cannot be escaped out of', () => {
  const search = bodyOf(SERVER, 'export function searchChatChannel(');

  it('escapes the wildcards, and the escape character with them', () => {
    /*
      `%` and `_` are LIKE wildcards, so a member searching for `100%` would otherwise match the
      whole log. The backslash is escaped too, so an escape character cannot be smuggled in to
      neutralise the escaping. Lifted from `searchThread`, which solved this first.
    */
    expect(search).toContain('needle.replace(/[%_\\\\]/g');
  });

  it('is scoped to the room AND the channel, and bounded', () => {
    expect(search).toContain('eq(messages.roomShortCode, roomShortCode)');
    expect(search).toContain('eq(messages.room, channel)');
    expect(search).toContain('.limit(CHAT_LOG_PAGE_SIZE)');
  });

  it('answers an empty term with nothing rather than everything', () => {
    /*
      A `LIKE '%%'` matches every row. The early return is what makes an empty term a no-op instead
      of a whole-channel dump, and it is here rather than only in the caller because the caller is
      not the only thing that could ever call this.
    */
    expect(search).toContain('if (!needle) return [];');
  });

  it('shares one projection with the page loader', () => {
    /*
      A second hand-written copy of twenty columns is a second place for `senderEmail` to be
      forgotten — and forgetting it does not fail to compile, it ships a message with no
      `senderEmailHash`, so search results alone fall back to a placeholder avatar. The `email ->
      hash` step is why the pair travels together: the raw address must never reach a client.
    */
    expect(SERVER).toContain('function chatRows()');
    expect(SERVER).toContain('function chatRowsToMessages<');
    expect((SERVER.match(/senderEmail: users\.email/g) ?? []).length).toBe(1);
    expect((SERVER.match(/hashEmail\(senderEmail\)/g) ?? []).length).toBe(1);
  });
});

describe('a search belongs to one channel', () => {
  it('ends when the reader switches channel, on the column that switched', () => {
    /*
      Not a display nicety. Results held across a switch would be another channel's messages rendered
      as this one's — legitimately fetched rows in an illegitimate place, and badge channels make
      that a leak rather than a cosmetic bug.
    */
    const ended: string[] = [];
    const search = new RoomChatSearch({ ended: (column) => ended.push(column) });
    const chat = new RoomChat({ extraColumnEnabled: () => false, search });

    search.setTerm('main', 'gold');
    search.setTerm('extra', 'silver');
    ended.length = 0;

    chat.tab = 'off-topic';

    expect(ended, 'only the column that switched').toEqual(['main']);
    expect(search.term('main')).toBe('');
    expect(search.term('extra'), 'the other column is untouched').toBe('silver');
  });

  it('leaves the bar open across a switch', () => {
    /*
      The reader asked for a search box. A bar that vanished when they changed channel would read as
      a bug rather than as a scope rule — the term going is the rule, the box going is not.
    */
    const search = new RoomChatSearch();
    const chat = new RoomChat({ extraColumnEnabled: () => false, search });
    search.toggle('main');

    chat.tab = 'off-topic';

    expect(search.isOpen('main')).toBe(true);
  });

  it('ends when the box is emptied, with no submit', () => {
    /*
      `searchTermChanged(e) { e || this.clearSearchTerm() }`, byte 1,439,050 — upstream's own
      behaviour, and the reason the term is a setter rather than a value a component assigns.
    */
    const ended: string[] = [];
    const search = new RoomChatSearch({ ended: (column) => ended.push(column) });

    search.setTerm('main', 'gold');
    expect(ended, 'a non-empty term is not an ending').toEqual([]);

    search.setTerm('main', '');
    expect(ended).toEqual(['main']);
  });

  it('ends when the bar is closed', () => {
    /*
      OURS, and a divergence: upstream's bar can be hidden with a term still in it and results still
      standing in for the log, leaving a reader looking at a filtered log with nothing on screen
      saying so. Worse here than on the alerts side, because these results are not a subset of the
      log — they are a different query's answer.
    */
    const ended: string[] = [];
    const search = new RoomChatSearch({ ended: (column) => ended.push(column) });
    search.toggle('extra');
    search.setTerm('extra', 'gold');
    ended.length = 0;

    search.toggle('extra');

    expect(search.isOpen('extra')).toBe(false);
    expect(search.term('extra')).toBe('');
    expect(ended).toEqual(['extra']);
  });
});
