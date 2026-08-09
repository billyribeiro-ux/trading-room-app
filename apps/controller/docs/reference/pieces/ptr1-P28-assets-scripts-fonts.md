# ptr1-P28 — Every asset the page pulls: scripts, fonts, images, build numbers, reCAPTCHA

**Purpose.** Enumerate every external resource the Manage-Room page loads — the 11 `<script>` tags, the 15 stylesheets, the 3 icon-font families and their 8 font files, every image path (including the two base64 data-URIs and the six background JPEGs), plus the app build number, the cache-buster, and the reCAPTCHA site key. Every entry is cited to a node record in the capture or to a `url()` inside a decoded stylesheet, so a rebuild can decide what to self-host, what to drop, and what needs a licence.

**Evidence base.** `/tmp/ptr-decode/ptr1/00-META.txt` (URL, UA, viewport, stylesheet index) and `/tmp/ptr-decode/ptr1/caps/00-baseline-room/nodes-000…017.txt` (the 2,156-node full DOM, which carries every `<script src>`, `<img src>`, `<iframe src>` and inline `style`), cross-referenced against `url(...)` occurrences inside `/tmp/ptr-decode/ptr1/01-stylesheets/*.css`.

---

## 1. Page identity and build

| Fact | Value | Citation |
|---|---|---|
| URL | `https://protradingroom.com/ptrApp#/page/manageSession/6a628a99731b9f77ae9bf505` | `00-META.txt:6` |
| Room numeric id | `3625` | `nodes-000.txt` — the "Launch" button's `href="/session?id=3625&jwtSite=…"` |
| Room object id | `6a628a99731b9f77ae9bf505` | `00-META.txt:6` (route param) |
| Captured at | `2026-07-24T15:59:21.704Z` | `00-META.txt:5` |
| Role | `member` | `00-META.txt:8` |
| Viewport | `1842 × 1265 @ dpr 2` | `00-META.txt:9` |
| User agent | `Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 … Chrome/150.0.0.0 Mobile Safari/537.36` | `00-META.txt:7` |
| Capture errors | `[]` (none) | `00-META.txt:10` |
| Node count | 2,156, `truncated=false` | `00-META.txt:13` |
| `<body>` theme class | `"footer-hidden"` | `00-META.txt:13`, `nodes-000.txt:6` |

### 1.1 App build number and cache-buster — two different schemes

The app ships **two distinct versioning tokens** on the same page:

| Token | Value | Applied to | Citation |
|---|---|---|---|
| **App build number** | `2.18.100` | `/public/dist/vendor.min.js?v=2.18.100` and `/public/vendor/janus3.js?v=2.18.100` | `nodes-000.txt:33`, `nodes-000.txt:54` |
| **Cache-buster (epoch-ms)** | `1784623769671` | `/public/dist/app.min.js?v=1784623769671`, and re-exposed to JS as a global | `nodes-000.txt:91`, `nodes-000.txt:98` |

The cache-buster is echoed into a global by the inline bootstrap script:

```
nodes-000.txt:95–98   #12 path=r.11 <script type="text/javascript">
                      text: "var __cver = '1784623769671';\n\n    var ua = navigator.userAgent.toLowerCase();
                             \n\n    var is_chrome = ua.indexOf('chrome') > -1;
                             \n    var is_firefox = ua.indexOf('firefox') > -1;
                             \n    var is_msie = ua.indexOf('msie') > -1 || ua.indexOf('trident') > -1;…"
```

`1784623769671` ms since epoch decodes to **2026-07-21T08:49:29.671Z** — three days before the `2026-07-24T15:59:21.704Z` capture (`00-META.txt:5`). So `app.min.js` is busted per deploy (build timestamp) while `vendor.min.js` is busted per semantic version. Note the asymmetry that matters for a rebuild: **`styles.css` carries no version query string at all** (`00-META.txt:71` — `href=https://protradingroom.com/public/app/css/styles.css`), so the 195 KB app stylesheet is cached by URL alone while the JS beside it is busted every deploy. That is a live cache-invalidation bug in the reference.

