import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { auditCoverage } from '../../gate/audit-feature-coverage.mjs';

/**
 * The reference's wire vocabulary, enumerated, with every name our source does not mention pinned.
 *
 * ## Why a pinned LIST rather than a count
 *
 * The enumeration this reads (`gate/audit-feature-coverage.mjs`) exists because nothing had ever
 * asked the captured bundle what it contains: two whole presentation-area tabs sat in it unbuilt
 * while `TODO.md` recorded that everything buildable was built. The audit found work nobody knew
 * existed three separate times.
 *
 * A count would have caught none of those three. Wiring one command while another quietly stopped
 * being mentioned leaves the total unchanged, and the failure this file guards is precisely the
 * silent one. So the NAMES are pinned, and any movement in either direction is a diff a reviewer
 * reads rather than a number nobody re-derives.
 *
 * ## How to change this list
 *
 * Remove an entry when the name genuinely appears in `apps/room/src` — which is what landing the
 * feature does. That is the only routine edit. **Adding one is a conversation**: it means a name the
 * source used to mention is gone, which is either a deliberate divergence that belongs in a comment
 * at the code, or a regression.
 *
 * ## ⚠️ THIS LIST IS NOT A BACKLOG ⚠️
 *
 * An absent identifier is not an absent feature. This room uses remote functions and REST where the
 * reference uses socket commands, so names legitimately differ: `startWebcam` is on this list and
 * `toggleWebcam` does the job. The last adversarial pass over these claims killed 7 of 34 outright
 * and reclassified 9 more as built under another name — a 21% false-gap rate on the raw output.
 *
 * Each entry is a QUESTION to answer by reading. The answers live in
 * `docs/decoded/missing-commands-triage.md`, and that document — not this list — is the tracker.
 */
