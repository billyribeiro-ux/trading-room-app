# ptr1 · P22 — Settings tab, **ADVANCED / CLUSTER settings rows**

> **Piece:** `ptr1-P22-settings-advanced-cluster.md`
> **Capture:** `/tmp/ptr-decode/ptr1/caps/00-baseline-room/` — `INFO.txt`, `DEFAULTS.txt`, `nodes-000.txt` … `nodes-017.txt`
> (capture index 0, label `baseline-room`, ts `2026-07-24T15:59:18.276Z`, kind `fullDom`,
> node count **2156** declared / **2156** emitted, `truncated=false`, viewport `1842×1265 @dpr 2`,
> `themeClass="footer-hidden"`, `cssVars={"root":{},"body":{}}` — `INFO.txt:1-9`).
> **Page:** the Manage Room admin page, room 3625.
> **Decode method:** all 18 `nodes-*.txt` files parsed into 2156 records (0 missing, 0 duplicate).
> 1201 records live under `r.0.1.1.0.1.3.1.5`; **225** of them are the advanced block, plus the
> **7 introducer/wrapper nodes** documented in §3.

---

## 1. Purpose

This piece is the **"DON'T TOUCH" advanced block** of the Manage Room "Settings" tab: the media-cluster
plumbing (clusterID / backup / super-cluster / MediaMTX), bitrate and keyframe knobs, repeater
(relay-server) lists with their live add/remove console, alternate-JS-bundle overrides, custom CSS /
dark theme, cross-room alert & recording links, and the mobile-app switches. It is collapsed behind an
`ng-show="donttouchShow"` toggle driven by clicking the word **TOUCH** in the heading, and is
`display: none` in this capture.

---

## 2. Path anchor and exact record count

| | |
|---|---|
| **Anchor** | `r.0.1.1.0.1.3.1.5.0.4.0` (`#451`, `<div class="form-group m0">`) |
| **Records under the anchor (anchor included)** | **225** |
| **Records strictly below the anchor** | 224 |
| **Direct group-children of the anchor ("rows")** | **62** (group indices `0` … `61`, contiguous, none absent) |
| **x-editable fields in this piece** | **49** |
| **Non-field structural group-children** | **15** (indices 3, 4, 5, 8, 10, 17, 19, 20, 21, 24, 29, 30, 40, 41, 49) |
| **Extra nodes decoded here** (`r.0.1.1.0.1.3.1.5`, `…5.0`, `…5.0.1`, `…5.0.2`, `…5.0.2.0`, `…5.0.3`, `…5.0.4`) | **7** |

Located by **`path` prefix**, never by `#index`. Reproduce with:

```
cd /tmp/ptr-decode/ptr1/caps/00-baseline-room
awk -v RS='' -v ORS='\n\n' '/path=r\.0\.1\.1\.0\.1\.3\.1\.5\.0\.4\.0\./' nodes-*.txt
```

---

## 3. The other direct children of `r.0.1.1.0.1.3.1.5` — decoded here

`r.0.1.1.0.1.3.1.5` (`#102`, the pane) has exactly **one** child, `.0` (`#146`). `#146` has **five**
children: `.0` is the general block (**P21**), `.1`–`.4` are the introducers for *this* piece.
Content sourced from anchors `r.0.1.1.0.1.3.1.5`, `…5.0`, `…5.0.1`, `…5.0.2`, `…5.0.2.0`, `…5.0.3`,
`…5.0.4` and `…5.0.4.0`.

| `#index` | path | tag | attributes (verbatim) | own text (verbatim) | rect |
|---|---|---|---|---|---|
| `#102` | `r.0.1.1.0.1.3.1.5` | `div` | `class="tab-pane ng-scope"`, `ng-repeat="tab in tabs"`, `ng-class="{active: tab.active}"`, `tab-content-transclude="tab"` | — | `0×0` |
| `#146` | `r.0.1.1.0.1.3.1.5.0` | `div` | `class="form-vertical ng-scope"` | — | `0×0` |
| `#186` | `r.0.1.1.0.1.3.1.5.0.0` | `div` | `class="form-group m0"` | — | `0×0` → **P21** |
| `#187` | `r.0.1.1.0.1.3.1.5.0.1` | `hr` | *(none)* | — | `0×0` |
| `#188` | `r.0.1.1.0.1.3.1.5.0.2` | `h3` | *(none)* | `DON'T  These below unless you know what you are doing...` | `0×0` |
| `#450` | `r.0.1.1.0.1.3.1.5.0.2.0` | `span` | `ng-click="donttouchShow=!donttouchShow"` | `TOUCH` | `0×0` |
| `#189` | `r.0.1.1.0.1.3.1.5.0.3` | `p` | `ng-hide="donttouchShow"` | `Settings...` | `0×0` |
| `#190` | `r.0.1.1.0.1.3.1.5.0.4` | `div` | `class="form-vertical ng-hide"`, `ng-show="donttouchShow"` | — | `0×0` |
| `#451` | `r.0.1.1.0.1.3.1.5.0.4.0` | `div` | `class="form-group m0"` | — | `0×0` → **this piece's anchor** |

**How the heading actually renders.** `#188`'s own text is `"DON'T  These below unless you know what
you are doing..."` — a *concatenation of its two direct text nodes*, with the `<span>` sitting in the
two-space gap. The rendered heading is therefore:

> ### DON'T TOUCH These below unless you know what you are doing...

**The `<span>` carries no visual distinction whatsoever.** `#450`'s only style deviations are
`display: inline; font-size: 24px; font-weight: 500; line-height: 26.4px` — i.e. exactly the `h3`'s own
typography, inherited. `text-decoration-line` resolves to the COMMON `none`, `color` to the COMMON
`rgb(51, 51, 51)`, and `cursor` to the COMMON `auto`. So "TOUCH" is **visually identical to the
surrounding heading text** while being the only clickable thing in it. Do **not** render it underlined,
coloured or with a pointer cursor — that would not match. The `<span>` (`#450`) is the toggle: clicking
it flips `donttouchShow`. In this capture `donttouchShow`
is falsy — `#189` (`ng-hide="donttouchShow"`) has **no** `ng-hide` class and computes `display: block`
(so `"Settings..."` is the visible collapsed state), while `#190` (`ng-show="donttouchShow"`) carries
`ng-hide` and computes `display: none`. Note `#190` is a **second** `div.form-vertical`, nested inside
`#146` which is already `form-vertical`.

`#189`'s text is literally `"Settings..."` — that is the entire collapsed-state copy; there is no
button or chevron.

---

## 4. Geometry — honest statement

**No layout geometry is available for any node in this piece.** Two independent `display: none`
ancestors apply: the pane `#102` (inactive 6th tab, the nav `<li>` at group index 5 with anchor text
"Settings", `#136`, is the only non-`active` one) **and** the collapse wrapper `#190`
(`ng-show="donttouchShow"`, falsy). Every one of the 225 records reports `rect: x=0 y=0 w=0 h=0`.
That is expected, not a capture gap. **No dimension is asserted anywhere in this document.**

---

## 5. The row template — verified against all 62 group-children

Census of the child-shapes of the 62 group-children:

| count | row element | child sequence |
|---|---|---|
| 24 | `p.form-control-static` | `label.col-sm-2` , `a.editable` *(no `<br>`, no helper)* |
| 19 | `p.form-control-static` | `label.col-sm-2` , `a.editable` , `br` , `label.muted` |
| 6 | `hr` | *(none)* |
| 4 | `p` *(no class)* | *(none — spacer or bare paragraph text)* |
| 2 | `div` *(no class)* | `button.btn` |
| 2 | `br` | *(none)* |
| 1 | `p.form-control-static` | `label` , `a` , `br` , `br` , `label` , `a` , `br` , `label.muted` — **two fields in one row** (row 2) |
| 1 | `p.form-control-static` | `label` , `a` , `br` , `label.muted` , `br` , `br` , `label` , `a` , `br` , `label.muted` — **two fields in one row** (row 6) |
| 1 | `p.form-control-static` | `label` , `a` , `br` , `label.muted` , `br` , `button.btn` (row 18) |
| 1 | `div.ng-hide` | `hr` , `br` , `input` , `button.btn` , `br` , `input` , `button.btn` , `br` (row 19) |
| 1 | `p` *(no class)* | `label.col-sm-2` , `a.editable` , `br` , `label.muted` (row 47 — quad in a class-less `<p>`) |
| **62** | | |

