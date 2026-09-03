/**
 * The credential an external encoder (OBS, XSplit) publishes into a room with, and the check the
 * media server makes on every publish attempt.
 *
 * ## Read from the reference, not inferred
 *
 * `docs/source/main.d6d3c112b59b7d0d.js`, `handleStreaming()` at byte 2157950:
 *
 * ```js
 * e.yourName = encodeURIComponent(e.appService.globals.user.name.replace(/[^a-zA-Z0-9_-]/g, "_"));
 * e.streamingLinkRTMP = `rtmp://${streamServerMTX}/room__${sessionID}__${yourName}?jwt=${mtxToken}`;
 * e.streamKey         = e.appService.globals.mtxToken;
 * e.streamingLink     = `http://${streamServerMTX}:8889/room__${sessionID}__${yourName}/whip`;
 * ```
 *
 * and `getNewToken()` at byte 2169850:
 *
 * ```js
 * let i = yield e.appService.invokeAdminCmd("getRTMPToken");   // -> { rtmpToken }
 * e.appService.globals.mtxToken = i.rtmpToken;
 * ```
 *
 * Three facts fall out of those, and all three shape this module:
 *
 *  1. **One token serves both protocols.** `streamKey` and the `?jwt=` in the RTMP URL are the same
 *     `globals.mtxToken`. There is not an RTMP key and a separate WHIP key.
 *  2. **It travels differently per protocol.** RTMP carries it as a query parameter named `jwt`;
 *     WHIP carries it as an HTTP **Bearer** — the panel's own label for that field is the literal
 *     string `Bearer` (consts index 116, byte 2173342). So the check below must accept it from
 *     either place, because the encoder decides which one it is.
 *  3. **The parameter is called `jwt`.** The reference's token format is not otherwise captured, but
 *     it named the thing, and a JWT is what we mint.
 *
 * ## Why a JWT AND a database row
 *
 * A bare JWT cannot be revoked, and "New Link" exists precisely to revoke. A bare opaque key cannot
 * be rejected without a database round trip, and this is checked on every publish attempt. Doing
 * both gets the properties of each:
 *
 *  - the signature and `exp` are verified first, in memory, so a forged or expired token never
 *    reaches the database;
 *  - `jti` is then matched against the ONE live row for that room and presenter, so pressing "New
 *    Link" invalidates the previous token the instant the row is updated — the old `jti` no longer
 *    matches anything and the next publish attempt is refused;
 *  - `sub` pins the token to the exact MediaMTX path it was minted for, so a token leaked from one
 *    room cannot be replayed against another even if the row lookup were ever wrong.
 *
 * Every one of those is a deny-by-default check. A token missing any claim is refused, not treated
 * as unrestricted.
 *
 * ## The lifetime is OUR decision, and is recorded as one
 *
 * The bundle does not show a lifetime; `apps/room/docs/OBS-XSPLIT-INGEST.md` §3 records that as an
 * honest gap and it stays one. 30 days is chosen deliberately: an OBS profile with a saved stream
 * key has to keep working across a normal engagement without the presenter re-copying it before
 * every session, and revocation does not depend on expiry — "New Link" is immediate and
 * database-backed. `exp` is therefore a backstop that bounds a leak nobody noticed, not the primary
 * control.
 */
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { base64Url, signature } from './room-handoff';
import { getDb } from './db';
import { streamIngestKeys } from './db/schema';

/**
 * Seconds an ingest token is valid for. See the module note — chosen, not captured.
 * 2,592,000 = 30 days of 86,400 seconds.
 */
export const INGEST_TOKEN_TTL_SECONDS = 2_592_000;

/**
 * The domain separator. `room-handoff` signs `config-read:…`; this signs `stream-ingest:…`. One
 * secret, two credentials, and neither is a valid presentation of the other.
 */
const INGEST_DOMAIN = 'stream-ingest:';

/**
 * Seconds a READ token is valid for. 12 hours.
 *
 * Shorter than the publish key and for a different reason. A read token is stateless — there is no
 * row to delete — so its lifetime IS its revocation. 12 hours is long enough that an HLS playback
 * session cannot outlive it mid-stream, and short enough that a member removed from a room loses
 * access the same day rather than in a month.
 *
 * **The honest limitation, stated rather than hidden:** a member banned right now keeps the ability
 * to fetch the playlist until their token expires. Making that instant would mean a database read
 * on every HLS segment request, several per second per viewer, which is the wrong trade at this
 * size. If it becomes the wrong call, the fix is a room-level epoch in the claim checked against a
 * cached counter — not a per-segment membership query.
 */
export const READ_TOKEN_TTL_SECONDS = 43_200;
/** Public-player media grants rotate on every page load and expire within five minutes. */
export const PUBLIC_READ_TOKEN_TTL_SECONDS = 300;

