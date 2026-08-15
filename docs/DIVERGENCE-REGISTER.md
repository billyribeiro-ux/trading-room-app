# Divergence register

> "match everything identically end to end based on hard evidence. after we are all done then we
> improve"
>
> — the owner, 2026-08-15, verbatim

This register exists so that instruction can be executed against a **list** rather than from memory.
Every place this repository knowingly differs from the reference is recorded here with the file and
line that states it, the code's own words for why, and a ruling on whether converging is safe. Where
a divergence exists but the code never wrote down a reason, that is recorded too — in its own
section at the end — because a divergence with no recorded reason is the thing the repository
standard exists to prevent.

**Method.** Built by reading 151 extracted blocks in `/tmp/divergences.txt` end to end, opening the
real file at `file:line` wherever the extracted context was not enough to classify. Every row quotes
the code. Nothing is inferred from a search hit alone. Where the code does not state what the
reference does, the row says **"not stated"** rather than guessing.

**Buckets.** Exactly one per divergence.

| bucket | meaning |
| --- | --- |
| SECURITY | converging reintroduces a cross-tenant read, a client-asserted authority, a credential exposure, or an injection. Needs the owner's explicit ruling. |
| DEFECT-INHERITED | we deliberately did not copy a bug in the reference. Converging means shipping a known bug. |
| PRODUCT | a deliberate product choice. Converging is a product decision. |
| UNCAPTURED | we differ because the reference's behaviour was never captured. Converging requires capturing it first. |
| TECHNICAL | an implementation difference with no user-visible effect. |
| FALSE POSITIVE | not a divergence from the reference at all — discarded, counted only. |

<!-- SUMMARY-TABLE -->

---

## 1. SECURITY

**These need the owner's explicit ruling before any of them is converged.** Each one is a place
where matching the reference identically would put a credential, a cross-tenant read, or a
client-asserted authority back into a multi-tenant fintech application.

### S1 · `apps/room/src/lib/server/room-config-client.ts:228` — `linkedRoomSwingAlertsOther` is not on the wire

- **Reference:** stated. "upstream, a non-empty value makes both fetches ask for ANOTHER room's log
  by substituting its `sessionID` (bytes 1,010,146 and 1,993,765)".
- **We do instead:** the setting never arrives at the room; the room takes the room id from the
  session row.
- **Stated reason (quoted):** "This room takes the room from the session row precisely so that a
  client cannot name the room it reads, and carrying a setting whose whole purpose is to redirect a
  read across rooms would reopen that by configuration. If it is ever wanted, it has to arrive as a
  server-resolved room id with the controller confirming the link, not as a string the room
  dereferences."
- **Bucket:** SECURITY
- **convergeable:** no — not in its captured form. The code names the only safe shape: a
  server-resolved room id with the controller confirming the link.
- **riskIfConverged:** a client-supplied string names the room whose swing-alert log is read —
  cross-tenant read by configuration.

### S2 · `apps/room/src/lib/server/room-config-client.ts:256` — `linkedRoomDayTradeAlertsOther` is not on the wire

- **Reference:** stated. "Upstream, a non-empty value makes both fetches ask for ANOTHER room's log
  by substituting its `sessionID`: the key is built by the template literal
  `` `linkedRoom${e}AlertsOther` `` at bytes 1,010,164 and 1,993,783, which is why the full name
  appears NOWHERE in the bundle as a literal."
- **We do instead:** same as S1 — the room comes from the session row, the setting is not carried.
- **Stated reason (quoted):** "the same one taken for its Swing twin … carrying a setting whose
  whole purpose is to redirect a read across rooms would reopen that by configuration."
- **Bucket:** SECURITY
- **convergeable:** no — same condition as S1.
- **riskIfConverged:** cross-tenant read of another room's day-trade alert log.

### S3 · `apps/controller/src/lib/room-config.ts:418` — the allow-list half of S1

- **Reference:** stated. "Upstream, a non-empty value makes the room fetch ANOTHER room's swing log
  by substituting that room's sessionID."
- **We do instead:** `hasSwingTradeAlerts` is allow-listed into `ROOM_VISIBLE_SETTINGS`;
  `linkedRoomSwingAlertsOther` is not.
- **Stated reason (quoted):** "The room takes its room from the session row so that no value the
  browser can reach names the room being read; allow-listing this one would put a cross-room read
  back behind a settings field."
- **Bucket:** SECURITY
- **convergeable:** no — this is the enforcement point for S1. Converging S1 without a
  server-resolved id means converging here first.
- **riskIfConverged:** the cross-room read becomes reachable from the Manage page, i.e. by
  configuration rather than by code change.

### S4 · `apps/controller/src/lib/room-config.ts:437` — the allow-list half of S2

- **Reference:** stated. "Upstream, a non-empty value makes the room fetch ANOTHER room's day trade
  log by substituting that room's sessionID."
- **We do instead:** `hasDayTradeAlerts` is allow-listed; `linkedRoomDayTradeAlertsOther` is not.
- **Stated reason (quoted):** "allow-listing this one would put a cross-room read back behind a
  settings field."
- **Bucket:** SECURITY
- **convergeable:** no — same condition as S3.
- **riskIfConverged:** as S3, for the day-trade log.

### S5 · `apps/room/src/routes/api/day-trade-alerts/+server.ts:27` — the room is not a request parameter

- **Reference:** stated. "The reference sends `{ sessionID, days }` and takes `sessionID` from
  `sessData.linkedRoomDayTradeAlertsOther` when that is set (built by the template literal
  `` `linkedRoom${e}AlertsOther` `` at byte 1,993,783, and again at 1,010,164 on the initial load),
  which lets one room display another's log."
- **We do instead:** "Here the room comes from the SESSION row, never from the request."
- **Stated reason (quoted):** "a client that can name the room it reads is a client that can read
  any room. That setting is deliberately not carried at all."
- **Bucket:** SECURITY
- **convergeable:** no — this is the read path that S1–S4 protect.
- **riskIfConverged:** any authenticated member of any room could read any other room's alert log by
  editing one request field.

### S6 · `apps/room/src/lib/server/room-config-client.ts:74` — `webinarPW` never crosses to the room

**Read this row before treating it as a divergence.** The code states that the reference does not
send it either.

- **Reference:** stated, and it is the same as ours on the wire. "it appears nowhere in the
  reference's bundle either — its `loginToRoom()` posts the typed password to its own server."
- **We do instead:** "Ours asks the controller through `decideRoomEntryRemotely` for the same
  reason."
- **Stated reason (quoted):** "`webinarPW` is deliberately NOT here and never will be … and
  `room-config-boundary.test.ts` forbids every credential-shaped name from crossing at all."
- **Bucket:** SECURITY
- **convergeable:** **nothing to converge.** By the code's own evidence the reference also keeps the
  password server-side; the only difference is *which* server checks it (their own vs. our
  controller), which is topology, not behaviour a user or a capture can see.
- **riskIfConverged:** putting a room password into the room's SSR page data would publish a shared
  credential to every visitor of the login page, including one who never enters it.

### S7 · `apps/room/src/lib/stream-ingest.ts:69` — WHIP ingest is `https`, the reference is `http`

- **Reference:** stated. "Byte 2157950 builds `http://${streamServerMTX}:8889/…/whip`, in
  cleartext."
- **We do instead:** `https://${host}:${MEDIAMTX_WHIP_PORT}/${ingestPath}/whip` (`:88-90`).
- **Stated reason (quoted):** "The credential this URL is used with is a **publish** token: it
  authorises writing video into a named room path, it is valid for thirty days, and anything on the
  network path between the encoder and the media server can read an `Authorization: Bearer` header
  off an unencrypted connection. A presenter streams from hotel Wi-Fi and a conference network as a
  matter of course. … this is a multi-tenant fintech application, and the failure mode is one tenant
  publishing into another tenant's room."
