# prt2 — Q09 · Iframes and reCAPTCHA

**Purpose.** Individually verify every `<iframe>` in the SECOND reference capture — `src`,
dimensions, position, `sandbox`, `allow`, `title`, `name`, and what each one actually embeds — plus
the reCAPTCHA plumbing around them (mount div, sitekey, response textarea, off-screen bubble
scaffolding, challenge tokens), and state plainly what a rebuild does about reCAPTCHA.

**Evidence root.** `/tmp/ptr-decode/prt2/`
**Capture.** `caps/00-baseline-room/` — 882 records, `truncated=false` (`INFO.txt:6`).
**Page.** `https://protradingroom.com/ptrApp#/page/welcome` (`00-META.txt:6`), viewport 1842×1265 @dpr2.

**Path anchors for this piece.**
* Body-level reCAPTCHA scaffolding: `r.12`, `r.13`, `r.15` (3 sibling `<div>`s, records `#13 #14 #16`)
  and their subtrees — **15 records total**.
* In-form reCAPTCHA widget: `r.0.1.1.0.1.0.1.0.0.3.` — **6 records** (`#109 #129 #157 #217 #184 #158`).
* Loader script: `r.0.1.2` (record `#34`).

Element count: `grep -o '<iframe>'` over `nodes-*.txt` → **5**, matching the census in
`prt2-Q08-forms-and-inputs.md §1`.

---

## 1. THE FIVE IFRAMES — individually verified

### IFRAME 1 — `#35` · `path=r.12.3.0` · bframe (zero-sized)

`nodes-000.txt:993-1023`

| field | value (verbatim) |
|---|---|
| `title` | `recaptcha challenge expires in two minutes` |
| `name` | `c-g8o2ifrad64d` |
| `frameborder` | `0` |
| `scrolling` | `no` |
| `sandbox` | `allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation allow-modals allow-popups-to-escape-sandbox allow-storage-access-by-user-activation` |
| `allow` | **ABSENT** — no `allow` attribute on this or any other iframe in the dump |
| inline `style` | `width: 0px; height: 0px;` |
| `src` | `https://www.google.com/recaptcha/api2/bframe?hl=en&v=A7KpaEASfhDcK0nXxgQEyyYv&k=6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx&bft=0dAFcWeA4YbSQP1DurnKHZ3cEoiRDL6-QM4GOeI1w3Xu8NNITZpKY9_SvlEct1fp-xvB0KCgqwtFH6ltmvBtilk2sLo5IXAKB0yw` |
| rect | `x=1 y=-9984 w=0 h=0` |

**Embeds:** the Google reCAPTCHA v2 **challenge (bframe)** — the image-grid puzzle overlay. Not app
content.

Resolved absolute style (21 deviations; remainder from `DEFAULTS.txt`):
`display: inline` · `visibility: hidden` `[COMMON DEFAULTS.txt:7]` · `width: 0px` · `height: 0px` ·
`padding: 0px 0px 0px 0px` · `border-*-width: 0px` `[COMMON:41-44]` ·
`border-*-style: inset` (all four) · `border-*-color: rgb(51,51,51)` `[COMMON:45-48]` ·
`position: static` `[COMMON:8]` · `font-family: "Helvetica Neue", Helvetica, Arial, sans-serif` ·
`font-size: 14px` · `line-height: 20px` · `text-align: start` · `vertical-align: baseline` ·
`overflow-x: clip` · `overflow-y: clip` · `cursor: auto` · `transition-property: all` ·
`transition-duration: 0s` · `background-color: rgba(0,0,0,0)` `[COMMON:56]` ·
`opacity: 1` `[COMMON:81]` · `z-index: auto` `[COMMON:13]`.

---

### IFRAME 2 — `#36` · `path=r.13.3.0` · bframe (300×150)

`nodes-000.txt:1025-1055`

