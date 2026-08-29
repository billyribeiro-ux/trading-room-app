import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compile } from 'svelte/compiler';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * `window.confirm` / `alert` / `prompt` NEVER REACH A MEMBER.
 *
 * `CLAUDE.md` lists this among the Svelte traps that have cost time here - *"No `window.confirm` /
 * `alert` / `prompt`. Use the project's dialog primitive."* - and nothing enforced it. Both apps
 * measure clean today, which is exactly the condition the standard says to close: clean by
 * discipline is one careless import away from not being clean, and the standard asks for clean by
 * construction.
 *
 * ## Why this one is not cosmetic
 *
 * A native dialog BLOCKS THE EVENT LOOP of a page holding live WebRTC transports, an SSE alert
 * stream and a chat socket. A member who leaves `alert("...")` sitting on screen stops answering
 * keepalives; the room decides they left. It is also unstyleable, unpositionable, and in a modal
 * already open it stacks a second modal the room cannot dismiss.
 *
 * Both apps already have the replacement, and both were written because of this:
 *
 *   - `lib/room/dialogs.svelte.ts` - the room's `confirm(message, onconfirm)` and its `alert` /
 *     `prompt` state, rendered by `RoomOverlays.svelte`.
 *   - `lib/bootbox.svelte.ts` (controller) - the same shape, promise-returning.
 *
 * `user-action-intent.ts` records the case that made the rule concrete: the reference implements
 * "get my token" with `navigator.clipboard.writeText(...)` and a bare `alert(...)`, and this
 * repository forbids the second half.
 *
 * ## Both apps, one enforcement point
 *
 * `CLAUDE.md` is the ROOT standard and binds both apps; two half-gates would let a violation land
 * in whichever app the author was not thinking about. So this scans both from one place. The cost
 * is that a controller edit can turn the room suite red - which is the correct outcome for a
 * repository-wide rule, and is why the failure message names the app.
 *
 * ## Why the compiler, and not a text search
 *
 * A text search for `alert(` matches `onalert(`, `this.#alert(`, the word inside a comment
 * explaining the rule, and the `alert` half of every `onalert` prop in this codebase - there are
 * dozens, and every one is the project's own primitive. It also MISSES the case that matters most,
 * a call written inside a Svelte template expression rather than in the instance script.
 *
 * So every component is compiled to JavaScript and the call graph is read from the TypeScript AST.
 * A callee is a violation only when it is the bare global or an explicit `window.` / `globalThis.`
 * property - `onalert(...)`, `dialogs.alert`, `this.#alert(...)` and a comment are all structurally
 * different nodes and cannot be confused for it.
 */

const ROOM = fileURLToPath(new URL('..', import.meta.url));
const REPOSITORY_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const CONTROLLER = `${REPOSITORY_ROOT}apps/controller/src/`;

/** The three globals, and the two ways of naming each one explicitly. */
const FORBIDDEN = new Set([
  'alert',
  'confirm',
  'prompt',
  'window.alert',
  'window.confirm',
  'window.prompt',
  'globalThis.alert',
  'globalThis.confirm',
  'globalThis.prompt'
]);

interface Violation {
  app: string;
  file: string;
  line: number;
  callee: string;
}

/**
 * Every call in `source` whose callee names one of the forbidden globals.
 *
 * `getText()` on the callee gives the written form, so `dialogs.alert(...)` reads as
 * `dialogs.alert` and does not match, while a bare `alert(...)` reads as `alert` and does.
 */
function violationsIn(app: string, file: string, source: string): Violation[] {
  const found: Violation[] = [];
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.ESNext, true);

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(parsed);
      if (FORBIDDEN.has(callee))
        found.push({
          app,
          file,
          line: parsed.getLineAndCharacterOfPosition(node.getStart(parsed)).line + 1,
          callee
        });
    }
    ts.forEachChild(node, visit);
  };

  visit(parsed);
  return found;
}

/**
 * A component's compiled JavaScript, which folds its template expressions into readable calls.
 *
 * Compiling is what lets a call written in `onclick={() => alert('hi')}` be seen at all: the
 * instance script is only half of a Svelte file, and it is not the half where this kind of thing
 * gets written in a hurry.
 */
function compiled(path: string, source: string): string {
  return compile(source, { filename: path, generate: 'client' }).js.code;
}

function scan(app: string, root: string): Violation[] {
  const found: Violation[] = [];

  for (const file of globSync('**/*.svelte', { cwd: root }).sort()) {
    const source = readFileSync(`${root}${file}`, 'utf8');
    found.push(...violationsIn(app, file, compiled(file, source)));
  }

  for (const file of globSync('**/*.ts', { cwd: root }).sort()) {
    /*
      Test files are excluded, and only test files. A contract test may legitimately name these
      globals - this one does, in its own catalog above - and a violation inside a `.test.ts` never
      reaches a member, which is what the rule is protecting.
    */
    if (file.endsWith('.test.ts')) continue;
    found.push(...violationsIn(app, file, readFileSync(`${root}${file}`, 'utf8')));
  }

  return found;
}

describe('the browser dialog primitives never reach a member', () => {
  const room = scan('room', ROOM);
  const controller = scan('controller', CONTROLLER);

  it('scans both apps, and scans enough of them to mean something', () => {
    /*
      The vacuity floor. If a glob root moves or `compile` starts throwing, every assertion below
      turns into a loop over nothing and reports success. Counting the files actually read is the
      only thing that separates "clean" from "did not look".
    */
    expect(globSync('**/*.svelte', { cwd: ROOM }).length).toBeGreaterThan(40);
    expect(globSync('**/*.ts', { cwd: CONTROLLER }).length).toBeGreaterThan(40);
  });

  it('finds no native dialog call in the room', () => {
    expect(
      room.map((v) => `${v.file}:${v.line}  ${v.callee}(...)`),
      'use `dialogs` from `lib/room/dialogs.svelte.ts` - a native dialog blocks the event loop ' +
        'of a page holding live transports, and the room will decide the member left'
    ).toEqual([]);
  });

  it('finds no native dialog call in the controller', () => {
    expect(
      controller.map((v) => `${v.file}:${v.line}  ${v.callee}(...)`),
      'use `bootbox` from `lib/bootbox.svelte.ts`'
    ).toEqual([]);
  });

  it('still recognises the project primitives it must NOT flag', () => {
    /*
      The other half of the negative control, kept in the file rather than run once by hand.

      This codebase calls `onalert(...)`, `this.#alert(...)` and `dialogs.confirm(...)` in dozens of
      places. A matcher that flagged those would be reverted within a day and the rule would go back
      to being unenforced - so the fact that they are structurally distinct from a bare global is
      asserted here, on real source, rather than assumed from the shape of the code above.
    */
    const primitives = readFileSync(`${ROOM}lib/room/dialogs.svelte.ts`, 'utf8');
    expect(primitives).toContain('confirm(message: string');
    expect(violationsIn('room', 'dialogs.svelte.ts', primitives)).toEqual([]);

    const sample = `
      onalert('a');
      this.#alert('b');
      dialogs.confirm('c', () => {});
      const prompt = { onconfirm(v: string) { return v; } };
      prompt.onconfirm('d');
    `;
    expect(violationsIn('room', 'sample.ts', sample)).toEqual([]);

    /* And the thing it MUST flag, so this test cannot pass by flagging nothing at all. */
    expect(violationsIn('room', 'sample.ts', "window.alert('x'); confirm('y');").map((v) => v.callee)).toEqual([
      'window.alert',
      'confirm'
    ]);
  });
});
