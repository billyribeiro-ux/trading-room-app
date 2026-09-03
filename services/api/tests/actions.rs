//! Every remaining form action, end to end against real PostgreSQL.
//!
//! These cover the actions that moved out of `src/routes/+page.server.ts`: notes, alerts,
//! polls, moderation and account preferences. The emphasis is on the **authorization** of each,
//! because that is what a 200-line `messageAction` switch made easy to get wrong and what a
//! previous audit of the SvelteKit backend actually found broken.

mod support;

use support::{
    ACME_ENTERPRISE, ACME_MEMBER, ACME_MODERATOR, ACME_OWNER, ACME_ROOM, ACME_TARGET, BETA_OWNER,
    BETA_ROOM, Harness,
};
use uuid::Uuid;

// ---------------------------------------------------------------- notes

#[tokio::test]
async fn a_member_without_edit_notes_cannot_touch_them() {
    let h = Harness::start().await;
    let member = h.cookie_for(ACME_MEMBER, "Mia Member");

    // The room's seeded policy gives a plain member post/use_group_chat/access_archives only.
    let response = h
        .post_json(
            &format!("/api/v1/rooms/{ACME_ROOM}/notes"),
            &member,
            &serde_json::json!({ "name": "should not exist" }),
        )
        .await;
    assert_eq!(response.status, 403, "{:?}", response.body);
    assert_eq!(response.body["error"]["code"], "forbidden");
}

#[tokio::test]
async fn a_note_can_be_created_saved_renamed_and_deleted() {
    let h = Harness::start().await;
    let owner = h.cookie_for(ACME_OWNER, "Ada Owner");
    let base = format!("/api/v1/rooms/{ACME_ROOM}/notes");

    let created = h
        .post_json(
            &base,
            &owner,
            &serde_json::json!({ "name": "Trading plan" }),
        )
        .await
        .ok();
    let note_id = created["id"].as_str().expect("an id").to_owned();
    assert_eq!(created["name"], "Trading plan");

    let saved = h
        .put_json(
            &format!("{base}/{note_id}"),
            &owner,
            &serde_json::json!({ "contentHtml": "<p>first</p>" }),
        )
        .await
        .ok();
    assert_eq!(saved["contentHtml"], "<p>first</p>");

    let renamed = h
        .patch_json(
            &format!("{base}/{note_id}"),
            &owner,
            &serde_json::json!({ "name": "Renamed plan" }),
        )
        .await
        .ok();
    assert_eq!(renamed["name"], "Renamed plan");

    let removed = h.delete(&format!("{base}/{note_id}"), &owner).await;
    assert_eq!(removed.status, 204, "{:?}", removed.body);

    // A soft-deleted note is gone from the list rather than merely flagged.
    let listed = h.get(&base, Some(&owner)).await.ok();
    assert!(
        !listed
            .as_array()
            .expect("a list")
            .iter()
            .any(|n| n["id"] == note_id.as_str()),
        "a deleted note must not be listed: {listed}"
    );
}

/// Saving records what the note *was*, so the history holds the replaced content and a restore
/// can be undone.
#[tokio::test]
async fn saving_a_note_records_the_previous_content_as_a_version() {
    let h = Harness::start().await;
    let owner = h.cookie_for(ACME_OWNER, "Ada Owner");
    let base = format!("/api/v1/rooms/{ACME_ROOM}/notes");

    let note_id = h
        .post_json(&base, &owner, &serde_json::json!({ "name": "Versioned" }))
        .await
        .ok()["id"]
        .as_str()
        .expect("id")
        .to_owned();

    for body in ["<p>one</p>", "<p>two</p>", "<p>three</p>"] {
        h.put_json(
            &format!("{base}/{note_id}"),
            &owner,
            &serde_json::json!({ "contentHtml": body }),
        )
        .await
        .ok();
    }

    let versions = h
        .get(&format!("{base}/{note_id}/versions"), Some(&owner))
        .await
        .ok();
    let versions = versions.as_array().expect("versions");
    assert_eq!(versions.len(), 3, "one per save: {versions:?}");

    // Newest first, and the numbers are dense - a gap would mean two saves computed the same
    // version number.
    let numbers: Vec<i64> = versions
        .iter()
        .map(|v| v["version"].as_i64().expect("version"))
        .collect();
    assert_eq!(numbers, vec![3, 2, 1], "{numbers:?}");

    // Version 3 holds what the note was before the third save.
    assert_eq!(versions[0]["contentHtml"], "<p>two</p>");

    h.delete(&format!("{base}/{note_id}"), &owner).await;
}