/*
  `hardReset`, `openSession` and `saveCloseMessage` LEFT this list on 2026-08-27, when the three
  commands they name were built in `session-commands.remote.ts`. That is the routine edit this list
  exists for: landing a feature removes a name, and the diff says which.

  `getScheduledAlerts` left on 2026-08-28 with `hasAlertScheduler`, and it is the only one of the
  three scheduler commands that was ever on this list — `alertMsgLater` and `removeScheduledAlert`
  were already named in the triage prose and so were never "absent from our source". All three are
  cited at `routes/scheduled-alerts.remote.ts`, each beside the divergence it carries: six of the
  reference's twelve payload fields are REFUSED there rather than accepted and dropped, because every
  one of them instructs a downstream this deployment does not have.

  `chatReactions` and `deleteQAAlertMsg` left on 2026-08-28 with the Q&A thread. Both are cited at
  the code that replaces them — `reactToQuestion` and `deleteQuestion` in
  `routes/alert-questions.remote.ts` — and BOTH cites are there to record a divergence rather than a
  transcription: the reference addresses a thread entry by its parent alert plus an ORDINAL, because
  its entries live inside the alert document and have no id. Ours have one. So these two names leave
  the list because the feature landed, and the citation beside each says exactly how it differs.

  `forceStopScreen` left on 2026-08-29, and it is the one whose absence was HIDING A DEFECT rather
  than naming an unbuilt feature. `missing-commands-triage.md` had recorded it as built, citing
  `ScreenTabs.svelte:211,227` — the menu item. The item was there; the behaviour was not. A presenter
  clicking "Stop This Screen" on a member's share removed their own tab and left the member
  broadcasting to everyone else, which is the `stopVideoForAll` shape that same document resolved by
  reading, two rows above. The name is gone from this list because the command now exists
  (`presenter-commands.remote.ts`), and the pair is held together by
  `force-stop-screen-contract.test.ts` — a citation would not have caught this one, and did not.
*/
/*
  `archiveLogs` and `unarchiveLogs` left on 2026-08-30 — the last two rows the missing-command census
  still carried as NOT BUILT after the other four were measured to real blockers. Cited at
  `routes/chat-archive.remote.ts` and `lib/server/chat-archive.ts`, each beside its divergence:
  deletion is scoped by the SESSION's room rather than by the `roomID` upstream sends from
  `globals.sessData`, and the fourth dialog button — `Delete Searched`, which deletes by a LIKE
  pattern the caller typed — is deliberately not drawn beside the reversible one.
*/
/*
  `savePresenterColors` left on 2026-08-30, and its absence had been hiding the same class of defect
  `forceStopScreen`'s did: the CONTROL existed and the behaviour did not. The settings modal has
  drawn two colour pickers under *"These colors will affect how ALL USERS see your messages and
  alerts"* since it was built, and Save wrote a preference key nothing read, in a store no other
  viewer can see. Cited at `routes/presenter-colors.remote.ts` and `lib/presenter-colors.ts`, and
  the citation is there to record a DIVERGENCE rather than a transcription: the reference's client
  sends `key: hashEmail(user.email)` — the client naming whose colours it is writing, over a hash
  that is in every roster row — and ours derives that key on the server from the session. The wire
  shape deliberately does not match, and `presenter-colors.remote.ts` says why at length.
*/
/*
  `deleteChatMsg`, `deleteAlertMsg` and `updateChatMsg` left on 2026-08-30 — three names, one
  defect, and it is the class this list exists to surface: the CONTROL existed and the propagation
  did not. Nine commands mutated a rendered row and told nobody, so a presenter deleted a message
  and every other viewer kept it on screen. Cited at `lib/message-mutation-frames.ts`, which holds
  all four reference frames (`updateAlertMsg` was never on this list; it is on our wire now too) with
  the byte each was read at.

  The divergence recorded beside them: the reference's two `update` frames carry the whole row and
  ours carry nothing but the name and who acted. That is the same "the row is the authority" rule
  `changeChatMode` follows, plus one this room has that the reference does not — its SSE stream is
  per ROOM while chat is per CHANNEL, so a frame carrying a body would put admin-channel text on
  every subscriber's wire. `publishChatToRoom` exists for exactly that reason.
*/
/*
  ── 2026-08-30: THIS LIST GREW BY TWENTY-ONE NAMES AND NOTHING WAS BUILT OR UNBUILT ─────────────

  The scanner behind it read our whole source as one string and asked "is this command NAMED
  anywhere?" — INCLUDING inside comments. This repository's comments quote the reference constantly
  and by design, so twenty-one commands that appear here only in prose were being counted as
  present. The report said 107 of 135 were named in our source; the honest number is 85.

  It was found the way these always are — a MEASURED REFUSAL written into `RoomNavbar.svelte`
  explaining why `presenterNotTalking` cannot be built here made the command disappear from this
  list. The explanation for why something is missing counted as evidence that it is present, which
  is the worst direction for a list of open questions to fail in.

  ── 2026-09-01: THOSE TWO LEFT THIS LIST AGAIN, AND THIS TIME BECAUSE THEY WERE BUILT ────────────

  `presenterTalking` and `presenterNotTalking` are receivers in `events.svelte.ts` now, setting one
  flag on `RoomMedia` that `NavbarTalkingIndicator.svelte` reads to choose between const 146 and
  const 148. The refusal that put them here was wrong about the one thing that decides it: the
  reference initialises `presenterTalking` to **false** (bytes 1,114,654 and 1,129,852), so its own
  default is the flat line, and the flag is an ordinary payload-free room command rather than a
  signal only a server can compute. Ten occurrences read end to end; the argument is at the
  component.

  The pair is worth keeping in this note because of the SHAPE: the same two commands left this list
  once by being explained and once by being built, and only the second is progress.

  `gate/audit-feature-coverage.mjs` strips comments now, and its own note records that the first
  attempt at the line rule was too greedy and deleted real code — producing a bigger "discovery"
  that was an artefact. The narrow rule and the greedy one now agree, which is why this number is
  trusted.

  **The twenty-one are not new work.** Several are ours under a different shape — `getChatLog` /
  `getAlertsLog` are `log-pages.remote.ts`, `getSessionFiles` is `files-pane.remote.ts`,
  `chatMsg` is the SSE frame `chat-messages.remote.ts` publishes — and this list has never claimed
  otherwise: its own heading says these are QUESTIONS TO ANSWER BY READING, not a backlog. What
  changed is that the questions are now asked about the code rather than about the commentary.
*/
const ABSENT_FROM_OUR_SOURCE: readonly string[] = [
  'alertQAMsg',
  'archiveLogs',
  'callScreeen',
  'changeUserPerms',
  'chatMsg',
  'chatReactions',
  'connectToRoom',
  'deleteQAAlertMsg',
  'demux',
  'doPCLogSearch',
  'doShowMsgToAll',
  'editUsernameByUser',
  'getAlertsLog',
  'getAllPCLogs',
  'getAllUserPM',
  'getChatLog',
  'getMyRepeater',
  'getMyState',
  'getPCLog',
  'getScheduledAlerts',
  'getSessionFiles',
  'getSessionMediaState',
  'getSessionNotes',
  'hardResetSession',
  /*
    `lockSession` LEFT THIS LIST on 2026-09-02, built rather than declared absent — and it is the
    sixth of the session controls that announced a server act and ran a local one.

    Its three buttons wrote `sessionLocked` and `sessionLockKick` into the clicking presenter's own
    settings blob, both keys with ZERO readers anywhere in `apps/room/src`, and then raised the
    capture's `Session Locked`. The sender is `session-commands.remote.ts`; there is no receiver
    because there is nothing to receive — the lock is a room SETTING on the controller, and
    `decideRoomEntry` has refused a locked room at the guest door since before the buttons existed.

    ONE HALF IS NOT BUILT AND IS NAMED WHERE IT IS SENT: the `{kick: true}` on the middle button.
    Upstream's server evicts everybody; this deployment has no evict-everyone command, and its
    realtime hub is process-local. `session-lock-writes.ts` carries the reasoning.
  */
  'pingPopup',
  'privMsg',
  /*
    `reloadSessionConfig` LEFT THIS LIST on 2026-09-01, built rather than declared absent — sender at
    `session-commands.remote.ts`, receiver on the `cmds` chain in `events.svelte.ts`. It is the fifth
    and last of the session controls that announced a server act and ran a local one; this list is
    where its absence had been recorded, and the entry is deleted rather than struck through.
  */
  'resetAllMediaServers',
  'resetAudioBridge',
  'resetAudioBridgeOnServer',
  'resetMediaServer',
  'resetSession',
  /*
    `saveAndCloseSession` and `setSessionState` — the DOOR, and both are name absences over a feature
    that is built. Read whole 2026-09-03, because until that day the feature genuinely was not built
    and this list would have been right by accident.

    Upstream, byte 2,165,132:

      saveAndCloseSession() { let e = $("#summernoteClosedMsg").summernote("code");
        this.done(); globals.sessData.closedTxt = e;
        sendServerAdminCommand("saveAndCloseSession", {closedMsg: e}) }

    and `setSessionState(e) { this.send("setSessionState", e) }` at 1,026,934 — a thin wrapper with
    TWO occurrences in the whole bundle, its declaration and the `send` inside it. Its callers are
    not in the capture, so what the reference passes it cannot be read here.

    This room does both acts through `saveCloseMessage` and `closeSession`
    (`session-commands.remote.ts`), which store `room_state.closed_message` and write `rooms.state`
    through `internal/room-state/[code]`. Different transport, same two acts, and the ordering the
    reference implies — message first, close second — is enforced by `close-message.ts`.

    They stay on this list because the list is what our SOURCE names, and it names neither. The
    footer's rule is the whole point: an absent identifier is not an absent feature.
  */
  'saveAndCloseSession',
  'setSessionState',
  'setUserProfilePic',
  'softResetSession',
  'startRecMtx',
  'startWebcam',
  'stopConsumer',
  'stopOBStream',
  /*
    `stopRecMsg` LEFT this list on 2026-09-01, by being BUILT — `recording-frames.ts`, transcribed
    from the subscriber at byte 2,505,283. `TODO.md` row AC had held it as blocked on the reference
    server's wording, which is a fact about the PAYLOAD and not about the receiver.

    `setRecPreview` never appeared here — it is not on the reference's `cmds` vocabulary list this
    report reads — but it was built in the same pass and for the same reason.
  */
  'stopRecMtx',
  'stopWebcam',
  'unarchiveLogs',
  'updateUserPM',
  'userDeleteChatMsg',
  'userLoggedIn'
];

