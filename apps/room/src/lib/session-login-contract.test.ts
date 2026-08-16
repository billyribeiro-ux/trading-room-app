import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  The room's login page — `app-session-login`, and the one rule that matters most about it.

  THE RULE: a verified token may carry authority; a typed email may not.

  The reference has one login form and it lives in the ROOM. `/session?id=<uuid>` renders it and the
  visitor types their name and email — identity is self-declared, which is fine for naming somebody
  in a chat room and useless for authorising them. This room reads MEMBERSHIP by email, so a guest
  typing the owner's address would inherit the owner's role unless something stops it. That is the
  2026-08-07 privilege escalation in a new coat, and `guestHandoffToken` already states the rule for
  the other door: "a guest is not an owner and must not inherit an owner's authority just because
  both arrive on the same URL."

  So `verifyEntry` looks a membership up ONLY for a verified email, and `roomRoleFor(null)` is
  `member`.
*/

const SERVER = readFileSync(new URL('../routes/session/+page.server.ts', import.meta.url), 'utf8');
const PAGE = readFileSync(new URL('../routes/session/+page.svelte', import.meta.url), 'utf8');
const CLIENT = readFileSync(new URL('./server/room-config-client.ts', import.meta.url), 'utf8');

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const serverCode = stripComments(SERVER);
const pageCode = stripComments(PAGE);
const clientCode = stripComments(CLIENT);

describe('a self-declared identity carries no authority', () => {
  it('a membership is looked up ONLY for a verified email', () => {
    /*
      The single most important line in this file. `claims` exists only when a signed handoff
      verified; without one the membership is null and `roomRoleFor` answers `member`.
    */
    expect(serverCode).toContain('membership = claims ? roomConfig.member : null;');
  });

  it('and the role is derived from that membership, never from the form', () => {
    expect(serverCode).toContain('const role = roomRoleFor(membership);');
    // The token TYPE must never decide a role — that was the 2026-08-07 escalation.
    expect(serverCode).not.toContain("claims.type === 'site'");
    expect(serverCode).not.toMatch(/role\s*=\s*[^;]*form\.get/);
  });

  it('a PRESENT token must still be valid — absent and forged are not the same', () => {
    /*
      Treating a broken token as "no token" would turn an expired or forged credential into a guest
      arrival, which is a downgrade to a state that still gets in.
    */
    expect(serverCode).toContain('if (token) {');
    expect(serverCode).toContain('if (!verified.ok) {');
    expect(serverCode).toContain(
      "error(403, 'This sign-in link is not valid. Open the room from your account page again.');"
    );
  });
});

describe('the page is the reference page', () => {
  it('renders on every entry and never auto-submits', () => {
    /*
      `doLoginCheck()` has exactly four callers in the component, all click or submit bindings. The
      equivalent here is that entry happens in a form ACTION — there is no redirect out of `load`.
    */
    expect(serverCode).toContain('export const load: PageServerLoad');
    expect(serverCode).toContain('export const actions: Actions = {');
    const load = serverCode.slice(
      serverCode.indexOf('export const load: PageServerLoad'),
      serverCode.indexOf('export const actions')
    );
    expect(load).not.toContain('redirect(');
  });

  it('carries the captured ids and placeholders', () => {
    // consts 73, 93, 95, 101 — the four inputs, by id and placeholder.
    expect(pageCode).toContain('id="login-nickname-new"');
    expect(pageCode).toContain('placeholder="Name or Nickname"');
    expect(pageCode).toContain('id="login-email"');
    expect(pageCode).toContain('id="login-user-phone-number"');
    expect(pageCode).toContain('placeholder="123456789"');
    expect(pageCode).toContain('id="login-password"');
    // consts 74, 48, 97, 102 — the four input-group addons.
    expect(pageCode).toContain('id="addon-admin"');
    expect(pageCode).toContain('id="addon-email"');
    expect(pageCode).toContain('id="addon-phone-number"');
    expect(pageCode).toContain('id="addon-password"');
  });

  it('and the reference’s own refusal wording', () => {
    expect(pageCode).toContain("'Please fill in your name and email...'");
    expect(pageCode).toContain("'Please enter a valid phone number...'");
  });

  it('the phone pattern is the reference’s, not a tidier one', () => {
    // `/^[+]*[(]{0,1}[0-9]{1,3}[)]{0,1}[-\s\./0-9]*$/g`
    expect(pageCode).toContain('/^[+]*[(]{0,1}[0-9]{1,3}[)]{0,1}[-\\s\\./0-9]*$/');
  });

  it('the email is read-only only when a TOKEN supplied it', () => {
    // `this.email && e && (this.readOnlyEmail = !0)` — a guest types their own.
    expect(serverCode).toContain('readOnlyEmail: Boolean(claims?.email),');
  });
});

