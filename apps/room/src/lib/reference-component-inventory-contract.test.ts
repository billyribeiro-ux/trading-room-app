import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

/*
  EVERY COMPONENT THE REFERENCE DECLARES IS EITHER RENDERED HERE OR HAS A REASON ON RECORD.

  ## The hole this closes, and how it was found

  `todo-next.md` says **"93 of 93 surfaces audited · 100.0%"**, and that number is true of what it
  measures. What it measures is a table built from OUR OWN FILE LIST — one row per file in
  `apps/room/src`. A reference component this room never built has no file, so it can never appear
  in that table, and 100% of a list that cannot contain the gap says nothing about the gap.

  On 2026-09-01 the bundle's own selector list was enumerated for the first time and compared
  against our markup. Fifty components are ours to answer for. Forty-nine are rendered or recorded.
  **`app-session-transcript` was neither** — zero occurrences of the name anywhere in
  `apps/room/src`, and no row in any tracker.

  It is not a fragment. It is a ROUTE — `{path:"session-transcript", component: …}` at byte
  2,606,654 — and `app-root` swaps the whole outlet for it (`O(1, o.isTranscriptRoute ? -1 : 1)`,
  byte 2,603,128). A date picker, a search box, 300-row pagination, a loading spinner and an error
  state, opened by the speech-reco overlay's "Full Transcript History" button
  (`openTranscriptPage()`, byte 1,952,652) and by the sidebar's "Transcript History".

  ## Why a gate rather than a note

  The two controls that open it were already built here, and both already refuse honestly. What was
  missing was any record that the PAGE they refuse to open is a reference surface at all. A count
  derived from our own files could not notice; a count derived from THE BUNDLE does.

  This test is that count. It reads the pinned v4 bundle, takes every `selectors:[["…"]]` it
  declares, drops the vendor ones, and requires each remaining name to be either present in our
  markup or listed below with its reason.
*/

/*
  Read by a CWD-RELATIVE path, exactly as `reference-const-coverage-contract.test.ts` reads the same
  file. The first draft used `new URL(..., import.meta.url)` and vitest reported "no tests": that
  form put the string `../docs/source-…` into the module, and `gate/evidence-bound-tests.mjs`
  excluded the whole file as evidence-bound against the absent `docs/source` root. The bundle IS
  tracked and IS present, so the exclusion was about the shape of the path rather than the file.
*/
const BUNDLE = readFileSync('docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', 'utf8');

/**
 * Selectors that belong to a LIBRARY the reference imports, not to the application.
 *
 * Named individually rather than matched by prefix: `app-` is not a reliable marker in either
 * direction — `as-split` and `pan-zoom` are vendor and carry no prefix, and a future vendor
 * component that did carry one would be silently excused by a pattern.
 */
const VENDOR = new Set([
  'as-split',
  'emoji-category',
  'emoji-mart',
  'emoji-mart-anchors',
  'emoji-preview',
  'emoji-search',
  'emoji-skins',
  'ng-component',
  'ngb-modal-backdrop',
  'ngb-modal-window',
  'ngb-popover-window',
  'ngb-tooltip-window',
  'ngx-emoji',
  'option',
  'pan-zoom',
  're-captcha',
  'router-outlet',
  /* Angular's bootstrap host. It has no markup of its own; `app-room` is what a viewer sees. */
  'app-root'
]);

/**
 * Reference components this room does NOT render, each with the reason, re-measured 2026-09-01.
 *
 * A name may sit here only while the reason holds. Deleting a reason without building the component
 * fails the "accounted for" case below, which is the point: an entry here is a decision, not a
 * parking space.
 */
const NOT_RENDERED: Record<string, string> = {
  'app-closed-session-page':
    'The page a member sees once the presenter closes the session. This room has no closed-session ' +
    'page at all: the reference stores its text server-side (`closedTxt`) and that store is not in ' +
    'the capture, so the page would render an empty document. The REFUSAL is recorded at ' +
    '`server/closed-message.ts` and the composer that would write it is built. Unblocked by a ' +
    'close-message store, which is a schema decision rather than a transcription.',
  'app-session-transcript':
    'THE ONE THIS FILE WAS WRITTEN FOR. A route (byte 2,606,654) showing a searchable, ' +
    'date-filtered, 300-per-page transcript, fetched by `POST ${apiROOT}/sessions/v2/' +
    'getSessionTranscript`. The PAGE is transcribable; the DATA is not. This room runs speech ' +
    'recognition and RELAYS every line — `recording.ts:456` requests `sendSpeechReco` on the media ' +
    'signalling socket — but nothing persists them: there is no caption or transcript table in ' +
    '`server/db/schema.ts`, and the reference gets its history from a server endpoint we do not ' +
    'have. Building the page would render an empty document forever, and building the STORE would ' +
    'be inventing a data source, which this repository forbids by name. Both controls that open it ' +
    'are already built and already refuse honestly (`alerts-pane.ts`, TRANSCRIPT_UNAVAILABLE). ' +
    'Unblocked by caption persistence, which is a server feature and a decision, not a transcription.'
};

/** Every component selector the reference declares. */
const declared = [...BUNDLE.matchAll(/selectors:\[\["([a-z0-9-]+)"\]\]/g)].map((m) => m[1]);

/** The ones this application is answerable for. */
const ours = [...new Set(declared)].filter((name) => !VENDOR.has(name)).sort();

