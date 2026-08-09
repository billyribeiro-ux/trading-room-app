# ptr1-P26 — Stylesheet inventory, load order, and what overrides what

**Purpose.** Enumerate all 15 stylesheets attached to the Manage-Room page (`/ptrApp#/page/manageSession/6a628a99731b9f77ae9bf505`, room `id=3625`) with index, href, rule count, byte size, app-vs-vendor classification and derivable version, then state the cascade order and the specific places where a later sheet silently overrides an earlier one. This is the map a SvelteKit rebuild needs before it can decide what to keep, what to drop, and what is a trap.

**Evidence base.** `/tmp/ptr-decode/ptr1/00-META.txt:61–77` (stylesheet index), the 15 decoded sheets `/tmp/ptr-decode/ptr1/01-stylesheets/00.css … 14.css` (read end-to-end, 5,752 lines / 434,385 bytes / 4,498 rules), and `/tmp/ptr-decode/ptr1/caps/00-baseline-room/` (2,156 nodes, `DEFAULTS.txt` + `nodes-000…017.txt`) for computed proof.

---

## 1. The exhaustive sheet table

Byte sizes are the values reported by the capture (`00-META.txt`); "lines" is the decoded file on disk.

| # | href | Rules | Bytes | Lines | App/Vendor | Version derivable? | Governs |
|---|---|---:|---:|---:|---|---|---|
| 00 | *(inline `<style>`)* | 2 | 78 | 2 | Vendor (video.js JS-injected) | — | Video.js default box: `.video-js{width:300px;height:150px}` `.vjs-fluid{padding-top:56.25%}` (`00.css:2–3`) |
| 01 | *(inline `<style>`)* | 2 | 169 | 2 | Vendor (AngularJS runtime-injected) | AngularJS 1.x | `ng-cloak`/`ng-hide` hiding + `ng:form{display:block}` (`01.css:2–3`) |
| 02 | `https://protradingroom.com/public/app/css/bootstrap.min.css` | 1187 | 134,760 | 1577 | Vendor, self-hosted | **Bootstrap 3.3.x** (see §3) | Normalize, grid, type scale, forms, buttons, nav/navbar, dropdown, modal, popover/tooltip, panel, label/badge, alert, table, carousel, responsive utilities, Glyphicons `@font-face` |
| 03 | `https://vjs.zencdn.net/7.3.0/video-js.min.css` | **0** | 12 | 1 | Vendor, CDN | **video.js 7.3.0** (from href) | **CORS-BLOCKED — content absent.** See §4 |
| 04 | `https://protradingroom.com/public/vendor/angularjs-color-picker/angularjs-color-picker.min.css` | 48 | 30,377 | 48 | Vendor, self-hosted | not derivable | Colour-picker widget: swatch, panel, hue/saturation/lightness/alpha columns, grid + 2 embedded base64 PNG overlays (`04.css:26`, `04.css:41`) |
| 05 | `…/angularjs-color-picker-bootstrap.min.css` | 3 | 254 | 3 | Vendor, self-hosted | not derivable | Bootstrap adapter for the picker: input-wrapper 100%, swatch height 28px, addon radius 4px (`05.css:2–4`) |
| 06 | `https://protradingroom.com/public/vendor/angular-xeditable/dist/css/xeditable.min.css` | 23 | 2,643 | 31 | Vendor, self-hosted | not derivable | Inline-edit affordance: `.editable-click` link style, `.editable-buttons`, `.editable-wrap`, `.popover-wrapper form` + its two 750px media queries (`06.css:23–31`) |
| 07 | `https://cdnjs.cloudflare.com/ajax/libs/angularjs-toaster/2.2.0/toaster.min.css` | **0** | 12 | 1 | Vendor, CDN | **angularjs-toaster 2.2.0** (from href) | **CORS-BLOCKED — content absent.** See §4 |
| 08 | `https://protradingroom.com/public/vendor/textAngular/src/textAngular.css` | 26 | 3,412 | 26 | Vendor, self-hosted (**unminified `src/`**) | not derivable | Rich-text editor: `.ta-scroll-window`, `.ta-bind`, resizer handles — **plus a full second copy of Bootstrap's `.popover`** (`08.css:16–27`) |
| 09 | `https://protradingroom.com/public/app/css/styles.css` | 2290 | 195,160 | 2574 | **APP** | none (no cache-buster on the href) | The whole design system: palette, `bg-*`/`text-*`/`b*-*` utilities, spacing ladder, `.shadow-z1–z5`, layout shell, sidebar, switches, buttons extensions, chat, room, webcam. **Ships TWICE — see §2** |
| 10 | `https://protradingroom.com/public/vendor/font-awesome/css/font-awesome.min.css` | 551 | 24,767 | 557 | Vendor, self-hosted | **Font Awesome 4.3.0** — proven by `?v=4.3.0` on all three font URLs at `10.css:2` | `@font-face FontAwesome`, `.fa` base, sizes `.fa-lg/2x…5x`, `.fa-spin`/`.fa-pulse`, stack/rotate/flip, **519 `.fa-*::before{content}` glyph rules** (`10.css:40–557`) |
| 11 | `https://protradingroom.com/public/vendor/feather/webfont/feather-webfont/feather.css` | 135 | 5,946 | 135 | Vendor, self-hosted | not derivable | `@font-face feather` (`11.css:2`), `[data-icon]::before`, `[class^="icon-"]` base, **132 `.icon-*::before{content}` glyph rules** (`11.css:5–136`) |
| 12 | `https://protradingroom.com/public/vendor/animate.css/animate.min.css` | 226 | 36,536 | 790 | Vendor, self-hosted | **animate.css v3.x, 74-animation surface** (see §3) | `.animated` (1s/both), `.animated.hinge` 2s, `.animated.bounceIn/Out/flipOutX/Y` .75s, 74 × (`@-webkit-keyframes` + `@keyframes` + `.name{animation-name}`) |
| 13 | *(inline `<style>`)* | 4 | 235 | 4 | Vendor (videojs-youtube JS-injected) | videojs-youtube 2.6.0 (from the `<script src>`) | `.vjs-youtube .vjs-iframe-blocker`, `.vjs-poster{background-size:cover}`, `.vjs-youtube-mobile .vjs-big-play-button{display:none}` (`13.css:2–5`) |
| 14 | *(inline `<style>`)* | **1** | 24 | 1 | **APP** (Angular view-injected) | — | `body { overflow: auto; }` (`14.css:2`) — **last sheet in the document, silently reverses `09.css:95`. See §5** |

