# NEXT-STEP/gaps — full-read log
Method: render every node (tag, all attrs, HIDDEN/INVIS/NOTRENDERED flags, rect, text)
via /tmp/render-state.js, then Read the render start-to-finish. Not grep, not sampling.

## Files read
1. state-tab_Users.json                       — 1632 nodes / 863 text
2. state-settings_dont-touch-revealed.json    — 1632 nodes / 863 text
3. state-baseline.json                        — 1632 nodes / 863 text
4. state-dropdown_0_User_List_Actions.json    — 1632 nodes, ALL READ (full render, 1635 lines)
5. state-dropdown_1_Actions_With_Selected.json — 1632 nodes. 65 lines differ from the
   fully-read dd0 render (1,2,139-169,176,180-212); ALL 65 read directly. Rest byte-identical
   to lines already read line-by-line in file 4.

## Method for remaining state captures
Render full → compute the set of lines NOT byte-identical to an already-fully-read render →
READ every one of those lines. No line is skipped: each is either read here or was read
verbatim in an earlier file. This is de-duplication of identical text, not sampling.

## Findings so far
- User List Actions menu (dd0 [138], @1748,407 200.5x252.1): loadUsersFT, loadBannedUsers,
  loadMobileUsers, loadNonMobileUsers, loadPresentersUsers, loadMarketplaceUsers, divider,
  clearUserList, removeUsersFT, removeBadgesForUsers.
- Actions With Selected menu (dd1 [176], @37,450.6 238.7x257.7): updateManyUsers(10) Remove All,
  (2) UNBAN, (1) Make Presenter, (5) Make Admin (Non-Presenter), (2) Make Participant,
  (6) Make TRIAL, (3) MUTE, (4) BAN, updateManyUsersBadgePrompt('add'|'remove').
  NOTE: code 2 is used for BOTH "UNBAN Participant" and "Make Participant".
- Room settings corroborating already-built work: beepOnUserJoin + userJoinAndLeavePopup
  (join/leave gates), tawkPresenterSupport (tawk-support.ts), showArchivesToUsers +
  showArchivesToSpecificPresenters (archivesAvailableTo), individualVolumeControls
  ("Individual volume controls for each Presenter" — item U), isChatOnlyRoom, hideChatAlerts.
- "DON'T [TOUCH] These below..." h3: the word TOUCH is a span with
  ng-click="donttouchShow=!donttouchShow" — the reveal toggle.
- No PII: all credential fields read "empty"; only emails are jane@/john@example.com in help
  text; key-shaped string 5081b73a690762e2526bc1fef3c46eedf1ec8832 appears only inside two
  help labels as an example.
6. state-modal_permissions.json  — 1633 nodes (extra node = modal-backdrop fade in). 55 novel
   lines all read. Modal: `modal fade in` + style display:block !important; dialog 600x328.711
   @694.5,30 (exactly centred: (1989-600)/2=694.5). Checkboxes in DOM order: hasMic, hasScreen,
   hasCam, hasAdminChat, canEditNotes. Username binding [1588] renders 0px wide (no user loaded).
   Footer: Close (data-dismiss) + Save Changes (ng-click="saveUserPermissions()").
7. state-tab_Branding_Logo_Landing_Page_.json — 146 novel lines all read. Logo img 203.75x25
   inside a #000 box w/ 15px padding; Upload/Change + Reset. textAngular editor EMPTY
   (Words:0 Characters:0, body is <p><br></p>). Panel 1989x871.109.
8. state-tab_SSO_Setup.json — 21 novel lines all read. Tab li rendered @318.914 w=103.766,
   pushing User Stats->422.68 and Settings->522.273 (arithmetic checks). Tab has exactly ONE
   field: "SSO Host" (sess.ssoHost, empty). Panel 1989x393 — shortest of all captures.
9. state-tab_Text_List.json — 21 novel lines all read. Tab li @86.289 w=85.859 pushes
   Branding->172.148, User Stats->404.773, Settings->504.367 (arithmetic checks).
   CONTENT: "Save List" btn (ng-click=saveTextList, pull-right 99.195x34) + textarea#textListTxt
   rows=40 @37,395 1915x806, EMPTY. => "Save List" belongs to the TEXT LIST tab, NOT to the
   Users table. Corrects a possible misread of the earlier text-only pass.
10. state-tab_User_Stats.json — 44 novel lines all read. statsDate 07-31-2026 / statsDateEnd
   08-01-2026; Load Stats / Export / "Monthly report for date range"; search + 4 checkboxes
   (filterOnline, filterFT+"Free Trials" badge, showMobileStat, remDupes);
   "No results to show. Select a date above..." — stats table empty, no PII.
11. state-tab_Settings.json — 934 novel lines all read. app-container 1989x11301.398.
    Layout constants: label col-sm-2 @x=37 w=319.164; value/editable @x=356.164; help label
    @x=356.164; row height 34 (no help) / 59 (help); rows abut exactly, no gap.
    Value widths: "Yes!" 25.664, "No" 18.148, "empty" 38.898, "0" 7.789, "5" 7.789, "7" 11.68,
    "14" 19.461, "Tip Me?" 50.836, "512000" 46.711, "/talk" 26.969.
    QUIRK: help labels for "Pair OK Redirect" and "Pair ERROR Redirect" render at x=37 (not
    356.164) and at y BELOW their parent <p> (3338.5 vs p ending 3337) — they overflow.
    QUIRK: the "Configure Chat Tabs" gear <i class="fa fa-gear ms-2 cursor-pointer"> renders at
    x=52, inside the label column, not beside the value.
    h3 "DON'T [TOUCH] These below..." @37,11187; the TOUCH span @117.477,11185.5 84.461x28.5
    is inline inside the h3 and carries ng-click="donttouchShow=!donttouchShow".
1(re). state-baseline.json / 2(re). state-tab_Users.json — re-read with the FULL node render
    (the earlier pass had read text nodes only). Positional comparison: baseline and tab_Users
    are byte-identical to each other except line 1 (label); each differs from dd0 only in the
    User List Actions region (139,142-169) and from dd1 only in the Actions-With-Selected region
    (176,180-212). Both = Users tab, BOTH dropdowns closed. Every line read via files 4 and 5.
12. state-settings_dont-touch-revealed.json — 1150 novel lines all read.
    app-container 1989x14212.398 (tallest capture).
    FINDING: node [125] (Users pane) @37,361 AND node [379] (Settings pane) @37,580 are BOTH
    class="tab-pane ng-scope active" and both rendered. Two panes active simultaneously; that is
    what pushes all Settings rows down by exactly 219px (199px Users pane + 20px) vs tab_Settings.
    FINDING: <p ng-hide="donttouchShow">Settings...</p> @37,11442.398 renders WITH NO hidden flag
    at the same time as <div class="form-vertical" ng-show="donttouchShow"> @37,11472.398
    1915x2692. Both the teaser and the revealed panel are visible in this capture. Recorded as
    observed; no cause asserted.
    Revealed DON'T TOUCH section contents (all read): useV3=Yes!, useV5=No, clusterID/
    backupClusterID/superClusterID all empty, superClusterExpectedServerCount=0,
    swapCLusterIDs(), applyToAllSessions(), useFFmpegRecording, useLessBusyVsRoundRobin,
    useMediaMTX + mediaMTX cluster IDs, media_max_bitrate=512000, media_fir_rate=5,
    hasYTStreaming, media_relays (+ hidden showAdServer add/remove server block),
    isLocked, chatServerURL=/talk, force_jpeg_screenshare, force_mp3_audio,
    node_media_relays, node_ws_media_relays, altCodeVendorJS/AppJS/customJanus/alt_roomjs,
    modAlertFilterList, customCSS, darkThemeStyle, hideLogo, hidePoweredBy,
    linkedRoom* (alerts/swing/daytrade/recordings) + linkedStreamsAPIKey,
    ptrMobileAppEnabled, freeTrialsGetApp, customMobileApp*, hideMobileCredentials,
    ptrMobileAppCaseByCaseEnabled, nqNewsFeedURL, generateRandomUDPPort, streamingThreads.
    All credential-shaped fields read "empty". No PII.

ALL 12 state-*.json CAPTURES READ.

## rects-*.json (11 files) — computed-style captures
Shape: array of elements {tag, cls, text, rect, style(69 props)}.
Element counts: baseline 124, tab_Users 124, and up to 1265 (settings_dont-touch-revealed),
1017 (tab_Settings). TOTAL 3483 elements across the 11 files.
Distinct computed-style strings: 428. Distinct identity+rect+text lines: 2445.
Distinct (property,value) pairs across ALL 11 files: 778, in 69 property lines — ALL READ.

### THE COMPLETE DESIGN VOCABULARY (read from docs/reference/rects-vocab.txt, every value)
font-family: ONLY 2 in the entire capture —
  "Helvetica Neue", Helvetica, Arial, sans-serif   and   FontAwesome
  => no custom webfont anywhere on this page.
font-size (10): 0, 11, 12, 13, 14, 16, 18, 21, 24, 28px
font-weight (3): 400, 500, 700          font-style: normal | italic
line-height (16): 0,11,12,13,14,15.7143,16,18,18.5714,20,21,22.8571,25.7143,26.4,50px,normal
color (9): rgb(0,0,0) rgb(10,10,10) rgb(51,51,51) rgb(85,85,85) rgb(119,119,119)
           rgb(128,128,128) rgb(250,250,250) rgb(255,255,255) rgb(51,122,183)
background-color (15): rgba(0,0,0,0) rgb(0,0,0) rgb(119,119,119) rgb(217,83,79)
  rgb(229,229,229) rgb(230,230,230) rgb(238,238,238) rgb(239,239,239) rgb(240,173,78)
  rgb(245,245,245) rgb(255,255,255) rgb(40,96,144) rgb(51,122,183) rgb(91,192,222) rgb(92,184,92)
background-image: **none** on every one of the 3483 elements — no gradients, no sprites.
box-shadow (6): none | rgb(0,0,0) 0 0 0 0 | rgba(0,0,0,0.05) 0 1px 1px 0 |
  rgba(0,0,0,0.176) 0 6px 12px 0 | rgba(0,0,0,0.2) 2px 2px 3px 0 | rgba(0,0,0,0.5) 0 5px 15px 0
border radius (6): 0, 2, 3, 4, 6, 10px      border-style: none|solid|dashed|inset
border widths: 0,1,4,10,11px
text-shadow (2): none | rgb(255,255,255) 0px 1px 0px
z-index (7): auto,1,2,1000(dropdown),1040(modal-backdrop),1050(modal),2000000000(recaptcha)
opacity (6): 0, 0.05, 0.2, 0.5, 0.65, 1
transition (5): all | border-color .15s ease-in-out, box-shadow .15s ease-in-out |
  opacity .15s linear | transform .3s ease-out | visibility 0s linear .3s, opacity .3s linear
cursor (5): auto default not-allowed pointer text
display (9): block inline inline-block list-item table table-cell table-header-group
             table-row table-row-group
letter-spacing: normal (only value). text-decoration-line: none (only). text-transform: none (only).
flex-direction/justify-content/align-items/gap: row/normal/normal/normal only => NO flexbox layout.

### COMPONENT TOKENS read element-by-element from rects-baseline (124 elements)
.navbar.topnavbar       background rgb(0,0,0); min-height 50px
.navbar-brand           color rgb(250,250,250); 18px/50px; margin 0 15px; padding 0 5px
.brand-logo img         max-width 200px; rendered 199.992x24.539
topnav a.icon           color rgb(255,255,255); FontAwesome; padding 15px; .fa-2x => 28px
.panel.panel-default    bg #fff; border 1px solid rgb(221,221,221); radius 4px;
                        box-shadow rgba(0,0,0,0.05) 0 1px 1px 0; margin-bottom 20px
.panel-heading          bg rgb(245,245,245); border-bottom 1px solid rgb(221,221,221);
                        radius 3px 3px 0 0; padding 10px 15px
.panel-title            16px / 22.8571px
.panel-body             padding 15px
.text-muted             color rgb(119,119,119)
.control-label          font-weight 700; padding 0 15px; margin-bottom 5px; cursor default;
                        min-height 1px; max-width 100%
.form-control-static    min-height 34px; padding 7px 0
.editable.editable-click color rgb(10,10,10); border-bottom 1px solid rgb(66,139,202); pointer
.form-control           bg rgb(238,238,238); border 1px solid rgb(219,217,217); radius 4px;
                        padding 6px 18px; color rgb(85,85,85);
                        transition border-color .15s ease-in-out, box-shadow .15s ease-in-out
.input-group            display:table; .input-group-btn display:table-cell, font-size 0, line-height 0
.btn                    padding 6px 12px; text-align center; white-space nowrap;
                        vertical-align middle; user-select none; touch-action manipulation
.btn-info               bg rgb(91,192,222); border rgb(70,184,218); color #fff
.btn-warning            bg rgb(240,173,78); border rgb(238,162,54); color #fff
.btn-sm                 padding 5px 10px; font-size 12px; line-height 18px; radius 3px
.btn-link.btn-warning   transparent bg; color rgb(51,122,183)

### rects-*.json COMPLETION PROOF
- All 2445 distinct identity+rect+text lines: verified 0 of them are absent from the state
  renders I read line-by-line (checked by tag+rect+text key). So every element identity was read.
- All 778 distinct (property,value) pairs: read in the 69-line vocabulary table,
  `docs/reference/rects-vocab.txt`.
- All 182 distinct (tag+class -> non-geometry computed style) bindings: read in the
  368-line delta table, `docs/reference/rects-deltas.txt`, against a stated page default.
=> ALL 11 rects-*.json FILES READ.

#### The two derived tables are IN THE REPOSITORY, and why that matters (2026-08-13 14:15 EDT)

Both tables lived in `/tmp` until today, which meant this proof was one reboot away from being an
unverifiable assertion — the exact shape of claim PR #12 was opened to revert. They are now committed
verbatim, byte for byte, with no header added so their digests stay meaningful:

    rects-vocab.txt    69 lines   6a241dcaa97cb43f…
    rects-deltas.txt  368 lines   87364da557266184…

Every count above reconciles against the files as committed: the vocabulary table is exactly 69
property lines, and the delta table is 4 header lines plus 182 bindings at 2 lines each = 368.

#### What this proof DOES and DOES NOT cover — read this before relying on it

It is a DEDUPLICATION argument, not a line-by-line pass over 3,483 element records. Its force comes
from the keys: every distinct element identity (tag+rect+text), every distinct (property,value) pair,
and every distinct (tag+class -> computed style) binding was read.

That is sound for the design vocabulary and the style bindings, and it is a far stronger claim than
"read one file and infer the rest". But the keys decide what "distinct" means, and two things fall
outside them:

- **Element ORDER**, and **parent/child nesting**. Two elements identical in tag, class, rect and text
  collapse to one row, so the tables say nothing about the sequence they appear in or what contains
  what.
- Anything varying ONLY in a dimension not in a key.

So: the rects captures are fully read for what they are usually consulted for — colours, spacing,
fonts, component tokens. Document STRUCTURE is not established by these tables, and where structure
matters the source templates under `TIER1-fetched/views/` are the evidence, not these.

More component tokens (from the delta table):
.modal-content   padding 20px; border 1px solid rgba(0,0,0,0.2); radius 6px;
                 box-shadow rgba(0,0,0,0.5) 0 5px 15px; outline-width 0
.modal-backdrop  position fixed; bg rgb(0,0,0); opacity 0.5; z-index 1040
.modal           z-index 1050; transition opacity .15s linear
.modal-dialog    margin 30px 694.5px; transition transform .3s ease-out
.modal-header    padding 15px; border-bottom 1px rgb(229,229,229)
.modal-footer    padding 15px; border-top 1px solid rgb(229,229,229); text-align right
.modal-title     18px/25.7143px weight 500
button.close     float right; margin-top -2px; opacity 0.2; 21px/21px weight 700;
                 text-shadow rgb(255,255,255) 0 1px 0
.dropdown-menu   position absolute; margin-top 2px; padding 5px 0; border 1px solid
                 rgba(0,0,0,0.15); radius 2px; bg #fff; box-shadow rgba(0,0,0,0.176) 0 6px 12px;
                 13px/18.5714px; text-align left; z-index 1000
.dropdown-menu li a  padding 3px 20px; 13px/18.5714px; clear both; white-space nowrap
li.divider       margin 9px 0; bg rgb(229,229,229); overflow hidden
.caret           border-width 4px; border-top-style dashed; border-top-color rgb(255,255,255);
                 left/right border rgba(0,0,0,0); vertical-align middle
.nav-tabs        border-bottom 1px solid rgb(221,221,221)
.nav-tabs li     float left; margin-bottom -1px
.nav-tabs li a   margin-right 2px; padding 10px 15px; border 1px solid; radius 4px 4px 0 0
  ACTIVE:  border rgb(221,221,221) + border-bottom rgba(0,0,0,0); bg #fff;
           color rgb(85,85,85); cursor default
  INACTIVE: border rgba(0,0,0,0) all round; color rgb(51,122,183); cursor pointer
.tab-content     padding 10px 20px; border 1px solid rgb(230,233,238) on right/bottom/left
.table.table-striped  border-collapse collapse; max-width 100%; margin-bottom 20px
th               padding 20px 8px; border-bottom 1px solid rgb(221,221,221); weight 700;
                 text-align left; vertical-align bottom
.badge.badge-danger   padding 3px 7px; radius 10px; bg rgb(119,119,119); color #fff;
                 12px/12px weight 700  <-- NOTE: "danger" badge is GREY rgb(119,119,119), not red
.btn-primary     bg rgb(51,122,183) border rgb(46,109,164);  ACTIVE/open dropdown-toggle:
                 bg rgb(40,96,144) border rgb(32,77,116)
.btn-danger      bg rgb(217,83,79) border rgb(212,63,58)
.btn-success     bg rgb(92,184,92) border rgb(76,174,76)
.btn-default     bg #fff border rgb(230,233,238)
.btn-assertive   bg rgb(239,239,239) border rgba(0,0,0,0)
disabled toolbar btn  opacity 0.65; cursor not-allowed; 11px/15.7143px; padding 10px
hr               margin 20px 0; border-top 1px solid rgb(238,238,238); box-sizing content-box
fieldset         margin-bottom 20px; padding-bottom 20px (variant: + border-bottom 1px rgb(238,238,238))
h3               20px/10px margins; 24px/26.4px weight 500
.users-many-actions  margin-top 30px
.navLogo img     max-width 300px (vs .brand-logo max-width 200px)

## sheet-*.css (15 files, 5748 lines total)
READ IN FULL: sheet-0 (2 lines, video-js), sheet-1 (2, angular ng-cloak/ng-hide),
sheet-5 (3, color-picker), sheet-13 (4, vjs-youtube), sheet-14 (1, `body{overflow:auto}` —
this is the inline <style> seen as node [14] in every state capture),
sheet-7 (12 lines, Toastr 2.0.1 vendor, incl. 5 base64 PNG/GIF toast icons),
sheet-8 (26, textAngular .ta-* + bootstrap .popover),
sheet-6 (31, angular-xeditable).

### CROSS-CHECK FINDING (stylesheet vs computed capture)
sheet-6:14  .editable-click, a.editable-click { color: rgb(66,139,202);
                                                border-bottom: 1px dashed rgb(66,139,202) }
sheet-6:16  .editable-empty {...} { font-style: italic; color: rgb(221,17,68) }
BUT the computed capture (rects) shows these elements rendering color: rgb(10,10,10).
=> app CSS overrides xeditable's colours. The "empty" placeholder renders ITALIC but
   NEAR-BLACK rgb(10,10,10), NOT xeditable's default pink-red rgb(221,17,68).
   Only the border-BOTTOM-COLOR rgb(66,139,202) survives.
ALSO: the rects capture records only `border-top-style` (not bottom/left/right style), so the
   DASHED underline on .editable-click is provable ONLY from sheet-6, never from the computed
   dump. Anything relying on border-bottom-style must cite the stylesheet.
sheet-8:15  .popover z-index 1060; max-width 276px; radius 6px; border 1px rgba(0,0,0,0.2);
            box-shadow rgba(0,0,0,0.2) 0 5px 10px
sheet-8:2   .ta-root.focussed > .ta-scroll-window.form-control { border-color rgb(102,175,233);
            box-shadow inset rgba(0,0,0,0.075) 0 1px 1px, rgba(102,175,233,0.6) 0 0 8px }
sheet-8:3/5 .ta-editor.ta-html/.ta-scroll-window.form-control min-height 300px;
            .ta-scroll-window > .ta-bind padding 6px 12px  (matches computed capture exactly)

STILL TO READ: sheet-2 (1576), sheet-3 (minified 1 line/36KB), sheet-4 (47),
sheet-9 (2573), sheet-10 (556), sheet-11 (134), sheet-12 (789);
then rawHtml.html (223KB), meta.json, stylesheets.json, asset-ptr_logo.png,
asset-ajax_loader.gif; then the 9 page captures outside NEXT-STEP.
sheet-4  (48 lines, angular color-picker vendor) READ IN FULL. Incl. 2 base64 PNGs
         (saturation/lightness grid overlay + round-panel overlay).
sheet-11 (135 lines, "feather" icon webfont) READ IN FULL.
   @font-face { font-family: feather; src: fonts/feather-webfont.woff / .ttf }
   + 132 .icon-* rules whose content: is a private-use codepoint.
   FINDING: the rects vocabulary proves ONLY 2 font-family values render anywhere on this page
   ("Helvetica Neue", Helvetica, Arial, sans-serif  |  FontAwesome). The feather webfont is
   DECLARED AND LOADED BUT NEVER USED by any rendered element of the Manage page.
   Do not port feather to our rebuild on the strength of this capture.

### Remaining sheets IDENTIFIED (first lines read), NOT YET READ IN FULL
sheet-2  (1576 lines) normalize.css + Bootstrap 3 core   -- starts `html{font-family:sans-serif}`
sheet-3  (1 minified line, 36KB) video.js + embedded @font-face VideoJS (base64)
sheet-9  (2573 lines) Bootstrap glyphicons + (likely) the app theme overrides
sheet-10 (556 lines)  Font Awesome 4.3.0  -- @font-face FontAwesome, ../fonts/fontawesome-webfont
sheet-12 (789 lines)  animate.css

OPEN QUESTION still to settle by reading: which rule sets `.editable-click { color: rgb(10,10,10) }`,
overriding xeditable's rgb(66,139,202) from sheet-6:14. Most likely in sheet-9's app section.
This is a real discrepancy I found; it is NOT yet resolved on evidence.

## TALLY
READ IN FULL: 33 of 42 files
  - 11 of 11  state-*.json
  - 11 of 11  rects-*.json  (three-part completeness proof, see above)
  - 9 of 15   sheet-*.css   (0,1,4,5,6,7,8,11,13,14 => that is 10; recount: 0,1,4,5,6,7,8,11,13,14 = 10)
NOT YET READ: sheet-2, sheet-3, sheet-9, sheet-10, sheet-12,
              rawHtml.html (223KB), meta.json (11KB), stylesheets.json (490KB),
              asset-ptr_logo.png, asset-ajax_loader.gif
              => 10 files remaining in NEXT-STEP/gaps
PLUS the 9 page captures outside NEXT-STEP (not started).

## meta.json — READ IN FULL (281 expanded lines)
url   https://protradingroom.com/ptrApp#/page/manageSession/6a6529b318781e20ed81947d
capturedAt 2026-08-01T18:39:52.034Z   viewport 1989x1265 dpr 2   title "" (empty)
angularVersion 1.3.15 "locality-filtration"

**UA vs LAYOUT — do not confuse them.** The UA string is
  Mozilla/5.0 (Linux; Android 15; Pixel 9) ... Chrome/150.0.0.0 Mobile Safari/537.36
i.e. a MOBILE user-agent. But the viewport is 1989x1265 and the matched media list proves the
DESKTOP layout was captured: (min-width:768px) TRUE, (min-width:992px) TRUE, (min-width:1200px)
TRUE, and every max-width query FALSE, print FALSE. Anyone reasoning "mobile UA => mobile layout"
off this capture would be wrong.

**fonts[] — INDEPENDENT CONFIRMATION of the feather finding.**
  FontAwesome ............ status "loaded"
  Glyphicons Halflings ... status "unloaded"
  VideoJS ................ status "unloaded"
  feather ................ status "unloaded"
I had already concluded from the rects vocabulary (only 2 font-family values across 3483 elements)
that feather is declared but never used. meta.json says so directly. Two independent lines agree.

**config{} — why several panes are empty is the COLLECTOR, not the app.**
  NAME "ptr-gaps"  MAX_BYTES 6291456  DOWNLOAD_GAP 400  SETTLE 120
  OPEN_EDITOR false   OPEN_BOOTBOX false   LOAD_STATS false
So the textAngular editor was never opened, no bootbox was opened, and stats were never loaded.
The empty editor and "No results to show" are the harness's settings, NOT missing app behaviour.

captures[] 11 entries, all 1632 elements except modal:permissions 1633 — matches what I read.
stylesheets[] 15 entries with href+access+bytes — matches sheet-*.css exactly.
head (one long string, read): link order confirms the sheet order; also present —
  Google Analytics UA-111336437-1 and gtag G-1EW807M702, recaptcha A7KpaEASfhDcK0nXxgQEyyYv,
  YouTube iframe_api + www-widgetapi, cdnjs split.js 1.5.11, 3x duplicated origin-trial metas.

## Binary assets — VERIFIED
asset-ptr_logo.png     7197 bytes = meta.json declared. PNG magic 89504e470d0a1a0a. INTRINSIC 489x60.
asset-ajax_loader.gif  4178 bytes = meta.json declared. GIF89a magic. INTRINSIC 32x32.
CROSS-CONFIRMATION: 489/60 = aspect 8.15. `.brand-logo` has max-width 200px and rendered
199.992x24.539 (8.15 ✓). `.navLogo` has height 25px -> 25 * 8.15 = 203.75, which is EXACTLY the
width read on the Branding tab capture. The logo geometry is fully explained by the intrinsic size.
NOTE a URL discrepancy: meta.json assets[] gives the loader as
  https://protradingroom.com/app/img/ajax_loader.gif   (no /public/)
while sheet-9.css:1185 `.loadingBkg` references /public/app/img/ajax_loader.gif, and the DOM nodes
use the relative `app/img/ajax_loader.gif`. Recorded, not resolved.

## sheet-10.css — READ IN FULL (557 lines)
Font Awesome 4.3.0. Lines 1-38 (the mechanics) read directly. Lines 39-557 verified to be
UNIFORM icon content-rules — 0 lines of any other shape — and all 593 icon class names read.
Every icon the Manage page uses (fa-cog, fa-power-off, fa-user, fa-refresh, fa-external-link,
fa-copy, fa-edit, fa-link, fa-trash, fa-trash-o, fa-credit-card, fa-ban, fa-mobile, fa-microphone,
fa-desktop, fa-user-md, fa-user-times, fa-floppy-o, fa-user-plus, fa-users, fa-save, fa-plus,
fa-random, fa-download, fa-gear, fa-quote-right, fa-bold, fa-italic, fa-underline,
fa-strikethrough, fa-list-ul, fa-list-ol, fa-repeat, fa-undo, fa-align-*, fa-indent, fa-outdent,
fa-code, fa-picture-o, fa-youtube-play, fa-check, fa-times) exists in this set.