export interface IngestTokenClaims {
  /**
   * What this token names.
   *
   * For `publish`, the exact MediaMTX path and nothing else. For `read`, the room's short code —
   * a viewer must be able to watch every presenter in their room, and could not if the token were
   * pinned to one path that does not exist until somebody starts streaming.
   */
  sub: string;
  /**
   * Which of the two rights this is. There is no default and no third value: a token whose scope
   * is absent or unrecognised is refused, so adding a right later cannot silently widen an old one.
   */
  scope: 'publish' | 'read';
  /**
   * The row identity, for `publish` only. Rotating the row changes this and orphans every token
   * that carried the old one. A `read` token has no row, so it has no `jti`.
   */
  jti?: string;
  iat: number;
  exp: number;
}

/**
 * `room__{roomKey}__{name}` — one MediaMTX path per presenter per room.
 *
 * The double underscore is the separator and the sanitiser is what protects it: a display name is
 * arbitrary user input, and `Bob__Smith` or `Bob/../other` would otherwise reshape the path. The
 * reference's own two steps are reproduced in its order — collapse everything outside
 * `[a-zA-Z0-9_-]` to `_`, THEN percent-encode.
 *
 * The second step is a no-op on the output of the first, because every surviving character is
 * already URL-safe. It is kept anyway: it is what the reference does, and removing a redundant
 * defence because it is currently redundant is how it stops being there when the first step
 * changes.
 *
 * `roomKey` is supplied by the caller and is never taken from a request body — see the endpoint.
 */
export function ingestPathFor(roomKey: string, displayName: string): string {
  /*
    The room key may not contain `_`, and this throws rather than encoding one.

    `__` is the separator, so a room key containing it would make `roomKeyOfPath` ambiguous and a
    read token for room `a__b` would be indistinguishable from one for room `a`. Short codes are
    alphanumeric, so this never fires in practice — it is here because "never fires in practice" is
    what everyone said about the last parser that got a value it did not expect.
  */
  if (!/^[a-zA-Z0-9-]+$/.test(roomKey)) {
    throw new Error(`A room key must be alphanumeric to be unambiguous in a path: ${JSON.stringify(roomKey)}`);
  }
  const sanitized = encodeURIComponent(displayName.replace(/[^a-zA-Z0-9_-]/g, '_'));
  return `room__${roomKey}__${sanitized}`;
}

/**
 * Which room a MediaMTX path belongs to, or null if it is not one of ours.
 *
 * Paths are `room__{roomKey}__{rest}`, and the reference appends `__reb` to the whole thing when a
 * stream is relayed from another server (`app-streaming-view.full.js:113-115`) — so the room key is
 * the SECOND segment and everything after it is variable.
 *
 * This is a parse followed by an EQUALITY comparison, deliberately, rather than
 * `path.startsWith('room__' + key)`. A prefix test would let a token for room `ab` read room
 * `abc`'s streams, because `room__abc__x` starts with `room__ab`.
 */
export function roomKeyOfPath(path: string): string | null {
  const segments = path.split('__');
  if (segments.length < 3 || segments[0] !== 'room') return null;
  return segments[1] || null;
}

/**
 * Sign a token for one path. `nowSeconds` is a parameter, not a `Date.now()` call, so expiry is
 * testable without faking the clock globally — the same shape `siteHandoffToken` uses.
 */
export function mintIngestToken(
  secret: string,
  claims: { sub: string; scope: 'publish' | 'read'; jti?: string },
  nowSeconds: number = Math.floor(Date.now() / 1000)
): string {
  const header = base64Url({ alg: 'HS256', typ: 'JWT' });
  const body = base64Url({
    sub: claims.sub,
    scope: claims.scope,
    ...(claims.jti ? { jti: claims.jti } : {}),
    iat: nowSeconds,
    exp: nowSeconds + (claims.scope === 'read' ? READ_TOKEN_TTL_SECONDS : INGEST_TOKEN_TTL_SECONDS)
  } satisfies IngestTokenClaims);
  return `${header}.${body}.${signature(secret, `${INGEST_DOMAIN}${header}.${body}`)}`;
}

/**
 * The viewer's credential — what plays the HLS playlist.
 *
 * Read from `app-streaming-view.full.js:113-116`, which is where this whole right came from:
 *
 * ```js
 * let e = `room__${muser.sessionID}__${muser.producerID}`;
 * if (muser.mediaValue.serverName !== globals.streamServerMTX) e += '__reb';
 * this.videoSrc = `https://${globals.streamServerMTX}/${e}/index.m3u8?jwt=${globals.mtxToken}`;
 * ```
 *
 * and from `userLoggedIn` at byte 994430, which is where a viewer gets one:
 *
 * ```js
 * B.mtxToken && (e.globals.mtxToken = B.mtxToken),
 * B.streamServerMTX && (e.globals.streamServerMTX = B.streamServerMTX),
 * ```
 *
 * So the reference hands **every** session a token at login, not only presenters — playback is
 * authenticated, and a room's stream is not readable by anyone who guesses the path. Stateless on
 * purpose: this is checked on every HLS segment request, and a database read per segment per viewer
 * is not a cost worth paying for a right that the TTL already bounds.
 */
