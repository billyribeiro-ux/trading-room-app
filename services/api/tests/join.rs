//! Getting into a room: the three `auth_mode` values, and the operational endpoints.
//!
//! Every test here builds its own room rather than using the seeded one, because `auth_mode` is
//! a per-room setting and the fixture's rooms are `open`. Each cleans up after itself.

mod support;

use support::{ACME_ENTERPRISE, ACME_OWNER, Harness};
use uuid::Uuid;

/// A room in Acme with a given auth mode, plus whatever config it needs.
async fn make_room(h: &Harness, auth_mode: &str, config: serde_json::Value) -> Uuid {
    h.tenant_scalar(
        "INSERT INTO rooms (enterprise_id, owner_id, uuid_short, name, auth_mode, config) \
         VALUES ($1, $2, $3, 'Join Test Room', $4, $5) RETURNING id",
        |q| {
            q.bind(ACME_ENTERPRISE)
                .bind(ACME_OWNER)
                .bind(Uuid::new_v4().simple().to_string())
                .bind(auth_mode.to_owned())
                .bind(sqlx::types::Json(config))
        },
    )
    .await
}

// ---------------------------------------------------------------- open rooms

#[tokio::test]
async fn an_open_room_admits_a_signed_in_caller_as_a_member() {
    let h = Harness::start().await;
    let room = make_room(&h, "open", serde_json::json!({ "access": { "tiers": [] } })).await;
    let cookie = h.cookie_for(ACME_OWNER, "Ada Owner");

    let joined = h
        .post_json(
            &format!("/api/v1/rooms/{room}/join"),
            &cookie,
            &serde_json::json!({}),
        )
        .await
        .ok();

    assert_eq!(joined["membership"]["role"], "member");
    assert_eq!(joined["membership"]["isTrial"], false);
    assert_eq!(joined["membership"]["roomId"], room.to_string());

    h.drop_room(room).await;
}

/// Joining twice must not reset the role or the trial clock of somebody already inside - a
/// client retrying on a flaky connection would otherwise silently demote them.
#[tokio::test]
async fn joining_a_room_twice_is_idempotent() {
    let h = Harness::start().await;
    let room = make_room(&h, "open", serde_json::json!({ "access": { "tiers": [] } })).await;
    let cookie = h.cookie_for(ACME_OWNER, "Ada Owner");
    let path = format!("/api/v1/rooms/{room}/join");

    let first = h
        .post_json(&path, &cookie, &serde_json::json!({}))
        .await
        .ok();
    // Promote them, then rejoin: the second join must not put them back to `member`.
    h.tenant_execute(
        "UPDATE room_members SET role = 'owner' WHERE id = $1",
        |q| {
            q.bind(
                Uuid::parse_str(first["membership"]["memberId"].as_str().expect("id"))
                    .expect("uuid"),
            )
        },
    )
    .await;

    let second = h
        .post_json(&path, &cookie, &serde_json::json!({}))
        .await
        .ok();
    assert_eq!(
        second["membership"]["memberId"],
        first["membership"]["memberId"]
    );
    assert_eq!(
        second["membership"]["role"], "owner",
        "a rejoin must not downgrade an existing member"
    );

    h.drop_room(room).await;
}

#[tokio::test]
async fn a_closed_room_refuses_everyone_regardless_of_credential() {
    let h = Harness::start().await;
    let room = make_room(&h, "open", serde_json::json!({ "access": { "tiers": [] } })).await;
    h.tenant_execute("UPDATE rooms SET state = 'closed' WHERE id = $1", |q| {
        q.bind(room)
    })
    .await;

    let response = h
        .post_json(
            &format!("/api/v1/rooms/{room}/join"),
            &h.cookie_for(ACME_OWNER, "Ada Owner"),
            &serde_json::json!({}),
        )
        .await;
    assert_eq!(response.status, 400, "{:?}", response.body);

    h.drop_room(room).await;
}

// ---------------------------------------------------------------- password rooms

#[tokio::test]
async fn a_password_room_admits_only_the_right_password() {
    let h = Harness::start().await;
    // The hash is produced by the service's own Argon2id path, which is what
    // `rooms_access_tiers_argon2id_check` requires the stored value to look like.
    let hash = tradingroom_api::auth::password::hash_password("floor-pass".into())
        .await
        .expect("hash");
    let room = make_room(
        &h,
        "password",
        serde_json::json!({
            "access": { "tiers": [{ "passwordHash": hash, "role": "member", "isTrial": false, "trialDays": null }] }
        }),
    )
    .await;
    let cookie = h.cookie_for(ACME_OWNER, "Ada Owner");
    let path = format!("/api/v1/rooms/{room}/join");

    // No password at all.
    assert_eq!(
        h.post_json(&path, &cookie, &serde_json::json!({}))
            .await
            .status,
        400
    );
    // Wrong password.
    assert_eq!(
        h.post_json(&path, &cookie, &serde_json::json!({ "password": "wrong" }))
            .await
            .status,
        401
    );
    // Right password.
    let joined = h
        .post_json(
            &path,
            &cookie,
            &serde_json::json!({ "password": "floor-pass" }),
        )
        .await
        .ok();
    assert_eq!(joined["membership"]["role"], "member");

    h.drop_room(room).await;
}