So the rigid quad holds for **19 of 62** rows here (plus row 47's class-less variant); the dominant
shape in this block is the **two-part** `label` + `a` with no helper (24 rows), and **two rows pack two
fields each**. Attribute census over the 224 records below the anchor: `href` 49, `onaftersave` 49,
`editable-checkbox` 18 + `editable-textarea` 23 + `editable-text` 7 + `editable-number` 1 = 49,
`e-title` 25, `e-label` 24 (49 = 25 + 24 — every editable here has exactly one of the two).

**Helper delivery in this piece:** 24 fields use a `label.muted`; **6 fields** take their helper from a
**bare text node on the row `<p>`** (rows 0, 1, 50, 51, 52, 58); **19 fields have no helper at all**.
There are **zero** class-less helper `<label>`s in P22 (all 73 `<label>`s here are 49
`col-sm-2 control-label` + 24 `muted`).

---

## 6. THE FIELD TABLE — all 49 fields, DOM order

Value column is the *rendered* text of the editable `<a>`. Unset text/textarea/number fields render the
literal italic word **`empty`**; unset checkboxes render **`No`**; set checkboxes render **`Yes!`**.


| # | Row idx | `#index` | Label (verbatim) | `editable-*` type | Bound expression | `onaftersave` (verbatim) | `e-label` / `e-title` | Captured value | `editable-empty` class | Helper text (verbatim) | Helper node | Row `ng-show` |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | #1357 | Use v3? (DON'T!) | `editable-checkbox` | `sess.useV3` | `saveSessField('useV3')` | `e-title="Use v3?"` | `Yes!` | no | (DON'T TURN THIS ON, If PTR did not clear you for v3!! it will not work....) — contains `<span style="text-decoration: underline">Use v3? (DON'T!)</span>` (#1356), `<span style="text-decoration: underline">Yes!</span>` (#1357) | bare text node on the row <p> | — |
| 2 | 1 | #1359 | Use v5? (DON'T!) | `editable-checkbox` | `sess.useV5` | `saveSessField('useV5')` | `e-title="Use v5?"` | `No` | no | (DON'T TURN THIS ON, If PTR did not clear you for v5!! it will not work....) — contains `<span style="text-decoration: underline">Use v5? (DON'T!)</span>` (#1358), `<span style="text-decoration: underline">No</span>` (#1359) | bare text node on the row <p> | — |
| 3 | 2 | #1361 | ClusterID | `editable-text` | `sess.clusterID` | `saveSessField('clusterID')` | `e-label="Server"` | `empty` | **yes** | *(none in capture)* | — | — |
| 4 | 2 | #1365 | Backup ClusterID | `editable-text` | `sess.backupClusterID` | `saveSessField('backupClusterID')` | `e-label="Server"` | `empty` | **yes** | (In case the main clusterID is down, this is the backup, soft reset required for changes to take effect) | label.muted | — |
| 5 | 6 | #1371 | Super ClusterID | `editable-text` | `sess.superClusterID` | `saveSessField('superClusterID')` | `e-label="Server"` | `empty` | **yes** | (Super cluster, if this is set, we will use the new supercluster scaling logic to scale the session across the super cluster) | label.muted | — |
| 6 | 6 | #1377 | Super Cluster Expected Server Count | `editable-number` | `sess.superClusterExpectedServerCount` | `saveSessField('superClusterExpectedServerCount')` | `e-label="Expected Server Count"` | `0` | **yes** | (Expected number of servers needed to handle the session) | label.muted | — |
| 7 | 7 | #1381 | Use FFmpeg for Recording (BETA) | `editable-checkbox` | `sess.useFFmpegRecording` | `saveSessField('useFFmpegRecording')` | `e-title="Use FFmpeg for Recording?"` | `No` | no | *(none in capture)* | — | — |
| 8 | 9 | #1383 | Use Less busy server algo vs round robin | `editable-checkbox` | `sess.useLessBusyVsRoundRobin` | `saveSessField('useLessBusyVsRoundRobin')` | `e-title="Use less busy?"` | `No` | no | *(none in capture)* | — | — |
| 9 | 11 | #1385 | Use MediaMTX? | `editable-checkbox` | `sess.useMediaMTX` | `saveSessField('useMediaMTX')` | `e-title="Use MediaMTX?"` | `No` | no | *(none in capture)* | — | — |
| 10 | 12 | #1387 | MediaMTX ClusterID | `editable-text` | `sess.mediaMTXClusterID` | `saveSessField('mediaMTXClusterID')` | `e-label="MediaMTX ClusterID:"` | `empty` | **yes** | *(none in capture)* | — | — |
| 11 | 13 | #1389 | Backup MediaMTX ClustterID | `editable-text` | `sess.backupMediaMTXClustterID` | `saveSessField('backupMediaMTXClustterID')` | `e-label="Backup MediaMTX ClustterID:"` | `empty` | **yes** | *(none in capture)* | — | — |
| 12 | 14 | #1391 | ScreenShare MAX BitRate | `editable-text` | `sess.media_max_bitrate` | `saveSessField('media_max_bitrate')` | `e-label="BitRate"` | `512000` | no | (i.e. 1024000,512000,254000) | label.muted | — |
| 13 | 15 | #1395 | ScreenShare KeyFrame Rate  (i.e. 5, 10, 15) | `editable-text` | `sess.media_fir_rate` | `saveSessField('media_fir_rate')` | `e-label="KeyFrameRate"` | `5` | no | (Session restart required for changes to take effect) | label.muted | — |
| 14 | 16 | #1399 | Enable FB Live/YouTube Live | `editable-checkbox` | `sess.hasYTStreaming` | `saveSessField('hasYTStreaming')` | `e-title="FB / YT Streaming?"` | `No` | no | *(none in capture)* | — | — |
| 15 | 18 | #1401 | Repeater List | `editable-textarea` | `sess.media_relays` | `saveSessField('media_relays')` | `e-title="Repeaters:"` | `empty` | **yes** | (Comma separated list op IPs IE: localhost\|127.0.0.1,somehostname\|10.10.10.10) | label.muted | — |
| 16 | 22 | #1415 | Lock Session? | `editable-checkbox` | `sess.isLocked` | `saveSessField('isLocked')` | `e-title="Lock Session?"` | `No` | no | If session is locked, nobody will be able to log in... | label.muted | — |
| 17 | 23 | #1419 | Talk URL | `editable-textarea` | `sess.chatServerURL` | `saveSessField('chatServerURL')` | `e-label="Talk URL:"` | `/talk` | no | Used to clusterize the chat server | label.muted | — |
| 18 | 25 | #1423 | Force JPG Screens | `editable-checkbox` | `sess.force_jpeg_screenshare` | `saveSessField('force_jpeg_screenshare')` | `e-title="Force JPG Screens?"` | `No` | no | *(none in capture)* | — | — |
| 19 | 26 | #1425 | Force MP3 Audio | `editable-checkbox` | `sess.force_mp3_audio` | `saveSessField('force_mp3_audio')` | `e-title="Force  MP3 Audio?"` | `No` | no | *(none in capture)* | — | — |
| 20 | 27 | #1427 | Node Repeater List | `editable-textarea` | `sess.node_media_relays` | `saveSessField('node_media_relays')` | `e-title="Node Repeaters:"` | `empty` | **yes** | (Comma separated list op IPs IE: localhost\|127.0.0.1,somehostname\|10.10.10.10) | label.muted | — |
| 21 | 28 | #1431 | Node Websocket Repeater List | `editable-textarea` | `sess.node_ws_media_relays` | `saveSessField('node_ws_media_relays')` | `e-title="Node WS Repeaters:"` | `empty` | **yes** | (Comma separated list op IPs IE: localhost\|127.0.0.1,somehostname\|10.10.10.10) | label.muted | — |
| 22 | 31 | #1435 | Alt VendorJS | `editable-textarea` | `sess.altCodeVendorJS` | `saveSessField('altCodeVendorJS')` | `e-title="VendorJS name:"` | `empty` | **yes** | (name if alt vendorJS. ie. 'vendor2.min.js' | label.muted | — |
| 23 | 32 | #1439 | Alt AppJS | `editable-textarea` | `sess.altCodeAppJS` | `saveSessField('altCodeAppJS')` | `e-title="AppJS name:"` | `empty` | **yes** | (name if alt vendorJS. ie. 'app2.min.js' | label.muted | — |
| 24 | 33 | #1443 | Alt JanusJS | `editable-textarea` | `sess.customJanus` | `saveSessField('customJanus')` | `e-title="customJanus:"` | `empty` | **yes** | (name if alt janusJS. ie. 'janus4.js' | label.muted | — |
| 25 | 34 | #1447 | Alt Room.js | `editable-textarea` | `sess.alt_roomjs` | `saveSessField('alt_roomjs')` | `e-title="Alr RoomJS:"` | `empty` | **yes** | (name if alt Room.js. ie. 'RoomRemoteRec.js' | label.muted | — |
| 26 | 35 | #1451 | Alert filter list for mods: | `editable-textarea` | `sess.modAlertFilterList` | `saveSessField('modAlertFilterList')` | `e-label="Nick   Filter:"` | `empty` | **yes** | i.e. [{"username":"John","avatar":"john@example.com"}] | label.muted | — |
| 27 | 36 | #1455 | Custom CSS | `editable-textarea` | `sess.customCSS` | `saveSessField('customCSS')` | `e-label="customCSS:"` | `empty` | **yes** | Custom CSS to custimize colors, etc... | label.muted | — |
| 28 | 37 | #1459 | Dark Theme Style | `editable-textarea` | `sess.darkThemeStyle` | `saveSessField('darkThemeStyle')` | `e-label="Dark Theme Style:"` | `empty` | **yes** | Dark theme style to custimize colors. | label.muted | — |
| 29 | 38 | #1463 | Hide Logo | `editable-checkbox` | `sess.hideLogo` | `saveSessField('hideLogo')` | `e-title="Hide Logo?"` | `No` | no | *(none in capture)* | — | — |
| 30 | 39 | #1465 | Hide Powered By | `editable-checkbox` | `sess.hidePoweredBy` | `saveSessField('hidePoweredBy')` | `e-title="Hide Powered By?"` | `No` | no | *(none in capture)* | — | — |
| 31 | 42 | #1467 | Linked Rooms for alerts | `editable-textarea` | `sess.linkedRoomAlerts` | `saveSessField('linkedRoomAlerts')` | `e-label="Linked Rooms:"` | `empty` | **yes** | Comma (,) separated list of Room IDs of the rooms to PUSH our alerts to | label.muted | — |
| 32 | 43 | #1471 | Linked Rooms for Swing Alerts | `editable-textarea` | `sess.linkedRoomSwingAlerts` | `saveSessField('linkedRoomSwingAlerts')` | `e-label="Linked Rooms:"` | `empty` | **yes** | Comma (,) separated list of Room IDs of the rooms to PUSH our swing alerts to | label.muted | — |
| 33 | 44 | #1475 | SessionID to load swing alerts from | `editable-textarea` | `sess.linkedRoomSwingAlertsOther` | `saveSessField('linkedRoomSwingAlertsOther')` | `e-label="Linked Rooms:"` | `empty` | **yes** | Session ID to load swing alerts from | label.muted | — |
| 34 | 45 | #1479 | Linked Rooms for Day Trade Alerts | `editable-textarea` | `sess.linkedRoomDayTradeAlerts` | `saveSessField('linkedRoomDayTradeAlerts')` | `e-label="Linked Rooms:"` | `empty` | **yes** | Comma (,) separated list of Room IDs of the rooms to PUSH our day trade alerts to | label.muted | — |
| 35 | 46 | #1483 | SessionID to load day trade alerts from | `editable-textarea` | `sess.linkedRoomDayTradeAlertsOther` | `saveSessField('linkedRoomDayTradeAlertsOther')` | `e-label="Linked Rooms:"` | `empty` | **yes** | Session ID to load day trade alerts from | label.muted | — |
| 36 | 47 | #1487 | Linked Rooms for Recordings | `editable-textarea` | `sess.linkedRoomRecordings` | `saveSessField('linkedRoomRecordings')` | `e-label="Linked Rooms:"` | `empty` | **yes** | Comma (,) separated list of Session IDs of the rooms to load recordings from | label.muted | — |
| 37 | 48 | #1491 | Other Room API Secret: | `editable-textarea` | `sess.linkedStreamsAPIKey` | `saveSessField('linkedStreamsAPIKey')` | `e-label="Linked Room Key:"` | `empty` | **yes** | *(none in capture)* | — | — |
| 38 | 50 | #1493 | Enable PTR app? | `editable-checkbox` | `sess.ptrMobileAppEnabled` | `saveSessField('ptrMobileAppEnabled')` | `e-title="Enable PTR app?"` | `No` | no | (DON'T USE this for ST) — contains `<span style="text-decoration: underline">Enable PTR app?</span>` (#1492), `<span style="text-decoration: underline">No</span>` (#1493) | bare text node on the row <p> | — |
| 39 | 51 | #1495 | App for Free trials? | `editable-checkbox` | `sess.freeTrialsGetApp` | `saveSessField('freeTrialsGetApp')` | `e-title="App for Free trials?"` | `No` | no | Also enable the app for free trials? — contains `<span style="text-decoration: underline">App for Free trials?</span>` (#1494), `<span style="text-decoration: underline">No</span>` (#1495) | bare text node on the row <p> | — |
| 40 | 52 | #1497 | Custom App? | `editable-checkbox` | `sess.customMobileAppEnabled` | `saveSessField('customMobileAppEnabled')` | `e-title="Enable Custom app?"` | `No` | no | (DON'T USE unless you have a custom app) — contains `<span style="text-decoration: underline">Custom App?</span>` (#1496), `<span style="text-decoration: underline">No</span>` (#1497) | bare text node on the row <p> | — |
| 41 | 53 | #1499 | Custom app String | `editable-textarea` | `sess.customMobileAppV3Name` | `saveSessField('customMobileAppV3Name')` | `e-label="Custom app string:"` | `empty` | **yes** | *(none in capture)* | — | — |
| 42 | 54 | #1501 | Custom iOS App URL | `editable-textarea` | `sess.customMobileAppIOSUrl` | `saveSessField('customMobileAppIOSUrl')` | `e-label="Custom iOS App URL:"` | `empty` | **yes** | *(none in capture)* | — | — |
| 43 | 55 | #1503 | Custom Android App URL | `editable-textarea` | `sess.customMobileAppAndroidUrl` | `saveSessField('customMobileAppAndroidUrl')` | `e-label="Custom Android App URL:"` | `empty` | **yes** | *(none in capture)* | — | — |
| 44 | 56 | #1505 | Custom App launch Word | `editable-textarea` | `sess.customMobileAppLaunchWord` | `saveSessField('customMobileAppLaunchWord')` | `e-label="Custom Launch Word:"` | `empty` | **yes** | *(none in capture)* | — | — |
| 45 | 57 | #1507 | Hide Mobile Credentials? | `editable-checkbox` | `sess.hideMobileCredentials` | `saveSessField('hideMobileCredentials')` | `e-title="Hide Mobile Credentials?"` | `No` | no | If enabled, it will hide mobile credentials | label.muted | — |
| 46 | 58 | #1511 | App for Some Members? | `editable-checkbox` | `sess.ptrMobileAppCaseByCaseEnabled` | `saveSessField('ptrMobileAppCaseByCaseEnabled')` | `e-title="Enable PTR app only for some?"` | `No` | no | Note above needs to ALSO be on (enable ptr app) — contains `<span style="text-decoration: underline">App for Some Members?</span>` (#1510), `<span style="text-decoration: underline">No</span>` (#1511) | bare text node on the row <p> | — |
| 47 | 59 | #1513 | NQ News URL | `editable-textarea` | `sess.nqNewsFeedURL` | `saveSessField('nqNewsFeedURL')` | `e-label="NQ News URL:"` | `empty` | **yes** | *(none in capture)* | — | — |
| 48 | 60 | #1515 | Random UDP port fix? | `editable-checkbox` | `sess.generateRandomUDPPort` | `saveSessField('generateRandomUDPPort')` | `e-title="Random UDP port fix ?"` | `No` | no | *(none in capture)* | — | — |
| 49 | 61 | #1517 | Streaming Threads? | `editable-checkbox` | `sess.streamingThreads` | `saveSessField('streamingThreads')` | `e-title="Streaming Threads ?"` | `No` | no | *(none in capture)* | — | — |


### 6.1 The 15 non-field structural group-children

| Group index | `#index` | tag | class / attrs | own text (verbatim) | children | role |
|---|---|---|---|---|---|---|
| 3 | `#1231` | `div` | *(none)* | *(none)* | `button#1368` | **`.btn.btn-primary.btn-link`**, `ng-click="swapCLusterIDs()"`, text **"Swap ClusterIDs (Backup <--> Main)"** |
| 4 | `#1232` | `div` | *(none)* | *(none)* | `button#1369` | **`.btn.btn-danger.btn-sm`**, `ng-click="applyToAllSessions()"`, text **"Apply clusterID/backupID to all sessions"** |
| 5 | `#1233` | `p` | *(none)* | *(none)* | *(none)* | empty spacer; only deviation `margin-bottom: 10px` |
| 8 | `#1236` | `br` | — | — | *(none)* | spacer after `useFFmpegRecording` |
| 10 | `#1238` | `hr` | — | — | *(none)* | section rule before the MediaMTX block |
| 17 | `#1245` | `br` | — | — | *(none)* | spacer after `hasYTStreaming` |
| 19 | `#1247` | `div` | `ng-show="showAdServer"` `class="ng-hide"` | *(none)* | `hr#1406`, `br#1407`, `input#1408`, `button#1409`, `br#1410`, `input#1411`, `button#1412`, `br#1413` | the **live repeater console**, see §6.2 |
| 20 | `#1248` | `p` | *(none)* | *(none)* | *(none)* | empty spacer |
| 21 | `#1249` | `hr` | — | — | *(none)* | section rule before `isLocked` |
| 24 | `#1252` | `hr` | — | — | *(none)* | section rule before the force-codec block |
| 29 | `#1257` | `hr` | — | — | *(none)* | section rule before the alt-bundle block |
| 30 | `#1258` | `p` | *(none)* | **"These  vars allow to server altertaive code version for this room"** *(two spaces after "These"; "server" and "altertaive" are shipped typos)* | *(none)* | section intro paragraph |
| 40 | `#1268` | `hr` | — | — | *(none)* | section rule before the linked-rooms block |
| 41 | `#1269` | `p` | *(none)* | **"For pushing alerts and streams to other rooms, you can use the following settings. You need the other rooms ID and the API Secret of the other room to do this."** | *(none)* | section intro paragraph |
| 49 | `#1277` | `hr` | — | — | *(none)* | section rule before the mobile-app block |

### 6.2 The repeater console and the "Apply server / repeaters to entire account?" button

Requested explicitly — anchor `r.0.1.1.0.1.3.1.5.0.4.0.18` and `…0.4.0.19`.

**Row 18** (`#1246`, `p.form-control-static`) is `sess.media_relays` ("Repeater List") **plus** the
apply-to-account button:

| `.n` | `#index` | node | detail |
|---|---|---|---|
| `.0` | `#1400` | `label.col-sm-2.control-label` | "Repeater List" |
| `.1` | `#1401` | `a` | `onaftersave="saveSessField('media_relays')"`, `editable-textarea="sess.media_relays"`, `e-title="Repeaters:"`, `class="… editable-empty"`, text `empty` |
| `.2` | `#1402` | `br` | |
| `.3` | `#1403` | `label.muted` | **`ng-click="showAdServer=true;"`** — text "(Comma separated list op IPs IE: localhost\|127.0.0.1,somehostname\|10.10.10.10)". Clicking the *helper text* is what reveals the console. |
| `.4` | `#1404` | `br` | |
| `.5` | `#1405` | `button` | `ng-show="showAdServer"`, `class="btn btn-warning ng-hide"`, `ng-click="applyRepeaterToAccount()"`, text **"Apply  server / repeaters to entire account?"** *(two spaces between "Apply" and "server" — verbatim)*. Computes `display: none` in this capture. |

`#1405` resolved style: `display: none; padding: 6px 12px; border: 1px solid rgb(238, 162, 54);
border-radius: 4px; background-color: rgb(240, 173, 78); color: rgb(255, 255, 255);
font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif; text-align: center;
white-space: nowrap; vertical-align: middle; cursor: pointer; user-select: none;`

**Row 19** (`#1247`, `div` `ng-show="showAdServer"` `class="ng-hide"`, `display: none`) is the console:

| `.n` | `#index` | node | detail |
|---|---|---|---|
| `.0` | `#1406` | `hr` | |
| `.1` | `#1407` | `br` | |
| `.2` | `#1408` | `input` | `type="text"` `id="addServerTxt"` — **no class**, so it renders as a raw UA input: `display: inline-block; padding: 1px 2px; border: 2px inset rgb(118, 118, 118); background-color: rgb(255, 255, 255); overflow: clip; cursor: text;` |
| `.3` | `#1409` | `button.btn.btn-inverse` | `ng-click="addLiveServer()"`, text **"Add Server"**; `border: 1px solid rgb(54, 63, 69)`, `background-color: rgb(54, 63, 69)`, `color: rgb(255, 255, 255)`, `border-radius: 4px`, `padding: 6px 12px` |
| `.4` | `#1410` | `br` | |
| `.5` | `#1411` | `input` | `type="text"` `id="removeServerTxt"` — same raw-input style as `#1408` |
| `.6` | `#1412` | `button.btn.btn-inverse` | `ng-click="removeLiveServer()"`, text **"Remove Server"** |
| `.7` | `#1413` | `br` | |

Note the paths carry the DOM id: `r.0.1.1.0.1.3.1.5.0.4.0.19.2#addServerTxt` and
`…0.4.0.19.5#removeServerTxt` (the only id-bearing paths in this piece).

### 6.3 The two double-field rows

**Row 2** (`#1230`) packs `clusterID` and `backupClusterID` with a *single* trailing helper:
`.0` label "ClusterID" → `.1` `a` `sess.clusterID` → `.2` `br` → `.3` `br` → `.4` label
"Backup ClusterID" → `.5` `a` `sess.backupClusterID` → `.6` `br` → `.7` `label.muted`
"(In case the main clusterID is down, this is the backup, soft reset required for changes to take effect)".
The helper belongs to the **backup** field; `clusterID` has **no** helper.

**Row 6** (`#1234`) packs `superClusterID` (helper `.3`) and `superClusterExpectedServerCount`
(helper `.9`), separated by `.4`+`.5` double `<br>`.

### 6.4 Conditionally-hidden nodes (`ng-show`) in this piece

| Node | path | `ng-show` | class at capture | computed |
|---|---|---|---|---|
| `#190` | `r.0.1.1.0.1.3.1.5.0.4` | `donttouchShow` | `form-vertical ng-hide` | `display: none` |
| `#1247` | `…0.4.0.19` | `showAdServer` | `ng-hide` | `display: none` |
| `#1405` | `…0.4.0.18.5` | `showAdServer` | `btn btn-warning ng-hide` | `display: none` |

Both `donttouchShow` and `showAdServer` are plain view-state flags (not `sess.*` fields) and are falsy
at capture time.

---

## 7. Set-vs-unset summary — my own independent recount

Counted mechanically over the 49 editable `<a>` nodes under `r.0.1.1.0.1.3.1.5.0.4.0.`:

| `editable-*` type | count in **P22** |
|---|---|
| `editable-textarea` | **23** |
| `editable-checkbox` | **18** |
| `editable-text` | **7** |
| `editable-number` | **1** |
| `editable-select` | **0** |
| **total** | **49** |

Together with P21 (123/61/26/4 = 214) the Settings tab holds **263** editables
(141 checkbox + 84 textarea + 33 text + 5 number). Independent raw-grep cross-check over the whole dump
(`grep -ho 'attr editable-[a-z]* = ' nodes-*.txt | sort | uniq -c`) → 141 checkbox, 84 textarea,
35 text, 5 number, 1 select, 2 date, 1 combodate for the entire 2156-node page; the 2 extra `text`, the
`select`, the 2 `date` and the `combodate` are **outside** the Settings tab.
**This does not match the prior-work figure of "181 fields (102 checkbox, 42 textarea, 33 text,
4 number)"** — only its `text` count (33) coincides with the tab-wide total.

