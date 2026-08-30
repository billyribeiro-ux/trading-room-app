import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROOM_VISIBLE_SETTINGS } from './room-config';
import { ROOM_SETTINGS } from './room-settings-schema';

/**
 * The WordPress SSO door's own boundary.
 *
 * Two things have to stay true and neither is enforced by the type system:
 *
 *  1. **`ssoJWTSecret` must never cross into the room.** It is a customer's signing key. The room
 *     serialises its config into SSR HTML on every load, so a value that crosses this boundary
 *     reaches the browser and every cache in front of it — and this particular value would let its
 *     holder mint entry to that room forever.
 *  2. **The generated schema's `wired` flags must agree with the generator.** The evidence dump the
 *     generator reads (`evidence-dumps/login-page/manage`) is NOT in this repository, so
 *     `pnpm schema:extract` cannot be run here and the flags were applied by hand to match exactly
 *     what it would emit. That is a normally-forbidden edit to a GENERATED file, made deliberately
 *     and recorded in `CHANGELOG.md` — and this test is the thing that makes it safe, by failing
 *     the moment the two drift.
 */

import { scriptListNames } from './script-list-names';

const GENERATOR = readFileSync(new URL('../../scripts/extract-manage-schema.mjs', import.meta.url), 'utf8');

function declaredList(name: string): string[] {
  const declared = scriptListNames(GENERATOR, name);
  expect(declared, `scripts/extract-manage-schema.mjs must declare ${name}`).not.toBeNull();
  return declared ?? [];
}

/** What `(public)/sso/[code]/+server.ts` and its helpers actually read. */
const SSO_READS = [
  'allowedMemberships',
  'allowedPerms',
  'allowedProducts',
  'loginErrorURL',
  'ssoJWTSecret',
  'tokenExpiresIn'
].sort();

describe('the SSO settings contract', () => {
  it("matches the generator's SSO_CONSUMED, which decides the wired flag", () => {
    expect(declaredList('SSO_CONSUMED')).toEqual(SSO_READS);
  });

  it('marks every one of them wired in the generated schema', () => {
    const wired = new Set(ROOM_SETTINGS.filter((definition) => definition.wired).map((d) => d.name));
    for (const name of SSO_READS) {
      expect(wired.has(name), `${name} is read by the SSO route but marked unwired`).toBe(true);
    }
  });

  it('names only real settings', () => {
    const known = new Set(ROOM_SETTINGS.map((definition) => definition.name));
    for (const name of SSO_READS) expect(known).toContain(name);
  });

  /*
    The count is the lock on the hand-edit.

    The generator throws unless `WIRED_SETTINGS.size` equals the number written into its contract
    check, and the generated file's header states the same total. If somebody flips a flag in the
    generated file without updating the generator — or the reverse — one of these two numbers moves
    and this fails. It is the only thing standing between "edited a generated file once, carefully"
    and "the generated file is now hand-maintained by accident".
  */
  it('agrees with the generator on how many settings are wired in total', () => {
    const contract = GENERATOR.match(/WIRED_SETTINGS\.size !== (\d+)/);
    expect(contract, 'the generator must assert a wired-setting count').not.toBeNull();

    const declared = Number(contract?.[1]);
    const actual = ROOM_SETTINGS.filter((definition) => definition.wired).length;
    expect(actual).toBe(declared);

    // And the file's own header, which is what a reader trusts.
    const source = readFileSync(new URL('./room-settings-schema.ts', import.meta.url), 'utf8');
    expect(source).toContain(`${declared} of ${ROOM_SETTINGS.length} are wired today`);
  });
});

/*
  The THIRD copy of the wired set, and the reason this test exists.

  `scripts/verify-room-settings-schema.mjs` carries its own `EXPECTED_WIRED_SETTINGS`. It is the
  strongest of the three checks — it regenerates the schema twice and compares bytes — and it is the
  only one that CANNOT RUN in this repository, because the generator reads `evidence-dumps/`, which
  is not here.

  On 2026-08-10 the SSO door wired six settings and that list was left at 35. Nothing failed, because
  nothing could run it; it was found by reading. A gate that cannot execute is a gate that drifts
  silently, so its expectations are mirrored here where vitest can see them.
*/
describe('the verifier script that cannot run here', () => {
  const VERIFIER = readFileSync(new URL('../../scripts/verify-room-settings-schema.mjs', import.meta.url), 'utf8');

  it('expects exactly the settings the generated schema marks wired', () => {
    const expected = scriptListNames(VERIFIER, 'EXPECTED_WIRED_SETTINGS');
    expect(expected, 'the verifier must declare EXPECTED_WIRED_SETTINGS').not.toBeNull();

    const actual = ROOM_SETTINGS.filter((definition) => definition.wired)
      .map((definition) => definition.name)
      .sort();

    expect(expected).toEqual(actual);
  });

  it('states the same total in its explanatory note', () => {
    // The note is what a reader trusts; a count in prose that disagrees with the list beneath it is
    // how this went wrong twice before.
    const wired = ROOM_SETTINGS.filter((definition) => definition.wired).length;
    expect(VERIFIER).toContain(`the union is ${wired}`);
  });
});

