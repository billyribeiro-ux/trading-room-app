# The mobile app, as the v4 room client sees it — decoded

Decoded 2026-08-15 from `apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`
(2,891,205 bytes), the **current** v4 build, compared against
`apps/room/docs/source/main.d6d3c112b59b7d0d.js` (2,887,876 bytes), the older build.

This is a companion to `docs/MOBILE-APP.md`, not a replacement. That document is sourced from the
reference's **manage page**, its **API docs** and **this repository's own server code**. This one is
sourced from the **room client bundle only**, which is a different and much narrower window. §3 is
the three-way cross-check between them and is the part worth reading first if you already know the
other document.

Byte offsets are into the v4 bundle unless another file is named. Line references into
`docs/MOBILE-APP.md` are `MOBILE-APP.md:<line>`.

---

## 0. What was read

**`apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`** — these ranges, opened and read in
full, not searched:

| range | what is there |
| --- | --- |
| 980,600–981,200 | the `globals` field list, where `this.fcmToken=""` is declared |
| 989,700–991,200 | the socket service: `serverInvoke`, `send`, `sendAdminCmd`, `disconnect` |
| 1,020,600–1,022,200 | the inbound server-command switch, including `case"getMyMobilePin"` |
| 1,157,200–1,157,500 | where `globals.user.isFT` is built from the decoded session token |
| 1,159,600–1,160,300 | `sendServerCommand` / `sendServerAdminCommand` / `invokeServerCommand` |
| 2,313,400–2,319,600 | `Vxe` and the whole `app-mobile-app-info-modal` component: class, consts, template, styles |
| 2,433,700–2,434,400 | the troubleshooter tab-label sub-templates `dAe`, `uAe`, `hAe`, `pAe` |
| 2,435,300–2,440,400 | `AAe` (network pane) and `PAe` (the mobile pane) |
| 2,442,300–2,443,400 | `KAe`, `XAe`, `JAe` — the mic pane and the two footers |
| 2,443,600–2,446,600 | the troubleshooter class: field list, `ngOnInit`, `onTabChange`, `restoreMobileAppTokens`, `runWebRTCTest` |
| 2,452,700–2,458,400 | `selectors:[["app-webrtc-troubleshooter"]]`, its complete `consts` array (85 entries, extracted and indexed), and its `template` |
| 2,456,846–2,465,684 | the troubleshooter inline `styles` array, read end to end (8,838 bytes) |
| 2,465,700–2,467,000 | `sPe` / `rPe` — the sidebar "Mobile App Info" button |
| 2,468,600–2,472,600 | `TPe` and its update block, for the sidebar gates |
| 2,472,400–2,474,400 | `xPe` — the navbar mobile icon |
| 2,484,200–2,489,200 | `U4e` and its update block, for the navbar gates |
| 2,496,200–2,500,600 | the `app-room` class constructor and `ngOnInit` |
| 2,528,500–2,530,200 | `getMyPinAndDoInfo()` in `app-room` |
| 2,532,814–2,546,832 | the `app-room` `consts` array (229 entries, indexed) |
| 2,548,483–2,561,757 | the `app-room` inline `styles` array, read end to end (13,274 bytes) |
| 2,562,850–2,564,100 | `pRe` / `fRe` — the closed-session "Mobile App Info" button |
| 2,566,200–2,568,100 | the `app-closed-session-page` class, including its `getMyPinAndDoInfo()` |
| 2,571,100–2,576,030 | the `app-closed-session-page` `consts` array (77 entries, indexed) |
| 2,576,050–2,578,600 | the closed-session main template and update block |
| 2,578,795–2,590,812 | the closed-session inline `styles` array, read end to end (12,017 bytes) |

**`apps/room/docs/source-v4-2026-08-15/styles.ee2a710065b60389.css`** (444,793 bytes) — every
occurrence of the substring `mobile` (8 of them, offsets 424,154 / 424,193 / 425,520 / 426,446 /
427,436 / 427,475 / 428,470 / 428,508) opened and read with its enclosing selector. All 8 are the
`--mobileApp-*` custom properties; see §2.7.

**`apps/room/docs/source/main.d6d3c112b59b7d0d.js`** — the older build. `selectors:[["app-webrtc-troubleshooter"]]`
at 2,450,019, its `consts` array, its `template`, and the class field list at 2,440,849 were read in
full so §2.8 states what changed rather than guessing.

**`docs/MOBILE-APP.md`** — read in full, 495 lines.

---

## 1. Presence check: what is actually NEW in v4

Counted over both files. This was run rather than taken on trust, because the whole framing of the
task rests on it.

| string | v4 bundle | older bundle | verdict |
| --- | --- | --- | --- |
| `mobile-app-container` | **2** — 2,453,615 and 2,454,040 | **0** | NEW |
| `restoreMobileAppTokens` | **3** — 2,438,516 / 2,444,920 / 2,444,979 | **0** | NEW |
| `fa-mobile-alt` | **1** — 2,453,564 | **0** | NEW |
| `"mobile"` (as a quoted literal) | **5** — 2,444,153 / 2,456,185 / 2,456,520 / 2,456,644 / 2,456,774 | **0** | NEW |
| `Restore Connectivity` | **1** — 2,438,562 | **0** | NEW |
| `Connectivity Troubleshooter` (without `/Mic`) | **1** | **0** | NEW |

And the mobile surface that is **not** new, so that the diff is honest:

| string | v4 | older |
| --- | --- | --- |
| `mobileAppInfoModal` | 7 | 7 |
| `ptrMobileAppEnabled` | 5 | 5 |
| `customMobileAppEnabled` | 6 | 6 |
| `freeTrialsGetApp` | 5 | 5 |
| `getMyPinAndDoInfo` | 5 | 5 |
| `getMyMobilePin` | 6 | 6 |
| `mobilePin` | 3 | 3 |
| `mobile-info-app-btn` | 4 | 4 |
| `Launch in Mobile App` | 2 | 2 |
| `Mobile App Info` | 2 | 2 |
| `Download our mobile apps` | 1 | 1 |
| `com.bellesoft.protradingroomv3` | 1 | 1 |
| `id1587924329` | 1 | 1 |
| `hideMobileCredentials` | 1 | 1 |
| `customMobileAppIOSUrl` | 1 | 1 |
| `customMobileAppAndroidUrl` | 1 | 1 |
| `isMobileScreen` | 6 | 6 |
| `fcmToken` | 1 | 1 |

