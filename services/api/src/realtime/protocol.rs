//! The wire envelope, borrowed from the SFU so a browser holds one mental model.
//!
//! ```text
//! request       {id, cmd, data?}
//! reply         {id, ok, data|error{code,message}}
//! notification  {notify, data}
//! ```
//!
//! The load-bearing detail is that a **notification carries no `id`**. A client correlates
//! replies by `id`, so a server-initiated message that happened to carry one could be matched
//! against a pending request and resolve it with the wrong payload. Absence is what makes that
//! unrepresentable rather than merely unlikely.

use serde::{Deserialize, Serialize};

use crate::db::repo::event::Event;

/// A client command.
#[derive(Debug, Deserialize)]
pub struct Request {
    /// Echoed back on the reply. Optional so a fire-and-forget command is expressible; a
    /// reply to one simply carries `id: null`.
    pub id: Option<serde_json::Value>,
    pub cmd: String,
    pub data: Option<serde_json::Value>,
}

/// The answer to exactly one [`Request`].
#[derive(Debug, Serialize)]
pub struct Reply {
    pub id: Option<serde_json::Value>,
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<ReplyError>,
}

#[derive(Debug, Serialize)]
pub struct ReplyError {
    /// Stable and machine-readable. Clients branch on this, never on `message`.
    pub code: String,
    pub message: String,
}

impl Reply {
    #[must_use]
    pub fn ok(id: Option<serde_json::Value>, data: serde_json::Value) -> Self {
        Self {
            id,
            ok: true,
            data: Some(data),
            error: None,
        }
    }

    #[must_use]
    pub fn error(id: Option<serde_json::Value>, code: &str, message: &str) -> Self {
        Self {
            id,
            ok: false,
            data: None,
            error: Some(ReplyError {
                code: code.to_owned(),
                message: message.to_owned(),
            }),
        }
    }
}

/// A server-initiated message. Note the absence of `id`.
#[derive(Debug, Serialize)]
pub struct Notification<'a> {
    pub notify: &'static str,
    pub data: serde_json::Value,
    #[serde(skip)]
    _marker: std::marker::PhantomData<&'a ()>,
}

impl<'a> Notification<'a> {
    fn new(notify: &'static str, data: serde_json::Value) -> Self {
        Self {
            notify,
            data,
            _marker: std::marker::PhantomData,
        }
    }

    /// Sent once the catch-up is complete, carrying the sequence the client is now at.
    #[must_use]
    pub fn ready(seq: i64) -> Self {
        Self::new("ready", serde_json::json!({ "seq": seq }))
    }

    /// One room event.
    #[must_use]
    pub fn event(event: &Event) -> Self {
        Self::new(
            "event",
            serde_json::to_value(event).unwrap_or_else(|_| serde_json::json!({})),
        )
    }

    /// The client's cursor is too far behind to replay; it should refetch and reconnect.
    #[must_use]
    pub fn resync() -> Self {
        Self::new("resync", serde_json::json!({ "reason": "gap too large" }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_notification_never_carries_an_id() {
        // The structural guarantee: a client matches replies by `id`, so a notification that
        // carried one could resolve a pending request with the wrong payload.
        for notification in [
            Notification::ready(7),
            Notification::resync(),
            Notification::event(&Event {
                seq: 1,
                id: uuid::Uuid::nil(),
                kind: "message.created".into(),
                scope: "room".into(),
                audience_member_id: None,
                payload: serde_json::json!({}),
                origin_member_id: None,
                created_at: time::OffsetDateTime::UNIX_EPOCH,
            }),
        ] {
            let json = serde_json::to_value(&notification).expect("serialises");
            assert!(json.get("id").is_none(), "{json}");
            assert!(json.get("notify").is_some(), "{json}");
            assert!(
                json.get("ok").is_none(),
                "a notification is not a reply: {json}"
            );
        }
    }

    #[test]
    fn a_reply_carries_exactly_one_of_data_or_error() {
        let ok = serde_json::to_value(Reply::ok(
            Some(serde_json::json!(1)),
            serde_json::json!({"pong": true}),
        ))
        .expect("serialises");
        assert_eq!(ok["ok"], true);
        assert!(ok.get("data").is_some());
        assert!(ok.get("error").is_none(), "{ok}");

        let failed =
            serde_json::to_value(Reply::error(Some(serde_json::json!(2)), "nope", "because"))
                .expect("serialises");
        assert_eq!(failed["ok"], false);
        assert!(failed.get("data").is_none(), "{failed}");
        assert_eq!(failed["error"]["code"], "nope");
    }

    #[test]
    fn a_reply_echoes_the_id_it_was_asked_with() {
        // Correlation is the whole job. A string id must come back a string, not coerced.
        let id = serde_json::json!("abc-123");
        let reply = serde_json::to_value(Reply::ok(Some(id.clone()), serde_json::json!({})))
            .expect("serialises");
        assert_eq!(reply["id"], id);
    }

    #[test]
    fn a_request_without_an_id_is_still_a_valid_request() {
        let request: Request = serde_json::from_str(r#"{"cmd":"ping"}"#).expect("id is optional");
        assert_eq!(request.cmd, "ping");
        assert!(request.id.is_none());
        assert!(request.data.is_none());
    }

    #[test]
    fn a_request_missing_its_command_is_refused() {
        assert!(serde_json::from_str::<Request>(r#"{"id":1}"#).is_err());
    }
}