**Totals.** 2+2+1187+0+48+3+23+0+26+2290+551+135+226+4+1 = **4,498 rules**; 78+169+134760+12+30377+254+2643+12+3412+195160+24767+5946+36536+235+24 = **434,385 bytes**; 2+2+1577+1+48+3+31+1+26+2574+557+135+790+4+1 = **5,752 lines**. All three match `00-META.txt` exactly, so the decode is complete — no sheet is truncated.

**App vs vendor split.** Only **two** sheets are the application's own: sheet 09 (`styles.css`, 2,290 rules / 195,160 B = **45% of all bytes, 51% of all rules**) and sheet 14 (1 rule). Everything else — 12 sheets, 2,207 rules — is third-party. Sheet 09 is therefore the entire design-system surface a rebuild must port.

**Sheet 14's origin.** The rule is injected by an Angular view, not by the page shell: `nodes-000.txt:255–258` shows `#21 path=r.0.1.0 <style class="ng-scope"> text: "body {\n        overflow: auto;\n    }"` sitting inside the `ui-view` at `r.0.1`. So it appears *after* route resolution and is scoped to nothing — it is a global override shipped inside a partial.

---

## 2. THE TRAP: sheet 09 ships twice, concatenated — verified

`09.css` is 2,574 lines: a header comment plus **two near-identical copies of `styles.css`**.