**Everything new in v4 is one thing: a third tab inside the Connectivity troubleshooter modal.** The
pin flow, the store links and the credentials modal all predate it unchanged.

---

## 2. The feature, fully decoded

There are **five** distinct mobile surfaces in the v4 room client. Four predate v4; the fifth is new.

| # | surface | component | new in v4 |
| --- | --- | --- | --- |
| 2.1 | `app-mobile-app-info-modal` — the store links + credentials modal | its own component | no |
| 2.2 | the top-navbar `fa-mobile` icon | `app-room` | no |
| 2.3 | the sidebar "Mobile App Info" button | `app-room` | no |
| 2.4 | the closed-session "Mobile App Info" button | `app-closed-session-page` | no |
| 2.5 | the **Mobile App tab** in the troubleshooter | `app-webrtc-troubleshooter` | **YES** |

### 2.1 `app-mobile-app-info-modal` — the modal everything else opens

`selectors:[["app-mobile-app-info-modal"]]` at 2,316,546. `decls:17, vars:3`.

**The class**, verbatim from 2,315,940–2,316,300:

```js
constructor(e){
  this.appService=e,
  this.androidLink="https://play.google.com/store/apps/details?id=com.bellesoft.protradingroomv3",
  this.iosLink="https://apps.apple.com/us/app/pro-trading-room-v3/id1587924329",
  this.mobilePin="N/A"
}
ngOnInit(){
  this.appService.appEventBus.subscribe("getMyMobilePin",e=>{this.mobilePin=e.pin}),
  this.appService.globals.sessData.customMobileAppEnabled &&
    (this.androidLink=this.appService.globals.sessData.customMobileAppAndroidUrl,
     this.iosLink=this.appService.globals.sessData.customMobileAppIOSUrl)
}
```

- `this.androidLink=` @ 2,315,962, `this.iosLink=` @ 2,316,058, `this.mobilePin="N/A"` @ 2,316,136
- the event-bus subscription @ 2,316,168, `this.mobilePin=e.pin` @ 2,316,227
- the `customMobileAppEnabled` swap @ 2,316,283

**The default app is named in the bundle.** Google Play package `com.bellesoft.protradingroomv3`
(2,316,026); App Store path `/us/app/pro-trading-room-v3/id1587924329` (2,316,122).

**Every const resolved**, from the array at 2,316,611–2,317,329:

| index @ offset | tuple, verbatim |
| --- | --- |
| 0 @ 2,316,612 | `["id","mobileAppInfoModal","tabindex","-1","aria-labelledby","mobileAppInfoLabel","aria-hidden","true",1,"modal","fade"]` |
| 1 @ 2,316,733 | `[1,"modal-dialog"]` |
| 2 @ 2,316,752 | `[1,"modal-content"]` |
| 3 @ 2,316,772 | `[1,"modal-header"]` |
| 4 @ 2,316,791 | `["id","mobileAppInfoLabel",1,"modal-title"]` |
| 5 @ 2,316,835 | `["type","button","data-bs-dismiss","modal","aria-label","Close",1,"btn-close","btn-close-white"]` |
| 6 @ 2,316,932 | `[1,"modal-body"]` |
| 7 @ 2,316,949 | `[1,"d-flex","align-items-center","justify-content-evenly","m-3","mb-4"]` |
| 8 @ 2,317,021 | `["target","_blank","type","button",3,"href"]` |
| 9 @ 2,317,066 | `["src","/assets/images/google-play-badge.png","alt","Google Play Badge",1,"google-badge"]` |
| 10 @ 2,317,156 | `["src","/assets/images/iosAppStore.svg","alt","App Store Badge"]` |
| 11 @ 2,317,221 | `[1,"mt-2"]` |
| 12 @ 2,317,232 | `[1,"modal-footer"]` |
| 13 @ 2,317,251 | `["type","button","data-bs-dismiss","modal",1,"btn","btn-secondary"]` |
| 14 @ 2,317,319 | `[1,"my-4"]` |

**The template**, from 2,317,330 onwards:

```js
d(0,"div",0)(1,"div",1)(2,"div",2)(3,"div",3)(4,"h5",4),
  v(5," Download our mobile apps "),u(),                 // @ 2,317,416
  T(6,"button",5),u(),
d(7,"div",6)(8,"div",7)(9,"a",8),T(10,"img",9),u(),
                     d(11,"a",8),T(12,"img",10),u()(),
  H(13,Vxe,14,2,"div",11),u(),
d(14,"div",12)(15,"button",13),v(16," Close "),u()()()()()
// update block:
m(9),xn("href",o.androidLink,Mt),
m(2),xn("href",o.iosLink,Mt),
m(2),O(13,o.appService.globals.sessData.hideMobileCredentials?-1:13)   // @ 2,317,719
```

**The credentials block `Vxe`** (2,315,554), which is what `hideMobileCredentials` switches off:

```js
function Vxe(t,n){
  if(1&t&&(d(0,"div",11),T(1,"hr"),
    d(2,"h5",14),v(3," To login to the app use the following credentials: "),u(),
    d(4,"div",11)(5,"strong"),v(6,"Email: "),u(),d(7,"span"),v(8),u()(),
    d(9,"div",11)(10,"strong"),v(11,"Pin Code: "),u(),d(12,"span"),v(13),u()()),2&t){
    const e=g();
    m(8),Ze(e.appService.globals.user.email),
    m(5),Ze(e.mobilePin)
  }
}
```

Verbatim label strings, spaces included: `" To login to the app use the following credentials: "`
(@ 2,315,618), `"Email: "` (@ 2,315,708), `"Pin Code: "` (@ 2,315,777).

**Its only style rule**, at 2,317,785:

```css
.google-badge[_ngcontent-%COMP%]{width:auto;height:100%;max-height:60px}
```

Both badge assets exist in this repository already: `apps/room/static/assets/images/google-play-badge.png`
and `apps/room/static/assets/images/iosAppStore.svg`.

The modal is instantiated in both chromes: `T(21,"app-mobile-app-info-modal")` in the `app-room` root
template @ 2,547,354, and `T(67,"app-mobile-app-info-modal")` in the closed-session template
@ 2,577,516.

### 2.2 The top-navbar icon — `xPe`

