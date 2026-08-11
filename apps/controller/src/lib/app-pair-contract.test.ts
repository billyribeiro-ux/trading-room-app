import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The self-serve pairing door — `TODO.md` item X.
 *
 * The path, the parameter names and the two literal placeholders are transcribed from the
 * reference's own manage view, `evidence-page.manageSession.html:1141`:
 *
 * ```html
 * <input type="text" class="form-control col-md-6" id="pairURLLink" readonly="readonly"
 *   value="https://chat.protradingroom.com/ptr_app/sessions/v2/addUser/{{sess._id}}/?sec={{sess.pairSecretKey}}&email=__userEmail__&name=__userName__">
 * ```
 *
 * gated at `:1138` by `ng-show="sess.hasAppPairLink && sess.pairSecretKey"`.
 *
 * ## What this file is really guarding
 *
 * A room-scoped bearer secret in a URL that adds people to a room. The reference's design, faithfully
 * reproduced — and the reproduction is only safe while its limits hold. Each case below is one of
 * those limits, and every one of them is a thing that would be invisible if it broke: a door that
 * silently starts minting presenters, or comparing secrets in variable time, or telling a caller
 * which of four checks failed, looks exactly like a working door.
 */

const cwd = process.cwd();
const ENDPOINT = readFileSync(`${cwd}/src/routes/(public)/ptr_app/sessions/v2/addUser/[publicId]/+server.ts`, 'utf8');
const EVIDENCE = readFileSync(`${cwd}/evidence-page.manageSession.html`, 'utf8');

/* Comments stripped: this file and the endpoint both quote the URL, and a test that matched its own
   explanation would pass with the handler deleted. */
const code = ENDPOINT.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the route matches the captured link', () => {
  it('is at the path the reference publishes', () => {
    // Read out of the evidence rather than typed here, so the two cannot drift apart.
    expect(EVIDENCE).toContain('/ptr_app/sessions/v2/addUser/');
    expect(ENDPOINT).toContain('/ptr_app/sessions/v2/addUser/');
  });

  it('takes the three parameters the link carries', () => {
    for (const param of ['sec', 'email', 'name']) {
      expect(EVIDENCE, `the captured link must carry ${param}`).toContain(`${param}=`);
      expect(code, `the handler must read ${param}`).toContain(`searchParams.get('${param}')`);
    }
  });

  it('refuses the literal placeholders rather than creating a member called __userName__', () => {
    // They are literal in the sample link, so pasting it unedited is the most likely mistake.
    expect(EVIDENCE).toContain('__userEmail__');
    expect(EVIDENCE).toContain('__userName__');
    expect(code).toContain('__useremail__');
    expect(code).toContain('__userName__');
  });
});

describe('it cannot grant more than the reference does', () => {
  it('creates a plain member, through the same path the manage page uses', () => {
    /*
      THE test. `inviteRoomUser` writes role 2 and nothing else; this handler passes it a name and an
      email and no role, no permissions, no flags. A door authenticated by a shared secret in a URL
      must not be able to mint a membership the manage page could not.
    */
    expect(code).toContain('inviteRoomUser(room.id, displayName, email)');
    expect(code).not.toMatch(/role\s*[:=]/);
    expect(code).not.toContain('isPresenter');
    expect(code).not.toContain('permissionsJson');
    expect(code).not.toContain('savePermissions');
  });
});

describe('the gate is the reference own gate, and it fails closed', () => {
  it('requires BOTH the flag and a secret, as the sample link does', () => {
    // `ng-show="sess.hasAppPairLink && sess.pairSecretKey"` — an enabled room with no secret is
    // unconfigured, not open.
    expect(EVIDENCE).toContain('sess.hasAppPairLink && sess.pairSecretKey');
    expect(code).toContain('hasAppPairLink');
    expect(code).toContain('pairSecretKey');
    expect(code).toMatch(/if \(!enabled\) refuse/);
    expect(code).toMatch(/if \(!configured\) refuse/);
  });

  it('compares the secret in constant time', () => {
    // Otherwise the endpoint hands back the secret a byte at a time.
    expect(code).toContain('timingSafeEqual');
    expect(code).not.toMatch(/configured === presented|presented === configured/);
  });

  it('answers every refusal identically, so it is not an oracle', () => {
    // Four things can fail — unknown room, flag off, no secret, wrong secret — and a caller must not
    // be able to tell which. A distinct message for "no such room" enumerates real rooms.
    const refusals = code.match(/refuse\('/g) ?? [];
    expect(refusals.length).toBeGreaterThanOrEqual(4);
    expect(code).toContain('const REFUSAL =');
    expect(code).toMatch(/error\(403, REFUSAL\)/);
  });

  it('treats an unknown room as a wrong secret', () => {
    expect(code).toMatch(/if \(!room\) refuse\(/);
  });

  it('logs the source and the reason, never the secret', () => {
    expect(code).toContain('getClientAddress()');
    expect(code).not.toMatch(/console\.[a-z]+\([^)]*presented/);
    expect(code).not.toMatch(/console\.[a-z]+\([^)]*configured/);
  });
});

describe('the secret format is not invented', () => {
  it('assumes no length, alphabet or encoding', () => {
    /*
      `sec=` came back EMPTY in the 2026-08-11 capture, because that room has no `pairSecretKey` set,
      so no populated key has ever been observed. A minimum length or a charset check here would be a
      rule with no source — and would reject a secret the owner legitimately chose.
    */
    expect(code).not.toMatch(/presented\.length\s*[<>]=?\s*\d/);
    expect(code).not.toMatch(/\/\^\[A-Za-z0-9\]/);
  });
});
