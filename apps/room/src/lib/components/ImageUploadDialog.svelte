<script lang="ts">
  import { onDestroy } from 'svelte';

  interface Props {
    onclose: () => void;
    onupload: (files: File[], message: string) => void;
  }

  let { onclose, onupload }: Props = $props();
  let files = $state<File[]>([]);
  let previews = $state<string[]>([]);
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
</script>

<div
  class="bootbox modal fade show"
  tabindex="-1"
  role="dialog"
  aria-modal="true"
  style="display: block;"
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
              class:hover={dragging}
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