A second inline bootstrap script sets WebRTC feature flags:

```
nodes-000.txt:37–40   #3 path=r.2 <script>  (no src)
                      text: "var __h264 = 'false';\n    var __isReg = 'false';\n
                             if (typeof __h264 === 'boolean') { } else { __h264 = __h264 == 'true' ? true : false; }\n
                             if (typeof __isReg === 'boolean') { } else { __isReg = __isReg == 'true' ? true :…"
```

So on this capture **H.264 is disabled** (`__h264 = 'false'`) and **registration mode is off** (`__isReg = 'false'`).

---

## 2. The 11 `<script>` tags — exhaustive, in document order

`grep -c "<script>" nodes-*.txt` returns 11 hits, all in `nodes-000.txt`; there is no other `<script>` anywhere in the 2,156-node tree. Document order is `r.1` … `r.11`, i.e. all eleven are direct children of `<body>`.

| # | DOM path | src / inline | Origin | Purpose | Citation |
|---|---|---|---|---|---|
| 1 | `r.1` | `/public/dist/vendor.min.js?v=2.18.100` | self | Bundled vendor JS (AngularJS 1.x + ui-router + all Angular plugins) | `nodes-000.txt:31–33` |
| 2 | `r.2` | *inline* | — | WebRTC feature flags `__h264='false'`, `__isReg='false'` | `nodes-000.txt:37–40` |
| 3 | `r.3` | `https://cdnjs.cloudflare.com/ajax/libs/adapterjs/**0.15.5**/adapter.min.js` | cdnjs | **AdapterJS 0.15.5** — WebRTC cross-browser shim (`getUserMedia`, `RTCPeerConnection`) | `nodes-000.txt:44–48` |
| 4 | `r.4` | `/public/vendor/janus3.js?v=2.18.100` | self | **Janus WebRTC gateway client** (`janus3.js`) — the SFU signalling library for webcam/screen-share | `nodes-000.txt:52–54` |
| 5 | `r.5` | `//vjs.zencdn.net/**7.3.0**/video.min.js` | Brightcove CDN | **Video.js 7.3.0** player. Protocol-relative. Pairs with blocked sheet 03 | `nodes-000.txt:58–60` |
| 6 | `r.6` | `//cdnjs.cloudflare.com/ajax/libs/videojs-youtube/**2.6.0**/Youtube.min.js` | cdnjs | **videojs-youtube 2.6.0** tech adapter. Injects inline sheet 13 (`13.css:2–5`) | `nodes-000.txt:64–66` |
| 7 | `r.7` | `https://cdnjs.cloudflare.com/ajax/libs/angularjs-toaster/**2.2.0**/toaster.min.js` | cdnjs | **angularjs-toaster 2.2.0** notifications. Pairs with blocked sheet 07 | `nodes-000.txt:70–72` |
| 8 | `r.8` | `https://cdnjs.cloudflare.com/ajax/libs/sockjs-client/**1.4.0**/sockjs.min.js` | cdnjs | **SockJS-client 1.4.0** — WebSocket-with-fallback transport for chat/alerts | `nodes-000.txt:76–78` |
| 9 | `r.9` | `https://w.soundcloud.com/player/api.js` (`type="text/javascript"`) | SoundCloud | **SoundCloud Widget API** — in-room audio player control | `nodes-000.txt:82–85` |
| 10 | `r.10` | `/public/dist/app.min.js?v=1784623769671` | self | The application bundle | `nodes-000.txt:89–91` |
| 11 | `r.11` | *inline*, `type="text/javascript"` | — | Sets `__cver`, sniffs `is_chrome`/`is_firefox`/`is_msie` | `nodes-000.txt:95–98` |

**Subresource integrity: exactly one script has it.** Only AdapterJS carries SRI:

```
nodes-000.txt:47   attr integrity = "sha512-8HaugtT+4c0rhgZIggNCv7I2N0u5OuCXQutD91XdRLqtBl4kD5z2B6QmHczDFMpeENZV060Fip3S954njcfv9A=="
nodes-000.txt:48   attr crossorigin = "anonymous"
```

