# Breakpoint evidence and implementation contract

This file is the source of truth for responsive thresholds in the rebuild. A
breakpoint is included only when it appears in an original stylesheet or in the
saved page source. Framework conventions are not treated as evidence by
themselves.

## Evidence files

The public and controller stylesheets were fetched from the exact URLs linked by
the saved originals on 2026-08-01. The room bundle URL is content-hashed in the
saved room-login HTML. SHA-256 makes the evidence version explicit if a live URL
later changes.

| Surface | Original file | SHA-256 |
|---|---|---|
| Marketing | `https://protradingroom.com/public/css/bootstrap/bootstrap.min.css` (declares Bootstrap 3.1.1) | `e9503448692b738dd260fbd7f7cabf2e11f09b600fa97e6eb3a56eba5b1a7e9b` |
| Marketing | `https://protradingroom.com/public/css/compiled/theme.css` | `497733a044053a64d2ff340192b9542306269bde38a55db30308791ee26470ab` |
| Marketing | `https://protradingroom.com/public/css/main.css?v1.0` (no media queries) | `a27b150001e49d3cb6b82f954c21c693c1e74e87d4fee6e7bcc4d87cfde10c42` |
| Controller | `https://protradingroom.com/public/app/css/bootstrap.min.css` | `f75e846cc83bd11432f4b1e21a45f31bc85283d11d372f7b19accd1bf6a2635c` |
| Controller | `https://protradingroom.com/public/app/css/styles.css` | `23bc4e026a06c84c8ed31d4726c54651932b82087436dbfe36eee77936c2f49c` |
| Controller vendor | `https://protradingroom.com/public/vendor/angular-xeditable/dist/css/xeditable.min.css` | `c51ac7a8b5f8ac4493c0ed984df116afab847755acd5d18eedf88150a628fb52` |
| Room | `https://chat.protradingroom.com/styles.d622cb9ed2bbc221.css` (the hash-named file linked by `evidence-dumps/room-login/room-login-file`) | `0f9482210ab4e57898b2a11979dcd37c299d9f4e05e4f8910c6115e46a6a8ffa` |

The controller inventory is independently preserved in
`pieces/ptr1-P25-spacing-shadows-breakpoints.md`; the room component queries and
breakpoint variables are also present verbatim in `evidence-dumps/room-login/room-login-file`.

## Marketing contract

The imported Bootstrap 3.1.1 file proves:

- `.container`: base fluid width, `750px` at `min-width:768px`, `970px` at
  `min-width:992px`, and `1170px` at `min-width:1200px`.
- `.col-sm-*`: starts at `min-width:768px`.
- `.col-md-*`: starts at `min-width:992px`.
- `.hidden-xs`: applies at `max-width:767px`.
- The collapsed/expanded navbar pair is `max-width:767px` / `min-width:768px`.

The later `theme.css` file proves an important cascade detail: inside
`@media (min-width:1200px)` it sets `.container { width:970px }`. Because that
file imports Bootstrap first, the marketing site remains `970px` wide above
1200; using Bootstrap's nominal `1170px` there would not match the original.

The `#home4` rules used by the saved home page contain `max-width:767px`,
`max-width:991px`, and `min-width:992px` branches. Other theme thresholds
(`400`, `450`, `530`, `600`, `620`) belong to selectors not rendered by this
rebuild and must not be added to unrelated components.

## Controller contract

The captured Bootstrap file and `styles.css` prove the canonical controller
scale: `480 / 768 / 992 / 1200`, with max mirrors `479 / 767 / 991 / 1199`.
Only thresholds whose selectors exist in this rebuild are implemented:

- `.container`: `750 / 970 / 1170` at min `768 / 992 / 1200`.
- `.col-sm-*`: `min-width:768px`.
- `.col-md-*`: `min-width:992px`.
- `.table-responsive`: `max-width:767px`.
- Bootstrap modal desktop sizing: `min-width:768px`.

The xeditable vendor file really does use the nonstandard inclusive pair
`max-width:750px` and `min-width:750px`. The rebuild uses inline editors, not the
vendor `.popover-wrapper form`, so those queries do not apply. If that popover is
introduced later, `750` must be copied exactly rather than normalized to `768`.

### Account API-key table

The original API-key table does not center the whole row. Its `_id` and `secret`
headers/cells are left-aligned; only `Actions` carries `text-center`. The direct
panel wrapper resolves to `overflow:auto` at every width. Below `768px`, the
captured Bootstrap rule additionally forces all responsive-table cells to
`white-space:nowrap`. Therefore a long unbroken secret is expected to widen the
auto-layout table and expose horizontal scrolling. No original breakpoint adds
wrapping, truncation, an ellipsis, or a centered card transformation.

The populated-row template and asset hashes are preserved in
`reference/pieces/prt2-Q06-api-keys-section.md`.

## Room-login contract

The saved element carries `col-sm-6 offset-sm-3` as well as md classes. The
hashed room bundle proves `sm = 576px`, so the login column is full width below
576 and half width from 576 upward. The same bundle sets the standard modal's
`500px` max width and `1.75rem` auto margins at `min-width:576px`.

The component also contains `max-width:767px` and `max-width:320px` rules for a
room-name/side panel and navbar logo that this rebuild does not render. A global
`max-width:600px` rule repeats viewport overflow behavior; it is not a grid
threshold and does not change the rebuilt login wrapper.

## Enforcement

`pnpm breakpoints:verify` checks the media-query values and their associated
selectors in `public.css`, `account.css`, `manage.css`, and `auth.css`.
`pnpm account:contract` pins the saved authenticated HTML by SHA-256 and
checks the account-specific responsive selectors. Both run before the Vitest
suite through `pnpm test`.

`pnpm account:responsive` is the browser-level boundary audit. It renders the
captured DOM and stylesheet cascade alongside the live authenticated Svelte page
at 320, 479, 480, 767, 768, 991, 992, 1199, 1200, and 1989 CSS pixels. It is a
forensic local gate because it requires the original dump, Chrome, a running
server, and an authenticated development cookie.
