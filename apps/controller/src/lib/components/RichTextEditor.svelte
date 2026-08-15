<script lang="ts">
  import { bootbox } from '$lib/bootbox.svelte';
  import SanitizedHtml from '$lib/components/SanitizedHtml.svelte';
  import { sanitizeHtml } from '$lib/sanitize-html';
  import type { SanitizedHtml as SanitizedHtmlValue } from '$lib/sanitized-html';
  import type { Attachment } from 'svelte/attachments';

  /**
   * The Branding tab's landing-page editor — the reference's textAngular.
   *
	 * Rebuilt from `evidence-dumps/NEXT-STEP/gaps/rects-tab_Branding_Logo_Landing_Page_.json`,
   * which is the real toolbar captured off protradingroom.com with the Branding
   * pane revealed. Thirty controls in four `.btn-group`s, measured:
   *
   *   group 1  x=52     w=307.625   H1 H2 H3 H4 H5 H6 P pre quote
   *   group 2  x=364.625 w=275.656  bold italic underline strike ul ol redo undo clear
   *   group 3  x=645.281 w=193      left centre right justify indent outdent
   *   group 4  x=843.281 w=347.797  html image link video, then the two counters
   *
   *   button   37.711 tall — 10px padding, 11px/15.714 text, 1px border, 5px below
   *   toolbar  42.711 tall, at x=47 (the root's 52 less its own 5px offset)
   *   body     1565.828 x 302, 1px border in the form-control grey
   *
   * This is a real editor, not a picture of one: the buttons drive
   * `document.execCommand` over a contenteditable, which is what textAngular
   * itself does. The HTML button swaps the body for a raw <textarea>, and the
   * two counters are live.
   *
   * `execCommand` is deprecated and has no replacement for this job. It is
   * implemented everywhere, it is what the reference uses, and the alternative
   * is hand-rolling selection surgery — which would be a bigger correctness risk
   * than the deprecation.
   */
  interface Props {
    /** the stored HTML */
    value: string;
    /** the server-sanitized seed rendered through the reviewed HTML sink */
    initialContent: SanitizedHtmlValue;
    /** name of the hidden input the surrounding form submits */
    name?: string;
  }

  let { value = $bindable(), initialContent, name = 'value' }: Props = $props();

  /*
    A per-instance id for the HTML-source textarea. Chrome reports "a form field element should have
    an id or name attribute" without one, and a CONSTANT id would be wrong here: this editor is a
    component and two on one page would collide, which is a worse defect than the warning.

    `$props.id()` (Svelte 5.20+) is unique per instance and stable across hydration, so the id the
    server rendered is the id the client keeps. `name` is deliberately not used for this element —
    it belongs to the hidden input that actually submits, and putting it here would post the raw
    HTML twice under one key.
  */
  const uid = $props.id();

  /**
   * The reference seeds an EMPTY editor with one empty paragraph.
   *
   * file2:879's editing surface, on a room with no description, is
   * `<div id="taTextElement…" contenteditable="true" ta-bind class="… ta-bind"><p><br></p></div>` —
   * textAngular gives the body a first block so there is a line to put the caret on. Ours rendered
   * `initialContent` verbatim, and that is `sanitizeHtml('')` = `''` for such a room
   * (+page.server.ts:224), so the surface came up with no block at all.
   *
   * Both tags are in the shared allowlist (sanitize-html.ts:11-12), so the seed goes THROUGH the
   * sanitiser rather than around it — the branded type has one producer and this is not an exception
   * to it.
   */
  const EMPTY_DOCUMENT = sanitizeHtml('<p><br></p>');

  let body: HTMLElement | null = null;
  let showHtml = $state(false);
  let renderedContent = $derived(initialContent || EMPTY_DOCUMENT);
  let active = $state<Record<string, boolean>>({});

  /** counters, recomputed from the rendered text rather than the markup */
  const plain = $derived(value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' '));
  const words = $derived(plain.trim() ? plain.trim().split(/\s+/).length : 0);
  const chars = $derived(plain.replace(/\s+/g, ' ').trim().length);

  const GROUPS: { name: string; title: string; label?: string; icon?: string; run: () => void }[][] = [
    [
      ...['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((t, i) => ({
        name: t,
        title: `Heading ${i + 1}`,
        label: t.toUpperCase(),
        run: () => format(t)
      })),
      { name: 'p', title: 'Paragraph', label: 'P', run: () => format('p') },
      { name: 'pre', title: 'Preformatted text', label: 'pre', run: () => format('pre') },
      {
        name: 'quote',
        title: 'Quote/unquote selection or paragraph',
        icon: 'fa-quote-right',
        run: () => format('blockquote')
      }
    ],
    [
      { name: 'bold', title: 'Bold', icon: 'fa-bold', run: () => exec('bold') },
      { name: 'italics', title: 'Italic', icon: 'fa-italic', run: () => exec('italic') },
      { name: 'underline', title: 'Underline', icon: 'fa-underline', run: () => exec('underline') },
      { name: 'strikeThrough', title: 'Strikethrough', icon: 'fa-strikethrough', run: () => exec('strikeThrough') },
      { name: 'ul', title: 'Unordered List', icon: 'fa-list-ul', run: () => exec('insertUnorderedList') },
      { name: 'ol', title: 'Ordered List', icon: 'fa-list-ol', run: () => exec('insertOrderedList') },
      { name: 'redo', title: 'Redo', icon: 'fa-repeat', run: () => exec('redo') },
      { name: 'undo', title: 'Undo', icon: 'fa-undo', run: () => exec('undo') },
      { name: 'clear', title: 'Clear formatting', icon: 'fa-ban', run: () => exec('removeFormat') }
    ],
    [
      { name: 'justifyLeft', title: 'Align text left', icon: 'fa-align-left', run: () => exec('justifyLeft') },
      { name: 'justifyCenter', title: 'Center', icon: 'fa-align-center', run: () => exec('justifyCenter') },
      { name: 'justifyRight', title: 'Align text right', icon: 'fa-align-right', run: () => exec('justifyRight') },
      { name: 'justifyFull', title: 'Justify text', icon: 'fa-align-justify', run: () => exec('justifyFull') },
      { name: 'indent', title: 'Increase indent', icon: 'fa-indent', run: () => exec('indent') },
      { name: 'outdent', title: 'Decrease indent', icon: 'fa-outdent', run: () => exec('outdent') }
    ],
    [
      { name: 'html', title: 'Toggle html / Rich Text', icon: 'fa-code', run: toggleHtml },
      { name: 'insertImage', title: 'Insert image', icon: 'fa-picture-o', run: () => insert('image') },
      { name: 'insertLink', title: 'Insert / edit link', icon: 'fa-link', run: () => insert('link') },
      { name: 'insertVideo', title: 'Insert video', icon: 'fa-youtube-play', run: () => insert('video') }
    ]
  ];

  /**
   * Svelte can use empty comment nodes to delimit dynamic ranges. They are
   * framework metadata, not landing-page content, and must never leak into the
   * value submitted by the editor. The shared sanitizer already discards
   * user-authored comments, so removing comment nodes here cannot discard any
   * supported content.
   */
  function editableHtml(element: HTMLElement) {
    const clone = element.cloneNode(true) as HTMLElement;
    const comments: Comment[] = [];
    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT);
    let comment = walker.nextNode();
    while (comment) {
      comments.push(comment as Comment);
      comment = walker.nextNode();
    }
    for (const node of comments) node.remove();
    return clone.innerHTML;
  }

  /**
   * The seed is DISPLAY ONLY. It must never become the stored description.
   *
   * The same reference line ends with
   * `<input type="hidden" tabindex="-1" style="display: none;" name="wysiswyg-editor" value="">`,
   * and that `name` is the ta-root's own — `name="wysiswyg-editor" ng-model="sess.description"`. So
   * the reference's MODEL is empty while its BODY shows the paragraph. Without this, opening the
   * Branding tab on a never-configured room would read the seed off the surface and the save button
   * would post it as that room's description (+page.svelte:1776 posts the bound value).
   *
   * The comparison is against the browser's OWN serialisation of the seed rather than a pattern
   * written here: the sanitiser emits `<br />` and the DOM gives back `<br>`, and picking between
   * them by hand is a regex over text this code does not control.
   */
  function editorValue(node: HTMLElement) {
    const html = editableHtml(node);
    const probe = document.createElement('div');
    probe.innerHTML = EMPTY_DOCUMENT;
    return html === probe.innerHTML ? '' : html;
  }

  function sync() {
    if (body) value = editorValue(body);
    refreshActive();
  }

  function toggleHtml() {
    if (showHtml) {
      // the model and the surface part ways here for the same reason as above: an editor emptied
      // from the HTML view stores nothing and still shows a paragraph to type in
      const sanitized = sanitizeHtml(value);
      value = sanitized;
      renderedContent = sanitized || EMPTY_DOCUMENT;
      showHtml = false;
      return;
    }

    sync();
    showHtml = true;
  }

  function exec(command: string, arg?: string) {
    body?.focus();
    document.execCommand(command, false, arg);
    sync();
  }

  const format = (tag: string) => exec('formatBlock', `<${tag}>`);

  /**
   * `document.execCommand` acts on the live selection, and any dialog that takes
   * focus collapses it. Native `prompt()` happened to survive that because the
   * browser freezes the page; a DOM dialog does not, so the range is captured
   * before the dialog opens and reinstated before the command runs.
   */
  function saveSelection(): Range | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    return body?.contains(range.commonAncestorContainer) ? range.cloneRange() : null;
  }

  function restoreSelection(range: Range | null) {
    if (!range || !body) return;
    body.focus();
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  /**
   * textAngular pops a prompt for the URL. This uses the controller's own bootbox
   * dialog instead of `window.prompt`, which is unstyleable and blocks the whole
   * page. The value is validated here so a `javascript:` URL never reaches the
   * document, and the server sanitises it again on save.
   */
  async function insert(kind: 'image' | 'link' | 'video') {
    const selection = saveSelection();
    const raw = await bootbox.prompt(
      kind === 'image' ? 'Image URL' : kind === 'link' ? 'Link URL' : 'Video URL (YouTube)',
      'OK',
      'text'
    );
    restoreSelection(selection);
    if (!raw) return;
    const url = raw.trim();
    if (!/^(https?:\/\/|\/)/i.test(url)) {
      alertUnsafe();
      return;
    }
    if (kind === 'image') {
      const image = document.createElement('img');
      image.setAttribute('src', url);
      image.alt = '';
      exec('insertHTML', image.outerHTML);
    }
    else if (kind === 'link') exec('createLink', url);
    else {
      const id = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/)?.[1];
      if (!id) {
        alertUnsafe('That does not look like a YouTube URL.');
        return;
      }
      exec(
        'insertHTML',
        `<a href="https://www.youtube.com/watch?v=${id}" rel="noopener noreferrer" target="_blank">https://www.youtube.com/watch?v=${id}</a>`
      );
    }
  }

  let notice = $state('');
  let noticeTimer: ReturnType<typeof setTimeout> | null = null;
  function alertUnsafe(message = 'Only http(s) or root-relative URLs are accepted.') {
    notice = message;
    // Without clearing the previous timer, a second rejection inside the window
    // is wiped by the FIRST one's expiry — the newer message vanishes early.
    if (noticeTimer !== null) clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
      notice = '';
      noticeTimer = null;
    }, 4000);
  }

  /**
   * Which toolbar buttons are lit.
   *
   * The reference tracks BLOCK format as well as inline state — its capture shows `p` active
   * alongside `justifyLeft`, because the caret sits in a paragraph. Ours only ever asked
   * `queryCommandState` about eight inline and alignment commands, so every heading, `P`, `pre`
   * and `quote` stayed dark no matter where the caret was, and the lists never lit either.
   *
   * Block format needs `queryCommandValue('formatBlock')`, not `queryCommandState` — the latter
   * answers yes/no about a toggle, and a block format is a value. Browsers return the tag name,
   * lower-cased and occasionally wrapped in angle brackets, so both shapes are handled.
   *
   * Keyed by BUTTON NAME rather than command name, so the template reads `active[tool.name]`
   * directly. That is why `italics` and `quote` are mapped: the reference's button is `italics`
   * while the command is `italic`, and its `quote` button produces a `blockquote`.
   */
  const INLINE_COMMANDS: Record<string, string> = {
    bold: 'bold',
    italics: 'italic',
    underline: 'underline',
    strikeThrough: 'strikeThrough',
    ul: 'insertUnorderedList',
    ol: 'insertOrderedList',
    justifyLeft: 'justifyLeft',
    justifyCenter: 'justifyCenter',
    justifyRight: 'justifyRight',
    justifyFull: 'justifyFull'
  };

  /** button name -> the tag `formatBlock` reports when the caret is inside it */
  const BLOCK_TAGS: Record<string, string> = {
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    h4: 'h4',
    h5: 'h5',
    h6: 'h6',
    p: 'p',
    pre: 'pre',
    quote: 'blockquote'
  };

  function refreshActive() {
    const next: Record<string, boolean> = {};

    for (const [button, command] of Object.entries(INLINE_COMMANDS)) {
      try {
        next[button] = document.queryCommandState(command);
      } catch {
        next[button] = false;
      }
    }

    // No initialiser: both the try and the catch assign, so a value here could never be read.
    let block;
    try {
      // Chrome returns "p"; some engines return "<p>". Strip the brackets rather than guess.
      block = String(document.queryCommandValue('formatBlock') || '')
        .toLowerCase()
        .replace(/[<>]/g, '');
    } catch {
      block = '';
    }
    for (const [button, tag] of Object.entries(BLOCK_TAGS)) next[button] = block === tag;

    active = next;
  }

  /** Capture the reviewed sink after it has preserved or seeded the DOM. */
  const captureBody: Attachment<HTMLElement> = (node) => {
    body = node;

    /*
      Paragraphs, not divs.

      The reference's editing surface wraps its content in `<p>`:

        <div id="taTextElement…" contenteditable="true" ta-bind class="ta-bind …"><p>hello everyone&nbsp;</p></div>

      A bare `contenteditable` in Chrome uses `<div>` for each block instead, so ours produced
      `<div style="text-align: center">…</div>` where the reference produces `<p>`. textAngular
      normalises this; without the setting we were storing a different document shape for the same
      typing, and the landing page rendered with different block semantics and margins.

      `defaultParagraphSeparator` is a document-wide execCommand, so it is set when the surface
      mounts rather than once at module load — the editor is only present on the Branding tab, and
      setting it globally would change any other contenteditable this app grows later.
    */
    try {
      document.execCommand('defaultParagraphSeparator', false, 'p');
    } catch {
      // Firefox has thrown here historically. The editor still works; blocks are just divs.
    }

    value = editorValue(node);

    return () => {
      if (body === node) body = null;
    };
  };

  /*
    `tabindex="-1"` on every toolbar button, exactly as textAngular renders them.

    All 31 toolbar buttons in the capture carry it (`must-match/file1`); ours carried none. The
    difference is visible, not academic: without it these buttons join the tab order and take the
    browser's focus ring, which Bootstrap declares as `outline: 5px auto -webkit-focus-ring-color`.
    That is the heavy blue outline reported on the editor — five pixels where the reference shows
    nothing at all.

    Removing them from the tab order is not an accessibility regression here, it is what a toolbar
    is supposed to do: the editing surface itself is the focusable control, and each button keeps
    its `title` and `aria-label`. It is also simply what the reference does, so matching it removes
    an invention rather than adding one.

    `unselectable="on"` is the reference's too, on every button, and it is FUNCTIONAL rather than
    cosmetic: it stops the button taking the selection when it is clicked. `document.execCommand`
    acts on the live selection, so a control that steals it is a control that formats nothing. This
    code already works around that by saving and restoring the range around dialogs; the attribute
    prevents the plain-click case from needing that at all.

    HONEST GAP — `disabled="disabled"`. Every button in the capture carries it except `html`, and
    that is still true in a capture taken after typing (`ng-dirty ng-touched` on the body). So it is
    not simply "disabled until first edit". textAngular gates the toolbar on the editor holding
    focus, and every capture so far was taken with focus elsewhere — which would explain it
    entirely, but is not proven by anything on disk. Ours stay enabled: disabling them permanently
    on this evidence would break a working editor, and that is the more expensive mistake.
  */
  const TOOLBAR_BUTTON_FOCUS = { tabindex: -1, unselectable: 'on' } as const;
