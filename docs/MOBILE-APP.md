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

`customMobileApp*` is the commercially interesting group: the reference supports **per-tenant
branded apps**, not just one shared app.

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

## 7. The decision that shapes everything else

`customMobileAppEnabled` with per-tenant store URLs means the reference supports **white-label apps
per customer**. That is a different product from one shared app, and it decides your framework:

- **One shared app** — simplest. Members pick their room. `ptrMobileApp*` settings only.
- **White-label per tenant** — every customer gets their own App Store and Play listing. Far more
  commercially valuable, and far more operational work: separate builds, separate submissions,
  separate review cycles, and Apple is strict about near-identical apps.

If white-label is the goal, choose a stack that makes a per-tenant build a configuration change
rather than a fork. That constraint should drive the framework choice, not the other way round.

**Recommendation:** ship one shared app first, and only then decide whether white-label is worth its
operational cost. The server contract in §5 is identical either way, so building it now costs
nothing and commits you to nothing.

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
