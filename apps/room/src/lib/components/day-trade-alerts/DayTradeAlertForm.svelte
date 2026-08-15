<script lang="ts">
  import type { DayTradeAlertDraft } from './draft';

  /**
   * The Day Trade Alerts composer — `Ewe`, decoded at bundle byte 1,940,236 and read end to end in
   * this session.
   *
   * ONE form serves create and edit, and `draft.edit` is the mode flag. That is the reference's
   * design, not a simplification: the same five inputs, the same radio pair, and only the two
   * buttons' contents change.
   *
   * Presenter-only. The gate is in the pane (`O(1, e.isP ? 1 : -1)`), so this component never has
   * to ask — but the SERVER re-checks every mutation, because a hidden form is not a check.
   *
   * ## What differs from `SwingAlertForm`, and it is only the names
   *
   * Every placeholder, every label, every input type, every icon and every button word is character
   * for character the same as the swing form: the two const runs 173–178 and 223–227 were read side
   * by side and differ only in the `swingAlert-` / `dayTradeAlert-` id and name prefixes, and the
   * two forms share consts 171, 172, 177, 179–182, 185, 188–199 outright. So the ONLY differences
   * below are the five ids, the two radio ids, the `name=` attributes and the form's own class.
   * Anything else that differs is a mistake.
   */
  interface Props {
    /**
     * The model, owned by the pane and written here.
     *
     * `$bindable` rather than a prop plus six change callbacks: the reference keeps ONE
     * `this.dayTradeAlert` object that both the form and the list's Edit button write, and the
     * Svelte documentation names `$bindable` as the way for a parent and child to share one object.
     * Mutating a plain prop object would be the `ownership_invalid_mutation` case instead.
     *
     * A plain `$state` object and not `$state.raw`: this one IS mutated field by field, on every
     * keystroke. `$state.raw` is for the list, which is only ever replaced.
     */
    draft: DayTradeAlertDraft;
    /** Ask the parent to open the upload dialog. `imgUpload('dayTrade')` in the reference. */
    readonly onUploadImage: () => void;
    /** A paste carrying an image. The parent confirms and uploads; `onImagePaste(o,'dayTrade')`. */
    readonly onPasteImage: (file: File) => void;
    /** `showImagePreview(dayTradeAlert.image)` — the lightbox. */
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
   * `x("paste", o => onImagePaste(o, "dayTrade"))`, the call site at byte 1,941,249.
   *
   * The discriminator string is `"dayTrade"` — camelCase, no hyphen, no capital D — and the shared
   * upload handler is deny-by-default on it: `"swing" === i ? … : "dayTrade" === i && (…)` at byte
   * 1,992,037, so any other spelling silently sets neither form's image. That is why the string
   * travels as far as the parent rather than being re-derived anywhere.
   *
   * The handler keeps the LAST clipboard item whose type starts with `image` and ignores the rest,
   * which is what lets a paste carrying both a screenshot and its text URL resolve to the image.
   * The upload itself is the parent's, because it needs the room's upload endpoint.
   *
   * The default is NOT prevented: a paste of plain text must still land in the box, which is how
   * "Paste Image Link" works.
   */
  function handlePaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;
    let image: File | null = null;
    for (const item of items) {
      if (!item.type.startsWith('image')) continue;
      const file = item.getAsFile();
      if (file) image = file;
    }
    if (image) onPasteImage(image);
  }
</script>

<!--
  `<form class="m-2 mx-auto day-trade-alert-form">` — const 222. `onsubmit` rather than a click
  handler on the right-hand button, because that button is `type="submit"` with no listener of its
  own (const 190, shared with the swing form): pressing Enter in any field must submit, exactly as
  it does upstream.
-->
<form
  class="m-2 mx-auto day-trade-alert-form"
  onsubmit={(event) => {
    event.preventDefault();
    onSubmit();
  }}
