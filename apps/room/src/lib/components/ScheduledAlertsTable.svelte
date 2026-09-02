<script lang="ts">
  import { REPEAT_BADGE_CLASS } from '#lib/scheduled-alert-table.js';
  import type { RepeatMode } from '#lib/scheduled-alert.js';
  import { shortWhen } from '#lib/short-when.js';

  /**
   * `app-scheduled-alerts-modal`'s table — the rows only, and DELIBERATELY only the rows.
   *
   * ## This is not the split `ScheduledAlerts.svelte` refuses
   *
   * That component's header argues, and still argues, that the send-later pane and the manage table
   * belong in ONE component: *"the two halves share one question — what is already scheduled — so
   * splitting them would mean two components refetching the same list and disagreeing about it after
   * a removal."* Every word of that survives, because the split drawn here is a different one. This
   * component asks nothing and owns nothing: the list arrives as a prop, the removal leaves as a
   * callback, and the fetch, the refetch and the confirmation all stay where they were. What came
   * out is the DRAWING of a row, which was never part of the question.
   *
   * It came out because SCH-03, SCH-04 and SCH-05 needed lines in a file already on its ceiling, and
   * the ratchet's standing instruction is to extract rather than raise. It passes the test that rule
   * asks of an extraction — a slice somebody would have drawn anyway — for the plainest possible
   * reason: upstream drew it. `app-scheduled-alerts-modal` is its own component in the bundle.
   */
  interface Props {
    /** What the server last said is pending, soonest first. Replaced wholesale by the parent. */
    rows: readonly {
      id: number;
      senderName: string;
      body: string;
      repeat: RepeatMode;
      ignoreWeekends: boolean;
      sendOn: number;
    }[];
    /**
     * The Remove button. The parent asks the question and calls the command — the whole row, not
     * the id, because the confirmation quotes the sender and the text.
     */
    onremove: (row: { id: number; senderName: string; body: string }) => void;
  }

  let { rows, onremove }: Props = $props();

  /** `{{ sendOn | date:'short' }}` in the reference's own table — `#lib/short-when.ts`. */
  const shortDate = (epochMs: number) => shortWhen.format(new Date(epochMs));
</script>

<!--
  ── SCH-03, SCH-04 and SCH-05 — THE ROW, DECODED CELL BY CELL ────────────────────────────────────

  ```js
  function _Me(t,n){ … d(0,"tr",9)(1,"th",12),v(2),Xe(3,"date"),u(),
    d(4,"td"),v(5),u(), d(6,"td"),v(7),u(),
    d(8,"td")(9,"span",13),v(10),u(),H(11,gMe,2,0,"span",14),u(),
    d(12,"td")(13,"button",15),x("click",…),T(14,"i",16),v(15," Remove "),u()()() }
  8  ["scope","col"]                         12 ["scope","row",1,"alert-date-time-th"]
  13 [1,"badge","rounded-pill",3,"ngClass"]  14 [1,"badge","rounded-pill","text-bg-secondary","ms-1"]
  15 [1,"btn","btn-outline-danger","btn-sm","remove-scheduled-alert-btn",3,"click"]
  16 [1,"fas","fa-trash"]
  ```
  (row template at byte 2,406,725; the consts walked out of `app-scheduled-alerts-modal`'s own table
  at bytes 2,407,945 / 2,408,063 / 2,408,102 / 2,408,141 / 2,408,195.)

  **SCH-03 — two headers were renamed and one was blank.** Upstream reads
  `Date / Time · Sender · Alert · Repeat · Actions` (byte 2,408,380). This read `Sends · By · Alert ·
  Repeat` and then an EMPTY `<th>`, which is a column a screen reader announces as nothing. `scope`
  is the reference's own on both axes and is what tells a reader which header a cell belongs to; the
  date cell is a `<th scope="row">` upstream and not a `<td>`, because the time is what identifies
  the row in a table where every other value can repeat.

  **SCH-04 — the repeat cell is a coloured pill, and the colours are the meaning.** The three class
  names, and the reason nobody had read them before, are `#lib/scheduled-alert-table.ts`. The "no
  weekends" badge beside it had an invented yellow of ours; it is `text-bg-secondary`.

  **SCH-05 — Remove had no icon and no button classes**, so the one destructive control in the table
  looked like every other button in the pane.
-->
<div class="scroll">
  <!--
    `SCH-07` — const 7 is `[1,"table","table-striped","text-white","w-100"]`, all four carried.

    They are Bootstrap globals on a table inside a SCOPED sheet, and `.table-striped` really is
    defined twice here (`app.css` and `src/lib/styles/protradingroom-source.css`), so which sheet
    supplies the striping depends on load order. Carried anyway: this component already depends on
    global Bootstrap for its `text-bg-*` badge colours, deliberately and for the reason its own
    sheet gives below. The measurement is in `room-surface-audit-2026-08-31-contract.test.ts`.
  -->
  <table class="table table-striped text-white w-100">
    <thead>
      <tr>
        <th scope="col">Date / Time</th>
        <th scope="col">Sender</th>
        <th scope="col">Alert</th>
        <th scope="col">Repeat</th>
        <th scope="col">Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as row (row.id)}
        <tr>
          <th scope="row" class="alert-date-time-th">{shortDate(row.sendOn)}</th>
          <td>{row.senderName}</td>
          <td class="body">{row.body}</td>
          <td>
            <span class="badge rounded-pill {REPEAT_BADGE_CLASS[row.repeat]}"
              >{row.repeat || 'off'}</span
            >
            <!-- The reference shows this badge only for a daily series that skips weekends. -->
            {#if row.repeat === 'daily' && row.ignoreWeekends}
              <span class="badge rounded-pill text-bg-secondary ms-1">no weekends</span>
            {/if}
          </td>
          <td>
            <button
              type="button"
              class="btn btn-outline-danger btn-sm remove-scheduled-alert-btn"
              onclick={() => onremove(row)}
            >
              <i class="fas fa-trash"></i>{' Remove '}
            </button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  /* Wide content scrolls inside its own container so the modal never scrolls sideways. */
  .scroll {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
  }
  th,
  td {
    text-align: left;
    padding: 0.2rem 0.4rem;
    border-bottom: 1px solid rgb(0 0 0 / 0.08);
  }
  .body {
    max-width: 18rem;
    overflow-wrap: anywhere;
  }
  /*
    SCH-04's pills. `badge rounded-pill` and the `text-bg-*` names are Bootstrap's and the room loads
    Bootstrap — but this sheet is SCOPED, so the size is written here rather than borrowed from
    utility classes this component does not use elsewhere either. The COLOUR comes entirely from the
    `text-bg-*` class, which is the whole point of the row.
  */
  .badge {
    padding: 0 0.4rem;
    font-size: 0.7rem;
  }
  /*
    SCH-05 — the reference ships exactly these two in `app-scheduled-alerts-modal`'s own `styles`
    array, byte 2,409,000:
    `.remove-scheduled-alert-btn{width:88px!important}.alert-date-time-th{min-width:150px!important}`
    They are what stop the button reflowing and the date wrapping as rows come and go. `!important`
    is dropped because in a scoped sheet nothing is competing with them, and `font-weight: inherit`
    is ours: a `<th>` is bold by default and this one is a timestamp, not a heading a reader scans.
  */
  .remove-scheduled-alert-btn {
    width: 88px;
  }
  .alert-date-time-th {
    min-width: 150px;
    font-weight: inherit;
  }
</style>
