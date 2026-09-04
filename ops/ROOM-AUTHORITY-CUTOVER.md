# Room lifecycle authority cutover

This is the reversible Gate 3 runbook for moving account room list, create, and archive operations
from the controller database to Rust/PostgreSQL authority. `ROOM_AUTHORITY_MODE=legacy` is the safe
default. `rust` is valid only while `PROFILE_AUTHORITY_MODE=rust`: a room owner must already be
bound to the exact canonical user and enterprise before the controller can address canonical rooms.

## Preconditions

1. Publish one immutable Rust API artifact containing migrations `0011` through `0015` and the
   OpenAPI snapshot from the same revision. Apply the migration chain as the database owner and
   retain a passing `postgres-release-attestation` from separate owner and runtime credentials.
2. Complete and independently verify the profile conversion first. Every controller account and
   owner in the cohort must have non-null, reconciled `authority_enterprise_id` and
   `authority_user_id` mappings. Do not derive either mapping from email during a request.
3. Set `CUTOVER_SOURCE_DATABASE_URL`, owner-scoped `CUTOVER_TARGET_DATABASE_URL`, and a stable
   deployment-specific `CUTOVER_SOURCE_LABEL` of 8–128 characters. Never reuse the label for a
   different source database.
4. Run the converter in sequence, retaining its secret-free count and digest output:

   ```sh
   node apps/controller/scripts/cutover-room-authority.mjs plan
   node apps/controller/scripts/cutover-room-authority.mjs apply
   node apps/controller/scripts/cutover-room-authority.mjs verify
   ```

   Stop on any disagreement. `apply` commits canonical room/owner/state rows and the target ledger
   before source mappings; rerunning the same command repairs that deliberate cross-database window.
   It refuses an existing target without ledger ownership and never overwrites target drift.
5. Confirm every active source room now has a unique `authority_room_id` and non-null
   `authority_reconciled_at`, and that an independent `verify` reports identical source and target
   digests. Confirm the private `TRADINGROOM_API_URL` is reachable only from the controller tier.

## Activate

1. Deploy both services with `PROFILE_AUTHORITY_MODE=rust`, `ROOM_AUTHORITY_MODE=legacy`, and the new
   code. Verify canonical profile load/write plus legacy room list/create/archive before changing
   the room switch.
2. Change only `ROOM_AUTHORITY_MODE` to `rust` and redeploy the controller.
3. Open `/account` as an owner. The room list must match the independently verified target count and
   canonical names, states, capacities, archive times, and short codes. An unmapped local room or a
   canonical omission must return an explicit unavailable state, never a partial list.
4. Create one uniquely named room. Retrying the same submitted request id, including two simultaneous
   retries, must return the same canonical UUID and create only one audit event. Reload in a new
   request and confirm the room plus its temporary local settings/membership projection exists once.
5. Archive the room twice, then restore it twice. Repeated absolute state must preserve the first
   archive timestamp and emit no second audit; restore must clear the timestamp and emit one audit.
6. Repeat list and mutation attempts as a non-admin member and as an owner of another enterprise.
   Both cross-authority cases must be indistinguishable from a missing resource.

## Observe

Alert on `room-authority` controller events; Rust room create/archive audit failures; 401, 404, 409,
and 5xx rates; projection-repair refusals; and divergence between canonical and projected room
counts. A rollout sample is not accepted until list, idempotent create, archive, restore, reload,
access-token refresh, cross-tenant refusal, and logout all complete on the same deployed revision.

## Request-path rollback

Set `ROOM_AUTHORITY_MODE=legacy` and redeploy. Do not reverse migrations `0014`/`0015`, clear mappings, or
delete canonical rooms during an incident. The canonical columns and indexes are safe while idle;
preserving both stores and the ledger makes reconciliation possible. Run converter `verify`, repair
the named disagreement, and repeat activation only after the independent digest is clean.

## Abandoning an unused conversion

The converter's `rollback` command is not an incident switch. Drain canonical room traffic first.
It is allowed only for an explicitly abandoned conversion whose imported room graph is still
byte-identical and has no activity. It
dynamically inspects every foreign key referencing `rooms.id`; any audit, event, membership beyond
the original owner, state change, or later-slice mapping refuses deletion. It clears source mappings
before deleting target rows and safely resumes if execution stops between those commits. After
operator review:

```sh
node apps/controller/scripts/cutover-room-authority.mjs rollback
```

Profile rollback must follow room rollback. The profile converter refuses to delete an identity
while an active later-slice mapping still depends on it.
