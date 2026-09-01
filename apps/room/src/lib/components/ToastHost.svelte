<script lang="ts">
  import { cubicIn } from 'svelte/easing';
  import { fade } from 'svelte/transition';
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
      <!--
        ── THE TOAST ITSELF, AND WHAT NGX-TOASTR ACTUALLY ANIMATES ─────────────────────────────

        `toastClasses = `${i.toastType} ${i.config.toastClass}`` (bundle byte 883,657), so the
        captured order is the TYPE first and `ngx-toastr` second. Cosmetic to a browser and
        transcribed anyway, for the reason `fw-bold` is elsewhere in this room.

        **The entrance was a 300px slide and it should not have been.** `@flyInOut` is named for a
        slide and defines none — its three states are `opacity:0`, `opacity:1`, `opacity:0`, and
        both transitions are `{{easeTime}}ms {{easing}}`, which the default config resolves to
        `300ms ease-in`. A toast that flew in from the right was this room's invention, and the one
        thing on this surface a user would notice.

        `cubicIn` stands in for CSS `ease-in`: Svelte's easing set has no exact equivalent
        (`ease-in` is `cubic-bezier(.42,0,1,1)`, nearer quadratic), and over 300ms the two differ by
        a few percent. Named here rather than left to look exact.

        `role="button"`, `tabindex` and the keydown ARE ours. Upstream binds `tapToDismiss` to a
        host `click` on a plain element, which no keyboard can reach — the same divergence this room
        records at every captured click-on-a-div.
      -->
      <div
        class={`toast-${toast.kind} ngx-toastr`}
        in:fade={{ duration: 300, easing: cubicIn }}
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
