# ProTradingRoom staff reconstruction

Svelte 5 / SvelteKit / TypeScript reconstruction driven by the supplied forensic DOM capture.
The app uses pnpm, the deployed ProTradingRoom Darkly stylesheet, Drizzle ORM, and SQLite.

## Where the current state is written down

| Document                                                         | What it is                                                                                                                                                                                    |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/ROOM-STATE-2026-08-06.md`](docs/ROOM-STATE-2026-08-06.md) | **Start here.** Every defect found and fixed with the runtime proof, the channel status, what is still open, and the mistakes worth not repeating. Supersedes both `REPOSITORY-STATE-*` docs. |
| [`TODO.md`](TODO.md)                                             | Deferred work, and the **Evidence gaps** table - things absent from the capture that must never be invented.                                                                                  |
| [`docs/streaming-choices.md`](docs/streaming-choices.md)         | Every streaming-quality option ranked, each marked MEASURED or inferred.                                                                                                                      |
| [`docs/CUTOVER-ROOM-TO-API.md`](docs/CUTOVER-ROOM-TO-API.md)     | Replacing this server layer with the Rust API.                                                                                                                                                |
| `scripts/ptr-collect.js`                                         | Paste into the console on the live room, as either role; downloads what the capture is missing.                                                                                               |

## Run

```sh
pnpm install
pnpm dev --host 0.0.0.0 --port 5175
```

To serve the production build, `ORIGIN` **must** match the URL the browser actually uses:

```sh
pnpm build
PORT=5190 pnpm start:local          # http://localhost:5190
ORIGIN=https://example.com pnpm start   # real deployment
```

adapter-node derives the request origin from `ORIGIN`, falling back to `https://` + the `Host`
header. Serving a plain-http build without `ORIGIN` therefore makes SvelteKit compare a browser
`Origin: http://…` against a computed `https://…` and reject **every** form action with
`403 Cross-site POST form submissions are forbidden` — the page renders normally, so the failure
only shows up as silently inert buttons.

## Accounts and roles

Every route except `/login` requires a session; `hooks.server.ts` redirects anything else there.
Passwords are scrypt hashes (`node:crypto`, no extra dependency) in `users.password_hash`.

`admin` and `staff` are presenters — they may post alerts, run polls and edit notes. Any other
role (`member`, `guest`) is a reader: the presenter controls are not rendered for them, and the
server actions reject them with 403 independently of the UI.

```sh
node scripts/set-password.mjs <email> <password> [role] [display name]
```

Credentials are arguments so none are committed. Visit `/logout` to switch accounts — it is a
separate route on purpose, because the room's navbar markup is pinned against the capture, which
has no logout control.

## Verify

```sh
pnpm check
pnpm test
pnpm build
pnpm capture:forensic
pnpm capture:styles
```

End-to-end checks need a running server, and the media ones need the SFU too
([docs/DEPLOY.md](docs/DEPLOY.md)):

```sh
# Captured-item edits reach the whole room, not just the browser that made them.
BASE=http://localhost:5190 node scripts/alert-delete-e2e.mjs

# Two browsers: a shared screen carries real frames, a second screen does not kill the first,
# and the presenter sees their own tabs.
node scripts/media-screenshare-e2e.mjs

# Rendered room vs the captured DOM. Needs credentials - the room is behind the session guard.
node scripts/audit-clean-app-room.mjs --url=http://localhost:5190/ \
  --email=<address> --password=<password>
```

## Pinned dependencies

`@fortawesome/fontawesome-free@5.8.1` and `animate.css@3.7.2` are held back deliberately and must
not be upgraded. The capture uses each library's v3/v5 class names — `class="fas fa-cog"` and
`class="animated fadeIn"` — and both renamed every class in the next major (`fa-solid`,
`animate__animated`). Upgrading either silently blanks every icon and every animation in a
reconstruction whose whole point is matching the original.

## Database

The default database is `.data/proroom.sqlite`, created on first server load and gitignored — it
holds real addresses.

The current user comes from the session cookie alone. Identity headers (`x-ptr-user-*`,
`x-auth-request-*`) and browser-session guest provisioning were both removed when passwords
shipped: a session only resolves when its user row has a `password_hash`, so the sessions issued
before that are inert rather than silently still valid.

Two tables exist because the captured room items are served from a fixture rather than from rows,
and so cannot be UPDATEd or DELETEd. `hidden_room_items` records deletions and
`captured_item_overrides` records answered/body/reaction edits; the load applies both over
`captured-message-fixture.json`, which is never written to. Anything new that mutates a captured
item has to write there too, or it will revert on the next poll and be invisible to everyone else.

```sh
pnpm db:generate
pnpm db:push
```

## Analyze capture parts

```sh
pnpm capture:analyze proroom-ULTIMATE-staff-2026-07-24T12-42-02-part1.json
```

The analyzer reports every capture label, node count, visible text state, and custom CSS variable.
The generated line-by-line ledger is `docs/generated/part-1-forensic-audit.json`; runtime state and
stylesheet coverage are recorded in `docs/generated/runtime-vs-capture-states.json` and
`docs/generated/part-1-style-coverage.json`. See
[docs/part-1-capture.md](docs/part-1-capture.md) for the evidence and unknowns represented by this
implementation.
