import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { codeOf } from '#lib/source-comments.js';

/**
 * THE ALERT-SENT-REPORT MODAL, AND THE ADVANCED SEARCH BESIDE IT.
 *
 * `docs/decoded/room-surface-audit-2026-08-30.md`'s
 * `## ModalHost: report / advanced-search modal` section is eleven open rows, and this file is the
 * gate for all of them. Six of the eleven are a REFUSAL rather than a build, which is the unusual
 * thing about this file and the reason it is written the way it is.
 *
 * ## What a test for a measured refusal has to do, and what it must not do
 *
 * RPT-01, RPT-03, RPT-04, RPT-05, RPT-06 and RPT-07 are not built. Six controls of upstream's
 * report modal — the fetch, the per-status rows, the search box, the status select, the pie chart
 * and the token dialog — all rest on a list of per-recipient DELIVERY RECORDS, and this product has
 * no such list: no table, no writer, no sender.
 *
 * A test asserting "we did not build it" is worthless — it passes forever and stops nobody. So this
 * file asserts the MEASUREMENT instead, on the two things that would change if the refusal ever
 * stopped being true:
 *
 *   1. **The schema still has no delivery table.** The "finds no per-recipient delivery record"
 *      assertion below reads every migration in `services/api/migrations` and looks for one — by
 *      the COLUMNS a delivery record must hold, not by a table name somebody might not reuse. If
 *      one appears, that test goes RED and the six rows come back onto the table, which is the
 *      correct outcome and the whole point. A refusal whose premise has expired is worse than an
 *      unbuilt feature, because it looks decided.
 *   2. **The modal does not pretend.** No spinner, no `No Reports.` for an alert that was never
 *      queried, and the notice says what is missing.
 *
 * That second half is the defect RPT-02 names, and it is the one that was actually shipped: a
 * hard-coded 500 ms spinner in front of a permanently empty list, ending on the literal
 * `No Reports.`. A presenter read that as "this alert reached nobody".
 *
 * ## Every offset here was read from the pinned bundle in this session
 *
 * `main.d1d09071be31f1ba.js`, 2,891,205 bytes, SHA-256 `40796ca8…bab87524`, checked against that
 * directory's `sha256sums.txt`. The whole reference component (bytes 2,408,900–2,416,400) was
 * decoded — the pipe, three row templates, the class and the consts table — because a refusal has
 * to be made against what the thing actually does, not against the one line an audit row quoted.
 *
 * ## Negative controls
 *
 * Every `it` was run against a mutated source or a mutated migration and seen RED before this file
 * was committed; the mutations are listed in the change's report.
 */
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (file: string) => codeOf(file, readFileSync(`${ROOT}${file}`, 'utf8'));

const MODAL = 'lib/components/ModalHost.svelte';
const modal = read(MODAL);
const modalRaw = readFileSync(`${ROOT}${MODAL}`, 'utf8');

/**
 * The report modal is its OWN component — `AlertSendReportModal.svelte`.
 *
 * Extracted from `ModalHost.svelte` in the same change these rows were dispositioned in, because
 * the refusal below is a hundred lines of argument about one surface and that is a document, not a
 * comment on a `<div>`. Both files are read here: the refusal lives in the component, and the
 * assertion that `ModalHost` does NOT still carry a second copy of the report apparatus lives
 * against the host.
 */
const REPORT = 'lib/components/AlertSendReportModal.svelte';
const report = read(REPORT);
const reportRaw = readFileSync(`${ROOT}${REPORT}`, 'utf8');

const BUNDLE = readFileSync(
  fileURLToPath(
    new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url)
  ),
  'utf8'
);

/** `services/api/migrations` — the schema this product actually has, read rather than remembered. */
const MIGRATIONS_DIR = fileURLToPath(
  new URL('../../../../services/api/migrations/', import.meta.url)
);
const MIGRATIONS = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith('.sql'))
  .map((name) => readFileSync(`${MIGRATIONS_DIR}${name}`, 'utf8'))
  .join('\n');

/**
 * The migrations with their `--` comments removed — the same rule `codeOf` exists for, in SQL.
 *
 * This is not fastidiousness: the first draft of the delivery-table probe below went RED on the
 * word "latency", and the hit was `0003_room_events.sql`'s prose explaining that losing a wakeup
 * "costs latency, never an event". Prose satisfying an assertion about schema is precisely the
 * false-positive `source-comments.ts` was written after, arriving in a file type that module does
 * not cover.
 *
 * `--` to end of line only. Migrations here carry no block comments, and a `/* *\/` stripper over
 * SQL would have the same string-literal hazard the Svelte one does.
 */
const MIGRATION_SQL = MIGRATIONS.replace(/--[^\n]*/g, '');

