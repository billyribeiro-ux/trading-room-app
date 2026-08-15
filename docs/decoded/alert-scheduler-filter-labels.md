# Three alert features nobody had decoded

Decoded 2026-08-15 from `apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`. Every offset
below was opened and read; nothing here comes from a search result alone.

## How they were found, which matters more than the features

`audit-feature-coverage.mjs` exists because on 2026-08-15 it was discovered that **Swing and Day
Trade Alerts — two entire presentation-area tabs — had been in the captured bundle from day one and
were never built.** Nothing had ever ENUMERATED the reference's features; work was driven by
whatever somebody happened to ask about.

Running that audit after the Swing build reported 47/88 wire commands present, and four of the
missing ones were alert-related. **All four returned zero hits across `docs/`, `TODO.md` and
`NEW-TODO.md`** — no spec, no row, no mention anywhere in the project:

| command | occurrences in v4 | documented before today |
| --- | ---: | --- |
| `alertMsgLater` | 1 | no |
| `getScheduledAlerts` | 3 | no |
| `removeScheduledAlert` | 4 | no |
| `updateAlertFilter` | 6 | no |

Reading those four regions turned up **three separate features**. This is the same failure mode as
Swing, caught by the same mechanism, eleven hours later.

---

# 1. Alert Scheduler — post an alert at a future time, optionally repeating

**Entitlement: `sessData.hasAlertScheduler`** (8 occurrences). This flag appears in no existing spec
and is not in `room-settings-schema.ts`. Per the owner's rule that per-client features are
customer-selectable, expect a matching manage-page checkbox; **that checkbox has not been located in
the manage-page capture and must not be invented.**

## Wire commands — three, in both directions

**`alertMsgLater`** — client → server, schedules the alert. Byte **2,130,937**:

```js
sendServerCommand("alertMsgLater", r), bootbox.alert("Alert scheduled OK."),
  e.keepOpen ? e.clearInputFields(!0) : e.doCloseModal()
```

**`getScheduledAlerts`** — client → server with a **null** payload, and a server → client push.

Fetched on session load, gated (byte **1,009,797**):

```js
this.globals.sessData.hasAlertScheduler && this.send("getScheduledAlerts", null)
```

Opened from the modal trigger (byte 2,131,206), gated identically:

```js
manageScheduledAlerts() {
  this.appService.globals.sessData.hasAlertScheduler &&
    this.appService.sendServerCommand("getScheduledAlerts", null)
}
```

The response handler replaces the whole list — byte **1,021,836**:

```js
case "getScheduledAlerts":
  if (!i || !i.data) return;
  this.globals.scheduledAlerts = i.data;
  break;
```

**`removeScheduledAlert`** — client → server, and a server → client push. Send site, byte
**2,407,145**:

```js
removeScheduledAlert(e) {
  bootbox.confirm(
    "Are you sure you want to delete this alert by " + e.alert.n + ". text: " + e.alert.txt,
    i => { i && this.appService.sendServerCommand("removeScheduledAlert", { scheduledAlertID: e._id }) }
  )
}
```

The confirm string is built by **concatenation, not a template literal**, and the punctuation is
exact: a full stop and a space before `text:`, and **no closing question mark**. Reproduce it
verbatim.

The response splices in place rather than refetching — byte **1,021,925**:

```js
case "removeScheduledAlert":
  if (!i || !i.data) return;
  for (let se = 0; se < this.globals.scheduledAlerts.length; se++)
    this.globals.scheduledAlerts[se]._id === i.data.scheduledAlertID &&
      this.globals.scheduledAlerts.splice(se, 1);
  break;
```

Note the loop does not `break` after splicing and keeps iterating a mutated array. Faithful
behaviour is "remove the matching id"; the loop shape is an implementation detail, not a contract.

## The scheduled-alert payload

Read at byte 2,130,937, immediately before the send:

```js
{ …the ordinary alert fields…,
  repeatScheduledAlert: e.repeatScheduledAlert,
  ignoreWeekends: "daily" === e.repeatScheduledAlert && e.ignoreWeekends,
  sendLaterAsNick:  e.sendLaterAsNick,
  sendLaterAsEmail: e.sendLaterAsEmail,
  nonTradeAlert:    e.nonTradeAlert,
  dontCrossPost:    e.dontCrossPost }
```

**`ignoreWeekends` is not the checkbox value.** It is `false` unless the repeat is exactly `"daily"`,
so a weekly repeat always sends `ignoreWeekends: false` no matter what the control shows. Copying the
raw checkbox would diverge.

