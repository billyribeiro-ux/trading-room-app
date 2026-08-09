# ProTradingRoom — project vision (evidence-backed)

Read from:

| Artifact                                       | What it is                                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `~/Desktop/pro-trading-room-website/ptr1.json` | Admin **manageSession** forensic capture (22 MB, 23 caps)                                        |
| `~/Desktop/pro-trading-room-website/prt2.json` | Admin **welcome** forensic capture (9 MB, 5 caps) — filename “prt2”, field `part` is still **1** |
| `new-room/` first/second dumps                 | Live **chat room** DOM freezes (staff)                                                           |
| `second-dump/db/`                              | **Postgres `ptr_clone`** schema + RLS security layer                                             |

Prior decode of the website dumps already lives in  
`pro-trading-room-website/_forensic_decode/` (PTR1/PRT2 master summaries, system model).

---

## Three surfaces, one product

```
┌─────────────────────────────────────────────────────────────┐
│  A. ACCOUNT / ADMIN  (protradingroom.com/ptrApp)            │
│     welcome  →  manageSession  →  Launch room               │
│     Evidence: ptr1.json + prt2.json                         │
└───────────────────────────┬─────────────────────────────────┘
                            │ Launch / JWT / room hex id
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  B. LIVE ROOM  (chat.protradingroom.com / room clone)       │
│     alerts · chat · roster · presentation · modals          │
│     Evidence: first-dump + second-dump forensic caps        │
└───────────────────────────┬─────────────────────────────────┘
                            │ API / realtime
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  C. DATA PLANE  (Postgres ptr_clone + Redis/LiveKit/…)      │
│     multi-tenant enterprises/rooms/members + RLS            │
│     Evidence: second-dump/db/SCHEMA-FULL.sql + security.md  │
└─────────────────────────────────────────────────────────────┘
```

Same **room id** bridges A and B in the dumps:

- Hex: `6a628a99731b9f77ae9bf505`
- Numeric: **3625**
- Manage URL: `…/ptrApp#/page/manageSession/6a628a99731b9f77ae9bf505`
- Chat session URL (staff dumps): `…/chat.protradingroom.com/?id=6a628a99731b9f77ae9bf505`

---

## A. Admin website (`ptr1` / `prt2`)

### Wire format

Same forensic harness as the chat dumps:

```json
{ "part": 1, "caps": [/* snapshots */] }
```

**Important:** both website files have `"part": 1`.  
`prt2` means “second **page run** (welcome)”, not capture-part-2 of a split dump.

Node schema is the same 95-style / path / rect kit.  
Difference vs chat dumps: **`cssVars.root` / `cssVars.body` are always `{}`** on these admin pages.

### `prt2.json` — welcome (account home)

| Cap                             | Role                                      |
| ------------------------------- | ----------------------------------------- |
| baseline / dark / light / final | fullDom ×882                              |
| `__meta__`                      | url = `#/page/welcome`, role = **member** |

Visible IA:

1. **Sessions** — Total: 1, Show/Hide Archived, table row Room 3625 → **Launch** + **Manage**
2. **Badges** — create/upload/export (emoji picker in hidden DOM)
3. **Extra Admin Users**
4. **API Keys** + API Docs

Hidden but present: full **login** form (session already authenticated).

### `ptr1.json` — manageSession (room control plane)

| Cap family                | What it captures                                      |
| ------------------------- | ----------------------------------------------------- |
| baseline + themes + final | fullDom ×2156, `themeClass=footer-hidden`             |
| `modal:permissionsModal`  | Mic / Screenshare / WebCam / AdminChat / CanEditNotes |
| 17 dropdown force-opens   | User list actions + nested perms menus                |
| `__meta__`                | manageSession URL, role member                        |

**Visible chrome**

- Manage Room **3625** (`6a628a99731b9f77ae9bf505`)
- Launch / Clone / Delete / Marketplace / Reset Counts
- Room Title, Authorization Mode, Room / Vanity / Unique links
- Tabs: **Users | Branding | User Stats | Settings** (DOM has extra hidden panes)

**Users tab** = operational control of membership:

- Invite / export / load / search
- Roles: Owner · Presenter · Admin · Participant · Trial · Banned · muted…
- Row Actions → Permissions / Granular Perms / App & Notifications / Badges

**Settings tab** = enormous feature flag surface (the “product dictionary”).  
Examples that map straight onto room + DB capabilities:

| Admin setting (copy from dump)               | Maps to                                                 |
| -------------------------------------------- | ------------------------------------------------------- |
| User PMs? / User PM presenters?              | `room_members.can_pm_*`, PM tables                      |
| Q&A on Alerts?                               | `alert_questions`                                       |
| OffTopic / Admin channels                    | `room_channels.channel_type`                            |
| Enable Swing / Day Trade Alerts tabs         | `alerts.alert_kind` / trade_style                       |
| Users Can Delete Own Messages?               | `can_delete_own_message`                                |
| Show Roster? / Only Presenters?              | roster UI + membership                                  |
| Auth mode Open + passwords / SSO / JWT       | `rooms.auth_mode`, `invite_tokens`, tiers               |
| Granular Mic/Cam/Screen/Chat/Notes           | `can_publish_*`, `can_use_admin_chat`, `can_edit_notes` |
| Archive chat/alerts, scheduler, video player | archives + `polls` / media features                     |
| Auto open/close times, lock session          | `rooms.state` open/closed/locked                        |

**permissionsModal** is the UI twin of capability booleans:

- Microphone → `can_publish_mic`
- Screenshare → `can_publish_screen`
- WebCam → `can_publish_cam`
- AdminChat → `can_use_admin_chat`
- CanEditNotes → `can_edit_notes`

---

## B. Live room (`new-room` dumps)

Staff forensic freezes of **chat.protradingroom.com**:

- Filmstrip of modals/tabs (part1)
- Final freeze + open followed-users + emoji (part2)
- Svelte reconstruction targets pixel/DOM parity with those captures

This is the **member experience** of a room that was **configured** in manageSession.

---

## C. Data plane (`ptr_clone`)

Multi-tenant Postgres with:

- Composite FKs `(enterprise_id, room_id)`
- `room_members` role CHECK + **16 `can_*` flags**
- Chat/alerts/notes/polls/files/social
- **FORCE RLS** on 20 tables keyed by `app.enterprise_id`
- SECURITY DEFINER auth locators for chicken-and-egg tenant resolve

Admin settings in ptr1 are the **product knobs**; DB columns/capabilities are the **enforcement surface**; live room is the **runtime**.

---

## How the pieces fit (mental model)

```
Welcome (prt2)
  └─ Sessions table → Manage (ptr1) ──configure──► rooms + room_members + channels
                     └─ Launch ──JWT/session──► Live room UI (new-room dumps)
                                                  └─ messages / alerts / PMs / notes …
                                                       under RLS as ptr_clone_app
```

**Rebuild order that matches reality:**

1. **Schema + security** (Postgres) — identity, tenancy, capabilities, RLS
2. **Room runtime** (SvelteKit) — DOM parity from staff dumps
3. **Admin/manage** (ptrApp) — settings + user ops from ptr1/prt2
4. Wire Launch/auth so manageSession and room share the same room id + membership

---

## Capture harness (same system everywhere)

From `CAPTURE_SYSTEM_MODEL.md`:

- Not screenshots — structured DOM + geometry + 95 computed styles
- Force-opens ephemeral modals/dropdowns into `subtree` caps
- Theme probes often **class-only** on admin pages (no computed recolor)
- Meta dumps stylesheets (CORS-BLOCKED for some CDNs)

Filenames lie sometimes: `prt2` ≠ `part:2`; always trust the JSON `part` / `meta.url` fields.

---

## Implications for `new-room` work

1. **Capability model is king** — every `can_*` and room setting in manageSession must eventually land as room config + membership flags (already sketched in Postgres).
2. **Roles are richer in admin UI** than chat role CHECK alone (Owner/Presenter/Admin/Participant/Trial/Banned + granular toggles). Map carefully; don’t collapse without evidence.
3. **Auth modes** (open / password tiers / invite / SSO / JWT) are admin-configured; room login UX depends on them.
4. **Channels** (Main / OffTopic / Admin / extras) are first-class settings → `room_channels`.
5. **Alerts product** (trade/non-trade, swing/day, Q&A, scheduler, archive) is configured in admin, executed in room.
6. Website dumps use the **same forensic schema family** as chat dumps (with empty cssVars and different labels/URLs) — validators should not assume chat-only labels.

---

## Honest gaps still open

- No full network/API contract between manageSession and room in these two files
- Admin dark/light theme does not recompute colors on these pages
- Some dropdown subtrees have 0×0 rects (structure only)
- “More to it” after security layer — await next dump (billing, LiveKit, mobile, marketplace, etc.)

---

## Quick pointers

| Need                    | Where                                                               |
| ----------------------- | ------------------------------------------------------------------- |
| manageSession UI decode | `pro-trading-room-website/_forensic_decode/PTR1_MASTER_SUMMARY.txt` |
| welcome UI decode       | `…/PRT2_MASTER_SUMMARY.txt`                                         |
| Harness semantics       | `…/CAPTURE_SYSTEM_MODEL.md`                                         |
| Completeness matrix     | `…/SIDE_BY_SIDE_COMPLETENESS.md`                                    |
| Chat room DOM           | `new-room/first-dump`, `new-room/second-dump`                       |
| DB + RLS                | `new-room/second-dump/db/`                                          |
