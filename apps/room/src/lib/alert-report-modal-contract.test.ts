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
/* RPT-08's two halves live outside the modal now: the string here, the guard in the dispatcher. */
const BEHAVIOUR_RAW = readFileSync(`${ROOT}lib/message-behavior.ts`, 'utf8');
const ACTIONS = read('lib/room/message-actions.svelte.ts');

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

/**
 * Every `.rs` file under `services/api/src`, joined — the SENDER half of the premise.
 *
 * Added 2026-09-02, when the refusal was re-challenged under "match the dump exactly" and the
 * challenge proposed building the report against a NEW delivery-attempt table *"written when
 * `alerts.dispatch` fans out"*. There is no such fan-out, and that is the fact this constant makes
 * falsifiable rather than remembered. See the assertion below.
 */
const API_SRC_DIR = fileURLToPath(new URL('../../../../services/api/src/', import.meta.url));
const API_SOURCES = readdirSync(API_SRC_DIR, { recursive: true, encoding: 'utf8' })
  .filter((name) => name.endsWith('.rs'))
  .map((name) => readFileSync(`${API_SRC_DIR}${name}`, 'utf8'))
  .join('\n');

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

  it('finds no DISPATCHER either — nothing reads the flags, so there is nothing to report on', () => {
    /*
      THE STRONGER HALF OF THE PREMISE, measured 2026-09-02 when the refusal was re-challenged.

      The challenge accepted that the schema has no delivery record and proposed building one
      *"written when `alerts.dispatch` fans out"*, with the modal showing the reference's own
      `No Reports.` until rows appear. Both halves of that fail on one measurement: **there is no
      fan-out.** `Dispatch` is five booleans on the alert row (pinned above), nothing in
      `services/api` reads one of them, and no SMS, email or push client exists anywhere in it.

      So the proposal is a table with no writer feeding an endpoint that can only ever return empty
      — and the modal would then tell a presenter, in the reference's own words, that their alert
      reached nobody. That is RPT-02 exactly: the defect this room already shipped once and fixed,
      and it is a silent fallback in a product where the fallback is a factual claim about delivery.

      This is a better premise-expiry signal than the schema sweep beside it, because it fails in
      the right ORDER: a sender has to exist before there is an outcome worth recording. The day one
      of these names appears, this goes red and all six rows come back.
    */
    for (const marker of ['twilio', 'sendgrid', 'resend', 'firebase', 'apns']) {
      expect(
        API_SOURCES.toLowerCase(),
        `"${marker}" appeared in services/api — a sender exists now, so RPT-01..07 are buildable`
      ).not.toContain(marker);
    }
    /*
      And nothing READS the flags. Written as the field accesses rather than the word `dispatch`,
      which appears in the request struct, the column and this file's own prose.
    */
    for (const read of ['dispatch.sms', 'dispatch.email', 'dispatch.push', 'dispatch.twitter']) {
      expect(API_SOURCES, `${read} is read now — something acts on the flags`).not.toContain(read);
    }
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

  it('carries the reference’s string verbatim, in the transcription module', () => {
    expect(BEHAVIOUR_RAW).toContain("export const NO_REPORTS_FOUND = 'No reports found.';");
  });

  /*
    CLOSED 2026-08-30 — the guard moved to where upstream's is, and this is the pair of assertions
    that says so.

    It was HALF: the string was rendered on the `{:else}` of an `{#if targetMessage?.id}` INSIDE the
    component, one step after the dialog had already opened, because the change that carried it
    could not edit the opener. Both halves are asserted below, and the second is the one that
    matters — a refusal that lands after the thing it refuses is not the reference's behaviour, it
    is the reference's words over ours.
  */
  it('refuses at the ENTRY POINT, where the reference refuses', () => {
    const at = ACTIONS.indexOf("if (action === 'report')");
    expect(at, 'the report branch moved').toBeGreaterThan(-1);
    const branch = ACTIONS.slice(at, at + 200);
    expect(branch, 'opens only for a message that has an id').toContain(
      "if (item.id) this.#openModal('report');"
    );
    expect(branch, 'and otherwise raises the reference’s own string').toContain(
      'this.#dialogs.alert = NO_REPORTS_FOUND;'
    );
  });

  it('leaves NO second answer behind it in the component', () => {
    /*
      The negative half, and it is the whole reason the branch was deleted rather than left. With
      the entry point refusing, an id-less message cannot construct this modal, so an `{:else}`
      here would be a branch nothing can reach — which this repository forbids by name, and which
      would quietly become the answer again if anyone ever removed the guard.
    */
    expect(report, 'the unreachable gate is gone').not.toContain('{#if targetMessage?.id}');
    expect(report, 'and so is the string it guarded').not.toContain('NO_REPORTS_FOUND');
  });
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

/**
 * ## ASR-1, ASR-2, ASR-3 — the chrome that SURVIVES the refusal, read 2026-08-31
 *
 * The six rows above refuse the report itself. This block is about everything else the reference
 * component carries, decoded the same way and by value: `selectors:[["app-alert-send-report-modal"]]`
 * at byte 2,413,823, its consts table bracket-walked from `consts:[` at 2,413,870 (39 entries), the
 * template after it, and the `styles:[…]` array after that.
 *
 * **ASR-1 — the component stylesheet is THIRTEEN rules and this room needs none of them.** Eleven
 * are scoped to `.list-group`, `.list-group-item`, `.list-group-item:hover`, `.report-header`,
 * `.report-header-container`, `.report-body`, `#search-select-addon`, `.form-select`,
 * `.failed-reason`, `.sent-time` and `#pie-container` — every one of them an element the refusal
 * above means does not exist here, so transcribing them would be eleven rules matching zero
 * elements.
 *
 * RE-CHALLENGED 2026-09-02 under "match the dump files exactly", and it SURVIVES — recorded here
 * rather than dropped, because a refusal nobody re-tests is the shape this repository keeps finding
 * wrong. Two things were put to it and neither carried:
 *
 *   The `stars-container` precedent. `lib/styles/captured-runtime-components.css` does ship
 *   roster-scoped rules ahead of their producer, so orphan captured CSS is said to be established
 *   practice here. It is not a precedent for this: that file is GENERATED WHOLESALE from a pinned
 *   capture (`css/complete-app-styles.css`, SHA-256 in its own header, `pnpm css:sync-captured`),
 *   so its orphans are a property of the generator rather than a choice anybody made rule by rule.
 *   These eleven are not in that capture at all — they are in the JS bundle's `styles:[…]` array —
 *   so porting them means hand-authoring eleven orphan rules into `app.css`, which is a different
 *   act with a different rule over it: CLAUDE.md's "nothing exists without a consumer".
 *
 *   "A shipped stylesheet is reference-facing output." It is, when something renders. These eleven
 *   style elements of the report LIST, and the list is refused on EVIDENCE ABSENT — no delivery
 *   table, no writer, no sender, re-measured with the schema sweep below. CSS for markup that
 *   cannot exist is not output; it is the decoration of a feature, and it would make the refusal
 *   look decided in the direction of "nearly built".
 *
 * The premise-expiry assertions below are what make this safe to leave: the day a delivery record
 * appears, the six rows come back and these eleven rules come with them.
 *
 * The other two are `.modal-dialog`, and both already hold:
 * `.modal-dialog{width:100%;max-width:800px}` is `app.css:1524`, and `width:auto` on a block box
 * with no padding or border resolves to the same used width as `width:100%`; and
 * `.modal-dialog{overflow-y:initial!important}` restates that property's own initial value, which
 * nothing in this room's `.modal-dialog` rule overrides. **MEASURED REFUSAL**, and the assertions
 * below are what would notice if either half stopped being true.
 *
 * **ASR-2 — the dialog has no accessible name, and neither does the reference's.** Const 0 is
 * `["id","alert-send-report-modal","tabIndex","-1","role","dialog","aria-labelledby",
 * "alert-send-report-modal","aria-hidden","true",1,"modal","fade"]`: `aria-labelledby` names the
 * element it is ON. The accname recursion guard drops a self-reference, so a screen reader
 * announces a nameless `role="dialog"`, and ours reproduces it attribute for attribute.
 *
 * NOT repaired here, and the reason is a count rather than a shrug. Measured across
 * `lib/components`: **22 `Modal` call sites, 9 of which pass a distinct `titleId`, and 10 —
 * including this one — are the same self-reference.** Nine of those ten are in `ModalHost.svelte`
 * and `LogArchiveModals.svelte`, which this pass does not own. Repairing one of ten would trade a
 * captured-value divergence for an inconsistency across the room's dialogs; the fix is one
 * `titleId` per site in one change, by somebody who owns all three files. The count is asserted
 * below so that "ten" cannot quietly become "eleven".
 *
 * **ASR-3 — BUILT 2026-08-31.** Bootstrap's modal plugin calls `_element.focus()` on show and this
 * room ships no Bootstrap JavaScript at all (`bootstrap-dropdown-contract.test.ts` holds that
 * premise for every app here), so opening a dialog left focus wherever it was, behind an `inert`
 * boundary about to move. `Modal.svelte`'s attachment took the fix — one line, in the one component
 * every dialog in this room is, which is exactly why it was right to wait for a session that owned
 * it rather than special-case one call site.
 */
describe('ASR-1 — the reference stylesheet, and the two rules of it that reach us', () => {
  /** The `styles` array of `app-alert-send-report-modal`, sliced at bounds that were found. */
  const componentStyles = () => {
    const selector = BUNDLE.indexOf('selectors:[["app-alert-send-report-modal"]]');
    expect(selector, 'the report modal component moved in the bundle').toBeGreaterThan(-1);
    const opened = BUNDLE.indexOf('styles:["', selector);
    expect(opened, 'the report modal has no styles array after its selector').toBeGreaterThan(-1);
    const closed = BUNDLE.indexOf('"]})', opened);
    expect(closed, 'the styles array is unterminated').toBeGreaterThan(opened);
    return BUNDLE.slice(opened, closed);
  };

  it('still carries thirteen rules, eleven of them for elements the refusal removes', () => {
    const styles = componentStyles();
    /* Every rule in this array has exactly one declaration block, so `{` counts rules. */
    expect([...styles.matchAll(/\{/g)]).toHaveLength(13);
    for (const selector of [
      '.list-group[_ngcontent-%COMP%]{',
      '.list-group-item[_ngcontent-%COMP%]{',
      '.report-header-container[_ngcontent-%COMP%]{',
      '#search-select-addon[_ngcontent-%COMP%]{',
      '.failed-reason[_ngcontent-%COMP%]{',
      '.sent-time[_ngcontent-%COMP%]{',
      '#pie-container[_ngcontent-%COMP%]{'
    ]) {
      expect(styles, `${selector} moved`).toContain(selector);
    }
    /* And that none of those selectors has an element here to match. */
    for (const orphan of ['report-header-container', 'search-select-addon', 'pie-container']) {
      expect(report, `${orphan} is rendered after all — ASR-1's premise has expired`).not.toContain(
        orphan
      );
    }
  });

  it('carries the one width rule this room DOES honour, and this room honours it', () => {
    expect(componentStyles()).toContain(
      '.modal-dialog[_ngcontent-%COMP%]{width:100%;max-width:800px}'
    );
    const css = readFileSync(`${ROOT}app.css`, 'utf8');
    const at = css.indexOf('#alert-send-report-modal > .modal-dialog');
    expect(at, 'the 800px rule for this dialog was removed from app.css').toBeGreaterThan(-1);
    expect(css.slice(at, at + 200)).toContain('max-width: 800px');
  });
});

/**
 * Every `<Modal …>` OPENING TAG in one file, brace-aware.
 *
 * ## The regex this replaces was truncating its own matches, and it did it silently
 *
 * `/<Modal\b[^>]*>/gs` stops at the first `>` in the source — and an arrow function in any prop
 * value contains one. `onclose={() => (giphyOpen = false)}` cut the note editor's Giphy dialog off
 * three props early, so the counter saw its `id=` (before the arrow) and never saw its `titleId=`
 * (after it), and filed a NAMED dialog as a self-referential one.
 *
 * Found on 2026-09-01 when `GIF-07` added the first `<Modal>` whose `onclose` precedes `titleId`.
 * Every earlier call site happened to order its props the other way, which is why a counter that
 * could not read an arrow function had been returning plausible numbers for weeks.
 *
 * Scanning with a brace depth is the fix rather than a longer regex: the tag ends at the first `>`
 * that is not inside a `{…}` expression, and that is a rule about the language rather than about
 * which characters people happen to use.
 */
function modalOpeningTags(source: string): string[] {
  const tags: string[] = [];
  for (const match of source.matchAll(/<Modal\b/g)) {
    let depth = 0;
    for (let index = match.index + match[0].length; index < source.length; index += 1) {
      const character = source[index];
      if (character === '{') depth += 1;
      else if (character === '}') depth -= 1;
      else if (character === '>' && depth === 0) {
        tags.push(source.slice(match.index, index + 1));
        break;
      }
    }
  }
  return tags;
}

describe('ASR-2 — the self-referential aria-labelledby, and the count that keeps it', () => {
  it('reads the same self-reference out of the reference component itself', () => {
    const at = BUNDLE.indexOf('["id","alert-send-report-modal","tabIndex","-1"');
    expect(at, 'const 0 of the report modal moved').toBeGreaterThan(-1);
    expect(BUNDLE.slice(at, at + 200)).toContain('"aria-labelledby","alert-send-report-modal"');
  });

  it('reproduces it here, deliberately, and still passes no titleId', () => {
    const at = report.indexOf('id="alert-send-report-modal"');
    expect(at, 'the modal id moved').toBeGreaterThan(-1);
    const props = report.slice(at, at + 300);
    expect(props).toContain('ariaLabelledby="alert-send-report-modal"');
    expect(props).not.toContain('titleId');
  });

  it('holds the count that says why one of ten is not repaired alone', () => {
    /*
      Read from the markup rather than remembered. A `Modal` with an `id="X"`, an
      `ariaLabelledby="X"` and no `titleId` is a dialog whose name resolves to itself.
    */
    const sources = readdirSync(`${ROOT}lib/components`, { recursive: true, encoding: 'utf8' })
      .filter((name) => name.endsWith('.svelte'))
      .map((name) => readFileSync(`${ROOT}lib/components/${name}`, 'utf8'));
    let total = 0;
    let named = 0;
    let selfReferential = 0;
    for (const source of sources) {
      for (const block of modalOpeningTags(source)) {
        if (!block.includes('id=')) continue;
        total += 1;
        const id = /\bid="([^"]+)"/.exec(block)?.[1];
        const labelled = /ariaLabelledby="([^"]+)"/.exec(block)?.[1];
        if (block.includes('titleId=')) named += 1;
        else if (id !== undefined && id === labelled) selfReferential += 1;
      }
    }
    /*
      22 -> 23 on 2026-09-01, and the one that arrived is a NAMED dialog: `GIF-07` gave the note
      editor's Giphy picker the modal chrome the capture opens it in, with `titleId` and
      `ariaLabelledby` both `modal-basic-title` — const 82. So the ratio moved the right way, and
      the ten self-referential ones are still ten.

      23 -> 24 on 2026-09-02, and the same again: `SCH-07` restored the reference's SECOND modal,
      `#scheduledAlertsModal`, which the pane had been rendering as an inline table. It is named —
      `titleId="scheduledAlertsModalLabel"`, which is const 4 — so `named` moves with `total` and
      the self-referential ten are untouched.

      24 -> 25 on 2026-09-02, and a THIRD named one: `SessionInfoModal.svelte`, the "Session
      Information" dialog behind "Get my token" (byte 2,255,348). `titleId="sessionInfoLabel"`
      against `id="session-info-modal"`, so the two differ and the dialog's name is its heading
      rather than itself. The self-referential ten are untouched for the third time running, which
      is the number this case is actually about.

      **This count going red is the point of it.** It is what noticed that a dialog had been added
      at all, in a file nobody would have thought to open for a scheduling change, and it is the
      reason the ratio is asserted as a triple rather than as three separate numbers. It did the
      same on 2026-09-02 for a modal mounted from `RoomOverlays` rather than from `ModalHost` —
      a placement nothing else in the suite would have flagged.
    */
    expect({ total, named, selfReferential }).toEqual({
      total: 25,
      named: 12,
      selfReferential: 10
    });
  });
});

