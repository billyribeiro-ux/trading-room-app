// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parseConstTable } from './const-table.mjs';

/**
 * THE THREE SURFACES THE AUDIT'S SEVENTH BATCH READ — `RoomShell`, `MessageBody`, `RichTextEditor`.
 *
 * ## Why this file exists, and what it is a gate ON
 *
 * `docs/decoded/room-surface-audit-2026-08-30.md` carried no section for any of the three, and each
 * of them cites the reference in prose: function names, const indices, byte offsets. Prose citations
 * rot silently, and on 2026-08-31 four of `RoomShell`'s were found WRONG — not stale, wrong from the
 * day they were written, because they name `app-room.render-helpers.js`, a capture root this
 * repository has never held (`find . -name app-room.render-helpers.js` → zero files). The names in
 * it belong to other functions entirely in the bundle this repository DOES hold:
 *
 * | cited as | what `main.d1d09071be31f1ba.js` actually holds there |
 * | --- | --- |
 * | `K4e` — "the phone's template" | the DESKTOP split (const 205, bound `direction`, has `dragEnd`) |
 * | `j4e` — "the desktop template" | one `as-split-area` holding `app-extra-chat` |
 * | `G4e` — "the phone's presentation area" | the "Update Positions" button |
 * | `W4e` — "the phone's chat/alerts area" | the "Show/Hide Positions" button |
 *
 * Every one of those was PLAUSIBLE. `K4e` really is a room split; `G4e` and `W4e` really are
 * neighbours of it in the file. A reader checking the citation by looking up the name it gives would
 * have confirmed three of the four, which is exactly the failure mode the register's own header
 * describes: *"a reader who decodes the table finds rows a reader who looks up the cited const
 * cannot"*.
 *
 * So this file does not check prose. It reads the BUNDLE, decodes the const table BY VALUE, and then
 * asserts that the component's comments name the functions the bundle actually has. The reference
 * half would fail if somebody re-pinned the bundle to a build where these moved; the ours half fails
 * the moment a comment drifts back to a name that is not in it.
 *
 * ## The bundle it reads, and why that path is safe here
 *
 * `docs/source-v4-2026-08-15/` is TRACKED and SHA-256 pinned by its own `sha256sums.txt`; it is not
 * one of the fourteen gitignored evidence roots, so `gate/evidence-bound-tests.mjs` does not exclude
 * this file and it runs on CI as well as locally. That is deliberate: 42 of this suite's files are
 * excluded on a checkout without the capture symlinks, and a citation gate that only ran on one
 * machine would be the same unwatched thing as the comment it guards.
 */
/*
  Paths relative to `apps/room`, which is where Vitest runs, rather than `new URL(…, import.meta.url)`.
  Under the jsdom environment this file declares, the global `URL` is jsdom's own and `readFileSync`
  rejects what it returns with "The URL must be of scheme file" — measured, not guessed: that is
  exactly what this file did on its first run. `dom-reference-contract.svelte.test.ts` already reads
  its sources this way for the same reason.
*/
const BUNDLE = readFileSync('docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', 'utf8');

const SHELL = readFileSync('src/lib/components/RoomShell.svelte', 'utf8');
const BODY = readFileSync('src/lib/components/MessageBody.svelte', 'utf8');
const RTE = readFileSync('src/lib/components/RichTextEditor.svelte', 'utf8');

/**
 * One `function NAME(…){…}` from the bundle, bracket-walked rather than sliced by a fixed length.
 *
 * A fixed length is the version of this that was written first and it is wrong in both directions:
 * too short truncates the update block, where every `O(n, …)` gate lives, and too long swallows the
 * next function so an assertion about THIS one can be satisfied by its neighbour. The walk respects
 * string literals, because the bundle is full of `'{'` inside class lists.
 */