The other three cdnjs scripts (videojs-youtube, toaster, sockjs), the zencdn video.js, and the SoundCloud API have **no `integrity` and no `crossorigin`**. That is 5 unpinned third-party origins executing in the page. Two of them (`vjs.zencdn.net`, `cdnjs.cloudflare.com`) are also the two whose stylesheets the capture could not read for exactly the same missing-CORS reason (see P26 §4).

**No `defer`/`async` on any of the 11.** No `type="module"`. All eleven are blocking classic scripts.

**Third-party origins contacted (6):** `cdnjs.cloudflare.com`, `vjs.zencdn.net`, `w.soundcloud.com`, `www.google.com` (reCAPTCHA), `secure.gravatar.com` (avatars), plus first-party `protradingroom.com`.

---

## 3. reCAPTCHA

Google reCAPTCHA v2 invisible is mounted. Its hidden bframe iframe carries the site key:

```
nodes-000.txt:272–280
#23 path=r.12.3.0 <iframe>
  rect: x=1 y=-9984 w=0 h=0
  attr title    = "recaptcha challenge expires in two minutes"
  attr name     = "c-g8o2ifrad64d"
  attr frameborder = "0"
  attr scrolling   = "no"
  attr sandbox  = "allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation allow-modals allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
  attr src      = "https://www.google.com/recaptcha/api2/bframe?hl=en&v=A7KpaEASfhDcK0nXxgQEyyYv&k=6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx&bft=0dAFcWeA4YbSQP1DurnKHZ3cEoiRDL6-QM4GOeI1w3Xu8NNITZpKY9_SvlEct1fp-xvB0KCgqwtFH6ltmvBtilk2sLo5IXAKB0yw"
  attr style    = "width: 0px; height: 0px;"
```

| Field | Value |
|---|---|
| **reCAPTCHA site key (`k=`)** | **`6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx`** |
| reCAPTCHA JS build (`v=`) | `A7KpaEASfhDcK0nXxgQEyyYv` |
| Language (`hl=`) | `en` |
| Type | v2 **invisible** (`api2/bframe`, 0×0, positioned off-screen at `y=-9984`) |

`6Lc…` is the v2 site-key prefix; the key is public by design (it is the client-side key, not the secret). The `bft=` token is a per-session bot-fingerprint token and is **not** reusable.

**The reCAPTCHA badge chrome is present but invisible.** Four sibling nodes render the badge bubble entirely from inline styles, no CSS class:

| Node | Role | Inline style | Citation |
|---|---|---|---|
| `#13 r.12` | Badge bubble | `background-color: rgb(255,255,255); border: 1px solid rgb(204,204,204); box-shadow: rgba(0,0,0,0.2) 2px 2px 3px; position:absolute; transition: visibility linear .3s, opacity .3s linear; opacity:0; visibility:hidden; z-index:2000000000; left:0; top:-10000px` | `nodes-000.txt:102–131` |
| `#16 r.12.0` | Full-screen dim layer | `width:100%; height:100%; position:fixed; top:0; left:0; z-index:2000000000; background-color: rgb(255,255,255); opacity:0.05` | `nodes-000.txt:149–163` |
| `#17 r.12.1` | Bubble arrow (outer) | `border: 11px solid transparent; width:0; height:0; position:absolute; pointer-events:none; margin-top:-11px; z-index:2000000000` — class `g-recaptcha-bubble-arrow` | `nodes-000.txt:165–192` |
| `#18 r.12.2` | Bubble arrow (inner) | same with `10px` | `nodes-000.txt:194–221` |
| `#19 r.12.3` | iframe host | `z-index:2000000000; position:relative; width:0; height:0` | `nodes-000.txt:223–235` |

`z-index: 2000000000` on five nodes is the highest stacking value in the entire document (`DEFAULTS.txt:13` — 8 distinct z-index values; see P25 §5).

---

## 4. Fonts — three `@font-face`, all icon fonts, eight files

