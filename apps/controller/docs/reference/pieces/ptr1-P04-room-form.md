# ptr1 · P04 — Room identity form (above the tabs)

**Capture:** `/tmp/ptr-decode/ptr1/caps/00-baseline-room/` — 2,156 records, viewport 1842×1265 @dpr2
**Page:** Manage Room, room 3625

> **Every computed value in this file is the RESOLVED ABSOLUTE value** = the `DEFAULTS.txt` COMMON table overridden by that node's `style-deviations`. You do not need `DEFAULTS.txt` to read this document.

---

## 1. Purpose

This piece is the five-row identity form that sits inside `.panel-body` **above** the tab strip: an inline-editable **Room Title**, an inline-editable **Authorization Mode**, and three readonly link rows (**Room Link** / **Vanity Link** / **Unique Link**) each in a Bootstrap `.input-group` with Copy / Edit / Generate buttons. It also contains four **hidden alternates** that only appear for other room/auth modes — a webinar Date row, a Registration-Link + Event-Time + Email-Preview block, an App-Pair-Link row — plus the trailing `<br>` and the hidden "Loading…" spinner.

## 2. Path anchors and record counts

Anchor: **everything under `r.0.1.1.0.1.` EXCEPT `.3`** (the tabset, which is P05).

| anchor | records | rendering |
|---|---|---|
| `r.0.1.1.0.1.0` + descendants (`div.form-vertical`) | 72 | 46 render, 26 are `display:none` |
| `r.0.1.1.0.1.1` (`<br>`) | 1 | renders (16.5px line box) |
| `r.0.1.1.0.1.2` + descendants (loading spinner) | 3 | 0 render — `ng-show="dataLoading"` false |
| **total** | **76** | |

Parent `r.0.1.1.0.1` = `.panel-body` (`#31`, x=1 y=104 w=1840 h=696.766) — documented in P03.

## 2.1 Structure (document order)

```
<div class="form-vertical">                                              #38  …1.0     16,119,1810,170
│
├─ [ROW 1 — RENDERS] <div class="form-group m0">                         #53  …1.0.0    16,119,1810,0
│   ├── <label class="col-sm-2 control-label">Room Title</label>         #72  …1.0.0.0  16,119,301.7,20
│   └── <div class="col-sm-10">                                          #73  …1.0.0.1  317.7,119,1508.3,34
│       └── <p class="form-control-static">                              #112 …1.0.0.1.0 332.7,119,1478.3,34
│           └── <a editable-text="sess.name">Room 3625</a>               #154 …           332.7,127.5,72.6,17.5
│
├─ [HIDDEN — webinar rooms only] <div class="form-group m0 ng-hide"
│                                     ng-show="sess.roomType=='webinar'"> #54 …1.0.1
│   ├── <label class="col-sm-2 control-label">Date:</label>              #74
│   └── <div class="col-sm-10">                                          #75
│       └── <p class="form-control-static">                              #113
│           ├── <a editable-combodate="sess.webinarDate">07/23/2026 @ 05:41 PM</a>   #155
│           ├── <br>                                                     #156
│           └── <muted>(NOTE: use your local time. …)</muted>            #157
│
├─ [ROW 2 — RENDERS] <div class="form-group m0">                         #55  …1.0.2    16,119,1810,0
│   ├── <label class="col-sm-2 control-label">Authorization Mode</label> #76  …1.0.2.0  16,153,301.7,20
│   └── <div class="col-sm-10">                                          #77  …1.0.2.1  317.7,153,1508.3,34
│       └── <p class="form-control-static">                              #114 …          332.7,153,1478.3,34
│           └── <a editable-select="sess.authMode ">Open - Anyone with the room link can join with their email & name</a>   #158  332.7,161.5,411.8,17.5
│
├─ [HIDDEN — registrationA / registrationM] <div class="ng-hide"
│        ng-show="sess.authMode=='registrationA' || sess.authMode=='registrationM'">  #56 …1.0.3
│   ├── <div class="form-group m0">                                      #78
│   │   ├── <label>Registration Link:</label>                            #115
│   │   └── <div class="input-group">                                    #116
│   │       ├── <input id="webinarRegLinkTxt" readonly value="https://protradingroom.com/r/6a628a99731b9f77ae9bf505">  #159
│   │       └── <span class="input-group-btn">                           #160
│   │           └── <button onclick="copyLinkToClipboard('webinarRegLinkTxt')">Copy<i class="fa fa-copy"></i></button>  #191/#452
│   ├── <br>                                                             #79
│   ├── <div class="form-group m0">                                      #80
│   │   ├── <label>Event Time (for email template):</label>              #117
│   │   └── <div class="col-sm-10 ">                                     #118
│   │       └── <input ng-model="webinarTimeTxt" placeholder="at 7pm EST">  #161   ← NATIVE unstyled input
│   ├── <br clear="both">                                                #81
│   ├── <div class="form-group m0">                                      #82
│   │   ├── <label>Email Preview:</label>                                #119
│   │   ├── <div class="col-sm-8">                                       #120
│   │   │   ├── <pre class="ng-binding" style="height: 130px; overflow: scroll;">  #162
│   │   │   │   ├── <strong ng-show="!webinarTimeTxt">FILL TIME ABOVE</strong>     #192
│   │   │   │   └── <strong ng-show="webinarTimeTxt" class="ng-binding ng-hide">   #193
│   │   │   └── <button ng-click="sendWeminarEmailReminder(webinarTimeTxt)">Send Emails Now</button>  #163
│   │   ├── <br>                                                         #121
│   │   └── <br>                                                         #122
│   └── <br clear="both">                                                #83
│
└─ [LINK BLOCK — RENDERS] <div class="" style=""
        ng-show="sess.authMode=='webinarRoom' || sess.authMode=='open' || sess.authMode=='unamePW' || sess.allowPWLoginWithSSO">   #57  …1.0.4  16,119,1810,170
    ├── <label class="col-sm-2 control-label">Room Link:</label>         #84  …1.0.4.0  16,187,301.7,20
    ├── <div class="input-group">                                        #85  …1.0.4.1  317.7,187,1508.3,34
    │   ├── <input id="webinarLinkTxt" readonly value="https://protradingroom.com/u/6a628a99731b9f77ae9bf505">  #123  317.7,187,1432,34
    │   └── <span class="input-group-btn">                               #124  1749.7,187,76.3,34
    │       └── <button class="btn btn-info" onclick="copyLinkToClipboard('webinarLinkTxt')">Copy<i class="fa fa-copy"></i></button>  #164/#194  1748.7,187,77.3,34
    ├── <label class="col-sm-2 control-label">Vanity Link:</label>       #86  …1.0.4.2  16,221,301.7,20
    ├── <div class="input-group">                                        #87  …1.0.4.3  317.7,221,1508.3,34
    │   ├── <input id="customLinkTxt" readonly value="https://protradingroom.com/room/[yournamehere]">  #125  317.7,221,1364.7,34
    │   └── <span class="input-group-btn">                               #126  1682.4,221,143.6,34
    │       ├── <button class="btn btn-warning" ng-click="setCustomRoomURL()">Edit<i class="fa fa-edit"></i></button>   #165/#195  1681.4,221,68.3,34
    │       └── <button class="btn btn-info" onclick="copyLinkToClipboard('customLinkTxt')">Copy<i class="fa fa-copy"></i></button>  #166/#196  1748.7,221,77.3,34
    ├── <label class="col-sm-2 control-label">Unique Link:</label>       #88  …1.0.4.4  16,255,301.7,20
    ├── <div class="input-group">                                        #89  …1.0.4.5  317.7,255,1508.3,34
    │   ├── <input id="uniqueLinkTxt" readonly value="https://protradingroom.com/room/[youruniquelinkhere]">  #127  317.7,255,1332.5,34
    │   └── <span class="input-group-btn">                               #128  1650.2,255,175.8,34
    │       ├── <button class="btn btn-primary" ng-click="setUniqueRoomURL()">Generate<i class="fa fa-link"></i></button>  #167/#197  1649.2,255,100.5,34
    │       └── <button class="btn btn-info" onclick="copyLinkToClipboard('uniqueLinkTxt')">Copy<i class="fa fa-copy"></i></button>  #168/#198  1748.7,255,77.3,34
    └── [HIDDEN] <div class="ng-hide" ng-show="sess.hasAppPairLink">     #90  …1.0.4.6
        ├── <label>App Pair Link:</label>                                #129
        └── <div class="input-group">                                    #130
            ├── <input id="appPairLink" readonly value="https://protradingroom.com/room/">  #169
            └── <span class="input-group-btn">                           #170
                └── <button onclick="copyLinkToClipboard('appPairLink')">Copy<i class="fa fa-copy"></i></button>  #199/#453

<br>                                                                     #39  …1.1      16,290.5,0,16.5
<div class="div animated  fadeIn infinite ng-hide" ng-show="dataLoading"
     style="padding: 25px; text-align: center;">                         #40  …1.2      HIDDEN
├── <img src="app/img/ajax_loader.gif">                                  #58
└── <label>Loading...</label>                                            #59
```

## 2.2 Measured geometry — every number closes exactly

```
form-vertical           x=16    y=119   w=1810   h=170       (panel-body 1,104 + padding 15,15)
  row grid: 5 rows × 34px = 170                                         ✓  y 119 → 289

row y-origins           119  Room Title
                        153  Authorization Mode
                        187  Room Link
                        221  Vanity Link
                        255  Unique Link

col-sm-2  label   w = 1810 × 16.6667% = 301.664 ; x=16    ; padding 0 15px ; h=20
col-sm-10 field   w = 1810 × 83.3333% = 1508.33 ; x=317.7 ; padding 0 15px ; h=34
.input-group      w = 1810 − 301.664  = 1508.34 ; x=317.7 ; display:table  ; h=34
   (the input-group is a display:table sibling of the float, so it takes the leftover width)

<p class="form-control-static">   x=332.7 (=317.7+15) w=1478.33 (=1508.33−30) h=34, padding 7px 0
   inline <a> baseline box: y=127.5 h=17.5 (=119 + 7 padding + 1.5 half-leading)

input-group cell split (CSS table layout, right edge always 1826 = 16+1810):
  Room Link    input 1431.99 + btn-cell  76.3438 = 1508.33
  Vanity Link  input 1364.72 + btn-cell 143.617  = 1508.34
  Unique Link  input 1332.54 + btn-cell 175.797  = 1508.34

buttons (each margin-left:-1px, so they overlap the cell edge by 1px):
  Copy      x=1748.7  w=77.3438  → 1826.04
  Edit      x=1681.4  w=68.2734  → 1749.67
  Generate  x=1649.2  w=100.453  → 1749.65

trailing <br> #39: x=16 y=290.5 w=0 h=16.5  (14px font in a 20px line box: 289 + (20−16.5)/2 ≈ 290.75)
next sibling (P05 tabset) starts at y=309 = 289 + 20 (one 20px line box)     ✓
```

