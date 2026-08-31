import { createHmac } from 'node:crypto';

import { E2E_SECRET } from '../playwright.config';

/**
 * Minting the controller's handoff, so a spec can log in the way production does.
 *
 * ## Why a mint and not a fixture
 *
 * The room's only door is `/session?id=<shortCode>&jwtSite=<HS256 JWT>`, verified by
 * `#lib/server/handoff-token.ts` — algorithm pinned to HS256, signature compared in constant time,
 * `exp` required, `type` allow-listed. A recorded token would expire; a bypass would test a door the
 * product does not have. Minting one with the same secret the server is running under exercises the
 * real verifier on every spec, which means a change that breaks the handoff fails HERE and not in a
 * member's browser.
 *
 * The claim set is the reference's own, transcribed in that module's header: `{ name, email, id,
 * type, issued, iat, exp }`, in that order. Key ORDER matters to nothing at runtime and is kept
 * because the next person comparing this against the capture should not have to reorder it.
 */

const base64url = (value: Buffer | string) =>
  Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export interface HandoffOptions {
  name?: string;
  email?: string;
  /** `site` is an owner launching a room they own — the presenter path this suite drives. */
  type?: 'site' | 'guest';
  /**
   * The account id, and it is NOT free to choose: `handoff-token.ts:149` refuses
   * `type === 'guest' && id !== ''` as `bad-claims`, because a guest is not an account and an id
   * would be the beginning of one inheriting a membership.
   *
   * So the default follows the type rather than being a constant — `''` for a guest, `'1'` for a
   * site handoff. A spec that wanted to drive the guest door and passed only `type: 'guest'` got a
   * 403 and an error page, which reads as "the room refused a valid guest" rather than as "this
   * helper minted a token the rule forbids". Overridable, so the refusal itself stays testable.
   */
  id?: string;
  /** Seconds from now. The room's own tokens live 60s; a spec run is shorter than that. */
  lifetimeSeconds?: number;
}

export function mintHandoff(options: HandoffOptions = {}): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    name: options.name ?? 'E2E Presenter',
    email: options.email ?? 'e2e-presenter@example.com',
    id: options.id ?? (options.type === 'guest' ? '' : '1'),
    type: options.type ?? 'site',
    // Milliseconds, as the reference mints it — the one claim whose unit differs from its neighbours.
    issued: Date.now(),
    iat: nowSeconds,
    exp: nowSeconds + (options.lifetimeSeconds ?? 300)
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = base64url(createHmac('sha256', E2E_SECRET).update(signingInput).digest());
  return `${signingInput}.${signature}`;
}

/** The room's login URL for a freshly minted handoff. */
export const handoffUrl = (shortCode: string, options?: HandoffOptions) =>
  `/session?id=${encodeURIComponent(shortCode)}&jwtSite=${encodeURIComponent(mintHandoff(options))}`;
