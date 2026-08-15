<script lang="ts">
  /**
   * `app-session-login` — the room's login page.
   *
   * Every class, id, placeholder and string below is transcribed from the component's own const
   * table (`app-session-login.full.js`, 120 entries) and its text literals. The consts are named
   * beside the markup they produce so the next person can check rather than trust.
   *
   * ## The validation here is the reference's CLIENT-side pass
   *
   * `doLoginCheck()` in that component, in its own order and with its own words:
   *
   * ```js
   * e.email && e.nick
   *   ? !e.hasRequiredPhoneInLogin ||
   *     (e.phoneNumber && /^[+]*[(]{0,1}[0-9]{1,3}[)]{0,1}[-\s\./0-9]*$/g.test(e.phoneNumber))
   *     ? e.pw || 'pw' != e.authMode || e.appService.globals.passedToken
   *       ? e.customEnterDisclosure && !e.disclosureDone ? bootbox.dialog({…}) : e.loginToRoom()
   *       : bootbox.alert('Please enter your password')
   *     : bootbox.alert('Please enter a valid phone number...')
   *   : bootbox.alert('Please fill in your name and email...');
   * ```
   *
   * It is a courtesy, not a control: the authoritative decision runs on the server, and in this
   * reconstruction it runs in the CONTROLLER, because `webinarPW` and `banIPList` may not cross to
   * this application. The reference splits the password the same way — `webinarPW` appears nowhere
   * in its bundle.
   */
  import { enhance } from '$app/forms';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  /*
    Seeded from the load, overridden by typing.

    `$state(data.name)` would capture only the initial value, which Svelte warns about and which
    would be wrong on a re-navigation: arriving at a different room with a different token would
    leave the previous name in the box. The override is null until somebody types.
  */
  let nameOverride = $state<string | null>(null);
  const name = $derived(nameOverride ?? data.name);
  let phone = $state('');
  let password = $state('');
  let agreed = $state(false);
  let submitting = $state(false);
  /** The reference's `bootbox.alert` text, shown inline rather than in a modal. */
  let clientError = $state('');
  /** `customEnterDisclosure && !disclosureDone` — the dialog stands between you and entry. */
  let showDisclosure = $state(false);

  /** `/^[+]*[(]{0,1}[0-9]{1,3}[)]{0,1}[-\s\./0-9]*$/g`, character for character. */
  /* Verbatim from the bundle (byte 1194841). The `\.` inside the class is redundant and kept. */
  // eslint-disable-next-line no-useless-escape
  const PHONE = /^[+]*[(]{0,1}[0-9]{1,3}[)]{0,1}[-\s\./0-9]*$/;

  /**
   * `doLoginCheck()`'s conditions, in its order, returning the message it would have alerted.
   *
   * The password branch is `e.pw || 'pw' != e.authMode || passedToken`. Every arrival here carries
   * a token, so that term is satisfied and a password is never demanded — which is why the field is
   * offered when the room shows one but not required by this pass.
   */
  function clientRefusal(): string {
    if (!data.email || !name.trim()) return 'Please fill in your name and email...';
    if (data.hasRequiredPhoneInLogin && !(phone.trim() && PHONE.test(phone.trim()))) {
      return 'Please enter a valid phone number...';
    }
    return '';
  }
</script>

<svelte:head>
  <title>{data.roomTitle ? `${data.roomTitle} — sign in` : 'Sign in'}</title>
</svelte:head>

