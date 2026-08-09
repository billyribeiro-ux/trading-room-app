# ptr1.json — master decode

**Source:** `evidence-dumps/NEXT-STEP/ptr1.json` (23,539,370 bytes)
**Captured:** 2026-07-24T15:59:18.276Z → 15:59:21.690Z (3.414 s window)
**URL:** `https://protradingroom.com/ptrApp#/page/manageSession/6a628a99731b9f77ae9bf505`
**Role:** member · **Viewport:** 1842×1265 @dpr2 · **UA:** Android 15 / Pixel 9 mobile Chrome · **errors:** `[]`
**Decoded slices:** `/tmp/ptr-decode/ptr1/` — 108 files, 45,676 lines, produced by `scripts/decode-ptr-dump.mjs`

Five agents read disjoint slices, each in its own context, none delegating. Their parts are appended
below in full and are the evidence of record. This preamble covers only what no single part could
settle: the cross-slice reconciliation.

---

## 1. What this page is

The **Manage Room** admin page for room **3625** (`_id 6a628a99731b9f77ae9bf505`), title `sess.name`
= "Room 3625". The sibling dump `prt2.json` (account settings) lists this exact room in its Sessions
table — the two captures are the same room seen from both ends, and the ObjectId matches on both sides.

Shell: `<body class="footer-hidden">` → `div.app-container` (`ng-controller="CoreController"`) → two
`ui-view` regions, a 1842×50 black navbar and a 1842×772.8 content area → one Bootstrap-3
`.panel.panel-default`. The navbar is byte-identical in role and structure to prt2's, so it is the app
shell rather than page furniture.

The content is a **6-tab `uib-tabset`**: Users (active) · Text List (hidden, needs
`sess.twillioApiToken`) · Branding · SSO Setup (hidden, needs `authMode=='sso'`) · User Stats ·
Settings. **Only the Users pane paints.** Everything else in the capture — including the entire
263-field settings form — is a hidden tab.

> **Corrected 2026-07-31.** An earlier pass reported 181 fields (102 checkbox / 42 textarea / 33 text /
> 4 number). That agent owned only depth band #720–1439, so it could count only the fields whose nodes
> fell inside its band. A later pass parsed all 2,156 records (0 missing, 0 duplicate; 1,201 under the
> Settings anchor) and cross-checked with a raw grep of every `editable-*` attribute: the tab-wide
> totals are **263 fields — 141 checkbox, 84 textarea, 33 text, 5 number, 0 select**, of which
> **18 are set**, not 15. The 181 figure is a band artifact and must not be used as the schema size.

