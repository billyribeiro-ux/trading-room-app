/**
 * Pins the TypeScript signer against the Rust verifier's golden vector.
 *
 * `services/media/src/grant.rs`'s `the_wire_format_is_pinned_byte_for_byte` (`:740-760`) holds a
 * literal token built from a fixed key and fixed claims. Ed25519 signing is deterministic - RFC 8032
 * derives the nonce from the key and the message - so the same key and the same claims must produce
 * the same string here, character for character. If they ever diverge, one of the two sides has
 * silently changed the wire.
 */

import { describe, expect, it, vi } from 'vitest';
import { createHmac, createPrivateKey } from 'node:crypto';

/**
 * The environment the DEFAULT source reads, supplied here instead of by the machine.
 *
 * The "default environment source" tests below call the entry points with no argument, which is the
 * point: they guard a real 503 where this module read `process.env`, which SvelteKit never fills
 * from `.env`. But they were only passing because the developer's own `.env` happened to hold a
 * signing key — in a clean checkout, which is what CI has, `loadSigningKey()` threw and two tests
 * failed. A test whose result depends on the machine it runs on is not evidence of anything.
 *
 * Mocking `$env/dynamic/private` fixes that AND sharpens the guarantee. If this module ever
 * regressed to reading `process.env`, the mock would not be consulted and these tests would fail
 * exactly as they did before — so the mock is what proves the source, rather than merely allowing
 * the test to run.
 *
 * `vi.hoisted` is required: `vi.mock` is lifted above the imports, so the PEM has to exist before
 * the factory runs.
 */
