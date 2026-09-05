//! OpenAPI 3.1 contract for the account-authority and customer statistics boundaries.
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
            "title": "Trading Room Authority API",
            "version": env!("CARGO_PKG_VERSION"),
            "description": "Authoritative authentication, profile, account-management, room-lifecycle, and customer statistics contract. This intentionally does not claim to describe the remaining live-room runtime routes. Browser cookies are issued only through the same-origin SvelteKit boundary; customer statistics use separately managed query credentials for legacy compatibility."
        },
        "tags": [
            { "name": "Authentication" },
            { "name": "Account" },
            { "name": "Customer Statistics" }
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
            },
            "/api/v1/accounts/{enterprise_id}/rooms/{room_id}/launch": {
                "parameters": [
                    { "name": "enterprise_id", "in": "path", "required": true, "schema": uuid_schema() },
                    { "name": "room_id", "in": "path", "required": true, "schema": uuid_schema() }
                ],
                "post": {
                    "operationId": "launchAccountRoom",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "description": "Atomically authorizes room entry and records one idempotent canonical visit.",
                    "requestBody": {
                        "required": true,
                        "content": { "application/json": { "schema": {
                            "$ref": "#/components/schemas/LaunchAccountRoomRequest"
                        } } }
                    },
                    "responses": {
                        "200": {
                            "description": "Canonical identity and visit committed for the room handoff.",
                            "content": { "application/json": { "schema": {
                                "$ref": "#/components/schemas/RoomLaunchVisit"
                            } } }
                        },
                        "400": { "$ref": "#/components/responses/BadRequest" },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "403": { "$ref": "#/components/responses/Forbidden" },
                        "404": { "$ref": "#/components/responses/NotFound" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                }
            },
            "/api/v1/accounts/{enterprise_id}/rooms/{room_id}/settings": {
                "parameters": [
                    { "name": "enterprise_id", "in": "path", "required": true, "schema": uuid_schema() },
                    { "name": "room_id", "in": "path", "required": true, "schema": uuid_schema() }
                ],
                "get": {
                    "operationId": "getAccountRoomSettings",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "responses": {
                        "200": {
                            "description": "The canonical settings document and its concurrency revision.",
                            "content": { "application/json": { "schema": {
                                "$ref": "#/components/schemas/AccountRoomSettings"
                            } } }
                        },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "404": { "$ref": "#/components/responses/NotFound" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                },
                "patch": {
                    "operationId": "patchAccountRoomSettings",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "requestBody": {
                        "required": true,
                        "content": { "application/json": { "schema": {
                            "$ref": "#/components/schemas/PatchAccountRoomSettingsRequest"
                        } } }
                    },
                    "responses": {
                        "200": {
                            "description": "The settings document after an atomic or idempotently replayed mutation.",
                            "content": { "application/json": { "schema": {
                                "$ref": "#/components/schemas/AccountRoomSettings"
                            } } }
                        },
                        "400": { "$ref": "#/components/responses/BadRequest" },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "404": { "$ref": "#/components/responses/NotFound" },
                        "409": { "$ref": "#/components/responses/Conflict" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                }
            },
            "/api/v1/accounts/{enterprise_id}/rooms/{room_id}/members": {
                "parameters": [
                    { "name": "enterprise_id", "in": "path", "required": true, "schema": uuid_schema() },
                    { "name": "room_id", "in": "path", "required": true, "schema": uuid_schema() }
                ],
                "get": {
                    "operationId": "listAccountRoomMembers",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "responses": {
                        "200": {
                            "description": "Canonical account-managed membership projection.",
                            "content": { "application/json": { "schema": {
                                "type": "array", "items": { "$ref": "#/components/schemas/ManagedMember" }
                            } } }
                        },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "404": { "$ref": "#/components/responses/NotFound" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                },
                "post": {
                    "operationId": "inviteAccountRoomMember",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "requestBody": { "required": true, "content": { "application/json": { "schema": {
                        "$ref": "#/components/schemas/InviteMemberRequest"
                    } } } },
                    "responses": {
                        "200": { "description": "Exactly-once invitation result.", "content": {
                            "application/json": { "schema": { "$ref": "#/components/schemas/MembershipMutationResponse" } }
                        } },
                        "400": { "$ref": "#/components/responses/BadRequest" },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "404": { "$ref": "#/components/responses/NotFound" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                },
                "patch": {
                    "operationId": "manageAccountRoomMembers",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "requestBody": { "required": true, "content": { "application/json": { "schema": {
                        "$ref": "#/components/schemas/ManageMembersRequest"
                    } } } },
                    "responses": {
                        "200": { "description": "Exactly-once committed membership mutation.", "content": {
                            "application/json": { "schema": { "$ref": "#/components/schemas/MembershipMutationResponse" } }
                        } },
                        "400": { "$ref": "#/components/responses/BadRequest" },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "404": { "$ref": "#/components/responses/NotFound" },
                        "409": { "$ref": "#/components/responses/Conflict" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                }
            },
            "/api/v1/accounts/{enterprise_id}/administrators": {
                "parameters": [
                    { "name": "enterprise_id", "in": "path", "required": true, "schema": uuid_schema() }
                ],
                "get": {
                    "operationId": "listAccountAdministrators",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "responses": {
                        "200": { "description": "Canonical account administrators; owner authority is intentionally excluded.", "content": {
                            "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/ManagedAdministrator" } } }
                        } },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "404": { "$ref": "#/components/responses/NotFound" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                },
                "post": {
                    "operationId": "createAccountAdministrator",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "requestBody": { "required": true, "content": { "application/json": { "schema": {
                        "$ref": "#/components/schemas/CreateAdministratorRequest"
                    } } } },
                    "responses": {
                        "200": { "description": "Exactly-once administrator creation result.", "content": {
                            "application/json": { "schema": { "$ref": "#/components/schemas/AdministratorMutationResponse" } }
                        } },
                        "400": { "$ref": "#/components/responses/BadRequest" },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "404": { "$ref": "#/components/responses/NotFound" },
                        "409": { "$ref": "#/components/responses/Conflict" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                }
            },
            "/api/v1/accounts/{enterprise_id}/administrators/{user_id}": {
                "parameters": [
                    { "name": "enterprise_id", "in": "path", "required": true, "schema": uuid_schema() },
                    { "name": "user_id", "in": "path", "required": true, "schema": uuid_schema() }
                ],
                "delete": {
                    "operationId": "deleteAccountAdministrator",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "requestBody": { "required": true, "content": { "application/json": { "schema": {
                        "$ref": "#/components/schemas/DeleteAdministratorRequest"
                    } } } },
                    "responses": {
                        "200": { "description": "Exactly-once revisioned administrator removal.", "content": {
                            "application/json": { "schema": { "$ref": "#/components/schemas/AdministratorMutationResponse" } }
                        } },
                        "400": { "$ref": "#/components/responses/BadRequest" },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "404": { "$ref": "#/components/responses/NotFound" },
                        "409": { "$ref": "#/components/responses/Conflict" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                }
            },
            "/api/v1/accounts/{enterprise_id}/customer-api-keys": {
                "parameters": [{
                    "name": "enterprise_id", "in": "path", "required": true,
                    "schema": uuid_schema()
                }],
                "get": {
                    "operationId": "listAccountCustomerApiKeys",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "responses": {
                        "200": { "description": "Canonical secret-free customer API-key metadata.", "content": {
                            "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/ManagedCustomerApiKey" } } }
                        } },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "404": { "$ref": "#/components/responses/NotFound" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                },
                "post": {
                    "operationId": "createAccountCustomerApiKey",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "requestBody": { "required": true, "content": { "application/json": { "schema": {
                        "$ref": "#/components/schemas/CreateCustomerApiKeyRequest"
                    } } } },
                    "responses": {
                        "200": { "description": "Exactly-once customer API-key creation result; credential plaintext is never returned.", "content": {
                            "application/json": { "schema": { "$ref": "#/components/schemas/CustomerApiKeyMutationResponse" } }
                        } },
                        "400": { "$ref": "#/components/responses/BadRequest" },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "404": { "$ref": "#/components/responses/NotFound" },
                        "409": { "$ref": "#/components/responses/Conflict" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                }
            },
            "/api/v1/accounts/{enterprise_id}/customer-api-keys/{key_id}/rotate": {
                "parameters": [
                    { "name": "enterprise_id", "in": "path", "required": true, "schema": uuid_schema() },
                    { "name": "key_id", "in": "path", "required": true, "schema": { "type": "string", "pattern": "^[0-9a-f]{24}$" } }
                ],
                "post": {
                    "operationId": "rotateAccountCustomerApiKey",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "requestBody": { "required": true, "content": { "application/json": { "schema": {
                        "$ref": "#/components/schemas/RotateCustomerApiKeyRequest"
                    } } } },
                    "responses": {
                        "200": { "description": "Exactly-once revisioned verifier rotation.", "content": {
                            "application/json": { "schema": { "$ref": "#/components/schemas/CustomerApiKeyMutationResponse" } }
                        } },
                        "400": { "$ref": "#/components/responses/BadRequest" },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "404": { "$ref": "#/components/responses/NotFound" },
                        "409": { "$ref": "#/components/responses/Conflict" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                }
            },
            "/api/v1/accounts/{enterprise_id}/customer-api-keys/{key_id}/restrictions": {
                "parameters": [
                    { "name": "enterprise_id", "in": "path", "required": true, "schema": uuid_schema() },
                    { "name": "key_id", "in": "path", "required": true, "schema": { "type": "string", "pattern": "^[0-9a-f]{24}$" } }
                ],
                "put": {
                    "operationId": "restrictAccountCustomerApiKey",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "requestBody": { "required": true, "content": { "application/json": { "schema": {
                        "$ref": "#/components/schemas/RestrictCustomerApiKeyRequest"
                    } } } },
                    "responses": {
                        "200": { "description": "Exactly-once revisioned restriction update.", "content": {
                            "application/json": { "schema": { "$ref": "#/components/schemas/CustomerApiKeyMutationResponse" } }
                        } },
                        "400": { "$ref": "#/components/responses/BadRequest" },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "404": { "$ref": "#/components/responses/NotFound" },
                        "409": { "$ref": "#/components/responses/Conflict" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                }
            },
            "/api/v1/accounts/{enterprise_id}/customer-api-keys/{key_id}": {
                "parameters": [
                    { "name": "enterprise_id", "in": "path", "required": true, "schema": uuid_schema() },
                    { "name": "key_id", "in": "path", "required": true, "schema": { "type": "string", "pattern": "^[0-9a-f]{24}$" } }
                ],
                "delete": {
                    "operationId": "deleteAccountCustomerApiKey",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "requestBody": { "required": true, "content": { "application/json": { "schema": {
                        "$ref": "#/components/schemas/DeleteCustomerApiKeyRequest"
                    } } } },
                    "responses": {
                        "200": { "description": "Exactly-once revisioned customer API-key revocation.", "content": {
                            "application/json": { "schema": { "$ref": "#/components/schemas/CustomerApiKeyMutationResponse" } }
                        } },
                        "400": { "$ref": "#/components/responses/BadRequest" },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "404": { "$ref": "#/components/responses/NotFound" },
                        "409": { "$ref": "#/components/responses/Conflict" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                }
            },
            "/api/v1/accounts/{enterprise_id}/badges": {
                "parameters": [
                    { "name": "enterprise_id", "in": "path", "required": true, "schema": uuid_schema() }
                ],
                "get": {
                    "operationId": "listAccountBadges",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "responses": {
                        "200": { "description": "Canonical enterprise badge definitions.", "content": {
                            "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/ManagedBadge" } } }
                        } },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "404": { "$ref": "#/components/responses/NotFound" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                },
                "post": {
                    "operationId": "createAccountBadge",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "requestBody": { "required": true, "content": { "application/json": { "schema": {
                        "$ref": "#/components/schemas/CreateBadgeRequest"
                    } } } },
                    "responses": {
                        "200": { "description": "Exactly-once badge creation result.", "content": {
                            "application/json": { "schema": { "$ref": "#/components/schemas/BadgeMutationResponse" } }
                        } },
                        "400": { "$ref": "#/components/responses/BadRequest" },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "404": { "$ref": "#/components/responses/NotFound" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                }
            },
            "/api/v1/accounts/{enterprise_id}/badges/{badge_id}": {
                "parameters": [
                    { "name": "enterprise_id", "in": "path", "required": true, "schema": uuid_schema() },
                    { "name": "badge_id", "in": "path", "required": true, "schema": uuid_schema() }
                ],
                "patch": {
                    "operationId": "updateAccountBadge",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "requestBody": { "required": true, "content": { "application/json": { "schema": {
                        "$ref": "#/components/schemas/UpdateBadgeRequest"
                    } } } },
                    "responses": {
                        "200": { "description": "Exactly-once revisioned badge update.", "content": {
                            "application/json": { "schema": { "$ref": "#/components/schemas/BadgeMutationResponse" } }
                        } },
                        "400": { "$ref": "#/components/responses/BadRequest" },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "404": { "$ref": "#/components/responses/NotFound" },
                        "409": { "$ref": "#/components/responses/Conflict" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                },
                "delete": {
                    "operationId": "deleteAccountBadge",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "requestBody": { "required": true, "content": { "application/json": { "schema": {
                        "$ref": "#/components/schemas/DeleteBadgeRequest"
                    } } } },
                    "responses": {
                        "200": { "description": "Exactly-once badge deletion and affected projections.", "content": {
                            "application/json": { "schema": { "$ref": "#/components/schemas/BadgeMutationResponse" } }
                        } },
                        "400": { "$ref": "#/components/responses/BadRequest" },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "404": { "$ref": "#/components/responses/NotFound" },
                        "409": { "$ref": "#/components/responses/Conflict" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                }
            },
            "/api/v1/accounts/{enterprise_id}/rooms/{room_id}/badge-assignments": {
                "parameters": [
                    { "name": "enterprise_id", "in": "path", "required": true, "schema": uuid_schema() },
                    { "name": "room_id", "in": "path", "required": true, "schema": uuid_schema() }
                ],
                "post": {
                    "operationId": "assignAccountRoomBadges",
                    "tags": ["Account"],
                    "security": [{ "accessCookie": [] }],
                    "requestBody": { "required": true, "content": { "application/json": { "schema": {
                        "$ref": "#/components/schemas/AssignBadgesRequest"
                    } } } },
                    "responses": {
                        "200": { "description": "Exactly-once revisioned member badge assignment.", "content": {
                            "application/json": { "schema": { "$ref": "#/components/schemas/BadgeMutationResponse" } }
                        } },
                        "400": { "$ref": "#/components/responses/BadRequest" },
                        "401": { "$ref": "#/components/responses/Unauthorized" },
                        "404": { "$ref": "#/components/responses/NotFound" },
                        "409": { "$ref": "#/components/responses/Conflict" },
                        "503": { "$ref": "#/components/responses/Unavailable" }
                    }
                }
            },
            "/stats/v1/sessions/list": {
                "get": external_stats_get(
                    "listCustomerStatsSessions",
                    "Lists canonical sessions visible to the key after session restrictions are applied.",
                    "StatsSessionsResponse",
                    vec![],
                )
            },
            "/stats/v1/sessions/users": {
                "get": external_stats_get(
                    "listCustomerStatsUsers",
                    "Lists canonical members for one session.",
                    "StatsUsersResponse",
                    vec![stats_session_parameter()],
                )
            },
            "/stats/v1/sessions/userstats": {
                "get": external_stats_get(
                    "listCustomerStatsVisits",
                    "Lists at most 10,000 canonical room visits in the requested date window.",
                    "StatsVisitsResponse",
                    vec![
                        stats_session_parameter(),
                        stats_date_parameter("fromDate"),
                        stats_date_parameter("toDate"),
                        stats_query_parameter("isMobile", false, json!({ "type": "boolean" })),
                    ],
                )
            },
            "/stats/v1/sessions/chatlogs": {
                "get": external_stats_get(
                    "listCustomerStatsChatLogs",
                    "Lists at most 10,000 retained canonical chat messages for one channel.",
                    "StatsChatLogsResponse",
                    vec![
                        stats_session_parameter(),
                        stats_query_parameter("channel", false, json!({ "type": "string", "minLength": 1, "maxLength": 120, "default": "main" })),
                        stats_date_parameter("fromDate"),
                        stats_date_parameter("toDate"),
                    ],
                )
            },
            "/stats/v1/sessions/alertlogs": {
                "get": external_stats_get(
                    "listCustomerStatsAlertLogs",
                    "Lists at most 10,000 retained canonical alerts. The historical response field is chatlogs.",
                    "StatsAlertLogsResponse",
                    vec![stats_session_parameter(), stats_date_parameter("fromDate"), stats_date_parameter("toDate")],
                )
            },
            "/stats/v1/sessions/deletedlogs": {
                "get": external_stats_get(
                    "listCustomerStatsDeletedLogs",
                    "Lists at most 10,000 canonical edit/delete log records.",
                    "StatsDeletedLogsResponse",
                    vec![
                        stats_session_parameter(),
                        stats_query_parameter("logType", false, json!({ "type": "string", "enum": ["chat", "alerts"] })),
                        stats_query_parameter("eventType", false, json!({ "type": "string", "enum": ["E", "D"] })),
                        stats_date_parameter("fromDate"),
                        stats_date_parameter("toDate"),
                    ],
                )
            },
            "/stats/v1/sessions/archivedlogs": {
                "get": external_stats_get(
                    "listCustomerStatsArchivedLogs",
                    "Lists at most 10,000 retained canonical chat or alert archive records.",
                    "StatsArchivedLogsResponse",
                    vec![
                        stats_session_parameter(),
                        stats_query_parameter("logType", false, json!({ "type": "string", "enum": ["chat", "alerts"], "default": "chat" })),
                        stats_query_parameter("channel", false, json!({ "type": "string", "minLength": 1, "maxLength": 120, "default": "main" })),
                        stats_date_parameter("fromDate"),
                        stats_date_parameter("toDate"),
                    ],
                )
            },
            "/stats/v1/sessions/recordings": {
                "get": external_stats_get(
                    "listCustomerStatsRecordings",
                    "Lists canonical ready recordings created during the preceding 21 days.",
                    "StatsRecordingsResponse",
                    vec![stats_session_parameter()],
                )
            },
            "/stats/v1/sessions/cloneSession": {
                "get": external_stats_mutating_get(
                    "cloneCustomerStatsSession",
                    "Clones canonical room configuration and staff membership. This historical mutating GET is authenticated, scoped, rate-limited, audited, and non-cacheable.",
                    "StatsCloneSessionResponse",
                    vec![
                        stats_session_parameter(),
                        stats_query_parameter("name", true, json!({ "type": "string", "minLength": 1, "maxLength": crate::limits::ROOM_NAME_MAX_BYTES, "x-maxBytes": crate::limits::ROOM_NAME_MAX_BYTES })),
                    ],
                )
            },
            "/stats/v1/sessions/addUsers": {
                "post": external_stats_post(
                    "addCustomerStatsUsers",
                    "Adds new canonical identities to a room or refreshes existing member activity.",
                    "StatsAddUsersRequest",
                    "StatsAddUsersResponse",
                    vec![stats_session_parameter()],
                )
            },
            "/stats/v1/sessions/delUsers": {
                "post": external_stats_post(
                    "deleteCustomerStatsUsers",
                    "Removes non-owner canonical room memberships by normalized email.",
                    "StatsDeleteUsersRequest",
                    "StatsDeleteUsersResponse",
                    vec![stats_session_parameter()],
                )
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
                },
                "customerApiKey": {
                    "type": "apiKey",
                    "in": "query",
                    "name": "apiKey",
                    "description": "Canonical 24-character customer API key identifier."
                },
                "customerApiSecret": {
                    "type": "apiKey",
                    "in": "query",
                    "name": "apiSecret",
                    "description": "One-time-disclosed customer API secret. Never logged or returned."
                }
            },
            "responses": {
                "BadRequest": error_response("Invalid request."),
                "Unauthorized": error_response("Authentication is absent, expired, or invalid."),
                "Forbidden": error_response("The exact browser origin was not accepted."),
                "NotFound": error_response("The resource does not exist or is outside the caller's authority."),
                "Conflict": error_response("The resource changed after the submitted revision."),
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
                "LaunchAccountRoomRequest": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["requestId"],
                    "properties": { "requestId": uuid_schema() }
                },
                "RoomLaunchVisit": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["visitId", "roomId", "shortCode", "userId", "email", "displayName", "enteredAt"],
                    "properties": {
                        "visitId": uuid_schema(),
                        "roomId": uuid_schema(),
                        "shortCode": { "type": "string", "minLength": 1, "maxLength": 64 },
                        "userId": uuid_schema(),
                        "email": { "type": "string", "format": "email" },
                        "displayName": { "type": "string", "minLength": 1, "maxLength": 200 },
                        "enteredAt": { "type": "string", "format": "date-time" }
                    }
                },
                "RoomSettings": {
                    "type": "object",
                    "additionalProperties": true,
                    "description": "A partial object whose names and scalar types are pinned by room-settings-manifest.json."
                },
                "AccountRoomSettings": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["roomId", "revision", "settings"],
                    "properties": {
                        "roomId": uuid_schema(),
                        "revision": { "type": "integer", "minimum": 0 },
                        "settings": { "$ref": "#/components/schemas/RoomSettings" }
                    }
                },
                "PatchAccountRoomSettingsRequest": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["requestId", "expectedRevision", "base", "updates"],
                    "properties": {
                        "requestId": uuid_schema(),
                        "expectedRevision": { "type": "integer", "minimum": 0 },
                        "base": { "$ref": "#/components/schemas/RoomSettings" },
                        "updates": { "$ref": "#/components/schemas/RoomSettings" }
                    }
                },
                "ManagedMember": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                        "id", "roomId", "userId", "email", "displayName", "role", "revision", "badges",
                        "canPublishMic", "canPublishScreen", "canPublishCam", "canUseAdminChat", "canEditNotes",
                        "canAccessFiles", "canAccessArchives", "isMuted", "isBanned", "isPmRestricted", "isTrial",
                        "hidePersonalInfo", "hideUserCount", "isPaused", "adminNote", "approvalStatus", "hasMobileApp",
                        "hasPassword", "lastSeenAt", "invitedAt", "joinedAt", "createdAt"
                    ],
                    "properties": {
                        "id": uuid_schema(),
                        "roomId": uuid_schema(),
                        "userId": uuid_schema(),
                        "email": { "type": "string", "format": "email" },
                        "displayName": { "type": "string" },
                        "role": { "type": "string", "enum": ["owner", "presenter", "limited_presenter", "moderator", "member"] },
                        "revision": { "type": "integer", "minimum": 0 },
                        "badges": { "type": "array", "items": { "type": "string" } },
                        "canPublishMic": { "type": "boolean" },
                        "canPublishScreen": { "type": "boolean" },
                        "canPublishCam": { "type": "boolean" },
                        "canUseAdminChat": { "type": "boolean" },
                        "canEditNotes": { "type": "boolean" },
                        "canAccessFiles": { "type": "boolean" },
                        "canAccessArchives": { "type": "boolean" },
                        "isMuted": { "type": "boolean" },
                        "isBanned": { "type": "boolean" },
                        "isPmRestricted": { "type": "boolean" },
                        "isTrial": { "type": "boolean" },
                        "hidePersonalInfo": { "type": "boolean" },
                        "hideUserCount": { "type": "boolean" },
                        "isPaused": { "type": "boolean" },
                        "adminNote": { "type": ["string", "null"] },
                        "approvalStatus": { "type": "string", "enum": ["approved", "pending"] },
                        "hasMobileApp": { "type": "boolean" },
                        "hasPassword": { "type": "boolean" },
                        "lastSeenAt": { "type": ["string", "null"], "format": "date-time" },
                        "invitedAt": { "type": ["string", "null"], "format": "date-time" },
                        "joinedAt": { "type": ["string", "null"], "format": "date-time" },
                        "createdAt": { "type": "string", "format": "date-time" }
                    }
                },
                "InviteMemberRequest": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["requestId", "email", "displayName"],
                    "properties": {
                        "requestId": uuid_schema(),
                        "email": { "type": "string", "format": "email", "maxLength": 254 },
                        "displayName": { "type": "string", "minLength": 1, "maxLength": 160 }
                    }
                },
                "MemberTarget": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["memberId", "expectedRevision"],
                    "properties": {
                        "memberId": uuid_schema(),
                        "expectedRevision": { "type": "integer", "minimum": 0 }
                    }
                },
                "ManageMemberOperation": {
                    "oneOf": [
                        { "type": "object", "additionalProperties": false, "required": ["type", "role"], "properties": { "type": { "type": "string", "enum": ["setRole"] }, "role": { "type": "string", "enum": ["presenter", "moderator", "member"] } } },
                        { "type": "object", "additionalProperties": false, "required": ["type", "muted"], "properties": { "type": { "type": "string", "enum": ["setMuted"] }, "muted": { "type": "boolean" } } },
                        { "type": "object", "additionalProperties": false, "required": ["type", "banned"], "properties": { "type": { "type": "string", "enum": ["setBanned"] }, "banned": { "type": "boolean" } } },
                        { "type": "object", "additionalProperties": false, "required": ["type", "trial"], "properties": { "type": { "type": "string", "enum": ["setTrial"] }, "trial": { "type": "boolean" } } },
                        { "type": "object", "additionalProperties": false, "required": ["type", "hidden"], "properties": { "type": { "type": "string", "enum": ["setHideUserCount"] }, "hidden": { "type": "boolean" } } },
                        { "type": "object", "additionalProperties": false, "required": ["type", "hidden"], "properties": { "type": { "type": "string", "enum": ["setHidePersonalInfo"] }, "hidden": { "type": "boolean" } } },
                        { "type": "object", "additionalProperties": false, "required": ["type", "allowed"], "properties": { "type": { "type": "string", "enum": ["setArchiveAccess"] }, "allowed": { "type": "boolean" } } },
                        { "type": "object", "additionalProperties": false, "required": ["type", "restricted"], "properties": { "type": { "type": "string", "enum": ["setPmRestricted"] }, "restricted": { "type": "boolean" } } },
                        { "type": "object", "additionalProperties": false, "required": ["type", "status"], "properties": { "type": { "type": "string", "enum": ["setApproval"] }, "status": { "type": "string", "enum": ["approved", "pending"] } } },
                        { "type": "object", "additionalProperties": false, "required": ["type", "allowed"], "properties": { "type": { "type": "string", "enum": ["setMobileApp"] }, "allowed": { "type": "boolean" } } },
                        { "type": "object", "additionalProperties": false, "required": ["type", "allowed"], "properties": { "type": { "type": "string", "enum": ["setFileAccess"] }, "allowed": { "type": "boolean" } } },
                        { "type": "object", "additionalProperties": false, "required": ["type", "note"], "properties": { "type": { "type": "string", "enum": ["setNote"] }, "note": { "type": ["string", "null"], "maxLength": 500 } } },
                        { "type": "object", "additionalProperties": false, "required": ["type", "publishMic", "publishScreen", "publishCam", "useAdminChat", "editNotes"], "properties": { "type": { "type": "string", "enum": ["setPermissions"] }, "publishMic": { "type": "boolean" }, "publishScreen": { "type": "boolean" }, "publishCam": { "type": "boolean" }, "useAdminChat": { "type": "boolean" }, "editNotes": { "type": "boolean" } } },
                        { "type": "object", "additionalProperties": false, "required": ["type"], "properties": { "type": { "type": "string", "enum": ["freshenLogin"] } } },
                        { "type": "object", "additionalProperties": false, "required": ["type", "displayName"], "properties": { "type": { "type": "string", "enum": ["rename"] }, "displayName": { "type": "string", "minLength": 1, "maxLength": 160 } } },
                        { "type": "object", "additionalProperties": false, "required": ["type", "password"], "properties": { "type": { "type": "string", "enum": ["setPassword"] }, "password": { "type": "string", "minLength": 10, "maxLength": crate::limits::PASSWORD_MAX_BYTES, "writeOnly": true } } },
                        { "type": "object", "additionalProperties": false, "required": ["type"], "properties": { "type": { "type": "string", "enum": ["remove"] } } }
                    ]
                },
                "ManageMembersRequest": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["requestId", "targets", "operation"],
                    "properties": {
                        "requestId": uuid_schema(),
                        "targets": { "type": "array", "minItems": 1, "maxItems": 1000, "items": { "$ref": "#/components/schemas/MemberTarget" } },
                        "allRooms": { "type": "boolean" },
                        "operation": { "$ref": "#/components/schemas/ManageMemberOperation" }
                    }
                },
                "MembershipMutationResponse": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["members", "removedMemberIds", "changed"],
                    "properties": {
                        "members": { "type": "array", "items": { "$ref": "#/components/schemas/ManagedMember" } },
                        "removedMemberIds": { "type": "array", "items": uuid_schema() },
                        "changed": { "type": "integer", "minimum": 0 }
                    }
                },
                "ManagedAdministrator": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["userId", "revision", "displayName", "email", "createdAt", "updatedAt"],
                    "properties": {
                        "userId": uuid_schema(),
                        "revision": { "type": "integer", "minimum": 0 },
                        "displayName": { "type": "string", "minLength": 1, "maxLength": 160, "x-maxBytes": 160 },
                        "email": { "type": "string", "format": "email", "maxLength": 254 },
                        "createdAt": { "type": "string", "format": "date-time" },
                        "updatedAt": { "type": "string", "format": "date-time" }
                    }
                },
                "CreateAdministratorRequest": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["requestId", "displayName", "email", "password"],
                    "properties": {
                        "requestId": uuid_schema(),
                        "displayName": { "type": "string", "minLength": 1, "maxLength": 160, "x-maxBytes": 160 },
                        "email": { "type": "string", "format": "email", "maxLength": 254 },
                        "password": { "type": "string", "minLength": crate::provision::MIN_PASSWORD_BYTES, "maxLength": crate::limits::PASSWORD_MAX_BYTES, "writeOnly": true }
                    }
                },
                "DeleteAdministratorRequest": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["requestId", "expectedRevision"],
                    "properties": {
                        "requestId": uuid_schema(),
                        "expectedRevision": { "type": "integer", "minimum": 0 }
                    }
                },
                "AdministratorMutationResponse": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["administrators", "removedUserIds", "changed"],
                    "properties": {
                        "administrators": { "type": "array", "items": { "$ref": "#/components/schemas/ManagedAdministrator" } },
                        "removedUserIds": { "type": "array", "items": uuid_schema() },
                        "changed": { "type": "integer", "minimum": 0 }
                    }
                },
                "CustomerApiKeyRestrictions": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["ips", "scopes", "sessions"],
                    "properties": {
                        "ips": { "type": "array", "maxItems": 64, "uniqueItems": true, "items": { "type": "string", "maxLength": 18 } },
                        "scopes": { "type": "array", "maxItems": 11, "uniqueItems": true, "items": { "type": "string", "enum": [
                            "sessions/list", "sessions/users", "sessions/addUsers", "sessions/delUsers",
                            "sessions/userstats", "sessions/chatlogs", "sessions/alertlogs",
                            "sessions/deletedlogs", "sessions/archivedlogs", "sessions/recordings",
                            "sessions/cloneSession"
                        ] } },
                        "sessions": { "type": "array", "maxItems": 256, "uniqueItems": true, "items": { "type": "string", "minLength": 1, "maxLength": 64 } }
                    }
                },
                "ManagedCustomerApiKey": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["id", "revision", "lastFour", "restrictions", "createdAt", "updatedAt", "lastUsedAt"],
                    "properties": {
                        "id": { "type": "string", "pattern": "^[0-9a-f]{24}$" },
                        "revision": { "type": "integer", "minimum": 0 },
                        "lastFour": { "type": "string", "pattern": "^[0-9a-f]{4}$" },
                        "restrictions": { "$ref": "#/components/schemas/CustomerApiKeyRestrictions" },
                        "createdAt": { "type": "string", "format": "date-time" },
                        "updatedAt": { "type": "string", "format": "date-time" },
                        "lastUsedAt": { "type": ["string", "null"], "format": "date-time" }
                    }
                },
                "CreateCustomerApiKeyRequest": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["requestId", "keyId", "secretHash", "lastFour"],
                    "properties": {
                        "requestId": uuid_schema(),
                        "keyId": { "type": "string", "pattern": "^[0-9a-f]{24}$" },
                        "secretHash": { "type": "string", "pattern": "^[0-9a-f]{64}$", "writeOnly": true },
                        "lastFour": { "type": "string", "pattern": "^[0-9a-f]{4}$" }
                    }
                },
                "RotateCustomerApiKeyRequest": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["requestId", "expectedRevision", "secretHash", "lastFour"],
                    "properties": {
                        "requestId": uuid_schema(),
                        "expectedRevision": { "type": "integer", "minimum": 0 },
                        "secretHash": { "type": "string", "pattern": "^[0-9a-f]{64}$", "writeOnly": true },
                        "lastFour": { "type": "string", "pattern": "^[0-9a-f]{4}$" }
                    }
                },
                "RestrictCustomerApiKeyRequest": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["requestId", "expectedRevision", "restrictions"],
                    "properties": {
                        "requestId": uuid_schema(),
                        "expectedRevision": { "type": "integer", "minimum": 0 },
                        "restrictions": { "$ref": "#/components/schemas/CustomerApiKeyRestrictions" }
                    }
                },
                "DeleteCustomerApiKeyRequest": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["requestId", "expectedRevision"],
                    "properties": {
                        "requestId": uuid_schema(),
                        "expectedRevision": { "type": "integer", "minimum": 0 }
                    }
                },
                "CustomerApiKeyMutationResponse": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["keys", "removedKeyIds", "changed"],
                    "properties": {
                        "keys": { "type": "array", "items": { "$ref": "#/components/schemas/ManagedCustomerApiKey" } },
                        "removedKeyIds": { "type": "array", "items": { "type": "string", "pattern": "^[0-9a-f]{24}$" } },
                        "changed": { "type": "integer", "minimum": 0 }
                    }
                },
                "StatsSession": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["_id", "uuid", "name", "currentState", "current_capacity", "current_max", "modCount", "recordedMaxCapacity", "created", "updated", "s3Bucket", "s3BucketFolderPath", "isMainRoom", "recPreviewLocation", "media", "recording"],
                    "properties": {
                        "_id": { "type": "string", "minLength": 1, "maxLength": 64 },
                        "uuid": uuid_schema(),
                        "name": { "type": "string" },
                        "currentState": { "type": "string" },
                        "current_capacity": { "type": "integer", "minimum": 0 },
                        "current_max": { "type": "integer", "minimum": 0 },
                        "modCount": { "type": "integer", "minimum": 0 },
                        "recordedMaxCapacity": { "type": "integer", "minimum": 0 },
                        "created": { "type": "string", "format": "date-time" },
                        "updated": { "type": "string", "format": "date-time" },
                        "s3Bucket": { "type": ["string", "null"] },
                        "s3BucketFolderPath": { "type": ["string", "null"] },
                        "isMainRoom": { "type": "boolean" },
                        "recPreviewLocation": { "type": ["string", "null"] },
                        "media": { "type": "array", "items": { "type": "object", "additionalProperties": true } },
                        "recording": { "type": "boolean" }
                    }
                },
                "StatsSessionsResponse": stats_array_response("sessions", "StatsSession"),
                "StatsUser": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["_id", "email", "userName", "role", "lastLogin", "name", "created", "updated", "alerterAppFCMUserOff", "alerterAppTokens", "activeDateAPI", "active"],
                    "properties": {
                        "_id": uuid_schema(),
                        "email": { "type": "string", "format": "email" },
                        "userName": { "type": "string" },
                        "role": { "type": "integer", "minimum": 0, "maximum": 4 },
                        "lastLogin": { "type": ["string", "null"], "format": "date-time" },
                        "name": { "type": "string" },
                        "created": { "type": "string", "format": "date-time" },
                        "updated": { "type": "string", "format": "date-time" },
                        "alerterAppFCMUserOff": { "type": "boolean" },
                        "alerterAppTokens": { "type": "array", "items": { "type": "string" } },
                        "activeDateAPI": { "type": ["string", "null"], "format": "date-time" },
                        "active": { "type": "boolean" }
                    }
                },
                "StatsUsersResponse": stats_array_response("users", "StatsUser"),
                "StatsVisit": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["email", "userName", "uuid", "ip", "inTime", "outTime", "duration", "isMobile"],
                    "properties": {
                        "email": { "type": "string", "format": "email" },
                        "userName": { "type": "string" },
                        "uuid": uuid_schema(),
                        "ip": { "type": ["string", "null"] },
                        "inTime": { "type": "string", "format": "date-time" },
                        "outTime": { "type": ["string", "null"], "format": "date-time" },
                        "duration": { "type": "integer", "format": "int64", "minimum": 0 },
                        "isMobile": { "type": "boolean" }
                    }
                },
                "StatsVisitsResponse": stats_array_response("userstats", "StatsVisit"),
                "StatsChatLog": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["sessionID", "c", "t", "u", "m"],
                    "properties": {
                        "sessionID": { "type": "string" },
                        "c": { "type": "string" },
                        "t": { "type": "string", "format": "date-time" },
                        "u": { "type": "string", "format": "email" },
                        "m": { "type": "string" }
                    }
                },
                "StatsChatLogsResponse": stats_array_response("chatlogs", "StatsChatLog"),
                "StatsAlertLog": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["sessionID", "t", "alertType", "message"],
                    "properties": {
                        "sessionID": { "type": "string" },
                        "t": { "type": "string", "format": "date-time" },
                        "alertType": { "type": "string" },
                        "message": { "type": "string" }
                    }
                },
                "StatsAlertLogsResponse": stats_array_response("chatlogs", "StatsAlertLog"),
                "StatsDeletedLog": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["sessionID", "logType", "eventType", "time", "originalMessage"],
                    "properties": {
                        "sessionID": { "type": "string" },
                        "logType": { "type": "string", "enum": ["chat", "alerts"] },
                        "eventType": { "type": "string", "enum": ["E", "D"] },
                        "time": { "type": "string", "format": "date-time" },
                        "originalMessage": { "type": "string" }
                    }
                },
                "StatsDeletedLogsResponse": stats_array_response("deletedlogs", "StatsDeletedLog"),
                "StatsArchivedLog": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["sessionID", "logType", "channel", "updated", "content"],
                    "properties": {
                        "sessionID": { "type": "string" },
                        "logType": { "type": "string", "enum": ["chat", "alerts"] },
                        "channel": { "type": "string" },
                        "updated": { "type": "string", "format": "date-time" },
                        "content": { "type": "string" }
                    }
                },
                "StatsArchivedLogsResponse": stats_array_response("archivedlogs", "StatsArchivedLog"),
                "StatsRecording": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["_id", "sessionID", "name", "namemkv", "contentType", "created", "duration", "length", "fpath", "media_server", "vidPath", "ms", "isUpload"],
                    "properties": {
                        "_id": uuid_schema(),
                        "sessionID": { "type": "string" },
                        "name": { "type": "string" },
                        "namemkv": { "type": "string" },
                        "contentType": { "type": "string" },
                        "created": { "type": "string", "format": "date-time" },
                        "duration": { "type": "integer", "format": "int64", "minimum": 0, "description": "Duration in whole minutes." },
                        "length": { "type": "integer", "format": "int64", "minimum": 0, "description": "Duration in milliseconds." },
                        "fpath": { "type": "string" },
                        "media_server": { "type": ["string", "null"] },
                        "vidPath": { "type": ["string", "null"], "format": "uri" },
                        "ms": { "type": ["string", "null"] },
                        "isUpload": { "type": "boolean" }
                    }
                },
                "StatsRecordingsResponse": stats_array_response("recordings", "StatsRecording"),
                "StatsAddUser": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["email", "name"],
                    "properties": {
                        "email": { "type": "string", "format": "email", "maxLength": crate::limits::LOGIN_EMAIL_MAX_BYTES },
                        "name": { "type": "string", "minLength": 1, "maxLength": crate::limits::DISPLAY_NAME_MAX_BYTES }
                    }
                },
                "StatsAddUsersRequest": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["users"],
                    "properties": {
                        "users": { "type": "array", "minItems": 1, "maxItems": 500, "items": { "$ref": "#/components/schemas/StatsAddUser" } }
                    }
                },
                "StatsAddUsersResponse": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["success", "added", "freshen"],
                    "properties": {
                        "success": { "type": "boolean", "const": true },
                        "added": { "type": "integer", "minimum": 0 },
                        "freshen": { "type": "integer", "minimum": 0 }
                    }
                },
                "StatsDeleteUsersRequest": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["delUsers"],
                    "properties": {
                        "delUsers": { "type": "array", "minItems": 1, "maxItems": 500, "uniqueItems": true, "items": { "type": "string", "format": "email", "maxLength": crate::limits::LOGIN_EMAIL_MAX_BYTES } }
                    }
                },
                "StatsDeleteUsersResponse": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["success", "deletedUsers"],
                    "properties": {
                        "success": { "type": "boolean", "const": true },
                        "deletedUsers": { "type": "array", "items": { "type": "string", "format": "email" } }
                    }
                },
                "StatsCloneSession": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["_id", "uuid", "name", "isClonedRoom", "clonedFrom", "ownerdID", "currentState", "created", "updated"],
                    "properties": {
                        "_id": { "type": "string" },
                        "uuid": uuid_schema(),
                        "name": { "type": "string" },
                        "isClonedRoom": { "type": "boolean", "const": true },
                        "clonedFrom": { "type": "string" },
                        "ownerdID": uuid_schema(),
                        "currentState": { "type": "string", "const": "inactive" },
                        "created": { "type": "string", "format": "date-time" },
                        "updated": { "type": "string", "format": "date-time" }
                    }
                },
                "StatsCloneSessionResponse": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["success", "session"],
                    "properties": {
                        "success": { "type": "boolean", "const": true },
                        "session": { "$ref": "#/components/schemas/StatsCloneSession" }
                    }
                },
                "ManagedBadge": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["id", "revision", "label", "textColor", "backgroundColor", "emoji", "imageDataUrl", "darkThemeBadgeId", "autoAssignRoles", "createdAt", "updatedAt"],
                    "properties": {
                        "id": uuid_schema(),
                        "revision": { "type": "integer", "minimum": 0 },
                        "label": { "type": "string", "maxLength": 160, "x-maxBytes": 160 },
                        "textColor": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
                        "backgroundColor": { "type": "string", "pattern": "^(#[0-9A-Fa-f]{6}|rgba\\(1,0,0,0\\))$" },
                        "emoji": { "type": ["string", "null"], "maxLength": 128, "x-maxBytes": 128 },
                        "imageDataUrl": { "type": ["string", "null"], "maxLength": 360000, "writeOnly": false },
                        "darkThemeBadgeId": { "type": ["string", "null"], "format": "uuid" },
                        "autoAssignRoles": { "type": "array", "maxItems": 32, "items": { "type": "string", "maxLength": 64 } },
                        "createdAt": { "type": "string", "format": "date-time" },
                        "updatedAt": { "type": "string", "format": "date-time" }
                    }
                },
                "CreateBadgeRequest": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["requestId", "label", "textColor", "backgroundColor", "emoji", "imageDataUrl", "darkThemeBadgeId", "autoAssignRoles"],
                    "properties": {
                        "requestId": uuid_schema(),
                        "label": { "type": "string", "maxLength": 160, "x-maxBytes": 160 },
                        "textColor": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
                        "backgroundColor": { "type": "string", "pattern": "^(#[0-9A-Fa-f]{6}|rgba\\(1,0,0,0\\))$" },
                        "emoji": { "type": ["string", "null"], "maxLength": 128, "x-maxBytes": 128 },
                        "imageDataUrl": { "type": ["string", "null"], "maxLength": 360000 },
                        "darkThemeBadgeId": { "type": ["string", "null"], "format": "uuid" },
                        "autoAssignRoles": { "type": "array", "maxItems": 32, "items": { "type": "string", "maxLength": 64 } }
                    }
                },
                "UpdateBadgeRequest": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["requestId", "expectedRevision", "label", "textColor", "backgroundColor", "emoji", "imageDataUrl", "darkThemeBadgeId", "autoAssignRoles"],
                    "properties": {
                        "requestId": uuid_schema(),
                        "expectedRevision": { "type": "integer", "minimum": 0 },
                        "label": { "type": "string", "maxLength": 160, "x-maxBytes": 160 },
                        "textColor": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
                        "backgroundColor": { "type": "string", "pattern": "^(#[0-9A-Fa-f]{6}|rgba\\(1,0,0,0\\))$" },
                        "emoji": { "type": ["string", "null"], "maxLength": 128, "x-maxBytes": 128 },
                        "imageDataUrl": { "type": ["string", "null"], "maxLength": 360000 },
                        "darkThemeBadgeId": { "type": ["string", "null"], "format": "uuid" },
                        "autoAssignRoles": { "type": "array", "maxItems": 32, "items": { "type": "string", "maxLength": 64 } }
                    }
                },
                "DeleteBadgeRequest": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["requestId", "expectedRevision"],
                    "properties": {
                        "requestId": uuid_schema(),
                        "expectedRevision": { "type": "integer", "minimum": 0 }
                    }
                },
                "BadgeAssignmentOperation": {
                    "oneOf": [
                        { "type": "object", "additionalProperties": false, "required": ["type", "badgeId", "assigned"], "properties": {
                            "type": { "type": "string", "enum": ["setBadge"] }, "badgeId": uuid_schema(), "assigned": { "type": "boolean" }
                        } },
                        { "type": "object", "additionalProperties": false, "required": ["type"], "properties": {
                            "type": { "type": "string", "enum": ["clearBadges"] }
                        } }
                    ]
                },
                "AssignBadgesRequest": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["requestId", "targets", "operation"],
                    "properties": {
                        "requestId": uuid_schema(),
                        "targets": { "type": "array", "minItems": 1, "maxItems": 1000, "items": { "$ref": "#/components/schemas/MemberTarget" } },
                        "allRooms": { "type": "boolean" },
                        "operation": { "$ref": "#/components/schemas/BadgeAssignmentOperation" }
                    }
                },
                "BadgeMutationResponse": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["badges", "members", "removedBadgeIds", "changed"],
                    "properties": {
                        "badges": { "type": "array", "items": { "$ref": "#/components/schemas/ManagedBadge" } },
                        "members": { "type": "array", "items": { "$ref": "#/components/schemas/ManagedMember" } },
                        "removedBadgeIds": { "type": "array", "items": uuid_schema() },
                        "changed": { "type": "integer", "minimum": 0 }
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

fn stats_query_parameter(name: &str, required: bool, schema: Value) -> Value {
    json!({
        "name": name,
        "in": "query",
        "required": required,
        "schema": schema
    })
}

fn stats_array_response(field: &str, item_schema: &str) -> Value {
    json!({
        "type": "object",
        "additionalProperties": false,
        "required": ["success", field],
        "properties": {
            "success": { "type": "boolean", "const": true },
            (field): {
                "type": "array",
                "maxItems": 10_000,
                "items": { "$ref": format!("#/components/schemas/{item_schema}") }
            }
        }
    })
}

fn stats_session_parameter() -> Value {
    stats_query_parameter(
        "sessionID",
        true,
        json!({ "type": "string", "minLength": 1, "maxLength": 64 }),
    )
}

fn stats_date_parameter(name: &str) -> Value {
    stats_query_parameter(
        name,
        false,
        json!({
            "oneOf": [
                { "type": "string", "format": "date" },
                { "type": "string", "format": "date-time" }
            ]
        }),
    )
}

fn external_stats_responses(description: &str, response_schema: &str) -> Value {
    json!({
        "200": {
            "description": description,
            "content": { "application/json": { "schema": {
                "$ref": format!("#/components/schemas/{response_schema}")
            } } }
        },
        "400": { "$ref": "#/components/responses/BadRequest" },
        "403": { "$ref": "#/components/responses/Forbidden" },
        "429": { "$ref": "#/components/responses/RateLimited" },
        "503": { "$ref": "#/components/responses/Unavailable" }
    })
}

fn external_stats_get(
    operation_id: &str,
    description: &str,
    response_schema: &str,
    parameters: Vec<Value>,
) -> Value {
    json!({
        "operationId": operation_id,
        "tags": ["Customer Statistics"],
        "description": description,
        "x-controller-client": false,
        "security": [{ "customerApiKey": [], "customerApiSecret": [] }],
        "parameters": parameters,
        "responses": external_stats_responses(description, response_schema)
    })
}

fn external_stats_mutating_get(
    operation_id: &str,
    description: &str,
    response_schema: &str,
    parameters: Vec<Value>,
) -> Value {
    let mut operation = external_stats_get(operation_id, description, response_schema, parameters);
    operation["x-mutating-get"] = Value::Bool(true);
    operation
}

fn external_stats_post(
    operation_id: &str,
    description: &str,
    request_schema: &str,
    response_schema: &str,
    parameters: Vec<Value>,
) -> Value {
    json!({
        "operationId": operation_id,
        "tags": ["Customer Statistics"],
        "description": description,
        "x-controller-client": false,
        "security": [{ "customerApiKey": [], "customerApiSecret": [] }],
        "parameters": parameters,
        "requestBody": {
            "required": true,
            "content": { "application/json": { "schema": {
                "$ref": format!("#/components/schemas/{request_schema}")
            } } }
        },
        "responses": external_stats_responses(description, response_schema)
    })
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
                "createAccountAdministrator",
                "createAccountBadge",
                "createAccountCustomerApiKey",
                "deleteAccountAdministrator",
                "deleteAccountBadge",
                "deleteAccountCustomerApiKey",
                "getAccountBootstrap",
                "getAccountPreferences",
                "getAccountRoomSettings",
                "inviteAccountRoomMember",
                "listAccountRooms",
                "listAccountAdministrators",
                "listAccountCustomerApiKeys",
                "listAccountRoomMembers",
                "launchAccountRoom",
                "listAccountBadges",
                "login",
                "logout",
                "manageAccountRoomMembers",
                "assignAccountRoomBadges",
                "addCustomerStatsUsers",
                "cloneCustomerStatsSession",
                "deleteCustomerStatsUsers",
                "listCustomerStatsAlertLogs",
                "listCustomerStatsArchivedLogs",
                "listCustomerStatsChatLogs",
                "listCustomerStatsDeletedLogs",
                "listCustomerStatsRecordings",
                "listCustomerStatsSessions",
                "listCustomerStatsUsers",
                "listCustomerStatsVisits",
                "refreshSession",
                "setAccountPreference",
                "setAccountRoomArchived",
                "patchAccountRoomSettings",
                "restrictAccountCustomerApiKey",
                "rotateAccountCustomerApiKey",
                "updateAccountProfile",
                "updateAccountBadge",
                "updateAccountTheme",
            ])
        );
    }

    #[test]
    fn customer_statistics_operations_require_both_query_credentials_and_never_generate_a_bff() {
        let document = document();
        let paths = document["paths"].as_object().expect("OpenAPI paths object");
        let mut commands = 0;
        for (path, path_item) in paths {
            if !path.starts_with("/stats/v1/sessions/") {
                continue;
            }
            for (method, operation) in path_item.as_object().expect("stats path item") {
                assert!(matches!(method.as_str(), "get" | "post"));
                assert_eq!(operation["x-controller-client"], false, "{path}");
                assert_eq!(
                    operation["security"],
                    json!([{ "customerApiKey": [], "customerApiSecret": [] }]),
                    "{path}",
                );
                for status in ["400", "403", "429", "503"] {
                    assert!(
                        operation["responses"].get(status).is_some(),
                        "{path} {status}"
                    );
                }
                commands += 1;
            }
        }
        assert_eq!(
            commands, 11,
            "the captured contract has exactly eleven commands"
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
