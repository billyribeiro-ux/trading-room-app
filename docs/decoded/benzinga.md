# Benzinga News — decoded, implementation-ready

Decoded 2026-08-15 from `apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`
(2,891,205 bytes), the **current** v4 build. Every value below was read out of that file at the byte
offset given beside it. Nothing is inferred; where the bundle is silent, §12 says so.

Byte offsets are into the v4 bundle unless a different file is named.

---

## 0. What was read

**`apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`** — these ranges, opened and read in
full, not searched:

| range | what is there |
| --- | --- |
| 48,845–49,300 | `function Mt(t)` — the URL sanitizer used on the Benzinga `href` |
| 92,739–93,250 | `function Et(t,n,e,i)` — the attribute-binding instruction |
| 93,889–94,100 | `function z(t,n,e)` — the property-binding instruction |
| 109,341–109,800 | `function xn(t,n,e)` — the property-interpolation instruction |
| 2,465,700–2,468,600 | `app-room` template fns `sPe`, `rPe`, `pPe`, `fPe`, `mPe` and neighbours |
| 2,468,600–2,472,600 | `TPe` — the sidebar template, and its whole update block of gates |
| 2,472,400–2,474,400 | `xPe`, `PPe` — the top-navbar templates |
| 2,484,200–2,489,200 | `U4e` — the top-navbar template, and its whole update block of gates |
| 2,496,200–2,500,600 | the `app-room` class `oRe`: constructor field list and `ngOnInit` |
| 2,532,814–2,546,832 | `selectors:[["app-room"]]` and its complete `consts` array (229 entries, extracted and indexed) |
| 2,546,900–2,547,900 | the `app-room` root template |
| 2,548,483–2,561,757 | the `app-room` inline `styles` array (13,274 bytes) |
| 2,561,700–2,562,300 | `app-kicked-page` — read only to establish the component boundary either side of it |
| 2,562,850–2,564,100 | the closed-session template fns `pRe`, `fRe`, `mRe`, `gRe`, `_Re` |
| 2,566,200–2,568,100 | the `app-closed-session-page` class: constructor and `ngOnInit` |
| 2,571,100–2,576,030 | `selectors:[["app-closed-session-page"]]` and its complete `consts` array (77 entries, indexed) |
| 2,576,050–2,578,600 | the closed-session main template and its update block |
| 2,578,795–2,590,812 | the closed-session inline `styles` array (12,017 bytes) |

**`apps/room/docs/source-v4-2026-08-15/styles.ee2a710065b60389.css`** (444,793 bytes) — the substring
`benzinga` occurs **0 times**. Consequence in §7.

**`apps/room/docs/source/main.d6d3c112b59b7d0d.js`** (2,887,876 bytes, older build) — occurrence
counts for every Benzinga symbol, §8.

**Repo files** read for the mapping in §10: `apps/controller/src/lib/room-settings-schema.ts`,
`apps/controller/src/lib/room-config.ts`, `apps/room/src/lib/server/room-config-client.ts`.

---

## 1. There are THREE renderings, not one

Benzinga is emitted three times, into two different chromes, by two different components. They do not
share markup and they do not share a fallback.

| # | component | where on screen | `<li>` class | fallback when `altBenzingaLogoURL` is empty |
| --- | --- | --- | --- | --- |
| A | `app-room` (`selectors:[["app-room"]]` @ 2,532,814) | left **sidebar** nav | `nav-item py-0` | `<i class="fas fa-newspaper">` + text `Benzinga News` |
| B | `app-room` | **top navbar** | `nav-item animated fadeIn benzinga-li` | `/assets/images/benzinga-logo.png` |
| C | `app-closed-session-page` (`selectors:[["app-closed-session-page"]]` @ 2,571,301) | left sidebar of the closed-session screen | `nav-item py-0` | `<i class="fas fa-newspaper">` + text `Benzinga News` |

A and C are byte-for-byte the same shape with different const indices. B is a different element
entirely — image only, no icon, no text, and it is the only place the bundled PNG is referenced.

---

## 2. Rendering A — the `app-room` sidebar item

### The three template functions, verbatim