Immediately before the send, alert labels are folded in when any exist:

```js
e.appService.globals.alertLabels.length > 0 && (r = e.processAlertLabels(r))
```

Empty text is refused with `bootbox.alert("Please enter some alert text...")` — three dots, not an
ellipsis character.

## The modal

Component selector **`app-scheduled-alerts-modal`**, `decls: 27`. Modal element attributes, verbatim
from the consts array at byte 2,407,309:

```
id="scheduledAlertsModal" tabindex="-1" aria-labelledby="scheduledAlertsModalLabel" aria-hidden="true" class="modal …"
```

### The row template (`_Me`, byte 2,406,725)

Five cells, in this order:

| cell | content | binding |
| --- | --- | --- |
| `th` | when it will send | `e.sendOn` through the `date` pipe with format **`"short"`** |
| `td` | who scheduled it | `e.alert.n` |
| `td` | the alert text | `e.alert.txt` |
| `td` | repeat state | a `span` whose text is **`e.repeat || "off"`** |
| `td` | remove | a `button` containing an `i` icon and the text **`" Remove "`** |

The repeat `span` carries a three-way `ngClass` keyed on, in order: `"" === e.repeat || !e.repeat`,
`"daily" === e.repeat`, `"weekly" === e.repeat`. **The class NAMES are in the const table and were
not read; do not guess them.**

A sixth element is conditional — a `span` reading **`"no weekends"`**, rendered only when
`"daily" === e.repeat && e.ignoreWeekends`.

---

# 2. Alert Filter — each viewer chooses whose alerts they see

No entitlement flag was found for this one; it appears to be always available. **Stated as a
measurement, not a conclusion** — `hasAlertFilter` and similar return 0, but absence of a flag name
is weaker evidence than presence of one.

## The command, both directions

**Send**, byte **1,221,491**:

```js
this.appService.globals.doFilteredAlerts =
  Object.keys(this.appService.globals.user.alertFilterFor).length > 0,
this.appService.sendServerCommand("updateAlertFilter", {
  alertFilterFor: this.appService.globals.user.alertFilterFor,
  userXrefID: this.appService.globals.user.userXrefID
}),
this.appService.setPreference("showAlertsFrom", this.appService.globals.preferences.showAlertsFrom)
```

**Receive**, byte **1,017,535** — and note it re-fetches the whole log rather than filtering locally:

```js
case "updateAlertFilter":
  if (!i || !i.data) return;
  this.globals.user.alertFilterFor = i.data.alertFilterFor;
  this.send("getAlertsLog", { page: 0 });
  break;
```

**The server owns the filtering.** The client sends its selection and asks for the log again; it does
not filter `alertsLog` in the browser. That is the correct shape and the one to reproduce.

## The state

| name | shape | meaning |
| --- | --- | --- |
| `globals.user.alertFilterFor` | object, **avatar hash → username** | who is selected |
| `globals.modAlertFilterList` | array of `{ avatar, username }` | the people offered |
| `globals.doFilteredAlerts` | boolean | `Object.keys(alertFilterFor).length > 0` |
| `globals.preferences.showAlertsFrom` | boolean | **inverts the whole meaning** — see below |

`showAlertsFrom` flips the filter between an allow-list and a deny-list. The same selection means
"only show these people" when true and "filter out these people" when false. A rebuild that treats it
as a display toggle gets the semantics backwards.

`toggleTraders(e, i)` deletes the key when set and assigns it otherwise, so the map is the selection.
`syncModAlertFilterList()` seeds it from `modAlertFilterList`, assigning `alertFilterFor[e.avatar] =
e.username` for anyone not already present.

The modal is opened by the GUI event **`doAlertFilterModal`**, which the component subscribes to in
`ngOnInit` and answers by calling `syncModAlertFilterList()`.

## The controls, verbatim

Byte **1,220,064** — three buttons, and the leading and trailing spaces are part of the strings:

| text | handler |
| --- | --- |
| `" Unselect All "` | `unselectAll()` |
| `" Select All "` | `selectAll()` |
| `" Save"` | `updateAlertFilter()` |

**`" Save"` has a leading space and no trailing space**, unlike its two neighbours. That asymmetry is
in the bundle; keep it.

## The two confirm strings, verbatim

Both are template literals with an interpolation inside, and the branch is on whether the selection
is empty (byte 1,220,940):

