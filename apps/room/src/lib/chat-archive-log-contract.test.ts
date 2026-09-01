import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments';

/**
 * THE ARCHIVED-LOG VIEWER, AS SOURCE — what it transcribes, and the two rules that keep it safe.
 *
 * ## How this surface was found
 *
 * Not by reading. `reference-const-coverage-contract.test.ts` swept all 51 reference components'
 * `consts:` tables against everything this room ships and reported six values missing from
 * `app-chat-logs-modal` and the same six from `app-alert-logs-modal`: `log-header-container`,
 * `log-header`, `search-addon`, `Enter search term`, `btn-ligth`, `fa-box-open`. All six belong to
 * ONE view — `toggleShowLogs`, the modal's second half — and this room had built the first half only.
 * So the archive could be swept and restored, and could not be READ, which is the one thing a
 * presenter standing at that dialog wants before restoring anything.
 *
 * ## The capture, at bytes verified by the first case below
 *
 * `jxe` at **2,309,873** is the view; consts 17 to 37 of the table at **2,305,566** are its literals;
 * `downloadLog()` at **2,304,904** is the file it writes. Three gates decide what is drawn:
 *
 * ```js
 * O(9,  e.inputTxt && e.inputTxt.length > 0 ? 9 : -1)            the clear cross
 * O(17, e.appService.globals.isPresenter ? 17 : -1)              Unarchive
 * O(18, …searchLogs(e.msgs, e.searchTxt).length > 0 ? 18 : 20)   the list, or "No logs."
 * ```
 *
 * The RUNTIME half — that opening drops the previous log before awaiting, that emptying the box ends
 * the search, that Download writes the whole archive — is `room/chat-archive-log.svelte.test.ts`,
 * which executes the class. This file reads.
 */

const read = (path: string): string => readFileSync(`src/${path}`, 'utf8');

/**
 * A component's MARKUP — comments stripped, and the `<style>` block with them.
 *
 * ## Its own negative control is why the style block goes too
 *
 * The first version used `codeOf` alone and the control came back GREEN: `log-header-container` was
 * deleted from the element's `class` attribute and the case still passed, because the rule
 * `.log-header-container { padding: 10px; }` is in the same file and `codeOf` keeps it — a stylesheet
 * is code, not prose. So a case written to assert a value is RENDERED passed on a value that was
 * only styled, which is one step removed from the prose failure `captured-css-ancestor-contract`
 * measured and exactly as useless.
 *
 * The component's styles are asserted separately, by name, further down. This is the half that has to
 * be markup.
 */
const markupOf = (path: string, source: string): string =>
  codeOf(path, source).replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');

const BUNDLE = readFileSync('docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', 'utf8');
const PANE = read('lib/components/ChatArchiveLogPane.svelte');
const HOST = read('lib/components/LogArchiveModals.svelte');
const LIST = read('lib/components/ChatArchivePane.svelte');
const VIEWER = read('lib/room/chat-archive-log.svelte.ts');
const CHATLOG = read('lib/server/chat-log.ts');
const REMOTE = read('routes/chat-archive.remote.ts');

describe('the citations this file rests on', () => {
  it('opens each byte offset rather than trusting it', () => {
    expect(BUNDLE.slice(2_309_873, 2_309_873 + 12)).toBe('function jxe');
    expect(BUNDLE.slice(2_304_904, 2_304_904 + 14)).toBe('downloadLog(){');
    /* The `[` that opens the modal's const table, whose first entry is the dialog root. */
    expect(BUNDLE.slice(2_305_566, 2_305_566 + 20)).toBe('[["id","chat-logs-mo');
  });

  it('finds the three gates, verbatim', () => {
    expect(BUNDLE).toContain('O(9,e.inputTxt&&e.inputTxt.length>0?9:-1)');
    expect(BUNDLE).toContain('O(17,e.appService.globals.isPresenter?17:-1)');
  });

  it('and the consts the view is drawn from', () => {
    for (const entry of [
      '[1,"log-header-container","bg-secondary","text-white"]',
      '[1,"d-flex","align-items-center","justify-content-between","my-1","log-header"]',
      '["id","search-addon",1,"input-group-text","btn","btn-ligth"]',
      '[1,"fas","fa-box-open"]'
    ]) {
      expect(BUNDLE, `const missing: ${entry}`).toContain(entry);
    }
    expect(BUNDLE).toContain('"placeholder","Enter search term"');
  });
});

