# The phone / tablet app

Written 2026-08-09. Same rule as `NEXT-SESSION.md`: every claim carries its source, and anything
unknown is labelled rather than filled in.

---

## 1. Where this actually stands

**There is no mobile app.** No repository, no build, no submission. What exists is the **server side
that a mobile app would talk to**, and a surprising amount of it is already built and tested.

This document exists so that whoever starts the app does not re-derive the contract, and does not
invent behaviour the reference already defines.

---

## 2. What the reference proves the app does

Not speculation — these come from the captured manage page and the reference's own API docs.

### The row menu's five push actions

From `must-match/file1`, the **App and Notifications** submenu on every user row:

| item | handler |
| --- | --- |
| Get App PIN | `getAppPin(user.email, user.userName, $index)` |
| Show App Tokens | `showAlerterAppTokens(user.userName, user.alerterAppTokens)` |
| Get FCM Tokens | `getFCMTokens(user._id, …)` |
| PAUSE / RESUME / Remove Mobile Notifs | `pauseUserNotifs(user._id, …, 'pause' \| 'resume' \| 'unsub')` |
| Send Test Mobile Notifs | `sendTestFCM(user._id, …)` |
| Reset Mobile Notifs | `resetFCMForuser(user._id, …)` |

Plus three `<!-- ngIf: sess.ptrMobileAppCaseByCaseEnabled -->` branches that never rendered in any
capture — see §6.

### Push is Firebase Cloud Messaging, and that is not a choice

The reference's own API documentation (`evidence-dumps/login-page/api-docs`, the `/sessions/users`
response) returns:

```json
"alerterAppTokens": ["fcm-token-1", "fcm-token-2"],
"alerterAppFCMUserOff": false
```

So "alerter app tokens" **are** FCM registration tokens — there is no second, separate token store.
The handlers say FCM and the stored field says FCM. Unlike mail, where Resend was our decision, the
provider here is named by the reference.

### Pairing is a six-digit PIN, not a login

The app does not take a username and password. A member opens the room in a browser, asks for a
PIN, and types it into the app. `room_users.mobile_pair_code`, with an expiry.

### The room settings that govern it

From `apps/controller/src/lib/room-settings-schema.ts`:

| setting | what it controls |
| --- | --- |
| `ptrMobileAppEnabled` | the FIRST-PARTY app, for this room. The `ptr` prefix is the reference's — it is their setting name, kept because renaming a settings key would break the schema contract. For us it means the TradingRoomApp app. |
| `ptrMobileAppCaseByCaseEnabled` | per-member opt-in rather than room-wide |
| `ptrMobileAppExpirePairCodeDays` | pair-code lifetime |
| `mobileAppExpireNotificationsDays` | how long notifications keep flowing |
| `hasAppPairLink` + `pairSecretKey` | the self-serve pairing URL |
| `hideMobileCredentials` | hides them from the member |
| `customMobileAppEnabled` | points the room at a DIFFERENT app than the default one |
| `customMobileAppIOSUrl`, `customMobileAppAndroidUrl` | store-listing links for that app |
| `customMobileAppV3Name` | an unexplained string, `wired: false` — purpose unknown (§7) |
| `customMobileAppLaunchWord` | a launch keyword; "deep link" is the obvious reading, and obvious is not evidence |

`customMobileApp*` is the commercially interesting group — and the one this document itself
over-read once, describing it as "a WHITE-LABEL app instead of the first-party one". It proves a room
can POINT AT a different app; it does not prove who built that app. §7 separates what the evidence
establishes from what it merely permits, because the difference decides the framework.

---

## 2a. The server surface that already exists — decoded

Every symbol below was read out of the tree, not inferred from a name.

### `apps/controller/src/lib/server/rooms.ts`

