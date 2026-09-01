<script lang="ts">
  import { tick, untrack } from 'svelte';

  import BootboxDialog from '#lib/components/BootboxDialog.svelte';
  import type { SessionImageFile } from '#lib/session-image-files.js';

  import type { CarouselSlide } from './carousel';

  /*
    ── THE CAROUSEL DIALOG, EXTRACTED FROM `NoteEditor.svelte` ──────────────────────────────────

    `app-note`'s carousel is one modal, one file browser, two confirmations and four CSS rules, and
    it was all inline in the editor. It came out on 2026-08-30 because the ratchet in
    `source-size-contract.test.ts` refused the row rebuild at 2,214 lines and says what to do
    instead: *extract a slice into a module or component rather than raising this number.*

    It is a good seam and not a convenient one. Nothing here touches the editor: no Tiptap instance,
    no selection, no document. The dialog is handed the values a carousel is made of, edits them,
    and hands them back once — `NoteEditor` decides where they land, because only it knows whether
    this is an insert or an edit-in-place. That is the whole of the contract between them.

    ## The state is SEEDED from props, not bound to them

    `slides`, `interval` and `height` are read once, at construction. That is sound only because
    `NoteEditor` mounts this component inside `{#if dialog === 'carousel'}` — closing the modal
    destroys it, and opening it builds a fresh one from whatever the editor knows then. A `$derived`
    would be wrong here: it would throw away everything the presenter typed the moment anything
    upstream re-evaluated.
  */

  interface Props {
    /** `Edit Image Carousel` / `Insert Image Carousel` — swung by the caller on edit mode. */
    readonly title: string;
    /** ` Save Changes ` / ` Insert Carousel `, the same swing on the primary button. */
    readonly action: string;
    /** The carousel being edited, or one blank slide when placing a new one. Read ONCE — see above. */
    readonly slides: readonly CarouselSlide[];
    readonly interval: number;
    readonly height: number;
    /** The room's shared IMAGE files, already filtered — what the ` Browse ` browser offers. */
    readonly sessionImages: readonly SessionImageFile[];
    readonly onUploadImages: (files: readonly File[]) => Promise<readonly string[]>;
    readonly ondismiss: () => void;
    readonly onsubmit: (config: {
      slides: readonly CarouselSlide[];
      interval: number;
      height: number;
    }) => void;
  }

  let {
    title,
    action,
    slides: initialSlides,
    interval: initialInterval,
    height: initialHeight,
    sessionImages,
    onUploadImages,
    ondismiss,
    onsubmit
  }: Props = $props();

  const componentId = $props.id();

  /** The upload failure, raised through the same primitive `bootbox.alert` maps to everywhere. */
  let errorMessage = $state<string | null>(null);

  /**
   * The modal's rows carry an identity for the keyed each block; the node's slides do not.
   *
   * `pendingUrl` is the reference's own staging field and is likewise never written to the node:
   * `confirmCarouselImageUrl` is what promotes it into `url`, and `submitCarousel` reads `url`. A
   * slide whose URL was typed but never confirmed is therefore not in the carousel, which is
   * upstream's behaviour exactly — it reads `carouselImages[i].url` at insert time too.
   */
  type EditorCarouselSlide = CarouselSlide & {
    key: number;
    pendingUrl: string;
  };

  /**
   * Which carousel row a confirmation dialog is open for, and which question it is asking.
   *
   * By KEY and not index, for the reason `uploadingSlideKey` is: `removeCarouselSlide` renumbers.
   * A discriminated union rather than two booleans because the two questions are mutually exclusive
   * — one dialog is open, or none is — and two flags can disagree about that.
   */
  type CarouselConfirm = { kind: 'delete-slide' | 'change-image'; key: number };
  /**
   * Which carousel slide the image browser is filling, or `null` when it is closed.
   *
   * `fileBrowserTargetIndex` upstream, set by `openFileBrowser(e)` and read by `selectFileForSlide`.
   * An INDEX and not a slide key, because that is what `updateCarouselSlide` already addresses a row
   * by — and because the browser is closed before the list can change under it.
   */
  let fileBrowserTargetIndex = $state<number | null>(null);

  /**
   * Which slide is mid-upload, by its KEY rather than its index.
   *
   * `r.uploading` upstream is a flag on the slide object itself, and an index would be the same
   * thing badly: `removeCarouselSlide` renumbers every row after the one it drops, so an upload in
   * flight would light up the wrong spinner the moment a presenter deletes a slide above it. The key
   * is already the identity this list is keyed by.
   *
   * One at a time, because the upload is one `await` — a second `Upload` click on another row while
   * the first is running simply moves the spinner, which is what upstream's per-slide flag would do
   * anyway with two flags set and one visible.
   */
  let uploadingSlideKey = $state<number | null>(null);

  /**
   * `uploadCarouselImage(e, i)` — byte 1,476,460.
   *
   * ```js
   * uploadCarouselImage(e, i) {
   *   const o = e.target, s = o.files?.[0];
   *   if (!s) return;
   *   const r = this.carouselImages[i];
   *   r.uploading = !0;
   *   … POST FormData{image, name} to `${upload_server}/image/${sessionID}` …
   *   success: h => { r.url = h.data.link, r.uploading = !1 },
   *   error:   h => { r.uploading = !1, bootbox.alert("Image upload failed.") }
   *   o.value = ""
   * }
   * ```
   *
   * Four things are transcribed and one is not.
   *
   * **The FIRST file only** — `o.files?.[0]`, even though the input is not `multiple`. Upstream is
   * defensive about a browser handing it more; so is this.
   *
   * **The input is cleared unconditionally**, at the END rather than in either callback — so
   * choosing the same file twice in a row fires `change` again. Without it the second attempt after
   * a failure is silent.
   *
   * **The failure is a dialog**, not a console line: `bootbox.alert("Image upload failed.")`. This
   * component's own `errorMessage` raises the same primitive every other failure here uses.
   *
   * **The URL lands in the slide, and only on success.** A failed upload leaves whatever was there.
   *
   * What is NOT transcribed is the POST. `onUploadImages` already carries this room's upload — CDN
   * when configured, `composer-image.remote.ts` otherwise — and it is the prop the Insert Image
   * dialog has always used. Reproducing the reference's `$.ajax` here would be a second uploader
   * with its own credential handling.
   */
  async function uploadCarouselImage(event: Event, index: number) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    /* Cleared unconditionally and FIRST here rather than last: the `await` below means a `return`
       inside it would otherwise leave the input holding a file it has already consumed. */
    input.value = '';
    if (!file) return;

    const slide = carouselSlides[index];
    if (!slide) return;
    uploadingSlideKey = slide.key;
    try {
      const [url] = await onUploadImages([file]);
      /* Addressed by KEY on the way back, because a slide may have been deleted while this ran. */
      const at = carouselSlides.findIndex((entry) => entry.key === slide.key);
      if (url && at !== -1) updateCarouselSlide(at, 'url', url);
      else if (!url) errorMessage = 'Image upload failed.';
    } catch {
      errorMessage = 'Image upload failed.';
    } finally {
      uploadingSlideKey = null;
    }
  }

  /** `openFileBrowser(e)` — byte 1,477,053, minus the fetch. See `session-image-files.ts`. */
  function openFileBrowser(index: number) {
    fileBrowserTargetIndex = index;
  }

  /**
   * `selectFileForSlide(file)` — put the chosen image in the slide and close the browser.
   *
   * The URL goes in the slide's `url`, never its `link`: the reference's own binding is
   * `z("src", e.vidPath)` on the thumbnail and the slide's image field is what it fills. A presenter
   * who wants the slide to link somewhere types that separately, which is why the row has two
   * inputs.
   */
  function selectFileForSlide(file: SessionImageFile) {
    const index = fileBrowserTargetIndex;
    fileBrowserTargetIndex = null;
    if (index === null) return;
    updateCarouselSlide(index, 'url', file.url);
  }
  let carouselSlideKey = 1;

  function newCarouselSlide(): EditorCarouselSlide {
    return { key: carouselSlideKey++, url: '', link: '', pendingUrl: '' };
  }

  /*
    Seeded once from the props — see the note at the top of this file. `0 === h.length && h.push({})`
    is the reference's own rule: an empty carousel still opens with one blank row to fill.

    `untrack` is the point of the whole block and not noise. Reading a prop in a component body is
    exactly what Svelte's `state_referenced_locally` warns about, because the usual mistake is
    meaning `$derived` and getting a snapshot. Here the snapshot IS the intent, and `untrack` is how
    that is said in code rather than in a comment a future reader could take for a stale one.
  */
  let carouselSlides = $state.raw<readonly EditorCarouselSlide[]>(
    untrack(() =>
      initialSlides.length === 0
        ? [newCarouselSlide()]
        : initialSlides.map((slide) => ({ ...slide, key: carouselSlideKey++, pendingUrl: '' }))
    )
  );
  let carouselInterval = $state(untrack(() => initialInterval));
  let carouselHeight = $state(untrack(() => initialHeight));

  /**
   * `addCarouselImage()` — byte 1,475,568. The new row is scrolled INTO VIEW.
   *
   * ```js
   * addCarouselImage() {
   *   this.carouselImages.push({url:"", link:"", pendingUrl:"", uploading:!1}),
   *   setTimeout(() => {
   *     const e = document.querySelectorAll(".carousel-slide-row");
   *     e[e.length - 1]?.scrollIntoView({behavior:"smooth", block:"nearest"})
   *   })
   * }
   * ```
   *
   * This appended and stopped, and the row it appended landed below the fold: the list is a
   * `max-height: 50vh` scroller inside a `max-height: calc(100vh - 40px)` dialog, so a presenter
   * with six slides pressed ` Add slide ` and nothing appeared to happen.
   *
   * `tick()` rather than upstream's bare `setTimeout`: both wait for the DOM, and `tick` waits for
   * exactly the render that added the row rather than for the next macrotask, so it cannot scroll
   * before the element exists or long after.
   *
   * Scoped to THIS dialog's list rather than `document.querySelectorAll`. The selector is scoped in
   * the reference by there being one such modal on the page; here it is scoped by holding the
   * element, which does not depend on that staying true.
   */
  /*
    `bind:this`. This was an `Attachment` assigning `slidesList = node` with a teardown reading
    `if (slidesList === node) slidesList = null` — a hand-rolled `bind:this`, both halves of it, of
    exactly the shape `dom-reference-contract.svelte.test.ts` refuses and proves unnecessary by
    driving the platform rather than by asserting.

    It escaped that contract on its NAME alone: the check matches `capture*` and `hold*` and this
    was `attachSlidesList`. The rule is the argument, not the prefix.

    Read once after a `tick()`, never rendered from.
  */
  let slidesList: HTMLDivElement | null = $state.raw(null);

  async function addCarouselSlide(): Promise<void> {
    carouselSlides = [...carouselSlides, newCarouselSlide()];
    await tick();
    const rows = slidesList?.querySelectorAll('.carousel-slide-row');
    rows?.[rows.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function updateCarouselSlide(
    index: number,
    field: 'link' | 'pendingUrl' | 'url',
    value: string
  ): void {
    carouselSlides = carouselSlides.map((slide, slideIndex) =>
      slideIndex === index ? { ...slide, [field]: value } : slide
    );
  }

  /**
   * `confirmCarouselImageUrl(e)` — byte 1,475,890. Promotes the staged URL into the slide.
   *
   * ```js
   * confirmCarouselImageUrl(e) {
   *   const i = this.carouselImages[e];
   *   i.pendingUrl.trim() && (i.url = i.pendingUrl.trim())
   * }
   * ```
   *
   * ## Why a TWO-STEP field at all, when a bound input would do
   *
   * Because `url` is what decides which of the row's three states renders. A directly-bound field
   * flips the row into the image preview on the FIRST keystroke — `h` is a URL, so the row swaps to
   * an `<img src="h">` that will never load, and the box the presenter was typing into is gone. The
   * staging field is what lets the row stay an input until there is something worth previewing.
   *
   * `pendingUrl` is TRIMMED on the way in and the untrimmed text stays in the box, which is
   * upstream's shape: the trim decides both the button's enabled state and the value stored.
   */
  function confirmCarouselImageUrl(index: number): void {
    const staged = carouselSlides[index]?.pendingUrl.trim();
    if (!staged) return;
    updateCarouselSlide(index, 'url', staged);
  }

  /**
   * `onCarouselUrlPaste(e, i)` — byte 1,475,962. A pasted IMAGE url confirms itself.
   *
   * ```js
   * onCarouselUrlPaste(e, i) {
   *   const o = e.clipboardData?.getData("text")?.trim();
   *   o && /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|jfif|svg)(\?.*)?$/i.test(o) &&
   *     (e.preventDefault(), this.carouselImages[i].pendingUrl = o, this.confirmCarouselImageUrl(i))
   * }
   * ```
   *
   * The regex is transcribed character for character, `jfif` included. It is deliberately narrow:
   * anything it does not match falls through to the browser's own paste, which fills the box and
   * leaves the presenter to press the check. `preventDefault` fires ONLY on the matching branch,
   * which is why the two are written in that order.
   *
   * The `^https?://` anchor and the `(\?.*)?$` tail are what make it safe to run on a paste: no
   * `javascript:` or `data:` payload can match, and the value goes into an `<img src>`.
   */
  const CAROUSEL_IMAGE_URL = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|jfif|svg)(\?.*)?$/i;

  function onCarouselUrlPaste(event: ClipboardEvent, index: number): void {
    const pasted = event.clipboardData?.getData('text')?.trim();
    if (!pasted || !CAROUSEL_IMAGE_URL.test(pasted)) return;
    event.preventDefault();
    /*
      Both writes in one pass rather than `updateCarouselSlide` twice: the second call would read
      `carouselSlides` from before the first replaced it, because `$state.raw` assignments are not
      visible to synchronous code that already captured the array.
    */
    carouselSlides = carouselSlides.map((slide, slideIndex) =>
      slideIndex === index ? { ...slide, pendingUrl: pasted, url: pasted } : slide
    );
  }

  /**
   * Which carousel row has a confirmation open, and which question — see {@link CarouselConfirm}.
   */
  let carouselConfirm = $state.raw<CarouselConfirm | null>(null);

  /**
   * `removeCarouselImage(e)` — byte 1,475,669. NOT the immediate splice this had before.
   *
   * ```js
   * removeCarouselImage(e) {
   *   window.bootbox.confirm({
   *     message: "Delete this slide?",
   *     buttons: { confirm: {label:"Delete", className:"btn-danger"},
   *                cancel:  {label:"Cancel", className:"btn-default"} },
   *     callback: i => { i && this.carouselImages.splice(e, 1) } })
   * }
   * ```
   *
   * Every other destructive note action in this repository is already raised through
   * `BootboxDialog` from `NotesPane` — delete note, revert version, welcome mat. This is the one
   * that skipped the house pattern, and a slide holds an upload that cannot be recovered from the
   * modal once it is gone.
   */
  function requestRemoveCarouselSlide(index: number): void {
    const slide = carouselSlides[index];
    if (slide) carouselConfirm = { kind: 'delete-slide', key: slide.key };
  }

  /**
   * `clearCarouselImage(e)` — byte 1,476,242. Puts a filled row back into its typing state.
   *
   * ```js
   * clearCarouselImage(e) {
   *   window.bootbox.confirm({
   *     message: "Change this image?",
   *     buttons: { confirm: {label:"Change", className:"btn-warning"},
   *                cancel:  {label:"Cancel", className:"btn-default"} },
   *     callback: i => { if (i) { const o = this.carouselImages[e];
   *                              o.pendingUrl = o.url, o.url = "" } } })
   * }
   * ```
   *
   * The old URL moves INTO the staging field rather than being discarded, so a presenter who
   * changes their mind can press the check and have it back. That is why this is a `clear` and not
   * a delete, and why it is the same two fields the confirm step above works on.
   */
  function requestClearCarouselImage(index: number): void {
    const slide = carouselSlides[index];
    if (slide) carouselConfirm = { kind: 'change-image', key: slide.key };
  }

  /**
   * Both ways out of the carousel modal, so they cannot drift apart.
   *
   * The header X and the footer ` Cancel ` are the same act — the reference dismisses through one
   * `NgbModalRef` for both. The open confirmation is cleared here rather than left to unmounting,
   * because `ondismiss` is the caller's and this component cannot assume what it does.
   */
  function dismissCarouselModal(): void {
    carouselConfirm = null;
    ondismiss();
  }

  function acceptCarouselConfirm(): void {
    const pending = carouselConfirm;
    carouselConfirm = null;
    if (pending === null) return;

    /* Re-found by key: an upload may have completed while the dialog was open. */
    const index = carouselSlides.findIndex((slide) => slide.key === pending.key);
    if (index === -1) return;

    if (pending.kind === 'delete-slide') {
      removeCarouselSlide(index);
      return;
    }

    carouselSlides = carouselSlides.map((slide, slideIndex) =>
      slideIndex === index ? { ...slide, pendingUrl: slide.url, url: '' } : slide
    );
  }

  function removeCarouselSlide(index: number): void {
    carouselSlides = carouselSlides.filter((_slide, slideIndex) => slideIndex !== index);
    if (carouselSlides.length === 0) carouselSlides = [newCarouselSlide()];
  }
  /**
   * Hand the edited carousel back, once.
   *
   * The `https://` filter and the empty check are the caller's, deliberately: `NoteEditor` is what
   * knows whether a slide-less carousel means "insert nothing" or "leave the existing node alone",
   * and it is where `note-editor-insert-carousel-silent-noop` will be answered.
   *
   * `key` and `pendingUrl` are dropped here. Both are this dialog's own bookkeeping — the each
   * block's identity and the URL staging field — and neither has any business on a document node.
   */
  function submitCarousel(): void {
    onsubmit({
      slides: carouselSlides.map(({ link, url }) => ({ link, url })),
      interval: carouselInterval,
      height: carouselHeight
    });
  }
</script>

<!--
  The `{' '}` on the labels below is the capture's own padding — `v(23," Add slide ")`,
  `v(26," Cancel ")`, `Ne(" ",…," ")` on the primary button, `v(3," Select Image ")` in `O0e`. Svelte
  trims whitespace at an element's edges, so only an expression survives; the measurement and the
  argument live in `files-pane-contract.test.ts`'s `the padded text nodes` block.

  ` Upload `, ` Browse ` and ` Change image ` are still UNPADDED, and that is neither an oversight nor
  a measurement: three assertions pin their exact current spelling in two contract tests this change
  was not permitted to touch. `note-padded-labels-contract.test.ts` names all three, with the
  one-line edit each needs.
-->

<!--
  `note-carousel-modal` stood on this element and styled nothing — zero occurrences in the bundle, in
  the reference stylesheet, and in every sheet this app ships. Removed with the file browser's
  `.note-modal-dialog`; `note-dead-control-contract.test.ts` carries both searches.
-->
<!--
  ── THE CAPTURED `aria-labelledby`, TRANSCRIBED 2026-09-01, AND THE REASON IT WAS NOT ──────────

  ```js
  modalService.open(this.carouselModal,   {ariaLabelledBy:"carousel-modal-title",     size:"lg"})
  modalService.open(this.fileBrowserModal,{ariaLabelledBy:"file-browser-modal-title", size:"lg"})
  modalService.open(this.giphySearchPopOver,{ariaLabelledBy:"modal-basic-title"})
  ["id","carousel-modal-title",1,"modal-title"]        // byte 1,484,582
  ["id","file-browser-modal-title",1,"modal-title"]    // byte 1,486,486
  ["id","modal-basic-title",1,"modal-title"]           // byte 1,486,810
  ```

  These were `aria-label` on the dialog instead, and the recorded reason was:

  > a literal document-unique id belongs to a component that is mounted once, and this one is
  > mounted inside `{#if dialog === 'carousel'}` in an editor that a room may hold more than one of

  **The second half is false about this codebase, and `NotesPane.svelte` says so three levels up:**
  *"ours mounts `NoteEditor` only in the panel being edited … `editingNoteId` is a single value — a
  second instance could never be reached."* One editor, one dialog at a time, so a literal id is
  document-unique here exactly as it is upstream.

  `aria-labelledby` is also the better of the two, which is why it is worth the correction rather
  than merely the match: the accessible name becomes the visible heading element, so the two cannot
  drift. `aria-label` is a second copy of the title that a rename leaves behind.

  **The THIRD captured title, `modal-basic-title`, is NOT transcribed, and the difference is the
  measurement rather than the effort.** It labels the Giphy modal, and `GiphyPicker` is mounted at
  FOUR sites — the note editor, both chat columns and the private-chat composer — so a literal id
  there really would appear four times in one document. It already carries an instance-suffixed
  `popoverId` for exactly that reason. Two of the three ids are reproducible and one is not, which
  is a sharper answer than the blanket one that covered all three.

  `note-editor-modal-labelling-contract.test.ts` asserts both premises rather than trusting this
  paragraph — a `{#each}` around `NoteEditor` would make these two ids collide, and the prose would
  still read as true.
-->
<div
  class="note-modal open"
  aria-hidden="false"
  role="dialog"
  aria-labelledby="carousel-modal-title"
>
  <div class="note-modal-content">
    <div class="note-modal-header">
      <!--
        Dismissing has to clear the target as well as the dialog. The reference does the same in
        its modal's rejection handler: `() => { this.isEditingCarousel = !1; }`. Without it the
        next carousel inserted from the toolbar would overwrite the one last opened for editing.
      -->
      <button type="button" class="close" aria-label="Close" onclick={dismissCarouselModal}
        ><i class="note-icon-close"></i></button
      >
      <h4 id="carousel-modal-title" class="note-modal-title">
        <i class="fas fa-images"></i>
        {title}{' '}
      </h4>
    </div>
    <div class="note-modal-body">
      <div class="form-row mb-3">
        <div class="col-md-6">
          <label class="font-weight-bold" for={`${componentId}-carousel-interval`}
            >Rotation interval (seconds)</label
          >
          <input
            id={`${componentId}-carousel-interval`}
            name="noteCarouselInterval"
            class="form-control"
            type="number"
            min="1"
            max="60"
            bind:value={carouselInterval}
          />
        </div>
        <div class="col-md-6">
          <label class="font-weight-bold" for={`${componentId}-carousel-height`}>Height (%)</label>
          <input
            id={`${componentId}-carousel-height`}
            name="noteCarouselHeight"
            class="form-control"
            type="number"
            min="10"
            max="100"
            bind:value={carouselHeight}
          />
        </div>
      </div>
      <span class="font-weight-bold">Slides</span>
      <div class="carousel-slides-list" bind:this={slidesList}>
        {#each carouselSlides as slide, index (slide.key)}
          <div class="carousel-slide-row card mb-2 p-2">
            <!--
              `x0e`'s header row — const 43 the flex line, 44 the `#N` badge, 45 the icon-only
              trash with `ml-auto`, 46 the icon.

              `disabled` is `1 === carouselImages.length`, and it replaces a behaviour that
              reached the same end state by a worse route: deleting the last row here used to
              splice it out and silently re-add a blank one, so the presenter's row appeared to
              survive a delete they had asked for. A disabled button says the same thing without
              the flicker, and it is what the capture does.
            -->
            <div class="d-flex align-items-center mb-1">
              <span class="badge badge-secondary mr-2">#{index + 1}</span>
              <button
                type="button"
                class="btn btn-sm btn-outline-danger ml-auto"
                aria-label="Delete slide #{index + 1}"
                disabled={carouselSlides.length === 1}
                onclick={() => requestRemoveCarouselSlide(index)}
                ><i class="fas fa-trash"></i></button
              >
            </div>
            <!--
              ── THREE STATES, ONE AT A TIME: `O(6, e.uploading ? 6 : e.url ? 8 : 7)` ───────────

              This row was ONE flat state until now — both URL boxes, always — and that is what
              made the two confirmations below impossible to build: ` Change image ` has nothing
              to change while the box that holds the URL is already on screen.

                uploading -> `D0e`, the spinner
                url       -> `k0e`, the preview and ` Change image `
                otherwise -> `E0e`, the file picker, the browser, and the staged URL box
            -->
            {#if uploadingSlideKey === slide.key}
              <!--
                `D0e` — byte 1,462,280. Const 47 the wrapper, 52 the icon, 53 the caption. It
                tells a presenter that a slow upload is still running rather than lost.
              -->
              <div class="text-center py-2">
                <i class="fas fa-spinner fa-spin fa-2x text-primary"></i>
                <div class="small mt-1">Uploading...</div>
              </div>
            {:else if slide.url}
              <!--
                `k0e` — byte 1,463,604. Const 68 the preview box, 69 the image, 70 the button,
                71 `fa-times`. The image is the slide's own `url`, which is the only thing on this
                row that can tell a presenter they picked the right file.
              -->
              <div class="carousel-img-preview mb-2">
                <img class="carousel-preview-img" src={slide.url} alt="Slide {index + 1}" />
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary mt-1"
                  onclick={() => requestClearCarouselImage(index)}
                  ><i class="fas fa-times"></i> Change image</button
                >
              </div>
            {:else}
              <!--
                `E0e` — byte 1,462,334. Const 54 the group, 55/56 the `Image *` label, 57 the
                button line, 58 the hidden file input, 59/60 the Upload label, 61/62 Browse,
                63 the separator, 64 the input group, 65 the staged URL box, 66/67 the check.

                The label-for-hidden-input pattern is the reference's own and is what gives the
                file picker a styled trigger; `cfi_{index}` is its id and the `for` that reaches
                it.

                **THE BROWSE BUTTON WAS LABELLED "Select Image" WHEN IT SHIPPED EARLIER TODAY** —
                that string is the file browser MODAL's title (` Select Image `, byte 1,466,205)
                and the button's is ` Browse `, with classes and icon that were invented too.
              -->
              <div class="form-group mb-2">
                <label class="small font-weight-bold" for="cfi_{index}"
                  >Image <span class="text-danger">*</span></label
                >
                <div class="d-flex align-items-center mb-2">
                  <input
                    type="file"
                    accept="image/*"
                    style="display: none"
                    id="cfi_{index}"
                    onchange={(event) => uploadCarouselImage(event, index)}
                  />
                  <label class="btn btn-sm btn-outline-secondary mb-0" for="cfi_{index}"
                    ><i class="fas fa-upload"></i> Upload</label
                  >
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-info mb-0 ml-1"
                    onclick={() => openFileBrowser(index)}
                    disabled={sessionImages.length === 0}
                    title={sessionImages.length === 0
                      ? 'No images have been uploaded to this room yet.'
                      : 'Choose an image already uploaded to this room'}
                    ><i class="fas fa-folder-open"></i> Browse</button
                  >
                  <span class="text-muted small mx-2">or paste a URL:</span>
                </div>
                <div class="input-group input-group-sm">
                  <!--
                    The STAGED field, not the slide's `url` — see `confirmCarouselImageUrl`. A
                    directly-bound box flips the row into the preview on the first keystroke and
                    takes itself off the screen.

                    `keyup.enter` and `paste` are both the reference's, and `onkeydown` is used
                    here rather than `onkeyup` so the Enter that confirms cannot also submit
                    anything behind it.
                  -->
                  <input
                    class="form-control"
                    type="url"
                    name={`noteCarouselUrl${index}`}
                    aria-label="Image URL for slide #{index + 1}"
                    placeholder="https://example.com/image.jpg"
                    value={slide.pendingUrl}
                    oninput={(event) =>
                      updateCarouselSlide(index, 'pendingUrl', event.currentTarget.value)}
                    onkeydown={(event) => {
                      if (event.key !== 'Enter') return;
                      event.preventDefault();
                      confirmCarouselImageUrl(index);
                    }}
                    onpaste={(event) => onCarouselUrlPaste(event, index)}
                  />
                  <div class="input-group-append">
                    <button
                      type="button"
                      class="btn btn-outline-primary"
                      aria-label="Use this image URL for slide #{index + 1}"
                      disabled={slide.pendingUrl.trim() === ''}
                      onclick={() => confirmCarouselImageUrl(index)}
                      ><i class="fas fa-check"></i></button
                    >
                  </div>
                </div>
              </div>
            {/if}
            <!--
              Const 48 the group, 49/50 the label and its hint, 51 the input. The hint is the
              reference's own and is the only thing on the row that says what a link DOES.
            -->
            <div class="form-group mb-0">
              <label class="small" for={`${componentId}-carousel-link-${index}`}
                >Link URL <span class="text-muted">(optional — clicking the image opens this)</span
                ></label
              >
              <input
                id={`${componentId}-carousel-link-${index}`}
                name={`noteCarouselLink${index}`}
                class="form-control form-control-sm"
                type="url"
                placeholder="https://example.com"
                value={slide.link}
                oninput={(event) => updateCarouselSlide(index, 'link', event.currentTarget.value)}
              />
            </div>
          </div>
        {/each}
      </div>
      <button type="button" class="btn btn-outline-secondary btn-sm mt-1" onclick={addCarouselSlide}
        ><i class="fas fa-plus"></i> Add slide{' '}</button
      >
    </div>
    <div class="note-modal-footer">
      <!--
        The footer held one button, and dismissal was the header X alone. Const 41 is the
        reference's ` Cancel `, and it is the same dismissal — a modal whose only way out is an
        unlabelled X in a corner is one a presenter can fail to find.
      -->
      <button type="button" class="btn btn-outline-dark" onclick={dismissCarouselModal}
        >{' Cancel '}</button
      >
      <button type="button" class="btn btn-primary" onclick={submitCarousel}
        ><i class="fas fa-check"></i> {action}{' '}</button
      >
    </div>
  </div>
</div>

<!--
  ── THE IMAGE BROWSER — `O0e`, byte 1,466,225 ────────────────────────────────────────────────────

  A presenter who had already uploaded an image through Files had no way to reach it from a carousel
  slide: the row offered a bare URL box and nothing else (`note-editor-file-browser-modal`).

  Decoded with this component's own consts table:

    73  [1,"text-center","py-4"]                            the loading state's wrapper
    75  [1,"text-center","py-4","text-muted"]               the empty state's
    76  [1,"fas","fa-images","fa-2x","mb-2"]                its icon
    77  [1,"file-browser-grid"]
    79  [1,"file-browser-item",3,"click","title"]
    80  [1,"file-browser-thumb",3,"src","alt"]
    81  [1,"file-browser-name"]

  and the strings verbatim: ` Select Image `, `No images found. Upload images via Files first.`,
  ` Cancel `. The four CSS rules are in this component's `<style>` below, transcribed from the
  reference's own scoped block at byte 1,486,651.

  ## THE LOADING STATE IS NOT DRAWN, and that is a measured omission

  Upstream's switch is `O(7, fileBrowserLoading ? 7 : 0 === fileBrowserImages.length ? 8 : 9)` —
  three branches, because it POSTs `getSessionFiles` every time the browser opens. This room's list
  arrives with the page load and is invalidated by every upload path, so there is no moment at which
  it is loading. Drawing `Loading images...` here would be a branch that can never render, which is a
  branch that can never be checked — the dead-control shape this repository removes rather than adds.
  `session-image-files.ts` carries the rest of that argument.
-->
{#if fileBrowserTargetIndex !== null}
  <!--
    FOUR THINGS THIS MODAL GOT WRONG, all found by decoding `O0e` (byte 1,466,225) node by node
    rather than by its strings — which were the half that was already right.

      1  a `.note-modal-dialog` wrapper with no rule in any sheet and no counterpart in `O0e`
      2  a `fas fa-images` header icon where `T(2,"i",62)` is `fas fa-folder-open`
      3  a `btn-close` where const 28 is Bootstrap 4's `close`, the spelling the four sibling
         dialogs in this file and in `NoteEditor` already use
      4  a `btn btn-secondary` footer where const 41 is `btn btn-outline-dark` — the SAME const the
         carousel modal above uses, so one file drew its two dismissals as two different buttons

    `note-file-browser-chrome-contract.test.ts` carries the four measurements, the const values, and
    why upstream's empty `<span aria-hidden="true">` close-button child is the one thing here that is
    deliberately not transcribed. `aria-labelledby` and its id are the CAPTURE's since 2026-09-01 —
    see the note on the carousel dialog above for the premise that changed.
  -->
  <div
    class="note-modal open"
    aria-hidden="false"
    role="dialog"
    aria-labelledby="file-browser-modal-title"
  >
    <div class="note-modal-content">
      <div class="note-modal-header">
        <h4 id="file-browser-modal-title" class="note-modal-title">
          <i class="fas fa-folder-open"></i> Select Image{' '}
        </h4>
        <button
          type="button"
          class="close"
          aria-label="Close"
          onclick={() => (fileBrowserTargetIndex = null)}><i class="note-icon-close"></i></button
        >
      </div>
      <div class="note-modal-body">
        {#if sessionImages.length === 0}
          <div class="text-center py-4 text-muted">
            <i class="fas fa-images fa-2x mb-2"></i>
            <div>No images found. Upload images via Files first.</div>
          </div>
        {:else}
          <div class="file-browser-grid">
            {#each sessionImages as file (file.url)}
              <!--
                A BUTTON where the reference uses a clickable `<div>` (const 79 carries `click` on
                a plain div). This one diverges deliberately: the element exists to be activated,
                so it has to be reachable from a keyboard, and `type="button"` is what keeps it out
                of the enclosing form. The three class strings are the capture's and are what the
                transcribed CSS targets.
              -->
              <button
                type="button"
                class="file-browser-item"
                title={file.name}
                onclick={() => selectFileForSlide(file)}
              >
                <img class="file-browser-thumb" src={file.url} alt={file.name} />
                <div class="file-browser-name">{file.name}</div>
              </button>
            {/each}
          </div>
        {/if}
      </div>
      <div class="note-modal-footer">
        <button
          type="button"
          class="btn btn-outline-dark"
          onclick={() => (fileBrowserTargetIndex = null)}>{' Cancel '}</button
        >
      </div>
    </div>
  </div>
{/if}

<!--
  ── THE TWO CAROUSEL CONFIRMATIONS ──────────────────────────────────────────────────────────────

  `removeCarouselImage` (byte 1,475,669) and `clearCarouselImage` (byte 1,476,242) each raise a
  `window.bootbox.confirm` with its own labels and classes:

    "Delete this slide?"   confirm { label: "Delete", className: "btn-danger"  }  cancel btn-default
    "Change this image?"   confirm { label: "Change", className: "btn-warning" }  cancel btn-default

  Both were missing, and this was the one destructive path in the note surface that skipped the
  house pattern — `NotesPane` already raises delete-note, revert-version and welcome-mat through
  this same primitive. A slide holds an upload that cannot be recovered from the modal once gone.

  One `BootboxDialog` for both questions rather than two, because they are mutually exclusive: the
  union in `carouselConfirm` cannot represent both being open, where two blocks could.

  The `footer` snippet is what carries the reference's labels and classes; the default OK/Cancel
  pair would lose all four. `bootbox-accept` stays on the confirm button — `BootboxDialog` focuses
  that class on mount, and dropping it would open a modal with nothing focused.
-->
{#if carouselConfirm !== null}
  <BootboxDialog
    mode="confirm"
    className="above-note-modal"
    message={carouselConfirm.kind === 'delete-slide' ? 'Delete this slide?' : 'Change this image?'}
    onclose={() => (carouselConfirm = null)}
    onconfirm={acceptCarouselConfirm}
  >
    {#snippet footer()}
      <button
        type="button"
        class="btn btn-default bootbox-cancel"
        onclick={() => (carouselConfirm = null)}>Cancel</button
      >
      <button
        type="button"
        class={carouselConfirm?.kind === 'delete-slide'
          ? 'btn btn-danger bootbox-accept'
          : 'btn btn-warning bootbox-accept'}
        onclick={acceptCarouselConfirm}
        >{carouselConfirm?.kind === 'delete-slide' ? 'Delete' : 'Change'}</button
      >
    {/snippet}
  </BootboxDialog>
{/if}

{#if errorMessage !== null}
  <BootboxDialog
    mode="alert"
    className="above-note-modal"
    message={errorMessage}
    onclose={() => (errorMessage = null)}
  />
{/if}

<style>
  /*
    The carousel's four rules and the image browser's four, transcribed value for value from the
    reference's own scoped blocks at bytes 1,488,253 and 1,486,651 with the `[_ngcontent-%COMP%]`
    attribute selectors dropped — Svelte's `<style>` gives this component the same scoping Angular's
    attribute did, which is why they live beside the markup rather than in a shared sheet.

    `.carousel-slide-row` REPLACES AN INVENTED RULE: a hand-written grid with a bottom border. The
    reference's is a bordered card on a tinted ground, and the spacing comes from the `card mb-2 p-2`
    classes const 37 carries rather than from the rule. A rule picked because it looked right is the
    shape this repository removes.

    `max-height: 50vh` plus `overflow-y` on the list is what keeps a ten-slide carousel from pushing
    the modal's footer off the screen; `object-fit: contain` on the preview with a dark ground is
    what shows a presenter the WHOLE image they picked rather than a centre crop of it. On the
    browser side, `object-fit: cover` on the thumb and the three ellipsis properties on the name are
    what make a grid of differently-shaped uploads read as a grid, and `minmax(130px, 1fr)` with
    `auto-fill` is what makes it reflow instead of scrolling sideways.
  */
  .carousel-slides-list {
    max-height: 50vh;
    overflow-y: auto;
  }

  .carousel-slide-row {
    border: 1px solid #dee2e6;
    background-color: #fafafa;
  }

  .carousel-img-preview {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .carousel-img-preview .carousel-preview-img {
    max-height: 140px;
    max-width: 100%;
    object-fit: contain;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    background: #111;
  }

  .file-browser-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 10px;
    max-height: 60vh;
    overflow-y: auto;
  }

  .file-browser-item {
    cursor: pointer;
    border: 2px solid transparent;
    border-radius: 6px;
    overflow: hidden;
    text-align: center;
    padding: 4px;
    transition:
      border-color 0.15s,
      background 0.15s;
    /* OURS: the element is a `<button>` here rather than the capture's clickable `<div>`, so the
       three properties a button brings and a div does not are reset to the div's. */
    background: none;
    width: 100%;
    display: block;
  }

  .file-browser-item:hover {
    border-color: #0d6efd;
    background: #f0f6ff;
  }

  .file-browser-thumb {
    width: 100%;
    height: 100px;
    object-fit: cover;
    border-radius: 4px;
    display: block;
  }

  .file-browser-name {
    font-size: 0.72rem;
    color: #555;
    margin-top: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /*
    The modal chrome. `NoteEditor` carries the same three rules for its own dialogs; they are
    repeated rather than shared because Svelte scopes a `<style>` to the component that declares it,
    and the alternative — hoisting them into a global sheet — would make one editor's modal depend
    on another component's stylesheet still existing.
  */
  .note-modal.open {
    display: block;
    z-index: 1070;
  }

  .note-modal.open::before {
    position: fixed;
    z-index: -1;
    background: rgba(0, 0, 0, 0.5);
    content: '';
    inset: 0;
  }

  .note-modal.open .note-modal-content {
    max-height: calc(100vh - 40px);
    margin: 20px auto;
    overflow: auto;
  }
</style>