describe('the sources this file measures are actually loaded', () => {
  it('reads both modals, the bundle and every migration', () => {
    expect(modal.length).toBeGreaterThan(500);
    expect(report.length).toBeGreaterThan(300);
    expect(BUNDLE.length).toBe(2_891_205);
    // Nine numbered migrations as of this commit; the assertion is that SOME were read, not how many.
    expect(MIGRATIONS.length).toBeGreaterThan(10_000);
    expect(MIGRATIONS).toContain('CREATE TABLE public.alerts');
  });
});

describe('RPT-01 / RPT-03 / RPT-04 / RPT-05 / RPT-06 / RPT-07 — the refusal, and its premise', () => {
  /**
   * The reference's own component, so the refusal is made against what it really does.
   */
  it('reads the six controls in the bundle that this room refuses to imitate', () => {
    // RPT-01: the fetch, and the error string it sets when it fails.
    const loader = BUNDLE.slice(2_413_317, 2_413_317 + 420);
    expect(loader).toContain('showTokenReport(e){bootbox.alert({title:"Token"');
    expect(loader).toContain('invokeAdminCmd("getAlertReport"');
    expect(loader).toContain('There was an error loading the report.');

    // RPT-03: one row, with the four fields only a delivery record can supply.
    /* The row cites 2,410,281; `xMe` itself begins at 2,410,233 — read, not trusted. */
    const row = BUNDLE.slice(2_410_233, 2_410_233 + 610);
    expect(row.startsWith('function xMe(')).toBe(true);
    expect(row).toContain('e.status');
    expect(row).toContain('e.email');

    // RPT-04: the search pipe — status equality, then an email substring.
    expect(BUNDLE.slice(2_409_100, 2_409_400)).toContain('name:"searchReports"');

    // RPT-05: the four <option>s.
    const selectConsts = BUNDLE.slice(2_414_516, 2_414_516 + 260);
    expect(selectConsts).toContain('"id","search-select-addon"');
    expect(selectConsts).toContain('["value","queued"]');

    // RPT-06: the pie, drawn by jQuery flot into #pie-container.
    expect(BUNDLE.slice(2_412_738, 2_412_738 + 420)).toContain('$.plot("#pie-container"');
  });

  /**
   * THE PREMISE. If this goes red, the six rows are live again — that is the intended behaviour of
   * this assertion and not a bug in it.
   */
  it('finds no per-recipient delivery record anywhere in the schema', () => {
    /*
      Named columns rather than a table name, because the next person to build this may not call the
      table `alert_deliveries`. A delivery record is identifiable by what it HOLDS: an outcome, a
      time it was sent, a latency, or a reason it failed. Any of those appearing is the signal.
    */
    for (const marker of ['fail_reason', 'sent_time', 'latency', 'delivery_status']) {
      expect(MIGRATION_SQL.toLowerCase(), `"${marker}" appeared in the schema`).not.toContain(
        marker
      );
    }
    expect(MIGRATION_SQL).not.toMatch(/CREATE TABLE public\.\w*deliver/i);
  });

  it('confirms alerts.dispatch is the REQUEST, not the outcome — five booleans and nothing else', () => {
    /*
      This is the column somebody will reach for when they read the refusal, so the shape it
      actually has is pinned here. It records which channels were TICKED; there is no recipient, no
      status and no timestamp behind it.
    */
    expect(MIGRATIONS).toContain(
      `dispatch jsonb DEFAULT '{"sms": false, "push": false, "email": false, "twitter": false, "crossPost": false}'::jsonb NOT NULL`
    );
    expect(MIGRATIONS).toContain('alerts_dispatch_shape_check');
  });

  it('has no client half either — getAlertReport is asked for nowhere in the room', () => {
    for (const source of [modal, report]) {
      expect(source).not.toContain('getAlertReport');
      expect(source).not.toContain('invokeAdminCmd');
    }
  });

  it('draws no report apparatus: no rows, no search, no select, no pie', () => {
    const at = report.indexOf('<app-alert-send-report-modal>');
    expect(at, 'the report modal moved').toBeGreaterThan(-1);
    const end = report.indexOf('</app-alert-send-report-modal>');
    expect(end, 'the report modal has no closing tag').toBeGreaterThan(-1);
    const body = report.slice(at, end);
    for (const absent of [
      'list-group-item',
      'pie-container',
      'search-select-addon',
      'search-term',
      'sent-time',
      'failed-reason'
    ]) {
      expect(body, `${absent} was drawn over a list that cannot exist`).not.toContain(absent);
    }
    /* And the host did not keep a second copy when the surface moved out of it. */
    expect(modal).not.toContain('<app-alert-send-report-modal>');
    expect(modal).toContain('<AlertSendReportModal');
  });

  it('says what is missing, in its own words rather than the reference’s empty-result copy', () => {
    expect(report).toContain('REPORT_UNAVAILABLE');
    expect(reportRaw).toContain(
      'Delivery reporting is not available here: this room records no per-recipient delivery for an alert'
    );
    /*
      `No Reports.` is upstream's `AMe` and means "the fetch returned an empty queue". There is no
      fetch, so claiming its answer would be the RPT-02 defect written as a sentence.
    */
    expect(report).not.toContain('>No Reports.<');
  });
});