#[tokio::test]
async fn a_version_can_be_restored_onto_its_note() {
    let h = Harness::start().await;
    let owner = h.cookie_for(ACME_OWNER, "Ada Owner");
    let base = format!("/api/v1/rooms/{ACME_ROOM}/notes");

    let note_id = h
        .post_json(&base, &owner, &serde_json::json!({ "name": "Restorable" }))
        .await
        .ok()["id"]
        .as_str()
        .expect("id")
        .to_owned();

    for body in ["<p>original</p>", "<p>mistake</p>"] {
        h.put_json(
            &format!("{base}/{note_id}"),
            &owner,
            &serde_json::json!({ "contentHtml": body }),
        )
        .await
        .ok();
    }

    // Version 2 holds "<p>original</p>" - what the note was before the mistake.
    let versions = h
        .get(&format!("{base}/{note_id}/versions"), Some(&owner))
        .await
        .ok();
    let target = versions.as_array().expect("versions")[0]["id"]
        .as_str()
        .expect("id")
        .to_owned();

    let restored = h
        .post_json(
            &format!("{base}/{note_id}/versions/{target}/restore"),
            &owner,
            &serde_json::json!({}),
        )
        .await
        .ok();
    assert_eq!(restored["contentHtml"], "<p>original</p>");

    h.delete(&format!("{base}/{note_id}"), &owner).await;
}

/// **The audit finding.** A version id belonging to another room's note must not be restorable,
/// even though RLS lets both rows be seen - they are in the same tenant.
#[tokio::test]
async fn a_version_from_another_rooms_note_cannot_be_restored() {
    let h = Harness::start().await;
    let owner = h.cookie_for(ACME_OWNER, "Ada Owner");
    let base = format!("/api/v1/rooms/{ACME_ROOM}/notes");

    // Two notes in the same room, each with history.
    let mut ids = Vec::new();
    for name in ["Victim", "Source"] {
        let id = h
            .post_json(&base, &owner, &serde_json::json!({ "name": name }))
            .await
            .ok()["id"]
            .as_str()
            .expect("id")
            .to_owned();
        for body in ["<p>a</p>", "<p>b</p>"] {
            h.put_json(
                &format!("{base}/{id}"),
                &owner,
                &serde_json::json!({ "contentHtml": body }),
            )
            .await
            .ok();
        }
        ids.push(id);
    }
    let (victim, source) = (&ids[0], &ids[1]);

    let source_version = h
        .get(&format!("{base}/{source}/versions"), Some(&owner))
        .await
        .ok()
        .as_array()
        .expect("versions")[0]["id"]
        .as_str()
        .expect("id")
        .to_owned();

    // Restore *source's* version onto *victim*. Both are visible to this caller under RLS;
    // only the join on note_id stops it.
    let response = h
        .post_json(
            &format!("{base}/{victim}/versions/{source_version}/restore"),
            &owner,
            &serde_json::json!({}),
        )
        .await;
    assert_eq!(
        response.status, 404,
        "a version of another note must not be restorable: {:?}",
        response.body
    );

    for id in &ids {
        h.delete(&format!("{base}/{id}"), &owner).await;
    }
}

#[tokio::test]
async fn only_one_note_can_be_the_welcome_mat() {
    let h = Harness::start().await;
    let owner = h.cookie_for(ACME_OWNER, "Ada Owner");
    let base = format!("/api/v1/rooms/{ACME_ROOM}/notes");

    let mut ids = Vec::new();
    for name in ["Mat A", "Mat B"] {
        ids.push(
            h.post_json(&base, &owner, &serde_json::json!({ "name": name }))
                .await
                .ok()["id"]
                .as_str()
                .expect("id")
                .to_owned(),
        );
    }

    for id in &ids {
        h.put_json(
            &format!("{base}/{id}/welcome-mat"),
            &owner,
            &serde_json::json!({}),
        )
        .await
        .ok();
    }

    // The second set must have cleared the first.
    let listed = h.get(&base, Some(&owner)).await.ok();
    let mats: Vec<_> = listed
        .as_array()
        .expect("notes")
        .iter()
        .filter(|n| n["isWelcomeMat"] == true)
        .map(|n| n["id"].clone())
        .collect();
    assert_eq!(mats.len(), 1, "exactly one welcome mat: {mats:?}");
    assert_eq!(mats[0], ids[1].as_str());

    for id in &ids {
        h.delete(&format!("{base}/{id}"), &owner).await;
    }
}

