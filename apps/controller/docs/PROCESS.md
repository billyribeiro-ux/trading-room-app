# How this specification was produced

Engineering policy and the definition of done live only in
[`ENGINEERING-SSOT.md`](ENGINEERING-SSOT.md). This document describes how the
reference specification was produced; it is evidence/process context, not a
second engineering standard.

Nothing in this project was designed from memory or from a screenshot. Every label,
colour, pixel and field name traces back to a captured DOM of the live reference app.
This document explains that pipeline so any claim can be re-verified, and so the same
process can be repeated for surfaces that are not yet covered.

---

## 1. The reference

Two pages of `protradingroom.com`, an AngularJS 1.3.15 app, were captured on
2026-07-24 while logged in:

| Capture               | URL                                             | Nodes | What it is                |
| --------------------- | ----------------------------------------------- | ----- | ------------------------- |
| `ptr1.json` (23.5 MB) | `#/page/manageSession/6a628a99731b9f77ae9bf505` | 2,156 | the per-room controller   |
| `prt2.json` (9.4 MB)  | `#/page/welcome`                                | 882   | login + account dashboard |

Both are the **control plane**. The live trading room is a different destination
entirely — the "Launch" link points at `/session?id=3625&jwtSite=<JWT>`, outside the
Angular app. That was confirmed by checking every live-room CSS class against both
captures: `roomArea`, `alertsChatArea`, `webcamScreenVideo`, `chatHeader`,
`chat-msg-txt` and `l-row` have **zero** matching elements on either page.

## 2. Capture

`scripts/capture-ptr-reference.js` is pasted into the DevTools console on the target
page. It walks the DOM and records, per element: path, tag, every attribute, the
bounding rect, 155 computed style properties, and the `::before`/`::after`
pseudo-elements. It also captures `<head>`, the full raw HTML, every stylesheet, all
`@media` blocks, `:hover`/`:focus`/`:active` rules, live `:focus` states, and a
`MutationObserver` recording.

**It never clicks anything.** Menus are opened by toggling Bootstrap's own
`.open`/`.in`/`.active` classes, which is pure CSS and fires no Angular handler. This
matters because the page contains actions like "Remove All User Badges" that would
destroy real data. Every mutation is reverted in a `finally` block.

Two defects were found and fixed while running it:

- **Meta shipped last.** Chrome throttled a 12-file download burst and dropped the
  final part, which held `<head>`, rawHtml and every stylesheet. Meta now downloads
  **first**, as its own file.
- **A full DOM copy per recording poll** — 10 near-identical 3.5 MB snapshots of a
  static page. Recording now keeps 2 snapshots; the mutation log carries the timeline.

## 3. Decode

`scripts/decode-ptr-dump.mjs` explodes a dump into readable slices. It is lossless by
construction: each capture emits a `DEFAULTS.txt` holding the most-common value of
every style property, and each node prints only the properties that _differ_ from it.
Node style = DEFAULTS ⊕ deviations, so nothing is discarded but the output is ~10x
smaller than printing 155 properties per node.

Non-baseline captures (`forced-darkTheme`, `forced-lightTheme`, `final-room`) are
emitted as exhaustive per-node diffs against the baseline, plus an explicit list of
every byte-identical path.

**A bug here nearly produced a wrong conclusion.** The first version compared the
`::before`/`::after` objects with `!==` — reference identity, not value — so every
node that merely _had_ a pseudo-element showed as "changed". The theme captures
appeared to differ on ~27 nodes. An agent caught it by hexdumping the supposedly
differing strings and finding them byte-identical. After the fix, dark and light each
differ from baseline by **exactly one node** (the `<body>` class attribute) and
`final-room` by **zero**.

## 4. Read

The slices were read end to end by agents working on disjoint file sets — no
sampling, no delegation, every claim cited to `file #index path=...`. The output is
44 piece files in `docs/reference/pieces/`, one per component, each containing a full
node table, every attribute verbatim, **resolved absolute computed styles** (so no
piece requires the DEFAULTS table to interpret), the verbatim copy deck, a rebuild
spec, and its own honest gaps.

Later passes corrected earlier ones. `docs/reference/pieces/INDEX.md` carries a
**supersession table** listing all 12 claims that were overturned and by what. Where
two documents disagree, that table decides. Examples:

- Captured settings field count: **263 in the Settings tab, 268 extracted across
  the whole controller** (3 on the room form, 1 branding, 1 SSO). The product
  schema adds the separately reviewed `roomType` deviation in Settings, making
  264 there and **269 total**. The captured count is not
  the 181 an earlier agent reported — it owned one depth band and could only count
  what fell inside it.
- FontAwesome codepoints are **recoverable** (56 distinct in ptr1). Two agents
  reported them as empty strings; they are UTF-8 Private Use Area characters that
  render as nothing in a terminal.
- `.thumb20` **does** exist and `.thumb16` keeps its `margin-right`.

## 5. Generate

`scripts/extract-manage-schema.mjs` reads the tracked served DOM at
`evidence-dumps/login-page/manage`, invokes the tracked `scripts/outline.mjs`
decoder into an isolated temporary directory, and emits
`src/lib/room-settings-schema.ts`. It walks the reference's own row structure —

