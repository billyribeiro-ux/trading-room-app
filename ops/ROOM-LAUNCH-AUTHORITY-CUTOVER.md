# Room launch authority cutover

This is the final Gate 3 request-path switch. `ROOM_LAUNCH_AUTHORITY_MODE=legacy` keeps the existing
controller visit projection active; `rust` makes PostgreSQL the sole entry/visit authority for both
authenticated account members and controller-authorized public guests.

## Preconditions

1. Publish one immutable Rust artifact containing migration `0021`, the launch OpenAPI operation,
   generated controller transport, internal guest-entry/visit-close routes, and the matching
   PostgreSQL attestor/provenance seals. Apply migrations as the database owner; run the API only as
   the restricted `tradingroom_app` role.
2. Complete and independently verify every preceding Gate 3 converter. Profile, room, settings,
   membership, badge, administrator, and customer API-key modes must already be `rust`. Every local
   account/user/room/member used by launch must have a reconciled canonical UUID.
3. Configure `TRADINGROOM_API_URL`, the same independent 32+ character
   `TRADINGROOM_INTERNAL_SECRET` on controller and API, a separate `ROOM_BASE_URL`, and an
   independent 32+ character `ROOM_JWT_SECRET` shared only by controller and room. Never reuse a
   database, cookie, API-key-encryption, or media credential.
4. Deploy controller, room, and Rust API with `ROOM_LAUNCH_AUTHORITY_MODE=legacy`. Confirm account
   and manage pages link only to same-origin `/launch/<shortCode>` and contain no JWT query value.

## Activate and prove

1. Change only `ROOM_LAUNCH_AUTHORITY_MODE` to `rust` and redeploy the controller. Startup must
   refuse a missing prerequisite, URL, service credential, room origin, or handoff secret.
2. Launch as an owner and account administrator. Confirm the Rust transaction locks current account
   authority, requires a current approved/non-paused/non-banned room membership, rejects archived
   rooms, and admits a closed/locked room only for an owner or presenter.
3. Repeat the exact launch request id after an interrupted response. The same visit id must return;
   one visit and one `room.launched` audit event may exist. Reusing it for another identity or room
   must fail. A new launch must close an abandoned open visit before opening its successor.
4. Complete the public room login as a guest. Confirm the controller's stable request id creates one
   non-authenticating canonical guest/member/visit, copies the self-declared report email without
   granting its account authority, and refuses malformed, cross-tenant, closed, or rate-limited
   entry.
5. Log out from the live room as both member and guest. The room must send its scoped HMAC to the
   controller, the controller must use its separate fixed service credential to close the canonical
   visit, and a repeated close must return `closed: false`. Remove either credential and require a
   refusal; logout itself must still complete, with the next launch repairing any stale visit.
6. Query customer `userstats` and confirm canonical IP, in/out times, duration, mobile attribution,
   and snapshot identity. Inspect logs and rendered HTML: no handoff token, service credential,
   customer API credential, cookie, query string, or response body may appear.

## Observe

Alert on launch 401/403/404/409/429/5xx rates, mapping disagreements, idempotency reuse, multiple
open visits for one room/user, stale visits closed on re-entry, failed logout closes, and migration/
OpenAPI/client/provenance/attestation drift. Logs may contain stable local/canonical UUIDs and reason
codes, but never credentials, cookies, raw query strings, or guest PII.

## Request-path rollback

Set `ROOM_LAUNCH_AUTHORITY_MODE=legacy` and redeploy the controller. Do not reverse migration
`0021`, delete visit/audit rows, clear mappings, or change either shared credential during the
incident. The same-origin launch door remains in place and legacy visit recording/close resumes.
Reconcile the named disagreement, rerun the real HTTP and logout-close matrix, and reactivate only
after one immutable revision is green in staging.