* **Copy A** = `09.css:2 – 09.css:1272` (1,271 rule lines). Ends with the `showYtBtns` keyframes block, `09.css:1268–1272`.
* **Copy B** = `09.css:1273 – 09.css:2574` (1,302 rule lines). Starts by re-declaring `.glyphicon` at `09.css:1273`, byte-identical to `09.css:2`.

Mechanically diffing the two slices (`diff <(sed -n '2,1272p' 09.css) <(sed -n '1273,2574p' 09.css)`) returns **exactly two differences** and nothing else:

**Difference 1 — the `.thumb` rules.** Copy A has two lines; copy B has one.

```
copy A  09.css:1048  .thumb16 { margin-right: 5px; width: 16px !important; height: 16px !important; line-height: 16px !important; }
copy A  09.css:1049  .thumb20 { margin-right: 5px; width: 20px !important; height: 20px !important; line-height: 20px !important; }
copy B  09.css:2319  .thumb16 { width: 16px !important; height: 16px !important; line-height: 16px !important; }
                     (no .thumb20 line at all in copy B)
```

**I must correct the prior pass here. Its two claims are both wrong as stated:**

* *"`.thumb20` does not exist"* — **false.** `.thumb20` **does exist**, at `09.css:1049`, and nothing anywhere in the 15 sheets overrides or resets it. `grep -n "thumb20" *.css` returns exactly one hit. A `.thumb20` element gets `margin-right:5px; width/height/line-height:20px !important` and renders correctly. What is true is the weaker statement that copy B does not *repeat* it.
* *"`.thumb16` has no `margin-right`"* — **false.** Copy B's `.thumb16` (`09.css:2319`) simply *omits* the `margin-right` declaration; it does not reset it to `0`. Under the cascade, copy A's `margin-right: 5px` (`09.css:1048`) is never overridden and still applies. `.thumb16` **does** get `margin-right: 5px`.

*Runtime cross-check (honest gap):* neither `.thumb16` nor `.thumb20` appears anywhere in the 2,156-node baseline DOM (`grep -ho "thumb[0-9]*" nodes-*.txt` returns only `thumb24`, 3×). So this correction rests on the CSS cascade, which is deterministic, not on a computed-style observation. The one thumb class that *is* on the page — `.thumb24` at `09.css:1050` / `09.css:2321` — computes exactly as declared: `nodes-012.txt` `#1550` shows `width:24px height:24px line-height:24px vertical-align:middle`, and its `margin-right:5px` comes from an inline `style="margin-right:5px "` attribute, not from the class.

**Difference 2 — the 32 room rules, copy B only.** Copy B appends 32 rules that exist nowhere in copy A, at **`09.css:2543 – 09.css:2574`**:

```
2543  .roomArea { height: 100%; display: flex !important; flex-direction: column !important; }
2544  .alertsChatArea { display: flex !important; flex-direction: row !important; }
2545  .l-cell-presentation-sections, .presentationHolderDiv, .presentationContainer, .split-presentation { overflow: hidden; }
2546  .room-bg-image-show, .root-bg-image, .container-bg-image, .video-presentation-section { width: 100%; height: inherit; }
2547  .wrapper-bg-image { width: 100%; height: 100%; padding: 25px; text-align: center; z-index: 100; }
2548  .l-table-block, .l-row-block { display: block !important; }
2549  .room-bg-image { max-width: 100%; max-height: 100%; }
2550  .webcamScreenVideo { max-height: calc(-50px + 100vh) !important; height: auto !important; }
2551  .btn-random-user { display: none; }
2552  .texarea-alt-wrapper { padding: 2px !important; }
2553  .texarea-alt { padding: 3.5px !important; }
2554  .input-group-alt { padding: 1px 10px !important; }
2555  .typing-indicator { height: 16px; }
2556  .l-cell-wrapper-overflow { overflow: hidden; }
2557  .user-info-block { display: block; margin: 3px 0px; }
2558  .roster-user-icon { vertical-align: middle; }
2559  .disclosure-input { margin-bottom: 10px; }
2560  .d-block { display: block; }
2561  #permissionsModal .modal-content { padding: 20px; }
2562  #badgesForm input { vertical-align: text-bottom; }
2563  .label-badge-img { padding: 0px !important; }
2564  .user-badge-img { width: auto; height: 100%; max-height: 20px; margin: 0px 4px; }
2565  .dark-theme-badge-id { font-size: 10px; }
2566  .room-badge-id, .room-badge-name { color: rgb(0, 0, 0); }
2567  .room-badge-name { margin: 0px 4px; }
2568  .users-many-actions { margin-top: 30px; }
2569  .checkbox-apply-to-all-rooms { margin-left: 10px; }
2570  .checkbox-apply-to-all-rooms input:checked + span { font-weight: bold; }
2571  .chat-tab-row { display: flex; align-items: center; justify-content: flex-start; gap: 10px; border-bottom: 1px solid rgb(238, 238, 238); padding: 5px 0px; }
2572  .badge-preview { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
2573  .add-tab-btn { margin-top: 10px; }
2574  .cursor-pointer:hover { cursor: pointer; }
```

(Exactly 32 rules, one per line, spanning `09.css:2543–2574` inclusive — verbatim.)

**Proof that copy B's tail is live, not dead code.** The `#permissionsModal .modal-content { padding: 20px }` rule at `09.css:2561` has no counterpart anywhere else. In capture `01-modal_permissionsModal`, node `#2 <div class="modal-content">` computes `padding-top/right/bottom/left: 20px` (`caps/01-modal_permissionsModal/nodes-000.txt:61–64`). Bootstrap's `.modal-content` (`02.css:1377`) declares **no padding at all**. The 20px can only come from `09.css:2561`. Copy B is unambiguously applied.

**Scope caveat, stated honestly.** Of the 32 room rules, only **5 have any matching element on this Manage-Room capture**: `#permissionsModal` (27 node hits), `.d-block` (5), `.users-many-actions` (1), `.checkbox-apply-to-all-rooms` (1), `.cursor-pointer` (1). `.roomArea`, `.alertsChatArea`, `.webcamScreenVideo`, `.chat-tab-row`, `.badge-preview`, `.room-badge-*`, `.user-badge-img` and the rest have **zero** matching nodes here — they belong to the live-room view, not the admin page. That is why `DEFAULTS.txt:22–33` reports `flex-direction`, `flex-wrap`, `align-items`, `justify-content`, `gap`, `order`, `grid-template-columns` as having **1 distinct value across all 2,156 nodes**, and why `display` (`DEFAULTS.txt:6`) never takes the value `flex` on this page. The flex rules exist; their elements do not. A rebuild must not conclude "no flexbox" — it must conclude "no flexbox *on this route*".

**Consequences for a rebuild.**
1. Serve `styles.css` **once**. The duplication doubles 195 KB of CSS to no benefit.
2. Do **not** derive "the winning rule" by taking the last textual occurrence in the file — for every rule except the two above, copy A and copy B are byte-identical, so "last wins" and "first wins" agree. The two exceptions are the only places where reading only one copy gives a wrong answer, and the correct answer in both cases is that **copy A's extra declarations survive** (they are additive, not overridden).
3. Port the 32 tail rules from `09.css:2543–2574` — they are the newest code in the file and the only place room-layout and badge/chat-tab styling lives.

---

## 3. Version derivation — what the capture proves, and what it doesn't

CSSOM serialization strips all comments, so no sheet carries a version banner. Versions are derivable only from hrefs and from asset URLs inside the CSS.

