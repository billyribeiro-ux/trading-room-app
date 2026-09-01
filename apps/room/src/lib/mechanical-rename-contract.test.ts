import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { parse } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';

/*
  A MECHANICAL RENAME MUST NOT REACH INTO A CLASS NAME OR A STRING A USER READS.

  ## What shipped, and for how long

  Somewhere before Phase 5 slice 20, a substitution of `recording` -> `media.recording` was applied
  across `+page.svelte` and travelled into every file the extractions carried it to. It was correct
  for the FIELD — `media.recording` really is where that state lives — and wrong everywhere else it
  landed:

  * `class="media.recording-reminder"` and `class="media.recording-reminder-arrow"`. The captured
    stylesheet defines `.recording-reminder` and `.recording-reminder-arrow`
    (`captured-runtime-components.css:3993,4039`), so the banner matched NO rule and rendered
    unstyled.
  * `<span>You are not media.recording!</span>` — on screen, in the recording reminder.
  * `Can't start media.recording without screenshare` — on screen, in the recording menu.
  * `` `room-media.recording-${stamp}.${extension}` `` — the DOWNLOAD FILENAME a presenter gets for
    their own recording, twice.
  * Six comment citations, two of them naming files that do not exist (`media.recording-codec.ts`,
    `media.recording-state.remote.ts`; the real ones are `recording-codec.ts` and
    `recording-state.remote.ts`).

  Every one of those passed `svelte-check`, eslint, prettier and 2,523 tests, because none of them
  is a type error and no assertion read those particular strings. The two user-visible sentences and
  the download name were found by READING the component while writing a render test for something
  else entirely.

  ## The rule this file enforces, and why it is exactly this rule

  **A static `class` attribute may not contain a `.`** — CSS class names in this codebase never do,
  so a dot in one is always the fingerprint of a substitution that escaped its scope. Zero false
  positives, and it catches the two corrupted class attributes above at the character that is wrong.

  It deliberately does not try to police STRING content in general: "which sentences are
  user-visible" is not decidable here, and a guard that guesses would either miss the next one or
  cry wolf. The capture-fidelity tests are what hold the wording; this holds the mechanism.

  ## The wider lesson, already paid for once

  `unbound-method-contract.test.ts` records eleven handler props broken in one commit by "a
  mechanical rename". This is the same failure in a different target, and the answer is the same:
  the gate goes in with the repair, not after the next one.
*/

const tracked = execSync("git ls-files 'src/**'", { encoding: 'utf8' }).trim().split('\n');
const components = tracked.filter((file) => file.endsWith('.svelte'));

/** Every STATIC class attribute value in a component, with its line. */
const staticClassValues = (file: string, source: string) => {
  const found: { line: number; value: string }[] = [];
  const lineOf = (offset: number) => source.slice(0, offset).split('\n').length;

  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const candidate = node as { type?: string; name?: string; value?: unknown; start?: number };

    if (
      candidate.type === 'Attribute' &&
      candidate.name === 'class' &&
      Array.isArray(candidate.value)
    ) {
      /*
        Only a pure literal. `class={['a', { b: x }]}` is an ExpressionTag and its contents are
        code — a dot there is a property read, not a class name, and flagging it would make this
        guard the boy who cried wolf.
      */
      const parts = candidate.value as { type?: string; data?: string }[];
      if (parts.length === 1 && parts[0]?.type === 'Text' && typeof parts[0].data === 'string') {
        found.push({ line: lineOf(candidate.start ?? 0), value: parts[0].data });
      }
    }

    for (const value of Object.values(node as Record<string, unknown>)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  };

  visit(parse(source, { modern: true }).fragment);
  return found.map((entry) => ({ ...entry, file }));
};

