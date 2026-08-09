<script lang="ts">
  import { enhance } from '$app/forms';

  interface Props {
    roomUserId: number;
    userName: string;
    /** `user.role !== 1` gates this in the reference: presenters have it hidden. */
    role: number;
    permissions: Record<string, boolean>;
    permissionKeys: readonly string[];
    onclose: () => void;
  }

  let { roomUserId, userName, role, permissions, permissionKeys, onclose }: Props = $props();

  let saving = $state(false);

  const LABELS: Record<string, string> = {
    hasMic: 'Microphone',
    hasScreen: 'Screen share',
    hasCam: 'Camera',
    hasAdminChat: 'Admin chat',
    canEditNotes: 'Edit notes'
  };
</script>

<!-- z-index 1050, above every dropdown at 1000 — measured from the reference. -->
<div class="modal in" role="dialog" aria-modal="true" aria-label="Adjust permissions">
  <div class="modal-dialog">
    <div class="modal-content">
      <h4>Adjust Mic/Cam/Screen permissions for user: <i>{userName}</i></h4>

      {#if role === 1}
        <p class="note">
          This user is a Presenter. The reference hides this control for role 1, so these
          flags do not apply to them.
        </p>
      {/if}

      <form
        method="POST"
        action="?/savePermissions"
        use:enhance={() => {
          saving = true;
          return async ({ update }) => {
            await update({ reset: false });
            saving = false;
            onclose();
          };
        }}
      >
        <input type="hidden" name="roomUserId" value={roomUserId} />
        {#each permissionKeys as key (key)}
          <label class="perm">
            <input type="checkbox" name={key} checked={permissions[key] === true} />
            {LABELS[key] ?? key}
          </label>
        {/each}

        <div class="actions">
          <button class="btn btn-default" type="button" onclick={onclose}>Close</button>
          <button class="btn btn-success" type="submit" disabled={saving}>Save Changes</button>
        </div>
      </form>
    </div>
  </div>
</div>
<div class="modal-backdrop"></div>

<style>
  h4 {
    margin: 0 0 12px;
  }
  .perm {
    display: block;
    padding: 4px 0;
  }
  .actions {
    margin-top: 15px;
    text-align: right;
  }
  .note {
    color: var(--muted);
    font-style: italic;
  }
</style>