---

## 3–5. Node table, verbatim attributes, resolved absolute computed styles

### Node table

| # | path | tag | id | class | rect x,y,w,h | renders |
|---|---|---|---|---|---|---|
| 38 | `r.0.1.1.0.1.0` | `<div>` | — | `form-vertical` | 16, 119, 1810, 170 | YES |
| 39 | `r.0.1.1.0.1.1` | `<br>` | — | `—` | 16, 290.5, 0, 16.5 | YES |
| 40 | `r.0.1.1.0.1.2` | `<div>` | — | `div animated  fadeIn infinite ng-hide` | 0, 0, 0, 0 | NO (display:none) |
| 53 | `r.0.1.1.0.1.0.0` | `<div>` | — | `form-group m0` | 16, 119, 1810, 0 | YES |
| 54 | `r.0.1.1.0.1.0.1` | `<div>` | — | `form-group m0 ng-hide` | 0, 0, 0, 0 | NO (display:none) |
| 55 | `r.0.1.1.0.1.0.2` | `<div>` | — | `form-group m0` | 16, 119, 1810, 0 | YES |
| 56 | `r.0.1.1.0.1.0.3` | `<div>` | — | `ng-hide` | 0, 0, 0, 0 | NO (display:none) |
| 57 | `r.0.1.1.0.1.0.4` | `<div>` | — | `` | 16, 119, 1810, 170 | YES |
| 58 | `r.0.1.1.0.1.2.0` | `<img>` | — | `—` | 0, 0, 0, 0 | NO (zero rect) |
| 59 | `r.0.1.1.0.1.2.1` | `<label>` | — | `—` | 0, 0, 0, 0 | NO (zero rect) |
| 72 | `r.0.1.1.0.1.0.0.0` | `<label>` | — | `col-sm-2 control-label` | 16, 119, 301.7, 20 | YES |
| 73 | `r.0.1.1.0.1.0.0.1` | `<div>` | — | `col-sm-10` | 317.7, 119, 1508.3, 34 | YES |
| 74 | `r.0.1.1.0.1.0.1.0` | `<label>` | — | `col-sm-2 control-label` | 0, 0, 0, 0 | NO (zero rect) |
| 75 | `r.0.1.1.0.1.0.1.1` | `<div>` | — | `col-sm-10` | 0, 0, 0, 0 | NO (zero rect) |
| 76 | `r.0.1.1.0.1.0.2.0` | `<label>` | — | `col-sm-2 control-label` | 16, 153, 301.7, 20 | YES |
| 77 | `r.0.1.1.0.1.0.2.1` | `<div>` | — | `col-sm-10` | 317.7, 153, 1508.3, 34 | YES |
| 78 | `r.0.1.1.0.1.0.3.0` | `<div>` | — | `form-group m0` | 0, 0, 0, 0 | NO (zero rect) |
| 79 | `r.0.1.1.0.1.0.3.1` | `<br>` | — | `—` | 0, 0, 0, 0 | NO (zero rect) |
| 80 | `r.0.1.1.0.1.0.3.2` | `<div>` | — | `form-group m0` | 0, 0, 0, 0 | NO (zero rect) |
| 81 | `r.0.1.1.0.1.0.3.3` | `<br>` | — | `—` | 0, 0, 0, 0 | NO (zero rect) |
| 82 | `r.0.1.1.0.1.0.3.4` | `<div>` | — | `form-group m0` | 0, 0, 0, 0 | NO (zero rect) |
| 83 | `r.0.1.1.0.1.0.3.5` | `<br>` | — | `—` | 0, 0, 0, 0 | NO (zero rect) |
| 84 | `r.0.1.1.0.1.0.4.0` | `<label>` | — | `col-sm-2 control-label` | 16, 187, 301.7, 20 | YES |
| 85 | `r.0.1.1.0.1.0.4.1` | `<div>` | — | `input-group` | 317.7, 187, 1508.3, 34 | YES |
| 86 | `r.0.1.1.0.1.0.4.2` | `<label>` | — | `col-sm-2 control-label` | 16, 221, 301.7, 20 | YES |
| 87 | `r.0.1.1.0.1.0.4.3` | `<div>` | — | `input-group` | 317.7, 221, 1508.3, 34 | YES |
| 88 | `r.0.1.1.0.1.0.4.4` | `<label>` | — | `col-sm-2 control-label` | 16, 255, 301.7, 20 | YES |
| 89 | `r.0.1.1.0.1.0.4.5` | `<div>` | — | `input-group` | 317.7, 255, 1508.3, 34 | YES |
| 90 | `r.0.1.1.0.1.0.4.6` | `<div>` | — | `ng-hide` | 0, 0, 0, 0 | NO (display:none) |
| 112 | `r.0.1.1.0.1.0.0.1.0` | `<p>` | — | `form-control-static` | 332.7, 119, 1478.3, 34 | YES |
| 113 | `r.0.1.1.0.1.0.1.1.0` | `<p>` | — | `form-control-static` | 0, 0, 0, 0 | NO (zero rect) |
| 114 | `r.0.1.1.0.1.0.2.1.0` | `<p>` | — | `form-control-static` | 332.7, 153, 1478.3, 34 | YES |
| 115 | `r.0.1.1.0.1.0.3.0.0` | `<label>` | — | `col-sm-2 control-label` | 0, 0, 0, 0 | NO (zero rect) |
| 116 | `r.0.1.1.0.1.0.3.0.1` | `<div>` | — | `input-group` | 0, 0, 0, 0 | NO (zero rect) |
| 117 | `r.0.1.1.0.1.0.3.2.0` | `<label>` | — | `col-sm-2 control-label` | 0, 0, 0, 0 | NO (zero rect) |
| 118 | `r.0.1.1.0.1.0.3.2.1` | `<div>` | — | `col-sm-10 ` | 0, 0, 0, 0 | NO (zero rect) |
| 119 | `r.0.1.1.0.1.0.3.4.0` | `<label>` | — | `col-sm-2 control-label` | 0, 0, 0, 0 | NO (zero rect) |
| 120 | `r.0.1.1.0.1.0.3.4.1` | `<div>` | — | `col-sm-8` | 0, 0, 0, 0 | NO (zero rect) |
| 121 | `r.0.1.1.0.1.0.3.4.2` | `<br>` | — | `—` | 0, 0, 0, 0 | NO (zero rect) |
| 122 | `r.0.1.1.0.1.0.3.4.3` | `<br>` | — | `—` | 0, 0, 0, 0 | NO (zero rect) |
| 123 | `r.0.1.1.0.1.0.4.1.0#webinarLinkTxt` | `<input>` | webinarLinkTxt | `form-control col-md-6` | 317.7, 187, 1432, 34 | YES |
| 124 | `r.0.1.1.0.1.0.4.1.1` | `<span>` | — | `input-group-btn` | 1749.7, 187, 76.3, 34 | YES |
| 125 | `r.0.1.1.0.1.0.4.3.0#customLinkTxt` | `<input>` | customLinkTxt | `form-control col-md-6` | 317.7, 221, 1364.7, 34 | YES |
| 126 | `r.0.1.1.0.1.0.4.3.1` | `<span>` | — | `input-group-btn` | 1682.4, 221, 143.6, 34 | YES |
| 127 | `r.0.1.1.0.1.0.4.5.0#uniqueLinkTxt` | `<input>` | uniqueLinkTxt | `form-control col-md-6` | 317.7, 255, 1332.5, 34 | YES |
| 128 | `r.0.1.1.0.1.0.4.5.1` | `<span>` | — | `input-group-btn` | 1650.2, 255, 175.8, 34 | YES |
| 129 | `r.0.1.1.0.1.0.4.6.0` | `<label>` | — | `col-sm-2 control-label` | 0, 0, 0, 0 | NO (zero rect) |
| 130 | `r.0.1.1.0.1.0.4.6.1` | `<div>` | — | `input-group` | 0, 0, 0, 0 | NO (zero rect) |
| 154 | `r.0.1.1.0.1.0.0.1.0.0` | `<a>` | — | `ng-scope ng-binding editable editable-click` | 332.7, 127.5, 72.6, 17.5 | YES |
| 155 | `r.0.1.1.0.1.0.1.1.0.0` | `<a>` | — | `ng-scope ng-binding editable editable-click` | 0, 0, 0, 0 | NO (zero rect) |
| 156 | `r.0.1.1.0.1.0.1.1.0.1` | `<br>` | — | `—` | 0, 0, 0, 0 | NO (zero rect) |
| 157 | `r.0.1.1.0.1.0.1.1.0.2` | `<muted>` | — | `—` | 0, 0, 0, 0 | NO (zero rect) |
| 158 | `r.0.1.1.0.1.0.2.1.0.0` | `<a>` | — | `ng-scope ng-binding editable editable-click` | 332.7, 161.5, 411.8, 17.5 | YES |
| 159 | `r.0.1.1.0.1.0.3.0.1.0#webinarRegLinkTxt` | `<input>` | webinarRegLinkTxt | `form-control col-md-6` | 0, 0, 0, 0 | NO (zero rect) |
| 160 | `r.0.1.1.0.1.0.3.0.1.1` | `<span>` | — | `input-group-btn` | 0, 0, 0, 0 | NO (zero rect) |
| 161 | `r.0.1.1.0.1.0.3.2.1.0` | `<input>` | — | `ng-pristine ng-untouched ng-valid` | 0, 0, 0, 0 | NO (zero rect) |
| 162 | `r.0.1.1.0.1.0.3.4.1.0` | `<pre>` | — | `ng-binding` | 0, 0, 0, 0 | NO (zero rect) |
| 163 | `r.0.1.1.0.1.0.3.4.1.1` | `<button>` | — | `btn btn-default` | 0, 0, 0, 0 | NO (zero rect) |
| 164 | `r.0.1.1.0.1.0.4.1.1.0` | `<button>` | — | `btn btn-info` | 1748.7, 187, 77.3, 34 | YES |
| 165 | `r.0.1.1.0.1.0.4.3.1.0` | `<button>` | — | `btn btn-warning` | 1681.4, 221, 68.3, 34 | YES |
| 166 | `r.0.1.1.0.1.0.4.3.1.1` | `<button>` | — | `btn btn-info` | 1748.7, 221, 77.3, 34 | YES |
| 167 | `r.0.1.1.0.1.0.4.5.1.0` | `<button>` | — | `btn btn-primary` | 1649.2, 255, 100.5, 34 | YES |
| 168 | `r.0.1.1.0.1.0.4.5.1.1` | `<button>` | — | `btn btn-info` | 1748.7, 255, 77.3, 34 | YES |
| 169 | `r.0.1.1.0.1.0.4.6.1.0#appPairLink` | `<input>` | appPairLink | `form-control col-md-6` | 0, 0, 0, 0 | NO (zero rect) |
| 170 | `r.0.1.1.0.1.0.4.6.1.1` | `<span>` | — | `input-group-btn` | 0, 0, 0, 0 | NO (zero rect) |
| 191 | `r.0.1.1.0.1.0.3.0.1.1.0` | `<button>` | — | `btn btn-info` | 0, 0, 0, 0 | NO (zero rect) |
| 192 | `r.0.1.1.0.1.0.3.4.1.0.0` | `<strong>` | — | `—` | 0, 0, 0, 0 | NO (zero rect) |
| 193 | `r.0.1.1.0.1.0.3.4.1.0.1` | `<strong>` | — | `ng-binding ng-hide` | 0, 0, 0, 0 | NO (display:none) |
| 194 | `r.0.1.1.0.1.0.4.1.1.0.0` | `<i>` | — | `fa fa-copy` | 1799, 197, 14, 14 | YES |
| 195 | `r.0.1.1.0.1.0.4.3.1.0.0` | `<i>` | — | `fa fa-edit` | 1722.7, 231, 14, 14 | YES |
| 196 | `r.0.1.1.0.1.0.4.3.1.1.0` | `<i>` | — | `fa fa-copy` | 1799, 231, 14, 14 | YES |
| 197 | `r.0.1.1.0.1.0.4.5.1.0.0` | `<i>` | — | `fa fa-link` | 1723.7, 265, 13, 14 | YES |
| 198 | `r.0.1.1.0.1.0.4.5.1.1.0` | `<i>` | — | `fa fa-copy` | 1799, 265, 14, 14 | YES |
| 199 | `r.0.1.1.0.1.0.4.6.1.1.0` | `<button>` | — | `btn btn-info` | 0, 0, 0, 0 | NO (zero rect) |
| 452 | `r.0.1.1.0.1.0.3.0.1.1.0.0` | `<i>` | — | `fa fa-copy` | 0, 0, 0, 0 | NO (zero rect) |
| 453 | `r.0.1.1.0.1.0.4.6.1.1.0.0` | `<i>` | — | `fa fa-copy` | 0, 0, 0, 0 | NO (zero rect) |

