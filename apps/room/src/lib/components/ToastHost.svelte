<script lang="ts">
  import { cubicIn } from 'svelte/easing';
  import { fade, fly } from 'svelte/transition';
  import type { ToastNotice } from '#lib/toast.js';

  interface Props {
    toasts: ToastNotice[];
    ondismiss: (id: number) => void;
    onstick: (id: number) => void;
    onresume: (id: number) => void;
  }

  let { toasts, ondismiss, onstick, onresume }: Props = $props();

  function renderAlertHtml(value: string) {
    return (node: HTMLDivElement) => {
      const template = document.createElement('template');
      template.innerHTML = value;

      template.content
        .querySelectorAll('script, style, iframe, object, embed, link, meta')
        .forEach((element) => element.remove());
      template.content.querySelectorAll<HTMLElement>('*').forEach((element) => {
        for (const attribute of [...element.attributes]) {
          const name = attribute.name.toLowerCase();
          const unsafeUrl =
            (name === 'href' || name === 'src') && /^\s*javascript:/i.test(attribute.value);
          if (name.startsWith('on') || unsafeUrl) element.removeAttribute(attribute.name);
        }
      });

      node.replaceChildren(template.content.cloneNode(true));
    };
  }
</script>

<div class="overlay-container" aria-live="polite">
  <div id="toast-container" class="toast-top-right toast-container">
    {#each toasts as toast (toast.id)}
      <div
        class={`ngx-toastr toast-${toast.kind}`}
        in:fly={{ x: 300, duration: 300, easing: cubicIn }}
        out:fade={{ duration: 300, easing: cubicIn }}
        role="button"
        tabindex="0"
        onclick={() => ondismiss(toast.id)}
        onkeydown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') ondismiss(toast.id);
        }}
        onmouseenter={() => onstick(toast.id)}
        onmouseleave={() => onresume(toast.id)}
      >
        {#if toast.title}
          <div class="toast-title" aria-label={toast.title}>{toast.title}</div>
        {/if}
        {#if toast.enableHtml}
          <div role="alert" class="toast-message" {@attach renderAlertHtml(toast.message)}></div>
        {:else}
          <div role="alert" aria-label={toast.message} class="toast-message">{toast.message}</div>
        {/if}
      </div>
    {/each}
  </div>
</div>