// ---------------------------------------------------------------- alerts

#[tokio::test]
async fn a_member_cannot_post_an_alert_but_staff_can() {
    let h = Harness::start().await;
    let base = format!("/api/v1/rooms/{ACME_ROOM}/alerts");
    let body = serde_json::json!({
        "body": "AAPL long from 190",
        "alertKind": "trade",
        "direction": "long",
        "symbol": "AAPL",
        "entryPrice": "190.125000",
        "tradeStyle": "swing",
    });

    let refused = h
        .post_json(&base, &h.cookie_for(ACME_MEMBER, "Mia Member"), &body)
        .await;
    assert_eq!(refused.status, 403, "{:?}", refused.body);

    let owner = h.cookie_for(ACME_OWNER, "Ada Owner");
    let posted = h.post_json(&base, &owner, &body).await.ok();
    assert_eq!(posted["symbol"], "AAPL");
    // numeric(18,6) must round-trip losslessly - this is why prices are Decimal, not f64.
    assert_eq!(posted["entryPrice"], "190.125000");
    assert_eq!(posted["displayName"], "Ada Owner");

    let id = posted["id"].as_str().expect("id");
    h.delete(&format!("{base}/{id}"), &owner).await;
}

#[tokio::test]
async fn an_alert_with_a_value_outside_the_schemas_check_sets_is_refused_by_field() {
    let h = Harness::start().await;
    let owner = h.cookie_for(ACME_OWNER, "Ada Owner");
    let base = format!("/api/v1/rooms/{ACME_ROOM}/alerts");

    for (field, patch) in [
        ("alertKind", serde_json::json!({ "alertKind": "gossip" })),
        ("direction", serde_json::json!({ "direction": "sideways" })),
        ("tradeStyle", serde_json::json!({ "tradeStyle": "scalp" })),
    ] {
        let mut body = serde_json::json!({ "body": "x", "alertKind": "trade" });
        for (k, v) in patch.as_object().expect("object") {
            body[k] = v.clone();
        }
        let response = h.post_json(&base, &owner, &body).await;
        assert_eq!(response.status, 400, "{field}: {:?}", response.body);
        // Named, rather than a flat "invalid request" from a 23514.
        assert!(
            response.body["error"]["message"]
                .as_str()
                .expect("message")
                .contains(field),
            "the message must name the field: {:?}",
            response.body
        );
    }
}

#[tokio::test]
async fn a_member_may_ask_a_question_but_not_claim_to_answer_one() {
    let h = Harness::start().await;
    let owner = h.cookie_for(ACME_OWNER, "Ada Owner");
    let member = h.cookie_for(ACME_MEMBER, "Mia Member");
    let base = format!("/api/v1/rooms/{ACME_ROOM}/alerts");

    let alert_id = h
        .post_json(
            &base,
            &owner,
            &serde_json::json!({ "body": "question me", "alertKind": "trade" }),
        )
        .await
        .ok()["id"]
        .as_str()
        .expect("id")
        .to_owned();

    let asked = h
        .post_json(
            &format!("{base}/{alert_id}/questions"),
            &member,
            &serde_json::json!({ "body": "what is the stop?" }),
        )
        .await
        .ok();
    assert_eq!(asked["displayName"], "Mia Member");
    assert_eq!(asked["isAnswer"], false);

    // Marking it an answer flips `alerts.is_answered` and reads as the room speaking.
    let refused = h
        .post_json(
            &format!("{base}/{alert_id}/questions"),
            &member,
            &serde_json::json!({ "body": "the stop is 185", "isAnswer": true }),
        )
        .await;
    assert_eq!(refused.status, 403, "{:?}", refused.body);

    h.delete(&format!("{base}/{alert_id}"), &owner).await;
}

// ---------------------------------------------------------------- polls

