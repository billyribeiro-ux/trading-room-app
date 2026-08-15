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

**CORRECTED 2026-08-15, and the correction is architectural.** The first version of this section said
*"The SERVER owns the filtering. The client sends its selection and asks for the log again; it does
not filter `alertsLog` in the browser. That is the correct shape and the one to reproduce."*

**That is wrong.** The filtering is done **in the browser**, in three separate places, and building to
the original claim would have produced a server-side filter the reference does not have.

## The filtering is client-side, in THREE places, with one identical guard

| site | byte | what it filters |
| --- | ---: | --- |
| the live `/alerts` SSE stream | 1,004,533 | each alert as it arrives — logs `"filtered out alert for " + te.avt` |
| `case "getAlertsLog"` | 1,017,070 | the paged log on every fetch |
| the alerts SEARCH results | 1,020,817 | inside the `"alerts" == i.type` branch |

All three run the same expression, read verbatim at 1,017,070:

```js
try {
  this.globals.sessData.modAlertFilterList?.trim()?.length > 0 &&
    Object.keys(this.globals.user.alertFilterFor).length > 0 &&
    (i.data = i.data.filter((se) =>
      this.globals.preferences.showAlertsFrom
        ? this.globals.user.alertFilterFor[se.avt]
        : !this.globals.user.alertFilterFor[se.avt]
    ));
} catch {}
```

Three things follow, and each one matters for a rebuild:

1. **`showAlertsFrom` inverts the whole meaning.** True keeps only the selected people (allow-list);
   false removes them (deny-list). The original section had this right and it is the one claim that
   survives unchanged.
2. **The match key is `se.avt`** — the alert's avatar hash, not a user id and not a name. Which is why
   `alertFilterFor` is keyed by avatar.
3. **The guard is doubly gated and it fails OPEN.** Nothing is filtered unless BOTH
   `sessData.modAlertFilterList` is a non-empty string AND the selection is non-empty; and the whole
   thing sits in a `try/catch {}` that swallows silently. A malformed list means every alert shows.

**The privacy consequence, stated because it changes what this feature IS.** Every alert reaches
every browser and some are hidden after arrival. This is a display preference, **not** an access
control, and nothing about it prevents a member reading a filtered-out alert from the network tab.
If we ever filter server-side instead, that is a deliberate divergence and must be recorded as one —
it would be a genuine improvement, and it would not be a match.

## What `updateAlertFilter` is actually for

Since the browser does the filtering, the command is for **persistence**, not for effect. Send site,
byte 1,221,491:

```js
this.appService.globals.doFilteredAlerts =
  Object.keys(this.appService.globals.user.alertFilterFor).length > 0,
this.appService.sendServerCommand("updateAlertFilter", {
  alertFilterFor: this.appService.globals.user.alertFilterFor,
  userXrefID: this.appService.globals.user.userXrefID
}),
this.appService.setPreference("showAlertsFrom", this.appService.globals.preferences.showAlertsFrom)
```

Receive, byte 1,017,535 — it re-fetches so the newly stored selection is re-applied by the client
code above:

```js
case "updateAlertFilter":
  if (!i || !i.data) return;
  this.globals.user.alertFilterFor = i.data.alertFilterFor;
  this.send("getAlertsLog", { page: 0 });
  break;
```

## Two things called `modAlertFilterList`, and they are different types

**Corrected:** the first version described one array. There are two.

| name | type | byte |
| --- | --- | ---: |
| `sessData.modAlertFilterList` | a **string containing JSON** — `.trim()?.length` is tested on it | 1,004,533 |
| `globals.modAlertFilterList` | the **parsed array**, initialised `[]` | 977,658 |

Bridged by `syncModAlertFilterList()`, byte 1,221,905:

```js
syncModAlertFilterList() {
  const e = JSON.parse(this.appService.globals.sessData.modAlertFilterList) || [];
  this.appService.globals.modAlertFilterList = e;
}
```

**Note the `JSON.parse` is NOT inside a try/catch** — unlike the filter guard. A malformed setting
throws here. This is the third room setting shipped as a JSON string, after `alertLabels` and
`chatTabsWithBadges`.

Each entry is `{ username, avatar }` — proven by `selectAll()`, byte 1,220,674:

```js
selectAll() {
  for (const e of this.appService.globals.modAlertFilterList)
    this.appService.globals.user.alertFilterFor[e.avatar] ||
      (this.appService.globals.user.alertFilterFor[e.avatar] = e.username);
}
```

## The whole feature is gated on the room configuring a list

`sessData.modAlertFilterList` being truthy gates the entry points themselves — bytes 2,042,979 and
2,286,654 (`O(5, …modAlertFilterList ? 5 : -1)` and `O(195, … ? 195 : -1)`), and byte 2,056,417 gates
an indicator on `modAlertFilterList && doFilteredAlerts`. A room that configures no list has no
feature, and there is nothing to build a default from.

