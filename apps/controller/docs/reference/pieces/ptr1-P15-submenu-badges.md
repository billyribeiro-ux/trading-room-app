# ptr1 · P15 — M3.d · `Badges` submenu (`ul.dropdown-menu`) — the 1-node capture

> **Evidence base for this file (read in full, line by line):**
> `/tmp/ptr-decode/ptr1/caps/08-dropdown_dropdown-menu.show/{INFO.txt,DEFAULTS.txt,nodes-000.txt}` (row 1, **1 node**),
> `/tmp/ptr-decode/ptr1/caps/13-dropdown_dropdown-menu.show/{INFO.txt,DEFAULTS.txt,nodes-000.txt}` (row 2, **1 node**),
> `/tmp/ptr-decode/ptr1/caps/18-dropdown_dropdown-menu.show/{INFO.txt,DEFAULTS.txt,nodes-000.txt}` (row 3, **1 node**),
> plus the same subtree in place as `r.3.1` inside `04-/09-/14-dropdown_dropdown-menu.dropdown-menu-right.show` (128-node captures), and as `…4.0.1.3.1` in the 2156-node full-DOM `00-baseline-room`.

---

## 1. Purpose

`M3.d` is the fourth submenu parent of the per-user row menu, labelled `Badges` with a `fa fa-certificate` icon and the standard `fa fa-caret-right pull-right` affordance. **Its `<ul class="dropdown-menu">` contains zero child elements in every capture** — the parent item, the icon, the caret and the toggle wiring all exist and work, but opening it reveals an empty `12px`-tall shell.

---

## 2. Trigger / parent item

The submenu is `r.3.1` inside the row menu; its parent item is `r.3` / `r.3.0`. The parent is fully built and fully measured — only the submenu body is empty.

```html
<li class="dropdown-submenu" ng-class="{open: submenuOpen.badges}">
  <a href="" ng-click="submenuOpen.badges=!submenuOpen.badges; submenuOpen.permissions=false; submenuOpen.granular=false; submenuOpen.app=false; $event.preventDefault(); $event.stopPropagation();">
    <i class="fa fa-certificate"></i> Badges <i class="fa fa-caret-right pull-right"></i>
  </a>
  <ul class="dropdown-menu"></ul>
</li>
```

| element | path (row-menu capture) | node # (cap 09 / 14) | text | icon class | rect (cap 09, row 2) | rect (cap 14, row 3) |
|---|---|---|---|---|---|---|
| parent `<li>` | `r.3` | `#4` | — | — | `x=1417.7 y=714.7 w=197.2 h=24.6` | `x=1417.7 y=777.1 w=197.2 h=24.6` |
| parent `<a>` | `r.3.0` | `#20` | `Badges` | — | `x=1417.7 y=714.7 w=197.2 h=24.6` | `x=1417.7 y=777.1 w=197.2 h=24.6` |
| leading icon | `r.3.0.0` | `#64` | — | `fa fa-certificate` | `x=1437.7 y=720.7 w=11.1 h=13` | `x=1437.7 y=783.1 w=11.1 h=13` |
| caret | `r.3.0.1` | `#65` | — | `fa fa-caret-right pull-right` | `x=1590.2 y=717.7 w=4.6 h=13` | `x=1590.2 y=780.1 w=4.6 h=13` |
| **submenu `<ul>`** | **`r.3.1`** | **`#21`** | — | — | **`x=0 y=0 w=0 h=0`** | **`x=0 y=0 w=0 h=0`** |

Resolved style of the parent `<li>` (cap 09 `#4`): P11 §5.2 plus `position: relative; top/right/bottom/left: 0px; width: 197.227px; height: 24.5703px`.
Resolved style of the parent `<a>` (cap 09 `#20`): P11 §5.4 verbatim — `display:block; width:197.227px; height:24.5703px; padding:3px 20px 3px 20px`.
`i.fa-certificate` (cap 09 `#64`): `display:inline-block; width:11.1484px; height:13px; font-family:FontAwesome; font-size:13px; line-height:13px; color:rgb(51,51,51); transform:matrix(1,0,0,1,0,0)`; `::before {"content":"\"\"","color":"rgb(51, 51, 51)","font-family":"FontAwesome","font-size":"13px","background-color":"rgba(0, 0, 0, 0)"}`.
Caret (cap 09 `#65`): as above plus `display:block; float:right; width:4.64844px; height:13px; margin-left:3.9px`; also carries a `::before`.