### Attributes (verbatim) & text

**#38 `r.0.1.1.0.1.0` `<div>`**

- `class` = "form-vertical"

**#39 `r.0.1.1.0.1.1` `<br>`**

- _(no attributes)_

**#40 `r.0.1.1.0.1.2` `<div>`**

- `ng-show` = "dataLoading"
- `style` = "padding: 25px; text-align: center;"
- `class` = "div animated  fadeIn infinite ng-hide"

**#53 `r.0.1.1.0.1.0.0` `<div>`**

- `class` = "form-group m0"

**#54 `r.0.1.1.0.1.0.1` `<div>`**

- `class` = "form-group m0 ng-hide"
- `ng-show` = "sess.roomType=='webinar'"

**#55 `r.0.1.1.0.1.0.2` `<div>`**

- `class` = "form-group m0"

**#56 `r.0.1.1.0.1.0.3` `<div>`**

- `ng-show` = "sess.authMode=='registrationA' || sess.authMode=='registrationM'"
- `class` = "ng-hide"

**#57 `r.0.1.1.0.1.0.4` `<div>`**

- `ng-show` = "sess.authMode=='webinarRoom' || sess.authMode=='open' || sess.authMode=='unamePW' || sess.allowPWLoginWithSSO"
- `class` = ""
- `style` = ""

**#58 `r.0.1.1.0.1.2.0` `<img>`**

- `src` = "app/img/ajax_loader.gif"

**#59 `r.0.1.1.0.1.2.1` `<label>`**

- _(no attributes)_
- **text** = "Loading..."

**#72 `r.0.1.1.0.1.0.0.0` `<label>`**

- `class` = "col-sm-2 control-label"
- **text** = "Room Title"

**#73 `r.0.1.1.0.1.0.0.1` `<div>`**

- `class` = "col-sm-10"

**#74 `r.0.1.1.0.1.0.1.0` `<label>`**

- `class` = "col-sm-2 control-label"
- **text** = "Date:"

**#75 `r.0.1.1.0.1.0.1.1` `<div>`**

- `class` = "col-sm-10"

**#76 `r.0.1.1.0.1.0.2.0` `<label>`**

- `class` = "col-sm-2 control-label"
- **text** = "Authorization Mode"

**#77 `r.0.1.1.0.1.0.2.1` `<div>`**

- `class` = "col-sm-10"

**#78 `r.0.1.1.0.1.0.3.0` `<div>`**

- `class` = "form-group m0"

**#79 `r.0.1.1.0.1.0.3.1` `<br>`**

- _(no attributes)_

**#80 `r.0.1.1.0.1.0.3.2` `<div>`**

- `class` = "form-group m0"

**#81 `r.0.1.1.0.1.0.3.3` `<br>`**

- `clear` = "both"

**#82 `r.0.1.1.0.1.0.3.4` `<div>`**

- `class` = "form-group m0"

**#83 `r.0.1.1.0.1.0.3.5` `<br>`**

- `clear` = "both"

**#84 `r.0.1.1.0.1.0.4.0` `<label>`**

- `class` = "col-sm-2 control-label"
- **text** = "Room Link:"

**#85 `r.0.1.1.0.1.0.4.1` `<div>`**

- `class` = "input-group"

**#86 `r.0.1.1.0.1.0.4.2` `<label>`**

- `class` = "col-sm-2 control-label"
- **text** = "Vanity Link:"

**#87 `r.0.1.1.0.1.0.4.3` `<div>`**

- `class` = "input-group"

**#88 `r.0.1.1.0.1.0.4.4` `<label>`**

- `class` = "col-sm-2 control-label"
- **text** = "Unique Link:"

**#89 `r.0.1.1.0.1.0.4.5` `<div>`**

- `class` = "input-group"

**#90 `r.0.1.1.0.1.0.4.6` `<div>`**

- `ng-show` = "sess.hasAppPairLink"
- `class` = "ng-hide"

**#112 `r.0.1.1.0.1.0.0.1.0` `<p>`**

- `class` = "form-control-static"

**#113 `r.0.1.1.0.1.0.1.1.0` `<p>`**

- `class` = "form-control-static"

**#114 `r.0.1.1.0.1.0.2.1.0` `<p>`**

- `class` = "form-control-static"

**#115 `r.0.1.1.0.1.0.3.0.0` `<label>`**

- `class` = "col-sm-2 control-label"
- **text** = "Registration Link:"

**#116 `r.0.1.1.0.1.0.3.0.1` `<div>`**

- `class` = "input-group"

**#117 `r.0.1.1.0.1.0.3.2.0` `<label>`**

- `class` = "col-sm-2 control-label"
- **text** = "Event Time (for email template):"

**#118 `r.0.1.1.0.1.0.3.2.1` `<div>`**

- `class` = "col-sm-10 "

**#119 `r.0.1.1.0.1.0.3.4.0` `<label>`**

- `class` = "col-sm-2 control-label"
- **text** = "Email Preview:"

**#120 `r.0.1.1.0.1.0.3.4.1` `<div>`**

- `class` = "col-sm-8"

**#121 `r.0.1.1.0.1.0.3.4.2` `<br>`**

- _(no attributes)_

**#122 `r.0.1.1.0.1.0.3.4.3` `<br>`**

- _(no attributes)_

**#123 `r.0.1.1.0.1.0.4.1.0#webinarLinkTxt` `<input>`**

- `type` = "text"
- `class` = "form-control col-md-6"
- `id` = "webinarLinkTxt"
- `readonly` = "readonly"
- `value` = "https://protradingroom.com/u/6a628a99731b9f77ae9bf505"

**#124 `r.0.1.1.0.1.0.4.1.1` `<span>`**

- `class` = "input-group-btn"

**#125 `r.0.1.1.0.1.0.4.3.0#customLinkTxt` `<input>`**

- `type` = "text"
- `class` = "form-control col-md-6"
- `id` = "customLinkTxt"
- `readonly` = "readonly"
- `value` = "https://protradingroom.com/room/[yournamehere]"

**#126 `r.0.1.1.0.1.0.4.3.1` `<span>`**

- `class` = "input-group-btn"

**#127 `r.0.1.1.0.1.0.4.5.0#uniqueLinkTxt` `<input>`**

- `type` = "text"
- `class` = "form-control col-md-6"
- `id` = "uniqueLinkTxt"
- `readonly` = "readonly"
- `value` = "https://protradingroom.com/room/[youruniquelinkhere]"

**#128 `r.0.1.1.0.1.0.4.5.1` `<span>`**

- `class` = "input-group-btn"

**#129 `r.0.1.1.0.1.0.4.6.0` `<label>`**

- `class` = "col-sm-2 control-label"
- **text** = "App Pair Link:"

**#130 `r.0.1.1.0.1.0.4.6.1` `<div>`**

- `class` = "input-group"

**#154 `r.0.1.1.0.1.0.0.1.0.0` `<a>`**

- `href` = ""
- `editable-text` = "sess.name"
- `onaftersave` = "saveSessField('name')"
- `class` = "ng-scope ng-binding editable editable-click"
- **text** = "Room 3625"

**#155 `r.0.1.1.0.1.0.1.1.0.0` `<a>`**

- `href` = ""
- `onaftersave` = "saveSessField('webinarDate')"
- `editable-combodate` = "sess.webinarDate"
- `e-max-year` = "2028"
- `e-data-format` = "DD-MM-YYYY h:mm a"
- `data-format` = "DD-MM-YYYY +-HH:mm"
- `e-min-year` = "2026"
- `class` = "ng-scope ng-binding editable editable-click"
- **text** = "07/23/2026 @ 05:41 PM"

**#156 `r.0.1.1.0.1.0.1.1.0.1` `<br>`**

- _(no attributes)_

**#157 `r.0.1.1.0.1.0.1.1.0.2` `<muted>`**

- _(no attributes)_
- **text** = "(NOTE: use your local time. It will be converted to the user's local time)"

**#158 `r.0.1.1.0.1.0.2.1.0.0` `<a>`**

- `href` = ""
- `onaftersave` = "saveSessField('authMode')"
- `editable-select` = "sess.authMode "
- `e-ng-options` = "s.value as s.text for s in sessAuthTypes "
- `class` = "ng-scope ng-binding editable editable-click"
- **text** = "Open - Anyone with the room link can join with their email & name"

**#159 `r.0.1.1.0.1.0.3.0.1.0#webinarRegLinkTxt` `<input>`**

- `type` = "text"
- `class` = "form-control col-md-6"
- `id` = "webinarRegLinkTxt"
- `readonly` = "readonly"
- `value` = "https://protradingroom.com/r/6a628a99731b9f77ae9bf505"