```js
// 2,472,654
function xPe(t,n){
  if(1&t){const e=Y();
    d(0,"span",137),x("click",function(){return D(e),E(g(2).getMyPinAndDoInfo())}),u()
  }
}
```

Const 137 @ 2,541,704 (`app-room` array):

```js
["title","Launch in Mobile App","data-bs-toggle","modal","data-bs-target","#mobileAppInfoModal",
 1,"fas","fa-mobile","mr-1","mobile-info-app-btn",3,"click"]
```

```html
<span title="Launch in Mobile App"
      data-bs-toggle="modal" data-bs-target="#mobileAppInfoModal"
      class="fas fa-mobile mr-1 mobile-info-app-btn"
      (click)="getMyPinAndDoInfo()"></span>
```

**The icon is `fas fa-mobile`, not `fa-mobile-alt`.** `fa-mobile-alt` occurs exactly once in the whole
bundle, at 2,453,564, and that is the troubleshooter tab (§2.5). This distinction is easy to lose:
the navbar element uses the icon classes *as the element's own class list* — there is no inner `<i>`,
the `<span>` is the icon.

Const 81 @ 2,537,902 is the same tuple **without** the `3,"click"` binding — a variant of the same
element with no handler. Its consuming template was not located; see §5.

The element opens the Bootstrap modal declaratively (`data-bs-toggle`), **and** fires
`getMyPinAndDoInfo()` — the pin request rides alongside the modal open rather than being what opens
it.

### 2.3 / 2.4 The "Mobile App Info" buttons

`app-room`, `sPe` @ 2,466,072 wrapped by `rPe` @ 2,466,315:

```js
function sPe(t,n){
  if(1&t){const e=Y();
    d(0,"button",33),x("click",function(){return D(e),E(g(3).getMyPinAndDoInfo())}),
    v(1," Mobile App Info "),u()          // @ 2,466,190
  }
  if(2&t){const e=g(3);
    z("ngClass",ct(1,qB,"darkTheme"==e.appService.globals.preferences.theme))
  }
}
function rPe(t,n){
  if(1&t&&(d(0,"p"),H(1,sPe,2,3,"button",32),u()),2&t){const e=g(2);
    m(),O(1,!e.appService.globals.sessData.ptrMobileAppEnabled
           &&!e.appService.globals.sessData.customMobileAppEnabled
           ||e.appService.globals.user.isFT
           &&!e.appService.globals.sessData.freeTrialsGetApp ? -1 : 1)   // @ 2,466,403
  }
}
```

| const @ offset | tuple, verbatim |
| --- | --- |
| 32 @ 2,534,772 | `["type","button","data-bs-toggle","modal","data-bs-target","#mobileAppInfoModal",1,"btn","btn-sm","btn-secondary",3,"ngClass"]` |
| 33 @ 2,534,899 | same tuple plus `3,"click","ngClass"` |

`qB` is defined at 2,465,859: `qB=t=>({"btn-dark":t})`. So the button gains `btn-dark` when
`preferences.theme == "darkTheme"`.

`rPe` is placed in the sidebar by `TPe` at index 12 and gated a second time:

```js
O(12,e.appService.globals.sessData.hideAppInfo?-1:12)     // @ 2,471,575
```

`app-closed-session-page` carries the identical pair, `pRe` @ 2,563,041 / `fRe` @ 2,563,284, consts
48 @ 2,573,952 and 49 @ 2,574,079, the same gate at 2,563,371, and the same `hideAppInfo` wrapper at
2,578,201 — with **one verbatim difference**:

| component | button text, exactly |
| --- | --- |
| `app-room` (`v(1," Mobile App Info ")` @ 2,466,190) | `" Mobile App Info "` — leading **and** trailing space |
| `app-closed-session-page` (`v(1," Mobile App Info")` @ 2,563,159) | `" Mobile App Info"` — leading space only |

### 2.5 The Mobile App tab — the new v4 surface

Component `app-webrtc-troubleshooter`, `selectors` @ 2,452,797, `decls:21, vars:10`.

**The tab strip**, from the template at 2,455,940 onwards:

```js
d(8,"ul",7),
  H(9,hAe,4,2,"li",8),                                    // Network Test — *ngIf isPresenter
  d(10,"li",9)(11,"button",10),
    x("click",function(){return o.onTabChange("mobile")}),// @ 2,456,143
    T(12,"i",11),
    v(13," Mobile App "),                                 // @ 2,456,210
  u()(),
  H(14,pAe,4,2,"li",8),                                   // Mic Test — *ngIf isPresenter
u(),
d(15,"div",12),
  H(16,AAe,36,57,"div",13)                                // network pane
   (17,PAe,6,0,"div",14)                                  // MOBILE pane
   (18,KAe,4,3,"div",15),                                 // mic pane
u(),
H(19,XAe,10,4,"div",16)(20,JAe,3,0,"div",16)              // two footers
```

Update block, verbatim:

```js
m(5),O(5,o.appService.globals.isPresenter?5:6),
m(4),z("ngIf",o.appService.globals.isPresenter),          // Network Test tab
m(2),Tt("active","mobile"===o.activeTab),                 // @ 2,456,508
m(3),z("ngIf",o.appService.globals.isPresenter),          // Mic Test tab
m(2),z("ngIf","network"===o.activeTab),
m(),  z("ngIf","mobile"===o.activeTab),                   // @ 2,456,635
m(),  z("ngIf","mic"===o.activeTab),
m(),  z("ngIf","network"===o.activeTab),
m(),  z("ngIf","mic"===o.activeTab||"mobile"===o.activeTab)  // @ 2,456,744
```

**Every const resolved**, from the array at 2,452,960–2,455,947:

| index @ offset | tuple, verbatim |
| --- | --- |
| 7 @ 2,453,351 | `["role","tablist",1,"nav","nav-tabs","troubleshooter-tabs"]` |
| 8 @ 2,453,411 | `["class","nav-item","role","presentation",4,"ngIf"]` |
| 9 @ 2,453,463 | `["role","presentation",1,"nav-item"]` |
| 10 @ 2,453,500 | `["type","button","role","tab",1,"nav-link",3,"click"]` |
| 11 @ 2,453,554 | `[1,"fas","fa-mobile-alt","me-1"]` |
| 12 @ 2,453,587 | `[1,"modal-body"]` |
| 13 @ 2,453,604 | `[4,"ngIf"]` |
| 14 @ 2,453,615 | `["class","mobile-app-container",4,"ngIf"]` |
| 15 @ 2,453,657 | `["class","mic-test-container",4,"ngIf"]` |
| 16 @ 2,453,697 | `["class","modal-footer",4,"ngIf"]` |
| 17 @ 2,453,731 | `[1,"fas","fa-network-wired","me-1"]` |
| 18 @ 2,453,767 | `[1,"fas","fa-microphone","me-1"]` |
| 19 @ 2,453,800 | `[1,"text-muted","mb-4"]` |
| 26 @ 2,454,040 | `[1,"mobile-app-container"]` |
| 27 @ 2,454,067 | `["type","button",1,"btn","btn-primary",3,"click"]` |
| 28 @ 2,454,117 | `[1,"fas","fa-sync-alt","me-1"]` |
| 77 @ 2,455,633 | `[1,"modal-footer"]` |
| 83 @ 2,455,860 | `["type","button","data-bs-dismiss","modal",1,"btn","btn-secondary"]` |

So `fa-mobile-alt` labels **the tab button**, next to the text `" Mobile App "`:

```html
<li role="presentation" class="nav-item">
  <button type="button" role="tab" class="nav-link" [class.active]="activeTab==='mobile'"
          (click)="onTabChange('mobile')">
    <i class="fas fa-mobile-alt me-1"></i> Mobile App
  </button>
</li>
```

**What `mobile-app-container` renders — `PAe` @ 2,438,242, verbatim:**

```js
function PAe(t,n){
  if(1&t){const e=Y();
    d(0,"div",26)(1,"p",19),
      v(2," Use this to restore your mobile app connectivity and get a test notification on your device. Only do this if you are not getting notifications "),
    u(),
    d(3,"button",27),x("click",function(){return D(e),E(g().restoreMobileAppTokens())}),
      T(4,"i",28),
      v(5," Restore Connectivity "),
    u()()
  }
}
```

```html
<div class="mobile-app-container">
  <p class="text-muted mb-4"> Use this to restore your mobile app connectivity and get a test notification on your device. Only do this if you are not getting notifications </p>
  <button type="button" class="btn btn-primary" (click)="restoreMobileAppTokens()">
    <i class="fas fa-sync-alt me-1"></i> Restore Connectivity
  </button>
</div>
```

The body copy is at 2,438,310 and the button label `" Restore Connectivity "` at 2,438,562. Note the
missing full stop after `notifications` — that is the reference's, reproduce it.

**The whole pane is one paragraph and one button. There is no pin display, no token list, no
platform picker and no pairing UI on this tab.** Read end to end; nothing else is in `PAe`.

**When the tab is shown:** always. `d(10,"li",9)` is emitted unconditionally — it is the only one of
the three tabs not wrapped in an `H(...)` with an `ngIf`. Both `hAe` (Network Test) and `pAe` (Mic
Test) are gated on `o.appService.globals.isPresenter`.

**And it is not gated by any mobile room setting.** Neither `ptrMobileAppEnabled` nor
`customMobileAppEnabled` nor `freeTrialsGetApp` appears anywhere in the troubleshooter component
(2,433,700–2,465,684, read in full). Every other mobile control in the bundle carries that
four-term gate; this one carries none. A member of a room with the app disabled still sees a **Mobile
App** tab and a working **Restore Connectivity** button.

**Which tab opens first**, at 2,444,092:

```js
this.activeTab = this.appService.globals.isPresenter ? "network" : "mobile"
```

A non-presenter opening the troubleshooter lands on the Mobile App tab, and — because Network Test
and Mic Test are presenter-only — that is the **only** tab they have.

**The modal title changes with it**, `dAe` @ 2,433,777 and `uAe` @ 2,433,841:

| viewer | title, verbatim |
| --- | --- |
| presenter (`O(5,isPresenter?5:6)`) | `" Connectivity/Mic Troubleshooter "` |
| non-presenter | `" Connectivity Troubleshooter "` |

**The footer on this tab** is `JAe` @ 2,443,231 — `<div class="modal-footer"><button type="button" data-bs-dismiss="modal" class="btn btn-secondary"> Close </button></div>`. The
network tab's footer (`XAe` @ 2,442,736, with Start Test / Copy Results / Close) does not render here.

**`onTabChange`** @ 2,444,820:

```js
onTabChange(e){ e!==this.activeTab && ("mic"===this.activeTab && this.cleanupMicTest(), this.activeTab=e) }
```

Leaving the mic tab tears the mic test down. Leaving the mobile tab does nothing — there is nothing
to tear down.

**How the modal is reached:** the sidebar item `["title","Connectivity Check","data-bs-toggle","modal","data-bs-target","#webrtc-troubleshooter-modal",1,"nav-link","sidebar-item"]`
(`app-room` const 20), emitted unconditionally in `TPe` with the label `"Connectivity Check"`
(@ 2,470,954). `T(34,"app-webrtc-troubleshooter")` in the `app-room` root template @ 2,547,731 and
`T(70,"app-webrtc-troubleshooter")` in the closed-session template @ 2,577,607.

### 2.6 Wire commands — two out, one in

`sendServerCommand` @ 2,528,987+ resolves through `AppService.sendServerCommand(e,i)` @ 1,159,780:

```js
sendServerCommand(e,i){ P(`sendServerCmd: ${e}. data:`,i), this.socketService.send(e,i) }
```

and `SocketService.send` @ 990,323:

```js
send(e,i={}){ try{ this.socket.transmit("cmd",{cmd:e,data:i}) }catch{} }
```

So both commands go out on the socket channel `"cmd"` with the envelope `{cmd, data}`. **`send`
swallows every throw** — a `try{}catch{}` with an empty body. Anything modelled on this has to keep
that in mind; it fails silently by construction.

#### Outbound 1 — `getMyMobilePin`

```js
getMyPinAndDoInfo(){
  var e=this;
  return I(function*(){
    (e.appService.globals.sessData.ptrMobileAppEnabled || e.appService.globals.sessData.customMobileAppEnabled)
    && (!e.appService.globals.user.isFT || e.appService.globals.sessData.freeTrialsGetApp)
    && e.appService.sendServerCommand("getMyMobilePin",null)
  })()
}
```

Defined twice, identically: `app-room` @ 2,528,987 (the `sendServerCommand` call at 2,529,229) and
`app-closed-session-page` @ 2,567,684 (call at 2,567,926).