| function | line | what it does |
| --- | --- | --- |
| `issueMobilePairCode(roomId, roomUserId, expireDays)` | 576 | mints a **fresh six-digit code** and moves the expiry. This is "Get App PIN". |
| `readPushTokens(json)` | 594 | parses `push_tokens_json` into `PushToken[]` |
| `listPushTokens(roomId, roomUserId)` | 610 | returns tokens **masked to the last six characters** — a push token is a credential for sending to that device |
| `listFcmRegistrations(…)` | 663 | same masking; **only `unregistered` tokens are deleted**, i.e. only when FCM says in as many words that the registration is gone |

The masking is deliberate and commented as such: *"One function rather than a `.slice(-6)` at each
call site, so 'Get FCM Tokens' cannot drift into printing a whole credential."* Preserve it.

### `apps/controller/src/lib/server/fcm.ts`

| export | line | notes |
| --- | --- | --- |
| `fcmConfigured()` | 97 | false until `FCM_SERVICE_ACCOUNT_JSON` is set — callers check this rather than throwing |
| `readServiceAccount()` | 110 | parses the Google service-account JSON |
| `sendPush(message, fetchImpl?)` | 304 | FCM **HTTP v1**. The legacy `fcm.googleapis.com/fcm/send` server-key endpoint was retired, so v1 with service-account auth is the only option. `fetchImpl` is injectable, which is how `fcm.test.ts` runs without network. |

### `POST /internal/mobile-pin/<shortCode>` — the wire contract

```
POST /internal/mobile-pin/9312
→ 200  { "pin": "418290", "expiresAt": "2026-08-16T04:11:52.000Z" }
```

`expiresAt` is driven by the room's `ptrMobileAppExpirePairCodeDays`.

**Why it is a POST on its own route, and must stay that way.** The endpoint's own comment explains
it: a pair code is a live credential, and `internal/room-config` is fetched on every page load and
serialised into the room's SSR HTML — so putting the pin there would print a working credential into
every page. It also mints a NEW code per call rather than returning a stored one, because returning
a stored one would mean a code that leaks once is valid until it expires.

### What the reference's own API publishes

From `evidence-dumps/login-page/api-docs`, the `/sessions/users` response:

```json
"alerterAppTokens": ["fcm-token-1", "fcm-token-2"],
"alerterAppFCMUserOff": false
```

and the users endpoint documents a filter: **"Filter for mobile users only"**, plus an `isMobile`
field. So the server can distinguish app users from browser users — which is what
`loadMobileUsers()` / `Show Mobile` on the manage page filters on.

**We cannot reproduce that filter yet.** Recorded as an evidence gap in `OUTSTANDING.md §6b`:
`room_users` has three columns that could each plausibly mean "mobile" — `mobilePairCode`,
`pushTokensJson`, `notificationsState` — and choosing one would be inventing the semantics. The
loader reports the filter as unsupported rather than silently returning everyone.

### The database columns

| column | line | default | meaning |
| --- | --- | --- | --- |
| `mobile_pair_code` | `schema.ts:297` | null | the six-digit PIN |
| `mobile_pair_code_expires_at` | `schema.ts:298` | null | its expiry |
| `push_tokens_json` | `schema.ts:300` | `'[]'` | FCM registration tokens |
| `notifications_state` | `schema.ts:302` | `'active'` | `active` / paused / unsubscribed |

`push_tokens_json` **has no writer**. Nothing in the codebase appends to it, because the endpoint
the app would call does not exist. That is item 2 in §4.

---

## 3. What we have already built

| piece | where | state |
| --- | --- | --- |
| `mobile_pair_code` + `mobile_pair_code_expires_at` | `db/schema.ts:297-298` | columns exist |
| `push_tokens_json` | `db/schema.ts:300` | stores FCM registration tokens |
| `notifications_state` | `db/schema.ts:302` | `active` / paused / unsubscribed |
| **PIN issue endpoint** | `routes/internal/mobile-pin/[code]/+server.ts` | built, POST, mints a fresh six-digit code and moves the expiry |
| **FCM HTTP v1 client** | `lib/server/fcm.ts` + `fcm.test.ts` | built and tested; service-account auth |
| **Push fan-out and token hygiene** | `lib/server/member-push.test.ts` | built and tested — registered/unregistered/invalid token states |
| Row menu items | manage page | render and post |

