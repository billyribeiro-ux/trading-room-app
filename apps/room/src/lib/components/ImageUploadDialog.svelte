<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { Attachment } from 'svelte/attachments';

  /**
   * `imgUpload()`'s bootbox dialog — byte 1,442,225, and TWO of its options were not reproduced.
   *
   *     bootbox.dialog({ message: …, title: "Image Upload",
   *                      backdrop: !0, onEscape: !0, size: "xl", buttons: { success: … } })
   *
   * `backdrop:!0` is the `.modal-backdrop` element bootbox emits behind the dialog; `onEscape:!0`
   * is the keystroke that dismisses it. This repository has already ruled the first of those
   * rendered surface twice — `ROV-04` for the image lightbox and `VID-01` for the video player,
   * both of which emit `<div class="modal-backdrop fade show">` from the same option — and this was
   * the one bootbox dialog in the room with neither.
   *
   * Found 2026-09-01. Nothing was dimmed behind it: `app.css:1556` sets `.modal { background:
   * transparent }` and `modal-open` occurs nowhere, so the room stayed at full brightness under a
   * dialog covering it. And Escape did nothing: the room's one global Escape ladder
   * (`room/window-handlers.ts`) closes the popovers, the lightbox and the three `BootboxDialog`
   * modes, and this dialog is in none of them.
   */
  interface Props {
    onclose: () => void;
    onupload: (files: File[], message: string) => void;
  }

  let { onclose, onupload }: Props = $props();
  let files = $state.raw<File[]>([]);
  let previews = $state.raw<string[]>([]);
  let message = $state('');
  let dragging = $state(false);
  const imageUploadInputId = 'fupload';

  function releasePreviews() {
    for (const preview of previews) URL.revokeObjectURL(preview);
    previews = [];
  }

  function selectFiles(fileList: FileList | null) {
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
    selectFiles(event.dataTransfer?.files ?? null);
  }

  onDestroy(releasePreviews);

  /**
   * `onEscape:!0`, and it needs the focus to work — which is `ASR-3` again, one layer down.
   *
   * Bootbox binds its Escape handler to the MODAL, and Bootstrap's plugin focuses the modal on
   * show. This room ships no Bootstrap JavaScript at all (`bootstrap-dropdown-contract.test.ts`
   * holds that premise), so a handler on this element would never have received a keystroke:
   * `Modal.svelte` records the same finding and the same one-line fix for the other twenty-three
   * dialogs in the room.
   *
   * The root carries `tabindex="-1"` already — the reference's own attribute — which is what makes
   * it focusable without entering the tab order.
   */
  const takeFocus: Attachment<HTMLDivElement> = (node) => {
    node.focus();
  };

  /**
   * ON THE ELEMENT, NOT ON `<svelte:window>`, and `stopPropagation` is the reason.
   *
   * `routes/+page.svelte` binds the room's global key handler to the window, and its Escape ladder
   * ends in `else if (dialogs.alert) dialogs.alert = null`. An upload that fails raises exactly such
   * an alert, so a window-bound handler here would let one keystroke close two things. Stopping the
   * event on this element keeps it off the bubble path to the window, which is the whole ladder.
   *
   * That also matches where the reference binds: bootbox's handler is on the modal, not the page.
   */
  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    onclose();
  }
</script>

<div
  class="bootbox modal fade show"
  tabindex="-1"
  role="dialog"
  aria-modal="true"
  style="display: block;"
  {@attach takeFocus}
  onkeydown={handleKeydown}
>
  <div class="modal-dialog modal-xl">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Image Upload</h5>
        <button
          type="button"
          class="bootbox-close-button close btn-close"
          aria-hidden="true"
          aria-label="Close"
          onclick={onclose}
        ></button>
      </div>
      <div class="modal-body">
        <div class="bootbox-body">
          <div>
            <label
              class="upload-area"
              style="width:100%;text-align:center;"
              for={imageUploadInputId}
            >
              <input
                id={imageUploadInputId}
                name="fupload"
                type="file"
                style="display:none;"
                multiple
                accept="image/*"
                onchange={(event) => selectFiles(event.currentTarget.files)}
              />
              <i class="fas fa-file-upload fa-3x"></i><br />
              Click to select images to upload
            </label>
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              id="filedrag"
              class={{ hover: dragging }}
              ondragover={handleDrag}
              ondragleave={handleDrag}
              ondrop={handleDrop}
              style:display={files.length > 0 ? 'none' : 'block'}
            >
              or drop files here
            </div>
            <br />
            <div
              style="margin-left:5px !important;"
              id="fileList"
              class="fileList text-center"
              style:display={files.length > 0 ? 'block' : 'none'}
            >
              {#each previews as preview, index (preview)}
                <img src={preview} alt={files[index]?.name ?? 'Selected upload'} />
              {/each}
            </div>
          </div>
          <div class="clearfix"></div>
          <div class="w-100 my-3">
            <textarea
              class="form-control w-100"
              rows="2"
              id="msg-text"
              name="msg-text"
              placeholder="Enter your message"
              bind:value={message}></textarea>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button
          type="button"
          class="btn btn-success"
          onclick={() => onupload(files, message.trim())}>Upload</button
        >
      </div>
    </div>
  </div>
</div>
<!--
  `backdrop:!0`. A sibling and not a child, exactly as `BootboxDialog.svelte` and
  `ImageLightbox.svelte` emit it, and with no dismiss handler of its own for the reason those two
  record: the backdrop paints BEHIND a dialog element that already covers the viewport, so a click
  on the dimmed area never reaches it.
-->
<div class="modal-backdrop fade show"></div>
