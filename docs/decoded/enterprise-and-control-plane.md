# The enterprise layer: what the evidence actually says

Written 2026-08-15 from three sources read on the same day, all first-party PTR material:

| source | what it is | size |
| --- | --- | --- |
| `~/Desktop/new-room/enterprise/ptr1.json` | full DOM of `#/page/manageSession/…` — the MANAGE page — plus **18 dropdowns and modals captured OPEN** | 23.5 MB |
| `~/Desktop/new-room/enterprise/prt2.json` | full DOM of `#/page/welcome` — the ACCOUNT page | 9.4 MB |
| `/public/dist/app.min.js` | PTR's own AngularJS controller bundle, fetched live | 455 KB |

The bundle had **never been fetched** before 2026-08-15. The two DOM captures existed since
2026-07-24.

---

## The question, and the honest answer

**Is there a SaaS operator console — the surface that manages the client businesses paying to run
trading rooms — and is there a BALANCE?**

**Not in any of these three sources.** That is a measurement, and its scope is exactly:

- the account page and manage page **as rendered to a tenant**, and
- the controller bundle **as served to that tenant**.

The Launch JWT in the account capture decodes to `{"name":…,"email":…,"id":"6a627f92…","type":"site"}`
— **a tenant session.** Absence from a tenant's view is not absence from the product, and this
document does not claim otherwise.

### The one door nobody has opened

```html
<a ng-hide="disableMarketplace" ng-click="manageMarketplaceSession(s._id, s)"
   class="btn btn-sm btn-default ng-hide">Marketplace</a>
```

Both entry points — the account row and the manage-page header — carry `ng-hide` in the rendered DOM
because the scope flag `disableMarketplace` is truthy on the captured account. **The handler never
ran, so whatever it renders is not in this evidence.** It carries a `fa-credit-card` icon and has a
matching `loadMarketplaceUsers()` filter.

**If a balance exists in the client, it is behind that button.** Everything else on both pages has
now been read line by line. Opening it needs a room where `disableMarketplace` is false.

### A false positive that was caught and refused

The account page contains the strings `moneybag`, `dollar`, `credit_card`, `money_with_wings`. That
is the **Intercom emoji picker**, not an app feature. Recorded because reporting it as a money
surface would have been reporting our own tooling.

---

## The SaaS machinery that IS present

None of this is a console, and all of it is unambiguous:

| evidence | quote / locator | what it establishes |
| --- | --- | --- |
| seat quota | `1 / 2` in the account page Users column | rooms have a seat ceiling |
| usage watermark | `Current : 0 / Max  0` + a `Reset Counts` button | concurrent usage is tracked and its max recorded |
| **limits exist elsewhere** | *"these counts are just for information purposes, does not affect your room's **limits**…"* | **an authority above this page sets the limit.** The strongest single pointer in the evidence |
| tenant→end-user billing | `sess.subscriptionPlans`, a JSON array of `{name, fee, desc, recommended}` with example fees `4.99` / `9.99` | the tenant charges **their** customers |
| payment binding | `sess.stripeEmail`, per room | Stripe bound at room level |
| entitlement axes | `allowedMemberships`, `sess.allowedProducts`, `sess.allowedPerms` | three independent allow-lists gating room entry, all deny-by-default when set |
| **an admin panel elsewhere** | *"put any emails here of admins you want to allow access to **the admin panel section**"* (`modAdminLoginList`) | **a panel exists beyond the manage page**, gated by an email allow-list |
| operator provisioning | *"(DON'T TURN THIS ON, If PTR did not clear you for v3!! it will not work….)"* and the v5 twin | an operator→tenant grant that is **described in product copy with no control to perform it** |
| identity layering | site `6a627f92…` (JWT) · ownerID `6a628a98…` · room `6a628a99…` | an owner/account layer in the data model |
| room kill switch | `sess.isLocked` — *"If session is locked, nobody will be able to log in…"* | per-room suspension |

### The only true cross-boundary mechanism is not a console

```
For pushing alerts and streams to other rooms, you can use the following settings.
You need the other rooms ID and the API Secret of the other room to do this.
```

Shared-secret federation via `sess.linkedStreamsAPIKey` (*"Other Room API Secret:"*). Two rooms are
linked by exchanging a secret, not by an operator reaching across.