| field | value |
|---|---|
| `title` | `recaptcha challenge expires in two minutes` |
| `name` | `c-nso17np7r7zv` |
| `frameborder` | `0` · `scrolling` `no` |
| `sandbox` | **identical string** to IFRAME 1 (verified byte-for-byte) |
| `allow` | ABSENT |
| inline `style` | `width: 100%; height: 100%;` |
| `src` | `https://www.google.com/recaptcha/api2/bframe?hl=en&v=A7KpaEASfhDcK0nXxgQEyyYv&k=6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx&bft=0dAFcWeA5K94K7q-ETS5tRqpX3jOra9hYzhiknfrb0JbudetKvrQRlyF_lQaSFN7qHI9zaxdpAQacIcZhPrNy6BV_N5UvYavBRZA` |
| rect | `x=1 y=-9999 w=300 h=150` |

**Embeds:** reCAPTCHA v2 challenge (bframe). Resolved style identical to IFRAME 1 except
`width: 300px`, `height: 150px`.

---

### IFRAME 3 — `#37` · `path=r.15.3.0` · bframe (300×150)

`nodes-000.txt:1057-1087`

| field | value |
|---|---|
| `title` | `recaptcha challenge expires in two minutes` |
| `name` | `c-4ecrn9oay2le` |
| `frameborder` | `0` · `scrolling` `no` |
| `sandbox` | **identical string** to IFRAMES 1 & 2 |
| `allow` | ABSENT |
| inline `style` | `width: 100%; height: 100%;` |
| `src` | `https://www.google.com/recaptcha/api2/bframe?hl=en&v=A7KpaEASfhDcK0nXxgQEyyYv&k=6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx&bft=0dAFcWeA7uzktQT7KX2xKy2Nl49PCiZKU1s-Z8oObOyaItOzpiEFJwJbOVjg7gdwDT3xhh7K9qU6IEAhkbZSib8tJmlyaOLgCr3g` |
| rect | `x=1 y=-9999 w=300 h=150` |

**Embeds:** reCAPTCHA v2 challenge (bframe). Resolved style identical to IFRAME 2.

**Cross-link:** `name="c-4ecrn9oay2le"` matches the anchor frame's `name="a-4ecrn9oay2le"`
(IFRAME 5) — same reCAPTCHA instance id, `a-` = anchor, `c-` = challenge. IFRAMES 1 and 2 carry ids
`c-g8o2ifrad64d` and `c-nso17np7r7zv` with **no matching `a-` anchor frame in this capture** — i.e.
two orphaned challenge frames from earlier widget instantiations that were never torn down.

---

### IFRAME 4 — `#158` · `path=r.0.1.1.0.1.0.1.0.0.3.0.1` · **unattributed, `display:none`**

`nodes-001.txt:1080-1108` — this is the record that the prior report's blanket claim glosses over.

| field | value |
|---|---|
| `title` | **ABSENT** |
| `name` | **ABSENT** |
| `src` | **ABSENT** — no `src` attribute is present in the record |
| `sandbox` | **ABSENT** |
| `allow` | ABSENT |
| `frameborder` / `scrolling` | ABSENT |
| inline `style` | `display: none;` — the **only** attribute on the element |
| rect | `x=0 y=0 w=0 h=0` |

Resolved style (25 deviations): `display: none` · `visibility: visible` · `width: auto` ·
`height: auto` `[COMMON:20]` · `padding: 0px` · `border-*-width: 2px` (all four — the UA default,
not the `0px` COMMON) · `border-*-style: inset` (all four) · `font 14px/20px "Helvetica Neue",
Helvetica, Arial, sans-serif` · `text-align: start` · `vertical-align: baseline` ·
`overflow-x/y: clip` · `cursor: auto` · `transition: all 0s`.

**What it embeds — HONEST GAP.** It has no `src`, so I cannot assert what it loads. What I *can*
assert from evidence: it is the **second child of `div.g-recaptcha`'s inner wrapper's parent** —
specifically a sibling of `#157` (`div style="width: 304px; height: 78px;"`, which itself contains
the anchor iframe `#217`). Both live inside `#129` `div.g-recaptcha
data-sitekey="6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx"`. Structural position therefore places it
inside the reCAPTCHA widget, and it retains the UA default `border-width: 2px` that Google's own
frames override — consistent with a freshly-created, never-configured helper frame.

