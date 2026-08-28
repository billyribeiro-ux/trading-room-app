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
    max: 1369,
    why: 'the room page - the script block is the extraction target; 13,663 before the MTX slice'
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

      Raised on the same grounds recorded at `lib/room/session-control.svelte.ts` in this file: the
      growth is the captured code and the reason the presenter is EXCLUDED from both frames
      (`isPresenter ||` is a guard, not a truthiness shorthand), which is the single most likely
      thing for a reader to "fix" into a bug. The prose was tightened twice before this number moved.
      The CODE backstop is unaffected.
    */
    max: 860,
    why: 'the SSE router - six channels of transcription, and the one block that did not route has gone'
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
      exception this file records, after `private-commands.svelte.ts` and `RoomOverlays.svelte`.

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
    max: 304,
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
    max: 244,
    why: 'the overlay state machine - five fields the template reads and this class alone writes'
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
    max: 203,
    why: 'the notes tab - four actions, one flag, and the two link mounts that belong to them'
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
    max: 358,
    why: 'MediaRecorder, the preview window, the room-wide broadcast and the two speech calls'
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
    max: 1357,
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
    max: 872,
    why: 'the local publisher - microphone, camera and screen capture through to their producers'
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
      recorded, after `private-commands.svelte.ts`.

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
    max: 786,
    why: 'the overlay layer - modal host, seven dialogs, toasts, the lightbox, delivery'
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
    max: 1546,
    why: 'the note editor and its transcribed toolbar; the toolbar is the extraction target'
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
    max: 447,
    why: 'the note tab strip and the three confirmations; everything else passes through'
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
    max: 396,
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
    max: 778,
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
    max: 239,
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
    max: 883,
    why: 'the room stage - twelve child components, and the largest file after the page itself'
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
    max: 372,
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
    max: 6126,
    why: 'every modal in the room, in one component'
  },
  {
    file: 'routes/+page.server.ts',
    max: 1584,
    why: 'the loader and every form action left; 3,233 before the remote-function conversions began'
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
    max: 320,
    why: "the alerts pane's toolbar, viewer filter, archive cut-off and search term"
  },
  {
    file: 'lib/room/arrivals.ts',
    max: 155,
    why: 'which rows in a wholesale-replaced list are new; a plain .ts on purpose'
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
    max: 194,
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
    max: 394,
    why: 'every media flag the interface renders from; STATE, never transport'
  },
  {
    file: 'lib/room/menus.svelte.ts',
    max: 187,
    why: 'the eleven floating menus and the two closers that deliberately differ'
  },
  {
    file: 'lib/room/polls.svelte.ts',
    max: 119,
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
    max: 114,
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
    max: 342,
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
    max: 782,
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
    max: 174,
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

      Raised on the same grounds recorded at `lib/room/session-control.svelte.ts` in this file: the
      growth is the captured code and the reason the presenter is EXCLUDED from both frames
      (`isPresenter ||` is a guard, not a truthiness shorthand), which is the single most likely
      thing for a reader to "fix" into a bug. The prose was tightened twice before this number moved.
      The CODE backstop is unaffected.
    */
    max: 484,
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
    max: 635,
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
    max: 370,
    why: 'the screen viewer; the transport keeps the list, this keeps the three ids that point into it'
  },
  {
    file: 'lib/room/message-actions.svelte.ts',
    max: 474,
    why: 'what a click on a message can do; four optimistic paths, one refusal, one undo each'
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
    max: 403,
    why: 'what each pane renders, and the evidence overlay every pipeline consults'
  },
  {
    file: 'lib/room/composer.svelte.ts',
    /*
      +20, slice 27: the RTE gate's own docblock, found ORPHANED on `+page.svelte` and swept into
      `gates.svelte.ts` by the extraction before landing where it belongs. It is the longest of the
      four because it records a deliberate NARROWING — upstream opens the editor for a member who
      owns a rich message and then refuses their save, so fewer people reach the editor here and
      everyone who reaches it can finish. `chat-rte-gate-contract.test.ts` executes that claim.
    */
    max: 573,
    why: 'everything that leaves the browser as content; five entry points, one refusal path'
  },
  {
    file: 'lib/room/kicks.svelte.ts',
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
    file: 'lib/room/session-control.svelte.ts',
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
    max: 780,
    why: 'everything that can be done TO a user; handle() alone was 249 lines on the page'
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
    max: 605,
    why: 'the private-chat panel; generic over the roster row so the full row reaches selectRosterUser'
  },
  /*
    Phase 5 slice 27. Sixteen view gates — every `$derived` boolean that decides whether a control is
    drawn at all — as GETTERS rather than `$derived` class fields, because a derived field
    initialises in declaration order, before the constructor has assigned the thunks it reads.
    `RoomFiles.filesHidden` is the recorded precedent for that and it cost a slice to find.
  */
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
    max: 106,
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
    max: 72,
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
    max: 59,
    why: 'the cmds frame the client reads; one half of a wire whose other half is server-only'
  },
  {
    file: 'lib/room/addressed-channel.ts',
    /*
      THE FOUR CALLBACKS OF THE ADDRESSED CHANNEL, extracted 2026-08-27 and capped in the same commit.

      They were inline in `create-room.svelte.ts`, which put the description of what each command does
      to the member — the verbatim capture byte for `forceReload`, why a kick shows text rather than
      swapping the page — in the room's assembly factory rather than beside the class that calls them.

      The move went through `private-commands.svelte.ts` first and was moved out again: appending 45
      lines to a capped file is moving the problem, not solving it, and the ratchet said so
      immediately. Its own module is where a thing this size belongs.
    */
    max: 46,
    why: 'builds RoomPrivateCommands with the callbacks its commands need; kept out of the factory'
  },
  {
    file: 'lib/room/private-commands.svelte.ts',
    /*
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
    max: 198,
    why: 'every command addressed to one member, behind one addressing gate'
  },
  {
    file: 'lib/room/chat-mute.svelte.ts',
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
    max: 1116,
    why: 'the composition root - 36 constructions and their citations, assembly and nothing else'
  },
  {
    file: 'lib/room/gates.svelte.ts',
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
    max: 421,
    why: 'the eighteen view gates; getters not derived fields, so a thunk assigned in the constructor is read at call time'
  },
  {
    file: 'lib/room/trade-alerts.svelte.ts',
    max: 337,
    why: 'ONE class, two instances; 9 of its 14 declaration pairs were byte-identical before the merge'
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