const mockedEnv = vi.hoisted(() => {
  // Same fixed seed as the golden vector below, wrapped in the RFC 8410 PKCS#8 prefix.
  const prefix = Buffer.from('302e020100300506032b657004220420', 'hex');
  const seed = Buffer.from(Array.from({ length: 32 }, (_, index) => index));
  const pem = Buffer.concat([prefix, seed]).toString('base64');
  return {
    MEDIA_GRANT_PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----\n${pem}\n-----END PRIVATE KEY-----\n`
  };
});
vi.mock('$env/dynamic/private', () => ({ env: mockedEnv }));
import {
  GRANT_TTL_SECONDS,
  GRANT_VERSION,
  GrantConfigError,
  MAX_GRANT_TTL_SECONDS,
  loadSigningKey,
  mediaIceServers,
  mediaRoleFor,
  mediaRoomIdFor,
  mediaSignallingUrl,
  mintGrant,
  TURN_CREDENTIAL_TTL_SECONDS,
  publicKeyBase64,
  signClaims,
  unixSeconds,
  type GrantClaims
} from './media-grant';

/**
 * `grant.rs`'s fixed test key: `SigningKey::from_bytes(&[0, 1, 2, ..., 31])` (`grant.rs:639-644`).
 *
 * Node has no "raw seed" import for Ed25519, so the seed is wrapped in the fixed 16-byte PKCS#8
 * prefix for an Ed25519 private key (RFC 8410 §7: SEQUENCE / version 0 / AlgorithmIdentifier
 * 1.3.101.112 / OCTET STRING wrapping a 32-byte OCTET STRING). The assertion on the public key
 * below is what proves the wrapping is right - if it were not, it would not be this keypair.
 */
const PKCS8_ED25519_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');
const TEST_SEED = Buffer.from(Array.from({ length: 32 }, (_, index) => index));

function testSigningKey() {
  return createPrivateKey({
    key: Buffer.concat([PKCS8_ED25519_PREFIX, TEST_SEED]),
    format: 'der',
    type: 'pkcs8'
  });
}

/** A second, unrelated keypair - `other_signing_key()`, `[9u8; 32]` (`grant.rs:647-649`). */
function otherSigningKey() {
  return createPrivateKey({
    key: Buffer.concat([PKCS8_ED25519_PREFIX, Buffer.alloc(32, 9)]),
    format: 'der',
    type: 'pkcs8'
  });
}

/** `NOW` (`grant.rs:676`) and the `grant()` fixture (`grant.rs:682-692`). */
const NOW = 1_753_920_000;
const GOLDEN_CLAIMS: GrantClaims = {
  v: 1,
  room: 'trading-floor',
  uid: 463,
  name: 'Billy Ribeiro',
  role: 'presenter',
  iat: NOW,
  exp: NOW + 60
};

/** Copied verbatim from `grant.rs:741-743`. */
const GOLDEN_PAYLOAD_JSON =
  '{"v":1,"room":"trading-floor","uid":463,"name":"Billy Ribeiro","role":"presenter","iat":1753920000,"exp":1753920060}';
const GOLDEN_TOKEN =
  'eyJ2IjoxLCJyb29tIjoidHJhZGluZy1mbG9vciIsInVpZCI6NDYzLCJuYW1lIjoiQmlsbHkgUmliZWlybyIsInJvbGUiOiJwcmVzZW50ZXIiLCJpYXQiOjE3NTM5MjAwMDAsImV4cCI6MTc1MzkyMDA2MH0.0cSxjRsx4zMT2IS4jLKSLkW0phFNCTbo9oR7CK4e9kWBs9PGi6e8epxtjLdUeKEGjEW5J4cts1uo6Qrk0XlSBQ';
const GOLDEN_PUBLIC_KEY = 'A6EHv/POEL4dcN0Y50vAmWfk1jCbpQ1fHdyGZBJVMbg=';

function privateKeyPem(key: ReturnType<typeof testSigningKey>) {
  return key.export({ format: 'pem', type: 'pkcs8' }).toString();
}

describe('the media grant wire format', () => {
  it('produces the exact token grant.rs pins', () => {
    expect(signClaims(testSigningKey(), GOLDEN_CLAIMS)).toBe(GOLDEN_TOKEN);
  });

  it('serialises the claims in the key order the Rust struct declares', () => {
    // `grant.rs:756-759` asserts the same equality from its side, so this is the other half of
    // the pair: if either field order changes, the docs lie and the golden token moves.
    const [payload] = GOLDEN_TOKEN.split('.');
    expect(Buffer.from(payload, 'base64url').toString('utf8')).toBe(GOLDEN_PAYLOAD_JSON);
  });

  it('derives the MEDIA_GRANT_PUBLIC_KEY value the SFU expects: raw 32 bytes, padded standard base64', () => {
    const encoded = publicKeyBase64(testSigningKey());
    expect(encoded).toBe(GOLDEN_PUBLIC_KEY);
    // `grant.rs:114-115`: 44 characters ending in `=`, not base64url, not DER/PEM.
    expect(encoded).toHaveLength(44);
    expect(encoded.endsWith('=')).toBe(true);
    expect(Buffer.from(encoded, 'base64')).toHaveLength(32);
  });

  it('emits base64url without padding, in exactly two dot-separated segments', () => {
    const token = signClaims(testSigningKey(), GOLDEN_CLAIMS);
    const segments = token.split('.');
    expect(segments).toHaveLength(2);
    // RFC 4648 §5 alphabet: `-` and `_`, never `+`, `/` or `=` (`grant.rs:43-48`).
    for (const segment of segments) {
      expect(segment).toMatch(/^[A-Za-z0-9_-]+$/);
    }
    // An Ed25519 signature is 64 bytes (`grant.rs`'s `SIGNATURE_LENGTH`).
    expect(Buffer.from(segments[1], 'base64url')).toHaveLength(64);
  });

  it('signs the encoded payload segment, not the raw JSON', () => {
    // The property that makes JSON canonicalisation a non-issue (`grant.rs:39-42`). If the signer
    // signed the JSON bytes instead, this signature would differ from the golden one - which the
    // first test already pins - so re-signing the same claims must be byte-identical and stable.
    expect(signClaims(testSigningKey(), GOLDEN_CLAIMS)).toBe(
      signClaims(testSigningKey(), { ...GOLDEN_CLAIMS })
    );
  });

  it('gives a different signature for a different key', () => {
    expect(signClaims(otherSigningKey(), GOLDEN_CLAIMS)).not.toBe(GOLDEN_TOKEN);
    // The payload segment is identical - only the signature moves.
    expect(signClaims(otherSigningKey(), GOLDEN_CLAIMS).split('.')[0]).toBe(
      GOLDEN_TOKEN.split('.')[0]
    );
  });

  it('changes the token when any single claim changes', () => {
    const key = testSigningKey();
    // The case that matters: a member must not be able to become a presenter.
    expect(signClaims(key, { ...GOLDEN_CLAIMS, role: 'member' })).not.toBe(GOLDEN_TOKEN);
    expect(signClaims(key, { ...GOLDEN_CLAIMS, uid: 464 })).not.toBe(GOLDEN_TOKEN);
    expect(signClaims(key, { ...GOLDEN_CLAIMS, room: 'other-room' })).not.toBe(GOLDEN_TOKEN);
  });
});

/** Admission fixtures, named so each call site says WHY it is a producer. */
const PRESENTER = { isPresenter: true, hasMic: false, hasCam: false, hasScreen: false };
const NOBODY = { isPresenter: false, hasMic: false, hasCam: false, hasScreen: false };

describe('minting a grant for a signed-in user', () => {
  const env = { MEDIA_GRANT_PRIVATE_KEY: privateKeyPem(testSigningKey()) } as NodeJS.ProcessEnv;

  /*
    Two halves, deliberately split.

    `GOLDEN_TOKEN` is copied verbatim from `grant.rs:741-743` and its room is `trading-floor` — a
    literal the Rust test chose. The signer can no longer produce it, because the room id is now
    DERIVED from the controller's short code rather than passed in; that was the whole point, since
    a caller-supplied room defaulted to one constant and put every room into a single SFU room.

    So the pinning is decomposed rather than dropped:
      - `signClaims` ↔ the Rust bytes stays exact, above.
      - `mintGrant` ↔ `signClaims` for the claims it derives, here.
    Together they still prove a minted grant is byte-identical to what Rust accepts.
  */
  it('mints, for a real room, exactly what signClaims produces for the same claims', () => {
    const minted = mintGrant(
      { id: 463, displayName: 'Billy Ribeiro' },
      {
        admission: PRESENTER,
        roomShortCode: '3625',
        now: new Date(NOW * 1000),
        ttlSeconds: 60,
        env
      }
    );

    expect(minted.room).toBe('tra-3625');
    expect(minted.grant).toBe(signClaims(testSigningKey(), { ...GOLDEN_CLAIMS, room: 'tra-3625' }));
    expect(minted.role).toBe('presenter');
    expect(minted.expiresAt).toBe(NOW + 60);
  });

  it('derives the room from the short code and refuses to mint without one', () => {
    // The bug this replaces: one constant meant two rooms shared an SFU room and could hear
    // each other. There is no default to fall back to any more.
    expect(mediaRoomIdFor('2702')).toBe('tra-2702');
    expect(() => mediaRoomIdFor('   ')).toThrow(/needs the room/);
  });

  it('writes iat and exp in SECONDS, not milliseconds', () => {
    // `grant.rs:78-81` names this the single most likely way a JavaScript signer gets it wrong.
    const now = new Date('2026-07-31T12:00:00.999Z');
    const minted = mintGrant(
      { id: 1, displayName: 'A' },
      { admission: NOBODY, roomShortCode: '3625', now, env }
    );
    const claims = JSON.parse(
      Buffer.from(minted.grant.split('.')[0], 'base64url').toString('utf8')
    ) as GrantClaims;

    expect(claims.iat).toBe(Math.floor(now.getTime() / 1000));
    expect(claims.iat).toBe(1785499200);
    // The millisecond value would be ~1.79e12 and land 50,000 years in the future.
    expect(claims.iat).toBeLessThan(now.getTime());
    expect(claims.exp - claims.iat).toBe(GRANT_TTL_SECONDS);
  });

  it('truncates rather than rounds the issue time', () => {
    // Math.floor, not Math.round: a grant must never claim to have been issued in the future,
    // which is `GrantError::NotYetValid` (`grant.rs`).
    const minted = mintGrant(
      { id: 1, displayName: 'A' },
      { admission: PRESENTER, roomShortCode: '3625', now: new Date(1_785_499_200_999), env }
    );
    const claims = JSON.parse(
      Buffer.from(minted.grant.split('.')[0], 'base64url').toString('utf8')
    ) as GrantClaims;
    expect(claims.iat).toBe(1_785_499_200);
  });

  it('emits exactly the seven claims the verifier accepts, and no others', () => {
    // The Rust payload is `#[serde(deny_unknown_fields)]` (`grant.rs:294`), so an extra claim is
    // a hard refusal at the first grant, not a silently ignored field.
    const minted = mintGrant(
      { id: 7, displayName: 'A' },
      { admission: NOBODY, roomShortCode: '3625', env }
    );
    const claims = JSON.parse(
      Buffer.from(minted.grant.split('.')[0], 'base64url').toString('utf8')
    );
    expect(Object.keys(claims)).toEqual(['v', 'room', 'uid', 'name', 'role', 'iat', 'exp']);
    expect(claims.v).toBe(GRANT_VERSION);
  });

  /*
    Replaces "maps the app roles the way auth.ts does".

    Media admission no longer reads `users.role` at all. It reads the controller's per-room
    permissions through the reference's own formula, transcribed at `joinsMediaAsProducer`:
    `isPresenter || hasCam || hasMic || hasScreen`.

    The old behaviour was wrong in both directions, and both directions are pinned below.
  */
  it('admits any ONE of the three media permissions, not just presenters', () => {
    expect(mediaRoleFor(PRESENTER)).toBe('presenter');
    expect(mediaRoleFor({ ...NOBODY, hasMic: true })).toBe('presenter');
    expect(mediaRoleFor({ ...NOBODY, hasCam: true })).toBe('presenter');
    expect(mediaRoleFor({ ...NOBODY, hasScreen: true })).toBe('presenter');
  });

  it('refuses a member with none of the three, however the room labels them', () => {
    expect(mediaRoleFor(NOBODY)).toBe('member');
    // A presenter with every media permission withheld is still a presenter: the reference's
    // disjunction starts with isPresenter. Pinned so the formula is not "simplified" later.
    expect(mediaRoleFor({ isPresenter: true })).toBe('presenter');
  });

  it('does not admit on hasAdminChat or canEditNotes', () => {
    // Those two gate chat and notes. Including them would let a chat moderator open a microphone,
    // and the reference's disjunction deliberately omits them.
    const chatModerator = { ...NOBODY, hasAdminChat: true, canEditNotes: true } as never;
    expect(mediaRoleFor(chatModerator)).toBe('member');
  });

  it('keeps the default TTL inside the verifier ceiling', () => {
    expect(GRANT_TTL_SECONDS).toBeLessThanOrEqual(MAX_GRANT_TTL_SECONDS);
    expect(GRANT_TTL_SECONDS).toBeGreaterThan(0);
  });

  it('refuses a TTL the verifier would reject rather than minting a doomed grant', () => {
    expect(() =>
      mintGrant(
        { id: 1, displayName: 'A' },
        { admission: PRESENTER, roomShortCode: '3625', ttlSeconds: 301, env }
      )
    ).toThrow(GrantConfigError);
    expect(() =>
      mintGrant(
        { id: 1, displayName: 'A' },
        { admission: PRESENTER, roomShortCode: '3625', ttlSeconds: 0, env }
      )
    ).toThrow(GrantConfigError);
  });

  it('fails loudly when the signing key is absent or not Ed25519', () => {
    expect(() =>
      mintGrant(
        { id: 1, displayName: 'A' },
        { admission: PRESENTER, roomShortCode: '3625', env: {} }
      )
    ).toThrow(/MEDIA_GRANT_PRIVATE_KEY is not set/);
    expect(() =>
      mintGrant(
        { id: 1, displayName: 'A' },
        {
          admission: PRESENTER,
          roomShortCode: '3625',
          env: { MEDIA_GRANT_PRIVATE_KEY: 'not a key' } as NodeJS.ProcessEnv
        }
      )
    ).toThrow(GrantConfigError);
  });

  it('accepts a PEM whose newlines arrived escaped, because systemd cannot carry real ones', () => {
    /*
      MEASURED ON THE DEPLOYED BOX, not assumed. The room runs under `trading-room-app.service`
      with `EnvironmentFile=/opt/trading-room-app/room/.env`, and systemd has no multi-line value
      syntax. Writing `KEY="a\nb"` there and reading it back with `printenv | od -c` shows the
      backslash and the `n` as two separate characters — so a PEM pasted that way reaches
      `createPrivateKey` on one line and is rejected as unreadable.

      Both forms therefore load, and produce the SAME key: the escaped one is the only form the
      deployment can actually supply, and the real one is what a local `.env` or a container secret
      gives. `fcm.ts:140` solves the identical problem the identical way.
    */
    const real = privateKeyPem(testSigningKey());
    const escaped = real.replace(/\n/g, '\\n');
    expect(escaped).not.toContain('\n');

    const fromEscaped = loadSigningKey({ MEDIA_GRANT_PRIVATE_KEY: escaped } as NodeJS.ProcessEnv);
    const fromReal = loadSigningKey({ MEDIA_GRANT_PRIVATE_KEY: real } as NodeJS.ProcessEnv);

    expect(fromEscaped.asymmetricKeyType).toBe('ed25519');
    // Same key material, so the same public half — which is what the SFU is configured with.
    expect(publicKeyBase64(fromEscaped)).toBe(publicKeyBase64(fromReal));
  });

  it('carries the display name verbatim, including non-ASCII', () => {
    // `name` is `users.display_name`, which is notNull in the schema. The payload is UTF-8 JSON
    // and the signature covers its base64url encoding, so a non-ASCII name round-trips.
    const minted = mintGrant(
      { id: 9, displayName: 'Zoë Ribeiro 中文' },
      { admission: PRESENTER, roomShortCode: '3625', env }
    );
    const claims = JSON.parse(
      Buffer.from(minted.grant.split('.')[0], 'base64url').toString('utf8')
    ) as GrantClaims;
    expect(claims.name).toBe('Zoë Ribeiro 中文');
  });
});