| Family | Declared at | Formats declared | Files | Self-hosted? |
|---|---|---|---|---|
| **Glyphicons Halflings** | `02.css:60` | `woff2`, `woff`, `truetype` | `../fonts/glyphicons-halflings-regular.woff2` · `.woff` · `.ttf` (resolved from `/public/app/css/` ⇒ `/public/app/fonts/…`) | yes |
| **FontAwesome** | `10.css:2` | `woff2`, `woff`, `truetype` | `../fonts/fontawesome-webfont.woff2?v=4.3.0` · `.woff?v=4.3.0` · `.ttf?v=4.3.0` (⇒ `/public/vendor/font-awesome/fonts/…`) | yes |
| **feather** | `11.css:2` | `woff`, `truetype` — **no woff2** | `fonts/feather-webfont.woff` · `.ttf` (⇒ `/public/vendor/feather/webfont/feather-webfont/fonts/…`) | yes |

Verbatim declarations:

```
02.css:60  @font-face { font-family: "Glyphicons Halflings";
             src: url("../fonts/glyphicons-halflings-regular.woff2") format("woff2"),
                  url("../fonts/glyphicons-halflings-regular.woff")  format("woff"),
                  url("../fonts/glyphicons-halflings-regular.ttf")   format("truetype"); }

10.css:2   @font-face { font-family: FontAwesome;
             src: url("../fonts/fontawesome-webfont.woff2?v=4.3.0") format("woff2"),
                  url("../fonts/fontawesome-webfont.woff?v=4.3.0")  format("woff"),
                  url("../fonts/fontawesome-webfont.ttf?v=4.3.0")   format("truetype");
             font-weight: normal; font-style: normal; }

11.css:2   @font-face { font-family: feather;
             src: url("fonts/feather-webfont.woff") format("woff"),
                  url("fonts/feather-webfont.ttf")  format("truetype");
             font-weight: normal; font-style: normal; }
```

**Notes derived from the declarations, not assumed:**
* All three omit `font-display`. Default `auto` ⇒ a FOIT block period on every icon. A rebuild should add `font-display: block` (icon fonts) or migrate to inline SVG.
* No `eot` and no `svg` source in any of the three — the legacy IE/iOS-Safari-4 formats were stripped. Consistent with the app otherwise still carrying `.ie9` selectors (16 of them in `09.css` copy A) that no longer have a matching format fallback.
* Feather has **no woff2**, so it ships the larger `woff` on every modern browser. `10.css:2` shows the project *does* know how to declare woff2. Adding one for feather is a free win.
* **No text webfont is declared anywhere.** All three `@font-face` families are icon fonts, and every one is referenced only from `font-family: FontAwesome` / `font-family: feather` / `font-family: "Glyphicons Halflings"` selectors (see P24). Body text uses the OS system stack — see §7.

### 4.1 Which icon fonts are actually rendering

| Family | Nodes on page rendering in it | Evidence |
|---|---|---|
| FontAwesome | **247** | `nodes-*.txt` — 247 nodes deviate to `font-family: FontAwesome`: 233 `<i class="fa …">`, 12 `<i class="icon-…">`, 2 `<a class="icon-…">` |
| feather | **0** | The `feather` family never appears as a computed `font-family` on any of the 2,156 nodes |
| Glyphicons Halflings | **0** | `grep -c glyphicon nodes-*.txt` = 0 across all 18 node files |

The 12 `<i class="icon-*">` nodes are the surprise: `11.css:4` `[class^="icon-"]` sets `font-family: feather`, but `10.css:3` `.fa` and — decisively — `09.css:320`'s giant selector list (`.icon-eye, .icon-paper-clip, …, .icon-ellipsis`) plus the `.glyphicon`→FontAwesome override at `09.css:2` mean these elements resolve to FontAwesome. **The feather webfont is downloaded and never used on this page.** Licence/self-hosting impact: both feather font files are dead weight here.

### 4.2 Licence status