#[tokio::test]
async fn a_poll_runs_from_creation_through_answers_to_close() {
    let h = Harness::start().await;
    let owner = h.cookie_for(ACME_OWNER, "Ada Owner");
    let member = h.cookie_for(ACME_MEMBER, "Mia Member");
    let base = format!("/api/v1/rooms/{ACME_ROOM}/polls");

    let poll = h
        .post_json(
            &base,
            &owner,
            &serde_json::json!({ "question": "Long or short?", "choices": ["Long", "Short"] }),
        )
        .await
        .ok();
    let poll_id = poll["id"].as_str().expect("id").to_owned();
    assert_eq!(poll["state"], "active");

    let answered = h
        .post_json(
            &format!("{base}/{poll_id}/answer"),
            &member,
            &serde_json::json!({ "choiceIndex": 1 }),
        )
        .await
        .ok();
    assert_eq!(answered["tally"], serde_json::json!([0, 1]));
    assert_eq!(answered["ownChoice"], 1);

    // Answering again replaces rather than doubles - one member, one vote.
    let changed = h
        .post_json(
            &format!("{base}/{poll_id}/answer"),
            &member,
            &serde_json::json!({ "choiceIndex": 0 }),
        )
        .await
        .ok();
    assert_eq!(changed["tally"], serde_json::json!([1, 0]));
    assert_eq!(changed["total"], 1, "a member votes once: {changed}");

    let closed = h
        .post_json(
            &format!("{base}/{poll_id}/close"),
            &owner,
            &serde_json::json!({}),
        )
        .await
        .ok();
    assert_eq!(closed["state"], "closed");

    // A closed poll takes no more answers - decided in the WHERE, not by a read-then-write.
    let late = h
        .post_json(
            &format!("{base}/{poll_id}/answer"),
            &member,
            &serde_json::json!({ "choiceIndex": 1 }),
        )
        .await;
    assert_eq!(late.status, 404, "{:?}", late.body);

    h.delete(&format!("{base}/{poll_id}"), &owner).await;
}

#[tokio::test]
async fn a_saved_poll_survives_being_listed_and_is_deleted_by_id() {
    let h = Harness::start().await;
    let owner = h.cookie_for(ACME_OWNER, "Ada Owner");
    let base = format!("/api/v1/rooms/{ACME_ROOM}/saved-polls");

    let first = h
        .post_json(
            &base,
            &owner,
            &serde_json::json!({ "question": "  Long or short?  ", "choices": [" Long ", "Short"] }),
        )
        .await
        .ok();
    // `q` on the wire, matching the shipped client's `{q, choices}` and the room's own DTO -
    // and stored VERBATIM. Load hands this text straight back to the presenter's compose box,
    // so trimming would return them something other than what they typed. Neither the shipped
    // client nor the room's `savePoll` action trims.
    assert_eq!(first["q"], "  Long or short?  ", "{first}");
    assert_eq!(first["choices"], serde_json::json!([" Long ", "Short"]));
    // Exactly three fields: what PollPanel.svelte reads, and nothing more.
    assert_eq!(
        first.as_object().expect("an object").len(),
        3,
        "the wire contract is {{id, q, choices}}: {first}"
    );
    let first_id = first["id"].as_str().expect("id").to_owned();

    let second = h
        .post_json(
            &base,
            &owner,
            &serde_json::json!({ "question": "Scalp or swing?", "choices": ["Scalp", "Swing"] }),
        )
        .await
        .ok();
    let second_id = second["id"].as_str().expect("id").to_owned();

    // Insertion order, which is what the reference's array preserves. Narrowed to this test's
    // own two rows: the whole suite shares one database and one ACME_ROOM, and the Pre-Canned
    // list is per-room, so a sibling test's poll can legitimately sit between them.
    let listed = h.get(&base, Some(&owner)).await.ok();
    let mine = |list: &serde_json::Value| -> Vec<String> {
        list.as_array()
            .expect("a list")
            .iter()
            .map(|saved| saved["id"].as_str().expect("id").to_owned())
            .filter(|id| id == &first_id || id == &second_id)
            .collect()
    };
    assert_eq!(
        mine(&listed),
        vec![first_id.clone(), second_id.clone()],
        "{listed}"
    );

    // Deleting the FIRST one must not disturb the second. The reference splices an array index,
    // so this is the case that would silently take the wrong row if position were the key.
    assert_eq!(
        h.delete(&format!("{base}/{first_id}"), &owner).await.status,
        204
    );

    let after = h.get(&base, Some(&owner)).await.ok();
    assert_eq!(mine(&after), vec![second_id.clone()], "{after}");

    // Deleting it twice is a 404, not a silent success.
    assert_eq!(
        h.delete(&format!("{base}/{first_id}"), &owner).await.status,
        404
    );

    h.delete(&format!("{base}/{second_id}"), &owner).await;
}

