# Domain model map — room ↔ system of record

**Compiled:** 2026-08-03
**Purpose:** before the room is rewired to the API, establish what the real model
is, what the room currently has, and — the point of this document — **what has
no home on either side**.

Tags as in `docs/PRODUCT-OVERVIEW.md`: **[M]** measured here, **[C]** cited from
a document, **[R]** read from source, **[U]** unverified.

## 1. The room's SQLite is scaffolding, not a model

Stated by the owner, 2026-08-03: SQLite was a quick harness to test the app, not
a reproduction of the PTR schema.

That resolves a question this document would otherwise have to answer. There is
**no data to migrate and no schema to honour**. The 15 SQLite tables are a test
fixture. The system of record is PostgreSQL, and the room is rewired to it
rather than bridged to it.

The local database also cannot be carried forward even if someone wanted to: its
recorded sqlx checksums for migrations 2 and 3 no longer match the files, so it
refuses to migrate (`TODO.md` entry 3, closed 2026-08-04 and now in
`docs/RESOLVED-ARCHIVE.md`).

## 2. The real model

24 PostgreSQL tables **[M]**. Three are **not** tenanted; the other 20 each carry
`enterprise_id` and have `ENABLE` + `FORCE ROW LEVEL SECURITY` **[M]**.

```
enterprises            id, name, slug                    <- the tenant itself
  └─ rooms             id, enterprise_id, name, ...
       ├─ room_members id, enterprise_id, room_id, user_id,
       │               role, display_name, can_* × 16
       ├─ room_channels
       ├─ room_state
       └─ everything else tenanted

users                  global identity, NOT tenanted
refresh_tokens         session families, NOT tenanted
```

Tenancy is enforced in the database, not the application. Policies compare
`enterprise_id` against a session GUC **[R]**:

```sql
enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid
```

An unset GUC yields `NULL`, and `enterprise_id = NULL` is never true, so a
connection that forgets to set it sees **zero rows** rather than everything.
`Db::begin_tenant` sets `app.enterprise_id` and `app.member_id` with
transaction-scoped `set_config(.., true)`, and `TenantTx` is the only way to
obtain a tenanted transaction **[R]**.

`MemberRole` is `owner | presenter | limited_presenter | moderator | member`,
with `is_staff()` meaning "everyone but member" **[R]**. Capability is a 16-bit
field of `can_*` columns, per member per room **[R]**.

## 3. The room has no tenancy dimension at all

`grep -inE "enterprise|tenant|roomId|room_id" src/lib/server/db/schema.ts`
returns **nothing** **[M]**.

`messages.room` is a chat-channel label defaulting to `'main'`, not a room
entity **[R]**. `.env.example` states it outright **[R]**:

> The room every grant is minted for. Not derived from anything: the app's
> schema has no room entity (`messages.room` is a chat-channel label), so this
> is a deployment constant for a single-room deployment.

So the room application is **single-tenant, single-room by construction**, and
the API is multi-tenant and multi-room. That gap — not `integer` vs `uuid` — is
the substance of the migration.

## 4. Table map

### 4.1 Room tables with a home

| Room (SQLite)     | System of record            | Note                                                                                        |
| ----------------- | --------------------------- | ------------------------------------------------------------------------------------------- |
| `users`           | `users` + `room_members`    | Identity is global; role and capability are per room. The room collapses both into one row. |
| `sessions`        | `refresh_tokens`            | Different session model entirely: `__Host-` cookies, refresh families, rotation.            |
| `messages`        | `messages`                  |                                                                                             |
| `alerts`          | `alerts`                    |                                                                                             |
| `alert_questions` | `alert_questions`           |                                                                                             |
| `shared_files`    | `files`                     |                                                                                             |
| `polls`           | `polls`                     |                                                                                             |
| `poll_answers`    | `poll_responses`            |                                                                                             |
| `notes`           | `notes`                     |                                                                                             |
| `note_versions`   | `note_versions`             |                                                                                             |
| `chat_mutes`      | `mutes`                     |                                                                                             |
| `user_settings`   | `users.preferences` (jsonb) | The seed shows chat colours and text size living in that column **[R]**.                    |

### 4.2 Room tables with NO home — decisions required

| Room table                | Standing                                                                                                                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `saved_polls`             | Canned/reusable poll templates. **No PostgreSQL counterpart exists.** Either it is a real product feature needing a table, or it was harness convenience. Needs a decision before the polls slice. |
| `hidden_room_items`       | Capture-fixture concern: which captured evidence items have been "deleted". Has no place in the product schema.                                                                                    |
| `captured_item_overrides` | Same — edits to captured items. Fixture-only.                                                                                                                                                      |

The last two exist because the room renders captured evidence. They disappear
with the fixture, not with the migration.

### 4.3 System-of-record tables the room does NOT have — 12

| Table               | Why it matters                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| `enterprises`       | The tenant. The room has no concept of one.                                                                    |
| `rooms`             | The room has no room entity.                                                                                   |
| `room_members`      | Role and the 16 capability columns. The room gates presenter UI on a local `'staff'`/`'admin'` string instead. |
| `room_channels`     | The room uses a `messages.room` text label.                                                                    |
| `room_state`        | Includes `global_mute_non_staff`, which `MemberRole::is_staff()` exists to interpret.                          |
| `message_reactions` | The room has reactions in the UI.                                                                              |
| `private_messages`  | The room has private chat in the UI. Carries the one RLS participant exception in the schema **[C]**.          |
| `follows`           | The room has followed users in the UI.                                                                         |
| `member_notes`      | Per-member staff notes.                                                                                        |
| `invite_tokens`     | Room entry by invite.                                                                                          |
| `alert_media`       | Media attached to alerts.                                                                                      |
| `audit_log`         | Tenanted audit trail.                                                                                          |

**This is the "nothing missing" answer.** Several of these are features the room
already presents but does not persist server-side. The 2026-07-30 report states
that no server mutation exists for private messages, shared-file upload/delete,
Q&A, scheduled alerts, presence, or membership/capability enforcement **[C]** —
and the API implements them. Rewiring the room does not just replace storage; it
turns UI-only behaviour into real behaviour.

## 5. What this changes about the migration

The plan in `docs/PRODUCT-OVERVIEW.md` §9 assumed a like-for-like swap. It is
not one.

1. **A strangler bridge preserving numeric foreign keys is no longer wanted.**
   That design existed to protect SQLite rows. The owner has confirmed there is
   nothing there to protect.
2. **Identity is still first, but it is bigger than identity.** The room must
   acquire `enterprise_id`, `room_id` and a `room_members` row before any other
   slice can address a tenanted table, because every one of those tables is
   RLS-scoped by `enterprise_id`.
3. **Presenter gating moves from a local string to `room_members.role` plus
   capabilities.** `'staff'`/`'admin'` has no counterpart; five roles and 16
   capabilities do.
4. **The client-only features become real** as their slices land.

## 6. Open questions for the owner

1. `saved_polls` — real feature needing a table, or harness convenience?
2. Does the room UI need to select among **multiple rooms**, or does one
   deployment still serve one room, with the enterprise/room resolved at login?
3. `hidden_room_items` / `captured_item_overrides` — retire with the fixture, or
   keep a way to hide captured items in the product?
