#!/usr/bin/env node
/*
  What the reference's wire vocabulary contains, and which of it this room's source mentions.

  ## Why this file exists, and why it is HERE rather than in `scripts/`

  Nothing had ever enumerated the reference's features. "Everything buildable is built" was, for
  months, a statement about what somebody had thought to look for — while two whole presentation-area
  tabs sat in the captured bundle unbuilt. An earlier copy of this audit lived in
  `apps/room/scripts/`, which `.gitignore:176` excludes whole, so it was reachable only on the
  author's machine: `TODO.md` recorded "run it after every feature lands" beside a note that a fresh
  clone cannot run it at all, and its counts went stale because nobody else could refresh them.

  `gate/` is published. This is the same measurement, re-derived from the tracked evidence, so that
  anybody with a checkout can reproduce every number it prints.

  ## What it measures — stated precisely, because the number is easy to over-read

  It reads ONE artefact: the pinned v4 bundle in `docs/source-v4-2026-08-15/`, whose SHA-256 is
  checked before a single pattern runs. Drift there fails the process rather than producing a
  quietly different answer.

  Four vocabularies are extracted, and they are not the same kind of thing:

    ADMIN    sendServerAdminCommand("X")  — the presenter's half, one call per control
    SEND     socket.send("X")             — client-to-server frames that are not admin commands
    INVOKE   {cmd:"X"}                    — invokeCmd sub-commands, the mediasoup-shaped calls
    FRAME    emit("X") ∩ case"X":         — server-to-client frames the client actually dispatches

  FRAME is an INTERSECTION on purpose. `emit(` alone is the in-process event bus and matches 240
  local events; `case"X":` alone matches 333 identifiers, most of them minified single letters from
  unrelated switches. A name that is both emitted and switched on is a frame; either alone is not.

  ## ⚠️ AN ABSENT IDENTIFIER IS NOT AN ABSENT FEATURE ⚠️

  This is the one thing to carry away. This room uses SvelteKit remote functions and REST endpoints
  where the reference uses socket commands, so names legitimately differ — `startWebcam` is absent by
  name and `toggleWebcam` does the job. An adversarial pass over the previous run of this audit
  killed 7 of 34 gap claims outright and reclassified 9 more as built-under-another-name: a 21%
  false-gap rate on the raw output.

  So the ABSENT list is a list of QUESTIONS, not a list of work. Each one is answered by reading, and
  the answers live in `docs/decoded/missing-commands-triage.md`. What this file guarantees is that
  the question gets ASKED for every identifier, which is the part a human doing it by eye missed
  twice.

  Usage:
    node gate/audit-feature-coverage.mjs            human-readable report
    node gate/audit-feature-coverage.mjs --json     the same data, machine-readable
*/

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOM = dirname(fileURLToPath(new URL('.', import.meta.url)));
const EVIDENCE = join(ROOM, 'docs/source-v4-2026-08-15');
const BUNDLE = 'main.d1d09071be31f1ba.js';

/**
 * The bundle, verified against the `sha256sums.txt` committed beside it.
 *
 * Read, not searched, and checked before use: every offset and count this repository quotes is
 * against these exact bytes, so a silently different file would make every one of them a lie.
 */
function readVerifiedBundle() {
  const sums = readFileSync(join(EVIDENCE, 'sha256sums.txt'), 'utf8');
  const pinned = sums
    .split('\n')
    .map((line) => line.trim().split(/\s+/))
    .find(([, name]) => name === BUNDLE)?.[0];
  if (!pinned) throw new Error(`sha256sums.txt does not pin ${BUNDLE}`);

  const bytes = readFileSync(join(EVIDENCE, BUNDLE));
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== pinned) {
    throw new Error(
      `${BUNDLE} does not match its pin.\n  pinned ${pinned}\n  actual ${actual}\n` +
        'Every byte offset recorded in this repository is against the pinned bytes. Do not re-pin.'
    );
  }
  return { text: bytes.toString('utf8'), sha256: actual, bytes: bytes.length };
}

/**
 * Every capture of `re` over `text`, deduplicated.
 *
 * @param {string} text
 * @param {RegExp} re
 * @returns {Set<string>}
 */
function matches(text, re) {
  const found = new Set();
  for (const m of text.matchAll(re)) found.add(m[1]);
  return found;
}