| Sheet | Derivable how | Verdict |
|---|---|---|
| 03 video.js | href literal `vjs.zencdn.net/**7.3.0**/video-js.min.css` (`00-META.txt:65`), corroborated by `<script src="//vjs.zencdn.net/7.3.0/video.min.js">` (`nodes-000.txt:60`) | **7.3.0 — certain** |
| 07 angularjs-toaster | href literal `…/angularjs-toaster/**2.2.0**/toaster.min.css` (`00-META.txt:69`), corroborated by `<script src=…/2.2.0/toaster.min.js>` (`nodes-000.txt:72`) | **2.2.0 — certain** |
| 10 Font Awesome | `10.css:2` `@font-face { … url("../fonts/fontawesome-webfont.woff2**?v=4.3.0**") … }` — the version is baked into all three font URLs | **4.3.0 — certain** |
| 13 videojs-youtube | `<script src="//cdnjs.cloudflare.com/ajax/libs/videojs-youtube/**2.6.0**/Youtube.min.js">` (`nodes-000.txt:66`) | **2.6.0 — certain (for the JS that injects sheet 13)** |
| 02 Bootstrap | Structural markers only: `.hidden` at `02.css:1481` is `display:none!important` **with no `visibility:hidden`**; `.btn-default.focus,.btn-default:focus` (`02.css:789`) is a *separate rule* from `.btn-default:hover` (`02.css:790`); `a.btn.disabled,fieldset[disabled] a.btn{pointer-events:none}` (`02.css:787`) is present; `@media(min-width:768px){.navbar-right .dropdown-menu…}` (`02.css:874–877`) is present; alert-danger border `rgb(235,204,209)` (`02.css:1219`) | **Bootstrap 3.3.x.** Pinning the patch release would require the upstream changelog, which is not in the capture — **honest gap** |
| 12 animate.css | The sheet defines exactly **74** animation names (`grep -o "animation-name: …" 12.css \| sort -u \| wc -l` = 74), each with a `@-webkit-keyframes` + `@keyframes` pair (74 + 74 blocks). The surface is: bounce, bounceIn{,Down,Left,Right,Up}, bounceOut{,Down,Left,Right,Up}, fadeIn{,Down,DownBig,Left,LeftBig,Right,RightBig,Up,UpBig}, fadeOut{same 9}, flash, flip, flipIn{X,Y}, flipOut{X,Y}, hinge, lightSpeed{In,Out}, pulse, roll{In,Out}, rotateIn{,DownLeft,DownRight,UpLeft,UpRight}, rotateOut{same 5}, rubberBand, shake, slideIn{Down,Left,Right,Up}, slideOut{Down,Left,Right,Up}, swing, tada, wobble, zoomIn{,Down,Left,Right,Up}, zoomOut{same 5}. There is **no** `jello`, `headShake`, `heartBeat`, or any v4 `backIn*` name; the `slideIn*/slideOut*` set is the transform-based variant | **animate.css v3.x with a 74-name surface — certain.** Exact release — **honest gap** |
| 04/05 colour-picker, 06 xeditable, 08 textAngular, 11 feather, 09 styles.css | No version in href, no version in any `url()`, no banner | **Not derivable — honest gap.** Note that sheet 08 is loaded from `src/` (unminified source dir), and sheet 09 has **no cache-buster at all** while the app's own JS carries `?v=2.18.100` and `?v=1784623769671` — see P28 |

---

## 4. The two CORS-blocked sheets — confirmed, and what it costs

Both are confirmed absent, not merely unread:

```
03.css:1  /* sheet[3] href=https://vjs.zencdn.net/7.3.0/video-js.min.css ruleCount=0 */
03.css:2  CORS-BLOCKED
07.css:1  /* sheet[7] href=https://cdnjs.cloudflare.com/ajax/libs/angularjs-toaster/2.2.0/toaster.min.css ruleCount=0 */
07.css:2  CORS-BLOCKED
```