#[tokio::test]
async fn a_member_cannot_read_or_write_the_pre_canned_list() {
    let h = Harness::start().await;
    let owner = h.cookie_for(ACME_OWNER, "Ada Owner");
    let member = h.cookie_for(ACME_MEMBER, "Mia Member");
    let base = format!("/api/v1/rooms/{ACME_ROOM}/saved-polls");

    let saved = h
        .post_json(
            &base,
            &owner,
            &serde_json::json!({ "question": "Staff only?", "choices": ["Yes", "No"] }),
        )
        .await
        .ok();
    let saved_id = saved["id"].as_str().expect("id").to_owned();

    // A template is a presenter's working note. The reference only renders it inside the poll
    // panel, which a member cannot open - so reading is staff-only too, unlike the sent list.
    assert_eq!(h.get(&base, Some(&member)).await.status, 403);
    assert_eq!(
        h.post_json(
            &base,
            &member,
            &serde_json::json!({ "question": "Mine", "choices": ["a", "b"] })
        )
        .await
        .status,
        403
    );
    assert_eq!(
        h.delete(&format!("{base}/{saved_id}"), &member)
            .await
            .status,
        403
    );

    h.delete(&format!("{base}/{saved_id}"), &owner).await;
}

#[tokio::test]
async fn a_saved_poll_is_not_reachable_from_another_tenant() {
    let h = Harness::start().await;
    let acme = h.cookie_for(ACME_OWNER, "Ada Owner");
    let beta = h.cookie_for(BETA_OWNER, "Blair Owner");

    let saved = h
        .post_json(
            &format!("/api/v1/rooms/{ACME_ROOM}/saved-polls"),
            &acme,
            &serde_json::json!({ "question": "Acme only", "choices": ["a", "b"] }),
        )
        .await
        .ok();
    let saved_id = saved["id"].as_str().expect("id").to_owned();

    // Beta's owner is staff in Beta, so this is the RLS policy refusing the row rather than the
    // role check refusing the caller.
    let cross = h
        .delete(
            &format!("/api/v1/rooms/{BETA_ROOM}/saved-polls/{saved_id}"),
            &beta,
        )
        .await;
    assert_eq!(cross.status, 404, "{:?}", cross.body);

    let beta_list = h
        .get(
            &format!("/api/v1/rooms/{BETA_ROOM}/saved-polls"),
            Some(&beta),
        )
        .await
        .ok();
    assert!(
        !beta_list
            .as_array()
            .expect("a list")
            .iter()
            .any(|saved| saved["id"] == serde_json::json!(saved_id)),
        "Acme's saved poll is visible to Beta: {beta_list}"
    );

    h.delete(
        &format!("/api/v1/rooms/{ACME_ROOM}/saved-polls/{saved_id}"),
        &acme,
    )
    .await;
}

#[tokio::test]
async fn a_half_written_draft_is_storable_because_that_is_what_pre_canned_is_for() {
    let h = Harness::start().await;
    let owner = h.cookie_for(ACME_OWNER, "Ada Owner");
    let base = format!("/api/v1/rooms/{ACME_ROOM}/saved-polls");

    // Every one of these is refused by `create` (sending it) and accepted here (saving it).
    // The shipped client's `savePollToStorage` has no validation whatsoever, and the room's
    // `savePoll` action rejects only a `choices` value that is not a JSON array of strings -
    // so a presenter who types half a poll and presses "Save To Canned" gets it saved, then
    // Loads it back to finish. Refusing the draft would refuse the feature.
    let mut ids = Vec::new();
    for body in [
        serde_json::json!({ "question": "", "choices": [] }),
        serde_json::json!({ "question": "Only one so far", "choices": ["Up"] }),
        serde_json::json!({ "question": "   ", "choices": ["a", "  "] }),
    ] {
        let saved = h.post_json(&base, &owner, &body).await.ok();
        assert_eq!(saved["q"], body["question"], "stored verbatim: {saved}");
        assert_eq!(
            saved["choices"], body["choices"],
            "stored verbatim: {saved}"
        );
        ids.push(saved["id"].as_str().expect("id").to_owned());
    }

    // The one bound kept is the ceiling, and it is a resource limit rather than a product rule:
    // a draft that could never be sent is not worth storing.
    let too_many: Vec<String> = (0..=tradingroom_api::limits::POLL_MAX_CHOICES)
        .map(|n| n.to_string())
        .collect();
    let refused = h
        .post_json(
            &base,
            &owner,
            &serde_json::json!({ "question": "Too many", "choices": too_many }),
        )
        .await;
    assert_eq!(refused.status, 400, "{:?}", refused.body);

    for id in ids {
        h.delete(&format!("{base}/{id}"), &owner).await;
    }
}