#[tokio::test]
async fn a_trial_tier_sets_an_expiry_from_its_day_count() {
    let h = Harness::start().await;
    let hash = tradingroom_api::auth::password::hash_password("trial-pass".into())
        .await
        .expect("hash");
    let room = make_room(
        &h,
        "password",
        serde_json::json!({
            "access": { "tiers": [{ "passwordHash": hash, "role": "member", "isTrial": true, "trialDays": 14 }] }
        }),
    )
    .await;

    let joined = h
        .post_json(
            &format!("/api/v1/rooms/{room}/join"),
            &h.cookie_for(ACME_OWNER, "Ada Owner"),
            &serde_json::json!({ "password": "trial-pass" }),
        )
        .await
        .ok();

    assert_eq!(joined["membership"]["isTrial"], true);

    // The expiry is stored, not merely reported - the capability layer reads the column.
    let days: Option<f64> = h
        .tenant_optional_scalar(
            // `::float8` because EXTRACT returns NUMERIC in PostgreSQL 14+, which sqlx will
            // not decode into an f64.
            "SELECT (EXTRACT(EPOCH FROM (trial_expires_at - now())) / 86400)::float8 \
             FROM room_members WHERE room_id = $1 AND user_id = $2",
            |q| q.bind(room).bind(ACME_OWNER),
        )
        .await;
    let days = days.expect("a trial expiry was stored");
    assert!(
        (13.9..=14.1).contains(&days),
        "expected ~14 days of trial, got {days}"
    );

    h.drop_room(room).await;
}

// ---------------------------------------------------------------- invite rooms

#[tokio::test]
async fn an_invite_admits_once_and_then_is_spent() {
    use sha2::{Digest, Sha256};

    let h = Harness::start().await;
    let room = make_room(
        &h,
        "invite",
        serde_json::json!({ "access": { "tiers": [] } }),
    )
    .await;

    let token = format!("invite-{}", Uuid::new_v4());
    let token_hash = hex::encode(Sha256::digest(token.as_bytes()));

    h.tenant_execute(
        "INSERT INTO invite_tokens (enterprise_id, room_id, token_hash, role, max_uses) \
         VALUES ($1, $2, $3, 'member', 1)",
        |q| q.bind(ACME_ENTERPRISE).bind(room).bind(token_hash.clone()),
    )
    .await;

    let cookie = h.cookie_for(ACME_OWNER, "Ada Owner");
    let path = format!("/api/v1/rooms/{room}/join");

    // A wrong token is refused without revealing whether the room exists.
    assert_eq!(
        h.post_json(
            &path,
            &cookie,
            &serde_json::json!({ "inviteToken": "nope" })
        )
        .await
        .status,
        401
    );

    let joined = h
        .post_json(&path, &cookie, &serde_json::json!({ "inviteToken": token }))
        .await
        .ok();
    assert_eq!(joined["membership"]["role"], "member");

    // `max_uses = 1` and it has been used. The count is what makes the second attempt fail,
    // even though the membership already exists.
    let used: i32 = h
        .tenant_scalar_i32(
            "SELECT use_count FROM invite_tokens WHERE room_id = $1",
            |q| q.bind(room),
        )
        .await;
    assert_eq!(used, 1);

    h.drop_room(room).await;
}

#[tokio::test]
async fn an_invite_for_another_room_does_not_open_this_one() {
    use sha2::{Digest, Sha256};

    let h = Harness::start().await;
    let target = make_room(
        &h,
        "invite",
        serde_json::json!({ "access": { "tiers": [] } }),
    )
    .await;
    let other = make_room(
        &h,
        "invite",
        serde_json::json!({ "access": { "tiers": [] } }),
    )
    .await;

    // The invite is valid - for the *other* room.
    let token = format!("invite-{}", Uuid::new_v4());
    let token_hash = hex::encode(Sha256::digest(token.as_bytes()));
    h.tenant_execute(
        "INSERT INTO invite_tokens (enterprise_id, room_id, token_hash, role, max_uses) \
         VALUES ($1, $2, $3, 'member', 5)",
        |q| q.bind(ACME_ENTERPRISE).bind(other).bind(token_hash.clone()),
    )
    .await;

    let response = h
        .post_json(
            &format!("/api/v1/rooms/{target}/join"),
            &h.cookie_for(ACME_OWNER, "Ada Owner"),
            &serde_json::json!({ "inviteToken": token }),
        )
        .await;
    assert_eq!(
        response.status, 401,
        "an invite to one room must not open another: {:?}",
        response.body
    );

    h.drop_room(target).await;
    h.drop_room(other).await;
}

