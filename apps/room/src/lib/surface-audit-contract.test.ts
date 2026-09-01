import { describe, expect, it } from 'vitest';
import { auditSurface } from '../../gate/audit-surface.mjs';

/*
  EVERY SURFACE THAT HAS BEEN READ END TO END STAYS READ.

  ## What this is, and why a pinned LIST rather than a count

  `todo-next.md` asks for a per-surface read of the reference: every const by value, every text
  literal, measured against the files that implement it. `gate/audit-surface.mjs` performs that
  measurement; this file pins the ANSWER for each surface already done, so re-opening a gap is a
  failing test rather than a thing somebody would have to notice.

  A count would catch none of the failures worth catching. Building one value while another quietly
  disappears leaves the total unchanged, and a silent regression is exactly the shape here —
  `feature-coverage-contract.test.ts` makes the same argument for the wire vocabulary and is the
  model for this file.

  ## Why it is not `reference-const-coverage-contract.test.ts`

  That sweep searches the WHOLE application for each value, so `form-select`, `d-flex` and `m-0`
  count as present because they occur somewhere while being absent from the component under audit.
  Its own comment records the limitation; `PAM-11` is what one instance of it looked like — a Repeat
  select shipping with no classes at all, invisible to a sweep that found `form-select` elsewhere.

  This scopes the search to the files implementing ONE surface, and it also reads TEXT LITERALS,
  which that sweep does not read at any scope because they are not in the const table.

  ## ⚠️ EVERY REMAINING ENTRY BELOW IS A RECORDED REFUSAL, NOT A BACKLOG ⚠️

  A value stays listed here only with its reason written at the code. Removing one means it was
  BUILT. Adding one is a conversation: it means this room stopped rendering something the reference
  renders, which is either a deliberate divergence that belongs in a comment or a regression.
*/

describe('app-post-alert-modal — audited 2026-09-01', () => {
  const report = auditSurface({
    selector: 'app-post-alert-modal',
    files: [
      'src/lib/components/PostAlertModal.svelte',
      'src/lib/components/ScheduledAlerts.svelte',
      'src/lib/components/ScheduledAlertFields.svelte',
      'src/lib/components/ScheduledAlertsTable.svelte',
      'src/lib/scheduled-alert.ts',
      /* The shared modal chrome: `modal-dialog`, `modal-header`, `btn-close`, the Close label. */
      'src/lib/components/Modal.svelte'
    ]
  });

  it('reads the component it says it reads', () => {
    /*
      The vacuity guard, and it is three separate claims because three separate things can go quiet:
      the const table can fail to parse, the view walk can resolve nothing, and the file list can
      point at files that no longer exist. The view count is the one that already failed once — the
      first version of the walk anchored on `H(` and found 2 of 15, because the minifier chains the
      rest as bare calls.
    */
    expect(report.region.consts).toBe(79);
    expect(report.views.resolved).toBe(15);
    expect(report.views.unresolved).toEqual([]);
  });

  it('has exactly four const values left, and each is a refusal on record', () => {
    /*
      `alert-text-label` — the "Text this out?" checkbox, Twilio SMS, in
      `direct-evidence-contract.ts`'s `hiddenCapabilityBranches`: no capture this repository holds
      ever rendered it and the feature behind it is blocked outright.

      `alert-dont-cross-post-label` — the same, for the linked-room fan-out.

      `sendLaterAsEmail` / `sendLaterAsNick` — `PAM-10`'s refusal, argued in `ScheduledAlerts.svelte`:
      upstream's form lets a presenter post an alert under someone ELSE's name and address, so those
      two fields are not on the wire here and the server derives the sender from the session.
    */
    expect(report.constGaps.map((gap) => gap.value)).toEqual([
      'alert-text-label',
      'alert-dont-cross-post-label',
      'sendLaterAsEmail',
      'sendLaterAsNick'
    ]);
  });

  it('and exactly four text literals, which are the same four refusals', () => {
    /* One label per refused control — the labels are the controls, so the two lists agree. */
    expect(report.textGaps).toEqual([
      'Text this out?',
      "Don't cross post to linked alert rooms",
      'Send as email:',
      'Send as Name:'
    ]);
  });
});

/**
 * The surfaces measured CLEAN on 2026-09-01 — zero absent const values, zero absent text literals.
 *
 * Table-driven because seven identical assertions written seven times is seven places for one of
 * them to be quietly weakened, and because the interesting per-surface fact is the SIZE: a component
 * with one const and no views proves very little, and saying so is more honest than a green tick.
 *
 * `views` and `consts` are asserted alongside the gaps for exactly that reason. Both numbers already
 * caught a bug: the view walk resolved SIXTEEN views for `app-muted-users-modal`, whose template
 * declares two, because the template slice ran past `},styles:` into the four `app-rec-preview` views
 * declared below it and reported "Recording paused." as a gap here.
 */