```js
// 2,467,371
function pPe(t,n){1&t&&T(0,"img",41),2&t&&z("src",g(3).appService.globals.sessData.altBenzingaLogoURL,Mt)}

// 2,467,477
function fPe(t,n){1&t&&(T(0,"i",42),d(1,"span",22),v(2,"Benzinga News"),u())}

// 2,467,554
function mPe(t,n){
  if(1&t&&(d(0,"li",25)(1,"a",40),H(2,pPe,1,1,"img",41)(3,fPe,3,0),u()()),2&t){
    const e=g(2);
    m(),Et("href",e.benzingaUrl,Mt),
    m(),O(2,e.appService.globals.sessData.altBenzingaLogoURL?2:3)
  }
}
```

### Every const index resolved, from the `app-room` consts array (2,533,197–2,546,832)

| index | tuple, verbatim | meaning |
| --- | --- | --- |
| 25 @ 2,534,353 | `[1,"nav-item","py-0"]` | `<li class="nav-item py-0">` |
| 40 @ 2,535,269 | `["target","_blank","title","Benzinga News",1,"nav-link","sidebar-item","ps-1"]` | `<a target="_blank" title="Benzinga News" class="nav-link sidebar-item ps-1">` |
| 41 @ 2,535,348 | `[1,"benzinga-logo-alt",3,"src"]` | `<img class="benzinga-logo-alt" [src]="…">` |
| 42 @ 2,535,380 | `[1,"fas","fa-newspaper"]` | `<i class="fas fa-newspaper">` |
| 22 @ 2,534,200 | `[1,"pl-2"]` | `<span class="pl-2">` |

### The markup this produces

```html
<li class="nav-item py-0">
  <a target="_blank" title="Benzinga News" class="nav-link sidebar-item ps-1" [attr.href]="benzingaUrl">
    <!-- when sessData.altBenzingaLogoURL is truthy -->
    <img class="benzinga-logo-alt" [src]="sessData.altBenzingaLogoURL">
    <!-- otherwise -->
    <i class="fas fa-newspaper"></i><span class="pl-2">Benzinga News</span>
  </a>
</li>
```

**The exact icon class is `fas fa-newspaper`** — const 42, tuple `[1,"fas","fa-newspaper"]` at
2,535,380. Font Awesome 5/6 solid.

**The label text is `Benzinga News` with no surrounding spaces** — `v(2,"Benzinga News")` at
2,467,528 (rendering A) and 2,563,726 (rendering C). The sidebar label is unpadded, and
`title="Benzinga News"` on the anchor is the same string. Both are verbatim.

### The binding instructions, and why they differ

- `Et("href", e.benzingaUrl, Mt)` — `Et` is read at 92,739: `function Et(t,n,e,i){…mr(Un(),o,t,n,e,i)…}`.
  It is the **attribute** instruction, so the emitted binding is `[attr.href]`, not `[href]`.
- `Mt` is read at 48,845: `function Mt(t){const n=ah();return n?n.sanitize(Zo.URL,t)||"":fr(t,"URL")?Jo(t):bm(Vt(t))}`.
  `Zo.URL` is the `SecurityContext.URL` member (the enum literal `t[t.URL=4]="URL"` is at 48,677).
  So the href passes through the URL sanitizer, and the value handed to it is the `SafeUrl` produced
  by `bypassSecurityTrustUrl` in §4.
- `z("src", …, Mt)` on the `<img>` — `z` is read at 93,889 and is the **property** instruction, so
  that one is `[src]`, also URL-sanitized.

### Where it sits in the sidebar

From `TPe` (2,468,600–2,472,600), the `<ul class="navbar-nav small w-100 h-100">` children in order:

```js
d(20,"li",19)(21,"a",20), T(22,"i",21), d(23,"span",22), v(24,"Connectivity Check"), u()()(),
H(25,hPe,5,0,"li",19),                          // "Reopen Alerts / Chat"
d(26,"li",19)(27,"a",23), T(28,"i",24), d(29,"span",22), v(30,"General Settings"), u()()(),
H(31,mPe,4,2,"li",25)                           // <- BENZINGA
 (32,vPe,13,3,"li",26),                         // "Archives"
d(33,"li",25)(34,"a",27), … v(37,"Manage Muted Users") …
```