describe('the room id', () => {
  /*
    It used to default to a deployment constant, overridable by `MEDIA_ROOM_ID`, because the app
    had no room entity to derive one from — the module docs and `grant.rs:175-179` both said so.
    It does now: `sessions.room_short_code` records the room a session was handed into.

    That constant was never only a placeholder. The SFU groups peers by this string, so one value
    meant every room on the deployment shared a single SFU room and two unrelated rooms saw and
    heard each other.
  */
  it('is derived from the room, with no default to fall back to', () => {
    expect(mediaRoomIdFor('3625')).toBe('tra-3625');
    expect(mediaRoomIdFor('2702')).toBe('tra-2702');
    expect(mediaRoomIdFor(' 2702 ')).toBe('tra-2702');
    expect(() => mediaRoomIdFor('')).toThrow(GrantConfigError);
    expect(() => mediaRoomIdFor('   ')).toThrow(GrantConfigError);
  });

  it('is bounded the way the verifier bounds it', () => {
    // `MAX_ROOM_ID_BYTES` is 128 (`grant.rs:216`), measured in BYTES, not characters. The `tra-`
    // prefix is 4 of them, so the code itself may be at most 124.
    expect(() => mediaRoomIdFor('a'.repeat(125))).toThrow(GrantConfigError);
    expect(mediaRoomIdFor('a'.repeat(124))).toHaveLength(128);
    // 42 three-byte characters = 126 bytes, plus the 4-byte prefix, is over the limit despite
    // being only 46 characters.
    expect(() => mediaRoomIdFor('中'.repeat(42))).toThrow(GrantConfigError);
  });
});

