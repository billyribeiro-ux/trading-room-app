<script lang="ts">
  import { downloadImage } from '#lib/download-image.js';
  import BootboxDialog from '#lib/components/BootboxDialog.svelte';
  import type { SwingAlertRow } from '#lib/types.js';
  import {
    SWING_ALERT_DEFAULT_LIMIT,
    SWING_ALERT_DEFAULT_MONTHS,
    SWING_ALERT_DELETE_CONFIRM,
    SWING_ALERT_MONTH_OPTIONS,
    SWING_TRADES_CSV_MIME,
    formatSwingAlertDate,
    limitSwingLogs,
    searchSwingLogs,
    swingAlertCancelConfirm,
    swingAlertSubmitConfirm,
    swingAlertSubmitError,
    swingAlertsTabVisible,
    swingTradesCsv,
    swingTradesCsvFilename
  } from '#lib/swing-alerts.js';
  import SwingAlertForm from './SwingAlertForm.svelte';
  import { emptySwingAlertDraft, swingAlertDraftFrom, type SwingAlertDraft } from './draft';

  /**
   * The `#swingAlerts` pane — `vwe`, decoded at bundle byte 1,938,750.
   *
   * Three gates, at three levels, and they are not the same gate:
   *
   *   1. the whole tab strip is `hidden` in viewer-only mode — the PAGE's, not this component's;
   *   2. `hasSwingTradeAlerts`, a per-room setting, decides whether this feature exists at all;
   *   3. `isPresenter` decides only whether the form and the row buttons render INSIDE it.
   *
   * A member in a room with the setting on sees the tab, the heading, the months select, the search
   * box, the limit box, the download button and the whole table — and no form and no row actions.
   */
  interface Props {
    /**
     * `sessData.hasSwingTradeAlerts`. False renders NOTHING — not a hidden pane.
     *
     * `O(48, o.hasSwingTradeAlerts ? 48 : -1)`, where `-1` is `ɵɵconditional`'s "instantiate
     * nothing". That distinction matters: `hidden` markup is still in the DOM, still readable in
     * view-source, and still tells a member the feature exists. This is an entitlement, so it emits
     * no trace at all.
     */
    readonly hasSwingTradeAlerts: boolean;
    /** `isP` — the form and the delete/edit row buttons, and nothing else. */
    readonly isPresenter: boolean;
    /**
     * `globals.swingAlertsLog`, newest first.
     *
     * Owned by the page and passed down, exactly as `NotesPane` receives `notes`: this component
     * must not hold a second copy that can disagree with the one the page refetches.
     */
    readonly alerts: readonly SwingAlertRow[];
    /** `SwingLog_${sessionID}.csv` takes this. */
    readonly sessionHandle: string;
    /** `onTradeAlertWeeksChange('Swing')` — refetch the log for a new window. */
    readonly onMonthsChange: (months: number) => void;
    readonly onCreate: (draft: SwingAlertDraft) => void | Promise<void>;
    readonly onEdit: (draft: SwingAlertDraft) => void | Promise<void>;
    readonly onDelete: (swingAlertID: number) => void | Promise<void>;
    /** Opens the room's image upload dialog and resolves to the stored URL, or null if cancelled. */
    readonly onUploadImage: () => Promise<string | null>;
    /** A pasted image: confirm, upload, resolve to the stored URL or null. */
    readonly onPasteImage: (file: File) => Promise<string | null>;
  }

  let {
    hasSwingTradeAlerts,
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
    reference's arrangement — one `this.swingAlert` on the component that owns the pane — and it is
    why the form takes it as `$bindable` instead of six change callbacks.

    Plain `$state`, deliberately, not `$state.raw`: this object is mutated field by field. The LIST
    is the one that is replaced wholesale, and it is a prop.
  */
  let draft = $state<SwingAlertDraft>(emptySwingAlertDraft());

  let search = $state('');
  /*
    `swingAlertLimit` initialises to 10, and the box is `type="number"`.

    `?? 0` is not defensive noise. An emptied number input binds `undefined` in Svelte, and
    `slice(0, undefined)` returns the WHOLE array — whereas the reference's `[(ngModel)]` binds
    `null` there and `slice(0, null)` returns none. Mapping the empty box to 0 reproduces the
    reference's behaviour through `limitSwingLogs`'s own zero branch instead of accidentally
    inverting it.
  */
  let limit = $state<number | undefined>(SWING_ALERT_DEFAULT_LIMIT);
  let months = $state(SWING_ALERT_DEFAULT_MONTHS);

  type PaneDialog =
    | { kind: 'alert'; message: string }
    | { kind: 'submit'; message: string }
    | { kind: 'cancel'; message: string }
    | { kind: 'delete'; swingAlertID: number; message: string }
    | { kind: 'preview'; url: string };

  let dialog = $state.raw<PaneDialog | null>(null);

  /*
    The two pipes, in the reference's order: search first, then limit. Reversing them would limit
    the unfiltered list and then filter what survived, which shows fewer rows than asked for.

    `$derived` and not `$effect`: this is a value computed from other values, which is exactly the
    line the Svelte documentation draws. Both pipes are `pure: !0` upstream for the same reason.
  */
  let visibleAlerts = $derived(limitSwingLogs(searchSwingLogs(alerts, search), limit ?? 0));

  /*
    `dta-01` — bumped on every Edit so the composer flashes. `#lib/flash-on-edit.ts` carries the
    byte offsets and why a counter beats a boolean here.
  */
  let flashNonce = $state(0);

  function requestEdit(row: SwingAlertRow): void {
    draft = swingAlertDraftFrom(row);
    flashNonce += 1;
  }

  function requestDelete(swingAlertID: number): void {
    dialog = { kind: 'delete', swingAlertID, message: SWING_ALERT_DELETE_CONFIRM };
  }

  /**
   * `onSwingAlertSubmit` — validate, then confirm, then send.
   *
   * The validation messages and their order are `swingAlertSubmitError`'s; the confirmation is
   * `swingAlertSubmitConfirm`'s. Both live in `#lib/swing-alerts.js` so they can be asserted without
   * rendering a pane.
   */
  function requestSubmit(): void {
    const error = swingAlertSubmitError(draft);
    if (error !== null) {
      dialog = { kind: 'alert', message: error };
      return;
    }
    dialog = { kind: 'submit', message: swingAlertSubmitConfirm(draft.edit) };
  }

  /**
   * `onSwingAlertCancel` — guarded, and silent on a pristine form.
   *
   * `swingAlertCancelConfirm` returns null when every field is empty, and the button then does
   * nothing at all: no dialog, no reset. Reproduced rather than smoothed over.
   */
  function requestCancel(): void {
    const message = swingAlertCancelConfirm(draft, draft.edit);
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
          `clearSwingAlertFields()` runs unconditionally on confirm, BEFORE the send resolves — the
          reference calls it outside the command's callback. Resetting first also means a slow
          network cannot leave a presenter typing into a form that is about to be wiped.
        */
        draft = emptySwingAlertDraft();
        await (submitted.edit ? onEdit(submitted) : onCreate(submitted));
      } else if (current.kind === 'cancel') {
        draft = emptySwingAlertDraft();
      } else if (current.kind === 'delete') {
        /*
          If the row being deleted is the one loaded in the composer, the composer has to let go of
          it — otherwise Save Changes would edit a row that no longer exists and answer 404. The
          reference cannot hit this because its delete removes the row from under an unchanged
          model; making it explicit is cheaper than the confusing 404.
        */
        if (draft.swingAlertID === current.swingAlertID) draft = emptySwingAlertDraft();
        await onDelete(current.swingAlertID);
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
   * `downloadSwingTrades()` — the CSV.
   *
   * It iterates the WHOLE log, not `visibleAlerts`: the reference reads `globals.swingAlertsLog`
   * directly rather than the piped view, so the file ignores both the search box and the limit box.
   * Handing it the filtered rows would be a quiet behaviour change in the direction of what one
   * might expect.
   */
  function downloadSwingTrades(): void {
    const blob = new Blob([swingTradesCsv(alerts)], { type: SWING_TRADES_CSV_MIME });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = swingTradesCsvFilename(sessionHandle);
    link.style.display = 'none';
    document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
</script>

<!--
  The entitlement. `{#if}` rather than `hidden`, because the reference emits `-1` — nothing at all —
  and an entitlement that ships hidden markup has told the member the feature exists.
-->
{#if swingAlertsTabVisible({ hasSwingTradeAlerts })}
  <!-- `O(1, e.isP ? 1 : -1)` — the whole form, presenter-only. The server re-checks. -->
  {#if isPresenter}
    <SwingAlertForm
      {flashNonce}
      bind:draft
      onCancel={requestCancel}
      onPasteImage={(file) => void pasteImage(file)}
      onPreviewImage={(url) => (dialog = { kind: 'preview', url })}
      onSubmit={requestSubmit}
      onUploadImage={() => void uploadImage()}
    />
  {/if}

  <div class="swing-alerts-container m-2">
    <!--
      The heading is ONE `<h4>` with the months `<select>` inline in the sentence, not a heading
      beside a control: `v(4," Latest Swing Trade Alerts (Last ")`, the select, then
      `v(8," Months) ")`. Both text nodes carry a leading and a trailing space.

      `SWP-01` — the swing half of `DTP-02`, filed as its own row rather than folded into the day
      one for the reason `dta-01` … `dta-04` all exist: every one of those was missing from BOTH
      panes, and a row that names one pane is a row that lets the pair drift. Only the two edge
      spaces need carrying; the two either side of the `<select>` survive compilation. The
      measurement and the rendered-string-versus-pixels split are argued once, on `DTP-02`.
    -->
    <h4 class="text-center m-0 p-1 px-3">
      {' '}Latest Swing Trade Alerts (Last
      <!--
        `onchange` after `bind:value`, which is safe and deliberate: Svelte updates a binding before
        it runs an event attribute on the same element, so `months` here is already the new value.
      -->
      <select
        class="form-select form-select-sm d-inline-block w-auto trade-alerts-select"
        bind:value={months}
        onchange={() => onMonthsChange(months)}
      >
        {#each SWING_ALERT_MONTH_OPTIONS as option (option)}
          <option value={option}>{option}</option>
        {/each}
      </select>
      Months){' '}
    </h4>

    <!--
      The empty-state tests the UNFILTERED log:

        O(9, …swingAlertsLog && 0 === …swingAlertsLog.length ? 9 : 10)

      so a search that matches nothing shows an empty TABLE, not this heading. Reading
      `visibleAlerts.length` here instead would swap those two states.
    -->
    {#if alerts.length === 0}
      <!-- `SWP-01` — `v(1," No Swing Trade Alerts to display. ")`, byte 1,936,289: both edges. -->
      <h4 class="text-center m-0 p-1 px-3 bg-secondary">
        {' '}No Swing Trade Alerts to display.{' '}
      </h4>
    {:else}
      <div class="d-flex align-items-center justify-content-between flex-wrap">
        <div class="d-flex align-items-center">
          <div class="input-group input-group-sm swingAlert-limit-container m-2 ms-0">
            <span class="input-group-text">Show</span>
            <input
              type="number"
              step="5"
              min="0"
              id="swingAlert-limit"
              aria-label="swingAlert-limit"
              class="form-control"
              bind:value={limit}
            />
            <span class="input-group-text">entries</span>
          </div>
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <span
            title="Download Swing Trades"
            class="m-1 ms-4 download-swing-trades-btn"
            onclick={downloadSwingTrades}
          >
            <!-- `fas fa-save` with NO `me-1` — const 204, unlike the Save Changes icon at 198. -->
            <i class="fas fa-save"></i>
          </span>
        </div>
        <input
          type="search"
          id="swingAlert-search"
          placeholder="Enter your search term"
          aria-label="swingAlert-search"
          aria-describedby="swingAlert-search"
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
                    `ct(15, GCe, i.isP)` with `GCe = t => ({"swing-symbol-container": t})` — the
                    class is applied for a presenter only. For a member the span has no class and
                    the cell centres normally, which is the correct look once the two buttons that
                    the class makes room for are absent.
                  -->
                  <span class={isPresenter ? 'swing-symbol-container' : undefined}>
                    {#if isPresenter}
                      <!--
                        `mwe` — delete, a literal `|`, then edit. The row icons are `fa` with NO
                        margin class (consts 216 and 218), a different family from the form
                        buttons' `fas … me-1`. Copy each as written.
                      -->
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <span
                        class="p-1 swing-alert-btn-delete"
                        onclick={() => requestDelete(row.id)}
                      >
                        <i class="fa fa-trash"></i>
                      </span>
                      <span class="mx-2">|</span>
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <span class="p-1 swing-alert-btn-edit" onclick={() => requestEdit(row)}>
                        <i class="fa fa-edit"></i>
                      </span>
                    {/if}
                    <!-- `SWP-01` — `Ne(" ",e.symbol," ")` in `_we`; the pads are inside the
                         `<strong>` upstream, as they are in the day pane. -->
                    <strong class="ms-2 font-weight-bold">{' '}{row.symbol}{' '}</strong>
                  </span>
                </td>
                <!--
                  `d(6,"td")` — created with NO const index, so no class, no `ngClass`, and the
                  value is a bare interpolation. The raw string `long` or `short` in the default
                  text colour. The green/red pair belongs to the form's radio labels alone.
                -->
                <td>{row.direction}</td>
                <!-- `SWP-01` — the row's other `Ne(" ",…," ")`, byte 1,937,310. -->
                <td>{' '}{formatSwingAlertDate(row.entryDate)}{' '}</td>
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
                    `row.senderPic || 'https://secure.gravatar.com/avatar/' + row.senderAvt + '?d=mm&s=30'`.
                    The 30 in `s=30` is the reference asking Gravatar for a 30px image, which is
                    where the width and height below come from — they are read off the request, not
                    invented, and they stop the row reflowing while the avatar loads.
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
      title is the empty second argument — every swing call site passes only the url, so the title
      is blank.
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
    its own `styles:[…]` block at the byte offsets named. `styles.ee2a710065b60389.css` contains
    ZERO occurrences of any of these class names — every swing rule lives in the component block.

    `#08668e` is the one literal colour on this path and it is NOT written here: it is
    `--swing-alerts-heading-bg` in `tokens.css`, which is the single place this skin's colours live.
  */

  /* byte 2,022,161 — the pane's own height. */
  :global(#swingAlerts) {
    overflow-y: auto;
    height: calc(100% - 40px);
  }

  /* byte 2,024,836 — both headings, the title and the empty state. */
  .swing-alerts-container :global(h4) {
    background-color: var(--swing-alerts-heading-bg);
    color: #fff;
  }

  /* byte 2,024,171 */
  .swing-alerts-container :global(.table) {
    font-size: 12px;
  }

  .swing-alerts-container :global(.table th),
  .swing-alerts-container :global(.table td) {
    text-align: center;
    vertical-align: middle;
  }

  /* byte 2,031,534 */
  .trade-alerts-select {
    font-size: 12px;
    vertical-align: bottom;
  }

  /* byte 2,024,939 */
  .swing-alerts-container #swingAlert-search,
  .swing-alerts-container .swingAlert-limit-container {
    width: 100%;
  }

  .swing-alerts-container #swingAlert-search {
    max-width: 300px;
  }

  .swing-alerts-container .swingAlert-limit-container {
    max-width: 180px;
  }

  /* byte 2,022,363 */
  .download-swing-trades-btn {
    font-size: 18px;
    background-color: var(--swing-alerts-heading-bg);
    padding: 3px 11px;
    color: #fff;
    border-radius: 6px;
    line-height: 24px;
  }

  /* byte 2,022,557 — the export button and both row buttons share this. */
  .download-swing-trades-btn:hover,
  .swing-alert-btn-delete:hover,
  .swing-alert-btn-edit:hover {
    opacity: 0.75;
    cursor: pointer;
  }

  /* byte 2,022,891 — presenter-only, because the class is. */
  .swing-symbol-container {
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
