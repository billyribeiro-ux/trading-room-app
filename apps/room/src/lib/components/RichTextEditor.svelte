<script lang="ts">
  /**
   * The chat rich text editor — the five controls the reference's captured config declares.
   *
   * ```js
   * rteConfig = {
   *   placeholder: 'Type your message here...', minHeight: 200,
   *   toolbar: [['font', ['bold', 'italic', 'underline', 'clear']], ['color', ['forecolor']]],
   *   popover: { air: [] }, dialogsInBody: true, disableResizeEditor: true
   * }
   * ```
   *
   * ## What is captured and what is not
   *
   * The BUTTON SET, the placeholder and the 200px minimum are the reference's, verbatim. The
   * toolbar's MARKUP is not: summernote generates its own, and no capture in this repository holds
   * it. So the toolbar below is ours, built from the Bootstrap 5 classes the room already uses, and
   * this comment says so rather than letting it look transcribed. `popover.air: []` and
   * `disableResizeEditor: true` are both "no extra UI", which is the default here anyway — nothing
   * to reproduce.
   *
   * ## Where the buttons are NOT
   *
   * There is no Close and no Send here, and that is the captured shape: the modal owns them. Its
   * `modal-footer` holds a `d-flex justify-content-between w-100 align-items-center` with a
   * `btn-secondary` Close and a `btn-primary` whose label is Save or Send, and `#msgTxtContainer` —
   * where this component mounts — is only the editor host inside `modal-body`. Duplicating them
   * here would put two of each on screen.
   *
   * ## Why `execCommand`
   *
   * It is deprecated and it is still the only thing every browser implements for a contenteditable
   * region. The alternative is walking Ranges and splicing elements by hand, which for five
   * commands is more code, more edge cases and more ways to produce markup the sanitiser then
   * strips. If it is ever removed, the failure is visible and local: a button stops working, the
   * text is untouched, and nothing unsafe happens.
   *
   * ## The safety boundary is NOT here
   *
   * Whatever this produces is sanitised on the server before storage and again in the browser
   * before rendering. This component is a convenience for the person typing; it is not a control,
   * because the same request can be made without it.
   */
  type Props = {
    /**
     * The message being composed, as HTML.
     *
     * Bindable and bound to `innerHTML`, which is the documented Svelte binding for a
     * `contenteditable` region. It is two-way, and it does not fight the caret: Svelte only writes
     * when the value differs from what the element already holds, and while somebody types the
     * input handler has just set them equal.
     */
    value?: string;
  };

  let { value = $bindable('') }: Props = $props();

  let editor = $state<HTMLElement | null>(null);
  /** The colour the swatch currently shows. Black is the browser default for new text. */
  let color = $state('#000000');

  /**
   * Keeps the element reference and puts the caret in it.
   *
   * An attachment rather than `bind:this`: the reference is wanted for exactly as long as the
   * element exists, which is what an attachment's cleanup expresses and what a `bind:this` plus an
   * effect only approximates. Loading the content is NOT done here — `bind:innerHTML` does it.
   */
  function mountEditor(node: HTMLElement) {
    editor = node;
    node.focus();
    return () => {
      editor = null;
    };
  }

  /**
   * `document.execCommand`, wrapped so every button restores focus and reports what it changed.
   *
   * The focus call first: without it the command applies to whatever the browser thinks is selected
   * after the click, which is the toolbar button — so nothing happens and the control looks broken.
   *
   * The assignment last, and it is not belt-and-braces. `bind:innerHTML` updates on the element's
   * own `input` event; this code mutated the DOM itself, so it is this code's job to say so. The
   * DOM is the authority either way — reading it back is what makes the bound value true rather
   * than a guess about which edits fire which events.
   */
  function run(command: string, argument?: string) {
    editor?.focus();
    document.execCommand(command, false, argument);
    if (editor) value = editor.innerHTML;
  }

  /** `clear` in the captured toolbar. `removeFormat` is execCommand's name for the same act. */
  function clearFormatting() {
    run('removeFormat');
  }
</script>

<div class="ptr-rte">
  <!--
    OURS, not captured: summernote renders its own toolbar and no capture holds that markup. The
    button SET is the reference's — bold, italic, underline, clear, forecolor — and nothing else,
    because a sixth control would be a capability the captured config does not have.
  -->
  <div class="ptr-rte-toolbar btn-toolbar" role="toolbar" aria-label="Formatting">
    <div class="btn-group btn-group-sm me-2" role="group">
      <button type="button" class="btn btn-secondary" title="Bold" onclick={() => run('bold')}>
        <b>B</b>
      </button>
      <button type="button" class="btn btn-secondary" title="Italic" onclick={() => run('italic')}>
        <i>I</i>
      </button>
      <button
        type="button"
        class="btn btn-secondary"
        title="Underline"
        onclick={() => run('underline')}
      >
        <u>U</u>
      </button>
      <button
        type="button"
        class="btn btn-secondary"
        title="Remove formatting"
        onclick={clearFormatting}
      >
        Clear
      </button>
    </div>
    <div class="btn-group btn-group-sm" role="group">
      <label class="btn btn-secondary mb-0" for="ptr-rte-color" title="Text colour">
        Colour
        <input
          id="ptr-rte-color"
          type="color"
          class="ptr-rte-color"
          bind:value={color}
          oninput={() => run('foreColor', color)}
        />
      </label>
    </div>
  </div>

  <!--
    `minHeight: 200` and the placeholder are the reference's. The placeholder is a CSS `::before`
    on the empty state rather than an attribute, because `contenteditable` has no placeholder.
  -->
  <div
    {@attach mountEditor}
    bind:innerHTML={value}
    class="ptr-rte-body form-control"
    contenteditable="true"
    role="textbox"
    tabindex="0"
    aria-multiline="true"
    aria-label="Message"
    data-placeholder="Type your message here..."
  ></div>
</div>

<style>
  .ptr-rte-toolbar {
    margin-bottom: 6px;
  }

  /* `minHeight: 200` — the reference's own number. */
  .ptr-rte-body {
    min-height: 200px;
    overflow-y: auto;
    text-align: left;
  }

  /* `contenteditable` has no placeholder attribute, so the empty state draws its own. */
  .ptr-rte-body:empty::before {
    content: attr(data-placeholder);
    opacity: 0.6;
  }

  /* The swatch sits inside its label so the whole control is one target. */
  .ptr-rte-color {
    width: 1.4rem;
    height: 1.1rem;
    padding: 0;
    border: 0;
    background: none;
    vertical-align: middle;
    margin-left: 0.35rem;
    cursor: pointer;
  }
</style>
