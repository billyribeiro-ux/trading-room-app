# Customer API-key authority cutover

This runbook moves account API-key management from controller-local rows to canonical
Rust/PostgreSQL verifier authority. `CUSTOMER_API_KEY_AUTHORITY_MODE=legacy` is the safe default.
The Rust database never stores a plaintext or recoverable customer secret.

## Preconditions

1. Publish one immutable API artifact containing migrations `0020` and `0021`, the matching OpenAPI document,
   generated controller client, and PostgreSQL release attestation. Apply migrations as the
   database owner; the API continues to connect as the separate forced-RLS runtime role.
2. Apply controller migration `0024`. Complete and independently verify profile and administrator
   conversion under one stable source label. Deploy both services with
   `CUSTOMER_API_KEY_AUTHORITY_MODE=legacy`.
3. Configure an independent, high-entropy `API_KEY_ENCRYPTION_KEY` on the controller. It must be
   stable across instances and deployments and must not equal a session, room-JWT, database, or
   internal-service secret. Canonical creation and rotation derive exactly-once credentials from
   this key; losing or changing it invalidates recovery of the owner-visible projection.
4. Before conversion, rotate or delete every legacy hash-only key. The converter refuses a missing,
   malformed, or oversized `v1` encrypted envelope because the account page contract cannot display
   a credential that is not recoverable. Resolve malformed IPs, unknown commands, unowned room
   restrictions, duplicate key ids, partial proof columns, and target collisions.
5. Set owner-scoped `CUTOVER_SOURCE_DATABASE_URL`, `CUTOVER_TARGET_DATABASE_URL`, and the same
   8–128-character `CUTOVER_SOURCE_LABEL` used for profile conversion. Retain only the command's
   secret-free output:

   ```sh
   node apps/controller/scripts/cutover-customer-api-key-authority.mjs plan
   node apps/controller/scripts/cutover-customer-api-key-authority.mjs apply
   node apps/controller/scripts/cutover-customer-api-key-authority.mjs verify
   ```

   The target commit contains enterprise, existing 24-hex key id, revision zero, SHA-256 verifier,
   last-four display metadata, normalized restrictions, timestamps, and an owner-only opaque UUID
   mapping. It never contains plaintext or ciphertext. Controller proof commits second; retry after
   that boundary reuses the exact ledger-owned row.

6. Confirm every source key retains its original encrypted envelope and has canonical revision `0`,
   a 64-character content hash, and a reconciliation timestamp. Independent `verify` must reproduce
   exact counts and digests without printing key ids, hashes, ciphertext, URLs, or the source label.

## Activate and prove

1. Change only `CUSTOMER_API_KEY_AUTHORITY_MODE` to `rust` and redeploy the controller. Startup must
   refuse the switch unless profile and administrator modes are `rust`, `TRADINGROOM_API_URL` is
   present, and `API_KEY_ENCRYPTION_KEY` is configured.
2. As the account owner, list keys and create one. Repeat the exact request id after an interrupted
   response: one canonical row, mutation record, projection, and audit event must exist. Reuse that
   id with different input and require a conflict.
3. Rotate, restrict, and delete by exact expected revision. Prove the old secret stops matching,
   restrictions are deduplicated and sorted, an unowned room is rejected, stale revision conflicts,
   and an unknown or cross-tenant key remains opaque.
4. Exercise malformed ids, hashes, last-four values, CIDRs, unknown scopes, excessive arrays,
   over-posted fields, member/guest actors, impersonation, absent mappings, API unavailability, and
   equal-revision content disagreement. Every path must fail closed without a controller-only write.
5. Restart both services and repeat list, uncertain create/rotate retry, restriction, deletion, and
   projection repair. Accept activation only when revisions/content hashes stay monotonic and no
   secret, verifier, cookie, URL, or response body appears in logs.
6. Exercise all eleven captured `/stats/v1/sessions/*` commands with a newly created key. Prove
   query authentication, one-request-per-second per key/command limits, IP/scope/session
   restrictions, exact legacy response casing, a real duration-bearing recording, bounded result
   sets, cross-tenant opacity, and monotonic `last_used_at` under concurrent distinct commands.
   Confirm HTTP tracing records only the path: the compatibility query contains the key and secret
   and must never be written to logs.

## Observe

Alert on authority/projection failures; 401/403/404/409/5xx rates on every management operation;
request-id reuse; stale/equal-revision disagreement; source/ledger disagreement; and
migration/OpenAPI/client/provenance/attestation mismatch. Logs may contain request ids, counts,
revisions, and stable reason codes—not customer key ids, secrets, hashes, ciphertext, cookies,
bearer values, response bodies, database URLs, or source labels.

## Request-path rollback

Set `CUSTOMER_API_KEY_AUTHORITY_MODE=legacy` and redeploy. Disable or route away the external stats
origin before retiring canonical key consumption. Do not reverse migrations `0020`/`0021`, clear
audit/mutation ledgers, delete mappings, or rotate credentials during an incident. Preserve both
stores, run converter `verify`, repair the named disagreement, and reactivate only after deployed
read/write/retry/projection evidence is green.

## Abandoning an unused conversion

The offline rollback command is not the incident switch. Drain canonical traffic and roll back room
launch and external key-consumption slices first. Rollback is allowed only while every imported key
is revision zero with byte-identical verifier metadata, restrictions, timestamps, no canonical
mutation, and no recorded use. It clears controller proof first, deletes only ledger-owned target
rows second, leaves local ciphertext untouched, and converges when repeated:

```sh
node apps/controller/scripts/cutover-customer-api-key-authority.mjs rollback
```

Administrator rollback follows customer API-key rollback; profile rollback follows both.
