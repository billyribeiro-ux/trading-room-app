# Swing Trade Alerts — decoded, implementation-ready

Decoded 2026-08-15 from `apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`, the
**current** v4 bundle. Every value below is read from that file. Nothing is inferred.

**Day Trade Alerts is a structural twin of this** — every `swingAlert-*` id has a `dayTradeAlert-*`
counterpart in the same bundle. Build this one first, then port; the differences are what to decode
second, not the whole feature again.

---

## 0. Gap-closing pass — 2026-08-15

The six items open in section 6 of the previous revision were closed by reading the following
regions of `main.d1d09071be31f1ba.js` end to end. The file is 2,891,205 bytes and 2,891,205
characters, so character offsets and byte offsets are the same number. Every offset quoted in this
document was re-derived by exact string match, not estimated.

| what was read | offset range |
| --- | --- |
| `consts:[…]` array of `app-presentationarea`, all 292 tuples counted positionally | 1,994,264 – 2,014,220 |
| `swe` `rwe` `awe` `lwe` `cwe` `dwe` `uwe` `hwe` — image affordance and form | 1,933,226 – 1,936,183 |
| `pwe` `fwe` `mwe` `gwe` `_we` `bwe` `vwe` — options, empty state, row actions, row, table, pane | 1,936,183 – 1,939,468 |
| main template of `app-presentationarea`, create block and update block | 2,014,220 – 2,018,507 |
| nav-tab sub-templates `XCe` / `JCe` | 1,917,584 – 1,918,400 |
| `hasSwingTradeAlerts` field init and `ngOnInit` assignment | 1,954,900 – 1,956,200 |
| `hasSwingTradeAlerts` gate on log loading, `loadTradeAlerts` | 1,009,000 – 1,010,600 |
| `onSwingAlertSubmit` / `clearSwingAlertFields` / `onSwingAlertCancel` / `formatSwingAlertTxt` / `editSwingAlert` / `deleteSwingAlert` / `downloadSwingTrades` | 1,981,700 – 1,986,000 |
| `imgUpload` / `onImagePaste` / `showImagePreview` / `removeImageSwing` / `onTradeAlertWeeksChange` | 1,989,950 – 1,994,264 |
| `handleServerCmd` cases for the four swing commands | 1,017,600 – 1,018,800 |
| `searchSwingLogs` / `limitSwingLogs` pipe classes, and the `mo` / `Hr` / `zCe` / `GCe` constants | 1,915,100 – 1,916,900 |
| Angular `DatePipe`, the class registered under the pipe name `date` | 164,283 – 164,760 |
| `Li` (the repeater track function) and `O` (the conditional instruction) | 99,715 – 100,200 |
| the entire `styles:[…]` block of `app-presentationarea`, read in full | 2,018,560 – 2,032,230 |
| `styles.ee2a710065b60389.css`, checked for every swing class name | whole file, 444,793 bytes |

Closed: the const table, `swe`/`rwe`/`awe`, the log row template, the tab gate, the `pwe` option
template, and the icon indices. `senderName` is closed on the write side and reported as a
server-side unknown on the read side — see section 5c and section 6.

---

## VERIFICATION — that this is the right consts array

The consts array is flat and positional, so an index only means something once you have counted
tuples in the array that belongs to this component. The array used throughout this document begins
at offset **1,994,264**, immediately after the string `consts:` at 1,994,257, inside
`ɵɵdefineComponent({type:t, selectors:[["app-presentationarea"]], decls:90, vars:69, …})`. Counting
top-level tuples from zero yields **292** entries, ending at offset 2,014,220.

The check: index **173** must be the Symbol input, because `hwe` opens it as `d(5,"input",173)` and
the Symbol field was already decoded in the previous revision.

Counting to position 173 lands at offset **2,005,252** and yields:

```js
["type","text","id","swingAlert-symbol","placeholder","AAPL","minlength","1",
 "name","swingAlert-symbol","required","",1,"form-control",3,"ngModelChange","ngModel"]
```

That is the Symbol input, exactly as already documented. Second check: index **183** must be the
Long radio. Position 183 is at offset 2,006,509 and yields the `swingAlert-direction` /
`swingAlert-long` / `value="long"` tuple. Third check: index **3** must be the tab-strip `<ul>`,
because the main template opens `d(1,"ul",3)`; position 3 is at offset 1,994,343 and yields
`["id","mainTabs","role","tablist",1,"nav","nav-tabs","mainTabset",3,"hidden"]`. All three checks
pass, so the array is the right one and every index below is resolved against it.

**How to read a tuple.** Literal attributes come first as name/value pairs. Then a marker integer
changes the meaning of everything after it: `1` starts class names, `2` starts style name/value
pairs, `3` starts the names of bound properties and events. This is read directly from index 263 of
the same array, `["alt","Image",1,"fileDriveImg",2,"background-color","#000",3,"src"]`, where the
three sections are unambiguous.

---

## 1. Where it lives

A presentation-area tab: **`presAreaTabs-swingAlerts`**, labelled **"Swing Alerts"**, alongside
`screens`, `notes`, `files`, `videoplayer`, `streams`, `recordings` and `dayTradeAlerts`.

Container: `<div class="swing-alerts-container m-2">`

The nav item (`XCe`, offset 1,917,584) and the pane (`vwe`, offset 1,938,750) resolve to:

```html
<li role="presentation" class="nav-item" (click)="onMainTabChange('presAreaTabs-swingAlerts')">
  <a id="swingAlerts-tab" data-bs-toggle="tab" data-bs-target="#swingAlerts" role="tab"
     aria-controls="swingAlerts" aria-selected="true" class="nav-link"
     [ngClass]="{active: selectedMainTab === 'presAreaTabs-swingAlerts'}">
    <div class="d-flex align-items-center"><div><i class="fas fa-bell"></i>
    <span class="…">Swing Alerts</span></div></div>
  </a>
</li>

<div id="swingAlerts" role="tabpanel" aria-labelledby="swingAlerts-tab"
     class="tab-pane position-relative"
     [ngClass]="{'show active': selectedMainTab === 'presAreaTabs-swingAlerts'}">
```

`d(0,"div",27)` at offset 1,938,788 opens the pane. The pane height comes from the component's own
stylesheet, offset 2,022,161:

```css
#dayTradeAlerts, #swingAlerts { overflow-y: auto; height: calc(100% - 40px); }
```

---

## 2. The form — `hwe`

`hwe` begins at offset 1,933,979.

```html
<form class="m-2 mx-auto swing-alert-form" (ngSubmit)="onSwingAlertSubmit()">
```

Each field is a group (`input-group`) with a `<span>` label then the input.

| # | label | model | input attributes, verbatim |
| --- | --- | --- | --- |
| 1 | `Symbol` | `swingAlert.symbol` | `type=text` `id/name=swingAlert-symbol` `placeholder="AAPL"` `minlength=1` **required** `class=form-control` |
| 2 | `Entry Price` | `swingAlert.entryPrice` | `type=text` `id/name=swingAlert-entryPrice` `placeholder="123.57"` `minlength=1` **required** |
| 3 | `Stop` | `swingAlert.stop` | `type=text` `id/name=swingAlert-stop` `placeholder="120.40"` `minlength=1` **required** |
| 4 | `Target` | `swingAlert.target` | `type=text` `id/name=swingAlert-target` `placeholder="138.75"` `minlength=1` **required** |
| 5 | *(image, no label)* | `swingAlert.image` | `type=text` `id/name=swingAlert-image` `placeholder="Upload Image or Paste Image Link / Screenshot (optional)"` `minlength=1` **NOT required**, has a `paste` handler |

