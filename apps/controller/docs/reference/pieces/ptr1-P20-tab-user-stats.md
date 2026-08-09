# PTR1 · P20 — "User Stats" tab pane

**Evidence base:** `/tmp/ptr-decode/ptr1/caps/00-baseline-room/` — `DEFAULTS.txt` + `nodes-000.txt`…`nodes-017.txt`
(capture `baseline-room`, `kind=fullDom`, `node count 2156`, `truncated=false`, `ts 2026-07-24T15:59:18.276Z`,
`viewport {"w":1842,"h":1265,"dpr":2}`, `themeClass "footer-hidden"`, `cssVars {"root":{},"body":{}}` — `INFO.txt`).
Page: Manage Room admin page, room 3625.

**Extraction command used (breadth-first by path prefix, not by `#index`):**
```
awk -v RS='' -v ORS='\n\n' '/path=r\.0\.1\.1\.0\.1\.3\.1\.4([. ])/' nodes-*.txt
```

---

## 1. Purpose and reveal condition

This is the **5th `tab-pane`** (`ng-repeat="tab in tabs"`, index 4) of the uib-tabset at
`r.0.1.1.0.1.3`. It is the per-room login/session analytics screen: a date-range picker
(two x-editable dates), a user search box, four filter checkboxes, five action buttons
(Load Stats / Export / Monthly report / Clear monthly report / Download monthly report), an
"ajax loader" block, a monthly-report block, and a 5-column results table.

**Exact reveal condition — verbatim from the evidence.** The pane element (`#101`) carries **no**
`ng-if` and **no** `ng-show`; its only visibility attributes are:

```
attr ng-repeat = "tab in tabs"
attr ng-class  = "{active: tab.active}"
```

Unlike the Text List and SSO panes, **the User Stats tab heading is NOT gated by anything**.
`#95 path=r.0.1.1.0.1.3.0.4`, verbatim:

```
attr ng-class = "{active: active, disabled: disabled}"
attr heading  = "User Stats"
attr class    = "ng-isolate-scope"
```

— no `ng-show`, no `ng-if`, no `ng-hide` in the class list, and it is **measured** at
`rect: x=318.9 y=309 w=99.594 h=42`. So the pane's sole reveal condition is:

> **`tab.active === true`** — i.e. the admin clicks the visible "User Stats" tab; Angular then adds
> `active` to `#101`'s class list and Bootstrap's `.tab-content > .tab-pane.active { display: block }`
> reveals it.

In this capture the pane class is `"tab-pane ng-scope"` **without** `active`, so it computes
`display: none`; the active pane is index 0 ("Users", `#97`, `"tab-pane ng-scope active"`,
rect 37,361 1768×393.766).

### Inner conditions (all verbatim, all resolvable to a state in this capture)

