import { compile, compileModule } from 'svelte/compiler';
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * THE SVELTE COMPILER'S OWN WARNINGS, WHICH NOTHING HERE WAS READING.
 *
 * ## What was found
 *
 * `svelte-check --threshold warning` reports **0 warnings** for `lib/room/create-room.svelte.ts`.
 * `svelte.compileModule` reports **three** on the same file. That gap hid a live defect:
 *
 *     return { …, rosterViewer } as const     // state_referenced_locally
 *
 * `rosterViewer` is `$derived` over `isPresenter` and `media.limitedPresenter`, and returning it by
 * value handed `+page.svelte` a SNAPSHOT taken at construction. The page destructures that object,
 * so `rowVisible()` filtered the roster with a viewer frozen before anybody could be elevated — and
 * `giveMicScreen` elevates a member to presenter mid-session. In a room with
 * `onlyPresentersVisibleToViewers` on, the new presenter kept a non-presenter's roster.
 *
 * The compiler had been saying so the whole time. Nothing asked it.
 *
 * ## Why this is not a duplicate of `svelte-check`
 *
 * `svelte-check` runs the language server: TypeScript diagnostics, a11y, and the warnings the
 * language service surfaces for `.svelte` files. It does not report `compileModule` warnings for
 * `.svelte.ts` rune modules, which is where this room keeps its reactive state — twenty-odd files.
 * This reads the compiler directly, over both kinds, and is the only thing here that does.
 *
 * ## The allow-list, and why it is not an ignore
 *
 * Two warnings survive, both on `create-room.svelte.ts`, and both are argued at the code in a
 * paragraph headed *"THE THREE EAGER READS OF `data`, and why they are correct rather than a
 * captured-value bug"*: they are one-time SEEDS, and the class owns the value afterwards. They are
 * listed here by file and code so a THIRD one cannot arrive unnoticed — which is exactly what
 * `rosterViewer` did, and what that paragraph itself asks the next reader to interrogate.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * Known, argued warnings: `file` → `code` → how many, and why.
 *
 * A COUNT rather than a boolean, because "this file may warn" would have absorbed `rosterViewer`
 * silently. The number is the assertion.
 */
const ARGUED: Record<string, Record<string, { count: number; why: string }>> = {
  'lib/room/derived-return-probe.svelte.ts': {
    state_referenced_locally: {
      count: 1,
      why:
        'the probe EXHIBITS this warning on purpose — it is the subject. `snapshot: doubled` is the ' +
        'by-value return whose staleness `derived-return-probe.svelte.test.ts` measures. Removing ' +
        'the warning would remove the thing being measured.'
    }
  },
  'lib/room/create-room.svelte.ts': {
    state_referenced_locally: {
      count: 2,
      why:
        'the one-time seeds — `data.settings?.settingsJson` into RoomPrefs and the trade-alert ' +
        'seeds. Argued in full at the code; each hands a class a starting value, after which the ' +
        'class owns it and later server pages arrive through paging rather than re-seeding.'
    }
  }
};

/** The vitePreprocess step, by hand: types out, runes untouched. */
const toJs = (source: string) =>
  ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext }
  }).outputText;

const subjects = [
  ...globSync('**/*.svelte', { cwd: ROOT }),
  ...globSync('**/*.svelte.ts', { cwd: ROOT })
]
  .map((relative) => relative.replaceAll('\\', '/'))
  .filter((relative) => !relative.includes('.test.'))
  .sort();

type Finding = { file: string; code: string; message: string };

const findings: Finding[] = [];
const failures: string[] = [];
for (const file of subjects) {
  const source = readFileSync(`${ROOT}/${file}`, 'utf8');
  try {
    const result = file.endsWith('.svelte')
      ? compile(source, { filename: file, generate: 'client' })
      : compileModule(toJs(source), { filename: file, generate: 'client' });
    for (const warning of result.warnings) {
      findings.push({ file, code: warning.code, message: warning.message });
    }
  } catch (cause) {
    failures.push(`${file}: ${(cause as Error).message.split('\n')[0]}`);
  }
}

describe('the compiler sweep runs at all', () => {
  it('found the files it is meant to compile', () => {
    // 58 components + ~20 rune modules on 2026-08-29. A floor well under that fails a broken glob.
    expect(subjects.length).toBeGreaterThan(40);
  });

  it('compiles every one of them', () => {
    /*
      A file that fails to COMPILE would otherwise contribute no warnings and read as clean — the
      vacuity failure this sweep is most exposed to, since its whole output is a list that can be
      empty for two opposite reasons.
    */
    expect(failures, failures.join('\n')).toEqual([]);
  });
});

describe('every compiler warning is argued', () => {
  it('raises none that is not in the catalog, at the count recorded', () => {
    const tally = new Map<string, number>();
    for (const finding of findings) {
      const key = `${finding.file}::${finding.code}`;
      tally.set(key, (tally.get(key) ?? 0) + 1);
    }

    const unexpected: string[] = [];
    for (const [key, count] of tally) {
      const [file, code] = key.split('::');
      const argued = ARGUED[file]?.[code];
      if (!argued) {
        const sample = findings.find((f) => f.file === file && f.code === code)!;
        unexpected.push(`${file}: ${count}× ${code} — ${sample.message.split('\n')[0]}`);
        continue;
      }
      if (argued.count !== count) {
        unexpected.push(`${file}: ${count}× ${code}, but ${argued.count} are argued`);
      }
    }

    expect(
      unexpected,
      `${unexpected.join('\n  ')}\n\nThe Svelte compiler is warning about something nothing else here reads — svelte-check does not surface compileModule warnings for .svelte.ts. A "state_referenced_locally" on a value handed OUT of a function is usually a frozen snapshot: that is how the room's roster filter stopped following presenter elevation. Fix it, or add it to ARGUED with the reason at the code.`
    ).toEqual([]);
  });

  it('carries no stale entry', () => {
    // An argued warning that has been fixed leaves a slot for the next one to hide in.
    const stale: string[] = [];
    for (const [file, codes] of Object.entries(ARGUED)) {
      for (const code of Object.keys(codes)) {
        if (!findings.some((f) => f.file === file && f.code === code))
          stale.push(`${file}: ${code}`);
      }
    }
    expect(stale, stale.join(', ')).toEqual([]);
  });
});