All five rows sit in `<div class="form-group input-group mb-1">` (index 171) — slots 2, 6, 10, 14
and 18. The first four put their label in
`<span class="input-group-text bg-secondary border-secondary text-white">` (index 172); the image
row uses that same wrapper class but fills the leading slot with the preview or the upload button
instead of a label.

> **Note the types.** Entry price, stop and target are `type="text"`, **not** `type="number"`. Do not
> "improve" that — a numeric input changes keyboard, validation and locale behaviour, and this is a
> match.

Form sizing, from the component stylesheet at offset 2,023,101:

```css
.swing-alert-form { font-size: 12px; max-width: 600px; }
.swing-alert-form .input-group-text { width: 105px; font-size: 12px; }
.swing-alert-form .form-control { font-size: 12px; }
.swing-alert-form #swingAlert-long, .swing-alert-form #swingAlert-short { margin-top: 3px; }
```

### The model object

Read from the field initialiser at offset 1,955,146 and from `clearSwingAlertFields` at 1,983,629 —
the two are byte-identical, which is what makes reset total:

```js
this.swingAlert = { alertTxt:"", direction:"long", symbol:"", entryPrice:"", stop:"",
                    target:"", senderName:"", edit:!1, alertLogID:"", image:"", txtInAlerts:"" }
```

**`direction` defaults to `"long"`.** `alertTxt`, `alertLogID` and `txtInAlerts` are model fields
with no input in the template — they are populated by `editSwingAlert` and consumed by the
alerts-feed mirror described in section 5.

### Direction — two radios, and the colours are structural

`d(23,"div",180)` at offset 1,935,137 opens a flex row that holds the direction group on the left
and the button row on the right:

```html
<div class="d-flex align-items-center justify-content-between flex-wrap">   <!-- 180, slot 23 -->
  <div class="form-group mb-0 ms-1">                                        <!-- 181, slot 24 -->
    <div class="form-check form-check-inline ms-2">                         <!-- 182, slot 25 -->
      <input type="radio" name="swingAlert-direction" id="swingAlert-long"  value="long"  required class="form-check-input">
      <label for="swingAlert-long"  class="form-check-label text-success font-weight-bold"> Long </label>
    </div>
    <div class="form-check form-check-inline">                              <!-- 185, slot 29 -->
      <input type="radio" name="swingAlert-direction" id="swingAlert-short" value="short" required class="form-check-input">
      <label for="swingAlert-short" class="form-check-label text-danger  font-weight-bold"> Short </label>
    </div>
  </div>
  <div class="text-end"> … the two buttons … </div>                         <!-- 188, slot 33 -->
</div>
```

Both radios bind `swingAlert.direction`. `text-success` / `text-danger` are Bootstrap classes — keep
them as classes, do not resolve to colours. The label text is `" Long "` and `" Short "` with the
leading and trailing spaces, from `v(28," Long ")` at offset 1,935,339. Note that the Long wrapper
carries `ms-2` (index 182) and the Short wrapper does not (index 185).

### Image paste, upload, preview and clear — `swe`, `rwe`, `awe` (CLOSED)

The image row holds three slots. `hwe` creates them at offset 1,934,853:

```js
d(18,"div",171),
  H(19, swe, 2, 2, "span", 177)(20, rwe, 3, 0),   // slot 19, two alternatives   [1,934,869]
  d(21,"input",178), x("paste", o => onImagePaste(o,"swing")), Ve("ngModelChange", …), u(),
  H(22, awe, 2, 0, "span", 179),                  // slot 22, one alternative    [1,935,108]
u()
```

and switches them in the update block at offset 1,935,924:

```js
O(19, e.swingAlert.image ? 19 : 20)
O(22, e.swingAlert.image ? 22 : -1)
```

`O` is `ɵɵconditional(containerIndex, matchingTemplateIndex, contextValue)` — read from its
definition at offset 99,715, where the second parameter is compared against `-1` and then used as
the template index to instantiate. So slot 19 renders `swe` when `swingAlert.image` is truthy and
`rwe` when it is falsy; slot 22 renders `awe` when the image is truthy and nothing at all when it is
falsy.

**`swe` — the preview, shown only when `swingAlert.image` is set.** Offset 1,933,226.

```html
<span title="Click to view image"
      class="input-group-text bg-secondary border-secondary text-white text-center p-0 d-block"
      (click)="showImagePreview(swingAlert.image)">
  <img class="d-inline-block uploaded-img-preview" [src]="swingAlert.image" [alt]="swingAlert.image">
</span>
```

**`rwe` — the upload button, shown only when `swingAlert.image` is empty.** Offset 1,933,472. It
occupies the same slot as the preview, so the two are mutually exclusive.

```html
<span title="Upload Image"
      class="input-group-text bg-secondary border-secondary text-white img-upload-btn"
      (click)="imgUpload('swing')">
  <i class="fas fa-image me-1"></i> Image
</span>
```

The text node is `v(2," Image ")` — a leading and a trailing space.

**`awe` — the clear button, shown only when `swingAlert.image` is set.** Offset 1,933,621. It sits
*after* the input, so the row reads preview, input, clear.

```html
<span title="Remove Image"
      class="input-group-text bg-danger border-danger text-white remove-image-btn"
      (click)="removeImageSwing()">
  <i class="fas fa-times"></i>
</span>
```

> The icon in `awe` is const index **92**, `[1,"fas","fa-times"]` — no `me-1`. It is not index 197.
> `T(1,"i",92)` is at offset 1,933,737. Index 92 is shared with the volume-dropdown close control
> earlier in the same component.

`removeImageSwing()` at offset 1,993,471 is one statement: `this.swingAlert.image = ""`. Nothing
else is reset, so clearing the image does not touch the rest of the form.

`imgUpload("swing")` at offset 1,990,081 opens a `bootbox.dialog` containing
`<label class='upload-area' style='width:100%;text-align:center;' for='fupload'>` and a hidden
`<input id='fupload' name='fupload' type='file' style='display:none;' multiple='false' accept='image/*'>`
above the text `Click to select images to upload`.

`showImagePreview(e, i = "")` at offset 1,992,730 opens a `bootbox.dialog` with `title: i` whose
message is `<div class="text-center"><img src="${e}" class="img-fluid" alt="${e}" /></div>`. The
matching rule, at style offset 2,026,976, is
`.img-fluid { max-width:100%; max-height:70vh; display:block; margin:0 auto; }`.

```js
x("paste", (o) => onImagePaste(o, "swing"))
```

**`onImagePaste` takes a second argument naming the feature** — `"swing"`. Day Trade will pass its
own. Whatever we build has to carry that discriminator. The handler at offset 1,992,250 reads
`(e.clipboardData || e.originalEvent.clipboardData).items`, keeps the last item whose `type` starts
with `image`, calls `URL.createObjectURL` on it and puts it in a `bootbox.confirm` before uploading.

Sizing for all three image elements, from the component stylesheet at offset 2,026,319:

```css
.alert-sender-img, .uploaded-alert-image, .uploaded-img-preview {
  width: auto; height: 100%; max-height: 30px; object-fit: contain;
}
.remove-image-btn { width: 36px !important; }
.uploaded-alert-image:hover, .uploaded-img-preview:hover,
.img-upload-btn:hover, .remove-image-btn:hover { cursor: pointer; }
```

### The two buttons, and they change label in edit mode