/*
  SIX tab ids, and it was two — for the same reason the command list moved, and with the same
  meaning: nothing was unbuilt.

  The check is `source.includes('presAreaTabs-<name>')`, a STRING id. This room does not use string
  ids for tabs; it uses a typed union — `mainTab === 'videoplayer'`, `mainTab === 'files'` — and the
  only places the captured id string appears here are comments quoting the reference. Strip those
  and four more ids stop being "named".

  So four of these six are the case this block already described for `files`: a string id and a
  discriminated union are the same decision written two ways, and only one of them is greppable.
  `videoplayer` (`PresentationArea.svelte:520-541`), `streams`, `dayTradeAlerts` and `swingAlerts`
  are all built and gated end to end.

  `recordings` is the one REAL gap and stays one deliberately: the reference's pane is one iframe
  onto a SERVER archive page, and there are zero recordings or archive tables in either database, so
  building the surface would front nothing. `TODO.md` carries the blocker.

  **What this says about the check itself is worth more than the list.** A greppable-string test
  cannot see a typed union, so for THIS room it can only ever report the reference's vocabulary back
  — which is useful for commands, where the wire really does carry the name, and close to useless
  for tabs, where it does not. Recorded rather than deleted: the list is still the cheapest way to
  notice a tab the reference has and nobody here has read.
*/
const ABSENT_TABS: readonly string[] = [
  'dayTradeAlerts',
  'files',
  'recordings',
  'streams',
  'swingAlerts',
  'videoplayer'
];