**The pin endpoint has a security property worth preserving.** Its own comment explains it: a pair
code is a live credential, and `internal/room-config` is fetched on every page load and serialised
into the room's SSR HTML — so the pin is deliberately NOT on that route. It is minted on demand by
a separate POST. Do not "simplify" it into the config payload.

---

## 4. What is missing

Everything client-side, and one server piece:

1. **The app itself.** No iOS or Android project exists.
2. ~~**A token-registration endpoint.**~~ **BUILT 2026-08-10** — `POST /api/mobile/pair`
   (`routes/api/mobile/pair/+server.ts`, rules in `lib/server/mobile-pairing.ts`, 11 unit tests).
   The app posts room + email + PIN + FCM token; the server verifies, appends the token and
   **consumes the PIN**. `push_tokens_json` finally has a writer. It is `/api/` rather than
   `/internal/` because a phone that has never paired holds no shared secret — the PIN is the
   credential, which is why it is single-use and why five failures destroy it
   (`mobile_pair_attempts`, migration 0006). Room and email are required alongside it because the
   reference's own pair URL carries both.
3. **The `addUser` pairing route.** The reference renders a readonly `#pairURLLink`:
   `https://chat.protradingroom.com/ptr_app/sessions/v2/addUser/<publicId>/?sec=<pairSecretKey>&email=__userEmail__&name=__userName__`
   We have no such route — a search of `src/routes` returns nothing. It is `ng-hide` in the capture
   (both flags unset), so nothing visible is missing today, but self-serve pairing needs it.
4. **`FCM_SERVICE_ACCOUNT_JSON`** is in the env contract and unset, so nothing can actually send.

---

## 5. What the app has to do — the contract

Derived from the above, not invented:

1. **Pair.** Member gets a six-digit PIN from the room; app POSTs it; server validates against
   `mobile_pair_code` and its expiry, and binds the device to that `room_users` row.
2. **Register for push.** App obtains an FCM registration token and sends it up; server appends to
   `push_tokens_json`.
3. **Receive alerts.** Trade alerts posted in the room fan out via FCM. This is the product: a
   member away from their desk still gets the alert.
4. **Respect state.** `notifications_state` is honoured — pause, resume and unsubscribe are driven
   from the manage page, so the app must not assume it is always subscribed.
5. **Expire.** Pair codes and notification windows both expire, per the room's settings.

**The app is an alert receiver first.** Every captured handler is about tokens, pausing and test
notifications; none is about video. Whether it also joins the room's media is not evidenced —
see §6.

---

## 6. Open questions — do NOT guess these

**Also indexed in the repo-root `TODO.md`** — gaps 6, 7 and 12 there are the mobile ones.

- **Does the app carry video/audio, or only alerts?** Every captured control is notification
  related. No capture shows a mobile media path. The SFU would support it, but nothing proves the
  app uses it.
- **The three `ptrMobileAppCaseByCaseEnabled` branches never rendered.** Angular stripped them
  because the captured room has the flag off, so their labels and handlers are unknown.
- **`perms` shape for app users** — recorded as an open gap in `OUTSTANDING.md §1e.d`, which lives
  OUTSIDE this repo at `~/Desktop/new-room-control/docs/OUTSTANDING.md`. That folder is not
  disposable: its `.env` and `.env.vercel-pull` are still the only surviving source of production's
  Vercel values, and `scripts/set-vercel-env.sh` reads them by absolute path.
- **Native, React Native, or Capacitor?** Nothing in the evidence says. This is our decision, and it
  interacts with §7.
- **What `customMobileAppLaunchWord` actually does** — a deep-link scheme is the obvious reading,
  and obvious is not evidence.