export function mintRoomReadToken(
  secret: string,
  roomKey: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  ttlSeconds: number = READ_TOKEN_TTL_SECONDS
): string {
  const header = base64Url({ alg: 'HS256', typ: 'JWT' });
  const body = base64Url({
    sub: roomKey,
    scope: 'read',
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds
  } satisfies IngestTokenClaims);
  return `${header}.${body}.${signature(secret, `${INGEST_DOMAIN}${header}.${body}`)}`;
}

export type IngestTokenResult =
  { ok: true; claims: IngestTokenClaims } | { ok: false; reason: 'malformed' | 'bad-signature' | 'expired' };

/**
 * Verify signature, then shape, then freshness. In that order, and all of them.
 *
 * Signature first for the same reason `verifyConfigReadToken` does it: deciding anything about a
 * token before proving it is ours answers a question for an unauthenticated caller.
 */
export function verifyIngestToken(
  secret: string,
  token: string | null | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): IngestTokenResult {
  if (!token) return { ok: false, reason: 'malformed' };

  const parts = token.split('.');
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    return { ok: false, reason: 'malformed' };
  }

  const expected = signature(secret, `${INGEST_DOMAIN}${parts[0]}.${parts[1]}`);
  const a = Buffer.from(expected);
  const b = Buffer.from(parts[2]);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'bad-signature' };

  let claims: IngestTokenClaims;
  try {
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as IngestTokenClaims;
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  /*
    Deny by default on every claim. A token whose body parsed but carries no `sub` is not a token
    with an unrestricted path — it is a token that fails.
  */
  if (typeof claims?.sub !== 'string' || !claims.sub) return { ok: false, reason: 'malformed' };
  if (!Number.isInteger(claims?.exp)) return { ok: false, reason: 'malformed' };
  /*
    The scope is an allow-list of exactly two values, checked before anything reads it. An absent or
    unrecognised scope is refused rather than treated as the weaker of the two — "unknown means
    read-only" sounds safe and is how a third right added later silently inherits an old token.
  */
  if (claims?.scope !== 'publish' && claims?.scope !== 'read') return { ok: false, reason: 'malformed' };
  /* A publish token without its row identity cannot be checked for revocation, so it is not valid. */
  if (claims.scope === 'publish' && (typeof claims.jti !== 'string' || !claims.jti)) {
    return { ok: false, reason: 'malformed' };
  }

  if (nowSeconds >= claims.exp) return { ok: false, reason: 'expired' };

  return { ok: true, claims };
}

/**
 * Mint or ROTATE the one key a presenter holds for a room, and return the token to show them.
 *
 * This is the whole of `getRTMPToken`. It is an upsert rather than an insert because
 * `UNIQUE (room_id, user_id)` is what makes "New Link" a replacement: the previous `jti` ceases to
 * exist in the same statement that creates its successor, so there is no window in which both work
 * and no second row to reason about later.
 *
 * `ingest_path` is written on every rotation, so a presenter who has renamed themselves gets a key
 * scoped to their new path — and, importantly, their OLD key does not silently gain access to it.
 */
export async function mintRoomIngestKey(
  secret: string,
  input: { roomId: number; userId: number; ingestPath: string },
  nowSeconds: number = Math.floor(Date.now() / 1000)
): Promise<{ rtmpToken: string; ingestPath: string }> {
  /*
    128 bits from the CSPRNG. This is the `jti`, and it is also the row's own uniqueness: two
    presenters must never collide, and a `jti` that could be guessed would let a forged-but-unsigned
    token at least name a real row. It cannot pass the signature check, but a credential identifier
    is not the place to economise.
  */
  const jti = randomBytes(16).toString('base64url');

  await getDb()
    .insert(streamIngestKeys)
    .values({
      roomId: input.roomId,
      userId: input.userId,
      ingestKey: jti,
      ingestPath: input.ingestPath
    })
    .onConflictDoUpdate({
      target: [streamIngestKeys.roomId, streamIngestKeys.userId],
      set: {
        ingestKey: jti,
        ingestPath: input.ingestPath,
        rotatedAt: new Date(nowSeconds * 1000)
      }
    });

  return {
    rtmpToken: mintIngestToken(secret, { sub: input.ingestPath, scope: 'publish', jti }, nowSeconds),
    ingestPath: input.ingestPath
  };
}

