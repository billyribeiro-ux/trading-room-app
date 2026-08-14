import { describe, expect, it } from 'vitest';
import {
  INGEST_TOKEN_TTL_SECONDS,
  READ_TOKEN_TTL_SECONDS,
  decideIngestAuth,
  ingestPathFor,
  mintIngestToken,
  mintRoomReadToken,
  roomKeyOfPath,
  tokenFromAuthRequest,
  verifyIngestToken
} from './stream-ingest';
import { configReadToken, signature } from './room-handoff';

const SECRET = 'test-secret-material-for-stream-ingest';
const NOW = 1_784_840_082;

describe('ingestPathFor', () => {
  /*
    The reference's own two steps, in its order (`main.d6d3c112b59b7d0d.js` byte 2157950):
      encodeURIComponent(name.replace(/[^a-zA-Z0-9_-]/g, '_'))
  */
  it('reproduces the reference sanitiser', () => {
    expect(ingestPathFor('7f3a', 'Dana')).toBe('room__7f3a__Dana');
    expect(ingestPathFor('7f3a', 'Dana Vero')).toBe('room__7f3a__Dana_Vero');
    expect(ingestPathFor('7f3a', 'Ann-Marie_2')).toBe('room__7f3a__Ann-Marie_2');
  });

  /*
    The reason the sanitiser exists. A display name is arbitrary user input, and MediaMTX addresses
    paths in a URL: a name carrying a slash or a dot-dot would otherwise reshape the path into
    something the token was not minted for.
  */
  it('collapses every character that could reshape a path', () => {
    expect(ingestPathFor('7f3a', 'a/../b')).toBe('room__7f3a__a____b');
    expect(ingestPathFor('7f3a', 'x?jwt=y')).toBe('room__7f3a__x_jwt_y');
    expect(ingestPathFor('7f3a', 'a b\nc')).toBe('room__7f3a__a_b_c');
    expect(ingestPathFor('7f3a', '../../etc/passwd')).toBe('room__7f3a________etc_passwd');
  });

  /*
    The separator is TWO underscores and the sanitiser emits single ones from unsafe characters, so
    a name cannot be crafted to look like the boundary between the room and the presenter. This is
    the property that keeps `ingestPathFor` injective per room.
  */
  it('keeps the double-underscore separator distinguishable', () => {
    expect(ingestPathFor('7f3a', 'a b')).toBe('room__7f3a__a_b');
    expect(ingestPathFor('7f3a', 'a  b')).toBe('room__7f3a__a__b');
    expect(ingestPathFor('7f3a', 'a  b')).not.toBe(ingestPathFor('7f3a', 'a b'));
  });
});

