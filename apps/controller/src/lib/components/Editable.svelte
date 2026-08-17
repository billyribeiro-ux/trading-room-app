<script lang="ts">
  import { enhance } from '$app/forms';
  import { editableText, isEditableEmpty } from '#lib/editable-display.js';
  import type { RoomSettingDef } from '#lib/room-settings-schema.js';

  /**
   * One angular-xeditable field.
   *
   * The reference renders every room setting as a dashed-underline link that
   * swaps for an inline editor when clicked, and saves through
   * `onaftersave="saveSessField('name')"` — one field per request, never a form
   * submit of the whole page. An unset value shows the literal italic word
   * "empty" (or "No" for a checkbox); that is real UI copy, not a placeholder,
   * so it is reproduced rather than replaced with a blank.
   *
   * The trigger has to be an INLINE element, not an inline-block. The reference
   * uses `<a href="">` with a dashed `border-bottom`; on an inline box that
   * border contributes nothing to the line height, but on a <button> — which
   * Chrome will not let you make `display: inline` — it added 1px to every row,
   * and 260 settings' worth of that walks the page a long way down.
   *
   * So: a span with `role="button"`, a tabindex and a keydown handler. It is
   * genuinely operable from the keyboard, which the reference's hrefless anchor
   * is not, and it measures exactly like one.
   */
  interface Props {
    def: RoomSettingDef;
    value: string | number | boolean | null | undefined;
    /*
      `markUnwired` USED TO BE HERE, and its removal is the second half of a change that stopped
      halfway. The marker it drove was deleted for the reason recorded down in the template; the
      prop outlived it, so six call sites kept passing a flag that no line of this component read.

      A prop that is documented, passed everywhere and consumed nowhere is the exact shape this
      repository calls dead scaffolding — and it survived because it LOOKS wired. ESLint is what
      found it, on the first run after the tooling was fixed.

      Nothing is lost: `def.wired` still exists, `verify-room-settings-schema.mjs` still gates on it,
      and `room-config-boundary.test.ts` still fails if a setting crosses to the room while unwired.
    */
    /** for `select` fields — the reference's `e-ng-options` list */
    options?: readonly { readonly value: string; readonly text: string }[];
  }

  let { def, value, options }: Props = $props();

  let open = $state(false);
  let draft = $state('');

  const isCheckbox = $derived(def.type === 'checkbox');

  /* Both rules, and the node tally behind them, are in `#lib/editable-display.js`. */
  const empty = $derived(isEditableEmpty(value, isCheckbox));
  const shown = $derived(editableText(value, isCheckbox, options));

  function start() {
    draft = isCheckbox ? (value ? 'on' : '') : empty ? '' : String(value);
    open = true;
  }
</script>

<!--
  NO WRAPPER ELEMENT.

  This component used to wrap everything in a bare `<span>`, so the reference's
  `<p class="form-control-static"><a class="editable editable-click">…</a></p>` came out as
  `<p><span><span class="editable editable-click">…</span></span></p>` — one extra element inside
  every one of the 260 settings rows on the page.

  A Svelte component may have several root nodes, so the `{#if}` can be the root directly. The
  element the parent already provides is the only wrapper there should be.
-->
{#if open}
  <form
      class="editable-form"
      method="POST"
      action="?/saveField"
      use:enhance={() =>
        async ({ update }) => {
          await update({ reset: false });
          open = false;
        }}
    >
      <input type="hidden" name="name" value={def.name} />
      {#if isCheckbox}
        <label>
          <input type="checkbox" name="value" checked={!!value} value="on" />
          {def.label ?? def.name}
        </label>
      {:else if def.type === 'textarea'}
        <textarea class="form-control" name="value" rows="3" bind:value={draft}></textarea>
      {:else if options}
        <select class="form-control" name="value" bind:value={draft}>
          {#each options as option (option.value)}
            <option value={option.value}>{option.text}</option>
          {/each}
        </select>
      {:else if def.type === 'number'}
        <input class="form-control" type="number" name="value" bind:value={draft} />
      {:else if def.type === 'date' || def.type === 'combodate'}
        <input class="form-control" type="date" name="value" bind:value={draft} />
      {:else}
        <input class="form-control" type="text" name="value" bind:value={draft} />
      {/if}
      <span class="editable-buttons">
        <button class="acc-btn acc-btn-sm acc-btn-primary" type="submit" aria-label="Save">
          <i class="fa fa-check"></i>
        </button>
        <button
          class="acc-btn acc-btn-sm acc-btn-default"
          type="button"
          aria-label="Cancel"
          onclick={() => (open = false)}><i class="fa fa-times"></i></button
        >
      </span>
    </form>
  {:else}
    <!--
      An ANCHOR, as the reference has it — `<a href="">` — not a span with `role="button"`.

      The span was chosen to avoid a `<button>`, which Chrome refuses to make `display: inline` and
      which therefore added 1px to every one of 260 rows. That reasoning was right about the button
      and wrong about the remedy: an anchor is already inline, so the dashed `border-bottom` costs
      no line height, AND it is natively focusable and activated by Enter — which a bare span is
      not, and which is why the span needed `role`, `tabindex` and a keydown handler to catch up.

      `href=""` is the reference's own value. It resolves to the current URL and is never followed:
      the click is always prevented, and the inline editor is client-side by nature.
    -->
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
    <!--
      `a11y_invalid_attribute` suppressed, not dodged. `href=""` is the value the reference's own
      editable anchors carry, the click is always prevented, and the control keeps its keyboard
      affordance. Left unsuppressed it failed `pnpm check`, which runs `--fail-on-warnings`; this
      was the oldest of the three warnings that had the package's own gate at exit 1.
    -->
    <!-- svelte-ignore a11y_invalid_attribute -->
    <a
      class={['editable editable-click', { 'editable-empty': !isCheckbox && empty }]}
      href=""
      onclick={(e) => {
        e.preventDefault();
        start();
      }}>{shown}</a
    >
    <!--
      REMOVED: a `<span class="mg-unwired">not wired</span>` marker.

      It was ours, not the reference's, and it was VISIBLE TEXT. On the SSO Setup tab — one row, one
      field — the pane read "empty not wired" against the reference's "empty", so an invented label
      was half of everything on screen. Being honest about an unwired setting is worth doing; doing
      it in the operator's face, on a page whose whole job is to match, is not.

      Nothing is lost: `def.wired` still exists, `scripts/verify-room-settings-schema.mjs` still
      gates on it, and `room-config-boundary.test.ts` still fails if a setting crosses to the room
      while marked unwired.

      The `markUnwired` PROP that used to drive this is gone too, 2026-08-14. Deleting the marker
      and leaving the prop behind meant six call sites passing a flag nothing read — see the note
      where it was declared.
    -->
  {/if}