**Size reality check:** 2,156 nodes, of which roughly **157 render**. Per slice: ~102 of 720 paint
(#0–719), 29 of 720 (#720–1439), 26 of 716 (#1440–2155). A rebuild is implementing ~157 boxes, not 2,156.

## 2. Node ordering — read this before using any part

The node array is **breadth-first by DOM depth**, not document order. Two agents established this
independently: depth rises monotonically from 13 at #1440 to 20 at #2155, and the 13→14 segment
boundary falls exactly at #1289/#1290. **Reconstruct by `path`, never by `#index`** — a node's children
appear hundreds of records later, in another agent's slice. My original "top / middle / tail" framing of
the three baseline ranges was wrong and is corrected here.

Consequence: the three baseline parts are depth bands cutting across every region at once, not page
sections. Components are truncated at band boundaries by construction; each part says where.

## 3. Cross-slice questions the parts could not close (resolved here)

**Q1 — Does any element actually carry `class="dark"` or `class="light"`?**
Part 5 found the `.dark` rules and correctly refused to guess whether anything uses them, since it did
not own the node files. Resolved by grepping every `attr class` line across all 18 baseline node files:
**zero matches.** No element on this page carries a `dark` or `light` class. The `.dark` rules at
`09.css:1195–1201` are dead on this capture.

**Q2 — Which controls open the two unattributed dropdowns?**
Part 4 could not prove this because subtree captures are re-rooted at `path=r`, discarding their
location. Resolved by locating the menus in the baseline tree:

| Menu | Menu node in baseline | Trigger | Trigger text |
|---|---|---|---|
| M1 user-list filter / bulk-remove | `#457` `div.dropdown` at `r.0.1.1.0.1.3.1.0.0.0.0.3` | `#1293` `button.btn.btn-md.dropdown-toggle.btn-primary.mt` | **"User List Actions"** |
| M2 bulk apply-to-many | `#465` `ul.dropdown-menu` at `r.0.1.1.0.1.3.1.0.0.2.1.2` | `#463` `button.btn.dropdown-toggle.btn-primary` | **"Actions With Selected"** |

## 4. Theme verdict — one palette, definitively

Converging evidence from three independent directions:

- `cssVars` is `{"root":{},"body":{}}` for all 21 DOM captures.
- `var(--` occurs **0 times** across all 15 stylesheets — the app has no CSS custom properties.
- `darkTheme` / `lightTheme` occur **0 times** in the stylesheets; the forced body classes match nothing.
- Forcing dark (cap 19) and light (cap 20) each changed **exactly 1 node of 2,156** — the `<body>`
  class attribute — with no style or rect change on any node.
- `.light { }` is an empty rule (`09.css:1196`), and per Q1 above nothing carries `.dark` either.

**A rebuild needs one palette.** The sibling prt2 dump reached the same conclusion from the account
page; this page is where the scoped chat/room `.dark` rules live, so it is the strongest possible place
to test the claim, and it holds.

## 5. Quiescence

`final-room` vs `baseline-room`: **2,156 of 2,156 nodes identical, 0 differing, 0 removed** —
independently recounted by part 5 after the decoder's pseudo-element comparison bug was fixed. Nothing
changed across the 3.414 s window: no socket message, no animation frame, no reflow.

Two readings, both true: the baseline is a clean, quiescent screenshot-diff target — **and** the dump
contains no evidence whatsoever of the app's dynamic behaviour. Live chat, alerts, video, and presence
are unobservable here. That is an honest gap no amount of re-reading fixes.

## 6. Interaction surface (from the 18 subtree captures)

Five distinct menus and one modal, deduplicated from 18 captures:

| ID | Menu | Substance |
|---|---|---|
| M1 | User List Actions | 6 filters + 3 destructive removes |
| M2 | Actions With Selected | 9 role/state ops via `updateManyUsers(n)` |
| M3 | Per-user row menu | 4 submenu parents + Set Note / Edit Username / Remove User / Set Password / Resend Welcome / Pause |
| M3.a | Permissions | Presenter / Admin / Participant / Trial / Mute / Ban / Unban / Freshen Login |
| M3.b | Granular Perms | Mic·Cam·Screen·Chat·Notes → `#permissionsModal`, gated `user.role !== 1`; user-count, archives, PII, PM toggles |
| M3.c | App & Notifications | App PIN · App Tokens · FCM Tokens · pause/resume/remove/test/reset notifs |
| M3.d | Badges | **empty — 0 items** |
| D1 | `#permissionsModal` | 600px dialog, z-1050, 5 checkboxes → `userPermissions.*`, Close + Save |

The `(128, 28, 30, 31, 1)` capture group repeats three times because there are **three `ng-repeat` user
rows**, not three components. Proof: in group 3 the Mic/Cam/Screen item carries `ng-hide` +
`display:none` because that row's user has `role === 1` (Presenter); item counts run 42/42/**41**; row
geometry matches at 62.4px pitch. **One menu component, rendered per row.**

`updateUser` opcode map, recovered from the bindings: 1 Presenter · 2 Participant/Unban · 3 Mute ·
4 Ban · 5 Admin · 6 Trial · 7/8 hide/show user count · 9 freshen login · 10/11 personal data ·
13/14 archives. Opcode 12 unused.

## 7. Traps that would produce a wrong rebuild

1. **`.muted` is a dead class.** Helper labels compute `color: rgb(51,51,51)` — identical to body text.
   Rendering them grey does not match.
2. **`badge-danger` is inert.** "Free Trials" computes `rgb(119,119,119)`, plain grey, not red.
3. **`styles.css` ships twice, concatenated** — copy A = lines 2–1272, copy B = 1273–2574, with 1,046
   consecutive identical rules (~95 KB of dead payload). Copy B is a **newer build**: it drops
   `.thumb20` and adds 31 rules, so rules the newer build deleted are still live via copy A.
   Diffing the two slices returns **only** two differing lines plus the 32 room rules at
   `09.css:2543–2574` (`.roomArea`, `.alertsChatArea`, `.webcamScreenVideo`, `#permissionsModal`,
   badge/chat-tab). Copy B's tail is proven live: `#permissionsModal .modal-content` (`09.css:2561`)
   computes `padding: 20px`.

   > **Corrected 2026-07-31.** An earlier pass claimed "`.thumb20` does not exist" and "`.thumb16` has
   > no `margin-right`". Both are wrong. `.thumb20` exists at `09.css:1049`, un-overridden. Copy B's
   > `.thumb16` (`09.css:2319`) *omits* `margin-right` but does not reset it, so copy A's `5px`
   > survives the cascade.
4. **`14.css:2` `body{overflow:auto}`** is the last sheet and silently overrides `09.css:95`
   `body{overflow:hidden}`.
5. **No flexbox, no CSS grid, no custom properties** — every flex/grid property has exactly one
   distinct value across all 2,156 nodes. Layout is pure float-and-table Bootstrap 3.
6. **Only 15 of 181 settings fields are set.** Unset x-editables render the literal italic word
   "empty"; that is real UI copy, not a placeholder to invent around.

## 8. Upstream bugs in the reference (recorded, not fixed)

| Where | Bug |
|---|---|
| `#550` | binds `sess.login_webhook_url` but saves `logout_webhook_url` |
| `#22` | `background-color: 0A0A0A` — invalid, missing `#` |
| M2 | `updateManyUsers(2)` bound to both "UNBAN Participant" and "Make Participant" |
| row menu | `class="fa fa-reload"` — not a FontAwesome 4 class, renders blank |
| row menu | `class="fa fa fa-bell-o"` — duplicate `fa` |
| settings | `e-title="Alr RoomJS:"` typo; `e-label="Nick   Filter:"` triple space; `#648` copy-pasted `e-title` |

## 9. Sensitive data in this capture

- **Live HS256 JWT** on the "Launch" link (`#49`), payload naming [OWNER_JWT_NAME], the email, user
  ObjectId `[OWNER_USER_ID]`, `exp` 1815944082. **The same token appears in prt2.json.**
- **Real member PII** in the users table: `[OWNER_NAME] / [MEMBER_A_EMAIL]` (last login
  [MEMBER_A_LAST_LOGIN]) and `[OWNER_SHORT_NAME] / [OWNER_EMAIL]`; two live gravatar MD5 hashes.
- Google reCAPTCHA site key `6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx`.
- **Clean:** all 31 secret-bearing settings fields (apiSecret, S3, Vimeo, Twilio, Imgur, OBS, Stripe,
  Slack, clusterIDs) read "empty". No secret leaked.

None of this may be hard-coded into the rebuild.

## 10. Honest gaps — the whole list

1. **Sheets 03 (video-js 7.3.0) and 07 (angularjs-toaster 2.2.0) are CORS-blocked.** All Video.js
   player chrome and all toast geometry are unknown and cannot be matched from this dump.
2. **No screenshot ships in ptr1.json.** A pixel-perfect claim cannot be closed from this file alone —
   it needs a real render diffed against a real screenshot.
3. **The capture truncates attributes at 300 chars and text at 250** — `#0`, `#49`, `#3`, `#12`, `#162`
   are incomplete in the evidence, including the JWT signature.
4. ~~**FontAwesome glyph codepoints are unrecoverable**~~ — **RETRACTED 2026-07-31. This was wrong.**
   Two agents independently reported the `::before` `content` as an empty string; it is not. The glyphs
   are present as UTF-8 Private Use Area characters, which render as nothing in a terminal and so *look*
   empty. Decoding the JSON escapes recovers **56 distinct FontAwesome codepoints** in ptr1 (top by
   frequency: U+F10B ×41, U+F007 ×19, U+F0DA ×12, U+F0E5 ×12, U+F044 ×10, U+F1F8 ×9, U+F023 ×9,
   U+F0A0 ×9, U+F130 ×8, U+F235 ×8, U+F108 ×7, U+F013 ×6 …) and 11 in prt2. Icons are identified by
   **codepoint**, not merely by class name — so an icon-set substitution in the rebuild can be verified
   glyph-for-glyph rather than guessed from class names.

   This also makes the blank-icon bugs checkable rather than inferred: a class whose codepoint is absent
   from the captured set rendered nothing in the real app.
5. **No dynamic behaviour observable** (see §5) — no live chat, alerts, video, or presence.
6. **The Badges submenu `<ul>` has no captured `<li>` children.** Whether it is genuinely empty or a
   capture failure is undetermined; do not invent items.
7. **No `.modal-backdrop` captured**; the permissions modal was caught mid-transition (`opacity:0`,
   `translateY(-82.18px)`), so its resting position is inferred from CSS, not measured.
8. **Modal checkbox checked-states not recorded**; the username binding renders empty (w=0).
9. **No hover, focus, or active states** anywhere in the dump.
10. Missing sibling group indices in the settings form (62/63/65/66/193/204/218 and
    5/8/10/17/20/21/24/29/30); settings rows 40/41/49 have no captured children; row-0 avatar `#1550`
    has no `src`.
11. **Intercom's CSS is absent** (lives in an iframe).

---

## Coverage

| Part | Slice | Lines read | File |
|---|---|---|---|
| 1 | baseline #0–719 | 9,568 | `ptr1-parts/01-baseline-000-719.md` |
| 2 | baseline #720–1439 | 10,458 | `ptr1-parts/02-baseline-720-1439.md` |
| 3 | baseline #1440–2155 | 11,795 | `ptr1-parts/03-baseline-1440-2155.md` |
| 4 | 18 interaction captures | 8,290 | `ptr1-parts/04-interactions.md` |
| 5 | 15 stylesheets + meta + theme/final diffs | 12,775 | `ptr1-parts/05-css-meta-themes.md` |

All 2,156 baseline records covered exactly once (720 + 720 + 716), all 22 non-meta captures covered,
all 15 stylesheets read end to end. Each part carries its own `## Verification` section stating what it
read and what it did not.

**Known limitation in the evidence pipeline:** the decoder's first run compared `::before`/`::after` by
reference rather than by value, producing phantom diffs in the theme captures. The prt2 agent caught it
by hexdumping the "differing" strings rather than trusting the output. The script was fixed
(`scripts/decode-ptr-dump.mjs`) and ptr1's slices regenerated before these five agents read them, so
every count above comes from corrected data.