| path | attribute (verbatim) | class in capture | resolved display | what it proves |
|---|---|---|---|---|
| `…4.0.1` (#180) | `ng-show = "statXrefs.length>0 \|\| true"` | *(no class attribute at all)* | `block` | tautology — `\|\| true` makes it unconditionally shown |
| `…4.1` (#142) | `ng-hide = "statXrefs.length>0 \|\| statXrefsMontly.length>0"` | `ng-scope` | `block` | **both arrays are empty** → the "No results" heading is the live state |
| `…4.2` (#143) | `ng-show = "loadingUsersStats"` | `ng-scope ng-hide` | `none` | `loadingUsersStats` is falsy |
| `…4.3` (#144) | `ng-show = "!loadingUsersStats && statXrefsMontly.length>0"` | `ng-scope ng-hide` | `none` | `statXrefsMontly.length === 0` |
| `…4.4` (#145) | `ng-show = "!loadingUsersStats && statXrefs.length>0"` | `table table-striped  ng-scope ng-hide` | `none` | `statXrefs.length === 0` |
| `…4.0.0.0.3` (#479) | `ng-show = "statXrefsMontly.length===0"` | `btn btn-md btn-info` | `inline-block` | consistent: monthly array empty |
| `…4.0.0.0.4` (#480) | `ng-show = "statXrefsMontly.length>0"` | `btn btn-md btn-info ng-hide` | `none` | consistent |
| `…4.0.0.0.5` (#481) | `ng-show = "statXrefsMontly.length>0"` | `btn btn-md btn-info ng-hide` | `none` | consistent |

**Honest-data reading of the capture: this room has ZERO loaded stats.** `statXrefs` and
`statXrefsMontly` are both empty arrays; `tbody` `#185` and `tbody` `#222` have **no child records**;
`<strong>` `#220` has **no text**; `<strong>` `#221` reads `0`; the wordless "No results to show."
heading is the un-hidden element. Nothing is fabricated to fill the table.

---

## 2. Path anchor + record count

* Anchor: `r.0.1.1.0.1.3.1.4`
* **Records found under the anchor (inclusive): 60** —
  `#101`, `#141`, `#142`, `#143`, `#144`, `#145`, `#179`, `#180`, `#181`, `#182`, `#183`, `#184`,
  `#185`, `#215`, `#216`, `#217`, `#218`, `#219`, `#220`, `#221`, `#222`, `#223`, `#476`, `#477`,
  `#478`, `#479`, `#480`, `#481`, `#482`, `#483`, `#484`, `#485`, `#486`, `#487`, `#488`, `#489`,
  `#490`, `#491`, `#492`, `#1336`, `#1337`, `#1338`, `#1339`, `#1340`, `#1341`, `#1342`, `#1343`,
  `#1344`, `#1345`, `#1346`, `#1347`, `#1348`, `#1643`, `#1644`, `#1645`, `#1646`, `#1647`, `#1648`,
  `#1649`, `#1650`.
* All 60 read in full, line by line (885 lines of slice). Truncation scan run over the whole slice:
  **no `attr` value ≥ 290 chars (cap 300) and no `text:` value ≥ 240 chars (cap 250) → nothing truncated.**
  The two strings containing `...` — `No results to show. Select a date above...` and `Loading...` —
  are **literal UI copy**, not truncation markers.

---

## 3. Node table (all 60 nodes)

Every rect below is literally `x=0 y=0 w=0 h=0` in the dump — see §9.

| # | path | tag | id | classes | rect | self `display:none`? |
|---|---|---|---|---|---|---|
| 101 | `…3.1.4` | `div` | — | `tab-pane` `ng-scope` | 0×0 | **yes** |
| 141 | `…4.0` | `fieldset` | — | `ng-scope` | 0×0 | no (`block`) |
| 142 | `…4.1` | `h3` | — | `ng-scope` | 0×0 | no (`block`) |
| 143 | `…4.2` | `div` | — | `ng-scope` `ng-hide` | 0×0 | **yes** |
| 144 | `…4.3` | `div` | — | `ng-scope` `ng-hide` | 0×0 | **yes** |
| 145 | `…4.4` | `table` | — | `table` `table-striped` `ng-scope` `ng-hide` | 0×0 | **yes** |
| 179 | `…4.0.0` | `div` | — | `form-group` (trailing space in attr) | 0×0 | no (`block`) |
| 180 | `…4.0.1` | `div` | — | *(no class attribute)* | 0×0 | no (`block`) |
| 181 | `…4.2.0` | `div` | `chatLogLoading` | `div` | 0×0 | no (`block`) |
| 182 | `…4.3.0` | `h4` | — | *(none)* | 0×0 | no (`block`) |
| 183 | `…4.3.1` | `table` | — | `table` `table-striped` | 0×0 | no (`table`) |
| 184 | `…4.4.0` | `thead` | — | *(none)* | 0×0 | no (`table-header-group`) |
| 185 | `…4.4.1` | `tbody` | — | *(none)* | 0×0 | no (`table-row-group`) — **0 children** |
| 215 | `…4.0.0.0` | `div` | — | `col-sm-4` `pull-left` | 0×0 | no (`block`) |
| 216 | `…4.0.1.0` | `label` | — | `col-sm-2` `control-label` (trailing space) | 0×0 | no (`block`) |
| 217 | `…4.0.1.1` | `div` | — | `col-sm-4` | 0×0 | no (`block`) |
| 218 | `…4.2.0.0` | `img` | — | *(none)* | 0×0 | no (`inline`) |
| 219 | `…4.2.0.1` | `label` | — | *(none)* | 0×0 | no (`inline-block`) |
| 220 | `…4.3.0.0` | `strong` | — | `ng-binding` | 0×0 | no (`inline`) |
| 221 | `…4.3.0.1` | `strong` | — | `ng-binding` | 0×0 | no (`inline`) |
| 222 | `…4.3.1.0` | `tbody` | — | *(none)* | 0×0 | no (`table-row-group`) — **0 children** |
| 223 | `…4.4.0.0` | `tr` | — | *(none)* | 0×0 | no (`table-row`) |
| 476 | `…4.0.0.0.0` | `div` | — | *(no attributes at all)* | 0×0 | no (`block`) |
| 477 | `…4.0.0.0.1` | `button` | — | `btn` `btn-md` `btn-info` | 0×0 | no (`inline-block`) |
| 478 | `…4.0.0.0.2` | `button` | — | `btn` `btn-md` `btn-info` | 0×0 | no (`inline-block`) |
| 479 | `…4.0.0.0.3` | `button` | — | `btn` `btn-md` `btn-info` | 0×0 | no (`inline-block`) |
| 480 | `…4.0.0.0.4` | `button` | — | `btn` `btn-md` `btn-info` `ng-hide` | 0×0 | **yes** |
| 481 | `…4.0.0.0.5` | `button` | — | `btn` `btn-md` `btn-info` `ng-hide` | 0×0 | **yes** |
| 482 | `…4.0.1.1.0` | `input` | — | `form-control` `ng-pristine` `ng-untouched` `ng-invalid` `ng-invalid-required` | 0×0 | no (`block`) |
| 483 | `…4.0.1.1.1` | `br` | — | *(none)* | 0×0 | no (`inline`) |
| 484 | `…4.0.1.1.2` | `label` | — | *(none)* | 0×0 | no (`inline-block`) |
| 485 | `…4.0.1.1.3` | `label` | — | *(none)* | 0×0 | no (`inline-block`) |
| 486 | `…4.0.1.1.4` | `label` | — | *(none)* | 0×0 | no (`inline-block`) |
| 487 | `…4.0.1.1.5` | `label` | — | *(none)* | 0×0 | no (`inline-block`) |
| 488 | `…4.4.0.0.0` | `th` | — | *(none)* | 0×0 | no (`table-cell`) |
| 489 | `…4.4.0.0.1` | `th` | — | *(none)* | 0×0 | no (`table-cell`) |
| 490 | `…4.4.0.0.2` | `th` | — | *(none)* | 0×0 | no (`table-cell`) |
| 491 | `…4.4.0.0.3` | `th` | — | *(none)* | 0×0 | no (`table-cell`) |
| 492 | `…4.4.0.0.4` | `th` | — | *(none)* | 0×0 | no (`table-cell`) |
| 1336 | `…4.0.0.0.0.0` | `p` | — | `form-control-static` | 0×0 | no (`block`) |
| 1337 | `…4.0.0.0.0.1` | `p` | — | `form-control-static` | 0×0 | no (`block`) |
| 1338 | `…4.0.0.0.1.0` | `i` | — | `fa` `fa-user-plus` | 0×0 | no (`inline-block`) |
| 1339 | `…4.0.0.0.2.0` | `i` | — | `fa` `fa-floppy-o` | 0×0 | no (`inline-block`) |
| 1340 | `…4.0.0.0.3.0` | `i` | — | `fa` `fa-users` | 0×0 | no (`inline-block`) |
| 1341 | `…4.0.0.0.4.0` | `i` | — | `fa` `fa-trash` | 0×0 | no (`inline-block`) |
| 1342 | `…4.0.0.0.5.0` | `i` | — | `fa` `fa-download` | 0×0 | no (`inline-block`) |
| 1343 | `…4.0.1.1.2.0` | `input` | — | `ng-pristine` `ng-untouched` `ng-valid` | 0×0 | no (`inline-block`) |
| 1344 | `…4.0.1.1.3.0` | `input` | — | `ng-pristine` `ng-untouched` `ng-valid` | 0×0 | no (`inline-block`) |
| 1345 | `…4.0.1.1.3.1` | `span` | — | `badge` `badge-danger` | 0×0 | no (`inline-block`) |
| 1346 | `…4.0.1.1.4.0` | `input` | — | `ng-pristine` `ng-untouched` `ng-valid` | 0×0 | no (`inline-block`) |
| 1347 | `…4.0.1.1.5.0` | `input` | — | `ng-pristine` `ng-untouched` `ng-valid` | 0×0 | no (`inline-block`) |
| 1348 | `…4.4.0.0.3.0` | `a` | — | *(none)* | 0×0 | no (`inline`) |
| 1643 | `…4.0.0.0.0.0.0` | `label` | — | `col-sm-4` `control-label` | 0×0 | no (`block`) |
| 1644 | `…4.0.0.0.0.0.1` | `a` | — | `ng-scope` `ng-binding` `editable` `editable-click` | 0×0 | no (`inline`) |
| 1645 | `…4.0.0.0.0.0.2` | `br` | — | *(none)* | 0×0 | no (`inline`) |
| 1646 | `…4.0.0.0.0.0.3` | `label` | — | `muted` | 0×0 | no (`inline-block`) |
| 1647 | `…4.0.0.0.0.1.0` | `label` | — | `col-sm-4` `control-label` | 0×0 | no (`block`) |
| 1648 | `…4.0.0.0.0.1.1` | `a` | — | `ng-scope` `ng-binding` `editable` `editable-click` | 0×0 | no (`inline`) |
| 1649 | `…4.0.0.0.0.1.2` | `br` | — | *(none)* | 0×0 | no (`inline`) |
| 1650 | `…4.0.0.0.0.1.3` | `label` | — | `muted` | 0×0 | no (`inline-block`) |

### Tree shape

```
#101  div.tab-pane.ng-scope                                    r.0.1.1.0.1.3.1.4
├── #141  fieldset.ng-scope                                    …4.0
│   ├── #179  div.form-group                                   …4.0.0
│   │   └── #215  div.col-sm-4.pull-left                       …4.0.0.0
│   │       ├── #476  div  (no attributes)                     …4.0.0.0.0   ← the DATE RANGE block
│   │       │   ├── #1336 p.form-control-static                …4.0.0.0.0.0
│   │       │   │   ├── #1643 label.col-sm-4.control-label     …4.0.0.0.0.0.0  "Start Date:"
│   │       │   │   ├── #1644 a[editable-date="statsDate"]     …4.0.0.0.0.0.1  "07-22-2026"
│   │       │   │   ├── #1645 br                               …4.0.0.0.0.0.2
│   │       │   │   └── #1646 label.muted                      …4.0.0.0.0.0.3  "Choose a start date"
│   │       │   └── #1337 p.form-control-static                …4.0.0.0.0.1
│   │       │       ├── #1647 label.col-sm-4.control-label     …4.0.0.0.0.1.0  "End Date:"
│   │       │       ├── #1648 a[editable-date="statsDateEnd"]  …4.0.0.0.0.1.1  "07-23-2026"
│   │       │       ├── #1649 br                               …4.0.0.0.0.1.2
│   │       │       └── #1650 label.muted                      …4.0.0.0.0.1.3  "Choose an end date"
│   │       ├── #477  button.btn.btn-md.btn-info               …4.0.0.0.1   "Load Stats"      > i.fa-user-plus #1338
│   │       ├── #478  button.btn.btn-md.btn-info               …4.0.0.0.2   "Export"          > i.fa-floppy-o  #1339
│   │       ├── #479  button.btn.btn-md.btn-info               …4.0.0.0.3   "Monthly report for date range" > i.fa-users #1340
│   │       ├── #480  button.btn.btn-md.btn-info.ng-hide       …4.0.0.0.4   "Clear monthly report"   > i.fa-trash    #1341
│   │       └── #481  button.btn.btn-md.btn-info.ng-hide       …4.0.0.0.5   "Download monthly report"> i.fa-download #1342
│   └── #180  div[ng-show="statXrefs.length>0 || true"]        …4.0.1
│       ├── #216  label.col-sm-2.control-label                 …4.0.1.0     "Search Users"
│       └── #217  div.col-sm-4                                 …4.0.1.1
│           ├── #482  input.form-control                       …4.0.1.1.0   (search box, empty, ng-invalid-required)
│           ├── #483  br                                       …4.0.1.1.1
│           ├── #484  label                                    …4.0.1.1.2   "Show Online Users Only"  > input[checkbox filterOnline] #1343
│           ├── #485  label                                    …4.0.1.1.3   "Show  Only?"             > input[checkbox filterFT] #1344 + span.badge.badge-danger "Free Trials" #1345
│           ├── #486  label                                    …4.0.1.1.4   "Show Mobile Only?"       > input[checkbox showMobileStat] #1346
│           └── #487  label                                    …4.0.1.1.5   "Remove duplicates?"      > input[checkbox remDupes] #1347
├── #142  h3.ng-scope[ng-hide=…]                               …4.1   "No results to show. Select a date above..."
├── #143  div.ng-scope.ng-hide[ng-show="loadingUsersStats"]    …4.2
│   └── #181  div#chatLogLoading.div                           …4.2.0
│       ├── #218  img[src="app/img/ajax_loader.gif"]           …4.2.0.0
│       └── #219  label                                        …4.2.0.1   "Loading..."
├── #144  div.ng-scope.ng-hide[ng-show=…]                      …4.3
│   ├── #182  h4                                               …4.3.0   "Monthly report:  - Total Logins:"
│   │   ├── #220  strong.ng-binding                            …4.3.0.0   (EMPTY)
│   │   └── #221  strong.ng-binding                            …4.3.0.1   "0"
│   └── #183  table.table.table-striped                        …4.3.1
│       └── #222  tbody                                        …4.3.1.0   (0 children)
└── #145  table.table.table-striped.ng-scope.ng-hide[ng-show=…] …4.4
    ├── #184  thead                                            …4.4.0
    │   └── #223  tr                                           …4.4.0.0
    │       ├── #488 th "#"                                    …4.4.0.0.0
    │       ├── #489 th "Nick"                                 …4.4.0.0.1
    │       ├── #490 th "Email / IP"                           …4.4.0.0.2
    │       ├── #491 th "Time Stamps"                          …4.4.0.0.3   > a[ng-click="reverseStatSort()"] "Reverse" #1348
    │       └── #492 th "Duration (Hours)"                      …4.4.0.0.4
    └── #185  tbody                                            …4.4.1   (0 children — NO stat rows)
```

---

## 4. Every attribute, verbatim

> Trailing/leading spaces inside attribute values are reproduced **exactly** — several are real.

```
#101  …3.1.4        class="tab-pane ng-scope"  ng-repeat="tab in tabs"  ng-class="{active: tab.active}"  tab-content-transclude="tab"
#141  …4.0          class="ng-scope"
#142  …4.1          ng-hide="statXrefs.length>0 || statXrefsMontly.length>0"   class="ng-scope"
#143  …4.2          ng-show="loadingUsersStats"                                class="ng-scope ng-hide"
#144  …4.3          ng-show="!loadingUsersStats && statXrefsMontly.length>0"   class="ng-scope ng-hide"
#145  …4.4          class="table table-striped  ng-scope ng-hide"              ng-show="!loadingUsersStats && statXrefs.length>0"
#179  …4.0.0        class="form-group "                                        ← note trailing space
#180  …4.0.1        ng-show="statXrefs.length>0 || true"                       ← NO class attribute
#181  …4.2.0        id="chatLogLoading"  style="padding: 25px; text-align: center;"  class="div"
#182  …4.3.0        (none)
#183  …4.3.1        class="table table-striped"
#184  …4.4.0        (none)
#185  …4.4.1        (none)
#215  …4.0.0.0      class="col-sm-4 pull-left"
#216  …4.0.1.0      class="col-sm-2 control-label "                            ← note trailing space
#217  …4.0.1.1      class="col-sm-4"
#218  …4.2.0.0      src="app/img/ajax_loader.gif"                              ← NO width/height attrs
#219  …4.2.0.1      (none)
#220  …4.3.0.0      class="ng-binding"
#221  …4.3.0.1      class="ng-binding"
#222  …4.3.1.0      (none)
#223  …4.4.0.0      (none)
#476  …4.0.0.0.0    (none)                                                     ← bare <div>, no attributes
#477  …4.0.0.0.1    class="btn btn-md btn-info"  ng-click="loadStats(statsDate,statsDateEnd,uSearchStat,filterFT,remDupes,showMobileStat)"
#478  …4.0.0.0.2    class="btn btn-md btn-info"  ng-click="exportStatsToCSV(statsDate)"
#479  …4.0.0.0.3    class="btn btn-md btn-info"  ng-click="loadMontlyStats(statsDate,statsDateEnd,false)"  ng-show="statXrefsMontly.length===0"
#480  …4.0.0.0.4    class="btn btn-md btn-info ng-hide"  ng-click="loadMontlyStats(statsDate,statsDateEnd,true)"   ng-show="statXrefsMontly.length>0"
#481  …4.0.0.0.5    class="btn btn-md btn-info ng-hide"  ng-click="downloadMontlyStats(statXrefsMontly)"           ng-show="statXrefsMontly.length>0"
#482  …4.0.1.1.0    type="search "   name="title "   required=" "   class="form-control  ng-pristine ng-untouched ng-invalid ng-invalid-required"   ng-model="uSearchStat "
#483  …4.0.1.1.1    (none)
#484  …4.0.1.1.2    (none)
#485  …4.0.1.1.3    (none)
#486  …4.0.1.1.4    (none)
#487  …4.0.1.1.5    (none)
#488  …4.4.0.0.0    (none)
#489  …4.4.0.0.1    (none)
#490  …4.4.0.0.2    (none)
#491  …4.4.0.0.3    (none)
#492  …4.4.0.0.4    (none)
#1336 …4.0.0.0.0.0  class="form-control-static"
#1337 …4.0.0.0.0.1  class="form-control-static"
#1338 …4.0.0.0.1.0  class="fa fa-user-plus"   aria-hidden="true"
#1339 …4.0.0.0.2.0  class="fa fa-floppy-o"    aria-hidden="true"
#1340 …4.0.0.0.3.0  class="fa fa-users"       aria-hidden="true"
#1341 …4.0.0.0.4.0  class="fa fa-trash"       aria-hidden="true"
#1342 …4.0.0.0.5.0  class="fa fa-download"    aria-hidden="true"
#1343 …4.0.1.1.2.0  type="checkbox"  ng-model="filterOnline"    class="ng-pristine ng-untouched ng-valid"
#1344 …4.0.1.1.3.0  type="checkbox"  ng-model="filterFT"        class="ng-pristine ng-untouched ng-valid"
#1345 …4.0.1.1.3.1  class="badge badge-danger"
#1346 …4.0.1.1.4.0  type="checkbox"  ng-model="showMobileStat"  class="ng-pristine ng-untouched ng-valid"
#1347 …4.0.1.1.5.0  type="checkbox"  ng-model="remDupes"        class="ng-pristine ng-untouched ng-valid"
#1348 …4.4.0.0.3.0  href=""  ng-click="reverseStatSort()"
#1643 …4.0.0.0.0.0.0  class="col-sm-4 control-label"
#1644 …4.0.0.0.0.0.1  href="#"  editable-date="statsDate"     class="ng-scope ng-binding editable editable-click"
#1645 …4.0.0.0.0.0.2  (none)
#1646 …4.0.0.0.0.0.3  class="muted"
#1647 …4.0.0.0.0.1.0  class="col-sm-4 control-label"
#1648 …4.0.0.0.0.1.1  href="#"  editable-date="statsDateEnd"  class="ng-scope ng-binding editable editable-click"
#1649 …4.0.0.0.0.1.2  (none)
#1650 …4.0.0.0.0.1.3  class="muted"
```

**Attribute-level findings (all directly citable):**
* `#482` has **four** attribute values with stray whitespace: `type="search "`, `name="title "`,
  `required=" "`, `ng-model="uSearchStat "`. `ng-model="uSearchStat "` still binds to `uSearchStat`
  (Angular trims the expression), and `#477`'s `ng-click` passes `uSearchStat` un-spaced — so the
  binding does work. The `type="search "` value is *not* a valid HTML input-type keyword; see §9.
* `#1644` / `#1648` have **no `onaftersave`** and **no `e-*` attributes** — unlike the SSO pane's
  `#1335` which does have `onaftersave="saveSessField('ssoHost')"`. The dates are scope-local only.
* `#218` (`ajax_loader.gif`) has **no `width`/`height` attributes and no CSS width/height** — a
  layout-shift source when the loader flips visible.
* The five FontAwesome `<i>` elements all carry `aria-hidden="true"`; the two in the Text List and
  Branding panes (`#206`, `#1635`) do **not**.

### Pseudo-elements captured under this anchor

```
#1338 ::before {"content":"\"\"","color":"rgb(255, 255, 255)","font-family":"FontAwesome","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}   glyph U+F234  (fa-user-plus)
#1339 ::before {…same shape…}                                                                                                                        glyph U+F0C7  (fa-floppy-o)
#1340 ::before {…same shape…}                                                                                                                        glyph U+F0C0  (fa-users)
#1341 ::before {…same shape…}                                                                                                                        glyph U+F1F8  (fa-trash)
#1342 ::before {…same shape…}                                                                                                                        glyph U+F019  (fa-download)
```
(Codepoints obtained by byte-decoding the UTF-8 in the dump, not from memory.)

---

## 5. Resolved computed style — absolute values

COMMON baseline from `DEFAULTS.txt` (applies wherever a property is not listed as a deviation):
`display:block · visibility:visible · position:static · top/right/bottom/left:auto · z-index:auto ·
float:none · box-sizing:border-box · width:auto · height:auto · min-width:0px · max-width:none ·
min-height:0px · max-height:none · margin 0px ×4 · padding 0px ×4 · border-width 0px ×4 ·
border-style none ×4 · border-color rgb(51,51,51) ×4 · radius 0px ×4 · background-color rgba(0,0,0,0) ·
color rgb(51,51,51) · font-family "Helvetica Neue", Helvetica, Arial, sans-serif · font-size 14px ·
font-weight 400 · font-style normal · line-height 20px · text-align start · white-space normal ·
vertical-align baseline · overflow visible · opacity 1 · box-shadow none · outline-color rgb(51,51,51) ·
cursor auto · pointer-events auto · user-select auto · list-style-type disc`.

| node | resolved absolute style (deviations in **bold**; everything else = COMMON above) |
|---|---|
| **#101** `div.tab-pane` | display **none** |
| **#141** `fieldset.ng-scope` | display block · margin-bottom **20px** · padding-bottom **20px** · border-bottom-width **1px** · border-bottom-style **dashed** · border-bottom-color **rgb(238, 238, 238)** · (other 3 borders 0/none/rgb(51,51,51)) |
| **#142** `h3.ng-scope` | display block · margin-top **20px** · margin-bottom **10px** · font-size **24px** · font-weight **500** · line-height **26.4px** · color rgb(51,51,51) |
| **#143** `div.ng-hide` | display **none** |
| **#144** `div.ng-hide` | display **none** |
| **#145** `table.table.table-striped.ng-hide` | display **none** · width **100%** · max-width **100%** · margin-bottom **20px** |
| **#179** `div.form-group ` | **0 deviations** → display block, margin 0px ×4 (Bootstrap's `margin-bottom:15px` is NOT present), padding 0, no border, colour rgb(51,51,51), font 400 14px/20px |
| **#180** `div[ng-show]` | **0 deviations** → display block, everything COMMON |
| **#181** `div#chatLogLoading.div` | display block · padding **25px / 25px / 25px / 25px** · text-align **center** |
| **#182** `h4` | display block · margin-top **10px** · margin-bottom **10px** · font-size **18px** · font-weight **500** · line-height **19.8px** |
| **#183** `table.table.table-striped` | display **table** · width **100%** · max-width **100%** · margin-bottom **20px** |
| **#184** `thead` | display **table-header-group** · vertical-align **middle** |
| **#185** `tbody` | display **table-row-group** · vertical-align **middle** |
| **#215** `div.col-sm-4.pull-left` | display block · position **relative** · float **left** · width **33.3333%** · min-height **1px** · padding-right **15px** · padding-left **15px** |
| **#216** `label.col-sm-2.control-label ` | display block · position **relative** · float **left** · width **16.6667%** · max-width **100%** · min-height **1px** · margin-bottom **5px** · padding-right **15px** · padding-left **15px** · font-weight **700** · cursor **default** · text-align start (NOT right — this label is not inside a `.form-horizontal`) |
| **#217** `div.col-sm-4` | display block · position **relative** · float **left** · width **33.3333%** · min-height **1px** · padding-right **15px** · padding-left **15px** |
| **#218** `img` | display **inline** · text-align **center** (inherited from #181) · vertical-align **middle** · overflow-x **clip** · overflow-y **clip** · width auto · height auto |
| **#219** `label` | display **inline-block** · max-width **100%** · margin-bottom **5px** · font-weight **700** · text-align **center** · cursor **default** |
| **#220** `strong.ng-binding` | display **inline** · font-size **18px** · font-weight **700** · line-height **19.8px** |
| **#221** `strong.ng-binding` | display **inline** · font-size **18px** · font-weight **700** · line-height **19.8px** |
| **#222** `tbody` | display **table-row-group** · vertical-align **middle** |
| **#223** `tr` | display **table-row** · vertical-align **middle** |
| **#476** `div` | **0 deviations** → display block, everything COMMON |
| **#477 / #478 / #479** `button.btn.btn-md.btn-info` (identical 29-deviation sets) | display **inline-block** · padding **6px / 12px / 6px / 12px** · border-width **1px ×4** · border-style **solid ×4** · border-color **rgb(70, 184, 218) ×4** · radius **4px ×4** · background-color **rgb(91, 192, 222)** · color **rgb(255, 255, 255)** · font 400 **14px**/20px "Helvetica Neue", Helvetica, Arial, sans-serif · text-align **center** · white-space **nowrap** · vertical-align **middle** · outline-color **rgb(255,255,255)** · opacity 1 · cursor **pointer** · user-select **none** |
| **#480 / #481** same buttons + `.ng-hide` | identical to the above except display **none** |
| **#482** `input.form-control` | display block (COMMON — not deviated) · width **100%** · height **34px** · padding **6px / 18px / 6px / 18px** · border-width **1px ×4** · border-style **solid ×4** · border-color **rgb(219, 217, 217) ×4** · radius **4px ×4** · background-color **rgb(255, 255, 255)** · color **rgb(85, 85, 85)** · font 400 14px/20px · overflow-x **clip** · overflow-y **clip** · box-shadow **rgb(0, 0, 0) 0px 0px 0px 0px** · outline-color **rgb(85,85,85)** · cursor **text** · transition-property **border-color, box-shadow** · transition-duration **0.15s, 0.15s** · appearance **auto** |
| **#483 / #1645 / #1649** `br` | display **inline** |
| **#484 / #485 / #486 / #487** `label` | display **inline-block** · max-width **100%** · margin-bottom **5px** · font-weight **700** · cursor **default** |
| **#488 … #492** `th` | display **table-cell** · padding **20px / 8px / 20px / 8px** · border-bottom-width **1px** · border-bottom-style **solid** · border-bottom-color **rgb(221, 221, 221)** · font-weight **700** · text-align **left** · vertical-align **bottom** |
| **#1336 / #1337** `p.form-control-static` | display block · min-height **34px** · padding-top **7px** · padding-bottom **7px** · margin 0px ×4 (the UA `<p>` margin is overridden to COMMON `0px`) |
| **#1338 … #1342** `i.fa.*` | display **inline-block** · border-color **rgb(255,255,255) ×4** · color **rgb(255, 255, 255)** · font-family **FontAwesome** · font-size 14px · line-height **14px** · text-align **center** · white-space **nowrap** · outline-color **rgb(255,255,255)** · cursor **pointer** · user-select **none** |
| **#1343 / #1344 / #1346 / #1347** `input[type=checkbox]` | display **inline-block** · margin-top **4px** · font-weight **700** · line-height **normal** · cursor **default** · appearance **auto** · width auto · height auto |
| **#1345** `span.badge.badge-danger` | display **inline-block** · min-width **10px** · padding **3px / 7px / 3px / 7px** · border-color **rgb(255,255,255) ×4** · radius **10px ×4** · background-color **rgb(119, 119, 119)** · color **rgb(255, 255, 255)** · font-size **12px** · font-weight **700** · line-height **12px** · text-align **center** · white-space **nowrap** · vertical-align **middle** · outline-color **rgb(255,255,255)** · cursor **default** |
| **#1348** `a` "Reverse" | display **inline** · border-color **rgb(51, 122, 183) ×4** · color **rgb(51, 122, 183)** · font-weight **700** (inherited from the `th`) · text-align **left** · outline-color **rgb(51,122,183)** · cursor **pointer** · text-decoration-line none |
| **#1643 / #1647** `label.col-sm-4.control-label` | display block · position **relative** · float **left** · width **33.3333%** · max-width **100%** · min-height **1px** · margin-bottom **5px** · padding-right **15px** · padding-left **15px** · font-weight **700** · cursor **default** · text-align start |
| **#1644 / #1648** `a.editable.editable-click` (dates) | display **inline** · border-bottom-width **1px** · border-bottom-style **dashed** · border-top/right/left-color **rgb(10, 10, 10)** · border-bottom-color **rgb(66, 139, 202)** · color **rgb(10, 10, 10)** · font-style **normal** (COMMON — these are *set*, so no `editable-empty`/italic) · outline-color **rgb(10,10,10)** · cursor **pointer** |
| **#1646 / #1650** `label.muted` | display **inline-block** · max-width **100%** · margin-bottom **5px** · font-weight **700** · cursor **default** · **color rgb(51, 51, 51)** — i.e. *identical* to body text |

### Verified orientation claims

* **`.muted` is a dead class.** `#1646` and `#1650` list **no `color` deviation**, so they resolve to
  the COMMON `rgb(51, 51, 51)` — exactly body text. Confirmed against the dump, not assumed.
* **`.badge-danger` is also a dead class here.** `#1345` resolves `background-color: rgb(119, 119, 119)`
  (= Bootstrap's stock grey `#777`), **not** a danger red. New finding of the same kind as `.muted`.
* **`.btn-md` is a no-op.** `#477`–`#481` resolve `padding: 6px 12px` and `font-size: 14px`, i.e. the
  plain `.btn` metrics; Bootstrap 3 ships `btn-lg`/`btn-sm`/`btn-xs` only.
* **No CSS custom properties, no flexbox, no grid.** `INFO.txt` reports `cssVars {"root":{},"body":{}}`;
  `DEFAULTS.txt` reports `flex 0 1 auto` / `flex-direction row` / `align-items normal` /
  `justify-content normal` / `gap normal` / `grid-template-columns none` with **2156/2156** nodes at the
  common value — i.e. *no node in the entire capture* deviates. Layout is float + table only.

---

## 6. Verbatim text (every string, with its path)

| path | node | verbatim text |
|---|---|---|
| `…4.1` | #142 `h3` | `No results to show. Select a date above...` |
| `…4.2.0.1` | #219 `label` | `Loading...` |
| `…4.3.0` | #182 `h4` | `Monthly report:  - Total Logins:` ← **two consecutive spaces**; the child `<strong>`s split it |
| `…4.3.0.0` | #220 `strong.ng-binding` | *(no `text:` line — EMPTY)* |
| `…4.3.0.1` | #221 `strong.ng-binding` | `0` |
| `…4.0.0.0.1` | #477 `button` | `Load Stats` |
| `…4.0.0.0.2` | #478 `button` | `Export` |
| `…4.0.0.0.3` | #479 `button` | `Monthly report for date range` |
| `…4.0.0.0.4` | #480 `button` | `Clear monthly report` |
| `…4.0.0.0.5` | #481 `button` | `Download monthly report` |
| `…4.0.1.0` | #216 `label` | `Search Users` |
| `…4.0.1.1.0` | #482 `input` | *(no `text:` line — the search box is EMPTY; corroborated by `ng-invalid-required`)* |
| `…4.0.1.1.2` | #484 `label` | `Show Online Users Only` |
| `…4.0.1.1.3` | #485 `label` | `Show  Only?` ← **two consecutive spaces**; the badge sits between them |
| `…4.0.1.1.3.1` | #1345 `span.badge` | `Free Trials` |
| `…4.0.1.1.4` | #486 `label` | `Show Mobile Only?` |
| `…4.0.1.1.5` | #487 `label` | `Remove duplicates?` |
| `…4.4.0.0.0` | #488 `th` | `#` |
| `…4.4.0.0.1` | #489 `th` | `Nick` |
| `…4.4.0.0.2` | #490 `th` | `Email / IP` |
| `…4.4.0.0.3` | #491 `th` | `Time Stamps` |
| `…4.4.0.0.3.0` | #1348 `a` | `Reverse` |
| `…4.4.0.0.4` | #492 `th` | `Duration (Hours)` |
| `…4.0.0.0.0.0.0` | #1643 `label` | `Start Date:` |
| **`…4.0.0.0.0.0.1`** | **#1644 `a[editable-date="statsDate"]`** | **`07-22-2026`** |
| `…4.0.0.0.0.0.3` | #1646 `label.muted` | `Choose a start date` |
| `…4.0.0.0.0.1.0` | #1647 `label` | `End Date:` |
| **`…4.0.0.0.0.1.1`** | **#1648 `a[editable-date="statsDateEnd"]`** | **`07-23-2026`** |
| `…4.0.0.0.0.1.3` | #1650 `label.muted` | `Choose an end date` |

**Truncation:** none. Verified programmatically over the whole 885-line slice — longest `attr` value is
`ng-click="loadStats(statsDate,statsDateEnd,uSearchStat,filterFT,remDupes,showMobileStat)"` at 76
chars (cap 300); longest `text:` is 42 chars (cap 250). The trailing `...` in two strings is literal copy.

**Date-range reading (real data, not fabricated):** the capture is timestamped
`2026-07-24T15:59:18.276Z` and the range reads **`07-22-2026` → `07-23-2026`** in `MM-DD-YYYY` form —
i.e. the two days immediately before the capture. Both x-editables lack the `editable-empty` class and
render in `font-style: normal`, confirming they are genuinely *set*, not placeholders.

---

## 7. Field / control inventory

### x-editables (2)

| control | path | element | label | `editable-*` type | binds | `onaftersave` | captured value |
|---|---|---|---|---|---|---|---|
| Start Date | `…4.0.0.0.0.0.1` | `<a href="#">` | `Start Date:` (#1643) + helper `Choose a start date` (#1646, `.muted`) | **`editable-date`** | **`statsDate`** (scope-local; **not** a `sess.*` field) | **none — attribute absent** | **`07-22-2026`** |
| End Date | `…4.0.0.0.0.1.1` | `<a href="#">` | `End Date:` (#1647) + helper `Choose an end date` (#1650, `.muted`) | **`editable-date`** | **`statsDateEnd`** (scope-local) | **none — attribute absent** | **`07-23-2026`** |

Neither is `editable-empty`, so the literal italic word `empty` does **not** appear in this pane.
(That state is visible in the SSO pane — see P19 #1335.)

### Text input (1)

| control | path | type | name | required | binds | value |
|---|---|---|---|---|---|---|
| Search Users | `…4.0.1.1.0` | `type="search "` *(verbatim, trailing space)* | `name="title "` *(verbatim, trailing space)* | `required=" "` present | `ng-model="uSearchStat "` | **empty** — no `text:`/`value` in the record; classes `ng-pristine ng-untouched ng-invalid ng-invalid-required` prove untouched + failing `required` |

### Checkboxes (4)

| control | path | binds | label text | current value |
|---|---|---|---|---|
| Show Online Users Only | `…4.0.1.1.2.0` | `filterOnline` | `Show Online Users Only` (#484) | **unchecked** — `ng-pristine ng-untouched ng-valid`, no `checked` attribute |
| Show *Free Trials* Only? | `…4.0.1.1.3.0` | `filterFT` | `Show ` + `<span class="badge badge-danger">Free Trials</span>` + ` Only?` (#485/#1345) | **unchecked** |
| Show Mobile Only? | `…4.0.1.1.4.0` | `showMobileStat` | `Show Mobile Only?` (#486) | **unchecked** |
| Remove duplicates? | `…4.0.1.1.5.0` | `remDupes` | `Remove duplicates?` (#487) | **unchecked** |

**Cross-check:** `filterOnline` is the **only** one of the four that `loadStats(...)` does **not**
receive — `#477`'s handler is `loadStats(statsDate,statsDateEnd,uSearchStat,filterFT,remDupes,showMobileStat)`.
That is a hard, citable asymmetry in the captured markup.

### Buttons (5) + 1 link

| control | path | classes | handler (`ng-click`, verbatim) | icon | visible in capture |
|---|---|---|---|---|---|
| Load Stats | `…4.0.0.0.1` | `btn btn-md btn-info` | `loadStats(statsDate,statsDateEnd,uSearchStat,filterFT,remDupes,showMobileStat)` | `fa fa-user-plus` U+F234 | yes (`inline-block`) |
| Export | `…4.0.0.0.2` | `btn btn-md btn-info` | `exportStatsToCSV(statsDate)` — note: **only** the start date is passed | `fa fa-floppy-o` U+F0C7 | yes |
| Monthly report for date range | `…4.0.0.0.3` | `btn btn-md btn-info` | `loadMontlyStats(statsDate,statsDateEnd,false)` | `fa fa-users` U+F0C0 | yes |
| Clear monthly report | `…4.0.0.0.4` | `btn btn-md btn-info ng-hide` | `loadMontlyStats(statsDate,statsDateEnd,true)` | `fa fa-trash` U+F1F8 | **no** (`display:none`) |
| Download monthly report | `…4.0.0.0.5` | `btn btn-md btn-info ng-hide` | `downloadMontlyStats(statXrefsMontly)` | `fa fa-download` U+F019 | **no** (`display:none`) |
| Reverse (sort link) | `…4.4.0.0.3.0` | *(none)* | `reverseStatSort()` · `href=""` | — | inside the hidden results table |

*(App's own spelling preserved: `loadMontlyStats`, `downloadMontlyStats`, `statXrefsMontly` — "Montly", no `h`.)*

### Results table columns (5)

`#` · `Nick` · `Email / IP` · `Time Stamps` (+ inline `Reverse` link) · `Duration (Hours)`.
`tbody` `#185` has **zero** child records → **no rows to report. No rows are invented here.**

### Selects / radios / file inputs

**Zero.** No `<select>`, no `type="radio"`, no `type="file"` anywhere under this anchor.

---

## 8. Rebuild spec

### HTML (reconstructed strictly from the captured paths, attributes and text)

```html
<!-- r.0.1.1.0.1.3.1.4 — 5th child of div.tab-content -->
<div class="tab-pane ng-scope" ng-repeat="tab in tabs"
     ng-class="{active: tab.active}" tab-content-transclude="tab">

  <fieldset class="ng-scope">                                      <!-- …4.0 -->

    <div class="form-group ">                                      <!-- …4.0.0 -->
      <div class="col-sm-4 pull-left">                             <!-- …4.0.0.0 -->

        <div>                                                      <!-- …4.0.0.0.0  DATE RANGE -->
          <p class="form-control-static">                          <!-- …4.0.0.0.0.0 -->
            <label class="col-sm-4 control-label">Start Date:</label>
            <a href="#" editable-date="statsDate"
               class="ng-scope ng-binding editable editable-click">07-22-2026</a>
            <br>
            <label class="muted">Choose a start date</label>
          </p>
          <p class="form-control-static">                          <!-- …4.0.0.0.0.1 -->
            <label class="col-sm-4 control-label">End Date:</label>
            <a href="#" editable-date="statsDateEnd"
               class="ng-scope ng-binding editable editable-click">07-23-2026</a>
            <br>
            <label class="muted">Choose an end date</label>
          </p>
        </div>

        <button class="btn btn-md btn-info"
                ng-click="loadStats(statsDate,statsDateEnd,uSearchStat,filterFT,remDupes,showMobileStat)">
          <i class="fa fa-user-plus" aria-hidden="true"></i> Load Stats</button>
        <button class="btn btn-md btn-info" ng-click="exportStatsToCSV(statsDate)">
          <i class="fa fa-floppy-o" aria-hidden="true"></i> Export</button>
        <button class="btn btn-md btn-info"
                ng-click="loadMontlyStats(statsDate,statsDateEnd,false)"
                ng-show="statXrefsMontly.length===0">
          <i class="fa fa-users" aria-hidden="true"></i> Monthly report for date range</button>
        <button class="btn btn-md btn-info ng-hide"
                ng-click="loadMontlyStats(statsDate,statsDateEnd,true)"
                ng-show="statXrefsMontly.length>0">
          <i class="fa fa-trash" aria-hidden="true"></i> Clear monthly report</button>
        <button class="btn btn-md btn-info ng-hide"
                ng-click="downloadMontlyStats(statXrefsMontly)"
                ng-show="statXrefsMontly.length>0">
          <i class="fa fa-download" aria-hidden="true"></i> Download monthly report</button>
      </div>
    </div>

    <div ng-show="statXrefs.length>0 || true">                     <!-- …4.0.1 -->
      <label class="col-sm-2 control-label ">Search Users</label>
      <div class="col-sm-4">
        <input type="search " name="title " required=" "
               class="form-control  ng-pristine ng-untouched ng-invalid ng-invalid-required"
               ng-model="uSearchStat ">
        <br>
        <label><input type="checkbox" ng-model="filterOnline"
                      class="ng-pristine ng-untouched ng-valid"> Show Online Users Only</label>
        <label><input type="checkbox" ng-model="filterFT"
                      class="ng-pristine ng-untouched ng-valid"> Show
               <span class="badge badge-danger">Free Trials</span> Only?</label>
        <label><input type="checkbox" ng-model="showMobileStat"
                      class="ng-pristine ng-untouched ng-valid"> Show Mobile Only?</label>
        <label><input type="checkbox" ng-model="remDupes"
                      class="ng-pristine ng-untouched ng-valid"> Remove duplicates?</label>
      </div>
    </div>
  </fieldset>

  <h3 ng-hide="statXrefs.length>0 || statXrefsMontly.length>0"
      class="ng-scope">No results to show. Select a date above...</h3>          <!-- …4.1 -->

  <div ng-show="loadingUsersStats" class="ng-scope ng-hide">                     <!-- …4.2 -->
    <div id="chatLogLoading" style="padding: 25px; text-align: center;" class="div">
      <img src="app/img/ajax_loader.gif">
      <label>Loading...</label>
    </div>
  </div>

  <div ng-show="!loadingUsersStats && statXrefsMontly.length>0"
       class="ng-scope ng-hide">                                                 <!-- …4.3 -->
    <h4>Monthly report: <strong class="ng-binding"></strong>
        - Total Logins:<strong class="ng-binding">0</strong></h4>
    <table class="table table-striped"><tbody></tbody></table>
  </div>

  <table class="table table-striped  ng-scope ng-hide"                           <!-- …4.4 -->
         ng-show="!loadingUsersStats && statXrefs.length>0">
    <thead>
      <tr>
        <th>#</th><th>Nick</th><th>Email / IP</th>
        <th>Time Stamps <a href="" ng-click="reverseStatSort()">Reverse</a></th>
        <th>Duration (Hours)</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>
</div>
```

### CSS — resolved absolute declarations (captured computed values only)

```css
.tab-content > .tab-pane        { display: none; }
.tab-content > .tab-pane.active { display: block; }
.ng-hide                        { display: none !important; }

fieldset.ng-scope { margin-bottom: 20px; padding-bottom: 20px;
                    border-bottom: 1px dashed rgb(238, 238, 238); }

h3 { margin: 20px 0 10px; font-size: 24px; font-weight: 500; line-height: 26.4px;
     color: rgb(51, 51, 51); }
h4 { margin: 10px 0;      font-size: 18px; font-weight: 500; line-height: 19.8px; }
h4 > strong { display: inline; font-size: 18px; font-weight: 700; line-height: 19.8px; }

.form-group { margin: 0; }                       /* captured: 0 deviations on #179 */
.col-sm-4 { position: relative; float: left; width: 33.3333%; min-height: 1px; padding: 0 15px; }
.col-sm-2.control-label { position: relative; float: left; width: 16.6667%; max-width: 100%;
     min-height: 1px; margin-bottom: 5px; padding: 0 15px; font-weight: 700; cursor: default; }
.col-sm-4.control-label { position: relative; float: left; width: 33.3333%; max-width: 100%;
     min-height: 1px; margin-bottom: 5px; padding: 0 15px; font-weight: 700; cursor: default; }
.pull-left { float: left; }

.form-control-static { min-height: 34px; margin: 0; padding: 7px 0; }

a.editable.editable-click {                       /* the two dates */
  display: inline; border-bottom: 1px dashed rgb(66, 139, 202);
  color: rgb(10, 10, 10); font-style: normal; text-decoration: none; cursor: pointer; }

label.muted { display: inline-block; max-width: 100%; margin-bottom: 5px;
  font-weight: 700; color: rgb(51, 51, 51); cursor: default; }   /* .muted changes NOTHING */

.btn.btn-md.btn-info {
  display: inline-block; padding: 6px 12px;
  border: 1px solid rgb(70, 184, 218); border-radius: 4px;
  background-color: rgb(91, 192, 222); color: rgb(255, 255, 255);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  text-align: center; white-space: nowrap; vertical-align: middle;
  cursor: pointer; -webkit-user-select: none; user-select: none; }
.btn .fa { display: inline-block; font-family: FontAwesome; font-size: 14px; line-height: 14px;
  color: rgb(255,255,255); text-align: center; white-space: nowrap; cursor: pointer;
  -webkit-user-select: none; user-select: none; }
.fa-user-plus::before { content: "\f234"; }
.fa-floppy-o::before  { content: "\f0c7"; }
.fa-users::before     { content: "\f0c0"; }
.fa-trash::before     { content: "\f1f8"; }
.fa-download::before  { content: "\f019"; }

.form-control {                                    /* app-overridden Bootstrap field */
  display: block; width: 100%; height: 34px; padding: 6px 18px;   /* NOT the stock 6px 12px */
  border: 1px solid rgb(219, 217, 217); border-radius: 4px;       /* NOT the stock #ccc */
  background-color: rgb(255, 255, 255); color: rgb(85, 85, 85);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  overflow: clip; box-shadow: rgb(0,0,0) 0 0 0 0; cursor: text;
  transition: border-color .15s, box-shadow .15s; -webkit-appearance: auto; appearance: auto; }

input[type="checkbox"] { display: inline-block; margin-top: 4px; font-weight: 700;
  line-height: normal; cursor: default; -webkit-appearance: auto; appearance: auto; }

.badge { display: inline-block; min-width: 10px; padding: 3px 7px; border-radius: 10px;
  background-color: rgb(119, 119, 119);            /* .badge-danger does NOT change this */
  color: rgb(255, 255, 255); font-size: 12px; font-weight: 700; line-height: 12px;
  text-align: center; white-space: nowrap; vertical-align: middle; cursor: default; }

.table { display: table; width: 100%; max-width: 100%; margin-bottom: 20px; }
.table > thead { display: table-header-group; vertical-align: middle; }
.table > tbody { display: table-row-group;    vertical-align: middle; }
.table > thead > tr { display: table-row; vertical-align: middle; }
.table > thead > tr > th { display: table-cell; padding: 20px 8px;     /* NOT the stock 8px */
  border-bottom: 1px solid rgb(221, 221, 221);
  font-weight: 700; text-align: left; vertical-align: bottom; }
.table > thead > tr > th a { display: inline; color: rgb(51, 122, 183); font-weight: 700;
  text-decoration: none; cursor: pointer; }

#chatLogLoading { padding: 25px; text-align: center; }
#chatLogLoading img   { display: inline; vertical-align: middle; overflow: clip; }
#chatLogLoading label { display: inline-block; max-width: 100%; margin-bottom: 5px;
  font-weight: 700; text-align: center; cursor: default; }
```

### Geometry — measured vs CSS-derived

| dimension | source | value |
|---|---|---|
| every node in this pane: x, y, w, h | **NOT measured** | `0,0 0×0` — the pane was never laid out |
| pane content width when active | **measured on the sibling active pane #97** | **1768px** at this 1842×1265 dpr2 viewport |
| `.tab-content` box | **measured (#61)** | x=16 y=351 w=1810 h=434.766, `padding: 10px 20px`, `border: 0 1px 1px` solid `rgb(230, 233, 238)` |
| `.col-sm-4.pull-left` (#215) | **CSS-derived** | 33.3333% of 1768px = 589.33px incl. 15px L/R padding |
| `label.col-sm-2` (#216) | **CSS-derived** | 16.6667% of 1768px = 294.67px |
| `div.col-sm-4` (#217) | **CSS-derived** | 33.3333% of 1768px = 589.33px |
| search input | **CSS-derived** | `width: 100%` of the 589.33px column minus 30px padding = 559.33px; `height: 34px` |
| both tables | **CSS-derived** | `width: 100%` / `max-width: 100%` of the 1768px pane |
| `th` row height | **CSS-derived** | `20px` line-height + `20px` top + `20px` bottom padding + `1px` bottom border ≈ **61px** |
| `fieldset` bottom rule | **CSS-derived** | `1px dashed rgb(238,238,238)`, sitting 20px below its content, then 20px margin |
| `ajax_loader.gif` intrinsic size | **NOT determinable** | no width/height attribute, no CSS size, and the binary is not in the capture |
| `h3` "No results" block height | **CSS-derived** | `line-height: 26.4px` + `margin: 20px 0 10px` |

---

## 9. Honest gaps

1. **This pane was never laid out.** All 60 records report `rect: x=0 y=0 w=0 h=0` — the direct
   consequence of `#101` computing `display: none` because `tab.active` is false for this tab (the
   heading `<li>` #95 *is* visible and measured, so nothing else is gating it). **No pixel geometry for
   the pane exists in this capture and none is invented.** Every §8 dimension is labelled
   measured-vs-CSS-derived.
2. **No stats rows exist to decode.** `tbody` `#185` (results) and `tbody` `#222` (monthly) both have
   **zero child records**, and `#220` is textless. The ng-repeat template for a stat row is therefore
   **completely unknown** — the 5 `th` headers are the only column evidence. **No sample rows,
   nicknames, emails, IPs, timestamps or durations are fabricated here.**
3. **`type="search "` (trailing space) — effective input type unresolved.** The literal attribute value
   is not a valid HTML input-type keyword, so a browser would fall back to `text`; but this is a
   spec-derived expectation, **not** something the dump measures. The computed style
   (`appearance: auto`) is identical for both, so the capture cannot disambiguate. Flagged, not asserted.
4. **Text-node ordering inside elements is not captured.** For each button the dump gives a `text:`
   string and a child `<i>`, but not whether the text precedes or follows the icon; §8 renders
   icon-first, matching every other icon+label button in this capture. Likewise the exact split points
   of `Monthly report:  - Total Logins:` around its two `<strong>`s and of `Show  Only?` around the
   badge are **derived from the double-space in the concatenated text**, which is strong but indirect.
5. **`ajax_loader.gif` is a URL only.** `src="app/img/ajax_loader.gif"` — the image itself, its
   dimensions and its frame content are not in the capture.
6. **`statsDate` / `statsDateEnd` have no `onaftersave`**, so where (or whether) the chosen range is
   persisted is not determinable from the DOM; the controller code is not in the capture.
7. **x-editable's date-picker popover is absent.** angular-xeditable builds it lazily on click; since
   the pane never rendered, there is no `.editable-container` under this anchor to decode — so the
   picker's own markup, its `uib-datepicker` options and its format string are **honest gaps**.
   The display format is observable only from the two rendered values (`MM-DD-YYYY`).
8. **Hover / focus / checked states not captured** — one resting computed style per node.
9. **`statXrefs` / `statXrefsMontly` shapes unknown.** Their emptiness is proven; their field names
   beyond the 5 column headers are not.
