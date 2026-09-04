//! OpenAPI 3.1 contract for the account-authority boundary.
//!
//! This document is generated from Rust-owned constants and served by the same binary as the
//! handlers. The committed JSON snapshot feeds the SvelteKit type generator; the equality test
//! below makes a stale snapshot a build failure instead of a client surprise.

use serde_json::{Value, json};

#[must_use]
pub fn document() -> Value {
    json!({
        "openapi": "3.1.1",
        "jsonSchemaDialect": "https://json-schema.org/draft/2020-12/schema",
        "info": {
            "title": "Trading Room Account Authority API",
            "version": env!("CARGO_PKG_VERSION"),
            "description": "Authoritative authentication, profile, preference, account-bootstrap, and account room-lifecycle contract. This intentionally does not claim to describe the remaining live-room runtime routes. Cookies are issued only through the same-origin SvelteKit boundary."
        },
        "tags": [
            { "name": "Authentication" },
            { "name": "Account" }
        ],
        "paths": {
            "/api/auth/login": {
                "post": {
                    "operationId": "login",
                    "tags": ["Authentication"],
                    "requestBody": {
                        "required": true,
                        "content": {
                            "application/json": {
                                "schema": { "$ref": "#/components/schemas/LoginRequest" }
                            }
                        }
                    },
                    "responses": {
                        "200": {
                            "description": "Authenticated; sets access and refresh cookies.",
                            "headers": {
                                "Set-Cookie": { "schema": { "type": "string" } }
                            },
                            "content": {
                                "application/json": {
                                    "schema": { "$ref": "#/components/schemas/Session" }
                                }
                            }
                        },
                        "400": { "$ref": "#/components/responses/BadRequest" },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "429": { "$ref": "#/components/responses/RateLimited" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                }
            },
            "/api/auth/refresh": {
                "post": {
                    "operationId": "refreshSession",
                    "tags": ["Authentication"],
                    "security": [{ "refreshCookie": [] }],
                    "responses": {
                        "200": {
                            "description": "Session rotated; replaces access and refresh cookies.",
                            "headers": {
                                "Set-Cookie": { "schema": { "type": "string" } }
                            },
                            "content": {
                                "application/json": {
                                    "schema": { "$ref": "#/components/schemas/Session" }
                                }
                            }
                        },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "403": { "$ref": "#/components/responses/Forbidden" },
                        "429": { "$ref": "#/components/responses/RateLimited" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                }
            },
            "/api/auth/logout": {
                "post": {
                    "operationId": "logout",
                    "tags": ["Authentication"],
                    "security": [{ "refreshCookie": [] }],
                    "responses": {
                        "204": {
                            "description": "Session family revoked and browser cookies expired.",
                            "headers": {
                                "Set-Cookie": { "schema": { "type": "string" } }
                            }
                        },
                        "403": { "$ref": "#/components/responses/Forbidden" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                }
            },
            "/api/v1/account": {
                "get": {
                    "operationId": "getAccountBootstrap",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "responses": {
                        "200": {
                            "description": "Current database identity and explicit owner/admin account memberships.",
                            "content": {
                                "application/json": {
                                    "schema": { "$ref": "#/components/schemas/AccountBootstrap" }
                                }
                            }
                        },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                },
                "patch": {
                    "operationId": "updateAccountProfile",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "requestBody": {
                        "required": true,
                        "content": {
                            "application/json": {
                                "schema": { "$ref": "#/components/schemas/ProfileUpdateRequest" }
                            }
                        }
                    },
                    "responses": {
                        "200": {
                            "description": "Committed canonical profile after the atomic update.",
                            "content": {
                                "application/json": {
                                    "schema": { "$ref": "#/components/schemas/CurrentUser" }
                                }
                            }
                        },
                        "400": { "$ref": "#/components/responses/BadRequest" },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "403": { "$ref": "#/components/responses/Forbidden" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                }
            },
            "/api/v1/account/preferences": {
                "get": {
                    "operationId": "getAccountPreferences",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "responses": {
                        "200": {
                            "description": "Current canonical preferences.",
                            "content": {
                                "application/json": {
                                    "schema": { "$ref": "#/components/schemas/Preferences" }
                                }
                            }
                        },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                },
                "patch": {
                    "operationId": "setAccountPreference",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "requestBody": {
                        "required": true,
                        "content": {
                            "application/json": {
                                "schema": { "$ref": "#/components/schemas/PreferenceRequest" }
                            }
                        }
                    },
                    "responses": {
                        "200": {
                            "description": "Preferences after the atomic key update.",
                            "content": {
                                "application/json": {
                                    "schema": { "$ref": "#/components/schemas/Preferences" }
                                }
                            }
                        },
                        "400": { "$ref": "#/components/responses/BadRequest" },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                }
            },
            "/api/v1/account/theme": {
                "put": {
                    "operationId": "updateAccountTheme",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "requestBody": {
                        "required": true,
                        "content": {
                            "application/json": {
                                "schema": { "$ref": "#/components/schemas/Preferences" }
                            }
                        }
                    },
                    "responses": {
                        "200": {
                            "description": "Preferences after the shallow theme merge.",
                            "content": {
                                "application/json": {
                                    "schema": { "$ref": "#/components/schemas/Preferences" }
                                }
                            }
                        },
                        "400": { "$ref": "#/components/responses/BadRequest" },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                }
            },
            "/api/v1/accounts/{enterprise_id}/rooms": {
                "parameters": [{
                    "name": "enterprise_id",
                    "in": "path",
                    "required": true,
                    "schema": uuid_schema()
                }],
                "get": {
                    "operationId": "listAccountRooms",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "responses": {
                        "200": {
                            "description": "Canonical lifecycle data for every room in an administered account.",
                            "content": { "application/json": { "schema": {
                                "type": "array", "items": { "$ref": "#/components/schemas/ManagedRoom" }
                            } } }
                        },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "404": { "$ref": "#/components/responses/NotFound" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                },
                "post": {
                    "operationId": "createAccountRoom",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "requestBody": {
                        "required": true,
                        "content": { "application/json": { "schema": {
                            "$ref": "#/components/schemas/CreateAccountRoomRequest"
                        } } }
                    },
                    "responses": {
                        "200": {
                            "description": "The created room, or the original room on an idempotent retry.",
                            "content": { "application/json": { "schema": {
                                "$ref": "#/components/schemas/ManagedRoom"
                            } } }
                        },
                        "400": { "$ref": "#/components/responses/BadRequest" },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "404": { "$ref": "#/components/responses/NotFound" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                }
            },
            "/api/v1/accounts/{enterprise_id}/rooms/{room_id}": {
                "parameters": [
                    { "name": "enterprise_id", "in": "path", "required": true, "schema": uuid_schema() },
                    { "name": "room_id", "in": "path", "required": true, "schema": uuid_schema() }
                ],
                "patch": {
                    "operationId": "setAccountRoomArchived",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "requestBody": {
                        "required": true,
                        "content": { "application/json": { "schema": {
                            "$ref": "#/components/schemas/ArchiveAccountRoomRequest"
                        } } }
                    },
                    "responses": {
                        "200": {
                            "description": "Canonical room state after the idempotent archive transition.",
                            "content": { "application/json": { "schema": {
                                "$ref": "#/components/schemas/ManagedRoom"
                            } } }
                        },
                        "400": { "$ref": "#/components/responses/BadRequest" },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "404": { "$ref": "#/components/responses/NotFound" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                }
            }
        },
        "components": {
            "securitySchemes": {
                "accessCookie": {
                    "type": "apiKey",
                    "in": "cookie",
                    "name": crate::http::ACCESS_COOKIE
                },
                "refreshCookie": {
                    "type": "apiKey",
                    "in": "cookie",
                    "name": crate::http::REFRESH_COOKIE
                }
            },
            "responses": {
                "BadRequest": error_response("Invalid request."),
                "Unauthorized": error_response("Authentication is absent, expired, or invalid."),
                "Forbidden": error_response("The exact browser origin was not accepted."),
                "NotFound": error_response("The resource does not exist or is outside the caller's authority."),
                "RateLimited": error_response("The request budget is exhausted."),
                "Unavailable": error_response("A required dependency is unavailable.")
            },
            "schemas": {
                "LoginRequest": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["email", "password"],
                    "properties": {
                        "email": { "type": "string" },
                        "password": { "type": "string" }
                    }
                },
                "Session": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["userId", "displayName", "isPlatformAdmin", "expiresAt"],
                    "properties": {
                        "userId": uuid_schema(),
                        "displayName": { "type": "string" },
                        "isPlatformAdmin": { "type": "boolean" },
                        "expiresAt": { "type": "integer", "format": "int64" }
                    }
                },
                "AccountBootstrap": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["user", "accounts"],
                    "properties": {
                        "user": { "$ref": "#/components/schemas/CurrentUser" },
                        "accounts": {
                            "type": "array",
                            "items": { "$ref": "#/components/schemas/Account" }
                        }
                    }
                },
                "CurrentUser": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["id", "displayName", "isPlatformAdmin", "isGuest", "preferences"],
                    "properties": {
                        "id": uuid_schema(),
                        "displayName": { "type": "string" },
                        "isPlatformAdmin": { "type": "boolean" },
                        "isGuest": { "type": "boolean" },
                        "preferences": { "type": "object", "additionalProperties": true }
                    }
                },
                "ProfileUpdateRequest": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["displayName", "preferences"],
                    "properties": {
                        "displayName": { "type": "string", "minLength": 1, "maxLength": crate::limits::DISPLAY_NAME_MAX_BYTES },
                        "preferences": { "$ref": "#/components/schemas/Preferences" }
                    }
                },
                "PreferenceRequest": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["key", "value"],
                    "properties": {
                        "key": { "type": "string", "minLength": 1, "maxLength": crate::limits::PREFERENCE_KEY_MAX_BYTES },
                        "value": {}
                    }
                },
                "Preferences": {
                    "type": "object",
                    "additionalProperties": true
                },
                "Account": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["id", "name", "slug", "role", "rooms"],
                    "properties": {
                        "id": uuid_schema(),
                        "name": { "type": "string" },
                        "slug": { "type": "string" },
                        "role": { "$ref": "#/components/schemas/AccountRole" },
                        "rooms": {
                            "type": "array",
                            "items": { "$ref": "#/components/schemas/AccountRoom" }
                        }
                    }
                },
                "AccountRole": {
                    "type": "string",
                    "enum": ["owner", "admin"]
                },
                "AccountRoom": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["id", "name", "state", "memberId", "role"],
                    "properties": {
                        "id": uuid_schema(),
                        "name": { "type": "string" },
                        "state": { "type": "string" },
                        "memberId": uuid_schema(),
                        "role": {
                            "type": "string",
                            "enum": ["owner", "presenter", "limited_presenter", "moderator", "member"]
                        }
                    }
                },
                "ManagedRoom": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["id", "shortCode", "name", "state", "maxCapacity", "memberCount", "archivedAt", "createdAt"],
                    "properties": {
                        "id": uuid_schema(),
                        "shortCode": { "type": "string" },
                        "name": { "type": "string" },
                        "state": { "type": "string", "enum": ["open", "closed", "locked"] },
                        "maxCapacity": { "type": "integer" },
                        "memberCount": { "type": "integer" },
                        "archivedAt": { "type": ["string", "null"], "format": "date-time" },
                        "createdAt": { "type": "string", "format": "date-time" }
                    }
                },
                "CreateAccountRoomRequest": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["requestId", "name"],
                    "properties": {
                        "requestId": uuid_schema(),
                        "name": {
                            "type": "string",
                            "minLength": 1,
                            "maxLength": crate::limits::ROOM_NAME_MAX_BYTES,
                            "description": "After trimming, the UTF-8 encoding must contain at most 160 bytes.",
                            "x-maxBytes": crate::limits::ROOM_NAME_MAX_BYTES
                        }
                    }
                },
                "ArchiveAccountRoomRequest": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["archived"],
                    "properties": { "archived": { "type": "boolean" } }
                },
                "Error": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["error"],
                    "properties": {
                        "error": {
                            "type": "object",
                            "additionalProperties": false,
                            "required": ["code", "message"],
                            "properties": {
                                "code": { "type": "string" },
                                "message": { "type": "string" }
                            }
                        }
                    }
                }
            }
        }
    })
}

fn uuid_schema() -> Value {
    json!({ "type": "string", "format": "uuid" })
}

fn error_response(description: &str) -> Value {
    json!({
        "description": description,
        "content": {
            "application/json": {
                "schema": { "$ref": "#/components/schemas/Error" }
            }
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn committed_document_is_the_generated_contract() {
        let committed: Value = serde_json::from_str(include_str!("../openapi/v1.json"))
            .expect("the committed OpenAPI document is valid JSON");
        assert_eq!(committed, document(), "run the OpenAPI snapshot generator");
    }

    #[test]
    fn every_operation_has_a_unique_stable_id() {
        let document = document();
        let mut operation_ids = std::collections::BTreeSet::new();
        let paths = document["paths"].as_object().expect("OpenAPI paths object");
        for path in paths.values() {
            for (member, operation) in path.as_object().expect("path item") {
                if ![
                    "get", "put", "post", "delete", "options", "head", "patch", "trace",
                ]
                .contains(&member.as_str())
                {
                    continue;
                }
                let operation_id = operation["operationId"]
                    .as_str()
                    .expect("every operation has an operationId");
                assert!(
                    operation_ids.insert(operation_id),
                    "duplicate {operation_id}"
                );
            }
        }
        assert_eq!(
            operation_ids,
            std::collections::BTreeSet::from([
                "createAccountRoom",
                "getAccountBootstrap",
                "getAccountPreferences",
                "listAccountRooms",
                "login",
                "logout",
                "refreshSession",
                "setAccountPreference",
                "setAccountRoomArchived",
                "updateAccountProfile",
                "updateAccountTheme",
            ])
        );
    }

    #[test]
    fn room_name_contract_names_its_utf8_byte_limit() {
        let document = document();
        let name =
            &document["components"]["schemas"]["CreateAccountRoomRequest"]["properties"]["name"];
        assert_eq!(name["maxLength"], crate::limits::ROOM_NAME_MAX_BYTES);
        assert_eq!(name["x-maxBytes"], crate::limits::ROOM_NAME_MAX_BYTES);
        assert!(
            name["description"]
                .as_str()
                .is_some_and(|description| description.contains("UTF-8")),
            "the interoperable extension must explain that the server enforces encoded bytes"
        );
    }
}
