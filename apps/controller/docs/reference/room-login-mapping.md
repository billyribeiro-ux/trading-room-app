# Room login screen → controller settings

Evidence: DOM of `app-session-login`, the room's entry screen behind the Launch link
(`/session?id=3625`). Supplied as a paste, not a harness capture, so there are no
computed styles or rects here — structure, classes and copy only.

Personal data in the source has been tokenised: the avatar hash is
`[GRAVATAR_MD5_A]` and the nickname `@[OWNER_NAME]`. See `REDACTIONS.md`.

---

## 0. The app shell around the login

A later paste supplied the full `<app-root>`, which adds three facts the login-only
capture did not:

| Fact | Evidence | Why it matters |
|---|---|---|
| **Angular 17.3.12** | `ng-version="17.3.12"` on `<app-root>` | earlier this was only narrowable to "Ivy, 9+". Now exact. |
| The login is a **routed** component | `<router-outlet>` precedes `<app-session-login>` | entry is a route in the room SPA, not a separate page — so `/session?id=…&jwtSite=…` boots the app and routes to login |
| An `<audio>` element is mounted **before login** | `<audio autoplay="autoplay" hidden="true" id="webcam">`, a direct child of `<app-root>` | the media pipeline is set up at app-root level and persists across routes, so it exists while the user is still on the login screen |

Two small defects in that element: `id="webcam"` on an `<audio>` tag is a misnomer
(no video), and `hidden="true"` is written as a string where `hidden` is a boolean
attribute — harmless, since any value is truthy, but it is not what the author meant.

The `autoplay` is worth noting for a rebuild: browsers block autoplay before a user
gesture, so this element cannot actually be producing sound at login. It is there to
exist early, not to play.

### A third-party geolocation call at login

The `<body>`-level paste adds one script the earlier captures did not show:

```html
<script src="https://reallyfreegeoip.org/json/?callback=handleGeoData_x2l1dyu10"></script>
```

This is a **JSONP** call to a third-party IP-geolocation service, with a randomised
callback name, fired on the login screen — before the user has authenticated or
consented to anything.

It corroborates a feature: the extracted theme tokens include
`--lightTheme-user-location-color: #676767` and
`--darkTheme-user-location-color: #f7fd37`, so the room displays a per-user location
in the roster. This is where that data comes from.

Three things a rebuild should not copy:

1. **JSONP is arbitrary script execution.** The response is executed as JavaScript in
   the room's origin. If that third party is compromised, hijacked by DNS, or simply
   changes what it returns, it runs with full access to the page — including the
   session and the `jwtSite` token in the URL. Use `fetch()` against a JSON endpoint,
   or proxy it server-side, so the response is data rather than code.
2. **IP geolocation is personal data**, resolved before any consent step.
3. **No integrity or fallback.** A `<script>` with no `onerror` path means the feature
   fails silently if the service is down.

Server-side lookup at join time, stored against the membership row, avoids all three.

*(Also present on `<body>`: `cz-shortcut-listen="true"`, injected by the ColorZilla
browser extension. Not app markup — do not reproduce it.)*

## 1. The room is a different stack from the controller

This matters more than it looks, because it invalidates any assumption carried over
from the controller's styling.

| | Controller (`#/page/manageSession`) | Room (`/session?id=`) |
|---|---|---|
| Framework | AngularJS **1.3.15** | Angular **17.3.12** |
| CSS | Bootstrap **3**, float/table | Bootstrap **5** (`btn-close`, `data-bs-dismiss`) |
| Icons | FontAwesome **4.3.0** (`fa fa-cog`) | FontAwesome **5** (`fas fa-cog`) |
| Layout | no flex anywhere (2156/2156 nodes at initial) | flex (`d-flex`, `justify-content-between`) |
| Version | — | `v4.0.1-61268ec1` |

They are two separately-built applications sharing a brand. Keeping
the controller sheets (`account.css` and `manage.css`) and `auth.css` apart is
therefore not just tidiness — they reproduce different Bootstrap majors.

## 2. Dead classes, again

The markup mixes Bootstrap 4 and Bootstrap 5 utility names. Under BS5 the BS4 ones
were renamed and simply do nothing:

| Class in the markup | Status under BS5 |
|---|---|
| `pl-2`, `pr-2` | dead — BS5 uses `ps-*` / `pe-*` |
| `text-right` | dead — BS5 uses `text-end` |
| `mb-3`, `mt-3`, `p-2` | live (unchanged in BS5) |
| `btn-close`, `data-bs-dismiss` | live, BS5-only |

So the input-group addons and the "Not you?" link are not getting the padding or
right-alignment the markup asks for. Same class of defect as the controller's
`.muted`: a class that reads as styling and isn't.

## 3. The settings that drive this screen

Every row below pairs a visible element with the controller setting that governs it,
and checks it against the value captured in room 3625. **Seven predictions, seven
matches** — the first hard evidence that the settings and the room agree.

| Element in the login DOM | Setting | Captured value | Predicts | Observed |
|---|---|---|---|---|
| `<h1 class="room-title">Welcome to the Room 3625</h1>` | `hideWelcomeTo` | No | heading shown | ✅ shown |
| `<img …gravatar…>` + `.setup-avatar` | `hideAvatars` | No | avatar shown | ✅ shown |
| footer "Powered by: ProTradingRoom.com" | `hidePoweredBy` | No | footer shown | ✅ shown |
| no phone input anywhere | `hasRequiredPhoneInLogin` | No | no phone field | ✅ absent |
| no "forgot password" link | `forgotRoomPassword` | No | link hidden | ✅ absent |
| "Have a password? Click here" | `showPasswordField` | — | password path offered | ✅ present |
| "Keep me logged in" checkbox | `tokenExpiresIn` | `1d` | session length | ✅ present |

Further bindings, evidenced by the markup but not yet value-checked:

| Element | Setting | Note |
|---|---|---|
| `#login-nickname-new`, placeholder "Name or Nickname" | `allowUsersToChangeUsername`, `claimNickName` | whether the field is editable at all |
| `aria-describedby="nickHelpBlock"` | `usernameInstructions` | **see §4** |
| nickname validation | `nickFilter` | captured value unset |
| `<div class="error text-danger small">` (empty) | `loginErrorMsg`, `loginErrorURL` | the slot error copy lands in |
| `#login-email` rendered **disabled** | `authMode` = *"Open — anyone with the room link can join with their email & name"* | identity arrives in the JWT, so email is fixed, not entered |
| "Not you? clear form" | `remToken` | clears the stored identity/token |
| gmail / facebook avatar modals | `hideAvatars` | avatar sourcing, hidden when avatars are off |

## 4. A defect in the room: dangling `aria-describedby`

```html
<input id="login-nickname-new" … aria-describedby="nickHelpBlock">
```

**There is no element with `id="nickHelpBlock"` anywhere in the DOM.** The reference
points a screen reader at a description that does not exist.

That id is almost certainly where `usernameInstructions` renders — the setting's label
is literally `text:` and it is unset in room 3625, so the help block was never emitted
while the `aria-describedby` stayed behind unconditionally.

Two consequences: the accessibility annotation is broken today, and it confirms
`usernameInstructions` targets exactly this field. A rebuild should render the help
block and the `aria-describedby` together, or neither.

## 5. Fifteen unseen branches

Angular leaves an empty `<!---->` comment wherever a structural directive (`@if`,
`@for`) rendered nothing. Counting them in the login `<form>` gives an exact measure
of how much of this screen has never been observed: **15 anchors**.

| # | Sits after | Most likely branch |
|---|---|---|
| 1–2 | the gravatar `<img>` | avatar variants — uploaded image, initials fallback |
| 3 | `.user-nick` | nickname edit affordance (`allowUsersToChangeUsername`) |
| 4 | the whole `.loginGravatar` block | avatar section as a whole (`hideAvatars`) |
| 5 | the Name input's addon | **the `nickHelpBlock` slot** — `usernameInstructions`, confirming §4 |
| 6–8 | the Email form-group | **three unrendered fields**: phone (`hasRequiredPhoneInLogin`), password (`showPasswordField` / `webinarPW*`), and one more |
| 9–10 | `.error.text-danger` | error variants (`loginErrorMsg`, `loginErrorURL`) |
| 11 | "Keep me logged in" | a sibling control |
| 12 | `<span>Login</span>` inside the button | the `buttonload` spinner / disabled states |
| 13 | the button block | |
| 14 | the "Have a password?" `<br>` | alternate link copy |
| 15 | end of form | |

