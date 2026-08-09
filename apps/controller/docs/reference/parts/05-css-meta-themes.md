# ptr1 — Part 05: CSS, metadata, and the theme verdict

Decode of `evidence-dumps/NEXT-STEP/ptr1.json` (23,535,138 bytes, `00-META.txt:2`), slice = dump metadata,
all 15 stylesheets, the page-wide COMMON computed-style table, and the three diff captures
(19 forced-darkTheme / 20 forced-lightTheme / 21 final-room).

Every citation below is `<file>:<line>` relative to `/tmp/ptr-decode/ptr1/`.
Nothing here is inferred from memory or from a sibling page; where a fact is not in my files
I say so under **Honest gaps**.

---

## 1. Dump metadata

| Field | Value | Locator |
|---|---|---|
| source | `evidence-dumps/NEXT-STEP/ptr1.json` | `00-META.txt:1` |
| bytes | 23,535,138 | `00-META.txt:2` |
| dump.part | 1 | `00-META.txt:3` |
| capture count | 23 | `00-META.txt:4` |
| meta.capturedAt | `2026-07-24T15:59:21.704Z` | `00-META.txt:5` |
| meta.url | `https://protradingroom.com/ptrApp#/page/manageSession/6a628a99731b9f77ae9bf505` | `00-META.txt:6` |
| meta.ua | `Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36` | `00-META.txt:7` |
| meta.role | `member` | `00-META.txt:8` |
| meta.viewport | `{"w":1842,"h":1265,"dpr":2}` | `00-META.txt:9` |
| meta.errors | `[]` (empty — no capture errors reported) | `00-META.txt:10` |

**Note on the UA vs the viewport.** The UA string is an Android/Pixel 9 *mobile* UA
(`00-META.txt:7`) while the viewport is 1842×1265 @dpr2 (`00-META.txt:9`) — i.e. a desktop-width
window driven by a spoofed mobile UA. Every capture carries the identical viewport
(`00-META.txt:13`–`34`), so the whole dump is one layout at 1842 CSS px. At 1842px every
breakpoint in the sheets is in its widest state (all `min-width: 768/992/1200` blocks active,
all `max-width: 479/767/991` blocks inactive) — see §3.5.

### Capture index (verbatim from `00-META.txt:13`–`35`)

| # | kind | label | ts (2026-07-24) | nodes | trunc | themeClass |
|---|---|---|---|---|---|---|
| 00 | fullDom | baseline-room | 15:59:18.276Z | 2156 | false | `footer-hidden` |
| 01 | subtree | modal:permissionsModal | 15:59:18.443Z | 22 | false | `footer-hidden` |
| 02 | subtree | dropdown:dropdown-menu.show | 15:59:18.507Z | 28 | false | `footer-hidden` |
| 03 | subtree | dropdown:dropdown-menu.show | 15:59:18.570Z | 33 | false | `footer-hidden` |
| 04 | subtree | dropdown:dropdown-menu.dropdown-menu-right.show | 15:59:18.641Z | 128 | false | `footer-hidden` |
| 05 | subtree | dropdown:dropdown-menu.show | 15:59:18.706Z | 28 | false | `footer-hidden` |
| 06 | subtree | dropdown:dropdown-menu.show | 15:59:18.771Z | 30 | false | `footer-hidden` |
| 07 | subtree | dropdown:dropdown-menu.show | 15:59:18.836Z | 31 | false | `footer-hidden` |
| 08 | subtree | dropdown:dropdown-menu.show | 15:59:18.898Z | 1 | false | `footer-hidden` |
| 09 | subtree | dropdown:dropdown-menu.dropdown-menu-right.show | 15:59:18.968Z | 128 | false | `footer-hidden` |
| 10 | subtree | dropdown:dropdown-menu.show | 15:59:19.032Z | 28 | false | `footer-hidden` |
| 11 | subtree | dropdown:dropdown-menu.show | 15:59:19.097Z | 30 | false | `footer-hidden` |
| 12 | subtree | dropdown:dropdown-menu.show | 15:59:19.162Z | 31 | false | `footer-hidden` |
| 13 | subtree | dropdown:dropdown-menu.show | 15:59:19.224Z | 1 | false | `footer-hidden` |
| 14 | subtree | dropdown:dropdown-menu.dropdown-menu-right.show | 15:59:19.294Z | 128 | false | `footer-hidden` |
| 15 | subtree | dropdown:dropdown-menu.show | 15:59:19.359Z | 28 | false | `footer-hidden` |
| 16 | subtree | dropdown:dropdown-menu.show | 15:59:19.423Z | 30 | false | `footer-hidden` |
| 17 | subtree | dropdown:dropdown-menu.show | 15:59:19.487Z | 31 | false | `footer-hidden` |
| 18 | subtree | dropdown:dropdown-menu.show | 15:59:19.550Z | 1 | false | `footer-hidden` |
| 19 | fullDom | forced-darkTheme | 15:59:20.397Z | 2156 | false | `footer-hidden darkTheme` |
| 20 | fullDom | forced-lightTheme | 15:59:21.244Z | 2156 | false | `footer-hidden lightTheme` |
| 21 | fullDom | final-room | 15:59:21.690Z | 2156 | false | `footer-hidden` |
| 22 | meta | `__meta__` | — | — | — | `null` |

**Wall-clock span, first→last capture:** `15:59:18.276Z` → `15:59:21.690Z` = **3.414 s**
(`00-META.txt:13` vs `00-META.txt:34`). `meta.capturedAt` (`15:59:21.704Z`, `00-META.txt:5`)
is 14 ms after the final capture, so the whole dump was produced in **3.428 s**.

Observation worth flagging to the DOM agents: captures 02–08, 10–13(+14–18) repeat the same
node-count fingerprint three times (`28, 30/33, 31, 1, 128`) — the harness swept the same
dropdown set three times (`00-META.txt:15`–`31`, `02-MANIFEST.txt:6`–`22`).
Capture 08/13/18 have **nodes=1** — a `.dropdown-menu.show` that contained nothing.

`02-MANIFEST.txt` restates the same per-capture inventory plus node-file counts; it confirms
19 and 20 are `mode=diff nodeFiles=1` and 21 is `mode=diff nodeFiles=0`
(`02-MANIFEST.txt:23`–`25`).

---

## 2. Stylesheet inventory — 15 sheets, 4,498 rules, 434,385 bytes of CSS text

Byte/rule counts are the capture's own figures (`00-META.txt:62`–`76`); "file lines" is the
decoded file on disk (one rule per line, `@media`/`@keyframes` expanded).

| # | href | rules | bytes | file lines | Owner | Governs |
|---|---|---|---|---|---|---|
| 00 | *(inline)* | 2 | 78 | 2 | vendor (video.js shim) | `.video-js` 300×150 default box, `.vjs-fluid` 56.25% padding-top (`00.css:2`–`3`) |
| 01 | *(inline)* | 2 | 169 | 2 | vendor (AngularJS) | `[ng-cloak]`/`.ng-hide` → `display:none!important`; `ng:form{display:block}` (`01.css:2`–`3`) |
| 02 | `/public/app/css/bootstrap.min.css` | 1187 | 134,760 | 1577 | **vendor, self-hosted** | Bootstrap 3.x: normalize, Glyphicons, 12-col grid, forms, buttons, nav/navbar, dropdown, modal, tooltip/popover, carousel, responsive utilities |
| 03 | `https://vjs.zencdn.net/7.3.0/video-js.min.css` | **0** | 12 | 2 | vendor | **CORS-BLOCKED** — `03.css:2` literally reads `CORS-BLOCKED`. Honest gap. |
| 04 | `/public/vendor/angularjs-color-picker/angularjs-color-picker.min.css` | 48 | 30,377 | 49 | vendor | Colour-picker panel/grid/slider; 2 big base64 PNG gradients (`04.css:26`, `04.css:41`) |
| 05 | `…/angularjs-color-picker-bootstrap.min.css` | 3 | 254 | 4 | vendor | 3 bootstrap-bridge rules (`05.css:2`–`4`) |
| 06 | `/public/vendor/angular-xeditable/dist/css/xeditable.min.css` | 23 | 2,643 | 32 | vendor | Inline-edit widgets, `.editable-*`, `.popover-wrapper` |
| 07 | `cdnjs…/angularjs-toaster/2.2.0/toaster.min.css` | **0** | 12 | 2 | vendor | **CORS-BLOCKED** — `07.css:2` reads `CORS-BLOCKED`. Honest gap. |
| 08 | `/public/vendor/textAngular/src/textAngular.css` | 26 | 3,412 | 27 | vendor | Rich-text editor + a second full `.popover` implementation (`08.css:16`–`27`) |
| 09 | **`/public/app/css/styles.css`** | 2290 | 195,160 | 2574 | **THE APP** | Everything below in §3–§4 |
| 10 | `/public/vendor/font-awesome/css/font-awesome.min.css` | 551 | 24,767 | 557 | vendor | Font Awesome **4.3.0** (version literal at `10.css:2`) — 1 `@font-face` + 517 glyph rules |
| 11 | `/public/vendor/feather/webfont/feather-webfont/feather.css` | 135 | 5,946 | 136 | vendor | Feather icon webfont, `.icon-*` (`11.css:2`–`136`) |
| 12 | `/public/vendor/animate.css/animate.min.css` | 226 | 36,536 | 790 | vendor | animate.css keyframe library (bounce/fade/flip/rotate/slide/zoom/hinge/roll/lightSpeed) |
| 13 | *(inline)* | 4 | 235 | 4 | vendor (videojs-youtube) | `.vjs-youtube*` iframe-blocker/poster rules (`13.css:2`–`5`) |
| 14 | *(inline)* | 1 | 24 | 1 | **app** | `body { overflow: auto; }` (`14.css:2`) — **last sheet wins**, overriding `09.css:95` `body{overflow:hidden}` |

