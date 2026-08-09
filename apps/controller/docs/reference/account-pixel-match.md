# /account — pixel match against `room-login-1785587807656.json`

Status: **38/38 rects exact**, **49/49 mapped elements exact**,
**2024/2024 computed properties across the page**,
**315/315 button interaction states**, **474/474 properties on every individual
button**, **40/40 behavioural checks**, **11/11 animation checks**, and
**500/500 responsive source-render comparisons within 0.22 CSS px**.

Everything below is a computed value or a `getBoundingClientRect` read out of the
capture (881 elements, 1989×1265 @dpr2), not a guess. Where our render
deliberately differs, it is listed at the end with the reason.

## How it is verified

Three harnesses drive headless Chrome over the DevTools protocol. There is no
Playwright and no browser extension in this environment, so the pages are
measured directly.

| harness | what it proves |
|---|---|
| `verify-account.mjs` | every rect on the page against the dump |
| `verify-account-full.mjs` | every mapped visible element against the dump |
| `verify-account-responsive.mjs` | both sides of every rendered controller breakpoint against the original DOM and stylesheet cascade |
| `verify-behaviour.mjs` | the bootbox confirm's DOM, its Cancel/OK paths, and that neither reloads |
| `verify-intro.mjs` | `fadeInDown` fires on load and reload only |
| `hover-truth.mjs` | every button in base/hover/focus/active/pressed |
| `audit-all.mjs` | 23 elements × 4 states × 22 properties across the whole page |
| `btn-diff.mjs` | one named button, all 474 captured computed properties |

### Reading interaction states out of a static capture

A dump records one moment, so hover, focus and active never appear in it. Reading
the rules out of `bootstrap.min.css` by eye is not a substitute, and doing that is
what produced the first, wrong, set of button states: the controller also loads
`styles.css` *after* Bootstrap, and it overrides button colours, kills the input
focus ring, and adds a shadow to every button.

The harnesses answer it properly. They rebuild the reference page from the
capture — all fifteen stylesheets, in document order, plus its rawHtml — load it
in Chrome, and force pseudo-states by duplicating every rule that mentions one
with the pseudo swapped for a class of the same name (`:hover` → `.__hover`). A
pseudo-class and a class have identical specificity, so the cascade is preserved.
The same shim then runs against our page and the computed values are diffed.

One subtlety that mattered: the substitution has to replace *every* pseudo in a
selector at once. Doing them one at a time cannot express `.btn-default:active:hover`
— a real, darker rule — so `:active` looked identical to `:hover` and the pressed
state was silently missing from the first truth table.

Two environment notes, both learned the hard way:

- Headless Chrome reports `prefers-reduced-motion: reduce`. `account.css`
  honours that with `animation: none !important`, so the animation harness has
  to emulate `no-preference` or it measures zero animations and calls it a pass.
- Headless Chrome paints classic 15px scrollbars. The capture was taken on
  macOS, where scrollbars are overlays that occupy nothing. Any 15px or 7.5px
  discrepancy is that difference, and it means a real overflow is present.

## What was wrong, and what the evidence said