`d(33,"div",188)` at offset 1,935,558:

```html
<div class="text-end">
  <button type="button" class="btn btn-secondary btn-sm m-1" (click)="onSwingAlertCancel()">…</button>
  <button type="submit" class="btn btn-primary btn-sm m-1">…</button>
</div>
```

```js
O(35, e.swingAlert.edit ? 35 : 36)   // left button contents    [1,936,117]
O(38, e.swingAlert.edit ? 38 : 39)   // right button contents
```

| button | click | when `edit` | otherwise |
| --- | --- | --- | --- |
| left | `onSwingAlertCancel()` | slot 35 = `lwe` — `<i class="fas fa-trash me-1">` + `Discard ` | slot 36 = `cwe` — `<i class="fas fa-times me-1">` + `Cancel ` |
| right | *(form submit)* | slot 38 = `dwe` — `<i class="fas fa-save me-1">` + `Save Changes ` | slot 39 = `uwe` — `<i class="fas fa-bell me-1">` + `Submit Alert ` |

> **Correction to the previous revision.** It said the left button was "`lwe` — icon 197 + `Cancel `"
> when `edit`, and `cwe` otherwise, with `cwe` left unspecified. The two bodies, at offsets
> 1,933,754 and 1,933,808, are verbatim
> `function lwe(t,n){1&t&&(T(0,"i",196),v(1,"Discard "))}` and
> `function cwe(t,n){1&t&&(T(0,"i",197),v(1,"Cancel "))}`.
> So the edit-mode label is **`Discard `** with a **trash** icon, and the create-mode label is
> `Cancel ` with a times icon. The icon index was off by one and the edit-mode word was wrong.

All four labels carry a trailing space and no leading space: `"Discard "`, `"Cancel "`,
`"Save Changes "`, `"Submit Alert "`.

So **`swingAlert.edit` is the mode flag** and the same form serves create and edit.

### Cancel is guarded

`onSwingAlertCancel()` at offset 1,983,802:

```js
(symbol || entryPrice || stop || target || image) &&
  bootbox.confirm(`Are you sure you want to ${edit ? "discard" : "clear"} inputs for this alert?`,
                  i => { i && this.clearSwingAlertFields() })
```

With every field empty, the button does nothing at all — no dialog.

### Submit is validated twice and then confirmed

`onSwingAlertSubmit()` at offset 1,981,965. First a combined guard, then per-field messages, all
through `bootbox.alert`, verbatim:

| condition | message |
| --- | --- |
| any of symbol / entryPrice / stop / target falsy | `Please, fill in required fields.` (offset 1,982,116) |
| trimmed symbol empty | `Please, fill in "symbol" field.` |
| trimmed entryPrice empty | `Please, fill in "entry price" field.` |
| trimmed stop empty | `Please, fill in "stop" field.` |
| trimmed target empty | `Please, fill in "target" field.` |

Then ``bootbox.confirm(`Are you sure you want to ${edit ? "save" : "send"} this alert?`, …)``.
`image` is trimmed alongside the others but is never validated. On confirm,
`clearSwingAlertFields()` runs unconditionally.

---

## 3. The log list

### The heading and the months select — `pwe` (CLOSED)

`vwe` at offset 1,938,750 builds the pane. `d(2,"div",165)` at offset 1,938,828 opens the list
container. The heading is one `<h4>` with a `<select>` inline in the sentence:

```html
<h4 class="text-center m-0 p-1 px-3">
  Latest Swing Trade Alerts (Last
  <select class="form-select form-select-sm d-inline-block w-auto trade-alerts-select"
          [(ngModel)]="swingAlertMonths"
          (ngModelChange)="onTradeAlertWeeksChange('Swing')">
    @for (e of [1..20]; track e) { <option [ngValue]="e">{{ e }}</option> }
  </select>
  Months)
</h4>
```

The two text nodes are `v(4," Latest Swing Trade Alerts (Last ")` at offset 1,938,855 and
`v(8," Months) ")`, both with leading and trailing spaces. `d(5,"select",167)` is at 1,938,896.

**`pwe` is the `<option>` of that select** — the only `<option>` template in the swing feature.
Offset 1,936,183:

```js
function pwe(t,n){ if(1&t&&(d(0,"option",168),v(1),u())),
                   2&t&&(const e = n.$implicit, z("ngValue",e), m(), Ze(e)) }
```

Const 168 is `[3,"ngValue"]`, so the only binding is `[ngValue]`, and the visible text is the value
itself.

**What populates it:** the repeater at offset 1,939,108 is `ht(6, pwe, 2, 2, "option", 168, Li)` and
its collection is `pt(To(6, zCe))`. `zCe` is defined at offset 1,916,549 as

```js
const zCe = () => [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]
```

so the options are the integers **1 through 20**, each rendered as its own label. `Li` is the track
function, defined at offset 100,136 as `function Li(t,n){return n}` — identity, i.e. `track item`.
The Day Trade twin uses `WCe`, `() => [1..15]` at offset 1,916,648 — a different length, which is
one of the differences to carry across on the port.

`swingAlertMonths` initialises to **2** (offset 1,955,344). `swingAlertLimit` initialises to **10**
and `swingAlertSearch` to `""`.

`onTradeAlertWeeksChange("Swing")` at offset 1,993,565:

```js
const i = "Swing" === e ? 30 * this.swingAlertMonths : 4 * this.dayTradeAlertMonths * 7;
this.appService.globals["Swing" === e ? "swingAlertsLog" : "dayTradeAlertsLog"] = [];
let s = this.appService.globals.sessData[`linkedRoom${e}AlertsOther`];   // offset 1,993,765
s = s?.trim();
this.appService.sendServerCommand(`get${e}AlertsLog`,
  { sessionID: s || this.appService.globals.sessionID, days: i });
```

**Swing converts months to days as `30 * months`; Day Trade converts to `28 * months`.** Changing
the select clears the local log to `[]` first, so the list empties while the refetch is in flight.

`.trade-alerts-select { font-size:12px; vertical-align:bottom; }` — style offset 2,031,534.

### Empty state — `fwe`

Verbatim including its spaces, with the class now resolved from index 169. `fwe` is at offset
1,936,289:

```html
<h4 class="text-center m-0 p-1 px-3 bg-secondary"> No Swing Trade Alerts to display. </h4>
```

Both headings are coloured by the container rule at style offset 2,024,836:

```css
.swing-alerts-container h4 { background-color: #08668e; color: #fff; }
```

The switch, from `vwe`'s update block at offset 1,939,373:

```js
O(9, e.appService.globals.swingAlertsLog && 0 === e.appService.globals.swingAlertsLog.length ? 9 : 10)
```

Slot 9 is `fwe` (created at offset 1,939,163), slot 10 is `bwe` (the controls plus table). The
condition tests the **unfiltered** log, so a search that matches nothing shows an empty table, not
the empty-state heading.

### The table — `bwe`

Offset 1,937,634. Controls first, then the table at `d(11,"div",206)`, offset 1,938,146:

```html
<div class="table-responsive">
  <table class="table table-striped">
    <thead><tr>
      <th>Symbol</th><th>Long/Short</th><th>Alert Date</th><th>Entry Price</th>
      <th>Stop</th><th>Target</th><th>Image</th><th>Sender</th>
    </tr></thead>
    <tbody>
      @for (row of globals.swingAlertsLog | searchSwingLogs:swingAlertSearch | limitSwingLogs:swingAlertLimit; track row) { … }
    </tbody>
  </table>
</div>
```

