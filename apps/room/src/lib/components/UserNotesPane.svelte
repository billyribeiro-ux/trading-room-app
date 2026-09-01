<script lang="ts">
  import type { UserNoteView } from '#lib/server/user-notes.js';
  import { shortWhen } from '#lib/short-when.js';

  /**
   * `#user-modal`'s Admin Notes tab, both halves of it.
   *
   * ## Why this is a component and not eighteen more lines of `ModalHost.svelte`
   *
   * `source-size-contract.test.ts` had three lines of headroom left on that file when this was
   * built. The ratchet's instruction in that situation is one sentence — extract a slice into a
   * component rather than raise the number — and the tab is a clean slice: it has its own gate, its
   * own data and its own two actions, and nothing else in the modal reads any of them.
   *
   * ## Upstream is a two-state switch, and this room only had one of the states
   *
   * `O(104, e.allowToManageNotes ? 105 : 104)` — 104 is `pTe`, the password prompt; 105 is `mTe`,
   * the list. This room rendered 104 and had **no `{:else}` at all**, so a presenter who cleared the
   * password got an empty panel. The gate itself had been repaired the same day; it opened onto
   * nothing, and the only remaining trace was an orphan CSS class — `smallAvatarImg`, the avatar on
   * a row of this list, styled in `app.css` and worn by nothing.
   *
   * ## The row, transcribed (`fTe` @ bundle byte 2,064,959)
   *
   * ```
   * <img class="smallAvatarImg" [src]="e.pic || gravatar(e.emailHash, s=80)" [alt]="user.nick">
   * " [" (e.date | date:'short') "] " e.name ": " e.note " "
   * <button (click)="deleteNode(note, $index)"><i class="fas fa-minus-circle"></i></button>
   * ```
   *
   * **`alt` is upstream's one mistake here and it is not reproduced.** It labels every avatar in the
   * list with the SUBJECT's nick while the image is the AUTHOR's, so a screen reader announces the
   * wrong person once per row. The room labels each avatar with the person it is a picture of. That
   * is a deliberate divergence from the capture, recorded rather than silently corrected.
   */
  interface Props {
    /** Upstream's `allowToManageNotes` — what the room may DRAW. The server decides what it may write. */
    canManage: boolean;
    notes: readonly UserNoteView[];
    loading: boolean;
    error: string | null;
    onEnterPassword: () => void;
    onAdd: () => void;
    onRemove: (note: UserNoteView) => void;
  }

  const { canManage, notes, loading, error, onEnterPassword, onAdd, onRemove }: Props = $props();
</script>

{#if !canManage}
  <!--
    Upstream's own gate: `pTe` is the FALSE branch of `allowToManageNotes`. Until 2026-08-29 this
    panel rendered always and its button alerted "Wrong password!" whatever was typed; the
    comparison is real now — and made on the controller, because the password is one of the seven
    credential-shaped settings that never reach this room.
  -->
  <div>
    <p>To be able to manage user's notes, please enter the password.</p>
    <button class="btn btn-outline-light" onclick={onEnterPassword}> Enter Password </button>
  </div>
{:else if error}
  <!--
    A failure is SHOWN, not swallowed. An empty list and a list that could not be loaded look
    identical on screen, and one of them means "this member has no notes" — which a presenter would
    act on.
  -->
  <div class="text-warning py-2">{error}</div>
{:else}
  <!--
    `d(0,"div",38)(1,"div",93)` — const 38 is `[1,"row"]` and const 93 is
    `[1,"col",2,"max-height","300px","overflow-y","scroll"]`. The ROW was absent here until
    2026-09-01, and a bare `.col` is not a cosmetic difference: Bootstrap's column carries half a
    gutter of horizontal padding that `.row`'s negative margin is what cancels, so the list sat
    inset from the panel while the Add Note row below it — which HAS its `.row` — did not.
  -->
  <div class="row">
    <div class="col" style="max-height: 300px; overflow-y: scroll;">
      {#if loading}
        <div class="py-2">Loading notes…</div>
      {:else if notes.length === 0}
        <!--
          Ours. Upstream renders an empty `@for` and nothing else, which reads as a broken panel; a
          presenter cannot tell "no notes yet" from "this did not load". Divergence, deliberate.
        -->
        <div class="py-2">No notes about this member yet.</div>
      {/if}
      {#each notes as note (note.id)}
        <div class="d-flex d-flex justify-content-between d-flex align-items-stretch">
          <span class="flex-grow-1 flex-fill">
            <!--
              `width`/`height` are ours and are required here: `.smallAvatarImg` caps the rendered
              width at 20px, and an `<img>` with no intrinsic size reserves none until the bytes
              arrive, so every note in the list shifts as the avatars load.
            -->
            <img
              class="smallAvatarImg"
              src={note.authorAvatarUrl}
              alt={note.authorName}
              width="20"
              height="20"
            />
            [{shortWhen.format(new Date(note.createdAt))}] {note.authorName}: {note.note}
          </span>
          <button
            class="btn btn-sm btn-outline-light float-right"
            aria-label="Delete this note"
            onclick={() => onRemove(note)}
          >
            <i class="fas fa-minus-circle"></i>
          </button>
        </div>
      {/each}
    </div>
  </div>
  <hr />
  <div class="row">
    <div class="col">
      <button class="btn btn-sm btn-outline-light float-right" onclick={onAdd}>
        <!-- Const 96 is `[1,"icon","fa","fa-plus-circle"]`; `icon` was dropped until 2026-09-01. -->
        <i class="icon fa fa-plus-circle"></i> Add Note
      </button>
    </div>
  </div>
{/if}
