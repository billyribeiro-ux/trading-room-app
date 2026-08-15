# Swing Trade Alerts — decoded, implementation-ready

Decoded 2026-08-15 from `apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`, the
**current** v4 bundle. Every value below is read from that file. Nothing is inferred.

**Day Trade Alerts is a structural twin of this** — every `swingAlert-*` id has a `dayTradeAlert-*`
counterpart in the same bundle. Build this one first, then port; the differences are what to decode
second, not the whole feature again.

---

## 1. Where it lives

A presentation-area tab: **`presAreaTabs-swingAlerts`**, labelled **"Swing Alerts"**, alongside
`screens`, `notes`, `files`, `videoplayer`, `streams`, `recordings` and `dayTradeAlerts`.

Container: `<div class="swing-alerts-container m-2">`

---

## 2. The form — `hwe`

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

> **Note the types.** Entry price, stop and target are `type="text"`, **not** `type="number"`. Do not
> "improve" that — a numeric input changes keyboard, validation and locale behaviour, and this is a
> match.

### Direction — two radios, and the colours are structural

```html
<input type="radio" name="swingAlert-direction" id="swingAlert-long"  value="long"  required class="form-check-input">
<label for="swingAlert-long"  class="form-check-label text-success font-weight-bold"> Long </label>

<input type="radio" name="swingAlert-direction" id="swingAlert-short" value="short" required class="form-check-input">
<label for="swingAlert-short" class="form-check-label text-danger  font-weight-bold"> Short </label>
```

Both bind `swingAlert.direction`. `text-success` / `text-danger` are Bootstrap classes — keep them
as classes, do not resolve to colours.

### Image paste

```js
x("paste", (o) => onImagePaste(o, "swing"))
```

**`onImagePaste` takes a second argument naming the feature** — `"swing"`. Day Trade will pass its
own. Whatever we build has to carry that discriminator.

Two conditional spans surround the image input, switched on whether `swingAlert.image` is set
(`O(19, e.swingAlert.image ? 19 : 20)` and `O(22, e.swingAlert.image ? 22 : -1)`) — a preview/clear
affordance. **Their exact contents are not yet decoded** (sub-templates `swe`, `rwe`, `awe`).

### The two buttons, and they change label in edit mode

```js
O(35, e.swingAlert.edit ? 35 : 36)   // Cancel button contents
O(38, e.swingAlert.edit ? 38 : 39)   // Submit button contents
```

| button | click | when `edit` | otherwise |
| --- | --- | --- | --- |
| left | `onSwingAlertCancel()` | `lwe` — icon 197 + `Cancel ` | `cwe` |
| right | *(form submit)* | `dwe` — icon 198 + `Save Changes ` | `uwe` — icon 199 + `Submit Alert ` |

So **`swingAlert.edit` is the mode flag** and the same form serves create and edit.

---

## 3. The log list

**Empty state** (`fwe`), verbatim including its spaces:

```html
<h4 class="…"> No Swing Trade Alerts to display. </h4>
```

**Row actions** (`mwe`) — a delete span, a literal `|` separator, then an edit span:

```js
d(0,"span",215), x("click", () => deleteSwingAlert(o._id, o)), T(1,"i",216), u(),
d(2,"span",142), v(3,"|"), u(),
d(4,"span",217), x("click", …)          // edit
```

Classes: `swing-alert-btn-delete` and `swing-alert-btn-edit`, both `p-1`.
**Delete passes both `_id` and the whole row object.**

---

## 4. Search, limit, export

| control | attributes |
| --- | --- |
| search | `type=search` `id=swingAlert-search` `placeholder="Enter your search term"` `aria-label`/`aria-describedby=swingAlert-search` `class="form-control form-control-sm m-2 me-0"` |
| limit | `type=number` **`step=5`** `min=0` `id=swingAlert-limit` `aria-label=swingAlert-limit` `class=form-control`, wrapped in `input-group input-group-sm swingAlert-limit-container m-2 ms-0` |
| export | title `Download Swing Trades`, class `download-swing-trades-btn` |

### The two pipes, read from source

```js
// searchSwingLogs — matches symbol OR senderName, both lowercased
e.filter(o => o.symbol.toLowerCase().includes(i) || o.senderName.toLowerCase().includes(i))

// limitSwingLogs — plain head
e && 0 !== i ? e.slice(0, i) : []
```

**`limitSwingLogs` returns `[]` when the limit is 0**, not the whole list. Reproduce that.

---

## 5. Wire commands — four

| command | direction |
| --- | --- |
| `getSwingAlertsLog` | client → server, and the response is logged as `handleServerCmd got getSwingAlertsLog:` |
| `newSwingAlertMsg` | create |
| `editSwingAlertMsg` | edit |
| `deleteSwingAlertMsg` | delete |

Row shape, from what the pipes and handlers touch: `_id`, `symbol`, `senderName`, `entryPrice`,
`stop`, `target`, `image`, `direction` (`"long"` | `"short"`), and a `created` timestamp.

---

## 6. Still to decode before building

Honest gaps, each one a specific lookup rather than a research project:

- [ ] The const table entries for indices **142, 168–199, 215–217** — exact classes on the field
      groups, labels, buttons and icons
- [ ] Sub-templates `swe`, `rwe`, `awe` — the image preview / clear affordance
- [ ] The log ROW template — which fields render, in what order, and how direction is styled
- [ ] Where the tab is gated (presenter-only? a room setting?)
- [ ] Whether `senderName` is stored on the row or joined at read time
- [ ] The `pwe` `<option>` template — a select whose source is not yet identified

---

## 7. Build notes

- **Bootstrap + tokens.** Every class here is Bootstrap (`form-control`, `input-group`,
  `form-check-input`, `text-success`). Any colour that is not a Bootstrap utility must come from a
  CSS custom property — see `NEW-TODO.md` Part 4.
- **One form, two modes**, driven by `swingAlert.edit`.
- **Day Trade after this**, as a port rather than a rebuild.
