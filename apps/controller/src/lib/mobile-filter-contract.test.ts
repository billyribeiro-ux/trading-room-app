import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Show Mobile / Show Non-Mobile / Marketplace Users — `TODO.md` gap 4.
 *
 * These three were unsupported for weeks on the grounds that "the predicate is server-side in the
 * reference and appears in no capture", and that three columns could each plausibly have meant
 * "mobile". Both halves were wrong, and the reference's own bundle says so.
 *
 * `loadMobileUsers()` posts `makeReqTokenForCmd("userList")` — the SAME command the unfiltered list
 * uses — and then filters IN THE BROWSER:
 *
 *     user.alerterAppTokens && user.alerterAppTokens.length          // Show Mobile
 *     !user.alerterAppTokens || 0 == user.alerterAppTokens.length    // Show Non-Mobile
 *
 * `alerterAppTokens` is this schema's `pushTokensJson`. `mobilePairCode` and `notificationsState`
 * are not consulted by either filter.
 *
 * `loadMarketplaceUsers()` is different: it posts `makeReqTokenForCmd("userListMarketplace")` and
 * applies no client filter, so that one really is resolved by an endpoint we have no equivalent of
 * and stays unsupported.
 *
 * ## The upstream bug this pins us AGAINST
 *
 * `loadNonMobileUsers` has a branch for rooms over 10,000 members that slices to the first 10,000
 * and then keeps users who **have** tokens — the inverse of its own name. A faithful transcription
 * would ship a "Show Non-Mobile" that returns mobile users in exactly the rooms big enough for
 * nobody to notice. Ours applies one predicate at every size, and the last case here fails if
 * anybody ever "fixes" that back.
 */

const cwd = process.cwd();
const LOADER = readFileSync(`${cwd}/src/routes/(app)/account/rooms/[id]/[[tab]]/+page.server.ts`, 'utf8');
const ROOMS = readFileSync(`${cwd}/src/lib/server/rooms.ts`, 'utf8');

/* Comments stripped before every assertion: the block above and the ones in the loader both quote
   the predicate, so a test reading the raw file would match its own explanation. */
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const LOADER_CODE = code(LOADER);
const ROOMS_CODE = code(ROOMS);

describe('the mobile filters use the field the reference uses', () => {
  it('filters on pushTokensJson, the column that maps to alerterAppTokens', () => {
    expect(LOADER_CODE).toContain(
      "filter === 'mobile') users = users.filter((u) => readPushTokens(u.pushTokensJson).length > 0)"
    );
    expect(LOADER_CODE).toContain('readPushTokens(u.pushTokensJson).length === 0');
  });

  it('reads the column as JSON rather than measuring the string', () => {
    // `'[]'` is a non-empty string and an empty list, so a length check on the raw text would call
    // every member mobile.
    expect(LOADER_CODE).not.toMatch(/pushTokensJson\.length/);
    expect(LOADER_CODE).toContain('readPushTokens(u.pushTokensJson)');
  });

  it('selects that column, or the filter silently sees undefined', () => {
    expect(ROOMS_CODE).toMatch(/pushTokensJson:\s*roomUsers\.pushTokensJson/);
  });

  it('does not consult the two columns the reference ignores', () => {
    // `mobilePairCode` and `notificationsState` were the other candidates. Neither appears in
    // either handler, so neither may appear in either predicate.
    const start = LOADER_CODE.indexOf("filter === 'mobile'");
    const end = LOADER_CODE.indexOf('const unsupportedFilter');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const predicates = LOADER_CODE.slice(start, end);
    expect(predicates).not.toContain('mobilePairCode');
    expect(predicates).not.toContain('notificationsState');
  });
});

describe('marketplace stays unsupported, and mobile stops being', () => {
  it('reports only the filters that genuinely cannot be honoured', () => {
    const at = LOADER_CODE.indexOf('const unsupportedFilter');
    const decl = LOADER_CODE.slice(at, at + 260);
    for (const supported of ['banned', 'presenters', 'trials', 'muted', 'mobile', 'non-mobile']) {
      expect(decl, `${supported} is implemented and must not report as unsupported`).toContain(`'${supported}'`);
    }
    // The one that really is server-side, via its own `userListMarketplace` command.
    expect(decl).not.toContain("'marketplace'");
  });
});

describe('the upstream inversion is not reproduced', () => {
  it('applies one predicate at every room size', () => {
    /*
      THE assertion. `loadNonMobileUsers` slices at 10,000 and then keeps users who HAVE tokens.
      Reproducing that would mean "Show Non-Mobile" returns mobile users in large rooms only —
      a wrong answer that hides itself until a room is big enough that nobody can check it by eye.
    */
    const start = LOADER_CODE.indexOf("filter === 'non-mobile'");
    const end = LOADER_CODE.indexOf('const unsupportedFilter');
    const branch = LOADER_CODE.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    // No size threshold, and no second predicate hiding behind one.
    expect(branch).not.toMatch(/10_?000|1e4/);
    expect(branch).not.toMatch(/\.slice\(/);
    expect(branch).toContain('length === 0');
    expect(branch).not.toContain('length > 0');
  });

  it('keeps the reason written down where the code is', () => {
    // The comment is the only record of why we differ from a captured behaviour; without it the
    // next reader "corrects" this back to match the reference.
    expect(LOADER).toContain('inverse of its own name');
  });
});
