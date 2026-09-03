# Profile authority cutover

This is the reversible Gate 3 runbook for moving authenticated profile reads and writes from the
controller database to the Rust/PostgreSQL authority. `PROFILE_AUTHORITY_MODE=legacy` is the safe
default. `rust` never guesses an identity: the controller session's `authority_user_id` and
`authority_enterprise_id` must both match the canonical bootstrap response.

## Preconditions

1. Publish and deploy an immutable Rust API artifact containing migration
   `0013_profile_write_privilege.sql` and the OpenAPI snapshot from the same revision.
2. Run the migrator with the owner credential. Run `postgres-release-attestation` with separate
   owner and runtime credentials; retain its secret-free output with the release evidence.
3. Run the controller converter in `plan`, `apply`, then independent `verify` mode. A source digest
   change, target digest change, ambiguous owner, or pre-existing unproven target is a hard stop.
4. Confirm every active controller owner in the rollout cohort has non-null, unique
   `authority_user_id` and `authority_enterprise_id` values. Never backfill either id by email at
   request time.
5. Set a private HTTPS `TRADINGROOM_API_URL`. The browser must not call that origin directly.

## Activate

1. Deploy the controller with `PROFILE_AUTHORITY_MODE=legacy` and the new code first.
2. Verify legacy login, account load, and logout. This proves the release itself before changing
   authority.
3. Change only `PROFILE_AUTHORITY_MODE` to `rust` and redeploy.
4. Sign in through the public controller form. The form must mint both the controller session and
   the reviewed Rust `__Host-` cookie pair; a UUID or membership mismatch must return 503 and leave
   neither session active.
5. Open `/account`, change the display name and chat text size, save, then reload in a new request.
   The returned name and preference must match the committed Rust row. Confirm another user's row
   is unchanged.
6. Log out and confirm the controller session row is deleted and both Rust cookies are expired. An
   API outage may be logged, but it must not prevent browser and controller-session revocation.

## Observe

Alert on `profile-authority` log events, Rust 401/403/5xx rates, refresh failures, and controller
503s. Do not treat a zero-error sample as proof until at least one real read, write, reload, refresh,
and logout has completed through the same deployed revision.

## Roll back

Set `PROFILE_AUTHORITY_MODE=legacy` and redeploy the controller. Do not reverse migration `0013`,
delete canonical identities, or clear mapping columns during an incident. The column grant is inert
without a Rust handler call, and preserving the target plus the conversion ledger keeps rollback
recoverable. Diagnose and reconcile, run independent converter `verify`, then retry activation.

The converter's destructive `rollback` command is for an explicitly abandoned, owner-verified
conversion run—not for request-path rollback. It deletes only rows proven by that run's target
ledger and clears the corresponding source mappings.