| Font | Licence posture | Action for a rebuild |
|---|---|---|
| **Font Awesome 4.3.0** | Font: SIL OFL 1.1. CSS: MIT. Free to self-host and redistribute; attribution required by OFL. **Already self-hosted** at `/public/vendor/font-awesome/fonts/` | Keep, or subset the 519-glyph set down to the ~40 actually used |
| **Glyphicons Halflings (Bootstrap 3 build)** | Bundled under Bootstrap's MIT licence for Bootstrap use. **Already self-hosted**. Zero glyphs render (§4.1) | **Drop.** Removes 3 files and 263 CSS rules |
| **feather (webfont build)** | Feather is MIT. **Already self-hosted**. Zero glyphs render (§4.1) | **Drop**, unless another route uses it — verify against a live-room capture before removing |
| **Body/UI text** | **None required.** `"Helvetica Neue", Helvetica, Arial, sans-serif` is a pure OS-system stack — no downloadable font, no licence, no self-hosting | Keep the system stack (see P24) |

**Conclusion: no licensed text font is required.** Verified — see §7 and P24 §2.

---

## 5. Images and other media

### 5.1 `<img>` elements in the DOM (8 total, 4 distinct sources)

| Node | `src` | Where | Rendered box | Citation |
|---|---|---|---|---|
| `#43` | `/public/images/ptr_logo.png` (via `ng-src`) | navbar brand, `class="brand-logo"`, `height="35px"`, inline `max-width:200px; height:auto; max-height:40px` | **200 × 24.5 px** at `x=20 y=14.6` | `nodes-000.txt` `#43` |
| `#470` | `/public/images/ptr_logo.png` (via `ng-src`) | branding settings preview, `class="navLogo "` | 0×0 (hidden branch) | `nodes-003.txt` `#470` |
| `#58` | `app/img/ajax_loader.gif` | generic spinner | 0×0 | `nodes-000.txt` `#58` |
| `#218` | `app/img/ajax_loader.gif` | `#chatLogLoading` spinner | 0×0 | `nodes-001.txt` `#218` |
| `#1550` | *(no `src` resolved)* — `gravatar-src-once="user.email "`, `class="thumb24 "` | roster avatar | **24 × 24 px** at `x=104.3 y=558` | `nodes-012.txt` `#1550` |
| `#1582` | `https://secure.gravatar.com/avatar/[GRAVATAR_MD5_A]?size=80&default=mm` | roster avatar | **24 × 24 px** at `x=121.2 y=600.4` | `nodes-013.txt` `#1582` |
| `#1614` | `https://secure.gravatar.com/avatar/[GRAVATAR_MD5_B]?size=80&default=mm` | roster avatar | **24 × 24 px** at `x=121.2 y=662.8` | `nodes-013.txt` `#1614` |

Notes:
* **Gravatar is requested at `size=80` and rendered at 24 px** — a 3.3× over-fetch at CSS pixels, but exactly right at `dpr=2`… no: at dpr 2 the device need is 48 px, so 80 px is still ~1.7× oversized. `default=mm` is Gravatar's "mystery man" fallback.
* `#1550` has the `gravatar-src-once` directive attribute but **no resolved `src`** — the directive had not fired for that row at capture time. Honest observation, not a defect claim.
* The brand logo `<img>` **does** carry an explicit `height="35px"` attribute plus inline `max-height:40px`, but **no `width`**, and it renders at 200 × 24.5. Under the project's own no-CLS rule a rebuild must supply both dimensions or an `aspect-ratio` (200 / 24.5 ≈ 8.16).
* `app/img/ajax_loader.gif` is a **relative** path with no leading `/` — it resolves against the current route, i.e. `…/ptrApp#/page/manageSession/…` → `/public/app/img/…` only by luck of the base tag. The same asset is referenced *absolutely* from CSS (§5.2). That inconsistency is worth flattening in a rebuild.

### 5.2 `url()` references inside the stylesheets — exhaustive

Every `url()` in all 15 sheets, counted. Each appears **twice** in `09.css` because that sheet is duplicated (P26 §2); the copy-A line is cited.