## The component

Selector **`app-alert-filter-modal`**, `decls: 20, vars: 4`. Modal attributes verbatim:

```
id="alert-filter-modal" tabIndex="-1" role="dialog" aria-labelledby="alert-filter-modal" aria-hidden="true" class="modal fade"
```

Note `tabIndex` with a capital I, and `aria-labelledby` pointing at the modal's own id rather than a
title element. Both are the reference's; reproduce them.

The list renders when `modAlertFilterList.length > 0`, else the empty state **`List is empty.`**
(byte 1,219,660). Component style block includes `.text-opacity{opacity:.1}`.

## The controls, verbatim — spaces are part of the strings

Byte 1,220,064:

| text | handler |
| --- | --- |
| `" Unselect All "` | `unselectAll()` |
| `" Select All "` | `selectAll()` |
| `" Save"` | `updateAlertFilter()` |

**`" Save"` has a leading space and no trailing space**, unlike its two neighbours. Keep the asymmetry.

`toggleTraders(e, i)` deletes the key when set and assigns it otherwise, so the map IS the selection.
The modal is opened by the GUI event **`doAlertFilterModal`**, which the component subscribes to in
`ngOnInit` and answers with `syncModAlertFilterList()`.

## The two confirm strings, verbatim

Byte 1,220,940, branching on whether the selection is empty:

```js
// when Object.keys(alertFilterFor).length === 0
`Are you sure you want to disable "${showAlertsFrom ? "only show alert " : "alert"}" filtering?`

// otherwise
`Are you sure you want to ${showAlertsFrom ? "only show " : "filter out "} alerts from the selected people?`
```

The inner spacing is uneven — `"only show alert "` has a trailing space and `"alert"` does not — so
one branch renders a double space and the other does not. That is the reference's, and it is exactly
the kind of thing that gets "tidied" by accident.

**On cancel the component reverts `showAlertsFrom`** rather than leaving the toggle where the user
put it.

## A hardcoded per-client list sits beside this, and it is NOT this feature

At byte 977,658, immediately after `modAlertFilterList = []`, the globals carry `stTraders` — a
hardcoded array of `{username, avatar}` with real gravatar MD5 hashes, e.g.
`{username: "Allison", avatar: "c90b7e877c17de66ff99477ffa260e5f"}`. It is a Simpler Trading trader
list compiled into the bundle. Recorded so nobody mistakes it for the configurable list, and **not
reproduced** — a customer-specific hardcode is the opposite of the theming rule.

## Honest gaps

- **What the server does with `updateAlertFilter` is not in the bundle.** It clearly persists the map
  against `userXrefID`, since the response echoes `alertFilterFor` back, but the storage and its
  lifetime are not established here.
- **The per-entry list item markup** (template `Tue`, byte 1,219,660) was not decoded — only that the
  list exists, its empty state, and the three buttons.

# 3. Alert Labels — per-room hashtags, and a badge renderer nobody had found

**CORRECTED 2026-08-15.** The first version of this section said an entry is `{ hash, checked }` and
that the feature is "configuration plus a text transform". **Both are wrong.** An entry has four
configured fields, and the labels have a **second consumer** that renders them as coloured badges.

**Still true:** this is not a wire feature. `getAlertLabels`, `saveAlertLabels`, `updateAlertLabels`,
`alertLabelsModal` and `hasAlertLabels` are all **0 occurrences**.

## The entry shape — four configured fields, not one

Proven by the renderer at byte 1,328,216 and the checkbox list at 2,119,605:

| field | used by | for |
| --- | --- | --- |
| `hash` | `processAlertLabels`, `parseSymbols` | the token written into the text as `#hash` |
| `name` | `parseSymbols`, the checkbox list | the human label shown in the badge and the checkbox |
| `bgcolor` | `parseSymbols` | the badge background |
| `color` | `parseSymbols` | the badge text colour **and** its 1px border |

`checked` is added at runtime, not configured — `map(r => (r.checked = !1, r))` at byte 1,147,292.

## THE SECOND CONSUMER — `#hash` becomes a badge, in ALERTS only

`parseSymbols`, read verbatim at byte 1,328,216. This is the piece the first version missed entirely:

```js
transform(e, i, o, s) {
  if (s && s.length > 0 && "alerts" === i)
    for (const r of s)
      e.includes(`#${r.hash}`) &&
        (e = e.replace(
          `#${r.hash}`,
          `<span class="my-1 me-1 badge" style="background-color: ${r.bgcolor}; color: ${r.color}; border: 1px solid ${r.color};">` +
            hu.sanitize(r.name) +
            "</span>"
        ));
  return e.includes("$") ? this.parseStock(e, i, o) : e;
}
```

Five things follow:

1. **`logType` must be `"alerts"`.** Chat messages never get label badges, even if the text contains
   `#hash`. The call sites pass `isQAMsg ? null : globals.alertLabels`, so **Q&A messages are excluded
   too** — bytes 1,331,842 / 1,332,732 / 1,340,566.