describe('RPT-02 — the spinner that described no work is gone', () => {
  it('has no report timer, and no reportLoading state for one to write to', () => {
    expect(modal).not.toContain('reportLoading');
    /*
      The `$effect` keyed on `name !== 'report'` was the only writer. Asserting on the effect's
      GUARD rather than on `setTimeout` (which this file legitimately uses elsewhere) is what keeps
      this from going red for an unrelated timer.
    */
    expect(modal).not.toMatch(/name !== 'report'/);
  });

  it('renders the notice unconditionally on the alert id, with no loading branch at all', () => {
    expect(report).not.toContain('fa-spinner');
    expect(report).not.toContain('Loading...');
    /* And it holds no loading state of its own to grow one back from. */
    expect(report).not.toContain('$state');
  });
});

describe('RPT-08 — a report opened over a message with no id says so', () => {
  /** `openAlertSendReport(e){e? … :bootbox.alert("No reports found.")}` at byte 1,349,868. */
  it('reads the reference’s entry-point refusal', () => {
    /* Cited as 1,349,868; the method starts at 1,349,819. The row's own verifier said so too. */
    const slice = BUNDLE.slice(1_349_819, 1_349_819 + 150);
    expect(slice.startsWith('openAlertSendReport(e){')).toBe(true);
    expect(slice).toContain('bootbox.alert("No reports found.")');
  });

  it('carries the reference’s string, verbatim, on the no-id branch', () => {
    expect(reportRaw).toContain("const NO_REPORTS_FOUND = 'No reports found.';");
    expect(report).toContain('{#if targetMessage?.id}');
    expect(report).toContain('{NO_REPORTS_FOUND}');
  });

  /*
    HALF, and marked as half. Upstream refuses at the ENTRY POINT — the modal never opens. This
    room opens it from `message-actions.svelte.ts`, which this change does not own, so the refusal
    lands inside the dialog instead of instead of it. The audit row names the one-line change.
  */
});

describe('SRCH-02 — a failed search is told apart from an empty one', () => {
  /**
   * `.catch(s => { emit("getAlertsAdvancedSearchFailed", { msg: "There was an error searching for
   * alerts, please try again or contact support" }) })` at 1,150,520, and the modal's subscriber at
   * 2,424,060 clearing the rows, stopping the spinner and raising `bootbox.alert(i.msg)`.
   */
  it('reads both halves in the bundle', () => {
    expect(BUNDLE.slice(1_150_400, 1_150_700)).toContain(
      'There was an error searching for alerts, please try again or contact support'
    );
    const subscriber = BUNDLE.slice(2_424_060, 2_424_060 + 130);
    expect(subscriber).toContain('getAlertsAdvancedSearchFailed');
    expect(subscriber).toContain('bootbox.alert(i.msg)');
  });

  it('catches, and raises the reference’s own copy', () => {
    const at = modal.indexOf('async function runAdvancedSearch()');
    expect(at, 'runAdvancedSearch moved').toBeGreaterThan(-1);
    const body = modal.slice(at, at + 900);
    expect(body).toContain('} catch {');
    expect(body).toContain('onAlert(ADVANCED_SEARCH_FAILED)');
    expect(modalRaw).toContain(
      "'There was an error searching for alerts, please try again or contact support'"
    );
  });

  it('clears the truncation flag too, so a failure cannot inherit the last search’s footnote', () => {
    const at = modal.indexOf('} catch {');
    expect(at).toBeGreaterThan(-1);
    expect(modal.slice(at, at + 200)).toContain('advancedSearchTruncated = false');
  });

  it('still clears the spinner in finally, which is where it always belonged', () => {
    const at = modal.indexOf('async function runAdvancedSearch()');
    const body = modal.slice(at, at + 900);
    expect(body.indexOf('} finally {')).toBeGreaterThan(body.indexOf('} catch {'));
    expect(body).toContain('advancedSearchLoading = false');
  });
});