**#160 `r.0.1.1.0.1.0.3.0.1.1` `<span>`**

- `class` = "input-group-btn"

**#161 `r.0.1.1.0.1.0.3.2.1.0` `<input>`**

- `type` = "text"
- `ng-model` = "webinarTimeTxt"
- `value` = ""
- `placeholder` = "at 7pm EST"
- `class` = "ng-pristine ng-untouched ng-valid"

**#162 `r.0.1.1.0.1.0.3.4.1.0` `<pre>`**

- `style` = "height: 130px; overflow: scroll;"
- `class` = "ng-binding"
- **text** = "Hello __name__,\n\n                        This is a friendly reminder to attend the session \"Room 3625\".\n                        We'll get started at .\n                        Please click this link to attend: ______ unique link will be here_____"

**#163 `r.0.1.1.0.1.0.3.4.1.1` `<button>`**

- `class` = "btn btn-default"
- `type` = "button"
- `ng-click` = "sendWeminarEmailReminder(webinarTimeTxt)"
- **text** = "Send Emails Now"

**#164 `r.0.1.1.0.1.0.4.1.1.0` `<button>`**

- `class` = "btn btn-info"
- `type` = "button"
- `onclick` = "copyLinkToClipboard('webinarLinkTxt')"
- **text** = "Copy"

**#165 `r.0.1.1.0.1.0.4.3.1.0` `<button>`**

- `class` = "btn btn-warning"
- `type` = "button"
- `ng-click` = "setCustomRoomURL()"
- **text** = "Edit"

**#166 `r.0.1.1.0.1.0.4.3.1.1` `<button>`**

- `class` = "btn btn-info"
- `type` = "button"
- `onclick` = "copyLinkToClipboard('customLinkTxt')"
- **text** = "Copy"

**#167 `r.0.1.1.0.1.0.4.5.1.0` `<button>`**

- `class` = "btn btn-primary"
- `type` = "button"
- `ng-click` = "setUniqueRoomURL()"
- **text** = "Generate"

**#168 `r.0.1.1.0.1.0.4.5.1.1` `<button>`**

- `class` = "btn btn-info"
- `type` = "button"
- `onclick` = "copyLinkToClipboard('uniqueLinkTxt')"
- **text** = "Copy"

**#169 `r.0.1.1.0.1.0.4.6.1.0#appPairLink` `<input>`**

- `type` = "text"
- `class` = "form-control col-md-6"
- `id` = "appPairLink"
- `readonly` = "readonly"
- `value` = "https://protradingroom.com/room/"

**#170 `r.0.1.1.0.1.0.4.6.1.1` `<span>`**

- `class` = "input-group-btn"

**#191 `r.0.1.1.0.1.0.3.0.1.1.0` `<button>`**

- `class` = "btn btn-info"
- `type` = "button"
- `onclick` = "copyLinkToClipboard('webinarRegLinkTxt')"
- **text** = "Copy"

**#192 `r.0.1.1.0.1.0.3.4.1.0.0` `<strong>`**

- `ng-show` = "!webinarTimeTxt"
- **text** = "FILL TIME ABOVE"

**#193 `r.0.1.1.0.1.0.3.4.1.0.1` `<strong>`**

- `ng-show` = "webinarTimeTxt"
- `class` = "ng-binding ng-hide"

**#194 `r.0.1.1.0.1.0.4.1.1.0.0` `<i>`**

- `class` = "fa fa-copy"
- **::before** = `{"content":"\"\"","color":"rgb(255, 255, 255)","font-family":"FontAwesome","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`

**#195 `r.0.1.1.0.1.0.4.3.1.0.0` `<i>`**

- `class` = "fa fa-edit"
- **::before** = `{"content":"\"\"","color":"rgb(255, 255, 255)","font-family":"FontAwesome","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`

**#196 `r.0.1.1.0.1.0.4.3.1.1.0` `<i>`**

- `class` = "fa fa-copy"
- **::before** = `{"content":"\"\"","color":"rgb(255, 255, 255)","font-family":"FontAwesome","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`

**#197 `r.0.1.1.0.1.0.4.5.1.0.0` `<i>`**

- `class` = "fa fa-link"
- **::before** = `{"content":"\"\"","color":"rgb(255, 255, 255)","font-family":"FontAwesome","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`

**#198 `r.0.1.1.0.1.0.4.5.1.1.0` `<i>`**

- `class` = "fa fa-copy"
- **::before** = `{"content":"\"\"","color":"rgb(255, 255, 255)","font-family":"FontAwesome","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`

**#199 `r.0.1.1.0.1.0.4.6.1.1.0` `<button>`**

- `class` = "btn btn-info"
- `type` = "button"
- `onclick` = "copyLinkToClipboard('appPairLink')"
- **text** = "Copy"

**#452 `r.0.1.1.0.1.0.3.0.1.1.0.0` `<i>`**

- `class` = "fa fa-copy"
- **::before** = `{"content":"\"\"","color":"rgb(255, 255, 255)","font-family":"FontAwesome","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`

**#453 `r.0.1.1.0.1.0.4.6.1.1.0.0` `<i>`**

- `class` = "fa fa-copy"
- **::before** = `{"content":"\"\"","color":"rgb(255, 255, 255)","font-family":"FontAwesome","font-size":"14px","background-color":"rgba(0, 0, 0, 0)"}`

### Resolved absolute computed style — every node

#### #38 `r.0.1.1.0.1.0` `<div>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 1810px / 170px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #39 `r.0.1.1.0.1.1` `<br>` — YES

| property | resolved value |
|---|---|
| display | inline |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #40 `r.0.1.1.0.1.2` `<div>` — NO (display:none)

| property | resolved value |
|---|---|
| display | none |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 25px / 25px / 25px / 25px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #53 `r.0.1.1.0.1.0.0` `<div>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 1810px / 0px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #54 `r.0.1.1.0.1.0.1` `<div>` — NO (display:none)

| property | resolved value |
|---|---|
| display | none |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #55 `r.0.1.1.0.1.0.2` `<div>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 1810px / 0px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #56 `r.0.1.1.0.1.0.3` `<div>` — NO (display:none)

| property | resolved value |
|---|---|
| display | none |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #57 `r.0.1.1.0.1.0.4` `<div>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 1810px / 170px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #58 `r.0.1.1.0.1.2.0` `<img>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | middle |
| overflow-x / overflow-y | clip / clip |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #59 `r.0.1.1.0.1.2.1` `<label>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline-block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / 100% |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 5px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 700 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | default |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #72 `r.0.1.1.0.1.0.0.0` `<label>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | left |
| box-sizing | border-box |
| width / height | 301.664px / 20px |
| min-width / max-width | 0px / 100% |
| min-height / max-height | 1px / none |
| margin T R B L | 0px / 0px / 5px / 0px |
| padding T R B L | 0px / 15px / 0px / 15px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 700 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | default |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #73 `r.0.1.1.0.1.0.0.1` `<div>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | left |
| box-sizing | border-box |
| width / height | 1508.33px / 34px |
| min-width / max-width | 0px / none |
| min-height / max-height | 1px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 15px / 0px / 15px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #74 `r.0.1.1.0.1.0.1.0` `<label>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | left |
| box-sizing | border-box |
| width / height | 16.6667% / auto |
| min-width / max-width | 0px / 100% |
| min-height / max-height | 1px / none |
| margin T R B L | 0px / 0px / 5px / 0px |
| padding T R B L | 0px / 15px / 0px / 15px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 700 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | default |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #75 `r.0.1.1.0.1.0.1.1` `<div>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | left |
| box-sizing | border-box |
| width / height | 83.3333% / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 1px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 15px / 0px / 15px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #76 `r.0.1.1.0.1.0.2.0` `<label>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | left |
| box-sizing | border-box |
| width / height | 301.664px / 20px |
| min-width / max-width | 0px / 100% |
| min-height / max-height | 1px / none |
| margin T R B L | 0px / 0px / 5px / 0px |
| padding T R B L | 0px / 15px / 0px / 15px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 700 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | default |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #77 `r.0.1.1.0.1.0.2.1` `<div>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | left |
| box-sizing | border-box |
| width / height | 1508.33px / 34px |
| min-width / max-width | 0px / none |
| min-height / max-height | 1px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 15px / 0px / 15px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #78 `r.0.1.1.0.1.0.3.0` `<div>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #79 `r.0.1.1.0.1.0.3.1` `<br>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #80 `r.0.1.1.0.1.0.3.2` `<div>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #81 `r.0.1.1.0.1.0.3.3` `<br>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #82 `r.0.1.1.0.1.0.3.4` `<div>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #83 `r.0.1.1.0.1.0.3.5` `<br>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #84 `r.0.1.1.0.1.0.4.0` `<label>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | left |
| box-sizing | border-box |
| width / height | 301.664px / 20px |
| min-width / max-width | 0px / 100% |
| min-height / max-height | 1px / none |
| margin T R B L | 0px / 0px / 5px / 0px |
| padding T R B L | 0px / 15px / 0px / 15px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 700 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | default |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #85 `r.0.1.1.0.1.0.4.1` `<div>` — YES

| property | resolved value |
|---|---|
| display | table |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 1508.34px / 34px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #86 `r.0.1.1.0.1.0.4.2` `<label>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | left |
| box-sizing | border-box |
| width / height | 301.664px / 20px |
| min-width / max-width | 0px / 100% |
| min-height / max-height | 1px / none |
| margin T R B L | 0px / 0px / 5px / 0px |
| padding T R B L | 0px / 15px / 0px / 15px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 700 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | default |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #87 `r.0.1.1.0.1.0.4.3` `<div>` — YES

| property | resolved value |
|---|---|
| display | table |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 1508.34px / 34px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #88 `r.0.1.1.0.1.0.4.4` `<label>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | left |
| box-sizing | border-box |
| width / height | 301.664px / 20px |
| min-width / max-width | 0px / 100% |
| min-height / max-height | 1px / none |
| margin T R B L | 0px / 0px / 5px / 0px |
| padding T R B L | 0px / 15px / 0px / 15px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 700 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | default |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #89 `r.0.1.1.0.1.0.4.5` `<div>` — YES

| property | resolved value |
|---|---|
| display | table |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 1508.34px / 34px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #90 `r.0.1.1.0.1.0.4.6` `<div>` — NO (display:none)