To close the first two, the same collector approach applies:
`apps/controller/scripts/collect-create-new.js` already fetches the app bundle; the mobile handlers
live in the same file. (Note the path — it is under the controller app, not the repo-root
`scripts/`, which holds only the two Vercel env tools.)

---

## 7. White-label — what the evidence actually says, and what it does not

This is the decision that shapes the framework choice, so it is worth being exact about where the
evidence stops.

### The claim this section retracts

Recorded 2026-08-09, because the failure mode is worth more than the fact.

**What was claimed:** "the reference supports white-label apps per customer."

**What the evidence actually supports:** the reference lets you point a room at a different app. It
says nothing about who built that app.

Nothing new was captured between the claim and the correction. The same `customMobileApp*` settings
supported both readings the whole time, and only the narrower one is what they say. The distance between
those two sentences is an entire product line inferred from a URL input box — the same failure this
project has a rule against, committed against its own evidence. It is written down here so the next
reader inherits the correction along with the finding, rather than re-deriving the optimistic
version from the field names.

### The settings, with their real labels

Read from `room-settings-schema.ts`, not paraphrased:

| setting | label in the UI | type | group | wired |
| --- | --- | --- | --- | --- |
| `ptrMobileAppEnabled` | **Enable PTR app?** | checkbox | `dont-touch` | yes |
| `ptrMobileAppCaseByCaseEnabled` | **App for Some Members?** | checkbox | `dont-touch` | no |
| `customMobileAppEnabled` | **Custom App?** | checkbox | `dont-touch` | yes |
| `customMobileAppV3Name` | **Custom app String** | textarea | `dont-touch` | no |
| `customMobileAppIOSUrl` | **Custom iOS App URL** | textarea | `dont-touch` | yes |
| `customMobileAppAndroidUrl` | **Custom Android App URL** | textarea | `dont-touch` | yes |
| `customMobileAppLaunchWord` | **Custom App launch Word** | textarea | `dont-touch` | no |
| `hideMobileCredentials` | **Hide Mobile Credentials?** | checkbox | `dont-touch` | yes |
| `hasAppPairLink` | **Pair Link For App?** | checkbox | — | no |
| `pairSecretKey` | **Pair Secret Key** | textarea | — | no |
| `ptrMobileAppExpirePairCodeDays` | **PTR app exp days** | number | — | no |
| `mobileAppExpireNotificationsDays` | **Push expire days** | number | — | no |

### What this PROVES

1. **A room can be pointed at a different app than the default one.** `Custom App?` is a per-room
   switch, and when it is on the room carries that app's **iOS and Android store URLs**. So a
   member of that room is sent to a different listing than a member of another room.
2. **It is operator-only, not self-serve.** Every `customMobileApp*` setting sits in the
   **`dont-touch`** group — the reference's own marker for settings a tenant is not meant to change.
   Somebody with operator access turns this on for a customer. It is not a checkbox a customer
   finds and flips.
3. **Two apps can coexist per room.** `Enable PTR app?` and `Custom App?` are independent
   checkboxes, not a radio pair.
4. **There is a per-app launch keyword.** `Custom App launch Word` — most plausibly a deep-link
   scheme or a pairing keyword, and "most plausibly" is doing real work in that sentence.

### What this does NOT prove — and this is the part that changes the decision

**The settings store URLs. They do not build apps.**

`Custom iOS App URL` is a text field holding a link to a store listing. Nothing in the evidence
shows who produced the app behind that link. Both of these fit the evidence exactly as well:

- **(a)** The operator ran a white-label service — built, branded and submitted an app per customer,
  and pasted the resulting store URLs into these fields.
- **(b)** Customers who already had their own app brought their own URLs, and the setting simply
  redirects members there instead of to the PTR app.

Nothing on disk distinguishes them. **(b) is a text field. (a) is a business.** Reading the field
names and concluding (a) would be inventing a product line out of a URL input.

