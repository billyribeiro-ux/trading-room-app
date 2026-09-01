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

  import SessionLoadingView from '#lib/components/SessionLoadingView.svelte';
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
    CHECKED by default, and this took three readings to get right — the first two were wrong in
    opposite directions, so the evidence is written out rather than summarised.

    The constructor, read verbatim at byte 1,188,545:

    ```js
    constructor(e,i){this.appService=e,this.formBuilder=i,this.loginReady=!1,this.browserOK=!0,
      this.browserOKDismissed=!1,this.disableLoginForm=!1,this.rememberMe=!0,this.forgetMe=!1,
      this.nick="",this.email="",this.emailHash="",this.pw="",this.token="",this.phoneNumber="",
      this.showPresenter=!1,this.hasRequiredPhoneInLogin=!1,this.authMode="reg",…}
    ```

    `this.rememberMe=!0` — before any branch runs. `ngOnInit`'s later `this.rememberMe=!0` in the
    preference-restore arm is reinforcement, not the origin, and nothing anywhere sets it false. So
    the box is ticked when the page opens and a member has to opt OUT of a thirty-day session.

    That is a deliberate product decision in the reference and it is worth stating plainly, because
    the safe-looking default is the opposite one: shipping `false` here would silently give every
    member a one-day session while showing them an unticked box they never asked for.

    It is posted because it has a real consumer: `createSessionFor(cookies, id, remember)` gives the
    session cookie THIRTY_DAYS instead of ONE_DAY. Before this it was passed `false` unconditionally,
    so the server half existed and the switch that drives it did not.
  */
  let rememberMe = $state(true);
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

  /*
    Take the credential out of the address bar, exactly as the reference does.

    `ngOnInit`, byte ~1,192,100:

    ```js
    let i=!0; i=window.top===window.self,
    i&&(P("removing tok from url"),this.appService.removeUrlParam("tok"))
    ```

    This is not cosmetic. A JWT left in the URL is written to browser history, offered in the
    `Referer` header of every outbound request from this page, and copied verbatim whenever somebody
    pastes "the link they were sent". The token has already been verified server-side and its value
    is on `data.token`, so the address bar is the one place it has no further use.

    `window.top === window.self` is the reference's own guard and is kept: inside an iframe the
    embedder owns the history stack, and rewriting it there is both rude and unreliable.

    `goto(..., { shallow: true, replace: true })` — same entry, no navigation, no `load` re-run.
    A plain `goto` would re-run the load without the token and blank the very prefill this page was
    opened to show, which is why `shallow` is the load-bearing option rather than a style choice.

    It was `replaceState` until the SvelteKit 3 RC (2026-08-13), which deprecates `pushState` and
    `replaceState` in favour of one navigation function with a `shallow` option — migration guide,
    "Shallow Routing". `replace: true` carries the other half of the old name: a Back press must not
    return the reader to a URL that still holds their token.

    ON THE FEEDBACK LOOP — AND THIS PARAGRAPH USED TO BE WRONG, WHICH IS THE WHOLE STORY.

    It said: *"the effect READS `page.url` and the shallow navigation WRITES it, so it re-runs itself
    exactly once. The `has('jwtSite')` guard is what terminates it — the second pass finds no token
    and returns before touching history. The guard is load-bearing, not defensive; delete it and this
    spins."*

    Every sentence of that was true of `replaceState`, which is what this used until the SvelteKit 3
    migration above. **It is not true of `goto(…, { shallow: true })`, which does not update
    `page.url`** — a shallow navigation deliberately leaves the loaded URL alone, because no load ran.
    So the guard re-read the ORIGINAL address every time, found the token still there, and called
    `goto` again. Forever.

    Measured 2026-08-28 by the room's first browser test: a `framenavigated` listener recorded the
    same `/session?id=7301` fourteen times in seven seconds and climbing. A member arriving with a
    valid handoff got a page that navigated in a loop, which is why nothing on it was ever "stable"
    enough for Playwright to click — the symptom that led here.

    THE LATCH IS NOW WHAT TERMINATES IT, and it cannot be defeated by a URL that does not change. A
    plain `let` and not `$state`, deliberately: reading it must NOT create a dependency, or the effect
    would re-run on the very write that is supposed to stop it.

    An effect rather than a `$derived` because there is nothing to derive: the value being produced
    is a history entry, which is precisely the "synchronise with something outside Svelte" case the
    docs keep effects for.
  */
  let handoffStripped = false;
  $effect(() => {
    /*
      Read FIRST, so `page.url` is still a dependency and a genuinely new address — a second handoff
      arriving through a client-side navigation — re-enters rather than being latched out. The latch
      guards the loop, not the feature.
    */
    const stripped = new URL(page.url.href);
    if (handoffStripped) return;
    if (window.top !== window.self) return;
    if (!stripped.searchParams.has('jwtSite')) return;

    handoffStripped = true;
    stripped.searchParams.delete('jwtSite');
    void goto(`${stripped.pathname}${stripped.search}`, {
      shallow: true,
      replace: true,
      state: page.state
    });
  });

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
    for (const identityParam of ['jwtSite', 'name', 'email'])
      next.searchParams.delete(identityParam);
    /*
      `refreshAll`, which is what `invalidateAll` was RENAMED to for `goto` in SvelteKit 3 —
      migration guide, "goto Options". The old name is not kept as an alias, so passing it means the
      option is silently ignored and the cleared identity parameters leave stale `load` data behind
      them. That is the failure mode worth naming: nothing errors, the form just refills.
    */
    await goto(`${next.pathname}${next.search}`, { refreshAll: true });
  }

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