**Correction to prior work:** "all five are Google reCAPTCHA" is only defensible for four. For this
fifth iframe, "**inside the reCAPTCHA widget by DOM position; `src` not captured**" is the honest
statement.

---

### IFRAME 5 — `#217` · `path=r.0.1.1.0.1.0.1.0.0.3.0.0.0` · anchor frame (the checkbox)

`nodes-001.txt:2796-2829`

| field | value |
|---|---|
| `title` | `reCAPTCHA` |
| `width` / `height` (attrs) | `304` / `78` |
| `role` | `presentation` |
| `name` | `a-4ecrn9oay2le` |
| `frameborder` | `0` · `scrolling` `no` |
| `sandbox` | **identical string** to IFRAMES 1–3 |
| `allow` | ABSENT |
| inline `style` | ABSENT |
| `src` | `https://www.google.com/recaptcha/api2/anchor?ar=1&k=6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx&co=aHR0cHM6Ly9wcm90cmFkaW5ncm9vbS5jb206NDQz&hl=en&v=A7KpaEASfhDcK0nXxgQEyyYv&size=normal&anchor-ms=20000&execute-ms=30000&cb=b47umiriyero` |
| rect | `x=0 y=0 w=0 h=0` (ancestor `#109` is `.ng-hide`) |

**Embeds:** the Google reCAPTCHA v2 **anchor** — the "I'm not a robot" checkbox widget.

Decoded `src` query parameters:

| param | value | meaning |
|---|---|---|
| `ar` | `1` | anchor render flag |
| `k` | `6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx` | **sitekey** |
| `co` | `aHR0cHM6Ly9wcm90cmFkaW5ncm9vbS5jb206NDQz` | base64 of **`https://protradingroom.com:443`** (verified by decode) |
| `hl` | `en` | UI language |
| `v` | `A7KpaEASfhDcK0nXxgQEyyYv` | reCAPTCHA JS build id — identical across all 4 Google frames |
| `size` | `normal` | 304×78 checkbox variant |
| `anchor-ms` | `20000` | anchor load timeout |
| `execute-ms` | `30000` | execute timeout |
| `cb` | `b47umiriyero` | per-instantiation callback nonce |

Resolved style (22 deviations): `display: inline` · `visibility: visible` · `width: 304px` ·
`height: 78px` · `padding: 0px` · `border-*-style: inset` ×4 · `border-*-width: 0px` `[COMMON:41-44]` ·
`font 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif` · `text-align: start` ·
`vertical-align: baseline` · `overflow-x/y: clip` · `cursor: auto` · `transition all 0s`.

---

## 2. Iframe summary matrix

| # | rec | path | `title` | `name` | `src` kind | box (rect) | `sandbox` | `allow` |
|---|---|---|---|---|---|---|---|---|
| 1 | `#35` | `r.12.3.0` | `recaptcha challenge expires in two minutes` | `c-g8o2ifrad64d` | `api2/bframe` | `1,−9984  0×0` | ✔ (string A) | ✘ |
| 2 | `#36` | `r.13.3.0` | `recaptcha challenge expires in two minutes` | `c-nso17np7r7zv` | `api2/bframe` | `1,−9999  300×150` | ✔ (string A) | ✘ |
| 3 | `#37` | `r.15.3.0` | `recaptcha challenge expires in two minutes` | `c-4ecrn9oay2le` | `api2/bframe` | `1,−9999  300×150` | ✔ (string A) | ✘ |
| 4 | `#158` | `…0.0.3.0.1` | ✘ | ✘ | **none captured** | `0,0  0×0` | ✘ | ✘ |
| 5 | `#217` | `…0.0.3.0.0.0` | `reCAPTCHA` | `a-4ecrn9oay2le` | `api2/anchor` | `0,0  0×0` | ✔ (string A) | ✘ |

