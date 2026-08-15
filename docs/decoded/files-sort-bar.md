# The Files sort bar, decoded and verified

Decoded 2026-08-15 from `apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`. Every
offset below was opened and read; every count is python `.count()`.

`NEW-TODO.md` §2.1 called this "FULLY DECODED, ready to build". **It is nearly right, and it is wrong
in one way that would have produced a subtly broken control.** This document supersedes it.

## Why it did not exist in our older capture

`~/CLAUDE.md` opens with this incident: a search for `st-fileSortBar` returned nothing, it was
reported as "not in the capture", and the owner then pasted the real markup from the live app. The
lesson recorded at the time was *stop searching, read the region instead*.

**That lesson was wrong.** Measured: `st-fileSortBar` occurs **0 times** in
`../source/main.d6d3c112b59b7d0d.js` and **1 time** in the current v4 bundle. The search was fine —
**our evidence predated the feature**. Evidence has a date, and the live application moves.

---

## What NEW-TODO §2.1 gets WRONG

### The two buttons share ONE direction variable

§2.1 presents a per-button asc/desc table, which reads as though Name and Date each keep their own
direction. They do not. Both icons key off the same `fileSortDir`, read at bytes 1,946,476 and
1,946,631:

```js
Uwe: ngClass = "asc" === fileSortDir ? "fa-sort-alpha-down"  : "fa-sort-alpha-up"    // Name
Vwe: ngClass = "asc" === fileSortDir ? "fa-sort-amount-down" : "fa-sort-amount-up"   // Date
```

One field (`fileSortField`), one direction (`fileSortDir`). The inactive button shows neither icon —
it renders const 249, `["fas","fa-sort","ml-2"]`, through a separate branch (`jwe` / `Hwe`).

### Switching field RESETS the direction, per field

Not recorded in §2.1 at all, and it is the behaviour a rebuild is most likely to miss.
`toggleFileSort`, read verbatim at byte **1,975,331**:

```js
toggleFileSort(e) {
  this.fileSortField === e
    ? (this.fileSortDir = "asc" === this.fileSortDir ? "desc" : "asc")
    : ((this.fileSortField = e), (this.fileSortDir = "date" === e ? "desc" : "asc"));
}
```

- Clicking the **already-active** field flips the direction.
- Clicking the **other** field switches to it and **resets direction to that field's default** —
  `date` → `desc`, `name` → `asc`. The previous direction is discarded.

So "newest first" and "A to Z first" are each that field's natural starting point, and you cannot
carry a direction across a field change.

### The opening state is date/desc, not unsorted

Read at byte **1,954,645**, in the same constructor block as `soundsTotal` / `imagesTotal` /
`filesTotal`:

```js
this.fileSortField = "date", this.fileSortDir = "desc"
```

The Files pane opens **newest first**. A build that starts unsorted diverges on first paint.

---

## What NEW-TODO §2.1 gets RIGHT — confirmed here

### The classes, from the const table

| element | consts, verbatim |
| --- | --- |
| bar | `["d-flex","flex-wrap","justify-content-center","align-items-center","mt-2","st-fileSortBar"]` |
| label span | `[1,"mr-2"]` |
| Name button | `[1,"btn","btn-sm","m-1","st-fileSortName",3,"click","ngClass","title"]` |
| Date button | `[1,"btn","btn-sm","m-1","st-fileSortDate",3,"click","ngClass","title"]` |
| active icon | `[1,"fas","ml-2",3,"ngClass"]` (const 245) |
| inactive icon | `[1,"fas","fa-sort","ml-2"]` (const 249) |

### The four title strings, verbatim and at their offsets

| button | condition | title | byte |
| --- | --- | --- | ---: |
| Name | `desc` | `Sorted Z to A (click to sort A to Z)` | 1,950,683 |
| Name | otherwise | `Sorted A to Z (click to sort Z to A)` | 1,950,722 |
| Date | `asc` | `Sorted oldest to newest (click to sort newest to oldest)` | 1,950,910 |
| Date | otherwise | `Sorted newest to oldest (click to sort oldest to newest)` | 1,950,969 |

### The comparator, verbatim

`sortFiles`, registered at byte **1,915,203**:

```js
transform(e, i = "", o = "asc") {
  return e && i
    ? [...e].sort((s, r) => {
        const a = "date" === i ? new Date(s.created).getTime() : (s.name || "").toLowerCase();
        const l = "date" === i ? new Date(r.created).getTime() : (r.name || "").toLowerCase();
        if (a === l) return 0;
        const c = a > l ? 1 : -1;
        return "asc" === o ? c : -c;
      })
    : e;
}
```

Four properties that matter, and only the third is in §2.1:

1. **`[...e].sort()` copies first.** It does not mutate the source array. A mutating sort on a
   `$state.raw` list is a reactivity bug waiting to happen — copy.
2. **No field means PASSTHROUGH, not empty.** `e && i ? … : e` returns the original array when the
   field is falsy. Contrast `limitSwingLogs`, where a limit of 0 returns `[]`.
3. **Ties return 0** — equal values do not fall back to the other field.
4. **Defaults are `i = ""` and `o = "asc"`.**

---

## The button labels carry spaces

Read at byte 1,975,308 in the template: `v(4," Name ")` and `v(8," Date ")` — **leading AND trailing
space on both**. §2.1's table renders them as `Name` and `Date`. Keep the spaces.

The label before them is `Sorting by:` (1 occurrence) inside `<span class="mr-2">`.

## The CSS

```css
.st-fileSortBar{font-size:12px}
.st-fileSortName,.st-fileSortDate{color:var(--tabs-color);background-color:transparent;border:1px solid var(--file-see-more-bg)}
.st-fileSortName.active,.st-fileSortDate.active{background-color:var(--file-see-more-bg)}
```

Both tokens — `--tabs-color` and `--file-see-more-bg` — already exist in `src/app.css` and
`css/complete-app-styles.css`. **Build against the token names, never the resolved colours**, per the
theming rule: Simpler Trading's "theme" is those variables set to their values, and another customer
sets them differently.

The active button additionally carries `.active`, applied through the same `ngClass` binding slot as
the title.

---

## The sibling `filter` pipe, for context

Immediately before `sortFiles` in the bundle sits the generic `filter` pipe the Files search uses. It
is not the sort bar, but anyone building this will meet it: it lowercases the term and, for a
non-string row, walks **every** key and matches if **any** string property contains the term.

```js
Object.keys(o).forEach(r => { let a = o[r]; "string" == typeof a && a.toLowerCase().includes(i) && (s = !0) })
```

That is a whole-object substring search, not a name search. Do not narrow it to `name` on the
assumption that is what it means.

---

## Honest gaps

- **The `.active` class application was not read at its binding site.** The const table shows the
  buttons bind `ngClass` and `title` in the same slot group, and the CSS proves `.active` exists and
  is styled, but the exact expression that adds it was not opened. Do not guess it; read it before
  building, or derive it from `fileSortField` and state in a comment that it is derived.
- **The sort bar's position within the Files pane** — which sibling it sits between — was not
  established here. Only its own markup and behaviour were.
- `st-fileSortBar`, `st-fileSortName` and `st-fileSortDate` each occur **exactly once** in the
  bundle, so there is one instance and no second usage to cross-check against.
