/**
 * The WordPress SSO door: verifying a token minted by a customer's own site.
 *
 * A customer — Simpler Trading, say — runs WordPress with WooCommerce. WooCommerce knows whether a
 * subscription is paid up; we do not, and deliberately never will. So their site asserts, over a
 * signature we can check, "this person, these entitlements, right now", and this module decides
 * whether to believe it. Entitlement stays with the system that bills; identity-to-role stays here.
 *
 *     WordPress ──(HS256 JWT, room's ssoJWTSecret)──▶ /sso/<shortCode> ──▶ /session?id=…&jwtSite=…
 *
 * ## Why the controller, and not the room
 *
 * The room's `/session` route states the rule this follows: "The controller owns identity. It
 * creates rooms, manages them, and runs both logins… Either way the controller mints a token and
 * redirects here." WordPress SSO is a *third* door onto the same corridor, so it lands here and then
 * mints the ordinary handoff through `room-handoff.ts`. Three consequences, all of them the point:
 *
 *  - **The room needs no change at all.** It already trusts exactly one credential.
 *  - **`ssoJWTSecret` never leaves this process.** It is not in `ROOM_VISIBLE_SETTINGS`, is never
 *    serialised into page data, and is never sent to the room — which matters, because the room
 *    puts its config into SSR HTML on every load.
 *  - **One signer, one verifier.** Adding a second implementation of the handoff is how the two
 *    drift apart; `room-handoff.ts` remains the only thing that mints room entry.
 *
 * ## What is transcribed and what is ours
 *
 * **Transcribed:** that this mechanism exists at all, and its key. `room-settings-schema.ts`'s help
 * for `ssoJWTSecret` reads "Use this key in combination with the WordPRess plugin, or other JWT
 * SSO", alongside `ssoHost`, `allowPWLoginWithSSO` and `tokenExpiresIn` (captured value `"1d"`).
 * The reference's shortcode carried `key=''` and `mode='urlv3'`, i.e. a URL-borne JWT.
 *
 * **OURS, and marked as a divergence rather than passed off as a match:** the claim set. The
 * reference's captured handoff token is `{ name, email, id, type, issued, iat, exp }` — transcribed
 * byte-for-byte from `ptr1.json` — and carries **no membership, product or permission field**. So
 * the dump cannot say how `allowedMemberships` / `allowedProducts` / `allowedPerms` were evaluated:
 * either their plugin checked them before minting, or their server called back to WordPress. Rather
 * than invent a mechanism and present it as recovered, we chose the one that needs no callback, no
 * shared network path and no WooCommerce credential on our side — the entitlements ride inside the
 * signed token, and the signature is the proof.
 *
 * The cost of that choice, stated so nobody has to rediscover it: **entitlement is only as fresh as
 * the token.** A cancelled subscription blocks the next entry, not the session already running. That
 * is what {@link SSO_MAX_TOKEN_AGE_SECONDS} bounds.
 *
 * ## What is deliberately strict
 *
 * A JWT verifier is where "accept unless obviously wrong" quietly becomes an authentication bypass,
 * so every check is an allow rather than a reject — the same discipline as the room's
 * `handoff-token.ts`, and for the same reason:
 *
 *  - the algorithm must be exactly `HS256`; `alg: "none"` is the textbook forgery;
 *  - the signature is compared in **constant time**, over the exact bytes presented rather than a
 *    re-serialisation of the decoded payload;
 *  - **`room` is required and must match the room being entered.** Per-room secrets already make
 *    cross-room replay hard, but a customer who reuses one secret across two rooms would otherwise
 *    hand every holder of one token entry to both. Binding costs nothing and does not rely on the
 *    customer's key hygiene;
 *  - `exp` is required — a token without one never expires — and separately the token may not be
 *    older than {@link SSO_MAX_TOKEN_AGE_SECONDS}, so a customer who sets a year-long expiry on
 *    their side cannot turn a payment gate into a permanent key;
 *  - `email` is required and normalised once, here, because it is the join key to a membership.
 *
 * Rejections are opaque to the caller and detailed in the log. Telling a browser which check failed
 * turns this endpoint into an oracle for probing a customer's signing key.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * How long after minting a WordPress token stays acceptable, regardless of its own `exp`.
 *
 * The customer controls `exp`; we control this. Both must pass. Without it, a site that mints
 * 360-day tokens — which is exactly what the reference's own handoff does — would turn "is this
 * subscription paid?" into "was it paid at some point last year", and the payment gate would be
 * decorative.
 *
 * One hour is the reviewed default. It is long enough that a slow checkout, a password reset or a
 * user who opens the link in a new tab still works, and short enough that a cancellation takes
 * effect within a trading session rather than a trading week. `tokenExpiresIn` (captured `"1d"`)
 * remains the customer-facing knob for their own `exp`; this is the ceiling we enforce on top.
 */
export const SSO_MAX_TOKEN_AGE_SECONDS = 3_600;