**String A** (verified byte-identical on all four occurrences; attribute census counts `sandbox` ×4):

```
allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation allow-modals allow-popups-to-escape-sandbox allow-storage-access-by-user-activation
```

**Verdict on the prior claim "identical sandbox string" — CONFIRMED for the four frames that have
one; iframe `#158` has none.**
**Verdict on "sitekey `6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx`" — CONFIRMED, and it appears in
5 places: `data-sitekey` on `#129`, and the `k=` parameter of all four Google `src`s.**
**Verdict on "none are app content" — CONFIRMED. Zero iframes carry app URLs, app classes, or
`ng-*` attributes.**

---

## 3. The off-screen reCAPTCHA scaffolding — 15 records, not 14

**Correction to prior work: the count is 15, not 14.** Programmatic scan of every `rect:` line for a
negative `y`:

| rec | path | tag | rect | inline `style` (verbatim) |
|---|---|---|---|---|
| `#13` | `r.12` | `div` | `0,−10000  2×2` | `background-color: rgb(255, 255, 255); border: 1px solid rgb(204, 204, 204); box-shadow: rgba(0, 0, 0, 0.2) 2px 2px 3px; position: absolute; transition: visibility linear 0.3s, opacity 0.3s linear; opacity: 0; visibility: hidden; z-index: 2000000000; left: 0px; top: -10000px;` |
| `#14` | `r.13` | `div` | `0,−10000  302×157` | *(identical string to `#13`)* |
| `#16` | `r.15` | `div` | `0,−10000  302×157` | *(identical string to `#13`)* |
| `#20` | `r.12.1` | `div.g-recaptcha-bubble-arrow` | `1,−10010  22×22` | `border: 11px solid transparent; width: 0px; height: 0px; position: absolute; pointer-events: none; margin-top: -11px; z-index: 2000000000;` |
| `#21` | `r.12.2` | `div.g-recaptcha-bubble-arrow` | `1,−10009  20×20` | `border: 10px solid transparent; …; margin-top: -10px; z-index: 2000000000;` |
| `#22` | `r.12.3` | `div` | `1,−9999  0×0` | `z-index: 2000000000; position: relative; width: 0px; height: 0px;` |
| `#24` | `r.13.1` | `div.g-recaptcha-bubble-arrow` | `1,−10010  22×22` | *(as `#20`)* |
| `#25` | `r.13.2` | `div.g-recaptcha-bubble-arrow` | `1,−10009  20×20` | *(as `#21`)* |
| `#26` | `r.13.3` | `div` | `1,−9999  300×155` | `z-index: 2000000000; position: relative;` |
| `#28` | `r.15.1` | `div.g-recaptcha-bubble-arrow` | `1,−10010  22×22` | *(as `#20`)* |
| `#29` | `r.15.2` | `div.g-recaptcha-bubble-arrow` | `1,−10009  20×20` | *(as `#21`)* |
| `#30` | `r.15.3` | `div` | `1,−9999  300×155` | `z-index: 2000000000; position: relative;` |
| `#35` | `r.12.3.0` | `iframe` | `1,−9984  0×0` | `width: 0px; height: 0px;` |
| `#36` | `r.13.3.0` | `iframe` | `1,−9999  300×150` | `width: 100%; height: 100%;` |
| `#37` | `r.15.3.0` | `iframe` | `1,−9999  300×150` | `width: 100%; height: 100%;` |

**Total: 15 records at `y ≤ −9984`.** All three subtrees carry `z-index: 2000000000`.

Three further records belong to the same scaffolding but sit at `y=0` with a full-viewport box —
the challenge scrims. `#19` (`r.12.0`), `#23` (`r.13.0`), `#27` (`r.15.0`), all with the same inline
style:

```
width: 100%; height: 100%; position: fixed; top: 0px; left: 0px;
z-index: 2000000000; background-color: rgb(255, 255, 255); opacity: 0.05;
```

resolving to `position: fixed`, `top/right/bottom/left: 0px`, `1842×1265`, `opacity: 0.05`,
`background-color: rgb(255, 255, 255)`, `z-index: 2000000000`
(`nodes-000.txt:486-512`, `622-648`, `758-784`).

