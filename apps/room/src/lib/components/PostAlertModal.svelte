<script lang="ts">
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

  interface Props {
    open: boolean;
    tab: AlertTab;
    onclose: () => void;
    ontab: (tab: AlertTab) => void;
    onalert: (message: string) => void;
    onpost: (submission: PostAlertSubmission) => Promise<boolean>;
    onpastepost: (submission: PastedImageSubmission) => Promise<boolean>;
  }

  let { open, tab, onclose, ontab, onalert, onpost, onpastepost }: Props = $props();

  let alertText = $state('');
  let alertUrl = $state('');
  let linkAlertText = $state('');
  let imageAlertText = $state('');
  let files = $state.raw<File[]>([]);
  let previews = $state.raw<string[]>([]);
  let dragging = $state(false);
  let fileInput = $state<HTMLInputElement>();
  let keepOpen = $state(false);
  let postOnX = $state(false);
  let dontPush = $state(false);
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
    releasePreviews();
    files = [];
    alertText = '';
    alertUrl = '';
    imageAlertText = '';
    linkAlertText = '';
    if (fileInput) fileInput.value = '';
  }

  function beginOpenState() {
    clearInputFields();
    postOnX = false;
    nonTradeAlert = false;
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
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (!item.type.startsWith('image')) continue;
      const file = item.getAsFile();
      if (!file) return;
      const preview = URL.createObjectURL(file);
      if (pastedImage) URL.revokeObjectURL(pastedImage.preview);
      pastedImage = { file, preview };
      return;
    }
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
      legalDisclosureText
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
      fileCount: files.length
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
      legalDisclosureText
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
      </div>
      <div class="text-right">
        <button class="btn btn-success" onclick={postAlert}>Post Alert</button>
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