Wire: `socket.transmit("cmd", { cmd: "getMyMobilePin", data: null })`. The `null` is passed
explicitly, so the `i={}` default does not apply — `data` is `null`, not `{}`.

**The gate is re-checked inside the method**, not only in the template. The button and the icon are
already hidden by the same condition; the method refuses again. That is a deliberate belt-and-braces
and it is worth keeping.

#### Outbound 2 — `restoreMobileAppTokens` (new in v4)

```js
// 2,444,920
restoreMobileAppTokens(){
  this.appService.sendServerCommand("restoreMobileAppTokens",{}),
  bootbox.alert("Command sent successfully, check your mobile device for a test notification")
}
```

- `sendServerCommand(...)` @ 2,444,945, the command string `"restoreMobileAppTokens"` @ 2,444,979
- `bootbox.alert(...)` @ 2,445,008

Wire: `socket.transmit("cmd", { cmd: "restoreMobileAppTokens", data: {} })`.

**It takes no arguments and sends no payload.** The server identifies the caller from the socket
session. And the confirmation is unconditional — `bootbox.alert` fires on the next statement, with no
callback, no acknowledgement and no error path. The dialog says the command was sent successfully
whether or not the transmit inside `send()` threw.

Verbatim alert text: `Command sent successfully, check your mobile device for a test notification`.

#### Inbound — `getMyMobilePin`

In the socket receiver switch, @ 1,021,485:

```js
case"getMyMobilePin":
  console.log("socket getMyMobilePin data:",i),
  this.appEventBus.emit("getMyMobilePin",i);
  break;
```

The modal's subscription (@ 2,316,168) takes `e.pin`. So the inbound message carries at least
`{ pin: <value> }`. **The bundle does not constrain the pin's type, length or format** — `mobilePin`
is initialised to the string `"N/A"` and then assigned `e.pin` verbatim, rendered through `Ze(...)`.
Six digits is not established here; see §3.

**There is no inbound handler for `restoreMobileAppTokens`.** Its three occurrences are the template,
the method and the command string. The switch at 1,020,600–1,022,200 was read in full and has no such
case. The response, if there is one, arrives as a push notification on the phone — which is what the
UI copy claims.

### 2.7 CSS — every rule, and two that do not exist

**`.mobile-app-container` has NO rule anywhere.** The substring occurs exactly twice in the whole
bundle — 2,453,615 (const 14) and 2,454,040 (const 26) — and both are const tuples. The
troubleshooter's own `styles` array (2,456,846–2,465,684, 8,838 bytes) was read end to end and does
not contain it. `styles.ee2a710065b60389.css` does not contain it. **The container div is unstyled**;
its children get their layout from Bootstrap (`text-muted mb-4`, `btn btn-primary`).

**`.mobile-info-app-btn` — one rule, two identical copies:**

```css
.mobile-info-app-btn[_ngcontent-%COMP%]:hover{cursor:pointer}
```
- @ 2,548,793, in the `app-room` styles array
- @ 2,579,105, in the `app-closed-session-page` styles array

That is the whole rule. No base `.mobile-info-app-btn` declaration exists — only the `:hover`.

**`.mobile-app-info` — two rules, and nothing carries the class:**

```css
.mobile-app-info[_ngcontent-%COMP%]{background-color:var(--mobileApp-info-bg-color);color:var(--mobileApp-info-color)}   /* @ 2,559,009 and 2,588,352 */
.mobile-app-info[_ngcontent-%COMP%]:hover{opacity:.9}                                                                    /* @ 2,559,127 and 2,588,470 */
```

The substring `mobile-app-info` occurs 7 times in the bundle: 2,316,563 / 2,547,358 / 2,577,520 are
the component **tag** `app-mobile-app-info-modal`, and the remaining 4 are these CSS rules. **No
const tuple in any of the three indexed consts arrays carries `mobile-app-info` as a class.** The two
rules have no subject in this bundle.

**The four custom properties**, in `styles.ee2a710065b60389.css`, all on line 20 (the file is
minified):

| offset | selector | declaration |
| --- | --- | --- |
| 424,154 | `:root` | `--mobileApp-info-bg-color: transparent` |
| 424,193 | `:root` | `--mobileApp-info-color: #676767` |
| 425,520 | `:root` | `--lightTheme-mobileApp-info-color: #676767 !important` |
| 426,446 | `:root` | `--darkTheme-mobileApp-info-color: #f4f4f4 !important` |
| 427,436 | `.lightTheme` | `--mobileApp-info-color: var(--lightTheme-mobileApp-info-color)` |
| 428,470 | `.darkTheme` | `--mobileApp-info-color: var(--darkTheme-mobileApp-info-color)` |

Note the naming: the CSS variables are `--mobileApp-*` (camel `A`) while the class is
`.mobile-app-info` (all-kebab). Both spellings are verbatim.

**`.troubleshooter-tabs`** — the rules that style the new tab, @ 2,456,848 onwards, the first five
declarations in the troubleshooter styles array (2,456,848 / 2,456,938 / 2,457,197 / 2,457,340 / 2,457,516):

```css
.troubleshooter-tabs[_ngcontent-%COMP%]{border-bottom:none;padding:.5rem 1rem 0;gap:.5rem}
.troubleshooter-tabs[_ngcontent-%COMP%] .nav-item[_ngcontent-%COMP%] .nav-link[_ngcontent-%COMP%]{border:none;border-radius:.5rem .5rem 0 0;color:#94a3b8;font-weight:600;font-size:.9rem;padding:.6rem 1.2rem;transition:all .25s ease;background:transparent}
.troubleshooter-tabs[_ngcontent-%COMP%] .nav-item[_ngcontent-%COMP%] .nav-link[_ngcontent-%COMP%]:hover{color:#e2e8f0;background:#ffffff0d}
.troubleshooter-tabs[_ngcontent-%COMP%] .nav-item[_ngcontent-%COMP%] .nav-link.active[_ngcontent-%COMP%]{color:#22d3ee;background:#22d3ee14;box-shadow:inset 0 -2px #22d3ee}
.troubleshooter-tabs[_ngcontent-%COMP%] .nav-item[_ngcontent-%COMP%] .nav-link[_ngcontent-%COMP%] i[_ngcontent-%COMP%]{font-size:.85rem}
```

These are byte-identical to the older bundle's copies — the tab styling was already there; v4 added a
third `<li>` that uses it.

