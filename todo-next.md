# todo-next — the room audit, the v4 corpus decision, and the owner's 2026-08-16 requirements

# ⛔ COVERAGE MAP — READ THIS BEFORE TREATING THIS FILE AS A BUILD SPEC

Added 2026-08-16 14:21 EDT, in answer to the owner's question *"todo-next.md should have everything
our app is missing and needs to be implemented in detail. did you get that right?"*

**No. Not yet — and the honest number was itself wrong.**

## Corrected 2026-08-29 01:36 UTC, by measurement

This section said **"2 of 42 surfaces, ~818 of ~30,000 lines"**. Every number in it was stale, and
one was stale by a factor of five. What it claimed, against what `wc -l` said on the day it was
corrected:

> **This comparison is a FROZEN SNAPSHOT of 2026-08-29 and is deliberately never updated.** It exists
> to record how far the map had drifted, which is a fact about that date. The **live** numbers are
> the inventory further down, which is the only table here that a gate checks — and the reason this
> one is frozen rather than maintained is the correction it is describing: two places recording the
> same measurement is how one of them goes stale, and repeating these nine numbers in a second
> maintained table would have reintroduced the defect this section exists to record.

| the map said | measured 2026-08-29 | |
| --- | --- | --- |
| 42 Svelte surfaces, ~30,000 lines | **55 surfaces, 27,290 lines** | the count was never right |
| `routes/+page.svelte` — 6,894 | **1,425** | off by 5,469; the page was decomposed and the row never moved |
| `AlertChatArea.svelte` — 873 | **1,162** | |
| `RoomSidebar.svelte` — 694 | **777** | |
| `RoomMessage.svelte` — 936 | **1,007** | |
| `PresentationArea.svelte` — 1,123 | **957** | |
| `notes/NoteEditor.svelte` — 1,517 | **1,545** | |
| `routes/session/+page.svelte` — 659 | **701** | and this one is an AUDITED surface |
| `ModalHost.svelte` — 5,965 | **5,979** | |

It also **omitted `RoomOverlays.svelte` entirely** — 820 lines, the fourth-largest component in the
room — along with 26 other surfaces named nowhere in it. The old table named 30 files explicitly and
gestured at "13 smaller"; the repository had 55 that day.

**The lesson is not that the numbers drifted. It is that a documented measurement with no gate
drifts silently, and this one was being read as scope.** The table below is now checked on every run
by `apps/room/src/lib/todo-next-coverage-contract.test.ts`, which recomputes every line count and
fails if any row, either total, or the surface list disagrees with the filesystem.

## The evidence constraint, which decides what CAN be audited here

**13 of the 14 reference-capture roots are absent from this checkout.** They are gitignored by
design, and `gate/evidence-bound-tests.mjs` records why: the captures are dumps of a LIVE room
carrying real names, addresses, gravatar hashes and in at least one case a live JWT, and this
repository is public. Consequently **42 evidence-bound test files are excluded from every run here**,
and the suite prints that on every invocation rather than implying full coverage.

Missing: `docs/source`, `second-dump`, `new-evidence`, `alert-section`, `app-message-modal`,
`app-modals`, `app-room`, `app-session`, `navbar-section`, `toast-container`, `preview`, `emojis`,
`modal`. Present: `css`.

So the only reference evidence readable in this checkout is the **v4 bundle**, and all three
artifacts were verified against `sha256sums.txt` at 2026-08-29 01:26 UTC — `OK`, `OK`, `OK`:

| artifact | bytes |
| --- | ---: |
| `apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js` | 2,891,205 |
| `apps/room/docs/source-v4-2026-08-15/styles.ee2a710065b60389.css` | 444,793 |
| `apps/room/docs/source-v4-2026-08-15/deployed-index.html` | 16,094 |

That bundle settles **what the reference contains** — a class name, a handler, a literal, a default,
an ordering — and it settles ABSENCE with a control, which is how `setting-option` and `toggle-row`
were shown on 2026-08-29 to be ours alone (0 hits each, against 54 for `form-check-input`). It
cannot settle **rendered geometry**: computed layout, spacing, and which of two layouts a given
state produces live in the DOM captures, and those are not here. A surface gap that turns on
measured pixels is therefore *not auditable in this checkout*, and must say so rather than be
guessed.

## The inventory — all 86 surfaces, measured

| # | surface | lines | audited against the reference? |
|---:|---|---:|---|
| 1 | `lib/components/ModalHost.svelte` | 6,854 | no |
| 2 | `routes/+page.svelte` | 1,837 | no |
| 3 | `lib/components/notes/NoteEditor.svelte` | 1,622 | no |
| 4 | `lib/components/AlertChatArea.svelte` | 1,532 | no |
| 5 | `lib/components/RoomMessage.svelte` | 1,254 | no |
| 6 | `lib/components/RoomNavbar.svelte` | 1,171 | §NAV — 11 rows against `U4e` read whole: 4 built, 1 fixed, 3 measured refusals, 1 deliberate divergence, 2 blocked. `docs/decoded/room-surface-audit-2026-08-30.md`. |
| 7 | `lib/components/PresentationArea.svelte` | 1,105 | §MTS — feeds `canEditNotes` to the tab strip (`MTS-02`). |
| 8 | `lib/components/RoomOverlays.svelte` | 1,183 | `## RoomOverlays.svelte` in the v4 register — 7 gaps, read 2026-08-31. |
| 9 | `lib/components/notes/CarouselDialog.svelte` | 946 | `## CarouselDialog.svelte` in the v4 register — 8 rows. |
| 10 | `lib/components/EmojiPicker.svelte` | 858 | `## EmojiPicker.svelte` in the v4 register — Seven rows, read end to end on 2026-08-31 against |
| 11 | `lib/components/PollPanel.svelte` | 883 | `poll-panel-v4-contract.test.ts` — read end to end 2026-08-31 against `app-poll-modal` (selector at byte 2,112,472), all 53 consts decoded BY VALUE and swept against `PollPanel` + `PollSavedList`. ZERO gaps; one recorded divergence (the loader's `../../assets/` path). The finding is the `app-poll-modal` ANCESTOR: all 17 style rules are scoped to it in the generated sheet, so deleting the wrapper unstyles the panel with nothing else noticing. |
| 12 | `lib/components/RoomSidebar.svelte` | 887 | `roster-identity-contract.test.ts` — read end to end 2026-08-31 against `app-room-roster` (byte 2,038,159), all 24 consts decoded BY VALUE. Twenty built; the four absent are `RS-03`/`RS-04`, blocked on a server-side supply. Three CITATIONS were wrong (`C2e`→`E2e`, `u2e`→`g2e`, and a bundle this repo does not hold) and the `{#each}` key's equivalence to upstream's `userXrefID` was unrecorded. |
| 13 | `routes/session/+page.svelte` | 701 | §17.8 — 18 divergences, 11 gaps, 6 defects. **Audited at 659 lines; it is now 701.** Changed twice since (`3b4f3c5`, `b73c337`), so the audit covers a superseded revision. |
| 14 | `lib/components/ScreenPane.svelte` | 671 | `## ScreenPane.svelte` in the v4 register — Seven rows, read end to end on 2026-08-31 against the same pinned bundle, with |
| 15 | `lib/components/PostAlertModal.svelte` | 656 | no |
| 16 | `lib/components/ExtraChatPane.svelte` | 761 | §XCP — 9 rows against `app-extra-chat` read whole: 3 built, 3 fixed, 1 measured refusal, 2 blocked. `docs/decoded/room-surface-audit-2026-08-30.md`. |
| 17 | `lib/components/day-trade-alerts/DayTradeAlertsPane.svelte` | 638 | `## DayTradeAlertsPane.svelte` in the v4 register — **5 rows. |
| 18 | `lib/components/StreamingView.svelte` | 688 | `## StreamingView.svelte` in the v4 register — **10 rows, from one end-to-end reading of class `xCe` — bytes 1,901,122 to 1,914,468 of the pinned |
| 19 | `lib/components/FilesPane.svelte` | 585 | no |
| 20 | `lib/components/swing-alerts/SwingAlertsPane.svelte` | 589 | `## SwingAlertsPane.svelte` in the v4 register — **6 rows. |
| 21 | `lib/components/notes/NotesPane.svelte` | 524 | `## NotesPane.svelte` in the v4 register — 4 rows, read against `zSe` (byte 1,930,173) — the notes pane inside `app-presentationarea` — and its |
| 22 | `lib/components/PrivateChatPanel.svelte` | 524 | `private-chat-panel-v4-contract.test.ts` — read end to end 2026-08-31 against `app-privchat` (byte 2,214,520), all 79 consts decoded BY VALUE and swept app-wide. 75 values ship; the 4 absent are Angular template REFS the reference itself never reads, by name or through `It(n)`. All seven update-block gates built. |
| 23 | `lib/components/VideoPlayer.svelte` | 411 | `## VideoPlayer.svelte` in the v4 register — Read end to end on 2026-08-31 against the v4 bundle: the class methods at bytes 1,979,590–1,981,860, |
| 24 | `lib/components/AlertQaModal.svelte` | 407 | §19.4, §19.3 — 10 items, 6 defects, 1 false comment, against the reference's 159-line `<app-alert-qa-modal>`. Plus §QAM, 13 rows from a whole re-read on 2026-08-31: 4 built, 2 fixed, 1 already built, 1 measured refusal, 4 blocked. |
| 25 | `lib/components/MainTabStrip.svelte` | 398 | `## MainTabStrip.svelte` in the v4 register — 7 gaps, read 2026-08-31 against `app-presentationarea` — selector block at byte 1,994,350, consts |
| 26 | `lib/components/day-trade-alerts/DayTradeAlertForm.svelte` | 360 | `room-surface-audit-2026-08-30.md` §DayTradeAlertForm — 5 rows (`DTF-01` … `DTF-05`) against `Ewe`, bundle byte 1,940,236, read end to end 2026-08-31 with all fourteen sub-templates and the component's consts table walked BY VALUE. 1 BUILT, 1 FIXED, 1 ALREADY BUILT, 2 MEASURED REFUSAL; gated by `trade-alert-form-contract.test.ts`. |
| 27 | `lib/components/ScreenTabs.svelte` | 341 | no |
| 28 | `lib/components/AvDevicePane.svelte` | 338 | `## AvDevicePane.svelte` in the v4 register — Read end to end on 2026-08-31 against the v4 bundle: `loadDevices` at bytes 2,162,037–2,165,010, |
| 29 | `lib/components/swing-alerts/SwingAlertForm.svelte` | 330 | `room-surface-audit-2026-08-30.md` §SwingAlertForm — 5 rows (`SWF-01` … `SWF-05`) against `hwe`, bundle byte 1,933,979, read the same way and on the same date. The two forms are now asserted IDENTICAL once the day-trade half is renamed, so neither can drift alone. |
| 30 | `lib/components/ScheduledAlerts.svelte` | 319 | `## ScheduledAlerts.svelte` in the v4 register — Read end to end on 2026-08-31 against the v4 bundle. |
| 31 | `lib/components/PrivateChatComposer.svelte` | 357 | `## PrivateChatComposer.svelte` in the v4 register — Nine rows, read on 2026-08-31 against the pinned v4 bundle by bracket-walking `consts:[[` at byte |
| 32 | `lib/components/StreamTabs.svelte` | 304 | `## StreamTabs.svelte` in the v4 register — Six rows, appended 2026-08-31. |
| 33 | `lib/components/RoomShell.svelte` | 268 | `## components/RoomShell.svelte` in the v4 register — 6 rows (SHL-01…06), 4 of them citation defects of ours. Read end to end 2026-08-31. |
| 34 | `lib/components/MessageMenu.svelte` | 251 | §MSM — 6 rows against all four captured kebab menus: 1 fixed, 1 already built, 2 measured refusals, 2 deliberate divergences. `docs/decoded/room-surface-audit-2026-08-30.md`. |
| 35 | `lib/components/SpeechRecoOverlay.svelte` | 246 | `## SpeechRecoOverlay.svelte` in the v4 register — Five rows. |
| 36 | `lib/components/ScreenZoomControls.svelte` | 236 | `## ScreenZoomControls.svelte` in the v4 register — Four rows, appended 2026-08-31. |
| 37 | `lib/components/ScreenVolumeControl.svelte` | 227 | `## ScreenVolumeControl.svelte` in the v4 register — Four rows, appended 2026-08-31. |
| 38 | `lib/components/GiphyPicker.svelte` | 215 | `## GiphyPicker.svelte` in the v4 register — Six rows, from decoding all four Giphy templates in the bundle rather than the one the file's own |
| 39 | `lib/components/ScreenShareMenu.svelte` | 203 | `## ScreenShareMenu.svelte` in the v4 register — 4 rows (SSM-01…04) read end to end 2026-08-31. The whole dropdown had no focusable element; SSM-04 corrected all four byte offsets in its own entry table, each of which landed INSIDE the function it named. |
| 40 | `lib/components/NavbarSoundCloud.svelte` | 200 | §NAV — born 2026-08-31 out of `RoomNavbar`, carrying `NAV-02` and the presenter dropdown it belongs beside. |
| 41 | `lib/components/RichTextEditor.svelte` | 190 | `## components/RichTextEditor.svelte` in the v4 register — 6 rows (RTE-01…06) against `app-rich-text-editor`, read end to end 2026-08-31. |
| 42 | `lib/components/MessageBody.svelte` | 195 | `## components/MessageBody.svelte` in the v4 register — 7 rows (MSB-01…07) against `urlwrapImg` and `showChatGif`, read end to end 2026-08-31. |
| 43 | `lib/components/AlertQaAlertCard.svelte` | 244 | §QAM — born 2026-08-31 out of `AlertQaModal`, carrying `QAM-08` to `QAM-11`. The reference's own `e3e`. |
| 44 | `lib/components/FollowChatStylePane.svelte` | 152 | `## FollowChatStylePane.svelte` in the v4 register — 3 rows (FCS-01…03) read end to end 2026-08-31. FCS-01 is a real defect: `bind:value` on the Text Size number input writes `null` for an empty box, and `null + 1` is `1`, so clearing it and saving drew that person's username at 1px on every later message. |
| 45 | `lib/components/AlertQaComposer.svelte` | 223 | §QAM — born 2026-08-31 out of `AlertQaModal`, carrying `QAM-04` to `QAM-06`. |
| 46 | `lib/components/ScheduledAlertsTable.svelte` | 163 | no |
| 47 | `lib/components/Modal.svelte` | 188 | no |
| 48 | `lib/components/TabGearMenu.svelte` | 156 | no |
| 49 | `lib/components/AlertSendReportModal.svelte` | 161 | `## AlertSendReportModal.svelte` in the v4 register — 3 rows (ASR-01…03) read end to end 2026-08-31: 2 measured refusals, 1 blocked on a one-line change in `Modal.svelte` that this pass did not own. |
| 50 | `lib/components/notes/NoteTabContent.svelte` | 134 | `## notes/NoteTabContent.svelte` in the v4 register — 3 rows (NTC-01…03) read end to end 2026-08-31. NTC-01 removed an INVENTED value: `title="Welcome Mat"` occurs 0 times in the 2,891,205-byte bundle. |
| 51 | `lib/components/LogArchiveModals.svelte` | 206 | `## The archived-log viewer` — `chat-archive-log-contract.test.ts` + `room/chat-archive-log.svelte.test.ts`, read end to end 2026-08-31 against `jxe` (byte 2,309,873) and consts 17–37: the second view of `app-chat-logs-modal`, built. 3 divergences recorded (a duplicate `id`, the `btn-ligth` typo kept, the compact row standing in for `app-st-message`). |
| 52 | `lib/components/BootboxDialog.svelte` | 145 | no |
| 53 | `lib/components/SessionHistoryPane.svelte` | 145 | no |
| 54 | `lib/components/ChatArchivePane.svelte` | 169 | `## The archived-log viewer` — `chat-archive-log-contract.test.ts` + `room/chat-archive-log.svelte.test.ts`, read end to end 2026-08-31 against `jxe` (byte 2,309,873) and consts 17–37: the second view of `app-chat-logs-modal`, built. 3 divergences recorded (a duplicate `id`, the `btn-ligth` typo kept, the compact row standing in for `app-st-message`). |
| 55 | `lib/components/PresenterMuteRows.svelte` | 142 | no |
| 86 | `lib/components/ChatArchiveLogPane.svelte` | 227 | `## The archived-log viewer` — `chat-archive-log-contract.test.ts` + `room/chat-archive-log.svelte.test.ts`, read end to end 2026-08-31 against `jxe` (byte 2,309,873) and consts 17–37: the second view of `app-chat-logs-modal`, built. 3 divergences recorded (a duplicate `id`, the `btn-ligth` typo kept, the compact row standing in for `app-st-message`). |
| 56 | `lib/components/ChatSearchBar.svelte` | 373 | no |
| 57 | `lib/components/ViewerAlertPrefsPane.svelte` | 139 | no |
| 58 | `lib/components/AvatarOptionsMenu.svelte` | 133 | no |
| 59 | `lib/components/MobileRestorePane.svelte` | 130 | no |
| 60 | `lib/components/ImageUploadDialog.svelte` | 125 | no |
| 61 | `lib/components/WebcamStrip.svelte` | 124 | no |
| 62 | `lib/components/UserNotesPane.svelte` | 114 | no |
| 63 | `lib/components/RestreamPane.svelte` | 105 | no |
| 64 | `lib/components/ChatTabStrip.svelte` | 104 | no |
| 65 | `lib/components/CloseSessionPane.svelte` | 104 | no |
| 66 | `lib/components/ReactionPrefsPane.svelte` | 99 | no |
| 67 | `lib/components/ImageLightbox.svelte` | 116 | §ROV — `ROV-04`, the backdrop this dialog opened without. |
| 68 | `lib/components/NavbarRecIndicator.svelte` | 108 | §NAV — born 2026-08-31 out of `RoomNavbar`; the three REC badges, and where `breathing-rec` is not. |
| 69 | `lib/components/RoomBranding.svelte` | 91 | no |
| 70 | `lib/components/CompactMessageRow.svelte` | 77 | no |
| 71 | `lib/components/ImagePasteConfirm.svelte` | 76 | no |
| 72 | `lib/components/PositionsContainer.svelte` | 74 | no |
| 73 | `lib/components/ModeratorMessage.svelte` | 73 | no |
| 74 | `lib/components/GifConfirmDialog.svelte` | 64 | no |
| 75 | `lib/components/ToastHost.svelte` | 64 | no |
| 76 | `lib/components/YoutubePlayerOverlay.svelte` | 61 | no |
| 77 | `lib/components/PollSavedList.svelte` | 59 | no |
| 78 | `lib/components/NavbarTipButton.svelte` | 58 | §NAV — born 2026-08-31 out of `RoomNavbar`; RS-09 s navbar copy and its `noopener` refusal. |
| 79 | `lib/components/RemoteAudioSinks.svelte` | 50 | no |
| 80 | `lib/components/PositionsControls.svelte` | 44 | no |
| 81 | `routes/logout/+page.svelte` | 31 | no |
| 82 | `routes/+layout.svelte` | 27 | no |
| 83 | `lib/components/ScreenPaneStatus.svelte` | 111 | `## ScreenPane.svelte` in the v4 register — extracted from `ScreenPane.svelte` on 2026-08-31 so the three status headings could leave `.pan-element` and stop riding the global zoom (SP2-03); audited as part of that surface. |
| 84 | `lib/components/KickedPage.svelte` | 106 | `TODO.md` row 6's one residual, built 2026-08-31 — `app-kicked-page` decoded whole from byte 2,561,780, plus the five-way `IRe` page switch it is arm 2 of. `kicked-page-contract.test.ts`. |
| 85 | `lib/components/ReplyModal.svelte` | 217 | `reply-modal-v4-contract.test.ts` — born 2026-08-31 out of `ModalHost` when `RPL-01`…`RPL-03` put that file over its ceiling. Read end to end against `app-reply-modal` (byte 2,324,180); three defects found and fixed. |

**48 of 86 surfaces audited · 19,816 of 37,777 lines · 52.5%.**

> **A second, differently-shaped pass exists:** `docs/decoded/room-surface-audit-2026-08-30.md` reads
> **18 surfaces** against the pinned v4 bundle and records **223 verified gaps** plus 965 reference
> behaviours confirmed present. **It does not re-score the table above, deliberately.** That list is
> 82 FILES; the register's is 18 SURFACES, and the two partitions do not line up — four of its
> entries are slices of `ModalHost.svelte` alone. Marking rows audited from a differently-shaped list
> is how a coverage number stops meaning anything, so a register row only moves this table when a
> surface is read WHOLE against a file that is in it.
>
> **Two have now met that condition and only two.** On 2026-08-31 the register grew two sections of
> its own for `DayTradeAlertForm.svelte` and `SwingAlertForm.svelte` — one file, one reference
> component, no slicing on either side — so rows 26 and 27 carry a verdict and the count moved from
> 2 to 4. Its other eighteen surfaces still do not line up with this list and are still not scored
> here.
>
> Its own headline number to keep is the **19% false-claim rate**: of 274 differences claimed by the
> readers, 51 were refuted on verification — 32 already built here under another name, 19 resting on
> reference code that is dead or unreachable.

## The honest scoping statement

To make this file a complete build spec, **each unaudited surface needs the treatment the two
audited ones got**: read the reference counterpart end to end at verified boundaries, transcribe
every const by value, record every condition and handler, then measure ours and list what is
missing.

Two things have changed about that statement since it was written, and both narrow it:

1. **It is bounded by evidence, not only by effort.** With the DOM captures absent, a surface can be
   audited against the bundle's *logic and literals* and no further. Every gap recorded from here on
   names which of the two it rests on.
2. **Both audited rows are now partly stale**, because the audited files kept changing after the
   audit. An audit of a moving file needs the revision recorded beside it, which the rows above now
   do.

## 3. The per-surface audit is now a SWEEP, and it runs on every invocation

Added 2026-08-31 21:40 UTC.

The method in the paragraph above — *transcribe every const by value, then measure ours* — was
carried out by hand three times in a week (`PollPanel`, the roster, `PrivateChatPanel`) and found
something real each time. It is also the same twenty lines of work every time, and forty surfaces at
three a session is a fortnight of measuring the repository as it was on the day each run happened.

`apps/room/src/lib/reference-const-coverage-contract.test.ts` now performs it over **all 51
components the pinned v4 bundle declares**, on every run, and pins the answer. Three exclusions, each
derived from the bundle rather than hand-listed: Angular template reference variables (the leading
run of two-string entries), attribute and listener NAMES (by position inside the entry), and the 242
framework identifiers gathered from every `selectors:` and `inputs:` in the bundle.

**Measured on the day: 51 components, 33 fully covered, 146 values not present in this room.**

| group | components | what it is |
| --- | ---: | --- |
| not built at all | `app-session-transcript` (28) | the whole component — container, header, date picker, pagination, entries. **Named in no tracker row before this sweep** |
| out of scope by decision | `app-session-login` (32) | forgot/change password, the Gmail/Facebook/Gravatar avatar chooser, reCAPTCHA, supported-browsers. Account management lives on the CONTROLLER |
| Bootstrap's data API, replaced by state | `app-session-control-modal` (13), `app-user-info-modal` (10), `app-closed-session-page` (3), `app-note` (3) | every `#`-prefixed value is a `data-bs-target`. The pane it names is usually built; the SELECTOR has no counterpart |
| real gaps on built surfaces | `app-alert-send-report-modal` (15), `app-post-alert-modal` (7), the two log modals (6 each), `app-room` (6), `app-user-settings-modal` (5), `app-presentationarea` (5), `app-rec-preview` (2), `app-chat` + `app-extra-chat` (1 each), `app-screenshare-view` (2), `app-poll-modal` (1) | the work this sweep found |

### A residual is not the same thing as work, and the file measures the difference

The fourth group was first written as *"the work this sweep found"*. Checking that before saying it is
what corrected it. **Of the 146 residuals, 38 are already argued somewhere in this repository** — in a
docblock or a contract test — and the sweep rediscovered them rather than finding them. **108 are named
nowhere and have not been looked at by anyone.** That 108 is a FLOOR: the split is a substring search,
so a short generic value can be counted as examined by an incidental mention, which can only inflate
the examined side.

`app-room` is the clearest case and the strongest thing the sweep says about itself: **all six of its
residuals are recorded refusals, and none is a false alarm**, on the surface that has been read
hardest here.

- the Intercom help link is **`RNB-01`** — a control whose gate nothing can turn on. `hasSTHelpLink`
  occurs three times in the whole bundle and the only occurrence inside `app-room` sets it FALSE.
- `nolevelsImg` / `/assets/images/notalking.png` are **`G08`** in `RoomNavbar.svelte` — the idle
  waveform, refused because `presenterTalking` is a live audio-activity signal from a server this room
  does not have.
- `cssSoundCloudIcon` / `/assets/images/playing.gif` are argued in `NavbarSoundCloud.svelte` — the
  const carries `id` twice and Angular keeps the second, and the gif is not in this repository.

Two more residuals are **reference DEFECTS, correctly not transcribed**: five colour inputs carry
`value="followChatStyle.color"` as a STATIC attribute where a binding was meant, so they ship with the
literal text of an expression; and `data-ng-dblclick="fullScreen()"` on the webcam screen is an
AngularJS 1 attribute in an Angular 17 template that no runtime reads.

**The largest unexamined blocks are the ones to work next:** `app-session-transcript` (26 of 28),
`app-session-login` (29 of 32, and out of scope by decision), `app-session-control-modal` (11 of 13),
`app-alert-send-report-modal` (7 of 15), and the two log modals (6 of 6 each).

**The comment stripping in that file is load-bearing and its own case proves it on every run.** This
repository quotes the reference by value constantly, so a raw-text search reports **122** gaps where
the real number is **146**: twenty-four values were "covered" by nothing but a docblock quoting the
reference at them. Three negative controls were run — a covered value removed from our source, a
listed gap closed and left in the table, and the stripping itself disabled — and all three went red
for the stated reason.

---

# ⛔⛔ PHASE RULE — DOCUMENT ONLY. DO NOT BUILD. ⛔⛔

**Owner directive, 2026-08-16 13:15, and it governs every section of this file:**

> *"we're not building anything yet. and we wont until all the documentation is properly done and in
> details so it won't leave room for interpretation. Once it's down to 0 gaps based on hard evidence
> you can stop."*

**The deliverable of this phase is the DOCUMENT, not the code.** A gap is "closed" when it is
**written down completely enough that an implementer cannot guess wrong** — not when it renders.

**I violated this between 11:14 and 12:42** and it is recorded here rather than quietly dropped:
§16.13, §16.15, §16.16 and §16.17 each say "closed in code", and they changed
`routes/session/+page.svelte`, `routes/session/+page.server.ts`,
`lib/server/room-config-client.ts` and `lib/session-login-contract.test.ts`. **Those edits are
UNCOMMITTED and sitting in the working tree.** They are evidence-backed and tested (25/25,
`svelte-check` clean, negative controls seen red) — but they were built in the wrong phase, and the
owner decides whether they stay or are reverted. **Nothing further gets built.**

**What "closed" means from here on**, and every remaining item is measured against it:

1. the **verbatim** markup / payload / handler body, transcribed into this file;
2. **every const or field it depends on**, by value, not by index alone;
3. the **condition** that shows or hides it;
4. **what our source has today** (rule 6 — both halves);
5. any **asset, endpoint or setting it needs that we do not have**, named honestly;
6. any point where **the reference is wrong** (a11y, typos) flagged as an owner decision, not
   silently copied or silently fixed.

An item missing any of the six is **not closed**, however well it renders.

---

# ⏳ THE DUMPS ARE **NOT** BEING DELETED YET — that happens AFTER the implementation phases.

**Owner clarification, 2026-08-16:** *"we're not removing anything right now. That will only get
done after we finish the implementation phases."*

**Read this before the block below, because it changes what that block means.** The deletion is
real, but it is **downstream of implementation, not a deadline hanging over it.** Three consequences:

1. **Do NOT prioritise the reading queue by deletion risk.** §16.10's register (11 evidence dirs,
   37 `.less` files with no repo counterpart) stays true and stays useful — but it is a
   *pre-deletion checklist for later*, **not** a reason to read `account-page` before something that
   unblocks a phase. **Priority is implementation value.** Nothing is disappearing this week.
2. **Nothing gets copied into the repo yet.** §16.10's three tiers are a recommendation for the
   moment the owner decides to delete. Acting on them now would add ~585 KB to a git-tracked
   fintech repo to solve a problem that does not exist yet.
3. **The transcription already done was not wasted, and the discipline stands.** §16.8, §16.11 and
   §16.12 transcribe their evidence verbatim, which is worth having regardless — a value written
   into this file is one the next reader does not have to re-derive from a 3 MB capture. **Keep
   transcribing values rather than bare offsets**, because it is better documentation, not because
   the source is about to vanish. Offsets into git-tracked files (§16.7) are permanent either way.

---

# ⛔ WHEN THAT TIME COMES: WRITE VALUES, NOT LOCATIONS.

**Owner plan, 2026-08-16: *"as soon as we close all the gaps and implementation i will get rid of
every single node dump, file reference and everything else and then get a fresh pull to then audit
against ours. That will avoid conflicts and make errors easy to pick on if any."***

**That is the right plan, and it changes the standard for every line written from here on.**

| | |
|---|---|
| ❌ **not sufficient** | *"`restoreMobileAppTokens` at byte 2,444,920"* — the file it points into will not exist |
| ✅ **required** | the **verbatim string, value, class list, payload and gate**, transcribed into the doc itself |

**These documents must stand alone after every capture is deleted.** A byte offset is a *provenance
note* — keep it, it proves the claim was read rather than guessed — but **it can never be the only
record of a fact.** If a finding cannot be reconstructed from this file with the dumps gone, it is
not yet written down.

**Two consequences for the remaining work:**

1. **Anything currently held only as an offset must be transcribed before deletion.** Sweep for
   claims of the form "at byte N" with no accompanying quote.
2. **The fresh pull is the real audit.** It is a genuinely independent second observation — the
   strongest verification available, and better than re-reading the same dumps twice. **The twice-run
   audit the owner asked for should be: this corpus now, and the fresh pull after.** Any finding that
   disagrees between them is either a change in the reference or an error in us, and both are worth
   knowing.

**Same rule for `services/**` and the SHA-256-pinned capture directories** — those are governed
separately (`CLAUDE.md`) and are not part of the deletion.

---

# ⏭️ RESUME HERE — gap-closing loop, in progress. Owner instruction: do not stop until 0 gaps.

**Last worked 2026-08-16 10:18.** Read these IN THIS ORDER. Every one is on disk; none needs a fetch
or the owner. **Apply rule 6 to every item — check our source before recording anything as a gap.**

| # | artefact | lines / size | what it should close |
|---|---|---|---|
| **0a** | ⭐ **`apps/controller/evidence-dumps/TIER1-fetched/styles.css`** | **218,719 B / 11,347 lines** | **PTR's entire MANAGE stylesheet** (the Naut theme). §15.8's tokens all come from it. **Read: 1–2,657.** ⚠️ **IN THE REPO AND GIT-TRACKED** — byte-identical to `~/Desktop/new-room-control/css-modals/styes.css` (SHA `23bc4e02…`), so **line citations into it are permanent and the deletion banner does not apply** (§16.7). See §16 |
| **0b** | ⭐ **`apps/room/docs/source-v4-2026-08-15/styles.ee2a710065b60389.css`** | 444,793 B / 20 lines → **5,410 rules** | ⭐ **THE v4 ROOM CSS REFERENCE** — the build's own sheet, author values. Rule-split on `}` (`perl -pe 's/\}/}\n/g'`) and read the 5,410 lines. Never read. **§16.8 corrected this row** — it used to point at `css/complete-app-styles.css` |
| ~~0b-old~~ | ~~`apps/room/css/complete-app-styles.css`~~ | 688,687 B | ⛔ **NOT the v4 CSS — do not read it as such (§16.8).** It is a **2026-07-30 multi-sheet RUNTIME capture** (FontAwesome + animate + app), browser-serialized, **16 days before v4**, and our own `files-pane-contract.test.ts:268` proves it lacks `.st-fileSortBar`. Useful ONLY as the record of the third-party sheets |
| ~~0b′~~ | ~~shipped vs captured v4 sheet, 265-byte delta~~ | ✅ **CLOSED — §16.8** | The delta is **`@charset "UTF-8";` (17 B) + the three Files-sort-bar rules (248 B) = 265**, exhaustively. Not a defect: the reference **grew the feature between captures**, and it is already built and contract-tested here |
| ~~0b″~~ | ~~`apps/room/src/lib/styles/captured-runtime-components.css`~~ | ✅ **CLOSED — §16.9** | **GENERATED** from `complete-app-styles.css` (source SHA `d1829b30…` in its own header) by `pnpm css:sync-captured` ⇒ it inherits the **2026-07-30, pre-v4, browser-serialized** provenance. Not a completeness check. **By-product: a 26-component census of the v4 room** from its `:is(…)` cascade guard |
| **0c** | ⚠️ **`~/Desktop/new-room-control/css-modals/`** — **37 `.less` + `bootstrap.css` + `bottstrap-min.css`** | ~517 KB | **Bootstrap 3 SOURCE.** Carries the LESS **variables** compiled CSS cannot — the definitive "custom vs stock" oracle. ⛔ **`find` returns ZERO `.less` files in the repo: these are AT DELETION RISK and exist nowhere else (§16.10).** Highest-priority copy-in candidate |
| **0d** | ⚠️ **11 evidence dirs in `~/Desktop/new-room` with no repo counterpart** | 22 files / ~121 MB | **§16.10 is the register.** Small + PII-free: `more-fucking-evidence` (16 K, cited by name in the global `~/CLAUDE.md`), `q&a`, `stylesheet`, `modal`, `start-up`. Unread: `account-page` (1.0 M — *"the one surface never read"*), `must-match`, `mising`, `gap-dump`. ⛔ **Never copy** `enterprise` (31 M) / `NEXT-STEP` (88 M) — live JWTs + PII |
| ~~1~~ | ~~`docs/decoded/control-plane-capture.md`~~ | ✅ **READ IN FULL — 1,243/1,243 — §15.1–§15.12** | Closed `admin-surface.md` **§G-1**; specified the whole Account page; 8 collector defects logged. **P-3 not closed** — the verdict is scoped to one build/account/moment and a separate operator subdomain was never probed |
| 2 | `docs/decoded/admin-surface.md` | 1,035 | **P-3** — the admin surface; §15 supersedes its §D |
| 3 | `docs/decoded/gaps-closed.md` | **lines 330–991** (1–330 read, §12.1) | rest of the cross-spec pass |
| 4 | `apps/room/docs/website-ptr1-prt2-full-read.md` | 1,180 | ptr1+prt2 (already decoded — read the write-up, **not** the 33 MB) |
| 5 | `docs/decoded/mobile-app-decoded.md` | **lines 590–758** (1–590 read, §14) | its §3 cross-check tail + §5 |
| 6 | `~/Downloads/ptr-manage-dom.html` | **line 168 only** (106 KB, the rendered `<body>`) | the **33 unaudited components**. `sed -n '168p' … \| fold -w 110`, then Read in ~350-line slices |
| 7 | `docs/decoded/` remainder | `alert-scheduler-filter-labels.md`, `day-trade-alerts.md`, `swing-alerts.md`, `recordings.md`, `files-sort-bar.md`, `benzinga.md`, `admin-surface.md` | per-feature specs |
| 8 | 5 room-bundle lookups | — | listed in §14.7's last row |

**Then run the audit twice**, per the owner: re-verify every gap claim in **both** directions
(present in reference / absent from our source), and diff the second pass against the first.

⚠️ **ORDERING, per the 2026-08-16 clarification at the top of this file.** The queue above is
ordered by *what unblocks implementation*, not by what is at risk of deletion — deletion happens
after the implementation phases, so `account-page` and the 37 `.less` sources are not urgent merely
for being uncopied. **The fresh pull is still the second audit**, and it still comes last.

**Do NOT re-read:** `app.min.js` (§6, all 17 lines), `evidence-page.manageSession.html` (§8, all
2,718), `api-post-routes.md` (§13, all 729), `missing-commands-triage.md` (§11/§12),
`enterprise-and-control-plane.md` + `stripe-details-*.json` (§7), `ptr1.json`/`prt2.json` (already
decoded — see #4).

**Four independent instances of the same failure are recorded in this file** (§10, §11.2, §12.3,
§14.7). **The rule that prevents it is BRIEF rule 6.** Read it before writing anything down.

**Why this file is not `TODO.md`.** Owner instruction, 2026-08-16: a concurrent session is running
the `+page.svelte` decomposition and edits `TODO.md` continuously, so two sessions writing one file
is how a merge conflict silently eats a finding. **Everything about the room audit and the five new
requirements lives here.** `TODO.md` carries a pointer to this file and nothing else about them.

Companion document: `docs/reference/room-component-gap-register.md` — the evidence register, with
the `R-*` reference gaps and `P-*` owner requirements written out in full with citations. **This file
is the queue; that file is the evidence.** Do not record a status in both.

> 🛑 **READ §11 BEFORE ADDING ANYTHING TO THIS FILE.** A prior decode corpus of **6,600+ lines**
> already exists — `apps/room/docs/website-ptr1-prt2-full-read.md` (ptr1+prt2 read end to end),
> `docs/decoded/missing-commands-triage.md` (**the authoritative 30-item NOT-BUILT list**, with
> payloads, byte offsets and verbatim strings), `gaps-closed.md`, `admin-surface.md`,
> `control-plane-capture.md`, `mobile-app-decoded.md` and six more. **This session duplicated part of
> it before noticing.** §11 lists exactly what was duplicated and what is genuinely new.
>
> **Scope line, so this does not happen again:**
> **the prior corpus owns the v4 ROOM bundle and the site captures.
> THIS file owns the AngularJS MANAGE app (`app.min.js`) and `evidence-page.manageSession.html`.**

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
6b. **⭐ A ZERO FROM A RENDERED CAPTURE IS A STATEMENT ABOUT STATE, NOT EXISTENCE.** *Owner
   instruction 2026-08-16: "sometimes it may show 0 but its not because it doesn't exist, because
   there was a member or an extra admin added."* **A count of 0 is only evidence when the
   precondition that would produce a row is known to have been met.** State the precondition or the
   zero says nothing. *Earned: I recorded `adminUserRemove` count 0 as an unknown when
   `removeAdminUser` is demonstrably in `app.min.js` with its confirm string and payload — the
   account simply had no extra admin users to render a row for.* See §15.8.
6c. **⭐ AUDIT OUR IMPLEMENTATION AS YOU READ, NOT AFTER.** *Owner instruction 2026-08-16.* Every
   reference control gets checked against `apps/controller/src` and `apps/room/src` **in the same
   pass that decodes it**. *Earned: §15.8's eleven Account-page controls read as a gap list until
   audited — **all eleven are already built**, one of them (`listAdminUsers`) under another name.*
6d. **⭐ THE CORPUS IS v4.** Owner instruction, restated 2026-08-16. `main.d1d09071be31f1ba.js` and
   the v4 room. `app.min.js` is the **manage** app and is in scope as the manage surface; the older
   `main.d6d3c112b59b7d0d.js` is for diffing only (§1). **Never take a v3-era behaviour as current
   without checking it against v4.**
6. **⭐ NOTHING IS MISSING WITHOUT A CHECK.** A gap is *present in the reference* **AND** *absent from
   our source* — **both halves need hard evidence.** Before writing anything down as a gap or a
   finding, grep our own tree for it. *Owner instruction 2026-08-16, and it caught a live failure:
   I wrote up the entire v4 critical-CSS token contract as new evidence when it was already sitting
   in `lib/styles/tokens.css` (323 lines) and `captured-runtime-components.css`, with contract tests
   over parts of it. See the red block at the head of §10.* Rule 5 says nothing exists without a
   consumer; this is its mirror.
   ```
   grep -rl '<thing>' apps/room/src apps/controller/src
   ls apps/room/src/lib/styles/        # prior CSS harvests live here
   ls apps/controller/evidence-*       # prior capture dumps live here
   ```

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
- **P-1's root cause — EXHAUSTIVE, not sampled.** The push decision chain has **eight gates** and
  **not one reads subscription state** (§8.2). The entitlement data *exists* on the member row —
  `stripeSubscriptionStatus`, `stripeCurrentPeriodEnd`, `stripeCancelAt` (§6.12) — and nothing
  consumes it. The only automatic stop is `mobileAppExpireNotificationsDays` decay, default **14**.
  **P-1 is a wiring problem, not a data problem**, and `updateUserFCMTok` + `tokcmd:'unsub'` is the
  lever. §3, §6.1, §6.12, §8.2.
- **Transport:** `wss://chat.protradingroom.com/ptr_app/ptr_asyngular/` (asyngular) for the v4 room;
  the legacy app is **SockJS with a `{type,data}` envelope** — different wire, same command names.
  §3a, §6.3.
- **EIGHT alert-delivery channels, not three:** room pane · FCM push · Twilio SMS · Protexting SMS ·
  email · Twitter/X · **linked rooms** (six settings, bidirectional) · **an arbitrary external
  webhook** (`customClientAlertPostURL`). Plus browser Web Notifications on the desktop side.
  §3b, §6.9, §6.10, §8.2, §8.3.
- **The web client does no push at all** — `serviceWorkers: []`, `globals.fcmToken` a dead stub in
  both bundles. Its notifications are the **browser Notification API**, a separate channel. §6.9.
- **`tokcmd` and `appcmd` are settled from markup:** `pause|resume|unsub` and `enable|disable`. §8.1.
- **`useV3/V4/V5` is answered:** a room is served whichever JS bundle PTR assigns it —
  `altCodeAppJS`, `altCodeVendorJS`, `customJanus`, `alt_roomjs`. §8.8.

## Still unproven — say so, do not fill in

- **The reference SERVER.** Uncaptured entirely. Blocks: which of the eight gates it evaluates and in
  what order; what the empty `restoreMobileAppTokens` ack means; whether a push actually lands on a
  phone; what `sendFcmAlertsNew` switches to; whether `closeRoomAndRevoke` writes `invalidTokens`.
  **One artefact could answer most of it — `/public/html/POST_ROUTE_API_DOCUMENTATION.md`, §8.7.**
- `app-presentationarea`'s +299 bytes.
- The Marketplace pane's markup, and the `perms` vocabulary for `/users/v1/adminusers`.
- `updateUserXref` code **12** — unobserved in either menu (§7.2). A gap, not a guess.

---

# 0. ✅ DONE — `app.min.js` arrived, was read in full, and every question it posed is answered

**Closed 2026-08-16.** This section used to be a "when it arrives, do this" checklist. It arrived
(455,329 B, 07:51), **all 17 lines were read in order** (§6.1–§6.15), and the manage page's markup was
read alongside it (§8). Kept as a record of what was asked and what came back, because the answers
are the P-1 design inputs.

| the question §0 asked | answer | where |
|---|---|---|
| the six push actions' endpoints, payloads and responses | **one endpoint, `/users/v1/sessions`**; full table | §6.1 |
| is any of them keyed on entitlement, or only on `lastLogin`? | **Neither, and exhaustively so — eight gates, none entitlement** | §8.2 |
| the three `ptrMobileAppCaseByCaseEnabled` branches | *"App for Some Members?"* → `manageMobileApp` `enable`/`disable` + `user.hasMobileApp` | §8.1, §8.4 |
| what `customMobileAppLaunchWord` does | the **custom URL scheme** for a white-labelled app | §6.9 |
| what `customMobileAppV3Name` does | *"Custom app String"* | §8.4 |
| what `sendFcmAlertsNew` switches between | *"Use pub/sub for notifications"* — **the design risk §0 named is REAL**; if it means FCM topics, per-member revocation is structurally impossible. Server behaviour still uncaptured | §8.4 |
| is `invalidTokens` enforced anywhere? | it is a **manual comma-separated text field**; nothing in any client writes it. Enforcement is server-side and uncaptured | §8.4 |
| anything about `restoreMobileAppTokens` server-side | **nothing** — 0 occurrences in the manage bundle. §3a's empty ack remains the only observation anywhere | §6.1 |

**The two process rules in the original §0 both earned their place and still apply to the next
artefact:**

1. **READ it, do not grep it.** Read in slices end to end, including regions that look irrelevant.
   Every P-1 finding in §6 was two or three tokens away from a function already known, inside the same
   statement — no search for a name already held would have returned any of them.
2. **Write each slice's findings down before starting the next.** That is why §6.1–§6.5 survived a
   context exhaustion intact, and why six wrong claims in this document were caught rather than
   shipped.

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

> ⚠ **This section is correct but SUPERSEDED. Read §8.2 before acting on it.** Written when
> `mobileAppExpireNotificationsDays` was the only push gate known. There are **eight**, none of them
> entitlement (§8.2), and the subscription data exists on the member row unused (§6.12). The decay
> below is still the only *automatic* stop — that part holds — but it is one gate of eight, not the
> whole mechanism. Kept because the settings evidence here is first-hand and still cited.

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
| **1** | **0–48** | **READ — §6.7** — the build stamp, `__appDate = 8/7/2026, 5:14:43 PM` |
| **2** | **49–32,063** | **READ WHOLE — §6.7** — bootstrap + dead theme + `HeaderNavController`. **P-5 answered** |
| **3** | **32,064–64,095** | **READ WHOLE — §6.8** — `ChatCtrl`: chat rendering, paging, imgur upload |
| **4** | **64,096–96,119** | **READ WHOLE — §6.9** — layouts, themes, notifications, **the mobile deep link** |
| **5** | **96,120–128,135** | **READ WHOLE — §6.10** — ⭐ **the alert composer, two mobile apps, session control. P-1's core** |
| **6** | **128,136–160,141** | **READ WHOLE — §6.11** — video player, private chat, YouTube; `LoginCtrl` opens |
| **7** | **160,142–192,172** | **READ WHOLE — §6.12** — ⭐ **`LoginCtrl`: Stripe, marketplace, auth modes. P-1's answer** |
| **8** | **192,173–224,204** | **READ WHOLE — §6.13** — user lists, badges, API keys, **admin users**, `saveSessField` |
| **9** | **224,205–256,236** | **READ WHOLE — §6.1** — user administration; the P-1 contract |
| **10** | **256,237–288,256** | **READ WHOLE — §6.2** — `SideBarCtrl` + `UserInfoCtrl`; most of P-2 |
| **11** | **288,257–320,269** | **READ WHOLE — §6.3** — `PollCtrl`, `FilesCtrl`, `appVars`, `chatModel`. Corrects §6.1 and §6.2 |
| **12** | **320,270–352,407** | **READ WHOLE — §6.4** — the complete inbound command switch (~100 cases). P-5 and R-1 answered |
| **13** | **352,408–384,420** | **READ WHOLE — §6.5** — `chatModel` outbound + Janus `webRTCService`. R-14 settled |
| **14** | **384,421–416,427** | **READ WHOLE — §6.6** — Janus videoroom + audiobridge. No P-relevance |
| **15–17** | **416,428–455,328** | **READ WHOLE — §6.14** — stream subscriber, cam service, **routes, source map** |

### ✅ READING COMPLETE — all 17 lines, in order. Summary in §6.15.

**This file is finished. Do not re-read it.** Fourteen slices are written up as §6.1–§6.14, each with
its byte range, and §6.15 states what the bundle answered and what it structurally cannot.

The recipe is left here because the same technique applies to the next big artefact:
`sed -n '<N>p' <file> | fold -w 110 > /tmp/slice-L<N>.txt`, then **read** the slice — ~292 wrapped
lines, comfortably readable. **Write each slice's findings into the document before starting the
next one.** That practice is why §6.1–§6.5 survived a context exhaustion intact and why the six
corrections in §6 were caught rather than shipped.

> ⚠ **A mistake this log made, kept as a warning.** For five sections this table told the next agent
> *"by elimination the FCM settings must be in lines 2–8."* They were never in the file at all — the
> pull script's census records only non-zero probes, and those names had been absent from it from the
> first minute. **A count of zero and an absence of evidence look identical in a census, and I read
> one as the other.** §6.13 has the correction and the real location.

---

## 6.1 Line 9 — the user-administration controller, and the whole P-1 contract

### The P-1 SERVER CONTRACT — all six push actions, complete

**One endpoint for every one of them:** `$http.post(appVars.globals.APIURL + "/users/v1/sessions", args)`.
Every call is guarded by `var args = $scope.makeReqTokenForCmd("<cmd>"); args && …` — **a falsy return
aborts the call silently.**

> ✅ **ANSWERED in §6.12 (line 7).** These functions live in **`LoginCtrl`**, which is also the
> controller for `page.manageSession`, and its definition is:
> ```js
> $scope.makeReqTokenForCmd = function(cmd){ var tok = $localstorage.get("tokenSite"), args = {};
>   return args.token = tok, args.cmd = cmd, args.source = "webApp", args }
> ```
> **So the auth is `{token: localStorage["<roomID>.tokenSite"], cmd, source: "webApp"}`** — the site
> JWT, room-namespaced (§6.3). And like the other four definitions **it can never return falsy**, so
> every `args && …` guard in this section is dead code that has never once prevented a call. The
> real authorisation is entirely server-side, which is correct, but do not port the guard as if it
> did something.

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

## 6.2 Line 10 — `SideBarCtrl` and `UserInfoCtrl`. **This is where P-2 already exists.**

Bytes 256,237–288,256. Two whole controllers: the sidebar (roster rendering, streaming, invites) and
the user-info modal (every per-member moderation action). It answers more of P-2 than P-1.

### P-2 — the reference ALREADY detects and kills shared accounts. Manually.

**Three pieces, all in this slice, none of them previously in the register:**

1. **`user.isM` — a per-roster-user MOBILE FLAG.** Counted into `monbileCount` on `getRoster`,
   incremented on `userJoin`, decremented on `userLeft` (floored at 0), and rendered into
   `#mobileCountSide`. **So the roster payload already distinguishes a mobile connection from a
   desktop one, per user, live.** P-2's "one computer and one mobile device" needs exactly this
   signal and it exists at the wire today.
2. **`$scope.kickDuplicates()` — the reference's answer to account sharing, and it is a button an
   admin presses.** It reads the target's `email` off the roster, walks **every** roster key, and
   sends `kickUser {uuid_to_kick, customMsg}` for every user with the same email and a different
   uid. Prompt title: `"Kick all other duplucates of <nick> with the following message:"` — the
   misspelling is the reference's.
3. **The roster's `user.email` is an MD5 HASH, not an address.** Proven twice in this slice:
   `doSearchReal` does `var ehash = md5(searchText.trim().toLowerCase())` and then compares
   `user.email == ehash`; and the avatar is
   `https://secure.gravatar.com/avatar/<user.email>?d=mm`, which is Gravatar's md5-of-email URL.
   **The plaintext address only arrives from the `getUserInfo` reply, as `data.email`.**

**So P-2 is not a green field.** The reference has the detection signal (`isM`), the identity key
(the email hash, stable across rooms) and a manual remedy (`kickDuplicates`). What it does not have
is enforcement — nothing prevents the second desktop, it only lets an admin notice and swat it.
**That is the gap to build, and it should reuse the email-hash identity rather than inventing one.**

### The mobile pairing flow, complete

- `chatModel.send("getUserInfo", uid)` → reply `userInfoResp` carries
  `{email, inTime, mobilePin, ip, phone, browser}`.
- **`copyMobileCreds()` builds the pairing string verbatim:**
  `"Room ID: " + chatModel.roomID + "\n\rPin Code: " + $scope.user.mobilePin` — copied to clipboard
  via a hidden `#userInfoCP` textarea and `document.execCommand("Copy")`.
- **So a member pairs the phone with `roomID` + `mobilePin`.** That is the same PIN `getAppPin`
  returns on the manage page (§6.1) and the same `pin` the login endpoint accepts (§6.1). Three
  sightings, one credential.
- **`chatModel.hidePersDetails` gates the whole thing** — when set, `getUserInfo` is never even sent,
  so email/IP/pin are unavailable to the presenter at all. A real privacy switch, honoured client-side.
- `$scope.hasPTRApp = appVars.sessData.ptrMobileAppEnabled || appVars.sessData.customMobileAppEnabled`
  — **two room settings ORed**; and `$scope.$on("setPairCode")` flips it true at runtime, so pairing
  can begin without a reload.
- **`doMobileAppDialog()` broadcasts `"doMobileAppPop"`** — this is the trigger for the Mobile App
  modal. Relevant to **R-15**: the troubleshooter's Mobile App tab and this popup may be the same
  content reached two ways; check before building either.

### `makeReqTokenForCmd`, as defined in `SideBarCtrl`

```js
$scope.makeReqTokenForCmd = function(cmd, tok){
  var args = {}; return args.token = tok, args.cmd = cmd, args.source = "webApp", args }
```

**Two arguments, and it cannot return falsy.** Callers here pass `chatModel.jwtToken` as `tok`. The
manage controller (§6.1) calls it with one argument and then guards on the result, so **there are two
different definitions of this function in this bundle and only one has been read.** Corrected in §6.1.

### The roster row — every field the wire carries, and what renders it

| field | rendering |
|---|---|
| `nick` | the link text; `data-uname` on the `<li>` |
| `email` | **md5** → gravatar `thumb40` avatar; suppressed to a `fa fa-user` icon when `hideAvatars` |
| `tagline` | `<small class="text-muted user-info-block">` |
| `ui` | **base64 JSON `{city, region_code, country_code}`** → `"City, RC, CC"`. **Decoded only for `isPresenter \|\| isTempPres`** — a real privacy boundary, and `hideAvatars` suppresses it too |
| `ft` | `<span class="label label-danger">Trial</span>`, **presenter-only** |
| `ut` | `<span class="label label-warning">` + the value, presenter-only and hidden when `hideAvatars` |
| `badges[]` | ids into `appVars.sessData.badgesH` → `<span class="label" style="background-color:<b.bkcolor>; color:<b.color>">b.text</span>`. Gated on `enableBadges`, and on `!showBadgesToPresentersOnly \|\| isPresenter` |
| `years` | `<img class="chatStars" src="/public/images/<years>.png">` — a tenure badge, **regular roster only** |
| `uid` | `<li id="uRosterLi_<uid>">`, presenters `id="pRosterLi_<uid>"` |
| `isM` | not rendered per-row — **counted** into the mobile total |
| `perms` | `"r"` routes to the user roster, anything else to the presenter roster |

- **`maxRosterLen = 500`, cut to `250`** on edge / idevice / msie / msEdge / badEdge. Over that, joins
  are dropped from the DOM unless they match the active search.
- Clicking a row: **if the click target is an `A`, it mentions; otherwise it opens user info.**
- A new private message adds `animated flash chatHighighted infinite` to the row (`chatHighighted`
  is the reference's spelling); `clearPrivMsg` removes it.
- Screenshare stats render into `#pScreen_<uid>` from a `getScreenSharingStats` payload of
  `{uid: {screenWatchers}}`, polled by `chatModel.startScreenStatTimer()`, gated on the room's
  `doScreenshareStats` **and** a presenter-side `enableScreenStats` toggle.

### ⚠ `simUserCount` — the reference inflates the displayed user count on purpose

```js
appVars.sessData.simUserCount && ($scope.simUserCount = parseInt(...),  // clamped to 0..5000
  recalcUserCount(),
  chatModel.isPresenter() || ($scope.showRoster = !1, $scope.showRosterCount = !0))
```

`recalcUserCount` renders `chatModel.userCount + $scope.simUserCount`. **And when it is set,
non-presenters have the roster itself switched off and only the count left on** — so members can see
an inflated number but cannot see the list that would contradict it.

**This repository's first rule is honest data.** Do not port this. If the owner wants it, it is a
product decision that has to be made deliberately and named as such — it is recorded here because it
is in the reference, not because it should be built.

### Permission vocabulary — from `readablePerms()`, verbatim

| `user.perms` | label shown |
|---|---|
| `"o"` or `"a"` | Presenter |
| `"v"` | Regular Participant |
| `"l"` | Limited Participant |

`makeTempPresenter(perms)` sends `"a"` (Presenter/Admin — *"see the roster, view user info, open/close
the room, as well as present"*) or `"p"` (*"share screens and talk on the mic"*). The broadcast
`makeTempPresOn` carries `"p"` → temp presenter, `"a"` → full presenter, `"r"` → demote.

> **Reference bug, do not reproduce:** `makeTempPresenter`'s switch has **`case "p"` twice**. The
> second one — *"a regular user with no presenter controls?"* — is unreachable dead code; it was
> meant to be `case "r"`. Anyone porting this switch will "fix" it into existence unless warned.

### Wire commands sent by these two controllers (`chatModel.send`)

`resetTypingIndicator` · `unbanUser {email}` · `removeFreeTrials` · `getWebcamPresenters` ·
`getUserInfo <uid>` · `getRLog <uid>` · `restartUserAudio <uid>` · `kickUserReload <uid>` ·
`kickUser {uuid_to_kick, customMsg}` · `kickAndBanUser {uuid_to_kick, customMsg}` ·
`muteChatUser24 {uuid_to_kick, customMsg, hrs}` · `changeNick {uid, newNick}` · `muteUser` ·
`muteCamUser` · `muteScreenUser` · `restartScreen` · `muteChatUser` · `unmuteChatUser` ·
`remoteStartRec <uid>` · `remoteStopRec <uid>` · `startOBSStream {ytKey, ytURL}` · `stopOBSStream` ·
`startYTStream <key>` · `stopYTStream` · `startFBStream <key>` · `stopFBStream`

**`unbanUser` branches on `appVars.sessData.authMode == "open"`** — open rooms email the user a link,
closed rooms just unban. First sighting of `authMode` having a named value.

### Streaming, archives, invites

- **OBS/XSplit:** RTMP URL is `rtmp://<sessData.media_server>/live` and the stream key is
  **`<pubSessionData._id> + "-" + <user.email>`**. The dialog also takes an optional YouTube key +
  URL to restream simultaneously. YT and FB streaming both **require an active screenshare first**
  and refuse otherwise; OBS does not.
- **Archives open with the JWT in the URL path:**
  `/users/v1/archives/recordings/<sessData._id>/<jwtToken>` and `/users/v1/archives/<type>/<id>/<tok>`,
  via `window.open`. A token in a URL is logged by every proxy in the path — note it before copying
  the scheme.
- **Invites:** cmd `inviteUsers` with `{persons:[{cver, name, email, role, expiresInDays}], roomID,
  tokType:"session", inviteHost: location.origin, emailHost: location.hostname, sessionID}`. Default
  expiry **7 days**. (The success alert pluralises on `$scope.invite.persons > 1` — an array compared
  to a number, always false. Cosmetic reference bug.)

### Smaller facts worth not re-deriving

- **Two session objects exist:** `appVars.sessData` and `appVars.pubSessionData` (`hidePoweredBy` and
  the OBS key's `_id` come from the public one). Do not assume one shape.
- localStorage keys read here: `themeClass` (`"light"` check), `compactMode`, `sortOn`, `slowLinkOn`,
  `altLayoutMode`, `ytStreamKey`, `ytURL`, `fbStreamKey`, `customKickMsg`, `customMuteMsg`.
- Join beep is `$.playSound("app/sounds/ding")`, gated on `beepOnUserJoin && isPresenter &&
  alertUserJoinLeavesOn` — **presenter-only**, which is not obvious from the setting's name.
- `customUserInfoURL` + `encodeURIComponent(email)` — a per-room external CRM deep link on the user
  modal.
- A presenter loaded inside an iframe is prompted to break out into the top window.
- Other session settings first seen here: `alwaysShowRoster`, `hideAvatars`, `showRosterCount`,
  `showArchivesToUsers`, `hasYTStreaming`, `hasBenzingaNews`, `hasTypingIndicator`, `enableBadges`,
  `showBadgesToPresentersOnly`, `doScreenshareStats`, `beepOnUserJoin`, `isChatOnlyRoom`, `authMode`.

### What line 10 did NOT answer

Nothing on entitlement, subscription, `lastLogin`, `sendFcmAlertsNew`, `invalidTokens`, the SMS
channels, or the `appcmd` / `tokcmd` vocabularies. **Two of sixteen slices read; P-1's automatic-stop
question is still open and still consistent with §3's decay-only answer.**

---

## 6.3 Line 11 — `PollCtrl`, `FilesCtrl`, `appVars`, and **`chatModel`: the whole wire model**

Bytes 288,257–320,269. The most consequential slice so far. It **corrects two things written above**
and contains four security findings about the reference.

### 🔴 SECURITY — `appVars.globals` ships live production credentials to every browser

`appVars.globals` is an object literal in this bundle, served to anyone who loads the page. It
contains, **as plaintext string values**: the Verto/FreeSWITCH password, the TURN server username
**and** password, and a Giphy API key. Separately, `chatModel.audioRoomSecret` is a hardcoded
constant.

**The values are deliberately not transcribed into this file.** They are live secrets and this
document is inside a git repository; naming which keys are exposed is enough to act on, and copying
them here would move the leak rather than close it. They are in `~/Downloads/app.min.js`, line 11 of
17, in the `appVars` service — search that slice for `turnPW` when you need to see them.

**They should be rotated, and the rebuild must not put any of them in client code.** TURN
credentials belong behind a short-lived-credential endpoint; the media-server password belongs on the
server only. Recorded here as a finding about the reference, not a task — the owner decides.

Also in `globals`: `ver: "2.18.393"` (the client version, sent as `cver` on every login and invite),
`vertoHost`/`vertoURL` (m1, :8443), `janusHOST` (m5, :443), `hlsServerUrl`, `useHLS`, `audioQ: 7`,
`isM`, `audioDeviceID`/`videoDeviceID`.

### ⚠ CORRECTION to §6.1 — `APIURL` is the EMPTY STRING

```js
APIURL: (service.isMobile, "")
```

A comma operator whose result is `""`. So every `appVars.globals.APIURL + "/users/v1/sessions"` in
§6.1 and §6.2 is **a same-origin relative URL — `/users/v1/sessions`**, not an absolute one. The
`isMobile` operand is evaluated and discarded; presumably a mobile build once set it. Do not model an
API host from those call sites.

### ⚠ CORRECTION to §6.2 — every localStorage key is NAMESPACED BY ROOM

```js
.factory("$localstorage", … { var initKey = "";
  setInitKey: function(key){ initKey = key },
  set/put: function(key,value){ $window.localStorage[initKey + key] = value },
  get: function(key,defaultValue){ return $window.localStorage[initKey + key] || defaultValue }, … })
```

and `$localstorage.setInitKey(service.roomID + ".")` on login. **So the real key is
`<roomID>.themeClass`, `<roomID>.sortOn`, `<roomID>.customKickMsg`, and so on** — the §6.2 list is
key *suffixes*, not key names. It also means **nothing in localStorage is shared across rooms**,
which matters for P-2: a device identity stored this way would be per-room and useless as an account-
wide device limit.

(`+page.svelte`'s login path calls `setInitKey("")` first and then `setInitKey(roomID + ".")` — §6.1 —
so there is a brief window where reads are unprefixed. That is the reference's sequencing, not a bug
worth porting.)

### 🔴 The transport in THIS bundle is SockJS with a `{type, data}` envelope — **not** the room's

```js
service.socket = new SockJS(url);
this.send = function(type, data){ var m = {type: type, data: data}; service.socket.send(JSON.stringify(m)) }
```

**This is a different wire from the one captured in §3a.** The v4 room speaks asyngular at
`wss://chat.protradingroom.com/ptr_app/ptr_asyngular/` with `{"event":"cmd","data":{"cmd":…,"data":…}}`.
This bundle is the older Angular 1.x application and speaks SockJS with `{"type":…,"data":…}`.

**Consequence for everything in §6.2:** the ~26 `chatModel.send(...)` command *names* are evidence,
the *envelope* is not. Do not build a v4 room command from this file's envelope — §3a's capture is
the authority for that. Whether each name survived into v4 has to be checked against the room bundle
or a live capture, one at a time.

Connection behaviour: `SockJS` · auto-reconnect polls every **5 s** while disconnected · on reopen it
re-sends `join` with `reconnect: true` · `loginFailed` cancels the reconnect loop and disarms
auto-reconnect.

### 🔴 P-2 — the reference lets the CLIENT declare it is mobile, and enforces bans in localStorage

`sendLoginToRoom` builds the login payload:

```js
u = {roomID, uid, prevUID, nick, email, pw, perms, ft, ut, tagline, avatar, salt:"", __al: service._al,
     jwtToken, jwtTokenSite, cver: appVars.globals.ver, isM: appVars.globals.isM, apiV: service._apiV}
```
plus `u.phone` when `__hasPhoneValidation`, `u.reconnect = true` on a reconnect, and
`u.ui = appVars.userInfo` (the base64 geo blob §6.2 renders).

**`isM` — the mobile flag that §6.2 found driving the roster's mobile count — is sent by the client,
from a client-side global.** So "this user is on mobile" is a client assertion in the reference.

**P-2 cannot be built on it.** This repository's standard is explicit: *every authority decision is
made on the server from data the server owns — never asserted by the client, ever*. A device limit
keyed on a self-reported `isM` is defeated by one edited variable. **Build P-2's device identity
server-side** (connection metadata, a server-issued device token) and treat `isM` as a display hint
only.

And the ban check, immediately above it:

```js
var bnd = $localstorage.get("bnd");
if (bnd == service.roomID) return void appVars.doAlert("You have been banned from this room…", true)
```

**A ban the client enforces against itself by reading its own localStorage** — and, per the namespace
rule above, under a per-room key. Clearing site data defeats it. The server presumably also refuses,
but this client-side copy is not a control. Same lesson as `isM`.

~~`otherJWTSessions: []` on `chatModel` is unexplained and **is the one field in this slice that
sounds like it already tracks concurrent sessions.** Nothing in this slice writes it. Worth chasing
for P-2.~~

> ⚠ **CORRECTED by §6.7 — that guess was wrong.** `otherJWTSessions` is the list of **other ROOMS
> this JWT grants access to**, not concurrent device sessions. It drives a room-switcher dropdown in
> the top nav (`hasSessionPulldown`, shown when `length > 1`) whose click handler navigates to
> `/users/v1/ssoJWT?sessID=…`. **It has nothing to do with P-2.** Recorded rather than deleted
> because the wrong reading was plausible from the name alone, and the name is still there to
> mislead the next person.

### 🔴 The detached-chat postMessage origin check does not actually block

```js
window.addEventListener("message", function(event){
  var evt = event.data.cmd;
  switch (event.origin != "https://" + window.location.hostname && lg("detached chat message for another room. ignore."),
          evt) { … } })
```

The origin comparison is the **first operand of a comma expression**. It logs and is then discarded;
the `switch` runs on `evt` regardless. **Any origin that can get a handle to this window can send
`sendMsg`, `sendAlert`, `clearAlertLog`, `clearChatLog` or `boot`** — and `boot` replies with the
session object, the full alert log and the full chat log. Do not reproduce this shape; check the
origin and return.

The popup is `window.open("/public/detached/index.html", "_blank")`, pinged every 15 s. Its `boot`
reply does correctly gate the `adminChat` channel on `isPresenter()`.

### `makeReqTokenForCmd` — a THIRD definition, and still not the manage one

```js
// FilesCtrl
$scope.makeReqTokenForCmd = function(cmd){ var tok = $localstorage.get("token"), args = {};
  return args.token = tok, args.tokenSite = $localstorage.get("tokenSite"),
         args.cmd = cmd, args.sessionID = sessionID, args.source = "webApp", args }
```

Reads **`token` and `tokenSite` out of localStorage** (room-namespaced). Like the SideBarCtrl one it
**cannot return falsy**, so the `args && …` guards in §6.1 still belong to a definition not yet read.
Three definitions found, none of them the one that matters. Still open in §4.

### `FilesCtrl` — the Files pane's complete server contract

All to `/users/v1/sessions`: `changeLogo {fpath, sessionID}` · `changeBkgImg {fpath}` ·
`changeBkgImgHREF {href}` · `resetBkgImgHREF` · `deleteFile {fileID}` ·
**`getUserFiles` with `uploadType: "logo"`** when the modal is in `logos` mode, otherwise
**`sessionPubFiles` if `appVars.sessData.authMode == "open"` and `getSessionFiles` if not**, with
`uploadType: "files"`.

- **Upload is a different endpoint:** `POST /users/v1/session/upload/<sessionID>/<token>/<vis>/<type>`
  via `ng-file-upload`. **`vis` is `1` normally and `2` for logos** — a visibility level, first
  sighting. Token in the path again.
- **The three file tabs are chosen from the MIME type of the upload response:** `image/*` → `images`,
  `audio/*` → `sounds`, everything else → `files`. That is the mechanism behind the `sounds` pane in
  the evidence, and `$scope.lastFileTab` is what reopens the modal on the right tab.
- Sound playback is a **room-wide broadcast**: `chatModel.send("playSoundFile", fpath)` /
  `stopSoundFile`. Background image likewise: `setBKGImg`, `setBKGImgHREF`.
- `deleteChecked` reads `#filesDrive input:checked`, and contains a real bug — it compares the loop
  variable `j` inside an async `.success` after the loop has finished, so the refetch fires on the
  wrong iteration or not at all, and it writes through the outer `fileID` parameter. **Do not port
  the loop; port the intent.**

### `PollCtrl` — the poll contract

`sendPoll {q, choices, recipients}` · `sendPollAnswer {a: <choiceIndex>}` · `pollDone`. Inbound
`gotPollAnswer` carries `{a: {a: <index>}, senderNick, x}` — `x` is the timestamp used in the CSV
line. Results are published as a **normal alert**: `chatModel.send("alert", {txt, sendTxt: false})`.

- One answer per client, latched by `$scope.answered` — client-side only.
- Pre-canned polls live in localStorage under `savedPolls` (room-namespaced) as `[{q, choices}]`.
- The results file is a `.txt` named `Poll Results <toDateString()>.txt` and contains the percentages
  **plus every individual response** as `nick,timestamp,answer`.
- Closing the setup modal ends the poll (`pollDone`) after a confirm; closing a results modal does not.
- Percentages are `total`-relative and rendered by flot as a pie; `flotOptions` (default/bar/
  bar-stacked/line/spline/area/pie/donut) is a service in this same slice.

### Other facts from line 11

- **`lg()` keeps a 900-entry in-memory ring buffer** (`lgArr`, `_remoteLog = true`), exposed as
  `appVars.getLog()`. That is what the `getRLog` admin command (§6.2) collects.
- Angular's `$sceDelegateProvider` whitelist is `["self", "https://m1.protradingroom.com/**",
  "https://*.protradingroom.com/**"]` — a **wildcard across every subdomain**.
- `chatModel` defaults worth knowing: `perms: "r"` · `email: "email@example.com"` ·
  `showRoster`/`showRosterCount`/`showFiles`/`showCount` all true · `isShortChatLog: false` ·
  `typingUsers: {}` · `pairCode: ""` · `msgsChannel: {}` (per-channel logs, `adminChat` among them) ·
  `canUploadPics` / `canScreenShate` (sic) / `canMic` / `canCam` / `canAdmin`.
- `DisclosureCtrl` gates entry on typed initials but tests **`$scope.userInitials.lengh`** — a typo,
  so `undefined < 2` is false and **a single character passes**. Reference bug.
- `UsersCtrl` is three lines and does nothing but log the roster length.

### What line 11 did NOT answer

Still nothing on entitlement, subscription state, `lastLogin`, `sendFcmAlertsNew`, `invalidTokens`,
the Twilio/Protexting channels, or the `tokcmd`/`appcmd` vocabularies. **Three of sixteen slices
read.**

---

## 6.4 Line 12 — the **complete inbound command switch**. ~100 cases, read end to end.

Bytes 320,270–352,407. This is `chatModel.socket.onmessage` in full: every message the server can
push at the client, and exactly what each one does. **Same caveat as §6.3 — this is the SockJS
`{type, data}` wire, so the names are evidence and the envelope is not.**

### 🟢 P-5 (Spotify) — the reference already has a room-wide embedded-audio broadcast

```js
case "doSoundCloudEmbed":  $rootScope.$broadcast("doSoundCloudEmbed", evt.data); break;
case "stopSoundCloudEmbed":$rootScope.$broadcast("stopSoundCloudEmbed", evt.data); break;
```

**SoundCloud, not Spotify — but it is the same shape P-5 needs:** a presenter pushes an embed
reference, every client renders the player, a second command tears it down. Alongside it,
`playYTForAll` / `stopYTForAll` and `playSoundFile` / `stopSoundFile` do the same for YouTube and for
uploaded room files.

**So P-5 is a fourth member of an existing family, not a new subsystem.** Design it as
`doSpotifyEmbed` / `stopSpotifyEmbed` next to these, and the room already knows how to receive that
shape. **What is not yet known** is what `evt.data` carries for the SoundCloud case (a URL? a track
id? an iframe?) — the handler only re-broadcasts it, and the consumer is in a slice not yet read.

### 🟢 R-1 — the typing indicator's complete data model

| case | effect |
|---|---|
| `typing` | stamps `data.ts = Date.now()` and pushes `data` into `service.typingUsers[data.c]` |
| `nottyping` | splices the entry with a matching `uid` out of `typingUsers[data.c]` |
| `typingreset` | `service.typingUsers = {}` wholesale |
| `typingPM` / `nottypingPM` | broadcast only — `typingUpdatedPM` / `nottypingUpdatedPM`, **no state kept** |

**`data.c` is the CHANNEL.** So typing state is per-channel (`main`, `adminChat`, …), which is why
§3d found three differently-styled `.typing-indicator-container` rules for three different hosts —
they are three consumers of one per-channel map. Each entry carries at least `uid` and `ts`, and
`.users-typing em` renders the names, so a nick is on it too.

Arrival of a chat message **also** removes its sender from `typingUsers[channel]` — the indicator is
cleared by the message, not only by `nottyping`.

> **Reference bug in all three removal paths:** the guard is `if (arr && 1 != arr.length) { …splice
> by uid… } else arr = []`. With **exactly one** typer the array is discarded outright without
> checking whose it was. Harmless when the one typer is the one who stopped, wrong otherwise. Do not
> port the branch; port the intent (remove by uid).

### The `loggedIn` reply — the authority payload, straight from the server

```js
{uid, p /* perms */, nonP, hidePers, canPM, hasFolder, hideCount, ft, streamServer, mpegStreamServer}
```

- **`service.perms = evt.data.p`** — permissions are server-assigned on join. Good; this is the part
  of the reference that P-2 and P-3 should follow.
- `streamServer` is a `"host|…"` string, **split on `|`**, and its presence is what enables streaming
  (`doConnectToStreaming`). Empty means no streaming.
- `hidePers` → `hidePersDetails`, the privacy switch §6.2 found gating `getUserInfo`.
- `hasFolder` → `showFiles`; `hideCount` → `showCount`; `canPM` → `canPMUser`; `ft` → `isFreeTrial`.
- Roster visibility is decided **client-side** from `sessData.rosterVisibleToViewers` and
  `rosterCountVisibleToViewers`, with presenters forced true.
- `appVars.globals.isM && isPresenter()` → **`nonPresenter = true`**, logged as *"forcing nonPresenter
  admin on mobile app"*. A presenter on the mobile app is demoted to a viewer-with-admin-rights.
  Another decision keyed on the client-asserted `isM` (§6.3).

### 🔴 P-2 — `bannedcookie` confirms the ban is stored by the client, on the server's instruction

```js
case "bannedcookie": $localstorage.put("bnd", service.roomID); break;
```

The server **asks the browser to mark itself banned**, and §6.3 showed the login path reading that
key back and refusing. Alongside it: `kicked` and `banned` both delete the token(s), disarm
auto-reconnect, close the socket and hang up media — `banned` also deletes `tokenSite`.

**This is the whole enforcement model, and it is advisory.** Any P-2 device limit built the same way
is defeated by clearing site data. Recorded as the pattern to *replace*, not to copy.

Token lifecycle, for completeness: `setToken` writes `token` to localStorage and `chatModel.jwtToken`;
`clearToken` deletes it and hits `/logout` **for non-presenters only**; `cleanSiteTok` deletes
`token`, resets the storage namespace to `""` and deletes `tokenSite`; `upgradeNeeded` closes
everything and alerts with a forced reload.

### 🟢 `setPairCode` — the mobile pairing code arrives over the socket

```js
case "setPairCode": service.pairCode = evt.data.pairCode; service.myemail = evt.data.email;
                    $rootScope.$broadcast("setPairCode", evt.data); break;
```

**Payload `{pairCode, email}`.** This is what flips `hasPTRApp` true in §6.2 without a reload, and it
is the third name for one credential — `pairCode` here, `mobilePin` on the user-info reply, `pin` on
the login endpoint, `data.pin` from `getAppPin`. **Confirm they are the same value before treating
them as one**; nothing read so far proves it, it is inferred from four consistent sightings.

### Chat semantics — mentions, questions, and the presenter-only mode

Computed on **every** inbound `chat` / `chatChannel`:

| flag | rule |
|---|---|
| `isMention` | text contains `"@<my nick> "` (lower-cased, **trailing space required**) |
| `isMention` | **or** the message `isAdm` and contains `"@all "` or `"@SO_All "` |
| `isMention` | **or** the message `isAdm`, I am a free trial, and it contains `"@trial "` or `"@trials "` |
| `isQ` | **`msg.text.indexOf("?") > 0`** — any question mark past the first character |

**`isQ` is the Q&A pane's entire input.** It is not a separate message type; it is a `?` anywhere
after position 0. Note `> 0`, so a message that *starts* with `?` is not a question.

Client-side mute list is applied here too, matched on `mUsr.email == msg.email` — the md5 hash
(§6.2), so muting is stable across nick changes.

**`sessData.chatMode == "p"`** filters the chat log for non-presenters:
- `getChatlogSmall` → keep only `msg.isAdm || msg.uid == me`.
- `getChatlog` → keep own messages, plus admin messages that contain **no** `@` at all, plus admin
  messages containing `"@all "` or `"@<my nick> "`. An admin message mentioning *someone else* is
  hidden. That is the reference's private-chat mode and it is enforced **only on the client**.

### Alerts

`alert`, `alertLink` and `imageLink` share one case: the message is stamped with the sender's
`avatar` from the roster and pushed to `alertMsgs`. **`alertLink` then broadcasts `alertLink` and
returns early** — it never fires `alertMsg`, so an alert-link is not a normal alert downstream.
`deleteAlert` splices **by index**, as does `deleteMessage`; `deleteMessageChannel` takes
`{channel, i}`. `updateMsgUpV` carries `{idx, upV}` — **chat messages have upvotes.**

**`getScheduledAlerts`** exists as an inbound case (payload re-broadcast untouched) — **scheduled
alerts are a reference feature nothing in the register mentions.** Directly adjacent to P-1: an alert
scheduled for a member whose subscription lapses between scheduling and firing is exactly the leak
the owner described. Flagged, not yet investigated.

### Polls — the recipient filter is client-side

`gotPoll` drops the poll if `poll.senderUID == me`, then: recipients `"members"` is skipped when
`isFreeTrial`, recipients `"trials"` is skipped when **not** `isFreeTrial`. So the server fans a poll
to everyone and each client decides whether it was for them.

### Room lifecycle and media — the remaining cases

- **Room:** `getRoomState` · `getAudioRoomState` · `restartRoom` · `restartRoomReload` ·
  **`restartRoomSoft`** (carries an entire replacement `sessData`, re-points janus, rebuilds the
  repeater list and re-requests `getMyRepeater`) · `reopenRoom` · `updateSession` (replaces `sessData`
  and rebuilds the `badgesH` map) · `loadPresenterSettings` → `sessData.presenterSettings`.
- **Media plumbing:** `setPorts {pub_id, pub_idScreen, pub_idWebcam, audioRoomCreationLock, audioPin}` ·
  `getMyRepeater` · `removeMediaServer {removedServer, repeaters}` · `mediaRepeaterBackUp` ·
  `mediaRepeaterDown` (**an empty case — received and ignored**) · `getOpenPortResponse` ·
  `newAudioRoomIDForAll {audioRoomID, audioPort}` · `newAudioRoomIDForAllStop` · `audioRoomRestartStart`.
- **Streams:** `addScreenStream {uid, mode: "screen"|"videos", pub_id}` · `addWebcamStream` ·
  `addWebcamStreamError` · `addScreenStreamHLS` · `removeScreenStream` · `removeWebcamStream` ·
  `getscreenSharingUsers` · `getwebcamSharingUsers` · `stopAudioFWD` · `stopScreenFWD` ·
  `sharedVideoPlayerCmd` (ignored when it is our own; `initP` for presenters, `initV` for viewers) ·
  `enableScreenSharingStats` / `disableScreenSharingStats` / `getScreenSharingStats`.
- **Moderation received:** `kickUser` (only acts when the uid is mine) · `kickUserReload` (immediate
  `location.reload()`) · `muteChat` / `muteChat24` / `unmuteChat` (all broadcast `chatMode`) ·
  `muteUser` (no-op if already muted; names the muter) · `muteScreenUser` · `muteCamUser` ·
  `restartScreen` (hangs up, re-shares after **3 s**) · `restartUserAudio` · `remoteStartRec` /
  `remoteStopRec` · `stopAllWebcamsAndStartThis` (**an empty case**).
- **Temp presenter:** `makeTempPresenterOn` / `makeTempPresenterOff` move the user between rosters by
  synthesising `userLeft` + `userJoin` with `perms` rewritten to `"a"` / `"r"`. `makeTempPresenter`
  acts on *me*: `"a"` or `"p"` promotes and sets `isTempPres`, with **`isLimitedP = (perms == "p")`**;
  `"r"` demotes, stops the mic and screenshare. `remTempPres` is **an empty case**.
- **Debug:** `enableRLog` · `getRLog` → the client replies `getRLogResp {uid, log: appVars.getLog()}`
  with its own 900-line ring buffer · `getRLogResp` → opens the debug modal (broadcast name
  `openDebugLoglModal`, the reference's typo) · `ctrl` (payload is `JSON.parse`d) · `cmd`
  (`clearChatLog` / `clearAlertLog` clear the arrays) · `showAlert` · `fileShared` (ignored when we
  sent it).
- **Auto-record:** `sessData.autoRecord` starts recording when *I* start talking while screensharing
  and am not sharing video; if already recording it broadcasts `autoRecordAlreadyRecording` with
  `roomState.recUser`.
- **Screen lock:** `screenLockedOnPres` pins the viewer to one presenter; `talkingStart`,
  `talkingEnd` and `addScreenStream` all skip their auto-switch while it is set, and it clears when
  that presenter leaves.
- Screenshare stats poll every **10 s**; audio helpers send `regenAudioRoomId`, `stopAudioBridge`,
  `resetAudioForServer`, all gated on `isPresenter()`.

> **Reference bug — `updateUser` / `changePerm` cannot move anyone between rosters.** The handler
> early-returns correctly when the perms are unchanged or the change is `l`↔`v`. Otherwise it does
> `for (i = 0; i < ros.length; i++)` and `service.roster.push(user)` — but `roster` and `presroster`
> are **plain objects**, with no `.length` and no `.push`. The loop never enters and the promotion
> silently does nothing. The `makeTempPresenterOn/Off` cases do the same job correctly by key. Anyone
> porting `changePerm` will otherwise reimplement dead code.

### What line 12 did NOT answer

Still nothing on entitlement, subscription state, `lastLogin`, `sendFcmAlertsNew`, `invalidTokens`,
Twilio/Protexting, or the `tokcmd`/`appcmd` vocabularies. **Four of sixteen slices read.** Everything
found so far is consistent with §3: the reference has no automatic entitlement-driven stop.

---

## 6.5 Line 13 — `chatModel`'s outbound half, and the start of `webRTCService` (Janus)

Bytes 352,408–384,420. Mostly media plumbing, but it settles **R-14** and turns up a feature nothing
in the register mentions.

### 🟢 R-14 — the recording start time DOES exist in the reference. It comes from `getRoomState`.

```js
service.roomState && service.roomState.isRecording
  ? (service.isRecording = !0,
     lg("getRoomState setting is recording to true. recUser:" + service.roomState.recUser.nick),
     service.recStartTime = service.roomState.recStartTime)
  : service.isRecording = !1
```

`+page.svelte:7183-7201` already declares R-14 and warns against **inventing** a `startTime`. It was
right to warn, and the value is not invented — **`roomState` carries `isRecording`, `recUser` (an
object with at least `.nick`) and `recStartTime`, pushed by the server on every `getRoomState`.** So
the elapsed-time display is server-sourced and R-14 is buildable without guessing. What is still not
captured is `recStartTime`'s **units and epoch**; do not assume milliseconds.

### 🟡 NEW FEATURE — the room can dial out to a phone

```js
this.dialOutPhone = function(phone){
  this.lastDialOutPhone = phone;
  this.lastDialOutOrigId = Math.round(1e4 * Math.random());
  this.send("dialOutPhone", {phone: phone, orig_id: this.lastDialOutOrigId});
  return this.lastDialOutOrigId }
this.hangUpDialOutPhone = function(origID){ this.send("hangUpDialOutPhone", {orig_id: origID}) }
```

**A PSTN dial-out into the audio bridge**, correlated by a client-generated `orig_id` — and the id is
a `Math.random()` in `0..10000`, so collisions are likely in a busy room. This is almost certainly
what the Twilio credentials found in §3b are for, and it is not in the register at all. Whether any
UI reaches it is unknown — no caller was in this slice.

### The permission predicates — and an inconsistency in them

```js
this.isPresenter = function(){ return "a" == this.perms || "o" == this.perms }
this.isViewer    = function(){ return "r" == this.perms || "l" == this.perms }
```

Combined with §6.2's `readablePerms` (`o`/`a` → Presenter, `v` → Regular Participant, `l` → Limited
Participant), the vocabulary is `o`, `a`, `p`, `r`, `v`, `l`. **A user with `perms == "v"` satisfies
neither `isPresenter()` nor `isViewer()`** — it has a display label but no predicate. Either `v` is
vestigial or one of the two functions is wrong; the reference does not say which. **Do not port the
pair without deciding what `v` means**, and do not silently fold it into `r`.

`chatModel.updateUser()` refuses to send unless `isPresenter()` — a client-side authority check, so
the server must be re-checking (it is the same class of assertion as `isM` in §6.3).

### Outbound commands from this slice

`getOpenPort <ptype>` · `addScreenStream {userName, uid, roomID, pub_id, sessID, port, hlsPort, mode}`
(`mode` is `"screen"` or `"videos"`; the videos variant sends `roomID: 0, pub_id: 0`) ·
`removeScreenStream` · `removeWebcamStream {userName, uid, mode:"webcam", stream, pub_id}` ·
`setScreenShareRes {uid, width, height}` · `incSSStats <uid>` / `decSSStats <uid>` ·
`userStartTalking` / `userStopTalking` · `userStartWebcam` / `userStopWebcam` · `userStartCam` /
`userStopCam` · `startRec <uid>` · `stopRec <isSilent>` · `stopOtherAndStartRec` · `refreshMyState` ·
`getScreenPresenters` · `getWebcamPresenters` · `continueLoginAfterOpen`.

- **`continueLoginAfterOpen` is sent when `roomState.status` flips `"closed"` → `"open"`** while we
  are already connected — the room-closed waiting-room path resumes with this, it does not reload.
- **`startRec` is debounced by hand:** two calls inside 3 s delay the second by 3 s.
- `incSSStats` / `decSSStats` are only sent when `sessData.doScreenshareStats` is on, and switching
  screens sends a `dec` for the old uid and an `inc` for the new one — a client-maintained counter.
- Nicks travel **URI-encoded**: `processTalkingIndicator` does `decodeURIComponent(talker.nick)` to
  build the `"a, b, c"` talking string.

### Media behaviour worth knowing before rebuilding the presentation area

- **Screen-connect watchdog:** 25 s timeout, at most **2** retries, and only while the saved user is
  still the one being watched.
- **"Too small" retry:** if the video element reports width or height `< 10` on `playing`, it hangs
  up and retries after 3 s, up to **3** times, and is **skipped on Firefox and Edge**.
- **Bitrate:** default `512000`; a requested rate above `sessData.media_max_bitrate` is clamped
  **unless `sessData.hqVideo`** is set. `toggleScreenShare(1)` means "alt constraints" and pins
  512000. Webcam publishes at a fixed `1024000`.
- **HLS path:** when `globals.useHLS`, watching a screen resolves to
  `<hlsServerUrl>/<uid>.m3u8` and broadcasts `setHLSUrl` instead of joining WebRTC at all.
- Janus videoroom create: `{request:"create", description:"desc", videocodec: "vp8"|"h264"|"vp9",
  bitrate, publishers: 30, fir_freq}`, joined as `display: "screen-" + sessID` with a random 12-char
  username.
- WebRTC reconnect: `startWebRTCReconnect(delay = 15, mode = "all")`, a `setInterval` that clears
  itself once connected; `"stream"` mode re-runs `initFSStream`, everything else re-runs `initFS`.
- Auto-unmute after a disconnect is **present but deliberately disabled** — the branch logs
  *"auto starting audio unmuted after disconnect...DISABLED..."* and does nothing. Auto-restart of
  **screenshare** after a disconnect is live.
- The client-side chat mute list persists to localStorage `mutedChatUsers` (room-namespaced) as JSON
  of `{nick, email}`.

> **Reference bug:** `onlocalstream: function(stream){ lg("onlocalstream stream:" + JSON.stringify(steam)) }`
> — **`steam`**, not `stream`. Every local-stream callback throws a `ReferenceError`. Harmless only
> because nothing depends on the log line.

### What line 13 did NOT answer

Nothing on entitlement, push, or the mode vocabularies. **Five of sixteen slices read.**

---

## 6.6 Line 14 — `webRTCService` (Janus videoroom) and `webRTCAudioService` (audiobridge)

Bytes 384,421–416,427. Pure media infrastructure — **nothing here touches P-1…P-5.** Read in full
anyway, per the rule; recorded compactly because the rebuild uses a different SFU. The parts that
matter are the ones a port would silently inherit.

- **ICE:** `stun:stun.l.google.com:19302`, plus `turn:<turnServer>:3478` and
  `turn:<turnServer>:443?transport=tcp` authenticated with the `turnUser`/`turnPW` globals — the
  credentials §6.3 flagged. Every client gets them.
- **Screensharing requires a Chrome EXTENSION.** Unless the page is in an iframe or the capture is a
  webcam, `!Janus.isExtensionEnabled()` aborts with a bootbox pointing at the `janus-webrtc-screensharin`
  Web Store listing. This is pre-`getDisplayMedia` legacy — **do not reproduce it**; it is the single
  most user-visible obsolete behaviour in the bundle.
- Firefox instead gets a *"Share whole screen or a window?"* dialog setting `capture` to `"screen"`
  or `"window"`. Chrome screen constraints use `chromeMediaSourceId` plus a stack of `goog*` flags;
  webcam capture is `{width: 1920}` (+ `deviceId`).
- **Codecs come from the session:** `sessData.h264Enabled`, `sessData.vp9Enabled`, `sessData.hqVideo`
  select `h264` / `vp9` / default `vp8`.
- **Audiobridge join:** `{request:"join", room, display: sessID, muted: true, quality: globals.audioQ,
  pin: globals.audioPin}` — the audio room is **PIN-protected**, and the pin arrives on `setPorts`
  (§6.4). Everyone joins muted; publishers unmute via `configure {muted:false}` once, latched by
  `everUnmuted`.
- **Audio autoplay is handled properly:** a rejected `play()` promise raises *"Your browser needs your
  OK to play the room's audio"* and replays on the click. Worth keeping — it is a real browser
  constraint the rebuild also faces.
- Retries: audio session re-attempts every **7 s** up to **10** times; screenshare publish waits
  `screenTimeout` (starts **14 s**, then **doubles**) and retries after 5 s.
- **RTP forwarding / repeaters:** `janusRepeaters` entries are pipe-delimited `host|ip|port`. Audio
  forwards with `ptype: 96`, `audiortpmap: "OPUS/48000/2"`, `always_on: true`; screen with
  `video_pt: 100` (**deleted when h264**), `videortpmap: "VP8/90000"`. A taken port comes back as
  `error_code 456` and the client **increments the port and retries**.
- **`sessData.newServersideRec` disables the whole client-side forwarder path** — the recording
  `getOpenPortResponse` and `recStopped` handlers return early with *"doing this serverside"*. So
  there are two recording architectures in the reference and the newer one is server-driven.

> **Three reference bugs in this slice.**
> 1. **`appVars.globals.useHSL`** — every guard in both services tests `useHSL`, which is never set
>    anywhere. The real flag is `useHLS`. So `if (!appVars.globals.useHSL)` is **always true** and the
>    HLS bypass in these two services is dead. `chatModel` (§6.5) correctly uses `useHLS`.
> 2. **`service.lastSlowLinkAdjus = n`** — missing the trailing `t`. `lastSlowLinkAdjust` is never
>    written, so the "don't re-adjust within 30 s" guard only ever sees `undefined` and the bitrate
>    can be cut repeatedly. The slow-link throttle is off by default (`disableSlowLinkThrottle = true`),
>    which is presumably why nobody noticed.
> 3. **`for (var i = 0; i <= flist.length; i++)`** in `startForwarders`, in **both** services — an
>    off-by-one that dereferences `undefined` on the last pass. `webRTCService.listForwarders` also
>    references a `sess` that is not in scope at all.

### What line 14 did NOT answer

Nothing relevant to any open question. **Six of sixteen slices read.**

---

## 6.7 Lines 1–2 — bootstrap, the dead theme, and `HeaderNavController`. **P-5 answered in full.**

Line 1 is 48 bytes and is the build stamp; line 2 is bytes 49–32,063.

### The bundle's own build date

```js
var __appDate = "8/7/2026, 5:14:43 PM. name=app";
```

**This capture is the build of 2026-08-07 17:14:43.** Cite that date when this evidence is quoted —
it is the only self-dating artefact we hold, and `appVars` logs it alongside a `__vendorDate` from
the vendor bundle we do not have.

### 🟢 P-5 — the complete SoundCloud implementation. Copy this shape for Spotify.

```js
$scope.doSoundCloudEmbed = function(){
  bootbox.prompt('You can play SoundCloud music for all. Click on "Share" from your track or playlist, copy and paste the share url here',
    function(embed){ if (embed) return 0 != embed.indexOf("https://soundcloud.com")
      ? void bootbox.alert("Invalid SoundCloud URL...")
      : void chatModel.send("doSoundCloudEmbed", embed) })}
$scope.stopSoundCloudEmbed  = function(){ chatModel.send("stopSoundCloudEmbed") }
$scope.doSoundCloudUserStop = function(){ sc_widget.pause(); … $scope.scPlaying = !1 … }
```

**This closes the question §6.4 left open.** The payload is **the share URL, as a bare string** —
not an id, not an iframe. Validation is a single `indexOf(…) != 0` prefix check.

And the state is **persisted on the room**, read back in the `getRoomState` handler:

```js
$scope.scPlaying = data.soundCloudURL;
data.soundCloudURL && (wireUpSoundCloud(encodeURIComponent(data.soundCloudURL)), $scope.scClass = "#FFFFFF")
```

So the full design, which P-5 should mirror:

1. Presenter pastes a share URL → validated by prefix → `doSoundCloudEmbed <url>` on the wire.
2. Server stores it on room state as **`soundCloudURL`** and fans out the command.
3. Every client mounts the vendor widget with the URI-encoded URL; a **late joiner picks it up from
   `getRoomState`** rather than missing it. That is the part worth copying deliberately.
4. `stopSoundCloudEmbed` tears it down for everyone; **`doSoundCloudUserStop` pauses it for me only**
   via the widget's own `sc_widget.pause()`, leaving the room's playback alone. Two distinct stops,
   and P-5 needs both.

### 🟢 The mobile app's URL SCHEMES are in the bootstrap config

```js
.config(["$compileProvider", function($compileProvider){
  $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|mailto|protradingroom|protradingroomapp):/) }])
```

**Two custom schemes — `protradingroom:` and `protradingroomapp:`** — whitelisted so Angular will
render `<a href>` links using them. These are deep links into the native app, and they are the first
hard evidence anywhere in this project of how a browser hands off to the installed mobile app.
**Almost certainly what `customMobileAppLaunchWord` parameterises** (a per-tenant scheme or path), but
that is inference — the setting itself is still unread, in lines 3–8.

### `switchSession` — an SSO endpoint with the JWT in the query string

```js
$scope.switchSession = function(sess){
  window.location.href = "/users/v1/ssoJWT?sessID=" + sess.sessionID + "&jwt=" + __al + "&sl=1&name=" + chatModel.nick }
```

Shown as a dropdown when `chatModel.otherJWTSessions.length > 1`. Note **`sl=1`** — `sl` is one of the
14 query parameters `app-root` reads (`docs/source/components/app-root.full.js`), and this is the
first sighting of anything **setting** it. `__al` is the global also sent as `__al` on the socket
login payload (§6.3).

**A JWT in a query string is logged by every proxy and sits in browser history.** Do not copy the
mechanism; the room-switching *feature* is fine, the transport is not.

### The phone dial-out has a UI, and it lives in the Invite modal

§6.5 found `dialOutPhone` with no caller. Here it is:

```js
$scope.doDialOut = function(){
  return null == $scope.invite.phone || 10 != $scope.invite.phone.length
    ? void bootbox.alert("Please enter a valid 10 digit US phone number")
    : (chatModel.lastOrigId = chatModel.dialOutPhone($scope.invite.phone),
       bootbox.alert("Calling " + …), void ($scope.invite.dialing = !0)) }
```

**US-only, exactly 10 digits, no formatting tolerated.** Reached from the invite dialog, not from the
roster. The alert text — *"if you get a Voicemail vs a person"* — makes the intent explicit: a
presenter phones someone into the audio bridge.

### The top toolbar — every icon, its element id, and its two states

| control | element | on / off classes | colour on / off |
|---|---|---|---|
| screenshare | `#cssScreenShareIcon` | `screenOn` / `screenOff` | `#FFFFFF` / `#ABB0B5` |
| mic | `#cssMicIcon` | `micOn` / `micOff` | `#FFFFFF` / `#ABB0B5` |
| camera | `#cssCamIcon` | **`micOn` / `micOff`** — it reuses the mic classes | `#FFFFFF` / `#ABB0B5` |
| recording | `#cssRecIcon` | `recOn` / `recOff` | **`#FF0000`** / `#ABB0B5` |

All start as `toolbarIconOff`. The talking-level meter is two images, `#talkingLevelsImg` and
`#nolevelsImg`, switched on `roomState.initPresTalking` and suppressible by `toggleTalkingLevelIndi`.
The nav's user count is `#rosterLen` (the sidebar's is `#rosterLenSide` — two elements, one number).
**Volume control is hidden outside Chrome and Firefox:** `volumeUnsuported = !is_chrome && !is_firefox`.

### Session settings first seen in this slice

`hideLogo` · `logoURL` · **`custRoomDriveURL`** · **`custLogoutURL`** · `nqNewsFeedURL` ·
`enableVideoPlayer` · `hqVideo` · `name` (the room's display name) · and `initPresTalking` on
`roomState`.

- **`custRoomDriveURL` replaces the Files modal entirely** — `toggleFiles` opens that external URL in
  a new tab instead. **Unless a modifier key is held:** `!($event.ctrlKey || $event.altKey ||
  $event.shiftKey)` is required to take the redirect, so ctrl/alt/shift-click still opens the real
  Files modal. An undocumented admin escape hatch.
- `nqNewsFeedURL` is opened as `<url>?tok=<jwtToken>` — **another token in a query string.**
- `custLogoutURL` is where `doHangup` sends you after clearing `token`, `tokenSite` and the storage
  namespace; without it the user is told *"You can now close this browser window / tab"*.
- **Only one webcam at a time:** `toggleCamMute` refuses while another presenter's cam is up, with a
  message pointing at the user menu to force-stop theirs.

### ⚠ Roughly 40% of this slice is DEAD THEME CODE. Do not port it.

`MailboxController`, `MailboxFolderController` and `MailboxViewController` build a **fake inbox out of
lorem ipsum** — `mail@example.com`, `app/img/user/01.jpg`, a hardcoded list of invented names, subjects
generated by `Math.random()`. Alongside them: `LayerMorph`, `chainedAnimation`, `checkAll`,
`toggleFullscreen`, `resetKey`, `titlecase`, the `browser` / `support` / `touchDrag` services, the
`COLORS` constant and `MEDIA_QUERY` (`desktopLG: 1200`, `desktop: 992`, `tablet: 768`, `mobile: 480`).

**None of it is protradingroom code** — it is untouched boilerplate from the purchased admin theme.
Anyone reading this bundle for "what the app does" will otherwise transcribe a mailbox feature that
has never existed. It is also why the third-party module list is so long:

`ngRoute` · `ngAnimate` · `ngStorage` · `ngCookies` · `ngSanitize` · `ngResource` · `ui.bootstrap` ·
`ui.router` · `ui.utils` · `ui.gravatar` · `ngFileSaver` · `oc.lazyLoad` · `cfp.loadingBar` ·
`xeditable` · `textAngular` · **`angular-web-notification`** · `toaster` · `timer` · `color.picker` ·
`pascalprecht.translate` · `ngFileUpload`

**`angular-web-notification` is worth chasing for P-1** — it is a wrapper over the browser
Notification API, so the *desktop* half of "stop sending alerts" may have a second delivery path
distinct from FCM. Nothing in the six slices read so far calls it; it is in lines 3–8 or nowhere.

Gravatar is configured globally: `size: 80`, `default: "mm"`, `secure: true` — which is where §6.2's
`?d=mm` avatars come from.

### What lines 1–2 did NOT answer

`sendFcmAlertsNew`, `invalidTokens`, `diasableFCMAlerts`, `customMobileAppLaunchWord`, Twilio,
Protexting, and the `tokcmd`/`appcmd` vocabularies. **Seven of sixteen slices read; lines 3–8 remain.**

---

## 6.8 Line 3 — `ChatCtrl`: the chat pane's complete rendering, paging and upload path

Bytes 32,064–64,095. The largest single body of room-UI evidence in the bundle. **Directly relevant
to the room rebuild** even though it touches none of P-1…P-5.

### 🔴 SECURITY — member image uploads go to a PUBLIC third-party host, with keys in the bundle

`onImageSelect` posts every dropped, pasted or picked image to **imgur, through RapidAPI**, using a
hardcoded imgur `Client-ID` and a hardcoded `x-rapidapi-key`. Both are string literals in this slice;
**as with §6.3 the values are not transcribed here** — find them in `~/Downloads/app.min.js` line 3
near `imgur-apiv3.p.rapidapi.com` if they need rotating.

Two separate problems, and the second is the bigger one:

1. **The keys are public.** Anyone can lift them and bill against that RapidAPI account.
2. **The images themselves are public.** A member pastes a screenshot of their brokerage account into
   chat and it is uploaded to imgur, which is a public image host, and only the resulting URL comes
   back into the room. **For a multi-tenant fintech application that is a data-egress path nobody
   opted into.** The rebuild must upload to the project's own R2 bucket.

Upload limits and behaviour: max **41,246,720 bytes** (~39 MB) per file, rejected with
*"Sorry, `<name>` is too large!"*; the resulting chat message is literally
`Uploaded image: "<name>" <url>`, routed to the private chat, the active channel, or `main`
depending on context.

Three ways in: **drag-and-drop** onto `.drop-area` (which toggles a `highlight` class),
**paste** (`window.onImagePaste` reads `clipboardData.items`, shows a bootbox preview and asks
*"Upload this image?"* before sending), and the picker.

### The chat message DOM — THREE renderers, six shapes

| function | active when | `<li>` classes |
|---|---|---|
| `addToChatLog` | default | `clearfix` / `clearfix isAdm` |
| `addToChatLogTiny` | `$scope.compactMode` | `clearfix smChatLi` / `clearfix isAdm smChatLi` |
| `addToChatLogTinyAlt` | `altChatRender` | `clearfix smChatLi` (both branches) |

Every one splits into an `isAdm` branch and a regular branch, so **there are six distinct DOM shapes
for one chat message.** Shared structure:

```
<li class="clearfix[ isAdm][ smChatLi]" tabindex="<idx>" id="chatLi_<idx>"
    data-uid data-uname data-isTxt="true" [style="background-color: …"]>
  <span class="chat-img pull-left|pull-right|inline">
    <img class="thumb24|thumb16" src="https://secure.gravatar.com/avatar/<md5>?d=mm">
  <div class="chat-body">
    <div class="chat-header chatName">
      <a class="text-inverse"><strong>…name…</strong></a>
      <img class="chatStars" src="/public/images/<years>.png">
      <small class="text-muted pull-right|pull-left">…time…</small>
    <div class="chat-msg chat-msg-txt">…text…</div>
```

- **`chatQuestion`** is added when `msg.isQ`, **`chatMention`** when `msg.isMention` — the two flags
  §6.4 showed being computed on arrival. These are the styling hooks for the Q&A and mention features.
- **Admin messages are right-aligned and per-presenter coloured:**
  `appVars.sessData.presenterSettings[msg.email]` → **`{bkgColor, fontColor}`**, applied as an inline
  `background-color` on the `<li>` and `color` + `text-align: right` on the text. **This is what the
  `loadPresenterSettings` command (§6.4) delivers, and it is keyed by the presenter's EMAIL.**
- Timestamps differ per renderer: full is `moment(t).format("ddd @ h:mm a")`; tiny is `[h:mm a]` in an
  `<a class="text-inverse ts">`; tinyAlt is `h:mm a` in `ts tsSm`. The **alert** log uses
  `MM/DD/YYYY @ h:mm a` with a `<span class="fa fa-time">`.
- Tiny bodies carry `smChatBody` (regular) and `smChatBodyAdm` (admin), both `inline`.
- `msg.years` drives the tenure star image and is **forced to 0 when `sessData.disableStarYears`**.
- Trial and user-tag labels (`label-danger` / `label-warning`) and badges render exactly as in the
  roster (§6.2), presenter-gated the same way.

### Sanitisation and link handling — read this before rebuilding the message body

```js
msg.text = DOMPurify.sanitize(msg.text, {SAFE_FOR_JQUERY: true});
msgTxt = $($.parseHTML(msg.text)).text().replace(/\bhttp[^ ]+/gi, urlwrap | urlwrapImg);
```

**The text is sanitised and then flattened to plain text**, and only afterwards are URLs re-wrapped
into HTML. So no user markup survives at all — the only rich content is what these three wrappers
re-introduce:

- `urlwrap` → `<a target="_blank" onclick="event.stopPropagation()">`
- **`urlwrapImg`** → if the URL "looks like an image", an inline
  `<div class="img-container" onclick="imageModal(event,'<url>')"><img class="uploaded-img">`;
  otherwise a plain link. **Used when `sessData.userUploads` is on, or when the message is from an
  admin** — so inline images are a per-room permission for members and unconditional for presenters.
- `urlwrapAlert` → the alert-pane variant, same image handling, no `stopPropagation`.
- `isLinkImage` is a **substring** test: `i.imgur.com`, `.png`, `.jpg`, `.jpeg`, `.gif` **anywhere in
  the URL**, not just at the end. A link with `.png` in a query parameter renders as an image.
  (It also `return`s `undefined` rather than `false` on the last path — harmless, but it is not a
  boolean.)

### 🟢 `$TICKER` mentions are a real feature

```js
function parseSimbols(msgTxt){
  var r = msgTxt.match(new RegExp("\\s*\\$[A-Za-z]+\\b", "g"));
  … msgTxt.replace(match, '<span class="stockMention" style="color: ' + $scope.colors.stockColor + ';">' + match + '</span>') … }
```

**`$AAPL` in a message is wrapped in `<span class="stockMention">`, coloured from
`$scope.colors.stockColor`.** Letters only — `$SPX500` does not match past the letters, and the
guard runs only when the text contains a `$` at all. Spelled `parseSimbols` in the source.

### Chat log paging — the mechanism, because it is not obvious

- Only the last **`maxChatWindow`** messages render; `currChatStartIdx` and `currChatLen` track the
  window.
- **Scrolling to the top** (`scrollTop() == 0` with `currChatStartIdx > 0`) calls `loadMoreChatLog`,
  which **prepends** the previous page and restores scroll position to the old first row.
- `startLoadedMoreTimer` then polls **every 5 s** and, as soon as the user is no longer scrolled up,
  re-renders the whole log to *"delete chat bloat"* — i.e. the expansion is temporary by design.
- New messages past the window remove `li:nth-child(1)`, but **only when the user is not scrolled up.**
- **Everything is duplicated across two panels — `#chatPanel` and `#chatPanel2`** (and
  `#alertsPanel` / `#alertsPanel2`), scrolled in lockstep. That is the alt-layout pair.
- **Firefox binds the scroll listener to `#chatPanel2`; every other browser to `#chatPanel`.**
- `chatFontSize == "chatWide"` switches the pane to **horizontal** scrolling (`scrollLeft`) instead.

### 🟢 R-1 — `usersTyping` and `usersTypingCnt` confirmed on the scope

`$scope.usersTyping = ""` and `$scope.usersTypingCnt = 0`, alongside `$scope.hasTypingIndicator`.
This is the second independent confirmation of §3d: the typing indicator is **a name string plus a
count**, not only the three animated dots. Consistent with the `.users-typing` / `.users-typing em`
CSS found in the live room DOM.

### Chat channels are configurable per room

`hasOffTopicTab` · `hasAdminsTab` · `extraAdminChannels` · `extraRegChannels` ·
`altGenChannelName` (**default `"MainChat"`**) · `altOffTopicChannelName` (**default `"Off-Topic"`**).

So the tab strip is not fixed: a room can rename the main and off-topic channels and add further
channels for admins and for regular members. The `extra*Channels` values are strings — presumably
delimited lists, but **the parser is not in this slice**, so do not assume the delimiter.

### ⚠ A HARDCODED TENANT SPECIAL-CASE in the client

```js
window.location.hostname.indexOf("simpler") > 0 && (
  alertFavicon = "/public/favicon_simpler.ico",
  $scope.bkgImageURL || ($scope.bkgImageURL = "/public/images/happy-coffee.jpg"), …)
```

**White-labelling by hostname substring, compiled into the bundle.** One named tenant gets a different
favicon and a different default background. The default favicon is `/public/favicon_lg.ico`.

This is worth flagging for **P-3**: the reference's idea of a "business account" identity is, at least
in part, an `indexOf` on the hostname. Any enterprise/tenant model built for P-3 should replace this,
and the fact that it exists tells you white-labelling was demanded before there was a mechanism for it.

### ⚠ DEAD TELEHEALTH CODE — `patientIn`, `docIn`, and a `ups` command

```js
function handleStateObject(obj){ … chatModel.patientData && chatModel.patientData.isPatient
  ? … sendUpdatedStateObject("patientIn","true") : … sendUpdatedStateObject("docIn", chatModel.getUID()) }
function handleStateObjectChange(key,val){ switch(key){ case "doctorIn": break;
  case "patientIn": chatModel.patientUUID = val … } }
function sendUpdatedStateObject(key,val){ chatModel.send("ups", {key: key, val: val}) }
```

**There is doctor/patient state machinery inside the trading-room bundle** — `patientData`,
`patientUUID`, `isPatient`, and a generic `ups` (update-state) wire command. Either this codebase is
shared with a telehealth product or it is abandoned. **Do not port it**, and do not assume `ups` is
unused elsewhere just because its only callers here are these.

(It is also internally broken: `handleStateObject` writes **`docIn`** while `handleStateObjectChange`
switches on **`doctorIn`**, so the doctor branch can never fire.)

### Smaller facts from line 3

- **`hasAlertScheduler`** is a scope flag here — the counterpart to the `getScheduledAlerts` inbound
  case in §6.4. Scheduled alerts are real and gated per room. Still not investigated.
- `getContainerSizes(localStorageName, defaultArrSizes)` restores split-pane sizes from localStorage,
  **validating that every stored entry contains `"%"`** and falling back to defaults otherwise. A
  cheap corruption guard worth keeping.
- The floating webcam is **drag-positioned by hand** — `drag_start` / `drop` compute an offset and set
  `#webcamCamDiv`'s `left`/`top`, latching `webcamAdjusted` so later auto-layout leaves it alone.
- `saveLog` exports a `.txt` of `<time> [<user>]: <text>` lines, named `<prefix><toDateString()>.txt`.
- Toast handling is per-uid: `toastsDict[uid]`, with `cloaseAllToastFrom(uid, leaveLast)` (sic)
  collapsing a burst from one sender down to the most recent.
- The volume control is a **jQuery Knob**: `$(".dial").knob({min:0, max:100, value:100, width:150,
  height:150, thickness:.3, cursor:false})`. Where the knob is unsupported (`volumeUnsuported`, i.e.
  not Chrome/Firefox) **mute instead hangs up and reconnects the audio bridge** — a completely
  different mechanism behind the same button.
- `nonPresenterLoggedIn` and `audioServerDisableMic` both disable toolbar controls
  (`micEnabled`/`screenEnabled`/`camEnabled`).
- `sessData.audioMeterDisabled` gates the talking-level images.
- `AvatarsCtrl` offers nine avatars (`app/img/user/01..08.jpg` plus `user.png`) stored in
  `$cookies.avatar` — theme artwork, but genuinely wired to `chatModel.avatar`.
- `validateYouTubeUrl` extracts the 11-character video id and accepts `youtu.be`, `/embed/`, `/v/`,
  `watch?v=` and `watch?…&v=`.
- Other scope state first seen here: `emojisEnabled`, `imageUploadIcon`, `doNotDisturb`,
  `newMsgSound` (persisted), `modOnlyFilter` (hides all non-admin messages), `chatSearch2`,
  `alwaysScrollChat`, `compactMode`, `mpegScreenMode`.

### What line 3 did NOT answer

`sendFcmAlertsNew`, `invalidTokens`, `diasableFCMAlerts`, `customMobileAppLaunchWord`, Twilio,
Protexting, `tokcmd`/`appcmd`. **Eight of sixteen slices read — halfway. Lines 4–8 remain.**

---

## 6.9 Line 4 — `ChatCtrl` continued: layouts, themes, notifications, **and the mobile deep link**

Bytes 64,096–96,119. The densest slice for open questions: it answers
`customMobileAppLaunchWord`, completes R-1, and finds a **second alert-delivery channel P-1 has to
account for**.

### 🟢 `customMobileAppLaunchWord` — ANSWERED. It is the custom URL SCHEME.

```js
$scope.launchPTRApp = function(){
  var launchKey = "protradingroomapp://";
  appVars.sessData.customMobileAppLaunchWord && (launchKey = appVars.sessData.customMobileAppLaunchWord + "://");
  var href = launchKey + "?t=" + $scope.appObj.al
                       + "&s=" + $scope.appObj.roomID
                       + "&pc=" + $scope.appObj.pairCode;
  lg("launchPTRApp...href:" + href), window.open(href) }
```

**The whole browser→app handoff, in one function.**

- **Default scheme `protradingroomapp://`** — exactly the scheme whitelisted in the bootstrap config
  (§6.7), now confirmed rather than inferred.
- **`customMobileAppLaunchWord` is the white-label override**: a tenant with their own app in the
  stores gets their own scheme, and the setting holds the *word*, with `://` appended by the client.
- **Three deep-link parameters:** `t` = the `al` token, `s` = the room id, `pc` = **the pair code**.
  So the same `pairCode`/`mobilePin`/`pin` credential tracked through §6.1, §6.2 and §6.4 is what
  crosses into the app, and it crosses **in a URL**.
- `$scope.appObj` is the carrier — `{al, roomID, pairCode}`. **Where `appObj` is built is not in this
  slice**; it is the last unknown in the pairing chain. Look for it in lines 5–8.

`sessData.customMobileAppV3Name` is still unseen. `handleBkgImgClick` sits next to this and opens
`sessData.bkgImageURLHREF` — unrelated, but it is why the background image is clickable.

### 🔴 P-1 — there is a SECOND alert-delivery channel: browser Web Notifications

```js
webNotification.showNotification("Room Alert from " + data.user,
  {body: data.text, icon: alertFavicon, onClick: function(){}, autoClose: 3e4})
```

Fired on **every inbound alert**, and again on **every chat mention**. This is the
`angular-web-notification` module §6.7 flagged, and it is live.

**P-1's scope is wider than push.** "Stop sending alerts when the subscription lapses" has at least
three delivery paths in the reference — FCM push to the phone, SMS via Twilio/Protexting (§3b), and
**browser notifications to any desktop with the room still open**. A member whose subscription lapsed
but whose browser tab is open keeps receiving desktop notifications until the socket drops them.
**Whatever gate P-1 adds has to sit upstream of the fan-out, not on the push transport.**

Also new here: **`data.nonTradeAlert`** — a per-alert boolean that selects the sound
(`app/sounds/cash` for a trade alert, `app/sounds/message` otherwise). **So alerts already carry a
trade/non-trade distinction**, which is the natural seam if the owner ever wants entitlement to gate
only trade alerts.

The full sound map, gathered across slices:

| event | sound | gates |
|---|---|---|
| trade alert | `app/sounds/cash` | `alertOnAlerts`, room not closed, `currVol != 0` |
| non-trade alert | `app/sounds/message` | same |
| chat mention | `app/sounds/pling` | `alertOnMention`, `!doNotDisturb`, `currVol != 0` |
| new chat message | `app/sounds/newMessage` | `newMsgSound`, not mine, not a mention, `!doNotDisturb`, `currVol != 0` |
| user join | `app/sounds/ding` | `beepOnUserJoin` **and presenter** (§6.2) |
| audio bridge restarting | `app/sounds/userJoin` | presenter only |

### 🟢 R-1 COMPLETE — the typing indicator's outbound half and its render

**Outbound**, from the composer's keydown:

```js
chatModel.send("typing",   {c: chan, pm: $scope.isPrivateChat, pu: $scope.privChatUID})
chatModel.send("notyping", {c: chan, pm: $scope.isPrivateChat, pu: $scope.privChatUID})
```

- `chan` defaults to `"main"`; `pm` marks a private chat and `pu` names the other party.
- A **latch** (`$scope.amITyping`) means `typing` is sent once, not per keystroke.
- A timer (`typingDelayMillis`) sends `notyping` after inactivity, or when the textarea loses focus
  or is emptied.
- **Enter (keyCode 13) immediately clears the latch and the timer** without sending `notyping` — the
  message itself is what clears the indicator (§6.4 confirmed the receiver does this).

**Render**, from `typingUpdated`:

```js
var usrs = chatModel.typingUsers[chan];
for (var i = 0; i < len; i++){ var n = usrs[i]; str += n.n; i < len-1 && (str += ",") }
$scope.usersTyping = str; $scope.usersTypingCnt = len;
```

- **The name field on a typing entry is `n`** — `usrs[i].n`. Short key, not `nick`.
- Names are joined by a bare `","` **with no space**.
- **Skipped entirely when `isPrivateChat`** — the main indicator does not run in a PM; `typingPM` /
  `nottypingPM` have empty handlers here, so the PM indicator is rendered somewhere else or not at all.

> ⚠ **Spelling mismatch, recorded as an observation, not a bug.** The client **sends `"notyping"`**
> (one `t`) and the inbound switch in §6.4 handles **`"nottyping"`** (two `t`s). Both spellings are in
> the same application. Either the server normalises, or one direction is dead. **Do not "fix" this
> when porting without checking the server** — and there is no server capture, so this is a real open
> question. Named in §4.

### The layout engine — six layouts, two geometries

`handleLayout(layout)` switches on six names: **`allinone` · `chat` · `alerts` · `alertsonly` ·
`alertschat` · `screen`**, and branches on `$scope.alertsChatOnBottom` into two completely separate
sizing regimes.

| | normal | alt (`alertsChatOnBottom`) |
|---|---|---|
| storage key | `split-room-sizes` | `split-room-sizes-alt` |
| default | **`["20%","80%"]`** | **`["50%","50%"]`** |
| storage key | `split-chat-alerts-sizes` | `split-chat-alerts-sizes-alt` |
| default | `["30%","70%"]` | `["30%","70%"]` |
| chat/alerts split axis | **width** | **height** |

Element ids the engine drives: `#chatAlertsDiv`, `#presentationContainer`, `#alertsContainer`,
`#chatContainer`, `#presentationHolderDiv`, and `.video-presentation-section` (whose height is set
from the computed height of `#presentationHolderDiv` in `allinone` and `screen`).

- **`alerts` and `alertsonly` are byte-identical cases in both branches** — two names, one behaviour.
  Whatever distinguished them is gone.
- Normal mode gives the alerts pane `height: "calc(100% - 10px)"`; alt mode gives it `100%`.
- `alertschat` is a fixed 30/70 alerts/chat split, ignoring the stored sizes.

### The two themes, in full

| token | dark | light |
|---|---|---|
| `fontColor` | `#F7FD37` | `#535353` |
| `bkgColor` | `#000000` | `#E8E8E8` |
| `linkColor` | `#C0D8ED` | `#365d7d` |
| `mentionColor` | `#29F32E` | `#048d04` |
| `questionColor` | `#4FAEFB` | `#2095f2` |

Each is written to localStorage under its own key, plus `themeClass`. **`stockColor` (§6.8) is not
set by either theme** — so the `$TICKER` colour is independently user-chosen and has no theme default.

### `setOption` — the preference dispatcher

| `type` | values | effect |
|---|---|---|
| **`chatHeigth`** (sic) | `100` `90` `80` `70` `0` | class pairs `ch100/ch0`, `ch90/ch10`, `ch80/ch20`, `ch70/ch30`, `ch0/ch100` on chat/alerts |
| `chatWidth` | `100` / `wide` / other | `wd-xxl` / **`wd-80` + `chatFontSize = "chatWide"`** / `wd-hide` |
| `chatWidthClass` | — | only applies while the current class is `wd-80` |
| `compactMode` | `"1"` / other | switches to `addToChatLogTiny` and re-renders |
| *anything else* | — | `$scope[type] = val` and persisted under the same name |

That last row matters: **`setOption` is a generic persisted-preference setter**, so the set of
preferences is open-ended and not enumerable from this function.

### Chat modes and channels

`chatMode` is a single letter — **`g` = "Group Chat", `d` = "Chat Disabled", `p` = "Webinar Mode"** —
defaulted from `roomState.chatMode` or `"g"`, changed by sending `setChatMode`, and announced with a
toast. `"d"` stashes the previous layout in `prevLayout`. This is the same `chatMode == "p"` that
filters the chat log for non-presenters in §6.4.

Channels carry **per-channel unread counters**: `$scope.channelPendingMsgs[channel]++` for any message
arriving on a channel other than the active one, with `main` counted explicitly when no channel is set.

### Other findings in line 4

- **`restartRoom` supports server-directed failover:** `data.forceServer` →
  `window.location.assign(data.forceServer + location.pathname + location.search)`. Otherwise
  `custLogoutURL`, otherwise a reload.
- **Tawk.to support widget** — `toggleChatSupport` calls `Tawk_API.addTags(["room: <name>",
  "Room_ID: <uuid>", "nick: <nick>", "email: <email>"])` then `showWidget()` / `maximize()`.
  **A third-party support vendor receives the member's email and room.** Same egress concern as the
  imgur path in §6.8; worth listing when the rebuild's data-flow is documented.
- **Zoom/pan on the shared screen:** jQuery `panzoom` on `#webcamScreen` with
  `{panOnlyWhenZoomed: false, minScale: .8, maxScale: 3, increment: .1}`, bound to `#zoomInBtn`,
  `#zoomOutBtn`, `#zoomResetBtn`, with `#zoomFloaterDiv` at opacity `0.8` active / `0.5` idle.
  Initialised **once**, lazily, on first toggle.
- **`ResizeObserver`** on `#alertsContainer` and `#chatContainer` re-scrolls each pane to the bottom —
  guarded by a `typeof ResizeObserver` check for old browsers.
- **HLS playback starts on a 9-second delay** (`setHLSUrl` → `$timeout(…, 9e3)`), cache-busts with
  `?v=Math.random()`, and installs a one-shot `error` listener that re-assigns `src` and reloads.
- **PM permission:** `userPM = sessData.userPM || (sessData.userToPresenterPM && "a" == u.perms)` —
  either PMs are open to everyone, or members may PM presenters only.
- **Private chat pane height is computed in JS**, not CSS:
  `calc(<#chatContainer height> - (.chat-top + .private-chat-header + #chatToolbarDiv + 5px))`.
- `privChatsArr` entries carry `isOffline`, flipped by `userJoin`/`userLeft`; `privChatName` defaults
  to `"Group Chat"`; `unansweredPrivChats` tracks the badge.
- **Webinar countdown:** `pubSessionData.webinarDate` → `webinarDateRemain` in seconds plus a
  `moment().fromNow()` string, and a ShareThis bar (`stButtons.locateElements()`) 3 s later.
- `alertLink` toasts are clickable and `window.open(data.link)`; `alertMsg` with `data.img` renders an
  inline thumbnail toast instead of text.
- `loadAllChat` sends **`getChatLog`** — the un-truncated log, the counterpart to `getChatlogSmall`.
- Toolbars: `#chatToolbarDiv` / `#chatCogBtn` and `#alertsToolbarDiv` / `#alertCogBtn`, the cog
  gaining a `highlighted` class while open.
- Settings first seen here: `dingOnNewMessage` (gates the new-message sound **and** its toggle
  button), `disableEmojis`, `hasAlertScheduler`, `altChatRender`, `hasChannelTabs`, `userUploads`,
  `userPM`, `userToPresenterPM`, `audioMeterDisabled`, `bkgImageURL`, `bkgImageURLHREF`.
- `imageUploadIcon = isPresenter() || sessData.userUploads || chatModel.canUploadPics` — three ways to
  earn the upload button.
- iOS needs a user gesture: `startIOSAudio` calls `$("#webcam").get(0).play()` and is gated on
  `h264Enabled`.

### What line 4 did NOT answer

`sendFcmAlertsNew`, `invalidTokens`, `diasableFCMAlerts`, Twilio, Protexting, `tokcmd`/`appcmd`, and
**where `$scope.appObj` is built**. **Nine of sixteen slices read; lines 5–8 remain.**

---

## 6.10 Line 5 — the ALERT COMPOSER, the mobile modal, the session-control modal. **P-1's core.**

Bytes 96,120–128,135. **The most consequential slice in the bundle for P-1.** It contains the alert
send path with all of its delivery switches, the mobile-app modal with `appObj`, and the presenter's
session-control panel.

### 🔴🔴 THERE ARE TWO MOBILE APPS. P-1 is about the second one.

```js
var iosURL            = "https://itunes.apple.com/us/app/pro-trading-room/id1147825433?ls=1&mt=8",
    androidURL        = "https://play.google.com/store/apps/details?id=com.bellesoft.protradingroom",
    iosAlerterURL     = "https://apps.apple.com/us/app/pro-trading-room-alerts/id1542468993",
    androidAlerterURL = "https://play.google.com/store/apps/details?id=com.bellesoft.ptrAlerter";
```

| app | iOS | Android | what it is |
|---|---|---|---|
| **Pro Trading Room** | `id1147825433` | `com.bellesoft.protradingroom` | the full room client |
| **Pro Trading Room Alerts** | `id1542468993` | **`com.bellesoft.ptrAlerter`** | **the ALERTER app — notifications only** |

**This reframes P-1.** The owner's problem — *"members continue to receive alerts on their app"* — is
about the **alerter app**, a separate product from the room app. It also explains a family of names
that until now looked arbitrary: **`alerterAppTokens`** (6 occurrences in this bundle),
**`alerterAppFCMUserOff`**, and `showAlerterAppTokens` (§6.1) are all about `ptrAlerter`, not about
the room app. Two apps means potentially **two token sets and two revocation paths**, and §6.1's
unresolved question — why `showAlerterAppTokens` reads tokens off the roster row while `getFCMTokens`
fetches from the server — is very likely exactly this split.

**Do not treat "the mobile app" as one thing again.**

The modal itself is `/mobileAppLaunch.html`, and **it has tabs**: `$scope.showMobileTab` defaults to
**`"alerter-app"`**, switched by `toggleMobileTabs(tab)`, with `$scope.roomHasAlerterApp = true` and
`$scope.chkInstalled = true`. **This is the content R-15's "Mobile App" troubleshooter tab needs.**

### 🟢 `$scope.appObj` — FOUND. The last link in the pairing chain.

```js
$scope.appObj = {pairCode: chatModel.pairCode, roomID: chatModel.roomID, myemail: chatModel.myemail,
                 al: chatModel.jwtToken,
                 mobileAppURL: iosURL, mobileAppURLAndroid: androidURL,
                 alerterAppURL: iosAlerterURL, alerterAppURLAndroid: androidAlerterURL}
```

So the deep link built in §6.9 — `<scheme>://?t=<al>&s=<roomID>&pc=<pairCode>` — carries
**`t` = `chatModel.jwtToken`**. The room's JWT is handed to the native app in a URL. `pairCode` and
`myemail` both come from the `setPairCode` push (§6.4).

White-label override: `customMobileAppEnabled` swaps the store URLs for
**`customMobileAppIOSUrl`** and **`customMobileAppAndroidUrl`** — two more settings, first sighting.

**The modal auto-opens on mobile**, once per session:
`!didMobilePop && (ptrMobileAppEnabled || customMobileAppEnabled) && isMobile` where `isMobile` is
`window.mobileAndTabletcheck()`.

`mailAppInfo()` mails the credentials to `chatModel.myemail` via a `mailto:` link, body:
*"Here are your mobile app credentials:\n\nRoomID: …\nPair Code:…"* plus both store links —
**the pair code, in an email, in a `mailto:` URL.**

### 🔴 THE ALERT MODEL — every delivery channel, and a per-alert push switch

```js
$scope.theTask = {txt:"", sendTxt:!1, sendEmail:!1, sentTweet:!1, dontPush:!1, sendLinked:!0,
  nonTradeAlert:!1, legalDisclosure:…, hasTxt: sessData.hasAlertTxt, hasEmail: sessData.hasAlertEmails,
  hasTwitter: sessData.hasAlertTwitter, linkedRooms:…, sendLaterDate: new Date,
  sendLaterAsEmail: chatModel.email, sendLaterAsNick: chatModel.nick}

chatModel.send("alert", {txt, sendTxt, sendEmail, sendTweet, dontPush, sendLinked, nonTradeAlert})
```

**One alert fans out to as many as six destinations:**

| flag | destination | room gate |
|---|---|---|
| *(always)* | the room's alert pane | — |
| *(default on)* | **push to the mobile app(s)** | suppressed by **`dontPush`** |
| `sendTxt` | **SMS** (the Twilio / Protexting channels of §3b) | `sessData.hasAlertTxt` |
| `sendEmail` | email | `sessData.hasAlertEmails` |
| `sendTweet` | Twitter | `sessData.hasAlertTwitter` |
| **`sendLinked`** | **OTHER ROOMS** — default **ON** | `sessData.linkedRoomAlertsObj` |

**Three things here change P-1's design:**

1. **`dontPush` proves the server's fan-out already branches per-alert before pushing.** There is a
   decision point in the send path. That is where an entitlement check belongs — not on the token, not
   on the transport.
2. **`sendLinked` defaults to TRUE and fans alerts into other rooms.** `sessData.linkedRoomAlertsObj`
   is an array of `{name, …}`, joined for display. **So a lapsed member of room B can receive an alert
   posted in room A.** Any revocation keyed on "the room the alert was posted in" will leak. This is
   a genuine multi-tenant hazard and it was not in the register.
3. **`nonTradeAlert`** (§6.9) travels on every variant, so trade and non-trade alerts are
   distinguishable end to end if the owner wants entitlement to gate only one.

Two sibling sends: **`alertLink {txt, link, nonTradeAlert}`** and
**`imageLink {txt, img, nonTradeAlert}`** — neither carries `dontPush` or `sendTxt`.

### 🔴 Scheduled alerts — and they CANNOT be told not to push

```js
chatModel.send("alertLater", {txt, sendTxt, sendEmail, sendTweet, sendLinked,
  sendLaterDate, sendLaterAsEmail, sendLaterAsNick, sendAt: sendLaterDate, nonTradeAlert})
chatModel.send("getScheduledAlerts", "")
chatModel.send("deleteScheduledAlert", alert._id)
```

**`alertLater` has no `dontPush` field.** The immediate composer can suppress push; the scheduled one
cannot. **That is precisely the leak the owner described**, in the sharpest possible form: an alert
scheduled today for next week fires against whatever the roster looks like then, with push on
unconditionally.

- `sendLaterAsEmail` / `sendLaterAsNick` default to the sender but are **editable** — a presenter can
  schedule an alert to be sent **as somebody else**.
- The payload carries both `sendLaterDate` and `sendAt` with the same value — one of them is
  redundant, and there is no evidence which the server reads.
- Scheduled alerts come back as objects with `_id` and `alert.text`; the modal is
  `/scheduledAlertsModal.html`, gated on `sessData.hasAlertScheduler`.
- Guard: refuses a date in the past; confirms with *"Send this alert on: … send as: …"*.

**Legal disclosure:** default text **`"FOR EDUCATIONAL PURPOSES ONLY, NOT FINANCIAL ADVICE"`**, held
in localStorage `legalDisclosureTxt`, toggled by `legalDisclosure`, appended to the alert body after a
`\n` at send time. It is **client-side text appended to the message**, not a server-side field — so an
alert's compliance footer is whatever that presenter's browser had stored.

### The session-control modal (`roomControl.html`) — the gear icon

Commands sent: **`changeSessionLock <bool>`** · **`closeRoom <msg>`** ·
**`closeRoomAndRevoke <msg>`** · `openRoom` · `restartRoom` · `restartRoomSoft` ·
`regenAudioRoomId` · `stopAudioBridge` · `resetAudioForServer <ms>`.

- **`closeRoomAndRevoke` is the `delKey` variant of closing the room.** "Revoke" is the vocabulary of
  the **`invalidTokens`** list the census found and nothing has yet explained — this is the strongest
  lead so far on what populates it. Not proven; named in §4.
- **`changeSessionLock`**: *"all regular users will be kicked out of the room and will not be able to
  login till you unlock the session."* `sessData.isLocked` raises a 15-second warning toast on join.
- Two SSH reboot commands, both built **by hand** (not via `makeReqTokenForCmd`) as
  `{cmd, sessionID, token: chatModel.jwtToken, source:"webApp"}` posted to `/users/v1/sessions`:
  **`resetSingleMediaServerSSH`** (with `mediaServer`) and **`resetMediaServerSSH`**. Both require the
  presenter to type **`yes`**.
- **Device pickers:** `Janus.listDevices()` fills `#audio-device` and `#video-device`, falling back to
  the raw `deviceId` when the label is empty; selections persist to localStorage `audioDeviceID` /
  `videoDeviceID` and apply live via `restartMicAudioAfterIDChange` / `restarWebcamAfterIDChange`.
- The media-server list comes from `sessData.media_relays.split(",")`, each entry `"name|…"`.

**A fourth `makeReqTokenForCmd`-equivalent:** `savePresenterSettings` also hand-builds
`{cmd:"setPresenterSetting", sessionID, token: chatModel.jwtToken, key: <email>, val: {bkgColor, fontColor}}`,
with a `clearPresenterSetting` counterpart. On success it sends `loadPresenterSettings` over the
socket so every client re-renders. **So there are at least four different ways this app authenticates
an admin POST, and the one governing §6.1 is still unread.**

### Chat composer — the limits, verbatim

- **`maxlength` is 5000 for a presenter and 500 for everyone else.**
- **Enter sends.** A value containing `\n` (i.e. pasted multi-line text) is **split and sent as
  separate messages**, one per line.
- Members are blocked from admin channels client-side:
  `extraAdminChannels.indexOf(chatChannel) != -1` → *"Sorry, regular users can't post here..."*
  (a substring test on the raw comma string, so a channel named `ops` matches `devops`).
- **`typingDelayMillis = 5000`** — the idle timeout behind `notyping` (§6.9).
- **`maxChatWindow = 200`** — the render window from §6.8, now with its number.
- **`extraAdminChannels` and `extraRegChannels` are comma-split** — this answers §6.8's open question
  about the delimiter.

### Upvotes, deletes, and a mode where delete is a lie

- **`doUpV {uid, time, idx}`** — you cannot upvote your own message, each index only once, and
  **one upvote per 30 seconds** globally: *"Take it easy, only 1 upvote every 30 seconds ;)"*.
  `resetUpV` clears the latch.
- **`deleteAlert {nick, date}`** and **`deleteMessage {text, nick, date, channel}`** — messages are
  identified **by content and timestamp, not by id.** Two identical messages from the same person in
  the same second are indistinguishable.
- ⚠ **In `chatMode == "p"` (Webinar Mode), `deleteMessage` sends NOTHING.** It walks the local array
  and hides `#chatLi_<idx>`. The message stays on the server and on every other client. A presenter
  deleting a message in webinar mode has deleted it only for themselves, with no indication.
- `clearChatLog` sends the channel name; `clearAlertLog` sends `null`. Both confirm first.

### The user colour palette — nine tokens, distinct from the two themes

`fontColor` `#E0E0E0` · `bkgColor` `#000000` · **`pfontColor`** `#E0E0E0` · **`pbkgColor`** `#000000` ·
`nameColor` `#D0D0D0` · `linkColor` `#025AA8` · `mentionColor` `#048d04` · `questionColor` `#025AA8` ·
`stockColor` **`null`**.

The `p*` pair is the presenter's **own outgoing message** colours, saved to the server as
`presenterSettings[email]` (§6.8 renders them). Picker config: `format: ["hex8"]` (**8-digit hex —
alpha is supported**), `swatchBootstrap`, `swatchOnly`, `pos: "bottom left"`, close button labelled
**"Set"**, reset labelled **"Reset"**. Everything persists on the picker's `onClose`.

Note these defaults **differ from the theme values in §6.9** — `switchTheme` overwrites them, so the
palette a user sees depends on whether they ever picked a theme.

### A SECOND file subsystem, separate from `FilesCtrl`

```js
getFiles:      POST /users/v1/users.json  {cmd:"getAttachments", roomID}
serve:         APIURL + "/users/v1/serveFile"
onFileSelect:  Upload.upload({url: APIURL + "/users/v1/upload",
                              fields:{roomID, imageDesc, email, userName}})
               → chatModel.send("cmd", {cmd:"fileShared", data:{name, sender}})
```

**Different endpoints, different payload, different notification path** from the session-files modal
in §6.3 (`/users/v1/session/upload/<sessionID>/<token>/<vis>/<type>` and `getSessionFiles`). One is
"room attachments" with a carousel (`#imgCarousel`); the other is the Files pane. **Do not merge them
when rebuilding without deciding which the owner actually uses.**

### Other findings in line 5

- **`setPresentationViewTo(type)`** — five views: `files`, `video`, **`edit`**, `screen`, `chatOnly`.
  The `edit` view sizes **`#padFrame`** to the holder height minus 5px — **a shared-document iframe**
  (Etherpad-shaped), which is the `sharedEditVisble` toolbar button.
- **`captureVideoImage`** draws `#webcamScreen` to a canvas and downloads
  `screenshot-<toLocaleTimeString()>.png`. Width is `videoWidth - 100` — deliberate crop or a bug,
  unclear; height preserves the aspect ratio.
- **Emoji picker is Intercom-styled:** `#emojiToglerBtn` toggles `.intercom-composer-emoji-popover`,
  clicking `.intercom-emoji-picker-emoji` appends its HTML to `#chatTxt`, and
  `.intercom-composer-popover-input` filters by **`[title*=query]`**. Wired once via a latch.
- **`imageModal(event, url)`** — shift/alt opens the raw URL in a tab; otherwise a bootbox with class
  `imgur-modal` and a Download button calling `downloadImage(url, name)` via XHR-blob.
  ⚠ It tests **`event.ctrlClick`**, which is not a DOM property — **ctrl-click silently does nothing.**
- `autoSwitchToOfftopics` clicks **`#offTopicChatTabNav`** one second after the chat log loads.
- `hasAdminsTab = sessData.hasAdminOnlyChannel && isPresenter`; `alertOnAlerts = !sessData.alertSoundOff`;
  `roomType == "webinar"` triggers the countdown; `pubSessionData.roomType` is the source.
- Presenters call **`loadPrivateChatsFromDB()`** — private chats are persisted server-side, not just
  in memory.
- `fileShared` plays `app/sounds/fileShare` and either alerts or offers to switch to the files view.
- `$(window).unload(endSession)` — closes the socket and returns to the login state.
- Settings first seen here: `hasAdminOnlyChannel`, `alertSoundOff`, `isLocked`, `autoSwitchToOfftopics`,
  `hasAlertTxt`, `hasAlertEmails`, `hasAlertTwitter`, `linkedRoomAlertsObj`, `customMobileAppIOSUrl`,
  `customMobileAppAndroidUrl`, `roomType`.

### What line 5 did NOT answer

`sendFcmAlertsNew`, `invalidTokens` (though `closeRoomAndRevoke` is now the lead),
`diasableFCMAlerts`, `ptrMobileAppCaseByCaseEnabled`, `customMobileAppV3Name`, and the
`tokcmd`/`appcmd` vocabularies. **Ten of sixteen slices read; lines 6, 7, 8, 15, 16 remain.**

---

## 6.11 Line 6 — shared video player, private chat, YouTube-for-all; `LoginCtrl` begins

Bytes 128,136–160,141.

### 🟢 P-5 — a THIRD embedded-media mechanism, and this one shows the DOM

Alongside SoundCloud (§6.7) and the video player below, `playYTForAll` builds the embed by hand:

```js
div.setAttribute("class", "posted-video-container");
// playlist form:
'<iframe width="640" height="320" src="https://www.youtube.com/embed/videoseries?list=<id>&autoplay=1&loop=1&rel=0"
   frameborder="0" allowfullscreen allow="autoplay; encrypted-media"></iframe>'
// single video form:
'<iframe width="640" height="320" src="https://www.youtube.com/embed/<id>?autoplay=1"
   allow="autoplay; encrypted-media" frameborder="0" allowfullscreen></iframe>'
document.querySelector("#presentationHolderDiv").appendChild(div)
```

- Appended into **`#presentationHolderDiv`**, guarded so only one can exist.
- **Presenters get an extra "Stop For All" button** (`.btn-primary.btn-sm.yt-btn`, `top:-32px; right:30px`)
  calling the global `stopYTForAll()`; **everyone** gets a `×` close (`.btn-danger`, `top:-32px; right:0`)
  calling `closeYTFrame()` — **which removes it locally only.** Two different stops, exactly like
  SoundCloud's room-stop vs user-stop. **P-5 should follow the same pair.**
- Saved URLs live in localStorage `ytVideoList` as `[{title, url}]`, with a title prompt, a duplicate
  check, and separate regexes for the video id and a `list=` playlist id.

### The shared video player — `sharedVideoPlayerCmd` in full

`video.js` with `techOrder: ["html5", "youtube"]` and
`youtube: {ytControls:0, controls:0, rel:0, showinfo:0, iv_load_policy:3, enablejsapi:1}`.

| `cmd` | payload | effect |
|---|---|---|
| `initP` | — | presenter: controls **on**, wire the event senders |
| `initV` | — | viewer: controls **off** |
| `play` / `pause` / `reset` | — | direct |
| `seek` | `pos`, `src` | `currentTime(pos)` |
| `load` | `url`, `autoPlay` | loads, optionally plays |
| **`upd`** | `src`, `state`, `pos` | the sync heartbeat |

- **`upd` is re-broadcast every 15 seconds** while the presenter is playing (`$interval(…, 15e3)`).
- A viewer re-seeks only when **`Math.abs(data.pos - currentTime()) > 2`** — a 2-second tolerance.
- A different `src` on `upd` reloads the viewer onto the new video.
- Playlist in localStorage `videoPlayList` as `[{url, name}]`; auto-advance on both `ended` **and**
  `error`; YouTube URLs load as `video/youtube`, everything else as `video/mp4`.

### Private chat — the complete behaviour, including a full-screen takeover

- `privChatLogs` and `privChatsArr` persist to **localStorage** via `savePrivChatsToDB` /
  `loadPrivateChatsFromDB` — **the names say "DB" but it is localStorage.** Presenter-only, so a
  presenter's private-chat history survives a reload and a member's does not.
- **`sessData.privMessageHugePopup`** — for **non-presenters**, an incoming PM triggers a `$.blockUI`
  full-screen takeover: *"Private message from: `<nick>`"*, the message body, and a flashing
  **"Click here to reply"** button.
  - That button calls the global `doPrivReply(uid)`, which **automatically sends the literal string
    `"(Private Message Accepted)"`** back as a private message and flashes `#chatTxt` with
    `animated flash chatHighighted infinite` for 3 s.
  - A `lastReplyUID` latch stops it firing twice for the same person.
  - ⚠ The markup opens `<h2>` and closes `</h1>`.
- Without that setting: a toaster with **`timeout: 0`** (never auto-dismisses) whose `onHideCallback`
  switches the pane to that private chat, plus `app/sounds/beep` (gated on `alertOnMention`), plus a
  **presenter-only** web notification with **`autoClose: 0`**. `doNotDisturb` suppresses all of it.
- `showPrivateChatUI` sizes `#privChatDiv` to **30% height × 50% width** of `#presentationHolderDiv`,
  bottom-centred, clamped to `top >= 60` / `left >= 100`, and only positions it once.
- Leaving a private chat clicks **`#mainChatTabNav`** and zeroes `channelPendingMsgs.main`.

### `loadPreferences()` — the complete persisted-preference list

`chatToolbarVisible` · `alertsToolbarVisible` · `sideBarVisible` · `chatWidthClass` (default
**`wd-xxl`**) · `chatFontSize` (default **`chatLg`**) · `themeClass` (default **`light`**) ·
`alwaysScrollChat` · `alertOnAlerts` (default `!sessData.alertSoundOff`) · `alertOnMention` (default
**true**) · and the nine colour tokens of §6.10.

Called on every `getRoster`, so preferences are re-applied whenever the roster is refreshed.

### Giphy

`https://api.giphy.com/v1/gifs/search?limit=25&offset=0&rating=PG-13&api_key=<globals.gifSearchAPIKey>&q=<query>`
— **`rating=PG-13` is hardcoded**, 25 results, no paging despite the `offset=0`. Selecting one shows a
confirm and then posts **the bare URL** as an ordinary chat message, which the renderer turns back
into an inline image (§6.8). The API key is the one flagged in §6.3.

### Three permission presets that nothing sends

`makePresenter()` sets `canTalk`/`canText`/`canPost`/`canCam`/`canScreen` all true; `makeViewer()`
leaves only `canText`; `makeRestricted()` clears everything. **All three only mutate
`$scope.userPerms` — nothing in this slice transmits it.** Either a template binds it or it is dead.
Worth checking before porting; `userPerms` does not appear in any wire payload read so far.

> **Reference bug:** `addWebcamStreamError` offers *"Do you want to take over the webcam?"* and calls
> `chatModel.stopOtherAndStartMyCam()` — which §6.5 found is **an empty function**. Answering "yes"
> does nothing at all.

### `LoginCtrl` begins — and it has things the rest of the app does not

**🟢 An API-KEY system, on its own endpoint — relevant to P-3**

```js
POST {APIURL}/users/v1/apikeys   cmd "restrictApiSessions"  {apiId, sessions: []}
POST {APIURL}/users/v1/apikeys   cmd "restrictApiEndpoints" {apiId, endpoints: []}
```

**A third API surface** (after `/users/v1/sessions` and `/ptr_app/mp/v2/`), with per-key restriction
to a set of **sessions** and a set of **endpoints**. That is the shape of a tenant-scoped machine
credential, and **P-3's enterprise console is exactly where that belongs.** Read this before
designing P-3's authorisation model — nothing else found so far describes non-human access.

**🔴 The user's location is fetched by the CLIENT from a third party**

```js
appVars.globals.uiCollected || (appVars.globals.uiCollected = !0,
  $.get("https://ipapi.co/json", function(data){ var d = {};
    data && (d.country_code = data.country || "", d.region_code = data.region_code || "", …
```

**This is the source of the `ui` field** — the base64 `{city, region_code, country_code}` blob that
§6.2 renders into the roster for presenters and §6.3 sends on login as `u.ui`.

Two consequences:

1. **It is client-asserted.** The "city, region, country" a presenter sees next to a member's name is
   whatever that member's browser chose to send. It is not derived from the connection. Same class as
   `isM` (§6.3) — do not build anything authoritative on it.
2. **Every member's IP is sent to `ipapi.co`**, a third party, on every login. Third data-egress path
   after imgur (§6.8) and Tawk.to (§6.9).

**Other `LoginCtrl` openers:**

- `loadTextList(sessId)` — cmd `loadTextList`, result dropped into `#textListTxt`.
- **`convertToCSV` reveals the badge object's full shape:** keys
  `["_id","userID","text","imgURL","color","bkcolor","type","name","uploadTime","onlyP","roles"]`.
  §6.2 only showed `text`/`color`/`bkcolor` being rendered — badges also carry **`imgURL`**, a
  **`type`**, an **`onlyP`** (presenter-only) flag and a **`roles`** list. Values containing a comma
  are quoted.
- **`validateEmail` explicitly rejects any address containing `@example.com`** — a guard against the
  theme's own fixture data (§6.7).
- `getUrlParameter(sParam)` decodes `location.search` and splits on `&` — but returns
  `void 0 === parts[1] || parts[1]`, so **a valueless parameter comes back as boolean `true`**, not
  `""`. Callers must not assume a string.

### What line 6 did NOT answer

`sendFcmAlertsNew`, `invalidTokens`, `diasableFCMAlerts`, `ptrMobileAppCaseByCaseEnabled`,
`customMobileAppV3Name`, `tokcmd`/`appcmd`. **Eleven of sixteen slices read; lines 7, 8, 15, 16
remain — and lines 7–8 are the session-settings controllers.**

---

## 6.12 Line 7 — `LoginCtrl`: **STRIPE, the marketplace, auth modes, and the manage-page contract**

Bytes 160,142–192,172. **The single most important slice for P-1**, and it settles the
`makeReqTokenForCmd` question that has been open since §6.1.

### 🔴🔴 P-1 — THE SUBSCRIPTION STATE IS ALREADY ON THE USER ROW. Nothing acts on it.

`openStripeDetails(user)` renders a table straight off the user object. **Every one of these is a
field the reference already stores per member:**

| field | label in the UI |
|---|---|
| `stripeMembershipId` | Membership ID |
| `stripeSubscriptionId` | Subscription ID |
| `stripeCustomerId` | Customer ID |
| `stripeCheckoutSessionId` | Checkout Session ID |
| **`stripeSubscriptionStatus`** | **Subscription Status** |
| `stripeLastInvoiceId` | Last Invoice ID |
| `stripeLastPaidAt` / `stripeLastPaidAmount` / `stripeLastPaidCurrency` | Last Paid At / Amount / Currency |
| `stripeLastPaymentFailureAt` / `stripeLastFailureReason` | Last Payment Failure At / Reason |
| **`stripeCurrentPeriodEnd`** | **Current Period End** |
| **`stripeCancelAt`** / **`stripeCanceledAt`** | Cancel At / Canceled At |
| `stripeWelcomeEmailSent` / `stripeWelcomeEmailSentAt` | Welcome Email Sent / At |
| `stripeDataUpdated` | Stripe Data Updated |

And the status vocabulary, from `getStripeStatusClass`:

| status | badge |
|---|---|
| `active`, `trialing` | success |
| `past_due`, `paused` | warning |
| **`canceled`, `unpaid`, `incomplete`, `incomplete_expired`** | **danger** |
| anything else | info |

**This sharpens P-1's root cause decisively.** §3 concluded *"the reference stops push on `lastLogin`
decay, not subscription state"* — true, and now the reason is visible. It is **not** that the
reference lacks entitlement data. **It has `stripeSubscriptionStatus`, `stripeCurrentPeriodEnd`,
`stripeCancelAt` and `stripeCanceledAt` on the member record, and uses them for exactly one thing: a
read-only admin popup.** Nothing in eleven slices connects any of them to the alert fan-out, to
`updateUserFCMTok`, or to `dontPush`.

**So P-1 is a wiring problem, not a data problem.** The pieces already on the table:

1. **The signal** — `stripeSubscriptionStatus` / `stripeCurrentPeriodEnd` on the user row (here).
2. **The decision point** — the server's per-alert push branch, proven to exist by `dontPush` (§6.10).
3. **The revocation call** — `updateUserFCMTok` with `tokcmd` (§6.1).
4. **The hazards** — `sendLinked` fans into other rooms (§6.10), `alertLater` cannot suppress push
   (§6.10), and browser notifications are a separate channel entirely (§6.9).

`formatStripeAmount` divides by 100 and formats USD/EUR/GBP — **money is in cents**, consistent with
this repository's `i64` rule.

`user.isMa` gates the whole check — an unexplained flag, almost certainly "is marketplace member"
given the section below. **Not proven; do not assume.**

### 🟢 P-3 — there is a MARKETPLACE subsystem, on the v2 bearer API

```js
var baseUrl = "/ptr_app/mp/v2", api_url = appVars.globals.APIURL + baseUrl;
$http.get(api_url + "/marketplaces/" + sessID, {headers:{Authorization:"Bearer " + chatModel.jwtTokenSite}})
// if none exists, create:
var mp = {sessionID, title, logoURL, published:!1, locked:!1, featured:!1, hidden:!1,
          tagline:"", description:"", images:[], tags:[], memberships:[]};
$http.post(api_url + "/", mp, {headers:{Authorization:"Bearer " + chatModel.jwtTokenSite}})
window.open(appVars.globals.APIURL + "/mp/room-dashboard/" + mpId, "_blank")
```

**`mp` = marketplace.** This is the same `/ptr_app/mp/v2/` JWT-bearer API as `resend-welcome-email`
(§6.1) — so the "second generation API" found there is **the marketplace API**, and it is where the
newer product work lives.

A marketplace entry is per-room and carries **`memberships: []`** — which is almost certainly where
the Stripe products above are defined — plus `published` / `locked` / `featured` / `hidden`,
`tagline`, `description`, `images[]`, `tags[]`. There is a separate dashboard at
**`/mp/room-dashboard/<mpId>`**, opened in a new tab. A global **`__disableMarketplace`** can switch
the whole feature off.

**Read this before designing P-3.** The enterprise console the owner wants is adjacent to — possibly
the same thing as — this marketplace dashboard, and the memberships array is the seam between P-3 and
P-1's entitlement.

Also on the same page load: **`listAdminUsers()`** and **`listApiKeys()`** (§6.11's
`/users/v1/apikeys`) are called alongside `listBadges()`. **An admin-user list exists.** Its
implementation is in line 8.

### 🟢 The seven auth modes, verbatim

| `authMode` | the UI's own description |
|---|---|
| `jwt` | *"SSO (JWT) - Single Sign On using Wordpress/PHP/Other JWT method"* |
| `open` | *"Anyone with the room link can join with their email & name"* |
| `registrationA` | *"WEBINAR STYLE - Users get sent a unique link to join automatically after they register"* |
| `registrationM` | *"Registraion with MANUAL approval. You approve each registration before users get a unique link"* (sic) |
| `webinarRoom` | *"Unique link & password (optional)"* |
| `unamePW` | *"Unique email/pw for each user"* |
| `closed` | *"Closed - Nobody can use this room while in closed mode"* |

Room types: **`room`** = "Trading Room", **`webinar`** = "Webinar". Timezones offered:
`America/Los_Angeles`, `America/Denver`, **`America/Regina`** (labelled "Central Time" — Regina does
not observe DST, so this is either deliberate or a long-standing mistake), `America/New_York`.

`getPubSessionDetails` (cmd **`sessionPubData`**) decides the login form: a password field appears for
`open`, `unamePW`, `webinarRoom`, or `jwt` **when `allowPWLoginWithSSO` is set and no `__al` was
passed**. It also sets `document.title` from the room name and applies **`customFaviconURL`**.

### The SSO JWT's payload — what `__al` actually contains

```js
var alObj = jwt_decode(__al);
alObj.email        → chatModel.email
alObj.permissions  → comma-split; "canUploadPics" sets chatModel.canUploadPics
alObj.sessions     → chatModel.otherJWTSessions        // confirms the §6.3 correction
alObj.type == "JWTSSO" && alObj.perms == "a" → presenter-in-iframe breakout prompt
alObj.name         → the nick, defaulted to "NoName"
```

**So the SSO token carries `email`, `name`, `permissions` (a comma string), `sessions` (the rooms this
token grants), `type` and `perms`.** That is the identity contract any P-2 or P-3 work has to
interoperate with — and it is the thing handed to the mobile app as `t=` in the deep link (§6.9).

**Query parameters `LoginCtrl` reads:** `ft` (`=1` marks a free trial) · `ut` (user tag) ·
**`sl` (`=1` → silent auto-login)** · `name` · `email` · `slf` (simplified look, clears the email) ·
**`jwtAdmin`** · `secret` (guards `page.setting-demo`).

> ⚠ **`jwtAdmin` accepts an admin JWT from the query string.** `loginAdminWithToken` stores it as
> `tokenSite`, decodes it for email and name, and logs in. A privileged token in a URL is in browser
> history, in referrers, and in every proxy log on the path. **Do not reproduce this.**

Silent login (`sl=1`) also **defaults a missing email to `"email@example.com"`** — the same address
`validateEmail` (§6.11) explicitly rejects.

### Auth endpoints — the complete set

| endpoint | payload | returns |
|---|---|---|
| `POST /users/v1/login` | `email, pw, recaptcha, source` | `success, name, token, **failedLoginCount**` |
| `POST /users/v1/login_tok` | `token, email, source` | `success, name, closedTxt` |
| `POST /users/v1/signup` | `name, email, pw, recaptcha, source, demo:true` | `success, token, demo` |
| `POST /users/v1/demoSignup` | + `roomName, clusterID` | `success, token, demo, roomUUID, roomID` |
| `POST /users/v1/recordings` | `token, source` | recordings list |
| `POST /users/v1/users.json` | `{cmd:"logout", email, token}` | — |
| `POST /users/v1/users.json` | `{cmd:"newSession", email, token, demoRoom:true}` | `{uuid, _id}` |

**`failedLoginCount` is returned by the server and mirrored into localStorage** — a lockout counter
surfaced to the client. Minimum password length is **4 characters** in every signup path, and a
Terms & Conditions checkbox is required. `closedTxt` is wrapped in an `<h2>` if it contains no `<`.

### Room-management commands (all cmd → `/users/v1/sessions`)

`list` · **`changeCustomURL`** (`cname`, stripped to `[a-z0-9]` — *"Only letters and numbers allowed…
as this is a URL"*) · **`uniqueLinkLogin`** · `statsForSession` · **`updateClusterID`** (applies the
cluster to **all** sessions) · **`cloneSession`** (`name` → redirects to
`/ptrApp#/page/manageSession/<id>`) · **`deleteSession`** (type `yes`; *"This is not undoable, all
data will be lost"*) · `sessionPubData` · **`clearUserList`** (*"delete all non-presenter users"*) ·
`loadTextList`.

**Clusters:** a room has `clusterID` **and `backupClusterID`**, with `swapCLusterIDs` (sic) swapping
them via two `saveSessField` calls. `sortSessions` puts the main room first and archived rooms last
(`isMainRoom`, `isArchivedRoom`).

### Browser gate

`DetectRTC`-based, run on `sessionPubData`. **Blocked:** Edge (all versions — *"Edge broken for
now"*), old Edge, **Firefox < 52**, **Chrome < 50**, IE without the plugin, and anything reporting
`isWebRTCSupported === false`. **Bypassed entirely** when `pubSessionData.ptrMobileAppEnabled` and the
device is iOS or Android. Message: *"WARNING Unsupported/Outdated Browser. Please use a more recent
version of Chrome, Firefox, or Opera"* — with a `strictBrowserMode` session setting alongside it.

### Other findings in line 7

- **Badge editor defaults:** `{color: "#FFFFFF", bkcolor: "#ffcc00", text: "New Badge", mode: "add",
  badgeID, roles, imgURL, name}` — white on amber. Emoji can be inserted into `#badgeInputTxt` from
  the same Intercom picker.
- **`clearToken()`** removes `email`/`token`/`tokenSite`/`nick` from **both** the namespaced and raw
  localStorage, POSTs `logout`, then redirects to `custLogoutURL`, or to **`/r/<sessionId>`** when the
  auth mode contains `"registration"`, else reloads.
- **Navigating away from the `kicked` state is blocked** — `$stateChangeStart` calls
  `event.preventDefault()` when `fromState.name == "kicked"`.
- Angular states seen: `page.welcome`, `page.login`, `page.stats`, `page.manageSession`,
  `page.setting-demo`, `kicked`. Path prefixes that suppress auto-login: `/session`, `/u/`, `/v/`,
  `/room/`, `/r/`.
- Phone validation uses **`intlTelInput`** on `#phoneTxt` with
  `utilsScript: "/public/vendor/phoneValidator/js/utils.js"`, restoring `localStorage["<roomID>.phone"]`.
- The `simpler` hostname special-case appears again as **`$scope.isSimpler`** — a second consumer of
  the hardcoded tenant check flagged in §6.8.
- `xeditable` is themed `bs3` with `input-sm` / `btn-sm` and check/times FontAwesome buttons — the
  inline-edit UI on the manage page.
- `hidePoweredBy` on the public session data also forces **`simpleLF`** (simplified look and feel).

### What line 7 did NOT answer

`sendFcmAlertsNew`, `invalidTokens`, `diasableFCMAlerts`, `ptrMobileAppCaseByCaseEnabled`,
`customMobileAppV3Name`, `tokcmd`/`appcmd`, and the implementations of `listBadges`, `listApiKeys`
and `listAdminUsers`. **Twelve of sixteen slices read. Line 8 is the last unread manage-page slice
and every remaining FCM name must be in it.**

---

## 6.13 Line 8 — user lists, badges, API keys, **admin users**, and `saveSessField`

Bytes 192,173–224,204. The last manage-page slice. **It also disproves something §6 asserted three
times.**

### ⚠️ CORRECTION — the FCM settings are NOT in this bundle at all, and never were

§6's read-log said, repeatedly, *"by elimination `sendFcmAlertsNew`, `invalidTokens`,
`diasableFCMAlerts`, Twilio and Protexting must be in lines 3–8."* **Lines 2–8 have now been read end
to end and none of them is there.**

**Verified both ways, 2026-08-16 09:50** — counts taken *after* the full read, as corroboration of it
rather than as a substitute for it:

| name | in `app.min.js` | in `evidence-page.manageSession.html` |
|---|---|---|
| `sendFcmAlertsNew` · `invalidTokens` · `diasableFCMAlerts` · `customMobileAppV3Name` · `protextingSecretTok` | **0** | **3 each** |
| `ptrMobileAppCaseByCaseEnabled` | **0** | **9** |
| `pairSecretKey` | **0** | **5** |
| `twillioApiToken` | **0** | **4** |
| `alerterAppFCMUserOff` | **0** | **1** |
| `useV5` · `mobileAppExpireNotificationsDays` | **0** | 3 / present |

> ⚠ **A second correction, to this correction.** An earlier version of this paragraph blamed *"the
> pull script's census, which only records non-zero probes."* **That explanation is false and has
> been removed.** `ptr-manage-pull.json` does not exist — the only run of
> `ptr-pull-manage-bundle.js` fetched **zero files** (it 404'd on the `chat.` subdomain) and never
> produced a census for this bundle. The probe figures quoted in the earlier session were from a
> shell command **I ran myself** on the downloaded file.
>
> **So the real mistake was simpler and worse than the one I first wrote down:** I ran a probe, saw
> zeroes, and then reasoned as though the zeroes meant "not in the region I have read yet" instead of
> "not in the file". Blaming a tool's output format was a second unverified claim layered on the
> first. Both are recorded because the pattern — explaining an error with another guess — is the
> thing to avoid.

**This slice explains why, and the explanation is useful rather than a dead end:**

```js
$scope.saveSessField = function(fieldName, fieldVal, loadingSettings){
  var args = $scope.makeReqTokenForCmd("saveSessField");
  if (args) return args.sessionID = $scope.sessionID,
    args.fieldName = fieldName,
    args.fieldVal = loadingSettings ? fieldVal : (fieldVal || $scope.sess[fieldName]),
    $http.post(appVars.globals.APIURL + "/users/v1/sessions", args) }
```

**One generic command writes every session setting**: `{cmd:"saveSessField", sessionID, fieldName,
fieldVal}`. So a setting's *name* never appears in the JavaScript — it appears in the **manage page's
HTML template**, as an `ng-model="sess.<name>"` bound to an `ng-change="saveSessField('<name>')"`.

**Where to actually look:** `apps/controller/evidence-page.manageSession.html`, already in this
repository and already named in §4. That is the settings UI's markup, and it is where
`sendFcmAlertsNew`, `diasableFCMAlerts`, `invalidTokens`, `ptrMobileAppCaseByCaseEnabled`,
`customMobileAppV3Name`, `twillioApiToken` and `protextingSecretTok` live. **Reading `app.min.js`
was never going to answer those**, and saying so now is cheaper than another agent re-deriving it.

### 🟢 `alerterAppTokens` is an ARRAY ON THE USER ROW — the alerter app's registrations

```js
$scope.loadMobileUsers = function(){ … cmd "userList" …
  for (…){ var user = usrArr[i];
    user.alerterAppTokens && user.alerterAppTokens.length && uniqueArrEmails.indexOf(user.email) == -1
      && (uniqueArr.push(user), uniqueArrEmails.push(user.email)) } … }
```

**"Mobile users" is defined as "has at least one `alerterAppTokens` entry", deduplicated by email.**
This confirms §6.1's reading: `showAlerterAppTokens` needs no server call because the tokens ship with
the roster. And it confirms §6.10's split — these are the **alerter** app's tokens specifically, which
is why `getFCMTokens` exists separately as a server fetch.

**For P-2, the dedup-by-email here is the reference's own admission of the problem:** the same person
appears more than once in the user list with different tokens, and the admin UI papers over it by
collapsing on email.

> **Reference bug — `loadNonMobileUsers` inverts itself on large rooms.** Under 10,000 users it
> correctly filters `!user.alerterAppTokens || 0 == user.alerterAppTokens.length`. **Over 10,000 it
> slices to the first 10,000 and then filters for users *with* tokens** — returning exactly the
> opposite set. A big room's "non-mobile users" tab shows mobile users.

### 🟢 The `inactive` flag — a THIRD decay threshold, and it is 7 days

```js
for (var n = Date.now(), usrArr = data.xrefs, len = 6048e5, i = 0; …)
  usrArr[i].lastLogin && n - lastL.getTime() > len && (usrArr[i].inactive = !0)
```

**`6048e5` = 604,800,000 ms = exactly 7 days.** So the manage UI marks a member `inactive` after a
week without logging in. That is **client-side display only** — it is computed in the browser, on
every list load, and never sent anywhere.

**There are now three separate decay numbers in the reference**, and they do not agree:

| threshold | value | what it does |
|---|---|---|
| `inactive` flag (here) | **7 days** | greys the row in the admin list. Client-side, cosmetic |
| `ptrMobileAppExpirePairCodeDays` (§3) | **7 days** | the mobile pair token expires |
| `mobileAppExpireNotificationsDays` (§3) | **14 days** | **push actually stops** |

**Nothing ties any of them to `stripeSubscriptionStatus`** (§6.12). P-1's finding stands and is now
fully evidenced from both ends.

### User list commands — the complete set

All `cmd` → `/users/v1/sessions`, all returning `data.xrefs`:

`userList` (`searchTerm`) · `showFreeTrials` · `userListBanned` · `userListPresenters` ·
`userListMuted` · **`userListMarketplace`** · `clearUserList` · `clearUserListFT` ·
**`clearTokensForUsers`** · `resetMaxCounts` · `removeUserXref` · `emailReminders` (`webinarDate`).

- **Over 1,000 users the UI renders only the first 1,000** (`xrefs = usrArr.slice(0, 1000)`) while
  keeping everything in `completeUserList` — which is what the bulk operations in §6.1 iterate. So
  a bulk action can touch users the admin cannot see.
- `clearUserListFT` follows up with *"Don't forget to change the Free Trial Password in the settings
  tab"* — so free-trial access is a shared password.
- **`updateUserXref` gains two more modes here:** `inviteStatus` (an approval workflow — "Approve" or
  *"pause / set to Pending"*), and `newBadges[]` + **`allRooms`**.

> ⚠ **Command/label mismatch worth checking before porting.** The button labelled
> *"remove ALL badges from ALL users in the room?"* sends **`clearTokensForUsers`**. The name says
> tokens, the UI says badges. Either the command is misnamed or the button is — and given everything
> else in this file called "tokens" is push-related, **do not guess which.** An admin who reads the
> label and clicks it may be clearing something else entirely. Named in §4.

### 🟢 P-3 — an ADMIN USERS table exists, on its own endpoint

```js
POST {APIURL}/users/v1/adminusers
  cmd "list"   → data.adminUsers
  cmd "add"    {name, email, password, perms: {}}
  cmd "remove" {adminUserId}
$scope.adminUser = {name:"", email:"", password:"", perms:{}}
```

**This is the closest thing in the reference to the super-admin dashboard the owner asked for.** A
separate admin-user record with its own `perms` **object** (not the single-letter `perms` of a room
member — a different shape entirely). Called on `page.welcome` alongside `listBadges` and
`listApiKeys`. **Read this before designing P-3's model**; it, the marketplace (§6.12) and the API
keys below are the three existing pieces of a control plane.

### API keys — full lifecycle

`POST {APIURL}/users/v1/apikeys` with cmds **`list`** (→ `data.keys`) · **`create`** ·
**`rotate`** (`apiId`) · **`delete`** (`apiId`) · **`listAllApiEndpoints`** (→ `data.endpoints`,
cached client-side) · `restrictApiSessions` · `restrictApiEndpoints` (§6.11).

A key object carries `_id`, **`restrictToSessions[]`** and **`restrictToEndpoints[]`**. The
restriction dialog is two scrollable checkbox lists headed *"Restrict to Sessions (leave none selected
for no restriction)"* and *"Restrict to Endpoints (…)"* — **so an unrestricted key is all-access by
default**, which is deny-by-default inverted. This repository's standard requires the opposite; note
it before copying the model.

**Per-room API secret:** `generateNewApiSecret` takes 24 bytes from `crypto.getRandomValues`, hexes
them, and saves via `saveSessField("apiSecret", hex)`.

> ⚠ **The fallback is not cryptographic.** If `crypto` is unavailable it uses
> `Math.random().toString(36).slice(2)` twice. A predictable API secret is worse than no API secret.
> Do not carry the fallback across.

### Badges — the full CRUD, and badge-gated chat tabs

Commands: `addBadge` (`color`, `bkcolor`, `text`, `isEdit`, `roles`, `name`, `imgURL`, `badgeID` when
editing) · `deleteBadge` · `listBadges` · **`addBadgeDarkTheme`** (`badgeID`, `darkTheme`) — **a badge
can nominate a *different badge id* to render in the dark theme.** All return `data.badges`.

- **Image badges** are uploaded to imgur (the same key as §6.8) and then created with
  `color: "rgba(1,0,0,0)"`, `bkcolor: "rgba(1,0,0,0)"`, `text: ""` and the imgur URL — **transparent
  colours are the marker for "this badge is an image"**, rendered as `<img class="user-badge-img">`.
- `manageBadges` shows a per-user checkbox list and saves through `updateUserXref` with `newBadges[]`
  and an **"Add badges to all rooms?"** checkbox (`allRooms`).
- **`addBadgeForUser` and `removeBadgeForUser` build their args and then return.** No HTTP call at
  all. Two dead functions.

**🟢 `chatTabsWithBadges` — access control by badge.** `openChatTabsWithBadgesEditor` edits a JSON
array of `{name, badges: [badgeId, …]}`, validates that **every tab has a name and at least one
badge**, and stores it with `saveSessField("chatTabsWithBadges", jsonStr)`.

**So chat tabs can be gated on a member holding a particular badge.** That is a tiering mechanism
already in the product, and it is the natural place for P-2/P-3 entitlement tiers to attach. This is
also the newest code in the bundle — it uses `const`, `Set` and `Array.from` where everything around
it is ES5, and Bootstrap 5 class names (`badge me-1 mb-1 rounded-pill`) in a Bootstrap 3 app.

### Invites, exports, and settings transfer

- **`inviteUsers`** `{persons: [{name, email, pw, role, sendEmail}], roomID, inviteHost, emailHost,
  sessionID}` — the confirm text spells out the semantics: an empty `pw` means *"system will assign a
  random pw"*, and `sendEmail` controls *"Email Credentials: Yes/No"*.
- **`inviteBatchUsers`** `{batchEmailsList: [...], roomID, inviteHost, emailHost, sessionID}` — a
  comma-separated paste, lower-cased and whitespace-stripped.
- `exportListToCSV` → `Name, Email, [Phone, ]Role`, the phone column gated on
  **`sess.hasRequiredPhoneInLogin`**.
- `exportStatsToCSV` → `Name, Email, [Phone, ]IP, In, Out, Duration, isMobile, Browser`, duration via
  `moment(out).from(in, true)`.
- **`loadSettingsFromRoom`** copies every field from another room via `saveSessField(field, value,
  true)`, **excluding `_id`, `name`, `uuid` and `description`.** (Its picker is `inputType: "checkbox"`
  but it only ever reads `setting[0]` — a multi-select UI that acts single-select.)

> ⚠ **`loadSettingsFromJSON` is a copy-paste of `exportSettingsToJSON`.** The function that claims to
> *load* settings serialises `$scope.sess` and **downloads it**. It has never imported anything. A menu
> item that does the opposite of its label.

### Session fields first seen in line 8

`recordedMaxCapacity` · `current_max` · `apiSecret` · `chatTabsWithBadges` · `description` ·
`customCname` · `uniqueLinkLogin` · `hasRequiredPhoneInLogin` · `enableBadges`.
`sessionDetails` (`sessionID`) returns `{session: {...}}`; **`sessionDetailsShort` takes `uuid`** and
returns the object directly.

### What line 8 did NOT answer

Nothing further — and per the correction at the top of this section, **nothing further was ever going
to be here.** `app.min.js` lines 1–14 are now read in full. The remaining FCM/SMS settings are in the
manage page's HTML, not in any JavaScript bundle.

---

## 6.14 Lines 15–17 — stream subscriber, cam service, **the routes, and a published source map**

Bytes 416,428–455,328. `webRTCStreamService` (the subscriber half), `webRTCStreamTestService`,
`webRTCCamService`, the `ripple` directive, the route table, vendor assets, theme settings and i18n.
**`app.min.js` is now read in full.**

### 🔴 THE BUNDLE PUBLISHES A SOURCE MAP

The last line of the file is:

```
//# sourceMappingURL=maps/app.min.js.map
```

**If `/public/dist/maps/app.min.js.map` is actually served, the original unminified sources are
publicly available** — real variable names, real function names, and any comments the authors wrote.
That would be strictly better evidence than anything in §6, and it would take one fetch.

**This is now the highest-value single capture left in the project.** Add it to the pull script's
target list. If it 404s, say so and move on — but check.

### 🔴 A hardcoded secret guards a page, in the route table

```js
.state("page.setting-demo", {url:"/setting-demo", templateUrl: …, params:{secret:"1PTRdem04cc0unt9"}})
```

§6.12 showed the guard: `$location.search().secret === toParams.secret || $state.go("page.welcome")`.
**The "secret" that protects the demo-settings page is a literal in the client bundle**, readable by
anyone. Not a credential for a live system as far as anything here shows, but it is the same class of
mistake as the TURN password (§6.3) and it belongs on the rotate list.

### The route table

| state | url | notes |
|---|---|---|
| `app` | `/app` | abstract shell |
| **`app.dashboard`** | `/dashboard` | `params: {alertsChatOnBottom: false}` |
| **`app.dashboard-alt`** | `/dashboard-alt` | `params: {alertsChatOnBottom: true}` |
| `app.dashboard.closed` | `/closed` | the waiting room |
| `app.users`, `app.chat` | `/users`, `/chat` | |
| `app-dock`, `app-dock.dashboard` | `/dock` | a second shell |
| `app-fh` + `app-fh.mailbox.*` | `/fh`, `/mailbox` | **the dead theme mailbox (§6.7)** |
| `page` | `/page` | `LoginCtrl`, `autoLogin: true` |
| `page.welcome` · `page.stats/:sessionID` · **`page.manageSession/:sessionID`** | | all `autoLogin` |
| `page.mockstats/:sessionID` | `/mstats/:sessionID` | **"mock" stats — a fixture page** |
| `page.register` · `page.forgot-password` · `page.user-forgot-password` | | |
| `page.change-password/:uid` · `page.user-change-password/:uid` | | the two identity systems again |
| `page.setting-demo` | | the hardcoded secret above |
| `page.login/:sessionID` | | `LoginCtrl` |
| `page.recordings` | `/recs` | `params: {isRec: true}` |
| `page.avatarSelect` | `/avatars` | |
| `kicked` | `/kicked` | `KickedCtrl`, `params: {msg: ""}` |

Default route is `/page/welcome`; every template resolves to `app/views/<name>.html`.
**`app.dashboard` vs `app.dashboard-alt` confirms §6.1's `alertsOnBottom` branch** — it is a whole
separate route and template, not a CSS class.

### Media findings (recorded for completeness; nothing here bears on P-1…P-5)

- **The webcam publishes at `bitrate: 128e3` with `media.video: "lowres"`** in `webRTCCamService` —
  while §6.6's `webRTCService` forces `1024e3` for its webcam path. **Two webcam publish paths with an
  8× bitrate difference.** Which one runs depends on `doConnectToStreaming`; worth knowing before
  anyone reports a quality bug.
- Subscriber retry: Janus `error_code 455` → retry after **2 s**, up to **3** attempts, then
  `cycleRepeaters` — **which is disabled and simply returns the current server**, so the "try another
  repeater" path is dead and it retries the same one forever.
- Switching streams uses `{request:"switch", id}` when already attached and `{request:"watch", id}`
  when not — the `switching` flag distinguishes them.
- H264 forwarding overrides the payload type: `video_pt: 96`, `videortpmap: "H264/90000"`,
  `videofmtp: "profile-level-id=42e01f;packetization-mode=1"`.
- **Both bugs from §6.6 recur verbatim here**: `for (i = 0; i <= flist.length; i++)` in
  `startForwarders`, and `service.lastSlowLinkAdjus = n` (missing `t`) in `webRTCCamService`. The
  webcam's slow-link bitrate floor is `5e4`, against the screen's `75e3`.
- `webRTCStreamTestService` is a near-copy of the stream service dedicated to the `"test"` ctype —
  this is what the Network Test tab in **R-15** drives.

### App chrome, vendors and i18n

- `$rootScope.app = {name: "ProTradingRoom", views:{animation:"ng-fadeInLeft2"},
  layout:{isFixed, isBoxed, isDocked}, sidebar:{isOffscreen}, footer:{hidden:true}, themeId:0, theme:{…}}`,
  persisted whole into `$localStorage.settings` and re-saved on any `app.layout` change.
- **Eight admin themes** — primary, purple, success, warning, info, danger, pink, amber — each a set of
  `bg-*` classes for sidebar / header / brand / topbar. Theme state is global, not per-room.
- **The app is translated into four languages**: `en` English, `es` Español, `pt` Português,
  `zh-cn` 中国简体, loaded from `/app/langs/<code>.json`, preference in localStorage.
- Lazy-loaded vendors (`VENDOR_ASSETS`): animate.css, font-awesome + feather, moment-with-locales,
  **sockjs**, blueimp-gallery, a Google Maps loader, flot + six plugins, xeditable.
- A Material-style `ripple` directive on click/touch — cosmetic, and the only place `touchstart` is
  handled directly.

---

## 6.15 `app.min.js` — READING COMPLETE. What it answered and what it could not.

**All 17 lines, 455,329 bytes, read in order.** Fourteen slices, §6.1 through §6.14.

**Answered outright:** the P-1 server contract (§6.1) · the two mobile apps and the alerter split
(§6.10) · `customMobileAppLaunchWord` and the deep link (§6.9) · `$scope.appObj` (§6.10) · the alert
model with `dontPush`, `sendLinked` and `alertLater` (§6.10) · **the Stripe subscription fields
already on the user row** (§6.12) · `alerterAppTokens` as a roster array (§6.13) · the typing
indicator both directions (§6.9) · `recStartTime` for R-14 (§6.5) · SoundCloud as P-5's precedent
(§6.7, §6.11) · the marketplace, API keys and admin users for P-3 (§6.12, §6.13) · `saveSessField`
as the single settings write path (§6.13).

**Cannot be answered from this file, and now proven so rather than assumed:** `sendFcmAlertsNew`,
`invalidTokens`, `diasableFCMAlerts`, `ptrMobileAppCaseByCaseEnabled`, `customMobileAppV3Name`,
`twillioApiToken`, `protextingSecretTok`. **They are field names passed to `saveSessField`, so they
exist only in the manage page's HTML** — `apps/controller/evidence-page.manageSession.html`. See the
correction at the head of §6.13.

**Still requires a live capture:** the `tokcmd` and `appcmd` argument values (the user row menu's
`ng-click` attributes), and the server's own behaviour, which is captured nowhere.

**Eighteen reference bugs are recorded across §6.** Each is written where it was found, with what it
breaks, so that a port does not silently inherit it.

---

# 7. `enterprise-and-control-plane.md` + `stripe-details-2026-08-14.json` — read 2026-08-16

Both were on the queue since before §6. **They and §6 correct each other**, which is the useful part —
two independent reads of the same system, done a day apart, disagreeing in three places.

## 7.1 ⭐ The `tokcmd` / `appcmd` values do NOT need a live capture. They are already on disk.

`enterprise-and-control-plane.md` was written from **`~/Desktop/new-room/enterprise/ptr1.json`
(23.5 MB)** — the manage page's full DOM **with 18 dropdowns and modals captured OPEN**, including:

> **App and Notifications** (`fa-mobile`) — Get App PIN · Show App Tokens · Get FCM Tokens ·
> **PAUSE / RESUME / Remove Mobile Notifs** · Send Test Mobile Notifs · Reset Mobile Notifs

**That is the exact menu §4 said required a fresh live capture.** The labels confirm the three
`tokcmd` modes (`pause` / `resume` / the one labelled *Remove*, i.e. `unsub`), but the *argument
strings* are in the `ng-click` attributes, which this summary quotes labels from rather than markup.

**So the next step is to open `ptr1.json` and read the `App and Notifications` region** — a permitted
read (`Desktop/new-room` is reference-only, read-never-write). **This supersedes queue item #3**: no
live capture, no owner action, the evidence is already here. It is 23.5 MB, so slice it the way §6
sliced the bundle.

`prt2.json` (9.4 MB) is the **account page** — `#/page/welcome` — and is the other unread half.

## 7.2 🔴 CORRECTION TO §6.1 — the role integers are TWO vocabularies, not one

**§6.1 presented the integers from the bulk menu as "the role enum". That was incomplete in a way
that is actively dangerous**, and the enterprise document caught it:

| N | per-user `updateUserXref` | bulk `updateUserXrefMulty` |
|---:|---|---|
| 1 | Make Presenter | Make Presenter |
| 2 | Make Participant / Unban | Make Participant / UNBAN |
| 3 | MUTE Participant | MUTE Participant |
| 4 | BAN | BAN Participant |
| 5 | Make Admin | Make Admin (Non-Presenter) |
| 6 | Make Trial | Make TRIAL user |
| 7 | **Hide User Count** | — |
| 8 | **Show User Count** | — |
| 9 | **Freshen Login Date** | — |
| **10** | **Hide Pers User Data** | **Remove All** |
| 11 | **Don't Hide Pers User Data** | — |
| 12 | **UNOBSERVED in either menu** | — |
| 13 | **Deny Archives Access** | — |
| 14 | **Allow Archives Access** | — |

**`10` means "hide personal data" per-user and "remove all" in bulk.** Building one shared enum for
both — which §6.1's table invited — **turns a privacy toggle into a mass delete.** `12` is genuinely
unobserved and stays a gap.

**`9` — "Freshen Login Date" — is directly P-1 relevant.** It is a manual admin action that resets
`lastLogin`, which is the only thing that stops push (§3). So the reference's answer to "this member
stopped getting alerts" is *an admin bumping the timestamp*, which also silently re-arms the
14-day leak.

§6.1's table is left in place with a pointer here, rather than rewritten, so the mistake stays
visible.

## 7.3 Gaps that document listed as open, which §6 closes

| its stated gap | what §6 found |
|---|---|
| *"`makeReqTokenForCmd` — the permission gate every request depends on. Not in the slices read."* | **Found — §6.12.** `LoginCtrl`'s version: `{token: localStorage["<roomID>.tokenSite"], cmd, source:"webApp"}` |
| *"whose falsy return is the client-side permission gate"* | **❌ That claim is wrong.** All five definitions found (§6.2, §6.3, §6.11, §6.12) **build and return an object unconditionally.** It can never be falsy. Every `args && …` guard in the codebase is dead code, and **there is no client-side permission gate here at all** |
| *"`__al` — the page global holding the JWT. Not defined in the slices."* | **Found — §6.12.** Injected server-side into the page; `jwt_decode(__al)` yields `{email, name, permissions, sessions, type, perms}`. Assigned to `chatModel._al` and sent on socket login |
| *"`otherJWTSessions` — built server-side; whether it can span tenants is unknown."* | **Narrowed — §6.12.** It is `alObj.sessions`, i.e. **carried inside the JWT**, not fetched. So the question is not "what does the server build" but "**who signs that token and what do they put in `sessions`**" |
| *"The Marketplace pane. Never opened."* | **API shape found — §6.12.** `GET/POST {APIURL}/ptr_app/mp/v2/marketplaces/<sessID>` with a bearer token; entry shape `{sessionID, title, logoURL, published, locked, featured, hidden, tagline, description, images[], tags[], memberships[]}`; dashboard at `/mp/room-dashboard/<mpId>`. The **pane's markup** is still unopened |

## 7.4 What that document has that §6 does not — the tenant-billing layer

None of this is in `app.min.js`; it is all from the rendered manage page, and **most of it bears
directly on P-1 and P-3**:

- **`sess.subscriptionPlans`** — a JSON array of `{name, fee, desc, recommended}` with example fees
  **4.99 / 9.99**. **The tenant charges their own members.** Combined with §6.12's per-member Stripe
  fields, this is the whole billing picture: PTR bills the tenant, the tenant bills the member, and
  the member's `stripeSubscriptionStatus` sits on the room's user row.
- **`sess.stripeEmail`** — Stripe bound **per room**.
- **Three deny-by-default allow-lists:** `allowedMemberships`, `sess.allowedProducts`,
  `sess.allowedPerms` — each gates room entry when set. **This is the entitlement gate P-1 needs, and
  it already exists for *entry*.** The question P-1 turns into: why does it gate the door and not the
  alert fan-out.
- **🟢 `sess.linkedStreamsAPIKey` — this is how `sendLinked` works.** *"For pushing alerts and streams
  to other rooms, you can use the following settings. You need the other rooms ID and the API Secret
  of the other room to do this."* **Shared-secret federation between two rooms.** §6.10 flagged
  `sendLinked` as a hazard for P-1 without knowing the mechanism; it is a per-room API secret
  (§6.13's `apiSecret`, generated with `crypto.getRandomValues`) exchanged out of band. So
  cross-room alert delivery is **not** an operator function and **not** tenant-scoped — any two rooms
  that swap secrets are linked.
- **`modAdminLoginList`** — *"put any emails here of admins you want to allow access to the admin
  panel section"*. **An admin panel exists beyond the manage page**, gated by an email allow-list.
  With §6.13's `/users/v1/adminusers` table, that is two separate admin-access mechanisms.
- **Seat quota `1 / 2`** in the account page's Users column, and *"these counts are just for
  information purposes, does not affect your room's **limits**"* — **an authority above this page
  sets the limit.** Nothing in the client can read or write it.
- **Identity layering:** site id (JWT `6a627f92…`) · ownerID `6a628a98…` · room `6a628a99…` — **an
  owner/account layer in the data model**, which is the level P-3's enterprise account has to sit at.
- **v3/v5 provisioning is product copy with no control:** *"(DON'T TURN THIS ON, If PTR did not clear
  you for v3!! it will not work….)"* — an operator→tenant grant that the tenant UI describes but
  cannot perform.

**Its verdict on the operator console is a measurement worth preserving:** there is no SaaS operator
surface in the tenant's view or in the tenant's bundle, and *"absence from a tenant's view is not
absence from the product."* It also correctly refuses a false positive — the account page's
`moneybag` / `credit_card` strings are the **Intercom emoji picker**, not a money feature.

## 7.5 The Stripe dump — confirms §6.12 exactly, and adds three facts

`stripe-details-2026-08-14.json` (captured 2026-08-14 12:51 UTC from a Pixel 9) holds
`openStripeDetails`, `getStripeStatusClass` and `formatStripeAmount` as **verbatim source strings**.
They match §6.12 character for character — an independent confirmation of that read, taken from a
live scope rather than the bundle.

New:

1. **AngularJS `1.3.15`**, `debugInfoEnabled: true` — the framework version, and debug info left on
   in production (which is what let the capture walk `$scope`).
2. **`.stripe-mini` is the CSS class of the inline Stripe block on a user row**, and it renders only
   for a member who has marketplace/Stripe data. The captured room had none, so
   `stripeBlockRendered: false` — **the rendered Stripe markup is still uncaptured**, and the dump
   says exactly how to get it: *open a room that HAS a marketplace member (User List Actions →
   Marketplace Users) and re-run.*
3. **`user.isMa` = "is marketplace [member]" is now well-supported**, from two independent pointers:
   `hasStripeInfo` gates on it, and the Stripe block only renders for marketplace members. **Still
   not proven** — no capture shows the field being set — so it stays an inference, labelled as one.

The capture's role note is also useful: *"presenter or admin on the manage page — bulk actions
visible, **no Extra Admin Users**"*. So the **Extra Admin Users** panel (§6.13's `/users/v1/adminusers`)
is **role-gated and was not visible to the account that captured this.** That is a fourth privilege
tier — member, presenter, manage-page admin, and whoever can see Extra Admin Users.

---

# 8. `evidence-page.manageSession.html` — READ IN FULL, 2,718 lines, 2026-08-16

**Every gap §6 and §7 left open in the settings is closed by this file, and it was in the repository
the whole time.** §6.13 correctly predicted it would be here; §4 wrongly said some of it needed a
live capture.

## 8.1 ⭐ `tokcmd` and `appcmd` — CONFIRMED FROM MARKUP. No capture was ever needed.

```html
<a ng-click="pauseUserNotifs(user._id,user.userName,$index,'pause')">  PAUSE Mobile Notifs</a>
<a ng-click="pauseUserNotifs(user._id,user.userName,$index,'resume')"> RESUME Mobile Notifs</a>
<a ng-click="pauseUserNotifs(user._id,user.userName,$index,'unsub')">  Remove Mobile Notifs</a>

<li ng-if="sess.ptrMobileAppCaseByCaseEnabled">
  <a ng-click="manageMobileApp(user._id,user.userName,$index,'enable')">  Enable Mobile App</a>
<li ng-if="sess.ptrMobileAppCaseByCaseEnabled">
  <a ng-click="manageMobileApp(user._id,user.userName,$index,'disable')"> Disable Mobile App</a>

<li ng-if="sess.fileAccessCaseByCase">
  <a ng-click="manageFileAccess(user._id,user.userName,$index,'enable'|'disable')">Enable/Disable Files</a>
```

| command | argument | values |
|---|---|---|
| `updateUserFCMTok` | **`tokcmd`** | **`'pause'` · `'resume'` · `'unsub'`** |
| `manageMobileApp` | **`appcmd`** | **`'enable'` · `'disable'`** — gated on `sess.ptrMobileAppCaseByCaseEnabled` |
| `manageFileAccess` | **`appcmd`** | **`'enable'` · `'disable'`** — gated on `sess.fileAccessCaseByCase` |

**§6.1's inference about `manageMobileApp` was exactly right** — it is the per-member app toggle, and
`ptrMobileAppCaseByCaseEnabled` is the setting that reveals it. Queue item #3 is **closed**, and
`ptr1.json` is not needed for this.

## 8.2 🔴 P-1 — EVERY push gate in the reference, enumerated. **None is entitlement.**

Having now read the complete settings surface, the push decision chain can be stated exhaustively:

| # | gate | scope | where |
|---|---|---|---|
| 1 | `ptrMobileAppEnabled` / `customMobileAppEnabled` | room | *"Enable PTR app?"* |
| 2 | **`freeTrialsGetApp`** | room | *"Also enable the app for free trials?"* |
| 3 | `ptrMobileAppCaseByCaseEnabled` + **`user.hasMobileApp`** | **per member** | set by `manageMobileApp` |
| 4 | **`diasableFCMAlerts`** | room | ***"Disable PUSH Alerts?"* — a room-wide push kill switch** |
| 5 | **`user.alerterAppFCMUserOff`** | **per member** | set by `pauseUserNotifs`; renders a **red** phone icon on the row |
| 6 | `mobileAppExpireNotificationsDays` | room, time-based | *"If user does not log in this many days, we'll stop sending push notifications"* |
| 7 | `dontPush` | **per alert** | §6.10 |
| 8 | `isAlertOnly` | room type | *"Alerts only rooms are just rooms to receve push notifications and nothing else"* |

**Eight gates. Not one of them reads `stripeSubscriptionStatus`, `stripeCurrentPeriodEnd`,
`stripeCancelAt`, `allowedMemberships`, `allowedProducts` or `allowedPerms`.**

This is no longer an inference from sampling — the entire settings page and the entire row menu have
now been read, and **the reference has no path from subscription state to push delivery.** §6.12
found the data; this file proves nothing consumes it. **P-1 is confirmed as a wiring problem, and
gate #5 (`alerterAppFCMUserOff`, written by `updateUserFCMTok`) is the exact lever to drive from
billing.**

**A fifth delivery channel, previously unknown:**

```
Custom Alert POST  → sess.customClientAlertPostURL   "POST alerts to this URL endpoint"
Custom Alert secret → sess.customClientAlertPostSecret "secret PW for the endpoint above"
```

**Alerts can be POSTed to an arbitrary external endpoint.** So the full fan-out is: room pane · FCM
push · SMS (Twilio *or* Protexting) · email · Twitter/X · linked rooms · **an external webhook** ·
browser notifications. **Any P-1 gate has to sit before the fan-out, not on any one channel** — this
is the eighth reason that is true.

## 8.3 🔴 P-1 hazard — linked rooms are SIX settings, not one

```
linkedRoomAlerts               "Comma separated list of Room IDs of the rooms to PUSH our alerts to"
linkedRoomSwingAlerts          … swing alerts to
linkedRoomSwingAlertsOther     "Session ID to load swing alerts from"
linkedRoomDayTradeAlerts       … day trade alerts to
linkedRoomDayTradeAlertsOther  "Session ID to load day trade alerts from"
linkedRoomRecordings           "Session IDs of the rooms to load recordings from"
linkedStreamsAPIKey            "Other Room API Secret:"
```

§6.10 flagged `sendLinked` as a P-1 hazard; §7.4 found the shared-secret mechanism. **It is worse
than either suggested: alerts flow both ways and in three separate categories**, authenticated only
by an exchanged room secret. A member whose subscription lapsed in room B can receive an alert
originated in room A, and the swing/day-trade variants pull *from* other rooms as well as pushing
*to* them.

## 8.4 The settings that were missing — all found, all `saveSessField` field names

| setting | the UI's own words |
|---|---|
| **`diasableFCMAlerts`** | *"Disable PUSH Alerts?"* |
| **`sendFcmAlertsNew`** | *"New FCM Method?"* — **"Use pub/sub for notifications"** |
| **`invalidTokens`** | *"Comma separated list of invalid JWT tokens."* |
| **`ptrMobileAppCaseByCaseEnabled`** | *"App for Some Members?* Note above needs to ALSO be on" |
| **`customMobileAppV3Name`** | *"Custom app String"* |
| **`twillioApiSID` / `twillioApiToken` / `twilioPhone`** | Twilio SID / Token / Phone (**note: `twillio` with two Ls except `twilioPhone`**) |
| **`protextingSecretTok` / `protextingGroupIDs`** | Protexting Token / GroupID |
| **`pairSecretKey` / `hasAppPairLink` / `pairOKRedirect` / `pairErrorRedirect`** | the app pair link |
| **`useV3` / `useV5`** | *"(DON'T TURN THIS ON, If PTR did not clear you for v3/v5!! it will not work….)"* |

**`sendFcmAlertsNew` — the question §0 raised is answerable now, at least in shape.** It is a
**room-level boolean** that switches the push mechanism to pub/sub. **If that means FCM topics, then
under the new method per-member revocation is structurally impossible** — you cannot unsubscribe one
device from a topic the server broadcasts to. That was the design risk named in §0 and it is real.
**What the server actually does is still uncaptured**, so this is a flagged risk, not a finding.

**`invalidTokens` is a manual comma-separated text field**, not an automatic revocation list. §6.10
guessed `closeRoomAndRevoke` might populate it — **that remains unproven**; nothing in this markup
writes it. It is an admin typing JWTs into a box.

## 8.5 🟢 P-2 — a one-login-per-room setting ALREADY EXISTS

```
disalowMultiLogins        "If enabled, users could can only log in once per room"
disalowSporadicMultiLogins "prevents a user's connection to reconnect multiple times within a short time"
banIPList                 "Comma separated list of banned IPs"
```

**`disalowMultiLogins` is P-2's core requirement, already built** — but **per room, not per account**,
and it does not distinguish a computer from a phone. The owner asked for **one computer AND one mobile
device**, which this cannot express: it is a single boolean that would block the phone as a second
login.

**So P-2 is: extend an existing mechanism to be device-class-aware and account-scoped**, not build
one from nothing. Combined with §6.2's `isM` flag and §6.13's dedup-by-email, the shape is clear —
and per §6.3 the enforcement must move server-side because `isM` is client-asserted.

## 8.6 🟢 The app-pair provisioning endpoint — how external systems add members

```html
<div ng-show="sess.hasAppPairLink && sess.pairSecretKey">
  Sample link you would need to use to add each user: (replace email/name with the real user email/name
  value="https://chat.protradingroom.com/ptr_app/sessions/v2/addUser/{{sess._id}}/?sec={{sess.pairSecretKey}}&email=__userEmail__&name=__userName__"
```

**A GET endpoint that provisions a member into a room, authenticated by a room secret in the query
string**, with `pairOKRedirect` / `pairErrorRedirect` for the outcome.

**This is almost certainly the billing→room seam** — a membership platform sends a subscriber here on
purchase. **There is no corresponding `removeUser` link anywhere in this page.** Which is, in one
line, the whole of P-1: the reference has a documented way to *add* a member on subscribe and no
documented way to *remove* them on cancel.

## 8.7 ⭐ Two server-side documents that outrank everything read so far

1. **`/public/html/POST_ROUTE_API_DOCUMENTATION.md`**, linked from the Settings tab as
   *"API POST Routes Docs"* via `/public/html/api-docs.html?src=…`.
   **This is the reference's own API documentation, on the server, in markdown.** It would answer the
   server-side questions no client capture can. **Fetch this first — ahead of the source map.**
2. `/public/dist/maps/app.min.js.map` (§6.14).

## 8.8 🟢 How "v3 / v4 / v5" actually works — per-room alternative bundles

```
altCodeVendorJS  "(name if alt vendorJS. ie. 'vendor2.min.js'"
altCodeAppJS     "(name if alt vendorJS. ie. 'app2.min.js'"
customJanus      "(name if alt janusJS. ie. 'janus4.js'"
alt_roomjs       "(name if alt Room.js. ie. 'RoomRemoteRec.js'"
```

**A room can be served a different JavaScript bundle.** Together with `useV3` / `useV5`, that is the
mechanism behind the version question that has been open since `v5.md`: **the "version" of a room is
which bundle the server hands it**, set per-room by PTR, not by the tenant. The corpus decision
("we have to be all v4") is therefore a statement about which bundle the target rooms are served.

Also here: `useMediaMTX`, `mediaMTXClusterID`, `backupMediaMTXClustterID` (sic) — **the MediaMTX
switch**, which is what `src/lib/room-mtx.svelte.ts` in this repo corresponds to. And
`superClusterID` + `superClusterExpectedServerCount` — *"new supercluster scaling logic to scale the
session across the super cluster"*.

## 8.9 The user row — every field the manage table renders

**Icons:** `fa-folder-o` (`fileAccessCaseByCase && user.hasFileAccess`) · `fa-mobile fa-2x`
(`ptrMobileAppCaseByCaseEnabled && user.hasMobileApp`) · `fa-mobile`
(`!ptrMobileAppCaseByCaseEnabled && user.alerterAppTokens.length > 0`) · **`fa-mobile` in RED**
(`user.alerterAppFCMUserOff`) · mic / video / desktop / comment / pencil (`hasMic`, `hasCam`,
`hasScreen`, `hasAdminChat`, `canEditNotes`) · `fa-hdd-o` red (`denyArchivesAccess`).

**Role display — and it does not match the action integers:**

| `user.role` | shown |
|---|---|
| 0 | **Owner** (the row's whole Actions menu is `ng-hide`den) |
| 1 + `!nonPresenter` | Presenter |
| 1 + `nonPresenter` | **Admin** |
| 2 | Participant |
| 3 | CHAT MUTED |
| 4 | BANNED |

**`updateUser(5)` is labelled "Make Admin" but there is no role 5 in the display map** — the server
converts 5 into `role 1 + nonPresenter`. A third role vocabulary alongside the two in §7.2.

**Other row fields:** `user.mobilePairCode` (shown inline when `showPins`) · `user.phone` ·
`user.pw` ("PW set") · `user.type` · `user.note` · `user.inactive` ("*** INACTIVE USER ***") ·
`user.restrictPMUser` · `user.hideUserCount` · `user.hidePersInfo` · `user.inviteStatus == 'pending'`
→ an APPROVE button · **`user.discordUserId` / `user.discordUsername`** — **Discord integration**,
with a room setting `enableDiscord`.

> ⚠ **`user.isMarketPlaceUser`, not `user.isMa`.** The Stripe block is `ng-if="user.isMarketPlaceUser"`.
> §6.12's `hasStripeInfo(user)` — which tests `user.isMa` — **is not referenced anywhere in this
> template.** So either `isMa` is a second, shorter field or `hasStripeInfo` is dead code.
> **§7.5's inference that `isMa` means "is marketplace" is therefore withdrawn** — it is not
> supported, and the field that actually gates the UI has a different name.

The inline Stripe block renders: status label (coloured by `getStripeStatusClass`), `stripeLastPaidAt`,
**`stripeCurrentPeriodEnd` titled "Next Billing"**, `stripeLastPaymentFailureAt` (danger),
`stripeLastPaidAmount`, and a **Details** link to `openStripeDetails`.

## 8.10 Everything else of substance, compressed

- **Tabs:** Users · **Text List** (`ng-show="sess.twillioApiToken"` — **the SMS list tab only appears
  once Twilio is configured**) · Branding · **SSO Setup** (`ng-show="sess.authMode=='sso'"` — but the
  auth-mode list in §6.12 has **`jwt`, not `sso`**, so **this tab can never render**) · User Stats ·
  Settings.
- **Per-room third-party credentials override the hardcoded ones:** `imgurClientID`, `imgurApiKey`,
  `imgurRapidKey` — so the keys baked into the bundle (§6.8) are **fallback defaults**. Also
  `xuserAccessToken` / `xuserAccessTokenSecret` (X/Twitter), `slackPostURL`, `s3KeyID` / `s3KeySecret`
  / `s3Bucket` / `s3BucketFolderPath`, `vimeoClientID` / `vimeoClientSecret` / `vimeoToken`,
  `obsStreamKey`, `restreamToURL` / `restreamToURLKey`.
- **`positionsIframe` + `positionsIframeUrl`** — *"Enable positions iframe?"*. **This is R-2's
  position overlay**, and it is an iframe to an external URL, not a built-in.
- **`alertLabels`** — a JSON array `[{name, hash, color, bgcolor}]`, e.g. Day Trade / Swing Trade.
  With `hasSwingTradeAlerts` and `hasDayTradeAlerts` this is the alert-categorisation system.
- **Auto open/close:** `autoOpenTime` / `autoCloseTime` (*"Time in Military EST"*),
  `ignoreAutoOpenCloseOnWeekend`, `autoResetSession`, `doNotAutoSoftReset`.
- **Auto clear:** `chatAutoClear` / `alertsAutoClear` (*"11:45PM EST / 10:45PM Central"*),
  `chatAutoClearSpecialHour`, `chatAutoClearWeekend`.
- **Trial restrictions:** `chatDisabledForTrials`, `disablePMForTrials`, `freeTrialsGetApp`,
  `webinarPWFreeTrial`.
- **Four room passwords beyond login:** `deleteAlertPW`, `allRoomsWelcomeMatPW`,
  `needPasswordForUserNotes`, plus `webinarPW` / `webinarPW2` / `webinarPW3`.
- **Webhooks:** `login_webhook_url`, `logout_webhook_url`, `obsStreamSatusWebHookURL`,
  `runawayRecPostURL` (Slack), `customClientAlertPostURL`.
- **Moderation:** `hasProfanityFilter` + `ingnoreBadWordsList` + `additionalBadWordsList` (sic),
  `chatFloodDisabled`, `banIPList`, `sendReportEmails` + `reportEmail`, `enableDeleteLog`.
- **Newer chat features not in the register:** `enableReactions`, `enableQAReactions`,
  `enableEditMessage`, `enableEditAlerts`, `enableRTE`, `usersCanDeleteOwnMsgs`, `usersPublicReply`,
  `hasQAOnAlerts`, `advancedSearchAlerts`, `claimNickName`, `enableTokenBadges` (*"Badges will come
  from JWT token"*), `copyTrades`, `tipMeBtnEnabled` / `tipMeBtnTxt` / `tipMeBtnUrl`, `salesBanner`.
- **Per-room CSS injection:** `customCSS` and `darkThemeStyle`.
- **Recording:** `remote_recording`, `useFFmpegRecording`, `runawayRecMinutes` + `runawayRecAutoKill`,
  `hasSpeechRecognitionDisabled` (**closed captioning exists**), `dontStopRecOnMicMute`,
  `downloadRecordingsDisabled`, `recsInRoom`, `blinkingRec`, `recordingReminder`, `hideRecs`,
  `dontShowRecInfoToUsers`, `x264_encArgs`.

> **Reference bug:** the **Logout Webhook URL** field binds `editable-textarea="sess.login_webhook_url"`
> while displaying `{{ sess.logout_webhook_url }}`. **Editing the logout webhook overwrites the login
> webhook** and the field appears not to save. Copy-paste error in the markup.

### What this file did NOT answer

The **server's** behaviour — which of the eight gates it actually evaluates and in what order, what
`sendFcmAlertsNew` switches to, and whether `closeRoomAndRevoke` writes `invalidTokens`. All three now
have one plausible source: **`POST_ROUTE_API_DOCUMENTATION.md` (§8.7).**

---

# 16. 🛑 THE COMPLETE STYLESHEETS ARE ON DISK — and I recorded "not captured" instead

**Owner correction, 2026-08-16 10:40: *"if you read all the css files and folders i created you will
have a lot of answers that once again you're assuming. either on new-room-control or new-room folder
i created an entire css folder with every css stylesheet."*** **Correct. Located, and it invalidates
a class of claim I made repeatedly.**

## 16.0 🔴 CORRECTION TO §16 ITSELF — the manage stylesheet is ALSO IN OUR REPO, with a contract test

**Verified 2026-08-16 10:44, `cmp -s`: BYTE-IDENTICAL.**

```
~/Desktop/new-room-control/css-modals/styes.css          218,719 B
apps/controller/evidence-dumps/TIER1-fetched/styles.css  218,719 B   ← same file, in this repo since 2026-08-13
```

**And we already have `apps/controller/src/lib/manage-panel-bootstrap3-contract.test.ts` over it**,
which SHA-pins the Bootstrap 3 source and records a finding neither §15 nor §16 had:

> *"The product runs **TWO Bootstrap generations** on two different surfaces… **The room** is
> Bootstrap **5** — proven by a live capture, `class="tooltip fade show bs-tooltip-start"` with
> `data-popper-placement`, which only Bootstrap 5 emits… **The account, manage and login pages** are
> Bootstrap **3** — `div class="panel panel-default"` appears six times across the login-page
> captures. `.panel` is a Bootstrap 3 component; Bootstrap 4 replaced it with `.card` and Bootstrap 5
> has no `.panel` at all, so that markup cannot be 4 or 5."*

**That independently corroborates two things this session derived separately:** §10.2's finding that
the v4 room stacks Bootstrap 5, and §6.13's observation of BS5 class names (`me-1`, `rounded-pill`)
leaking into the AngularJS manage page.

**So §16's framing was too narrow.** The CSS was not only in the owner's folder — **it was in our own
repository, byte-identical, already analysed, and already pinned by a test.** That makes this the
**sixth** instance of the same failure, not the fifth, and the one with the least excuse.

**What §16 still gets right, and what is genuinely new:**

- ✅ The **Bootstrap 3 LESS sources** (35 files) are **only** in `new-room-control/css-modals/` —
  not in our repo. They are the definitive custom-vs-stock oracle.
- ✅ `complete-app-styles.css` (688,687 B, the v4 room) is **only** in `new-room/css/`.
- ✅ **The theme name `Naut` by `@geedmo`** (§16.5) closes a gap `control-plane-capture.md` refused to
  guess at — and it was discoverable in our own repo the whole time.

## 16.1 The corpus — 41 files the owner assembled, none of it consulted

| path | bytes | what it is |
|---|---|---|
| **`~/Desktop/new-room-control/css-modals/styes.css`** *(sic)* | **218,719** | **PTR's own `styles.css`** — the single first-party manage stylesheet. Same byte count as `gaps-closed.md:56`'s `TIER1-fetched/styles.css` |
| `~/Desktop/new-room-control/css-modals/bootstrap.css` | 144,638 | **full Bootstrap 3 source** |
| `~/Desktop/new-room-control/css-modals/bottstrap-min.css` *(sic)* | 147,852 | minified twin |
| **35 × `.less`** in the same folder | — | **Bootstrap 3's LESS SOURCES** — `buttons` `labels` `panels` `tables` `type` `forms` `navs` `modals` `dropdowns` `list-group` `scaffolding` `normalize` `utilities` `grid` `navbar` `tooltip` `popovers` `input-groups` `button-groups` `progress-bars` `pagination` `pager` `carousel` `jumbotron` `media` `thumbnails` `wells` `close` `code` `breadcrumb` `alert` `badge` `print` `responsive-*` `component-animations` |
| `~/Desktop/new-room/css/complete-app-styles.css` | **688,687** | **the complete v4 ROOM CSS**, captured 2026-07-30 |
| `~/Desktop/new-room/docs/source/styles.d622cb9ed2bbc221.css` | 444,545 | the v4 room's built stylesheet |
| `~/Desktop/new-room/docs/source/app-st-message.component.css` | 4,901 | one component's CSS |

**The LESS sources are better evidence than any capture** — they carry the variables and the
authored structure, not just a resolved cascade.

## 16.2 What this closes that I had recorded as "not captured"

**Verified from source, all four sheets:**

| claim I made | source verdict |
|---|---|
| §15.8: *"`.btn-secondary` — the class is in the markup but nothing readable defines it"*, with a hedge that a cross-origin sheet *"could in principle"* carry it | **PROVEN DEAD. `btn-secondary` = 0 in `buttons.less`, 0 in `bootstrap.css`, 0 in `bottstrap-min.css`, 0 in `styes.css`.** It is a Bootstrap **4** class name in a Bootstrap **3** build. The hedge is gone — *"Close Add Admin User" renders as a bare user-agent button and copying it faithfully copies a bug* |
| §15.8: `.btn-inverse` *"exists only in styles.css; Bootstrap 3 has no such class"* | **CONFIRMED, and quantified: 58 occurrences in `styes.css`, 0 in Bootstrap.** Not a one-off — a load-bearing custom class |
| §15.9: `label-orange` *"is not stock Bootstrap 3"* | **CONFIRMED: 6 in `styes.css`, 0 in `labels.less`, 0 in `bootstrap.css`** |
| §15.9/§15.12: *"heading CSS is uncaptured — 'this heading has no rule' is unprovable"* | **FALSE.** `type.less` carries the heading block at lines 9–26 and `h3, .h3 { font-size: @font-size-h3; }` at line 49. **The h3's 24px / 500 / 26.4px is derivable from source, not merely observed** |
| §15.8: *"No :hover, :focus, :active, :visited or :disabled rules appear anywhere in this slice"* | **Those states are all in `buttons.less` and `bootstrap.css`.** They were never missing — the *capture* only collected rules matching each element's current state |
| §15.12: *"2 cross-origin stylesheets are unreadable, so a zero in the css column is weaker"* | **Only true of the capture.** The sheets themselves are on disk |

## 16.3 The rule this earns

**"Not captured" is a statement about ONE artefact. It is not a statement about the evidence
available.** Before writing it, check whether the underlying asset exists somewhere on disk —
especially in `~/Desktop/new-room/` and `~/Desktop/new-room-control/`, which the owner has been
assembling deliberately.

This is the **fifth** instance of the same family of error in this session, and the sharpest, because
the answer was in a folder created for exactly this purpose:

1. §10 — v4 CSS tokens re-derived when `tokens.css` already held them
2. §11 — a 6,600-line decode corpus never consulted
3. §12.3 — R-15 called "built" from a truncated citation
4. §13 — `api-post-routes.md` called "one fetch away" while sitting in the repo
5. **§16 — "not captured" written five times over stylesheets that were on disk**

## 16.5 🟢 `styes.css` lines 1–260 — THE THEME IS IDENTIFIED

**The file's own banner, verbatim from lines 9–17:**

```css
/*!
 * Naut - Bootstrap Admin Theme + AngularJS
 * Author: @geedmo
 * Website: http://geedmo.com
 * License: https://wrapbootstrap.com/help/licenses
 */
```

**`control-plane-capture.md` §A listed this as an explicit gap and refused to guess:**

> *"The AngularJS admin theme's NAME and vendor are not in the capture… I grouped 16 states as theme
> leftovers on internal evidence (generic filenames, shell reuse, 'demo' in a filename, absence of
> product URL parameters) — **I am NOT naming the theme product, because that name is not in the
> evidence.**"*

**✅ CLOSED. The theme is `Naut`, by `@geedmo`, licensed through WrapBootstrap.** That vindicates the
16-state "theme leftover" grouping in §15.3 — the mailbox, `dashboard`, `dashboard-alt`, `columns` and
`setting-demo` routes are Naut's own demo screens, and their absence from our build is correct.

**Also: `@import url(//fonts.googleapis.com/css?family=Roboto:500,400italic,100,700italic,300,700,400)`
is LIVE at line 2** — the manage app loads **Roboto** from Google Fonts. (The v4 room's equivalent
imports were commented out and it uses **Lato** — §10.1/§10.2. **Two different font stacks between the
two apps.**)

### 🔴 The accessibility defect is worse than §15.8 recorded

```css
*:focus { outline: 0 !important; }      /* lines 66-68 */
a       { outline: none !important; }   /* lines 69-71 */
```

§15.8 recorded this as *"`styles.css .btn { outline: none !important }` and `a { outline: none }`"*.
**It is a UNIVERSAL selector — `*:focus`.** Every focusable element on the manage app loses its focus
ring, not just buttons and links. **Do not reproduce.**

### Sourced at last — three values §15 could only observe

| §15 observation | the rule that produces it |
|---|---|
| sessions header row **60.5px** tall, padding `20px 8px` | `.table > thead > tr > th { border-bottom-width: 1px; padding-top: 20px !important; padding-bottom: 20px !important; }` (lines 189–193) |
| `.btn-default` border **`#e6e9ee`** — *"not Bootstrap's #ccc"* | `#e6e9ee` is a theme-wide token: also `.page-header{border-bottom-color:#e6e9ee}`, `.nav-tabs-alerts>li>a{border:1px solid #e6e9ee}`, `.tab-content{border-color:#e6e9ee}`, `.popover{border-bottom:2px solid #e6e9ee}` |
| the `.ng-hide` rule with `href: null` | **A distinct rule.** `styes.css` lines 58–65 define the **cloak** set (`[ng\:cloak]`, `[ng-cloak]`, `[data-ng-cloak]`, `[x-ng-cloak]`, `.ng-cloak`, `.x-ng-cloak`) — **without** `.ng-hide:not(.ng-hide-animate)`. The injected sheet §15.12 found **adds** that selector. **Both exist; they are not the same rule.** Do not merge them |

### Other facts from the first 260 lines

- **`.glyphicon` is remapped onto FontAwesome** — `font: normal normal normal 14px/1 FontAwesome`,
  with `glyphicon-chevron-left/right/up/down` overridden to `\f053` / `\f054` / `\f077` / `\f078`.
  **Bootstrap 3's icon font is not shipped; Glyphicon class names resolve to FA glyphs.**
- `[ui-sref], [data-ui-sref] { cursor: pointer }` — and the same for `.nav-pills, .pagination,
  .carousel, .panel-title a`.
- `.form-control { padding-left: 18px; padding-right: 18px; box-shadow: 0 0 0 #000 !important }` —
  **18px horizontal padding, not Bootstrap's 12px.**
- `.form-control, .input-group-addon { border-color: #dbd9d9 }`; `.input-group-addon` background
  `#f8f9fb`; `.input-sm, select.input-sm { height: 31px }`.
- `fieldset { padding-bottom:20px; border-bottom: 1px dashed #eee; margin-bottom:20px }` with
  `:last-child` clearing the border — **the manage settings tab's section rule.**
- Every text input gets `-webkit-appearance: none`.
- `.dropdown-menu { border-radius: 2px; font-size: 13px }` — **13px, not 14px.**
- `.popover`, `.progress`, `.jumbotron`, `.well`, `.thumbnail` all get custom shadows;
  `.progress` and `.popover` get `border-radius: 2px`.
- `.list-group { line-height: 1.3 }` and `.list-group-item { padding: 10px }` — **relevant to the
  API-key restrictions editor's two `list-group` lists (§15.11).**
- `.mediaLI { margin-top: 0; font-size: 14px }` — the roster row class from §6.2.

## 16.6 `styes.css` lines 260–559 — the layout system. **Two §15 "uncaptured ancestor" gaps close.**

### 🟢 CLOSED — where the 1140px comes from

§15.9 recorded: *"The parent element that constrains `.app` to 1140px is not captured. The `.app`
rule declares `width:100%`, so the 1140px measured width comes from an **uncaptured ancestor** (its
selector, class and rules are unknown)."*

```css
.layout-boxed .app-container > section { max-width: 1140px; margin: 0 auto; }   /* lines 556-559 */
```

**✅ That is the ancestor. `.layout-boxed` on the body/container is what produces the centred 1140px
column** — and it explains §15.9's derived arithmetic (424.5px of slack each side of 1989px) without
any inference.

### 🟢 CLOSED — the footer that `.footer-hidden` suppresses

§15.9 noted the computed `padding-bottom: 0` *"proves an ancestor carried `.footer-hidden`"* but had
no footer to point at:

```css
.app-container > footer { position: absolute; left:0; right:0; bottom:0;
  height: 60px; padding: 15px; border-top: 1px solid #f4f5f5;
  background-color: #f0f0f0; z-index: 210; }
.app { padding: 15px; padding-bottom: 80px; width: 100%; }   /* lines 471-475 — exactly as captured */
```

**✅ The footer is 60px tall; `.app` reserves 80px for it.** With the footer shown, restore the 80px.

### The manage app's layout contract — complete

| | value |
|---|---|
| **sidebar (`aside`)** | **`width: 240px`**, `top: 50px`, `bottom: 0`, `position: absolute` |
| `.aside-offscreen` | `aside { margin-left: -240px }`, and `section`/`footer` drop to `margin-left: 0` |
| desktop (`≥768px`) | `section` and `footer` get `margin-left: 240px` |
| **z-index stack** | header **410** · aside **310** · footer **210** · section **110** |
| `.layout-fixed` | header + aside `position: fixed`; header `width:100%`; section `padding-top: 50px` |
| **`.layout-boxed`** | **`section { max-width: 1140px; margin: 0 auto }`** |
| header shadow | `0 0 4px rgba(0,0,0,.14), 0 4px 8px rgba(0,0,0,.28)` |
| aside shadow | `0 0 4px rgba(0,0,0,.14), 2px 4px 8px rgba(0,0,0,.28)` |
| navbar height | **50px** — `line-height: 50px` on the brand, `height: 50px` on `.mobile-toggles` |
| brand colour | `#fafafa`; margin `0 50px` → **`0 15px` at ≥768px** |
| `.app-view-header` | `font-size: 23px`, `margin: 20px 0 30px`; `> small` `12px` / **`#8394a9`** |

> ⚠ **The manage sidebar is 240px; the v4 ROOM's is 250px (§10.2).** Different apps, different
> layout constants — **do not share the value between them.**

**Shared palette confirmed across both apps:** `rgba(54,63,69,.05)` is the topnavbar hover — the same
`#363f45` as `.btn-inverse` (§15.8), and **`#8394a9`** here is the room's `--lightTheme-date-color`
(§10.2). **One design system, two Bootstrap generations.**

**All layout media queries key on `min-width: 768px`** — one breakpoint, not a scale.

### ✅ IMPLEMENTATION AUDIT — we reproduce the geometry, but attribute it to the wrong mechanism

`layout-boxed` is **0 occurrences** in `apps/controller/src`. **That is not a gap** — we reproduce the
result from measured rects, documented throughout:

```
account.css:318   /* .center-block.mt-xl — 424.5,80,1140x953.992. */
account.css:331      "…so padding would leave it 1140 wide at x=424.5. The reference measures…"
AppFooter.svelte:2   424.5,1033.992,1140x91 — a sibling of the page content INSIDE the…
```

**Our numbers are right.** Rule 6c again — an identifier search would have called this missing.

> ⚠ **One attribution to correct.** `account.css:743` says *"It sits INSIDE the **1170** container in
> the reference"*. **Bootstrap 3's `.container` is 1170px at the `lg` breakpoint, but
> `.layout-boxed .app-container > section { max-width: 1140px }` overrides it** — which is why every
> measurement in our own comments is **1140**, not 1170. The measured values are correct; the
> explanatory comment names the wrong constraint. **Cheap fix, and worth making before the dumps are
> deleted**, because after that the comment is the only record of the reasoning.

**Read: `styes.css` lines 1–559 of 11,347.** Formatted, no line over 300 chars — **read in ~300-line
slices with `Read(offset, limit)`.** Component banners (`/** Component: <name>.less */`) mark the
section boundaries; seen so far: `bootstrap-reset`, `top-navbar`, `layout`.

## 16.4 ⭐ What these files are FOR — the rebuild, not just the audit

`styes.css` (218,719 B) is **PTR's entire first-party manage stylesheet.** §15.8's account-page tokens
— `#e6e9ee`, `#363f45`, `.mb`, the `.text-center !important` escalation — all come from it, and the
capture only ever showed the handful of rules that happened to match twelve elements.

**This is the source of truth for the controller's visual match**, and it has not been read. Likewise
`complete-app-styles.css` (688,687 B) for the room.

**Added to the resume queue as items 0a and 0b — ahead of the remaining decoded docs**, because they
answer questions those docs explicitly leave open.

---

# 15. 🟡 P-3 — `control-plane-capture.md`, lines 1–280 of 1,243. **PARTIAL. NOT ANSWERED.**

> ⛔ **Owner correction, 2026-08-16 10:22: *"stop assuming, and only work based off of hard evidence
> and you will only have the entire picture once you finish reading all the files."***
>
> **This section was headed "✅ P-3 ANSWERED". That was an assumption and it is withdrawn.** It was
> written from **280 of 1,243 lines of one document**, with `admin-surface.md` (1,035),
> `website-ptr1-prt2-full-read.md` (1,180), `gaps-closed.md` 330–991 and four more artefacts unread.
>
> **The capture's own author hedged where I did not:** *"a statement about THIS BUILD as served to
> THIS ACCOUNT — not proof that PTR operates without one."* I turned that into "does not exist".
>
> **What is actually established** is narrower and still valuable: **no operator-level term is
> registered in the 31 routes of this build, and the router carries no authority metadata at all.**
> Whether an operator console exists elsewhere — a different build, a different account, a separate
> application — **is not settled by this document and is not settled until every file is read.**
>
> **No P-item is closed until the reading is finished. That applies to P-1 and §13 as well.**

## 15.1 The finding, and why it is trustworthy

`collect-control-plane.js` v1, run **2026-08-15 06:47:42 UTC** on `#/page/welcome` **as the account
owner**. 118,757 bytes, **every line read**, 418 facts each carrying its JSON path.

**31 states were read from the LIVE injector** — `injector.get('$state').get()` — not from a source
listing. So this is the route table actually registered in the served bundle.

> **"No operator-level term appears anywhere in the 31 states this build registers. On the
> application's own self-description, the control plane is not part of this bundle. This is stronger
> than the absence of a screenshot, and it is still a statement about THIS BUILD as served to THIS
> ACCOUNT — not proof that PTR operates without one."**

> 🔴 **CORRECTION, 2026-08-16 10:25 — I wrote this paragraph wrong, and the source document warns
> against precisely the error I made.**
>
> **I listed `admin` as one of the swept terms. `admin` IS NOT IN THE LIST.** The 20 terms are:
> `superadmin` · `super_admin` · `isSuperAdmin` · `platformAdmin` · `ptrAdmin` · `sysadmin` ·
> `impersonat` · `suspend` · `entitle` · `tenant` · `quota` · `operator` · `staff` · `customers` ·
> `accounts` · `crossAccount` · `allSessions` · `allAccounts` · `billing` · `console`.
> **Every admin-shaped term is a compound. There is no bare `admin`.** I assumed it was there.
>
> The document's own words, verbatim: *"A reader skimming twenty zeros would conclude there is no
> admin concept in this build, **which is flatly wrong**."* The same capture holds
> `panes.extraAdminUsers.heading.text = "Extra Admin Users"` and
> `namedControls.adminUserAddToggle` with node texts **"Add Admin User"** / **"Close Add Admin User"**,
> plus `adminUserAddForm` with `ng-submit="addAdminUser()"`.
>
> **The zeros must be quoted as "no SUPER/PLATFORM/SYS-admin token", never as "no admin concept".**

Twenty terms were swept, none of them a bare `admin` (see the correction above). All 20 score **0 on
all four route-registry surfaces**. Three positive controls hit — `session` 20, `user` 61, `room` 33 —
so `census.trustworthy = true`.

**Two of the seven surfaces are worthless as evidence, and the document says so:**

| surface | why a zero means nothing |
|---|---|
| **`stateControllers`** | **0 for all 23 entries, including the positive controls.** The whole haystack is **three values, two distinct strings** — `LoginCtrl` and `KickedCtrl`. *"Do not cite it as evidence of anything."* |
| **`modules`** | **0 for all 23, including the controls.** It searched ~216 **vendor module names**, not application source — no controller, service, directive or factory name is in it. *"Its zeros must never be quoted as 'no operator code in the bundle'."* |

**Three term-list defects that limit the sweep further:**

- **`accounts` (plural)** scores 0 while the page's own nav item is **`Account` (singular)** — a token
  result, not a semantic one.
- **`allSessions`** scores 0 while the page literally renders **`"Total Sessions: 1"`**.
- **The list omits** `presenter`, `moderator`, `host`, `owner`, `role`, `permission`, `ban`, `kick`,
  `refund`, `invoice`, `subscription`, `audit`, `log`. **The capture says NOTHING about any of them.**

**And `room` is the calibration that matters:** 25 DOM hits, 8 CSS hits, **0 on every route-registry
surface** — in an application called ProTradingRoom. **A route-registry zero does not mean the concept
is absent from the product.** That single row is the best available measure of how weak this evidence
is, and it is the reason §15's original heading was withdrawn.

**Why the route registry settles what a DOM capture could not:** a single-page app must register
every screen it can ever show **at boot, before it knows who you are.** `admin-surface.md` §D
correctly said the control plane *"cannot be matched, only designed"* but could not distinguish
*there is no console* from *this account cannot see one*. The registry can.

## 15.2 🔴 The strongest finding is not the headline — it is the authority model

> **`states[*].data` is `null` on ALL 31 states, with zero exceptions.** Not one route carries
> `requiresAuth`, a role, a permission tag or a page title.

**The legacy application expresses no authority whatsoever in its router.** Everything that gates
presenter or admin capability is decided **server-side or inside a controller.**

**There is no route-level role model in the reference to copy, and looking for one is wasted effort.**

That is a direct instruction for P-2 and P-3: **authority is server-side by necessity, not by
choice** — which is also this repository's own standard. The reference agrees with us by omission.

## 15.3 What the 31 states actually are

| group | count | notes |
|---|---|---|
| **dead theme leftovers** | **16** | `app.*`, `app-dock.*`, `app-fh.*` (mailbox, columns), **`app.users`**, **`app.chat`**, `page.setting-demo` |
| **ProTradingRoom product** | **14** | `page`, `.welcome`, `.stats`, `.manageSession`, `.mockstats`, `.register`, `.forgot-password`, `.user-forgot-password`, `.change-password`, `.user-change-password`, `.login`, `.recordings`, `.avatarSelect`, `kicked` |
| framework artifact | 1 | the `""` root |

**Just over half the legacy route table is dead theme.** `app.users` and `app.chat` *look* alarming
and are theme demos — `app/views/users.html`, `app/views/chat.html`, no URL parameters, same shell as
the mailbox demo. **This confirms §6.7's dead-mailbox finding from a second direction.**

**Route facts that bear on our build:**

- **`#/page/login/:sessionID`** — attendees arrive at a **session-scoped** login, not a global one.
  This is what our room join link corresponds to.
- **`kicked`** is a top-level route **outside the app shell** — an ejected user loses the room chrome
  entirely. Our removal flow needs an equivalent terminal page.
- **Two complete parallel password flows**, split at file level: account-holder vs room user
  (`forgot-password` / `user-forgot-password`, `change-password/:uid` / `user-change-password/:uid`).
  **Two distinct identity classes** — §6.1 saw the same split in the endpoints. **Do not assume one
  is dead.**
- **`page.mockstats` ships a screen whose own filename says "mock" to production users**, at
  `/mstats/:sessionID`, taking the real product parameter. **Do not port it** — our standard is honest
  data or an explicit pending state.
- Names, URLs and templates are **not derivable from one another**: `page.avatarSelect` → `/avatars`
  → `page.avatars.html`; `page.recordings` → `/recs`. **Never infer one from another.**
- `page.recordings` takes **no** session parameter — the list is scoped server-side.

## 15.4 What P-3 has to work with — and it is pane-level, not route-level

> **"An admin-user concept therefore exists in this product as a PANE on `page.welcome`, with no
> route of its own. Searching the route registry alone would have concluded 'no admin concept', and
> that conclusion would have been wrong."**

**The Account page (`page.welcome`) hosts every control-plane-ish surface as panes:**
`apiKeys` · `badges` · **`extraAdminUsers`** · `sessions` · `marketplace`.

That matches §6.12/§6.13 exactly — `/users/v1/apikeys`, `/users/v1/adminusers`, the marketplace API.
**Our account screen must consolidate the same panes on one route.**

**Negative results, recorded rather than inferred:**

| | finding |
|---|---|
| cross-account view | **Not registered in this build.** Closed on the strongest available evidence |
| billing | **0 occurrences of `billing`** anywhere in the registry. `page.register` exists, so signup is self-serve — **payment happens outside the SPA entirely** |
| account lifecycle | **`lifecycleControls = []`** — no suspend / close / downgrade / delete control |
| marketplace pane | hidden by scope flag `disableMarketplace: true` + global `__disableMarketplace: 'true'`. **Never rendered — contents still uncaptured** |

## 15.5 🟡 "New Room" — the control EXISTS in the markup; only the reveal is untested

```
refusedClicks[0..4]  →  element text "Sessions",  ng-click = "showNewRoom=showNewRoom+1;"
```

**The button itself was captured statically and is not in doubt** —
`panes.newRoomRevealFoundBy = "ng-click attribute (page.welcome.html:333-336)"`:

```html
<a type="button" ng-click="createNew()" class="btn btn btn-warning mb btn-block">New Room</a>
```

`visible: false`, `rect {0,0,0,0}`. Also indexed as `namedControls.newRoomCreate`, count 1, with its
computed Bootstrap `btn-warning` values (`background rgb(240,173,78)`, `border rgb(238,162,54)`,
`width 100%`, `margin 0 0 10px`, `padding 6px 12px`, `border-radius 4px`).

> ⚠ **The refusal was a COLLECTOR DEFECT, not a site property.** The denylist matched the word
> **`New` as a SUBSTRING inside the identifier `showNewRoom`** in `ng-click="showNewRoom=showNewRoom+1;"`.
> The clicked element's own text is **"Sessions"** and the handler is a **pure client-side counter
> increment** — it creates, sends and mutates nothing. **A word-boundary denylist would not have
> fired.** Fix the denylist before re-running, or the same five clicks will be refused again.

**So: the New Room control is proven to exist. Whether five clicks is the real threshold, and what
the revealed panel contains, are UNCAPTURED — not absent.** `revealed: false` with
`clicksDelivered: 0` is an untested state, not a negative result.

## 15.6 🔴 `statesWithNoLinkOnThisPage` counts `ui-sref` ONLY — and has a proven false negative

The metric is *"non-abstract state with no **ui-sref** on this page"*. It ignores raw `href`s,
`ng-click` transitions and `$state.go` call sites.

**Proven instance:** `page.manageSession` is listed as unlinked, while the same capture holds
`namedControls.sessionManageLink` — selector `a[href^="#/page/manageSession/"]`, count 1, node text
**"Manage"** — a working navigation rendered on that very page.

**Any of the other 22 entries could be reachable by a means this metric cannot see.** Do not read the
list as "unreachable".

Of the 23: **9 are expected** (parameterised or programmatic), 1 is the parent of the current state,
3 are expected-absent auth siblings, **8 are the wholly unlinked theme families**, and **2 are
production-registered oddities** — `page.setting-demo` and `page.recordings`.

## 15.6b The verdict's own scope, verbatim from the gaps list

> *"The verdict is scoped by its own wording to **THIS BUILD** (`app.min.js v=1786262947549`) as
> served to **THIS ACCOUNT** at **2026-08-15T06:47:42.456Z**. It is not evidence about other
> accounts, other builds, a different UA, or a **separate operator origin/subdomain** — none of which
> were probed."*

**A separate operator subdomain was never probed.** That alone means P-3 cannot be closed from this
document, and is why the section heading was withdrawn.

**The census stores COUNTS ONLY** — no selector, offset or locator anywhere. So the one positive
signal in the entire sweep, `console` (dom 4, css 1), **cannot be attributed to any element from this
file.** The capture also holds no raw-DOM surface, so even reading every pane would not locate them.

## 15.6 ⚠ The capture file must never enter this repository

It contains **eight live HS256 JWTs** — full header, payload *and* signature — because the Launch
anchor `ng-href="/session?id={{s.uuid}}&jwtSite={{tokSite}}"` put a site token into every serialised
pane. The payload base64-encodes the owner's name, email and user id.

**The collector's redaction masked emails and 24-hex ids and walked straight past base64url.** Fixed
in commit **`4928f47`** (`maskJwt` + `maskTokenParams`, asserted against raw output). **The lesson is
mask at CAPTURE time**, not by trusting whoever handles the file later.

## 15.7 Caveats this document raises about ITS OWN evidence

- **The UA is a Pixel 9 mobile string at a 1989×1265 desktop viewport.** If the app branches on UA,
  every DOM/CSS claim in the whole capture may be the mobile code path. **Flagged, not resolved.**
- **29 of 31 states were never rendered** — everything about their content is *not captured*, which
  is different from *does not exist*.
- **Resolve function bodies are not captured.** If any authorisation happens in a resolve, this
  capture cannot see it. `data: null` proves only that no *declarative* route metadata exists.
- Per-view configuration is uncaptured, so **the 28 states with `controller: null` are not proven
  controller-less.**
- Two of eleven stylesheets are cross-origin and unreadable, so **any "this class has no CSS rule"
  conclusion is unsafe for video.js and toaster classes.**

## 15.8 §C — the eleven named Account-page controls, read in full (lines 448–650)

**This is the control surface P-3 is rebuilding.** Located by `ng-click` / `ng-submit` handler, not by
wording, *"because the four account panes carry no id, their headings carry no class, and the panes
use `panel pane-default` — not Bootstrap's `panel-default`."*

> **None of them was clicked.** *"`page.welcome.html` is a template and contains no function bodies,
> so for every handler here the question 'does invoking this mutate anything?' is genuinely
> unanswered."* An adversarial review cleared six as read-only from their labels and **every one of
> those judgements was refuted: a name is not a body.**

| control | handler | element, verbatim |
|---|---|---|
| `marketplacePerSession` | `manageMarketplaceSession(s._id, s)` | `<a ng-hide="disableMarketplace" class="btn btn-sm btn-default ng-hide"><i class="icon fa fa-credit-card"></i> Marketplace</a>` — **HIDDEN**, `disableMarketplace` truthy |
| `apiKeyCreate` | `createApiKey()` | `<button type="button" class="btn btn btn-success mb">New Api key</button>` — **label is exactly `"New Api key"`**, lowercase `p`, lowercase `k`. Takes **no arguments** |
| `apiKeyDelete` | `deleteApiKey(k._id)` | `<a href="" ng-click="deleteApiKey(k._id)">delete</a>` — **unstyled lowercase text link**, no class at all |
| `adminUserAddToggle` | `showAddAdminUser=!showAddAdminUser` | **two** elements: `btn btn-success mb` **"Add Admin User"** and `btn btn-secondary mb ng-hide` **"Close Add Admin User"** |
| `adminUserAddForm` | `addAdminUser()` (**`ng-submit`**, not click) | three `form-group`s: Name / Email / Password |
| **`adminUserRemove`** | `removeAdminUser…` | **count 0 — matched nothing.** Not captured ≠ does not exist |
| `sessionsSortByUUID` | `sortByUUID()` | `<th ng-click="sortByUUID()">Session ID<div class="icon fa fa-sort-alpha-asc"></div></th>` |
| `sessionsSortByName` | `sortByName()` | same shape, `class="text-center"`, label `Name` |
| `archivedRoomsToggle` | `toggleArchivedRooms()` | `<span ng-show="!showArchivedRooms">Show</span> <span ng-show="showArchivedRooms" class="ng-hide">Hide</span> Archived` |
| `sessionManageLink` | *(none — pure `href`)* | `<a href="#/page/manageSession/«hex 24»" class="btn btn-sm btn-inverse"><i class="icon fa fa-cogs"></i> Manage</a>` |
| `newRoomCreate` | `createNew()` | `<a type="button" class="btn btn btn-warning mb btn-block">New Room</a>` @ `page.welcome.html:333-336` |

### 🟢 §4's open gap — the `adminusers` `perms` vocabulary — is closed, and the answer is "the client never sets it"

The add-admin form collects **exactly Name, Email, Password**:

```html
<input type="text"     ng-model="adminUser.name"     placeholder="Enter name"     required>
<input type="email"    ng-model="adminUser.email"    placeholder="Enter email"    required>
<input type="password" ng-model="adminUser.password" placeholder="Enter password" required>
<button type="submit" class="btn btn-primary">Add Admin User</button>
<button type="button" class="btn btn-default"
        ng-click="showAddAdminUser=false; adminUser={name:'',email:'',password:'',perms:{}}">Cancel</button>
```

**`perms` exists on the model — and the form NEVER exposes it.** §6.13 found `addAdminUser` posting
`args.perms = $scope.adminUser.perms || {}`. **It is always `{}`.** There is no role picker, no
permission checkbox, nothing.

**So the `perms` vocabulary cannot be recovered from any client artefact, because no client ever
populates it.** §4's row is closed as *unanswerable from the client* rather than *not yet found* —
which is a different and more useful state. If P-3 needs admin roles, **we are designing them, not
matching them.**

### Account-page design tokens — exact, at viewport 1989×1265 @2x

| token | value |
|---|---|
| content gutter | **x = 440.5** (shared by `apiKeyCreate`, `adminUserAddToggle`, `sessionsSortByUUID`) |
| base `.btn` | `padding 6px 12px` · `14px/1.42857` · `border 1px solid transparent` · `radius 4px` |
| small `.btn-sm` | `padding 5px 10px` · `12px/18px` · `radius 3px` · height **30px** |
| **`.btn-default` border** | **`#e6e9ee`** — *not* Bootstrap's `#ccc`. **Using #ccc would be visibly wrong** |
| green (`btn-success`) | `#5cb85c` on `#4cae4c`, white — "New Api key" **34px** tall, "Add Admin User" |
| orange (`btn-warning`) | `#f0ad4e` on `#eea236`, white, **`width:100%`** via `btn-block` |
| dark (`btn-inverse`) | `#363f45` fill **and** border, `color:#fff !important` — **`.btn-inverse` exists only in `styles.css`; Bootstrap 3 has no such class** |
| `.mb` | `margin-bottom: 10px !important` |
| link | `#337ab7`, no underline |
| font stack | `"Helvetica Neue", Helvetica, Arial, sans-serif` — all 12 nodes |
| sessions table | starts `x=440.5, y=191.8`; header row **60.5px** tall (a `styles.css !important` override, not Bootstrap); col 1 **247.8px**, col 2 **173.3px**; header padding **20px 8px**; only the **top-left** corner rounded 3px |

**Only two stylesheets own any rule here** — `bootstrap.min.css` and `styles.css` — plus one inline
Angular sheet for `.ng-hide`. The other nine linked sheets contribute **zero** rules.

> ⚠ **Two reading traps in this data.** Every rule sourced from `styles.css` appears **exactly twice,
> back to back**, in every node's rules array — **halve every `styles.css` count.** And the arrays are
> ordered by **stylesheet source order, not specificity** — *"Do not read cascade winners off the
> array order; read the computed block."*

### 🔴 Five accessibility defects in the reference — do NOT reproduce

1. **Focus outline suppressed site-wide** — `styles.css .btn { outline: none !important }` and
   `a { outline: none !important }`. *"An accessibility regression we should NOT copy."*
2. **Sortable `<th>` with no `button`, no `role`, no `tabindex`** — the sort affordance is not
   keyboard reachable. Use a button inside the th.
3. **`<a type="button">` with no `href`** (`newRoomCreate`) — `type` is meaningless on an anchor and
   an hrefless anchor is not focusable. Use a real `<button>`.
4. **`archivedRoomsToggle` has no `type` attribute** — inside a form it would default to `submit`.
5. **`.btn-secondary` is a DEAD CLASS** in this Bootstrap-3 build. The "Close Add Admin User" button
   renders as the **UA-default grey** (`#efefef`, transparent border). *"Reproducing it faithfully
   means reproducing a bug."* Give it a real style.

Also: **not one of the 12 nodes carries an HTML `id`.** Any selector we write against this reference
must key off class or `ng-attribute`.

### 🔴 A COUNT OF 0 IN A DOM CAPTURE IS A STATEMENT ABOUT STATE, NOT ABOUT EXISTENCE

**Owner correction, 2026-08-16 10:28:** *"sometimes it may show 0 but its not because it doesn't
exist, because there was a member or an extra admin added."* **Correct, and I have the hard evidence
that proves it on the very control I got wrong.**

I recorded `adminUserRemove` — **count 0** — as *"not captured, not proven absent."* That was too
weak. **The removal control demonstrably EXISTS**, and §6.13 had already read its implementation out
of `app.min.js`:

```js
$scope.removeAdminUser = function(adminUserId, name){
  bootbox.confirm('Remove admin user "' + name + '"? This cannot be undone.', function(res){
    if(res){ var args = $scope.makeReqTokenForCmd("remove");
      args && (args.adminUserId = adminUserId,
        $http.post(appVars.globals.APIURL + "/users/v1/adminusers", args) …) }})}
```

**Counted in the bundle:** `removeAdminUser` **1** (its definition) · `addAdminUser` **1** ·
`listAdminUsers` **8** · `adminUsers` **3**.

**The DOM count is 0 because the captured account had NO extra admin users.** `listAdminUsers`
populates `$scope.adminUsers`; the remove control renders **per row**; zero rows renders zero
controls. **The zero measures the account's data, not the product's surface.**

**The same reasoning applies to every count in this capture:**

| capture | count | what it actually measures |
|---|---|---|
| `apiKeyDelete` | **1** | the account had **one API key**. Not evidence about multi-row layout |
| `sessionManageLink` | **1** | the account had **one non-archived session**. Not evidence about striping |
| `adminUserRemove` | **0** | the account had **zero extra admin users**. **The control exists** — proven in the bundle |
| `marketplacePerSession` | hidden | `disableMarketplace` was **truthy for this account** |
| `newRoomReveal.revealed` | false | **the collector refused its own clicks** (§15.5) |

**Rule, now standing:** *a zero from a rendered capture is only evidence when the precondition that
would produce a row is known to have been met.* State the precondition, or the zero says nothing.
This is the third distinct failure mode recorded in this file — after "missing without a check"
(rule 6) and "built without a check" (§12.3).

### ✅ IMPLEMENTATION AUDIT — the Account page is BUILT. 11 of 11 controls.

**Audited 2026-08-16 10:28 against `apps/controller/src`**, per the owner's instruction to audit our
implementation as the reading proceeds.

**Our account surface: `routes/(app)/account/+page.svelte` (1,382 lines) +
`+page.server.ts` (612 lines), with EIGHT dedicated test files** — `account-actions-contract`,
`account-empty-state`, `account-form-errors`, `account-new-room-reveal`, `account-page-render`,
`account-page-sbs`, `account-sessions-filter`, `admin-users-row`.

| reference control | ours |
|---|---|
| `createApiKey()` | ✅ `account/+page.svelte` + `+page.server.ts` |
| `deleteApiKey(k._id)` | ✅ both |
| `rotateApiKey` | ✅ both |
| `addAdminUser()` | ✅ both |
| **`removeAdminUser`** | ✅ `+page.svelte` **+ `admin-users-row.test.ts`** |
| `listAdminUsers` | ✅ **built under another name** — a Drizzle select from the `adminUsers` table in the load function, **scoped `.where(eq(adminUsers.accountId, accountId))** |
| `toggleArchivedRooms()` | ✅ `+page.svelte` |
| `sortByUUID()` / `sortByName()` | ✅ `+page.svelte` |
| `createNew()` (New Room) | ✅ `+page.svelte` — **and `account-new-room-reveal.test.ts` covers the reveal** |
| `manageMarketplaceSession` | ✅ `account/rooms/[id]/[[tab]]/+page.server.ts` |

**All eleven are implemented.** `listAdminUsers` is the exact "built under another name" pattern
`missing-commands-triage.md` warns about — an identifier search would have reported it missing.

**And ours is scoped where the reference is not:** our admin-user query filters by `accountId`
server-side. §15.2 established the reference's router carries **no authority at all**; our load
function enforces it in the query.

**So §15.8's control inventory is NOT a gap list.** It is a **specification to verify our existing
implementation against** — labels (`"New Api key"`, `"Close Add Admin User"`), tokens (`#e6e9ee`,
`#363f45`, gutter `x=440.5`), and the five accessibility defects we should have **diverged** from.
**That comparison has not been run and is the real outstanding work here.**

### State of the account at capture — the sample size, and what it does NOT license

- **One** API key row · **one** non-archived session · **zero** extra admin users
- `showArchivedRooms` **false** · `showAddAdminUser` **false** · `disableMarketplace` **truthy**
- **Session ids are 24-hex MongoDB ObjectIds**; the value is redacted, not absent from the app
- ⚠ **No claim about multi-row rendering, striping, or empty states may be drawn from this capture.**

## 15.9 §D — the API Keys and Badges panes. **A collector defect makes them unusable.**

> **`paneOf()` resolved to the same DOM element for all four panes.** `panes.apiKeys.panel`,
> `panes.badges.panel`, `panes.extraAdminUsers.panel` and `panes.sessions.panel` are **byte-identical
> — one object stored four times.** It is the page-level ui-view container, not a pane body.

**So this capture CANNOT rebuild the API Keys pane or the Badges pane.** The only per-pane evidence
is the two `<h3>` headings. `panel.html` is **hard-truncated at 4,000 characters** and stops
mid-first-session-row, so **zero API-key rows and zero badge rows appear in the captured markup** —
which is a truncation artefact, **not** a statement about the account (§15.8's `apiKeyDelete` found
**1** key through a different selector). Rule 6b again.

### 🔴 A live site JWT is in the capture, unredacted — and it dates the token lifetime

The Launch anchor's `jwtSite` was **not** masked while 24-hex ObjectIds beside it were. Decoded
payload: `{name, email, id, type:"site", issued, iat, exp}` with
**`iat` 2026-08-14T13:16:15Z → `exp` 2027-08-09T13:16:15Z — a lifetime of exactly 360.0 days.**

**Hard evidence: site tokens live 360 days.** That is a real security parameter for our own token
policy, and the redaction inconsistency is the defect §15.6 already recorded.

### The sessions table — complete structure, and it is what our account page renders

```html
<h4 class="ng-binding">Total <span ng-click="showNewRoom=showNewRoom+1;">Sessions</span>: 1</h4>
<!-- <button class="btn btn-sm btn-default" ng-click="getSessions()">Refresh</button> --> ← COMMENTED OUT
<div class="row"><div class="col-md-4 panel pane-default">
  <input type="text" ng-model="sessSearch" placeholder="search" class="form-control">
  <button class="btn btn-sm btn-default" ng-click="toggleArchivedRooms()">
    <span ng-show="!showArchivedRooms">Show</span>
    <span ng-show="showArchivedRooms" class="ng-hide">Hide</span> Archived</button>
<div class="row"><div class="col-md-12 panel pane-default"><div class="table-responsive">
  <table class="table table-striped table-bordered table-hover">
```

**Five `<th>`:** `Session ID` (sortable, **no** `text-center`) · `Name` (sortable, `text-center`) ·
`State` · `Users` · `Actions`.

**The row:** `<tr ng-hide="s.isArchivedRoom && !showArchivedRooms" ng-repeat="s in login.sessions | filter: sessSearch">`

| cell | content |
|---|---|
| Session ID | `<strong>3627</strong>` + a hidden clone span + **`<div ng-show="showNewRoom">`** holding `<muted>( «hex24» - ownerID: «hex24»</muted>)` |
| Name | **`Tarzan`** — no `text-center` **even though its header has it** (a real misalignment) |
| State | `<div ng-hide="s.isArchivedRoom" class="label label-orange">open</div>` / `<div ng-show="s.isArchivedRoom" class="label label-warning">archived</div>` |
| Users | `<div class="text-muted">0 / 2</div>` — **used / seat quota** |
| Actions | Launch `btn-sm btn-info` `fa-external-link` → **`/session?id=3627&jwtSite=<JWT>`** `target="_blank"` · Manage `btn-sm btn-inverse` `fa-cogs` → `#/page/manageSession/«hex24»` · Marketplace `btn-sm btn-default` `fa-credit-card` (ng-hidden) |

**Three findings worth carrying:**

1. **`showNewRoom` does more than reveal New Room** — it also unhides the room's internal ObjectId
   and **ownerID** on every row. The five-click counter is a **developer-info toggle**, not just a
   create button.
2. **The Launch link uses the NUMERIC id `3627`**, not the ObjectId — while Manage uses the ObjectId.
   **Two different identifiers for the same room in adjacent anchors.**
3. **The room is named `Tarzan`** — the same string as the v4 room's `<title>` in §10.1. **These two
   captures are the same room**, which lets the account-page row and the room bundle be cross-read.
4. `<muted>` is a **non-standard element name**, not Bootstrap's `.text-muted` class. And the closing
   paren sits **outside** it.

### Page geometry — exact, at viewport 1989×1265

- Panel `x 424.5 → 1564.5`, **1140px wide, horizontally CENTRED** (424.5px each side — no sidebar)
- Content width **1110px** (1140 − 15 − 15); headings sit at `x 439.5`
- `.app { padding: 15px 15px 80px }` overridden by **`.footer-hidden .app { padding-bottom: 0 }`** —
  the computed `15px 15px 0px` **proves an ancestor carried `.footer-hidden`**. With a footer, restore 80px.
- **h3:** `24px / 26.4px`, weight **500**, `#333`, margin `20px 0 10px`, no class, no icon — Bootstrap 3's h3 default
- Vertical order: **Sessions `h4` y=105 → Badges `h3` y=360.8 → Extra Admin Users `h3` y=606.2 → API Keys `h3` y=861.6**
- `panel.text` is **`textContent`, not `innerText`** — it includes `display:none` branches, which is
  why the archived toggle reads `"Show Hide Archived"`. **Never treat `.text` as what the user sees.**

### ✅ IMPLEMENTATION AUDIT — our account page already matches these class names

Checked against `apps/controller/src`:

| reference detail | ours |
|---|---|
| **`pane-default`** (not Bootstrap's `panel-default`) | ✅ `account.css` + `account/+page.svelte` |
| `table-striped` (+ bordered, hover) | ✅ `account.css`, `manage.css` |
| **`sessSearch`** — the exact model name | ✅ `account/+page.svelte` |
| **`label-orange`** — the custom "open" state label | ✅ `account.css` + `+page.svelte` |
| `fa-sort-alpha-asc` | ✅ `+layout.svelte` + `+page.svelte` |
| `fa-cogs` (Manage) · `fa-external-link` (Launch) | ✅ both |
| `fa-credit-card` (Marketplace) | ✅ `rooms/[id]/[[tab]]/+page.svelte` **+ `manage-user-row-reference-fields.test.ts`** |

**Our account page is already a faithful reproduction, down to the non-obvious names.** §15.9 is a
**verification spec**, not a gap list — the remaining question is whether the *values* match
(`0 / 2` seat display, the `showNewRoom` id reveal, the commented-out Refresh), not whether the
surface exists.

## 15.10 §E — Extra Admin Users + Sessions panes. **The sessions row, transcribed in full.**

Same shared-panel defect. **The only genuinely per-pane evidence in §D and §E combined is three
fields per pane: `heading.text`, `heading.rect.y`, `heading.html`.** A 13.6 KB slice yields about
three unique bits.

**The four headings, verbatim and complete** (transcribed, not cited — the dumps are being deleted):

| pane | markup | y | typography |
|---|---|---|---|
| Sessions | `<h4 class="ng-binding">Total <span ng-click="showNewRoom=showNewRoom+1;">Sessions</span>: 1<!--<button class="btn btn-sm btn-default" ng-click="getSessions()">Refresh</button>--></h4>` | **105** | **18px / 19.8px**, weight 500, `#333`, margin `10px 0` |
| Badges | `<h3>Badges</h3>` | **360.8** | **24px / 26.4px**, weight 500, `#333`, margin `20px 0 10px` |
| Extra Admin Users | `<h3>Extra Admin Users</h3>` | **606.2** | same as Badges |
| API Keys | `<h3>API Keys</h3>` | **861.6** | same as Badges |

All four: `id` null, `class` null (except the h4's `ng-binding`), `attrs` `{}`, width **1110px**,
x **439.5**. **Do not invent a class for them.** The h4/h3 mix is real — and an accessibility defect
(heading order jumps h4 → h3).

**The sessions row, complete and verbatim:**

```html
<div class="row"><div class="col-md-4 panel pane-default">
  <input type="text" ng-model="sessSearch" placeholder="search" class="form-control">   ← NO <label>
</div>
<button class="btn btn-sm btn-default" ng-click="toggleArchivedRooms()">   ← DIRECT child of .row, no column wrapper
  <span ng-show="!showArchivedRooms">Show</span> <span ng-show="showArchivedRooms" class="ng-hide">Hide</span> Archived
</button></div>                                        ↑ "Archived" is a BARE TEXT NODE outside both spans

<table class="table table-striped table-bordered table-hover">
 <thead><tr>
  <th ng-click="sortByUUID()">Session ID<div class="icon fa fa-sort-alpha-asc"></div></th>  ← NO class ⇒ left-aligned
  <th class="text-center" ng-click="sortByName()">Name<div class="icon fa fa-sort-alpha-asc"></div></th>
  <th class="text-center">State</th><th class="text-center">Users</th><th class="text-center">Actions</th>
 </tr></thead>                                          ↑ these three: no ng-click, no icon — NOT sortable
 <tbody><!-- ngRepeat: s in login.sessions | filter: sessSearch -->
  <tr ng-hide="s.isArchivedRoom && !showArchivedRooms" ng-repeat="s in login.sessions | filter: sessSearch">
   <td><strong>3627</strong> <span ng-show="s.isClonedRoom" class="ng-hide"></span>   ← COMPLETELY EMPTY span
       <div ng-show="showNewRoom" class="ng-hide"><br><muted>( «hex24» - ownerID: «hex24»</muted> )</div></td>
   <td class="ng-binding">Tarzan</td>                   ← no text-center, though its HEADER has it
   <td class="text-center"><div ng-hide="s.isArchivedRoom" class="label label-orange">open</div>
                           <div ng-show="s.isArchivedRoom" class="label label-warning">archived</div></td>
   <td class="text-center"><div class="text-muted">0 / 2</div></td>       ← used / seat quota, spaces round the slash
   <td class="">                                        ← EMPTY class attribute, not absent
     <a ng-href="/session?id=3627&jwtSite=<JWT>" target="_blank" class="btn btn-sm btn-info"><i class="icon fa fa-external-link"></i> Launch</a>
     <a href="#/page/manageSession/«hex24»" class="btn btn-sm btn-inverse"><i class="icon fa fa-cogs"></i> Manage</a>
     <a ng-hide="disableMarketplace" ng-click="manageMarketplaceSession(s._id, s)" class="btn btn-sm btn-default ng-hide"><i class="icon fa fa-credit-card"></i> Marketplace</a>
```

**Details that would be lost without transcription:**

- **Icon pattern is two classes: `icon fa fa-<name>`** — every action icon.
- **State labels are `<div>`, not `<span>`.** *"A Bootstrap `.label` on a block-level div renders
  differently from the usual inline span."* And **`label-orange` is not stock Bootstrap 3.**
- **Action labels carry a leading space:** `" Launch"`, `" Manage"`, `" Marketplace"`.
- **Marketplace has no `href`** — pure `ng-click`.
- Sort icons are **`<div>`, not `<i>`**, which is *why* the header row is 60.5px tall — the block
  element wraps onto its own line.
- **Both sort icons render `fa-sort-alpha-asc` simultaneously** — the glyph is static markup, bound
  to nothing. It cannot reflect sort state.
- The archived-rooms filter is **CSS-only** (`ng-hide`) — archived rows stay in the DOM.

### ✅ IMPLEMENTATION AUDIT — ours is a documented port, and it already knew the dual reveal

`account/+page.svelte` carries the reference's own expressions in its comments:

> *"`ng-hide="s.isArchivedRoom && !showArchivedRooms"` on every row, plus `sortByUUID`/`sortByName`"*
> *"The reference hides **two things** behind clicks on the word 'Sessions'"*

| reference | ours |
|---|---|
| `s.isArchivedRoom` | ✅ `isArchivedRoom(room)` — a pure function over `archivedAt` |
| `ng-hide="s.isArchivedRoom && !showArchivedRooms"` | ✅ the row filter, `showArchived \|\| !isArchivedRoom(room)` |
| `sortByUUID` / `sortByName` | ✅ `sortKey: 'uuid' \| 'name' \| null` + `sortAscending` |
| `showArchivedRooms` | ✅ `let showArchivedRooms = $state(false)` |
| `sessSearch` + `placeholder="search"` | ✅ both |
| **the `showNewRoom` ownerID reveal** | ✅ **already known and implemented** — `ownerID` in `+page.svelte` **and `account-new-room-reveal.test.ts`** |
| `Extra Admin Users` / `API Keys` headings | ✅ `account.css`, `+page.svelte`, `admin-users-row.test.ts` |

> ⚠ **§15.9 recorded "`showNewRoom` does more than reveal New Room" as a finding. It was already
> known and already built** — the comment at `+page.svelte:77` says so, and a test covers it.
> **Rule 6c working exactly as intended:** auditing in the same pass caught it before it reached a
> gap list. Without the audit this would have been a fourth false gap.

**The literal strings `"Total Sessions"` and `"Show Archived"` do not appear in our source** — they
are composed from interpolated values. **That is a match to verify by rendering, not a gap.**

## 15.11 §F — globals, the marketplace flag, lifecycle. **And §6.13 closes G-1.**

### 🟢 `admin-surface.md` §G item 1 — "the entire editor is Unknown" — IS CLOSED

`control-plane-capture.md` §F flags a comment in **our own** `account.css:1995`:

> *"the API-key restrictions editor — ours; the reference opens a **bootbox** for it"*

and says: *"Nothing in this capture supports or refutes the bootbox claim… `manageApiKeyRestrictions`
is **NOT** among [the four known bootbox handlers]."*

**That flag is wrong, and our comment is right.** The document did not have `app.min.js`. **§6.13 read
the handler directly** — `manageApiKeyRestrictions` occurs **once** in the manage bundle, and it is a
bootbox:

```js
bootbox.dialog({ title: "Manage API Key Restrictions", message: container, size: "large",
  buttons: { clear:  {label:"Clear All", className:"btn-warning", …},
             cancel: {label:"Cancel"},
             save:   {label:"Save",      className:"btn-success", …} } })
```

**The whole editor, transcribed** (the dumps are being deleted — §6.13's offsets are not enough):

- **Two scrollable checkbox lists**, each `<div class="list-group" style="max-height: 260px; overflow-y: auto;">`
- Headers, verbatim: **`"Restrict to Sessions (leave none selected for no restriction)"`** and
  **`"Restrict to Endpoints (leave none selected for no restriction)"`**, both `<h5>`
- Session rows labelled **`(s.name || s.uuid || s._id) + " (" + (s.uuid || s._id) + ")"`**
- Pre-checked from **`apiKey.restrictToSessions`** and **`apiKey.restrictToEndpoints`**
- Endpoint list fetched by **`listAllApiEndpoints`** → `data.endpoints`, **cached client-side**
- Saved via **`restrictApiSessions`** then **`restrictApiEndpoints`** (sequential, nested callbacks),
  both `POST {APIURL}/users/v1/apikeys`
- **"Clear All"** unchecks everything **and immediately saves `([], [])`**
- **An unrestricted key is ALL-ACCESS** — deny-by-default inverted. **Our build must not copy that.**

**Our comment stands, our restrictions panel now has a reference to diff against, and G-1 closes.**
This is the two corpora completing each other: the room/site captures could not see the manage
bundle, and the manage bundle has no rendered DOM.

### The five probed globals — one present, four absent

| global | present | type | value |
|---|---|---|---|
| **`__disableMarketplace`** | **true** | **`"string"`** | **`"true"`** |
| `__disableMobile` · `__disableSSO` · `__disableTextList` · `tokSite` | **false** | null | null |

**The window global is the STRING `"true"`; the Angular scope property is the BOOLEAN `true`**
(`marketplaceScopeFlag = {readable:true, value:"true", type:"boolean", how:"angular.element(node).scope().disableMarketplace"}`).

> **Do NOT document "the global sets the scope flag" as fact.** The capture is explicit: *"Correlation
> of two truthy values on one page is not a causal chain, and the coercion function, if any, is not in
> the evidence."* It is equally consistent with two independent sources that happen to agree.

**Three independent signals agree that this account has marketplace off:** the window global, the
scope property, and the rendered `ng-hide` class on the Marketplace anchor. **Our gate must be a real
boolean, decided server-side** — a string `"false"` is truthy.

⚠ **The four absent globals are not evidence of anything.** *"Those names came from the reference's
own templates. Do not build a feature-flag surface on this absence."*

### `lifecycleControls = []` — and why it is weaker than it looks

Recorded, with the capture's own caveat: *"it does not say what the probe looked FOR — the search
terms, selectors or handler names the collector used are not recorded anywhere in the capture, so a
false negative from a too-narrow probe cannot be ruled out."*

**Our active/suspended account pair stays a DESIGN, not a match.** Do not upgrade it on an empty array.

### ✅ The capture's own audit of our build — three concrete results

| | |
|---|---|
| **matched** | Our `restrictions` trigger: `<button class="acc-link" type="button">restrictions</button>` (`+page.svelte:1210-1214`). **Label matches exactly, lowercase.** Element type differs (`button` vs `a`) **by our deliberate choice** — the reference's is `<a href="">`, which navigates unless prevented |
| **confirmed** | Our `.acc-link` (`account.css:1862-1872`) — padding 0, border 0, background none, `font: inherit`, line-height 20px, `rgb(51,122,183)`, no underline — **matches every captured computed value.** And the reference computing **font-weight 700** confirms our `.acc-api-label` (`account.css:1837-1844`) mechanism, previously only inferred |
| **open** | Our restrictions **panel** (`+page.svelte:1237-1310+`: Allowed IP addresses, Allowed rooms, Allowed commands) — **now diffable against the transcribed editor above.** Note the reference has **no IP list**; that is ours |

**One cheap pixel check owed:** our restrictions button's computed `display` and rect against the
reference's **`inline`, 75.6875 × 16.5** at 1989×1265 @2×.

## 15.12 §G + §H — ✅ `control-plane-capture.md` READ IN FULL, all 1,243 lines

### §G — a seventh agent audited the other six, and found 21 misses

*"The failure mode for an exhaustive decode is silent omission — six agents each cover their slice and
nobody notices a whole key was never opened."* **This is the model for the twice-run audit the owner
asked for.** It re-checked three claims independently (all held, two more strongly than stated) and
then found what nobody reported.

**The misses concentrate in three places, and the third matters most:**

1. **Cross-field arithmetic nobody could do from one slice** — the four `panes.*.panel` objects are
   deep-equal, and `newRoomReveal.control` is deep-equal to `newRoomCreate.nodes[0]`. **17.7% of the
   118,757-byte file is duplicated content.**
2. **Collector artefacts reported as site properties, or not at all.**
3. **The live JWT — 8 copies — that no agent mentioned**, carrying the owner's name, email, user id
   and `exp 2027-08-09`, *"while the redactor masked the same 24-hex id about 900 characters earlier
   in the same string."*

### 🔴 The finding that reopens New Room properly

> **`newRoomCreate` and `adminUserAddForm` are hidden with computed `display:block`,
> `visibility:visible`, `opacity:1` and NO `ng-hide` class — they are collapsed by an ANCESTOR. And
> no node object anywhere in this capture records an ancestor.**

**So the New Room gate is genuinely NOT-CAPTURED, not absent** — a stronger and more precise
statement than "the clicks were refused". Two of the four hidden nodes (`marketplacePerSession`,
`adminUserAddToggle[1]`) *are* self-hidden by `ng-hide`; two are not. **The mechanism differs and
nobody had distinguished them.**

**And the five-click threshold is the COLLECTOR's assumption, not an observation** — *"refusedClicks
says 'click N of 5', which is the collector's assumed threshold… the actual number of clicks the
build requires is not in the capture."* **§15.5 should not be read as "five clicks".**

### ✅ §H item 6 vindicates §15.11 — our `account.css` comment is backed

§H line 1146 leaves our bootbox comment as *"either backed by evidence outside this slice or an
unevidenced claim in our own source."* **§15.11 resolved it: backed.** `manageApiKeyRestrictions`
occurs once in `app.min.js` and it is `bootbox.dialog({title:"Manage API Key Restrictions", …})`.
**No change needed to `account.css:1995`.**

### §H — eight collector defects, two already fixed

| # | defect | status |
|---|---|---|
| 1 | `paneOf()` resolves to one shared ancestor for all four panes | **open** — 17.7% duplication, per-pane structure absent |
| 2 | **Silent truncation** — `html` at exactly 4,000, `text` at exactly 300, **no ellipsis, no marker** | **open.** *"the same defect `collect-manage-gaps.js` was written to fix in its predecessor, whose header calls silent truncation 'the worst kind' — reintroduced here"* |
| 3 | Every `styles.css` rule stored **twice**; **no** `bootstrap.min.css` rule ever duplicated | open — 87 bootstrap / 70 styles.css entries, **exactly 35 of the 70 are duplicates** |
| 4 | Headings carry **no `rules` key at all** (10 keys vs 11) | open — **heading CSS is uncaptured; "this heading has no rule" is unprovable** |
| 5 | `refusedClicks` — the denylist matched `New` inside `showNewRoom=showNewRoom+1;`, **0 occurrences in the label "Sessions"** | ✅ **fixed in `dbc7001`** |
| 6 | Redactor inconsistent **within a single field** | ✅ **fixed in `4928f47`** — now masks by parameter NAME so unpredicted credential shapes are caught by their label |
| 7 | UA is Android Pixel 9 mobile; viewport is 1989px desktop | open — emulation or spoof, unresolved |
| 8 | **`app.dashboard` and `app-dock.dashboard` both register `/dashboard`** | **NOT a collector defect — a genuine duplicate registration in the reference.** The only duplicated URL among the 31 |

### Residue worth keeping from §G

- **A 12th stylesheet exists** — the AngularJS-injected `ng-hide` sheet, `href: null`, carrying
  `.ng-hide:not(.ng-hide-animate){display:none!important}`. **`provenance.stylesheets` lists 11 and
  is therefore incomplete by one** — and it is the sheet that actually hides both hidden controls.
- **`panes.apiKeyRestrictionControls` is a bare 1-element ARRAY**, not the `{selector, count, nodes}`
  shape every `namedControls` entry uses. **Its selector and true match count are unrecorded — it
  cannot be said whether exactly one "restrictions" link exists or only one was kept.**
- **The two identity sweeps disagree:** `allSrefs` has 2 entries but only 1 appears in `navEntries`.
  `page.forgot-password` has an sref the nav sweep never picked up.
- **The module graph is closed and valid:** 0 dangling dependencies, 0 orphans, `app` the only root,
  69 of 97 with empty dependency arrays, 26 are `template/*.html` `$templateCache` pseudo-modules.
- **8 states carry path parameters:** `/:folder`, `/:id`, `/stats/:sessionID`,
  `/manageSession/:sessionID`, `/mstats/:sessionID`, `/change-password/:uid`,
  `/user-change-password/:uid`, `/login/:sessionID`.
- **Geometry closes exactly:** `440.5 + 247.796875 = 688.296875` (the two sort columns are
  pixel-contiguous); `424.5 + 15 = 439.5` (all four heading x); `1140 − 30 = 1110` (all four heading
  w); `80 + 15 + 10 = 105` (the h4's y).
- **`census` dom and css columns are unverifiable** — no `bodyText`, no stylesheet text is captured.
  They supply **100%** of `room`'s total and **80%** of `console`'s. The four route-registry surfaces
  are fully reproducible; those two are not.

**✅ FILE COMPLETE — 1,243 / 1,243.** — `panes.extraAdminUsers`,
`panes.apiKeys`, `panes.sessions`, `panes.serverInjectedGlobals` (which holds `__disableMobile`), and
the 4 unattributed DOM hits for `console`.

---

# 14. ✅ R-15 CLOSED — `mobile-app-decoded.md` read (lines 1–590 of 758)

**Everything §2, §3c and §10 needed for R-15 was already decoded, byte-cited, on 2026-08-15.**
`docs/decoded/mobile-app-decoded.md`. §3c's three findings from the owner's pasted DOM are all
**confirmed against the bundle** — and the document adds what a DOM capture cannot.

## 14.1 §3c confirmed, from the update block at 2,456,508–2,456,744

```js
m(4), z("ngIf", o.appService.globals.isPresenter),        // Network Test tab — PRESENTER ONLY
m(2), Tt("active", "mobile" === o.activeTab),             // Mobile App tab — UNGATED
m(3), z("ngIf", o.appService.globals.isPresenter),        // Mic Test tab — PRESENTER ONLY
…
this.activeTab = this.appService.globals.isPresenter ? "network" : "mobile"   // @ 2,444,092
```

**All three §3c divergences are real**, and the fourth (the two-branch title) too:

| viewer | title, verbatim |
|---|---|
| presenter | `" Connectivity/Mic Troubleshooter "` (`dAe` @ 2,433,777) |
| non-presenter | `" Connectivity Troubleshooter "` (`uAe` @ 2,433,841) |

## 14.2 The pane, complete — `PAe` @ 2,438,242

```html
<div class="mobile-app-container">
  <p class="text-muted mb-4"> Use this to restore your mobile app connectivity and get a test notification on your device. Only do this if you are not getting notifications </p>
  <button type="button" class="btn btn-primary" (click)="restoreMobileAppTokens()">
    <i class="fas fa-sync-alt me-1"></i> Restore Connectivity
  </button>
</div>
```

- Body copy @ 2,438,310; `" Restore Connectivity "` @ 2,438,562. **The missing full stop after
  `notifications` is the reference's — reproduce it.**
- Tab button: `<i class="fas fa-mobile-alt me-1"></i> Mobile App` — **`fa-mobile-alt` occurs exactly
  once in the whole bundle** (2,453,564) and it is this tab. The navbar icon is `fas fa-mobile`,
  a different glyph. **Do not conflate them.**
- **"The whole pane is one paragraph and one button. There is no pin display, no token list, no
  platform picker and no pairing UI on this tab."** Read end to end.
- Footer on this tab is `JAe` @ 2,443,231 — **Close only**. The network tab's Start Test / Copy
  Results / Close footer (`XAe` @ 2,442,736) does **not** render here.
- `onTabChange(e){ e!==this.activeTab && ("mic"===this.activeTab && this.cleanupMicTest(), this.activeTab=e) }`
  @ 2,444,820 — leaving **mic** tears the test down; leaving **mobile** does nothing.
- Reached from the sidebar item `"Connectivity Check"` → `data-bs-target="#webrtc-troubleshooter-modal"`.

## 14.3 🔴 The tab is gated by NOTHING — a reference inconsistency to decide on

> *"Neither `ptrMobileAppEnabled` nor `customMobileAppEnabled` nor `freeTrialsGetApp` appears anywhere
> in the troubleshooter component (2,433,700–2,465,684, read in full). Every other mobile control in
> the bundle carries that four-term gate; this one carries none. **A member of a room with the app
> disabled still sees a Mobile App tab and a working Restore Connectivity button.**"*

Every other mobile surface carries:
```js
(sessData.ptrMobileAppEnabled || sessData.customMobileAppEnabled)
  && (!user.isFT || sessData.freeTrialsGetApp)
```
**Decide deliberately whether to reproduce the omission.** Under this repository's standard it is a
control that reaches nobody in a room without the app — the same class of defect as
`missing-commands-triage.md`'s `stopVideoForAll`.

## 14.4 The wire, exactly

```js
// AppService @ 1,159,780
sendServerCommand(e,i){ P(`sendServerCmd: ${e}. data:`,i), this.socketService.send(e,i) }
// SocketService @ 990,323
send(e,i={}){ try{ this.socket.transmit("cmd",{cmd:e,data:i}) }catch{} }
```

- **`send()` swallows every throw** — `try{}catch{}` with an empty body. **Silent by construction.**
- `restoreMobileAppTokens()` @ 2,444,920 → `transmit("cmd",{cmd:"restoreMobileAppTokens",data:{}})`,
  then **unconditionally** `bootbox.alert("Command sent successfully, check your mobile device for a
  test notification")` — no callback, no ack, no error path. **It reports success even if the
  transmit threw.** This is exactly what §3a observed at the wire (empty ack, discarded).
- `getMyMobilePin` sends **`data: null`**, explicitly — the `i={}` default does not apply.
- Its gate is **re-checked inside the method**, not only in the template: *"belt-and-braces and it is
  worth keeping."*
- **No inbound handler for `restoreMobileAppTokens`** — the switch at 1,020,600–1,022,200 was read in
  full. Confirms §3a from a second, independent direction.

## 14.5 CSS — two dead rules and one missing one

- **`.mobile-app-container` has NO rule anywhere.** Two occurrences in the bundle, both const tuples;
  absent from the troubleshooter's 8,838-byte styles array and from `styles.ee2a710065b60389.css`.
  **The container is unstyled** — its children are laid out by Bootstrap alone.
- **`.mobile-app-info` has two rules and nothing carries the class** — dead CSS.
- `.mobile-info-app-btn` has **only** a `:hover{cursor:pointer}`, no base rule, duplicated in two
  components.
- `.troubleshooter-tabs` styling is **byte-identical between builds** — v4 added a third `<li>` to an
  existing tab strip. Exact values: inactive `#94a3b8`, hover `#e2e8f0` on `#ffffff0d`, **active
  `#22d3ee` on `#22d3ee14` with `box-shadow: inset 0 -2px #22d3ee`**, radius `.5rem .5rem 0 0`,
  padding `.6rem 1.2rem`, `font-weight:600`, `font-size:.9rem`, icon `.85rem`.

## 14.6 🔴 CORRECTION TO §6.10 — there are THREE mobile apps, not two

`app-mobile-app-info-modal` @ 2,315,940 hardcodes a **third**:

| # | package / id | name | source |
|---|---|---|---|
| 1 | `com.bellesoft.protradingroom` / `id1147825433` | Pro Trading Room | AngularJS manage bundle (§6.10) |
| 2 | `com.bellesoft.ptrAlerter` / `id1542468993` | Pro Trading Room **Alerts** | AngularJS manage bundle (§6.10) |
| 3 | **`com.bellesoft.protradingroomv3`** / **`id1587924329`** | **pro-trading-room-v3** | **the v4 ROOM bundle** |

**§6.10 said "there are two mobile apps". That is wrong — there are three**, and the v4 room defaults
to the **v3-named** one. `customMobileAppEnabled` swaps both links for
`customMobileAppAndroidUrl` / `customMobileAppIOSUrl`.

**The credentials block** (`Vxe` @ 2,315,554), switched off by `hideMobileCredentials`:
`" To login to the app use the following credentials: "` · `"Email: "` · `"Pin Code: "` —
rendering `globals.user.email` and `mobilePin` (initialised `"N/A"`).
**The pin's type, length and format are NOT constrained by the bundle** — "six digits is not
established here."

Both store badges **already exist in this repo**: `apps/room/static/assets/images/google-play-badge.png`
and `iosAppStore.svg`.

**Button text differs by 1 character between the two chromes** — `" Mobile App Info "` in `app-room`
(@ 2,466,190) vs `" Mobile App Info"` in `app-closed-session-page` (@ 2,563,159). Trailing space only
in the former.

## 14.7 ✅ Closing `mobile-app-decoded.md`'s own open list (its §5, seven items)

That document ends with a **"STILL TO DECODE"** list and a self-correction. **§6 and §8 of this file
close two of the seven outright**, and narrow two more.

| its open item | status now |
|---|---|
| **`customMobileAppV3Name` and `customMobileAppLaunchWord`** — *"Lookup: the manage-page bundle `/public/dist/app.min.js`"* | ✅ **CLOSED.** That bundle was read in full (§6). **`customMobileAppLaunchWord` = the custom URL SCHEME** — `<word>://?t=<jwt>&s=<roomID>&pc=<pairCode>`, default `protradingroomapp://` (§6.9). **`customMobileAppV3Name` = the manage label "Custom app String"** (§8.4) — still no consumer found in any client |
| **What the server does with `restoreMobileAppTokens`** | 🟡 **NARROWED.** §3a captured the live wire: the server **replies in 39 ms with `{"event":"cmd","data":{"cmd":"restoreMobileAppTokens"}}` — no `data` key** — and `handleServerCmd` has no case for it, so it is discarded. **So the server does act and does acknowledge.** What it re-registers is still server-side |
| **`ptrMobileAppCaseByCaseEnabled`** (row 8, "0 occurrences", NOT IN BUNDLE) | ✅ **CLOSED by §8.1.** It is a manage setting *"App for Some Members?"* that reveals two row-menu items calling **`manageMobileApp(…,'enable'\|'disable')`**, writing **`user.hasMobileApp`** |
| **`ptrMobileAppExpirePairCodeDays` / `mobileAppExpireNotificationsDays`** (rows 9–10, NOT IN BUNDLE) | ✅ **CLOSED by §8.4 / §3** — manage settings, defaults **7** and **14**, with verbatim help text |
| **`hasAppPairLink` + `pairSecretKey`** (row 11, *"no `addUser` route, no `/ptr_app/` string"*) | ✅ **CLOSED by §8.6 + §13.** The pair URL is `https://chat.protradingroom.com/ptr_app/sessions/v2/addUser/<sessID>/?sec=<pairSecretKey>&email=&name=`, and the **v2 REST API** has `POST /session/addUsers` **and `delUsers`** (§13.1). `gaps-closed.md` §A.4 adds that both settings are **read 0 times by the v4 client** — they are server-side only, which is exactly why the room bundle showed nothing |
| **`alerterAppTokens` / `alerterAppFCMUserOff`** (row 4, *"0 times in either bundle"*) | ✅ **CLOSED by §6.13 / §8.9.** Both are **user-row fields on the manage page** — `alerterAppTokens` is an array (dedup-by-email drives "Show Mobile"), `alerterAppFCMUserOff` renders a **red** phone icon. And §14.6: they belong to the **ptrAlerter** app |
| The pin's format · const 81's consumer · `.mobile-app-info`'s subject in another chunk · the full inbound switch · `sessData.uuid` cross-check | ⬜ **still open** — all five are room-bundle lookups, unaffected by §6/§8 |

**Its own correction block is worth carrying forward:** the claim that `freeTrialsGetApp` was missing
from our repo was **verified false** — it is present in `room-settings-schema.ts` (2),
`room-config-client.ts` (1), `+page.svelte` and `room-config.ts`. **Same failure as §10 and §11.2, in
a document written by a different pass.** Three independent instances now; rule 6 is not optional.

> ⚠ **That document also flags its own unverified claims:** *"The three `MOBILE-APP.md`
> contradictions above were NOT re-verified by the main agent and remain claims, not findings."*
> Rows **6** (the pin transport is the socket, not HTTP), **15** (custom app **overwrites**, so two
> apps cannot coexist for a member) and **24** must be re-verified against their cited offsets before
> `docs/MOBILE-APP.md` is edited. **Do not treat them as settled.**

---

# 13. 🟡 P-1 — the unsubscribe endpoint. **PARTIAL. NOT ANSWERED.**

> ⛔ **Owner correction, 2026-08-16 10:22.** This section was headed *"P-1 IS ANSWERED"*. **Withdrawn.**
> What is established is that **a documented endpoint exists which removes a user and unsubscribes
> their FCM tokens**, and that is a hard fact from a file read in full. **"P-1 is answered" is a
> different and larger claim** — it presumes nothing in the six unread artefacts changes the picture,
> and I have no evidence for that. Four times today something I called missing was already held.
> **The endpoint is a finding. P-1's closure is not.**

`apps/controller/evidence-dumps/TIER1-fetched/api-post-routes.md` — **20,699 bytes, fetched
2026-08-13.** I named this file as queue item #1 and called it *"one fetch away"*. **It was already in
the repository.** Third instance of the same failure this session; §11's rule stands.

## 13.1 The endpoint P-1 needs

> **### 4. Delete Users from Session**
> **URL:** `POST /session/delUsers`
> **Description:** Removes users from a session **and unsubscribes them from FCM notifications.**

```
Base URL:  https://chat.protradingroom.com/ptr_app/api/v2/
POST /session/delUsers
{ "sessionID": "…", "secret": "…", "delUsers": ["user1@example.com", "user2@example.com"] }
```

And its counterpart:

```
POST /session/addUsers
{ "sessionID": "…", "secret": "…", "users": [ {"email":"…","name":"…"}, … ] }
```

The Overview names it as a first-class feature of the API:
**"FCM Integration: Automatic push notification subscription management."**

**This overturns §8.6.** That section concluded *"there is no corresponding remove endpoint anywhere
on the page"* — true of the **manage page markup**, and wrong as a statement about the system. The
remove path is in the **API**, it is documented, it takes a list of emails, and **unsubscribing push
is part of its contract.**

## 13.2 What P-1's implementation now is — no design decision left on the mechanism

| step | how |
|---|---|
| detect the lapse | Stripe webhook, or `stripeSubscriptionStatus` ∈ `canceled\|unpaid\|incomplete_expired\|past_due` (§6.12) |
| act | **`POST /ptr_app/api/v2/session/delUsers`** with `{sessionID, secret, delUsers:[email]}` |
| authenticate | `secret` = the room's **`apiSecret`** (§6.13 `generateNewApiSecret`; §8.10 the settings row). **Rate-limited** — the doc lists *"Protection against brute force attacks on API secrets with configurable limits"* |
| identity | **email** — the same key as the md5 identity (§12.1) and as `applyToAllRooms` (§6.1) |

**Per-room, not per-account:** `sessionID` is required, so a lapsed member in N rooms needs N calls.
That is the same room-scoping that limits `disalowMultiLogins` for P-2 (§8.5), and it is the one real
design question left for P-1 — **fan out across the account's rooms, using `otherJWTSessions` /
`login.sessions` (§6.12) as the room list.**

**Softer alternative, if removal is too blunt:** `updateUserFCMTok` with `tokcmd:'unsub'` (§8.1)
stops push while leaving the member in the room. **Two levers now exist** — `delUsers` (remove +
unsubscribe) and `unsub` (unsubscribe only). That is a product choice for the owner, and both are
fully specified.

## 13.3 The rest of the API surface — 12 endpoints, all `POST`, one auth model

Path shape `/:mainDest/:mainCmd/:subCmd`, `mainDest` always `session`:

| endpoint | body beyond `{sessionID, secret}` |
|---|---|
| `/session/postToRoom/chat` · `/postToRoom/alerts` | `user`, `email`, `text`; optional **`badgeID`, `fontColor`, `bkgColor`, `channel`** (chat only) |
| **`/session/addUsers`** | `users:[{email,name}]` — bulk |
| **`/session/delUsers`** | `delUsers:[email]` — bulk, **+ FCM unsubscribe** |
| `/session/badges/add` · `/remove` · `/list` · **`/addTrial`** · **`/remTrial`** | `badgeID` + `email` **or** `users:[{email}]` |
| `/session/userstats` · `/session/users` | — |
| `/session/chatlogs` · `/alertlogs` · **`/deletedlogs`** · `/archivedlogs` | optional filtering |
| `/session/recordings` | **last 3 weeks**, with video paths, durations, file metadata |

Three things worth carrying into the build:

1. **`addTrial` / `remTrial` are API-driven** — trial status is externally settable, which is how a
   membership platform grants and revokes a trial. Directly relevant to P-1's tiering.
2. **`/session/deletedlogs`** — *"When a mod deletes or edits a message/alert, these are stored
   here."* So the reference **retains an audit trail of moderation**, which §6.10's client-side-only
   webinar-mode delete does not reach. Relevant to `enableDeleteLog` (§8.10).
3. **`postToRoom` accepts `badgeID`, `fontColor`, `bkgColor`** — an external system can post as a
   styled identity, which is the API twin of `presenterSettings` (§6.8).

## 13.4 The rest of the document — READ IN FULL, all 729 lines, 2026-08-16

### Auth, errors and rate limiting — exact

```
1. sessionID must correspond to an existing session
2. secret must match the session's `apiSecret` field
3. If authentication fails, 403
```

| status | causes |
|---|---|
| **403** | invalid session ID · incorrect API secret · **unknown command** |
| **503** | internal server error · database connection issues |

**Rate limiting, with the reference's own defaults:**

| knob | default |
|---|---|
| `rate_limit_window_ms` | **15 minutes** |
| `rate_limit_max_attempts` | **15 attempts** |
| key | **IP address + sessionID** |

Failed secret attempts are tracked per IP+sessionID; exceeding the limit blocks for the rest of the
window; **a successful auth resets the counter**; violations are logged **and email administrators**.
Error body: `{"success": false, "msg": "Too many attempts. Try again later."}`

### 🟢 The other half of P-1's observability

> **User Lists:** *"Complete user information with roles **and FCM status**"*

**`POST /session/users` returns each member's FCM status.** So the API can both *read* who is
subscribed and *change* it — a reconciliation loop between billing and push is possible without any
new endpoint.

### Server-side facts that settle open questions

- **`emailHash()` is a server-side function**, applied to inbound emails, and **"Email addresses are
  automatically converted to lowercase for consistency."** That is the same
  `md5(trim(lowercase(email)))` derivation proven client-side in `gaps-closed.md` §B.1 and seen in
  the AngularJS roster (§6.2). **One identity, both tiers, server-enforced.** This is the key P-2
  should use.
- **`addUsers` is an UPSERT** — *"add new users, update existing ones."* Safe to call repeatedly.
- **`delUsers`** — *"Removes users and unsubscribes from FCM notifications."* Confirmed twice more in
  the Implementation Details and Notes sections.
- **QA mode exists:** *"FCM operations can be skipped in QA environment"* / *"QA mode support allows
  testing without affecting FCM subscriptions."* **There is a server flag that suppresses FCM side
  effects** — which is how P-1's work can be tested without pushing to real devices.
- **Trial operations auto-create users** — *"Trial status operations automatically create users if
  they don't exist."*
- **Deleted logs `eventType`: `E` = edited, `D` = deleted.** Date filtering defaults to **24 hours**.
- **Recordings:** filtered to the **last 3 weeks**; `duration` is **computed from `length`**;
  **uploads always report duration 0**. Row shape: `_id, name, namemkv, sessionID, session_uuid,
  fpath, media_server, ms, vidPath, length, duration, contentType, isUpload, isPublic, created,
  modified`.

### 🟢 The reference server's data model — named, from the Dependencies list

| model | what it is |
|---|---|
| `models.Session` | the room / `sessData` document |
| **`models.SessionUserXref`** | the member↔room join — the `xrefID` of §6.1 |
| **`models.SessionTokenXref`** | **token management — where push tokens almost certainly live** |
| `models.SessionUserStats` | per-user stats |
| `models.ChatLogs` · `models.AlertLogs` | message history |
| `models.SessionDeletedMessages` | the moderation audit trail |
| `models.SessionLogs` | archived content |
| `models.Recording` | recordings |

Plus **`FCMHandler`** and **`FCMCommandData`** — the push classes — `getIpcClient()`, `sanitize()`,
`emailHash()`, `winston`.

**Architecture:** the HTTP API does **not** touch the room directly. It hands off over **IPC** —
`ipcClient.postChatToSession()` and `ipcClient.postAlertToSession()` — to the session handler
process. Route handler at **`api/api.js:347`**.

**This is the strongest picture of the reference server anywhere in the corpus**, and it came from a
document that has been in the repository since 2026-08-13.

### What is still not answerable from this document

It documents the **v2 REST API**, not the socket command path. So the ordering of §8.2's eight push
gates **inside the fan-out** is still uncaptured — this file shows that `delUsers` unsubscribes, not
what `postToRoom/alerts` evaluates before pushing. **That remains the one open P-1 question, and it
is now a small one:** the lever works regardless of the ordering.

---

# 12. ⭐ THE RECONCILED POSITION — what is actually outstanding, after diffing against the prior corpus

**Written 2026-08-16 10:00 after reading `missing-commands-triage.md` in full and `gaps-closed.md`
§§A–B.** This section supersedes §4 for anything room-side. **Read this before planning
implementation.**

## 12.1 What `gaps-closed.md` already establishes — do NOT re-derive

- **The complete `sessData` contract.** WRITE side: **268 fields** extracted from `ptr1.json`
  `caps[0].fullDom.nodes` by matching `onaftersave="saveSessField('X')"` + the sibling
  `editable-*="sess.X"`, with **live values** for two real rooms and help text at byte offsets.
  READ side: a census over all 2,891,205 bytes of the v4 bundle — **135 distinct keys, 442
  references**, listed alphabetically with counts.
- **§8's settings enumeration therefore duplicates §A.1** for the 36 fields it tabulated. §8 stands
  only for the fields A.1 did **not** cover (below).
- **`useV3/V4/V5` was already answered there**, better than §8.8 put it: all three are **0 occurrences
  in the v4 bundle** — *"The v4 client never reads them; they select which client is served."* And
  **`useV4`'s control is HTML-commented out** in the template (A.2, bytes 223,400–226,400).
- **A.4 is the finding §8 should have led with:** *"Settable on manage, never read by the v4
  client"* — measured **0** in the bundle: `downloadRecordingsDisabled`, `linkedRoomSwingAlerts`,
  `linkedRoomSwingAlertsOther`, `linkedRoomDayTradeAlerts`, `linkedRoomDayTradeAlertsOther`,
  `linkedRoomRecordings`, **`hasAppPairLink`**, **`pairSecretKey`**, `useV3`, `useV4`, `useV5`.
  **These are server-side-only settings.** That directly qualifies §8.6: the `addUser` pair link is
  configured on manage and consumed by the **server**, never by the room client.
- **A.5 — a security finding stronger than anything in §6:** the v4 client reads secret-bearing keys
  off `sessData` **with no role guard at the read site**. `deleteAlertPW` (12 refs) is compared **in
  the browser** (byte 2,048,684, verbatim `archiveChatDate`). Same for `roomPublicSecret`,
  `banIPList`, `obsStreamKey`, `twillioApiSID`, `restreamToURL`, `allRoomsWelcomeMatPW`,
  `needPasswordForUserNotes`, and `showArchivesToSpecificPresenters` (the full presenter email list,
  compared client-side). **Whether the server redacts per role is in no capture — an honest gap, and
  a thing our build must not copy.**
- `avt` / `senderAvt` = **`md5(trim(lowercase(email)))`**, proven from the bundle's own MD5 self-test
  vector (`"hello"` → `5d41402a…`) plus a live Gravatar URL. **This is the same md5-email identity
  §6.2 found in the AngularJS roster** — one derivation across both generations, and the natural key
  for P-2.

## 12.2 What §6–§9 contribute that the prior corpus does NOT

The scope line holds: **the prior corpus owns the v4 room bundle and the site captures; this file
owns the AngularJS manage app.** After reconciliation these survive as new:

| finding | why it is new |
|---|---|
| **The P-1 server contract** — six actions, one endpoint `/users/v1/sessions`, exact payloads (§6.1) | `app.min.js` was never read end to end |
| **`tokcmd` = `pause\|resume\|unsub`, `appcmd` = `enable\|disable`** (§8.1) | the row-menu `ng-click` args; `gaps-closed.md` read `must-match/match` for avatars, not for these |
| **The eight push gates as a synthesis** (§8.2) | a *conclusion* across settings + row fields + alert model, not an enumeration |
| **The alert model** — `dontPush`, `sendLinked`, `nonTradeAlert`, and **`alertLater` carrying no `dontPush`** (§6.10, §9.2) | the manage app's alert composer |
| **Stripe on the member row** — 14 fields + status vocabulary (§6.12) | corroborated by `stripe-details-*.json`; the *synthesis* with push is new |
| **Two mobile apps** — `protradingroom` vs **`ptrAlerter`** (§6.10) | reframes every `alerterApp*` name |
| **`diasableFCMAlerts`, `sendFcmAlertsNew`, `invalidTokens`, `customClientAlertPostURL`, `disalowMultiLogins`, `isAlertOnly`** (§8.4, §8.5) | **not among A.1's 36 tabulated rows** |
| **`makeReqTokenForCmd`, `__al`, `otherJWTSessions`** (§7.3) | closed three of `enterprise-and-control-plane.md`'s own stated gaps |

## 12.3 The outstanding work, reconciled

**Room-side:** `missing-commands-triage.md`'s **30 NOT-BUILT rows** are the authority. They carry
payloads, byte offsets, gates and verbatim UI strings. **Do not restate them here and do not
re-audit them** — its own first pass had a 21% false-gap rate, caught by an adversarial refuter, so
its surviving 30 are already hardened.

**✅ The three `R-*` items have now been re-checked — counted across all of `apps/room/src`,
2026-08-16 10:12. ALL THREE ARE REAL GAPS.**

| item | identifier counted | result | verdict |
|---|---|---|---|
| **R-15** Mobile App tab | `restoreMobileAppTokens` · `"Restore Connectivity"` · `mobilePairCode` | **0 · 0 · 0** | **REAL GAP — build it.** Fully specified: `triage:112` (strings), `triage:140` (payload `{}` + offsets), §3a (empty ack), §3c (3 tabs, presenter gating, default tab) |
| **R-14** recording start time | `recUser` · `recStartTime` · `recordingStartedAt` | **0 · 0 · 0** | **REAL GAP.** Source known: `roomState` carries `isRecording`, `recUser`, `recStartTime` (§6.5). Units/epoch of `recStartTime` still uncaptured |
| **R-1** typing indicator | `typing-indicator` · `usersTyping` · component file | **CSS only · CSS only · none** | **REAL GAP.** The CSS is harvested into `captured-runtime-components.css`; **no component consumes it.** Spec: §6.9 (both directions, `data.c` channel, `n.n` name field), §3d (the `.users-typing` text line + 3 host variants) |

**None of the three was built.** The earlier note that R-15 "already exists" was my error — see the
red correction block in §11.2.

**A second rule, earned here:** rule 6 says *nothing is missing without a check*. Its twin is
**nothing is BUILT without a check** — I made the opposite error inside the same section, from a
table cell that is truncated mid-word in the source document. **Never complete a truncated citation
from memory; open the file.**

**Manage-side / P-items — genuinely outstanding, and this file is their authority:**

| | outstanding work | evidence complete? |
|---|---|---|
| **P-1** | wire entitlement → the push fan-out. Signal, decision point and lever all identified (§8.2) | **Client side yes. Server ordering needs `POST_ROUTE_API_DOCUMENTATION.md`** |
| **P-2** | extend `disalowMultiLogins` to be account-scoped and device-class-aware; key on md5-email (§12.1), enforce server-side | **Yes** |
| **P-3** | the enterprise console. Existing pieces: marketplace `/ptr_app/mp/v2`, API keys, `/users/v1/adminusers`, `chatTabsWithBadges`, `modAdminLoginList` | **Partly** — Marketplace pane never rendered; `adminusers` `perms` vocabulary unknown |
| **P-4** | drawing tool — **no evidence in any corpus.** A genuine addition, to be designed | **N/A — design task** |
| **P-5** | Spotify. Three precedents: SoundCloud (payload = bare share URL, `roomState.soundCloudURL`, two stops), YouTube-for-all, `playSoundFile` | **Yes** |

## 12.4 What remains unread, ranked — the honest list

| artefact | status | value |
|---|---|---|
| **`POST_ROUTE_API_DOCUMENTATION.md`** | ⚠ **`gaps-closed.md:52` says `TIER1-fetched/api-post-routes.md` (20,699 B) was "read in full, all 729 lines"** — so this may already be held. **CHECK FIRST.** | the last P-1 blocker |
| `/public/dist/maps/app.min.js.map` | not fetched | would supersede §6 |
| `ptr-manage-dom.html` line 168 (106 KB `<body>`) | unread | the 33-component audit |
| `gaps-closed.md` lines 330–991 | unread | sections B.2 onward |
| `control-plane-capture.md` (1,243), `admin-surface.md` (1,035), `mobile-app-decoded.md` (758) | unread this session | **P-3 is probably largely answered in these** |
| `website-ptr1-prt2-full-read.md` (1,180) | unread this session | ptr1+prt2 already decoded |
| v4 bundle re-decode, v3 bundle | unread | §1 |

**The next action is not more raw reading. It is reading the four remaining decoded docs** —
`control-plane-capture.md`, `admin-surface.md`, `mobile-app-decoded.md`,
`website-ptr1-prt2-full-read.md` — because P-3's model is most likely already written down in them,
and because this session has now twice proven that re-deriving is the expensive way to be wrong.

---

# 11. 🛑 RECONCILIATION — a large prior decode corpus exists, and this session duplicated part of it

**Found 2026-08-16 while applying the owner's rule from §BRIEF-6.** Before reading `ptr1.json` /
`prt2.json` I checked whether we already held them. **We do, and far more than that.**

## 11.1 The prior corpus — 6,600+ lines, none of it consulted this session

| document | lines | what it is |
|---|---|---|
| **`apps/room/docs/website-ptr1-prt2-full-read.md`** | **1,180** | ***"FULL END-TO-END READ: ptr1.json + prt2.json. Every cap and every node was walked. No sampling of caps."*** ptr1 = 23 caps (incl. 18 opened modals/dropdowns, and forced dark/light theme full-DOM captures); prt2 = 5 caps |
| `docs/decoded/control-plane-capture.md` | 1,243 | control plane |
| `docs/decoded/admin-surface.md` | 1,035 | admin surface |
| **`docs/decoded/gaps-closed.md`** | **991** | **a gaps-closed register** |
| `docs/decoded/mobile-app-decoded.md` | 758 | the mobile app |
| **`docs/decoded/missing-commands-triage.md`** | **231** | **the authoritative NOT-BUILT list — read in full, below** |
| plus | — | `alert-scheduler-filter-labels.md`, `day-trade-alerts.md`, `swing-alerts.md`, `recordings.md`, `files-sort-bar.md`, `benzinga.md` |

**§4's gap list was built without consulting any of these.** So was §10. That is the failure the
owner's instruction names, and it is systemic in this session, not a one-off.

## 11.2 What this session DUPLICATED — with the prior citation

| this session | already held |
|---|---|
| **§3a** — wrote `ptr-restore-mobile-tokens.js`, ran a live capture, recorded the empty ack | **The DECODE was already held** — `missing-commands-triage.md:140`: payload **`{}`** ("literally empty"), byte offsets **2438516, 2444920, 2444980**, tab wiring **2456305**, titles 2433777/2433841. The live capture added the *server's reply*, which the decode could not have. **See the correction below — it is NOT built.** |
| **§2 / §3c** — treated R-15's Mobile App tab as needing specification | `missing-commands-triage.md:112` has the strings **verbatim**: tab `" Mobile App "`, paragraph `" Use this to restore your mobile app connectivity and get a test notification on your device. Only do this if you are not getting notifications "`, button `" Restore Connectivity "`, alert `"Command sent successfully, check your mobile device for a test notification"`. **Specification duplicated — but the gap is real.** |

> ## 🔴 CORRECTION, 2026-08-16 10:12 — I WAS WRONG, AND I TOLD THE OWNER THE WRONG THING
>
> An earlier version of this table said `restoreMobileAppTokens` *"was decoded **and built**"*, citing
> `ModalHost.svelte:5327-5362`. **That is false.** I read it out of a table cell that is **truncated
> in the source document itself** — it ends mid-word at `"Ours: src/lib/components/ModalHost.svelte:5327-5362 has exa"`
> — and I completed the sentence in my head as "has exactly this". **I inferred the most important
> word in the claim.**
>
> **Two hard checks settle it, and both say NOT BUILT:**
>
> 1. **The row is in the `## Confirmed missing` table** (that section opens at line 67; the row is
>    line 86). It was never in the refuted list.
> 2. **Counted across all of `apps/room/src`:** `restoreMobileAppTokens` → **0**,
>    `"Restore Connectivity"` → **0**, `mobilePairCode` → **0**. `ModalHost.svelte:5327-5362` today
>    contains the **advanced-search** UI, not a mobile tab. (`getMyMobilePin` appears only in four
>    *test* files, never in a component.)
>
> **R-15 is a REAL GAP. Build it.** The specification is complete between
> `missing-commands-triage.md:112` (verbatim strings), `:140` (payload + offsets), §3a (the server's
> empty ack), and §3c (the three-tab structure, presenter gating, and the default-tab rule).
>
> **The lesson is the mirror of §11's:** the rule *"nothing is missing without a check"* has a twin —
> **nothing is BUILT without a check either.** I applied the rule in one direction and then made the
> opposite error inside the same section.
| **§6.11** — "discovered" YouTube's two-button design (Stop For All vs local ×) | `missing-commands-triage.md:118` — both buttons' **const arrays**, exact positions (`top:-32px`, `right:30px` / `right:0`), and the leading-space text `" Stop For All"` |
| **§6.9** — `notyping` payload | `missing-commands-triage.md:135` — `{c:o, uid:…userXrefID, pm:null, pu:null}`, bytes 1016497 / 1435915 / 2382177, **and flagged as mis-clustered** |
| **§10.2** — the whole v4 token contract | `lib/styles/tokens.css` (323 lines) + `captured-runtime-components.css` |

## 11.3 What this session did that is GENUINELY NEW — and why

**The prior corpus decodes the ROOM bundle (`main.d1d09071be31f1ba.js`) and the site captures. It
does not cover `app.min.js` — the AngularJS MANAGE app — or `evidence-page.manageSession.html`.**
`enterprise-and-control-plane.md` reads *parts* of `app.min.js` (§7 lists its own gaps, three of
which §6 closed), but nothing had read it end to end.

So the following stand as new, and are the session's actual product:

- **§6** — `app.min.js` read in full, 17/17 lines. The P-1 server contract, the two mobile apps,
  the alert model (`dontPush`, `sendLinked`, `alertLater`), Stripe fields on the user row.
- **§8** — `evidence-page.manageSession.html` read in full. **`tokcmd`/`appcmd` from markup**, the
  **eight push gates**, the `addUser` provisioning endpoint, `disalowMultiLogins`.
- **§7** — closed three gaps `enterprise-and-control-plane.md` had left open (`makeReqTokenForCmd`,
  `__al`, `otherJWTSessions`).
- **§9** — the verification counts.

## 11.4 ⚠ A METHOD WARNING from the prior corpus that I must not trip over

`missing-commands-triage.md:230-232`:

> *"Counts come from python `.count()`, **never `grep -c`** — the bundle is one line, so a line-based
> count returns 1 or 0 and destroys every real number. That mistake was made here on 2026-08-15 and
> nearly caused a correct report to be dismissed."*

**§9's counts are safe** — they use `grep -o … | wc -l`, which emits one line per *match*, not per
file line. `grep -c` would have returned 1/0 on these single-line files. **Anyone re-running §9 must
keep the `-o`.** (And §4's warning still applies on top: anchor the pattern, or `isMa` reads as 5.)

## 11.5 The `missing-commands-triage.md` bottom line — 30 items NOT BUILT

Its own tally, which supersedes anything this document says about room-side gaps:

| outcome | count |
|---|---|
| **NOT BUILT — outstanding** | **30** |
| claimed missing then **refuted** (we already build it) | 7 |
| built under another name | 9 |
| framework/library noise | 4 |

**It reports a 21% false-gap rate on its own first pass** — which is the same failure mode as §10,
caught there by an adversarial refuter pass. Its refuted list (`hardResetSession`, `lockSession`,
`saveAndCloseSession`, `saveCloseMessage`, `savePresenterColors`, `softResetSession`, `stopRecMtx`)
carries file:line citations into our source.

**Its 30 outstanding rows come with payloads, byte offsets, gates and verbatim UI strings.** That is
the implementation backlog for the room. **This document does not replace it and must not restate
it** — §4's `R-*` items and the register should be reconciled against it before any build starts.

---

# 10. `ptr-manage-dom.html` — the v4 ROOM's rendered DOM. IN PROGRESS.

# 🛑 READ THIS BEFORE §10.1 — MOST OF THIS SECTION WAS ALREADY BUILT

**Owner instruction, 2026-08-16: *"You also have to make sure you're not reporting something that we
already have based on hard evidence."*** That instruction was given **while §10.2 was being written,
and it caught a real failure.** I wrote up the v4 critical CSS as though it were new evidence.
**It is already in the repository, and most of it is already implemented.** Verified:

| §10 item | already in our source? | where |
|---|---|---|
| **every CSS variable in §10.2** | ✅ **YES** | `lib/styles/tokens.css` (**323 lines**), `protradingroom-source.css` |
| `.positionBtn` / `.updatePositionBtn` (I called this "R-2's overlay") | ✅ YES | `lib/styles/captured-runtime-components.css` |
| `.recording-reminder`, `.talking-string` | ✅ YES | captured CSS **+ `lib/components/RoomNavbar.svelte`** |
| `.blinking-rec`, `.breathing-rec`, `.mod-msg-container` | ✅ YES | `captured-runtime-components.css` |
| `.privChatHolder`, `.giphy-search`, `click-wave` | ✅ YES | `app.css`, `captured-runtime-components.css` |
| `.notConnectedOverlay` | ✅ YES | `app.css`, `routes/+page.svelte` |
| `.pollModalHolder` | ✅ YES | `ModalHost.svelte` **+ `poll-source-contract.test.ts`** |
| `showChatGif` / "gif muted" | ✅ YES | `RoomMessage.svelte` **+ `chat-gif-muted-contract.test.ts`** |
| `openImageModal`, `downloadImage` | ✅ YES | `RoomMessage.svelte`, `routes/+page.svelte` |
| title **`Tarzan`** | ✅ already captured | `evidence-tooltips-presenter-2026-08-11/12.json` |
| `.typing-indicator-container{margin:4px 16px}` | ✅ already recorded | §3d |
| **`removeImageFromChat()`** | ❌ **NO — genuinely absent** | nothing references it |

**The file `lib/styles/captured-runtime-components.css` exists precisely because this CSS was
harvested in an earlier session.** I re-derived it and presented it as a finding.

## The rule this earns — apply it to every remaining artefact

**Before writing anything into this document as a gap or a finding, check whether the repository
already has it.** Two commands, and they are cheap:

```
grep -rl '<the-thing>' apps/room/src apps/controller/src
ls apps/room/src/lib/styles/          # tokens.css · protradingroom-source.css ·
                                      # captured-runtime-components.css  ← prior harvests live here
```

**Reading reference evidence is not the same as establishing a gap.** A gap is
*present in the reference AND absent from our source* — **both halves need hard evidence**, and I
supplied only the first for an entire section. `~/CLAUDE.md` rule 5 already says *"nothing exists
without a consumer"*; this is its mirror — **nothing is missing without a check.**

## What in §10 survives as genuinely new

1. **`removeImageFromChat()`** — absent from our source. Removes `#added-image-to-chat` and drops
   `.position-relative` from `.chat-box`. Small, real, and the only unbuilt item in §10.1.
2. **`<!-- <base href="/v4" /> -->`** commented next to a live `<base href="/">` — corroborates §8.8
   (a room is served whichever bundle PTR assigns it). Not previously written down.
3. **CDN pins:** FontAwesome **5.8.1** with SRI, animate.css **3.7.2**. Worth checking our versions
   against, since an icon-set mismatch is a silent visual diff.
4. **The `event.ctrlClick` bug is in BOTH generations** — §6.10 found it in the AngularJS
   `imageModal`, and it is copied verbatim into v4's `openImageModal`. **Our `openImageModal` should
   be checked for whether it inherited the typo.**
5. **The Angular component scope-id map** (§10.2's last block) — `c977335924` = room shell,
   `c1823712792` = composer, and ten others. Useful for attributing captured CSS to a component; not
   itself a gap.

**Everything else in §10.2 below is retained as a REFERENCE TABLE, not as findings.** It is accurate
and it is a convenient single place to read the token contract — but it is a re-derivation of
`tokens.css`, and **it must not be counted as work or as evidence of a gap.**

---

**Read so far: lines 1–160 (§10.1) and the first ~380 folded lines of line 161 (§10.2).**
**Not yet read: the rest of line 161, and lines 162–170** — see §10.3 for the exact resume point.
**Line 168 (106 KB, the rendered `<body>`) is the part that actually serves the 33-component audit;
§10.1–§10.2 are `<head>` and are already-held material.**

## 10.1 Lines 1–160 — `index.html`, and four global helpers that are NOT in any bundle

```html
<html lang="en" data-critters-container=""><head>
  <title>Tarzan</title>
  <!-- <base href="/v4" /> -->
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, target-densitydpi=device-dpi">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
```

- **The v4 room's document title is `Tarzan`.** Not "Pro Trading Room" — a codename left in the
  shipped `<title>`. Anything asserting the room's title must use this, not a guess.
- **`<!-- <base href="/v4" /> -->` is commented out** next to a live `<base href="/">` — direct
  evidence that a `/v4` path deployment existed and was switched to root. Relevant to §8.8's finding
  that a room is served whichever bundle PTR assigns it.
- `data-critters-container` — Critters inlined the critical CSS (which is why §10.2 exists at all).
- **CDN dependencies:** FontAwesome **5.8.1** (`use.fontawesome.com`, with SRI) and **animate.css
  3.7.2** (cdnjs). Google Fonts imports for Roboto / Source Sans Pro / Lato / Merriweather are all
  **commented out**; the live `@import` is **Lato 400,700,400italic** only (§10.2).
- `html, body { height: 100% !important; }`

**Four global functions defined in the page, not in the bundle** — a rebuild that only ports the
bundle will silently lose these:

| function | what it does |
|---|---|
| `openImageModal(event, url)` | shift/alt → `window.open` with a **generated HTML document** (`<img>` centred on `#000`, flex, `overflow-x:hidden`). Otherwise a bootbox `className:'imgur-modal'`, `size:'large'`, with a Download button |
| `downloadImage(url, imageName)` | XHR → blob → synthetic `<a download>`. **Mangles the filename**: `.replace(/^[^_]+_/,'')` strips up to the first `_`, then `.replace(/_[^_]+(\.[^.]+)$/,'$1')` strips the last `_`-segment before the extension. So stored names are `<prefix>_<realname>_<suffix>.<ext>` |
| `removeImageFromChat()` | removes `#added-image-to-chat`, drops `.position-relative` from `.chat-box` |
| **`showChatGif(id)`** | **GIFs are muted by default.** Toggles `.d-none` on the next sibling; label flips between **`"gif muted, click to show"`** and **`"click to hide"`** |

> ⚠ **The `event.ctrlClick` bug appears here too.** `openImageModal` tests
> `event.shiftKey || event.altKey || event.ctrlClick` — `ctrlClick` is not a DOM property. **Same
> defect as §6.10's `imageModal` in the AngularJS app**, so it was copied forward into v4. Ctrl-click
> silently does nothing in both generations.

## 10.2 Line 161 (first ~380 folded lines) — the COMPLETE v4 design-token contract

The room ships **three stacked CSS variable layers**. Getting these right is most of the visual match,
and they are exact values, not approximations.

**Layer 1 — a Bootswatch-style dark theme** (`--blue:#375a7f` … ). Body is
`font-family: Lato`, `font-size:.9375rem`, `font-weight:400`, `line-height:1.5`, **`color:#fff`,
`background-color:#222`**. Breakpoints `sm:576 md:768 lg:992 xl:1200`.

**Layer 2 — stock Bootstrap 5** (`--bs-*`, including `--bs-breakpoint-xxl:1400px`). **So v4 runs
Bootstrap 5**, which is why §6.13 found BS5 class names (`me-1`, `rounded-pill`) leaking into the
AngularJS manage page.

**Layer 3 — the room's own tokens.** This is the one that matters:

```
--dark-gray:#aaa      --darker-gray:#aaa6a6   --gray:#bbb        --light-gray:#ccc
--lighter-gray:#eee   --dark-black:#222       --darker-black:#111 --light-black:#373c42
--lighter-black:#3e444a  --light-green:#1edd6e  --brown:#555     --light-brown:#8c8686
--dark-brown:#4b4b4b  --lighter-blue:#edf2f6   --white:#fff      --black:#000
--yellow:#ff0         --fire-yellow:#f7fd37    --red:#f00        --light-blue:#40e0d0
--name-color:#c0d8ed  --transparent-gray:rgba(255,255,255,.331)
--app-font-family: Arial, Helvetica, sans-serif !important
--app-link-color:#00bc8c
```

**`--fire-yellow:#f7fd37` is the room's signature accent** — it is `--sidebar-menu-active-color`,
`--presenter-noRecording-color`, and the dark theme's message colour. **`--name-color:#c0d8ed`** is
the username colour. These two match the `#F7FD37` / `#C0D8ED` pair §6.9 found hardcoded in the
AngularJS `switchTheme` — **the same palette carried into v4 as tokens.**

Component-scoped tokens, verbatim (all needed for a pixel match):

```
navbar:     --navbar-color:#fff        --navbar-bg:#000
sidebar:    --sidebar-menu-bg:#000     --sidebar-menu-color:#ccc
            --sidebar-menu-active-color:#f7fd37   --sidebar-navItem-border-color:transparent
users:      --users-color:#fff         --users-border-color:#000
            --users-badge-bg-color:#375a7f        --users-badge-color:#fff
presenter:  --presenter-noRecording-color:#f7fd37 --presenter-recording-color:#f00
            --presenter-area-bg:#111
textarea:   --textarea-bg:var(--darker-black)     --textarea-holder-border-color:#fff
            --textarea-holder-btns-color:#bbb
tabs:       --tab-active-bg:#222       --tabs-color:#fff         --tabs-border-color:#444
            --note-tabs-color:#00bc8c  --notes-tabs-bg:#111
            --tabs-dropdown-bg:#323232 --tabs-dropdown-color:#777
notes:      --note-download-bg:#00bc8c --note-delete-bg:#e74c3c  --note-next-bg:#375a7f
            --note-options-color:#fff  --note-options-hover-color:#cccc  ← 4-digit hex, likely a typo
            --note-options-bg:#111     --note-text-bg:#222       --note-text-color:#ccc
files:      --file-download-bg:#00bc8c --file-delete-bg:#e74c3c  --file-see-more-bg:#375a7f
            --file-list-odd-bg:#fff    --file-list-even-bg:#f4f4f4
            --file-name-color:#333     --file-size-color:#b2b2b2
            --file-searchbar-color:#b7b7b7  --file-searchbar-icon-color:#666666
            --file-searchbar-bg:#fff
split:      --split-gutter-bg:#000     --split-gutter-color:#fff
msgs:       --msgs-header-color:#ccc   --msgs-header-bg:#111
            --msgs-separator-color:#373c42 / -border-color:#373c42 / -bg:#e8e8e8
modal:      --modal-content-bg-color:#303030  --modal-content-color:#fff
            --modal-content-border-color:#444 --modal-tabs-border-color:#444
            --modal-active-tab-bg-color:#222  --modal-active-tab-color:#00bc8c
            --modal-btn-close-bg/-border:#375a7f   --modal-btn-success-bg/-border:#00bc8c
            --modal-btn-danger-bg/-border:#e74c3c  --modal-btn-hover-opacity:.9
            --modal-input-group-bg:#444      --modal-upload-files-color:#555
            --modal-alert-link-color:#00bc8c
misc:       --checkbox-bg-color:#00bc8c --rosterImg-border-radius:0
            --search-icon-bg-color:#adb5bd --search-icon-color:#222
            --reload-icon-bg-color:#00bc8c --reload-icon-color:#fff
            --ptr-website-link-color:#00bc8c
            --mobileApp-info-bg-color:transparent --mobileApp-info-color:#676767
            --avatar-gear-icon-padding:5px 5.5px
            --archives-dropdown-menu-bg-color:#fff --archives-dropdown-menu-color:#222222
            --session-control-dropdown-bg:#222 --dropdown-divider-bg:#e9ecef
```

**Two complete theme override sets**, every value `!important`:

| token | `--lightTheme-*` | `--darkTheme-*` |
|---|---|---|
| `msg-bg` | `#d9d9d9` | `#000` |
| `msg-border-color` | `#d9d9d9` | `#393939` |
| `msg-color` | `#1a1a1a` | **`#f7fd37`** |
| `date-color` | `#8394a9` | `#8394a9` |
| `username-color` | `#000` | **`#c0d8ed`** |
| `msgs-bg` / `roster-bg` | `#f1f1f1` | `#111` |
| `msgs-bg-adm` / `roster-bg-adm` | `#e1e1e1` | `#000` |
| `textarea-color` / `-bg` | `#555` / `#fff` | `#eee` / `#111` |
| `user-location-color` | `#676767` | `#f7fd37` |
| `sidebar-wrapper-bg-color` / `-color` | `#fff` / `#676767` | `#000` / `#f4f4f4` |
| `nickname-color` | `#676767` | `#c0d8ed` |
| `mobileApp-info-color` | `#676767` | `#f4f4f4` |
| `msgs-separator-color` / `-border-color` / `-bg` | `#373c42` / `#373c42` / `#e8e8e8` | `#aaa` / `#373c42` / `#222` |
| `chat-bg` | `#eee` | `#000` |

**Layout facts that pin the geometry:**

- `html, body { background-color:#fff; overflow:hidden !important }`; body `font-weight:300`,
  `font-family: var(--app-font-family)` (**Arial**, overriding Lato), `min-height:100vh` with a
  `-webkit-fill-available` fallback for iOS.
- **Navbar height is `49px`.** `#mainAreaSplit { height: calc(100vh - 49px); width:100vw }`.
- **Split panes are `calc(100vh - 60px)`** (`.box-left`, `.box-right`, `.gutter-horizontal`).
- **Sidebar is `250px`**, positioned `margin-left:-250px` and pushed via `.push-wrapper { left:250px;
  width: calc(100% - 250px) }`.
- **Split gutters use image grips**: `/static/img/grips/vertical.png` (`cursor:ew-resize`) and
  `/static/img/grips/horizontal.png` (`cursor:ns-resize`), `z-index:5`, `background-position:50%`.
- `.brand-logo { max-width:200px; max-height:40px }` → 150px at 768–930px, 120px under 600px.
- **`.privChatHolder`** — `600×400`, `position:fixed`, `left:50%; bottom:0`, `z-index:500`,
  `1px solid rgb(133,133,133)`, `background:#000`, capped `calc(100vw - 100px)` / `calc(100vh - 50px)`.
- **`.pollModalHolder`** — `580×553`, `position:fixed`, `left:50%; top:50%`, **`z-index:501`**,
  `border-radius:4px`, `background:#1e1e1e`, `box-shadow:0 4px 20px #00000080`, `padding:10px`.
- `.talkingIndicator` `max-width:400px`, ellipsised; `.talking-string` `max-width:250px`,
  `font-size:14px`, `max-height:47px`. `.recIndicator a` `max-width:117px`. Both `line-height:41px`.
- **`.recording-reminder`** — `160px` box at `top:50px; left:-50px`, white on black, with a CSS
  triangle `.recording-reminder-arrow` (5px borders) at `top:-5px; left:75px`.
- **Two REC animations:** `.blinking-rec` (`1s step-start infinite`, 50% opacity 0) and
  `.breathing-rec` (`5s ease-out infinite`, scale .9→1.1→.9, `color:red!important`).
- `.mod-msg-container` — `position:absolute; bottom:5px; left:0; width:85%; z-index:11`, black,
  `border-radius:5px`. Pairs with §8.10's `modMessage` setting.
- `.positionBtn` / `.updatePositionBtn` — `position:absolute; bottom:18px`, `right:5px` / `right:122px`,
  `z-index:11`, `#00bc8c` border and text, inverting on hover. **This is R-2's position overlay**,
  and §8.10 found its setting (`positionsIframe` + `positionsIframeUrl`).
- `.notConnectedOverlay` — `bottom:5px; right:5px; z-index:10000`, black, `opacity:.7`.
- `.user-options .dropdown-menu` — **forced** `position:absolute; z-index:1000; top:30px;
  left:-106px; width:228px; font-size:13px; padding:2px`.
- Checkbox/radio styling is a shared idiom: `appearance:none`, `20×20`, `border-radius:50%`,
  `--checkbox-bg-color` when checked, a `\2714` tick via `:before`, and a **`click-wave` keyframe**
  (40px→200px, opacity .35→0, 0.65s) via `:after`. Used in `.themes`, `.text-mode-box`, session
  control and the poll panel.
- Responsive: `#navbarsRoom` font-size 15px at 768–930px; `.mainNavItem` becomes `display:block`
  under 768px; under 600px `#textAreaHolder` gets `min-height:150px` and the soundcloud/screen option
  panels go full width.

**Angular component scope ids present in this slice** (`_ngcontent-ng-cN` — each is one component's
styles, and they are the mapping from CSS to component):
`c4243810522` (container-fluid/popOverDiv) · **`c977335924`** (the room shell — navbar, sidebar,
splits, talking/rec indicators, mod message, position buttons) · `c1441935951` (**user modal** —
tabs, stars, follow-user colour pickers, avatar editor) · `c1011176350` (**play-youtube-modal**,
`max-width:700px`) · `c124836360` (**user-settings-modal**, `max-width:700px`, chat/alert/presenter
colour + size pickers) · `c286619529` (**av-settings-modal**, video `max-height:66.5px`) ·
`c1745790463` (**alert-modal**, upload area) · `c3558549984` (**poll panel** — draggable titlebar
`cursor:move`, 28×28 control buttons, `#responsesTxt` `max-height:300px`, anonymous-poll container) ·
`c330848937` and `c86010747` (**two identical log modals**, `max-width:1000px`,
`.log-messages{max-height:calc(100vh - 350px)}` — almost certainly chat-log and alert-log) ·
`c3707659089` (**session-control-modal**, restream link) · `c4094271479` (`.google-badge`,
`max-height:60px`) · **`c1823712792`** (the **composer** — `#textAreaHolder`, giphy search
`400×700`, `.typing-indicator-container{margin:4px 16px}`).

**§3d is confirmed from a second source:** `.typing-indicator-container` under `c1823712792` is
`margin:4px 16px`, exactly as recorded.

## 10.3 ⭐ RESUME POINT — exactly where to restart

```
file:  ~/Downloads/ptr-manage-dom.html   (170 lines, 269,069 B)
read:  lines 1–160  ✅ §10.1
       line 161, folded lines 1–380 of 942  ✅ §10.2
next:  sed -n '161p' ptr-manage-dom.html | fold -w 110 > /tmp/dom-161.txt
       then Read /tmp/dom-161.txt with offset 380
       (Read caps at ~25k tokens — use limit 350, not the whole file)
then:  sed -n '162,167p' … > /tmp/dom-162.txt   (490 folded lines)
       sed -n '168,170p' … > /tmp/dom-168.txt   (line 168 is 106,764 B — the largest)
```

Line 168 at 106 KB is **the rendered `<body>`** — that is where the 33 unaudited components actually
are. §10.1–§10.2 are `<head>`.

---

# 9. VERIFICATION LOG — 2026-08-16 09:50, on the owner's instruction to double-check

*"Make sure every single thing missing and gap is closed on the file based on hard evidence… double
check over and over and ensure your docs are correct. Hard evidence only."*

Every check below was run **after** the relevant full read, as corroboration of it — never as a
substitute. Counts are reproducible; re-run them before trusting this document.

## 9.1 The seven "missing" settings — verified absent from the bundle, present in the markup

```
                                  app.min.js   evidence-page.manageSession.html
sendFcmAlertsNew                      0                    3
invalidTokens                         0                    3
diasableFCMAlerts                     0                    3
ptrMobileAppCaseByCaseEnabled         0                    9
customMobileAppV3Name                 0                    3
twillioApiToken                       0                    4
protextingSecretTok                   0                    3
alerterAppFCMUserOff                  0                    1
pairSecretKey                         0                    5
useV5                                 0                    3
mobileAppExpireNotificationsDays      0                 present
```

**Both directions agree with the full reads.** §6.13's conclusion stands; its *explanation* did not
and was corrected.

## 9.2 The load-bearing P-1 claim — `alertLater` cannot suppress push

The headline hazard in §6.10 and the CHANGELOG. Extracted verbatim from line 5:

```js
chatModel.send("alertLater", {txt:task.txt, sendTxt:task.sendTxt, sendEmail:task.sendEmail,
  sendTweet:task.sentTweet, sendLinked:task.sendLinked, sendLaterDate:task.sendLaterDate,
  sendLaterAsEmail:task.sendLaterAsEmail, sendLaterAsNick:task.sendLaterAsNick,
  sendAt:task.sendLaterDate, nonTradeAlert:task.nonTradeAlert})
```

**Ten keys. No `dontPush`.** Confirmed against the exact bytes. The immediate `alert` send *does*
carry it (`dontPush` → 3 occurrences in the bundle). **A scheduled alert cannot be told not to push.**

## 9.3 P-1 / P-2 field names — counted in both artefacts

```
bundle:  alerterAppTokens 6 · nonTradeAlert 17 · sendLinked 5 · dontPush 3 ·
         stripeSubscriptionStatus 2 · manageMobileApp 2 · updateUserFCMTok 1 · alertLater 1
markup:  linkedRoomAlerts 5 · isAlertOnly 3 · freeTrialsGetApp 3 · disalowMultiLogins 3 ·
         customClientAlertPostURL 3 · alerterAppTokens 2 · mobilePairCode 2 ·
         stripeSubscriptionStatus 2 · hasMobileApp 1
```

`hasMobileApp`, `mobilePairCode`, `customClientAlertPostURL` and `disalowMultiLogins` are **0 in the
bundle** — consistent with §8's finding that per-user display fields and session settings live only
in the markup.

## 9.4 `hasStripeInfo` is dead code — and a substring near-miss

```
app.min.js:  isMa → 1    isMainRoom → 4    isMarketPlaceUser → 0    hasStripeInfo → 1
markup:      hasStripeInfo → 0             isMarketPlaceUser → 1
```

`isMa` occurs **once**, inside `hasStripeInfo`; `hasStripeInfo` is referenced **nowhere** in the
manage page. **Dead code with a single dead reader.** Use `user.isMarketPlaceUser`.

⚠ The first count read **`isMa` → 5**. Four were `isMainRoom`. **An unanchored count is not
evidence** — see the warning in §4.

## 9.5 `notyping` / `nottyping`

```
app.min.js:  "notyping" → 1    "nottyping" → 1
```

Both spellings exist, exactly once each. **Not a transcription error.** Outbound uses one `t`,
the inbound switch two. Server normalisation unknown.

## 9.6 The logout-webhook bug

```
markup:  login_webhook_url → 4    logout_webhook_url → 2
```

The logout row binds `editable-textarea="sess.login_webhook_url"` while displaying
`{{ sess.logout_webhook_url }}` — which is why `login_` outnumbers `logout_` 4:2 across two fields.
**Editing the logout webhook overwrites the login webhook.** Confirmed by count and by reading.

## 9.7 The unreachable SSO tab

`authMode=='sso'` → **1** occurrence, on the SSO Setup tab's `ng-show`. The auth-mode list read in
§6.12 contains `jwt`, `open`, `registrationA`, `registrationM`, `webinarRoom`, `unamePW`, `closed` —
**no `sso`**. **The tab can never render.** Its one field, `ssoHost`, is therefore unreachable UI.

## 9.8 What this audit CHANGED in the document

| section | change |
|---|---|
| §0 | rewritten from a "when it arrives" checklist to a **closed** record with an answer per question |
| brief → Proven | P-1 restated as **eight gates, exhaustive**; three channels → **eight**; `useV3/V4/V5` moved to proven |
| brief → Unproven | narrowed to the server, `app-presentationarea`, the Marketplace pane, adminusers `perms`, and code 12 |
| §4 | **rewritten entirely** — it still listed the row menu as needing a live capture and `app.min.js` as 1-of-17 read |
| §6.13 | its *explanation* of my lines-2–8 error corrected; the blamed artefact does not exist |
| §7.5 | the `isMa` inference **withdrawn** and replaced with 9.4 |

---

# 4. The evidence I do NOT have — named, so nobody assumes it was checked

**Rewritten 2026-08-16 09:50, after §6–§8.** The previous version of this table was badly stale — it
still listed the row menu as needing a live capture and `app.min.js` as 1-of-17 read. Both were wrong
by then. **This table is the one thing in this document that must be re-checked every session**, because
a stale gap list sends the next person to collect evidence that is already on disk.

## ✅ CLOSED since the last revision — do not re-collect these

| was open | closed by | answer |
|---|---|---|
| `tokcmd` vocabulary | §8.1 | **`'pause'` · `'resume'` · `'unsub'`** — literal `ng-click` args |
| `appcmd` vocabulary | §8.1 | **`'enable'` · `'disable'`** for both `manageMobileApp` and `manageFileAccess` |
| `ptrMobileAppCaseByCaseEnabled` | §8.1, §8.4 | *"App for Some Members?"*; gates the two `manageMobileApp` menu items |
| `customMobileAppLaunchWord` | §6.9 | the custom **URL scheme**; deep link `?t=<jwt>&s=<roomID>&pc=<pairCode>` |
| `customMobileAppV3Name` | §8.4 | *"Custom app String"* |
| `sendFcmAlertsNew` | §8.4 | *"New FCM Method? — Use pub/sub for notifications"* (server behaviour still unknown) |
| `invalidTokens` | §8.4 | a **manual** comma-separated JWT denylist field |
| `diasableFCMAlerts` | §8.4 | *"Disable PUSH Alerts?"* — room-wide push kill switch |
| Twilio / Protexting | §8.4 | `twillioApiSID`, `twillioApiToken`, `twilioPhone`, `protextingSecretTok`, `protextingGroupIDs` |
| `makeReqTokenForCmd` | §6.12 | `{token: localStorage["<roomID>.tokenSite"], cmd, source:"webApp"}`; **never returns falsy** |
| `__al` | §6.12 | the site SSO JWT; `jwt_decode` → `{email, name, permissions, sessions, type, perms}` |
| `otherJWTSessions` | §6.12, §6.7 | `alObj.sessions` — carried **inside** the JWT; drives a room-picker, **not** device sessions |
| `$scope.appObj` | §6.10 | `{pairCode, roomID, myemail, al, +4 store URLs}` |
| the SoundCloud payload | §6.7 | the **bare share URL**, prefix-validated, persisted as `roomState.soundCloudURL` |
| `recStartTime` (R-14) | §6.5 | on `roomState` with `isRecording` and `recUser` |
| `enterprise-and-control-plane.md` | §7 | read; three of its own gaps closed by §6 |
| `stripe-details-*.json` | §7.5 | read; confirms §6.12 verbatim |
| `evidence-page.manageSession.html` | §8 | read in full, 2,718 lines |

## ❌ STILL OPEN — with the specific thing each one blocks

| missing | blocks | how to get it | on disk? |
|---|---|---|---|
| ⭐ **`/public/html/POST_ROUTE_API_DOCUMENTATION.md`** | **which of §8.2's eight push gates the server evaluates and in what order**; what `sendFcmAlertsNew` switches to; whether `closeRoomAndRevoke` writes `invalidTokens` | fetch it — the manage page links to it as *"API POST Routes Docs"* | **no** — one fetch |
| ⭐ **`/public/dist/maps/app.min.js.map`** | original names and comments for everything in §6 | fetch it; 404 is an acceptable answer | **no** — one fetch |
| **The reference's SERVER itself** | what `restoreMobileAppTokens` does (§3a: empty ack); whether a push actually lands on a phone; how fan-out picks recipients | only observable with a paired device on a live room, or by asking the operator | no |
| **`~/Desktop/new-room/enterprise/prt2.json`** (9.4 MB) — the **account page** DOM | the seat quota (`1 / 2`), `subscriptionPlans` rendering, the owner/account layer — **the surface P-3 sits on**. Never read. | read it, sliced | **YES** |
| **`~/Desktop/new-room/enterprise/ptr1.json`** (23.5 MB) — manage page, 18 modals **open** | the Marketplace pane (never rendered), the permissions modal in situ, anything the static template omits | read it, sliced | **YES** |
| **The Marketplace pane's markup** | P-3's membership model — `memberships[]` is defined there | needs a room where `disableMarketplace` is false; API shape already known (§6.12) | no |
| **The rendered `.stripe-mini` block** | nothing new — the fields are known (§6.12) and the markup is known (§8.9). **Low value.** | a room with a marketplace member | no |
| ~~**`perms` vocabulary for `/users/v1/adminusers`**~~ | ✅ **CLOSED §15.8 — and the answer is that it is UNANSWERABLE from any client.** The add-admin form collects **only Name, Email, Password**; `perms` exists on the model and **no control ever populates it**, so every `addAdminUser` posts `perms: {}`. **If P-3 needs admin roles we are designing them, not matching them.** | — | — |
| **`updateUserXref` code 12** | nothing known to depend on it | unobserved in either menu (§7.2). Recorded as a gap, not guessed | no |
| **`source-v4-2026-08-15/main.d1d09071be31f1ba.js`** — only the regions in `mobile-app-decoded.md` §0 read | everything in §1; `app-presentationarea`'s +299 bytes | re-decode | **YES** |
| **`source-v3-2026-08-15/main.99a5781d1d7a7775.js`** — never opened | nothing known; unknown unknowns | read only if v3 behaviour is ever in question | **YES** |
| **`ptr-manage-dom.html`** (269 KB) — the live room as admin | **33 of the 42 rendered components**, unaudited | read it; rendered DOM outranks the bundle | **YES**, `~/Downloads` |
| **`vendor.min.js`** (1.25 MB) | classified third-party and not read — **a judgement, not a measurement** (§7's own words) | read if a behaviour traces into it | no |

## Two things that are NOT gaps, recorded so nobody re-opens them

**1. `user.isMa` — resolved, and `hasStripeInfo` is dead code.**

§7.5 inferred `isMa` meant "is marketplace". **Withdrawn, and now settled with counts:**

```
app.min.js:                  isMa → 1      isMainRoom → 4      isMarketPlaceUser → 0
evidence-page.manageSession: hasStripeInfo → 0                 isMarketPlaceUser → 1
```

**`isMa` occurs exactly once in the entire bundle — inside `hasStripeInfo`. And `hasStripeInfo` is
referenced zero times in the manage page.** So the only reader of `isMa` is a function nothing calls.
The Stripe block is gated on **`user.isMarketPlaceUser`**, which does not appear in the bundle at all.

**Conclusion: `hasStripeInfo` is dead code and `isMa` has no live consumer. Use
`user.isMarketPlaceUser`.**

> ⚠ **A near-miss worth recording.** The first count returned **`isMa` → 5**, and 5 occurrences would
> have read as a real, widely-used field. It is 1 real occurrence plus **4 matches inside
> `isMainRoom`** — a substring collision. **I nearly wrote "5" into this document as a finding.** Any
> count in this file that is not anchored to a word boundary is not evidence; re-run it as
> `grep -o 'name[A-Za-z]*' | sort | uniq -c` before believing it.

**2. The `notyping` / `nottyping` spelling mismatch** (§6.9) — **verified, one occurrence of each:**

```
app.min.js:  "notyping" → 1        "nottyping" → 1
```

The client sends `notyping`; the inbound switch handles `nottyping`. **Both spellings genuinely exist,
exactly once each** — this is not a transcription error on my part. Whether the server normalises
between them is unknown and needs the server, not another client capture.

---

# 5. Queue

1. ⭐⭐ **Fetch `/public/html/POST_ROUTE_API_DOCUMENTATION.md`** — §8.7. The manage page links to it
   as *"API POST Routes Docs"*. **This is the reference's own server-side API documentation**, and it
   is the only plausible source left for the three questions no client capture can answer: which push
   gates the server evaluates and in what order, what `sendFcmAlertsNew` switches to, and whether
   `closeRoomAndRevoke` writes `invalidTokens`. Two URLs to try:
   `/public/html/POST_ROUTE_API_DOCUMENTATION.md` and `/public/html/api-docs.html`.
2. ⭐ **Fetch `/public/dist/maps/app.min.js.map`** — §6.14. If served, the original unminified sources
   with real names and comments. Second only because §8.7 answers questions this cannot.
3. ~~**Capture the user row menu**~~ — ✅ **DONE, §8.1.** `tokcmd` ∈ `pause|resume|unsub`,
   `appcmd` ∈ `enable|disable`. It was in `evidence-page.manageSession.html` in this repo all along;
   no live capture was ever required.
4. **Read `~/Desktop/new-room/enterprise/ptr1.json` (23.5 MB) and `prt2.json` (9.4 MB)** — §7.1.
   Read-only reference captures of the manage page (18 modals **open**) and the **account page**.
   The account page is the one surface never read, and it is where seat quotas, `subscriptionPlans`
   and the owner/account layer render. Slice it the way §6 sliced the bundle.
5. **Read `ptr-manage-dom.html`** (269 KB, in `~/Downloads`) for the 33 unaudited components — one
   rendered file instead of 33 bundle decodes, and rendered DOM outranks the bundle.
6. **Re-decode to v4** (§1) and read `app-presentationarea`'s +299.
7. **P-1's send-time gates**, written down before the fan-out is built — §6.15 lists the four pieces
   that are now known and the three hazards.
8. **R-15**, the Mobile App tab — §6.10 supplies the pane's content (two apps, four store URLs, the
   `showMobileTab` default) and §6.9 the deep link.
9. **Step 2** of the component audit — 33 remaining, largest last.

**P-3 still gates P-1 and P-2.** Both terminate in the enterprise console; settle its model before
building either, or they get built against a boundary that then moves.

## What §6 changed about the four owner requirements

*(Written after all 17 lines were read. The earlier version of this table, written at six slices, was
more pessimistic on P-3 and had P-5's payload as unknown — both are now settled.)*

| | before `app.min.js` | after reading it in full |
|---|---|---|
| **P-1** | root cause known (14-day `lastLogin` decay), no way to act on it | **A WIRING PROBLEM, NOT A DATA PROBLEM.** The signal exists (`stripeSubscriptionStatus`, `stripeCurrentPeriodEnd`, `stripeCancelAt` on the user row, §6.12); the decision point exists (`dontPush`, §6.10); the revocation call exists (`updateUserFCMTok` + `tokcmd`, §6.1). Nothing joins them. Three hazards found: `sendLinked` fans alerts into other rooms, `alertLater` **cannot** suppress push, and browser notifications are a fourth channel (§6.9) |
| **P-2** | a green field | **Four pieces already exist** — `isM`, the md5-email identity, `kickDuplicates` (§6.2), and `alerterAppTokens` deduplicated *by email* in the admin UI (§6.13), which is the reference admitting the problem. **None can be built on as-is:** `isM` is client-asserted and the ban is a localStorage key (§6.3, §6.4). Enforcement must be server-side |
| **P-3** | "investigate further" | **Three existing pieces of a control plane**: the **marketplace** on `/ptr_app/mp/v2` with a `memberships[]` array (§6.12), **API keys** with per-session and per-endpoint restriction (§6.11, §6.13), and an **admin-users table** at `/users/v1/adminusers` with a `perms` object (§6.13). Plus `chatTabsWithBadges` as an existing badge-gated access mechanism (§6.13) |
| **P-5** | "need to discuss" | **A complete blueprint.** SoundCloud takes **the bare share URL**, validated by prefix, stored on room state as `soundCloudURL` so late joiners get it, with **two** stops — room-wide and local-only (§6.7). YouTube-for-all shows the iframe DOM (§6.11). Three precedents to copy from |

**P-4 (the drawing tool) has no evidence at all** in anything read so far — no canvas, no annotation,
no drawing command in the ~100-case inbound switch or the ~50 outbound commands. It is a genuine
addition, not a reconstruction, and should be designed rather than searched for.

**P-3 gates P-1 and P-2.** Both terminate in the enterprise console; settle its model before building
either, or they get built against a boundary that then moves.

---

## §16.7 — ⭐ THE DELETION RISK IS SMALLER THAN THIS FILE ASSUMED. Both "never read" stylesheets are already IN the repository, tracked by git.

**2026-08-16.** Written after computing SHA-256 over the two queue items 0a and 0b and over every
large CSS file in the repository. **This is rule 6 firing for the seventh time** — I queued two
artefacts as *"on the Desktop, never read, must be transcribed before the dumps are deleted"* when
both already live inside `trading-room-app` **and are committed**.

### The digests, measured

| file | SHA-256 | bytes |
|---|---|---|
| `~/Desktop/new-room-control/css-modals/styes.css` | `23bc4e02…c2f49c` | 218,719 |
| **`apps/controller/evidence-dumps/TIER1-fetched/styles.css`** | **`23bc4e02…c2f49c`** | **218,719** |
| `~/Desktop/new-room/css/complete-app-styles.css` | `d1829b30…6d19bd609` | 688,687 |
| **`apps/room/css/complete-app-styles.css`** | **`d1829b30…6d19bd609`** | **688,687** |

Both pairs are **byte-identical**, and `git ls-files --error-unmatch` returns both repo paths, so
both are **tracked, not ignored**.

### What that changes — three things, and none of them are cosmetic

1. **Neither file dies with the dump deletion.** The rule at the top of this file — *"write values,
   not locations"* — was written because a byte offset into a deleted capture is worthless. **It does
   not apply to these two.** A citation of the form `evidence-dumps/TIER1-fetched/styles.css:556` is
   permanent, reproducible by the next reader, and survives every deletion the owner plans. The
   transcription burden on the CSS corpus is therefore **much lower than §16 assumed**, and the
   remaining ~19,000 lines of CSS do not need to be copied into prose to be safe.
2. **The Desktop copies are duplicates, not sources.** Read the repo path. Same bytes, no dependency
   on a folder that is scheduled for deletion, and the read is reproducible after it is gone.
3. **The queue's items 0a and 0b were mis-scoped.** They are still worth reading — reading them
   closed §15.9's two "uncaptured ancestor" gaps (§16.6) — but they were **never at risk**, so they
   are not the emergency the queue made them. The genuinely at-risk artefacts are the ones with **no
   byte-identical copy inside the repository**, and that set is being computed by digest rather than
   guessed at.

### The room CSS corpus, now inventoried by digest rather than by assumption

Four distinct stylesheets exist for the room, and they are **not** copies of one another:

| repo path | SHA-256 | lines | bytes |
|---|---|---|---|
| `apps/room/css/complete-app-styles.css` | `d1829b30…` | 8,086 | 688,687 |
| `apps/room/docs/source-v4-2026-08-15/styles.ee2a710065b60389.css` | `8b54386a…` | **20** | 444,793 |
| `apps/room/src/lib/styles/protradingroom-source.css` | `d0cf9aba…` | **20** | 444,528 |
| `apps/room/src/lib/styles/captured-runtime-components.css` | `88d308b0…` | 8,156 | 216,055 |
| `apps/controller/evidence-dumps/TIER1-fetched/theme.css` | `497733a0…` | 6,809 | 232,979 |
| `apps/controller/evidence-bootstrap-3.3.7.css` | `74a581f4…` | — | — |

Two observations worth recording, both from the numbers above and neither previously written down:

- **`styles.ee2a710065b60389.css` is the v4 build's own minified stylesheet — 444,793 bytes on 20
  lines.** `protradingroom-source.css`, which is in `src/lib/styles` and therefore **shipped**, is
  444,528 bytes on 20 lines — **265 bytes smaller**. Those two are the same artefact at two moments
  or with one edit between them. **The delta is unexplained and is a real open question**: a shipped
  stylesheet that differs from the captured reference by 265 bytes is either a deliberate patch that
  should be documented or a stale copy. It is NOT recorded anywhere as either.
- **`complete-app-styles.css` (688,687 B, 8,086 lines) is formatted, not minified** — it is the
  useful one to read, and it is 244 KB larger than the minified build sheet, which is what expansion
  costs. It is the correct target for queue item 0b.

### Correction to this file's own queue

The RESUME HERE rows for 0a and 0b said **"Never read"** and pointed at `~/Desktop`. Both halves were
misleading: they point at duplicates, and the urgency implied by the deletion banner does not apply.
Rows corrected in place. **The pattern is the same one rule 6 exists for** — a gap is only a gap when
*both* halves are checked, and "this evidence is at risk" is a claim about our repository that has to
be checked against our repository before it is written down.

---

## §16.8 — ⭐ THE 265-BYTE DELTA IS THE FILES SORT BAR, AND IT REDATES THE WHOLE CSS QUEUE

**2026-08-16.** §16.7 opened item **0b′** — *"the shipped stylesheet is 265 bytes smaller than the
captured v4 build sheet; deliberate patch or stale copy, not recorded as either."* **It is closed,
exhaustively, and the answer reorders the CSS queue.**

### The measurement

`apps/room/src/lib/styles/protradingroom-source.css` and
`apps/room/docs/source-v4-2026-08-15/styles.ee2a710065b60389.css` are both 20 lines. **Lines 1–19 are
byte-for-byte identical** (per-line lengths match exactly; `cmp` puts the first differing byte at
char 421,881, inside line 20). Splitting both on `}` into 5,407 / 5,410 readable rules and diffing
gives **two hunks and nothing else**:

```
5215c5215
<                   :root{--dark-gray: #aaa; …
> @charset "UTF-8";:root{--dark-gray: #aaa; …

5298a5299,5301
> .st-fileSortBar{font-size:12px}
> .st-fileSortName,.st-fileSortDate{color:var(--tabs-color);background-color:transparent;border:1px solid var(--file-see-more-bg)}
> .st-fileSortName.active,.st-fileSortDate.active{background-color:var(--file-see-more-bg)}
```

**The arithmetic closes to the byte:** `@charset "UTF-8";` is **17** bytes, the three rules are
**248** bytes, `17 + 248 = 265`. **The delta is fully explained; there is no third difference.**

### It is not a defect. It is a DATE.

The identifier is `st-fileSortBar` — **the exact control the global `~/CLAUDE.md` names as the
canonical search-vs-read failure** (*"I searched for `st-fileSortBar`, got nothing, and reported 'not
in the capture'"*). So the first instinct is that something is missing again. **Check our source
before writing that down — rule 6 — and it is the opposite:**

- `apps/room/src/app.css` carries all three rules **verbatim as captured evidence** inside the
  `The Files sort bar` docblock, and carries them expanded immediately below it as `.st-fileSortBar`,
  `.st-fileSortName, .st-fileSortDate` and their `.active` pair. **Named by symbol rather than by
  line, deliberately** — the line numbers this row used to carry (`3089-3091` and `3110-3122`) went
  stale on 2026-08-29 when 185 lines of pre-decomposition panel CSS were deleted from that file, and
  a citation past the end of its own file is exactly what `doc-citation-contract.test.ts` exists to
  refuse.
- `apps/room/src/lib/components/FilesPane.svelte:321-325` carries the markup with the decoded class
  lists (`d-flex flex-wrap justify-content-center align-items-center mt-2 st-fileSortBar`,
  `btn btn-sm m-1 st-fileSortName`, `btn btn-sm m-1 st-fileSortDate`).
- `apps/room/src/lib/files-pane-contract.test.ts` **pins all three rules** and carries two negative
  controls that a plausible rewrite would trip: `not.toContain('.st-fileSortName:hover')` and
  `not.toMatch(/#[0-9a-f]{3,6}/)` on both button rules — the second proving the colours are
  **var-only**, never literal hex.
- `apps/room/src/lib/file-sort.ts:13-16` already records the reason in prose: *"our older capture
  contains `st-fileSortBar` zero times and the v4 bundle contains it once. The feature is not missing
  from the older capture because anybody searched wrong — **the evidence simply predates it.
  Evidence has a date, and the live application moves.**"*

**So the 265 bytes are the reference growing a feature between two captures, and we have both sides
and the feature.** `protradingroom-source.css` is not "stale by an unknown amount" — it is stale by
**exactly one feature, already built and already contract-tested.** That is a much stronger statement
than "265 bytes differ", and it is the kind of statement only a full diff can produce.

### ⛔ THE CORRECTION THAT MATTERS: queue item 0b was pointed at the WRONG STYLESHEET

`files-pane-contract.test.ts:268` asserts, and passes:

```js
expect(captured).not.toContain('.st-fileSortBar');   // captured = ../../css/complete-app-styles.css
```

**`apps/room/css/complete-app-styles.css` does not contain the sort bar — so it is NOT the v4
stylesheet.** The queue called it *"the complete v4 ROOM CSS"* and put it at the top of the reading
order. **Reading 8,086 lines of it as the v4 reference would have imported pre-v4 values wholesale —
a direct rule 6d violation** (*"THE CORPUS IS v4"*), and the sort bar proves the two builds genuinely
disagree.

Its own header, read rather than assumed, says what it actually is:

```
  COMPLETE APPLICATION CSS CAPTURE
  Page: https://chat.protradingroom.com/?id=6a628a99731b9f77ae9bf505
  Captured: 2026-07-30T14:35:01.059Z

/* =========================================================
   SOURCE: https://use.fontawesome.com/releases/v5.8.1/css/all.css
   ========================================================= */
```

**Three properties, all measured, none of them "the v4 room CSS":**

1. **It is dated 2026-07-30 — sixteen days before the v4 build capture (2026-08-15).** That is why
   the sort bar is absent, and it is the whole explanation.
2. **It is every stylesheet on the page, not the app's own sheet.** Whitespace-stripped it is
   **616,199 bytes** against the build sheet's **439,090** — **177 KB more CSS**, which is
   FontAwesome 5.8.1, animate.css and the rest, each under its own `SOURCE:` banner. It is therefore
   **not** a pretty-print of `protradingroom-source.css` (normalized digests differ:
   `311f2eb4…` vs `b430e343…`).
3. **It is browser-serialized, not author source.** `border: 0.08em solid rgb(238, 238, 238)`,
   `transform: rotate(1turn)`, `animation: 2s linear 0s infinite normal none running fa-spin` — those
   are CSSOM `cssText` serializations, with hex normalized to `rgb()` and shorthands reordered.
   **A value copied out of it is the browser's rendering of the author's value, not the author's
   value**, which matters the moment a rule is compared against a `.less` source.

### What each room stylesheet is actually FOR, now that they are told apart

| artefact | what it really is | use it for |
|---|---|---|
| `docs/source-v4-2026-08-15/styles.ee2a710065b60389.css` | ⭐ **the v4 build's own sheet, 2026-08-15, author values, minified** | **THE v4 CSS REFERENCE.** Rule-split it on `}` into 5,410 lines and read that |
| `src/lib/styles/protradingroom-source.css` | the same sheet **one feature earlier** (no sort bar, no `@charset`) | nothing — superseded, and the delta is now fully known |
| `css/complete-app-styles.css` | **2026-07-30 multi-sheet RUNTIME capture**, browser-serialized, incl. FontAwesome/animate | ⭐ **the only record of the THIRD-PARTY sheets as the browser saw them**, and the only source of computed serializations |
| `src/lib/styles/captured-runtime-components.css` | 8,156 lines / 216,055 B | (not yet characterized — do the same digest/date check before trusting it) |

**Queue rows 0b and 0b′ corrected in place.** The lesson is the one this file keeps re-learning in a
new costume: **an artefact's NAME is not evidence of what it contains.** `complete-app-styles.css`
reads like the definitive room stylesheet and is a three-week-old capture of a different build with
FontAwesome bolted on. One `expect(...).not.toContain` already in our own suite said so.

---

## §16.9 — 0b″ closed: `captured-runtime-components.css` is GENERATED from the superseded 2026-07-30 capture — and its selectors are a component census

**2026-08-16.** Opened in §16.8, closed by reading its header rather than assuming from its name.

```css
/*
 * GENERATED FROM css/complete-app-styles.css
 * Source SHA-256: d1829b306dcc6c71a6142c61e46af69ba4eb30cead1a083120b962c6d19bd609
 *
 * Angular's runtime scope attributes are translated to captured custom-element
 * hosts while retaining their original cascade specificity. …
 * Do not edit this file by hand; run: pnpm css:sync-captured
 */
```

**That source digest is `complete-app-styles.css` exactly** (§16.7's table). So a **shipped**
stylesheet under `src/lib/styles/` is derived from the artefact §16.8 just proved is a
**2026-07-30, browser-serialized, pre-v4 multi-sheet runtime capture**. Two consequences follow
mechanically, and neither is recorded anywhere else:

1. **It cannot contain anything the reference gained after 2026-07-30.** The Files sort bar is the
   worked example — absent from its source, therefore absent from it, and `app.css`'s own
   `.st-fileSortBar` block is where those rules actually live instead. **Do not treat this file as a completeness check.**
2. **Its values are browser serializations, not author values** (§16.8 property 3), because its
   source is. A colour read out of it is `rgb(…)` where the author wrote hex.

**Neither is a defect** — it is a generated file with a named regeneration command and an honest
provenance header, which is exactly right. It is a **dating** fact, and it is the second time in this
session that dating an artefact mattered more than reading it.

### ⭐ The by-product: a 26-component census of the v4 room, from the cascade guard

The generator writes an ownership boundary into every `app-room` rule — `:not(app-room :is(…) *)` —
and that `:is()` list enumerates every child host it found. Read in full at lines 26–52:

```
app-alert-filter-modal      app-alert-logs-modal        app-alert-qa-modal
app-alert-send-report-modal app-alerts-advanced-search  app-all-user-pmmodal
app-av-settings-modal       app-chat-logs-modal         app-debug-log-modal
app-followed-users-modal    app-mobile-app-info-modal   app-muted-users-modal
app-play-youtube-modal      app-poll-modal              app-post-alert-modal
app-privchat                app-rec-preview             app-reply-modal
app-rich-text-editor        app-room-roster             app-scheduled-alerts-modal
app-screenshare-preview     app-session-control-modal   app-user-info-modal
app-user-settings-modal     app-webrtc-troubleshooter   as-split
```

**26 components plus `as-split`**, under `app-root` → `app-room`. Several bear directly on open
items: `app-mobile-app-info-modal` (R-15, the Mobile App tab), `app-webrtc-troubleshooter`,
`app-debug-log-modal`, `app-alerts-advanced-search`, `app-scheduled-alerts-modal` (the alert
scheduler), `app-rec-preview` + `app-screenshare-preview`.

⚠️ **Apply rule 6b to this list — it is a LOWER BOUND, not a census.** The list contains exactly
those components that **had scoped CSS rules in the 2026-07-30 capture**. A component with no
component-scoped styles, or one added after 2026-07-30, cannot appear in it. **Its absence from this
list is not evidence of anything.** The presence of each of the 26 *is* hard evidence.

---

## §16.10 — ⭐ THE DELETION-RISK REGISTER, MEASURED. The at-risk evidence was never the CSS.

**2026-08-16.** The banner at the top of this file has driven every write since it was added:
*"the dumps are being deleted — write values, not locations."* **It has been enforced against the
wrong targets.** §16.7 found the two flagged stylesheets already tracked in git. This section
answers the question properly — **which reference artefacts have NO counterpart inside
`trading-room-app`** — by measuring rather than assuming.

### Method, and its one honest limit

Both `~/Desktop/new-room` and `~/Desktop/new-room-control` are **full sibling checkouts of the
application**, not dump folders — each has `src/`, `services/`, `package.json`,
`pnpm-workspace.yaml`. `new-room` holds **246,775** non-`node_modules` files; `new-room-control`'s
`services/` alone is **24 GB** of Rust target output. **A file-by-file digest comparison of those two
trees is not a tractable operation and was abandoned after it produced a 50 MB digest list** — that
was my tooling being wrong for the job, not a finding, and it is recorded here so nobody retries it.

The tractable question is the right one anyway: the **evidence directories** — the captures, dumps
and pastes that exist nowhere else — are a short list, and each was checked for a repo counterpart
by name.

### `~/Desktop/new-room` — 11 evidence directories with NO repo counterpart

| directory | files | size | notes |
|---|---|---|---|
| ⭐ **`more-fucking-evidence`** | 3 | **16 K** | **Cited by name in the global `~/CLAUDE.md`** as the source that revealed the **30 empty `<tr>` elements** around 2 populated ones driving `nth-of-type` striping — *"no search for a class name would ever have surfaced an empty element."* **Tiny, authoritative, at risk.** |
| **`account-page`** | 2 | 1.0 M | **The account page — which §7/§13 call "the one surface never read."** |
| `must-match` | 3 | 532 K | name implies a reference-match target |
| `mising` *(sic)* | 3 | 788 K | |
| `q&a` | 2 | 12 K | bears on `app-alert-qa-modal` (§16.9's census) |
| `stylesheet` | 1 | 24 K | |
| `gap-dump` | 1 | 168 K | |
| `modal` | 1 | 12 K | |
| `start-up` | 1 | 4 K | |
| ⛔ **`enterprise`** | 2 | **31 M** | `ptr1.json` + `prt2.json`. **CONTAINS LIVE JWTs AND PII — MUST NOT BE COMMITTED.** Already fully decoded into `apps/room/docs/website-ptr1-prt2-full-read.md` (6,600+ lines, in the repo). |
| ⛔ **`NEXT-STEP`** | 5 | **88 M** | Same PII constraint applies until each file is checked. |

**Present in the repo, not at risk:** `new-evidence` → `apps/room/new-evidence`, `second-dump` →
`apps/room/second-dump`, `preview` → `apps/room/preview`.

### `~/Desktop/new-room-control` — one directory that matters

`css-modals/` holds **40 files**. Exactly **one** — `styes.css` — is in the repo (§16.7). The other
**39 are not**, and they are queue item 0c:

```
bootstrap.css   bottstrap-min.css (sic)
alert.less  badge.less  breadcrumb.less  button-groups.less  buttons.less  carousel.less
close.less  code.less  component-animations.less  dropdowns.less  forms.less  glyphicons.less
grid.less  input-groups.less  jumbotron.less  labels.less  list-group.less  media.less
modals.less  navbar.less  navs.less  normalize.less  pager.less  pagination.less  panels.less
popovers.less  print.less  progress-bars.less  responsive-embeds.less  responsive-utilities.less
scaffolding.less  tables.less  thumbnails.less  tooltip.less  type.less  utilities.less  wells.less
```

**37 `.less` files. `find` over the repository returns ZERO `.less` files anywhere.** These are the
**Bootstrap 3 LESS sources** — the *custom-vs-stock oracle*. `apps/controller/evidence-bootstrap-3.3.7.css`
covers part of that job, but **compiled CSS cannot answer what a LESS variable was**, and
"is this rule stock Bootstrap or a PTR customization?" is a question the manage-page reconstruction
asks constantly. **~517 KB, uniquely valuable, entirely at risk.**

### The recommendation, stated once and left to the owner

**Three tiers, and only the owner decides:**

1. **Copy in before deletion — no PII, small, uniquely valuable:** `css-modals/*.less` +
   `bootstrap.css` (~517 K), `more-fucking-evidence` (16 K), `q&a` (12 K), `stylesheet` (24 K),
   `modal` (12 K), `start-up` (4 K). **~585 KB total.** Precedent exists and is already tracked:
   `evidence-dumps/TIER1-fetched/styles.css` and `apps/room/css/complete-app-styles.css`.
2. **Read and transcribe before deletion — larger, or unexamined:** `account-page` (1.0 M),
   `must-match` (532 K), `mising` (788 K), `gap-dump` (168 K).
3. ⛔ **NEVER COPY — transcribe findings only:** `enterprise` (31 M) and `NEXT-STEP` (88 M), which
   carry live JWTs and PII. `enterprise` is already decoded in the repo; `NEXT-STEP` is not checked.

**I have not copied anything.** Moving 585 KB into a git-tracked repository is the owner's call, not
mine, and `.gitignore` deliberately blocks live-room captures.

---

## §16.11 — `more-fucking-evidence` READ IN FULL (3 files, all 16 KB). **Zero gaps. It is 100% consumed, verbatim, typo included.**

**2026-08-16.** The artefact the global `~/CLAUDE.md` cites by name as the canonical read-don't-search
evidence. Read end to end — all three files, both of them one line, `sounds` at 4,976 bytes. **It is
now transcribed here, so it survives the deletion regardless of what the owner decides in §16.10.**

### `files` — a NON-image row, in full

```html
<div><span class="st-fileName">Melissa's Premarket Checklist.pdf </span><span class="st-fileSize ml-2">68Kb </span><div class="st-fileName"><i>Nov 24, 2025, 7:27:14 AM</i></div></div>
```

### `images` — an IMAGE row, in full

```html
<div class="d-flex flex-column"><div><span class="st-fileName">TR3NDY ROOM SCHEDULE.png </span><span class="st-fileSize ml-2">44Kb </span><div class="st-fileName"><i>Oct 13, 2023, 11:27:49 PM</i></div></div><a target="_blank" href="/var/www/uploads/4a500d1f358c6eefbf70295bdb7796d0" type="image/png" download="TR3NDY ROOM SCHEDULE.png" class="ng-star-inserted"><img alt="Image" class="fileDriveImg" style="background-color: #000;" src="/var/www/uploads/4a500d1f358c6eefbf70295bdb7796d0"></a><!----></div>
```

### `sounds` — the two populated rows' action cell, in full

```html
<table class="table table-striped m-auto w-100 mt-3 st-fileTable ng-star-inserted"><tbody id="filesDriveList">
<td class="ng-star-inserted"><div class="d-flex justify-content-center align-items-center flex-wrap"><a class="fileDowload ng-star-inserted" href="/var/www/uploads/66b8e8bdc0470b24bf74e4fe0fa2bf86" type="audio/mpeg" download="PMZ mp3.mp3"></a><!----><a title="Download File" target="_blank" class="btn st-fileDownload" href="/var/www/uploads/66b8e8bdc0470b24bf74e4fe0fa2bf86" type="audio/mpeg" download="PMZ mp3.mp3"><i class="fas fa-download mr-2"></i>Download </a><!----><button type="button" title="Play" class="btn ml-2 st-fileDownload btn-success ng-star-inserted"><span class="ng-star-inserted"><i class="fa fa-play-circle mr-2"></i>Play </span></button></div></td>
```

### The nine details that only a full read produces — every one already in our source

| detail, from the markup | where ours carries it |
|---|---|
| `<tr>` **emitted for EVERY file**, cells collapsed when it belongs to another tab — **7 empty, 2 populated, 23 empty = 32 rows, 30 empty**, which is what drives `table-striped`'s `nth-of-type` | `FilesPane.svelte:393-400` — the `{#each}` is unfiltered, the `{#if !files.matchesFileTab(item)}` arm is deliberately empty, and the comment says *"the row still counts for `nth-of-type` striping"* |
| ⭐ **`class="fileDowload"` — the reference's own typo**, missing the `n` | `FilesPane.svelte:455` — **preserved exactly**, not "corrected" |
| ⭐ **two DIFFERENT FontAwesome prefixes**: `fas fa-download` but `fa fa-play-circle` | `:469` and `:491` — both kept distinct |
| `type="audio/mpeg"` / `type="image/png"` — the real MIME, **three attributes from the row a search would have stopped at** | `files-pane-contract.test.ts:620` |
| size is **always `Kb`, never scaled** — `4304Kb`, not `4.3Mb`, rounded | `fileSizeInKb` + literal `Kb`; `file-sort.ts:241` records `i.round(e.size/1024)` |
| trailing spaces inside every label — `"…pdf "`, `"68Kb "`, `"Download "`, `"Play "` | `{' '}` at `:469`, `:491`; the test comment at `:199-204` records a prior wrong assertion about exactly this |
| a **second, empty, contentless** `<a class="fileDowload">` beside the visible Download button | `:455` |
| `<img alt="Image" class="fileDriveImg" style="background-color: #000;">` | `:442`, with `.fileDriveImg { max-width: 200px }` and the test at `:711-714` explaining a fixed 120×90 box distorted uploads |
| dates as `Nov 24, 2025, 7:27:14 AM` — Angular `date:'medium'`, **the format that became `20-3341` when a regex was written over it** | rendered from the formatted string, per the global rule |

**Verdict: zero gaps.** Every class, attribute, glyph, MIME type, trailing space and the striping
semantics are already implemented and pinned by `files-pane-contract.test.ts`. **This is rule 6
firing for the tenth time in this file**, and it is the strongest instance yet — the one artefact
most likely to contain something missing contains nothing missing at all.

⚠️ **It is still a §16.10 tier-1 copy-in candidate.** 16 KB, no PII, cited by name in the standing
instructions, and the *only* record of the 30-empty-row striping behaviour in its original form.
This section transcribes it; the file itself is still worth keeping.

---

## §16.12 — ⭐ `start-up/start-up-login` + `q&a/*` READ IN FULL. **REAL GAPS FOUND — five in the v4 login form, one Q&A control.**

**2026-08-16.** Two more §16.10 at-risk artefacts (3,532 B and 6,624 B), read end to end and
transcribed here so they survive the deletion. **Unlike §16.11, these are NOT fully consumed.**

### The reference login form — `start-up/start-up-login`, rendered v4 DOM, transcribed

Container and heading:
```html
<div class="row login-row">
  <div class="col-md-6 offset-md-3 col-sm-6 offset-sm-3 col-xs-12 login-form-container animated fadeInRight faster">
    <h1 class="room-title"> Welcome to the Room 3625 </h1><!---->
    <p class="text-center authenticate-info">Please complete this form:</p>
    <form novalidate class="mb-3 login-form">
```
Avatar block:
```html
<div class="loginGravatar"><div class="text-center user-avatar">
  <img src="https://www.gravatar.com/avatar/6ee71e550a8c162767abf7d2dc8eea84?d=mm">
  <span title="Setup Avatar" class="setup-avatar"><i class="fas fa-cog"></i></span>
  <div class="user-nick">@Billy Ribeiro</div>
</div></div>
```
Fields, footer row and links:
```html
<label for="login-nickname-new">Name</label>
<input type="text" id="login-nickname-new" name="login-nickname-new" placeholder="Name or Nickname"
       aria-label="Name" aria-describedby="nickHelpBlock" class="form-control">
<span id="addon-admin" class="input-group-text pl-2 pr-2"><i class="fas fa-user"></i></span>

<label for="login-email">Email</label>
<input type="email" id="login-email" name="login-email" placeholder="Email"
       aria-label="email" aria-describedby="addon-email" class="form-control" disabled="">
<span id="addon-email" class="input-group-text pl-2 pr-2"><i class="fas fa-envelope"></i></span>

<div class="error text-danger small"></div>
<div class="d-flex p-2 justify-content-between mt-3 align-items-center">
  <div class="form-check">
    <input type="checkbox" id="remember-me" class="form-check-input">
    <label for="remember-me" class="form-check-label">Keep me logged in</label>
  </div>
  <div><button type="submit" class="btn-login btn btn-primary buttonload text-center pl-2 pr-2"><span>Login</span></button></div>
</div>
<div class="mt-1 text-right"><a class="session-login-link">Not you? clear form</a></div>
<div class="mt-3 t text-center"><a class="session-login-link">Have a password?<br>Click here</a></div>

<div class="login-footer">
  <p class="text-center"> Powered by: <a href="https://protradingroom.com" target="_blank">ProTradingRoom.com</a></p>
  <p class="text-center"> Version: v4.0.1-61268ec1 </p>
</div>
```

### ⛔ FIVE CONFIRMED GAPS — both halves of rule 6 proven

Present in the capture above (READ, not searched); count over `apps/room/src` on the right. **A zero
here is over OUR OWN SOURCE, which is what rule 6b permits** — it is not a zero from a rendered state.

| # | missing from `apps/room/src/routes/session/+page.svelte` | our count |
|---|---|---|
| **L-1** | `<p class="text-center authenticate-info">Please complete this form:</p>` | **`authenticate-info` = 0** |
| **L-2** | the **"Keep me logged in" checkbox UI** — `<div class="form-check"><input type="checkbox" id="remember-me" class="form-check-input"><label for="remember-me" class="form-check-label">` | **`remember-me` = 0.** ⚠️ The *behaviour* exists server-side (`lib/server/auth.ts:94`, `lib/server/connection.ts:134` both name it in comments) — **so this is a control with no UI, the exact inverse of a UI with no consumer** |
| **L-3** | `<div class="mt-1 text-right"><a class="session-login-link">Not you? clear form</a></div>` | **`session-login-link` = 0**, `Not you? clear form` = 0 |
| **L-4** | `<div class="mt-3 t text-center"><a class="session-login-link">Have a password?<br>Click here</a></div>` — note the **stray single-letter class `t`** | `Have a password` = 0 |
| **L-5** | the centering offsets `offset-md-3 offset-sm-3` with `col-sm-6` | **`offset-md-3` appears ONLY inside bundled CSS, in no template** — ours is `col-md-6 col-sm-12 col-xs-12`, uncentered |

### ⚠️ TWO DIVERGENCES I CANNOT RESOLVE — do not "fix" either without reading the bundle first

**D-1 — where `room-title` lives, and whether there are two layouts.** The capture puts
`<h1 class="room-title">` **inside** `.login-form-container`, with **no left column at all** and the
single column centered by `offset-md-3 offset-sm-3`. Ours (`+page.svelte:82-87`) renders a **separate
left column** `col-md-6 col-sm-6 d-xs-none animated fadeInLeft faster room-message` holding the `h1`,
citing bundle **const 33/34/36**. Both cannot be one template unless the reference branches. The
`<!---->` immediately after the `h1` in the capture is an Angular conditional marker, which is
consistent with a branch. **Rule 4 says rendered DOM outranks the bundle** — but ours cites the
bundle and this capture is one render, so the honest reading is *there are probably two layouts and
we implemented the other one.* **Resolve by reading bundle consts 33–36 before touching it.**

**D-2 — `.user-nick`.** Capture: `<div class="user-nick">@Billy Ribeiro</div>` — no `text-center`,
content is `@` + the **nickname**. Ours (`:132`): `<div class="user-nick text-center">{data.email}</div>`
— an extra class, and it renders the **email**. Two differences in one element. **Not filed as a
defect** because I have not read what const 70 binds; filed as a divergence to check.

### `q&a/answer` — the Q&A ask button, transcribed, and one more gap

```html
<button title="Ask a question" class="btn btn-sm btn-secondary me-1 alert-qa">
  <span class="me-1 ng-star-inserted"> (2) </span><!---->
  <i class="fas fa-question-circle"></i>
  <span class="ng-star-inserted"> ✅</span><!---->
</button>
<span class="created-at mr-2">7/30/26, 2:01 PM</span>
```

- **Q-1: `alert-qa` = 0 in `apps/room/src`.** The only `alert-qa` hits are the component TAG
  `app-alert-qa-modal` (`direct-evidence-contract.ts:28`, the generated CSS, an `app.css` comment) —
  **the modal is known; this ASK BUTTON is not built.**
- The unanswered/answered states are two independent `ng-star-inserted` spans: a **count `" (2) "`**
  (parenthesised, space either side) and a **`" ✅"`** (leading space) — so a question can show a
  count, a tick, both, or neither.
- ⭐ **`me-1` and `mr-2` appear on sibling elements** — Bootstrap **5** and Bootstrap **4** spacing
  utilities in the same subtree. Recorded because "normalising" them to one generation would be a
  silent visual change, and it is the room's own markup doing it, not a capture artefact.
- Date format `7/30/26, 2:01 PM` = Angular `date:'short'` (`M/d/yy, h:mm a`) — **distinct from the
  Files pane's `date:'medium'`** (§16.11). Two different formats in one app; do not unify them.

### Already built — checked, not assumed (rule 6)

`v4.0.1-61268ec1` is already pinned in `lib/dump-contract.ts:37`. `login-nickname-new`, `addon-admin`,
`nickHelpBlock`, `addon-email`, `room-title`, `login-form-container`, `loginGravatar`,
`text-center user-avatar`, `btn-login btn btn-primary buttonload text-center pl-2 pr-2`,
`login-footer`, `Powered by`, `?d=mm` and the `mb-3 login-form` form are all present, and
`lib/session-login-contract.test.ts` pins several of them. **The gaps above are the residue after
that check, not a first impression.**

---

## §16.13 — ✅ SIX OF THE §16.12 ITEMS CLOSED IN CODE. Both divergences resolved from the bundle — one of them was a shipped guess.

**2026-08-16 11:15 EDT.** Not recorded as gaps this time — **built**, with tests, negative controls run.

### Both divergences RESOLVED — read, not inferred

**D-1 — there are TWO layouts, and both are real.** Read verbatim:
```js
function Wde(t,n){if(1&t&&(d(0,"div",7)(1,"div",33),H(2,vde,2,1,"h1",34),T(3,"di…   // two-column
```
const 7 `[1,"row","login-row"]` → const 33 `[…,"room-message"]` → const 34 `[1,"room-title"]`.
**That is exactly what we ship.** The capture shows the OTHER branch — const
`[1,"col-md-6","offset-md-3","col-sm-6","offset-sm-3","col-xs-12","login-form-container",…]`, whose
view `bue` renders the `h1` INSIDE the form container:
`H(0,eue,2,1,"h1",34),d(1,"p",63),v(2,"Please complete this form:"),u(),d(3,"form",64)`.
**Our implementation was never wrong.** ⚠️ **The condition selecting between the two is still
unread** — see the open list below.

**D-2 — a shipped guess, now corrected.** const 70 is `[1,"user-nick"]` — **one class** — and the
component's own scoped CSS is `.user-nick{font-style:italic;font-size:15px;margin-left:0}`, **no
`text-align` at all**. We shipped `class="user-nick text-center"` rendering `data.email`. The
reference renders `@` + `e.nick`, guarded by `O(9,e.nick?9:-1)`. Both halves fixed.

### The handlers, read rather than invented

```js
doLoginFormClear(){"jwt"==this.authMode&&(this.readOnlyEmail=!1),
  this.appService.clearSavedToken(this.appService.globals.sessionID),
  this.nick="",this.email="",this.pw="",this.phoneNumber="",
  …savePreferences(),window.location.reload()}                        // byte 1,199,998
function gue(…){…x("click",function(){return D(e),E(g(4).showPresenter=!0)}),
  d(1,"a",113),v(2,"Have a password?"),T(3,"br"),v(4,"Click here")}
function mue(t,n){1&t&&(d(0,"span"),v(1," Connecting "),T(2,"i",110),u())}
function pue(…){…Ve("ngModelChange",…s.rememberMe=o…),d(2,"label",108),v(3,"Keep me logged in")}
```

⭐ **`mue` was a defect nobody had filed:** the busy label is **" Connecting "**, not "Login".
Slots 27/28 swap the whole word on `globals.logginIn`, not just the spinner. We rendered "Login".

⭐ **L-2 was worse than "missing UI".** `setSessionCookie` has **always** branched
`THIRTY_DAYS : ONE_DAY` on its `remember` argument — and `+page.server.ts:322` passed a **hardcoded
`false`**. The server half was complete and the switch that drives it did not exist, so **every
session was capped at one day regardless**. Checkbox added, posted as `name="remember"`, read.

### Closed

| | what | where |
|---|---|---|
| **L-1** ✅ | `<p class="text-center authenticate-info">Please complete this form:</p>` | const 63, `bue` |
| **L-2** ✅ | remember-me checkbox **+ the cookie-lifetime wire** | `pue`, `auth.ts:88-99` |
| **L-3** ✅ | "Not you? clear form" → identity cleared, room kept | `doLoginFormClear` |
| **L-4** ✅ | "Have a password?<br>Click here" → reveals the password field | `gue` |
| **D-2** ✅ | `.user-nick` — class and content | const 70 + component CSS |
| **+1** ✅ | " Connecting " busy label | `mue` |

Two deliberate departures, both stated in the code: the reference's bare `<a>` with a click handler
became a `<button type="button">` carrying the same class list (an anchor with no href is not
keyboard-operable, and semantic accessible HTML is this repository's floor); and `clearForm` drops
`jwtSite`/`name`/`email` from the query while keeping `id`, because our token rides the URL where the
reference's rides a service — **the same act against a different transport.**

**Verified:** `svelte-autofixer` → `issues: []`. `svelte-check` → **0 errors in this file** (6 remain
in `lib/room/private-chat.svelte.ts`, the concurrent session's work, untouched here).
`session-login-contract.test.ts` **12 → 20 tests, all passing**. **Negative controls RUN AND SEEN
RED:** restoring the hardcoded `false` and re-adding `text-center` failed exactly the two guards
written for them, 2 failed / 18 passed; both restored, back to 20/20.

### ⛔ STILL OPEN — the honest remainder from this pass

1. **L-5 — the centered layout branch.** Both const entries and both view functions are proven to
   exist; **the condition that selects between them is NOT read.** Do not guess it.
2. **Q-1 — the `alert-qa` ask button** (§16.12). Untouched.
3. ⭐ **NEW, from the const array — five surfaces this page does not have at all:** the
   `non-presenter` checkbox labelled **"Non Presenter Admin"** (`_ue`); `avatar-options` with the
   gravatar links (`https://en.gravatar.com/`, `fas fa-file-upload`,
   `btn btn-danger btn-sm rounded-pill`); the **forgot-password** view (`forgot-email`,
   `addon-forgot-email`, recaptcha, `fas fa-paper-plane me-1`); the **change-password** view
   (`change-password` + `repeat-password` + their addons); and the browser-upgrade notice
   (firefox/opera links, `btn btn-danger btn-link mb`). **These were found by reading the const
   array — the capture shows none of them**, which is rule 6b in the other direction.

### §16.13a — L-5 narrowed to a single unread expression (2026-08-16 11:18)

The parent that chooses the layout is **`yue`**, read verbatim at byte 1,187,700:

```js
function yue(t,n){if(1&t&&(d(0,"div",4)(1,"div",5),
  H(2,bde,22,1,"div",6)(3,Wde,16,7,"div",7)(4,vue,12,2),u()(),
  d(5,"div",8)(6,"div",9)…                      // ← the avatar modals follow
```

Three conditional slots on the login wrapper: **slot 2 = `bde` (const 6)**, **slot 3 = `Wde`
(const 7 = `row login-row`, the TWO-COLUMN layout we ship)**, **slot 4 = `vue`**. Our own page
comment already names consts 4/5/7 as `login-wrapper`, `container-fluid`, `row login-row`, so the
mapping is consistent from both ends.

**What is still unread is one expression:** the `2&t` update block of `yue`, which contains the
`O(2,…)` / `O(3,…)` / `O(4,…)` selectors deciding which of the three renders. It sits *after* all of
`yue`'s create code — and that create code is long, because the Gmail-avatar and Facebook-avatar
modals are inside it (`"Avatar from gmail address"`, `"Enter your Gmail address"`,
`"Facebook profile image as avatar"`, `"Enter your facebook username"`, with Close/Save buttons).

**Next action, precisely:** slice forward from 1,187,700 until the `if(2&t){` of `yue` and read the
three `O(...)` calls. **Do not guess the condition** — the two layouts differ in whether a whole
column exists, so picking wrong swaps the page for every member.

⭐ **Found on the way, and not previously recorded:** the login page owns **two avatar-source
modals** — Gmail and Facebook — with labels "Enter your Gmail address" and "Enter your facebook
username" and `Close` / `Save` buttons. That is what `avatar-options` (const, §16.13's open list)
opens. Neither exists in `apps/room/src`.

### §16.13b — `ngOnInit` read (byte ~1,190,400). One comment I wrote was FALSE; six more facts recorded (2026-08-16 11:22)

Read while slicing forward for L-5's selector. **The selector was not in this region — L-5 stays
open** — but the component's `ngOnInit` was, and it corrects something I shipped an hour ago.

### ⛔ MY OWN DEFECT, caught by reading rather than by a test

§16.13 shipped `let rememberMe = $state(false)` with the comment *"`pue`'s `ngModelChange` writes
`rememberMe` and nothing else does, so it starts unchecked."* **The second half is false.**
`ngOnInit` writes it too:

```js
if("jwt"!=this.authMode&&!this.appService.globals.passedToken||this.pw)
  this.appService.globals.preferences&&(this.rememberMe=!0,
    this.appService.globals.preferences.savedNick&&(this.nick=…savedNick,this.forgetMe=!0),
    this.appService.globals.preferences.savedEmail&&(this.email=…savedEmail,this.calculateAvatar()),
    this.appService.globals.preferences.phoneNumber&&(this.phoneNumber=…phoneNumber));
else if(("jwt"==this.authMode||this.appService.globals.passedToken)&&!this.pw){ … }
```

**The VALUE is still right and the REASON was wrong**, which is the more dangerous half: `rememberMe=!0`
sits in the **first arm** — no token, no jwt, restoring saved preferences — and every arrival on this
page carries a token, so we are always in the **second arm**, which never assigns it. Unchecked is
correct *for this path*. The comment now says that instead. **This is precisely the failure
`CLAUDE.md` names — "every comment claiming X still matches the next line" — and I introduced it in
the same session that quotes the rule.**

### Six facts recorded from the same region, none previously written down

| fact, verbatim | why it matters |
|---|---|
| `this.forgetMe=!0` when `preferences.savedNick` exists | **a SECOND flag beside `rememberMe`** — `forgetMe` is not in our source at all |
| `disableEditingUsername="a"!==decodedPassedToken.perms&&sessData.disableEditingUsername` | **`perms === 'a'` BYPASSES the lock** — an admin can always edit their name. Ours reads `data.disableEditingUsername` with no perms term |
| `this.email&&e&&(this.readOnlyEmail=!0)` | `readOnlyEmail` is derived from *email AND token both present*, not configured |
| `isPlayer=decodedPassedToken.isPTRPlayer` | a claim on the token we do not read |
| `i=window.top===window.self, i&&(…removeUrlParam("tok"))` | ⭐ **the reference STRIPS the token from the URL** when not framed — directly relevant to `clearForm`, which currently drops `jwtSite` only on an explicit click |
| `bootbox.alert(sessData.loginErrorMsg\|\|"There was an error login in, please try again or contact support",()=>{sessData.loginErrorURL&&(window.location.href=sessData.loginErrorURL)})` | the login-failure message **and redirect**, verbatim including the reference's own "error login in" wording — neither is in our source |

**Also confirmed:** `this.nick=preferences.savedNick`, falling back to `decodedPassedToken.name`, and
`this.email` falling back to `decodedPassedToken.email` — which is the same `nick`/`email` split
§16.13 used to fix `.user-nick`, now corroborated from a second site.

### §16.13c — the component's FULL state model, read from its constructor (byte ~1,188,950) — 2026-08-16 11:26

Still hunting L-5's selector; found the class field initializers instead. **This is the spec for the
whole login component's state**, which is worth more than the selector was.

```js
this.authMode="reg", this.showPW=!1, this.readOnlyEmail=!1, this.hasSTHelpLink=!0,
this.strictBrowserMode=!1, this.disclosureDone=!1, this.avatarOptions=!1,
this.customEnterDisclosure="", this.dataurl=null, this.dataBlob=null,
this.disableEditingUsername=!1, this.usernameInstructions="", this.forgotPassword=!1,
this.forgotPasswordStatus=null, this.changePasswordStatus=null, this.roomLoginURL=""
```

⭐ **`rememberMe` is NOT in this list**, so it initialises `undefined` — falsy. **That independently
confirms §16.13b's corrected conclusion** (unchecked on the token path) from a second site, which is
the check I should have done before writing the first version of that comment.

**Six state fields we have no equivalent for**, each gating a surface from §16.13's open list:

| field | default | gates |
|---|---|---|
| `strictBrowserMode` | `false` | the **browser-upgrade notice** (firefox/opera links) |
| `avatarOptions` | `false` | the **avatar-options** block + the Gmail/Facebook modals |
| `forgotPassword` | `false` | the **forgot-password view** |
| `forgotPasswordStatus` | `null` | its result banner |
| `changePasswordStatus` | `null` | the **change-password view**'s result banner |
| `hasSTHelpLink` | **`true`** | a support/help link — **defaults ON**, so it renders unless turned off |

`dataurl` / `dataBlob` are the avatar upload's in-flight image. `authMode` defaults to **`"reg"`**;
the four values seen across the component are **`reg`, `jwt`, `sso`, `pw`**.

**Confirmed, not new:** `globalsLoaded` sets `this.showPresenter=sessData.showPasswordField` — which
is exactly the seed §16.13 built `showPresenter` from, now corroborated.

### ⚠️ CORRECTION to §16.13b — there are TWO login-error paths, not one

§16.13b recorded a single failure path with the fallback string *"There was an error login in,
please try again or contact support"*. **That is the missing-token branch.** The `loginFailed`
SUBSCRIPTION is a different site with a different fallback:

```js
this.appService.appEventBus.subscribe("loginFailed",e=>{
  this.appService.globals.logginIn=!1,
  bootbox.alert(this.appService.globals.sessData.loginErrorMsg||e.message,()=>{
    try{this.appService.globals.sessData.loginErrorURL&&(window.location.href=…loginErrorURL),
        e.reload&&window.location.reload()}catch{}})})
```

**`loginErrorMsg || e.message`** — the event's own message, not a literal — and it additionally
honours **`e.reload`** by reloading the page. Both paths share `loginErrorMsg` and `loginErrorURL`;
they differ in the fallback and in the reload. **Implementing one and calling it done would drop the
other**, which is why the distinction is written here rather than left to a reader to notice.

### §16.13d — the diff review caught a second self-inflicted defect (2026-08-16 11:30)

`CLAUDE.md`'s "re-read your own `git diff` like a senior reviewer" found what neither the test suite
nor `svelte-check` could: inserting `clearForm` between the `doLoginCheck()` JSDoc and
`clientRefusal` left **the JSDoc attached to the wrong function** — two consecutive doc comments,
the first describing a function three declarations away. Every gate stayed green because a
misplaced comment is not a type error and not a behaviour change; it is only wrong for the human who
reads it next, which is the entire reason those comments exist here.

Restored to sit directly above `clientRefusal`. **Two self-inflicted defects in this one small
change** (§16.13b's false claim, and this) — both found by reading, neither by a gate.

**Verified after the fix:** `session-login-contract.test.ts` **20/20**, and `svelte-check` is now
**0 errors, 0 warnings across the whole room app** (the 6 in `lib/room/private-chat.svelte.ts` that
§16.13 recorded have since been cleared by the concurrent session).

---

## §16.14 — ⭐ L-5 FOUND. The layout selector is `sessData.description` — and the same 620 bytes exposed a THIRD defect of mine.

**2026-08-16 11:38.** The selector was never in `yue`'s create block or in `ngOnInit`. It was in a
**550-byte gap between two regions I had already read** — the tail of `yue` sitting between the
avatar modals and the next class's constructor. Read verbatim at byte 1,188,380:

```js
…d(34,"div",17)(35,"button",18),v(36," Close "),u(),d(37,"button",19),v(38,"Save"),u()()()()()),
2&t){const e=g();
  m(2),O(2, e.browserOK||e.browserOKDismissed ? -1 : 2),
  m(),  O(3, e.appService.globals.sessData.description ? 3 : 4)}}
```

### The answer

`yue`'s create block is `H(2,bde,22,1,"div",6)(3,Wde,16,7,"div",7)(4,vue,12,2)`, so the three slots
resolve as:

| slot | view | const | selected when |
|---|---|---|---|
| 2 | `bde` | 6 | `!(browserOK \|\| browserOKDismissed)` — **the browser-upgrade notice** |
| **3** | **`Wde`** | **7 = `row login-row`** | ⭐ **`sessData.description` is TRUTHY — the TWO-COLUMN layout, which is what we ship** |
| **4** | **`vue`** | — | ⭐ **`sessData.description` is FALSY — the CENTERED layout** (`offset-md-3 offset-sm-3`) |

**`L-5's condition is `sessData.description`.** A room WITH a description gets the two-column layout,
its `room-message` column carrying `h1.room-title` **and** `div.room-description` (const:
`[1,"room-description",2,"height","100%","overflow-x","hidden",3,"innerHtml"]` — bound with
**`innerHtml`**, so it is rich text). A room WITHOUT one gets the single column, centred by offsets,
with the `h1.room-title` moved INSIDE the form container by `bue`.

**This explains the capture exactly** and retires the D-1 puzzle for good: `start-up-login` shows
"Welcome to the Room 3625" centred with no description column, because that room has no description.
**Neither branch was ever wrong; we implemented one of two.**

### ⛔ THE THIRD SELF-INFLICTED DEFECT — `rememberMe` defaults to TRUE

The same slice contains the constructor in full, and it starts EARLIER than the point §16.13c began
reading:

```js
constructor(e,i){this.appService=e,this.formBuilder=i,this.loginReady=!1,this.browserOK=!0,
  this.browserOKDismissed=!1,this.disableLoginForm=!1,this.rememberMe=!0,this.forgetMe=!1,
  this.nick="",this.email="",this.emailHash="",this.pw="",this.token="",this.phoneNumber="",
  this.showPresenter=!1,this.hasRequiredPhoneInLogin=!1,this.authMode="reg",…}
```

**`this.rememberMe=!0`.** §16.13c asserted *"`rememberMe` is NOT in this list, so it initialises
`undefined` — falsy"* and called that independent confirmation. **It was neither.** I had started
reading mid-list at `thMode="reg"` and treated the visible remainder as the whole, which is the
sampling failure the standing rules exist to prevent — committed while writing a section about
having committed it.

**Three readings, three answers**: "nothing else writes it" (false), "unchecked is correct for this
path" (false), and now — from the constructor, before any branch, with nothing anywhere setting it
false — **checked**. Shipped as `$state(true)` and pinned with a negative control, because the
safe-LOOKING default is the wrong one: `false` hands every member a ONE_DAY session while showing
them an unticked box they never chose.

### Five more constructor fields, now complete

`loginReady=!1`, `browserOK=!0`, `browserOKDismissed=!1`, `emailHash=""`, `token=""` — none in our
source. **`browserOK` defaults TRUE and `browserOKDismissed` FALSE**, so the upgrade notice is
hidden unless something clears `browserOK`; that is the gate `strictBrowserMode` (§16.13c) feeds.

### What closing L-5 in code actually requires — it is NOT markup

⚠️ **`description` does not exist anywhere in our load.** `+page.server.ts` returns no
`roomDescription`, and the page renders no `room-description` element — so the two-column branch we
ship is missing the description div as well. **L-5 is decoded, not closed**, and closing it is a
data-plumbing task in three parts, in this order:

1. plumb `description` from the room config into `session/+page.server.ts`'s load;
2. render `div.room-description` inside the existing `room-message` column, **with `{@html}`**,
   because the reference binds it via `innerHtml` — and therefore sanitise it, since this repository
   fails closed;
3. branch the row: `description` → the current two-column markup; otherwise the centred single
   column with `h1.room-title` moved inside the form container.

**Verified now:** `session-login-contract.test.ts` **21/21** (the `rememberMe` default is #21).

---

## §16.15 — ✅ L-5 CLOSED IN CODE. The last divergence is gone.

**2026-08-16 12:10.** §16.14 decoded the condition; this built it. Three parts, in the order §16.14
specified.

**1. `description` plumbed.** Added to `RoomSessionSettings` in `lib/server/room-config-client.ts`
and to `Prefill` + the load in `session/+page.server.ts` as `roomDescription`. It reads from
**`settings`**, not `room` — every other `sessData.*` field on this page already does, which is what
makes the mapping evidence rather than preference.

**2. `div.room-description` rendered, and sanitised on the SERVER.** The const is
`[1,"room-description",2,"height","100%","overflow-x","hidden",3,"innerHtml"]`, so both inline styles
and the HTML binding are the reference's. `{@html}` is correct — and `sanitizeRoomDescription` runs
in the load before the value is ever serialised, because **`/session` is reachable without a
session**: unsanitised owner-authored markup here executes for every visitor before they identify
themselves, and the write path is the settings panel, so one careless owner is enough. Deny-by-default
allowlist derived from what the reference's own CSS expects (`.room-description img` proves images),
`allowedSchemes: ['http','https','mailto']` with **no `data:`** — an SVG data URL is script delivery
dressed as an image — and links forced to `rel="noopener noreferrer nofollow" target="_blank"`.
**`sanitize-html` was already a dependency** with an established pattern in `lib/server/chat-html.ts`;
nothing new was added.

**3. The row branched.** `data.roomDescription` → the two-column markup we already had; otherwise
`col-md-6 offset-md-3 col-sm-6 offset-sm-3 col-xs-12` with `h1.room-title` moved **inside** the form
container, per `bue`'s `H(0,eue,2,1,"h1",34)`. The `col-sm-6`/`col-sm-12` difference is the
reference's too and is easy to miss: the split view gives the form full width at `sm`, the centred
one keeps it halved.

**Verified:** `svelte-autofixer` → the only issue is its standing `{@html}` XSS warning, which is
the tool doing its job on a construct that is correct here and sanitised upstream; noted rather than
suppressed. `svelte-check` → **0 errors in both changed files** (the 1 remaining is
`lib/room/user-actions.svelte.ts`, the concurrent session's). `svelte-kit sync` was required — the
load's return type changed, and the stale `./$types` produced a misleading "Cannot find name 'modal'"
that was **not** a real error in the markup. `session-login-contract.test.ts` **21 → 23, all
passing**. **Negative controls RUN AND SEEN RED:** collapsing the offsets to the two-column classes
and bypassing the sanitiser failed exactly their two guards (2 failed / 21 passed); restored to 23/23.

### Correction to §16.13b

§16.13b listed *"`disableEditingUsername` … ours has no perms term"* as a gap. **It is not one.**
`+page.server.ts:184` already reads
`roomRoleFor(membership) !== 'staff' && settings.disableEditingUsername === true`, with a comment
recording that `'a'` is the presenter permission and that `loginToRoom` sets
`isPresenter: 'a' === o.perms` from the same claim. **Rule 6 — I reported a gap without checking our
source, in the same session that keeps re-learning it.**

### Gap ledger after this pass

**Closed in code:** L-1, L-2, L-3, L-4, **L-5**, D-1, D-2, the " Connecting " label, the
`rememberMe` default. **Divergences: 0.**

**Still open, all specified:** Q-1 (`alert-qa` ask button); `non-presenter` checkbox
("Non Presenter Admin"); `avatar-options` + the Gmail/Facebook avatar modals; the forgot-password
view; the change-password view; the browser-upgrade notice (gated by `browserOK` /
`browserOKDismissed`, both now known); `forgetMe`; `hasSTHelpLink`; the token-strip
(`removeUrlParam("tok")`); and the two login-error paths (§16.13c).

---

## §16.16 — ✅ The token-strip closed. A JWT no longer sits in the address bar.

**2026-08-16 12:20.** From `ngOnInit`, byte ~1,192,100:

```js
let i=!0; i=window.top===window.self,
i&&(P("removing tok from url"),this.appService.removeUrlParam("tok"))
```

**This is the security-relevant one on the list, not a cosmetic match.** A JWT left in the query
string is written to browser history, offered in the `Referer` header of every outbound request the
page makes, and copied verbatim whenever somebody pastes "the link they were sent" into a chat. The
token is verified server-side before this page renders and its value is already on `data.token` and
in the form's hidden input, so **the address bar is the one place it has no remaining use.**

Implemented as an `$effect` calling `replaceState` — with three decisions worth their lines:

- **`window.top === window.self` is the reference's own guard and is kept.** Inside an iframe the
  embedder owns the history stack; rewriting it there is both rude and unreliable.
- **`replaceState`, never `goto`.** A `goto` re-runs the load without the token and blanks the very
  prefill this page was opened to show. Same history entry, no navigation, no `load`.
- ⚠️ **The `has('jwtSite')` guard is LOAD-BEARING, not defensive.** The effect reads `page.url` and
  `replaceState` writes it, so it re-runs itself exactly once; the guard is what makes the second
  pass a no-op. **Delete it and this spins.** `svelte-autofixer` raised the loop, the analysis is
  written into the code, and the contract test pins the guard with a negative control that was run
  and seen red.

**Verified:** `svelte-check` **0 errors and 0 warnings across the entire room app**.
`session-login-contract.test.ts` **23 → 24, all passing**. **Negative control RUN AND SEEN RED** —
removing the loop guard failed the test written for it (1 failed / 23 passed), restored to 24/24.

### Gap ledger

**Closed in code:** L-1, L-2, L-3, L-4, L-5, D-1, D-2, the " Connecting " label, the `rememberMe`
default, **the token-strip**. **Divergences: 0.**

**Still open, all specified, none guessed at:** Q-1 (`alert-qa` ask button); the `non-presenter`
checkbox ("Non Presenter Admin"); `avatar-options` + the Gmail/Facebook avatar modals; the
forgot-password view; the change-password view; the browser-upgrade notice (gated on `browserOK` /
`browserOKDismissed`, both defaults now known); `forgetMe`; `hasSTHelpLink`; and the two distinct
login-error paths (§16.13c). **`bde`'s notice text has not been read** — that is the next slice, and
the notice must not be written until it has been.

---

## §16.17 — `bde` and the two `room-title` views read. **A user-visible defect fixed; the browser notice fully transcribed.**

**2026-08-16 12:32.** Read `bde` (byte 1,171,122), `_de`, `vde` and `eue` in full.

### ⛔ THE H1 WAS WRONG, in both layout arms

```js
function vde(t,n){…2&t){const e=g(3);m(),Ne(" Welcome to the ",e.appService.globals.sessData.name," ")}}
function eue(t,n){…2&t){const e=g(4);m(),Ne(" Welcome to the ",e.appService.globals.sessData.name," ")}}
```

**Byte-for-byte identical interpolations** — both read, neither assumed from the other. The template
**prepends "Welcome to the "**; `sessData.name` is only the room's name. The capture's
"Welcome to the Room 3625" is that string with `sessData.name` = "Room 3625".

**We rendered the bare name** — so every member saw "Room 3625" where the reference greets them. It
looked right, which is exactly why it survived: a plausible-looking value is the failure mode this
corpus keeps producing. Fixed in both arms and pinned by a test that counts **two** occurrences, so
fixing one arm and forgetting the other fails.

### The browser-upgrade notice, transcribed in full

```html
<div [const 6]>
  <h3 [23]> WARNING Unsupported/Outdated Browser. Please use a more recent version of Chrome, Firefox, or Opera </h3>
  <h5>Your browser might NOT work properly with this room</h5>
  <hr>
  <div [24]><img [25]></div>
  <p [26]> For best results, We suggest using <span [27]>CURRENT VERSIONS of</span>
     <a [28]>Google Chrome</a>, <a [29]>Firefox (v52 and up)</a>, or <a [30]>Opera</a></p>
  <br>
  <!-- only when NOT strictBrowserMode: O(21, e.strictBrowserMode ? -1 : 21) -->
  <button [32] (click)="browserOKDismissed=true"> Let me try anyhow (NOT RECOMENDED)</button>
</div>
```

Four details a paraphrase would lose, all the reference's own and none to be "tidied":

- **"NOT RECOMENDED"** — one `M`. The reference's typo. It ships as written.
- **"For best results, We suggest using"** — capital `W` mid-sentence.
- **`Firefox (v52 and up)`** carries a version bound; Chrome and Opera do not.
- ⭐ **`strictBrowserMode` HIDES the escape hatch.** The dismiss button is the only way past this
  notice, so with `strictBrowserMode` on an unsupported browser is **hard-blocked**. That is the
  setting's entire function, and it was not deducible from its name.

Link hrefs from the const table: `https://www.mozilla.org/firefox/` and `https://opera.com`, both
`target="_blank"`; the Chrome href sits just before them in the same run and its full value has
**not** been read yet — the slice began mid-string at `get","_blank"]`. **Not written down as a
guess.** `[1,"btn","btn-danger","btn-link","mb"]` is the button class list, `mb` with no suffix.

**Still unread for this notice:** const 24/25 (the image container and its `src`) and const 6, 23,
26, 27. **The notice must not be built until those are read** — it is 60% transcribed, not ready.

### Verified

`session-login-contract.test.ts` **24 → 25, all passing**.

### Gap ledger

**Closed in code:** L-1 – L-5, D-1, D-2, the " Connecting " label, the `rememberMe` default, the
token-strip, **the h1 greeting**. **Divergences: 0.**

**Open:** Q-1 (`alert-qa`); `non-presenter` ("Non Presenter Admin"); `avatar-options` + the
Gmail/Facebook modals; forgot-password (`Fde`/`yde` located, `toggleRoomForgotPassword` +
`doRoo…` + `re-captcha` seen); change-password; **the browser notice — 60% transcribed, blocked on
five consts**; `forgetMe`; `hasSTHelpLink`; the two login-error paths.

---

## §16.18 — The five blocking consts read, plus BOTH avatar modals in full. Every open login item is now specified.

**2026-08-16 12:42.** Read at bundle byte 1,203,180 — the head of the component's const table, which
my earlier slice had started past.

### The browser notice is now 100% transcribed — §16.17's blocker is cleared

| const | value, verbatim | element in `bde` |
|---|---|---|
| **23** | `[1,"animated","flash",2,"color","red","font-size","20px"]` | the `<h3>` — **classes `animated flash`, inline `color: red; font-size: 20px`** |
| **24** | `[2,"text-align","center","width","100%"]` | the image container `<div>` |
| **25** | `["src","/public/images/supported_browsers.jpeg",2,"width","50%","text-align","center"]` | ⭐ the `<img>` — **`/public/images/supported_browsers.jpeg`**, `width:50%` |
| **26** | `[1,"center"]` | the `<p>` |
| **27** | `[2,"text-decoration","underline"]` | the `CURRENT VERSIONS of` `<span>` |
| **28** | `["href","https://www.google.com/chrome","target","_blank"]` | ⭐ the Chrome link — §16.17 refused to guess this and was right to |
| 29 | `["href","https://www.mozilla.org/firefox/","target","_blank"]` | Firefox |
| 30 | `["href","https://opera.com","target","_blank"]` | Opera |

⚠️ **Const 6 — the notice's own wrapper `<div>` — is still unread**, and it is shared with `yue`'s
`H(2,bde,22,1,"div",6)`. It sits earlier in the table than this slice began. **One more read
upstream and the notice can be built; not before.**

⚠️ **`/public/images/supported_browsers.jpeg` is an ASSET WE DO NOT HAVE.** It is not in
`apps/room/static`. Building this notice needs either that file or an explicit honest-gap decision —
**not a substitute image chosen because it looked close.**

### Both avatar modals, transcribed in full — `avatar-options`' two destinations

**Gmail:**
```html
<div id="avatar-from-gmail-modal" aria-hidden="true" class="modal fade">
  <div role="document" class="modal-dialog"><div class="modal-content">
    <div class="modal-header">…<button type="button" data-bs-dismiss="modal" aria-label="Close"
         class="btn-close btn-close-white"></button></div>
    <div class="modal-body"><div class="form-group">
      <label for="gmail-avatar">Enter your Gmail address</label>
      <input type="text" id="gmail-avatar" name="gmail-avatar" placeholder="johndoe@gmail.com" class="form-control">
    </div></div>
    <div class="modal-footer text-center">
      <button type="button" data-bs-dismiss="modal" aria-label="Close" class="btn btn-primary"> Close </button>
      <button type="button" class="btn btn-success">Save</button>
    </div>
  </div></div></div>
```
Header text from §16.14's read: **"Avatar from gmail address"**.

**Facebook** — same skeleton, differing only where recorded:
```html
<div id="avatar-from-facebook-modal" tabIndex="-1" role="dialog"
     aria-labelledby="avatar-from-facebook-modal" aria-hidden="true" class="modal fade">
  …<label for="facebook-avatar">Enter your facebook username</label>
  <input type="text" id="facebook-avatar" name="facebook-avatar" placeholder="johndoe" class="form-control">
```
Header text: **"Facebook profile image as avatar"**.

⭐ **The two modals are NOT symmetrical, and the difference is a real accessibility bug in the
reference**: the Facebook dialog carries `tabIndex="-1"`, `role="dialog"` and `aria-labelledby`; the
Gmail one carries **none of the three**. Copying both verbatim would reproduce the defect. **This is
a decision for the owner, not for me** — recorded here rather than silently "fixed" or silently
copied. `aria-labelledby` also points at the dialog's OWN id rather than at its title element, which
is wrong in the reference too.

### ⛔ HONEST STOP — I am at the end of this context window

Every remaining login item is now **specified to the byte**, and none is built:

| item | state |
|---|---|
| browser notice | **blocked on const 6 + a missing image asset** |
| Gmail/Facebook avatar modals | fully transcribed; needs `avatar-options` markup + the a11y decision above |
| `non-presenter` checkbox | `_ue` read: `[1,"form-check"]`, `["type","checkbox","id","non-presenter",1,"form-check-input"]`, `["for","non-presenter",1,"form-check-label"]`, label **"Non Presenter Admin"** |
| forgot-password | `Fde`/`yde` located; `toggleRoomForgotPassword('success')`, `doRoo…`, `re-captcha`, `forgotPasswordStatus.msg`, Back button `[43]` + `<i [44]>` — **the `doRoo…` handler name is truncated and unread** |
| change-password | consts read (`change-password`, `repeat-password`, both addons); **view functions unread** |
| `forgetMe`, `hasSTHelpLink` | defaults known; **consumers unread** |
| two login-error paths | both read verbatim (§16.13c); not built |
| Q-1 `alert-qa` | §16.12; different component, untouched |

**Nothing above is guessed and nothing is half-built.** The next session resumes at const 6.

---

## §16.19 — ⛔ CORRECTION: §16.18's "accessibility bug in the reference" WAS MY OWN TRUNCATED READ. Plus consts 0–8, verbatim.

**2026-08-16 13:20.** Read from `consts:[[` at byte **1,202,756** — the true start of the table.
§16.18's slice began at 1,203,180, i.e. **424 bytes into it, mid-const-8**.

### The correction, stated first because it is the most damaging thing in this file

§16.18 reported:

> *"The two modals are NOT symmetrical, and the difference is a real accessibility bug in the
> reference: the Facebook dialog carries `tabIndex="-1"`, `role="dialog"` and `aria-labelledby`; the
> Gmail one carries none of the three. Copying both verbatim would reproduce the defect."*

**Every word of that is false.** Const 8, read from the beginning:

```js
["id","avatar-from-gmail-modal","tabIndex","-1","role","dialog",
 "aria-labelledby","avatar-from-gmail-modal","aria-hidden","true",1,"modal","fade"]
```

**The Gmail modal has all three.** The two dialogs are **symmetrical**. My slice began at
`ar-from-gmail-modal","aria-hidden","true"…` — the attributes were **before** my first byte, so I
saw their absence in my own window and reported it as their absence in the reference.

**This is the exact failure the standing rules exist to prevent, and it is the second time today**
(§16.14 recorded the same thing about `rememberMe`, where I read a constructor from its middle and
declared a field absent). Both times I had *read* rather than grepped, and read the wrong extent —
so **"I opened the file" is not the safeguard; "I opened it at a boundary I verified" is.**

**It would have sent the owner to fix a bug that does not exist**, and worse, an a11y "fix" applied
to the Gmail modal would have introduced a divergence from a reference that was already correct.
§16.18's "decision for the owner" paragraph is **withdrawn in full**. The one substantive remark
that survives: `aria-labelledby` does point at each dialog's own id rather than at its title
element — true of **both**, and still worth an owner decision.

### Consts 0–8, verbatim — the table's true head

| # | value | what it is |
|---|---|---|
| 0 | `[1,"position-relative","w-100","h-100"]` | **the LOADING view's** outer div |
| 1 | `[1,"position-absolute","top-50","start-50","translate-middle"]` | its centring wrapper |
| 2 | `[1,"fas","fa-spinner","fa-spin","fa-2x"]` | the spinner — **`fa-2x`** |
| 3 | `[1,"ms-3","loading-message"]` | its label; CSS `.loading-message{font-size:24px}`, text `" Initializing..."` from `hue` |
| 4 | `[1,"login-wrapper"]` | matches our page |
| 5 | `[1,"container-fluid"]` | matches our page |
| **6** | ⭐ `[1,"col-md-2","col-sm-10","login-form",2,"border-left","solid 1px #0a0a0a","height","100%"]` | **the browser notice's wrapper — §16.17/§16.18's last blocker** |
| 7 | `[1,"row","login-row"]` | matches our page |
| 8 | `["id","avatar-from-gmail-modal","tabIndex","-1","role","dialog","aria-labelledby","avatar-from-gmail-modal","aria-hidden","true",1,"modal","fade"]` | Gmail modal — **see the correction above** |

⚠️ **Const 6 is recorded verbatim and NOT interpreted.** `col-md-2 col-sm-10` is a narrow column for
a full-width warning and it carries `border-left: solid 1px #0a0a0a; height: 100%` — it reads like a
class list reused from elsewhere. **That is an observation, not a conclusion**, and the notice must
be built from these values as written rather than from what the numbers seem to imply.

### The browser notice is now fully specified — 6 of 6

1. **verbatim markup** — §16.17; 2. **every const by value** — §16.17 (23–30) + const 6 here;
3. **condition** — `!(browserOK || browserOKDismissed)`, dismiss button hidden when
`strictBrowserMode`; 4. **our source** — none of it exists; 5. ⚠️ **missing asset**:
`/public/images/supported_browsers.jpeg` is not in `apps/room/static`; 6. reference-wrong flags —
the typo **"NOT RECOMENDED"** and the capital **W** in "We suggest", both to be shipped as written.

**Item CLOSED for documentation purposes**, with #5 standing as an honest gap the owner must resolve
(supply the asset, or accept the notice renders without it).

---

# §17 — `app-session-login` read END TO END. Complete const table, both render trees, the complete stylesheet, and an audit of our implementation

Recorded 2026-08-16 13:20 EDT. **Documentation only — nothing here was built.**

## §17.0 — What was read, and from which boundary

`apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js` (2,891,205 B, repo-tracked), bytes
**1,168,000 → 1,218,000**, sliced in five contiguous windows and read line by line.

§16.19 recorded the lesson that produced two false "absent" claims: *"'I opened the file' is not the
safeguard; 'I opened it at a boundary I verified' is."* This read starts **before** the first view
function (`gde`) and ends **after** the component's closing `return t})()`, so the component is
bracketed by known boundaries on both sides and nothing is outside the window. Every view function
belonging to `app-session-login` is in it: `gde _de bde vde yde Fde Cde Sde wde Tde Dde Ede kde xde
Mde Ade Pde Rde Ide Ode Nde Lde Bde Ude jde Vde Hde $de zde Gde Wde qde Kde Yde Qde Xde Jde Zde eue
tue nue iue oue sue rue aue lue cue due uue hue pue fue mue gue _ue bue vue yue` — **59 functions**,
plus the class body, plus `consts`, plus `styles`.

`decls:2,vars:1` and `selectors:[["app-session-login"]]` confirm the component identity.

## §17.1 — The const table, all 120 entries, verbatim

Read from `consts:[[` through the closing `]],template:` in one window. **Angular's encoding:** a
bare leading pair is `attr,value`; marker `1` starts CLASS names; marker `2` starts `style,value`
pairs; marker `3` starts BINDING names. Everything below is the literal array.

| # | value | renders as |
|---|---|---|
| 0 | `[1,"position-relative","w-100","h-100"]` | spinner outer |
| 1 | `[1,"position-absolute","top-50","start-50","translate-middle"]` | spinner centring |
| 2 | `[1,"fas","fa-spinner","fa-spin","fa-2x"]` | spinner icon |
| 3 | `[1,"ms-3","loading-message"]` | "Loading..." |
| 4 | `[1,"login-wrapper"]` | page wrapper |
| 5 | `[1,"container-fluid"]` | |
| 6 | `[1,"col-md-2","col-sm-10","login-form",2,"border-left","solid 1px #0a0a0a","height","100%"]` | **the BROWSER NOTICE column — see §17.9** |
| 7 | `[1,"row","login-row"]` | |
| 8 | `["id","avatar-from-gmail-modal","tabIndex","-1","role","dialog","aria-labelledby","avatar-from-gmail-modal","aria-hidden","true",1,"modal","fade"]` | Gmail modal |
| 9 | `["role","document",1,"modal-dialog"]` | |
| 10 | `[1,"modal-content"]` | |
| 11 | `[1,"modal-header"]` | |
| 12 | `["type","button","data-bs-dismiss","modal","aria-label","Close",1,"btn-close","btn-close-white"]` | modal × |
| 13 | `[1,"modal-body"]` | |
| 14 | `[1,"form-group"]` | |
| 15 | `["for","gmail-avatar"]` | |
| 16 | `["type","text","id","gmail-avatar","name","gmail-avatar","placeholder","johndoe@gmail.com",1,"form-control"]` | **no binding marker** |
| 17 | `[1,"modal-footer","text-center"]` | |
| 18 | `["type","button","data-bs-dismiss","modal","aria-label","Close",1,"btn","btn-primary"]` | Close |
| 19 | `["type","button",1,"btn","btn-success"]` | **Save — no click marker** |
| 20 | `["id","avatar-from-facebook-modal","tabIndex","-1","role","dialog","aria-labelledby","avatar-from-facebook-modal","aria-hidden","true",1,"modal","fade"]` | Facebook modal |
| 21 | `["for","facebook-avatar"]` | |
| 22 | `["type","text","id","facebook-avatar","name","facebook-avatar","placeholder","johndoe",1,"form-control"]` | **no binding marker** |
| 23 | `[1,"animated","flash",2,"color","red","font-size","20px"]` | browser-notice h3 |
| 24 | `[2,"text-align","center","width","100%"]` | |
| 25 | `["src","/public/images/supported_browsers.jpeg",2,"width","50%","text-align","center"]` | **asset we lack** |
| 26 | `[1,"center"]` | |
| 27 | `[2,"text-decoration","underline"]` | |
| 28 | `["href","https://www.google.com/chrome","target","_blank"]` | |
| 29 | `["href","https://www.mozilla.org/firefox/","target","_blank"]` | |
| 30 | `["href","https://opera.com","target","_blank"]` | |
| 31 | `[1,"btn","btn-danger","btn-link","mb"]` | dismiss btn (decl) |
| 32 | `[1,"btn","btn-danger","btn-link","mb",3,"click"]` | dismiss btn (bound) |
| 33 | `[1,"col-md-6","col-sm-6","d-xs-none","animated","fadeInLeft","faster","room-message"]` | **arm A left column** |
| 34 | `[1,"room-title"]` | the h1 |
| 35 | `[1,"room-description",2,"height","100%","overflow-x","hidden",3,"innerHtml"]` | |
| 36 | `[1,"col-md-6","col-sm-12","col-xs-12","login-form-container","animated","fadeInRight","faster"]` | **arm A form column** |
| 37 | `[1,"login-form","mb-3"]` | forgot/change panel |
| 38 | `[1,"login-footer"]` | |
| 39 | `[1,"text-center"]` | footer `<p>` |
| 40 | `["href","https://protradingroom.com","target","_blank"]` | **no `rel`** |
| 41 | `[1,"w-100",3,"formGroup"]` | forgot/change form |
| 42 | `[1,"p-2"]` | |
| 43 | `["type","button",1,"btn","btn-secondary","buttonload","text-center","pl-2","pr-2",3,"click"]` | Back |
| 44 | `[1,"fas","fa-arrow-left","me-1"]` | |
| 45 | `["for","forgot-email"]` | |
| 46 | `[1,"input-group","mb-3"]` | **correct spelling** |
| 47 | `["type","email","id","forgot-email","formControlName","forgot-email","placeholder","Email","aria-label","email","aria-describedby","addon-email",1,"form-control",3,"ngModelChange","ngModel","disabled"]` | **arm A forgot email → `addon-email`** |
| 48 | `["id","addon-email",1,"input-group-text","pl-2","pr-2"]` | |
| 49 | `[1,"fas","fa-envelope"]` | |
| 50 | `["formControlName","recaptcha"]` | `<re-captcha>` |
| 51 | `[1,"d-flex","align-items-center","justify-content-between"]` | |
| 52 | `["type","submit",1,"btn","btn-primary","buttonload","text-center","pl-2","pr-2",3,"click","disabled"]` | Send |
| 53 | `[1,"fas","fa-paper-plane","me-1"]` | |
| 54 | `[3,"href"]` | Login link |
| 55 | `["for","change-password"]` | |
| 56 | `["type","password","id","change-password","formControlName","change-password","placeholder","Your new password","aria-label","Your new password","aria-describedby","addon-change-password","autocomplete","off",1,"form-control"]` | |
| 57 | `["id","addon-change-password",1,"input-group-text","pl-2","pr-2"]` | |
| 58 | `[1,"fas","fa-lock"]` | **static — no click** |
| 59 | `["for","repeat-password"]` | |
| 60 | `["type","password","id","repeat-password","formControlName","repeat-password","placeholder","Type your new password again","aria-label","Type your new password again","aria-describedby","addon-repeat-password","autocomplete","off",1,"form-control"]` | |
| 61 | `["id","addon-repeat-password",1,"input-group-text","pl-2","pr-2"]` | |
| 62 | `[1,"d-flex","align-items-center","justify-content-end"]` | |
| 63 | `[1,"text-center","authenticate-info"]` | "Please complete this form:" |
| 64 | `[1,"mb-3","login-form",3,"submit"]` | **the login `<form>`** |
| 65 | `[1,"loginGravatar"]` | |
| 66 | `[1,"text-center","user-avatar"]` | |
| 67 | `["src","https://www.gravatar.com/avatar/your_email_address?d=mm"]` | **literal placeholder URL** |
| 68 | `["title","Setup Avatar",1,"setup-avatar",3,"click"]` | **the gear** |
| 69 | `[1,"fas","fa-cog"]` | |
| 70 | `[1,"user-nick"]` | ONE class |
| 71 | `[1,"avatar-options"]` | |
| 72 | `["for","login-nickname-new"]` | |
| 73 | `["type","text","id","login-nickname-new","name","login-nickname-new","placeholder","Name or Nickname","aria-label","Name","aria-describedby","nickHelpBlock",1,"form-control",3,"ngModelChange","ngModel","disabled"]` | |
| 74 | `["id","addon-admin",1,"input-group-text","pl-2","pr-2"]` | id is `addon-admin` |
| 75 | `[1,"fas","fa-user"]` | |
| 76 | `["id","nickHelpBlock",1,"form-text"]` | |
| 77 | `[1,"error","text-danger","small"]` | **empty, always rendered** |
| 78 | `[1,"mb-3"]` | sso email row |
| 79 | `[1,"text-center","muted"]` | "Initializing..." |
| 80 | `[1,"d-flex","p-2","justify-content-between","mt-3","align-items-center"]` | |
| 81 | `[1,"form-check"]` | |
| 82 | `["type","submit",1,"btn-login","btn","btn-primary","buttonload","text-center","pl-2","pr-2",3,"disabled"]` | |
| 83 | `[1,"mt-1","text-right"]` | |
| 84 | `[1,"session-login-link",3,"click"]` | |
| 85 | `[3,"src"]` | bound avatar img |
| 86 | `["href","https://en.gravatar.com/","target","_blank","rel","noopener noreferrer"]` | |
| 87 | `["href","","rel","noopener noreferrer",3,"click"]` | **`href=""`** |
| 88 | `[1,"fas","fa-file-upload"]` | |
| 89 | `["type","button",1,"btn","btn-danger","btn-sm","rounded-pill",3,"click"]` | |
| 90 | `[1,"fas","fa-times"]` | |
| 91 | `[1,"fas","fa-exclamation-triangle","me-1"]` | |
| 92 | `["for","login-email"]` | |
| 93 | `["type","email","id","login-email","name","login-email","placeholder","Email","aria-label","email","aria-describedby","addon-email",1,"form-control",3,"ngModelChange","input","ngModel","disabled"]` | **`disabled`, and an `(input)` binding** |
| 94 | `["for","login-user-phone-number"]` | |
| 95 | `["type","tel","id","login-user-phone-number","name","login-user-phone-number","placeholder","123456789","aria-label","Phone Number","aria-describedby","addon-phone-number",1,"form-control",3,"ngModelChange","ngModel"]` | |
| 96 | `[1,"input-group-append"]` | **phone addon ONLY** |
| 97 | `["id","addon-phone-number",1,"input-group-text","pl-2","pr-2"]` | |
| 98 | `[1,"fas","fa-phone"]` | |
| 99 | `["for","login-password"]` | |
| 100 | `[1,"input-group","mb-","3"]` | ⚠️ **TYPO — three classes: `input-group`, `mb-`, `3`** |
| 101 | `["type","password","id","login-password","name","login-password","placeholder","password","aria-label","password","aria-describedby","addon-password",1,"form-control",3,"ngModelChange","ngModel"]` | |
| 102 | `["id","addon-password",1,"input-group-text","pl-2","pr-2"]` | **no click — static lock** |
| 103 | `[1,"text-right","mt-1"]` | **"Forgot Password?" row** |
| 104 | `[1,"ml-2"]` | |
| 105 | `["href","#",1,"session-login-link"]` | **"Not you? log out" — no click** |
| 106 | `[1,"fas","fa-cog","fa-spin"]` | |
| 107 | `["type","checkbox","id","remember-me",1,"form-check-input",3,"ngModelChange","ngModel","ngModelOptions"]` | |
| 108 | `["for","remember-me",1,"form-check-label"]` | |
| 109 | `[3,"click"]` | the `<span>` inside the submit |
| 110 | `[1,"ml-2","fas","fa-spinner","fa-spin"]` | |
| 111 | `[1,"mt-3","t","text-center"]` | stray class `t` |
| 112 | `[1,"mt-3","t","text-center",3,"click"]` | |
| 113 | `[1,"session-login-link"]` | |
| 114 | `[2,"text-decoration","underline","font-size","larger"]` | **arm A only** |
| 115 | `["type","checkbox","id","non-presenter",1,"form-check-input"]` | **no binding** |
| 116 | `["for","non-presenter",1,"form-check-label"]` | |
| 117 | `[1,"col-md-6","offset-md-3","col-sm-6","offset-sm-3","col-xs-12","login-form-container","animated","fadeInRight","faster"]` | **arm B form column** |
| 118 | `["type","email","id","forgot-email","formControlName","forgot-email","placeholder","Email","aria-label","email","aria-describedby","addon-forgot-email",1,"form-control",3,"ngModelChange","ngModel","disabled"]` | **arm B forgot email → `addon-forgot-email`** |
| 119 | `["id","addon-forgot-email",1,"input-group-text","pl-2","pr-2"]` | |

## §17.2 — The render tree, with every condition

```
template: H(0,gde,5,0,"div",0)(1,yue,39,2)
          O(0, appService.globals.logginIn ? 0 : 1)
```

**The WHOLE page is replaced by a centred spinner while `logginIn`.** Not an overlay, not a busy
button — slot 0 and slot 1 are alternatives.

```
gde = div[0] > div[1] > i[2] , span[3] "Loading..."
```

`yue` — always three children plus two modals:

```
yue = div[4 login-wrapper] > div[5 container-fluid] > H(2,bde)(3,Wde)(4,vue)
      O(2, browserOK || browserOKDismissed ? -1 : 2)
      O(3, appService.globals.sessData.description ? 3 : 4)
      + div[8]  ... the Gmail modal      (UNCONDITIONAL, sibling of login-wrapper)
      + div[20] ... the Facebook modal   (UNCONDITIONAL)
```

Both arms then select one of three panels on the same expression:

```
Wde (arm A): O(6, forgotPassword ? 6 : globals.changePasswordUID ? 7 : 8)   → Cde / Dde / Gde
vue (arm B): O(2, forgotPassword ? 2 : globals.changePasswordUID ? 3 : 4)   → Yde / Zde / bue
```

and both end with the identical footer:

```
div[38 login-footer] > p[39 text-center] " Powered by: " a[40] "ProTradingRoom.com"
                     , p[39 text-center] Ne(" Version: ", globals.appVersion, " ")
```

The login form body (`Gde` / `bue`), slot by slot, with every condition:

| what | condition |
|---|---|
| the h1 `room-title` | `sessData.hideWelcomeTo ? -1 : …` — **arm A in `Wde`, arm B inside `bue` slot 0** |
| avatar `<img>` | `avatarURL ? bound-src : const 67 placeholder` |
| the gear `span[68]` | unconditional; click → `showAvatarOptions()` |
| `div[70] "@{nick}"` | `nick ? … : -1` |
| `div[71 avatar-options]` | `avatarOptions ? … : -1` |
| name input | always; `disabled` ← `disableEditingUsername` **only** |
| `div[76 nickHelpBlock]` | `usernameInstructions ? … : -1` |
| email | arm A: inside the `Nde` group. arm B: `disableLoginForm ? -1 : …` |
| phone | `hasRequiredPhoneInLogin ? … : -1` |
| password | `showPresenter \|\| "pw"==authMode \|\| "webinarRoom"===authMode ? … : -1` |
| `div[77 error]` | unconditional, **self-closing and empty** |
| sso email row | `"sso"==authMode ? … : -1` |
| "Initializing..." | `loginReady ? -1 : …` |
| remember-me | `disableLoginForm ? -1 : …` |
| submit `disabled` | `globals.logginIn \|\| !loginReady` |
| "Login" / " Connecting " | `globals.logginIn ? busy : idle` |
| "Not you? clear form" | unconditional |
| "Have a password?" / "Non Presenter Admin" | see §17.4 row 7 |

## §17.3 — The component stylesheet, complete and verbatim

De-minified from the single `styles:[...]` string; `[_nghost-%COMP%]` / `[_ngcontent-%COMP%]` are
Angular's emulated-encapsulation attributes and are dropped, the descendant combinators are the
reference's.

```css
:host                                { background-color:#fff }
.navLogo                             { max-height:35px; max-width:100% }
.navbar                              { padding:20px }
.nav a                               { color:#fff }
.roomNameHeader                      { text-align:left; padding-left:70px; text-overflow:ellipsis;
                                       width:100%; font-size:2em; color:#fff }
.login-wrapper                       { font-size:16px; color:var(--dark-black);
                                       background-color:var(--lighter-gray); height:100vh;
                                       padding-bottom:20px; overflow-y:auto; overflow-x:none }
.login-wrapper .login-form-container { padding-top:15px }
.login-wrapper form                  { max-width:360px; margin:auto }
.login-wrapper .input-group > .input-group-append > .input-group-text
                                     { background-color:var(--white) }
.login-wrapper input                 { color:#28a1b5 }
.login-wrapper a                     { color:#375a7f }
.login-wrapper .room-message         { padding-top:30px }
.login-wrapper h1.room-title         { font-size:24px; padding:0 0 15px;
                                       border-bottom:1px solid var(--light-gray);
                                       text-align:center; max-width:360px; margin:auto }
.login-wrapper div.room-description  { max-width:80%; margin:5% auto; font-size:20px!important }
.login-wrapper .room-description img { width:100%; height:auto }
.login-wrapper p                     { margin:auto; max-width:360px }
.login-wrapper div.login-footer      { font-size:12px }
.login-wrapper p.authenticate-info   { padding:15px 0 }
.login-wrapper .form-control         { border:1px solid var(--lighter-gray); border-right:none }
.login-wrapper .input-group-append   { border:1px solid var(--lighter-gray); border-left:none }
.login-wrapper .form-control:focus   { border:1px solid var(--lighter-gray); border-right:none;
                                       box-shadow:1px 1px 3px var(--lighter-gray) }
.login-wrapper input                 { font-size:16px }
.login-options                       { height:56px; background-color:var(--dark-black);
                                       color:var(--white) }
.login-form                          { background-color:var(--white); padding:15px 25px;
                                       box-shadow:2px 2px 5px var(--light-gray); border-radius:7px }
.login-form label                    { font-size:14px; margin-bottom:2px }
.login-form .form-check-label        { font-size:12px }
.user-avatar                         { position:relative }
.user-avatar .setup-avatar           { cursor:pointer; position:relative; top:25px; left:-20px;
                                       padding:var(--avatar-gear-icon-padding);
                                       background-color:var(--white); border-radius:50% }
.avatar-options                      { margin:3px auto; width:155px }
.avatar-options a                    { text-decoration:none }
.avatar-options a:hover              { color:var(--dark-black) }
.user-nick                           { font-style:italic; font-size:15px; margin-left:0 }
.btn-login                           { min-width:130px; border-radius:50px; border:none;
                                       font-weight:700; font-size:14px; line-height:14px;
                                       height:30px }
.btn-login:focus, .btn-login:active  { outline:none!important; box-shadow:none!important;
                                       border:none }
.loginGravatar                       { min-height:106px }
.loginGravatar img                   { width:80px; height:80px; object-fit:cover;
                                       border-radius:50%; border:1px solid var(--lighter-gray);
                                       margin-left:27px }
.login-row                           { padding-top:20px }
.login-form .form-check:hover        { cursor:pointer }
.loading-message                     { font-size:24px }
.session-login-link                  { font-size:14px }
.session-login-link:hover            { text-decoration:underline!important; cursor:pointer }

@media only screen and (max-width:767px) {
  span.roomNameHeader,
  .login-row div.fadeInLeft          { display:none }
  .login-form-container              { border:none }
  .navLogo                           { max-width:200px }
}
@media only screen and (max-width:320px) {
  .navLogo                           { max-width:150px }
}
```

Two notes on values, stated rather than tidied away:

- **`overflow-x:none` is not valid CSS.** The property takes `visible|hidden|clip|scroll|auto`;
  `none` is discarded by every browser. It is in the reference and it does nothing.
- **`padding:var(--avatar-gear-icon-padding)`** — the custom property is **not defined in this
  stylesheet**. Its value is an EVIDENCE GAP (§17.10).

## §17.4 — Arm A (`Gde`, description present) vs Arm B (`bue`, no description)

Twelve measured differences. **A single component cannot satisfy both**; each row is a decision.

| # | thing | arm A (`Gde`/`Wde`) | arm B (`bue`/`vue`) |
|---|---|---|---|
| 1 | remember-me label | **"Remember me"** (`Ude`) | **"Keep me logged in"** (`pue`) |
| 2 | h1 position | in `Wde`, above the description | inside `bue` slot 0, above "Please complete this form:" |
| 3 | email/phone/password | ONE group `Nde`, gated `disableLoginForm ? -1 : 19` | THREE siblings `lue`/`cue`/`due`, each independently gated |
| 4 | `usernameInstructions` | `Ne(" ", …, " ")` — **leading space** | `Ne("", …, " ")` — **no leading space** |
| 5 | "Click here" | wrapped `<span style="text-decoration:underline;font-size:larger">` (const 114) | **bare text**, no span |
| 6 | password-block gate | inherits `Nde`'s `disableLoginForm` gate too | independent of `disableLoginForm` |
| 7 | bottom slot logic | `showPresenter ? zde : $de`, `$de` = `disableLoginForm ? -1 : Hde` | `showPresenter\|\|disableLoginForm ? (showPresenter?_ue:-1) : gue` — **verified logically equivalent** |
| 8 | forgot-password Back | `Cde`: two Backs (one per sub-view) | `Yde`: a **THIRD** Back button at slot 6, outside the form, always visible |
| 9 | forgot email `aria-describedby` | `addon-email` (const 47/48) | `addon-forgot-email` (const 118/119) |
| 10 | change-password repeat wrapper | `div[46]` = `input-group mb-3` | `div[100]` = `input-group mb- 3` **(the typo)** |
| 11 | form column | const 36 `col-md-6 col-sm-12 col-xs-12` | const 117 `col-md-6 offset-md-3 col-sm-6 offset-sm-3 col-xs-12` |
| 12 | left column | const 33, hidden < 767px | absent |

## §17.5 — Controls that are DEAD in the reference (proven from the complete const table + complete view set)

Each of these renders and does nothing. They are listed so that nobody "completes" them.

1. **The Gmail-avatar modal and the Facebook-avatar modal.** Consts 8 and 20 appear at exactly two
   sites, `d(5,"div",8)` and `d(22,"div",20)` in `yue`. **No element in any of the 59 view functions
   carries `data-bs-toggle`/`data-bs-target`, so nothing opens them.** Their inputs (16, 22) have no
   binding marker and their Save buttons (19) have no click marker. They are inert markup inside a
   `.modal.fade`, therefore invisible.
   → **This retires §16.18/§16.19 entirely.** The modals are symmetrical, correctly attributed, and
   unreachable. Do not build them.
2. **The "Non Presenter Admin" checkbox** (`zde`/`_ue`, consts 115/116). No binding marker, and
   neither function has a `2&t` update block at all. `doLoginCheck` and `loginToRoom` were both read
   in full and neither mentions it. **A checkbox that is shown when `showPresenter` and does
   nothing.**
3. **"Not you? log out"** (const 105 `["href","#",1,"session-login-link"]`). No click marker. It
   navigates to `#`. Shown only when `authMode === 'sso'`.
4. **The error `<div>`** (const 77), `T(20,"div",77)` — self-closing, always present, and nothing in
   any update block writes into it. Every real error in this component goes through `bootbox.alert`.
5. **`doForgetMe()`** — a complete method that clears five preferences and saves. **No view function
   calls it, and `forgetMe` is written in `ngOnInit` and read nowhere.** (Claim scoped precisely: to
   this component's template and class body, both read end to end.)
6. **`hasSTHelpLink`** (`= !0` in the constructor), **`showPW`**, **`token`**, **`emailHash`** —
   declared, never read anywhere in the component.
7. **`dataBlob`** — written in `setupProfilePic`'s `toBlob` callback; `doImggurUpload` is passed the
   original `File`, so `dataBlob` is never read.

## §17.6 — Handlers, verbatim

```js
showAvatarOptions(){ this.avatarOptions = !this.avatarOptions }

toggleRoomForgotPassword(e=null){ this.forgotPassword=!this.forgotPassword,
                                  "success"==e && window.location.reload() }

doRoomForgotPassword(){ const e=this.forgotPasswordFormGroup.value["forgot-email"];
  this.validateEmail(e)
    ? this.appService.doRoomForgotPassword(e, window.location.href,
                                           this.forgotPasswordFormGroup.value.recaptcha)
    : bootbox.alert("Error: please enter a valid email") }

doRoomChangePassword(){ const e=…value["change-password"], i=…value["repeat-password"];
  e==i ? (e.length<6||i.length<6)
          ? bootbox.alert("Error:your passwords can't be less than 6 characters")
          : this.appService.doRoomChangePassword(e, this.appService.globals.changePasswordUID,
                                                 …value.recaptcha)
       : bootbox.alert("Error: your passwords don't match") }

addRecaptchScript(){ const e=document.createElement("script");
  e.src="https://www.google.com/recaptcha/api.js", e.async=!0, e.defer=!0,
  document.body.appendChild(e) }

calculateAvatar(){ this.disableLoginForm=this.appService.globals.disableLoginForm,
  this.appService.globals.preferences.profilePic
    ? this.avatarURL=this.appService.globals.preferences.profilePic
    : this.email && this.email.indexOf("@")>0 &&
      (this.avatarURL="https://www.gravatar.com/avatar/"+this.appService.hashEmail(this.email)+"?d=mm") }
```

`ngAfterViewInit` builds the forgot form: `"forgot-email": ["", [required, email,
pattern("^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$")]], recaptcha: ["", required]`.
The change form (built in `ngOnInit` only when `changePasswordUID.length > 0`):
`"change-password"` and `"repeat-password"`, each `[required, minLength(6)]`, plus
`recaptcha: required`. `roomLoginURL = href.substring(0, href.indexOf("&changePasswordUID="))`.

**`doLoginCheck` opens with a ban check that says nothing:**

```js
try{ yield e.appService.loadMyInfo();
     if (e.appService.globals.sessData.banIPList.includes(e.appService.globals.userIP)) return !1
}catch{}
```

A banned IP clicks Login and **nothing happens at all** — no message, no spinner, no error.

**The disclosure dialog**, verbatim: `title:"Room Disclosure &amp; Compliance"` (the entity is
literal in the string and bootbox renders it as HTML, so the user sees `&`),
`className:"custom-disclosure-modal"`, `cancel:{label:"Disagree",className:"btn-danger"}` →
`disclosureDone=!1; bootbox.hideAll()`, `ok:{label:"I Agree",className:"btn-info"}` →
`disclosureDone=!0; await loginToRoom(); bootbox.hideAll()`.

**The three login-failure paths**, all read:

```js
// 1. the event-bus path
appEventBus.subscribe("loginFailed", e => { globals.logginIn=!1;
  bootbox.alert(sessData.loginErrorMsg || e.message, () => { try {
    sessData.loginErrorURL && (window.location.href = sessData.loginErrorURL);
    e.reload && window.location.reload() } catch {} }) })

// 2. jwt authMode with no token anywhere
globals.logginIn=!1;
bootbox.alert(sessData.loginErrorMsg || "There was an error login in, please try again or contact support",
  () => { sessData.loginErrorURL && (window.location.href = sessData.loginErrorURL) })

// 3. doSessionLogin threw
globals.logginIn=!1; console.error(o);
bootbox.alert("There was an error login in, please try again or contact support")   // no callback
```

**`isPlayer` — six room features hidden by a CLIENT-side decision.** In `ngOnInit`:

```js
globals.isPlayer && "a"==globals.decodedPassedToken.perms && (
  this.readOnlyEmail=!0, this.disableLoginForm=!0, this.pw="",
  this.usernameInstructions="You can adjust your name here, it would be used to show the stream name",
  sessData.hideNotes=!0, sessData.hideFiles=!0, sessData.hideStreams=!0,
  sessData.hideChatAlerts=!0, sessData.hideRoster=!0, sessData.hideVideoPlayer=!0)
```

This is the browser deciding what the room contains from a JWT claim it decoded itself. Under this
repository's rule 2 it must be a SERVER decision here. **Flagged as an intended divergence**, not as
something to copy.

**`disableEditingUsername = "a" !== globals.decodedPassedToken.perms && sessData.disableEditingUsername`**
— which is what `+page.server.ts:246-247` already computes server-side. ✅ confirmed matching.

## §17.7 — ⚠️ Reference defects that change rendering, each an owner decision

| # | defect | consequence | evidence |
|---|---|---|---|
| D-1 | const 100 `[1,"input-group","mb-","3"]` | the password field's group renders `class="input-group mb- 3"` — **`mb-` and `3` match no Bootstrap rule, so there is NO bottom margin.** Const 46 next to it is the correct `mb-3` | const table |
| D-2 | `H(27,jde…)` — the submit's inner `<span>` has its OWN `(click)="doLoginCheck()"` while the `<form>` has `(submit)="doLoginCheck()"` | clicking the word "Login" fires `doLoginCheck()` **twice**; clicking the button's padding fires it once | `Gde` slot 26-27, const 82 + 109 |
| D-3 | `overflow-x:none` | invalid, discarded | stylesheet |
| D-4 | arm A's forgot-email is `aria-describedby="addon-email"`, the same id the login email uses | harmless only because the two views are mutually exclusive | consts 47/48 vs 93 |
| D-5 | "NOT RECOMENDED", "We suggest" | §16.17 | `_de`, `bde` |

## §17.8 — AUDIT of our implementation against the completed evidence

`apps/room/src/routes/session/+page.svelte` (659 lines) and `+page.server.ts` (402), both read in
full. **This is a documentation record. Nothing was changed.**

### ✅ Confirmed correct against the complete evidence

`login-wrapper` / `container-fluid` / `row login-row` nesting · the arm-selector
`sessData.description ? A : B` and both column class lists (consts 33/36/117) · `Welcome to the
{name}` in both arms · `user-nick` as ONE class with `@{nick}` · consts 72/73/74/76 (name),
92/93 (email), 94/95/97/98 (phone), 99/101/102 (password), 63 (authenticate-info), 64 (form),
65/66 (avatar), 80/82 (submit row), 81/107/108 (remember-me), 83/84 (clear form), 112/113 (have a
password) · the busy label `" Connecting "` + const 110 · `rememberMe` defaulting **true** ·
`doLoginCheck`'s validation order and its three message strings · the disclosure dialog's labels and
button classes · `disableEditingUsername`'s two-term server-side computation.

### ❌ DIVERGENCES — ours differs from the reference

| # | ours | reference | evidence |
|---|---|---|---|
| A-1 | remember-me label always **"Keep me logged in"** | **"Remember me"** in arm A, "Keep me logged in" in arm B | `Ude` vs `pue` |
| A-2 | password shown on `passwordRevealed \|\| showPasswordField` | `showPresenter \|\| "pw"==authMode \|\| "webinarRoom"===authMode` — **two terms missing.** A room with `authMode:"pw"` and `showPasswordField:false` shows the field there and not here | `Nde` slot 8, `bue` slot 22 |
| A-3 | h1 gated on `data.roomTitle` | gated on `!sessData.hideWelcomeTo` — **a flag we do not carry at all** | `Wde` slot 2, `bue` slot 0 |
| A-4 | name input `disabled={disableEditingUsername \|\| disableLoginForm}` | `z("disabled", e.disableEditingUsername)` — **one term. We added `disableLoginForm`.** | `Gde`/`bue` update blocks |
| A-5 | remember-me rendered unconditionally | `disableLoginForm ? -1 : …` | `Gde` slot 24, `bue` slot 27 |
| A-6 | email not gated | arm A hides email+phone+password together on `disableLoginForm`; arm B hides email alone | `O(19,…)` / `O(20,…)` |
| A-7 | submit `disabled={submitting}` | `logginIn \|\| !loginReady` — **`loginReady` has no counterpart here** | const 82 binding |
| A-8 | phone addon is a bare `<span>` | wrapped in `div.input-group-append` (const 96), which is the **only** consumer of two stylesheet rules (`.input-group-append{border…}` and `.input-group>.input-group-append>.input-group-text{background…}`) — so the addon renders differently | const 96, stylesheet |
| A-9 | password group `class="input-group mb-3"` | `class="input-group mb- 3"` (D-1) | const 100 |
| A-10 | `.loginGravatar img` without `margin-left` | `margin-left:27px` — it counterweights the gear's `left:-20px` | stylesheet |
| A-11 | `<style>` omits `.login-wrapper p{margin:auto;max-width:360px}`, `p.authenticate-info{padding:15px 0}`, `.session-login-link{font-size:14px}`, `.session-login-link:hover{…}`, `.login-form .form-check-label{font-size:12px}`, `.login-form .form-check:hover{cursor:pointer}` | all six exist, **and our markup renders every selector they target.** The comment at `+page.svelte:545-548` claiming only unused rules were dropped is **falsified** — these are used | stylesheet vs our markup |
| A-12 | footer is `<div class="text-center">` | `<p class="text-center">` (const 39) — and `.login-wrapper p{max-width:360px;margin:auto}` applies to a `<p>` only | `Wde` slot 10 |
| A-13 | Powered-by carries `rel="noreferrer"` | const 40 has **no `rel`** | const 40 |
| A-14 | email `readonly={readOnlyEmail}` | `disabled` (const 93). **Ours is the right call** — a disabled input is not submitted and this page POSTs — but it is a divergence and the reason belongs in the code | const 93 |
| A-15 | email has no `bind:` and no `oninput` | const 93 binds `ngModel` **and** `(input)="calculateAvatar()"`; when `readOnlyEmail` is false the field is editable and retypes the gravatar | const 93, `Nde`/`lue` |
| A-16 | `clearForm()` sets `rememberMe = false` | `doLoginFormClear()` never touches it, and it re-defaults to **true** after the reload | handler verbatim |
| A-17 | avatar `<img>` has `width`/`height`/`alt` | reference has neither; sized by CSS only. **Ours is the repo rule (no CLS) — keep, and say so** | const 67/85 |
| A-18 | "Not you? clear form" is a `<button>` | a bare `<a>` with a click handler | const 84 |

### ⬜ GAPS — present in the reference, absent from ours

| # | missing | detail |
|---|---|---|
| G-1 | **the full-page loading state** | `logginIn` replaces the entire page with `gde` (consts 0–3) + `.loading-message{font-size:24px}` |
| G-2 | **the browser-upgrade notice** | `bde`/`_de`, consts 6, 23–32 — documented at 6/6 in §16.17/§16.19 |
| G-3 | **the avatar gear + `avatar-options` panel** | const 68/69 → `showAvatarOptions()`; `Pde`/`rue` → `profilePic ? Ade : Mde`; Setup Gravatar (86) / "Or upload a picture" (87) / "Replace picture" / "Remove profile picture" (89/90) |
| G-4 | **the profile-picture upload** | `setupProfilePic` (a bootbox with a hidden `#fuploadPTR` file input, canvas downscale to 125 px, `toDataURL('image/png')` preview) and `doImggurUpload` (`POST {upload_server}/image/{sessionID}`, `Authorization: Client-ID {cdn_upload_key}`) |
| G-5 | **"Forgot Password?"** | const 103/84 inside the password block → `toggleRoomForgotPassword()` |
| G-6 | **the forgot-password view** | `Cde`/`Yde` + `Fde`/`Kde` + `yde`/`qde`; `doRoomForgotPassword`; consts 41–54, 118/119; `<re-captcha formControlName="recaptcha">` |
| G-7 | **the change-password view** | `Dde`/`Zde` + `Tde`/`Jde` + `wde`/`Xde`; `doRoomChangePassword`; consts 55–62; entered on `globals.changePasswordUID.length > 0` |
| G-8 | **the `authMode === 'sso'` email row** | `Lde`/`uue`, consts 78/49/104/105 |
| G-9 | **"Initializing..."** | `Bde`/`hue`, consts 79/106, on `!loginReady` |
| G-10 | **the footer version line** | `Ne(" Version: ", globals.appVersion, " ")` |
| G-11 | **`hideWelcomeTo`, `loginReady`, `appVersion`, `changePasswordUID`, `banIPList`, `loginErrorMsg`, `loginErrorURL`, `isPlayer`** | eight reference state sources with no counterpart in our load |

### 🚫 Deliberately NOT to be built

The five dead controls of §17.5. An implementer working from a screenshot would add the two avatar
modals and the "Non Presenter Admin" checkbox; the const table proves nothing reaches them.

## §17.9 — Const 6 RESOLVED

§16.19 recorded const 6 verbatim and refused to interpret it. The complete view set settles it:
**const 6 is used at exactly one site, `H(2,bde,22,1,"div",6)` in `yue` — the browser-upgrade
notice.** It is not the login form's column. `col-md-2 col-sm-10 login-form` with
`border-left: solid 1px #0a0a0a; height:100%` is what the warning renders as, and it reuses the
`login-form` card styling. The observation in §16.19 was correct and the restraint was correct.

## §17.10 — Evidence gaps opened by this read

1. **`/public/images/supported_browsers.jpeg`** — not in `apps/room/static` (which holds only
   `assets/` and `favicon.ico`). Blocks G-2's image. *(standing from §16.19)*
2. **`--avatar-gear-icon-padding`** — consumed by `.setup-avatar`, **not defined in this
   component's stylesheet.** Blocks G-3's gear geometry. Looked in: the complete `styles:[…]` of
   `app-session-login`, read end to end.
3. **`re-captcha` `siteKey`** — the `re-captcha` component reads `this.siteKey` from an `@Input`.
   The value passed to it is not in the login component's template (const 50 binds only
   `formControlName`). Blocks G-6/G-7.
4. **`globals.upload_server` and `globals.cdn_upload_key`** — the image-upload endpoint and its
   `Client-ID`. Blocks G-4.
5. **`appService.hashEmail`** — the gravatar hash function (MD5 vs SHA-256 changes every avatar
   URL). Not read yet.
6. **`appService.doRoomForgotPassword` / `doRoomChangePassword`** — the wire calls behind G-6/G-7.
   Not read yet.

Each is named, each says where it was looked for, and none is filled in.

## §17.11 — The six §17.10 gaps, closed

Recorded 2026-08-16 13:34 EDT. Five closed by reading; one proven genuinely absent from every tree.

### ✅ Gap 2 — `--avatar-gear-icon-padding` = **`5px 5.5px`**

`apps/room/docs/source-v4-2026-08-15/styles.ee2a710065b60389.css` byte **422,481**, inside the
single `:root{}` block. That file is the stylesheet PAIRED with the bundle being decoded (both dated
2026-08-15 in the repo's own `source-v4-2026-08-15/`), which is the copy that counts — the
`new-room/docs/source/styles.d622cb9ed2bbc221.css` sibling is a different build and was not used.

**The `:root` values the login stylesheet actually consumes**, read from the same block so the
component's `var()` calls resolve to numbers instead of names:

```css
--dark-black:  #222        /* .login-wrapper color                                  */
--light-gray:  #ccc        /* h1.room-title border-bottom, .login-form box-shadow   */
--lighter-gray:#eee        /* .login-wrapper background, .form-control border        */
--white:       #fff        /* .login-form background, .setup-avatar background       */
--avatar-gear-icon-padding: 5px 5.5px
```

**Unblocks G-3.** The gear is `padding: 5px 5.5px` — asymmetric, which is what centres a `fa-cog`
glyph in a `border-radius:50%` circle. Guessing `5px` would have made it an oval.

### ✅ Gap 3 — the reCAPTCHA site key comes from DI, not from the template

The `<re-captcha>` element in the login template binds **only** `formControlName` (const 50). The
key reaches it through Angular injection: the component's constructor is
`(elementRef, loader, zone, s)` with `s` injected as `be(ZN,8)` — flag 8 is `@Optional()` — and
`s && (this.siteKey = s.siteKey, this.theme = s.theme, this.type = s.type, this.size = s.size,
this.badge = s.badge)`. `renderRecaptcha()` then passes `sitekey: this.siteKey` to `grecaptcha.render`.

The root module (`QRe`, `bootstrap:[ORe]`, byte 2,618,300ff) provides it:

```js
providers:[{provide: ZN, useValue: {siteKey: "6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx"}}]
```

**This is the PUBLIC half of a reCAPTCHA v2 pair and is recorded deliberately.** A site key is
rendered into the page HTML and visible to every visitor by design; the value that must never be
transcribed is the *secret* key, which is server-side and is not in this bundle. Nothing is leaked
by writing it here that is not already served to every browser that opens the room.

**Unblocks G-6 and G-7**, with one consequence to state: no `theme`/`size`/`type` is provided, so the
widget renders at `grecaptcha`'s defaults.

### ✅ Gap 4 — the upload endpoint, with its credential REDACTED

`globals` class `AN`, byte 976,300ff:

```js
this.appVersion="v4.0.1", this.clientVersion="4.0.0",
this.ptr_server="https://chat.protradingroom.com", this.ptr_server_ws="chat.protradingroom.com",
this.server_prefix="/ptr_app",
this.upload_server="https://cdn1.protradingroom.com",
this.cdn_upload_key="<REDACTED — live bearer credential, see below>",
```

So G-4's request is:

```
POST https://cdn1.protradingroom.com/image/{sessionID}
Authorization: Client-ID {cdn_upload_key}
body: FormData{ image: <File>, name: <File.name> }
response: { data: { link } } -> preferences.profilePic = link
```

⚠️ **`cdn_upload_key` is a live `Client-ID` bearer credential and is NOT transcribed into this
file.** It is a 36-character GUID at byte **976,700** of
`apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`; read it there when the upload is
built, and put it in `apps/controller/.env`, never in a tracked file. The repo rule is that live
credentials do not enter git-tracked files, and `todo-next.md` is tracked.

**Bonus — G-10 closes here too:** the footer's `globals.appVersion` is **`"v4.0.1"`** (and
`clientVersion`, posted as `cver` on every login, is `"4.0.0"` — the two differ and the `v` prefix is
on the display one only).

**Also read in the same block, relevant to §17.5:** `this.isNonPresenterAdmin=!1` exists on
`globals`. The "Non Presenter Admin" checkbox does **not** write it — which strengthens rather than
weakens the dead-control finding: the flag is real and is set somewhere else entirely.

### ✅ Gap 5 — `hashEmail` is **MD5**, and it is locale-sensitive

Two hops, both read:

```js
// appService, byte 1,027,009
hashEmail(e){ return e ? xi.hashStr(e.trim().toLocaleLowerCase()) : "" }

// class xi, byte 982,280ff
static hashStr(n,e=!1){ return this.onePassHasher.start().appendStr(n).end(e) }
static _hex(n){ … xi.hexChars … xi.hexOut … }              // lowercase hex out
static _md5cycle(n,e){ i += (o&s|~o&r) + e[0] - 680876936 |0, i = (i<<7|i>>>25)+o|0,
                       r += (i&o|~i&s) + e[1] - 389564586 |0, r = (r<<12|r>>>20)+i|0,
                       s += (r&i|~r&o) + e[2] + 606105819 |0, s = (s<<17|s>>>15)+r|0,
                       o += (s&r|~s&i) + e[3] - 1044525330|0, o = (o<<22|o>>>10)+s|0, … }
```

`-680876936`, `-389564586`, `606105819`, `-1044525330`, `-176418897`, `1200080426`, `-1473231341`
are the MD5 K-table constants (`0xd76aa478` … as signed 32-bit), the shift schedule is MD5's
`7,12,17,22`, and the state is four `Int32` words over a 68-byte buffer. **This is MD5**, identified
from its constants rather than from the function's name or from what Gravatar happens to want.

> **`avt` = `MD5(email.trim().toLocaleLowerCase())`, lowercase hex.**
> The avatar URL is `https://www.gravatar.com/avatar/{avt}?d=mm`.

⚠️ **`toLocaleLowerCase()`, not `toLowerCase()` — and this is not a nitpick.** Under a Turkish or
Azeri locale `"I"` lowercases to `"ı"` (dotless), which changes the MD5, which changes `avt`. `avt`
is not only the avatar: `getCurrentUserEmailHash()` returns it and `canDeleteOwnMessage()` compares
it, so **the same account under a different browser locale gets a different identity hash and loses
the ability to delete its own messages.** Ours must use `toLowerCase()` and say why — an owner
decision recorded as an intentional divergence, not a silent fix.

### ✅ Bonus — `doSessionLogin`, the login wire call itself (was not on any gap list)

```js
POST {globals.apiROOT}/sessions/v2/authUser/{globals.sessionID}
body: {cver, nick, email, pw?, phone?, profilePic?}      // cver = clientVersion "4.0.0"
!o || !o.success  ->  appEventBus.emit("loginFailed", o)
ok -> globals.sesionToken = o.tok
      localStorage.setItem(`ag-${globals.sessionID}`, String(o.tok))
      globals.user = { name: (chatOnlyMode && skeepLogin && preferences.savedNick) || tok.name,
                       email, emailHash: tok.avt || hashEmail(email), avt: same,
                       perms, isPresenter: "a"===perms, userXrefID: tok.xrefID,
                       isFT, isNew, alertFilterFor: {}, badges: [] }
      connectToSocketServer()
```

**The session token lives in `localStorage` under `ag-{sessionID}`** — readable by any script on the
origin. Ours is an `httpOnly` cookie. A divergence we keep, and the reason belongs in the code.

### ✅ Gap 6 — the two password wire calls, and a defect in one of them

```js
doRoomForgotPassword(email, url, recaptcha){
  POST `${globals.apiROOT}/users/v2/room-forgot-password`
       {email, url, recaptcha, sessionID: globals.sessionID}
  .catch(l => appEventBus.emit("doRoomForgotPassword",
            {success:!1, message:"There was an error, please try again or contact support"}))
  a || (a = {success:!1, msg:"There was an error, please try again or contact support"})
  appEventBus.emit("doRoomForgotPassword", a) }

doRoomChangePassword(passNew, userID, recaptcha){
  POST `${globals.apiROOT}/users/v2/room-change-password`
       {passNew, userID, recaptcha, sessionID: globals.sessionID}
  .catch(l => appEventBus.emit("doRoomChangePassword", {success:!1, msg:"…"}))
  a || (a = {success:!1, msg:"…"})
  appEventBus.emit("doRoomChangePassword", a) }
```

`userID` is `globals.changePasswordUID`; `url` is `window.location.href`.

⚠️ **D-6 — a new reference defect.** `doRoomForgotPassword`'s **catch** emits a **`message`** key
while every other path — its own fallback, and both of `doRoomChangePassword`'s — emits **`msg`**.
The view renders `Ze(e.forgotPasswordStatus.msg)`. So on a network failure the bus fires **twice**:
first with `{success:false, message:…}`, which the template renders as **`undefined`**, then with
`{success:false, msg:…}`. The settled state is correct; the transient shows `undefined` to the user.
`doRoomChangePassword` does not have this bug — the asymmetry is the proof it is a typo and not a
convention. **Ours uses `msg` on every path.**

### ⬜ Gap 1 — `supported_browsers.jpeg` — PROVEN absent, and the gap is now precise

Searched by filename across all three trees — `trading-room-app`, `new-room`, `new-room-control` —
and it is in none of them. But the **directory is real**:
`new-room/new-room-control/static/public/images/` exists and holds `protradingroom_icon.png`,
`ptr_descrived_perspective.png`, `user_comments.png` and `circle-icons/`. So const 25's
`/public/images/supported_browsers.jpeg` is a live path on the reference host whose **binary was
never captured** — not a wrong path, and not something any amount of further reading will produce.

**This is the one gap that cannot be closed by reading**, and it is the owner's call:
supply the JPEG, or accept that the browser notice renders with a broken image.

---

## §17.12 — Standing gap count after §17.11

| category | count | status |
|---|---|---|
| evidence gaps in the login component | **0** | five closed by reading, one proven absent (Gap 1, owner decision) |
| reference defects found and flagged | **6** | D-1 … D-6, each an owner decision, none silently fixed |
| divergences of ours vs the reference | **18** | §17.8, each with its locator |
| implementation gaps (documented, unbuilt) | **11** | §17.8 G-1 … G-11 — **the build phase's worklist, not evidence gaps** |
| live credentials encountered | **1** | `cdn_upload_key`, redacted, byte offset recorded instead |

**`app-session-login` is documentation-closed.** Every const, every view function, every condition,
every handler, the complete stylesheet, both wire calls, the hash algorithm and the upload endpoint
are recorded from evidence that was read at verified boundaries.

**The wider queue is NOT closed** and is not claimed to be: `account-page` (1.0 MB), `must-match`,
`mising`, `gap-dump`, `stylesheet`, `modal`, the 37 `.less` sources, `styes.css` 2,657–11,347, the v4
sheet rule-split (5,410 rules), `admin-surface.md`, `gaps-closed.md` 330–991,
`website-ptr1-prt2-full-read.md`, `mobile-app-decoded.md` 590–758, `ptr-manage-dom.html` line 168,
the six `docs/decoded/` specs, and Q-1 (`alert-qa`, §16.12, a different component).

---

# §18 — Q-1 CLOSED: `app-alert-qa-modal`, read end to end

Recorded 2026-08-16 13:41 EDT. **Documentation only.** Bundle bytes **2,331,000 → 2,350,400**, read
line by line; the window opens before the component's first view function and closes inside
`app-muted-users-modal`, so the component is bracketed on both sides. DOM capture:
`new-room/app-modals/app-alert-qa-modal` (3,879 B), read in full.

## §18.1 — The headline: there is no separate "ask" button, and the capture is role-blind

§16.12 carried Q-1 as "the alert-qa **ask** button". The bundle settles it:

```js
xn("placeholder", o.appService.globals.isPresenter
                    ? "Type your answer here..."
                    : "Type your question here...")
```

**One modal serves both roles, and the ONLY thing that changes is the placeholder.** There is no ask
button, no separate ask view, and no second component. The DOM capture shows
`placeholder="Type your answer here..."` because **it was taken while logged in as a presenter** —
a member sees the other string. Building from the capture alone would have shipped a room where
members are invited to answer their own questions.

**And there is no send button at all.** The footer holds the textarea and two icon buttons; sending
is the Enter key (§18.4).

**The modal is opened by an event, not by `data-bs-toggle`:**

```js
guiEventBus.subscribe("openAlertQAModal", ({msg:e, openModal:i}) => {
  e && ( i && ($("#alertQAModal").modal("show"), this.modalId=e._id, $("#textAreaQATxt").val("")),
         this.modalId===e._id && (
           $(`.${e._id}`).on("hidden.bs.modal", () => { delete e.unreadQA }),
           this.qaMsg=e, this.msgs=e.qa, this.scrollToBottomQA() ) ) })
```

The trigger — wherever it lives — emits `openAlertQAModal` with `{msg, openModal}`. Note
`openModal:false` re-renders an ALREADY-open modal with fresh data without re-showing it, which is
how a live Q&A thread updates.

**The host element carries the alert id as a class:** `Rh("modal fade ", o.qaMsg._id, "")` →
`class="modal fade {qaMsg._id}"`. That is what `$(\`.${e._id}\`)` binds `hidden.bs.modal` to, and it
is why the id must be on the element and not only in `id="alertQAModal"`.

## §18.2 — The const table, all 38 entries, verbatim

```
0  ["qaContainer",""]                     1  ["emojiPanelDiv",""]
2  ["id","alertQAModal","tabindex","-1","aria-labelledby","alertQALabel","aria-hidden","true",
    "data-keyboard","false","data-backdrop","static"]        ← classes come from Rh(), see §18.1
3  [1,"modal-dialog"]                     4  [1,"modal-content"]
5  [1,"modal-header","align-items-start"] 6  [1,"flex-fill"]
7  ["id","alertQALabel",1,"modal-title"]  8  [1,"admin-alert","mt-2"]
9  ["type","button","data-bs-dismiss","modal","aria-label","Close",1,"btn-close","btn-close-white"]
10 [1,"modal-body"]                       11 [1,"popoverClass"]
12 [1,"my-2"]                             13 [1,"modal-footer","flex-nowrap"]
14 ["id","textAreaHolder",1,"d-flex","align-items-center","textSendDiv","flex-fill"]
15 [1,"flex-fill","d-flex","mx-0"]        16 [1,"px-0","flex-fill"]
17 ["name","txt-area","id","textAreaQATxt","rows","1","spellcheck","true",1,"txt-area",
    "form-control","border-0",3,"keyup","paste","placeholder"]
18 [1,"justify-content-center","d-flex","flex-row","align-items-center","justify-content-center",
    "p-0","m-0","text-center","textAreaBtnsCol"]
19 ["placement","auto","container","body","autoClose","outside","popoverClass","popOverDiv",
    1,"textAreaBtns",3,"click","ngbPopover"]
20 ["placement","left","ngbTooltip","Add Emojis",1,"far","fa-smile"]
21 [1,"textAreaBtns"]
22 ["clas","d-flex flex-column  align-items-center w-100"]   ← ⚠️ see §18.3
23 [1,"mr-1","d-flex","flex-row-reverse"]
24 [1,"d-flex","flex-row-reverse","justify-content-center","align-items-start","flex-nowrap","mt-1"]
25 [1,"avatar","pl-1"]                    26 [1,"w-100"]
27 [1,"d-flex","justify-content-between","align-items-center","w-100"]
28 ["placement","top",1,"created-at","mr-2",3,"ngbTooltip"]
29 [1,"d-flex","align-items-center","justify-content-between","flex-nowrap"]
30 [1,"username","mx-1"]
31 ["alt","qaMsg.avt",3,"src"]                               ← ⚠️ see §18.3
32 [1,"msg-left","text-formated","preText","ml-2","mr-2","p-0",3,"innerHTML"]
33 [1,"msg-left","text-formated","preText","ml-2","mr-2","p-0",3,"click","innerHTML"]
34 [3,"emojiSelect"]
35 [3,"msg","isP","logType","isQAMsg","qaMsgID","msgIndex","prevD"]
36 [1,"textAreaBtns",3,"click"]
37 ["ngbTooltip","Upload an Image","placement","left",1,"fas","fa-image"]
```

**Ruling out my own tooling first:** the DOM capture shows `autoclose`/`popoverclass` lowercase
while const 19 has `autoClose`/`popoverClass`. That is HTML attribute-name lowercasing in the
capture, **not** a discrepancy — the bundle is authoritative for casing.

## §18.3 — ⚠️ Five reference defects, each an owner decision

| # | defect | evidence | consequence |
|---|---|---|---|
| Q-D1 | **`clas`, not `class`** | const 22 `["clas","d-flex flex-column  align-items-center w-100"]` | the attribute is in the CONST TABLE, so it is authored, not a capture slip. That div has **no classes at all** — no flex column, no centring. Note also the **double space** in `flex-column  align-items-center` |
| Q-D2 | **`alt` is a literal string** | const 31 `["alt","qaMsg.avt",3,"src"]` — only `src` is bound | every avatar in this modal has alt text reading **"qaMsg.avt"**. A screen reader announces the variable name |
| Q-D3 | **Shift+Enter is a no-op** | `e.shiftKey ? (i.val(i.val()), autoExpand(...))` | it sets the value to itself. **Alt+Enter** is what inserts `\n`. The universal convention is broken and an undiscoverable one replaces it |
| Q-D4 | **unguarded `hasOwnProperty`** | `O(4, e.qaMsg && e.qaMsg.hasOwnProperty("avt") \|\| e.qaMsg.hasOwnProperty("pic") ? 4 : -1)` | `&&` binds tighter than `\|\|`, so with a null `qaMsg` the second operand **throws**. Slots 7, 9 and 10 are correctly guarded — the asymmetry is what proves it a slip |
| Q-D5 | **popover arrow rules cannot match** | `.bs-popover-top > .arrow:after` and `.bs-popover-auto[x-placement^=top] > .arrow:after` are **component-scoped**, but the popover is created with `container="body"` | the popover is appended OUTSIDE the component's subtree, so Angular's `_ngcontent` attribute is never on it and `border-top-color: var(--modal-content-bg-color)` never applies. The arrow renders in Bootstrap's default colour |

**Two dead CSS rules**, both read rather than searched:
`#textAreaTxt{max-height:300px;width:100%}` — this component's textarea is `#textAreaQATxt`, and the
sheet *also* carries a correct `#textAreaQATxt{max-height:300px;width:100%}` near its end, so the
first is a copy-paste survivor. `#form-upload-img .input-group-text, #form-upload-img
.form-control{border-radius:0}` — no `#form-upload-img` element exists in this component.

**⚠️ Correcting the capture's own header, which would otherwise send someone chasing nothing.**
`app-alert-qa-modal` opens with *"KNOWN CSS GAPS - HONEST: these match NOTHING now the scope attrs
are gone"* and lists those four selectors. **All four DO exist in the reference stylesheet** — I read
them. The capture's note describes its own de-scoping step, not a missing rule. Two of the four
(`#form-upload-img`) are genuinely dead in the reference as well; the other two are Q-D5, which is a
different and more interesting failure. **This is a note about the capture tool, not about the app.**

## §18.4 — Behaviour, verbatim

```js
onKey(e){ if(13===e.keyCode){ e.preventDefault(); const i=$("#textAreaQATxt");
  e.shiftKey ? (i.val(i.val()), this.autoExpand(e.target))              // no-op — Q-D3
  : e.altKey ? (i.val(i.val()+"\n"), this.autoExpand(e.target))         // newline
  : (this.showEmojiChooser=!1, this.sendMessage(), this.autoExpand(e.target)) }}

sendMessage(){ if(!this.canPost) return void bootbox.alert("Sorry, you cannot post to this channel");
  const e=$("#textAreaQATxt").val().toString().trim(); if(!e) return !1;
  this.appService.sendAlertQAReply(this.qaMsg._id, e);
  $("#textAreaQATxt").val(""); this.scrollToBottomQA() }

autoExpand(e){ if(e.scrollHeight>300) return;         // hard ceiling, matches #textAreaQATxt CSS
  e.style.height="0"; const o=e.scrollHeight+"px";
  getComputedStyle(e).getPropertyValue("height")!==o &&
    (e.style.height=o,
     querySelector(".modal-body").style.maxHeight=`calc(70vh - ${o} + 37px)`);
  ""===e.value.trim() && (e.style.height="23px",
     querySelector(".modal-body").style.maxHeight="70vh") }
```

**The textarea growing shrinks the body by the same amount** — `calc(70vh - {height} + 37px)`. The
empty-state reset is `23px` / `70vh`. Those four numbers are the whole resize behaviour.

`canPost` is `true` in the constructor and **is never reassigned anywhere in this component** (claim
scoped to the class body, read end to end), so the "Sorry, you cannot post to this channel" branch
is unreachable from here.

`canPostImages` = `isPresenter || sessData.userUploads`, and gates the image button
`O(23, canPostImages ? 23 : -1)`.

`displayMode` = `sessData.altChatRender ? "c" : (getPreference("alertsMode") || "r")`, persisted back
via `setPreference` on every path. `"r"` renders `<app-st-message>`, anything else
`<app-st-compactmessage>`, each fed
`msg, isP, logType:"alerts", isQAMsg:true, qaMsgID, msgIndex, prevD:(i>0?msgs[i-1].t:0)`.

Empty state: `O(13, msgs && 0===msgs.length ? 13 : 14)` → `<div class="my-2">There are no questions.</div>`.

`doQAMention` appends `@{name} ` to the textarea, with a leading space when it is not empty.

## §18.5 — Avatar, timestamp and body

```js
src   = qaMsg.pic || "https://secure.gravatar.com/avatar/" + qaMsg.avt + "?d=mm&s=50"
tooltip = date(qaMsg.t, "short")      visible = date(qaMsg.t, "hh:mm a")
name  = Ne(" ", qaMsg.n, " ")
body  = parseLinks( parseSymbols(qaMsg.txt, "chat", qaMsg.avt, null),
                    preferences.chatGif, qaMsg._id, false )   → bound as innerHTML
```

⚠️ **`secure.gravatar.com` here, `www.gravatar.com` in the login component** (§17). Two hosts for
the same service in one application, both read. Ours should pick one and say which.
Size differs per surface too: `s=50` here, `s=30` in `app-muted-users-modal`, none in login.

`copyTrades` picks const 33 (with `(click)`) over const 32 (without):

```js
copyTradeOnClick(e,i){ const o=e.target;
  "SPAN"===o.tagName && o.classList?.contains("tradeColor") && o.id===i &&
    (this.doTradeCopy(i), e.stopPropagation()) }        // i is "id_"+qaMsg._id
doTradeCopy(e){ … navigator.clipboard.writeText(textContent) …
  bootbox.alert("Order copied to clipboard.") guarded by copyTradeAlertVisible }
```

## §18.6 — Image upload

`imgUpload()` opens a bootbox: `title:"Image Upload"`, `size:"xl"`, `backdrop:true`, `onEscape:true`,
one button `{label:"Upload", className:"btn-success"}`. Its markup carries `#fupload` (hidden,
`multiple='true'`, `accept='image/*'`), `#filedrag` ("or drop files here"), `#fileList`, and a
`#msg-text-qa-upload` textarea placeholder **"Enter your message"**. Drag handlers `dragover` /
`dragleave` / `drop` all call the same preventer, which sets `className = "hover"` on `dragover`.

`doImggurUpload` posts to the SAME endpoint as the login's avatar upload (§17.11 Gap 4) and on
success appends the link to `imggurUploadTxt`, then `sendAlertQAReply(qaMsg._id, imggurUploadTxt)`
and **`$("#alertQAModal").modal("hide")`** — a successful image upload closes the modal.

⚠️ **Q-D6 — off-by-one:** after uploading `o` files, `_c.splice(0, o-1)` removes `o-1`, leaving the
last file in the buffer for the next upload.

Two different misspellings of "Imgur" in the same component: `doImagurFileListUpload` and
`doImggurUpload`. Both are the reference's; neither is a typo of mine.

`onImagePaste` intercepts a clipboard image and opens a `bootbox.confirm` with a
`max-width:100%; max-height:50vh` preview and a `#msg-text-qa` textarea pre-filled with whatever was
already typed.

## §18.7 — The component stylesheet, complete

```css
#alertQAModal .modal-dialog { max-width:600px!important; overflow-y:initial!important }
#alertQAModal .modal-body   { min-height:330px; max-height:70vh; height:100%; overflow-y:auto }
.preText            { white-space:pre-wrap }
#textAreaTxt        { max-height:300px; width:100% }          /* DEAD — wrong id */
.admin-alert        { border:1px solid #444; border-radius:5px; padding:5px }
.avatar             { display:inline }
.avatar img         { width:100%; max-width:50px; height:auto }
.username           { font-size:14px; color:#ccc; font-weight:900 }
.created-at         { font-size:12px; font-style:italic; color:#ccc; overflow:hidden; font-weight:600 }
.msg-left           { text-align:left }
.text-formated      { font-size:16px }
.chatNameAvatar     { display:inline }
.textAreaBtns       { padding:5px; color:var(--dark-gray) }
.custom-file        { display:none }
.input-group-text   { padding:0; margin:0 }
.textAreaBtnsCol    { background-color:var(--textarea-bg)!important; color:var(--dark-gray)!important }
.textAreaBtns       { color:var(--textarea-holder-btns-color)!important }
.textAreaBtns:hover { color:var(--textarea-holder-btns-hover-color)!important; cursor:pointer }
.txt-area           { border-radius:0; border:1px solid #ffffff; font-size:14px; resize:none;
                      color:var(--textarea-color)!important;
                      background-color:var(--textarea-bg)!important;
                      outline:none; overflow-y:auto; margin-left:0; margin-right:0;
                      padding-left:5px; padding-right:5px }
.txt-area:focus     { border-color:var(--darker-gray); box-shadow:1px 1px 1px var(--darker-gray) }
#form-upload-img .input-group-text,
#form-upload-img .form-control        { border-radius:0 }     /* DEAD — no such element */
.white              { color:#fff }
.textAreaBtnSelected{ background-color:#f1f2f3 }
.bs-popover-top > .arrow:after,
.bs-popover-auto[x-placement^=top] > .arrow:after
                    { border-top-color:var(--modal-content-bg-color) }   /* Q-D5 — cannot match */
.giphy-search       { width:400px; height:700px; border:2px solid var(--modal-content-bg-color);
                      background-color:#fff; overflow:hidden }
.giphy-search .input-group-text { border:none; background-color:var(--modal-input-group-bg) }
.giphy-search .fa-times         { font-size:16.5px; padding:10px }
.giphy-search .fa-times:hover   { cursor:pointer; opacity:.85 }
.giphy-header       { padding:10px; background-color:var(--modal-content-bg-color) }
.search-results     { overflow-y:auto; height:100%; padding:5px }
.gif-result         { text-align:center }
.gif-result img     { cursor:pointer }
.giphy-search li        { padding:10px }
.giphy-search li:hover  { background-color:var(--modal-upload-files-color) }
.giphy-search h4        { color:var(--modal-content-color); text-align:center }
#textAreaHolder     { background-color:var(--textarea-bg); border-radius:8px; padding:5px; margin:5px }
.typing-indicator-container { margin:4px 16px }
.users-typing       { color:#90949c; font-size:12px }
.users-typing em    { font-weight:700 }
#textAreaQATxt      { max-height:300px; width:100% }
#textAreaQATxt, .textAreaBtnsCol { background-color:var(--textarea-bg) }
img                 { max-width:100% }
```

**Honest note on the custom properties.** `--dark-gray:#aaa`, `--darker-gray:#aaa6a6` and
`--textarea-bg:var(--darker-black)` (`#111`) and `--textarea-holder-btns-color:#bbb` were read from
the `:root` block in §17.11. **`--textarea-holder-btns-hover-color`, `--textarea-color`,
`--modal-content-bg-color`, `--modal-input-group-bg`, `--modal-upload-files-color` and
`--modal-content-color` were NOT in the portion of `:root` I have read** — that slice ended
mid-list. They are not asserted absent; the rest of `:root` is simply unread. **Open item R-1.**

## §18.8 — Bonus, captured in the same window: `app-muted-users-modal` is complete

`id="mutedUsersModal"`, title **"Muted Chat Users"**, empty state **"You don't have any
muted/ignored users."**, a `list-group list-group-flush` of
`li.list-group-item.d-flex.justify-content-between.align-items-start`, each with
`img[src=pic || secure.gravatar.com/avatar/{emailHash}?d=mm&s=30][alt=nick]`, the nick, and a
`btn btn-outline-danger btn-sm` carrying `i.fas.fa-trash` →
`bootbox.confirm({message:"Do you want to unmute {nick}?", className:"manage-user-list"})` →
`removeUserFromList(emailHash,"mutedUsers")` then re-emit `manageMutedUsers`. Footer: one
`btn btn-primary` labelled `" Close "`. Populated from
`Object.values(globals.mutedUsers)` on the `manageMutedUsers` event.

---

## §18.9 — Gap ledger after §18

| item | status |
|---|---|
| `app-session-login` | **0 evidence gaps** (§17.11); 6 defects, 18 divergences, 11 unbuilt |
| **Q-1 `app-alert-qa-modal`** | **CLOSED** — 6 defects (Q-D1…Q-D6), 2 dead CSS rules, 1 capture-header correction |
| `app-muted-users-modal` | **complete**, unplanned |
| **R-1** the rest of `:root` | **OPEN** — six custom properties consumed by §18.7 and not yet read |
| the wider queue | `account-page` (930 KB), `must-match` (535 KB), `mising` (798 KB), `gap-dump` (171 KB), `stylesheet/file` (23 KB), the 37 `.less` sources, `styes.css` 2,657–11,347, the v4 rule-split, `gaps-closed.md` 330–991, and the rest of `app-modals/` |

---

# §19 — R-1 closed, and Q-1 AUDITED against our implementation

Recorded 2026-08-16 14:14 EDT. **Documentation only.** Scope per the owner's directive of
2026-08-16: *a gap counts only if the implementation needs it.* This section is therefore driven
from our source, not from the dump pile.

## §19.1 — R-1 CLOSED: the complete custom-property table

`styles.ee2a710065b60389.css` bytes 421,850–428,850 — the whole `:root{…}` block plus the
`.lightTheme{…}` and `.darkTheme{…}` override blocks, all three read end to end from `@charset` to
the closing brace of `.darkTheme`.

Four of §18.7's six unknowns resolve directly:

```css
--modal-content-bg-color: #303030      --modal-content-color: #fff
--modal-input-group-bg:   #444         --modal-upload-files-color: #555
```

The other two are findings rather than values:

| # | property | what the evidence says |
|---|---|---|
| R-D1 | `--textarea-color` | **Not in `:root`.** Defined ONLY inside `.lightTheme` (`#555`) and `.darkTheme` (`#eee`). So `.txt-area{color:var(--textarea-color)!important}` resolves to nothing unless a theme class is on an ancestor — the Q&A textarea has **no colour of its own** in the untenanted case |
| R-D2 | `--textarea-holder-btns-hover-color` | **Not defined in `:root`, `.lightTheme` or `.darkTheme` — all three read end to end.** `.textAreaBtns:hover{color:var(--textarea-holder-btns-hover-color)!important}` therefore resolves to nothing and **the icon hover colour does nothing at all.** Its non-hover twin `--textarea-holder-btns-color:#bbb` IS defined, which is what makes this a slip rather than a convention |

⚠️ **R-D2's scope is stated precisely and not overreached**: the property is absent from the three
blocks where this stylesheet declares custom properties, each read in full. It is not asserted absent
from all 444 KB.

**The theme mechanism, for the record:** `:root` holds `--lightTheme-*` and `--darkTheme-*` pairs,
and `.lightTheme` / `.darkTheme` map them onto the twenty unprefixed names the components actually
read (`--msg-bg`, `--textarea-bg`, `--chat-bg`, `--roster-bg`, `--username-color`, …). Every
`--*Theme-*` value carries `!important`. A component reading `--msg-bg` with no theme class on an
ancestor gets nothing.

## §19.2 — Q-1 audited: what our implementation already gets right

`lib/components/ModalHost.svelte:4781-4939` (`<app-alert-qa-modal>`) and its handlers at
`:1751-1769`, plus `routes/alert-questions.remote.ts` (138 lines), all read in full.

**The implementation is substantially faithful, and three of the reference's own defects are already
reproduced deliberately:**

- ✅ `placeholder={isPresenter ? 'Type your answer here...' : 'Type your question here...'}` —
  **§18.1's headline was already correct here.** The role switch is implemented.
- ✅ `clas` (not `class`) reproduced at `:4800` via a spread, with the double space intact — Q-D1.
- ✅ `alt="qaMsg.avt"` reproduced literally at `:4808` — Q-D2.
- ✅ `secure.gravatar.com/avatar/?d=mm&s=50`, `"There are no questions."`, `#textAreaHolder`,
  `textSendDiv flex-fill`, the textarea's full attribute set, both `textAreaBtns` spans and their
  `ngbtooltip`/`placement` attributes, `admin-alert mt-2`, `created-at mr-2`, `username mx-1`,
  `msg-left text-formated preText ml-2 mr-2 p-0` — all match the const table by value.
- ✅ **Q-D4 deliberately NOT reproduced.** The reference throws on a null `qaMsg` because `&&` binds
  tighter than `||`; ours uses `targetMessage?.` throughout. **Correct call** — reproducing a crash
  is not fidelity — and it is now recorded as a decision rather than an accident.
- ✅ The avatar carries `loading="lazy" width="50" height="50"`; the reference has none. Repo CLS
  rule, kept.
- ✅ The back end is stronger than the reference's: one transaction, counts DERIVED from rows rather
  than incremented, a room-scoped alert lookup that closed a cross-tenant write on 2026-08-14, its
  own `'question'` rate-limit bucket, and a `MAX_QUESTION_BODY` bound the reference does not have.

## §19.3 — ❌ A FALSE COMMENT in our source, and it is load-bearing

`ModalHost.svelte:1760`:

> `// The captured textarea had no handler at all, so pressing Enter did nothing.`

**This is false.** Const 17 is
`["name","txt-area","id","textAreaQATxt",…,3,"keyup","paste","placeholder"]` and the template binds

```js
x("keyup", function(a){ return E(o.onKey(a)) })("paste", function(a){ return E(o.onImagePaste(a)) })
```

The captured textarea has **two** handlers. `onKey` sends on Enter (§18.4). The comment states the
opposite of the evidence, and it is the stated justification for our keyboard behaviour — so the
next engineer reading it would believe our divergence is free when it is not.

`:1759` is wrong in a second way: it says *"Shift+Enter is ignored"* while the code two lines below
falls through on `event.shiftKey`, which inserts a newline. Comment and code disagree.

**The actual comparison:**

| key | reference | ours |
|---|---|---|
| Enter | send | send ✅ |
| **Shift+Enter** | **no-op** — `i.val(i.val())` sets the value to itself (Q-D3) | **newline** |
| Alt+Enter | newline | newline ✅ |
| binding | `(keyup)` + `preventDefault()` | `onkeydown` + `preventDefault()` |

Ours is the better behaviour on both rows — `preventDefault()` on `keyup` cannot stop a character
being typed, so the reference's own guard is ineffective. **Keep the behaviour, replace the
justification with the evidence.**

## §19.4 — ❌ Divergences and gaps that the implementation needs

| # | ours | reference | evidence |
|---|---|---|---|
| QA-1 | image button gated on `isPresenter` | `canPostImages = isPresenter \|\| sessData.userUploads` | `ngOnInit`. **The comment at `:4918-4920` cites `O(23, o.canPostImages ? 23 : -1)` correctly but the `userUploads` term is missing from the code** — a room with `userUploads` on lets members attach images and ours does not |
| QA-2 | no `paste` handler | `(paste)="onImagePaste($event)"` — clipboard image → `bootbox.confirm` preview `max-width:100%;max-height:50vh` + `#msg-text-qa` textarea prefilled with the current draft | const 17 |
| QA-3 | `bodyStyle="max-height: 70vh"`, static | `autoExpand` shrinks the body as the textarea grows: `calc(70vh - {height} + 37px)`, ceiling `scrollHeight>300`, empty reset `23px` / `70vh` | §18.4 |
| QA-4 | alert body rendered as TEXT | bound as `innerHTML` through `parseSymbols(txt,"chat",avt,null)` then `parseLinks(…, preferences.chatGif, _id, false)` | `Xxe`/`Jxe` |
| QA-5 | no trade-copy | `sessData.copyTrades` picks const 33 (with `(click)`) over 32; `copyTradeOnClick` fires only for `SPAN.tradeColor#id_{_id}` → `navigator.clipboard.writeText` + `bootbox.alert("Order copied to clipboard.")` | `Zxe`, `copyTradeOnClick` |
| QA-6 | always `RoomMessage` | `displayMode` `"r"` → `<app-st-message>`, else `<app-st-compactmessage>`; sourced from `sessData.altChatRender ? "c" : getPreference("alertsMode")` | `a3e`, `loadAlertsMode` |
| QA-7 | `rootClass="fade modal"` | `Rh("modal fade ", o.qaMsg._id, "")` — the alert id is written on as a CLASS, and `$(\`.${_id}\`)` is what binds the `hidden.bs.modal` unread-clear | template update block |
| QA-8 | no image-upload flow in this modal | `imgUpload()` bootbox (`title:"Image Upload"`, `size:"xl"`, one `btn-success` "Upload", `#fupload` multiple, `#filedrag` "or drop files here", `#msg-text-qa-upload` placeholder "Enter your message"), then upload → `sendAlertQAReply` → **modal hides** | §18.6 |
| QA-9 | no `scrollToBottomQA` | `setTimeout(… scrollTop = scrollHeight, 500)` on open, on every payload, and after each send | class body |
| QA-10 | mention targets the chat composer | `doQAMention` appends `@{name} ` to `#textAreaQATxt`, with a leading space when non-empty | `ngOnInit` |

**Not needed, and recorded so nobody adds them:** Q-D6 (the `_c.splice(0,o-1)` off-by-one) only
exists inside the reference's multi-file loop, which QA-8 would have to introduce first; Q-D5 (the
popover-arrow rules that cannot match because `container="body"` moves the popover out of scope) is
a reference bug with no counterpart in our Svelte scoping.

## §19.5 — Gap ledger

| item | status |
|---|---|
| `app-session-login` | 0 evidence gaps · 6 defects · 18 divergences · 11 unbuilt |
| Q-1 `app-alert-qa-modal` | **evidence 0** · 6 defects · **1 false comment** · 10 implementation items |
| R-1 `:root` | **CLOSED** — 4 values recovered, 2 new defects (R-D1, R-D2) |
| `app-muted-users-modal` | complete (§18.8) |

**Everything above is now measured against our own code**, which is the scope the owner set. The
remaining reference dumps (`account-page`, `mising`, `must-match`, `gap-dump`, the `.less` sources)
are **not** claimed as gaps until a surface in `apps/room/src` needs them — that is the standard this
section applies, and applying it is what turned an open-ended pile into a bounded list.

