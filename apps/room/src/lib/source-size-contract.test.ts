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
      `stripHtmlToText` and its docstring left for `$lib/chat-plain-text.ts`. Pure, twinned with a
      server derivation it has to agree with, and untestable in here without mounting the page.

      That is the ratchet working as designed rather than as an obstacle: the growth was real and it
      was paid for with a real module, not with a shorter comment and not with a bigger number.

      The eighth (the Files pane and the composer upload) went the same way and cost 20: four call
      sites, each trading a `void fetch(...)` for a `try`/`catch`, plus a five-line import. Paid for
      by moving `mediumDate` to `$lib/message-formatters.ts` — where the room's four other date
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
      `fileSizeInKb`, which went to `$lib/file-sort.ts` where the module that owns how the Files pane
      sorts and labels its rows now owns how it formats them; and with the two selected-message sends
      collapsed into one, because they differed only in which command they called.

      The eleventh and last — `messageAction`, 314 lines and six operations — cost 4, and paid with a
      duplication the conversion exposed: the reaction toggle existed THREE times, twice on the server
      and once as the page's optimistic copy, and no test had ever read the result of any of them.
      `$lib/reaction-toggle.ts` states the four rules once, both sides call it, and it is executed.

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
      stayed in `$lib/roster-gates` where their truth tables are — what moved is the state they run
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
      that was overdue anyway: the four captured navbar strings went to `$lib/navbar-labels.ts`,
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
      value, and `captureVideoImage` is an import from `$lib/screen-zoom` rather than page state.

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
    */
    max: 4323,
    why: 'the room page - the script block is the extraction target; 13,663 before the MTX slice'
  },
  {
    file: 'lib/room/events.svelte.ts',
    /*
      The room's realtime channel: 864 lines carrying 351 of code and 468 of citation.

      A ROUTER, and the ratio is the evidence for that reading rather than a coincidence — more than
      half the file is the transcription of what each of six channels means, because the behaviour
      is almost entirely "which class owns the state this frame changes". The routing itself is a
      chain of equality checks; what is expensive to recover is WHY `changeChatMode` refetches
      instead of reading the mode off the wire, and why the leave beep reads a room setting named
      for joins.
    */
    max: 864,
    why: 'the SSE router - 351 code lines under 468 of channel transcription'
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
    file: 'lib/room/recording.ts',
    /*
      The recorder, and the speech recognition that shares its microphone.

      Speech recognition is here rather than in the transport because it is a second consumer of
      the DEVICE, not of the wire: it starts and stops on the same events the recorder does and
      writes into the caption list rather than onto a producer.
    */
    max: 341,
    why: 'MediaRecorder, the preview window, the room-wide broadcast and the two speech calls'
  },
  {
    file: 'lib/room/media-transport.svelte.ts',
    /*
      The largest module in `lib/room/` by total lines, and the reason the backstop below now counts
      code: 1,416 lines carrying 615 of code and 699 of citation, which is the same 49% ratio as
      `files.svelte.ts` and `split.svelte.ts`.

      The citations are why. This class is transcribed from a minified capture, and nearly every
      decision in it is a finding rather than a choice — `TOP_SPATIAL_LAYER` is 9 because mediasoup
      clamps, `load()` is awaited because omitting it fails silently, `dropRemoteMedia` clears five
      collections because clearing four left the dedupe guards holding producers nobody consumed.
      None of that is recoverable from the code, and all of it was paid for once already.

      It is ONE module because there is no seam, which was measured rather than assumed — see the
      backstop's own note. Acquiring a track and producing it into the session is a single act here,
      so a capture/transport split would have cut through `#mediaSession`, and a local/remote split
      would have cut through `#sharedScreens`, which both paths write.
    */
    max: 1416,
    why: 'the SFU transport - 615 code lines under 699 of transcription evidence, and no seam to split on'
  },
  {
    file: 'lib/components/RoomOverlays.svelte',
    /*
      Everything that floats above the room, taken out of the page in Phase 5 slice 17.

      310 lines of markup arrived here and 265 left the page — the difference is the props list,
      which is what a facade boundary costs and is why the template savings in the phase plan
      were costed at ~218 rather than an optimistic ~140. Nineteen of the thirty-six props are
      state classes handed over whole; the rest are page state and callbacks.
    */
    max: 471,
    why: 'the overlay layer - modal host, seven dialogs, toasts, the lightbox and the audio sinks'
  },
  {
    file: 'lib/components/ModalHost.svelte',
    /*
      Moved for the first time, and DOWN, by the chat-mode conversion. The two radios each built the
      confirm sentence themselves and only one of them built it right; `chatModeConfirmPrompt` in
      `$lib/chat-mode.ts` owns the capture's wording now and both call it.

      Down again on the last conversion. `uploadFile` was the eleventh call site and the one I did
      not know about — it lived HERE, not in `+page.svelte`, and a comment of mine had asserted it
      was a progressive `<form>` that degraded without JavaScript. It was a JS-driven loop over a
      queue. Converting it took `deserialize` out of this file entirely.

      `presenterCommand` and `giveMicScreen` were called from here too, and `presenterCommand`'s
      call site was BROKEN — its action had been removed three commits earlier while this file went
      on posting to it. Both are commands now. Held at the same number: the three command imports and
      the bug's explanation were paid for by `$lib/refusal-message.ts`, which eleven call sites had
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
      `$lib/connectivity-status-rows` now, and those rules are EXECUTED by a test for the first
      time: a ternary inside an attribute is not reachable without mounting this 6,000-line host.

      5,982 -> 5,965, so the file is smaller than it was before Phase 4 rather than merely level.
    */
    max: 5966,
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
    max: 314,
    why: "the alerts pane's toolbar, viewer filter, archive cut-off and search term"
  },
  {
    file: 'lib/room/arrivals.ts',
    max: 155,
    why: 'which rows in a wholesale-replaced list are new; a plain .ts on purpose'
  },
  {
    file: 'lib/room/chat.svelte.ts',
    max: 179,
    why: 'the two chat columns and the mention routing that reads three of their fields at once'
  },
  {
    file: 'lib/room/log-pages.svelte.ts',
    max: 173,
    why: 'older-page paging for both logs, one keyed class at two arities'
  },
  {
    file: 'lib/room/media.svelte.ts',
    max: 371,
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
    file: 'lib/room/roster.svelte.ts',
    max: 321,
    why: 'the live roster, its four header controls, the badge count and the random draw'
  },
  {
    file: 'lib/room/scroll-follow.ts',
    max: 117,
    why: 'one instance per column; a plain .ts on purpose'
  },
  {
    file: 'lib/room/split.svelte.ts',
    max: 724,
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
    max: 115,
    why: 'the three bootbox dialogs, which STACK and therefore stay three fields'
  },
  {
    file: 'lib/room/volume.svelte.ts',
    max: 297,
    why: 'the master, background and per-presenter volumes; the first class to depend on another'
  },
  {
    file: 'lib/room/broadcasts.svelte.ts',
    max: 350,
    why: 'the video, YouTube and mp3 broadcasts; receivers rather than setters, so a stop cannot be half-applied'
  },
  {
    file: 'lib/room/prefs.svelte.ts',
    max: 590,
    why: 'every viewer preference and the one write path; 25 of 27 have no public setter'
  },
  {
    file: 'lib/room/files.svelte.ts',
    max: 382,
    why: 'the file drive; the first slice to collapse a prop list at TWO call sites rather than one'
  },
  {
    file: 'lib/room/screens.svelte.ts',
    max: 359,
    why: 'the screen viewer; the transport keeps the list, this keeps the three ids that point into it'
  },
  {
    file: 'lib/room/message-actions.svelte.ts',
    max: 474,
    why: 'what a click on a message can do; four optimistic paths, one refusal, one undo each'
  },
  {
    file: 'lib/room/feeds.svelte.ts',
    max: 359,
    why: 'what each pane renders, and the evidence overlay every pipeline consults'
  },
  {
    file: 'lib/room/composer.svelte.ts',
    max: 553,
    why: 'everything that leaves the browser as content; five entry points, one refusal path'
  },
  {
    file: 'lib/room/user-actions.svelte.ts',
    max: 730,
    why: 'everything that can be done TO a user; handle() alone was 249 lines on the page'
  },
  {
    file: 'lib/room/private-chat.svelte.ts',
    max: 521,
    why: 'the private-chat panel; generic over the roster row so the full row reaches selectRosterUser'
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
  in `lib/room/` or `lib/components/`. Move a region to some new corner of `$lib` and the total
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
    return contains + matches + counted;
  };

  it.each(readers.map(({ name }) => name))('%s asserts something positive', (name) => {
    const source = readers.find((reader) => reader.name === name)?.source ?? '';
    expect(
      positiveAssertions(source),
      `${name} reads a source file as text but asserts only that things are ABSENT. After an extraction every one of those passes for the wrong reason - the text is gone because the region moved, not because the guard still holds. Add one positive assertion that the feature is still where this test thinks it is.`
    ).toBeGreaterThan(0);
  });
});