Eight headers, in that order, no surrounding spaces; the first is `v(16,"Symbol")` at offset
1,938,208. The repeater at offset 1,938,465 is `ht(32, _we, 23, 17, "tr", null, Li)` — identity
track again, so **no `_id` track function**; the `pc = (t,n) => n._id` helper at offset 1,916,266
exists in this file but is not used here.

```css
.swing-alerts-container .table { font-size: 12px; }
.swing-alerts-container .table th,
.swing-alerts-container .table td { text-align: center; vertical-align: middle; }
```
— style offset 2,024,171.

### The log ROW template — `_we` (CLOSED)

Offset 1,936,897. Eight `<td>`s, matching the eight headers:

```html
<tr>
  <td>
    <span [ngClass]="{'swing-symbol-container': isP}">
      @if (isP) { <!-- mwe: delete | edit --> }
      <strong class="ms-2 font-weight-bold"> {{ row.symbol }} </strong>
    </span>
  </td>
  <td>{{ row.direction }}</td>
  <td> {{ row.entryDate | date:'YYYY-MM-dd hh:mm:ss' }} </td>
  <td>{{ row.entryPrice }}</td>
  <td>{{ row.stop }}</td>
  <td>{{ row.target }}</td>
  <td class="text-center align-middle p-0 m-0">
    @if (row.image) { <!-- gwe: the image --> }
  </td>
  <td class="p-0">
    <strong class="mx-1 font-weight-bold">{{ row.senderName }}</strong>
    <img class="alert-sender-img"
         [src]="row.senderPic || 'https://secure.gravatar.com/avatar/' + row.senderAvt + '?d=mm&s=30'"
         [alt]="row.senderName">
  </td>
</tr>
```

`d(4,"strong",209)` is at offset 1,936,969, `H(3,mwe,6,0)` at 1,936,956, `d(17,"td",210)` at
1,937,115, `H(18,gwe,1,2,"img",211)` at 1,937,130 and `d(19,"td",212)` at 1,937,158.

**Field order:** `symbol`, `direction`, `entryDate`, `entryPrice`, `stop`, `target`, `image`,
`senderName` + sender avatar. That is the header order and the CSV order, all three identical.

**How `direction` is styled, long vs short: it is not.** The `<td>` at slot 6 is created as
`d(6,"td")` with **no const index**, so it carries no attributes, no class and no `ngClass`; the
value is written by `Ze(e.direction)`, a plain interpolation with no pipe. I read the component's
entire `styles:[…]` block (offsets 2,018,560 – 2,032,230) and found no rule keyed on a long/short
value, and `styles.ee2a710065b60389.css` contains **zero** occurrences of any of
`swing-symbol-container`, `swing-alert-form`, `swing-alerts-container`, `uploaded-alert-image`,
`alert-sender-img`, `swing-alert-btn-delete`, `swing-alert-btn-edit`, `uploaded-img-preview`,
`trade-alerts-select`, `download-swing-trades-btn`, `swingAlert-limit-container`, `remove-image-btn`
or `img-upload-btn` — every swing rule lives in the component block. **The log row prints the raw
string `long` or `short` in the app's default text colour.** The green/red pair exists only on the
form's radio labels (`text-success` / `text-danger`, indices 184 and 187). Do not add colour to the
row on the strength of the form's colours; if the room wants it, that is a deliberate change, not a
match.

**How the price fields are formatted: they are not.** `entryPrice`, `stop` and `target` each go
through `Ze(…)` — a bare interpolation with no pipe, no `toFixed`, no currency. They are stored as
the strings the `type="text"` inputs produced and rendered back verbatim. `symbol` is
`Ne(" ", e.symbol, " ")` — one space either side inside the `<strong>`.

**The date is the only formatted field.** At offset 1,937,378,
`Ct(10, 12, e.entryDate, "YYYY-MM-dd hh:mm:ss")` binds the pipe registered under the name `date`.
That pipe class is in this component's `dependencies` array as `os`, and `os` is defined at offset
164,283 with `ɵɵdefinePipe({name:"date", type:t, pure:!0, standalone:!0})` at offset 164,709 and a
`transform` that delegates to Angular's `formatDate` — it is the stock `@angular/common` `DatePipe`.
The format string passed is the literal **`YYYY-MM-dd hh:mm:ss`**. Under Angular's field syntax
`YYYY` is the week-numbering year, `hh` is the 12-hour clock, and there is no `a` field, so no AM/PM
marker is emitted. The whole cell is `Ne(" ", …, " ")` — one space either side.

**How the image is shown — `gwe`.** Offset 1,936,683. Rendered only when `row.image` is truthy —
`O(18, e.image ? 18 : -1)` at offset 1,937,479. When the row has no image the cell is empty.

```html
<img title="Click to view image" class="uploaded-alert-image"
     [src]="row.image" [alt]="row.image" (click)="showImagePreview(row.image)">
```

The `<td>` around it is `class="text-center align-middle p-0 m-0"` (index 210) and the image is
capped at `max-height: 30px` by the shared rule quoted in section 2. Clicking opens the same
`bootbox` lightbox the form preview uses.

**The sender cell** reads `Ze(e.senderName)` at offset 1,937,504 and binds the avatar at offset
1,937,533 as `e.senderPic || "https://secure.gravatar.com/avatar/" + e.senderAvt + "?d=mm&s=30"`.

**The symbol cell's `ngClass`** is `ct(15, GCe, i.isP)` at offset 1,937,272, and `GCe` at offset
1,916,610 is `t => ({"swing-symbol-container": t})`. So the class is applied only for a presenter:

```css
.swing-symbol-container { width:100%; max-width:150px; text-align:left; display:block; margin:0 auto 0 24%; }
```
— style offset 2,022,891. For a non-presenter the `<span>` has no class and the cell centres
normally.

### Row actions — `mwe`

A delete span, a literal `|` separator, then an edit span. Offset 1,936,375:

```js
d(0,"span",215), x("click", () => deleteSwingAlert(o._id, o)), T(1,"i",216), u(),
d(2,"span",142), v(3,"|"), u(),
d(4,"span",217), x("click", () => editSwingAlert(o)), T(5,"i",218), u()
```

```html
<span class="p-1 swing-alert-btn-delete" (click)="deleteSwingAlert(row._id, row)"><i class="fa fa-trash"></i></span>
<span class="mx-2">|</span>
<span class="p-1 swing-alert-btn-edit"   (click)="editSwingAlert(row)"><i class="fa fa-edit"></i></span>
```

Classes: `swing-alert-btn-delete` and `swing-alert-btn-edit`, both `p-1`; the separator is `mx-2`.
**Delete passes both `_id` and the whole row object.** Both spans get
`:hover { opacity:.75; cursor:pointer }` from the shared rule at style offset 2,022,557.

**The row actions are presenter-only** — `O(3, i.isP ? 3 : -1)` at offset 1,937,294. A
non-presenter sees the symbol with neither button and no separator.

`editSwingAlert(row)` at offset 1,984,272 does more than fill the form:

```js
this.swingAlert = { ...row };
this.swingAlert.edit = !0;
const o = this.formatSwingAlertTxt(row);
for (const r of this.appService.globals.alertsLog)
  if (r.txt == o) { this.swingAlert.alertLogID = await r._id; this.swingAlert.txtInAlerts = r.txt; break; }
$(".swing-alert-form").addClass("animated flash");            // offset 1,984,559
setTimeout(() => $(".swing-alert-form").removeClass("animated flash"), 500);
```

