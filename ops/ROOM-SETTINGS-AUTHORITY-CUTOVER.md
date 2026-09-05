# Room-settings authority cutover

This is the reversible Gate 3 runbook for moving the complete per-room settings document from the
controller database to Rust/PostgreSQL authority. `ROOM_SETTINGS_AUTHORITY_MODE=legacy` is the safe
default. `rust` is valid only after both `PROFILE_AUTHORITY_MODE=rust` and
`ROOM_AUTHORITY_MODE=rust`, because every settings request must bind an authenticated canonical
administrator to an already reconciled canonical room.

## Preconditions

1. Publish one immutable API artifact containing migration `0016`, its matching OpenAPI snapshot,
   and the generated 269-setting manifest from the same revision. Apply the full migration chain as
   database owner and retain a passing PostgreSQL release attestation using distinct owner/runtime
   credentials.
2. Complete and verify profile and room conversion first. Every source account and room in the
   cohort must have non-null reconciled authority UUIDs. Do not infer mappings during a request.
3. Set owner-scoped `CUTOVER_SOURCE_DATABASE_URL` and `CUTOVER_TARGET_DATABASE_URL`, plus a stable,
   deployment-specific `CUTOVER_SOURCE_LABEL` containing 8–128 characters. Never reuse a label for
   a different source database.
4. Run and retain the converter's secret-free counts and digests:

   ```sh
   node apps/controller/scripts/cutover-room-settings-authority.mjs plan
   node apps/controller/scripts/cutover-room-settings-authority.mjs apply
   node apps/controller/scripts/cutover-room-settings-authority.mjs verify
   ```

   Stop on any disagreement. `apply` commits canonical settings plus the owner-only mapping ledger
   before it records revision zero in the controller projection. Rerunning repairs that bounded
   cross-database window. It refuses unknown keys, wrong scalar types, title disagreement, an
   unowned target document, and source or target drift; it never overwrites drift.
5. Confirm every source settings row has `authority_revision = 0` and non-null
   `authority_reconciled_at`. Independent `verify` must report the exact source count/digest.

## Activate

1. Deploy with profile and room authority in `rust`, settings authority in `legacy`, and the new API
   and controller code. Verify profile, room list/create/archive, and legacy settings before moving
   the final switch.
2. Change only `ROOM_SETTINGS_AUTHORITY_MODE` to `rust` and redeploy the controller.
3. Load every manage-page tab for a representative room. The complete document and revision must
   reconcile locally without changing values. An absent mapping or malformed authority response
   must show an explicit unavailable state, never silently read the legacy document.
4. Change one string, number, boolean, and deletion-capable setting. Reload in a new request and
   confirm the canonical value, local projection revision, and one redacted
   `room.settings.updated` audit entry containing setting names but not values.
5. Submit simultaneous changes from two browser sessions. Different fields must merge; the same
   field must return 409 and preserve the winner. Retry one identical request id after an uncertain
   response and confirm one revision and one audit event.
6. Clone a room and retry the submitted clone request id. Exactly one canonical room must exist and
   its settings copy must converge once; an intervening target edit must be refused, not replaced.
7. Repeat read/write attempts as a non-admin and an administrator of another enterprise. Both must
   be indistinguishable from a missing resource.

## Observe

Alert on controller `room-settings-authority` failures; Rust 401/404/409/5xx rates; settings
projection revision regression/content mismatch; request-id payload mismatch; and any migration or
release-attestation disagreement. Activation is accepted only after read, mutation, stale-write
merge/conflict, clone/retry, access refresh, cross-tenant refusal, logout, and a fresh-process reload
all pass on the same deployed revision.

## Request-path rollback

Set `ROOM_SETTINGS_AUTHORITY_MODE=legacy` and redeploy. Do not reverse migration `0016`, delete the
append-only request ledger, or clear conversion mappings during an incident. Preserve both stores,
run converter `verify`, repair the named disagreement, and reactivate only after an independent
digest is clean.

## Abandoning an unused conversion

The converter's `rollback` command is not the incident switch. Drain canonical settings traffic
first. It is allowed only while every canonical settings revision is still zero and every imported
document is exact. It clears source proof before removing only the owned target document and mapping,
so a stopped process resumes safely; repeated completed rollback converges. After operator review:

```sh
node apps/controller/scripts/cutover-room-settings-authority.mjs rollback
```

Room rollback must follow settings rollback. Profile rollback remains last.