### 2.8 What exactly changed in the troubleshooter between the two builds

Read from the older bundle: `selectors` @ 2,450,019, `consts` immediately after, `template` at
2,452,987, and the class field list containing `this.activeTab="network"` at 2,440,849.

| | older build | v4 build |
| --- | --- | --- |
| tab count | 2 (`Network Test`, `Mic Test`) | 3 (+ `Mobile App`) |
| tab strip | the whole `<ul>` wrapped in `rAe` and gated `O(7,o.appService.globals.isPresenter?7:-1)` @ 2,453,281 — a non-presenter saw **no tabs at all** | `<ul>` emitted unconditionally; only the Network and Mic `<li>`s are presenter-gated |
| default tab | `this.activeTab="network"` (constant, @ 2,440,849) | `this.activeTab=this.appService.globals.isPresenter?"network":"mobile"` (@ 2,444,092) |
| modal title | one literal, `v(5,"Connectivity/Mic Troubleshooter")` @ 2,453,072 — no surrounding spaces | two branches, `" Connectivity/Mic Troubleshooter "` / `" Connectivity Troubleshooter "` — both padded |
| footer condition | `z("ngIf","mic"===o.activeTab)` | `z("ngIf","mic"===o.activeTab\|\|"mobile"===o.activeTab)` |
| `mobile-app-container`, `fa-mobile-alt`, `restoreMobileAppTokens` | absent | present |

**The behavioural change is larger than the new tab.** Before v4 a non-presenter opening the
troubleshooter got a modal with no tab strip. In v4 they get a tab strip with exactly one tab, and it
is the mobile one.

### 2.9 One field that is declared and never used

`this.fcmToken=""` at 981,028, inside the `globals` field list. **`fcmToken` occurs exactly once in
the v4 bundle and once in the older one.** It is never read and never assigned again. `fcm`, `FCM`,
`firebase`, `Firebase` and `messaging` have **0** other occurrences in the bundle.

The room web client does not participate in FCM. The field is a stub.

### 2.10 Do not confuse `isMobileScreen` with the mobile app

`this.isMobileScreen=this.onResizeChange=window.innerWidth<=601` at 2,498,388 in `app-room`'s
`ngOnInit`. Six occurrences, all layout. It is a viewport breakpoint and has nothing to do with the
phone app.

---

## 3. Three-way cross-check against `docs/MOBILE-APP.md`

Legend: **CONFIRMED** — bundle shows the same thing. **CONTRADICTED** — bundle shows something
different. **NOT IN BUNDLE** — the claim's evidence lives elsewhere and cannot be checked here; that
is not a failure of the claim. **BUNDLE GOES FURTHER** — bundle establishes more than the doc says.

