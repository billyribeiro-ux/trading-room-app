# todo-next — the room audit, the v4 corpus decision, and the owner's 2026-08-16 requirements

**Why this file is not `TODO.md`.** Owner instruction, 2026-08-16: a concurrent session is running
the `+page.svelte` decomposition and edits `TODO.md` continuously, so two sessions writing one file
is how a merge conflict silently eats a finding. **Everything about the room audit and the five new
requirements lives here.** `TODO.md` carries a pointer to this file and nothing else about them.

Companion document: `docs/reference/room-component-gap-register.md` — the evidence register, with
the `R-*` reference gaps and `P-*` owner requirements written out in full with citations. **This file
is the queue; that file is the evidence.** Do not record a status in both.

---

# ⛔ AGENT BRIEF — READ THIS BLOCK BEFORE ANYTHING ELSE

You are continuing an evidence-driven reconstruction of protradingroom (v4) as a SvelteKit app.
This block is the whole brief. Everything after it is detail you can page in as needed.

## The five rules. They are not style; each was earned by a specific failure.

1. **Evidence is READ, never searched.** Locating with a tool is fine. **Concluding** from a tool's
   output is not. Open the file and read the region — and the whole file when it is a thing you are
   rebuilding. *This session alone: grepping the manage page for `FCM|Notif` found two settings;
   READING the same region found three alert-delivery channels and a JWT revocation list, none of
   which contain those letters.*
2. **If it cannot be found, it does NOT get invented.** No guessed classes, colours or handlers. Say
   so in the reply, write it into this file, and if it needs a live capture write a console script
   (`apps/room/scripts/ptr-*.js` — copy their shape; read-only, never clicks a mutation).
3. **Rule out your own tooling BEFORE reporting a failure.** *This session: a bundle comparison
   returned "51 unresolved" because it searched for `dt({` while the raw bundle uses `ut({`; and a
   capture reported `inboundAfterCommand: 0` from a listener that was never attached — the exact
   opposite of the truth.* If a check fails, first prove the check is right.
4. **Rendered DOM > bundle > prose.** An owner-pasted screenshot or DOM outranks everything.
5. **Nothing exists without a consumer.** No class with no CSS, no control whose only effect is
   changing its own label, no setting nothing reads.

## The corpus is v4. Measured, not assumed.

`apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`. The older `docs/source/` decode is
still valid: both bundles hold the **same 68 component definitions** (51 first-party + 17
third-party), and only **two** component bodies differ — `app-webrtc-troubleshooter` (+551, the
Mobile App tab) and `app-presentationarea` (+299, unread). The other 39 textual differences are
minifier identifier renames, proven on `app-root` (454 bytes both, `DRe`→`IRe`).

## Where things stand

| | |
|---|---|
| reference components | **51** — 42 render the element here, 9 do not |
| absent entirely | 6, all read whole → R-1…R-6 |
| built without the wrapper | 3 → R-7, R-8, R-9 |
| **audited for completeness** | **9 of 42.** 33 not audited — the bulk of the work |
| owner requirements | P-1…P-5, §3 and the register's Part B |

## Proven this session, with citations — do not re-derive

- **`restoreMobileAppTokens` is answered at the wire.** Request `{"event":"cmd","data":{"cmd":"restoreMobileAppTokens","data":{}}}`;
  reply 39 ms later `{"event":"cmd","data":{"cmd":"restoreMobileAppTokens"}}` — **no `data` key at
  all** — and `handleServerCmd`'s 95-case switch has no case for it, so it is discarded. Observed
  twice. §3a.
- **P-1's root cause.** The reference stops push on **`lastLogin` decay, not subscription state** —
  `mobileAppExpireNotificationsDays`, *"If user does not log in this many days, we'll stop sending
  push notifications"*, default **14**. A fourteen-day leak by construction. §3.
- **Transport:** `wss://chat.protradingroom.com/ptr_app/ptr_asyngular/` (asyngular). §3a.
- **Three alert-delivery channels, not one:** FCM push, Twilio SMS, Protexting SMS. §3b.
- **The web client does no push at all** — `serviceWorkers: []`, `globals.fcmToken` a dead stub in
  both bundles.

## Still unproven — say so, do not fill in

The reference **server** (uncaptured), what the empty ack means server-side, whether a notification
actually lands on a phone, `app-presentationarea`'s +299 bytes, and the meaning of `useV3/V4/V5`
(`v5.md` — absent from every bundle we hold).

---

# 0. WHEN `app.min.js` ARRIVES — do this, in this order

The owner is pulling it with `apps/room/scripts/ptr-pull-manage-bundle.js`. It is the manage-page
bundle and the last big unread artefact. **It is expected to answer P-1 outright.**

1. **Put it somewhere pinned, do not reformat it.** Capture directories are SHA-256 pinned and
   enforced inside `pnpm test`. Add alongside; never edit in place.
2. **READ IT. Do not grep it.** This is the file the rules exist for. Read in slices end to end and
   write down what each region contains, including regions that look irrelevant — that is precisely
   where the SMS channels were found.
3. **The questions it should answer**, in priority order:
   - the implementations of `pauseUserNotifs(id,…,'pause'|'resume'|'unsub')`, `getFCMTokens`,
     `resetFCMForuser`, `sendTestFCM`, `getAppPin`, `showAlerterAppTokens` — **and the exact server
     endpoints, payloads and response shapes each one calls.** That is the P-1 contract.
   - whether any of them is keyed on subscription/entitlement state, or only on `lastLogin`
   - the three `ptrMobileAppCaseByCaseEnabled` branches that never rendered in any capture
   - what `customMobileAppLaunchWord` and `customMobileAppV3Name` do
   - what `sendFcmAlertsNew` ("Use pub/sub for notifications") switches between — **if this is FCM
     topics, per-member revocation may be structurally impossible, which would change the design**
   - whether `invalidTokens` (the JWT revocation list) is enforced anywhere
   - anything at all about `restoreMobileAppTokens` on the server side
