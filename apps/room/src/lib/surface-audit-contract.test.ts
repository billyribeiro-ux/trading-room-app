import { readFileSync } from 'node:fs';
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
    /*
      The two message components, and the largest clean pair in this file: 74 and 77 consts, 53 and
      51 embedded views. They are `RoomMessage` and `CompactMessageRow` here, plus the menu both
      share — which is why `MessageMenu.svelte` is in both file lists rather than one.
    */
    selector: 'app-st-message',
    consts: 74,
    views: 53,
    files: [
      'src/lib/components/RoomMessage.svelte',
      'src/lib/components/MessageMenu.svelte',
      'src/lib/components/ModeratorMessage.svelte',
      'src/lib/message-formatters.ts',
      'src/lib/room-message-chrome.ts',
      'src/lib/message-behavior.ts'
    ]
  },
  {
    selector: 'app-st-compactmessage',
    consts: 77,
    views: 51,
    files: [
      'src/lib/components/CompactMessageRow.svelte',
      'src/lib/components/RoomMessage.svelte',
      'src/lib/components/MessageMenu.svelte',
      'src/lib/message-formatters.ts',
      'src/lib/room-message-chrome.ts',
      'src/lib/compact-message-time.ts',
      'src/lib/message-behavior.ts'
    ]
  },
  {
    selector: 'app-screenshare-view',
    consts: 20,
    views: 7,
    files: [
      'src/lib/components/ScreenTabs.svelte',
      'src/lib/components/ScreenPane.svelte',
      'src/lib/components/ScreenPaneStatus.svelte',
      'src/lib/components/ScreenZoomControls.svelte',
      'src/lib/components/ScreenVolumeControl.svelte',
      'src/lib/components/PresentationArea.svelte'
    ]
  },
  {
    selector: 'app-alerts',
    consts: 54,
    views: 13,
    files: [
      'src/lib/components/AlertChatArea.svelte',
      'src/lib/components/RoomMessage.svelte',
      'src/lib/components/ChatTabStrip.svelte',
      'src/lib/components/ChatSearchBar.svelte',
      'src/lib/components/MessageMenu.svelte'
    ]
  },
  {
    selector: 'app-roomscroller',
    consts: 4,
    views: 10,
    files: [
      'src/lib/components/AlertChatArea.svelte',
      'src/lib/components/RoomMessage.svelte',
      'src/lib/components/CompactMessageRow.svelte'
    ]
  },
  {
    selector: 'app-room-roster',
    consts: 24,
    views: 11,
    files: [
      'src/lib/components/RoomSidebar.svelte',
      'src/lib/roster-gates.ts',
      'src/lib/components/AvatarOptionsMenu.svelte',
      /* The roster's badges are drawn by the message row and the user modal, not by the sidebar. */
      'src/lib/components/RoomMessage.svelte',
      'src/lib/components/ModalHost.svelte'
    ]
  },
  {
    selector: 'app-ytplayer',
    consts: 5,
    views: 1,
    files: [
      'src/lib/components/YoutubePlayerOverlay.svelte',
      'src/lib/components/RoomOverlays.svelte'
    ]
  },
  {
    selector: 'app-screenshare-preview',
    consts: 11,
    views: 1,
    files: ['src/lib/components/ModalHost.svelte', 'src/lib/components/ScreenPane.svelte']
  },
  {
    selector: 'app-chat',
    consts: 93,
    views: 27,
    files: [
      'src/lib/components/AlertChatArea.svelte',
      'src/lib/components/ChatSearchBar.svelte',
      'src/lib/components/ChatTabStrip.svelte',
      'src/lib/components/RoomMessage.svelte',
      'src/lib/components/GiphyPicker.svelte',
      'src/lib/components/MessageMenu.svelte',
      'src/lib/chat-mode.ts'
    ]
  },
  {
    /*
      The extra column, and its file list carries a lesson: `extra-chat-surface.ts` has to be in it.
      Without that module the audit reports `textAreaHolder` missing, because the id reaches the
      markup through `EXTRA_CHAT_COMPOSER_HOLDER_ID` rather than as a literal — which is `XCP-01`, the
      defect where an `Extra` suffix cost this column every `#textAreaHolder` rule in `app.css`.
    */
    selector: 'app-extra-chat',
    consts: 90,
    views: 26,
    files: [
      'src/lib/components/ExtraChatPane.svelte',
      'src/lib/extra-chat-surface.ts',
      'src/lib/components/ChatSearchBar.svelte',
      'src/lib/components/RoomMessage.svelte',
      'src/lib/components/GiphyPicker.svelte',
      'src/lib/components/ChatTabStrip.svelte'
    ]
  },
  {
    selector: 'app-poll-modal',
    consts: 53,
    views: 9,
    files: [
      'src/lib/components/PollPanel.svelte',
      'src/lib/components/PollSavedList.svelte',
      'src/lib/room/polls.svelte.ts'
    ]
  },
  {
    selector: 'app-debug-log-modal',
    consts: 11,
    views: 0,
    files: ['src/lib/components/ModalHost.svelte', 'src/lib/components/Modal.svelte']
  },
  {
    selector: 'app-reply-modal',
    consts: 23,
    views: 2,
    files: [
      'src/lib/components/ReplyModal.svelte',
      'src/lib/components/ModalHost.svelte',
      'src/lib/components/Modal.svelte',
      'src/lib/components/GiphyPicker.svelte'
    ]
  },
  {
    selector: 'app-kicked-page',
    consts: 3,
    views: 0,
    files: ['src/lib/components/KickedPage.svelte']
  },
  {
    selector: 'app-root',
    consts: 4,
    views: 6,
    files: [
      'src/routes/+page.svelte',
      'src/lib/components/KickedPage.svelte',
      'src/lib/components/RoomShell.svelte'
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

describe('app-privchat — audited 2026-09-01, and its four gaps are ONE refusal', () => {
  /*
    Four values, one reason, and the reason is `G7` in `room/private-chat.svelte.ts`.

    ```js
    O(1, e.getAllPCLogsLoading ? 1 : 2)   // " Loading private chats. Please wait... " / " No active chat "
    O(3, e.getAllPCLogsLoading ? 3 : -1)  // the tab column's own "Loading all private chats." block
    ```

    Upstream needs that flag because it POSTs `getAllPCLogs` when the panel opens. **This room has no
    such moment**: the conversation list is resolved in `+page.server.ts` before the page renders, and
    the only refresh is `invalidateAll()`, which keeps the previous list on screen while it runs.
    There is no instant at which the strip exists and its contents are unknown, so both branches
    would be branches that can never render.

    `my-1` is the fourth, and it is the same refusal: const 47 is used ONLY inside `sEe`, the
    "Loading all private chats." block. Reading where a class is USED rather than assuming it is
    surface is what turned four findings into one.
  */
  const report = auditSurface({
    selector: 'app-privchat',
    files: [
      'src/lib/components/PrivateChatPanel.svelte',
      'src/lib/components/PrivateChatComposer.svelte',
      'src/lib/room/private-chat.svelte.ts',
      'src/lib/components/GiphyPicker.svelte',
      'src/lib/components/RoomOverlays.svelte',
      'src/lib/components/RoomMessage.svelte',
      'src/lib/components/ModalHost.svelte'
    ]
  });

  it('reads the component it says it reads', () => {
    expect(report.region.consts).toBe(79);
    expect(report.views.resolved).toBe(19);
    expect(report.views.unresolved).toEqual([]);
  });

  it('has exactly the one loading block left, and nothing else', () => {
    expect(report.constGaps.map((gap) => gap.value)).toEqual(['my-1']);
    expect(report.textGaps).toEqual([
      'Loading all private chats.',
      'Please wait...',
      ' Loading private chats. Please wait... '
    ]);
  });

  it("and the refusal's premise is still what it says it is", () => {
    /*
      Read rather than trusted: if the conversation list ever starts being fetched on OPEN, the
      loading states stop being unreachable and this refusal expires. The premise is that the list
      arrives with the page.
    */
    const server = readFileSync(new URL('../routes/+page.server.ts', import.meta.url), 'utf8');
    expect(server).toContain('loadConversations(');
    const panel = readFileSync(new URL('./room/private-chat.svelte.ts', import.meta.url), 'utf8');
    expect(panel).toContain('getAllPCLogsLoading');
    expect(panel).toContain('branches that can never render');
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

/*
  The two LOG ARCHIVE modals are the same surface twice — upstream's two components differ only in
  the word "chat" or "alerts" and the `type` on the wire, and `LogArchiveModals.svelte` says so at
  length. They are pinned as two entries anyway, against two byte ranges, because the day the alerts
  half stops being a placeholder is the day one of these two has to move without the other.
*/
const LOG_ARCHIVE_FILES = [
  'src/lib/components/LogArchiveModals.svelte',
  'src/lib/components/ChatArchivePane.svelte',
  'src/lib/components/ChatArchiveLogPane.svelte',
  /* The shared modal chrome: `modal-dialog`, `modal-header`, `btn-close`, the Close label. */
  'src/lib/components/Modal.svelte',
  /* Upstream's `app-st-message` inside the log; this room's compact row stands in for it. */
  'src/lib/components/CompactMessageRow.svelte'
];

describe('app-chat-logs-modal — audited 2026-09-01', () => {
  const report = auditSurface({ selector: 'app-chat-logs-modal', files: LOG_ARCHIVE_FILES });

  it('reads the component it says it reads', () => {
    expect(report.region.consts).toBe(38);
    expect(report.views.resolved).toBe(11);
    expect(report.views.unresolved).toEqual([]);
  });

  it('renders every const value and every text literal the reference does', () => {
    /*
      CLEAN as of 2026-09-01, and it took two findings to get here — both invisible to the whole-app
      sweep, which is the argument for this file existing at all:

      `vxe`, the archive ROW, is three labelled lines and the middle one is
      `<strong class="fw-bold">By:&nbsp;</strong><i>{{createdBy}}</i>`. This room drew one compressed
      line with no `By:` at all, while `chat_archives.archived_by_user_id` had held the answer since
      the table was added. `chat-archive-row-render.test.ts` now asserts it on the rendered page.

      `Fxe`, the loading arm, is `[1,"text-center","my-4"]` around
      `[1,"ml-2","fas","fa-spinner","fa-spin"]` and the literal `" Loading..."`. Ours had drifted to
      `mt-2` and a `…` character — a third spelling of an idiom `ModalHost.svelte` already carries
      verbatim twice.

      Both were reported 0/0 by the WHOLE-APP sweep, because `By:&nbsp;`, `my-4` and `" Loading..."`
      all occur elsewhere in this application while being absent from this surface.
    */
    expect(report.constGaps).toEqual([]);
    expect(report.textGaps).toEqual([]);
  });
});

describe('app-alert-logs-modal — audited 2026-09-01', () => {
  const report = auditSurface({ selector: 'app-alert-logs-modal', files: LOG_ARCHIVE_FILES });

  it('reads the component it says it reads', () => {
    expect(report.region.consts).toBe(38);
    expect(report.views.resolved).toBe(11);
    expect(report.views.unresolved).toEqual([]);
  });

  it('renders every const value and every text literal the reference does', () => {
    /*
      The alerts half of the modal is a PLACEHOLDER — `LogArchiveModals.svelte` records that its
      sweep is gated on `deleteAlertPW`, one of the seven credential-shaped settings that never reach
      this room — and it still measures clean, because the two components share every const and
      almost every literal. The two that differ are the empty-state and the row's third line:
      upstream's alerts row is `Pxe`, two labelled lines (a date and `By:`) where the chat row's
      `vxe` has three, since an alert has no channel.

      That is the honest reading of this green: what is pinned is the CHROME, and the chrome is one
      surface drawn twice. It is not a claim that the alerts sweep is built.
    */
    expect(report.constGaps).toEqual([]);
    expect(report.textGaps).toEqual([]);
  });
});

describe('app-alert-send-report-modal — audited 2026-09-01', () => {
  /*
    ONE REFUSAL, FORTY-SIX GAPS. Every value below belongs to the report body, the search bar, the
    status select, the flot pie or the per-recipient row — and all five rest on the same thing:
    a list of DELIVERY RECORDS for one alert, which this application has nowhere.

    `AlertSendReportModal.svelte` carries the measurement in full: 24 tables searched for `queue`,
    `latency`, `fail_reason`, `sent_time` and `delivery`; `alerts.dispatch` is five booleans naming
    which channels the presenter TICKED, not what happened; no mail transport exists in
    `apps/room/src/lib/server` at all; and `getAlertReport` has zero occurrences across `apps/`.

    So this is not a backlog. It is one decision, and the list is here so that BUILDING the queue
    turns this test red — forty-six values arriving at once is exactly the signal that the refusal
    expired.
  */
  const report = auditSurface({
    selector: 'app-alert-send-report-modal',
    files: ['src/lib/components/AlertSendReportModal.svelte', 'src/lib/components/Modal.svelte']
  });

  it('reads the component it says it reads', () => {
    expect(report.region.consts).toBe(39);
    expect(report.views.resolved).toBe(11);
    expect(report.views.unresolved).toEqual([]);
  });

  it('is missing exactly the report, and nothing outside it', () => {
    /*
      Asserted as a SET rather than a length. Half of these are generic Bootstrap classes —
      `input-group`, `form-select`, `fw-bold`, `bg-dark` — that this application uses freely
      elsewhere; they are absent HERE because the elements that would carry them are refused, and a
      count could not tell that apart from one of them turning up on something unrelated.
    */
    expect(report.constGaps.map((gap) => gap.value)).toEqual([
      /* the spinner, RPT-02's fake-loading defect */
      'my-4',
      'ml-2',
      'fas',
      'fa-spinner',
      'fa-spin',
      /* the report container and its header */
      'w-100',
      'report-header-container',
      'text-white',
      'my-1',
      'report-header',
      /* `$.plot("#pie-container", …)` — jQuery flot, which this room does not load */
      'pie-container',
      /* the status select: All / sent / queued / failed */
      'input-group',
      'search-select-addon',
      'input-group-text',
      'Search select',
      'form-select',
      'sent',
      'queued',
      'failed',
      /* the search box and its two addons, including upstream's `btn-ligth` typo */
      'search-term',
      'search-addon',
      'Enter search term',
      'form-control',
      'clear-search-addon',
      'btn-ligth',
      'fa-search',
      'report-body',
      'fa-times',
      /* the per-recipient row: name, address, sent time, latency, failure reason */
      'list-group',
      'list-group-item',
      'list-group-item-action',
      'border-0',
      'bg-dark',
      'fw-bold',
      'sent-time',
      'failed-reason',
      'm-1',
      'fa-clock',
      'ms-1',
      'fa-exclamation-circle',
      'me-1'
    ]);
  });

  it('and the five literals are the four filter labels and the empty-queue answer', () => {
    /*
      `No Reports.` is deliberately NOT rendered. It means "the fetch came back empty", and there is
      no fetch — a presenter reading it under a title carrying a real AlertID would conclude their
      alert reached nobody. `REPORT_UNAVAILABLE` says what is actually true instead, and is marked
      as ours at the code.
    */
    expect(report.textGaps).toEqual([' Loading...', 'All', 'Queued', 'Failed', 'No Reports.']);
  });
});

describe('app-typing-indicator-dots — audited 2026-09-01', () => {
  /*
    The smallest reference component there is: one const, no embedded views, four instructions.
    It is pinned anyway, and the reason is what it took to get here rather than what it costs to
    keep — the surface reported one gap for four days behind a recorded reason that was half right,
    and the half that was wrong ("inventing the animation would be inventing a design") is the kind
    that only ever gets caught by re-reading the bundle.

    `typing-indicator-contract.test.ts` holds the values; this holds the fact that there are no
    others.
  */
  const report = auditSurface({
    selector: 'app-typing-indicator-dots',
    files: ['src/lib/components/TypingIndicatorDots.svelte']
  });

  it('reads the component it says it reads', () => {
    expect(report.region.consts).toBe(1);
    expect(report.views.unresolved).toEqual([]);
  });

  it('renders every const value and every text literal the reference does', () => {
    expect(report.constGaps).toEqual([]);
    expect(report.textGaps).toEqual([]);
  });
});

describe('app-note — audited 2026-09-01', () => {
  /*
    The note editor and everything it opens: the Giphy dialog, the carousel builder, the file
    browser, the version history. 94 consts and 17 embedded views, the third-largest surface pinned
    here.

    `GIF-07` closed the last const gap. `modal-basic-title`, `modal-lg` and `77vh` all belong to the
    ng-bootstrap MODAL `opengifSerachModal()` opens the picker inside — and this room had been
    rendering `GiphyPicker`'s POPOVER shell on that mount, portaled to `<body>` at
    `inset: auto auto 0px 0px`. The dialog is `Modal.svelte` now, with the captured id, `h4` title,
    `modal-lg` body and `max-height: 77vh`.
  */
  const report = auditSurface({
    selector: 'app-note',
    files: [
      'src/lib/components/notes/NoteEditor.svelte',
      'src/lib/components/notes/NoteTabContent.svelte',
      'src/lib/components/notes/NotesPane.svelte',
      'src/lib/components/notes/CarouselDialog.svelte',
      'src/lib/components/notes/note-image.ts',
      'src/lib/components/notes/carousel.ts',
      'src/lib/components/notes/note-tab-chrome.ts',
      'src/lib/components/GiphyPicker.svelte',
      'src/lib/components/ImageUploadDialog.svelte',
      'src/lib/components/Modal.svelte'
    ]
  });

  it('reads the component it says it reads', () => {
    expect(report.region.consts).toBe(94);
    expect(report.views.resolved).toBe(17);
    expect(report.views.unresolved).toEqual([]);
  });

  it('renders every const value the reference does', () => {
    expect(report.constGaps).toEqual([]);
  });

  it('and the one absent literal is a state that cannot arise here', () => {
    /*
      `A0e` — `"Loading images..."`, the file browser's fetch-in-flight arm. Upstream's
      `openFileBrowser(e)` at byte 1,477,053 sets `fileBrowserLoading = !0`, opens the dialog, THEN
      POSTs `getSessionFiles`. Here `sessionImages` is a page-load prop derived once in
      `PresentationArea.svelte` from `data.files`, and every upload path calls `invalidateAll()` —
      so there is no moment between opening the browser and holding the list.

      `session-image-files.ts` carries the measurement and says exactly this: *"a branch that can
      never render is a branch that can never be checked."*
    */
    expect(report.textGaps).toEqual(['Loading images...']);
  });
});
