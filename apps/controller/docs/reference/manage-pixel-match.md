# /account/rooms/[id] — Manage Session, matched against `evidence-dumps/login-page/manage`

Status: **26/26 baseline rects exact** and **22/25 tab rects exact** against the
REAL capture, **268 settings extracted + 1 reviewed deviation = 269 total**,
`svelte-check` clean, 32 tests.

The three tab checks that do not pass are off by **0.016px, 0.047px and
0.141px** — see "Where it stops" at the foot of this file. They are left failing
rather than absorbed into a looser tolerance.

## Making a markup-only capture measurable

`evidence-dumps/login-page/manage` is served DOM — 219KB of it — with no geometry at all. So one
was made: that markup rendered in headless Chrome against the controller's real
stylesheets, which were captured whole in `room-login-1785587807656.json` (same
app, same CSS), at the same 1989×1265 @dpr2 as every other measurement here.
`scripts/verify/ref-manage-rects.mjs` builds it; `scripts/verify/verify-manage.mjs`
diffs our page against the result.

One correction that mattered: the captured stylesheet's `@font-face` points at a
relative path that does not resolve from a `file://` page, so on the first run
every icon fell back to a default glyph of uniform width — `fa-external-link`
measured 8.672 where the real dump has 12 — and made the reference's buttons look
narrower than they are. The harness now injects FontAwesome 4 from `node_modules`,
and the icon widths agree with the `/account` dump exactly.

## The layout is not the account page's

| | /account | /account/rooms/[id] |
|---|---|---|
| shell | `.container.container-sm`, 1170 centred | `.ng-fluid`, **x=0 w=1989** |
| intro | `animated fadeInDown` | none — the reference uses `ng-fadeOutZoom` |
| page footer | `.p-lg.text-center` inside the container | **none**; the last element is the panel's own `.panel-footer` |

So `ControllerChrome` now takes a `shell` prop. Everything else about the chrome —
navbar, bootbox, the once-per-document animation rule — is unchanged and shared.

## What the geometry caught

Four bugs, none of which any amount of reading would have found:

| symptom | cause |
|---|---|
| every row 1px tall per field, compounding down the page | the editable trigger was a `<button>`; its dashed `border-bottom` adds to an inline-**block**'s height, and Chrome will not let a button be `display: inline`. It is now a `<span role="button" tabindex="0">` with a keydown handler — inline, so the border costs nothing, and genuinely keyboard-operable, which the reference's `<a href="">` is not. |
| every row 2px out | `line-height: 20px` instead of Bootstrap's **ratio**. 14 × 1.42857 is 19.984 in Chrome; 20px is 20. |
| `form-control-static` 14px below its column | the UA's `p { margin: 1em 0 }` — Bootstrap's reboot resets it and that reset had not been transcribed |
| the tab strip and everything under it 14px down | the UA's `ul { margin-top: 1em }`, collapsing out of the tabs wrapper. Same cause, different element. |
| `.btn-link` 2px too tall | it carries no border in this cascade, unlike every other button variant |

## Settings: 268 extracted + 1 reviewed deviation = 269 total

`scripts/extract-manage-schema.mjs` replaces the older ptr1.json-derived
generator. This capture is a room with more switched on, and it carries eight
bindings the older one never rendered.

All eight turned out to be **inside HTML comments** — dead template code the
reference does not render — and are deliberately excluded, which is verified
rather than assumed: the extractor was run, the eight were missing, and each was
then checked against the raw file's comment spans.

One live binding is not an `editable-*` directive: the Branding tab's landing-page
editor is `ng-model="sess.description"`, a textAngular WYSIWYG. It is added
explicitly rather than missed.

`roomType` is the one reviewed product deviation. Its editor is commented out,
but the live reference reads the property to reveal webinar controls. It is kept
separate from the 268 extracted count rather than misreported as captured.

The exact `wired` set is explicit generator input, not state carried across from
an old output file. It records whether our implementation reads a value: 11 of
268 currently do, and the UI marks the other 257 rather than pretending they work.
`pnpm schema:verify` proves clean-path regeneration preserves that contract.

## Tabs

Six, in the reference's order and with its labels. Two are conditional there and
here: **Text List** needs a Twilio token (`ng-show="sess.twillioApiToken"`) and
**SSO Setup** needs `authMode === 'sso'`, which is why the captured page renders
only four.