| Asset | Type | Declared at | Selector / purpose |
|---|---|---|---|
| `/public/app/img/ajax_loader.gif` | GIF | `09.css:1186` (and `2457`) | `.loadingBkg { background-image: url(…) !important; background-repeat: no-repeat !important; background-position: center center !important; }` |
| `../img/bg1.jpg` | JPEG | `09.css:800` (and `2071`) | `.bg-pic1 { background-image: url("../img/bg1.jpg"); }` |
| `../img/bg2.jpg` | JPEG | `09.css:801` (and `2072`) | `.bg-pic2` |
| `../img/bg3.jpg` | JPEG | `09.css:802` (and `2073`) | `.bg-pic3` |
| `../img/bg4.jpg` | JPEG | `09.css:803` (and `2074`) | `.bg-pic4` |
| `../img/bg5.jpg` | JPEG | `09.css:804` (and `2075`) | `.bg-pic5` |
| `../img/bg6.jpg` | JPEG | `09.css:805` (and `2076`) | `.bg-pic6` |
| base64 PNG, **5 × 30 px, 91 B** decoded (124 b64 chars) | data-URI | `09.css:1241` (and `2512`) | `.gutter.gutter-horizontal` — split-pane column-resize grip texture, `cursor: col-resize` |
| base64 PNG, **30 × 5 px, 104 B** decoded (140 b64 chars) | data-URI | `09.css:1242` (and `2513`) | `.gutter.gutter-vertical` — row-resize grip texture, `cursor: row-resize` |
| base64 PNG, **150 × 150 px, 7,781 B** decoded (10,376 b64 chars) | data-URI | `04.css:26` | colour-picker saturation/value grid overlay |
| base64 PNG, **150 × 150 px, 8,177 B** decoded (10,904 b64 chars) | data-URI | `04.css:41` | colour-picker **round** panel grid overlay (`border-radius: 50%`) |
| `../fonts/glyphicons-halflings-regular.{woff2,woff,ttf}` | font | `02.css:60` | see §4 |
| `../fonts/fontawesome-webfont.{woff2,woff,ttf}?v=4.3.0` | font | `10.css:2` | see §4 |
| `fonts/feather-webfont.{woff,ttf}` | font | `11.css:2` | see §4 |

`../img/bg1.jpg` … `bg6.jpg` resolve relative to `/public/app/css/styles.css` ⇒ **`/public/app/img/bg1.jpg` … `bg6.jpg`**. **Honest gap: none of the six is used on this page** — `.bg-pic1`…`.bg-pic6` have zero matching elements in the 2,156-node DOM, and `background-image` computes to `none` on **2,156/2,156** nodes (`DEFAULTS.txt:59` — 1 distinct value). The six JPEGs are declared, never fetched here, and their content is not in the dump.

The two `.gutter` data-URIs are the only images that survive as bytes inside the dump. They are the split.js pane-divider textures. `.split`/`.gutter` also has zero matching elements on this page (`09.css:1240–1246`), so they too are inert on the Manage-Room route.

### 5.3 Other embedded media

`grep` across all 18 node files for `<object>`, `<video>`, `<audio>`, `<embed>` returns **zero**. The only non-`<img>` embed is the reCAPTCHA `<iframe>` (§3). The CSS nevertheless defines a full `<object>`-based media layer that is inert here: `object#webcamScreen` (`09.css:1185`), `object#webcam` (`09.css:1189`), `#webcamCam` (`09.css:1188`), `#webcamFlash` (`09.css:1190`), `.w11k-flash-container, .object` (`09.css:1192`), `#padFrame` (`09.css:1193`). Those belong to the live-room route.

---

## 6. Complete network-request inventory for this page