| # | claim in the doc | what the v4 bundle shows | verdict |
| --- | --- | --- | --- |
| 1 | "**There is no mobile app.** No repository, no build, no submission." — `MOBILE-APP.md:10` | Scoped to this repository, the bundle says nothing either way. It does establish that the **reference's** app is published: Play package `com.bellesoft.protradingroomv3` @ 2,316,026, App Store `id1587924329` @ 2,316,122 | NOT IN BUNDLE (for this repo); BUNDLE GOES FURTHER on the reference's app |
| 2 | The five row-menu push actions (`getAppPin`, `showAlerterAppTokens`, `getFCMTokens`, `pauseUserNotifs`, `sendTestFCM`, `resetFCMForuser`) — `MOBILE-APP.md:26-33` | **0 occurrences** of any of those six names in either bundle. They belong to the manage page (`app.min.js`), not the room client | NOT IN BUNDLE |
| 3 | "Push is Firebase Cloud Messaging, and that is not a choice" — `MOBILE-APP.md:38` | The room client has one dead field, `this.fcmToken=""` @ 981,028, never read or written again; `fcm`/`FCM`/`firebase`/`messaging` have 0 other occurrences | NOT IN BUNDLE — but the dead `fcmToken` field is consistent with it, and is the only trace |
| 4 | `alerterAppTokens` / `alerterAppFCMUserOff` — `MOBILE-APP.md:45-46`, `:125-126` | `alerterApp` occurs **0 times** in either bundle | NOT IN BUNDLE |
| 5 | "Pairing is a **six-digit** PIN, not a login" — `MOBILE-APP.md:52-56` | The PIN half is CONFIRMED: `getMyMobilePin` out (2,529,229), inbound `case"getMyMobilePin"` (1,021,485), `this.mobilePin=e.pin` (2,316,227), displayed under the literal `"Pin Code: "` (2,315,777) beside `globals.user.email`. **"Six-digit" is not in the bundle** — `mobilePin` is initialised to the string `"N/A"` (2,316,136) and the value is rendered verbatim with no length or format check | CONFIRMED (a PIN flow exists, displayed with the email) / NOT IN BUNDLE (the digit count) |
| 6 | The pin is issued over `POST /internal/mobile-pin/<shortCode>` — `MOBILE-APP.md:108-110`, `:392-399` | **The reference issues it over the SOCKET, not HTTP.** `socket.transmit("cmd",{cmd:"getMyMobilePin",data:null})` (990,340 / 2,529,229). There is no HTTP call anywhere in the pin path | CONTRADICTED **as a description of the reference's transport**. Our HTTP route is our own design decision, which the doc does not currently flag as a divergence |
| 7 | `ptrMobileAppEnabled` gates "the FIRST-PARTY app, for this room" — `MOBILE-APP.md:63`, `:264` | CONFIRMED as a client gate, 5 occurrences, all gates: 2,466,438 (sidebar button), 2,487,668 (navbar icon), 2,529,070 (`getMyPinAndDoInfo` in `app-room`), 2,563,406 (closed-session button), 2,567,767 (`getMyPinAndDoInfo` in closed-session). **It is never tested alone** — every one is `ptrMobileAppEnabled \|\| customMobileAppEnabled` | CONFIRMED, and BUNDLE GOES FURTHER: the two flags are always OR'd, so "first-party" versus "custom" is not a distinction the client makes |
| 8 | `ptrMobileAppCaseByCaseEnabled` = per-member opt-in — `MOBILE-APP.md:64`, `:265` | **0 occurrences** in either bundle | NOT IN BUNDLE |
| 9 | `ptrMobileAppExpirePairCodeDays` — `MOBILE-APP.md:65`, `:274` | **0 occurrences** in either bundle | NOT IN BUNDLE |
| 10 | `mobileAppExpireNotificationsDays` — `MOBILE-APP.md:66`, `:275` | **0 occurrences** in either bundle | NOT IN BUNDLE |
| 11 | `hasAppPairLink` + `pairSecretKey` drive a self-serve pairing URL — `MOBILE-APP.md:67`, `:184-187`, `:272-273` | **0 occurrences** of either name in either bundle. No `pairURLLink`, no `addUser` route, no `/ptr_app/` string | NOT IN BUNDLE |
| 12 | `hideMobileCredentials` "hides them from the member" — `MOBILE-APP.md:68`, `:271`, `:466` | CONFIRMED exactly, one consumer: `O(13,o.appService.globals.sessData.hideMobileCredentials?-1:13)` @ 2,317,719, which switches off `Vxe` — the block holding **email and pin**. The store badges stay visible | CONFIRMED, and BUNDLE GOES FURTHER: it hides email+pin only, not the whole modal |
| 13 | `customMobileAppEnabled` "points the room at a DIFFERENT app than the default one" — `MOBILE-APP.md:69`, `:279-281` | CONFIRMED, with the exact mechanism at 2,316,283: when true, `androidLink` and `iosLink` are overwritten from `customMobileAppAndroidUrl` / `customMobileAppIOSUrl`. **That is its only effect in the client** — two `href` values on two `<a>` elements in one modal | CONFIRMED |
| 14 | §7's narrower reading — the settings "prove a room can POINT AT a different app; it does not prove who built that app" — `MOBILE-APP.md:76-77`, `:293-304` | CONFIRMED and strengthened. The bundle's whole implementation of "custom app" is the two-line `href` swap at 2,316,283. Nothing branded, no per-tenant asset, no bundle-id logic, no build-flavour anything | CONFIRMED — the bundle supports reading (b) and adds nothing for reading (a) |
| 15 | "Two apps can coexist per room. `Enable PTR app?` and `Custom App?` are independent checkboxes, not a radio pair." — `MOBILE-APP.md:286-287` | **CONTRADICTED at the client.** They are independent as *settings*, but the client cannot show two apps: the modal holds exactly one Android link and one iOS link, and `customMobileAppEnabled` **overwrites** the PTR ones (2,316,283). With both flags on, the member is offered the custom app only | CONTRADICTED (as a user-visible outcome) |
| 16 | `customMobileAppV3Name` — "an unexplained string, `wired: false` — purpose unknown" — `MOBILE-APP.md:71`, `:306-310` | **0 occurrences** in either bundle | NOT IN BUNDLE — and this narrows where to look next: it is not consumed by the room client at all |
| 17 | `customMobileAppLaunchWord` — "a launch keyword; 'deep link' is the obvious reading" — `MOBILE-APP.md:72`, `:288-289` | **0 occurrences** in either bundle | NOT IN BUNDLE — same narrowing |
| 18 | "All of them live in `/public/dist/app.min.js`" (`customMobileAppLaunchWord`, `customMobileAppV3Name`, the CaseByCase branches) — `MOBILE-APP.md:349-354` | Consistent with rows 8, 16, 17: none is in the v4 room bundle. The doc's proposed collector target stands | CONFIRMED (by absence here) |
| 19 | "Tokens are masked to the last six characters everywhere they are displayed" — `MOBILE-APP.md:91`, `:461` | The room client displays **no tokens at all** — the only credential it renders is email + pin (`Vxe`, 2,315,554). Nothing to mask | NOT IN BUNDLE |
| 20 | "**The app is an alert receiver first.** Every captured handler is about tokens, pausing and test notifications; none is about video." — `MOBILE-APP.md:206-208` | CONFIRMED and reinforced by new v4 evidence. The one app-facing control added in v4 is `Restore Connectivity`, whose copy is "…get a **test notification** on your device. Only do this if you are **not getting notifications**" (2,438,310). Notification language throughout; no media path | CONFIRMED |
| 21 | §6 open question: "Does the app carry video/audio, or only alerts?" — `MOBILE-APP.md:216-218` | Still open. The bundle adds one datum on the alerts side (row 20) and nothing on the media side | CONFIRMED that it remains open |
| 22 | §7b's proposed endpoints (`/api/mobile/pair`, `/api/mobile/push-token`, DELETE) — `MOBILE-APP.md:401-437` | No HTTP mobile endpoint of any shape is referenced by the room client. Everything mobile goes over the socket | NOT IN BUNDLE — these are our design, correctly labelled MISSING in the doc |
| 23 | *(nothing in the doc)* | **`restoreMobileAppTokens` is entirely absent from `MOBILE-APP.md`.** It is a member-initiated, zero-argument socket command that makes the server re-establish the member's push registration and send a test notification (2,444,920). It is new in v4 | BUNDLE GOES FURTHER — a whole wire command the doc does not have |
| 24 | *(nothing in the doc)* | **Free-trial members are excluded from the app.** Every mobile gate carries `\|\| user.isFT && !sessData.freeTrialsGetApp` — 5 occurrences at 2,466,577 / 2,487,827 / 2,529,210 / 2,563,545 / 2,567,907. `freeTrialsGetApp` is not mentioned anywhere in `MOBILE-APP.md` | BUNDLE GOES FURTHER |
| 25 | *(nothing in the doc)* | **`hideAppInfo` is a second, independent gate** on the sidebar button — `O(12,…hideAppInfo?-1:12)` @ 2,471,575 and `O(31,…hideAppInfo?-1:31)` @ 2,578,201. It hides the whole "Powered by / Version / Mobile App Info" block. Not mentioned in `MOBILE-APP.md` | BUNDLE GOES FURTHER |
| 26 | *(nothing in the doc)* | **The Mobile App tab is ungated.** `ptrMobileAppEnabled`, `customMobileAppEnabled` and `freeTrialsGetApp` are all absent from the troubleshooter component (2,433,700–2,465,684, read in full). A member of a room with the app off still sees the tab and can fire `restoreMobileAppTokens` | BUNDLE GOES FURTHER — and it is the one inconsistency in an otherwise uniformly-gated feature |

### The four rows worth acting on

- **Row 6 — CONTRADICTED.** The doc presents `POST /internal/mobile-pin/<shortCode>` as the pin
  contract. The reference's own transport is the socket command `getMyMobilePin` with `data: null`.
  Our HTTP route has good reasons of its own (`MOBILE-APP.md:114-118`), and this does not invalidate
  them — but the doc reads as though the HTTP shape were the reference's, and it is not.