### 7.1 Set/unset

Criterion, straight from the DOM: checkbox → **set** iff text is `Yes!`; value fields → **set** iff the
`<a>` does **not** carry `editable-empty`.

| | count |
|---|---|
| **SET** | **4** |
| UNSET | 45 |
| — of which `editable-empty` class present | 28 |
| — of which checkbox rendering `No` | 17 |

`18 checkbox = 1 "Yes!" + 17 "No"`; `31 value fields = 3 set + 28 editable-empty`.

**The complete list of SET fields in P22:**

| Row | `#index` | Label | Bound | Type | **Captured value** |
|---|---|---|---|---|---|
| 0 | `#1357` | Use v3? (DON'T!) | `sess.useV3` | checkbox | **`Yes!`** |
| 14 | `#1391` | ScreenShare MAX BitRate | `sess.media_max_bitrate` | text | **`512000`** |
| 15 | `#1395` | ScreenShare KeyFrame Rate  (i.e. 5, 10, 15) | `sess.media_fir_rate` | text | **`5`** |
| 23 | `#1419` | Talk URL | `sess.chatServerURL` | textarea | **`/talk`** |

Tab-wide that is **18 set** fields (14 in P21 + 4 here), not the 15 prior work reported.

**The `editable-empty` + non-`empty` oddity** occurs once here: `#1377`
(`r.0.1.1.0.1.3.1.5.0.4.0.6.7`, `sess.superClusterExpectedServerCount`, `editable-number`) carries
`class="… editable-empty"` **and** renders the text `0`. Because `.editable-empty` also applies
`font-style: italic`, that `0` renders **italic**. Counted as UNSET above. (Same pattern as `#604` in P21.)

---

## 8. Node table — all 225 records of this piece

Path column is relative to the anchor `r.0.1.1.0.1.3.1.5.0.4.0` (`.` = the anchor itself).
"self `display:none`" = the record's own deviation list contains `display: none` (everything here is
hidden anyway by two `display:none` ancestors, `#102` and `#190`).


