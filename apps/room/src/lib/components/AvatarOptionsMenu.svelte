<script lang="ts">
  /**
   * `edit-user-avatar-options` — the dropdown on your OWN avatar in `#user-modal`.
   *
   * ## Transcribed from `K2e`, with the consts parsed rather than counted
   *
   * Template `K2e` @ bundle byte 2,058,852, whole. Every const comes from the
   * `app-user-info-modal` table at 2,087,748, parsed with a string-aware walker — an index is per
   * component, and counting brackets across a minified bundle is how the wrong table's meaning gets
   * attached to a number:
   *
   * ```
   * 6  [1,"dropdown","edit-user-avatar-options"]
   * 16 ["type","button","data-bs-toggle","dropdown","aria-expanded","false",1,"dropdown-toggle"]
   * 17 [1,"fas","fa-cog"]
   * 18 [1,"dropdown-menu"]
   * 19 ["href","https://en.gravatar.com/","target","_blank","rel","noopener noreferrer",1,"dropdown-item","text-dark"]
   * 20 [1,"fas","fa-user"]
   * 21 ["href","","rel","noopener noreferrer",1,"dropdown-item","text-dark",3,"click"]
   * 22 [1,"fas","fa-file-upload"]
   * 23 ["type","button",1,"btn","btn-danger","btn-sm","rounded-pill","remove-profile-picture-btn",3,"click"]
   * 24 [1,"fas","fa-times"]
   * ```
   *
   * ## It corrected a control that had already shipped
   *
   * `remove-profile-picture-btn` went in on 2026-08-29 as a floating button on the avatar,
   * presenter-gated, under a note admitting the gap: *"what its click CALLS was not read — the const
   * table gives the shape and the binding position, and the handler lives in a render function this
   * pass did not locate."*
   *
   * It has been located. **Const 23 is that button and it belongs INSIDE this menu** (`q2e`), its
   * click is `clearProfilePic()`, and the menu's gate is
   * `O(6, o.user.userXrefID === o.appService.globals.user.userXrefID ? 6 : -1)` — read it for what is
   * NOT in it. No role term. Two of `#user-modal`'s four missing affordances turned out to be one
   * control, and both guesses about the one already built were wrong.
   *
   * ## Two states, not four items
   *
   * `O(4, e.appService.globals.preferences.profilePic ? 5 : 4)`. With no picture the menu offers
   * Gravatar and upload; with one it offers only Remove. A reader who saw the four captured strings
   * listed together would build all four at once, and that is the wrong control.
   *
   * `rel="noopener noreferrer"` is the capture's own on both anchors, which is worth saying because
   * it is normally this repository adding it.
   */
  type Props = {
    /**
     * Whether this member has a picture of their own, as opposed to the gravatar fallback.
     *
     * The reference asks `preferences.profilePic`, whose emptiness means "never set". This room has
     * no such field — `removeProfilePicture` writes a gravatar URL into `users.avatar_url` — so the
     * caller answers the same question from the value this room actually stores.
     */
    hasPicture: boolean;
    onremove: () => void;
    /** Opens the file picker. The input itself belongs to the modal, which owns the upload. */
    onupload: () => void;
  };

  let { hasPicture, onremove, onupload }: Props = $props();

  /**
   * `.show`, driven here rather than by Bootstrap.
   *
   * `data-bs-toggle="dropdown"` is inert markup this room keeps for fidelity — Bootstrap's JS is not
   * a dependency — so a `.dropdown-menu` that nothing toggles is a menu that can never open.
   * `bootstrap-dropdown-contract.test.ts` refuses one.
   */
  let open = $state(false);

  /** Every item closes the menu. A menu left open over the modal is the shape a reader reports. */
  function choose(action: () => void) {
    open = false;
    action();
  }
</script>

<div class="dropdown edit-user-avatar-options">
  <button
    type="button"
    data-bs-toggle="dropdown"
    aria-expanded={open}
    aria-label="Profile picture options"
    class={['dropdown-toggle', { show: open }]}
    onclick={() => (open = !open)}
  >
    <i class="fas fa-cog"></i>
  </button>
  <ul class={['dropdown-menu', { show: open }]}>
    {#if hasPicture}
      <li>
        <button
          type="button"
          class="btn btn-danger btn-sm rounded-pill remove-profile-picture-btn"
          onclick={() => choose(onremove)}
        >
          <i class="fas fa-times"></i> Remove profile picture
        </button>
      </li>
    {:else}
      <li>
        <a
          href="https://en.gravatar.com/"
          target="_blank"
          rel="noopener noreferrer"
          class="dropdown-item text-dark"
        >
          <i class="fas fa-user"></i> Setup Gravatar
        </a>
      </li>
      <li>
        <!--
          `href=""` is the capture's, and it is reproduced with a `preventDefault` rather than
          swapped for a `<button>`: the const is an anchor and `dropdown-item text-dark` is an
          anchor's styling. Without the guard this navigates to the current URL and reloads the room.
        -->
        <!-- svelte-ignore a11y_invalid_attribute -->
        <a
          href=""
          rel="noopener noreferrer"
          class="dropdown-item text-dark"
          onclick={(event) => {
            event.preventDefault();
            choose(onupload);
          }}
        >
          <i class="fas fa-file-upload"></i> Or upload a picture
        </a>
      </li>
    {/if}
  </ul>
</div>
