//! End-to-end canonical account-administrator contracts over real HTTP and PostgreSQL.

mod support;

use serde_json::json;
use support::{ACME_ENTERPRISE, ACME_MEMBER, ACME_OWNER, BETA_OWNER, Harness};
use uuid::Uuid;

fn collection() -> String {
    format!("/api/v1/accounts/{ACME_ENTERPRISE}/administrators")
}

fn item(user_id: Uuid) -> String {
    format!("{}/{user_id}", collection())
}

#[tokio::test]
async fn administrator_lifecycle_is_usable_exactly_once_and_revocation_safe() {
    let harness = Harness::start().await;
    let owner = harness.cookie_for(ACME_OWNER, "Ada Owner");
    let member = harness.cookie_for(ACME_MEMBER, "Mara Member");
    let beta = harness.cookie_for(BETA_OWNER, "Beta Owner");
    let request_id = Uuid::new_v4();
    let email = format!("account-admin.{}@example.test", Uuid::new_v4().simple());
    let password = "administrator-password-2026";
    let request = json!({
        "requestId": request_id,
        "displayName": "  Account Operator  ",
        "email": email.to_uppercase(),
        "password": password
    });

    assert_eq!(harness.get(&collection(), Some(&member)).await.status, 404);
    assert_eq!(harness.get(&collection(), Some(&beta)).await.status, 404);
    assert_eq!(harness.get(&collection(), None).await.status, 401);

    let first = harness.post_json(&collection(), &owner, &request).await;
    assert_eq!(first.status, 200, "{:?}", first.body);
    assert_eq!(first.body["changed"], 1);
    assert_eq!(
        first.body["administrators"][0]["displayName"],
        "Account Operator"
    );
    assert_eq!(first.body["administrators"][0]["email"], email);
    assert_eq!(first.body["administrators"][0]["revision"], 0);
    assert!(first.body.get("password").is_none());
    assert!(first.body.get("passwordHash").is_none());
    assert!(first.body["administrators"][0].get("password").is_none());
    assert!(
        first.body["administrators"][0]
            .get("passwordHash")
            .is_none()
    );
    let user_id: Uuid = first.body["administrators"][0]["userId"]
        .as_str()
        .unwrap()
        .parse()
        .unwrap();

    let replay = harness.post_json(&collection(), &owner, &request).await;
    assert_eq!(replay.status, 200, "{:?}", replay.body);
    assert_eq!(replay.body, first.body);
    let reused = json!({
        "requestId": request_id,
        "displayName": "Different Operator",
        "email": format!("different.{}@example.test", Uuid::new_v4().simple()),
        "password": password
    });
    assert_eq!(
        harness
            .post_json(&collection(), &owner, &reused)
            .await
            .status,
        400
    );

    let listed = harness.get(&collection(), Some(&owner)).await.ok();
    assert!(
        listed
            .as_array()
            .unwrap()
            .iter()
            .any(|row| row["userId"] == user_id.to_string())
    );
    let administrator_cookie = harness.cookie_for(user_id, "Account Operator");
    assert_eq!(
        harness
            .get(&collection(), Some(&administrator_cookie))
            .await
            .status,
        200,
        "the created identity must hold real account authority"
    );
    assert_eq!(
        harness
            .post_anonymous(
                "/api/auth/login",
                &json!({ "email": email, "password": password })
            )
            .await
            .status,
        200,
        "the created credentials must authenticate through the canonical login"
    );

    assert_eq!(
        harness
            .delete_json(
                &item(user_id),
                &owner,
                &json!({ "requestId": Uuid::new_v4(), "expectedRevision": 1 })
            )
            .await
            .status,
        409,
        "a stale revision must not revoke authority"
    );
    assert_eq!(
        harness
            .delete_json(
                &item(ACME_OWNER),
                &owner,
                &json!({ "requestId": Uuid::new_v4(), "expectedRevision": 0 })
            )
            .await
            .status,
        404,
        "the admin-only deletion function must make owner authority unreachable"
    );

    let delete_request = json!({ "requestId": Uuid::new_v4(), "expectedRevision": 0 });
    let deleted = harness
        .delete_json(&item(user_id), &owner, &delete_request)
        .await;
    assert_eq!(deleted.status, 200, "{:?}", deleted.body);
    assert_eq!(deleted.body["removedUserIds"], json!([user_id]));
    let delete_replay = harness
        .delete_json(&item(user_id), &owner, &delete_request)
        .await;
    assert_eq!(delete_replay.status, 200, "{:?}", delete_replay.body);
    assert_eq!(delete_replay.body, deleted.body);
    assert_eq!(
        harness
            .get(&collection(), Some(&administrator_cookie))
            .await
            .status,
        404,
        "an already-issued access token must lose account authority immediately"
    );
    assert_eq!(
        harness
            .admin_scalar_i32(
                "SELECT count(*)::integer FROM refresh_tokens WHERE user_id = $1 AND revoked_at IS NULL",
                user_id,
            )
            .await,
        0,
        "every refresh-token family must be revoked in the membership transaction"
    );
    assert_eq!(
        harness
            .tenant_admin_scalar_i32(
                "SELECT count(*)::integer FROM audit_log WHERE enterprise_id = $1 AND room_id IS NULL \
                   AND target_id = $2 AND event_name IN \
                       ('account.administrator.created', 'account.administrator.removed')",
                |query| query.bind(ACME_ENTERPRISE).bind(user_id),
            )
            .await,
        2,
        "replays and rejected stale writes must not duplicate audit evidence"
    );

    harness.drop_profile_identity(user_id).await;
}

#[tokio::test]
async fn administrator_creation_refuses_overposting_weak_input_and_existing_identity_adoption() {
    let harness = Harness::start().await;
    let owner = harness.cookie_for(ACME_OWNER, "Ada Owner");
    for request in [
        json!({
            "requestId": Uuid::new_v4(), "displayName": "Admin", "email": "bad", "password": "long-enough-password"
        }),
        json!({
            "requestId": Uuid::new_v4(), "displayName": "Admin", "email": "admin@example.test", "password": "short"
        }),
        json!({
            "requestId": Uuid::new_v4(), "displayName": "Admin", "email": "admin@example.test",
            "password": "long-enough-password", "role": "owner"
        }),
    ] {
        assert_eq!(
            harness
                .post_json(&collection(), &owner, &request)
                .await
                .status,
            400
        );
    }

    assert_eq!(
        harness
            .post_json(
                &collection(),
                &owner,
                &json!({
                    "requestId": Uuid::new_v4(),
                    "displayName": "Owner Collision",
                    "email": "owner@acme.test",
                    "password": "long-enough-password"
                })
            )
            .await
            .status,
        409,
        "an existing identity must never be silently adopted or have its password reset"
    );
}