>
  <div class="form-group input-group mb-1">
    <span class="input-group-text bg-secondary border-secondary text-white">Symbol</span>
    <input
      type="text"
      id="dayTradeAlert-symbol"
      placeholder="AAPL"
      minlength="1"
      name="dayTradeAlert-symbol"
      required
      class="form-control"
      bind:value={draft.symbol}
    />
  </div>
  <!--
    `type="text"`, NOT `type="number"`, on all three price fields — const indices 224, 225 and 226.
    Deliberate and load-bearing: a numeric input changes the keyboard, the validation and the locale
    handling of the decimal separator, and the value is stored and rendered back verbatim.
  -->
  <div class="form-group input-group mb-1">
    <span class="input-group-text bg-secondary border-secondary text-white">Entry Price</span>
    <input
      type="text"
      id="dayTradeAlert-entryPrice"
      placeholder="123.57"
      minlength="1"
      name="dayTradeAlert-entryPrice"
      required
      class="form-control"
      bind:value={draft.entryPrice}
    />
  </div>
  <div class="form-group input-group mb-1">
    <span class="input-group-text bg-secondary border-secondary text-white">Stop</span>
    <input
      type="text"
      id="dayTradeAlert-stop"
      placeholder="120.40"
      minlength="1"
      name="dayTradeAlert-stop"
      required
      class="form-control"
      bind:value={draft.stop}
    />
  </div>
  <div class="form-group input-group mb-1">
    <span class="input-group-text bg-secondary border-secondary text-white">Target</span>
    <input
      type="text"
      id="dayTradeAlert-target"
      placeholder="138.75"
      minlength="1"
      name="dayTradeAlert-target"
      required
      class="form-control"
      bind:value={draft.target}
    />
  </div>
  <!--
    The image row. Three slots, and the outer two are conditional on the SAME value:

      O(19, e.dayTradeAlert.image ? 19 : 20)   // preview `ywe`, else upload button `Fwe`
      O(22, e.dayTradeAlert.image ? 22 : -1)   // clear button `Cwe`, else nothing

    So the row reads preview / input / clear when an image is set, and upload / input when it is
    not. `-1` is "instantiate nothing", which is why the clear button has no alternate branch.

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
      The only field with no `required` attribute — const 227 carries `minlength` and `name` but no
      `required`, and it is the only one that binds `paste`.
    -->
    <input
      type="text"
      id="dayTradeAlert-image"
      placeholder="Upload Image or Paste Image Link / Screenshot (optional)"
      minlength="1"
      name="dayTradeAlert-image"
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
          `fas fa-times` with NO `me-1` — const 92, shared with the swing form and with the volume
          dropdown's close control. It is not const 197, which is the same icon WITH the margin and
          belongs to the Cancel button below.
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
        asymmetry is the reference's spacing, not a slip, and it is the same pair of consts the
        swing form uses.

        This green/red pair exists ONLY here. The log row prints `long` / `short` in the default
        text colour, because its `<td>` is created with no const index at all — no class, no
        `ngClass`, no pipe. Colouring the row would be a change, not a match.
      -->
      <div class="form-check form-check-inline ms-2">
        <input
          type="radio"
          name="dayTradeAlert-direction"
          id="dayTradeAlert-long"
          value="long"
          required
          class="form-check-input"
          bind:group={draft.direction}
        />
        <label for="dayTradeAlert-long" class="form-check-label text-success font-weight-bold">
          Long
        </label>
      </div>
      <div class="form-check form-check-inline">
        <input
          type="radio"
          name="dayTradeAlert-direction"
          id="dayTradeAlert-short"
          value="short"
          required
          class="form-check-input"
          bind:group={draft.direction}
        />
        <label for="dayTradeAlert-short" class="form-check-label text-danger font-weight-bold">
          Short
        </label>
      </div>
    </div>
    <!--
      Both buttons swap their CONTENTS on `dayTradeAlert.edit`, and the icons are three different
      families that are not interchangeable:

        edit   left  `Swe` — fas fa-trash me-1 + "Discard "
        create left  `wwe` — fas fa-times me-1 + "Cancel "
        edit   right `Twe` — fas fa-save  me-1 + "Save Changes "
        create right `Dwe` — fas fa-bell  me-1 + "Submit Alert "

      All four were read verbatim at bytes 1,940,011 / 1,940,065 / 1,940,118 / 1,940,177, and all
      four are content-identical to the swing form's `lwe` / `cwe` / `dwe` / `uwe`. The pairing is
      the one that catches people out: edit-mode CANCEL is "Discard" with a TRASH icon, not a
      times icon.
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
    its own `styles:[…]` block at the byte offsets named, with the `[_ngcontent-%COMP%]` scoping
    attribute stripped. None of these appear in `styles.ee2a710065b60389.css`.

    Every rule below names BOTH features in one declaration block upstream — the day-trade selector
    and its swing twin, same braces, same declarations — so these are not a copy of the swing
    component's styles, they are the day-trade half of the same rules.
  */

  /* byte 2,023,059 — `.day-trade-alert-form, .swing-alert-form` */
  .day-trade-alert-form {
    font-size: 12px;
    max-width: 600px;
  }

  .day-trade-alert-form :global(.input-group-text) {
    width: 105px;
    font-size: 12px;
  }

  .day-trade-alert-form :global(.form-control) {
    font-size: 12px;
  }

  /*
    byte 2,023,517 — the widest rule in the block, and worth naming: it lists EIGHT selectors, the
    cross product of the two form classes with all four radio ids, so upstream a `#swingAlert-long`
    inside `.day-trade-alert-form` would also get this margin. That cross pairing cannot occur —
    each form only contains its own ids — so only the two reachable selectors are written here.
  */
  .day-trade-alert-form #dayTradeAlert-long,
  .day-trade-alert-form #dayTradeAlert-short {
    margin-top: 3px;
  }

  /* byte 2,026,319 — shared by all three image affordances. */
  .uploaded-img-preview {
    width: auto;
    height: 100%;
    max-height: 30px;
    object-fit: contain;
  }

  /* byte 2,026,498 */
  .remove-image-btn {
    width: 36px !important;
  }

  /* byte 2,026,556 */
  .uploaded-img-preview:hover,
  .img-upload-btn:hover,
  .remove-image-btn:hover {
    cursor: pointer;
  }
</style>