describe('the entry decision lives in one place', () => {
  it('the room asks the controller rather than deciding', () => {
    /*
      `webinarPW` appears nowhere in the reference's bundle either: `loginToRoom()` posts the typed
      password and its server decides. Ours cannot decide even if it wanted to — the credential is
      credential-shaped and may never cross.
    */
    expect(serverCode).toContain("decideRoomEntryRemotely(shortCode ?? '', {");
    expect(serverCode).not.toContain('webinarPW');
    expect(serverCode).not.toContain('banIPList');
  });

  it('and FAILS CLOSED when the controller cannot be reached', () => {
    /*
      "Cannot know" is not "yes". Admitting somebody because a network call timed out is the one
      outcome this door must never produce.
    */
    const from = serverCode.indexOf('decideRoomEntryRemotely');
    const region = serverCode.slice(from, serverCode.indexOf('if (!decision.ok)', from));
    expect(region).toContain('return fail(503,');
    expect(clientCode).toContain('export async function decideRoomEntryRemotely(');
  });

  it('a refusal honours the room’s own error page', () => {
    expect(serverCode).toContain('if (decision.redirectTo) redirect(303, decision.redirectTo);');
  });
});

describe('there is ONE form in the product', () => {
  it('the controller hands a guest to the room instead of asking first', () => {
    /*
      The reference has one login form and it is the room's. This application grew its own while the
      room had none; once the room got its page back, a guest met two forms for one entry.
    */
    const guestDoor = readFileSync(
      new URL(
        '../../../controller/src/routes/(public)/session/[code]/+page.server.ts',
        import.meta.url
      ),
      'utf8'
    );
    expect(guestDoor).toContain("const target = new URL('/session', ROOM_BASE_URL);");
    expect(guestDoor).toContain("target.searchParams.set('id', room.shortCode);");
    /*
      NO TOKEN is minted on that redirect, and that is the point: a guest has authenticated with
      nothing at this door, so signing a credential for them would invent an authority rather than
      pass one on.
    */
    const redirectBlock = guestDoor.slice(
      guestDoor.indexOf("const target = new URL('/session', ROOM_BASE_URL);"),
      guestDoor.indexOf('redirect(303, target.toString());')
    );
    expect(redirectBlock).not.toContain('jwtSite');
    expect(redirectBlock).not.toContain('HandoffToken');
  });
});

