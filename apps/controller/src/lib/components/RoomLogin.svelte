<script lang="ts">
  import { enhance } from '$app/forms';
  import { asset } from '$app/paths';
  import PasswordReveal from '#lib/components/PasswordReveal.svelte';

  /**
   * The room entry screen, reproduced from `app-session-login`.
   *
   * Structure, copy and geometry come from room-login-1785587188183.json; the
   * conditional branches come from the 31 `<!---->` anchors in that capture,
   * which mark @if blocks the reference room's own configuration hid. Each one
   * here is driven by the controller setting that governs it, so the screen a
   * guest sees changes with the room's settings exactly as the reference's does.
   */
  interface Props {
    roomName: string;
    roomCode: string;
    /** Effective room settings, already through resolveRoomConfig(). */
    settings: Record<string, unknown>;
    /** Remembered identity, if this browser has joined before. */
    known?: { name: string; email: string; gravatar: string } | null;
    error?: string | null;
    version?: string;
  }

  let { roomName, roomCode, settings, known = null, error = null, version = 'dev' }: Props =
    $props();

  // Exact 80x80 JPEG returned by the captured `?d=mm` Gravatar URL. Keep it as
  // a deterministic local fallback without suppressing a real Gravatar.
  const EMPTY_AVATAR = asset('default-avatar.jpg');

  const on = (k: string) => settings[k] === true;
  const str = (k: string) => (typeof settings[k] === 'string' ? (settings[k] as string) : '');

  // Anchors 1–4: the avatar block, gated by hideAvatars
  const showAvatar = $derived(!on('hideAvatars'));
  // The reference's h1 is gated by hideWelcomeTo
  const showWelcome = $derived(!on('hideWelcomeTo'));
  // The footer "Powered by" line, gated by hidePoweredBy
  const showPoweredBy = $derived(!on('hidePoweredBy'));
  // Anchors 6–8: three fields the captured room never rendered
  const showPhone = $derived(on('hasRequiredPhoneInLogin'));
  // showPasswordField pre-opens the password field; the link that reveals it is
  // always present (see the markup note below).
  const passwordPreOpen = $derived(on('showPasswordField'));
  // Anchor 5: the nickHelpBlock the reference's aria-describedby points at but
  // never renders, because usernameInstructions is unset
  const usernameHelp = $derived(str('usernameInstructions'));
  const nameLocked = $derived(on('claimNickName') && !on('allowUsersToChangeUsername'));
  /**
   * `customEnterDisclosure` — "If set, Users will need to agree to thisDisclosure to enter."
   *
   * The server refuses without agreement (`decideRoomEntry`), so this control is the only way in
   * when a room sets one. Its text is the owner's, rendered as text: it arrives from a settings
   * blob and must never become markup.
   */
  const disclosure = $derived(str('customEnterDisclosure'));

  // Writable $derived: seeded from the remembered identity, and the user's typing
  // overwrites it until `known` changes. No $effect assigning to state.
  let name = $derived(known?.name ?? '');
  let email = $derived(known?.email ?? '');
  let passwordShown = $state(false);
  const passwordOpen = $derived(passwordShown || passwordPreOpen);
  let submitting = $state(false);
  let avatarOptionsOpen = $state(false);
  let uploadedAvatar = $state<string | null>(null);
  let avatarUploadPreview = $state('');
  let avatarUploadName = $state('');
  let modal = $state<null | 'gmail' | 'facebook' | 'upload'>(null);

  const MODALS = [
    {
      key: 'gmail' as const,
      id: 'avatar-from-gmail-modal',
      title: 'Avatar from gmail address',
      field: 'gmail-avatar',
      label: 'Enter your Gmail address',
      placeholder: 'user@example.com'
    },
    {
      key: 'facebook' as const,
      id: 'avatar-from-facebook-modal',
      title: 'Facebook profile image as avatar',
      field: 'facebook-avatar',
      label: 'Enter your facebook username',
      placeholder: 'johndoe'
    }
  ];

  function clearForm() {
    name = '';
    avatarOptionsOpen = false;
    modal = null;
    passwordShown = false;
    document.cookie = 'room_identity=; Max-Age=0; path=/';
    location.reload();
  }

  function openAvatarUpload(event: MouseEvent) {
    event.preventDefault();
    avatarUploadPreview = '';
    avatarUploadName = '';
    modal = 'upload';
  }

  function previewAvatar(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;

    avatarUploadName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') avatarUploadPreview = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function useAvatarUpload() {
    if (avatarUploadPreview) uploadedAvatar = avatarUploadPreview;
    avatarOptionsOpen = false;
    modal = null;
  }

  function useEmptyAvatar(event: Event) {
    const image = event.currentTarget as HTMLImageElement;
    if (image.getAttribute('src') !== EMPTY_AVATAR) image.src = EMPTY_AVATAR;
  }