describe('unixSeconds', () => {
  it('converts milliseconds to seconds', () => {
    expect(unixSeconds(new Date(1_753_920_000_000))).toBe(1_753_920_000);
    expect(unixSeconds(new Date(1_753_920_000_999))).toBe(1_753_920_000);
  });
});

describe('ICE servers', () => {
  const now = new Date(1_753_920_000_000); // unixSeconds -> 1_753_920_000
  const user = { id: 42 };

  it('offers nothing when no relay is configured', () => {
    // The correct local-development state: the media host is reachable directly, so there is no
    // relay to name. An empty list, not an invented default.
    expect(mediaIceServers(user, { now, env: {} as NodeJS.ProcessEnv })).toEqual([]);
  });

  it('mints the credential coturn verifies, from a secret that never leaves the server', () => {
    const [server] = mediaIceServers(user, {
      now,
      env: {
        MEDIA_TURN_URLS: 'turn:relay.example.com:3478?transport=udp, turns:relay.example.com:5349',
        MEDIA_TURN_SECRET: 'a-long-term-secret'
      } as NodeJS.ProcessEnv
    });

    // draft-uberti-behave-turn-rest-00: the username IS the expiry, so coturn keeps no state.
    expect(server.username).toBe(`${1_753_920_000 + TURN_CREDENTIAL_TTL_SECONDS}:42`);
    // base64( HMAC-SHA1(secret, username) ). Pinned as a literal because this is a wire format
    // shared with a server this repo does not build, so "whatever the code computes" asserts
    // nothing. The literal was produced by an independent implementation, not by this code:
    //
    //   printf '1753923600:42' | openssl dgst -sha1 -hmac 'a-long-term-secret' -binary | base64
    //   /BmlAs9/vfkiWSq3Vb5e3yB/8Sk=
    expect(server.credential).toBe('/BmlAs9/vfkiWSq3Vb5e3yB/8Sk=');
    expect(server.credential).toBe(
      createHmac('sha1', 'a-long-term-secret')
        .update(server.username as string)
        .digest('base64')
    );
    // Comma-separated and trimmed - one deployment normally offers UDP, TCP and TLS on one host.
    expect(server.urls).toEqual([
      'turn:relay.example.com:3478?transport=udp',
      'turns:relay.example.com:5349'
    ]);
    // The secret itself is never part of the response.
    expect(JSON.stringify(server)).not.toContain('a-long-term-secret');
  });

  it('keeps STUN even when TURN is not configured, and never mints a credential for it', () => {
    // STUN needs no credential, so a deployment may offer one without a relay secret.
    const servers = mediaIceServers(user, {
      now,
      env: { MEDIA_STUN_URLS: 'stun:stun.example.com:3478' } as NodeJS.ProcessEnv
    });
    expect(servers).toEqual([{ urls: ['stun:stun.example.com:3478'] }]);
  });

  it('refuses to hand out a credential when the secret is missing', () => {
    // URLs without a secret cannot produce a usable credential. Emitting the TURN entry anyway
    // would make every viewer behind symmetric NAT fail authentication against the relay instead
    // of falling back to host candidates.
    expect(
      mediaIceServers(user, {
        now,
        env: { MEDIA_TURN_URLS: 'turn:relay.example.com:3478' } as NodeJS.ProcessEnv
      })
    ).toEqual([]);
  });

  it('outlives the admission grant, because it is presented for the whole call', () => {
    // The grant is checked once at the handshake; a TURN credential is re-presented on every ICE
    // restart. A 60-second one would strand a viewer mid-session.
    expect(TURN_CREDENTIAL_TTL_SECONDS).toBeGreaterThan(GRANT_TTL_SECONDS);
  });
});

