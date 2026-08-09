/**
 * Mints the Ed25519 admission grants the SFU checks.
 *
 * This is the private half of `services/media/src/grant.rs`. That module holds the public key and
 * can only verify; this one holds the signing key and can only be reached from the server, so a
 * compromised media host cannot promote anybody (`grant.rs:15-19`).
 *
 * # The wire format, from `grant.rs:25-48`
 *
 * ```text
 * <payload> "." <signature>
 * payload   = base64url-nopad( UTF-8 JSON claims )
 * signature = base64url-nopad( Ed25519 signature over the ASCII bytes of `payload` )
 * ```
 *
 * **The signature covers the encoded segment, not the JSON** (`grant.rs:39-42`), so the two sides
 * never have to agree on a canonical JSON encoding - key order and whitespace are whatever
 * `JSON.stringify` produced, and the verifier only ever decodes the exact bytes that were signed.
 * That is what makes a byte-for-byte compatible signer possible at all, and it is why
 * {@link CLAIM_ORDER} below is load-bearing rather than cosmetic: the Rust struct's field order is
 * the documented JSON key order (`grant.rs:290-292`), and `media-grant.test.ts` pins the resulting
 * token against the literal Rust golden string.
 *
 * **base64url without padding** (RFC 4648 §5), which is exactly what Node's
 * `Buffer.toString('base64url')` emits. The Rust decoder is strict on both counts - a padded or
 * standard-alphabet grant is refused rather than silently accepted (`grant.rs:43-48`).
 *
 * **This is not a JWT** (`grant.rs:50-52`): no header segment, no `alg` field, so there is no
 * algorithm to confuse and `"alg":"none"` is not representable.
 *
 * # Seconds, not milliseconds
 *
 * `iat`/`exp` are **seconds** since the Unix epoch. `grant.rs:78-81` calls this out as the single
 * most likely way a JavaScript signer gets it wrong, because `Date.now()` is milliseconds and a
 * millisecond `iat` lands roughly 50,000 years in the future - every grant refused as
 * `NotYetValid`. {@link unixSeconds} is the only place this conversion happens.
 */

import { createHmac, createPrivateKey, createPublicKey, sign, type KeyObject } from 'node:crypto';
import { env as privateEnv } from '$env/dynamic/private';
import { joinsMediaAsProducer, type MediaPermissions } from '$lib/roster-gates';
import type { User } from './db/schema';

/**
 * Where this module's configuration comes from.
 *
 * **Not `process.env`.** SvelteKit does not copy `.env` into `process.env` - it loads the file
 * with Vite's `loadEnv` and exposes the result *only* through the `$env/*` modules
 * (`@sveltejs/kit/src/exports/vite/dev/index.js:443`; there is no assignment to `process.env`
 * anywhere in the framework). So under `vite dev` every `process.env.MEDIA_*` read here was
 * `undefined`, `loadSigningKey` threw `GrantConfigError`, and `/api/media/grant` answered 503 -
 * with the room unable to reach mediasoup at all.
 *
 * `$env/dynamic/private` is the correct source in both environments: in dev it is the parsed
 * `.env`, and under `adapter-node` it is the real process environment, so a deployment that
 * exports these variables for real keeps working unchanged. It is also read at runtime rather
 * than inlined at build time, which is what lets one built artefact run in several environments.
 *
 * Every entry point below still takes an `env` argument so the tests can inject one; this is
 * only what they default to.
 */
function serverEnv(): NodeJS.ProcessEnv {
  return privateEnv as NodeJS.ProcessEnv;
}

/** The only wire version this build speaks (`grant.rs:195`, `GRANT_VERSION`). */
export const GRANT_VERSION = 1;

/** The longest `exp - iat` the SFU will accept, in seconds (`grant.rs:204`, `MAX_GRANT_TTL_SECONDS`). */
export const MAX_GRANT_TTL_SECONDS = 300;

/**
 * How long a minted grant lives, in seconds.
 *
 * 60 is the value `grant.rs`'s own worked TypeScript example uses (`grant.rs:99`, `exp: now + 60`),
 * comfortably inside the 300s ceiling. A grant is an admission ticket presented once at connect
 * time, not a session token (`grant.rs:199-203`) - the browser can always ask for a fresh one,
 * because it still holds the session cookie.
 */
export const GRANT_TTL_SECONDS = 60;

/** Room ids are length-bounded at the verifier (`grant.rs:216`, `MAX_ROOM_ID_BYTES`). */
export const MAX_ROOM_ID_BYTES = 128;