| symptom | cause | evidence |
|---|---|---|
| every X off by 7.5, navbar 1974 not 1989 | the page overflowed the viewport, so a vertical scrollbar halved into the centring | the footer was rendered twice — once by the page, once by the root layout |
| Badges panel 112.398, should be 106 | "Export Badges" was gated on `badges.length`, and an `<h3>No Badges defined</h3>` stood in for the table | `ng-show="badgesList"` — an empty array is truthy in Angular, so Export is always visible (754.617, 119.078 wide) and the empty table renders (823×60). The message is unreachable in the reference. |
| "Upload Image Badge" 162.656, should be 177.656 | FontAwesome 5 has no `fa-cloud-upload`, so the icon rendered at zero width | the missing 15px is exactly the reference's `<i class="fa fa-cloud-upload">` rect |
| Admin panel 168, should be 158; API table-responsive 176, should be 156 | `.acc-mb` was 20px | every `.mb` element in the capture computes `margin-bottom: 10px` |
| API Keys buttons 16px too low | `margin-top: 15px` baked into `.acc-table-responsive` | only the Extra Admin one is offset, by an inline `style="margin-top: 15px"`; Sessions, Badges and API Keys all start 1px below their panel |
| Badges buttons 5px too far apart; Launch/Manage likewise | `.acc-btn + .acc-btn { margin-left: 5px }` | Bootstrap scopes that to `.modal-footer .btn + .btn`. The real gap is a 3.899px whitespace text node — one space at 14px. |
| Archived button 8px right of the search panel | `.acc-row` was flexbox with `gap: 8px` | a Bootstrap 3 row is floats plus a clearfix; the button flows onto a line box starting at the float's edge, and leading whitespace there is dropped, giving 424.5 + 380 = 804.5 exactly |
| Launch 64.914 wide, should be 76.914 | FA5's `fa-external-link-alt` is narrower than FA4's `fa-external-link` | the capture reports one loaded family, "FontAwesome", and uses four v4-only names |
| API table-responsive 171, should be 156 | a nested `.row` with Bootstrap's -15px margins overflows by 15px, and `overflow-x: auto` turned that into a scrollbar | `scrollWidth` 1123 vs `clientWidth` 1108. `clientHeight` was already 156 — the reference overflows identically and simply never shows it. |
| centre block 30px tall and 30px high | `mt-xl` was folded into `padding: 45px 0 0` | `.center-block.mt-xl` measures 424.5,80,1140×953.992 and must end at 1033.992 where the footer starts. It is a 30px margin plus 15px of padding — and it stays a margin only because `.container::before` (Bootstrap's clearfix) stops it collapsing through. |

## The button states

The visible effect is a **lift**, and it was absent entirely:

```css
.btn:active, .btn.active, .btn:hover, .btn:focus {
  box-shadow: rgba(0,0,0,.23) 0 3px 10px, rgba(0,0,0,.16) 0 3px 10px;
}
```

Every button in the controller rises off the page on hover, focus and press. The
colour shifts alone — which is all the earlier rules did — are the smaller half
of it.

The shape of the colour change, identical across all six variants: hover and a
bare `:active` share one shade; `:focus` keeps the hover background but takes a
darker border; and `:active:hover`, the state a mouse actually produces, goes one
step darker again. Two of those were wrong before: `:active` carried the pressed
colour, so a keyboard-held button jumped straight to the darkest shade, and the
pressed pair did not exist at all. `.btn-inverse` is the exception — styles.css
declares it outright and it does not darken on press.

Six `.btn` declarations were also missing outright, found by diffing all 474
computed properties rather than a shortlist: `text-align: center` (invisible on
`<button>`, which gets it from the UA stylesheet, but Launch, Manage and API Docs
are anchors and were left-aligning their labels), `white-space: nowrap` (a
narrow viewport would wrap a label and break its measured width),
`touch-action: manipulation`, `user-select: none`, `appearance: none` and
`-webkit-tap-highlight-color`.

## The tables

The reference's is `table table-striped table-bordered table-hover`. Three of
those four were missing:

- **`table-hover`** — rows highlight `rgb(245,245,245)` under the pointer. This
  is a second hover effect that was entirely absent.
- **`table-striped`** — odd rows are `rgb(249,249,249)`.
- **`table-bordered`** — vertical rules between columns. The earlier CSS had
  reverse-engineered a single `border-top` from the computed values, which
  happened to reproduce the row rules and nothing else.

Getting the borders right also needed the `.acc-table-responsive` wrapper, which
the Sessions table did not have. The whole `.panel > .table-responsive >
.table-bordered` group hangs off it — the rules that strip the table's outer
border, drop the outermost cell edges, and round the top corners to sit inside
the panel. Without the wrapper the table drew a 1px box the reference has no
trace of and stood 2px taller than measured.

Three more, all from specificity rather than missing values: `.text-center` is
`!important` in styles.css, so ours needed scoping under `.acc-table` to beat the
header cell's own `text-align` — the Name/State/Users/Actions headers were
rendering left-aligned; the muted empty-state grey was losing to the cell rule
and rendering at full strength; and `border-spacing` was inheriting the UA's 2px
against the reference's 0.

## The input focus ring

There isn't one. `styles.css` cancels it outright:

```css
.form-control { box-shadow: rgb(0,0,0) 0 0 0 !important; }
```

so the reference's fields show nothing at all on focus, and the border colour
does not move either. Ours drew Bootstrap's 8px blue glow, which the real page
never paints. It is now matched — with `:focus-visible` retaining an indicator
for keyboard users, since that does not fire for a mouse click.

## Two buttons that had to be built, not styled

"Upload Image Badge" and "Export Badges" were `disabled` placeholders. A disabled
control sits at `opacity: .65` with a `not-allowed` cursor and has no hover state
at all, so their states could never match while they stayed switched off — 44 of
the state failures were those two buttons alone.

Both are now real. Export writes the account's badges out as JSON from the same
rows the table renders. Upload creates an image badge: the button opens a hidden
file input, and the image is stored inline as a data URL, bounded at 256KB and
restricted to PNG/JPEG/GIF/WebP. SVG is excluded deliberately — it is a document,
it can carry script, and these are rendered back into the page.

After a file is selected, Upload opens the exact Bootbox text prompt preserved in
`evidence-dumps/account-page/upload-image-badge-prompt.html` (SHA-256
`fb4e934f761f15fb2eac26882ce6ebac9b6628f6f3b8ab48b20ad521a6c7c43f`). Its title
is verbatim: `Enter the badge name (*optional):`. The header/body/footer shape,
close button, `bootbox-form`, text-input classes, `autocomplete="off"`, and
Cancel/OK controls are source-backed. Cancel uploads nothing; OK accepts an empty
name exactly as the prompt specifies.

## FontAwesome: two versions, on purpose

The controller is **FA4** and the room entry screen is **FA5**. That is not an
inconsistency to clean up — they are two different applications.

- Controller: one loaded family, `FontAwesome`; loads
  `vendor/font-awesome/css/font-awesome.min.css`; uses `fa-external-link`,
  `fa-cloud-upload`, `fa-sort-alpha-asc`, `fa-smile-o`, all v4-only.
- Room: its gear is 16px inside a 27px button — 1em, FA5. FA4's cog is 0.857em
  = 13.719, which shrank that button to 24.719 when FA4 was forced on it.

They coexist by prefix: FA4 owns `.fa`, FA5 owns `.fas`. FA5 also claims `.fa`
for its solid family, so FA4 is imported second and wins on source order; FA4
never defines `.fas`. The six glyphs the room uses share codepoints with FA4, so
the duplicated `::before` rules agree.

## bootbox

Destructive actions open a bootbox confirm and do nothing until OK. The markup
is reproduced exactly:

```html
<div class="modal-content">
  <div class="modal-body">
    <button type="button" class="bootbox-close-button close" data-dismiss="modal"
            aria-hidden="true" style="margin-top: -10px;">×</button>
    <div class="bootbox-body">Remove admin user "…"? This cannot be undone.</div>
  </div>
  <div class="modal-footer">
    <button data-bb-handler="cancel"  type="button" class="btn btn-default">Cancel</button>
    <button data-bb-handler="confirm" type="button" class="btn btn-primary">OK</button>
  </div>
</div>
```

bootbox ships almost no CSS — it is a Bootstrap 3 modal — so every rule is
transcribed from the captured `bootstrap.min.css`, including the 600px dialog
above 768px. Two additions that move nothing: `aria-modal`/`aria-labelledby`,
and a focus trap that restores focus on close.

## The intro animation

`animated fadeInDown` runs on a document load or reload and at no other time.

The container is `div.container.container-sm.animated.fadeInDown`, and it wraps
the page **and** the footer — which is why the root layout owns it rather than
each page building its own.

Three things could replay it, and each is closed:

- `/login → /account`: cannot. The chrome does not change, so the container
  element is never torn down; only the page content swaps.
- `/ → /account`: could. The chrome changes, so `ControllerChrome` remounts with
  a fresh container. The class is resolved once per mount by `animateOnce()`,
  which hands it out once per document and returns `''` thereafter.
- Saving a form: cannot. Every mutation is progressively enhanced, so it re-runs
  `load` instead of building a new document.

`ControllerChrome` is a component rather than a branch of the layout's `{#if}`
for exactly this reason: a component's `<script>` runs once per mount. Resolving
the class in a `$derived` looked equivalent and was not — it re-evaluated after
hydration and stripped `fadeInDown` off the container mid-animation.

## Deliberate departures

Four, all of them load-bearing:

1. **Row actions are buttons, not `<a>` without `href`.** Identical box —
   83.766/75.688/41.203 × 20 — but reachable by keyboard. Their `<label>`
   wrappers, which label no control, are spans with the same computed box.
2. **Two controls are `<button>` where the reference has `<a>` with no `href`.**
   Export Badges and Upload Image Badge render identically — 474/474 computed
   properties and exact geometry on both — but an anchor without an href cannot
   be focused or activated from a keyboard, and these run actions rather than
   navigate.
3. **The trailing `<br>` in the footer is dropped.** It would open a second line
   box and make the footer 111 tall instead of the measured 91.
4. **Marketplace is visible in this full-product build.** The saved DOM proves
   the control exists, but the captured demo tenant sets
   `__disableMarketplace = 'true'` and hides it with
   `ng-hide="disableMarketplace"`. That is tenant entitlement evidence, not a
   global product restriction. The Svelte page reads
   `data.entitlements.marketplace` from the server-only account entitlement
   policy; it defaults to enabled until persisted plans and real subscription
   auth replace that policy. The button intentionally makes this build differ
   from the restricted demo capture and opens the room's Marketplace tab.

## Honest gaps

- The Sessions and API Keys tables use auto layout, so their column boundaries
  are driven by cell content. Our room is named differently from the capture's
  "Room 3625"; current secrets are full 64-character values while unrecoverable
  legacy hash-only rows display an explicit unavailable state until regeneration.
  They are never rendered as a partially masked credential. Those column x/w
  legitimately vary by state.
  The harness checks every other axis and excludes those column widths rather
  than pretending they are fixed.
- The reference's Extra Admin Users table is empty, and so is ours. A populated
  admin row has no reference to be compared against.

### API-key populated-row evidence added after the static capture

The saved authenticated DOM has no keys, so its repeated row was removed by
Angular and could not prove the create result. The HTML identifies the exact
versioned controller bundle and its `page.welcome.html` template. The primary
sources were inspected directly:

- `page.welcome.html`, SHA-256
  `b4faa02ee4698b2eb66e280e6caa890054b4b49f5e1d482ae54fb3e26918964b`
  — populated rows repeat over `apiKeys` and bind `k.apiSecret` in the second
  cell.
- `app.min.js?v=1785053347467`, SHA-256
  `340b376e42ac7169a8f9198edf46b748d628b90af0755c72f63210e0e3bf6580`
  — successful create and rotate operations call `listApiKeys()`; there is no
  success-message paragraph.

This proves the secret's location, persistence across the list refresh, and the
absence of the extra paragraph. New and regenerated credentials therefore retain
an AES-256-GCM-encrypted display copy while the SHA-256 value remains the
verification representation. The authenticated, account-scoped response is
`private, no-store`; ADR 0002 records the narrow security exception and controls.

### Navbar tooltip and form-control amendment — 2026-08-02

The authenticated navbar source contains two Angular UI Bootstrap directives,
not native browser titles:

- `evidence-dumps/login-page/logged-in-page:78` —
  `tooltip-placement="bottom" tooltip="Account Settings"`;
- `evidence-dumps/login-page/logged-in-page:83` —
  `tooltip-placement="bottom" tooltip="Logout"`.

The exact available visual contract is preserved in
`evidence-dumps/NEXT-STEP/gaps/sheet-2.css:1397-1410`: 12px Helvetica, 0.9 open
opacity, 3px bottom margin, 5px vertical placement padding, black background,
white centered text, 3px × 8px inner padding, 4px radius, and the 5px bottom
arrow. The user's 2026-08-02 open-state DPR-2 reference crops add the previously
missing rendered state: `Account Settings` occupies two centered lines and
`Logout` occupies one. That geometry is independently explained by the captured
trigger boxes in
`evidence-dumps/NEXT-STEP/gaps/state-dropdown_0_User_List_Actions.json`:
Account is `96.4297px` wide and Logout is `54px` wide. The original Angular UI
Bootstrap 0.12.1 bundle closes the responsive algorithm: `appendToBody` defaults
to false, the popup is inserted immediately after the trigger, its intrinsic
integer `offsetWidth` is measured, and `$position.positionElements()` centers
that measured box below the trigger. At `768px` and above, the positioned navbar
item constrains Account to two lines; below `768px`, the item becomes fluid and
Account uses its intrinsic one-line width. Logout remains one line in both modes.
The attachment reproduces that topology and algorithm rather than embedding a
device-specific width.

The Svelte rebuild uses an official Svelte 5 attachment for SSR-safe hover/focus
lifecycle, Bootstrap-shaped generated DOM, keyboard Escape dismissal,
`role="tooltip"`, and transient `aria-describedby`. The executable rendered
contract is `pnpm account:tooltips`; it verifies the original trigger widths,
intrinsic popup widths, rendered line count, typography, colors, padding,
radius, opacity, arrow geometry, placement, the original 500ms fade-removal
boundary, and DPR-2 screenshots at `320`, `767`, `768`, and `1440px`. No supplied
evidence proves a hover activation delay, so no delay is claimed or invented.

Chrome's form-control audit exposed upstream defects that are also present in
the original search input (`logged-in-page:432`) and supplied Bootbox prompt
(`evidence-dumps/account-page/upload-image-badge-prompt.html:1`): neither had an
`id` nor `name`. The rebuild intentionally adds stable, nonvisual identities:
`sessSearch` on the account search control and `bootbox-prompt` on both mutually
exclusive prompt branches. This is the accessibility exception permitted by
Engineering SSOT sections 9–10; it changes neither captured geometry nor any
responsive threshold.

The live development database was also inspected read-only. Its sole API key is
a pre-ADR-0002 row with `last_four = 7654` and `secret_ciphertext IS NULL`.
Cryptographic hash verification cannot recover that original secret. The UI
therefore does not invent a masked value or silently rotate a potentially active
credential: the row says `Secret unavailable — regen secret`, and the captured
`regen secret` action explicitly replaces it. New and regenerated values render
all 64 characters before and after reload, as the original `k.apiSecret` binding
requires.

## Verified element by element, not by sample

`scripts/verify/verify-account-full.mjs` walks **every visible element** in the
capture and matches it to ours through a Bootstrap→`acc-` class translation, so
anything present on one side and missing on the other is reported rather than
skipped. **49 of 49 exact.**

Building it found three things the 36 hand-picked anchors had not:

- **The sessions panel was not a column.** The reference's is
  `col-md-12 panel pane-default`, like the Extra Admin and API Keys panels below
  it; ours was a bare `.acc-panel`. Nothing moved, but it made one of three
  sibling panels structurally different from the other two.
- **The State chip's padding is asymmetric** — 2.1px top, 3.15px bottom, which is
  Bootstrap's `.2em`/`.3em` at 10.5px. Squared off to 2.1 both ways it measured
  16.688 against the reference's 17.742.
- **A class-name collision I had introduced.** A hint style added for the API-key
  restrictions editor reused `.acc-muted`, which already belongs to the Users
  count at 14px, and silently shrank every one of those to 12px. The audit caught
  it as 2020/2024; the hint is `.acc-hint` now.

### Which reference is authoritative

Two exist for this page and they disagree by 0.016px on every percentage width —
379.984 against 380. The cause is the capture method, not the page: a stylesheet
read back out of the CSSOM has its percentages serialised with fewer digits than
the source, so `33.33333333%` returns as `33.3333%` and 1140 × that lands a 64th
of a pixel short.

So the **rect dump wins** — it measured the real page in a real browser. The
served-DOM reconstruction is only used where no dump exists, which is the Manage
page.

The served-DOM reconstruction still lands some percentage values on a different
1/64px floor. The responsive harness therefore allows only the documented
0.2px cumulative reconstruction tolerance, while the authoritative desktop dump
continues to pass its strict 0.01px threshold.