describe('the signing key stays in the controller', () => {
  it('never appears on the room allow-list', () => {
    expect(ROOM_VISIBLE_SETTINGS as readonly string[]).not.toContain('ssoJWTSecret');
  });

  it('is not sent by any of the three filters either', () => {
    // The filters are the customer's own configuration and are equally none of the room's business:
    // the room never evaluates entitlement, the controller does, before a handoff is ever minted.
    for (const name of ['allowedMemberships', 'allowedProducts', 'allowedPerms']) {
      expect(ROOM_VISIBLE_SETTINGS as readonly string[]).not.toContain(name);
    }
  });
});

describe('the SSO route itself', () => {
  /*
    Read as text, and the limitation is stated rather than hidden: the route needs a database and
    `$app/env/private` to execute, and the `*.db.test.ts` suites that could run it are excluded from
    this run because they need a real PostgreSQL binary.

    What this pins is that none of the gates has been dropped. Each line below is a decision that
    would be invisible if it silently disappeared in a refactor.
  */
  const ROUTE = readFileSync(new URL('../routes/(public)/sso/[code]/+server.ts', import.meta.url), 'utf8');

  it('refuses a room that is not open', () => {
    expect(ROUTE).toContain("if (room.state !== 'open') refuse('room-closed');");
  });

  it('verifies the token against the room short code, not just the secret', () => {
    /*
      Binding is what stops one customer key from opening every room that customer owns.

      Asserted as a call PREFIX rather than the whole expression: the first version pinned the
      complete single-line call and broke the moment an options object was added, which is a test
      failing over formatting rather than over behaviour. What matters is that `shortCode` reaches
      the verifier.
    */
    expect(ROUTE).toContain('verifySsoToken(secret, shortCode,');
    expect(ROUTE).toContain("url.searchParams.get('jwt')");
  });

  it("applies the room's own tokenExpiresIn as the staleness ceiling", () => {
    // Wired, not decorative: the resolved number is passed into the verifier, and anything the
    // owner typed that could not be read or had to be capped is logged rather than swallowed.
    expect(ROUTE).toContain('resolveMaxTokenAge(settings.tokenExpiresIn)');
    expect(ROUTE).toContain('maxAgeSeconds: maxAge.seconds');
    expect(ROUTE).toContain("console.warn('[sso] tokenExpiresIn'");
  });

  it('applies the entitlement filters before minting anything', () => {
    /*
      Matched on CALL sites, not bare identifiers.

      The first version of this test used `indexOf('evaluateEntitlement')` and failed — because it
      measured the order of the import statements at the top of the file, where the entitlement
      module happens to be imported before the token one. The route was correct all along. Anchoring
      on the call syntax is the difference between testing the code and testing the import block.
    */
    const verify = ROUTE.indexOf('verifySsoToken(secret, shortCode');
    const evaluate = ROUTE.indexOf('const decision = evaluateEntitlement(');
    const mint = ROUTE.indexOf('guestHandoffToken(ROOM_JWT_SECRET');
    expect(verify, 'the route must verify the token').toBeGreaterThan(-1);
    expect(evaluate, 'the route must evaluate entitlement AFTER verifying').toBeGreaterThan(verify);
    expect(mint, 'the route must mint the handoff LAST').toBeGreaterThan(evaluate);
  });

  it('mints a GUEST handoff, so a customer site can grant entry but never authority', () => {
    /*
      The security property worth protecting in every future change to that file. A WordPress
      visitor has no account here; `type: 'guest'` with an empty id is precisely true, and the room
      resolves their role from its own membership and fails closed to `member`.
    */
    expect(ROUTE).toContain('guestHandoffToken(');
    expect(ROUTE).not.toContain('siteHandoffToken');
  });

  it('answers every refusal with the same words', () => {
    // Naming the failed check would turn the endpoint into an oracle for probing a customer's key.
    expect(ROUTE).toContain('const REFUSAL =');
    expect(ROUTE).toContain('error(403, message || REFUSAL)');
  });

  it('logs the reason for a refusal, and the basis for an admission', () => {
    expect(ROUTE).toContain("console.warn('[sso] refused'");
    // "On what basis was this person let in" cannot be answered from a log of failures only.
    expect(ROUTE).toContain("console.info('[sso] admitted'");
  });
});