</script>

<div class="auth-wrapper">
  <div class="auth-column animated fadeInRight faster">
    {#if showWelcome}
      <h1 class="auth-title">Welcome to the {roomName}</h1>
    {/if}
    <p class="auth-sub">Please complete this form:</p>

    <form
      class="auth-card"
      method="POST"
      use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
          await update({ reset: false });
          submitting = false;
        };
      }}
    >
      <input type="hidden" name="code" value={roomCode} />

      {#if showAvatar}
        <!-- .loginGravatar wraps .user-avatar and carries min-height:106, which is
             what puts the first form-group at y=254.797 rather than 251.297. -->
        <div class="auth-gravatar">
          <div class="auth-avatar">
            <img
              src={uploadedAvatar ?? known?.gravatar ?? EMPTY_AVATAR}
              alt=""
              width="80"
              height="80"
              onerror={useEmptyAvatar}
            />
            <button
              class="auth-avatar-gear"
              type="button"
              title="Setup Avatar"
              aria-label="Setup Avatar"
              aria-controls="avatar-options"
              aria-expanded={avatarOptionsOpen}
              onclick={() => (avatarOptionsOpen = !avatarOptionsOpen)}
            >
              <i class="fas fa-cog"></i>
            </button>
            {#if known?.name}
              <div class="auth-nick">@{known.name}</div>
            {/if}
          </div>

          {#if avatarOptionsOpen}
            <!-- Captured app-session-login DOM and compiled component both prove
                 that the gear toggles this inline block. -->
            <div class="avatar-options" id="avatar-options">
              <a href="https://en.gravatar.com/" target="_blank" rel="noopener noreferrer"
                ><i class="fas fa-user"></i> Setup Gravatar <br /></a
              >
              <a href="#profile-image-upload" rel="noopener noreferrer" onclick={openAvatarUpload}
                ><i class="fas fa-file-upload"></i> Or upload a picture</a
              ><br />
            </div>
          {/if}
        </div>
      {/if}

      <div class="auth-group">
        <label for="login-nickname-new">Name</label>
        <div class="auth-input-group">
          <input
            id="login-nickname-new"
            name="name"
            type="text"
            placeholder="Name or Nickname"
            aria-label="Name"
            aria-describedby={usernameHelp ? 'nickHelpBlock' : undefined}
            bind:value={name}
            readonly={nameLocked}
          />
          <span class="auth-addon" aria-hidden="true"><i class="fas fa-user"></i></span>
        </div>
        <!-- The reference points aria-describedby at #nickHelpBlock and then never
             renders it. Here the id and the element appear together, or neither. -->
        {#if usernameHelp}
          <div class="auth-help" id="nickHelpBlock">{usernameHelp}</div>
        {/if}
      </div>

      <div class="auth-group">
        <label for="login-email">Email</label>
        <div class="auth-input-group">
          <!-- Disabled when the identity arrived with the launch token: under
               authMode "Open", email is carried in, not typed. -->
          <input
            id="login-email"
            name="email"
            type="email"
            placeholder="Email"
            aria-label="email"
            bind:value={email}
            disabled={!!known}
            required={!known}
          />
          <span class="auth-addon" aria-hidden="true"><i class="fas fa-envelope"></i></span>
        </div>
      </div>

      {#if showPhone}
        <div class="auth-group">
          <label for="login-phone">Phone</label>
          <div class="auth-input-group">
            <input id="login-phone" name="phone" type="tel" placeholder="Phone" required />
            <span class="auth-addon" aria-hidden="true"><i class="fas fa-phone"></i></span>
          </div>
        </div>
      {/if}

      {#if passwordOpen}
        <div class="auth-group">
          <label for="login-password">Room password</label>
          <div class="auth-input-group">
            <PasswordReveal
              id="login-password"
              name="password"
              placeholder="Password"
              inputClass=""
              toggleClass="auth-addon"
              autocomplete="current-password"
            />
          </div>
        </div>
      {/if}

      <div class="auth-error">{error ?? ''}</div>

      <div class="auth-actions">
        <div class="auth-check">
          <input type="checkbox" id="remember-me" name="remember" checked />
          <label for="remember-me">Keep me logged in</label>
        </div>
        <div>
          <button class="auth-submit" type="submit" disabled={submitting}>
            <span>{submitting ? '…' : 'Login'}</span>
          </button>
        </div>
      </div>

      <!-- Both links are unconditional in the reference: it renders them for room
           3625, whose showPasswordField is unset. An earlier version gated them on
           settings; the captured markup disproves that. -->
      <!-- Anchors, not buttons: Chrome keeps a <button> an atomic inline-block
           whatever `display` says, so the two-line block measured 41 instead of
           the reference's 48. These carry real hrefs, so unlike the reference's
           href-less <a> they are focusable and keyboard-operable. -->
      <div class="auth-link-right">
        <a
          class="auth-link"
          href="#clear-form"
          onclick={(e) => {
            e.preventDefault();
            clearForm();
          }}>Not you? clear form</a
        >
      </div>

      {#if disclosure}
        <div class="auth-disclosure">
          <label>
            <input type="checkbox" name="disclosure" required />
            <span>{disclosure}</span>
          </label>
        </div>
      {/if}

      {#if !passwordOpen}
        <div class="auth-link-centre">
          <a
            class="auth-link"
            href="#room-password"
            onclick={(e) => {
              e.preventDefault();
              passwordShown = true;
            }}>Have a password?<br />Click here</a
          >
        </div>
      {/if}
    </form>

    <!-- .login-footer spans the full column, not the 360px card stack -->
    <div class="auth-footer">
      {#if showPoweredBy}
        <p>
          Powered by:
          <a href="https://www.tradingroom.app" target="_blank" rel="noopener noreferrer"
            >TradingRoomApp</a
          >
        </p>
      {/if}
      <p>Version: {version}</p>
    </div>
  </div>
</div>

<!-- Both dialogs stay in the DOM at all times and are shown by class, exactly as
     the reference does (`class="modal fade"` → `modal fade show`). Rendering them
     conditionally kept their markup out of the document, which the structural diff
     against the reference caught. -->
{#each MODALS as m (m.id)}
  <div
    id={m.id}
    class={['auth-modal', { 'auth-modal-show': modal === m.key }]}
    tabindex="-1"
    role="dialog"
    aria-labelledby={m.id}
    aria-hidden={modal === m.key ? undefined : 'true'}
  >
    <div class="auth-modal-dialog" role="document">
      <div class="auth-modal-content">
        <div class="auth-modal-header">
          <h5>{m.title}</h5>
          <button
            class="auth-modal-close"
            type="button"
            aria-label="Close"
            onclick={() => (modal = null)}
          ></button>
        </div>
        <div class="auth-modal-body">
          <div>
            <label for={m.field}>{m.label}</label>
            <input id={m.field} name={m.field} type="text" placeholder={m.placeholder} />
          </div>
        </div>
        <div class="auth-modal-footer">
          <button
            class="auth-modal-btn auth-modal-btn-close"
            type="button"
            aria-label="Close"
            onclick={() => (modal = null)}
          >
            Close
          </button>
          <button class="auth-modal-btn auth-modal-btn-save" type="button" onclick={() => (modal = null)}>
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
{/each}

{#if modal === 'upload'}
  <!-- setupProfilePic() in the captured compiled component proves this title,
       upload-area copy, file accept filter and Close/Upload actions. -->
  <div
    id="profile-image-upload-modal"
    class="auth-modal auth-modal-show"
    tabindex="-1"
    role="dialog"
    aria-labelledby="profile-image-upload-title"
  >
    <div class="auth-modal-dialog" role="document">
      <div class="auth-modal-content">
        <div class="auth-modal-header">
          <h5 id="profile-image-upload-title">Profile Image Upload</h5>
          <button
            class="auth-modal-close"
            type="button"
            aria-label="Close"
            onclick={() => (modal = null)}
          ></button>
        </div>
        <div class="auth-modal-body">
          <label class="auth-upload-area" for="fuploadPTR">
            <input
              id="fuploadPTR"
              accept="image/*"
              name="fuploadPTR"
              type="file"
              onchange={previewAvatar}
            />
            <i class="fas fa-file-upload fa-3x"></i><br />
            Click to select images to upload
          </label>
          <br />
          <span class="auth-upload-name" id="fileList">{avatarUploadName}</span>
          {#if avatarUploadPreview}
            <img
              class="auth-upload-preview"
              src={avatarUploadPreview}
              id="previewImg"
              alt="Selected avatar preview"
            />
          {/if}
          <div class="auth-upload-clear"></div>
        </div>
        <div class="auth-modal-footer">
          <button
            class="auth-modal-btn auth-modal-btn-close"
            type="button"
            onclick={() => (modal = null)}>Close</button
          >
          <button
            class="auth-modal-btn auth-modal-btn-save"
            type="button"
            onclick={useAvatarUpload}>Upload</button
          >
        </div>
      </div>
    </div>
  </div>
{/if}

{#if modal}
  <div class="auth-modal-backdrop"></div>
{/if}
