<script lang="ts">
  import { pastedImageFrom } from '#lib/pasted-image.js';
  import type { SwingAlertDraft } from './draft';

  /**
   * The Swing Trade Alerts composer — `hwe`, decoded at bundle byte 1,933,979.
   *
   * ONE form serves create and edit, and `draft.edit` is the mode flag. That is the reference's
   * design, not a simplification: the same five inputs, the same radio pair, and only the two
   * buttons' contents change.
   *
   * Presenter-only. The gate is in the pane (`O(1, e.isP ? 1 : -1)`), so this component never has
   * to ask — but the SERVER re-checks every mutation, because a hidden form is not a check.
   */
  interface Props {
    /**
     * The model, owned by the pane and written here.
     *
     * `$bindable` rather than a prop plus six change callbacks: the reference keeps ONE
     * `this.swingAlert` object that both the form and the list's Edit button write, and the Svelte
     * documentation names `$bindable` as the way for a parent and child to share one object.
     * Mutating a plain prop object would be the `ownership_invalid_mutation` case instead.
     *
     * A plain `$state` object and not `$state.raw`: this one IS mutated field by field, on every
     * keystroke. `$state.raw` is for the list, which is only ever replaced.
     */
    draft: SwingAlertDraft;
    /** Ask the parent to open the upload dialog. `imgUpload('swing')` in the reference. */
    readonly onUploadImage: () => void;
    /** A paste carrying an image. The parent confirms and uploads; `onImagePaste(e,'swing')`. */
    readonly onPasteImage: (file: File) => void;
    /** `showImagePreview(swingAlert.image)` — the lightbox. */
    readonly onPreviewImage: (url: string) => void;
    readonly onSubmit: () => void;
    readonly onCancel: () => void;
  }

  let {
    draft = $bindable(),
    onUploadImage,
    onPasteImage,
    onPreviewImage,
    onSubmit,
    onCancel
  }: Props = $props();

  /**
   * `x("paste", o => onImagePaste(o, "swing"))`, byte 1,992,250.
   *
   * The handler keeps the LAST clipboard item whose type starts with `image` and ignores the rest,
   * which is what lets a paste carrying both a screenshot and its text URL resolve to the image.
   * The upload itself is the parent's, because it needs the room's upload endpoint.
   *
   * The default is NOT prevented: a paste of plain text must still land in the box, which is how
   * "Paste Image Link" works.
   */
  function handlePaste(event: ClipboardEvent): void {
    const image = pastedImageFrom(event.clipboardData?.items);
    if (image) onPasteImage(image);
  }
</script>

<!--
  `<form class="m-2 mx-auto swing-alert-form">` — const 170. `onsubmit` rather than a click handler
  on the right-hand button, because that button is `type="submit"` with no listener of its own
  (const 190): pressing Enter in any field must submit, exactly as it does upstream.
-->
<form
  class="m-2 mx-auto swing-alert-form"
  onsubmit={(event) => {
    event.preventDefault();
    onSubmit();
  }}
