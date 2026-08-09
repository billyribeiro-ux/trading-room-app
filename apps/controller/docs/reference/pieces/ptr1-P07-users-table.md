# ptr1 — P07 — Users table shell (`<table>`, `<thead>`, all `<th>`, column geometry, `<tbody>`)

## 1. Purpose

This piece decodes the structural shell of the users table on the **Manage Room** admin page (room 3625):
the `<table class="table table-striped ">` element, its `<thead>` / header `<tr>` / five `<th>` cells with
exact column x-positions and widths, and the `<tbody>` box that holds the three user rows. The three
`ng-repeat` rows themselves (`…3.1.0`, `…3.1.1`, `…3.1.2`) are deliberately excluded here and decoded in
**P08**.

## 2. Path anchor + record count

| Anchor | Records |
|---|---|
| `r.0.1.1.0.1.3.1.0.0.3` (the `<table>`) | 1 |
| `r.0.1.1.0.1.3.1.0.0.3.0` + descendants (`<thead>` → `<tr>` → 5×`<th>`) | 7 |
| `r.0.1.1.0.1.3.1.0.0.3.1` (the `<tbody>` element itself) | 1 |
| **Total for P07** | **9** |

Excluded by assignment: `r.0.1.1.0.1.3.1.0.0.3.1.0`, `…3.1.1`, `…3.1.2` and their descendants
(3 × 176 = **528** records → P08). 1 + 7 + 1 + 528 = **537**, which is exactly the census of
`r.0.1.1.0.1.3.1.0.0.3*` (verified: 1 + 7 + 529 from the sub-tree census).

Verification command (run in `/tmp/ptr-decode/ptr1/caps/00-baseline-room`):

```
for f in nodes-*.txt; do awk -v RS='' -v ORS='\n\n' \
  '/path=r\.0\.1\.1\.0\.1\.3\.1\.0\.0\.3([. ]|$)/ && !/path=r\.0\.1\.1\.0\.1\.3\.1\.0\.0\.3\.1\.[012]/' $f;
done | grep -c '^#'
# => 9
```

**Note the document-order scatter** — this is why locating by `path`, not `#index`, is mandatory:
the `<table>` is `#174`, `<thead>` `#204`, `<tbody>` `#205`, the header `<tr>` `#466`, and the five `<th>`
are `#1310`–`#1314`. The capture is breadth-first by depth.

### Ancestor chain (context)

`body#0` → `#1 div.app-container` → `#22 div.ng-fadeOutZoom.ng-fluid.ng-scope` →
`#26 div.panel.panel-default` → `#31 div.panel-body` (padding 15px) → `#41 div.ng-isolate-scope` →
`#61 div.tab-content` (padding 10px 20px, border 1px solid `rgb(230,233,238)` on R/B/L) →
`#97 div.tab-pane.ng-scope.active` → `#137 fieldset.ng-scope` (x=37 y=361 w=1768 h=393.766) →
**`#174 table`** (4th child, after the three P06 blocks).

---

## 3. Node table — all 9 nodes

| # | path | tag | id | classes | rect x | y | w | h | renders |
|---|---|---|---|---|---|---|---|---|---|
| 174 | `r.0.1.1.0.1.3.1.0.0.3` | table | — | `table table-striped ` *(trailing space)* | 37 | 489 | 1768 | 225.766 | yes |
| 204 | `r.0.1.1.0.1.3.1.0.0.3.0` | thead | — | *(none)* | 37 | 489 | 1768 | 60.5 | yes |
| 205 | `r.0.1.1.0.1.3.1.0.0.3.1` | tbody | — | *(none)* | 37 | 549.5 | 1768 | 165.266 | yes |
| 466 | `r.0.1.1.0.1.3.1.0.0.3.0.0` | tr | — | *(none)* | 37 | 489 | 1768 | 60.5 | yes |
| 1310 | `r.0.1.1.0.1.3.1.0.0.3.0.0.0` | th | — | *(none)* | 37 | 489 | 59.2656 | 60.5 | yes |
| 1311 | `r.0.1.1.0.1.3.1.0.0.3.0.0.1` | th | — | *(none)* | 96.3 | 489 | 722.703 | 60.5 | yes |
| 1312 | `r.0.1.1.0.1.3.1.0.0.3.0.0.2` | th | — | *(none)* | 819 | 489 | 386.406 | 60.5 | yes |
| 1313 | `r.0.1.1.0.1.3.1.0.0.3.0.0.3` | th | — | *(none)* | 1205.4 | 489 | 313.789 | 60.5 | yes |
| 1314 | `r.0.1.1.0.1.3.1.0.0.3.0.0.4` | th | — | *(none)* | 1519.2 | 489 | 285.836 | 60.5 | yes |