#[tokio::test]
async fn a_revoked_invite_is_refused() {
    use sha2::{Digest, Sha256};

    let h = Harness::start().await;
    let room = make_room(
        &h,
        "invite",
        serde_json::json!({ "access": { "tiers": [] } }),
    )
    .await;
    let token = format!("invite-{}", Uuid::new_v4());
    let token_hash = hex::encode(Sha256::digest(token.as_bytes()));

    h.tenant_execute(
        "INSERT INTO invite_tokens (enterprise_id, room_id, token_hash, role, max_uses, revoked_at) \
         VALUES ($1, $2, $3, 'member', 5, now())",
        |q| q.bind(ACME_ENTERPRISE).bind(room).bind(token_hash.clone()),
    )
    .await;

    assert_eq!(
        h.post_json(
            &format!("/api/v1/rooms/{room}/join"),
            &h.cookie_for(ACME_OWNER, "Ada Owner"),
            &serde_json::json!({ "inviteToken": token })
        )
        .await
        .status,
        401
    );

    h.drop_room(room).await;
}

// ---------------------------------------------------------------- metrics

#[tokio::test]
async fn metrics_are_exposed_and_carry_no_identifiers() {
    let h = Harness::start().await;
    let cookie = h.cookie_for(ACME_OWNER, "Ada Owner");

    // Drive a request through a room route so the `rooms` class has a sample with a uuid in the
    // path it was matched from.
    h.get(
        &format!("/api/v1/rooms/{}", support::ACME_ROOM),
        Some(&cookie),
    )
    .await;

    let response = h.get("/metrics", None).await;
    assert_eq!(response.status, 200);

    let body = match response.body {
        serde_json::Value::String(text) => text,
        other => panic!("expected a text body, got {other:?}"),
    };

    assert!(
        body.contains("tradingroom_requests_total{route=\"rooms\"}"),
        "{body}"
    );
    assert!(body.contains("tradingroom_db_pool_connections"), "{body}");
    assert!(body.contains("tradingroom_websockets_open"), "{body}");
    // The cardinality guarantee: no room id anywhere in the exposition.
    assert!(
        !body.contains(&support::ACME_ROOM.to_string()),
        "a room id reached the metric labels"
    );
}

#[tokio::test]
async fn metrics_need_no_session() {
    // Scraped by an agent, not a browser. Requiring a credential means rotating one per scraper.
    let h = Harness::start().await;
    assert_eq!(h.get("/metrics", None).await.status, 200);
}

// ---------------------------------------------------------------- guests

#[tokio::test]
async fn a_guest_may_enter_only_a_room_that_allows_anonymous() {
    let h = Harness::start().await;

    // The default is closed, and a room that has never been configured must not accept
    // strangers.
    let closed = make_room(&h, "open", serde_json::json!({ "access": { "tiers": [] } })).await;
    let refused = h
        .post_anonymous(
            &format!("/api/v1/rooms/{closed}/guest"),
            &serde_json::json!({ "displayName": "Passer By" }),
        )
        .await;
    assert_eq!(refused.status, 403, "{:?}", refused.body);

    // And nothing was created for the refused attempt.
    let leaked: i32 = h
        .tenant_scalar_i32(
            "SELECT count(*)::int FROM room_members WHERE room_id = $1",
            |q| q.bind(closed),
        )
        .await;
    assert_eq!(leaked, 0, "a refused guest must leave no rows behind");

    h.drop_room(closed).await;
}

#[tokio::test]
async fn a_guest_gets_a_session_and_a_membership_but_no_password() {
    let h = Harness::start().await;
    let room = make_room(
        &h,
        "open",
        serde_json::json!({ "access": { "tiers": [], "allowAnonymous": true } }),
    )
    .await;

    let response = h
        .post_anonymous(
            &format!("/api/v1/rooms/{room}/guest"),
            &serde_json::json!({ "displayName": "Passer By" }),
        )
        .await;

    assert_eq!(response.status, 200, "{:?}", response.body);
    assert_eq!(response.body["displayName"], "Passer By");
    assert_eq!(response.body["isPlatformAdmin"], false);

    // The row satisfies `users_guest_password_check`: a guest has no password, which is also
    // what makes it unable to sign in through /api/auth/login later.
    let guests: i32 = h
        .admin_scalar_i32(
            "SELECT count(*)::int FROM users \
             WHERE guest_created_in_room_id = $1 AND is_guest AND password_hash IS NULL",
            room,
        )
        .await;
    assert_eq!(guests, 1);

    let members: i32 = h
        .tenant_scalar_i32(
            "SELECT count(*)::int FROM room_members WHERE room_id = $1",
            |q| q.bind(room),
        )
        .await;
    assert_eq!(members, 1, "the guest is a member of the room they entered");

    h.tenant_execute("DELETE FROM room_members WHERE room_id = $1", |q| {
        q.bind(room)
    })
    .await;
    h.purge_guests(room).await;
    h.drop_room(room).await;
}

#[tokio::test]
async fn a_guest_needs_a_display_name() {
    let h = Harness::start().await;
    let room = make_room(
        &h,
        "open",
        serde_json::json!({ "access": { "tiers": [], "allowAnonymous": true } }),
    )
    .await;

    for name in ["", "   "] {
        let response = h
            .post_anonymous(
                &format!("/api/v1/rooms/{room}/guest"),
                &serde_json::json!({ "displayName": name }),
            )
            .await;
        assert_eq!(response.status, 400, "{:?}", response.body);
    }

    h.drop_room(room).await;
}