**And one field in the group has no reading at all.** `customMobileAppV3Name` — "Custom app
String", a textarea, `wired: false` — read off `room-settings-schema.ts:321`. It surfaced only by
reading that region of the schema rather than searching it for the four names already known, which
is the point of the read-don't-search rule. No capture shows it populated and no label explains it.
It is listed as unknown here rather than guessed at.

### Why it decides the framework anyway

Because the two answers have opposite build requirements, and the choice is expensive to reverse:

| | one shared app | white-label per tenant |
| --- | --- | --- |
| Store listings | 2 (iOS + Android) | 2 **per customer** |
| Review cycles | yours alone | every customer's, every release |
| Branding | fixed | name, icon, splash, colours per build |
| Config | none — members pick a room | per-build: bundle id, room binding, keys |
| Apple risk | none | Apple **rejects near-identical apps** under Guideline 4.3 unless each is submitted under the customer's own developer account |
| Release effort | one build | N builds, N submissions, N rejections to chase |

That last row is the one that catches people. The usual escape is that each customer submits under
**their own Apple Developer account** and you supply the build — which turns "we ship an app" into
"we operate a build pipeline and a support relationship with every customer's developer account."

So: if white-label is ever the goal, the stack must make a per-tenant build a **configuration
change**, not a fork. React Native or Capacitor with per-flavour config handles this well; two
separate native codebases do not.

### Recommendation

Argued from what is proven rather than from the field names:

1. **Build the server contract now.** Pairing, token registration, push fan-out, notification state
   — §5. It is **identical either way**, so it costs nothing and commits you to nothing.
2. **Ship one shared app first.** Whether the original offered white-label as a service is **not
   established**, so building for it now is designing against a guess. It is also the cheaper of
   the two to be wrong about: one shared app that later needs flavours is a refactor; a white-label
   pipeline nobody buys is wasted quarters.
3. **But pick a stack where a per-tenant build is a configuration change, not a fork** — React
   Native or Capacitor with per-flavour config. That costs nothing today, keeps the door open, and
   is the one decision here that is expensive to undo.

### To settle it properly

`customMobileAppLaunchWord` is `wired: false` and its behaviour is unknown, `customMobileAppV3Name`
is unexplained, and the three `ptrMobileAppCaseByCaseEnabled` branches never rendered. All of them
live in `/public/dist/app.min.js`. `apps/controller/scripts/collect-create-new.js` already fetches
that bundle — running it against the live original would show what the launch word does and whether
any real tenant ever had `Custom App?` enabled, which is the closest thing to a direct answer
available without asking the original's operator.

Note what that second question would and would not settle. Finding `Custom App?` enabled on a real
tenant proves a room was pointed at another app; it still does not say who built it. Only (a) —
the operator running a white-label service — would be settled by evidence the bundle does not hold:
a build pipeline, per-customer branding, or submissions under someone else's developer account.
The honest ceiling on this question without asking the operator is "somebody's app, not ours."

---

## 7a. Hostnames the app will depend on

See `NEXT-SESSION.md` §4b for the full plan. What matters here:

| host | the app's use |
| --- | --- |
| `www.tradingroom.app` | where PINs are issued and pairing links are generated |
| `chat.tradingroom.app` | the room itself, once deployed |
| `media.tradingroom.app` | the SFU, IF the app ever carries media (§6, unproven) |

Two things to get right before the app ships, because a mobile client is the worst place to
discover a hostname change:

1. **Never ship the `sslip.io` name.** The SFU is currently `media.34-195-170-147.sslip.io`, which
   embeds the IP in the hostname. A web page picks up a new host on the next load; an installed app
   does not, and neither does one waiting on App Store review.
2. **The pairing URL is per-tenant.** The reference's is
   `https://chat.protradingroom.com/ptr_app/sessions/v2/addUser/<publicId>/?sec=<pairSecretKey>&email=…&name=…`
   — the room's own host, its `publicId`, and its `pairSecretKey`. A white-label app (§7) cannot
   hard-code any of that; it has to be configured per build or discovered at pair time.