All nine render. **No node in P07 has an `id`.**

### Column geometry — verified, not assumed

| col | `th` # | header text | x (left edge) | width | right edge |
|---|---|---|---|---|---|
| 0 | #1310 | `#` | 37 | 59.2656 | 96.2656 |
| 1 | #1311 | `Name / Email` | 96.3 *(96.2656)* | 722.703 | 818.9686 |
| 2 | #1312 | `Last Login/Notes` | 819 *(818.9686)* | 386.406 | 1205.3746 |
| 3 | #1313 | `Role / Status` | 1205.4 *(1205.3746)* | 313.789 | 1519.1636 |
| 4 | #1314 | `Actions` | 1519.2 *(1519.1636)* | 285.836 | 1804.9996 |

Sum of widths = `59.2656 + 722.703 + 386.406 + 313.789 + 285.836 = 1767.9996` ≈ **1768** = table width. ✓
Right edge `1804.9996` ≈ `37 + 1768 = 1805` = fieldset right edge. ✓
(The `rect` line rounds to 1 decimal; the `width` style-deviation carries the full precision. The values in
the prior-pass hint — 37 / 96.3 / 819 / 1205.4 / 1519.2 and 59.2656 / 722.703 / 386.406 / 313.789 /
285.836 — are **confirmed exactly**.)

### Vertical geometry

```
table  top 489      height 225.766   bottom 714.766
 thead top 489      height 60.5      bottom 549.5
  tr   top 489      height 60.5
   th  top 489      height 60.5   (padding-top 20 → text baseline block starts 509,
                                   padding-bottom 20, 1px border-bottom)
 tbody top 549.5    height 165.266   bottom 714.766
```

`60.5 + 165.266 = 225.766` = table height. ✓
`tbody` height decomposes as row0 `41` + row1 `62.3828` + row2 `61.8828` = `165.2656`. ✓
The table's `margin-bottom: 20px` puts the next flow position at `734.766`; the fieldset's own
`padding-bottom: 20px` closes it at `754.766` = `361 + 393.766`. ✓

**`th` content height check:** 60.5 − 20 (padding-top) − 20 (padding-bottom) − 1 (border-bottom) =
**19.5px** of line box. With `vertical-align: bottom` and `line-height: 20px`, single-line header text sits
flush to the bottom of the padding box.

---

## 4. Every attribute, verbatim

```
#174  r.0.1.1.0.1.3.1.0.0.3        <table>   class   = "table table-striped "
                                             ng-init = "showPins=true;"
#204  r.0.1.1.0.1.3.1.0.0.3.0      <thead>   (none)
#205  r.0.1.1.0.1.3.1.0.0.3.1      <tbody>   (none)
#466  r.0.1.1.0.1.3.1.0.0.3.0.0    <tr>      (none)
#1310 r.0.1.1.0.1.3.1.0.0.3.0.0.0  <th>      (none)
#1311 r.0.1.1.0.1.3.1.0.0.3.0.0.1  <th>      (none)
#1312 r.0.1.1.0.1.3.1.0.0.3.0.0.2  <th>      (none)
#1313 r.0.1.1.0.1.3.1.0.0.3.0.0.3  <th>      (none)
#1314 r.0.1.1.0.1.3.1.0.0.3.0.0.4  <th>      (none)
```

That is the **complete** attribute inventory for P07 — two attributes in total, both on `<table>`.

Explicitly **absent** (do not invent): no `colspan`, no `rowspan`, no `scope`, no `width`,
no `id`, no `data-*`, no `ng-repeat`/`ng-if`/`ng-show` on any header cell, no `<caption>`,
no `<colgroup>`/`<col>`, no `<tfoot>`, no sort-indicator element or class, no `role` attributes,
no inline `style` attribute anywhere in P07.