</script>

<div class="btn-group-small ta-root">
  <div class="ta-toolbar btn-toolbar">
    <!-- keyed on the group's first tool, not on `g`: the index is not an identity
         (see the each-block docs). `g` still positions the counters below. -->
    {#each GROUPS as group, g (group[0].name)}
      <div class="btn-group">
        {#each group as tool (tool.name)}
          <button
            class={[
              'btn btn-default',
              {
                /*
                  `active` is now keyed by BUTTON name, so the `italics`/`italic` special case
                  that used to live here is handled in `refreshActive` instead. `html` stays,
                  because it reflects this component's own view state rather than a document
                  command — there is nothing to query.
                */
                active: active[tool.name] || (tool.name === 'html' && showHtml)
              }
            ]}
            type="button"
            name={tool.name}
            title={tool.title}
            aria-label={tool.title}
            {...TOOLBAR_BUTTON_FOCUS}
            onclick={tool.run}
          >
            {#if tool.icon}<i class="fa {tool.icon}"></i>{:else}{tool.label}{/if}
          </button>
        {/each}
        {#if g === 3}
          <!-- the two live counters, sized as measured: 100 and 120 wide -->
          <div class="btn btn-default" id="toolbarWC" style="display:block; min-width:100px;">
            Words: <span>{words}</span>
          </div>
          <div class="btn btn-default" id="toolbarCC" style="display:block; min-width:120px;">
            Characters: <span>{chars}</span>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  {#if showHtml}
    <textarea
      id="{uid}-html-source"
      class="ta-bind ta-html ta-editor form-control"
      bind:value
      aria-label="HTML source"
    ></textarea>
  {:else}
    <div class="ta-scroll-window ta-text ta-editor form-control">
      <SanitizedHtml
        content={renderedContent}
        class="ta-bind"
        contenteditable="true"
        role="textbox"
        tabindex={0}
        aria-multiline="true"
        aria-label="Login landing page"
        oninput={sync}
        onkeyup={refreshActive}
        onmouseup={refreshActive}
        capture={captureBody}
      />
    </div>
  {/if}

  {#if notice}
    <p class="ta-notice" role="status">{notice}</p>
  {/if}

  <input type="hidden" {name} {value} />
</div>
