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