| `#index` | path (relative to anchor) | tag | class attr | rect | self `display:none` |
|---|---|---|---|---|---|
| #451 | `.` | `div` | `form-group m0` | 0×0 @ (0,0) | — |
| #1228 | `0` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1229 | `1` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1230 | `2` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1231 | `3` | `div` | — | 0×0 @ (0,0) | — |
| #1232 | `4` | `div` | — | 0×0 @ (0,0) | — |
| #1233 | `5` | `p` | — | 0×0 @ (0,0) | — |
| #1234 | `6` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1235 | `7` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1236 | `8` | `br` | — | 0×0 @ (0,0) | — |
| #1237 | `9` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1238 | `10` | `hr` | — | 0×0 @ (0,0) | — |
| #1239 | `11` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1240 | `12` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1241 | `13` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1242 | `14` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1243 | `15` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1244 | `16` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1245 | `17` | `br` | — | 0×0 @ (0,0) | — |
| #1246 | `18` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1247 | `19` | `div` | `ng-hide` | 0×0 @ (0,0) | YES |
| #1248 | `20` | `p` | — | 0×0 @ (0,0) | — |
| #1249 | `21` | `hr` | — | 0×0 @ (0,0) | — |
| #1250 | `22` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1251 | `23` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1252 | `24` | `hr` | — | 0×0 @ (0,0) | — |
| #1253 | `25` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1254 | `26` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1255 | `27` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1256 | `28` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1257 | `29` | `hr` | — | 0×0 @ (0,0) | — |
| #1258 | `30` | `p` | — | 0×0 @ (0,0) | — |
| #1259 | `31` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1260 | `32` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1261 | `33` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1262 | `34` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1263 | `35` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1264 | `36` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1265 | `37` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1266 | `38` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1267 | `39` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1268 | `40` | `hr` | — | 0×0 @ (0,0) | — |
| #1269 | `41` | `p` | — | 0×0 @ (0,0) | — |
| #1270 | `42` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1271 | `43` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1272 | `44` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1273 | `45` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1274 | `46` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1275 | `47` | `p` | — | 0×0 @ (0,0) | — |
| #1276 | `48` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1277 | `49` | `hr` | — | 0×0 @ (0,0) | — |
| #1278 | `50` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1279 | `51` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1280 | `52` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1281 | `53` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1282 | `54` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1283 | `55` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1284 | `56` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1285 | `57` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1286 | `58` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1287 | `59` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1288 | `60` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1289 | `61` | `p` | `form-control-static` | 0×0 @ (0,0) | — |
| #1356 | `0.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1357 | `0.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1358 | `1.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1359 | `1.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1360 | `2.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1361 | `2.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1362 | `2.2` | `br` | — | 0×0 @ (0,0) | — |
| #1363 | `2.3` | `br` | — | 0×0 @ (0,0) | — |
| #1364 | `2.4` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1365 | `2.5` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1366 | `2.6` | `br` | — | 0×0 @ (0,0) | — |
| #1367 | `2.7` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1368 | `3.0` | `button` | `btn btn-primary btn-link` | 0×0 @ (0,0) | — |
| #1369 | `4.0` | `button` | `btn btn-danger btn-sm` | 0×0 @ (0,0) | — |
| #1370 | `6.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1371 | `6.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1372 | `6.2` | `br` | — | 0×0 @ (0,0) | — |
| #1373 | `6.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1374 | `6.4` | `br` | — | 0×0 @ (0,0) | — |
| #1375 | `6.5` | `br` | — | 0×0 @ (0,0) | — |
| #1376 | `6.6` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1377 | `6.7` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1378 | `6.8` | `br` | — | 0×0 @ (0,0) | — |
| #1379 | `6.9` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1380 | `7.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1381 | `7.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1382 | `9.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1383 | `9.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1384 | `11.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1385 | `11.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1386 | `12.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1387 | `12.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1388 | `13.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1389 | `13.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1390 | `14.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1391 | `14.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1392 | `14.2` | `br` | — | 0×0 @ (0,0) | — |
| #1393 | `14.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1394 | `15.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1395 | `15.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1396 | `15.2` | `br` | — | 0×0 @ (0,0) | — |
| #1397 | `15.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1398 | `16.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1399 | `16.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1400 | `18.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1401 | `18.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1402 | `18.2` | `br` | — | 0×0 @ (0,0) | — |
| #1403 | `18.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1404 | `18.4` | `br` | — | 0×0 @ (0,0) | — |
| #1405 | `18.5` | `button` | `btn btn-warning ng-hide` | 0×0 @ (0,0) | YES |
| #1406 | `19.0` | `hr` | — | 0×0 @ (0,0) | — |
| #1407 | `19.1` | `br` | — | 0×0 @ (0,0) | — |
| #1408 | `19.2#addServerTxt` | `input` | — | 0×0 @ (0,0) | — |
| #1409 | `19.3` | `button` | `btn btn-inverse` | 0×0 @ (0,0) | — |
| #1410 | `19.4` | `br` | — | 0×0 @ (0,0) | — |
| #1411 | `19.5#removeServerTxt` | `input` | — | 0×0 @ (0,0) | — |
| #1412 | `19.6` | `button` | `btn btn-inverse` | 0×0 @ (0,0) | — |
| #1413 | `19.7` | `br` | — | 0×0 @ (0,0) | — |
| #1414 | `22.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1415 | `22.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1416 | `22.2` | `br` | — | 0×0 @ (0,0) | — |
| #1417 | `22.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1418 | `23.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1419 | `23.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1420 | `23.2` | `br` | — | 0×0 @ (0,0) | — |
| #1421 | `23.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1422 | `25.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1423 | `25.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1424 | `26.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1425 | `26.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1426 | `27.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1427 | `27.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1428 | `27.2` | `br` | — | 0×0 @ (0,0) | — |
| #1429 | `27.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1430 | `28.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1431 | `28.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1432 | `28.2` | `br` | — | 0×0 @ (0,0) | — |
| #1433 | `28.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1434 | `31.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1435 | `31.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1436 | `31.2` | `br` | — | 0×0 @ (0,0) | — |
| #1437 | `31.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1438 | `32.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1439 | `32.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1440 | `32.2` | `br` | — | 0×0 @ (0,0) | — |
| #1441 | `32.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1442 | `33.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1443 | `33.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1444 | `33.2` | `br` | — | 0×0 @ (0,0) | — |
| #1445 | `33.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1446 | `34.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1447 | `34.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1448 | `34.2` | `br` | — | 0×0 @ (0,0) | — |
| #1449 | `34.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1450 | `35.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1451 | `35.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1452 | `35.2` | `br` | — | 0×0 @ (0,0) | — |
| #1453 | `35.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1454 | `36.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1455 | `36.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1456 | `36.2` | `br` | — | 0×0 @ (0,0) | — |
| #1457 | `36.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1458 | `37.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1459 | `37.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1460 | `37.2` | `br` | — | 0×0 @ (0,0) | — |
| #1461 | `37.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1462 | `38.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1463 | `38.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1464 | `39.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1465 | `39.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1466 | `42.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1467 | `42.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1468 | `42.2` | `br` | — | 0×0 @ (0,0) | — |
| #1469 | `42.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1470 | `43.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1471 | `43.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1472 | `43.2` | `br` | — | 0×0 @ (0,0) | — |
| #1473 | `43.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1474 | `44.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1475 | `44.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1476 | `44.2` | `br` | — | 0×0 @ (0,0) | — |
| #1477 | `44.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1478 | `45.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1479 | `45.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1480 | `45.2` | `br` | — | 0×0 @ (0,0) | — |
| #1481 | `45.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1482 | `46.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1483 | `46.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1484 | `46.2` | `br` | — | 0×0 @ (0,0) | — |
| #1485 | `46.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1486 | `47.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1487 | `47.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1488 | `47.2` | `br` | — | 0×0 @ (0,0) | — |
| #1489 | `47.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1490 | `48.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1491 | `48.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1492 | `50.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1493 | `50.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1494 | `51.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1495 | `51.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1496 | `52.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1497 | `52.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1498 | `53.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1499 | `53.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1500 | `54.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1501 | `54.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1502 | `55.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1503 | `55.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1504 | `56.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1505 | `56.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1506 | `57.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1507 | `57.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1508 | `57.2` | `br` | — | 0×0 @ (0,0) | — |
| #1509 | `57.3` | `label` | `muted` | 0×0 @ (0,0) | — |
| #1510 | `58.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1511 | `58.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1512 | `59.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1513 | `59.1` | `a` | `ng-scope ng-binding editable editable-click editable-empty` | 0×0 @ (0,0) | — |
| #1514 | `60.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1515 | `60.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |
| #1516 | `61.0` | `label` | `col-sm-2 control-label` | 0×0 @ (0,0) | — |
| #1517 | `61.1` | `a` | `ng-scope ng-binding editable editable-click` | 0×0 @ (0,0) | — |