| property | resolved value |
|---|---|
| display | none |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #112 `r.0.1.1.0.1.0.0.1.0` `<p>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 1478.33px / 34px |
| min-width / max-width | 0px / none |
| min-height / max-height | 34px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 7px / 0px / 7px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #113 `r.0.1.1.0.1.0.1.1.0` `<p>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 34px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 7px / 0px / 7px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #114 `r.0.1.1.0.1.0.2.1.0` `<p>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 1478.33px / 34px |
| min-width / max-width | 0px / none |
| min-height / max-height | 34px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 7px / 0px / 7px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #115 `r.0.1.1.0.1.0.3.0.0` `<label>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | left |
| box-sizing | border-box |
| width / height | 16.6667% / auto |
| min-width / max-width | 0px / 100% |
| min-height / max-height | 1px / none |
| margin T R B L | 0px / 0px / 5px / 0px |
| padding T R B L | 0px / 15px / 0px / 15px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 700 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | default |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #116 `r.0.1.1.0.1.0.3.0.1` `<div>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | table |
| position | relative |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #117 `r.0.1.1.0.1.0.3.2.0` `<label>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | left |
| box-sizing | border-box |
| width / height | 16.6667% / auto |
| min-width / max-width | 0px / 100% |
| min-height / max-height | 1px / none |
| margin T R B L | 0px / 0px / 5px / 0px |
| padding T R B L | 0px / 15px / 0px / 15px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 700 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | default |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #118 `r.0.1.1.0.1.0.3.2.1` `<div>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | left |
| box-sizing | border-box |
| width / height | 83.3333% / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 1px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 15px / 0px / 15px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #119 `r.0.1.1.0.1.0.3.4.0` `<label>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | left |
| box-sizing | border-box |
| width / height | 16.6667% / auto |
| min-width / max-width | 0px / 100% |
| min-height / max-height | 1px / none |
| margin T R B L | 0px / 0px / 5px / 0px |
| padding T R B L | 0px / 15px / 0px / 15px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 700 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | default |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #120 `r.0.1.1.0.1.0.3.4.1` `<div>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | left |
| box-sizing | border-box |
| width / height | 66.6667% / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 1px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 15px / 0px / 15px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #121 `r.0.1.1.0.1.0.3.4.2` `<br>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #122 `r.0.1.1.0.1.0.3.4.3` `<br>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #123 `r.0.1.1.0.1.0.4.1.0#webinarLinkTxt` `<input>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | 2 |
| float | left |
| box-sizing | border-box |
| width / height | 1431.99px / 34px |
| min-width / max-width | 0px / none |
| min-height / max-height | 1px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 6px / 18px / 6px / 18px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgb(219, 217, 217) / rgb(219, 217, 217) / rgb(219, 217, 217) / rgb(219, 217, 217) |
| border-radius TL TR BL BR | 4px / 0px / 4px / 0px |
| background-color | rgb(238, 238, 238) |
| background-image | none |
| color | rgb(85, 85, 85) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | clip / clip |
| opacity | 1 |
| box-shadow | rgb(0, 0, 0) 0px 0px 0px 0px |
| cursor | text |
| transition-property | border-color, box-shadow |
| transition-duration | 0.15s, 0.15s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(85, 85, 85) |

#### #124 `r.0.1.1.0.1.0.4.1.1` `<span>` — YES

| property | resolved value |
|---|---|
| display | table-cell |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 76.3438px / 34px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 0px |
| font-weight | 400 |
| font-style | normal |
| line-height | 0px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | middle |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #125 `r.0.1.1.0.1.0.4.3.0#customLinkTxt` `<input>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | 2 |
| float | left |
| box-sizing | border-box |
| width / height | 1364.72px / 34px |
| min-width / max-width | 0px / none |
| min-height / max-height | 1px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 6px / 18px / 6px / 18px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgb(219, 217, 217) / rgb(219, 217, 217) / rgb(219, 217, 217) / rgb(219, 217, 217) |
| border-radius TL TR BL BR | 4px / 0px / 4px / 0px |
| background-color | rgb(238, 238, 238) |
| background-image | none |
| color | rgb(85, 85, 85) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | clip / clip |
| opacity | 1 |
| box-shadow | rgb(0, 0, 0) 0px 0px 0px 0px |
| cursor | text |
| transition-property | border-color, box-shadow |
| transition-duration | 0.15s, 0.15s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(85, 85, 85) |

#### #126 `r.0.1.1.0.1.0.4.3.1` `<span>` — YES

| property | resolved value |
|---|---|
| display | table-cell |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 143.617px / 34px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 0px |
| font-weight | 400 |
| font-style | normal |
| line-height | 0px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | middle |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #127 `r.0.1.1.0.1.0.4.5.0#uniqueLinkTxt` `<input>` — YES

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | 2 |
| float | left |
| box-sizing | border-box |
| width / height | 1332.54px / 34px |
| min-width / max-width | 0px / none |
| min-height / max-height | 1px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 6px / 18px / 6px / 18px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgb(219, 217, 217) / rgb(219, 217, 217) / rgb(219, 217, 217) / rgb(219, 217, 217) |
| border-radius TL TR BL BR | 4px / 0px / 4px / 0px |
| background-color | rgb(238, 238, 238) |
| background-image | none |
| color | rgb(85, 85, 85) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | clip / clip |
| opacity | 1 |
| box-shadow | rgb(0, 0, 0) 0px 0px 0px 0px |
| cursor | text |
| transition-property | border-color, box-shadow |
| transition-duration | 0.15s, 0.15s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(85, 85, 85) |

#### #128 `r.0.1.1.0.1.0.4.5.1` `<span>` — YES

| property | resolved value |
|---|---|
| display | table-cell |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 175.797px / 34px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 0px |
| font-weight | 400 |
| font-style | normal |
| line-height | 0px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | middle |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #129 `r.0.1.1.0.1.0.4.6.0` `<label>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | left |
| box-sizing | border-box |
| width / height | 16.6667% / auto |
| min-width / max-width | 0px / 100% |
| min-height / max-height | 1px / none |
| margin T R B L | 0px / 0px / 5px / 0px |
| padding T R B L | 0px / 15px / 0px / 15px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 700 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | default |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #130 `r.0.1.1.0.1.0.4.6.1` `<div>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | table |
| position | relative |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #154 `r.0.1.1.0.1.0.0.1.0.0` `<a>` — YES

| property | resolved value |
|---|---|
| display | inline |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 1px / 0px |
| border-style T R B L | none / none / dashed / none |
| border-color T R B L | rgb(10, 10, 10) / rgb(10, 10, 10) / rgb(66, 139, 202) / rgb(10, 10, 10) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(10, 10, 10) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(10, 10, 10) |

#### #155 `r.0.1.1.0.1.0.1.1.0.0` `<a>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 1px / 0px |
| border-style T R B L | none / none / dashed / none |
| border-color T R B L | rgb(10, 10, 10) / rgb(10, 10, 10) / rgb(66, 139, 202) / rgb(10, 10, 10) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(10, 10, 10) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(10, 10, 10) |

#### #156 `r.0.1.1.0.1.0.1.1.0.1` `<br>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #157 `r.0.1.1.0.1.0.1.1.0.2` `<muted>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #158 `r.0.1.1.0.1.0.2.1.0.0` `<a>` — YES

| property | resolved value |
|---|---|
| display | inline |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 1px / 0px |
| border-style T R B L | none / none / dashed / none |
| border-color T R B L | rgb(10, 10, 10) / rgb(10, 10, 10) / rgb(66, 139, 202) / rgb(10, 10, 10) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(10, 10, 10) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(10, 10, 10) |

#### #159 `r.0.1.1.0.1.0.3.0.1.0#webinarRegLinkTxt` `<input>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | 2 |
| float | left |
| box-sizing | border-box |
| width / height | 100% / 34px |
| min-width / max-width | 0px / none |
| min-height / max-height | 1px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 6px / 18px / 6px / 18px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgb(219, 217, 217) / rgb(219, 217, 217) / rgb(219, 217, 217) / rgb(219, 217, 217) |
| border-radius TL TR BL BR | 4px / 0px / 4px / 0px |
| background-color | rgb(238, 238, 238) |
| background-image | none |
| color | rgb(85, 85, 85) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | clip / clip |
| opacity | 1 |
| box-shadow | rgb(0, 0, 0) 0px 0px 0px 0px |
| cursor | text |
| transition-property | border-color, box-shadow |
| transition-duration | 0.15s, 0.15s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(85, 85, 85) |

#### #160 `r.0.1.1.0.1.0.3.0.1.1` `<span>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | table-cell |
| position | relative |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 1% / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 0px |
| font-weight | 400 |
| font-style | normal |
| line-height | 0px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | middle |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #161 `r.0.1.1.0.1.0.3.2.1.0` `<input>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline-block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 1px / 2px / 1px / 2px |
| border-width T R B L | 2px / 2px / 2px / 2px |
| border-style T R B L | inset / inset / inset / inset |
| border-color T R B L | rgb(118, 118, 118) / rgb(118, 118, 118) / rgb(118, 118, 118) / rgb(118, 118, 118) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgb(255, 255, 255) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | clip / clip |
| opacity | 1 |
| box-shadow | none |
| cursor | text |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #162 `r.0.1.1.0.1.0.3.4.1.0` `<pre>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / 130px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 10px / 0px |
| padding T R B L | 9.5px / 9.5px / 9.5px / 9.5px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgb(204, 204, 204) / rgb(204, 204, 204) / rgb(204, 204, 204) / rgb(204, 204, 204) |
| border-radius TL TR BL BR | 4px / 4px / 4px / 4px |
| background-color | rgb(245, 245, 245) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | Menlo, Monaco, Consolas, "Courier New", monospace |
| font-size | 13px |
| font-weight | 400 |
| font-style | normal |
| line-height | 18.5714px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | pre |
| vertical-align | baseline |
| overflow-x / overflow-y | scroll / scroll |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #163 `r.0.1.1.0.1.0.3.4.1.1` `<button>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline-block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 6px / 12px / 6px / 12px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgb(230, 233, 238) / rgb(230, 233, 238) / rgb(230, 233, 238) / rgb(230, 233, 238) |
| border-radius TL TR BL BR | 4px / 4px / 4px / 4px |
| background-color | rgb(255, 255, 255) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | middle |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #164 `r.0.1.1.0.1.0.4.1.1.0` `<button>` — YES

| property | resolved value |
|---|---|
| display | inline-block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | 2 |
| float | none |
| box-sizing | border-box |
| width / height | 77.3438px / 34px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / -1px |
| padding T R B L | 6px / 12px / 6px / 12px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgb(70, 184, 218) / rgb(70, 184, 218) / rgb(70, 184, 218) / rgb(70, 184, 218) |
| border-radius TL TR BL BR | 0px / 4px / 0px / 4px |
| background-color | rgb(91, 192, 222) |
| background-image | none |
| color | rgb(255, 255, 255) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | middle |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(255, 255, 255) |

#### #165 `r.0.1.1.0.1.0.4.3.1.0` `<button>` — YES