- **Row 15 — CONTRADICTED.** "Two apps can coexist per room" holds for the settings and fails for the
  member: `customMobileAppEnabled` overwrites rather than adds.
- **Row 24 — missing gate.** `freeTrialsGetApp` is part of every mobile authority decision in the
  reference client and is absent from the doc, from `room-settings-schema.ts` and from
  `room-config-client.ts`. Anything built against §5 of the doc will be missing it.
- **Row 26 — the anomaly.** The new tab is the only mobile control in the bundle with no gate. Record
  it as observed; decide deliberately whether to reproduce it.

---

## 4. VERIFICATION — negative control

**What I expected and checked for:** that `fa-mobile-alt` is the icon on the navbar's mobile button —
the obvious reading, since that button is the mobile entry point and `fa-mobile-alt` is one of the
four strings named as new in v4.

**Result: it is not, and it could not be.** I resolved the navbar element's const rather than
assuming: const 137 @ 2,541,704 is
`["title","Launch in Mobile App",…,1,"fas","fa-mobile","mr-1","mobile-info-app-btn",3,"click"]` —
**`fa-mobile`**, not `fa-mobile-alt`. `fa-mobile-alt` occurs exactly **once** in the entire bundle, at
2,453,564, in `[1,"fas","fa-mobile-alt","me-1"]`, which is troubleshooter const 11 — the icon inside
the new **tab button**. Had I matched the name to the nearest mobile-looking element, I would have
changed the icon on a control that has been shipping unchanged since the older build (`fa-mobile`
count: 3 in v4, 2 in the older bundle, the difference being exactly this new tab).

**Second control — the one that mattered more.** I expected `restoreMobileAppTokens` and the Mobile
App tab to be gated on `ptrMobileAppEnabled`, because every other mobile control in the bundle is.
I did not conclude that from the pattern; I read the troubleshooter component end to end
(2,433,700–2,465,684, including the full 8,838-byte styles array) and counted. `ptrMobileAppEnabled`
occurs 5 times in the bundle and **none of them is in that range**. The gate is genuinely absent, and
that absence is §3 row 26.

**Third control — proving a class has no rule rather than assuming it.** For `mobile-app-container`
and `mobile-app-info` I did not stop at "no rule found". I counted total occurrences of each
substring in the bundle (2 and 7), opened every one, and classified each as a const tuple, a
component tag, or a CSS rule. `mobile-app-container`: both occurrences are const tuples, so no rule
exists. `mobile-app-info`: 4 are CSS rules and 3 are the component tag, so the rule exists and has no
subject. Those are opposite findings and only reading every occurrence separates them.

---

## 5. STILL TO DECODE

Specific lookups, not research projects.

- [ ] **What the server does with `restoreMobileAppTokens`.** The client sends `{cmd:"restoreMobileAppTokens",data:{}}`
      and immediately alerts success. What the server re-registers, against which store of tokens,
      and what a "test notification" contains, is not in this bundle. Lookup: the reference's server,
      or observe a live room with the app paired and capture the resulting FCM message.
- [ ] **Which template uses `app-room` const 81 @ 2,537,902** — the `Launch in Mobile App` tuple
      **without** the `3,"click"` binding. Const 137 (with the click) is consumed by `xPe`. The
      consumer of 81 was not located. Lookup: scan the `app-room` template functions between
      2,465,700 and 2,532,814 for the literal `,81)` and open each hit.
- [ ] **The pin's format.** `mobilePin` is a bare passthrough of `e.pin`. Whether it is six digits,
      and whether it carries an expiry alongside, is not in the room client. Lookup: capture one
      inbound `getMyMobilePin` frame from a live room — `console.log("socket getMyMobilePin data:",i)`
      at 1,021,519 already prints the whole object, so opening the console and clicking the mobile
      icon is sufficient.
- [ ] **Whether `--mobileApp-info-bg-color` / `--mobileApp-info-color` and the `.mobile-app-info`
      rules have a subject in some other bundle.** Confirmed subject-less in `main.d1d09071be31f1ba.js`.
      Not checked: any chunk other than `main.*` referenced by `deployed-index.html`. Lookup: read
      `apps/room/docs/source-v4-2026-08-15/deployed-index.html` for its full script and stylesheet
      list.
- [ ] **`customMobileAppV3Name` and `customMobileAppLaunchWord`.** Confirmed absent from **both**
      room bundles, which rules the room client out as the consumer. This narrows the doc's §7 target
      (`MOBILE-APP.md:349-354`) rather than answering it. Lookup: the manage-page bundle
      `/public/dist/app.min.js` via `apps/controller/scripts/collect-create-new.js`.
- [ ] **Whether the room ever receives an app-side event.** Only `getMyMobilePin` was traced through
      the inbound switch. The switch region 1,020,600–1,022,200 was read in full, but the switch
      itself is longer than that window. Lookup: bracket-match the whole `switch` statement
      containing 1,021,485 and read every `case` label, checking for any other mobile-related one.
- [ ] **`sessData.uuid` and `globals.sessionID`** — used by the Benzinga URL and adjacent to this
      work; not cross-checked against `apps/room/src/lib/server/room-config-client.ts` in this pass.

---

## ⛔ CORRECTION — verified by the main agent, 2026-08-15

One claim in this file **fails verification and is wrong.**

This document states that `freeTrialsGetApp` is *"Absent from the doc, from `room-settings-schema.ts`
and from `room-config-client.ts`"*, and presents it as a gap in our implementation.

**Measured:**

| file | occurrences |
| --- | --- |
| `apps/controller/src/lib/room-settings-schema.ts` | **2** |
| `apps/room/src/lib/server/room-config-client.ts` | **1** |
| also present in | `apps/room/src/routes/+page.svelte`, `apps/controller/src/lib/room-config.ts` |

**`freeTrialsGetApp` is already wired in this repository.** It is not a gap. The claim that the
bundle "adds" something we lack is false for this setting; treat the rest of that section's items
(`restoreMobileAppTokens`, `hideAppInfo`, the ungated Mobile App tab) as still requiring their own
check before being acted on.

The three `MOBILE-APP.md` contradictions above were NOT re-verified by the main agent and remain
claims, not findings. Verify each against the cited offsets before changing `docs/MOBILE-APP.md`.