So Benzinga is the **fourth** sidebar entry, between **General Settings** and **Archives**.

---

## 3. Rendering B — the `app-room` top-navbar item

```js
// 2,473,119
function PPe(t,n){
  if(1&t&&(d(0,"li",90)(1,"a",141),T(2,"img",142),u()()),2&t){
    const e=g(2);
    m(),Et("href",e.benzingaUrl,Mt),
    m(),z("src",e.appService.globals.sessData.altBenzingaLogoURL||"/assets/images/benzinga-logo.png",Mt)
  }
}
```

| index | tuple, verbatim |
| --- | --- |
| 90 @ 2,538,586 | `[1,"nav-item","animated","fadeIn","benzinga-li"]` |
| 141 @ 2,541,987 | `["target","_blank","title","Benzinga News",1,"nav-link"]` |
| 142 @ 2,542,044 | `[1,"benzinga-logo","animated","fadeIn",3,"src"]` |

```html
<li class="nav-item animated fadeIn benzinga-li">
  <a target="_blank" title="Benzinga News" class="nav-link" [attr.href]="benzingaUrl">
    <img class="benzinga-logo animated fadeIn"
         [src]="sessData.altBenzingaLogoURL || '/assets/images/benzinga-logo.png'">
  </a>
</li>
```

**This is the only consumer of `/assets/images/benzinga-logo.png`** — that string occurs exactly once
in the whole bundle, at 2,473,305. Renderings A and C fall back to the icon + text instead; they never
reference the PNG.

**`animated fadeIn`** are Animate.css classes and are on the `<li>` *and* the `<img>` here, and on
neither element in A or C.

Position in the navbar, from `U4e` (2,484,200–2,489,200):

```js
d(12,"div",87)(13,"ul",88),
H(14,APe,5,2,"li",89)      // tip button
 (15,PPe,3,2,"li",90)      // <- BENZINGA
 (16,NPe,10,1,"li",91)     // talking indicator
```

---

## 4. Where `benzingaUrl` is SET — found, in two places, one per component

It is **not** read-only. Both components assign it in `ngOnInit`, with identical code.

### `app-room` (class `oRe`, opens at 2,497,008)

`benzingaUrl` is **absent from the constructor field list** — that list runs 2,497,220–2,498,330 and
was read in full; it contains `this.roomV4Link=""` at 2,498,049 and no `benzingaUrl`. The field comes
into existence inside `ngOnInit`, at 2,499,501:

```js
this.benzingaUrl = this.sanitizer.bypassSecurityTrustUrl(
  `https://ptrv3.protradingroom.com/public/bz/index.html?sessID=${this.appService.globals.sessionID}&id=${this.appService.globals.sessData.uuid}&tok=${this.appService.globals.sesionToken}`
),
"" != this.appService.globals.sessData.altBenzingaLinkURL &&
  (this.benzingaUrl = this.sanitizer.bypassSecurityTrustUrl(
     this.appService.globals.sessData.altBenzingaLinkURL));
```

- template literal @ 2,499,557
- override branch @ 2,499,781 (`altBenzingaLinkURL`), second assignment @ 2,499,802
- `this.sanitizer` is the 8th constructor parameter, `c`, bound at 2,497,203

### `app-closed-session-page` (2,566,232 and 2,566,370)

Same two statements, but this component **does** initialise the field:
`this.benzingaUrl=null` at 2,566,232, then in `ngOnInit` the identical
`bypassSecurityTrustUrl(...)` at 2,566,370 with the same URL template at 2,566,426 and the same
`altBenzingaLinkURL` override at 2,566,650 / 2,566,671.

### The URL, decomposed

```
https://ptrv3.protradingroom.com/public/bz/index.html
  ?sessID=<appService.globals.sessionID>
  &id=<appService.globals.sessData.uuid>
  &tok=<appService.globals.sesionToken>