It spreads the whole row into the model (so `_id`, `entryDate`, `senderPic` and `senderAvt` ride
along), then **matches the row against the main alerts feed by formatted-text equality** to recover
the feed message's `_id`. It also flashes the form for 500 ms via the `animated flash` classes.

`deleteSwingAlert(id, row)` at offset 1,984,681 confirms with the verbatim string
`Are you sure you want to DELETE this alert?` (offset 1,984,720), sends `deleteSwingAlertMsg`, then
performs the same formatted-text scan of `alertsLog` to find and delete the mirrored feed message.

---

## 4. Search, limit, export

The control strip is `bwe`'s first block, `d(0,"div",180)(1,"div",12)(2,"div",200)` at offset
1,937,672:

```html
<div class="d-flex align-items-center justify-content-between flex-wrap">
  <div class="d-flex align-items-center">
    <div class="input-group input-group-sm swingAlert-limit-container m-2 ms-0">
      <span class="input-group-text">Show</span>
      <input type="number" step="5" min="0" id="swingAlert-limit" aria-label="swingAlert-limit"
             class="form-control" [(ngModel)]="swingAlertLimit">
      <span class="input-group-text">entries</span>
    </div>
    <span title="Download Swing Trades" class="m-1 ms-4 download-swing-trades-btn"
          (click)="downloadSwingTrades()"><i class="fas fa-save"></i></span>
  </div>
  <input type="search" id="swingAlert-search" placeholder="Enter your search term"
         aria-label="swingAlert-search" aria-describedby="swingAlert-search"
         class="form-control form-control-sm m-2 me-0" [(ngModel)]="swingAlertSearch">
</div>
```

| control | attributes |
| --- | --- |
| search | `type=search` `id=swingAlert-search` `placeholder="Enter your search term"` `aria-label`/`aria-describedby=swingAlert-search` `class="form-control form-control-sm m-2 me-0"` |
| limit | `type=number` **`step=5`** `min=0` `id=swingAlert-limit` `aria-label=swingAlert-limit` `class=form-control`, wrapped in `input-group input-group-sm swingAlert-limit-container m-2 ms-0`, flanked by the literal words `Show` and `entries` |
| export | title `Download Swing Trades`, class `m-1 ms-4 download-swing-trades-btn`, icon `fas fa-save` |

```css
.download-swing-trades-btn { font-size:18px; background-color:#08668e; padding:3px 11px;
                             color:#fff; border-radius:6px; line-height:24px; }
.download-swing-trades-btn:hover { opacity:.75; cursor:pointer; }
.swing-alerts-container #swingAlert-search,
.swing-alerts-container .swingAlert-limit-container { width: 100%; }
.swing-alerts-container #swingAlert-search { max-width: 300px; }
.swing-alerts-container .swingAlert-limit-container { max-width: 180px; }
```
— style offsets 2,022,363, 2,022,557 and 2,024,939.

### The two pipes, read from source

`searchSwingLogs` is class `PCe` at offset 1,915,251 (pipe name at 1,915,487); `limitSwingLogs` is
class `RCe` at offset 1,915,541 (pipe name at 1,915,685). Both are `pure: !0`:

```js
// searchSwingLogs — matches symbol OR senderName, both lowercased
transform(e,i){ return e ? (i ? (i = i.toLowerCase(),
  e.filter(o => o.symbol.toLowerCase().includes(i) || o.senderName.toLowerCase().includes(i))) : e) : [] }

// limitSwingLogs — plain head
transform(e,i){ return e && 0 !== i ? e.slice(0,i) : [] }
```

**`limitSwingLogs` returns `[]` when the limit is 0**, not the whole list. Reproduce that. Note also
that `searchSwingLogs` dereferences `o.symbol` and `o.senderName` without optional chaining (offset
1,915,362), while the Day Trade twin `searchDayTradeLogs`, class `ICe` at offset 1,915,738, uses
`o?.symbol?.toLowerCase?.()` — the swing pipe throws on a row missing either field, the day-trade
one does not.

### The CSV export

`downloadSwingTrades()` at offset 1,985,029. Header row at offset 1,985,151, verbatim including the
space before the line break:

```
Symbol, Long/Short, Alert Date, Entry Price, Stop, Target, Image, Sender \r\n
```

Each data row is built by hand with `"` around every field and `\r\n` at the end. The date uses
`new Date(row.entryDate).toLocaleTimeString("en-us", {year:"numeric", month:"numeric", day:"numeric",
hour:"2-digit", minute:"2-digit"})`. A row whose `image` is empty after `?.trim()` exports the
literal string `n/a`. `row.senderName` is written at offset 1,985,533. The whole loop is inside
`try { … } catch (l) { console.error(l) }`, per row. Blob type `text/csv;charset=utf-8`, filename
`` `SwingLog_${sessionID}.csv` `` at offset 1,985,725.

**The export ignores both the search box and the limit** — it iterates
`globals.swingAlertsLog` directly, not the piped view.

---

## 5. Wire commands

### Client → server

| command | payload | sent from |
| --- | --- | --- |
| `getSwingAlertsLog` | `{ sessionID, days }` | `loadTradeAlerts("Swing")`, offset 1,010,116, with **`days: 42`** (offset 1,010,251); and `onTradeAlertWeeksChange("Swing")`, offset 1,993,565, with `days: 30 * swingAlertMonths` |
| `swingAlertMsg` | the alert object `h` | `onSwingAlertSubmit`, create branch, offset 1,983,314 |
| `editSwingAlertMsg` | `{ newSwingAlertMsg: h, swingAlertID: swingAlert._id }` | `onSwingAlertSubmit`, edit branch, offset 1,982,972 |
| `deleteSwingAlertMsg` | `{ swingAlertID: _id }` | `deleteSwingAlert`, offset 1,984,791 |
| `editAlertMessageSwing` | `{ alertID: alertLogID, newAlertMsg, swingTradeAlert: !0, txt: txtInAlerts }` | edit branch, offset 1,983,117 |
| `alertMsg` | the mirrored feed message, create branch only | offset 1,983,565 |

> **Correction to the previous revision.** It listed `newSwingAlertMsg` as the create command. Read
> at offset 1,983,314, the create command is **`swingAlertMsg`**; `newSwingAlertMsg` is a *field name
> inside* the `editSwingAlertMsg` payload, and separately the name of a **server → client** push.
> The previous revision also listed four commands; there are six on the client → server side, because
> creating and editing a swing alert also writes a mirrored message into the main alerts feed.

The alert object sent on both create and edit, offset 1,982,748:

```js
const h = { alertTxt: e, direction: this.swingAlert.direction, symbol: i, entryPrice: o,
            stop: s, target: r, image: a,
            senderName: this.appService.globals.user.nick || this.appService.globals.user.name };
```

`e`, `i`, `o`, `s`, `r`, `a` are the trimmed `alertTxt`, `symbol`, `entryPrice`, `stop`, `target`
and `image`. `_id`, `entryDate`, `senderPic` and `senderAvt` are **not** sent.

The mirrored feed text comes from `formatSwingAlertTxt`, offset 1,984,092:

```js
let i = "#SwingTrade \n";
i += `${e.symbol} - ${e.direction} - Entry ${e.entryPrice} - Exit ${e.stop} - Target ${e.target}`;
e.image && (i += `\n${e.image}`);
```

Note `Exit` for the stop field and the space before `\n` in the hashtag line (offset 1,984,122). The
create branch wraps it as `{ txt, n: user.nick || user.name, sendTxt:!1, sendEmail:!1, sendTweet:!1,
dontPush:!1, nonTradeAlert:!1, swingTradeAlert:!0 }`.

