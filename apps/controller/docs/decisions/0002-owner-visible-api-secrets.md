# 0002 — Persist owner-visible API secrets encrypted at rest

- Status: accepted
- Date: 2026-08-02
- Affects: API-key storage, authenticated account load, SSOT section 7

## Context

The original first-party `page.welcome.html` renders `k.apiSecret` directly in
every populated API-key row. Its versioned controller calls `listApiKeys()` after
both creation and rotation, proving the complete value is expected in the
refreshed table rather than only in a separate reveal-once message.

The rebuild initially stored only a SHA-256 hash and final four characters. That
made a credential unusable after navigation or reload and contradicted the
evidence-backed product behavior. A copy button would make the value usable but
would invent a control absent from the source.

## Decision

Keep the SHA-256 value for credential verification and store a separate,
versioned AES-256-GCM envelope for authenticated owner display. Derive the
encryption key from `API_KEY_ENCRYPTION_KEY`, falling back to the existing
`ROOM_JWT_SECRET` for local compatibility, with domain separation. Authenticate
the account id and API-key id as associated data.

Only the account-scoped server load decrypts the value. It never serializes the
hash or ciphertext and marks the response `Cache-Control: private, no-store`.
Creation and rotation return only the key id. Existing hash-only credentials
cannot be recovered; their existing `regen secret` action creates a new encrypted
secret.

The presentation layer MUST NOT turn an unrecoverable hash-only row into a
partially masked credential. It renders an explicit unavailable state until the
owner invokes regeneration. Regeneration remains explicit because silently
rotating a credential can break an active integration.

This is a narrow exception to SSOT section 7's general prohibition on secrets in
load data: the credential is customer-owned data whose explicit product function
is delivery to its authenticated account owner. Infrastructure credentials,
session material, passwords, and other raw tokens remain prohibited.

## Consequences

- The authenticated table matches the original full-secret behavior after reload.
- Database disclosure alone does not reveal API secrets without the environment
  master key.
- Losing or rotating the master without migration makes stored display copies
  unrecoverable; credential hashes remain valid, and users can regenerate them.
- XSS in the authenticated account origin could still read displayed credentials;
  existing output escaping, authentication, tenant scoping, and no-store caching
  are required controls.

## Verification

- Crypto tests cover round-trip, random nonces, tenant/key binding, tampering,
  and the wrong master key.
- Browser behavior verifies the same complete 64-character value before and after
  a document reload and removes the fixture afterward.
- The schema and bootstrap DDL both contain the additive nullable column.
- `pnpm quality` and `pnpm account:forensics` are required to pass.