| property | resolved value |
|---|---|
| display | inline-block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | 2 |
| float | none |
| box-sizing | border-box |
| width / height | 68.2734px / 34px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / -1px |
| padding T R B L | 6px / 12px / 6px / 12px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgb(238, 162, 54) / rgb(238, 162, 54) / rgb(238, 162, 54) / rgb(238, 162, 54) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgb(240, 173, 78) |
| background-image | none |
| color | rgb(255, 255, 255) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | middle |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(255, 255, 255) |

#### #166 `r.0.1.1.0.1.0.4.3.1.1` `<button>` — YES

| property | resolved value |
|---|---|
| display | inline-block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | 2 |
| float | none |
| box-sizing | border-box |
| width / height | 77.3438px / 34px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / -1px |
| padding T R B L | 6px / 12px / 6px / 12px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgb(70, 184, 218) / rgb(70, 184, 218) / rgb(70, 184, 218) / rgb(70, 184, 218) |
| border-radius TL TR BL BR | 0px / 4px / 0px / 4px |
| background-color | rgb(91, 192, 222) |
| background-image | none |
| color | rgb(255, 255, 255) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | middle |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(255, 255, 255) |

#### #167 `r.0.1.1.0.1.0.4.5.1.0` `<button>` — YES

| property | resolved value |
|---|---|
| display | inline-block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | 2 |
| float | none |
| box-sizing | border-box |
| width / height | 100.453px / 34px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / -1px |
| padding T R B L | 6px / 12px / 6px / 12px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgb(46, 109, 164) / rgb(46, 109, 164) / rgb(46, 109, 164) / rgb(46, 109, 164) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgb(51, 122, 183) |
| background-image | none |
| color | rgb(255, 255, 255) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | middle |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(255, 255, 255) |

#### #168 `r.0.1.1.0.1.0.4.5.1.1` `<button>` — YES

| property | resolved value |
|---|---|
| display | inline-block |
| position | relative |
| top / right / bottom / left | 0px / 0px / 0px / 0px |
| z-index | 2 |
| float | none |
| box-sizing | border-box |
| width / height | 77.3438px / 34px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / -1px |
| padding T R B L | 6px / 12px / 6px / 12px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgb(70, 184, 218) / rgb(70, 184, 218) / rgb(70, 184, 218) / rgb(70, 184, 218) |
| border-radius TL TR BL BR | 0px / 4px / 0px / 4px |
| background-color | rgb(91, 192, 222) |
| background-image | none |
| color | rgb(255, 255, 255) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | middle |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(255, 255, 255) |

#### #169 `r.0.1.1.0.1.0.4.6.1.0#appPairLink` `<input>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | block |
| position | relative |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | 2 |
| float | left |
| box-sizing | border-box |
| width / height | 100% / 34px |
| min-width / max-width | 0px / none |
| min-height / max-height | 1px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 6px / 18px / 6px / 18px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgb(219, 217, 217) / rgb(219, 217, 217) / rgb(219, 217, 217) / rgb(219, 217, 217) |
| border-radius TL TR BL BR | 4px / 0px / 4px / 0px |
| background-color | rgb(238, 238, 238) |
| background-image | none |
| color | rgb(85, 85, 85) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | normal |
| vertical-align | baseline |
| overflow-x / overflow-y | clip / clip |
| opacity | 1 |
| box-shadow | rgb(0, 0, 0) 0px 0px 0px 0px |
| cursor | text |
| transition-property | border-color, box-shadow |
| transition-duration | 0.15s, 0.15s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(85, 85, 85) |

#### #170 `r.0.1.1.0.1.0.4.6.1.1` `<span>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | table-cell |
| position | relative |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 1% / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 0px |
| font-weight | 400 |
| font-style | normal |
| line-height | 0px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | middle |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #191 `r.0.1.1.0.1.0.3.0.1.1.0` `<button>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline-block |
| position | relative |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | 2 |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / -1px |
| padding T R B L | 6px / 12px / 6px / 12px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgb(70, 184, 218) / rgb(70, 184, 218) / rgb(70, 184, 218) / rgb(70, 184, 218) |
| border-radius TL TR BL BR | 0px / 4px / 0px / 4px |
| background-color | rgb(91, 192, 222) |
| background-image | none |
| color | rgb(255, 255, 255) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | middle |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(255, 255, 255) |

#### #192 `r.0.1.1.0.1.0.3.4.1.0.0` `<strong>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | Menlo, Monaco, Consolas, "Courier New", monospace |
| font-size | 13px |
| font-weight | 700 |
| font-style | normal |
| line-height | 18.5714px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | pre |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #193 `r.0.1.1.0.1.0.3.4.1.0.1` `<strong>` — NO (display:none)

| property | resolved value |
|---|---|
| display | none |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) / rgb(51, 51, 51) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(51, 51, 51) |
| font-family | Menlo, Monaco, Consolas, "Courier New", monospace |
| font-size | 13px |
| font-weight | 700 |
| font-style | normal |
| line-height | 18.5714px |
| letter-spacing | normal |
| text-align | start |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | pre |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | auto |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | auto |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(51, 51, 51) |

#### #194 `r.0.1.1.0.1.0.4.1.1.0.0` `<i>` — YES

| property | resolved value |
|---|---|
| display | inline-block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 14px / 14px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(255, 255, 255) / rgb(255, 255, 255) / rgb(255, 255, 255) / rgb(255, 255, 255) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(255, 255, 255) |
| font-family | FontAwesome |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 14px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | matrix(1, 0, 0, 1, 0, 0) |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(255, 255, 255) |

#### #195 `r.0.1.1.0.1.0.4.3.1.0.0` `<i>` — YES

| property | resolved value |
|---|---|
| display | inline-block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 14px / 14px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(255, 255, 255) / rgb(255, 255, 255) / rgb(255, 255, 255) / rgb(255, 255, 255) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(255, 255, 255) |
| font-family | FontAwesome |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 14px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | matrix(1, 0, 0, 1, 0, 0) |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(255, 255, 255) |

#### #196 `r.0.1.1.0.1.0.4.3.1.1.0` `<i>` — YES

| property | resolved value |
|---|---|
| display | inline-block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 14px / 14px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(255, 255, 255) / rgb(255, 255, 255) / rgb(255, 255, 255) / rgb(255, 255, 255) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(255, 255, 255) |
| font-family | FontAwesome |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 14px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | matrix(1, 0, 0, 1, 0, 0) |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(255, 255, 255) |

#### #197 `r.0.1.1.0.1.0.4.5.1.0.0` `<i>` — YES

| property | resolved value |
|---|---|
| display | inline-block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 13px / 14px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(255, 255, 255) / rgb(255, 255, 255) / rgb(255, 255, 255) / rgb(255, 255, 255) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(255, 255, 255) |
| font-family | FontAwesome |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 14px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | matrix(1, 0, 0, 1, 0, 0) |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(255, 255, 255) |

#### #198 `r.0.1.1.0.1.0.4.5.1.1.0` `<i>` — YES

| property | resolved value |
|---|---|
| display | inline-block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | 14px / 14px |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(255, 255, 255) / rgb(255, 255, 255) / rgb(255, 255, 255) / rgb(255, 255, 255) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(255, 255, 255) |
| font-family | FontAwesome |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 14px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | matrix(1, 0, 0, 1, 0, 0) |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(255, 255, 255) |

#### #199 `r.0.1.1.0.1.0.4.6.1.1.0` `<button>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline-block |
| position | relative |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | 2 |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / -1px |
| padding T R B L | 6px / 12px / 6px / 12px |
| border-width T R B L | 1px / 1px / 1px / 1px |
| border-style T R B L | solid / solid / solid / solid |
| border-color T R B L | rgb(70, 184, 218) / rgb(70, 184, 218) / rgb(70, 184, 218) / rgb(70, 184, 218) |
| border-radius TL TR BL BR | 0px / 4px / 0px / 4px |
| background-color | rgb(91, 192, 222) |
| background-image | none |
| color | rgb(255, 255, 255) |
| font-family | "Helvetica Neue", Helvetica, Arial, sans-serif |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 20px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | middle |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(255, 255, 255) |

#### #452 `r.0.1.1.0.1.0.3.0.1.1.0.0` `<i>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline-block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(255, 255, 255) / rgb(255, 255, 255) / rgb(255, 255, 255) / rgb(255, 255, 255) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(255, 255, 255) |
| font-family | FontAwesome |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 14px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(255, 255, 255) |

#### #453 `r.0.1.1.0.1.0.4.6.1.1.0.0` `<i>` — NO (zero rect)

| property | resolved value |
|---|---|
| display | inline-block |
| position | static |
| top / right / bottom / left | auto / auto / auto / auto |
| z-index | auto |
| float | none |
| box-sizing | border-box |
| width / height | auto / auto |
| min-width / max-width | 0px / none |
| min-height / max-height | 0px / none |
| margin T R B L | 0px / 0px / 0px / 0px |
| padding T R B L | 0px / 0px / 0px / 0px |
| border-width T R B L | 0px / 0px / 0px / 0px |
| border-style T R B L | none / none / none / none |
| border-color T R B L | rgb(255, 255, 255) / rgb(255, 255, 255) / rgb(255, 255, 255) / rgb(255, 255, 255) |
| border-radius TL TR BL BR | 0px / 0px / 0px / 0px |
| background-color | rgba(0, 0, 0, 0) |
| background-image | none |
| color | rgb(255, 255, 255) |
| font-family | FontAwesome |
| font-size | 14px |
| font-weight | 400 |
| font-style | normal |
| line-height | 14px |
| letter-spacing | normal |
| text-align | center |
| text-transform | none |
| text-decoration-line | none |
| text-shadow | none |
| white-space | nowrap |
| vertical-align | baseline |
| overflow-x / overflow-y | visible / visible |
| opacity | 1 |
| box-shadow | none |
| cursor | pointer |
| transition-property | all |
| transition-duration | 0s |
| visibility | visible |
| list-style-type | disc |
| user-select | none |
| transform | none |
| appearance | none |
| resize | none |
| pointer-events | auto |
| background-clip | border-box |
| outline-width / outline-color | 3px / rgb(255, 255, 255) |


---

## 6. Verbatim text and values

### Rendering text

| path | # | text (verbatim) |
|---|---|---|
| `…1.0.0.0` | #72 | `"Room Title"` |
| `…1.0.0.1.0.0` | #154 | `"Room 3625"` |
| `…1.0.2.0` | #76 | `"Authorization Mode"` |
| `…1.0.2.1.0.0` | #158 | `"Open - Anyone with the room link can join with their email & name"` |
| `…1.0.4.0` | #84 | `"Room Link:"` |
| `…1.0.4.2` | #86 | `"Vanity Link:"` |
| `…1.0.4.4` | #88 | `"Unique Link:"` |
| `…1.0.4.1.1.0` | #164 | `"Copy"` |
| `…1.0.4.3.1.0` | #165 | `"Edit"` |
| `…1.0.4.3.1.1` | #166 | `"Copy"` |
| `…1.0.4.5.1.0` | #167 | `"Generate"` |
| `…1.0.4.5.1.1` | #168 | `"Copy"` |