export type IngestAuthDecision =
  | { allowed: true; scope: 'publish'; roomId: number; userId: number }
  | { allowed: true; scope: 'read'; roomKey: string }
  | {
      allowed: false;
      reason: 'no-token' | 'bad-token' | 'expired' | 'revoked' | 'path-mismatch' | 'wrong-scope' | 'bad-path';
    };

/**
 * May this token publish to this path?
 *
 * Called once per publish attempt by the media server. The signature check is in memory and rejects
 * everything forged before a query is issued; only a token this application actually signed causes
 * a database read.
 *
 * The path comparison is EQUALITY between what the token was minted for and what the row still
 * says, and then against what is actually being published to. Three values, two comparisons, no
 * prefix matching — a path check by prefix is how `room__5__bob` ends up authorising
 * `room__5__bobby`.
 */
export async function decideIngestAuth(
  secret: string,
  presented: { token: string | null | undefined; path: string; action: string },
  nowSeconds: number = Math.floor(Date.now() / 1000)
): Promise<IngestAuthDecision> {
  if (!presented.token) return { allowed: false, reason: 'no-token' };

  const verified = verifyIngestToken(secret, presented.token, nowSeconds);
  if (!verified.ok) {
    return { allowed: false, reason: verified.reason === 'expired' ? 'expired' : 'bad-token' };
  }

  /*
    READ — playing the HLS playlist. Scoped to a ROOM, not to a path.

    A viewer must be able to watch every presenter in their room, and the playback path
    (`room__{sessionID}__{producerID}`, `app-streaming-view.full.js:113`) does not exist until
    somebody starts streaming, so a token pinned to one path could never be minted in advance.

    The room is compared by EQUALITY against the parsed second segment. `startsWith` here would let
    a token for room `ab` read room `abc`.
  */
  if (presented.action === 'read' || presented.action === 'playback') {
    if (verified.claims.scope !== 'read') return { allowed: false, reason: 'wrong-scope' };
    const roomKey = roomKeyOfPath(presented.path);
    if (!roomKey) return { allowed: false, reason: 'bad-path' };
    if (roomKey !== verified.claims.sub) return { allowed: false, reason: 'path-mismatch' };
    return { allowed: true, scope: 'read', roomKey };
  }

  /* PUBLISH from here down. A read token may not publish, however well-formed it is. */
  if (verified.claims.scope !== 'publish') return { allowed: false, reason: 'wrong-scope' };
  if (verified.claims.sub !== presented.path) return { allowed: false, reason: 'path-mismatch' };

  /*
    Captured into a local so the type is `string`, not `string | undefined`.

    `verifyIngestToken` already refuses a publish token without a `jti`, but that narrowing does not
    survive across the function boundary — and querying with `undefined` would build
    `ingest_key = NULL`, which matches nothing and would read as "revoked" rather than as the
    malformed token it is. The re-check is one line and removes the possibility entirely.
  */
  const jti = verified.claims.jti;
  if (!jti) return { allowed: false, reason: 'bad-token' };

  const [row] = await getDb()
    .select({
      roomId: streamIngestKeys.roomId,
      userId: streamIngestKeys.userId,
      ingestPath: streamIngestKeys.ingestPath
    })
    .from(streamIngestKeys)
    .where(and(eq(streamIngestKeys.ingestKey, jti), eq(streamIngestKeys.ingestPath, presented.path)))
    .limit(1);

  /*
    No row means the key was rotated or the room was deleted. Both are "revoked" — the presenter
    pressed New Link, or there is nothing left to publish into. Neither is distinguished in the
    answer, because the media server is not entitled to know which.
  */
  if (!row) return { allowed: false, reason: 'revoked' };

  return { allowed: true, scope: 'publish', roomId: row.roomId, userId: row.userId };
}

/**
 * Pull the token out of a MediaMTX authentication request.
 *
 * MediaMTX POSTs one JSON document for every protocol
 * (https://mediamtx.org/docs/usage/authentication), and the token lands in a different field
 * depending on how the encoder sent it:
 *
 *  - **WHIP / WebRTC** — an HTTP `Authorization: Bearer …`, which MediaMTX surfaces as `token`.
 *  - **RTMP** — there is no header, so the reference puts it in the URL as `?jwt=…`, and MediaMTX
 *    surfaces the query string verbatim as `query`.
 *
 * Both are read, and ONLY `jwt` is read out of the query. Accepting any query parameter that looked
 * token-shaped would mean the name in the reference's URL was decorative.
 */
export function tokenFromAuthRequest(body: { token?: unknown; query?: unknown }): string | null {
  if (typeof body.token === 'string' && body.token) return body.token;

  if (typeof body.query === 'string' && body.query) {
    const jwt = new URLSearchParams(body.query).get('jwt');
    if (jwt) return jwt;
  }

  return null;
}
