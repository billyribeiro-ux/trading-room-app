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

Re-read at bytes 2,011,253-2,011,600 during the build; corrected where this table had dropped the
leading `1` from the bar's const.

| element | consts, verbatim |
| --- | --- |
| bar | `[1,"d-flex","flex-wrap","justify-content-center","align-items-center","mt-2","st-fileSortBar"]` |
| label span | `[1,"mr-2"]` |
| Name button | `[1,"btn","btn-sm","m-1","st-fileSortName",3,"click","ngClass","title"]` |
| Date button | `[1,"btn","btn-sm","m-1","st-fileSortDate",3,"click","ngClass","title"]` |
| active icon | `[1,"fas","ml-2",3,"ngClass"]` (const 245) |
| inactive icon | `[1,"fas","fa-sort","ml-2"]` (const 249) |

### The four title strings, verbatim and at their offsets

The four strings and their four byte offsets are right. **The `condition` column was wrong and is
corrected below**: each title tests the FIELD before it tests the direction. Read verbatim in the
`t2e` update block at bytes 1,950,560-1,951,040:

```js
z("ngClass",ct(13,mo,"name"===e.fileSortField))("title","name"===e.fileSortField&&"desc"===e.fileSortDir
  ?"Sorted Z to A (click to sort A to Z)"
  :"Sorted A to Z (click to sort Z to A)")

z("ngClass",ct(15,mo,"date"===e.fileSortField))("title","date"===e.fileSortField&&"asc"===e.fileSortDir
  ?"Sorted oldest to newest (click to sort newest to oldest)"
  :"Sorted newest to oldest (click to sort oldest to newest)")
```

| button | condition | title | byte |
| --- | --- | --- | ---: |
| Name | field is `name` AND dir is `desc` | `Sorted Z to A (click to sort A to Z)` | 1,950,683 |
| Name | otherwise | `Sorted A to Z (click to sort Z to A)` | 1,950,722 |
| Date | field is `date` AND dir is `asc` | `Sorted oldest to newest (click to sort newest to oldest)` | 1,950,910 |
| Date | otherwise | `Sorted newest to oldest (click to sort oldest to newest)` | 1,950,969 |

The conjunct is not cosmetic. Tabulated on direction alone, an INACTIVE Name button announces
"Sorted Z to A" whenever the direction happens to be `desc` — while Date is the sort actually in
force. With the conjunct, an inactive button always shows its own default-state string. That is
also the real explanation for the thing this document notes further down: the rendered capture
shows an inactive Date button still claiming "Sorted newest to oldest". It is not remembered state,
it is the `else` arm.

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

`v(4," Name ")` at byte **1,950,263** and `v(8," Date ")` at byte **1,950,396** — **leading AND
trailing space on both**. §2.1's table renders them as `Name` and `Date`. Keep the spaces.

**The offset previously given here, 1,975,308, was wrong** — it is the offset of `toggleFileSort`,
copied from the fact above, and it sits about 25 KB away from the template. The labels themselves
are inside `t2e`, which begins at byte 1,950,099. The claim about the spaces was correct; only the
citation was.

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

## Honest gaps — BOTH CLOSED during the build, by reading

### `.active` — closed. It is captured, not derived.

The binding was opened at byte **1,950,577** (Name) and **1,950,805** (Date):

```js
z("ngClass",ct(13,mo,"name"===e.fileSortField))
z("ngClass",ct(15,mo,"date"===e.fileSortField))
```

and `mo` is the shared pure function read at byte **1,916,345**, in the same const run as `Hr` and
`jCe`:

```js
mo=t=>({active:t})
```

So `ngClass` resolves to `{active: <this button's field is the governing field>}`. `.active`
depends on the FIELD ALONE and never on the direction. Nothing here needed to be derived or
guessed.

### The bar's position — closed. It is inside the table's gate.

The bar and the table are ONE embedded view. `t2e`, read at byte **1,950,099**, opens with the sort
bar div and closes with `st-fileTable`:

```js
function t2e(t,n){if(1&t){const e=Y();d(0,"div",242)(1,"span",243),v(2,"Sorting by:"),u(),
  d(3,"button",244)…d(7,"button",246)…u()(),
  d(11,"table",247)(12,"tbody",248),ht(13,e2e,2,1,"tr",null,pc),Xe(15,"filter"),Xe(16,"sortFiles"),u()()}
```

and `t2e` is node 85 (byte **2,016,231**, `H(84,Bwe,2,0,"h4",48)(85,t2e,17,17)`), whose gate is read
at byte **2,018,251**:

```js
O(85,o.sessionFiles&&o.sessionFiles.length>0?85:-1)
```

**So a room with no files renders no sort bar**, exactly as it renders no table. A build that puts
the bar above the gate shows a "Sorting by:" strip over an absent table in every empty room. Its
immediate siblings are the `h4` (node 84, the never-fetched message) before it and nothing after.

### Still true

- `st-fileSortBar`, `st-fileSortName` and `st-fileSortDate` each occur **exactly once** in the
  bundle, so there is one instance and no second usage to cross-check against.

### One more thing the build read that this document did not record

The two pipes compose **filter first, then sort** — byte **1,951,076**:

```js
pt(rg(16,9,Ct(15,6,e.sessionFiles,e.filesSearch),e.fileSortField,e.fileSortDir))
```

`Ct` binds the two-argument `filter`, and its result is the FIRST argument to the three-argument
`sortFiles`. Sorting before filtering yields the same rows and pays for comparisons on rows about to
be discarded.
