# Badge authority cutover

This runbook moves account badge definitions and room-member badge assignments from the controller
PostgreSQL projection to canonical Rust/PostgreSQL authority. `BADGE_AUTHORITY_MODE=legacy` is the
safe default. `rust` is valid only after membership authority is active and proven.

## Preconditions

1. Publish one immutable API artifact containing migration `0018`, the matching OpenAPI document,
   generated controller client, and PostgreSQL release attestation. Apply migrations as the database
   owner. The long-running API must use the distinct forced-RLS runtime role.
2. Apply controller migration `0022`. Complete profile, room, room-settings, and membership
   conversion under one stable source label. Every account, room, badge, and membership in the
   cohort must be represented; conversion refuses partial prerequisites, unexplained target
   assignments, cross-account references, invalid images/colors/roles, and partial projection proof.
3. Deploy both services with `BADGE_AUTHORITY_MODE=legacy`. Keep the already-proven
   `TRADINGROOM_API_URL` and independent `TRADINGROOM_INTERNAL_SECRET`; do not rotate another slice's
   credential while changing badge authority.
4. Set owner-scoped `CUTOVER_SOURCE_DATABASE_URL`, `CUTOVER_TARGET_DATABASE_URL`, and the same 8–128
   character `CUTOVER_SOURCE_LABEL` used by prerequisite conversions. Retain the secret-free output:

   ```sh
   node apps/controller/scripts/cutover-badge-authority.mjs plan
   node apps/controller/scripts/cutover-badge-authority.mjs apply
   node apps/controller/scripts/cutover-badge-authority.mjs verify
   ```

   Target definitions, dark-theme links, assignments, and owner-only mappings commit atomically.
   Source UUID/revision/content proofs commit afterward, making the only cross-database window
   explicit and resumable. Apply never adopts target rows or assignments without the exact ledger.

5. Confirm every local badge has a non-null canonical UUID, revision `0`, a 64-character content
   hash, and a reconciliation timestamp. Confirm every reconciled membership content hash includes
   its canonical assignment UUIDs. Independent `verify` must reproduce exact counts and digests.

## Activate and prove

1. Change only `BADGE_AUTHORITY_MODE` to `rust` and redeploy the controller. Startup must refuse the
   switch unless membership authority is `rust` and the private API URL is present.
2. Load the account badge editor. Verify text-only, image-only, transparent-background, emoji,
   role-auto-assignment, and forward dark-theme references. Export badges and compare every field
   owned by the captured interchange contract.
3. Create, edit, assign a dark-theme variant, and delete a badge. Repeat each exact browser request
   id after an intentionally interrupted response. Accept only one revision change and one audit;
   reusing the id with a different payload must return conflict.
4. In room management, set and remove one badge, apply to multiple selected members, clear all
   selected assignments, and exercise all-rooms scope. Reads must return normalized canonical
   assignments and the controller projection must translate every UUID to an account-owned local id.
5. Repeat reads and writes as a normal member and an administrator from another enterprise. Unknown
   or cross-tenant badge/member/room ids must remain opaque. Delete a dark-theme target and confirm
   referencing definitions advance once with the link cleared; delete an assigned badge and confirm
   referential cleanup plus member revision/projection convergence.
6. Restart both services and repeat one list, mutation retry, account reload, room-management reload,
   and connected-room login. Accept activation only when revisions/content hashes remain monotonic
   and no legacy write can reverse canonical state.

## Observe

Alert on badge-authority and badge-projection failures; 401/403/404/409/5xx rates on the five badge
operations; stale/equal-revision content mismatch; source/ledger disagreement; request-id payload
reuse; cross-tenant relation refusal; and migration/OpenAPI/client/provenance/attestation mismatch.
Logs may contain request ids, canonical ids, counts, revisions, and reason codes—not images, labels,
membership notes, bearer values, cookies, credentials, or response bodies.

## Request-path rollback

Set `BADGE_AUTHORITY_MODE=legacy` and redeploy the controller. Do not reverse migration `0018`, clear
mutation/audit ledgers, delete mappings, or rotate credentials during an incident. Preserve both
stores, run converter `verify`, repair the named disagreement, and reactivate only after deployed
read/write/retry/reconnect evidence is green.

## Abandoning an unused conversion

The offline rollback command is not the incident switch. Drain canonical badge traffic and roll back
all later authority slices first. It is allowed only while imported badges and affected memberships
remain at revision zero and no mutation, message snapshot, or external dark-theme reference uses
them. It clears source badge proof and restores empty membership hashes first, then removes only
ledger-owned assignments, definitions, and mappings. Repeated rollback converges:

```sh
node apps/controller/scripts/cutover-badge-authority.mjs rollback
```

Membership rollback follows badge rollback; room-settings, room, and profile rollback follow in
that order.