/**
 * Tolerance for clock disagreement between the customer's server and ours.
 *
 * Two independently administered machines, so this is larger than the room's five seconds — a
 * WordPress host with a drifting clock is a support ticket we should not generate. It widens the
 * replay window by exactly as much as it forgives, which is why it is not larger still.
 */
export const SSO_CLOCK_SKEW_SECONDS = 60;

/**
 * The longest ceiling an owner may configure through `tokenExpiresIn`, whatever they type.
 *
 * 24 hours, and the number is not arbitrary: `tokenExpiresIn`'s captured value in the reference
 * tenant is exactly `"1d"`, so a day is demonstrably a value the original expected people to use.
 * Beyond it the setting stops being a payment gate and becomes a way to disable one, which is not a
 * choice a room owner should be able to make by typing `365d` into a text box.
 *
 * An over-long value is clamped and logged rather than refused: refusing would lock an owner out of
 * their own room over a typo, and silently honouring it would make the gate decorative.
 */
export const SSO_MAX_CONFIGURABLE_AGE_SECONDS = 86_400;

/** Bytes of entropy in a generated `ssoJWTSecret`. */
const SSO_SECRET_BYTES = 32;

/**
 * What a customer's site asserts about the person it is sending.
 *
 * `memberships`, `products` and `permissions` are matched against the room's `allowedMemberships`,
 * `allowedProducts` and `allowedPerms` filters. All three are optional: a room with no filters set
 * lets everyone in, which is what the reference's help text says ("Leave blank to let all members
 * in").
 */
export interface SsoClaims {
  /** Display name. Carried through to the room's roster. */
  name: string;
  /** Lower-cased and trimmed. The join key to a `room_users` membership, if one exists. */
  email: string;
  /** The room short code this token is for. Bound, not advisory. */
  room: string;
  /** WooCommerce membership plan slugs, or whatever the customer's site calls them. */
  memberships: readonly string[];
  /** WooCommerce product slugs or ids. */
  products: readonly string[];
  /** Arbitrary capability strings the customer's site maintains. */
  permissions: readonly string[];
  /** Seconds since epoch. */
  iat: number;
  exp: number;
}

export type SsoRejection =
  | 'no-secret'
  | 'malformed'
  | 'bad-algorithm'
  | 'bad-signature'
  | 'bad-claims'
  | 'wrong-room'
  | 'expired'
  | 'too-old'
  | 'from-the-future';

export type SsoResult = { ok: true; claims: SsoClaims } | { ok: false; reason: SsoRejection };

/**
 * A fresh signing key for one room, as hex.
 *
 * The reference's own help text shows a 40-character example
 * (`5081b73a690762e2526bc1fef3c46eedf1ec8832`, 20 bytes). We generate 32 bytes — 64 characters —
 * because this is an HMAC-SHA256 key and matching a screenshot is not a reason to hand a customer
 * less entropy than the algorithm's block size. The value is opaque to the WordPress plugin, which
 * only ever copies it, so the difference costs nobody anything.
 */
export function generateSsoSecret(): string {
  return randomBytes(SSO_SECRET_BYTES).toString('hex');
}

/** What {@link resolveMaxTokenAge} decided, and whether the owner got what they asked for. */
export interface ResolvedMaxTokenAge {
  seconds: number;
  /** `default` — nothing configured; `configured` — honoured as typed; `clamped` — capped; `unparsed` — not understood. */
  source: 'default' | 'configured' | 'clamped' | 'unparsed';
}

/**
 * Turns the room's `tokenExpiresIn` into the age ceiling this room enforces.
 *
 * The reference's own help text defines the format: *"A string like '1d', '1h', '12h" etc…"*, and
 * the captured value is `"1d"`. Bare digits are also accepted as seconds, because that is what
 * somebody types when the units are not obvious and refusing it would help nobody.
 *
 * Every path returns a usable number. An unparseable value falls back to
 * {@link SSO_MAX_TOKEN_AGE_SECONDS} rather than throwing, because this runs on the entry path: a
 * typo in a settings box must not take a room offline, and `source` tells the caller to say so in
 * the log.
 */
export function resolveMaxTokenAge(tokenExpiresIn: unknown): ResolvedMaxTokenAge {
  if (typeof tokenExpiresIn !== 'string' || !tokenExpiresIn.trim()) {
    return { seconds: SSO_MAX_TOKEN_AGE_SECONDS, source: 'default' };
  }

  const match = /^(\d+)\s*([smhd]?)$/i.exec(tokenExpiresIn.trim());
  if (!match) return { seconds: SSO_MAX_TOKEN_AGE_SECONDS, source: 'unparsed' };

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier = unit === 'd' ? 86_400 : unit === 'h' ? 3_600 : unit === 'm' ? 60 : 1;
  const requested = amount * multiplier;

  // Zero would refuse every token the instant it was minted, which reads as "SSO is broken" rather
  // than "SSO is strict". Treated as unconfigured.
  if (requested <= 0) return { seconds: SSO_MAX_TOKEN_AGE_SECONDS, source: 'unparsed' };
  if (requested > SSO_MAX_CONFIGURABLE_AGE_SECONDS) {
    return { seconds: SSO_MAX_CONFIGURABLE_AGE_SECONDS, source: 'clamped' };
  }
  return { seconds: requested, source: 'configured' };
}