### Rendering input `value` attributes (REAL captured data — do not substitute)

| path | # | id | value |
|---|---|---|---|
| `…1.0.4.1.0` | #123 | `webinarLinkTxt` | `https://protradingroom.com/u/6a628a99731b9f77ae9bf505` |
| `…1.0.4.3.0` | #125 | `customLinkTxt` | `https://protradingroom.com/room/[yournamehere]` |
| `…1.0.4.5.0` | #127 | `uniqueLinkTxt` | `https://protradingroom.com/room/[youruniquelinkhere]` |

`[yournamehere]` and `[youruniquelinkhere]` are **literally what is in the DOM** — this room has never had a vanity link or a unique link set, and the app renders those placeholder strings as the actual input value. They are honest empty-state text, not fabricated data. Reproduce them verbatim.

### Text present in the DOM but `display:none`

| path | # | text |
|---|---|---|
| `…1.0.1.0` | #74 | `"Date:"` |
| `…1.0.1.1.0.0` | #155 | `"07/23/2026 @ 05:41 PM"` |
| `…1.0.1.1.0.2` | #157 | `"(NOTE: use your local time. It will be converted to the user's local time)"` |
| `…1.0.3.0.0` | #115 | `"Registration Link:"` |
| `…1.0.3.2.0` | #117 | `"Event Time (for email template):"` |
| `…1.0.3.4.0` | #119 | `"Email Preview:"` |
| `…1.0.3.4.1.1` | #163 | `"Send Emails Now"` |
| `…1.0.3.4.1.0.0` | #192 | `"FILL TIME ABOVE"` |
| `…1.0.3.0.1.1.0` | #191 | `"Copy"` |
| `…1.0.4.6.0` | #129 | `"App Pair Link:"` |
| `…1.0.4.6.1.1.0` | #199 | `"Copy"` |
| `…1.2.1` | #59 | `"Loading..."` |

Hidden input values: `#159 webinarRegLinkTxt` = `https://protradingroom.com/r/6a628a99731b9f77ae9bf505`; `#169 appPairLink` = `https://protradingroom.com/room/`; `#161` = `value=""`, `placeholder="at 7pm EST"`.

### The hidden email-preview `<pre>` (`#162`) — full text, **not** truncated (245 raw chars, limit 250)

```
Hello __name__,

                        This is a friendly reminder to attend the session "Room 3625".
                        We'll get started at .
                        Please click this link to attend: ______ unique link will be here_____
```

The `"Room 3625"` inside it is interpolated from the room name; the literal `______ unique link will be here_____` (6 leading and 5 trailing underscores) is a placeholder in the template. `We'll get started at .` is followed by the two `<strong>` children — `#192` `"FILL TIME ABOVE"` (shown because `webinarTimeTxt` is empty) and `#193` (hidden, `ng-binding`, empty).

### Icon glyphs (captured `::before`)

| node | class | codepoint | colour / font-size |
|---|---|---|---|
| #194 `…1.0.4.1.1.0.0` | `fa fa-copy` | **U+F0C5** | `rgb(255,255,255)` / 14px |
| #195 `…1.0.4.3.1.0.0` | `fa fa-edit` | **U+F044** | `rgb(255,255,255)` / 14px |
| #196 `…1.0.4.3.1.1.0` | `fa fa-copy` | **U+F0C5** | `rgb(255,255,255)` / 14px |
| #197 `…1.0.4.5.1.0.0` | `fa fa-link` | **U+F0C1** | `rgb(255,255,255)` / 14px |
| #198 `…1.0.4.5.1.1.0` | `fa fa-copy` | **U+F0C5** | `rgb(255,255,255)` / 14px |
| #452 `…1.0.3.0.1.1.0.0` (hidden) | `fa fa-copy` | **U+F0C5** | `rgb(255,255,255)` / 14px |
| #453 `…1.0.4.6.1.1.0.0` (hidden) | `fa fa-copy` | **U+F0C5** | `rgb(255,255,255)` / 14px |

**Icon position is AFTER the label text in every button in this piece** (opposite to the `Reset Counts` button in P03). Proof from rects: button `#164` box 1748.7→1826.04, content box (12px padding) 1760.7→1814.04, icon `#194` at x=1799 w=14 → 1813, i.e. flush to the content's right edge with the text before it. Same pattern for `#165`/`#195` (icon x=1722.7, content ends 1737.67) and `#167`/`#197` (icon x=1723.7, content ends 1737.65).

### Truncation
Nothing in this piece is truncated. Longest attribute is `#57`'s `ng-show` at 118 chars (limit 300); longest text is `#162` at 245 raw chars (limit 250).

---

## 7. Rebuild spec (SvelteKit)

### 7.1 Markup

```svelte
<div class="form-vertical">

  <!-- Row 1 — Room Title (inline editable) -->
  <div class="form-group m0">
    <label class="col-sm-2 control-label">Room Title</label>
    <div class="col-sm-10">
      <p class="form-control-static">
        <a href="" class="editable editable-click" onclick={() => editRoomName()}>{sess.name}</a>
      </p>
    </div>
  </div>

  <!-- HIDDEN unless sess.roomType === 'webinar' -->
  {#if sess.roomType === 'webinar'}
    <div class="form-group m0">
      <label class="col-sm-2 control-label">Date:</label>
      <div class="col-sm-10">
        <p class="form-control-static">
          <a href="" class="editable editable-click">{formatDate(sess.webinarDate)}</a><br>
          <muted>(NOTE: use your local time. It will be converted to the user's local time)</muted>
        </p>
      </div>
    </div>
  {/if}

  <!-- Row 2 — Authorization Mode (inline editable select) -->
  <div class="form-group m0">
    <label class="col-sm-2 control-label">Authorization Mode</label>
    <div class="col-sm-10">
      <p class="form-control-static">
        <a href="" class="editable editable-click">{authModeLabel}</a>
      </p>
    </div>
  </div>

  <!-- HIDDEN unless authMode is registrationA / registrationM  (see §7.4) -->

  <!-- Link block -->
  {#if ['webinarRoom','open','unamePW'].includes(sess.authMode) || sess.allowPWLoginWithSSO}
    <label class="col-sm-2 control-label">Room Link:</label>
    <div class="input-group">
      <input type="text" class="form-control col-md-6" id="webinarLinkTxt" readonly value={roomLink} />
      <span class="input-group-btn">
        <button class="btn btn-info" type="button" onclick={() => copyLinkToClipboard('webinarLinkTxt')}>Copy <i class="fa fa-copy"></i></button>
      </span>
    </div>

    <label class="col-sm-2 control-label">Vanity Link:</label>
    <div class="input-group">
      <input type="text" class="form-control col-md-6" id="customLinkTxt" readonly value={vanityLink} />
      <span class="input-group-btn">
        <button class="btn btn-warning" type="button" onclick={setCustomRoomURL}>Edit <i class="fa fa-edit"></i></button>
        <button class="btn btn-info"    type="button" onclick={() => copyLinkToClipboard('customLinkTxt')}>Copy <i class="fa fa-copy"></i></button>
      </span>
    </div>

    <label class="col-sm-2 control-label">Unique Link:</label>
    <div class="input-group">
      <input type="text" class="form-control col-md-6" id="uniqueLinkTxt" readonly value={uniqueLink} />
      <span class="input-group-btn">
        <button class="btn btn-primary" type="button" onclick={setUniqueRoomURL}>Generate <i class="fa fa-link"></i></button>
        <button class="btn btn-info"    type="button" onclick={() => copyLinkToClipboard('uniqueLinkTxt')}>Copy <i class="fa fa-copy"></i></button>
      </span>
    </div>

    {#if sess.hasAppPairLink}
      <label class="col-sm-2 control-label">App Pair Link:</label>
      <div class="input-group">
        <input type="text" class="form-control col-md-6" id="appPairLink" readonly value={appPairLink} />
        <span class="input-group-btn">
          <button class="btn btn-info" type="button" onclick={() => copyLinkToClipboard('appPairLink')}>Copy <i class="fa fa-copy"></i></button>
        </span>
      </div>
    {/if}
  {/if}
</div>

<br />

{#if dataLoading}
  <div class="animated fadeIn infinite" style="padding: 25px; text-align: center;">
    <img src="app/img/ajax_loader.gif" alt="" />
    <label>Loading...</label>
  </div>
{/if}
```

### 7.2 CSS — resolved absolute values