2. **The badge shows `name`, the text carries `hash`.** They are different strings and the mapping
   between them is the whole point of the feature. `processAlertLabels` writes ` #hash`;
   `parseSymbols` swaps it for a badge reading `name`.
3. **Only the FIRST occurrence is replaced.** `String.replace` with a string argument, not a regex, so
   a text containing `#hash` twice keeps the second one literal.
4. **Classes are `my-1 me-1 badge`** — Bootstrap, verbatim.
5. **`hu.sanitize(r.name)` sanitises the NAME — and `bgcolor` and `color` are interpolated RAW into a
   `style` attribute.** In the reference these come from a room setting the owner controls, so it is
   not a member-facing hole, but it is unsanitised interpolation into markup and **we must not
   reproduce it that way.** Validate the two colours, or bind them as CSS custom properties, and say
   in a comment that the divergence is deliberate.

Then it hands off to `parseStock`, so the two features share one pipe: labels first, `$SYMBOL`
colouring second, and the symbol pass only runs when the text contains `$`.

## The source is a JSON STRING in a room setting

Byte **1,147,292**:

```js
if (i.globals.sessData.alertLabels && i.globals.sessData.alertLabels.length > 0) {
  const s = i.globals.sessData.alertLabels.trim();
  i.globals.alertLabels = JSON.parse(s);
  i.globals.alertLabels = i.globals.alertLabels.map(r => (r.checked = !1, r));
}
```

`globals.alertLabels` initialises to `[]` at byte **981,181**. `sessData.chatTabsWithBadges` uses the
identical shape in the very next block, and `sessData.modAlertFilterList` is the third — **three room
settings shipped as JSON strings.**

Note the `JSON.parse` here is **not** inside a try/catch, and neither is the one in
`syncModAlertFilterList`. A malformed setting throws during session setup.

## The composer transform

`processAlertLabels(e)`, byte **2,131,295**:

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

- Each label is prefixed **space then `#`**, so the first puts a leading space at the very start.
- **Newline after the last, space after the others** — the labels end up on their own line above the
  body.
- It mutates `e.txt` and returns `e`.

**Called from FOUR sites**, not one — the first version implied a single caller:

| byte | path |
| --- | --- |
| 2,126,822 | the image-alert path, after the uploaded link is appended |
| 2,127,278 | the second image path |
| 2,129,610 | `postAlert()`, the ordinary text alert |
| 2,130,855 | `alertMsgLater`, the scheduler — see §1 |

Every one is guarded by `globals.alertLabels.length > 0 &&` first.

## The checkboxes are cleared in THREE places

The first version said "cleared as a side effect of formatting", which is true and incomplete:

| byte | when |
| --- | --- |
| 2,131,474 | inside `processAlertLabels`, after a successful prepend |
| 2,127,804 | `doCloseModal()` — closing the alert modal |
| 2,128,623 | `clearInputFields()` — clearing the composer |

All three run the same `forEach(s => { s.checked = !1 })` guarded by a length check. **Selection never
survives leaving the composer, by any route.**

## The checkbox list

Template `zTe`, rendered by `GTe` over `globals.alertLabels`, byte **2,119,605**:

- a checkbox bound `ngModel` → `e.checked`, with `id="alert-trade-label-{index}"`
- a `label` whose `for` is the same `"alert-trade-label-" + i`

The label's text is `Ne("", e.name, "?")`. The helper is `Ne(prefix, value, suffix)` — calibrated
against known cases in the same bundle, e.g. `Ne("[", e.duplicatesCount + 1, "]")` renders `[3]` — so
**this renders `{name}?` with a trailing question mark.** Recorded as read and flagged as surprising,
because `name` is a plain display label everywhere else. Do not "fix" it without checking the live
app; do not reproduce it without noting it either.

The block is gated in the post-alert modal at byte **2,139,108**:
`O(62, alertLabels && alertLabels.length > 0 ? 62 : -1)` — no labels configured, no section.

## Honest gaps

- **The container classes for the checkbox list** (const 35, and the `input`/`label` const 53) were
  not resolved to their class lists.
- **Where `bgcolor` / `color` are authored** — presumably the manage page, but no control for
  `alertLabels` was located in the manage capture, exactly as with `hasAlertScheduler`.
- **Whether `hash` may contain characters needing escaping** is not established; `parseSymbols` builds
  a plain `String.replace` from it, not a regex, so no escaping is required there.

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