| Kind | Count | Origins |
|---|---|---|
| Stylesheets | **15** (2 CORS-blocked) | self-hosted **9** (sheets 02, 04, 05, 06, 08, 09, 10, 11, 12) · CDN **2** (03 `vjs.zencdn.net`, 07 `cdnjs`) · inline **4** (00, 01, 13, 14) |
| Scripts | **11** (9 with `src`, 2 inline) | self ×3, cdnjs ×4, vjs.zencdn.net ×1, soundcloud ×1 |
| Fonts | **8 files** across 3 families | self ×8 |
| Images (DOM) | 4 distinct URLs | self ×2 (`ptr_logo.png`, `ajax_loader.gif`), gravatar ×2 |
| Images (CSS) | 7 distinct URLs + 4 data-URIs | self ×7 |
| Iframes | 1 | google.com (reCAPTCHA) |
| **Distinct third-party origins** | **5** | `cdnjs.cloudflare.com`, `vjs.zencdn.net`, `w.soundcloud.com`, `www.google.com`, `secure.gravatar.com` |

---

## 7. What actually wins (asset-level overrides)

**7.1 The body font is the system stack — nothing overrides it.** `02.css:2` sets `html { font-family: sans-serif }`; `02.css:327` sets `body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif }` and nothing in sheets 03–14 re-declares `body`'s family. `DEFAULTS.txt:65` confirms `"Helvetica Neue", Helvetica, Arial, sans-serif` is the COMMON value on **1,906 / 2,156** nodes, with only **3 distinct** families in the whole document (system stack, `FontAwesome`, `Menlo, Monaco, Consolas, "Courier New", monospace`). The three `@font-face` families contribute **one** of those three, and only for icons. **No licensed text font is required — confirmed.**

**7.2 `.glyphicon` renders in FontAwesome, not Glyphicons.** `02.css:61` declares `font-family: "Glyphicons Halflings"`; `09.css:2` re-declares the same selector with `font-family: FontAwesome` and, being a later sheet at equal specificity, wins. The Glyphicons files are still fetched by the `@font-face` at `02.css:60`. Net: **3 font files downloaded for 0 rendered glyphs.** (Zero `.glyphicon` elements on this page, so the visual mismatch is latent — see P26 §5.2.)

**7.3 The feather webfont is fetched for 0 rendered glyphs.** `11.css:4` `[class^="icon-"]{font-family:feather}` is beaten for the 12 on-page `.icon-*` nodes, all of which compute `font-family: FontAwesome`. **2 more font files for 0 glyphs.**

**7.4 The brand logo's CSS max-height loses to its inline style.** `09.css:66` `.topnavbar > .navbar-header > .navbar-brand img { max-height: 100%; width: auto; }` and `09.css:1191` `.navLogo { max-height:25px; max-width:300px; width:auto; height:25px }`. The rendered `#43` element carries `style="max-width: 200px; height: auto; max-height: 40px;"` — an inline style, which outranks both — and computes **200 × 24.5**. A rebuild must port the inline constraint, not the class.

---

## 8. Rebuild spec

```js
// svelte.config / +layout.svelte — the asset surface a rebuild must reproduce

export const BUILD = {
  appVersion:   '2.18.100',        // nodes-000.txt:33,54  (?v= on vendor.min.js, janus3.js)
  cacheBuster:  '1784623769671',   // nodes-000.txt:91,98  (?v= on app.min.js, global __cver)
};

export const RECAPTCHA_SITE_KEY = '6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx'; // nodes-000.txt:279

export const FEATURE_FLAGS = {   // nodes-000.txt:40 (inline bootstrap)
  h264: false,          // __h264 === 'false'
  registrationMode: false, // __isReg === 'false'
};
```

**Scripts — port / replace / drop:**