function bundleFunction(name: string): { at: number; text: string } {
  const at = BUNDLE.indexOf(`function ${name}(`);
  expect(
    at,
    `the bundle has no \`function ${name}(\` — the citation names nothing`
  ).toBeGreaterThan(-1);
  const open = BUNDLE.indexOf('{', at);
  expect(open, `\`${name}\` has no body`).toBeGreaterThan(at);

  let depth = 0;
  let quote: string | null = null;
  let index = open;
  for (; index < BUNDLE.length; index += 1) {
    const char = BUNDLE[index];
    if (quote) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{' || char === '(' || char === '[') depth += 1;
    else if (char === '}' || char === ')' || char === ']') {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  expect(index, `\`${name}\` never closes — the walk fell off the end`).toBeLessThan(BUNDLE.length);
  return { at, text: BUNDLE.slice(at, index + 1) };
}

/**
 * `app-room`'s const table, DECODED BY VALUE.
 *
 * Located by the component's own `decls:38,vars:9,consts:` header rather than by a byte offset, so
 * the anchor survives a re-pin, and parsed with `const-table.mjs` — the repository's single source of
 * truth for this format, which exists because `JSON.parse(table.replaceAll("'", '"'))` destroyed the
 * apostrophe in `"Don't Disturb"` and lost all 229 entries of this exact table.
 */
const roomConsts = (): unknown[] => {
  const header = BUNDLE.indexOf('decls:38,vars:9,consts:');
  expect(
    header,
    'app-room no longer declares decls:38,vars:9 — re-read the selector block'
  ).toBeGreaterThan(-1);
  const open = BUNDLE.indexOf('[', header);
  expect(open, 'the consts table does not open with `[`').toBeGreaterThan(header);

  let depth = 0;
  let quote: string | null = null;
  let index = open;
  for (; index < BUNDLE.length; index += 1) {
    const char = BUNDLE[index];
    if (quote) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '[') depth += 1;
    else if (char === ']') {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  const table = parseConstTable(BUNDLE.slice(open, index + 1)) as unknown[];
  expect(table.length, 'the decoded table is the wrong size — app-room has 229 consts').toBe(229);
  return table;
};

describe('the pinned v4 bundle is the one these citations were read from', () => {
  it('is the file `sha256sums.txt` names', () => {
    /*
      The floor under every other assertion here. A different bundle would move every offset below
      and the failures would read as drift in our source, which is the wrong place to send a reader.
    */
    const sums = readFileSync('docs/source-v4-2026-08-15/sha256sums.txt', 'utf8');
    expect(sums).toContain('main.d1d09071be31f1ba.js');
    expect(BUNDLE.length).toBe(2891205);
  });
});

describe('the room split: which template is the phone`s, decoded rather than looked up', () => {
  it('`nRe` is the PHONE`s template — static vertical, no dragEnd', () => {
    const phone = bundleFunction('nRe');
    expect(phone.at).toBe(2496317);
    expect(phone.text).toContain('d(0,"as-split",224)');
    /* The whole difference in one assertion: the phone never records a drag. */
    expect(phone.text, 'the phone template acquired a dragEnd').not.toContain('"dragEnd"');
    /* …and never binds `direction`, because const 224 carries it as a static attribute. */
    expect(phone.text, 'the phone template acquired a direction binding').not.toContain(
      'z("direction"'
    );
    /* `acA-08` — the phone's extra-chat gate carries no direction term. */
    expect(phone.text).toContain(
      'O(3,!e.hideChatAlerts&&e.appService.globals.preferences.extraChatColumn?3:-1)'
    );
    /* Presentation FIRST on a phone, chat/alerts second — the reversal `RoomShell` renders. */
    expect(phone.text).toContain('O(1,e.hidePresentation?-1:1)');
    expect(phone.text).toContain('O(2,e.hideChatAlerts?-1:2)');
  });

  it('`K4e` is the DESKTOP one — the name `RoomShell` gave the phone until 2026-08-31', () => {
    const desktop = bundleFunction('K4e');
    expect(desktop.at).toBe(2493526);
    expect(desktop.text).toContain('d(0,"as-split",205)');
    expect(desktop.text).toContain('x("dragEnd"');
    expect(desktop.text).toContain('z("direction",e.directionRoom())');
    /* Chat/alerts FIRST on a desktop, presentation third — the other order. */
    expect(desktop.text).toContain('O(1,e.hideChatAlerts?-1:1)');
    expect(desktop.text).toContain('O(3,e.hidePresentation?-1:3)');
    /* And the desktop extra-chat gate DOES carry the direction term the phone's has not. */
    expect(desktop.text).toContain('"ltr"!==e.appService.globals.preferences.roomSplitDir');
  });

  it('`j4e`, `G4e` and `W4e` are not room splits at all', () => {
    /*
      The three names the old comment used, each checked for what it IS rather than for what it is
      not — `not.toContain('as-split')` would be answered by any function that simply has no markup,
      and the recurring bug in this repository is exactly that shape of substring assertion.
    */
    expect(bundleFunction('j4e').text).toContain('"app-extra-chat"');
    expect(bundleFunction('G4e').text).toContain('Update Positions');
    expect(bundleFunction('W4e').text).toContain('Show Positions');
  });

  it('and the phone`s own three areas are `Z4e`, `eRe` and `tRe`', () => {
    expect(bundleFunction('Z4e').text).toContain('d(0,"as-split-area",225)');
    expect(bundleFunction('eRe').text).toContain('d(0,"as-split-area",226)');
    const extra = bundleFunction('tRe');
    expect(extra.text).toContain('d(0,"as-split-area",227)');
    /* The correction to "the areas carry no order": the THIRD one does. */
    expect(extra.text).toContain('("order",e.orderChatAlerts())');
  });
});

describe('the const table says the same thing, decoded by value', () => {
  const table = roomConsts();

  it('const 224 carries `direction`/`vertical` as a static pair, and 205 binds it', () => {
    expect(table[224]).toEqual([
      'minSize',
      '0',
      'direction',
      'vertical',
      'id',
      'mainAreaSplit',
      'gutterDblClickDuration',
      '400',
      3,
      'gutterDblClick',
      'dragStart',
      'ngClass'
    ]);
    expect(table[205]).toEqual([
      'minSize',
      '0',
      'id',
      'mainAreaSplit',
      'gutterDblClickDuration',
      '400',
      3,
      'dragEnd',
      'gutterDblClick',
      'dragStart',
      'direction',
      'ngClass'
    ]);
  });

  it('the phone`s first two areas take `size` alone and the third takes `order` too', () => {
    expect(table[225]).toEqual(['minSize', '0', 1, 'presentation-box', 3, 'size']);
    expect(table[226]).toEqual(['minSize', '0', 1, 'alert-chat-box', 3, 'size']);
    expect(table[227]).toEqual(['minSize', '0', 1, 'alert-chat-box', 3, 'size', 'order']);
  });

  it('const 207 is the desktop extra column and 8 is the outer split', () => {
    /* The two the props block cites by index — checked because an index is the easiest thing to
       be one off on, which is what the sixth batch found across three components. */
    expect(table[207]).toEqual([
      'minSize',
      '0',
      1,
      'alert-chat-box',
      'alert-chat-box-extra-column',
      3,
      'size',
      'order'
    ]);
    expect(table[8]).toContain('mainAreaSplit');
    expect(table[8]).toContain('direction');
  });
});

describe('RoomShell.svelte cites the names the bundle has', () => {
  it('names the phone`s template and its three areas', () => {
    for (const name of ['`nRe`', '`Z4e`', '`eRe`', '`tRe`', '`K4e`']) {
      expect(SHELL, `RoomShell no longer cites ${name}`).toContain(name);
    }
  });

  it('cites no capture root this repository does not hold', () => {
    /*
      Both spellings, because the wrong one appeared in two forms. This is the assertion that would
      have caught the original defect on the day it was written: the file it named has never existed
      here, so the citation could not be checked by anybody reading this repository alone.
    */
    expect(SHELL, 'a citation came back to app-room.render-helpers.js').not.toContain(
      'app-room.render-helpers.js:'
    );
    expect(SHELL, 'a citation came back to app-room.full.js as an authority').not.toContain(
      '(`app-room.full.js:'
    );
  });

  it('no longer claims the phone`s areas carry no `order`', () => {
    /* `tRe` binds one. The old sentence was true of two areas out of three and was written as a
       blanket rule, which is the shape that gets copied into the next file. */
    expect(SHELL).not.toContain('the areas carry no `order`');
    expect(SHELL).toContain('const 227');
  });
});

describe('MessageBody.svelte hands a nested body every prop it received', () => {
  /**
   * The props, read out of the destructure rather than listed here.
   *
   * A hardcoded list is the version of this that cannot fail usefully: add a seventh prop and the
   * list still describes six, so the assertion goes on passing while the thing it guards has moved.
   */
  const declared = (): string[] => {
    const open = BODY.indexOf('  let {');
    expect(open, 'MessageBody no longer opens its props with `let {`').toBeGreaterThan(-1);
    const close = BODY.indexOf('  }: {', open);
    expect(close, 'the props destructure no longer closes with `}: {`').toBeGreaterThan(open);
    return [...BODY.slice(open, close).matchAll(/^\s{4}([a-zA-Z][a-zA-Z0-9]*)/gm)].map(
      (found) => found[1]
    );
  };

  it('reads the props at all', () => {
    /* The vacuity guard: an empty list makes the comparison below trivially true. */
    expect(declared()).toContain('segments');
    expect(declared().length).toBeGreaterThan(4);
  });

  it('spreads exactly the props that are not `segments`', () => {
    /*
      ## The defect, measured 2026-08-31

      The nested call listed five of the six props by name and `extraChatMsg` was not one of them, so
      a gif inside a `[{( … )}]` order rendered its placeholder as `gif_<id>` while every sibling in
      the same body rendered `gifExtra_<id>`. The reference has one `s` for the WHOLE body —
      `filterChatMessages` inserts the `tradeColor` span BEFORE `parseLinks` runs, so `urlwrapImg`
      sees the order's text with the same fourth argument as everything around it (byte 1,326,195).

      It was unreachable on the day it was found, and that is recorded rather than used to close the
      row: `extraChatMsg={true}` has exactly one call site (`ExtraChatPane.svelte`), that site is
      `kind="chat"`, and `parseBodySegments` emits a `trade` segment only for `kind === 'alert'`. A
      prop list that has to be kept in step by hand is the defect; the spread is what removes it.
    */
    const from = BODY.indexOf('const inherited = $derived({');
    expect(
      from,
      'the inherited object is gone — the nested call is respelling props again'
    ).toBeGreaterThan(-1);
    const to = BODY.indexOf('});', from);
    expect(to, 'the inherited object never closes').toBeGreaterThan(from);
    const spread = BODY.slice(from, to)
      .replace('const inherited = $derived({', '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);

    expect(spread.sort()).toEqual(
      declared()
        .filter((name) => name !== 'segments')
        .sort()
    );
    expect(BODY).toContain('<MessageBody segments={segment.children ?? []} {...inherited} />');
  });

  it('and reaches the DOM without a raw-html tag anywhere on the path', () => {
    /*
      THE HIGHEST-SEVERITY CHECK ON THIS SURFACE, and it is asserted rather than reasoned about.

      `MessageBody` renders user-typed text. Every segment kind here emits a TEXT NODE or an element
      whose attributes Svelte sets as attributes, so message text can never be parsed as markup — the
      `bypassSecurityTrustHtml` the reference leans on has no counterpart here and needs none. The
      rich-text branch, which does carry markup, is `RoomMessage`'s and goes through a server
      sanitiser first (`lib/server/chat-html.ts`).

      Spelled as a character class so this file does not contain the literal it forbids, which is the
      mistake `RoomMessage.svelte` records having made once already.
    */
    expect(BODY).not.toMatch(/\{@[h]tml/);
    /* href and src both come from `CAPTURED_URL`, which requires an http/https/ftp scheme. */
    expect(BODY).toContain('href={segment.url}');
    expect(BODY).toContain('src={segment.url}');
  });
});

describe('RichTextEditor.svelte draws its placeholder for both empty shapes', () => {
  /** The selector as SHIPPED, lifted out of the component rather than restated here. */
  const placeholderSelector = (): string => {
    const from = RTE.indexOf(':global(.ptr-rte-body');
    expect(from, 'the placeholder rule is gone or was renamed').toBeGreaterThan(-1);
    const to = RTE.indexOf('::before', from);
    expect(to, 'the placeholder rule no longer targets ::before').toBeGreaterThan(from);
    return RTE.slice(from, to)
      .replace(/^:global\(/, '')
      .replace(/\)$/, '');
  };

  it('matches an editor that has never been typed in', () => {
    const node = document.createElement('div');
    node.className = 'ptr-rte-body form-control';
    expect(node.matches(placeholderSelector())).toBe(true);
  });

  it('matches an editor that was typed in and CLEARED — the shape `:empty` alone missed', () => {
    /*
      The defect: `contenteditable` does not go back to being empty. Every engine leaves a lone
      `<br>` behind so the caret has a line to sit on, so `:empty` stopped matching the first time
      anybody deleted what they had written, and the placeholder never returned for the rest of the
      session. `retriveRTEContent()` calls this content nothing too — `'' === e || '<br>' === e`.
    */
    const node = document.createElement('div');
    node.className = 'ptr-rte-body form-control';
    node.appendChild(document.createElement('br'));
    expect(node.matches(placeholderSelector())).toBe(true);
  });

  it('and does NOT match an editor with something in it', () => {
    /* The control that stops the selector being widened into "always on". */
    const node = document.createElement('div');
    node.className = 'ptr-rte-body form-control';
    node.textContent = 'hello';
    expect(node.matches(placeholderSelector())).toBe(false);

    const bolded = document.createElement('div');
    bolded.className = 'ptr-rte-body form-control';
    bolded.innerHTML = '<b>hi</b>';
    expect(bolded.matches(placeholderSelector())).toBe(false);
  });

  it('carries the captured config verbatim, and no sixth control', () => {
    /*
      `rteConfig` is one object literal in the bundle and the component quotes it. The BUTTON SET is
      the half that can drift into a capability the capture does not have, so it is the half checked
      here — five commands, and `foreColor` is the only colour operation.
    */
    const config = BUNDLE.indexOf('this.rteConfig={placeholder:"Type your message here..."');
    expect(config, 'the captured rteConfig moved or was reworded').toBeGreaterThan(-1);
    const literal = BUNDLE.slice(config, config + 260);
    expect(literal).toContain('minHeight:200');
    expect(literal).toContain('toolbar:[["font",["bold","italic","underline","clear"]]');
    expect(literal).toContain('["color",["forecolor"]]');

    for (const command of ['bold', 'italic', 'underline', 'removeFormat']) {
      expect(RTE, `the ${command} control is gone`).toContain(`run('${command}')`);
    }
    /* `foreColor` takes the swatch as its argument, so it is spelled out rather than looped. */
    expect(RTE).toContain("run('foreColor', color)");
    /* Six `run(` calls would be a control the captured config has no entry for. */
    expect(RTE.match(/run\('/g) ?? []).toHaveLength(5);
  });
});