/*
  `DEFAULT_MEDIA_ROOM_ID` and `mediaRoomId(env)` are gone, and so is `MEDIA_ROOM_ID`.

  Their doc said the room id could not be derived because "there is no room entity anywhere in this
  app's schema", and called itself the seam that has to change when real rooms arrive. They have:
  `sessions.room_short_code` records the room a session was handed into, `requireRoomShortCode`
  resolves it per request, and every content table is scoped by it.

  A constant was never only a placeholder — the SFU groups peers by this string, so one value meant
  every room on the deployment shared one SFU room. See `mediaRoomIdFor`.
*/

/** The claims, in the exact order `grant.rs`'s `Grant` struct declares them (`grant.rs:295-310`). */
export type GrantClaims = {
  v: number;
  room: string;
  uid: number;
  name: string;
  role: MediaRole;
  iat: number;
  exp: number;
};

/**
 * The two roles the SFU acts on (`grant.rs:266-273`, serialised lowercase).
 *
 * The app's own vocabulary is deliberately *not* on the wire: the live database holds
 * `guest`/`member`/`staff` while the code branches on `'user'` and `'admin'`, so mapping a `users`
 * row to a media role "is an unsettled product question that belongs to the signer, which can see
 * the row" (`grant.rs:259-264`). This module is that signer.
 */
export type MediaRole = 'presenter' | 'member';

/** Key order is the wire format. See the module docs. */
const CLAIM_ORDER: readonly (keyof GrantClaims)[] = [
  'v',
  'room',
  'uid',
  'name',
  'role',
  'iat',
  'exp'
];

export class GrantConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GrantConfigError';
  }
}

/** Seconds since the Unix epoch. The one place milliseconds become seconds. */
export function unixSeconds(now: Date = new Date()): number {
  return Math.floor(now.getTime() / 1000);
}

/** What decides whether this connection may produce media. */
export type MediaAdmission = { isPresenter: boolean } & MediaPermissions;

/**
 * Maps a connection to a media role.
 *
 * ## Changed 2026-08-07: the five permissions decide this, not `users.role`
 *
 * This read `isPresenterRole(user.role)` — the room's OWN account role — so the owner's
 * `#permissionsModal` had no effect on the media path in either direction. A Participant granted
 * `hasMic` was minted a `member` grant and could not open a microphone; a Presenter with mic, cam
 * and screen all withheld was still minted `presenter`.
 *
 * It now uses {@link joinsMediaAsProducer}, transcribed byte-for-byte from the reference's single
 * `connectToRoom` emit:
 *
 * ```js
 * isP: globals.user.isPresenter || globals.user.hasCam
 *      || globals.user.hasMic   || globals.user.hasScreen
 * ```
 *
 * The permissions are per ROOM and live on the controller's `room_users`, so they reach this module
 * through `readRoomConfig`, not through the room's `users` table. A guest has no membership row and
 * is therefore never a producer.
 *
 * Worth restating, because it is why this mattered: `users.role` DEFAULTs to `'staff'`
 * (`schema.ts:8`), and 238 of the 386 rows in the dev database are `'staff'`. Deriving media
 * admission from that made most of the database a presenter.
 */
export function mediaRoleFor(viewer: MediaAdmission): MediaRole {
  return joinsMediaAsProducer(viewer) ? 'presenter' : 'member';
}

/**
 * The SFU room id for one of OUR rooms, derived from the controller's short code.
 *
 * The module doc above says this was a deployment constant because "there is no room entity
 * anywhere in this app's schema", and names itself the seam that has to change when real rooms
 * arrive. They have: a session records the room it was handed into (`sessions.room_short_code`),
 * `requireRoomShortCode` resolves it on every request, and every content table is scoped by it.
 *
 * Deriving it is not cosmetic. The SFU groups peers by this string, so while it was one constant
 * every room on the deployment shared a single SFU room — two unrelated rooms would have seen and
 * heard each other. That is the bug the constant was always going to become.
 *
 * `tra-` for Trading Room App, so the id is self-describing in the SFU's logs and cannot collide
 * with an id minted by anything else pointed at the same server.
 */
export function mediaRoomIdFor(roomShortCode: string): string {
  const code = roomShortCode.trim();
  if (!code) throw new GrantConfigError('a media grant needs the room it is for');
  const room = `tra-${code}`;
  const bytes = Buffer.byteLength(room, 'utf8');
  if (bytes < 1 || bytes > MAX_ROOM_ID_BYTES) {
    throw new GrantConfigError(
      `the media room id is ${bytes} bytes; the media server accepts 1 to ${MAX_ROOM_ID_BYTES}`
    );
  }
  return room;
}

/**
 * Loads the signing key from `MEDIA_GRANT_PRIVATE_KEY`, a PKCS#8 PEM (`grant.rs:86-89`).
 *
 * Throws rather than returning null when it is missing or malformed. A media session that silently
 * does not work is worse than a 500 naming the variable, and this key is the half that must never
 * reach a browser - so it is only ever read here, in a `$lib/server` module SvelteKit refuses to
 * bundle into client code.
 */