4. **Record every answer in this file with a byte offset.** Then update the register.
5. **Expect it to contain things nobody asked about.** Read for those too.

---

---

# 1. THE CORPUS IS v4 — decided by the owner, and measured before acting

**Owner instruction, 2026-08-16: "we have to be all v4."**

The audit so far read `apps/room/docs/source/` (`main.d6d3c112b59b7d0d.js`, 2,887,876 B). That is
**not** the current build. There are three captures:

| capture | bundle | status |
|---|---|---|
| `apps/room/docs/source/` | `main.d6d3c112b59b7d0d.js` — 2,887,876 B | the OLDER build — what the 51 decoded components came from |
| `apps/room/docs/source-v4-2026-08-15/` | `main.d1d09071be31f1ba.js` — 2,891,205 B | **the current v4 — the target** |
| `apps/room/docs/source-v3-2026-08-15/` | `main.99a5781d1d7a7775.js` | v3, never opened |

## What "all v4" actually costs — measured, not estimated

**Component sets are IDENTICAL between the two builds.** Both contain **68** single-selector
component definitions and the two sets differ by nothing:

- **51 are first-party `app-*`** — exactly the set already decoded, so the decode is complete.
- **17 are third-party** and are correctly absent: `as-split`, `pan-zoom`, `re-captcha`,
  `router-outlet`, `ng-component`, `option`, the five `ngb-*`, and the six `emoji-mart` / `ngx-emoji`
  components.

**Nothing was added or removed between the builds.** So the inventory in the register — 51
components, 42 rendering the reference element, 9 absent — **holds unchanged for v4.**

Then every component body was extracted from both bundles and compared:

| result | count | meaning |
|---|---|---|
| byte-identical | 10 | unchanged |
| differ, **same length** | 39 | **minifier identifier renames only** |
| differ, **different length** | **2** | **real content change** |

**The 39 are proven renames, not assumed.** `app-root` is 454 bytes in both and the sole difference
is `H(1,DRe,5,1)` → `H(1,IRe,5,1)` — one minified symbol. Each build assigns short names in its own
order, so near-every component differs textually while being semantically identical.

### So only TWO components genuinely changed

| component | old → v4 | what |
|---|---|---|
| `app-webrtc-troubleshooter` | 12,346 → 12,897 (**+551**) | the **Mobile App tab** — see R-15 |
| `app-presentationarea` | 37,843 → 38,142 (**+299**) | **UNKNOWN — not yet read** |

**"All v4" is therefore cheap, and that is the point of measuring first.** It does not invalidate the
audit; it costs a re-decode plus a genuine re-read of two components.

**⚠ Instrument note.** The first version of this comparison returned "51 unresolved" because it
looked for `dt({`, the helper name in the *decoded* files. The raw v4 bundle uses `ut({` — the
minified helper name differs per build. Rewritten to match `cmp=<ident>({` and bracket-match, then
validated on a known answer (`app-webrtc-troubleshooter` must come back changed, and it did). **The
first result was my tool being wrong, not a finding.**

## Actions

- [ ] **Re-decode the 51 components from `source-v4-2026-08-15/main.d1d09071be31f1ba.js`** into a v4
      component directory. `apps/room/scripts/extract-all-production-components.mjs` is the existing
      decoder. **Do not overwrite `docs/source/components/`** — those are SHA-256 pinned and enforced
      inside `pnpm test`; add alongside.
- [ ] **Re-point `pull-everything-contract.test.ts`** at the v4 bundle, keeping the "finds every
      `selectors:[` rather than a hardcoded list" property.
- [ ] **Read `app-presentationarea`'s +299 bytes.** Unknown content in the single largest component,
      which is our `PresentationArea.svelte`.
- [ ] **Promote the register's nine `MATCH` verdicts to v4** — trivial for the 39 renames, real work
      for the two above.

---

# 2. R-15 — the v4 Mobile App tab is not built, and it matters for P-1

**This is the `app-webrtc-troubleshooter` +551, decoded in full in
`docs/decoded/mobile-app-decoded.md` §2.5 (a file that had never been read until 2026-08-16).**

v4 adds a **third tab** to the connectivity troubleshooter:

```html
<li role="presentation" class="nav-item">
  <button type="button" role="tab" class="nav-link" [class.active]="activeTab==='mobile'"
          (click)="onTabChange('mobile')">
    <i class="fas fa-mobile-alt me-1"></i> Mobile App
  </button>
</li>
```

and the pane behind it is one paragraph and one button:

```html
<div class="mobile-app-container">
  <p class="text-muted mb-4"> Use this to restore your mobile app connectivity and get a test notification on your device. Only do this if you are not getting notifications </p>
  <button type="button" class="btn btn-primary" (click)="restoreMobileAppTokens()">
    <i class="fas fa-sync-alt me-1"></i> Restore Connectivity
  </button>
</div>
```

