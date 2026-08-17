<script lang="ts">
  import { bootbox } from '#lib/bootbox.svelte.js';
  import type { Attachment } from 'svelte/attachments';

  /**
   * Renders the single in-flight `bootbox.confirm()` or `bootbox.prompt()` — see
   * $lib/bootbox.svelte.ts for the captured markup each one reproduces. They are
   * NOT the same shape: the prompt has a `modal-header` with an `h4.modal-title`
   * and puts its × there, while the confirm has no header at all and hangs its ×
   * inside the body on a -10px top margin.
   *
   * Class names are the literal Bootstrap/bootbox ones (`bootbox modal fade in`,
   * `modal-dialog`, `modal-content`, `bootbox-close-button close`,
   * `bootbox-body`, `btn btn-default`, `data-bb-handler`), because that is what
   * the reference emits; account.css scopes every rule under `.bootbox` so none
   * of it leaks.
   *
   * Two deliberate departures, neither of which moves a pixel:
   *
   *  - `aria-modal` + `aria-labelledby` on the dialog. bootbox emits neither, so
   *    a screen reader is free to wander into the page behind the modal and is
   *    told nothing about what it is being asked to confirm.
   *  - Tab is trapped inside the dialog and focus is restored to
   *    whatever opened the dialog. bootbox leaves focus wherever it was, which
   *    on a keyboard means pressing Enter re-triggers the button behind the
   *    overlay.
   *
   * The reference's `aria-hidden="true"` on the × IS kept: it is redundant with
   * Cancel, so hiding it from assistive tech loses nothing and matches the DOM.
   */
  let shown = $state(false);
  let promptValue = $state('');
  let restoreFocus: HTMLElement | null = null;

  const current = $derived(bootbox.current);

  /**
   * bootbox adds `.in` a frame after inserting the node, which is what makes the
   * opacity and translate transitions run. Rendering with `.in` already present
   * would jump straight to the end state.
   */
  const raise: Attachment<HTMLElement> = (node) => {
    restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.classList.add('modal-open');

    // Seeded, not blanked: the captured dark-theme dialog renders its input with the current
    // value already in it, so pressing Set without typing keeps what was there.
    promptValue = bootbox.current?.value ?? '';
    const frame = requestAnimationFrame(() => {
      shown = true;
      // bootbox focuses a prompt's input and a confirm's OK button
      node
        .querySelector<HTMLElement>('.bootbox-input, [data-bb-handler="confirm"]')
        ?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      shown = false;
      document.body.classList.remove('modal-open');
      restoreFocus?.focus();
      restoreFocus = null;
    };
  };

  function onkeydown(event: KeyboardEvent) {
    if (!current) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      bootbox.settle(false);
      return;
    }

    if (event.key !== 'Tab') return;

    const dialog = event.currentTarget as HTMLElement;
    // the prompt's input is in the ring too, otherwise Shift+Tab off the ×
    // wraps straight past the field the dialog exists to collect
    const focusable = [...dialog.querySelectorAll<HTMLElement>('button, input, textarea')];
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
</script>

{#if current}
  <div class={['bootbox-backdrop fade', { in: shown }]}></div>

  <!-- The backdrop click handler lives on the scroll container, exactly as
       Bootstrap's does: anything outside .modal-dialog dismisses. It is a div
       because that is the element bootbox emits; the keyboard has Escape and
       the Cancel button, so no interactive-element role is warranted. -->
  <div
    class={['bootbox modal fade', { in: shown }]}
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-labelledby="bootbox-body"
    {onkeydown}
    onclick={(event) => {
      if (event.target === event.currentTarget) bootbox.settle(false);
    }}
    {@attach raise}
  >
    <div class="modal-dialog">
      <div class="modal-content">
        {#if current.kind === 'prompt'}
          <!-- the prompt variant has a header; the confirm variant does not, and
               puts its × inside the body with a -10px top margin instead -->
          <div class="modal-header">
            <button
              type="button"
              class="bootbox-close-button close"
              data-dismiss="modal"
              aria-hidden="true"
              onclick={() => bootbox.settle(null)}>×</button
            >
            <h4 class="modal-title" id="bootbox-body">{current.message}</h4>
          </div>
          <div class="modal-body">
            <div class="bootbox-body">
              <form class="bootbox-form" onsubmit={(e) => e.preventDefault()}>
                {#if current.inputType === 'text'}
                  <input
                    class="bootbox-input bootbox-input-text form-control"
                    id="bootbox-prompt"
                    name="bootbox-prompt"
                    autocomplete="off"
                    type="text"
                    bind:value={promptValue}
                    aria-label={current.message}
                  />
                {:else}
                  <textarea
                    class="bootbox-input bootbox-input-textarea form-control"
                    id="bootbox-prompt"
                    name="bootbox-prompt"
                    autocomplete="off"
                    bind:value={promptValue}
                    aria-label={current.message}
                  ></textarea>
                {/if}
              </form>
            </div>
          </div>
          <div class="modal-footer">
            <button
              data-bb-handler="cancel"
              type="button"
              class="btn btn-default"
              onclick={() => bootbox.settle(null)}>Cancel</button
            >
            <button
              data-bb-handler="confirm"
              type="button"
              class="btn btn-primary"
              onclick={() => bootbox.settle(promptValue)}>{current.okLabel}</button
            >
          </div>
        {:else}
          <div class="modal-body">
            <button
              type="button"
              class="bootbox-close-button close"
              data-dismiss="modal"
              aria-hidden="true"
              style="margin-top: -10px;"
              onclick={() => bootbox.settle(false)}>×</button
            >
            <div class="bootbox-body" id="bootbox-body">{current.message}</div>
          </div>
          <div class="modal-footer">
            <button
              data-bb-handler="cancel"
              type="button"
              class="btn btn-default"
              onclick={() => bootbox.settle(false)}>Cancel</button
            >
            <button
              data-bb-handler="confirm"
              type="button"
              class="btn btn-primary"
              onclick={() => bootbox.settle(true)}>{current.okLabel}</button
            >
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