`00-META.txt:65` and `:69` independently report `ruleCount=0 bytes=12` for both — 12 bytes is the length of the string `CORS-BLOCKED`. The capture script ran in-page and could not read `cssRules` of a cross-origin sheet without CORS headers; `vjs.zencdn.net` and `cdnjs.cloudflare.com` both serve CSS without `Access-Control-Allow-Origin` for stylesheet reads in this context.

**Consequences — these are hard gaps, do not paper over them:**

* **Video.js player chrome is entirely unknown.** Every `.vjs-*` visual — control bar height and background, big-play button size/shape/border, progress-bar and volume-slider geometry, the loading spinner, poster handling, text-track styling, the `.vjs-default-skin` palette, and Video.js's own icon font — is uncaptured. The only Video.js CSS that survived is the 2-rule inline sheet 00 (`.video-js{width:300px;height:150px}`, `.vjs-fluid{padding-top:56.25%}`) and the 4-rule YouTube-adapter inline sheet 13. A rebuild cannot reproduce the player skin from this dump; it must either re-derive it from video.js 7.3.0 upstream or declare the player an explicit honest-pending region.
* **Toast geometry and colour are half-unknown.** The app *does* restyle toasts — `09.css:399–405` sets `body #toast-container{top:55px!important}` and the six background colours (`.toast` `rgb(29,31,33)`, `.toast-success` `rgb(76,175,80)`, `.toast-error` `rgb(243,66,53)`, `.toast-info` `rgb(32,149,242)`, `.toast-wait` `rgb(102,57,182)`, `.toast-warning` `rgb(254,151,0)`). But everything *underneath* those overrides — container width, corner position, per-toast padding, border-radius, close-button placement, title/message type scale, the enter/leave animation, the opacity — lives in the blocked toaster 2.2.0 sheet. So the rebuild knows the toast **colours** exactly and the toast **shape** not at all.
* Neither gap is visible on this capture: there is no `<video>`/`.video-js` element and no `#toast-container` in the 2,156-node baseline DOM, so nothing on the Manage-Room screenshot depends on them. The gap bites on the live-room route.

---

## 5. Load order and what actually overrides what

Cascade order is document order 00 → 14. Within equal specificity, **higher index wins**. Four overrides matter and all four are confirmed against computed styles.

### 5.1 `body { overflow }` — sheet 14 beats sheet 09 ✅ verified

| | Declaration | Wins? |
|---|---|---|
| Declared first | `09.css:95` — `body { overflow: hidden; height: 100%; }` | ❌ overridden |
| Declared last | `14.css:2` — `body { overflow: auto; }` | ✅ **wins** |

Computed proof: `caps/00-baseline-room/nodes-000.txt:3–13`, node `#0 <body class="footer-hidden">` lists `overflow-x: auto` and `overflow-y: auto` among its five style-deviations from the COMMON table (`DEFAULTS.txt:80–81` gives COMMON `overflow-x/-y = visible`). Same specificity (`body`, 0-0-1), sheet 14 later ⇒ `auto` wins. The `height: 100%` from `09.css:95` is untouched and survives.

This is a genuine behaviour change, not cosmetics: `overflow:hidden` on `body` is what makes the `.app-fh` / `.l-table` full-height chrome (`09.css:138–150`) scroll internally. With `auto`, the document itself can scroll. A rebuild that ports `09.css` and forgets the one-line inline sheet will get a different scroll model.

### 5.2 `.glyphicon` font-family — sheet 09 beats sheet 02 ⚠️ latent trap

| | Declaration |
|---|---|
| `02.css:60` | `@font-face { font-family: "Glyphicons Halflings"; src: url("../fonts/glyphicons-halflings-regular.woff2") … }` |
| `02.css:61` | `.glyphicon { … font-family: "Glyphicons Halflings"; … }` |
| `09.css:2` (and `09.css:1273`) | `.glyphicon { … font-family: FontAwesome; … }` ✅ **wins** (same specificity `.glyphicon` 0-1-0, later sheet) |