describe('the reference wire vocabulary', () => {
  const report = auditCoverage();

  /*
    The guard on the guard, and it is not hypothetical: every pattern in the enumeration is a regex
    over one 2.9 MB line. A change that made them match nothing would leave every assertion below
    passing over an empty universe, which is the vacuous-test failure this repository has already met
    four times. The floor is well under the measured 135 so ordinary drift does not churn this file.
  */
  it('extracts a vocabulary at all', () => {
    expect(report.commands.length).toBeGreaterThan(100);
    expect(report.tabs.length).toBeGreaterThanOrEqual(8);
  });

  it('verifies the bundle against its committed pin before measuring', () => {
    expect(report.evidence.sha256).toBe(
      '40796ca83dba809bb966dad0d020ee5170b33aa4556c691957cb65f0bab87524'
    );
    expect(report.evidence.bytes).toBe(2891205);
  });

  it('names exactly the commands our source does not mention', () => {
    expect(report.absentCommands).toEqual([...ABSENT_FROM_OUR_SOURCE]);
  });

  it('and every one of them is ANSWERED in the document this list calls its tracker', () => {
    /*
      THE SAME HOLE THE SETTINGS SIDE CLOSED ON 2026-08-30, found here on 2026-09-03 by going
      looking for it.

      That side's note says why in as many words: *"THE LIST NAMED ITS TRACKER AND NOTHING EVER
      OPENED IT."* `setting-coverage-contract.test.ts` grew an assertion that every name it pins has
      a disposition in `missing-settings-triage.md`. The COMMANDS side had no equivalent, so the
      same drift was free — and it had already happened: **thirty-one of these forty-five names did
      not appear anywhere in `missing-commands-triage.md`**, as a plain substring. Not answered
      wrongly; not mentioned.

      The failure mode this refuses is specific. When the bundle pin moves or our source stops naming
      something, the assertion above fails with a diff, and the obvious repair is to paste the new
      name into `ABSENT_FROM_OUR_SOURCE` and go green — at which point a command the reference sends
      and this room does not name is pinned, counted, and answered by nobody. It would look exactly
      like the forty-four that ARE answered.

      A plain substring, deliberately. The document answers some names in tables, some in prose and
      some inside a fenced block, and a parser that demanded one shape would refuse honest writing.
      What this asserts is that the name is DISCUSSED, never that the answer is right — several of
      the answers are "not a command at all" and two are "blocked", so a test demanding work would
      be wrong about most of the list.
    */
    const triage = readFileSync(
      new URL('../../../../docs/decoded/missing-commands-triage.md', import.meta.url),
      'utf8'
    );
    /* The instrument first: a read that returned nothing would pass this test by having no content
       to disagree with, which is the vacuity shape guarded four lines up for the enumeration. */
    expect(triage.length).toBeGreaterThan(10_000);

    const silent = ABSENT_FROM_OUR_SOURCE.filter((command) => !triage.includes(command));
    expect(silent, 'every absent command needs an answer in its own tracker').toEqual([]);

    /*
      THE TABS TOO, and they were four-sixths silent when this was written.

      Asserted in the same case rather than a second one, because it is one property — a pinned
      absence with no answer — and splitting it would invite the next list to be added without the
      guard, which is the whole failure being closed here.

      The tab names are matched with their `presAreaTabs-` prefix. Bare `files` and `streams` occur
      in ordinary prose throughout that document, so an unqualified search reported them answered
      when nothing had been written about them at all — a false green that would have left this
      guard looking like it worked.
    */
    const silentTabs = ABSENT_TABS.filter((tab) => !triage.includes(`presAreaTabs-${tab}`));
    expect(silentTabs, 'every absent tab needs an answer in its own tracker').toEqual([]);
  });

  it('names exactly the presentation-area tabs our source does not mention', () => {
    expect(report.absentTabs).toEqual([...ABSENT_TABS]);
  });
});