describe('ASR-3 — the dialog takes focus when it opens, as Bootstrap did for the reference', () => {
  it('focuses on open and still releases on close, in the one attachment both belong to', () => {
    /*
      RE-DISPOSITIONED 2026-08-31. The previous version asserted `not.toContain('node.focus()')` and
      said of itself: *"the assertion that goes red the day somebody applies the one-line fix — at
      which point this row is closed and this test is what says so."* It went red. This is it saying
      so.

      Both halves are asserted, because they live in one effect and either could be lost while the
      other kept passing: taking focus on open is `ASR-3`, and releasing it on close is the older
      `inert`/`aria-hidden` fix the same docblock records.
    */
    const source = readFileSync(`${ROOT}lib/components/Modal.svelte`, 'utf8');
    expect(source).toContain('const manageFocus');
    expect(source).toContain('node.focus();');
    expect(source).toContain('if (focused instanceof HTMLElement && node.contains(focused))');

    /*
      THE ORDER, which is the part that would break silently. `inert={!open}` is bound on the same
      element and an inert element cannot be focused, so the focus call only works because Svelte
      runs `$effect` after DOM updates have been applied. Asserted as SHAPE — the focus lives inside
      the effect, not in the attachment body that runs before it.
    */
    const attachAt = source.indexOf('const manageFocus');
    expect(attachAt, 'the attachment must exist').toBeGreaterThan(-1);
    const effectAt = source.indexOf('$effect(() => {', attachAt);
    expect(effectAt, 'the attachment must own an effect').toBeGreaterThan(attachAt);
    expect(source.indexOf('node.focus();', attachAt)).toBeGreaterThan(effectAt);

    /* And the element it focuses is programmatically focusable without joining the tab order. */
    expect(source).toContain('tabindex="-1"');
  });
});
