# Account-administrator authority cutover

This runbook moves account-administrator identity, credentials, and authorization from the
controller's legacy `admin_users` projection to Rust/PostgreSQL. `ADMINISTRATOR_AUTHORITY_MODE=legacy`
is the safe default. Canonical mode is valid only after profile authority is active and proven.

## Preconditions

1. Publish one immutable API artifact containing migration `0019`, the matching OpenAPI document,
   generated controller client, and PostgreSQL release attestation. Apply migrations as the database
   owner; the API continues to connect as the separate forced-RLS runtime role.
2. Apply controller migration `0023`. Complete profile conversion under one stable source label.
   Reconcile duplicate administrator emails before proceeding: target identities are globally
   unique, so the converter refuses duplicates, pre-existing identities, non-admin memberships,
   missing enterprise mappings, partial projection proofs, and unexplained target administrators.
3. Deploy both services with `ADMINISTRATOR_AUTHORITY_MODE=legacy`. Do not rotate API or controller
   credentials while changing this authority boundary.
4. Set owner-scoped `CUTOVER_SOURCE_DATABASE_URL`, `CUTOVER_TARGET_DATABASE_URL`, and the same
   8–128-character `CUTOVER_SOURCE_LABEL` used for profile conversion. Retain only the secret-free
   command output:

   ```sh
   node apps/controller/scripts/cutover-account-administrator-authority.mjs plan
   node apps/controller/scripts/cutover-account-administrator-authority.mjs apply
   node apps/controller/scripts/cutover-account-administrator-authority.mjs verify
   ```

   Target identities, imported legacy scrypt credentials, admin memberships, and owner-only
   mappings commit atomically. Source UUID/revision/content proof commits second. A retry recovers
   the exact ledger-owned UUID; it never adopts by email or resets a credential already upgraded to
   Argon2.

5. Confirm every source row has canonical UUID, revision `0`, a 64-character content hash, and a
   reconciliation timestamp. Independent `verify` must reproduce exact counts and digests without
   printing an email, name, credential, connection string, or source label.

## Activate and prove

1. Change only `ADMINISTRATOR_AUTHORITY_MODE` to `rust` and redeploy the controller. Startup must
   refuse the switch unless profile authority is `rust` and `TRADINGROOM_API_URL` is present.
2. Sign in as the account owner, list administrators, create one with a unique address and a
   12-or-more-character password, then repeat the exact request id after an interrupted response.
   Accept one identity, membership, mutation record, and audit event. Reusing the request id with
   different input must conflict.
3. Sign in as the new administrator through the controller. This must authenticate against Rust
   first, transparently upgrade the imported scrypt envelope when applicable, bind exactly one
   canonical enterprise, and create only a passwordless controller compatibility identity.
4. Change or corrupt any stale local controller password hash and sign in again. Canonical success
   must not be vetoed by local credential state. Remove the administrator and verify its canonical
   refresh tokens and controller sessions are revoked in the same respective database
   transactions; every account endpoint must reject the now-absent membership.
5. Attempt owner removal, stale-revision removal, cross-tenant identifiers, duplicate email,
   over-posting, weak passwords, and member/guest access. Owners remain outside the administrator
   list/delete capability and unknown/cross-tenant identities remain opaque.
6. Restart both services and repeat list, retry, login, removal, and protected-route access. Accept
   activation only when revisions and content hashes remain monotonic and no legacy write can
   reverse canonical state.

## Observe

Alert on administrator-authority/projection/login failures; 401/403/404/409/5xx rates on list,
create, and delete; request-id payload reuse; stale/equal-revision disagreement; source/ledger
disagreement; and migration/OpenAPI/client/provenance/attestation mismatch. Logs may contain request
ids, canonical ids, counts, revisions, and stable reason codes—not names, emails, passwords, hashes,
cookies, bearer values, response bodies, URLs, or source labels.

## Request-path rollback

Set `ADMINISTRATOR_AUTHORITY_MODE=legacy` and redeploy. Do not reverse migration `0019`, clear audit
or mutation ledgers, delete mappings, or rotate credentials during an incident. Preserve both
stores, run converter `verify`, repair the named disagreement, and reactivate only after deployed
login/read/write/retry/revocation evidence is green.

## Abandoning an unused conversion

The offline rollback command is not the incident switch. Drain canonical traffic and roll back all
later authority slices first. Rollback is allowed only while every imported administrator remains
revision zero with its original scrypt credential and has no login, refresh token, room membership,
or audit activity. It clears controller proof first, then deletes only ledger-owned admin
memberships and identities. Repeated rollback converges:

```sh
node apps/controller/scripts/cutover-account-administrator-authority.mjs rollback
```

Profile rollback follows administrator rollback. Any later customer-key or launch slice must be
rolled back before this one.
