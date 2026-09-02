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

/**
 * `codeOf` PLUS HTML comments, for the `.svelte` sources `ACA-06` reads.
 *
 * The local `codeOf` above strips `/* *\/` and `//` only, which is everything a `.ts` file can
 * hide a string in. A Svelte component hides them in `<!-- -->` as well, and every one of this
 * repository's transcription docblocks quotes the const strings it transcribes — so an assertion
 * that a class name is ABSENT would be answered by the paragraph explaining why it is absent.
 */
function stripAll(source: string): string {
  return codeOf(source).replace(/<!--[\s\S]*?-->/g, '');
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
    `chatMessagesFor(
    tab: ChatChannelName,
    searchResults: readonly Message[] | null,
    column: 'main' | 'extra'
  ) {`
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
      "return this.chatMessagesFor(this.#chat.tab, this.#chatSearchResults, 'main');"
    );
    expect(FEEDS).toContain(
      "return this.chatMessagesFor(this.#chat.extraTab, this.#extraChatSearchResults, 'extra');"
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
    /*
      `chatRows(where)` and not `chatRows()` since 2026-08-30. The predicate became a PARAMETER when
      the archive arrived: drizzle's `.where()` SETS the clause rather than ANDing it, so a caller
      chaining its own would have silently dropped the `isNull(messages.archiveId)` exclusion and
      produced an archive feature that swept rows nothing ever hid. Asserted with the parameter, so
      a revert to the chainable form fails here as well as in `chat-archive-contract`.
    */
    expect(SERVER).toContain('function chatRows(where: SQL | undefined)');
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

describe('ACA-06 — the four unbuilt toolbar controls, named by VALUE', () => {
  /*
    ── THE PROSE WAS WRONG IN TWO FILES AND THIS IS WHAT STOPS IT DRIFTING BACK ──────────────────

    `ChatSearchBar.svelte` and `chat-search.svelte.ts` both said the extended bar's unbuilt controls
    were *"the save-chat and archive controls (`Y_e` and `Q_e`, nodes 4 and 5 of `X_e` at byte
    1,423,265)"*. Four names and one offset were wrong: `Y_e` and `Q_e` are the Group Chat Control
    dropdown and the Detach Chat button, the save/archive pair is `K_e`/`q_e` in the OTHER extended
    slot, and `X_e` begins at 1,423,104 — 161 bytes earlier, in the middle of a different function.

    That sentence is the one a reader uses to decide which sub-template holds what, so it pointed
    the next person at the wrong two functions in the wrong slot. It is corrected in both files and
    pinned here BY VALUE: each offset is opened and the function's own signature read back, so a
    different capture turns this red rather than leaving two docblocks quietly wrong again.
  */
  const BUNDLE = readFileSync(
    fileURLToPath(
      new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url)
    ),
    'utf8'
  );

  const at = (offset: number, text: string) => BUNDLE.slice(offset, offset + text.length);

  it('opens each of the six sub-templates AT the offset the docblocks now give', () => {
    for (const [offset, name] of [
      [1_421_800, 'q_e'],
      [1_421_929, 'K_e'],
      [1_422_202, 'Y_e'],
      [1_422_956, 'Q_e'],
      [1_423_104, 'X_e'],
      [1_423_745, 'J_e']
    ] as const) {
      expect(at(offset, `function ${name}(`), `${name} is not at ${offset}`).toBe(
        `function ${name}(`
      );
    }
  });

  it('and each one is the control the corrected sentence says it is', () => {
    /* The two the old sentence named — a dropdown and a button, not save and archive. */
    expect(at(1_422_202, 'function Y_e')).toBe('function Y_e');
    expect(BUNDLE.slice(1_422_202, 1_422_400)).toContain('" Group Chat Control "');
    expect(BUNDLE.slice(1_422_956, 1_423_104)).toContain('detachChat()');
    expect(BUNDLE.slice(1_422_956, 1_423_104)).toContain('" Detach Chat"');

    /* And the pair it should have named, in the other slot. */
    expect(BUNDLE.slice(1_421_929, 1_422_080)).toContain('downloadLog("chat")');
    expect(BUNDLE.slice(1_421_800, 1_421_929)).toContain('archiveOptions()');
  });

  it('the WRONG offset lands mid-function, which is why it read as plausible', () => {
    /*
      1,423,265 is inside `X_e`'s body rather than at its head, so a reader checking the citation by
      eye would find the right neighbourhood and move on. That is exactly how a byte offset stays
      wrong through several readings.
    */
    expect(at(1_423_265, 'function')).not.toBe('function');
    expect(1_423_265).toBeGreaterThan(1_423_104);
  });

  it('THREE of the four are built now, and the fourth is not — asserted both ways', () => {
    /*
      This assertion was written earlier the same day as `not.toContain` on all four names, with the
      note that it existed *"so that building one of them without closing `ACA-06` fails here"*. It
      fired on the build. This is it being closed rather than relaxed.

      The three that are built keep their captured strings pinned; the one that is not keeps its
      ABSENCE pinned, so the row cannot be marked done while a control is still missing and cannot
      be reopened by somebody deleting one that exists.
    */
    const bar = stripAll(readFileSync(`${ROOT}lib/components/ChatSearchBar.svelte`, 'utf8'));

    /* Group Chat Control — const 46's class list, the button's label, and all three item labels. */
    expect(bar).toContain('class="dropdown d-inline-block m-1 group-chat-control"');
    expect(bar).toContain("{' Group Chat Control '}");
    for (const label of ['Regular Group Chat', 'Webinar Mode', 'Disable Group Chat']) {
      expect(bar, `the ${label} item is missing`).toContain(label);
    }
    /*
      `kw = t => ({ visible: t })` — all three ticks RENDERED, one made visible by a class. A
      conditional would render a different DOM for the same state, so the class map is the assertion.
    */
    expect(bar).toContain("'fas fa-check-square me-1', { visible: chatMode === item.mode }");

    /* Detach Chat — const 53's classes and const 54's icon. */
    expect(bar).toContain('class="btn btn-outline-info btn-sm mx-1 mt-1"');
    expect(bar).toContain('<i class="fas fa-window-restore"></i>');

    /* Archive — const 41's classes and const 42's icon. */
    expect(bar).toContain(
      'class="btn btn-outline-secondary pl-2 pr-2 d-inline-flex archive-alert-input input-group-text"'
    );
    expect(bar).toContain('<i class="fas fa-trash"></i>');

    /*
      AND THE FOURTH IS STILL ABSENT. `downloadLog("chat")` at byte 1,415,703 opens a radio prompt
      whose answer goes to `downloadLogType`, which awaits `invokeServerCommand("getAllLog", …)` —
      a command this repository does not have. The button would open a dialog whose every option
      fails, which is worse than no button. Blocked on a SERVER command, not on scope, and that is
      the distinction this pair of assertions keeps.
    */
    expect(bar, 'the save button is built but getAllLog does not exist').not.toContain(
      '"addon-chat-save"'
    );
    const app = readFileSync(`${ROOT}lib/components/AlertChatArea.svelte`, 'utf8');
    expect(app, 'a getAllLog appeared — re-read ACA-06').not.toContain('getAllLog');
  });

  it('the three gates are resolved on the PAGE, and detach only for the main column', () => {
    /*
      Each control's gate is the PRESENCE of its handler, which is `ChatSearchBar`'s own rule: it is
      handed each entitlement's result and never a raw flag. So the gates are asserted where they
      are decided, and the shape matters more than the text — a boolean prop appearing beside any of
      these handlers would mean one gate in two places.

      `O(4, !isPresenter && !user.hasMic || isLimitedPresenter ? -1 : 4)` is written on its NEGATIVE
      branch upstream and is reproduced by negating it rather than by re-deriving what it means.
      Flipping a De Morgan by hand is how `acA-07`'s half-gate happened.
    */
    const page = stripAll(readFileSync(`${ROOT}routes/+page.svelte`, 'utf8'));
    expect(page).toContain(
      "isPresenter && !media.limitedPresenter ? () => modals.open('chat-logs') : undefined"
    );
    expect(page).toContain('(!isPresenter && data.user.hasMic !== true) || media.limitedPresenter');

    /* Detach: main column only, and off in a detached window. */
    expect(page).toContain('ondetachchat={chatOnlyMode ? undefined : () => alertsPane.detach()}');
    const extraAt = page.indexOf('<ExtraChatPane');
    expect(extraAt, 'the extra column must render').toBeGreaterThan(-1);
    /*
      BOTH bounds are locals and both are asserted, which `slice-anchor-contract.test.ts` refuses to
      let this file grow past: an inlined `indexOf` as the end bound returns -1 when the marker moves,
      `slice(at, -1)` yields almost the whole page, and the `not.toContain` below then passes over
      text that has nothing to do with the extra column.
    */
    const extraEnd = page.indexOf('/>', extraAt);
    expect(extraEnd, 'the extra column call must be closed').toBeGreaterThan(extraAt);
    const extraCall = page.slice(extraAt, extraEnd);
    expect(extraCall, 'the extra column must NOT be given a detach handler').not.toContain(
      'ondetachchat'
    );
  });
});

