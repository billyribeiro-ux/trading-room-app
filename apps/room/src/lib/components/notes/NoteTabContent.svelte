<script lang="ts">
  import type { RoomNote } from '$lib/types';
  import type { Attachment } from 'svelte/attachments';

  interface Props {
    readonly canEdit: boolean;
    readonly dirty: boolean;
    readonly menuId: string;
    readonly menuOpen: boolean;
    readonly note: RoomNote;
    readonly onDelete: () => void;
    readonly onRename: () => void;
    readonly onRequestWelcome: (allRooms: boolean) => void;
    readonly onSelect: () => void;
    readonly onStartEditing: () => void;
    readonly onToggleMenu: () => void;
  }

  let {
    canEdit,
    dirty,
    menuId,
    menuOpen,
    note,
    onDelete,
    onRename,
    onRequestWelcome,
    onSelect,
    onStartEditing,
    onToggleMenu
  }: Props = $props();

  let capturedName = $derived(`${note.name} `);

  function activate(event: MouseEvent, action: () => void): void {
    event.preventDefault();
    event.stopPropagation();
    action();
  }

  const attachCapturedTooltipAttributes: Attachment<HTMLAnchorElement> = (element) => {
    element.setAttribute('placement', 'bottom');
    element.setAttribute('tooltip', 'Double-Click to rename note tab');
  };
</script>

<div class="d-flex align-items-center">
  <div>
    {#if note.isWelcomeMat}
      <i class="fas fa-home mx-1" title="Welcome Mat"></i>
    {/if}
    <i
      class="fas fa-pen mx-1"
      style:display={dirty ? 'inline-block' : 'none'}
      id={`noteUpd-${note.id}`}
    ></i>
    <!--
      The source application creates this nested anchor dynamically. Keeping this
      component client-mounted preserves the captured live DOM without asking the
      HTML parser to repair invalid nested anchors during SSR.
    -->
    <!-- svelte-ignore a11y_missing_attribute -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <a
      class="editName mx-1"
      {@attach attachCapturedTooltipAttributes}
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
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <span
        id={menuId}
        data-bs-toggle="dropdown"
        aria-expanded={menuOpen}
        class="dropdown-toggle"
        onclick={(event) => activate(event, onToggleMenu)}
      >
        <i class="fas fa-cog"></i>
      </span>
      <ul aria-labelledby={menuId} class="dropdown-menu" class:show={menuOpen}>
        <li>
          <!-- svelte-ignore a11y_invalid_attribute -->
          <a href="#" class="dropdown-item" onclick={(event) => activate(event, onStartEditing)}
            ><i class="fas fa-edit"></i> Edit Note</a
          >
        </li>
        <li>
          <!-- svelte-ignore a11y_invalid_attribute -->
          <a href="#" class="dropdown-item" onclick={(event) => activate(event, onRename)}>
            Rename Note</a
          >
        </li>
        <li>
          <!-- svelte-ignore a11y_invalid_attribute -->
          <a href="#" class="dropdown-item" onclick={(event) => activate(event, onSelect)}
            ><i class="fas fa-eye"></i> Bring everyone here</a
          >
        </li>
        <li>
          <!-- svelte-ignore a11y_invalid_attribute -->
          <a
            href="#"
            class="dropdown-item"
            onclick={(event) => activate(event, () => onRequestWelcome(false))}
            ><i class="fas fa-home"></i> Make Welcome Mat</a
          >
        </li>
        <li>
          <!-- svelte-ignore a11y_invalid_attribute -->
          <a
            href="#"
            class="dropdown-item"
            onclick={(event) => activate(event, () => onRequestWelcome(true))}
            ><i class="fas fa-home"></i> Apply as Welcome Mat to multiple rooms</a
          >
        </li>
        <li>
          <!-- svelte-ignore a11y_invalid_attribute -->
          <a href="#" class="dropdown-item" onclick={(event) => activate(event, onDelete)}
            ><i class="fas fa-trash-alt"></i> Delete</a
          >
        </li>
      </ul>
    </div>
  {/if}
</div>
