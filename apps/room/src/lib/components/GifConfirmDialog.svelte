<script lang="ts">
  interface Props {
    url: string;
    onclose: () => void;
    onconfirm: () => void;
    /**
     * The question, whose VERB differs by surface — the same split as `GiphyPicker`'s `hint`.
     *
     * `sendGif` in the chat composer asks `You sure you want to post this image:`; `app-note`'s
     * asks `You sure you want to insert this image:` at byte 1,482,885. A note's GIF goes into a
     * document, not out to a room, and the word is the only thing that says which.
     *
     * Defaulted to the chat string so the surface that already had this dialog is unchanged.
     */
    message?: string;
  }

  let {
    url,
    onclose,
    onconfirm,
    message = 'You sure you want to post this image:'
  }: Props = $props();
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
          {message}<br />
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