## sheet-9.css — READ IN FULL (2574 lines) — see CHANGELOG 2026-08-12 20:15 EDT
= https://protradingroom.com/public/app/css/styles.css
Lines 1..1046 are BYTE-IDENTICAL to 1272..2317 (theme block included twice); file reduces to
1..1271 + 34 unique tail lines, all read. sheet-9:1193 is the ONLY .editable-* rule in the file.
Confirmed directly against computed values: :2560 #permissionsModal .modal-content{padding:20px},
:2567 .users-many-actions{margin-top:30px}, :36/:1307 fieldset dashed rgb(238,238,238),
:29/:1300 .tab-content, :32/:1303 .form-control padding 18px (the app override of BS3's 12px).
=> RESULTED IN A REAL FIX: manage.css editable hover/focus + new editable-hover-contract.test.ts.

## stylesheets.json — READ (15 entries: href, media, access, bytes)
The `rules` field IS the sheet-N.css content. New info is origin + access:
sheet-3 (video-js) and sheet-7 (toaster) have access="refetched" — cross-origin CDN sheets the
collector could not read from the live CSSOM and had to re-download. They are therefore NOT
guaranteed to be what the browser actually applied; the other 13 are read from the CSSOM.

## rawHtml.html — STARTED (2663 lines; head=1..48 already read verbatim inside meta.json;
##                          body 49..153 read directly)
It is the SOURCE markup, so it carries what the DOM capture destroyed — comments and entities:
  :66   <!-- <span class="title">ProTradingRoom.com</span>--> — the brand text is commented out,
        which is why the navbar shows only the logo image.
  :123-130 an entire commented-out "Room Type" editable-select (sess.roomType / sessTypes).
  :78   `&nbsp; Account` — a leading non-breaking space before the word.
  :103  `Manage Room id: 3627&nbsp;&nbsp;( 6a6529b318781e20ed81947d )` — TWO nbsp, not spaces.
  :99   style="background-color: 0A0A0A; " — INVALID CSS (no #), so it is ignored by the browser;
        it does NOT paint. Do not port it as rgb(10,10,10).
  :50-58 <body ng-class> toggles layout-fixed/boxed/dock/material, aside-offscreen, footer-hidden,
        in-app; the captured body resolved to class="footer-hidden".
Entity/whitespace detail like this is invisible in the state-*.json text nodes, which normalise it.
STILL TO READ: rawHtml.html lines 154..2663.

## REMAINING, NOT READ
sheet-2.css  (1577 lines) bootstrap.min.css — 261 icon rules, 68 @media, 1 @font-face
sheet-3.css  (1 minified line, 36KB) video-js.min.css, access="refetched"
sheet-12.css (790 lines) animate.min.css — 148 @keyframes
rawHtml.html lines 154..2663
the 9 page captures outside NEXT-STEP: account-page, home-page, login-page,
  main-nav-login-clicked, register-page, room-login, COPY, README.md

## rawHtml.html — the genuinely-new content READ (head 1-48, body 49-153, 355-449, 2488-2592,
## ALL 166 comment lines, ALL 11 interpolations, all 4 distinct entities)
The state-*.json renders already gave me every ELEMENT with every attribute. What rawHtml adds and
they cannot is: comments, commented-out markup, raw entities, and `{{ }}` expressions.

**GENUINE GAP, DO NOT INVENT: the user-row markup is NOT in this dump.**
  :430 <table class="table table-striped " ng-init="showPins=true;">  ... :441 <tbody>
  :442   <!-- ngRepeat: user in xrefs -->
  :443 </tbody>
Angular 1.3 replaces an ngRepeat template with a comment placeholder, so with zero users loaded the
row markup exists only in the compiled app.min.js. The Actions-column controls, the Role/Status
cell, and whatever `showPins` gates CANNOT be recovered from NEXT-STEP/gaps. Recovering them needs
either a capture with users loaded or the compiled bundle.
Same for: `<!-- ngRepeat: userStat in statXrefs | filter: uSearchStat -->` (:571 — note the filter
expression), `<!-- ngRepeat: montlyStat in statXrefsMontly -->` (:553),
`<!-- ngIf: sess.authMode === 'unamePW' -->` (:294,:295),
`<!-- ngIf: completeUserList && completeUserList.length>0 -->` (:361).

**All 11 `{{ }}` interpolations are inside COMMENTED-OUT blocks.** The live template has none —
every live value is rendered by an xeditable directive, which is why the DOM capture shows resolved
text. One of them independently corroborates `editable-display.ts`:
  :2124  {{ sess.useV4 && "Yes!" || "No" }}   <- "Yes!" WITH the exclamation, "No" without.

**Commented-out features (present in source, not shipped):** Room Type select (:123-130), webinarTZ
(:140), a second Vanity-Link Edit button (:234-236), customRoomURL (:674-678), chatAutoClearTime
(:1716-1720), useV4 (:2121-2127), media_server_audio (:2183-2188), relay_to_repeaters (:2203-2208),
relay_user_max (:2218-2224), linkedStreamsToSession (:2399-2404), a "Run validation" submit button
in the panel-footer (:2496), the emoji-picker stylesheet (:36), and the brand text
`<span class="title">ProTradingRoom.com</span>` (:66) — which is why the navbar shows only the logo.

**PROVENANCE CAVEAT: rawHtml.html is NOT the baseline DOM.** :2500 carries
`class="modal fade"` (no `in`) but still `style="display: block !important;"`. The baseline
state capture has the modal with NO inline style; the modal:permissions capture has both `fade in`
AND the style. So rawHtml was serialised AFTER the modal run, mid-teardown — the `in` class already
removed, the inline style not yet cleared. Treat rawHtml as the FINAL state, not the initial one.

**Script stack (:2538-2587) / versions:** vendor.min.js?v=2.18.100, adapterjs 0.15.5 (CDN + SRI),
janus3.js?v=2.18.100, video.min.js 7.3.0, videojs-youtube 2.6.0, angularjs-toaster 2.2.0,
sockjs-client 1.4.0, soundcloud player api, app.min.js?v=1785053347467.
App version 2.18.100; cache-buster __cver 1785053347467. `__h264='false'`, `__isReg='false'`,
AdapterJS.options.forceSafariPlugin = !__h264 = true.
STILL UNREAD in rawHtml: the settings markup body 154-354 and 450-2487, whose every element +
attribute was already read via the state renders, and whose comments/entities/bindings are read above.

## STILL NOT READ AT ALL
sheet-2.css (1577, bootstrap.min.css), sheet-3.css (minified, video-js, refetched),
sheet-12.css (790, animate.min.css),
and the 9 captures outside NEXT-STEP (account-page, home-page, login-page,
main-nav-login-clicked, register-page, room-login, COPY, README.md).

## ===== OUTSIDE-NEXT-STEP CAPTURES =====
Inventory: 14 files, 10,274 lines + evidence-dumps/README.md (36, READ).

### login-page/manage IS A SECOND CAPTURE OF THE SAME MANAGE PAGE — only 36 lines differ
Cross-validates NEXT-STEP/gaps/rawHtml.html. Every differing line read. Two matter:

1. **REAL UI COPY I DID NOT HAVE — the un-generated Unique Link placeholder.**
   NEXT-STEP rawHtml:217  value="https://protradingroom.com/room/
                                 c67221cc-e51e-4537-9bdd-162a168fc721-e56dad11-3dfc-40b3-af1e-9be76148f756"
   login-page/manage:217  value="https://protradingroom.com/room/[youruniquelinkhere]"
   So before "Generate" is clicked the field reads `[youruniquelinkhere]`, matching the Vanity
   Link's `[yournamehere]`. The NEXT-STEP capture happens to have a generated link (two UUIDs).

2. **CONFIRMS the rawHtml provenance caveat.** login-page/manage:2500 has NO
   `style="display: block !important;"` on #permissionsModal. So that inline style is JS-added on
   open, and NEXT-STEP/rawHtml.html was serialised after the modal run. login-page/manage is the
   CLEAN capture of the initial state; prefer it for markup questions.

Also: textAngular toolbar name is a random per-instance id (textAngularToolbar1688900357607179 vs
...5486278290313457) — never match on it. And ng-show adds `class="" style=""` in one capture only.

### THE PRODUCT HAS THREE FRONT-ENDS, NOT TWO  (room-login/ + COPY/login-page-source)
`room-login/room-login-file` and `COPY/login-page-source` are the SAME page, 18 lines apart, and it
is **NOT AngularJS**:

    <app-root _nghost-ng-c4243810522="" ng-version="17.3.12">
      <router-outlet></router-outlet><!---->
      <app-session-login _ngcontent-ng-c4243810522="" _nghost-ng-c177535397="">

**Angular 17.3.12** — components with `_nghost-ng-c*` / `_ngcontent-ng-c*` emulated-encapsulation
attributes, hashed build output (runtime.b70e5d3ff558bfdf.js, polyfills.95db17d6d6f4b89d.js,
scripts.38973a242454fb27.js, main.d6d3c112b59b7d0d.js), `data-critters-container` (Critters
critical-CSS inlining).

Its CSS custom properties are the **Bootswatch Darkly** palette:
  --blue:#375a7f --indigo:#6610f2 --purple:#6f42c1 --pink:#e83e8c --red:#E74C3C
  --orange:#fd7e14 --yellow:#F39C12 --green:#00bc8c --teal:#20c99...
Font: Lato 400,700,400italic (Google Fonts @import).
Third-party: `https://reallyfreegeoip.org/json/?callback=handleGeoData_...` — a GEO-IP lookup on
the room-login page. Worth knowing before porting.
Titles differ: COPY/login-page-source `<title>PTRChat</title>` vs room-login `<title>Room 3625</title>`.

So: AngularJS 1.3.15 + Bootstrap 3 (account/manage) | Angular 17.3.12 + Bootswatch Darkly
(room-login) | Bootstrap 5 (the room itself, per manage-panel-bootstrap3-contract.test.ts).
`manage-panel-bootstrap3-contract.test.ts` documents TWO Bootstrap generations; this is a THIRD
surface it does not mention.

### main-nav-login-clicked/file vs login-page/logged-in-page — 34 lines, all read
Two captures of the ACCOUNT page room list, of TWO DIFFERENT ROOMS and TWO DIFFERENT BUILDS:
  Room 3625  id 6a628a99731b9f77ae9bf505  ownerID 6a628a98731b9f77ae9bf504  users 1 / 3
             `jwtSite=[REDACTED_ACTIVE_JWT]`  <- someone redacted a live JWT here
  Room 3627  id 6a6529b318781e20ed81947d  ownerID 6a6529b318781e20ed81947c  users 0 / 2
             `jwtSite=null`
  __cver 1785053207883  vs  1785053347467 — two different app builds.
Room-list row markup (NOT available anywhere in NEXT-STEP):
  <strong class="ng-binding">3625</strong>
  <span ng-show="s.isClonedRoom" class="ng-hide"></span>
  <div ng-show="showNewRoom" class="ng-hide"><br><muted class="ng-binding">( ID - ownerID: X</muted> )</div>
     ^ QUIRK: the closing ")" sits OUTSIDE the <muted> element.
  <td class="ng-binding">Room 3625</td>
  <div class="text-muted ng-binding">1 / 3</div>
  Launch = a.btn.btn-sm.btn-info + i.icon.fa.fa-external-link
  Manage = a.btn.btn-sm.btn-inverse + i.icon.fa.fa-cogs, href #/page/manageSession/<id>
Login form: ng-model signup.email / signup.pass; recaptcha data-sitekey
  6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx (same key as the Manage page);
  ng-show="loggingIn" spinner div.

### account-page/upload-image-badge-prompt.html — THE BOOTBOX MARKUP (1 line, READ IN FULL)
`meta.json` config has `OPEN_BOOTBOX: false`, so NEXT-STEP never captured a bootbox at all.
THIS FILE IS THAT MISSING EVIDENCE, and our repo has `Bootbox.svelte` + `bootbox.svelte.ts`:

  div.modal-content
    div.modal-header
      button.bootbox-close-button.close[type=button][data-dismiss=modal][aria-hidden=true]  "×"
      h4.modal-title  "Enter the badge name (*optional):"
    div.modal-body > div.bootbox-body > form.bootbox-form
      input.bootbox-input.bootbox-input-text.form-control[autocomplete=off][type=text]
    div.modal-footer
      button[data-bb-handler=cancel][type=button].btn.btn-default   "Cancel"
      button[data-bb-handler=confirm][type=button].btn.btn-primary  "OK"

Note the ORDER: Cancel (btn-default) FIRST, then OK (btn-primary). And the close button carries
BOTH `bootbox-close-button` and `close`.

### login-page/launch — THE ROOM IS ANGULAR 17 TOO, and on DIFFERENT vendor versions
  <html lang="en" data-critters-container=""> <title>Room 3625</title>
  <base href="/">           <!-- with a commented-out  <base href="/v4" />  above it -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0, target-densitydpi=device-dpi">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  Font Awesome **5.8.1** via use.fontawesome.com (SRI sha384-50oBUHEmvpQ+...)
  animate.css **3.7.2** via cdnjs
Commented-out Google Fonts @imports for Roboto and Source Sans Pro.

**This matters for the match:** the AngularJS controller uses Font Awesome **4.3.0** (local vendor
dir) and a BUNDLED animate.css; the Angular-17 room uses Font Awesome **5.8.1** (CDN) and
animate.css **3.7.2**. FA4 and FA5 have different class names (`fa` vs `fas`/`far`) and different
glyph coverage. Do not assume one icon set across the two surfaces.

### account-page/file1 (85 lines) — READ IN FULL
The User Stats tab markup. Same ngRepeat gaps as NEXT-STEP (montlyStat, userStat|filter). Resolves
one composition the DOM capture could only show as fragments:
  :38  <label><input type="checkbox" ng-model="filterFT"> Show <span class="badge badge-danger">Free
       Trials</span> Only?</label>
  i.e. ONE label reading "Show [Free Trials] Only?" with the badge inline — not the separate
  "Show Only?" + "Free Trials" strings the text-node extraction suggested.
  :75  <th>Time Stamps <a href="" ng-click="reverseStatSort()">Reverse</a></th> — Reverse is INSIDE the th.

### login-page/launch (166 lines) — READ IN FULL. THE ROOM LOGIN, Angular 17 + BOOTSTRAP 5.
**App version string, rendered in the footer: `Version: v4.0.1-61268ec1`** (`<base href="/">` with a
commented-out `<base href="/v4" />` above it — so this IS the "v4" room).

**Bootstrap 5 confirmed by markup, not inference:** `class="btn-close btn-close-white"`,
`data-bs-dismiss="modal"`, and the full `--bs-*` custom-property block (--bs-primary:#0d6efd,
--bs-border-radius:.375rem, --bs-focus-ring-width:.25rem, --bs-breakpoint-xxl:1400px ...).
Layered OVER Bootswatch Darkly's older `--blue/--primary/--secondary/...` set. Both are present.
Font Awesome **5** in use: `fas fa-cog`, `fas fa-user`, `fas fa-envelope` (the `fas` prefix; FA4 on
the controller has no `fas`).

**THE ROOM'S OWN DESIGN TOKENS — a complete custom-property theme, inline in the <style>:**
  --dark-gray:#aaa --darker-gray:#aaa6a6 --gray:#bbb --light-gray:#ccc --lighter-gray:#eee
  --dark-black:#222 --darker-black:#111 --light-black:#373c42 --lighter-black:#3e444a
  --light-green:#1edd6e --brown:#555 --light-brown:#8c8686 --dark-brown:#4b4b4b
  --lighter-blue:#edf2f6 --yellow:#ff0 --fire-yellow:#f7fd37 --red:#f00 --light-blue:#40e0d0
  --name-color:#c0d8ed --transparent-gray:rgba(255,255,255,.331)
  --app-font-family:Arial, Helvetica, sans-serif !important   --app-link-color:#00bc8c
  --navbar-color:#fff --navbar-bg:#000 --sidebar-menu-bg:#000 --sidebar-menu-color:#ccc
  --sidebar-menu-active-color:#f7fd37 --presenter-noRecording-color:#f7fd37
  --presenter-recording-color:#f00 --presenter-area-bg:#111 --tab-active-bg:#222
  --note-download-bg:#00bc8c --note-delete-bg:#e74c3c --note-next-bg:#375a7f
  --file-list-odd-bg:#fff --file-list-even-bg:#f4f4f4 --users-badge-bg-color:#375a7f
  --modal-content-bg-color:#303030 --modal-btn-success-bg:#00bc8c --modal-btn-danger-bg:#e74c3c
  + a full  --lightTheme-*  and  --darkTheme-*  pair set (msg bg/border/color, roster bg, textarea,
    nickname, separators, chat bg), every one declared `!important`.
This is the room's theme contract and it is NOT in NEXT-STEP at all.

**Login form copy, verbatim:** h1.room-title " Welcome to the Room 3625 " ·
p.authenticate-info "Please complete this form:" · label "Name" + placeholder "Name or Nickname" ·
label "Email" + placeholder "Email" (input DISABLED) · checkbox#remember-me "Keep me logged in" ·
button.btn-login.btn.btn-primary.buttonload "Login" · a.session-login-link "Not you? clear form" ·
a.session-login-link "Have a password?<br>Click here" ·
footer "Powered by: ProTradingRoom.com" + "Version: v4.0.1-61268ec1".
Avatar: img src=https://www.gravatar.com/avatar/[GRAVATAR_MD5_A]?d=mm (already redacted in the
capture), span.setup-avatar title="Setup Avatar" > i.fas.fa-cog, div.user-nick "@[OWNER_NAME]".
Entry animation: `class="... login-form-container animated fadeInRight faster"`.
Two modals present: #avatar-from-gmail-modal ("Avatar from gmail address", placeholder
user@example.com) and #avatar-from-facebook-modal ("Facebook profile image as avatar", placeholder
johndoe) — both Close(btn-primary)/Save(btn-success).
Also `<audio autoplay hidden id="webcam">` at the app-root level.
Inline scripts read: openImageModal (shift/alt/ctrl -> window.open with a written-out doc; else
`bootbox.dialog({size:'large', className:'imgur-modal'})` with a Download Image button),
downloadImage (XHR blob + createObjectURL + a synthetic <a download>, filename stripped of the
leading `X_` and trailing `_Y` segments), removeImageFromChat, showChatGif
("click to hide" / "gif muted, click to show").

### register-page/register-page-file (295) — READ END TO END
Same AngularJS shell as Manage (identical head, same script stack, __cver 1785053347467).
Body: div.container.container-sm.animated.fadeInDown > div[ng-controller=LoginCtrl].center-block.mt-xl
  logo a[href="/"] > img /public/images/protradingroom_icon_dark.png .pull-left
    + span.title[style="color: black"] "ProTradingRoom.com"
  .panel > .panel-body > p.pv.text-bold "Create your ProTradingRoom account"
  form[ng-submit=submitSignup] .mb-lg, all inputs .form-control.has-feedback:
    signup.name  "Your full name"            (feedback span EMPTY — no icon)
    signup.email "Your email"                (span.fa.fa-envelope.form-control-feedback.text-muted)
    signup.pass  "Your password"   #signupInputPassword1   (span.fa.fa-lock...)
    signup.pass2 "Type your password again" #signupInputRePassword1 (span.fa.fa-lock...)
    a[ui-sref=page.forgot-password].text-muted "Forgot your password?" (in .text-right.mt)
    g-recaptcha data-sitekey 6LcDyB4TAAAAAEajRvbeLyW2Lj_2TmXV5YSjAixx
    .checkbox.c-checkbox.pull-left.mt0 > label > input[ng-model=signup.agreeTOSChk]
       + span.fa.fa-check + "I agree with the " + a[href=""] "terms"
    button[type=submit].btn.btn-block.btn-primary "Create account"
    p.pt-lg.text-center.mt-sm "Already register?" + a[ui-sref=page.welcome][style=text-decoration:underline] " Login here "
       ^ TYPO IN THE REFERENCE: "Already register?" not "registered". Reproduce verbatim.
  footer ngInclude 'app/views/page.footer.html' .p-lg.text-center:
    hr, span.mr-sm "©", span[ng-bind=app.year] "2026", span[ng-bind=app.name] "ProTradingRoom", br, span
  <script src="https://www.google.com/recaptcha/api.js" class="ng-scope">
Globals: __hasPhoneValidation='false'  __disableMarketplace='true'

### home-page/file (562) — READ END TO END. The PUBLIC MARKETING SITE — a 4th stack.
NOT AngularJS and NOT Angular 17: plain HTML + jQuery **1.11.0** + Bootstrap **3.1.1** (both CDN)
+ Font Awesome **4.0.3** via netdna.bootstrapcdn.com. Own CSS: /public/css/compiled/theme.css,
/public/css/vendor/animate.css, /public/css/main.css?v1.0, /public/js/theme.js. body id="home4".
So FOUR front-end stacks total: public site (BS3.1.1/jQuery/FA4.0.3), controller
(AngularJS 1.3.15/BS3/FA4.3.0), room-login+room (Angular 17.3.12/BS5/FA5.8.1), and the room's own
Bootstrap 5 surface.

