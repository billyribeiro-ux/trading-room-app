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
| `ptrMobileAppEnabled` | the ProTradingRoom app, for this room |
| `ptrMobileAppCaseByCaseEnabled` | per-member opt-in rather than room-wide |
| `ptrMobileAppExpirePairCodeDays` | pair-code lifetime |
| `mobileAppExpireNotificationsDays` | how long notifications keep flowing |
| `hasAppPairLink` + `pairSecretKey` | the self-serve pairing URL |
| `hideMobileCredentials` | hides them from the member |
| `customMobileAppEnabled` | a WHITE-LABEL app instead of ProTradingRoom's |
| `customMobileAppIOSUrl`, `customMobileAppAndroidUrl` | store links for that white-label build |
| `customMobileAppLaunchWord` | its deep-link / launch keyword |

`customMobileApp*` is the commercially interesting group — and the one most easily over-read. It
proves a room can POINT AT a different app; it does not prove who built that app. §7 separates
what the evidence establishes from what it merely permits, because the difference decides the
framework.

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
2. **A token-registration endpoint.** The app must POST its FCM registration token after pairing.
   `push_tokens_json` has no writer — see `NEXT-SESSION.md`, the two dead columns.
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

- **Does the app carry video/audio, or only alerts?** Every captured control is notification
  related. No capture shows a mobile media path. The SFU would support it, but nothing proves the
  app uses it.
- **The three `ptrMobileAppCaseByCaseEnabled` branches never rendered.** Angular stripped them
  because the captured room has the flag off, so their labels and handlers are unknown.
- **`perms` shape for app users** — recorded as an open gap in `OUTSTANDING.md §1e.d`.
- **Native, React Native, or Capacitor?** Nothing in the evidence says. This is our decision, and it
  interacts with §7.
- **What `customMobileAppLaunchWord` actually does** — a deep-link scheme is the obvious reading,
  and obvious is not evidence.

To close the first two, the same collector approach applies: `scripts/collect-create-new.js`
already fetches the app bundle; the mobile handlers live in the same file.

---

## 7. White-label — what the evidence actually says, and what it does not

This is the decision that shapes the framework choice, so it is worth being exact about where the
evidence stops.

### The settings, with their real labels

Read from `room-settings-schema.ts`, not paraphrased:

| setting | label in the UI | type | group | wired |
| --- | --- | --- | --- | --- |
| `ptrMobileAppEnabled` | **Enable PTR app?** | checkbox | `dont-touch` | yes |
| `ptrMobileAppCaseByCaseEnabled` | **App for Some Members?** | checkbox | `dont-touch` | no |
| `customMobileAppEnabled` | **Custom App?** | checkbox | `dont-touch` | yes |
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

**Ship one shared app first.** Reasons, in order:

1. The server contract in §5 is **identical either way** — pairing, token registration, push
   fan-out, notification state. Building it now costs nothing and commits you to nothing.
2. Whether the original offered white-label as a service is **not established**, so building for it
   now is designing against a guess.
3. It is the cheaper of the two to be wrong about. One shared app that later needs flavours is a
   refactor; a white-label pipeline nobody buys is wasted quarters.

**But choose the framework as if white-label were coming.** That costs nothing today and keeps the
door open. It is the one decision here that is expensive to reverse.

### To settle it properly

`customMobileAppLaunchWord` is `wired: false` and its behaviour is unknown, and the three
`ptrMobileAppCaseByCaseEnabled` branches never rendered. Both live in `/public/dist/app.min.js`.
`scripts/collect-create-new.js` already fetches that bundle — running it against the live original
would show what the launch word does and whether any real tenant ever had `Custom App?` enabled,
which is the closest thing to a direct answer available without asking the original's operator.

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

## 8. Suggested order

1. **Write the token-registration endpoint** and give `push_tokens_json` a writer. Small, server
   only, and it closes a dead column.
2. **Set `FCM_SERVICE_ACCOUNT_JSON`** and prove `sendTestFCM` reaches a real device. Until a push
   actually arrives, everything above is theory.
3. **Then** start the app, against a contract that is already proven end to end.

Steps 1 and 2 need no app and no store account, and they de-risk the whole thing.