#[tokio::test]
async fn a_choice_index_outside_the_poll_is_refused() {
    let h = Harness::start().await;
    let owner = h.cookie_for(ACME_OWNER, "Ada Owner");
    let member = h.cookie_for(ACME_MEMBER, "Mia Member");
    let base = format!("/api/v1/rooms/{ACME_ROOM}/polls");

    let poll_id = h
        .post_json(
            &base,
            &owner,
            &serde_json::json!({ "question": "Two options", "choices": ["A", "B"] }),
        )
        .await
        .ok()["id"]
        .as_str()
        .expect("id")
        .to_owned();

    // A poll with two options must not accumulate votes for option 47, or for -1.
    for index in [2, 47, -1] {
        let response = h
            .post_json(
                &format!("{base}/{poll_id}/answer"),
                &member,
                &serde_json::json!({ "choiceIndex": index }),
            )
            .await;
        assert_eq!(response.status, 404, "index {index}: {:?}", response.body);
    }

    h.delete(&format!("{base}/{poll_id}"), &owner).await;
}

#[tokio::test]
async fn a_member_cannot_create_or_close_a_poll() {
    let h = Harness::start().await;
    let member = h.cookie_for(ACME_MEMBER, "Mia Member");
    let base = format!("/api/v1/rooms/{ACME_ROOM}/polls");

    let response = h
        .post_json(
            &base,
            &member,
            &serde_json::json!({ "question": "mine", "choices": ["a", "b"] }),
        )
        .await;
    assert_eq!(response.status, 403, "{:?}", response.body);
}

#[tokio::test]
async fn a_poll_needs_at_least_two_choices() {
    let h = Harness::start().await;
    let owner = h.cookie_for(ACME_OWNER, "Ada Owner");
    let base = format!("/api/v1/rooms/{ACME_ROOM}/polls");

    for choices in [serde_json::json!([]), serde_json::json!(["only one"])] {
        let response = h
            .post_json(
                &base,
                &owner,
                &serde_json::json!({ "question": "?", "choices": choices }),
            )
            .await;
        assert_eq!(response.status, 400, "{:?}", response.body);
    }
}

// ---------------------------------------------------------------- moderation

#[tokio::test]
async fn a_member_may_delete_their_own_message_only_if_granted() {
    let h = Harness::start().await;
    let member = h.cookie_for(ACME_MEMBER, "Mia Member");

    let posted = h.post_message(&member, "mine to delete").await;
    let id = posted["id"].as_str().expect("id").to_owned();

    // The seeded member policy does not include delete_own_message.
    let response = h
        .delete(&format!("/api/v1/rooms/{ACME_ROOM}/messages/{id}"), &member)
        .await;
    assert_eq!(response.status, 403, "{:?}", response.body);
    assert_eq!(response.body["error"]["code"], "forbidden");

    h.purge_message(&id).await;
}

#[tokio::test]
async fn a_moderator_may_delete_someone_elses_message() {
    let h = Harness::start().await;
    let member = h.cookie_for(ACME_MEMBER, "Mia Member");
    let moderator = h.cookie_for(ACME_MODERATOR, "Morgan Moderator");

    let posted = h.post_message(&member, "moderated away").await;
    let id = posted["id"].as_str().expect("id").to_owned();

    let response = h
        .delete(
            &format!("/api/v1/rooms/{ACME_ROOM}/messages/{id}"),
            &moderator,
        )
        .await;
    assert_eq!(response.status, 204, "{:?}", response.body);

    // And it is recorded, with who did it.
    let logged: i64 = h
        .scalar(
            "SELECT count(*) FROM audit_log WHERE event_name = 'message.deleted' AND target_id = $1",
            &id,
        )
        .await;
    assert_eq!(logged, 1, "a moderation action must be auditable");

    h.purge_message(&id).await;
}

#[tokio::test]
async fn a_plain_member_cannot_mute_anybody() {
    let h = Harness::start().await;
    let member = h.cookie_for(ACME_MEMBER, "Mia Member");

    let response = h
        .post_json(
            &format!("/api/v1/rooms/{ACME_ROOM}/members/{}/mute", Uuid::new_v4()),
            &member,
            &serde_json::json!({ "hours": 24 }),
        )
        .await;
    assert_eq!(response.status, 403, "{:?}", response.body);
}