### Cross-ROOM, within one account

Real and repeatedly present, and not to be confused with cross-tenant:

- `applyToAllSessions()`, `applyRepeaterToAccount()`, the checkbox *"Apply to all rooms?"*
- `updateUserXrefMulty` with `applyToAllRooms` and an `emailList`
- `$scope.login.sessions` — the signed-in account's own rooms, used to copy settings between them

One owner writing to their own rooms.

### The mechanism a route probe cannot see

```js
$scope.switchSession = function(sess){
  window.location.href = "/users/v1/ssoJWT?sessID=" + sess.sessionID + "&jwt=" + __al + "&sl=1&name=" + chatModel.nick
}
```

gated by:

```js
chatModel.otherJWTSessions && chatModel.otherJWTSessions.length > 1 &&
  ($scope.hasSessionPulldown = !0, $scope.otherSessions = chatModel.otherJWTSessions)
```

**A token carrying more than one session renders a room-picker an ordinary customer never sees.**
That is *data-gated, not state-gated* — which is why reading the ui-router registry found 31 states
and no operator surface. **The registry was the wrong layer to look at.** Whether that list can span
tenants depends on how the server builds `otherJWTSessions`, which is not in the client.

---

## The API shape

**Command dispatch, not REST.** Every call is `$http.post` of `{cmd: …}` built by
`makeReqTokenForCmd(cmd)`, whose falsy return is the client-side permission gate.

| endpoint | commands read |
| --- | --- |
| `/users/v1/sessions` | `deleteSession` · `sessionPubData` · `clearUserList` · `clearUserListFT` · `resetMaxCounts` · `userList` · `showFreeTrials` · `clearTokensForUsers` · `userListBanned` · `userListPresenters` · `userListMuted` · `userListMarketplace` · `emailReminders` · `sessionDetailsShort` · `sessionDetails` · `saveSessField` · `saveTextList` · `changeLogo` · `addBadge` · `deleteBadge` · `addBadgeDarkTheme` · `listBadges` · `updateUserXref` · `addBadgeForUser` · `removeBadgeForUser` · `inviteUsers` · `inviteBatchUsers` · `removeUserXref` · `updateUserXrefMulty` · `updateUserXrefMultyEmailList` |
| `/users/v1/apikeys` | `list` · `create` · `rotate` · `delete` · `listAllApiEndpoints` |
| `/users/v1/adminusers` | `list` · `add` · `remove` |
| `/users/v1/users.json` | `inviteParticipants` |
| `/users/v1/ssoJWT` | session switch (GET, query string) |

**An operator surface in this codebase would be additional `cmd` values on these endpoints, not new
routes.** That is the shape to look for next.

---

## THE ROLE NUMBER TRAP

**The same integer means different things in the per-user menu and the bulk menu.** They are
different commands and their vocabularies do not match.

| N | per-user — `updateUserXref` | bulk — `updateUserXrefMulty` |
| ---: | --- | --- |
| 1 | Make Presenter | ` Make Presenter` |
| 2 | Make Participant / Unban | ` Make Participant` / ` UNBAN Participant` |
| 3 | MUTE Participant | ` MUTE Participant` |
| 4 | BAN | ` BAN Participant` |
| 5 | Make Admin | ` Make Admin (Non-Presenter)` |
| 6 | Make Trial | ` Make TRIAL user` |
| 7 | Hide User Count | — |
| 8 | Show User Count | — |
| 9 | Freshen Login Date | — |
| **10** | **Hide Pers User Data** | **` Remove All`** |
| 11 | Don't Hide Pers User Data | — |
| 12 | **UNOBSERVED** — not in either menu | — |
| 13 | Deny Archives Access | — |
| 14 | Allow Archives Access | — |

**Building one shared vocabulary for both would turn "hide personal data" into "delete every selected
user".** `12` is genuinely unobserved and is recorded as a gap, not guessed.

**Role `0` is the owner** and is skipped by every bulk operation — `0 !== user.role` guards both the
select-all and the email-list build. **Client-side only.** Nothing in the bundle proves the server
re-checks.

---

## The per-user admin menu, captured OPEN

From `ptr1.json`, the full menu with every submenu expanded. This is a complete surface we have not
built.