### 8.1 Node table — the 6 introducer / wrapper nodes

| `#index` | path | tag | class | rect | self `display:none` |
|---|---|---|---|---|---|
| `#102` | `r.0.1.1.0.1.3.1.5` | `div` | `tab-pane ng-scope` | `0×0 @ (0,0)` | **YES** |
| `#146` | `r.0.1.1.0.1.3.1.5.0` | `div` | `form-vertical ng-scope` | `0×0 @ (0,0)` | — |
| `#187` | `r.0.1.1.0.1.3.1.5.0.1` | `hr` | — | `0×0 @ (0,0)` | — |
| `#188` | `r.0.1.1.0.1.3.1.5.0.2` | `h3` | — | `0×0 @ (0,0)` | — |
| `#450` | `r.0.1.1.0.1.3.1.5.0.2.0` | `span` | — | `0×0 @ (0,0)` | — |
| `#189` | `r.0.1.1.0.1.3.1.5.0.3` | `p` | — | `0×0 @ (0,0)` | — |
| `#190` | `r.0.1.1.0.1.3.1.5.0.4` | `div` | `form-vertical ng-hide` | `0×0 @ (0,0)` | **YES** |

---

## 9. Resolved computed style — ABSOLUTE values

`DEFAULTS.txt` is the COMMON table; node records print only deviations. Every value below is the
**resolved absolute** value = COMMON overridden by that node's deviations.

### 9.1 The row archetypes