(Missing full stop after `notifications` is the reference's — transcribe it.)

**Four behavioural changes ship with it:**

1. `restoreMobileAppTokens()` → `socket.transmit("cmd",{cmd:"restoreMobileAppTokens",data:{}})`, then
   an **unconditional** `bootbox.alert("Command sent successfully, check your mobile device for a
   test notification")` — no callback, no error path, and `send()` swallows every throw.
2. **The default tab changed**: `activeTab = isPresenter ? "network" : "mobile"`. In the older build
   a non-presenter saw **no tab strip at all**; in v4 they get one tab and it is this one.
3. **The modal title became two branches** — `" Connectivity/Mic Troubleshooter "` for a presenter,
   `" Connectivity Troubleshooter "` otherwise. Both padded.
4. **The tab is ungated.** `ptrMobileAppEnabled`, `customMobileAppEnabled` and `freeTrialsGetApp` are
   **absent from the whole component**, while every other mobile control in the bundle carries that
   gate. A member of a room with the app disabled still sees the tab and can fire the command.

**Ours is the OLDER build.** `ModalHost.svelte:5588` renders the single literal
`title="Connectivity/Mic Troubleshooter"`, and `restoreMobileAppTokens`, `Restore Connectivity`,
`mobile-app-container` and `fa-mobile-alt` have **zero occurrences in `apps/room/src`**.

**Why this is P-1's row and not a cosmetic one:** `Restore Connectivity` is the member's **only
self-service fix for notifications that have stopped**, and in v4 it is the only tab a non-presenter
gets. It is the other half of the notification story.

- [ ] Build the third tab against the v4 bundle, including the ungated behaviour **or** a recorded
      decision to gate it (`mobile-app-decoded.md` §3 row 26 calls it "the one inconsistency in an
      otherwise uniformly-gated feature").
- [ ] **Server half is unknown:** nothing in any bundle says what `restoreMobileAppTokens` does. See §4.

---

# 3. P-1 — mobile push after cancellation. FOUND: the reference decays, it does not stop.

Full write-up in the register. **The finding, because it changes what to build:**

`room-settings-schema.ts:289-290`, the reference's own labels and help text, verbatim:

| setting | label | help text | default | wired |
|---|---|---|---|---|
| `mobileAppExpireNotificationsDays` | **Push expire days** | *"If user does not log in this many days, we'll stop sending push notifications"* | **14** | **false** |
| `ptrMobileAppExpirePairCodeDays` | **PTR app exp days** | *"If user does not log in from regular site, mobile app token will expire after this many days"* | **7** | **false** |

**The reference's automatic stop is keyed on `lastLogin`, not on subscription state.** Cancel →
member can no longer log in → 14 days later push stops. **That is a fourteen-day paid-content leak by
construction, and it is what the owner is seeing. It is not a defect this rebuild introduced.**

Every **manual** control is built here (`pauseUserNotifs` → `notificationsState`, `resetFCMForuser`,
`sendTestFCM`); only the **automatic** one is missing, and it is the wrong mechanism anyway.

**Second finding: this repo cannot send alert pushes at all.** `sendPush` has exactly two callers —
a `validate_only` registration check and an operator test push. There is no alert fan-out, and
`FCM_SERVICE_ACCOUNT_JSON` is unset. **The notifications members receive today come from the
production/legacy system, not from this rebuild.**

## Actions, split by who can act

**Live system — fixable today, without this repo:**
- [ ] Unsubscribe lapsed members (`pauseUserNotifs('unsub')` / `resetFCMForuser`).
- [ ] Set **Push expire days** far below 14 as an interim floor.

**This rebuild — get it right before the fan-out exists:**
- [ ] **Check `notificationsState` at SEND time.** The column is written by four places and read by
      none on any send path, because no send path exists. First gate, or pause/unsub is decorative.
- [ ] **Gate on entitlement at SEND time, not entry.** `evaluateEntitlement` is a door check
      evaluated once from asserted SSO claims; a paired phone never passes that door again.
- [ ] **Drive revocation off the billing event.** `accounts.status` is the designed seam and
      anticipates *"past-due, closed"*. **No billing machinery exists anywhere in `apps/` or
      `services/`.**
- [ ] **Wire login-decay LAST, as a backstop only.**
- [ ] **Never revoke by deleting tokens** — only a registration FCM itself disowns is deleted.
      Suspension belongs in `notificationsState`.

**Row Q in `TODO.md` is adjacent and is NOT this.** Q proves the *web entry door* closes after
cancellation. Push bypasses the door.

---

# 3a. ANSWERED — `restoreMobileAppTokens`, captured live 2026-08-16 11:36 UTC

Runtime capture on the live room, `main.d1d09071be31f1ba.js`, client `v4.0.1-5858cccd`, via
`apps/room/scripts/ptr-restore-mobile-tokens.js`. **Observed twice — once script-injected, once from
the owner's own button click — with identical results 39 ms apart each time.**

**Request** (envelope mirrored from a real captured frame, not assumed):

```json
{"event":"cmd","data":{"cmd":"restoreMobileAppTokens","data":{}}}
```

**Response, 39 ms later, verbatim:**

```json
{"event":"cmd","data":{"cmd":"restoreMobileAppTokens"}}
```

## The finding: the acknowledgement is EMPTY, and then it is discarded

**The reply has no `data` key at all** — not `{}`, not `null`, absent. The server echoes the bare
command name and nothing else. No status, no token count, no success flag, no error.

And `handleServerCmd`'s 95-case switch **has no case for it** (bracket-matched and read in full), so
the room receives that acknowledgement and drops it on the floor. The unconditional
`bootbox.alert("Command sent successfully, check your mobile device for a test notification")` fires
~39 ms *before* the real reply arrives and would say the same thing if the server had refused.

**Consequences for P-1, and they are structural:**

1. **There is no client-observable success signal for push re-registration.** Any revocation or
   restore UI we build must be driven server-side; a client cannot confirm anything.
2. **The reference's own "success" message is a lie by construction** — it is not conditional on
   anything. Do not reproduce that shape; make ours reflect the acknowledgement.
3. The command carries **no arguments**, so the server identifies the member purely from the socket
   session. Any equivalent of ours must do the same and must never accept a member id from a client.

## Transport contract, captured — previously unknown and not in any dump

| thing | value |
|---|---|
| socket URL | `wss://chat.protradingroom.com/ptr_app/ptr_asyngular/` — **asyngular** (socketcluster v16 fork) |
| command envelope | `{"event":"cmd","data":{"cmd":…,"data":…}}` |
| subscribe ack | `{"rid":<cid>}` |
| private inbound channel | `/sess/<sessionID>/privCmdsIn/<userXrefID>-<socketID>-<userXrefID>/` |
| roster admin channel | `/sess/<sessionID>/rosterEventsAdmin/` |
| roster count channel | `/sess/<sessionID>/<serverID>/roster/` |

**Independent confirmation of R-15:** the live DOM returned
`<button type="button" class="btn btn-primary"><i class="fas fa-sync-alt me-1"></i> Restore Connectivity </button>`
— matching the markup decoded from the bundle exactly.

**Two negatives worth recording:** `http: []` across both runs, so the client makes no HTTP call on
this path (consistent with `sendFcmAlertsNew` off on this room); and `serviceWorkers: []` with
`Notification.permission: granted`, confirming the **web** client registers nothing for push. Push is
phone-only, and `globals.fcmToken` remains the dead stub both bundles declare.

**STILL OPEN — the one thing a console cannot see:** whether a notification actually arrived on the
phone. `humanObservation` in the capture is deliberately blank. **Ask the owner.**

⚠ **The capture files contain PII** — member email, IP and city from the `privCmdsIn` roster frame.
They stay in `~/Downloads`; `.gitignore` already forbids live captures in the repo.

# 3c. R-15 CONFIRMED FROM RENDERED DOM — three gaps in the troubleshooter, not one

*(This continues §2. It sits here because it was captured after §3a, and the sections are kept in
the order the evidence arrived rather than reshuffled — a renumbered document is one where the
citations stop matching the session that produced them.)*

Owner pasted the live troubleshooter modal's rendered markup, 2026-08-16. **Rendered DOM outranks the
bundle** under the evidence rule, and it matches the bundle decode exactly — including the Angular
anchor comments, which is what proves the gating.

**The tab strip, verbatim from the paste:**

```html
<li role="presentation" class="nav-item"><button type="button" role="tab" class="nav-link">
  <i class="fas fa-network-wired me-1"></i> Network Test </button></li>
<!---->
<li role="presentation" class="nav-item"><button type="button" role="tab" class="nav-link">
  <i class="fas fa-mobile-alt me-1"></i> Mobile App </button></li>
<li role="presentation" class="nav-item"><button type="button" role="tab" class="nav-link active">
  <i class="fas fa-microphone me-1"></i> Mic Test </button></li>
<!---->
```

**Read the `<!---->` anchors — they are the evidence, not noise.** An `*ngIf` leaves a trailing
comment anchor; a static element does not. Network Test is followed by one, Mic Test is followed by
one, **Mobile App is not.** That is the bundle's
`H(9,hAe,…,"li")` / `d(10,"li",9)` / `H(14,pAe,…,"li")` rendered, and it confirms:

- **Network Test — presenter-gated**
- **Mobile App — UNGATED** (the anomaly: every other mobile control carries `ptrMobileAppEnabled`)
- **Mic Test — presenter-gated**

## Ours has three divergences, not one

`ModalHost.svelte:5595-5617`:

| # | v4 | ours | severity |
|---|---|---|---|
| 1 | three tabs | **two** — no Mobile App tab at all | **the R-15 gap** |
| 2 | Network Test gated on `isPresenter` | **ungated** — every member sees it | **a member sees a presenter tool** |
| 3 | `activeTab = isPresenter ? 'network' : 'mobile'` | defaults to `network` | non-presenter lands on a tab that should not exist for them |

**Gap 2 was not previously recorded and is the one to check first** — it is an authority divergence,
not a cosmetic one. In v4 a non-presenter opening this modal gets **exactly one tab, Mobile App**.
In ours they get Network Test, which upstream is presenter-only.

Also unconfirmed here: the v4 title is **two branches** — `" Connectivity/Mic Troubleshooter "` for a
presenter, `" Connectivity Troubleshooter "` otherwise. Ours is one literal (`:5588`). The paste
shows the presenter branch plus two `<!---->`, consistent with the conditional.

## What ours DOES have, and it is most of the modal

The mic pane is built and matches: `mic-test-container`, `mic-device-selector`, `mic-label`,
`mic-select`, `waveform-canvas` (480×120), `waveform-overlay`, `Start test to see waveform`,
`volume-meter`, `volume-bar-fill`, `mic-status-dot`, `Ready to test`, `btn-mic-start`,
`Microphone Device`, `Volume Level`. **The missing work is the tab strip and the Mobile App pane,
not the mic test.**

Two details from the paste worth transcribing when the pane is built: `.mic-status` carries a state
suffix class (`mic-status-idle`) and is followed by **five** anchor comments — five status variants;
`.mic-actions-row` is followed by **four** — four conditional buttons beyond `Start Test`.

# 3d. R-1 WIDENS — the typing feature is a TEXT LINE, not only the three dots

From the live room DOM (`ptr-manage-dom.html`, 269,051 B, captured as admin 2026-08-16). All three
`typing-indicator` occurrences are **CSS inside `<style>` blocks, not markup** — nobody was typing,
so `app-typing-indicator-dots` did not render. **R-1 stays open.** But the scoped CSS names a second
element the register never mentioned:

```css
.users-typing      { color:#90949c; font-size:12px }
.users-typing em   { font-weight:700 }
.users-count       { color:#90949c; font-size:12px }   /* chat only */
```

**So "someone is typing" is a text line with the names in `<em>`, alongside the dots component.**
R-1 in the register describes only the dots and is therefore incomplete.

**And the container rule differs per host — three components, two shapes:**

| component (scope id) | `.typing-indicator-container` |
|---|---|
| reply modal `c1823712792` | `margin: 4px 16px` |
| alert-QA modal `c698792182` | `margin: 4px 16px` |
| **chat `c3761163150`** | **`margin: 0 8px; border-top: 1px solid #ccc`** |

The chat variant also adds `white-space:nowrap; overflow:hidden; text-overflow:ellipsis` to
`.users-typing` — a long list of typers truncates rather than wrapping. **Transcribe all three
separately; they are not one rule.**

## The room DOM capture is itself an asset — use it before reading more bundle

`ptr-manage-dom.html` is the **rendered** room as an admin, and rendered DOM outranks the bundle.
Counts taken from it: `app-st-message` ×12, `app-alerts` ×4, and one instance each of
`app-user-settings-modal`, `app-session-control-modal`, `app-post-alert-modal`, `app-privchat`,
`app-poll-modal`, `app-user-info-modal`, `app-alert-qa-modal`, `app-webrtc-troubleshooter`.

**Not present, and each absence is informative rather than a gap:** `mobile-app-container` and
`Restore Connectivity` (0 — the troubleshooter's mobile pane renders only when that tab is active),
`positionOverlay` (0 — R-2 needs its setting on), `app-note` and `app-files` (0 — not mounted in
this state).

**This file should be read for the 33 unaudited components before more bundle reading.** It is the
ground truth for what actually renders, and it is one file rather than 33.

⚠ It is a live capture and holds member data. It stays in `~/Downloads`; `.gitignore` forbids it here.

# 3b. What READING the manage page found that SEARCHING it could not

**Owner, 2026-08-16: "By using grep or py you will most likely miss every single one of the things
missing. The only way around is to actually read through the files."** Proven within minutes.

I first searched `apps/controller/evidence-dumps/login-page/manage` (219,388 B) for `FCM|Notif` and
got two useful settings. Then I **read** bytes 168,000–184,000 end to end. Everything below was in
that same region and **none of it contains the letters I had searched for**:

| found by reading | why it matters |
|---|---|
| **`twillioApiToken`, `twilioPhone`** (labels *Twillio Token*, *Twillio Phone*) | **A SECOND ALERT DELIVERY CHANNEL — SMS.** |
| **`protextingSecretTok`, `protextingGroupIDs`** (*Protexting Token*, *Protexting GroupID*) | **A THIRD one.** Protexting is a bulk-SMS provider, keyed by group. |
| **`invalidTokens`** — *"Comma separated list of invalid JWT tokens."* | **A JWT REVOCATION LIST.** Directly a P-1 mechanism, and its name contains no push/mobile/FCM word. |
| `useV5` — *"Use v5? (DON'T!)"*, `useV3` — *"Yes!"* | **There is a v5.** The captured room runs v3 on this flag. |
| `superClusterID`, `superClusterExpectedServerCount` | supercluster scaling — *"scale the session across the super cluster"* |
| `useFFmpegRecording` (BETA), `useLessBusyVsRoundRobin` | recording + load-balancing, both relevant to `TODO.md` rows R and X |
| `customPlayerURL` | *"always show an iframe with this url in the screens section"* |
| `iframeSSOTFix`, `stAppScheduleID` (GCal), `customUserInfoURL` | unmodelled room settings |
| `swapCLusterIDs()`, `applyToAllSessions()` | two admin actions with no counterpart here |

## The consequence for P-1, and it widens the problem

**"Members continue to receive alerts" may not be only push.** The reference can deliver alerts by
**FCM push**, **Twilio SMS** and **Protexting SMS**. A cancellation that stops one and not the others
still leaks the product. **Every channel has to be enumerated before any revocation is designed** —
and the only way to enumerate them is to read the manage page, not to search it.

- [ ] **Read `login-page/manage` end to end — all 219,388 bytes.** I have read ~16,000 (bytes
      168,000–184,000). **93% of that file is unread**, and the 7% I read produced three delivery
      channels and a revocation list that no search of mine would have surfaced.
- [ ] Same for `evidence-dumps/NEXT-STEP/gaps/rawHtml.html` and the `login-page/*` siblings.
**CHECKED, and it corrects the framing above:** all nine — `twillioApiToken`, `twilioPhone`,
`protextingSecretTok`, `protextingGroupIDs`, `invalidTokens`, `useV5`, `superClusterID`,
`useFFmpegRecording`, `customPlayerURL` — **are already in `room-settings-schema.ts`.** The schema
extraction was thorough and these are not missing from it.

**So the gap is not capture — it is that nobody ever JOINED THEM UP.** Three alert-delivery channels
and a JWT revocation list sat in the schema as unwired rows while P-1 was described as a
push-notification problem. That is the more dangerous kind of gap, because the evidence was already
on disk and read past. **A settings row with `wired: false` is not a finding until somebody asks what
it does.**

---

# 6. `app.min.js` — THE READ LOG. 455,329 bytes, 17 lines, read in order.

**Arrived 2026-08-16 07:51 via `apps/room/scripts/ptr-pull-manage-bundle.js` (owner saved it by hand
from the apex domain after the script correctly refused to guess on `chat.`). It lives in
`~/Downloads/app.min.js` — a live-site asset, kept out of the repo by `.gitignore` like every other
capture.** sha256 is in `ptr-manage-pull.json` next to it.

**How to read it.** The bundle is 17 physical lines: line 1 is a 48-byte preamble, lines 2–16 are
~32,010 bytes each, line 17 is 40 bytes. That is a natural slicing structure — **one line is one
readable slice.** `sed -n '<N>p' app.min.js | fold -w 110 > /tmp/appmin-L<N>.txt` then open it. It
is 292 wrapped lines per slice and it reads fine. **Do not grep it** — everything in §6.1 below that
is marked NEW was two or three tokens away from a function I already knew about, in the same
statement, and no search for a name I already had would have returned any of it.

| line | bytes | status |
|---|---|---|
| 1 | 0–48 | not read |
| 2–8 | 49–224,204 | **NOT READ** |
| **9** | **224,205–256,236** | **READ WHOLE — §6.1** |
| 10–16 | 256,237–455,287 | **NOT READ** |
| 17 | 455,288–455,328 | not read |

---

## 6.1 Line 9 — the user-administration controller, and the whole P-1 contract

### The P-1 SERVER CONTRACT — all six push actions, complete

**One endpoint for every one of them:** `$http.post(appVars.globals.APIURL + "/users/v1/sessions", args)`.
Every call is guarded by `var args = $scope.makeReqTokenForCmd("<cmd>"); args && …` — **a falsy return
aborts the call silently.**

> ⚠ **Which `makeReqTokenForCmd` governs line 9 is NOT yet established.** §6.2 found *a* definition,
> in `SideBarCtrl`, and it takes `(cmd, tok)` and **can never return falsy** — so it is not the one
> these guards are written against. The manage controller must define its own, and that definition is
> in an unread slice. **Do not model the auth token on the SideBarCtrl one.** Named in §4.

| `$scope` function | wire `cmd` | args beyond the token | response read |
|---|---|---|---|
| `pauseUserNotifs(xrefid,name,$index,mode)` | **`updateUserFCMTok`** | `sessionID`, `xrefID`, **`tokcmd: mode`** | `data.success`, `data.msg` |
| `sendTestFCM(xrefid,name,$index)` | `sendTestFCM` | `sessionID`, `xrefID`, `msg` | `data.msg` shown as `"\nLog:"` |
| `resetFCMForuser(xrefid,name,$index)` | **`resetFCMTokens`** | `sessionID`, `xrefID` | `data.success` |
| `getFCMTokens(xrefid,name,$index)` | `getFCMTokens` | `sessionID`, `xrefID` | **`data.fcmTokens`** (JSON-stringified into the alert) |
| `getAppPin(email,name,$index)` | `getAppPin` | **`email` — and nothing else. No `sessionID`, no `xrefID`.** | **`data.pin`**, else `data.message` |
| `showAlerterAppTokens(name,tokens)` | **none — no HTTP at all** | — | pure `JSON.stringify` of the tokens already on the row |

**`updateUserFCMTok` with `tokcmd` is the revocation primitive P-1 needs.** The three modes come from
the row menu's call sites (`'pause' | 'resume' | 'unsub'`, recorded in `docs/MOBILE-APP.md`); the
implementation passes `mode` straight through without validating it, so **the mode vocabulary is the
server's, not the client's, and the client is not evidence for the full set.** Treat those three as
observed-in-use, not as the closed enum, until the row markup or the server says otherwise.

**Two corrections to what was previously written down:**

1. **`showAlerterAppTokens` calls no server.** `docs/MOBILE-APP.md` lists it among the row-menu push
   actions, which reads as if it were an API action. It is a display helper over `tokens` already
   present on the user row — so **the user row object already carries the app tokens**, which means
   the roster payload contains them and `getFCMTokens` exists to fetch something the row does *not*
   have. Those are two different token sets, or two different freshnesses. Not yet resolved.
2. **`restoreMobileAppTokens` appears 0 times in this bundle.** It is the v4 *room*'s command and has
   no manage-page counterpart, so §3a's empty ack remains the only observation of it anywhere.

### NEW — two functions with the same shape, neither previously known to exist

```js
$scope.manageMobileApp = function(xrefid, name, $index, mode){
  var args = $scope.makeReqTokenForCmd("manageMobileApp");
  args && (args.sessionID = $scope.sessionID, args.xrefID = xrefid, args.appcmd = mode,
    $http.post(appVars.globals.APIURL + "/users/v1/sessions", args).success(function(data){
      data.success ? (bootbox.alert("Mobile App command OK for: " + name + ". (" + mode + ")"),
                      $scope.loadUsers())
                   : bootbox.alert("ERROR: Mobile App command failed. Error:" + JSON.stringify(data.msg)) }))}
```

- **`manageMobileApp`** — cmd `manageMobileApp`, args `{sessionID, xrefID, appcmd: mode}`.
- **`manageFileAccess`** — cmd `manageFileAccess`, args `{sessionID, xrefID, appcmd: mode}`. Byte-for-byte
  the same shape with `"File Access"` in the alert string.

**Both call `$scope.loadUsers()` on success and the FCM six do not.** That is the tell: these two
**change a persisted flag on the user row that the roster renders**, where pause/resume/unsub change
something the roster does not display. So `manageMobileApp` is per-member app enable/disable — almost
certainly the `ptrMobileAppCaseByCaseEnabled` mechanism, whose three branches never rendered in any
capture. **The `appcmd` vocabulary is still unknown** and is only obtainable from the row menu's
`ng-click` attributes — which is exactly what the pull script's `App and Notifications` gap says to
capture. `manageFileAccess` is the same mechanism applied to the Files pane.

- **`sendTestAlert(xrefid,name,$index)`** — cmd `sendTestAlert`, args `{sessionID, xrefID, name, msg}`.
  `bootbox.prompt({title:"Enter the alert message:", inputType:"text"})`, trims, rejects empty, and on
  success says only `"Sent!"`. **Distinct from `sendTestFCM`** — it takes `name` as well and its reply
  carries no log. This is a real alert down the alert path, where `sendTestFCM` is a push-transport test.

### NEW — the role enum, from the bulk-action menu's own markup

Read out of the `actionsWithEmailListOptions` bootbox dialog, where each item is
`onclick='updateManyFromEmailList(<n>)'`. **These are integers the server stores, not labels:**

| n | action, verbatim from the menu |
|---|---|
| **0** | *never assignable* — every bulk loop skips `0 === user.role`, and the select-all skips it too |
| 1 | Make Presenter (mic + desktop icons) |
| 2 | UNBAN Participant **and** Make Participant — **the same integer for both** |
| 3 | MUTE Participant |
| 4 | BAN Participant |
| 5 | Make Admin (Non-Presenter) |
| 6 | Make TRIAL user |
| 10 | Remove All |

**Role 0 is excluded from every bulk path in code, in three separate places.** Unban and
make-participant being the same value means **ban/mute are not a separate axis — they are the role**,
so a banned user's prior role is destroyed by the ban and unban restores everyone to plain
participant. Worth knowing before P-2 or P-3 model anything on top of it.

### The per-user mutation command is ONE command with mode flags

`updateUserXref` carries all of these, distinguished by which keys are present:

| keys added | effect |
|---|---|
| `newRole` (int) | role change |
| `isPMUpdate: true`, `restrictPM` | private-message restriction; alert says `"Dissabled"` (sic) |
| `permsChange: true`, `hasMic`, `hasScreen`, `hasCam`, `hasAdminChat`, `canEditNotes` | **the per-user permission set — six booleans, and this is the complete list** |
| `note` (`"_EMPTY_"` sentinel to clear) | per-user admin note |
| `newPW`, `emailOut` (bool) | set password, optionally email credentials |

Siblings: `editUsername` (`newUsername`), `updateUserXrefMulty` (`newRole`, `applyToAllRooms`, and
either `emailList` **or** `xrefIDs`), `updateUserXrefMultyEmailList`, `updateUserXrefMultyBadge`
(`badge`, `badgeCmd: "add"|"remove"`).

**`applyToAllRooms` switches the identifier from `xrefIDs` to lowercased `emailList`** — because a
member's xref id is per-room and their email is not. That is the cross-room identity seam, and it is
the same seam P-2 (one computer + one mobile device per account) has to bind to.

### NEW — a SECOND API with different auth, inside the same controller

```js
$http.post("/ptr_app/mp/v2/resend-welcome-email", payload,
           {headers:{Authorization:"Bearer " + $localstorage.get("tokenSite")}})
```

Everything else in this file posts to `{APIURL}/users/v1/sessions` with a `makeReqTokenForCmd` token.
`sendWelcomeEmail` alone posts to a **`/ptr_app/mp/v2/` path, same-origin and relative, with a JWT
bearer from `localStorage.tokenSite`** and a payload of `{xrefId, sessionId}` — note the camelCase
`xrefId`/`sessionId`, *different from the `xrefID`/`sessionID` used everywhere else*. **So there are
two generations of API in this app and the newer one is JWT-bearer.** That matters for P-1: a new
subscription-revocation endpoint should be built on the v2 shape, not the v1 command-token shape.

Also: it resets the user's password to a random one as a side effect, and its own success alert reads
`$scope.userPermissions.userName` — a variable set by a *different* button — so **the reference
displays the wrong name here unless a permissions row happened to be selected.** A real bug in the
reference; do not reproduce it.

### Session payload, read from `setSessionVarsFromData` — the fields a room actually has

`uuid` · `chatServerURL` (falls back to `{APIURL}/talk`) · `isChatOnlyRoom` · `media_server` →
`https://<server>:443/janus` · `media_max_bitrate` (**default 512000**) · `media_fir_rate` (**default
5**) · `relay_to_repeaters` + `media_relays` (comma-split into `janusRepeaters`) · `force_mp3_audio` →
`useMPGAudioService` · `force_jpeg_screenshare` → `useMPGScreenService` · `badges[]` → rebuilt as a
`badgesH` id-keyed map and **the array is then deleted**.

`alertsOnBottom` picks between two whole app states — `app.dashboard-alt` and `app.dashboard` — and
**`localStorage.altLayoutMode` overrides the server's value**, which is a per-device layout
preference outranking a room setting.

### Other things in line 9 worth having written down

- **Login** is `POST {APIURL}/users/v1/users.json` with `{cmd:"loginChat", roomID, email, pw, tagline,
  pin, siteToken, token}`. **`pin` is `$scope.login.pinCode`** — the same PIN `getAppPin` returns.
  Registration is the same endpoint with `{cmd:"registerByEmail", roomID, name, email, recaptcha}`.
- **Four password endpoints, two identity systems:** `/users/v1/change-password` and
  `/users/v1/forgot-password` for the *site user*, `/users/v1/user-change-password` and
  `/users/v1/user-forgot-password` for the *xref user*. All take `recaptcha` and `source:"webApp"`;
  the change ones take `userUUID` **parsed from the tail of `window.location.href`**.
- **SSO exists:** `getB64SSO()` reads query param **`u`**, `JSON.parse(atob(u))`, and takes `name` +
  `email` off it, then sets `authToSession = false`. Base64, not signed, at least on the client side.
- **`statsForSession`** — `{sessionID, d1, d2, filterFT, userSearch, showMobileStat}`; over 1,000 rows
  it force-downloads a CSV before offering to render. **`showMobileStat` means the server can filter
  stats to mobile-app users** — a signal that mobile sessions are distinguishable server-side, which
  P-2 needs.
- **`statsForSessionMontly`** (sic) — `{startMonth, startYear, endMonth, endYear}` → rows of
  `{month, totalLogins}`; CSV named `Monthly_report_<sess.uuid>_<range>.csv`.
- **Infrastructure controls in the admin UI:** `addLiveServer` / `removeLiveServer` (via
  `saveSessField`, `"host|weight"`-ish format, refuses duplicates), `applyRepeaterToAccount`, and
  **`resetMediaServerSSH` — an admin button that SSH-restarts a media server.**
- **The system check hard-codes `m5.protradingroom.com`** and calls
  `webRTCStreamTestService.joinScreen("test","3",null,testServer)`. Relevant to R-15's Network Test tab.
- **The sidebar renders a mobile user count** — `mobileCountSide`, alongside `rosterLenSide` and
  `ftCountSide` (free-trial count). Spelled `monbileCount` in the source; that is the reference's typo,
  not a transcription error.
- Name/tagline validation: rejects `@ * ! % ^ & ( )` in the name, rejects anything URL- or email-shaped
  in the tagline, and optional phone validation through `window.iti` (intl-tel-input) gated on
  `window.__hasPhoneValidation`.

### What line 9 did NOT answer

- **No `lastLogin` / entitlement gate anywhere in it.** Every push action here is an *admin acting on
  one member by hand*. Nothing in this slice ties any of them to subscription state — consistent with
  §3, where the only automatic stop is `mobileAppExpireNotificationsDays` decay. **Still to be
  disproved in lines 2–8 and 10–16 before P-1's premise is settled.**
- `sendFcmAlertsNew`, `invalidTokens`, `diasableFCMAlerts`, `twillioApiToken`, `protextingSecretTok`,
  `customMobileAppLaunchWord` — census says they exist in the bundle; **not in this slice.**
- The `appcmd` vocabulary for `manageMobileApp` / `manageFileAccess`.

---

# 4. The evidence I do NOT have — named, so nobody assumes it was checked

Per the owner's instruction to focus on what is not fully held.

| missing | blocks | how to get it |
|---|---|---|
| **The reference's SERVER** — no capture of any kind | what `restoreMobileAppTokens` does; what a "test notification" contains; how push fan-out decides recipients | observe a live room with a paired device, or ask the operator |
| ~~`/public/dist/app.min.js`~~ — **HELD since 2026-08-16 07:51, in `~/Downloads`. 1 of its 17 lines read — §6.** | still blocks: the `appcmd` vocabulary, `ptrMobileAppCaseByCaseEnabled`, `customMobileAppLaunchWord`, `sendFcmAlertsNew`, `invalidTokens` | **read lines 2–8 and 10–16**, per §6's slicing recipe |
| **The user row menu's `ng-click` attributes** — the only place the `tokcmd` and `appcmd` argument values are written down | the mode vocabularies for `updateUserFCMTok` and `manageMobileApp`; the six push actions are useless without knowing what to send | open the manage site → Users → expand one row → **then** run `ptr-pull-manage-bundle.js`; its `App and Notifications` gap message is exactly this |
| **`source-v4-2026-08-15/main.d1d09071be31f1ba.js`** — only the regions listed in `mobile-app-decoded.md` §0 have been read | everything in §1 | re-decode |
| **`source-v3-2026-08-15/main.99a5781d1d7a7775.js`** — never opened | nothing known; unknown unknowns | read if v3 behaviour is ever in question |
| `docs/decoded/enterprise-and-control-plane.md` (12 KB) | **P-3** — likely defines the enterprise tier | read it first, before designing P-3 |
| `apps/controller/evidence-dumps/stripe-details-2026-08-14.json` (7.5 KB) | **P-1** billing seam | read before choosing the webhook shape |
| `apps/controller/evidence-page.manageSession.html` | the manage page's push controls, side by side | read with the register open |
| **33 of the 42 rendered components** | the bulk of the reference match | step 2, listed in the register |

---

# 5. Queue

1. **Read `enterprise-and-control-plane.md` and `stripe-details-*.json`.** Two small files that may
   answer P-3's model question and P-1's billing seam. Cheapest, highest information.
2. **Re-decode to v4** (§1) and read `app-presentationarea`'s +299.
3. **P-1's send-time gates**, written down before the fan-out is built.
4. **R-15**, the Mobile App tab.
5. **Step 2** of the component audit — 33 remaining, largest last.

**P-3 gates P-1 and P-2.** Both terminate in the enterprise console; settle its model before building
either, or they get built against a boundary that then moves.
