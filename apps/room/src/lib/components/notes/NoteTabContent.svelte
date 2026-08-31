<script lang="ts">
  import { ngbTooltip } from '#lib/ngb-tooltip.js';
  import {
    WELCOME_MAT_TOOLTIP,
    activateNoteMenuItem,
    activateNoteMenuOnKey,
    attachCapturedRenameTooltip,
    type NoteTabContentProps
  } from './note-tab-chrome';

  /**
   * One note tab's chrome: the Welcome Mat badge, the dirty pen, the rename anchor and the gear.
   *
   * The props, the three rows this pass closed (NTC-1 the badge, NTC-2 the gear's keyboard path,
   * NTC-3 the per-tab menu id) and the consts they were read from are in `note-tab-chrome.ts`,
   * beside the constants and handlers they govern.
   */
  let {
    canEdit,
    dirty,
    menuId,
    menuOpen,
    note,
    onDelete,
    onRename,
    onRequestWelcome,
    onBringEveryone,
    onStartEditing,
    onToggleMenu
  }: NoteTabContentProps = $props();

  let capturedName = $derived(`${note.name} `);
</script>

<!--
  One dropdown row, five times — `USe` in the capture, whose six list items are identical but for
  the icon and the label. Each label carries the reference's own LEADING space, `v(7," Edit Note")`
  and its five siblings, which is what puts the gap between the icon and the word.

  The icon is a REQUIRED parameter and Rename Note is written out below rather than passing
  `undefined` for it. That is not an oversight: a conditional block and an optional render both emit an
  SSR anchor comment between the icon and the label — measured — and `notes-pane-render.test.ts`
  asserts that pair contiguously against the capture. One row of duplication is cheaper than a
  comment node inside every label.
-->
{#snippet menuItem(label: string, icon: string, run: () => void)}
  <li>
    <!-- svelte-ignore a11y_invalid_attribute -->
    <a href="#" class="dropdown-item" onclick={(event) => activateNoteMenuItem(event, run)}
      ><i class={`fas ${icon}`}></i>{label}</a
    >
  </li>
{/snippet}

<div class="d-flex align-items-center">
  <div>
    <!--
      NTC-1 — the Welcome Mat marker is a green `badge-success` pill carrying a whole sentence,
      const 122 of `app-presentationarea`. `note-tab-chrome.ts` holds the const, the measurement
      that `title="Welcome Mat"` is nowhere in the bundle, and why the reference's "noboby" stays.
    -->
    {#if note.isWelcomeMat}
      <span
        {...{ placement: 'bottom', ngbtooltip: WELCOME_MAT_TOOLTIP } as Record<string, string>}
        {@attach ngbTooltip}
        class="badge badge-success mx-1 p-0"
      >
        <i class="fas fa-home"></i>
      </span>
    {/if}
    <i
      class="fas fa-pen mx-1"
      style:display={dirty ? 'inline-block' : 'none'}
      id={`noteUpd-${note.id}`}
    ></i>
    <!-- Why this nested anchor is mounted rather than rendered: `attachCapturedRenameTooltip`. -->
    <!-- svelte-ignore a11y_missing_attribute -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <a
      class="editName mx-1"
      {@attach attachCapturedRenameTooltip}
      ondblclick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (canEdit) onRename();
      }}
      >{capturedName}
    </a>
  </div>
  {#if canEdit}
    <div>
      <!--
        NTC-2 — `role`, `tabindex`, `aria-label` and the key handler are OURS; const 126 is a bare
        `dropdown-toggle` span with no text, and no Bootstrap ships here to adopt it, so every note
        action behind this gear was mouse-only. `note-tab-chrome.ts` carries the measurement.

        NTC-3 — `id` and `aria-expanded` are LIVE where the capture freezes them at
        `dropdownMenuNote` / `"false"`. Two open notes would be two elements with one id, and every
        menu's `aria-labelledby` would resolve to the first gear. A deliberate divergence: matching
        it here would reproduce a defect.
      -->
      <span
        id={menuId}
        role="button"
        tabindex="0"
        aria-label="Note options"
        data-bs-toggle="dropdown"
        aria-expanded={menuOpen}
        class="dropdown-toggle"
        onclick={(event) => activateNoteMenuItem(event, onToggleMenu)}
        onkeydown={(event) => activateNoteMenuOnKey(event, onToggleMenu)}
      >
        <i class="fas fa-cog"></i>
      </span>
      <ul aria-labelledby={menuId} class={['dropdown-menu', { show: menuOpen }]}>
        {@render menuItem(' Edit Note', 'fa-edit', onStartEditing)}
        <li>
          <!-- svelte-ignore a11y_invalid_attribute -->
          <a
            href="#"
            class="dropdown-item"
            onclick={(event) => activateNoteMenuItem(event, onRename)}>{' Rename Note'}</a
          >
        </li>
        {@render menuItem(' Bring everyone here', 'fa-eye', onBringEveryone)}
        {@render menuItem(' Make Welcome Mat', 'fa-home', () => onRequestWelcome(false))}
        {@render menuItem(' Apply as Welcome Mat to multiple rooms', 'fa-home', () =>
          onRequestWelcome(true)
        )}
        {@render menuItem(' Delete', 'fa-trash-alt', onDelete)}
      </ul>
    </div>
  {/if}
</div>