/*
  `{2,}` after the first character, so a name is at least three characters long. The bundle's own
  switches are full of minified single- and double-letter cases (`G`, `GG`, `yy`) which are locals,
  not protocol. Three is the shortest real name in any of the four vocabularies.
*/
const VOCABULARIES = {
  ADMIN: /sendServerAdminCommand\("([A-Za-z][A-Za-z0-9_]{2,})"/g,
  SEND: /\.send\("([A-Za-z][A-Za-z0-9_]{2,})"/g,
  INVOKE: /cmd:"([A-Za-z][A-Za-z0-9_]{2,})"/g
};

/**
 * @param {string} bundle
 * @returns {{ name: string; sources: string[] }[]}
 */
export function extractWireVocabulary(bundle) {
  /** @type {Map<string, Set<string>>} */
  const byName = new Map();
  /**
   * @param {string} name
   * @param {string} source
   */
  const note = (name, source) => {
    const sources = byName.get(name) ?? new Set();
    sources.add(source);
    byName.set(name, sources);
  };

  for (const [source, re] of Object.entries(VOCABULARIES)) {
    for (const name of matches(bundle, re)) note(name, source);
  }

  // FRAME: emitted AND switched on. See the header for why either alone is noise.
  const emitted = matches(bundle, /emit\("([A-Za-z][A-Za-z0-9_]{2,})"/g);
  const switched = matches(bundle, /case"([A-Za-z][A-Za-z0-9_]{2,})":/g);
  for (const name of emitted) if (switched.has(name)) note(name, 'FRAME');

  return [...byName.entries()]
    .map(([name, sources]) => ({ name, sources: [...sources].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The presentation-area tab ids, which are the other thing the reference names by string.
 *
 * @param {string} bundle
 * @returns {string[]}
 */
export function extractPresentationTabs(bundle) {
  return [...matches(bundle, /presAreaTabs-([A-Za-z][A-Za-z0-9_]*)/g)].sort();
}

/**
 * Every byte of this room's IMPLEMENTATION source, concatenated once.
 *
 * One string rather than a per-file search because the question is only ever "does this name appear
 * anywhere", and 190 files re-read per identifier is a minute of work for an answer available in one
 * pass. Generated and vendored trees are skipped: a hit inside `node_modules` says nothing about
 * what this room implements.
 *
 * ## TEST FILES ARE EXCLUDED, and that is load-bearing rather than tidy
 *
 * Found the first time this was run under Vitest: the contract test that pins the absent list
 * contains all 42 absent names as string literals, so scanning `src/**` including tests reported
 * every one of them PRESENT and the gap list came back empty. A measurement that a pin of its own
 * output can satisfy measures nothing.
 *
 * The rule it settled is the honest one anyway, and it holds beyond this file: a name that appears
 * only in a test or only in a comment is not an implementation. `deleteChatMsg` written in a
 * docblock explaining what the reference does is evidence that somebody READ the reference, never
 * that this room answers that frame.
 */
function roomSource() {
  const SKIP = new Set(['node_modules', '.svelte-kit', 'build', 'dist', 'coverage']);
  const IS_TEST = /\.(test|spec)\.(ts|js)$|\.(test|spec)\.svelte\.ts$|\.svelte\.(test|spec)\.ts$/;
  let text = '';
  /** @param {string} dir */
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (IS_TEST.test(entry.name)) continue;
      else if (/\.(ts|js|svelte|css)$/.test(entry.name)) text += readFileSync(full, 'utf8');
    }
  };
  walk(join(ROOM, 'src'));
  return text;
}

export function auditCoverage() {
  const bundle = readVerifiedBundle();
  const source = roomSource();

  const commands = extractWireVocabulary(bundle.text).map((entry) => ({
    ...entry,
    present: source.includes(entry.name)
  }));
  const tabs = extractPresentationTabs(bundle.text).map((name) => ({
    name,
    present: source.includes(`presAreaTabs-${name}`)
  }));

  return {
    evidence: { file: BUNDLE, sha256: bundle.sha256, bytes: bundle.bytes },
    commands,
    tabs,
    absentCommands: commands.filter((c) => !c.present).map((c) => c.name),
    absentTabs: tabs.filter((t) => !t.present).map((t) => t.name)
  };
}

/* Executed directly rather than imported by the contract test. */
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const report = auditCoverage();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const { commands, tabs, absentCommands, absentTabs, evidence } = report;
    console.log(`evidence  ${evidence.file}  ${evidence.bytes} bytes  sha256 ${evidence.sha256}`);
    console.log(
      `commands  ${commands.length} in the reference · ` +
        `${commands.length - absentCommands.length} named in our source · ${absentCommands.length} not`
    );
    console.log(
      `tabs      ${tabs.length} in the reference · ` +
        `${tabs.length - absentTabs.length} named in our source · ${absentTabs.length} not`
    );
    console.log('\nNOT NAMED IN OUR SOURCE — questions to answer by reading, not a list of work:');
    for (const name of absentCommands) {
      /*
        `?? []` rather than a bare access. `absentCommands` is derived from `commands` in the same
        pass, so the lookup cannot miss — but a printer that throws on a name it just produced would
        be a report that dies at the point it becomes useful, and the type checker is right to ask.
      */
      const sources = (commands.find((c) => c.name === name)?.sources ?? []).join(',');
      console.log(`  ${name.padEnd(28)} ${sources}`);
    }
    for (const name of absentTabs) console.log(`  presAreaTabs-${name.padEnd(15)} TAB`);
    console.log(
      '\nAn absent identifier is NOT an absent feature: this room uses remote functions and REST\n' +
        'where the reference uses socket commands. The last adversarial pass killed 7 of 34 such\n' +
        'claims outright. Answers belong in docs/decoded/missing-commands-triage.md.'
    );
  }
}