```
<label class="control-label">Talk URL:</label>        .0  label
<a editable-textarea="sess.chatServerURL"             .1  the field
   onaftersave="saveSessField('chatServerURL')">/talk</a>
<br>                                                  .2
<label class="muted">Used to clusterize the chat server</label>   .3  help
```

— and extracts 268 typed definitions with real labels, help text, types, and the
value observed in the captured tenant. The reviewed `roomType` product deviation
is added separately because the reference reads that property to reveal webinar
controls while its editor is commented out. The authoritative total is therefore
268 extracted + 1 reviewed deviation = **269**.

A second generator bug was found while building the Branding tab: the extractor
matched only `editable-*` attributes, but `sess.description` is bound with a plain
`ng-model` on a text-angular editor. It was silently absent from the first generated
schema — 266 fields instead of 267. The generator now verifies the live
`ng-model="sess.description"` binding and represents it as the HTML editor rather
than silently omitting it.

A third bug of the same family was found on 2026-08-07 while reading `ptr1.json`.
The extractor took each setting's **name** from its `editable-*` model binding.
Every row also carries `onaftersave="saveSessField('<field>')"`, and the two are
supposed to agree — but on the Logout Webhook row the reference binds
`sess.login_webhook_url` while saving `logout_webhook_url`. Keyed off the binding,
that row was a duplicate of Login Webhook and the dedupe dropped it, so
`logout_webhook_url` was absent from the schema entirely. Two independent captures
agree on the crossed markup: `ptr1.json` `caps[0]`, and the tracked
`evidence-dumps/login-page/manage` at outline lines 635 and 640.

The name now comes from `onaftersave`, which is the field actually written, and
`scripts/outline.mjs` keeps that attribute so it survives decoding — it previously
kept `onbeforesave` and not `onaftersave`, which is why the disagreement was
invisible to every earlier pass. **We do not copy the reference's crossed
binding:** our editor edits the field it saves.

All three share one shape — the schema was keyed off a _convenient_ attribute
rather than the _authoritative_ one, and the failure mode was a silently missing
row rather than an error. The `EXPECTED_*_COUNT` pins exist for exactly this, and
this time they turned it into a build failure instead of a quiet 268th setting.

The generator has a guard worth knowing about: that four-element structure holds for
the Settings tab but **not** for the room form or the SSO tab, where `.0` can be the
field itself. Taking the sibling's text blindly made `name`'s label come out as
`"Room 3625"` — its own value. The generator now only accepts a sibling as a label if
it is genuinely a `<label>` element, and emits `null` otherwise rather than inventing
one.

The generator's exact 11-setting `wired` set is explicit input backed by current
room-login consumers. It is never read from the previous generated file. That
eliminates the former clean-output failure where regeneration into a new path reset
all 11 flags to false. `pnpm schema:verify` regenerates twice—also from outside the
repository working directory—and compares both results and the committed output
byte for byte.

## 6. What the evidence cannot tell us

Stated here rather than discovered later:

- **No screenshot exists in either dump.** Geometry, computed styles and colours are
  verifiable; rasterisation and image assets are not. Pixel-perfection can be
  _specified_ from this evidence but not _closed_ — that needs a real render diffed
  against a real capture.
- **The tracked Manage capture has 154 non-null captured values and 114 unset
  values across its 268 extracted settings.** The reviewed `roomType` deviation
  has no captured value. Badge, API-key, admin-user, stats-row, and multi-room
  populated states still require their own direct evidence.
- **The forms are captured, but the acquisition flow is not complete.** The public
  marketing site proves `/register` and `/login` are siblings, while
  `evidence-dumps/login-page/login` and
  `evidence-dumps/register-page/register-page-file` preserve both original forms.
  Contact, plan selection, checkout/payment, populated marketplace, and other
  populated-account states remain uncaptured. See `docs/reference/public-site.md`.
- **The `authMode` option list is not in the DOM** — only the selected label.
- **No populated Branding tab**, so the logo/landing-page surface is unknown beyond
  its editor chrome.

Closing any of these is one capture away: run the harness on the relevant page of a
real, populated account.

## 7. Reproducing it

```bash
# 1. capture — paste scripts/capture-ptr-reference.js into DevTools on the page
# 2. merge the downloaded parts into one dump, then:
node scripts/decode-ptr-dump.mjs <dump.json> /tmp/decode-out
# 3. after reviewing and tracking the replacement evidence, regenerate and verify
pnpm schema:extract
pnpm schema:verify
```

## 8. Handling of personal data

The captures contain real member names, email addresses, gravatar MD5 hashes
(reversible email identifiers) and a live JWT. Everything under `docs/reference/`
has been redacted to stable tokens — see `docs/reference/REDACTIONS.md` for the
mapping and for what was deliberately left intact and why.

Raw served-source and derived evidence artifacts are isolated under
`evidence-dumps/`; `evidence-dumps/README.md` defines that archive. The original
sensitive `ptr1.json` and `prt2.json` captures remain excluded by
`.gitignore` because they contain live personal data and token material.
