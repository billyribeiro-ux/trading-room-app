<script lang="ts">
  import { pastedImageFrom } from '#lib/pasted-image.js';
  import { SvelteSet } from 'svelte/reactivity';
  import { alertLabelPrefix, type AlertLabel } from '#lib/alert-labels.js';
  import { onDestroy } from 'svelte';
  import type { AlertTab } from '#lib/types.js';
  import {
    composePostAlert,
    POST_ALERT_LEGAL_DISCLOSURE,
    type PastedImageSubmission,
    type PostAlertSubmission
  } from '#lib/post-alert-behavior.js';
  import BootboxDialog from './BootboxDialog.svelte';
  import Modal from './Modal.svelte';
  import ScheduledAlerts from './ScheduledAlerts.svelte';

  interface Props {
    open: boolean;
    tab: AlertTab;
    onclose: () => void;
    ontab: (tab: AlertTab) => void;
    onalert: (message: string) => void;
    /** PAM-11 — passed straight through to the scheduler pane, which asks before it schedules. */
    onconfirm: (message: string, accept: () => void) => void;
    onpost: (submission: PostAlertSubmission) => Promise<boolean>;
    onpastepost: (submission: PastedImageSubmission) => Promise<boolean>;
    /**
     * "Sticky non-trade alert?" — whether the Non-Trade checkbox starts ticked, on every open.
     *
     * `this.nonTradeAlert = sessData.styckyNonTradeAlert || !1` inside `doAlertsModal`, byte
     * 2,124,407. It defaults `false` rather than being required, because `ModalHost` is rendered by
     * tests that predate this prop and a composer that starts un-ticked is the state every one of
     * them was written against.
     */
    stickyNonTradeAlert?: boolean;
    /**
     * `sessData.hasAlertScheduler` — whether this room may schedule alerts for later.
     *
     * A prop rather than a read here, for the reason every other room setting reaches this component
     * as one: the page owns `data.sessData` and resolves it once, so a component cannot read a
     * setting and decide for itself. Defaults `false`, which is the fail-closed direction.
     */
    schedulerAvailable?: boolean;
    /**
     * The room's configured Alert Labels — the picker, byte 2,119,145.
     *
     * `O(62, globals.alertLabels && globals.alertLabels.length > 0 ? 62 : -1)` is the whole gate: a
     * room with no labels draws nothing, which is why this defaults to an empty list rather than
     * being required.
     *
     * Parsed by the page (`gates.alertLabels`) rather than here, for the reason every other room
     * setting reaches this component already resolved — and because `parseAlertLabels` runs
     * `JSON.parse`, which a component that re-ran it per open would run per open.
     */
    alertLabels?: readonly AlertLabel[];
  }

  let {
    open,
    tab,
    onclose,
    ontab,
    onalert,
    onconfirm,
    onpost,
    onpastepost,
    stickyNonTradeAlert = false,
    schedulerAvailable = false,
    alertLabels = []
  }: Props = $props();

  let alertText = $state('');
  let alertUrl = $state('');
  let linkAlertText = $state('');
  let imageAlertText = $state('');
  let files = $state.raw<File[]>([]);
  let previews = $state.raw<string[]>([]);
  let dragging = $state(false);
  let fileInput = $state<HTMLInputElement>();
  /**
   * PAM-05 — `this.showSendLater = !1` (byte 2,123,544), and it gates five nodes.
   *
   * A plain `$state`, and deliberately NOT a preference: it is which half of one decision the
   * presenter is currently making, and it resets with the modal. See the markup for the five gates.
   */
  let showSendLater = $state(false);

  let keepOpen = $state(false);
  let postOnX = $state(false);
  let dontPush = $state(false);
  /* `false` here and seeded in `beginOpenState`, which the `$effect` below runs on every transition
     to open — including the first. Seeding the declaration too would capture the prop's initial
     value, which is what `state_referenced_locally` warns about, and would buy nothing: the modal
     is never read before it opens. */
  /*
    ── THE LABEL PICKER'S SELECTION ────────────────────────────────────────────────────────────────

    The reference stamps `checked = false` onto every entry of `globals.alertLabels` when it parses
    the setting, and `processAlertLabels` flips them all back to false after a send. That makes the
    room's shared label table hold this composer's UI state, which is why `alert-labels.ts` carries
    the field and a note saying it is not a render input.

    Here the selection stays in the composer that owns it: a `Set` of hashes, so nothing reaches into
    the parsed table and a second consumer of `alertLabels` cannot be affected by what is ticked in
    this modal. Same observable behaviour, one fewer shared mutable.

    `SvelteSet` and not a plain `Set`: it is read in the template per checkbox and written by each
    one, so it has to be reactive. It is an ORDINARY class — `rune-module-extension-contract` records
    that using it is not what makes a module `.svelte.ts`.
  */
  const checkedLabels = new SvelteSet<string>();
  /*
    The prefix, built from the labels in the ROOM's order rather than in click order. Upstream's
    `filter(s => s.checked)` preserves the table's order and a `Set` preserves insertion order, so
    filtering the table is what reproduces it — ticking B then A must still send ` #A #B\n`.
  */
  const labelPrefix = $derived(
    alertLabelPrefix(alertLabels.filter((label) => checkedLabels.has(label.hash)))
  );
  let nonTradeAlert = $state(false);
  let legalDisclosure = $state(false);
  let legalDisclosureText = $state(POST_ALERT_LEGAL_DISCLOSURE);
  let posting = $state(false);
  let wasOpen = false;
  let pastedImage = $state<{ file: File; preview: string } | null>(null);

  function releasePreviews() {
    for (const preview of previews) URL.revokeObjectURL(preview);
    previews = [];
  }

  function clearInputFields() {
    /*
      `processAlertLabels` unchecks every label after a send, and `doCloseModal` and
      `clearInputFields` upstream do the same — so a label ticked for one alert is never carried into
      the next. Clearing here covers all three, because `beginOpenState` calls this on every open and
      both send paths call it when Keep Open is on.
    */
    checkedLabels.clear();
    releasePreviews();
    files = [];
    alertText = '';
    alertUrl = '';
    imageAlertText = '';
    linkAlertText = '';
    if (fileInput) fileInput.value = '';
  }

  /*
    Every open, not once at construction — which is what "sticky" means.

    `doAlertsModal` sets `this.nonTradeAlert = sessData.styckyNonTradeAlert || !1` beside its other
    per-open resets (byte 2,124,407), so a presenter who unticks the box for one alert gets it back
    on the next. Seeding only the initial `$state` would make it sticky for the first alert of a
    session and never again.
  */
  function beginOpenState() {
    clearInputFields();
    postOnX = false;
    nonTradeAlert = stickyNonTradeAlert;
  }

  function selectTab(next: AlertTab, event: MouseEvent) {
    event.preventDefault();
    ontab(next);
  }

  function setFiles(fileList: FileList | null) {
    if (!fileList) return;
    releasePreviews();
    files = Array.from(fileList);
    previews = files.map((file) => URL.createObjectURL(file));
  }

  function handleDrag(event: DragEvent) {
    event.stopPropagation();
    event.preventDefault();
    dragging = event.type === 'dragover';
  }

  function handleDrop(event: DragEvent) {
    handleDrag(event);
    setFiles(event.dataTransfer?.files ?? null);
  }

  function captureFileInput(node: HTMLInputElement) {
    fileInput = node;
    node.setAttribute('multiple', 'true');

    return () => {
      if (fileInput === node) fileInput = undefined;
    };
  }

  function selectPastedImage(event: ClipboardEvent) {
    /*
      THIS LOOP HAD DRIFTED, and the drift was invisible: it returned on the FIRST image where the
      reference keeps assigning and takes the LAST (byte 1,445,719), and `if (!file) return`
      abandoned the whole paste on one item the platform could not materialise. Both are fixed by
      the rule living in one place — `#lib/pasted-image.ts` carries the transcription.
    */
    const file = pastedImageFrom(event.clipboardData?.items);
    if (!file) return;
    const preview = URL.createObjectURL(file);
    if (pastedImage) URL.revokeObjectURL(pastedImage.preview);
    pastedImage = { file, preview };
  }

  function closePastedImageConfirm() {
    if (pastedImage) URL.revokeObjectURL(pastedImage.preview);
    pastedImage = null;
  }

  async function confirmPastedImage() {
    if (!pastedImage || posting) return;
    const file = pastedImage.file;
    posting = true;
    closePastedImageConfirm();
    if (!keepOpen) onclose();

    const success = await onpastepost({
      file,
      alertText,
      keepOpen,
      postOnX,
      dontPush,
      nonTradeAlert,
      legalDisclosure,
      legalDisclosureText,
      labelPrefix
    });

    posting = false;
    if (success && keepOpen) clearInputFields();
  }

  async function postAlert() {
    if (posting) return;

    const composition = composePostAlert({
      tab,
      alertText,
      alertUrl,
      linkAlertText,
      imageAlertText,
      legalDisclosure,
      legalDisclosureText,
      fileCount: files.length,
      labelPrefix
    });

    if (composition.status === 'noop') return;
    if (composition.status === 'error') {
      onalert(composition.message);
      return;
    }

    posting = true;
    if (composition.status === 'upload' && !keepOpen) onclose();
    const success = await onpost({
      composition,
      files,
      keepOpen,
      postOnX,
      dontPush,
      nonTradeAlert,
      legalDisclosure,
      legalDisclosureText,
      labelPrefix
    });
    posting = false;

    if (!success) return;
    if (keepOpen) clearInputFields();
    else if (composition.status === 'post') onclose();
  }

  $effect(() => {
    if (open && !wasOpen) beginOpenState();
    wasOpen = open;
  });

  onDestroy(() => {
    releasePreviews();
    if (pastedImage) URL.revokeObjectURL(pastedImage.preview);
  });
