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

  /**
   * The reference's own label text — `page.manageSession.html:2693-2707`, verbatim.
   *
   * FOUR of these five were wrong, and all four were "tidied" into ordinary English:
   *
   *     Screenshare    was "Screen share"
   *     WebCam         was "Camera"
   *     AdminChat      was "Admin chat"
   *     CanEditNotes   was "Edit notes"
   *
   * `CanEditNotes` is the property name shown to an operator, which reads oddly and is exactly what
   * the reference does. Renaming these is the kind of change that looks like an improvement and
   * makes a support conversation about "the AdminChat box" impossible to follow.
   */
  const LABELS: Record<string, string> = {
    hasMic: 'Microphone',
    hasScreen: 'Screenshare',
    hasCam: 'WebCam',
    hasAdminChat: 'AdminChat',
    canEditNotes: 'CanEditNotes'
  };
</script>

<!-- z-index 1050, above every dropdown at 1000 — measured from the reference. -->
<div class="modal in" role="dialog" aria-modal="true" aria-label="Adjust permissions">
  <div class="modal-dialog">
    <div class="modal-content">
      <!-- `modal-header` holding the dismiss button and the titled h4 — :2688-2691. Ours had a
           bare `<h4>` and no header at all, so the `×` the reference puts top-right was missing. -->
      <div class="modal-header">
        <button type="button" class="close" aria-label="Close" onclick={onclose}
          ><span aria-hidden="true">&times;</span></button
        >
        <h4 class="modal-title" id="permissionsModalLabel">
          Adjust Mic/Cam/Screen permissions for user: <i>{userName}</i>
        </h4>
      </div>

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
          <!-- `class="d-block"` — the reference's own class, and `styles.css` defines
               `.d-block { display: block }`. `manage.css` already carries it; this component was
               using a private `.perm` that duplicated the same rule under a different name. -->
          <label class="d-block">
            <input type="checkbox" name={key} checked={permissions[key] === true} />
            {LABELS[key] ?? key}
          </label>
        {/each}

        <!-- `modal-footer text-right` — :2709. Ours was a private `.actions` reimplementing it. -->
        <div class="modal-footer text-right">
          <button class="btn btn-default" type="button" onclick={onclose}>Close</button>
          <button class="btn btn-success" type="submit" disabled={saving}>Save Changes</button>
        </div>
      </form>
    </div>
  </div>
</div>
<div class="modal-backdrop"></div>

<style>
  /*
    `.d-block`, `.modal-header`, `.modal-title`, `.modal-footer`, `.text-right` and `.close` are all
    the reference's own classes, styled by Bootstrap 3 and `styles.css` — including
    `#permissionsModal .modal-content { padding: 20px }`. Nothing is redefined here; the private
    `.perm` and `.actions` rules that used to duplicate them under different names are gone.
  */
  .modal-title {
    margin: 0;
  }
  .note {
    color: var(--muted);
    font-style: italic;
  }
</style>