### Server → client

Read from `handleServerCmd`, `case"getSwingAlertsLog"` at offset 1,017,718 and the three cases that
follow it:

| command | effect |
| --- | --- |
| `getSwingAlertsLog` | logs `handleServerCmd got getSwingAlertsLog:`, then `data.reverse()` and `globals.swingAlertsLog = data`, then emits `getSwingAlertsLog` on `appEventBus` |
| `newSwingAlertMsg` | `globals.swingAlertsLog = [data.newSwingAlertMsg, ...globals.swingAlertsLog]` — prepend |
| `deleteSwingAlertMsg` | splices out the entry whose `_id === data.swingAlertID`, then reassigns the array |
| `editSwingAlertMsg` | replaces the entry whose `_id === data.swingAlertID` with **`data.swingMsg`**, then reassigns |

Each handler bails on `if (!i || !i.data) return`. **The list is reversed on load and new rows are
prepended**, so the display order is newest first, and the server sends oldest first.

Row shape, from every field the templates, pipes, handlers and CSV touch: `_id`, `symbol`,
`senderName`, `senderPic`, `senderAvt`, `entryPrice`, `stop`, `target`, `image`, `direction`
(`"long"` | `"short"`), `entryDate`. The timestamp field is **`entryDate`**, not `created` — read
from `_we`, where the expression `e.entryDate,"YYYY-MM-dd hh:mm:ss"` begins at offset 1,937,378, and
from the CSV builder.

> **Correction to the previous revision.** It gave the timestamp field as `created`. The string
> `created` does not appear on any swing path; the row template and the CSV both read `entryDate`.
> The identifier occurs at exactly four offsets in the whole bundle — 1,937,380 and 1,943,725 (the
> two row templates) and 1,985,431 and 1,989,642 (the two CSV builders).

---

## 5b. Where the tab is gated (CLOSED)

Three separate gates, at three levels. None of them is presenter-only at the tab level.

**1. The whole tab strip is hidden in viewer-only mode.** The main template creates
`d(1,"ul",3)` where index 3, at offset 1,994,343, is
`["id","mainTabs","role","tablist",1,"nav","nav-tabs","mainTabset",3,"hidden"]`, and the update block
binds `z("hidden", o.appService.globals.viewerOnlyMode)` at offset 2,016,365. This is the strip, not
the swing tab specifically.

**2. The swing nav item and the swing pane are gated on a room setting.** From the update block at
offsets 2,016,906 and 2,017,703:

```js
O(26, o.hasSwingTradeAlerts ? 26 : -1)   // the <li> nav item, XCe
O(48, o.hasSwingTradeAlerts ? 48 : -1)   // the <div id="swingAlerts"> pane, vwe
```

`hasSwingTradeAlerts` is a component field initialised to `!1` at offset 1,955,118 and assigned once
in `ngOnInit` at offset 1,955,884:

```js
this.hasSwingTradeAlerts = this.appService.globals.sessData.hasSwingTradeAlerts;
```

The same flag gates the initial fetch, in `loadSessionLogs()` at offset 1,009,408:

```js
this.globals.sessData.hasSwingTradeAlerts && this.loadTradeAlerts("Swing");
```

**So the tab is gated by a per-room server setting, `sessData.hasSwingTradeAlerts`** — not by
presenter status, and not ungated. It is read once in `ngOnInit`, so it does not react to a later
`sessData` change. When it is false the nav item, the pane and the fetch are all absent.

`sessData` also carries `linkedRoomSwingAlertsOther`: when that string is non-empty after `trim()`,
both `loadTradeAlerts` (offset 1,010,146) and `onTradeAlertWeeksChange` (offset 1,993,765) fetch the
log using **that** room's `sessionID` instead of the current one. A room can therefore display
another room's swing log.

**3. Inside the pane, presenter status gates the form and the row buttons.** `isP` is assigned in
the constructor at offset 1,954,051 as `this.isP = this.appService.globals.isPresenter`.

| gated thing | expression | offset |
| --- | --- | --- |
| the whole `<form>` | `O(1, e.isP ? 1 : -1)` in `vwe`; created as `H(1,hwe,40,11,"form",164)` at 1,938,802 | 1,939,296 |
| the delete/edit row buttons | `O(3, i.isP ? 3 : -1)` in `_we` | 1,937,294 |
| the `swing-symbol-container` class | `ct(15, GCe, i.isP)` in `_we` | 1,937,272 |

A non-presenter in a room with the setting on sees the tab, the heading, the months select, the
search box, the limit box, the download button and the full table — but no form and no row actions.

**Note the mismatch on first load.** `loadTradeAlerts("Swing")` sends `days: 42`, while the select
that describes the window initialises to `2` and would send `days: 60`. The first list shown is
therefore 42 days of data under a label that reads "Last 2 Months". Changing the select once
reconciles them. This is read from three places: offset 1,010,251 (`o.days = 42`), 1,955,344
(`this.swingAlertMonths = 2`) and 1,993,565 (`30 * this.swingAlertMonths`).

---

## 5c. `senderName` — what the bundle can and cannot answer

**Write side, closed.** The client supplies it. `onSwingAlertSubmit` builds the payload at offset
1,982,748 with, at offset 1,982,850,

```js
senderName: this.appService.globals.user.nick || this.appService.globals.user.name
```

and that same object `h` is the body of the create command **and** the `newSwingAlertMsg` field of
the edit command. So `senderName` travels on the wire on every create and every edit, taken from the
**current** user — meaning an edit performed by a different presenter rewrites the row's
`senderName` to the editor. The model's own `senderName` field, initialised to `""` at offset
1,955,224, is never read; the value always comes from `globals.user`.

**Read side, closed.** Every consumer reads it off the row: `_we` renders `Ze(e.senderName)` at
offset 1,937,504 and binds `[alt]="e.senderName"`, `searchSwingLogs` filters on
`o.senderName.toLowerCase()` at offset 1,915,362, and the CSV writes `l.senderName` at offset
1,985,533. Rows arrive already carrying it.

**What cannot be answered from this bundle.** Whether the server *persists* `senderName` on the
swing-alert document or recomputes it at read time by joining against a users collection is a
server-side decision, and this file is the browser bundle. There is no schema, no query and no
migration here. What the bundle does establish, and it narrows the question:

- the client sends `senderName` on write, so the server has the value at insert time and does not
  need a join to obtain it;
- `senderPic` and `senderAvt` occur at exactly two offsets each in the entire 2.89 MB file —
  1,937,535 / 1,943,880 and 1,937,586 / 1,943,931, all four inside the two row templates. The client
  **never writes them**. They are produced entirely server-side, whether stored or joined;
- `entryDate` is likewise never written by the client — four occurrences, all reads, listed in
  section 5.

Offsets in the list below are of the identifier `senderName` itself. Offsets quoted elsewhere in
this document (1,915,362, 1,937,504, 1,955,224, 1,982,748, 1,985,533) are of the start of the
enclosing expression, which is a few bytes earlier in each case.

So: `senderName` is client-supplied at write and row-resident at read. Its storage strategy is a
server question. Looked in: the whole `handleServerCmd` switch (1,017,600 – 1,018,800), every
`sendServerCommand` on the swing path (1,981,700 – 1,986,000 and 1,993,565), the two pipes
(1,915,100 – 1,916,250), and all fourteen occurrences of the string `senderName` in the bundle
(1,915,364, 1,915,855, 1,937,509, 1,937,621, 1,943,854, 1,943,966, 1,955,234, 1,955,485, 1,982,850,
1,983,741, 1,985,535, 1,986,885, 1,987,814, 1,989,746). None of them is a schema.

