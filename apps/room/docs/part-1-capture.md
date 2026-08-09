# Part 1 capture contract

Source: `proroom-ULTIMATE-staff-2026-07-24T12-42-02-part1.json`

This document records only facts exposed by the supplied capture. It is a provenance boundary:
future parts may add missing behavior or data, but implementation work must not infer it here.

## Capture shape

- Part: `1`
- Capture states: `58`
- Baseline viewport: `1842 × 1265`
- Device pixel ratio: `2`
- Baseline room theme class: `lightTheme`
- Alternate full-room theme states: `darkTheme`, `lightTheme`
- Baseline full DOM: `1,052` nodes, not truncated
- Dark-theme full DOM: `6,642` nodes, not truncated

The source JSON is intentionally excluded from formatting because it is a 72 MB single-line
evidence artifact.

## Baseline geometry

| Region                  | Captured measurement |
| ----------------------- | -------------------: |
| Global header           |           49 px high |
| Sidebar                 |          250 px wide |
| Alert/chat column       |        556.5 px wide |
| Vertical split gutter   |           11 px wide |
| Presentation column     |       1024.5 px wide |
| Alerts panel            |        483.6 px high |
| Horizontal split gutter |           11 px high |
| Chat panel              |        721.4 px high |
| Alerts/chat headers     |           48 px high |
| Composer holder         |           45 px high |

The widths total exactly `1842` pixels. The panel heights plus the top header total exactly `1265`
pixels.

## Visible baseline content

- Header: one-user indicator, ProTradingRoom logo, `( No one is speaking )`, volume, reconnect.
- Sidebar: Powered by link, `v4.0.1-b422b517`, reconnecting-media state, connectivity, general
  settings, muted users, followed users, one-person roster. The capture forced this subtree open;
  the runtime intentionally starts it closed because the user explicitly required hamburger-only
  opening.
- User: `Billy Ribeiro`, `Offline`.
- Alerts: empty captured room scroller.
- Chat: `Main Chat`, `Off Topic`, empty captured room scroller, empty composer.
- Presentation: `Screens`, `Notes`, `Files`.
- Files: `Files`, `Images`, `Sounds`, three zero badges, search, refresh, empty list.

## Direct follow-up node evidence

The user supplied additional current-room DOM fragments after the original Part 1 capture. These
fragments are treated as higher-priority evidence for the corresponding presentation nodes:

- `Notes` is the startup-active main tab. Its special border, padding, background, overlap, and
  z-index styling is scoped to `.presAreaTabs-notes.active`.
- `VideoPlayer` is a main tab targeting `#videoplayer`. Clicking or keyboard-activating it selects
  that pane and clears the active state from the other main tabs.
- The empty VideoPlayer pane is `tab-pane position-relative h-100` and contains only `No videos.`,
  the `Video url...` input, `#addon-video-url`, and the `fas fa-plus-circle px-2` icon.
- The main Files tab contains the folder label, `#dropdownMenuFiles`, its cog, and one evidenced
  dropdown action: `Upload File`.
- The empty Files toolbar contains Search, Delete Selected, Refresh, and Upload File in the
  supplied order.
- The user then supplied the click-created File Upload Bootbox DOM and a direct screenshot.
  Both Upload File entry points open a `.bootbox.modal.fade.show` with
  `.modal-dialog.modal-xl`, the Darkly modal content, hidden multi-file `#fupload`, centered
  three-times upload icon, visible `#filedrag` drop area, empty `#fileList`, close control, and
  success-colored Upload button. The supplied screenshot is `1138 × 601` pixels and confirms that
  the close control receives focus when the dialog opens. No upload transport or selected-file
  result state was supplied, so neither is synthesized.

No post-add VideoPlayer state, video-card structure, URL validation behavior, file-selection
state, delete confirmation, or upload transport was supplied. Those transitions are not
synthesized.

## Captured interaction states

### Settings and authoring

- General settings: App Settings, Alert Settings, Chat Settings.
- Audio/video settings: user settings, video enabled/disabled, captured speaker selection.
- Alert authoring: Text Alert, Text Url, Image / GIF / Video.
- Rich text editor.
- YouTube-for-all dialog.

### Logs and operational dialogs

- Debug log.
- Chat logs, empty.
- Alert logs, empty.
- Session control.
- Alert sent report, loading.
- All private messages, loading.
- Advanced alert search.
- Alert filter.
- Scheduled alerts, empty table.
- WebRTC connectivity/mic troubleshooter.

### User dialogs

- User actions.
- Mention/reply.
- Q&A, empty.
- Muted users, empty.
- Followed users, empty.
- Mobile application credentials.

### Root component inventory

