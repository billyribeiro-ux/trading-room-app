<script lang="ts">
  import { downloadImage } from '#lib/download-image.js';
  import BootboxDialog from '#lib/components/BootboxDialog.svelte';
  import type { DayTradeAlertRow } from '#lib/types.js';
  import {
    DAY_TRADE_ALERT_DEFAULT_LIMIT,
    DAY_TRADE_ALERT_DEFAULT_MONTHS,
    DAY_TRADE_ALERT_DELETE_CONFIRM,
    DAY_TRADE_ALERT_MONTH_OPTIONS,
    DAY_TRADES_CSV_MIME,
    dayTradeAlertCancelConfirm,
    dayTradeAlertSubmitConfirm,
    dayTradeAlertSubmitError,
    dayTradeAlertsTabVisible,
    dayTradesCsv,
    dayTradesCsvFilename,
    formatDayTradeAlertDate,
    limitDayTradeLogs,
    searchDayTradeLogs
  } from '#lib/day-trade-alerts.js';
  import DayTradeAlertForm from './DayTradeAlertForm.svelte';
  import {
    dayTradeAlertDraftFrom,
    emptyDayTradeAlertDraft,
    type DayTradeAlertDraft
  } from './draft';

  /**
   * The `#dayTradeAlerts` pane — `Iwe`, decoded at bundle byte 1,945,126, with the list surface
   * `Rwe` at 1,943,979 and the row `Pwe` at 1,943,242. All three read end to end in this session.
   *
   * Three gates, at three levels, and they are not the same gate:
   *
   *   1. the whole tab strip is `hidden` in viewer-only mode — the PAGE's, not this component's;
   *   2. `hasDayTradeAlerts`, a per-room setting, decides whether this feature exists at all;
   *   3. `isPresenter` decides only whether the form and the row buttons render INSIDE it.
   *
   * A member in a room with the setting on sees the tab, the heading, the months select, the search
   * box, the limit box, the download button and the whole table — and no form and no row actions.
   */
  interface Props {
    /**
     * `sessData.hasDayTradeAlerts`. False renders NOTHING — not a hidden pane.
     *
     * `O(49, o.hasDayTradeAlerts ? 49 : -1)` at byte 2,017,741, where `-1` is `ɵɵconditional`'s
     * "instantiate nothing". That distinction matters: `hidden` markup is still in the DOM, still
     * readable in view-source, and still tells a member the feature exists. This is an entitlement,
     * so it emits no trace at all.
     */
    readonly hasDayTradeAlerts: boolean;
    /** `isP` — the form and the delete/edit row buttons, and nothing else. */
    readonly isPresenter: boolean;
    /**
     * `globals.dayTradeAlertsLog`, newest first.
     *
     * Owned by the page and passed down, exactly as `SwingAlertsPane` receives `alerts`: this
     * component must not hold a second copy that can disagree with the one the page refetches.
     */
    readonly alerts: readonly DayTradeAlertRow[];
    /** `DayTradeLog_${sessionID}.csv` takes this. */
    readonly sessionHandle: string;
    /** `onTradeAlertWeeksChange('DayTrade')` — refetch the log for a new window. */
    readonly onMonthsChange: (months: number) => void;
    readonly onCreate: (draft: DayTradeAlertDraft) => void | Promise<void>;
    readonly onEdit: (draft: DayTradeAlertDraft) => void | Promise<void>;
    readonly onDelete: (dayTradeAlertID: number) => void | Promise<void>;
    /** Opens the room's image upload dialog and resolves to the stored URL, or null if cancelled. */
    readonly onUploadImage: () => Promise<string | null>;
    /** A pasted image: confirm, upload, resolve to the stored URL or null. */
    readonly onPasteImage: (file: File) => Promise<string | null>;
  }

  let {
    hasDayTradeAlerts,
    isPresenter,
    alerts,
    sessionHandle,
    onMonthsChange,
    onCreate,
    onEdit,
    onDelete,
    onUploadImage,
    onPasteImage
  }: Props = $props();

  /*
    The composer's model lives here rather than in the form, because BOTH children write it: the
    form on every keystroke, and a row's Edit button when it fills it from a log row. That is the
    reference's arrangement — one `this.dayTradeAlert` on the component that owns the pane — and it
    is why the form takes it as `$bindable` instead of six change callbacks.

    Plain `$state`, deliberately, not `$state.raw`: this object is mutated field by field. The LIST
    is the one that is replaced wholesale, and it is a prop.
  */
  let draft = $state<DayTradeAlertDraft>(emptyDayTradeAlertDraft());

  let search = $state('');
  /*
    `dayTradeAlertLimit` initialises to 10 (byte 1,955,546), and the box is `type="number"`.

    `?? 0` is not defensive noise. An emptied number input binds `undefined` in Svelte, and
    `slice(0, undefined)` returns the WHOLE array — whereas the reference's `[(ngModel)]` binds
    `null` there and `slice(0, null)` returns none. Mapping the empty box to 0 reproduces the
    reference's behaviour through `limitDayTradeLogs`'s own zero branch instead of accidentally
    inverting it.
  */
  let limit = $state<number | undefined>(DAY_TRADE_ALERT_DEFAULT_LIMIT);
  /*
    ONE, not two. `this.dayTradeAlertMonths = 1` at byte 1,955,601, where the swing twin is 2 at
    1,955,344 — the two initialisers sit 257 bytes apart in the same constructor and were read
    together. With the page's first fetch hardcoded at 21 days, the opening list is 21 days of data
    under a label reading "Last 1 Months"; changing the select once asks for 28 and reconciles them.
  */
  let months = $state(DAY_TRADE_ALERT_DEFAULT_MONTHS);

  type PaneDialog =
    | { kind: 'alert'; message: string }
    | { kind: 'submit'; message: string }
    | { kind: 'cancel'; message: string }
    | { kind: 'delete'; dayTradeAlertID: number; message: string }
    | { kind: 'preview'; url: string };

  let dialog = $state.raw<PaneDialog | null>(null);

  /*
    The two pipes, in the reference's order: search first, then limit. Read off the update block at
    byte 1,945,024 as `Ct(35,5,Ct(34,2,…dayTradeAlertsLog, dayTradeAlertSearch), dayTradeAlertLimit)`
    — the inner call is the search. Reversing them would limit the unfiltered list and then filter
    what survived, which shows fewer rows than asked for.

    `$derived` and not `$effect`: this is a value computed from other values, which is exactly the
    line the Svelte documentation draws. Both pipes are `pure: !0` upstream for the same reason.
  */
  let visibleAlerts = $derived(limitDayTradeLogs(searchDayTradeLogs(alerts, search), limit ?? 0));

  /*
    `dta-01` — bumped on every Edit so the composer flashes. `#lib/flash-on-edit.ts` carries the
    byte offsets and why a counter beats a boolean here.
  */
  let flashNonce = $state(0);

  function requestEdit(row: DayTradeAlertRow): void {
    draft = dayTradeAlertDraftFrom(row);
    flashNonce += 1;
  }

  function requestDelete(dayTradeAlertID: number): void {
    dialog = { kind: 'delete', dayTradeAlertID, message: DAY_TRADE_ALERT_DELETE_CONFIRM };
  }

  /**
   * `onDayTradeAlertSubmit` — validate, then confirm, then send.
   *
   * The validation messages and their order are `dayTradeAlertSubmitError`'s; the confirmation is
   * `dayTradeAlertSubmitConfirm`'s. Both live in `#lib/day-trade-alerts.js` so they can be asserted
   * without rendering a pane.
   */
  function requestSubmit(): void {
    const error = dayTradeAlertSubmitError(draft);
    if (error !== null) {
      dialog = { kind: 'alert', message: error };
      return;
    }
    dialog = { kind: 'submit', message: dayTradeAlertSubmitConfirm(draft.edit) };
  }

  /**
   * `onDayTradeAlertCancel` — guarded, and silent on a pristine form.
   *
   * `dayTradeAlertCancelConfirm` returns null when every field is empty, and the button then does
   * nothing at all: no dialog, no reset. Reproduced rather than smoothed over.
   */
  function requestCancel(): void {
    const message = dayTradeAlertCancelConfirm(draft, draft.edit);
    if (message === null) return;
    dialog = { kind: 'cancel', message };
  }

  async function acceptDialog(): Promise<void> {
    const current = dialog;
    if (current === null) return;
    dialog = null;

    try {
      if (current.kind === 'submit') {
        const submitted = draft;
        /*
          `clearDayTradeAlertFields()` runs unconditionally on confirm, BEFORE the send resolves —
          the reference calls it outside the command's callback (byte 1,987,661). Resetting first
          also means a slow network cannot leave a presenter typing into a form that is about to be
          wiped.
        */
        draft = emptyDayTradeAlertDraft();
        await (submitted.edit ? onEdit(submitted) : onCreate(submitted));
      } else if (current.kind === 'cancel') {
        draft = emptyDayTradeAlertDraft();
      } else if (current.kind === 'delete') {
        /*
          If the row being deleted is the one loaded in the composer, the composer has to let go of
          it — otherwise Save Changes would edit a row that no longer exists and answer 404. The
          reference cannot hit this because its delete removes the row from under an unchanged
          model; making it explicit is cheaper than the confusing 404.
        */
        if (draft.dayTradeAlertID === current.dayTradeAlertID) draft = emptyDayTradeAlertDraft();
        await onDelete(current.dayTradeAlertID);
      }
    } catch (error: unknown) {
      // Surfaced, not swallowed. A refusal here means the room, the session or the row is wrong.
      dialog = {
        kind: 'alert',
        message: error instanceof Error ? error.message : 'Unable to update this alert.'
      };
    }
  }

  async function uploadImage(): Promise<void> {
    const url = await onUploadImage();
    if (url) draft.image = url;
  }

  async function pasteImage(file: File): Promise<void> {
    const url = await onPasteImage(file);
    if (url) draft.image = url;
  }

  /**
   * `downloadDayTrades()` — the CSV, byte 1,989,236.
   *
   * It iterates the WHOLE log, not `visibleAlerts`: the reference reads
   * `globals.dayTradeAlertsLog` directly rather than the piped view, so the file ignores both the
   * search box and the limit box. Handing it the filtered rows would be a quiet behaviour change in
   * the direction of what one might expect.
   *
   * The object URL is revoked here. The reference creates one per click and never revokes it (the
   * statement after `r.click()` is `document.body.removeChild(r)` and nothing else), which pins the
   * whole file in memory for the life of the tab — a leak, not a behaviour, so it is not
   * reproduced.
   */
  function downloadDayTrades(): void {
    const blob = new Blob([dayTradesCsv(alerts)], { type: DAY_TRADES_CSV_MIME });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = dayTradesCsvFilename(sessionHandle);
    link.style.display = 'none';
    document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
</script>

<!--
  The entitlement. A conditional block rather than a `hidden` attribute, because the reference
  emits `-1` — nothing at all — and an entitlement that ships hidden markup has told the member the
  feature exists.
-->
{#if dayTradeAlertsTabVisible({ hasDayTradeAlerts })}
  <!-- `O(1, e.isP ? 1 : -1)` — the whole form, presenter-only. The server re-checks. -->
  {#if isPresenter}
    <DayTradeAlertForm
      {flashNonce}
      bind:draft
      onCancel={requestCancel}
      onPasteImage={(file) => void pasteImage(file)}
      onPreviewImage={(url) => (dialog = { kind: 'preview', url })}
      onSubmit={requestSubmit}
      onUploadImage={() => void uploadImage()}
    />
  {/if}

  <div class="day-trade-alerts-container m-2">
    <!--
      The heading is ONE `<h4>` with the months `<select>` inline in the sentence, not a heading
      beside a control: `v(4," Latest Day Trade Alerts (Last ")` at byte 1,945,231, the select, then
      `v(8," Months) ")`. Both text nodes carry a leading and a trailing space.

      Note the wording: "Latest Day Trade Alerts", where the TAB says the shorter "Day Trades". The
      two strings are different and both are verbatim.
    -->
    <h4 class="text-center m-0 p-1 px-3">
      Latest Day Trade Alerts (Last
      <!--
        `onchange` after `bind:value`, which is safe and deliberate: Svelte updates a binding before
        it runs an event attribute on the same element, so `months` here is already the new value.
      -->
      <select
        class="form-select form-select-sm d-inline-block w-auto trade-alerts-select"
        bind:value={months}
        onchange={() => onMonthsChange(months)}
      >
        <!-- `WCe = () => [1..15]`, byte 1,916,648. FIFTEEN — the swing twin `zCe` runs to 20. -->
        {#each DAY_TRADE_ALERT_MONTH_OPTIONS as option (option)}
          <option value={option}>{option}</option>
        {/each}
      </select>
      Months)
    </h4>

    <!--
      The empty-state tests the UNFILTERED log:

        O(9, …dayTradeAlertsLog && 0 === …dayTradeAlertsLog.length ? 9 : 10)

      so a search that matches nothing shows an empty TABLE, not this heading. Reading
      `visibleAlerts.length` here instead would swap those two states.
    -->
    {#if alerts.length === 0}
      <h4 class="text-center m-0 p-1 px-3 bg-secondary">No Day Trade Alerts to display.</h4>
    {:else}
      <div class="d-flex align-items-center justify-content-between flex-wrap">
        <div class="d-flex align-items-center">
          <div class="input-group input-group-sm dayTradeAlert-limit-container m-2 ms-0">
            <span class="input-group-text">Show</span>
            <input
              type="number"
              step="5"
              min="0"
              id="dayTradeAlert-limit"
              aria-label="dayTradeAlert-limit"
              class="form-control"
              bind:value={limit}
            />
            <span class="input-group-text">entries</span>
          </div>
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <span
            title="Download Day Trades"
            class="m-1 ms-4 download-day-trades-btn"
            onclick={downloadDayTrades}
          >
            <!-- `fas fa-save` with NO `me-1` — const 204, unlike the Save Changes icon at 198. -->
            <i class="fas fa-save"></i>
          </span>
        </div>
        <input
          type="search"
          id="dayTradeAlert-search"
          placeholder="Enter your search term"
          aria-label="dayTradeAlert-search"
          aria-describedby="dayTradeAlert-search"
          class="form-control form-control-sm m-2 me-0"
          bind:value={search}
        />
      </div>
      <div class="table-responsive">
        <table class="table table-striped">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Long/Short</th>
              <th>Alert Date</th>
              <th>Entry Price</th>
              <th>Stop</th>
              <th>Target</th>
              <th>Image</th>
              <th>Sender</th>
            </tr>
          </thead>
          <tbody>
            {#each visibleAlerts as row (row.id)}
              <tr>
                <td>
                  <!--
                    `ct(15, qCe, i.isP)` with `qCe = t => ({"day-trade-symbol-container": t})` at
                    byte 1,916,694 — the class is applied for a presenter only. For a member the
                    span has no class and the cell centres normally, which is the correct look once
                    the two buttons that the class makes room for are absent.
                  -->
                  <span class={isPresenter ? 'day-trade-symbol-container' : undefined}>
                    {#if isPresenter}
                      <!--
                        `Mwe` — delete, a literal `|`, then edit. The row icons are `fa` with NO
                        margin class (consts 216 and 218), a different family from the form
                        buttons' `fas … me-1`. Copy each as written.
                      -->
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <span
                        class="p-1 day-trade-alert-btn-delete"
                        onclick={() => requestDelete(row.id)}
                      >
                        <i class="fa fa-trash"></i>
                      </span>
                      <span class="mx-2">|</span>
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <span class="p-1 day-trade-alert-btn-edit" onclick={() => requestEdit(row)}>
                        <i class="fa fa-edit"></i>
                      </span>
                    {/if}
                    <strong class="ms-2 font-weight-bold">{row.symbol}</strong>
                  </span>
                </td>
                <!--
                  `d(6,"td")` — created with NO const index, so no class, no `ngClass`, and the
                  value is a bare interpolation. The raw string `long` or `short` in the default
                  text colour. The green/red pair belongs to the form's radio labels alone.
                -->
                <td>{row.direction}</td>
                <td>{formatDayTradeAlertDate(row.entryDate)}</td>
                <!-- No pipe, no `toFixed`, no currency: the strings the text inputs produced. -->
                <td>{row.entryPrice}</td>
                <td>{row.stop}</td>
                <td>{row.target}</td>
                <td class="text-center align-middle p-0 m-0">
                  {#if row.image}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <img
                      title="Click to view image"
                      class="uploaded-alert-image"
                      src={row.image}
                      alt={row.image}
                      onclick={() => (dialog = { kind: 'preview', url: row.image })}
                    />
                  {/if}
                </td>
                <td class="p-0">
                  <strong class="mx-1 font-weight-bold">{row.senderName}</strong>
                  <!--
                    `e.senderPic || "https://secure.gravatar.com/avatar/" + e.senderAvt + "?d=mm&s=30"`,
                    byte 1,943,900. The 30 in `s=30` is the reference asking Gravatar for a 30px
                    image, which is where the width and height below come from — they are read off
                    the request, not invented, and they stop the row reflowing while the avatar
                    loads.
                  -->
                  <img
                    class="alert-sender-img"
                    src={row.senderPic ||
                      `https://secure.gravatar.com/avatar/${row.senderAvt}?d=mm&s=30`}
                    alt={row.senderName}
                    width="30"
                    height="30"
                  />
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  {#if dialog?.kind === 'alert'}
    <BootboxDialog mode="alert" message={dialog.message} onclose={() => (dialog = null)} />
  {:else if dialog?.kind === 'preview'}
    <!--
      `showImagePreview(e, i = "")` opens a bootbox whose message is
      `<div class="text-center"><img src="${e}" class="img-fluid" alt="${e}" /></div>` and whose
      title is the empty second argument — every day trade call site passes only the url, so the
      title is blank.
    -->
    {const previewUrl = $derived(dialog.url)}
    <!--
      `dta-02` and `dta-03` — `size:"large"` and the ONE button this dialog has.

      ```js
      bootbox.dialog({ title: i, message: `…<img src="${e}" class="img-fluid" …/>…`,
        size: "large",
        buttons: { download: { label: '<i class="fa fa-download"></i> Download Image',
                               className: "btn-primary btn-sm m-auto", callback: … } } })
                                                                    // bundle byte 1,992,730
      ```

      `buttons:` REPLACES bootbox's default OK, so Download Image is the only control — the header's
      close button is how the dialog is dismissed without saving, upstream and here. The `footer`
      snippet is what lets `BootboxDialog` express that; passing it suppresses the default OK.

      Saving closes it too. That is the reference's shape (its callback returns undefined, which
      bootbox reads as "close"), and it is the right one: the presenter opened the picture to get a
      copy of it, and a dialog still sitting there afterwards is one more click for nothing.
    -->
    <BootboxDialog mode="alert" message="" className="modal-lg" onclose={() => (dialog = null)}>
      <div class="text-center">
        <img src={previewUrl} class="img-fluid" alt={previewUrl} />
      </div>
      {#snippet footer()}
        <button
          type="button"
          class="btn btn-primary btn-sm m-auto"
          onclick={() => {
            downloadImage(previewUrl);
            dialog = null;
          }}
        >
          <i class="fa fa-download"></i> Download Image
        </button>
      {/snippet}
    </BootboxDialog>
  {:else if dialog !== null}
    <BootboxDialog
      mode="confirm"
      message={dialog.message}
      onclose={() => (dialog = null)}
      onconfirm={() => void acceptDialog()}
    />
  {/if}
{/if}

<style>
  /*
    The component-scoped rules of `app-presentationarea` that belong to the pane, transcribed from
    its own `styles:[…]` block at the byte offsets named, with `[_ngcontent-%COMP%]` stripped.
    `styles.ee2a710065b60389.css` contains ZERO occurrences of any of these class names — every day
    trade rule lives in the component block.

    Each rule below names the day-trade selector AND its swing twin in ONE declaration block
    upstream, with one exception called out where it occurs.

    `#08668e` is the one literal colour on this path and it is NOT written here: it is
    `--day-trade-alerts-heading-bg` in `tokens.css`, which aliases the swing token because the
    bundle applies one colour to both through a single rule.
  */

  /* byte 2,022,161 — `#dayTradeAlerts, #swingAlerts`; the pane's own height. */
  :global(#dayTradeAlerts) {
    overflow-y: auto;
    height: calc(100% - 40px);
  }

  /* byte 2,024,764 — both headings, the title and the empty state. */
  .day-trade-alerts-container :global(h4) {
    background-color: var(--day-trade-alerts-heading-bg);
    color: #fff;
  }

  /* byte 2,024,171 */
  .day-trade-alerts-container :global(.table) {
    font-size: 12px;
  }

  /* byte 2,024,333 */
  .day-trade-alerts-container :global(.table th),
  .day-trade-alerts-container :global(.table td) {
    text-align: center;
    vertical-align: middle;
  }

  /* byte 2,031,534 — shared with the swing select, same class, one rule. */
  .trade-alerts-select {
    font-size: 12px;
    vertical-align: bottom;
  }

  /*
    byte 2,024,939 — THE ONE ASYMMETRY, and it is reproduced rather than tidied.

    That rule lists exactly six selectors: `#dayTradeAlert-search`, `#swingAlert-search` and
    `.swingAlert-limit-container`, each under both container classes. `.dayTradeAlert-limit-container`
    is in NEITHER — it appears in the `max-width: 180px` rule 915 bytes later and nowhere else.

    So in the shipped build the Day Trade limit box gets a max width and no `width: 100%`, while the
    Swing one gets both. Read by opening the whole rule text at 2,024,939–2,025,489 rather than by
    pattern-matching for the class, precisely because a search for a class name cannot see a class
    that is absent. Adding the missing declaration here would make this pane WIDER than the one the
    reference ships.
  */
  .day-trade-alerts-container #dayTradeAlert-search {
    width: 100%;
  }

  /* byte 2,025,489 */
  .day-trade-alerts-container #dayTradeAlert-search {
    max-width: 300px;
  }

  /* byte 2,025,854 — and here the day trade selector IS present. */
  .day-trade-alerts-container .dayTradeAlert-limit-container {
    max-width: 180px;
  }

  /* byte 2,022,363 */
  .download-day-trades-btn {
    font-size: 18px;
    background-color: var(--day-trade-alerts-heading-bg);
    padding: 3px 11px;
    color: #fff;
    border-radius: 6px;
    line-height: 24px;
  }

  /* byte 2,022,557 — the export button and both row buttons share this. */
  .download-day-trades-btn:hover,
  .day-trade-alert-btn-delete:hover,
  .day-trade-alert-btn-edit:hover {
    opacity: 0.75;
    cursor: pointer;
  }

  /* byte 2,022,891 — presenter-only, because the class is. */
  .day-trade-symbol-container {
    width: 100%;
    max-width: 150px;
    text-align: left;
    display: block;
    margin: 0 auto 0 24%;
  }

  /* byte 2,026,319 — shared with the form's preview. */
  .alert-sender-img,
  .uploaded-alert-image {
    width: auto;
    height: 100%;
    max-height: 30px;
    object-fit: contain;
  }

  /* byte 2,026,556 */
  .uploaded-alert-image:hover {
    cursor: pointer;
  }

  /* byte 2,026,976 — the lightbox image. */
  .img-fluid {
    max-width: 100%;
    max-height: 70vh;
    display: block;
    margin: 0 auto;
  }
</style>