The class string on the table is `"table table-striped "` — **with a trailing space**. There is no
`table-hover`, no `table-bordered`, no `table-condensed`, no `table-responsive` wrapper.

`ng-init="showPins=true;"` on the table is what makes the per-row `ng-show="showPins && user.mobilePairCode"`
span in P08 evaluate its second operand.

---

## 5. Resolved computed style — absolute values, every node

**COMMON baseline** (substituted wherever a node had no deviation; you never need `DEFAULTS.txt`):
`display:block · position:static · float:none · width:auto · height:auto · margin 0px ×4 · padding 0px ×4 ·
border-width 0px ×4 · border-style none ×4 · border-color rgb(51,51,51) ×4 · border-radius 0px ×4 ·
background-color rgba(0,0,0,0) · color rgb(51,51,51) ·
font-family "Helvetica Neue", Helvetica, Arial, sans-serif · font-size 14px · font-weight 400 ·
line-height 20px · letter-spacing normal · text-align start · vertical-align baseline · white-space normal ·
overflow-x visible · overflow-y visible · opacity 1 · box-shadow none · cursor auto · box-sizing border-box`

### #174 `<table class="table table-striped ">`

| prop | resolved absolute value |
|---|---|
| display | **table** |
| position | static |
| float | none |
| width / height | **1768px** / **225.766px** |
| max-width | **100%** |
| margin T/R/B/L | 0px / 0px / **20px** / 0px |
| padding T/R/B/L | 0px / 0px / 0px / 0px |
| border-width T/R/B/L | 0px / 0px / 0px / 0px |
| border-style T/R/B/L | none / none / none / none |
| border-color T/R/B/L | rgb(51,51,51) / rgb(51,51,51) / rgb(51,51,51) / rgb(51,51,51) |
| border-radius TL/TR/BL/BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size / font-weight | 14px / 400 |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| vertical-align | baseline |
| white-space | normal |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| box-sizing | border-box |

> The table has **no** `border-collapse` deviation recorded and **no** border of its own — the only rules
> that paint are the `th` bottom border and the `td` top borders (P08).

### #204 `<thead>`

| prop | resolved |
|---|---|
| display | **table-header-group** |
| position / float | static / none |
| width / height | **1768px** / **60.5px** |
| margin ×4 / padding ×4 | 0px / 0px |
| border width/style/colour/radius | 0px ×4 / none ×4 / rgb(51,51,51) ×4 / 0px ×4 |
| background-color / color | rgba(0,0,0,0) / rgb(51,51,51) |
| font-family / size / weight / line-height | "Helvetica Neue", Helvetica, Arial, sans-serif / 14px / 400 / 20px |
| letter-spacing / text-align | normal / start |
| **vertical-align** | **middle** |
| white-space / overflow-x / overflow-y | normal / visible / visible |
| opacity / box-shadow / cursor | 1 / none / auto |

### #205 `<tbody>`

Identical to `#204` except **display `table-row-group`** and **height `165.266px`** (y = 549.5).

| prop | resolved |
|---|---|
| display | **table-row-group** |
| width / height | **1768px** / **165.266px** |
| vertical-align | **middle** |
| *(all other properties)* | COMMON, exactly as listed for `#204` |

### #466 `<tr>` (header row)

Identical to `#204` except **display `table-row`**.

| prop | resolved |
|---|---|
| display | **table-row** |
| width / height | **1768px** / **60.5px** |
| vertical-align | **middle** |
| background-color | rgba(0, 0, 0, 0) — the header row is **not** striped |
| *(all other properties)* | COMMON |

### #1310 – #1314 `<th>` — shared resolved style

All five header cells carry the **identical 13-property deviation set**; only `width` differs.

| prop | resolved absolute value |
|---|---|
| display | **table-cell** |
| position | static |
| float | none |
| width | **per column** — 59.2656px / 722.703px / 386.406px / 313.789px / 285.836px |
| height | **60.5px** |
| margin T/R/B/L | 0px / 0px / 0px / 0px |
| padding T/R/B/L | **20px / 8px / 20px / 8px** |
| border-top-width | 0px |
| border-right-width | 0px |
| **border-bottom-width** | **1px** |
| border-left-width | 0px |
| border-top-style | none |
| border-right-style | none |
| **border-bottom-style** | **solid** |
| border-left-style | none |
| border-top-color | rgb(51, 51, 51) |
| border-right-color | rgb(51, 51, 51) |
| **border-bottom-color** | **rgb(221, 221, 221)** |
| border-left-color | rgb(51, 51, 51) |
| border-radius TL/TR/BL/BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| **font-weight** | **700** |
| line-height | 20px |
| letter-spacing | normal |
| **text-align** | **left** |
| **vertical-align** | **bottom** |
| white-space | normal |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| box-sizing | border-box |