---

## 5d. The const table (CLOSED)

Every index the swing feature touches, resolved by counting tuples from the array start at
**1,994,264**. The offset column is where that tuple begins in the file.

| idx | tuple, verbatim | used by | offset |
| --- | --- | --- | --- |
| 12 | `[1,"d-flex","align-items-center"]` | inner wrapper of the Show/entries + download group, `bwe` slot 1 | 1,995,040 |
| 27 | `["id","swingAlerts","role","tabpanel","aria-labelledby","swingAlerts-tab",1,"tab-pane","position-relative",3,"ngClass"]` | the pane `<div>`, `vwe` slot 0 | 1,996,050 |
| 31 | `["role","presentation",1,"nav-item",3,"click"]` | the nav `<li>`, `XCe` slot 0 | 1,996,498 |
| 63 | `["id","swingAlerts-tab","data-bs-toggle","tab","data-bs-target","#swingAlerts","role","tab","aria-controls","swingAlerts","aria-selected","true",1,"nav-link",3,"ngClass"]` | the nav `<a>`, `XCe` slot 1 | 1,998,794 |
| 64 | `[1,"fas","fa-bell"]` | the nav icon, `XCe` slot 4 — shared with the Day Trades tab | 1,998,965 |
| 92 | `[1,"fas","fa-times"]` | the clear-image icon inside `awe` slot 1 | 2,000,858 |
| 142 | `[1,"mx-2"]` | the `\|` separator span between delete and edit, `mwe` slot 2 | 2,003,502 |
| 164 | `[1,"m-2","mx-auto","swing-alert-form"]` | tag hint on the `@if` container that holds the form, `vwe` slot 1 | 2,004,804 |
| 165 | `[1,"swing-alerts-container","m-2"]` | the list container `<div>`, `vwe` slot 2 | 2,004,843 |
| 166 | `[1,"text-center","m-0","p-1","px-3"]` | the "Latest Swing Trade Alerts (Last … Months)" `<h4>`, `vwe` slot 3 | 2,004,878 |
| 167 | `[1,"form-select","form-select-sm","d-inline-block","w-auto","trade-alerts-select",3,"ngModelChange","ngModel"]` | the months `<select>`, `vwe` slot 5 | 2,004,915 |
| 168 | `[3,"ngValue"]` | the `<option>` in `pwe`, and the repeater's attrs index | 2,005,026 |
| 169 | `[1,"text-center","m-0","p-1","px-3","bg-secondary"]` | the empty-state `<h4>` in `fwe` | 2,005,040 |
| 170 | `[1,"m-2","mx-auto","swing-alert-form",3,"ngSubmit"]` | the `<form>`, `hwe` slot 0 | 2,005,092 |
| 171 | `[1,"form-group","input-group","mb-1"]` | **all five** field-group `<div>`s — `hwe` slots 2, 6, 10, 14 and **18 (the image row)** | 2,005,144 |
| 172 | `[1,"input-group-text","bg-secondary","border-secondary","text-white"]` | the four `<span>` labels Symbol / Entry Price / Stop / Target | 2,005,182 |
| 173 | `["type","text","id","swingAlert-symbol","placeholder","AAPL","minlength","1","name","swingAlert-symbol","required","",1,"form-control",3,"ngModelChange","ngModel"]` | Symbol `<input>`, `hwe` slot 5 | 2,005,252 |
| 174 | same shape, `swingAlert-entryPrice`, placeholder `123.57` | Entry Price `<input>`, slot 9 | 2,005,416 |
| 175 | same shape, `swingAlert-stop`, placeholder `120.40` | Stop `<input>`, slot 13 | 2,005,590 |
| 176 | same shape, `swingAlert-target`, placeholder `138.75` | Target `<input>`, slot 17 | 2,005,752 |
| 177 | `["title","Click to view image",1,"input-group-text","bg-secondary","border-secondary","text-white","text-center","p-0","d-block"]` | tag hint on the `@if` container at `hwe` slot 19 (the preview slot) | 2,005,918 |
| 178 | `["type","text","id","swingAlert-image","placeholder","Upload Image or Paste Image Link / Screenshot (optional)","minlength","1","name","swingAlert-image",1,"form-control",3,"paste","ngModelChange","ngModel"]` | image `<input>`, slot 21; note `required` is absent and `paste` is bound | 2,006,048 |
| 179 | `["title","Remove Image",1,"input-group-text","bg-danger","border-danger","text-white","remove-image-btn"]` | tag hint on the `@if` container at `hwe` slot 22 (the clear slot) | 2,006,256 |
| 180 | `[1,"d-flex","align-items-center","justify-content-between","flex-wrap"]` | the row holding the direction group and the button row, `hwe` slot 23; **and** the search/limit/export control strip, `bwe` slot 0 | 2,006,362 |
| 181 | `[1,"form-group","mb-0","ms-1"]` | the direction group `<div>`, `hwe` slot 24 | 2,006,434 |
| 182 | `[1,"form-check","form-check-inline","ms-2"]` | the Long radio wrapper, slot 25 | 2,006,465 |
| 183 | `["type","radio","name","swingAlert-direction","id","swingAlert-long","value","long","required","",1,"form-check-input",3,"ngModelChange","ngModel"]` | Long radio, slot 26 | 2,006,509 |
| 184 | `["for","swingAlert-long",1,"form-check-label","text-success","font-weight-bold"]` | Long `<label>`, slot 27 | 2,006,657 |
| 185 | `[1,"form-check","form-check-inline"]` | the Short radio wrapper, slot 29 — **no `ms-2`**, unlike 182 | 2,006,738 |
| 186 | `["type","radio","name","swingAlert-direction","id","swingAlert-short","value","short","required","",1,"form-check-input",3,"ngModelChange","ngModel"]` | Short radio, slot 30 | 2,006,775 |
| 187 | `["for","swingAlert-short",1,"form-check-label","text-danger","font-weight-bold"]` | Short `<label>`, slot 31 | 2,006,925 |
| 188 | `[1,"text-end"]` | the button row `<div>`, `hwe` slot 33 | 2,007,006 |
| 189 | `["type","button",1,"btn","btn-secondary","btn-sm","m-1",3,"click"]` | the left (Cancel / Discard) `<button>`, slot 34 | 2,007,021 |
| 190 | `["type","submit",1,"btn","btn-primary","btn-sm","m-1"]` | the right (Submit Alert / Save Changes) `<button>`, slot 37 — no click handler, it submits | 2,007,088 |
| 191 | `["title","Click to view image",1,"input-group-text","bg-secondary","border-secondary","text-white","text-center","p-0","d-block",3,"click"]` | the preview `<span>` rendered by `swe` | 2,007,143 |
| 192 | `[1,"d-inline-block","uploaded-img-preview",3,"src","alt"]` | the preview `<img>` inside `swe` | 2,007,283 |
| 193 | `["title","Upload Image",1,"input-group-text","bg-secondary","border-secondary","text-white","img-upload-btn",3,"click"]` | the upload `<span>` rendered by `rwe` | 2,007,341 |
| 194 | `[1,"fas","fa-image","me-1"]` | the upload icon inside `rwe` | 2,007,461 |
| 195 | `["title","Remove Image",1,"input-group-text","bg-danger","border-danger","text-white","remove-image-btn",3,"click"]` | the clear `<span>` rendered by `awe` | 2,007,489 |
| 196 | `[1,"fas","fa-trash","me-1"]` | **`lwe`** — the icon on `Discard `, the left button in edit mode | 2,007,605 |
| 197 | `[1,"fas","fa-times","me-1"]` | **`cwe`** — the icon on `Cancel `, the left button in create mode | 2,007,633 |
| 198 | `[1,"fas","fa-save","me-1"]` | **`dwe`** — the icon on `Save Changes ` | 2,007,661 |
| 199 | `[1,"fas","fa-bell","me-1"]` | **`uwe`** — the icon on `Submit Alert ` | 2,007,688 |
| 200 | `[1,"input-group","input-group-sm","swingAlert-limit-container","m-2","ms-0"]` | the Show/entries wrapper, `bwe` slot 2 | 2,007,715 |
| 201 | `[1,"input-group-text"]` | the `Show` and `entries` `<span>`s, slots 3 and 6 | 2,007,792 |
| 202 | `["type","number","step","5","min","0","id","swingAlert-limit","aria-label","swingAlert-limit",1,"form-control",3,"ngModelChange","ngModel"]` | the limit `<input>`, slot 5 | 2,007,815 |
| 203 | `["title","Download Swing Trades",1,"m-1","ms-4","download-swing-trades-btn",3,"click"]` | the CSV `<span>`, slot 8 | 2,007,955 |
| 204 | `[1,"fas","fa-save"]` | the CSV icon, slot 9 — **no `me-1`**, unlike 198 | 2,008,042 |
| 205 | `["type","search","id","swingAlert-search","placeholder","Enter your search term","aria-label","swingAlert-search","aria-describedby","swingAlert-search",1,"form-control","form-control-sm","m-2","me-0",3,"ngModelChange","ngModel"]` | the search `<input>`, slot 10 | 2,008,062 |
| 206 | `[1,"table-responsive"]` | the table wrapper `<div>`, slot 11 | 2,008,292 |
| 207 | `[1,"table","table-striped"]` | the `<table>`, slot 12 | 2,008,315 |
| 208 | `[3,"ngClass"]` | the symbol `<span>` in the row, bound to `{swing-symbol-container: isP}` | 2,008,343 |
| 209 | `[1,"ms-2","font-weight-bold"]` | the symbol `<strong>` in the row | 2,008,357 |
| 210 | `[1,"text-center","align-middle","p-0","m-0"]` | the image `<td>` in the row | 2,008,387 |
| 211 | `["title","Click to view image",1,"uploaded-alert-image",3,"src","alt"]` | tag hint on the `@if` container for the row image | 2,008,432 |
| 212 | `[1,"p-0"]` | the sender `<td>` in the row | 2,008,503 |
| 213 | `[1,"mx-1","font-weight-bold"]` | the sender-name `<strong>` | 2,008,513 |
| 214 | `[1,"alert-sender-img",3,"src","alt"]` | the sender avatar `<img>` | 2,008,543 |
| 215 | `[1,"p-1","swing-alert-btn-delete",3,"click"]` | the delete `<span>` in `mwe` | 2,008,580 |
| 216 | `[1,"fa","fa-trash"]` | the delete icon — **`fa fa-trash`, not `fas`, and no `me-1`** | 2,008,625 |
| 217 | `[1,"p-1","swing-alert-btn-edit",3,"click"]` | the edit `<span>` in `mwe` | 2,008,645 |
| 218 | `[1,"fa","fa-edit"]` | the edit icon | 2,008,688 |
| 219 | `["title","Click to view image",1,"uploaded-alert-image",3,"click","src","alt"]` | the row image `<img>` rendered by `gwe` | 2,008,707 |