```

**`sesionToken` is spelled with one `s`** — that is the reference's own field name, at 2,499,721 and
2,566,590, and it is spelled the same way everywhere else in the bundle (for example the Discord
calls at 1,159,900+). Reproduce the field name as written or the value will be `undefined`.

So Benzinga is **not** an in-room feature at all: it is an external page on `ptrv3.protradingroom.com`
opened in a new tab, handed the session id, the room uuid and the session token as query parameters.
`altBenzingaLinkURL`, when non-empty, replaces that URL wholesale — the session parameters are then
not passed at all.

### Adjacent, and worth recording because it is the very next statement

`this.roomV4Link = window.location.href.replace(".com/", ".com/v3/")` at 2,499,911 in `app-room`, and
`this.roomV4Link = window.location.href.replace(".com/", ".com/v4/")` at 2,566,305 in
`app-closed-session-page`. Two components, one field name, two different replacements. In `app-room`
the field is written and **never read by any template** — the only template read of `roomV4Link` in
the bundle is `xn("href",o.roomV4Link,Mt)` at 2,578,260, which belongs to `app-closed-session-page`,
where the anchor's text is `" Try v3 "` (2,576,720). This is recorded as observed, not explained.

---

## 5. Gating — one room setting, no role check

All three renderings are gated on the same single flag, and on nothing else. No presenter check, no
permission check, no free-trial check.

| rendering | gate, verbatim from the update block | offset |
| --- | --- | --- |
| A — sidebar | `O(31,e.appService.globals.sessData.hasBenzingaNews?31:-1)` | 2,471,902 |
| B — navbar | `O(15,e.appService.globals.sessData.hasBenzingaNews?15:-1)` | 2,487,962 |
| C — closed session | `O(46,o.appService.globals.sessData.hasBenzingaNews?46:-1)` | 2,578,293 |

`hasBenzingaNews` occurs exactly 3 times in the bundle (2,471,937 / 2,487,997 / 2,578,328) and all
three are these gates. It is never written by the client.

Contrast the mobile-app controls two lines away in the same update blocks, which carry a four-term
condition including `isPresenter` and `isFT` (see `mobile-app-decoded.md` §5). Benzinga has none of
that: **if `hasBenzingaNews` is true, every member sees it.**

`altBenzingaLogoURL` (5 occurrences: 2,467,454 / 2,467,732 / 2,473,284 / 2,563,652 / 2,563,929) and
`altBenzingaLinkURL` (4 occurrences: 2,499,781 / 2,499,890 / 2,566,650 / 2,566,759) are the only two
other Benzinga settings the client touches. Both are truthiness/`""` tests, never role-checked.

---

## 6. Rendering C — `app-closed-session-page`

```js
// 2,563,569
function mRe(t,n){1&t&&T(0,"img",51),2&t&&z("src",g(2).appService.globals.sessData.altBenzingaLogoURL,Mt)}

// 2,563,675
function gRe(t,n){1&t&&(T(0,"i",52),d(1,"span",29),v(2,"Benzinga News"),u())}