/**
 * The regression test for a 503 that took the whole media path down.
 *
 * Every other test here injects `env` explicitly, so all of them passed while the **default**
 * source was wrong: the module read `process.env`, and SvelteKit never copies `.env` into it -
 * it loads the file with Vite's `loadEnv` and exposes the result only through `$env/*`
 * (`@sveltejs/kit/src/exports/vite/dev/index.js:443`). Under `vite dev` the key was therefore
 * always `undefined`, `mintGrant` threw `GrantConfigError`, and `/api/media/grant` answered 503
 * with no way for the room to reach mediasoup.
 *
 * This calls the entry points with **no argument**, which is what the route does, so the
 * default is exercised rather than assumed.
 */
describe('the default environment source', () => {
  it('resolves the signing key the way the route does', () => {
    // No `env` argument: this is exactly `loadSigningKey()` as `mintGrant` calls it.
    const key = loadSigningKey();
    expect(key.asymmetricKeyType).toBe('ed25519');
  });

  it('mints a grant with no env injected', () => {
    const minted = mintGrant(
      { id: 1, displayName: 'Ada' },
      { admission: PRESENTER, roomShortCode: '3625' }
    );
    // Two dot-separated base64url segments, which is the wire format the SFU parses.
    expect(minted.grant.split('.')).toHaveLength(2);
    expect(minted.role).toBe('presenter');
    expect(minted.expiresAt).toBeGreaterThan(unixSeconds(new Date()));
  });

  it('resolves the signalling url without an injected env', () => {
    /*
      The room id is no longer part of this test: it is derived from the caller's short code, not
      read from the environment, so there is nothing here for a default env source to resolve.
      `mediaRoomIdFor` is covered on its own above.
    */
    expect(mediaSignallingUrl()).toMatch(/^wss?:\/\//);
  });
});
