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
    */
    max: 9606,
    why: 'the room page - the script block is the extraction target; 13,663 before the MTX slice'
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
  }
];

const lineCount = (file: string) => readFileSync(new URL(file, SOURCE), 'utf8').split('\n').length;

describe('the three files that outgrew the standard do not grow further', () => {
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

    The list is the files that regions get extracted OUT OF. It grows when the next one does.
  */
  const EXTRACTION_SOURCES = [
    'routes/+page.svelte',
    'routes/+page.server.ts',
    'components/AlertChatArea.svelte',
    /*
      Added the same day it was created, and for the reason the entry above was: re-pointing
      `notes-style-contract` and `screen-tab-bar-contract` at this component took both of them out
      of the generated list, exactly as `day-separator` fell out when `AlertChatArea` landed. The
      count dropping is the only signal that happens, so it is worth saying plainly — a file leaves
      this list silently and stays green while it does.
    */
    'components/PresentationArea.svelte',
    /*
      Added in the SAME commit that created the component, which is the point. The two entries
      above were both added after the fact, once a dropped test count gave the game away. This one
      went in before `files-pane-contract` was re-pointed, so the list never lost it — that is the
      habit the two retrofits above exist to teach.
    */
    'components/FilesPane.svelte'
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