describe('SRCH-03 — the rooms dropdown names this room, not an invented one', () => {
  /** `ZMe` at 2,420,598 iterates `{key,value}` pairs through `toggleSess(o.key, o.value)`. */
  it('reads the reference’s iteration, which is what stays diverged', () => {
    /* Cited as 2,420,598, which is inside the click handler; `ZMe` begins at 2,420,490. */
    const slice = BUNDLE.slice(2_420_490, 2_420_490 + 220);
    expect(slice.startsWith('function ZMe(')).toBe(true);
    expect(slice).toContain('toggleSess(o.key,o.value)');
  });

  it('confirms neither invented literal is anywhere in the reference bundle', () => {
    /*
      This is the measurement that turned SRCH-03 from "a divergence we argued for" into "a
      divergence plus an invention". A full-file search, not a slice.
    */
    expect(BUNDLE.includes('mastering-the-trade')).toBe(false);
    expect(BUNDLE.includes('Mastering The Trade')).toBe(false);
  });

  it('has removed both literals from the room', () => {
    expect(modal).not.toContain('mastering-the-trade');
    expect(modal).not.toContain('Mastering The Trade');
  });

  it('toggles on the controller’s own shortCode and name', () => {
    const at = modal.indexOf('{const roomKey = $derived(room.shortCode)}');
    expect(at, 'the rooms dropdown entry moved').toBeGreaterThan(-1);
    const entry = modal.slice(at, at + 500);
    expect(entry).toContain('toggleKey(advancedSearch.rooms, roomKey, room.name)');
    expect(entry).toContain('advancedSearch.rooms[roomKey]');
    expect(entry).toContain('{room.name}');
  });

  it('takes only the two fields it reads, not the whole room record', () => {
    expect(modalRaw).toContain('room: { shortCode: string; name: string };');
    /* `state`, `logoUrl`, `publicId` and `maxUsers` travel on `data.room` and are not needed here. */
    for (const unread of ['room.logoUrl', 'room.publicId', 'room.maxUsers']) {
      expect(modal).not.toContain(unread);
    }
  });

  it('is fed from the page load, from the controller’s description of this room', () => {
    expect(read('lib/components/RoomOverlays.svelte')).toContain('room={data.room}');
  });

  it('uses a declaration tag paired with $derived, not the legacy {@const} and not a bare one', () => {
    /*
      `declaration-tag-contract.test.ts` owns both halves of this rule repo-wide; asserted here for
      this one site because this is the site that got it wrong. The first draft was a bare
      `{const roomKey = room.shortCode}` with a comment arguing that `room` cannot change. A bare
      declaration tag compiles to no derived and is evaluated once when its block is created — and
      `room` is a prop off `data.room`, which `depends('room:data')` can re-run, so the argument was
      wrong as well as against the rule.
    */
    expect(modal).toContain('{const roomKey = $derived(room.shortCode)}');
    expect(modal).not.toContain('{@const');
  });
});

describe('SRCH-05 — the truncation notice is ours, and stays', () => {
  /**
   * DELIBERATE DIVERGENCE. `ALERT_SEARCH_LIMIT` caps the search at 500 rows, and the reference has
   * no counterpart: the substring `truncated` occurs exactly ONCE in the whole 2,891,205-byte
   * bundle, inside hls.js. A silent cap is the worse failure — a presenter reading 500 results with
   * no note believes they have seen everything — so this is kept and recorded rather than removed
   * for symmetry.
   */
  it('confirms the reference has no truncation concept, by full-file search', () => {
    const hits = [...BUNDLE.matchAll(/truncated/g)].map((match) => match.index);
    expect(hits.length).toBe(1);
    // The one hit is hls.js, about AAC PES packets — nothing to do with a search result cap.
    expect(BUNDLE.slice(hits[0]! - 60, hits[0]! + 10)).toContain('AAC PES packet');
  });

  it('still renders the notice, and the cap it names is the one the search uses', () => {
    /*
      ## THIS ASSERTION WAS WEAKER THAN IT LOOKED, AND THE NEGATIVE CONTROL CAUGHT IT

      It was `expect(modal).toContain('advancedSearchTruncated')` plus the same for
      `ALERT_SEARCH_LIMIT` — two symbols that occur seven times between them across the state
      declaration, three resets and the assignment from `found.truncated`. So the control that was
      supposed to prove it — deleting a line of the notice — came back GREEN, because the symbols
      survived everywhere else. A test whose subject is a RENDERED NOTICE has to read the markup.

      What it reads now is the notice as a reader sees it: the `{#if}` on the flag, the copy, and
      the interpolated constant inside it. `ALERT_SEARCH_LIMIT` and not the literal 500, because the
      cap is `alert-search-limit.ts`'s to name and a number copied here would be a second one.
    */
    const at = modal.indexOf('{#if advancedSearchTruncated}');
    expect(at, 'the truncation notice was removed').toBeGreaterThan(-1);
    const notice = modal.slice(at, at + 260);
    expect(notice).toContain('Showing the newest {ALERT_SEARCH_LIMIT} matches');
    /* And it is fed by the search rather than left as a flag nothing sets. */
    expect(modal).toContain('advancedSearchTruncated = found.truncated');
  });
});