**App-authored CSS = sheet 09 (195,160 B) + inline sheet 14 (24 B).** Everything else is vendor.
Sheet 02, though served from `protradingroom.com`, is verbatim Bootstrap (normalize block
`02.css:2`–`40`, glyphicon map `02.css:60`–`323`, `.col-xs/sm/md/lg-*` grid `02.css:433`–`647`).

### 2a. `styles.css` is shipped TWICE, concatenated

Hard evidence, not a guess: line 2 and line 1273 are byte-identical
(`09.css:2` == `09.css:1273`, both the `.glyphicon{…FontAwesome…}` override), and
`diff <(sed -n '2,1272p' 09.css) <(sed -n '1273,2574p' 09.css)` returns exactly three hunks:

- **Copy A** = `09.css:2`–`1272` (1,271 rules).
- **Copy B** = `09.css:1273`–`2574` (1,302 rules).
- Copy B **drops** `.thumb20` and drops `margin-right:5px` from `.thumb16`
  (`09.css:1048`–`1049` vs `09.css:2319`).
- Copy B **appends 32 new rules** at `09.css:2543`–`2574` that exist nowhere in copy A —
  and these are *precisely the trading-room rules* (`.roomArea`, `.alertsChatArea`,
  `.webcamScreenVideo`, `#permissionsModal`, badge/chat-tab rules).

Consequence for the rebuild: **copy B wins** (later in the sheet, equal specificity).
So the live cascade is: `.thumb16` has **no** `margin-right`, `.thumb20` **does not exist**,
and the 32 room rules at `09.css:2543`–`2574` are live. Everything else is identical in both
copies, so citations below use copy-A line numbers; add **+1271** for the copy-B twin.
(Uniqueness check: 2,573 non-header lines, only 1,224 distinct.)

---

## 3. The design system, extracted from the CSS

### 3.1 Root typography (Bootstrap base, unchanged by the app)

```
02.css:326   html { font-size: 10px; -webkit-tap-highlight-color: rgba(0,0,0,0); }
02.css:327   body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
                    font-size: 14px; line-height: 1.42857; color: rgb(51,51,51);
                    background-color: rgb(255,255,255); }
```

Confirmed live by the rendered page: `caps/00-baseline-room/DEFAULTS.txt:65`–`69` reports the
most-frequent computed values across all 2,156 nodes as
`font-family = "Helvetica Neue", Helvetica, Arial, sans-serif` (1906/2156, only **3** distinct
families page-wide), `font-size = 14px` (1600/2156, 10 distinct), `font-weight = 400`
(1638/2156, 3 distinct), `line-height = 20px` (1527/2156, 20 distinct).
`color = rgb(51,51,51)` for 1732/2156 nodes (`DEFAULTS.txt:64`).

**The rebuild needs no webfont for body text** — it is the system Helvetica stack.

Heading scale (`02.css:342`–`353`): h1 36 / h2 30 / h3 24 / h4 18 / h5 14 / h6 12 px,
`font-weight:500`, `line-height:1.1`, `color: inherit`.

App type-scale utilities (`09.css:1025`–`1029`):
`.text-xs 7.8px` · `.text-sm 11.05px` · `.text-md 22.1px` · `.text-lg 39px` · `.text-hg 52px`
(all `!important`). Weight utilities `09.css:1036`–`1038`: `.text-thin 100`, `.text-normal
normal`, `.text-bold bold`.

Chat-specific scale (`09.css:1143`–`1152`) — this is the room's real type ladder:
```
.chat      { font-size: 12px; }              09.css:1143
.chatXXl li{ font-size: 18px; }              09.css:1147
.chatXl    { font-size: 16px; }              09.css:1148
.chatLg    { font-size: 14px; }              09.css:1149
.chatMd    { font-size: 12px; }              09.css:1150
.chatSm    { font-size: 10px; }              09.css:1151
.chatTiny  { font-size:  9px; }              09.css:1152
```
Other app sizes present: 30px (`#clockdiv` `09.css:1202`), 23px (`.app-view-header`
`09.css:108`), 20px (`.settings-button > em` `09.css:265`, `.hasMobileApp` `09.css:1253`),
17px (`.title` `09.css:1139`), 15px (all `.icon-*` `09.css:320`), 13px (`.dropdown-menu`
`09.css:48`), 12px (`.chatChannelTabs a` `09.css:1231`, `.videChatLabel` `09.css:1211`,
`.onLabel` `09.css:1182`), 11px (`.sidebar .nav-heading` `09.css:183`), 10px
(`.tsSm` `09.css:1238`, `.dark-theme-badge-id` `09.css:2565`).

### 3.2 Colour palette — the app's own sheets only (09.css + 14.css)

The app has **no neutral/brand tokens**; it has a hard-coded Material-ish palette repeated
across `.bg-*`, `.text-*`, `.b*-*`, `.btn-*`, `.label-*`, `.alert-*`, `.switch-*` families.
Each named colour below is the *base*; each family also hard-codes a lighter and darker step.

| Token (by class family) | Base | Light step | Dark step | Locators |
|---|---|---|---|---|
| primary | `rgb(29,31,33)` | `rgb(43,46,49)` | `rgb(15,16,17)` | `09.css:971`, `605`, `606` — note `.bg-primary` itself uses **`rgb(0,0,0)`** (`09.css:583`) while `.text-primary`/`.bl-primary` use `29,31,33` (`09.css:971`, `871`) |
| success | `rgb(76,175,80)` | `rgb(96,186,99)` | `rgb(67,154,70)` | `09.css:607`, `629`, `630`, `974` |
| info | `rgb(32,149,242)` | `rgb(61,163,244)` | `rgb(13,134,230)` | `09.css:631`, `653`, `654`, `983` |
| warning | `rgb(254,151,0)` | `rgb(255,164,30)` | `rgb(223,133,0)` | `09.css:655`, `677`, `678`, `977` |
| danger | `rgb(243,66,53)` | `rgb(245,93,82)` | `rgb(241,39,24)` | `09.css:679`, `701`, `702`, `980` |
| inverse | `rgb(54,63,69)` | `rgb(67,79,86)` | `rgb(41,47,52)` | `09.css:559`, `581`, `582`, `989`, `331` |
| amber | `rgb(255,193,7)` | `rgb(255,201,38)` | `rgb(231,174,0)` | `09.css:703`, `725`, `726`, `1004` |
| pink | `rgb(233,30,99)` | `rgb(236,58,118)` | `rgb(212,21,86)` | `09.css:727`, `749`, `750`, `995` |
| purple | `rgb(102,57,182)` | `rgb(117,72,198)` | `rgb(89,50,159)` | `09.css:751`, `773`, `774`, `998` |
| orange | `rgb(254,86,33)` | `rgb(254,109,63)` | `rgb(254,63,3)` | `09.css:775`, `797`, `798`, `1007` |
| gray-darker | `rgb(43,61,81)` | — | — | `09.css:449`, `910`–`913`, `1010` |
| gray-dark | `rgb(81,93,110)` | — | — | `09.css:471`, `914`–`917`, `1013` |
| gray | `rgb(160,170,178)` | — | — | `09.css:427`, `918`–`921`, `1016` |
| gray-light | `rgb(230,233,238)` | — | — | `09.css:493`, `922`–`925`, `1019` |
| gray-lighter | `rgb(244,245,245)` | — | — | `09.css:515`, `926`–`929`, `1022` |
| muted text | `rgb(131,148,169)` | — | — | `09.css:550`, `930`–`933`, `111` |
| body text on white | `rgb(88,95,105)` | — | — | `09.css:537`, `1040` |
| link (app) | `rgb(133,142,154)` → hover `rgb(81,93,110)` | | | `09.css:538`–`539` |
| hairline / divider | **`rgb(236,238,238)`** | | | `09.css:866`–`869` (`.b`, `.bt`, `.br`, `.bb`, `.bl`) |
| white / black | `rgb(255,255,255)` / `rgb(0,0,0)` | | | `09.css:537`, `583` |

Room/chat-only colours (these do **not** appear in the utility families — they are bespoke):

