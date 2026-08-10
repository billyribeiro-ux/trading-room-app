<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Attachment } from 'svelte/attachments';

  interface Props {
    id: string;
    ariaLabelledby: string;
    onclose: () => void;
    open?: boolean;
    closedStyle?: string;
    closedAriaHidden?: boolean;
    children?: Snippet;
    title?: string;
    titleId?: string;
    titleClass?: string;
    titleTag?: 'h3' | 'h5';
    header?: Snippet;
    beforeBody?: Snippet;
    footer?: Snippet;
    rootClass?: string;
    rootRole?: 'dialog' | null;
    rootAttributes?: Record<string, string>;
    dialogClass?: string;
    dialogRole?: 'document' | null;
    dialogStyle?: string;
    bodyClass?: string;
    bodyStyle?: string;
    headerClass?: string;
    footerClass?: string;
    footerOutsideContent?: boolean;
  }

  let {
    id,
    ariaLabelledby,
    onclose,
    open = false,
    closedStyle,
    closedAriaHidden = true,
    children,
    title = '',
    titleId,
    titleClass = '',
    titleTag = 'h5',
    header,
    beforeBody,
    footer,
    rootClass = 'modal fade',
    rootRole = 'dialog',
    rootAttributes = {},
    dialogClass = '',
    dialogRole = 'document',
    dialogStyle,
    bodyClass = '',
    bodyStyle,
    headerClass = '',
    footerClass = '',
    footerOutsideContent = false
  }: Props = $props();

  function handleBackdrop(event: MouseEvent) {
    if (open && event.target === event.currentTarget) onclose();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (open && event.key === 'Escape') onclose();
  }

  /**
   * A closed modal is `inert`, and that is a real bug fix rather than tidying.
   *
   * Chrome refuses `aria-hidden` on an ancestor of the focused element and says so in the console:
   *
   *   Blocked aria-hidden on an element because its descendant retained focus. … Consider using
   *   the inert attribute instead, which will also prevent focus.
   *
   * It fires on the ordinary path, not an exotic one: a modal is closed BY clicking a control
   * inside it, so at the instant `open` flips false the focus is still on that button and
   * `aria-hidden="true"` lands on its ancestor. Seen in production on `#alert-modal`
   * (`button.btn-success`) and `#play-youtube-modal` (`button.btn-close`). The consequence is not
   * cosmetic: Chrome IGNORES the `aria-hidden`, so a closed dialog stays in the accessibility tree
   * and a screen-reader user can tab into a dialog nobody can see.
   *
   * `inert` is the browser's own suggestion and the spec's answer — it removes the subtree from the
   * accessibility tree AND makes it unfocusable, so the conflict cannot arise. `aria-hidden` stays
   * beside it because the reference's markup carries it and it costs nothing.
   *
   * The explicit blur is belt and braces. Making an element inert is defined to move focus out, but
   * that happens as the attribute is applied, and both attributes change in the same update here.
   * Releasing focus ourselves means the outcome does not depend on which the browser processes
   * first.
   */
  const releaseFocusWhenClosed: Attachment<HTMLDivElement> = (node) => {
    $effect(() => {
      if (open) return;
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && node.contains(focused)) focused.blur();
    });
  };
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  {@attach releaseFocusWhenClosed}
  {id}
  tabindex="-1"
  role={rootRole}
  aria-labelledby={ariaLabelledby}
  inert={!open}
  aria-hidden={!open && closedAriaHidden ? 'true' : undefined}
  class={open ? `${rootClass} show` : rootClass}
  style={open ? 'display: block; visibility: visible;' : closedStyle}
  {...rootAttributes}
  onclick={handleBackdrop}
>
  <div
    role={dialogRole}
    class="modal-dialog{dialogClass ? ` ${dialogClass}` : ''}"
    style={dialogStyle}
  >
    <div class="modal-content">
      <div class="modal-header{headerClass ? ` ${headerClass}` : ''}">
        {#if header}
          {@render header()}
        {:else}
          <svelte:element this={titleTag} id={titleId} class={titleClass || undefined}>
            {title}
          </svelte:element>
        {/if}
        <button
          type="button"
          data-bs-dismiss="modal"
          aria-label="Close"
          class="btn-close btn-close-white"
          onclick={onclose}
        ></button>
      </div>
      {#if beforeBody}
        {@render beforeBody()}
      {/if}
      <div class="modal-body{bodyClass ? ` ${bodyClass}` : ''}" style={bodyStyle}>
        {#if children}{@render children()}{/if}
      </div>
      {#if footer && !footerOutsideContent}
        <div class="modal-footer{footerClass ? ` ${footerClass}` : ''}">
          {@render footer()}
        </div>
      {/if}
    </div>
    {#if footer && footerOutsideContent}
      <div class="modal-footer{footerClass ? ` ${footerClass}` : ''}">
        {@render footer()}
      </div>
    {/if}
  </div>
</div>