describe('ingest token', () => {
  it('round-trips the claims it was minted with', () => {
    const token = mintIngestToken(SECRET, { sub: 'room__7f3a__Dana', scope: 'publish', jti: 'abc123' }, NOW);
    const result = verifyIngestToken(SECRET, token, NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.claims.sub).toBe('room__7f3a__Dana');
    expect(result.claims.jti).toBe('abc123');
    expect(result.claims.iat).toBe(NOW);
    expect(result.claims.exp).toBe(NOW + INGEST_TOKEN_TTL_SECONDS);
  });

  it('is a three-part JWT, matching the `jwt=` the reference names in the RTMP URL', () => {
    const token = mintIngestToken(SECRET, { sub: 'room__7f3a__Dana', scope: 'publish', jti: 'abc123' }, NOW);
    expect(token.split('.')).toHaveLength(3);
    expect(JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'))).toEqual({
      alg: 'HS256',
      typ: 'JWT'
    });
  });

  it('refuses a token signed with a different secret', () => {
    const token = mintIngestToken('another-secret', { sub: 'room__7f3a__Dana', scope: 'publish', jti: 'abc123' }, NOW);
    expect(verifyIngestToken(SECRET, token, NOW)).toEqual({ ok: false, reason: 'bad-signature' });
  });

  it('refuses a token whose claims were edited after signing', () => {
    const token = mintIngestToken(SECRET, { sub: 'room__7f3a__Dana', scope: 'publish', jti: 'abc123' }, NOW);
    const [header, , signature] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'room__OTHER__Dana', jti: 'abc123', iat: NOW, exp: NOW + 60 }))
      .toString('base64url')
      .replace(/=+$/, '');

    expect(verifyIngestToken(SECRET, `${header}.${forged}.${signature}`, NOW)).toEqual({
      ok: false,
      reason: 'bad-signature'
    });
  });

  it('expires exactly at `exp`, not after it', () => {
    const token = mintIngestToken(SECRET, { sub: 'room__7f3a__Dana', scope: 'publish', jti: 'abc123' }, NOW);
    const expiry = NOW + INGEST_TOKEN_TTL_SECONDS;

    expect(verifyIngestToken(SECRET, token, expiry - 1).ok).toBe(true);
    expect(verifyIngestToken(SECRET, token, expiry)).toEqual({ ok: false, reason: 'expired' });
  });

  it('refuses malformed presentations rather than treating them as unrestricted', () => {
    expect(verifyIngestToken(SECRET, null, NOW)).toEqual({ ok: false, reason: 'malformed' });
    expect(verifyIngestToken(SECRET, '', NOW)).toEqual({ ok: false, reason: 'malformed' });
    expect(verifyIngestToken(SECRET, 'not-a-token', NOW)).toEqual({ ok: false, reason: 'malformed' });
    expect(verifyIngestToken(SECRET, 'a.b', NOW)).toEqual({ ok: false, reason: 'malformed' });
    expect(verifyIngestToken(SECRET, 'a..c', NOW)).toEqual({ ok: false, reason: 'malformed' });
  });

  /*
    Deny by default on every claim. A correctly signed token that carries no `sub` must FAIL, not
    be read as a token with no path restriction — that is the difference between an allow-list and
    an allow-list with a hole in it.
  */
  it('refuses a correctly signed token that is missing a claim', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      .toString('base64url')
      .replace(/=+$/, '');

    /*
      Signed with the REAL signer over the deficient body, so the refusal is attributable to the
      claim check and not to the signature check. Writing `'x'.repeat(43)` here instead would have
      produced a green test that proved only that a garbage signature is rejected — which the test
      above already proves.

      The `stream-ingest:` prefix is spelled out rather than imported, so this also pins the domain
      separator: changing it in the module without changing it here goes red.
    */
    const sign = (body: string) => signature(SECRET, `stream-ingest:${header}.${body}`);

    for (const claims of [
      { scope: 'publish', jti: 'abc123', iat: NOW, exp: NOW + 60 },
      { sub: 'room__7f3a__Dana', scope: 'publish', iat: NOW, exp: NOW + 60 },
      { sub: 'room__7f3a__Dana', scope: 'publish', jti: 'abc123', iat: NOW },
      { sub: '', scope: 'publish', jti: 'abc123', iat: NOW, exp: NOW + 60 },
      { sub: 'room__7f3a__Dana', scope: 'publish', jti: '', iat: NOW, exp: NOW + 60 },
      { sub: 'room__7f3a__Dana', scope: 'publish', jti: 'abc123', iat: NOW, exp: 'later' },
      /* No scope at all, and an invented one. Neither may be read as the weaker right. */
      { sub: 'room__7f3a__Dana', jti: 'abc123', iat: NOW, exp: NOW + 60 },
      { sub: 'room__7f3a__Dana', scope: 'admin', jti: 'abc123', iat: NOW, exp: NOW + 60 },
      { sub: 'room__7f3a__Dana', scope: '', jti: 'abc123', iat: NOW, exp: NOW + 60 }
    ]) {
      const body = Buffer.from(JSON.stringify(claims)).toString('base64url').replace(/=+$/, '');
      expect(verifyIngestToken(SECRET, `${header}.${body}.${sign(body)}`, NOW)).toEqual({
        ok: false,
        reason: 'malformed'
      });
    }
  });

  /* The control for the loop above: the same construction WITH every claim present must pass. */
  it('accepts the same construction once every claim is present', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      .toString('base64url')
      .replace(/=+$/, '');
    const body = Buffer.from(
      JSON.stringify({ sub: 'room__7f3a__Dana', scope: 'publish', jti: 'abc123', iat: NOW, exp: NOW + 60 })
    )
      .toString('base64url')
      .replace(/=+$/, '');

    expect(
      verifyIngestToken(SECRET, `${header}.${body}.${signature(SECRET, `stream-ingest:${header}.${body}`)}`, NOW).ok
    ).toBe(true);
  });

  /*
    Domain separation. `room-handoff` signs `config-read:…` with the SAME secret; if the prefix were
    dropped, a value minted for one purpose would verify for the other.
  */
  it('does not accept a config-read token', () => {
    expect(verifyIngestToken(SECRET, configReadToken(SECRET, '7f3a', NOW), NOW).ok).toBe(false);
  });
});

/**
 * The path parser behind read authorisation.
 *
 * A read token names a ROOM, not a path, because the playback path
 * (`room__{sessionID}__{producerID}`, `app-streaming-view.full.js:113`) does not exist until
 * somebody starts streaming. So the room has to be recovered FROM the path, and the way that is
 * done is the whole security of the read right.
 */
describe('roomKeyOfPath', () => {
  it('recovers the room from an ingest path and from a playback path', () => {
    expect(roomKeyOfPath('room__7f3a__Dana_Vero')).toBe('7f3a');
    expect(roomKeyOfPath('room__7f3a__producer-9')).toBe('7f3a');
  });

  /*
    `__reb` is appended to the WHOLE path when a stream is relayed from another server
    (`app-streaming-view.full.js:114-115`). The room is still the second segment.
  */
  it('is unaffected by the `__reb` relay suffix', () => {
    expect(roomKeyOfPath('room__7f3a__producer-9__reb')).toBe('7f3a');
  });

  it('refuses anything that is not one of our paths', () => {
    expect(roomKeyOfPath('')).toBeNull();
    expect(roomKeyOfPath('room__7f3a')).toBeNull();
    expect(roomKeyOfPath('other__7f3a__x')).toBeNull();
    expect(roomKeyOfPath('__7f3a__x')).toBeNull();
    expect(roomKeyOfPath('room____x')).toBeNull();
  });

  /*
    THE property. `startsWith` would make a token for `ab` valid for `abc`'s streams, because
    `room__abc__x` starts with `room__ab`. Parsing and comparing the segment cannot do that.
  */
  it('does not let one room prefix another', () => {
    expect(roomKeyOfPath('room__abc__x')).not.toBe('ab');
    expect(roomKeyOfPath('room__abc__x')).toBe('abc');
  });
});

