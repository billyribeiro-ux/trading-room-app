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
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
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
  /*
    Unchecked here, and the reason is a branch — NOT "nothing else writes it", which is what an
    earlier version of this comment claimed and the bundle disproves. `ngOnInit` reads:

    ```js
    if("jwt"!=this.authMode&&!this.appService.globals.passedToken||this.pw)
      this.appService.globals.preferences&&(this.rememberMe=!0, …savedNick… …savedEmail… …phoneNumber…);
    else if(("jwt"==this.authMode||this.appService.globals.passedToken)&&!this.pw){ … }
    ```

    `rememberMe=!0` lives in the FIRST arm — no token, no jwt, restoring from saved preferences.
    Every arrival on this page carries a token, so we are always in the SECOND arm, which never
    assigns it. Unchecked is therefore correct for this path, and would be wrong for a
    preference-restore path if one is ever added here.

    It is posted because it has a real consumer: `createSessionFor(cookies, id, remember)` gives the
    session cookie THIRTY_DAYS instead of ONE_DAY. Before this it was passed `false` unconditionally,
    so the server half existed and the switch that drives it did not.
  */
  let rememberMe = $state(false);
  /*
    `gue`'s only effect is `showPresenter = !0`, and slot 32 renders that link only while
    `showPresenter` is false — so the link reveals the password field and then removes itself.

    An override rather than `$state(data.showPasswordField)`, for the same reason `nameOverride` is
    one: seeding state from a prop captures the first value and would carry a revealed field across
    a navigation into a room that does not ask for one.
  */
  let passwordRevealed = $state(false);
  const showPresenter = $derived(passwordRevealed || data.showPasswordField);
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
  /**
   * `doLoginFormClear()`, read verbatim at byte 1,199,998:
   *
   * ```js
   * doLoginFormClear(){"jwt"==this.authMode&&(this.readOnlyEmail=!1),
   *   this.appService.clearSavedToken(this.appService.globals.sessionID),
   *   this.nick="",this.email="",this.pw="",this.phoneNumber="",
   *   this.appService.globals.preferences.savedPW="",
   *   this.appService.globals.preferences.phoneNumber="",
   *   this.appService.globals.preferences.savedNick="",
   *   this.appService.globals.preferences.savedEmail="",
   *   this.appService.savePreferences(),window.location.reload()}
   * ```
   *
   * It clears the IDENTITY and keeps the ROOM — `clearSavedToken` is passed `globals.sessionID`,
   * which survives, and only nick/email/pw/phone are blanked before the reload.
   *
   * Ours differs in one mechanical respect and it is worth saying why rather than hiding it: the
   * reference holds the token in its own service, so a bare `location.reload()` comes back without
   * it. Here the token arrives in the QUERY STRING, so reloading would re-seed the very fields this
   * is meant to clear. Dropping `jwtSite`/`name`/`email` while keeping `id` is the same act
   * expressed against a different transport — identity gone, room kept.
   */
  async function clearForm() {
    nameOverride = '';
    phone = '';
    password = '';
    clientError = '';
    passwordRevealed = false;
    rememberMe = false;

    /* `page.url` is a ReadonlyURL — its `searchParams` has no `delete`. Copy via href to mutate. */
    const next = new URL(page.url.href);
    for (const identityParam of ['jwtSite', 'name', 'email']) next.searchParams.delete(identityParam);
    await goto(`${next.pathname}${next.search}`, { invalidateAll: true });
  }

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
        <!--
          const 63 `text-center authenticate-info`, and `bue` renders it unconditionally between the
          h1 and the form: `d(1,"p",63),v(2,"Please complete this form:")`. The component's own CSS
          gives it `p.authenticate-info { padding: 15px 0 }`.
        -->
        <p class="text-center authenticate-info">Please complete this form:</p>

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
            <!--
              const 70 is `[1,"user-nick"]` — ONE class. The `text-center` that used to be here was
              never in the reference: the component's own CSS is
              `.user-nick { font-style: italic; font-size: 15px; margin-left: 0 }`, with no
              `text-align` at all, so centring it was a guess that happened to look right.

              The content is the NICK, not the email — `O(9, e.nick ? 9 : -1)` renders the row only
              when there is one, and the rendered capture reads `@[OWNER_NAME]`. The `@` is a
              literal in the template, not part of the value.
            -->
            {#if name}
              <div class="user-nick">@{name}</div>
            {/if}
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
          {#if showPresenter}
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
            <!--
              const 81 `form-check`, 107 the checkbox, 108 `for=remember-me form-check-label`, from
              `pue`. This is what used to be an empty `<span>` holding the space open — dead
              scaffolding standing where a real control belongs.

              `.login-form .form-check:hover { cursor: pointer }` and
              `.login-form .form-check-label { font-size: 12px }` are the component's own rules.
            -->
            <div class="form-check">
              <input
                type="checkbox"
                id="remember-me"
                name="remember"
                class="form-check-input"
                bind:checked={rememberMe}
              />
              <label for="remember-me" class="form-check-label">Keep me logged in</label>
            </div>
            <button
              type="submit"
              class="btn-login btn btn-primary buttonload text-center pl-2 pr-2"
              disabled={submitting}
            >
              {#if submitting}
                <!--
                  `mue` is `d(0,"span"),v(1," Connecting "),T(2,"i",110)` — the busy label is
                  " Connecting ", NOT "Login". Slot 27/28 swap the two on
                  `appService.globals.logginIn`, so the word changes as well as the spinner. const
                  110 is `[1,"ml-2","fas","fa-spinner","fa-spin"]`.
                -->
                Connecting <i class="ml-2 fas fa-spinner fa-spin"></i>
              {:else}
                Login
              {/if}
            </button>
          </div>

          <!--
            const 83 `mt-1 text-right` > 84 `session-login-link` with the click ON THE ANCHOR:
            `x("click", … doLoginFormClear())`, text "Not you? clear form".

            A `<button>` rather than the reference's bare `<a>`: an anchor with no href is not
            focusable or keyboard-operable, and this repository's floor is semantic accessible HTML.
            The class list is the reference's, so the CSS
            (`.session-login-link { font-size: 14px }`) still applies.
          -->
          <div class="mt-1 text-right">
            <button type="button" class="session-login-link btn btn-link p-0" onclick={clearForm}>
              Not you? clear form
            </button>
          </div>

          {#if !showPresenter}
            <!--
              `gue`: const 112 `mt-3 t text-center` carries the CLICK, const 113 the anchor. The
              stray single-letter class `t` is the reference's and is kept — it has no rule, which
              is a fact about the reference rather than something to tidy away.

              Guarded on `!showPresenter` because slot 32 renders this only while the password field
              is hidden: `O(32, e.showPresenter ? 33 : 32)`.
            -->
            <div class="mt-3 t text-center">
              <button
                type="button"
                class="session-login-link btn btn-link p-0"
                onclick={() => (passwordRevealed = true)}
              >
                Have a password?<br />Click here
              </button>
            </div>
          {/if}
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