| Purpose | Colour | Locator |
|---|---|---|
| chat link (light) visited/link | `rgb(2,90,168)` | `09.css:1130` |
| chat link hover | `rgb(0,0,255)` | `09.css:1129` |
| chat link (dark) visited/link | `rgb(50,176,213)` | `09.css:1132` |
| chat "question" | `rgb(32,149,242)` | `09.css:1153` |
| chat highlight / private highlight | `yellow` | `09.css:1154`, `1155` |
| chat @mention text | `rgba(4,141,4,0.9)` italic | `09.css:1159` |
| chat @mention row background | `rgba(255,0,0,0.06)` | `09.css:1168` |
| chat header background | `rgba(0,0,0,0.04)` + 1px `rgb(236,238,238)` | `09.css:1169` |
| chat row separator | `rgba(220,220,220,0.46)` | `09.css:1165` |
| admin row underline | `rgb(176,176,176)` | `09.css:1166` |
| chat toolbar top border | `rgba(0,0,0,0.5)` | `09.css:1135` |
| chat tab (idle) | `rgb(133,142,154)` | `09.css:1231` |
| chat tab (active/hover) | text `rgb(81,93,110)` on `rgb(232,232,232)` | `09.css:1232`–`1233` |
| chat-top bottom border | `rgb(232,232,232)` | `09.css:1229` |
| unread badge (chat) | `rgb(255,0,0)` | `09.css:1234` |
| private-chat label / badge-warning | `rgb(255,204,0)` (badge text `black`) | `09.css:1235`–`1236` |
| filter-strong | `black` weight 600 | `09.css:1163` |
| split-pane gutter | bg `rgb(34,34,34)`, fg `rgb(255,255,255)` | `09.css:1240` |
| webcam PiP frame | bg `rgba(0,0,0,0.5)`, border 2px `rgba(191,255,0,0.494)` | `09.css:1187` |
| video-chat tile | outline 2px `rgb(255,255,255)`, bg `rgb(51,51,51)` | `09.css:1208`–`1209` |
| video-chat label strip | `rgba(0,0,0,0.1)` bg, white text | `09.css:1211` |
| drag-drop area | 2px dashed `rgb(29,41,54)`; highlight `rgb(2,90,168)` + bg `rgb(241,241,241)` | `09.css:1218`–`1219` |
| countdown clock | text white, chip bg `rgb(0,191,150)`, digit bg `rgb(0,0,0)` | `09.css:1202`–`1204` |
| room badge id/name | `rgb(0,0,0)` | `09.css:2566` |
| chat-tab-row separator | `rgb(238,238,238)` | `09.css:2571` |
| loading bar / spinner | `rgb(54,63,69)` | `09.css:241`, `242`, `244` |
| toasts | base `rgb(29,31,33)`; success `76,175,80`; error `243,66,53`; info `32,149,242`; wait `102,57,182`; warning `254,151,0` | `09.css:400`–`405` |
| navbar brand text | `rgb(250,250,250)` | `09.css:62` |
| navbar hover wash | `rgba(54,63,69,0.05)` | `09.css:80` |
| form-control border | `rgb(219,217,217)`; addon bg `rgb(248,249,251)` | `09.css:34`–`35` |
| ripple | `rgb(209,210,211)` | `09.css:383` |
| scrollbar (slimScroll) | thumb `rgba(0,0,0,0.35)`, rail `rgba(0,0,0,0.15)` | `09.css:394`, `396` |
| xeditable link (app override) | `rgb(10,10,10)` | `09.css:1194` |

Six background photographs are referenced but not captured:
`.bg-pic1`…`.bg-pic6 { background-image: url("../img/bg1.jpg"…"bg6.jpg") }` (`09.css:800`–`805`).

### 3.3 Spacing scale

Margin/padding utilities, `09.css:806`–`860` — the whole app spacing vocabulary:

| step | margin | padding |
|---|---|---|
| 0 | `.m0/.ml0/.mr0/.mt0/.mb0` = 0 (`09.css:806`–`810`) | `.p0/.pl0/.ph0/.pv0` = 0 (`09.css:831`–`835`) |
| sm | `5px` (`09.css:816`–`820`) | `5px` (`09.css:841`–`845`) |
| base | `10px` (`09.css:811`–`815`) | `10px` (`09.css:836`–`840`) |
| lg | `15px` (`09.css:821`–`825`) | `15px` (`09.css:846`–`850`) |
| xl | `30px` margin (`09.css:826`–`830`) | `20px` padding (`09.css:851`–`855`) |
| xxl | — | `25px` (`09.css:856`–`860`) |

So the ladder is **0 / 5 / 10 / 15 / 20 / 25 / 30 px**; suffix `h` = horizontal, `v` = vertical.
Structural spacing: `.app { padding: 15px 15px 80px }` (`09.css:105`), sidebar width **240px**
(`09.css:98`, `120`, `140`), sidebar inner **257px** (`09.css:181`), header/footer heights
**50px / 60px** (`09.css:100`, `138`), `.navbar-header { width: 350px }` (`09.css:1137`),
`.private-chat-wrapper { max-width: 350px }` (`09.css:1250`).
Width tokens `09.css:1068`–`1079`: 50 / 60 / 90 / 150 / 200 / 240 / 280 / 320 / 360 px, 90%, 100%.
Thumb sizes `09.css:1047`–`1057`: 8/16/24/32/40/48/64/80/96/128 px (and 20px in copy A only).
Height ladder `09.css:1174`–`1181`: `.ch0/.ch10/.ch20/.ch30/.ch70/.ch80/.ch90/.ch100` = 0/10/20/30/70/80/90/100 %.

### 3.4 Border radii, borders, shadows

Radii the app defines (`09.css`): `0px` (`.radius-clear` `09.css:967`, `.btn-square`
`09.css:360`, `.btn-flat` `09.css:358`), `1px` (`09.css:369`–`372`), `2px`
(`.dropdown-menu` `09.css:48`, `.popover` `09.css:46`, `.progress` `09.css:44`,
`.chat li .chat-msg` `09.css:1128`), `3px` (`.rounded` `09.css:969`, `.setting-color > label`
`09.css:272`, `#clockdiv > div` `09.css:1203`, `.btn-lg .btn-label` `09.css:367`),
`4px` (`#webcamCamDiv` `09.css:1187`), `5px` (`.drop-area` `09.css:1218`),
`10px` (`#loading-bar-spinner .spinner-icon` `09.css:244`), `25px`/`35px`
(`.btn-circle.btn-lg/.btn-xl` `09.css:377`–`378`), `50px` (`.btn-pill-*`/`.btn-oval`
`09.css:361`–`362`), `100px` (`.form-control-rounded` `09.css:308`, `.switch span`
`09.css:289`), `400px`/`500px` (`09.css:290`, `376`), `50%` (`.circle` `09.css:968`),
`100%` (`#loading-bar .peg` `09.css:242`, `.layer-morph-inner` `09.css:407`).

Border = **1px solid `rgb(236,238,238)`** everywhere via `.b/.bt/.br/.bb/.bl`
(`09.css:866`–`869`); coloured variants `.b*-primary/-success/-info/-warning/-danger/-amber/
-pink/-purple/-inverse/-orange/-gray*/-muted` at `09.css:870`–`933`.

Elevation ladder (`09.css:1115`–`1120`) — this is the app's entire shadow system:
```
.shadow-z1       0 1px 6px rgba(0,0,0,.12), 0 1px 6px rgba(0,0,0,.12)      09.css:1115
.shadow-z2       0 3px 10px rgba(0,0,0,.23), 0 3px 10px rgba(0,0,0,.16)    09.css:1116
.shadow-z2-hover 0 6px 10px rgba(0,0,0,.23), 0 10px 30px rgba(0,0,0,.19)   09.css:1117
.shadow-z3       0 6px 10px rgba(0,0,0,.23), 0 10px 30px rgba(0,0,0,.19)   09.css:1118
.shadow-z4       0 10px 18px rgba(0,0,0,.22), 0 14px 45px rgba(0,0,0,.25)  09.css:1119
.shadow-z5       0 15px 20px rgba(0,0,0,.22), 0 19px 60px rgba(0,0,0,.30)  09.css:1120
.shadow-clear/.no-shadow  → 0 0 0 rgb(0,0,0) !important                     09.css:970
```
z2 is reused verbatim for `.jumbotron`/`.well`/`.settings-inner` (`09.css:20`, `22`, `263`)
and for every `.btn:hover/:focus/:active` (`09.css:325`).
Header/aside get a distinct pair: `0 0 4px rgba(0,0,0,.14), 0 4px 8px rgba(0,0,0,.28)`
(`09.css:97`) and `…, 2px 4px 8px rgba(0,0,0,.28)` (`09.css:98`).
`.chat li .chat-body { box-shadow: rgba(0,0,0,0.05) 0 1px 1px }` (`09.css:1123`).
Live corroboration: `box-shadow` is `none` for 2094/2156 nodes with **6** distinct values
(`caps/00-baseline-room/DEFAULTS.txt:83`).

### 3.5 Breakpoints — every `@media` in the dump

**App sheet (`09.css`), 38 blocks in copy A:**

| Query | Line(s) | What it does |
|---|---|---|
| `only screen and (min-width: 480px)` | `112` | `.app-view-header > small` → `inline-block` |
| `only screen and (min-width: 768px)` | `59, 63, 73, 79, 87, 102, 116, 139, 166, 194, 235, 314, 419` | The main desktop switch: hides `.mobile-toggles` (`74`), pushes `section`/`footer` by the 240px sidebar (`103`), sets `.app-fh{left:240px}` + `.app-display-flex{display:flex!important}` (`140`–`141`), navbar hover `rgba(54,63,69,.05)` (`80`), `.nav-wrapper` positioning (`88`–`92`), full `.layout-material` re-layout (`167`–`176`), sidebar nav padding (`195`–`197`), `#loading-bar{height:100px}` under layout-material (`236`), `.input-huge{font-size:42px}` (`315`), `.layer-morph-wrapper{padding-left:70px}` (`420`) |
| `only screen and (min-width: 992px)` | `317` | `.input-huge { font-size: 82px }` |
| `only screen and (max-width: 479px)` | `934` | `.b0-sm`/`.b*-sm` border utilities |
| `only screen and (max-width: 767px)` | `121, 151, 945` | 3-D sidebar off-canvas translate (`122`–`124`), `#cssLogo{display:none}` (`152`), `.b*-md` utilities (`946`–`954`) |
| `only screen and (max-width: 991px)` | `956` | `.b*-lg` utilities |
| `print` | `253, 443, 465, 487, 509, 531, 553, 575, 599, 623, 647, 671, 695, 719, 743, 767, 791` | Hides sidebar/navbar/settings/buttons (`254`), forces every `.bg-*` to black text |

**Bootstrap (`02.css`):** `min-width:768/992/1200` container + grid tiers (`02.css:356, 400,
422, 425, 428, 486, 540, 594, …`), `max-width:767` (`02.css:676, 1042, 1067, 1101, 1125, 1485,
1491, 1494, 1497, 1545`), the four `visible-*/hidden-*` bands `768–991`, `992–1199`, `≥1200`
(`02.css:1500`–`1556`), `@media screen and (-webkit-min-device-pixel-ratio: 0)` for date inputs
(`02.css:702`), `@media (max-device-width:480px) and (orientation:landscape)` (`02.css:1010`),
`@media (transform-3d),(-webkit-transform-3d)` for the carousel (`02.css:1436`), plus a print
block (`02.css:41`).
**xeditable (`06.css`):** `screen and (max-width:750px)` / `(min-width:750px)` (`06.css:23`, `28`).

