<script lang="ts">
  /**
   * ── `SessionTranscriptComponent` — the "Full Transcript History" window ──────────────────────
   *
   * Transcribed from the pinned v4 bundle: the component at byte **2,607,394**, its template and
   * const table at **2,611,000**, its request at **1,151,135**. Every number, label, icon and
   * disabled-state below is the reference's, not a choice made here.
   *
   * ## Why this page exists at all
   *
   * `TODO.md` gap 18 recorded it as blocked because *"nothing in this repo produces a transcript"*.
   * That was false and was re-measured on 2026-09-02: captions have been relayed and rendered for
   * weeks. What was missing is that this is a SEPARATE WINDOW, and the room's caption history lives
   * in the room tab's memory — so the window had nothing to read. `session-transcript.remote.ts`
   * and the `session_transcripts` table are the half that was actually absent.
   *
   * ## The one deliberate divergence, and it is a refusal
   *
   * `openTranscriptPage()` opens `#/session-transcript?token=${globals.sesionToken}&name=…`. We
   * carry NEITHER. A session credential in an address bar is in the browser's history, in every
   * outbound `Referer` and in any screenshot — the refusal `TODO.md` already records for the
   * Benzinga default URL. This window is same-origin, so it arrives with the room's own session
   * cookie and the server re-derives both the room and the caller from it.
   *
   * The `name` follows: the reference puts the room's name in the query string and falls back to
   * `"Unknown Session"`. Ours comes back in the RESPONSE, from the config the server already read,
   * so the heading cannot be set by whoever opens the window — and the fallback has no case left,
   * because the server always knows the room's name.
   *
   * ## `loadTranscripts(page, append)`'s second argument is DEAD upstream
   *
   * Its body branches on it — `o ? [...h.transcripts, ...e.transcripts] : h.transcripts` — and all
   * five call sites pass `!1`. Transcribed as the non-appending behaviour it actually has, rather
   * than reproducing a branch nothing reaches.
   */
  import { sessionTranscript } from '../session-transcript.remote';

  /**
   * `this.selectedDate = this.getDefaultDate()` — today at LOCAL midnight, as an epoch millisecond.
   *
   * A NUMBER and not a `Date`, which is a deliberate departure from the reference's field type and
   * the only one in this file. Upstream holds a `Date` and mutates it in place (`i.setDate(…)`);
   * held in `$state` that is a mutable class instance whose in-place writes are invisible to
   * reactivity — `svelte-autofixer` flags exactly this and would have it replaced with
   * `SvelteDate`. A primitive removes the question rather than answering it: there is nothing to
   * mutate, every change is an assignment, and the value crossing to the server is already the
   * epoch millisecond the query takes.
   */
  function defaultDay(): number {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }

  /** `formatDateForInput(e)` — `yyyy-MM-dd` for the `<input type="date">`. */
  function formatDateForInput(dayStart: number): string {
    const day = new Date(dayStart);
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  }

  /**
   * `formatDate(e)` — the timestamp beside each line.
   *
   * `M/D/YYYY h:mm:ss AM` with a 12-hour clock, `a % 12 || 12` for noon and midnight, minutes and
   * seconds zero-padded and the hour NOT padded. Transcribed literally, including that asymmetry.
   */
  function formatDate(ts: number): string {
    const at = new Date(ts);
    const hours = at.getHours();
    return (
      `${at.getMonth() + 1}/${at.getDate()}/${at.getFullYear()} ` +
      `${hours % 12 || 12}:${String(at.getMinutes()).padStart(2, '0')}:` +
      `${String(at.getSeconds()).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`
    );
  }

  let selectedDayStart = $state(defaultDay());
  let selectedDateString = $state(formatDateForInput(defaultDay()));
  let currentPage = $state(0);
  let searchText = $state('');

  /*
    The query is `$derived`, so changing the day or the page refetches — which is what
    `loadTranscripts(page, append)` does imperatively upstream. A `$effect` calling a loader would
    be the "effect that assigns derived state" `CLAUDE.md` names by hand.

    The day crosses as the epoch millisecond of LOCAL midnight, and the server adds the 24 hours.
    The reference sends `Date.UTC(y, m, d, 13, 0, 0)` — 13:00 UTC on the selected day — because its
    server decides the boundary from that instant. Ours does not have that server, so the boundary is
    unambiguous instead of implied: `session-transcript.remote.ts` records the reasoning.
  */
  const transcripts = $derived(
    sessionTranscript({ dayStart: selectedDayStart, page: currentPage })
  );

  const loading = $derived(transcripts.loading);
  const failure = $derived(transcripts.error);
  const loaded = $derived(transcripts.current);
  const rows = $derived(loaded?.transcripts ?? []);
  const pagination = $derived(loaded?.pagination);
  /*
    `"Session Transcript for: " + o.sessionName`. Empty until the first response arrives, so the
    heading is the bare noun for that moment rather than the reference's `"Unknown Session"` — which
    is a fallback for a name that failed to cross in a URL, and nothing crosses in a URL here.
  */
  const sessionName = $derived(loaded?.sessionName ?? '');

  /**
   * `applySearch()` — client-side, over the LOADED page only.
   *
   * `i.text.toLowerCase().includes(e) || i.speaker.toLowerCase().includes(e)`, and an empty term
   * means every row rather than none. It filters what is on screen and does not ask the server,
   * exactly as upstream: the day's page is already here, and a server search would be a different
   * feature with a different endpoint.
   */
  const filtered = $derived.by(() => {
    const term = searchText.trim().toLowerCase();
    if (term.length === 0) return rows;
    return rows.filter(
      (row) => row.text.toLowerCase().includes(term) || row.speaker.toLowerCase().includes(term)
    );
  });

  /*
    `loadPrevious()` / `loadNextDay()` — one function, because upstream's two bodies differ only in
    `setDate(getDate() - 1)` versus `+ 1`.

    ## Calendar arithmetic, not millisecond arithmetic

    `selectedDayStart + 86_400_000` would be wrong twice a year: a DST boundary makes the local day
    23 or 25 hours long, so adding a fixed day lands on 23:00 the same evening or 01:00 the day
    after. The day FIELD is what steps, and the `Date` constructor normalises an out-of-range one
    (`day 0` is the last of the previous month, `day 32` rolls into the next) exactly as `setDate`
    does. That is why upstream uses `setDate` and why this is equivalent to it.

    ## Constructed rather than mutated, and that is not cosmetic

    Upstream builds a copy and calls `setDate` on it. `svelte-autofixer` flags any mutated `Date`
    and asks for `SvelteDate` — correctly in general, because an in-place write to a `Date` held in
    `$state` is invisible to reactivity. Here the value is a throwaway local, so `SvelteDate` would
    be a reactive wrapper with no reactive reader: the rule against code nothing consumes. Building
    the new date from its parts removes the mutation instead of wrapping it, which satisfies the
    linter for the real reason rather than papering over it.
  */
  function stepDay(days: number): void {
    const from = new Date(selectedDayStart);
    const next = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
    selectedDayStart = next.getTime();
    selectedDateString = formatDateForInput(selectedDayStart);
    currentPage = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** `resetToToday()`. */
  function resetToToday(): void {
    selectedDayStart = defaultDay();
    selectedDateString = formatDateForInput(selectedDayStart);
    currentPage = 0;
  }

  /**
   * `onDateChange()` — the picker's own handler.
   *
   * Upstream splits the `yyyy-MM-dd` string and builds `new Date(y, m - 1, d, 8, 0, 0)`. The
   * eight-o'clock hour is upstream's and it is load-bearing there only because its server derives
   * the day from the instant; here the day is what matters, so this constructs LOCAL midnight — the
   * same instant `getDefaultDate()` produces, so a picked "today" and the default agree. Building
   * them differently is how a page shows one day's rows under another day's heading.
   */
  function onDateChange(): void {
    if (!selectedDateString) return;
    const [year, month, day] = selectedDateString.split('-').map(Number);
    if (!year || !month || !day) return;
    selectedDayStart = new Date(year, month - 1, day).getTime();
    currentPage = 0;
  }

  function loadPrev(): void {
    if (currentPage === 0) return;
    currentPage -= 1;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function loadMore(): void {
    currentPage += 1;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function clearSearch(): void {
    searchText = '';
  }
</script>

<svelte:head>
  <!-- The reference titles the WINDOW with the heading it draws; there is no separate page title. -->
  <title>Session Transcript</title>
</svelte:head>

<div class="transcript-container">
  <div class="transcript-header">
    <h2>Session Transcript{sessionName ? ` for: ${sessionName}` : ''}</h2>
    <div class="header-controls">
      <div class="date-picker-container">
        <label for="date-picker" class="date-label">Date:</label>
        <input
          type="date"
          id="date-picker"
          class="form-control date-input"
          bind:value={selectedDateString}
          onchange={onDateChange}
        />
      </div>
      <div class="search-container">
        <div class="input-group">
          <input
            type="text"
            placeholder="Search transcripts..."
            class="form-control"
            bind:value={searchText}
          />
          <!--
            `O(12, o.searchText && o.searchText.length > 0 ? 12 : -1)` — the clear affordance only
            exists while there is something to clear.
          -->
          {#if searchText.length > 0}
            <span
              title="Clear search"
              class="input-group-text btn btn-light"
              role="button"
              tabindex="0"
              onclick={clearSearch}
              onkeydown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') clearSearch();
              }}
            >
              <i class="fas fa-times"></i>
            </span>
          {/if}
          <!--
            Upstream's magnifier calls `onSearchChange()`, which calls `applySearch()`. The filter
            here is `$derived`, so it has already run by the time this could be clicked. It stays as
            a LABEL rather than becoming a control whose only effect is changing nothing — which is
            the "no control whose only effect is its own label" rule, applied by making it inert
            markup instead of a button.
          -->
          <span class="input-group-text"><i class="fas fa-search"></i></span>
        </div>
      </div>
      <!-- `O(15, o.totalCount > 0 ? 15 : -1)` -->
      {#if pagination && pagination.totalCount > 0}
        <div class="pagination-info">
          Showing {filtered.length} of {pagination.totalCount} entries
          <!-- `O(2, e.totalPages > 0 ? 2 : -1)` -->
          {#if pagination.totalPages > 0}
            (Page {pagination.page + 1} of {pagination.totalPages})
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <div class="transcript-body">
    <!--
      `O(17, o.loading && 0 === o.transcripts.length ? 17 : o.error ? 18 : 19)` — three branches,
      and the FIRST one is only the empty-and-loading case. A page that already has rows keeps
      showing them and gets the inline "Loading more..." instead, which is why this is not simply
      `{#if loading}`.
    -->
    {#if loading && rows.length === 0}
      <div class="loading-container">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-3">Loading transcripts...</p>
      </div>
    {:else if failure}
      <div class="error-container">
        <div class="alert alert-danger" role="alert">
          <i class="fas fa-exclamation-triangle"></i>
          {failure.message}
        </div>
        <button type="button" class="btn btn-primary" onclick={() => transcripts.refresh()}>
          Retry
        </button>
      </div>
    {:else}
      <div class="pagination-controls-top">
        {@render controls()}
      </div>

      <!-- `O(16, e.loading && e.transcripts.length > 0 ? 16 : -1)` -->
      {#if loading && rows.length > 0}
        <div class="loading-more">
          <div class="spinner-border spinner-border-sm text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <span class="ms-2">Loading more...</span>
        </div>
      {/if}

      <!-- `O(17, 0 !== e.filteredTranscripts.length || e.loading ? 18 : 17)` -->
      {#if filtered.length === 0 && !loading}
        <div class="empty-container">
          <p>No transcripts found.</p>
          {#if searchText}
            <button type="button" class="btn btn-link" onclick={clearSearch}>
              Clear search to see all transcripts
            </button>
          {/if}
        </div>
      {:else}
        <div class="transcript-entries">
          <!-- `NRe = (t, n) => n._id` — the reference's own track-by. -->
          {#each filtered as entry (entry._id)}
            <div class="transcript-entry">
              <span class="entry-date">{formatDate(entry.ts)}</span>&nbsp;&nbsp;<span
                class="entry-speaker">{entry.speaker}</span
              >: {entry.text}
            </div>
          {/each}
        </div>
      {/if}

      <div class="pagination-controls-bottom">
        {@render controls()}
      </div>
    {/if}
  </div>
</div>

<!--
  The five buttons appear TWICE in the reference — `qRe` draws them at the top and again at the
  bottom, with the same handlers and the same disabled expressions. One snippet rather than two
  copies, because two copies is how the top row and the bottom row come to disagree.
-->
{#snippet controls()}
  <button type="button" class="btn btn-primary" disabled={loading} onclick={() => stepDay(-1)}>
    <i class="fas fa-arrow-up"></i> Load Previous Day
  </button>
  <button
    type="button"
    class="btn btn-secondary"
    disabled={loading || currentPage === 0}
    onclick={loadPrev}
  >
    <i class="fas fa-chevron-up"></i> Load Prev
  </button>
  <button type="button" class="btn btn-secondary" disabled={loading} onclick={loadMore}>
    Load More <i class="fas fa-chevron-down"></i>
  </button>
  <button type="button" class="btn btn-primary" disabled={loading} onclick={() => stepDay(1)}>
    Load Next Day <i class="fas fa-arrow-down"></i>
  </button>
  <button type="button" class="btn btn-outline-primary" disabled={loading} onclick={resetToToday}>
    <i class="fas fa-home"></i> Reset to Today
  </button>
{/snippet}

<style>
  /*
    Transcribed from the component's own `styles:[…]` array at bundle byte 2,613,700, with the
    `[_ngcontent-%COMP%]` scoping markers dropped — Svelte scopes these the same way, which is why
    the selectors are otherwise unchanged.
  */
  .transcript-container {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #f5f5f5;
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  }

  .transcript-header {
    background-color: #fff;
    border-bottom: 1px solid #dee2e6;
    padding: 1rem 1.5rem;
    box-shadow: 0 2px 4px #0000001a;
    flex-shrink: 0;
  }

  .transcript-header h2 {
    margin: 0 0 1rem;
    font-size: 1.5rem;
    font-weight: 600;
    color: #333;
  }

  .transcript-header .header-controls {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .header-controls .date-picker-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .date-picker-container .date-label {
    font-weight: 500;
    color: #495057;
    margin: 0;
    white-space: nowrap;
  }

  .date-picker-container .date-input {
    width: auto;
    min-width: 150px;
  }

  .header-controls .search-container {
    flex: 1;
    max-width: 500px;
  }

  .search-container .input-group .form-control {
    border-radius: 0.25rem 0 0 0.25rem;
  }

  .transcript-body {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 1.5rem;
  }

  .transcript-entries {
    display: flex;
    flex-direction: column;
  }

  .transcript-entry {
    padding: 0.25rem 0;
    line-height: 1.5;
  }

  .entry-date {
    color: #6c757d;
    font-variant-numeric: tabular-nums;
  }

  .entry-speaker {
    font-weight: 600;
    color: #212529;
  }

  .pagination-controls-top,
  .pagination-controls-bottom {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    padding: 0.5rem 0;
  }

  .loading-container,
  .empty-container,
  .error-container {
    text-align: center;
    padding: 2rem 0;
  }

  .loading-more {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 0;
  }
</style>