**Opener:** the `ng-click` above. **No `data-toggle`, no `data-target`.** The expression flips `submenuOpen.badges`, hard-clears `submenuOpen.permissions/granular/app`, then `preventDefault()` (the `href=""` must not navigate) and `stopPropagation()` (so the outer Angular-UI `dropdown` does not close). `ng-class="{open: submenuOpen.badges}"` puts `.open` on the `<li>`.
**Net effect in the live app: clicking `Badges` closes whichever other submenu was open and opens an empty panel.**

---

## 3. Item list in exact DOM order

**Empty — there are zero items.** No `<li>`, no `<a>`, no `<i>`, no divider, no `ng-click`, no `updateUser` opcode. There is nothing to tabulate and nothing has been invented.

---

## 4. Node table — the single node

### 4.1 Capture 08 / 13 / 18 (standalone), complete file contents

```
FULL node dump — capture[8] dropdown:dropdown-menu.show — records 0..0 of 1

#0 path=r <ul>
  rect: x=0 y=0 w=0 h=0
  attr class = "dropdown-menu show"
  attr style = "display: block;"
  style-deviations (0; all other props == COMMON in DEFAULTS.txt):

```

| # | path | tag | class / attrs | rect | renders |
|---|---|---|---|---|---|
| 0 | `r` | `ul` | `class="dropdown-menu show"` `style="display: block;"` | `x=0 y=0 w=0 h=0` | **no** |

That is the entire capture. `INFO.txt`: `node count : 1 (declared 1, truncated=false)`, `kind : subtree`, `emitted as : FULL node dump`.

The `style-deviations (0; …)` line is not a data loss — with a single node in the capture, that node's own values *are* the COMMON table, so nothing can deviate. The complete resolved style is `DEFAULTS.txt` verbatim (§5).

### 4.2 In-place node in the 128-node row-menu captures

| capture | row | # | path | tag | attrs | rect | resolved `display` |
|---|---|---|---|---|---|---|---|
| 04 | 1 | `#21` | `r.3.1` | `ul` | `class="dropdown-menu"` | `0,0,0,0` | `none` |
| 09 | 2 | `#21` | `r.3.1` | `ul` | `class="dropdown-menu"` | `0,0,0,0` | `none` |
| 14 | 3 | `#21` | `r.3.1` | `ul` | `class="dropdown-menu"` | `0,0,0,0` | `none` |

---

## 5. Resolved computed style (absolute)

`08/13/18-…/DEFAULTS.txt` is the full resolved style of the one node (every row reads `1/1 | 1`):