So the **complete** reCAPTCHA body-level footprint is **18 records** across `r.12`, `r.13`, `r.15`
(3 roots × 6 descendants incl. self). Add the 6 in-form records (`#109 #129 #157 #217 #184 #158`)
and the loader script `#34` → **25 of the 882 records (2.84 %) are reCAPTCHA machinery.**

Also present: **`#15`** `input[type=file]` at `x=0 y=1265 w=0 h=0` — off-screen but *positive* `y`;
that one is the app's `ngf-select` file input, **not** reCAPTCHA (see `prt2-Q08 §4.6`).

---

## 4. reCAPTCHA plumbing on the app side

| rec | path | element | evidence |
|---|---|---|---|
| `#34` | `r.0.1.2` | `<script src="https://www.google.com/recaptcha/api.js" class="ng-scope">` | `nodes-000.txt:972-975`. `class="ng-scope"` ⇒ **the loader tag is inside an AngularJS template**, not the static shell. |
| `#109` | `r.0.1.1.0.1.0.1.0.0.3` | `div.form-group.has-feedback.ng-hide` `ng-show="failedLoginCount >= 3"` | `nodes-000.txt:3189-3192`. The whole widget is gated behind **3 failed logins**. |
| `#129` | `…3.0` | `div.g-recaptcha data-sitekey="6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx"` | `nodes-001.txt:281-284` |
| `#157` | `…3.0.0` | `div style="width: 304px; height: 78px;"` | `nodes-001.txt:1059-1061` |
| `#217` | `…3.0.0.0` | anchor iframe (IFRAME 5) | `nodes-001.txt:2796` |
| `#184` | `…3.0.0.1` | `textarea#g-recaptcha-response-4 name="g-recaptcha-response" class="g-recaptcha-response"` | `nodes-001.txt:1789-1794` |
| `#158` | `…3.0.1` | unattributed iframe (IFRAME 4) | `nodes-001.txt:1080-1082` |

The `-4` suffix on `g-recaptcha-response-4` means Google's script had already instantiated widgets
0…3 in this page session — corroborating the two orphan bframes in §1.

---

## 5. The three reCAPTCHA challenge tokens — RECORDED AS SESSION DATA

The `bft=` parameter of each bframe `src` is a **live, per-session reCAPTCHA challenge token**.
Recorded here verbatim **as evidence of what the capture contains**, and flagged accordingly.

| iframe | `name` | `bft` token |
|---|---|---|
| `#35` `r.12.3.0` | `c-g8o2ifrad64d` | `0dAFcWeA4YbSQP1DurnKHZ3cEoiRDL6-QM4GOeI1w3Xu8NNITZpKY9_SvlEct1fp-xvB0KCgqwtFH6ltmvBtilk2sLo5IXAKB0yw` |
| `#36` `r.13.3.0` | `c-nso17np7r7zv` | `0dAFcWeA5K94K7q-ETS5tRqpX3jOra9hYzhiknfrb0JbudetKvrQRlyF_lQaSFN7qHI9zaxdpAQacIcZhPrNy6BV_N5UvYavBRZA` |
| `#37` `r.15.3.0` | `c-4ecrn9oay2le` | `0dAFcWeA7uzktQT7KX2xKy2Nl49PCiZKU1s-Z8oObOyaItOzpiEFJwJbOVjg7gdwDT3xhh7K9qU6IEAhkbZSib8tJmlyaOLgCr3g` |

Plus the per-instantiation anchor callback nonce **`cb=b47umiriyero`** on `#217`.