describe('every value the sweep reported missing is now rendered', () => {
  it('names each one that is not, rather than failing on the first', () => {
    /*
      Read through `codeOf`, because this file quotes all six in its own docblock and so does the
      component's — a raw-text check here would pass on prose, which is the failure
      `captured-css-ancestor-contract.test.ts` measured and this repository keeps re-learning.
    */
    const markup = markupOf('lib/components/ChatArchiveLogPane.svelte', PANE);
    const absent = [
      'log-header-container',
      'log-header',
      'search-addon',
      'Enter search term',
      'btn-ligth',
      'fa-box-open'
    ].filter((value) => !markup.includes(value));
    expect(absent, 'these are the values the const sweep reported missing').toEqual([]);
  });

  it('carries the reference typo `btn-ligth` deliberately, and says so', () => {
    /*
      It matches no rule in either sheet, which means it matched nothing upstream either — Bootstrap's
      class is `btn-light`. Kept because dropping it would change nothing while making this markup
      disagree with the capture, the same call `PollPanel.svelte` makes about `ria-controls`.
    */
    expect(PANE).toContain("upstream's typo for `btn-light`");
    expect(read('app.css')).not.toContain('btn-ligth');
    expect(read('lib/styles/captured-runtime-components.css')).not.toContain('btn-ligth');
  });

  it('reproduces the duplicate id, because consts 24 and 25 both carry it', () => {
    /*
      Two elements with one id is invalid HTML and is what the reference ships, so `aria-describedby`
      resolves to whichever the browser finds first. This case asserted ONE id until 2026-09-01,
      which was a judgement about the reference rather than a fact about this application; the
      decision is to match the dump.

      Both consts are re-read here rather than quoted, so the pair is evidence and not memory.
    */
    expect(BUNDLE).toContain('["id","search-addon",1,"input-group-text","btn","btn-ligth"]');
    expect(BUNDLE).toContain(
      '["id","search-addon",1,"input-group-text","btn","btn-ligth",3,"click"]'
    );
    const markup = markupOf('lib/components/ChatArchiveLogPane.svelte', PANE);
    expect(markup.split('id="search-addon"')).toHaveLength(3);
    expect(markup).toContain('aria-describedby="search-addon"');
  });

  it('brings the component s own Angular styles with it, or the classes style nothing', () => {
    /*
      `log-header`, `log-body`, `log-header-container` and `log-messages` are declared in the
      component's `styles:[…]` in the bundle and are in NEITHER sheet here — the generated one is a
      capture of the global stylesheet, which never saw them. Transcribing the class names without
      the rules would be four classes with no CSS.
    */
    expect(BUNDLE).toContain('.log-messages[_ngcontent-%COMP%]{max-height:calc(100vh - 350px)');
    expect(PANE).toContain('max-height: calc(100vh - 350px);');
    expect(PANE).toContain('padding: 10px;');
  });
});

