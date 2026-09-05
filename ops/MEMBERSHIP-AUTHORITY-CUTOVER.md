# Membership authority cutover

This runbook moves room membership and its live access decisions from the controller PostgreSQL
projection to canonical Rust/PostgreSQL authority. `MEMBERSHIP_AUTHORITY_MODE=legacy` is the safe
default. `rust` is valid only after profile, room, and room-settings authority are all `rust`.

## Preconditions

1. Publish one immutable API artifact containing migration `0017`, the matching OpenAPI document,
   and its generated controller client. Apply migrations as the database owner and retain a green
   PostgreSQL release attestation using a distinct restricted runtime identity.
2. Complete profile and room conversion for the exact source label. Every account, room, user, and
   local membership in the cohort must have a one-to-one prerequisite mapping; the membership
   converter refuses to infer or adopt an unowned target. Room-settings conversion and activation
   must also be complete before the request-path switch is enabled.
3. Generate one independent 32–256 character printable-ASCII `TRADINGROOM_INTERNAL_SECRET`. Install
   the exact value in the controller and API secret stores. Do not reuse the room JWT, token signing,
   database, encryption, or media key. Deploy both services with membership mode still `legacy`.
4. Set owner-scoped `CUTOVER_SOURCE_DATABASE_URL`, `CUTOVER_TARGET_DATABASE_URL`, and the same stable
   8–128 character `CUTOVER_SOURCE_LABEL` used by the prerequisite conversions. Retain the
   secret-free output of:

   ```sh
   node apps/controller/scripts/cutover-membership-authority.mjs plan
   node apps/controller/scripts/cutover-membership-authority.mjs apply
   node apps/controller/scripts/cutover-membership-authority.mjs verify
   ```

   `apply` adopts only the room converter's proven owner row, creates other memberships, and commits
   the owner-only target ledger before recording revision-zero projection proofs. A stopped process
   can resume that bounded cross-database window. Source drift, target drift, role/flag disagreement,
   missing owners, duplicate relations, and unowned canonical rows are hard refusals.

5. Confirm every local membership has a non-null authority UUID, revision `0`, a 64-character
   content hash, and reconciliation timestamp. Independent `verify` must reproduce the exact source
   and target counts/digests without printing email, name, note, password, or service-secret values.

## Activate and prove

1. Change only `MEMBERSHIP_AUTHORITY_MODE` to `rust` and redeploy the controller. Startup must fail
   if any dependency mode, API URL, or internal credential is absent or malformed.
2. As an account owner, load each room's full member list. Confirm identity adoption, owner,
   presenter/moderator/member roles, pending/paused/banned/muted access, permissions, trial and
   privacy flags, notes, archive/file/mobile flags, and last-seen values match the canonical response.
3. Exercise every single-row and bulk action, including all-rooms role/mute/ban/trial/remove,
   invitation retry, rename, password, approval, note, five permissions, access flags, and freshen
   login. Confirm one revision advance and one redacted audit event per changed canonical row.
4. From a connected room, exercise ban, indefinite mute, and the five permission toggles. The API
   must authenticate the controller credential, lock and reauthorize the acting owner/presenter,
   reject self/owner/cross-room/stale targets, commit once, then publish one addressed refresh only
   after the local projection succeeds. Retry the exact request id and confirm the response and
   audit count remain identical.
5. Repeat reads and writes as a normal member, a revoked presenter, and an administrator from
   another enterprise. The account surface must remain opaque; the service-authenticated room path
   must return only its reviewed 401/403/404/409 contract and never accept the credential as user
   authority.
6. Restart both processes and repeat one read, mutation, retry, logout, and room reconnect. Accept
   activation only when canonical revision/content proofs remain monotonic and no legacy write can
   reverse the result.

## Observe

Alert on membership-authority and membership-projection failures; internal-route 401/403/404/409/5xx
rates; stale/equal-revision content mismatch; source mapping disagreement; request-id payload reuse;
and any migration, OpenAPI, generated-client, provenance, or release-attestation mismatch. Logs may
contain request ids, canonical ids, counts, and reason codes—not bearer values, email, notes, password
material, or response bodies.

## Request-path rollback

Set `MEMBERSHIP_AUTHORITY_MODE=legacy` and redeploy the controller. Do not reverse migration `0017`,
delete mutation/audit ledgers, clear mappings, or rotate the internal credential during an incident.
Preserve both stores, run converter `verify`, repair the named disagreement, and reactivate only after
deployed read/write/reconnect evidence is green.

## Abandoning an unused conversion

The offline `rollback` command is not the incident switch. Drain canonical membership traffic and
roll back badges or later dependent authority slices first. It is allowed only while imported rows
remain at revision zero, badge arrays remain empty, and no canonical row has dependent activity. It
clears source proofs first, deletes only ledger-owned non-owner rows, and restores the room converter's
owner foundation. Repeated rollback converges:

```sh
node apps/controller/scripts/cutover-membership-authority.mjs rollback
```

Room-settings rollback follows membership rollback; room rollback follows settings; profile rollback
is last.
