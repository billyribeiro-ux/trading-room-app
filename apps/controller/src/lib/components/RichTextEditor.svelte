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

  let body: HTMLElement | null = null;
  let showHtml = $state(false);
  let renderedContent = $derived(initialContent);
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

  function sync() {
    if (body) value = editableHtml(body);
    refreshActive();
  }

  function toggleHtml() {
    if (showHtml) {
      renderedContent = sanitizeHtml(value);
      value = renderedContent;
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

  function refreshActive() {
    const next: Record<string, boolean> = {};
    for (const cmd of ['bold', 'italic', 'underline', 'strikeThrough', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull']) {
      try {
        next[cmd] = document.queryCommandState(cmd);
      } catch {
        next[cmd] = false;
      }
    }
    active = next;
  }

  /** Capture the reviewed sink after it has preserved or seeded the DOM. */
  const captureBody: Attachment<HTMLElement> = (node) => {
    body = node;
    value = editableHtml(node);

    return () => {
      if (body === node) body = null;
    };
  };
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
                active:
                  active[tool.name] ||
                  (tool.name === 'italics' && active.italic) ||
                  (tool.name === 'html' && showHtml)
              }
            ]}
            type="button"
            name={tool.name}
            title={tool.title}
            aria-label={tool.title}
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
    <textarea class="ta-bind ta-html ta-editor form-control" bind:value aria-label="HTML source"
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
