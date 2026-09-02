# Architecture

## Production authority

ADR 0003 supersedes the former SQLite file-move destination. The production
boundary is SvelteKit/Vercel UI+BFF → PostgreSQL system of record, with a Rust/Axum
API owning room runtime and mediasoup deployed separately for ephemeral media.

**The control plane is deployed and is no longer a preview.** Since 2026-08-07 it
runs on Vercel against Neon PostgreSQL in `us-east-1` with
`CONTROL_PLANE_MODE=postgres`, serving registration, authentication, room creation,
the 269 room settings, badges, admin users and API keys. The SQLite store and the
~300 lines of local-file hardening that protected it are retired. `marketing-only`
remains the fail-closed default for any deployment given no `DATABASE_URL`.

The tenancy model below is therefore the production model, not a reconstruction.

Two parts of ADR 0003 are still ahead, and this document should not be read as
claiming otherwise:

- The **Rust/Axum API** (`services/api`, 30 room-runtime routes) is written and
  tested but not deployed, and the room does not call it. Room runtime data stays
  in the room's own store until that cutover.
- **mediasoup** is blocked on the OpenSSL 3.0.8 finding in
  `docs/MEDIASOUP-DEPLOYMENT-PLAN.md`. Measured 2026-08-07: that library is vendored
  inside the mediasoup C++ worker and is absent from the Cargo graph entirely, so
  clearing it is an upstream version bump, not a dependency swap.

The ordered cutover gates remain in `docs/PRODUCTION-CUTOVER-PLAN.md`.

## The two tiers

The reference exposes exactly two levels, and this project mirrors them because
"the same steps and choices" means the same information architecture.

```
account (tenant: one business, one owner login)
├── rooms                        the reference calls these "sessions"
│   ├── room_settings            269 keys, one JSON document
│   └── room_users               membership + numeric role
├── badges                       account-level, shared across rooms
├── admin_users                  account-level extra logins
└── api_keys                     account-level
```

Account-level tables live on the account page; room-level tables live on the room
controller. That split is not a design choice — it is where the reference puts each
table, verified per page.

## Routes

| Route                 | Reference equivalent           | Purpose                                 |
| --------------------- | ------------------------------ | --------------------------------------- |
| `/login`              | login card on `#/page/welcome` | authenticate                            |
| `/account`            | `#/page/welcome` (logged in)   | rooms · badges · admin users · API keys |
| `/account/rooms/[id]` | `#/page/manageSession/<id>`    | the 6-tab controller                    |

The reference is a single Angular page with client-side tab state, so nothing is
deep-linkable. This project uses real routes, which is a deliberate improvement:
`?tab=settings` survives a refresh and can be linked to.

## Why 269 settings live in one JSON column

`room_settings.settings_json` holds the whole document rather than 268 columns.

- The key set is **generated** in `src/lib/room-settings-schema.ts`: 267 entries
  extracted from tracked Manage evidence plus one reviewed `roomType` product
  deviation, for 269 total. `scripts/extract-manage-schema.mjs` is the sole
  generator authority and `pnpm schema:verify` proves exact reproducibility.
  Re-running the generator against reviewed newer evidence changes the schema;
  with 268 columns that is a migration every time, with a JSON document it is a
  regenerate.
- Reads never touch the blob directly — they go through `resolveRoomConfig()`, which
  is where types and precedence are applied.
- Writes go through `saveSetting()`, which **rejects unknown keys**. A key outside the
  generated set is a typo or a stale client, not something to silently store.

The cost is honest: no per-field SQL constraints and no indexing on a single setting.
Neither is needed — settings are read as a whole document, per room, once per load.

## The seam: `src/lib/room-config.ts`

Two things can change how a room behaves:

1. **The controller** — per-room settings, set by the owner
2. **The room's own settings panel** — per-user preferences

They overlap on 20 of 269 settings. Rather than let each component decide which wins,
every read goes through `resolveRoomConfig(room, user)` and precedence is decided in
one file.

The rule is taken from the reference's own naming, not invented:

| Class         | Pattern                                                         | Who wins                             | Count |
| ------------- | --------------------------------------------------------------- | ------------------------------------ | ----- |
| **policy**    | `hide*`, `disable*`, `allow*`, `*VisibleToViewers`, `*Disabled` | room owner; user **cannot** override | 36    |
| **default**   | `*AsDefault`                                                    | room seeds it, user **may** override | 1     |
| **room-only** | everything else                                                 | room; no per-user counterpart exists | 231   |

`darkThemeAsDefault`'s own help text reads _"If enabled, dark theme will be set as
default"_ — a default, not a lock. Whereas "Hide notes Section?" is a capability the
owner controls, and rendering it as a user toggle would let a user flip it and watch
it snap back.

`resolveRoomConfig()` returns three things:

- `values` — the effective value per setting after precedence
- `locked` — settings the owner is enforcing, so the room's UI can show them as
  locked instead of offering a control that does nothing
- `unwired` — settings the controller can store but nothing in the room reads yet

## `wired: false` — the honesty mechanism

Every entry defaults to `wired: false`. The generator's explicit reviewed set
marks a setting `true` only after this implementation has a tested consumer.
`false` means: _the controller can store this value, and nothing consumes it yet._

With 269 settings, a controller that renders all of them looks finished long before
it is. The flag is what separates working from looking-like-it-works. It flips to
`true` only when a real consumer exists, and the UI marks unwired settings so nobody
— including the owner — believes a toggle does something it doesn't.

Current state: **111 of 269 wired; 158 unwired** — measured 2026-09-02, and checked on
every run by `scripts/verify-room-settings-schema.mjs`, which fails if this sentence and the schema
disagree. The wired names are encoded explicitly in the generator rather than recovered from a
previous generated file.

