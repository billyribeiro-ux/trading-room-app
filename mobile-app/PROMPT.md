# The mobile app — a brief for its own session

Open a **new session in this folder** and paste the prompt in §1. Everything after it is the
evidence that session needs so it does not re-derive, or invent, what is already known.

Nothing here is application code yet. The **server side is built and tested**; this is the client
that has never existed.

---

## 1. The prompt to open with

> Read `mobile-app/PROMPT.md`, `docs/MOBILE-APP.md` and the repo-root `TODO.md` before writing
> anything.
>
> You are building the iOS and Android app for Trading Room. **It is an alert receiver first**: every
> control captured from the reference is about push tokens, pausing and test notifications, and none
> is about video. Do not build a media client until §5's open question is answered with evidence.
>
> The server contract is FIXED and already shipped — `POST /api/mobile/pair` in §3. Do not change it
> to suit the client; if it is genuinely wrong, say so and we change it deliberately on both sides.
>
> **The house rules apply and are not optional.** Evidence is READ, never grepped. Anything you
> cannot find is reported and written into `TODO.md` as an honest gap with a console script that
> would fetch it — never invented, never filled in with a plausible value. No dead scaffolding: a
> control whose only effect is changing its own label does not ship. Re-read your own diff before
> saying done.
>
> Start by answering §5's open questions from evidence, not by choosing an answer.

---

## 2. What already exists on the server, and works

| piece | where | state |
| --- | --- | --- |
| Six-digit PIN issue | `apps/controller/src/routes/internal/mobile-pin/[code]/+server.ts` | built. POST, mints a fresh code, moves the expiry |
| **Pairing + token registration** | `apps/controller/src/routes/api/mobile/pair/+server.ts` | **built 2026-08-10** — this is what the app calls |
| Pairing rules | `apps/controller/src/lib/server/mobile-pairing.ts` | built, 11 unit tests |
| FCM HTTP v1 client | `apps/controller/src/lib/server/fcm.ts` | built and tested, service-account auth |
| Push fan-out + token hygiene | `apps/controller/src/lib/server/member-push.test.ts` | built and tested |
| Columns | `room_users.push_tokens_json`, `mobile_pair_code`, `mobile_pair_code_expires_at`, `mobile_pair_attempts`, `notifications_state` | all present |

**`FCM_SERVICE_ACCOUNT_JSON` is unset**, so nothing can actually send yet. `fcm.ts` refuses loudly
rather than pretending — that is deliberate, and setting the variable is an owner action.

## 3. The pairing contract — fixed, do not redesign

```http
POST /api/mobile/pair
Content-Type: application/json

{ "room": "1001", "email": "dana@example.com", "pin": "418290",
  "token": "<FCM registration token>", "platform": "ios" }
```

```
200  { "paired": true }
403  { "paired": false }
```

**Every failure is the same 403 with no detail** — wrong room, unknown email, expired code, wrong
PIN, attempts exhausted. That is not laziness: distinguishing them turns the endpoint into a way to
discover which email addresses belong to which room. Do not ask for a better error message; the app
must say something generic like *"That PIN did not work. Ask for a new one."*

Things the app must respect, because the server enforces them:

- **The PIN is single-use.** It is consumed on success. A retry after a successful pair fails.
- **Five failures destroy the code.** Six digits is a million combinations and this endpoint is
  public, so the counter is the defence. After five bad attempts the member needs a *new* PIN — the
  app should say so rather than inviting a sixth.
- **`platform` must be exactly `ios` or `android`.** Anything else is refused.
- **The token is bounded** to 32–4096 characters.
- **Ten devices per member**, oldest evicted. Re-pairing the same device replaces its entry rather
  than adding one, so a reinstall is safe.

## 4. What the app has to do

From `docs/MOBILE-APP.md` §5, derived from the capture rather than invented:

1. **Pair** — member reads a six-digit PIN from the room's Mobile App Info modal, types it in.
2. **Register for push** — obtain the FCM registration token, send it with the PIN above.
3. **Receive alerts** — trade alerts fan out over FCM. *This is the product*: a member away from
   their desk still gets the alert.
4. **Respect state** — `notifications_state` is `active` / `paused` / `unsubscribed`, driven from
   the manage page. The app must not assume it is subscribed.
5. **Expire** — pair codes and notification windows both expire per the room's settings.

## 5. Open questions — answer these from evidence, do NOT choose

These are in the root `TODO.md` as evidence gaps. Guessing any of them produces an app that looks
finished and is wrong.

- **Does the app carry video/audio at all, or only alerts?** Every captured control is
  notification-related and no capture shows a mobile media path. The SFU would support it; nothing
  proves the app uses it. **This decides the entire shape of the project** — an alert receiver is a
  small app, a media client is not.
- **The three `ptrMobileAppCaseByCaseEnabled` branches** never rendered, because the captured room
  has the flag off. Their labels and handlers are unknown. (Gap 6.)
- **`customMobileAppLaunchWord`** — behaviour unknown. A deep-link scheme is the obvious reading,
  and obvious is not evidence. (Gap 7.) This is also the white-label question: see
  `docs/MOBILE-APP.md` §7 for what the evidence does and does not support about per-customer apps.
- **The `addUser` pairing route** the reference renders — `…/ptr_app/sessions/v2/addUser/<publicId>/
  ?sec=<pairSecretKey>&email=…&name=…` — has no equivalent here. Our `/api/mobile/pair` covers PIN
  pairing; that URL is a *self-serve* path and its server behaviour was never captured. (Gap 12.)

`apps/controller/scripts/collect-manage-gaps.js` and `collect-create-new.js` are written, verified
and safe; running them against the live original closes most of the above. That is an owner action —
it needs a logged-in browser on the reference.

## 6. Constraints that are not negotiable

- **A push token is a credential-shaped device identifier.** It belongs to a membership row, and
  every read and write goes through the same account scoping as everything else. One account's room
  id must never reach another's tokens.
- **Money is `i64` / `BIGINT` / `number` end to end** if the app ever touches it. Never `i32`.
- **Honest data or an explicit honest-pending state.** Never a fabricated alert, price or position
  to make a screenshot look complete.
- **No `window.confirm`/`alert`** equivalents — use the platform's own dialog primitives.

## 7. Suggested shape, and why it is only a suggestion

React Native or Flutter both satisfy §4 with one codebase, and both have first-class FCM support.
Native (Swift/Kotlin) buys the most if §5's video question turns out to be *yes*, because a mediasoup
client is meaningfully easier against the native SDKs.

**So the framework decision waits on §5.** Choosing it first, and then discovering the app needs to
consume WebRTC, is the expensive order to do this in.
