# Piece index — 44 files, 35,509 lines, 2.1 MB

Two reference captures of `protradingroom.com`, decoded into one file per component. Each piece is
self-contained: path anchor + record count, full node table, every attribute verbatim, **resolved
absolute computed styles** (you never need to consult a DEFAULTS table), verbatim text, a rebuild spec
with real HTML/CSS, and its own honest gaps.

Raw evidence: `/tmp/ptr-decode/ptr1/` and `/tmp/ptr-decode/prt2/`, produced by
`scripts/decode-ptr-dump.mjs`. Redactions: see `../REDACTIONS.md`.

---

## ptr1 — Manage Room (`#/page/manageSession/6a628a99731b9f77ae9bf505`)

### Structure
| Piece | File | Anchor |
|---|---|---|
| P01 | `ptr1-P01-document-shell.md` | `r`, `r.1`–`r.12`, `r.0` |
| P02 | `ptr1-P02-navbar.md` | `r.0.0.0` |
| P03 | `ptr1-P03-panel-shell.md` | `r.0.1.1` |
| P04 | `ptr1-P04-room-form.md` | `r.0.1.1.0.1.{0,1,2}` |
| P05 | `ptr1-P05-tabset-nav.md` | `r.0.1.1.0.1.3.0`, panes `.1.{0..5}` |

### Users pane — the only region that paints
| Piece | File |
|---|---|
| P06 | `ptr1-P06-users-pane-toolbar.md` |
| P07 | `ptr1-P07-users-table.md` |
| P08 | `ptr1-P08-user-rows.md` |

### Menus and modal
| Piece | File | Note |
|---|---|---|
| P09 | `ptr1-P09-menu-user-list-actions.md` | trigger "User List Actions" `#1293` |
| P10 | `ptr1-P10-menu-actions-with-selected.md` | 10 items; second trigger "Actions With the Email List" |
| P11 | `ptr1-P11-menu-user-row.md` | 128 nodes, 4 submenu parents |
| P12 | `ptr1-P12-submenu-permissions.md` | opcodes 1/5/2/6/3/4 → 2/9 |
| P13 | `ptr1-P13-submenu-granular-perms.md` | opens `#permissionsModal` |
| P14 | `ptr1-P14-submenu-app-notifications.md` | no `updateUser` calls at all |
| P15 | `ptr1-P15-submenu-badges.md` | genuinely empty, proved 5 ways |
| P16 | `ptr1-P16-permissions-modal.md` | z-1050, 5 checkboxes |

### The other five tabs — present in DOM, never laid out
| Piece | File |
|---|---|
| P17 | `ptr1-P17-tab-text-list.md` |
| P18 | `ptr1-P18-tab-branding.md` |
| P19 | `ptr1-P19-tab-sso-setup.md` |
| P20 | `ptr1-P20-tab-user-stats.md` |
| P21 | `ptr1-P21-settings-general.md` |
| P22 | `ptr1-P22-settings-advanced-cluster.md` |

### Design system
| Piece | File |
|---|---|
| P23 | `ptr1-P23-palette.md` — all 240 colours in `09.css`, declared-vs-computed reconciliation |
| P24 | `ptr1-P24-typography.md` |
| P25 | `ptr1-P25-spacing-shadows-breakpoints.md` — all 144 `@media` blocks, 33-level z-index stack |
| P26 | `ptr1-P26-stylesheet-inventory.md` |
| P28 | `ptr1-P28-assets-scripts-fonts.md` |

### Synthesis
| Piece | File |
|---|---|
| P27 | `ptr1-P27-theme-verdict.md` |
| P29 | `ptr1-P29-angular-data-model.md` — 269 `sess.*`, 23 `user.*`, 40 scope vars, 89 `ng-click` signatures |
| P30 | `ptr1-P30-upstream-bugs.md` — 16 defects, each reproduce-or-fix |
| P31 | `ptr1-P31-honest-gaps.md` — 24 gaps |
| P32 | `ptr1-P32-capture-metadata-quiescence.md` |

## prt2 — Account Settings (`#/page/welcome`)