The Settings tab splits at the reference's own `DON'T TOUCH` heading — a click on
the word "TOUCH" reveals the cluster/media block behind it, exactly as
`ng-click="donttouchShow=!donttouchShow"` does.

## What was built to make the page real

The page was a sketch: it re-wrapped itself in `.acc-body` (which the layout
already provides), used class names no stylesheet defined, and most of its
buttons did nothing. Now backed by real actions:

- **Reset Counts** clears the high-water mark
- **Clone Room** copies settings and text list into a new room with a fresh short
  code and public id, and no members; `clonedFromId` is what makes **Delete Room**
  appear on the copy and stay hidden on the original, which is the reference's own
  rule
- **Vanity / Unique Link** — one chosen and validated, one generated
- **Add User / Invite**, **Remove non-presenters**, **Remove All User Badges**,
  **Remove User**, and the bulk menu
- **Export** (users CSV, email CSV, settings JSON), **Upload/Change** and **Reset**
  for the logo

New columns, added forward-only and idempotently: `rooms.public_id`,
`vanity_slug`, `unique_slug`, `logo_url`, `cloned_from_id`, and
`room_users.badges_json`. Existing rows are backfilled with a public id rather
than left rendering a broken link.

Every destructive action goes through the same bootbox confirm as `/account`, and
every mutation is progressively enhanced, so nothing on this page reloads the
document either.

## The gaps, closed

`scripts/capture-gaps.js` was run against the real Manage page and its output
decoded into `evidence-dumps/NEXT-STEP/gaps/`. What it closed:

| was | now |
|---|---|
| the spinner image had never been captured | `ajax_loader.gif`, 4,178 bytes, in `static/` and on the page |
| the textAngular toolbar had no reference | 30 controls measured; built as a real contenteditable editor |
| Text List and SSO Setup were unreachable tabs | both panes always rendered; only the tab LINK hides, as the reference does |
| User Stats was a stub | the real date fields, four filters, search and Reverse |

Two things the real capture caught that no amount of reading would have:

- **Bootstrap's constants, rounded.** I had `1.42857` and `16.6667%`; Bootstrap
  ships `1.428571429` and `16.66666667%`. Chrome lays out on a 1/64px grid, so
  14 x 1.42857 is 19.99998 and snaps to 19.984, while the real value gives
  exactly 20. Both read as "20" until you diff them against the real page.
- **`.btn-group > .btn` is floated.** That is what puts the two word/character
  counters — which carry `display: block` — on the same line as the buttons: a
  float shrink-wraps, so `min-width: 100px` becomes their width. Without it they
  stacked and wrapped the toolbar to three rows, 128 tall against 42.711.

Three more found the same way: `.mg-root .btn` was never defined at all (the
reference's markup on this page uses the plain Bootstrap class, so those buttons
had no sizing and measured 21 against 34); the `<hr>` under the logo carries
`overflow: hidden`, which makes it a block formatting context so it sits BESIDE
the floated columns rather than under them; and an author `display` rule outranks
the UA's `[hidden] { display: none }`, which left a file input on screen.

## The landing-page editor

Real, not a picture of one: the toolbar drives `document.execCommand` over a
contenteditable, which is what textAngular itself does. The HTML button swaps the
body for a raw textarea and the two counters are live.

`execCommand` is deprecated with no replacement for this job. It is implemented
everywhere, it is what the reference uses, and hand-rolling selection surgery
would be a larger correctness risk than the deprecation.

**The stored HTML is sanitised on the server.** The reference stores whatever its
editor emits and renders it straight back out, which is stored XSS: the landing
page is written by a room owner and shown to every member. `sanitizeHtml` is an
allowlist — anything unnamed is dropped, so a tag nobody thought of fails closed
— and it runs on the way IN, on the server, because the action is reachable with
curl. 13 tests cover it, including the `<scr<script>ipt>` nesting trick that
defeats a regex strip, `java\tscript:` control-character smuggling, and
`style="background-image: url(javascript:...)"`.

Writing those tests found a real bug: a stray `<`, as in "5 < 6", matched no
alternative and a global `exec` skipped straight past it, **deleting a character
of the user's text**. Fixed and covered.

## The users table — found in ptr1.json

Every capture of the Manage page had an EMPTY users table, so the row was built
from the header alone. Searching the older dumps turned up `evidence-dumps/NEXT-STEP/ptr1.json`
— which is a Manage-page capture at a 1842-wide viewport, and **its table has
three real rows**. That is the only populated one in evidence anywhere, and it
carries every `ng-show` branch, hidden ones included.

What it corrected:

| was | evidence | now |
|---|---|---|
| Admin stored as `role 5` | `ng-show="user.role==1 && user.nonPresenter"` | role 1 + `nonPresenter`; there is no role 5 |
| mute/ban as booleans beside the role | `"user.role==3"` → CHAT MUTED, `"user.role==4"` → BANNED | roles in their own right |
| Trial as `role 6` | the TRIAL badge reads `user.isFreeTrial` | a flag, not a role |
| opcodes 7/8, 10/11, 13/14 "are room settings" | every one reads `user.*` | per-member row state, now stored and wired |

What it added to the row: a `thumb24` avatar leading the Name/Email cell; the
`TRIAL`, `User Count Hidden`, `User Personal Info Hidden`, `PW set`,
`*** INACTIVE USER ***` and `User PMs disabled` markers; the five permission
icons plus `fa-hdd-o` for denied archives; the `/ login` suffix that is hidden
only for the owner; and the checkbox that only appears when `user.role!==0`.

And the Actions menu in full — four submenus (Permissions, Granular Perms, App
and Notifications, Badges) over 30 actions, each with its exact label and opcode.
Set Note, Edit Username, Set/Change Password, Remove User and the badge toggles
are all wired to real, room-scoped actions. The eight mobile-notification actions
are listed and disabled with a reason: they call a push service this product does
not have, and a menu item wired to nothing is worse than one that says so.

Two of those write to the shared `users` row — rename and password — so both are
scoped to the room being managed in the same statement, or an owner could reach
an account they do not administer by guessing a row id. The password is hashed
with the app's own function, floor-checked at 10 characters on the server as well
as in the markup, and never echoed back.

## Where it stops

Three tab checks are off by less than a fifth of a pixel:

| check | reference | ours | delta |
|---|---|---|---|
| toolbar group 1 width | 307.625 | 307.641 | 0.016 |
| toolbar group 2 width | 275.656 | 275.703 | 0.047 |
| SSO pane height | 34 | 34.141 | 0.141 |

The group widths are text rasterisation. Comparing the nine buttons in group 1
one by one, **six are byte-identical** (36.063, 32.219); only "P" (29.133 vs
29.141) and "pre" (37.898 vs 37.906) differ, each by 0.008px — a single 1/125th
of a pixel on a glyph advance. That is the capture machine's font rendering
against this one, and no CSS changes it.

They are reported as failures rather than folded into a wider tolerance, because
a tolerance chosen to make a number go green stops being a measurement.

## Honest gaps

One left, and it is a data gap rather than a design one:

- **User Stats has never been captured with rows in it.** `CFG.LOAD_STATS` was
  off for the run, so both tables were empty again. The controls, filters and
  empty state are all matched; what a populated table looks like is still
  unknown, so the table renders real logins and invents nothing. Re-running the
  capture with `LOAD_STATS: true` on a room with login history closes it.

## Restricted sample vs. the paid product

The site we matched is a **restricted demo tenant**. Several things it disables
are not design — they are how the sample withholds paid features from a visitor:

| the demo's gate | what it hides |
|---|---|
| `disableMarketplace` | the Marketplace button on every room |
| `ng-show="sess.twillioApiToken"` | the whole Text List tab |
| `ng-show="sess.authMode=='sso'"` | the whole SSO Setup tab |
| `ng-show="sess.isClonedRoom"` on Delete Room | deleting anything but a clone |
| the App and Notifications submenu | all eight mobile actions |

Reproducing those as if they were the product's rules would have shipped the
demo's limits to paying owners. They are lifted.

### Built, but off until switched on

Every one of those features is now **built** — the mobile actions store real pair
codes, push registrations and notification state; the marketplace has its Stripe
settings; Delete Room works on any owned room. They start **OFF**, and are
switched on one at a time as they are rolled out.

The switches are the product's **own room settings**, not a parallel flag system:
`twillioApiToken`, `ssoHost`, `ptrMobileAppEnabled`, `stripeEmail`. That means
there is one place a feature is on or off, it is the same place the reference
uses, it is already editable in the Settings tab, and it is already persisted per
room. See `src/lib/features.ts`.

Three rules the implementation follows:

1. **A feature that is off still renders.** Disabled, with the reason and the
   name of the setting that enables it. Hiding it would leave an owner unable to
   discover the capability exists.
2. **The server is the gate, not the markup.** Every mobile action re-checks the
   flag and answers 409 with the reason. A disabled button is a hint; the action
   is reachable with curl.
3. **The notice never disturbs a measured pane.** The Text List and SSO panes are
   exactly 1915x845 and 1915x34 in the reference, so their explanation rides on
   the control's `title` rather than a banner above it. Marketplace — which is
   ours, not the reference's — gets a real banner, and its tab link only appears
   once enabled, so the strip stays six-wide and identical by default.

Push tokens are returned **masked to their last six characters**. A push token is
a credential for sending to that device; six characters is enough to tell two
registrations apart in the UI and useless to anyone reading it off the screen.