// 2,563,752
function _Re(t,n){
  if(1&t&&(d(0,"li",32)(1,"a",50),H(2,mRe,1,1,"img",51)(3,gRe,3,0),u()()),2&t){
    const e=g();
    m(),Et("href",e.benzingaUrl,Mt),
    m(),O(2,e.appService.globals.sessData.altBenzingaLogoURL?2:3)
  }
}
```

Const indices resolved from the `app-closed-session-page` consts array (2,571,365–2,576,028):

| index | tuple, verbatim |
| --- | --- |
| 32 @ 2,573,105 | `[1,"nav-item","py-0"]` |
| 50 @ 2,574,214 | `["target","_blank","title","Benzinga News",1,"nav-link","sidebar-item","ps-1"]` |
| 51 @ 2,574,293 | `[1,"benzinga-logo-alt",3,"src"]` |
| 52 @ 2,574,325 | `[1,"fas","fa-newspaper"]` |
| 29 @ 2,572,952 | `[1,"pl-2"]` |

Identical to rendering A. One difference in the surrounding sidebar: the item above it is labelled
`"Connectivity/Mic Check"` here (2,576,810) where `app-room` says `"Connectivity Check"` (2,470,954).

---

## 7. CSS — every rule for the three classes

The v4 global stylesheet `styles.ee2a710065b60389.css` contains the substring `benzinga` **0 times**.
Every Benzinga rule is component-scoped and lives in a `styles:[...]` array inside the bundle.

### `.benzinga-logo` — 2 identical copies

```css
.benzinga-logo[_ngcontent-%COMP%]{max-height:25px!important}
```
- @ 2,559,180, inside the `app-room` styles array (2,548,483–2,561,757)
- @ 2,588,523, inside the `app-closed-session-page` styles array (2,578,795–2,590,812)

### `.benzinga-logo-alt` — 2 identical copies

```css
.benzinga-logo-alt[_ngcontent-%COMP%]{background-color:#000;width:100%!important;max-height:25px!important;max-width:230px!important}
```
- @ 2,560,251 (`app-room`)
- @ 2,589,594 (`app-closed-session-page`)

The black `background-color` is not decorative: the alternate logo is a customer-supplied image drawn
on a dark navbar, and the rule guarantees the plate behind it.

### `.benzinga-li` — NO RULE EXISTS

`benzinga-li` occurs **exactly once in the entire bundle**, at 2,538,621, inside the const tuple
`[1,"nav-item","animated","fadeIn","benzinga-li"]` which begins at 2,538,586 (`app-room` const 90). It occurs 0 times in `styles.ee2a710065b60389.css`. Both
component styles arrays were read end to end (13,274 and 12,017 bytes) and neither contains it.

**`benzinga-li` is a class with no rule anywhere.** It is a hook — either for an operator stylesheet
outside this bundle, or dead. This is stated as an absence, not filled in; see §9.

Note the asymmetry it creates: rendering B's `<li>` is the only one with a Benzinga-specific class and
it is the only one whose class does nothing, while renderings A and C get their sizing from
`.benzinga-logo-alt` via the `<img>`.

---

## 8. Old bundle vs new — Benzinga did not change

Counts taken over both files:

| symbol | v4 `main.d1d09071be31f1ba.js` | older `main.d6d3c112b59b7d0d.js` |
| --- | --- | --- |
| `Benzinga` | 17 | 17 |
| `benzinga` | 17 | 17 |
| `benzingaUrl` | 8 | 8 |
| `hasBenzingaNews` | 3 | 3 |
| `altBenzingaLinkURL` | 4 | 4 |
| `altBenzingaLogoURL` | 5 | 5 |
| `benzinga-logo` | 8 | 8 |
| `benzinga-logo-alt` | 4 | 4 |
| `benzinga-li` | 1 | 1 |

Every count matches. Benzinga is **unchanged between the two builds** — unlike the mobile-app tab,
which is new in v4.

---

## 9. Wire commands — there are none

`benzingaUrl` is built entirely from values already in `appService.globals` (`sessionID`,
`sessData.uuid`, `sesionToken`). No socket command, no HTTP call, no event-bus emit is involved
anywhere in the three renderings or in either `ngOnInit`. The two `ngOnInit` regions
(2,498,240–2,500,600 and 2,566,232–2,568,100) were read line by line to establish this.

**The whole feature is: build a URL, sanitize it, put it on an anchor with `target="_blank"`.**

---

## 10. What this repo already carries

| symbol | where in this repo |
| --- | --- |
| `hasBenzingaNews` — `checkbox`, label `BZ News (DO NOT USE UNLESS YOU HAVE API)`, help `You will need an API key from benzinga`, `wired: true` | `apps/controller/src/lib/room-settings-schema.ts:195` |
| `altBenzingaLogoURL` — `textarea`, label `Custom Benzinga logo url`, `wired: true` | `apps/controller/src/lib/room-settings-schema.ts:196` |
| `altBenzingaLinkURL` — `textarea`, label `Custom Benzinga link url`, `wired: true` | `apps/controller/src/lib/room-settings-schema.ts:197` |
| the three typed fields on the settings interface | `apps/controller/src/lib/room-settings-schema.ts:603-607` |
| the three names on the room-config allow-list, with a comment already citing `O(31, hasBenzingaNews ? 31 : -1)` | `apps/controller/src/lib/room-config.ts:276-282` |
| the three optional fields on the room client's config type | `apps/room/src/lib/server/room-config-client.ts:106-109` |

So the settings plumbing is present and the room client already receives all three values. What does
not exist in this repo:

- **No `benzinga-logo.png`.** `find` over the repo for `*benzinga*` (excluding `node_modules`)
  returned nothing. The default logo asset that rendering B requires is absent.
- No component renders any of the three classes; `grep -ril benzinga` over `*.svelte` returned only
  documentation files plus `apps/room/src/routes/+page.svelte`,
  `apps/room/src/lib/server/room-config-client.ts` and `apps/room/src/lib/pull-everything-contract.test.ts`.

---

## 11. VERIFICATION — negative control

**What I expected and checked for:** that the `<li>` in the sidebar rendering carries the class
`benzinga-li`, because the brief named `benzinga-li` alongside `benzinga-logo` and `benzinga-logo-alt`
as the feature's three classes and the sidebar is the item that is described as "a nav `<li>` linking
to `benzingaUrl`".

**Result: it does not.** `mPe` opens `d(0,"li",25)` and const 25 resolves to `[1,"nav-item","py-0"]`
(indexed from the array at 2,533,197). `benzinga-li` is on const 90,
`[1,"nav-item","animated","fadeIn","benzinga-li"]`, which is used only by `PPe` at 2,473,119 — a
**second, previously unnamed rendering in the top navbar**, with different markup (image only, no
icon, no text) and a different fallback (the bundled PNG rather than the icon). Had I stopped at the
three template functions I was given, I would have attributed a class and a PNG fallback to an element
that has neither.

**Second control:** I then went looking for the CSS rule for `benzinga-li` on the assumption that a
class named after the feature has one. It has none — one occurrence in the bundle, zero in the
stylesheet, zero in either component's styles array. Reported in §7 as an absence rather than filled
in with a plausible rule.

---

## 12. STILL TO DECODE

Each of these is a specific lookup, not a research project.

- [ ] **What `https://ptrv3.protradingroom.com/public/bz/index.html` actually serves.** The bundle
      proves only that it is opened in a new tab with `sessID`, `id` and `tok`. Whether it renders a
      Benzinga widget, proxies the Benzinga API, or requires the operator's own key (which is what
      `room-settings-schema.ts:195`'s help text asserts) is not in this bundle. Lookup: fetch that URL
      with a live `sessID`/`id`/`tok` triple, or capture it from a room where `hasBenzingaNews` is on.
- [ ] **Whether `benzinga-li` has a rule in an operator stylesheet outside this bundle.** Confirmed
      absent from `main.d1d09071be31f1ba.js` and `styles.ee2a710065b60389.css`. Not checked:
      `deployed-index.html` and any stylesheet it links other than `styles.*.css`. Lookup: read
      `apps/room/docs/source-v4-2026-08-15/deployed-index.html` for additional `<link rel=stylesheet>`
      hrefs and fetch each.
- [ ] **The bytes of `/assets/images/benzinga-logo.png`.** Referenced at 2,473,305, absent from this
      repo. Lookup: `GET https://chat.protradingroom.com/assets/images/benzinga-logo.png`.
- [ ] **Whether the `app-kicked-page` / detached-screen chromes render Benzinga.** `app-kicked-page`
      was read in full (2,561,700–2,562,300) and does not. `app-detached-screen`
      (`selectors` @ 2,593,043) was **not** read; its styles array at 2,588,523/2,589,594 was
      attributed to `app-closed-session-page` by def-boundary reading. Lookup: read
      2,590,812–2,593,100 to re-confirm that attribution and to see whether `app-detached-screen`
      carries its own Benzinga item.
- [ ] **Why `app-room` computes `roomV4Link` with `.com/v3/` and never reads it.** Observed at
      2,499,911. Lookup: search the v4 `deployed-index.html` and any non-`main` chunk for a template
      that binds `roomV4Link`.
- [ ] **The `sessData.uuid` field.** Used in the Benzinga URL at 2,499,684. Not cross-checked against
      `room-config-client.ts` in this pass — confirm the room client already receives a `uuid` before
      building this feature.