- **Bucket:** SECURITY
- **convergeable:** no.
- **riskIfConverged:** a thirty-day publish credential is readable by anything on the network path;
  the observer can then publish into that presenter's room path until the token is rotated.
- **Note:** the divergence has a deployment cost the code states — "MediaMTX must terminate TLS on
  8889 — `webrtcEncryption: yes` with a certificate, which `ops/mediamtx/mediamtx.yml.example`
  configures."

### S8 · `apps/room/src/lib/stream-ingest.ts:101` — RTMP ingest is `rtmps`, the reference is `rtmp`

- **Reference:** stated. The reference puts the token in the query string under the name `jwt` over
  plain `rtmp`.
- **We do instead:** `rtmps://${host}:${MEDIAMTX_RTMPS_PORT}/${ingestPath}?jwt=${token}` (`:113-115`).
- **Stated reason (quoted):** "Here the credential is IN THE URL rather than in a header, so on
  plain RTMP it crosses the network as part of the connection handshake — and RTMP has no upgrade
  path, no SNI and no certificate: an observer does not need to do anything but watch."
- **Bucket:** SECURITY
- **convergeable:** no.
- **riskIfConverged:** "A thirty-day publish token read off the wire lets a stranger publish into
  that presenter's room path until it is rotated, and the room renders whatever arrives on it."

### S9 · `apps/room/src/lib/stream-ingest.test.ts:85` — the test that pins S7 and S8 in both directions

- **Reference:** n/a — this is the enforcement, not a separate difference.
- **We do instead:** assert both halves: what upstream builds, and that we do not build it.
- **Stated reason (quoted):** "Pinning only 'ours is https' would let somebody conclude the
  reference was https too and that this is a transcription. Pinning only the reference would not
  stop the divergence being quietly reverted to match it."
- **Bucket:** SECURITY (same divergence as S7/S8)
- **convergeable:** no — converging S7/S8 means deleting this test.
- **riskIfConverged:** removes the guard that stops S7/S8 being silently reverted.

### S10 · `apps/room/src/lib/mtx-streams.ts:213` — the wire object is validated; upstream does not validate

- **Reference:** stated. "`case \"mtxStartStream\": this.appEventBus.emit(\"mtxStartStream\",
  i.muser)` (bundle byte 1010826) pushes whatever arrived straight into the list."
- **We do instead:** `isMtxStream` requires `_id`, `sessionID` and `producerID` to match
  `/^[A-Za-z0-9_-]+$/` before the object can reach a playback URL (`:220-227`).
- **Stated reason (quoted):** "two of these fields are INTERPOLATED INTO A URL by
  {@link mtxPlaylistUrl}: a `producerID` of `x?jwt=stolen` would detach the real token from the
  request, and one containing `../` would climb out of the room's path prefix. Refusing the object
  costs one stream tab; accepting it costs the property that a playback URL always addresses the
  room it was built for."
- **Bucket:** SECURITY
- **convergeable:** no.
- **riskIfConverged:** URL injection at the playback path — token detachment via `?`, path traversal
  via `../`, i.e. a playback URL that addresses a room it was not built for.

### S11 · `apps/room/src/lib/mtx-streams.test.ts:190` — the test that pins S10

- **Reference:** stated. "upstream pushes `i.muser` into the list unchecked."
- **We do instead:** "the shape is validated once, here, before it can reach `mtxPlaylistUrl`."
- **Stated reason (quoted):** "Two of these fields are interpolated into a playback URL."
- **Bucket:** SECURITY (same divergence as S10)
- **convergeable:** no.
- **riskIfConverged:** as S10.

### S12 · `apps/room/src/lib/tawk-support.ts:32` — the tawk.to property id is not reproduced

- **Reference:** stated. "`5aecb59f227d3d7edc24f7c2` is the REFERENCE'S OWN tawk.to property."
- **We do instead:** the id comes from `PUBLIC_PTR_TAWK_PROPERTY_ID`; with none configured the
  feature stays off.
- **Stated reason (quoted):** "Copied verbatim, every presenter in every room this product serves
  would open a support chat into protradingroom's inbox, and `setAttributes` would post their name
  and email address there. That is the same class of defect as the 'Powered by' link that credited
  another company, except it carries personal data instead of a hyperlink."
- **Bucket:** SECURITY
- **convergeable:** no — never with the captured id. Yes with our own property id, which is a
  configuration act, not a code change.
- **riskIfConverged:** every presenter's name and email address is posted into a third party's
  support inbox.

### S13 · `apps/room/src/lib/tawk-support.ts:43` — with no property id, the widget is never injected and the control never renders

- **Reference:** stated by implication — the reference always renders the control, because its id is
  hardcoded.
- **We do instead:** "never injected and the control never renders" when unconfigured. "Everything
  else IS the reference's: the `default` path segment, `async`, `charset=\"UTF-8\"`,
  `crossorigin=\"*\"`, insertion before the first existing `<script>`, presenter-only injection, the
  widget hidden until the control is used, and attributes set once on first open."
- **Stated reason (quoted):** "A support widget that cannot be reached is a missing feature; one
  wired to somebody else's account is a data leak, and the two are not a trade-off worth making."
- **Bucket:** SECURITY
- **convergeable:** yes — set `PUBLIC_PTR_TAWK_PROPERTY_ID` to our own property and the control
  renders, matching the reference in every other respect.
- **riskIfConverged:** none, provided the id is ours. Converging by hardcoding theirs is S12.

### S14 · `apps/controller/src/lib/room-config.ts:226` — `tawkPresenterSupport` crosses, the property id does not

- **Reference:** stated. "The reference hardcodes its own (`5aecb59f227d3d7edc24f7c2`)."
- **We do instead:** the boolean is allow-listed; the id is not carried and comes from the room's
  own public env.
- **Stated reason (quoted):** "reproducing that would open every presenter's support chat into
  another company's inbox and post their name and email there."
- **Bucket:** SECURITY
- **convergeable:** no for the captured id; the boolean already matches.
- **riskIfConverged:** as S12.

### S15 · `apps/controller/src/lib/room-config.ts:405` — `mediaMTXClusterID` and `backupMediaMTXClustterID` are not sent to the room

- **Reference:** stated by placement — both sit "alongside it on the Manage page".
- **We do instead:** only the `useMediaMTX` boolean crosses. "the room reaches its MediaMTX host
  through `STREAM_SERVER_MTX` on the server rather than through a cluster id in the browser."
- **Stated reason (quoted):** "They name infrastructure, the room bundle never reads either."
- **Bucket:** SECURITY
- **convergeable:** no — and it would also violate the register's own rule that nothing crosses the
  boundary without a consumer.
- **riskIfConverged:** infrastructure identifiers published into every room page's SSR HTML, for
  nothing that reads them.
- **Note:** the typo `backupMediaMTXClustterID` is upstream's and is recorded as upstream's.

### S16 · `apps/controller/src/lib/components/Recaptcha.svelte:18` — the reference's reCAPTCHA site key is not reused

- **Reference:** stated. "The reference's own key is public in its HTML."
- **We do instead:** `PUBLIC_RECAPTCHA_SITE_KEY`; unset renders "an explicit unconfigured state
  rather than a decorative fake" (`:14-16`).