describe('no class name carries the fingerprint of a mechanical rename', () => {
  const all = components.flatMap((file) => staticClassValues(file, readFileSync(file, 'utf8')));

  it('found class attributes to inspect', () => {
    // Every assertion below is `toEqual([])`, which an empty corpus satisfies while proving nothing.
    expect(all.length, 'no static class attributes were found at all').toBeGreaterThan(200);
  });

  it('no static class attribute contains a dot', () => {
    const offenders = all
      .filter((entry) => entry.value.includes('.'))
      .map((entry) => `${entry.file}:${entry.line} — class="${entry.value}"`);

    expect(
      offenders,
      `${offenders.join('\n')}\n\nA CSS class name in this codebase never contains a dot, so one here is the fingerprint of a rename that escaped its scope - which is exactly how class="media.recording-reminder" shipped against a stylesheet that defines .recording-reminder, leaving the banner unstyled.`
    ).toEqual([]);
  });
});

describe('and no sentence carries it either — the sweep the class rule could not do', () => {
  /*
    ## The fifteenth casualty, found on 2026-09-01 — fourteen months after the other four

    This file's own header says it *"deliberately does not try to police STRING content in general:
    which sentences are user-visible is not decidable here, and a guard that guesses would either
    miss the next one or cry wolf."*

    That was the right call about GUESSING and it left a real defect on screen. `RoomRecording`'s
    popup-blocked alert read:

    > "Allow pop-ups for this site, or open the downloaded **media.recording** from your Downloads
    > folder."

    A member reads that sentence at the exact moment something already went wrong, and it is the
    same substitution as the other four. Ten more sat in comments — *"every media.recording was a
    silent movie"*, *"a room that is still media.recording"* — which are not runtime defects but are
    corrupted prose in a repository whose whole standard rests on its comments being readable.

    ## The rule that IS decidable

    The header's caution was about deciding which strings a user reads. This rule decides nothing of
    the sort: **`media.recording` is only ever correct as a property read.** In prose it is always
    the artefact, and the two are told apart mechanically —

      * a property read is preceded by an identifier character, `#`, `!`, `(`, `.` or a space in an
        expression, and is what the 22 legitimate sites look like;
      * the FIELD named in prose is written in backticks, the house style for naming code in a
        comment, and stays;
      * anything else — `media.recording` bare, in an English sentence — is the rename.

    So the sweep looks for the bare form outside backticks and outside code, and every legitimate
    site already satisfies it. Zero false positives on the corpus as it stands, which is the same
    bar the class-attribute rule above was held to.

    ## The three files that must keep it

    This one quotes the defect to describe it, and `recording-reminder-contract.test.ts` and
    `room-surface-audit-batch3-contract.test.ts` pin the reminder's real `{#if}` expression as a
    fixture. Naming them is the point: an allow-list of three is a fact a reader can check, where a
    cleverer regex would be a rule nobody can.
  */
  const EXEMPT = new Set([
    'src/lib/mechanical-rename-contract.test.ts',
    'src/lib/recording-reminder-contract.test.ts',
    'src/lib/room-surface-audit-batch3-contract.test.ts'
  ]);

  /** `media.recording` in prose: no backtick either side, and no code character before it. */
  const PROSE = /(?<![`\w.#!(])media\.recording(?![\w`])/g;

  it('finds prose to inspect, so an empty result means clean rather than broken', () => {
    /*
      The floor. Every assertion below is `toEqual([])`, which an unread corpus satisfies while
      proving nothing — the same trap this file's own class sweep guards against with a count.
    */
    const withComments = tracked.filter(
      (file) =>
        (file.endsWith('.ts') || file.endsWith('.svelte')) &&
        readFileSync(file, 'utf8').includes('media.recording')
    );
    /*
      SIX, measured on 2026-09-01, and named rather than counted: `NavbarRecIndicator.svelte` and
      `RoomNavbar.svelte` name the field in backticks, `recording.ts` reads it, and the three exempt
      files above quote it. An exact list rather than a floor, for the reason `source-size-contract`
      gives about its own numbers — a floor of five would sit green through four of them vanishing,
      and this whole describe block is `toEqual([])` assertions that an unread corpus satisfies.
    */
    expect([...withComments].sort(), 'the corpus this sweep reads').toEqual([
      'src/lib/components/NavbarRecIndicator.svelte',
      'src/lib/components/RoomNavbar.svelte',
      'src/lib/mechanical-rename-contract.test.ts',
      'src/lib/recording-reminder-contract.test.ts',
      'src/lib/room-surface-audit-batch3-contract.test.ts',
      'src/lib/room/recording.ts'
    ]);
  });

  it('no sentence in the room says "media.recording"', () => {
    const offenders: string[] = [];
    for (const file of tracked) {
      if (EXEMPT.has(file)) continue;
      if (!file.endsWith('.ts') && !file.endsWith('.svelte')) continue;
      const source = readFileSync(file, 'utf8');
      source.split('\n').forEach((line, index) => {
        if (PROSE.test(line)) offenders.push(`${file}:${index + 1} — ${line.trim().slice(0, 110)}`);
        PROSE.lastIndex = 0;
      });
    }

    expect(
      offenders,
      `${offenders.join('\n')}\n\n\`media.recording\` is only ever correct as a property read. ` +
        'In an English sentence it is the `recording` -> `media.recording` substitution that ' +
        'shipped "You are not media.recording!" to the screen. Write `recording`, or put the ' +
        'field in backticks if the field is what you mean.'
    ).toEqual([]);
  });
});

