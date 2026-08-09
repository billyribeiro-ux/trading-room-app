# The amendment phase

Status: **superseded by ADR 0003**

This file is retained as historical design evidence. Its SQLite/file-move outcome
must not be executed. The selected production boundary and current rollout plan
are `docs/decisions/0003-vercel-rust-postgresql-control-plane.md` and
`docs/PRODUCTION-CUTOVER-PLAN.md`.

How this standalone product folds into `../new-room` once it is done.

The goal of building separately was never permanent separation — it was to avoid
touching a finished, working room implementation while building something large next
to it. The merge is designed to be a **file move, not a reconciliation**.

---

## The two rules that keep it cheap

Everything below depends on these holding for the whole build. Break either and the
amendment stops being mechanical.

### Rule 1 — the controller imports only from the seam

Allowed imports from shared ground:

- `$lib/room-settings-schema.ts` — generated, identical on both sides
- `$lib/room-config.ts` — precedence resolver
- `$lib/server/db/*` — schema and connection

**Never** import a room component, a room store, or anything under the room's
feature code. The controller must not know the room's internals exist.

Check it before merging:

```bash
grep -rn "from '\$lib/components\|from '\$lib/room-message\|from '\$lib/poll" src/ && echo "VIOLATION"
```

### Rule 2 — controller styles stay isolated

`../new-room` imports `app.css` in its **root** layout, so it is global to every
route today. The controller's Bootstrap-3 floats would collide with the room's
bespoke layout in both directions.

Never add controller styling to `app.css`, and never import `app.css` here. The
active standalone sheets are `account.css`, `manage.css`, `public.css`, and
`auth.css`; consolidate only during the merge and only with the pixel contracts
green.

---

## The merge, step by step

### 1. Introduce route groups in `new-room`

Route-group parentheses do not change URLs. `/` stays `/`.

```
src/routes/
  +layout.svelte          ← keep ONLY the font preloads; move the app.css import down
  (room)/
    +layout.svelte        ← NEW: imports ../../app.css
    +page.svelte          ← moved, unchanged
    +page.server.ts       ← moved, unchanged
  (controller)/
    +layout.svelte        ← imports the isolated controller/public sheets
    account/...
  login/  logout/         ← shared
```

This is the only change to existing room files, and it is a move plus one relocated
import. The room's behaviour does not change.

### 2. Move the controller routes

```
new-room-control/src/routes/account/**  →  new-room/src/routes/(controller)/account/**
new-room-control/src/routes/login/**    →  merge with the room's existing login
new-room-control/src/account.css        →  new-room/src/account.css
new-room-control/src/manage.css         →  new-room/src/manage.css
new-room-control/src/public.css         →  new-room/src/public.css
new-room-control/src/auth.css           →  new-room/src/auth.css
```

### 3. Move the seam and the generator

```
src/lib/room-settings-schema.ts           →  same path in new-room
src/lib/room-config.ts                    →  same path in new-room
scripts/extract-manage-schema.mjs         →  same path in new-room
scripts/outline.mjs                       →  same path in new-room
scripts/verify-room-settings-schema.mjs  →  same path in new-room
```

These were written to live at these paths on both sides, so this is a copy.

### 4. Reconcile the database — the one genuinely careful step

The two products have overlapping table names with different shapes:

| Table                               | `new-room` today                                                       | `new-room-control`                                  | Action                                                     |
| ----------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| `users`                             | id, displayName, email, avatarUrl, role **text**, status, passwordHash | id, **accountId**, email, displayName, passwordHash | add `account_id`; keep both role columns during transition |
| `sessions`                          | login sessions                                                         | renamed `login_sessions`                            | keep the room's name; rename here                          |
| `rooms`                             | **does not exist**                                                     | full table                                          | new, forward-only                                          |
| `room_settings`                     | **does not exist**                                                     | full table                                          | new, forward-only                                          |
| `room_users`                        | **does not exist**                                                     | full table                                          | new, forward-only                                          |
| `user_settings`                     | per-user prefs                                                         | not present                                         | unchanged — this is the other half of the seam             |
| `badges`, `admin_users`, `api_keys` | do not exist                                                           | full tables                                         | new, forward-only                                          |

Only `users` needs altering. Everything else is additive.

**Forward-only.** Write a new migration; never edit a shipped one. Backfill a single
account row and point every existing user at it, then add the NOT NULL constraint in
a follow-up migration once the backfill is verified.

### 5. Point the room at the settings

Until this step the controller writes settings nobody reads. For each setting a room
feature should honour:

1. Read it through `resolveRoomConfig(roomSettings, userPreferences)` — never from
   the JSON blob directly, or precedence gets re-implemented per component.
2. Respect `locked`: a policy setting the owner is enforcing must not render as a
   user-flippable control.
3. Add the key to the generator's explicit `wired` input, regenerate with
   `pnpm schema:extract`, and prove exact output with `pnpm schema:verify`.

The current 11 wired settings growing toward the full 268-setting product schema is
the real completion metric for this project. Rendering all 268 fields in the UI is
not. The total is 267 evidence-extracted settings plus the reviewed `roomType`
deviation.

### 6. Delete the shell

`package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `app.html`,
`hooks.server.ts` — all superseded by `new-room`'s. `docs/` moves across intact.

---

## Cost of the split, stated honestly

- Two `package.json` files means duplicated `node_modules` and a second dev server
  until the merge.
- Both products must point at the **same database** for a setting written here to
  be a setting the room reads. Until they do, this project is configuring its own
  database and nothing else. That database is now PostgreSQL addressed by
  `DATABASE_URL`, which makes sharing one a matter of pointing both at the same
  server — where a SQLite file could only ever have been shared by two processes
  on one machine.
- Versions are pinned identically to `../new-room` today. If either side upgrades
  SvelteKit, Svelte, Drizzle or the `postgres` driver before the merge, the other
  must follow or step 1 stops being free.

## Merge checklist

- [ ] Rule 1 holds — no room imports (grep above is clean)
- [ ] Rule 2 holds — no controller styling in `app.css`
- [ ] `pnpm check` clean on both projects
- [ ] Route groups introduced; room still renders identically at `/`
- [ ] `users.account_id` migration written, forward-only, with backfill
- [ ] Both apps reading one database file
- [ ] Every wired setting has a test proving the room honours it
- [ ] `docs/` moved across, `README.md` merged