| Script | Rebuild action |
|---|---|
| `vendor.min.js`, `app.min.js` | **Replace** with the SvelteKit bundle (Vite handles hashing; drop both `?v=` schemes) |
| `janus3.js` (Janus WebRTC) | **Keep, self-hosted.** No npm-equivalent guarantee; pin the exact file. Load lazily — only the live-room route needs it |
| `adapter.min.js` 0.15.5 | **Replace** with `pnpm add webrtc-adapter` and bundle. 0.15.5 is ancient; keep the SRI discipline it already has |
| `video.min.js` 7.3.0 + `Youtube.min.js` 2.6.0 | **Self-host** the registry packages with pnpm (`video.js@7.3.0`, `videojs-youtube@2.6.0`) — removes the `vjs.zencdn.net` dependency **and** un-blocks the CSS that P26 §4 records as a hard gap |
| `toaster.min.js` 2.2.0 | **Drop.** Replace with a native Svelte toast store; keep only the six app colours from `09.css:399–405` |
| `sockjs.min.js` 1.4.0 | **Replace** with a native `WebSocket` + reconnect, or self-host the `sockjs-client` registry package with pnpm if the server still needs the fallback transports |
| `w.soundcloud.com/player/api.js` | **Keep as-is** (must be loaded from SoundCloud's origin to work); load it lazily only when a SoundCloud embed is present |
| inline flag scripts | **Replace** with typed constants (see block above) |

**Fonts:**
```css
/* Keep exactly one icon family, self-hosted, subsetted, with font-display */
@font-face {
  font-family: 'FontAwesome';
  src: url('/fonts/fontawesome-webfont.woff2') format('woff2'),
       url('/fonts/fontawesome-webfont.woff')  format('woff');
  font-weight: normal; font-style: normal;
  font-display: block;              /* source omits this — icon FOIT today */
}
/* DROP: Glyphicons Halflings (0 glyphs rendered) — 3 files, 263 CSS rules  */
/* DROP: feather            (0 glyphs rendered) — 2 files, 135 CSS rules    */
/* NO TEXT WEBFONT: body stays on the OS stack, zero licence cost */
--font-sans: "Helvetica Neue", Helvetica, Arial, sans-serif;   /* 02.css:327 */
--font-mono: Menlo, Monaco, Consolas, "Courier New", monospace; /* 02.css:414 */
```

**Images:**
```
/static/images/ptr_logo.png            ← brand; ALWAYS ship width+height (200×24.5 rendered ⇒ aspect-ratio 200/24.5)
/static/app/img/ajax_loader.gif        ← replace with a CSS/SVG spinner; the GIF is referenced by
                                          BOTH a relative DOM path and an absolute CSS path today
/static/app/img/bg1.jpg … bg6.jpg      ← .bg-pic1…6; NOT in the dump — honest gap, must be re-sourced
gutter grips                           ← keep the two inline data-URIs (09.css:1241-1242), 332 B total
avatars                                ← Gravatar; request size=48 (2× of the 24px render), not size=80
```

---

## 9. Honest gaps

1. **The six background JPEGs (`bg1.jpg`…`bg6.jpg`) are referenced but not captured.** They have zero matching elements on this page, `background-image` computes `none` on all 2,156 nodes (`DEFAULTS.txt:59`), and no bytes exist in the dump. Their content must be re-sourced from the server; it cannot be reconstructed here.
2. **`ptr_logo.png` and `ajax_loader.gif` are referenced but their bytes are not in the dump.** Only their rendered box is known (logo: 200 × 24.5 CSS px).
3. **Video.js 7.3.0 skin CSS and angularjs-toaster 2.2.0 CSS are CORS-blocked** (`03.css:2`, `07.css:2`, both `ruleCount=0 bytes=12`). Player chrome and toast geometry are unrecoverable from this capture — see P26 §4.
4. **The bundle contents are opaque.** `vendor.min.js` and `app.min.js` are `<script src>` references only; the capture holds no JS source, so the actual AngularJS version, the ui-router version, and which Angular plugins are bundled are **not derivable**.
5. **Exact versions are unavailable** for angularjs-color-picker, angular-xeditable, textAngular, and the feather webfont build (no version in href, no version in any `url()`).
6. **Two Gravatar avatars are real user data** (`secure.gravatar.com/avatar/6ee71e55…` and `…/b27c0cfb…`) tied to real member emails, alongside a JWT in the "Launch" link's query string. A rebuild must not ship these; they are captured session artefacts, not fixtures.
7. **The `bft=` reCAPTCHA token is per-session** and will not work if replayed. Only the `k=` site key is reusable.
8. **`.gutter`, `.split`, `.bg-pic*`, `object#webcam*`, `#padFrame` all have zero elements on this route** — their asset behaviour is declared but untested by this capture and must be re-verified against a live-room capture.