/*
  The five controls the rendered v4 capture (`new-room/start-up/start-up-login`) carries and this
  page did not, plus the two values it carried WRONGLY. Every expectation below cites the view
  function or const entry it came from, because the capture shows one render and the bundle shows
  what the template can do — and on `.user-nick` those two disagreed with what we had shipped.

  `stripComments` runs first throughout, so a class named only in an explanatory comment cannot
  satisfy any of these.
*/
describe('the login form controls decoded from the v4 bundle', () => {
  it('renders the authenticate-info sub-heading between the title and the form', () => {
    // `bue`: `d(1,"p",63),v(2,"Please complete this form:")`, const 63 = text-center authenticate-info.
    expect(pageCode).toContain('<p class="text-center authenticate-info">Please complete this form:</p>');
  });

  it('has the "Keep me logged in" checkbox, and POSTS it', () => {
    /*
      `pue`: const 81 form-check, 107 the input bound to `rememberMe`, 108 the label.

      `name="remember"` is asserted because the whole point of this control is that the server reads
      it. A checkbox that renders and posts nothing is the dead scaffolding this repository forbids.
    */
    expect(pageCode).toContain('id="remember-me"');
    expect(pageCode).toContain('name="remember"');
    expect(pageCode).toContain('class="form-check-input"');
    expect(pageCode).toContain('<label for="remember-me" class="form-check-label">Keep me logged in</label>');
  });

  it('WIRES that checkbox to the cookie lifetime — the half that was missing', () => {
    /*
      NEGATIVE CONTROL, and the reason this test exists: `setSessionCookie` has always branched
      THIRTY_DAYS vs ONE_DAY on its `remember` argument, and the action passed a hardcoded `false`,
      so every session was capped at a day no matter what the member asked for. Re-introducing the
      literal is the regression this catches.
    */
    expect(serverCode).toContain("form.get('remember') === 'on'");
    expect(serverCode).not.toContain('createSessionFor(cookies, account.id, false');
  });

  it('has both session-login-link controls, with the reference texts', () => {
    // const 84 (click → doLoginFormClear) and `gue` (click → showPresenter = !0), const 113.
    expect(pageCode).toContain('Not you? clear form');
    expect(pageCode).toContain('Have a password?<br />Click here');
    // const 83 `mt-1 text-right` and const 112 `mt-3 t text-center` — the stray `t` is the reference's.
    expect(pageCode).toContain('<div class="mt-1 text-right">');
    expect(pageCode).toContain('<div class="mt-3 t text-center">');
  });

  it('clears the IDENTITY and keeps the ROOM, which is what doLoginFormClear does', () => {
    /*
      `doLoginFormClear` passes `globals.sessionID` to `clearSavedToken` — the room survives; only
      nick/email/pw/phone are blanked. Dropping `id` here would strand the member on a login page
      that no longer knows which room they were entering.
    */
    expect(pageCode).toContain("['jwtSite', 'name', 'email']");
    expect(pageCode).not.toContain("'jwtSite', 'name', 'email', 'id'");
  });

  it('reveals the password field on request, not only when the room asks for one', () => {
    // `gue`'s only effect is `showPresenter = !0`; slot 32 hides the link once it is true.
    expect(pageCode).toContain('passwordRevealed || data.showPasswordField');
    expect(pageCode).toContain('{#if !showPresenter}');
  });

  it('says " Connecting " while submitting, not "Login"', () => {
    // `mue` is `d(0,"span"),v(1," Connecting "),T(2,"i",110)`. The WORD changes, not just the spinner.
    expect(pageCode).toContain('Connecting <i class="ml-2 fas fa-spinner fa-spin"></i>');
  });

  it('greets rather than labelling — the h1 is "Welcome to the <name>"', () => {
    /*
      `vde` AND `eue` — the h1 of each layout arm — carry the identical interpolation:
        Ne(" Welcome to the ",e.appService.globals.sessData.name," ")
      Both were read; neither was assumed from the other. The capture's
      "Welcome to the Room 3625" is that string with `sessData.name` = "Room 3625", which is why
      rendering the bare name looked plausible and was wrong.
    */
    const greetings = pageCode.match(/Welcome to the \{data\.roomTitle\}/g) ?? [];
    expect(greetings, 'one h1 per layout arm').toHaveLength(2);
    expect(pageCode).not.toContain('<h1 class="room-title">{data.roomTitle}</h1>');
  });

  it('strips the token from the address bar, as ngOnInit does', () => {
    /*
      `let i=!0; i=window.top===window.self, i&&(P("removing tok from url"),
       this.appService.removeUrlParam("tok"))` — byte ~1,192,100.

      A JWT in the URL is written to history, offered in `Referer`, and copied whenever somebody
      pastes "the link they were sent". It is verified server-side and already on `data.token`.

      Three assertions, and the LAST TWO are the ones that matter:
        - the iframe guard is the reference's and must survive;
        - `replaceState`, never `goto` — a goto re-runs the load without the token and blanks the
          prefill this page exists to show;
        - the `has()` check is what stops the effect re-triggering itself, since it reads `page.url`
          and replaceState writes it. Removing it spins.
    */
    expect(pageCode).toContain('window.top !== window.self');
    expect(pageCode).toContain('replaceState(');
    expect(pageCode).toContain("stripped.searchParams.has('jwtSite')");
    expect(pageCode).not.toContain("goto(`${stripped.pathname}");
  });

  it('picks the layout on sessData.description, which is the whole of L-5', () => {
    /*
      `yue`'s update block at byte 1,188,490:
        O(2, e.browserOK||e.browserOKDismissed ? -1 : 2)
        O(3, e.appService.globals.sessData.description ? 3 : 4)

      Slot 3 is `Wde` — `row login-row` + the `room-message` column. Slot 4 is `vue` — one column
      centred by `offset-md-3 offset-sm-3`. The offsets belong to the NO-description arm only;
      applying them unconditionally would centre a form that has a left column beside it.
    */
    expect(pageCode).toContain('{#if data.roomDescription}');
    expect(pageCode).toContain("'col-md-6 offset-md-3 col-sm-6 offset-sm-3 col-xs-12'");
    expect(pageCode).toContain("'col-md-6 col-sm-12 col-xs-12'");
    // The h1 moves INSIDE the form container on the centred arm — `bue`'s `H(0,eue,2,1,"h1",34)`.
    expect(pageCode).toContain('{#if !data.roomDescription && data.roomTitle}');
  });

  it('renders room-description as HTML, and SANITISES it on the server', () => {
    /*
      The const binds `innerHtml`, so this is rich text, and `.room-description img` in the
      component's CSS proves images render. `{@html}` is therefore correct — but this page is
      reachable WITHOUT a session, so the sanitiser has to run before the value ever leaves the
      server. NEGATIVE CONTROL: the raw settings value must never reach the payload.
    */
    expect(pageCode).toContain('{@html data.roomDescription}');
    expect(serverCode).toContain('roomDescription: sanitizeRoomDescription(');
    expect(serverCode).not.toContain("roomDescription: String(settings.description");
    // Deny-by-default, and no `data:` — an SVG data URL is script delivery dressed as an image.
    expect(serverCode).toContain("allowedSchemes: ['http', 'https', 'mailto']");
    expect(serverCode).not.toContain("'data'");
  });

  it('has "Keep me logged in" CHECKED by default, because the reference does', () => {
    /*
      The constructor at byte 1,188,545 sets `this.rememberMe=!0` before any branch runs, and
      nothing anywhere sets it false:

        constructor(e,i){…this.loginReady=!1,this.browserOK=!0,this.browserOKDismissed=!1,
          this.disableLoginForm=!1,this.rememberMe=!0,this.forgetMe=!1,…}

      Pinned because the safe-LOOKING default is the opposite one. Shipping `false` gives every
      member a ONE_DAY session while showing them an unticked box they never chose — which is what
      this page did for the first two attempts at this line.
    */
    expect(pageCode).toContain('let rememberMe = $state(true)');
    expect(pageCode).not.toContain('let rememberMe = $state(false)');
  });

  it('does NOT centre the user-nick, and shows the nick rather than the email', () => {
    /*
      THE NEGATIVE CONTROL THAT CAUGHT A SHIPPED GUESS. const 70 is `[1,"user-nick"]` — one class —
      and the component's own CSS is `.user-nick{font-style:italic;font-size:15px;margin-left:0}`
      with no `text-align` at all. We had shipped `class="user-nick text-center"` rendering
      `data.email`; the reference renders `@` + `e.nick`, guarded by `O(9, e.nick ? 9 : -1)`.
    */
    expect(pageCode).not.toContain('user-nick text-center');
    expect(pageCode).toContain('<div class="user-nick">@{name}</div>');
  });
});