The mapping of anchor → setting is inference from position and from the settings
inventory, **not** proof: an empty anchor carries no attributes. What *is* proven is
the count. Fifteen branches exist on the busiest-looking screen in the entry flow, and
we have observed none of them.

Anchor 5 is the strongest single inference: it sits exactly where a
`aria-describedby="nickHelpBlock"` target would go, on a field whose help text setting
(`usernameInstructions`) is unset in room 3625.

Closing this needs one capture per state: with a password-protected room, with
`hasRequiredPhoneInLogin` on, with `usernameInstructions` set, and with a failed login.

## 6. What this does *not* establish

- **No computed styles, no rects.** This is markup only, so nothing here supports a
  pixel claim. Running `scripts/capture-ptr-reference.js` on the room login would.
- **The password path is unseen.** "Have a password? Click here" swaps the form; that
  state was not supplied, so `webinarPW`, `webinarPW2`, `webinarPW3` and
  `webinarPWFreeTrial` have no observed UI.
- **This evidence alone does not set `wired`.** It proves what drives the
  *reference* room, not what our implementation consumes. The current product
  implementation has tested room-login consumers for 11 of the 268 product-schema
  settings (268 extracted plus the reviewed `roomType` deviation); the generator
  encodes those exact 11 and leaves the other 257 false.

## 7. Global chat helpers in the room's index.html

Four functions are defined inline in the room app's `index.html`, in global scope so
that inline `onclick=` attributes inside chat messages can call them:
`openImageModal`, `downloadImage`, `removeImageFromChat`, `showChatGif`.

They belong to the **chat**, not the login — but they ship on the login page, so they
turned up in this capture. Three defects, one serious.

### 7.1 HTML injection via an image URL — serious

```js
return bootbox.dialog({
  message: '<img src="' + url + '" alt="' + imageName + '" /><hr>' +
    '<button … onclick="downloadImage(\'' + url + "', '" + imageName + '\')">…'
});
```

`url` is concatenated into markup **and** into an inline `onclick` string with no
escaping. A chat image URL containing `"` or `'` closes the attribute and everything
after it executes as script, in the room's origin, with the session in scope.

The shift/alt path is the same shape:

```js
newWindow.document.write(`… <title>${url}</title> … <img src="${url}" alt="${url}" />`);
```

In a room where users can post images, the attacker is any participant. A rebuild
must build these nodes with `createElement` + `textContent` / `setAttribute`, or
escape on the way in — never string-concatenate a URL into markup.

### 7.2 `event.ctrlClick` does not exist

```js
if (event && (event.shiftKey || event.altKey || event.ctrlClick)) {
```

`MouseEvent` exposes **`ctrlKey`**, not `ctrlClick`. The property is always
`undefined`, so ctrl-click has never opened the standalone window — only shift and alt
do. Silent, and invisible unless you read the source.

### 7.3 The popup keeps an `opener` handle

`window.open(null, null, 'toolbar=0,…')` is called without `noopener`, and the parent
then writes into the new document. The popup can reach back through `window.opener`.

### 7.4 Smaller notes

- `downloadImage` sends an `XMLHttpRequest` with no `onerror` and no status check, so a
  failed fetch produces nothing at all — no image, no message.
- `removeImageFromChat` and `showChatGif` use jQuery (`$`), confirming jQuery is loaded
  in the room app alongside Angular 17.
- The filename rewriting in `downloadImage` strips everything up to the first `_` and
  the last `_…` before the extension, so `2026_photo_a1b2.jpg` downloads as
  `photo.jpg`. Deliberate, but lossy — two files can collide.

**Scope:** none of this belongs in the controller, and none of it is reproduced here.
It is recorded because it is evidence about the room, and because 7.1 should be fixed
in the room whatever happens with this project.