---

## 7b. The endpoints the app needs — proposed contract

None of these exist yet except the first. Written down so the app and the server are built against
the same shape rather than negotiated later.

### 1. Issue a PIN — EXISTS

```
POST /internal/mobile-pin/<shortCode>
→ { "pin": "418290", "expiresAt": "…" }
```

Called by the room on the member's behalf. The member reads the PIN off the screen.

### 2. Redeem a PIN — MISSING

```
POST /api/mobile/pair
     { "pin": "418290" }
→ { "deviceToken": "…", "room": { … }, "member": { … } }
```

Must: match `mobile_pair_code` **and** check `mobile_pair_code_expires_at`; be rate-limited, because
six digits is 10^6 and an unthrottled endpoint is brute-forceable in minutes; and **clear the code
on success** so it is single-use.

Returns a long-lived device credential — the app cannot hold the `__Host-` session cookie the web
client uses.

### 3. Register a push token — MISSING

```
POST /api/mobile/push-token
     { "token": "<fcm registration token>", "platform": "ios" | "android" }
→ 204
```

Appends to `push_tokens_json`. Must be idempotent — FCM rotates registration tokens, and the app
will re-send on every launch.

**This is the smallest useful piece of work in the whole mobile effort**, and it closes a dead
column.

### 4. Unregister — MISSING

```
DELETE /api/mobile/push-token   { "token": "…" }
```

Called on logout or notification opt-out. Distinct from FCM reporting `unregistered`, which
`listFcmRegistrations` already prunes.

### 5. Receive alerts — the payload

Sent by the server via `sendPush`. The shape is ours to define; the app must handle a cold start
from a notification tap, so it needs enough to deep-link:

```json
{ "roomShortCode": "9312", "alertId": 123, "kind": "alert" }
```

Keep the body out of the payload if alerts can contain sensitive positions — push payloads pass
through Google's infrastructure and land on a lock screen.

---

## 7c. Security constraints the app inherits

Not optional, and each has a reason already in the code:

1. **A pair code is single-use and time-boxed.** `issueMobilePairCode` mints a fresh one per call
   rather than returning a stored one, so a leaked code expires rather than persisting.
2. **The pin is never in `room-config`.** That route is fetched every page load and serialised into
   SSR HTML.
3. **Tokens are masked to the last six characters** everywhere they are displayed.
4. **Only `unregistered` tokens are deleted.** Not `invalid`, not on a failed send — FCM has to say
   the registration is gone. Deleting on transient failure would silently unsubscribe working
   devices.
5. **Rate-limit the redeem endpoint.** Six digits is a small space.
6. **`hideMobileCredentials`** exists as a room setting; if it is on, the UI must not show pins or
   tokens to the member.

---

## 7d. Effort, honestly

| piece | size | blocked on |
| --- | --- | --- |
| Token-registration endpoint (§7b.3) | hours | nothing |
| Pair-redeem endpoint (§7b.2) | hours | nothing |
| `FCM_SERVICE_ACCOUNT_JSON` + prove a real push | ~1 hour | a Firebase project |
| `addUser` self-serve pairing route | day | deciding whether you want self-serve |
| The app itself, one shared build | weeks | framework choice |
| White-label pipeline | months | §7 decision, and per-customer developer accounts |

**Steps 1-3 need no app, no store account and no framework decision, and they de-risk everything
after them.** Until a real push arrives on a real device, the entire mobile plan is theory.

---

## 8. Suggested order

1. **Write the token-registration endpoint** and give `push_tokens_json` a writer. Small, server
   only, and it closes a dead column.
2. **Set `FCM_SERVICE_ACCOUNT_JSON`** and prove `sendTestFCM` reaches a real device. Until a push
   actually arrives, everything above is theory.
3. **Then** start the app, against a contract that is already proven end to end.

Steps 1 and 2 need no app and no store account, and they de-risk the whole thing.