> ⛔ **SESSION DATA — DO NOT PORT.** These four values are bound to the captured browser session and
> to the moment `2026-07-24T15:59:40.487Z`. They are short-lived ("expires in two minutes", per the
> iframes' own `title`) and are therefore already dead, but they must **never** be hard-coded,
> committed, or replayed. They are listed here only because rule 1 requires citing the evidence.
> The `data-sitekey` is *not* in this category — a v2 sitekey is a public, per-domain value.

The full sensitive-data register (JWT, ObjectIds, email) lives in `prt2-Q12-gaps-and-pii.md §b`.

---

## 6. What a rebuild does about reCAPTCHA — stated plainly

1. **Do not port any of the 25 reCAPTCHA records as markup.** All of `r.12`, `r.13`, `r.15`, the
   `g-recaptcha-bubble-arrow` divs, the `opacity: 0.05` scrims, the `bframe`/`anchor` iframes and
   the `g-recaptcha-response` textarea are **generated at runtime by
   `https://www.google.com/recaptcha/api.js`**. Hand-writing them would produce dead DOM that never
   receives a token.

2. **Port exactly two things:**
   * the loader — `<script src="https://www.google.com/recaptcha/api.js">`, and
   * the mount point — `<div class="g-recaptcha" data-sitekey="…">` inside a block gated on
     `failedLoginCount >= 3`.

   Google's script then reproduces the other 23 records byte-for-byte on its own.

3. **The sitekey is environment configuration, not source.** `6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx`
   is bound to `https://protradingroom.com:443` (proved by the base64 `co` parameter). A rebuild
   served from any other origin will get a "This site key is not enabled for this domain" error.
   Read it from an env var (`PUBLIC_RECAPTCHA_SITE_KEY`), do not inline it.

4. **The gate is `failedLoginCount >= 3`, not "always".** In the reference the whole widget is
   `ng-hide` at capture time and contributes **zero pixels**. A rebuild that renders reCAPTCHA
   unconditionally will *not* match the reference screenshot.

5. **Zero pixel impact on this page.** All five iframes have either a `0×0` rect or a rect parked at
   `y ≈ −10000`. Nothing in the reference's visible 1842×1265 viewport comes from an iframe. This
   piece therefore contributes **no** pixel-matching obligations — only behavioural ones.

6. **Sandbox / CSP.** If the rebuild sets a CSP, `frame-src` must permit `https://www.google.com`.
   Do not attempt to add `sandbox` yourself — Google sets String A on its own frames, and an
   outer-imposed sandbox will break `allow-same-origin`.

7. **Svelte 5 note.** `api.js` mutates the DOM under the mount node. Render the mount div from a
   plain `{#if failedLoginCount >= 3}` block and never let Svelte re-key or re-render that subtree
   while it is mounted, or Google's injected children get destroyed. Load the script once via
   `onMount` with an idempotent guard (`if (window.grecaptcha) return`).

---

## 7. HONEST GAPS for this piece

1. **IFRAME 4 (`#158`) has no captured `src`.** I state its DOM position and its inherited UA
   border, and nothing more. What it loads is **unknown from this dump**. Closing it requires a
   capture that serialises `src` even when empty/`about:blank`, or a network log.
2. **No `allow` attribute anywhere.** The attribute census over all 882 records lists no `allow`.
   I therefore assert its absence, not its value.
3. **Iframe *contents* are not captured.** All five are cross-origin (`www.google.com`); the dump
   contains only the host elements. Nothing inside any reCAPTCHA frame — the checkbox, the puzzle,
   the branding, the badge — is available. This is an unavoidable, honest gap.
4. **Two orphan bframes are unexplained.** `c-g8o2ifrad64d` and `c-nso17np7r7zv` have no matching
   `a-` anchor in this capture. The `g-recaptcha-response-**4**` id says at least five widget
   instantiations occurred. Why three challenge frames survived is not derivable from the dump.
5. **No screenshot.** `00-META.txt` lists 4 DOM captures + 1 meta record, no image. Since every
   iframe is off-screen or `0×0` this does not block *this* piece, but it is recorded for the
   register in `prt2-Q12`.
6. **`src` truncation limit not reached.** Attribute values are truncated at 300 raw characters
   (proved in `prt2-Q12 §a.2`); the longest iframe `src` here is 230 characters, so **all five
   `src` values are complete, not truncated.**