**Effective breakpoint set for a rebuild: 480 / 768 / 992 / 1200 px** (plus a stray 750px in
xeditable and 479/767/991 as the `max-width` mirrors). At the captured 1842px viewport all
`min-width` blocks are active and all `max-width` blocks inactive.

### 3.6 z-index layers (app sheet)

| z | Selector | Locator |
|---|---|---|
| `-1` | `#loading-bar`, `.switch input`, `.show-behind` | `09.css:234`, `288`, `1042` |
| `1` | `.topnavbar > .navbar-header`(≥768), `.navbar-brand`, `.smoothy`, `.layer-morph-inner` | `09.css:60`, `62`, `397`, `407` |
| `5` | `.carousel-control em` | `09.css:52` |
| `100` | `.wrapper-bg-image` | `09.css:2547` |
| `108 / 109` | `.layout-material` aside / header (≥768) | `09.css:170`, `167` |
| `110` | `.app-container > section` | `09.css:99` |
| `210` | `.app-container > footer` | `09.css:100` |
| `310` | `.app-container > aside` | `09.css:98` |
| `410` | `.app-container > header` | `09.css:97` |
| `999` | `.abs-center.abs-fixed` | `09.css:1108` |
| `1000` | `#webcamCamDiv`, `.posted-video-container` | `09.css:1187`, `1263` |
| `3001` | `.topnavbar .sidebar-toggle/.menu-toggle`, `.settings-wrapper` | `09.css:76`, `262` |
| `9001 / 9002 / 9003` | layer-morph overlay / container / close | `09.css:406`, `417`, `408` |
| `9999` | `.smoothy::after` | `09.css:398` |
| `90002` | `#loading-bar-spinner` | `09.css:243` |
| `99999` | `.btn-offset` | `09.css:379` |

Bootstrap's own stack sits underneath: `.dropdown-menu 1000` (`02.css:857`),
`.navbar-fixed-* 1030` (`02.css:1021`), `.modal-backdrop 1040` (`02.css:1378`),
`.modal 1050` (`02.css:1372`), `.popover 1060` (`02.css:1414`), `.tooltip 1070`
(`02.css:1398`), `.dropdown-backdrop 990` (`02.css:870`).
Live: `z-index` is `auto` for 2116/2156 nodes, **8** distinct values
(`caps/00-baseline-room/DEFAULTS.txt:13`).

### 3.7 Motion

`.animated { animation-duration: 0.5s; animation-fill-mode: both }` (`09.css:224`) —
the app **overrides** animate.css's 1s (`12.css:2`) because sheet 09 loads after sheet 12? No —
09 is index 9 and 12 is index 12, so **animate.css wins** and the live duration is 1s
(`12.css:2`). Flag for the rebuild: the 0.5s in `09.css:224` is dead.
Angular route transitions: `.ng-fadeIn*/.ng-fadeOut*` all `0.35s ease` (`09.css:202`–`223`),
`.ng-fadeOutZoom` `1s cubic-bezier(0.23,1,0.32,1)` (`09.css:222`–`223`).
Ripple `0.35s linear` (`09.css:384`–`392`); settings drawer `right 0.3s
cubic-bezier(0.86,0,0.07,1)` (`09.css:262`); layer-morph `transform 0.5s
cubic-bezier(0.42,0,0.58,1)` (`09.css:407`); YouTube-button reveal `showYtBtns` 5s
(`09.css:1267`–`1271`).
Live: `transition-duration` is `0s` for 2142/2156 nodes with 5 distinct values, and
`transform` is `none` for 2141/2156 (`caps/00-baseline-room/DEFAULTS.txt:91`, `92`) —
**nothing was mid-animation when the DOM was captured.**

---

## 4. The rules that drive THIS page

### 4.1 Room shell / layout engine (CSS tables, not flex)

```
09.css:94   html { height: 100%; touch-action: manipulation; }
09.css:95   body { overflow: hidden; height: 100%; }          ← overridden by 14.css:2 (overflow:auto)
09.css:96   .app-container { position: relative; width: 100%; min-height: 100%; height: auto; }
09.css:135  .footer-hidden .container-fh { bottom: 0px; }
09.css:136  .footer-hidden .app { padding-bottom: 0px; }
09.css:137  .footer-hidden .app-container > footer { display: none; }
09.css:138  .app-fh { position: absolute; width: auto; overflow: visible; inset: 50px 0 0; padding: 0; }
09.css:144  .container-fh { height: 100%; }
09.css:145  .l-table, .l-table-fixed { display: table; width: 100%; height: 100%; min-height: 240px; border-spacing: 0; }
09.css:146  .l-table-fixed { table-layout: fixed; }
09.css:147  .l-row  { display: table-row; height: 100%; }
09.css:148  .l-cell, .l-cell-wrapper { position: relative; display: table-cell; height: 100%; width: 100%; vertical-align: top; overflow: auto; }
09.css:149  .l-cell-wrapper { display: block; }
09.css:150  .l-cell-wrapper .l-cell-inner { position: absolute; inset: 0px; }
09.css:1173 .l-table, .l-table-fixed { min-height: inherit; }   ← later override of :145
```

**`themeClass` = `footer-hidden` on every capture** (`00-META.txt:13`–`34`), so
`09.css:135`–`137` are live: the footer is `display:none` and `.app` has no bottom padding.

The 32 room-only rules appended in copy B (`09.css:2543`–`2574`) — quoted in full because they
are the actual room layout and exist **only** in the second copy:

```
09.css:2543  .roomArea { height: 100%; display: flex !important; flex-direction: column !important; }
09.css:2544  .alertsChatArea { display: flex !important; flex-direction: row !important; }
09.css:2545  .l-cell-presentation-sections, .presentationHolderDiv, .presentationContainer, .split-presentation { overflow: hidden; }
09.css:2546  .room-bg-image-show, .root-bg-image, .container-bg-image, .video-presentation-section { width: 100%; height: inherit; }
09.css:2547  .wrapper-bg-image { width: 100%; height: 100%; padding: 25px; text-align: center; z-index: 100; }
09.css:2548  .l-table-block, .l-row-block { display: block !important; }
09.css:2549  .room-bg-image { max-width: 100%; max-height: 100%; }
09.css:2550  .webcamScreenVideo { max-height: calc(-50px + 100vh) !important; height: auto !important; }
09.css:2551  .btn-random-user { display: none; }
09.css:2552  .texarea-alt-wrapper { padding: 2px !important; }
09.css:2553  .texarea-alt { padding: 3.5px !important; }
09.css:2554  .input-group-alt { padding: 1px 10px !important; }
09.css:2555  .typing-indicator { height: 16px; }
09.css:2556  .l-cell-wrapper-overflow { overflow: hidden; }
09.css:2557  .user-info-block { display: block; margin: 3px 0px; }
09.css:2558  .roster-user-icon { vertical-align: middle; }
09.css:2559  .disclosure-input { margin-bottom: 10px; }
09.css:2560  .d-block { display: block; }
09.css:2561  #permissionsModal .modal-content { padding: 20px; }
09.css:2562  #badgesForm input { vertical-align: text-bottom; }
09.css:2563  .label-badge-img { padding: 0px !important; }
09.css:2564  .user-badge-img { width: auto; height: 100%; max-height: 20px; margin: 0px 4px; }
09.css:2565  .dark-theme-badge-id { font-size: 10px; }
09.css:2566  .room-badge-id, .room-badge-name { color: rgb(0, 0, 0); }
09.css:2567  .room-badge-name { margin: 0px 4px; }
09.css:2568  .users-many-actions { margin-top: 30px; }
09.css:2569  .checkbox-apply-to-all-rooms { margin-left: 10px; }
09.css:2570  .checkbox-apply-to-all-rooms input:checked + span { font-weight: bold; }
09.css:2571  .chat-tab-row { display: flex; align-items: center; justify-content: flex-start; gap: 10px; border-bottom: 1px solid rgb(238,238,238); padding: 5px 0px; }
09.css:2572  .badge-preview { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
09.css:2573  .add-tab-btn { margin-top: 10px; }
09.css:2574  .cursor-pointer:hover { cursor: pointer; }
```

`#permissionsModal` (`09.css:2561`) is exactly capture 01's subtree
(`00-META.txt:14`) — the modal is a 22-node `.modal-content` with 20px padding.

Split panes (the draggable room dividers):
```
09.css:1241  .gutter.gutter-horizontal { background-image: url(data:image/png;base64,…); cursor: col-resize; position: relative; padding: 0px 5px; }
09.css:1242  .gutter.gutter-vertical   { background-image: url(data:image/png;base64,…); cursor: row-resize; padding: 5px 0px; }
09.css:1240  .gutter { background-color: rgb(34,34,34); color: rgb(255,255,255); background-repeat: no-repeat; background-position: 50% center; display: inherit; }
09.css:1243  .split { box-sizing: border-box; }
09.css:1244  .split, .gutter.gutter-horizontal { float: left; }
09.css:1245  .split, .gutter.gutter-horizontal { height: 100%; }
09.css:1246  .split { overflow: hidden auto; }
```

### 4.2 Chat