export function loadSigningKey(env: NodeJS.ProcessEnv = serverEnv()): KeyObject {
  const pem = env.MEDIA_GRANT_PRIVATE_KEY;
  if (!pem) {
    throw new GrantConfigError(
      'MEDIA_GRANT_PRIVATE_KEY is not set: media admission grants cannot be signed'
    );
  }

  let key: KeyObject;
  try {
    key = createPrivateKey(pem);
  } catch (error) {
    throw new GrantConfigError(
      `MEDIA_GRANT_PRIVATE_KEY is not a readable private key: ${(error as Error).message}`
    );
  }

  if (key.asymmetricKeyType !== 'ed25519') {
    throw new GrantConfigError(
      `MEDIA_GRANT_PRIVATE_KEY is a ${key.asymmetricKeyType ?? 'unknown'} key; the media server verifies Ed25519 only`
    );
  }
  return key;
}

/**
 * The matching `MEDIA_GRANT_PUBLIC_KEY` value for a signing key: the raw 32 public-key bytes in
 * **standard base64, with padding** - 44 characters ending in `=`. Not base64url, not DER/SPKI, not
 * PEM (`grant.rs:114-122`).
 *
 * The JWK `x` member of an Ed25519 key is the raw 32 bytes, base64url encoded (RFC 8037 §2), so
 * this is a re-encode rather than a derivation.
 *
 * Exported because "the app and the SFU are holding different halves of different keypairs" is the
 * misconfiguration this whole mechanism fails most opaquely on - every peer refused, no other
 * symptom (`grant.rs:124-126`).
 */
export function publicKeyBase64(key: KeyObject): string {
  const { x } = createPublicKey(key).export({ format: 'jwk' });
  if (typeof x !== 'string') {
    throw new GrantConfigError('the signing key exposes no JWK x member; it is not Ed25519');
  }
  return Buffer.from(x, 'base64url').toString('base64');
}

/**
 * Encodes and signs one set of claims.
 *
 * Serialises through {@link CLAIM_ORDER} rather than an object literal so the key order is stated
 * once and asserted by the golden-vector test, instead of resting on JS insertion order surviving
 * every future edit to this file.
 */
export function signClaims(key: KeyObject, claims: GrantClaims): string {
  const ordered: Record<string, unknown> = {};
  for (const claim of CLAIM_ORDER) ordered[claim] = claims[claim];

  const payload = Buffer.from(JSON.stringify(ordered), 'utf8').toString('base64url');
  // `null` as the algorithm is required for Ed25519: the curve fixes the hash (`grant.rs:103`).
  // The message is the payload SEGMENT's ASCII bytes, not the JSON.
  const signature = sign(null, Buffer.from(payload, 'ascii'), key).toString('base64url');
  return `${payload}.${signature}`;
}

export type MintedGrant = {
  /** The `<payload>.<signature>` token, to be presented as `?grant=` on the SFU's WebSocket. */
  grant: string;
  room: string;
  role: MediaRole;
  /** Seconds since the Unix epoch, so a client can refresh before it lapses. */
  expiresAt: number;
};

/**
 * Mints a grant for one signed-in user.
 *
 * `uid` comes from `users.id`, a SQLite autoincrement rowid starting at 1
 * (`src/lib/server/db/schema.ts:3-14`), which is why the verifier requires it to be positive
 * (`grant.rs:70-71`). `name` is `users.display_name`, carried so the SFU can label a roster tile
 * without ever querying the app's database (`grant.rs:73-76`).
 */
export function mintGrant(
  user: Pick<User, 'id' | 'displayName'>,
  options: {
    /**
     * REQUIRED. The caller must resolve the per-room membership and say what it admits, because
     * this module cannot see `room_users`. Deliberately not defaulted: a default would be a second
     * way to compute one fact, which is exactly how `isP` and `isPresenter` drifted apart before.
     */
    admission: MediaAdmission;
    /**
     * REQUIRED, and for the same reason as `admission`: the caller knows which room this session
     * was handed into and this module does not. Defaulting it to a constant is what put every room
     * on the deployment into one SFU room.
     */
    roomShortCode: string;
    now?: Date;
    ttlSeconds?: number;
    env?: NodeJS.ProcessEnv;
  }
): MintedGrant {
  const env = options.env ?? serverEnv();
  const ttl = options.ttlSeconds ?? GRANT_TTL_SECONDS;
  if (ttl <= 0 || ttl > MAX_GRANT_TTL_SECONDS) {
    throw new GrantConfigError(
      `a grant TTL of ${ttl}s is outside the media server's 1 to ${MAX_GRANT_TTL_SECONDS}s range`
    );
  }

  const room = mediaRoomIdFor(options.roomShortCode);
  const issuedAt = unixSeconds(options.now);
  const claims: GrantClaims = {
    v: GRANT_VERSION,
    room,
    uid: user.id,
    name: user.displayName,
    role: mediaRoleFor(options.admission),
    iat: issuedAt,
    exp: issuedAt + ttl
  };

  return {
    grant: signClaims(loadSigningKey(env), claims),
    room,
    role: claims.role,
    expiresAt: claims.exp
  };
}

