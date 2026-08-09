<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    mode: 'alert' | 'confirm' | 'prompt';
    message: string;
    onclose: () => void;
    onconfirm?: (value?: string) => void;
    className?: string;
    title?: string;
    value?: string;
    children?: Snippet;
    /**
     * Replaces the default footer.
     *
     * `bootbox.dialog({buttons: {...}})` takes an arbitrary button set, and not every call site
     * wants OK/Cancel: `randomUser()` asks for "User Info" (`btn-warning btn-random-user`) and
     * "Close" (`btn-danger`), and its User Info handler returns `false` to keep the dialog open.
     */
    footer?: Snippet;
  }

  let {
    mode,
    message,
    onclose,
    onconfirm,
    className = '',
    title = '',
    value = '',
    children,
    footer
  }: Props = $props();
  let promptValue = $state('');
  let promptTouched = $state(false);

  function promptResult(): string {
    return promptTouched ? promptValue : value;
  }

  function accept(): void {
    onconfirm?.(mode === 'prompt' ? promptResult() : undefined);
  }

  function focusDialog(dialog: HTMLDivElement): () => void {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTarget = dialog.querySelector<HTMLElement>(
      mode === 'prompt' ? '.bootbox-input' : '.bootbox-accept'
    );

    queueMicrotask(() => focusTarget?.focus());

    return () => {
      if (previousFocus?.isConnected) {
        queueMicrotask(() => previousFocus.focus());
      }
    };
  }
</script>

<div
  class="bootbox modal fade bootbox-{mode}{className ? ` ${className}` : ''} show"
  tabindex="-1"
  role="dialog"
  aria-modal="true"
  aria-label={title || `${mode[0].toUpperCase()}${mode.slice(1)} dialog`}
  style="display: block;"
  {@attach focusDialog}
>
  <div class="modal-dialog">
    <div class="modal-content">
      <div class:modal-header={true} class:border-0={mode !== 'prompt'}>
        <h5 class="modal-title">{title}</h5>
        <button
          type="button"
          class="bootbox-close-button close btn-close"
          aria-label="Close"
          onclick={onclose}
        ></button>
      </div>
      <div class="modal-body">
        <div class="bootbox-body">
          {#if mode === 'prompt'}
            <form
              class="bootbox-form"
              onsubmit={(event) => {
                event.preventDefault();
                accept();
              }}
            >
              <input
                id="bootbox-prompt-input"
                name="bootboxPrompt"
                class="bootbox-input bootbox-input-text form-control"
                autocomplete="off"
                type="text"
                value={promptResult()}
                oninput={(event) => {
                  promptTouched = true;
                  promptValue = event.currentTarget.value;
                }}
              />
            </form>
          {:else if children}
            {@render children()}
          {:else}
            {message}
          {/if}
        </div>
      </div>
      <div class="modal-footer">
        {#if footer}
          {@render footer()}
        {:else if mode === 'confirm' || mode === 'prompt'}
          <button
            type="button"
            class="btn btn-secondary btn-default bootbox-cancel"
            onclick={onclose}
          >
            Cancel
          </button>
          <button type="button" class="btn btn-primary bootbox-accept" onclick={accept}>OK</button>
        {:else}
          <button type="button" class="btn btn-primary bootbox-accept" onclick={onclose}>OK</button>
        {/if}
      </div>
    </div>
  </div>
</div>
<div class="modal-backdrop fade show"></div>