```
09.css:1121  .chat { list-style: none; margin: 0; padding: 0 6px 0 0; }
09.css:1122  .chat li { margin-bottom: 2px; padding-bottom: 1px; }
09.css:1123  .chat li .chat-body { box-shadow: rgba(0,0,0,0.05) 0px 1px 1px; }
09.css:1124  .chat li .chat-body p { margin: 0; color: rgb(131,148,169); }
09.css:1125  .chat li .chat-header { padding: 0 0 3px; display: inline; }
09.css:1128  .chat li .chat-msg { padding: 3px 5px 5px; border-radius: 2px; white-space: pre-wrap; }
09.css:1133  .chat li.left  .chat-body { margin-left: 60px; }
09.css:1134  .chat li.right .chat-body { margin-right: 60px; }
09.css:1135  .chatToolbar { margin-top: 5px; border-top: 1px solid rgba(0,0,0,0.5); … }
09.css:1144  ul#chatContent.chatWide { font-size: 12px; display: flex; flex-flow: column wrap; height: 100%; width: 100%; }
09.css:1145  li#chatContent.chatWide { width: calc(33.3333%); padding-left: 10px; }
09.css:1146  #chatContent.chatWide div { max-width: 200px; word-break: break-all; overflow-wrap: break-word; }
09.css:1156  .chatUpvoted { font-weight: 700; font-size: 16px; }
09.css:1157  .chatUpvoted i { font-size: 16px; }
09.css:1160  .chatStars { max-height: 8px; height: 8px; vertical-align: text-top; }
09.css:1161  .chatName { vertical-align: text-top; margin-right: 5px; }
09.css:1162  .isAdm { font-weight: 400; }
09.css:1164  .chat li { overflow-wrap: break-word; }
09.css:1165  .smChatLi { border-bottom: 1px solid rgba(220,220,220,0.46); }
09.css:1166  .smChatLi .isAdm { border-bottom: 1px solid rgb(176,176,176); }
09.css:1167  .smChatBodyAdm { text-align: right; margin-right: 5px; }
09.css:1169  .chatHeader { padding-top: 0; background-color: rgba(0,0,0,0.04); border: 1px solid rgb(236,238,238); }
09.css:1170  .chatSmall li { padding-bottom: 1px; margin-bottom: 1px; }
09.css:1229  .chat-top { display: flex; justify-content: space-between; align-items: center; height: auto; min-height: 40px; padding: 0 10px; border-bottom: 1px solid rgb(232,232,232); }
09.css:1230  .chatChannelTabs { display: flex; justify-content: center; border: 0; flex-flow: wrap; }
09.css:1231  .chatChannelTabs a { font-size: 12px; font-weight: bolder; height: 33px; margin-top: 9px; color: rgb(133,142,154)!important; padding: 5px 4px!important; }
09.css:1232  .chatChannelTabs li.activeTab a { cursor: pointer; color: rgb(81,93,110)!important; background-color: rgb(232,232,232)!important; }
09.css:1233  .chatChannelTabs a:hover, .chatChannelTabs a:focus { cursor: pointer; color: rgb(81,93,110)!important; background-color: rgb(232,232,232)!important; }
09.css:1247  #chatAlertsDiv { overflow-y: hidden; display: flex; flex-direction: column; }
09.css:1248  .chat-relative-position { position: relative; }
09.css:1250  .private-chat-wrapper { max-width: 350px; overflow-y: auto; }
```
One rule in the sheet is a leftover hand-edit against a specific message id:
`#chatLi_30 > div > div.chat-msg.chat-msg-txt > div > a > img isadm.uploaded-img img
{ text-align: right !important; }` (`09.css:1228`) — malformed (`isadm` is not a valid
combinator) and can never match. Do not port it.

### 4.3 Alerts

The app's own `alert` styling is only the 5 extra colour variants
(`.alert-purple/-amber/-pink/-inverse/-orange`, `09.css:1091`–`1105`); the base `.alert`
box comes from Bootstrap (`02.css:1203`–`1221`). The **alerts tab strip** is app CSS:
```
09.css:23  .nav-tabs-alerts > li > a { font-weight: 400; color: rgb(88,95,105); background-color: rgb(244,245,245); margin: 0; border: 1px solid rgb(230,233,238); border-radius: 0; padding: 8px 18px; cursor: pointer; }
09.css:24  .nav-tabs-alerts > li.active > a { padding: 12px 22px; }
09.css:25  .nav-tabs-alerts > li.active > a, …:hover, …:focus { color: inherit; border-bottom-color: rgb(255,255,255); }
09.css:26  .nav-tabs-alerts > li { padding: 4px; }
09.css:27  .nav-tabs-alerts > li.active { padding: 0px; }
09.css:28  .nav-tabs-alerts > li.active + li { padding-left: 4px; }
09.css:29  .nav-tabs-alerts > li:first-child { padding-left: 0px; }
09.css:30  .tab-content { padding: 10px 20px; border-style: solid; border-width: 0 1px 1px; border-color: rgb(230,233,238); }
09.css:31  .nav-pills + .tab-content { border: 0; padding: 0; }
```
Alert-upload plumbing: `#file, #fileAlert { display: none }` (`09.css:1217`),
`.drop-area-alert, .drop-area { border: 2px dashed rgb(29,41,54); margin:10px; padding:20px 0;
border-radius:5px }` (`09.css:1218`), `.drop-area-alert.highlight, .drop-area.highlight
{ border-color: rgb(2,90,168); background-color: rgb(241,241,241)!important }` (`09.css:1219`).

### 4.4 Video / screen-share / webcam

```
09.css:1184  #webcamScreen { height: inherit; object-fit: contain; vertical-align: top; max-height: calc(-60px + 100vh); width: 100%; }
09.css:1185  object#webcamScreen { width: 99%; height: 99%; background-color: inherit; object-fit: contain; vertical-align: top; overflow: hidden; pointer-events: none; max-width: 1920px !important; max-height: 1080px !important; }
09.css:1186  .loadingBkg { background-image: url("/public/app/img/ajax_loader.gif") !important; background-repeat: no-repeat !important; background-position: center center !important; }
09.css:1187  #webcamCamDiv { position: absolute; background: rgba(0,0,0,0.5); border: 2px solid rgba(191,255,0,0.494); border-radius: 4px; top: calc(100% - 320px); left: calc(100% - 2000px); width: 320px; z-index: 1000; resize: both; overflow: hidden; min-width: 50px; min-height: 50px; max-width: 1920px !important; max-height: 1080px !important; }
09.css:1188  #webcamCam { width: 100%; height: 100%; background-color: inherit; object-fit: contain; vertical-align: top; overflow: hidden; pointer-events: none; }
09.css:1189  object#webcam { width: 1px; height: 1px; background-color: rgb(255,255,255); … max-width: 1px !important; max-height: 1px !important; }
09.css:1190  #webcamFlash { display: inherit; height: 100%; width: 100%; object-fit: contain; }
09.css:1192  .w11k-flash-container, .object { display: inherit; height: 100%; width: 100%; object-fit: contain; }
09.css:1193  #padFrame { height: 100%; width: 100%; object-fit: contain; }
09.css:1207  .videoChatContainer { width: 100%; display: flex; flex-flow: row; justify-content: center; align-items: flex-start; overflow: scroll; }
09.css:1208  .videoChatAuto { outline: rgb(255,255,255) solid 2px; background: rgb(51,51,51); margin: auto; max-width: 320px; max-height: 200px; … }
09.css:1209  .videoChatAutoSM { background: rgb(51,51,51); margin: auto; max-width: 160px; max-height: 100px; … text-align: center; … }
09.css:1210  .videoChatAudio { width: 1px !important; height: 1px !important; padding: 0 !important; margin: 0 !important; position: relative !important; float: left !important; }
09.css:1211  .videChatLabel { width: 100%; height: 20px; background-color: rgba(0,0,0,0.1); color: rgb(255,255,255); font-size: 12px; text-align: center; position: relative; bottom: 0; }
09.css:1263  .posted-video-container { position: absolute; bottom: 20px; right: 20px; z-index: 1000; }
09.css:2550  .webcamScreenVideo { max-height: calc(-50px + 100vh) !important; height: auto !important; }
```
Note `left: calc(100% - 2000px)` on `#webcamCamDiv` (`09.css:1187`) — at 1842px viewport that
computes to a **negative** left of about −158px, i.e. the PiP starts off the left edge unless
JS repositions it. `.videoChatContainer` uses `overflow: scroll` (not `auto`), so its
scrollbars are always reserved.

YouTube posting UI: `#basic-addonSaveYoutube:hover, #basic-addonClearYoutube:hover,
#basic-addonYoutube:hover { cursor: pointer; background-color: rgb(244,244,244) }`
(`09.css:1264`), `.remove-yt-url { padding: 2px 6px }` (`09.css:1265`),
`.yt-url:hover { cursor: pointer; color: rgb(85,85,85); text-decoration: underline }`
(`09.css:1266`), `.yt-btn { opacity: 0; animation: 5s … showYtBtns }` (`09.css:1267`).
Video.js itself is **not styled** — sheet 03 is CORS-blocked (§8).

### 4.5 Member list / roster / badges

```
09.css:2557  .user-info-block { display: block; margin: 3px 0px; }
09.css:2558  .roster-user-icon { vertical-align: middle; }
09.css:2562  #badgesForm input { vertical-align: text-bottom; }
09.css:2563  .label-badge-img { padding: 0px !important; }
09.css:2564  .user-badge-img { width: auto; height: 100%; max-height: 20px; margin: 0px 4px; }
09.css:2565  .dark-theme-badge-id { font-size: 10px; }
09.css:2566  .room-badge-id, .room-badge-name { color: rgb(0, 0, 0); }
09.css:2567  .room-badge-name { margin: 0px 4px; }
09.css:2568  .users-many-actions { margin-top: 30px; }
09.css:2569  .checkbox-apply-to-all-rooms { margin-left: 10px; }
09.css:2570  .checkbox-apply-to-all-rooms input:checked + span { font-weight: bold; }
09.css:1255  span.label { padding: 0.2em; margin-right: -4px !important; }
09.css:1236  .badge-warning { background-color: rgb(255,204,0); color: black; margin-left: 5px; }
09.css:1234  .badge-danger-chat { background-color: rgb(255,0,0); }
09.css:2551  .btn-random-user { display: none; }
```
`.dark-theme-badge-id` (`09.css:2565`) is a **badge-id size utility, not a theme selector** —
it sets only `font-size: 10px` and contains no colour. Do not mistake it for theming.

