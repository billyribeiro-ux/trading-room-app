# Recordings — decoded, and compared against ours

Decoded 2026-08-15. Every claim below carries a locator: a byte offset into
`apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js` (2,891,205 bytes, written `bundle@N`),
a byte offset into `apps/room/docs/source-v4-2026-08-15/styles.ee2a710065b60389.css` (444,793 bytes,
written `css@N`), or `path:line` for a repository file.

**The headline finding, stated first because it reframes the whole item.** In the v4 bundle the
Recordings surface is **not a list that the Angular client renders**. It is an `<iframe>` and a
`window.open`, both pointed at one server URL. The list markup, the row fields and the
`length/60000` arithmetic live in the SERVER-rendered page behind that URL —
`apps/controller/evidence-dumps/TIER1-fetched/views/page.recordings.html`, which this repository
already holds and which is read in full below.

---

## 1. What was read

**Read in full, line by line:**

| file | size | what it gave |
| --- | ---: | --- |
| `apps/controller/evidence-dumps/TIER1-fetched/views/page.recordings.html` | 27 lines | the entire row template, empty state, controls |
| `apps/controller/evidence-dumps/TIER1-fetched/README.md` | 52 lines | provenance and hash of the above |
| `apps/controller/evidence-dumps/login-page/api-docs` lines 361-428 | — | GET endpoint, response body, field-unit legend |
| `apps/controller/evidence-dumps/TIER1-fetched/api-post-routes.md` lines 112-149, 360-439, 600-729 | — | POST endpoint, response body, server-side notes |
| `apps/controller/evidence-dumps/TIER1-fetched/main.css` | 2,103 bytes | read whole; contains `.panel-body` only |

**Bundle regions decoded** (each sliced with python and read around every hit, not concluded from a
grep line):

- `bundle@1916000-1918500` — the tab-strip template functions, `mo`/`Hr` class maps
- `bundle@1930000-1931200` — `GSe`, the `#recordings` pane
- `bundle@1945800-1950500` — the Files pane row template (read to rule it out; see §4 negative control)
- `bundle@1959300-1960600` — `archivesAvailableTo()` and `getRecordingsUrl()`
- `bundle@1994264-2014220` — the complete `app-presentationarea` `consts:` array, 292 tuples, parsed
- `bundle@2014300-2018200` — the `app-presentationarea` create and update blocks
- `bundle@2352600-2355000` — `app-rec-preview`, which owns every remaining `recs` substring
- `bundle@2466500-2469000` — `gPe` / `vPe`, the `app-room` Archives dropdown
- `bundle@2473900-2477600` — the recording-control menu (`YPe`, `KPe`, `t4e`)
- `bundle@2521400-2522700` and `bundle@2563400-2569200` — both `launchRecordings()` bodies
- `bundle@2533197-2546832` — the complete `app-room` `consts:` array, 229 tuples, parsed
- `bundle@2571365-2576028` — the complete `app-closed-session-page` `consts:` array, 77 tuples, parsed
- `bundle@1170279-1170800` — the `noSanitize` pipe, transform body read verbatim

**CSS regions read:** `css@211100-211500`, `css@296449`, `css@300283`, `css@423700-423920`,
`css@432600-432900`, `css@435800-436400`, `css@438600-439000`. Legacy stylesheets
`TIER1-fetched/styles.css` (218,719 bytes) and `theme.css` (232,979 bytes) at the offsets named in §2.8.

**Our source read:** `apps/room/src/routes/+page.svelte` (12,459 lines — regions 8830-8985, 8900-8995,
9600-9730, 10820-11045, 10910-10970, 6130-6290, 1960-2080, 2671-2673),
`apps/room/src/lib/types.ts`, `apps/room/src/lib/roster-gates.ts`,
`apps/room/src/lib/server/room-config-client.ts`, `apps/controller/src/lib/room-settings-schema.ts`,
`apps/controller/src/lib/last-login-format.ts`, `apps/controller/src/lib/server/rooms.ts:1008-1019`.

---

## 2. The reference feature, fully decoded

### 2.1 Where it lives — three separate entry points

Recordings is reachable from **three** places in the v4 client, in three different components.

#### (a) The presentation-area tab — component `app-presentationarea`

Selector at `bundle@1994075` (`selectors:[["app-presentationarea"]]`).

The nav item, `YCe`, verbatim at `bundle@1916945`:

```js
function YCe(t,n){if(1&t){const e=Y();
  d(0,"li",31),x("click",function(){return D(e),E(g().onMainTabChange("presAreaTabs-recordings"))}),
  d(1,"a",59)(2,"div",12)(3,"div"),T(4,"i",60),d(5,"span",14),v(6,"Recordings"),u()()()()()}
 if(2&t){const e=g();m(),z("ngClass",ct(1,mo,"presAreaTabs-recordings"==e.selectedMainTab))}}
```

Every const index resolved from the `app-presentationarea` array (`bundle@1994264-2014220`):

| idx | tuple | rendered |
| --- | --- | --- |
| 31 | `["role","presentation",1,"nav-item",3,"click"]` | `<li role="presentation" class="nav-item" (click)=…>` |
| 59 | `["id","recordings-tab","data-bs-toggle","tab","data-bs-target","#recordings","role","tab","aria-controls","recordings","aria-selected","false",1,"nav-link",3,"ngClass"]` (`bundle@1998408`) | the `<a>` |
| 12 | `[1,"d-flex","align-items-center"]` (`bundle@1995040`) | inner wrapper |
| 60 | `[1,"fas","fa-file-video"]` (`bundle@1998576`) | the icon |
| 14 | `[1,"mx-1"]` (`bundle@1995121`) | label wrapper |

`mo` is `t=>({active:t})` at `bundle@1916345`, so the `<a>` gets `active` when
`selectedMainTab == "presAreaTabs-recordings"`.

**`aria-selected="false"` is a static literal in the tuple** — it never updates. The same is true of
`screens-tab` (`"aria-selected","true"`, const 5) and of every sibling tab. Reproduce it as written.

Rendered HTML:

```html
<li role="presentation" class="nav-item">
  <a id="recordings-tab" data-bs-toggle="tab" data-bs-target="#recordings" role="tab"
     aria-controls="recordings" aria-selected="false" class="nav-link" [class.active]="…">
    <div class="d-flex align-items-center"><div><i class="fas fa-file-video"></i><span class="mx-1">Recordings</span></div></div>
  </a>
</li>
```

The label is `Recordings` — `v(6,"Recordings")`, no surrounding spaces.