<!--
  `app-session-login`'s root template is a two-way swap on the busy flag (byte 1,209,498): the login
  form, or a centred "Loading..." that IS the page. This room had only the form arm.

  The GATE lives here because that is where the root swap keeps it, and `SessionLoadingView` takes no
  props because `gde` has no variables. The decode — both arms, and why the login button lost a busy
  label it should never have had — is in that component and in `session-login-loading-contract.test.ts`.
-->
{#if submitting}
  <SessionLoadingView />
{:else}
  <!-- const 4 `login-wrapper`, 5 `container-fluid`, 7 `row login-row`. -->
  <div class="login-wrapper">
    <div class="container-fluid">
      <div class="row login-row">
        {#if data.roomDescription}
          <!-- const 33: the room's own side, hidden under 767px by the component's media query. -->
          <div class="col-md-6 col-sm-6 d-xs-none animated fadeInLeft faster room-message">
            {#if data.roomTitle}
              <!--
              const 34 `room-title` — an h1 in the component's CSS (`h1.room-title`).

              The TEXT is not the room name on its own. `vde`, byte 1,182,4xx:
              `Ne(" Welcome to the ",e.appService.globals.sessData.name," ")` — the template
              prepends "Welcome to the ". `eue`, the centred arm's h1, is byte-for-byte the same
              interpolation, so both layouts read alike and the capture's
              "Welcome to the Room 3625" is that string with `sessData.name` = "Room 3625".

              We were rendering the bare name.
            -->
              <h1 class="room-title">Welcome to the {data.roomTitle}</h1>
            {/if}
            <!--
            const `[1,"room-description",2,"height","100%","overflow-x","hidden",3,"innerHtml"]` —
            the two inline styles and the `innerHtml` binding are all the reference's.

            `{@html}` is safe here ONLY because `sanitizeRoomDescription` ran on the SERVER in the
            load. Rendering `data.roomDescription` raw would put owner-authored markup on a route
            that needs no session.
          -->
            <div class="room-description" style="height: 100%; overflow-x: hidden;">
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html data.roomDescription}
            </div>
          </div>
        {/if}

        <!--
        const 36 when there IS a description, and the offset variant when there is not.

        `yue`'s update block is `O(3, e.appService.globals.sessData.description ? 3 : 4)` — slot 3 is
        `Wde`, the two-column layout above; slot 4 is `vue`, one column centred by
        `offset-md-3 offset-sm-3`. A room with nothing to say on the left does not leave half the
        page empty, it centres the form. The `col-sm-6`/`col-sm-12` difference is the reference's
        too: the split view gives the form the full width at `sm`, the centred one keeps it halved.
      -->
        <div
          class={[
            data.roomDescription
              ? 'col-md-6 col-sm-12 col-xs-12'
              : 'col-md-6 offset-md-3 col-sm-6 offset-sm-3 col-xs-12',
            'login-form-container animated fadeInRight faster'
          ]}
        >
          {#if !data.roomDescription && data.roomTitle}
            <!--
            `bue` opens with `H(0,eue,2,1,"h1",34)` — const 34 is `room-title`, the SAME h1 as the
            left column's, rendered here instead. It is not duplicated: the two are the two arms of
            `sessData.description ? 3 : 4`, so exactly one of them exists at a time.

            `eue` and `vde` carry the identical interpolation, checked rather than assumed:
            `Ne(" Welcome to the ",e.appService.globals.sessData.name," ")`.
          -->
            <h1 class="room-title">Welcome to the {data.roomTitle}</h1>
          {/if}

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
              <!--
                ONE LABEL. `mue`'s " Connecting " and const 110's spinner were transcribed here from
                a branch the root swap makes unreachable, and the `disabled` binding sat on the same
                branch; the measurement is in `SessionLoadingView.svelte`. Nothing guards a second
                press because the form is no longer on the page once `submitting` is true.
              -->
              <button
                type="submit"
                class="btn-login btn btn-primary buttonload text-center pl-2 pr-2"
              >
                Login
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
{/if}

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
