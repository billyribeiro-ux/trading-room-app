# Audit of the controller↔room seam

**Scope:** everything changed on 2026-08-06/07 to make `new-room-control` the front door — the
handoff, the config read, per-room membership, the realtime channel, Mobile App Info and Benzinga.

**Method:** read the shipped bundle for what the reference does, read the diff for what this build
does, and run both applications against each other for what actually happens. Every finding below
cites one of those three. Nothing here is inferred from memory.

**Status:** four defects were found and fixed during the audit (§1). Six remain open (§2). One
class of mistake explains most of them (§3), and §4 is the plan.

---

## 1. Found and fixed

| #   | Defect                                                                                                                                                                                                                                                                                                                                       | Evidence                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | **Privilege escalation.** `/session` set the room's role from the handoff TOKEN TYPE (`site` → `staff`), and `isPresenter` — every gate and 17 server actions — is `role === 'staff' \|\| 'admin'`. `requireOwnedRoom` admits anyone in the ACCOUNT to `/launch/[id]`, and `inviteRoomUser` puts an invited participant in that same account | `role-authority-e2e` failed 4/6 against it; a role 2 Participant arrived as `staff`                  |
| 2   | **A role change never reached a live session.** The role was written once, at entry                                                                                                                                                                                                                                                          | promote → presenter, demote → no effect until re-entry. Now reconciled on every load                 |
| 3   | **A banned member was let in.** Role 4 mapped to `member`, and nothing read the flag again                                                                                                                                                                                                                                                   | `applyUserOpcode` case 4 writes role 4 and `banned`; the room admitted them                          |
| 4   | **One realtime channel for every room.** `ROOM_CHANNEL = 'ptr-room'`, justified in-source by "this one has exactly one [room]"                                                                                                                                                                                                               | the controller creates many; every room's alerts, chat, roster and commands reached every other room |

---

## 2. Open

### 2.1 Five of seven membership fields are fetched and dropped — HIGH

The reference loads the whole set onto `globals.user` when the room is joined:

```js
globals.user.hasMic = B.data.hasMic;
globals.user.hasScreen = B.data.hasScreen;
globals.user.hasCam = B.data.hasCam;
globals.user.hasAdminChat = B.data.hasAdminChat;
globals.user.canEditNotes = B.data.canEditNotes;
globals.user.denyArchivesAccess = B.data.denyArchivesAccess;
```

`internal/room-config` returns all of them. The room reads `hasAdminChat` and
`denyArchivesAccess` and ignores the rest.

**`hasMic` / `hasScreen` / `hasCam` are load-bearing, not decoration.** The reference puts them in
the media join itself:

```js
socket.emit("cmd", { cmd: "connectToRoom", …,
  isP: globals.user.isPresenter || globals.user.hasCam || globals.user.hasMic || globals.user.hasScreen, … })
```

A member granted any one of the three is a producer as far as the SFU is concerned. That is
`giveMicScreen` in its durable form — the per-room permission — and it is the piece that makes
`isLimitedPresenter` reachable at all. This room's `toggleMicrophone`, `toggleWebcam` and
`startScreenSharing` have no permission gate whatsoever.

**`canEditNotes`** is a per-room permission the controller's own `#permissionsModal` edits. The
room decides it with `requireUser(locals).role === 'staff' || 'admin'`
(`+page.server.ts:486`), so a participant granted it cannot edit, and a presenter without it can.