/**
 * The SFU's signalling URL for the browser to dial.
 *
 * Default matches the media service's own defaults: `MEDIA_BIND_ADDRESS` is `0.0.0.0:4443`
 * (`services/media/src/config.rs:77`) and the socket route is `/ws` (`server.rs:590`). Deployments
 * override it, and must use `wss://` there - the grant travels in the query string, which is
 * bounded by TLS and by the grant's own five-minute ceiling (`server.rs:107-116`).
 */
export function mediaSignallingUrl(env: NodeJS.ProcessEnv = serverEnv()): string {
  return env.MEDIA_WS_URL?.trim() || 'ws://localhost:4443/ws';
}

/**
 * How long minted TURN credentials stay usable, in seconds.
 *
 * Deliberately far longer than {@link GRANT_TTL_SECONDS}. The grant is checked once, at the
 * WebSocket handshake; a TURN credential is presented again on every ICE restart for as long as the
 * call lasts, so a 60-second one would strand a viewer who was watching when it lapsed. An hour
 * covers a trading session without making a leaked credential valuable for long.
 */
export const TURN_CREDENTIAL_TTL_SECONDS = 3600;

/**
 * ICE servers for the browser's transports, with ephemeral TURN credentials.
 *
 * ## Why TURN is not optional once this is deployed
 *
 * mediasoup is an SFU, not a peer-to-peer mesh: every browser connects to the media host directly,
 * and the host announces one address (`MEDIA_ANNOUNCED_ADDRESS`) with a UDP port range. On a LAN
 * that is enough. On the public internet a meaningful share of viewers sit behind symmetric NAT or
 * a firewall that permits nothing but TCP/443 outbound, and for them ICE finds no working candidate
 * pair at all - the socket connects, signalling succeeds, the transport negotiates, and no media
 * ever arrives. Without a TURN relay those viewers see a permanently black screen share and no
 * error, which is the failure mode this whole file's error handling exists to avoid.
 *
 * ## Ephemeral credentials, not a shared password
 *
 * coturn's `use-auth-secret` mode (draft-uberti-behave-turn-rest-00), which is what a TURN server
 * is configured for when credentials are minted per session rather than provisioned per user:
 *
 * ```text
 * username   = <unix expiry timestamp> [":" <user id>]
 * credential = base64( HMAC-SHA1( static-auth-secret, username ) )
 * ```
 *
 * The long-term secret stays here, in a `$lib/server` module SvelteKit will not bundle into client
 * code - the browser only ever receives a username/credential pair that expires. HMAC-SHA1 is not a
 * choice this app gets to make: it is what the TURN REST specification defines and what coturn
 * verifies against, so using anything stronger would simply be refused.
 *
 * Returns an empty list when no TURN server is configured, which is the correct state for local
 * development against a media host on the same machine - not a silent fallback, because with no
 * relay configured there is nothing to fall back to and the transports work fine over host
 * candidates.
 */
export function mediaIceServers(
  user: Pick<User, 'id'>,
  options: { now?: Date; env?: NodeJS.ProcessEnv } = {}
): RTCIceServer[] {
  const env = options.env ?? serverEnv();
  const servers: RTCIceServer[] = [];

  const stunUrls = splitUrls(env.MEDIA_STUN_URLS);
  if (stunUrls.length > 0) servers.push({ urls: stunUrls });

  const turnUrls = splitUrls(env.MEDIA_TURN_URLS);
  const secret = env.MEDIA_TURN_SECRET?.trim();
  if (turnUrls.length === 0 || !secret) return servers;

  // The username IS the expiry - coturn reads the timestamp back out of it and refuses the
  // credential once it has passed, so there is no server-side state to keep.
  const username = `${unixSeconds(options.now) + TURN_CREDENTIAL_TTL_SECONDS}:${user.id}`;
  const credential = createHmac('sha1', secret).update(username).digest('base64');
  servers.push({ urls: turnUrls, username, credential });
  return servers;
}

/** Comma-separated because one TURN deployment normally offers UDP, TCP and TLS on one host. */
function splitUrls(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
}