| property | `label.col-sm-2.control-label` (#1360) | `a.editable.editable-click` — value SET (#1419) | `a.editable…editable-empty` (#1361) | `label.muted` helper (#1367) | `p.form-control-static` row (#1230) | `p` no class (#1258) | `hr` (#1238) | `br` (#1236) |
|---|---|---|---|---|---|---|---|---|
| `display` | `block` | `inline` | `inline` | `inline-block` | `block` | `block` | `block` | `inline` |
| `float` | `left` | `none` | `none` | `none` | `none` | `none` | `none` | `none` |
| `position` | `relative` | `static` | `static` | `static` | `static` | `static` | `static` | `static` |
| `width` | `16.6667%` | `auto` | `auto` | `auto` | `auto` | `auto` | `auto` | `auto` |
| `max-width` | `100%` | `none` | `none` | `100%` | `none` | `none` | `none` | `none` |
| `min-height` | `1px` | `0px` | `0px` | `0px` | `34px` | `0px` | `0px` | `0px` |
| `margin-top` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `20px` | `0px` |
| `margin-right` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `auto` | `0px` |
| `margin-bottom` | `5px` | `0px` | `0px` | `5px` | `0px` | `10px` | `20px` | `0px` |
| `margin-left` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `auto` | `0px` |
| `padding-top` | `0px` | `0px` | `0px` | `0px` | `7px` | `0px` | `0px` | `0px` |
| `padding-right` | `15px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| `padding-bottom` | `0px` | `0px` | `0px` | `0px` | `7px` | `0px` | `0px` | `0px` |
| `padding-left` | `15px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| `border-top-width` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `1px` | `0px` |
| `border-right-width` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| `border-bottom-width` | `0px` | `1px` | `1px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| `border-left-width` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| `border-top-style` | `none` | `none` | `none` | `none` | `none` | `none` | `solid` | `none` |
| `border-right-style` | `none` | `none` | `none` | `none` | `none` | `none` | `none` | `none` |
| `border-bottom-style` | `none` | `dashed` | `dashed` | `none` | `none` | `none` | `none` | `none` |
| `border-left-style` | `none` | `none` | `none` | `none` | `none` | `none` | `none` | `none` |
| `border-top-color` | `rgb(51, 51, 51)` | `rgb(10, 10, 10)` | `rgb(10, 10, 10)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(238, 238, 238)` | `rgb(51, 51, 51)` |
| `border-right-color` | `rgb(51, 51, 51)` | `rgb(10, 10, 10)` | `rgb(10, 10, 10)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(128, 128, 128)` | `rgb(51, 51, 51)` |
| `border-bottom-color` | `rgb(51, 51, 51)` | `rgb(66, 139, 202)` | `rgb(66, 139, 202)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(128, 128, 128)` | `rgb(51, 51, 51)` |
| `border-left-color` | `rgb(51, 51, 51)` | `rgb(10, 10, 10)` | `rgb(10, 10, 10)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(128, 128, 128)` | `rgb(51, 51, 51)` |
| `background-color` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` |
| `color` | `rgb(51, 51, 51)` | `rgb(10, 10, 10)` | `rgb(10, 10, 10)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(128, 128, 128)` | `rgb(51, 51, 51)` |
| `font-family` | `"Helvetica Neue", Helvetica, Arial, sans-serif` | `"Helvetica Neue", Helvetica, Arial, sans-serif` | `"Helvetica Neue", Helvetica, Arial, sans-serif` | `"Helvetica Neue", Helvetica, Arial, sans-serif` | `"Helvetica Neue", Helvetica, Arial, sans-serif` | `"Helvetica Neue", Helvetica, Arial, sans-serif` | `"Helvetica Neue", Helvetica, Arial, sans-serif` | `"Helvetica Neue", Helvetica, Arial, sans-serif` |
| `font-size` | `14px` | `14px` | `14px` | `14px` | `14px` | `14px` | `14px` | `14px` |
| `font-weight` | `700` | `400` | `400` | `700` | `400` | `400` | `400` | `400` |
| `font-style` | `normal` | `normal` | `italic` | `normal` | `normal` | `normal` | `normal` | `normal` |
| `line-height` | `20px` | `20px` | `20px` | `20px` | `20px` | `20px` | `20px` | `20px` |
| `text-align` | `start` | `start` | `start` | `start` | `start` | `start` | `start` | `start` |
| `text-decoration-line` | `none` | `none` | `none` | `none` | `none` | `none` | `none` | `none` |
| `vertical-align` | `baseline` | `baseline` | `baseline` | `baseline` | `baseline` | `baseline` | `baseline` | `baseline` |
| `white-space` | `normal` | `normal` | `normal` | `normal` | `normal` | `normal` | `normal` | `normal` |
| `box-sizing` | `border-box` | `border-box` | `border-box` | `border-box` | `border-box` | `border-box` | `content-box` | `border-box` |
| `cursor` | `default` | `pointer` | `pointer` | `default` | `auto` | `auto` | `auto` | `auto` |
| `user-select` | `auto` | `auto` | `auto` | `auto` | `auto` | `auto` | `auto` | `auto` |
| `opacity` | `1` | `1` | `1` | `1` | `1` | `1` | `1` | `1` |
| `visibility` | `visible` | `visible` | `visible` | `visible` | `visible` | `visible` | `visible` | `visible` |



Verification of the prior-work claim: the x-editable link is **`color: rgb(10, 10, 10)`** with
**`border-bottom: 1px dashed rgb(66, 139, 202)`**, and **`font-style: italic` only when
`.editable-empty` is present** — **CONFIRMED**, byte-for-byte identical to P21. The three non-bottom
border colours resolve to `rgb(10, 10, 10)` but with `0px`/`none`, so only the bottom edge paints.

Uniformity: grouping all 1201 Settings-tab records by `(tag, class, full deviation list)` yields only
**34 distinct signatures**. P22's archetypes are the *same objects* as P21's — 49 `label.col-sm-2` here
are part of the 264 tab-wide, all identical; 24 `label.muted` here are part of the 136 tab-wide, all
identical; 21 set + 28 empty editables here are part of the 149 + 114 tab-wide, all identical.

### 9.2 The introducer / wrapper nodes


| property | `hr` #187 | `h3` #188 | `span` TOUCH #450 | `p` #189 "Settings..." | `div.form-vertical.ng-hide` #190 | `div.form-group.m0` #451 | `div.form-vertical.ng-scope` #146 | `div.tab-pane.ng-scope` #102 |
|---|---|---|---|---|---|---|---|---|
| `display` | `block` | `block` | `inline` | `block` | `none` | `block` | `block` | `none` |
| `float` | `none` | `none` | `none` | `none` | `none` | `none` | `none` | `none` |
| `position` | `static` | `static` | `static` | `static` | `static` | `static` | `static` | `static` |
| `width` | `auto` | `auto` | `auto` | `auto` | `auto` | `auto` | `auto` | `auto` |
| `max-width` | `none` | `none` | `none` | `none` | `none` | `none` | `none` | `none` |
| `min-height` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| `margin-top` | `20px` | `20px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| `margin-right` | `auto` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| `margin-bottom` | `20px` | `10px` | `0px` | `10px` | `0px` | `0px` | `0px` | `0px` |
| `margin-left` | `auto` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| `padding-top` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| `padding-right` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| `padding-bottom` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| `padding-left` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| `border-top-width` | `1px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| `border-right-width` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| `border-bottom-width` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| `border-left-width` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| `border-top-style` | `solid` | `none` | `none` | `none` | `none` | `none` | `none` | `none` |
| `border-right-style` | `none` | `none` | `none` | `none` | `none` | `none` | `none` | `none` |
| `border-bottom-style` | `none` | `none` | `none` | `none` | `none` | `none` | `none` | `none` |
| `border-left-style` | `none` | `none` | `none` | `none` | `none` | `none` | `none` | `none` |
| `border-top-color` | `rgb(238, 238, 238)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` |
| `border-right-color` | `rgb(128, 128, 128)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` |
| `border-bottom-color` | `rgb(128, 128, 128)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` |
| `border-left-color` | `rgb(128, 128, 128)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` |
| `background-color` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` |
| `color` | `rgb(128, 128, 128)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` | `rgb(51, 51, 51)` |
| `font-family` | `"Helvetica Neue", Helvetica, Arial, sans-serif` | `"Helvetica Neue", Helvetica, Arial, sans-serif` | `"Helvetica Neue", Helvetica, Arial, sans-serif` | `"Helvetica Neue", Helvetica, Arial, sans-serif` | `"Helvetica Neue", Helvetica, Arial, sans-serif` | `"Helvetica Neue", Helvetica, Arial, sans-serif` | `"Helvetica Neue", Helvetica, Arial, sans-serif` | `"Helvetica Neue", Helvetica, Arial, sans-serif` |
| `font-size` | `14px` | `24px` | `24px` | `14px` | `14px` | `14px` | `14px` | `14px` |
| `font-weight` | `400` | `500` | `500` | `400` | `400` | `400` | `400` | `400` |
| `font-style` | `normal` | `normal` | `normal` | `normal` | `normal` | `normal` | `normal` | `normal` |
| `line-height` | `20px` | `26.4px` | `26.4px` | `20px` | `20px` | `20px` | `20px` | `20px` |
| `text-align` | `start` | `start` | `start` | `start` | `start` | `start` | `start` | `start` |
| `text-decoration-line` | `none` | `none` | `none` | `none` | `none` | `none` | `none` | `none` |
| `vertical-align` | `baseline` | `baseline` | `baseline` | `baseline` | `baseline` | `baseline` | `baseline` | `baseline` |
| `white-space` | `normal` | `normal` | `normal` | `normal` | `normal` | `normal` | `normal` | `normal` |
| `box-sizing` | `content-box` | `border-box` | `border-box` | `border-box` | `border-box` | `border-box` | `border-box` | `border-box` |
| `cursor` | `auto` | `auto` | `auto` | `auto` | `auto` | `auto` | `auto` | `auto` |
| `user-select` | `auto` | `auto` | `auto` | `auto` | `auto` | `auto` | `auto` | `auto` |
| `opacity` | `1` | `1` | `1` | `1` | `1` | `1` | `1` | `1` |
| `visibility` | `visible` | `visible` | `visible` | `visible` | `visible` | `visible` | `visible` | `visible` |



### 9.3 Buttons and inputs in this piece

| node | resolved style (absolute) |
|---|---|
| `button.btn.btn-primary.btn-link` `#1368` "Swap ClusterIDs (Backup <--> Main)" | `display: inline-block; padding: 6px 12px; border-width: 0; border-style: none; border-color: rgb(51, 122, 183); border-radius: 0; background-color: rgba(0, 0, 0, 0); color: rgb(51, 122, 183); font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif; text-align: center; white-space: nowrap; vertical-align: middle; box-shadow: rgb(0, 0, 0) 0px 0px 0px 0px; cursor: pointer; user-select: none;` |
| `button.btn.btn-danger.btn-sm` `#1369` "Apply clusterID/backupID to all sessions" | `display: inline-block; padding: 5px 10px; border: 1px solid rgb(212, 63, 58); border-radius: 3px; background-color: rgb(217, 83, 79); color: rgb(255, 255, 255); font-size: 12px; line-height: 18px; text-align: center; white-space: nowrap; vertical-align: middle; cursor: pointer; user-select: none;` |
| `button.btn.btn-warning.ng-hide` `#1405` "Apply  server / repeaters to entire account?" | `display: none; padding: 6px 12px; border: 1px solid rgb(238, 162, 54); border-radius: 4px; background-color: rgb(240, 173, 78); color: rgb(255, 255, 255); font-size: 14px; line-height: 20px; text-align: center; white-space: nowrap; vertical-align: middle; cursor: pointer; user-select: none;` |
| `button.btn.btn-inverse` `#1409` "Add Server" / `#1412` "Remove Server" | `display: inline-block; padding: 6px 12px; border: 1px solid rgb(54, 63, 69); border-radius: 4px; background-color: rgb(54, 63, 69); color: rgb(255, 255, 255); font-size: 14px; line-height: 20px; text-align: center; white-space: nowrap; vertical-align: middle; cursor: pointer; user-select: none;` |
| `input#addServerTxt` `#1408` / `input#removeServerTxt` `#1411` (class-less) | `display: inline-block; padding: 1px 2px; border: 2px inset rgb(118, 118, 118); border-radius: 0; background-color: rgb(255, 255, 255); color: rgb(51, 51, 51); font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif; overflow: clip; cursor: text; appearance: none;` |
| `hr` (`#1238`, `#1249`, `#1252`, `#1257`, `#1268`, `#1277`, `#1406`, and `#187`) — all 8 identical | `box-sizing: content-box; display: block; height: 0px; margin: 20px auto; border-top: 1px solid rgb(238, 238, 238); border-right/bottom/left-color: rgb(128, 128, 128) (width 0, style none); color: rgb(128, 128, 128); overflow: hidden;` |

---

## 10. `.muted` check — VERIFIED DEAD

**Result: `.muted` is a dead class. Rendering these helper labels grey would NOT match.**

Evidence from this piece's own resolved values:

* All **24** `label.muted` nodes under this anchor share the single deviation list
  `display: inline-block; max-width: 100%; margin-bottom: 5px; font-weight: 700; cursor: default`
  — **no `color` entry**, so `color` resolves to the COMMON **`rgb(51, 51, 51)`** (`DEFAULTS.txt:64`),
  identical to body text and identical to the bold `label.col-sm-2.control-label` beside it.
* Tab-wide the same holds for all 136 `label.muted`, and the 43 class-less helper `<label>`s in P21
  resolve to *exactly* the same absolute style — `.muted` contributes nothing at all.
* Beyond colour: helper text here is **`font-weight: 700` (bold)**, `font-size: 14px`,
  `line-height: 20px`, `display: inline-block`, `margin-bottom: 5px`, `cursor: default`.

One related dead class in P21 for the record: `#1355` `<i class="fa fa-gear ms-2 cursor-pointer">`
computes `cursor: default`, so `cursor-pointer` is dead there too.

---

## 11. Security review of the field list

**17 fields in P22 have names implying a secret, cluster/route identifier, private endpoint or
cross-room credential. 16 read `empty`; the 17th (`chatServerURL`) is the relative path `/talk` — no
host, no credential. No secret value is exposed by this piece.**

| # | Row | `#index` | Field | Type | **Captured value** |
|---|---|---|---|---|---|
| 1 | 2 | `#1361` | `sess.clusterID` | text | `empty` |
| 2 | 2 | `#1365` | `sess.backupClusterID` | text | `empty` |
| 3 | 6 | `#1371` | `sess.superClusterID` | text | `empty` |
| 4 | 12 | `#1387` | `sess.mediaMTXClusterID` | text | `empty` |
| 5 | 13 | `#1389` | `sess.backupMediaMTXClustterID` *(sic, "Clustter")* | text | `empty` |
| 6 | 18 | `#1401` | `sess.media_relays` *(repeater IP list)* | textarea | `empty` |
| 7 | 23 | `#1419` | `sess.chatServerURL` | textarea | **`/talk`** *(relative path)* |
| 8 | 27 | `#1427` | `sess.node_media_relays` | textarea | `empty` |
| 9 | 28 | `#1431` | `sess.node_ws_media_relays` | textarea | `empty` |
| 10 | 42 | `#1467` | `sess.linkedRoomAlerts` *(other rooms' IDs)* | textarea | `empty` |
| 11 | 43 | `#1471` | `sess.linkedRoomSwingAlerts` | textarea | `empty` |
| 12 | 44 | `#1475` | `sess.linkedRoomSwingAlertsOther` | textarea | `empty` |
| 13 | 45 | `#1479` | `sess.linkedRoomDayTradeAlerts` | textarea | `empty` |
| 14 | 46 | `#1483` | `sess.linkedRoomDayTradeAlertsOther` | textarea | `empty` |
| 15 | 47 | `#1487` | `sess.linkedRoomRecordings` | textarea | `empty` |
| 16 | 48 | `#1491` | `sess.linkedStreamsAPIKey` — label **"Other Room API Secret:"** | textarea | `empty` |
| 17 | 59 | `#1513` | `sess.nqNewsFeedURL` | textarea | `empty` |

Adjacent, non-secret but worth flagging for a rebuild:

* `sess.customCSS` (`#1455`, row 36) and `sess.darkThemeStyle` (`#1459`, row 37) — both `empty`, but
  both are **raw CSS injected into the room**, editable inline with no escaping evidenced.
* `sess.altCodeVendorJS` (`#1435`), `sess.altCodeAppJS` (`#1439`), `sess.customJanus` (`#1443`),
  `sess.alt_roomjs` (`#1447`) — all `empty`; these name **alternate JS bundles to load**, i.e. a
  script-source override surface.
* `sess.customMobileAppIOSUrl` (`#1501`), `sess.customMobileAppAndroidUrl` (`#1503`) — both `empty`.
* Destructive one-click actions with **no confirmation captured in the DOM**:
  `applyToAllSessions()` (`#1369`, applies this room's clusterIDs to **every** session),
  `applyRepeaterToAccount()` (`#1405`), `swapCLusterIDs()` (`#1368`), `addLiveServer()` /
  `removeLiveServer()` (`#1409` / `#1412`).

Combined with P21's 42 credential-shaped fields (all `empty`), the Settings tab exposes **59
secret-shaped fields, of which 58 read `empty` and one is `/talk`**. Nothing sensitive leaked into
this capture. (Prior work reported "31 read empty" — my scan finds 59 candidates on the same evidence;
the conclusion "all empty" is confirmed and strengthened.)

---

## 12. Rebuild spec

### 12.1 The block frame + one row — HTML

```html
<!-- introducers: r.0.1.1.0.1.3.1.5.0.1 .. .4 -->
<hr>
<h3>DON'T <span ng-click="donttouchShow=!donttouchShow">TOUCH</span> These below unless you know what you are doing...</h3>
<p ng-hide="donttouchShow">Settings...</p>

<div class="form-vertical ng-hide" ng-show="donttouchShow">
  <!-- the anchor: r.0.1.1.0.1.3.1.5.0.4.0  (#451) -->
  <div class="form-group m0">

    <!-- dominant shape here (24 of 62): label + editable, NO <br>, NO helper -->
    <p class="form-control-static">
      <label class="col-sm-2 control-label">Use MediaMTX?</label>
      <a href=""
         onaftersave="saveSessField('useMediaMTX')"
         editable-checkbox="sess.useMediaMTX"
         e-title="Use MediaMTX?"
         class="ng-scope ng-binding editable editable-click">No</a>
    </p>

    <!-- full quad (19 of 62) -->
    <p class="form-control-static">
      <label class="col-sm-2 control-label">ScreenShare MAX BitRate</label>
      <a href=""
         onaftersave="saveSessField('media_max_bitrate')"
         editable-text="sess.media_max_bitrate"
         e-label="BitRate"
         class="ng-scope ng-binding editable editable-click">512000</a>
      <br>
      <label class="muted">(i.e. 1024000,512000,254000)</label>
    </p>

    <!-- helper carried as a bare text node on the row <p> (6 of 62) -->
    <p class="form-control-static">
      <label class="col-sm-2 control-label">Use v3? (DON'T!)</label>
      <a href=""
         onaftersave="saveSessField('useV3')"
         editable-checkbox="sess.useV3"
         e-title="Use v3?"
         class="ng-scope ng-binding editable editable-click">Yes!</a>
      (DON'T TURN THIS ON, If PTR did not clear you for v3!! it will not work....)
    </p>

    <!-- section rule + intro paragraph -->
    <hr>
    <p>For pushing alerts and streams to other rooms, you can use the following settings. You need the other rooms ID and the API Secret of the other room to do this.</p>

  </div>
</div>
```

### 12.2 CSS (absolute values)

```css
/* wrappers */
.tab-pane                      { display: none; }            /* #102, inactive tab */
.tab-pane.active               { display: block; }
.form-vertical                 { display: block; margin: 0; padding: 0; }   /* #146, #190 */
.form-vertical.ng-hide,
.ng-hide                       { display: none; }            /* #190, #1247, #1405 */
.form-group.m0                 { display: block; margin: 0; padding: 0; }   /* #451 */

/* introducers */
hr {                                   /* #187 and the 7 <hr> inside the block */
  box-sizing: content-box;
  display: block;
  height: 0;
  margin: 20px auto;
  border: 0 none rgb(128, 128, 128);
  border-top: 1px solid rgb(238, 238, 238);
  color: rgb(128, 128, 128);
  overflow: hidden;
}
h3 {                                   /* #188 */
  display: block;
  margin: 20px 0 10px 0;
  color: rgb(51, 51, 51);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 24px;
  font-weight: 500;
  line-height: 26.4px;
}
h3 > span {                            /* #450 — the TOUCH toggle; inherits h3 typography */
  display: inline;
  font-size: 24px;
  font-weight: 500;
  line-height: 26.4px;
  cursor: auto;                        /* NOTE: no pointer cursor in the capture */
}
p {                                    /* #189, #1233, #1248, #1258, #1269, #1275 */
  display: block;
  margin: 0 0 10px 0;
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
}

/* rows — identical to P21 */
.form-control-static           { display: block; min-height: 34px; margin: 0; padding: 7px 0;
                                 box-sizing: border-box; color: rgb(51, 51, 51);
                                 font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif; }
.col-sm-2.control-label        { display: block; position: relative; float: left; width: 16.6667%;
                                 max-width: 100%; min-height: 1px; margin: 0 0 5px 0; padding: 0 15px;
                                 box-sizing: border-box; color: rgb(51, 51, 51); font-size: 14px;
                                 font-weight: 700; line-height: 20px; cursor: default; }
a.editable.editable-click      { display: inline; margin: 0; padding: 0;
                                 border: 0 none rgb(10, 10, 10);
                                 border-bottom: 1px dashed rgb(66, 139, 202);
                                 color: rgb(10, 10, 10); font: 400 14px/20px
                                 "Helvetica Neue", Helvetica, Arial, sans-serif;
                                 text-decoration-line: none; cursor: pointer; }
a.editable.editable-click.editable-empty { font-style: italic; }
br                             { display: inline; }
label.muted                    { display: inline-block; max-width: 100%; margin: 0 0 5px 0; padding: 0;
                                 color: rgb(51, 51, 51);   /* NOT grey — .muted is dead, see §10 */
                                 font-size: 14px; font-weight: 700; line-height: 20px;
                                 cursor: default; }
```

### 12.3 Field schema — data structure

```ts
type EditableType = 'text' | 'textarea' | 'checkbox' | 'number';

interface AdvancedSettingsField {
  groupIndex: number;        // position under r.0.1.1.0.1.3.1.5.0.4.0 (0..61)
  slot?: number;             // .n within the row — rows 2 and 6 hold TWO fields each
  nodeIndex: number;         // capture #index of the <a>
  label: string;             // label.col-sm-2.control-label text, verbatim
  type: EditableType;
  bind: string;              // e.g. "sess.clusterID"
  onaftersave: string;       // verbatim, e.g. "saveSessField('clusterID')"
  ePopoverTitle?: string;    // e-title (25 of 49)
  ePopoverLabel?: string;    // e-label (24 of 49)
  value: string | null;
  empty: boolean;            // .editable-empty -> italic
  helper?: string;
  helperKind: 'label.muted' | 'row-text' | 'none';   // no class-less helper labels in P22
}

/** Structural rows are NOT fields; they must still be emitted, in order. */
type StructuralRow =
  | { kind: 'hr'; groupIndex: 10 | 21 | 24 | 29 | 40 | 49 }
  | { kind: 'br'; groupIndex: 8 | 17 }
  | { kind: 'spacer-p'; groupIndex: 5 | 20 }
  | { kind: 'intro-p'; groupIndex: 30 | 41; text: string }
  | { kind: 'action-div'; groupIndex: 3 | 4; button: { class: string; ngClick: string; text: string } }
  | { kind: 'repeater-console'; groupIndex: 19; ngShow: 'showAdServer' };

const RENDER = { emptyText: 'empty', checkboxTrue: 'Yes!', checkboxFalse: 'No',
                 falsyZeroPrintsValue: true };
```

The machine-readable list of all 49 P22 fields is the table in §6, one line per field, in DOM order.

---

## 13. Upstream bugs and typos — verified in this piece

| Locator | Finding | Evidence |
|---|---|---|
| `#1447` (`r.0.1.1.0.1.3.1.5.0.4.0.34.1`) | **`e-title="Alr RoomJS:"`** — "Alr" for "Alt". Field `sess.alt_roomjs`, label "Alt Room.js". | verbatim attribute |
| `#1451` (`r.0.1.1.0.1.3.1.5.0.4.0.35.1`) | **`e-label="Nick   Filter:"`** — literally **three** spaces, and it is the wrong label entirely: the field is `sess.modAlertFilterList` ("Alert filter list for mods:"), copy-pasted from P21's `sess.nickFilter` (`#538`, `e-label="Nick Filter:"`). | verbatim attribute |
| `#1389` (row 13) | Field name typo: **`sess.backupMediaMTXClustterID`** ("Clustter"), and the label matches the typo: "Backup MediaMTX ClustterID". The `e-label` repeats it. | verbatim |
| `#1368` (row 3) | Function-name typo in the handler: `ng-click="swapCLusterIDs()"` (capital L). | verbatim |
| `#1258` (row 30) | Copy: **"These  vars allow to server altertaive code version for this room"** — double space, "server" for "serve", "altertaive" for "alternative". | verbatim |
| `#1405` (row 18 `.5`) | Copy: **"Apply  server / repeaters to entire account?"** — double space between "Apply" and "server"; a word appears to be missing (there is **no** child element in that gap, so nothing was elided by the dumper). | verbatim, node has 0 children |
| `#1437` / `#1441` / `#1445` (rows 31/32/33) | Helper copy: `"(name if alt vendorJS. ie. 'vendor2.min.js'"` — "if" for "of", and an **unclosed parenthesis** in all three; `#1441` still says "vendorJS" although the field is `altCodeAppJS`; `#1445` says "janusJS" but the field is `customJanus`. | verbatim |
| `#1425` (row 26) | `e-title="Force  MP3 Audio?"` — double space. | verbatim |
| `#1399` (row 16) | Label says "Enable FB Live/YouTube Live" but the field is `sess.hasYTStreaming` and `e-title="FB / YT Streaming?"`. | verbatim |
| `#1361` (row 2) / `#1365` / `#1371` | All three cluster fields share `e-label="Server"` — no per-field wording. | verbatim |
| row 2 (`#1230`) / row 6 (`#1234`) | Structural: two fields packed into one `<p class="form-control-static">`, separated by `<br><br>`; only the second field gets the helper in row 2. | §6.3 |
| row 47 (`#1275`) | Structural: this row's `<p>` carries **no** `form-control-static`, so it alone lacks `min-height: 34px` and `padding: 7px 0` (it computes `margin-bottom: 10px` instead). It is the only field row in P22 built that way. | style deviations of `#1275` vs `#1274` |
| `#1403` (row 18 `.3`) | UX: the click target that reveals the repeater console is a **`<label class="muted">` with `ng-click`** — no button affordance, and it resolves to `cursor: default`, so it does not even look clickable. | verbatim + resolved style |
| `#450` (`h3 > span` "TOUCH") | Same class of problem: the collapse toggle is a bare `<span>` with `ng-click` and resolved **`cursor: auto`** — no pointer, no button role, not keyboard reachable. | resolved style |

---

## 14. Honest gaps

1. **No geometry at all.** Two `display:none` ancestors (`#102` inactive tab, `#190` collapsed
   "DON'T TOUCH" wrapper); all 225 rects are `0×0`. Nothing about width/height/spacing/wrapping in this
   block can be verified from `00-baseline-room`. A pixel diff of this piece is **not possible** from
   this capture — it needs one taken with the Settings tab active *and* `donttouchShow` toggled on.
2. **No text in this piece is truncated.** The dumper's 250-character text limit bites twice in the
   Settings tab, but both cases (`#975` `sess.subscriptionPlans` helper, `#1062`
   `sess.chatTabsWithBadges` helper) are in **P21**, not here. The longest text in P22 is `#1269`
   at 159 characters — complete.
3. **Interleaving of bare text nodes is not captured.** For the 6 rows whose helper is a bare text node
   on the `<p>` (rows 0, 1, 50, 51, 52, 58) the dump records the `<p>`'s own text separately from its
   element children, so the helper's exact position relative to the label and the editable cannot be
   proven. Placing it last matches the 24 rows that use an explicit `label.muted`, but that is an
   **inference, not evidence**.
4. **Prior-work claims I could NOT reproduce, stated plainly:**
   * "181 fields (102 checkbox, 42 textarea, 33 text, 4 number)" — this anchor holds **49 (18/23/7/1)**;
     the tab holds **263 (141/84/33/5)**. See §7.
   * "only 15 set" — **4** here, **18** tab-wide. See §7.1.
   * "group indices 5/8/10/17/20/21/24/29/30 absent" — they are **present**, as `<p>`/`<br>`/`<hr>`
     structural rows (§6.1). Group indices `0…61` are contiguous with **no gaps**.
   * "rows 40/41/49 with no captured children" — **partly reproduced, with a different meaning**: in
     *this* anchor rows 40 (`#1268` `hr`), 41 (`#1269` `p` with text) and 49 (`#1277` `hr`) genuinely
     have no children — but they are `<hr>`/`<p>` section furniture, not fields with missing children.
     Prior work's phrasing implies broken field rows; there are none.
   * "31 secret-shaped fields all empty" — I count **59** secret-shaped fields tab-wide (42 in P21 +
     17 here); the "all empty" conclusion holds (58 `empty`, 1 = `/talk`). See §11.
5. **`donttouchShow` and `showAdServer` values are not captured** as data — only their *effect* (the
   `ng-hide` class) is observable. Both are falsy at capture time; nothing else about them is evidenced.
6. **Popover/edit-mode UI is not in the capture.** x-editable builds its form only on click; this is a
   static snapshot with no open editor, so the input/textarea/checkbox markup, the OK/Cancel buttons and
   how `e-label`/`e-title` are rendered are **not** evidenced.
7. **No `::before`/`::after` is recorded for any node in this piece.** The only four pseudo-elements in
   the whole Settings tab are the FontAwesome glyphs in P21 (`#1349`, `#1350`, `#1354`, `#1355`).
8. **`e-form`, `e-placement` and other x-editable options are absent** — the only `e-*` attributes here
   are `e-label` (24) and `e-title` (25). Unlike P21, every P22 editable has exactly one of the two.