- **Stated reason (quoted):** "it is theirs, tied to their domains, and revocable by them."
- **Bucket:** SECURITY
- **convergeable:** yes, with our own key — the markup `<div class="g-recaptcha" data-sitekey="…">`
  is already the reference's. Never with theirs.
- **riskIfConverged:** a bot defence that another company can revoke at will, and which is bound to
  domains we do not own.

### S17 · `apps/controller/scripts/extract-manage-schema.mjs:234` — `ssoJWTSecret` is not in `ROOM_VISIBLE_SETTINGS`

- **Reference:** not stated for the wire; the setting itself is transcribed from the reference's
  Manage page ("Use this key in combination with the WordPRess plugin, or other JWT SSO").
- **We do instead:** "it is a credential, it stays in the controller, and the room never sees it."
- **Stated reason (quoted):** "`ssoJWTSecret` is the signing key and is deliberately NOT in
  `ROOM_VISIBLE_SETTINGS`."
- **Bucket:** SECURITY
- **convergeable:** no.
- **riskIfConverged:** the SSO signing key would be serialised into the room's SSR HTML on every
  load — see `sso-token.ts:19-21`, "the room puts its config into SSR HTML on every load". Anybody
  holding it can mint entry for anybody.

### S18 · `apps/room/src/lib/media/signalling.ts:392` — `sender` is not a client-supplied field on `sendSpeechReco`

- **Reference:** **not stated.** The comment cites our own `server.rs`; it does not say what the
  reference's `sendSpeechReco` payload contained.
- **We do instead:** "the server fills attribution in from the verified grant."
- **Stated reason (quoted):** "because a peer that could name itself could caption words as anybody
  in the room."
- **Bucket:** SECURITY
- **convergeable:** needs-capture — we do not know from the evidence whether upstream's payload
  carried a sender.
- **riskIfConverged:** client-asserted attribution: any peer could publish captions under another
  member's name.

### S19 · `apps/room/src/routes/+page.svelte:7743` — the `changeChatMode` broadcast's payload is not trusted

- **Reference:** stated in part — "The broadcast carries the new mode as well."
- **We do instead:** `void invalidateAll()` and re-read `room_state` from the server.
- **Stated reason (quoted):** "it is deliberately NOT read here — trusting it would put room policy
  in the gift of whatever arrives on a socket."
- **Bucket:** SECURITY
- **convergeable:** no.
- **riskIfConverged:** room chat policy (who may post) becomes settable by anything that can put a
  frame on the socket.

### S20 · `apps/controller/src/routes/(public)/session/[code]/+page.server.ts:143` — free-trial admission is computed but not carried

- **Reference:** stated. "The free-trial password admits somebody AND marks their membership as a
  trial — that is what drives the `TRIAL` badge, `isFT`, 'Only select from Trials?' and
  `disablePMForTrials`."
- **We do instead:** the decision is computed and logged; nothing is marked. "a guest has no
  membership row to mark: nothing creates one until the guest-join path exists (OUTSTANDING §1.1)".
- **Stated reason (quoted):** "It is deliberately NOT smuggled through the identity cookie. That
  cookie is client-controlled, so a visitor could promote or demote their own trial status by
  editing it, and a fabricated route for a value nothing reads is worse than an honest gap."
- **Bucket:** SECURITY
- **convergeable:** yes — but only through the server-side guest-join path (OUTSTANDING §1.1), never
  through the identity cookie.
- **riskIfConverged:** converging by the shortcut (the cookie) hands every visitor the ability to
  set their own trial status, which reaches `disablePMForTrials` and the `TRIAL` badge.

### S21 · `apps/room/src/lib/server/swing-alerts-repository.ts:215` — the mirror UPDATE carries a room predicate the reference need not have

- **Reference:** **not stated** for the mirror's scoping. What *is* stated about the reference here
  is the opposite — the sender rewrite **is** reproduced: "the reference puts
  `globals.user.nick || .name` into the payload of the edit command just as it does the create, so
  an edit by a second presenter does move the row's sender. Reproduced deliberately; 'preserving'
  the original author here would be a divergence chosen by me."
- **We do instead:** "The mirror update is room-scoped as well, even though `alertId` came off a row
  this statement just proved belongs to the room."
- **Stated reason (quoted):** "The predicate costs nothing and means no future caller can turn this
  into a cross-room write by passing an id from somewhere else."
- **Bucket:** SECURITY
- **convergeable:** no — and there is nothing to gain: the predicate is invisible.
- **riskIfConverged:** a future caller passing an `alertId` from another room turns the mirror write
  into a cross-room write.

### S22 · `apps/room/src/lib/server/day-trade-alerts-repository.ts:232` — the same predicate on the day-trade mirror

- **Reference:** **not stated** for the mirror's scoping. The sender rewrite is again reproduced
  deliberately: "the same object literal `h`, built once at byte 1,986,780 and used by both branches
  — so an edit by a second presenter does move the row's sender."
- **We do instead:** the mirror update is room-scoped.
- **Stated reason (quoted):** "The predicate costs nothing and means no future caller can turn this
  into a cross-room write by passing an id from somewhere else."
- **Bucket:** SECURITY
- **convergeable:** no.
- **riskIfConverged:** as S21.

### S23 · `apps/room/src/routes/+page.svelte:2125` — the default Benzinga URL is not reproduced

- **Reference:** stated, transcribed verbatim at `:2116-2120`:
  `` benzingaUrl = `https://ptrv3.protradingroom.com/public/bz/index.html?sessID=${globals.sessionID}&id=${sessData.uuid}&tok=${globals.sesionToken}` ``
- **We do instead:** `const benzingaUrl = $derived(data.sessData?.altBenzingaLinkURL?.trim() || null)`
  — only the owner-supplied override. Without it the item does not render.