</script>

<Modal
  id="alert-modal"
  {open}
  ariaLabelledby="post-alert"
  rootAttributes={open ? { 'aria-modal': 'true', style: 'display: block;' } : {}}
  title="Post Alert"
  titleId="post-alert"
  titleClass="modal-title"
  {onclose}
>
  <nav>
    <div id="nav-tab" role="tablist" class="nav nav-tabs">
      <a
        id="nav-tab-text"
        data-bs-toggle="tab"
        href="#nav-text"
        role="tab"
        aria-controls="nav-text"
        aria-selected={tab === 'text'}
        tabindex={tab === 'text' ? undefined : -1}
        class={tab === 'text' ? 'nav-item nav-link active' : 'nav-item nav-link'}
        onclick={(event) => selectTab('text', event)}
      >
        Text Alert
      </a>
      <a
        id="nav-tab-url"
        data-bs-toggle="tab"
        href="#nav-url"
        role="tab"
        aria-controls="nav-url"
        aria-selected={tab === 'url'}
        tabindex={tab === 'url' ? undefined : -1}
        class={tab === 'url' ? 'nav-item nav-link active' : 'nav-item nav-link'}
        onclick={(event) => selectTab('url', event)}
      >
        Text Url
      </a>
      <a
        id="nav-tab-img"
        data-bs-toggle="tab"
        href="#nav-img"
        role="tab"
        aria-controls="nav-img"
        aria-selected={tab === 'media'}
        tabindex={tab === 'media' ? undefined : -1}
        class={tab === 'media' ? 'nav-item nav-link active' : 'nav-item nav-link'}
        onclick={(event) => selectTab('media', event)}
      >
        Image / GIF / Video
      </a>
    </div>
  </nav>

  <div id="nav-tabContent" class="tab-content">
    <div
      id="nav-text"
      role="tabpanel"
      aria-labelledby="nav-tab-text"
      class={tab === 'text' ? 'tab-pane fade show active' : 'tab-pane fade'}
    >
      <div class="form-group mb-3 mt-3">
        <textarea
          id="alert-text-body"
          name="alertTextBody"
          rows="10"
          placeholder="Alert Text..."
          aria-label="Alert Text..."
          class="form-control"
          bind:value={alertText}
          onpaste={selectPastedImage}></textarea>
      </div>
    </div>

    <div
      id="nav-url"
      role="tabpanel"
      aria-labelledby="nav-tab-url"
      class={tab === 'url' ? 'tab-pane fade active show' : 'tab-pane fade'}
    >
      <div class="input-group mb-3 mt-3">
        <div class="input-group-prepend">
          <span id="addon-url" class="input-group-text pl-2 pr-2">
            <i class="fas fa-link"></i>
          </span>
        </div>
        <input
          id="alert-url"
          name="alertUrl"
          type="url"
          placeholder="Link / URL to send to users"
          aria-label="Link / URL to send to users"
          aria-describedby="addon-url"
          class="form-control"
          bind:value={alertUrl}
        />
      </div>
      <div class="form-group">
        <textarea
          id="alert-url-text"
          name="alertUrlText"
          rows="2"
          placeholder="Alert Text..."
          aria-label="Alert Text..."
          class="form-control"
          bind:value={linkAlertText}></textarea>
      </div>
    </div>

    <div
      id="nav-img"
      role="tabpanel"
      aria-labelledby="nav-tab-img"
      class={tab === 'media' ? 'tab-pane fade active show' : 'tab-pane fade'}
    >
      <div class="input-group mb-3 mt-3">
        <div class="input-group-prepend">
          <span id="addon-img" class="input-group-text pl-2 pr-2 text-light">
            <i class="fas fa-link"></i>
          </span>
        </div>
        <input
          id="alert-media-url"
          name="alertMediaUrl"
          type="url"
          placeholder="Image or Video Link to show"
          aria-label="Image or Video Link to show"
          aria-describedby="addon-img"
          class="form-control"
          bind:value={alertUrl}
        />
      </div>
      <div>
        OR...
        <label for="fuploadAlert" class="upload-area" style="width: 100%; text-align: center;">
          <input
            id="fuploadAlert"
            name="fuploadAlert"
            type="file"
            multiple
            accept="image/*"
            style="display: none;"
            {@attach captureFileInput}
            onchange={(event) => setFiles(event.currentTarget.files)}
          />
          <i class="fas fa-file-upload fa-2x"></i>
          <br />
          Click to select images to upload
        </label>
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          id="filedragAlert"
          class={['filedragMD', { hover: dragging }]}
          style:display={files.length > 0 ? 'none' : 'block'}
          ondragover={handleDrag}
          ondragleave={handleDrag}
          ondrop={handleDrop}
        >
          or drop an image here
        </div>
        <br />
        <div
          id="fileListAlert"
          class="fileList text-center"
          style="margin-left: 5px !important;"
          style:display={files.length > 0 ? 'block' : 'none'}
        >
          {#each previews as preview, index (preview)}
            <img src={preview} alt={files[index]?.name ?? 'Selected upload'} />
          {/each}
        </div>
      </div>
      <div class="clearfix"></div>
      <div class="form-group">
        <textarea
          id="alert-media-text"
          name="alertMediaText"
          rows="2"
          placeholder="Alert Text..."
          aria-label="Alert Text..."
          class="form-control"
          bind:value={imageAlertText}></textarea>
      </div>
    </div>
  </div>

  {#snippet footer()}
    <div class="row w-100">
      <div class="col-12">
        <div class="form-check">
          <input
            type="checkbox"
            id="keepOpenChk"
            name="keepOpen"
            class="form-check-input"
            bind:checked={keepOpen}
          />
          <label for="keepOpenChk">Keep alert window open?</label>
        </div>
        <div class="form-check">
          <input
            type="checkbox"
            id="postOnXChk"
            name="postOnX"
            class="form-check-input"
            bind:checked={postOnX}
          />
          <label for="postOnXChk">Post on X? (tweet)</label>
        </div>
        <div class="form-check">
          <input
            type="checkbox"
            id="alert-push-label"
            name="dontPush"
            class="form-check-input"
            bind:checked={dontPush}
          />
          <label for="alert-push-label">Don't send to push notification?</label>
        </div>
        <div class="form-check">
          <input
            type="checkbox"
            id="alert-non-trade-label"
            name="nonTradeAlert"
            class="form-check-input"
            bind:checked={nonTradeAlert}
          />
          <label for="alert-non-trade-label">Non-trade alert? (Different Sound)</label>
        </div>
        <!--
          `H(62, GTe, 2, 0)` behind `O(62, globals.alertLabels && globals.alertLabels.length > 0 ?
          62 : -1)` — the Alert Labels picker, byte 2,119,145 with its gate at 2,138,428. It sits
          between the Non-trade checkbox (slot 61) and Linked Room Alerts (63), which is where it is
          drawn here.

          `zTe`, the per-label row, decoded with its consts (35 = `[1,"form-check"]`,
          52 = the checkbox, 53 = `[3,"for"]`):

            <div class="form-check">
              <input type="checkbox" class="form-check-input" id="alert-trade-label-{i}" [(ngModel)]="e.checked">
              <label [for]="'alert-trade-label-' + i">{{e.name}}?</label>
            </div>

          THE ID IS INDEX-BASED and the label text ends in a QUESTION MARK — `Ne("", e.name, "?")` —
          both of which look like mistakes and are the shipped markup. The `?` matches the four
          checkboxes around it, every one of which asks a question.

          Keyed by HASH rather than by index, because the id is the only thing the index is for: a
          keyed `{#each}` on a stable identity is what stops Svelte reusing a checkbox for a
          different label if the room's table is ever re-ordered, and `$index` still supplies the id.
        -->
        {#each alertLabels as label, index (label.hash)}
          <div class="form-check">
            <input
              type="checkbox"
              id="alert-trade-label-{index}"
              class="form-check-input"
              checked={checkedLabels.has(label.hash)}
              onchange={(event) => {
                if (event.currentTarget.checked) checkedLabels.add(label.hash);
                else checkedLabels.delete(label.hash);
              }}
            />
            <label for="alert-trade-label-{index}">{label.name}?</label>
          </div>
        {/each}
        <div class="form-check">
          <input
            type="checkbox"
            id="alert-legal-disclosure-label"
            name="legalDisclosure"
            class="form-check-input"
            bind:checked={legalDisclosure}
          />
          <label for="alert-legal-disclosure-label">Add Legal Disclosure?</label>
        </div>
        {#if legalDisclosure}
          <div class="mb-1">
            <input
              id="alert-legal-disclosure-text"
              name="legalDisclosureText"
              type="text"
              class="form-control"
              aria-labelledby="alert-legal-disclosure-label"
              bind:value={legalDisclosureText}
            />
          </div>
        {/if}
        <!--
          `hasAlertScheduler` — the send-later pane, and the manage table reached from it.

          Rendered only when the room has the scheduler, matching where upstream puts it (inside
          `app-post-alert-modal`, gated on `sessData.hasAlertScheduler`). The gate is drawn here AND
          enforced on the server: `scheduled-alerts.remote.ts` refuses all three commands without the
          setting, because a gate that only removes a control is not a gate.
        -->
        {#if schedulerAvailable && showSendLater}
          <ScheduledAlerts
            body={alertText}
            {nonTradeAlert}
            {onalert}
            {onconfirm}
            onscheduled={() => {
              showSendLater = false;
              if (!keepOpen) onclose();
              else clearInputFields();
            }}
          />
        {/if}
      </div>
      <!--
        ── PAM-05 — POST ALERT AND SEND LATER ARE MUTUALLY EXCLUSIVE, and both were on screen ─────

        The reference's five gates, read together at byte 2,139,315:

        ```js
        O(66, showSendLater && hasAlertScheduler ? 66 : -1)   // the send-later form
        O(68, showSendLater && scheduledAlerts.length > 0 && hasAlertScheduler ? 68 : -1)
        O(69, !showSendLater && hasAlertScheduler ? 69 : -1)  // " Send Later? "   (JTe, const 76)
        O(70, showSendLater ? 70 : -1)                        // " Cancel "        (ZTe, const 77)
        O(71, showSendLater ? -1 : 71)                        // "Post Alert"
        ```

        Node 71 is the one that matters: **Post Alert is REMOVED while the scheduler is open.** This
        room rendered the whole scheduling pane inline and kept Post Alert beside it, so a presenter
        who had filled in a date and a repeat could still press the green button and send the alert
        immediately — losing the schedule they had just typed, with nothing to say so. The two are
        one decision with two answers and the reference makes you pick.

        The Cancel button is `btn btn-primary me-1` and sits where Post Alert was; "Send Later?" is
        `btn btn-link` with a calendar icon. Both labels carry the reference's own surrounding
        spaces, written as expressions because Svelte normalises whitespace at element boundaries.
      -->
      <div class="text-right">
        {#if schedulerAvailable && !showSendLater}
          <button class="btn btn-link" onclick={() => (showSendLater = true)}>
            <i class="fas fa-calendar"></i>{' Send Later? '}
          </button>
        {/if}
        {#if showSendLater}
          <button class="btn btn-primary me-1" onclick={() => (showSendLater = false)}
            >{' Cancel '}</button
          >
        {:else}
          <button class="btn btn-success" onclick={postAlert}>Post Alert</button>
        {/if}
      </div>
    </div>
  {/snippet}
</Modal>

{#if pastedImage}
  <BootboxDialog
    mode="confirm"
    message=""
    onclose={closePastedImageConfirm}
    onconfirm={() => void confirmPastedImage()}
  >
    <div class="text-center">
      <h4>Upload this image?</h4>
      <img
        style="max-width: 100%; max-height: 50vh;"
        src={pastedImage.preview}
        alt={pastedImage.file.name}
      />
    </div>
  </BootboxDialog>
{/if}