**Note the tuple difference.** Screens, Streams, Notes and Files use const 4,
`["role","presentation",1,"nav-item",3,"click","hidden"]` (`bundle@1994421`) — they carry a `hidden`
binding. Recordings uses const 31, which has **no `hidden`**. Its visibility is decided entirely by
the structural gate below.

#### (b) The pane — same component

`GSe`, verbatim at `bundle@1930394`:

```js
function GSe(t,n){if(1&t&&(d(0,"div",25),T(1,"iframe",140),Xe(2,"noSanitize"),u()),
 2&t){const e=g();
  z("ngClass",ct(5,Hr,"presAreaTabs-recordings"==e.selectedMainTab)),
  m(),z("src",Ct(2,2,e.getRecordingsUrl(),"resourceUrl"),Oa)}}
```

| idx | tuple |
| --- | --- |
| 25 | `["id","recordings","role","tabpanel","aria-labelledby","recordings-tab",1,"tab-pane","position-relative","h-100",3,"ngClass"]` (`bundle@1995797`) |
| 140 | `["width","100%","height","100%","frameborder","0",3,"src"]` (`bundle@2003434`) |

`Hr` is `t=>({"show active":t})` at `bundle@1916418`.

Rendered HTML — **this is the entire pane, there is nothing else inside it**:

```html
<div id="recordings" role="tabpanel" aria-labelledby="recordings-tab"
     class="tab-pane position-relative h-100" [ngClass]="{'show active': …}">
  <iframe width="100%" height="100%" frameborder="0" [src]="getRecordingsUrl() | noSanitize:'resourceUrl'"></iframe>
</div>
```

**Container classes, exactly:** `tab-pane position-relative h-100`, plus `show active` when selected.
No `fade` — Screens (const 20), Streams (22) and Files (29) all carry `fade`; Recordings and
VideoPlayer (const 26) do not.

#### (c) The sidebar Archives dropdown — components `app-room` and `app-closed-session-page`

`app-room` selector at `bundle@2532814`. Its Archives block is `vPe` at `bundle@2468261`; the
Recordings entry is `gPe` at `bundle@2467757`, verbatim:

```js
function gPe(t,n){if(1&t){const e=Y();
  d(0,"a",50),x("click",function(){return D(e),E(g(3).launchRecordings())}),
  T(1,"i",51),d(2,"span",22),v(3,"Recording"),u()()}}
```

Consts resolved from the `app-room` array (`bundle@2533197-2546832`):

| idx | tuple | offset |
| --- | --- | --- |
| 43 | `["id","archivesDropdown","title","Archives","data-bs-toggle","dropdown","aria-haspopup","true","aria-expanded","false",1,"nav-link","sidebar-item","dropdown-toggle"]` | `bundle@2535405` |
| 44 | `[1,"fas","fa-archive"]` | — |
| 45 | `["aria-labelledby","archivesDropdown",1,"dropdown-menu","users-dropdown-options"]` | `bundle@2535594` |
| 46 | `[1,"dropdown-item","small"]` | — |
| 50 | `[1,"dropdown-item","small",3,"click"]` | `bundle@2535914` |
| 51 | `[1,"fas","fa-circle"]` | `bundle@2535952` |
| 22 | `[1,"pl-2"]` | — |
| 47 | `["data-bs-toggle","modal","data-bs-target","#alerts-logs-modal",1,"dropdown-item","small",3,"click"]` | — |
| 48 | `[1,"fas","fa-bell"]` | — |
| 49 | `["data-bs-toggle","modal","data-bs-target","#chat-logs-modal",1,"dropdown-item","small"]` | — |
| 52 | `["data-bs-toggle","modal","data-bs-target","#chat-logs-modal",1,"dropdown-item","small",3,"click"]` | — |
| 53 | `[1,"fas","fa-comment"]` | — |
| 54 | `[1,"fas","fa-closed-captioning"]` | — |

The label is **`Recording`, singular** — `v(3,"Recording")` — while the presentation-area tab says
`Recordings`, plural. Both verbatim, both in the same build.

`app-closed-session-page` (selector at `bundle@2571301`) carries a second, near-identical copy:
`yRe` at `bundle@2564279` with `bRe` at `bundle@2563954`, same `launchRecordings()` call, same
`Recording` text, same icon. Its consts (`bundle@2571365-2576028`) put the same tuples at 53/54/55/56/
57/58/59/60/61/62/63 with `[1,"pl-2"]` at 29. **The one structural difference: the closed-session
Archives menu has three items (Recording, Alert Logs, Chat Logs) and no Transcript History** —
`yRe` declares `H(6,bRe,…)`, a static Alert Logs `<a>`, and `H(11,vRe,…)`, and stops there.

### 2.2 The gates — every one, resolved

| what | gate, verbatim | locator |
| --- | --- | --- |
| the tab (`H(24,YCe,7,3,"li",16)` at `bundle@2014812`) | `O(24,o.archivesAvailableTo()&&o.appService.globals.sessData.recsInRoom?24:-1)` | `bundle@2016775` |
| the pane (`H(46,GSe,3,7,"div",25)` at `bundle@2015263`) | `O(46,o.archivesAvailableTo()&&o.appService.globals.sessData.recsInRoom?46:-1)` | `bundle@2017572` |
| the Archives menu, `app-room` | `O(32,e.archivesAvailableTo()?32:-1)` | `bundle@2471971` |
| the Archives menu, `app-closed-session-page` | `O(47,o.archivesAvailableTo()?47:-1)` | `bundle@2578362` |
| the `Recording` item, both components | `O(6,e.appService.globals.isPresenter\|\|!e.appService.globals.sessData.hideRecs?6:-1)` | `bundle@2468604` and `bundle@2564601` |

Const 16 resolves to `["role","presentation",1,"nav-item"]` (`bundle@1995147`) — the *placeholder*
tuple for the `H()` slot; the rendered `<li>` uses const 31 from inside `YCe`.

`archivesAvailableTo()` is defined **three times, byte-identical**, at `bundle@1959447`
(`app-presentationarea`), `bundle@2512856` (`app-room`) and `bundle@2567984`
(`app-closed-session-page`):

```js
archivesAvailableTo(){return this.appService.globals.isPresenter&&!this.appService.globals.isLimitedPresenter
 ?!(this.appService.globals.sessData.showArchivesToSpecificPresenters&&!this.appService.globals.sessData.showArchivesToSpecificPresenters.includes(this.appService.globals.user.email))
 :!(!this.appService.globals.sessData.showArchivesToUsers||this.appService.globals.user.denyArchivesAccess)}
```