Consequence: the Glyphicons Halflings webfont is still declared and will still be fetched, but `.glyphicon` renders in the **FontAwesome** face — while `02.css:62–323` still supplies **262 Glyphicons private-use codepoints** as `content`. Those codepoints do not map to the same pictographs in FontAwesome, so every `.glyphicon-*` other than the four the app explicitly re-pointed (`09.css:5–8`: `chevron-left/right/up/down`) would render the wrong glyph or tofu. **Honest scope note:** `grep -c glyphicon nodes-*.txt` returns zero across all 2,156 baseline nodes, so nothing on *this* page is affected. It is a latent trap for other routes, and a reason a rebuild should drop Glyphicons entirely.

### 5.3 `.editable-click` — sheet 09 partially beats sheet 06 ✅ verified, 269 nodes

| | Declaration |
|---|---|
| `06.css:15` | `.editable-click, a.editable-click { text-decoration: none; color: rgb(66, 139, 202); border-bottom: 1px dashed rgb(66, 139, 202); }` |
| `09.css:1194` | `.editable-click, a.editable-click { color: rgb(10, 10, 10); }` |

Same selector, same specificity, sheet 09 later ⇒ **`color` is overridden to `rgb(10,10,10)`, but `border-bottom` is not touched and stays `1px dashed rgb(66,139,202)`.** This is the single largest computed footprint on the page and it proves the partial override exactly: across `nodes-*.txt`, **269 nodes** carry `color: rgb(10, 10, 10)` **and** `border-bottom-color: rgb(66, 139, 202)` simultaneously. A rebuild that ports only sheet 09 will lose the blue dashed underline that marks every editable field; a rebuild that ports only sheet 06 will get blue text instead of near-black.

### 5.4 `.btn-default` border — sheet 09 beats sheet 02 ✅ verified

| | Declaration |
|---|---|
| `02.css:788` | `.btn-default { color: rgb(51,51,51); background-color: rgb(255,255,255); border-color: rgb(204,204,204); }` |
| `09.css:323` | `.btn.btn-default { border-color: rgb(230, 233, 238); }` ✅ **wins** (specificity 0-2-0 > 0-1-0) |

Computed proof: the `btn btn-sm pull-right btn-default mr ng-hide` node in `nodes-*.txt` shows `border-*-color: rgb(230, 233, 238)` and `background-color: rgb(255, 255, 255)` — app border, Bootstrap fill. 34 `.btn-default` elements on the page.

### 5.5 `.popover` — declared three times, sheet 09 wins the visual props

