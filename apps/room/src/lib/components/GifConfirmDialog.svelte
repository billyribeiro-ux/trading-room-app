<script lang="ts">
  interface Props {
    url: string;
    onclose: () => void;
    onconfirm: () => void;
  }

  let { url, onclose, onconfirm }: Props = $props();
</script>

<div
  class="bootbox modal fade bootbox-confirm show"
  tabindex="-1"
  role="dialog"
  aria-modal="true"
  style="display: block;"
>
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header border-0">
        <!-- svelte-ignore a11y_missing_content -->
        <h5 class="modal-title"></h5>
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
          You sure you want to post this image:<br />
          <img src={url} alt="Selected GIF" style="width: 100%;" />
        </div>
      </div>
      <div class="modal-footer">
        <button
          type="button"
          class="btn btn-secondary btn-default bootbox-cancel"
          onclick={onclose}
        >
          Cancel
        </button>
        <button type="button" class="btn btn-primary bootbox-accept" onclick={onconfirm}>OK</button>
      </div>
    </div>
  </div>
</div>