**`restrictPmUser`**, **`nonPresenter`** and **`muted`** (role 3, the reference's CHAT MUTED) are
returned and never read.

### 2.2 Neither application checks whether the room is OPEN — HIGH

`rooms.state` is `'open'` / `'closed'`, the controller's guest login refuses a closed room
(`session/[code]/+page.server.ts:100`), and `session/[code]/joined` re-checks it before minting.

`/launch/[id]` does not. `/session` does not. `internal/room-config` returns `state` and the room
ignores it. So an owner — or anyone in the account — walks into a closed room, and stays in one
that closes under them.

### 2.3 `isLimitedPresenter` is unreachable — MEDIUM

The receiver is built and correct. Nothing sends `giveMicScreen`, so the flag is always false and
the two surfaces gated on it can never narrow. §2.1 is the same hole from the other side: with
`hasMic`/`hasScreen` consumed, the durable form of this state would work without the command.

### 2.4 A `denyArchivesAccess` fallback is fail-OPEN — LOW

`denyArchivesAccess: roomConfig.member?.denyArchivesAccess ?? false` (`+page.server.ts:217`).
`false` means "not denied", so a missing membership grants rather than withholds.

Not currently reachable: `load` throws when the config read fails, so the only path to `null` is a
guest, who has no such flag. It is on this list because the reasoning that makes it safe lives in
another file, and that is exactly how §1's defects were built.

### 2.5 The SSE hub still has a two-source fallback — LOW

`isP: membership?.isP ?? isPresenterRole(user.role)`
(`sess/[room]/events/+server.ts:135`). Both derive from the same membership now, so they agree —
but "two ways to compute one thing" is the shape of §1 defect 1, and it survived there for a day.

### 2.6 Rooms created before 2026-08-07 have no owner membership — LOW

`createRoom` now seats the owner at role 0. Rooms that predate it have no such row, so their owner
reads as `member: null` → role `member` → **not a presenter in their own room**. No backfill was
written.

---

## 3. The one mistake behind most of this

Every defect in §1 and §2.1–2.3 is the same shape: **a value with two sources, or a source with no
consumer.**

- role: token type _and_ membership → the gates read the wrong one.
- `isP` vs `isPresenter`: two derivations of one fact.
- the channel: one constant standing in for a per-room key.
- the permissions: one source, no consumer.
- `giveMicScreen`: one consumer, no source.

The rule this suggests, and which §4 follows: **when the controller becomes authoritative for
something, consume all of it or none of it.** A partially-consumed authority is worse than no
authority, because the half that is ignored looks configured and is not.

---

## 4. Plan

Ordered so each phase is independently verifiable and nothing depends on a later one.

### Phase A — the room is a place you can be shut out of _(§2.2, §2.6)_

Smallest, and it closes a hole in both applications.

- `/launch/[id]` refuses a closed room, as `session/[code]` already does.
- `/session` refuses one too, from the config read it already makes — the door is the room's to
  guard, not only the controller's.
- The page load ends a session when the room closes under it, the way it already does for a ban.
- Backfill an owner membership for rooms created before the fix; one idempotent pass in
  `ensureDatabase`.

**Verify:** extend `role-authority-e2e` — close the room, assert entry is refused and a live
session ends. Assert a pre-existing room's owner is a presenter in it.

### Phase B — consume the permissions _(§2.1, and it dissolves §2.3)_

The largest, and the one that makes the seam honest.

- Carry `hasMic`, `hasScreen`, `hasCam`, `canEditNotes` through to `data.user`.
- `canEditNotes` becomes `permissions.canEditNotes`, not a role test.
- Gate `toggleMicrophone`, `toggleWebcam` and `startScreenSharing` on their permissions.
- Derive `isLimitedPresenter` from them: a non-presenter holding any of the three is exactly the
  reference's `isP: isPresenter || hasCam || hasMic || hasScreen`. That makes the flag reachable
  without waiting for a `giveMicScreen` sender, and §2.3 stops being a gap.
- Feed the media grant the same predicate, so the SFU agrees with the UI.

**Verify:** a new probe. Grant mic only in the controller → the member can unmute, cannot share,
and is a limited presenter (no Archives, no admin body in user-info). Revoke → all three go.

### Phase C — one source, everywhere _(§2.4, §2.5)_

- Remove the `?? false` on `denyArchivesAccess`; make the guest case explicit rather than implied.
- Remove the SSE `?? isPresenterRole(user.role)` fallback.
- `restrictPmUser` and `muted` either get a consumer or come off the response — §3's rule.

**Verify:** the existing suites, plus a boundary test asserting the room reads no membership field
it does not consume.

### Then, and only then

The features still outstanding — "Stop For All", the `???` self-chat variant, private-chat image
upload / online status / title flash, and the transcript page — are independent of all of the
above. They are worth doing after it, not during: each one adds a consumer, and §3's rule says the
consumers should land on a seam that is already coherent.