`02.css:1414` (Bootstrap) → `08.css:16` (textAngular re-ships a near-copy: same `z-index:1060`, `max-width:276px`, `border-radius:6px`, `box-shadow: rgba(0,0,0,.2) 0 5px 10px`, but `text-align:left` instead of Bootstrap's `start` and no `font-family`/`letter-spacing`/`line-break` resets) → `09.css:46` (app: `box-shadow: rgb(0,0,0) 0 0 0`, `border-color: rgb(238,238,238) rgb(238,238,238) rgb(230,233,238)`, `border-bottom-width:2px`, `border-radius:2px`). Net winner per property: radius **2px** and shadow **none** from sheet 09; `z-index:1060`, `max-width:276px`, `padding:1px`, white background from 02/08. Duplicating Bootstrap's popover inside a text-editor plugin is pure dead weight — 12 of sheet 08's 26 rules (`08.css:16–27`) are redundant with sheet 02.

### 5.6 Sheets that override nothing

Sheets 00, 01, 04, 05, 11, 12, 13 introduce only namespaced selectors (`.video-js`, `ng-cloak`, `.color-picker-*`, `[class^="icon-"]`, animate.css names, `.vjs-youtube`) and collide with nothing. Sheet 10 collides only via `.pull-left`/`.pull-right` (`10.css:15–16`, `float:left/right` **without** `!important`) versus Bootstrap's `.pull-left`/`.pull-right` (`02.css:1475–1476`, `float:…!important`) — Bootstrap's `!important` wins despite being earlier. 21 elements on the page use `pull-right`/`pull-left`; all compute `float: right`/`float: left`, consistent with either rule, so this collision is harmless.

---

## 6. Rebuild spec

**Drop entirely (0 rules worth porting):** 02 Bootstrap Glyphicons block (`02.css:60`, `02.css:62–323` — 263 rules, superseded by FontAwesome per §5.2), 08 textAngular's popover copy (`08.css:16–27`), 12 animate.css (only 22 of its 74 animations are ever referenced, all from `09.css:202–223`; see P25), the duplicate copy of sheet 09.

**Port as first-party tokens:** sheet 09 copy A `09.css:2–1272` plus the 32 tail rules `09.css:2543–2574`. That is the whole design system. See P23/P24/P25 for the extracted token sets.

**Keep as vendor, but re-derive from upstream (cannot be reconstructed from this dump):** video.js 7.3.0 skin, angularjs-toaster 2.2.0 geometry.

**Recommended SvelteKit layering**, replacing 15 sheets with 4:

```
app.css            ← reset + the extracted token layer (P23/P24/P25)
  @layer reset     ← the ~40 useful normalize rules from 02.css:2-40
  @layer tokens    ← :root custom properties (the source has ZERO — see below)
  @layer base      ← body/type/link/table/form base, from 02.css:324-420
  @layer components← buttons, forms, nav, modal, panel, badge, chat, room
  @layer utilities ← the m*/p*/b*/text-*/bg-* ladder from 09.css:806-1057
icons.css          ← FontAwesome 4.3.0 subset + Feather subset, self-hosted
vendor/player.css  ← video.js 7.3.0 (re-derived upstream)
vendor/toast.css   ← replace angularjs-toaster with a Svelte toast component
```

**No CSS custom properties exist anywhere in the source.** `grep -c "var(--" *.css` = 0 across all 15 sheets, and every capture reports `cssVars: {"root":{},"body":{}}` (`00-META.txt:38–59`, all 22 captures, plus `caps/00-baseline-room/INFO.txt:8`). Every colour is a hard-coded literal. Introducing a `:root` token layer is therefore a pure addition, not a migration — nothing in the source depends on variable resolution.

---

## 7. Honest gaps

1. **Sheets 03 and 07 are unrecoverable from this dump** (0 rules, CORS-BLOCKED). Video.js player chrome and toast geometry cannot be matched pixel-for-pixel from `ptr1.json`. Colour of toasts *is* known (`09.css:399–405`); shape is not.
2. **Exact patch versions of Bootstrap (3.3.x), animate.css (3.x), angularjs-color-picker, angular-xeditable, textAngular and Feather are not derivable.** CSSOM strips comments and none of these hrefs carry a version segment.
3. **`.thumb16` / `.thumb20` cascade behaviour is proven by CSS rules, not by a computed style** — neither class appears in the 2,156-node DOM, so there is no runtime observation to confirm §2 Difference 1. The cascade result is nevertheless unambiguous.
4. **27 of the 32 tail rules at `09.css:2543–2574` have no element on this capture.** Their computed effect is untested here; they must be re-verified against a live-room capture.
5. **`@media print` behaviour (40 blocks across sheets 02 and 09) is entirely unverified.** The capture was taken at `screen` in a 1842×1265 viewport; no print rendering exists in the dump.
6. **`.ie9`-prefixed rules** (14 in copy A: `09.css:438, 460, 482, 504, 526, 548, 570, 594, 618, 642, 666, 690, 714, 738, 762, 786`) target a browser the capture UA is not (Chrome 150 mobile per `00-META.txt:7`); they are dead in any modern rebuild.
7. **The capture UA is a Pixel 9 mobile string at a 1842×1265 desktop viewport** (`00-META.txt:7`, `:9`). All `min-width: 768/992/1200` media blocks are therefore active, and `max-width: 479/767/991` blocks are all inactive. The mobile branches of the CSS are never exercised in this dump.
