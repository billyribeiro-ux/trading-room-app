# Day Trade Alerts — decoded, implementation-ready

Decoded 2026-08-15 from the **current v4** build. Every claim below carries a byte offset into
`apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js` (2,891,205 bytes) or the exact matched
string. Nothing here is inferred. Where the evidence is silent, it is listed in
[§5 Still to decode](#5-still-to-decode) instead of being filled in.

The sibling document `docs/decoded/swing-alerts.md` describes Swing Trade Alerts.
[§3](#3-how-it-differs-from-swing) is the delta between the two, decoded from both regions.

---

## 0. What was read

### Files

| file | bytes | outcome |
| --- | --- | --- |
| `apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js` | 2,891,205 | all Day Trade and Swing regions read (below) |
| `apps/room/docs/source-v4-2026-08-15/styles.ee2a710065b60389.css` | 444,793 | searched for `day-trade`, `dayTrade`, `swing`, `uploaded-img-preview`, `uploaded-alert-image`, `alert-sender-img`, `trade-alerts-select`, `img-upload-btn`, `remove-image-btn`, `download-day-trades`, `download-swing-trades` — **0 hits for every one**. The Day Trade styles are component-inlined in the JS bundle, not in the global stylesheet. |
| `apps/room/docs/source-v4-2026-08-15/deployed-index.html` | 16,094 | searched for `dayTrade`, `DayTrade`, `swing`, `Swing` — **0 hits**. No Day Trade markup is server-rendered. |
| `docs/decoded/swing-alerts.md` | 6,671 | read in full as the shape reference |

### Byte ranges read in `main.d1d09071be31f1ba.js`

`979368–982368`, `1007506–1010706`, `1016432–1019600`, `1914800–1915450`, `1915400–1918600`,
`1933200–1936300`, `1936280–1938810`, `1938800–1942200`, `1942200–1945900`, `1953900–1956300`,
`1981800–1982260`, `1982200–1985460`, `1985400–1989400`, `1989380–1991400`, `1991400–1994300`,
`1994264–2014221` (the `consts:` array, parsed to all 292 elements), `2014700–2015500`,
`2016300–2018200`, `2021400–2022260`, `2022200–2024300`, `2024300–2027100`, `2027050–2029200`,
`2031380–2031720`, `2139000–2139500`.

**Coverage proof.** Every byte offset in the bundle matching any of `dayTrade`, `DayTrade`,
`Day Trade`, `day-trade`, `DayTradeLog` — **230 distinct offsets** — falls inside one of the ranges
above. Uncovered count: **0**. The same check for `swing`, `Swing`, `swingAlert`, `SwingLog` —
**239 distinct offsets** — is also fully covered, uncovered count **0**. The §3 comparison is
therefore built on both features read end to end, not on sampled hits.

### Const indices resolved

Every const index cited in this document was resolved from the component's `consts:` array, which
begins at byte **1994264** (`consts:` keyword at 1994257) and ends at byte **2014221**; it holds
**292** top-level tuples. Tuple encoding: a leading `1` starts the class list, a `3` starts the
bound-property/event list, and leading string pairs are literal attributes.

**Appendix A** at the end of this document lists the raw tuple for every const index cited anywhere
here, Day Trade and Swing side alike. No index is left as a bare number.

---

## 1. The feature, fully decoded

### 1.1 Where the tab lives, and what gates it

**The tab button** is template function `JCe`, byte **1917906**:

```js
function JCe(t,n){if(1&t){const e=Y();
  d(0,"li",31),x("click",function(){return D(e),E(g().onMainTabChange("presAreaTabs-dayTradeAlerts"))}),
  d(1,"a",65)(2,"div",12)(3,"div"),T(4,"i",64),d(5,"span",14),v(6,"Day Trades"),u()()()()()}
 if(2&t){const e=g();m(),z("ngClass",ct(1,mo,"presAreaTabs-dayTradeAlerts"==e.selectedMainTab))}}
```

The tab's visible label is the string `"Day Trades"` at byte **1918110** — **verbatim, no surrounding
spaces**. The tab key passed to `onMainTabChange` is `"presAreaTabs-dayTradeAlerts"` (byte 1918013).

Consts used, resolved:

| idx | tuple, verbatim from the consts array | renders as |
| --- | --- | --- |
| 31 | `["role","presentation",1,"nav-item",3,"click"]` | `<li role="presentation" class="nav-item" (click)=…>` |
| 65 | `["id","dayTradeAlerts-tab","data-bs-toggle","tab","data-bs-target","#dayTradeAlerts","role","tab","aria-controls","dayTradeAlerts","aria-selected","true",1,"nav-link",3,"ngClass"]` | the `<a>` |
| 12 | `[1,"d-flex","align-items-center"]` | inner `<div>` |
| 64 | `[1,"fas","fa-bell"]` | the icon |
| 14 | `[1,"mx-1"]` | the label `<span>` |

`mo` is defined at the module level, byte **1916345**, as `mo=t=>({active:t})`, so the `<a>` gets `class="nav-link"` plus `active` when
`selectedMainTab === "presAreaTabs-dayTradeAlerts"`.

**Both the tab and the pane are gated on one flag.** In the host template's update block:

- byte **2016944**: `O(27,o.hasDayTradeAlerts?27:-1)` — controls slot 27, which is
  `(27,JCe,7,3,"li",16)` at byte **2014873** — a chained `H(...)` call, the tab `<li>`. Const **16** is
  `["role","presentation",1,"nav-item"]`.
- byte **2017741**: `O(49,o.hasDayTradeAlerts?49:-1)` — controls slot 49, which is
  `(49,Iwe,11,7,"div",28)` at byte **2015328** — a chained `H(...)` call, the tab pane.

`hasDayTradeAlerts` is assigned once, in `ngOnInit`, byte **1955962**:

```js
this.hasDayTradeAlerts=this.appService.globals.sessData.hasDayTradeAlerts
```

Its field initialiser is `this.hasDayTradeAlerts=!1` (byte **1955368**). So the source of truth is
the server-supplied session setting **`sessData.hasDayTradeAlerts`**. There is no presenter check on
the tab itself.

### 1.2 The tab pane container

Template function `Iwe`, byte **1945126**:

```js
function Iwe(t,n){if(1&t){const e=Y();
  d(0,"div",28),
    H(1,Ewe,40,11,"form",220),
    d(2,"div",221)(3,"h4",166),v(4," Latest Day Trade Alerts (Last "),
      d(5,"select",167),
        Ve("ngModelChange",function(o){D(e);const s=g();return He(s.dayTradeAlertMonths,o)||(s.dayTradeAlertMonths=o),E(o)}),
        x("ngModelChange",function(){return D(e),E(g().onTradeAlertWeeksChange("DayTrade"))}),
        ht(6,kwe,2,2,"option",168,Li),
      u(),v(8," Months) "),
    u(),
    H(9,xwe,2,0,"h4",169)(10,Rwe,36,8),
  u()()}
 if(2&t){const e=g();
  z("ngClass",ct(4,Hr,"presAreaTabs-dayTradeAlerts"==e.selectedMainTab)),
  m(),O(1,e.isP?1:-1),
  m(4),je("ngModel",e.dayTradeAlertMonths),
  m(),pt(To(6,WCe)),
  m(3),O(9,e.appService.globals.dayTradeAlertsLog&&0===e.appService.globals.dayTradeAlertsLog.length?9:10)}}
```

| idx | tuple | note |
| --- | --- | --- |
| 28 | `["id","dayTradeAlerts","role","tabpanel","aria-labelledby","dayTradeAlerts-tab",1,"tab-pane","position-relative",3,"ngClass"]` | the pane |
| 220 | `[1,"m-2","mx-auto","day-trade-alert-form"]` | the `<form>` placeholder tuple used by `H(...)` |
| 221 | `[1,"day-trade-alerts-container","m-2"]` | the list container |
| 166 | `[1,"text-center","m-0","p-1","px-3"]` | the `<h4>` heading |
| 167 | `[1,"form-select","form-select-sm","d-inline-block","w-auto","trade-alerts-select",3,"ngModelChange","ngModel"]` | the months `<select>` |
| 168 | `[3,"ngValue"]` | the `<option>` |
| 169 | `[1,"text-center","m-0","p-1","px-3","bg-secondary"]` | the empty-state `<h4>` |

`Hr` is defined at byte **1916418** as `Hr=t=>({"show active":t})`, so the pane carries `show active`
when selected.

**Heading text, verbatim including spaces:** `" Latest Day Trade Alerts (Last "` (byte **1945235**)
then the `<select>` then `" Months) "`.

**The form is presenter-gated:** `O(1,e.isP?1:-1)`. `isP` is assigned in the constructor at byte
**1954051** as `this.isP=this.appService.globals.isPresenter`. Non-presenters get the list and the
controls but no form.

**Empty state** — `xwe`, byte **1942630**:

```js
function xwe(t,n){1&t&&(d(0,"h4",169),v(1," No Day Trade Alerts to display. "),u())}
```

Verbatim, **with one leading and one trailing space**: `" No Day Trade Alerts to display. "`
(byte **1942672**). Shown when `dayTradeAlertsLog` is truthy and `length === 0`; otherwise `Rwe`
renders.

### 1.3 The months `<select>` and its options

Option template `kwe`, byte **1942524**:

```js
function kwe(t,n){if(1&t&&(d(0,"option",168),v(1),u()),2&t){const e=n.$implicit;z("ngValue",e),m(),Ze(e)}}
```

The repeat source is `To(6,WCe)`, and `WCe` is defined at byte **1916648**:

```js
WCe=()=>[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]
```

So the Day Trade dropdown offers **1 through 15**. Bound with `[ngValue]` (number, not string) and
the option text is the same number. The track function is `Li`, defined at byte **100136** as
`function Li(t,n){return n}` — identity tracking on the item.

Initial value: `this.dayTradeAlertMonths=1` (byte **1955601**).

**Changing it re-queries the server.** `onTradeAlertWeeksChange`, byte **1993565**:

```js
onTradeAlertWeeksChange(e){
  const i="Swing"===e?30*this.swingAlertMonths:4*this.dayTradeAlertMonths*7;
  this.appService.globals["Swing"===e?"swingAlertsLog":"dayTradeAlertsLog"]=[];
  let s=this.appService.globals.sessData[`linkedRoom${e}AlertsOther`];
  s=s?.trim(),
  this.appService.sendServerCommand(`get${e}AlertsLog`,{sessionID:s||this.appService.globals.sessionID,days:i})
}
```

For `"DayTrade"` the day count is `4 * dayTradeAlertMonths * 7` (byte **1993637**), i.e. 28 days per
selected unit — the label reads `Months` but the arithmetic is 4 weeks. Range at the bounds: 1 → 28
days, 15 → 420 days. The log array is emptied before the request is sent. The linked-room key read
is **`sessData.linkedRoomDayTradeAlertsOther`** (built by the template literal at byte 1993783).

### 1.4 The form — `Ewe`

Template function `Ewe`, byte **1940236**. Root:

```js
d(0,"form",222,0),x("ngSubmit",function(){return D(e),E(g(2).onDayTradeAlertSubmit())})
```

- const **222** = `[1,"m-2","mx-auto","day-trade-alert-form",3,"ngSubmit"]`
- the trailing `0` is the local-ref const, index **0** = `["alertForm","ngForm"]` — the form exposes
  a template reference variable named `alertForm` bound to `ngForm`.

Each of the first four fields is `d(n,"div",171)` → `d(n+1,"span",172)` label → `d(n+2,"input",…)`.

- const **171** = `[1,"form-group","input-group","mb-1"]`
- const **172** = `[1,"input-group-text","bg-secondary","border-secondary","text-white"]`

| # | label text (verbatim) | input const | attributes, verbatim from the const tuple | ngModel path |
| --- | --- | --- | --- | --- |
| 1 | `Symbol` | 223 | `type="text" id="dayTradeAlert-symbol" placeholder="AAPL" minlength="1" name="dayTradeAlert-symbol" required class="form-control"` | `dayTradeAlert.symbol` |
| 2 | `Entry Price` | 224 | `type="text" id="dayTradeAlert-entryPrice" placeholder="123.57" minlength="1" name="dayTradeAlert-entryPrice" required class="form-control"` | `dayTradeAlert.entryPrice` |
| 3 | `Stop` | 225 | `type="text" id="dayTradeAlert-stop" placeholder="120.40" minlength="1" name="dayTradeAlert-stop" required class="form-control"` | `dayTradeAlert.stop` |
| 4 | `Target` | 226 | `type="text" id="dayTradeAlert-target" placeholder="138.75" minlength="1" name="dayTradeAlert-target" required class="form-control"` | `dayTradeAlert.target` |
| 5 | *(no label span)* | 227 | `type="text" id="dayTradeAlert-image" placeholder="Upload Image or Paste Image Link / Screenshot (optional)" minlength="1" name="dayTradeAlert-image" class="form-control"` — **no `required`** | `dayTradeAlert.image` |

The `required` attribute is encoded in the tuples as the pair `"required",""` (an empty-string
attribute value). Placeholders are reproduced above character for character from the tuples at consts
223–227.

**All five are `type="text"`.** Entry price, stop and target are text inputs, not `type="number"`.

The image field sits in its own `d(18,"div",171)` group with a leading conditional pair and a
trailing conditional:

```js
d(18,"div",171),
  H(19,ywe,2,2,"span",177)(20,Fwe,3,0),
  d(21,"input",227),
    x("paste",function(o){return D(e),E(g(2).onImagePaste(o,"dayTrade"))}),
    Ve("ngModelChange",…dayTradeAlert.image…),
  u(),
  H(22,Cwe,2,0,"span",179),
u()
```

Update block: `O(19,e.dayTradeAlert.image?19:20)` and `O(22,e.dayTradeAlert.image?22:-1)`.

- **`ywe`** (byte **1939468**) — shown when `image` is set. `d(0,"span",191)` with click
  `showImagePreview(dayTradeAlert.image)`, containing `T(1,"img",192)` bound
  `z("src",e.dayTradeAlert.image,Mt)("alt",e.dayTradeAlert.image)`.
  - const **191** = `["title","Click to view image",1,"input-group-text","bg-secondary","border-secondary","text-white","text-center","p-0","d-block",3,"click"]`
  - const **192** = `[1,"d-inline-block","uploaded-img-preview",3,"src","alt"]`
- **`Fwe`** (byte **1939723**) — shown when `image` is empty. `d(0,"span",193)` with click
  `imgUpload("dayTrade")` (byte **1939817**), `T(1,"i",194)`, then the text node `v(2," Image ")` —
  verbatim `" Image "`, one leading and one trailing space.
  - const **193** = `["title","Upload Image",1,"input-group-text","bg-secondary","border-secondary","text-white","img-upload-btn",3,"click"]`
  - const **194** = `[1,"fas","fa-image","me-1"]`
- **`Cwe`** (byte **1939875**) — shown only when `image` is set. `d(0,"span",195)` with click
  `removeImageDayTrade()` (byte **1939969**), `T(1,"i",92)`.
  - const **195** = `["title","Remove Image",1,"input-group-text","bg-danger","border-danger","text-white","remove-image-btn",3,"click"]`
  - const **92** = `[1,"fas","fa-times"]`
- const **177** (the `H(19,…)` placeholder tuple) = `["title","Click to view image",1,"input-group-text","bg-secondary","border-secondary","text-white","text-center","p-0","d-block"]`
- const **179** (the `H(22,…)` placeholder tuple) = `["title","Remove Image",1,"input-group-text","bg-danger","border-danger","text-white","remove-image-btn"]`

`Mt` is the Angular URL sanitizer — `function Mt(t){const n=ah();return n?n.sanitize(Zo.URL,t)||"":…}`
at byte **48845**. Both `<img src>` bindings go through `SecurityContext.URL`.

#### Direction radios

```js
d(23,"div",180)(24,"div",181)(25,"div",182)
  (26,"input",228) …ngModel dayTradeAlert.direction…
  d(27,"label",229),v(28," Long "),u()
u(),
d(29,"div",185)
  (30,"input",230) …ngModel dayTradeAlert.direction…
  d(31,"label",231),v(32," Short "),u()
u()()
```

| idx | tuple |
| --- | --- |
| 180 | `[1,"d-flex","align-items-center","justify-content-between","flex-wrap"]` |
| 181 | `[1,"form-group","mb-0","ms-1"]` |
| 182 | `[1,"form-check","form-check-inline","ms-2"]` |
| 185 | `[1,"form-check","form-check-inline"]` |
| 228 | `["type","radio","name","dayTradeAlert-direction","id","dayTradeAlert-long","value","long","required","",1,"form-check-input",3,"ngModelChange","ngModel"]` |
| 229 | `["for","dayTradeAlert-long",1,"form-check-label","text-success","font-weight-bold"]` |
| 230 | `["type","radio","name","dayTradeAlert-direction","id","dayTradeAlert-short","value","short","required","",1,"form-check-input",3,"ngModelChange","ngModel"]` |
| 231 | `["for","dayTradeAlert-short",1,"form-check-label","text-danger","font-weight-bold"]` |

Label texts, verbatim with surrounding spaces: `" Long "` and `" Short "`. Note the asymmetry that is
in the source: the **Long** wrapper (const 182) carries an extra `ms-2`; the **Short** wrapper
(const 185) does not.

#### Buttons and the edit-mode label switch

```js
d(33,"div",188)
  (34,"button",189),x("click",function(){return D(e),E(g(2).onDayTradeAlertCancel())}),
    H(35,Swe,2,0)(36,wwe,2,0),
  u(),
  d(37,"button",190),H(38,Twe,2,0)(39,Dwe,2,0),u()
u()
```

Update block: `O(35,e.dayTradeAlert.edit?35:36)` and `O(38,e.dayTradeAlert.edit?38:39)`.

| idx | tuple |
| --- | --- |
| 188 | `[1,"text-end"]` |
| 189 | `["type","button",1,"btn","btn-secondary","btn-sm","m-1",3,"click"]` |
| 190 | `["type","submit",1,"btn","btn-primary","btn-sm","m-1"]` |

| slot | sub-template | byte | contents | shown when |
| --- | --- | --- | --- | --- |
| 35 | `Swe` | 1940011 | `T(0,"i",196),v(1,"Discard ")` — const 196 = `[1,"fas","fa-trash","me-1"]`, text verbatim `"Discard "` (trailing space) | `dayTradeAlert.edit` truthy |
| 36 | `wwe` | 1940065 | `T(0,"i",197),v(1,"Cancel ")` — const 197 = `[1,"fas","fa-times","me-1"]`, text verbatim `"Cancel "` | `edit` falsy |
| 38 | `Twe` | 1940118 | `T(0,"i",198),v(1,"Save Changes ")` — const 198 = `[1,"fas","fa-save","me-1"]`, text verbatim `"Save Changes "` | `edit` truthy |
| 39 | `Dwe` | 1940177 | `T(0,"i",199),v(1,"Submit Alert ")` — const 199 = `[1,"fas","fa-bell","me-1"]`, text verbatim `"Submit Alert "` | `edit` falsy |

**`dayTradeAlert.edit` is the mode flag; one form serves create and edit.**

#### The model object

Set in the constructor at byte **1955399** and reset by `clearDayTradeAlertFields()` at byte
**1987666** — the two literals are identical:

```js
this.dayTradeAlert={alertTxt:"",direction:"long",symbol:"",entryPrice:"",stop:"",target:"",
                    senderName:"",edit:!1,alertLogID:"",image:"",txtInAlerts:""}
```

`direction` defaults to `"long"`, so the Long radio is pre-selected.

**`alertTxt` has no form control.** The consts array contains no `dayTradeAlert-alertTxt` id and no
element binds it — the complete set of `dayTradeAlert-*` ids in the consts array is: `symbol`,
`entryPrice`, `stop`, `target`, `image`, `direction`, `long`, `short`, `limit`, `search`. `alertTxt`
is nevertheless read and sent on submit (§1.6). On a create it is always `""`; on an edit it carries
whatever the spread of the row object provided.

### 1.5 The log list — `Rwe`, and the row — `Pwe`

`Rwe`, byte **1943979**:

```js
d(0,"div",180)(1,"div",12)
  (2,"div",232)
    (3,"span",201),v(4,"Show"),u(),
    d(5,"input",233),Ve("ngModelChange",…dayTradeAlertLimit…),u(),
    d(6,"span",201),v(7,"entries"),u()
  u(),
  d(8,"span",234),x("click",function(){return D(e),E(g(2).downloadDayTrades())}),T(9,"i",204),u()
u(),
d(10,"input",235),Ve("ngModelChange",…dayTradeAlertSearch…),u()
u(),
d(11,"div",206)(12,"table",207)(13,"thead")(14,"tr")
  (15,"th"),v(16,"Symbol"),u(),  (17,"th"),v(18,"Long/Short"),u(),
  (19,"th"),v(20,"Alert Date"),u(), (21,"th"),v(22,"Entry Price"),u(),
  (23,"th"),v(24,"Stop"),u(),    (25,"th"),v(26,"Target"),u(),
  (27,"th"),v(28,"Image"),u(),   (29,"th"),v(30,"Sender"),u()
u()(),
d(31,"tbody"),ht(32,Pwe,23,17,"tr",null,Li),Xe(34,"searchDayTradeLogs"),Xe(35,"limitDayTradeLogs"),u()
```

Update block:

```js
pt(Ct(35,5,Ct(34,2,e.appService.globals.dayTradeAlertsLog,e.dayTradeAlertSearch),e.dayTradeAlertLimit))
```

— i.e. `dayTradeAlertsLog | searchDayTradeLogs : dayTradeAlertSearch | limitDayTradeLogs : dayTradeAlertLimit`.

**Header cells, in order, verbatim:** `Symbol`, `Long/Short`, `Alert Date`, `Entry Price`, `Stop`,
`Target`, `Image`, `Sender`.

| idx | tuple |
| --- | --- |
| 232 | `[1,"input-group","input-group-sm","dayTradeAlert-limit-container","m-2","ms-0"]` |
| 201 | `[1,"input-group-text"]` |
| 233 | `["type","number","step","5","min","0","id","dayTradeAlert-limit","aria-label","dayTradeAlert-limit",1,"form-control",3,"ngModelChange","ngModel"]` |
| 234 | `["title","Download Day Trades",1,"m-1","ms-4","download-day-trades-btn",3,"click"]` |
| 204 | `[1,"fas","fa-save"]` |
| 235 | `["type","search","id","dayTradeAlert-search","placeholder","Enter your search term","aria-label","dayTradeAlert-search","aria-describedby","dayTradeAlert-search",1,"form-control","form-control-sm","m-2","me-0",3,"ngModelChange","ngModel"]` |
| 206 | `[1,"table-responsive"]` |
| 207 | `[1,"table","table-striped"]` |

Limit input has **`step="5"` and `min="0"`**; there is no `max`. The `Show` / `entries` texts are
verbatim `"Show"` and `"entries"` with no padding spaces — the spacing comes from the
`input-group-text` boxes. The download control's `title` is verbatim `Download Day Trades`.

Initial values: `this.dayTradeAlertLimit=10` (byte **1955546**),
`this.dayTradeAlertSearch=""` (byte **1955573**).

#### Row template `Pwe`, byte 1943242

```js
d(0,"tr")
 (1,"td")(2,"span",208),H(3,Mwe,6,0),d(4,"strong",209),v(5),u()()(),   // Symbol cell
 d(6,"td"),v(7),u(),                                                   // direction
 d(8,"td"),v(9),Xe(10,"date"),u(),                                     // entryDate
 d(11,"td"),v(12),u(),                                                 // entryPrice
 d(13,"td"),v(14),u(),                                                 // stop
 d(15,"td"),v(16),u(),                                                 // target
 d(17,"td",210),H(18,Awe,1,2,"img",211),u(),                           // image
 d(19,"td",212)(20,"strong",213),v(21),u(),T(22,"img",214),u()         // sender
u()
```

Update block, in order:

```js
m(2),z("ngClass",ct(15,qCe,i.isP)),
m(),  O(3,i.isP?3:-1),
m(2), Ne(" ",e.symbol," "),
m(2), Ze(e.direction),
m(2), Ne(" ",Ct(10,12,e.entryDate,"YYYY-MM-dd hh:mm:ss")," "),
m(3), Ze(e.entryPrice),
m(2), Ze(e.stop),
m(2), Ze(e.target),
m(2), O(18,e.image?18:-1),
m(3), Ze(e.senderName),
m(),  z("src",e.senderPic||"https://secure.gravatar.com/avatar/"+e.senderAvt+"?d=mm&s=30",Mt)("alt",e.senderName)
```

| idx | tuple |
| --- | --- |
| 208 | `[3,"ngClass"]` |
| 209 | `[1,"ms-2","font-weight-bold"]` |
| 210 | `[1,"text-center","align-middle","p-0","m-0"]` |
| 211 | `["title","Click to view image",1,"uploaded-alert-image",3,"src","alt"]` |
| 212 | `[1,"p-0"]` |
| 213 | `[1,"mx-1","font-weight-bold"]` |
| 214 | `[1,"alert-sender-img",3,"src","alt"]` |

`qCe` is defined at byte **1916694** as `qCe=t=>({"day-trade-symbol-container":t})`. The symbol cell's
`<span>` therefore gets the class `day-trade-symbol-container` **only when `isP` is true**.

**The date format string is `"YYYY-MM-dd hh:mm:ss"`** (byte **1943735**), passed to Angular's `date`
pipe (`Xe(10,"date")`). Reproduce that string exactly — capital `YYYY` and lowercase `hh` are what is
in the source. The field formatted is **`entryDate`**, not `created`.

Symbol and the formatted date are interpolated with `Ne(" ", x, " ")` — a leading and trailing space
inside the cell. The other four (`direction`, `entryPrice`, `stop`, `target`) use `Ze(x)` — no
padding.

The sender avatar falls back to `"https://secure.gravatar.com/avatar/" + senderAvt + "?d=mm&s=30"`
when `senderPic` is falsy (byte **1943900**).

The row repeat is tracked by `Li` — **identity**, not `_id`. The bundle does define an `_id` track
function, `pc=(t,n)=>n._id` (byte **1916266**), and the trade-alert repeats do **not** use it.

#### Row actions — `Mwe`, byte 1942714, rendered only when `isP`

```js
d(0,"span",236),x("click",…deleteDayTradeAlert(o._id,o)…),T(1,"i",216),u(),
d(2,"span",142),v(3,"|"),u(),
d(4,"span",237),x("click",…editDayTradeAlert(o)…),T(5,"i",218),u()
```

| idx | tuple |
| --- | --- |
| 236 | `[1,"p-1","day-trade-alert-btn-delete",3,"click"]` |
| 216 | `[1,"fa","fa-trash"]` |
| 142 | `[1,"mx-2"]` |
| 237 | `[1,"p-1","day-trade-alert-btn-edit",3,"click"]` |
| 218 | `[1,"fa","fa-edit"]` |

The separator text is the single character `|` in a `<span class="mx-2">`. Delete passes **both**
`o._id` and the whole row object `o` (byte **1942830**); edit passes the row object (byte 1942986).

#### Row image — `Awe`, byte 1943028

```js
d(0,"img",219),x("click",…showImagePreview(o.image)…);  z("src",e.image,Mt)("alt",e.image)
```

const **219** = `["title","Click to view image",1,"uploaded-alert-image",3,"click","src","alt"]`.
Rendered only when `e.image` is truthy.

### 1.6 Handlers, read from source

#### `onDayTradeAlertSubmit()` — definition at byte 1985961; called from the template at byte 1940335

```js
onDayTradeAlertSubmit(){
 if(!(this.dayTradeAlert.symbol&&this.dayTradeAlert.entryPrice&&this.dayTradeAlert.stop&&this.dayTradeAlert.target))
   return void bootbox.alert("Please, fill in required fields.");
 const e=this.dayTradeAlert.alertTxt?.trim(), i=this.dayTradeAlert.symbol?.trim(),
       o=this.dayTradeAlert.entryPrice?.trim(), s=this.dayTradeAlert.stop?.trim(),
       r=this.dayTradeAlert.target?.trim(), a=this.dayTradeAlert.image?.trim();
 i&&i.length<1||""===i ? bootbox.alert('Please, fill in "symbol" field.')
 : o&&o.length<1||""===o ? bootbox.alert('Please, fill in "entry price" field.')
 : s&&s.length<1||""===s ? bootbox.alert('Please, fill in "stop" field.')
 : r&&r.length<1||""===r ? bootbox.alert('Please, fill in "target" field.')
 : bootbox.confirm(`Are you sure you want to ${this.dayTradeAlert.edit?"save":"send"} this alert?`, c=>{
     if(c){
       const h={alertTxt:e,direction:this.dayTradeAlert.direction,symbol:i,entryPrice:o,stop:s,target:r,
                image:a,senderName:this.appService.globals.user.nick||this.appService.globals.user.name};
       if(this.dayTradeAlert.edit){
         this.appService.sendServerCommand("editDayTradeAlertMsg",
             {newDayTradeAlertMsg:h,dayTradeAlertID:this.dayTradeAlert._id});
         const f=this.formatDayTradeAlertTxt(h);
         this.appService.sendServerCommand("editAlertMessageSwing",
             {alertID:this.dayTradeAlert.alertLogID,newAlertMsg:f,dayTradeAlert:!0,txt:this.dayTradeAlert.txtInAlerts});
         this.dayTradeAlert.txtInAlerts=""
       } else {
         this.appService.sendServerCommand("dayTradeAlertMsg",h);
         const _={txt:this.formatDayTradeAlertTxt(h),n:this.appService.globals.user.nick||this.appService.globals.user.name,
                  sendTxt:!1,sendEmail:!1,sendTweet:!1,dontPush:!1,nonTradeAlert:!1,dayTradeAlert:!0};
         this.appService.sendServerCommand("alertMsg",_)
       }
       this.clearDayTradeAlertFields()
     }})}
```

Points of exactness:

- The four bootbox strings are verbatim, single-quoted in source, and include the double quotes around
  the field names: `Please, fill in "symbol" field.` / `"entry price"` / `"stop"` / `"target"`.
- The guard message is verbatim `Please, fill in required fields.` — the Day Trade instance is at
  byte **1986126**; Swing carries the identical literal at byte 1982115.
- The confirm text interpolates `save` when `edit` is truthy and `send` otherwise.
- **`image` is trimmed but never validated.** An empty image submits fine.
- **The direction radios are `required` in markup but the submit guard does not check
  `direction`** — the model default `"long"` means the payload always carries a direction.
- **A create sends two commands**: `dayTradeAlertMsg` (byte **1987374**) with the row payload, then
  `alertMsg` with the formatted text and the flag `dayTradeAlert:!0` (byte **1987595**).
- **An edit also sends two commands**: `editDayTradeAlertMsg`, then **`editAlertMessageSwing`** —
  that command name contains `Swing` and is used by the Day Trade path too, carrying
  `dayTradeAlert:!0` instead of `swingTradeAlert:!0` (byte **1987189** for the Day Trade call site,
  byte **1983135** for the Swing one).

#### `formatDayTradeAlertTxt(e)` — byte 1988280

```js
formatDayTradeAlertTxt(e){
  let i="#DayTrade \n";
  return i+=`${e.symbol} - ${e.direction} - Entry ${e.entryPrice} - Exit ${e.stop} - Target ${e.target}`,
         e.image&&(i+=`\n${e.image}`), i}
```

The prefix is verbatim `"#DayTrade \n"` (byte **1988312**) — hash, `DayTrade`, **one space**, newline.
The body labels `Entry` / `Exit` / `Target` are verbatim; note the **stop value is labelled `Exit`**.

#### `onDayTradeAlertCancel()` — definition at byte 1987875; called from the template at byte 1941936

```js
onDayTradeAlertCancel(){
 (this.dayTradeAlert.symbol||this.dayTradeAlert.entryPrice||this.dayTradeAlert.stop||
  this.dayTradeAlert.target||this.dayTradeAlert.image)
 && bootbox.confirm(`Are you sure you want to ${this.dayTradeAlert.edit?"discard":"clear"} inputs for this alert?`,
    i=>{i&&(this.clearDayTradeAlertFields(),
           this.appService.globals.dayTradeAlertsLog=[...this.appService.globals.dayTradeAlertsLog])})}
```

`direction` is **not** in the "is anything filled in" check, so cancelling a form where only the
radio was touched is a no-op with no dialog. On confirm the handler clears the fields **and
reassigns `dayTradeAlertsLog` to a fresh array** (byte **1988212**).

#### `editDayTradeAlert(e)` — byte 1988461

```js
editDayTradeAlert(e){var i=this;return I(function*(){
  i.dayTradeAlert={...e}, i.dayTradeAlert.edit=!0;
  let o=i.formatDayTradeAlertTxt(e);
  for(const r of i.appService.globals.alertsLog)
    r.txt==o && (i.dayTradeAlert.txtInAlerts=o, i.dayTradeAlert.alertLogID=yield r._id);
  ii(".day-trade-alert-form").addClass("animated flash");
  const s=setTimeout(()=>{ii(".day-trade-alert-form").removeClass("animated flash"),clearTimeout(s)},500)})()}
```

- The row is spread into the model, so `_id` lands on `dayTradeAlert._id` and is what
  `editDayTradeAlertMsg` sends back.
- The loop over `alertsLog` has **no `break`** — it walks the entire log, so the **last** matching
  alert wins.
- `txtInAlerts` is set to `o`, the freshly formatted text.
- jQuery (`ii`) adds `animated flash` to `.day-trade-alert-form` for 500 ms (bytes 1988722 / 1988802).

#### `deleteDayTradeAlert(e,i)` — byte 1988885

```js
deleteDayTradeAlert(e,i){bootbox.confirm("Are you sure you want to DELETE this alert?",o=>{if(o){
  this.appService.sendServerCommand("deleteDayTradeAlertMsg",{dayTradeAlertID:e});
  let s=this.formatDayTradeAlertTxt(i), r="";
  for(const a of this.appService.globals.alertsLog) a.txt==s && (r=a._id);
  this.appService.deleteAlert({_id:r,dayTradeAlert:!0,txt:s})}})}
```

Confirm text verbatim: `Are you sure you want to DELETE this alert?` — `DELETE` capitalised.
Again **no `break`** in the loop. `deleteAlert` is defined at byte **1158988** as
`deleteAlert(e){this.socketService.sendAdminCmd("deleteAlertMsg",e)}` — an **admin** command, not a
regular one. If no alert matched, `_id` is sent as `""`.

#### `downloadDayTrades()` — byte 1989236

```js
downloadDayTrades(){
 const e={year:"numeric",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}, i=[];
 i.push("Symbol, Long/Short, Alert Date, Entry Price, Stop, Target, Image, Sender \r\n");
 for(let a=0;a<this.appService.globals.dayTradeAlertsLog.length;a++)
  try{ const l=this.appService.globals.dayTradeAlertsLog[a],
           c=l.image?.trim()?l.image:"n/a",
           h='"'+l.symbol+'","'+l.direction+'","'+new Date(l.entryDate).toLocaleTimeString("en-us",e)
             +'","'+l.entryPrice+'","'+l.stop+'","'+l.target+'","'+c+'","'+l.senderName+'"\r\n';
       i.push(h)}catch(l){console.error(l)}
 const o=new Blob(i,{type:"text/csv;charset=utf-8"}), s=window.URL.createObjectURL(o),
       r=document.createElement("a");
 r.href=s, r.download=`DayTradeLog_${this.appService.globals.sessionID}.csv`,
 r.style.display="none", document.body.appendChild(r), r.click(), document.body.removeChild(r)}
```

- Header row verbatim, including the space before `\r\n`:
  `Symbol, Long/Short, Alert Date, Entry Price, Stop, Target, Image, Sender \r\n`
- The header cells are **not** quoted; the data cells **are**.
- Missing image becomes the literal `n/a`.
- The date uses `toLocaleTimeString("en-us", …)` with a `year`/`month`/`day`/`hour`/`minute` option
  bag, on `entryDate`.
- Filename: `` `DayTradeLog_${sessionID}.csv` `` (byte **1989936**).
- **The export ignores the search box and the limit box** — it iterates the raw
  `globals.dayTradeAlertsLog`, not the piped view.
- The object URL is created and never revoked.

#### Image helpers (shared between Swing and Day Trade)

- `imgUpload(e)` — byte **1990081**. Opens a bootbox with an upload area; the success button calls
  `doImagurFileListUpload(e)` carrying the discriminator through.
- `doImggurUpload(e,i=null,o=!1)` — byte **1991495** (the presentation-area copy; the bundle has
  other components with same-named methods, e.g. byte 1443128, which are not this feature). On
  success, byte **1992037**:
  `"swing"===i?s.swingAlert.image=F:"dayTrade"===i&&(s.dayTradeAlert.image=F)`
  where `F=_.data.link`. **The discriminator strings are `"swing"` and `"dayTrade"`** — deny-by-default:
  any other value silently sets neither.
- Upload endpoint: `` `${globals.upload_server}/image/${globals.sessionID}` ``, `POST`, header
  `Authorization: Client-ID ${globals.cdn_upload_key}`, `FormData` fields `image` and `name`.
- `onImagePaste(e,i)` — byte **1992250**. Reads `clipboardData.items`, takes the first item whose
  `type` starts with `image`, shows a confirm containing an object-URL preview, then calls
  `doImggurUpload(r,i)`. The Day Trade call site passes `"dayTrade"` (byte **1941249**).
- `removeImageDayTrade()` — byte **1993515**: `{this.dayTradeAlert.image=""}`.
- `showImagePreview(e,i="")` — byte **1992730**. A bootbox dialog with an `img-fluid` image and a
  `Download Image` button.

### 1.7 Wire protocol

Transport, byte **990323**:

```js
send(e,i={}){try{this.socket.transmit("cmd",{cmd:e,data:i})}catch{}}
sendAdminCmd(e,i={}){this.socket.transmit("adminCmd",{cmd:e,data:i})}
```

`sendServerCommand(e,i)` (byte **1159780**) logs `` `sendServerCmd: ${e}. data:` `` then calls
`socketService.send(e,i)`.

#### Client → server

| command | channel | payload, verbatim from source | call site |
| --- | --- | --- | --- |
| `getDayTradeAlertsLog` | `cmd` | `{sessionID: <linkedRoomDayTradeAlertsOther or own sessionID>, days: 21}` on load; `{sessionID: …, days: 4*dayTradeAlertMonths*7}` on dropdown change | 1010272 (`` `get${e}AlertsLog` ``), 1993797 |
| `dayTradeAlertMsg` | `cmd` | `{alertTxt,direction,symbol,entryPrice,stop,target,image,senderName}` | 1987374 |
| `editDayTradeAlertMsg` | `cmd` | `{newDayTradeAlertMsg:<same shape>, dayTradeAlertID:<dayTradeAlert._id>}` | **1987010** |
| `deleteDayTradeAlertMsg` | `cmd` | `{dayTradeAlertID:<row _id>}` | **1988998** |
| `alertMsg` | `cmd` | `{txt,n,sendTxt:false,sendEmail:false,sendTweet:false,dontPush:false,nonTradeAlert:false,dayTradeAlert:true}` | **1987595** |
| `editAlertMessageSwing` | `cmd` | `{alertID,newAlertMsg,dayTradeAlert:true,txt}` | 1987189 |
| `deleteAlertMsg` | **`adminCmd`** | `{_id,dayTradeAlert:true,txt}` | 1158988 / 1989189 |

**The create command is `dayTradeAlertMsg`, not `newDayTradeAlertMsg`.** `newDayTradeAlertMsg` is
the *response* key and the *edit request* field name — see below.

#### Load on session start — byte 1009481

```js
loadSessionLogs(){ this.send("getRosterCount"),
  this.globals.sessData.hasSwingTradeAlerts&&this.loadTradeAlerts("Swing"),
  this.globals.sessData.hasDayTradeAlerts&&this.loadTradeAlerts("DayTrade"), … }
```

`loadTradeAlerts(e)`, byte **1010116**:

```js
loadTradeAlerts(e){
 let i=this.globals.sessData[`linkedRoom${e}AlertsOther`]; i=i?.trim();
 if(i){ let o={sessionID:i,days:21}; "Swing"==e&&(o.days=42); this.send(`get${e}AlertsLog`,o) }
 else { let o={sessionID:this.globals.sessionID,days:21}; "Swing"==e&&(o.days=42); this.send(`get${e}AlertsLog`,o) }}
```

**The initial Day Trade window is 21 days** (the default `o.days`); the `"Swing"` branch overrides it
to 42. Note this is a third day-count formula, unrelated to the dropdown's `4 × months × 7`.

#### Server → client — `handleServerCmd`

| case | byte | body, verbatim |
| --- | --- | --- |
| `getDayTradeAlertsLog` | 1018624 | `if(!i\|\|!i.data)return; i.data.reverse(); this.globals.dayTradeAlertsLog=i.data;` |
| `newDayTradeAlertMsg` | 1018734 | `this.globals.dayTradeAlertsLog=[i.data.newDayTradeAlertMsg,...this.globals.dayTradeAlertsLog]` |
| `deleteDayTradeAlertMsg` | 1018882 | loop over the log, `_id===i.data.dayTradeAlertID` → `splice(se,1)`, then reassign to a fresh array |
| `editDayTradeAlertMsg` | 1019174 | loop over the log, `_id===i.data.dayTradeAlertID` → `this.globals.dayTradeAlertsLog[se]=i.data.dayTradeAlertMsg`, then reassign |

The edit response field is **`i.data.dayTradeAlertMsg`** — not `newDayTradeAlertMsg`, which is what
the *request* used. The two names differ on the same round trip.

**The `getDayTradeAlertsLog` case emits no event.** The Swing case at byte 1017718 both logs
(`P("handleServerCmd got getSwingAlertsLog:",i)`) and emits
(`this.appEventBus.emit("getSwingAlertsLog",this.globals.swingAlertsLog)`). The Day Trade case does
neither. The list updates only through Angular change detection on `globals.dayTradeAlertsLog`.

#### Row shape, from every property the code touches

`_id`, `symbol`, `direction` (`"long"` \| `"short"`), `entryDate`, `entryPrice`, `stop`, `target`,
`image`, `senderName`, `senderPic`, `senderAvt`, `alertTxt`, `txt`. Read from: the row template `Pwe`
(1943242–1943978), `downloadDayTrades` (1989236+), `editDayTradeAlert` (1988461+), the submit payload
(byte 1987265), and the search pipe (1915980).

Global state: `this.dayTradeAlertsLog=[]` in the globals class, byte **980863**.

### 1.8 Pipes, read from source

**`searchDayTradeLogs`** — byte **1915985**:

```js
transform(e,i){return e ? i ? (i=i.toLowerCase(),
  e.filter(o=>o?.symbol?.toLowerCase()?.includes(i)||o?.senderName?.toLowerCase()?.includes(i)))
  : e : []}
```

Matches `symbol` **or** `senderName`, both lowercased, **with optional chaining at every hop**. Empty
search returns the list unchanged; a null/undefined list returns `[]`. Marked `pure:!0`.

**`limitDayTradeLogs`** — byte **1916186**:

```js
transform(e,i){return e&&0!==i ? e.slice(0,i) : []}
```

**A limit of `0` returns `[]`, not the whole list.** Marked `pure:!0`.

### 1.9 CSS — every rule touching a `day-trade-*` / `dayTradeAlert-*` selector

All of these are Angular component styles inlined in the JS bundle with the `[_ngcontent-%COMP%]`
scoping attribute (stripped below for readability). **None of them exist in
`styles.ee2a710065b60389.css`.**

| bytes | selector(s) | declarations |
| --- | --- | --- |
| 2022161 | `#dayTradeAlerts, #swingAlerts` | `overflow-y:auto; height:calc(100% - 40px)` |
| 2022270 | `.day-trade-alert-txt, .swing-alert-txt` | `padding-left:5%` |
| 2022363 | `.download-day-trades-btn, .download-swing-trades-btn` | `font-size:18px; background-color:#08668e; padding:3px 11px; color:#fff; border-radius:6px; line-height:24px` |
| 2022557 | `.download-day-trades-btn:hover, .day-trade-alert-btn-delete:hover, .day-trade-alert-btn-edit:hover, .download-swing-trades-btn:hover, .swing-alert-btn-delete:hover, .swing-alert-btn-edit:hover` | `opacity:.75; cursor:pointer` |
| 2022891 | `.day-trade-symbol-container, .swing-symbol-container` | `width:100%; max-width:150px; text-align:left; display:block; margin:0 auto 0 24%` |
| 2023059 | `.day-trade-alert-form, .swing-alert-form` | `font-size:12px; max-width:600px` |
| 2023169 | `.day-trade-alert-form .input-group-text, .swing-alert-form .input-group-text` | `width:105px; font-size:12px` |
| 2023353 | `.day-trade-alert-form .form-control, .swing-alert-form .form-control` | `font-size:12px` |
| 2023517 | `.day-trade-alert-form #dayTradeAlert-long`, `… #dayTradeAlert-short`, `… #swingAlert-long`, `… #swingAlert-short`, and the same four under `.swing-alert-form` (8 selectors) | `margin-top:3px` |
| 2024171 | `.day-trade-alerts-container .table, .swing-alerts-container .table` | `font-size:12px` |
| 2024333 | `.day-trade-alerts-container .table th`, `… td`, `.swing-alerts-container .table th`, `… td` | `text-align:center; vertical-align:middle` |
| 2024764 | `.day-trade-alerts-container h4, .swing-alerts-container h4` | `background-color:#08668e; color:#fff` |
| 2024861–2025477 | `.day-trade-alerts-container #dayTradeAlert-search`, `.day-trade-alerts-container #swingAlert-search`, `.day-trade-alerts-container .swingAlert-limit-container`, `.swing-alerts-container #dayTradeAlert-search`, `.swing-alerts-container #swingAlert-search`, `.swing-alerts-container .swingAlert-limit-container` | `width:100%` |
| 2025478 | `.day-trade-alerts-container #dayTradeAlert-search`, `.day-trade-alerts-container #swingAlert-search`, `.swing-alerts-container #dayTradeAlert-search`, `.swing-alerts-container #swingAlert-search` | `max-width:300px` |
| 2025854 | `.day-trade-alerts-container .dayTradeAlert-limit-container`, `.day-trade-alerts-container .swingAlert-limit-container`, `.swing-alerts-container .dayTradeAlert-limit-container`, `.swing-alerts-container .swingAlert-limit-container` | `max-width:180px` |
| 2026319 | `.alert-sender-img, .uploaded-alert-image, .uploaded-img-preview` | `width:auto; height:100%; max-height:30px; object-fit:contain` |
| 2026498 | `.remove-image-btn` | `width:36px!important` |
| 2026556 | `.uploaded-alert-image:hover, .form-check-label:hover, #dayTradeAlert-long:hover, #dayTradeAlert-short:hover, #swingAlert-long:hover, #swingAlert-short:hover, .uploaded-img-preview:hover, .img-upload-btn:hover, .remove-image-btn:hover` | `cursor:pointer` |
| 2026976 | `.img-fluid` | `max-width:100%; max-height:70vh; display:block; margin:0 auto` |
| 2031534 | `.trade-alerts-select` | `font-size:12px; vertical-align:bottom` |

Two facts worth carrying into the rebuild:

1. **`.dayTradeAlert-limit-container` is absent from the `width:100%` rule.** That rule (bytes
   2024861–2025477) lists exactly six selectors and `.swingAlert-limit-container` appears twice —
   once under each container — while `.dayTradeAlert-limit-container` appears in neither. The
   `max-width:180px` rule at 2025854 does list all four. So in the shipped build the Day Trade limit
   box gets `max-width:180px` but no `width:100%`.
2. **`.day-trade-alert-txt` has no consumer.** The string `day-trade-alert-txt` occurs exactly once
   in the entire bundle, at byte 2022270, inside the stylesheet. No const tuple and no template emits
   it. Same for `swing-alert-txt` (one occurrence, byte 2022312).

`animated flash`, added by `editDayTradeAlert`, has no rule in this component's inlined styles and no
rule under `day-trade`/`swing` in `styles.ee2a710065b60389.css`. Its definition is not decoded — see
[§5](#5-still-to-decode).

---

## 2. Colour values found

Two literal colours occur in the Day Trade CSS, both `#08668e`:

- the export button background (byte 2022363 rule)
- the `h4` background inside `.day-trade-alerts-container` (byte 2024764)

`#fff` is the foreground on both. Everything else on this feature is a Bootstrap utility class
(`form-control`, `input-group`, `form-check-input`, `text-success`, `text-danger`, `bg-secondary`,
`bg-danger`, `btn-primary`, `btn-secondary`, `table-striped`) and carries no literal colour in the
evidence.

---

## 3. HOW IT DIFFERS FROM SWING

### 3.1 Every difference

| # | area | Swing | Day Trade | evidence |
| --- | --- | --- | --- | --- |
| 1 | **tab label** | `"Swing Alerts"` | `"Day Trades"` | 1917785 vs **1918110** |
| 2 | tab `<a>` const | 63: `id="swingAlerts-tab" data-bs-target="#swingAlerts" aria-controls="swingAlerts"` | 65: `id="dayTradeAlerts-tab" data-bs-target="#dayTradeAlerts" aria-controls="dayTradeAlerts"` | consts 63 / 65 |
| 3 | pane const | 27: `id="swingAlerts" aria-labelledby="swingAlerts-tab"` | 28: `id="dayTradeAlerts" aria-labelledby="dayTradeAlerts-tab"` | consts 27 / 28 |
| 4 | **gate flag** | `sessData.hasSwingTradeAlerts` — note `SwingTrade` | `sessData.hasDayTradeAlerts` — note `DayTrade`, **no `Trade` doubling** | 1009430 / **1009503**; gates at 2016906+2017703 vs **2016944+2017741** |
| 5 | **months dropdown range** | `zCe=()=>[1…20]` — 20 options | `WCe=()=>[1…15]` — **15 options** | 1916549 vs **1916648** |
| 6 | **default months** | `swingAlertMonths=2` | `dayTradeAlertMonths=1` | 1955344 vs **1955601** |
| 7 | **dropdown day math** | `30 * swingAlertMonths` | `4 * dayTradeAlertMonths * 7` (= 28 per unit) | 1993612 vs **1993637** |
| 8 | **initial load window** | `days:42` | `days:21` | both at 1010116, `"Swing"==e&&(o.days=42)` overriding the default 21 |
| 9 | linked-room key | `sessData.linkedRoomSwingAlertsOther` | `sessData.linkedRoomDayTradeAlertsOther` | template literal `` `linkedRoom${e}AlertsOther` `` at 1010178 / 1993797 |
| 10 | **heading text** | `" Latest Swing Trade Alerts (Last "` | `" Latest Day Trade Alerts (Last "` | 1938859 vs **1945235** |
| 11 | **empty-state text** | `" No Swing Trade Alerts to display. "` | `" No Day Trade Alerts to display. "` | 1936331 vs **1942672** |
| 12 | form class | `swing-alert-form` (consts 164/170) | `day-trade-alert-form` (consts **220/222**) | consts |
| 13 | list container class | `swing-alerts-container m-2` (const 165) | `day-trade-alerts-container m-2` (const **221**) | consts |
| 14 | field ids/names | `swingAlert-symbol` … `swingAlert-image` (consts 173–178) | `dayTradeAlert-symbol` … `dayTradeAlert-image` (consts **223–227**) | consts |
| 15 | radio ids/names | `swingAlert-direction` / `-long` / `-short` (consts 183/184/186/187) | `dayTradeAlert-direction` / `-long` / `-short` (consts **228/229/230/231**) | consts |
| 16 | limit container class | `swingAlert-limit-container` (const 200) | `dayTradeAlert-limit-container` (const **232**) | consts |
| 17 | limit input id | `swingAlert-limit` (const 202) | `dayTradeAlert-limit` (const **233**) | consts |
| 18 | search input id | `swingAlert-search` (const 205) | `dayTradeAlert-search` (const **235**) | consts |
| 19 | **export title** | `Download Swing Trades` | `Download Day Trades` | consts 203 / **234** |
| 20 | export button class | `download-swing-trades-btn` | `download-day-trades-btn` | consts 203 / **234** |
| 21 | row action classes | `swing-alert-btn-delete` / `swing-alert-btn-edit` (consts 215/217) | `day-trade-alert-btn-delete` / `day-trade-alert-btn-edit` (consts **236/237**) | consts |
| 22 | symbol-cell ngClass map | `GCe=t=>({"swing-symbol-container":t})` | `qCe=t=>({"day-trade-symbol-container":t})` | 1916610 vs **1916694** |
| 23 | **search pipe null-safety** | `o.symbol.toLowerCase().includes(i)\|\|o.senderName.toLowerCase().includes(i)` — **no optional chaining** | `o?.symbol?.toLowerCase()?.includes(i)\|\|o?.senderName?.toLowerCase()?.includes(i)` — **optional chaining at every hop** | 1915487 vs **1915985** |
| 24 | pipe names | `searchSwingLogs`, `limitSwingLogs` | `searchDayTradeLogs`, `limitDayTradeLogs` | 1915487/1915685 vs 1915985/1916186 |
| 25 | image discriminator | `imgUpload("swing")`, `onImagePaste(o,"swing")` | `imgUpload("dayTrade")`, `onImagePaste(o,"dayTrade")` | 1933566/1934965 vs **1939817/1941249** |
| 26 | remove-image method | `removeImageSwing()` | `removeImageDayTrade()` | 1993471 vs **1993515** |
| 27 | **alert-text prefix** | `"#SwingTrade \n"` | `"#DayTrade \n"` | 1984121 vs **1988312** |
| 28 | **create command** | `swingAlertMsg` | `dayTradeAlertMsg` | 1983332 vs **1987374** |
| 29 | edit command + field | `editSwingAlertMsg` `{newSwingAlertMsg, swingAlertID}` | `editDayTradeAlertMsg` `{newDayTradeAlertMsg, dayTradeAlertID}` | 1018346 / 1019174 |
| 30 | delete command + field | `deleteSwingAlertMsg` `{swingAlertID}` | `deleteDayTradeAlertMsg` `{dayTradeAlertID}` | 1018075 / 1018882 |
| 31 | **edit-response field** | `i.data.swingMsg` | `i.data.dayTradeAlertMsg` | 1018346 case vs **1019174** case |
| 32 | side-channel flag | `swingTradeAlert:!0` on `alertMsg`, `editAlertMessageSwing` and `deleteAlertMsg` | `dayTradeAlert:!0` on the same three | 1983209/1983529/1984999 vs **1987265/1987595/1989208** |
| 33 | **`getXAlertsLog` handler: debug log** | `P("handleServerCmd got getSwingAlertsLog:",i)` present | **absent** | 1017718 case vs 1018624 case |
| 34 | **`getXAlertsLog` handler: event emit** | `this.appEventBus.emit("getSwingAlertsLog",this.globals.swingAlertsLog)` present | **absent** | 1017718 case vs 1018624 case |
| 35 | **cancel handler side-effect** | `i&&this.clearSwingAlertFields()` | `i&&(this.clearDayTradeAlertFields(), globals.dayTradeAlertsLog=[...globals.dayTradeAlertsLog])` — **extra array reassignment** | 1983802 vs **1987875** |
| 36 | **edit: alertsLog scan** | `for(…) if(r.txt==o){ alertLogID=yield r._id; txtInAlerts=r.txt; break }` — **breaks on first match**, stores `r.txt` | `for(…) r.txt==o && (txtInAlerts=o, alertLogID=yield r._id)` — **no break, last match wins**, stores the formatted `o` | 1984272 vs **1988461** |
| 37 | **delete: alertsLog scan** | `for(…) if(a.txt==s){ r=a._id; break }` — **breaks** | `for(…) a.txt==s && (r=a._id)` — **no break, last match wins** | 1984681 vs **1988885** |
| 38 | flash selector | `ii(".swing-alert-form")` | `ii(".day-trade-alert-form")` | 1984526 vs **1988722** |
| 39 | **CSV filename** | `SwingLog_${sessionID}.csv` | `DayTradeLog_${sessionID}.csv` | 1985725 vs **1989936** |
| 40 | export method | `downloadSwingTrades()` | `downloadDayTrades()` | 1985029 vs **1989236** |
| 41 | **CSS: limit container `width:100%`** | `.swingAlert-limit-container` is in the rule, under both containers | `.dayTradeAlert-limit-container` is **not in the rule at all** | bytes 2024861–2025477 |
| 42 | submit/cancel/format method names | `onSwingAlertSubmit`, `onSwingAlertCancel`, `clearSwingAlertFields`, `formatSwingAlertTxt`, `editSwingAlert`, `deleteSwingAlert` | `onDayTradeAlertSubmit`, `onDayTradeAlertCancel`, `clearDayTradeAlertFields`, `formatDayTradeAlertTxt`, `editDayTradeAlert`, `deleteDayTradeAlert` | 1981800+ vs 1985400+ |
| 43 | template function names | `hwe`, `swe`, `rwe`, `awe`, `lwe`, `cwe`, `dwe`, `uwe`, `fwe`, `mwe`, `pwe`, `bwe`, `gwe`, `_we`, `vwe` | `Ewe`, `ywe`, `Fwe`, `Cwe`, `Swe`, `wwe`, `Twe`, `Dwe`, `xwe`, `Mwe`, `kwe`, `Rwe`, `Awe`, `Pwe`, `Iwe` | 1933226–1938810 vs 1939468–1945900 |

### 3.2 What is IDENTICAL

Verified by reading both regions in full, not by assuming symmetry:

- **Every placeholder string.** `AAPL`, `123.57`, `120.40`, `138.75`, and
  `Upload Image or Paste Image Link / Screenshot (optional)` — character for character the same in
  consts 173–178 and 223–227.
- **Every field label:** `Symbol`, `Entry Price`, `Stop`, `Target`; and the two radio labels
  `" Long "` / `" Short "` with the same surrounding spaces.
- **Every input type and constraint:** all five text fields are `type="text"` with `minlength="1"`;
  the first four carry `required`, the image field does not; both limit inputs are
  `type="number" step="5" min="0"` with no `max`; both search inputs are `type="search"` with the
  placeholder `Enter your search term` and matching `aria-label` / `aria-describedby`.
- **Default limit:** `10` in both (`swingAlertLimit=10` at 1955295, `dayTradeAlertLimit=10` at 1955546).
- **The model object literal** — identical field-for-field, including `direction:"long"` as the
  default and the unused `alertTxt` / `txtInAlerts` / `alertLogID` slots.
- **`alertTxt` has no form control in either feature.** Neither consts array entry exists.
- **The shared const tuples**, used by both forms with no duplication: 0 (`["alertForm","ngForm"]`),
  12, 92, 142, 166, 167, 168, 169, 171, 172, 177, 179, 180, 181, 182, 185, 188, 189, 190, 191, 192,
  193, 194, 195, 196, 197, 198, 199, 201, 204, 206, 207, 208, 209, 210, 211, 212, 213, 214, 216, 218,
  219. Both features render the same `<form>` skeleton, the same image affordances, the same button
  chrome, the same `<table class="table table-striped">` and the same row cells.
- **The tab icon** — const 64, `[1,"fas","fa-bell"]`, is the same tuple for both tabs.
- **The button label sub-templates are content-identical**, differing only in function name:
  `Discard ` + `fa-trash` / `Cancel ` + `fa-times` / `Save Changes ` + `fa-save` /
  `Submit Alert ` + `fa-bell`, with the same edit-mode branch structure
  `O(35,edit?35:36)` and `O(38,edit?38:39)`.
- **The row template is structurally identical** — 8 `<td>` in the same order, the same
  `Ne(" ",x," ")` vs `Ze(x)` interpolation split, the same
  `entryDate | date:"YYYY-MM-dd hh:mm:ss"`, the same gravatar fallback
  `senderPic || "https://secure.gravatar.com/avatar/"+senderAvt+"?d=mm&s=30"`. `_we` (byte 1936897)
  and `Pwe` (byte 1943242) differ only in the ngClass map (`GCe` / `qCe`) and the sub-template names.
- **The table headers** — `Symbol`, `Long/Short`, `Alert Date`, `Entry Price`, `Stop`, `Target`,
  `Image`, `Sender` — identical in both.
- **The CSV header row** — `Symbol, Long/Short, Alert Date, Entry Price, Stop, Target, Image, Sender \r\n`
  — identical, as is the per-row quoting, the `n/a` image fallback, the `toLocaleTimeString("en-us",…)`
  option bag, and the fact that **both exports ignore the search and limit controls**.
- **The `limitXLogs` pipe body** — `e&&0!==i?e.slice(0,i):[]` — byte-identical, including the
  `0 → []` behaviour.
- **The presenter gates** — both features gate the form with `O(1,e.isP?1:-1)` and the row actions
  with `O(3,i.isP?3:-1)`, from the same `isP = globals.isPresenter` (1954051).
- **Both repeats track by `Li`** (identity), and both option repeats use const 168 `[3,"ngValue"]`.
- **The submit validation ladder** — the same four bootbox messages in the same order, the same
  `Please, fill in required fields.` guard, the same
  `Are you sure you want to ${edit?"save":"send"} this alert?` confirm, and the same omission of
  `direction` from both the submit guard and the cancel "is anything filled in" check.
- **`Are you sure you want to DELETE this alert?`** — identical confirm text.
- **`editAlertMessageSwing`** — the *same command name* is sent by both features; only the boolean
  flag inside differs. Day Trade does not have a `editAlertMessageDayTrade`.
- **All shared CSS declarations** — every rule in §1.9 that names a `day-trade-*` selector also names
  its `swing-*` counterpart with the same declaration block, with the single exception listed as
  difference #41.
- **The image pipeline** — `imgUpload`, `doImagurFileListUpload`, `doImggurUpload`, `onImagePaste`,
  `showImagePreview` are one shared implementation each, parameterised by the `"swing"` /
  `"dayTrade"` discriminator.

---

## 4. VERIFICATION

### Coverage check

Every one of the **230** byte offsets in the bundle matching `dayTrade` / `DayTrade` / `Day Trade` /
`day-trade` / `DayTradeLog` falls inside a range listed in §0. Uncovered: **0**. The same check for
the **239** Swing offsets: uncovered **0**. No claim in §3 rests on a grep hit that was not opened
and read in context.

### Negative controls — things I expected and checked for

1. **Expected: a Day Trade counterpart to Swing's `handleServerCmd` debug log and event emit.**
   Swing's case at byte 1017718 opens with `P("handleServerCmd got getSwingAlertsLog:",i)` and closes
   with `this.appEventBus.emit("getSwingAlertsLog",…)`. I opened the `getDayTradeAlertsLog` case at
   byte 1018624 and read it end to end. **Result: both are absent.** The Day Trade case is exactly
   `if(!i||!i.data)return; i.data.reverse(); this.globals.dayTradeAlertsLog=i.data; break;` — no log
   call, no emit. This is difference #33/#34 and it is a genuine asymmetry in the shipped build, not
   a gap in my reading.

2. **Expected: `day-trade-*` rules in `styles.ee2a710065b60389.css`.** I searched that 444,793-byte
   file for eleven distinct class fragments. **Result: 0 hits for all eleven.** I then located the
   rules in the JS bundle at 2021400–2027100 and read them. Reporting "no Day Trade CSS" from the
   stylesheet search alone would have been wrong.

3. **Expected: a `.day-trade-alert-txt` element somewhere in the template.** The class has a CSS rule
   (`padding-left:5%`, byte 2022270). I checked every occurrence of the string `day-trade-alert-txt`
   in the whole bundle. **Result: exactly one occurrence, inside the stylesheet.** No consumer. It is
   dead CSS in the shipped build; the same holds for `swing-alert-txt`.

4. **Expected: a `dayTradeAlert-alertTxt` form control**, because `alertTxt` is read on submit. I
   enumerated every `dayTradeAlert-*` string in the parsed consts array. **Result: ten ids, none of
   them `alertTxt`.** The field is sent but has no UI.

5. **Expected: `.dayTradeAlert-limit-container` in the `width:100%` CSS rule**, mirroring
   `.swingAlert-limit-container`. I read the full rule text at bytes 2024861–2025477 rather than
   pattern-matching for the class. **Result: six selectors, and `.dayTradeAlert-limit-container` is
   not among them** — while it *is* present in the `max-width:180px` rule 400 bytes later. Difference
   #41 is therefore a read fact, not an artefact of a narrow search.

6. **Expected: the create command to be `newDayTradeAlertMsg`**, since that is the name in the
   server-response case at byte 1018734. I opened the submit handler. **Result: the outbound create
   command is `dayTradeAlertMsg` (byte 1987374).** `newDayTradeAlertMsg` is the *response* key and,
   separately, the *request field name* inside `editDayTradeAlertMsg`. Building from the response
   case name alone would have produced a command the server does not accept.

### What was NOT verified

No runtime evidence was gathered. Nothing here was rendered, clicked or screenshotted; the entire
document is a static read of the shipped bundle and its inlined styles.

---

## 5. Still to decode

Each of these is a specific lookup, not a research project.

1. **`animated flash`** — `editDayTradeAlert` adds these two classes to `.day-trade-alert-form` for
   500 ms (byte 1988722). Neither class has a rule in this component's inlined styles
   (2021400–2032000), and `styles.ee2a710065b60389.css` returned 0 hits for `day-trade`/`swing`. The
   keyframes are not decoded. **Lookup:** search `styles.ee2a710065b60389.css` for `@keyframes flash`
   and for `.animated` and read the rule block.

2. **`sessData.hasDayTradeAlerts` — where it is populated.** It is *read* at bytes 1009503 and
   1955962 and gates everything. Its assignment from the server payload was not located in the ranges
   read. **Lookup:** find where `globals.sessData` is assigned wholesale from a socket response and
   read the field list.

3. **The `alertsLog` row shape.** `editDayTradeAlert` and `deleteDayTradeAlert` scan
   `globals.alertsLog` matching `a.txt == <formatted string>`. Only `.txt` and `._id` are touched by
   the Day Trade code. The rest of that row's shape is outside the ranges read. **Lookup:** read the
   `getAlertsLog` case at byte 1017003 and the alerts-panel row template.

4. **Server-side semantics of `days`.** Three different day counts reach `getDayTradeAlertsLog`: 21
   on initial load, and `4 × months × 7` on dropdown change. Whether the server treats `days` as a
   lookback window or a page size is not in this bundle. **Lookup:** the server repository, handler
   for `getDayTradeAlertsLog`.

5. **`senderPic` / `senderAvt` provenance.** The row template consumes both (byte 1943900) but
   nothing in the Day Trade code writes them — the submit payload sends only `senderName`. **Lookup:**
   the server-side `dayTradeAlertMsg` handler, to confirm they are joined at write or at read time.

6. **`entryDate` provenance.** Same situation: the row and the CSV both read `entryDate`, and the
   client never sends it. **Lookup:** as above.

7. **`upload_server` and `cdn_upload_key`.** Read from `globals` at byte 1991495; their assignment
   is outside the ranges read. **Lookup:** search the bundle for `upload_server:` in the globals
   class initialiser.

8. **The `bootbox` dialog primitive.** Every confirm/alert in this feature goes through `bootbox`,
   which is an external global. This project's standard forbids `window.confirm`/`alert`; the
   replacement primitive is a project decision, not a decode gap, but the *exact* strings above must
   survive it.

9. **`hasSwingTradeAlerts` vs `hasDayTradeAlerts` naming.** Both are read from `sessData`; the Swing
   one carries `Trade` in the middle and the Day Trade one does not. Both spellings are confirmed
   read (1009430, 1009503). Whether the server emits both keys, or one is a legacy alias, is not in
   this bundle. **Lookup:** the server session-settings serialiser.

I checked, and did **not** find gaps in: the const tuples (all 292 parsed, every index cited is
resolved), the template functions (all fifteen Day Trade functions read start to end), the four
`handleServerCmd` cases, the two pipes, the ten handler methods, and the CSS rules — for those, the
evidence is complete.

---

## 6. Build notes

- **One flag switches the whole feature on:** `sessData.hasDayTradeAlerts`. Deny-by-default; the tab
  and the pane both consult it independently.
- **Two authority levels inside the pane:** `isP` gates the form (`O(1,e.isP?1:-1)`), the row action
  buttons (`O(3,i.isP?3:-1)`) and the `day-trade-symbol-container` class. Per this repository's
  standard, that decision is made on the server; `globals.isPresenter` is a client mirror of it and
  must not be the authority.
- **One form, two modes**, driven by `dayTradeAlert.edit`.
- **Money fields are strings on the wire.** `entryPrice`, `stop` and `target` are `type="text"`,
  `?.trim()`-ed, and sent as strings. Nothing in this bundle parses them numerically. Converting them
  to `i64` cents is a deliberate change, not a port.
- **Three day-count formulas reach one command.** 21 on load, `4 × months × 7` on change, and the
  Swing sibling's 42/`30 × months`. A rebuild should carry the Day Trade pair exactly as decoded, or
  record a deliberate divergence.
- **The two no-`break` loops (differences #36, #37) are last-match-wins scans over the full
  `alertsLog`.** Swing's equivalents break on first match. This is an O(n) scan on every edit and
  delete; the bound on `alertsLog` is not decoded.


---

## Appendix A — every const index cited in this document, resolved

Read from the `consts:` array at bytes **1994264–2014221** (292 tuples). Tuples are reproduced
verbatim. A leading `1` opens the static class list; a `3` opens the bound-property/event list;
leading string pairs are literal attributes, and `"required",""` is the `required` attribute with an
empty value.

| idx | tuple, verbatim |
| --- | --- |
| **0** | `["alertForm","ngForm"]` |
| **12** | `[1,"d-flex","align-items-center"]` |
| **14** | `[1,"mx-1"]` |
| **16** | `["role","presentation",1,"nav-item"]` |
| **27** | `["id","swingAlerts","role","tabpanel","aria-labelledby","swingAlerts-tab",1,"tab-pane","position-relative",3,"ngClass"]` |
| **28** | `["id","dayTradeAlerts","role","tabpanel","aria-labelledby","dayTradeAlerts-tab",1,"tab-pane","position-relative",3,"ngClass"]` |
| **31** | `["role","presentation",1,"nav-item",3,"click"]` |
| **63** | `["id","swingAlerts-tab","data-bs-toggle","tab","data-bs-target","#swingAlerts","role","tab","aria-controls","swingAlerts","aria-selected","true",1,"nav-link",3,"ngClass"]` |
| **64** | `[1,"fas","fa-bell"]` |
| **65** | `["id","dayTradeAlerts-tab","data-bs-toggle","tab","data-bs-target","#dayTradeAlerts","role","tab","aria-controls","dayTradeAlerts","aria-selected","true",1,"nav-link",3,"ngClass"]` |
| **92** | `[1,"fas","fa-times"]` |
| **142** | `[1,"mx-2"]` |
| **164** | `[1,"m-2","mx-auto","swing-alert-form"]` |
| **165** | `[1,"swing-alerts-container","m-2"]` |
| **166** | `[1,"text-center","m-0","p-1","px-3"]` |
| **167** | `[1,"form-select","form-select-sm","d-inline-block","w-auto","trade-alerts-select",3,"ngModelChange","ngModel"]` |
| **168** | `[3,"ngValue"]` |
| **169** | `[1,"text-center","m-0","p-1","px-3","bg-secondary"]` |
| **170** | `[1,"m-2","mx-auto","swing-alert-form",3,"ngSubmit"]` |
| **171** | `[1,"form-group","input-group","mb-1"]` |
| **172** | `[1,"input-group-text","bg-secondary","border-secondary","text-white"]` |
| **173** | `["type","text","id","swingAlert-symbol","placeholder","AAPL","minlength","1","name","swingAlert-symbol","required","",1,"form-control",3,"ngModelChange","ngModel"]` |
| **174** | `["type","text","id","swingAlert-entryPrice","placeholder","123.57","minlength","1","name","swingAlert-entryPrice","required","",1,"form-control",3,"ngModelChange","ngModel"]` |
| **175** | `["type","text","id","swingAlert-stop","placeholder","120.40","minlength","1","name","swingAlert-stop","required","",1,"form-control",3,"ngModelChange","ngModel"]` |
| **176** | `["type","text","id","swingAlert-target","placeholder","138.75","minlength","1","name","swingAlert-target","required","",1,"form-control",3,"ngModelChange","ngModel"]` |
| **177** | `["title","Click to view image",1,"input-group-text","bg-secondary","border-secondary","text-white","text-center","p-0","d-block"]` |
| **178** | `["type","text","id","swingAlert-image","placeholder","Upload Image or Paste Image Link / Screenshot (optional)","minlength","1","name","swingAlert-image",1,"form-control",3,"paste","ngModelChange","ngModel"]` |
| **179** | `["title","Remove Image",1,"input-group-text","bg-danger","border-danger","text-white","remove-image-btn"]` |
| **180** | `[1,"d-flex","align-items-center","justify-content-between","flex-wrap"]` |
| **181** | `[1,"form-group","mb-0","ms-1"]` |
| **182** | `[1,"form-check","form-check-inline","ms-2"]` |
| **183** | `["type","radio","name","swingAlert-direction","id","swingAlert-long","value","long","required","",1,"form-check-input",3,"ngModelChange","ngModel"]` |
| **184** | `["for","swingAlert-long",1,"form-check-label","text-success","font-weight-bold"]` |
| **185** | `[1,"form-check","form-check-inline"]` |
| **186** | `["type","radio","name","swingAlert-direction","id","swingAlert-short","value","short","required","",1,"form-check-input",3,"ngModelChange","ngModel"]` |
| **187** | `["for","swingAlert-short",1,"form-check-label","text-danger","font-weight-bold"]` |
| **188** | `[1,"text-end"]` |
| **189** | `["type","button",1,"btn","btn-secondary","btn-sm","m-1",3,"click"]` |
| **190** | `["type","submit",1,"btn","btn-primary","btn-sm","m-1"]` |
| **191** | `["title","Click to view image",1,"input-group-text","bg-secondary","border-secondary","text-white","text-center","p-0","d-block",3,"click"]` |
| **192** | `[1,"d-inline-block","uploaded-img-preview",3,"src","alt"]` |
| **193** | `["title","Upload Image",1,"input-group-text","bg-secondary","border-secondary","text-white","img-upload-btn",3,"click"]` |
| **194** | `[1,"fas","fa-image","me-1"]` |
| **195** | `["title","Remove Image",1,"input-group-text","bg-danger","border-danger","text-white","remove-image-btn",3,"click"]` |
| **196** | `[1,"fas","fa-trash","me-1"]` |
| **197** | `[1,"fas","fa-times","me-1"]` |
| **198** | `[1,"fas","fa-save","me-1"]` |
| **199** | `[1,"fas","fa-bell","me-1"]` |
| **200** | `[1,"input-group","input-group-sm","swingAlert-limit-container","m-2","ms-0"]` |
| **201** | `[1,"input-group-text"]` |
| **202** | `["type","number","step","5","min","0","id","swingAlert-limit","aria-label","swingAlert-limit",1,"form-control",3,"ngModelChange","ngModel"]` |
| **203** | `["title","Download Swing Trades",1,"m-1","ms-4","download-swing-trades-btn",3,"click"]` |
| **204** | `[1,"fas","fa-save"]` |
| **205** | `["type","search","id","swingAlert-search","placeholder","Enter your search term","aria-label","swingAlert-search","aria-describedby","swingAlert-search",1,"form-control","form-control-sm","m-2","me-0",3,"ngModelChange","ngModel"]` |
| **206** | `[1,"table-responsive"]` |
| **207** | `[1,"table","table-striped"]` |
| **208** | `[3,"ngClass"]` |
| **209** | `[1,"ms-2","font-weight-bold"]` |
| **210** | `[1,"text-center","align-middle","p-0","m-0"]` |
| **211** | `["title","Click to view image",1,"uploaded-alert-image",3,"src","alt"]` |
| **212** | `[1,"p-0"]` |
| **213** | `[1,"mx-1","font-weight-bold"]` |
| **214** | `[1,"alert-sender-img",3,"src","alt"]` |
| **215** | `[1,"p-1","swing-alert-btn-delete",3,"click"]` |
| **216** | `[1,"fa","fa-trash"]` |
| **217** | `[1,"p-1","swing-alert-btn-edit",3,"click"]` |
| **218** | `[1,"fa","fa-edit"]` |
| **219** | `["title","Click to view image",1,"uploaded-alert-image",3,"click","src","alt"]` |
| **220** | `[1,"m-2","mx-auto","day-trade-alert-form"]` |
| **221** | `[1,"day-trade-alerts-container","m-2"]` |
| **222** | `[1,"m-2","mx-auto","day-trade-alert-form",3,"ngSubmit"]` |
| **223** | `["type","text","id","dayTradeAlert-symbol","placeholder","AAPL","minlength","1","name","dayTradeAlert-symbol","required","",1,"form-control",3,"ngModelChange","ngModel"]` |
| **224** | `["type","text","id","dayTradeAlert-entryPrice","placeholder","123.57","minlength","1","name","dayTradeAlert-entryPrice","required","",1,"form-control",3,"ngModelChange","ngModel"]` |
| **225** | `["type","text","id","dayTradeAlert-stop","placeholder","120.40","minlength","1","name","dayTradeAlert-stop","required","",1,"form-control",3,"ngModelChange","ngModel"]` |
| **226** | `["type","text","id","dayTradeAlert-target","placeholder","138.75","minlength","1","name","dayTradeAlert-target","required","",1,"form-control",3,"ngModelChange","ngModel"]` |
| **227** | `["type","text","id","dayTradeAlert-image","placeholder","Upload Image or Paste Image Link / Screenshot (optional)","minlength","1","name","dayTradeAlert-image",1,"form-control",3,"paste","ngModelChange","ngModel"]` |
| **228** | `["type","radio","name","dayTradeAlert-direction","id","dayTradeAlert-long","value","long","required","",1,"form-check-input",3,"ngModelChange","ngModel"]` |
| **229** | `["for","dayTradeAlert-long",1,"form-check-label","text-success","font-weight-bold"]` |
| **230** | `["type","radio","name","dayTradeAlert-direction","id","dayTradeAlert-short","value","short","required","",1,"form-check-input",3,"ngModelChange","ngModel"]` |
| **231** | `["for","dayTradeAlert-short",1,"form-check-label","text-danger","font-weight-bold"]` |
| **232** | `[1,"input-group","input-group-sm","dayTradeAlert-limit-container","m-2","ms-0"]` |
| **233** | `["type","number","step","5","min","0","id","dayTradeAlert-limit","aria-label","dayTradeAlert-limit",1,"form-control",3,"ngModelChange","ngModel"]` |
| **234** | `["title","Download Day Trades",1,"m-1","ms-4","download-day-trades-btn",3,"click"]` |
| **235** | `["type","search","id","dayTradeAlert-search","placeholder","Enter your search term","aria-label","dayTradeAlert-search","aria-describedby","dayTradeAlert-search",1,"form-control","form-control-sm","m-2","me-0",3,"ngModelChange","ngModel"]` |
| **236** | `[1,"p-1","day-trade-alert-btn-delete",3,"click"]` |
| **237** | `[1,"p-1","day-trade-alert-btn-edit",3,"click"]` |