So the presentation-area TAB needs **two** conditions — `archivesAvailableTo()` **and**
`sessData.recsInRoom` — while the sidebar menu item needs `archivesAvailableTo()` and then
`isPresenter || !hideRecs`. `recsInRoom` occurs exactly twice in the bundle, at `bundle@2016835` and
`bundle@2017632`, and both are these two gates.

### 2.3 The URL, and both ways it is opened

`getRecordingsUrl()` at `bundle@1959845`, verbatim:

```js
getRecordingsUrl(){return`${this.appService.globals.apiROOT}/sessions/v2/archives/recordings/${this.appService.globals.sessionID}/${this.appService.globals.sesionToken}`}
```

`launchRecordings()` at `bundle@2522147` (`app-room`) and `bundle@2568382`
(`app-closed-session-page`), both verbatim and identical:

```js
launchRecordings(){window.open(`${this.appService.globals.apiROOT}/sessions/v2/archives/recordings/${this.appService.globals.sessionID}/${this.appService.globals.sesionToken}`,"_blank")}
```

Endpoint shape: `GET {apiROOT}/sessions/v2/archives/recordings/{sessionID}/{sesionToken}` — three
path segments, no query string, no body, no headers set by the client. The token is **in the path**.

`sesionToken` is the reference's own spelling — one `s` in "sesion". Counted across the bundle:
`sesionToken` 36 occurrences, `sessionToken` 6. This repository already preserves the spelling when
quoting the reference (`apps/room/src/lib/roster-gates.ts:263`,
`apps/room/src/routes/+page.svelte:2046`).

### 2.4 The pipe — `noSanitize`, transform body read from source

Registered at `bundle@1170770` as `Rn({name:"noSanitize",type:t,pure:!0})`. Transform at
`bundle@1170279`, verbatim:

```js
transform(e,i){switch(i){
  case"html":return this.sanitizer.bypassSecurityTrustHtml(e);
  case"style":return this.sanitizer.bypassSecurityTrustStyle(e);
  case"script":return this.sanitizer.bypassSecurityTrustScript(e);
  case"url":return this.sanitizer.bypassSecurityTrustUrl(e);
  case"resourceUrl":return this.sanitizer.bypassSecurityTrustResourceUrl(e);
  default:throw new Error(`Invalid safe type specified: ${i}`)}}
```

The Recordings pane calls it with `"resourceUrl"` (`Ct(2,2,e.getRecordingsUrl(),"resourceUrl")` in
`GSe`), i.e. `bypassSecurityTrustResourceUrl`. It is the **only** pipe on the Recordings surface.
There is no search pipe, no limit pipe, no sort pipe — the pane is one iframe.

### 2.5 The page inside the iframe — the complete row template

`apps/controller/evidence-dumps/TIER1-fetched/views/page.recordings.html`, 27 lines, sha256 prefix
`1d9027c360faf32b`, fetched read-only 2026-08-13 per that directory's README lines 1-3 and 22.
Controller `LoginCtrl` (line 3). Outer container `class="container container-sm animated fadeInDown ng-scope" style="width: 70%;"` (line 2).

Structure, lines 6-26:

```html
<h3>Recordings</h3>
<div class="panel panel-default">
  <div class="panel-heading">Recordings:</div>
  <div class="panel-body">
      <ul class="list-group">
```

**The empty state, verbatim, `page.recordings.html:11`:**

```html
<li ng-hide="recs.length>0">No Recordings...</li>
```

Three dots. Capital N, capital R. A **bare `<li>` with no `list-group-item` class**, unlike the
populated rows — so it does not get the row padding or borders.

**The row, verbatim, `page.recordings.html:12`:**

```html
<li class="list-group-item" ng-hide="recs.length==0" ng-repeat="rec in recs">
```

The `ng-hide` is redundant beside the `ng-repeat` — an empty array renders no rows either way — and
it is in the source.

**Every column, in order, with the exact expression rendering it:**

| # | element | expression, verbatim | line |
| --- | --- | --- | --- |
| 1 | `<i class="fa fa-file-video-o">` | *(static icon, no expression)* | 13 |
| 2 | text inside `<h4>` | `{{::rec.created \| date:'MM/dd/yyyy @ h:mma' }}` | 13 |
| 3 | `<i class="fa fa-clock-o">` | *(static icon)* | 13 |
| 4 | text inside `<h4>` | `{{(rec.length/60000) \| number:2}} Minutes` | 13 |
| 5 | `<video>` | `ng-src="{{rec.vidPath}}"` `controls` `type="{{rec.contentType}}"` `width="640"` | 15-16 |
| 6 | `<br>` | — | 19 |
| 7 | Download `<a>` | `ng-href="{{::rec.vidPath}}" target="_blank" download="{{rec.name}}" class="btn btn-default"` + `<i class="fa fa-cloud-download"></i> Download` | 20 |
| 8 | Share `<a>` | `href="" class="btn btn-default"` + `<i class="fa fa-share"></i> Share` | 21 |

The whole `<h4>` verbatim, line 13:

```html
<h4> <i class="fa fa-file-video-o"></i> {{::rec.created | date:'MM/dd/yyyy @ h:mma' }} <i class="fa fa-clock-o"></i> {{(rec.length/60000) | number:2}} Minutes</h4>
```

Note the leading space after `<h4>`, the single spaces around each interpolation, and that
`Minutes` has **no** leading space of its own — the space comes from inside the `}}` boundary text.

`::` one-time binding on `rec.created` and on the Download `ng-href`, but **not** on
`rec.length`, **not** on the `<video>` `ng-src`, and **not** on `type`/`download`.

### 2.6 How `length` is formatted — the TODO claim, CONFIRMED, with one correction

`TODO.md:439` states: "`length` in MILLISECONDS (the page renders `length/60000` to two decimals)".

**CONFIRMED as to the page.** `page.recordings.html:13` contains the literal characters
`{{(rec.length/60000) | number:2}} Minutes`. The divisor is the literal `60000`, the AngularJS
`number` filter is applied with fractionSize `2`, and the word `Minutes` follows.

**The unit is confirmed independently from the API's own legend**, which is the only endpoint doc in
the capture that states units at all:

- `apps/controller/evidence-dumps/login-page/api-docs:405` — `<li><code>duration</code>: Duration in minutes</li>`
- `apps/controller/evidence-dumps/login-page/api-docs:406` — `<li><code>length</code>: Duration in milliseconds</li>`
- sample row, `api-docs:385-386` — `"duration": 120,` and `"length": 7200000` (7,200,000 ms ÷ 60,000 = 120)

**The correction: this arithmetic is NOT in the v4 bundle, and must not be looked for there.**
Measured across all 2,891,205 bytes:

| searched | occurrences | what they were |
| --- | ---: | --- |
| `60000` | 0 | — |
| `length/6` | 0 | — |
| `6e4` (the minifier's form) | 6 | every one opened and read: `bundle@156312` Angular's own timezone parser; `bundle@992241` a socket `ackTimeout`; `bundle@1416708` a `getAllLog` ack timeout; `bundle@1628405` an HLS sample-rate helper; `bundle@1819005` a WebVTT `X-TIMESTAMP-MAP` parser; `bundle@2869381` the `ms` npm module. **None is recordings-related.** |

So the row rendering — and therefore `length/60000` — is server-side. The client's whole
contribution is the URL in §2.3.

**A second, independent duration source exists and the page does not use it.** The API returns
`duration` already in minutes (`api-docs:385`, `api-post-routes.md:415`), and the page still divides
`length`. `api-post-routes.md:727` records why that matters: "Upload recordings are handled
differently and always show duration as 0" — so for an uploaded file `duration` is `0` while
`length` is real. Dividing `length` is the reference's deliberate choice, not an oversight.

### 2.7 Every control — handler, title, classes

| control | markup, verbatim | handler | title attribute |
| --- | --- | --- | --- |
| **Play** | `<video ng-src="{{rec.vidPath}}" controls type="{{rec.contentType}}" width="640"></video>` (`page.recordings.html:15-16`) | none — native `controls` | none |
| **Download** | `<a ng-href="{{::rec.vidPath}}" target="_blank" download="{{rec.name}}" class="btn btn-default"><i class="fa fa-cloud-download"></i> Download</a>` (`:20`) | none — plain navigation | none |
| **Share** | `<a href="" class="btn btn-default"><i class="fa fa-share"></i> Share</a>` (`:21`) | **none at all** | none |
| **Delete** | — | — | — |

Three things to state plainly:

1. **There is no Delete control on the recordings page.** I read all 27 lines; no `ng-click`, no
   `delete`, no trash icon. Deletion of recordings is not on this surface.
2. **No control on this page carries a `title` attribute.** Zero `title=` in the file.
3. **Share is a dead control in the reference.** `href=""`, no `ng-click`, no `ng-href`, no
   `ng-class`, no directive of any kind. It renders and does nothing. This is already on the record
   as T5-18 (`docs/reference/evidence-dumps-full-read.md:1511-1515`), with the standing
   recommendation to omit it and say why rather than ship a dead button.

The `<video>` element has `type` on the `<video>` itself rather than on a `<source>`, and `width`
with **no** height — a CLS source. Both are the reference's, recorded as-is.

### 2.8 CSS for every recordings-related class

**Room side (v4 stylesheet).** The pane and tab classes:

| class | rule, verbatim | locator |
| --- | --- | --- |
| `.tab-content>.tab-pane` | `{display:none}` | `css@211296` |
| `.tab-content>.active` | `{display:block}` | `css@211332` |
| `.position-relative` | `{position:relative!important}` | `css@296449` |
| `.h-100` | `{height:100%!important}` | `css@300283` |
| `.nav-item` | `{margin-bottom:-1px}` | `css@62162` |
| `.nav-link` | `{display:block;padding:.5rem 2rem}` | `css@61949` |
| `.dropdown-item` | `{display:block;width:100%;padding:.25rem 1.5rem;clear:both;font-weight:400;…}` | `css@46117` |
| `.small,small` | `{font-size:.875em}` | `css@143523` |
| `.users-dropdown-options` | `{background-color:var(--archives-dropdown-menu-bg-color)!important;color:var(--archives-dropdown-menu-color)!important;border:none}` | `css@435989` |
| `.users-dropdown-options a` | `{margin:0!important}` | `css@436143` |
| `.users-dropdown-options a:hover` | `{cursor:pointer}` | `css@436188` |
| `.darkTheme .sidebar-item:hover` | `{background-color:#111!important}` | `css@438782` |
| `--archives-dropdown-menu-bg-color` | `#fff` | `css@423835` |
| `--archives-dropdown-menu-color` | `#222222` | `css@423875` |

`.mainTabset .dropdown-menu` at `css@432685` sets
`background-color:var(--archives-dropdown-menu-bg-color);color:var(--tabs-dropdown-color);border:none`
— it shares the archives token with the tab-strip dropdowns.

**Absent from the v4 stylesheet, and reported rather than guessed:** `#recordings` — **0
occurrences** in 444,793 bytes. The substring `recordings` — **0 occurrences**. `fa-file-video` — **0
occurrences**; in fact `.fa-` has **0 occurrences** in the whole file, so the Font Awesome glyph
rules are in a stylesheet that is not part of this capture directory (`sha256sums.txt` lists only
`deployed-index.html`, `main.…js` and `styles.…css`).

**Page side (legacy stylesheets).** Read at the offsets given:

| class | rule, verbatim | locator |
| --- | --- | --- |
| `.list-group` | `{ line-height: 1.3; }` | `TIER1-fetched/styles.css@1394` (repeated at `@109722`) |
| `.list-group .list-group-item` | `{ padding: 10px; }` | `styles.css@1430` (repeated at `@109758`) |
| `.panel .list-group .list-group-item:first-child` | `{ border-top: 0; }` | `styles.css@1480` |
| `.btn.btn-default` | `{ border-color: #e6e9ee; }` | `styles.css@34821` |
| `input.form-control.dark, .btn.btn-default.dark` | `{ background-color: #000; }` | `styles.css@101652` |
| `.mt-xl` | `{ margin-top: 30px !important; }` | `styles.css@78920` (repeated at `@187248`) |
| `.ng-fadeOutZoom.ng-enter` | `{ animation: zoomIn 1s cubic-bezier(0.23, 1, 0.32, 1); }` + `-webkit-`/`-o-` | `styles.css@20636` |
| `.ng-fadeOutZoom.ng-leave` | `{ animation: fadeOut 1s cubic-bezier(0.23, 1, 0.32, 1); }` + prefixes | `styles.css@20841` |
| `.ng-fluid.ng-animate` | `{ position: absolute; width: 100% … }` | `styles.css@17812` |
| `.panel-body` | `{ overflow-y: auto; background-color: #FFFFFF; min-height: auto; }` | `TIER1-fetched/main.css` (read whole, 2,103 bytes) |
| `.panel` | `{ /* // min-height: 100px; */ }` — an empty rule with the declaration commented out | `main.css`, same file |

**Absent from all four fetched legacy stylesheets, and reported rather than invented:**
`.panel-default`, `.panel-heading`, `.container-sm`, `.center-block`, and the *base* `.list-group-item`
and `.btn-default` rules. Searched `main.css`, `styles.css`, `theme.css` and `vendor-animate.css`:
`center-block` 0 hits in all four; `.panel-heading` 0; `.panel-default` 0; `.btn-default{` 0. What is
present in `styles.css`/`theme.css` are *overrides* keyed on those selectors, which means the
Bootstrap 3 base file they override is not among the artifacts in `TIER1-fetched/`. Its README lists
exactly which files were fetched and why three were absent; the Bootstrap base is simply not one of
the fetched targets.

`.fa-file-video-o`, `.fa-clock-o`, `.fa-cloud-download`, `.fa-share` — 0 hits in all four legacy
stylesheets. Same reason as the room side: the Font Awesome glyph sheet is not in the capture.
`TIER1-fetched/fontawesome.woff2` (56,780 bytes) is the *font*, not the CSS.

### 2.9 Wire commands, and the endpoint shape

**There is no wire command for Recordings.** Stated as a measurement, not an impression: the string
`recs` occurs 12 times in the bundle and every one was opened and read —

| offset | what it actually is |
| ---: | --- |
| 1263680 | `~precsim~` inside Angular's HTML-entity table |
| 2016835, 2017632 | `recsInRoom`, the two gates in §2.2 |
| 2352919, 2353045, 2353271, 2354154, 2354336, 2354401, 2354503, 2354600, 2354713 | `recsHolderScreen` / `recsHolderScreen-lg`, the `app-rec-preview` component's own CSS and consts |

No `getRecordings`, no `getRecs`, no `getArchives` (`getArchives` — 0 occurrences). The client fetches
nothing; it points a browser at a URL.

**Two server endpoints exist for recordings data, and neither is the one the iframe uses.**

**(1) GET, key-authenticated** — `apps/controller/evidence-dumps/login-page/api-docs:361-428`:

```
GET https://ptrv3.protradingroom.com/stats/v1/sessions/recordings?apiKey=…&apiSecret=…&sessionID=…
```

Response (`api-docs:375-394`):

```json
{ "success": true,
  "recordings": [ { "_id","sessionID","name","namemkv","contentType","created",
                    "duration","length","fpath","media_server","vidPath","ms","isUpload" } ] }
```

Notes (`api-docs:417-421`): last 3 weeks only; sorted newest first; empty array when none; upload
files have `duration` 0; video files carry both MKV and processed names. Errors (`:425-427`): 403
invalid credentials or disabled API, 429 rate limit, 400 invalid session.

**(2) POST, secret-authenticated** — `apps/controller/evidence-dumps/TIER1-fetched/api-post-routes.md:112-117`:

```
POST https://chat.protradingroom.com/ptr_app/api/v2/session/recordings
body: { "sessionID": "…", "secret": "…" }
```

Response is a **bare JSON array** (`api-post-routes.md:401-422`), not an envelope, and carries two
fields the GET does not: `session_uuid` and `isPublic`. `[]` when empty (`:426-428`). 403 / 503
(`:432-438`).

**(3) The iframe URL itself** — `{apiROOT}/sessions/v2/archives/recordings/{sessionID}/{sesionToken}`
— is a **third** shape, on a **third** version prefix (`v2` vs `stats/v1` vs `api/v2`), and it returns
**HTML**, not JSON, because it is what renders `page.recordings.html`. No response capture of it
exists in this repository. That is the honest gap §5 records.

### 2.10 Adjacent, and easy to confuse: the in-room recording CONTROL

This is a different feature from the archive, and it is decoded here only so the match table can keep
them apart.

`t4e` at `bundle@2477354` renders the presenter's recording dropdown. `app-room` consts:
95 `["title","Star/Stop Recording",1,"nav-item","dropdown"]` — **the reference's own typo, "Star"** —
152 `["id","dropdownRecording","data-bs-toggle","dropdown","aria-haspopup","true","aria-expanded","false",1,"nav-link","dropdown-toggle","d-flex","align-items-center",3,"ngClass"]`,
153 `[1,"far","fa-2x","fa-dot-circle",3,"ngClass"]`, 108 `[1,"ml-2","mainNavItem"]` with text
`Start/Stop Recording`.

Menu `YPe` at `bundle@2475469`, four items plus a conditional block:

| item | icon const | label, verbatim | handler |
| --- | --- | --- | --- |
| `HPe` | 159 `[1,"far","fa-dot-circle"]` | `" Start Recording "` | `startRecording(null)` |
| `$Pe` | 160 `[1,"far","fa-square"]` | `" STOP Recording "` | `stopRecording(null)` |
| `zPe` | 161 `[1,"far","fa-pause-circle"]` | `" PAUSE Recording "` | `pauseRecording()` |
| `GPe` | 162 `[1,"far","fa-pause-circle-o"]` | `" RESUME Recording "` | `resumeRecording()` |
| `KPe` | 115 `[1,"dropdown-divider"]` then 164 `[1,"fas","fa-times-circle"]` / 51 `[1,"fas","fa-circle"]` | `" Hide Rec Preview "` / `" Show Rec Preview"` | `hideRecPreview()` / `showRecPreview()` |

`KPe`'s gate: `O(9,e.appService.globals.roomState.isRecording&&e.appService.globals.sessData.recPreviewLocation?9:-1)`.
Badges: `[ REC PAUSED]` (`BPe`, const 92 `[1,"nav-item","recIndicator","animated","flash"]`),
`[ REC ]` (`UPe`, const 93 `…"animated","fadeIn"]`) with tooltip
`dontShowRecInfoToUsers&&!isPresenter||!roomState.recName ? "" : "Recording to: "+decodedRecName()`
(`bundle@2474238`), and a spinner `REC` (`jPe`, const 94 `[1,"nav-item","recIndicatorStart"]`).
Reminder text `You are not recording!` (`VPe` at `bundle@2474459`, text at `bundle@2474544`).

**There is no Download item in this menu.** `YPe` and `KPe` between them declare exactly the five
entries above. `startRecMtx` (`bundle@2527770`) and `stopRecMtx` (`bundle@2528083`) each occur once —
the recording is produced server-side.

---

## 3. DOES OURS MATCH?

Read for this section: `apps/room/src/routes/+page.svelte`, `apps/room/src/lib/types.ts`,
`apps/room/src/lib/roster-gates.ts`, `apps/room/src/lib/server/room-config-client.ts`, and every
route under `apps/room/src/routes` and `apps/controller/src/routes` (directory listings taken in
full).

### 3.1 The surface

| # | reference (+locator) | ours (+`path:line`) | verdict |
| --- | --- | --- | --- |
| 1 | Recordings **main tab**, `<li>` + `<a id="recordings-tab">`, label `Recordings`, icon `fas fa-file-video` — `bundle@1916945`, consts 31/59/12/60/14 | `MainTab` is `'screens' \| 'streams' \| 'notes' \| 'videoplayer' \| 'files'` — `apps/room/src/lib/types.ts:2`. The tab strip runs `apps/room/src/routes/+page.svelte:10834-11041` and declares Screens (:10843), Streams (:10870), Notes (:10890), VideoPlayer (:10958), Files (:10992). No Recordings `<li>` | **MISSING** |
| 2 | `#recordings` **pane**, `class="tab-pane position-relative h-100"` — `bundle@1930394`, const 25 `bundle@1995797` | `<div id="mainTabsContent" class="tab-content">` at `+page.svelte:11042` holds panes for screens (:11046), streams (:11199), notes (:11272), videoplayer (:11317), files (:11335). No `#recordings` pane | **MISSING** |
| 3 | The pane's **`<iframe width="100%" height="100%" frameborder="0">`** bound to `getRecordingsUrl() \| noSanitize:'resourceUrl'` — `bundle@1930394`, const 140 `bundle@2003434` | nothing | **MISSING** |
| 4 | Tab+pane gate `archivesAvailableTo() && sessData.recsInRoom` — `bundle@2016775`, `bundle@2017572` | `recsInRoom` is **absent from `apps/room/src` entirely** (0 occurrences). It exists only in the controller schema, `apps/controller/src/lib/room-settings-schema.ts:243`, marked `wired: false` | **MISSING** |
| 5 | Sidebar **Archives dropdown** — `id="archivesDropdown"`, `title="Archives"`, `class="nav-link sidebar-item dropdown-toggle"`, icon `fas fa-archive`, menu `dropdown-menu users-dropdown-options` (consts 43/44/45) | `+page.svelte:9645-9666` — same id, same title, same classes, same icon, same menu classes | **MATCH** |
| 6 | Archives gate `O(32,e.archivesAvailableTo()?32:-1)` — `bundle@2471971` | `+page.svelte:9641` `{#if archivesAvailable}` over `archivesAvailableTo(rosterViewer, rosterSession)` at `+page.svelte:2072`, implemented `apps/room/src/lib/roster-gates.ts:54-59` as a byte-for-byte transcription | **MATCH** |
| 7 | **`Recording` menu item** — `<a class="dropdown-item small" (click)="launchRecordings()"><i class="fas fa-circle"></i><span class="pl-2">Recording</span></a>` — `bundle@2467757`, const 50 `[1,"dropdown-item","small",3,"click"]` `bundle@2535914` | `+page.svelte:9670-9672` — `<a class="dropdown-item small"><i class="fas fa-circle"></i><span class="pl-2">Recording</span></a>`. **No `onclick`. No `href`. No handler of any kind.** Const 50's `3,"click"` binding has no counterpart | **DIFFERS — ours is a dead control** |
| 8 | Item gate `isPresenter \|\| !sessData.hideRecs` — `bundle@2468604` | `+page.svelte:9668` `{#if isPresenter \|\| !data.sessData?.hideRecs}`; `hideRecs` plumbed at `apps/room/src/lib/server/room-config-client.ts:95` and marked `wired: true` at `apps/controller/src/lib/room-settings-schema.ts:241` | **MATCH** |
| 9 | `launchRecordings()` → `window.open({apiROOT}/sessions/v2/archives/recordings/{sessionID}/{sesionToken}, "_blank")` — `bundle@2522147` | no such function; `grep launchRecordings apps/room/src apps/controller/src` → 0 hits | **MISSING** |
| 10 | The Archives menu's other three items: Alert Logs (const 47), Chat Logs (52), Transcript History (54) | `+page.svelte:9678-9686`, `:9696-9704`, `:9709-9713` — all three present with matching classes, icons and gates | **MATCH** |
| 11 | Second copy of the whole Archives menu on `app-closed-session-page`, with **three** items and no Transcript History — `bundle@2564279` | no closed-session page exists in `apps/room/src/routes` (full listing: `+layout.svelte`, `+page.*`, `api/*`, `internal/*`, `logout/*`, `sess/*`, `session/*`, `uploads/*`) | **MISSING** |

### 3.2 The page inside the iframe

| # | reference (+locator) | ours (+`path:line`) | verdict |
| --- | --- | --- | --- |
| 12 | The whole page — `LoginCtrl`, `width: 70%`, `panel panel-default`, `list-group` | no route, no component, no markup. Searched `apps/room/src` and `apps/controller/src` for `No Recordings`, `fa-file-video`, `fa-cloud-download`, `fa-clock-o`, `list-group` — 0 hits for the recordings page in either app | **MISSING** |
| 13 | Empty state `<li ng-hide="recs.length>0">No Recordings...</li>` — `page.recordings.html:11` | nothing | **MISSING** |
| 14 | Row field `rec.created` via `date:'MM/dd/yyyy @ h:mma'` — `page.recordings.html:13` | The formatter **exists and is correct**: `formatLastLogin` at `apps/controller/src/lib/last-login-format.ts:32-41` produces exactly `MM/DD/YYYY @ h:mmA`, pinned by `apps/controller/src/lib/last-login-format.test.ts:12-31`. Nothing calls it for recordings because there is no recordings surface | **MISSING (helper ready)** |
| 15 | Row field `(rec.length/60000) \| number:2` + ` Minutes` — `page.recordings.html:13` | no implementation. `grep 60000 apps/room/src apps/controller/src` finds only `HTML_CAP = 60000` in `apps/room/scripts/ptr-collect.js:37` and `apps/room/scripts/mtx-collect.js:43`, which are collector byte caps and unrelated | **MISSING** |
| 16 | Row field `rec.vidPath` on `<video ng-src>` and on the Download `ng-href` | `vidPath` exists in our code only as the **Files** pane's field: `apps/room/src/lib/files-gates.ts:19` and `:58,62`. No recordings consumer | **MISSING** |
| 17 | Row field `rec.contentType` on `<video type>` | same — Files only, `apps/room/src/lib/files-gates.ts` | **MISSING** |
| 18 | Row field `rec.name` on `download=` | same | **MISSING** |
| 19 | Download `<a … class="btn btn-default">` with `fa-cloud-download` — `page.recordings.html:20` | nothing | **MISSING** |
| 20 | Share `<a href="" class="btn btn-default">` — a **dead control in the reference** — `page.recordings.html:21` | nothing. Ours cannot be accused of shipping it | **MISSING — and the standing recommendation (`docs/reference/evidence-dumps-full-read.md:1514`) is to keep it that way** |
| 21 | `downloadRecordingsDisabled` — a real room setting, `apps/controller/src/lib/room-settings-schema.ts:244` | `wired: false` in ours. In the reference it has **0 occurrences in the bundle** and **0 in `page.recordings.html`**, so where it is enforced is uncaptured in both directions | **MISSING in both — see §5** |

### 3.3 The in-room recording control — where "ours is working" is true

| # | reference (+locator) | ours (+`path:line`) | verdict |
| --- | --- | --- | --- |
| 22 | `title="Star/Stop Recording"` on the `<li>` (const 95, the reference's typo) | `+page.svelte:8877` — `title="Star/Stop Recording"`, typo preserved | **MATCH** |
| 23 | Toggle `<a id="dropdownRecording" … class="nav-link dropdown-toggle d-flex align-items-center">` + `<i class="far fa-2x fa-dot-circle">` + `<span class="ml-2 mainNavItem">Start/Stop Recording</span>` (consts 152/153/108) | `+page.svelte:8883-8894` — id, classes, icon and label all identical | **MATCH** |
| 24 | Menu `<ul aria-labelledby="dropdownRecording" class="screen-options-start-screen dropdown-menu dropdown-menu-end">` (const 155) | `+page.svelte:8907-8913` — identical | **MATCH** |
| 25 | `" Start Recording "` / `" STOP Recording "` / `" PAUSE Recording "` / `" RESUME Recording "` with icons `far fa-dot-circle` / `far fa-square` / `far fa-pause-circle` / `far fa-pause-circle-o` — `bundle@2474667-2474990`, consts 159-162 | `+page.svelte:8923`, `:8931`, `:8939`, `:8948` — all four labels and all four icons identical | **MATCH** |
| 26 | `" Hide Rec Preview "` / `" Show Rec Preview"` with `fas fa-times-circle` / `fas fa-circle` (consts 164/51) | `+page.svelte:8976-8978` — identical, including the asymmetric spacing | **MATCH** |
| 27 | `Can't start recording without screenshare` (`QPe` at `bundle@2476310`, text at `bundle@2476353`) | `+page.svelte:8915` — identical | **MATCH** |
| 28 | `You are not recording!` reminder (`VPe` at `bundle@2474459`, text at `bundle@2474544`) with `recording-reminder` / `recording-reminder-arrow` / `btn-close` (consts 154/156/157) | `+page.svelte:8896-8904` — identical | **MATCH** |
| 29 | Badges `[ REC PAUSED]`, `[ REC ]`, spinner `REC` with `recIndicator animated flash` / `recIndicator animated fadeIn` / `recIndicatorStart` (consts 92/93/94) | `+page.svelte:8851-8866` — all three, identical classes and text | **MATCH** |
| 30 | `[ REC ]` tooltip `dontShowRecInfoToUsers && !isPresenter \|\| !roomState.recName ? "" : "Recording to: "+decodedRecName()` — `bundle@2474238` | `+page.svelte:1130-1133` `recordingTooltip`, transcribed in the comment at `:8847-8849` | **MATCH** |
| 31 | Recording is **server-side**: `startRecMtx` (`bundle@2527770`), `stopRecMtx` (`bundle@2528083`), server pushes `recName`; the bundle's only `new MediaRecorder` is the mic test | Client-side `MediaRecorder` at `+page.svelte:6188`, writing a file to the presenter's disk. Documented as deliberate at `+page.svelte:6133-6139` | **DIFFERS — declared** |
| 32 | The recording menu has **no Download item** — `YPe` + `KPe` declare exactly five entries (`bundle@2475469`, `bundle@2475295`) | `+page.svelte:8959-8969` renders `<i class="fas fa-download"></i> Download Recording` plus a conditional `(no audio)` suffix | **INVENTED** |
| 33 | `showRecPreview()` opens a window at `sessData.recPreviewLocation`, a server-supplied URL; `KPe` is gated on that value existing | `+page.svelte:6249-6265` opens a window at the local blob URL; `recPreviewLocation` has 0 occurrences in `apps/room/src` | **DIFFERS — declared at `+page.svelte:6241-6244`** |

### 3.4 Verdict

**Recordings-the-archive is not implemented in this repository. Not partially — not at all.** Eleven
of the eleven surface items and all ten page items are MISSING or DIFFERS. Nothing renders a
recording, a `vidPath`, a `length`, or a `created` stamp anywhere in `apps/room/src` or
`apps/controller/src`.

**Two findings that need action rather than filing:**

1. **`+page.svelte:9670-9672` is a dead control we shipped.** The reference's `Recording` item has a
   click binding (const 50 carries `3,"click"`; `gPe` binds `launchRecordings()`). Ours has neither
   `onclick` nor `href`. It renders, it is styled, it is gated correctly — and clicking it does
   nothing. This is the exact failure mode `CLAUDE.md` names ("no control whose only effect is
   changing its own label") and the repository already has the honest pattern for it three lines
   below: `Transcript History` calls `openTranscriptPage` (`+page.svelte:9709`), which sets a
   `bootboxAlert` explaining the surface is unavailable (`+page.svelte:2671-2673`). The Recording
   item was left with nothing.

2. **`Download Recording` (`+page.svelte:8966`) is INVENTED.** No such item exists in the reference's
   recording menu — I read `YPe` (`bundle@2475469`) and `KPe` (`bundle@2475295`) in full and they
   declare Start / STOP / PAUSE / RESUME / divider / Show-or-Hide Rec Preview, and nothing else. It
   is a *consequence* of the declared client-side-recorder divergence at `+page.svelte:6133-6139` —
   a local recording with no download is unreachable — but the divergence comment covers the
   recorder, not this menu entry, and the entry itself carries no note saying it has no counterpart.

**Everything about the in-room recording CONTROL matches** — items 22 through 30 are exact, down to
the reference's "Star/Stop" typo and the asymmetric spacing in `" Hide Rec Preview "` versus
`" Show Rec Preview"`. If "our recordings is working" refers to pressing record and getting a file,
that is accurate and it is faithful to the reference's UI. It produces nothing that the archive
surface could ever list, because our recorder writes to the presenter's Downloads folder and the
reference's writes to a media server.

---

## 4. VERIFICATION — negative controls run

**Control 1 — I expected the v4 bundle to contain the recordings row template, and specifically the
`length/60000` arithmetic. It does not.**

Checked, in this order: `60000` → 0 occurrences in 2,891,205 bytes. `length/6` → 0. `length /` → 0.
`toFixed(2)` → 3 occurrences, at `bundle@1576658`, `bundle@1619280`, `bundle@1761623`, none in a
recordings context. `6e4`, the minifier's form of 60000 → 6 occurrences, **each one opened and read
individually** (listed in §2.6): a timezone parser, a socket ack timeout, a log-fetch ack timeout, an
HLS helper, a WebVTT parser, and the `ms` npm module. **REFUTED for the bundle. CONFIRMED for
`page.recordings.html:13`.** The TODO row is correct about the arithmetic and about the unit; it is
the *location* that had to be established, and that is what changes T5-16 from "blocked on an
uncaptured endpoint" to "the row template has been in the repository since 2026-08-13".

**Control 2 — I expected `recs` to be a wire command. It is not a data identifier anywhere in the
bundle.** All 12 occurrences enumerated with a ±20-byte window and read: 1 is Angular's HTML-entity
table (`~precsim~`), 2 are `recsInRoom`, and 9 are `recsHolderScreen`/`recsHolderScreen-lg` in the
`app-rec-preview` component. `getArchives` → 0 occurrences. This is the point that would have been
missed by concluding from a grep count: `recs` "appearing 12 times" reads like a live data array and
is nothing of the kind.

**Control 3 — I checked whether the region at `bundle@1946918` (`vidPath`, 13 occurrences) was the
recordings row, and it is not.** I read `bundle@1945800-1950500` in full: it is `Zwe`/`e2e`/`t2e`,
the **Files** pane — `deleteFile`, `playMp3ForMe`, `playMp3ForAll`, `overwriteCashRegisterSound`, the
`selectedFileTab` filter over `files`/`images`/`sounds`. Same field names, different feature.
Reporting those columns as the recordings row would have been the "read a `<td>` from a search hit"
failure recorded in `~/CLAUDE.md` §1.

**Control 4 — I checked whether our repo has a recordings surface I had not found**, rather than
concluding from one grep. Enumerated every file under `apps/room/src/routes` (13 files) and every
directory under `apps/controller/src/routes` (28 directories); read the full tab strip
(`+page.svelte:10834-11041`) and the full tab-content block start (`:11042` onward, panes at
:11046/:11199/:11272/:11317/:11335); read `MainTab` at `types.ts:2`. No recordings route, component,
pane or tab exists.

---

## 5. Still to decode

Each is a specific lookup, not a research project.

- [ ] **The response body of `{apiROOT}/sessions/v2/archives/recordings/{sessionID}/{sesionToken}`.**
      This is the URL the iframe and `window.open` actually use, and it is on a *third* API shape
      (`/sessions/v2/…`) distinct from the documented `stats/v1` GET and `api/v2` POST. It returns
      HTML. **Not captured.** Looked in: the whole bundle (the client only builds the string,
      `bundle@1959845`), `TIER1-fetched/api-post-routes.md` (documents `POST /session/recordings`
      only), `evidence-dumps/login-page/api-docs` (documents `GET /sessions/recordings` only).
      Whether that HTML *is* `page.recordings.html` with `recs` bound, or a newer server-rendered
      page, is unestablished. **Blocks:** knowing whether the 27-line template is still current.
      **Capture:** one authenticated GET of that URL from a live room, saved as HTML.

- [ ] **Whether `page.recordings.html` is still the page behind that URL.**
      The dated-evidence lesson in `apps/room/docs/source-v4-2026-08-15/README.md` applies directly:
      `page.recordings.html` was fetched 2026-08-13 from `protradingroom.com`; the room bundle is a
      v4 build from `chat.protradingroom.com`. Two hosts, two dates. **Capture:** the same GET as
      above, diffed against the 1,324-byte file.

- [ ] **Where `downloadRecordingsDisabled` is enforced.**
      It is a real setting (`apps/controller/src/lib/room-settings-schema.ts:244`, label
      "Disable download button for Recordings for users?"). It has **0 occurrences in the v4 bundle**
      and **0 in `page.recordings.html`** — I read all 27 lines of the latter, and there is no
      `ng-if`/`ng-hide`/`ng-show` on the Download anchor at line 20. **Blocks:** reproducing the
      Download gate. **Capture:** the live archives HTML with the setting on, then with it off.

- [ ] **Whether the Share control is still dead in the live page.**
      `page.recordings.html:21` has `href=""` and no handler as fetched. **Capture:** the same HTML;
      if a handler has since been added, the omit-it recommendation
      (`docs/reference/evidence-dumps-full-read.md:1514`) is reversed.

- [ ] **The Font Awesome rules for `fa-file-video`, `fa-file-video-o`, `fa-clock-o`,
      `fa-cloud-download`, `fa-share`, `fa-archive`, `fa-circle`.**
      `.fa-` has **0 occurrences** in `styles.ee2a710065b60389.css` (444,793 bytes) and 0 in all four
      `TIER1-fetched` stylesheets. The glyph sheet is not in either capture directory; only the
      webfont binary (`TIER1-fetched/fontawesome.woff2`) is. **Blocks:** nothing — the class names
      are what matters and they are captured. Recorded so nobody reports the rules as missing again.

- [ ] **The Bootstrap 3 base rules for `.panel`, `.panel-default`, `.panel-heading`,
      `.list-group-item`, `.btn-default`, `.container-sm`, `.center-block`.**
      Searched all four `TIER1-fetched` stylesheets; only *overrides* are present (§2.8). The base
      file is not among the fetched artifacts and its README does not list it as a target.

- [ ] **The AngularJS `number:2` filter's exact output for edge values.**
      The expression is captured verbatim (`page.recordings.html:13`); the filter's implementation is
      in `vendor.min.js`, which `TIER1-fetched/README.md:28-48` records as fetched and read but
      deliberately not committed (it trips `verify-privacy-boundary.mjs`). Whether `number:2` inserts
      a thousands separator for a recording over 1,000 minutes is therefore not established from
      evidence held here. **Capture:** re-fetch `vendor.min.js` at the pinned sha256
      `dd1fd2b3869615a21e32d1d2cee1d727993c34e6de6fc609cab8ed3a4fb3bbba` and read `formatNumber`.

- [ ] **Whether `recsInRoom` defaults on or off for a room that has never set it.**
      The tab gate is `archivesAvailableTo() && sessData.recsInRoom` (`bundle@2016775`) — a falsy
      default hides the tab entirely. `apps/controller/src/lib/room-settings-schema.ts:243` records
      `captured: false`, which is the *captured checkbox state of the one room dumped*, not a proven
      product default. **Capture:** the manage page of a second room.
