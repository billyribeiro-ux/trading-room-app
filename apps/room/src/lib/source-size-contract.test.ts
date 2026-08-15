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
    */
    max: 13048,
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
    max: 5982,
    why: 'every modal in the room, in one component'
  },
  {
    file: 'routes/+page.server.ts',
    max: 1617,
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

  const readers = readdirSync(testDir)
    .filter((name) => name.endsWith('.test.ts') && name !== selfName)
    .map((name) => ({ name, source: readFileSync(new URL(name, testDir), 'utf8') }))
    .filter(
      ({ source }) =>
        source.includes('readFileSync') &&
        (source.includes('routes/+page.svelte') || source.includes('routes/+page.server.ts'))
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