**Permissions** (`fa-shield`) — Make Presenter · Make Admin · Make Participant · Make Trial · MUTE
Participant · BAN · *divider* · Unban · Freshen Login Date

**Granular Perms** (`fa-sliders`)
- `Adjust Mic/Cam/Screen/Chat/Notes` → `setPermissions(user)`, opens `#permissionsModal`, gated
  `ng-show="user.role !== 1"`
- Show / Hide User Count
- Deny Archives Access (gated `!user.denyArchivesAccess`) / Allow Archives Access (gated
  `user.denyArchivesAccess`)
- Hide / Don't Hide Pers User Data
- `setUserRestrictPM(true|false)` — Disallow / Allow User2User PM

**App and Notifications** (`fa-mobile`) — Get App PIN · Show App Tokens · Get FCM Tokens · PAUSE /
RESUME / Remove Mobile Notifs · Send Test Mobile Notifs · Reset Mobile Notifs

**Badges** (`fa-certificate`)

Then: Set Note · Edit Username · Remove User · Set/Change Password · Resend Welcome Email ·
`approveUser(…,'pending')` — *Pause / Pending*

### The permissions modal, verbatim

Title `Adjust Mic/Cam/Screen permissions for user:` — five checkboxes, saved by
`saveUserPermissions()`:

| label | model |
| --- | --- |
| `Microphone` | `userPermissions.hasMic` |
| `Screenshare` | `userPermissions.hasScreen` |
| `WebCam` | `userPermissions.hasCam` |
| `AdminChat` | `userPermissions.hasAdminChat` |
| `CanEditNotes` | `userPermissions.canEditNotes` |

### The user-list actions menu

`loadUsersFT` *Show Free Trials* · `loadBannedUsers` *Show BANNED* · `loadMobileUsers` *Show Mobile* ·
`loadNonMobileUsers` *Show Non-Mobile* · `loadPresentersUsers` *Show Presenters* ·
**`loadMarketplaceUsers` *Marketplace Users*** (`fa-credit-card`) · *divider* · `clearUserList`
*Remove non-presenters* · `removeUsersFT` *Remove Free Trials* · `removeBadgesForUsers`
*Remove All User Badges*

---

## Defects in the reference, found while reading

Recorded because the owner's directive is to match identically, so each of these is a decision:
reproduce the bug, or diverge and record it.

1. **`addBadgeForUser` and `removeBadgeForUser` are dead.** They build a request and never send it —
   no `$http.post`. `badgeID` and `global` are accepted and unused.
2. **`loadSettingsFromJSON` is a copy-paste of `exportSettingsToJSON`** — it *exports* instead of
   loading, and still logs the wrong function name.
3. **Hardcoded third-party credentials shipped to every browser** — an Imgur client id and a RapidAPI
   key, in the bundle, readable by anyone who loads the page.
4. **Weak API-secret fallback** — when `crypto.getRandomValues` is unavailable the room's API secret
   becomes two concatenated `Math.random()` slices.
5. **Operator-precedence bug** in the badge-selector title: `'…"'+tab.name||'Unnamed chat tab"'` —
   the fallback can never fire and the quote lands inside the string.
6. **`doWebRTCReset`'s confirm callback ignores its result**, so Cancel still performs the reset.
7. **`loadSettingsFromRoom` fires one HTTP POST per settings field**, sequentially, and its
   multi-select reads only `setting[0]` so it silently applies just the first room.
8. **`var` capture in `onImageSelect`** — the upload log reports the last file for every upload.

---

## Honest gaps

- **The Marketplace pane.** Never opened; `disableMarketplace` truthy on the captured account.
- **The `perms` vocabulary for `/users/v1/adminusers`.** Initialised `{}` and posted verbatim; the
  keys are bound in an HTML template not present in the bundle.
- **`makeReqTokenForCmd`** — the permission gate every request depends on. Not in the slices read.
- **`otherJWTSessions`** — built server-side; whether it can span tenants is unknown.
- **`updateUserXref` code 12** — unobserved in either menu.
- **`__al`** — the page global holding the JWT used by `switchSession`. Not defined in the slices.
- **`vendor.min.js` (1.25 MB)** — classified as third-party AngularJS and NOT read. That is a
  judgement, not a measurement.