describe('the strings that were corrupted are back to what the capture says', () => {
  /*
    Pinned by NAME rather than left to the sweep above, because a class-attribute rule cannot see a
    sentence. These four are the user-visible casualties, and each is asserted against the value
    read out of `main.d6d3c112b59b7d0d.js` — "You are not recording" and "Can't start recording
    without screenshare" are both in the bundle verbatim.
  */
  const navbar = readFileSync('src/lib/components/RoomNavbar.svelte', 'utf8');
  const recording = readFileSync('src/lib/room/recording.ts', 'utf8');

  it('the recording reminder reads as English', () => {
    expect(navbar).toContain('<span>You are not recording!</span>');
    expect(navbar, 'the corrupted form must not come back').not.toContain('You are not media.');
  });

  it('the screenshare warning reads as English', () => {
    expect(navbar).toContain("Can't start recording without screenshare");
    expect(navbar).not.toContain("Can't start media.");
  });

  it('the reminder banner uses the class the captured stylesheet defines', () => {
    const stylesheet = readFileSync('src/lib/styles/captured-runtime-components.css', 'utf8');
    expect(stylesheet, 'the captured rule').toContain('.recording-reminder');
    expect(navbar, 'and the markup that must match it').toContain('class="recording-reminder"');
    expect(navbar).toContain('class="recording-reminder-arrow"');
  });

  it('the popup-blocked alert reads as English — the FIFTEENTH casualty, found 2026-09-01', () => {
    /*
      Not in the capture: this room's local-recording window has no upstream counterpart, so the
      sentence is ours and there is no captured value to assert it against. What IS asserted is the
      absence of the substitution, which is the whole of what went wrong with it.
    */
    expect(recording).toContain('open the downloaded recording from your Downloads folder');
    expect(recording, 'the corrupted form must not come back').not.toContain(
      'downloaded media.recording'
    );
  });

  it('a presenter downloading their recording gets a sane filename', () => {
    /*
      `room-media.recording-2026-08-18-....webm` was what a presenter actually received. The
      intended shape is pinned independently by `media.svelte.test.ts`, which uses
      `room-recording-2026` as the recording name in seven assertions.
    */
    expect(recording).toContain('`room-recording-${stamp}.${extension}`');
    expect(recording).toContain('`room-recording-${new Date().toISOString()}`');
    expect(recording, 'the corrupted filename must not come back').not.toContain('room-media.');
  });
});