describe('reading an archive cannot read the live log, and vice versa', () => {
  it('keeps the live exclusion in ONE builder, unchanged', () => {
    const code = codeOf('lib/server/chat-log.ts', CHATLOG);
    expect(code).toContain('and(isNull(messages.archiveId), where)');
    expect(code).toContain('function chatRows(where: SQL | undefined)');
  });

  it('and the archived reader matches on an ID, which no live row can have', () => {
    /*
      The disjointness argument, asserted rather than left in prose: a live row's `archiveId` is NULL
      and `=` never matches NULL in SQL, so no predicate a caller passes to `archivedChatRows` can
      return a live message — the mirror of the guarantee `chatRows` gives in the other direction.
    */
    const code = codeOf('lib/server/chat-log.ts', CHATLOG);
    expect(code).toContain('and(eq(messages.archiveId, archiveId), where)');
    expect(
      code,
      'and the shared projection is not reachable from outside this module'
    ).not.toContain('export function chatQuery');
  });

  it('takes the ROOM from the session and puts it in the predicate', () => {
    /*
      The 2026-08-07 rule. `archiveId` alone would find the rows; it is exactly the shape that
      escalation took — an id chosen by the caller, trusted because it looked internal.
    */
    const code = codeOf('lib/server/chat-log.ts', CHATLOG);
    expect(code).toContain(
      'archivedChatRows(archiveId, eq(messages.roomShortCode, roomShortCode))'
    );
    expect(code).toContain('.limit(CHAT_ARCHIVE_LOG_LIMIT)');
  });

  it('is PRESENTER-gated, which is stricter than the reference', () => {
    /*
      Upstream renders the viewer for anyone who reaches the modal and gates only Unarchive. Here the
      whole read is `presenterRoom()`: an archive is every member's messages swept by an
      administrator, and a member who could read one could read a channel swept before they joined.
    */
    const code = codeOf('routes/chat-archive.remote.ts', REMOTE);
    expect(code).toMatch(/readChatArchiveLog[\s\S]{0,600}presenterRoom\(\)/);
    expect(code, 'a foreign archive is 404, never a different refusal').toContain(
      "error(404, 'That archive is no longer there.')"
    );
  });

  it('sends a NARROWER row than the live log, so no address-derived hash travels', () => {
    const code = codeOf('routes/chat-archive.remote.ts', REMOTE);
    expect(code).not.toContain('senderEmailHash');
    expect(code).not.toContain('bodyHtml');
    expect(code).toContain('truncated: rows.length >= CHAT_ARCHIVE_LOG_LIMIT');
  });

  it('says so on screen when the read was truncated', () => {
    /*
      The honest half of putting a limit on it. A search over a window nobody was told about is worse
      than no search — `alert-toolbar-search-scope.ts` argues that at length for the alerts toolbar.
    */
    expect(markupOf('lib/components/ChatArchiveLogPane.svelte', PANE)).toContain('log.truncated');
    expect(PANE).toContain('the search covers only those');
  });
});

describe('the list and the viewer are alternatives, never both', () => {
  it('chooses between them on a gate that covers the round trip', () => {
    const markup = codeOf('lib/components/LogArchiveModals.svelte', HOST);
    expect(markup).toContain('{#if log.archive || log.loading || log.error}');
    expect(markup).toContain('<ChatArchiveLogPane');
    expect(markup).toContain('<ChatArchivePane');
  });

  it('returns to the list when the modal closes', () => {
    /* Otherwise reopening the browser lands back inside whichever log was last read. */
    expect(codeOf('lib/components/LogArchiveModals.svelte', HOST)).toContain(
      "if (name !== 'chat-logs') log.back();"
    );
  });

  it('opens a log from the row, and restores from the button without doing both', () => {
    const markup = codeOf('lib/components/ChatArchivePane.svelte', LIST);
    expect(markup).toContain('onclick={() => onopen(archive)}');
    expect(markup).toContain('event.stopPropagation();');
  });

  it('restores through the LIST s own confirm, so there is one string and one send', () => {
    const markup = codeOf('lib/components/LogArchiveModals.svelte', HOST);
    expect(markup).toContain('archive.restore(open);');
    expect(markup).toContain('log.back();');
  });

  it('replaces the log wholesale, so the rune is raw', () => {
    expect(codeOf('lib/room/chat-archive-log.svelte.ts', VIEWER)).toContain(
      '#log = $state.raw<ChatArchiveLog | null>(null)'
    );
    expect(
      codeOf('lib/room/chat-archive-log.svelte.ts', VIEWER),
      'the filtered list is derived from the log and the term, never assigned by an effect'
    ).toContain('$derived.by');
  });
});