| prop | value |
|---|---|
| display | `block` (forced open by the harness) — `none` in its natural closed state (captures 04/09/14 `#21`) |
| visibility | `visible` |
| position | `absolute` |
| top | `100%` |
| right | `auto` |
| bottom | `auto` |
| **left** | **`0px`** |
| z-index | `1000` |
| float | `none` |
| box-sizing | `border-box` |
| width | `auto` |
| height | `auto` |
| min-width | `160px` |
| max-width | `none` |
| min-height | `0px` |
| max-height | `none` |
| flex / flex-direction / flex-wrap / flex-grow / flex-shrink / flex-basis | `0 1 auto` / `row` / `nowrap` / `0` / `1` / `auto` |
| align-items / align-self / justify-content / gap / order / grid-template-columns | `normal` / `auto` / `normal` / `normal` / `0` / `none` |
| margin-top / right / bottom / left | `2px` / `0px` / `0px` / `0px` |
| padding-top / right / bottom / left | `5px` / `0px` / `5px` / `0px` |
| border-top/right/bottom/left-width | `1px` / `1px` / `1px` / `1px` |
| border-top/right/bottom/left-style | `solid` ×4 |
| border-top/right/bottom/left-color | `rgba(0, 0, 0, 0.15)` ×4 |
| border-radius TL / TR / BL / BR | `2px` / `2px` / `2px` / `2px` |
| background-color | `rgb(255, 255, 255)` |
| background-image / position / size / repeat | `none` / `0% 0%` / `auto` / `repeat` |
| background-clip | `padding-box` |
| color | `rgb(51, 51, 51)` |
| font-family | `"Helvetica Neue", Helvetica, Arial, sans-serif` |
| font-size | `13px` |
| font-weight | `400` |
| font-style | `normal` |
| line-height | `18.5714px` |
| letter-spacing | `normal` |
| text-align | `left` |
| text-transform | `none` |
| text-decoration-line | `none` |
| text-shadow | `none` |
| text-overflow | `clip` |
| white-space | `normal` |
| vertical-align | `baseline` |
| word-break / overflow-wrap | `normal` / `normal` |
| overflow-x / overflow-y | `visible` / `visible` |
| opacity | `1` |
| box-shadow | `rgba(0, 0, 0, 0.176) 0px 6px 12px 0px` |
| outline-style / outline-width / outline-color | `none` / `3px` / `rgb(51, 51, 51)` |
| cursor | `auto` |
| pointer-events / user-select | `auto` / `auto` |
| transition-property / transition-duration | `all` / `0s` |
| transform / filter / object-fit | `none` / `none` / `fill` |
| list-style-type | `none` |
| content / resize / appearance | `normal` / `none` / `none` |
| fill / stroke | `rgb(0, 0, 0)` / `none` |

This is byte-for-byte the same style block as the other three submenus' containers (P12 §5.1, P13 §5.1, P14 §5.1) — the Badges shell is styled identically; only its content is missing.

**[DERIVED]** rendered box when opened: content height `0` ⇒ total height `5 + 5 (padding) + 1 + 1 (border) = 12px`; width `min-width: 160px` with `width: auto` and no content ⇒ `160px`. So it paints as a **160 × 12 px empty white rounded rectangle with a 1px `rgba(0,0,0,.15)` border and the standard drop shadow**, anchored at the parent `<li>`'s bottom-left `+ 2px`:
row 2 `x = 1417.7, y = 714.7 + 24.5703 + 2 = 741.27`; row 3 `x = 1417.7, y = 777.1 + 26.57 = 803.67`.

### 5.1 Theme invariance

`19-forced-darkTheme/IDENTICAL-TO-BASELINE.txt` and `20-forced-lightTheme/IDENTICAL-TO-BASELINE.txt`: *"2155 of 2156 nodes are byte-identical to baseline-room (rect, attrs, tag, text, ::before, ::after, and ALL computed style props)"* — the only differing node is `<body>`'s class. The Badges shell (and its parent item) look the same in both themes.

---

## 6. Verbatim text

**The submenu `<ul>` contains no text — it has no descendants at all.** The only string associated with this piece belongs to the parent item, one level up in the row menu:

| path | node # (cap 09) | verbatim text |
|---|---|---|
| `r.3.0` | `#20` | `Badges` |

**Truncation: none.** `INFO.txt` for captures 08, 13 and 18 all read `node count : 1 (declared 1, truncated=false)`. No ellipsis, no truncation marker, and the declared count matches the emitted count exactly — the capture did not run out of budget.

---

## 7. Three-row comparison — capture 08 vs 13 vs 18

**All three are BYTE-IDENTICAL apart from the capture index in the header line.**