describe('ACA-06 — the SAVE control, BUILT 2026-09-01, and the blocker it had', () => {
  /*
    ── THE BLOCKER NAMED THE REFERENCE'S TRANSPORT, NOT THIS ROOM'S CAPABILITY ────────────────────

    `ChatSearchBar.svelte` recorded the save button as *"the one of the four that is not blocked on
    scope: `downloadLog("chat")` … hands the answer to `downloadLogType`, which awaits
    `invokeServerCommand("getAllLog", {type, channel, limit})`. **There is no such command in this
    repository** — so the button would open a dialog whose every option fails."*

    Both sentences are true and the conclusion does not follow. `getAllLog` is how the REFERENCE asks
    ITS server for history its page has never seen; this room keeps that history itself, in the table
    `chat-log.ts` already reads four other ways. It needed a query, not a command.

    Third blocker of this shape re-measured this week, after `G08`'s waveform and `SP2-04`'s local
    preview: a note describing the mechanism upstream uses, read as a statement about what is
    possible here.
  */
  const BUNDLE = readFileSync(
    fileURLToPath(
      new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url)
    ),
    'utf8'
  );
  const BAR = readFileSync(`${ROOT}lib/components/ChatSearchBar.svelte`, 'utf8');
  const PAGE = readFileSync(`${ROOT}routes/+page.svelte`, 'utf8');
  const FORMAT = readFileSync(`${ROOT}lib/chat-log-download.ts`, 'utf8');
  /*
    The flow left `+page.svelte` for `#lib/room/chat-log-save.ts` on the day it was written,
    when that file went 125 lines past its ceiling. Asserted at the module rather than widened
    to "either file": which file owns the flow is the fact, and the extraction is what gave it
    seven cases without a mount or a network.
  */
  const SAVE = readFileSync(`${ROOT}lib/room/chat-log-save.ts`, 'utf8');

  it('reads the const the button is drawn from, rather than restating it', () => {
    expect(BUNDLE).toContain(
      '["id","addon-chat-save","title","Save chat messages",1,"btn","btn-outline-secondary",' +
        '"d-inline-flex","pl-2","pr-2","input-group-text",3,"click"]'
    );
    /* Its class run is in a DIFFERENT ORDER from the clear button's, and both are reproduced. */
    expect(BUNDLE).toContain(
      '["id","addon-chat-clear","title","Clear the search",1,"btn","btn-outline-secondary","pl-2",' +
        '"pr-2","d-inline-flex","clear-chat-input","input-group-text",3,"click"]'
    );
    expect(BAR).toContain(
      'class="btn btn-outline-secondary d-inline-flex pl-2 pr-2 input-group-text"'
    );
    expect(BAR).toContain('title="Save chat messages"');
    expect(BAR).toContain('<i class="fas fa-save"></i>');
  });

  it('is a SPAN and it WRAPS the archive button, which is what puts the gate where it is', () => {
    /*
      `K_e` renders `span` const 38 and holds `q_e` as node 2, gated
      `O(2, isPresenter && !isLimitedPresenter ? 2 : -1)`. So SAVE is ungated and ARCHIVE is not —
      read the nesting the other way round and Save disappears for every member, which is a whole
      control gone for everyone not running the room.
    */
    expect(BUNDLE.slice(1_421_929, 1_422_140)).toContain('d(0,"span",38)');
    expect(BUNDLE.slice(1_421_929, 1_422_260)).toContain(
      'isPresenter&&!e.appService.globals.isLimitedPresenter?2:-1'
    );

    const saveAt = BAR.indexOf('id={saveId}');
    const archiveAt = BAR.indexOf('id={archiveId}', saveAt);
    const saveCloses = BAR.indexOf('</span>', saveAt);
    expect(saveAt, 'the save span must exist').toBeGreaterThan(-1);
    expect(archiveAt, 'the archive button must follow it').toBeGreaterThan(saveAt);
    expect(archiveAt, 'and must be INSIDE it').toBeLessThan(saveCloses);
  });

  it('stops the archive click reaching the save handler, which the nesting otherwise guarantees', () => {
    /*
      A click on the nested archive button bubbles to the span. Upstream has the same shape and the
      same problem; here both handlers are ours and the fix is one line. Stopping propagation rather
      than un-nesting, because the nesting is what carries the gate.
    */
    expect(BAR).toContain('event.stopPropagation();');
  });

  it('offers the capture s three ranges, with none preselected', () => {
    expect(BUNDLE).toContain('{text:"Entire chat history",value:"all"}');
    expect(BUNDLE).toContain('{text:"Last 24 hours",value:"24hrs"}');
    expect(BUNDLE).toContain('{text:"Last 7 days",value:"7days"}');
    expect(SAVE).toContain("{ text: 'Entire chat history', value: 'all' }");
    expect(SAVE).toContain("{ text: 'Last 24 hours', value: '24hrs' }");
    expect(SAVE).toContain("{ text: 'Last 7 days', value: '7days' }");
    /*
      `o && this.downloadLogType(...)` — bootbox hands the callback `null` when nothing is chosen, so
      confirming without a choice is a no-op. Reproduced by an EMPTY initial value and a guard; a
      preselected option would turn a mis-click into a download of the whole history.
    */
    expect(BUNDLE).toContain('callback:o=>{o&&i.downloadLogType(e,!1,o)}');
    expect(SAVE).toContain('if (!range) return;');
  });

  it('downloads the column s OWN channel, which the first version got wrong', () => {
    /*
      Written `() => saveChatLog('main')` first, and both toolbars got it — the extra column
      downloading the main one, with the right button, a real file, and nothing on screen to say so.
      `searchChat` resolves a column the same way and is where the idiom comes from.
    */
    expect(PAGE).toContain("onchatsave: (column: 'main' | 'extra') =>");
    expect(PAGE).toContain("column === 'main' ? chat.tab : chat.extraTab");
    expect(PAGE).toContain("onchatsave={() => chatToolbarControls.onchatsave('main')}");
    expect(PAGE).toContain("onchatsave={() => chatToolbarControls.onchatsave('extra')}");
  });

  it('says so when the read FAILS, which the capture does not', () => {
    /*
      `downloadLogType` has no error branch: a rejected `invokeServerCommand` leaves the click doing
      nothing at all, which is indistinguishable from a button that is not wired.
    */
    expect(SAVE).toContain("'The chat log could not be read.'");
  });

  it('keeps the file FORMAT in a module, because three details of it are invisible', () => {
    /* No space before the bracket, CRLF, and DATE fields on a time formatter. */
    expect(BUNDLE).toContain(
      '.toLocaleTimeString("en-us",c)+"["+B.n+"]: "+B.txt+"' + String.raw`\r\n` + '"'
    );
    expect(FORMAT).toContain('}[${message.n}]: ${message.txt}' + String.raw`\r\n` + '`');
    expect(BUNDLE).toContain(
      '("chat"==s?"ChatLog_":"AlertsLog_")+(new Date).toDateString()+".txt"'
    );
    expect(FORMAT).toContain('`ChatLog_${now.toDateString()}.txt`');
  });
});