describe('the read / publish scope split', () => {
  const ROOM = '7f3a';
  const PATH = 'room__7f3a__Dana';

  /*
    Read tokens are stateless, so these need no database — which is the point of `decideIngestAuth`
    refusing on the token before it ever queries.
  */
  it('lets a read token play any path in its own room', async () => {
    const token = mintRoomReadToken(SECRET, ROOM, NOW);
    await expect(
      decideIngestAuth(SECRET, { token, path: 'room__7f3a__producer-9', action: 'read' }, NOW)
    ).resolves.toEqual({ allowed: true, scope: 'read', roomKey: ROOM });
    await expect(
      decideIngestAuth(SECRET, { token, path: 'room__7f3a__producer-9__reb', action: 'read' }, NOW)
    ).resolves.toEqual({ allowed: true, scope: 'read', roomKey: ROOM });
  });

  it('refuses a read token for another room', async () => {
    const token = mintRoomReadToken(SECRET, ROOM, NOW);
    await expect(
      decideIngestAuth(SECRET, { token, path: 'room__other__producer-9', action: 'read' }, NOW)
    ).resolves.toEqual({ allowed: false, reason: 'path-mismatch' });
    /* And specifically not by prefix. */
    await expect(
      decideIngestAuth(SECRET, { token, path: 'room__7f3ab__producer-9', action: 'read' }, NOW)
    ).resolves.toEqual({ allowed: false, reason: 'path-mismatch' });
  });

  /* THE crossover. Neither right may be spent as the other. */
  it('refuses a read token presented for a publish', async () => {
    const token = mintRoomReadToken(SECRET, ROOM, NOW);
    await expect(decideIngestAuth(SECRET, { token, path: PATH, action: 'publish' }, NOW)).resolves.toEqual({
      allowed: false,
      reason: 'wrong-scope'
    });
  });

  it('refuses a publish token presented for a read', async () => {
    const token = mintIngestToken(SECRET, { sub: PATH, scope: 'publish', jti: 'abc123' }, NOW);
    await expect(decideIngestAuth(SECRET, { token, path: PATH, action: 'read' }, NOW)).resolves.toEqual({
      allowed: false,
      reason: 'wrong-scope'
    });
  });

  it('refuses a read token against a path that is not one of ours', async () => {
    const token = mintRoomReadToken(SECRET, ROOM, NOW);
    await expect(decideIngestAuth(SECRET, { token, path: 'all_others', action: 'read' }, NOW)).resolves.toEqual({
      allowed: false,
      reason: 'bad-path'
    });
  });

  it('expires the read token on its own, shorter clock', async () => {
    const token = mintRoomReadToken(SECRET, ROOM, NOW);
    expect(READ_TOKEN_TTL_SECONDS).toBeLessThan(INGEST_TOKEN_TTL_SECONDS);
    await expect(
      decideIngestAuth(SECRET, { token, path: PATH, action: 'read' }, NOW + READ_TOKEN_TTL_SECONDS)
    ).resolves.toEqual({ allowed: false, reason: 'expired' });
  });
});

describe('tokenFromAuthRequest', () => {
  /*
    MediaMTX puts the credential in a different field per protocol
    (https://mediamtx.org/docs/usage/authentication):
      WHIP/WebRTC -> an HTTP Bearer, surfaced as `token`
      RTMP        -> no header exists, so the reference puts it in the URL as `?jwt=…`, surfaced
                     verbatim as `query`
  */
  it('reads the WHIP Bearer out of `token`', () => {
    expect(tokenFromAuthRequest({ token: 'abc', query: '' })).toBe('abc');
  });

  it('reads the RTMP credential out of the `jwt` query parameter', () => {
    expect(tokenFromAuthRequest({ token: '', query: 'jwt=abc' })).toBe('abc');
    expect(tokenFromAuthRequest({ query: 'x=1&jwt=abc&y=2' })).toBe('abc');
  });

  /*
    ONLY `jwt`. The reference named that parameter, and accepting any token-shaped value would make
    the name decorative — which is how a second, undocumented way in gets added by accident.
  */
  it('ignores every other query parameter', () => {
    expect(tokenFromAuthRequest({ query: 'token=abc' })).toBeNull();
    expect(tokenFromAuthRequest({ query: 'key=abc&password=abc' })).toBeNull();
  });

  it('returns null when nothing was presented', () => {
    expect(tokenFromAuthRequest({})).toBeNull();
    expect(tokenFromAuthRequest({ token: '', query: '' })).toBeNull();
    expect(tokenFromAuthRequest({ token: 42, query: ['x'] })).toBeNull();
  });
});