/// A muted member is refused with a code the client can act on, not a blank 403 - and the mute
/// is what refuses them, not a missing capability.
#[tokio::test]
async fn muting_a_member_stops_them_posting_and_says_why() {
    let h = Harness::start().await;
    let moderator = h.cookie_for(ACME_MODERATOR, "Morgan Moderator");
    let member = h.cookie_for(ACME_TARGET, "Tessa Target");
    let member_row = h.member_id_of(ACME_TARGET).await;

    let muted = h
        .post_json(
            &format!("/api/v1/rooms/{ACME_ROOM}/members/{member_row}/mute"),
            &moderator,
            &serde_json::json!({ "hours": 24 }),
        )
        .await;
    assert_eq!(muted.status, 204, "{:?}", muted.body);

    let refused = h
        .post_json(
            &h.message_path(),
            &member,
            &serde_json::json!({ "body": "am I muted?" }),
        )
        .await;
    assert_eq!(refused.status, 403, "{:?}", refused.body);
    assert_eq!(
        refused.body["error"]["code"], "muted",
        "the client needs to distinguish a mute from a missing capability"
    );

    // Undo, so the shared fixture is left as it was found.
    let unmuted = h
        .delete(
            &format!("/api/v1/rooms/{ACME_ROOM}/members/{member_row}/mute"),
            &moderator,
        )
        .await;
    assert_eq!(unmuted.status, 204);

    let allowed = h
        .post_json(
            &h.message_path(),
            &member,
            &serde_json::json!({ "body": "unmuted again" }),
        )
        .await;
    assert_eq!(allowed.status, 200, "{:?}", allowed.body);
    h.purge_message(allowed.body["id"].as_str().expect("id"))
        .await;
}

#[tokio::test]
async fn a_moderator_cannot_mute_themselves() {
    let h = Harness::start().await;
    let moderator = h.cookie_for(ACME_MODERATOR, "Morgan Moderator");
    let own = h.member_id_of(ACME_MODERATOR).await;

    let response = h
        .post_json(
            &format!("/api/v1/rooms/{ACME_ROOM}/members/{own}/mute"),
            &moderator,
            &serde_json::json!({}),
        )
        .await;
    assert_eq!(response.status, 400, "{:?}", response.body);
}

#[tokio::test]
async fn a_personal_mute_is_the_members_own_and_needs_no_role() {
    let h = Harness::start().await;
    let member = h.cookie_for(ACME_MEMBER, "Mia Member");
    let target = h.member_id_of(ACME_OWNER).await;
    let path = format!("/api/v1/rooms/{ACME_ROOM}/members/{target}/personal-mute");

    assert_eq!(
        h.post_json(&path, &member, &serde_json::json!({}))
            .await
            .status,
        204
    );

    let muted = h
        .get(
            &format!("/api/v1/rooms/{ACME_ROOM}/me/muted"),
            Some(&member),
        )
        .await
        .ok();
    assert!(
        muted
            .as_array()
            .expect("a list")
            .iter()
            .any(|id| id == &serde_json::Value::from(target.to_string())),
        "{muted}"
    );

    assert_eq!(h.delete(&path, &member).await.status, 204);
}

#[tokio::test]
async fn renaming_yourself_changes_only_your_own_membership() {
    let h = Harness::start().await;
    let owner = h.cookie_for(ACME_OWNER, "Ada Owner");
    let path = format!("/api/v1/rooms/{ACME_ROOM}/me/display-name");

    let before = h.display_name_of(ACME_MEMBER).await;

    let response = h
        .put_json(
            &path,
            &owner,
            &serde_json::json!({ "displayName": "Ada Renamed" }),
        )
        .await;
    assert_eq!(response.status, 204, "{:?}", response.body);

    // The route has no target parameter at all, so there is nothing to point at another member.
    // This asserts the consequence: nobody else moved.
    assert_eq!(
        h.display_name_of(ACME_MEMBER).await,
        before,
        "renaming yourself must not touch another member"
    );

    h.reset_display_name(ACME_OWNER).await;
}

// ---------------------------------------------------------------- account