- **Stated reason (quoted):** "The default is built from three values this room does not have: the
  reference's own `sessionID`, a `sessData.uuid` that is not in the 268-key schema at all, and
  `sesionToken` (the capture's spelling), which is the controller's session credential and has no
  business crossing into a page. So the default is NOT reproduced - a link built from three blanks
  is a broken link wearing a logo."
- **Bucket:** SECURITY
- **convergeable:** no for the default. The override half — "`altBenzingaLinkURL` is reproduced
  exactly" — already matches.
- **riskIfConverged:** the controller's session credential is placed in a query string pointing at a
  third-party host, where it lands in referrers, proxy logs and browser history. Two of the three
  values do not exist here, so the reproduced link would also be broken.

### S24 · `apps/controller/scripts/verify-room-settings-schema.mjs:45-46` — `banIPList` is not sent to the room

**Not one of the 151 scanned blocks.** Found while reading the region around block 150; recorded
here because it is the same class of decision as S1–S5.

- **Reference:** stated. "the reference ships it and checks it in the browser."
- **We do instead:** the setting is not in the wired set at all.
- **Stated reason (quoted):** "`banIPList` is not among them either, and that one IS a deliberate
  narrowing".
- **Bucket:** SECURITY
- **convergeable:** no — not as a browser-side check.
- **riskIfConverged:** an IP ban list published to every visitor's browser, enforced by the client
  that the ban is meant to stop. The list itself is also a disclosure.

### S25 · `apps/room/src/routes/+page.svelte:4597` — captioning additionally requires presenter

- **Reference:** stated for two of the three gates, and only two. "Gated as the capture gates it:
  'Speech recognition not started: disabled by preferences or session settings' / 'Speech
  recognition not started: mic is muted or not enabled' — so it needs the session-level
  `doSpeechReco` on and a live microphone". Whether upstream also required a presenter is **not
  stated**.
- **We do instead:** `if (stopSpeechReco || !isPresenter || !doSpeechReco || !mediaSession) return;`
  — a third gate, `isPresenter`.
- **Stated reason (quoted):** "and here, a presenter, because the server refuses `sendSpeechReco`
  from a member."
- **Also stated, and NOT a divergence:** "`subtitles` is deliberately NOT a gate: that is the
  per-viewer overlay preference, and a presenter who hides captions on their own screen should still
  caption for everybody else."
- **Bucket:** SECURITY
- **convergeable:** needs-capture — and converging the client gate alone would only produce requests
  the server refuses.
- **riskIfConverged:** members captioning the room; see S18 for why attribution is server-side.

---

## 2. DEFECT-INHERITED

Places where the reference has a real defect and we deliberately did not copy it. **Converging any
of these means shipping a known bug.** Each one is already pinned by a test, so converging also
means deleting that test.

### D1 · `apps/room/src/routes/+page.svelte:921` and `apps/room/src/lib/chat-badge-supply-contract.test.ts:124` — a deleted dark badge variant falls back instead of vanishing

- **Reference:** stated. "`badgesH[r.darkTheme]` can itself be undefined if the variant was deleted;
  upstream would then render nothing".
- **We do instead:** `(definitions[String(badge.darkTheme)] ?? badge)` — the light badge is shown.
- **Stated reason (quoted):** "losing a badge because its DARK variant was deleted is a worse
  outcome than showing the light one."
- **Bucket:** DEFECT-INHERITED
- **convergeable:** yes, mechanically — delete the `?? badge` and the pinning assertion.
- **riskIfConverged:** a member's badge silently disappears in dark theme because somebody deleted a
  variant they never see.

### D2 · `apps/controller/src/lib/badge-row-reveal.test.ts:17` and `:20` — the badge name is printed, not `["Gold"]`

- **Reference:** stated. "`:1180` renders the name as `{{[b.name]}}` — an ARRAY interpolation, so
  AngularJS prints `[\"Gold\"]`, brackets and quotes included."
- **We do instead:** "Ours prints the name."
- **Stated reason (quoted):** "That is a deliberate divergence and it is asserted, so nobody
  'restores' it while matching the reference character by character."
- **Bucket:** DEFECT-INHERITED
- **convergeable:** yes, and it would be visible on every badge row.
- **riskIfConverged:** every badge name renders wrapped in brackets and quotes.

### D3 · `apps/controller/src/lib/export-format-contract.test.ts:164` and `apps/controller/src/routes/(app)/account/rooms/[id]/[[tab]]/+page.svelte:752` — every comma in a CSV name is replaced, not just the first

- **Reference:** stated. "The reference writes `o.userName.trim().replace(\",\",\" \")` — and a
  string first argument to `replace` substitutes only the FIRST occurrence, so a member called
  `Ribeiro, Billy, Jr` still lands two commas in an unquoted row and silently shifts every column
  after it."
- **We do instead:** `replaceAll(',', ' ')`.
- **Stated reason (quoted):** "Replacing all of them is the same intent, minus the corruption."
- **Bucket:** DEFECT-INHERITED
- **convergeable:** yes — one character.
- **riskIfConverged:** corrupted CSV exports: every column after a multi-comma name shifts, silently.

### D4 · `apps/controller/src/lib/mobile-filter-contract.test.ts:87` and `.../[[tab]]/+page.server.ts:266` — "Show Non-Mobile" uses one predicate at every room size

- **Reference:** stated. "`loadNonMobileUsers` has a branch for rooms over 10,000 members that
  slices to the first 10,000 and then keeps users who **have** tokens — the inverse of its own name,
  so a large room's 'Show Non-Mobile' returns mobile users."
- **We do instead:** "Ours applies one predicate at every size."
- **Stated reason (quoted):** "Reproducing that would mean 'Show Non-Mobile' returns mobile users in
  large rooms only — a wrong answer that hides itself until a room is big enough that nobody can
  check it by eye."
- **Bucket:** DEFECT-INHERITED
- **convergeable:** yes.
- **riskIfConverged:** the filter returns the exact opposite of what it says, in the rooms where it
  is hardest to notice.

### D5 · `apps/controller/src/lib/reference-defects-not-reproduced.test.ts:6` — the index of reference defects, and two more it names

- **Reference:** stated, with citations, for two further defects that appear nowhere else in this
  register:
  1. **`page.manageSession.html:854` — the Logout Webhook row edits the LOGIN webhook.**
     `onaftersave="saveSessField('logout_webhook_url')" editable-textarea="sess.login_webhook_url"`.
     "opening the Logout Webhook editor shows the LOGIN webhook's current value, and saving writes
     it to the logout field. An owner who opens the row to check it, and saves without editing, has
     just copied their login webhook over their logout webhook."
  2. **`page.stats.html:31-36` — the stats period select has four options that all submit
     `value="hourly"`**, and "no ng-model anywhere on it, so nothing reads the choice regardless."
     Recorded as T5-19; "we do not render that page at all yet".
- **We do instead:** every settings row binds its own name —
  `<Editable {def} value={settingValue(def.name)} />` — so "There is no second identifier to get
  wrong"; both webhook settings exist as separate keys.
- **Stated reason (quoted):** "a faithful transcription of one ships it. The dangerous case is the
  defect that LOOKS like a deliberate choice, because the next person reading our code beside the
  template sees a mismatch and 'fixes' it back."
- **Bucket:** DEFECT-INHERITED
- **convergeable:** no — converging defect 1 means writing an owner's login webhook over their
  logout webhook. Defect 2 is not yet reachable: the stats page is not built, and the test records
  what the original did so the choice is explicit when it is.
- **riskIfConverged:** data loss on a customer's own webhook configuration.

### D6 · `apps/room/src/lib/components/ModalHost.svelte:482` — all three copyable streaming strings derive from one answer

- **Reference:** stated. "its `getNewToken()` rebuilds `streamingLinkRTMP` only (byte 2169850),
  leaving `streamKey` and `streamingLink` holding the token that was just revoked."
- **We do instead:** `streamKey`, `streamingLink` and the RTMP link are all `$derived` from the one
  `ingest` object.
- **Stated reason (quoted):** "A presenter who pressed 'New Link' while on the WHIP tab would copy a
  dead Bearer and the publish would be refused with nothing on screen to explain why. Deriving all
  three from one source makes that state unrepresentable."
- **Bucket:** DEFECT-INHERITED
- **convergeable:** yes, mechanically.
- **riskIfConverged:** a presenter copies a revoked credential and the publish fails with no
  explanation on screen.

### D7 · `apps/room/src/lib/media/session.ts:247` and `apps/room/src/lib/media/session.test.ts:207` — no codec is pinned by default

- **Reference:** stated, quoted from byte 1073216:
  `this.forceH264 = this.globals.sessData.h264Enabled || !0, this.forceVP9 = !1`.
- **We do instead:** `findCodec` returns `undefined` by default, so "mediasoup-client takes
  `codecs[0]` (`lib/ortc.js:449-455`)".
- **Stated reason (quoted):** "`|| !0` is `|| true`, so `forceH264` is unconditionally true no
  matter what `h264Enabled` holds. That is a typo … It contradicts the other half of the capture …
  Our router leads with VP9 deliberately (`codecs.rs:74`) *because* the client picks the first video
  codec. Pinning H264 would discard that on the only two paths that matter."
- **Bucket:** DEFECT-INHERITED
- **convergeable:** no — the reference's own setting (`h264Enabled`) is defeated by the typo, so
  "converging" means reproducing a value the reference's own configuration cannot change.
- **riskIfConverged:** H264 pinned on every produce, discarding the router's deliberate VP9-first
  codec order on the only two media paths in the product.

### D8 · `apps/controller/src/routes/(app)/account/+page.svelte:355` — a NULL badge field exports as empty, not as the word `null`

- **Reference:** stated. "The reference guards on `!== undefined`, so a key that is present and NULL
  concatenates as the literal text `null` into the cell."
- **We do instead:** empty. "Empty is what the reference produces for a key it does not carry at
  all, so empty is what a null gets."
- **Stated reason (quoted):** "Our `emoji` and `imgURL` are nullable columns, so faithfully
  reproducing that would write the word 'null' into a spreadsheet."
- **Bucket:** DEFECT-INHERITED
- **convergeable:** yes.
- **riskIfConverged:** the string `null` appears in exported badge spreadsheets.

### D9 · `apps/controller/src/account.css:1219` and `apps/controller/src/lib/badge-editor-contract.test.ts:52` — `#badgeRolesTxt` is bounded; the reference overflows

- **Reference:** stated, and confirmed by the owner in the live original. "node #91 of
  `NEXT-STEP/run2/welcome-run2.json` computes `width: auto` and `max-width: none`, so the box comes
  entirely from the `cols=\"70\"` the markup carries — about 70 characters wide, inside a
  `.col-md-6` badge editor that is roughly half of a 1170px container. Wider than its parent, with
  nothing to stop it."
- **We do instead:** a `max-width` bound. "`max-width` rather than `width` … Bounding it changes
  nothing until the box would leave its parent — the only case that is broken."
- **Stated reason (quoted):** "The reference overflows here, and the owner confirmed it does so in
  the live original."
- **Honest gap, stated in the code:** "every rect in that file is `0×0`, because the badge editor is
  `ng-show`-collapsed at capture time and a hidden element has no box. So the numbers are an honest
  gap, and the owner's observation of the live app is the evidence that it renders wrong."
- **Bucket:** DEFECT-INHERITED
- **convergeable:** yes — delete the `max-width` — but it is the one row here where "match
  identically" and "do not ship a known layout bug" point in opposite directions **and the owner has
  already seen the bug**. Owner's call.
- **riskIfConverged:** the roles textarea renders wider than its column on the badge editor.

### D10 · `apps/controller/src/account.css:1283` — `:focus-visible` rather than `:focus` on `.acc-btn`

- **Reference:** stated, and the declarations are byte-identical to it:
  `evidence-dumps/NEXT-STEP/gaps/sheet-2.css:782` groups `.btn:focus` and friends with
  `outline: -webkit-focus-ring-color auto 5px; outline-offset: -2px`, and sheet-9.css:324 overrides
  only `box-shadow`, never `outline`.
- **We do instead:** the same two declarations, under `:focus-visible` / `:active:focus-visible`.
  "Only the selector changes."
- **Stated reason (quoted):** "A button keeps focus after a mouse click, so the ring stays on until
  something else is clicked — the owner reported it as a colour that 'does not exist on the real
  app', and what does not exist there is the LINGER, not the ring."
- **Bucket:** DEFECT-INHERITED
- **convergeable:** yes — one selector — but it restores the behaviour the owner already reported as
  wrong. Owner's call.
- **riskIfConverged:** a focus ring that sticks on a button after a mouse click until something else
  is clicked.

### D11 · `apps/room/src/lib/components/ScreenTabs.svelte:134` — two accessibility defects on the screen tab bar

Two divergences in one block, against a stated rule: "a captured value is reproduced unless
reproducing it locks a real person out."

- **Reference (a), `aria-selected`:** stated. "The reference emits `aria-selected=\"true\"` on all
  three tabs, including the two without `.active`, which tells a screen reader that three tabs are
  selected at once." **Ours:** `aria-selected={screen.id === selectedScreenId}`.
- **Reference (b), `tabindex`:** stated. "The reference carries none, and its anchors have no `href`
  either, so upstream these tabs cannot be reached by keyboard at all." **Ours:** a roving tabindex,
  `0` on the active tab and `-1` elsewhere, plus an `onkeydown` for Enter/Space.
- **Stated reason (quoted):** "Keeping the roving tabindex is what makes the screen switcher
  operable without a mouse." And, honestly recorded: "The earlier note here justified `-1` from 'a
  live member dump'; the populated capture disagrees, so the VALUE is no longer evidence-backed and
  is kept as an accessibility decision instead of a transcription."
- **Also stated, and already matched:** `data-bs-target` is gone on both sides; "Everything else
  captured here is still reproduced verbatim, including the duplicate `id=\"dropdownMenuScreen\"`
  across every gear."
- **Bucket:** DEFECT-INHERITED
- **convergeable:** yes, mechanically, for both.
- **riskIfConverged:** a screen reader is told three tabs are selected at once, and the screen
  switcher becomes unreachable by keyboard.

### D12 · `apps/controller/src/routes/(app)/account/rooms/[id]/[[tab]]/+page.svelte:1623-1626` — money is formatted per currency, not divided by 100 unconditionally

**Not one of the 151 scanned blocks.** Found while reading the region around block 132.

- **Reference:** stated. "the reference's own formatter divides unconditionally and renders JPY,
  KRW, VND and thirteen more a hundredfold low."
- **We do instead:** "Every amount goes through `formatMoney`, never a bare `/100`."
- **Stated reason (quoted):** "`money.test.ts` keeps that implementation as a negative control so
  nobody restores it."
- **Bucket:** DEFECT-INHERITED
- **convergeable:** yes, mechanically.
- **riskIfConverged:** every zero-decimal currency (JPY, KRW, VND and thirteen more) is displayed at
  one hundredth of its real value on a billing screen.

---

## 3. PRODUCT

Deliberate product choices. Converging each of these is a product decision, not an engineering one.

### P1 · `apps/controller/src/lib/toast.svelte.ts:4` — successful saves show a confirmation; the reference shows nothing

- **Reference:** stated, and measured. "Its manage page loads angular-toaster — `toaster.min.css` in
  `<head>` and `toaster.min.js` at the foot of the body, with the 1.1.0 copy commented out — but
  there is no `<toaster-container>` element anywhere in the captured DOM, and angular-toaster renders
  exclusively into that directive. Library present, nowhere to draw. `bootbox` appears zero times on
  that page too."
- **We do instead:** a 3200 ms toast on success; failures already render `form.message` in red.
- **Stated reason (quoted):** "a success that shows nothing is indistinguishable from a control that
  did nothing, which is exactly the report that started this — 'none of the controls work' on a page
  whose controls all worked and simply never spoke."
- **Bucket:** PRODUCT
- **convergeable:** yes — delete the toast host.
- **riskIfConverged:** returns the product to the exact failure report that prompted the toast.

### P2 · `apps/controller/src/lib/components/PasswordReveal.svelte:13` — the password lock decoration is a working show/hide control

- **Reference:** stated. "The reference decorates every password field with a static lock:
  `<span class=\"acc-feedback\"><i class=\"fa fa-lock\"></i></span>`, absolutely positioned in the
  input's right-hand 34px, `pointer-events: none`."
- **We do instead:** "a control in the same box — same position, same size, same muted colour — so
  the layout is unchanged and the space stops being purely ornamental."
- **Stated reason (quoted):** "A deliberate divergence from the reference, asked for directly: a
  person typing a password they cannot see, into a field with a 12-character minimum, has no way to
  tell a typo from a rejected password."
- **Bucket:** PRODUCT
- **convergeable:** yes — the geometry is already identical, so converging is swapping the button
  back for the static icon.
- **riskIfConverged:** none technical. It was asked for directly by the owner, so converging needs
  the owner to withdraw that request.

### P3 · `apps/controller/src/routes/(app)/account/+page.svelte:675` — "New Room" is always visible

- **Reference:** stated. "The reference hides this behind `ng-show=\"showNewRoom>=5\"` (#46) — five
  clicks on the word 'Sessions' — and nothing else on its page reveals it."
- **We do instead:** always visible, plus a required name input, "because `createRoom` reads
  `form.get('name')` and fails on a blank". The reference's form is `div.col-md-2` holding exactly
  one child, `a.btn.btn-warning.mb.btn-block` calling `createNew()`, with NO text field.
- **Stated reason (quoted):** "Deliberate divergence, decided by the owner. … An account that
  reaches zero rooms otherwise has no Manage button, no Launch, no room to open, and no visible way
  back — which is exactly the dead end that was hit."
- **Also stated, and already matching:** "`showNewRoom` still exists and is still incremented by the
  Sessions label: it independently drives the per-row id/ownerID reveal (`ng-show`, #461)."
- **Bucket:** PRODUCT
- **convergeable:** no — decided by the owner, and it is the recovery route out of a zero-room
  account. The *shape* of the form has a second, separate gap: "What `createNew()` supplies for a
  name was never captured."
- **riskIfConverged:** an account with zero rooms has no visible way to create one.

### P4 · `apps/controller/src/routes/(app)/account/+page.svelte:413` and `.../rooms/[id]/[[tab]]/+page.svelte:1041` — failures render inline, not in a bootbox modal

- **Reference:** stated. "it reports its failures through bootbox alerts."
- **We do instead:** `<p class="acc-error" role="alert">` / `<p class="mg-error" role="alert">`.
- **Stated reason (quoted):** "Not a divergence from the reference: it reports failures through
  bootbox alerts, which is the same information in a different container. Silence is not what it
  does." And: "a failure nobody can see is worse than a crash, because a crash at least says so."
- **Bucket:** PRODUCT
- **convergeable:** yes — the information is identical; only the container differs. Note that the
  code calls this "not a divergence"; it is recorded here because the container is visibly different
  (modal vs inline) and "match identically" is now the standing instruction.
- **riskIfConverged:** none, provided the replacement is the project's dialog primitive —
  `window.alert` is forbidden by the repository standard.

### P5 · `apps/room/src/routes/+page.svelte:2985` — there is no in-place filter over the live chat log

- **Reference:** stated. "The reference's roomlog component has its own `searchTerm` that filters
  the live log in place, and refuses to page while one is set — a filtered log is not a paged one."
- **We do instead:** `searchTerm: ''` is passed at the only call site; "its chat search is the
  `chat-logs` archive modal, a separate view over its own query."
- **Stated reason (quoted):** "This room has no such filter … The rule is kept whole in
  `shouldLoadOlderMessages` because it is the reference's, and this call site passes the only honest
  value it has."
- **Bucket:** PRODUCT
- **convergeable:** yes — the paging rule is already the reference's and already whole; converging
  means building the in-place filter and feeding it here.
- **riskIfConverged:** none.

### P6 · `apps/room/src/routes/+page.svelte:7412` — a mobile drag of the inner chat/alerts gutter is persisted

- **Reference:** stated. "`W4e` drops its `dragEnd`" — upstream the inner gutter does not persist on
  mobile, just as the outer one does not (`app-room.render-helpers.js:1786-1791` binds `dragStart`
  and no `dragEnd`).
- **We do instead:** the main split is not persisted on mobile (matching upstream), but the inner
  gutter still writes.
- **Stated reason (quoted):** "our inner gutter writes the SAME `chatAlertsSizes` key the desktop
  layout reads, and dropping the write would mean a phone silently reverting a size the user had set
  on a laptop. That is a divergence, and it is here rather than silent."
- **Bucket:** PRODUCT
- **convergeable:** yes.
- **riskIfConverged:** a phone silently reverts a chat/alerts size the same user set on a laptop,
  because both read one storage key.

---

## 4. UNCAPTURED

We differ because the reference's behaviour was never captured, or because the supply the reference
reads does not exist here yet. **Converging requires capturing it first** — none of these can be
converged from what is currently in `evidence-dumps/`.

### U1 · `apps/controller/src/lib/server/sso-token.ts:32` — entitlements ride inside the signed token

- **Reference:** partly captured, and the gap is explicit. "The reference's captured handoff token is
  `{ name, email, id, type, issued, iat, exp }` — transcribed byte-for-byte from `ptr1.json` — and
  carries **no membership, product or permission field**. So the dump cannot say how
  `allowedMemberships` / `allowedProducts` / `allowedPerms` were evaluated: either their plugin
  checked them before minting, or their server called back to WordPress."
- **We do instead:** "the entitlements ride inside the signed token, and the signature is the proof."
- **Stated reason (quoted):** "Rather than invent a mechanism and present it as recovered, we chose
  the one that needs no callback, no shared network path and no WooCommerce credential on our side."
- **Stated cost (quoted):** "**entitlement is only as fresh as the token.** A cancelled subscription
  blocks the next entry, not the session already running."
- **Bucket:** UNCAPTURED
- **convergeable:** needs-capture — a live WordPress plugin trace would settle which of the two
  mechanisms upstream used.
- **riskIfConverged:** the callback variant needs a WooCommerce credential on our side and a shared
  network path; both are new attack surface for a freshness gain bounded by
  `SSO_MAX_TOKEN_AGE_SECONDS`.

### U2 · `apps/room/src/routes/+page.svelte:1447` — `viewerOnlyModeLimited` is not modelled

- **Reference:** stated only in part. "`?vo=2` additionally sets `viewerOnlyModeLimited` upstream" —
  what it then gates is **not stated**.
- **We do instead:** `?vo=1` and `?vo=2` both set `viewerOnlyMode`; the second flag does not exist
  here.
- **Stated reason (quoted):** "nothing in this room reads that yet, so it is deliberately not
  modelled here rather than added as state with no consumer."
- **Bucket:** UNCAPTURED
- **convergeable:** needs-capture — its consumers upstream have not been traced.
- **riskIfConverged:** none; but adding the flag before its consumers are known would be state with
  no consumer, which this repository forbids.
- **Provenance flag, quoted from the code:** "PROVENANCE, stated because it is the one fact in this
  change that was not re-read this session: the `vo` -> `viewerOnlyMode` mapping comes from
  `HANDOFF.md`, which quotes it from the minified bundle at ~2595500."

### U3 · `apps/room/src/routes/+page.svelte:1489` and `apps/controller/src/lib/room-config.ts:333` — two of the five `hideChatAlerts` writers are not modelled

- **Reference:** stated, all five, with line numbers (`app-room.full.js:1893-1902`, `:2179-2181`).
  Three are modelled.
- **We do instead:** omit the `isPlayer` writer and the `videoOnlyMode && (hideChatAlerts =
  !recordChat && videoOnlyMode)` writer; `recordChat` is not on the wire.
- **Stated reason (quoted):** "`isPlayer` has ZERO occurrences in this room. Upstream it is a client
  global for a stream PLAYBACK mode … This room has no such mode, so there is nothing to read." And:
  "`videoOnlyMode` is the `r` query parameter, the recording-bot mode — the same gap
  `files-gates.ts` already records for `hideFiles`. `recordChat` is deliberately not on the wire
  either, because it appears ONLY inside that writer and would arrive with no reader."
- **Bucket:** UNCAPTURED
- **convergeable:** needs-capture — both the playback mode and the recording-bot mode have to be
  captured before either writer can be modelled honestly.
- **riskIfConverged:** sending `recordChat` today puts a setting on the wire that nothing reads.

### U4 · `apps/controller/src/routes/(app)/account/rooms/[id]/[[tab]]/+page.svelte:1611` — the Stripe "Details" link is absent

- **Reference:** stated in full, down to the markup. "The reference ends the block with an anchor
  carrying an empty href, the classes `label label-info`, a `fa-info-circle` icon, the text
  'Details', and an ng-click of `openStripeDetails(user)`."
- **We do instead:** the anchor is not rendered.
- **Stated reason (quoted):** "nothing in the evidence says what that opens. `openStripeDetails` is
  not in the template, not in any capture, and not among the handlers transcribed out of
  `app.min.js` … Rendering the anchor with an invented modal behind it, or with no behaviour at all,
  would be a control whose only effect is its own presence."
- **Bucket:** UNCAPTURED
- **convergeable:** needs-capture. "Recorded in `TODO.md` under Evidence gaps instead, with the
  console script that would fetch it."
- **riskIfConverged:** a visible control that does nothing — the exact defect class this repository
  refuses.

### U5 · `apps/controller/src/lib/server/db/migrations/0011-recorded-max-capacity.js:52` — `recorded_max_capacity` has a reader and no writer

- **Reference:** the column exists because the reference shows the number; how it is produced is not
  available to us.
- **We do instead:** `INTEGER NOT NULL DEFAULT 0`, written by nothing. "Zero is the honest value for
  every existing room."
- **Stated reason (quoted):** "A high-water mark needs live occupancy, and the controller receives
  no occupancy signal — the room service is the only thing that knows who is currently connected. …
  Deliberately NOT faked by substituting the roster size: the number of people who have ever
  registered is not the number who were ever simultaneously present, and rendering one as the other
  would be an invented value that looks right."
- **Bucket:** UNCAPTURED
- **convergeable:** needs-capture — tracked as T5-20 in
  `docs/reference/evidence-gap-register.md`. The missing piece is an occupancy signal from the room,
  not a missing dump.
- **riskIfConverged:** faking it with the roster size renders a plausible wrong number on an owner's
  panel.

### U6 · `apps/room/src/lib/alerts-toolbar-contract.test.ts:120` — the Alert Filter button is not in the toolbar slot

- **Reference:** stated. "The capture declares two buttons for this slot, const 38/44
  (#alert-filter-modal, gated on `sessData.modAlertFilterList`) and const 39
  (#alerts-advanced-search-modal)." Only the second one ever rendered in a capture.
- **We do instead:** only the Advanced Search link is in the slot.
- **Stated reason (quoted):** "it never rendered in either captured state of this toolbar, and
  putting both buttons in the slot wrapped them onto a second row - a layout the capture never
  produces. Its modal keeps a separate entry point (const 8/21, the `badge.filtered-text` in the
  alerts header), which is recorded as open work."
- **Bucket:** UNCAPTURED
- **convergeable:** needs-capture — a capture with `sessData.modAlertFilterList` on would show
  whether upstream really does wrap to a second row.
- **riskIfConverged:** a two-row toolbar the capture never produces.

---

## 5. TECHNICAL

Implementation differences with no user-visible effect, or none reachable in the configuration this
product ships. Each is still a real difference from the reference and is listed so "match
identically" can be executed against it.

### T1 · `apps/room/src/lib/file-sort.ts:146` and `:148` — the reference's nullish-list guard is not transcribed

- **Reference:** an `e &&` guard against a nullish list.
- **We do instead:** no guard; `readonly T[]` in the type.
- **Stated reason (quoted):** "the caller is `data.files`, which comes from a drizzle `.all()` and
  is always an array, and the parameter type says so. That is a documented divergence rather than a
  silent one." Also: "Returns `readonly T[]` because the passthrough arm returns the caller's own
  array by reference — the type stops a caller from sorting that in place and re-introducing
  property 1."
- **Bucket:** TECHNICAL · **convergeable:** yes · **riskIfConverged:** none; it would be dead code.

### T2 · `apps/room/src/lib/mtx-reconcile.ts:22` and `apps/room/src/lib/server/mtx-reconciler.ts:13`, `:19` — the stream list is polled, and reconciled as deltas

- **Reference:** stated. "The reference does not poll. It asks for the full list on init and again
  after a soft reset (`fetchSessionMediaStateMTX`, bundle bytes 1137614 and 1138594) and otherwise
  trusts its SocketCluster socket".
- **We do instead:** poll MediaMTX's `/v3/paths/list` on an interval and emit **deltas**.
- **Stated reason (quoted):** "Polling is taken here because our delivery path is weaker, and it is
  recorded as a divergence rather than presented as a clone." And for the deltas: "`applySessionMediaState`
  sets `selectedTabID` to `list[0]._id` every time it runs, unconditionally. … On a timer that would
  drag every viewer's tab back to the first stream on every tick."
- **Bucket:** TECHNICAL · **convergeable:** no, not without a real pub/sub transport — and sending
  the full list on a timer would reintroduce the tab yank. `mtx-reconcile.test.ts` asserts both
  halves. · **riskIfConverged:** every viewer's stream tab is dragged back to the first stream on
  every tick.

### T3 · `apps/room/src/lib/server/room-events.ts:30` — the realtime hub is process-local

- **Reference:** SocketCluster, a real pub/sub connection.
- **We do instead:** an in-process SSE hub. "State here lives in one node process, so it does not
  survive a restart and does not span instances."
- **Stated reason (quoted):** "It is deliberately NOT the durable answer. The durable path already
  exists and is unused: `services/api` listens on PostgreSQL `room_events`
  (`services/api/src/jobs.rs`), which is exactly this fan-out done properly across instances. Moving
  to it is `TODO.md` entry 5."
- **Bucket:** TECHNICAL · **convergeable:** yes, and it is already planned — "this hub is shaped to
  be replaced by it - one publish call, one subscribe call, no other code aware of the transport." ·
  **riskIfConverged:** none. **Risk of NOT converging** is real and inherited: on a multi-instance
  deployment a realtime event reaches only the instance the platform routed it to (see also
  `internal/media-hook/+server.ts:15-30`).

### T4 · `apps/room/src/lib/ngb-tooltip.ts:38` and `:52` — Popper's collision handling is not reproduced

- **Reference:** stated. "The reference passes a fallback list and flips the bubble when it would
  overflow".
- **We do instead:** "we position once from the measured rects. So `auto` resolves to the head of
  the reference's own expansion order rather than to whatever fits, and a fixed placement stays
  where it was asked for."
- **Stated reason (quoted):** "Every host we render today is a fixed placement."
- **Bucket:** TECHNICAL · **convergeable:** yes · **riskIfConverged:** none.
- **Note:** the rest of this comment is *not* a divergence — "Every placement now resolves, and none
  of it is guessed. … it is the reference's own arithmetic, ported from `main.d6d3c112b59b7d0d.js`".
  The heading above it ("What is deliberately NOT handled, because it was not captured") no longer
  describes what follows it.

### T5 · `apps/room/src/lib/components/ScreenPane.svelte:325` — `z('controls', o.showControls)` is not reproduced

- **Reference:** stated, and proven unreachable. "`showControls` starts `!1` and its only writer is a
  click handler ON THIS ELEMENT (`…compiled.js:302-305`), which the same component's own
  `.webcamScreen { pointer-events: none }` (`:357`) makes unreachable."
- **We do instead:** no `controls` binding.
- **Stated reason (quoted):** "The attribute is therefore false for the life of the component
  upstream, and no control bar ever appears." — so the rendered result is identical.
- **Bucket:** TECHNICAL · **convergeable:** yes · **riskIfConverged:** none.

### T6 · `apps/room/src/lib/components/StreamingView.svelte:463` — three dead CSS rules are not ported

- **Reference:** carries `#message`, `#lang-icon` and `#lang-list` rules.
- **We do instead:** omit all three.
- **Stated reason (quoted):** "They are dead upstream — the template has 27 declarations and none of
  them is any of those elements, so the rules style nothing. Copying them across would import three
  selectors with no markup, which is the mirror image of the `.flipped`-class-with-no-CSS defect
  this repository already refuses."
- **Bucket:** TECHNICAL · **convergeable:** yes · **riskIfConverged:** none — three selectors that
  match nothing.

### T7 · `apps/room/src/lib/media/session.ts:85` — a redundant `dtx` remap is not reproduced

- **Reference:** stated. "The capture maps `dtx: true` over it again at the point of use
  (`QS.map(w=>({...w,dtx:!0}))`, byte 1104100) even though both entries already carry it".
- **We do instead:** the values only.
- **Stated reason (quoted):** "that is a no-op, so it is not reproduced here. The values are."
- **Bucket:** TECHNICAL · **convergeable:** yes · **riskIfConverged:** none.

### T8 · `apps/room/src/lib/media/session.ts:595` — the webcam is simulcast; the capture never simulcasts it

- **Reference:** stated. "the capture never actually simulcasts the webcam: `let c,h` at byte
  1088100 declares `encodings` and never assigns it."
- **We do instead:** "the webcam gets the same {@link selectVideoEncodings} treatment as the screen".
- **Stated reason (quoted):** "which is the intent the dead `useSharingSimulcast` branch expresses -
  stated as a divergence rather than left implicit."
- **Bucket:** TECHNICAL · **convergeable:** yes · **riskIfConverged:** the webcam loses simulcast
  layers, so every consumer is forwarded one encoding. Note that the *screen* path was converged
  back to the reference at `:628` after measurement, which is recorded there.

### T9 · `apps/room/src/routes/+page.svelte:1059` — the roster is not paused when the tab is hidden

- **Reference:** stated. "`unloadRoster()` / `loadRoster()` gate a five-second POLL."
- **We do instead:** nothing is gated; the roster is SSE-pushed.
- **Stated reason (quoted):** "gating it the same way would make a hidden tab hold a stale roster for
  anyone who has not opted in — strictly worse than doing nothing. Recorded in item AA before this
  was built and still true."
- **Bucket:** TECHNICAL · **convergeable:** no — there is no poll to pause. · **riskIfConverged:** a
  hidden tab holds a stale roster.

### T10 · `apps/room/src/routes/+page.svelte:1943` — the copy restriction is an `$effect`, not a one-shot

- **Reference:** stated. "upstream this runs once in `ngAfterViewInit` and never again, because
  `isPresenter` cannot change in that component's lifetime."
- **We do instead:** an effect, with teardown.
- **Stated reason (quoted):** "Here it can — `giveMicScreen` elevates a member to presenter
  mid-session — and a class added at mount would then keep restricting somebody the room has just
  promoted."
- **Bucket:** TECHNICAL · **convergeable:** no — it would leave a newly promoted presenter
  restricted. · **riskIfConverged:** a promoted member keeps the copy/right-click restriction for the
  rest of the session.

### T11 · `apps/room/src/routes/+page.svelte:2891` — badges are joined at render time, so they appear on old messages too

- **Reference:** stated. "A member given a badge mid-session sees it on their NEXT message upstream
  and on ALL of them here".
- **We do instead:** join on `senderEmailHash` at render time.
- **Stated reason (quoted):** "a divergence in our favour, and the alternative would be
  denormalising controller state into room rows that then go stale."
- **Bucket:** TECHNICAL · **convergeable:** no, not without denormalising controller state into room
  rows. · **riskIfConverged:** stale badge data in room rows.

### T12 · `apps/room/src/routes/+page.svelte:5318` — `currentTime = 0` is not reproduced

- **Reference:** assigns it.
- **We do instead:** do not.
- **Stated reason (quoted):** "an element backed by a live `MediaStream` is not seekable, so the
  assignment does nothing upstream and can throw here."
- **Bucket:** TECHNICAL · **convergeable:** yes · **riskIfConverged:** an exception where the
  reference has a no-op.

### T13 · `apps/room/src/routes/+page.svelte:5879` — the SFU half of the webcam toggle is not reproduced

- **Reference:** `stopCam()` closes the producer as well as stopping the tracks.
- **We do instead:** stop the tracks only.
- **Stated reason (quoted):** "The SFU half - `closeProducer` - is not reproduced; this room has no
  camera producer yet."
- **Bucket:** TECHNICAL · **convergeable:** yes, once the room has a camera producer. ·
  **riskIfConverged:** nothing to converge until the producer exists.

### T14 · `apps/room/src/routes/+page.svelte:6120` — `contentHint = "detail"` is set on the raw screen track

- **Reference:** stated. "The capture sets `contentHint = \"detail\"` on its alert-overlay canvas
  stream and never on the raw screen track."
- **We do instead:** set it on the screen track.
- **Stated reason (quoted):** "Chosen anyway because the measurement says the headroom is real and
  unused, and because it is one property on one track: reverting is deleting this line." And the
  cost, stated honestly: "degrades frame rate rather than resolution — a share may end up sharper
  and choppier. The doc previously called this free; that was an assumption and it was wrong."
- **Bucket:** TECHNICAL · **convergeable:** yes — one line. · **riskIfConverged:** screen shares
  become less sharp under motion; the settling measurement needs "a presenter sharing a REAL desktop
  with a member attached, which is `scripts/collect-share-stats.js`."

### T15 · `apps/controller/src/lib/dom-shape.ts:196` — the user menu posts a form; the reference fires an anchor

- **Reference:** stated. "The reference fires each menu item from `<a href=\"\" ng-click=\"updateUser(…)\">`
  — an anchor that goes nowhere, driven entirely by JavaScript."
- **We do instead:** `<form><input type="hidden"><input type="hidden"><button>`.
- **Stated reason (quoted):** "That is a deliberate divergence and the one place this project does
  not copy the reference: the menu keeps working with JavaScript off, and every mutation goes
  through a server action instead of an XHR. It is invisible. `manage.css` styles
  `.dropdown-menu > li > a`, `.dropdown-menu > li > button` and `.dropdown-menu > li > form > button`
  with one rule, and the form wrapper is `display: contents`. Same box, same paint."
- **Bucket:** TECHNICAL · **convergeable:** no — it would abandon progressive enhancement, which the
  repository standard mandates. · **riskIfConverged:** the user menu stops working without
  JavaScript, and mutations move off server actions.

### T16 · `apps/controller/src/routes/(app)/account/rooms/[id]/[[tab]]/+page.svelte:2395` — `href=""` where the reference has `href="#"`

- **Reference:** `"#"`.
- **We do instead:** `""`.
- **Stated reason (quoted):** "`\"\"` is the value the capture's other editable anchors already carry
  (file2:889, 991), it resolves to the current URL, and neither is ever followed: the click is
  always prevented."
- **Bucket:** TECHNICAL · **convergeable:** yes · **riskIfConverged:** none.
- **Note, quoted:** the comment records its own earlier error — "WHAT THIS COMMENT USED TO SAY, AND
  WHY IT WAS WRONG. It claimed `#` 'cannot ship' because Svelte flags `a11y_invalid_attribute` …
  Both halves were misleading".
