//! Generated-schema validation for canonical room settings.
//!
//! Names and scalar types are generated from the same captured controller evidence that produces
//! `apps/controller/src/lib/room-settings-schema.ts`. The Rust boundary owns validation at runtime;
//! it never trusts a controller release to have validated a request first.

use std::collections::BTreeMap;
use std::sync::LazyLock;

use serde::Deserialize;
use serde_json::{Map, Value};

use crate::limits;

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
enum ValueType {
    String,
    Number,
    Boolean,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ManifestSetting {
    name: String,
    value_type: ValueType,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Manifest {
    schema_version: u32,
    settings: Vec<ManifestSetting>,
}

static SETTINGS: LazyLock<BTreeMap<String, ValueType>> = LazyLock::new(|| {
    let manifest: Manifest = serde_json::from_str(include_str!("room-settings-manifest.json"))
        .expect("generated room settings manifest must be valid JSON");
    assert_eq!(manifest.schema_version, 1, "unsupported settings schema");
    let count = manifest.settings.len();
    let settings: BTreeMap<_, _> = manifest
        .settings
        .into_iter()
        .map(|setting| (setting.name, setting.value_type))
        .collect();
    assert_eq!(settings.len(), count, "duplicate room setting name");
    assert_eq!(settings.len(), 269, "room setting inventory drifted");
    settings
});

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum ValidationError {
    #[error("unknown room setting: {0}")]
    Unknown(String),
    #[error("room setting {name} expects {expected}")]
    WrongType {
        name: String,
        expected: &'static str,
    },
    #[error("room setting {0} exceeds the per-value size limit")]
    ValueTooLarge(String),
    #[error("the room settings document exceeds the size limit")]
    DocumentTooLarge,
    #[error("a room title must be 1 to {0} bytes")]
    InvalidRoomName(usize),
}

fn type_name(value_type: ValueType) -> &'static str {
    match value_type {
        ValueType::String => "a string",
        ValueType::Number => "a number",
        ValueType::Boolean => "a boolean",
    }
}

fn matches(value: &Value, value_type: ValueType) -> bool {
    match value_type {
        ValueType::String => value.is_string(),
        ValueType::Number => value.is_number(),
        ValueType::Boolean => value.is_boolean(),
    }
}

/// Validates a partial settings object. `null` is the explicit delete operator.
pub fn validate_patch(values: &Map<String, Value>) -> Result<(), ValidationError> {
    for (name, value) in values {
        let Some(value_type) = SETTINGS.get(name).copied() else {
            return Err(ValidationError::Unknown(name.clone()));
        };
        if value.is_null() {
            continue;
        }
        if !matches(value, value_type) {
            return Err(ValidationError::WrongType {
                name: name.clone(),
                expected: type_name(value_type),
            });
        }
        if serde_json::to_vec(value).map_or(usize::MAX, |bytes| bytes.len())
            > limits::ROOM_SETTING_VALUE_MAX_BYTES
        {
            return Err(ValidationError::ValueTooLarge(name.clone()));
        }
        if name == "name" {
            let title = value.as_str().expect("validated string").trim();
            if title.is_empty() || title.len() > limits::ROOM_NAME_MAX_BYTES {
                return Err(ValidationError::InvalidRoomName(
                    limits::ROOM_NAME_MAX_BYTES,
                ));
            }
        }
    }
    Ok(())
}

/// Validates client-authored changes. A missing setting can be represented as `null` in the
/// submitted base, but the canonical room title is not deletable because `rooms.name` is required.
pub fn validate_updates(values: &Map<String, Value>) -> Result<(), ValidationError> {
    validate_patch(values)?;
    if values.get("name").is_some_and(Value::is_null) {
        return Err(ValidationError::InvalidRoomName(
            limits::ROOM_NAME_MAX_BYTES,
        ));
    }
    Ok(())
}

pub fn validate_document(values: &Map<String, Value>) -> Result<(), ValidationError> {
    validate_patch(values)?;
    if serde_json::to_vec(values).map_or(usize::MAX, |bytes| bytes.len())
        > limits::ROOM_SETTINGS_MAX_BYTES
    {
        return Err(ValidationError::DocumentTooLarge);
    }
    Ok(())
}

/// Applies a validated patch. Null removes a key, matching the legacy store's "unset" state.
pub fn apply_patch(document: &mut Map<String, Value>, patch: &Map<String, Value>) {
    for (name, value) in patch {
        if value.is_null() {
            document.remove(name);
        } else {
            document.insert(name.clone(), value.clone());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn object(value: Value) -> Map<String, Value> {
        value.as_object().expect("object").clone()
    }

    #[test]
    fn generated_inventory_accepts_each_scalar_family_and_rejects_unknowns() {
        validate_patch(&object(json!({
            "name": "Evidence Room",
            "isLocked": true,
            "simUserCount": 7
        })))
        .unwrap();
        assert!(matches!(
            validate_patch(&object(json!({ "invented": true }))),
            Err(ValidationError::Unknown(name)) if name == "invented"
        ));
    }

    #[test]
    fn types_titles_and_delete_operator_are_exact() {
        assert!(matches!(
            validate_patch(&object(json!({ "isLocked": "yes" }))),
            Err(ValidationError::WrongType { .. })
        ));
        assert!(matches!(
            validate_patch(&object(json!({ "name": "   " }))),
            Err(ValidationError::InvalidRoomName(_))
        ));
        validate_patch(&object(json!({ "isLocked": null }))).unwrap();
        validate_patch(&object(json!({ "name": null }))).unwrap();
        assert!(matches!(
            validate_updates(&object(json!({ "name": null }))),
            Err(ValidationError::InvalidRoomName(_))
        ));

        let mut current = object(json!({ "isLocked": true, "name": "Before" }));
        apply_patch(
            &mut current,
            &object(json!({ "isLocked": null, "name": "After" })),
        );
        assert_eq!(current, object(json!({ "name": "After" })));
    }
}