```
$ diff 08-…/nodes-000.txt 13-…/nodes-000.txt
1c1
< FULL node dump — capture[8] dropdown:dropdown-menu.show — records 0..0 of 1
---
> FULL node dump — capture[13] dropdown:dropdown-menu.show — records 0..0 of 1

$ diff 08-…/nodes-000.txt 18-…/nodes-000.txt
1c1
< FULL node dump — capture[8] …
---
> FULL node dump — capture[18] …

$ diff 08-…/DEFAULTS.txt 13-…/DEFAULTS.txt     # (no output)
$ diff 08-…/DEFAULTS.txt 18-…/DEFAULTS.txt     # (no output)
```

All three `INFO.txt` declare `node count : 1 (declared 1, truncated=false)`.

**Verification of the 42/42/41 finding against MY menu:** the row-3 divergence is real, but it does **not** touch this piece. It is `r.1.1.0` in Granular Perms (`ng-show="user.role !== 1"` gaining `class="ng-hide"` for row 3, P13). Evidence at the row-menu level:

| capture | row | `DEFAULTS.txt` line 6 | `display:none` nodes among the 128 |
|---|---|---|---|
| 04 | 1 | `display \| list-item \| 42/128 \| 4` | `r.0.1`, `r.1.1`, `r.2.1`, **`r.3.1`**, `r.1.1.5` |
| 09 | 2 | `display \| list-item \| 42/128 \| 4` | `r.0.1`, `r.1.1`, `r.2.1`, **`r.3.1`**, `r.1.1.5` |
| 14 | 3 | `display \| list-item \| 41/128 \| 4` | `r.0.1`, `r.1.1`, `r.2.1`, **`r.3.1`**, `r.1.1.5`, `r.1.1.0` |

`r.3.1` — this piece's node — is in the `display:none` list in all three rows purely because the submenu is *closed*, exactly like the other three submenu shells. It contributes **zero** `<li>` to the 42/42/41 count in every row, so it cannot be the source of the difference. `43 <li> − 1 = 42` (rows 1–2); `43 − 2 = 41` (row 3) — arithmetic closes without any Badges contribution.

**Conclusion for P15: the Badges submenu is IDENTICAL across all three user rows — a single empty `<ul>`, no conditionals, no per-row variation.**

---

## 8. Rebuild spec

### 8.1 HTML

```html
<li class="dropdown-submenu" ng-class="{open: submenuOpen.badges}">
  <a href="" ng-click="submenuOpen.badges=!submenuOpen.badges; submenuOpen.permissions=false; submenuOpen.granular=false; submenuOpen.app=false; $event.preventDefault(); $event.stopPropagation();"><i class="fa fa-certificate"></i> Badges <i class="fa fa-caret-right pull-right"></i></a>
  <ul class="dropdown-menu"></ul>
</li>
```

The empty `<ul>` is reproduced verbatim — that is what the reference ships.

### 8.2 CSS

Identical to the other three submenu shells:

```css
.dropdown-submenu                    { position:relative; }
.dropdown-submenu > ul.dropdown-menu {
  display:none;
  position:absolute; top:100%; left:0; z-index:1000;
  box-sizing:border-box; min-width:160px; width:auto;
  margin:2px 0 0 0; padding:5px 0;
  list-style:none; text-align:left; white-space:normal;
  color:rgb(51,51,51); font:400 13px/18.5714px "Helvetica Neue",Helvetica,Arial,sans-serif;
  background-color:rgb(255,255,255); background-clip:padding-box;
  border:1px solid rgba(0,0,0,.15); border-radius:2px;
  box-shadow:rgba(0,0,0,.176) 0 6px 12px 0;
  cursor:auto; opacity:1; overflow:visible;
}
.dropdown-submenu.open > ul.dropdown-menu,
ul.dropdown-menu.show { display:block; }
```

With no children this resolves to a `160 × 12 px` empty panel (**[DERIVED]**, §5).

### 8.3 Conditional logic

**There is none.** The parent `<li>` carries no `ng-if` / `ng-show` / `ng-hide`; the submenu `<ul>` carries no attributes at all beyond `class="dropdown-menu"`. The Badges item renders for **every** user for whom the parent Actions menu renders (`user.role !== 0`), identically for `role === 1` and every other role. Its visibility is controlled solely by `submenuOpen.badges` on the parent `<li>`.