>
  <div class="form-group input-group mb-1">
    <span class="input-group-text bg-secondary border-secondary text-white">Symbol</span>
    <input
      type="text"
      id="swingAlert-symbol"
      placeholder="AAPL"
      minlength="1"
      name="swingAlert-symbol"
      required
      class="form-control"
      bind:value={draft.symbol}
    />
  </div>
  <!--
    `type="text"`, NOT `type="number"`, on all three price fields — const indices 174, 175 and 176.
    Deliberate and load-bearing: a numeric input changes the keyboard, the validation and the locale
    handling of the decimal separator, and the value is stored and rendered back verbatim.
  -->
  <div class="form-group input-group mb-1">
    <span class="input-group-text bg-secondary border-secondary text-white">Entry Price</span>
    <input
      type="text"
      id="swingAlert-entryPrice"
      placeholder="123.57"
      minlength="1"
      name="swingAlert-entryPrice"
      required
      class="form-control"
      bind:value={draft.entryPrice}
    />
  </div>
  <div class="form-group input-group mb-1">
    <span class="input-group-text bg-secondary border-secondary text-white">Stop</span>
    <input
      type="text"
      id="swingAlert-stop"
      placeholder="120.40"
      minlength="1"
      name="swingAlert-stop"
      required
      class="form-control"
      bind:value={draft.stop}
    />
  </div>
  <div class="form-group input-group mb-1">
    <span class="input-group-text bg-secondary border-secondary text-white">Target</span>
    <input
      type="text"
      id="swingAlert-target"
      placeholder="138.75"
      minlength="1"
      name="swingAlert-target"
      required
      class="form-control"
      bind:value={draft.target}
    />
  </div>
  <!--
    The image row. Three slots, and the outer two are conditional on the SAME value:

      O(19, e.swingAlert.image ? 19 : 20)   // preview `swe`, else upload button `rwe`
      O(22, e.swingAlert.image ? 22 : -1)   // clear button `awe`, else nothing

    So the row reads preview / input / clear when an image is set, and upload / input when it is
    not. `-1` is "instantiate nothing", which is why the clear button has no `{:else}`.

    Note the group carries the same const as the four above it (171) — the image row is a normal
    field group whose leading slot happens to hold a control instead of a label.
  -->
  <div class="form-group input-group mb-1">
    {#if draft.image}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <span
        title="Click to view image"
        class="input-group-text bg-secondary border-secondary text-white text-center p-0 d-block"
        onclick={() => onPreviewImage(draft.image)}
      >
        <!--
          No width/height attributes, and that is an honest gap rather than an oversight: the
          image is whatever a presenter pasted and the capture records no intrinsic size. The box
          is bounded vertically by the stylesheet's `max-height: 30px` on this class, so the row
          cannot grow unboundedly while the bytes load.
        -->
        <img class="d-inline-block uploaded-img-preview" src={draft.image} alt={draft.image} />
      </span>
    {:else}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <span
        title="Upload Image"
        class="input-group-text bg-secondary border-secondary text-white img-upload-btn"
        onclick={onUploadImage}
      >
        <i class="fas fa-image me-1"></i> Image
      </span>
    {/if}
    <!--
      The only field with no `required` attribute — const 178 carries `minlength` and `name` but no
      `required`, and it is the only one that binds `paste`.
    -->
    <input
      type="text"
      id="swingAlert-image"
      placeholder="Upload Image or Paste Image Link / Screenshot (optional)"
      minlength="1"
      name="swingAlert-image"
      class="form-control"
      onpaste={handlePaste}
      bind:value={draft.image}
    />
    {#if draft.image}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <span
        title="Remove Image"
        class="input-group-text bg-danger border-danger text-white remove-image-btn"
        onclick={() => (draft.image = '')}
      >
        <!--
          `fas fa-times` with NO `me-1` — const 92, shared with the volume dropdown's close control.
          It is not const 197, which is the same icon WITH the margin and belongs to the Cancel
          button below.
        -->
        <i class="fas fa-times"></i>
      </span>
    {/if}
  </div>
  <div class="d-flex align-items-center justify-content-between flex-wrap">
    <div class="form-group mb-0 ms-1">
      <!--
        `text-success` and `text-danger` are Bootstrap utilities and stay as classes — resolving
        them to hex would move a colour out of the theme and into this file. Note that the Long
        wrapper carries `ms-2` (const 182) and the Short wrapper does not (const 185); that
        asymmetry is the reference's spacing, not a slip.

        This green/red pair exists ONLY here. The log row prints `long` / `short` in the default
        text colour, because its `<td>` is created with no const index at all — no class, no
        `ngClass`, no pipe. Colouring the row would be a change, not a match.
      -->
      <div class="form-check form-check-inline ms-2">
        <input
          type="radio"
          name="swingAlert-direction"
          id="swingAlert-long"
          value="long"
          required
          class="form-check-input"
          bind:group={draft.direction}
        />
        <label for="swingAlert-long" class="form-check-label text-success font-weight-bold">
          Long
        </label>
      </div>
      <div class="form-check form-check-inline">
        <input
          type="radio"
          name="swingAlert-direction"
          id="swingAlert-short"
          value="short"
          required
          class="form-check-input"
          bind:group={draft.direction}
        />
        <label for="swingAlert-short" class="form-check-label text-danger font-weight-bold">
          Short
        </label>
      </div>
    </div>
    <!--
      Both buttons swap their CONTENTS on `swingAlert.edit`, and the icons are three different
      families that are not interchangeable:

        edit  left  `lwe` — fas fa-trash me-1 + "Discard "
        create left `cwe` — fas fa-times me-1 + "Cancel "
        edit  right `dwe` — fas fa-save  me-1 + "Save Changes "
        create right `uwe` — fas fa-bell  me-1 + "Submit Alert "

      An earlier revision of the decode had the edit-mode label as "Cancel" with the wrong icon
      index; the corrected reading is verbatim `function lwe(t,n){1&t&&(T(0,"i",196),v(1,"Discard "))}`.
    -->
    <div class="text-end">
      <button type="button" class="btn btn-secondary btn-sm m-1" onclick={onCancel}>
        {#if draft.edit}
          <i class="fas fa-trash me-1"></i>Discard
        {:else}
          <i class="fas fa-times me-1"></i>Cancel
        {/if}
      </button>
      <button type="submit" class="btn btn-primary btn-sm m-1">
        {#if draft.edit}
          <i class="fas fa-save me-1"></i>Save Changes
        {:else}
          <i class="fas fa-bell me-1"></i>Submit Alert
        {/if}
      </button>
    </div>
  </div>
</form>

<style>
  /*
    The component-scoped rules of `app-presentationarea` that belong to the form, transcribed from
    its own `styles:[…]` block at the byte offsets named. None of these appear in
    `styles.ee2a710065b60389.css` — every swing rule lives in the component block, which is why
    they are here rather than in the global sheet.
  */

  /* byte 2,023,101 */
  .swing-alert-form {
    font-size: 12px;
    max-width: 600px;
  }

  .swing-alert-form :global(.input-group-text) {
    width: 105px;
    font-size: 12px;
  }

  .swing-alert-form :global(.form-control) {
    font-size: 12px;
  }

  .swing-alert-form #swingAlert-long,
  .swing-alert-form #swingAlert-short {
    margin-top: 3px;
  }

  /* byte 2,026,319 — shared by all three image affordances. */
  .uploaded-img-preview {
    width: auto;
    height: 100%;
    max-height: 30px;
    object-fit: contain;
  }

  .remove-image-btn {
    width: 36px !important;
  }

  .uploaded-img-preview:hover,
  .img-upload-btn:hover,
  .remove-image-btn:hover {
    cursor: pointer;
  }
</style>