> **Superseded 2026-08-29.** This line read _"Current state: 33 of 269 wired; 236 unwired"_. A line
> labelled "Current state" is the one that most needs a gate, because it is read as current by
> definition.

The blockquote above is not decoration: `scripts/verify-room-settings-schema.mjs` checks every live
count in this file and skips blockquoted lines, so a superseded number can be recorded without
failing the build.

## Roles

`room_users.role` stores the reference's captured state model. The action opcode
is not itself the persisted role value:

| Role                        | Meaning     |
| --------------------------- | ----------- |
| 0                           | owner       |
| 1 + `non_presenter = false` | presenter   |
| 1 + `non_presenter = true`  | admin       |
| 2                           | participant |
| 3                           | chat muted  |
| 4                           | banned      |

Trial is the independent `is_free_trial` flag, not a role. Opcode 5 produces the
role-1/admin combination; opcode 6 toggles the trial flag.

Opcodes, verified against all 42 baseline bindings plus 9 interaction captures:

| Op  | Action                         | Op      | Action                    |
| --- | ------------------------------ | ------- | ------------------------- |
| 1   | make presenter                 | 9       | freshen login date        |
| 2   | make participant **and** unban | 10 / 11 | hide / show personal data |
| 3   | mute                           | 13 / 14 | deny / allow archives     |
| 4   | ban                            | 12      | **never bound anywhere**  |
| 5   | make admin                     |         |                           |
| 6   | make trial                     |         |                           |

**`updateManyUsers` is a different enum** in which `10` means _Remove All_. The two
must never share a code path — wiring one component to both would silently delete
users. They are separate functions here for exactly that reason.

## Authorization

The reference carries **no role gate in its markup at all**, and its `meta.role`
reported `member` on an owner-grade page. That is survivable for a single-owner app
and unacceptable for multi-tenant SaaS: without server-side scoping, one account's
room id is another account's data.

Every room read and write goes through `requireOwnedRoom()`, which 404s when the room
does not belong to the caller's account. The `ng-if` / `ng-show` conditions recovered
from the capture are a **UI specification, not a security model**.

## Styling

The active application owns four evidence-derived global sheets:

- `src/account.css` — shared controller baseline and account page;
- `src/manage.css` — full-bleed manage-session page;
- `src/public.css` — marketing site;
- `src/auth.css` — room-entry card.

The root layout imports the first three. Room-entry pages import `auth.css`.
Nothing imports the separate room application's `app.css`.

The room and the controller are two different visual systems — the room is a bespoke
layout, the controller is float-based Bootstrap 3 (no flexbox, no grid, no CSS custom
properties anywhere in the reference: every flex/grid property has exactly one
distinct value across all 2,156 nodes). Keeping the two stylesheets apart is what
makes the later merge safe.

Active values cite the captured source or measured contract in their files. The
superseded early controller prototype is retained as non-runtime evidence at
`docs/reference/css/controller.css`; it is not application source. Two deliberate
divergences from the reference are documented in the active sheets:

- **Helper text uses the real computed `rgb(51,51,51)`**, not grey. `.muted` is a dead
  class in the reference — all 136 `label.muted` resolve to body-text colour, bold,
  14px. Rendering it grey would not match.
- **The icon font is scoped to `<i>`.** The reference sets `font-family: FontAwesome`
  on the nav links themselves, which renders the literal word "Account" in the icon
  face. That is a bug, and reproducing it would be reproducing a defect.

## Theme

**Scope matters here, and an earlier version of this document got it wrong.**

**The controller has no theme system.** Across its 15 stylesheets: `var(--` occurs 0
times, `darkTheme`/`lightTheme` occur 0 times, `.light { }` is an empty rule, `cssVars`
is `{}` in all 21 captures, and forcing either class changed exactly one node. For the
two controller pages, one palette is correct.

**The room has two complete themes.** Its `index.html` defines ~270 CSS custom
properties, including **20 paired `--lightTheme-*` / `--darkTheme-*` tokens** covering
chat background, message background/border/colour, roster, sidebar, textarea,
separators and nickname colour — plus the full Bootstrap 5.3 `--bs-*` set and a
Bootswatch _Darkly_ base. Full extraction in
`docs/reference/room-theme-tokens.md`.

That resolves what the controller evidence could only hint at: `darkThemeAsDefault`
and `darkThemeStyle` are written **here** and select between token sets defined
**there**. The controller stores the choice; the room owns the palettes.

Practical consequence for this project: the controller needs one palette, and must not
assume the room does.

## Known reference defects

Recorded so they are not reproduced by accident. Full register in
`docs/reference/pieces/ptr1-P30-upstream-bugs.md`.

| Defect                                                                                                  | Decision                                             |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `badgesList` truthy-empty → headers-only table _and_ hidden empty state                                 | **fix** — use `.length`                              |
| `login_webhook_url` field saves `logout_webhook_url`                                                    | **fix** — recorded in `REFERENCE_HANDLER_MISMATCHES` |
| `pane-default` typo → transparent panel borders                                                         | **fix**                                              |
| `background-color: 0A0A0A` (no `#`) → renders white                                                     | **reproduce the white**; it is what users see        |
| `font-family: FontAwesome` on nav links                                                                 | **fix**                                              |
| Launch link `target="_blank"` with no `rel="noopener"`                                                  | **fix**                                              |
| JWT with ~360-day expiry                                                                                | **fix** — mint per click, short expiry               |
| `.fa-reload`, `.fa fa fa-bell-o`, `.fa-user-circle` (needs FA ≥ 4.7, ships 4.3.0)                       | **fix** the classes; the icons render blank upstream |
| Six dead classes: `.muted`, `badge-danger`, `.btn-assertive`, `.btn-md`, `.btn-small`, `.btn-secondary` | do not treat as styling                              |