---

## 9. Honest gaps — and the direct answer to the question posed

### 9.1 What exactly is the single node?

It is the **Badges submenu's own `<ul>` container** — `<ul class="dropdown-menu show" style="display: block;">` at `path=r`, i.e. `r.3.1` in the row-menu tree and `r.0.1.1.0.1.3.1.0.0.3.1.{0,1,2}.4.0.1.3.1` in the full-DOM baseline. It is not a stray item, not a placeholder, and not a truncated fragment.

### 9.2 Is the submenu genuinely empty, or did the capture fail? — **GENUINELY EMPTY.**

Five independent lines of evidence, all pointing the same way:

1. **The capture declares completeness.** `08/13/18-…/INFO.txt`: `node count : 1 (declared 1, truncated=false)`. Declared equals emitted; the truncation flag is explicitly false. A budget-limited capture would show `declared > emitted` or `truncated=true`, as nothing here does.
2. **The 128-node row-menu captures contain no `r.3.1.*` descendants.** `grep "path=r\.3\.1" 04*/nodes-*.txt` (and 09, 14) returns exactly one line each — `#21 path=r.3.1 <ul>` — and nothing deeper. Those captures were *not* rooted at the Badges submenu and had no reason to stop there; they happily emitted 9 descendants under `r.0.1`, 12 under `r.1.1` and 9 under `r.2.1` in the very same dump.
3. **The full-DOM baseline agrees.** `grep "path=…4.0.1.3.1\." 00-baseline-room/nodes-*.txt` → **0 hits**, for all three rows. In the same baseline, `…4.0.1.3.0` (`<a>`), `…4.0.1.3.0.0` (`<i class="fa fa-certificate">`) and `…4.0.1.3.0.1` (`<i class="fa fa-caret-right pull-right">`) are all present — so the sibling subtree captured fine and only the `<ul>` is childless.
4. **The node arithmetic closes exactly without Badges.** The row menu is `5 <ul> + 43 <li> + 35 <a> + 45 <i> = 128`. Distributing: root `13 li / 10 a / 14 i`, Permissions `9 / 8 / 10`, Granular `12 / 9 / 8`, App `9 / 8 / 13`, Badges `0 / 0 / 0`. Sum: `13+9+12+9 = 43 li` ✔, `10+8+9+8 = 35 a` ✔, `14+10+8+13 = 45 i` ✔. **There is no room in the 128 for any Badges child.**
5. **All three rows agree, byte-for-byte** (§7), so it is not a per-user data condition either.

### 9.3 Remaining gaps

1. **No geometry.** The one rect is `x=0 y=0 w=0 h=0` in captures 08/13/18 — the harness forced `display:block` onto the `<ul>` after the parent row menu had already reverted to `display:none`, so nothing was laid out. The `160 × 12 px` figure in §5 is arithmetic from the captured `min-width`, `padding` and `border`, not a measurement.
2. **Hover / focus / `.open` styling is not captured** for the parent item or the empty shell.
3. **Why the submenu is empty is not answerable from this evidence.** The markup shows a fully-wired parent with an empty container. Whether the badge items are (a) rendered by an `ng-repeat` over a collection that is empty for these three users, (b) a feature not yet implemented, or (c) gated by something outside the captured DOM, **cannot be determined** — there is no `ng-repeat`, `ng-if` or any other attribute on the `<ul>` to indicate a data binding, and no badge markup anywhere in the 2156-node baseline to compare against. Treat it as an honest gap, not as an invitation to invent items.
4. **No rendered screenshot** of the opened Badges panel exists in the evidence set, so the `160 × 12 px` empty-panel appearance has not been pixel-verified.
5. **`fa fa-certificate` renders correctly** — its `::before` record is present (cap 09 `#64`), unlike the three blank-glyph offenders elsewhere in the menu (`fa fa-user-circle` ×2 in P13, `fa fa-reload` ×1 in P14).