### 4.6 Navbar / topbar

```
09.css:56   .topnavbar, .navbar, .navbar .dropdown-menu { filter: none !important; }
09.css:57   .topnavbar { position: relative; margin-bottom: 0; border-radius: 0; border: 0; backface-visibility: hidden; }
09.css:62   .topnavbar > .navbar-header > .navbar-brand { position: relative; display: block; padding: 0 5px; line-height: 50px; float: none; margin: 0 50px; z-index: 1; color: rgb(250,250,250); }
09.css:64   (≥768) .topnavbar > .navbar-header > .navbar-brand { margin: 0px 15px; }
09.css:66   .topnavbar > .navbar-header > .navbar-brand img { max-height: 100%; width: auto; }
09.css:70   .topnavbar .mobile-toggles { right:0; left:0; top:0; height:50px; line-height:50px; padding:0 10px; position: absolute !important; }
09.css:74   (≥768) .topnavbar .mobile-toggles { display: none; }
09.css:76   .topnavbar .sidebar-toggle, .topnavbar .menu-toggle { font-size: 24px; color: white; z-index: 3001; }
09.css:80   (≥768) .topnavbar .nav > li > a:hover/:focus { background-color: rgba(54,63,69,0.05); }
09.css:1137 .navbar-header { width: 350px; }
09.css:1138 .navSwitcher { margin-left: 5px; margin-right: 25px; }
09.css:1139 .title { line-height: 50px; color: rgb(255,255,255); font-size: 17px; text-align: center; }
09.css:1191 .navLogo { max-height: 25px; max-width: 300px; width: auto; height: 25px; }
09.css:1253 .hasMobileApp { font-size: 20px !important; margin: 0 5px 0 2px !important; color: white !important; }
09.css:1252 .page-layout-types { margin-left: 7px; }
09.css:1256 .mobileTabs li:hover { cursor: pointer; }
09.css:1260 .nav-tab-li:hover { cursor: pointer; }
09.css:1261 .nav-tab-li:hover .active { cursor: auto; }
```
Navbar height is **50px** throughout (`09.css:62`, `70`, `1139`; Bootstrap `.navbar
min-height:50px` `02.css:994`, `.navbar-brand height:50px` `02.css:1027`).

### 4.7 Dropdowns (captures 02–18)

```
09.css:48    .dropdown-menu { border-radius: 2px; font-size: 13px; }
09.css:49    .dropdown-header { color: rgb(161,162,163); }
09.css:86    .nav-wrapper .navbar-nav .open .dropdown-menu { position: absolute; left: 0; right: 0; border-top: 1px solid rgb(225,225,225); border-bottom: 1px solid rgb(225,225,225); }
09.css:91-92 (≥768) …{ left: auto; right: auto; }  /  .navbar-right … { left: auto; right: 0; }
09.css:1257  #filesDrive .dropdown-menu { left: -175px; top: -70px; }
09.css:1258  #filesDrive .dropdown-menu::after { content:""; position:absolute; right:-10px; bottom:13px; border-width:5px; border-style:solid; border-color: transparent transparent transparent rgb(0,0,0); }
09.css:1259  #filesDrive .dropdown-menu-sounds::after { bottom: 60px; }
```
Base geometry from Bootstrap: `min-width:160px; padding:5px 0; margin:2px 0 0; font-size:14px;
background:#fff; border:1px solid rgba(0,0,0,.15); border-radius:4px; box-shadow:0 6px 12px
rgba(0,0,0,.176)` (`02.css:857`) — **but the app overrides radius to 2px and font-size to 13px**
(`09.css:48`). `.dropdown-menu-right { right:0; left:auto }` (`02.css:867`) is the
`dropdown-menu-right.show` variant seen in captures 04/09/14.

### 4.8 Modal

App contributes only `#permissionsModal .modal-content { padding: 20px }` (`09.css:2561`) and
the imgur/preview modal:
```
09.css:1223  .imgur-modal { text-align: center; }
09.css:1225  .imgur-modal img { max-width: 100%; max-height: calc(-150px + 100vh); }
09.css:1226  .imgur-modal .modal-dialog { width: 90%; height: 90%; }
```
Everything else is Bootstrap: `.modal z-index:1050` (`02.css:1372`), `.modal-dialog
{width:600px; margin:30px auto}` at ≥768 (`02.css:1391`), `.modal-content` white, 6px radius,
`0 5px 15px rgba(0,0,0,.5)` (`02.css:1377`, `1392`), backdrop `#000` at `opacity .5`
(`02.css:1378`, `1380`), header/footer `15px` padding with `1px solid rgb(229,229,229)`
(`02.css:1381`, `1385`).

---

## 5. THEME SYSTEM — the verdict

### 5.1 There are ZERO CSS custom properties in this app

`cssVars` is `{"root":{},"body":{}}` for **all 21 DOM captures** — `00-META.txt:38`–`59`,
every single line, no exceptions. And that is not a capture failure: a grep for `var(--`
across all 15 decoded sheets returns **0 occurrences**, and a grep for custom-property
*definitions* (`--name:`) returns **0** as well.

> `grep -o 'var(--' *.css | wc -l` → **0**
> `grep -oE '\-\-[a-zA-Z0-9_-]+ *:' *.css` → **0 matches**

**The app uses no CSS variables anywhere.** Every colour is a literal `rgb()`/`rgba()`/keyword
baked into a selector. A rebuild that introduces custom properties is *improving* on the
original, not matching it — that is fine, but the source has no token layer to copy.

### 5.2 `darkTheme` / `lightTheme` are not selectors — they match nothing

`grep -inE 'darkTheme|lightTheme'` across all 15 sheets → **0 matches**.
`grep -in 'theme'` across all 15 sheets → exactly **one** hit, and it is not a theme selector:
`09.css:2565 .dark-theme-badge-id { font-size: 10px; }`.

So when the harness put `darkTheme` (capture 19) or `lightTheme` (capture 20) on `<body>`,
**no rule in any loaded stylesheet could react**. This is confirmed empirically in §5.4.

### 5.3 The real theming primitive: a bare `.dark` / `.light` class, and `.light` is EMPTY

These are the **only** `.dark`/`.light` rules in the entire dump (grep across all 15 sheets;
`12.css:497` and `12.css:506` are animate.css's `.lightSpeedIn/.lightSpeedOut` and are unrelated):

```
09.css:1131  .dark .chat-msg-txt a:hover                 { color: rgb(0, 0, 255); }
09.css:1132  .dark .chat-msg-txt a:visited, .dark .chat-msg-txt a:link { color: rgb(50, 176, 213); }
09.css:1158  li.chatUpvoted.light                        { border: 2px solid rgb(0, 0, 0); }
09.css:1195  .dark                                       { background-color: black; color: white; }
09.css:1196  .light                                      { }        ← EMPTY RULE, zero declarations
09.css:1197  div.l-row.dark                              { background-color: black; color: rgb(224, 224, 224); }
09.css:1198  div.l-row.dark a                            { color: rgb(208, 208, 208); }
09.css:1199  div.chatHeader.dark                         { color: rgb(136, 136, 136); background-color: rgb(72, 72, 72); border: none; }
09.css:1200  div.p.bt.dark                               { color: rgb(136, 136, 136); background-color: rgb(72, 72, 72); border: none; }
09.css:1201  input.form-control.dark, .btn.btn-default.dark { background-color: rgb(0, 0, 0); }
```
(duplicated verbatim at `09.css:2401`, `2402`, `2428`, `2465`–`2471`.)

Read the selectors: `.dark` is applied **per element**, never to `html`/`body`. The targets are
exactly the room/chat surfaces — `div.l-row` (the room layout row, `09.css:147`),
`div.chatHeader` (`09.css:1169`), `div.p.bt` (the padding-10 + border-top panel,
`09.css:836` + `09.css:868`), `.chat-msg-txt` links, `li.chatUpvoted`, and the composer's
`input.form-control` / `.btn.btn-default`. There is no `.dark` rule for the navbar, the
sidebar, the modal, the dropdown, the alerts tabs, or any `.bg-*` utility.

**`.light { }` at `09.css:1196` is literally an empty rule** — light mode is "no class applied,
inherit the default light palette." The only rule that does anything under `.light` is the
upvote outline at `09.css:1158`, which exists because the dark variant would be invisible.

**This confirms the sibling account-settings dump's conclusion — and this page is where the
proof lives.** The sibling page could only observe the absence of theming; ptr1 is the
chat/room page, and here the `.dark`/`.light` selectors *do* exist and *are* scoped precisely
to chat/room components. Nothing in ptr1 refutes the sibling; ptr1 supplies the positive half
of the claim the sibling could only state negatively.

### 5.4 What forcing dark and light ACTUALLY changed: one attribute, zero pixels

**Capture 19 (forced-darkTheme).** `caps/19-forced-darkTheme/INFO.txt:10`–`12` declares
`nodes identical to baseline: 2155/2156`, `nodes differing: 1`, `nodes removed: 0`.
I recounted independently: `caps/19-forced-darkTheme/IDENTICAL-TO-BASELINE.txt` is 2157 lines
(1 header + 1 blank + **2155** node paths), and `NODES-REMOVED-VS-BASELINE.txt:1` says
`0 baseline node path(s) absent from this capture`. The one differing node, in full:

```
caps/19-forced-darkTheme/nodes-000.txt:3   #0 path=r <body> — 1 difference(s) vs baseline
caps/19-forced-darkTheme/nodes-000.txt:4     attr class: "footer-hidden" -> "footer-hidden darkTheme"
```

**Capture 20 (forced-lightTheme).** Identical shape —
`caps/20-forced-lightTheme/INFO.txt:10`–`12` (2155/2156, 1 differing, 0 removed), recount of
`IDENTICAL-TO-BASELINE.txt` = **2155** paths, `NODES-REMOVED-VS-BASELINE.txt:1` = 0 removed:

```
caps/20-forced-lightTheme/nodes-000.txt:3   #0 path=r <body> — 1 difference(s) vs baseline
caps/20-forced-lightTheme/nodes-000.txt:4     attr class: "footer-hidden" -> "footer-hidden lightTheme"
```

The diff format is exhaustive — the header of each IDENTICAL file states the compared surface:
"byte-identical to baseline-room (rect, attrs, tag, text, ::before, ::after, and **ALL computed
style props**)" (`caps/19-forced-darkTheme/IDENTICAL-TO-BASELINE.txt:1`). And the single
differing node lists exactly **one** difference, an `attr`, with **no** style lines. So:

- Not one rect moved.
- Not one computed style property changed, on any node — **including `<body>` itself**.
- No node appeared or disappeared.

Second, independent corroboration: the page-wide COMMON computed-style tables for captures 19
and 20 are **byte-for-byte identical to the baseline's**, apart from the capture label on
line 1. I diffed `caps/00-baseline-room/DEFAULTS.txt` against
`caps/19-forced-darkTheme/DEFAULTS.txt` and `caps/20-forced-lightTheme/DEFAULTS.txt`: the only
hunk is `1c1` (`…for capture "baseline-room"` → `…"forced-darkTheme"` / `…"forced-lightTheme"`).
All 95 property rows (`DEFAULTS.txt:6`–`100`) — the distinct-value counts, the majority-value
counts — are unchanged.
If any theme rule had fired, `background-color` (18 distinct, 1999/2156 at `rgba(0,0,0,0)`,
`DEFAULTS.txt:58`) or `color` (10 distinct, 1732/2156 at `rgb(51,51,51)`, `DEFAULTS.txt:64`)
would have shifted. Neither moved by a single node.

### 5.5 VERDICT

> **The rebuild needs ONE palette, not two.**
>
> There is no theme system in this application. `darkTheme`/`lightTheme` on `<body>` are inert
> strings that match zero selectors (§5.2). There are no CSS custom properties to swap (§5.1).
> The only theming primitive that exists is a bare `.dark` class toggled on individual
> chat/room elements — a 10-rule, chat-scoped inversion (`09.css:1131`, `1132`, `1195`,
> `1197`–`1201` + `li.chatUpvoted.light` at `09.css:1158`) — with its counterpart `.light { }`
> **empty** (`09.css:1196`), i.e. "light" *is* the default and costs nothing.
>
> Build the light palette from §3.2. Then, if and only if the room offers a per-room dark chat
> toggle, implement `.dark` as a **component-scoped modifier** on exactly seven surfaces:
> the generic fallback (`black`/`white`), `div.l-row` (`black` / `rgb(224,224,224)`, links
> `rgb(208,208,208)`), `div.chatHeader` and `div.p.bt` (both `rgb(72,72,72)` / `rgb(136,136,136)`,
> border removed), `input.form-control` + `.btn.btn-default` (`rgb(0,0,0)`), and chat message
> links (`rgb(50,176,213)` / hover `rgb(0,0,255)`). Nothing else in the app has a dark variant —
> not the navbar, not the modal, not the alerts tabs, not any `.bg-*`/`.text-*` utility.

**In the captured state, `.dark` was not active anywhere I can see:** the body class is
`footer-hidden` in every capture (`00-META.txt:13`–`34`), and the COMMON background-color for
the page is `rgba(0,0,0,0)` with text `rgb(51,51,51)` on a white Bootstrap body
(`DEFAULTS.txt:58`, `64`; `02.css:327`). Whether any individual node carries `class="dark"`
is answerable only from the per-node files in `caps/00-baseline-room/nodes-*.txt`, which belong
to another agent — see **Honest gaps**.

---

## 6. `final-room` vs `baseline-room` — nothing changed at all

`caps/21-final-room/INFO.txt:10`–`12`:
```
nodes identical to baseline: 2156/2156
nodes differing            : 0
nodes removed vs baseline  : 0
```
Independently recounted: `caps/21-final-room/IDENTICAL-TO-BASELINE.txt` is 2158 lines
(1 header + 1 blank + **2156** node paths — and unlike captures 19/20 the list *includes*
the root path `r`, which is exactly the body node that differed there);
`caps/21-final-room/NODES-REMOVED-VS-BASELINE.txt:1` = `0 baseline node path(s) absent`;
`02-MANIFEST.txt:25` records `nodeFiles=0` (there is no diff file because there is no diff).
And `caps/21-final-room/DEFAULTS.txt` diffs against the baseline's in exactly one place:
line 1's capture label.

**What this implies, over the 3.414 s window from `15:59:18.276Z` to `15:59:21.690Z`
(`00-META.txt:13` vs `00-META.txt:34`):**

- **No live data arrived.** Not one chat message, alert, roster change, or price tick landed —
  a single socket push would have inserted or mutated at least one `<li>` and changed a rect.
- **No animation advanced.** Every `.animated` element (`12.css:2`, 1s duration) would have
  moved a `transform` or `opacity` inside 3.4 s. `transform` is `none` on 2141/2156 nodes and
  `transition-duration` is `0s` on 2142/2156 (`DEFAULTS.txt:91`–`92`) — nothing was in flight.
- **No layout reflow.** Not one of the 2,156 rects shifted by a subpixel, so no image finished
  decoding, no font swapped, no video element resized.
- **The two theme forcings left no residue.** Capture 21 is byte-identical to capture 00 *after*
  dark and light were both applied and reverted (captures 19 → 20 → 21), which independently
  re-proves §5.4: the forcings had no effect to undo.

For the rebuild this is good news and a caveat. Good: the baseline capture is a **stable,
quiescent** picture — a screenshot diff against it is a fair test. Caveat: the dump contains
**no evidence of dynamic behaviour** — no second frame of a chat list, no arriving alert, no
socket-driven state. Any live-update behaviour must come from another source; it is an honest
gap in this dump, not something to invent.

---

## 7. Fonts

**Three `@font-face` declarations exist in the entire dump. All three are icon fonts.
There is no `@font-face` for body text.**

| family | sources | sheet | licence note for the rebuild |
|---|---|---|---|
| `"Glyphicons Halflings"` | `../fonts/glyphicons-halflings-regular.woff2` / `.woff` / `.ttf` | `02.css:60` | **Bundled with Bootstrap 3 under the Bootstrap licence, but Glyphicons proper is a commercial font** — Bootstrap 3's bundled subset is redistributable with Bootstrap. Must be **self-hosted** (relative `../fonts/` path). Only used by `.glyphicon-*` (`02.css:61`–`323`); the app overrides `.glyphicon` to render from **FontAwesome** instead (`09.css:2`), and maps four chevrons to FA codepoints (`09.css:5`–`8`), so Glyphicons may be droppable entirely — verify against the rendered glyphs. |
| `FontAwesome` | `../fonts/fontawesome-webfont.woff2?v=4.3.0` / `.woff` / `.ttf` | `10.css:2` | **Version 4.3.0 is stated in the URL.** SIL OFL 1.1 for the font, MIT for the CSS — free, but must be **self-hosted**. Carries 517 glyph rules (`10.css:40`–`557`) plus `.fa-lg/2x…5x`, `.fa-fw`, `.fa-ul/li`, `.fa-spin/-pulse`, `.fa-rotate/-flip`, `.fa-stack` (`10.css:4`–`39`). |
| `feather` | `fonts/feather-webfont.woff` / `.ttf` (**no woff2**) | `11.css:2` | This is the **Feather webfont by Cole Bemis / "feathericons" webfont build**, not the modern SVG Feather. 134 `.icon-*` glyphs (`11.css:5`–`136`), applied via `[data-icon]::before` and `[class^="icon-"]` (`11.css:3`–`4`). The app sizes them at 15px (`09.css:320`). Must be **self-hosted**; no woff2 exists in the capture, so expect a larger payload or a re-generated font. |

Non-`@font-face` families declared:
- `02.css:327` body stack `"Helvetica Neue", Helvetica, Arial, sans-serif` — **system fonts, no licensing.**
- `02.css:24` / `02.css:414` code stack `Menlo, Monaco, Consolas, "Courier New", monospace` — system.
- `09.css:1202` `#clockdiv { font-family: sans-serif }` — system.
- `02.css:1457` `.carousel-control .icon-next/-prev { font-family: serif }` — system.
- `02.css:2` `html { font-family: sans-serif }` (normalize), overridden at `02.css:327`.

Live corroboration: only **3** distinct computed `font-family` values exist across all 2,156
nodes, with the Helvetica stack on 1,906 of them (`caps/00-baseline-room/DEFAULTS.txt:65`).
The other two are almost certainly `FontAwesome` and `feather` on icon elements — but the exact
node-level values are in the per-node files owned by another agent (see §8).

**Bottom line: the rebuild needs zero licensed text fonts.** Self-host FontAwesome 4.3.0 and
the Feather webfont; verify whether Glyphicons is reachable at all given `09.css:2`.

---

## 8. Honest gaps

1. **Sheet 03 — `https://vjs.zencdn.net/7.3.0/video-js.min.css` — CORS-BLOCKED.**
   `00-META.txt:65` reports `ruleCount=0 bytes=12`; `03.css:2` is the literal string
   `CORS-BLOCKED`. **All Video.js player chrome is unknown**: the big play button, control bar,
   progress bar, volume slider, captions/subtitles menu, poster, spinner, fullscreen. The only
   video-js CSS I have is the 2-rule inline shim (`00.css:2`–`3`, `.video-js` 300×150 and
   `.vjs-fluid` 56.25%) and the 4-rule YouTube-plugin shim (`13.css:2`–`5`). If this page shows
   a Video.js player, its styling must be sourced from video.js 7.3.0 directly — I cannot
   reconstruct it from this dump and will not guess it.