const CLEAN: readonly {
  readonly selector: string;
  readonly consts: number;
  readonly views: number;
  readonly files: readonly string[];
}[] = [
  {
    selector: 'app-muted-users-modal',
    consts: 16,
    views: 3,
    files: [
      'src/lib/components/ModalHost.svelte',
      'src/lib/components/Modal.svelte',
      'src/lib/components/PresenterMuteRows.svelte'
    ]
  },
  {
    selector: 'app-followed-users-modal',
    consts: 19,
    views: 4,
    files: ['src/lib/components/ModalHost.svelte', 'src/lib/components/Modal.svelte']
  },
  {
    selector: 'app-alert-filter-modal',
    consts: 19,
    views: 6,
    files: [
      'src/lib/components/ModalHost.svelte',
      'src/lib/components/Modal.svelte',
      'src/lib/alert-filter.ts'
    ]
  },
  {
    selector: 'app-scheduled-alerts-modal',
    consts: 17,
    views: 2,
    files: [
      'src/lib/components/ModalHost.svelte',
      'src/lib/components/Modal.svelte',
      'src/lib/components/ScheduledAlertsTable.svelte',
      'src/lib/components/ScheduledAlerts.svelte',
      'src/lib/scheduled-alert.ts'
    ]
  },
  {
    selector: 'app-mobile-app-info-modal',
    consts: 15,
    views: 1,
    files: [
      'src/lib/components/ModalHost.svelte',
      'src/lib/components/Modal.svelte',
      'src/lib/components/MobileRestorePane.svelte'
    ]
  },
  {
    /* Two consts and no embedded views — a thin container, and the numbers say so. */
    selector: 'app-positions-container',
    consts: 2,
    views: 0,
    files: [
      'src/lib/components/PositionsContainer.svelte',
      'src/lib/components/PositionsControls.svelte',
      'src/lib/positions-iframe.ts'
    ]
  },
  {
    /* ONE const. Pinned for completeness, and it is the weakest evidence in this file. */
    selector: 'app-webcam-holder',
    consts: 1,
    views: 0,
    files: ['src/lib/components/WebcamStrip.svelte', 'src/lib/components/PresentationArea.svelte']
  }
];

describe('seven surfaces measured clean — audited 2026-09-01', () => {
  it.each(CLEAN)('$selector renders every const value and text literal', (surface) => {
    const report = auditSurface({ selector: surface.selector, files: [...surface.files] });
    expect(report.region.consts, `${surface.selector}'s const table must still parse`).toBe(
      surface.consts
    );
    expect(report.views.resolved, `${surface.selector}'s view walk must still reach them`).toBe(
      surface.views
    );
    expect(report.views.unresolved).toEqual([]);
    expect(report.constGaps.map((gap) => gap.value)).toEqual([]);
    expect(report.textGaps).toEqual([]);
  });
});

describe('the chat toolbar — audited 2026-09-01, and it is CLEAN', () => {
  /*
    A byte RANGE rather than a selector: the toolbar has no component of its own upstream. It is a
    region inside `app-chat` (selector at byte 1,447,463), and the extra column's copy at 2,395,378
    is byte-identical through the whole bar — which is why this room has ONE `ChatSearchBar` and the
    size contract refused the second transcription.

    Zero and zero, and the three candidates that had to be ruled out on the way are the reason the
    script grew two decoders: `Giphy Search` and `*Double click an image to select it` live in
    `GiphyPicker.svelte`, and `\\xa0Chat` is `acA-11`, built months earlier and written `&nbsp;Chat`
    here. One entity decoder and one JS-escape decoder later, both sides spell the same thing.
  */
  const report = auditSurface({
    from: 1_449_150,
    to: 1_451_150,
    files: [
      'src/lib/components/ChatSearchBar.svelte',
      'src/lib/room/chat-search.svelte.ts',
      'src/lib/chat-mode.ts',
      'src/lib/components/AlertChatArea.svelte',
      'src/lib/components/ExtraChatPane.svelte',
      'src/lib/components/ChatTabStrip.svelte',
      'src/lib/components/GiphyPicker.svelte'
    ]
  });

  it('resolved the views it needs to have read', () => {
    expect(report.views.resolved).toBeGreaterThan(20);
    expect(report.views.unresolved).toEqual([]);
  });

  it('renders every const value and every text literal the reference does', () => {
    expect(report.constGaps).toEqual([]);
    expect(report.textGaps).toEqual([]);
  });
});

describe('the #files region of app-presentationarea — audited 2026-09-01', () => {
  /*
    Another range, and the largest one pinned here: `#files` is a tab pane inside
    `app-presentationarea` with no selector of its own. The range covers its const block — 238 to
    266 in the table at byte 1,994,257 — and the walk picks the views up from the template.

    One text literal remains and it is a refusal with the gates read:
    `O(84, sessionFiles ? -1 : 84)` and `O(85, sessionFiles && sessionFiles.length > 0 ? 85 : -1)`
    are NOT complements, because an empty array is truthy. So "No room files found." is the
    never-fetched message rather than the empty-list one, and a reference room with zero files shows
    nothing at all. Our loader ends in `.all()`, which always returns an array, so that state cannot
    arise here — the heading is not rendered rather than kept as a branch nothing can reach.
  */
  const report = auditSurface({
    from: 2_010_950,
    to: 2_012_762,
    files: [
      'src/lib/components/FilesPane.svelte',
      'src/lib/file-sort.ts',
      'src/lib/files-gates.ts',
      'src/lib/room/files.svelte.ts',
      'src/lib/components/PresentationArea.svelte'
    ]
  });

  it("has one const value left, and it is the reference's own typo", () => {
    /*
      `pe`. Consts 261 and 269 read `["pe","button","title","Remove Overwrited Cash Register Sound",…]`
      — an attribute literally NAMED `pe`, where `"type","button"` was meant. The button therefore
      ships with no `type` and falls back to `submit`.

      Not reproduced, and pinned twice: `files-pane-rows-contract.test.ts` reads both consts from the
      bundle, and this line keeps it visible in the surface report instead of letting somebody "fix"
      the gap by transcribing an attribute no HTML parser has ever heard of.

      It appeared here only on 2026-09-01, when this script stopped matching by SUBSTRING — `pe`
      occurs inside a dozen words in any source file, so it had been silently counted as present.
    */
    expect(report.constGaps.map((gap) => gap.value)).toEqual(['pe']);
  });

  it('and the one absent literal is the never-fetched message', () => {
    expect(report.textGaps).toContain('No room files found.');
  });
});