```js
// when Object.keys(alertFilterFor).length === 0
`Are you sure you want to disable "${showAlertsFrom ? "only show alert " : "alert"}" filtering?`

// otherwise
`Are you sure you want to ${showAlertsFrom ? "only show " : "filter out "} alerts from the selected people?`
```

Note the inner spacing: `"only show alert "` carries a trailing space and `"alert"` does not, so the
first string renders with a double space in one branch and not the other. That is the reference's,
and it is the kind of detail that is "tidied" by accident.

**On cancel the component reverts `showAlertsFrom`** rather than leaving the toggle where the user
put it.

---

# 3. Alert Labels — per-room hashtags prefixed onto alert text

**This is NOT a wire feature.** Measured: `getAlertLabels`, `saveAlertLabels`, `updateAlertLabels`,
`alertLabelsModal` and `hasAlertLabels` are all **0 occurrences**. It is configuration plus a text
transform.

## The source is a JSON STRING in a room setting

Byte **1,147,292**:

```js
if (i.globals.sessData.alertLabels && i.globals.sessData.alertLabels.length > 0) {
  const s = i.globals.sessData.alertLabels.trim();
  i.globals.alertLabels = JSON.parse(s);
  i.globals.alertLabels = i.globals.alertLabels.map(r => (r.checked = !1, r));
}
```

So `sessData.alertLabels` is a **string containing JSON**, trimmed then parsed, and every entry gets
`checked = false` on load. `globals.alertLabels` initialises to `[]` at byte **981,181**
(`this.alertLabels=[]`, in the globals constructor beside `mutedUsers`, `followedUsers` and
`showPositions`).

**`sessData.chatTabsWithBadges` uses the identical shape** in the very next block — a JSON string in
a room setting, trimmed and parsed. Two settings share this pattern, which is worth knowing before
anyone models either as a real array.

## The transform

`processAlertLabels(e)`, byte **2,131,206**, read verbatim:

```js
processAlertLabels(e) {
  let i = "";
  const o = this.appService.globals.alertLabels.filter(s => s.checked);
  if (o.length > 0)
    for (let s = 0; s < o.length; s++)
      i += " #" + o[s].hash + (s === o.length - 1 ? "\n" : " ");
  return i && i.length > 0 &&
    (e.txt = i + e.txt,
     this.appService.globals.alertLabels.forEach(s => { s.checked = !1 })),
    e;
}
```

Three details that a rewrite loses:

1. **Each label is prefixed with a space then `#`** — `" #" + hash`. The first label therefore puts a
   leading space at the very start of the alert text.
2. **The last label is followed by a newline, the others by a space.** The labels end up on their own
   line above the alert body.
3. **The checkboxes are cleared as a side effect of formatting.** Selection does not persist past one
   send, and it is reset inside the formatter rather than by the caller.

Each label is `{ hash, checked }`; `hash` is the tag text without the `#`.

---

# What this means for us

**None of the three is built.** Confirmed by `audit-feature-coverage.mjs`: `alertMsgLater`,
`getScheduledAlerts`, `removeScheduledAlert` and `updateAlertFilter` all report `ours: 0`.

Ordering, if these are wanted:

1. **Alert Filter** is the smallest and has no entitlement to plumb — one command, one modal, and the
   server already owns the filtering. It is also the only one of the three that changes what an
   ordinary member sees.
2. **Alert Labels** is smaller still but depends on a room setting we do not yet parse, and it is
   pure formatting once the setting is read.
3. **Alert Scheduler** is the largest: an entitlement, three commands, a modal with a table, repeat
   semantics and a server-side scheduler with no equivalent here.

## Honest gaps

- **The manage-page control for `hasAlertScheduler` was not located.** It should exist by the
  per-client-entitlement pattern, but it is not in `room-settings-schema.ts` and was not found in the
  manage capture. Not invented here.
- **The `ngClass` class names on the repeat badge were not read** — they live in the component's
  const table, which was not decoded. Three states exist (off / daily / weekly); their class names do
  not.
- **The scheduled-alert modal's own layout** — the surrounding 27 declarations — was not decoded.
  Only the row template was.
- **No server-side scheduling contract exists in this project.** `alertMsgLater` implies a store and
  a timer the reference runs; nothing here does that, and it is a design decision rather than a port.
- **`sendLaterAsNick`, `sendLaterAsEmail` and `dontCrossPost`** are recorded as payload fields
  because they were read at the send site. What they DO on the server is not in the bundle.