The prior-pass hint "`th` padding 20px 8px with `border-bottom 1px solid rgb(221,221,221)`" is
**confirmed exactly** on all five cells.

---

## 6. Verbatim text — every string with its path

| path | # | text (verbatim) | raw length |
|---|---|---|---|
| `r.0.1.1.0.1.3.1.0.0.3.0.0.0` | #1310 | `#` | 1 |
| `r.0.1.1.0.1.3.1.0.0.3.0.0.1` | #1311 | `Name / Email` | 12 |
| `r.0.1.1.0.1.3.1.0.0.3.0.0.2` | #1312 | `Last Login/Notes` | 16 |
| `r.0.1.1.0.1.3.1.0.0.3.0.0.3` | #1313 | `Role / Status` | 13 |
| `r.0.1.1.0.1.3.1.0.0.3.0.0.4` | #1314 | `Actions` | 7 |

`<table>`, `<thead>`, `<tbody>` and the header `<tr>` carry no `text:` field.

**Truncation check:** the dump caps a `text:` field at **250 raw characters** (empirically verified — exactly
four nodes in the whole capture reach 250, the next-longest is 248). The longest header string is 16
characters. **No text in P07 is truncated.** Note the inconsistent spacing in the source strings —
`Name / Email` and `Role / Status` use spaces around the slash, `Last Login/Notes` does not. Reproduce them
character-for-character.

---

## 7. Rebuild spec — exact HTML + CSS

### 7.1 HTML

```html
<table class="table table-striped " ng-init="showPins=true;">
  <thead>
    <tr>
      <th>#</th>
      <th>Name / Email</th>
      <th>Last Login/Notes</th>
      <th>Role / Status</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <!-- three <tr ng-repeat="user in xrefs  "> — see P08 -->
  </tbody>
</table>
```

### 7.2 CSS — resolved, no variables, no flex, no grid

```css
table.table {
  display: table;
  box-sizing: border-box;
  width: 1768px;                 /* == 100% of the 1768px fieldset content box */
  max-width: 100%;
  margin: 0 0 20px 0;
  padding: 0;
  border: 0 none rgb(51,51,51);
  border-radius: 0;
  background-color: rgba(0,0,0,0);
  color: rgb(51,51,51);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  letter-spacing: normal;
  text-align: start;
  vertical-align: baseline;
  white-space: normal;
  overflow: visible;
  opacity: 1;
  box-shadow: none;
  cursor: auto;
}

table.table > thead { display: table-header-group; vertical-align: middle; }
table.table > tbody { display: table-row-group;    vertical-align: middle; }
table.table > thead > tr { display: table-row; vertical-align: middle;
                           background-color: rgba(0,0,0,0); }

table.table > thead > tr > th {
  display: table-cell;
  box-sizing: border-box;
  height: 60.5px;
  margin: 0;
  padding: 20px 8px;                              /* T/B 20px, L/R 8px */
  border: 0 none rgb(51,51,51);
  border-bottom: 1px solid rgb(221,221,221);      /* the ONLY painted border */
  border-radius: 0;
  background-color: rgba(0,0,0,0);
  color: rgb(51,51,51);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 14px;
  font-weight: 700;
  line-height: 20px;
  letter-spacing: normal;
  text-align: left;
  vertical-align: bottom;
  white-space: normal;
  overflow: visible;
  opacity: 1;
  box-shadow: none;
  cursor: auto;
}

/* Column widths — measured, exact. Apply to the header row; the auto table layout
   then propagates them to every <td> (confirmed: each td width in P08 equals its th width). */
table.table > thead > tr > th:nth-child(1) { width: 59.2656px; }
table.table > thead > tr > th:nth-child(2) { width: 722.703px; }
table.table > thead > tr > th:nth-child(3) { width: 386.406px; }
table.table > thead > tr > th:nth-child(4) { width: 313.789px; }
table.table > thead > tr > th:nth-child(5) { width: 285.836px; }
```