| Piece | File | Note |
|---|---|---|
| Q01 | `prt2-Q01-shell-navbar.md` | **proven identical to ptr1's navbar** — build once |
| Q02 | `prt2-Q02-login-card-hidden.md` | zero layout evidence |
| Q03 | `prt2-Q03-sessions-section.md` | captured JWT on the Launch link (tracked value redacted) |
| Q04 | `prt2-Q04-badges-section.md` | truthy-empty-array bug |
| Q05 | `prt2-Q05-admin-users-section.md` | |
| Q06 | `prt2-Q06-api-keys-section.md` | only section where every node renders |
| Q07 | `prt2-Q07-layout-footer.md` | full vertical map, y=0→1265 |
| Q08 | `prt2-Q08-forms-and-inputs.md` | 3 forms / 12 inputs / 2 textareas / 5 labels |
| Q09 | `prt2-Q09-iframes-recaptcha.md` | 4 of 5 are reCAPTCHA; the 5th has no `src` |
| Q10 | `prt2-Q10-intercom-emoji-picker.md` | 635-glyph inventory; **vendored, not injected** |
| Q11 | `prt2-Q11-css-and-theme.md` | |
| Q12 | `prt2-Q12-gaps-and-pii.md` | 16 gaps + 10-item sensitive-data register |

---

## Findings that override earlier passes

Later passes with better evidence corrected earlier ones. Where they conflict, **these win**:

| Claim | Superseded by |
|---|---|
| Settings form has 181 fields, 15 set | **263 fields (141 checkbox / 84 textarea / 33 text / 5 number), 18 set.** The 181 came from an agent that owned only one depth band. |
| FontAwesome codepoints unrecoverable | **56 distinct codepoints recover cleanly in ptr1, 11 in prt2.** They are UTF-8 PUA chars that render blank in a terminal. |
| `.thumb20` does not exist; `.thumb16` lost its `margin-right` | **Both false.** `.thumb20` is at `09.css:1049`; copy A's `5px` survives the cascade. |
| Emoji picker is injected third-party Intercom DOM | **Vendored and app-shipped.** No Intercom script loads; its CSS is the app's own inline sheet. |
| All 5 prt2 iframes are reCAPTCHA | **4 of 5.** `#158` has no `src`, `title`, `name` or `sandbox`. |
| 14 nodes parked off-screen | **15.** |
| `#162` is truncated | **Not truncated.** Real set is 7 fields on 6 records. Earlier pass measured escaped length. |
| `sessSearch` is the ptr1 search model | **`uSearch ` and `uSearchStat `** — both with trailing spaces. `sessSearch` is prt2's. |
| M2 has 9 items | **10.** Plus a second trigger, "Actions With the Email List". |
| Settings sibling indices 62/63/65/66/193/204/218 absent | **Present** as `<br>`/`<label>`/`<hr>`/`<p>` structural siblings; 0…225 contiguous. |
| Row pitch 558 → 599 → 661 | **549.5 → 590.5 → 652.9.** The earlier figures were gravatar tops, not row boxes. |
| The `0A0A0A` element is near-black | **Renders white.** The declaration is invalid and dropped. |

## Load-bearing traps

1. **`pane-default`** is a typo for `panel-default` on all four prt2 content panels — borders resolve transparent.
2. **Submenus drop DOWN** (`top:100%; left:0`), not sideways, despite `fa-caret-right` icons.
3. **`updateManyUsers` is a different enum from `updateUser`** — `10` means *Remove All* there. Sharing one component would silently delete users.
4. **Six dead classes**: `.muted`, `badge-danger`, `.btn-assertive`, `.btn-md`, `.btn-small`, `.btn-secondary` (a Bootstrap 4 class on a Bootstrap 3 page).
5. **`.btn-link` neutralises variant colour** — 10 `.btn-primary` classes yield 9 fills.
6. **`14.css:2 body{overflow:auto}`** beats `09.css:95 body{overflow:hidden}`.
7. **Only 163 of 2,156 ptr1 nodes carry a real rect**; 113 of 882 in prt2.

## What these dumps cannot tell you

- **No screenshot in either file** — pixel-perfection cannot be *closed* from this evidence. Geometry,
  computed styles and colours verify; rasterisation, webfonts and image assets do not.
- **Sheets 03 (video-js 7.3.0) and 07 (angularjs-toaster) are CORS-blocked** — all player chrome and
  toast geometry unrecoverable.
- **No dynamic behaviour** — `final-room` is identical to baseline in both dumps. No chat, alerts,
  video or presence was ever observed.
- **No `<head>` captured** in either dump — no title, meta or `<link>` evidence.
- **72 of 144 `@media` blocks unverified** (all `max-width`, all `print`).
- **The `.shadow-z*` set, all 14 `.bg-*` families, and 27 of the 32 room rules have zero elements**
  on these two captures — they belong to the live-room route, which was never captured.
