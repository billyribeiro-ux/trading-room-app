//! OpenAPI 3.1 contract for the account-bootstrap boundary.
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
            "title": "Trading Room Account Bootstrap API",
            "version": env!("CARGO_PKG_VERSION"),
            "description": "Authoritative authentication and account-bootstrap contract. This intentionally does not claim to describe the remaining room-runtime routes. Cookies are issued only through the same-origin SvelteKit boundary."
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
            for operation in path.as_object().expect("path item").values() {
                let operation_id = operation["operationId"]
                    .as_str()
                    .expect("every operation has an operationId");
                assert!(
                    operation_ids.insert(operation_id),
                    "duplicate {operation_id}"
                );
            }
        }
    }
}