**GDPR banner** #gdpr-banner (inline style, display:none until localStorage `gdprConsent` unset):
  copy "We use cookies to enhance your experience. By continuing to visit this site you agree to our
  use of cookies. For more information, including how to manage your cookie settings, see our
  [Privacy Policy]." ; buttons "Accept All" (.button.button-small) and "Reject Non-Essential"
  (background #666). acceptCookies()/rejectCookies() write localStorage and call
  enableTracking()/disableTracking(); disableTracking sets window['ga-disable-UA-51280128-2']=true
  and expires every cookie.

**THREE separate analytics identities + a STALE one from another product:**
  UA-111336437-1   gtag, on the AngularJS app pages
  G-1EW807M702     gtag, on the AngularJS app pages
  AW-1044463300    Google Ads, on the public site
  UA-51280128-2    classic ga.js on the public site — AND
  _gaq.push(['_setDomainName', 'videoinclinic.com'])   <-- a DIFFERENT PRODUCT's domain, left in.

**TWO different tawk.to properties:**
  public site      embed.tawk.to/**5aec4d755f7cdf4f0533dd2c**/default   (loaded twice: inline
                   script AND the enableTracking() path)
  room reference   **5aecb59f227d3d7edc24f7c2**  (the id our tawk-support.ts records)
Do not conflate them. Also ShareThis (publisher 33a7c385-d09c-4f65-9259-5edf1f7d97b3) + its
stLight/stwrapper/stOverlay DOM.

Marketing copy: header a.navbar-brand img /public/images/protradingroom_icon.png (height 45px)
  + " ProTradingRoom"; nav "Register/Login" dropdown -> /login, /register; "Contact Us" -> /contact.
  #hero (background #0e0e0e, padding-top 60px) h1.hero-text "Web-based Trading Room for Professionals",
  img ptr_descrived_perspective.png, a.button.button-large.button-primary "Learn More",
  7 bullets: White Label! / HD Screen-Sharing with no lag! / Desktop or Mobile / Mobile trade alerts /
  Web based HTML5, No Flash, No Downloads / Custom integrations on your site /
  Branding, Recording, Webinars, Stats, and more...
  #second-option three .feature cols (locked.png / cloud.png / browser.png circle-icons).
  Testimonials section naming competitors by name — "Yes! Way better than Omnovia",
  "Webinato slowed me right down!" (also in the <meta name="keywords">:
  "webinato replacement, omnovia replacement").
  #mobile, #cta, #footer: Privacy Policy /public/html/ppolicy.html, Terms /public/html/tos.html,
  Contact Us, "© 2026 ProTradingRoom™".
  A MARKETPLACE carousel is styled inline (.marketplace-card/-image/-price/-logo/-title/-tagline,
  #marketplace-empty-section, #marketplace-btn) though __disableMarketplace='true' on the app side.

# ===== PART 2: the remaining files, read 2026-08-13 =====

Method: 8 parallel readers, each given the four evidence rules verbatim, each required to
state which lines it did and did not Read. Each finding then re-opened and checked by a
second reader whose default verdict was REFUTED.

RESULT: 30 findings CONFIRMED, 13 REFUTED, 180 reported but beyond the 6-per-file verify cap
(recorded below as UNVERIFIED — do not cite them as settled), 73 honest gaps.

ONE READER FAILED: the COPY/login-page-source agent returned literal "test" placeholders and a
degenerate finding (claim "a", citation "b"). It never read the file. I read all 168 lines
myself instead — see PART 2C.

## 2A. COVERAGE STATEMENTS (verbatim from each reader)

### /Users/billyribeiro/Desktop/trading-room-app/apps/controller/evidence-dumps/NEXT-STEP/gaps/sheet-2.css
lines: 1-80, 81-160, 161-240, 241-320, 321-400, 401-470, 471-540, 541-610, 611-680, 681-750, 751-820, 821-890, 891-960, 961-1030, 1031-1100, 1101-1170, 1171-1240, 1241-1310, 1311-1380, 1381-1450, 1451-1520, 1521-1577 — i.e. 1-1577 (all), contiguous, no gaps
I read EVERY line of my assigned range, 1 through 1577, with the Read tool, in 22 contiguous sequential slices with no gaps and no overlap. I used Bash exactly once, for `wc -l` / `wc -c` measurement only (it reports 1576 newlines / 134647 bytes; the Read tool exposes a line 1577, which means the final line carries no trailing newline). I used no grep/rg/awk/sed at any point and drew no conclusion from any search. One honest limitation on transcription, not on coverage: lines 68-322 are the `.glyphicon-*::before` content declarations, and the great majority of those `content:` values are Unicode Private Use Area codepoints (the Glyphicons Halflings font's own glyph slots). They pass through the Read output as unrenderable/empty-looking characters, so although I read every one of those lines, I cannot transcribe the exact codepoint for the PUA ones from what the tool showed me. The non-PUA ones I could read verbatim are listed in the findings.

### /Users/billyribeiro/Desktop/trading-room-app/apps/controller/evidence-dumps/NEXT-STEP/gaps/rawHtml.html
lines: 154-203, 204-253, 254-303, 304-354 (= 154-354, all 201 lines, via 4 sequential Read calls; no grep/rg/awk/sed used on content)
I read EVERY line of my assigned range 154-354 with the Read tool, in four sequential slices with no gaps and no overlap: Read(offset=154,limit=50) -> 154-203; Read(offset=204,limit=50) -> 204-253; Read(offset=254,limit=50) -> 254-303; Read(offset=304,limit=51) -> 304-354. No lines were skipped, skimmed or sampled. I did not read lines 1-153, 355-2662 (file is 2662 lines per `wc -l`), as instructed. The only Bash I ran was `wc -l` to measure the file.

### /Users/billyribeiro/Desktop/trading-room-app/apps/controller/evidence-dumps/NEXT-STEP/gaps/rawHtml.html
lines: 450-529, 530-599, 600-669, 669-738, 739-808, 809-878, 879-948, 949-1018, 1019-1088, 1089-1158, 1159-1228, 1229-1298, 1298-1367, 1368-1437, 1437-1470 (15 contiguous Read slices, overlapping at 669/1298/1437, zero gaps) = 450-1470 (all)
Yes — I literally Read every line from 450 to 1470 inclusive, using the Read tool only, in 15 sequential slices that overlap at their seams (669, 1298, 1437) and leave no gap. No line in the range was skipped, sampled or reached by grep/rg/awk/sed. The only Bash I ran was `wc -l` / `wc -c` to measure the file (2662 lines, 223628 bytes). Line 475 is a single ~10KB minified line (the whole text-angular editor); the Read tool returned it in full and I read it in full. I did NOT read lines 1-449 or 1471-2662 — they are outside my assignment, so anything about the tab header list, the active-tab flag, or the second half of the Settings tab is reported below as an honest gap rather than asserted.

### /Users/billyribeiro/Desktop/trading-room-app/apps/controller/evidence-dumps/NEXT-STEP/gaps/rawHtml.html
lines: 1471-1600, 1600-1729, 1729-1858, 1858-1987, 1987-2116, 2116-2245, 2245-2374, 2374-2493 (contiguous; covers all of 1471-2487, plus 2488-2493 tail overlap)
I read EVERY line of my assigned range 1471-2487 with the Read tool, in 8 sequential overlapping slices, first line to last. No lines were skipped, sampled, or skimmed. I read 6 lines past the end of my range (2488-2493, the file's closing divs and trailing blank lines) because the last slice ran to EOF-adjacent. I did NOT read lines 1-1470 (outside my range), which is why one item below (the JSON `<label>` whose closing tag lands at line 1479) cannot be attributed to its owning field. I used Bash once, only for `wc -l` to measure the file (2662 lines total). I did not grep, and every claim below comes from a line I opened and read.

### /Users/billyribeiro/Desktop/trading-room-app/apps/controller/evidence-dumps/main-nav-login-clicked/file
lines: 1-120, 121-240, 241-360, 361-480, 481-580, 581-690, 691-800, 801-885 — i.e. 1-885 (all)
I read every line of 1-885 with the Read tool, in eight sequential slices with no gaps and no overlaps (1-120, 121-240, 241-360, 361-480, 481-580, 581-690, 691-800, 801-885). No lines were skipped. The very long single-line blocks (557, 561, 565, 569, 573 = the Intercom emoji picker groups; 729 = the reCAPTCHA iframe block; 885 = the hidden ngf file input + reCAPTCHA bframe) were returned in full by Read and I read them in full. I used Bash only for `wc -l` / `wc -c` / `ls` to measure the file and confirm the directory contains exactly one file named `file` (85,027 bytes). I did not grep, script, or sample.

### /Users/billyribeiro/Desktop/trading-room-app/apps/controller/evidence-dumps/login-page/api-docs
lines: 1-120, 120-239, 240-359, 360-479, 478-545 (all 545 lines; overlapping slices, no gaps)
I read EVERY line of my assigned range, 1 to 545, with the Read tool in five sequential overlapping slices (1-120, 120-239, 240-359, 360-479, 478-545). No lines were skipped, and I did not use grep/rg/awk/sed to decide what to read. Bash was used once only to `ls`/`wc -l` the file (20634 bytes, 545 lines) before reading. The file is a single self-contained HTML document; there are no sibling files in this capture unit that I was assigned.

### test
lines: test
test

### /Users/billyribeiro/Desktop/trading-room-app/apps/controller/evidence-dumps/COPY/page-source
lines: 1-526 (all), via six sequential Read slices with overlap: 1-80, 80-169, 169-258, 258-347, 347-436, 436-526. Comparison file /Users/billyribeiro/Desktop/trading-room-app/apps/controller/evidence-dumps/home-page/file also read in full: 1-200, 200-399, 400-562.
I read EVERY line of my range, 1 through 526, with the Read tool, in sequential slices; no lines were skipped and no grep/rg/awk/sed was used to decide what to read. Bash was used only for `wc -l` / `wc -c` / `ls` to measure the files before reading. I then also read all 562 lines of home-page/file with the Read tool so the comparison is read-based, not diff-tool-based. I did NOT read the sibling file /Users/billyribeiro/Desktop/trading-room-app/apps/controller/evidence-dumps/COPY/login-page-source (16095 bytes) — it is outside my assigned range; I only listed it.

## 2B. CONFIRMED FINDINGS (each re-opened and checked by an adversarial second reader)

### [sheet-2.css] The sheet is Bootstrap 3 and ONLY Bootstrap 3. Across all 1577 lines every selector I read is a stock Bootstrap 3 selector (normalize.css reset, glyphicons, grid, tables, forms, buttons, dropdowns, nav/navbar, breadcrumb/pagination/pager, label/badge, jumbotron/thumbnail/alert/progress, media, list-group, panel, embed-responsive, well, close, modal, tooltip, popover, carousel, utilities, responsive-utilities). There is not one application-specific or theme class anywhere in the file.
CITE: sheet-2.css:1 `html { font-family: sans-serif; text-size-adjust: 100%; }` through sheet-2.css:1577 `}` (closing `@media print { .hidden-print { display: none !important; } }` at 1575-1577)
WHY:  Nothing on the Manage page's own look comes from this sheet. It is pure base. Any Manage-specific colour/spacing must be sourced from a different captured stylesheet, and rebuilding it from this file alone is impossible.

### [sheet-2.css] The complete set of grid breakpoints is 768 / 992 / 1200 px min-width, with the matching max-width bands at 767 / 991 / 1199. Every distinct @media condition in the file: `@media print`, `@media (min-width: 768px)`, `@media (min-width: 992px)`, `@media (min-width: 1200px)`, `@media (max-width: 767px)`, `@media screen and (max-width: 767px)`, `@media screen and (min-width: 768px)`, `@media screen and (-webkit-min-device-pixel-ratio: 0)`, `@media (max-device-width: 480px) and (orientation: landscape)`, `@media (min-width: 768px) and (max-width: 991px)`, `@media (min-width: 992px) and (max-width: 1199px)`, `@media (transform-3d), (-webkit-transform-3d)`. There is no other breakpoint value anywhere in the file.
CITE: sheet-2.css:40 `@media print {`; :355/:399/:421/:485/:755/:771/:775/:778/:873/:959/:965/:979/:986/:994/:997/:1002/:1013/:1017/:1021/:1029/:1036/:1047/:1053/:1070/:1079/:1082/:1389 `@media (min-width: 768px) {`; :424/:539/:1394 `@media (min-width: 992px) {`; :427/:593/:1529/:1535/:1538/:1541 `@media (min-width: 1200px) {`; :675 `@media screen and (max-width: 767px) {`; :701 `@media screen and (-webkit-min-device-pixel-ratio: 0) {`; :1009 `@media (max-device-width: 480px) and (orientation: landscape) {`; :1041/:1066/:1100/:1124/:1484/:1490/:1493/:1496/:1544 `@media (max-width: 767px) {`; :1193/:1464 `@media screen and (min-width: 768px) {`; :1435 `@media (transform-3d), (-webkit-transform-3d) {`; :1499/:1505/:1508/:1511/:1547 `@media (min-width: 768px) and (max-width: 991px) {`; :1514/:1520/:1523/:1526/:1550 `@media (min-width: 992px) and (max-width: 1199px) {`
WHY:  Any Svelte rebuild must use exactly these four bands. Using 640/1024/1280 (Tailwind defaults) would shift every column and every visible-*/hidden-* toggle on the Manage page.

### [sheet-2.css] .container is fluid below 768px and then steps to fixed pixel widths: 750px at >=768, 970px at >=992, 1170px at >=1200. Base padding is 15px each side, auto margins.
CITE: sheet-2.css:420 `.container { padding-right: 15px; padding-left: 15px; margin-right: auto; margin-left: auto; }`; :422 `.container { width: 750px; }`; :425 `.container { width: 970px; }`; :428 `.container { width: 1170px; }`
WHY:  The Manage page's content column width is set here, not by the app sheet. Getting 970/1170 wrong changes every measured rect in the layout capture.

### [sheet-2.css] The @font-face declares only THREE sources — woff2, woff, truetype — pointing at `../fonts/glyphicons-halflings-regular.*`, relative to `/public/app/css/`. Published Bootstrap 3.3.7 minified additionally lists an `.eot` (embedded-opentype) and an `.svg#glyphicons_halflingsregular` (format 'svg') source in its second `src:` declaration. I can cite the absence but I cannot prove from this file whether the source dropped them or Chrome discarded the unsupported format() keywords at parse time before re-serialisation.
CITE: sheet-2.css:59 `@font-face { font-family: "Glyphicons Halflings"; src: url("../fonts/glyphicons-halflings-regular.woff2") format("woff2"), url("../fonts/glyphicons-halflings-regular.woff") format("woff"), url("../fonts/glyphicons-halflings-regular.ttf") format("truetype"); }`
WHY:  The icon font must be served at `/public/app/fonts/glyphicons-halflings-regular.{woff2,woff,ttf}` for any glyphicon on the Manage page to render at all. Path is relative to the CSS file, so it resolves to /public/app/fonts/.

### [sheet-2.css] .btn base: padding 6px 12px, font-size 14px, font-weight 400, line-height 1.42857, border 1px solid transparent, border-radius 4px, display inline-block, white-space nowrap, vertical-align middle, touch-action manipulation, user-select none, background-image none, margin-bottom 0.
CITE: sheet-2.css:781 `.btn { display: inline-block; padding: 6px 12px; margin-bottom: 0px; font-size: 14px; font-weight: 400; line-height: 1.42857; text-align: center; white-space: nowrap; vertical-align: middle; touch-action: manipulation; cursor: pointer; user-select: none; background-image: none; border: 1px solid transparent; border-radius: 4px; }`
WHY:  This is the exact box model of every button on the Manage page; a 1px border and 6/12 padding gives the 34px default button height that the layout capture will show.

### [sheet-2.css] Button size modifiers, exact: .btn-lg = padding 10px 16px / 18px / line-height 1.33333 / radius 6px; .btn-sm = padding 5px 10px / 12px / 1.5 / radius 3px; .btn-xs = padding 1px 5px / 12px / 1.5 / radius 3px. Each is shared with its .btn-group-* equivalent.
CITE: sheet-2.css:840 `.btn-group-lg > .btn, .btn-lg { padding: 10px 16px; font-size: 18px; line-height: 1.33333; border-radius: 6px; }`; :841 `.btn-group-sm > .btn, .btn-sm { padding: 5px 10px; font-size: 12px; line-height: 1.5; border-radius: 3px; }`; :842 `.btn-group-xs > .btn, .btn-xs { padding: 1px 5px; font-size: 12px; line-height: 1.5; border-radius: 3px; }`
WHY:  `btn btn-sm` is the size the owner has already quoted from real Manage/Files markup; this pins it to 5px/10px, 12px, 1.5, 3px radius exactly.

### [rawHtml.html] The 'Registration Link' row is the only one of the four link rows wrapped in a `form-group m0` div; its input is `id="webinarRegLinkTxt"`, `readonly="readonly"`, with a real registration URL value.
CITE: rawHtml.html:154-157 — `<div class="form-group m0">` / `<label class="col-sm-2 control-label">Registration Link:</label>` / `<div class="input-group">` / `<input type="text" class="form-control col-md-6" id="webinarRegLinkTxt" readonly="readonly" value="https://protradingroom.com/r/6a6529b318781e20ed81947d">`
WHY:  Registration link uses the `/r/` path prefix and the same 24-hex room token as the Room Link's `/u/` path. Rebuild must not wrap the Room/Vanity/Unique rows in `form-group m0` — they are NOT wrapped (see next finding), which changes their margins.

### [rawHtml.html] Every Copy button is `class="btn btn-info" type="button"`, label text `Copy` followed by an icon `<i class="fa fa-copy"></i>` on its own line (icon AFTER the text, inside the button).
CITE: rawHtml.html:159-161 — `<button class="btn btn-info" type="button" onclick="copyLinkToClipboard('webinarRegLinkTxt')">Copy` / `<i class="fa fa-copy"></i>` / `</button>`
WHY:  Text-then-icon order and the whitespace/newline between them affect rendered spacing; the Copy button is `btn-info` (not default/primary) in all five occurrences.

### [rawHtml.html] The Room / Vanity / Unique link block is gated by a four-way ng-show on the session auth mode, and in this capture it is VISIBLE — the div carries no `ng-hide` class.
CITE: rawHtml.html:190 — `<div ng-show="sess.authMode=='webinarRoom' || sess.authMode=='open' || sess.authMode=='unamePW' || sess.allowPWLoginWithSSO">`
WHY:  This is the exact gate condition for the whole link group: authMode in {webinarRoom, open, unamePW} OR the `allowPWLoginWithSSO` flag. Angular adds `ng-hide` when false (proven by lines 229, 260, 266 which DO carry it), so its absence here is hard evidence the block rendered.

### [rawHtml.html] Room Link input: `id="webinarLinkTxt"`, readonly, value is the `/u/` room URL with the same 24-hex token as the registration link.
CITE: rawHtml.html:191-193 — `<label class="col-sm-2 control-label">Room Link:</label>` / `<div class="input-group">` / `<input type="text" class="form-control col-md-6" id="webinarLinkTxt" readonly="readonly" value="https://protradingroom.com/u/6a6529b318781e20ed81947d">`
WHY:  Confirms `/u/<roomId>` is the member-facing room URL shape, and that the label sits as a direct sibling of `.input-group` with no `form-group` wrapper (unlike Registration Link at :154).

### [rawHtml.html] Vanity Link input `id="customLinkTxt"` is readonly and its value is an UNSET placeholder literal containing square brackets — `https://protradingroom.com/room/[yournamehere]` — not a configured vanity URL.
CITE: rawHtml.html:201-203 — `<label class="col-sm-2 control-label">Vanity Link:</label>` / `<div class="input-group">` / `<input type="text" class="form-control col-md-6" id="customLinkTxt" readonly="readonly" value="https://protradingroom.com/room/[yournamehere]">`
WHY:  The empty/unconfigured state of the vanity link renders as this exact literal string in the input, not as a blank field or a placeholder attribute. Rebuilding it as `placeholder=` would be wrong — it is a `value=`.

### [rawHtml.html] Four tab panes open inside my range, all with the identical wrapper and none carrying `active`: Branding (line 454), SSO (line 479), User Stats (line 491), Settings (line 576). Each is `<div class="tab-pane ng-scope" ng-repeat="tab in tabs" ng-class="{active: tab.active}" tab-content-transclude="tab">` and each is closed by `</div><!-- end ngRepeat: tab in tabs -->`.
CITE: rawHtml.html:454, 479, 491, 576 — verbatim at 479: `</div><!-- end ngRepeat: tab in tabs --><div class="tab-pane ng-scope" ng-repeat="tab in tabs" ng-class="{active: tab.active}" tab-content-transclude="tab">`
WHY:  All tab bodies are transcluded and present in the DOM simultaneously; visibility is driven by the `active` class from `ng-class`, not by conditional rendering. A rebuild that only mounts the active tab changes behaviour (and none of these four is the active one in this capture).

### [rawHtml.html] Checkbox settings render the literal strings `No` or `Yes!` (with `!`) as the anchor's text, heavily indented inside the anchor. Only 7 settings in my range are `Yes!`: rosterVisibleToViewers (714), rosterCountVisibleToViewers (750), hasQAOnAlerts (882), sendReportEmails (1090), archiveAlertsLog (1196), archiveChatLog (1204), enableVideoPlayer (1227). Every other checkbox in 576-1470 reads `No`.
CITE: rawHtml.html:882 ` Yes!` ; rawHtml.html:889 ` No`
WHY:  These are the real captured defaults for this room. Any rebuild showing a different on/off state for those seven, or rendering 'Yes' without the exclamation mark, is a visible mismatch.

### [rawHtml.html] DEVIATION — 'Logout Webhook URL' saves to `logout_webhook_url` but is BOUND TO `sess.login_webhook_url`, the same model as the row above it. This is a defect in the captured source app, not in my tooling; I read both lines side by side.
CITE: rawHtml.html:666 `editable-textarea="sess.login_webhook_url"` (Login Webhook URL) and rawHtml.html:671 `<a href="" onaftersave="saveSessField('logout_webhook_url')" editable-textarea="sess.login_webhook_url" e-label="Logout Webhook URL:" …>`
WHY:  Editing either row displays/edits the login webhook value. A faithful rebuild should bind logout to its own field and NOT copy this bug — but the mismatch must be a deliberate decision, recorded, not an accidental divergence.

### [rawHtml.html] The `Yes!`/`No` string is produced by an Angular interpolation, proven by the commented-out useV4 block which still contains the un-rendered source expression.
CITE: rawHtml.html:2124 — ` {{ sess.useV4 && "Yes!" || "No" }}`
WHY:  Hard evidence of the exact rendering rule (truthy -> `Yes!` with exclamation mark, falsy -> `No`) rather than a guess from the rendered output.

### [file] This capture is of a LOGGED-IN account page. The login panel exists in the DOM but is hidden — despite the dump being named 'main-nav-login-clicked'.
CITE: file:708 — `<div class="panel ng-hide" ng-hide="login.isLoggedIn " style="">` (note the trailing space inside the ng-hide expression), versus file:424 `<div ng-show="login.isLoggedIn" class="" style="">` which wraps the whole room list and carries NO ng-hide class
WHY:  The login form markup here is un-rendered (no layout, no computed styles). Everything about the room list, by contrast, is live rendered DOM. Do not treat the login form as a rendered reference.

### [file] The room-list table is `table table-striped table-bordered table-hover` inside `.table-responsive`, inside `.col-md-12.panel.pane-default` inside a `.row`.
CITE: file:438-441 — `<div class="row">` / `<div class="col-md-12 panel pane-default">` / `<div class="table-responsive">` / `<table class="table table-striped table-bordered table-hover">`
WHY:  Exact wrapper chain and Bootstrap 3 table modifiers for the room list. Note the class is `pane-default`, not `panel-default` — it appears that way in every panel column on this page (431, 439, 586, 613, 675).

### [file] The room table has exactly five headers: Session ID (sortable), Name (sortable, text-center), State (text-center), Users (text-center), Actions (text-center). Both sortable headers carry an identical static sort icon div.
CITE: file:443-455 — `<th ng-click="sortByUUID()">Session ID <div class="icon fa fa-sort-alpha-asc"></div></th>`, `<th class="text-center" ng-click="sortByName()">Name <div class="icon fa fa-sort-alpha-asc"></div></th>`, `<th class="text-center">State</th>`, `<th class="text-center">Users</th>`, `<th class="text-center">Actions</th>`
WHY:  The sort icon is `fa-sort-alpha-asc` on BOTH columns and does not change with sort direction in this capture — there is no `-desc` variant and no active-state class anywhere in the header.

### [file] The single rendered room row is `<tr ng-hide="s.isArchivedRoom && !showArchivedRooms" ng-repeat="s in login.sessions | filter: sessSearch" class="ng-scope">` — archived-row hiding happens per-row on the tr, not by filtering the collection.
CITE: file:458 — `<!-- ngRepeat: s in login.sessions | filter: sessSearch --><tr ng-hide="s.isArchivedRoom &amp;&amp; !showArchivedRooms" ng-repeat="s in login.sessions | filter: sessSearch" class="ng-scope">`; end anchor at file:480 `<!-- end ngRepeat: s in login.sessions | filter: sessSearch -->`
WHY:  Rows are hidden with display:none, not removed. That means table-striped `nth-child` striping in the original counts hidden archived rows — a rebuild that filters the array will stripe differently.

### [file] Cell 1 (Session ID) renders the SHORT numeric room id in bold, followed by an EMPTY cloned-room span, plus a debug line (hidden) showing the Mongo _id and ownerID.
CITE: file:459-462 — `<td><strong class="ng-binding">3625</strong> <span ng-show="s.isClonedRoom" class="ng-hide"></span><div ng-show="showNewRoom" class="ng-hide"><br><muted class="ng-binding">( 6a628a99731b9f77ae9bf505 - ownerID: 6a628a98731b9f77ae9bf504</muted> )</div></td>`
WHY:  Three concrete facts: the debug line uses a non-standard `<muted>` element (not `<span class="text-muted">`); the opening paren is INSIDE the muted element and the closing paren is OUTSIDE it; and the cloned-room span is literally empty in the DOM, so what it displays is unknown from this capture.

### [file] Cell 2 (Name) has NO alignment class, even though its header is text-center.
CITE: file:463 — `<td class="ng-binding">Room 3625</td>` versus header file:448 `<th class="text-center" ng-click="sortByName()">`
WHY:  The Name column header is centred and the body cell is left-aligned in the original. Copying `text-center` down to the cell would be a visible mismatch.

### [api-docs] The page is titled 'API Documentation' and documents exactly one API family: 'Sessions API Documentation'. Eleven endpoints total, no more.
CITE: line 5: `<title>API Documentation</title>`; line 32: `<h1>Sessions API Documentation</h1>`; endpoint headings at lines 48, 82, 125, 168, 202, 237, 268, 297, 329, 361, 430
WHY:  This is the complete documented public API surface in this capture — 11 endpoints. Anything we build beyond these 11 is not backed by this evidence.

### [api-docs] Base URL is `https://ptrv3.protradingroom.com/stats/v1`.
CITE: line 35: `<p><strong>Base URL:</strong> <code>https://ptrv3.protradingroom.com/stats/v1</code></p>`
WHY:  Defines the host and the `/stats/v1` prefix every endpoint path hangs off.

### [api-docs] Auth is by TWO QUERY PARAMETERS on every request — `apiKey` and `apiSecret`. There is no header, bearer token, cookie or OAuth scheme documented anywhere in the file.
CITE: lines 36-41: `<h2>Authentication</h2>` / `<p>All API requests require the following query parameters:</p>` / `<li><code>apiKey</code>: Your API key identifier</li>` / `<li><code>apiSecret</code>: Your API secret for authentication</li>`
WHY:  The secret travels in the URL query string on every call — it lands in access logs, proxies and Referer headers. If we reimplement, this is a security decision inherited from the reference, not one to copy silently.

### [api-docs] Rate limit is 1 request per second PER COMMAND (not per key globally), and exceeding it returns 429.
CITE: line 34: `...are rate-limited to 1 request per second per command.`; lines 43-46: `<li><strong>Limit:</strong> 1 request per second per command</li>` / `<li><strong>Response:</strong> 429 status code with error message if exceeded</li>`
WHY:  'Per command' means the bucket is keyed by endpoint, so a client can legally hit 11 different endpoints in the same second. That is a materially different limiter than a per-key one.

### [api-docs] Endpoint 1 — POST /sessions/delUsers. Query: apiKey (required), apiSecret (required), sessionID (required). Body: `{"delUsers": ["user1@example.com", "user2@example.com"]}`. Response: `{"success": true, "deletedUsers": [...]}`. Also unsubscribes users from FCM alerts.
CITE: line 49: `<p><strong>POST</strong> <code>/sessions/delUsers</code></p>`; line 50: `Removes users from a session and unsubscribes them from FCM alerts.`; lines 54-56 params; lines 59-62 body; lines 69-73 response
WHY:  The only mutation endpoint with a JSON array body keyed `delUsers` (not `users`) — the two user endpoints use different body key names.

### [api-docs] delUsers is the only endpoint with a distinct 400 case for an empty payload: `400: No users provided for deletion` in addition to `400: Invalid session`.
CITE: lines 76-79: `<li><code>403</code>: Invalid API credentials or disabled API</li>` / `<li><code>429</code>: Rate limit exceeded</li>` / `<li><code>400</code>: No users provided for deletion</li>` / `<li><code>400</code>: Invalid session</li>`
WHY:  Fails loud on an empty delete rather than silently succeeding — a behaviour to preserve.

### [page-source] COPY/page-source is the authored server-side source (pre-JavaScript), while home-page/file is a live DOM serialization of the same page. Void elements here are XHTML self-closed and character entities are unresolved.
CITE: COPY/page-source:6 ` <meta charset="utf-8" />` and :476 ` &copy; 2026 ProTradingRoom&trade;` — versus home-page/file:4 ` <meta charset="utf-8">` and :511 ` © 2026 ProTradingRoom™`
WHY:  Tells us which file to treat as the template ground truth (this one) and which as the runtime ground truth (home-page/file). Copyright year is 2026 in both.

### [page-source] 145 lines of inline `<style>` in the head define a complete marketplace + carousel UI that has ZERO consumers anywhere in the body of either capture. No element with class `marketplace-container`, `marketplace-card`, `marketplace-card-image`, `-placeholder`, `-price`, `-content`, `-header`, `-logo`, `-title`, `-tagline`, `carousel-inner`, `carousel-control`, `marketplace-centered-1`, `marketplace-centered-2`, id `marketplace-empty-section` or id `marketplace-btn` appears in the rendered body.
CITE: COPY/page-source:36-180 (the whole `<style>` block, e.g. :37 `.marketplace-container {`, :165 `#marketplace-empty-section h2 {`, :170 `#marketplace-btn {`); body read in full at :206-525 contains only #gdpr-banner, header.navbar, #hero, #second-option, a bare .row, #mobile, #cta, #footer
WHY:  The home page has a marketplace/carousel feature whose markup is conditionally rendered and was NOT rendered at capture time. Rebuilding from this evidence alone would produce styling for a section we have never seen; the presence of `#marketplace-empty-section` shows an empty-state branch exists.

### [page-source] The only authenticated entry points are a Bootstrap dropdown labelled "Register/Login" containing /login and /register.
CITE: COPY/page-source:337-341 `<a href="#" class="dropdown-toggle" data-toggle="dropdown"> Register/Login <b class="caret"></b> </a>` then `<li><a href="/login">Login</a></li>` / `<li><a href="/register">Register</a></li>`
WHY:  Route contract for the rebuild: /login and /register exist; there is no /dashboard, /rooms or /pricing link on the public home page.

## 2D. REFUTED — reported, then knocked down on re-read. DO NOT USE THESE.

### [rawHtml.html] Every Copy button is an inline DOM `onclick` handler calling `copyLinkToClipboard('<inputId>')` — NOT an Angular `ng-click`. All four instances are consistent.
CITE WAS: rawHtml.html:159 `onclick="copyLinkToClipboard('webinarRegLinkTxt')"`; :195 `onclick="copyLinkToClipboard('webinarLinkTxt')"`; :209 `onclick="copyLinkToClipboard('customLinkTxt')"`; :223 `onclick="copyLinkToClipboard('uniqueLinkTxt')"`; :238 `onclick="copyLinkToClipboard('appPairLink')"`
VERIFIER: VERDICT: the mechanism is CONFIRMED verbatim; the COUNT is wrong. The claim says "All four instances are consistent" while its own citation list names five, and the file contains five. Reporting false on the count only. FILE READ: /Users/billyribeiro/Desktop/trading-room-app/apps/controller/evidence-dumps/NEXT-STEP/gaps/rawHtml.html, lines 1-2662, read end to end with the Read tool in sequential slices. No search was used to reach any conclusion below. WHAT THE FILE ACTUALLY SAYS AT THE CITED LINES (all five exact, character for character): - :159 <button class="btn btn-info" type="button" onclick="copyLinkToClipboard('webinarRegLinkTxt')">Copy (icon on :160, <i class="fa fa-copy"></i>) - :195 <button class="btn btn-info" type="button" onclick="copyLinkToClipboard('webinarLinkTxt')">Copy (icon on :196) - :209 <button class="btn btn-info" type="button" onclick="copyLinkToClipboard('custom

### [rawHtml.html] THE COMMON SETTING PATTERN (Settings tab, line 576 onward). Every setting is a `<p class="form-control-static">` containing exactly three things in order: a `<label class="col-sm-2 control-label">` with the visible name, an `<a href="">` xeditable widget, then `<br><label class="muted">` help text. The anchor always carries `onaftersave="saveSessField('<field>')"` plus ONE of `editable-checkbox` /
CITE WAS: rawHtml.html:711-717 — `<p class="form-control-static">` / `<label class="col-sm-2 control-label">Show Roster ?</label>` / `<a href="" onaftersave="saveSessField('rosterVisibleToViewers')" editable-checkbox="sess.rosterVisibleToViewers" e-title="Show Roster ?" class="ng-scope ng-binding editable edi
VERIFIER: CITATION: EXACT. CLAIM: OVERREACHES — refuted as a universal rule. File: /Users/billyribeiro/Desktop/trading-room-app/apps/controller/evidence-dumps/NEXT-STEP/gaps/rawHtml.html (2662 lines). I read lines 1-2487 sequentially with Read (no grep). Line 272-274 confirms the 6th tab heading is "Settings"; the six `.tab-pane` divs open at 280 (Users), 447 (Text List), 454 (Branding), 479 (SSO Setup), 491 (User Stats), 576 (Settings) and the last closes at 2487 — so "line 576 onward = Settings tab" is correct. WHAT IS CONFIRMED (verbatim, lines 711-717): 711 `<p class="form-control-static">` 712 `<label class="col-sm-2 control-label">Show Roster ?</label>` 713 `<a href="" onaftersave="saveSessField('rosterVisibleToViewers')" editable-checkbox="sess.rosterVisibleToViewers" e-title="Show Roster ?" class="ng-scope ng-binding editable editable-click">` 714 `Yes!` (own line, deeply indented) 715 `</

### [rawHtml.html] Text settings render the literal placeholder `empty` and add the class `editable-empty`; there is no separate placeholder element. `editable-number` does the same but its placeholder text is `0`, and it still carries `editable-empty`.
CITE WAS: rawHtml.html:756-758 — `<a href="" onaftersave="saveSessField('simUserCount')" editable-number="sess.simUserCount" e-title="Simulated Count?" class="ng-scope ng-binding editable editable-click editable-empty">` … `0`
VERIFIER: CITATION IS EXACT, CLAIM OVERREACHES. I read /Users/billyribeiro/Desktop/trading-room-app/apps/controller/evidence-dumps/NEXT-STEP/gaps/rawHtml.html in full (lines 1-2662) with the Read tool. WHAT IS CONFIRMED 1. Lines 756-758 are verbatim as cited: `<a href="" onaftersave="saveSessField('simUserCount')" editable-number="sess.simUserCount" e-title="Simulated Count?" class="ng-scope ng-binding editable editable-click editable-empty">` with the inner text `0` on line 757 and `</a>` on line 758. 2. "There is no separate placeholder element" is CONFIRMED. Across every editable in the file, the text sits directly inside the `<a>`; there is no inner span/i/placeholder wrapper anywhere. 3. An EMPTY editable-text / editable-textarea does render the literal string `empty` and does carry `editable-empty`. Examples read: line 485 `editable-text="sess.ssoHost"` -> `empty`; line 703 `editable-textare

### [rawHtml.html] DEVIATION — 'Custom login error message' is the only `editable-textarea` in the range that uses `e-title` instead of `e-label`. Every other textarea row uses `e-label="…:"`.
CITE WAS: rawHtml.html:737 `<a href="" onaftersave="saveSessField('loginErrorMsg')" editable-textarea="sess.loginErrorMsg" e-title="Login error message" class="ng-scope ng-binding editable editable-click editable-empty">empty</a>`
VERIFIER: CITATION: exact. /Users/billyribeiro/Desktop/trading-room-app/apps/controller/evidence-dumps/NEXT-STEP/gaps/rawHtml.html line 737 reads character-for-character as quoted: <a href="" onaftersave="saveSessField('loginErrorMsg')" editable-textarea="sess.loginErrorMsg" e-title="Login error message" class="ng-scope ng-binding editable editable-click editable-empty">empty</a> — preceded at 736 by <label class="col-sm-2 control-label">Custom login error message</label> and followed at 738 by <br><label class="muted">On the login error it will display this message to users</label>. CLAIM REFUTED on its universal quantifier. I read the whole file (lines 1-2662) in sequential Read slices. Line 737 is NOT the only editable-textarea that uses e-title. Seven others do, all in the "DON'T TOUCH" block near the end: - 2228 editable-textarea="sess.media_relays" e-title="Repeaters:" - 2275 editable-textar

### [rawHtml.html] The canonical settings row in this range is a fixed 3-part pattern: `<p class="form-control-static">` wrapping a `<label class="col-sm-2 control-label">` and an `<a href="" onaftersave="saveSessField('FIELD')" editable-TYPE="sess.FIELD" ...>`. The anchor always carries the rendered class list `ng-scope ng-binding editable editable-click`, with `editable-empty` appended only when the displayed valu
CITE WAS: rawHtml.html:1535-1538 — `<p class="form-control-static">` / `<label class="col-sm-2 control-label">Positions Iframe Url</label>` / `<a href="" onaftersave="saveSessField('positionsIframeUrl')" editable-textarea="sess.positionsIframeUrl" e-label="URL:" class="ng-scope ng-binding editable editable-cl
VERIFIER: THE QUOTE IS ACCURATE; THE GENERALISATION AROUND IT IS NOT. I read all 2662 lines of /Users/billyribeiro/Desktop/trading-room-app/apps/controller/evidence-dumps/NEXT-STEP/gaps/rawHtml.html with the Read tool. 1) The citation itself checks out verbatim. Lines 1535-1538 are exactly: 1535 <p class="form-control-static"> 1536 <label class="col-sm-2 control-label">Positions Iframe Url</label> 1537 <a href="" onaftersave="saveSessField('positionsIframeUrl')" editable-textarea="sess.positionsIframeUrl" e-label="URL:" class="ng-scope ng-binding editable editable-click editable-empty">empty</a> 1538 </p> Nothing is misquoted. But that one row is NOT the canonical shape of the range; it is one of the minority of rows that happens to have only two children. 2) "Fixed 3-part pattern" is refuted. The majority shape in the settings tab is FOUR parts — label, anchor, `<br>`, and a help `<label>` (usual

### [rawHtml.html] Four editable types appear in this range and they split by attribute: `editable-textarea` and `editable-text` take `e-label`, `editable-checkbox` takes `e-title`, `editable-number` takes `e-title` in two of three cases. Checkboxes NEVER carry `editable-empty`; their body text is whitespace-padded `No` or `Yes!`.
CITE WAS: rawHtml.html:1543 `editable-checkbox="sess.positionsIframe" e-title="Enable positions iframe?" class="ng-scope ng-binding editable editable-click">` then line 1544 ` No`
VERIFIER: CITATION ITSELF: VERBATIM CORRECT. Line 1543 reads exactly `<a href="" onaftersave="saveSessField('positionsIframe')" editable-checkbox="sess.positionsIframe" e-title="Enable positions iframe?" class="ng-scope ng-binding editable editable-click">` and line 1544 is ` No`. Nothing is misquoted. WHAT IS REFUTED (I read all 2,662 lines of /Users/billyribeiro/Desktop/trading-room-app/apps/controller/evidence-dumps/NEXT-STEP/gaps/rawHtml.html sequentially with the Read tool): 1. "Four editable types appear in this range" — the file contains SIX live editable-* directives, not four. Besides editable-text / editable-textarea / editable-checkbox / editable-number there are: - `editable-combodate="sess.webinarDate"` (line 136, with e-max-year/e-data-format/e-min-year) - `editable-select="sess.authMode "` (line 149, with e-ng-options) - `editable-date="statsDate"` and `editable-date="statsDateEnd"`

### [rawHtml.html] Only three checkboxes in the entire range render `Yes!` rather than `No`: hasChannelTabs, h264Enabled, useV3. Everything else is off.
CITE WAS: rawHtml.html:1627 `Yes!` (sess.hasChannelTabs), rawHtml.html:1994 `Yes!` (sess.h264Enabled), rawHtml.html:2110 `Yes!` (sess.useV3)
VERIFIER: REFUTED — the three cited lines are genuine and correctly quoted, but the claim "only three checkboxes in the entire range render Yes!" is false. There are TEN. The three citations check out exactly as written: - rawHtml.html:1626-1627 — `<a href="" onaftersave="saveSessField('hasChannelTabs')" editable-checkbox="sess.hasChannelTabs" e-title="Chat Channels?" class="ng-scope ng-binding editable editable-click">` / `Yes!` (label line 1625: "OffTopic Channels/Tabs") - rawHtml.html:1993-1994 — `editable-checkbox="sess.h264Enabled" e-title="Use h264 codec ?"` / `Yes!` (label line 1992: "Use h264 codec?") - rawHtml.html:2109-2110 — `editable-checkbox="sess.useV3" e-title="Use v3?"` / `Yes!` (label line 2108: "Use v3? (DON'T!)") But reading the whole file end to end, ten `editable-checkbox` anchors render `Yes!`, seven of which the claim misses — and all seven sit BEFORE the first cited line, s

### [rawHtml.html] Only five non-empty non-checkbox values exist in this range: tipMeBtnTxt=`Tip Me?`, runawayRecMinutes=`5`, ptrMobileAppExpirePairCodeDays=`7`, mobileAppExpireNotificationsDays=`14`, media_max_bitrate=`512000`, media_fir_rate=`5`, chatServerURL=`/talk`.
CITE WAS: rawHtml.html:1559 `>Tip Me?</a>`; 1820 `5`; 2063 `7`; 2071 `14`; 2191 `>512000</a>`; 2197 `>5</a>`; 2255 `>/talk</a>`
VERIFIER: All seven cited lines are genuinely present and correctly quoted, but the claim is self-contradictory and its exhaustiveness assertion is wrong, so it is REFUTED. VERIFIED PRESENT (read, not searched; file read contiguously 1540-2277 in four Read slices): - 1559: <a href="" onaftersave="saveSessField('tipMeBtnTxt')" editable-textarea="sess.tipMeBtnTxt" e-label="Text:" class="ng-scope ng-binding editable editable-click">Tip Me?</a> - 1819-1821: editable-number="sess.runawayRecMinutes" e-title="Minutes of recording inactivity?" with text `5` on line 1820 - 2062-2064: editable-number="sess.ptrMobileAppExpirePairCodeDays" e-title="PTR code expire:" with text `7` on line 2063 - 2070-2072: editable-number="sess.mobileAppExpireNotificationsDays" e-title="PUSH expire days:" with text `14` on line 2071 - 2191: editable-text="sess.media_max_bitrate" e-label="BitRate" ...>512000</a> - 2197: editabl

### [rawHtml.html] DEVIATION: superClusterExpectedServerCount is the only editable-number that uses `e-label` (not `e-title`) AND is the only anchor carrying `editable-empty` while displaying `0` rather than the word `empty`.
CITE WAS: rawHtml.html:2149 — `<a href="" onaftersave="saveSessField('superClusterExpectedServerCount')" editable-number="sess.superClusterExpectedServerCount" e-label="Expected Server Count" class="ng-scope ng-binding editable editable-click editable-empty">0</a>`
VERIFIER: CITATION IS VERBATIM CORRECT, BUT THE CLAIM OVERREACHES — one of its two conjuncts is false. Read method: entire file /Users/billyribeiro/Desktop/trading-room-app/apps/controller/evidence-dumps/NEXT-STEP/gaps/rawHtml.html, lines 1-2662 (wc -l = 2662), read end to end with the Read tool in sequential slices (1-400, 400-799, 799-1198, 1199-1598, 1599-1998, 1999-2158, 2199-2438, 2438-2662, plus the initial 2120-2199 window). No grep was used to decide what to read. 1) The cited text at line 2149 is present exactly as quoted: <a href="" onaftersave="saveSessField('superClusterExpectedServerCount')" editable-number="sess.superClusterExpectedServerCount" e-label="Expected Server Count" class="ng-scope ng-binding editable editable-click editable-empty">0</a> (label at line 2148: "Super Cluster Expected Server Count"; muted help at 2151: "(Expected number of servers needed to handle the session)

### [test] a
CITE WAS: b
VERIFIER: REFUTED — the claim/citation pair is degenerate, not a readable assertion. CLAIM was the single character "a" and CITATION the single character "b". "b" does not resolve to any location in /Users/billyribeiro/Desktop/trading-room-app/apps/controller/evidence-dumps/COPY/login-page-source — it is not a line number (the file is 168 lines, 16095 bytes), not a byte offset, not a CSS selector present in the file, and not a substring anchor I could locate by reading. And "a" states nothing that can be checked against a file. There is nothing here to confirm, so the default of REFUTED stands. What the file actually is (read in full with the Read tool, lines 1-168, no sampling): It is the raw served HTML shell of the PTRChat login page — an Angular app shell, not a rendered login form. There is no login markup in it at all: the entire body is lines 165-167, `<body>` containing exactly one element

### [page-source] Nothing in COPY/page-source's authored markup is missing from home-page/file. Reading both end to end, the two are section-for-section identical in content; every difference is serialization syntax or runtime injection. The COPY-only differences are exactly: (a) a leading blank line, (b) self-closing `/>` on void elements, (c) unresolved `&copy;`/`&trade;`/`&amp;` entities, (d) `<head>` on its own
CITE WAS: COPY/page-source:1 (empty), :2-3 `<html lang="en">` / ` <head>`, :207-220 (gdpr-banner div split across 14 lines) — versus home-page/file:1 `<html lang="en"><head>` and :245-255 (same div in 11 lines)
VERIFIER: CITATIONS ARE CORRECT and the load-bearing half of the claim is CONFIRMED by a full parallel read of both files (COPY/page-source = 526 lines, home-page/file = 562 lines, every line read via the Read tool). REFUTED only on the closing enumeration, which says "the COPY-only differences are exactly (a)-(e)". VERIFIED CITATIONS: - /Users/billyribeiro/Desktop/trading-room-app/apps/controller/evidence-dumps/COPY/page-source:1 is an empty line; :2 is `<html lang="en">`; :3 is ` <head>`. - COPY/page-source:207-220 is the gdpr-banner opening tag split across 14 lines: 207 `<div`, 208 `id="gdpr-banner"`, 209 `style="`, 210-218 the nine declarations, 219 the closing `"`, 220 `>`. - home-page/file:1 is `<html lang="en"><head>`; home-page/file:245-255 is the same div in 11 lines, 245 `<div id="gdpr-banner" style="` through 255 ` ">`. VERIFIED SUBSTANCE: nothing in COPY's authored markup is missing f

### [page-source] home-page/file contains runtime-injected material that COPY/page-source has none of: ShareThis panorama.js + pxcelframe iframe, eight Tawk.to twk-*.js chunk scripts, ga.js, async-buttons.js, a DoubleClick conversion beacon, two injected Tawk `<style>` blocks, three Tawk iframes, `#stcpDiv` / `#stwrapper` / `#stOverlay`, and `cz-shortcut-listen="true"` on the body.
CITE WAS: home-page/file:181, :203, :244 `<body id="home4" cz-shortcut-listen="true">`, :562 `<div id="stcpDiv" style="position: absolute; top: -1999px; left: -1988px;">ShareThis Copy and Paste</div>` — none of these strings exist anywhere in COPY/page-source, whose body tag is :206 ` <body id="home4">`
VERIFIER: VERDICT: the citations are real and accurately quoted, but the claim as written overreaches on two counts — an "eight/two" miscount and an absence assertion that is false for one named string. Read both files in full: /Users/billyribeiro/Desktop/trading-room-app/apps/controller/evidence-dumps/home-page/file lines 1-562, and /Users/billyribeiro/Desktop/trading-room-app/apps/controller/evidence-dumps/COPY/page-source lines 1-526. WHAT IS CONFIRMED, verbatim from the files: home-page/file:181 — one physical line carrying, in order: `<script async="" src="https://platform-api.sharethis.com/panorama.js"></script>`; `<iframe id="pxcelframe" title="pxcelframe" src="//t.sharethis.com/a/t_.htm?ver=1.2087.23428&amp;cid=c010#rnd=1785589655738&...&rdn=protradingroom.com&...&cc=US&cont=NA&rc=CT" style="display: none;"></iframe>`; six Tawk scripts `twk-main.js`, `twk-vendor.js`, `twk-chunk-vendors.js`

### [page-source] Every call to action on the page routes to /contact — there are five of them and no pricing, features, or demo-signup route anywhere.
CITE WAS: COPY/page-source:345 `<a href="/contact"><i class="fa fa-envelope"></i> Contact Us</a>`; :362 `<a href="/contact" class="button button-large button-primary">Learn More</a>`; :422 `<a href="/contact" class="button button-small">Get a free demo room</a>`; :452 `<a href="/contact" class="button button-
VERIFIER: VERDICT: the five citations are all verbatim-accurate, but the claim's absolute scope is refuted by line 340. Read in full via the Read tool, lines 1-527 (wc -l = 526), file /Users/billyribeiro/Desktop/trading-room-app/apps/controller/evidence-dumps/COPY/page-source. WHAT IS CONFIRMED (each cited line opened and read; text matches exactly, at exactly the cited line number): - :345 `<a href="/contact"><i class="fa fa-envelope"></i> Contact Us</a>` — exact, inside `<ul class="nav navbar-nav navbar-right">` (nav opens :334). - :362 `<a href="/contact" class="button button-large button-primary">Learn More</a>` — exact, inside `<div class="animated fadeInUp" style="text-align: center">` (:360) in `#hero` (:352). - :422 `<a href="/contact" class="button button-small">Get a free demo room</a>` — exact, wrapped in `<h3 style="text-align: center">` (:421). - :452 `<a href="/contact" class="button

## 2E. UNVERIFIED (reported beyond the per-file verify cap — NOT settled)
- [sheet-2.css] Button variant base colours (all rgb() as re-serialised): .btn-default #fff bg / #333 text / #ccc border; .btn-primary #337ab7 bg / #2e6da4 border; .btn-success #5cb85c bg / #4cae4c border; .btn-info #5bc0de bg / #46b8da border; .btn-warnin  [CITE sheet-2.css:787 `.btn-default { color: rgb(51, 51, 51); background-color: rgb(255, 255, 255); border-color: rgb(204, 204, 204); }`; :795 `.btn-primary { color: ]
- [sheet-2.css] .btn-link is a text button: font-weight 400, colour #337ab7, border-radius 0, transparent background and no box-shadow in every state, transparent border in every state, and hover/focus goes #23527c with underline. Disabled goes #777 with n  [CITE sheet-2.css:835 `.btn-link { font-weight: 400; color: rgb(51, 122, 183); border-radius: 0px; }`; :836 `.btn-link, .btn-link.active, .btn-link:active, .btn-link[]
- [sheet-2.css] Pressed/active state on every button is an inset shadow, not a colour-only change: `box-shadow: rgba(0, 0, 0, 0.125) 0px 3px 5px inset`, plus `outline: 0px` and `background-image: none`. Disabled buttons get opacity 0.65 and no shadow.  [CITE sheet-2.css:784 `.btn.active, .btn:active { background-image: none; outline: 0px; box-shadow: rgba(0, 0, 0, 0.125) 0px 3px 5px inset; }`; :785 `.btn.disabled, .]
- [sheet-2.css] .dropdown-menu: absolute, top 100%, z-index 1000, min-width 160px, padding 5px 0, margin 2px 0 0, font-size 14px, white bg, border 1px solid rgba(0,0,0,0.15), radius 4px, shadow `rgba(0, 0, 0, 0.176) 0px 6px 12px`, background-clip padding-b  [CITE sheet-2.css:856 `.dropdown-menu { position: absolute; top: 100%; left: 0px; z-index: 1000; display: none; float: left; min-width: 160px; padding: 5px 0px; margi]
- [sheet-2.css] Dropdown item metrics: `.dropdown-menu > li > a` padding 3px 20px, font-weight 400, line-height 1.42857, colour #333, white-space nowrap; hover/focus is colour rgb(38,38,38) on background #f5f5f5; the active item is white on #337ab7; the di  [CITE sheet-2.css:859 `.dropdown-menu > li > a { display: block; padding: 3px 20px; clear: both; font-weight: 400; line-height: 1.42857; color: rgb(51, 51, 51); white]
- [sheet-2.css] .nav-tabs: 1px #ddd bottom border on the strip; each li floats left with margin-bottom -1px so the active tab overlaps it; each anchor has margin-right 2px, 1px transparent border and radius 4px 4px 0 0; the ACTIVE tab is #555 text on white  [CITE sheet-2.css:950 `.nav-tabs { border-bottom: 1px solid rgb(221, 221, 221); }`; :951 `.nav-tabs > li { float: left; margin-bottom: -1px; }`; :952 `.nav-tabs > li ]
- [sheet-2.css] Tab panes are hidden by `.tab-content > .tab-pane { display: none; }` and shown by `.tab-content > .active { display: block; }` — the shown-ness is driven by an `.active` class on the pane, matched as a direct child of `.tab-content`.  [CITE sheet-2.css:990 `.tab-content > .tab-pane { display: none; }`; :991 `.tab-content > .active { display: block; }`]
- [sheet-2.css] .table: width 100%, max-width 100%, margin-bottom 20px; every cell padding 8px, line-height 1.42857, vertical-align top, border-top 1px solid #ddd; thead th is vertical-align bottom with a 2px #ddd bottom border; the very first row's top bo  [CITE sheet-2.css:650 `.table { width: 100%; max-width: 100%; margin-bottom: 20px; }`; :651 `.table > tbody > tr > td, ... > thead > tr > th { padding: 8px; line-heig]
- [sheet-2.css] Striping is `:nth-of-type(2n+1)` (odd rows) at background #f9f9f9; hover is #f5f5f5; .table-condensed drops cell padding to 5px. Row contextual states: .active #f5f5f5, .success #dff0d8, .info #d9edf7, .warning #fcf8e3, .danger #f2dede.  [CITE sheet-2.css:660 `.table-striped > tbody > tr:nth-of-type(2n+1) { background-color: rgb(249, 249, 249); }`; :661 `.table-hover > tbody > tr:hover { background-co]
- [sheet-2.css] .table-responsive only becomes a scroller below 768px: at base it is just `min-height: 0.01%; overflow-x: auto;`, and only inside `@media screen and (max-width: 767px)` does it gain the 1px #ddd border, 15px bottom margin and `white-space:   [CITE sheet-2.css:674 `.table-responsive { min-height: 0.01%; overflow-x: auto; }`; :675 `@media screen and (max-width: 767px) {`; :676 `.table-responsive { width: 10]
- [sheet-2.css] .form-control: block, width 100%, height 34px, padding 6px 12px, font-size 14px, line-height 1.42857, colour #555, white bg, border 1px solid #ccc, radius 4px, inset shadow `rgba(0,0,0,0.075) 0px 1px 1px`, transition on border-color and box  [CITE sheet-2.css:694 `.form-control { display: block; width: 100%; height: 34px; padding: 6px 12px; font-size: 14px; line-height: 1.42857; color: rgb(85, 85, 85); ba]
- [sheet-2.css] Form size variants: .input-sm / .form-group-sm .form-control = height 30px, padding 5px 10px, 12px, line-height 1.5, radius 3px; .input-lg / .form-group-lg .form-control = height 46px, padding 10px 16px, 18px, line-height 1.33333, radius 6p  [CITE sheet-2.css:718 `.input-sm { height: 30px; padding: 5px 10px; font-size: 12px; line-height: 1.5; border-radius: 3px; }`; :725 `.input-lg { height: 46px; padding]
- [sheet-2.css] .panel: bottom margin 20px, white bg, 1px transparent border, radius 4px, shadow `rgba(0, 0, 0, 0.05) 0px 1px 1px`. .panel-body padding 15px. .panel-heading padding 10px 15px with a 1px TRANSPARENT bottom border and 3px top corner radii. .p  [CITE sheet-2.css:1290 `.panel { margin-bottom: 20px; background-color: rgb(255, 255, 255); border: 1px solid transparent; border-radius: 4px; box-shadow: rgba(0, 0, ]
- [sheet-2.css] Panel contextual variants supply the border and heading colours: .panel-default border #ddd, heading #333 on #f5f5f5; .panel-primary border+heading bg #337ab7 with white text; .panel-success #d6e9c6 border / #3c763d on #dff0d8; .panel-info   [CITE sheet-2.css:1329 `.panel-default { border-color: rgb(221, 221, 221); }`; :1330 `.panel-default > .panel-heading { color: rgb(51, 51, 51); background-color: rgb(]
- [sheet-2.css] A `.panel > .table` has its bottom margin zeroed and its first row's top border removed, and `.panel > .table-bordered` has its outer border and first/last column borders stripped — the panel supplies the frame.  [CITE sheet-2.css:1304 `.panel > .panel-collapse > .table, .panel > .table, .panel > .table-responsive > .table { margin-bottom: 0px; }`; :1315 `.panel > .table > tbo]
- [sheet-2.css] Modal: `.modal` fixed, inset 0, z-index 1050, display none, and `.modal-backdrop` z-index 1040 at solid black with `.in` opacity 0.5. `.modal-content` white, 1px rgba(0,0,0,0.2) border, radius 6px, shadow `rgba(0,0,0,0.5) 0px 3px 9px`. Entr  [CITE sheet-2.css:1371 `.modal { position: fixed; inset: 0px; z-index: 1050; display: none; overflow: hidden; outline: 0px; }`; :1372 `.modal.fade .modal-dialog { tra]
- [sheet-2.css] Modal widths: below 768px the dialog is `width: auto; margin: 10px`. At >=768px it becomes `width: 600px; margin: 30px auto` with a bigger shadow, and `.modal-sm` is 300px. `.modal-lg` is 900px and only takes effect at >=992px. `.modal-head  [CITE sheet-2.css:1375 `.modal-dialog { position: relative; width: auto; margin: 10px; }`; :1389-1393 `@media (min-width: 768px) { .modal-dialog { width: 600px; margi]
- [sheet-2.css] .label is an INLINE element (display: inline) with padding 0.2em 0.6em 0.3em, font-size 75%, font-weight 700, line-height 1, white text, radius 0.25em, and it disappears entirely when empty. Variants: default #777, primary #337ab7, success   [CITE sheet-2.css:1162 `.label { display: inline; padding: 0.2em 0.6em 0.3em; font-size: 75%; font-weight: 700; line-height: 1; color: rgb(255, 255, 255); text-align:]
- [sheet-2.css] .badge is inline-block, min-width 10px, padding 3px 7px, font-size 12px, font-weight 700, line-height 1, white on #777, radius 10px, hidden when empty. Inside a .btn it shifts up 1px; inside .btn-xs it sits at top 0 with 1px 5px padding. In  [CITE sheet-2.css:1178 `.badge { display: inline-block; min-width: 10px; padding: 3px 7px; font-size: 12px; font-weight: 700; line-height: 1; color: rgb(255, 255, 255]
- [sheet-2.css] Global typography: html font-size 10px, body is `"Helvetica Neue", Helvetica, Arial, sans-serif` at 14px / line-height 1.42857 / colour #333 on white; links are #337ab7 with no underline, hover #23527c underlined; `* , ::after, ::before` ar  [CITE sheet-2.css:325 `html { font-size: 10px; -webkit-tap-highlight-color: rgba(0, 0, 0, 0); }`; :326 `body { font-family: "Helvetica Neue", Helvetica, Arial, sans-s]
- [sheet-2.css] The glyphicon content values that are legible (non-Private-Use codepoints) are exactly these eleven: asterisk `*`, plus `+`, eur/euro `€`, minus `−`, cloud `☁`, envelope `✉`, pencil `✏`, tent `⛺`, hourglass `⌛`, yen/jpy `¥`, ruble/rub `₽`.   [CITE sheet-2.css:61 `.glyphicon-asterisk::before { content: "*"; }`; :62 `.glyphicon-plus::before { content: "+"; }`; :63 `.glyphicon-eur::before, .glyphicon-euro::b]
- [sheet-2.css] The .glyphicon base rule sets `position: relative; top: 1px` and font-weight 400 with `-webkit-font-smoothing: antialiased` — the icon is nudged down one pixel relative to its text baseline.  [CITE sheet-2.css:60 `.glyphicon { position: relative; top: 1px; display: inline-block; font-family: "Glyphicons Halflings"; font-style: normal; font-weight: 400; lin]
- [sheet-2.css] I found no rule in this file that I can cite as a customisation away from stock Bootstrap 3. The textual deltas I did observe versus the published 3.3.7 minified source are all shapes Chrome produces when re-serialising the CSSOM: vendor pr  [CITE sheet-2.css:27 `button, html input[type="button"], input[type="reset"], input[type="submit"] { appearance: button; cursor: pointer; }`; :660 `.table-striped > t]
- [sheet-2.css] Utility classes that will be load-bearing on the Manage markup: `.pull-right`/`.pull-left` are `float: ... !important`, `.hidden` and `.hide` are `display: none !important`, `.clearfix` and a long list of components get `display: table; con  [CITE sheet-2.css:1474 `.pull-right { float: right !important; }`; :1475 `.pull-left { float: left !important; }`; :1476 `.hide { display: none !important; }`; :1480 ]
- [sheet-2.css] The print stylesheet at the top of the file forces everything to black on no background, hides `.navbar` entirely, and prints link hrefs in parentheses after the link text.  [CITE sheet-2.css:40-58, notably :41 `*, ::after, ::before { color: rgb(0, 0, 0) !important; text-shadow: none !important; background: 0px 0px !important; box-shadow:]
- [rawHtml.html] The Vanity Link group has TWO buttons in one `input-group-btn` span: an `Edit` button `btn btn-warning` with `ng-click="setCustomRoomURL()"` and `fa fa-edit`, followed by the Copy button.  [CITE rawHtml.html:204-213 — `<span class="input-group-btn">` / `<button class="btn btn-warning" type="button" ng-click="setCustomRoomURL()">Edit` / `<i class="fa fa-]
- [rawHtml.html] Unique Link input `id="uniqueLinkTxt"` is readonly and holds a real two-UUID composite value under the `/room/` path.  [CITE rawHtml.html:215-217 — `<label class="col-sm-2 control-label">Unique Link:</label>` / `<input type="text" class="form-control col-md-6" id="uniqueLinkTxt" reado]
- [rawHtml.html] The Unique Link group's first button is `Generate`, `btn btn-primary`, `ng-click="setUniqueRoomURL()"`, icon `fa fa-link` — followed by the Copy button.  [CITE rawHtml.html:218-226 — `<button class="btn btn-primary" type="button" ng-click="setUniqueRoomURL()">Generate` / `<i class="fa fa-link"></i>` ... `<button class=]
- [rawHtml.html] A fourth link row exists — 'App Pair Link', `id="appPairLink"` — but it is HIDDEN in this capture (`class="ng-hide"` on its `ng-show="sess.hasAppPairLink"` wrapper) and its value is a bare prefix with no token: `https://protradingroom.com/r  [CITE rawHtml.html:229-232 — `<div ng-show="sess.hasAppPairLink" class="ng-hide">` / `<label class="col-sm-2 control-label">App Pair Link:</label>` / `<input type="te]
- [rawHtml.html] The App Pair Link row contains a COMMENTED-OUT Edit button in the shipped markup — dead source retained inside an HTML comment.  [CITE rawHtml.html:234-236 — `<!-- <button class="btn btn-warning" type="button" ng-click="setCustomRoomURL()">Edit` / `<i class="fa fa-edit"></i>` / `</button> -->`]
- [rawHtml.html] A 'Registration' email-reminder block precedes the link group: an Event Time text input bound to `webinarTimeTxt` with placeholder `at 7pm EST`, and a `<pre>` email preview with a fixed 130px scrolling height.  [CITE rawHtml.html:167-169 — `<label class="col-sm-2 control-label">Event Time (for email template):</label>` / `<div class="col-sm-10 ">` / `<input type="text" ng-mo]
- [rawHtml.html] The email preview body contains the live room name 'Room 3627' and a dual-`<strong>` ng-show pair where one is hidden; the unique link is a literal underscore placeholder in the preview text.  [CITE rawHtml.html:178-180 — `This is a friendly reminder to attend the session "Room 3627".` / `We'll get started at <strong ng-show="!webinarTimeTxt">FILL TIME ABOV]
- [rawHtml.html] The send button's handler name contains a typo in the source: `sendWeminarEmailReminder` (missing the 'b' in 'Webinar').  [CITE rawHtml.html:182 — `<button class="btn btn-default" type="button" ng-click="sendWeminarEmailReminder(webinarTimeTxt)">Send Emails Now</button>`]
- [rawHtml.html] A loading indicator sits between the link block and the tab strip: `ng-show="dataLoading"`, hidden in this capture, using a GIF with NO width/height attributes.  [CITE rawHtml.html:250-252 — `<div ng-show="dataLoading" style="padding: 25px; text-align: center;" class="div animated fadeIn infinite ng-hide">` / `<img src="app/im]
- [rawHtml.html] The tab strip is a `<ul class="nav nav-tabs">` inside a `<div class="ng-isolate-scope">`, with six `<li>` tabs; each `<li>` carries a `heading="..."` attribute and each anchor is `<a href="" ng-click="select()" tab-heading-transclude="" cla  [CITE rawHtml.html:254-255 — `<div class="ng-isolate-scope">` / `<ul class="nav nav-tabs" ng-class="{'nav-stacked': vertical, 'nav-justified': justified}" ng-transclu]
- [rawHtml.html] The six tabs in DOM order, with visibility, are: Users (ACTIVE), Text List (HIDDEN), Branding (Logo / Landing Page), SSO Setup (HIDDEN), User Stats, Settings.  [CITE rawHtml.html:257 `heading="Users" class="ng-isolate-scope active"`; :260 `heading="Text List" ng-show="sess.twillioApiToken" class="ng-isolate-scope ng-hide"`; ]
- [rawHtml.html] The 'Text List' tab's gate reads a misspelled session key: `sess.twillioApiToken` (double-L 'twillio', not 'twilio').  [CITE rawHtml.html:260 — `<li ng-class="{active: active, disabled: disabled}" heading="Text List" ng-show="sess.twillioApiToken" class="ng-isolate-scope ng-hide">`]
- [rawHtml.html] The SSO Setup tab is gated on `sess.authMode=='sso'`, which is mutually exclusive with the Room-Link block's gate at line 190 (`webinarRoom || open || unamePW || allowPWLoginWithSSO`).  [CITE rawHtml.html:266 — `heading="SSO Setup" ng-show="sess.authMode=='sso'" class="ng-isolate-scope ng-hide"` vs :190 `ng-show="sess.authMode=='webinarRoom' || sess.]
- [rawHtml.html] Only ONE `tab-pane` is present in the DOM within my range — the active Users pane; it is emitted by an `ngRepeat` over `tabs` preceded by the repeat marker comment.  [CITE rawHtml.html:279-280 — `<div class="tab-content">` / `<!-- ngRepeat: tab in tabs --><div class="tab-pane ng-scope active" ng-repeat="tab in tabs" ng-class="{act]
- [rawHtml.html] The Users pane opens with a `<fieldset class="ng-scope">` and a right-floated toolbar `<div class="col-sm-4 pull-right">` holding three buttons: Add User / Invite, Export, and Load / Reload Users.  [CITE rawHtml.html:282-288 — `<fieldset class="ng-scope">` / `<div class="form-group ">` / `<div class="col-sm-4 pull-right">` / `<button class="btn btn-md btn-info m]
- [rawHtml.html] A Bootstrap dropdown labelled 'User List Actions' sits inline in the toolbar with hard-coded inline styles, toggled by `data-toggle="dropdown"` (no ng-click).  [CITE rawHtml.html:289-292 — `<div class="dropdown" style="display: inline-block; vertical-align: middle;">` / `<button class="btn btn-md dropdown-toggle btn-primary ]
- [rawHtml.html] Two dropdown items are conditionally absent — the capture contains two consecutive unrendered `ngIf` comment markers for `sess.authMode === 'unamePW'` at the top of the menu.  [CITE rawHtml.html:293-295 — `<ul role="menu" class="dropdown-menu">` / `<!-- ngIf: sess.authMode === 'unamePW' -->` / `<!-- ngIf: sess.authMode === 'unamePW' -->`]
- [rawHtml.html] The rendered 'User List Actions' menu has exactly 9 anchors plus one separator, in this order with these handlers and icons: Show Free Trials (`loadUsersFT()`, NO icon), Show BANNED (`loadBannedUsers()`, `fa fa-ban`), Show Mobile (`loadMobi  [CITE rawHtml.html:296-341 — e.g. :297-299 `<a href="" ng-click="loadUsersFT()">` / `Show Free Trials`; :302-303 `<a href="" ng-click="loadBannedUsers()">` / `<i clas]
- [rawHtml.html] The user search control is a `form-inline` form whose input is `type="search" name="title"` with a custom `ng-enter` directive, and whose `ng-model` value has a TRAILING SPACE: `ng-model="uSearch "`.  [CITE rawHtml.html:346-353 — `<form class="form-inline ng-pristine ng-valid">` / `<div class="form-group ">` / `<label class=" control-label ">Search Users</label>` /]
- [rawHtml.html] Labels in the link region are `col-sm-2 control-label` while the value columns differ per row: Event Time uses `col-sm-10 ` (trailing space) and Email Preview uses `col-sm-8`; the four link inputs are `form-control col-md-6` inside a plain   [CITE rawHtml.html:168 `<div class="col-sm-10 ">`; :175 `<div class="col-sm-8">`; :157/:193/:203/:217/:232 all `class="form-control col-md-6"`]
- [rawHtml.html] Structural separators between rows are explicit `<br>` tags, including two `<br clear="both">` (deprecated HTML4 attribute) around the email-preview block and a `<br>` before the tab strip.  [CITE rawHtml.html:165 `<br>`; :172 `<br clear="both">`; :184 `<br><br>`; :187 `<br clear="both">`; :249 `<br>`]
- [rawHtml.html] DEVIATION — 'Free Trial Password' is the only setting row whose `<p>` has NO `form-control-static` class, and its attribute order is reversed (`ng-show` before `class`). All its neighbours are `<p class="form-control-static ng-hide" ng-show  [CITE rawHtml.html:623 `<p ng-show="sess.authMode=='webinarRoom' || sess.authMode=='unamePW' || sess.allowPWLoginWithSSO" class="ng-hide">` vs rawHtml.html:618 `<p cl]
- [rawHtml.html] DEVIATION — three settings put their `<br><label class="muted">` help text OUTSIDE the closing `</p>` instead of inside it: Pair OK Redirect, Pair ERROR Redirect. Their help labels are siblings of the `<p>`, not children.  [CITE rawHtml.html:961-965 — `</p>` at 964 then `<br><label class="muted">Where to send users if the pairing succeeds</label>` at 965; same shape at 970-971 for pairE]
- [rawHtml.html] DEVIATION — 10 settings use a plain `<label>` for help text with NO `muted` class: usernameInstructions (843), showArchivesToSpecificPresenters (1070), banIPList (1097), reportEmail (1103), customJWTErrorMessage (1108), sendOpenCloseEmail (  [CITE rawHtml.html:1097 `<br><label>Comma separated list of banned IPs</label>` vs rawHtml.html:1092 `<br><label class="muted">If enabled, you will get an email to th]
- [rawHtml.html] DEVIATION — 14 settings have NO help label at all: customFaviconURL (654-657), login_webhook_url (665-668), logout_webhook_url (670-673), pairSecretKey (951-954), ignoreAutoOpenCloseOnWeekend (1126-1131), archiveChatLog (1201-1207), isMainR  [CITE rawHtml.html:1397-1403 — `<p class="form-control-static"><label class="col-sm-2 control-label">Is Main Room?</label><a href="" onaftersave="saveSessField('isMai]
- [rawHtml.html] DEVIATION — three settings have NO `e-label` and NO `e-title` at all, and two of those three are the range's only bare `editable-text` uses in the Settings tab: imgurClientID and imgurApiKey use `editable-text`, imgurRapidKey uses `editable  [CITE rawHtml.html:1440 `<a href="" onaftersave="saveSessField('imgurClientID')" editable-text="sess.imgurClientID" class="ng-scope ng-binding editable editable-click]
- [rawHtml.html] DEVIATION — 'Overwrite Cash Register Sound' is `editable-text` (not textarea) and its `e-label="URL"` is the only e-label in the range with no trailing colon. Every other e-label ends in `:` (e.g. `e-label="URL:"` at 703, 708, 1428, 1433).  [CITE rawHtml.html:660 `<a href="" onaftersave="saveSessField('overwriteCashRegisterSound')" editable-text="sess.overwriteCashRegisterSound" e-label="URL" class="ng-s]
- [rawHtml.html] NESTED SPANS inside help labels — only three settings in the range have markup inside their help text, all inline-styled underlines with no class: Room Password wraps two phrases, Free Trial Password wraps one.  [CITE rawHtml.html:611 `<br><label class="muted">Give this password to your <span style="text-decoration: underline">registered members</span> to enter the room. <spa]
- [rawHtml.html] TWO settings carry multi-line JSON literally inside their `<label class="muted">` help text, spanning many source lines: 'Alert Labels' (a 2-object array with name/hash/color/bgcolor) and 'Subscription Plans' (starts at 1466, continues past  [CITE rawHtml.html:1298-1311 — help label opens `JSON array of alert labels, i.e. [` and contains the literal objects `"name": "Day Trade", "hash": "DayTrade", "color]
- [rawHtml.html] Seven settings are conditionally hidden and currently rendered with `ng-hide` in their class (so present but not visible): JWT Secret Key (585), Allow PW based logins on SSO? (589), Token Expiration (601) — all `ng-show="sess.authMode=='jwt  [CITE rawHtml.html:585 `<p class="form-control-static ng-hide" ng-show="sess.authMode=='jwt'">`]
- [rawHtml.html] The Wordpress shortcode row is the only Settings row whose value is a read-only `<span class="ng-binding">` rather than an editable anchor, and it exposes the room id.  [CITE rawHtml.html:597-600 — `<label class="col-sm-2 control-label">Wordpress shortcode:</label>` / `<span class="ng-binding">[protradingroom room='6a6529b318781e20ed]
- [rawHtml.html] An empty `<p></p>` element exists in the Settings flow between the Allow-PW row and the Wordpress shortcode row, plus two commented-out blocks: a 'Load Settings' button (582) and a whole 'Custom URL / customRoomURL' setting (674-678, still   [CITE rawHtml.html:596 `<p></p>` ; rawHtml.html:582 `<!-- <button class="btn btn-md btn-info" ng-click="loadSettingsFromJSON()"><i class="fa fa-plus" aria-hidden="tru]
- [rawHtml.html] The Settings tab opens `<div class="form-vertical ng-scope">` then a SINGLE `<div class="form-group m0">` that is still open at line 1470 — one form-group wraps the entire settings list. Header row holds exactly two live buttons: Export Set  [CITE rawHtml.html:578-583 — `<div class="form-vertical ng-scope">` / `<div class="form-group m0">` / `<button class="btn btn-md btn-info" ng-click="exportSettingsToJ]
- [rawHtml.html] BRANDING TAB (454-478) — a `<fieldset class="ng-scope">` with ONE `<div class="form-group ">` (trailing space) holding: `<label class="col-sm-2 control-label ">Logo</label>`, a `col-sm-3` swatch with an inline black background, the logo `<i  [CITE rawHtml.html:458-464 — `<div class="col-sm-3 " style="background-color: #000; padding: 15px; ">` / `<img ng-src="/public/images/ptr_logo.png" class="navLogo " s]
- [rawHtml.html] BRANDING TAB — the Login Landing Page Editor is a text-angular WYSIWYG bound to `sess.description`, with its Save button nested INSIDE the `<h3>` heading. Its toolbar has 4 `btn-group`s; every toolbar button carries `disabled="disabled"` EX  [CITE rawHtml.html:473 `<h3 style="text-align: center; margin-bottom: 20px;">Login Landing Page Editor <button class="btn btn-info pull-right" ng-click="htmlDescChang]
- [rawHtml.html] SSO TAB (479-490) is a single setting and uses a DIFFERENT layout from Settings: `form-horizontal`, a `col-sm-4` label (not col-sm-2), the anchor wrapped in a `col-sm-8` column, `editable-text` (not textarea), no `e-label`, no help text.  [CITE rawHtml.html:481-488 — `<div class="form-horizontal ng-scope">` / `<div class="form-group m0">` / `<label class="col-sm-4 control-label">SSO Host</label>` / `<d]
- [rawHtml.html] USER STATS TAB (491-575) — date pickers use `editable-date` bound to BARE scope vars (`statsDate`, `statsDateEnd`, not `sess.*`), have NO `onaftersave`, use `href="#"` not `href=""`, and sit inside a `<p class="form-control-static">` with `  [CITE rawHtml.html:500-507 — `<label class="col-sm-4 control-label">Start Date:</label>` / `<a href="#" editable-date="statsDate" class="ng-scope ng-binding editable ]
- [rawHtml.html] USER STATS TAB — five `btn btn-md btn-info` buttons with FontAwesome icons that all carry `aria-hidden="true"` (unlike the Branding save icons at 473, which do not). Three are currently hidden.  [CITE rawHtml.html:511-515 — Load Stats `<i class="fa fa-user-plus" aria-hidden="true">` `ng-click="loadStats(statsDate,statsDateEnd,uSearchStat,filterFT,remDupes,sho]
- [rawHtml.html] USER STATS TAB — the Search Users input has trailing spaces baked into four attribute values, and renders in an invalid state on load.  [CITE rawHtml.html:523 `<input type="search " name="title " required=" " class="form-control ng-pristine ng-untouched ng-invalid ng-invalid-required" ng-model="uSearc]
- [rawHtml.html] USER STATS TAB — the four filter checkboxes use a completely different pattern from the Settings tab: a wrapping `<label>` containing a raw `<input type="checkbox" ng-model="…" class="ng-pristine ng-untouched ng-valid">` followed by `&nbsp;  [CITE rawHtml.html:527-529 — `<label><input type="checkbox" ng-model="filterFT" class="ng-pristine ng-untouched ng-valid">&nbsp;Show <span class="badge badge-danger">]
- [rawHtml.html] USER STATS TAB — the results region has a permanently-true guard, an empty-state h3 outside the fieldset, a loading block, a monthly table and a main table, all currently empty.  [CITE rawHtml.html:520 `<div ng-show="statXrefs.length&gt;0 || true">` (always true); rawHtml.html:542 `<h3 ng-hide="statXrefs.length&gt;0 || statXrefsMontly.length&g]
- [rawHtml.html] A readonly, non-editable `<input>` is embedded mid-list in the Settings tab, inside a conditional div gated on two settings, and it leaks the room id and the pairing URL shape.  [CITE rawHtml.html:955-959 — `<div ng-show="sess.hasAppPairLink &amp;&amp; sess.pairSecretKey" class="ng-hide">` / `<label>Sample link you would need to use to add ea]
- [rawHtml.html] e-title strings frequently do NOT match the visible label — this is systematic, not occasional. Confirmed pairs I read include: 'Disable Editing Username' / `e-title="Show Only Usernames in Roster?"`; 'Chat Only Room?' / `e-title="Disable S  [CITE rawHtml.html:834-835 `<label class="col-sm-2 control-label">Disable Editing Username</label>` / `<a href="" onaftersave="saveSessField('disableEditingUsername')]
- [rawHtml.html] e-label strings are copy-pasted across unrelated settings: `e-label="Nick Filter:"` appears on both 'Nickname filter for members' and 'Overwrite Clear Hour'; `e-label="MemberPlan Filter:"` on both Membership filter and Product filter; `e-la  [CITE rawHtml.html:648 `e-label="Nick Filter:"` (nickFilter) and rawHtml.html:1181 `e-label="Nick Filter:"` (chatAutoClearSpecialHour) ; rawHtml.html:682 and 687 both]
- [rawHtml.html] Two help texts contradict their own label's polarity in the source: 'Disable Emojis?' is documented as enabling emojis, and 'Disable Stars ?' is documented with 'If disabled'.  [CITE rawHtml.html:1250-1254 — `<label class="col-sm-2 control-label">Disable Emojis?</label>` … `<br><label class="muted">If enabled, Users will be able to add emoji]
- [rawHtml.html] Full ordered field list of the Settings tab within my range: ssoJWTSecret, allowPWLoginWithSSO, (wordpress shortcode span), tokenExpiresIn, webinarPW, webinarPW2, webinarPW3, webinarPWFreeTrial, deleteAlertPW, allRoomsWelcomeMatPW, needPass  [CITE rawHtml.html:587 (first, ssoJWTSecret) through rawHtml.html:1465 (last in range, `saveSessField('subscriptionPlans')`) — each name read from its own `onaftersav]
- [rawHtml.html] Note the source misspellings in field names and help text that must be preserved verbatim if these keys are wire-compatible: `disalowSporadicMultiLogins`, `disalowMultiLogins`, `styckyNonTradeAlert`, plus typos in prose: 'WordPRess', 'make   [CITE rawHtml.html:588 `Use this key in combination with the WordPRess plugin, or other JWT SSO, make it hard to getss, like: '5081b73a690762e2526bc1fef3c46eedf1ec883]
- [rawHtml.html] Only two settings show non-boolean/non-empty captured values in the range: Token Expiration `1d` and Simulated Count `0`. Everything else is `No`, `Yes!`, or `empty`.  [CITE rawHtml.html:603 `<a href="" onaftersave="saveSessField('tokenExpiresIn')" editable-textarea="sess.tokenExpiresIn" e-label="Expires In:" class="ng-scope ng-bind]
- [rawHtml.html] DEVIATION: four OBS/Restream fields carry NO `e-label` and no `e-title` at all.  [CITE rawHtml.html:1947 `editable-text="sess.obsStreamKey" class="ng-scope ng-binding editable editable-click editable-empty"`; also 1951 obsStreamSatusWebHookURL, 19]
- [rawHtml.html] DEVIATION: two settings rows are conditionally shown, and they are the only `ng-show` rows in the Settings body. Both were hidden at capture time (`ng-hide` class present) and both are `editable-text` while their sibling rows are `editable-  [CITE rawHtml.html:1705 `<p class="form-control-static ng-hide" ng-show="sess.hasProfanityFilter">` (Ignore List, sess.ingnoreBadWordsList) and rawHtml.html:1710 same]
- [rawHtml.html] DEVIATION: the Chat Tabs With Badges row is the only one with an interactive icon INSIDE the `control-label`, opening a dedicated editor modal.  [CITE rawHtml.html:1677 — `<label class="col-sm-2 control-label"><i class="fa fa-gear ms-2 cursor-pointer" title="Configure Chat Tabs" ng-click="openChatTabsWithBadge]
- [rawHtml.html] DEVIATION: the API secret row is the only settings row with a companion action button inside the same `<p>`, separated by a literal `&nbsp;`.  [CITE rawHtml.html:1506-1507 — `&nbsp;` then `<button class="btn btn-sm btn-warning" type="button" ng-click="generateNewApiSecret()"><i class="fa fa-random"></i> New ]
- [rawHtml.html] DEVIATION: one `<p class="form-control-static">` contains no label and no editable at all — just a link styled as a button to external API docs.  [CITE rawHtml.html:1512 — `<a class="btn btn-default" target="_blank" href="/public/html/api-docs.html?src=/public/html/POST_ROUTE_API_DOCUMENTATION.md">API POST Rout]
- [rawHtml.html] DEVIATION: two `<p class="form-control-static">` elements each hold TWO distinct settings separated by `<br><br>` instead of one setting per paragraph.  [CITE rawHtml.html:2130-2137 (ClusterID at 2132 and Backup ClusterID at 2135 in one `<p>`) and rawHtml.html:2142-2152 (superClusterID at 2144 and superClusterExpected]
- [rawHtml.html] DEVIATION: one explanatory `<label>` sits outside any paragraph, as a direct child of the settings div.  [CITE rawHtml.html:2046 — ` <label>Enable this to prevent media server soft reset each night...</label>` immediately after the `</p>` on 2045]
- [rawHtml.html] DEVIATION: three rows use bare text nodes as their hint instead of a `<label>` element, two of them prefixed with double `&nbsp;`.  [CITE rawHtml.html:2055 ` Use pub/sub for notifications`; rawHtml.html:2065 `&nbsp;&nbsp;If user does not log in from regular site, mobile app token will expire after]
- [rawHtml.html] Hint labels come in exactly two flavours and are not interchangeable: `<label class="muted">` and plain `<label>`. Both appear, sometimes on adjacent rows.  [CITE rawHtml.html:1606 `<br><label class="muted">If YES, Only Chrome, Firefox, and Opera are allowed in (no try anyhow link)...</label>` versus rawHtml.html:1621 `<l]
- [rawHtml.html] The DON'T TOUCH block is a heading whose middle word alone is the toggle, plus a collapsed-state placeholder paragraph, plus a `form-vertical` div that was collapsed at capture.  [CITE rawHtml.html:2103 — `<h3>DON'T <span ng-click="donttouchShow=!donttouchShow">TOUCH</span> These below unless you know what you are doing...</h3>`; 2104 `<p ng-h]
- [rawHtml.html] Inside the DON'T TOUCH div there is exactly one extra wrapper before the rows, which the upper Settings section does not use.  [CITE rawHtml.html:2106 — `<div class="form-group m0">`, closed at rawHtml.html:2484]
- [rawHtml.html] The DON'T TOUCH block contains three raw controls that exist nowhere else in the range: two bare `<input type="text">` with ids, plus `btn-inverse` buttons, all inside an `ng-show="showAdServer"` div that was hidden at capture.  [CITE rawHtml.html:2237-2238 — `<br><input type="text" id="addServerTxt"><button class="btn btn-inverse" ng-click="addLiveServer()">Add Server</button>` and `<br><inp]
- [rawHtml.html] The reveal for that hidden server-tools div is a click handler attached to a `.muted` hint label, not to a button.  [CITE rawHtml.html:2231 — `<br> <label class="muted" ng-click="showAdServer=true;">(Comma separated list op IPs IE: localhost|127.0.0.1,somehostname|10.10.10.10)</lab]
- [rawHtml.html] The browser reparented several elements out of their `<p>` ancestors, leaving `</p><div>` seams and two empty `<p></p>` artifacts in the captured DOM.  [CITE rawHtml.html:2138 `</p><div><button class="btn btn-primary btn-link" ng-click="swapCLusterIDs()"> Swap ClusterIDs (Backup &lt;--&gt; Main)</button></div>`; 2140]
- [rawHtml.html] Two cluster-wide action buttons live between the ClusterID rows, one of them destructive-styled.  [CITE rawHtml.html:2138 `<button class="btn btn-primary btn-link" ng-click="swapCLusterIDs()"> Swap ClusterIDs (Backup &lt;--&gt; Main)</button>` (note the leading sp]
- [rawHtml.html] Field-name typos are in the live data model and must be reproduced verbatim, not corrected.  [CITE rawHtml.html:1524 `saveSessField('diasableFCMAlerts')` / `editable-checkbox="sess.diasableFCMAlerts"`; rawHtml.html:1707 `saveSessField('ingnoreBadWordsList')`;]
- [rawHtml.html] DEVIATION: several `e-label` values are copy-paste leftovers that do not describe their field.  [CITE rawHtml.html:1505 apiSecret has `e-label="URL:"`; rawHtml.html:1653, 1661, 1667, 1672 — extraAdminChannels, extraRegChannels, altGenChannelName, altOffTopicChan]
- [rawHtml.html] Seven commented-out blocks survive in the markup and document features that are NOT live, including an `editable-time` type that appears nowhere else.  [CITE rawHtml.html:1716-1720 chatAutoClearTime with `editable-time="sess.chatAutoClearTime"`; 2121-2127 useV4; 2183-2188 media_server_audio; 2203-2208 relay_to_repeat]
- [rawHtml.html] DEVIATION: one linked-rooms row uses a bare `<p>` with no `form-control-static` class.  [CITE rawHtml.html:2385 — `<p>` (Linked Rooms for Recordings, sess.linkedRoomRecordings at 2387), versus every sibling at 2378, 2394 which use `<p class="form-control]
- [rawHtml.html] Two free-standing explanatory paragraphs introduce sub-sections inside the DON'T TOUCH block, both containing typos/double spaces that are part of the capture.  [CITE rawHtml.html:2289 `<p>These vars allow to server altertaive code version for this room</p>` (double space after 'These'); rawHtml.html:2353 `<p>For pushing aler]
- [rawHtml.html] `<hr>` is the section separator inside the DON'T TOUCH block and appears at six points; the upper Settings section uses a single `<hr>` only to introduce the block.  [CITE rawHtml.html:2102 (before the h3), then 2165, 2236, 2245, 2260, 2288, 2352, 2405]
- [rawHtml.html] Whitespace inside checkbox anchors is deeply and inconsistently padded, and two anchors close at a different indent than they open — the source is hand-edited, not generated.  [CITE rawHtml.html:2155-2157 useFFmpegRecording renders `No` at a single indent level (line 2156 ` No`) while every neighbour uses the ~28-space padded form seen at r]
- [rawHtml.html] The tab content and the whole ngRepeat close immediately after the DON'T TOUCH block, with the closing comment naming the repeat expression.  [CITE rawHtml.html:2484 `</div>` (form-vertical), 2485 `</div>`, 2486 `</div>`, 2487 `</div><!-- end ngRepeat: tab in tabs -->`, 2488-2489 two further `</div>` closin]
- [rawHtml.html] The range opens mid-element: lines 1471-1479 are the tail of a multi-line JSON example embedded inside a `<label>`, closed by `]</label>` at 1479.  [CITE rawHtml.html:1479 — ` },]</label>` (preceded by `"name": "Pro Plan", "fee": 9.99, "desc": "Pro Plan Description.", "recommended": true` at 1475-1478)]
- [rawHtml.html] The chatTabsWithBadges hint label embeds a full multi-line JSON example with real-looking Mongo ObjectIds.  [CITE rawHtml.html:1679-1693 — `<br><label>List of chat tabs with badges: [` ... `"badges": [ "61eafd612fcdee7bc8e979bc", "6489f1f98993a677b83cdd70" ]` ... `]</label>]
- [file] Cell 3 (State) is a pair of mutually exclusive Bootstrap labels: `label label-orange` reading `open`, and `label label-warning` reading `archived`.  [CITE file:464-467 — `<td class="text-center"><div ng-hide="s.isArchivedRoom" class="label label-orange ng-binding">open</div><div ng-show="s.isArchivedRoom" class="l]
- [file] Cell 4 (Users) is a single muted div containing a slash-separated pair.  [CITE file:468-470 — `<td class="text-center"><div class="text-muted ng-binding">1 / 3</div></td>`]
- [file] Cell 5 (Actions) holds three anchors — Launch, Manage, Marketplace — and the td carries an EMPTY class attribute, not text-center.  [CITE file:471-479 — `<td class="">` … `<a ng-href="/session?id=3625&amp;jwtSite=[REDACTED_ACTIVE_JWT]" target="_blank" class="btn btn-sm btn-info" href="/session?id=]
- [file] Launch navigates to a top-level (non-hash) URL that carries the session JWT as a query parameter; the capture redacted the token.  [CITE file:472 — `href="/session?id=3625&amp;jwtSite=[REDACTED_ACTIVE_JWT]"`]
- [file] Marketplace is hidden because a page-level global is set: `__disableMarketplace = 'true'` (a STRING, not a boolean).  [CITE file:839 — `var __disableMarketplace = 'true';` and file:476 `<a ng-hide="disableMarketplace" … class="btn btn-sm btn-default ng-hide">`]
- [file] A fourth action, Stats, exists in the source but is commented out.  [CITE file:478 — `<!-- <a href="#/page/stats/{{s._id}}" class="btn btn-sm btn-warning " ><i class="icon fa fa-list"></i> Stats </a> -->`]
- [file] The 'New Room' button is hidden behind an easter-egg counter: clicking the word 'Sessions' in the heading five times reveals it.  [CITE file:421 `ng-init="showNewRoom=0;"`; file:427 `Total <span ng-click="showNewRoom=showNewRoom+1;">Sessions</span>: 1`; file:486-487 `<div class="col-md-2 ng-hide]
- [file] The page heading is `Total Sessions: 1` and above the table sit a search box and an archived toggle; the toggle button is a direct child of the .row with no column wrapper.  [CITE file:426-437 — `<h4 class="ng-binding">Total <span …>Sessions</span>: 1` … `<div class="col-md-4 panel pane-default"><input type="text" ng-model="sessSearch" pl]
- [file] The room-list section is only one of FOUR sections on this page: room list, Badges, Extra Admin Users, API Keys — each separated by an `<hr>` and introduced by an `<h3>`.  [CITE file:491-492 `<hr><h3>Badges</h3>`; file:610-611 `<hr><h3>Extra Admin Users</h3>`; file:671-672 `<hr><h3>API Keys</h3>`]
- [file] Page chrome: black top navbar with a hidden brand logo and exactly two right-aligned nav items (Account, Logout), shown only when logged in.  [CITE file:60 `<nav role="navigation" class="navbar topnavbar" style="background-color: black;">`; file:65 `<img ng-hide="hideLogo || !sess.logoURL" ng-src="" height=]
- [file] The account page content sits in `.container.container-sm.animated.fadeInDown` > `.center-block.mt-xl`, and the outer ui-view carries an INVALID inline background colour missing its '#'.  [CITE file:421-423 — `<div ui-view="" autoscroll="false" class="ng-fadeOutZoom ng-fluid ng-scope" style="background-color: 0A0A0A" ng-init="showNewRoom=0;">` / `<div ]
- [file] The login panel body: a bold intro paragraph, email + password inputs with feather/FA feedback icons, a forgot-password link, a reCAPTCHA gated on 3 failed logins, and a full-width Login button — all inside a single `.col-md-6`.  [CITE file:709-735 — `<p class="pv text-bold">Login to your ProTradingRoom.com account</p>`; `<form role="form" … ng-submit="submitLogin()">`; `<input id="exampleInpu]
- [file] reCAPTCHA appears only after 3 failed logins, with a hard-coded site key.  [CITE file:728-729 — `<div class="form-group has-feedback ng-hide" ng-show="failedLoginCount &gt;= 3"><div class="g-recaptcha" data-sitekey="6LcDyB4TAAAAAEajRvbeLyW2L]
- [file] The login in-flight state is a GIF spinner with a relative src that has no leading slash.  [CITE file:737-740 — `<div ng-show="loggingIn" style="padding: 25px; text-align: center" class="div ng-hide"><img src="app/img/ajax_loader.gif"><label>&nbsp;&nbsp;Log]
- [file] The footer is an ng-include of `app/views/page.footer.html` rendering: hr, ©, year, app name, br, and an EMPTY binding span. Two ng-include anchor comments are present but only one rendered a div.  [CITE file:746-752 — `<!-- ngInclude: 'app/views/page.footer.html' -->` (twice, 746 and 747) then `<div ng-include="'app/views/page.footer.html'" class="p-lg text-cen]
- [file] The body carries `class="footer-hidden"` from the layout ng-class map, yet the page-level footer include above still renders.  [CITE file:50-58 — `<body ng-class="{ 'layout-fixed': app.layout.isFixed, 'layout-boxed': app.layout.isBoxed, 'layout-dock': app.layout.isDocked, 'layout-material': a]
- [file] Badges section: an add/edit panel (hidden), an Add/Upload/Export button row, and a two-column badge table that rendered ZERO rows.  [CITE file:586-607 — `<a type="button" ng-click="showAddBadge=!showAddBadge" class="btn btn btn-warning mb">Add New Badge</a>`, `<a type="button" ngf-select="ngf-sele]
- [file] The badge editor form uses native colour inputs, a 'Transparent' shortcut that sets rgba(1,0,0,0), an emoji picker button, and a WordPress-roles auto-assign textarea.  [CITE file:505-524 — `<input type="color" ng-model="badges.bkcolor">`, `<button class="btn btn-tiny btn-default" ng-click="badges.bkcolor='rgba(1,0,0,0)';">Transparen]
- [file] The emoji picker is a full inline Intercom emoji-picker clone: ~440 lines of inlined CSS in the page plus six emoji groups (Frequently used, People, Nature, Objects, Places, Symbols) rendered as title-attributed spans.  [CITE file:94-418 is the inlined `<style class="ng-scope">` (including `.intercom-composer-popover { z-index: 2147483003; … bottom: 50px; right: calc(50% - 390px); }`]
- [file] Extra Admin Users section: a toggle button pair, an add form (name/email/password, all required), and a table with an explicit empty state.  [CITE file:614-668 — `<button ng-show="!showAddAdminUser" … class="btn btn-success mb" …>Add Admin User</button>`, `<button ng-show="showAddAdminUser" … class="btn bt]
- [file] API Keys section: a New Api key button, an API Docs link to a static markdown viewer, a three-column table and its empty state.  [CITE file:675-699 — `<button type="button" class="btn btn btn-success mb" ng-click="createApiKey()">New Api key</button>`, `<a type="button" class="btn btn-primary m]
- [file] View nesting: CoreController wraps a navbar view, then two more nested ui-views before the account content.  [CITE file:59 `<div data-ui-view="" data-autoscroll="false" ng-controller="CoreController" class="app-container ng-scope">`; file:94 `<div ui-view="" autoscroll="fals]
- [file] Asset/versioning evidence: two different cache-buster schemes are live at once.  [CITE file:760 `<script src="/public/dist/vendor.min.js?v=2.18.100">`, file:789 `<script src="/public/vendor/janus3.js?v=2.18.100">` versus file:809 `<script src="/pu]
- [file] Page-level globals declared inline at the bottom include empty routing/room hints and a SoundCloud/audio volume bridge.  [CITE file:830-856 — `var __gotoPage = ''; var __roomID = ''; var __al = ""; var __forcedStreamServer = ""; var __msg = ""; var __msgPoped = false;` and `function set]
- [file] The document has an EMPTY title and an empty server-templated comment where phone validation would be injected.  [CITE file:24 `<title></title>`; file:46 `<!-- hasPhoneValidation: -->`]
- [file] The 'Upload Image Badge' control is backed by a hidden ng-file-upload input appended at the very end of body, with an explicit zero-size off-screen style.  [CITE file:885 — `<input type="file" ngf-select="ngf-select" ngf-change="onImageSelect($files, '')" tabindex="-1" style="visibility: hidden; position: absolute; overf]
- [api-docs] Endpoint 2 — POST /sessions/addUsers. Query: apiKey, apiSecret, sessionID (all required). Body key is `users`, an array of `{email, name}` objects. Response is `{"success": true, "added": 1, "freshen": 0}`.  [CITE line 83: `<p><strong>POST</strong> <code>/sessions/addUsers</code></p>`; lines 93-105 body; lines 112-117 response]
- [api-docs] addUsers explicitly both inserts and updates: 'Adds new users to a session or updates existing users' activity timestamps.'  [CITE line 84: `<p>Adds new users to a session or updates existing users' activity timestamps.</p>`]
- [api-docs] Endpoint 3 — GET /sessions/list. Only apiKey and apiSecret required; NO sessionID. Returns sessions owned by the API user.  [CITE line 126: `<p><strong>GET</strong> <code>/sessions/list</code></p>`; line 127: `Retrieves a list of all sessions owned by the API user.`; lines 131-132 (only tw]
- [api-docs] The session object returned by /sessions/list has exactly these documented fields: _id, uuid, name, currentState, current_capacity, current_max, modCount, recordedMaxCapacity, created, updated, s3Bucket, s3BucketFolderPath, isMainRoom, recP  [CITE lines 142-162, e.g. line 145 `"currentState": "active",`, line 146 `"current_capacity": 25,`, line 148 `"modCount": 3,`, line 149 `"recordedMaxCapacity": 150,`,]
- [api-docs] Endpoint 4 — GET /sessions/userstats. Required: apiKey, apiSecret, sessionID. Optional: fromDate, toDate (ISO format), isMobile ('Filter for mobile users only').  [CITE line 169: `<p><strong>GET</strong> <code>/sessions/userstats</code></p>`; lines 174-179, incl. line 179 `<li><code>isMobile</code> (optional): Filter for mobile]
- [api-docs] userstats rows carry: email, userName, uuid, ip, inTime, outTime, duration, isMobile. `duration` is 7200000 for a 10:00→12:00 window, i.e. milliseconds, but the unit is never stated for this endpoint.  [CITE lines 189-196: `"inTime": "2023-01-01T10:00:00.000Z",` / `"outTime": "2023-01-01T12:00:00.000Z",` / `"duration": 7200000,`]
- [api-docs] userstats returns per-user IP addresses.  [CITE line 192: `"ip": "192.168.1.1",`]
- [api-docs] Endpoint 5 — GET /sessions/users. Required: apiKey, apiSecret, sessionID. Returns users with role, lastLogin, FCM state and an `active` flag.  [CITE line 203: `<p><strong>GET</strong> <code>/sessions/users</code></p>`; lines 220-231 incl. line 223 `"role": 2,`, line 228 `"alerterAppFCMUserOff": false,`, line]
- [api-docs] `active` is defined as activity in the last 24 hours.  [CITE line 511: `<li>The <code>active</code> field in user responses indicates if the user was active in the last 24 hours</li>`]
- [api-docs] Endpoint 6 — GET /sessions/chatlogs. Required: apiKey, apiSecret, sessionID. Optional: channel (default "main"), fromDate, toDate. Rows use single-letter keys: sessionID, c (channel), t (time), u (user), m (message).  [CITE line 238: `<p><strong>GET</strong> <code>/sessions/chatlogs</code></p>`; line 246: `<li><code>channel</code> (optional): Chat channel name (default: "main")</li]
- [api-docs] Endpoint 7 — GET /sessions/alertlogs. Required: apiKey, apiSecret, sessionID. Optional: fromDate, toDate. Its response array is keyed `chatlogs`, NOT `alertlogs`, and its rows use `alertType` and `message` (full words) rather than the chatl  [CITE line 269: `<p><strong>GET</strong> <code>/sessions/alertlogs</code></p>`; line 286: ` "chatlogs": [` ; lines 289-291: `"t": "2023-01-01T10:00:00.000Z",` / `"ale]
- [api-docs] Endpoint 8 — GET /sessions/deletedlogs. Required: apiKey, apiSecret, sessionID. Optional: logType ("alerts" or "chat"), eventType ("E" for edit, "D" for delete), fromDate, toDate. Response key `deletedlogs`; rows: sessionID, logType, eventT  [CITE line 298: `<p><strong>GET</strong> <code>/sessions/deletedlogs</code></p>`; line 306: `<li><code>logType</code> (optional): Type of log ("alerts" or "chat")</li]
- [api-docs] Endpoint 9 — GET /sessions/archivedlogs. Required: apiKey, apiSecret, sessionID. Optional: logType ("alerts" or "chat", default "chat"), channel (default "main"), fromDate, toDate. Response key `archivedlogs`; rows: sessionID, logType, chan  [CITE line 330: `<p><strong>GET</strong> <code>/sessions/archivedlogs</code></p>`; line 338: `<li><code>logType</code> (optional): Type of log ("alerts" or "chat", de]
- [api-docs] Endpoint 10 — GET /sessions/recordings. Required: apiKey, apiSecret, sessionID. Returns recordings from the LAST 3 WEEKS ONLY, newest first, empty array when none.  [CITE line 362: `<p><strong>GET</strong> <code>/sessions/recordings</code></p>`; line 363: `Retrieves recording files for a specific session from the last 3 weeks.`; ]
- [api-docs] recordings is the ONLY endpoint with an explicit field-by-field 'Response Fields' legend, and it states the units: `duration` = minutes, `length` = milliseconds.  [CITE lines 399-411, specifically line 405: `<li><code>duration</code>: Duration in minutes</li>` and line 406: `<li><code>length</code>: Duration in milliseconds</li]
- [api-docs] Recording objects carry: _id, sessionID, name, namemkv, contentType, created, duration, length, fpath, media_server, vidPath, ms, isUpload. Both `media_server` and `ms` exist and both hold 'media.server.com' in the sample.  [CITE lines 379-391, specifically line 388 `"media_server": "media.server.com",`, line 390 `"ms": "media.server.com",`; legend line 408 `<li><code>media_server</code>]
- [api-docs] Endpoint 11 — GET /sessions/cloneSession, a MUTATING operation exposed over GET. Required: apiKey, apiSecret, sessionID, and `name` (required — the name for the new clone).  [CITE line 431: `<p><strong>GET</strong> <code>/sessions/cloneSession</code></p>`; line 439: `<li><code>name</code> (required): The name to assign to the new cloned s]
- [api-docs] cloneSession semantics: inherits all settings from the source, gets a NEW unique UUID, duplicates all presenter-role user cross-references, and requires the API key to OWN the source session.  [CITE line 432: `The clone inherits all settings from the source session, is assigned a new unique UUID, and has all presenter-role user cross-references duplicated. ]
- [api-docs] The cloneSession curl example uses a DIFFERENT host from the stated Base URL: `https://protradingroom.com/stats/v1/...` while every other example uses `https://ptrv3.protradingroom.com/stats/v1/...`.  [CITE line 442: `curl --location 'https://protradingroom.com/stats/v1/sessions/cloneSession?...'` versus line 372: `curl --location 'https://ptrv3.protradingroom.com/]
- [api-docs] `uuid` is a STRING in the /sessions/list response but a NUMBER in the cloneSession response, where it is documented as 'Auto-incremented numeric room identifier'.  [CITE line 143: `"uuid": "session-uuid",` versus line 449: `"uuid": 42,` and line 464: `<li><code>uuid</code>: Auto-incremented numeric room identifier</li>`]
- [api-docs] The cloneSession response contains the field `ownerdID` (spelled with a stray 'd'), plus isClonedRoom, clonedFrom, and currentState 'inactive'.  [CITE lines 451-454: `"isClonedRoom": true,` / `"clonedFrom": "111222333444",` / `"ownerdID": "owner-user-id",` / `"currentState": "inactive",`]
- [api-docs] Per-endpoint 'Error Responses' sections exist for ONLY 4 of the 11 endpoints: delUsers (1), addUsers (2), recordings (10), cloneSession (11). Endpoints 3-9 have no Error Responses section at all.  [CITE Error Responses headings at lines 74, 118, 423, 472 only; endpoint 3 runs 125-166, endpoint 4 168-200, endpoint 5 202-235, endpoint 6 237-266, endpoint 7 268-29]
- [api-docs] cloneSession's 403 is broader than every other endpoint's: it adds 'or session not allowed for this API key', and its 400 reads 'Invalid session (not found or not owned by this API key)'.  [CITE lines 474-476: `<li><code>403</code>: Invalid API credentials, disabled API, or session not allowed for this API key</li>` / `<li><code>429</code>: Rate limit e]
- [api-docs] Global error code table: 200 Success; 400 Bad Request - Invalid parameters or session; 403 Forbidden - Invalid API credentials or disabled API; 429 Too Many Requests - Rate limit exceeded; 500 Internal Server Error.  [CITE lines 486-505, e.g. line 496: `<td>Forbidden - Invalid API credentials or disabled API</td>`, line 500: `<td>Too Many Requests - Rate limit exceeded</td>`]
- [api-docs] Global notes: emails are auto-lowercased; dates are ISO (YYYY-MM-DD or full ISO timestamp); FCM tokens are auto-managed; adds are bulk operations; and 'Session validation ensures users can only access their own sessions'.  [CITE lines 509-514, specifically line 509 `<li>All email addresses are automatically converted to lowercase</li>`, line 510 `<li>Date parameters should be in ISO for]
- [api-docs] This page does NOT ship the documentation content it displays — it is a client-side markdown renderer. It fetches `API_Documentation.md` with `{cache: 'no-cache'}` and replaces `#content` via `marked.parse(text)`; the endpoint HTML I read i  [CITE lines 520-534: `<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>`; line 523: `var mdPath = 'API_Documentation.md';`; line 531: `fetch(m]
- [api-docs] The renderer accepts an arbitrary `?src=` query parameter that overrides which markdown file is fetched and innerHTML'd.  [CITE lines 524-529: `// Allow override via ?src=... query` / `var url = new URL(window.location.href);` / `var src = url.searchParams.get('src');` / `if (src) { mdPa]
- [api-docs] The fetch failure path is explicit and visible, not swallowed: it writes 'Error loading documentation: ' + err.message into #content.  [CITE lines 536-538: `.catch(function (err) {` / `document.getElementById('content').innerHTML = 'Error loading documentation: ' + err.message;`]
- [api-docs] Chrome: the page's only navigation is a topbar link back to the PTR app at `/ptrApp#/page/welcome` with the exact label '← Back to PTR'.  [CITE lines 26-28: `<div class="topbar">` / `<a href="/ptrApp#/page/welcome">← Back to PTR</a>`]
- [api-docs] All styling is a single inline <style> block using GitHub-markdown colours: page background #f6f8fa, card #fff with 1px #d0d7de border and 6px radius, box-shadow `0 1px 0 rgba(27,31,36,.04)`, body text #24292f, topbar background #24292f wit  [CITE lines 9-22, e.g. line 10: `.container { max-width: 980px; margin: 0 auto; padding: 24px; }`; line 11: `.card { background: #fff; border: 1px solid #d0d7de; bord]
- [api-docs] The two `<link rel="preconnect">` tags to fonts.googleapis.com and fonts.gstatic.com are DEAD — no Google Fonts stylesheet is ever requested, and the font-family is a pure system stack.  [CITE lines 6-7: `<link rel="preconnect" href="https://fonts.googleapis.com">` / `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">`; line 9: `b]
- [api-docs] `cz-shortcut-listen="true"` on <body> is a browser-extension artifact of the capture (ColorZilla), not application markup.  [CITE line 25: `<body cz-shortcut-listen="true">`]
- [page-source] The Tawk.to live-chat script at the bottom of the body loads unconditionally, outside any consent check, while the same script is ALSO loaded inside enableTracking(). Consent state is never consulted before it runs.  [CITE COPY/page-source:510-523 `<!--Start of Tawk.to Script-->` … `s1.src = 'https://embed.tawk.to/5aec4d755f7cdf4f0533dd2c/default';` (no consent guard around it), d]
- [page-source] Consent is stored in localStorage under key 'gdprConsent' with the exact values 'accepted' and 'rejected'; the banner is `display: none` inline and is shown only when the key is absent.  [CITE COPY/page-source:242 `if (!localStorage.getItem('gdprConsent'))`, :248 `localStorage.setItem('gdprConsent', 'accepted');`, :256 `localStorage.setItem('gdprConse]
- [page-source] rejectCookies() → disableTracking() deletes EVERY cookie readable from document.cookie on path /, not just analytics cookies.  [CITE COPY/page-source:309-311 `document.cookie.split(';').forEach(function (c) { document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUT]
- [page-source] Legacy Google Analytics is configured with a domain name that does not match this site: `_setDomainName` is 'videoinclinic.com' on protradingroom.com. The same pair appears twice, once in enableTracking() and once unconditionally in the foo  [CITE COPY/page-source:496-497 `_gaq.push(['_setAccount', 'UA-51280128-2']); _gaq.push(['_setDomainName', 'videoinclinic.com']);` and identically at :266-267; the pag]
- [page-source] The footer `_gaq` snippet runs unconditionally on every page load regardless of consent; the only thing consent changes is the `ga-disable-UA-51280128-2` window flag set earlier in the document.  [CITE COPY/page-source:495-507 (bare `var _gaq = _gaq || []; _gaq.push(...); ... ga.src = ... '.google-analytics.com/ga.js'` with no consent guard) versus :306 `windo]
- [page-source] enableTracking() declares a `function gtag()` inside an `if` block, shadowing the head-level gtag, and re-fires `gtag('config', 'AW-1044463300')`.  [CITE COPY/page-source:281-288 `if (typeof gtag !== 'undefined') { window.dataLayer = window.dataLayer || []; function gtag() { dataLayer.push(arguments); } gtag('js']
- [page-source] Google Ads gtag is loaded in the head with conversion ID AW-1044463300, before and independently of the consent banner.  [CITE COPY/page-source:182-191 `<!-- Global site tag (gtag.js) - Google Ads: 1044463300 -->` / `<script async src="https://www.googletagmanager.com/gtag/js?id=AW-1044]
- [page-source] ShareThis is initialised with publisher key '33a7c385-d09c-4f65-9259-5edf1f7d97b3' and the legacy `switchTo5x` flag, loaded protocol-relative from //w.sharethis.com.  [CITE COPY/page-source:193-204 `var switchTo5x = true;` / `<script type="text/javascript" src="//w.sharethis.com/button/buttons.js"></script>` / `stLight.options({ pu]
- [page-source] The hero image filename contains a typo that must be preserved if assets are copied: `ptr_descrived_perspective.png` ("descrived", not "described").  [CITE COPY/page-source:357 `<img src="/public/images/ptr_descrived_perspective.png" style="height: 95%" />`]
- [page-source] Hero section: id="hero", inline `padding-top: 60px; background: #0e0e0e`, centred h1.hero-text, an 8/4 column split, and a 7-item bullet list styled `color: #f0f0f0; padding-bottom: 0px; font-size: 20px; padding-top: 40px`.  [CITE COPY/page-source:352-372 — :354 `<h1 class="hero-text" style="text-align: center">Web-based Trading Room for Professionals</h1>`; :364-372 list items verbatim: ]
- [page-source] The testimonial row is a `div.row` placed directly in the body with no `.container` or `.container-fluid` parent, unlike every other section on the page.  [CITE COPY/page-source:404 `<div class="row" style="text-align: center">` follows the closing `</div>` of #second-option at :401 and the `<hr />` at :402, with no wra]
- [page-source] Seven verbatim testimonial lines, each an `<h3>` prefixed by `<i class="fa fa-check-circle"></i>`, under the heading "Real user comments after switching to ProTradingRoom:".  [CITE COPY/page-source:410-419 — `Looks way cleaner and sounds great!`, `WOW absolutely no Lag!`, `Crisper charts!`, `The audio quality is so much better!`, `Yes! Way]
- [page-source] The three feature icons have alt text that does not describe the image: cloud.png carries alt="dev" and browser.png carries alt="globe".  [CITE COPY/page-source:389 `<img src="/public/images/circle-icons/one-color/cloud.png" alt="dev" />` and :395 `<img src="/public/images/circle-icons/one-color/browser]
- [page-source] The #mobile screenshot column is `col-xs-6 hidden-xs` — sized for the extra-small breakpoint and simultaneously hidden at it — while its sibling is `col-sm-6 col-xs-12`.  [CITE COPY/page-source:431 `<div class="col-xs-6 hidden-xs">` and :434 `<div class="col-sm-6 col-xs-12">`]
- [page-source] The #cta block's inner wrapper is `.form-wrapper` but contains no form — only an h4 and an anchor.  [CITE COPY/page-source:445-458 `<div id="cta">` … `<div class="form-wrapper" style="text-align: center;">` / `<h4>Need to talk to somebody to get more information abo]
- [page-source] Lines 445-481 (the #cta and #footer blocks) are TAB-indented and un-prettified, while lines 1-444 and 483-526 are two-space indented and prettier-formatted.  [CITE COPY/page-source:445 `\t<div id="cta">`, :459 `<div id="footer">` at column 0, :464-474 tab-indented `<li>` items — contrasted with :428 ` <div id="mobile">` an]
- [page-source] There is a commented-out call to action in the #mobile section: an app-store style "Get it free" button.  [CITE COPY/page-source:438 `<!--\t\t\t\t\t\t<a class="button button-small" href="#">Get it free</a>-->`]
- [page-source] Footer contains exactly three links plus the copyright, on a `.col-md-12.menu` with inline `text-align: center; color: #FAFAFA;`. Privacy Policy and Terms of Service are static HTML files opened in a new tab.  [CITE COPY/page-source:462-476 `<a href="/public/html/ppolicy.html" target="_blank">Privacy Policy</a>`, `<a href="/public/html/tos.html" target="_blank">Terms of Ser]
- [page-source] Front-end dependency set is fixed and old: jQuery 1.11.0 and Bootstrap 3.1.1 (both protocol-relative from third-party CDNs), Font Awesome 4.0.3, plus local theme.js and four stylesheets, one cache-busted with `?v1.0`.  [CITE COPY/page-source:28-31 `/public/css/compiled/theme.css`, `/public/css/vendor/animate.css`, `//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css`, ]
- [page-source] Animation classes come from animate.css and are used in exactly one place: the hero's Learn More wrapper.  [CITE COPY/page-source:29 `<link rel="stylesheet" type="text/css" href="/public/css/vendor/animate.css" />` and :360 `<div class="animated fadeInUp" style="text-align]
- [page-source] Head declares nine apple-touch-icon sizes (57, 60, 72, 76, 114, 120, 144, 152, 180) plus msapplication TileColor/TileImage and theme-color, all `#ffffff`.  [CITE COPY/page-source:13-25 — e.g. :13 `<link rel="apple-touch-icon" sizes="57x57" href="/apple-icon-57x57.png" />`, :23 `<meta name="msapplication-TileColor" conten]
- [page-source] SEO metadata names two competitors explicitly as replacement targets.  [CITE COPY/page-source:10-11 `<meta name="description" content="ProTradingRoom Trading room software for professional traders" />` and `<meta name="keywords" content=]
- [page-source] The body carries id="home4", which is how the theme CSS scopes this page's styling.  [CITE COPY/page-source:206 ` <body id="home4">`]
- [page-source] A conditional comment still ships an IE<9 html5shim from a dead Google Code URL over plain http.  [CITE COPY/page-source:32-34 `<!--[if lt IE 9]>` / `<script src="http://html5shim.googlecode.com/svn/trunk/html5.js"></script>` / `<![endif]-->`]

## 2F. HONEST GAPS
- [sheet-2.css] The exact Unicode codepoints for the Private Use Area .glyphicon-*::before content values (lines 68-322, roughly 240 rules) are not transcribable from the Read tool output — they arrive as unrenderable/empty-looking characters. I read every one of those lines, but I can only report the eleven non-PUA values verbatim. If the rebuild needs a specific glyph codepoint, it must be taken from a Bootstrap 3 glyphicons source, not from this capture.
- [sheet-2.css] I cannot prove from this file whether the missing .eot and .svg @font-face sources at line 59 are a build customisation or Chrome discarding unsupported format() keywords before re-serialisation. Resolving it needs the raw bytes of https://protradingroom.com/public/app/css/bootstrap.min.css, which this capture is not — this file is explicitly a CSSOM re-serialisation.
- [sheet-2.css] Same limitation applies to every prefix/precision/alpha delta I listed (appearance, text-size-adjust, 2n+1, 1.42857, 0.176, expanded animation shorthand, inset shorthand): the raw network response would settle it; this file cannot.
- [sheet-2.css] This sheet contains ZERO application or theme rules. No project class names of any kind appear in lines 1-1577. Whatever styles the Manage page's own panels, toolbars, file lists, sorting bar or sound rows are in a different stylesheet that is not this file. Do not source any Manage-specific colour, spacing or class from here.
- [sheet-2.css] No exact Bootstrap version string appears anywhere in the file — the CSSOM re-serialisation strips comments, so the `/*! Bootstrap v3.x.x */ banner is gone. I therefore cannot cite a version number from this evidence; I can only say the rule set read is Bootstrap 3 and contains none of the Bootstrap 4/5 or Bootstrap 3.4 selectors.
- [sheet-2.css] I looked for and did NOT find, anywhere in lines 1-1577: any CSS custom property (--*) declaration, any @supports block, any @import, any flexbox-based grid rule, and any `.row-no-gutters`. Their absence is a read result, not an assumption.
- [sheet-2.css] The file gives base styles only — it cannot tell me which of these classes the Manage page actually uses. Determining that requires the Manage page markup capture, which is not in this file.
- [rawHtml.html] The two `ngIf: sess.authMode === 'unamePW'` dropdown items (rawHtml.html:294-295) did NOT render in this capture. Their labels, icons and ng-click handlers are absent from my entire range. I looked at every line of 154-354 and they exist only as unrendered comment markers. Do not invent them.
- [rawHtml.html] This file is raw HTML only — it contains ZERO computed styles and zero CSS rules. I cannot state what `m0`, `mt`, `btn-info`, `input-group-btn`, `nav-tabs` or `col-md-6` actually resolve to (colours, margins, widths). Those must come from a cssVars/computed-style capture, which is not this file.
- [rawHtml.html] The body of `copyLinkToClipboard(...)` is not in lines 154-354. What it does with the element id (select+execCommand vs navigator.clipboard, and any toast/feedback) is not evidenced in my range.
- [rawHtml.html] The bodies/behaviour of `setCustomRoomURL()`, `setUniqueRoomURL()`, `doInvite()`, `exportListToCSV()`, `loadUsers()`, `sendWeminarEmailReminder()` and all nine dropdown handlers are not in my range — only their invocation sites are.
- [rawHtml.html] Whether the Vanity Link Edit flow uses a modal, a prompt, or an inline edit is not determinable from my range; only the button and its handler name are present.
- [rawHtml.html] Only ONE `tab-pane` opening tag appears in my range (line 280, the active Users pane). Whether the Branding / User Stats / Settings panes are also present in the DOM is beyond line 354 and I make no claim about it.
- [rawHtml.html] The `<pre>` email preview at :176-181 is captured mid-state with `webinarTimeTxt` empty. I have no evidence of how the preview renders once a time is typed, other than that a second `<strong class="ng-binding ng-hide">` exists to hold it.
- [rawHtml.html] The App Pair Link row (:229-243) is `ng-hide` in this capture, so I have no evidence of its populated value shape — only the bare `https://protradingroom.com/room/` prefix.
- [rawHtml.html] No screenshot or rendered image accompanies this range in what I was asked to read, so I cannot confirm final on-screen appearance, only markup.
- [rawHtml.html] I deliberately did not read lines 1-153, 355-2662 per the assignment; anything about those regions is outside my evidence.
- [rawHtml.html] The Settings tab's `<div class="form-vertical ng-scope">` and its single `<div class="form-group m0">` are still OPEN at line 1470 — the tab is not closed within my range. The 'Subscription Plans' muted help label's JSON example begins at line 1466 and is truncated by my range boundary at 1470 (last line I read: `"desc": "Basic Plan Description.",`). The second half of the Settings tab is not mine to report.
- [rawHtml.html] GEAR ICONS: the task asked me to flag gear icons. There are NONE in lines 450-1470. I read every `<i class="fa …">` in the range and the complete icon set is: fa-save, fa-quote-right, fa-bold, fa-italic, fa-underline, fa-strikethrough, fa-list-ul, fa-list-ol, fa-repeat, fa-undo, fa-ban, fa-align-left/center/right/justify, fa-indent, fa-outdent, fa-code, fa-picture-o, fa-link, fa-youtube-play, fa-user-plus, fa-floppy-o, fa-users, fa-trash, fa-download, fa-plus. No fa-cog and no fa-gear. I am reporting their absence rather than inventing one.
- [rawHtml.html] NO PER-SETTING BUTTONS: apart from the two Branding logo buttons (463-464), the Branding editor save button (473), the five User Stats buttons (511-515) and the two Settings header buttons (581, 583), there is not a single `<button>` attached to an individual setting row in my range. Every setting row's only control is the xeditable `<a href="">`.
- [rawHtml.html] NO CSS / NO COMPUTED STYLES in this file — it is rawHtml only. I therefore cannot state what `.muted`, `.btn-assertive`, `.form-control-static`, `.control-label`, `.editable-empty`, `.badge-danger` or `.navLogo` actually render as (colour, size, spacing). Those must come from a stylesheet/computed-style capture I was not given. The only style values I can cite are the inline ones I quoted (`background-color: #000`, `padding: 15px`, `text-decoration: underline`, `text-align: center; margin-bottom: 20px`, `max-width: none; width: 305px`, `min-width:100px`/`120px`, `padding: 25px; text-align: center`).
- [rawHtml.html] WHICH TAB IS ACTIVE: none of the four tab-panes opened in my range (454, 479, 491, 576) carries `active` in its class attribute. The tab header `<ul>` that would show the selected tab is before line 450, outside my range, so I cannot say which tab was on screen. I am not guessing.
- [rawHtml.html] TAB NAMES: the strings 'Branding', 'SSO', 'User Stats', 'Settings' are my labels for these panes based on their contents (logo+landing-page editor; ssoHost; statsDate+Load Stats; the settings list). The actual tab heading text lives in the tab header before line 450 and I did not read it. Treat the names as descriptive, not captured.
- [rawHtml.html] THE PANE ENDING AT LINE 452: lines 450-452 are the tail of a pane that started before 450 — `<button class="btn btn-info pull-right" ng-click="saveTextList()"><i class="fa fa-save"></i> Save List</button>` and `<textarea id="textListTxt" style="width: 100%; height:100%" rows="40"></textarea>`. I read only its final three lines; its opening markup and any label/heading are before my range.
- [rawHtml.html] EMPTY TABLE BODIES: both stats tables (552-555 monthly, 570-572 main) contain only an ngRepeat comment and zero rows, and the monthly `<strong class="ng-binding"></strong>` is empty. There are NO captured stat rows anywhere in my range, so I can state nothing about row markup, striping, or cell contents for the User Stats tab. This is an uncaptured region, not an absence of features.
- [rawHtml.html] THE TEXT-ANGULAR EDITOR BODY IS EMPTY (`<p><br></p>` at line 475) and `sess.description` therefore has no captured content. I cannot say what the login landing page actually contains for this room.
- [rawHtml.html] I did not read lines 1-1470 of this file (outside my assigned range). Consequently I cannot name the field that owns the JSON `<label>` whose closing tag lands at line 1479, nor confirm where the Settings tab body opens, nor confirm the total settings count for the tab.
- [rawHtml.html] This file is rawHtml only. It contains ZERO computed styles and ZERO stylesheet rules. I cannot state a single colour, font, pixel dimension or spacing value for any element in my range, and I did not assert one. Classes referenced but not resolvable from this file: form-control-static, col-sm-2, control-label, muted, form-vertical, form-group, m0, btn-default, btn-inverse, btn-link, btn-warning, btn-danger, btn-primary, btn-sm, ng-hide, editable, editable-click, editable-empty, ms-2, cursor-pointer, fa fa-gear, fa fa-random.
- [rawHtml.html] I could not find, anywhere in lines 1471-2487, any `<form>` element, any submit button, or any save button for the Settings tab. Every persistence hook in the range is the per-field `onaftersave="saveSessField('...')"` attribute. If a page-level save exists it is outside my range.
- [rawHtml.html] I could not find the definition or behaviour of the x-editable directives themselves (editable-text, editable-textarea, editable-checkbox, editable-number, editable-time) — only their usage. The popover markup, the input types, and what `e-label` vs `e-title` actually render are not in this file. The only hard evidence of the value-rendering rule is the commented-out interpolation at line 2124.
- [rawHtml.html] I could not find any evidence of which of these settings are server-authorised versus client-asserted. `saveSessField` is called identically for `isLocked`, `modAdminLoginList`, `apiSecret`, `s3KeySecret` and cosmetic flags alike; the authorisation boundary is not visible in the captured markup.
- [rawHtml.html] Both `ng-show` regions in the DON'T TOUCH block (`showAdServer` at 2234 and the profanity sub-rows at 1705/1710) carry the `ng-hide` class, meaning their contents were captured but never rendered visible. Any styling or layout of those regions in their shown state is an honest gap.
- [rawHtml.html] Secret-bearing fields (apiSecret, s3KeySecret, vimeoClientSecret, vimeoToken, twillioApiToken, protextingSecretTok, obsStreamKey, restreamToURLKey, linkedStreamsAPIKey) all read `empty` in this capture. I cannot tell from this evidence whether they are genuinely unset for this room or whether the capture/UI masks them — I did not assume either.
- [file] ONLY ONE room row exists in the entire capture (session 3625, 'Room 3625', open, 1 / 3). There is no second row, so table-striped alternation, any hover state, and any archived-row rendering are NOT observable here. I looked at the full ngRepeat block, file:458-480, which opens and closes around a single tr.
- [file] The cloned-room indicator is an EMPTY element: `<span ng-show="s.isClonedRoom" class="ng-hide"></span>` at file:460. What it displays (icon, text, badge) is not in this capture and must not be invented.
- [file] No archived room is present, so the `label label-warning` 'archived' state (file:466) was never the visible branch, and the ng-hide row-suppression path was never exercised.
- [file] NO CSS RULE BODIES for the app's own classes are in this file. styles.css and bootstrap.min.css are only <link>ed (file:26, file:42). Therefore `label-orange`, `pane-default`, `mt-xl`, `pv`, `mb`, `p-lg`, `mr-sm`, `btn-tiny`, `btn-inverse`, `brand-logo`, `user-badge-img`, `input-emoji-txt`, `input-name-txt`, `input-text`, `hidden-material`, `ng-fadeOutZoom`, `ng-fadeInLeft2` have NO resolvable values from this evidence. The only CSS actually inlined is the video.js defaults (file:2-9), the ng-cloak rule (file:10), the Intercom emoji-picker block (file:94-418) and the vjs-youtube overrides (file:48).
- [file] This directory contains exactly ONE file, named `file` (85,027 bytes, 885 lines) — verified with `ls -la`. There is no screenshot, no per-element layout/rects, no computed-style capture, no cssVars dump and no bodyText slice for this page. Every dimension, colour and font here is limited to inline style attributes and the one inlined stylesheet.
- [file] The badges table rendered ZERO rows even though `badgesList` is truthy (Export Badges visible at file:592, 'No Badges defined' hidden at file:594). The per-badge row markup — the `b in badgesList` template — is NOT in this capture (file:604 is a bare ngRepeat anchor comment).
- [file] The admin-users and API-key tables likewise rendered zero data rows (file:662 and file:694 are bare ngRepeat anchors); only their empty-state rows exist. Row markup for a real admin user or a real API key is not captured.
- [file] The login form is present but hidden (`class="panel ng-hide"`, file:708), so there is no rendered geometry for it; and no error/validation message element for a failed login appears anywhere in the file. `failedLoginCount` is referenced only at file:728.
- [file] The reCAPTCHA site key at file:729 and the JWT in the Launch href at file:472 — the JWT is redacted in the capture as `[REDACTED_ACTIVE_JWT]`, so the token shape/claims are unknown.
- [file] Two ng-include anchor comments for `app/views/page.footer.html` appear back to back (file:746 and file:747) but only the second produced a rendered div. Why there are two anchors is not determinable from this file.
- [file] The final footer span `<span class="ng-binding ng-scope">` (file:751-752) rendered EMPTY — its bound expression is not visible in the DOM, so what normally appears there is unknown.
- [file] `background-color: 0A0A0A` at file:421 is invalid CSS (missing '#'), so the page's ACTUAL background colour is not established by this file; it comes from a stylesheet not included in the dump.
- [file] Room-list sorting: the handlers `sortByUUID()` and `sortByName()` are named (file:444, file:448) but no active/descending icon state is present, so the sorted-state visual is an honest gap.
- [file] The 'Users' cell value `1 / 3` (file:469) has only one sample, so which number is the current count and which is the cap cannot be proven from this evidence alone.
- [api-docs] The authoritative source document `API_Documentation.md` (fetched at runtime, line 523) is NOT part of this capture. Everything I report is the DOM snapshot of its rendered output. If the live markdown has drifted since capture, this file will not show it.
- [api-docs] The role enumeration is not captured. /sessions/users returns `"role": 2` (line 223) and cloneSession mentions 'presenter-role user cross-references' (line 432), but no legend maps integers to role names anywhere in lines 1-545.
- [api-docs] No value format is documented for the `isMobile` query parameter (line 179) — true/false vs 1/0 vs presence-only is not stated, and no example request in the file passes it (line 182 omits it).
- [api-docs] No pagination, limit, offset, cursor or sort parameters are documented for ANY of the list/log endpoints (list, userstats, users, chatlogs, alertlogs, deletedlogs, archivedlogs, recordings). Result-set size is unbounded as documented.
- [api-docs] No response body shape is given for ANY error. The file gives status codes and prose only (lines 74-80, 118-123, 423-428, 472-477, 486-505); it says a 429 returns 'an error message' (line 45) but never shows the JSON.
- [api-docs] Endpoints 3 through 9 (list, userstats, users, chatlogs, alertlogs, deletedlogs, archivedlogs) have NO per-endpoint Error Responses section — only the global table applies to them.
- [api-docs] No endpoints are documented for: creating a session from scratch, deleting/ending a session, starting or stopping a recording, uploading media, sending an alert or chat message, or managing API keys. The capture contains 11 endpoints and no others — I did not find these and I am not inventing them.
- [api-docs] The `currentState` field is shown as "active" (line 145) and "inactive" (line 454). The full set of legal values is never enumerated.
- [api-docs] `contentType` for recordings is documented as 'File format (mp4, webm, etc.)' (line 403) — the 'etc.' is not expanded, so the full format list is unknown.
- [api-docs] The /sessions/alertlogs response array key is `chatlogs` (line 286), not `alertlogs`. I cannot determine from this capture whether that is the real wire contract or a copy-paste error in the source markdown. It needs a live response to resolve; I did not assume either way.
- [api-docs] Two different hosts appear: `ptrv3.protradingroom.com` (base URL line 35 and examples at lines 64, 107, 135, 182, 213, 251, 281, 312, 344, 372) versus `protradingroom.com` in the cloneSession example alone (line 442). Which serves cloneSession is not resolvable here.
- [api-docs] `uuid` type conflicts between the list response (string, line 143) and cloneSession (number 42, line 449 / 'auto-incremented numeric', line 464). Unresolved in the evidence.
- [api-docs] The unit of `duration` in the /sessions/userstats response (line 195) is never stated; only the recordings legend documents units (lines 405-406).
- [api-docs] There is no documented timezone handling for fromDate/toDate beyond 'ISO format' (lines 177-178, 510) — whether bare YYYY-MM-DD is interpreted UTC or server-local is not captured.
- [api-docs] No versioning, deprecation, changelog or CORS policy is documented. `/stats/v1` is the only version marker (line 35).
- [api-docs] This file contains no screenshot and no computed styles — only inline CSS source (lines 8-23). I cannot assert rendered pixel values (actual font resolved, actual box heights) from it; that would require a rendered capture I was not given.
- [test] x
- [page-source] No CSS was captured. /public/css/compiled/theme.css, /public/css/vendor/animate.css, /public/css/main.css?v1.0 and the Font Awesome 4.0.3 sheet are only referenced (COPY/page-source:28-31); their rules are NOT in this file or in home-page/file. Therefore every non-inline class on this page has no known declaration in the evidence: .button, .button-small, .button-large, .button-primary, .hero-text, .feature, .info, .device, .img-responsive, .form-wrapper, .menu, .navbar-inverse, .normal, .icon-bar, #hero, #second-option, #mobile, #cta, #footer, #home4. I did not guess any of them.
- [page-source] No computed styles, no element rectangles, no screenshot. The COPY directory contains exactly two files (page-source, login-page-source) and nothing else, so pixel-level verification of this page is impossible from this directory alone.
- [page-source] No images captured: protradingroom_icon.png, ptr_descrived_perspective.png, user_comments.png, ss3.png, and circle-icons/one-color/{locked,cloud,browser}.png are referenced only by path.
- [page-source] The marketplace/carousel section is styled in the head (COPY/page-source:36-180) but its markup rendered NOWHERE in either capture. I have no evidence of its DOM structure, its card contents, the empty-state copy under #marketplace-empty-section, or the label on #marketplace-btn. I did not invent any of it. This is the single largest gap in the page.
- [page-source] This is rendered template output, so server-side conditionals are invisible. I cannot tell from this evidence whether the marketplace section is hidden by an empty data set, a feature flag, or a role check.
- [page-source] No capture metadata in COPY/page-source itself: no URL, no timestamp, no user-agent, no logged-in/logged-out state is recorded in the file. The URL protradingroom.com and the capture environment (2560x1440, macOS 26.5.2, Chrome 150.0.7871.187) are only inferable from home-page/file:203, which is a different file.
- [page-source] /Users/billyribeiro/Desktop/trading-room-app/apps/controller/evidence-dumps/COPY/login-page-source (16095 bytes) sits beside my file and was NOT read — outside my assigned range. The tab-indented #cta/#footer partials (COPY/page-source:445-481) should be compared against it before anyone concludes they are shared partials.
- [page-source] The head's <style> block is the only CSS I can cite, and I can cite no cascade context for it: without theme.css/main.css I cannot say whether any of those marketplace rules are overridden.
- [page-source] No network evidence, no HTTP headers, no cookies, and no localStorage snapshot accompany COPY/page-source, so the actual runtime consent state at capture time is unknown from my file. home-page/file shows GA and Tawk scripts did load, which is consistent with consent 'accepted' OR with the unconditional footer snippets — the two cannot be distinguished from the evidence.

## 2C. COPY/login-page-source (168 lines) — READ BY ME, after the assigned agent failed
The Angular 17 room-login page in its PRE-HYDRATION form. `<body>` contains only
`<app-root></app-root>` (:166) — no rendered component tree — whereas `login-page/launch` and
`room-login/room-login-file` are the POST-render DOM of the same app. Same build asset hashes in
both (:167): runtime.b70e5d3ff558bfdf.js, polyfills.95db17d6d6f4b89d.js,
scripts.38973a242454fb27.js, main.d6d3c112b59b7d0d.js.
:3   <html lang="en" data-critters-container>      :6 <title>PTRChat</title>
:7-8 <!-- <base href="/v4" /> --> then <base href="/">
:11  Font Awesome 5.8.1 (use.fontawesome.com, SRI sha384-50oBUHEmvpQ+...)
:12  animate.css 3.7.2 (cdnjs)
:15-62 four COMMENTED-OUT Google Fonts @imports (Roboto, Source Sans Pro, Lato, Merriweather)
:70-163 the same four inline helpers as launch: openImageModal / downloadImage /
        removeImageFromChat / showChatGif
:164 the Critters-inlined critical CSS — Bootswatch Darkly vars + the full --bs-* Bootstrap 5 set
     + the room's own ~80-property theme incl. the --lightTheme-* / --darkTheme-* pairs
:164 (tail) <link rel="stylesheet" href="styles.d622cb9ed2bbc221.css" media="print"
     onload="this.media='all'"> — the async-CSS pattern. NOTE: in login-page/launch the same link
     carries media="all", because that capture is post-onload. Same file, different lifecycle
     moment. Do not read the media attribute as a difference in the source.

## 2G. THE ITEMS THAT SHOULD DRIVE WORK
1. **A REAL BUG IN THE REFERENCE.** rawHtml.html:671 — "Logout Webhook URL" saves to
   `saveSessField('logout_webhook_url')` but is BOUND TO `editable-textarea="sess.login_webhook_url"`,
   the same model as the Login Webhook row above it (:666). Editing either row edits the login
   value. CONFIRMED by a second reader. Our rebuild must bind logout to its own field and record
   that as a deliberate divergence, not copy the bug silently.
2. **THE PUBLIC API SURFACE** (login-page/api-docs, 545 lines, read in full):
   11 endpoints, base URL https://ptrv3.protradingroom.com/stats/v1.
   AUTH IS TWO QUERY PARAMETERS ON EVERY REQUEST — `apiKey` and `apiSecret`. No header, no bearer,
   no cookie, no OAuth anywhere in the document. The secret therefore travels in the URL and lands
   in access logs, proxies and Referer headers. If we reimplement this, that is an inherited
   security decision to make consciously, not to copy by default.
   Rate limit: 1 request per second PER COMMAND (not per key), 429 on exceed.
3. **BOOTSTRAP 3 GEOMETRY IS PINNED**: breakpoints 768/992/1200 (max bands 767/991/1199);
   .container 750/970/1170 with 15px side padding; .btn 6px/12px 14px/1.42857 radius 4px;
   .btn-sm 5px/10px 12px/1.5 radius 3px. Using Tailwind's 640/1024/1280 would shift every column.
4. **sheet-2.css contains ZERO application rules** — it is stock Bootstrap 3 end to end. Every
   Manage-specific value must come from styles.css (sheet-9). Confirmed across all 1577 lines.
5. **`pane-default`, not `panel-default`** — the account page writes the class that way in all five
   panel columns (main-nav-login-clicked/file:431, 439, 586, 613, 675). It is a typo in the
   reference that changes nothing visually (no such class exists), but a rebuild that "corrects" it
   to panel-default would ADD a panel background the original does not have.
6. **Room-list rows are hidden, not filtered**: `<tr ng-hide="s.isArchivedRoom && !showArchivedRooms"
   ng-repeat="s in login.sessions | filter: sessSearch">` (:458). `table-striped` nth-child
   therefore counts hidden archived rows. A rebuild that filters the array stripes differently.
7. **The Name column header is `text-center` but its body cell has no alignment class**
   (:448 vs :463). Copying text-center down to the cell is a visible mismatch.
8. **Vanity link `[yournamehere]` and unique link `[youruniquelinkhere]` are `value=`, not
   `placeholder=`** — real UI copy in the input, not a hint.
9. **All tab panes are in the DOM simultaneously**; visibility is the `active` class from
   `ng-class="{active: tab.active}"`. A rebuild that mounts only the active tab changes behaviour.

# ===== PART 3: the UNCOMPILED AngularJS templates (fetched 2026-08-13) =====

Source: `apps/controller/evidence-dumps/TIER1-fetched/views/`. These are the `templateUrl` partials
AngularJS loads at runtime — the SOURCE the DOM captures were rendered from. They contain every
branch, including ones no capture ever rendered.

## page.manageSession.html — THE USER ROW, lines 346-603, READ END TO END

`<tr ng-repeat="user in xrefs  ">` — note the two trailing spaces inside the expression.

### Column 1 — `#`
`<td>{{$index}}</td>` — a zero-based ngRepeat index, NOT a database id and NOT 1-based.

### Column 2 — Name / Email  (:349-400)
Order is exact and matters:
1. `<input type="checkbox" ng-show="user.role!==0" ng-checked="checkedUserIds[user._id]"
   ng-click="getCheckedUserIds(user._id)">` — the OWNER (role 0) has no checkbox.
2. Ten status icons, each `ng-show`n independently. NOTE four of them interpolate INSIDE ng-show —
   `ng-show="{{sess.fileAccessCaseByCase && user.hasFileAccess}}"` — which is an anti-pattern the
   reference nonetheless ships:
   - `fa fa-folder-o fa-2x`   `{{sess.fileAccessCaseByCase && user.hasFileAccess}}`
   - `fa fa-mobile fa-2x`     `{{sess.ptrMobileAppCaseByCaseEnabled && user.hasMobileApp}}`
   - `fa fa-mobile`           `{{!sess.ptrMobileAppCaseByCaseEnabled && user.alerterAppTokens.length >0}}`
   - `fa fa-mobile` **style="color: red;"** `{{!sess.ptrMobileAppCaseByCaseEnabled && user.alerterAppFCMUserOff}}`
   - `fa fa-microphone`       `user.hasMic`
   - `fa fa-video-camera`     `user.hasCam`
   - `fa fa-desktop`          `user.hasScreen`
   - `fa fa-comment-o`        `user.hasAdminChat`
   - `fa fa-pencil-square-o`  `user.canEditNotes`
   - `fa fa-hdd-o` **red**, `title="Denied Archives Access"`, `user.denyArchivesAccess`
3. `<img gravatar-src-once="user.email " style="margin-right:5px " class="thumb24 " />{{user.userName}}`
   — a custom `gravatar-src-once` directive, `.thumb24`, 5px right margin.
4. Discord block: `ng-show="user.discordUserId"`, red, 12px, 10px left margin,
   `Discord Username: {{user.discordUsername}}`.
5. **STRIPE / MARKETPLACE BLOCK** `ng-if="user.isMarketPlaceUser"`, `.stripe-mini.mb-xs`,
   margin-top 4px. Six children, all `span.label`:
   - status: `ng-class="getStripeStatusClass(user.stripeSubscriptionStatus)"`,
     `<i class="fa fa-credit-card"></i> {{user.stripeSubscriptionStatus || 'stripe'}}`
   - `.label-default` `user.stripeLastPaidAt`      `fa-calendar-check-o`  `| date:'MM/dd/yyyy'`
   - `.label-default` `user.stripeCurrentPeriodEnd` `fa-clock-o`          `| date:'MM/dd/yyyy'`
   - `.label-danger`  `user.stripeLastPaymentFailureAt` `fa-exclamation-triangle` `| date:'MM/dd/yyyy'`
   - `.label-default` `user.stripeLastPaidAmount`  `fa-usd`
     `{{formatStripeAmount(user.stripeLastPaidAmount, user.stripeLastPaidCurrency)}}`
   - `a.label.label-info` `ng-click="openStripeDetails(user)"` `fa-info-circle` "Details"
   **We had NO evidence this feature existed.** It is not in any DOM capture.
6. Badges: `ng-if="badges.hasBadges && user.badges.length"`, inline-block, preceded by TWO `&nbsp;`.
   Inner `ng-repeat="b in badgesList" ng-if="user.badges.includes(b._id)"`, `class="label"`,
   `style="background-color: {{b.bkcolor}}; color: {{b.color}}; margin-right: 2px;"`.
   Text form `<span ng-hide="b.hasOwnProperty('imgURL') && b.imgURL">{{b.text}}</span>` OR
   image form `<img class="user-badge-img" ng-show="…imgURL" ng-src="{{b.imgURL}}" alt="{{b.imgURL}}">`.
7. `<span ng-show="user.isFreeTrial" class="badge badge-danger-chat"
   style="color: white; margin-right: 20px;"> TRIAL </span>` — note `badge-danger-chat`
   (`sheet-9.css:1233` = `background-color: rgb(255,0,0)`), NOT `badge-danger` (which is grey).
8. `<br> {{user.email}}` then, all inline:
   - `ng-show="showPins && user.mobilePairCode"` → ` |  <i class="fa fa-mobile"></i> {{user.mobilePairCode}} `
     **This is what `ng-init="showPins=true;"` on the table is for.**
   - `ng-show="user.phone"` → `&nbsp;&nbsp;<i class="fa fa-phone"></i> {{user.phone}}`
   - `ng-show="user.pw"` → 4×`&nbsp;` + `<i class="fa fa-lock">` + ` PW set`
9. `span.badge.badge-danger` × 2: `user.hideUserCount` → "User Count Hidden";
   `user.hidePersInfo` → "User Personal Info Hidden".

### Column 3 — Last Login / Notes  (:402-414)
`{{user.lastLogin | date:'MM/dd/yyyy @ h:mma'}}` — EXACT format, note the literal ` @ `.
`ng-show="user.inactive"` red `*** INACTIVE USER ***` ·
`ng-show="user.restrictPMUser"` red `<br><i class="fa fa-comment-o"></i> User PMs disabled` ·
`ng-show="user.note"` `<div style="border: 1px solid #A0A0A0; padding: 5px; "><br>{{user.note}}</div>`.

### Column 4 — Role / Status  (:415-423) — **THE ROLE LEGEND** (closes T3-1)
| expression | renders |
|---|---|
| `user.role==0` | Owner |
| `user.role==1 && !user.nonPresenter` | Presenter |
| `user.role==1 && user.nonPresenter` | Admin |
| `user.role==2` | Participant |
| `user.role==3` | CHAT MUTED (red) |
| `user.role==4` | BANNED (red) |
Plus `<span ng-hide="user.role==0"> / {{user.type}}</span>` — so a non-owner reads "Role / type".
And an APPROVE button, `btn btn-small btn-warning`, `ng-show="user.inviteStatus=='pending' "`,
`ng-click="approveUser(user.userName,user._id,$index,'approved')"`.
NOTE `btn-small` — Bootstrap 2 spelling, NOT `btn-sm`. There is no `.btn-small` rule in the
captured sheets, so it is inert; do not "correct" it to `btn-sm` or the button changes size.

### Column 5 — Actions  (:424-602) — a FOUR-LEVEL nested dropdown
`<div ng-hide="user.role==0" dropdown class="btn-group mb-sm mr"
 ng-init="submenuOpen={permissions:false, granular:false, app:false, badges:false}"
 on-toggle="!open && (submenuOpen={…all false})">` — the owner has NO actions menu at all.
Toggle: `button.btn.dropdown-toggle.btn-primary` "Actions&nbsp;" + `span.caret` + a nested empty
`<span><span style="width:107px;height:107px;left:-10.6719px;top:-42.5px;"></span></span>` (a
ripple/ink artifact left in the source).
Menu is `ul.dropdown-menu.dropdown-menu-right` with FOUR `li.dropdown-submenu` groups, each
`ng-class="{open: submenuOpen.X}"` and each closing its three siblings on click via
`$event.preventDefault(); $event.stopPropagation();`.

**`updateUser(code, _id, userName, $index)` — the COMPLETE code table:**
| code | action | where |
|---|---|---|
| 1 | Make Presenter | Permissions |
| 2 | Make Participant / **Unban** (same code, two items) | Permissions |
| 3 | MUTE Participant | Permissions |
| 4 | BAN | Permissions |
| 5 | Make Admin | Permissions |
| 6 | Make Trial | Permissions |
| 7 | Hide User Count | Granular |
| 8 | Show User Count | Granular |
| 9 | Freshen Login Date | Permissions |
| 10 | Hide Pers User Data | Granular |
| 11 | Don't Hide Pers User Data | Granular |
| 13 | Deny Archives Access | Granular (`ng-show="!user.denyArchivesAccess"`) |
| 14 | Allow Archives Access | Granular (`ng-show="user.denyArchivesAccess"`) |
**12 is unused** — no menu item calls it anywhere in the template.

Other handlers, by submenu:
- Granular: `setPermissions(user)` + `data-toggle="modal" data-target="#permissionsModal"`
  (`ng-show="user.role !== 1"` — presenters cannot have mic/cam adjusted this way);
  `setUserRestrictPM(true|false, _id, userName)`.
- App and Notifications: `getAppPin`, `showAlerterAppTokens`, `getFCMTokens`,
  `pauseUserNotifs(…,'pause'|'resume'|'unsub')`, `sendTestFCM`, `resetFCMForuser`,
  and `manageMobileApp(…,'enable'|'disable')` behind `ng-if="sess.ptrMobileAppCaseByCaseEnabled"`.
- Badges: `manageBadges(badgesList,user.badges,user._id,user.userName,user.email)`,
  `ng-if="badges.hasBadges"`.
- Top level: `setNoteUser`, `editUsername`, `deleteParticipant`, `setUserPW`, `sendWelcomeEmail`,
  `approveUser(…,'pending')` "Pause / Pending", and `manageFileAccess(…,'enable'|'disable')`
  behind `ng-if="sess.fileAccessCaseByCase"`.

### Tab structure (:608-616 and onward)
Tabs are the AngularJS UI Bootstrap `<tab heading="…">` directive, NOT hand-written `.tab-pane`
divs — the `.tab-pane`/`ng-repeat="tab in tabs"` markup in the DOM capture is what the directive
EMITS. `<tab heading="Text List" ng-show="sess.twillioApiToken">` confirms that gate at source.
`<tab heading="Branding (Logo / Landing Page) ">` — note the trailing space inside the heading.

## page.manageSession.html — STATS + MONTHLY rows (:710-757), READ

**Monthly report** (:715-724). No `<thead>`/`<tbody>` at all — `<tr>` is a direct child of
`<table class="table table-striped">`, and the month cell is a **`<th>`, not a `<td>`**:
`<tr ng-repeat="montlyStat in statXrefsMontly"><th>{{montlyStat.month}}</th><td>{{montlyStat.totalLogins}}</td></tr>`
Heading bindings the DOM capture rendered empty: `{{statXrefsMontlyByYear}}` and `{{statXrefsMontlyTotal}}`.

**User Stats row** (:739-754) — `<tr ng-repeat="userStat in statXrefs | filter: uSearchStat "
ng-hide="filterOnline && !userStat.isOnline">`. The online filter is a **per-row `ng-hide`**, not a
collection filter — the same pattern as archived rooms, so `table-striped` counts hidden rows.
- `<td>{{$index}}</td>` — zero-based again.
- Nick: `gravatar-src-once` + `.thumb24` + `{{userStat.userName}}` + the `badge-danger-chat` TRIAL pill.
- Email/IP: `{{userStat.email}}`, optional phone, then
  `IP: <a href="http://ip-api.com/#{{userStat.ip}}" target="_blank">{{userStat.ip}} (lookup)</a>`
  — an **external plain-HTTP** lookup link. Then `fa-mobile`/`fa-desktop` by `userStat.isMobile`
  and `{{userStat.browser}}`.
- Time Stamps: `In: {{userStat.inTime | date:'MM/dd/yyyy @ h:mma' }}` then
  `<span ng-hide="userStat.isOnline">Out {{userStat.outTime | …}}</span>` — note "Out" has NO colon
  where "In:" does.
- **CLOSES T3-4 (duration unit):** `{{userStat.duration / 3600 | number: 2 }}` — `duration` is in
  **SECONDS**, rendered as hours to 2 dp. No API call needed.

## page.welcome.html — ROOM LIST row (:365-390), READ

`<tr ng-hide="s.isArchivedRoom && !showArchivedRooms" ng-repeat="s in login.sessions | filter: sessSearch">`
- `<strong>{{s.uuid}}</strong>` — **`uuid` in the session list IS the short numeric id** (3625).
  Partially resolves T3-2: the list `uuid` and cloneSession's numeric `42` agree; it is the *string*
  typing in the API doc that is wrong.
- **CLOSES T2-9:** `<span ng-show="s.isClonedRoom"></span>` is **EMPTY IN THE SOURCE TOO**. It is
  dead markup — there is no cloned-room indicator to discover. Do not invent one.
- `<div ng-show="showNewRoom"><br /><muted>( {{s._id}} - ownerID: {{s.ownerdID}}</muted> )</div>`
  — **TYPO IN THE REFERENCE**: the label reads `ownerID:` but the binding is `s.ownerdID` (a stray
  `d`). It rendered a real value in the capture, so the model property genuinely IS `ownerdID`.
  Non-standard `<muted>` element, and the closing `)` sits OUTSIDE it.
- `<td>{{s.name || s.uuid}}</td>` — name falls back to the numeric id.
- State: `<div ng-hide="s.isArchivedRoom" class="label label-orange">{{s.currentState || 'open'}}</div>`
  and `<div ng-show="s.isArchivedRoom" class="label label-warning">archived</div>`.
  **CLOSES T2-8 markup + the `currentState` default**: absent ⇒ `'open'`.
- **CLOSES the "which number is which" gap:**
  `{{s.current_capacity}} / {{s.recordedMaxCapacity }}` — current / recorded max.
- Actions: Launch `btn-sm btn-info` `fa-external-link` → `/session?id={{s.uuid}}&jwtSite={{tokSite}}`;
  Manage `btn-sm btn-inverse` `fa-cogs` → `#/page/manageSession/{{s._id}}`; Marketplace
  `btn-sm btn-default` `fa-credit-card` behind `ng-hide="disableMarketplace"`.
- `<div class="col-md-2" ng-show="showNewRoom>=5">` — the **New Room** button is gated behind a
  click counter reaching 5. An easter egg, not a permission.

## page.welcome.html — ADMIN USERS (:1291-1301) and API KEYS (:1336-1352), READ

Admin users: `{{au.name}}` · `{{au.email}}` · `{{au.created | date:'short'}}` ·
`<a ng-click="removeAdminUser(au._id, au.name)"><i class="fa fa-remove text-danger"></i> Remove</a>`.
Empty state `<td colspan="4" class="text-center text-muted">No admin users added yet</td>`.

API keys: `<th>_id</th><th>secret</th><th class="text-center">Actions</th>`.
- **`<td>{{k.apiSecret}}</td>` — the API SECRET is rendered in plain text in the table.**
- `<i class="fa fa-lock text-warning" title="Restricted" ng-show="(k.restrictToSessions &&
  k.restrictToSessions.length) || (k.restrictToEndpoints && k.restrictToEndpoints.length)">`
  — **API keys support per-session AND per-endpoint scoping.** The API documentation
  (`login-page/api-docs`, all 545 lines) never mentions this. A whole authorisation dimension the
  documented surface omits.
- Actions: `rotateApiKey(k._id)` "regen secret" · `manageApiKeyRestrictions(k)` "restrictions" ·
  `deleteApiKey(k._id)` "delete", each wrapped in a `<label>`, separated by `&nbsp; | &nbsp;`.
- Empty state "No API keys yet". API Docs button →
  `/public/html/api-docs.html?src=/public/html/API_Documentation.md`.

## The three Stripe/avatar helpers, read from `app.min.js` / `vendor.min.js`

### `getStripeStatusClass(status)` — app.min.js @183507 — CLOSES T5-2
```
!status                                                   -> label-default
'active' | 'trialing'                                     -> label-success
'past_due' | 'paused'                                     -> label-warning
'canceled'|'unpaid'|'incomplete'|'incomplete_expired'     -> label-danger
anything else                                             -> label-info
```
Comparison is `(''+status).toLowerCase()`, so it is case-insensitive.

### `formatStripeAmount(amount, currency)` — app.min.js @183815 — CLOSES T5-3
```js
if (undefined===amount || null===amount || isNaN(amount)) return '';
var dollars = Number(amount)/100,
    curr    = (currency||'USD').toString().toUpperCase(),
    symbol  = curr==='USD'?'$': curr==='EUR'?'€': curr==='GBP'?'£':'',
    val     = dollars.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
return symbol ? symbol+val : val+' '+curr;
```

**THE FLOAT DIVISION IS NOT A DEFECT, and I was wrong to flag it as one.**
I predicted `Number(amount)/100` would lose precision and violate our i64-cents rule. Tested
exhaustively — all 2,000,001 integer cent values from 0 to 2,000,000 (i.e. $0.00 … $20,000.00) —
against an integer-only reference implementation: **zero mismatches**. `toFixed(2)` rounds back to
the exact value across the whole realistic range. It only diverges above `Number.MAX_SAFE_INTEGER`
(2^53), where the input is already lossy before the function sees it. Recorded so nobody re-raises
it: the concern was mine, the evidence refutes it.

**THE REAL DEFECT is currency, not precision — a 100× error.**
`Number(amount)/100` is applied UNCONDITIONALLY. Stripe sends **zero-decimal currencies**
(JPY, KRW, VND, CLP, ISK, and others) as whole units, NOT hundredths. So ¥1999 arrives as
`amount = 1999` and renders as **`19.99 JPY`** instead of `¥1,999` — a hundredfold understatement
on every zero-decimal currency. Verified: `formatStripeAmount(1999,'JPY')` returns `"19.99 JPY"`.
**Do not copy this.** Our implementation must branch on Stripe's zero-decimal list.

Two lesser defects, both verified:
- `formatStripeAmount(-1999,'USD')` returns `"$-19.99"` — symbol before the sign, rather than
  `-$19.99`.
- Only USD/EUR/GBP get a symbol; every other currency renders `"19.99 XYZ"` (value, space, code).

### `gravatarSrcOnce` — vendor.min.js @278041, the `ui.gravatar` module — CLOSES T5-4
`restrict: "A"`. Collects every `gravatar*`-prefixed attribute on the element as URL params.
`$watch`es the expression; the `Once` variant returns early while the value is null and
**deregisters its own watcher** on the first non-null value. URL build:
```
secure     -> https://secure.gravatar.com/avatar/<hash>
otherwise  -> <protocol||''>//www.gravatar.com/avatar/<hash>
```
Defaults are `secure: false`, `protocol: null`, so the live URL is protocol-relative
`//www.gravatar.com/avatar/…`. If `src` already matches `/^[0-9a-f]{32}$/i` it is used verbatim,
otherwise `md5(src)` is applied.

**PRIVACY CONSEQUENCE, worth stating explicitly:** the value passed is `user.email`, so **every
user's email is MD5-hashed in the browser and sent to gravatar.com** on every render of the users
table and the stats table. That is a third-party data flow the captures never made visible, and it
is inherited by anything that copies `gravatar-src-once` verbatim.

---

## PART 4 — the four small `views/` templates, read END TO END (2026-08-13 12:31 EDT)

All four are short enough to read whole, and all four were read whole. Together they are 255 lines
off T5-7. Nothing below is from a search.

### `views/page.stats.html` — 100 lines. The CHART page, not the manage stats table.

Almost the entire file is commented out: a "Realtime" panel with a flot chart and an update-interval
input (:7-24), and a Bar/Pie row (:71-96). What actually renders is four things:

1. `panel-title` "Historical" followed by THREE `&nbsp;` and a bare `<select>`.
2. **That select is doubly inert, and both halves are the reference's own bugs.** It has no
   `ng-model`, so nothing reads it — and all FOUR options carry `value="hourly"`:
   `<option value="hourly">Hourly</option>` … `Daily` … `Weekly` … `Monthly`. Even if something read
   it, every choice submits the same value. Do not "fix" either half when rebuilding; record it.
3. `<flot dataset="userStatsData" options="userStatsDataOptions">` — EMPTY in the template. The
   chart is built at runtime by the flot directive, so the dataset shape is not in this file.
4. The download control:
   `<a ng-href="/users/v1/sessions/stats/{{sessionID}}/{{tok}}" button class="btn btn-oval btn-info" download="{{sessionID}}.json">Download</a>`
   Note the stray bare `button` attribute on an anchor — meaningless, and present in the source.
   The endpoint returns **JSON**, named `{{sessionID}}.json`. Ours exports **CSV** from
   `account/rooms/[id]/stats.csv` — a different route and a different format.

`.btn-oval` IS a real rule (`styles.css`:41810), shared with `.btn-pill-left`:
`border-top-left-radius: 50px; border-bottom-left-radius: 50px; padding-left: 18px`.

### `views/users.html` — 37 lines. The room ROSTER, `UsersCtrl`.

`<container-fh>` custom element wrapping the `l-table-fixed` / `l-cell` / `l-table` layout scaffold.
Heading `<div class="p bt">Participants</div>`. One `<ul ng-repeat="user in roster" class="list-block">`
— note the repeat is on the `<ul>`, so each roster entry gets its OWN list, not one list of items.

Per entry: a `.point-pin` wrapper holding an avatar `<img class="media-object img-circle thumb40">`
with `ng-src="{{::user.avatar || 'app/img/user/user.png' }}"` and `alt="Image"`, plus a sibling
`<div class="point point-success point-lg">` — the online dot. Then `.media-body` with
`{{::user.nick}}` and `<small class="text-muted">{{::user.tagline || 'Trader'}}</small>`.

**`::` one-time bindings throughout** — avatar, nick and tagline never update after first render.
`'Trader'` is the tagline default and `app/img/user/user.png` the avatar default.

### `views/page.recordings.html` — 27 lines. `LoginCtrl`, container at `width: 70%`.

Empty state: `<li ng-hide="recs.length>0">No Recordings...</li>` — a BARE `<li>` with **no**
`list-group-item` class, unlike the populated rows. Three dots, capital N and R.

Populated row: `<li class="list-group-item" ng-hide="recs.length==0" ng-repeat="rec in recs">`. The
`ng-hide` is redundant beside the `ng-repeat` — an empty array renders nothing regardless — but it is
there.

- `<h4>` with `fa-file-video-o`, then `{{::rec.created | date:'MM/dd/yyyy @ h:mma' }}` — **the exact
  format our `formatLastLogin` already implements** — then `fa-clock-o` and
  `{{(rec.length/60000) | number:2}} Minutes`. So `rec.length` is MILLISECONDS, shown to two decimals.
- `<video ng-src="{{rec.vidPath}}" controls type="{{rec.contentType}}" width="640">` — `type` on the
  `<video>` element itself, which is not valid HTML (it belongs on a `<source>`), and `width` with NO
  height.
- Download: `<a ng-href="{{::rec.vidPath}}" target="_blank" download="{{rec.name}}" class="btn btn-default">`
  with `fa-cloud-download`.
- **A DEAD CONTROL IN THE REFERENCE:** `<a href="" class="btn btn-default"><i class="fa fa-share"></i> Share</a>`
  — no `ng-click`, no `ng-href`, no handler of any kind. It renders and does nothing. Worth stating
  because this project's own rule forbids shipping one, so a faithful rebuild has to choose: match the
  reference and ship a dead button, or omit it. **Recommend omitting it and recording why** — the
  same call already made for the Stripe "Details" link, and for the same reason.

### `views/page.avatars.html` — 17 lines. `AvatarsCtrl`.

`ng-repeat="avatar in avatars"` over `col-md-1` cells, each an `<a class="avatarChooser" ng-click="selectAvatar(avatar)">`
wrapping `<img ng-src="{{::avatar}}" alt="Image" class="thumb80">`. Heading
`<div class="p bt center">Choose The Avatar you want to use</div>` then an `<hr/>`.

Rules, all real, all from `styles.css`:
- `.avatarChooser` — `transition: all 0.25s ease` and its four vendor prefixes. **A transition with
  no `:hover` rule in the same file**, so nothing visibly transitions; kept as a finding rather than
  "corrected".
- `.thumb80` — `width/height/line-height: 80px !important`
- `.thumb40` — `width/height/line-height: 40px !important`
- `.list-block` — `padding-left: 0; list-style: none`

### What these four close, and what they open

They close 255 lines of T5-7 and confirm `.btn-oval`, `.avatarChooser`, `.thumb80`, `.thumb40` and
`.list-block` as real captured rules.

**They open T5-16 and T5-17: two PAGES that neither of our apps has.** Checked both — `apps/controller`
and `apps/room` — for `Recordings`, `avatarChooser` and `selectAvatar`. Neither implements either page.
Not built here, deliberately: `recs` and `avatars` come from controller endpoints for which this
repository holds no contract, and inventing a data source to make a page render is precisely what the
evidence rules forbid.
