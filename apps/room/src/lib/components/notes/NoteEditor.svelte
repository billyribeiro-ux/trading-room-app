<script lang="ts">
  import { Editor } from '@tiptap/core';
  import Link from '@tiptap/extension-link';
  import { TableKit } from '@tiptap/extension-table';
  import TextAlign from '@tiptap/extension-text-align';
  import { TextStyleKit } from '@tiptap/extension-text-style';
  import Underline from '@tiptap/extension-underline';
  import Youtube from '@tiptap/extension-youtube';
  import StarterKit from '@tiptap/starter-kit';
  import { onMount } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import BootboxDialog from '#lib/components/BootboxDialog.svelte';
  import EmojiPicker from '#lib/components/EmojiPicker.svelte';
  import GiphyPicker from '#lib/components/GiphyPicker.svelte';
  import Modal from '#lib/components/Modal.svelte';
  import { FONT_FAMILIES, FONT_SIZES, LINE_HEIGHTS, NOTE_PALETTE_ROWS } from '#lib/note-palette.js';
  import type { NoteVersion } from '#lib/types.js';
  import type { SessionImageFile } from '#lib/session-image-files.js';

  import GifConfirmDialog from '#lib/components/GifConfirmDialog.svelte';

  import CarouselDialog from './CarouselDialog.svelte';
  import {
    PtrCarousel,
    findCarousel,
    hasCarousel,
    normalizeSlides,
    numericRange,
    type CarouselSlide
  } from './carousel';
  import { IMAGE_FLOATS, IMAGE_WIDTHS, NoteImage } from './note-image';
  import { safeNoteHtml } from './safe-html';
  import { noteVersionDate, noteVersionPreview } from './version-history';

  type ToolbarMenu =
    'align' | 'color' | 'emoji' | 'font' | 'fontSize' | 'lineHeight' | 'style' | 'table';

  type EditorDialog = 'carousel' | 'image' | 'link' | 'video';

  interface Props {
    readonly contentHtml: string;
    readonly giphyApiKey: string;
    readonly onBringEveryone: () => void;
    readonly onDirtyChange: (dirty: boolean) => void;
    readonly onDone: () => void;
    /*
      The revert is REQUESTED here and confirmed by the pane, exactly as `onSetWelcomeMat` is.
      `revertToVersion` in the reference opens a `bootbox.confirm` before it touches anything, and
      every other destructive note action in this app raises that dialog from `NotesPane`.
    */
    readonly onRequestRestore: (version: NoteVersion) => void;
    readonly onSave: (contentHtml: string) => void | Promise<void>;
    readonly onSetWelcomeMat: (allRooms: boolean) => void;
    readonly onUploadImages: (files: readonly File[]) => Promise<readonly string[]>;
    /*
      The panel's open state and its list both live in `NotesPane`, not here.

      This component is re-created whenever the note's `updatedAt` changes — that is what the
      `{#key}` around it is for — and the three-second autosave changes `updatedAt`. State kept
      here would therefore close the panel underneath a presenter who is reading it.
    */
    readonly onVersionHistoryOpenChange: (open: boolean) => void;
    readonly showVersionHistory: boolean;
    /*
      "Simplified Note Editor?" - foreground-only colour. `resolveNoteSurfaceGates` holds the
      transcription, what the capture does and does not evidence, and the one decision taken beyond
      it; this component only draws the two shapes.
    */
    /**
     * The room's shared IMAGE files, already filtered — the carousel's "Select Image" browser.
     *
     * Filtered by the page rather than here (`#lib/session-image-files.ts`), for the reason every
     * other room fact reaches this component already decided. The reference fetches this list on
     * every open (`getSessionFiles`, byte 1,477,053); the page load already carries the same rows
     * and every upload path invalidates it, so the browser reads what the Files pane reads.
     */
    readonly sessionImages: readonly SessionImageFile[];
    readonly simplifiedEditor: boolean;
    readonly versions: readonly NoteVersion[];
  }

  let {
    contentHtml,
    giphyApiKey,
    onBringEveryone,
    onDirtyChange,
    onDone,
    onRequestRestore,
    onSave,
    onSetWelcomeMat,
    onUploadImages,
    onVersionHistoryOpenChange,
    showVersionHistory,
    sessionImages,
    simplifiedEditor,
    versions
  }: Props = $props();

  const componentId = $props.id();
  let host: HTMLDivElement | undefined;
  let editor = $state<Editor | null>(null);
  let revision = $state(0);
  let dirty = $state(false);
  let saving = $state(false);
  let openMenu = $state<ToolbarMenu | null>(null);
  let dialog = $state<EditorDialog | null>(null);
  let errorMessage = $state<string | null>(null);
  let fullscreen = $state(false);
  let codeView = $state(false);
  let codeHtml = $state('');
  let editorHeight = $state(360);
  let uploading = $state(false);
  let linkText = $state('');
  let linkUrl = $state('https://');
  let linkNewWindow = $state(true);
  let imageUrl = $state('');
  let imageFiles = $state.raw<readonly File[]>([]);
  let videoUrl = $state('');
  /**
   * What the carousel dialog OPENS on — a seed, not live state.
   *
   * `CarouselDialog` owns everything the presenter types; this holds only what it starts from, and
   * the dialog is mounted inside `{#if dialog === 'carousel'}` so it is re-seeded on every open.
   * Plain {@link CarouselSlide}s: the each-block key and the URL staging field are the dialog's own
   * bookkeeping and never leave it.
   */
  let carouselSeed = $state.raw<{
    slides: readonly CarouselSlide[];
    interval: number;
    height: number;
  }>({ slides: [], interval: 5, height: 90 });

  let editingCarouselPos = $state<number | null>(null);
  let giphyOpen = $state(false);
  let revisionQueued = false;

  function refreshToolbarState(): void {
    if (revisionQueued) return;
    revisionQueued = true;
    queueMicrotask(() => {
      revisionQueued = false;
      if (editor !== null) revision += 1;
    });
  }

  const attachHost: Attachment<HTMLDivElement> = (node) => {
    host = node;
    return () => {
      if (host === node) host = undefined;
    };
  };

  onMount(() => {
    const element = host;
    if (element === undefined) return;
    codeHtml = contentHtml;

    const instance = new Editor({
      content: contentHtml,
      element,
      extensions: [
        StarterKit.configure({
          link: false,
          underline: false
        }),
        Underline,
        Link.configure({
          autolink: false,
          defaultProtocol: 'https',
          openOnClick: false,
          protocols: ['https']
        }),
        TextStyleKit,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        NoteImage.configure({ allowBase64: false }),
        Youtube.configure({
          controls: true,
          nocookie: true,
          modestBranding: true
        }),
        TableKit.configure({
          table: { resizable: true }
        }),
        PtrCarousel
      ],
      editorProps: {
        attributes: {
          'aria-label': 'Note content',
          'aria-multiline': 'true',
          autocorrect: 'true',
          class: 'note-editable',
          role: 'textbox',
          spellcheck: 'true'
        }
      },
      onCreate: () => {
        refreshToolbarState();
      },
      onSelectionUpdate: () => {
        refreshToolbarState();
      },
      onTransaction: () => {
        refreshToolbarState();
      },
      onUpdate: () => {
        setDirty(true);
      }
    });

    editor = instance;
    const timer = window.setInterval(() => {
      if (dirty) void flushSave();
    }, 3000);

    return () => {
      window.clearInterval(timer);
      if (dirty) void flushSave();
      instance.destroy();
      if (editor === instance) editor = null;
    };
  });

  /*
    `carouselInNote` in the reference, which computes it once when the editor opens as
    `(this.tab.noteContent || '').includes('data-ptr-carousel')`. Ours tracks the live document
    instead, so inserting a carousel makes the button appear without reopening the note.

    Existence only, and it stops descending as soon as it finds one — this is read on every editor
    transaction, so it must not be a full walk of a long note per keystroke.
  */
  let carouselInNote = $derived.by(() => {
    void revision;
    return editor !== null && hasCarousel(editor.state.doc);
  });

  /**
   * The image the caret is on, and the three things the popover can do to it.
   *
   * `void revision` for the same reason `carouselInNote` does it: `revision` is bumped by
   * `onSelectionUpdate`, so reading it is what makes this recompute when the caret moves. A
   * `$derived` and not an `$effect` — the value is derived from editor state and nothing else, and
   * an effect assigning it would re-run per keystroke to produce the same answer.
   *
   * `isActive('image')` rather than inspecting the node ourselves: it is what the editor already
   * uses for every other toolbar button here, and it answers for a node selection and a caret
   * inside an inline image alike.
   */
  let imageSelected = $derived.by(() => {
    void revision;
    return editor !== null && editor.isActive('image');
  });

  let imageWidth = $derived.by(() => {
    void revision;
    const value: unknown = editor?.getAttributes('image').width;
    return typeof value === 'string' ? value : null;
  });

  let imageFloat = $derived.by(() => {
    void revision;
    const value: unknown = editor?.getAttributes('image').float;
    return typeof value === 'string' ? value : null;
  });

  /*
    `updateAttributes` and not a replacement node: the image keeps its `src`, `alt` and everything
    else, and a `null` clears the attribute rather than writing the string "null". That is what makes
    `resizeNone` and `floatNone` the ABSENCE of a value, which is what the capture's names say.
  */
  function setImageWidth(width: string | null): void {
    command((instance) => instance.chain().focus().updateAttributes('image', { width }).run());
  }

  function setImageFloat(float: string | null): void {
    command((instance) => instance.chain().focus().updateAttributes('image', { float }).run());
  }

  /**
   * `removeMedia` — delete the selected image.
   *
   * `deleteSelection` rather than a node-specific delete, because `isActive('image')` is already the
   * condition for showing this control and the selection IS the image when it is true.
   */
  function removeImage(): void {
    command((instance) => instance.chain().focus().deleteSelection().run());
  }

  /** The modal is editing an existing carousel rather than placing a new one. */
  let isEditingCarousel = $derived(editingCarouselPos !== null);
  /*
    `M0e` swings both of these on that flag: `Ne(' ', e.isEditingCarousel ? 'Edit' : 'Insert',
    ' Image Carousel ')` for the heading and `Ne(' ', e.isEditingCarousel ? 'Save Changes' :
    'Insert Carousel', ' ')` for the button.

    The heading previously read "Insert an image carousel" here, which is the text of the TOOLBAR
    BUTTON's tooltip in `carouselButton()`, not of the modal title. Corrected to the captured one
    while adding the mode it switches on.
  */
  let carouselDialogTitle = $derived(`${isEditingCarousel ? 'Edit' : 'Insert'} Image Carousel`);
  let carouselDialogAction = $derived(isEditingCarousel ? 'Save Changes' : 'Insert Carousel');

  /*
    `editCarousel()` reads the note's HTML, takes the FIRST `[data-ptr-carousel]`, and pulls its
    interval, height and slides back into the same modal. Ours works on the document rather than on
    a string, because Tiptap already holds those three as node attributes — `parseCarouselConfig`
    and `parseCarouselSlides` put them there when the note was parsed. There is nothing to re-read.
  */
  function editCarousel(): void {
    const instance = editor;
    if (instance === null) return;
    // The selection is passed so that clicking a carousel and then this button edits THAT one;
    // `findCarousel` documents why that differs from the reference and when it does not.
    const target = findCarousel(instance.state.doc, instance.state.selection.from);
    if (target === null) return;

    openMenu = null;
    giphyOpen = false;
    const slides = normalizeSlides(target.attrs.slides);
    // An empty carousel still opens with one blank row to fill — `CarouselDialog` applies that rule
    // (`0 === h.length && h.push({...})`), because it is the one that owns the rows.
    carouselSeed = {
      slides,
      interval: numericRange(target.attrs.interval, 1, 60, 5),
      height: numericRange(target.attrs.height, 10, 100, 90)
    };
    editingCarouselPos = target.pos;
    dialog = 'carousel';
  }

  function setDirty(value: boolean): void {
    if (dirty === value) return;
    dirty = value;
    onDirtyChange(value);
  }

  async function flushSave(force = false): Promise<void> {
    const instance = editor;
    if (instance === null || saving || (!dirty && !force)) return;

    saving = true;
    const html = codeView ? codeHtml : instance.getHTML();
    try {
      await onSave(html);
      setDirty(false);
    } catch (error: unknown) {
      errorMessage = error instanceof Error ? error.message : 'Unable to save the note.';
    } finally {
      saving = false;
    }
  }

  async function done(): Promise<void> {
    if (codeView && editor !== null) {
      editor.commands.setContent(codeHtml);
      codeView = false;
      setDirty(true);
    }
    await flushSave(true);
    if (!dirty) onDone();
  }

  function active(name: string, attributes?: Readonly<Record<string, unknown>>): boolean {
    void revision;
    return editor?.isActive(name, attributes) ?? false;
  }

  function command(run: (instance: Editor) => boolean): void {
    const instance = editor;
    if (instance === null || codeView) return;
    run(instance);
    openMenu = null;
  }

  function toggleMenu(menu: ToolbarMenu): void {
    giphyOpen = false;
    openMenu = openMenu === menu ? null : menu;
  }

  function setBlock(kind: 'blockquote' | 'codeBlock' | 'paragraph' | 1 | 2 | 3 | 4 | 5 | 6): void {
    command((instance) => {
      const chain = instance.chain().focus();
      if (kind === 'paragraph') return chain.setParagraph().run();
      if (kind === 'blockquote') return chain.toggleBlockquote().run();
      if (kind === 'codeBlock') return chain.toggleCodeBlock().run();
      return chain.toggleHeading({ level: kind }).run();
    });
  }

  function toggleCodeView(): void {
    const instance = editor;
    if (instance === null) return;
    if (codeView) {
      instance.commands.setContent(codeHtml);
      setDirty(true);
      codeView = false;
    } else {
      codeHtml = instance.getHTML();
      codeView = true;
    }
    openMenu = null;
  }

  function openDialog(kind: EditorDialog): void {
    openMenu = null;
    giphyOpen = false;
    dialog = kind;
    if (kind === 'link') {
      const attributes = editor?.getAttributes('link') ?? {};
      linkUrl = typeof attributes.href === 'string' ? attributes.href : 'https://';
      linkText =
        editor?.state.doc.textBetween(
          editor.state.selection.from,
          editor.state.selection.to,
          ' '
        ) ?? '';
      linkNewWindow = attributes.target === '_blank' || attributes.target === undefined;
    } else if (kind === 'image') {
      imageUrl = '';
      imageFiles = [];
    } else if (kind === 'video') {
      videoUrl = '';
    } else {
      carouselSeed = { slides: [], interval: 5, height: 90 };
      // Opened from the toolbar, so this places a NEW carousel however the last one was reached.
      editingCarouselPos = null;
    }
  }

  function insertLink(): void {
    const href = linkUrl.trim();
    if (!href.startsWith('https://') || editor === null) return;
    const target = linkNewWindow ? '_blank' : '_self';
    const chain = editor.chain().focus();
    if (linkText.trim() && editor.state.selection.empty) {
      chain
        .insertContent(linkText.trim())
        .setTextSelection({
          from: Math.max(1, editor.state.selection.from),
          to: Math.max(1, editor.state.selection.from + linkText.trim().length)
        })
        .setLink({ href, target })
        .run();
    } else {
      chain.extendMarkRange('link').setLink({ href, target }).run();
    }
    dialog = null;
  }

  async function insertImages(): Promise<void> {
    const instance = editor;
    if (instance === null || uploading) return;
    uploading = true;
    try {
      const urls = imageFiles.length > 0 ? await onUploadImages(imageFiles) : [imageUrl.trim()];
      for (const url of urls) {
        if (url.startsWith('https://')) {
          instance.chain().focus().setImage({ src: url }).run();
        }
      }
      dialog = null;
    } catch (error: unknown) {
      errorMessage = error instanceof Error ? error.message : 'Image upload failed.';
    } finally {
      uploading = false;
    }
  }

  function insertVideo(): void {
    const url = videoUrl.trim();
    if (!url.startsWith('https://')) return;
    command((instance) => instance.chain().focus().setYoutubeVideo({ src: url }).run());
    dialog = null;
  }

  /**
   * What `CarouselDialog` hands back, put into the document.
   *
   * The dialog edits; this decides where the result lands, because only the editor knows whether
   * the modal was opened over an existing node. The `https://` filter stays HERE rather than moving
   * with the rows: it is a rule about what the document will accept, not about what a presenter may
   * type, and `parseCarouselSlides` applies the same one on the way back in.
   */
  function insertCarousel(config: {
    slides: readonly CarouselSlide[];
    interval: number;
    height: number;
  }): void {
    const instance = editor;
    const slides = config.slides.filter(({ url }) => url.trim().startsWith('https://'));
    /*
      `window.bootbox.alert("Please add at least one image URL.")` — byte 1,478,230, the else of the
      reference's own `generateCarouselHtml()` check. This RETURNED SILENTLY, which is the shape
      `CLAUDE.md` names outright: the primary button is always enabled, so pressing Insert Carousel
      with an empty or non-`https://` slide list closed nothing, inserted nothing and said nothing.

      The dialog is deliberately left OPEN — the presenter is being told to fix the thing in front of
      them, and closing it would take away the rows they have to fix. That is upstream's order too:
      only the success branch dismisses.

      A missing editor is NOT this message. That is a bug in this component, not a mistake by the
      presenter, and telling them to add an image URL would send them to look at working input.
    */
    if (instance === null) return;
    if (slides.length === 0) {
      errorMessage = 'Please add at least one image URL.';
      return;
    }

    const attrs = {
      slides: slides.map(({ link, url }) => ({ link, url })),
      interval: numericRange(config.interval, 1, 60, 5),
      height: numericRange(config.height, 10, 100, 90)
    };
    const pos = editingCarouselPos;

    /*
      Save Changes rewrites the existing node's attributes where it stands. The reference cannot do
      that — it re-serialises the whole note, swaps the matching element in a detached document, and
      writes the entire body back — because its editor only ever holds an HTML string. Here the
      surrounding content is never rewritten, so nothing else in the note can be disturbed by it.

      Re-checked rather than trusted: the position was recorded when the modal opened, and a node
      that is no longer a carousel means the document moved underneath it. That inserts instead of
      overwriting whatever is now in that place.
    */
    if (pos !== null && instance.state.doc.nodeAt(pos)?.type.name === 'ptrCarousel') {
      instance.view.dispatch(instance.state.tr.setNodeMarkup(pos, undefined, attrs));
    } else {
      instance.chain().focus().insertContent({ type: 'ptrCarousel', attrs }).run();
    }

    editingCarouselPos = null;
    dialog = null;
  }

  function insertEmoji(glyph: string): void {
    editor?.chain().focus().insertContent(glyph).run();
    openMenu = null;
  }

  /**
   * The GIF a double-click chose, waiting for the confirmation — `note-editor-gif-insert-confirm`.
   *
   * ```js
   * sendGif(e, i) {                                                  // byte 1,482,885
   *   this.sendingGif || (
   *     this.modalService.dismissAll(),
   *     this.sendingGif = !0,
   *     bootbox.confirm(
   *       `You sure you want to insert this image:<br/><img src='${i}' style='width: 100%;'>`,
   *       o => { this.sendingGif = !1,
   *              o && $("#summernoteEdit-" + this.tab._id).summernote("insertImage", i, e) }))
   * }
   * ```
   *
   * This inserted immediately. The preview is the point: a Giphy result is a thumbnail in a grid,
   * and the thing that lands in the note is the ORIGINAL — a different, larger image the presenter
   * has not seen at the size it will appear.
   *
   * `this.sendingGif` is a re-entrancy guard and it is transcribed as one. A double-click that
   * registers twice — which is what a double-click on a slow machine does — inserted two copies.
   * Holding the pending GIF in one nullable value is that guard: a second `onselect` while one is
   * pending is refused rather than replacing it, because the presenter is looking at a preview of
   * the first and would confirm a different image than the one on screen.
   *
   * The picker closes on select, which is upstream's `modalService.dismissAll()`.
   */
  let pendingGif = $state.raw<{ title: string; url: string } | null>(null);

  function insertGif(title: string, url: string): void {
    giphyOpen = false;
    if (pendingGif !== null) return;
    if (!url.startsWith('https://')) return;
    pendingGif = { title, url };
  }

  function confirmGif(): void {
    const chosen = pendingGif;
    pendingGif = null;
    if (chosen === null) return;
    editor?.chain().focus().setImage({ src: chosen.url, alt: chosen.title }).run();
  }

  function startResize(event: PointerEvent): void {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = editorHeight;
    const move = (moveEvent: PointerEvent) => {
      editorHeight = Math.max(180, startHeight + moveEvent.clientY - startY);
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  }
</script>

<app-note>
  <!--
    `{' '}` ON EVERY LABEL BELOW, AND WHY IT IS AN EXPRESSION RATHER THAN A SPACE

    `T0e` pads its text nodes: `v(3," Set as Welcome Mat ")`, `v(9," Bring Everyone here ")`,
    `v(14," Done ")`, `Ne(" Version History (", n, ") ")`, and `S0e`'s `v(8," Revert ")`. Svelte
    trims whitespace at the edges of an element's children, so a trailing space written as text is
    compiled away and only an expression survives — measured, not assumed, in
    `files-pane-contract.test.ts`'s `the padded text nodes` block, which is where the argument for
    the idiom lives and where the FilesPane trio next door is pinned. No pixel depends on it; the DOM
    text node does, and that is what a byte-for-byte comparison of the two trees reads.

    The LEADING space needs nothing: it sits between the icon element and the text, where Svelte
    keeps it.
  -->
  <div class="d-flex justify-content-end align-items-center flex-wrap">
    <button
      class="btn btn-light text-center m-1"
      type="button"
      onclick={() => onSetWelcomeMat(false)}
      ><i class="fas fa-home"></i> Set as Welcome Mat{' '}
    </button>
    <button
      class="btn btn-light text-center m-1"
      type="button"
      onclick={() => onSetWelcomeMat(true)}
      ><i class="fas fa-home"></i> Apply as Welcome Mat to all rooms{' '}
    </button>
    <button class="btn btn-success text-center m-1" type="button" onclick={onBringEveryone}
      ><i class="fas fa-eye"></i> Bring Everyone here{' '}
    </button>
    <!--
      `F0e`, rendered by `T0e` only when `carouselInNote`. Const 14 gives the classes, 15 the icon.
      It reopens a carousel already in the note; the toolbar's own Carousel button always inserts.
    -->
    {#if carouselInNote}
      <button class="btn btn-secondary text-center m-1" type="button" onclick={editCarousel}
        ><i class="fas fa-images"></i> Edit Carousel{' '}
      </button>
    {/if}
    <!--
      `C0e` in `docs/source/components/app-note.full.js`, rendered by `T0e` only when
      `prevVersions.length > 0` — a note with no history offers no button at all, rather than a
      disabled one. Consts 16 and 17 of that component's own table give the classes and the icon;
      the label carries the count, and `active` tracks the open panel.

      WHEN that becomes non-empty differs from the reference, and only in our favour: it stores the
      content a version is replacing, so nothing exists until a second edit, while `saveNote` here
      writes a row on every save including the first.
    -->
    {#if versions.length > 0}
      <button
        class={['btn btn-warning text-center m-1', { active: showVersionHistory }]}
        type="button"
        onclick={() => onVersionHistoryOpenChange(!showVersionHistory)}
        ><i class="fas fa-history"></i> Version History ({versions.length}){' '}
      </button>
    {/if}
    <button class="btn btn-primary text-center m-1" type="button" onclick={() => void done()}
      ><i class="fas fa-check"></i> {saving ? 'Saving…' : 'Done'}{' '}
    </button>
  </div>

  <!--
    `w0e`, a SIBLING of the button bar rather than a child of it: the reference closes the bar with
    a double `u()()` before declaring this panel. Consts 13 and 18-25 give every class below.
  -->
  {#if showVersionHistory}
    <div class="version-history-panel card mt-2 mb-2">
      <div class="card-header">
        <strong><i class="fas fa-history"></i> Previous Versions</strong>
        <button
          type="button"
          class="close float-right"
          aria-label="Close version history"
          onclick={() => onVersionHistoryOpenChange(false)}
        >
          <span>×</span>
        </button>
      </div>
      <ul class="list-group list-group-flush">
        <!--
          Keyed on the row id. The reference tracks by `timestamp` because its versions are
          localStorage objects with no identity of their own; ours are rows, so the primary key is
          the same idea said properly.
        -->
        {#each versions as version (version.id)}
          <li class="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <span class="badge bg-secondary text-light">{noteVersionDate(version.createdAt)}</span
              >
              <!--
                The reference pipes this preview through `noSanitize` into `innerHTML`. We do not:
                `noteVersionPreview` strips tags with a regex, which leaves entity-encoded markup
                untouched, so the string still reaches the DOM through the allowlist every other
                note body uses. Same rendering for real content, and no path for the other kind.
              -->
              <div
                class="version-preview"
                {@attach safeNoteHtml(noteVersionPreview(version.contentHtml ?? ''))}
              ></div>
            </div>
            <button
              class="btn btn-sm btn-outline-primary"
              type="button"
              onclick={() => onRequestRestore(version)}
            >
              <i class="fas fa-undo"></i> Revert{' '}
            </button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <!--
    ── A HIDDEN ELEMENT NOTHING READ, DELETED 2026-08-30 ────────────────────────────────────────

    `<div id="summernoteEdit-{noteId}" class="note-view" hidden></div>` stood here. It was the
    reference's mount point: summernote initialises ON the `.note-view` element and then REPLACES it
    with its own frame, so upstream has ONE element that is both the rendered note and the editor.

    Ours does not work that way. Tiptap mounts into `.note-editor-host` below, and the read-only
    rendered note is `NotesPane.svelte`'s own `.note-view#summernoteEdit-{id}` in the non-editing
    branch. So this element was a mount point for a library this app does not use, hidden, holding
    nothing, read by nothing, written by nothing — `CLAUDE.md`'s "nothing exists without a consumer"
    in its purest form, and `note-editor-height-and-mount` said so.

    A duplicate `id` in the document was the second cost: `NotesPane` renders the same id for the
    same note, so `document.getElementById('summernoteEdit-3')` could return either, and which one
    depended on render order. Nothing looked it up here, but the reference's own code does exactly
    that lookup and a port of any of it would have found the empty one.

    **THE `noteId` PROP WENT WITH IT, because that div was its only reader.** eslint said so on the
    first gate run after the deletion, and the prop was then exactly what the div had been: a value
    handed in that nothing consumes. `NotesPane` already passes `activeNote.id` into every callback
    it needs it in — `onSave`, `onDelete`, `onRestoreVersion` — so the editor never had to know its
    own id, and the version endpoint this component reads is reached through `onLoadVersions`.
  -->
  <!--
    ── THE IMAGE POPOVER'S THREE BUILT GROUPS — `note-editor-image-popover` ─────────────────────

    ```js
    popover: { image: [                                          // reference byte 1,469,073
      ["custom", ["imageAttributes"]],
      ["image",  ["resizeFull","resizeHalf","resizeQuarter","resizeNone"]],
      ["float",  ["floatLeft","floatRight","floatNone"]],
      ["remove", ["removeMedia"]]
    ]}
    ```

    Once an image was in a note there was no way to resize it, float it or remove it — only a raw
    text delete.

    **WHAT IS EVIDENCED IS THE GROUP LIST, AND NOTHING ELSE.** Summernote is not in the bundle, so
    its popover's markup, its position and its icons are unknown, and none of them is guessed here.
    This is a strip above the editor rather than a floating popover over the image, and it is one
    because inventing a popover's geometry to look like a capture nobody has is how a component
    acquires decisions nothing can check.

    **`imageAttributes` IS DELIBERATELY NOT BUILT.** It is a third-party summernote plugin whose
    dialog is unevidenced twice over — not in this bundle, and not in the reference's own source.
    Building a src/alt/title dialog here would be inventing a surface and then transcribing nothing.
    Recorded at the audit row as the one group of four that stays open.

    `note-image.ts` carries what the two attributes are and why the width is an attribute where
    summernote writes a style.
  -->
  {#if imageSelected}
    <div class="note-image-popover btn-group btn-group-sm" role="group" aria-label="Image">
      {#each IMAGE_WIDTHS as option (option.command)}
        <button
          type="button"
          class={['btn btn-outline-secondary', { active: imageWidth === option.width }]}
          aria-pressed={imageWidth === option.width}
          onclick={() => setImageWidth(option.width)}>{option.label}</button
        >
      {/each}
      {#each IMAGE_FLOATS as option (option.command)}
        <button
          type="button"
          class={['btn btn-outline-secondary', { active: imageFloat === option.float }]}
          aria-pressed={imageFloat === option.float}
          onclick={() => setImageFloat(option.float)}>{option.label}</button
        >
      {/each}
      <button
        type="button"
        class="btn btn-outline-danger"
        aria-label="Remove this image"
        onclick={removeImage}><i class="fas fa-trash"></i></button
      >
    </div>
  {/if}
  <div
    class={['note-editor note-frame', { fullscreen, codeview: codeView }]}
    style:height={fullscreen ? '100vh' : `${editorHeight}px`}
  >
    <div class="note-dropzone"><div class="note-dropzone-message"></div></div>
    <div class="note-toolbar" role="toolbar" aria-label="Note formatting">
      <div class="note-btn-group note-style">
        <div class="note-btn-group">
          <button
            type="button"
            class="note-btn dropdown-toggle"
            aria-label="Style"
            aria-expanded={openMenu === 'style'}
            onclick={() => toggleMenu('style')}
            ><i class="note-icon-magic"></i> <span class="note-icon-caret"></span></button
          >
          {#if openMenu === 'style'}
            <div class="note-dropdown-menu dropdown-style" role="list" aria-label="Style">
              <button class="note-dropdown-item" type="button" onclick={() => setBlock('paragraph')}
                ><p>Normal</p></button
              >
              <button
                class="note-dropdown-item"
                type="button"
                onclick={() => setBlock('blockquote')}><blockquote>Quote</blockquote></button
              >
              <button class="note-dropdown-item" type="button" onclick={() => setBlock('codeBlock')}
                ><pre>Code</pre></button
              >
              {#each [1, 2, 3, 4, 5, 6] as level (level)}
                <button
                  class="note-dropdown-item"
                  type="button"
                  onclick={() => setBlock(level as 1 | 2 | 3 | 4 | 5 | 6)}>Header {level}</button
                >
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <div class="note-btn-group note-view">
        <button
          type="button"
          class={['note-btn btn-fullscreen note-codeview-keep', { active: fullscreen }]}
          aria-label="Full Screen"
          aria-pressed={fullscreen}
          onclick={() => (fullscreen = !fullscreen)}><i class="note-icon-arrows-alt"></i></button
        >
        <button
          type="button"
          class={['note-btn btn-codeview note-codeview-keep', { active: codeView }]}
          aria-label="Code View"
          aria-pressed={codeView}
          onclick={toggleCodeView}><i class="note-icon-code"></i></button
        >
      </div>

      <div class="note-btn-group note-misc">
        <button
          type="button"
          class="note-btn"
          aria-label="Undo"
          onclick={() => command((instance) => instance.chain().focus().undo().run())}
          ><i class="note-icon-undo"></i></button
        >
        <button
          type="button"
          class="note-btn"
          aria-label="Redo"
          onclick={() => command((instance) => instance.chain().focus().redo().run())}
          ><i class="note-icon-redo"></i></button
        >
      </div>

      <div class="note-btn-group note-font">
        <button
          type="button"
          class={['note-btn note-btn-bold', { active: active('bold') }]}
          aria-label="Bold"
          aria-pressed={active('bold')}
          onclick={() => command((instance) => instance.chain().focus().toggleBold().run())}
          ><i class="note-icon-bold"></i></button
        >
        <button
          type="button"
          class={['note-btn note-btn-italic', { active: active('italic') }]}
          aria-label="Italic"
          aria-pressed={active('italic')}
          onclick={() => command((instance) => instance.chain().focus().toggleItalic().run())}
          ><i class="note-icon-italic"></i></button
        >
        <button
          type="button"
          class={['note-btn note-btn-underline', { active: active('underline') }]}
          aria-label="Underline"
          aria-pressed={active('underline')}
          onclick={() => command((instance) => instance.chain().focus().toggleUnderline().run())}
          ><i class="note-icon-underline"></i></button
        >
        <button
          type="button"
          class="note-btn"
          aria-label="Remove Font Style"
          onclick={() =>
            command((instance) => instance.chain().focus().unsetAllMarks().clearNodes().run())}
          ><i class="note-icon-eraser"></i></button
        >
      </div>

      <div class="note-btn-group note-fontname">
        <div class="note-btn-group">
          <button
            type="button"
            class="note-btn dropdown-toggle"
            aria-label="Font Family"
            aria-expanded={openMenu === 'font'}
            onclick={() => toggleMenu('font')}
            ><span class="note-current-fontname"
              >{editor?.getAttributes('textStyle').fontFamily ?? 'Arial'}</span
            >
            <span class="note-icon-caret"></span></button
          >
          {#if openMenu === 'font'}
            <div class="note-dropdown-menu note-check dropdown-fontname" role="list">
              {#each FONT_FAMILIES as font (font)}
                <button
                  type="button"
                  class={[
                    'note-dropdown-item',
                    { checked: active('textStyle', { fontFamily: font }) }
                  ]}
                  onclick={() =>
                    command((instance) => instance.chain().focus().setFontFamily(font).run())}
                  ><i class="note-icon-menu-check"></i>
                  <span style:font-family={font}>{font}</span></button
                >
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <div class="note-btn-group note-fontsize">
        <div class="note-btn-group">
          <button
            type="button"
            class="note-btn dropdown-toggle"
            aria-label="Font Size"
            aria-expanded={openMenu === 'fontSize'}
            onclick={() => toggleMenu('fontSize')}
            ><span class="note-current-fontsize"
              >{editor?.getAttributes('textStyle').fontSize?.replace('px', '') ?? '12'}</span
            >
            <span class="note-icon-caret"></span></button
          >
          {#if openMenu === 'fontSize'}
            <div class="note-dropdown-menu note-check dropdown-fontsize" role="list">
              {#each FONT_SIZES as size (size)}
                <button
                  type="button"
                  class={[
                    'note-dropdown-item',
                    { checked: active('textStyle', { fontSize: `${size}px` }) }
                  ]}
                  onclick={() =>
                    command((instance) => instance.chain().focus().setFontSize(`${size}px`).run())}
                  ><i class="note-icon-menu-check"></i> {size}</button
                >
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!--
        TWO SHAPES, and which one is drawn is the whole of `simplifiedEditor`. See
        `resolveNoteSurfaceGates` for the byte offset, for what the capture does NOT contain, and for
        the one decision taken beyond the evidence.

        `{#if}` and not `hidden`: the reference emits DIFFERENT markup for the two cases - a
        different Summernote button name - rather than hiding one of them. `MainTabStrip`'s rule
        applies to a tab whose markup exists either way; this is not that.
      -->
      <div class="note-btn-group note-color">
        <div class={['note-btn-group', 'note-color', { 'note-color-all': !simplifiedEditor }]}>
          <button
            type="button"
            class="note-btn note-current-color-button"
            aria-label="Recent Color"
            onclick={() =>
              command((instance) =>
                simplifiedEditor
                  ? instance.chain().focus().setColor('#FFFF00').run()
                  : instance.chain().focus().setBackgroundColor('#FFFF00').run()
              )}
            ><i
              class="note-icon-font note-recent-color"
              style={simplifiedEditor
                ? 'background-color:#FFFFFF;color:#FFFF00;'
                : 'background-color:#FFFF00;color:#000000;'}
            ></i></button
          >
          <button
            type="button"
            class="note-btn dropdown-toggle"
            aria-label="More Color"
            aria-expanded={openMenu === 'color'}
            onclick={() => toggleMenu('color')}><span class="note-icon-caret"></span></button
          >
          {#if openMenu === 'color'}
            <div class="note-dropdown-menu" role="list">
              {#if !simplifiedEditor}
                <div class="note-palette">
                  <div class="note-palette-title">Background Color</div>
                  <button
                    type="button"
                    class="note-color-reset btn btn-light btn-default"
                    onclick={() =>
                      command((instance) => instance.chain().focus().unsetBackgroundColor().run())}
                    >Transparent</button
                  >
                  <div class="note-holder">
                    <div class="note-color-palette">
                      {#each NOTE_PALETTE_ROWS as row (row[0])}
                        <div class="note-color-row">
                          {#each row as color (color)}
                            <button
                              type="button"
                              class="note-btn note-color-btn"
                              style:background-color={color}
                              aria-label={`Background ${color}`}
                              onclick={() =>
                                command((instance) =>
                                  instance.chain().focus().setBackgroundColor(color).run()
                                )}
                            ></button>
                          {/each}
                        </div>
                      {/each}
                    </div>
                  </div>
                  <label class="note-color-select btn btn-light btn-default">
                    Select
                    <input
                      id={`${componentId}-background-color`}
                      name="noteBackgroundColor"
                      class="note-btn note-color-select-btn"
                      type="color"
                      value="#FFFF00"
                      onchange={(event) =>
                        command((instance) =>
                          instance
                            .chain()
                            .focus()
                            .setBackgroundColor(event.currentTarget.value)
                            .run()
                        )}
                    />
                  </label>
                </div>
              {/if}
              <div class="note-palette">
                <div class="note-palette-title">Text Color</div>
                <button
                  type="button"
                  class="note-color-reset btn btn-light btn-default"
                  onclick={() => command((instance) => instance.chain().focus().unsetColor().run())}
                  >Reset to default</button
                >
                <div class="note-holder">
                  <div class="note-color-palette">
                    {#each NOTE_PALETTE_ROWS as row (row[0])}
                      <div class="note-color-row">
                        {#each row as color (color)}
                          <button
                            type="button"
                            class="note-btn note-color-btn"
                            style:background-color={color}
                            aria-label={`Text ${color}`}
                            onclick={() =>
                              command((instance) => instance.chain().focus().setColor(color).run())}
                          ></button>
                        {/each}
                      </div>
                    {/each}
                  </div>
                </div>
                <label class="note-color-select btn btn-light btn-default">
                  Select
                  <input
                    id={`${componentId}-text-color`}
                    name="noteTextColor"
                    class="note-btn note-color-select-btn"
                    type="color"
                    value="#000000"
                    onchange={(event) =>
                      command((instance) =>
                        instance.chain().focus().setColor(event.currentTarget.value).run()
                      )}
                  />
                </label>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <div class="note-btn-group note-para">
        <button
          type="button"
          class={['note-btn', { active: active('bulletList') }]}
          aria-label="Unordered list"
          onclick={() => command((instance) => instance.chain().focus().toggleBulletList().run())}
          ><i class="note-icon-unorderedlist"></i></button
        >
        <button
          type="button"
          class={['note-btn', { active: active('orderedList') }]}
          aria-label="Ordered list"
          onclick={() => command((instance) => instance.chain().focus().toggleOrderedList().run())}
          ><i class="note-icon-orderedlist"></i></button
        >
        <div class="note-btn-group">
          <button
            type="button"
            class="note-btn dropdown-toggle"
            aria-label="Paragraph"
            aria-expanded={openMenu === 'align'}
            onclick={() => toggleMenu('align')}
            ><i class="note-icon-align-left"></i> <span class="note-icon-caret"></span></button
          >
          {#if openMenu === 'align'}
            <div class="note-dropdown-menu" role="list">
              <div class="note-btn-group note-align">
                {#each [['left', 'note-icon-align-left'], ['center', 'note-icon-align-center'], ['right', 'note-icon-align-right'], ['justify', 'note-icon-align-justify']] as alignment (alignment[0])}
                  <button
                    type="button"
                    class="note-btn"
                    aria-label={`Align ${alignment[0]}`}
                    onclick={() =>
                      command((instance) =>
                        instance.chain().focus().setTextAlign(alignment[0]).run()
                      )}><i class={alignment[1]}></i></button
                  >
                {/each}
              </div>
              <div class="note-btn-group note-list">
                <button
                  type="button"
                  class="note-btn"
                  aria-label="Outdent"
                  onclick={() =>
                    command((instance) => instance.chain().focus().liftListItem('listItem').run())}
                  ><i class="note-icon-align-outdent"></i></button
                >
                <button
                  type="button"
                  class="note-btn"
                  aria-label="Indent"
                  onclick={() =>
                    command((instance) => instance.chain().focus().sinkListItem('listItem').run())}
                  ><i class="note-icon-align-indent"></i></button
                >
              </div>
            </div>
          {/if}
        </div>
      </div>

      <div class="note-btn-group note-height">
        <div class="note-btn-group">
          <button
            type="button"
            class="note-btn dropdown-toggle"
            aria-label="Line Height"
            aria-expanded={openMenu === 'lineHeight'}
            onclick={() => toggleMenu('lineHeight')}
            ><i class="note-icon-text-height"></i> <span class="note-icon-caret"></span></button
          >
          {#if openMenu === 'lineHeight'}
            <div class="note-dropdown-menu note-check dropdown-line-height" role="list">
              {#each LINE_HEIGHTS as height (height)}
                <button
                  type="button"
                  class={[
                    'note-dropdown-item',
                    { checked: active('textStyle', { lineHeight: height }) }
                  ]}
                  onclick={() =>
                    command((instance) => instance.chain().focus().setLineHeight(height).run())}
                  ><i class="note-icon-menu-check"></i> {height}</button
                >
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <div class="note-btn-group note-table">
        <div class="note-btn-group">
          <button
            type="button"
            class="note-btn dropdown-toggle"
            aria-label="Table"
            aria-expanded={openMenu === 'table'}
            onclick={() => toggleMenu('table')}
            ><i class="note-icon-table"></i> <span class="note-icon-caret"></span></button
          >
          {#if openMenu === 'table'}
            <div class="note-dropdown-menu note-table" role="list">
              <button
                type="button"
                class="note-dimension-picker"
                aria-label="Insert 3 by 3 table"
                onclick={() =>
                  command((instance) =>
                    instance
                      .chain()
                      .focus()
                      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                      .run()
                  )}
              >
                <span class="note-dimension-picker-highlighted"></span>
                <span class="note-dimension-picker-unhighlighted"></span>
              </button>
              <div class="note-dimension-display">3 x 3</div>
            </div>
          {/if}
        </div>
      </div>

      <div class="note-btn-group note-insert">
        <button type="button" class="note-btn" aria-label="Link" onclick={() => openDialog('link')}
          ><i class="note-icon-link"></i></button
        >
        <button
          type="button"
          class="note-btn"
          aria-label="Picture"
          onclick={() => openDialog('image')}><i class="note-icon-picture"></i></button
        >
        <button
          type="button"
          class="note-btn"
          aria-label="Video"
          onclick={() => openDialog('video')}><i class="note-icon-video"></i></button
        >
        <button
          type="button"
          class="note-btn"
          aria-label="Emoji"
          aria-describedby={openMenu === 'emoji' ? `${componentId}-note-emoji` : undefined}
          onclick={() => toggleMenu('emoji')}><i class="far fa-smile"></i></button
        >
        {#if openMenu === 'emoji'}
          <EmojiPicker popoverId={`${componentId}-note-emoji`} onselect={insertEmoji} />
        {/if}
      </div>

      <div class="note-btn-group note-customButtons">
        <button
          type="button"
          class="note-btn"
          aria-label="Insert a gif"
          aria-haspopup="dialog"
          aria-expanded={giphyOpen}
          disabled={!giphyApiKey}
          onclick={() => {
            openMenu = null;
            dialog = null;
            giphyOpen = !giphyOpen;
          }}>GIFs</button
        >
        <button
          type="button"
          class="note-btn"
          aria-label="Insert an image carousel"
          onclick={() => openDialog('carousel')}><i class="fas fa-images"></i> Carousel</button
        >
      </div>
      {#if giphyApiKey && giphyOpen}
        <!--
          A MODAL, not a popover — `GIF-07`, and the chrome is the capture's.

          `opengifSerachModal()` at bundle byte 1,482,730 is
          `modalService.open(this.giphySearchPopOver, {ariaLabelledBy:"modal-basic-title"})`, and
          `L0e` at 1,467,000 draws const 26 `modal-header`, const 82
          `["id","modal-basic-title",1,"modal-title"]` under an `h4`, const 83
          `[1,"modal-body","modal-lg",2,"max-height","77vh","overflow-y","auto"]`, const 40
          `modal-footer` and const 41 `btn btn-outline-dark` reading ` Close `. Every one of those
          five is here.

          Until 2026-09-01 this mount rendered `GiphyPicker`'s POPOVER shell, which portals itself to
          `<body>` at `inset: auto auto 0px 0px` — bottom-left of the viewport, detached from the
          editor it belongs to. `GIF-04` corrected the three chrome CLASSES on this mount the same
          day without noticing that the chrome around them was the wrong kind.

          `hint` is passed because `app-note` is the ONE surface of the four whose wording differs:
          `*Double click an image to insert it` at byte 1,467,154, against `select it` at the other
          three. In a note the double-click puts the GIF straight into the document; everywhere else
          it selects one to confirm and send. See the prop's own note.
        -->
        <Modal
          id={`${componentId}-note-giphy`}
          ariaLabelledby="modal-basic-title"
          open={giphyOpen}
          onclose={() => (giphyOpen = false)}
          title="Giphy Search"
          titleId="modal-basic-title"
          titleClass="modal-title"
          titleTag="h4"
          bodyClass="modal-lg"
          bodyStyle="max-height: 77vh; overflow-y: auto;"
        >
          <GiphyPicker
            variant="modal"
            hint="*Double click an image to insert it"
            apiKey={giphyApiKey}
            onselect={insertGif}
          />
          {#snippet footer()}
            <button type="button" class="btn btn-outline-dark" onclick={() => (giphyOpen = false)}>
              Close
            </button>
          {/snippet}
        </Modal>
      {/if}
    </div>

    <div class="note-editing-area">
      {#if editor?.isEmpty && !codeView}
        <div class="note-placeholder">Type your note here and press save</div>
      {/if}
      {#if codeView}
        <textarea
          id={`${componentId}-note-code`}
          name="noteCode"
          class="note-codable"
          aria-label="Note HTML"
          aria-multiline="true"
          bind:value={codeHtml}
          oninput={() => setDirty(true)}></textarea>
      {/if}
      <div class="note-editor-host" hidden={codeView} {@attach attachHost}></div>
    </div>
    <output class="note-status-output" aria-live="polite">{saving ? 'Saving…' : ''}</output>
    <div class="note-statusbar" role="status">
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div
        class="note-resizebar"
        role="separator"
        aria-label="Resize note editor"
        aria-orientation="horizontal"
        tabindex="0"
        onpointerdown={startResize}
      >
        <div class="note-icon-bar"></div>
        <div class="note-icon-bar"></div>
        <div class="note-icon-bar"></div>
      </div>
    </div>
  </div>
</app-note>

{#if dialog === 'link'}
  <div
    class="note-modal link-dialog open"
    aria-hidden="false"
    role="dialog"
    aria-label="Insert Link"
  >
    <div class="note-modal-content">
      <div class="note-modal-header">
        <button type="button" class="close" aria-label="Close" onclick={() => (dialog = null)}
          ><i class="note-icon-close"></i></button
        >
        <h4 class="note-modal-title">Insert Link</h4>
      </div>
      <div class="note-modal-body">
        <div class="form-group note-form-group">
          <label for={`${componentId}-link-text`} class="note-form-label">Text to display</label>
          <input
            id={`${componentId}-link-text`}
            name="noteLinkText"
            class="note-link-text form-control note-form-control note-input"
            type="text"
            bind:value={linkText}
          />
        </div>
        <div class="form-group note-form-group">
          <label for={`${componentId}-link-url`} class="note-form-label"
            >To what URL should this link go?</label
          >
          <input
            id={`${componentId}-link-url`}
            name="noteLinkUrl"
            class="note-link-url form-control note-form-control note-input"
            type="url"
            bind:value={linkUrl}
          />
        </div>
        <div class="checkbox sn-checkbox-open-in-new-window">
          <label
            ><input
              id={`${componentId}-link-new-window`}
              name="noteLinkNewWindow"
              type="checkbox"
              bind:checked={linkNewWindow}
            />Open in new window</label
          >
        </div>
      </div>
      <div class="note-modal-footer">
        <button
          type="button"
          class="btn btn-primary note-btn note-btn-primary note-link-btn"
          disabled={!linkUrl.trim().startsWith('https://')}
          onclick={insertLink}>Insert Link</button
        >
      </div>
    </div>
  </div>
{:else if dialog === 'image'}
  <div class="note-modal open" aria-hidden="false" role="dialog" aria-label="Insert Image">
    <div class="note-modal-content">
      <div class="note-modal-header">
        <button type="button" class="close" aria-label="Close" onclick={() => (dialog = null)}
          ><i class="note-icon-close"></i></button
        >
        <h4 class="note-modal-title">Insert Image</h4>
      </div>
      <div class="note-modal-body">
        <div class="form-group note-form-group note-group-select-from-files">
          <label for={`${componentId}-image-file`} class="note-form-label">Select from files</label>
          <input
            id={`${componentId}-image-file`}
            class="note-image-input form-control-file note-form-control note-input"
            type="file"
            name="noteImageFiles"
            accept="image/*"
            multiple
            onchange={(event) => (imageFiles = [...(event.currentTarget.files ?? [])])}
          />
        </div>
        <div class="form-group note-group-image-url">
          <label for={`${componentId}-image-url`} class="note-form-label">Image URL</label>
          <input
            id={`${componentId}-image-url`}
            name="noteImageUrl"
            class="note-image-url form-control note-form-control note-input"
            type="url"
            bind:value={imageUrl}
          />
        </div>
      </div>
      <div class="note-modal-footer">
        <button
          type="button"
          class="btn btn-primary note-btn note-btn-primary note-image-btn"
          disabled={uploading || (imageFiles.length === 0 && !imageUrl.startsWith('https://'))}
          onclick={() => void insertImages()}>{uploading ? 'Uploading…' : 'Insert Image'}</button
        >
      </div>
    </div>
  </div>
{:else if dialog === 'video'}
  <div class="note-modal open" aria-hidden="false" role="dialog" aria-label="Insert Video">
    <div class="note-modal-content">
      <div class="note-modal-header">
        <button type="button" class="close" aria-label="Close" onclick={() => (dialog = null)}
          ><i class="note-icon-close"></i></button
        >
        <h4 class="note-modal-title">Insert Video</h4>
      </div>
      <div class="note-modal-body">
        <div class="form-group note-form-group row-fluid">
          <label for={`${componentId}-video-url`} class="note-form-label"
            >Video URL
            <small class="text-muted"
              >(YouTube, Google Drive, Vimeo, Vine, Instagram, DailyMotion, Youku, Peertube)</small
            ></label
          >
          <input
            id={`${componentId}-video-url`}
            name="noteVideoUrl"
            class="note-video-url form-control note-form-control note-input"
            type="url"
            bind:value={videoUrl}
          />
        </div>
      </div>
      <div class="note-modal-footer">
        <button
          type="button"
          class="btn btn-primary note-btn note-btn-primary note-video-btn"
          disabled={!videoUrl.startsWith('https://')}
          onclick={insertVideo}>Insert Video</button
        >
      </div>
    </div>
  </div>
{:else if dialog === 'carousel'}
  <!--
    The carousel modal, its file browser and its two confirmations are `CarouselDialog.svelte`.

    Mounted inside this branch rather than kept alive and hidden, deliberately: the dialog seeds its
    own state from these props at construction, so closing it is what discards a half-typed carousel
    and opening it is what re-reads the note. The note at the top of that file carries the rest.
  -->
  <CarouselDialog
    title={carouselDialogTitle}
    action={carouselDialogAction}
    slides={carouselSeed.slides}
    interval={carouselSeed.interval}
    height={carouselSeed.height}
    {sessionImages}
    {onUploadImages}
    ondismiss={() => {
      dialog = null;
      editingCarouselPos = null;
    }}
    onsubmit={insertCarousel}
  />
{/if}

<!--
  `sendGif`'s confirmation, byte 1,482,885 — the same dialog the chat composer has always raised,
  with the one word that differs between the two surfaces passed in. See `insertGif`.
-->
{#if pendingGif !== null}
  <GifConfirmDialog
    url={pendingGif.url}
    message="You sure you want to insert this image:"
    onclose={() => (pendingGif = null)}
    onconfirm={confirmGif}
  />
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
  app-note {
    display: block;
    min-height: 100%;
  }

  .note-editor {
    display: flex;
    min-width: 0;
    min-height: 180px;
    flex-direction: column;
  }

  .note-editing-area {
    flex: 1 1 auto;
    min-height: 0;
  }

  .note-editor-host {
    height: 100%;
  }

  :global(.note-editor-host .note-editable) {
    height: 100%;
    min-height: 100%;
  }

  .note-placeholder {
    position: absolute;
    z-index: 1;
    color: #777;
    pointer-events: none;
  }

  .note-codable {
    height: 100%;
  }

  .note-dropdown-menu {
    z-index: 1060;
  }

  button.note-dropdown-item {
    width: 100%;
    border: 0;
    background: transparent;
    text-align: left;
  }

  /*
    The image popover's own spacing. It is a real rule and not a hook: `btn-group btn-group-sm` gives
    the strip its shape, and this is the gap that keeps it off the editor frame it sits above. A
    class carrying no declarations would be the `.flipped`-with-no-CSS defect `CLAUDE.md` names.
  */
  .note-image-popover {
    margin-bottom: 6px;
  }

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

  /*
    Transcribed from `docs/source/components/app-note.component.css`, which is this component's own
    stylesheet in the reference. Those five rules are the last five in that file, written there with
    Angular's `[_ngcontent-%COMP%]` scoping — the same component scoping Svelte gives a `<style>`
    block, so they are reproduced value for value with the attribute selectors dropped.

    `max-height` plus `overflow-y` is what makes the panel a scroller rather than a page-pusher; the
    preview's three ellipsis properties are what keep a long note to a single line.
  */
  .version-history-panel {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid #ddd;
  }

  .version-history-panel .card-header {
    padding: 0.5rem 1rem;
    background-color: #f8f9fa;
  }

  .version-history-panel .version-preview {
    max-width: 400px;
    overflow: hidden;
    color: #666;
    font-size: 0.85em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .version-history-panel .list-group-item {
    padding: 0.5rem 1rem;
  }

  .version-history-panel .list-group-item:hover {
    background-color: #f8f9fa;
  }
</style>