```css
.form-vertical {
  display: block; position: static; box-sizing: border-box;
  width: 1810px; height: 170px;
  margin: 0; padding: 0; border: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  overflow: visible;
}

/* .form-group.m0 — zero margin, and zero HEIGHT because both children float / are tables */
.form-group.m0 { display: block; width: 1810px; height: 0; margin: 0; padding: 0; border: 0; }

label.col-sm-2.control-label {
  display: block;
  position: relative; top: 0; right: 0; bottom: 0; left: 0;
  float: left; box-sizing: border-box;
  width: 301.664px;              /* = 16.6667% of 1810 */
  height: 20px;
  max-width: 100%; min-height: 1px;
  margin: 0 0 5px 0;
  padding: 0 15px 0 15px;
  border: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 14px;
  font-weight: 700;              /* labels are BOLD */
  line-height: 20px;
  text-align: start; white-space: normal;
  cursor: default;
  overflow: visible;
}

div.col-sm-10 {
  display: block;
  position: relative; top: 0; right: 0; bottom: 0; left: 0;
  float: left; box-sizing: border-box;
  width: 1508.33px;              /* = 83.3333% of 1810 */
  height: 34px;
  min-height: 1px;
  margin: 0; padding: 0 15px 0 15px; border: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
}

p.form-control-static {
  display: block; position: static; box-sizing: border-box;
  width: 1478.33px; height: 34px; min-height: 34px;
  margin: 0;
  padding: 7px 0 7px 0;
  border: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
}

/* x-editable inline-edit anchor */
a.editable.editable-click {
  display: inline;
  position: static; float: none; box-sizing: border-box;
  width: auto; height: auto;
  margin: 0; padding: 0;
  border: 0;
  border-bottom: 1px dashed rgb(66, 139, 202);   /* only the bottom edge has width */
  border-top-color: rgb(10, 10, 10);
  border-right-color: rgb(10, 10, 10);
  border-left-color: rgb(10, 10, 10);
  background-color: rgba(0, 0, 0, 0);
  color: rgb(10, 10, 10);                        /* near-black, NOT link blue */
  outline-color: rgb(10, 10, 10);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  text-decoration-line: none;
  cursor: pointer;
}

.input-group {
  display: table;                                /* Bootstrap 3 table layout — NOT flex */
  position: relative; top: 0; right: 0; bottom: 0; left: 0;
  box-sizing: border-box;
  width: 1508.34px; height: 34px;
  margin: 0; padding: 0; border: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
}

.input-group > input.form-control.col-md-6 {
  display: block;                                /* resolved display is `block` */
  position: relative; top: 0; right: 0; bottom: 0; left: 0;
  z-index: 2;
  float: left; box-sizing: border-box;
  height: 34px; min-height: 1px;
  margin: 0;
  padding: 6px 18px 6px 18px;                    /* 18px sides, NOT Bootstrap's 12px */
  border: 1px solid rgb(219, 217, 217);
  border-top-left-radius: 4px; border-bottom-left-radius: 4px;
  border-top-right-radius: 0;   border-bottom-right-radius: 0;
  background-color: rgb(238, 238, 238);          /* readonly grey */
  color: rgb(85, 85, 85);
  outline-color: rgb(85, 85, 85);
  font: 400 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif;
  text-align: start; white-space: normal;
  overflow: clip;
  box-shadow: rgb(0, 0, 0) 0px 0px 0px 0px;      /* degenerate — paints nothing */
  cursor: text;
  appearance: none;
  transition-property: border-color, box-shadow;
  transition-duration: 0.15s, 0.15s;
}
.input-group > input#webinarLinkTxt { width: 1431.99px; }
.input-group > input#customLinkTxt  { width: 1364.72px; }
.input-group > input#uniqueLinkTxt  { width: 1332.54px; }

.input-group > span.input-group-btn {
  display: table-cell;
  position: relative; top: 0; right: 0; bottom: 0; left: 0;
  box-sizing: border-box;
  height: 34px;
  margin: 0; padding: 0; border: 0;
  background-color: rgba(0, 0, 0, 0);
  color: rgb(51, 51, 51);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 0px;                                /* kills inter-button whitespace */
  line-height: 0px;
  white-space: nowrap;
  vertical-align: middle;
}
/* measured cell widths */
.input-group:nth-of-type(1) > .input-group-btn { width:  76.3438px; }
.input-group:nth-of-type(2) > .input-group-btn { width: 143.617px;  }
.input-group:nth-of-type(3) > .input-group-btn { width: 175.797px;  }

.input-group-btn > .btn {
  display: inline-block;
  position: relative; top: 0; right: 0; bottom: 0; left: 0;
  z-index: 2;
  float: none; box-sizing: border-box;
  height: 34px;
  margin: 0 0 0 -1px;                            /* overlap the previous edge */
  padding: 6px 12px 6px 12px;
  border: 1px solid;
  border-top-left-radius: 0; border-bottom-left-radius: 0;
  color: rgb(255, 255, 255);
  outline-color: rgb(255, 255, 255);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 14px; font-weight: 400; line-height: 20px;
  text-align: center; white-space: nowrap; vertical-align: middle;
  cursor: pointer; user-select: none;
  transition: all 0s;
}
/* only the LAST button in a cell gets the right radius */
.input-group-btn > .btn.btn-info {
  width: 77.3438px;
  border-color: rgb(70, 184, 218);
  background-color: rgb(91, 192, 222);
  border-top-right-radius: 4px; border-bottom-right-radius: 4px;
}
.input-group-btn > .btn.btn-warning {           /* "Edit" — NO right radius */
  width: 68.2734px;
  border-color: rgb(238, 162, 54);
  background-color: rgb(240, 173, 78);
  border-top-right-radius: 0; border-bottom-right-radius: 0;
}
.input-group-btn > .btn.btn-primary {           /* "Generate" — NO right radius */
  width: 100.453px;
  border-color: rgb(46, 109, 164);
  background-color: rgb(51, 122, 183);
  border-top-right-radius: 0; border-bottom-right-radius: 0;
}

.input-group-btn .fa {
  display: inline-block;
  width: 14px; height: 14px;                     /* fa-link is 13px wide */
  font-family: FontAwesome; font-size: 14px; line-height: 14px;
  color: rgb(255, 255, 255);
  text-align: center; white-space: nowrap;
  cursor: pointer; user-select: none;
  transform: matrix(1, 0, 0, 1, 0, 0);
}
.input-group-btn .fa-copy::before { content: "\f0c5"; }
.input-group-btn .fa-edit::before { content: "\f044"; }
.input-group-btn .fa-link::before { content: "\f0c1"; width: 13px; }
```

### 7.3 Non-obvious things a rebuild will get wrong if it guesses

* **`.input-group` is `display: table` and `.input-group-btn` is `display: table-cell`.** There is no flexbox anywhere on this page (every flex property in `DEFAULTS.txt` shows `2156/2156` at the initial value). Reproduce with `display:table` or the widths will not match.
* **The readonly inputs use `padding: 6px 18px`, not Bootstrap's default `6px 12px`.** The buttons *do* use `6px 12px`. This asymmetry is measured, not assumed.
* **The readonly input border colour is `rgb(219, 217, 217)`** (a warm grey), not Bootstrap's `#ccc`. Background `rgb(238, 238, 238)`, text `rgb(85, 85, 85)`.
* **Every `.input-group` input resolves to `display: block` + `float: left`, not `table-cell`** — only the `.input-group-btn` span is a table cell. That is why the input's width is an explicit pixel value and the cell shrink-wraps the rest.
* **Only the *last* button in a button cell has right-hand corner radii.** `Edit` and `Generate` have `border-*-right-radius: 0`; the trailing `Copy` has `4px`.
* **The `.form-group.m0` wrappers have `height: 0`** — both children are out of normal flow (`float:left` label, `display:table` field wrapper). The 34px row rhythm comes from the children, not the wrappers. `m0` = margin 0 on all four sides.
* **The three link rows (`Room` / `Vanity` / `Unique`) are NOT wrapped in `.form-group`** — they are bare `<label>` + `<div class="input-group">` sibling pairs inside `#57`. Only the Room Title and Authorization Mode rows use `.form-group.m0`.
* **`x-editable` anchors are `rgb(10, 10, 10)` with a `1px dashed rgb(66, 139, 202)` bottom border only.** No underline (`text-decoration-line: none`), no link blue.
* **Control labels are `font-weight: 700`** and carry `margin-bottom: 5px` + `padding: 0 15px` + `max-width: 100%` + `min-height: 1px` + `cursor: default`.
* `#57` carries an **empty** `class=""` and an **empty** `style=""` — Angular's `ng-show` removed `ng-hide` and cleared the inline display. Both attributes exist and are empty in the DOM.
* The hidden `#161` "Event Time" input is a **native, unstyled** `<input>` — `border: 2px inset rgb(118,118,118)`, `padding: 1px 2px`, `background: rgb(255,255,255)`, `appearance: auto`. It has no `form-control` class. This is a real styling bug in the original; reproduce only if matching that hidden state.

### 7.4 Conditional-visibility contract (verbatim from the DOM)

| node | directive | state at capture |
|---|---|---|
| `#54` | `ng-show="sess.roomType=='webinar'"` | false → `ng-hide`, `display:none` |
| `#56` | `ng-show="sess.authMode=='registrationA' \|\| sess.authMode=='registrationM'"` | false → `ng-hide`, `display:none` |
| `#57` | `ng-show="sess.authMode=='webinarRoom' \|\| sess.authMode=='open' \|\| sess.authMode=='unamePW' \|\| sess.allowPWLoginWithSSO"` | **true** → visible |
| `#90` | `ng-show="sess.hasAppPairLink"` | false → `ng-hide`, `display:none` |
| `#40` | `ng-show="dataLoading"` | false → `ng-hide`, `display:none` |
| `#192` | `ng-show="!webinarTimeTxt"` | true (but ancestor is hidden) |
| `#193` | `ng-show="webinarTimeTxt"` | false → `ng-hide` |

Inline-edit contract:
* `#154` — `editable-text="sess.name"`, `onaftersave="saveSessField('name')"`
* `#155` — `editable-combodate="sess.webinarDate"`, `onaftersave="saveSessField('webinarDate')"`, `e-min-year="2026"`, `e-max-year="2028"`, `e-data-format="DD-MM-YYYY h:mm a"`, `data-format="DD-MM-YYYY +-HH:mm"`
* `#158` — `editable-select="sess.authMode "` (note the **trailing space**), `e-ng-options="s.value as s.text for s in sessAuthTypes "` (also trailing space), `onaftersave="saveSessField('authMode')"`

Click handlers: `copyLinkToClipboard('webinarLinkTxt' | 'customLinkTxt' | 'uniqueLinkTxt' | 'webinarRegLinkTxt' | 'appPairLink')` are **`onclick`** (native), while `setCustomRoomURL()`, `setUniqueRoomURL()` and `sendWeminarEmailReminder(webinarTimeTxt)` are **`ng-click`**.

---

## 8. Honest gaps

1. **`sessAuthTypes` — the option list behind the Authorization Mode select — is not in the DOM.** Only the currently-selected label is captured: `"Open - Anyone with the room link can join with their email & name"`. The other auth modes are known only by the string literals appearing in `ng-show` expressions: `webinarRoom`, `open`, `unamePW`, `sso`, `registrationA`, `registrationM` (the last two from `#56`, `sso` from P05's `#94`). Their human-readable labels and their `value`s are **unknown**. Do not invent them.
2. **The x-editable popover/editor UI is not captured.** No editor was open, so the inline-edit input, its buttons and its positioning are absent.
3. **Hidden-branch geometry is unknown.** All 26 `display:none` nodes report `rect 0,0,0,0` and percentage widths (`16.6667%`, `83.3333%`, `66.6667%`, `1%`). If the rebuild needs to render the webinar-date, registration-link or app-pair-link states pixel-perfectly, **this capture does not contain that evidence** — a second capture in those states is required.
4. **`app/img/ajax_loader.gif` (`#58`) is a relative path with no leading slash**, unlike every other asset in the capture (`/public/images/…`). Whether it resolves is unverifiable from a DOM dump; it is never rendered here.
5. **No hover/focus/active states** for any input or button; `transition-property: border-color, box-shadow` / `0.15s` on the inputs tells us a focus transition exists but not its target values.
6. **`#161`'s `value=""`** — the Event Time field is genuinely empty, which is why `#192 "FILL TIME ABOVE"` is the shown `<strong>`. Not a capture gap, just the real empty state.
7. The **exact text/icon interleaving inside the buttons** is reconstructed from rect geometry (icon box flush to the content-box right edge), not from a recorded child-order + text-node listing. The geometry is unambiguous, but noting it as derived rather than directly recorded.
8. `<muted>` (`#157`) is a **non-standard element name** (not `<small class="text-muted">`); it resolves to `display: inline` with no styling deviations at all, i.e. it is an unknown element that inherits everything. Its intended styling (if any CSS targets `muted`) cannot be confirmed because it is `display:none` at capture time.
