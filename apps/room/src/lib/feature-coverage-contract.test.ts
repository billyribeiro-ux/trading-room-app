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
const ABSENT_FROM_OUR_SOURCE: readonly string[] = [
  'alertQAMsg',
  'archiveLogs',
  'callScreeen',
  'deleteAlertMsg',
  'deleteChatMsg',
  'demux',
  'doShowMsgToAll',
  'getMyRepeater',
  'getMyState',
  'getSessionNotes',
  'hardResetSession',
  'lockSession',
  'pingPopup',
  'presenterNotTalking',
  'privMsg',
  'reloadSessionConfig',
  'resetAllMediaServers',
  'resetAudioBridge',
  'resetAudioBridgeOnServer',
  'resetMediaServer',
  'resetSession',
  'saveAndCloseSession',
  'savePresenterColors',
  'setSessionState',
  'softResetSession',
  'startWebcam',
  'stopConsumer',
  'stopOBStream',
  'stopRecMsg',
  'stopRecMtx',
  'stopWebcam',
  'unarchiveLogs',
  'updateChatMsg',
  'updateUserPM',
  'userDeleteChatMsg'
];

/*
  Two tab ids, and they are absent for opposite reasons — which is exactly why the list is names and
  not a count.

  `recordings` is a REAL gap and stays one deliberately: the reference's pane is one iframe onto a
  SERVER archive page, and there are zero recordings or archive tables in either database, so
  building the surface would front nothing. TODO.md carries the blocker.

  `files` is NOT a gap. The reference uses the id as a value — `onMainTabChange(e)` at bundle byte
  1,968,370 tests `"presAreaTabs-files" == this.selectedMainTab` and calls `getSessionFiles()` — and
  this room reaches the same behaviour through a typed union (`mainTab === 'files'`,
  `PresentationArea.svelte:616-640`) with the pane's own remote query doing the fetching
  (`files-pane.remote.ts`). A string id and a discriminated union are the same decision written two
  ways; only one of them is greppable, and it is not ours.

  The audit's own earlier report of "two presentation-area tabs missing" named `videoplayer` as the
  second, and that was wrong: it is built and gated end to end at `PresentationArea.svelte:520-541`.
*/
const ABSENT_TABS: readonly string[] = ['files', 'recordings'];

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

  it('names exactly the presentation-area tabs our source does not mention', () => {
    expect(report.absentTabs).toEqual([...ABSENT_TABS]);
  });
});