Three icon families are in play and they are not interchangeable: the form buttons use `fas` with
`me-1` (196–199), the row buttons use `fa` with no margin class (216, 218), and the export uses `fas`
with no margin class (204). Copy each one as written.

---

## 6. Still to decode before building

- [ ] **Whether the server stores `senderName` on the swing-alert document or joins it at read
      time.** This is not answerable from a browser bundle, and no further reading of this file will
      change that — section 5c records exactly what was read and what it does establish. Closing it
      needs the server, not `main.d1d09071be31f1ba.js`.
- [ ] **The origin of `senderAvt`.** The row builds
      `https://secure.gravatar.com/avatar/${senderAvt}?d=mm&s=30`, so `senderAvt` is a Gravatar hash.
      The client never writes it — only two occurrences in the file, 1,937,586 and 1,943,931, both
      reads inside the two row templates. How the server derives it is a server question.
- [ ] **The response shape of `getSwingAlertsLog` beyond the fields the client reads.** The handler
      at offset 1,017,718 does `data.reverse()` and assigns the array wholesale, so any field the
      templates, pipes and CSV do not touch is invisible from here.
- [ ] **The `sessData` contract that carries `hasSwingTradeAlerts` and `linkedRoomSwingAlertsOther`.**
      Both are read from `globals.sessData` (offsets 1,955,884 and 1,993,765); where `sessData` is
      populated from the server payload is outside the swing feature and was not read in this pass.

Everything else that section 6 previously listed is closed above: the const table (section 5d),
`swe`/`rwe`/`awe` (section 2), the log row template (section 3), the tab gate (section 5b), the
`pwe` `<option>` template (section 3), and the icon indices 196–199, 204, 216 and 218 (section 5d).

---

## 7. Build notes

- **Bootstrap + tokens.** Every class here is Bootstrap (`form-control`, `input-group`,
  `form-check-input`, `text-success`) except the thirteen component-scoped ones, whose rules are
  quoted inline above with their offsets: `swing-alert-form`, `swing-alerts-container`,
  `swing-symbol-container`, `swingAlert-limit-container`, `download-swing-trades-btn`,
  `swing-alert-btn-delete`, `swing-alert-btn-edit`, `uploaded-alert-image`, `uploaded-img-preview`,
  `alert-sender-img`, `img-upload-btn`, `remove-image-btn`, `trade-alerts-select`. Any colour that is
  not a Bootstrap utility must come from a CSS custom property — see `NEW-TODO.md` Part 4. The one
  literal colour on this path is `#08668e`, used by both the headings and the download button.
- **One form, two modes**, driven by `swingAlert.edit`. Edit mode changes the left button from
  `Cancel ` + times to `Discard ` + trash, and the right from `Submit Alert ` + bell to
  `Save Changes ` + save.
- **The room setting is the gate.** `sessData.hasSwingTradeAlerts` decides whether the tab exists at
  all; `isPresenter` decides only whether the form and the row buttons render inside it.
- **Two writes per create.** A swing alert both inserts a row and posts a formatted message into the
  main alerts feed, and the two are re-associated on edit and delete by comparing formatted text.
  Any rebuild that keeps only the row will silently break edit and delete of the feed mirror.
- **Do not format the numbers.** Entry price, stop and target are stored and displayed as the strings
  the text inputs produced.
- **Day Trade after this**, as a port rather than a rebuild. The differences already visible from
  this pass: the months list is 1–15 rather than 1–20 (`WCe` at 1,916,648 vs `zCe` at 1,916,549), the
  day conversion is `28 * months` rather than `30 * months`, the initial fetch is `days: 21` rather
  than `days: 42`, `dayTradeAlertMonths` defaults to 1 rather than 2, and `searchDayTradeLogs` (class
  `ICe`, 1,915,738) uses optional chaining where `searchSwingLogs` (class `PCe`, 1,915,251) does not.
