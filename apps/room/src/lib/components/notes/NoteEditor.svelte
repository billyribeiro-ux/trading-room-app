<script lang="ts">
  import { Editor } from '@tiptap/core';
  import Image from '@tiptap/extension-image';
  import Link from '@tiptap/extension-link';
  import { TableKit } from '@tiptap/extension-table';
  import TextAlign from '@tiptap/extension-text-align';
  import { TextStyleKit } from '@tiptap/extension-text-style';
  import Underline from '@tiptap/extension-underline';
  import Youtube from '@tiptap/extension-youtube';
  import StarterKit from '@tiptap/starter-kit';
  import { onMount } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import BootboxDialog from '$lib/components/BootboxDialog.svelte';
  import EmojiPicker from '$lib/components/EmojiPicker.svelte';
  import GiphyPicker from '$lib/components/GiphyPicker.svelte';
  import type { NoteVersion } from '$lib/types';
  import {
    PtrCarousel,
    findCarousel,
    hasCarousel,
    normalizeSlides,
    numericRange,
    type CarouselSlide
  } from './carousel';
  import { safeNoteHtml } from './safe-html';
  import { noteVersionDate, noteVersionPreview } from './version-history';

  type ToolbarMenu =
    'align' | 'color' | 'emoji' | 'font' | 'fontSize' | 'lineHeight' | 'style' | 'table';

  type EditorDialog = 'carousel' | 'image' | 'link' | 'video';

  /** The modal's rows carry an identity for the keyed each block; the node's slides do not. */
  type EditorCarouselSlide = CarouselSlide & {
    key: number;
  };

  interface Props {
    readonly contentHtml: string;
    readonly giphyApiKey: string;
    readonly noteId: number;
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
    readonly versions: readonly NoteVersion[];
  }

  let {
    contentHtml,
    giphyApiKey,
    noteId,
    onBringEveryone,
    onDirtyChange,
    onDone,
    onRequestRestore,
    onSave,
    onSetWelcomeMat,
    onUploadImages,
    onVersionHistoryOpenChange,
    showVersionHistory,
    versions
  }: Props = $props();

  const componentId = $props.id();
  const fontFamilies = [
    'Arial',
    'Arial Black',
    'Comic Sans MS',
    'Courier New',
    'Helvetica Neue',
    'Helvetica',
    'Impact',
    'Lucida Grande',
    'Tahoma',
    'Times New Roman',
    'Verdana'
  ] as const;
  const fontSizes = ['8', '9', '10', '11', '12', '14', '18', '24', '36'] as const;
  const lineHeights = ['1.0', '1.2', '1.4', '1.5', '1.6', '1.8', '2.0', '3.0'] as const;
  const palette = [
    '#000000',
    '#424242',
    '#636363',
    '#9C9C94',
    '#CEC6CE',
    '#EFEFEF',
    '#F7F7F7',
    '#FFFFFF',
    '#FF0000',
    '#FF9C00',
    '#FFFF00',
    '#00FF00',
    '#00FFFF',
    '#0000FF',
    '#9C00FF',
    '#FF00FF',
    '#F7C6CE',
    '#FFE7CE',
    '#FFEFC6',
    '#D6EFD6',
    '#CEDEE7',
    '#CEE7F7',
    '#D6D6E7',
    '#E7D6DE',
    '#E79C9C',
    '#FFC69C',
    '#FFE79C',
    '#B5D6A5',
    '#A5C6CE',
    '#9CC6EF',
    '#B5A5D6',
    '#D6A5BD',
    '#E76363',
    '#F7AD6B',
    '#FFD663',
    '#94BD7B',
    '#73A5AD',
    '#6BADDE',
    '#8C7BC6',
    '#C67BA5',
    '#CE0000',
    '#E79439',
    '#EFC631',
    '#6BA54A',
    '#4A7B8C',
    '#3984C6',
    '#634AA5',
    '#A54A7B',
    '#9C0000',
    '#B56308',
    '#BD9400',
    '#397B21',
    '#104A5A',
    '#085294',
    '#311873',
    '#731842',
    '#630000',
    '#7B3900',
    '#846300',
    '#295218',
    '#083139',
    '#003163',
    '#21104A',
    '#4A1031'
  ] as const;
  const paletteRows = Array.from({ length: 8 }, (_unused, row) =>
    palette.slice(row * 8, row * 8 + 8)
  );

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
  let carouselSlideKey = 1;
  let carouselSlides = $state.raw<readonly EditorCarouselSlide[]>([newCarouselSlide()]);
  let carouselInterval = $state(5);
  let carouselHeight = $state(90);
  /*
    Which carousel the modal is currently editing, as a document position, or null when it is going
    to insert a new one. The reference keeps a separate `isEditingCarousel` boolean beside the
    element it found; one value that is either a position or nothing cannot disagree with itself.
  */
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
        Image.configure({ allowBase64: false }),
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

  function newCarouselSlide(): EditorCarouselSlide {
    return { key: carouselSlideKey++, url: '', link: '' };
  }

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
    // `0 === h.length && h.push({...})` — an empty carousel still opens with one blank row to fill.
    carouselSlides =
      slides.length === 0
        ? [newCarouselSlide()]
        : slides.map((slide) => ({ ...slide, key: carouselSlideKey++ }));
    carouselInterval = numericRange(target.attrs.interval, 1, 60, 5);
    carouselHeight = numericRange(target.attrs.height, 10, 100, 90);
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
      carouselSlides = [newCarouselSlide()];
      carouselInterval = 5;
      carouselHeight = 90;
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

  function addCarouselSlide(): void {
    carouselSlides = [...carouselSlides, newCarouselSlide()];
  }

  function updateCarouselSlide(index: number, field: keyof CarouselSlide, value: string): void {
    carouselSlides = carouselSlides.map((slide, slideIndex) =>
      slideIndex === index ? { ...slide, [field]: value } : slide
    );
  }

  function removeCarouselSlide(index: number): void {
    carouselSlides = carouselSlides.filter((_slide, slideIndex) => slideIndex !== index);
    if (carouselSlides.length === 0) carouselSlides = [newCarouselSlide()];
  }

  function insertCarousel(): void {
    const instance = editor;
    const slides = carouselSlides.filter(({ url }) => url.trim().startsWith('https://'));
    if (slides.length === 0 || instance === null) return;

    const attrs = {
      // `key` is the each-block identity for the rows in the modal and has no business on the node.
      slides: slides.map(({ link, url }) => ({ link, url })),
      interval: numericRange(carouselInterval, 1, 60, 5),
      height: numericRange(carouselHeight, 10, 100, 90)
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

  function insertGif(title: string, url: string): void {
    if (url.startsWith('https://')) {
      editor?.chain().focus().setImage({ src: url, alt: title }).run();
    }
    giphyOpen = false;
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
  <div class="d-flex justify-content-end align-items-center flex-wrap">
    <button
      class="btn btn-light text-center m-1"
      type="button"
      onclick={() => onSetWelcomeMat(false)}
      ><i class="fas fa-home"></i> Set as Welcome Mat
    </button>
    <button
      class="btn btn-light text-center m-1"
      type="button"
      onclick={() => onSetWelcomeMat(true)}
      ><i class="fas fa-home"></i> Apply as Welcome Mat to all rooms
    </button>
    <button class="btn btn-success text-center m-1" type="button" onclick={onBringEveryone}
      ><i class="fas fa-eye"></i> Bring Everyone here
    </button>
    <!--
      `F0e`, rendered by `T0e` only when `carouselInNote`. Const 14 gives the classes, 15 the icon.
      It reopens a carousel already in the note; the toolbar's own Carousel button always inserts.
    -->
    {#if carouselInNote}
      <button class="btn btn-secondary text-center m-1" type="button" onclick={editCarousel}
        ><i class="fas fa-images"></i> Edit Carousel
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
        class="btn btn-warning text-center m-1"
        class:active={showVersionHistory}
        type="button"
        onclick={() => onVersionHistoryOpenChange(!showVersionHistory)}
        ><i class="fas fa-history"></i> Version History ({versions.length})
      </button>
    {/if}
    <button class="btn btn-primary text-center m-1" type="button" onclick={() => void done()}
      ><i class="fas fa-check"></i> {saving ? 'Saving…' : 'Done'}
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
              <i class="fas fa-undo"></i> Revert
            </button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <div id={`summernoteEdit-${noteId}`} class="note-view" hidden></div>
  <div
    class="note-editor note-frame"
    class:fullscreen
    class:codeview={codeView}
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
          class="note-btn btn-fullscreen note-codeview-keep"
          class:active={fullscreen}
          aria-label="Full Screen"
          aria-pressed={fullscreen}
          onclick={() => (fullscreen = !fullscreen)}><i class="note-icon-arrows-alt"></i></button
        >
        <button
          type="button"
          class="note-btn btn-codeview note-codeview-keep"
          class:active={codeView}
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
          class="note-btn note-btn-bold"
          class:active={active('bold')}
          aria-label="Bold"
          aria-pressed={active('bold')}
          onclick={() => command((instance) => instance.chain().focus().toggleBold().run())}
          ><i class="note-icon-bold"></i></button
        >
        <button
          type="button"
          class="note-btn note-btn-italic"
          class:active={active('italic')}
          aria-label="Italic"
          aria-pressed={active('italic')}
          onclick={() => command((instance) => instance.chain().focus().toggleItalic().run())}
          ><i class="note-icon-italic"></i></button
        >
        <button
          type="button"
          class="note-btn note-btn-underline"
          class:active={active('underline')}
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
              {#each fontFamilies as font (font)}
                <button
                  type="button"
                  class="note-dropdown-item"
                  class:checked={active('textStyle', { fontFamily: font })}
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
              {#each fontSizes as size (size)}
                <button
                  type="button"
                  class="note-dropdown-item"
                  class:checked={active('textStyle', { fontSize: `${size}px` })}
                  onclick={() =>
                    command((instance) => instance.chain().focus().setFontSize(`${size}px`).run())}
                  ><i class="note-icon-menu-check"></i> {size}</button
                >
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <div class="note-btn-group note-color">
        <div class="note-btn-group note-color note-color-all">
          <button
            type="button"
            class="note-btn note-current-color-button"
            aria-label="Recent Color"
            onclick={() =>
              command((instance) => instance.chain().focus().setBackgroundColor('#FFFF00').run())}
            ><i
              class="note-icon-font note-recent-color"
              style="background-color:#FFFF00;color:#000000;"
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
                    {#each paletteRows as row (row[0])}
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
                        instance.chain().focus().setBackgroundColor(event.currentTarget.value).run()
                      )}
                  />
                </label>
              </div>
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
                    {#each paletteRows as row (row[0])}
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
          class="note-btn"
          class:active={active('bulletList')}
          aria-label="Unordered list"
          onclick={() => command((instance) => instance.chain().focus().toggleBulletList().run())}
          ><i class="note-icon-unorderedlist"></i></button
        >
        <button
          type="button"
          class="note-btn"
          class:active={active('orderedList')}
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
              {#each lineHeights as height (height)}
                <button
                  type="button"
                  class="note-dropdown-item"
                  class:checked={active('textStyle', { lineHeight: height })}
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
          aria-describedby={giphyOpen ? `${componentId}-note-giphy` : undefined}
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
        <GiphyPicker
          apiKey={giphyApiKey}
          popoverId={`${componentId}-note-giphy`}
          onclose={() => (giphyOpen = false)}
          onselect={insertGif}
        />
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
  <div
    class="note-modal open note-carousel-modal"
    aria-hidden="false"
    role="dialog"
    aria-label={carouselDialogTitle}
  >
    <div class="note-modal-content">
      <div class="note-modal-header">
        <!--
          Dismissing has to clear the target as well as the dialog. The reference does the same in
          its modal's rejection handler: `() => { this.isEditingCarousel = !1; }`. Without it the
          next carousel inserted from the toolbar would overwrite the one last opened for editing.
        -->
        <button
          type="button"
          class="close"
          aria-label="Close"
          onclick={() => {
            dialog = null;
            editingCarouselPos = null;
          }}><i class="note-icon-close"></i></button
        >
        <h4 class="note-modal-title">{carouselDialogTitle}</h4>
      </div>
      <div class="note-modal-body">
        {#each carouselSlides as slide, index (slide.key)}
          <div class="carousel-slide-row">
            <label for={`${componentId}-carousel-url-${index}`}>Image URL</label>
            <input
              id={`${componentId}-carousel-url-${index}`}
              name={`noteCarouselUrl${index}`}
              class="form-control"
              type="url"
              value={slide.url}
              oninput={(event) => updateCarouselSlide(index, 'url', event.currentTarget.value)}
            />
            <label for={`${componentId}-carousel-link-${index}`}>Link / URL</label>
            <input
              id={`${componentId}-carousel-link-${index}`}
              name={`noteCarouselLink${index}`}
              class="form-control"
              type="url"
              value={slide.link}
              oninput={(event) => updateCarouselSlide(index, 'link', event.currentTarget.value)}
            />
            <button type="button" class="btn btn-danger" onclick={() => removeCarouselSlide(index)}
              >Delete slide</button
            >
          </div>
        {/each}
        <button type="button" class="btn btn-secondary" onclick={addCarouselSlide}>Add slide</button
        >
        <label for={`${componentId}-carousel-interval`}>Interval (seconds)</label>
        <input
          id={`${componentId}-carousel-interval`}
          name="noteCarouselInterval"
          class="form-control"
          type="number"
          min="1"
          max="60"
          bind:value={carouselInterval}
        />
        <label for={`${componentId}-carousel-height`}>Height (%)</label>
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
      <div class="note-modal-footer">
        <button
          type="button"
          class="btn btn-primary note-btn note-btn-primary"
          onclick={insertCarousel}>{carouselDialogAction}</button
        >
      </div>
    </div>
  </div>
{/if}

{#if giphyApiKey && openMenu === null && dialog === null}
  <!-- Giphy is opened by the toolbar button through this captured picker surface. -->
{/if}

{#if errorMessage !== null}
  <BootboxDialog mode="alert" message={errorMessage} onclose={() => (errorMessage = null)} />
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

  .carousel-slide-row {
    display: grid;
    gap: 4px;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #ddd;
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