function decodeSegment(segment: string): unknown {
  // `base64url` rejects nothing, so a malformed segment yields garbage rather than throwing; the
  // JSON.parse is what actually fails, and the caller treats that as malformed.
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads a claim that may be a JSON array, a comma-separated string, or absent.
 *
 * Both shapes are accepted because both are what a WordPress plugin naturally produces: PHP's
 * `json_encode` of a `WP_Term` list gives an array, while a hand-rolled `implode(',', $slugs)`
 * gives a string. Refusing one of them would be a support burden with no security benefit — the
 * signature already covers whichever form arrived.
 *
 * Entries are trimmed, empties dropped, and comparison is case-insensitive downstream.
 */
function readList(value: unknown): readonly string[] {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function signature(secret: string, signingInput: string): string {
  return createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Verifies a WordPress-minted token against one room's `ssoJWTSecret`.
 *
 * An options object rather than positional arguments, deliberately: there are now two independent
 * knobs and a third would arrive eventually. `verifySsoToken(secret, code, token, 3600)` reads as a
 * timestamp at a glance and would be a silent bug on the entry path.
 *
 * @param secret the room's `ssoJWTSecret`; blank or missing means SSO is not configured
 * @param shortCode the room being entered, from the URL — the token must name the same one
 * @param options.maxAgeSeconds this room's ceiling, from {@link resolveMaxTokenAge}
 * @param options.nowSeconds injected rather than read, so every expiry branch is testable without
 *   faking the clock globally — the same shape as `room-handoff.ts`
 */
export function verifySsoToken(
  secret: string | null | undefined,
  shortCode: string,
  token: string | null | undefined,
  options: { maxAgeSeconds?: number; nowSeconds?: number } = {}
): SsoResult {
  const maxAgeSeconds = options.maxAgeSeconds ?? SSO_MAX_TOKEN_AGE_SECONDS;
  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  // A room with no key configured has not enabled SSO. Refusing here rather than further down
  // means an unconfigured room cannot be probed for claim shapes.
  if (!secret?.trim()) return { ok: false, reason: 'no-secret' };
  if (!token) return { ok: false, reason: 'malformed' };

  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    return { ok: false, reason: 'malformed' };
  }
  const [headerSegment, payloadSegment, presentedSignature] = parts;

  let header: unknown;
  let payload: unknown;
  try {
    header = decodeSegment(headerSegment);
    payload = decodeSegment(payloadSegment);
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (!isRecord(header) || !isRecord(payload)) return { ok: false, reason: 'malformed' };

  // Pinned, not merely checked against a list of "safe" values. `none` is the classic forgery and
  // anything else means the two sides disagree about what was signed.
  if (header.alg !== 'HS256') return { ok: false, reason: 'bad-algorithm' };

  /*
    Signature before every claim check.

    Reading claims from an unverified payload and reporting on them is how a verifier becomes an
    oracle. Nothing below this point is decided from bytes we have not authenticated.
  */
  const expected = signature(secret, `${headerSegment}.${payloadSegment}`);
  const a = Buffer.from(expected);
  const b = Buffer.from(presentedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'bad-signature' };

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const room = typeof payload.room === 'string' ? payload.room.trim() : '';
  const iat = typeof payload.iat === 'number' ? payload.iat : NaN;
  const exp = typeof payload.exp === 'number' ? payload.exp : NaN;

  // An entrant with no email cannot be matched to a membership, and a nameless one has no roster
  // tile. Both are required rather than defaulted, because a default here invents a person.
  if (!email || !name || !Number.isFinite(iat) || !Number.isFinite(exp)) {
    return { ok: false, reason: 'bad-claims' };
  }
  if (!room) return { ok: false, reason: 'bad-claims' };
  if (room !== shortCode) return { ok: false, reason: 'wrong-room' };

  if (nowSeconds > exp + SSO_CLOCK_SKEW_SECONDS) return { ok: false, reason: 'expired' };
  // A token stamped well ahead of our clock is either a misconfigured host or an attempt to mint
  // something long-lived that our max-age check would otherwise not see.
  if (iat > nowSeconds + SSO_CLOCK_SKEW_SECONDS) return { ok: false, reason: 'from-the-future' };
  // Our ceiling, on top of the customer's own `exp`. See SSO_MAX_TOKEN_AGE_SECONDS, and
  // resolveMaxTokenAge for where a room's own `tokenExpiresIn` narrows it.
  if (nowSeconds - iat > maxAgeSeconds + SSO_CLOCK_SKEW_SECONDS) {
    return { ok: false, reason: 'too-old' };
  }

  return {
    ok: true,
    claims: {
      name,
      email,
      room,
      memberships: readList(payload.memberships),
      products: readList(payload.products),
      permissions: readList(payload.permissions),
      iat,
      exp
    }
  };
}