The user supplied the rendered root host inventory after the original capture. It contains 26 host
occurrences in an exact order and 25 unique selectors. `app-followed-users-modal` occurs twice;
the duplicate is preserved rather than normalized away. All 26 occurrences are present in the
Svelte SSR in the same order, including closed hosts, `app-screenshare-preview`, `app-rec-preview`,
`app-rich-text-editor`, and `app-privchat`.

The deployed `main.d6d3c112b59b7d0d.js` bundle has now been recovered. It contains exactly one
compiled definition for each of the 51 `app-*` selectors found in that build. The 25 unique root
selectors in the supplied screenshot all resolve to compiled definitions. The root inventory audit
also maps the 21 non-empty forced-open modal/preview artifacts supplied in `app-modals/`; four host
artifacts are empty because their captured hosts had no rendered children in that state.

### Popovers and menus

- Roster sort: `Sort by Trials`.
- User menu: `User Info`, `Mention / Reply`.
- Volume / Do Not Disturb.
- Emoji popover with nine captured category labels.
- Across all 27,785 captured node occurrences there are zero toast, toastr, or snackbar nodes. The
  recovered global stylesheet contains the library’s toast selectors, but this part supplies no
  toast content, severity, timing, or trigger. No synthetic toast is added.

### Composer

- Capture 55 isolates the complete composer as exactly seven elements: `#textAreaHolder`, two flex
  wrappers, `#textAreaTxt`, `.textAreaBtnsCol`, `.textAreaBtns`, and `i.far.fa-smile`.
- The holder is `45px` high with `5px` margin, `5px` padding, `8px` corner radii, no border,
  no shadow, static positioning, and default `flex: 0 1 auto`.
- The textarea is `35px` high with no border, no radius, no outline, and no box shadow. The
  implementation explicitly suppresses both loaded Bootstrap focus-ring variants so focus cannot
  introduce an uncaptured blue wrapper. The decoded chat-component stylesheet proves the focused
  declaration as `border-color: var(--darker-gray)` and
  `box-shadow: 1px 1px 1px var(--darker-gray)`. Because the captured textarea also carries
  Bootstrap's `border-0` class, the visible active state is the source-proven shadow line beneath
  the message field rather than a surrounding border.
- The open picker is a body-level `ngb-popover-window` overlay at `z-index: 1070`; it is positioned
  from the captured 25.5px emoji trigger and is not nested inside the clipped chat panel.
- Its captured 324px emoji grid remains fixed. Browsers with non-overlay scrollbars receive only
  their measured scrollbar-gutter width on the picker chrome, preventing the directly observed
  horizontal overflow without changing the dump-derived grid or sprite coordinates.
- The user-supplied correct picker screenshot is `353 × 425` pixels; the broken comparison is
  `339 × 425` pixels. The measured 14px outer-width loss is recorded as the native-scrollbar
  regression. The selected skin-tone control remains the captured `12 × 12` pixels rather than
  inheriting 12px padding on every side.

### `app-st-message`

The deployed component was isolated from the main bundle and formatted as
`docs/source/app-st-message.compiled.js`; its exact component stylesheet is preserved separately.
The supplied populated room contains 18 rendered instances: eight alerts and ten chat messages.
The decoded runtime conditions establish that:

- `msg.isA` controls the administrator/right-side chat template and `.msg-box-adm`; sender account
  role does not.
- `msg.bkgColor` supplies the message background and the inverted username/menu/date style;
  `msg.fontColor` supplies body and separator text color.
- `.questionColor` is selected when `msg.txt.includes("?")`, unless followed-user colors override
  it. It is not a stored database classification.
- Public Reply is available only for chat, only for a different sender, and only when the viewer is
  a presenter or the session enables public user replies.
- Delete, Mute, Show to All, Alert Send Report, Reply, Mark Answered, Copy, and Private Chat each
  have distinct compiled permission branches. Mute is excluded for `msg.isA`; Copy is unconditional
  for alerts.
- Alert Q&A count is `msg.qa.length`, the checkmark is `msg.ans`, and unread Q&A adds
  `btn-danger animated flash`.
- image links are sanitized into `.img-container > img.uploaded-img`; their normal click, modified
  click, Bootbox image modal, and download filename cleanup are defined by the deployed index.
- stock parsing uses `\s*\$[A-Za-z_?]+\b`, preserving matched whitespace inside `.stockColor`.

The Drizzle model consequently stores only evidenced payload state (`is_admin`,
`background_color`, and `font_color`). Question coloring and Reply visibility are derived at
render time rather than persisted as invented flags.

## Styling provenance

The capture exposes Bootstrap variables, the Darkly palette, and application-specific variables.
The implementation loads:

1. the deployed `styles.d622cb9ed2bbc221.css` bundle preserved under `docs/source/`;
2. the deployed Font Awesome `5.8.1` and Animate.css `3.7.2` versions;
3. `src/lib/styles/tokens.css`, transcribed from the capture;
4. dump-derived room/component CSS that consumes those tokens.

`tokens.css` is the color and geometry SSOT. `src/lib/dump-contract.ts` holds non-CSS captured
facts used by runtime controls and tests.

The retrieved stylesheet is 444,545 bytes with SHA-256
`0f9482210ab4e57898b2a11979dcd37c299d9f4e05e4f8910c6115e46a6a8ffa`. Its referenced jQuery UI
sprites and Summernote fonts are vendored with the runtime copy. The exact Google Play and iOS
store badge files referenced by the captured modal are also preserved under `static/assets/images`.

## Exhaustive verification artifacts

- `docs/generated/part-1-forensic-audit.json` verifies all 58 captures, all 27,785 captured node
  occurrences, 318 deterministic 100-node chunks, and the source dump SHA-256
  `dd1b773cf505ad291886bad1fb04180004ee8feb5bbfc5f0a9e1078c4fd97225`.
- `docs/generated/runtime-vs-capture-0.json` records every exact baseline semantic signature match
  and every remaining raw difference.
- `docs/generated/runtime-vs-capture-states.json` resolves a runtime subtree for all 58 captured
  states. Forty-eight have the exact captured node count. The ten raw count exceptions are the
  baseline and empty-message states now containing the connected user's persisted chat message,
  the four original main-tab subtrees now extended by the directly supplied VideoPlayer and Files
  nodes, the two audio/video toggled states whose bandwidth label is conditional, and the two
  full-theme captures that combine the open emoji tree, an open modal, backdrop, and theme state.
- That state report keeps every raw mismatch and now attaches an evidence category to each
  non-exact capture: source-runtime shell, persisted connected data, dynamic connected identity,
  closed-by-default modal/dropdown/sidebar/popover state, captured non-default tab/control state,
  client-hydrated literal attributes, directly supplied follow-up DOM, or composite theme state.
  Zero non-exact captures are left without a recorded evidence classification.
- The two open emoji captures are independently rendered and match exactly: `5,588 / 5,588` nodes
  for the popover and `5,585 / 5,585` for its `emoji-mart` subtree, including attributes and direct
  text.
- `docs/generated/part-1-style-coverage.json` audits all 384 captured class tokens, 179 IDs, 7,525
  inline-style occurrences, and 95 computed-style properties against the loaded stylesheets. It
  finds direct selector evidence for 357 classes and classifies the remaining 27 by their actual
  owning selector or library/state role, leaving zero unclassified class tokens. All 290 captured
  CSS custom properties are defined and resolve to the captured values.
- `docs/generated/part-1-behavior-coverage.json` inventories all 23 captured modal-root
  occurrences (22 unique IDs; the dump contains `followedUsersModal` twice) and the captured tab
  families against the Svelte state activations. All 23 modal-root occurrences are rendered. Every
  modal target that is explicitly exposed by a captured `data-bs-target`/`href` attribute is wired;
  modal bodies that were only force-opened by the capture remain classified as having no supplied
  trigger evidence rather than receiving invented navigation.
- `docs/generated/production-component-evidence.json` indexes all 51 compiled `app-*` selectors
  from the deployed main bundle. For the user-supplied root screenshot it verifies all 25 unique
  selectors have compiled evidence and that all 26 host occurrences are rendered in exact order;
  the audit currently has zero failures.
- `docs/generated/direct-file-upload-dom.json` independently renders the user-supplied File
  Upload state and checks its 19-element tree, attributes, literal inline styles, and direct text
  against the supplied fragment. It preserves the one standards-equivalent SSR difference
  (`multiple=""`) and separately verifies the hydrated browser literal (`multiple="true"`) applied
  by the attachment.

## Intentionally unresolved

The original JSON dump alone does not provide:

- video or other media payloads not embedded in or referenced by the supplied evidence;
- actual server APIs, WebRTC signaling, upload transports, alert delivery, or authentication;
- data not present in the captured empty states;
- responsive viewport captures.

The supplied JSON itself does not contain stylesheet or original TypeScript source. The deployed
stylesheet, index, runtime, polyfills, global scripts, and compiled main bundle were recovered from
the exact asset names exposed by the supplied DOM on 2026-07-30 and are kept immutable with their
checksums. Compiled client-side handlers are now usable as behavior evidence; unavailable server
implementations are not fabricated.

Those areas remain empty, inert, or locally modeled until a later supplied file provides evidence.
No placeholder users, messages, alerts, files, notes, streams, or scheduled items are synthesized.