<!-- const 4 `login-wrapper`, 5 `container-fluid`, 7 `row login-row`. -->
<div class="login-wrapper">
  <div class="container-fluid">
    <div class="row login-row">
      <!-- const 33: the room's own side, hidden under 767px by the component's media query. -->
      <div class="col-md-6 col-sm-6 d-xs-none animated fadeInLeft faster room-message">
        {#if data.roomTitle}
          <!-- const 34 `room-title` — an h1 in the component's CSS (`h1.room-title`). -->
          <h1 class="room-title">{data.roomTitle}</h1>
        {/if}
      </div>

      <!-- const 36. -->
      <div class="col-md-6 col-sm-12 col-xs-12 login-form-container animated fadeInRight faster">
        <!-- const 64 `mb-3 login-form` with a submit binding. -->
        <form
          method="POST"
          class="mb-3 login-form"
          use:enhance={() => {
            submitting = true;
            return async ({ update }) => {
              await update({ reset: false });
              submitting = false;
            };
          }}
          onsubmit={(event) => {
            const refusal = clientRefusal();
            if (refusal) {
              event.preventDefault();
              clientError = refusal;
              return;
            }
            /*
              `customEnterDisclosure && !disclosureDone` — the reference opens its dialog INSTEAD of
              logging in, and only `loginToRoom()` on agreement. Same here: the first submit opens
              it, the agreement ticks the box, the second submit goes through.
            */
            if (data.customEnterDisclosure && !agreed) {
              event.preventDefault();
              clientError = '';
              showDisclosure = true;
            }
          }}
        >
          <!-- Carried through the POST because the action re-verifies it; it is the credential. -->
          <input type="hidden" name="jwtSite" value={data.token} />
          <input type="hidden" name="id" value={data.shortCode} />
          <input type="hidden" name="disclosure" value={agreed ? 'on' : ''} />

          <!-- const 65 `loginGravatar` > 66 `text-center user-avatar` > 67 the gravatar img. -->
          <div class="loginGravatar">
            <div class="text-center user-avatar">
              <img src={data.avatarUrl} alt="" width="80" height="80" />
            </div>
            <!-- const 70 `user-nick`. -->
            <div class="user-nick text-center">{data.email}</div>
          </div>

          <!-- const 72 `for=login-nickname-new`, 73 the input, 74 `addon-admin`, 76 `nickHelpBlock`. -->
          <label for="login-nickname-new">Name</label>
          <div class="input-group mb-3">
            <input
              type="text"
              id="login-nickname-new"
              name="name"
              placeholder="Name or Nickname"
              aria-label="Name"
              aria-describedby="nickHelpBlock"
              class="form-control"
              bind:value={() => name, (value) => (nameOverride = value)}
              disabled={data.disableEditingUsername || data.disableLoginForm}
            />
            <span id="addon-admin" class="input-group-text pl-2 pr-2"
              ><i class="fas fa-user"></i></span
            >
          </div>
          {#if data.usernameInstructions}
            <small id="nickHelpBlock" class="form-text">{data.usernameInstructions}</small>
          {/if}

          <!-- const 92/93 the email, 48/49 its addon. Read-only when the token supplied it. -->
          <label for="login-email">Email</label>
          <div class="input-group mb-3">
            <input
              type="email"
              id="login-email"
              name="email"
              placeholder="Email"
              aria-label="email"
              aria-describedby="addon-email"
              class="form-control"
              value={data.email}
              readonly={data.readOnlyEmail}
            />
            <span id="addon-email" class="input-group-text pl-2 pr-2"
              ><i class="fas fa-envelope"></i></span
            >
          </div>

          <!-- const 94/95/97/98 — only when `sessData.hasRequiredPhoneInLogin`. -->
          {#if data.hasRequiredPhoneInLogin}
            <label for="login-user-phone-number">Phone Number</label>
            <div class="input-group mb-3">
              <input
                type="tel"
                id="login-user-phone-number"
                name="phone"
                placeholder="123456789"
                aria-label="Phone Number"
                aria-describedby="addon-phone-number"
                class="form-control"
                bind:value={phone}
              />
              <span id="addon-phone-number" class="input-group-text pl-2 pr-2"
                ><i class="fas fa-phone"></i></span
              >
            </div>
          {/if}

          <!--
            const 99/101/102 — shown on `showPresenter = sessData.showPasswordField`. Never
            REQUIRED on this path: `e.pw || 'pw' != authMode || passedToken`, and a token is always
            present here. The value is posted and the CONTROLLER compares it, because `webinarPW`
            may not cross to this application and does not cross in the reference either.
          -->
          {#if data.showPasswordField}
            <label for="login-password">Password</label>
            <div class="input-group mb-3">
              <input
                type="password"
                id="login-password"
                name="password"
                placeholder="password"
                aria-label="password"
                aria-describedby="addon-password"
                class="form-control"
                bind:value={password}
              />
              <span id="addon-password" class="input-group-text pl-2 pr-2"
                ><i class="fas fa-lock"></i></span
              >
            </div>
          {/if}

          {#if clientError || form?.message}
            <!-- const 77 `error text-danger small`. -->
            <p class="error text-danger small">{clientError || form?.message}</p>
          {/if}

          <!-- const 80, and 82 the submit: `btn-login btn btn-primary buttonload text-center`. -->
          <div class="d-flex p-2 justify-content-between mt-3 align-items-center">
            <span></span>
            <button
              type="submit"
              class="btn-login btn btn-primary buttonload text-center pl-2 pr-2"
              disabled={submitting}
            >
              {#if submitting}
                <!-- const 110 — the reference's own spinner beside the label. -->
                Login <i class="ml-2 fas fa-spinner fa-spin"></i>
              {:else}
                Login
              {/if}
            </button>
          </div>
        </form>

        <!-- const 38 `login-footer` > 39 `text-center` > 40 the link. -->
        <div class="login-footer">
          <div class="text-center">
            Powered by: <a href="https://protradingroom.com" target="_blank" rel="noreferrer"
              >ProTradingRoom.com</a
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

{#if showDisclosure}
  <!--
    `bootbox.dialog({title: 'Room Disclosure &amp; Compliance', message: customEnterDisclosure,
    className: 'custom-disclosure-modal', buttons: {cancel: {label:'Disagree', className:'btn-danger'},
    ok: {label:'I Agree', className:'btn-info'}}})` — the labels and button classes are its own.
  -->
  <div class="modal fade show custom-disclosure-modal" style="display: block;" role="dialog">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Room Disclosure &amp; Compliance</h5>
        </div>
        <!--
          The disclosure is the ROOM OWNER's text and the reference renders it as the dialog's
          message. It is rendered as TEXT here: `bootbox` accepts markup, and this room has no
          sanitiser on this path, so displaying it verbatim is the honest choice rather than
          inventing an allow-list for a field nobody has audited.
        -->
        <div class="modal-body">{data.customEnterDisclosure}</div>
        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-danger"
            onclick={() => {
              agreed = false;
              showDisclosure = false;
            }}>Disagree</button
          >
          <button
            type="button"
            class="btn btn-info"
            onclick={() => {
              agreed = true;
              showDisclosure = false;
              // `callback: async () => { disclosureDone = !0; await loginToRoom() }`
              (
                document.querySelector('form.login-form') as HTMLFormElement | null
              )?.requestSubmit();
            }}>I Agree</button
          >
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /*
    `app-session-login.component.css`, transcribed. Only the rules this page's markup actually uses
    are carried: the navbar, room-description, avatar-options and forgot/change-password rules in
    that file belong to parts of the component this page does not render, and copying them would be
    styling for markup that is not here.
  */
  .login-wrapper {
    font-size: 16px;
    color: var(--dark-black);
    background-color: var(--lighter-gray);
    height: 100vh;
    padding-bottom: 20px;
    overflow-y: auto;
  }

  .login-wrapper :global(.login-form-container) {
    padding-top: 15px;
  }

  .login-wrapper form {
    max-width: 360px;
    margin: auto;
  }

  .login-wrapper input {
    color: #28a1b5;
    font-size: 16px;
  }

  .login-wrapper a {
    color: #375a7f;
  }

  .login-wrapper .room-message {
    padding-top: 30px;
  }

  .login-wrapper h1.room-title {
    font-size: 24px;
    padding: 0 0 15px;
    border-bottom: 1px solid var(--light-gray);
    text-align: center;
    max-width: 360px;
    margin: auto;
  }

  .login-wrapper div.login-footer {
    font-size: 12px;
  }

  .login-wrapper :global(.form-control) {
    border: 1px solid var(--lighter-gray);
    border-right: none;
  }

  .login-wrapper :global(.form-control:focus) {
    border: 1px solid var(--lighter-gray);
    border-right: none;
    box-shadow: 1px 1px 3px var(--lighter-gray);
  }

  .login-form {
    background-color: var(--white);
    padding: 15px 25px;
    box-shadow: 2px 2px 5px var(--light-gray);
    border-radius: 7px;
  }

  .login-form :global(label) {
    font-size: 14px;
    margin-bottom: 2px;
  }

  .user-avatar {
    position: relative;
  }

  .user-nick {
    font-style: italic;
    font-size: 15px;
    margin-left: 0;
  }

  .btn-login {
    min-width: 130px;
    border-radius: 50px;
    border: none;
    font-weight: 700;
    font-size: 14px;
    line-height: 14px;
    height: 30px;
  }

  .loginGravatar {
    min-height: 106px;
  }

  .loginGravatar img {
    width: 80px;
    height: 80px;
    object-fit: cover;
    border-radius: 50%;
    border: 1px solid var(--lighter-gray);
  }

  .login-row {
    padding-top: 20px;
  }

  /* The component hides its left column under 767px rather than reflowing it. */
  @media only screen and (max-width: 767px) {
    .login-row div.fadeInLeft {
      display: none;
    }
  }
</style>