#[tokio::test]
async fn account_bootstrap_uses_database_identity_and_stays_inside_the_callers_tenant() {
    let h = Harness::start().await;
    // A valid access token can outlive a display-name change. The bootstrap response must use
    // current database state rather than replaying the signed display name from the cookie.
    let owner = h.cookie_for(ACME_OWNER, "Stale Token Name");

    let body = h.get("/api/v1/account", Some(&owner)).await.ok();
    assert_eq!(body["user"]["id"], ACME_OWNER.to_string());
    assert_eq!(body["user"]["displayName"], "Ada Owner");
    assert_eq!(body["user"]["isPlatformAdmin"], false);
    assert_eq!(body["user"]["isGuest"], false);
    assert!(body["user"]["preferences"].is_object(), "{body}");

    let accounts = body["accounts"].as_array().expect("an accounts array");
    assert_eq!(accounts.len(), 1, "another tenant leaked into {body}");
    assert_eq!(accounts[0]["id"], ACME_ENTERPRISE.to_string());
    assert_eq!(accounts[0]["name"], "Acme Trading");
    assert_eq!(accounts[0]["slug"], "acme-trading");
    assert_eq!(accounts[0]["role"], "owner");

    let rooms = accounts[0]["rooms"].as_array().expect("a rooms array");
    assert_eq!(rooms.len(), 1, "unexpected room membership in {body}");
    assert_eq!(rooms[0]["id"], ACME_ROOM.to_string());
    assert_eq!(rooms[0]["name"], "Main Room");
    assert_eq!(rooms[0]["role"], "owner");

    let encoded = body.to_string();
    assert!(
        !encoded.contains("Beta Trading"),
        "tenant name leaked: {body}"
    );
    assert!(
        !encoded.contains(&BETA_ROOM.to_string()),
        "tenant room leaked: {body}"
    );
    for forbidden_key in [
        "email",
        "emailHash",
        "phone",
        "discordId",
        "passwordHash",
        "accessToken",
        "refreshToken",
    ] {
        assert!(
            !encoded.contains(&format!("\"{forbidden_key}\"")),
            "account bootstrap exposed {forbidden_key}: {body}"
        );
    }
}

#[tokio::test]
async fn account_bootstrap_requires_a_current_database_identity() {
    let h = Harness::start().await;
    assert_eq!(h.get("/api/v1/account", None).await.status, 401);

    // Signature validity alone is insufficient: a deleted account must not bootstrap from
    // claims cached in an otherwise valid access token.
    let absent_user = Uuid::from_u128(0xd000_0001_0000_4000_8000_0000_0000_0001);
    let absent_cookie = h.cookie_for(absent_user, "Deleted User");
    assert_eq!(
        h.get("/api/v1/account", Some(&absent_cookie)).await.status,
        401
    );
}

#[tokio::test]
async fn a_preference_is_merged_rather_than_replacing_the_object() {
    let h = Harness::start().await;
    let owner = h.cookie_for(ACME_OWNER, "Ada Owner");

    let before = h
        .get("/api/v1/account/preferences", Some(&owner))
        .await
        .ok();
    let existing_key = before
        .as_object()
        .expect("an object")
        .keys()
        .next()
        .cloned()
        .expect("the seeded user has preferences");

    let after = h
        .patch_json(
            "/api/v1/account/preferences",
            &owner,
            &serde_json::json!({ "key": "ptrTestKey", "value": "set" }),
        )
        .await
        .ok();

    assert_eq!(after["ptrTestKey"], "set");
    assert_eq!(
        after[&existing_key], before[&existing_key],
        "setting one key must not disturb another"
    );

    // Saving a theme is a shallow merge for the same reason.
    let themed = h
        .put_json(
            "/api/v1/account/theme",
            &owner,
            &serde_json::json!({ "chatTextSize": 42 }),
        )
        .await
        .ok();
    assert_eq!(themed["chatTextSize"], 42);
    assert_eq!(themed["ptrTestKey"], "set", "the theme save cleared a key");

    h.reset_preferences(ACME_OWNER).await;
}

#[tokio::test]
async fn preferences_need_a_session_but_not_a_room() {
    let h = Harness::start().await;
    assert_eq!(h.get("/api/v1/account/preferences", None).await.status, 401);

    // Beta's owner is a member of no Acme room, and still has preferences.
    let beta = h.cookie_for(BETA_OWNER, "Ben Owner");
    assert_eq!(
        h.get("/api/v1/account/preferences", Some(&beta))
            .await
            .status,
        200
    );
}

// ---------------------------------------------------------------- tenancy, again

/// Every new route inherits the same refusal. Worth asserting per surface rather than trusting
/// that the extractor is wired identically everywhere - one route registered without it would
/// be invisible otherwise.
#[tokio::test]
async fn none_of_the_new_routes_reach_another_tenant() {
    let h = Harness::start().await;
    let acme = h.cookie_for(ACME_OWNER, "Ada Owner");

    for path in [
        format!("/api/v1/rooms/{BETA_ROOM}/notes"),
        format!("/api/v1/rooms/{BETA_ROOM}/alerts"),
        format!("/api/v1/rooms/{BETA_ROOM}/polls"),
        format!("/api/v1/rooms/{BETA_ROOM}/me/muted"),
    ] {
        let response = h.get(&path, Some(&acme)).await;
        assert_eq!(response.status, 404, "{path} leaked: {:?}", response.body);
    }
}
