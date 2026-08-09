<script lang="ts">
  /**
   * Renders whatever `toast.success()` / `toast.error()` has queued.
   *
   * Mounted once, near the root, so any page can confirm an action without owning the markup.
   * Styling follows angular-toaster's own defaults — top-right, stacked, coloured by kind — since
   * that is the library the reference loads, so a confirmation lands where the original's would
   * have.
   */
  import { fade, fly } from 'svelte/transition';
  import { dismiss, toasts } from '$lib/toast.svelte';
</script>

{#if toasts.length > 0}
  <!--
    `aria-live="polite"` and not `assertive`: a save confirmation should be announced when the
    reader finishes its sentence, not cut across it. Failures still go to the red `role="alert"` in
    the page, which is the one that interrupts.
  -->
  <div class="mg-toast-host" aria-live="polite" aria-atomic="false">
    {#each toasts as item (item.id)}
      <button
        class="mg-toast mg-toast-{item.kind}"
        type="button"
        onclick={() => dismiss(item.id)}
        in:fly={{ x: 20, duration: 150 }}
        out:fade={{ duration: 150 }}
      >
        {item.message}
      </button>
    {/each}
  </div>
{/if}

<style>
  /* Fixed, so a confirmation is visible regardless of how far down the settings pane is scrolled —
     the manage page runs to 11,000px and a toast rendered in flow would appear off-screen. */
  .mg-toast-host {
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 2000;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
  }

  .mg-toast {
    pointer-events: auto;
    min-width: 240px;
    max-width: 340px;
    padding: 12px 15px;
    border: none;
    border-radius: 4px;
    font-family: inherit;
    font-size: 14px;
    line-height: 20px;
    text-align: left;
    color: #fff;
    cursor: pointer;
    box-shadow: rgba(0, 0, 0, 0.3) 0 3px 10px;
  }

  /* angular-toaster's own palette */
  .mg-toast-success {
    background-color: rgb(81, 163, 81);
  }
  .mg-toast-error {
    background-color: rgb(189, 54, 47);
  }
</style>
