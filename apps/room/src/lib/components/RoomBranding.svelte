<script lang="ts">
  /*
    A room's own favicon and stylesheet, applied to the document.

    ## Why a component with no visible markup

    Both settings act on `document.head`, and the reference does it imperatively on `globalsLoaded`.
    Two of the three pieces are declarative here — a `<link>` is a `<link>` — so `<svelte:head>` owns
    them and Svelte handles the insert, the update and the removal. Only the two things
    `<svelte:head>` cannot express are done by hand, and each is done by hand for a stated reason.

    It is a COMPONENT rather than lines on the page because `RoomOverlays` already holds `data` and
    the page is the file this repository keeps shrinking. `ToastHost` is the precedent: a component
    whose whole job is a document-level side effect.

    ## The two imperative pieces

    1. **Removing the shell's icon link.** `app.html` declares
       `<link rel="icon" type="image/x-icon">`, and its own comment says that attribute is
       load-bearing precisely because `changeFavicon` uses it as the selector for the tag it
       replaces (byte 2,602,147). `<svelte:head>` can add a tag; it cannot remove one that
       `app.html` wrote. Leaving both would "let the browser choose", which that comment names as
       the failure.

    2. **The inline stylesheet.** A TEXT NODE, because ordinary Svelte interpolation HTML-escapes
       its text content and would hand the CSS parser entities instead of selectors. It is NOT for
       the reason first written here — a measured correction: a style element is RAWTEXT, so
       raw-HTML insertion there is not a script breakout either. `room-branding.ts` records the
       refuted claim and the real one.

       NO SVELTE TEMPLATE SYNTAX IN THIS COMMENT, and this file paid for the rule twice in one
       sitting: an at-html and a braced identifier, written as prose inside a script-block comment,
       each made svelte2tsx emit a module with NO DEFAULT EXPORT. Not a parse error, not a warning —
       two other files simply reported that this component does not exist. CLAUDE.md carries the
       rule; this is what breaking it looks like.
  */
  import { customFaviconHref, customStylesheetFor } from '#lib/room-branding.js';

  interface Props {
    /** `sessData.customFaviconURL`. Absent, empty or not an http(s) URL means the shell's icon. */
    readonly customFaviconURL?: string;
    /** `sessData.customCSS`. A URL is linked; anything else is inlined. */
    readonly customCSS?: string;
  }

  let { customFaviconURL, customCSS }: Props = $props();

  /*
    The cache-bust is computed ONCE per mount rather than per render.

    `Math.random()` inside a `$derived` would produce a new href on every invalidation — and this
    page invalidates every five seconds — so the browser would re-request the favicon twelve times a
    minute forever. The reference computes it once, on `globalsLoaded`, and that is the behaviour
    being reproduced rather than the literal expression.
  */
  const cacheBust = Math.random().toString(36).slice(2);
  const faviconHref = $derived(customFaviconHref(customFaviconURL, cacheBust));
  const stylesheet = $derived(customStylesheetFor(customCSS));

  /**
   * Remove the shell's own icon link, once a room's favicon is actually in place.
   *
   * Attached to the room's `<link>` rather than run as a bare `$effect`, so it cannot run when
   * there is no replacement: an attachment on an element inside `{#if faviconHref}` runs exactly
   * when that element exists. A room with no custom favicon keeps the shell's, which is right.
   */
  function replaceShellIcon() {
    const shellIcon = document.querySelector('link[type="image/x-icon"]');
    shellIcon?.remove();
    // Nothing to undo: if this component ever unmounts the page is going away with it.
  }

  /** The inline stylesheet, as a text node. See the header for why neither raw-HTML insertion nor ordinary interpolation is used. */
  function inlineStylesheet(css: string) {
    return (node: HTMLElement) => {
      node.textContent = '';
      node.appendChild(document.createTextNode(css));
    };
  }
</script>

<svelte:head>
  {#if faviconHref}
    <link id="dynamic-favicon" rel="icon" href={faviconHref} {@attach replaceShellIcon} />
  {/if}
  {#if stylesheet?.kind === 'link'}
    <link rel="stylesheet" type="text/css" href={stylesheet.href} />
  {:else if stylesheet?.kind === 'inline'}
    <style {@attach inlineStylesheet(stylesheet.css)}></style>
  {/if}
</svelte:head>
