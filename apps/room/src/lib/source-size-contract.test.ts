import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  A ratchet, because the standard said "clean, maintainable code" and three files quietly stopped
  obeying it.

  Measured 2026-08-15: `+page.svelte` is 13,663 lines, of which 9,410 are the `<script>` block. That
  is not a large template - it is nine thousand lines of TypeScript orchestration living inside a
  component, which is the thing `.svelte.ts` rune modules and child components exist to prevent.
  `ModalHost.svelte` is 5,985. Together those two are 46% of every line of Svelte in the repository.

  This file does not fix that. It stops it getting worse while the extraction happens, which is a
  different and necessary job: the reason those files grew is that adding one more handler to an
  existing file is always cheaper in the moment than creating a module, and nothing ever said no.

  HOW TO USE IT: the ceilings below only ever go DOWN. Extract a slice, run the suite, and lower the
  number to what the file now measures. If you find yourself raising one, that is the conversation
  this file exists to force - not a number to edit.
*/

const SOURCE = new URL('../', import.meta.url);

/*
  `SLACK` keeps a ceiling from going stale. Without it a file could be cut in half and its ceiling
  left at the old value, which would silently license growing all the way back. 100 lines is enough
  that ordinary edits do not churn this file, and small enough that a real extraction has to lower
  the number it just beat.
*/
const SLACK = 100;

const CEILINGS: readonly { file: string; max: number; why: string }[] = [
  {
    file: 'routes/+page.svelte',
    /*
      RAISED ONCE, 2026-08-15, from 13551 to 13561, and recorded rather than quietly edited because
      the rule above says a raise is a conversation.

      The commit is the first remote-function conversion: `?/unmuteChat` left `+page.server.ts` for
      `routes/chat-mute.remote.ts`. Across the two capped files that is -42 (this one +10, the server
      file -52), plus a 99-line documented module. What it cost HERE is ten lines of comment
      explaining, at the first call site in the codebase, why a refusal is now caught instead of
      dropped.

      That is the opposite of the growth this ratchet exists to stop — which is one more handler
      added to an existing file because a module was more work. Shaving the explanation to fit would
      have been the tail wagging the dog, and this repository's standard says in as many words not
      to shorten comments to look tidy. The number moves and says why. It does not move again.

      It did not, twice over. `getMyMobilePin` first pushed the file to 13,569 and `loadOlder*` to
      13,562, and both times the answer was the one the rule asks for rather than another raise: the
      reasoning went into the module that owns it (`mobile-pin.remote.ts`, `log-pages.remote.ts`)
      instead of being duplicated at the call site. The file came out at 13,558 and then 13,556,
      both BELOW the raised ceiling.

      That is the difference worth naming, because it is what makes the ratchet useful rather than
      annoying: compacting a comment to hit a number is the tail wagging the dog, but moving an
      explanation to the code it explains is the extraction itself. The first is why the ceiling
      moved once; the second is why it has not moved since — through five conversions and down to
      13,550, which is BELOW where it stood before the raise.

      The seventh conversion (`recordingState`, `changeChatMode`) is the first where moving the
      reasoning was NOT enough on its own: it landed 15 over, because a `try`/`catch` around a
      command is three lines where a `void fetch(...)` was one, twice over, plus the two imports.
      What paid for it was an EXTRACTION, which is what this file is supposed to provoke —
      `stripHtmlToText` and its docstring left for `#lib/chat-plain-text.ts`. Pure, twinned with a
      server derivation it has to agree with, and untestable in here without mounting the page.

      That is the ratchet working as designed rather than as an obstacle: the growth was real and it
      was paid for with a real module, not with a shorter comment and not with a bigger number.

      The eighth (the Files pane and the composer upload) went the same way and cost 20: four call
      sites, each trading a `void fetch(...)` for a `try`/`catch`, plus a five-line import. Paid for
      by moving `mediumDate` to `#lib/message-formatters.ts` — where the room's four other date
      formatters already live, and where it stopped constructing a fresh `Intl.DateTimeFormat` on
      every call. Then two lines back for `{ cause }` on a re-thrown upload failure, which eslint's
      `preserve-caught-error` was right to demand: an `HttpError` re-thrown as a bare `Error` keeps
      the sentence and loses the status the server answered with. 13,534 -> 13,529 on the commit.

      The ninth (the account and settings writes) cost 14 and was paid the same way, with the piece
      of `savePreference` that never belonged in a component: `mirrorPreferenceToLocalStorage` now
      sits beside the dead-key list it evicts, where the module that owns WHICH keys are dead owns
      the eviction. The page had that loop inline, four lines from the server write it pairs with.

      The tenth (the four message and alert posts) is the largest single drop this file has recorded
      on the server side — `+page.server.ts` 2,405 -> 2,084 — and cost the component 5. Paid with
      `fileSizeInKb`, which went to `#lib/file-sort.ts` where the module that owns how the Files pane
      sorts and labels its rows now owns how it formats them; and with the two selected-message sends
      collapsed into one, because they differed only in which command they called.

      The eleventh and last — `messageAction`, 314 lines and six operations — cost 4, and paid with a
      duplication the conversion exposed: the reaction toggle existed THREE times, twice on the server
      and once as the page's optimistic copy, and no test had ever read the result of any of them.
      `#lib/reaction-toggle.ts` states the four rules once, both sides call it, and it is executed.

      Eleven conversions, and the ceiling has moved once — up, early, on the first one. Everything
      since has been paid for with a module.

      THE DECOMPOSITION TO ~1,100 STARTS HERE. `RoomPolls` is the first of six state classes, and it
      moves the number by only 2 because the page gained a comment explaining the pattern once, for
      all six. The line count is not the point of this first slice; the pattern is, and it is proven:
      `svelte-autofixer` returns `issues: []` AND `suggestions: []` on the 115-line class, where the
      same call on this file returns ~100 suggestions with no way to tell new from pre-existing.

      `RoomMenus` is the second, and the first to move the number properly: eleven floating-menu
      flags and 82 assignment sites out, 13,520 -> 13,496.

      `RoomSplit` is the third and the largest so far: 13,496 -> 13,157, a drop of 339. Seven pieces
      of reactive state, five plain ones and twenty derived geometry values that ran from the seed
      at the top of the file to the drag handlers 5,500 lines below — one domain, spread over a
      distance nobody could hold in their head.

      It is also the first slice where the extraction paid for itself twice. Reading the two default
      fractions together showed the same kind of measurement sourced two different ways three lines
      apart: one cited `DIRECT_EVIDENCE_CONTRACT`, the other was a bare seventeen-figure literal.
      Naming it and PROVING it — the constant and the 11px gutter reproduce all four captured flex
      strings exactly — is four assertions that could not have been written while the number had no
      name.

      `RoomRoster` is the fourth: 13,157 -> 13,048. The two transcribed pipes and the four gates
      stayed in `#lib/roster-gates.js` where their truth tables are — what moved is the state they run
      on, plus the random draw and its three-second reveal timer.

      `RoomAlerts` is the fifth: 13,048 -> 12,974. A smaller drop than the two before it, and
      deliberately so — `visibleAlerts`, `searchableAlerts` and the alerts PAGING all stayed. The
      paging is not alerts machinery at all: upstream renders one roomlog component for both logs,
      switched on `logType`, so moving the alerts half would split a thing that is one thing. What
      the slice bought instead is that the filter's two viewer-owned halves stopped being restated
      at three call sites.

      `RoomLogPages` is the sixth, and the first that removed a DUPLICATE rather than moving a
      slice: 12,974 -> 12,961. The alerts log and the chat log held the same older-page machinery
      twice, in two shapes — scalars against per-channel maps — and neither shape was wrong, which
      is what let it survive. Upstream keeps the state on the roomlog component and renders one per
      log view, so the arity is the only difference. One keyed class covers both.

      `RoomChat` is the seventh: 12,961 -> 12,954. Small, and the reason is the point — the two
      columns' state was FIVE fields declared 650 lines apart, and what bound them was not visible
      from any one of them: `extraChatColumn && (fromExtraColumn || chatInputFocus === 'textAreaTxtExtra')`
      decides which composer every mention lands in. Moving five declarations saves few lines;
      naming the thing that reads three of them at once is the whole slice.

      `RoomMedia` is the eighth and closes Phase 1: 12,954 -> 12,938. Twenty-one flags, and the
      boundary is the design — STATE moved, TRANSPORT did not. A class that owned a `MediaRecorder`
      would have to own its lifecycle, its error paths and its `ondataavailable`, and the room would
      have gained an abstraction over the browser rather than an owner for its state.

      It also collected the two fields `RoomRoster` refused by name, and it found a control with no
      writer: `isRecordingStarting` was declared once, rendered once as `recIndicatorStart`, and set
      by nothing — so the presenter got no feedback at all between pressing record and the room
      confirming. Wired, including the failure path.

      PHASE 2 STARTS HERE — the template into components, which is where the count actually moves.
      `PrivateChatPanel` is the first and the smallest of the five: 12,938 -> 12,715, a drop of 223
      for a 250-line region, because the extraction also took `showPMToolbar` out of this file
      entirely. State whose only reader is one component belongs to that component.

      PROPS rather than `createContext`, against the plan: the eight state classes are instantiated
      inside this component, so they are per-request already and there is nothing for context to
      protect against. The panel is a DIRECT child. Context earns its place when a pane grows
      children that need the same state, and the note in `PrivateChatPanel.svelte` says so.

      `RoomSidebar` is the second: 12,715 -> 12,236, a drop of 479 for a 522-line region. The first
      component to take state CLASSES as props rather than a wall of scalars — `roster` and `menus`
      go whole, three references replacing about twenty. That is the argument for the classes
      landing BEFORE the components, paying off where it can be seen.

      `RoomNavbar` is the third: 12,236 -> 11,585, a drop of 651 for a 711-line region. Seventy-odd
      identifiers, two thirds of them handlers, and almost every piece of state belonging to
      `RoomMedia` or `RoomMenus` — three instances replacing about thirty scalars.

      PHASE 3 STARTS HERE — the effects. The `visibilitychange` listener became a
      `<svelte:document>` handler, which `svelte/best-practices` names by itself: listeners on
      window or document belong on those elements, not in an effect. 13 effects -> 12.

      The conversion cost the file MORE lines than it removed, because the reasoning is longer than
      twelve lines of `addEventListener` plumbing. Rather than raise the ceiling or shorten the
      explanation - the two things this file exists to refuse - it was paid for with an extraction
      that was overdue anyway: the four captured navbar strings went to `#lib/navbar-labels.ts`,
      where the spacing that has already caused one bug in this repository is documented instead of
      sitting as four bare literals nothing marked as evidence.

      3b merged the TWO `visibilitychange` listeners this page had - one tracking focus and
      catching the chat up, one pausing the five-second refresh poll - into the single
      `<svelte:document>` handler. The poll hoisted out of `onMount` to sit beside it, which costs
      lines here and removes a listener, a teardown and a whole duplicated concern.

      3c: `RoomArrivals`. Three effects each answered "which rows in this wholesale-replaced list are
      new?" with their own set and their own priming boolean - `seenAlertIds`/`alertDeliveryInitialized`,
      `seenQuestionIds`/`qaNoticesPrimed`, `seenMessageIds`/`chatSoundPrimed` - two thousand lines
      apart, restating the rule that the first pass announces NOTHING three times. One class now, so
      the rule is tested once instead of being re-implemented where two of the three could drift.

      Then the SCROLLERS, which were the last latches: `RoomScrollFollow`. The alerts column, the
      chat column and the second chat column each ran the same twenty lines with their own three
      markers - eight identifiers for one question asked three times. Three instances now, and the
      rule that the alerts column must NOT take the viewer's `alwaysScrollToBottom` override became
      STRUCTURAL rather than remembered: it is a constructor capability, so there is no argument left
      to pass by mistake. Two contract tests were re-pointed rather than deleted, and the preference
      one got stronger for it - it now asserts on how the column is CONSTRUCTED, which is where the
      rule went, instead of regexing a call for an argument that no longer exists.

      Then `RoomMessageChrome`: the SIXTEEN props that are identical for every message in the room,
      spelled at each call site and drilled through every component standing between the page and a
      message. One `$derived` object now, spread at both lists. The line saving here is small; the
      point is that the alert/chat column stops being a ninety-prop component when it is extracted,
      which is what has kept it last. THREE contract tests were re-pointed and all three got a
      stronger guarantee: "passed at both call sites" was two spellings that had to agree, and is now
      one object reaching two spreads.

      `AlertChatArea` is the fourth component and the largest single drop of the whole exercise:
      11,550 -> 10,860, a fall of 690 for a 696-line region. It is the alerts pane, the chat pane and
      the gutter between them in one component, because the split IS one gutter dragging one
      percentage — two components would have to share that number across a boundary invented purely
      to make files shorter.

      FORTY-FIVE props, and the COMPILER produced the list rather than a scan: the file was written
      with an empty `<script>` and `svelte-check --output machine` was asked what it could not
      resolve. That mattered concretely here — `data` appears twelve times in that markup and not
      once as the variable, every hit being a `data-bs-toggle` or `data-bs-target` attribute, which
      is the same false positive that put four invented props in a first draft of `RoomNavbar`.

      What made this the LAST of the five, and what actually blocked it for a day, was not the
      component: it was 24 assertions across 13 contract files, several of which assert on BOTH the
      page's script and the pane's markup in one test. Those got two source constants each and every
      assertion pointed at the file that owns its subject — and most of them came out stronger,
      because a control split across two files now has its hand-off asserted as well. A pane whose
      callback nothing supplies is exactly the defect a single re-pointed constant would have hidden.

      `PresentationArea` is the fifth and CLOSES PHASE 2: 10,860 -> 9,612, a fall of 1,248 for a
      1,335-line region. The webcam strip, the main tab bar and all seven of its panes.

      It takes ~100 props, which is the largest surface of the five and is not defended as elegant —
      it is what the region reads, produced by the compiler rather than by a scan. Two things came
      out of that list which a hand scan would have got wrong: `screenVolume` is a SNIPPET, not a
      value, and `captureVideoImage` is an import from `#lib/screen-zoom.js` rather than page state.

      DEVIATION, recorded: the page's function names are kept rather than renamed to `on*` as
      `RoomNavbar` and `AlertChatArea` did. A third of the ~45 functions here are QUERIES the markup
      calls to compute a value (`countFiles`, `searchedFiles`, `matchesFileTab`, `fileSortTitle`,
      `swingAlertPayload`), and an `on` prefix would misname them; renaming only the true handlers
      would leave two conventions inside one file. The one exception is `onfilesearch`, which became
      a callback because ESLint proved the value was write-only in the pane — see that prop's note.

      The Files pane inside it is a `FilesPane` waiting to happen: ~480 lines and ~25 identifiers
      with no component of its own. Recorded in `TODO.md` rather than done here, because two
      extractions in one pass is how a mangle ships.

      PHASE 5 STARTS HERE — the script block, which is what Phases 1 to 4 left behind. Slice 0 was
      the gates and moved nothing. `RoomToasts` is slice 1: 9,606 -> 9,533, a drop of 73.

      SEVENTY-THREE, against a planned ~250, and the gap is a deliberate re-scoping rather than a
      shortfall — recorded here because a number that misses its estimate silently is how the next
      estimate gets believed. The plan filed alert and Q&A DELIVERY under this slice. Delivery reads
      six preferences that are still declared in the page, so moving it now would have meant six
      constructor thunks rewritten two commits later. The class took the MECHANISM — the queue, the
      timers, the duplicate guard, the browser notification — and left the policy where its inputs
      are. The rest of the 250 arrives with the preferences in slice 3.

      What the slice actually proves is the pattern, which is why it was chosen first: state and the
      functions that write it leaving TOGETHER, where Phase 1 moved fields and left 248 bodies here.

      3,021 -> 2,943 on 2026-08-17, and NOT from an extraction — from deleting prose, which is the
      one thing this ratchet is otherwise written to forbid. It is recorded here so the exception is
      legible rather than looking like the practice.

      Seven block comments in this file had lost the code they explained. Five were moved down onto
      the declarations they describe, which costs nothing and is the ordinary fix. Two were DELETED:
      the older-chat-history note, whose subject now lives in `+page.server.ts:462-476`, and the
      second-chat-column note, whose subject moved to `ExtraChatPane.svelte:220-250` on 2026-08-16
      and took a better-worded copy of the same reasoning with it. Both were verified to survive at
      those references BEFORE the delete — the rule is that comments move with their code, and a
      third copy of a sentence that already exists twice is not the asset, it is the drift.

      The second one is why this was worth doing at all rather than tidying: it had come to rest
      directly above the ALERT-ARRIVAL effect, so this file explained chat scrolling and then showed
      the alert filter. `svelte-check`, eslint, the autofixer and 2,402 tests were all green.

      2,943 -> 2,642 on 2026-08-17, S3, and this one IS an extraction: the four delivery effects, the
      two policy functions and the four arrival trackers went to `RoomOverlays.svelte`, which renders
      the toast host they drive. 308 lines out for two props in.

      What made the timing right was a condition somebody wrote down instead of remembering.
      `RoomToasts`'s construction note said the class owns the mechanism and not the policy, because
      the policy "reads six preferences that still live in this file, so they stay here until those
      do". Slice 3 moved those six. The note named its own trigger, the trigger fired, and it is
      updated in place rather than dropped — which is the only reason anyone noticed.

      2,642 -> 2,638 the same day, S5: the SFU spatial-layer effect went to
      `PresentationArea.svelte`, which renders the screen whose bandwidth it decides. Four lines, and
      the slice earned its place for what it EXPOSED rather than for the number. `applyScreenLayers`
      appeared in two files under `src/` and in no test at all, so deleting the effect outright left
      the suite green at 2,402 — the wiring for the room's whole screen-quality behaviour had no
      guard. `screen-layer-wiring-contract.test.ts` now holds it, and holds in particular the two
      `void` dependency reads that look exactly like dead code and are the only reason the effect
      re-runs when a viewer switches tabs.

      2,638 -> 2,509 the same day, S4+S8 as ONE slice, because S4 moved the two layout effects and S8
      created the file they move into: doing them apart would have made either a shell with no
      effects or two effects with nowhere to go. `RoomShell.svelte` takes the `as-split` element, the
      gutter, the mobile/desktop child ORDER and both effects.

      129 lines for a 226-line component, and the gap is the point rather than an overhead: the three
      panes did NOT move. They are still built here and handed over as SNIPPETS. `AlertChatArea`
      takes 45 props, `PresentationArea` over 90 and `ExtraChatPane` 28, so passing them THROUGH a
      shell would have meant roughly 160 pass-through props, a second place for each to drift, and a
      forced edit to every pane contract in the repository. A snippet is a closure over this file's
      scope, so the shell places markup it knows nothing about.

      1,452 -> 1,431 on 2026-08-18, and this one removed no behaviour at all. Twenty-one props at the
      `<PresentationArea>` call site were members of two objects the same call site ALREADY passed
      whole — seventeen off `screens`, four off `mediaTransport`. Every one of them was the shape
      `member={facade.member}`, so the page was hand-forwarding a getter it had just handed over.
      The line count is the smallest part of it: adding a screen control used to cost three edits in
      two files, and now costs none.

      1,431 -> 1,408 the same day, and the same shape a third time: `webcams`, `notes` and
      `broadcasts`, twenty-three more props that were members of objects this page holds. `notes` is
      the one to read the diff for — it was carrying a FIVE-LINE generic wrapper whose entire job was
      to re-declare `submitMutation`'s type parameter so the generic survived being handed through a
      prop. Passing the object deleted the wrapper outright, which is a kind of line this ratchet
      does not otherwise know how to ask for.

      `PresentationArea` is also down to 1,112 rather than up, and the note on its own entry records
      why that took an extraction rather than a raise.

      1,408 -> 1,404 on the `$state.raw` sweep, and it FELL while gaining two explanatory comments:
      `captionHistory` and `globalChatStyle` are replace-only, so the generic collapsed onto fewer
      lines than the proxied declarations took. Not a saving worth chasing - recorded because a
      ceiling that moves for a reason nobody wrote down is the thing this file exists to prevent.
    */
    /*
      1395 -> 1390 on 2026-08-28, and it is worth saying what those five lines were because they are
      not code. Thirteen SURPLUS BLANK LINES were removed from inside `<script>` — debris left by
      earlier extractions, in a file that `.prettierignore` deliberately excludes so nothing was
      collapsing them — and eight went back as the `applyRoomDefaults` call and its note. Whitespace
      only, and inside the script block, so the pixel-diff reason this file is unformatted does not
      apply: no text node moved.
    */
    /*
      1390 -> 1387 on 2026-08-28. `hasQaOnAlerts` arrived on the message chrome (+2) and five
      single-use `$derived` consts went inline in the object that reads them (-5): each was a name
      whose only reader was one field below it, and each was its own signal inside an object that is
      already `$derived`, recomputing independently to feed one that recomputes anyway. The two
      docblocks that explained those five separately are now one, because they were one subject.
    */
    /*
      1387 -> 1375 on 2026-08-28, and this one is an EXTRACTION rather than a trim. The
      twenty-two-line `messageChrome` object left for `buildMessageChrome` in
      `room-message-chrome.ts`, beside the type it satisfies. "Which settings does a message read"
      was never the page's question, and keeping the answer in two files is exactly why six props
      sat on `RoomMessage` unfed with their values already on the wire: nothing compared the type to
      the construction. Two stray `$derived` consts feeding that object went with it.
    */
    /*
      1375 -> 1377 for the buffer preference's two lines and their comment. See the `PresentationArea` entry: a live
      control that could not act is worth one line more than a ceiling.
    */
    /*
      1377 -> 1379 for TWO lines: the sidebar seed's `svelte-ignore` and the blank the formatter puts
      after it. The seed itself replaced the `$state(false)` that was already there.

      The reason was on the directive line for one run — `// svelte-ignore state_referenced_locally
      -- a SEED; …` — and eslint refused it: Svelte reads everything after the code as MORE codes, so
      `svelte/no-unused-svelte-ignore` reported four ignores that warn about nothing. Recorded
      because it is a trap the next person will hit: that directive takes codes and nothing else.

      The transcription and the seed-versus-lock argument live in
      `always-show-roster-contract.test.ts` rather than here, which is why the page pays two lines
      and not a paragraph.
    */
    /*
      1379 -> 1380 for `hideWebcamForRoom` and `blinkingRec` reaching `RoomNavbar` — two values
      forwarded, one line net after the formatter.

      FOURTH raise of the day on this file, and the pattern is worth naming rather than repeating
      silently: every one has been a room setting travelling from `data.sessData` to a component,
      and each costs the page a line whatever the destination does with it. The structural answer
      already exists and was applied where it paid — `buildMessageChrome` took twenty-two such lines
      out in one move, and the page fell 1,387 -> 1,375. A second such builder for the navbar would
      collapse its five `gates.*` settings and these two, and that is the shape to reach for if this
      number climbs again. Two props do not justify it today.
    */
    /*
      1380 -> 1390, 2026-08-28, and this raise OWES THE NOTE ABOVE AN ANSWER, because that note named
      the navbar builder as the thing to reach for the next time this number climbed. This is the
      next time. The builder was measured rather than assumed, and it was not built:

      Seven values would move - five `gates.*` and the two `sessData` reads - and they cross exactly
      ONE component. `buildMessageChrome` paid because sixteen values crossed THREE, so each was
      declared, destructured and forwarded three times over; the saving there was structural and it
      found six unfed props on the way. Here the saving is six lines on this file against changing
      the prop surface of the largest navbar in the room and re-pointing every read inside it. That
      is a worse trade than the raise, and pretending otherwise would be an extraction invented to
      satisfy a number - the exact thing the `PresentationArea` entry refused twice.

      So the debt is RE-STATED WITH A THRESHOLD instead of promised again: the navbar builder is
      worth doing when a SECOND component needs these values, or when the navbar's settings pass
      ten. Neither holds today. A promise with no trigger is how a note gets re-broken every time.

      WHAT THE TEN LINES ARE: `<svelte:head>` with the room's own name in it - three lines of
      markup, four of comment and the blank the formatter puts after - plus `modMessage` reaching
      `PresentationArea`. `name` and `modMessage` are the twelfth and thirteenth settings answered by
      building rather than by triage. The transcriptions are NOT here and NOT on the page: they are
      in `moderator-message-contract.test.ts`, following the roster seed three entries up, which is
      why the title costs four comment lines instead of a paragraph.
    */
    /*
      1390 -> 1387, 2026-08-28, and this one goes DOWN, which is the direction this file prefers.

      `noteGates` was built on the page from a six-line object literal naming which fields of `data`
      the notes surface reads. That was never the PAGE's question. `resolveNoteSurfaceGates` now
      declares `NoteSurfaceSources` structurally and takes `data` itself, so the construction is one
      line and a third field could be added to the notes surface without the page hearing about it.

      Precedent and argument are `buildMessageChrome`'s, three entries up: which facts a surface
      depends on belongs beside that surface, and a page that lists them is a page that will be
      edited every time the list changes. It paid for the `simplifiedEditor` wire outright.
    */
    /*
      1387 -> 1366, 2026-08-28, and TWENTY-ONE lines left in one change without a single one being
      deleted. `bodySegmentsPrivate` — a fourteen-line snippet splitting a message body on URLs,
      plus its two props at the `PrivateChatPanel` call site — moved into
      `CompactMessageRow.svelte`, because a second surface (the all-user private-message modal)
      renders the same row and the snippet would have had to be threaded through two more components
      to reach it.

      The pattern is now three for three on this file: every large fall here has been a decision
      moving to the thing that owns it — `buildMessageChrome`, `resolveNoteSurfaceGates`, and now the
      row. None was an extraction invented to satisfy a number, and that is why each one stuck.
    */
    /*
      1366 -> 1367, 2026-08-28. ONE line: `rowIsFull={(entry) => rosterRowIsFull(entry, rosterSession)}`
      at the sidebar call site, beside the four roster gates already resolved there.

      Recorded rather than absorbed, because the standing rule is that every raise is a conversation
      however small — and because this one has a shape worth naming: the roster's gates are the ONE
      family on this page that has grown line by line and is still right to. Each is a predicate in
      `roster-gates.ts` with its own test, resolved once here from `rosterSession` and handed down.
      Collapsing them into an object would save four lines and lose the property that makes them
      safe, which is that each is separately named at the point a reviewer reads the call site.
    */
    /*
      1367 -> 1369, 2026-08-28. Two lines: the `tipButtonFor` import and `tip={tipButtonFor(data.sessData)}`
      at the sidebar call site.

      ONE line for THREE settings, and that is the argument for resolving the conjunction in a module
      rather than in the markup. Spelled separately this would have been three props here, three
      declarations on the sidebar and a three-way condition in two places — and the reference itself
      computes them into one field precisely once.
    */
    /*
      1369 -> 1371, 2026-08-28. Two lines: the `customPlayerUrl` import and the checked prop at the
      `PresentationArea` call site.

      THE CHECK IS ON THE PAGE and not in the component, which is the shape every other owner URL in
      this room now has — `tipButtonFor` and `customFaviconHref` are resolved here too. A component
      that received the raw setting would be a second place the scheme could be forgotten, and this
      one governs whether the room shows any video at all.
    */
    /*
      1371 -> 1375, 2026-08-28. Four lines: the `positionsIframe` conjunction, the raw URL and the
      viewer's refresh preference, at the `PresentationArea` call site.

      THE CONJUNCTION IS MADE HERE and the component receives one boolean, which is the same shape
      `tipButtonFor` takes for its three settings. Two settings that only ever mean anything together
      should not be two props a call site can get half right.
    */
    /*
      1375 -> 1382, 2026-08-28 — the typing indicator. Seven lines: `typing` on the `createRoom` destructure and three props at each of the two chat
      call sites. Two columns means two of everything at this level, and that is the feature rather
      than duplication — each column reads its OWN channel, so a shared prop would put the extra
      column's typists under the main column's composer.
    */
    /*
      1382 -> 1383, 2026-08-28. ONE line: `messageChrome` reaching `RoomOverlays`, and through it the
      Q&A thread's entries.

      One line and not five, because the chrome is already built here for the alerts column — that
      is the whole reason `room-message-chrome.ts` exists, and the alternative was a second
      construction inside the overlay layer, which is a second answer to which settings a message
      reads.
    */
    /*
      1383 -> 1385, 2026-08-28. TWO lines: `chatTabs={data.chatTabs}` at each of the two chat call
      sites.

      Two and not one because there are two columns, and that is the feature rather than duplication
      — the strip is drawn twice and each column tracks its own open tab. The list itself is the
      same for both, because an entitlement does not depend on which column a member is looking at.
    */
    /*
      1385 -> 1401, 2026-08-28, for the display mode: the `RoomDisplayModes` instance, the seed call,
      and two props at each of the three surfaces that render a message.

      SIXTEEN AND NOT FIFTY-TWO because the ratchet refused the first attempt, which had the seeding
      loop and the preference write inline here. Those went to `#lib/room/display-modes.svelte.ts`,
      which is the right home for the same reason `room-defaults.ts` is: the seed, the write-back and
      the member's later change are one rule with three parts, and split between a page loop and a
      modal callback they were two halves that had to agree about a preference key.
    */
    /*
      RAISED 1401 -> 1426 on 2026-08-28, and this one bought a fixed production defect.

      The `createRoom(...)` call moved ~390 lines down, below the ten bindings its dependency thunks
      close over, because on the SERVER a `$derived` evaluates immediately — so the composition root
      read `deps.isPresenter()` while the page's `isPresenter` was still in its temporal dead zone,
      and **every room render returned 500**. The growth is the paragraph at the call explaining why
      it sits there, plus the note on `globalChatStyle`, which seeds from a value the root returns.

      Moving the CALL rather than the ten declarations is the point: reordering consts leaves the same
      shape one edit away from breaking again, where a root constructed after everything it composes
      cannot have this bug at all. The full account is at the call site and in `app.html`'s sibling
      finding.
    */
    /*
      1426 -> 1428, 2026-08-29: two lines, `open` and `ontoggle` on `ScreenVolumeControl`, whose
      dropdown could not be opened at all. See `bootstrap-dropdown-contract.test.ts`.
    */
    /*
      1428 -> 1463, 2026-08-29, for `debug-log` — a presenter pulling one member's console log.

      Here it is the install and its teardown, the effect that opens the modal when an answer arrives, and the two notes that matter most: why the buffer is installed in `onMount` rather than in `createRoom`, and why it is installed BEFORE the stream subscribes.

      A FEATURE arriving, not a wire. It left `INERT_ACTIONS`, which is what removing an entry there
      declares, and it is the one command in this room that could not be transcribed: upstream's
      reply lets the CLIENT name who receives the log, so the server had to grow a memory of who
      asked. `debug-log-contract.test.ts` is where that argument lives; these files carry only what
      each of them does.
    */
    /*
      RAISED 1463 -> 1470 on 2026-08-29, for `doChatLogSearch`, and argued here because the rule at the top of
      this file says a raise is a conversation. THE ARGUMENT IS ON `feeds.svelte.ts`, which took the
      security-relevant half of the change; this entry carries its part.
    */
    /*
      RAISED 1470 -> 1472 on 2026-08-29: two props for the navbar's Benzinga item. Assembly only —
      the argument is on `RoomNavbar.svelte`.
    */
    /*
      RAISED 1472 -> 1474 on 2026-08-29, for `restoreMobileAppTokens` — the Mobile App tab. Argued because the
      rule at the top of this file says a raise is a conversation; THE ARGUMENT IS ON
      `ModalHost.svelte`, where the tab itself landed. This entry carries its part.
    */
    /*
      DOWN 3 on 2026-08-30. The Benzinga feature was six prop lines across two components; it is two
      now, and the flag that was missing from one of them cannot be dropped again.
    */
    /*
      1,471 -> 1,473, 2026-08-30. Two props: `hasMore` and `loadingMore` reaching `PrivateChatPanel`
      from the class that now owns them. The page is the only wiring point between the two, so this
      is the same irreducible two lines the composition root pays whenever a value crosses.
    */
    /*
      1,473 -> 1,474, 2026-08-30. One line: `showPmButton={gates.showPmButton}` reaching the main
      chat column, beside the one the extra column has always had.
    */
    /*
      1474 -> 1477, 2026-08-30. Three lines, one per surface that renders a message:
      `presenterColors={data.presenterColors}` to `AlertChatArea`, `ExtraChatPane` and
      `RoomOverlays`. The map itself is read by the load and the lookup happens at the leaf, so the
      page's share of the presenter-colour feature is exactly this pass-through.
    */
    /*
      1477 -> 1478, 2026-08-30. One line: `onpasteimage={(file) => composer.beginImagePaste(file)}`
      on `AlertChatArea`. The chat composer had no `paste` binding at all — `acA-02` — while all
      three ALERT composers have had one since they were built.
    */
    /*
      1478 -> 1479, 2026-08-30. One line: `alertLabels={gates.alertLabels}` to `RoomOverlays`, so the
      post-alert composer's label picker reads the SAME parsed table the alerts column renders badges
      from. Two parses of one setting is how a picker offers a label the renderer does not know.
    */
    /*
      1479 -> 1483, 2026-08-30. Four lines wiring the inline alert entry (`acA-01`) to the three
      things it needs: the text post, the image paste, and the toggle that persists and re-scrolls.
    */
    /*
      1483 -> 1492, 2026-08-30. Nine lines for two private-chat rows: `pmLogsOnRight` handed to the
      panel (G5) and `onclosepeer` calling `privateChat.closeTab()` (G8), each with the sentence
      saying what it was doing wrong before.
    */
    /*
      1492 -> 1512, 2026-08-30. G1 and G13 for the private composer: `canPostImages`, `webinarMode`,
      the Giphy key and three callbacks handed to the panel, plus `chatEnabled` crossing into
      `RoomDeps` so the `canPost` refusal asks the same authority the main composer renders on.
    */
    /*
      1512 -> 1508, 2026-08-30, and DOWN. `oncomposerfocus` added; the number falls because the
      previous raise anticipated more than the composer extraction ended up needing here.
    */
    /*
      1,508 -> 1,529, 2026-08-30. Twenty-one lines, and nineteen of them are one `$derived` and its
      reason: `localScreenShares`, the screens THIS browser is sharing, for the navbar's per-screen
      stop entries (G07).

      The reason is the whole of it. Upstream repeats over `mediaSoupService.screenProducers`, a
      LOCAL producer map that cannot contain anybody else's share. The nearest thing here is the
      screen TAB list, which contains everyone's — so the filter is `ownerId === null`, which
      `RoomScreens` documents as "one of this browser's own". Without it the menu would offer a
      presenter the chance to stop a screen they are not sharing.

      **It sits below `createRoom`, and that placement is load-bearing.** A `$derived` reading
      `mediaTransport` above that destructuring is a temporal-dead-zone read that evaluates
      immediately on the server — which is the exact shape of the defect that answered 500 on every
      room load for eleven days, and which `svelte-check` is silent about.
    */
    /*
      1,529 -> 1,541, 2026-08-30. Twelve lines: RS-07's four button labels and their citation, and
      `badgesFor` handed to the sidebar. The labels are the answer to a yes/no question that this
      room was answering with OK and Cancel — "Cancel" reading as abandon-the-whole-thing where it
      actually means draw from everybody, which is a different action rather than none. One more line
      for RS-09's `tip={tipButtonFor(data.sessData)}` on the navbar, which is the same resolver the
      sidebar already reads.
    */
    /*
      1,543 -> 1,544, 2026-08-30, for USM-15: one line,
      `captionsAvailable={gates.speechRecognitionAvailable}`. Resolved here because `gates` is the
      page's and the rule is that class's; see the matching note on `RoomOverlays.svelte`.

            1,542 -> 1,543, 2026-08-30, for SC-14: one line, `hasMic={data.user.hasMic === true}` on
      `RoomNavbar`. The value has to arrive here as well as at `RoomOverlays` because the navbar is
      rendered by the PAGE and the modal by the overlays — two components, one permission, and no
      shared holder between them that is not the page itself.
    */
    /*
      1,544 -> 1,559, 2026-08-30, for USM-17. Fourteen lines: `savedChatStyle`, the two-statement
      `setTheme`, and the two-statement `mergeGlobalChatStyle` that keeps them in step.

      WHY NOT AN EXTRACTION — and the answer is that one was made. The REASONING left, to
      `chatStyleAfterThemeSwitch` in `#lib/chat-style.ts`, which is where the citation and the
      "saved wins" rule now live; the page keeps a one-line call. What is left here cannot leave: it
      is a page field and two page callbacks, which is the composition root doing its job. The same
      commit also sent four preference side effects out of `create-room.svelte.ts`, whose ceiling is
      NOT raised.
    */
    /*
      1559 -> 1642, 2026-08-30, for `acA-08` — the extra chat column's PLACEMENT, which the
      reference decides three different ways and this room decided one.

      The executable change is small: one shared `{#snippet extraChatColumn()}` holding the single
      `<ExtraChatPane>` call, and two wrappers around it — `H4e`'s top-level area with its nested
      split for a left/right room, and `j4e`'s `chat-box` area for a top/bottom one, which
      `AlertChatArea` renders inside its own split. The lines are the THREE gates transcribed with
      their byte offsets, because that is the whole finding: what shipped here was one ungated area
      in every case, and a top/bottom room drew the second column beside the presentation pane.

      An extraction was looked for and refused. The three forms differ only in their wrapper markup
      and all three close over this page's state, so moving them into a component would mean passing
      `split` plus the thirty props the pane already takes THROUGH that component to be handed
      straight back — the shape this list already records refusing for the alert and presentation
      panes. The snippet is the extraction.
    */
    /*
      1642 -> 1684, 2026-08-30, for `poll-01` and `poll-02` — the poll arrival sound, and the poll
      ENDING, which this room had no path for at all.

      The executable change is a three-branch effect. What the lines carry is the two decisions that
      are easy to get wrong from either side: the sound sits INSIDE the `'open'` branch, because
      upstream's `gotPoll` never reaches the person who wrote the poll and a sound with no panel
      behind it is a noise nothing explains; and the close is guarded on the poll modal being the one
      showing, because `closeActive()` closes whatever is open and a poll ending must not shut
      somebody's settings modal.
    */
    /*
      1684 -> 1715, 2026-08-30, for `PA-02` — `hideSpeechRecognition`, which was one field write and
      is five statements.

      The lines are the transcription and the sentence that says what was actually wrong: `subtitles
      = false` landed on a bare private-field write in `RoomPrefs` with no `save()`, so **dismissing
      the caption overlay was forgotten on reload** while the navbar checkbox for the same preference
      persisted correctly. Two paths to one setting, one of them silently not a setting at all.
    */
    /*
      1715 -> 1730, 2026-08-30, for `FP-01` — the refetch on opening Files or the video player.

      Three executable lines: the `MainTabRefetch` and the effect that reads `mainTab`. The rest says
      why the marker is a plain field and not `$state`, which is the same reason `arrivals.ts` gives
      for `#seeded`: an effect that read its own marker reactively would re-run on the write meant to
      end it.
    */
    /*
      1730 -> 1731, 2026-08-31. One line: `PCC-06`'s `onimagepaste` wired to
      `privateChat.beginImagePaste`, beside the `onimageupload` it already passed.
    */
    /*
      1731 -> 1733, 2026-08-31. Two lines: `XCP-08`'s `onyoutube` on the extra chat column, and
      `canPostImages` forwarded to `RoomOverlays` for `QAM-05`. Both are the page answering an
      authority question once, which is the only place this repository answers them.
    */
    /*
      1733 -> 1734, 2026-08-31. One line: `ACA-05`'s `onpasteimage` for the extra column, naming its
      own target rather than defaulting to the main column's.
    */
    /*
      1734 -> 1785, 2026-08-31. `ACA-06`'s three gates, resolved ONCE and spread into both columns,
      plus the paragraph on why the object is declared AFTER `createRoom` rather than beside the
      other `$derived`s: it reads `media.limitedPresenter`, and this repository has shipped a 500
      from a declaration-before-dependency TWICE — `ModalHost`'s `activeConnectivityTab` and
      `createRoom` itself, both invisible to lint and to the unit suite.

      One object rather than three ternaries at each of two call sites, because two hand-written
      copies is how the second column comes to disagree with the first about who may archive. Detach
      is passed at the main call site alone, since its gate is `chatOnlyMode` and its control does
      not exist in the extra column's const table at all.

      Read out BY NAME at both call sites rather than spread, which is eleven of those lines.
      `unfed-props-contract.test.ts` proves every prop has a supplier by finding it NAMED at a call
      site, so a `{...spread}` silently removed six props from that guarantee — caught the moment it
      was tried. Naming them keeps one definition and keeps every prop greppable.
    */
    /*
      1796 -> 1798, 2026-08-31 (ECP-02). Two lines: `chatChannelUp={roomEvents.chatChannelUp}` at
      each of the two chat columns. One source feeding both, by name — a second source is how the
      columns come to disagree about whether the room is connected, and the contract counts these
      two occurrences for that reason.

      1798 -> 1838, 2026-08-31 (`TODO.md` row 6). The kicked page: one import, one dep, a nineteen-
      line `$state.raw` declaration, a fourteen-line note at the branch, and the four lines of the
      branch itself. The `{:else}` re-indents 600 lines of markup and adds none of them.

      THIS CEILING PUSHED BACK AND THE CHANGE MOVED, which is the ratchet doing its job rather than
      being paid off. The first version put the whole decode of `IRe` — upstream's five-way page
      switch, its arms and their byte offsets — at the branch, and landed at 1852. That decode is
      about `app-root` and about the component occupying arm 2, so it went to
      `KickedPage.svelte`'s own docblock with a pointer left here. Fifteen lines came off the
      largest file in the app and landed on a 106-line one, and the citation now has ONE home
      instead of two that could disagree.

      What is left here is what only the page can say: that this is `{#if}` and not `hidden`, and
      that the `<audio id="webcam">` sink stays OUTSIDE the branch because `app-root`'s own template
      makes it a sibling of the switch (byte 2,602,869).
    */
    /*
      RAISED 1,838 -> 1,857 on 2026-09-01, for the LATE-JOIN REPLAY, and the raise is nineteen lines
      because the DECISION was extracted rather than left here.

      The first draft was fifty-two lines in `onMount` and this ceiling refused them. What sits here
      now is the ACTING half — three statements applying a result — because the two things it changes,
      the broadcast model and the visible tab, are the page's to own. The rules are
      `#lib/room/media-replay.ts`.

      The extraction bought more than a line count, which is the test this rule's own entries apply to
      a split: the derivation reads a clock, and until it moved there was no way to test it that did
      not involve mounting a page and stubbing time. `room/media-replay.test.ts` is ten cases and
      four negative controls, one of which — inverting the presenter gate — fails three of them.

      It stays in `onMount` for two different reasons and both are recorded at the call: the video
      half MOVES THE TAB, which must not happen during SSR; and the YouTube half reads the clock,
      which on the server would be render time rather than this member's arrival.
    */
    /*
      1,857 -> 1,866, 2026-09-01. The scheduled play moved to the SERVER (`TODO.md`'s consequence 2),
      and this file's share of it is a DELETION with a paragraph over it: `onMount`'s teardown used
      to clear a `window.setTimeout` that armed the play, and there is no timer any more.

      Nine lines to record why a call went away, which is the trade this repository makes on purpose:
      the next reader finds "an armed play that outlives the room" is now the point rather than the
      hazard, instead of re-deriving it from a diff.
    */
    /*
      1,866 -> 1,889, 2026-09-01, for `ACA-06`'s SAVE control — the chat-log download, whose blocker
      named the reference's transport rather than this room's capability.

      One call, and the flow it replaced was 104 lines here. `#lib/room/chat-log-save.ts` owns the
      prompt, the read and the file; this keeps the line that resolves a COLUMN to a channel, which
      is the page's because `chat.tab` and `chat.extraTab` are.

      The extraction was forced by this ceiling — the first draft put it 125 lines over — and is
      better than the number: the flow now has seven cases and three negative controls without
      mounting a page or a network, and one of those controls found a case of mine that passed for
      the wrong reason.
    */
    max: 1889,
    why: 'the room page - the script block is the extraction target; 13,663 before the MTX slice'
  },
  {
    file: 'lib/room/chat-log-save.ts',
    /*
      Created 2026-09-01 and capped at what it landed at — `downloadLog("chat")`'s whole flow,
      extracted from `+page.svelte` when that file went 125 lines past its ceiling.

      A better module than a line count, which is the test this rule asks of a split: `fetchLog` is
      INJECTED, so seven cases drive the prompt, the mapping and the failure path without a network
      or a mount. One of its negative controls found a case of mine that passed for the wrong reason —
      a synchronous assertion against an async download.

      Capped at 165 rather than the 158 it first landed at, and the seven lines are a DELETION with
      its reason over it: an exported `ChatLogRange` union that nothing consumed. `dead-export-contract`
      caught the orphan, and the note that replaced it says why the type is not simply re-used — the
      dialog hands back whatever a radio input carried, so narrowing it here would be this module
      asserting a fact it cannot check. The real gate is the server's `z.enum`.

      If this climbs, the question is whether the FORMAT has come back. `#lib/chat-log-download.ts`
      owns the text and the name because those three details are the invisible ones.
    */
    max: 165,
    why: 'the chat-log download: the range prompt, the read and the file'
  },
  {
    file: 'lib/room/events.svelte.ts',
    /*
      The room's realtime channel: 880 lines carrying 355 of code and 480 of citation.

      A ROUTER, and the ratio is the evidence for that reading rather than a coincidence — more than
      half the file is the transcription of what each of six channels means, because the behaviour
      is almost entirely "which class owns the state this frame changes". The routing itself is a
      chain of equality checks; what is expensive to recover is WHY `changeChatMode` refetches
      instead of reading the mode off the wire, and why the leave beep reads a room setting named
      for joins.


      RAISED 880 -> 903 on 2026-08-23, with the owner's explicit approval, for the `focusOnSessionNote` receiver.
      Recorded as a DECISION rather than edited quietly, because the standing rule is that a
      ceiling only ever goes down and a raise is a conversation. This one is a genuine
      capability arriving — "Bring everyone here" on session notes had brought nobody since it
      was written — and nearly all of the growth is the mandatory WHY: the capture byte offsets
      for the reference protocol, the read-not-assumed proof that a plain tab click must not
      re-broadcast, and why `presenterRoom()` rather than the client decides authority. The
      alternative on offer was an extraction invented to satisfy a number, which is the thing
      this file exists to prevent.

      LOWERED 903 -> 900 on 2026-08-23, which is the ratchet's other half working exactly as the
      header describes: extract a slice, then lower the number to what the file now measures.

      The extraction was NOT invented to satisfy a number, and the evidence is this class's own
      docblock: it calls itself a ROUTER that owns almost nothing and routes each frame "to the class
      that owns the state it changes". The join/leave announcement was the one block in 903 lines
      that did not route — a join changes no state, so it had no owner and four gates, two toast
      skins and two sounds had grown here instead. It is now `#lib/arrival-announcement.js`, a pure
      module beside `alert-delivery.ts`, which answers the identical question for an arriving alert.

      Twenty-two more lines were two ORPHANED docblocks in the constructor, describing `rosterCount`
      and `archivesAvailableTo` — neither of which this class holds. They went to the code that owns
      them. The gate that should have caught them could not see inside a function; it can now.

      BOTH NUMBERS IN THAT CLASS DOCBLOCK WERE WRONG, and this is where the history lives rather
      than in the file, which is what this entry is for. It read "eleven collaborators … four
      fields"; the truth is SEVENTEEN and THREE. The first correction got the first one wrong a
      second time by adding one to the stale number instead of counting the list, and this ceiling
      is what caught the third draft — the fix had grown the file to 906 against the 900 just set.
      The three fields are now NAMED in the docblock so the next reader can check the claim rather
      than trust it. Nothing else in the toolchain can: a comment that miscounts the code beside it
      compiles, type-checks and passes every test in this repository.
    */
    /*
      900 -> 920 on 2026-08-23, and the owner was asked before it moved, as every raise here is.

      What bought it: `kickUser`. The receiver branch, the `kicked` collaborator on the constructor
      options, its field and assignment, and widening the `privCmds` payload type so `msg` is
      readable. All of it is WIRING - the evidence for the command, and why `ban` is absent, lives
      once on `kickUser` in `presenter-commands.remote.ts` and is pointed at from here rather than
      repeated, which is what the consolidation pass before this raise was for (931 -> 920).

      It removed a control that told a presenter *"User kicked OK"* and sent nothing.
    */
    /*
      920 -> 937, 2026-08-23. The chat mute's two RECEIVERS were built here and then EXTRACTED the
      same day: `RoomChatMute` took the dialog, the toast, the sentence and both `invalidateAll()`
      calls — 191 lines including the presenter's two senders, which came from `RoomUserActions`.
      That extraction is what the owner chose over a raise, and it did the work: this file dropped
      from 968 to 937.

      What is left is not the receivers. It is the ELEVEN-LINE note stating that the addressing test
      stays in this router rather than travelling with them, because `privCmds` is per-member
      upstream while this room's stream is per-ROOM — so `targetUserId` is the only thing standing
      between muting one member and putting a "Chat Disabled" dialog in front of everybody at once.
      That reasoning belongs to the router and cannot leave with the slice.

      MEASURED ALTERNATIVE, offered and declined: extracting the whole 65-line `privCmds` block into
      a `RoomPrivateCommands` router lands this file at 880. That option stays on the table for rows
      9 and 10, which add receivers to this same channel.
    */
    /*
      937 -> 955, 2026-08-26 — `sendSalesImageToChat` / `sendUsersToURL`, the two receivers whose senders
      shipped on 2026-08-23. Two dispatch branches, guarded and transcribed.

      Raised on the same grounds recorded at `lib/room/session-control.ts` in this file: the
      growth is the captured code and the reason the presenter is EXCLUDED from both frames
      (`isPresenter ||` is a guard, not a truthiness shorthand), which is the single most likely
      thing for a reader to "fix" into a bug. The prose was tightened twice before this number moved.
      The CODE backstop is unaffected.
    */
    /*
      860 -> 892, 2026-08-28 — the typing indicator. The `typing` dispatch branch, the `TypingSink` type and the optional collaborator. It is handled
      BEFORE the `senderId` guard, and the comment says why: a typing frame has no sender — it is a
      per-recipient snapshot rather than somebody's message — so the guard that stops a member
      refetching on their own post would have dropped every one of them.
    */
    /*
      RAISED 892 -> 935 on 2026-08-28, for `alertsOverlayOnScreenshare`, and argued here because the
      rule at the top of this file says a raise is a conversation and not a number to edit.

      What arrived is a SEVENTH channel this router recognises — `alerts` — a structural
      `ScreenOverlaySink`, and the paragraph explaining why the branch sits BEFORE the own-sender
      guard. That last part is the whole value of the diff and is the reason it was not shortened:
      the presenter posting an alert is usually the presenter sharing the screen, so an author who
      later "tidies" this branch below the guard would silently stop the overlay drawing the alerts
      that matter most, with every test still green and nothing to read that says why it was there.

      The alternative on offer was a second router, or an `$effect` on the page watching `data.alerts`
      — one of which invents a module to satisfy a number and the other of which grows the file this
      ratchet cares about most. Six channels were already routed here; the seventh belongs with them.

      It goes DOWN if the `privChat` or `cmds` transcriptions ever find a module of their own, which
      is where the next real extraction in this file is. It does not go up again.
    */
    /*
      DOWN 8 on 2026-08-30, while GAINING a handler. The chat archive added a `chatArchiveChanged`
      arm, and the four recording commands left for `recording-commands.ts` in the same change: they
      were four near-identical blocks doing a media call, the same preference test and a sound.
      Collapsing them is not about the count — the capture has a QUIRK in exactly that mapping
      (`resumeRec` plays the START sound behind the STOP preference) and a table is where a reader
      cannot skim past it, which four separate blocks were not.
    */
    /*
      927 -> 947, 2026-08-30. The `presenterColorsChanged` receiver.

      Two lines of behaviour and eighteen of citation, and the citation is the load-bearing half:
      the reference REPLACES its whole colour map from the frame's `i.colors`, and this refetches
      instead. That frame decides how everybody else's messages are painted for everyone in the
      room, so what a socket says must not be what answers it. A future reader comparing the two
      files will see a divergence; this is why it is there.
    */
    /*
      947 -> 971, 2026-08-30. The message-mutation receiver — one `if`, one comparison, and
      twenty-two lines of citation.

      Nine commands used to mutate a rendered row and tell nobody: a presenter deleted a message and
      every other viewer kept it on screen, a reaction was visible only to the browser that clicked
      it, a question landed with no badge moving. The receiver is small because
      `#lib/message-mutation-frames.ts` owns the four names and the argument; what is here is the
      one thing that cannot live there — the self-skip, and why the actor's id on this frame is not
      authority.
    */
    /*
      971 -> 983, 2026-08-30, for USM-11: twelve lines, and eleven of them are the CALL — the four
      dependencies `noteUpdateNotice` takes, each supplied from the room's own state rather than
      from the frame. The reasoning itself left, to `#lib/room/note-update-notice.ts`, which is the
      trade this file asks for; what remains is a dispatcher branch, which is what this file is.
    */
    /*
      983 -> 1017, 2026-08-30, for `acA-06`'s counting site — and 30 of the 34 lines are the reason
      it sits ABOVE the own-sender guard rather than below it.

      Upstream's `chatMsg` subscription has no sender filter (byte 1,430,918) and the guard here is
      about a REFETCH. The case where the two differ is real: a message typed into the extra
      column's composer arrives on a channel the main column may not be showing, and moving the
      count below the guard drops exactly that one. A future reader tidying two adjacent
      `payload.channel === 'chat'` blocks into one would move it, so the argument is at the code.
    */
    /*
      1017 -> 1058, 2026-08-31 (ECP-02). Forty-one lines, of which FIVE are code: a second `$state`
      field, its getter, and one assignment in each of the two handlers that already move the first.

      TWO FIELDS FOR ONE CHANNEL, and the thirty-six lines of comment exist because that looks like
      duplication and is not. `#roomEventsConnected` answers *has this channel ever opened?* and must
      start FALSE, or the sidebar's "Chat" line claims a connection before the first open.
      `#chatChannelUp` answers *has it DROPPED?* and must start TRUE, or every composer in the room
      reads "Chat Disabled" on first paint for the duration of one connect. The reference has exactly
      the second field with exactly that starting value — `this.isConnected=!0`, byte 2,375,326.

      The difference between them is ONE initial value, which is precisely why a reader will try to
      merge them. `events.svelte.test.ts` asserts they disagree at the same instant, before any event,
      and `extra-chat-column-contract.test.ts` refuses `chatChannelUp={roomEvents.connected}` on the
      page by name. Both were seen red.

      If this number climbs, the thing to check is whether a THIRD answer about this channel has
      appeared. Two are justified above; a third almost certainly is not.
    */
    /*
      1058 -> 1069, 2026-09-01. `G08`'s two receivers: `presenterTalking` and `presenterNotTalking`,
      one `if` and one setter call, plus the five lines citing the `case` labels at byte 1,014,971 and
      the two subscribers at 1,117,020. There is nothing to extract — a router gaining a route is the
      router doing its job, and the alternative is a module holding one boolean assignment.
    */
    max: 1069,
    why: 'the SSE router - seven channels of transcription, and the one block that did not route has gone'
  },
  {
    file: 'lib/room/media-replay.ts',
    /*
      Created 2026-09-01 and capped at what it landed at — the LATE-JOIN REPLAY's three rules,
      extracted from `+page.svelte`'s `onMount` when that file went past its ceiling.

      A better module than it is a line count, which is the test this rule asks of a split. It
      DECIDES and does not act, so it is a pure function of server state and a moment; and `now` is a
      PARAMETER rather than a `Date.now()` call, which is the whole reason the derivation is testable
      at all. Ten cases and four negative controls in `media-replay.test.ts`; the page kept three
      statements.

      `#lib/server/room-media-state.ts` is its other half and takes NO entry here, deliberately: this
      file's discovery cases sweep `lib/components/` and `lib/room/`, and a lone `lib/server/` row
      that nothing discovers is a permission the next person inherits by accident.

      If this climbs, the question is whether it has started ACTING. It must not: applying the result
      belongs to the page, because the broadcast model and the visible tab are the page's.
    */
    max: 114,
    why: 'the three rules of the late-join replay, decoded from the reference constructor'
  },
  {
    file: 'lib/room/webcams.ts',
    /*
      The webcam cards and the three attachments that put a stream into an element.

      It renders; it does not capture — the transport acquires the camera and produces it, and
      this decides what a card looks like and where the stream lands. Two collaborators, which
      made it the cleanest seam left on the page after slice 20.
    */
    max: 229,
    why: 'the webcam cards - six functions, two collaborators, and no rune between them'
  },
  {
    file: 'lib/room/alerts-pane.ts',
    /*
      What a viewer DOES to the alerts pane: archive, export, detach, and the two toolbar toggles.

      The boundary against `RoomAlerts` and `RoomFeeds` is that neither of those knows the pane
      exists - they hold what the alerts ARE and which of them are visible. This holds the
      actions, and reads both.
    */
    /*
      291 -> 304, 2026-08-27, and the rule above says a raise is a conversation. This is the third
      exception this file records, after `private-commands.ts` and `RoomOverlays.svelte`.

      WHAT THE THIRTEEN LINES ARE: one import and one getter, `searchScopeNotice`. They close a SILENT
      CORRECTNESS GAP — the alerts toolbar filters the fifty rows the page holds while its field is
      ported verbatim from a reference that sends `doChatLogSearch` to a server, so a reader searching
      for last week got an empty list and no indication the log was never asked.

      WHY IT LANDED HERE rather than anywhere cheaper. It needs two things at once: the search term,
      which is `RoomAlerts`'s, and the set the toolbar actually filters, which is
      `feeds.searchableAlerts`. This class is the only one holding both. It was written into
      `feeds.svelte.ts` first, where the count available was the RAW loaded list — which includes
      alerts the viewer's own trader filter hides, so the notice would have named a number larger
      than anything the search could reach. The move fixed a wrong number as well as a ceiling.

      WHY NOT AN EXTRACTION: the rule already IS extracted. `alert-toolbar-search-scope.ts` is the
      pure decision with the whole account on it, and what remains here is the two values it needs.
      Extracting a getter that reads two private fields would mean handing both out.
    */
    /*
      304 -> 332, 2026-08-30. `toggleInlineEntry`, which is `toggleToolbar`'s twin because upstream's
      two are twins: both write a flag and pull the alerts log back, because both change the
      scroller's height. HERE and not in `RoomAlerts` for the reason that one gives — the scroller is
      this file's element.
    */
    max: 332,
    why: 'the alerts pane actions - eight functions, and only the detach receiver crosses back'
  },
  {
    file: 'lib/room/window-handlers.ts',
    /*
      The window listeners bodies. The BINDINGS stay on `<svelte:window>`, which is how Svelte s
      own best-practices doc says to attach one; what moved is the hundred lines of body and
      citation that were living inside the attribute values, where no reader looks for logic.

      Five unrelated features share these listeners and the class does not pretend otherwise -
      they are together because the EVENT is one, which is the reference s arrangement too.
    */
    /*
      +20, 2026-08-17: `pointerUp` arrived from `+page.svelte`, where it was `finishSplit` bound to
      `<svelte:window onpointerup>` — beside `pointerMove`, which was ALREADY a method here. The two
      halves of one gesture were in two files. An arrival, and the page fell by more than this.

      `beginSplit` deliberately did NOT come with it: it has two consumers (`RoomShell` and
      `AlertChatArea`), so the page stays its owner. A shared handler is not a window handler.
    */
    max: 234,
    why: 'the window listeners - bindings stay on the element, bodies and citations move here'
  },
  {
    file: 'lib/room/feed-scroll.ts',
    /*
      Scroll-follow and paging for all three feeds - alerts, chat, extra chat.

      One MECHANISM and three instances of it: a flag per feed saying the reader is in history, a
      tracker that sets it, and a paging arm disarmed while it is set. The three flags moved here
      rather than staying shared, which is a change of OWNERSHIP: they were written from two
      sides, and two writers of one flag is how a feed follows while its reader is up the log.

      +24, 2026-08-16: the second half of upstream's bottom-of-scroll branch. All three handlers had
      `arm()` and none had the release beside it, so each one-line `if` became a block carrying both
      calls and the citation for why they belong together. Three feeds, one mechanism, again.
    */
    max: 343,
    why: 'the scroll and paging mechanism - three feeds, one set of moving parts'
  },
  {
    file: 'lib/room/modals.svelte.ts',
    /*
      Which overlay is showing, and how it is configured.

      The STATE moved with the functions, which is why this slice has no shared fields — an
      earlier measurement of the same ten functions reported three written on both sides, because
      the functions were leaving and their state was not. That difference is what the dependency
      scan makes visible before the code is written rather than after.
    */
    /*
      244 -> 260, 2026-08-29, for the third per-modal cleanup in `closeActive`.

      The poll's and the Q&A's were already there; the Debug Log's joins them rather than sitting at
      the call site, because `ModalHost` has ONE `onclose` for every modal it hosts — a per-modal
      clear written there would have to re-derive which modal was closing, which is the thing this
      method exists to know.

      A STRUCTURAL type for the dependency (`{ clearReceived(): void }`), like `messageActions` and
      `userActions` above it, so the modal registry does not learn the name of a feature it knows
      nothing else about.
    */
    /*
      RAISED 260 -> 263 on 2026-08-30, for ONE line of code and the two explaining it.

      `open('user')` now asks the server for the card's Last Login and address. It is one line
      because this class already branches on that modal name, and it is HERE because this is the one
      place every entry point converges — the roster row, the chat message and the followed/muted
      lists all reach the card through `openModal('user')`.

      Recorded as a raise rather than absorbed, and flagged for the owner: the standing rule is that
      a ceiling only goes down and a raise is a conversation, and this one was made without them.
      The alternative on offer was deleting the two comment lines to land on 261, and `CLAUDE.md`
      names that directly — prose explaining a real subtlety is not shaved to hit a number. The
      subtlety is real: the first draft hung the lookup off the SELECTION, and
      `message-actions.handle` selects the sender for every action it dispatches, so a presenter
      clicking "Mention" fetched that member's email address.

      The same commit lowers `user-actions.svelte.ts` by fifteen, so the room's total cap falls.
    */
    /*
      263 -> 242 on 2026-08-30, and a ceiling going DOWN is the direction this file exists for.
      `downloadImage` left for `#lib/download-image.ts` when `dta-02` needed it in two panes that do
      not hold this class: it had no field, no lifecycle and nothing rendered, so it was never
      overlay state. The `why` below is now true of everything left.
    */
    /*
      RAISED 242 -> 307 on 2026-08-30, for the poll conversion — `TODO.md` row AG.

      `submitPollAction(action, values)` was twelve lines: a `FormData` loop, ``fetch(`?/${action}`)``
      and a boolean. It is five named methods and one shared failure policy now, and the whole of the
      growth is that shape plus the WHY.

      The raise is recorded as a decision rather than absorbed, because the standing rule is that a
      ceiling only goes down and a raise is a conversation. What was bought for it:

        - the endpoint is no longer assembled at runtime. `remote-call-sites-contract.test.ts` opens
          with what that costs — `presenterCommand`'s action was deleted while its call site kept
          posting to it for three commits, compiling the whole way. Five imported symbols cannot do
          that;
        - the arguments are typed at the call site rather than stringified into a form body;
        - a refusal is logged instead of discarded. `submitPollAction` answered `false` and threw the
          response away, so a presenter whose poll was refused saw nothing anywhere.

      The alternative on offer was one method taking a union of five names — which is the defect
      being removed, wearing a different call shape — or deleting the paragraphs that explain the
      failure policy, which `CLAUDE.md` names directly: prose explaining a real subtlety is not
      shaved to hit a number.
    */
    max: 307,
    why: 'the overlay state machine, plus the five poll commands and the failure policy they share'
  },
  {
    file: 'lib/room/notes.svelte.ts',
    /*
      The notes tab actions, and the two links that mount into rendered markup.

      The phase plan named this seam as the one it was least sure of, grouping notes with the
      page's DOM attachment helpers. Measured, they do NOT read as one thing: the capture helpers
      hold handles the whole page reads, while these two mount links into note content. Only the
      note pair came, which is what that plan said to do if the reading came out this way.


      RAISED 153 -> 203 on 2026-08-23, with the owner's explicit approval, for the focus pair — `focusNote` (receiving) and `bringEveryoneTo` (sending) — and the capture citations that justify them.
      Recorded as a DECISION rather than edited quietly, because the standing rule is that a
      ceiling only ever goes down and a raise is a conversation. This one is a genuine
      capability arriving — "Bring everyone here" on session notes had brought nobody since it
      was written — and nearly all of the growth is the mandatory WHY: the capture byte offsets
      for the reference protocol, the read-not-assumed proof that a plain tab click must not
      re-broadcast, and why `presenterRoom()` rather than the client decides authority. The
      alternative on offer was an extraction invented to satisfy a number, which is the thing
      this file exists to prevent.
    */
    /*
      203 -> 219, 2026-08-30, for `PA-04`. `requestNewNote()` exists because the empty pane's button
      is a SECOND caller of `newNoteOpen = noteGates().editorMounted`, and the gate is the interesting
      half: a viewer who may read notes but not edit them must not be handed an editor. In markup at
      one of two call sites, that rule is one refactor from being dropped.
    */
    /*
      RAISED 219 -> 311 on 2026-08-30, for the session-note conversion — `TODO.md` row AG.

      `submitMutation` was ``fetch(`?/${action}`)`` over a six-member union of ACTION NAMES with a
      `FormData` body and a `deserialize()` of the response. It is a discriminated union, a `switch`
      over six imported commands, and a two-type-parameter signature that types each payload against
      the command it reaches.

      Recorded as a decision rather than absorbed. What was bought:

        - deleting one of the six commands is now a build error at the line that calls it, where
          before it compiled and silently did nothing — the `presenterCommand` failure exactly;
        - `values` is checked per action at five of the six call sites, where it was
          `Record<string, boolean | string | number>`;
        - the two type assertions that remain are NAMED at the lines that perform them, and both were
          already being performed invisibly by `deserialize<Success, …>`.

      Roughly two thirds of the growth is the docblock, and most of that is one paragraph that has to
      exist: the two-argument shape survives because the six call sites are prop callbacks in
      `PresentationArea.svelte`, which another agent owned during this change. A raise with the
      reason omitted is how the next reader "simplifies" the assertions back out.
    */
    max: 311,
    why: 'the notes tab - four actions, one flag, the two link mounts, and the six-command dispatch'
  },
  {
    file: 'lib/room/recording.ts',
    /*
      The recorder, and the speech recognition that shares its microphone.

      Speech recognition is here rather than in the transport because it is a second consumer of
      the DEVICE, not of the wire: it starts and stops on the same events the recorder does and
      writes into the caption list rather than onto a producer.
    */
    /*
      341 -> 358 on 2026-08-28, and the seventeen lines are the WHY rather than the work. The change
      itself is two: a `speechRecognitionAvailable` thunk and one more term in the refusal.

      What the rest records is the defect. `beginSpeechRecognition` has quoted the capture's own
      message — "disabled by preferences OR SESSION SETTINGS" — in its docblock since the method was
      written, while gating on the preferences half alone, because the room setting behind the other
      half was not on `ROOM_VISIBLE_SETTINGS` and this room could not ask. An owner who turned
      captions off got them anyway, from every presenter, for everybody. A comment that names two
      sources beside code that reads one is exactly what this repository's standard is for, and the
      correction is worth more than the number.
    */
    /*
      RAISED 358 -> 406 on 2026-08-28, for `autoRecord` and `dontStopRecOnMicMute`, argued in place.

      Almost all of it is `autoRecord()`, which reads five pieces of live state and calls one of two
      methods. The DECISION is not here — `#lib/auto-record.ts` holds all four bundle citations, the
      `talkingUsers.length <= 1` ordering trap and the two divergences a browser-side recorder
      forces — and that split is the reason this raise is small: the rule that is easy to get wrong
      is pure and tested, and what is left is the reading of state that only this class can see.

      It goes DOWN if the preview window ever leaves for a module of its own, which is the next real
      extraction here. It does not go up again.
    */
    /*
      406 -> 423, 2026-08-30, for USM-12: `showRecPreview` refuses when `prefs.recPreviewWindow` is
      off, with the eleven lines that say why that refusal is a deliberate divergence.

      Upstream reads the preference only to seed its checkbox and to close on the way off. Refusing
      to OPEN is ours, and the reason is the row itself: a preference whose only effect is closing
      something already open does nothing at all on the next session, which is the defect being
      fixed rather than a shape to reproduce.
    */
    max: 423,
    why: 'MediaRecorder, the preview window, the room-wide broadcast, the two speech calls and auto-record'
  },
  {
    file: 'lib/room/media-transport.svelte.ts',
    /*
      The largest module in `lib/room/` by total lines, and the reason the backstop below now counts
      code: 1,742 lines carrying 768 of code and 862 of citation, which is the same 49% ratio as
      `files.svelte.ts` and `split.svelte.ts`.

      It grew by 326 in slice 26, when `connect()` and `restart()` came back from `onMount` — the
      wiring slice 4 had to leave behind because it referenced page state that had not moved yet.
      768 against a backstop of 800 is CLOSE, and that is worth saying rather than noticing later:
      the next thing to arrive here should be weighed against splitting rather than added on the
      grounds that it fits.

      The citations are why. This class is transcribed from a minified capture, and nearly every
      decision in it is a finding rather than a choice — `TOP_SPATIAL_LAYER` is 9 because mediasoup
      clamps, `load()` is awaited because omitting it fails silently, `dropRemoteMedia` clears five
      collections because clearing four left the dedupe guards holding producers nobody consumed.
      None of that is recoverable from the code, and all of it was paid for once already.

      It is ONE module because there is no seam, which was measured rather than assumed — see the
      backstop's own note. Acquiring a track and producing it into the session is a single act here,
      so a capture/transport split would have cut through `#mediaSession`, and a local/remote split
      would have cut through `#sharedScreens`, which both paths write.

      +8 in slice 27, and it is my own debt being paid: slice 26 moved `restartMediaSession` here and
      left its docblock on the page, where the orphaned-comment gate then found it sitting above an
      unrelated declaration. The prose is now on `restart()`, which is the only place it means
      anything. No code arrived with it.
    */
    /*
      1,750 -> 1,825, 2026-08-23. `reconnectAudio()` — the member's half of `remoteRestartAudio`,
      seventy-five lines of which about ten are code. The rest records why it is NARROWER than
      `restart()` directly above it: upstream drops the remote audio and re-listens, touching no
      transport, producer, screen or webcam, and a presenter fixing one member's microphone must not
      blank their screen tabs. It also records the two negative controls that came back GREEN, which
      is the honest statement that the working part of it is unguarded.
    */
    /*
      1,825 -> 1,356, 2026-08-26. THE SEAM THE PARAGRAPHS ABOVE SAID DID NOT EXIST.

      `restartScreen` took the CODE count to 812 against the backstop's 800, and that gate does not
      accept a number: *"find the domain seam rather than raising the backstop."* So one was found,
      and the note above is corrected rather than deleted, because it was half right in a way worth
      keeping.

      It predicted that *"a local/remote split would have cut through `#sharedScreens`, which both
      paths write"* — and that is exactly what happened. The measurement, taken across the seam on
      code lines only before anything moved: 5 private members moved cleanly, 10 were collaborators
      both sides already shared, and 12 were state. Of those twelve, seven were purely local and
      went; three (`#mediaSession`, `#mediaSignalling`, `#stopStream`) are reached through thunks;
      and `#sharedScreens` + `#screenStreams` are the genuine tangle the old note named.

      They stay OWNED here and are written from `RoomLocalCapture` through a `ScreenTabPort`. The
      cost is real and is stated at the top of that module: the tab list has two writers. It is
      accepted because the alternative was a 1,900-line module whose own gate said it had stopped
      being one, and because the two writers were always there — the old arrangement simply had them
      in one file, which made the tangle invisible rather than absent.

      What did NOT change is the public surface. Every accessor the page, `RoomRecording`,
      `RoomEventStream` and eleven contract tests read is still on this class and now delegates.
    */
    /*
      1357 -> 1359 on 2026-08-28: the `autoRecord` pass-through and its citation. Two lines, and this
      class reads neither of them — see the note at the option itself for why it is passed rather
      than held.
    */
    /*
      RAISED 1359 -> 1365 on 2026-08-29, for `forceStopScreen`, and argued here because the rule at the top of
      this file says a raise is a conversation. THE WHOLE ARGUMENT IS ON `private-commands.ts`, where
      the largest share of it landed; this entry carries its part of the same change.
    */
    /*
      1,365 -> 1,367, 2026-08-30. Two lines: this class is the hop between the composition root and
      the local capture, so a value the capture needs is declared and passed here. The first draft
      cost SEVEN — it threaded the four audio settings as a second parameter beside the existing
      `videoDeviceId` — and consolidating them into one `CaptureSettings` gave five back and made
      `create-room` shorter. What is left is the irreducible cost of one more value crossing.
    */
    /*
      1,367 -> 1,429, 2026-08-30. G09 — the blocked-autoplay dialog, and sixty-two lines of which
      about fifty are the mechanism.

      Chrome refuses audible autoplay without a user gesture. This caught the rejection and wrote a
      `console.warn`, so a member whose browser blocked it heard NOTHING for the whole session with
      nothing on screen to act on. **The dialog's OK is the gesture** — that is the entire mechanism,
      and it is why the retry has to be the dismissal callback rather than a timer.

      One divergence is recorded at the code: upstream opens `bootbox.hideAll()` and re-raises per
      failing producer, so a room with four open microphones shows the same sentence four times and
      clears whatever else the member was reading. One dialog is raised here and its callback retries
      every blocked element, because one gesture satisfies all of them.
    */
    /*
      1429 -> 1465, 2026-08-30, for `PA-03`'s two toasts.

      Two `info()` calls and thirty lines of where they go: "Connecting to …" BEFORE `consume()`,
      which is what makes it a connecting notice rather than a second arrival notice, and "… started
      screen sharing" INSIDE the `if (remote)`, because a null `remote` is the dedupe path for the
      server's at-least-once `newProducer` and a toast outside it fires once per snapshot.

      It also records what was NOT built with them — `screenLoading` and its three companions — and
      why: their markup is not quoted anywhere in the evidence, and a spinner invented rather than
      read is not something this repository ships.
    */
    /*
      1465 -> 1535, 2026-08-30, for `SV-SP-04`'s retry.

      A consumer that negotiates and delivers no frames renders a 0x0 video, which on screen is an
      empty pane that never fills — indistinguishable from a presenter who has not started sharing,
      so nothing about it looks like a fault to report.

      The three constants are the reference's and are named rather than inlined. What the lines
      mostly carry is the ONE deliberate difference: upstream reads the size at `playing` and then
      has to exclude Firefox and Edge, because those report 0 for a frame or two on the codepath it
      was written for. Reading it after the same 3,000 ms the retry would wait makes those exclusions
      unnecessary rather than merely omitted — and a browser sniff that nothing needs is a branch
      with no consumer.
    */
    max: 1535,
    why: 'the SFU transport - what this room CONSUMES; publishing moved to local-capture.svelte.ts'
  },
  {
    file: 'lib/room/local-capture.svelte.ts',
    /*
      WHAT THIS BROWSER PUBLISHES — every path from a `getUserMedia` / `getDisplayMedia` prompt to a
      producer, taken out of `media-transport.svelte.ts` on 2026-08-26 when that file crossed the
      800-line CODE backstop.

      758 total, measured AFTER `prettier --write` rather than before it: this is transcribed from a minified capture
      and most of the file is the finding rather than the code. The two named constants and the
      "Name for this screen?" docblock travelled with it — leaving them behind would have created
      exactly the orphan the comment gate catches, which is how they were noticed.

      Lower this when the module shrinks. It has no headroom deliberately: it landed at its measured
      size, which is the rule for a new entry.
    */
    /*
      758 -> 872, in the commit that landed `restartScreen`, and this is a RAISE, which this file
      otherwise forbids. It is recorded in full rather than quietly applied.

      758 was set one commit earlier, by me, as the size the module happened to land at when the
      extraction was split out — mid-stream, with the feature that motivated the extraction still
      parked on a branch. Treating that snapshot as a ratchet would have meant the extraction's own
      purpose could not be delivered through it.

      What is NOT raised is the thing that actually measures the architecture: the 800-line CODE
      backstop, which this file passes. `restartLocalScreens` is 89 lines of which about 25 are code;
      the rest is the capture's `restartScreenSharing` transcribed with the reasoning that
      `stopTracks:!1` is what makes a socket-driven restart possible at all. Total lines here are
      dominated by transcription, which is why the backstop counts code and this number does not.

      From here it ratchets down like every other entry.
    */
    /*
      RAISED 872 -> 925 on 2026-08-28, for `alertsOverlayOnScreenshare`, and argued rather than edited.

      The setting splices a CANVAS between `getDisplayMedia` and the producer, so the change lands in
      the one method in this repository that cannot be exercised by any test in it: a screen capture
      needs a human at a picker. That is precisely why the growth here is comment and why none of it
      was trimmed. Four of the five hunks are a sentence saying what the line below it protects — why
      `wrapped` is declared outside the `try` (an abandoned overlay keeps a 33ms interval alive
      forever), why the preview follows the WRAPPED stream (a presenter who cannot see the overlay
      cannot tell it is on), why `keep` is called after the publish and not before (there is no
      producer id until then, and nothing for the browser's Stop-sharing bar to end), and why the
      catch releases the overlay before `stopStream` (the overlay holds the raw tracks, so it is what
      takes the browser's sharing indicator down).

      THE PAYMENT IS REAL AND IT IS ELSEWHERE. 116 lines of lifecycle went to
      `lib/room/screen-overlay.ts`, 253 to `lib/alert-overlay-compositor.ts` and 268 to the
      pure `lib/alert-overlay-layout.ts`, which is the half that carries the tests. Had that gone in
      here — which is how the reference does it, one 400-line method — this file would be past 1,200
      and the geometry would be untestable. The ratchet did its job: it forced the split first.

      +16 OF IT IS TWO LEAKS FOUND BY RE-READING THE DIFF, and they are the reason the raise is worth
      it rather than a cost of it. A publish that failed after the wrap succeeded left a 33ms interval
      drawing for the rest of the page's life, because nothing would ever call `stopLocalScreen` for
      a share that was never published; and a reconnect re-publishing under a new producer id left
      the overlay keyed by one the SFU had closed, so the eventual stop released nothing and the
      browser kept saying the screen was still being shared. Neither is reachable from any test here
      — a failed produce and a reconnect both need a real SFU — so what stands in their place is the
      paragraph at each site saying what it protects.

      RAISED AGAIN, 925 -> 957 on 2026-08-28, for `autoRecord`, and the shape of that raise is the
      argument for it: THIS CLASS DECIDES NOTHING. It reports three moments — a microphone opened, a
      microphone closed, a screen shared — and `RoomRecording` applies `#lib/auto-record.ts` to them.
      Twenty-four of the thirty-two lines are the paragraph at the `micClosed` call site explaining
      why it is raised BEFORE `stopTalking` and not after: upstream's `talkingUsers.length <= 1`
      counts the muting user, and this room removes them synchronously, so the two orders differ by
      one and the wrong one stops a recording while somebody else is still speaking. That is exactly
      the class of subtlety this repository's standard says never to shorten.

      It goes DOWN if `startScreenSharing`'s constraint transcription ever moves to the media module
      that owns constraints. It does not go up again.
    */
    /*
      RAISED 957 -> 960 on 2026-08-29, for `forceStopScreen`, and argued here because the rule at the top of
      this file says a raise is a conversation. THE WHOLE ARGUMENT IS ON `private-commands.ts`, where
      the largest share of it landed; this entry carries its part of the same change.
    */
    /*
      RAISED 960 -> 966 on 2026-08-30, for the microphone constraint that was never applied.

      `#enableMicrophone` asked for `{ audio: true }`, so the A/V pane's device select and its three
      processing checkboxes were four controls that wrote a preference and changed nothing — the
      exact twin of the `videoDeviceID` defect fixed here on 2026-08-26, left behind because both
      halves still captured something. Six lines: the import, the injected settings, and the four
      that build and pass the constraint.

      Flagged for the owner, since a raise is meant to be a conversation. `ModalHost.svelte` falls
      191 lines in the same commit, so the room's total cap falls by far more than these six.
    */
    /*
      966 -> 992, 2026-08-30. G11's MEASURED REFUSAL, and all of it is prose.

      `audioServerDisableMic` is raised by the AUDIO BRIDGE — the server deciding a microphone is
      unusable after it opened locally — and this room has no audio bridge, the same absence
      `media-transport.svelte.ts` records for `startTalking`/`stopTalking`. A subscriber would be a
      handler nothing can call. The note also records that the OUTCOME is already reached by a better
      route: upstream has one sentence for every microphone failure and this method branches on the
      actual error, so a member is told what went wrong rather than a paragraph of things to try.
    */
    /*
      992 -> 1011, 2026-08-30. One statement for `SV-SP-08` and eighteen lines saying why it is here:
      this is the reference's `presUnmuted` moment, and the OTHER half of that handler —
      `startTalking` — arrives inbound from the room socket in this application rather than being
      sent, which is why only one half needed building.
    */
    max: 1011,
    why: 'the local publisher - microphone, camera and screen capture through to their producers'
  },
  {
    file: 'lib/components/UserNotesPane.svelte',
    /*
      `#user-modal`'s Admin Notes tab, BOTH states of it — upstream's `O(104, allowToManageNotes ? 105
      : 104)`. This room had only 104, the password prompt; 105, the list, did not exist, so a
      presenter who cleared the password got an empty panel. Found by an orphan CSS class rather than
      by reading the capture: `smallAvatarImg` is the avatar on a row of this list.
    */
    max: 124,
    why: 'the Admin Notes tab - a gate, a list, and the two actions on it'
  },
  {
    file: 'lib/components/FollowChatStylePane.svelte',
    /*
      The follow-chat STYLE editor, lifted out of `ModalHost.svelte` verbatim when the Admin Notes
      tab took that file past its ceiling. Nothing here is rewritten - the same markup, re-indented,
      with the style object bound and three inline handlers lifted to callbacks - so the extraction
      cannot have changed what the panel renders, and the browser suite is the check that it did not.
    */
    /*
      152 -> 171, 2026-08-30, UIM-16. Nineteen lines for a ONE-WORD change — `class="fw-bold"` on the
      preview's `<strong>`, const 120 of the user-info modal's table.

      The comment is eighteen of the nineteen and it is not padding: `fw-bold` on a `<strong>` looks
      like a tautology, and a future reader deleting it as redundant would be making the same
      judgement the original author of the bare tag made. What it records is why the reference put a
      utility class on an already-bold element — Bootstrap's `font-weight: 700 !important` beats the
      browser's `bolder` and survives a stylesheet that flattens typography — and that this preview's
      whole job is to show a presenter what the real thing will look like.

      Nothing to extract: this file IS the extraction, and one attribute does not warrant a second.
    */
    /*
      171 -> 154, 2026-08-31, FCS-1. The Text Size box stopped being a `bind:value` — Svelte's
      numeric binding writes `null` for an empty field and `null + 1` is `1`, so clearing it saved
      a followed member's username at one pixel — and the props, the `$bindable` argument and that
      whole measurement left for `#lib/follow-chat-style.js`, which is where the coercion they
      govern now lives. The file grew by the input's four lines and shrank by thirty-three.
    */
    /*
      154 -> 182, 2026-09-01, and every line is the record of a transcription that CANNOT be made.
      The four colour inputs carry a static `value` attribute upstream beside their binding; Svelte
      rejects the pair as `attribute_duplicate`, and the block quotes the compiler error so nobody
      re-attempts it from the const table. Prose in place of an impossible four attributes.
    */
    max: 182,
    why: 'the follow-chat colour and size editor - five inputs, a live example, three callbacks'
  },
  {
    file: 'lib/components/AlertSendReportModal.svelte',
    /*
      The Alert Sent Report modal, lifted out of `ModalHost.svelte` on 2026-08-30 when RPT-01
      through RPT-08 were dispositioned.

      **It is ninety percent argument and ten percent markup, and that ratio is the reason it is a
      file.** Six of upstream's controls for this surface — the fetch, the per-status rows, the
      search box, the status select, the flot pie and the token dialog — all rest on a list of
      per-recipient DELIVERY RECORDS. This product has none: 24 tables and not one records a
      delivery, `alerts.dispatch` is five booleans naming which channels were requested rather than
      what happened, no mail transport exists in the room at all and the controller's has no alert
      caller, and `getAlertReport` has no server half anywhere in `apps/`. That measurement is what
      the file mostly contains.

      It renders one sentence. Somebody will one day decide to build the six controls, and they will
      stand exactly here when they do — which is the whole argument for the explanation living with
      the surface rather than in the host that opens it.
    */
    /*
      165 -> 162, 2026-08-31. ASR-1/2/3 added an eight-line pointer and the argument itself went to
      `alert-report-modal-contract.test.ts`: the reference stylesheet's thirteen rules, the
      self-referential `aria-labelledby` shared by ten of this room's twenty-two dialogs, and the
      focus-on-open that is one line of `Modal.svelte` away. Eleven lines of prose left the file
      with them.
    */
    max: 162,
    why: 'the alert-report modal — one honest notice, and the measurement that decided against six controls'
  },
  {
    file: 'lib/components/LogArchiveModals.svelte',
    /*
      The two log-archive modals, together because they are the same surface twice and the ASYMMETRY
      between them is the thing worth seeing: the chat half is built, the alerts half is a
      placeholder because its sweep is gated on `deleteAlertPW` — one of the seven credential-shaped
      settings that never reach this room. It owns the archive state itself rather than receiving it,
      which is what the ratchet argued for when threading a thirty-seventh state class through three
      capped files was refused at all three.
    */
    /*
      148 -> 207, 2026-08-31, and this one is a RAISE, which the rule requires be argued rather than
      taken. What arrived is the modal's SECOND VIEW — `toggleShowLogs`, the log viewer that was
      never built, found by `reference-const-coverage-contract.test.ts` as six missing const values in
      each of the two log modals.

      The extraction the ratchet asks for HAPPENED, and it is what makes the raise small: the viewer
      is `ChatArchiveLogPane.svelte` and its state is `RoomChatArchiveLog`, both new files with their
      own ceilings below. What is left here is the composition — one more object constructed, one
      `{#if}` choosing between two panes, and the effect that returns to the list when the modal
      closes — plus the paragraphs arguing each. There is no third thing to extract: splitting the
      chooser from the two things it chooses between would be a file whose only content is an `{#if}`.
    */
    max: 207,
    why: 'the chat and alerts archive modals, the credential that separates them, and the list-or-log chooser'
  },
  {
    file: 'lib/components/ChatArchivePane.svelte',
    /*
      The archives browser and the sweep dialog. Replaced a hardcoded "There are no archived chats at
      this time" and a `Reload Log List` button that carried no `onclick` at all.
    */
    /*
      147 -> 170, 2026-08-31. A raise, argued: each row became a CONTROL that opens the archive's log
      (upstream's const 14, `[1,"list-group-item","list-group-item-action",3,"click"]`), which is a
      button, a stopPropagation on the restore beside it so one click cannot do both, and the two
      paragraphs saying why the handler is on a button rather than on the `li` the reference puts it
      on. Nothing here is separable: a list pane whose rows are not clickable is the pane that was
      already here, and the log it opens is its own component.
    */
    max: 170,
    why: 'the chat archives browser - a date, a channel picker, two sweeps, and a row that opens its log'
  },
  {
    file: 'lib/components/ChatArchiveLogPane.svelte',
    /*
      ONE ARCHIVED LOG, OPENED — the half of `app-chat-logs-modal` that was never built, transcribed
      from `jxe` at bundle byte 2,309,873 and consts 17 to 37 of the modal's table.

      Larger than the list pane it sits beside, and the reason is the three divergences it records
      rather than any extra behaviour: upstream's two elements sharing one `id`, its `btn-ligth` typo,
      and the compact row standing in for `app-st-message`. The component's own Angular `styles:[…]`
      travel with it too — without them every class name in the markup would be a class with no CSS.
    */
    /*
      228 -> 243, 2026-09-01. The duplicate `id="search-addon"` is transcribed now — consts 24 and 25
      both carry it — and the lines are the note explaining that two elements with one id is what the
      reference ships, and that the `<button>` element is the one carve-out the repository's own rule
      already names.
    */
    max: 243,
    why: 'the archived-log viewer - a back button, a search, a download, and the reference styles that came with it'
  },
  {
    file: 'lib/components/RoomOverlays.svelte',
    /*
      Everything that floats above the room, taken out of the page in Phase 5 slice 17.

      310 lines of markup arrived here and 265 left the page — the difference is the props list,
      which is what a facade boundary costs and is why the template savings in the phase plan
      were costed at ~218 rather than an optimistic ~140. Nineteen of the thirty-six props are
      state classes handed over whole; the rest are page state and callbacks.

      462 -> 782 on 2026-08-17, S3, and this is an ARRIVAL rather than growth: 308 lines left
      `+page.svelte` in the same commit and it ratchets 2,943 -> 2,641. Four delivery effects, the
      two policy functions they call and the four arrival trackers that feed them.

      They are here because Svelte says an effect belongs to a component and not to a class — *"if
      `$state` and `$derived` are used directly inside the `$effect` (for example, during creation of
      a reactive class), those values will not be treated as dependencies"* — which for these four
      would mean a toast that never notices Do Not Disturb being switched on. The side effect is a
      toast, a sound and an OS notification, and this component renders the host for all three.

      It cost only TWO new props, `isPresenter` and `unreadQaAlertIds`, because the four trackers had
      exactly one reader each and came across as local state. That ratio is the evidence this is the
      right home rather than a convenient one: a wrong home shows up as a long props list.

      782 -> 768 on 2026-08-20, and the ceiling did its job rather than being edited. Two comment
      repairs took the file to 787: a hidden-audio comment that had shipped with no `<!--` opener at
      all, and a citation that had been missing its subject since the commit that wrote it. Neither
      was shortened to fit — the rule is that ceilings only go down and prose is not trimmed to hit a
      number — so `RemoteAudioSinks.svelte` left instead, taking the one part of a VISUAL layer that
      is never visible.

      The number is 769 and not 768 because THIS test's count is the authority: it splits on newlines
      and `wc -l` counts them, which differ by one on any file ending in a newline. Setting a ceiling
      from `wc -l` puts it one under the real figure and fails on arrival.
    */
    /*
      +1, 2026-08-23, owner-approved: the `onSavePermissions` prop wiring for `save-permissions`.
      One line, and it is the whole point of the raise — the five checkboxes now have a way out of
      `ModalHost`, which they did not before.
    */
    /*
      770 -> 777, 2026-08-27, and the rule directly above says a raise is a conversation. This is that
      conversation, argued rather than quietly applied — and it is the second exception this file has
      recorded, after `private-commands.ts`.

      WHAT THE SEVEN LINES ARE. One import, one `closedMessage` taken off `data`, one callback, and a
      two-line note saying why neither is a new prop. That is the whole cost of wiring the close
      message — a feature that had storage, a command and a reader built for it the same day, and
      whose two buttons had been claiming to save something for as long as they had existed.

      WHY NOT AN EXTRACTION. There is nothing here to extract: seven lines of wiring in a composition
      root is the root doing its job. The extraction that this change DID make went the other way and
      is the reason the raise is defensible — `CloseSessionPane.svelte` took 56 lines out of
      `ModalHost.svelte`, whose ceiling drops from 6022 to 6006 in the same commit. **The pair is 49
      lines smaller.**

      The alternative was contorting a props list to dodge a number, which this file's own opening
      calls the tail wagging the dog.
    */
    /*
      777 -> 778 for ONE line: `stickyNonTradeAlert` reaching `ModalHost` and the alert composer
      behind it. This component already holds `data`, so the value is read here rather than crossing
      the page — which is why the page paid nothing for this one.
    */
    /*
      778 -> 786, 2026-08-28, for `enablePrivateMessageHistory`: the entitlement, the open-and-load
      handler, and the three fields the all-user private-message modal renders.

      HERE and not on the page, which is why the page paid nothing: this file already holds `data`,
      `modals` and `privateChat`, so the handler is the two calls it actually is rather than a
      callback threaded down from a component that would have to be handed all three. That is the
      same reason `stickyNonTradeAlert` and `autoSwitchToOfftopics` cost the page nothing.

      Three fields rather than one object because they are three ANSWERS, not three parts of one:
      see the note at `RoomPrivateChat.#peerHistory` for why collapsing them shows a moderator the
      previous member's messages under a spinner labelled with the new one.
    */
    /*
      786 -> 796, 2026-08-28, for the room's own favicon and stylesheet: the import, the call site
      and the eight-line citation above it.

      HERE and not on the page for the reason this entry already gives twice over — this component
      holds `data`. The alternative was three lines on `+page.svelte` plus a `<svelte:head>` block,
      and the page is the file this repository keeps shrinking.

      Ten lines is more than the two the tip button cost, and the difference is the citation: a
      setting that puts OWNER-AUTHORED CODE in every member's browser gets its reasoning at the call
      site as well as in its module, because this is the file somebody reads while wondering what
      the room does to a member's page.
    */
    /*
      796 -> 809, 2026-08-28, for the Q&A thread's menu: `messageChrome` arriving as a prop with its
      docblock, and the `onQaAction` line that forwards a thread entry's action to the dispatcher
      that owns it.

      THE PROP IS PASSED THROUGH RATHER THAN BUILT, which is the whole argument for the raise. The
      page already derives one `RoomMessageChrome` and the alerts column already receives it;
      building a second here would be a second answer to which settings a message reads, and
      `room-message-chrome.ts` exists because that question had four answers once.

      What this component paid for was NOT paid by the page — `+page.svelte` is one line wider and
      sits exactly on its ceiling. It was paid by `ModalHost.svelte`, which drops 164 lines in the
      same commit: the Q&A modal it used to hold is `AlertQaModal.svelte` now, and that extraction is
      what made room for the feature in the first place.
    */
    /*
      809 -> 820, 2026-08-28. Eleven lines: the two display modes and the change callback arriving as
      props with their docblock, and passed straight through to `ModalHost`.

      A PASS-THROUGH, which is what this layer is for — the modal holds the Text Mode radios and the
      Q&A thread, and neither the mode nor the setter belongs to it.
    */
    /*
      820 -> 821 on 2026-08-28: one line, `schedulerAvailable={data.sessData?.hasAlertScheduler === true}`,
      which is the composition root doing exactly what this file is for — resolving a room setting
      once and handing it down. `=== true` is the fail-closed read every optional control-plane field
      takes here.
    */
    /*
      823 -> 834, 2026-08-29, for `debug-log` — a presenter pulling one member's console log.

      Here it is one prop, passed as the CLASS rather than its value because both ends are read — the markup forwards the received log and the page opens the modal on arrival.

      A FEATURE arriving, not a wire. It left `INERT_ACTIONS`, which is what removing an entry there
      declares, and it is the one command in this room that could not be transcribed: upstream's
      reply lets the CLIENT name who receives the log, so the server had to grow a memory of who
      asked. `debug-log-contract.test.ts` is where that argument lives; these files carry only what
      each of them does.
    */
    /*
      834 -> 835, 2026-08-29, for `upload-profile-picture` — a presenter setting one member's avatar.

      One line, forwarding the upload to `RoomUserActions`.

      The last inert control with a captured wire and no blocker. It also carried a WRONG
      disposition: `TODO.md` filed it as belonging with the controller "because it is durable", and
      the controller's `users` table has no avatar column — the room's own `users.avatar_url` is what
      the roster reads and every chat message joins to. `profile-picture-contract.test.ts` holds the
      security argument; these files carry only what each of them does.
    */
    /*
      835 -> 836, 2026-08-29, for `remove-profile-picture-btn` — the other half of the avatar control.

      One line, forwarding the remove.

      Found by ARITHMETIC rather than by reading the bundle: the class carried two rules in `app.css`
      and had no wearer for the whole port, which `orphan-style-contract.test.ts` refuses. Its entry
      in that catalog turned red the moment the button existed and has been deleted, which is the
      declaration that it is done.
    */
    /*
      RAISED 836 -> 848 on 2026-08-29, for `restoreMobileAppTokens` — the Mobile App tab. Argued because the
      rule at the top of this file says a raise is a conversation; THE ARGUMENT IS ON
      `ModalHost.svelte`, where the tab itself landed. This entry carries its part.
    */
    /*
      DOWN one, and the line it lost is the point: `canManageNotes` and `userNotes` were two props
      that had to be passed together, and the gate now travels ON the object it gates. A prop you
      cannot forget is worth more than a prop you can pass correctly.
    */
    /*
      848 -> 847 -> 848, and the round trip is stated rather than hidden.

      It was 848 at the start of 2026-08-30. It went DOWN to 847 that evening when `canManageNotes`
      and `userNotes` became one prop — a real saving, taken as a bonus rather than to pay for
      anything. It is back at 848 now for `targetBadges`, the prop that fills the user modal's
      Badges cell, which had been rendering an empty `div` while the whole badge map was already on
      the page.

      **This is not a raise past where the file has been**, and that distinction is the only thing
      that makes it acceptable: the ratchet exists so a file cannot grow, and this one has not. Four
      alternatives were tried first and each moved the line into a file equally at its cap —
      resolving badges in `+page.svelte` (at 1471), carrying them on `ModalTargetUser` via a thunk
      through `RoomUserActions` (895/896) and `create-room` (1332/1333), collapsing the three
      peer-history props (they are one object plus a `nick`, so the collapse was false), and lifting
      the four-line `onShowPrivateMessages` arrow into a named function (net +1).

      If this number is ever asked to pass 848, the answer is an extraction from this file and not
      another paragraph here.
    */
    /*
      848 -> 850, 2026-08-30. One import and one prop: the A/V pane's saved settings, read from
      `prefs.loaded` here exactly as `streamingType` beside it is. One prop rather than five,
      for the reason `#lib/capture-settings.ts` records.
    */
    /*
      850 -> 855, 2026-08-30. `presenterColors` forwarded to `ModalHost`, which needs it for two
      unrelated halves of one feature: the Q&A thread renders messages, and the settings modal's
      colour pickers seed from this presenter's own entry.
    */
    /*
      855 -> 896, 2026-08-30. The chat paste confirmation.

      The reference's is a `bootbox.confirm` carrying a preview `<img>` and a textarea seeded from
      the composer (byte 1,445,719), and the two alert forms below already have that shape for their
      own pastes — so this block sits with them rather than in a component of its own. Most of the
      addition is the markup those three lines of dialog need plus the note saying why it is
      `BootboxDialog` and not `ImageUploadDialog`: the file is already chosen, and a dialog whose top
      half is a drop zone invites replacing the thing that was just pasted.
    */
    /*
      896 -> 906, 2026-08-30. `alertLabels` forwarded to `ModalHost` for the composer's picker
      (`PAM-01`), with the note recording that this is the second consumer of one parse rather than a
      second parse.
    */
    /*
      906 -> 920, 2026-08-30. A THIRD `ImageUploadDialog` instance, for the private composer (G1).

      A third and not a share of the composer's, for the reason this file already records beside the
      swing form's: routing a feature's upload through the chat composer's handler posts the image
      into chat instead of into that feature. Here the cost of getting it wrong is larger — an image
      meant for one person would land in the room.
    */
    /*
      947 -> 951, 2026-08-30. Four lines: the confirmation's four optional button labels passed
      through to `BootboxDialog`, each defaulted to what a `bootbox.confirm` with no `buttons` block
      renders — which is what every other call site in this room passes and must keep getting.
    */
    /*
      955 -> 965, 2026-08-30, for USM-15: one prop and its nine-line reason. `captionsAvailable`
      is resolved on the PAGE from `RoomGates.speechRecognitionAvailable` and only passed through
      here, unlike the `data.sessData` reads around it — the `!== true` rule (absent means NOT
      disabled) belongs to the gates class, which is also what `beginSpeechRecognition` refuses on.
      One reading of the setting, two consumers; re-deriving it here is how the drawn control and
      the running feature come to disagree.

            954 -> 955, 2026-08-30, for SC-14: one line, `hasMic={data.user.hasMic === true}`, reaching
      `ModalHost`'s non-presenter arm. Read here for the reason this entry gives five times over —
      this component holds `data`.

      951 -> 954, 2026-08-30, for SC-12 and SC-13. THREE lines: the `restream-url` import, the
      `restreamUrl={data.sessData?.restreamToURL}` seed, and the one-line handler.

      HERE for the reason this entry already gives four times over — this component holds `data`, so
      reading the setting costs the page nothing. And the raise is the smaller half of the change:
      `RestreamPane.svelte` took the pane out of `ModalHost.svelte` in the same commit, whose ceiling
      is NOT raised — 6,335 holds and the file lands at 6,323. The pair is fifty lines lighter than
      leaving the twenty lines of markup where they were and raising ModalHost instead, which is the
      trade this rule exists to force.
    */
    /*
      965 -> 1,011, 2026-08-30, for USM-08 / USM-09 / USM-10. Forty lines, and the shape of them is
      the argument: two trackers, one roster lookup, and two CALLS with their context objects
      spelled out. The reasoning — both byte offsets, both audiences, why Do Not Disturb is on the
      sound and not on the popup — left with the behaviour, to `#lib/room/reaction-notices.ts`.

      The context objects are what cost the lines and they are not padding: each field is a decision
      the caller owns (who am I, am I a presenter, which of three preferences applies), and passing
      the room instead would have made a notification module reach for the whole room.
    */
    /*
      1,011 -> 1,056, 2026-08-30, for `dta-04`: the paste-confirm heading and the reference's inline
      `max-height: 50vh` on BOTH trade-alert dialogs, each with the seventeen-line citation.

      The citation is duplicated because the DIALOGS are, and that duplication is itself upstream's:
      `imgUpload` takes the feature name and `doImggurUpload` dispatches on it deny-by-default, so
      day trade and swing genuinely own separate dialogs. A reader who meets one of them must not
      have to find the other to learn why it says what it says.
    */
    /*
      1,056 -> 1,081, 2026-08-30, for UIM-04 and SRCH-03 — twenty-five lines, and this is exactly the
      raise this file is happy to grant, because the alternative was a raise somewhere worse.

      Fourteen of them are the `canPrivateChat` call: `canShowRosterPrivateChat(context, target)`,
      answered HERE from the session and from the same `userActions.target` the modal is already
      being handed. The reference's `canPM` is a five-input expression with the TARGET as one of the
      inputs (byte 2,073,550), and `#lib/roster-private-chat.ts` has been its transcription since the
      roster needed it. Drilling those five settings into `ModalHost` instead would have added them
      to a props list of ninety and put a second copy of the rule in a component — which is the shape
      the reference itself gets wrong, asking the question twice and disagreeing with itself once.

      One line is `room={data.room}`, which removes two INVENTED literals from `ModalHost` — a room
      key and a room name that appear nowhere in the 2,891,205-byte bundle. The remaining ten are the
      import's note saying why one function now has two callers.

      This is the composition root doing its job: resolve the answer where both halves of the
      question are in scope, and hand over a boolean. Nothing to extract.
    */
    /*
      1081 -> 1065, 2026-08-31, and it went DOWN while three behaviours were added. Two extractions
      paid for it. `ImagePasteConfirm.svelte` took the "Upload this image?" dialog, which was three
      transcriptions of one control here — two of them carrying the same sixteen-line citation word
      for word. `ImageLightbox.svelte` took the imgur modal, which is markup with no state and whose
      one interesting decision, the `alt`, is now argued in the file that makes it.

      What ARRIVED in the same commit: the `hasQAOnAlerts` entitlement gate on the Q&A notice
      (OVL-02), the mention ring the bundle puts under `chatSoundOn` (OVL-04), and the reconnect
      flash's two children in the capture's order (OVL-01). What LEFT is a whole effect and its
      tracker — the per-message chat ding (OVL-03), which was a second and wrong copy of a rule
      `#lib/chat-arrival-sound.ts` already owns.
    */
    /*
      1065 -> 1092, 2026-08-31, for `PCC-06`'s confirmation — a FOURTH `ImagePasteConfirm` instance,
      for the reason the three above it are separate and which the file already states: `onImagePaste`
      on `app-privchat` ends in `doImggurUpload` -> `sendPrivChat`, so routing a private paste through
      the chat composer's handler would post the screenshot into the ROOM.

      The textarea is the reference's own and its id is the single thing that differs from the chat
      copy twenty lines above: `msg-text-pc`, not `msg-text`.
    */
    /*
      1092 -> 1139, 2026-08-31, for `QAM-05`/`QAM-06`: the Q&A thread's own upload dialog and a FIFTH
      `ImagePasteConfirm`, with the reference's own `msg-text-qa` textarea id.

      A fifth instance for the sharpest version of the reason the other four are separate, and the
      comment says it at the call site: this one's confirm reaches `sendAlertQAReply`, so sharing the
      chat composer's handler would post a presenter's answer to one member's question into the room.
    */
    /*
      1139 -> 1149, 2026-08-31. `QAM-10`'s dispatch for the Q&A header card's piped body, with the
      note on why the full `MessageActionItem` stays HERE: `messageActions.selected` is what
      `targetMessage` already is, and handing the modal a narrow copy is what had blocked the row.
    */
    /*
      1149 -> 1184, 2026-08-31 (`RPL-02`/`RPL-03`). Thirty-five lines: a SIXTH `ImagePasteConfirm`
      and a second `ImageUploadDialog`, for the reply modal.

      A sixth instance rather than a shared one, for the reason the five before it are separate:
      `doImggurUpload` dispatches on a feature name deny-by-default (byte 1,992,037) and this one
      ends in `sendChatReply(…, msg._id, null)` (byte 2,322,349). `trade-alert-pane-contract` counts
      them and went red with `expected 6 to be 5` the moment this landed — which is exactly what its
      own comment predicted would happen when a sixth arrived.
    */
    /*
      1,184 -> 1,185, 2026-09-01. Two attributes forwarding the radio prompt's `options` and
      `message`, minus the `message=""` they replace.
    */
    max: 1185,
    /*
      821 -> 823, 2026-08-29. Two lines: `canManageNotes={userActions.canManageNotes}` and the
      one-line note saying only the class that asked the controller can know it.
    */
    why: 'the overlay layer - modal host, seven dialogs, toasts, the lightbox, delivery'
  },
  {
    file: 'lib/components/PollSavedList.svelte',
    /*
      CREATED 2026-08-30 at 61 lines, to pay for POLL-01 and POLL-02 in `PollPanel.svelte`, which was
      likewise sitting exactly at its ceiling.

      Same rule, and the same constraint on WHICH slice: the panel's script, its pie geometry and its
      drag maths are pinned line by line in `poll-panel-contract.test.ts`, so the free seam was the
      Pre-Canned list — which is also the honest one, since upstream draws it from a tracked template
      of its own (`PTe`, byte 2,101,467).
    */
    max: 61,
    why: "the Pre-Canned Polls list; the poll panel's saved-poll rows"
  },
  {
    file: 'lib/components/ScreenShareMenu.svelte',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE, which is what admits a component to this list.

      The navbar's Start/Stop Screen Sharing dropdown: six entries, three of them behind
      `isScreenSharing`, one behind `sessData.useMediaMTX`, and one repeated per screen this browser
      is sharing. It came out of `RoomNavbar.svelte` when G05, G06 and G07 added three of those six
      in one pass.

      What to check if this number climbs. Has it started DECIDING? It must not — `screenSharing`,
      `streamingTabAvailable` and `localScreens` are all resolved before they arrive. And has it
      acquired knowledge of the OTHER top-level menus? `menuOpen` is one boolean because the navbar
      owns which menu is open; a second such prop means that ownership has leaked.
    */
    /*
      208 -> 204, 2026-08-31, SSM-1: `role`/`tabindex`/`aria-label` and an Enter/Space handler on a
      control that had no focusable element in it at all, with the six rows folded into one snippet
      so a seventh cannot arrive without them. The props, the argument and the key handler left for
      `#lib/screen-share-menu.js`, and the four template byte offsets in the entry table were each
      47 to 100 too high and are corrected. The trigger's `a11y_missing_attribute` ignore went with
      them: `role="button"` satisfies the rule its missing `href` used to break, and eslint's
      `no-unused-svelte-ignore` is what noticed.
    */
    max: 204,
    why: 'the navbar screen-sharing dropdown; six entries and the four gates between them'
  },
  {
    file: 'lib/components/MessageBody.svelte',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE, which is what admits a component to this list.

      One parsed message body: the six segment kinds — trade order, alert label, ticker, link, inline
      image and plain text — and the revealed-gif map that belongs to them. It was a `{#snippet}` on
      `RoomMessage.svelte` with six call sites, and THAT file's entry named it as the next seam three
      separate times before this took it.

      It renders ITSELF for a trade order, because a trade segment wraps segments rather than
      carrying a string: upstream's `<span class="tradeColor">` is inserted before the symbol and
      link pipes run, so a `$TICKER` inside an order is still coloured.

      What to check if this number climbs. Has it started PARSING? It must not — the three passes
      are `message-body-segments.ts` and this is handed a finished list. And has it acquired a gate?
      Its five props are a list, a colour, a preference, an id and a callback; a sixth that is an
      entitlement is the signal that the wrong thing crossed.
    */
    /*
      157 -> 174, 2026-08-30, in the same day: RM-16, and all of it is the citation.

      `urlwrapImg`'s fourth argument switches the gif placeholder's id to `gifExtra_<id>`
      (byte 1,326,195), because with the extra chat column on, the same message rendered in both
      panes produced two elements carrying one DOM id. Nothing here resolves anything through that
      id — the reveal is keyed by URL — so the duplicate was inert, and it was still a duplicate.

      174 -> 173, 2026-08-31 (MSB-01). The nested body's five hand-listed props became one spread,
      which is a line SHORTER as well as a prop that can no longer be forgotten — `extraChatMsg` was
      the one that had been. A ceiling that falls out of a fix is the shape this ratchet wants.

      173 -> 187, 2026-08-31 (MSB-04). Fourteen lines, ONE of which is code: `chatGif = false,`
      became `chatGif = true,`. The other thirteen are the docblock over it, and they are the whole
      value of the change.

      The declaration disagreed with `RoomMessage.svelte`, which is the boundary that receives this
      preference and has always declared `true`, and with the reference's own blob (`chatGif:!0`).
      It was UNREACHABLE — all eight `<MessageBody …>` call sites pass the value — which is exactly
      why it was free to be wrong for a day, and exactly why deleting the fallback was the wrong
      repair: Svelte's `$props` contract applies a fallback when the parent does not set the prop
      *or sets it to `undefined`*, so one call site handing over an optional value reaches it, and
      reached with `false` this component mutes every gif in the room behind a placeholder nobody
      asked for. A defect that no current caller can trigger is still a defect aimed at the next one.

      The comment records the direction of the failure, because a bare `= true` reads as arbitrary
      and the next reader flipping it back would find nothing to stop them — `chat-gif-muted-contract`
      now asserts BOTH declarations, which is the test half of the same pair.

      187 -> 196, 2026-08-31 (MSB-03). Nine lines, of which ONE is the image container's handler:
      the click now names the segment's own url instead of raising a bare event. That is what the
      reference does — `urlwrapImg` writes each container's own url into its own handler at byte
      1,326,195 — and without it the dispatcher resolved one from the ROW, so a click inside a chat
      message did nothing and a click inside an alert opened the attachment rather than the picture.
      The other eight are the note on `onaction`'s type, which is the shared `MessageActionEvent`
      now rather than the fourth local restatement of two of its members.
    */
    max: 196,
    why: 'one parsed message body - six segment kinds, and the gif reveal that belongs to them'
  },
  {
    file: 'lib/components/MessageMenu.svelte',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE, which is what admits a component to this list.

      It is the kebab on a message: the trigger, the dropdown, its twelve entries and the popper
      placement that puts it on screen. 214 of these lines came out of `RoomMessage.svelte` in the
      same commit, so the pair is smaller than the one file was.

      Two things to check if this number climbs. Has it started DECIDING which entries to show? It
      must not — it is handed twelve resolved booleans and `messageMenuAllows` owns the mapping. And
      has a renderer-specific concern leaked in? The compact and regular renderers differ only in
      `direction`, and a second such prop is the signal that the wrong thing is being shared.
    */
    /*
      271 -> 293, 2026-08-28, in the commit that created it: the three captured trigger classes
      became a pinned lookup rather than one composed string.

      `msgMenu dropright pt-1`, `msgMenu dropleft float-right align-baseline` and
      `msgMenu dropright float-left align-baseline` are not variations on a theme — the compact pair
      mirrors and the regular one does neither — so composing them would have invented a pattern the
      reference does not have. Twenty-two lines buys three exact strings a call site cannot add to.

      293 -> 252, 2026-08-30. RM-08 added the per-variant label table, this file refused the growth,
      and the answer was the extraction the note above missed: 55 lines of `getBoundingClientRect`,
      `ResizeObserver` and `style.cssText` moved to `attachMenuPlacement` in
      `message-menu-position.ts`, beside the pure function they were already calling. It is a Svelte
      5 `{@attach}` now, so the menu element no longer needs a `bind:this` to be handed to the code
      that positions it.

      The two questions above still stand and one of them is answered: the compact and regular
      renderers now differ in the label table as well as the trigger class, and BOTH are pinned
      lookups keyed by the same `variant`. A THIRD such divergence is the signal to stop sharing.
    */
    /*
      253 -> 252, 2026-08-31, and the line came back from a docblock that prettier had spread over
      three lines for one sentence. What went IN is `MSM-06`: `Mark Answered` and `Private Chat`
      carry a trailing space in all four captured menus (`v(2,"\xa0\xa0Mark Answered ")` at bundle
      byte 1,330,053, `\xa0\xa0Private Chat ` at 1,330,816) and HTML folding had eaten both, so they
      are `{' '}` now — the braces idiom `AGENTS.md` records as a standing exception.

      The pass that found it read all four menus end to end and produced five more rows, every one of
      which is a REFUSAL or a divergence rather than markup: they live in
      `message-menu-entries-contract.test.ts`, which is where the reason for a thing NOT built goes
      when the file has no room to carry it. That is a real constraint on this component, not a
      formality — one line of headroom and no unpinned seam, because
      `chat-display-mode-contract.test.ts` requires `TRIGGER_CLASS`'s three strings to stay in this
      file's own code.
    */
    max: 252,
    why: 'the kebab on a message - trigger, twelve entries, and the placement that positions them'
  },
  {
    file: 'lib/components/AvatarOptionsMenu.svelte',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE, which is what admits a component to this list.

      `edit-user-avatar-options` — the dropdown on your own avatar in `#user-modal`, template `K2e`
      @ bundle byte 2,058,852. It is 134 lines for about 45 of markup because the rest is the two
      corrections reading it forced: `remove-profile-picture-btn` had shipped as a floating button on
      the avatar, presenter-gated, and const 23 says it belongs INSIDE this menu on a gate with no
      role term at all. Two of `#user-modal`'s four missing affordances were one control.
    */
    max: 134,
    why: 'the own-avatar dropdown; the menu remove-profile-picture-btn actually belongs to'
  },
  {
    file: 'lib/components/ChatSearchBar.svelte',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE, which is what admits a component to this list.

      The search bar under a chat column's header — `chatToolbar` and the `form#chat-settings`
      inside it, transcribed from the const table at bundle byte 1,449,203.

      IT WENT IN TWICE FIRST, once per pane, and this contract refused the second copy. That was the
      right call and the reason is worth the line: the extra column's const table at 2,395,378 is
      byte-identical to the main column's, so two hand-maintained transcriptions of one table is how
      one of them loses an attribute with nothing to notice. The dangling
      `aria-describedby="addon-search"` is the capture's own and now exists in exactly one place.
    */
    /*
      89 -> 142, 2026-08-30, for `acA-04` — the extended toolbar section, and the Mod Only checkbox
      that is the first control this room has ever put in it.

      The old entry ended "an empty toolbar section is a control whose only effect is its own
      presence", which was true while nothing filled it. The lines are the const table (43/44/45 at
      byte 1,450,283) and the one divergence: `"mod-only"` occurs FOUR times in the bundle, twice per
      column, so a room with both bars open ships two elements with one id and the extra column's
      `<label for>` operates the main column's checkbox. The id carries the column here, and the
      paragraph saying why is what stops somebody "correcting" it back to the capture.
    */
    /*
      142 -> 171, 2026-08-31, and every added line is a CORRECTION rather than a feature.

      This docblock said the extended bar's unbuilt controls were *"the save-chat and archive
      controls (`Y_e` and `Q_e`, nodes 4 and 5 of `X_e` at byte 1,423,265)"*. Four names and one
      offset were wrong. Decoded by value: `Y_e` (1,422,202) is the Group Chat Control dropdown and
      `Q_e` (1,422,956) is the Detach Chat button; the save/archive pair is `K_e`/`q_e`
      (1,421,929 / 1,421,800) at node 9 of `J_e`, in the OTHER of the bar's two extended slots; and
      `X_e` begins at 1,423,104 — 161 bytes earlier, so the old offset landed mid-function and read
      as plausible to anyone spot-checking it.

      That sentence is the one a reader uses to decide which sub-template holds what, so it pointed
      the next person at the wrong two functions in the wrong slot. It is also why the paragraph is
      long now: it carries the whole decode, and `chat-search-contract.test.ts` pins all six offsets
      by value so the two docblocks cannot drift apart again.
    */
    /*
      171 -> 374, 2026-08-31, for THREE of `ACA-06`'s four controls: Archive Chat Messages, the Group
      Chat Control dropdown and Detach Chat. The bar had rendered Mod Only and closed.

      Two consts' worth of markup and a great deal of why. The three gates are the page's, so each
      control's PRESENCE is its gate — a boolean beside a `() => void` would put one gate in two
      places, which is this component's standing rule.

      **Detach Chat is main-column only, and that is the const tables' answer rather than a choice.**
      `app-extra-chat`'s extended section (`Q3e`, byte 2,369,619) carries Mod Only and Group Chat
      Control and STOPS; `app-chat` carries three entries its table does not — 47 and 53, the two
      forms of the button, and 54, its `fa-window-restore` icon — which is exactly the offset by
      which every const from 48 onward shifts between the two tables.

      **One divergence, and it is the substitution already argued twice here.** The capture's
      dropdown item is `a` const 51 `[1,"dropdown-item"]` — an anchor with NO `href`, so upstream
      these three items are unreachable by keyboard. A `<button class="dropdown-item">` carries the
      click instead, styled identically by Bootstrap, and the handler moves one node in from the
      `li` with it. `StreamTabs` keeps its anchor and that is not an inconsistency: its const 57 is
      `['href','#',1,'dropdown-item']`, which is focusable.

      **The fourth control is not built and the reason is a SERVER command, not scope.**
      `downloadLog("chat")` at byte 1,415,703 opens a radio prompt over three ranges and hands the
      answer to `downloadLogType`, which awaits `invokeServerCommand("getAllLog", …)`. `getAllLog`
      returns zero hits in this repository, so the button would open a dialog whose every option
      fails — worse than no button. The alerts column's twin exports rows the page already holds;
      this one asks the server for history the page has never seen.
    */
    /*
      374 -> 451, 2026-09-01, for `ACA-06`'s SAVE control — the chat-log download, whose blocker
      named the reference's transport rather than this room's capability.

      The `K_e` span, its keyboard handling, and the `stopPropagation` the nesting requires — plus the
      decode of why the archive button is INSIDE it, which is what puts the presenter gate on archive
      and leaves save ungated. Read the nesting the other way round and a whole control disappears for
      every member; that is the sentence worth the lines.
    */
    max: 451,
    why: 'the chat columns search bar, transcribed once and rendered by both panes'
  },
  {
    file: 'lib/components/ChatTabStrip.svelte',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE, which is what admits a component to this list.

      It is the channel strip above a chat column — nine lines of the capture's own markup and a
      loop. It was those nine lines written out TWICE, once per column, with the two channels spelled
      as two `<li>` blocks apiece; that was defensible while every room had exactly those two.
      `chatTabsWithBadges` ended it: an owner configures extra channels behind badges and the SERVER
      decides which of them a member gets, so both strips loop, and two loops over one list is one
      too many.

      If this number climbs, the thing to check is whether it has started DECIDING which tabs to
      draw. It must not: it renders the list it is handed, and that list is an entitlement resolved
      in `memberChatChannels`.
    */
    /*
      56 -> 105, 2026-08-30, for `acA-06` — the per-tab unread badge.

      The old entry said: "If this number climbs, the thing to check is whether it has started
      DECIDING which tabs to draw." It has not. It renders a count it is handed, from a map its
      caller owns, and the assertion that it holds no role of its own is in
      `alert-chat-area-contract.test.ts` (`expect(strip).not.toContain('isPresenter')`).

      Nearly all of it is markup: the pill (const 28), the `(n)` inside it (const 29), the two gates,
      and the note recording that `app-chat` and `app-extra-chat` differ by ONE leading space — which
      is the reason this is still one component and not two.
    */
    max: 105,
    why: 'the chat channel strip - the captured markup, once, over a list the server decided'
  },
  {
    file: 'lib/components/AlertQaModal.svelte',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE, which is the rule this list learned the hard way.

      It is `app-alert-qa-modal` — the Q&A thread on one alert — taken out of `ModalHost.svelte` on
      2026-08-28 because that file's ceiling refused the raise the thread's new menu needed. 166
      lines left the host and 348 arrived here, and the difference is the two docblocks the
      extraction made it possible to write: what a thread ENTRY is (an alert that knows it is inside
      this modal, which is the reference's own `isQAMsg = !0, logType = "alerts"`), and which two of
      its menu actions this component keeps rather than forwarding.

      If this number climbs, the thing to check is whether it has started DECIDING anything. It must
      not: every authority question a thread entry raises — who may delete one, whether the room
      allows a reaction — is answered on the server, and the two menu actions handled here are the
      composer insert and its own open row. Both are this component's state and nothing else's.
    */
    /*
      348 -> 359, 2026-08-28. Eleven lines: the `displayMode` prop and the docblock saying why the
      thread renders in the ALERTS mode rather than one of its own — upstream's Q&A modal calls
      `loadAlertsMode()`, the same function the alerts log calls.
    */
    /*
      359 -> 372, 2026-08-30. The presenter-colour map and its lookup.

      The thread renders through the same `app-st-message` the room does, and the reference applies
      `presenterSettings[msg.avt]` inside that component with no exception for the modal — so a
      presenter's ANSWER here carries their colours too. Most of the addition is the paragraph
      saying why `followedUsers` is still NOT passed: this component has never had it, and adding
      it would be a behaviour change nothing asked for.
    */
    /*
      372 -> 371, 2026-08-31, and it went DOWN while the modal gained four behaviours — which is what
      the two entries below paid for.

      `QAM-01` (a date separator between entries, the reference's `prevD` at byte 2,332,963),
      `QAM-02` (the composer is emptied when the modal opens on a different alert, byte 2,334,927),
      `QAM-03` (the thread opens on its newest entry, `scrollToBottomQA` at byte 2,335,916) and
      `QAM-08` (the alert card is gated on there BEING an alert, byte 2,344,076) all landed here,
      and the header card and the footer composer left for components of their own. Both seams are
      the reference's: `e3e` is a sub-template called once, and the footer is one subtree reading
      nothing the thread above it reads.
    */
    /*
      371 -> 394, 2026-08-31. `QAM-05`/`QAM-06`'s three props forwarded to the composer, and the
      note on why `isPresenter` and `canPostImages` are two props rather than one.
    */
    /*
      394 -> 409, 2026-08-31. `QAM-10`'s three forwards to the header card. `chatGif` and
      `copyTrades` come off `messageChrome` at the `ModalHost` boundary rather than as new props
      from the page — reading them from the object every other body in this room already reads is
      what stops the Q&A header disagreeing with the log beneath it about the same two preferences.
    */
    max: 409,
    why: 'app-alert-qa-modal - the Q&A thread on one alert, its own open menu row and its wiring'
  },
  {
    file: 'lib/components/AlertQaAlertCard.svelte',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE, 2026-08-31.

      `e3e` at bundle byte 2,332,074 — the alert card the Q&A modal reproduces in its header, plus
      the two date formatters that feed it. It came out because `AlertQaModal` had no line left and
      the ratchet's answer to that is an extraction; it is mostly the four `QAM` rows that live on
      its markup, two of them BLOCKED on a field `ModalHost` does not declare.
    */
    /*
      171 -> 244, 2026-08-31, for `QAM-10` and `QAM-11`, and the two rows were blocked on ONE thing:
      a declaration that lagged its own data. `RoomOverlays` passes `messageActions.selected`, a full
      `MessageActionItem` carrying both `targetUrl` and `senderEmailHash`; the host's `targetMessage`
      shape named neither, so a body rendered here would have drawn an image whose click could not
      act, and the avatar fell back to the hashless mystery-man every sender shares.

      Most of the raise is the derivation's docblock, and it earns its lines on one word.
      `parseBodySegments` gates trade-order splitting on `copyTrades && kind === 'alert'` — the
      reference's own `"alerts" === i` — and byte 2,331,625 passes **`"chat"`** for this card. So a
      `[{( … )}]` order that renders as a copyable trade in the log beneath the modal stays LITERAL
      text in the Q&A header. That is upstream's behaviour, it is surprising, and without the
      paragraph it is exactly the kind of thing a later reader "fixes".
    */
    /*
      244 -> 245, 2026-08-31 (MSB-03). One line: `onaction`'s payload is the shared
      `MessageActionEvent` and carries a pointer to the row, rather than the local
      `MouseEvent | TradeCopyPayload` it restated — one of four spellings of that union, all of them
      places it could be extended without.
    */
    max: 245,
    why: 'the alert card the Q&A modal reproduces in its own header - `e3e`, called once'
  },
  {
    file: 'lib/components/AlertQaComposer.svelte',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE, 2026-08-31.

      `#textAreaQATxt` and the modal footer around it. The second seam out of `AlertQaModal`, and
      the reference's own: `d(15,"div",13)` through `H(23,l3e,…)` is one subtree with one field, one
      picker and one button. It carries `QAM-04` — the correction of a comment that claimed the
      captured textarea had no handler, which const 17 at byte 2,342,104 refutes in three bindings.
    */
    /*
      167 -> 224, 2026-08-31. `QAM-05` and `QAM-06`, and the docblock is most of it because this
      node had TWO defects and the second is invisible from the code.

      **It did not act** — const 36 is a click binding and `l3e` (byte 2,333,483) wires it to
      `imgUpload()`; this span carried no handler, which is the control-whose-only-effect-is-to-exist
      `CLAUDE.md` names outright. **Its gate was the wrong value** — `canPostImages` is
      `(isPresenter || sessData.userUploads)` at byte 2,334,626, so `isPresenter` was NARROWER and a
      room with member uploads on offered this button to nobody but presenters.

      Two props where one flag would have done, deliberately: `isPresenter` still drives the
      placeholder, which is a different question with a different answer, and collapsing them would
      have re-created the narrow gate the moment somebody read the flag's name.
    */
    max: 224,
    why: 'the Q&A thread composer - one field, one picker, one button, and one refuted claim'
  },
  {
    file: 'lib/components/RemoteAudioSinks.svelte',
    /*
      Born capped, 2026-08-20, for the reason the `RoomShell` entry below records: a component
      without an entry is one nobody is watching.

      It is mostly prose and that is deliberate — six lines of markup under a docblock explaining why
      an invisible element is load-bearing, plus the `msRemAudio-` citation that the volume sliders
      depend on. The ceiling is set just above what arrived, so the next thing added to it has to be
      justified.
    */
    max: 55,
    why: 'the hidden <audio> sink per remote peer - six lines of markup, the rest is why'
  },
  {
    file: 'lib/components/notes/NoteEditor.svelte',
    /*
      CAPPED 2026-08-28, having been UNCAPPED at 1,546 lines — the second-largest Svelte file in the
      repository after the page itself, and the exact failure `PresentationArea` below records in
      its own entry: components are a hand-kept list, and a hand-kept list is how a file this size
      goes a whole phase with nothing objecting. Found by touching it for a one-boolean wire.

      Set at what it measures TODAY rather than at something aspirational, which is what that entry
      argues for: the number's job is to stop the next 200 lines, not to pass judgement on the
      existing 1,546. Most of the file is the toolbar — a dozen button groups, each transcribed
      against captured markup — and the obvious extraction is the toolbar itself, which would take
      this well under half. That is a real change with a real safety net (`note-editor-render`,
      `note-version-history` and `simplified-note-editor-contract` all render it) and it is not
      bundled with a settings wire.

      If this number climbs, the thing to check is whether the editor has started DECIDING something.
      It should not: `simplifiedEditor` arrives already resolved, and `resolveNoteSurfaceGates` is
      where that kind of question is answered.
    */
    /*
      1546 -> 1740, 2026-08-30. The carousel's image browser — `note-editor-file-browser-modal`.

      A presenter who had already uploaded an image through Files had no way to reach it from a
      slide: the row offered a bare URL box and nothing else. The modal, its per-slide button, the
      handler and four transcribed CSS rules are here, decoded with this component's own consts
      table (77/79/80/81) and the reference's scoped style block at byte 1,486,651.

      Two paragraphs of the addition are decisions rather than markup: why the `Loading images...`
      branch is NOT drawn (this room's list arrives with the page load, so it can never render — and
      a branch that can never render can never be checked), and why the grid item is a `<button>`
      where the capture uses a clickable `<div>`.

      This file is also the one where a naive comment strip deletes code — `accept="image/*"` at its
      image dialog — which `orphan-component-contract.test.ts` measured on 2026-08-29 and which the
      first draft of this feature's contract walked straight into.
    */
    /*
      1855 -> 1480, 2026-08-30, and this is the entry FINALLY DOING WHAT IT SAID.

      Two paragraphs above name the toolbar as the obvious extraction and say it is "not bundled
      with a settings wire". The carousel came out first, and it came out because this gate refused
      the row rebuild: rewriting the slide row to the reference's three states put the file at 2,214
      lines, and the rule is `Ceilings here only go DOWN: extract a slice into a module or component
      rather than raising this number`. `CarouselDialog.svelte` is that slice — the modal, the file
      browser, the two confirmations and eight CSS rules, none of which touches the editor.

      The toolbar is STILL the next one, and it is still not bundled with anything.
    */
    /*
      1740 -> 1855, 2026-08-30. The per-slide UPLOAD — the other half of the same `E0e` row.

      The browser above can only offer what is already in the room. `uploadCarouselImage` (byte
      1,476,460) is how an image GETS there from inside the carousel dialog, and without it a
      presenter had to leave the modal to upload — which loses every slide they had already typed,
      because this modal holds them in component state.

      A hidden file input under a styled `<label for>` (the reference's own pattern, const 58/59),
      the ` Browse ` button's corrected label and icon (const 61/62 — it shipped this morning as the
      invented `Select Image`, which is the MODAL's title), and the `D0e` spinner. The spinner is
      keyed by the slide's KEY and not its index, and that divergence is most of the added prose:
      upstream mutates a slide object it holds a reference to, ours replaces the array wholesale, so
      an index captured before the `await` points at a different slide once `removeCarouselSlide`
      renumbers.

      The toolbar extraction named above is still the answer to this file's size and is still not
      bundled with a feature.
    */
    /*
      1560 -> 1700, 2026-08-30. `note-editor-image-popover` — and a CORRECTION to the two entries
      below, which have named the toolbar as this file's obvious extraction since 2026-08-28.

      **That was wrong, and the carousel extraction is what showed it.** `CarouselDialog` came out
      cleanly because it touches no editor state: it is handed the values a carousel is made of and
      hands them back once. The toolbar is the opposite — it is *nothing but* editor access. Every
      one of its buttons calls `command((instance) => instance.chain()…)`, so extracting it produces
      a component with roughly twenty callback props whose only purpose is to reach back into the
      parent. That is worse code written to satisfy a number, which is the one thing this ratchet
      must not cause.

      The seams that ARE real here, in order: the version-history panel (its own list, its revert,
      its four CSS rules, no editor beyond one command), and the link/image/video dialogs (three
      modals with three fields between them). Neither is bundled with a feature, for the same reason
      the carousel was not until the gate forced it.

      This addition is 130 lines and about 90 of them are the reason: what the capture evidences here
      is the four GROUP NAMES and nothing else — summernote is not in the bundle, so its popover's
      markup, geometry and icons are unknown, and `imageAttributes` is deliberately not built rather
      than invented. `note-image.ts` carries the attribute decisions.
    */
    /*
      1502 -> 1560, 2026-08-30. `note-editor-gif-insert-confirm`, and the `hint` this surface passes.

      Fifty-eight lines, forty of them the docblock on `insertGif`. The handler inserted on the
      double-click; it now stages the GIF and `confirmGif` is what inserts. Two reasons, both worth
      the words: the preview matters because a Giphy result is a THUMBNAIL and what lands in the note
      is `images.original`, a larger image the presenter has not seen at the size it will appear; and
      `this.sendingGif` is transcribed as a refusal rather than a replacement, because the presenter
      is looking at a preview of the first GIF and a second must not swap what they are confirming.

      This file is now past every carousel extraction's savings on GIF handling alone, which is the
      argument for the toolbar coming out next rather than in another entry after this one.
    */
    /*
      1480 -> 1502, 2026-08-30. `note-editor-insert-carousel-silent-noop`.

      Twenty-two lines, twenty of them the reason: `insertCarousel` returned silently when no slide
      carried an `https://` URL, so the always-enabled primary button closed nothing, inserted
      nothing and said nothing. The reference alerts (byte 1,478,230) and `CLAUDE.md`'s fail-loud
      rule agrees with it. The note also records what is NOT that message — a missing editor is a bug
      in this component, not a mistake by the presenter.
    */
    max: 1700,
    why: 'the note editor and its transcribed toolbar; the version panel and the three dialogs are the seams'
  },
  {
    file: 'lib/components/notes/CarouselDialog.svelte',
    /*
      CAPPED ON ARRIVAL, 2026-08-30 — which is the whole point of the check that demanded it. Four
      components were found uncapped in two days and 36 by one measurement; a component that arrives
      with a ceiling cannot join them.

      Set at what it lands at rather than at something aspirational. It is `app-note`'s carousel
      surface in one file: the modal (`M0e`), the three-state slide row (`x0e` switching `D0e`/`E0e`/
      `k0e`), the file browser (`O0e`), the two `bootbox.confirm` questions, and eight CSS rules
      transcribed from the reference's own scoped blocks. Most of the length is transcription and the
      reasons for four deliberate divergences — the POST that is not reproduced, the spinner keyed by
      slide rather than index, the grid item that is a button, and the loading branch that is not
      drawn.

      If this number climbs, the thing to check is whether the dialog has started reaching for the
      EDITOR. It must not: it is handed the values a carousel is made of and hands them back once,
      and `NoteEditor` is what knows whether that is an insert or an edit-in-place.
    */
    /*
      880 -> 920, 2026-08-30, on the day it was capped. `note-editor-add-slide-scroll`.

      `addCarouselImage` scrolls the new row into view (byte 1,475,568) and this appended and
      stopped — with the list now a `max-height: 50vh` scroller, a presenter with six slides pressed
      ` Add slide ` and nothing appeared to happen. The lines are the handler, the bound element, and
      the note on why `tick()` replaces upstream's bare `setTimeout` and why the query is scoped to
      this dialog's own list rather than to `document`.

      A ceiling raised on the day it was set is worth a second look, and this one was taken: the
      addition is one behaviour from the same `x0e` row the rest of this component transcribes, not
      a new concern arriving. If the NEXT raise is also same-day, that is the signal to split the
      file rather than the number.
    */
    /*
      920 -> 947, 2026-08-30. G03 — the half of the connection overlay that was missing.

      There are TWO elements on `notConnectedOverlay` and this file had one: const 10, the
      three-second "Conected" flash. Const 9 — the overlay shown while the socket is DOWN — had no
      counterpart, so a member whose chat connection dropped saw nothing at all and was then
      congratulated for a recovery from a failure they were never told about. The half that was
      built is the half nobody needs.
    */
    max: 947,
    why: "app-note's carousel: the modal, its three-state slide row, the file browser and two confirms"
  },
  {
    file: 'lib/components/notes/NotesPane.svelte',
    /*
      CAPPED 2026-08-28 alongside `NoteEditor` above, and for the same reason: it was uncapped.

      It owns the tab strip, the rename and delete dialogs, and the version-restore confirmation —
      the note actions that are NOT authoring. Everything it hands the editor it passes through
      untouched, `simplifiedEditor` included. If this number climbs, the thing to check is whether a
      prop has started being transformed on the way through rather than forwarded.
    */
    /*
      447 -> 452, 2026-08-30. `sessionImages` forwarded to the editor for the carousel's image
      browser. Five lines: the prop, its type import, and the pass-through.
    */
    /*
      452 -> 525, 2026-08-30. `note-editor-welcome-mat-all-rooms-password`.

      Seventy-three lines, and about sixty of them are the reason. The reference raises THREE dialogs
      from one button (byte 1,474,217) — a password prompt when `allRoomsWelcomeMatPW` is configured,
      a plain confirmation when it is not, and a different confirmation for the per-room variant —
      and only two existed here. The third could not exist while nothing knew whether a password was
      set, because that setting is one of the seven that may never reach this room.

      What is written down is why the room asks the controller which dialog to raise, why the typed
      value goes straight out uncompared, and why an unreachable controller means "prompt" rather
      than "confirm". None of that is guessable from the code.
    */
    max: 525,
    why: 'the note tab strip and the three confirmations; everything else passes through'
  },
  {
    file: 'lib/components/PrivateChatComposer.svelte',
    /*
      CAPPED ON ARRIVAL, 2026-08-30 — which is what the check that demanded it is for.

      `pEe` at reference byte 2,198,563: the private composer's textarea, its three-button column
      (emoji, image upload, GIF), both popovers, the webinar-mode notice and `autoExpand`. It exists
      as a component because G1's button column put `PrivateChatPanel.svelte` past its ceiling, and
      it is a good seam — nothing here knows about tabs, threads, paging, search or the roster.

      Most of the length is transcription and reasons: the const table by value, why `form-control`
      matters where `w-100` did not, why the emoji button alone is ungated, and why `autoExpand`
      resizes `.pc-messages` as well as the box.

      Twenty-five of the 325 are keyboard access on the two popover spans and the note saying why
      eslint could not have asked for it: the spread attributes mean Svelte cannot see statically
      that there is no role, so `a11y_click_events_have_key_events` never fires and an ignore for it
      is an ignore for nothing. The linter's silence there is not evidence the spans are reachable.

      If this climbs, the thing to check is whether the composer has started DECIDING who may post.
      It must not: `canPostImages` arrives already answered, and `canPost` is enforced in
      `RoomPrivateChat.send` from the room's own gate.
    */
    /*
      325 -> 335, 2026-08-30. `onfocus` for G27 — `onTextareaFocus()` stops the tab-title flash — and
      the note saying which half of upstream's method crosses and which this component binds
      declaratively.
    */
    /*
      335 -> 312, 2026-08-31, and DOWN is the only direction this entry has ever moved on its own
      merits. The v4 audit batch added the webinar notice's label and its correct parent, the send
      arm's `showEmojiChooser = !1`, and the three-way Enter branch — and paid for all of it by
      moving two regions to the files that own them: `autoExpand` and its two paragraphs to
      `private-composer-auto-expand.ts`, the Enter branch and the six `onKey` offsets to
      `chat-composer-enter.ts`. The const transcription became assertions in
      `private-chat-composer-v4-contract.test.ts` instead of a fenced block nothing checks.
    */
    /*
      312 -> 358, 2026-08-31, for `PCC-06`'s composer half: one `onpaste`, one prop, one handler,
      and a docblock that is most of the raise because it records a DELIBERATE DIVERGENCE.

      Upstream's PM `onImagePaste` at byte 2,212,274 has **no `canPostImages` guard** — the chat
      composer's copy opens with `if(!this.canPostImages)return!1` and this one does not. Ours gates
      anyway: `canPostImages` already decides whether the upload and GIF buttons render at all, so a
      paste that uploaded in a room where those buttons are hidden would offer through the keyboard
      exactly the capability the buttons deny. The contract test asserts BOTH halves — the absence
      upstream and the presence here — so a future capture that adds the guard makes this re-read
      rather than leaving the comment describing a difference that stopped existing.
    */
    max: 358,
    why: "app-privchat's composer: the textarea, its three buttons, both popovers and autoExpand"
  },
  {
    file: 'lib/components/PrivateChatPanel.svelte',
    /*
      CAPPED 2026-08-28, having been uncapped — the third component found without a ceiling in two
      days, after `NoteEditor` and `NotesPane`. The hand-kept list is the problem and this entry does
      not fix it; what it does is stop this file.

      396 and FALLING: it was 425 before the row inside its scroller became
      `CompactMessageRow.svelte`. The number below is the post-extraction measurement deliberately,
      so the ceiling starts where the file actually is rather than licensing the twenty-nine lines
      back.

      If this number climbs, the thing to check is whether the panel has started deciding something.
      It holds no state of its own beyond the drag/resize attachment: the thread, the tabs, the
      search and the draft all belong to `RoomPrivateChat`.
    */
    /*
      RAISED 396 -> 402 on 2026-08-30, and the six lines buy a control that was making decisions it
      had no basis for.

      This panel used to decide whether more history existed (`log.length >= 50`) and which page to
      ask for (`Math.floor(log.length / 50)`), against a `PAGE_SIZE` it declared itself. A short page
      then named a page already fetched, so the same private messages were requested and prepended
      twice, and the badge never disappeared. It renders `hasMore` / `loadingMore` now and asks with
      no arguments — two props, a spinner branch the reference has, and their prose.

      Flagged for the owner, as this session's other raises are. `private-chat.svelte.ts` beside it
      absorbed a state machine and still came out a line SHORTER, because `RoomPeerHistory` left.
    */
    /*
      402 -> 525, 2026-08-30. Seven rows of the surface audit, and most of the addition is why.

      G6 the newest-first reversal, G15 the gravatar fallback (both sizes), G17 the clear button that
      never cleared its own input, G18 the two independent gates the capture has where this had one
      wrapping both columns, G21 the composer's four transcribed attributes and the wrapper structure
      the button column will attach to.

      The G21 note is the longest and earns it: it carries the whole composer const table (50, 52,
      53, 54, 55, 56) including the two entries belonging to rows still open, so that the next piece
      attaches to the element the capture names rather than to one invented for it.
    */
    /*
      525 -> 540, 2026-08-30. G5 — the `flex-row-reverse` swap and its prop.

      Most of it is why: the preference has been WRITTEN by the settings modal since that modal was
      built and read by nothing, so the toggle changed its own state and nothing else. The note also
      says why the class is used rather than two orderings of the markup — DOM order is the reading
      order a screen reader and the tab key follow.
    */
    /*
      540 -> 520, 2026-08-30, and DOWN because the composer left.

      G1's button column would have put this file at 716. The ratchet refused it and its remedy is a
      slice, so `PrivateChatComposer.svelte` came out carrying `pEe` whole — the textarea, the three
      buttons, both popovers, the webinar notice and `autoExpand`. The panel is smaller than it was
      before the feature, which is what an extraction is supposed to look like.
    */
    /*
      520 -> 524, 2026-08-30. `oncomposerfocus` passed through for G27. Four lines, three of them the
      prop's docblock.
    */
    /*
      524 -> 525, 2026-08-31. One line: `PCC-06`'s `onimagepaste` forwarded to the composer. The
      panel owns no paste behaviour and deliberately none — it is the same pass-through this file
      already performs for `onimageupload`.
    */
    max: 525,
    why: 'the private-chat panel - tabs, thread and composer; the row itself is a shared component'
  },
  {
    file: 'lib/components/RoomSidebar.svelte',
    /*
      CAPPED 2026-08-28, having been uncapped — the FOURTH component found without a ceiling in two
      days, after `NoteEditor`, `NotesPane` and `PrivateChatPanel`. Four in two days is not four
      oversights; it is the hand-kept list failing as a mechanism, and it is recorded here so that
      the next person reads a pattern rather than a coincidence.

      **The structural fix is known and is not this commit**: `lib/room/*.svelte.ts` modules are
      discovered and capped automatically by gate 0b, and components are not. Extending that
      discovery to `lib/components/**` would end this class of miss permanently, and would arrive
      with a list of every remaining uncapped component rather than one more entry typed by hand.

      778 lines: the roster, its search, the app-info block, the connectivity rows, Benzinga and now
      the tip button. Every gate it draws arrives already decided — `rowVisible`, `rowIsFull`,
      `benzingaVisible`, `tip` — and if this number climbs the thing to check is whether one of them
      has started being computed here instead.
    */
    /*
      775 -> 845, 2026-08-30. RS-01, RS-02 and RS-05 — three roster-row gaps, and the third is the
      one that mattered.

      RS-05: `showUserAvatar(e) { return !sessData.hideAvatars || !!e }` — the roster's avatar gate
      is NOT the message log's, and this rail had none, so a room with avatars turned off still
      published every member's picture here. RS-02: the badges div was rendered ALWAYS and EMPTY —
      const 8's class list with no content and no gate, a wrapper nobody fills. RS-01: the Trial
      chip had no node at all, so a presenter scanning the roster could not tell a trial from a
      paying member, which is the one distinction that list is used to make.

      `badgesFor` is `RoomFeeds`'s and is the SAME resolution the message rows use, passed in rather
      than re-derived — which is what stops the rail and the log disagreeing about who wears what.
    */
    /*
      845 -> 873 in the same commit: RS-10 and RS-11, two markup shapes and their citations.

      RS-11 is the one worth the lines. The reference draws FOUR nodes in two shapes — the two
      failure sentences are a `<p>` each, and the two success marks share one `<p>` as `<span>`s —
      and we had one `<p>` per service with both states inside it. So on a healthy connection the
      room drew two stacked lines where the reference draws one, and CHAT came second where the
      reference puts it first. RS-10 swaps Mobile App Info ahead of the tip button, which is the
      reference's own order: the thing the ROOM offers before the thing the PRESENTER asks for.
    */
    /*
      872 -> 888, 2026-08-31 (`RSG-04`). Sixteen lines, none of them code: the note over the roster's
      `{#each}` explaining why keying by `user.id` is upstream's identity here.

      It EARNS them, and the reason is that the equivalence is invisible. `m2e = (t,n) =>
      n.userXrefID` (byte 2,032,733) is the reference's track-by; ours keys by `user.id`, and the two
      select the same person only because `+page.server.ts:208` sets
      `userXrefID: String(account.id)`. The moment that stops being a derivation — an external CRM
      id, an SSO subject — this key silently stops being the reference's identity and a roster row is
      recreated where upstream reuses it. Nothing else here would notice, so
      `roster-identity-contract.test.ts` pins both ends and this says why.
    */
    max: 888,
    why: 'the sidebar - roster, app info, connectivity and the two external-link blocks'
  },
  {
    file: 'lib/components/RoomShell.svelte',
    /*
      Created 2026-08-17 (S4+S8), and capped IN THE SAME COMMIT — which is the lesson S5 paid for
      two hours earlier, when `PresentationArea.svelte` turned out to have grown to 1,181 lines with
      no entry because components are a hand-kept list. A new component gets a ceiling on arrival or
      it gets one after it has already sprawled.

      Small on purpose: it owns the `as-split` element, the gutter, the child order and the two
      layout effects, and NOTHING else. The three panes arrive as snippets. If this number starts
      climbing, the thing to check is whether pane props have begun leaking through it.
    */
    /*
      239 -> 269, 2026-08-30, for `acA-08` — the extra chat column now has two desktop homes and this
      file places one of them.

      The lines are the two gates with their offsets, including the measured fact that the PHONE's
      template carries no direction term at all (`nRe`, byte 2,496,359) while the desktop one does.
      That asymmetry is what the file gets wrong if somebody unifies the two branches, and it is not
      recoverable from either branch on its own.
    */
    max: 269,
    why: 'the split layout and its two effects; the panes arrive as snippets, not as props'
  },
  {
    file: 'lib/components/PresentationArea.svelte',
    /*
      ADDED 2026-08-17 (S5), and the reason it did not exist until then is the finding.

      This file is 1,181 lines and renders TWELVE child components. It is the second-largest Svelte
      file in the repository after `+page.svelte`, and it had no ceiling — so every slice of Phase 5
      that pushed work down into it was uncapped, which is precisely the growth this ratchet was
      written to stop. Gate 0b made ceilings MANDATORY per discovered `lib/room/*.svelte.ts` module;
      components stayed a hand-kept list, and a hand-kept list is how this was missed. Noticed only
      because S5 added 39 lines here and nothing objected.

      Set at what it measures TODAY rather than at something aspirational: the number's job is to
      stop the next 200 lines, not to pass judgement on the existing 1,181. The twelve drilled screen
      props are the obvious next extraction and will bring it down on their own.

      THEY DID, ON 2026-08-18, and the prediction is left above rather than tidied away because a
      ceiling note that names its own trigger and then records the trigger firing is the only kind
      that stays honest. It was twenty-one props rather than twelve once counted: seventeen members
      of `screens` and four of `mediaTransport`, both of which were already props here for the
      spatial-layer effect. 1,181 -> 1,159, and that is NET of a twenty-line comment explaining the
      collapse — the interface and the destructure shed forty-two between them.

      1,159 -> 1,112 the same day, and the ROUTE THERE is the part worth recording. Collapsing the
      next three facades — `webcams`, `notes`, `broadcasts`, another twenty-three props — took the
      page down twenty-three and pushed this file UP to 1,174, because the argument for each
      collapse arrived here as prose. That is a raise, and the rule at the top of this file says a
      raise is a conversation rather than a number to edit.

      So it was not raised. `app-webcam-holder` left for `WebcamStrip.svelte`, which is the seam the
      CAPTURE draws: this file held the markup of two Angular components and its own header opens by
      naming both. The "one component and not seven" argument it makes covers the seven tab panes,
      which share `mainTab`; the strip shares nothing with any tab. Eighty-four lines out, and the
      answer to an over-projection stayed what the plan says it is — another extraction.


      RAISED 1113 -> 1115 on 2026-08-23, with the owner's explicit approval, for two props threading the note focus to `NotesPane`.
      Recorded as a DECISION rather than edited quietly, because the standing rule is that a
      ceiling only ever goes down and a raise is a conversation. This one is a genuine
      capability arriving — "Bring everyone here" on session notes had brought nobody since it
      was written — and nearly all of the growth is the mandatory WHY: the capture byte offsets
      for the reference protocol, the read-not-assumed proof that a plain tab click must not
      re-broadcast, and why `presenterRoom()` rather than the client decides authority. The
      alternative on offer was an extraction invented to satisfy a number, which is the thing
      this file exists to prevent.
    */
    /*
      1115 -> 1123, 2026-08-28. The rule above says a raise is a conversation; this is the fourth and
      last exception this file records, and unlike the other three it names its own undoing.

      WHAT THE EIGHT LINES ARE: the `hideNotes` prop, and the two `hidden` bindings the reference
      applies — one on the notes `li` (bundle byte 2016630) and one on the notes pane (2017506) —
      with the citation for each. `hideFiles` and `hideStreams` have carried exactly this shape here
      since the component was written; `hideNotes` was the third of that trio and had no gate at all,
      so an owner who ticked "Hide Notes Section?" got a room that still showed the tab.

      THE PAIR IS SMALLER. `routes/+page.svelte` drops 1406 -> 1395 in the same commit, because
      `hideStreams` moved out of it and into `RoomGates` to sit beside the `notesHidden` this change
      added. Two tab-hiding gates in two places was the thing worth fixing.

      THE FOLLOW-UP THIS RAISE IS BORROWING AGAINST, named so it is a debt and not a shrug: the
      `<ul id="mainTabs">` strip is 275 lines of this file and is already covered end to end by
      `main-tab-strip-contract.test.ts` — a contract test named after a component that does not exist
      yet. Extracting `MainTabStrip.svelte` is a focused change with a safety net already in place,
      and it takes this ceiling far below where it started. It was not bundled here because a
      275-line extraction riding along with a settings fix is two changes wearing one diff.
    */
    /*
      1123 -> 867 on 2026-08-28. THE DEBT ABOVE IS PAID, and by the change it named: `ul#mainTabs`
      is `MainTabStrip.svelte` now — 282 lines out, one call site and its citation back in.

      `main-tab-strip-contract.test.ts` renders the PARENT, so the safety net that was already in
      place went on proving the strip end to end across the move without being touched. That is what
      made a 282-line extraction a small change rather than a leap: the thing that could break was
      already asserted before the first line moved.

      What is left here is what the header always claimed the file was — the WIRING between a tab
      strip and seven panes. If this number climbs again the question is whether a pane has started
      deciding something rather than rendering it.
    */
    /*
      867 -> 874 the same day, and it is worth six lines: `bufferSizeLevel` and `onBufferSizeChange`
      now reach `StreamingView`, which has drawn a Buffer dropdown since it was written and could
      never change anything — the prop was never passed, so every click called `undefined?.()`.
    */
    /*
      874 -> 880 on 2026-08-28 for the moderator bar: an import, a documented prop, its destructure,
      a one-line citation and the call site. Six lines, and four of them are the cost of a child
      component existing at all rather than anything this file decides.

      The bar is HERE and not on the page because the capture puts it here - `$4e` renders inside
      this split area, before `app-presentationarea` - and because `isPresenter` is already a prop
      here, so the gate's second term costs nothing to reach. The markup, the five consts, the byte
      offsets and the argument for not persisting its dismissal are all in `ModeratorMessage.svelte`
      and its contract file, which is why six lines land here and not twenty.
    */
    /*
      880 -> 883, 2026-08-28, and THE PAIR IS NET ZERO: `routes/+page.svelte` falls 1390 -> 1387 in
      the same commit, so the three lines moved rather than appeared.

      Two of them are `simplifiedEditor` reaching `NotesPane`. The third replaced this file's inline
      `{ surfaceVisible: boolean; editorMounted: boolean }` with the imported `NoteSurfaceGates` —
      the same shape was written out in two files, and the second copy had already fallen a field
      behind before anybody noticed. A type is a contract; a restatement of one is a second contract
      that agrees today.
    */
    /*
      883 -> 910, 2026-08-28, for `customPlayerURL`: a documented prop, its destructure, the eight
      captured iframe attributes and their wrapper, and an eight-line citation.

      TWENTY-SEVEN LINES FOR ONE SETTING is the most any single setting has cost this file, and the
      reason is what it replaces: slot 39 upstream is the ENTIRE rest of this pane, including the
      save-data switch. So the comment has to say that the gate belongs ABOVE `videoDisabled` rather
      than inside it — which is exactly the mutation a negative control turned red, and exactly what
      a future reader would otherwise "tidy" by nesting it with its neighbour.
    */
    /*
      910 -> 958, 2026-08-28, for the positions panel: three props, the local toggle and the panel
      reference, two call sites and their two citations.

      NODE 3 AND NODE 5, and the split is why this is forty-eight lines rather than fifteen. Upstream
      puts the container BETWEEN the moderator bar and `app-presentationarea`, and the buttons AFTER
      it — so the two halves of one feature sit at opposite ends of this file, and each end needs the
      citation that says the other exists. The alternative was one component holding both, which
      would have had to render into two places.

      The markup itself is `PositionsContainer` and `PositionsControls`; what lives here is the
      wiring and the local `showPositions`, which is local because upstream's `globals.showPositions`
      has exactly three readers and all three are in this column.
    */
    /*
      958 -> 959, 2026-08-29: one line, `{menus}` forwarded to `StreamingView` so its buffer-size
      dropdown can open at all. See `bootstrap-dropdown-contract.test.ts`.
    */
    /*
      959 -> 975, 2026-08-30. The anti-leak watermark resolved ONCE, for both videos.

      `StreamingView` has carried the overlay since it was built and `ScreenPane` never had it, so a
      room with `overlayUserIdOnScreenshare` on watermarked the restreamed feed and left the
      SCREENSHARE — the surface the setting is named for — clean (`SV-SP-01`). The rule is
      `#lib/user-id-watermark.ts`; what is here is one `$derived` and the paragraph saying why the
      answer is computed at this level rather than at each of the two components.
    */
    /*
      975 -> 988, 2026-08-30. The room's shared IMAGE files, filtered once for the note carousel's
      browser. The reference fetches that list on every open; `data.files` is already here and every
      upload path invalidates it, so this is a `$derived` over data the page holds rather than a
      second read of it.
    */
    /*
      988 -> 990, 2026-08-30. One parameter: `pw` forwarded from the notes pane to the action, for
      `note-editor-welcome-mat-all-rooms-password`. This component only passes it along — it is not
      where the password is typed and not where it is compared.
    */
    /*
      990 -> 1089, 2026-08-30, for `PA-04` through `PA-08` — five rows, four of which are ORDER.

      Order is the kind of finding that gets fixed and then silently undone, because nothing about
      the rendered page looks wrong either way: only one tab pane is `show active` at a time, and the
      caption overlay is `z-index: 9999` wherever it sits. So each move carries the bytes that decide
      it and the consequence that is not visual — tab order for a keyboard user, and a slot-by-slot
      diff against the reference that stops lining up.

      `PA-05` is the one with a runtime cost, and it is a phone: the reference's mobile host has four
      children and no `app-webcam-holder` at all, because a phone's presentation column is short.
    */
    /*
      1089 -> 1105, 2026-08-30. Sixteen lines at the `<ScreenPane>` call site: four new props for
      `SV-SP-02`/`03`, two callbacks for `SV-SP-04`, and the note recording that NO `volume` and no
      `muted` are passed any more and why that is the fix rather than an omission.

      1105 -> 1106, 2026-08-31 (MTS-02). ONE line: `canEditNotes={data.canEditNotes}` in the
      `<MainTabStrip …/>` props. The notes cog's gate is `isP || user.canEditNotes` (byte 2,016,713)
      and the strip carried no prop that could answer the second term, so it drew the cog for
      everyone. The value is read off `data`, which is where every authority answer in this room is
      decided, and passed by NAME rather than through a spread — `unfed-props-contract` can only see
      a supplier it can find spelled out.
    */
    /*
      1,106 -> 1,109, 2026-09-01. Two prop lines and their blank: `localPreview` and
      `onlargepreview` for `SP2-04`. The call site is where a screen's per-screen state is handed to
      its pane, and there is nothing here to extract that is not that.
    */
    max: 1109,
    why: 'the room stage - twelve child components, and the largest file after the page itself'
  },
  {
    file: 'lib/components/TabGearMenu.svelte',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE, for the reason `ModeratorMessage` and
      `MainTabStrip` both give below: components are a hand-kept list here, and a new one that ships
      without a number is exactly how `PresentationArea` went uncapped for a whole phase.

      156 lines, of which the markup is TWENTY-FIVE. The rest is the measurement that produced it —
      the reference's two sub-templates (`KCe` 1,916,736 and `ZCe` 1,918,232), the consts they
      resolve, and the table showing how this room's two hand-wirings of them had diverged. That
      ratio is correct: what this component is FOR is that the two cogs cannot diverge again, and
      the argument is the deliverable.

      If this number climbs, the thing to check is whether the cog has started deciding WHO sees it.
      It must not: both gates are `{#if}` at the call site, where the values are, because `-1` in
      `ɵɵconditional` means no element rather than a hidden one.
    */
    max: 157,
    why: 'the notes and files cogs, which were one control with two implementations'
  },
  {
    file: 'lib/components/ImagePasteConfirm.svelte',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE, like its two siblings above and below.

      76 lines, eight of them markup. It exists because `RoomOverlays.svelte` held THREE copies of
      one `bootbox.confirm` and two of them carried the same sixteen-line citation verbatim — and
      because `dta-04` had already been raised for the failure that shape invites: two of the three
      shipped without `<h4>Upload this image?</h4>`, leaving an unlabelled OK button over a picture.

      If this number climbs, the thing to check is whether it has started deciding WHICH uploader
      runs. It must not: `doImggurUpload` dispatches on a feature name deny-by-default (byte
      1,992,037), so each caller keeps its own `onconfirm`, and sharing one is how an image meant
      for a form is posted into chat.
    */
    max: 77,
    why: 'the "Upload this image?" confirm - one dialog that was three transcriptions'
  },
  {
    file: 'lib/components/KickedPage.svelte',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE — and this test is what asked for it. `every
      component is discovered and capped` failed the moment the file appeared, named it, and would
      not go green until it had a number. That is the second time this repository has been TOLD about
      an uncapped component rather than finding one by accident.

      107 lines, of which the MARKUP IS FIVE and the style rule is four. Everything else is the
      decode, and the ratio is correct for this file rather than slack to grow into.

      The component upstream is four declarations, one variable, three consts and one CSS rule
      (byte 2,561,780) — so small that the interesting content is all in what surrounds it: which
      arm of `app-root`'s five-way switch it occupies and why only two of those five are modelled
      here; why a page swap replaced a dismissible dialog (`TODO.md` row 6's one residual); that
      `d-flex-column` is not a Bootstrap class and is transcribed anyway; that `vertical-align` on
      a block element is inert in the reference too; and that TWO different defaults exist upstream
      — the component's `"kicked"` and the host's `"Kicked"` — neither normally reached.

      Fifteen of those lines arrived on the day it was written, moved OFF `+page.svelte` when this
      file's own ceiling pushed back on putting the switch decode at the branch. That is the trade
      this ratchet exists to force, and it landed the citation beside its subject.

      If this number climbs, the thing to check is whether it has grown a DECISION. It renders one
      string and reads no gate; a prop that is an entitlement, or any branch at all beyond the
      fallback, is the signal that the page's job has started leaking into it.
    */
    max: 107,
    why: 'the page a kicked member is left on - five elements, and the decode that says why'
  },
  {
    file: 'lib/components/ImageLightbox.svelte',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE, same rule as its two siblings.

      94 lines and no state at all: a url and a dismissal. Most of it is the transcription of
      `showImagePreview(e, i = "")` (byte 1,992,730) and, more importantly, the two things that
      CANNOT be transcribed from this checkout — where bootbox puts a `buttons` entry and what
      classes it ends up with, since `window.bootbox` is a global whose source is not in the bundle.
      Writing down what is unevidenced is the point of the file being this size.

      If this number climbs, the thing to check is whether it has grown a second caller's needs. It
      has one, `RoomOverlays`, and the room's other renderer of the same image is a popped-out
      window built by `RoomModals.showImage` — a different surface, deliberately not merged.
    */
    /*
      95 -> 117, 2026-08-31 (ROV-04). ONE line of markup — `<div class="modal-backdrop fade show">`
      — and twenty-one of comment over it, and the ratio is the right way round for this file.

      This dialog wore `bootbox modal fade imgur-modal show` and emitted no backdrop, so the one
      modal in the room whose entire job is to be looked at was the only one you could see the room
      through. `showImagePreview` (byte 1,992,730) is a plain `bootbox.dialog({…})` and bootbox
      emits a backdrop with every dialog; `BootboxDialog.svelte:145` already did.

      The comment is long because the element's POSITION is load-bearing and invisible: `app.css:762`
      selects `.bootbox.modal.above-note-modal + .modal-backdrop`, an adjacent-sibling combinator, so
      a backdrop moved inside the dialog to look tidier would still render and would silently stop
      matching. That is precisely the "simplified back into the bug it was fixing" this ratchet's
      comments exist to prevent, and the contract test asserts the ORDER rather than the presence for
      the same reason — its negative control was the nested form, seen red.

      The row this closes had recorded itself blocked behind extracting this very component out of
      `RoomOverlays.svelte`. The extraction had already happened, for `dta-02`, on the same day.
    */
    max: 117,
    why: 'the imgur lightbox - one image, a download that does not dismiss, and one alt rule'
  },
  {
    file: 'lib/components/ModeratorMessage.svelte',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE, for the reason `WebcamStrip` and `MainTabStrip`
      both give: components are a hand-kept list here, and a new one that ships without a number is
      exactly how `PresentationArea` went uncapped for a whole phase.

      74 lines, of which the markup and the props are TWELVE. The rest is the transcription - the
      template function, its five resolved consts, the gate expression with its byte offset, and the
      two paragraphs that will stop the next reader from "improving" the dismissal into a saved
      preference. That ratio is correct for this file and is not slack to grow into: the component
      renders one bar, reads two props and writes one boolean.

      If this number climbs, the thing to check is whether the bar has started deciding WHO sees it.
      It must not: the gate is a conjunction of a value and a ROLE, both handed to it already
      decided, and a member seeing a moderator's private note is the failure this file exists to
      prevent.
    */
    max: 74,
    why: 'the presenter-only moderator bar - twelve lines of component, the rest is the citation'
  },
  {
    file: 'lib/components/MainTabStrip.svelte',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE, like `WebcamStrip` below and for the reason its
      entry gives: a new component that ships without a number here is how `PresentationArea` went
      uncapped for a whole phase.

      372 lines by this file's count, and roughly a quarter of that is comment: the strip is eight `<li>` elements and
      every one carries the byte offset of the gate it reproduces. The single most important thing
      in the file is the distinction between `{#if}` for an ENTITLEMENT and `hidden` for a MODE or a
      room SETTING — swapping them is invisible to every source-text instrument here and leaks what
      a room has paid for, which is why `main-tab-strip-contract.test.ts` renders rather than greps.

      If this number climbs, the thing to check is whether the strip has started DECIDING something.
      Every gate it draws arrives already decided; it writes exactly one value, `mainTab`, and that
      is what a tab strip is.
    */
    /*
      372 -> 371, 2026-08-31. `TabGearMenu.svelte` took both cogs, which were one interaction with
      two hand-wirings that had drifted apart — see that file. The room made by the extraction paid
      for the files cog's `{#if isPresenter}` gate (byte 2,017,076) and for the measurement of the
      one gate this strip deliberately does NOT reproduce, `z('hidden', o.hideScreens)`.

      371 -> 399, 2026-08-31 (MTS-02). Twenty-eight lines, of which the CODE is four: a prop, its
      entry in the destructure, and `{#if isPresenter || canEditNotes}` around the notes cog.

      The rest is the two things this file's own header says must never be lost. First, why the
      capability is a PROP and not `noteGates.editorMounted`, which the page already computes and
      `PresentationArea` already holds: that value is `notesEnabled && canEditNotes`, so reusing it
      would AND the room setting into the member's half of the gate and not the presenter's, which
      is a gate the reference does not have. Second, why the gate is on the COG and not the `<li>` —
      a member who may not author still reads notes, and `hidden={hideNotes}` one line up is where
      the room's setting is answered.

      The old comment at this site said the missing gate was mild because `requestNewNote` refuses
      anyway. It is replaced rather than kept: a control whose only effect is nothing is the shape
      the root standard names outright, and describing it as harmless is how it stayed.
    */
    max: 399,
    why: 'ul#mainTabs - eight tabs, two dropdowns, and a byte citation on every gate'
  },
  {
    file: 'lib/components/WebcamStrip.svelte',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE, which is the only reason this list is worth
      keeping by hand at all.

      `PresentationArea` went uncapped for the whole of Phase 5 because components are a hand-kept
      catalog and nobody added it — its own entry below records that, and records that S5 pushed 39
      lines into it with nothing objecting. A new component that ships without a number here repeats
      exactly that, so the number goes in with the file.

      Small on purpose, and it should stay small: three props, no state of its own, and every
      decision it renders belongs to `RoomWebcams`. Most of the file is the two transcriptions that
      came with the markup — why the cards are created dynamically rather than as the two static
      `app-presenter-cams` the captured template appears to hold, and why the ids carry the
      presenter suffix. If this number climbs, the thing to check is whether card BEHAVIOUR has
      started leaking out of `webcams.ts` and into the markup.
    */
    max: 125,
    why: 'app-webcam-holder - the card strip, three props, and the two transcriptions behind it'
  },
  {
    file: 'lib/components/ViewerAlertPrefsPane.svelte',
    /*
      Created 2026-08-30 and capped at what it landed at. Five controls whose consumers were live and
      whose switches did not exist, behind the two room gates the reference gives them. If this
      climbs, the question is whether a sixth gated preference belongs here or in its own pane.
    */
    max: 140,
    why: 'the alerts tab’s five gated viewer preferences — the arrival group, and the positions refresh'
  },
  {
    file: 'lib/components/AvDevicePane.svelte',
    /*
      Extracted from `ModalHost.svelte` on 2026-08-30 and capped at what it landed at. Most of it is
      `loadDevices` and the account of the six controls that used to write preferences nothing read.
      If this climbs, the question is what a seventh thing about choosing a microphone could be.
    */
    /*
      266 -> 343, 2026-08-30. SC-09, SC-10, SC-15 and SC-16 — the pane's four states, three of which
      had no shape of their own.

      SC-09 is the one that mattered. Every error this pane can raise is TRANSIENT — a denied
      permission the member can grant, a device they can plug in, a page they can reload over HTTPS
      — and the only way out was the Refresh button at the TOP of the pane, above a red block that
      ends the reading. The reference puts Retry inside the alert, which is where somebody who has
      just read it is looking.

      SC-10 replaces the WHOLE select group with "Please connect audio devices." rather than adding
      a message beside it, and that matters here more than upstream: this pane deliberately opens
      with both lists empty, so an empty dropdown was the first thing a member saw every time.

      SC-15 disables Refresh while it is working (pressing it twice fired a second `getUserMedia`
      while the first was still resolving, and the pane looked identical throughout), and SC-16
      gives the loading state the same `alert` shape its error twin already had.
    */
    /*
      LOWERED 343 -> 339 on 2026-08-31, by the extraction AVD-01/03/04 forced. `partitionInputDevices`,
      `selectedDeviceLabel`, `resolveSelectedDevice` and the five failure sentences are
      `#lib/device-enumeration.ts` now — pure, and executed for the first time. The pane grew the two
      defect fixes and still came out four lines below where it started, which is the ratchet working
      as designed rather than as an obstacle. It was three lines lower again until the `DeviceOption`
      note landed — and that note went to `#lib/device-enumeration.ts`, beside the type it is about,
      which is the move this file's own header calls the extraction itself rather than a raise.
    */
    max: 339,
    why: 'which microphone and camera this browser captures with, and the three processing flags'
  },
  {
    file: 'lib/components/ModalHost.svelte',
    /*
      Moved for the first time, and DOWN, by the chat-mode conversion. The two radios each built the
      confirm sentence themselves and only one of them built it right; `chatModeConfirmPrompt` in
      `#lib/chat-mode.ts` owns the capture's wording now and both call it.

      Down again on the last conversion. `uploadFile` was the eleventh call site and the one I did
      not know about — it lived HERE, not in `+page.svelte`, and a comment of mine had asserted it
      was a progressive `<form>` that degraded without JavaScript. It was a JS-driven loop over a
      queue. Converting it took `deserialize` out of this file entirely.

      `presenterCommand` and `giveMicScreen` were called from here too, and `presenterCommand`'s
      call site was BROKEN — its action had been removed three commits earlier while this file went
      on posting to it. Both are commands now. Held at the same number: the three command imports and
      the bug's explanation were paid for by `#lib/refusal-message.ts`, which eleven call sites had
      been writing out by hand.
    */
    /*
      PHASE 4, 2026-08-16, and the first time this ceiling has been the thing that FORCED a piece of
      work rather than merely recording one.

      Converting 160 `class:` directives to the clsx attribute form that `svelte/best-practices`
      asks for is a net saving across the repository — every component shrank except this one. This
      file grew 55 lines, because its tags carry the densest multi-condition classes and a
      two-condition object wraps onto more lines than the two directives it replaces.

      The rule above says a raise is a conversation, so the growth was paid for the way the previous
      four rounds were: with a real extraction. The conversion had exposed the candidate itself —
      the connectivity test's four rows were four near-identical 22-line blocks stating ONE
      pass/fail rule and ONE glyph rule four times over. They are a single `{#each}` over
      `#lib/connectivity-status-rows.js` now, and those rules are EXECUTED by a test for the first
      time: a ternary inside an attribute is not reachable without mounting this 6,000-line host.

      5,982 -> 5,965, so the file is smaller than it was before Phase 4 rather than merely level.
    */
    /*
      +15, 2026-08-23, owner-approved, for `save-permissions` — the Save button on
      `#permissionsModal` that raised the reference's alert and sent nothing.

      An import, an eight-line prop docblock, and an `onclick` that grew from one line to five
      because it now reads the five boxes instead of naming an action. ITS OWN PROP rather than a
      widened `onUserAction`, for the reason `focusOnSessionNote` paid for: a prop shared between two
      different acts is what lets a control look wired while doing something else.

      This file is the repository's largest and a standing extraction target, so the raise is
      recorded with what it bought rather than taken quietly. The duplicated half of the prose was
      trimmed first and lives on `permissions.remote.ts`, which owns the subject.
    */
    /*
      +41, 2026-08-23, owner-approved, for the advanced alert search.

      The modal filtered `data.alerts` — `loadAlertPage`'s newest FIFTY rows — so a date range
      pointing at last month searched fifty rows from today and answered "no results" over a log
      that had them. It asks the database now.

      What the lines are: the handler became async around a real round trip (the loading state it
      already had was describing one that did not exist); a `alertSearchFilter` predicate prop,
      because the server cannot know which traders this viewer filtered out and the rule has to
      travel to the results; and a visible notice when the search reaches its cap, since a bound the
      reader cannot see would only have moved the silent wrong answer from fifty rows to five
      hundred. The `alerts` prop it replaced was DELETED, which paid eight of the forty-one back.
    */
    /*
      6006 -> 6010 for the `stickyNonTradeAlert` pass-through: a typed prop, its docblock, its
      default in the destructuring, and one line at the call site. Four lines to carry one boolean
      through a component that exists to carry things through, which is what this file's own note
      calls the cost of `ModalHost` being 85 props wide.
    */
    /*
      6010 -> 6101, 2026-08-28, and this is the largest single raise this file has taken. It is a
      FEATURE arriving, not a wire, and the size is the honest measure of a triage row that was
      wrong.

      `enablePrivateMessageHistory` was filed in `missing-settings-triage.md` as WIRE — "one row in
      the user-info modal". It is not. The button is one row; what it opens was a permanent
      `Loading...` spinner with no fetch behind it, no list, no empty state and nothing that could
      ever open it. Reading the reference end to end is what found that: `showPrivateMessages()`
      emits `doUserPMModal`, a separate component subscribes and calls `getAllUserPM`, and NONE of
      that half existed here.

      WHAT THE NINETY-ONE LINES ARE: the gated button (13, most of it the citation), the modal body
      as the reference's own two-way switch plus the two branches it does NOT have — a refusal, and
      a notice when the answer was capped — and the six props carrying the answer in. The ROW is not
      among them: `CompactMessageRow.svelte` is shared with `PrivateChatPanel`, which is what stopped
      this from being a second copy of a transcription.

      The extraction this file needs has not changed and is not this: it is the user-info modal
      itself, which is the largest single surface in here and now has one more reason to leave.
    */
    /*
      6101 -> 6126, 2026-08-28, and all but two of the twenty-five lines are the citation for a
      two-word fix.

      The `Trial` and `New` badges in the user-info modal were `{#if targetUser.isTrial}` and
      `{#if targetUser.isNew}` — ONE term between them, where the capture has `isPresenter &&` on
      both (byte 2,060,925). A member opening another member's info card could read their billing
      status. The fix is `isPresenter &&` twice; the comment is long because it also has to record
      why the THIRD term, `isNewIndicatorOn`, is deliberately absent — `isNew` has no supply
      anywhere, and a gate with nothing to gate is not a consumer.

      That is the standard this file exists to protect. A two-word fix with no recorded WHY is the
      one that gets "simplified" back into the bug.
    */
    /*
      6126 -> 5960, 2026-08-28, and it is a DROP of 166 — the largest this file has taken, and the
      first one this ceiling caused rather than recorded.

      The Q&A thread grew a menu that acts, which is what `enableQAReactions` needed underneath it,
      and the raise was refused. So the thread left: `AlertQaModal.svelte` holds the modal, its three
      pieces of state, its two derived timestamps and the three functions that were only ever its
      own. Nothing else in here read any of them.

      That is what this ratchet is for, stated as an outcome rather than as a rule: the answer to a
      file outgrowing its ceiling is to take a self-contained piece out of it. The next candidate has
      not changed and is named two entries up — the user-info modal.
    */
    /*
      5960 -> 5976, 2026-08-28, and sixteen of the lines are a comment on a DELETION.

      The two Text Mode radio pairs were dead: local `$state` seeded from a constant, writing
      `alertDisplayMode` / `chatDisplayMode` with `'regular'` / `'compact'` — three invented names
      against the reference's own keys and values — and nothing read any of them. The code shrank
      (eight lines of handler became four one-liners); what grew is the paragraph recording the third
      control of that exact shape found in this room, so the next reader does not have to rediscover
      why the keys are on `dead-preference-keys.ts`.
    */
    /*
      5976 -> 5980 on 2026-08-28: the `schedulerAvailable` prop, its default, its one-line docblock
      and the forward to the composer. A pass-through and nothing more — this file reads the value
      nowhere. Recorded rather than absorbed, because this is the largest component in the repository
      and the rule that its ceiling only moves with a reason written down is what has taken it from
      6,021 to here.
    */
    /*
      5995 -> 6006, 2026-08-29, for the two gravatar avatars in the muted-users and followed-users
      lists, which had no box and now have one.

      Ten lines: `width`/`height` on each of two images, a five-line note on the first, and a
      one-line cross-reference on the second - written as a cross-reference precisely because this
      file's ceiling makes a second copy of the same paragraph cost something.

      The number is small and the reason it is recorded anyway is that the WHY does not live here:
      `?s=30` is gravatar's own size parameter, so the box is read off the URL rather than chosen,
      and the full argument - including which images in this repository cannot be dimensioned and
      why - sits in `img-dimensions-contract.test.ts`, which enforces it. That file is the
      extraction that paid for this raise; without it these ten lines would have been ten lines of
      prose in the largest component in the repository.
    */
    /*
      6006 -> 6028, 2026-08-29, for `debug-log` — a presenter pulling one member's console log.

      Here it is one prop with its docblock, a title that names whose log is being read, and the note recording that `.debug-area` had two CSS rules and no wearer until now.

      A FEATURE arriving, not a wire. It left `INERT_ACTIONS`, which is what removing an entry there
      declares, and it is the one command in this room that could not be transcribed: upstream's
      reply lets the CLIENT name who receives the log, so the server had to grow a memory of who
      asked. `debug-log-contract.test.ts` is where that argument lives; these files carry only what
      each of them does.
    */
    /*
      6028 -> 6118, 2026-08-29, for `upload-profile-picture` — a presenter setting one member's avatar.

      Here it is the hidden picker, its prop, and TWO paragraphs that are the larger half: why this control takes its own prop rather than widening `onUserAction`, and why `accept` is assembled rather than written - a literal `image/` wildcard in this template opened a comment window that deleted 120,987 characters of markup from the whole-file stripper fifty-five test files use; plus the two `svelte-autofixer` suggestions declined at the code, with the ruling each was declined against.

      The last inert control with a captured wire and no blocker. It also carried a WRONG
      disposition: `TODO.md` filed it as belonging with the controller "because it is durable", and
      the controller's `users` table has no avatar column — the room's own `users.avatar_url` is what
      the roster reads and every chat message joins to. `profile-picture-contract.test.ts` holds the
      security argument; these files carry only what each of them does.
    */
    /*
      6118 -> 6151, 2026-08-29, for `remove-profile-picture-btn` — the other half of the avatar control.

      One button, one prop, and the paragraph recording what was NOT read: the const table gives the button's class list verbatim and its binding position, and the handler its click reaches lives in a render function this pass did not locate — so the behaviour is inferred and says so.

      Found by ARITHMETIC rather than by reading the bundle: the class carried two rules in `app.css`
      and had no wearer for the whole port, which `orphan-style-contract.test.ts` refuses. Its entry
      in that catalog turned red the moment the button existed and has been deleted, which is the
      declaration that it is done.
    */
    /*
      6151 -> 6215, 2026-08-29, for the 125px downscale and the alerts — a CORRECTION, not a feature.

      Here it is the canvas step and the paragraph on why it fails OPEN: four escape hatches, each handing the ORIGINAL file up, because a resize that refused the upload would replace the server's specific message with a vaguer one.

      `upload-profile-picture` shipped earlier the same day without either, because
      `docs/decoded/missing-commands-triage.md:93` — *"canvas-downscales the image to a 125px longest
      edge"* — was not read until after. That row is truncated in the document, so the arithmetic and
      the three alert sentences come from the bundle itself at bytes 2,084,700 and 2,086,100.
    */
    /*
      6215 -> 6275, 2026-08-29, for the troubleshooter's Mobile App TAB — and the PANE is not in this
      number, which is the point of the raise being this small.

      The pane went in here first and this contract refused it. The extraction to
      `MobileRestorePane.svelte` bought more than a line count, and that is why it was the right
      answer rather than a concession: the result message is now the PANE's state, so a tab change
      unmounts it and "leaving the tab drops the last result" is structural instead of a line in
      `onConnectivityTabChange` that a later reader deletes as redundant.

      What is left here is the tab button (consts 9/10/11, with the one `fa-mobile-alt` in the whole
      bundle), the `{:else if}` that mounts the pane, and two props. Most of the sixty lines are the
      note on `mobileAppAvailable`: upstream renders this tab with NO gate — the anomaly
      `mobile-app-decoded.md` §3 row 26 records, verified by reading the whole troubleshooter
      component rather than by pattern — and gating it here is a deliberate decision, because a room
      with no app would otherwise show a tab whose only button answers 409 every time.
    */
    /*
      6275 -> 6284, 2026-08-29, for `edit-user-avatar-options` — and the raise is nine lines because
      the MENU is not in it. `AvatarOptionsMenu.svelte` holds the transcription, its const table and
      the two corrections it forced; what is left here is the gate, the mount and two derivations.

      The extraction was the size contract's doing and it was right twice over: the menu owns its own
      open state, so nothing in this file has to remember to close it, and the component is where a
      reader looking for `remove-profile-picture-btn` will now find it — beside the three items it
      shares a menu with, rather than beside an avatar it never belonged to.
    */
    /*
      DOWN 95 on 2026-08-29, by the Admin Notes list. That feature ADDED to this file — a prop, a
      pane, and a load on the notes tab — and the ratchet had three lines of headroom left, which is
      exactly the situation its own instruction is written for. Two slices left instead:
      `UserNotesPane.svelte`, which is the tab it was adding, and `FollowChatStylePane.svelte`, the
      128-line follow-chat editor that was the largest block of this modal nothing else in it read.
      The second was chosen by measuring free identifiers across candidate slices rather than by
      taking the first one that looked separable — it had five, and four of them were handlers.
    */
    /*
      LOWERED 6,189 -> 5,999 on 2026-08-30. The A/V device pane left, and the ratchet asked for it by
      name: `AvDevicePane.svelte` is 266 lines of markup, six controls and one `loadDevices` that
      nothing else in this file touched. It came out because the fix it carries needed lines here,
      and that is the trade this entry exists to force.
    */
    /*
      6,999 -> 6,006 on 2026-08-30 — seven lines for one prop, one mount and one import, carrying
      five controls the reference has and this room did not.

      Recorded as a raise and flagged for the owner, and worth reading beside the two entries above:
      this file entered the day at 6,189 and leaves it at 6,005, because the A/V pane and the report
      of what it cost went out. The ratchet took 190 lines and gave 7 back for a feature.
    */
    /*
      6,006 -> 6,014, 2026-08-30. An `{#if isPresenter && !isLimitedPresenter}` around the group chat
      radios and the six lines saying why — a gate the reference has (byte 2,288,249) that this file
      rendered without, so every member saw three radios whose only possible effect was a 403.
      Eight lines to stop a room's authority rules looking arbitrary.
    */
    /*
      6,014 -> 6,022, 2026-08-30. Eight lines: `{#if isPresenter}` around the three presenter actions
      in the settings modal — `O(135, isPresenter ? 135 : -1)` at byte 2,285,714, which this file
      rendered without, so every member was shown "Mute Microphone for all non-admins" and
      "Get my token". The fourth button in that div stays outside the gate, as the reference has it.
    */
    /*
      6022 -> 6107, 2026-08-30, and the markup SHRANK by eight lines while the file grew by
      eighty-five. That ratio is the change.

      The presenter's two colour pickers had a Save button writing `onPreferenceChange(
      'presenterStyle', ...)` — a key in this presenter's own settings blob, read by nothing, in a
      store no other viewer can see — under a heading reading *"These colors will affect how ALL
      USERS see your messages and alerts"*. Reset assigned two constants and sent nothing. Both
      buttons are now one-line `onclick={handler}` against real commands; what was added is the two
      handlers, the refusal dialog they surface, the seed inside the existing settings effect, and
      the prose recording what each of those replaced.

      If this number climbs again, the settings modal is still the extraction — it is the largest
      contiguous region left in this file and its state is almost entirely its own.
    */
    /*
      6107 -> 6129, 2026-08-30, and the CONTROLS shrank while the file grew — the second time today.

      The Stream Player pane's two buttons flipped a local flag and wrote a preference key nothing
      read. They are `disabled` now, with the reason on the screen beneath them, because the feature
      cannot be built from anything held here: the reference gets both the state and the link from
      ITS server (`invokeAdminCmd("streamStatus")` -> `rc.enablePlayer` / `rc.playerURL`, byte
      2,170,505), and what it serves is a public page rendering one room's screenshares to whoever
      holds a link — an anonymous media grant nobody has designed.

      So twenty-two of these lines are the argument for NOT building it, sitting where the next
      person will look for it. That is the trade this ratchet's header describes: an extraction
      invented to satisfy a number would move the paragraph away from the code it explains.
    */
    /*
      6129 -> 6218, 2026-08-30. The advanced search's results became MESSAGES.

      They were `<p>{result.body}</p>` — escaped plain text with no sender, no timestamp, no day
      separator and, the part `SRCH-01` names, no trade highlighting and no click-to-copy, so an
      order found by searching could not be copied from the place it was found. They render
      `RoomMessage` now, as the reference does (`app-st-message`, byte 2,421,116).

      Two of the additions are the reason rather than the markup: why `showMenu={false}` is a
      recorded DIVERGENCE (this modal has no route to the message-action command, so a full kebab
      would be twelve entries that cannot act), and why the action handler refuses everything but
      `copy-trade` even though nothing can currently emit anything else — it fails closed against a
      later change that draws more controls.
    */
    /*
      6218 -> 6229, 2026-08-30. `alertLabels` taken and handed to `PostAlertModal`. The picker itself
      is in that component; what is here is the prop and why the parse happens on the page.
    */
    /*
      6229 -> 6334, 2026-08-30. The Session History pane — `SC-01`, and it was the emptiest kind of
      empty: `No session history.` rendered unconditionally above a `Load History` button with **no
      `onclick` at all**. Not a handler that did nothing; no handler.

      Both of upstream's branches now (`EDe` and `DDe`), decoded with `app-session-control-modal`'s
      own consts table, plus the three pieces of state, the loader, and a failure path the reference
      does not have — its `i && i.data && (globals.sessionHistory = i.data)` leaves the pane
      untouched when the call fails, so a Refresh on a broken connection looks like a Refresh with
      nothing to show.

      Roughly forty of these lines are prose, and two paragraphs of it are load-bearing: why the
      `<a>` keeps no `href` (all three alternatives are worse, and the element is inert upstream
      too), and why nothing fetches on open (the `Load History` button only makes sense if the pane
      starts empty).

      If this climbs again the session-control modal is still the extraction — it is now seven panes
      in one file, and this one owns three `$state` locals and a function that nothing else reads.
    */
    /*
      6,334 -> 6,335, 2026-08-30. One line: `onconfirm={onConfirm}` on `PostAlertModal`, so PAM-11's
      confirm reaches the scheduler pane through the callback `PollPanel` next door already uses.
    */
    /*
      6,335 -> 6,356, 2026-08-30, for USM-12 and USM-18. Twenty lines, nineteen of them the reason:
      three defects in one Recording Preview checkbox (persisting nothing, read by nothing, drawn
      for everyone), and why USM-18's `defaultImagePreview` conjunct is refused rather than missed.

      This file ALREADY paid for today's work twice over: `RestreamPane.svelte` and
      `SessionHistoryPane.svelte` took 225 lines out of it earlier in the day, against a ceiling
      that has not moved since. A third extraction to absorb twenty lines of citation would be
      churn, and the rule this file states about itself is that prose is never trimmed to fit.
    */
    /*
      6,356 -> 6,390, 2026-08-30, for USM-11's checkbox: the control, its `on`/`off` pair, and a
      six-line pointer at `#lib/room/note-update-notice.ts`, which is where the frame, both byte
      offsets and both refusals now live.

      Two extractions have already come out of this file today — `RestreamPane.svelte` and
      `SessionHistoryPane.svelte`, 225 lines — and its reasoning left with the behaviour here rather
      than sitting beside the markup. What is left is a checkbox.
    */
    /*
      6,390 -> 6,442, 2026-08-30, for USM-08 / USM-09 / USM-10: the Alert tab's QA Reactions Sound
      box with its fifteen-line citation, the three mapping rows, and the call to the pane that took
      the other two boxes.

      THREE extractions have now come out of this file today — `RestreamPane.svelte`,
      `SessionHistoryPane.svelte` and `ReactionPrefsPane.svelte`, 324 lines between them — against a
      ceiling that has risen 107 in total. The trade this file asks for is being made.
    */
    /*
      6,442 -> 6,482, 2026-08-30, for CONN-02 / CONN-03 / CONN-04. Forty lines, thirty-six of them
      the reason: the three gates are small and the WHY is not — the reference withholds two of
      three tabs from a member, and our own `mobileAppAvailable` divergence then leaves one with no
      tab at all, which needed answering rather than shipping as an empty modal.

      THE NEXT EXTRACTION FROM THIS FILE IS THE CONNECTIVITY MODAL, and it is named here rather than
      left for somebody to rediscover. It is ~250 self-contained lines — the tab strip, the WebRTC
      test, the mic test and its playback — with four CONN rows still open against it, so the next
      one lands in a component instead of here. It was not done in this commit because it is a large
      move with live media state in it and this commit was already three gates and a contract; doing
      both would have made one reviewable change into two unreviewable ones.

      Today's record so far: three components out (`RestreamPane`, `SessionHistoryPane`,
      `ReactionPrefsPane`, 324 lines) against a ceiling risen 147.
    */
    /*
      6,482 -> 6,868, 2026-08-30, for the nine UIM rows and the eleven RPT/SRCH rows of
      `docs/decoded/room-surface-audit-2026-08-30.md`. **+365, and it is the largest raise this entry
      has ever taken**, so it gets the longest argument.

      ## What the 365 actually is

      Almost none of it is behaviour. The whole functional change across nine audit rows is about
      forty lines: three class strings, one gate widened from one term to three, one handler that now
      also persists, one tab rewired to a door it already had, one `{#if}` around a footer button,
      one `catch`, one `{const}`, and two literals replaced by props. Every other line is the WHY,
      and this repository's standard says in as many words never to shorten those to look tidy.

      Four of those WHYs are long because the row was WRONG in an instructive way and the correction
      is the useful artefact:

        * UIM-08 — the audit says `user.isP` "has no counterpart in apps/room/src". It has one, and
          the mapping was already written down in `private-chat.svelte.ts`. Recording where, so the
          next reader does not re-derive it.
        * UIM-06 — the reference's Admin Notes TAB does call `manageAdminNotes()`, which a comment in
          `admin-notes.ts` had asserted it does not. The decoded template is at the code now.
        * UIM-13 — two comments cited a byte offset 2,123 bytes away from the function they
          transcribed. The correction has to say what IS at the wrong address or it reads as churn.
        * UIM-11/12 — two icon values that were making each other worse, which is one explanation and
          not two.

      ## What was extracted to pay for it, and why it is a real extraction

      `AlertSendReportModal.svelte` — 164 lines — takes the whole Alert Sent Report surface out.
      That is not a slice chosen to make a number: six of the eleven RPT rows are ONE measured
      refusal (no table in this product records a per-recipient delivery, nothing sends an alert to
      anyone, `getAlertReport` has no server half), and the argument for it is longer than the markup
      it governs. An argument that long about one surface is a document. This entry's own rule for
      that situation — written five paragraphs up, on the day the page's ceiling stopped moving — is
      "moving an explanation to the code it explains is the extraction itself".

      Without it this ceiling would be 6,969 rather than 6,868.

      ## The connectivity modal is still the next extraction, and it is still not this commit's

      Named above, ~250 lines, four CONN rows open against it. It stays named rather than done for
      the same reason it was last time and one more: this commit already carries twenty audit rows,
      two contract files, a component extraction and a SHIP-STOPPER fix (a `$state` initializer
      reading a `$derived` declared two hundred lines below it, which made the room answer 500 on
      every render — see `state-initializer-order-contract.test.ts`). Adding a move with live media
      state to that is how one reviewable change becomes none.
    */
    /*
      6869 -> 6888, 2026-08-31. `QAM-05`/`QAM-06`: three props declared and forwarded. `canPostImages`
      is PASSED rather than derived from the `isPresenter` this file computes, because
      `sessData.userUploads` is the other half of it and this component is not given that — a second
      answer to "may this viewer upload" is the shape `CLAUDE.md` refuses.
    */
    /*
      6888 -> 6918, 2026-08-31. `QAM-10`/`QAM-11`: two fields on the `targetMessage` shape and one
      dispatch prop, with the note that `chatGif` and `copyTrades` are deliberately NOT props beside
      it — both are already on `messageChrome`, which this component receives, and reading them from
      there is what stops the Q&A header disagreeing with every other body in the room.
    */
    /*
      6918 -> 6857, 2026-08-31 (`RPL-01`…`RPL-03`), and it FELL because the ceiling refused the
      growth first. The three defects added 79 lines and landed at 6,997; `app-reply-modal` then left
      for `ReplyModal.svelte` — 94 lines of markup and four functions — which is a natural seam and
      the same one `AlertQaModal`, `CloseSessionPane` and `LogArchiveModals` were taken along.

      Upstream it IS a component: `selectors:[["app-reply-modal"]]` at byte 2,324,180, 23 declarations
      and 4 variables. It owns one composer and one picker and reads nothing this host reads, so the
      only thing that stayed is the call — which modal is showing is this file's one job.
    */
    /*
      LOWERED 6857 -> 6069 on 2026-09-01, and THE EXTRACTION NAMED TWICE ABOVE IS THE ONE THAT DID IT.

      The growth was fourteen lines: consts 52 and 90 both carry `data-bs-toggle="modal"` and
      `data-bs-target="#all-user-pm-modal"`, and the "Show private messages" button carried neither.
      Fourteen lines is exactly the size at which the tempting move is to raise the number by
      fourteen, which is how a ratchet becomes advisory.

      So the connectivity modal finally left, whole — 809 lines into
      `lib/components/ConnectivityModal.svelte`: the tab strip, the WebRTC test, the mic test, the
      recorder, its playback, and the `$effect` that tears all of it down. Two entries above say
      "THE NEXT EXTRACTION FROM THIS FILE IS THE CONNECTIVITY MODAL" and both defer it with the same
      reason — a large move with live media state, in a commit already carrying several gates. That
      reason had been spent twice. Third time it was the only thing left to spend.

      One line came out with it that was NOT part of the move and is worth naming: `onMount` returned
      `() => cleanupMicTest()`. That teardown is now the child's effect cleanup, which fires on close
      AND on unmount — strictly more than the line covered — so it was deleted rather than forwarded.
      A second teardown for state this file no longer holds is a call that can only ever be wrong.
    */
    max: 6069,
    /*
      5980 -> 5995, 2026-08-29. The notes tab's password panel is now GATED — `{#if !canManageNotes}`,
      upstream's own `pTe` branch — plus the prop and two notes recording why only half of upstream's
      gate exists here: `fTe`, the member's own notes with a delete per row, needs a member column
      that `notes` does not have.

      Not extracted, and the reason is honest rather than an excuse: pulling a four-line `{#if}` into
      a component to dodge fifteen lines would add an indirection nobody asked for while leaving
      5,980 lines behind it.
    */
    why: 'every modal in the room, in one component'
  },
  {
    file: 'routes/+page.server.ts',
    /*
      1584 -> 1589, 2026-08-28. Five lines: `chatSoundForEmailHashes` on the returned object and the
      four-line docblock saying why it is hashes and never addresses.

      A LOAD KEY IS THE RIGHT PLACE FOR THAT SENTENCE. This file is the list of everything the room
      is handed, and the one thing a reader should learn about this entry is that the setting behind
      it — a list of member email ADDRESSES — deliberately does not cross at all. Four lines here
      buy that; a reader who has to follow two files to find out is a reader who will not.
    */
    /*
      1589 -> 1601, 2026-08-28. Eleven lines, and ten of them are a comment on one array.

      `loadQuestionsForAlerts` used to be handed `alertRows` alone. `askQuestion` accepts a NEGATIVE
      alert id — it resolves the captured fixture and writes a real question row, deliberately, with
      its own comment saying so — so a captured alert can have questions and none of them were ever
      in that list. A member asked, was told nothing, and watched the thread go on saying "There are
      no questions."

      The fix is two spread elements. The paragraph beside them is what stops the fixture half being
      dropped again by somebody tidying a list that looks redundant, which is exactly how it was
      absent in the first place.
    */
    /*
      1601 -> 1617, 2026-08-28, for `chatTabsWithBadges`: the per-member channel resolution and the
      `chatTabs` key that carries its answer to the browser.

      SIXTEEN LINES, and the paragraph is most of them because the thing it prevents is silent. The
      channel list used to be a constant, and reading a constant here would have put a badge
      channel's messages into every member's page payload with the client filtering them out for
      display — which is not a filter. That sentence has to sit at the read, because the read is what
      somebody would "simplify" back.

      The `chatTabs` key's own docblock was trimmed to one line in the same pass, deliberately: it
      was restating `#lib/chat-tabs.ts`, and two places recording one fact is how one of them goes
      stale. What stayed is what is true HERE and nowhere else.
    */
    /*
      1617 -> 1642, 2026-08-30. The room's presenter-colour map, read from `presenter_colors` and
      handed to the browser keyed by sender hash — one query and its import, plus the paragraph
      recording why it is a table rather than the reference's JSON blob and what bounds it. Room
      state, sitting with `chatMode` and `closedMessage`, which is the shape it belongs to.
    */
    /*
      1642 -> 1680, 2026-08-30. The all-rooms welcome mat's branch —
      `note-editor-welcome-mat-all-rooms-password`.

      This entry's own earlier paragraph is why the file grew: the action carried a recorded HONEST
      GAP saying the all-rooms variant "needs a controller endpoint that enumerates the account's
      rooms and verifies `allRoomsWelcomeMatPW`". That endpoint exists now, so the gap paragraph is
      replaced by the branch it described — and by the argument that the authority is the SERVER's,
      which the reference's client-side compare is not.
    */
    /*
      1,680 -> 1,709, 2026-08-30, for USM-11: `saveSessionNote` publishes `updatedSessionNote` now,
      with the twenty-line citation that says why the frame carries the note's NAME and not its
      content.

      That paragraph earns its place: this is a server file, the rule it is applying (per-ROOM
      stream, per-CHANNEL content) is the one `message-mutation-frames.ts` exists for, and the next
      person to add a field to this frame needs to meet it here rather than three files away.
    */
    /*
      1,709 -> 1,005, 2026-08-30. SEVEN HUNDRED AND FOUR LINES LEFT, which is the largest fall this
      entry has recorded and the one this ratchet exists to make permanent.

      `TODO.md` row AG: the last seventeen form actions became remote functions in one change — the
      six session notes for `session-notes.remote.ts`, the five polls for `polls.remote.ts`, the
      three Swing and three Day Trade mutations for `swing-alerts.remote.ts` and
      `day-trade-alerts.remote.ts`. Four helpers went with them (`refuseSwingAlert`,
      `refuseDayTradeAlert` and the two field readers), along with every import only they used —
      `fail` among them, because there is no longer an action in this file that can return one.

      `logout` is all that is left of `export const actions`, and this file is now a LOAD plus one
      redirect. The `why` below says so.
    */
    /*
      1,005 -> 1,003, 2026-08-30. DOWN, and by a deletion rather than a move.

      The `logout` action went: `routes/logout/+page.svelte` posts a form with no `action`, so it
      reached its own route's `default` all along, and this one could not be invoked at all. Its
      nine lines left; a note recording where it went, and where every action converted the same day
      went, stayed. `remote-call-sites-contract.test.ts` asserts this file exports NO actions now,
      which is a stronger statement than the list it used to pin.
    */
    /*
      RAISED 1,003 -> 1,018 on 2026-09-01. One `load` key and its paragraph: `roomMedia`, read from
      `#lib/server/room-media-state.js` so a member joining mid-play gets what the room is watching.

      The reference replays from server state on CONNECT (bytes 1,967,330 and 1,965,054) rather than
      from a broadcast, because a broadcast only reaches whoever was already there — which is the
      whole defect. This file is the connect, so this is where the read belongs; everything else about
      it, including the gate that decides whether to SHOW it, is elsewhere.
    */
    max: 1018,
    why: 'the loader, plus `logout`; 3,233 before the remote-function conversions began'
  },
  /*
    THE ROOM MODULES, capped from 2026-08-16 — and the reason they are here is that the three
    entries above are only half a guarantee.

    Those three stop the outgrown files growing. Nothing stopped the 9,605 lines being "solved" by
    moving the mass one directory over into `lib/room/`, which is precisely what the decomposition
    that follows this commit spends nineteen slices doing. A ceiling on the source and none on the
    destination is not a ratchet, it is a funnel.

    THESE ENTRIES MEAN SOMETHING DIFFERENT FROM THE THREE ABOVE, and conflating the two is how this
    rule would end up being broken every second commit:

    * The three above are RATCHETS on files that outgrew the standard. Growth there is the disease,
      so their numbers only ever fall.
    * These are CAPS on files that exist to receive an extraction. Growth here is the treatment.
      `alerts`, `chat`, `log-pages`, `roster` and `media` are all named destinations in the phase
      plan, so each will legitimately rise once, in the commit that moves code into it, with that
      commit saying what arrived. That is the conversation the rule asks for, held where it belongs
      rather than as a standing exemption.

    The distinction is the one this file already draws in the `+page.svelte` note: compacting a
    comment to hit a number is the tail wagging the dog, but moving an explanation to the code it
    explains IS the extraction. A raise here is the second thing. A raise that is not paired with an
    arrival is the first, and the commit will not have anything to say.

    The staleness half still applies to every one of them, which is what keeps a cap from being a
    licence: extract a slice back out of a module and its number must come down with it.
  */
  {
    file: 'lib/room/alerts.svelte.ts',
    /*
      +6, 2026-08-23, owner-approved: `passesFilter`'s parameter narrowed from `AlertRow` to the one
      field it reads, plus the note saying why.

      The predicate now runs over rows the DATABASE returned, which are a narrower shape with no
      `senderName`. A parameter wider than the body needs makes a predicate unusable on any row that
      omits a field it never looks at — and the alternative was a second copy of the rule.
    */
    /*
      320 -> 339, 2026-08-30. `#inlineEntry` is seeded and persisted rather than ephemeral: a
      presenter who opened the inline alert box got it closed again on the next reload. The addition
      is mostly the note recording that upstream persists to localStorage only and this room uses the
      same store every other room preference uses.
    */
    max: 339,
    why: "the alerts pane's toolbar, viewer filter, archive cut-off and search term"
  },
  {
    file: 'lib/room/arrivals.ts',
    max: 155,
    why: 'which rows in a wholesale-replaced list are new; a plain .ts on purpose'
  },
  {
    file: 'lib/room/chat-search.svelte.ts',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE.

      `doChatLogSearch`'s two boxes. It arrived inside `RoomChat` and took that file from 260 to 397,
      which is what asked for this extraction rather than a raise — and the split is real rather than
      cosmetic: `RoomChat` is about which channel each column shows and what is typed in each
      composer, and a search box is a third thing with its own rule about when it ends.

      Most of the file is that rule and the two divergences it carries — `showChatToolbarExtended` is
      not held because the controls it would gate are not built, and closing the bar ENDS the search
      where upstream leaves a hidden bar filtering the log with nothing on screen saying so.
    */
    /*
      124 -> 178, 2026-08-30, for `acA-04`.

      This entry used to say the file's divergences included "`showChatToolbarExtended` is not held
      because the controls it would gate are not built". That was correct on 2026-08-29 and stopped
      being correct the moment Mod Only was built, so the flag is held and both toggles are
      transcribed in full.

      Both are worth their lines. `toggleChatToolbarSearchOnly`'s `||` is easy to misread — when the
      bar is open AND extended the assignment is SKIPPED, so the magnifier COLLAPSES an extended bar
      rather than closing it — and `toggleChatToolbar` re-extends an open search-only bar. Neither
      reads as intentional without the transcription beside it.
    */
    /*
      178 -> 184, 2026-08-31. The same wrong sentence lived here too, in six words — `ACA-06`
      corrected both. This file names the controls and points at `ChatSearchBar.svelte` for the
      decode rather than carrying a second copy of it, which is the rule that had just been broken:
      two places stating one fact is how one of them goes stale.
    */
    max: 184,
    why: 'the two chat search boxes; the rows they return belong to RoomFeeds'
  },
  {
    file: 'lib/room/main-tab-refetch.ts',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE, which is what admits a module to this list.

      `FP-01` — `onMainTabChange`'s two refetches. Ten lines of rule and forty of why it is a class
      at all: an `$effect` reading `mainTab` runs once at mount with whatever tab the room opened on,
      and a refetch there fires a second load on top of the one that just delivered the page, for
      every viewer, on every navigation. Upstream cannot have that problem, because its version is a
      click handler.

      It also records why the reference's TWO commands collapse into one `invalidate('room:data')`
      here, which is not a simplification: this route has a single load and a caller trying to be
      narrower would be inventing a second source of truth for `data.files`.
    */
    max: 55,
    why: 'which main tabs refetch when opened, and the first-pass seed that stops a double load'
  },
  {
    file: 'lib/room/caption-staleness.ts',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE, which is what admits a module to this list.

      `PA-01` — `startSpeechChecker`, and the reason a caption that stops arriving stops being shown.
      A timestamp, a timer handle and two methods; the rest is the transcription, the note that the
      interval EQUALS the window (so a caption survives between 7 and 14 seconds of silence, which is
      upstream's shape and not a bug to improve on here), and the note that it stops itself so a
      silent room holds no timer at all.

      A plain `.ts`: nothing renders from it. It reports staleness through an injected callback to
      whoever owns the caption, which is the same decision-versus-effect split `arrivals.ts` records.
    */
    max: 100,
    why: 'the 7-second caption window; a plain .ts because the caption belongs to the page'
  },
  {
    file: 'lib/room/chat-tab-unread.ts',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE, which is what admits a module to this list.

      `acA-06`'s arithmetic, extracted out of `RoomChat` rather than raising that file by a further
      ninety. Three pure functions over a record of counts and the type they share: what a channel's
      counts are when a message arrives, what they are when the channel is opened, and what an absent
      key means.

      It is a plain `.ts` on purpose. Nothing here needs a rune — the state lives on `RoomChat` — and
      keeping the writers pure is what makes that field's `$state.raw` correct: every path returns a
      NEW object, which is much easier to see in eighty lines than inside a class of four hundred.
    */
    max: 90,
    why: 'the per-channel unread arithmetic; a plain .ts because the state lives on RoomChat'
  },
  {
    file: 'lib/room/chat.svelte.ts',
    /*
      179 -> 194 on 2026-08-28 for the off-topic SEED, and fourteen of the fifteen lines are why.

      The executable change is one statement in the constructor. What the rest records is that this
      is a SEED and not a lock — a VALUE rather than a thunk, read once exactly as `ngOnInit` reads
      it once, because a derivation would re-switch the member's column on every invalidate — and
      that the extra column's identical clause upstream is a no-op in both applications, since that
      column already defaults to off-topic. Without the second half somebody wires it twice.
    */
    /*
      194 -> 260, 2026-08-28 — the typing indicator. Two typist lists, two `amITyping` flags, `typingUpdated` and the two announce helpers. PER
      COLUMN, which is why there are two of each: the frame carries the channel it belongs to and
      the two columns can show different ones. Routing by channel rather than by column is what
      makes a frame land in BOTH when they happen to show the same one, without needing a rule.
    */
    /*
      RAISED 260 -> 283 on 2026-08-29, for `doChatLogSearch`, and argued here because the rule at the top of
      this file says a raise is a conversation. THE ARGUMENT IS ON `feeds.svelte.ts`, which took the
      security-relevant half of the change; this entry carries its part.
    */
    /*
      283 -> 388, 2026-08-30, for `acA-06` and `acA-04` — the two things a chat column knows that it
      did not: what you have not read in it, and whether you are filtering it.

      THE EXTRACTION THIS LIST ASKS FOR WAS DONE FIRST. The unread arithmetic — the type, the
      absent-is-zero lookup, the two writers — is `chat-tab-unread.ts`, its own module with its own
      ceiling, because a pure function over a record does not need a rune and because the ONE writer
      of a `$state.raw` field returning a new object every time is the property that makes the `raw`
      correct rather than merely cheap. What is left here is the state and the rules that read the
      two tabs: an arrival counts against whichever column is not showing that channel, and opening a
      channel clears it.

      `chatArrived`'s docblock is a third of the raise and it earns it: it records that upstream
      states `globals.isPresenter` TWICE — once at the count and once at the badge — and that this
      room states it once, at the count, so the strip cannot become a second authority on a role the
      server decided.
    */
    max: 388,
    why: 'the two chat columns and the mention routing that reads three of their fields at once'
  },
  {
    file: 'lib/room/log-pages.svelte.ts',
    /*
      173 -> 237, 2026-08-16, and 64 lines for one seven-line method is the ratio this repository is
      supposed to produce rather than apologise for.

      `releaseHistory` is `trimFat()`, transcribed. What it carries is the reason the bound is
      `chatLogPageSize` (50) and NOT the `trimLogSize` (300) that caps the chat log on arrival —
      two constants, two mechanisms, and the obvious guess wrong by 250 rows — plus why clearing the
      held pages IS upstream's splice given this room's two-lifetime split, and why the
      `currPage > 0` guard is load-bearing rather than defensive.

      None of that is recoverable from seven lines of code, and it is the whole value of the change.
    */
    max: 237,
    why: 'older-page paging for both logs, one keyed class at two arities; and the trimFat release'
  },
  {
    file: 'lib/room/media.svelte.ts',
    /*
      +15, slice 27: the ICE-servers note. It was one of four docblocks found ORPHANED on
      `+page.svelte` — left behind by an earlier slice that took the declaration and not the
      explanation, so it had come to rest above an unrelated statement where it read as a note about
      something else. This is the "arrival" case the block above names: what grew is prose that
      belongs to `iceServers`, and the page shed the same lines.

      +8, 2026-08-17, and it is the SAME case a second time on the same file — which is the finding,
      not the number. The `[ REC ]` badge's docblock was stranded on `+page.svelte` when the four
      `roomState` fields moved into this class: the fields travelled and the sentence recording WHY
      the badge must follow the server rather than the local `MediaRecorder` flag — a member never
      saw it while a presenter recorded — did not. It now sits on the field group it describes.

      Twice on one file is what turned a per-slice habit into a gate. `orphaned-comment-contract`
      could not see either of these when they happened; it now polices any block comment citing a
      `#lib/room/…` module, which is the form both of them took. Seven were adrift in the page when
      that half was switched on.
    */
    /*
      394 -> 413, 2026-09-01. `presenterTalking` — one `$state`, a getter, a setter, and the docblock
      recording that FALSE is the reference's own initialiser (bytes 1,114,654 and 1,129,852), which
      is the fact that retired this room's refusal to build the branch. It belongs beside
      `talkingUsers` because the whole point of the measurement is that the two are different signals.
    */
    max: 413,
    why: 'every media flag the interface renders from; STATE, never transport'
  },
  {
    file: 'lib/room/menus.svelte.ts',
    /*
      187 -> 219, 2026-08-29, for the two dropdowns that could not be opened.

      `data-bs-toggle="dropdown"` is Bootstrap's whole mechanism and this app ships no Bootstrap
      JavaScript, so `.dropdown-menu { display: none }` never lifted on the presentation area's
      volume menu or the streaming view's buffer menu. Seventeen other dropdowns had already been
      hand-driven from `RoomMenus`; these two were the two that were missed, and one of them hid
      three `setBufferSize` handlers that a repair the day before had made callable without
      noticing nothing could reach them.

      Here it is two flags, their getters, two `set` branches and two lines in each closer — the closers being exactly why these live on this class rather than as private `$state` in two components.

      The prose that would otherwise have landed here was moved into
      `bootstrap-dropdown-contract.test.ts` — which is the extraction, and which now fails if a
      nineteenth dropdown arrives without a way to open it.
    */
    max: 219,
    why: 'the thirteen floating menus and the two closers that deliberately differ'
  },
  {
    file: 'lib/room/derived-return-probe.svelte.ts',
    max: 30,
    why: 'a PROBE: what a caller gets when a $derived is returned by value, by getter and by thunk'
  },
  {
    file: 'lib/room/user-notes.svelte.ts',
    /*
      The per-member admin notes list: `$state.raw` because every mutation returns the whole list
      from the server and it is assigned wholesale, exactly as upstream does with
      `user.notes = resp.notes`. Two dialogs, three async calls, and one deliberate divergence -
      deletion addresses a note by its own id, not by the ordinal upstream sends.
    */
    max: 203,
    why: 'the per-member admin notes list, its two prompts and its three calls'
  },
  {
    file: 'lib/room/admin-notes.ts',
    /*
      The composition of the door and the list, and it is a third class because both alternatives
      were written and both were refused by this gate: `RoomUserActions` wiring the pair cost it 23
      lines, and `RoomNotesAccess` owning the list cost that file 56. A file at its ceiling is a file
      where the next paragraph of wiring does not belong.
    */
    /*
      83 -> 111, 2026-08-30, UIM-06. Twenty-eight lines, ALL of them comment, and no code changed in
      this file at all.

      What they replace is a factual claim about the reference that was false: *"clicking a tab must
      not raise a password prompt — upstream's tab does not"*. Upstream's tab does. `J2e` at bundle
      byte 2,059,391 gives const 56 — the Admin Notes anchor, the only one of the three with a click
      binding — the handler `manageAdminNotes()`. The claim had never been checked against the bytes,
      and it is the reason the notes tab in this room switched panes and did nothing else.

      The correction QUOTES the old sentence rather than deleting it, which is most of the twenty-
      eight lines. A wrong claim silently removed is a wrong claim the next reader re-derives from
      the same plausible reasoning — and the reasoning WAS plausible: a dialog nobody asked for is
      worse than an empty panel. The original answered that differently (it prompts only when a
      password is configured), and saying so is what stops this being reverted.

      Nothing to extract: there is no code here to move, and moving a comment out of the class it
      describes would be the opposite of what this ratchet asks for.
    */
    max: 111,
    why: 'the Admin Notes feature - the door, the list, and the rule that the grant loads'
  },
  {
    file: 'lib/room/user-notes-port.ts',
    /*
      The four remote calls the Admin Notes tab makes, in one frozen object, so `RoomUserNotes` knows
      nothing about the wire and the composition root names the feature once.
    */
    max: 31,
    why: 'the Admin Notes wire - four remote functions adapted to positional arguments'
  },
  {
    file: 'lib/room/chat-archive.svelte.ts',
    /*
      The chat archive client-side: upstream's confirm strings verbatim, its `isNaN` guard, and
      `$state.raw` because every mutation answers with the server's whole list.
    */
    max: 183,
    why: 'the chat archive - three calls, four dialogs, and the list they replace'
  },
  {
    file: 'lib/room/chat-archive-log.svelte.ts',
    /*
      The log VIEWER's state — one archive, its messages, and the search over them. A second class
      rather than more of `RoomChatArchive` because that file sat at 182 against a ceiling of 183 and
      the instruction is to extract rather than raise; following it produced the better split, which
      is the usual outcome. It takes ONE function rather than a port object, because it makes one
      call and an object wrapping a single function is a layer whose only content is its own name.
    */
    max: 203,
    why: 'one archived log - open, back, the search over it, and the text Download Log writes'
  },
  {
    file: 'lib/room/chat-archive-port.ts',
    /* The three remote calls, adapted to positional arguments. Same shape as `user-notes-port.ts`. */
    max: 19,
    why: 'the chat archive wire - three remote functions'
  },
  {
    file: 'lib/room/recording-commands.ts',
    /*
      The four recording commands as a TABLE, lifted out of `events.svelte.ts`. It exists so the
      capture's own quirk — `resumeRec` plays the start sound behind the stop preference — sits in a
      row that visibly disagrees with its neighbours instead of being one word inside the fourth of
      four near-identical handlers.
    */
    max: 44,
    why: 'the four recording commands and the sound each plays, quirk included'
  },
  {
    file: 'lib/room/notes-access.svelte.ts',
    max: 141,
    why: "the notes-password door — upstream's `allowToManageNotes` and the two-call check that sets it"
  },
  {
    file: 'lib/room/polls.svelte.ts',
    /*
      119 -> 157, 2026-08-30, for `poll-02`, and the entry above says this file's argument lives in
      its TEST because the ceiling would not take it. That was the right call for the LATCH and it is
      the wrong call for this: the reason `#activeId` is a plain field while `#deliveredId` beside it
      is `$state`, and the reason the transition cannot be read off `#deliveredId`, are both facts
      about the two fields sitting three lines apart. A reader deleting one of them is looking at
      this file, not at the test.

      The rest is the verdict type. `'open' | 'ended' | null` replaces a boolean because "no poll" is
      TWO situations — a room that has never had one, and a poll that just ended under somebody's
      panel — and only the second may close anything.
    */
    max: 157,
    why: "the poll modal's four fields; the first of the room state classes"
  },
  {
    file: 'lib/room/stream-buffer.ts',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE.

      Sixty-nine lines for a clamp, a default and three names, and the ratio is the point: the
      executable part is six lines and the rest is why the clamp is stricter than the reference's own
      `|| 3`. The value reaches hls.js as a buffer length out of a JSON blob a member's row carries,
      so `"2"` and `7` are refused rather than coerced — a divergence, and one that is asserted in
      `stream-buffer.test.ts` so it cannot be quietly removed.

      If this number climbs, the question is whether hls.js CONFIGURATION has started arriving here.
      It should not: this module answers what level and what it is called, and `StreamingView` owns
      what a level does to a player.
    */
    max: 70,
    why: 'the three buffer levels, their names, and the clamp that is stricter than upstream'
  },
  {
    file: 'lib/room/room-defaults.ts',
    /*
      Created 2026-08-28 and capped in the same commit, at the size it landed.

      191 lines for three rules, one decision function and one loop — and the ratio is the point
      rather than an embarrassment. The executable part is under thirty lines; the rest is the
      transcription of the three clauses it reproduces, the argument for why a latch cannot be a
      derivation, and the two divergences: where this room stores a theme, and the settings-modal
      radio expression upstream gets wrong that we decline to reproduce.

      If this number climbs, the question to ask is whether a FOURTH room default arrived — that is
      growth this module is for, and it costs about four lines plus its evidence — or whether
      something that applies preferences generally has been folded in, which belongs with `RoomPrefs`
      instead. The one thing it must never grow into is a place that decides WHICH members get a
      default; that is the latch, and the latch is a fact about a member's own blob.
    */
    max: 191,
    why: 'the three room defaults, their latches, and the transcription that earns them'
  },
  {
    file: 'lib/room/refresh.svelte.ts',
    /*
      Created 2026-08-18 and capped in the same commit. The five-second `invalidate` poll, the two
      flags that gate it and the catch-up on the way back — one cohesive unit, because visibility is
      the only thing that writes either flag.

      It is a factory rather than a class for the reason the docs give: `appHasFocus` is read
      reactively so it is `$state`, while `missedChatWhileHidden` is a latch nothing renders from and
      the timer handle is a plain `let`.
    */
    /*
      114 -> 142, 2026-08-30. G16's divergence, and all twenty-eight lines are the record.

      Two reference behaviours are deliberately not reproduced — the 10 000 ms arming delay before
      `visibilitychange` is even listened for, and `unloadRoster()` on hide — and the row that raised
      it asked for exactly this: the SIBLING refusal (the 500 ms `alwaysShowRoster` timer) is
      recorded in a contract and this one was not, which is how a deliberate divergence reads as an
      oversight to the next comparison against the bundle.
    */
    max: 142,
    why: 'the freshness poll and the tab-visibility rules, executable at last'
  },
  {
    file: 'lib/room/roster.svelte.ts',
    /*
      +17, 2026-08-17, and it is the "arrival" case this file already records twice — prose moving
      IN while the page sheds it. `+page.svelte`'s `getRandomUser` carried forty lines transcribing
      the draw, and `roster.svelte.ts` already said the same things: the same JS quote, the same
      "both answers run the same code path", the same "No users to pick from." note. Verified phrase
      by phrase, then deleted from the page — which fell 19.

      What actually grew here is the ONE sentence that was not duplicated: that the three-second
      reveal is the POINT of the dialog rather than a loading state, quoted from the capture's
      `setTimeout(..., 3e3)`. It now sits beside `#revealTimer`, where somebody minded to "make it
      instant" will read it before deleting the feature.

      +4, 2026-08-23, with the owner's approval, and it is the SAME arrival case a third time. The
      four lines say why `#count` exists at all: before the `/roster/` channel wrote it the badge
      only ever showed the value baked in at page load, so a member joining or leaving never changed
      it for anyone else. They were found ORPHANED inside `RoomEventStream`'s constructor, stacked
      above an unrelated `$state` and describing nothing, and `events.svelte.ts` fell 903 -> 900 in
      the same commit that moved them here.
    */
    /*
      342 -> 362, 2026-08-30. G14 — the `simUserCount` clamp, and all twenty lines are the citation.

      Neither bound was applied here, and the LOWER one is the half that matters: a negative setting
      SUBTRACTED from a real roster, so a room of twelve could publish "7". The transcription itself
      is `#lib/sim-user-count.ts`, which carries the three details that would each be a real change
      if tidied — including that the reference never answers `NaN`, which is ours to answer.
    */
    max: 362,
    why: 'the live roster, its four header controls, the badge count and the random draw'
  },
  {
    file: 'lib/room/scroll-follow.ts',
    max: 117,
    why: 'one instance per column; a plain .ts on purpose'
  },
  {
    file: 'lib/room/split-legacy-migration.ts',
    /*
      Created 2026-08-17 and capped in the same commit. It exists as its OWN file because a guard
      said so: the first attempt put it in `split.svelte.ts`, and
      `extra-chat-column-contract.test.ts:366` refused it — "the class must have no way to write a
      preference", asserted as that file not containing `localStorage`. The guard is right;
      `RoomSplit` computes geometry and must not be able to reach storage.
    */
    max: 71,
    why: 'the one-time localStorage -> server promotion of split sizes, kept away from RoomSplit'
  },
  {
    file: 'lib/room/split.svelte.ts',
    /*
      +58, 2026-08-17: `storedSplitPair` and `promoteLegacySplitSizes` arrived from `+page.svelte`,
      with the reasoning that explains why the migration is a WRITE and never a read-back. They
      belong beside `splitStorageKeys` and `splitPairFromValue`, which they call and which define
      the key names and the shape being migrated — three functions describing one storage format.

      `RoomPrefs` was the alternative and is refused: it would have to learn what a split pair is
      and which two keys exist per direction, which is split geometry leaking into a preferences bag.

      Most of the 58 is prose. The functions themselves are 20 lines, and they are now EXECUTED by
      `split-legacy-migration.test.ts` — a migration that silently does nothing was previously
      indistinguishable from one that ran and found nothing to do.
    */
    /*
      782 -> 796, 2026-08-30, for `acA-08`'s arithmetic, which is fourteen lines because thirteen of
      them are why it exists at all.

      `as-split` treats `size` as a PROPORTION and normalises across however many areas there are;
      flex-basis percentages do not. The reference binds `chatSize` to both inner chat areas, so
      transcribing it verbatim would emit `alerts + chat + chat` and overflow the stack. `#innerScale`
      does the division `as-split` does for free, and a reader who does not know that reads the
      multiplication as noise and deletes it.
    */
    /*
      796 -> 809, 2026-08-31, for `SHL-06` — a citation that named the wrong function while quoting
      the right gate, which is the shape that survives review: the sentence is true and only the
      symbol is not, so a reader checking it finds it correct and moves on.

      `K4e` (2,493,526) and `nRe` (2,496,317) are both `as-split` wrappers with three
      `as-split-area` children, which is why they were confusable — and their third children are
      gated on different things: `O(3, e.hidePresentation ? -1 : 3)` against
      `O(3, !e.hideChatAlerts && preferences.extraChatColumn ? 3 : -1)`. The gate this paragraph
      quotes is the second one's.

      Corrected with BOTH offsets rather than by swapping three letters, so the next reader can see
      why the two were mistaken for each other. `extra-chat-column-contract.test.ts` asserts the
      correction and both bundle facts, because the other half of `SHL-06` lives in one of the 42
      excluded files and can guard nothing here.
    */
    max: 809,
    why: "the room's two nested splits and twenty derived geometry values"
  },
  /*
    Phase 5 slice 1, and the first module this file has ever demanded rather than recorded. The
    ceiling test went red the moment `toasts.svelte.ts` appeared on disk with no entry - which is
    the catalog working one commit after it was written, on the first module it could possibly have
    caught.
  */
  {
    file: 'lib/room/toasts.svelte.ts',
    max: 184,
    why: 'the toast queue, its timers, the duplicate guard and the browser notification'
  },
  {
    file: 'lib/room/dialogs.svelte.ts',
    /*
      RAISED 115 -> 174 on 2026-08-23, with the owner's explicit approval, for the alert's DISMISSAL
      CALLBACK. Recorded as a decision rather than edited quietly, because a raise is a conversation.

      What it bought: `forceReload` reloaded a member's page instantly, mid-sentence, with no
      disconnect and no warning. The reference does neither — byte 995901 is `case "forceReload":
      e.disconnect(), e.appEventBus.emit("forceReload")` and its subscriber at byte 2597102 is
      `bootbox.alert("You need to reload this page to continue", () => window.location.reload())`.
      The room could not express that at all: `alert` was a bare string and only `confirm` carried a
      handler, so the receiver had nowhere to put "and reload when they say so" and reloaded.

      EXTRACTION WAS THE FIRST ANSWER TRIED, and it is what unblocked the other two files in this
      change — `events.svelte.ts` came down 903 -> 900 by moving the join/leave announcement out.
      It is not available here. The file's own head argues that the three dialogs must stay ONE class
      because they STACK, and splitting the alert from its callback would separate two fields that
      have to be written together. A 174-line file that is one primitive has no seam to find.

      Roughly forty of the fifty-nine lines are prose, and none of it is padding: the four
      `bootbox.alert(text, callback)` receivers read end to end at bytes 2596600-2597200 (three
      reload, one re-authenticates — which is why the callback is a parameter rather than a disguised
      flag), why `confirm()` was refused (it renders a Cancel button the reference never gives), and
      the stale-callback trap that makes a plain assignment clear the field. That last one is
      negative-controlled: delete the line and an ordinary "Message Saved" reloads the room.
    */
    /*
      174 -> 197, 2026-08-30. RS-07 — four optional fields on `RoomConfirmation` and the citation for
      why a confirm needs button labels at all.

      They are OPTIONAL and default to OK/Cancel, because that is what `bootbox.confirm(message,
      callback)` renders and what every existing call site here relies on. A required field would
      have meant touching every one of them to say what they already said.

      The seam question above still has the same answer: this is one primitive, and the labels
      belong to the confirmation they label.
    */
    /*
      197 -> 210, 2026-09-01, for `ACA-06`'s SAVE control — the chat-log download, whose blocker
      named the reference's transport rather than this room's capability.

      `RoomPrompt` gains `options` and `message` — `bootbox.prompt({inputType: "radio", inputOptions})`.
      A field on the existing prompt rather than a fourth dialog kind, because that is bootbox's own
      shape: ONE prompt whose `inputType` selects the control.
    */
    max: 210,
    why: 'the three bootbox dialogs, which STACK and therefore stay three fields; the alert carries a dismissal'
  },
  {
    file: 'lib/room/volume.svelte.ts',
    max: 297,
    why: 'the master, background and per-presenter volumes; the first class to depend on another'
  },
  {
    file: 'lib/room/broadcasts.svelte.ts',
    /*
      +95, 2026-08-17: the SoundCloud trio arrived from `+page.svelte` — the last member of the
      room-wide "play for all" family still living on the page, beside `videoForAll`,
      `youtubeForAll` and the mp3 pair which were already methods here.

      Most of it is prose. What matters is that three handlers reachable by no test became five
      executed assertions: the capture's prefix check, the empty-prompt no-op, and the asymmetry
      between the two stop paths — `stopSoundCloud` broadcasts, `stopSoundCloudForMe` does not, and
      both keep the url so a presenter can resume.

      RECORDED INCONSISTENCY, not hidden: `soundCloudUrl`/`soundCloudPlaying` stay on `RoomMedia`
      and cross as receivers, while their siblings `videoPlayerUrl`/`youtubeForAllUrl` live here.
      Moving them ripples through `PresentationArea` and `RoomNavbar`, which is its own change.
    */
    /*
      445 -> 483, 2026-08-26 — `sendSalesImageToChat` / `sendUsersToURL`, the two receivers whose senders
      shipped on 2026-08-23. Two receiver methods plus the overlay's one-url state.

      Raised on the same grounds recorded at `lib/room/session-control.ts` in this file: the
      growth is the captured code and the reason the presenter is EXCLUDED from both frames
      (`isPresenter ||` is a guard, not a truthiness shorthand), which is the single most likely
      thing for a reader to "fix" into a bug. The prose was tightened twice before this number moved.
      The CODE backstop is unaffected.
    */
    /*
      RAISED 484 -> 517 on 2026-09-01, for the YouTube seek offset the late-join replay carries.

      One field, one getter, one extra parameter and two clears — and the rest is the reason. Two of
      those lines are the ones worth the entry: `youtubeStopped` and `closeYoutubeFrame` BOTH reset
      the offset, because the overlay rebuilds its embed from url and startTime together (byte
      1,503,095), so a stale offset seeks the NEXT video to wherever the last one had reached. That
      is a real wrong position rather than dead state.

      The derivation is NOT here: this store takes seconds from its caller and reads no clock, which
      `for-all-broadcast-contract` asserts on the METHOD body rather than the file —
      `scheduleVideoForAll` legitimately reads the clock to size its own timer.
    */
    /*
      517 -> 549, 2026-09-01, and the code SHRANK — `#scheduledVideoTimer` and its two teardowns are
      gone, because the schedule is a row now and `sweepDueVideos` fires it.

      What replaced them is the argument. `scheduleVideoForAll` posts the moment instead of arming a
      timer, and `clearScheduledVideoTimer` became `clearScheduledVideoLine` — renamed because a
      method named for a timer that no longer exists is the comment-that-lies this repository hunts,
      and kept because the pending line it clears is still real: it is what THIS presenter armed,
      shown back to them, and deliberately not a claim about room state.

      The behaviour the timer protected is not lost, it improved: a stop nulls `video_play_time`
      server-side, so it cancels an armed play for everyone — including a presenter whose browser is
      closed, which a local timer could never do.
    */
    max: 549,
    why: 'the video, YouTube and mp3 broadcasts; receivers rather than setters, so a stop cannot be half-applied'
  },
  {
    file: 'lib/room/prefs.svelte.ts',
    /*
      +31, slice 27: the three preference docblocks slice 3 left on the page when it took the forty
      declarations. The longest is the twelve-line note on `alwaysScrollToBottom` explaining why the
      comparison is `=== true` and not `!== false` — the preferences blob ships the flag OFF, so
      seeding it on would drag a reader out of the history they are scrolled up into. This class held
      the field and the comparison and did not hold the reason until now.
    */
    /*
      621 -> 635 on 2026-08-28, ARGUED rather than absorbed, for the first NUMERIC preference this
      class holds. `bufferSizeLevel` had to become real state here because `#loaded` is a plain
      object — reading the blob through `prefs.loaded` would never re-render the control that sets
      it, which is the trap `RoomGates.recordingTooltip` fell into with a different key.

      Fourteen lines: a field, a seeded `$state`, a getter, one save branch and the two comments
      saying why each is clamped. The RULE is not here — `stream-buffer.ts` owns the three levels,
      their names and why a blob value outside them is refused rather than coerced, with its own
      test — so what this file gained is a value, not a decision.
    */
    /*
      RAISED 635 -> 656 on 2026-08-30, for five preferences that could not be written.

      The four arrival preferences had a field, a seed and a getter here and no `save()` case, so a
      control writing one would have taken effect on the next reload rather than at once — the same
      half `recordingStartSound` was missing. `updatePositionsIframe` had no field at all and its
      default was inverted against the reference. Twenty-one lines: one field, one seed, one getter,
      five save cases, and the two paragraphs saying why the default moved.

      Flagged for the owner. The alternative was an extraction invented to satisfy a number, on a
      class whose whole shape is one field, one seed, one getter and one case per preference.
    */
    /*
      656 -> 685, 2026-08-30. `pmLogsOnRight` — G5, a preference this class did not hold at all while
      the settings modal wrote it and the panel could not read it.

      The docblock is most of the addition: it records that the key defaults FALSE where its
      neighbours default true, because `!== false` would have flipped every existing member's panel
      on the first load after this shipped.
    */
    /*
      685 -> 709, 2026-08-30, for USM-12's `recPreviewWindow`: a field, a seed, a boolean case, a
      getter, and the two docblocks that say what the preference is for and where it is read.

      The seed's note carries the byte offset of the reference's own default (979,890) because the
      polarity is the whole point — `!== false`, so an unset preference does not switch a presenter's
      preview off for them.
    */
    /*
      709 -> 725, 2026-08-30, for USM-11's `noteUpdatePopup`: field, seed, boolean case, getter and
      the note recording that the preference had no control, no consumer and no EVENT before today.
    */
    /*
      725 -> 759, 2026-08-30, for the three reaction preferences: three fields, three seeds sharing
      one docblock, three boolean cases and three getters. The seed note carries the two default
      objects' offsets because all three default ON, and an unset preference silencing a
      notification is the polarity that would be wrong in the expensive direction.
    */
    max: 759,
    why: 'every viewer preference and the one write path; 25 of 27 have no public setter'
  },
  {
    file: 'lib/room/files.svelte.ts',
    /*
      +5, 2026-08-16, and it is the `$lib` -> `#lib` migration rather than anything this module did.
      Kit 3's subpath imports require an explicit extension, so `$lib/file-sort` became
      `#lib/file-sort.js` — eleven characters longer, which pushed a four-name import statement past
      the print width and prettier wrapped it onto six lines. Zero code, zero comment: one import.
    */
    /*
      +14, 2026-08-17 (S2): the note on `#selectedFileIds` explaining that `$state.raw` turns the
      copy-on-write Set convention into a guarantee — raw state cannot be mutated, so the pattern is
      enforced by the rune instead of by everyone remembering it.
    */
    max: 401,
    why: 'the file drive; the first slice to collapse a prop list at TWO call sites rather than one'
  },
  {
    file: 'lib/room/screens.svelte.ts',
    /* +11, slice 27: the popout test note, orphaned on the page, now above `detachedScreenId`. */
    /*
      370 -> 396, 2026-08-29, and this raise BOUGHT A CONTROL THAT WAS LYING.

      `stop()` answered "Stop This Screen" on somebody else's share by removing the presenter's own
      tab and returning, under a comment explaining that stopping their producer "is not ours to do".
      Every clause was true of the code and false of the control: the member kept broadcasting, every
      other viewer kept watching, and nothing reported it. The extra lines are the send, the owner
      lookup, and the correction kept in place beside them — see `forceStopScreen` in
      `presenter-commands.remote.ts` for the full argument and the byte offsets.
    */
    /*
      396 -> 478, 2026-08-30, for `SV-SP-02` and `SV-SP-08`.

      Most of it is one distinction that upstream's own naming hides. `isDetached` and
      `isDetachedCtrl` differ by four characters and mean opposite ends of the same gesture: the
      SOURCE window asking "have I sent this screen elsewhere?" and the POPOUT asking "am I a
      popout?". This class had only the second, so the source pane kept rendering the screen it had
      just detached — one producer feeding two live decoders, with no way back but closing the popout.

      `SV-SP-08`'s method is six lines and its docblock is the finding: the WRITE was never missing.
      `#selectedScreenTab` has held that value all along; what did not exist was a reader outside the
      component tree, which is why the row sits on this surface and its trigger is on the microphone
      one.
    */
    /*
      RAISED 478 -> 535 on 2026-09-01, for `SP2-04` — and it is a RAISE rather than an extraction,
      argued here as this entry's own history requires.

      The row is the local-preview invitation, `W0e`, and it was recorded as *"it cannot be reached
      in this application"*. That was a measurement of a CHOICE this room had made — `#addLocalScreen`
      attached our own capture eagerly, which is what made `isPresentingThisScreen && !localpreview`
      unreachable — read back as a property of the reference. Upstream's default is the invitation and
      the `<video>` stays empty until the presenter clicks. Same shape of error as `G08`'s refusal,
      found the same way: by reading every occurrence instead of trusting the note.

      ## Why not extract

      The feature is about forty lines spread over four files that are already the right four: the flag
      belongs with the other per-screen ids, the invitation belongs with the other status headings,
      the gate belongs with the other gates, and the wiring belongs at the call site. There is no
      slice here that is not one of those four things.

      What WAS extracted is the reasoning. The five readings of `localpreview`, the three writers of
      `isConnected` and every byte offset now live once, in `screen-pane-contract.test.ts`'s `SP2-04`
      block, which re-reads them against the pinned bundle on every run. They were written out four
      times in the first draft of this change; each site now carries the sentence its maintainer needs
      and points at the file that proves it. That is this entry's own rule — *moving an explanation to
      the code it explains is the extraction itself* — applied to a decode rather than to markup.
    */
    max: 535,
    why: 'the screen viewer; the transport keeps the list, this keeps the three ids that point into it'
  },
  {
    file: 'lib/room/message-actions.svelte.ts',
    /*
      474 -> 495, 2026-08-28, for the `copy-trade` handler and its citation.

      TWENTY-ONE LINES FOR SIX OF CODE, and most of the rest answers one question a reader will
      have: why this is not `copy` with a different argument. `copy` takes the WHOLE message; the
      whole point of an order marker is that a member gets the order and nothing else, and the
      TOAST differs for the same reason — "Copied to clipboard." would leave a member unsure which
      of the two they got.
    */
    /*
      495 -> 590, 2026-08-28, and it is the largest raise this entry has taken. Argued rather than
      applied, because the rule above says a raise is a conversation.

      WHAT THE NINETY-FOUR LINES ARE, and only about twenty-five are code:

        * two constructor dependencies for the Q&A thread's commands, with the docblock saying why
          they are separate from `sendOperation` — an `alert_questions` row is addressed by its own
          id, and `messageAction`'s `{ kind, id }` target has no third value that would mean
          "question";
        * two branches in the dispatcher, each with the citation for the divergence it makes: the
          reference sends the PARENT alert plus an ORDINAL, because its thread entries live inside
          the alert document and have no identity of their own, and an ordinal moves when a
          neighbour is deleted;
        * `#muteSenderFor24Hours`, which is `mute24` leaving `#runOperation` — it is the one
          operation that does not act on the row, and the `{ kind, id }` it was carrying was never
          read;
        * a guard on `#selectedMessage` and the paragraph explaining what it prevents, which is the
          most important thing in the diff: that field holds the ALERT whose thread is open, and
          `sendAlertQuestion` sends its id as the `alertId`. Overwriting it with the question that
          was clicked would have repointed the composer at a row in the wrong table.

      WHY NOT AN EXTRACTION. The alternative was a second dispatcher for the thread, and five of the
      seven actions a thread entry offers are the SAME act as in the log — they work on the sender or
      on the text. Two dispatchers would be five copies of a rule to keep in step, which is the
      failure this class was assembled to end. The `surface` parameter is the smaller change and its
      docblock says exactly which two branches read it.

      What paid for it, in the same commit: `ModalHost.svelte` drops 166 lines, and `RoomMessage`'s
      two unfed-prop exemptions are deleted rather than reworded.
    */
    /*
      590 -> 630, 2026-08-29, for the Q&A `edit` arm — and this raise BOUGHT A CONTROL THAT WAS NEVER
      DRAWN, which is a quieter defect than the ones the entries above paid for.

      `message-behavior.ts` suppressed `edit` inside the Q&A thread under the claim that it, like
      `showToAll` and `openAlertReport`, addresses `msg._id` — which a thread entry does not have.
      True of those two. False of `edit`: byte 1,351,806 branches to
      `editQAMessage {qaMsgID, msgIndex, newAlertMsg}`, which is the parent-plus-ordinal shape the
      same docblock cites for the controls that DO work. A suppressed menu item raises nothing, sends
      nothing, fails no test and leaves no `INERT_ACTIONS` row, so nothing here could have noticed.

      The arm is ~35 lines and half of it is that argument, plus the two things a reader will
      otherwise re-derive: why the title says "qa message" (it is the capture's own noun, from the
      same expression that says "alert") and why there is no optimistic `#patchEvidence` (a thread
      entry is never a fixture row — `askQuestion` writes a real one even for a captured alert).
    */
    /*
      630 -> 656, 2026-08-30. RM-19 — the paragraph recording that we deliberately do NOT reproduce
      `copyMessage`'s mutation.

      Twenty-six lines and all of them prose: upstream writes the stripped text back onto the
      MESSAGE before copying, so copying silently rewrites the one on screen. This is a place where
      matching the reference would mean reproducing a defect, and the next person comparing the two
      needs to find the reason rather than assume the line was missed.
    */
    /*
      656 -> 706, 2026-08-30. RM-20 — `doUserInfoExtra`, and fifty lines of which forty-two are why.

      `doUserInfo` emits a SECOND event whose only subscriber is the user modal, which stores it so
      that its own @Mention button can route to the extra column the same three-term way the
      message's kebab does. Both halves of that chain are quoted at the code, because the emit is at
      byte 1,352,030 and the subscriber is seven hundred kilobytes away at 2,074,524 — a reader who
      finds one and not the other will conclude the event goes nowhere, which is what a `grep` for
      `doUserInfoExtra` in our own source did conclude.

      The divergence is recorded there too: upstream emits ONLY when the extra column is involved, so
      a card opened from the main log with main focus emits nothing and the modal keeps the last
      extra-column answer. This records it on every open, which agrees in every case except that one.
    */
    /*
      LEVEL AT 706, 2026-08-30, and the ceiling does not move — which is the entry worth reading,
      because a feature landed and the number did not.

      `TODO.md` row AL had measured the `deleteAlertPW` door end to end and named ONE blocker:
      *"the client prompt costs about thirty lines in `message-actions.svelte.ts`, which is AT its
      ceiling… The blocker is therefore an extraction, not a design question. The candidates in that
      file are the delete branch's optimistic hide, its Q&A special case, and its confirm-copy
      ternary."*

      All three went, to `room/message-delete.ts`, and the prompt went with them. What stayed is
      `#runOperation` — a delete is still one of six operations sharing one wire call and one refusal
      path — plus a collaborator field, a constructor option and a six-line arm that forwards. The
      explanation moved with the code it explains, which is the distinction this file's own header
      draws between an extraction and a shorter comment.
    */
    /*
      706 -> 708, 2026-08-30, for RPT-08's entry-point guard — and the extraction came FIRST, which
      is the order this rule asks for rather than the number.

      Upstream refuses a report on a message with no id at the entry point:
      `openAlertSendReport(e){e?emit(…):bootbox.alert("No reports found.")}`. This file holds the
      only call to `#openModal('report')`, so the guard belongs here and nowhere else. It is four
      lines where there was one, plus one import.

      Paid for by sending the message-sender mapping to `room/modal-target.ts`: nine lines of object
      literal became one call, and the same commit took sixty-three lines off `user-actions.svelte.ts`
      for the same reason. That left this file two over rather than seventeen, and those two are the
      guard itself. A raise this size after an extraction that large is the honest record; shaving a
      comment to land on 706 would have been the dishonest one, and this file's header forbids it.
    */
    /*
      708 -> 857, 2026-08-31, for `QAM-05` and `QAM-06` — the Q&A thread's own image path, and the
      raise is one docblock plus six small methods.

      **The register's prescribed one-line fix was wrong and the docblock is where that is written
      down.** `QAM-05` proposed `onimageupload={() => composer.openImageUpload()}`, "the same path
      both chat composers already use". That path posts to CHAT. `doImggurUpload` on `app-alert-qa`
      (byte 2,338,987) ends in `sendAlertQAReply(qaMsg._id, …)` and then `modal("hide")`, so taking
      the prescription literally would have put a presenter's answer to one member's question into
      the room's public chat — the failure `RoomOverlays` already records for the swing form, with
      the worst blast radius of the five call sites.

      They live on THIS class because it already owns `sendAlertQuestion` and the selected alert;
      it borrows only the room's raw uploader, exactly as `RoomPrivateChat` and both trade-alert
      panes do. Three upstream details that read backwards are recorded with their offsets: the
      modal hides on the image path and NOT on the text one, the URL goes first with the message
      appended, and the box is cleared only when a message travels.
    */
    /*
      857 -> 874, 2026-08-31 (MSB-03). Seventeen lines, of which THREE are the handler: the image
      action now takes its url from the payload the click carries rather than from `item.targetUrl`.

      The reference writes each container's own url into its own handler
      (`onclick="openImageModal(event,'${a}')"`, byte 1,326,195) and this resolved one from the ROW
      instead — the alert's ATTACHMENT — so a click inside a chat message hit a false guard and did
      nothing, and a click inside an alert that also had an attachment opened the attachment rather
      than the picture. The second is the worse one: something opens, so it looks like it works.

      The rest is the note saying there is NO `item.targetUrl` fallback and why. Both call sites name
      the url they are showing, so a fallback could only ever fire for a caller that forgot to — and
      firing with the row's url is precisely the wrong-picture bug. Doing nothing is the honest
      response to a caller error here.
    */
    /*
      874 -> 786, 2026-08-31, and it FELL by 88 while gaining a whole feature.

      `RPL-01`…`RPL-03` needed the Q&A image path again for the reply modal. Written out, the second
      copy put this file at 1,025 — and the two blocks differed in exactly one expression each. Both
      are `PendingImagePost` instances now (`room/image-post.svelte.ts`): the shared class holds the
      state, the object-URL discipline, the upload, the failure message and the composed body's
      order, and each instance is handed its own DESTINATION.

      That injection is the correctness argument, not the line count. `doImggurUpload` dispatches on
      a feature name deny-by-default and every site ends somewhere different; a shared handler is
      what mixes them, which is the mistake `QAM-05`'s prescribed fix would have made.
    */
    max: 786,
    why: 'what a click on a message can do; four optimistic paths, one refusal, one undo each'
  },
  {
    file: 'lib/room/modal-target.ts',
    /*
      Created 2026-08-30 and capped in the same commit, at the size it actually landed.

      It is the two mappings that build a `ModalTargetUser` — one from a roster row, one from a
      message's sender — which lived on `RoomUserActions` and `RoomMessageActions` and had already
      drifted apart once. `entitlement-shape-contract.test.ts` records what that cost: the second
      construction was missing all five permission fields, so every checkbox drew unchecked whatever
      the membership said, and Save then wrote `false` for each one it was not given.

      It landed at 143 with two mappings and grew to 178 in the same commit, because gathering those
      two let `entitlement-shape-contract.test.ts` ask a question it could not ask before — does
      either class still assemble one of these? — and the answer was a THIRD, `openManagedInfo`,
      building its own since long before either consolidation. The old assertion had searched for
      `nick: user.displayName`; that one writes `nick: user.nick`.

      Most of this file is that history and the reason each default is the value it is. The code is
      about sixty lines and should stay there: a FOURTH source is the thing this module exists to
      make obvious rather than to accommodate.
    */
    max: 178,
    why: 'how a roster row, a message and a managed-chat row each become the modal’s target'
  },
  {
    file: 'lib/room/message-delete.ts',
    /*
      Created 2026-08-30 and capped in the same commit, which is the habit the component block below
      exists to teach: a module cannot be added without saying what too big means for it.
    */
    max: 294,
    why: 'what it costs to delete one row: the confirmation, the password, the hide and its undo'
  },
  {
    file: 'lib/room/message-actions-port.ts',
    /*
      Created 2026-08-30, and it is what PAID for the row-AL door: the composition root had one line
      of headroom and this feature needed two. Six wires left `create-room.svelte.ts` so the seventh
      could arrive without a raise.
    */
    max: 65,
    why: 'the message menu wires, so the composition root holds none of them'
  },
  {
    file: 'lib/room/feeds.svelte.ts',
    /*
      +6, slice 27: the ALERTS tail note, which slice 9 wrote for the chat tail and never wrote for
      the alerts one — `visibleAlerts` had no explanation at all of why it merges rather than
      concatenates, which is the same two-lifetime split with an unbounded list behind it.

      +7 later the same day, when that "unbounded list" stopped being one. The header's "a
      performance finding this class does NOT fix" became a record of where the fix went and why it
      is not here: the bound belongs to whatever holds the pages, and this class only pays for them.
    */
    /*
      +14, 2026-08-17 (S2): the note on `#evidence` recording why it is `$state.raw`. It is the
      hottest read in this class — six chained passes call `#isHidden` and `#withEvidence` PER ROW
      and both index into it, so a proxied record cost a proxy hop per row per pass for a
      fine-grained update the code never performs.
    */
    /*
      +17, 2026-08-23, owner-approved: `alertSearchFilter`, and the note recording why it exists.

      A REGRESSION CAUGHT MID-CHANGE, which is what the lines buy. Moving the search to the database
      would silently have reopened the alert filter — `searchableAlerts` applied it and the server
      cannot, because `alertFilterFor` is the viewer's own selection and `senderEmailHash` is
      computed at read time rather than stored. A filtered-out trader's alerts would have come back
      in search results and nowhere else. `searchableAlerts` stays; the alerts PANE still reads it.
    */
    /*
      403 -> 463, 2026-08-29, for `doChatLogSearch` — and this raise bought a REFUSAL as much as a
      feature, which is why it is the one argued at length.

      Upstream's handler assigns search results straight to `globals.chatSearchResults` and renders
      that. It can afford to: it applies WEBINAR MODE as messages ARRIVE, dropping them before they
      reach a log, so results coming back from a server are simply outside that filter. This room
      applies webinar mode as a VIEW filter, because it re-reads its log from the server on every
      invalidate and a drop-on-arrival would be undone by the next load — a difference this file
      already recorded, for a different reason, before any of this.

      Feeding search results in AHEAD of that filter, which is the shape a faithful port takes, would
      therefore have handed a member in webinar mode every other member's messages: the exact thing
      the mode exists to hide, reachable by typing one letter into a box. So the results enter the
      pipeline where the merged log leaves it, and hidden rows, webinar mode, evidence and badges
      apply to both identically.

      Most of the 60 lines are that argument, on `chatMessagesFor`, plus the note on why `null` and
      `[]` are different — no search, versus a search that matched nothing. Collapsing those two
      would show a reader their whole log as the result of a search that found none of it.
    */
    /*
      463 -> 490, 2026-08-30, for `acA-04`'s predicate — one `.filter` and the transcription above it.

      Two survivors, not one: the moderators' messages AND your own (`a.uid === s.userXrefID ||
      r && a.isA`, byte 1,414,769). That reads like an oversight until you try it — a filter that hid
      what you had just typed looks like the send having failed — which is why the line saying so is
      here rather than in a commit message. The paragraph beside it records the divergence: this
      applies to search results too, which upstream cannot do because its toggle re-requests the log.
    */
    max: 490,
    why: 'what each pane renders, and the evidence overlay every pipeline consults'
  },
  {
    file: 'lib/room/composer.svelte.ts',
    /*
      +20, slice 27: the RTE gate's own docblock, found ORPHANED on `+page.svelte` and swept into
      `gates.ts` by the extraction before landing where it belongs. It is the longest of the
      four because it records a deliberate NARROWING — upstream opens the editor for a member who
      owns a rich message and then refuses their save, so fewer people reach the editor here and
      everyone who reaches it can finish. `chat-rte-gate-contract.test.ts` executes that claim.
    */
    /*
      573 -> 687, 2026-08-30, and it is the largest raise this entry has taken. The pasted-image
      state machine, of which roughly ninety lines are the transcription and the argument.

      Three of its behaviours are decisions rather than transcription and each has its paragraph:
      the composer is cleared BEFORE the upload awaits (so a draft typed during a slow upload
      survives) and only when a message actually travels (the reference's own `i && (…, val(""))`
      at byte 1,443,041); and a second paste while a confirmation is open revokes the first's object
      URL, without which every corrected mis-paste pins its bytes for the life of the tab.

      If this climbs again the extraction is the pasted-image trio — `beginImagePaste`,
      `cancelImagePaste`, `confirmImagePaste` and their two fields — which is already the shape
      `RoomTradeAlerts` uses for the same feature.
    */
    /*
      687 -> 689, 2026-08-30. `submission.labelPrefix` threaded into the two UPLOAD composers.

      Two lines, and they are the half of `PAM-01` that is easy to miss: these compose their body
      AFTER the modal has closed, so a picker whose state only reached the draft would prefix a typed
      alert and silently drop the labels from every alert carrying an image.
    */
    /*
      689 -> 792, 2026-08-30. The inline alert entry's two send paths.

      `postInlineAlert` composes through the same `composePostAlert` the modal's text tab uses and
      goes down `postAlert`, the one path that owns the refusal and the toast; `beginAlertImagePaste`
      reuses the pending-paste state the chat composer already had, with a `target` deciding where
      the confirmed image goes — which is upstream's own shape, since its handler routes into the
      post-alert modal's `onImagePaste` and there is exactly one confirmation for both.

      A third of the addition is the recorded divergence: upstream's subscriber calls the MODAL's
      method, so the inline box silently inherits whatever five checkboxes that modal was last left
      holding.
    */
    /*
      792 -> 851, 2026-08-31, for `ACA-05`, and the raise is one extraction plus the two paragraphs
      that record why the register's prescribed fix would have posted into the wrong column.

      The row said to feed the extra column's paste through `+page.svelte` *"beside the main
      column's `onpasteimage={(file) => composer.beginImagePaste(file)}`"*. That defaults to
      `'chat'`, and the chat branch posts with NO channel argument — the main tab. `app-extra-chat`'s
      own `doImggurUpload` at byte 2,389,468 ends in `sendGrpChat(s.channel, …)` against THIS
      column's tab, so a screenshot pasted into the second column would have appeared in the first.

      `'extra'` is therefore a third DESTINATION rather than a third caller, and it seeds from its
      own box (`ui("#textAreaTxtExtra")`, byte 2,392,023) rather than the main one.
      `#uploadImagesTo` is the extraction that made one body serve both channels: two copies of that
      loop would be two places to get the progress dialog, the `Upload Failed...` wording and the
      join-with-spaces wrong.
    */
    max: 851,
    why: 'everything that leaves the browser as content; five entry points, one refusal path'
  },
  {
    file: 'lib/room/image-post.svelte.ts',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE — and this test asked for it, refusing the module
      until it had a number. Gate 0b makes ceilings mandatory per discovered `lib/room/*.svelte.ts`.

      177 lines, of which the CODE is about fifty: three fields, four small methods and one private
      send. The rest is the argument, and the ratio is right for this file rather than slack to grow
      into — because what it holds is a lifecycle four surfaces share while pointing four different
      ways, and the whole risk it manages is somebody deciding the destinations could be shared too.

      It exists because `RPL-01`…`RPL-03` needed the Q&A image path a second time and
      `message-actions.svelte.ts` hit its ceiling with the copy in place. Extracting instead took
      that file from 1,025 to 785.

      If this number climbs, the thing to check is whether it has grown a DESTINATION. It must not:
      `post` is injected precisely so this class cannot send anywhere on its own, and a branch here
      that decides where an image goes is the failure `QAM-05`'s prescribed fix would have been.
    */
    max: 177,
    why: 'one image, uploaded and posted somewhere - the lifecycle four surfaces share'
  },
  {
    file: 'lib/room/kicks.ts',
    /*
      Born capped, 2026-08-23, as the destination of an extraction rather than a new feature.

      Building the real `kick-duplicates` loop put `user-actions.svelte.ts` at 788 against 777. The
      owner ruled extraction, and the seam was already there: `kick` and `kick-duplicates` are what a
      presenter does to remove a PERSON, the other half of the sentence `RoomSessionControl` owns.
      Both share a default message, both prompt, both end in one command, and neither touches roster
      selection, the managed lists or the permission checkboxes.

      The matching RULE is not here — it is pure, in `#lib/kick-duplicates.ts`, following
      `mute-all-non-admins.ts`. This class only wires dialogs to it.
    */
    max: 130,
    why: 'what a presenter does to remove a PERSON - kick and kick-duplicates; one command, two prompts'
  },
  {
    file: 'lib/room/managed-users.svelte.ts',
    /*
      Born capped, 2026-08-23, and born for the reason this contract exists.

      Wiring `test-follow-sound` — the one inert control that needed no server — put
      `user-actions.svelte.ts` at 814 lines against 775. The owner ruled extraction rather than a
      raise, which is what this file's own failure message asks for and what the Phase 5 plan says:
      the answer to an overrun is another extraction, never a shortened comment, never a raised
      number.

      The seam is the viewer/server line, not a convenient cut. The muted and followed lists are
      LOCAL: they never reach the server, they are not room settings, and `localStorage` is the only
      reason they survive a reload. Everything else `RoomUserActions` does ends in a command. That
      also matches the reference, which reaches these through `addUserToList` / `removeUserFromList`
      rather than `sendServerAdminCommand`.

      175 against an actual of 175 would leave no room to explain the next thing learned about these
      lists, and the SLACK check refuses a ceiling far above the actual — so this is deliberately
      close.
    */
    max: 185,
    why: 'the two viewer-local chat lists, muted and followed; localStorage in, localStorage out, no server'
  },
  {
    file: 'lib/room/session-control.ts',
    /*
      Born capped, 2026-08-23, as the destination of an extraction rather than a new feature.

      Eleven action names left `RoomUserActions` because they act on the ROOM and not on a user —
      that class's own `why:` string says "everything that can be done TO a user", and locking a
      session is not that. The seam was proven by the dependency surface before anything moved: the
      whole family needs four collaborators, and touches no roster, no target user and no presenter
      command.

      The ceiling exists because the contract demands one for every module in `lib/room/`, and that
      demand is the point: capping only the SOURCE of an extraction lets the destination sprawl
      instead.
    */
    /*
      135 -> 150, 2026-08-26. `session-refresh-roster` and `session-soft-reset` stopped lying: both
      ran a local `invalidateAll()` while telling the presenter a server command had gone out, and
      both now call one. Four lines of code; the rest is the record of what they used to do and why
      `#reload()` was REMOVED from the soft reset rather than left beside the command.

      ## THE THIRD PROSE-DRIVEN RAISE TODAY, and that is a finding about this file, not about the
      ## three modules

      `local-capture` (758 -> 872), `private-commands` (180 -> 198) and this one all breached on
      COMMENTS while their code stayed flat or shrank. In each the alternative was deleting an
      explanation of a defect that had just been fixed, which is the one thing the root standard
      forbids outright.

      The room modules already have the right instrument for this and these ceilings do not use it:
      the 800-line CODE backstop, which strips comments before counting and which none of the three
      came close to. A total-line cap answers "is this file long?" when the question worth asking is
      "has this file taken on more WORK?" — and on a codebase whose stated practice is long
      explanatory comments, the two diverge constantly.

      NOT changed here, because rewriting the ceiling model under deadline is how a gate ends up
      weaker than it was. Recorded as the owner's call, with the evidence attached.
    */
    max: 103,
    why: 'what a presenter does to the SESSION - lock, open, reset, close; eleven names, four collaborators'
  },
  {
    file: 'lib/room/profile-picture.ts',
    /*
      Created 2026-08-30 by extraction from `user-actions.svelte.ts`, and capped at what it landed
      at. Two methods and their transcriptions, moved byte for byte; if this number climbs, the
      question is what a third thing about a member's avatar could be.
    */
    max: 107,
    why: 'a presenter setting and clearing one member’s picture; two commands, one feature'
  },
  {
    file: 'lib/room/user-detail.ts',
    /*
      123 -> 121 on 2026-08-31, DOWN because the shape moved out: `UserDetail` was declared here and
      again in `server/user-detail.ts`, and the two agreed by hand until the server started answering
      `ip` and `userAgent`. One declaration now, in `lib/user-detail-shape.ts`, imported by both.

      Created 2026-08-30. Most of it is the account of what the reference does — the `getUserInfoDB`
      branch, the two divergences taken deliberately, and the declined `SvelteSet`. The class itself
      is three members. A climb here means the client started deciding something.
    */
    max: 121,
    why: 'the answers to the offline user lookup, held for the life of the page'
  },
  {
    file: 'lib/room/user-detail-port.ts',
    /*
      One construction, in the one place that may import a route.

      Capped at what it lands at, which is mostly the paragraph explaining why it is a FACTORY: an
      instance at module scope would be one lookup cache shared by every request a worker handles,
      because `create-room.svelte.ts` is imported by a page that renders on the server. That is the
      reasoning a future reader needs before they "simplify" it back, and it is worth eight lines.
    */
    max: 27,
    why: 'the userInfoDB wire, kept out of the class that uses it'
  },
  {
    file: 'lib/room/user-actions.svelte.ts',
    /*
      LOWERED 749 -> 730 on 2026-08-23, when `RoomSessionControl` took eleven session action names
      out of `handle()`. They act on the ROOM rather than on a user, which is what this entry's own
      `why:` string had said all along.

      The empty comment block that stood here until then was the file's only `prettier` failure, and
      dead scaffolding of exactly the kind the root standard forbids.
    */
    /*
      +20, 2026-08-23, owner-approved: `savePermissions()` and its command type.

      NOT a branch of `handle()`, and that is what the lines buy. Every action `handle` takes is
      `(name, user)` with no payload; this one carries the state of five checkboxes, so folding it in
      would have meant widening the single dispatcher every control in the modal shares.

      OVERRAN THE APPROVAL, and that is recorded rather than absorbed. The owner approved 730 -> 750
      for the method. It landed at 775 because a DEFECT was found after the approval and while
      verifying it: `targetFor` dropped all five permission flags, so `#permissionsModal` seeded every
      checkbox from `undefined` and drew them unchecked whatever the membership said. Harmless while
      Save sent nothing — a silent REVOCATION the moment it started, because the endpoint writes
      `false` for every key absent from `granted`.

      The extra 25 lines are that fix: five flags carried through `targetFor`, the generic widened to
      admit them, and the note explaining why they land on FLAT fields when `ModalTargetUser`
      already has a `permissions` string meaning something else entirely. Shipping the write path
      without them would have been worse than not shipping it.
    */
    /*
      775 -> 777 on 2026-08-23. Two lines, for the `kick` branch that finally sends and the
      `kickUser` member on `UserActionCommands`. Consolidation took this from 789 first.
    */
    /*
      777 -> 780, 2026-08-23. `mute-chat-24` was wired and BOTH mute branches then left this class
      for `RoomChatMute`, which is built here and handed to `RoomEventStream` so the presenter's
      buttons and the member's receivers share one instance — the split between them is exactly how
      the pair drifted, with `unmute-chat` real for months while `mute-chat-24` raised the capture's
      own "user chat muted" over nothing.

      The residual is the seven-line note on that construction: `#announceThenSend` is private to
      this class, so building the slice from outside would mean a second copy of it. Three lines
      over, and the extraction it paid for moved 191.
    */
    /*
      780 -> 805, 2026-08-23, and RAISED WITHOUT A SEPARATE ASKING because the owner's instruction at
      the time was "it all needs to be done" — recorded here so it can be reversed on sight rather
      than discovered later.

      What bought it: `mute-mic`, `mute-camera` and `stop-screens` became live. Seven of the lines
      are the branch; the other eighteen are the account of why three buttons were dead for months
      while their command (`presenterCommand`), their receiver (`events.svelte.ts:573-582`) and a
      neighbouring caller (`muteAllNonAdmins`, in this same class) all already existed. That account
      is the asset — the `INERT_ACTIONS` entry claiming they were "blocked on a SERVER-side presenter
      check" is what stopped anyone looking, and it was false the day it was written.

      The extraction alternative, if this is reversed: the peer media commands — these three plus
      `muteAllNonAdmins` — are a coherent slice of roughly 60 lines.
    */
    /*
      805 -> 824, 2026-08-23. `restart-audio`, the fourth and last entry in `EXACT_ALERTS` that had a
      captured wire already waiting for it. Six lines are the branch; the rest is why this one keeps
      its alert where the three peer mutes above have none — the capture's sender raises
      `bootbox.alert("Audio restart request sent OK")` and theirs raise nothing. Two neighbouring
      methods, two behaviours, both reproduced.

      Raised under the same standing "get it done" as the entry above, and reversible on the same
      terms: the peer media commands are a coherent slice.
    */
    /*
      803 -> 823, 2026-08-29, for `debug-log` — a presenter pulling one member's console log.

      Here it is one dispatch branch — two lines of code and a paragraph on why there is NO announcement, which is the difference between this control and `force-reload` directly above it.

      A FEATURE arriving, not a wire. It left `INERT_ACTIONS`, which is what removing an entry there
      declares, and it is the one command in this room that could not be transcribed: upstream's
      reply lets the CLIENT name who receives the log, so the server had to grow a memory of who
      asked. `debug-log-contract.test.ts` is where that argument lives; these files carry only what
      each of them does.
    */
    /*
      823 -> 861, 2026-08-29, for `upload-profile-picture` — a presenter setting one member's avatar.

      Here it is a method rather than a dispatch branch - the call `save-permissions` already made, because this control carries a FILE and `onUserAction` carries an action name and a user. Plus the note on why success is silent and failure is not.

      The last inert control with a captured wire and no blocker. It also carried a WRONG
      disposition: `TODO.md` filed it as belonging with the controller "because it is durable", and
      the controller's `users` table has no avatar column — the room's own `users.avatar_url` is what
      the roster reads and every chat message joins to. `profile-picture-contract.test.ts` holds the
      security argument; these files carry only what each of them does.
    */
    /*
      861 -> 880, 2026-08-29, for `remove-profile-picture-btn` — the other half of the avatar control.

      One method, mirroring `uploadProfilePicture` — silent on success, loud on failure — plus the note on why there is no confirm dialog for an act one click undoes.

      Found by ARITHMETIC rather than by reading the bundle: the class carried two rules in `app.css`
      and had no wearer for the whole port, which `orphan-style-contract.test.ts` refuses. Its entry
      in that catalog turned red the moment the button existed and has been deleted, which is the
      declaration that it is done.
    */
    /*
      880 -> 896, 2026-08-29, for the 125px downscale and the alerts — a CORRECTION, not a feature.

      Here it is two alerts and the correction that replaced a paragraph arguing for silence - reasoning carried over from `getDebugLog`, where it is true, and never checked here.

      `upload-profile-picture` shipped earlier the same day without either, because
      `docs/decoded/missing-commands-triage.md:93` — *"canvas-downscales the image to a 125px longest
      edge"* — was not read until after. That row is truncated in the document, so the arithmetic and
      the three alert sentences come from the bundle itself at bytes 2,084,700 and 2,086,100.
    */
    /*
      DOWN one on 2026-08-29, and the line it lost is a SECOND CONSTRUCTION of `ModalTargetUser`.
      `get target()` built the object inline from the same `User` `targetFor` takes, missing all
      five permission fields — which is a silent revocation the moment anything opens the
      permissions modal from that path. Nothing did; the fix is worth the line anyway, and
      `entitlement-shape-contract.test.ts` refuses a third.
    */
    /*
      LOWERED 895 -> 880 on 2026-08-30, and the extraction that paid for it is the point.

      The user-detail lookup needed about sixteen lines here — a field, an option, the `target`
      wrapper and `hydrateDetail` — and this entry's own instruction is to extract rather than raise.
      `RoomProfilePicture` came out: sixty-four lines, two methods, one feature complete, with the
      two transcriptions moved byte for byte. It passed the test this file's header demands of an
      extraction, which is that it is a real slice and not one invented to satisfy a number — the
      same test `RoomKicks` and `RoomChatMute` passed. Nothing else in this class reads or writes
      anything those two methods touch; they were adjacent to the permission checkboxes only because
      both were wired in the same week.
    */
    /*
      880 -> 935, 2026-08-30. G04 — `muteTalkingUserDialog`, and fifty-five lines of which forty-six
      are the argument for the shape.

      Two of them matter to a reader. It is a PROMPT with a typed word rather than a confirm, and
      that is upstream's choice for the right reason: this mutes a microphone for everyone in the
      room, and an accidental click on one name in a list of names is exactly what a confirm dialog
      does not prevent. And the command mapping — `sendServerCommand('muteTalkingUser')` has no
      counterpart here; `remotePresCommand` / `mutemic` is the same act addressed to one peer — is
      NOT restated: it is written once on `muteAllNonAdmins` above, and this method points at it.
    */
    /*
      935 -> 892, 2026-08-30, and DOWN is the direction worth noting.

      `targetFor`'s mapping, the no-selection placeholder and `openManagedInfo`'s own inline literal
      all left for `room/modal-target.ts`, where a message's sender is built the same way. This
      class kept a three-line `targetFor` that delegates, because that is the name every caller and
      contract test already uses.

      The number follows the code rather than being left where it was: a ceiling parked above the
      real figure reads like a limit while licensing every line back.
    */
    max: 892,
    /*
      780 -> 803, 2026-08-29, and the +23 is a DELEGATION rather than a feature.

      `admin-notes-password` was row W's last lying control: it raised the reference's prompt and then
      set 'Wrong password!' unconditionally, never receiving the typed value at all. Wiring it added
      98 lines here, which this ratchet refused — so the logic left, as `RoomChatMute`, `RoomKicks`
      and `RoomSessionControl` did before it, into `RoomNotesAccess`.

      What remains is the seam: a field, a getter, an import, one constructor line, the branch that
      calls it, and the note saying where it went. Extracting the seam too would mean a class that
      dispatches to a class that dispatches.
    */
    why: 'everything that can be done TO a user; handle() alone was 249 lines on the page'
  },
  {
    file: 'lib/room/peer-history.svelte.ts',
    /*
      Extracted from `RoomPrivateChat` on 2026-08-30 and capped at what it landed at. It is the
      user-info modal's "show private messages" — three fields, three getters and one loader — and it
      had lived on the PANEL's class, which shares nothing with it but the word "private". If this
      grows, the question is what a second thing this modal does could be.
    */
    max: 85,
    why: 'one member’s whole private history, for a moderator; a modal, not the panel'
  },
  {
    file: 'lib/room/private-chat-scroll.ts',
    /*
      CAPPED ON ARRIVAL, 2026-08-30. `app-privchatscroller`'s two scroll behaviours and the two
      numbers they turn on: the 500ms re-scroll (byte 2,192,880) and the Load More anchor restore
      with its `-20` (2,191,427).

      It came out of `private-chat.svelte.ts`, whose own ceiling entry had named it as the seam. It
      holds NO state and reads none — both functions take or find the element they act on, and the
      Load More anchor crosses as an argument because it belongs to the paging that produced it.
      That is what makes this a module and not a second class, and it is the thing to re-check if it
      grows: state arriving here means the seam was drawn in the wrong place.
    */
    max: 110,
    why: "the private-chat log's two scrolls, and the two transcribed numbers they turn on"
  },
  {
    file: 'lib/room/private-chat-title-flash.ts',
    /*
      CAPPED ON ARRIVAL, 2026-08-30. The tab-title flasher — `"<sender> messaged you - <room>"`
      alternating with the room name every two seconds, bytes 2,207,480 and 2,204,266.

      A module because `RoomPrivateChat` is at its ceiling and this is self-contained: one interval
      and the document's title, told when to start and stop, reading nothing from the panel. The same
      seam `private-chat-scroll.ts` was cut on.

      `moderator-message-contract.test.ts` named this as one of two consumers deliberately unbuilt,
      with an assertion designed to fire when either appeared. It fired.

      If this grows, the thing to check is whether it has started deciding WHEN to flash. It must
      not: that gate is two conditions in `RoomPrivateChat.ingest`, where the message is.
    */
    max: 90,
    why: 'the tab-title flash for an unread private message, and the one interval behind it'
  },
  {
    file: 'lib/room/private-chat.svelte.ts',
    /* +3, 2026-08-16: the same `#lib/*.js` import reflow as `files.svelte.ts` above. */
    /*
      524 -> 605, 2026-08-28, for the moderation read: `getAllUserPM`.

      Three `$state` fields and their accessors, the `showPeerHistory` method, the `PeerHistory`
      type and the fourth entry on `PrivateChatCommands`. Roughly half is the prose, and it is
      earning its place: why the answer is `$state.raw`, why loading and error are separate fields
      rather than variants of the value, why the entitlement is NOT re-checked here, and why this is
      a second command rather than a flag on `loadLog`.

      That last one is the important sentence in the file. `loadLog` reads a thread the caller is a
      party to; this reads every conversation one member had. A flag would have made the narrow read
      widen on a `true`, and the two would have shared a code path that only one of them is allowed
      to take.
    */
    /*
      605 -> 672, 2026-08-30. G16 and G23.

      G16 is the roster-driven online status — every server-supplied tab was built `online: false`
      and nothing ever consulted the roster, so the status dot was permanently grey for anyone the
      page loaded with. About forty of the added lines are the option's docblock, and they are the
      part worth keeping: `checkUserOnlineStatus` only ever writes `true`, so this diverges by
      letting the dot go back to false, and that divergence needs its argument written down.

      G23 is one number — 60ms to the capture's 500 — plus why the second scroll exists at all and
      why it is a `setTimeout` where this codebase otherwise reaches for `tick()`.
    */
    /*
      672 -> 912, 2026-08-30. Six rows of the surface audit, and the largest single addition this
      file has taken.

      G8 `closeTab`, G12 the toast and browser notification, G14 the `Load More` scroll restore with
      the reference's `-20`, G25 the search's own bucket, plus the two constants the contracts read
      instead of restating. **G7 is in here as a REFUSAL** — a paragraph explaining why
      `getAllPCLogsLoading` is not modelled: this room resolves the conversation list at page load,
      so both of the reference's loading branches would be branches that can never render.

      Roughly 160 of the 240 lines are prose, and the ratio is the point: every one of these is a
      behaviour whose absence was invisible, and each needed its capture quoted to be checkable.

      The seam if this grows again is the SCROLLING — `scrollToBottom`, `#restoreAfterLoadMore` and
      the two constants are one concern that touches no other part of this class.
    */
    /*
      912 -> 928, 2026-08-30, after the SCROLLING came out.

      G1's image-upload path and G13's `canPost` refusal put this at 1,010, and the entry below had
      already named the seam: `scrollToBottom`, the Load More restore and the two constants are one
      concern that touches nothing else here. They are `private-chat-scroll.ts` now, and this file
      kept a two-line delegation and its docblock.

      So the net of two features is +16 lines. The next seam, if this grows again, is the SEARCH —
      `search`, `#searchResults` and the `log` getter's choice between two buckets.
    */
    /*
      928 -> 990, 2026-08-30. G27 — the tab-title flash.

      The decisions are here and the mechanism is not: WHEN to flash (a message that is not mine,
      with the composer unfocused), when to stop (the composer taking focus, the tab closing, the
      panel closing), and the gate's two halves transcribed from byte 2,207,480.
      `private-chat-title-flash.ts` owns the interval and the title.

      The seam named in the entry below is still the SEARCH, and it is still the next cut.
    */
    /*
      990 -> 1148, 2026-08-31, for `PCC-06` — pasting a screenshot into a private conversation, and
      the row was BLOCKED on SCOPE rather than on anything unknown: the composer could not take an
      `onimagepaste` prop that nothing passed, and the file that would pass it belonged to another
      batch. One session owning both closes it.

      Most of the raise is the two docblocks, and both record something the code cannot say:

      `beginImagePaste` carries the decoded handler at byte 2,212,274 and a CORRECTION. The register
      row that filed this said the loop "takes the first `image/*`"; the bundle keeps assigning with
      no `break`, so the LAST image wins — identical to the chat composer, which is why the shared
      `pasted-image.ts` rule is used rather than a second loop. A paste carrying a screenshot AND
      its text URL resolves to the picture, and that is the difference the sentence got backwards.

      `confirmImagePaste` carries `doImggurUpload` at byte 2,211,249, where two things read
      backwards from what anyone would assume: the URL goes FIRST and the typed message is appended
      after it, and the composer is cleared ONLY on the branch that had a message to carry. Both are
      executed by `private-chat.svelte.test.ts` and both negative controls were run.

      `#post` is an EXTRACTION, not new surface. The class gained a second way to post, and two
      senders each holding their own copy of `canPost` is the shape this repository refuses one
      level up — the class's own comment already argues it for the client-versus-server split.
    */
    max: 1148,
    why: 'the private-chat panel; generic over the roster row so the full row reaches selectRosterUser'
  },
  /*
    Phase 5 slice 27. Sixteen view gates — every `$derived` boolean that decides whether a control is
    drawn at all — as GETTERS rather than `$derived` class fields, because a derived field
    initialises in declaration order, before the constructor has assigned the thunks it reads.
    `RoomFiles.filesHidden` is the recorded precedent for that and it cost a slice to find.
  */
  {
    file: 'lib/room/reaction-notices.ts',
    /*
      USM-08 / USM-09 / USM-10's two notices, extracted from `RoomOverlays.svelte` in the commit
      that wrote them.

      Most of the file is the WHY, and it is why worth keeping: the reference reads a reaction off a
      frame field carrying the reacted-to message BODY and then filters to the recipient IN THE
      BROWSER. This room cannot do either — the stream is per ROOM — so both audiences are decided
      over rows the server already chose to send this viewer.
    */
    max: 116,
    why: 'who is told about a reaction, and the Do Not Disturb split the reference has'
  },
  {
    file: 'lib/reaction-arrivals.ts',
    /*
      Which reactions are NEW since the last load — the diff those two notices run on.

      Its header records a control's finding: it had a `#primed` flag copied from `RoomArrivals` and
      the flag did nothing, because the guard that makes a NEW row silent already makes the FIRST
      PASS silent. Deleting it left every test green, which is what a redundant field looks like.
    */
    max: 115,
    why: 'the reaction diff between two page loads, and why it is not read off the wire'
  },
  {
    file: 'lib/flash-on-edit.ts',
    /*
      `dta-01` — flash the trade-alert composer when Edit is pressed.

      Most of the file is why it is a COUNTER: with a boolean, Edit pressed twice inside 500 ms
      leaves the value already true, nothing re-runs, and the first timer ends the second flash.
      That is the row's own defect coming back, and its control was seen red.
    */
    max: 47,
    why: 'the 500ms composer flash, as an attachment, and why the nonce is a counter'
  },
  {
    file: 'lib/device-enumeration.ts',
    /*
      Created 2026-08-31 and capped at what it landed at, for `AVD-01`, `AVD-03` and `AVD-04`.

      The slice `av-device-pane-contract.test.ts` said out loud it could not reach: *"every path to
      `devicesLoadError` goes through `navigator.mediaDevices`, which jsdom does not implement —
      stubbing it would test the stub."* So the five captured error sentences and the two
      duplicate-device rules — the pieces most likely to be quietly reworded — were the pieces
      nothing could execute. Pure now, and executed.

      If this climbs, the question is whether a DEVICE decision has arrived in it that belongs to the
      capture instead.
    */
    max: 252,
    why: 'turning one enumerateDevices() answer into two dropdowns, and the five failure sentences'
  },
  {
    file: 'lib/video-list.ts',
    /*
      Created 2026-08-31 and capped at what it landed at, for `VID-06`.

      `sendVideoToRoom` is a four-refusal ladder wrapped in three lines of state assignment, and the
      ladder was the part nothing could execute. Most of the file is the account of the reference's
      own DEAD playlist arm, which is reproduced by not being written — deleting it silently would
      answer a question upstream has not answered.

      If this climbs, the question is whether the YouTube pattern has grown a third consumer here
      while `ModalHost` and `YoutubePlayerOverlay` still hold their own copies. It should not; it
      should take theirs.
    */
    max: 184,
    why: 'what may go into the presenter video list, and where the list is kept'
  },
  {
    file: 'lib/scheduled-alert-table.ts',
    /*
      Created 2026-08-31 and capped at what it landed at, for `SCH-01` and `SCH-02`.

      Two values, both transcriptions: the repeat pill's three colour classes — which
      `docs/decoded/alert-scheduler-filter-labels.md` explicitly recorded as NOT READ, "do not guess
      them" — and the question asked before a scheduled alert is destroyed.

      NOT in `scheduled-alert.ts`, and that is the reason for a second file rather than a section: the
      server imports that one, and a badge class name and a browser confirmation have no business
      crossing that boundary.
    */
    max: 83,
    why: 'the manage table two captured values: the repeat pill colours and the delete question'
  },
  {
    file: 'lib/download-image.ts',
    /*
      Saving an image the room is showing. It was a method on `RoomModals` with one caller, and
      `dta-02` needed two more in components that do not hold `RoomModals` and should not.

      It was never modal state — no field, no lifecycle, nothing rendered. A method whose class it
      never touches is a function that has not been extracted yet.
    */
    max: 55,
    why: 'save a shown image, with the reference two filename rules that are not cosmetic'
  },
  {
    file: 'lib/note-palette.ts',
    /*
      CAPPED ON ARRIVAL, 2026-08-30, in the commit that created it — which is what this file demands
      of a new module and what four uncapped components in two days cost.

      It came out of `NoteEditor.svelte` because that component hit its 1,700 ceiling and the rule is
      that a slice leaves rather than the number rising. Ninety of the lines are the four constant
      tables; the rest says the thing the component could not: NONE of it is in the pinned bundle.
      The reference's editor is summernote, which the capture does not include, so these are
      summernote's defaults rather than a transcription — and a row that cites them as captured
      values is citing something that was searched for and not found.

      If this number climbs, the question is whether a rule has moved in beside the data. It must
      not: nothing here knows what a note is.
    */
    max: 138,
    why: "the note editor's fonts, sizes, line heights and 64-colour palette, and what evidences them"
  },
  {
    file: 'lib/note-dialogs.ts',
    /*
      CAPPED ON ARRIVAL, 2026-08-30. Every prompt and confirmation the notes pane raises, out of
      `NotesPane.svelte` when rendering a panel per note put it over its 525 ceiling.

      Six captured sentences and one interpolated, with their byte offsets, in one list instead of
      scattered through a component in the order the handlers were written. The literal types are
      load-bearing: `'…apply this note as Welcome Mat'` has no full stop and its all-rooms twin has a
      question mark, which is upstream's asymmetry at byte 1,474,217 and exactly the shape a tidying
      pass corrects. A changed sentence is a type error at the call site rather than a silent diff.

      A seventh dialog belongs here. A dialog that needs component state does not.
    */
    max: 119,
    why: 'the notes pane six dialogs, their captured sentences, and the types that pin them'
  },
  {
    file: 'lib/room/note-update-notice.ts',
    /*
      USM-11's receiver, extracted from `events.svelte.ts` on 2026-08-30 in the commit that wrote it.

      `source-size-contract` moved it and the module is the better home: that file is a dispatcher,
      and this is a behaviour with four paragraphs attached — the two byte offsets, why the saver is
      skipped, why upstream's `alertsService.clear()` is refused, and why the control is NOT gated on
      `sessData.beepOnUserJoin`. Most of the file is those four.
    */
    max: 76,
    why: 'a note somebody else saved: the refetch, the toast, and the two refusals'
  },
  {
    file: 'lib/room/preference-side-effects.ts',
    /*
      The four preference writes that are NOT preferences, extracted from `createRoom` on
      2026-08-30 when USM-12 and USM-13 added the third and fourth.

      `source-size-contract` is what moved them and the module is the better home on its own terms:
      `create-room.svelte.ts` is a wiring file, and this is a decision table whose every row is a
      defect somebody fixed with a reason worth keeping. Most of the file is those reasons.

      Two of the four act on a class constructed AFTER the hook, so all five dependencies are
      thunks — a closure, never a read at construction, which is also what makes this testable
      without building a room.
    */
    max: 111,
    why: 'the four preference writes that are not preferences, and why each one exists'
  },
  {
    file: 'lib/room/restream-url.ts',
    /*
      SC-13's one act, 2026-08-30, and deliberately the same shape as `close-message.ts` below it: a
      remote command, an alert on refusal, and an `invalidateAll()` so the page data and the pane
      cannot disagree afterwards. It is small because the decisions are elsewhere — the validation is
      in the pane and re-applied on the server, and the authority is `presenterRoom()`.
    */
    max: 46,
    why: 'writes the room restream URL, and says so loudly when the controller refuses'
  },
  {
    file: 'lib/room/close-message.ts',
    /*
      THE TWO CLOSE-SESSION BUTTONS' one shared act, 2026-08-27.

      Small on purpose: a remote command, an ordered pair of effects, and the rule that the close only
      happens if the save succeeded — because closing a room on a refused save shuts members out
      behind whatever the previous message said.
    */
    max: 49,
    why: 'saves the close message, then closes only if the save succeeded'
  },
  {
    file: 'lib/room/for-all-broadcasts.ts',
    /*
      THE EIGHT "FOR ALL" RECEIVERS, extracted 2026-08-27 and capped in the same commit.

      The one group on the `cmds` channel that shares a collaborator: every branch reaches
      `RoomBroadcasts`, and two also reach `showTab`. Everything else on that channel routes to a
      different object each time, which is why the chain stayed a chain and these eight lifted out.

      The precedent is `RoomPrivateCommands`, which took the whole addressed channel out of the same
      router for the same reason.
    */
    max: 157,
    why: 'the room-wide For All receivers; the one cmds group with a shared collaborator'
  },
  {
    file: 'lib/room/session-room-commands.ts',
    /*
      THE FIVE SESSION ACTS THAT REACH THE SERVER, extracted 2026-08-27 and capped in the same commit.

      `RoomSessionControl`'s nine actions divide on one question: does anybody outside this browser
      learn about it. FOUR OF THESE FIVE SPENT MONTHS ON THE WRONG SIDE OF THAT LINE — two ran a
      local `invalidateAll()` while promising a command had gone out, and two wrote a preference and
      told nobody — which is the evidence that the seam is real rather than a line-count exercise.
    */
    max: 107,
    why: 'the session acts that send; the four that only write a preference are a table'
  },
  {
    file: 'lib/room/session-lock-writes.ts',
    /*
      THE THREE LOCK ACTIONS as what each WRITES and SAYS, 2026-08-27.

      A table rather than three branches, and it makes visible what three branches hid: locking
      writes two preferences and unlocking writes one. `sessionLockKick` is deliberately not cleared
      on unlock — it configures the NEXT lock.
    */
    max: 44,
    why: 'the preference writes behind the lock actions, as data'
  },
  {
    file: 'lib/room/user-action-commands.ts',
    /*
      EVERY COMMAND THE USER-ACTION DISPATCHER CAN SEND, extracted 2026-08-27 and capped in the same
      commit.

      It was declared above the class in `user-actions.svelte.ts` and grew an entry per control as the
      modal's dead buttons were wired. Extracting it was what the ratchet asked for when wiring the
      last of them — *" Mute Chat indefinately "* — pushed that file over.

      The number goes DOWN when a control is retired, not up per control wired: a new entry costs one
      line, and the docblock that explains its payload belongs with the command that reads it.
    */
    /*
      72 -> 79, 2026-08-29, for `debug-log` — a presenter pulling one member's console log.

      Here it is one command and its docblock, and the docblock is the larger half: why this one raises no alert when `forceReload` beside it does.

      A FEATURE arriving, not a wire. It left `INERT_ACTIONS`, which is what removing an entry there
      declares, and it is the one command in this room that could not be transcribed: upstream's
      reply lets the CLIENT name who receives the log, so the server had to grow a memory of who
      asked. `debug-log-contract.test.ts` is where that argument lives; these files carry only what
      each of them does.
    */
    /*
      79 -> 85, 2026-08-29, for `upload-profile-picture` — a presenter setting one member's avatar.

      Here it is one command whose docblock records the thing that makes it different from every other presenter command: its target is checked for MEMBERSHIP, because it is the only one that writes a durable row keyed on the target alone.

      The last inert control with a captured wire and no blocker. It also carried a WRONG
      disposition: `TODO.md` filed it as belonging with the controller "because it is durable", and
      the controller's `users` table has no avatar column — the room's own `users.avatar_url` is what
      the roster reads and every chat message joins to. `profile-picture-contract.test.ts` holds the
      security argument; these files carry only what each of them does.
    */
    /*
      85 -> 87, 2026-08-29, for `remove-profile-picture-btn` — the other half of the avatar control.

      One command and a one-line docblock.

      Found by ARITHMETIC rather than by reading the bundle: the class carried two rules in `app.css`
      and had no wearer for the whole port, which `orphan-style-contract.test.ts` refuses. Its entry
      in that catalog turned red the moment the button existed and has been deleted, which is the
      declaration that it is done.
    */
    max: 87,
    why: 'the wire commands RoomUserActions can send; reference material, not dispatcher flow'
  },
  {
    file: 'lib/room/cmds-frame.ts',
    /*
      THE `cmds` FRAME AS THE CLIENT READS IT, extracted 2026-08-27 and capped in the same commit.

      It was an inline type literal inside the branch that reads it in `events.svelte.ts`, and it had
      grown a field per command until it was longer than most of the handlers it serves. That growth
      is what this ratchet exists to stop, and this is the extraction it asked for rather than the
      raise it refuses.

      It also has a job the inline version could not do: it is one HALF of a wire whose other half is
      the `channel: 'cmds'` arm of `RoomEvent`, in a server-only module the client must not import.
      Two declarations of one contract with nothing joining them — naming this one gives the drift
      somewhere to be noticed.

      Capped at its created size. A new field per command is what this file is for, so the number
      moves down only when a command leaves the wire.
    */
    /*
      Unchanged. `chatArchiveChanged` carries no fields, so it added none — a note explaining that
      was written here and then removed, because a paragraph about a field that does not exist, in a
      file of field declarations, is the kind of thing that goes stale first. The producer says it.
    */
    /*
      59 -> 68, 2026-08-30. `actorUserId`, and nine lines saying what it is allowed to decide.

      An id on a wire is exactly the shape of the 2026-08-07 privilege escalation, so a field that
      names a person needs its limit written next to it rather than inferred: this one is only ever
      compared against the recipient's own, the frame carries no payload for a forged id to unlock,
      and the server applied every rule before publishing. The comment IS the change.
    */
    /*
      68 -> 77, 2026-08-30, for `noteName` — the ONE string on this frame that is displayed, and
      nine lines saying why that is safe: the frame is published by `saveSessionNote` on our own
      server rather than relayed from a client, and a note's tab name is already drawn for anyone
      who can see the pane. The body is deliberately not sent.
    */
    max: 77,
    why: 'the cmds frame the client reads; one half of a wire whose other half is server-only'
  },
  {
    file: 'lib/room/addressed-channel.ts',
    /*
      THE FOUR CALLBACKS OF THE ADDRESSED CHANNEL, extracted 2026-08-27 and capped in the same commit.

      They were inline in `create-room.svelte.ts`, which put the description of what each command does
      to the member — the verbatim capture byte for `forceReload`, why a kick shows text rather than
      swapping the page — in the room's assembly factory rather than beside the class that calls them.

      The move went through `private-commands.ts` first and was moved out again: appending 45
      lines to a capped file is moving the problem, not solving it, and the ratchet said so
      immediately. Its own module is where a thing this size belongs.
    */
    /*
      46 -> 63, 2026-08-29, for `debug-log` — a presenter pulling one member's console log.

      Here it is a fifth callback group, with the same justification as the four above it: the buffer belongs to `RoomDebugLog` and the send to a remote command, so neither can be built here without this module reaching for the whole room.

      A FEATURE arriving, not a wire. It left `INERT_ACTIONS`, which is what removing an entry there
      declares, and it is the one command in this room that could not be transcribed: upstream's
      reply lets the CLIENT name who receives the log, so the server had to grow a memory of who
      asked. `debug-log-contract.test.ts` is where that argument lives; these files carry only what
      each of them does.
    */
    /*
      63 -> 71, 2026-08-29, for `upload-profile-picture` — a presenter setting one member's avatar.

      Here it is a sixth callback, `profilePictureChanged`, which the page answers with a refetch rather than a parallel copy.

      The last inert control with a captured wire and no blocker. It also carried a WRONG
      disposition: `TODO.md` filed it as belonging with the controller "because it is durable", and
      the controller's `users` table has no avatar column — the room's own `users.avatar_url` is what
      the roster reads and every chat message joins to. `profile-picture-contract.test.ts` holds the
      security argument; these files carry only what each of them does.
    */
    /*
      RAISED 71 -> 74 on 2026-08-29, for `forceStopScreen`, and argued here because the rule at the top of
      this file says a raise is a conversation. THE WHOLE ARGUMENT IS ON `private-commands.ts`, where
      the largest share of it landed; this entry carries its part of the same change.
    */
    /*
      74 -> 102, 2026-08-31 (`TODO.md` row 6). Twenty-eight lines, of which the code is a NET ZERO:
      one dep added, one removed, and `kicked` changed from a two-line arrow to a pass-through.

      The kick used to set `dialogs.alert` — a DISMISSIBLE box over a room whose stream the same
      frame had just closed, so the member read the message, pressed OK, and was left looking at a
      frozen room with nothing saying why. That is worse than showing nothing, because the room then
      looks broken rather than closed to them. It is a page swap now, which is what the reference
      does and what `private-commands.ts` had recorded as missing since it was written.

      `dialogs` NARROWED with it: the type was `{ alertThen; alert }` and `alert` had exactly one
      caller, this one. It went with its consumer rather than being left "in case", because a field
      nothing reads is the shape the root standard refuses outright.

      If this number climbs, the thing to check is whether a callback here has started DECIDING
      something. Every one is a hand-off: this module routes a frame to a receiver the page owns,
      and the moment one of them contains a policy it has stopped being a channel.
    */
    max: 102,
    why: 'builds RoomPrivateCommands with the callbacks its commands need; kept out of the factory'
  },
  {
    file: 'lib/room/debug-log.svelte.ts',
    /*
      Born capped, 2026-08-29, in the commit that created it.

      Two halves of one feature: the console buffer every member fills, and the log a presenter
      received. They look unrelated and are not — the same page is both ends, so splitting them by
      role would have put one feature in two classes.

      If this number climbs, the question is whether BUFFERING RULES have arrived in it. They must
      not: `#lib/debug-log-buffer.ts` owns the bound, the truncation and the redaction, and is pure.
    */
    max: 109,
    why: 'the console buffer and the received log; the rules are in the pure module beside it'
  },
  {
    file: 'lib/room/private-commands.ts',
    /*
      345 -> 338, 2026-08-31, and DOWN — which is what the paragraphs below promised would happen.

      The quoted case table left. It was eleven byte offsets in a comment under an instruction to the
      reader, *"re-run the count rather than trust the sentence"*, and nothing ever re-ran it: the
      paragraph beside it said FIVE-and-THREE-left for the whole of the time three of the five had
      already shipped. `priv-cmds-census-contract.test.ts` re-runs it against the pinned bundle now —
      each label asserted at its byte, the branches counted in the module itself, and the three cases
      without a branch each naming where the behaviour lives instead. The module points at it and no
      longer holds an inventory it cannot verify.

      THE ADDRESSED CHANNEL, created 2026-08-23 and capped in the same commit.

      Every `/privCmdsIn/` command, taken whole out of `RoomEventStream` — which routes six channels,
      five of them room-wide. This one names a person, and what made each of its frames safe was the
      same `targetUserId` test repeated on every branch.

      IT IS NOW ONE GATE. Four copies of a security check is four chances to forget the second half,
      and `TODO.md` row 9 still owes receivers on this channel. A single deny-by-default early return
      covers every branch written after it, without its author needing to know the rule exists —
      which is the difference between a convention and a guarantee.

      The cap goes DOWN as receivers are built and prose settles, never up to fit a fifth copy of the
      gate. There cannot be a fifth copy; that is the point of the file.
    */
    /*
      180 -> 198, 2026-08-26, and the sentence directly above says the cap never goes up. This is the
      exception it did not anticipate, so it is argued rather than quietly applied.

      NO CODE CHANGED. Every one of the eighteen lines is prose, and all of it is one of two things:

      * A CORRECTION OF A FALSE CLAIM. This file's `kickUser` branch asserted that a banned kick logs
        the member out upstream and that "this room does not". Both halves were wrong — `logout`
        occurs once in the whole bundle and has no subscriber, and ours ends the session server-side.
        The module docblock also said four receivers were built when five were.
      * A SECURITY CONSTRAINT ON THE NEXT IMPLEMENTER. `debugLogResp` is the one frame in this
        channel that travels member -> presenter, and upstream lets the CLIENT name the recipient. A
        member could inject content into any presenter's modal. That warning belongs next to the gate
        it would bypass, not in a register nobody reads while writing the branch.

      The alternative was to delete corrections to make a number, which is the single thing this
      repository's standard forbids most explicitly. The INVENTORY of what is left was moved OUT to
      `TODO.md` row 9 rather than duplicated here — that part was genuine bloat and it is gone.

      From here it ratchets down again, and building a receiver should take it down: each of the
      three that remain replaces a paragraph describing it with a branch doing it.
    */
    /*
      198 -> 267, 2026-08-29, for `debug-log` — a presenter pulling one member's console log.

      Here it is the two receivers and the frame fields they read. The larger half is the `debugLogResp` branch, which VALIDATES all three fields rather than trusting them — the only place in this router where a frame arrives from a member rather than from a presenter.

      A FEATURE arriving, not a wire. It left `INERT_ACTIONS`, which is what removing an entry there
      declares, and it is the one command in this room that could not be transcribed: upstream's
      reply lets the CLIENT name who receives the log, so the server had to grow a memory of who
      asked. `debug-log-contract.test.ts` is where that argument lives; these files carry only what
      each of them does.
    */
    /*
      267 -> 300, 2026-08-29, for `upload-profile-picture` — a presenter setting one member's avatar.

      Here it is the `updateProfilePic` receiver and the frame field it validates. Validated rather than trusted, like `debugLogResp` beside it: a frame missing the url would blank the member's own avatar to `undefined`.

      The last inert control with a captured wire and no blocker. It also carried a WRONG
      disposition: `TODO.md` filed it as belonging with the controller "because it is durable", and
      the controller's `users` table has no avatar column — the room's own `users.avatar_url` is what
      the roster reads and every chat message joins to. `profile-picture-contract.test.ts` holds the
      security argument; these files carry only what each of them does.
    */
    /*
      300 -> 345, 2026-08-29, for `forceStopScreen` — and the note directly above says this cap goes
      DOWN as receivers are built. It went down for exactly that reason and is going up now, so the
      claim owes an answer rather than an edit.

      THE ANSWER IS THAT THE NOTE MEANT SOMETHING NARROWER THAN IT SAID. What must never grow is the
      GATE: a fifth copy of `targetUserId === viewerId` is what the extraction bought and what the
      single early return makes impossible. A ninth RECEIVER is the opposite — it is the work the row
      exists to record, and it inherits the gate for free, which is the property being protected.

      Forty-five lines, and they are three things:

      * A NEW RECEIVER, ~20 lines. `forceStopScreen` is the one frame on this channel with no
        upstream `case` at all — upstream's server closes the producer, and this room's SFU refuses
        `closeProducer` from any session but the owner's, so the ask has to reach the owner instead.
        A reader who finds no `case "forceStopScreen"` in the bundle needs that written down or they
        will conclude the receiver was invented.

      * A CORRECTED CENSUS, ~18 lines. The module docblock said FIVE built and THREE left, having
        been written before `getDebugLog`, `debugLogResp` and `updateProfilePic` were built. It is
        now EIGHT and one, and the eleven cases are quoted WITH THEIR BYTE OFFSETS so the next reader
        re-runs the count instead of trusting the sentence — which is what let this one go stale.
        That is the second false census this file has had corrected (the first, at 180 -> 198, is
        argued a few entries up), and the offsets are the fix for the pattern rather than the row.

      * The frame's own field, ~6 lines.

      Prose is most of it, and shortening it is what the rule forbids: the receiver's whole reason
      for existing is a divergence from the capture, and a divergence with no recorded WHY is the
      one that gets "simplified" back.
    */
    max: 338,
    why: 'every command addressed to one member, behind one addressing gate'
  },
  {
    file: 'lib/room/chat-mute.ts',
    /*
      THE CHAT MUTE, both directions and both ends, created 2026-08-23 and capped in the same commit.

      191 lines carrying about 40 of code. That ratio is the point rather than an embarrassment: what
      this module holds is a RULE — that being silenced raises a dialog and being released raises a
      toast, that the presenter's "user chat unmuted" and the member's "Chat enabled" are two strings
      on two screens, and that the sentence a muted member reads is assembled from captured fragments
      because upstream's own `msg` is composed by a server nobody has read.

      It exists because those four halves lived in four files that could not see each other, and that
      is precisely how they drifted: `unmuteChat` had a real command and a real receiver for months
      while `mute-chat-24` sat in `EXACT_ALERTS` raising the capture's wording over no wire at all.
      No file held both sides, so nothing could notice.

      The cap is where it landed. It goes DOWN if the reasoning ever finds a better home, never up to
      accommodate a fifth half — a fifth half is the signal that something else needs extracting.
    */
    max: 181,
    why: 'the chat mute: two senders, two receivers and the rule that they agree'
  },
  {
    file: 'lib/room/display-modes.svelte.ts',
    /*
      Born capped, 2026-08-28, in the commit that created it — the rule this section states for every
      destination module.

      It holds `loadChatMode()` and `loadAlertsMode()`: the seed from the owner's `altChatRender` and
      the member's stored preference, the write-back that upstream does on both branches, and the
      member's later change from the settings radios. Four lines on `+page.svelte` before the ratchet
      refused them, and the refusal was right — those four lines and the modal's callback were two
      halves of one rule that had to agree about a preference key.

      If this number climbs, the question is whether it has started DECIDING anything beyond which of
      two renderers a surface uses. It must not: `chat-display-mode.ts` owns the rules, including the
      preference-key collision with the room's own chat policy, and this only applies them.
    */
    max: 87,
    why: 'which renderer each pair of surfaces uses; seeded once, then owned by the member'
  },
  {
    file: 'lib/room/screen-overlay.ts',
    /*
      Born capped, 2026-08-28, in the commit that created it, and the cap moved once BEFORE it
      landed: 117 -> 166, for `rekey` and the two-teardown split. Recorded rather than quietly set to
      whatever the file measured, because a "born capped" number that was silently rewritten twice is
      not evidence of anything. Both additions are defects this class had and the review found — see
      `local-capture.svelte.ts`'s note for what each one leaked.

      `alertsOverlayOnScreenshare` split into three because only one third of it can be tested here:
      `lib/alert-overlay-layout.ts` is pure geometry and is exercised exhaustively against a stub
      measurer; `lib/alert-overlay-compositor.ts` is canvas, video element, interval and
      `captureStream`, and is as thin as it can be made; and THIS is what knows what a producer id
      is — the setting gate, the map from producer to overlay, and the fan-out of an arriving alert
      to every screen this presenter is sharing.

      If this number climbs, the question is whether GEOMETRY or CANVAS work has arrived in it. Both
      belong to the other two, and the reason the split exists is that neither can be tested from
      where the other lives.
    */
    max: 166,
    why: 'which shares carry an alert overlay, and for how long'
  },
  {
    file: 'lib/room/create-room.svelte.ts',
    /*
      THE COMPOSITION ROOT, created 2026-08-17 (S7) and capped in the same commit.

      1,073 lines, and it is the largest module in `lib/room/` by a wide margin — deliberately. It
      holds 36 `new Room*()` constructions that arrived from `+page.svelte` with their citations
      intact, which is 740 of those lines. It is NOT a class and owns no behaviour: it wires, and
      returns. If this number climbs, the question to ask is whether something with behaviour has
      been added to a file whose job is assembly.

      The page fell 2,509 -> 1,729 in the same move, so the repository is not larger for it in any
      way that matters: the lines went from a file nobody could hold in their head to one whose
      entire purpose is legible from its first paragraph.

      +19 before the commit even landed, and they are worth naming because they are the shape this
      ratchet is supposed to allow: `svelte-autofixer` flagged the three EAGER reads of `data`
      (`state_referenced_locally`), which are deliberate one-time seeds carried over unchanged from
      the page. The answer was to write down why they are correct, not to suppress the flag with a
      `svelte-ignore` that nothing is warning under. Prose explaining a real subtlety is exactly what
      this file's header says never to shave to hit a number.


      RAISED 1076 -> 1086 on 2026-08-23, with the owner's explicit approval, for the command import and the two receivers it wires.
      Recorded as a DECISION rather than edited quietly, because the standing rule is that a
      ceiling only ever goes down and a raise is a conversation. This one is a genuine
      capability arriving — "Bring everyone here" on session notes had brought nobody since it
      was written — and nearly all of the growth is the mandatory WHY: the capture byte offsets
      for the reference protocol, the read-not-assumed proof that a plain tab click must not
      re-broadcast, and why `presenterRoom()` rather than the client decides authority. The
      alternative on offer was an extraction invented to satisfy a number, which is the thing
      this file exists to prevent.
    */
    /*
      +7, 2026-08-23, owner-approved at +1 and landed at +7. The difference is `prettier`, not new
      code: adding `savePermissions` took the one-line `commands: { … }` object past `printWidth`,
      so it reflowed to six lines. Recorded rather than absorbed, because a ceiling note that says
      "+1" over a seven-line diff is the kind of small untruth this file exists to stop.

      The import itself is one line and must stay a single named import per module specifier, which
      is what `remote-call-sites-contract` requires — a namespace or split import defeats it, and
      that gate exists because `presenterCommand` shipped dead for three commits.
    */
    /*
      1093 -> 1099 on 2026-08-23: the `kickUser` import, its entry in the commands object, and the
      `kicked` receiver that shows the presenter's message. Six lines of pure wiring.
    */
    /*
      1,099 -> 1,101, 2026-08-23. Two lines: the `muteChat` command joins `unmuteChat` in the import
      and in `commands`, and `RoomEventStream` is handed `userActions.chatMute` rather than a
      closure. The composition root grows by construction whenever a slice is added — that is what a
      composition root is for — and this is the smallest form that growth takes: a hand-off, not a
      second instance.
    */
    /*
      1,101 -> 1,110, 2026-08-23. `RoomPrivateCommands` is CONSTRUCTED here rather than inside the
      stream, because its three collaborators are the page's — two dialogs and the mute the
      presenter's buttons also hold. The stream routes to it; it does not own it.

      The composition root grows by construction whenever a slice is added. That is what a
      composition root is FOR, and it is the trade the same commit takes 62 lines off
      `events.svelte.ts` to make.
    */
    /*
      1,110 -> 1,114, 2026-08-23. Four lines: `restartAudio` joins the presenter-command import and
      the `commands` object, and `RoomPrivateCommands` is handed `reconnectAudio`. The composition
      root grows by construction whenever a receiver is built — the trade the extraction commit
      before this one bought sixty-two lines of headroom in `events.svelte.ts` to make.
    */
    /*
      1114 -> 1110 on 2026-08-28. No code moved: the `roomSplitDir` side-effect comment said the
      branch was "never [reached] on a page load", `applyRoomDefaults` made that false, and the
      correction is shorter than the sentence it replaced because the reasoning now lives with the
      rule in `room-defaults.ts`. A ceiling going DOWN on a correction is the intended direction.
    */
    /*
      1110 -> 1111 for the `speechRecognitionAvailable` thunk handed to `RoomRecording`. Pure wiring,
      which is what this file is; the thunk is a thunk because `gates` is constructed below it.
    */
    /*
      1111 -> 1114 for the off-topic seed: `new RoomChat({ … })` went from one line to four when the
      second argument arrived and the formatter reflowed it. Pure wiring, which is what this file is.
    */
    /*
      1114 -> 1116, 2026-08-28. Two lines: the import of `loadPeerPrivateMessageHistory` and its
      entry on the private-chat command bag. This file is the composition root, so a new command on
      an existing class costs exactly the wiring and nothing else — which is what it is for.
    */
    /*
      1116 -> 1139, 2026-08-28 — the typing indicator. The two `TypingSignal` instances and their wiring. Separate instances rather than one with a
      parameter, because each owns its own debounce timer and announce flag — a shared timer would
      let the extra column's keystrokes keep the main column's announcement alive.
    */
    /*
      1,139 -> 1,141, 2026-08-28. Two lines, and both are construction: `reactToQuestion` and
      `deleteQuestion` join `askQuestion` on the existing import line, and each is handed to
      `RoomMessageActions` as a dependency.

      The composition root grows by construction whenever a slice gains a collaborator. That is what
      a composition root is for, and it is the smallest form that growth takes: two hand-offs and an
      import that was already there.
    */
    /*
      1141 -> 1160 on 2026-08-28: `new RoomScreenOverlay`, its two hand-offs, and the citation.

      Assembly, which is what this file is for — the overlay has two consumers that never meet (the
      local publisher wraps a capture with it, the SSE router feeds it alerts), so nowhere below this
      file can construct it. The lines beyond the construction itself say why the setting is read
      through a thunk and why the read is `=== true`, which is the fail-closed rule this repository
      applies to every optional field arriving from the control plane.

      1160 -> 1174 on 2026-08-28: the `autoRecord` thunk into `RoomRecording` and the pass-through
      into the transport, both with the same `=== true` and the same reason — a room-config response
      that omitted the pair must record nothing automatically rather than start a recording nobody
      asked for.
    */
    /*
      1174 -> 1205 on 2026-08-28: the split reader moved here from the page, with the account of what
      its old position cost — a `ReferenceError` on every server render, for eleven days, invisible to
      every gate in this repository. It is declared beside the `prefs` it reads and returned so the
      page uses the same one, which is what makes a second copy impossible rather than merely unwise.
    */
    /*
      1225 -> 1254, 2026-08-29, for `debug-log` — a presenter pulling one member's console log.

      Here it is the buffer's construction, two imports, and the callback group wiring both directions of the frame.

      A FEATURE arriving, not a wire. It left `INERT_ACTIONS`, which is what removing an entry there
      declares, and it is the one command in this room that could not be transcribed: upstream's
      reply lets the CLIENT name who receives the log, so the server had to grow a memory of who
      asked. `debug-log-contract.test.ts` is where that argument lives; these files carry only what
      each of them does.
    */
    /*
      1254 -> 1265, 2026-08-29, for `upload-profile-picture` — a presenter setting one member's avatar.

      Here it is one import, one command in the surface, and the receiver that answers with `invalidate('room:data')` - the row being the authority, a refetch reaches the same value the next reload would.

      The last inert control with a captured wire and no blocker. It also carried a WRONG
      disposition: `TODO.md` filed it as belonging with the controller "because it is durable", and
      the controller's `users` table has no avatar column — the room's own `users.avatar_url` is what
      the roster reads and every chat message joins to. `profile-picture-contract.test.ts` holds the
      security argument; these files carry only what each of them does.
    */
    /*
      1265 -> 1266, 2026-08-29, for `remove-profile-picture-btn` — the other half of the avatar control.

      One name in the command surface.

      Found by ARITHMETIC rather than by reading the bundle: the class carried two rules in `app.css`
      and had no wearer for the whole port, which `orphan-style-contract.test.ts` refuses. Its entry
      in that catalog turned red the moment the button existed and has been deleted, which is the
      declaration that it is done.
    */
    /*
      RAISED 1266 -> 1271 on 2026-08-29, for `forceStopScreen`, and argued here because the rule at the top of
      this file says a raise is a conversation. THE WHOLE ARGUMENT IS ON `private-commands.ts`, where
      the largest share of it landed; this entry carries its part of the same change.
    */
    /*
      RAISED 1271 -> 1277 on 2026-08-29: the `editQuestion` wiring and its import, split across
      lines by prettier. Assembly only — see the entry for `message-actions.svelte.ts`, which is
      where that change actually lives.
    */
    /*
      RAISED 1277 -> 1333 on 2026-08-29, for `doChatLogSearch`, and argued here because the rule at the top of
      this file says a raise is a conversation. THE ARGUMENT IS ON `feeds.svelte.ts`, which took the
      security-relevant half of the change; this entry carries its part.
    */
    /*
      1,333 -> 1,335, 2026-08-30. Two lines, and they are the smallest form this file's growth takes:
      the `roomUserDetail` import and its hand-off to `RoomUserActions`. The entry above already
      records the shape — "the composition root grows by construction whenever a slice is added —
      that is what a composition root is for".

      Flagged for the owner all the same, because the standing rule is that a raise is a
      conversation and this one was made without them. There is no version of adding a server
      capability that costs this file fewer than two lines: one import, one hand-off. The same
      commit lowers `user-actions.svelte.ts` by fifteen and `ScheduledAlerts.svelte` by two.
    */
    /*
      1335 -> 1336, 2026-08-30. One line: `inlineEntry: prefs.loaded.showAlertsEntry === true`, so
      the inline alert box is seeded from the stored preference instead of starting closed every
      time.
    */
    /*
      1336 -> 1345, 2026-08-30. Nine lines: `onlineUserIds` for the private-chat panel (G16), and the
      note saying why the roster is read at recompute time rather than pushed in on three events.
    */
    /*
      1345 -> 1365, 2026-08-30. `notify` for the private-chat panel (G12) and the note on why the
      panel decides WHEN somebody is told while `RoomToasts` decides how — the same split
      `playSound` above it already makes.
    */
    /*
      1365 -> 1382, 2026-08-30. `canPost` and `uploadImages` for the private composer (G13, G1), each
      with the sentence saying which authority it forwards and why this file does not compute one.
    */
    /*
      1382 -> 1390, 2026-08-30. `roomName` and `composerHasFocus` for G27 — the second asked of the
      DOM here so the panel class does not reach into it for a decision.
    */
    /*
      1390 -> 1393, 2026-08-30. Three lines: the `extraChatColumnEnabled` thunk `RoomSplit` now takes
      for `acA-08`, and the note that the COLLAPSE half of the question is the split's own and is
      deliberately not passed.
    */
    /*
      1393 -> 1421, 2026-08-30, for `PA-01`. Two of the lines are executable — the checker's
      construction and the `seen()` beside `setCurrentCaption` — and the rest is the port type.

      `setCurrentCaption: (caption: Caption) => void` **could not express the room falling silent**,
      so the last line anybody spoke stayed pinned over the presentation area for the rest of the
      session. The widening to `Caption | null` is the fix and reads like a loosening, which is why
      it says so where it is declared.
    */
    /*
      1421 -> 1411, 2026-08-30, and it went DOWN while a feature went IN — which is the only shape
      this ratchet is ever pleased by.

      `TODO.md` row AL needed a SEVENTH wire on `RoomMessageActions` (`checkAlertDeletePassword`, the
      `deleteAlertPW` door). With one line of headroom, adding its import and its option would have
      taken this file two lines over. The instruction here is to extract rather than raise, so the
      six wires that were already inline left for `room/message-actions-port.ts` — the shape
      `user-notes-port.ts` and `chat-archive-port.ts` already have — and the seventh arrived inside
      it. Six option lines and an eight-line import block became one spread and one import.
    */
    /*
      1411 -> 1420, 2026-08-31. `QAM-05`'s `closeModal` port, and the note on why it is
      `modals.closeActive()` rather than the `modals.modal = null` its two neighbours use: upstream's
      `modal("hide")` is what fires the `hidden.bs.modal` handler that deletes the alert's `unreadQA`
      marker, and `closeActive` is where that deletion lives here.
    */
    /*
      1420 -> 1435, 2026-08-31 (`TODO.md` row 6). Fifteen lines, of which ONE is code: `kicked` is
      forwarded from the page into `addressedChannelFor`. The other fourteen say why it is the
      PAGE's and not this module's — upstream the kick sets `currPage = "kicked"` on the app root,
      and which of `app-room` / `app-kicked-page` renders is decided one level above either of
      them. Nothing this file owns can make that choice.
    */
    max: 1435,
    /*
      1207 -> 1225, 2026-08-29. Eighteen lines, and seventeen of them are the paragraph explaining
      the other one.

      `rosterViewer` was returned BY VALUE from the composition root, which handed `+page.svelte` a
      snapshot of a `$derived` and made the roster filter stop following presenter elevation. It is a
      thunk now — the same shape `gates` receives twelve hundred lines above. The reason is long
      because the defect was invisible to `svelte-check` and visible to the compiler, and the next
      person to shorten this return needs to know which of those to trust.
    */
    /*
      1205 -> 1207, 2026-08-29. Two lines: the `notes-auth.remote` import and `notesCheck:` passed to
      `RoomUserActions`. Passed BESIDE `commands` rather than inside it because it is not a
      presenter-to-member command — it is a question about this room's configuration.
    */
    why: 'the composition root - 37 constructions and their citations, assembly and nothing else'
  },
  {
    file: 'lib/room/gates.ts',
    /*
      Held at 390 on 2026-08-28, with the file one line under it. `recordingTooltip` stopped reading
      `prefs.loaded` and started reading `sessData`, which is where the reference reads it — and that
      was this class's ONLY use of `RoomPrefs`, so the collaborator went with it: seven injected
      dependencies down to six. The post-mortem moved to `gates.svelte.test.ts`, beside the test that
      could not have caught the bug, which is also what kept the correction inside this number.
    */
    /*
      390 -> 421 on 2026-08-28, and the thirty-one lines are two additions with their evidence.

      `speechRecognitionAvailable` is the room half of the captions gate — one expression, with the
      two byte offsets and the argument for `!== true` rather than `=== false`, because absent means
      NOT disabled and a payload that omits unset settings makes that the only safe reading.

      The rest is a REFUSAL written down at the gate it would have widened. `alwaysShowRoster` has
      two uses upstream; the seed is built, and the second — a third OR-term on the mobile-app icon,
      byte 2,487,668, while the command behind it keeps the two-term gate at 2,529,070 — is declined,
      because reproducing it would put a button in this navbar that opens a modal reading `N/A`
      forever. A divergence that is not written down at the code is a divergence somebody
      "corrects" later, and `always-show-roster-contract.test.ts` asserts that paragraph is still
      there.
    */
    /*
      DOWN one on 2026-08-30. `benzingaUrl` and `benzingaVisible` were separate getters feeding
      separate props, which is how the navbar ended up with two of the three settings and not the
      flag. One accessor answers the whole feature now.
    */
    max: 420,
    why: 'the eighteen view gates; getters not derived fields, so a thunk assigned in the constructor is read at call time'
  },
  {
    file: 'lib/room/typing-signal.ts',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE — and, like every `lib/room/*.ts` module, the
      discovery gate would have refused it without one.

      100 lines for a debounce, and the bulk is why it is a debounce: every keystroke REPLACES the
      pending timeout, which is what makes "five seconds since the last key" fall out rather than
      needing the timestamp comparison the reference also carries. Two frames per burst is the whole
      reason broadcasting this is affordable at all.

      NOTE WHAT IS NOT CAPPED HERE. `lib/server/typing.ts` is the other half and has no entry,
      because this catalog covers `lib/room/*` and `lib/components/**` and nothing under
      `lib/server/`. That is a real gap in the ratchet — the same one components had until this
      morning — and it is named rather than quietly worked around.
    */
    max: 100,
    why: 'the send half of the typing indicator - a debounce that produces two frames per burst'
  },
  {
    file: 'lib/room/trade-alerts.svelte.ts',
    /*
      RAISED 337 -> 504 on 2026-08-30, for the trade-alert conversion — `TODO.md` row AG.

      This is the largest raise in the change and it deserves the most argument. `submit` was
      fourteen lines: a `FormData` loop, ``fetch(`?/${action}`)``, a `deserialize()` and three
      branches that flattened every server refusal into `'Unable to save.'`. It is two lines now. The
      167 lines are everything that replaced the parts of it that were WRONG rather than merely
      untyped:

        - `send` on the feed descriptor, with a `switch` per feed over three imported commands. The
          endpoint is no longer assembled at runtime, and a deleted command is a build error at the
          line that calls it rather than a 404 that surfaced as "Unable to save";
        - `TradeAlertMutationValues`, replacing `Record<string, string | number>`. Every key is
          named, the two id keys are separate — so a Day Trade composer cannot hand a `swingAlertID`
          to a Swing command and have it silently ignored — and `direction` carries its union;
        - `draftFrom` and `idFrom`, which are `swingAlertFieldsFrom` and
          `Number(formData.get('swingAlertID'))` arriving from `+page.server.ts`. They did not
          disappear when the actions left; they moved to the edge that now holds the values, and
          `+page.server.ts` fell by 704 lines in the same change.

      Roughly half of the growth is comment, and the two paragraphs that could not be dropped are the
      ones a later reader would otherwise undo: why `TradeAlertMutationValues` is one optional-field
      shape rather than a discriminated union (there is no discriminant — `Action` is a class type
      parameter, not a per-call literal), and why a missing field is a loud throw rather than `?? ''`
      (the old default existed so the server schema could refuse it a round trip later).

      The alternative on offer was splitting the file. It was refused: `TradeAlertFeed`, the two feed
      constants and the class are one mechanism, and the whole justification for this file existing
      is that the two features differ ONLY in that descriptor — a split would put half the evidence
      for that claim in another file.
    */
    max: 504,
    why: 'ONE class, two instances, and the two three-command dispatches that are the only difference'
  },
  /*
    ── THE SWEEP, 2026-08-28: THIRTY-SIX COMPONENTS THAT HAD NEVER BEEN CAPPED ────────────────────

    Four components were found uncapped in two days — `NoteEditor` at 1,546, `NotesPane`,
    `PrivateChatPanel` and `RoomSidebar` — each discovered by happening to touch it. The fourth
    entry said that was not four oversights but a mechanism failing, and named the fix. This is it.

    THE MEASUREMENT THAT MADE THE CASE. `lib/room/*.ts` modules are DISCOVERED by the block near the
    foot of this file, so a module cannot exist without a ceiling. Components were a hand-kept list,
    and the list was **12 of 48**. Three quarters of this application's components had no ceiling at
    all, including `AlertChatArea` at 1,113 lines and `RoomMessage` at 949 — the second and fourth
    largest Svelte files in the repository. Every Phase 5 slice that pushed work into any of them was
    uncapped, which is exactly the growth this file exists to stop.

    `every component is discovered and capped` now enforces the same rule components have needed all
    along: a `.svelte` file under `lib/components/` cannot be added without saying what too big means
    for it. Adding an entry by hand is no longer how a component gets covered; it is how a component
    gets ADMITTED.

    WHY THIRTY-SIX ENTRIES ARRIVE AT MEASURED SIZE AND NOT AT AN ARGUED ONE. Each is what the file
    measures today, which is `PresentationArea`'s own rule — "the number's job is to stop the next
    200 lines, not to pass judgement on the existing 1,181". Thirty-six invented targets would be
    thirty-six numbers nobody could defend, and the first one that failed would be raised on the
    grounds that it was arbitrary, which is how a ratchet dies. These are floors to descend from.

    WHAT THIS SWEEP IS NOT. It is not a claim that any of these files is the right size. The three
    worth naming are `AlertChatArea` (1,113 — the alerts/chat column, and the extraction the
    `buildMessageChrome` note has been pointing at since it was written), `RoomMessage` (949 — the
    component that type exists to serve) and `RoomNavbar` (922). Each of those is its own change
    with its own evidence, and none is bundled here: a sweep that also refactored would be
    impossible to review.

    CORRECTION, 2026-08-28: this paragraph first called `RoomNavbar` "the ONE component with neither
    a mount nor an SSR render test, which `todo-next.md` has carried for weeks". **That was false.**
    `room-navbar-render.test.ts` and `room-navbar-contract.test.ts` both existed, and `TODO.md:679`
    said so; `todo-next.md` carries the stale line and it was believed rather than checked. It is
    corrected in place rather than deleted, because a wrong claim that simply disappears teaches
    nobody why it was made. The navbar's real gap was a MOUNT test, and
    `components/RoomNavbar.svelte.test.ts` closed it.
  */
  {
    file: 'lib/components/AlertChatArea.svelte',
    /*
      1113 -> 1114, 2026-08-28. ONE line: the `onaction` payload widened from a two-member union to
      the shared `MessageActionEvent`, which now also carries a copyable order.

      Widening to the SHARED alias rather than adding a third member by hand is the fix that keeps
      this from recurring — this file had its own copy of that union, and a fourth payload would
      otherwise have to be added here too.
    */
    /*
      1114 -> 1165, 2026-08-28 — the typing indicator. The indicator's markup, three props and the two composer handlers. Most of the growth is the
      citation for what is NOT drawn: `app-typing-indicator-dots` and its `.typing-indicator` class
      have no rule in any stylesheet this repository holds, so emitting three empty spans would be
      markup with no consumer — the check `smallerImagePreview` failed.
    */
    /*
      RAISED 1165 -> 1188 on 2026-08-29, for `doChatLogSearch`, and argued here because the rule at the top of
      this file says a raise is a conversation. THE ARGUMENT IS ON `feeds.svelte.ts`, which took the
      security-relevant half of the change; this entry carries its part.
    */
    /*
      1,188 -> 1,200, 2026-08-30. The private-chat entry point in the MAIN column was ungated while
      the identical control in the extra column was not — `gates.showPmButton` existed, and this
      component had no prop for it, so a free-trial member in a room with `disablePMForTrials` was
      refused in one column and offered it in the other. Twelve lines: the prop, its docblock and
      the `{#if}`.
    */
    /*
      1200 -> 1211, 2026-08-30. The presenter-colour map: one prop, one import, and the same
      `presenterColorsFor(...)` lookup on each of the two `RoomMessage` call sites — beside the
      `followedUsers` lookup it sits with, because they are the same kind of thing. The map is
      shared by every message; the lookup is per message, so neither belongs on the chrome.
    */
    /*
      1211 -> 1242, 2026-08-30. The composer's `paste` handler and its prop.

      The filter itself is three lines because the RULE moved to `#lib/pasted-image.ts` — where it
      replaced three separate copies, one of which had drifted into taking the FIRST image instead
      of the reference's last. What stayed here is the one thing that cannot: `canPostImages` is a
      page gate, so the refusal has nowhere else to live.
    */
    /*
      1242 -> 1394, 2026-08-30. The inline alert entry — `acA-01`, a checkbox that controlled nothing.

      The field itself is fifteen lines of markup, decoded with `app-alerts`' own consts (20, 52, 53)
      and meeting a stylesheet that was already bridged and waiting for it. The rest is the two
      handlers and the reason they are not the chat composer's: **Enter posts, ALT+Enter is the
      newline, and SHIFT+Enter does nothing at all** — the exact opposite of the box one column over.

      The key RULE itself is not here: it was written inline, then extracted to
      `#lib/inline-alert-key.ts` so a test could execute it rather than copy it.
    */
    /*
      1394 -> 1496, 2026-08-30, for four rows on this surface at once: `acA-04`, `acA-07`, `acA-11`
      and `acA-12`, plus the place `acA-08`'s inner form is rendered.

      The executable changes are small and the transcriptions are not, which is the ratio this file
      is supposed to produce. `acA-07` is one `&&`: the archive control's gate had said
      `isPresenter && !isLimitedPresenter` in this file's own comment since the block was written
      while the code applied half of it — the exact shape `CLAUDE.md` names, "every comment claiming
      X is checked still matches the next line". `acA-12` moves four clicks from the `<a>` to the
      `<li>` and records that the private-chat button is bound on the `<a>` in BOTH applications, so
      a later consistency pass does not undo a measurement. `acA-11` adds the `&nbsp;Chat` label and
      says why it is `&nbsp;` and not a space.
    */
    /*
      1496 -> 1523, 2026-08-31. `ACA-06`'s three controls forwarded to `ChatSearchBar`, with the note
      on why they arrive as props rather than being derived from the flags this component already
      holds: it holds two of the four terms those gates need, and re-deriving a gate from a subset
      is how two answers to one question come to disagree.
    */
    /*
      1523 -> 1533, 2026-08-31 (ECP-02), and this pane's gap was found by a row raised against the
      OTHER column. Ten lines, two of them the gate. Its own docblock quoted the same expression with
      the same missing half; the argument is in `ExtraChatPane.svelte` and this carries a pointer
      rather than a second copy, because two columns are one behaviour and the reason they drifted is
      that each was read alone.
    */
    /*
      1,533 -> 1,543, 2026-09-01. One prop and its docblock, forwarding `ACA-06`'s save control to the
      toolbar. The note is what earns the lines: this prop is UNGATED where `onchatarchive` beside it
      is presenter-only, because upstream nests the archive button inside the save span and puts the
      gate there. A reader adding a gate here for consistency would remove a control from every
      member.
    */
    max: 1543,
    why: 'the alerts/chat column - the largest component after ModalHost, and the next extraction target'
  },
  {
    file: 'lib/components/AttachDepsProbe.svelte',
    max: 39,
    why: 'a probe: proves {@attach} re-runs on dependency change, and nothing else'
  },
  {
    file: 'lib/components/BindThisProbe.svelte',
    max: 42,
    why: 'a probe: proves bind:this resolves before the effect reads it'
  },
  {
    file: 'lib/components/BootboxDialog.svelte',
    /*
      132 -> 146, 2026-08-30. RS-07's other half: the four labels rendered, with the defaults that
      keep every existing caller identical. The two buttons were hardcoded `OK` and `Cancel`.
    */
    /*
      146 -> 214, 2026-09-01. `bootbox.prompt({inputType: "radio", inputOptions})` — the variant
      `downloadLog("chat")` opens, byte 1,415,703.

      Sixty-eight lines for one branch, and most of them are the reasons. Three are worth the entry:
      the radio group is a FIELD on the existing prompt rather than a fourth `mode`, because that is
      bootbox's own shape; the `message` is rendered as text and not `{@html}`, though the capture's
      value is a `<p>` wrapper, because admitting HTML into a dialog body for a tag nobody sees is a
      trade this repository does not make; and NOTHING is preselected, which is upstream's `o && …`
      guard read back — a default would turn a mis-click into a download of the whole chat history.
    */
    max: 214,
    why: 'the dialog primitive this repository uses in place of bootbox'
  },
  {
    file: 'lib/components/ReactionPrefsPane.svelte',
    /*
      The user-settings modal's two reaction-notice checkboxes, extracted 2026-08-30.

      A real slice rather than a convenience: these two share one gate apiece, one consumer, and
      nothing at all with the alert-sound boxes they sat beside. `setInputChecked` is copied rather
      than shared — four lines whose only reason to exist is that `bind:checked` over a plain
      `Record` loses every race with the DOM, and sharing it would mean a module for a closure.
    */
    max: 100,
    why: 'the two reaction popups and the two room settings that decide whether they exist'
  },
  {
    file: 'lib/components/RestreamPane.svelte',
    /*
      The session-control modal's Restream tab, extracted 2026-08-30 with SC-12 and SC-13.

      It was twenty lines of `ModalHost.svelte` and this contract is what made it a component:
      ModalHost is capped, ceilings only go DOWN, and the rule's own words are "extract a slice
      rather than raising this number". The slice is real — this pane owns one value, seeds it from
      one place and writes it to one place, and its three tab neighbours share none of that.

      Most of the file is the WHY. Both defects it fixes were invisible on screen: a textarea that
      opened empty on a room with a destination already set, and two buttons that wrote the room's
      restream URL as the pressing viewer's own preference, which nothing read.
    */
    max: 107,
    why: 'the Restream tab - one seeded value, the rtmp validation, and the room-level write'
  },
  {
    file: 'lib/components/SessionHistoryPane.svelte',
    /*
      The session-control modal's Session History tab, extracted 2026-08-30 with SC-14 and SC-17.

      `source-size-contract` is what moved it, and the sequence is the point: SC-17's gate and its
      evidence added 79 lines to `ModalHost.svelte`, ceilings only go down, and prose is never
      trimmed to hit a number — so something had to leave instead. This pane was the right thing to
      send, because it owns three pieces of state, one fetch and nothing else, and none of its six
      tab neighbours touch any of them.

      SC-01 is what it fixes and the fix is preserved here: `No session history.` used to render
      unconditionally above a `Load History` button with no `onclick` at all.
    */
    max: 146,
    why: 'the Session History tab - three pieces of state, one fetch, and both of upstream branches'
  },
  {
    file: 'lib/components/CloseSessionPane.svelte',
    max: 105,
    why: 'the session-control close pane'
  },
  {
    file: 'lib/components/CompactMessageRow.svelte',
    max: 78,
    why: 'app-st-compactmessage - one private-message row, shared by the panel and the modal'
  },
  {
    file: 'lib/components/ConnectivityModal.svelte',
    /*
      Created 2026-09-01 and capped at what it landed at — `app-webrtc-troubleshooter`, extracted
      from `ModalHost.svelte` when the `#all-user-pm-modal` transcription took that file 14 lines
      past its ceiling. Named as the next extraction by that entry twice before, on 2026-08-30.

      A clean seam rather than a slice cut to make a number: the host keeps `open` and nothing else,
      and this component reads nothing the host reads. The four remaining props are pass-through.

      It is a COMPONENT and not a snippet because of the `$effect`. Closing the modal must stop a
      run — an abandoned `RTCPeerConnection` holds its TURN allocations for the page lifetime, and
      an orphaned timer writes `failed` into a test that is no longer running — and the state that
      teardown releases has to live beside the effect that releases it.

      If this climbs, the question is whether it has started deciding something beyond its own two
      tests. The ICE-server policy is the one to watch: `#lib/server/media-grant.ts` mints them and
      this file must keep only the reporting of which set ran.
    */
    max: 894,
    why: 'the Connectivity/Mic Troubleshooter: network test, mic test, recorder and playback'
  },
  {
    file: 'lib/components/EmojiPicker.svelte',
    /*
      703 -> 894, 2026-08-30, for six rows at once — `EMOJI-06` through `EMOJI-12` — and the ratio is
      the one this file exists to produce rather than apologise for.

      `EMOJI-09` is the largest and the least visible. `emoji-data.ts` holds 1,821 entries and this
      built every one of them synchronously, inside a click handler, before the popover could paint;
      the reference commits three categories with the third capped at sixty cells and lets the rest
      arrive on the next macrotask. Reproducing that is fifteen lines and explaining WHY the cap is
      indexed `s-1` rather than written as 2, and why the timer is cleared where upstream leaks it,
      is the rest.

      `EMOJI-08` earns its lines twice over. The class was hardcoded dark; computing it needs
      `MediaQuery`, whose constructor calls `window.matchMedia` — so it is built behind upstream's
      own `typeof matchMedia === 'function'` guard, WITHOUT WHICH THIS COMPONENT THROWS where the
      reference degrades to the light palette. That was found by mounting it in jsdom, and the
      paragraph recording it is what stops the guard being tidied away as defensive.

      `EMOJI-06`'s docblock is a deletion argued rather than a transcription: upstream's `!this.query`
      guard is NOT reproduced, because a negative control that deleted it stayed green and the reason
      turned out to be real — `runSearch` returns null for an empty and for a whitespace-only query,
      so the result check already covers it. Upstream's `SEARCH_CATEGORY.emojis` does not have that
      property, which is why the guard is right there and redundant here.
    */
    max: 894,
    why: 'the emoji chooser and its captured category strip'
  },
  {
    file: 'lib/components/ExtraChatPane.svelte',
    /*
      543 -> 567, 2026-08-28 — the typing indicator. The extra column's own copy of the indicator and its two handlers. Its OWN channel, which is the
      whole reason it is a second copy rather than a shared one.
    */
    /*
      RAISED 567 -> 586 on 2026-08-29, for `doChatLogSearch`, and argued here because the rule at the top of
      this file says a raise is a conversation. THE ARGUMENT IS ON `feeds.svelte.ts`, which took the
      security-relevant half of the change; this entry carries its part.
    */
    /*
      586 -> 596, 2026-08-30. The presenter-colour map, exactly as `AlertChatArea` takes it — one
      prop, one import, one lookup at the call site. This column renders the same rows, so a map
      handed to one and not the other would paint the same message two ways in one room.
    */
    /*
      596 -> 597, 2026-08-30. One line: `extraChatMsg={true}` on the row this column renders, which
      is RM-16's other half. `urlwrapImg` takes it as its fourth argument and the gif placeholder's
      id becomes `gifExtra_<id>` — this pane is the only place in the room that can supply it.
    */
    /*
      597 -> 626, 2026-08-30, for `acA-04`: this column's own `showChatToolbarExtended` and Mod Only
      switch, plus the rename of `onsettings` to `ontoggletoolbar`.

      The rename is most of it. The prop opened the settings modal, which is not what the reference's
      chat gear does — `toggleChatToolbar()`, byte 1,435,047 — and a prop whose name says one thing
      while its handler does another is how the next reader wires the wrong one.
    */
    /*
      626 -> 640, 2026-08-30, for `EMOJI-10`, which is fourteen lines of comment and one attribute.

      The picker was mounted with no `popoverId` while its trigger advertised `ngb-popover-extra`, so
      `portalPopover`'s `querySelector` found either nothing — leaving the popover at the hardcoded
      inline transform it ships with — or, when the MAIN column's picker was also open, that column's
      trigger, and positioned this popover over the wrong composer. Three other call sites pass a
      matching id; this was the one that did not, which is why the audit filed it as a `defect`.
    */
    /*
      HELD AT 640 on 2026-08-31 while the column gained four fixes, and that is the whole point of
      the two entries below.

      `XCP-01` (the composer holder wears the capture's own id again, so `app.css`'s whole
      `#textAreaHolder` family and the container query reach it), `XCP-02` (the `\xa0Chat` brand
      label, byte 2,367,381), `XCP-03`/`XCP-04` (Alt+Enter inserts a newline instead of sending, and
      a send closes the emoji picker) and `XCP-05` (two captured attribute tables that were never
      applied) all landed WITHOUT the number moving.

      No markup could be extracted to pay for them: four contract tests name strings inside every
      candidate slice — `emoji-picker-contract` the emoji trigger and picker,
      `extra-chat-column-contract` the textarea id, the RTE button, the `chatDisabled` and
      `webinarMode` blocks and the chrome prop, `authority-gate-contract` the `showPmButton` gate,
      `typing-indicator-contract` the indicator markup. So what moved was the REASONING, into
      `lib/extra-chat-surface.ts` and `lib/chat-composer-enter.ts`, which is the third thing this
      file's `+page.svelte` entry describes: "moving an explanation to the code it explains is the
      extraction itself." Nothing was shortened to hit the number; every relocated paragraph is in
      one of those two modules verbatim, and each is pointed at from the line it left.
    */
    /*
      640 -> 685, 2026-08-31, for `XCP-08` — the "Play YouTube For All" button, absent since this
      column was built, so a presenter could send a video to the room from one chat column and not
      the other.

      **The prop is optional and its PRESENCE is the gate**, which is this column's own design
      rather than a shortcut: it is handed each entitlement's RESULT and deliberately not
      `isPresenter` (`#lib/extra-chat-surface.ts` carries that argument and named this very prop as
      the reason the row was blocked). A `boolean` beside a `() => void` would have put one gate in
      two places and let them disagree.
    */
    /*
      685 -> 722, 2026-08-31, for `ACA-05` — the `paste` binding this column has had upstream since
      it was written, and whose absence here rested on a measurement of the WRONG compiled copy.

      The refusal that stood in `chat-paste-image-contract.test.ts` said the reference binds paste on
      the main composer's textarea and reads `#textAreaTxt` by id, so a second column would seed from
      the first column's box. Both halves are false of `app-extra-chat`: const 61 carries `paste`,
      `cMe` at byte 2,373,521 binds it, and that component's own `onImagePaste` reads
      `ui("#textAreaTxtExtra")`. Each column reads its own box; there was never a shared one.

      The handler's docblock also records that upstream's `canPostImages` guard sits INSIDE the
      `if(s)` block here where `app-chat`'s opens with it — behaviourally identical, and noted so a
      reader comparing the two copies does not think one was transcribed loosely.
    */
    /*
      722 -> 744, 2026-08-31. `ACA-06`'s TWO controls for this column — and the paragraph recording
      that the third, Detach Chat, is absent by the const tables' own arithmetic rather than by
      oversight. A reader finding two here and three in the main column needs that sentence.
    */
    /*
      744 -> 762, 2026-08-31 (ECP-02). Eighteen lines, of which TWO are the gate: a `chatChannelUp`
      prop and `{#if !chatEnabled || !chatChannelUp}`.

      This column's own prop docblock has quoted `O(23, o.isConnected && o.chatEnabled ? 23 : 24)`
      verbatim since it was written, `isConnected` included, and the gate below it read `chatEnabled`
      alone — a comment claiming what the next line does not do, which is the one thing the root
      standard asks a reviewer to check for. A member whose channel had dropped kept a live-looking
      composer, typed into it, pressed Enter and watched nothing happen.

      The sixteen remaining lines argue why the prop is SEPARATE rather than folded into
      `chatEnabled`: the private-chat refusal (`G13`, `if (!this.canPost)`) reads `chatEnabled` alone
      upstream, so folding the channel in would start refusing private messages on a dropped room
      channel — a behaviour the reference does not have. And why it defaults TRUE, which is the
      reference's own `this.isConnected=!0` (byte 2,375,326) and the only safe default: `false` would
      announce that chat is off in every render that omits the prop.
    */
    /*
      762 -> 772, 2026-09-01. One prop and its docblock, forwarding `ACA-06`'s save control to the
      toolbar. The note is what earns the lines: this prop is UNGATED where `onchatarchive` beside it
      is presenter-only, because upstream nests the archive button inside the save span and puts the
      gate there. A reader adding a gate here for consistency would remove a control from every
      member.
    */
    max: 772,
    why: 'the second chat column; thirteen of its props are message chrome passed through'
  },
  {
    file: 'lib/extra-chat-surface.ts',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE, 2026-08-31.

      `app-extra-chat`'s decoded const tables and the decisions this room has made about them. Three
      exported values with real consumers in `ExtraChatPane.svelte`, and the arguments the component
      had no line to hold — including the three gaps it cannot close from inside itself: the absent
      YouTube button, the entire missing component stylesheet, and the `ngClass` this room refuses.
    */
    /*
      279 -> 309, 2026-08-31. `XCP-08` was BUILT and left `EXTRA_CHAT_MEASURED_GAPS`, and the
      measurement stayed: what the button must look like is what a later edit can get wrong, so
      deleting the citation when the gap closes is how a transcription drifts from its source with
      nothing left to compare against. The paragraph that explained why it could not be built from
      inside the component is now the paragraph explaining how its gate works.
    */
    max: 309,
    why: 'the second chat column`s decoded const tables and the decisions taken against them'
  },
  {
    file: 'lib/chat-composer-enter.ts',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE, 2026-08-31 — TWICE, ON TWO BRANCHES.

      What Enter does in a chat composer, once. It exists because the composers this repository owns
      disagreed about the same captured branch, and two parallel audits then created this module
      independently and disagreed about it AGAIN. The merge is where that was settled, by reading the
      bytes rather than either sentence:

        `e.shiftKey?(i.val(i.val()),this.autoExpand(`      the value assigned to ITSELF — a no-op
        `e.altKey?(i.val(i.val()+"\n"),`                   the value plus a newline

      Verified at 1,439,821 (the room composer), 2,208,387 (private chat) and 2,386,131 (this
      column), character for character apart from the jQuery alias and the element id. **Shift+Enter
      does nothing**; only ALT inserts. One branch had described those same bytes as "both modifiers
      make a line break", and its version of this file — and the ceiling of 78 that came with it —
      described a rule the reference does not have.

      78 -> 86 is therefore not a relaxation: it is the surviving file's own size. The version the
      78 capped never shipped, and shortening the version that did would mean deleting the six-offset
      table that is the reason it is right. From here it ratchets down like everything else.
    */
    max: 86,
    why: 'the captured three-way Enter branch, defined once for both composers'
  },
  {
    file: 'lib/components/FilesPane.svelte',
    /*
      557 -> 586, 2026-08-30, for `FP-03`, `FP-05` and `FP-12` — and `FP-12` is nearly all of it.

      That row is not "a comment has a typo". The comments in this file cited const indices from
      `app-presentationarea.full.js`, a capture **this repository does not hold**, so every index in
      them was unverifiable by anybody but their author while reading as verified. Three were wrong.
      They name the pinned v4 bundle and its offsets now, `files-pane-rows-contract.test.ts` decodes
      that table and CHECKS them, and the sentences saying which numbers were stale are kept —
      because a correction with no record of what it corrected is one somebody re-derives.
    */
    max: 586,
    why: 'the Files tab - the list, the sort bar and the upload control'
  },
  {
    file: 'lib/components/GifConfirmDialog.svelte',
    /*
      50 -> 66, 2026-08-30. `note-editor-gif-insert-confirm`.

      Sixteen lines, fourteen of them the reason a `message` prop exists at all: the note surface
      asks `You sure you want to insert this image:` (byte 1,482,885) where the chat composer asks
      `…post this image:`, and this one component serves both. The default is the chat string, so the
      surface that already had this dialog is unchanged.
    */
    max: 66,
    why: 'the one confirmation between picking a GIF and inserting or posting it'
  },
  {
    file: 'lib/components/GiphyPicker.svelte',
    /*
      153 -> 216, 2026-08-30. Two audit rows, and most of the addition is why.

      `note-editor-giphy-search-button` — const 88 is used TWICE in the capture
      (`d(12,"span",88)` then `d(14,"span",88)`), and only the clear half was here, so a search could
      be started only by pressing Enter with a visible affordance beside it that did the opposite.

      `note-editor-giphy-hint-text` — `app-note` says `insert it` where three other surfaces say
      `select it`, and this one component serves all four. A `hint` prop with the majority string as
      its default; the entry carries the four offsets and the reason the words are not
      interchangeable.

      The rest is the two-word divergence from the capture on the new span (`text-white` for
      `text-dark`, and `fa-2x`), which matches its own sibling rather than the reference because this
      picker is a dark popover where the reference's is a light modal.
    */
    max: 216,
    why: 'the GIF search grid, its search and clear pair, and the one word that varies by surface'
  },
  {
    file: 'lib/components/ImageUploadDialog.svelte',
    max: 126,
    why: 'the composer image dialog, instantiated per feature rather than shared'
  },
  {
    file: 'lib/components/MobileRestorePane.svelte',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE, which is what admits a component to this list.

      The troubleshooter's Mobile App pane — `PAe` @ 2,438,242, which is one paragraph and one
      button and nothing else. It is 131 lines because almost all of it is why: the copy is verbatim
      including its missing full stop, `.mobile-app-container` carries no rule anywhere and is worn
      regardless, and the sentence this pane composes is the one thing here deliberately NOT
      transcribed — upstream alerts "Command sent successfully…" on the statement after the transmit,
      unconditionally, to a member who by this pane's own copy is not getting notifications.
    */
    max: 134,
    why: 'the Mobile App pane; it composes the sentence upstream raises over nothing'
  },
  {
    file: 'lib/components/Modal.svelte',
    /*
      158 -> 182, 2026-08-31, for `ASR-3` — one line of code and the paragraph that makes it safe to
      keep.

      Bootstrap's modal plugin calls `_element.focus()` on show and this room ships no Bootstrap
      JavaScript at all, so every dialog opened without taking focus: a keyboard user's next Tab
      started outside it and a screen reader announced nothing.

      **The ORDER is the part that is not obvious and would break silently.** `inert={!open}` is
      bound on the same element and an inert element cannot be focused; this works only because
      Svelte runs `$effect` after DOM updates have been applied, which the official documentation
      states outright. Moving the call anywhere that runs earlier makes it a no-op with no error.

      One line in ONE component rather than 22 call sites, which is exactly why it was right to wait
      for a session that owned this file.

      Six of the twenty-four lines are the `svelte-autofixer` decline: it raises "calling a function
      inside an `$effect`" once each for `focus()`, `blur()` and `contains()`, and all three are DOM
      manipulation — which Svelte's own `$effect` documentation names as what effects are for. A
      decline with its reason at the code is what stops the next reader, holding the same three
      suggestions, "fixing" it.
    */
    max: 189,
    why: 'the modal shell every captured modal is rendered through'
  },
  {
    file: 'lib/components/PollPanel.svelte',
    /*
      825 -> 896, 2026-08-30, for `poll-03`, `poll-07` and `poll-08`.

      `poll-03` is the biggest of the three and the least visible: the pie was DRAWN on
      `min(w,h)/2 - 10` and its labels PLACED at 32% of the container box in each axis. The box is
      `width: 100%` by a fixed `300px`, so the labels traced an ellipse round a circle — outside the
      pie left and right, inside it top and bottom. One `pieRadius()` now answers both, and the
      contract counts the expression to make sure it stays one.

      `poll-07` is four lines of code and fifteen of why: the snap goes through `panel-drag.ts`'s
      `clampAndSnap` rather than being written out here, so this panel — the one floating panel in
      the room that rolls its own pointer handling — shares the tolerance with the private chat and
      the webcam holders instead of carrying a second copy of 20.
    */
    /*
      884 -> 898, 2026-09-01. Const 49's loader path is transcribed literally now. The lines are the
      measurement that made it possible: `..` cannot rise above the root, so the reference's
      `../../assets/…` and this app's old `/assets/…` are the same request from every depth served.
    */
    max: 898,
    why: 'the poll UI - author, vote and results in one captured component'
  },
  {
    file: 'lib/components/PostAlertModal.svelte',
    /*
      RAISED 494 -> 522 on 2026-08-28, for `hasAlertScheduler`, and argued in place.

      The send-later PANE is not here: `ScheduledAlerts.svelte` holds the three command calls and the
      manage table, born capped in the same commit (and since 2026-09-01 the date field, the repeat
      and the weekend flag are one level further out, in `ScheduledAlertFields.svelte`).
      What this file gained is one `{#if schedulerAvailable}` block, one prop with its docblock, and
      the paragraph saying why the gate is drawn here AND enforced on the server.

      That is the shape this ratchet is meant to allow. The alternative was the reference's own
      layout — the fields inline in the composer and a second modal beside it — which would have put
      roughly two hundred lines into the file that was already one line from its ceiling.
    */
    /*
      522 -> 609, 2026-08-30. The Alert Labels picker — `PAM-01`, and the producer for a consumer
      that had already shipped: the room parsed the setting and rendered the badges, so a configured
      label worked only if the presenter typed `#DayTrade` by hand.

      Most of the addition is the decode. `zTe` at byte 2,119,145 with its consts read out of
      `app-post-alert-modal`'s own table, the `O(62, …length > 0 ? 62 : -1)` gate at 2,138,428 that
      puts it between Non-trade and Linked Room Alerts, and two properties that read as mistakes and
      are the shipped markup: the id is INDEX-based and the label text ends in a question mark.

      One deliberate divergence, argued at the code: the selection lives in a `SvelteSet` here rather
      than as `checked` on the room's shared parsed table, which is where the reference keeps it.
    */
    /*
      609 -> 652, 2026-08-30. PAM-05 — Post Alert and Send Later are MUTUALLY EXCLUSIVE, and both
      were on screen.

      `O(71, showSendLater ? -1 : 71)` at byte 2,139,561 is the whole finding: the reference REMOVES
      Post Alert while the scheduler is open. This room rendered the scheduling pane inline and kept
      the green button beside it, so a presenter who had filled in a date and a repeat could still
      send the alert immediately — losing the schedule they had just typed, with nothing to say so.
      The five gates that make it one decision with two answers are transcribed at the markup, which
      is most of the addition. Five more lines for PAM-11's `onconfirm`, threaded through to the
      scheduler pane, which does not own the room's dialog stack.
    */
    max: 657,
    why: 'the alert composer and its per-open resets'
  },
  {
    file: 'lib/components/PositionsContainer.svelte',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE — named by the discovery gate, not remembered.

      75 lines for two elements, and the bulk is the timer's reasoning: why the stamp is `$state` and
      not a `$derived` over `Date.now()` (a derivation would re-fetch the owner's page on every
      unrelated invalidate, and this page invalidates every five seconds), and why the refresh is a
      conjunction of two gates rather than one.

      If this number climbs, the thing to check is whether it has started deciding WHETHER to show —
      it is mounted behind that gate and only ever decides WHEN to reload.
    */
    max: 75,
    why: 'app-positions-container - an owner iframe and its thirty-second reload'
  },
  {
    file: 'lib/components/PositionsControls.svelte',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE, beside its sibling above.

      Two buttons whose only state is their label. The manual refresh is a prop callback rather than
      state here, because the container owns the stamp and a button that owned it would be a second
      thing deciding when an owner's page is fetched.
    */
    max: 45,
    why: 'the Show/Hide Positions toggle and the manual reload beside it'
  },
  {
    file: 'lib/components/PresenterMuteRows.svelte',
    max: 143,
    why: 'the per-presenter volume and mute rows'
  },
  {
    file: 'lib/components/RichTextEditor.svelte',
    /*
      192 -> 191, 2026-08-31 (RTE-01). The placeholder rule grew the second empty shape a cleared
      `contenteditable` actually takes, and `clearFormatting()` — a four-line wrapper around one
      `run('removeFormat')` call, where its four sibling buttons already call `run` inline — went
      back to the call site it had. Net one line down, which is the direction this list moves.
    */
    max: 191,
    why: 'the chat RTE, gated on three flags rather than one'
  },
  {
    file: 'lib/components/ReplyModal.svelte',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE — `every component is discovered and capped`
      refused it until it had a number, which is the third time this repository has been TOLD about
      an uncapped component rather than finding one by accident.

      218 lines, of which the markup is ninety-four and the script's CODE is about thirty: two state
      fields and four small functions. It left `ModalHost.svelte` when `RPL-01`…`RPL-03` put that
      file over its own ceiling, and it is a natural seam rather than a slice made to fit a number —
      upstream it is a whole component (`selectors:[["app-reply-modal"]]`, byte 2,324,180, 23
      declarations and 4 variables), it owns one composer and one picker, and it reads nothing the
      host reads.

      If this number climbs, the thing to check is whether it has grown a DESTINATION. Where a reply
      or an image goes is not this component's business: it raises `onReplySend` and
      `onReplyImagePaste` and the page decides. A branch here that picks a sender is the mistake
      `QAM-05`'s prescribed fix would have been, one component over.
    */
    max: 218,
    why: 'the public reply to one message - its composer, its picker and its image path'
  },
  {
    file: 'lib/components/RoomBranding.svelte',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE — and this one did not need remembering, which is
      the point of the change three commits ago. `every component is discovered and capped` failed
      the moment this file appeared, named it, and would not go green until it had a number. That is
      the first time this repository has been TOLD about an uncapped component rather than finding
      one by accident.

      92 lines, of which the markup is nine. The rest is the citation for `changeFavicon` and
      `addCustomCSS`, the argument for why two of its three pieces are declarative and two are not,
      and a refuted security claim kept in place rather than deleted.

      If this number climbs, the thing to check is whether it has started DECIDING what to apply.
      `room-branding.ts` resolves both settings; this file applies the answers.
    */
    max: 92,
    why: 'the room favicon and stylesheet applied to document.head; nine lines of markup'
  },
  {
    file: 'lib/components/RoomMessage.svelte',
    /*
      949 -> 1032, 2026-08-28, and eighty-three lines is the largest single addition this file has
      taken. `copyTrades`.

      WHAT THEY ARE: the trade branch of `bodySegments` (a span carrying `role`, `tabindex`, a click
      and a keydown, plus its twelve-line citation), the `trade` member of `BodySegment` with the
      `children` field that makes it a WRAPPER, the split of `parseBodySegments` into an outer pass
      and `parseLabelsTickersAndLinks`, and the chrome prop.

      TWO THINGS IN THERE ARE NOT TRANSCRIPTION AND ARE WHY THE COMMENTS ARE LONG. The order of the
      passes is the capture's and is load-bearing — upstream rewrites the marker BEFORE the symbol
      and link pipes run, so a `$TICKER` inside an order is still coloured, which is the whole
      reason a trade segment wraps segments instead of carrying a string. And the span is a
      keyboard-reachable control here where upstream binds a click to a bare `<span>` and checks
      `tagName` inside the handler.

      If this number climbs again the extraction is the same one it has always been: `bodySegments`
      and its four parse functions are a module with a component wrapped around them.
    */
    /*
      1032 -> 818, 2026-08-28, and it is the biggest single drop this entry has taken.

      The kebab menu left: 143 lines of markup, the two element refs and the whole popper placement
      effect, plus twelve near-identical three-line gate derivations collapsed into one call to
      `messageMenuAllows`. It went because `altChatRender` needs a SECOND renderer whose menu is the
      same twelve entries with the same twelve gates, and copying that block would have been twelve
      entitlement rules written out twice.

      **THE MOVE IS VERIFIED, not asserted.** `room-message-render.test.ts` pins all 18 captured
      kebabs with their exact labels and source order, the `msgMenu dropright pt-1` class string and
      `dropdown-menu users-dropdown-options`; it was run green immediately before the extraction and
      immediately after. It could only be run at all because the same day's fix to
      `gate/evidence-bound-tests.mjs` stopped excluding it over a comment.
    */
    /*
      818 -> 1008 in the SAME commit that took it to 818, and the pair is one change rather than a
      raise chasing a drop.

      The kebab left (-214) and the COMPACT RENDERER arrived (+190). `altChatRender` forces
      `app-st-compactmessage`, which is the same message laid out on one line in two mirrored
      variants — `msg-box msg-box-adm` in `flex-row-reverse` for a presenter, plain `msg-box` running
      the other way for a member — and the member row is the only place the trial badge, the new
      indicator and the membership stars appear.

      WHY IT IS A BRANCH HERE AND NOT A SECOND COMPONENT. Every value the compact layout renders is
      already derived in this file: the behaviour, the twelve gates, the four styles, the parsed body
      segments, the reactions, the badges. A sibling component would have taken ~35 props and
      duplicated ~200 lines of derivation — which is the cost `room-message-chrome.ts` exists to
      describe. What IS shared went out properly: `MessageMenu.svelte`, because the menu is the one
      part with twelve entitlement gates on it.

      **The file is smaller than it was this morning** (1032), and the captured-DOM contract that
      pins the card layout ran green throughout.
    */
    /*
      1008 -> 1061, 2026-08-30. The presenter's colours, and one defect they uncovered.

      The wiring is small: a prop, and two derived values that let the presenter's pair override the
      message's own `backgroundColor` / `fontColor` — which is exactly where the reference applies
      them, four lines after `msg.bkgColor` sets the same three slots. That placement is what makes
      the full four-way precedence fall out with no new branch, and the comment explaining it is
      most of the addition.

      THE DEFECT: the kebab's inversion colour and the box's background were two separate
      expressions and only one of them read `effectiveStyle`, so a followed user whose message also
      carried a background got a kebab inverting a colour that was nowhere on screen. The comment
      beside it already said it should be *"color: <box background>"*. It is one derived value now.

      The extraction, if this climbs again, is still `bodySegments` and its four parse functions.
    */
    /*
      1061 -> 1078, 2026-08-30. `showMenu`, and the paragraph saying what `false` costs.

      One caller passes it and forty do not, so it defaults TRUE and the contract asserts the
      default before it asserts the suppression — a prop that defaulted the other way would strip
      the kebab from the whole room silently.
    */
    /*
      1078 -> 1270, 2026-08-30. Eight rows of the surface audit, and most of the addition is why.

      RM-01 is the structural one: TWO HOSTS, one per mode, which is the reference's own split —
      `app-st-message` and `app-st-compactmessage` are two components with two `styles:[…]` blocks,
      and this rendered both modes inside the card's host so the compact branch wore the card's
      stylesheet. The date separator became a `{#snippet}` so there is still exactly one of it, which
      `alert-chat-style-contract` asserts and is right to.

      **NOT a component per mode, and that is the same trade this file records for the note editor's
      toolbar.** The compact branch reads two dozen values off this component — every gate, both
      formatters, the menu's allow-list, six style deriveds — and a component taking those as props
      would be two dozen props whose only purpose is to reach back here. The seam the REFERENCE draws
      is the host element and its stylesheet, and that is exactly what crossed:
      `lib/styles/compact-message.css`.

      The rest: RM-02 the compact alerts row (its `short` date and the Ask-a-question button), RM-03
      the two colour classes the compact body was missing, RM-04 the add-reaction pill, RM-07
      `questionColor` on alerts, RM-13/14/24 three invented values removed.

      If this grows again the seam is the BODY SEGMENTS renderer — `bodySegments` and the six segment
      kinds it switches on are one concern, they take a segment list and nothing else, and they are
      already a snippet.
    */
    /*
      1270 -> 1213, 2026-08-30, and it is a DROP taken while adding six more audit rows. This entry
      has named an extraction three times without taking one; the ratchet is what finally forced it,
      and both seams turned out to be the reference's own rather than ours.

      TWO MODULES LEFT, 245 lines between them:

      `message-body-segments.ts` — `parseSymbols`, `parseLinks` and `parseStock`, which upstream are
      PIPES. That is Angular's word for exactly what they are: pure transforms of one string that
      every body-rendering template shares. Inline here, the only way to ask what `foo$AAPL` produces
      was to render a whole message row with a dozen props and read the markup back; RM-06 needed
      precisely that question asked eight ways. `tickerColorStyle` (RM-21) went with them, because
      the colour a `stockColor` span carries is resolved by `parseStock` itself.

      `message-styles.ts` — `invertTxtColorToggler` and the four-source precedence above it, which
      upstream is ONE METHOD with a mode argument, called by both renderers. Ninety lines of
      `$derived` here meant the four-row answer table in `presenter-colors.ts` had no function to
      point at. Two of its returns had no consumer at all and did not survive the move.

      The note above was right that a component per mode is the wrong seam and is still right. The
      seam was never the markup — it was the three PIPES and the one style METHOD that the reference
      had already factored out and we had not.

      Six rows landed in the same commit: RM-06 the ticker's word-boundary guard, RM-08 the compact
      menu's three divergent labels, RM-10 the padded admin stamp, RM-11 the four nodes
      `presenterMsgsOnTheRight` paints, RM-12 the compact reaction strip, RM-21 the ticker's own
      colour precedence, plus RM-25 — the compact reply block, which was wearing the answered tick's
      two classes.

      If this climbs again: the BODY SEGMENTS renderer is still the next seam, and it is now the only
      large one left — six segment kinds, a segment list in, markup out, already a snippet.
    */
    /*
      1214 -> 1123, 2026-08-30, in the same commit: RM-05 landed (+27, and every line of it is the
      recorded reason for a behaviour CHANGE), and the seam the paragraph above had just named was
      taken rather than deferred a fourth time.

      `MessageBody.svelte` is the segment renderer — six kinds, five props, none of them a gate. The
      revealed-gif map went with it and is now per BODY rather than per message, which is closer to
      the reference than the shared map was: a gif quoted in a reply and the same gif in the line
      below it are two placeholders upstream, not one.

      RM-05 is what the extraction paid for. Both renderers gate the admin/member split on
      `"alert" != o.logType` — SINGULAR, against log types that are `alerts`, `chat` and `pc`. That
      is settled by enumeration rather than by reading one site: every `logType` literal in the
      bundle is 32 `alerts`, 23 `chat`, 3 `pc` and exactly 2 `alert`, which are those two dead
      comparisons. So upstream's gate is `msg.isA`, our `kind === 'chat'` term was invented, and an
      admin's ALERT now takes the reversed admin card as it does upstream.

      Nothing large is left to extract here. What remains is one message's props, its gates, its two
      hosts and their two class lists — which is what this component IS.
    */
    /*
      1,124 -> 1,260, 2026-08-30, and this is a RAISE against a number set four hours earlier in the
      same day's work. It is recorded as one rather than worked around.

      **The day's net is still DOWN: this entry opened today at 1,270.** Fourteen audit rows closed
      between those two numbers, three modules and a component came out, and the file is eleven lines
      smaller than it started. That is the number that matters for a ratchet, and it is why this is a
      raise rather than a failure of the rule.

      WHAT THE 135 LINES ARE. RM-16, RM-20 and RM-22 — and RM-22 is four separate class-list findings
      on the card (the badges wrapper, `justify-content-end` on the admin body row, the reply block's
      whole shape, and two reaction containers that are different ELEMENTS with different classes).
      Every one of them is a difference nothing on screen announces, so the transcription of the
      const table that proves it is the deliverable, not decoration. Roughly 120 of the 135 lines are
      those four citations.

      ONE DUPLICATION WENT WHILE THEY LANDED: the Ask-a-question button was written out twice,
      character for character, exactly as the reference has it twice (compact const 69, card const
      70, the same eleven-entry array). It is a parameterless `{#snippet}` now — parameterless
      because every value it reads is this component's, which is the test of whether a snippet is the
      right tool rather than a component.

      **THE NEXT SEAM, and the condition that makes it right.** It is the one this entry has argued
      AGAINST twice: `CardMessage.svelte` and `CompactMessage.svelte`, which is the split the
      reference itself draws (`app-st-message` and `app-st-compactmessage` are two components with
      two stylesheets). The objection has always been the two dozen values the branches read off this
      file. That objection is now most of the way to answered: `resolveMessageStyles` returns the
      five styles as one object, `messageMenuAllows` returns the twelve gates as one, and
      `room-message-chrome.ts` already carries the sixteen that come IN. When the remaining loose
      derivations — `reverseMessage`, the two segment lists, `visibleBadges`, the two formatters'
      call sites — are folded into one resolved view type, the split costs three props and stops
      being a trade. **Do that before this number is raised again.**
    */
    /*
      1260 -> 1259, 2026-08-30, and the extraction is the whole reason it went DOWN while six audit
      rows landed in it.

      `RMSG-01` … `RMSG-06` are six places `app-st-message` and `app-st-compactmessage` disagree,
      four of which are a single text literal or a single binding section. Written out here they came
      to about 130 lines of argument-about-the-bundle sitting inside markup, which is the shape this
      ratchet exists to refuse: the only way to ask "what does the compact row do differently?" would
      have been to render one. They are `lib/message-renderer-differences.ts` now, with their
      consumers — `alertQaCountText`, `TRIAL_BADGE_TEXT`, `usernameRowStyle` and three measured
      constants the contract test asserts against — and the markup carries a pointer each.

      What paid for the rest: the compact branch's reaction strip was a SECOND copy of
      `reactionStrip`, differing only by an inner gate that the container's own gate already implies
      (in the reference as well as here — `b_e`'s `O(36, …)` entails `g_e`'s `O(3, …)`). One snippet,
      three call sites.

      1259 -> 1255, 2026-08-31 (MSB-03), and it falls because a DUPLICATION left rather than because
      anything was extracted. Two interfaces at the top of this file — `MessageReactionPayload` and
      `TradeCopyPayload` — were local re-declarations of types in `#lib/types.ts`, the second under a
      comment saying so in as many words. They stayed structurally compatible by luck; the luck ran
      out when `MessageActionEvent` gained a fourth member and this file could not describe it. The
      prop and `runAction` both take the shared union now.
    */
    max: 1255,
    why: 'one message, thirty-five props, and the file the chrome type exists to serve'
  },
  {
    file: 'lib/components/NavbarTalkingIndicator.svelte',
    /*
      `NPe` and `LPe` — the talking cluster and its "( No one is speaking )" sibling, with the image
      that flips between `talking.gif` and `notalking.png` on the server's `presenterTalking` flag.
      Came out of `RoomNavbar.svelte` on 2026-09-01, which fell 1,171 -> 1,093 with it.
    */
    max: 134,
    why: 'the navbar talking indicator - both arms, and the flag that chooses between them'
  },
  {
    file: 'lib/components/NavbarRecIndicator.svelte',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE, which is what admits a component to this list.

      The room's recording badge — slots 18, 19 and 20 of the navbar template `U4e`, consts 92/93/94.
      92 lines for nine of markup, because the three arms carry four things a reader would otherwise
      have to re-derive: the gates from `U4e`'s update block, why `[ REC ]` and the starting spinner
      are mutually exclusive upstream by an explicit term where this room decides it by `{:else if}`
      ORDER, why the tooltip is handed in whole rather than composed, and that `breathing-rec` on the
      badge is OURS — the reference's one binding of `iPe` is on the presenter's recording icon.

      If this number climbs, ask whether it has started DECIDING anything. It must not: it reads
      `RoomMedia` and renders one `li`, and every control the bar carries is on the other side of
      that line.
    */
    /*
      93 -> 109, 2026-08-31, and the CODE got shorter — a class map became a plain class list and a
      prop went away entirely. Every added line is the `NAV-08` record.

      `breathing-rec` on the room-wide `[ REC ]` badge was OURS. `UPe` (byte 2,474,097) renders that
      `li` from const 93 and binds exactly one thing on it, `ngbTooltip`; `iPe` (byte 2,465,900) is
      bound ONCE in 2,891,205 bytes, at 2,477,678, onto the presenter's own recording icon. So the
      pulse is a presenter's cue and this bar showed it to every member — visible on every screen,
      since `.breathing-rec` is a 5s scale pulse plus `color: red !important`.

      `blinkingRec` left with it. Its only reader was that class, and a prop named for an owner
      setting kept with no reader is one the next person gates something on — which would look
      correct and reinstate exactly this defect.
    */
    max: 109,
    why: 'the three REC badges the whole room sees, and the one class that is ours'
  },
  {
    file: 'lib/components/NavbarSoundCloud.svelte',
    /*
      195 -> 201 IN THE MERGE THAT CREATED IT, 2026-08-31, and the six lines are two corrections.

      Not an established file growing. The 195 capped a version that lived for one commit on a
      branch, and two of its properties were wrong when it met the rest of the repository:

        the listener's id     it rendered `cssSoundCloudIcon`. Const 176 declares `id` twice and
                              Angular's `setUpAttributes` (`H0`, bundle byte 16,054) calls
                              `setAttribute` once per string pair with no de-duplication, so the
                              SECOND wins. The first name never reaches the document.
        its keyboard route    the arm had no `role`, `tabindex` or accessible name, so the only
                              control that stops the room's music for one listener could not be
                              reached from a keyboard. Those three attributes are this room's, and
                              they were asserted here before this file existed.

      Three attributes and three comment lines is the whole of it, and the argument that would
      otherwise have made it longer was moved to `navbar-decoded-rows-contract.test.ts`, which is
      what asserts it. From here it ratchets down like everything else.

      DECLARED IN THE COMMIT THAT CREATED THE FILE, which is what admits a component to this list.

      BOTH of the reference's SoundCloud items — the presenter's dropdown (slot 22, const 96) and the
      listener's stop-for-me control (slot 23, const 97), which this room had never built. 195 lines
      for about 60 of markup: the rest is the `playing.gif` decision, which had to be made once and
      is now made once for both arms, and const 176's two refusals — the duplicated `id` and the
      `aria-haspopup`/`aria-expanded` pair that belong to a dropdown this element is not.

      Two things to check if it climbs. Has it started deciding WHICH arm to render? It must not —
      the reference's two gates are not each other's negation (`!scPlaying` is in one and not the
      other), so the call site owns them and the component takes a literal variant. And has a third
      variant appeared? That would mean the bar has a third SoundCloud item, and it does not.
    */
    max: 201,
    why: 'both SoundCloud items in the top bar, and the one playing.gif decision behind them'
  },
  {
    file: 'lib/components/NavbarTipButton.svelte',
    /*
      DECLARED IN THE COMMIT THAT CREATED THE FILE, which is what admits a component to this list.

      RS-09's NAVBAR copy — slot 14 of `U4e`, consts 139/140/35/36 — extracted from `RoomNavbar` in
      the change that added `NAV-02` and `NAV-04`, because the bar was at its declared ceiling and
      this was the largest region of it that no other contract test pins by source text.

      58 lines for eleven of markup. What the rest buys is the `noopener,noreferrer` refusal:
      `doTipToUser()` at byte 2,531,860 opens the owner-configured URL with two arguments and leaves
      `window.opener` live, and that is a tabnabbing surface this room does not reproduce.
    */
    max: 59,
    why: 'the navbar half of the tip button, and the opener refusal that is not the reference s'
  },
  {
    file: 'lib/components/RoomNavbar.svelte',
    /*
      922 -> 935, 2026-08-29, and the thirteen lines are a BROKEN IMAGE and its replacement.

      This file rendered `/assets/images/playing.gif` whenever SoundCloud was playing and that asset
      is not in this repository - a sweep of every `/assets/**` reference found exactly one missing
      file, this one. The string IS in the captured bundle, so the markup was a faithful
      transcription; only the JavaScript and CSS were ever captured, never the images. Every member
      saw a broken image in the navbar on every play.

      What grew is the note, not the code: the element is still one line. The note records the
      precedent it follows (`benzinga-logo.png`, resolved the same way in `RoomSidebar.svelte`), why
      `fa-volume-up` is not a pick, and the ONE thing a future reader would otherwise redo - that
      FA6's `fa-beat` fits and does not exist in the 5.8.1 that ships here, so reaching for it would
      add a class with no effect. That is a rediscovery cost, which is what this repository's
      comments are for.
    */
    /*
      935 -> 1008, 2026-08-29, for the NAVBAR copy of Benzinga — a second render of the feature that
      upstream has and this room had only half of.

      `NEW-TODO.md` §2.2 listed one thing outstanding: the const-table classes. Reading them produced
      a finding the row did not contain — there are THREE render functions in the bundle. Two are the
      sidebar component compiled twice; the third, `PPe` at 2,473,150, is a different element with
      different classes in a different container, and nothing here had it.

      Seventy-three lines for eighteen of markup, and the rest is the two things a reader will
      otherwise re-derive or undo: the const indices (parsed with a string-aware walker, because an
      index is per component and the sidebar's `li` is index 32 of a table where that means a generic
      `nav-item`), and the extra `&& benzingaLogoUrl` condition. Upstream's item is image-only with a
      hard fallback to an asset this repository does not have, so the faithful transcription is a
      broken image in every unconfigured room's navbar — the `playing.gif` defect that is fixed
      forty lines further down this same file.
    */
    /*
      DOWN 2 on 2026-08-30, while GAINING the room setting it had been missing. The Benzinga item
      rendered on a URL and a logo with no `hasBenzingaNews` term at all; the three settings now
      arrive as ONE prop, so a surface cannot take two of the three and forget the third.
    */
    /*
      1,006 -> 1,063, 2026-08-30. G04, G12 and G13 — and the screenshare menu left in the same pass.

      The three rows added a click and a keydown to each speaker name (the reference binds a click
      to a bare span; a span is neither focusable nor keyboard-reachable, so the role and the key
      handler are ours for the same reason the trade-order span's are), the two gestures const 79
      declares on the users counter, and the gate that had been applied to the sidebar badge and not
      to the navbar — `rosterCountVisibleToViewers`, an owner setting leaked one element away from
      where it was honoured.

      G05, G06 and G07 added three entries to the screen-sharing dropdown, which put this file 186
      lines over. `ScreenShareMenu.svelte` is the answer and the seam is real rather than
      convenient: a self-contained control with its own open state, its own six entries and its own
      gates, whose every prop is an INPUT rather than a value it reaches back through the navbar to
      read. That is the test `RoomMessage.svelte`'s entry records for the split it refused.

      1,097 -> 1,137, 2026-08-30. RS-09 — the tip button, which the reference renders TWICE and this
      room had once. `APe` at byte 2,472,922 is the navbar's `<li>`; `aPe` is the sidebar's `<p>`,
      and `tip-button.ts` was written expecting both — its docblock says "the two call sites read
      `tip.visible`" while only one existed. It sits immediately before Benzinga, which is
      `O(14, isTipEnabled ? 14 : -1)` followed by `O(15, hasBenzingaNews ? 15 : -1)`.

      1,063 -> 1,097 in the same commit: G08's MEASURED REFUSAL, thirty-four lines and every one of
      them the reason. The reference switches the talking indicator between `talking.gif` and
      `notalking.png` on `mediaService.presenterTalking`, and that flag is written by two
      subscribers to a SERVER-relayed command this room's server does not send. Building the branch
      means an image that can never show or one that always shows; neither is the reference. The
      note also settles a loose end the audit row raised — `notalking.png` ships here with no
      consumer, and this is why.

      A refusal costs lines exactly once and saves the next reader a re-derivation, which is the
      trade this file exists to make. It is not licence for the next one.
    */
    /*
      1,137 -> 1,172, 2026-08-30, for SC-14. Thirty-five lines, and thirty-two of them are the
      reason: this is the ONE item in the presenter block whose gate upstream is not `isPresenter`,
      and the whole change is that gate.

        O(29, !isPresenter && !user.hasMic || isLimitedPresenter ? -1 : 29)   byte 2,489,576
        f4e -> `Session Control`

      The `!isLimitedPresenter` term is the part that needs the citation. It looks redundant beside
      `isPresenter || hasMic` and is not: `giveMicScreen` assigns
      `globals.user.isPresenter = globals.isLimitedPresenter = e.give`, so a runtime grant satisfies
      the first term, and upstream deliberately withholds room administration from exactly those
      people. A reader without that quotation deletes the term as dead weight.

      WHY NOT AN EXTRACTION. There is nothing here to extract — the change is one `{#if}` moved and
      the citation that keeps it. The extraction this commit DID make went the other way and is why
      the raise is defensible: `SessionHistoryPane.svelte` took 120 lines out of `ModalHost.svelte`,
      which ABSORBED the same feature's other 79 lines and still lands at 6,280 against an unchanged
      ceiling of 6,335. **The pair is eighty-five lines smaller than doing neither.**
    */
    /*
      1,173 -> 1,169, 2026-08-31, and the drop is what a whole-region decode costs when the file is
      already at its ceiling. Four rows went IN — `NAV-02` (the listener's SoundCloud control),
      `NAV-03` (the hamburger's `alwaysShowRoster` gate), `NAV-04` (`breathing-rec` on the
      presenter's recording icon) and `NAV-07` (`nav-link` on the two launching spinners) — and
      three regions went OUT to pay for them, each to a file that now owns its reasoning:
      `NavbarRecIndicator.svelte` (the three REC badges), `NavbarSoundCloud.svelte` (both SoundCloud
      items) and `NavbarTipButton.svelte` (RS-09's navbar copy).

      The seams were chosen by what is PINNED, not by what is tidy. The recording dropdown, the
      talking indicator, the volume panel, the mic and webcam controls and the Benzinga item are each
      asserted against this file's source text by a contract test elsewhere — `recording-reminder`,
      `dump`, `screen-volume`, `media-capture`, `mechanical-rename`, `benzinga-navbar` — so moving one
      of them would have gone red in a file that batch was not scoped to edit. What was left unpinned
      was exactly these three, and all three are self-contained.

      ## A SECOND BATCH EXTRACTED THE SAME REGION IN PARALLEL, and this is the one that survived

      An earlier audit the same day split the SoundCloud region two ways instead —
      `SoundCloudMenu.svelte` and `SoundCloudViewerStop.svelte`, by audience rather than by feature —
      and reached 1,169 by a different route. Both could not stand: keeping them would have put the
      same markup in the tree twice.

      This one survived on MEASUREMENT, not on taste. Its `RoomNavbar` also builds `NAV-04` and
      `NAV-07`, which the other does not: the `breathing-rec` class on the presenter's record dot,
      and `class="nav-link"` on the microphone and webcam launching spinners. Keeping the audience
      split would have dropped two built behaviours to keep a seam, and a seam is not worth a
      behaviour. The deleted pair's argument — that `NAV-02` is a row about those two controls being
      confused, so one file holding both hosts the confusion it documents — is recorded here because
      it is a real cost of this choice rather than a point against it.
    */
    /*
      1169 -> 1172, 2026-08-31. Three lines on the `blinkingRec` docblock recording that `NAV-08`
      removed the badge's copy of `breathing-rec` and the prop that fed it, so the correction sits
      where the prop is declared rather than only in the register.
    */
    /*
      1172 -> 1094, 2026-09-01, and this one FALLS. `NPe` and `LPe` left for
      `NavbarTalkingIndicator.svelte` when `G08` needed a second image the ceiling would not admit —
      the third seam this bar has produced, after `NavbarRecIndicator` and `NavbarSoundCloud`, and the
      third time the refusal produced the better arrangement rather than a smaller comment.
    */
    max: 1094,
    why: 'the top bar; its render cover is RoomNavbar.svelte.test.ts and room-navbar-render.test.ts'
  },
  {
    file: 'lib/components/ScreenPane.svelte',
    /*
      441 -> 471, 2026-08-30. The watermark span, its prop, and thirty lines of why.

      Two of those paragraphs are load-bearing rather than decorative: the span sits INSIDE
      `#video-screen-container-{id}` because the captured `.video-screen-container { position:
      relative }` is what its `bottom: 50%` is measured against, and because that container is what
      `toggleFullscreen` fullscreens — a watermark outside it is clipped away in exactly the state a
      recording would be made in. The contract asserts that by NESTING rather than by line order.
    */
    /*
      471 -> 678, 2026-08-30, for four rows at once — `SV-SP-02`, `SV-SP-03`, `SV-SP-04` and
      `SV-SP-10` — and the largest of them is a pane that rendered NOTHING.

      Before this, a screen whose consumer had not arrived showed an empty box: the `<video>` is
      hidden while `stream` is null and nothing stood in its place, so "loading" and "broken" looked
      identical. `StreamingView` has had its `Loading Stream...` counterpart all along.

      Three of the four turn on reading a gate correctly and the comments are mostly that.
      `O(4, isConnected || isPresentingThisScreen || isDetached ? -1 : 4)` is a NEGATION — the line
      shows while NONE of the three holds — and read the other way round it builds a spinner over
      every screen that IS connected. `isPresentingThisScreen` is false by construction here, which
      the file already said, and the consequence it did NOT say is that a presenter would otherwise
      watch a spinner over their own screen forever.

      `SV-SP-10` REMOVES code and still costs lines: the `volume`/`muted` props are gone and the
      paragraph where they were records why. Const 8 carries `muted` in the static attribute run and
      no `volume` in its binding list, and `newScreenStream` re-asserts `i.muted = !0` twice more —
      the reference makes this element silent three separate ways, and this bound it to the room's
      master volume. Harmless only while `addRemoteScreen` refuses a non-video producer.
    */
    /*
      678 -> 685, 2026-09-01. `data-ng-dblclick="fullScreen()"` is transcribed onto the screen video,
      with the note that it is an AngularJS 1 attribute in an Angular 17 template — dead upstream and
      dead here, which is what makes the exact transcription safe.
    */
    /*
      RAISED 685 -> 727 on 2026-09-01, for `SP2-04` — and it is a RAISE rather than an extraction,
      argued here as this entry's own history requires.

      The row is the local-preview invitation, `W0e`, and it was recorded as *"it cannot be reached
      in this application"*. That was a measurement of a CHOICE this room had made — `#addLocalScreen`
      attached our own capture eagerly, which is what made `isPresentingThisScreen && !localpreview`
      unreachable — read back as a property of the reference. Upstream's default is the invitation and
      the `<video>` stays empty until the presenter clicks. Same shape of error as `G08`'s refusal,
      found the same way: by reading every occurrence instead of trusting the note.

      ## Why not extract

      The feature is about forty lines spread over four files that are already the right four: the flag
      belongs with the other per-screen ids, the invitation belongs with the other status headings,
      the gate belongs with the other gates, and the wiring belongs at the call site. There is no
      slice here that is not one of those four things.

      What WAS extracted is the reasoning. The five readings of `localpreview`, the three writers of
      `isConnected` and every byte offset now live once, in `screen-pane-contract.test.ts`'s `SP2-04`
      block, which re-reads them against the pinned bundle on every run. They were written out four
      times in the first draft of this change; each site now carries the sentence its maintainer needs
      and points at the file that proves it. That is this entry's own rule — *moving an explanation to
      the code it explains is the extraction itself* — applied to a decode rather than to markup.
    */
    max: 727,
    why: 'the screenshare pane and its zoom/stack controls'
  },
  {
    file: 'lib/components/ScheduledAlertFields.svelte',
    /*
      Created 2026-09-01 and capped at what it landed at, extracted from `ScheduledAlerts.svelte`
      when transcribing `XTe` took that file 22 lines past its ceiling.

      PAM-07, PAM-08 and PAM-09 — the date, the repeat and the weekend flag — with the decoded
      consts that argue every label. The three values are `$bindable`, which is the one case Svelte's
      own guidance names for bindings: *"custom input components"*, used *"sparingly and carefully"*.
      `weekendsApply` is derived HERE and not passed in, because it is a pure function of `repeat`
      and this component owns that field now; a prop would be a second copy of a fact the child can
      compute.

      If this climbs, the question is whether SCHEDULING RULES have arrived in it. They must not:
      `#lib/scheduled-alert.ts` owns the arithmetic and is pure.
    */
    max: 141,
    why: 'the send-later date, repeat and weekend fields, decoded from app-post-alert-modal'
  },
  {
    file: 'lib/components/ScheduledAlerts.svelte',
    /*
      Born capped, 2026-08-28, in the commit that created it.

      `hasAlertScheduler`'s whole browser surface: the date, the repeat, the weekend flag, the three
      command calls and the manage table. It exists so that `PostAlertModal.svelte` — one line from
      its ceiling when this was written — took an `{#if}` block instead of two hundred lines.

      The reference splits this in two (`app-post-alert-modal` and `app-scheduled-alerts-modal`) and
      that split is deliberately not reproduced: both halves ask one question — what is already
      scheduled — so two components would refetch the same list and disagree about it after a
      removal. If this number climbs, the question is whether SCHEDULING RULES have arrived in it.
      They must not: `#lib/scheduled-alert.ts` owns the arithmetic and is pure.
    */
    /*
      LOWERED 274 -> 272 on 2026-08-30. `shortDate` was building an `Intl` formatter on every call —
      one locale-data lookup per scheduled alert per render — and now calls the shared `shortWhen`,
      which is built once per page. Two lines out, and a real per-item cost with them.
    */
    /*
      272 -> 317, 2026-08-30. PAM-07, PAM-08 and PAM-09 — a select showing its own storage format,
      a relabelled checkbox, and the note that answers the question the form otherwise raises.

      PAM-09 is the one worth the lines: a `datetime-local` input carries no timezone, so a
      presenter scheduling for 09:00 had no way to know whose 09:00 it is. The reference answers
      that before it is asked and underlines the answer, and the note is TRUE here as well as
      transcribed — the room stores an epoch and `scheduled-alert.ts` fires on it.

      PAM-07's labels live in `scheduled-alert.ts` beside `REPEAT_MODES` as a
      `Record<RepeatMode, string>`, so a mode added without a label does not compile.
    */
    /*
      317 -> 357 in the same commit: PAM-11, the confirm before a schedule and the success alert.

      The DATE is the reason for the question. A `datetime-local` with a typo in it — a month, a
      year, an AM for a PM — schedules an alert to the entire room at a time nobody meant, and the
      only way to notice was to open the manage table afterwards and read it back. Asking quotes the
      date in prose, which is where a wrong one is visible.

      The reference's question ends "send as: <nick> (<email>) ?" and ours does not: PAM-10 refuses
      those two fields, so the clause would quote values that cannot vary and would imply a choice
      the presenter does not have.
    */
    /*
      LOWERED 357 -> 320 on 2026-08-31. The manage table's ROWS are
      `lib/components/ScheduledAlertsTable.svelte`, which is where `SCH-03`, `SCH-04` and `SCH-05`
      landed. The split above is untouched by it — see that file's header for why drawing a row is not
      the question this component refuses to split.
    */
    /*
      LOWERED 320 -> 264 on 2026-09-01, and the ceiling is what forced it. Transcribing `XTe`'s
      "See Scheduled Alerts" control took the file to 342, and this rule's answer at that point is
      EXTRACT, not raise: the three send-later FIELDS are now
      `lib/components/ScheduledAlertFields.svelte`.

      Untouched by it, again, for the reason the table entry gives. The refused split is pane-versus-
      table, and it is refused because both halves ask ONE question — what is already scheduled. The
      fields ask nothing: they are three form controls whose values this component reads to build the
      `alertMsgLater` payload, and upstream draws them in the send-later block of
      `app-post-alert-modal` rather than in the table's component. Splitting there follows the
      reference; splitting pane from table would cut across it.
    */
    max: 264,
    why: 'the send-later pane and the manage table; one question, one component'
  },
  {
    file: 'lib/components/ScheduledAlertsTable.svelte',
    /*
      Created 2026-08-31 and capped at what it landed at, for `SCH-03`, `SCH-04` and `SCH-05`.

      NOT the split `ScheduledAlerts.svelte` refuses. That component argues the send-later pane and
      the manage table are one component because they share one question — what is already scheduled
      — and every word of it still holds: this child asks nothing and owns nothing. The list arrives
      as a prop and the removal leaves as a callback; the fetch, the refetch and the confirmation all
      stayed put. What came out is the DRAWING of a row, which was never part of the question, and
      upstream draws it in its own component (`app-scheduled-alerts-modal`).

      If this climbs, the question is whether the table has started deciding something.
    */
    max: 164,
    why: 'the manage table rows, decoded cell by cell from app-scheduled-alerts-modal'
  },
  {
    file: 'lib/components/ScreenTabs.svelte',
    /*
      RAISED 295 -> 301 on 2026-08-29, for `forceStopScreen`, and argued here because the rule at the top of
      this file says a raise is a conversation. THE WHOLE ARGUMENT IS ON `private-commands.ts`, where
      the largest share of it landed; this entry carries its part of the same change.
    */
    /*
      301 -> 342, 2026-08-30, for `SV-SP-06` — the locked-screen badge.

      The asymmetry is worth the lines because it is what hid the gap: `StreamTabs.svelte` has
      rendered this badge from the same const all along, on the bar where upstream it can never
      appear, while the bar that actually locks screens had none. `lockedScreenId` reached this
      component and was read for exactly one thing — flipping a dropdown item's label — so a locked
      screen showed no indicator anywhere and the only way out was the right item in the right menu.
    */
    max: 342,
    why: 'the screenshare tab strip'
  },
  {
    file: 'lib/components/ScreenVolumeControl.svelte',
    /*
      197 -> 228, 2026-08-29, for the two dropdowns that could not be opened.

      `data-bs-toggle="dropdown"` is Bootstrap's whole mechanism and this app ships no Bootstrap
      JavaScript, so `.dropdown-menu { display: none }` never lifted on the presentation area's
      volume menu or the streaming view's buffer menu. Seventeen other dropdowns had already been
      hand-driven from `RoomMenus`; these two were the two that were missed, and one of them hid
      three `setBufferSize` handlers that a repair the day before had made callable without
      noticing nothing could reach them.

      Here it is an `open` prop and an `ontoggle`, the trigger wrapped onto six lines to carry them, the class turned into an expression, and a handler on the close control inside the heading — which had also never done anything.

      The prose that would otherwise have landed here was moved into
      `bootstrap-dropdown-contract.test.ts` — which is the extraction, and which now fails if a
      nineteenth dropdown arrives without a way to open it.
    */
    max: 228,
    why: 'the per-screen volume slider and the dropdown that now opens it'
  },
  {
    file: 'lib/components/ScreenPaneStatus.svelte',
    /*
      NEW on 2026-08-31, at the size it landed, as an EXTRACTION from `ScreenPane.svelte` rather
      than as new surface: `SP2-03` found the three status headings inside `div.pan-element`, the
      element that carries the zoom transform, where the reference has them as siblings of the pan
      container. Moving them meant they became one thing, and one thing with a shared reason is a
      component. The prose moved with them, which is why this is 112 lines for three `{#if}` blocks.
    */
    /*
      RAISED 112 -> 168 on 2026-09-01, for `SP2-04` — and it is a RAISE rather than an extraction,
      argued here as this entry's own history requires.

      The row is the local-preview invitation, `W0e`, and it was recorded as *"it cannot be reached
      in this application"*. That was a measurement of a CHOICE this room had made — `#addLocalScreen`
      attached our own capture eagerly, which is what made `isPresentingThisScreen && !localpreview`
      unreachable — read back as a property of the reference. Upstream's default is the invitation and
      the `<video>` stays empty until the presenter clicks. Same shape of error as `G08`'s refusal,
      found the same way: by reading every occurrence instead of trusting the note.

      ## Why not extract

      The feature is about forty lines spread over four files that are already the right four: the flag
      belongs with the other per-screen ids, the invitation belongs with the other status headings,
      the gate belongs with the other gates, and the wiring belongs at the call site. There is no
      slice here that is not one of those four things.

      What WAS extracted is the reasoning. The five readings of `localpreview`, the three writers of
      `isConnected` and every byte offset now live once, in `screen-pane-contract.test.ts`'s `SP2-04`
      block, which re-reads them against the pinned bundle on every run. They were written out four
      times in the first draft of this change; each site now carries the sentence its maintainer needs
      and points at the file that proves it. That is this entry's own rule — *moving an explanation to
      the code it explains is the extraction itself* — applied to a decode rather than to markup.
    */
    max: 168,
    why: 'what a screen pane says when it is not showing a picture — the three captured headings'
  },
  {
    file: 'lib/components/ScreenZoomControls.svelte',
    max: 237,
    why: 'the zoom and pan controls over a shared screen'
  },
  {
    file: 'lib/components/SpeechRecoOverlay.svelte',
    /*
      254 -> 245, 2026-08-31. The v4 audit re-decoded this component against the PINNED bundle — its
      const indices were the earlier dump's and six low — and added the `preventDefault` /
      `stopPropagation` the two dismissal handlers make at bytes 1,957,104 and 1,957,875. The
      auto-scroll slack, the `shortTime` formatter, the visibility predicate and that suppression
      all moved to `speech-reco-overlay.ts`, which is what pays for the additions.
    */
    max: 247,
    why: 'the captions overlay and its transcript controls'
  },
  {
    file: 'lib/components/StreamTabs.svelte',
    max: 306,
    why: 'the stream tab strip, including two fields upstream never writes'
  },
  {
    file: 'lib/components/StreamingView.svelte',
    /*
      561 -> 598, 2026-08-29, for the two dropdowns that could not be opened.

      `data-bs-toggle="dropdown"` is Bootstrap's whole mechanism and this app ships no Bootstrap
      JavaScript, so `.dropdown-menu { display: none }` never lifted on the presentation area's
      volume menu or the streaming view's buffer menu. Seventeen other dropdowns had already been
      hand-driven from `RoomMenus`; these two were the two that were missed, and one of them hid
      three `setBufferSize` handlers that a repair the day before had made callable without
      noticing nothing could reach them.

      Here it is the `menus` prop and its import, the trigger, the class expression, and three entries that each grew from one line to four because selecting a level now closes the menu — which Bootstrap used to do. Six more when `prettier` reformatted those three handlers, which is why the number is 598 rather than 592: the repository's own formatter owns that shape, not me.

      The prose that would otherwise have landed here was moved into
      `bootstrap-dropdown-contract.test.ts` — which is the extraction, and which now fails if a
      nineteenth dropdown arrives without a way to open it.
    */
    /*
      598 -> 605, 2026-08-30, and the file gained seven lines while losing a prop.

      `overlayUserIdOnScreenshare` + `userXrefID` + `isPresenter` became one `userIdWatermark`,
      because the gate they spelled out here was the gate `ScreenPane` did not have. What grew is the
      note recording that: a rule with two consumers and one implementation is how the second
      consumer ends up uncovered.
    */
    /*
      605 -> 667, 2026-08-31, for `STV-03` and `STV-06` — the two rows the audit filed BLOCKED on the
      Svelte MCP, which is available for the first time in this session.

      `STV-03` is the raise, and almost all of it is the argument rather than the code. The change is
      one `$effect` becoming two; what needed writing down is WHY it cannot be one with a guard
      inside it. Upstream carries `&& this.hls` on both of its reload paths and `this.hls` is null on
      exactly one — iOS Safari's native HLS, where every number `getHlsConfig()` computes is consumed
      by `new Hls(…)` and so provably cannot reach the viewer. Ours reloaded them anyway, costing
      their buffered range and a jump to the live edge for a setting that could not apply. A single
      effect reading both `videoSrc` and `bufferSizeLevel` cannot tell which dependency woke it, so
      any guard written inside it suppresses the first load too — that sentence is the whole reason
      the second effect exists, and it is the sentence a later "simplification" would delete.

      Two further facts are recorded there because they are what make the split correct rather than
      merely different, and neither is visible from the code: that `getHlsConfig()`'s read of
      `bufferSizeLevel` sits after an `await` and so is NOT tracked (Svelte's `$effect` docs are
      explicit), and that the new effect's first run is a no-op because `hls` is still null at mount
      — a guard doing the work a `mounted` latch would otherwise have to, and stay in step with.

      Twenty-one of the sixty-two lines are the three `svelte-autofixer` declines, written down
      because this is the first session in which that tool could be run at all. One of them is not
      stylistic: replacing `bind:this` with an attachment here would tear the `<video>` handle down
      and rebuild it per effect re-run, which is precisely the behaviour `STV-05` measured and
      refused to diverge from. A decline with its reason at the code is what stops that being
      "tidied up" by the next reader holding the same suggestion.
    */
    max: 689,
    why: 'the hls.js player, its buffer control and the quality picker'
  },
  {
    file: 'lib/components/ToastHost.svelte',
    max: 65,
    why: 'the toast container'
  },
  {
    file: 'lib/components/VideoPlayer.svelte',
    /*
      LOWERED 414 -> 412 on 2026-08-31, and it absorbed five rows on the way down.

      `VID-01` REMOVED about ninety lines: the two `bootbox.dialog` calls were hand-copied
      `<div class="bootbox modal fade show">` markup with no backdrop, no focus move and no focus
      restore, and `BootboxDialog` — with the `footer` snippet that exists for exactly this — does all
      three. `VID-06`'s validation ladder went to `#lib/video-list.ts` with the storage half beside it.
      What came back was the account of both, which is the half worth keeping.
    */
    max: 412,
    why: 'the video-only player'
  },
  {
    file: 'lib/components/YoutubePlayerOverlay.svelte',
    /*
      RAISED 62 -> 89 on 2026-09-01. `(i?`start=${i}`:"")`, byte 1,503,354 — the seek the reference
      appends to a late joiner's embed, and which this room could not build until room media state
      existed to derive it from.

      Twenty-seven lines for one conditional, and twenty-four of them are why: it goes on the
      VIDEO-ID form only (a playlist seek would be a seek into whichever item is first, which nobody
      asked for), and it is `i ? … : ""` rather than `start=0`, so the request every member present
      at a live play makes is unchanged. Both are the capture's choices and both are the kind a
      cleanup normalises away.
    */
    max: 89,
    why: 'the YouTube-for-all overlay'
  },
  {
    file: 'lib/components/day-trade-alerts/DayTradeAlertForm.svelte',
    /*
      357 -> 361, 2026-08-30, for `dta-01`: the `flashNonce` prop, its docblock and the
      `{@attach flashOnEdit(flashNonce)}` on the form element. The reasoning is in
      `#lib/flash-on-edit.ts`, which is where the byte offsets and the counter-versus-boolean
      argument live.
    */
    max: 361,
    why: 'the day-trade alert composer form'
  },
  {
    file: 'lib/components/day-trade-alerts/DayTradeAlertsPane.svelte',
    /*
      583 -> 623, 2026-08-30, for `dta-01` / `dta-02` / `dta-03`: the flash nonce, the `modal-lg`
      lightbox and its Download Image footer, with the citation for why that footer is the dialog's
      ONLY button. Two modules came out in the same commit — `flash-on-edit.ts` and
      `download-image.ts` — and the second took a method off `RoomModals` that never belonged there.
    */
    /*
      623 -> 638, 2026-08-31, for `DTP-02` — five `{' '}` mustaches and the measurement behind them,
      the second of the two rows this pane had filed BLOCKED on the Svelte MCP.

      Fifteen lines for five characters, and the ratio is the point. The reference writes six of the
      row's eight cells with `ɵɵtextInterpolate` and exactly two with `ɵɵtextInterpolate1` — ours
      honoured that split everywhere it mattered and lost it on those two, plus the heading's and the
      empty state's block edges. The comment records which four of the heading's spaces survive
      compilation and which two do not, so the next reader does not re-measure; and it states the
      honest half — every one of the five is invisible on screen and is carried anyway, because
      every capture comparison in this repository diffs RENDERED STRINGS.
    */
    max: 639,
    why: 'the day-trade alerts tab'
  },
  {
    file: 'lib/components/notes/NoteTabContent.svelte',
    /*
      151 -> 146, 2026-08-31, NTC-1/2/3: the Welcome Mat badge and its captured sentence, four
      attributes that make the gear reachable, and the six menu rows folded into one snippet.
      `note-tab-chrome.ts` came out in the same change carrying the constant, the two activations,
      the rename attachment and the measurements behind all three rows.
    */
    max: 135,
    why: 'one note tab and its read-only view'
  },
  {
    file: 'lib/components/swing-alerts/SwingAlertForm.svelte',
    /* 327 -> 331, 2026-08-30. The swing twin of the four lines on the day-trade form above. */
    max: 331,
    why: 'the swing alert composer form'
  },
  {
    file: 'lib/components/swing-alerts/SwingAlertsPane.svelte',
    /*
      538 -> 578, 2026-08-30. The swing twin of the day-trade pane raise above, line for line: these
      two panes are one behaviour in two components, and the whole point of `dta-01` … `dta-04` is
      that all four rows were missing from BOTH.
    */
    /*
      578 -> 589, 2026-08-31. `SWP-01`, the swing half of `DTP-02` — the same five nodes, and eleven
      lines rather than fifteen because the measurement and the rendered-string-versus-pixels split
      are argued once, on the day pane, and pointed at from here.
    */
    max: 590,
    why: 'the swing alerts tab'
  },
  {
    file: 'lib/chat-composer-key.ts',
    max: 136,
    why: 'ACA-01/ACA-02: what Enter does in the chat composer, measured on both compiled copies, and the one leaf this room diverges on'
  },
  {
    file: 'lib/alert-chat-nav.ts',
    max: 83,
    why: 'ACA-03/ACA-04: the poll indicator class map, on the anchor the update block actually selects, and the refused trailing icon'
  },
  {
    file: 'lib/message-renderer-differences.ts',
    max: 183,
    why: 'RMSG-01..06: where app-st-message and app-st-compactmessage disagree, with the consumers beside the measurements'
  }
];

/*
  A BACKSTOP UNDER THE CAPS, because a per-file number can be raised one commit at a time until it
  means nothing, and nineteen slices is enough commits for that to happen without anyone noticing.

  It counts CODE lines, and that is a CORRECTION made on measurement in slice 4 rather than a
  convenience. As first written it counted total lines against 800, on the reasoning that
  `split.svelte.ts` at 724 was the honest maximum. That was wrong in a way worth recording, because
  the gate pushed against the root standard:

    file                       total   code   comment
    lib/room/split             724     300    352  (49%)
    lib/room/files             382     165    188  (49%)
    lib/room/media-transport   1416    615    699  (49%)

  Half of every module here is citation, because "the comments are the asset" and a rule with no
  recorded WHY gets simplified back into the bug it was fixing. A TOTAL-line backstop therefore pays
  an author to delete the asset: strip 620 lines of evidence from `media-transport` and it passes,
  having become strictly worse. Counting code makes that move worth nothing — deleting a comment
  does not change the number at all — while still refusing a module that has genuinely grown too
  much logic. That is the gate getting stricter about the thing it was always meant to measure.

  800 CODE lines is the same limit expressed in the right unit: `user-actions.svelte.ts` at 524 is
  the largest committed module by code, and 800 leaves room to receive one slice without leaving
  room to hide one.

  A module that reaches this has stopped being a module. The answer is a real domain seam, not a
  bigger number here — and "there is no seam" has to be shown, not asserted. For
  `media-transport.svelte.ts` it was: every one of `#enableMicrophone`, `toggleMicrophone`,
  `toggleWebcam`, `startScreenSharing`, `promptForScreenName`, `stopLocalScreen` and
  `#addLocalScreen` reads `#mediaSession`, because acquiring a track and producing it into the SFU
  is one act, not two. The only members that touch no session state are `#stopStream`,
  `#setStreamEnabled`, `#reportCaptureError` and `selectedVideoDeviceId` — 67 lines. A split there
  would put `#sharedScreens` and `#screenStreams`, which the local and remote paths BOTH write,
  across a file boundary; `dropRemoteMedia`'s own citation records what happened the last time two
  collections holding one truth drifted apart.
*/
const MODULE_CODE_BACKSTOP = 800;

const lineCount = (file: string) => readFileSync(new URL(file, SOURCE), 'utf8').split('\n').length;

/*
  Lines that are neither blank nor comment.

  Deliberately a scanner rather than a parser: it has to agree with what a reader would count, and
  it must never fail open on a file it cannot parse. A `/*` opens a block until `*` followed by `/`
  closes it, on the same line or a later one; anything starting with two slashes is a line comment.
*/
const codeLineCount = (file: string) => {
  const lines = readFileSync(new URL(file, SOURCE), 'utf8').split('\n');
  let inBlock = false;
  let code = 0;
  for (const line of lines) {
    const text = line.trim();
    if (inBlock) {
      if (text.includes('*/')) inBlock = false;
      continue;
    }
    if (text.startsWith('/*')) {
      if (!text.includes('*/')) inBlock = true;
      continue;
    }
    if (text.startsWith('//') || text === '') continue;
    code++;
  }
  return code;
};

/*
  The modules are DISCOVERED, never listed, which is `AGENTS.md` DPE rule 4 applied to the one place
  it matters most here: "prefer a catalog-driven test that discovers its own subjects over a
  hardcoded list, so the next table is covered without anyone remembering."

  A hand-kept list of modules would have exactly the failure mode the block at the bottom of this
  file records twice for `EXTRACTION_SOURCES` — the nineteenth slice creates a module, nobody adds
  the row, and the cap that was the whole point of capping quietly does not exist. Discovery makes
  that impossible: the module appears on disk, the test finds it, and the test fails until somebody
  says what too big means for it.

  `.test.ts` is excluded because a module's own unit test is not the module. The plain `.ts` files
  are INCLUDED — `arrivals.ts` and `scroll-follow.ts` are deliberately not rune modules, and being
  the wrong extension is not a reason to be uncapped.
*/
const roomModules = readdirSync(new URL('lib/room/', SOURCE))
  .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
  .map((name) => `lib/room/${name}`);

/*
  COMPONENTS ARE DISCOVERED TOO, added 2026-08-28, and the delay is the finding.

  The block below has discovered `lib/room/*.ts` since gate 0b, on the reasoning its own comment
  gives: a hand-kept list means the nineteenth slice creates a file, nobody adds the row, and the cap
  that was the whole point quietly does not exist. **Components were exactly that hand-kept list, and
  it failed exactly that way.** Four were found uncapped in two days by happening to touch them, and
  the measurement that prompted this found the real number: 12 of 48.

  RECURSIVE, because components nest. `notes/`, `swing-alerts/` and `day-trade-alerts/` hold six
  between them, and a non-recursive `readdirSync` would have declared victory while leaving them
  exactly as uncovered as before — a gate that reports success over the thing it does not look at is
  worse than no gate.

  `.svelte` only. A `.ts` beside a component (`carousel.ts`, `note-gates.ts`, `safe-html.ts`) is a
  module, and modules are capped by their own rule or not at all; sweeping them in here would be this
  gate quietly claiming a jurisdiction nobody argued for.
*/
function svelteFilesUnder(dir: string): string[] {
  const found: string[] = [];
  for (const item of readdirSync(new URL(dir, SOURCE), { withFileTypes: true })) {
    if (item.isDirectory()) found.push(...svelteFilesUnder(`${dir}${item.name}/`));
    else if (item.name.endsWith('.svelte')) found.push(`${dir}${item.name}`);
  }
  return found;
}

const componentFiles = svelteFilesUnder('lib/components/').sort();

describe('every component is discovered and capped', () => {
  it('found the components it is meant to cap', () => {
    /*
      The vacuity guard, and it earns its place here more than anywhere else in this file: the whole
      point of this block is that nobody has to remember to list a component, so an enumeration that
      silently returned nothing would restore precisely the failure it was written to end — and
      would do it while reporting green.
    */
    expect(componentFiles.length).toBeGreaterThan(40);
    // …and it reaches into the subdirectories, which a non-recursive read would not.
    expect(componentFiles.filter((file) => file.split('/').length > 3).length).toBeGreaterThan(0);
  });

  it('every component on disk has a declared ceiling', () => {
    const capped = new Set(CEILINGS.map((entry) => entry.file));
    const uncapped = componentFiles.filter((file) => !capped.has(file));
    expect(
      uncapped,
      `${uncapped.join(', ')} exists under lib/components/ with no ceiling. A component cannot be added without saying what too big means for it — that is what four components found uncapped in two days, and 36 found uncapped by one measurement, cost. Add an entry to CEILINGS at the size it actually lands, with a why that says what the component IS.`
    ).toEqual([]);
  });

  it('and every declared component ceiling still has a file', () => {
    /*
      The other direction, which the room-module block does not need because a deleted module leaves
      its import broken. A deleted component leaves a ceiling entry that can never fail, and a
      ceiling that cannot fail is the thing `SLACK` and this file exist to prevent.
    */
    const onDisk = new Set(componentFiles);
    const stale = CEILINGS.map((entry) => entry.file)
      .filter((file) => file.startsWith('lib/components/'))
      .filter((file) => !onDisk.has(file));
    expect(
      stale,
      `${stale.join(', ')} has a ceiling but no file. Remove the entry — a ceiling on a file that does not exist is a test that cannot fail.`
    ).toEqual([]);
  });
});

describe('every room module is discovered and capped', () => {
  it('found the modules it is meant to cap', () => {
    // At zero, every assertion below is vacuous - the same guard the reader catalog carries.
    expect(roomModules.length).toBeGreaterThan(0);
  });

  it('every room module on disk has a declared ceiling', () => {
    const capped = new Set(CEILINGS.map((entry) => entry.file));
    const uncapped = roomModules.filter((file) => !capped.has(file));
    expect(
      uncapped,
      `${uncapped.join(', ')} exists in lib/room/ with no ceiling. A module cannot be added without saying what too big means for it - that is the whole point of capping the destination as well as the source. Add an entry to CEILINGS at the size it actually lands.`
    ).toEqual([]);
  });

  it.each(roomModules)('%s is under the backstop', (file) => {
    const actual = codeLineCount(file);
    expect(
      actual,
      `${file} is ${actual} CODE lines against a backstop of ${MODULE_CODE_BACKSTOP}. A module this size has stopped being a module; find the domain seam rather than raising the backstop. Deleting comments will not help — they are not counted.`
    ).toBeLessThanOrEqual(MODULE_CODE_BACKSTOP);
  });

  /*
    The backstop counts code, so its own counter needs a control: a scanner that silently returned
    zero would make every assertion above vacuous and nothing would say so.

    `split.svelte.ts` is the subject because it is the one module whose 49% comment ratio is the
    reason this measure exists at all. Both halves are asserted — code is a real fraction of the
    file, and code plus comment plus blank is the whole file — so neither a counter that counts
    nothing nor one that counts everything survives.
  */
  it('counts code rather than lines, and can tell the difference', () => {
    const file = 'lib/room/split.svelte.ts';
    const total = lineCount(file);
    const code = codeLineCount(file);
    expect(code).toBeGreaterThan(0);
    expect(code).toBeLessThan(total * 0.75);
  });
});

describe('the files that outgrew the standard do not grow further', () => {
  it.each(CEILINGS)('$file stays at or below its ceiling', ({ file, max }) => {
    const actual = lineCount(file);
    expect(
      actual,
      `${file} is ${actual} lines against a ceiling of ${max}. Ceilings here only go DOWN: extract a slice into a module or component rather than raising this number.`
    ).toBeLessThanOrEqual(max);
  });

  it.each(CEILINGS)('$file has a ceiling that is still honest', ({ file, max }) => {
    /*
      The ratchet half. A ceiling left far above the real figure is worse than no ceiling, because
      it reads like a limit while licensing every line back.
    */
    const actual = lineCount(file);
    expect(
      max - actual,
      `${file} measures ${actual} but its ceiling is ${max}. Lower the ceiling to ${actual}.`
    ).toBeLessThanOrEqual(SLACK);
  });
});

/*
  THE COMMENTS ARE THE ASSET, and this is the only rule of the decomposition that a diff review
  cannot catch — because a slice that sheds an explanation looks exactly like a slice that tidied up.

  Roughly 3,825 of `+page.svelte`'s script lines are comments, and they are not commentary: they are
  capture citations carrying byte offsets, const numbers and file/line references into the decoded
  reference bundle. They are the reason a rule with no recorded WHY does not get "simplified" back
  into the bug it was fixing. The standing instruction is that they MOVE WITH THE CODE THEY EXPLAIN,
  and that reaching a line target by shortening prose is rejected outright.

  Every other gate in this repository would stay green through exactly that failure. `svelte-check`
  does not read comments. The suite does not read comments. `svelte-autofixer` does not read
  comments. The ceiling above would go green FASTER if the prose were shaved. So the gate has to be
  here, and it has to be counted rather than promised in a commit message.

  ## Two counts, and why both

  * **Comment lines** is the blunt one. It is a PROXY and is deliberately not called a census: it
    tallies lines whose first non-space character opens or continues a comment, which will
    over-count a string literal containing `//` somewhere. That is fine and is the point — as a
    ratchet the number only has to be STABLE, not exact, and a consistent over-count is stable.
    What it is not allowed to be is a structural claim, because a hand-rolled scanner making a
    structural claim about this file is what once reported "0 directives" for a file with five.

  * **Capture citations** is the sharp one, and it is the one that matters. `full.js:1234`,
    `byte 1,221,430`, `main.d6d3c112b59b7d0d.js` — these are literal, unambiguous, and they are the
    part that cannot be reconstructed by anybody who does not have the decoded bundle open. A
    comment can be reworded; a byte offset that is deleted is gone.

  ## Why a whole-tree total rather than a per-file one

  Because the whole point of the phase is that comments MOVE. A per-file assertion would fail on
  every slice by design and be disabled within a week. Summed across the source and every
  destination, a move is level and a deletion is a fall — which is exactly the distinction being
  policed.

  It also enforces something worth having on its own: an extraction has to land INSIDE this catalog,
  in `lib/room/` or `lib/components/`. Move a region to some new corner of `#lib` and the total
  falls and this goes red. That is not a false positive; that is the gate asking why the room's
  reasoning just left the room.
*/
describe('the reasoning survives every extraction', () => {
  const COMMENTED_SOURCES = [
    'routes/+page.svelte',
    'routes/+page.server.ts',
    ...readdirSync(new URL('lib/components/', SOURCE))
      .filter((name) => name.endsWith('.svelte'))
      .map((name) => `lib/components/${name}`),
    ...roomModules
  ];

  /*
    The three shapes a citation into the decoded capture takes, read off the ones already in the
    tree rather than invented: a decoded component file with a line number, a byte offset into the
    bundle, and the bundle's own hashed name. `[\d,]{5,}` because every real offset is six figures
    or more with separators - a bare `byte 12` is prose, not a citation.
  */
  const CITATION =
    /(full\.js|compiled\.js|render-helpers\.js|\.component\.css)[:.]|bytes? [\d,]{5,}|main\.d6d3c112b59b7d0d\.js/g;

  const opensAComment = (line: string) => {
    const text = line.trimStart();
    return (
      text.startsWith('*') ||
      text.startsWith('/*') ||
      text.startsWith('//') ||
      text.startsWith('<!--')
    );
  };

  const tally = () => {
    let commentLines = 0;
    let citations = 0;
    for (const file of COMMENTED_SOURCES) {
      const source = readFileSync(new URL(file, SOURCE), 'utf8');
      citations += (source.match(CITATION) ?? []).length;
      for (const line of source.split('\n')) if (opensAComment(line)) commentLines += 1;
    }
    return { commentLines, citations };
  };

  /*
    Measured 2026-08-16 across 43 files, immediately before the first slice moves anything. These
    rise as reasoning is written and stay LEVEL as it is relocated. They do not fall.
  */
  const MINIMUM_COMMENT_LINES = 6329;
  const MINIMUM_CITATIONS = 220;

  it('found something to count', () => {
    // A catalog that resolved to nothing would make both assertions below pass on zero.
    expect(COMMENTED_SOURCES.length).toBeGreaterThan(0);
  });

  it('does not shed explanation across the room', () => {
    const { commentLines } = tally();
    expect(
      commentLines,
      `${commentLines} comment lines across the room, against a floor of ${MINIMUM_COMMENT_LINES}. Comments MOVE WITH THE CODE THEY EXPLAIN - a fall means an extraction left an explanation behind instead of taking it, or shortened one to hit a line target. Neither is permitted; put the reasoning in the file that now owns the code.`
    ).toBeGreaterThanOrEqual(MINIMUM_COMMENT_LINES);
  });

  it('does not shed a single capture citation', () => {
    const { citations } = tally();
    expect(
      citations,
      `${citations} capture citations across the room, against a floor of ${MINIMUM_CITATIONS}. A byte offset or a decoded-file reference is the one kind of comment nobody can reconstruct without the reference bundle open. If a citation is genuinely obsolete, say so in the commit and lower this number deliberately - do not let it fall by accident.`
    ).toBeGreaterThanOrEqual(MINIMUM_CITATIONS);
  });
});

describe('the contract tests that read source as text cannot pass vacuously', () => {
  /*
    This is the trap that makes the extraction dangerous, and it is worth stating precisely because
    it is not obvious.

    46 of this suite's test files read `+page.svelte` as a STRING and assert on its contents. Move a
    region out to a module and every POSITIVE assertion about it fails loudly, which is fine - that
    is a migration telling you where it needs to go. But every NEGATIVE assertion - `not.toContain`
    - starts passing for the wrong reason. The text is absent because the whole region left, not
    because the thing it guarded is still true. The guard turns green at the exact moment it stops
    guarding anything.

    This is not hypothetical. `unmute-chat-contract.test.ts` asserted that `unmute-chat` is no
    longer a key in the toast-only table by slicing `+page.svelte` for `const exactAlerts`. When
    that table was extracted to `user-action-intent.ts` the slice found nothing, the "body" it
    checked was the empty string, and the guard went green having stopped guarding. It shipped that
    way and was caught on the next read of the file, not by any test. It now reads the file that
    owns the table AND asserts the table was found first.

    So: a file that reads a source file as text must also make at least one POSITIVE assertion about
    it. That does not prove the negative ones are still meaningful, but it does prove the test is
    still pointed at a file that contains the feature - which is the failure mode above, and it is
    cheap to check.
  */
  const testDir = new URL('./', import.meta.url);
  const selfName = 'source-size-contract.test.ts';

  /*
    `AlertChatArea.svelte` joined the two page files on 2026-08-15, and the reason is the trap above
    rather than tidiness. Thirteen contract files were re-pointed at it that day, and one of them —
    `day-separator-contract.test.ts` — stopped naming `+page.svelte` at all, which silently dropped
    it out of this list. It was policed while its subject sat in the page and unpoliced the moment
    its subject moved, which is the failure mode this whole block exists to catch, arriving by a
    route the block did not cover.

    `PresentationArea.svelte` was added for the same reason a day later: re-pointing
    `notes-style-contract` and `screen-tab-bar-contract` at it took both of them out of the
    generated list, exactly as `day-separator` fell out when `AlertChatArea` landed. `FilesPane`
    was the first added in the SAME commit that created the component, which is the habit those two
    retrofits exist to teach.

    THAT HAND-KEPT LIST IS NOW A CATALOG, 2026-08-16, and the reason is that the habit was not
    enough and could not have been. The list named `.svelte` files only, so it could see a region
    moving into a COMPONENT and was structurally blind to a region moving into a `.svelte.ts`
    MODULE — which is the entire shape of the decomposition that follows this commit. A test
    re-pointed from `+page.svelte` to `room/toasts.svelte.ts` would stop naming any entry here,
    leave this filter, and go unpoliced while staying green: the `day-separator` failure again, by
    the one route two retrofits had still not closed.

    So the subjects are DISCOVERED rather than remembered. `AGENTS.md` DPE rule 4 asks for exactly
    this — "prefer a catalog-driven test that discovers its own subjects over a hardcoded list, so
    the next table is covered without anyone remembering" — and here it means the next module is
    covered on the day it is created, by nobody.

    MEASURED BEFORE THE CHANGE, because widening a filter can only add subjects and adding subjects
    can only add failures: the hand-kept list policed 54 files, the catalog polices 63, and all 9
    newly-policed files already assert something positive. The widening cost nothing and closed a
    hole; that is why it went in as one commit ahead of the extraction rather than alongside it.

    WHAT THIS FILTER STILL CANNOT SEE, found by a negative control that came back GREEN and is
    recorded because it cost a turn and would cost the next person one. `source.includes(target)`
    matches a MENTION, not a READ. The first control changed `id-opacity-contract.test.ts`'s
    `readFileSync` target away from the page and the count did not move, because that file names
    `routes/+page.svelte` twice more — once as an `ALLOWED` map key and once inside its own
    assertion — and either mention is enough to keep it here. The control was wrong, not the gate;
    the gate went red the moment it was re-run against a file whose only mention IS its read
    (`recording-codec.test.ts`), reporting 62 against the floor.

    So a test could stop reading a file, keep the string somewhere, and stay counted. That is a
    weaker guarantee than it looks and it is inherited rather than introduced — the hand-kept list
    matched exactly the same way. It is not tightened here because requiring the path to sit inside
    a `readFileSync`/`new URL` call means parsing the test rather than reading it, and a guard that
    is cleverer than it is trustworthy is how the last three vacuous assertions got written. The
    positive-assertion rule below still applies to every file this catches, which is the guarantee
    that actually matters.
  */
  const catalogOf = (dir: string, suffix: string, prefix: string) =>
    readdirSync(new URL(dir, SOURCE))
      .filter((name) => name.endsWith(suffix))
      .map((name) => `${prefix}${name}`);

  /*
    The strings are what a test's SOURCE contains, not filesystem paths, because that is what the
    filter below matches on: a reader writes `new URL('./components/FilesPane.svelte', …)` or
    `new URL('./room/media.svelte.ts', …)`, so the catalog entry has to be the tail those share.

    `.svelte.ts` rather than `.svelte` for the modules is load-bearing on its own: `room/chat.svelte`
    would also match `room/chat.svelte.test.ts` and quietly police a module's own unit test as
    though it were a text reader.
  */
  const EXTRACTION_SOURCES = [
    'routes/+page.svelte',
    'routes/+page.server.ts',
    ...catalogOf('lib/components/', '.svelte', 'components/'),
    ...catalogOf('lib/room/', '.svelte.ts', 'room/')
  ];

  const readers = readdirSync(testDir)
    .filter((name) => name.endsWith('.test.ts') && name !== selfName)
    .map((name) => ({ name, source: readFileSync(new URL(name, testDir), 'utf8') }))
    .filter(
      ({ source }) =>
        source.includes('readFileSync') &&
        EXTRACTION_SOURCES.some((target) => source.includes(target))
    );

  it('found the text-reading contract tests it is meant to police', () => {
    // If this drops to zero the filter above has drifted and every assertion below is vacuous too.
    expect(readers.length).toBeGreaterThan(0);
  });

  /*
    A RATCHET ON THE COUNT, which is the half `toBeGreaterThan(0)` cannot give.

    Zero is not the failure that has actually happened here. Twice the count fell by ONE — a single
    file leaving the policed set while 50-odd others stayed — and both times the only thing that
    noticed was a person reading a test summary and thinking the number looked small. That is not a
    gate, it is a coincidence, and the second occurrence proves the first taught nothing.

    So the floor moves the way the ceilings above move, in the opposite direction: it only ever goes
    UP. Re-pointing a test from the page to the module it now belongs to keeps it in the catalog and
    keeps this number level, which is the whole point — a re-point is not a loss and must not read
    as one. A number that FALLS means a file stopped reading source text altogether, and that is
    either a deleted guard or a vacuous one.
  */
  const MINIMUM_POLICED_READERS = 63;

  it('polices at least as many readers as it did before the last extraction', () => {
    expect(
      readers.length,
      `${readers.length} text-reading contract tests are policed, against a floor of ${MINIMUM_POLICED_READERS}. A FALLING count means a test stopped naming any extraction source — it has left this guard and is passing unpoliced, which is exactly how \`day-separator-contract.test.ts\` went quiet twice. Re-point it at the file that now owns its subject; do not lower this number.`
    ).toBeGreaterThanOrEqual(MINIMUM_POLICED_READERS);
  });

  /*
    "Positive textual assertion" is enumerated rather than guessed, because the first version of
    this check counted only `toContain` and immediately failed `day-separator-contract.test.ts` -
    which asserts positively three times over, using `page.match(...)` with `toBe(2)`. That was a
    defect in the check, not in the test, and a guard that cries wolf gets deleted within a week.

    So the three forms that appear in this suite are all accepted, and a file passes if it uses any
    of them un-negated:

      expect(pageCode).toContain('…')          - the common form
      expect(page).toMatch(/…/)                - the regex form
      expect((page.match(/…/g) ?? []).length)  - the counting form, which fails at 0 if the region
                                                 is extracted, so it is a real positive assertion
  */
  const positiveAssertions = (source: string) => {
    const contains =
      source.split('.toContain(').length - 1 - (source.split('.not.toContain(').length - 1);
    const matches =
      source.split('.toMatch(').length - 1 - (source.split('.not.toMatch(').length - 1);
    /*
      `.match(` and `.toMatch(` do not overlap as substrings - the second capitalises the M - so
      this counts the counting form only, with no double-count to correct for.
    */
    const counted = source.split('.match(').length - 1;
    /*
      THE STRUCTURAL FORM, added 2026-08-16 for `orphaned-comment-contract.test.ts`, and it is the
      same defect-in-the-check as the counting form above rather than a new exemption.

      That file parses the page's top-level block comments and asserts `.length` is above a floor
      before it looks for orphans among them. That IS the positive assertion this rule asks for — at
      zero comments found its real check is vacuous, and the floor is what says so — but it reaches
      the count through a helper rather than through `.match(`, so a check enumerating only string
      methods called it absent.

      `toBeGreaterThan(` is accepted on its own terms: it cannot be satisfied by a region that has
      been extracted, which is the property that made the counting form acceptable. `.not.` has no
      meaning on it, so there is nothing to subtract.
    */
    const floors = source.split('.toBeGreaterThan(').length - 1;
    return contains + matches + counted + floors;
  };

  it.each(readers.map(({ name }) => name))('%s asserts something positive', (name) => {
    const source = readers.find((reader) => reader.name === name)?.source ?? '';
    expect(
      positiveAssertions(source),
      `${name} reads a source file as text but asserts only that things are ABSENT. After an extraction every one of those passes for the wrong reason - the text is gone because the region moved, not because the guard still holds. Add one positive assertion that the feature is still where this test thinks it is.`
    ).toBeGreaterThan(0);
  });
});
