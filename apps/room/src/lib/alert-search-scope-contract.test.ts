import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ALERT_PAGE_SIZE, alertSearchScopeNotice } from './alert-toolbar-search-scope.js';
import { CHAT_LOG_PAGE_SIZE } from './server/chat-log.js';

/**
 * THE TOOLBAR SEARCH SAYS WHAT IT SEARCHED.
 *
 * `TODO.md` filed this under SILENT CORRECTNESS GAPS — *"it works, but not the way the reference
 * works, and nothing says so"*. The field is ported verbatim from the capture down to its dangling
 * `aria-describedby`; what it does is not. Upstream sends `doChatLogSearch` to a server. Ours filters
 * the fifty rows the page happens to hold, so a reader searching for something from last week gets an
 * empty list and no indication the log was never asked.
 *
 * The defect table offered two resolutions and this is the second: **make the limit visible.** The
 * first — a real search endpoint — already exists one click away, in the Advanced Search modal that
 * has queried the database since 2026-08-23 and reports its own truncation. Rebuilding it behind the
 * toolbar would be a second search path over one table, and it would change what the toolbar is: a
 * live filter, no round trip, no spinner.
 */
describe('the alerts toolbar search states its scope', () => {
  it('says nothing when no term is typed', () => {
    /* The toolbar is not filtering, so there is no partial answer to warn about. */
    expect(alertSearchScopeNotice({ term: '', loadedCount: 500 })).toBeNull();
    expect(alertSearchScopeNotice({ term: '   ', loadedCount: 500 })).toBeNull();
  });

  it('says nothing when the whole log is loaded', () => {
    /*
      Fewer alerts than a page means the reader IS looking at everything, so the filter's answer is
      the log's answer. The common case in a quiet room, and the one that would make a permanent
      notice read as boilerplate nobody reads.
    */
    expect(alertSearchScopeNotice({ term: 'AAPL', loadedCount: 0 })).toBeNull();
    expect(alertSearchScopeNotice({ term: 'AAPL', loadedCount: ALERT_PAGE_SIZE - 1 })).toBeNull();
  });

  it('SAYS SO once a full page is loaded, which is when older alerts may exist', () => {
    const notice = alertSearchScopeNotice({ term: 'AAPL', loadedCount: ALERT_PAGE_SIZE });
    expect(notice).toContain('not the whole log');
    expect(notice, 'and it points at the search that IS complete').toContain('Advanced Search');
    expect(notice, 'with the number it actually searched').toContain(String(ALERT_PAGE_SIZE));
  });

  it('warns even when the filter FOUND something, which is the case a reader trusts most', () => {
    /*
      Deliberately not conditioned on the result count. A search that returned three matches out of
      fifty rows is exactly as partial as one that returned none, and warning only on the empty case
      would teach readers that results mean completeness — a worse lie than the one being fixed.
    */
    expect(alertSearchScopeNotice({ term: 'AAPL', loadedCount: 200 })).not.toBeNull();
  });

  it('is the same page size the server actually pages by', () => {
    /*
      The number is declared twice — once for the client, once in a server-only module the browser
      must not import — and two copies of one constant drift silently because both still compile.
      This is the assertion that makes the drift loud.
    */
    expect(ALERT_PAGE_SIZE).toBe(CHAT_LOG_PAGE_SIZE);
  });
});

describe('the notice reaches the reader', () => {
  const PANE = readFileSync(new URL('./components/AlertChatArea.svelte', import.meta.url), 'utf8');
  const PANE_CLASS = readFileSync(new URL('./room/alerts-pane.ts', import.meta.url), 'utf8');

  it('is computed where both halves already live', () => {
    /*
      `RoomAlertsPane` holds the term (`RoomAlerts`) and the set the toolbar actually filters
      (`feeds.searchableAlerts`). Counting the raw loaded list instead would have been slightly WRONG
      as well as a wider dependency: it includes alerts the viewer's own trader filter hides, which
      the search never sees, so the notice would name a number larger than anything searched.
    */
    expect(PANE_CLASS).toContain('get searchScopeNotice()');
    expect(PANE_CLASS).toContain('loadedCount: this.#feeds.searchableAlerts.length');
  });

  it('renders beside the field it describes, and announces itself', () => {
    expect(PANE).toContain('{#if searchScopeNotice}');
    expect(PANE, 'a screen reader is told the answer narrowed').toContain('role="status"');
  });
});