/**
 * Every name that appears as an element in our own source.
 *
 * Read from tracked files rather than a glob, so a stray build artefact cannot satisfy the check —
 * and `<name` rather than the bare name, because a component is ACCOUNTED FOR by being rendered,
 * and its name occurring inside a docblock is exactly the false pass this file exists to prevent.
 */
const tracked = execSync("git ls-files 'src'", { encoding: 'utf8' }).trim().split('\n');
const rendered = new Set<string>();
for (const file of tracked) {
  if (!file.endsWith('.svelte') && !file.endsWith('.ts')) continue;
  /*
    SKIPPED IF IT IS NOT ON DISK, and this is a fix rather than defensiveness.

    `git ls-files` lists what the INDEX holds, which is not the same set as what the filesystem
    holds: a file deleted but not yet committed is tracked and absent, and so is every file during a
    rebase, a stash or a half-applied patch. The first draft called `readFileSync` on the list
    directly and took the WHOLE GATE down with `ENOENT` the first time that happened — a normal
    working state crashing a check that has nothing to do with it.

    `existsSync` and not a `try`/`catch`: a catch here would also swallow a permissions error or a
    truncated read, which are real failures this file should not hide. This skips exactly the one
    state that is legitimate.
  */
  if (!existsSync(file)) continue;
  const source = readFileSync(file, 'utf8');
  for (const name of ours) if (source.includes(`<${name}`)) rendered.add(name);
}

/**
 * Reference components built here WITHOUT the custom-element host, and the file that is them.
 *
 * A host is only load-bearing where the generated stylesheet scopes rules THROUGH it —
 * `captured-css-ancestor-contract` records the thirty that do, and replacing one of those with a
 * plain `<div>` ships its rules dead. **None of the six below has a single rule in
 * `captured-runtime-components.css`** (measured 2026-09-01, all six zero), so a host would be an
 * element with no consumer, which this repository forbids as firmly as it forbids a missing one.
 *
 * The first draft of this file asserted "renders a host element" and failed all six. That predicate
 * was wrong, not the code: what makes a reference component accounted for is being BUILT, and the
 * host is an implementation detail of styling.
 */
const BUILT_AS: Record<string, string> = {
  'app-kicked-page': 'lib/components/KickedPage.svelte',
  'app-positions-container': 'lib/components/PositionsContainer.svelte',
  'app-streaming-view': 'lib/components/StreamingView.svelte',
  'app-screenshare-view': 'lib/components/ScreenPane.svelte',
  'app-detached-screen': 'lib/components/ScreenPane.svelte',
  'app-session-login': 'routes/session/+page.svelte'
};

describe('the reference component inventory, read from the bundle rather than from our files', () => {
  it('is reading the pinned v4 bundle', () => {
    /* The same byte length `reference-const-coverage-contract` pins. A different bundle would make
       every number below a claim about a different application. */
    expect(Buffer.byteLength(BUNDLE)).toBe(2_891_205);
  });

  it('finds the components at all, so an empty result means clean rather than broken', () => {
    /*
      The floor. Every assertion below is satisfied by an empty list, which is the trap this
      repository has already paid for twice — `unfed-props-contract` had five green tests measuring
      nothing after a matcher was mutated.
    */
    expect(declared.length).toBeGreaterThan(60);
    expect(ours.length).toBe(50);
    expect(rendered.size).toBeGreaterThan(40);
  });

  it('accounts for every one: rendered here, or listed with a reason', () => {
    const unaccounted = ours.filter(
      (name) => !rendered.has(name) && !BUILT_AS[name] && !NOT_RENDERED[name]
    );

    expect(
      unaccounted,
      `${unaccounted.join('\n')}\n\nThese components are declared by the reference, are not ` +
        'rendered anywhere in this room, and carry no reason. `todo-next.md` counts surfaces from ' +
        'OUR file list, so a component we never built cannot appear there — this is the only check ' +
        'that can see one. Build it, or add it to NOT_RENDERED with what would unblock it.'
    ).toEqual([]);
  });

  it('every BUILT_AS entry names a file that exists and a component the reference declares', () => {
    /*
      Both halves, because either alone is satisfiable by a stale entry: a path that has moved makes
      the claim "this is built" false, and a selector the bundle no longer declares makes it
      meaningless. `readFileSync` throwing IS the assertion for the first.
    */
    for (const [name, file] of Object.entries(BUILT_AS)) {
      expect(ours, `${name} is not a component this reference declares`).toContain(name);
      expect(readFileSync(`src/${file}`, 'utf8').length, `src/${file} is empty`).toBeGreaterThan(
        200
      );
    }
  });

  it('keeps NOT_RENDERED honest — no entry outlives the component it excuses', () => {
    /*
      Both directions. An entry for a name the bundle no longer declares is describing a component
      that does not exist; an entry for one we HAVE since built is a reason that has stopped being
      true, and leaving it would tell the next reader the surface is missing when it is not.
    */
    for (const name of Object.keys(NOT_RENDERED)) {
      expect(ours, `${name} is not a component this reference declares`).toContain(name);
      expect(
        rendered.has(name) || Boolean(BUILT_AS[name]),
        `${name} IS built now — delete its NOT_RENDERED entry rather than leaving a stale refusal`
      ).toBe(false);
      expect(NOT_RENDERED[name].length, `${name}'s reason is too short to be one`).toBeGreaterThan(
        80
      );
    }
  });
});
