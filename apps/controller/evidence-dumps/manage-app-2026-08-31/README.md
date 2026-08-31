# The MANAGE/ACCOUNT app's deployed bundle — retrieved 2026-08-31

**This directory exists because three evidence-gap rows said they needed an authenticated capture
run, and none of them did.** `TODO.md` §C listed `T5-16`, `T5-17` and `T5-20` under *"Three are NOT
CAPTURED YET. Each needs one targeted collection script"* — a console script pasted into the live
app while logged in. Every answer those three were waiting for is in a **public static asset**, and
it was fetched with `curl` and no session at all.

That is worth stating plainly, because the rule the register applied ("this is behind a login, so it
needs a console run") was applied to the *data* and then inherited by the *code that fetches the
data*. The data does need a session. The controller that names the endpoint does not.

## Provenance

| | |
| --- | --- |
| host | `protradingroom.com` — the marketing host, which also serves `/ptrApp` |
| app entry | `/login` → `302 Found. Redirecting to /ptrApp#/page/welcome` |
| bundle | `/public/dist/app.min.js` |
| retrieved | 2026-08-31, unauthenticated `curl` |

**Reproduced three times, byte-identical:** with the deployed cache-buster
(`?v=1788077348499`), with a different one, and with none at all. All three
`dcad77f4578fa9a75c46491dd3e31c534624b627afb6f4a2b74a6dcfdde6f439`, 455,329 bytes.

```sh
curl -sS -o app.min.js https://protradingroom.com/public/dist/app.min.js
sha256sum app.min.js   # dcad77f4…
```

### Read the bytes the way the consumer reads them

Every offset below was wrong by one in this file's first draft. They had been computed in Python with
`io.open(path, encoding='utf-8')`, which opens in TEXT mode and applies **universal newline
translation** — and this bundle contains exactly one `\r\n`, at byte 47. Python collapsed it to a
single character, so everything after byte 47 came out one too low.

`manage-app-bundle-contract.test.ts` caught it on its first run (`expected ' AvatarsCtr' to be
'AvatarsCtrl'`), which is the whole reason the offsets are asserted rather than quoted. The offsets
here now come from Node's `readFileSync(path, 'utf8')`, which is what reads them at runtime. Use
`open(path, 'rb')` if you check them from Python.

### Why the manifest is stored NORMALISED, and is not a hash pin

`/ptrApp` is **not byte-stable**. Two fetches 139 seconds apart differ, and the diff is exactly six
lines: `__cver` and the `?v=` query on five script tags, all carrying the same value, which is a
unix-milliseconds timestamp minted per request (`1788077348499` vs `1788077209945`). Nothing else
changes. So `ptrApp.normalised.html` has that value replaced with `__CVER__`, and its hash pins the
normalised form. **Do not pin the raw response** — it would fail on the next fetch and read as the
site having changed.

One more thing that response teaches, recorded because it cost a wrong reading here first: **several
of its `<script>` tags are inside HTML comments** — `/public/vendor/adapter.js`, both `temasys`
adapters and `/public/vendor/janus3.js`. A grep for `src="…"` lists them as if they load. They do
not.

## What this settles, per row

### T5-17 Avatars — the row's premise was FALSE, and the capture would have returned nothing

The row asked for *"the avatar set behind `avatars`, plus the request `selectAvatar(avatar)` posts —
URL, method and body"*. There is no request. `AvatarsCtrl` begins at byte **36,509**:

```js
function AvatarsCtrl($scope,$rootScope,$state,$http,$cookies,chatModel,appVars){
  lg("AvatarsCtrl created...")
  $scope.avatar  = $cookies.avatar || chatModel.avatar
  $scope.avatars = ["app/img/user/01.jpg","app/img/user/02.jpg","app/img/user/03.jpg",
                    "app/img/user/04.jpg","app/img/user/05.jpg","app/img/user/06.jpg",
                    "app/img/user/07.jpg","app/img/user/08.jpg","app/img/user/user.png"]
  $scope.selectAvatar = function(avt){
    lg("User selected avatar: "+avt)
    $cookies.avatar   = avt
    chatModel.avatar  = avt
    $state.go("page.login")
  }
}
```

`avatars` is a **hardcoded array of nine static paths**, not a server response. `selectAvatar` writes
a cookie and a client-side model and navigates to `page.login`. `$http` is injected into the controller and never called —
one occurrence in the region, which is the parameter, and zero `$http.` call sites. So the whole page is client-side, and the "data contract" the row was blocked on
does not exist.

### T5-16 Recordings — the request IS here, and there are TWO of them

At byte **180,143**:

```js
$scope.getRecordings = function(){
  var tok = $localstorage.get("token") || $localstorage.get("tokenSite")
  if (null == tok || 0 == tok.length) return void lg("tok or email null. abort..")
  var args = {}; args.token = tok; args.source = "webApp"
  $http.post(appVars.globals.APIURL + "/users/v1/recordings", args)
    .success(function(data){ data && ($scope.recs = data) })
    .error(function(err){ $scope.doLogout() })
}
```

**`POST {APIURL}/users/v1/recordings`, body `{token, source:"webApp"}`**, response assigned whole to
`$scope.recs`. A failure logs the user out, which is how the page treats a bad token.

A **second and different** route, at byte **268,489** — a per-session archive opened in a new window
rather than rendered:

```js
$scope.openRecs = function(){
  var tok = chatModel.jwtToken
  window.open("/users/v1/archives/recordings/" + appVars.sessData._id + "/" + tok)
}
```

The route table at byte **449,342** declares the page with **no controller of its own**, which is why
`page.recordings.html` carries `ng-controller="LoginCtrl"` inside it:

```js
.state("page.recordings",  { url:"/recs",    templateUrl: Route.base("page.recordings.html"), params:{isRec:!0} })
.state("page.avatarSelect",{ url:"/avatars", templateUrl: Route.base("page.avatars.html") })
```

### T5-20 `recorded_max_capacity` — the original does NOT push occupancy, measured

The row asked to *"capture whether the original pushes occupancy on its command channel and under
what name"*, warning *"do not substitute the roster size"*. Measured across all 455,329 bytes:
`occupancy`, `maxCapacity`, `maxCap`, `recorded_max` and `peakUsers` each occur **zero** times.

What does exist is `chatModel.userCount`, and it is derived **entirely client-side** and never sent:

```js
// on getRoster, byte 322,889 — the whole roster arrives and is counted
service.userCount = Object.keys(inRos).length
// on each join and leave, bytes 336,188 / 337,510 / 337,817
var size = Object.keys(service.roster).length, sizeP = Object.keys(service.presroster).length
service.userCount = size + sizeP
```

— four assignment sites, all four local arithmetic and none of them a value from the wire,
and read only by two `recalcUserCount()` display helpers that write it into `#rosterLen` and
`#rosterLenSide`. So the client counts for the roster badge and reports nothing.

**The consequence for this repository is that the row's next step changes.** No client capture can
supply the signal, because the client never sends one — whatever writes `recorded_max_capacity`
upstream observes the SERVER's own connections. That is a signal we own: `roomSubscriberCount()` in
`apps/room/src/lib/server/room-events.ts` counts live SSE subscribers, which is simultaneous
presence and not "everyone who ever registered" — exactly the distinction the row's warning draws.

## What this directory is NOT

It is not the room. `apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js` is the ROOM's
bundle, from `chat.protradingroom.com`, and stays the authority for everything the room does. This is
the AngularJS 1.x manage/account application, a different app on a different host, and the two share
no code. `RecordingsCtrl` and `vidPath` occur zero times here — the recordings VIEW is here, its
response shape is documented in `../TIER1-fetched/api-post-routes.md`, and the endpoint that produces
it is server-side and outside every capture this repository holds.
