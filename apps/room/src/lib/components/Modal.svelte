<script lang="ts">
  import type { Snippet } from 'svelte';

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
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  {id}
  tabindex="-1"
  role={rootRole}
  aria-labelledby={ariaLabelledby}
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