2. **Sheet 07 — `angularjs-toaster 2.2.0` — CORS-BLOCKED.** `00-META.txt:69`, `07.css:2`.
   The toast container geometry, positions, and close buttons are unknown. The app *does*
   override toast colours (`09.css:399`–`405`: `#toast-container { top: 55px !important }`,
   `.toast` `rgb(29,31,33)`, success/error/info/wait/warning) — so I know the palette but not
   the box. Note `body .toast-wait` (`09.css:404`) has no Bootstrap/toastr analogue in my files.
3. **Intercom.** The app ships exactly one Intercom rule — `.intercom-composer-popover
   { right: 10px !important }` (`09.css:1251`, dup `09.css:2521`). **Intercom's own stylesheet
   is not among the 15 sheets** (`00-META.txt:62`–`76`), so the messenger widget's appearance
   is entirely uncaptured. Expected — Intercom renders in a cross-origin iframe.
4. **Background images not captured.** `../img/bg1.jpg`…`bg6.jpg` (`09.css:800`–`805`),
   `/public/app/img/ajax_loader.gif` (`09.css:1186`), and the two split-gutter PNGs
   (`09.css:1241`–`1242`, inline base64 — those two *are* fully present). The six jpegs and the
   loader gif are references only; a rebuild has no source art for them.
5. **`02.css` truncated closing brace.** The decoded file ends at
   `02.css:1577` `  .hidden-print { display: none !important; }` followed by a bare `}` —
   the final `@media print` block's brace. Verified by byte-dump of the file tail; the file is
   complete, the line count just makes the last rule look orphaned. **Not a real gap.**
6. **Bootstrap's exact minor version is not stated anywhere in the capture.** The href is
   `bootstrap.min.css` with no version query (`00-META.txt:64`), unlike Font Awesome's
   `?v=4.3.0`. I can prove it is Bootstrap 3.x from its structure (10px root font-size
   `02.css:326`, `.col-xs/sm/md/lg` grid `02.css:433`–`647`, Glyphicons `@font-face`
   `02.css:60`, `.panel`/`.well`/`.jumbotron` `02.css:1291`, `1364`, `1188`), but I will not
   assert a minor version from memory.
7. **Whether `class="dark"` is present on any node in the live DOM is not answerable from my
   files.** The `.dark` rules exist (`09.css:1195`–`1201`); whether the room was rendered with
   them applied requires `caps/00-baseline-room/nodes-*.txt`, which belongs to another agent.
   The page-wide evidence I do have (`DEFAULTS.txt:58`, `64`: background `rgba(0,0,0,0)` on
   1999/2156, colour `rgb(51,51,51)` on 1732/2156) is consistent with `.dark` being **off**,
   but only the node files can settle it. I flag this rather than assert it.
8. **The `.animated` duration conflict is a cascade fact, not a measurement.** `12.css:2` (1s)
   loads after `09.css:224` (0.5s) by sheet index, so 1s should win — but no element was
   mid-animation in the capture (`DEFAULTS.txt:91`–`92`), so I could not confirm it from a
   computed value. Treat 1s as the reasoned reading, unverified against a rendered node.
9. **No second frame.** As established in §6, the dump contains zero temporal change across
   3.414 s. There is no evidence in this dump about how chat rows enter, how alerts animate in,
   or how the typing indicator (`09.css:2555`, height 16px) behaves. That is a genuine gap;
   it must not be invented.

---

## Verification

Every file in my assignment, with its line count, read end to end in this agent's own context —
no delegation, no sub-agents, no sampling.

| File | Lines | Read |
|---|---|---|
| `00-META.txt` | 76 | ✅ full, lines 1–76 in one read |
| `02-MANIFEST.txt` | 25 | ✅ full, lines 1–25 in one read |
| `01-stylesheets/00.css` | 2 | ✅ full |
| `01-stylesheets/01.css` | 2 | ✅ full |
| `01-stylesheets/02.css` | 1577 | ✅ full — read as 1–400, 400–800, 800–1200, 1200–1577; file tail byte-verified |
| `01-stylesheets/03.css` | 2 | ✅ full (CORS-BLOCKED marker) |
| `01-stylesheets/04.css` | 49 | ✅ full (incl. both 11k-char base64 lines) |
| `01-stylesheets/05.css` | 4 | ✅ full |
| `01-stylesheets/06.css` | 32 | ✅ full |
| `01-stylesheets/07.css` | 2 | ✅ full (CORS-BLOCKED marker) |
| `01-stylesheets/08.css` | 27 | ✅ full |
| `01-stylesheets/09.css` | 2574 | ✅ full — lines 1–1272 read directly (4 reads); lines 1273–2574 proven byte-identical to 2–1272 by `diff`, with the only 3 divergences (`2319`, `2543`–`2574`) read directly. Every distinct line in the file has been read. |
| `01-stylesheets/10.css` | 557 | ✅ full — 1–120 and 121–557 |
| `01-stylesheets/11.css` | 136 | ✅ full |
| `01-stylesheets/12.css` | 790 | ✅ full — 1–400 and 400–790 |
| `01-stylesheets/13.css` | 4 | ✅ full |
| `01-stylesheets/14.css` | 1 | ✅ full |
| `caps/00-baseline-room/DEFAULTS.txt` | 100 | ✅ full (4 preamble lines + column header + 95 property rows) |
| `caps/19-forced-darkTheme/INFO.txt` | 12 | ✅ full |
| `caps/19-forced-darkTheme/DEFAULTS.txt` | 100 | ✅ full (diffed against baseline) |
| `caps/19-forced-darkTheme/nodes-000.txt` | 5 | ✅ full |
| `caps/19-forced-darkTheme/IDENTICAL-TO-BASELINE.txt` | 2157 | ✅ header + tail read; **path lines recounted programmatically** |
| `caps/19-forced-darkTheme/NODES-REMOVED-VS-BASELINE.txt` | 2 | ✅ full |
| `caps/20-forced-lightTheme/INFO.txt` | 12 | ✅ full |
| `caps/20-forced-lightTheme/DEFAULTS.txt` | 100 | ✅ full (diffed against baseline) |
| `caps/20-forced-lightTheme/nodes-000.txt` | 5 | ✅ full |
| `caps/20-forced-lightTheme/IDENTICAL-TO-BASELINE.txt` | 2157 | ✅ header + tail read; **path lines recounted programmatically** |
| `caps/20-forced-lightTheme/NODES-REMOVED-VS-BASELINE.txt` | 2 | ✅ full |
| `caps/21-final-room/INFO.txt` | 12 | ✅ full |
| `caps/21-final-room/DEFAULTS.txt` | 100 | ✅ full (diffed against baseline) |
| `caps/21-final-room/IDENTICAL-TO-BASELINE.txt` | 2158 | ✅ header + tail read; **path lines recounted programmatically** |
| `caps/21-final-room/NODES-REMOVED-VS-BASELINE.txt` | 2 | ✅ full |

**Total: 5,752 stylesheet lines + 101 metadata/manifest lines + 6,922 capture-file lines.**

### Independently recomputed diff counts

I did not take INFO.txt's numbers on faith. Recount method: `tail -n +3 <IDENTICAL> | grep -c .`
(skip the 1 header + 1 blank line, count non-empty path lines), plus a `diff` of each
capture's `DEFAULTS.txt` against the baseline's.

| Capture | INFO.txt claims | My recount of IDENTICAL paths | nodes differing (from nodes-*.txt) | removed | DEFAULTS.txt vs baseline |
|---|---|---|---|---|---|
| 19 forced-darkTheme | 2155/2156 identical, 1 differing, 0 removed | **2155** ✔ | **1** — `#0 path=r <body>`, single `attr class` change ✔ | **0** ✔ | identical except capture label on line 1 |
| 20 forced-lightTheme | 2155/2156 identical, 1 differing, 0 removed | **2155** ✔ | **1** — `#0 path=r <body>`, single `attr class` change ✔ | **0** ✔ | identical except capture label on line 1 |
| 21 final-room | 2156/2156 identical, 0 differing, 0 removed | **2156** ✔ (and the list includes root path `r`, absent from 19/20 — the exact node that differed there) | **0** — no nodes file exists (`02-MANIFEST.txt:25` `nodeFiles=0`) ✔ | **0** ✔ | identical except capture label on line 1 |

**All three INFO.txt figures are confirmed.** 2155 + 1 = 2156 for both theme captures;
2156 + 0 = 2156 for final-room.

### Additional recomputations reported above

- `var(--` occurrences across all 15 sheets: **0**. Custom-property definitions: **0**.
- `darkTheme|lightTheme` matches across all 15 sheets: **0**.
- `theme` (case-insensitive) across all 15 sheets: **1** (`09.css:2565 .dark-theme-badge-id`).
- `09.css`: 2,573 non-header lines, **1,224 distinct** — the two-copy structure proven by
  `diff <(sed -n '2,1272p') <(sed -n '1273,2574p')` returning exactly 3 hunks.
- Sheet totals from `00-META.txt:62`–`76`: **4,498 rules, 434,385 bytes** of CSS text.
- `!important` count in `09.css` copy A: **299**.
- `@media` census: 20 distinct query strings across all sheets (§3.5).

### Not read (correctly — owned by other agents)

`caps/00-baseline-room/nodes-*.txt` (18 files), and every `caps/01`…`caps/18` subtree capture.
I did not open them, and no claim above depends on their contents. Where a question could only
be answered from them (§8 item 7 — is `class="dark"` actually on any node), I said so rather
than guessing.