> `.table-striped` contributes **nothing to the header** — the header `tr` resolves to
> `background-color: rgba(0,0,0,0)`. Its only effect is `background-color: rgb(249,249,249)` on the 1st and
> 3rd `tbody` rows (evidence in P08: row 0 and row 2 carry it, row 1 does not → Bootstrap 3
> `nth-of-type(odd)` semantics).

### 7.3 Geometry assertions (Playwright / screenshot diff)

```
table                       x=37     y=489   w=1768     h=225.766
thead                       x=37     y=489   w=1768     h=60.5
thead > tr                  x=37     y=489   w=1768     h=60.5
th:nth-child(1)  "#"                x=37     y=489   w=59.2656  h=60.5
th:nth-child(2)  "Name / Email"     x=96.3   y=489   w=722.703  h=60.5
th:nth-child(3)  "Last Login/Notes" x=819    y=489   w=386.406  h=60.5
th:nth-child(4)  "Role / Status"    x=1205.4 y=489   w=313.789  h=60.5
th:nth-child(5)  "Actions"          x=1519.2 y=489   w=285.836  h=60.5
tbody                       x=37     y=549.5 w=1768     h=165.266
```

Invariants to assert: `Σ th widths == 1768 ± 0.001`; `thead.h + tbody.h == table.h`;
`th.borderBottomColor == "rgb(221, 221, 221)"` on all five; `th.fontWeight == "700"`;
`th.verticalAlign == "bottom"`; `th.padding == "20px 8px"`.

---

## 8. Honest gaps

1. **`border-collapse` / `border-spacing` are not in the captured property set.** `DEFAULTS.txt` lists 96
   properties and neither appears. I therefore **cannot assert** whether the table collapses borders. The
   observable consequence is visible though: the `th` bottom border (1px) and the row-0 `td` top border
   (1px) sit between `y=549.5-1` and `y=549.5` without doubling the 60.5/41 heights, which is consistent
   with `border-collapse: collapse`, but that is an inference, not a captured value — flagged as such.
2. **`table-layout` is not captured either.** The column widths above are *measured results*, not a
   declared column model. Reproduce them explicitly (as in §7.2) rather than hoping `auto` layout lands on
   the same numbers with different content.
3. **No `<colgroup>`, `<caption>` or `<tfoot>` exists** — this is a positive finding (the census over
   `r.0.1.1.0.1.3.1.0.0.3*` accounts for all 537 records as table + thead + tr + 5×th + tbody + 3×176 row
   records), not an uncaptured region.
4. **Header cells carry no sort affordance.** No `ng-click`, no `.sortable`, no caret/chevron `<i>`, no
   `aria-sort`. Whatever ordering the rows have is server-supplied.
5. **`.muted` and `badge-danger` are dead classes on this page — confirmed, but the evidence for each sits
   outside P07:**
   - `.muted`: does not occur anywhere in P07. It occurs at `r.0.1.1.0.1.3.1.5.0.0.63`, `…5.0.0.66` and
     `…5.0.0.1.3` (`<label class="muted">`), and those records list **no `color` deviation**, so `.muted`
     resolves to the COMMON `color: rgb(51, 51, 51)` — i.e. it does not mute anything.
   - `badge-danger`: does not occur in P07 either; it occurs in P08 on `span.badge.badge-danger`
     (`…3.1.N.1.18` / `…3.1.N.1.19`), where the resolved `background-color` is **`rgb(119, 119, 119)`** —
     plain Bootstrap `.badge` grey, i.e. the `-danger` modifier paints nothing extra.
   Both confirmations are cited to records I read in full; neither is inferred from memory.
6. **No CSS custom properties, no flexbox, no grid.** `INFO.txt` records `cssVars: {"root":{},"body":{}}`,
   and `DEFAULTS.txt` reports every flex/grid property with exactly **1 distinct value across all 2,156
   nodes**. Layout in P07 is pure CSS-table (`display:table` / `table-header-group` / `table-row-group` /
   `table-row` / `table-cell`). Confirmed for my own range: the nine P07 records deviate only on the
   properties enumerated in §5, none of which is flex/grid related.
