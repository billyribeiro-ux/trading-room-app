import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { callRemote, expectSchemaRefusal } from '#lib/server/remote-command-harness.js';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { sharedFiles, users } from '#lib/server/db/schema.js';
import {
  INITIAL_FILE_SORT,
  fileSizeInKb,
  fileSortTitle,
  sortFiles,
  toggleFileSort
} from '#lib/file-sort.js';

/*
  The controller, stubbed — for the ONE action in this pane that talks to it.

  `overwriteCashRegisterSound` writes a room setting, and a room setting lives on the controller.
  `vi.hoisted` because a `vi.mock` factory is hoisted above ordinary declarations, so the recorder
  it pushes into has to be hoisted with it.

  The other two exports are stubbed as well: the module's named exports are imported by
  `+page.server.ts`, and a factory that omits one leaves that import undefined at load time rather
  than at call time.
*/
const controller = vi.hoisted(() => ({
  writes: [] as Array<{ shortCode: string; email: string; name: string; value: string }>,
  refuse: false
}));
vi.mock('#lib/server/room-config-client.js', () => ({
  readRoomConfig: async () => {
    throw new Error('files-pane-contract does not exercise the config read');
  },
  requestMobilePin: async () => {
    throw new Error('files-pane-contract does not exercise the mobile pin');
  },
  writeRoomSetting: async (shortCode: string, email: string, name: string, value: string) => {
    if (controller.refuse) throw new Error('the controller answered 500');
    controller.writes.push({ shortCode, email, name, value });
  }
}));

/*
  The Files pane, pinned against `app-presentationarea`'s const table and update block.

  Three separate things were wrong here and each one is pinned below.

  1. PERMISSIONS. The owner reported "the member only gets to see and refresh". That is not a bug -
     it is the captured behaviour, and we were the ones diverging by showing every control to
     everyone. The update block is explicit:

         O(77, o.isP ? 77 : -1)                   Delete Selected - presenter only
         O(81, o.isP ? 81 : -1)                   Upload File     - presenter only
         O(83, o.isP && o.mp3Playing ? 83 : -1)   Stop For All    - presenter + playing
         node 78                                  Refresh         - unconditional

     and per row:

         O(0,  i.isP ? 0  : -1)                   the select checkbox
         O(19, i.isP ? 19 : -1)                   Delete File

  2. THE TABLE. `visibleFiles()` rendered `<article>{item.name}</article>` - a stub. The capture
     renders `table.st-fileTable > tbody#filesDriveList`, with `st-fileName`, `st-fileSize ml-2`,
     an `st-fileDownload` anchor, and `<h4>No room files found.</h4>` when the list is empty
     (`O(84, o.sessionFiles ? -1 : 84)`).

  3. THE SORT BAR. This note used to say the sort bar appeared NOWHERE in the evidence we hold, and
     that its class names came from the owner's pasted markup rather than from a bundle. The first
     half is still true of `docs/source/`; the second half is no longer true of the repository.
     `docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js` is a NEWER capture of the same
     application and it contains the whole control - markup, titles, comparator, state transition
     and CSS. Measured with python `.count()` over the files' bytes, because both are one line and
     `grep -c` on a one-line file can only ever answer 1 or 0:

         st-fileSortBar   in docs/source/main.d6d3c112b59b7d0d.js   0
         st-fileSortBar   in docs/source-v4-2026-08-15/main....js   1

     So the search that once reported "not in the capture" was not wrong; our evidence was simply
     older than the feature. Evidence has a date. Both facts are pinned below, because the older
     capture's silence is still the reason the first build of this bar was built from a paste.
*/

/*
  THREE sources since 2026-08-16, and every assertion points at the one that owns its subject.

  The whole Files pane moved to `PresentationArea.svelte` on 2026-08-15, so `pane` is what the
  markup assertions read. `page` used to hold the HANDLERS behind that markup; Phase 5 slice 6
  moved every one of them — `setAlertSound`, `deleteFile`, `searchedFiles`, the sort pair, the
  selection and the search term — into `RoomFiles`, so `filesModule` is the third.

  An extraction is exactly when a `toContain` starts passing against the wrong file and a
  `not.toContain` goes vacuous by pointing at a file that no longer holds the subject at all. Two
  of the negatives below moved with their positives for that reason, and each is now anchored on
  something the file it reads actually contains.
*/
const pane = readFileSync(new URL('./components/FilesPane.svelte', import.meta.url), 'utf8');
/*
  THE 36 CONSTRUCTIONS MOVED TO `create-room.svelte.ts` on 2026-08-17 (Phase 5, S7).

  `+page.svelte` held 740 lines of `new Room*()` across 22 non-contiguous runs. They are now one
  composition root, and the page destructures what it returns — so every reference like `prefs.x`
  still reads exactly as before, and only the CONSTRUCTION text changed address.

  Assertions about how a class is WIRED read `ROOT`. Assertions about what the page DECIDES still
  read `PAGE`, because that is still where the argument is built.
*/
const ROOT = readFileSync(new URL('./room/create-room.svelte.ts', import.meta.url), 'utf8');
/*
  The `#files` TAB stayed in the main tab strip when the PANE became its own component on
  2026-08-16, so the two halves of the `hideFiles` gate are now in two files and each is read
  from the one that renders it.
*/
const presentationArea = readFileSync(
  new URL('./components/PresentationArea.svelte', import.meta.url),
  'utf8'
);
const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
/*
  The file drive's state and every handler behind it, extracted from the page in Phase 5 slice 6.
  `#lib/room/files.svelte.ts` — see `RoomFiles`.
*/
const filesModule = readFileSync(new URL('room/files.svelte.ts', import.meta.url), 'utf8');
const bundle = readFileSync(
  new URL('../../docs/source/components/app-presentationarea.full.js', import.meta.url),
  'utf8'
);

/**
 * The `{#if ...}` conditions still OPEN at the first occurrence of a marker.
 *
 * Nesting-aware on purpose. Taking the nearest preceding `{#if` instead reports the condition of a
 * block that has already closed - which made Refresh, which sits between two presenter-only
 * buttons, look presenter-gated when it is not inside either.
 */
function guardsFor(marker: string) {
  const at = pane.indexOf(marker);
  if (at === -1) return null;
  // Comments first. A comment that QUOTES template syntax - "while this sat inside `{#if recording}`"
  // - is prose, but to a regex it is an `{#if}` that never closes, and every guard after it comes
  // back wrong. That is exactly how this test started failing while svelte-check stayed clean.
  const template = pane.slice(0, at).replace(/<!--[\s\S]*?-->/g, '');
  const stack: string[] = [];
  for (const token of template.matchAll(/\{#if ([^}]*)\}|\{:else[^}]*\}|\{\/if\}/g)) {
    if (token[0] === '{/if}') stack.pop();
    else if (token[1] !== undefined) stack.push(token[1]);
  }
  return stack;
}

describe('files pane permissions', () => {
  it('still reads the captured gating out of the bundle', () => {
    // If these vanish, the assertions below are pinned to nothing and must be re-derived.
    expect(bundle).toContain('O(77, o.isP ? 77 : -1)');
    expect(bundle).toContain('O(81, o.isP ? 81 : -1)');
    expect(bundle).toContain('O(83, o.isP && o.mp3Playing ? 83 : -1)');
  });

  it('gates Delete Selected and Upload on the presenter', () => {
    expect(guardsFor('st-fileDeleteSelected')).toContain('isPresenter');
    expect(guardsFor('st-fileUpload')).toContain('isPresenter');
  });

  it('leaves Refresh ungated, because node 78 is unconditional', () => {
    // Refresh sits BETWEEN the two presenter-only buttons but inside neither.
    expect(guardsFor('st-fileSeeMore')).not.toContain('isPresenter');
  });

  it('gates the row checkbox and per-row Delete on the presenter', () => {
    expect(guardsFor('value={item.id}')).toContain('isPresenter');
    expect(guardsFor('title="Delete File"')).toContain('isPresenter');
  });
});

describe('files table', () => {
  it('renders the captured table, not a stub', () => {
    expect(pane).toContain('table table-striped m-auto w-100 mt-3 st-fileTable');
    expect(pane).toContain('id="filesDriveList"');
    expect(pane).toContain('class="st-fileName"');
    expect(pane).toContain('class="st-fileSize ml-2"');
    expect(pane).toContain('btn st-fileDownload');
    // The stub this replaced.
    expect(pane).not.toContain('<article>{item.name}</article>');
  });

  it('does NOT render the captured empty heading, because its gate can never fire here', () => {
    /*
      This asserted `expect(pane).toContain('No room files found.')` and went on passing after the
      heading was deleted — because the phrase survives in the comment that explains why it is
      gone. A string assertion against a whole source file cannot tell markup from prose, so it
      pins the ELEMENT instead.

      The heading is real in the reference and stays pinned in the bundle; what changed is that its
      gate (`sessionFiles` FALSY) cannot arise behind a loader that ends in `.all()`.
    */
    expect(bundle).toContain("v(1, 'No room files found.')");
    expect(pane).not.toContain('<h4 class="mt-4 text-center">');
  });

  it('reports size the way the capture does', () => {
    /*
      `fileSizeInKb` moved to `#lib/file-sort.ts` — the module that already owns how this pane sorts
      and labels its rows. Asserting the expression as a STRING here only ever proved the text
      existed; it is EXECUTED now, which is what the move bought.
    */
    expect(bundle).toContain('i.round(e.size / 1024)');
    expect(fileSizeInKb(1024)).toBe(1);
    expect(fileSizeInKb(1536), 'rounds, per `i.round`').toBe(2);
    expect(fileSizeInKb(0)).toBe(0);
    /*
      The template supplies the literal `Kb` and the function returns a number. Asserted WITHOUT the
      capture's trailing space, because prettier puts the newline there — my first attempt asserted
      `'Kb '` and failed for being wrong about the formatter, not about the markup. The space is
      still rendered; it is whitespace between the text and the closing tag.
    */
    expect(pane).toContain('>{fileSizeInKb(item.size)}Kb');
  });
});

/*
  The v4 capture — a NEWER deployment of the same application than `docs/source/`.

  Read as bytes-as-text and asserted against with `toContain`, never counted with `grep -c`: the
  file is 2,891,205 bytes on ONE line, so a line count of it is 1 no matter what it holds. Its
  sha256 is the digest `docs/source-v4-2026-08-15/sha256sums.txt` pins.
*/
const v4 = readFileSync(
  new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url),
  'utf8'
);

/*
  The template with HTML comments removed.

  Mandatory for this block rather than stylistic. The notes above the sort bar QUOTE the reference's
  const table and its rendered icon classes in order to explain them — `fas fa-sort ml-2` appears in
  prose two lines above the element that carries it. A `toContain` over the raw file cannot tell an
  attribute from a sentence about that attribute, which is the trap already documented four times in
  this file, and it would let every markup assertion below pass against its own documentation.
*/
const template = pane.replace(/<!--[\s\S]*?-->/g, '');

/*
  The same file with the SCRIPT's block comments stripped as well.

  `template` only removes HTML comments, which is enough for markup but not for an assertion that an
  identifier is GONE: the note above the sort-bar state names all three variables it replaced, in
  order to explain what they were, and a `not.toContain('nameAscending')` over the raw file finds
  that explanation and fails. The same shape caught `st-fileTable`, whose only other occurrence is a
  JSDoc about the striping rule. Strip the prose; never stop writing it.
*/
const code = template.replace(/\/\*[\s\S]*?\*\//g, '');

/** One CSS rule, from its selector to its closing brace. */
function ruleFor(css: string, selector: string) {
  const at = css.indexOf(selector);
  expect(at, selector).toBeGreaterThan(-1);
  return css.slice(at, css.indexOf('}', at) + 1);
}

/**
 * Whitespace and the optional final semicolon removed, so a prettier-formatted rule here can be
 * compared against the minified rule in the capture as a single string.
 */
const squash = (css: string) => css.replace(/\s+/g, '').replace(/;}/g, '}');

const fileSort = readFileSync(new URL('file-sort.ts', import.meta.url), 'utf8');

describe('files sort bar: the evidence it is pinned to', () => {
  it('was genuinely absent from the OLDER capture, which is why it was first built from a paste', () => {
    const captured = readFileSync(
      new URL('../../css/complete-app-styles.css', import.meta.url),
      'utf8'
    );
    const main = readFileSync(
      new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
      'utf8'
    );
    expect(main).not.toContain('st-fileSortBar');
    expect(captured).not.toContain('.st-fileSortBar');
  });

  it('is present in the v4 capture, which is where every fact below now comes from', () => {
    /*
      If any of these vanish, every assertion in the blocks below is pinned to nothing and has to be
      re-derived from a fresh read rather than trusted.
    */

    // ONE direction for the whole bar. Both icon views read the SAME `fileSortDir` — bytes
    // 1,946,450 and 1,946,605. A per-button direction cannot be expressed by these two lines.
    expect(v4).toContain('"asc"===g(2).fileSortDir?"fa-sort-alpha-down":"fa-sort-alpha-up"');
    expect(v4).toContain('"asc"===g(2).fileSortDir?"fa-sort-amount-down":"fa-sort-amount-up"');

    // The state transition, byte 1,975,308.
    expect(v4).toContain(
      'toggleFileSort(e){this.fileSortField===e?this.fileSortDir="asc"===this.fileSortDir?"desc":"asc":' +
        '(this.fileSortField=e,this.fileSortDir="date"===e?"desc":"asc")}'
    );

    // The opening state, byte 1,954,640.
    expect(v4).toContain('this.fileSortField="date",this.fileSortDir="desc"');

    // The comparator, byte 1,914,860 — and its neighbour, whose degenerate argument returns `[]`
    // where this one returns the list. The contrast is the whole point of property 2.
    expect(v4).toContain(
      'transform(e,i="",o="asc"){return e&&i?[...e].sort((s,r)=>{' +
        'const a="date"===i?new Date(s.created).getTime():(s.name||"").toLowerCase(),' +
        'l="date"===i?new Date(r.created).getTime():(r.name||"").toLowerCase();' +
        'if(a===l)return 0;const c=a>l?1:-1;return"asc"===o?c:-c}):e}'
    );
    expect(v4).toContain('transform(e,i){return e&&0!==i?e.slice(0,i):[]}');

    // `.active`, which `docs/decoded/files-sort-bar.md` listed as an honest gap. It is not a gap:
    // `mo` is read at byte 1,916,345 and both bindings at 1,950,577 and 1,950,805.
    expect(v4).toContain('mo=t=>({active:t})');
    expect(v4).toContain('z("ngClass",ct(13,mo,"name"===e.fileSortField))');
    expect(v4).toContain('z("ngClass",ct(15,mo,"date"===e.fileSortField))');

    // The labels, with their leading AND trailing spaces — bytes 1,950,263 and 1,950,396.
    expect(v4).toContain('v(4," Name ")');
    expect(v4).toContain('v(8," Date ")');

    // Search FIRST, then sort — byte 1,951,076. `Ct` binds `filter`; its result is `sortFiles`'
    // first argument.
    expect(v4).toContain(
      'rg(16,9,Ct(15,6,e.sessionFiles,e.filesSearch),e.fileSortField,e.fileSortDir)'
    );

    // The bar's PLACEMENT, which the spec also listed as a gap. Node 85 is the view `t2e`
    // (byte 2,016,231), `t2e` holds the sort bar and the table together (byte 1,950,099), and the
    // gate on node 85 is the file-count one (byte 2,018,251).
    expect(v4).toContain('(85,t2e,17,17)');
    expect(v4).toContain(
      'function t2e(t,n){if(1&t){const e=Y();d(0,"div",242)(1,"span",243),v(2,"Sorting by:")'
    );
    expect(v4).toContain('O(85,o.sessionFiles&&o.sessionFiles.length>0?85:-1)');
  });

  it('pins the three CAPTURED css rules, so app.css cannot drift back to invented ones', () => {
    /*
      Bytes 435,538-435,767 of the v4 stylesheet. The build these replaced had four declarations
      that were nobody's capture: a `:hover` rule, a `font-size` on the buttons, a transparent
      border where the reference uses the accent, and a `border-color` plus `color` on `.active`.
    */
    const capturedCss = readFileSync(
      new URL('../../docs/source-v4-2026-08-15/styles.ee2a710065b60389.css', import.meta.url),
      'utf8'
    );
    const captured = {
      bar: '.st-fileSortBar{font-size:12px}',
      buttons:
        '.st-fileSortName,.st-fileSortDate{color:var(--tabs-color);background-color:transparent;' +
        'border:1px solid var(--file-see-more-bg)}',
      active:
        '.st-fileSortName.active,.st-fileSortDate.active{background-color:var(--file-see-more-bg)}'
    };
    for (const rule of Object.values(captured)) expect(capturedCss).toContain(rule);

    /*
      Ours, compared WHOLE RULE AT A TIME rather than declaration by declaration.

      An `expect(css).toContain('border: 1px solid var(--file-see-more-bg)')` proves a declaration
      is present and says nothing about the ones beside it, which is how four invented declarations
      survived here in the first place. Comparing the entire rule means any extra one fails. It also
      avoids the other trap: `border: 1px solid transparent` is a perfectly ordinary declaration
      that four unrelated rules in this stylesheet legitimately use, so a whole-file `not.toContain`
      for it fails on `.chat-tabs button` and says nothing at all about the sort bar.
    */
    const appCss = readFileSync(new URL('../app.css', import.meta.url), 'utf8');
    const declarations = appCss.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(squash(ruleFor(declarations, '.st-fileSortBar {'))).toBe(squash(captured.bar));
    expect(squash(ruleFor(declarations, '.st-fileSortName,'))).toBe(squash(captured.buttons));
    expect(squash(ruleFor(declarations, '.st-fileSortName.active,'))).toBe(squash(captured.active));

    // The invented hover rule had a selector of its own, so its absence is a whole-file check.
    expect(declarations).not.toContain('.st-fileSortName:hover');

    // TOKENS, not resolved colours — another customer re-themes by setting these two.
    const tokens = readFileSync(new URL('styles/tokens.css', import.meta.url), 'utf8');
    expect(tokens).toContain('--tabs-color:');
    expect(tokens).toContain('--file-see-more-bg:');
    expect(ruleFor(declarations, '.st-fileSortName,')).not.toMatch(/#[0-9a-f]{3,6}/i);
    expect(ruleFor(declarations, '.st-fileSortName.active,')).not.toMatch(/#[0-9a-f]{3,6}/i);
  });
});

describe('files sort bar: the markup', () => {
  it('carries every class from consts 242-249, in the capture`s order', () => {
    expect(template).toContain(
      'd-flex flex-wrap justify-content-center align-items-center mt-2 st-fileSortBar'
    );
    expect(template).toContain('<span class="mr-2">Sorting by:</span>');
    expect(template).toContain('btn btn-sm m-1 st-fileSortName');
    expect(template).toContain('btn btn-sm m-1 st-fileSortDate');
  });

  it('keeps both labels` LEADING AND TRAILING space', () => {
    // `v(4," Name ")` and `v(8," Date ")`. Svelte trims whitespace at the edges of an element's
    // children, so each pad has to survive as an expression — the same construct the nine other
    // padded labels in this pane use.
    expect(template).toContain("{' '}Name{' '}");
    expect(template).toContain("{' '}Date{' '}");
    // ...and NOT the unpadded form the spec's own table renders them as.
    expect(template).not.toMatch(/>\s*Name\s*</);
    expect(template).not.toMatch(/>\s*Date\s*</);
  });

  it('keeps the icon class ORDER, which differs by state and is not a typo', () => {
    // Const 245 is static `fas ml-2` with the glyph appended by ngClass; const 249 is entirely
    // static. So the active icon renders `fas ml-2 fa-sort-alpha-down` and the inactive one
    // `fas fa-sort ml-2`.
    expect(template).toContain("'fa-sort-alpha-down'");
    expect(template).toContain("'fa-sort-amount-down'");
    expect(template).toContain('fas fa-sort ml-2');
  });

  it('keys BOTH icons off the ONE shared direction, never a per-button flag', () => {
    /*
      The bug this forbids: `nameAscending` and `dateNewestFirst`, one per button, which is what
      this pane shipped before the v4 capture existed. Two buttons, one `fileSortDir`.
    */
    expect(template.split("fileSort.direction === 'asc'").length - 1).toBe(2);
    // Against the comment-stripped copy: the note above the state QUOTES all three of these to
    // explain what they were, so a raw-file check would match its own documentation.
    expect(code).not.toContain('nameAscending');
    expect(code).not.toContain('dateNewestFirst');
    expect(code).not.toContain('fileSortKey');
  });

  it('applies `.active` from the FIELD alone, which is captured rather than derived', () => {
    // `mo=t=>({active:t})` applied as `ct(13,mo,"name"===e.fileSortField)` — the direction is not
    // part of it.
    expect(template).toContain("{ active: files.fileSort.field === 'name' }");
    expect(template).toContain("{ active: files.fileSort.field === 'date' }");
  });

  it('renders the bar INSIDE the file-count gate, beside the table it sorts', () => {
    /*
      Node 85 is one view holding the bar and the table, gated
      `O(85, o.sessionFiles && o.sessionFiles.length > 0 ? 85 : -1)`. Ours rendered the bar
      unconditionally, which put a "Sorting by:" strip above an absent table in every empty room.
    */
    expect(
      guardsFor('d-flex flex-wrap justify-content-center align-items-center mt-2 st-fileSortBar')
    ).toContain('data.files.length > 0');

    /*
      ...and it precedes the table, as it does inside `t2e`.

      Against `code`, not `template`: the only other `st-fileTable` in this file is a JSDoc in the
      script explaining the `nth-of-type` striping, and it sits 230,000 characters EARLIER, so the
      comparison ran against a sentence and reported a correctly-placed bar as misplaced.
    */
    expect(code.indexOf('st-fileSortBar')).toBeLessThan(code.indexOf('st-fileTable'));
  });
});

describe('files sort bar: the behaviour', () => {
  const at = (iso: string) => new Date(iso);
  const rows = [
    { name: 'beta.png', createdAt: at('2026-08-01T00:00:00Z') },
    { name: 'Alpha.mp3', createdAt: at('2026-08-03T00:00:00Z') },
    { name: 'gamma.pdf', createdAt: at('2026-08-02T00:00:00Z') }
  ];
  // `name` is optional and nullable here for the same reason it is in `SortableFile`: one fixture
  // below carries a null name to exercise the `(s.name||"")` guard, and typing this narrowly forced
  // a cast at that call site that `svelte-check` then rejected as a non-overlapping conversion.
  const names = (list: readonly { name?: string | null }[]) => list.map((row) => row.name);

  it('opens on date/desc — newest first, not unsorted and not on name', () => {
    expect(INITIAL_FILE_SORT).toEqual({ field: 'date', direction: 'desc' });
    expect(names(sortFiles(rows, INITIAL_FILE_SORT.field, INITIAL_FILE_SORT.direction))).toEqual([
      'Alpha.mp3',
      'gamma.pdf',
      'beta.png'
    ]);
  });

  it('COPIES before sorting, rather than sorting the caller`s array in place', () => {
    const before = [...rows];
    const sorted = sortFiles(rows, 'name', 'asc');
    expect(sorted).not.toBe(rows);
    expect(rows).toEqual(before);
  });

  it('PASSES THE LIST THROUGH when there is no field, rather than returning empty', () => {
    // `e && i ? … : e`. The same reference, not a copy and not `[]` — the contrast the sibling
    // `limitSwingLogs` pipe draws, where a limit of 0 does return `[]`.
    expect(sortFiles(rows, '')).toBe(rows);
    expect(sortFiles(rows)).toBe(rows);
  });

  it('defaults to an empty field and `asc`, exactly as `transform(e,i="",o="asc")` does', () => {
    expect(sortFiles(rows)).toBe(rows);
    expect(names(sortFiles(rows, 'name'))).toEqual(['Alpha.mp3', 'beta.png', 'gamma.pdf']);
  });

  it('returns 0 for ties, so equal values do NOT fall back to the other field', () => {
    const sameInstant = [
      { name: 'zebra.png', createdAt: at('2026-08-01T00:00:00Z') },
      { name: 'apple.png', createdAt: at('2026-08-01T00:00:00Z') }
    ];
    // A name tiebreaker would reorder these to apple/zebra. The reference leaves them alone, and
    // `Array.prototype.sort` is stable, so input order survives in BOTH directions.
    expect(names(sortFiles(sameInstant, 'date', 'desc'))).toEqual(['zebra.png', 'apple.png']);
    expect(names(sortFiles(sameInstant, 'date', 'asc'))).toEqual(['zebra.png', 'apple.png']);
  });

  it('sorts by name in both directions', () => {
    expect(names(sortFiles(rows, 'name', 'asc'))).toEqual(['Alpha.mp3', 'beta.png', 'gamma.pdf']);
    expect(names(sortFiles(rows, 'name', 'desc'))).toEqual(['gamma.pdf', 'beta.png', 'Alpha.mp3']);
  });

  it('compares names case-insensitively, as `(s.name||"").toLowerCase()` does', () => {
    /*
      The fixture has to be chosen to DISCRIMINATE, and the first one here did not.

      `Alpha.mp3` / `beta.png` / `gamma.pdf` sort identically with and without `toLowerCase`,
      because 'A' is 65 and 'b' is 98 — the capital already leads on a raw comparison. Deleting the
      `.toLowerCase()` from the comparator left this test GREEN, which the negative control caught
      and which is the only reason it is now written against a pair that straddles the case
      boundary: 'B' is 66 and 'a' is 97, so a case-sensitive compare puts `Banana` first and a
      case-insensitive one puts `apple` first.
    */
    const straddling = [
      { name: 'apple.png', createdAt: at('2026-08-01T00:00:00Z') },
      { name: 'Banana.png', createdAt: at('2026-08-02T00:00:00Z') }
    ];
    expect(names(sortFiles(straddling, 'name', 'asc'))).toEqual(['apple.png', 'Banana.png']);
    expect(names(sortFiles(straddling, 'name', 'desc'))).toEqual(['Banana.png', 'apple.png']);
  });

  it('treats a missing name as the empty string, as `(s.name||"")` does', () => {
    // Our column is `.notNull()`, so this only exercises the transcribed guard — but a comparator
    // that drops it throws on the first nullish name rather than sorting it to the front.
    const missing = [
      { name: 'apple.png', createdAt: at('2026-08-01T00:00:00Z') },
      { name: null, createdAt: at('2026-08-02T00:00:00Z') }
    ];
    expect(names(sortFiles(missing, 'name', 'asc'))).toEqual([null, 'apple.png']);
  });

  it('flips the direction when the ALREADY-ACTIVE field is clicked', () => {
    expect(toggleFileSort({ field: 'date', direction: 'desc' }, 'date')).toEqual({
      field: 'date',
      direction: 'asc'
    });
    expect(toggleFileSort({ field: 'date', direction: 'asc' }, 'date')).toEqual({
      field: 'date',
      direction: 'desc'
    });
  });

  it('RESETS the direction to the new field`s default when the other field is clicked', () => {
    // `date` resets to `desc`, `name` resets to `asc` — never to whatever was in force.
    expect(toggleFileSort({ field: 'date', direction: 'asc' }, 'name')).toEqual({
      field: 'name',
      direction: 'asc'
    });
    expect(toggleFileSort({ field: 'name', direction: 'desc' }, 'date')).toEqual({
      field: 'date',
      direction: 'desc'
    });
  });

  it('cannot carry a direction across a field change and back', () => {
    /*
      THE test for this control. Sort Name Z-to-A, go to Date, come back to Name: the reference
      gives A-to-Z, because the trip through Date discarded the direction. A build that remembers a
      direction per button gives Z-to-A here and is wrong in a way nothing else notices.
    */
    let state = toggleFileSort({ field: 'name', direction: 'asc' }, 'name');
    expect(state).toEqual({ field: 'name', direction: 'desc' });
    state = toggleFileSort(state, 'date');
    expect(state).toEqual({ field: 'date', direction: 'desc' });
    state = toggleFileSort(state, 'name');
    expect(state).toEqual({ field: 'name', direction: 'asc' });
  });

  it('renders the four title strings VERBATIM', () => {
    expect(fileSortTitle('name', { field: 'name', direction: 'desc' })).toBe(
      'Sorted Z to A (click to sort A to Z)'
    );
    expect(fileSortTitle('name', { field: 'name', direction: 'asc' })).toBe(
      'Sorted A to Z (click to sort Z to A)'
    );
    expect(fileSortTitle('date', { field: 'date', direction: 'asc' })).toBe(
      'Sorted oldest to newest (click to sort newest to oldest)'
    );
    expect(fileSortTitle('date', { field: 'date', direction: 'desc' })).toBe(
      'Sorted newest to oldest (click to sort oldest to newest)'
    );
  });

  it('asks whether THIS button is the governing sort before it looks at the direction', () => {
    /*
      The FIELD CONJUNCT, which `docs/decoded/files-sort-bar.md` tabulated away. Each of these two
      cases is decided by it and by nothing else: drop the conjunct and the inactive Name button
      announces "Sorted Z to A" while Date is the sort actually in force.
    */
    expect(fileSortTitle('name', { field: 'date', direction: 'desc' })).toBe(
      'Sorted A to Z (click to sort Z to A)'
    );
    expect(fileSortTitle('date', { field: 'name', direction: 'asc' })).toBe(
      'Sorted newest to oldest (click to sort oldest to newest)'
    );
  });

  it('keeps the four strings in the module the markup reads them from', () => {
    // They moved out of `+page.svelte` when the conjunct did, so this is where they are pinned now.
    for (const title of [
      'Sorted Z to A (click to sort A to Z)',
      'Sorted A to Z (click to sort Z to A)',
      'Sorted oldest to newest (click to sort newest to oldest)',
      'Sorted newest to oldest (click to sort oldest to newest)'
    ]) {
      expect(fileSort).toContain(title);
      expect(v4).toContain(title);
    }
  });
});

describe('file rows', () => {
  it('emits a <tr> for every searched file, empty when it belongs to another tab', () => {
    // more-fucking-evidence/sounds: 30 `<tr class="ng-star-inserted"><!----></tr>` around 2 mp3s.
    // Filtering these out would shift `nth-of-type` striping by one on every visible row.
    expect(pane).toContain('{#each files.searchedFiles() as item (item.id)}');
    expect(pane).toContain('{#if !files.matchesFileTab(item)}');
  });

  it('sets the anchor type to the CONTENT type, not the bucket', () => {
    // The evidence rows carry type="image/png" and type="audio/mpeg".
    expect(pane).toContain('type={item.contentType}');
    expect(pane).not.toContain('type={item.kind}');
  });

  it('renders NEITHER the heading nor the table for an empty room', () => {
    /*
      This test used to assert `{#if data.files.length === 0}` and a "No room files found."
      heading, which is the one case the reference stays silent in.

      The two gates are not complements. The heading is `O(84, o.sessionFiles ? -1 : 84)` — it
      needs `sessionFiles` FALSY — and the table is
      `O(85, o.sessionFiles && o.sessionFiles.length > 0 ? 85 : -1)`. An empty array is truthy, so
      zero files renders nothing at all. Both rendered captures agree: the badges read 0 and after
      the toolbar there are two collapsed anchors, no `h4` and no table.

      Our loader ends in `.all()`, which always returns an array, so the falsy state cannot arise
      and the heading is not rendered at all rather than kept as an unreachable branch.
    */
    expect(pane).toContain('{#if data.files.length > 0}');
    // The ELEMENT, not the phrase — the phrase still appears in the note explaining why it is gone,
    // and an assertion that a comment cannot mention is an assertion that forbids documenting.
    expect(pane).not.toContain('<h4 class="mt-4 text-center">');
  });

  it('wires every row control', () => {
    /*
      Every one of these is a METHOD on `RoomFiles` since slice 6, and `deleteSelectedFiles` is
      the one that had to change shape rather than just gain a prefix. It was
      `onclick={deleteSelectedFiles}` — a bare reference, which is fine for a function and throws
      for a method, because `this` inside it would be the `<button>`. `$state`'s own class section
      says so directly: "when calling methods in JavaScript, the value of `this` matters".

      Asserted here as well as in `unbound-method-contract.test.ts` because the two catch it at
      different moments — that file refuses the pattern anywhere in `lib/room/`, this line pins the
      wrapper on the one control that needed it.
    */
    expect(pane).toContain('onclick={() => files.deleteSelectedFiles()}');
    expect(pane).not.toContain('onclick={deleteSelectedFiles}');
    expect(pane).toContain('onclick={() => files.deleteFile(item)}');
    expect(pane).toContain('onclick={() => files.playMp3ForMe(item)}');
    // Still a page callback rather than a method: the room-wide mp3 belongs to `RoomBroadcasts`.
    expect(pane).toContain('onclick={() => playMp3ForAll(item.url)}');
  });

  it("keeps the capture's misspelled empty-selection alert", () => {
    expect(filesModule).toContain('No files where checked...');
    // It left the page in slice 6; asserting that keeps this from passing on a stale copy.
    expect(page).not.toContain('No files where checked...');
  });

  it('renders "Stop Playing For All" ONCE, in the toolbar, not per row', () => {
    /*
      The reference puts it in the otherwise-empty div after the upload row — node 82 holding
      node 83, gated `O(83, o.isP && o.mp3Playing)`. Ours had it inside each row's action cell, so
      a room with ten sounds showed ten identical buttons all stopping the same playback.
    */
    // The rendered text node, not the bare phrase — the phrase also appears in the note above the
    // button explaining where it came from, and counting that would make this test unwritable.
    const rendered = '</i>Stop Playing For All';
    expect(pane.split(rendered).length - 1).toBe(1);

    // ...and it sits ABOVE the per-row loop, so it cannot be emitted once per file
    const loopStart = pane.indexOf('{#each files.searchedFiles()');
    expect(loopStart).toBeGreaterThan(-1);
    expect(pane.indexOf(rendered)).toBeLessThan(loopStart);
  });

  it('searches every string field, not just the name', () => {
    /*
      The reference's `filter` pipe walks `Object.keys(row)` and tests every string-valued
      property, so "png" or "mp3" narrows the list by content type. Ours tested `item.name` alone
      and silently returned nothing for those.
    */
    /*
      Re-pointed at `RoomFiles` in slice 6, POSITIVE AND NEGATIVE TOGETHER. Leaving the negative on
      `page` would have left it green forever: the page no longer contains `searchedFiles` in any
      form, so a name-only filter could be reintroduced in the module without this line noticing.
      A negative is only worth writing against a file that holds the thing it forbids the wrong
      version of.
    */
    expect(filesModule).toContain("typeof field === 'string'");
    expect(filesModule).toContain('Object.values(item).some(');
    expect(filesModule).not.toContain(
      'this.#files().filter((item) => item.name.toLowerCase().includes(query))'
    );
  });

  it('leaves the row thumbnail unsized so CSS can clamp it', () => {
    /*
      The reference's const carries only alt, class, style and src; the sole sizing rule is
      `.fileDriveImg { max-width: 200px }`. A fixed 120x90 box distorted every upload that was
      not 4:3.
    */
    const img = pane.slice(pane.indexOf('class="fileDriveImg"'));
    const tagEnd = img.indexOf('/>');
    expect(tagEnd, 'the img tag must close').toBeGreaterThan(-1);
    expect(img.slice(0, tagEnd)).not.toMatch(/\bwidth=|\bheight=/);
  });
});

describe('the room opens on Screens', () => {
  it('matches new-evidence/presenter-tab, where screens-tab is the active one', () => {
    const evidence = readFileSync(
      new URL('../../new-evidence/presenter-tab', import.meta.url),
      'utf8'
    );
    const screensTab = evidence.slice(evidence.indexOf('id="screens-tab"'));
    expect(screensTab.slice(0, screensTab.indexOf('>'))).toContain('aria-selected="true"');
    expect(evidence).toContain('class="nav-link active"');

    // The room defaulted to 'notes', so a member landed on an empty Notes pane.
    expect(page).toContain("let mainTab: MainTab = $state('screens')");
  });
});

/*
  The const table, with the newlines and indentation of the pretty-printed bundle removed.

  Every const in `app-presentationarea.full.js` is an array literal broken across lines, so a
  `toContain` against the raw text can only ever match one element at a time - which is how a claim
  about "the attributes this element does NOT have" becomes unwritable. Flattened, a whole const is
  one string and can be pinned entire.
*/
const consts = bundle.replace(/\n\s*/g, '');

describe('the files search input', () => {
  it('carries no id and no name, because const 39 carries neither', () => {
    expect(consts).toContain(
      "['type','text','placeholder','Search files...','aria-label','search'," +
        "'aria-describedby','addon-wrapping',1,'form-control',3,'ngModelChange','ngModel']"
    );

    // The tag itself, not the file: the note above it names both attributes it no longer has.
    const at = pane.indexOf('placeholder="Search files..."');
    expect(at).toBeGreaterThan(-1);
    const tag = pane.slice(pane.lastIndexOf('<input', at), pane.indexOf('/>', at));
    expect(tag).not.toMatch(/\bid=/);
    expect(tag).not.toMatch(/\bname=/);
    // ...and what does name it is still there.
    expect(tag).toContain('aria-label="search"');
  });
});

describe('the files Refresh button', () => {
  it("re-runs this page's load, not every loader on the page", () => {
    /*
      `getSessionFiles()` in the reference refetches the file list alone
      (app-presentationarea.full.js:2967-2978). SvelteKit cannot go that narrow here - this route
      has one `+page.server.ts` load that builds messages, alerts, polls, notes and files together -
      but `invalidate` with the identifier that load declares is the narrowest call available, and
      it is the one the five-second poll already uses. `invalidateAll()` re-runs every load
      belonging to the active page, which is a wider blast radius for no gain.
    */
    const server = readFileSync(new URL('../routes/+page.server.ts', import.meta.url), 'utf8');
    expect(server).toContain("depends('room:data')");

    const at = pane.indexOf('st-fileSeeMore');
    expect(at).toBeGreaterThan(-1);
    const button = pane.slice(at, pane.indexOf('</button>', at));
    expect(button).toContain("onclick={() => invalidate('room:data')}");
    expect(button).not.toContain('invalidateAll');
  });
});

describe('the padded text nodes', () => {
  it('keeps the space the capture puts inside each label', () => {
    /*
      Every one of these text nodes is padded in the bundle - `v(2, 'Delete Selected ')`,
      `v(79, ' Refresh')`, `v(2, ' Upload File ')`, `v(2, 'Stop Playing For All ')`,
      `v(18, 'Download ')`, `v(2, 'Delete ')`, `v(2, 'Play ')` / `v(2, 'Stop ')`,
      `v(2, 'Play For All ')` - and the rendered captures agree: `more-fucking-evidence/sounds` has
      the literal `>Download </a>` and `>Play </span>`.

      Svelte drops whitespace at the edges of an element's children, so the pad has to be an
      expression to survive. Verified against the compiler rather than assumed: `Delete Selected\n`
      compiles to `Delete Selected`, `Delete Selected{' '}` compiles to `Delete Selected `, and
      `&#32;` is decoded and then trimmed like any other space, so it does not work.

      No pixel depends on this - a space at the end of a line box collapses. The DOM text node does,
      and that is what a byte-for-byte comparison of the two trees reads.
    */
    for (const label of [
      "Delete Selected{' '}",
      "{' '}Refresh<i",
      "Upload File{' '}",
      "Stop Playing For All{' '}",
      "Download{' '}",
      "Delete{' '}",
      "Play{' '}",
      "Stop{' '}",
      "Play For All{' '}"
    ]) {
      expect(pane).toContain(label);
    }
  });
});

describe('the alert-sound row buttons', () => {
  /*
    UPDATED, not replaced. Every assertion in this block used to run the other way round: the two
    buttons were an HONEST GAP, because neither `overwriteCashRegisterSound` nor a way to write it
    existed on this side. Both now do — the setting is on the controller's `ROOM_VISIBLE_SETTINGS`
    and `POST /internal/room-setting/{code}` writes it back — so the assertions that said "still
    missing" now say "here, and wired to the thing that persists it". The evidence pins below are
    unchanged; they are what the markup is checked against.
  */
  it('is transcribed from consts 261/262/263, with the original`s typo corrected', () => {
    expect(consts).toContain(
      "['type','button','title','Overwrite Cash Register Sound',1,'btn','ml-2','btn-info'," +
        "'set-alert-sound-btn',3,'click']"
    );
    expect(consts).toContain(
      "['pe','button','title','Remove Overwrited Cash Register Sound',1,'btn','ml-2','btn-info'," +
        "'set-alert-sound-btn',3,'click']"
    );

    // Both buttons, with the class whose rule already ships.
    const bridged = readFileSync(
      new URL('styles/captured-runtime-components.css', import.meta.url),
      'utf8'
    );
    expect(bridged).toContain('app-presentationarea .set-alert-sound-btn:not(:root)');
    expect(pane.split('class="btn ml-2 btn-info set-alert-sound-btn"').length - 1).toBe(2);

    // The TITLE strings verbatim, misspelling and all.
    expect(pane).toContain('title="Overwrite Cash Register Sound"');
    expect(pane).toContain('title="Remove Overwrited Cash Register Sound"');

    /*
      Const 263 spells the attribute `pe="button"` where every sibling spells `type`. That is a typo
      in the original, harmless only because the files table sits in no `form`. Both buttons are
      written `type="button"` here, and `pe="button"` appears nowhere in the rendered MARKUP.

      Asserted against a comment-stripped copy, which is the whole point: the note above the markup
      QUOTES the typo in order to explain why it was not transcribed, so a match against the raw
      file finds that explanation and fails. That is the fifth time today a check has matched its
      own documentation — the same shape as the `No room files found.` and `Stop Playing For All`
      assertions in this file. A `toContain`/`toMatch` over a whole source file cannot tell markup
      from prose, and the fix is always to strip the prose, never to stop writing it.
    */
    const template = pane.replace(/<!--[\s\S]*?-->/g, '');
    expect(template).not.toMatch(/\bpe="button"/);
    const set = pane.slice(pane.indexOf('title="Overwrite Cash Register Sound"'));
    expect(set.slice(0, set.indexOf('>'))).not.toContain('pe=');
    const remove = pane.slice(pane.indexOf('title="Remove Overwrited Cash Register Sound"'));
    expect(remove.slice(0, remove.indexOf('>'))).not.toContain('pe=');
    const setTag = pane.slice(pane.lastIndexOf('<button', pane.indexOf('title="Overwrite Cash')));
    expect(setTag.slice(0, setTag.indexOf('>'))).toContain('type="button"');
  });

  it('renders exactly ONE of the two, because the gates are complements', () => {
    /*
      The behaviour is proven in `files-gates.test.ts` against `alertSoundButtonFor`. What this pins
      is that the TEMPLATE cannot render both: one `{#if}` with an `{:else if}`, not two
      independent blocks. Written separately, a room that never receives the setting shows both
      buttons on every sound file — which is how a missing read half announces itself.
    */
    expect(pane).toContain("{#if alertSoundButton === 'set'}");
    expect(pane).toContain("{:else if alertSoundButton === 'remove'}");
    // ...and the one answer both branches read is computed once per row.
    expect(pane).toContain('{const alertSoundButton = $derived(alertSoundButtonFor(');
  });

  it('wires both buttons to the action that PERSISTS the choice', () => {
    /*
      READ: `sessData.overwriteCashRegisterSound` decides which button shows (full.js:1972-1991),
      and it now crosses the boundary — `RoomSessionSettings` declares it because
      `ROOM_VISIBLE_SETTINGS` allows it.

      WRITE: the handler sends the admin command `overwriteCashRegisterSound` (full.js:3084-3086).
      `fileMediaCommand` is NOT that path and still accepts exactly the two commands the capture
      defines — it broadcasts, and a room setting is durable controller state. The write goes
      through `writeRoomSetting`, which posts to the controller.
    */
    const roomConfig = readFileSync(
      new URL('server/room-config-client.ts', import.meta.url),
      'utf8'
    );
    expect(roomConfig).toContain('overwriteCashRegisterSound?: string | null;');
    expect(roomConfig).toContain('export async function writeRoomSetting(');

    /*
      Both left `+page.server.ts` for `files-pane.remote.ts`. Re-pointed rather than deleted, and
      the file it now reads is asserted to CONTAIN the pair first — an extraction is exactly when a
      `toContain` can start passing against the wrong file, or a `not.toContain` against a file that
      never held the thing.
    */
    const filesPane = readFileSync(
      new URL('../routes/files-pane.remote.ts', import.meta.url),
      'utf8'
    );
    expect(filesPane).toContain("cmd: z.enum(['playMP3ForAll', 'stopMp3ForAll'])");
    expect(filesPane).toContain('export const overwriteCashRegisterSound = command(');
    // The two are still SEPARATE. Folding the setting into the broadcast would persist nothing.
    expect(filesPane).toContain('export const fileMediaCommand = command(');

    const server = readFileSync(new URL('../routes/+page.server.ts', import.meta.url), 'utf8');
    expect(server).toContain('export const actions: Actions = {');
    expect(server).not.toContain('overwriteCashRegisterSound: async ({ request, locals }) => {');

    expect(pane).toContain('onclick={() => files.setAlertSound(item.url, true)}');
    expect(pane).toContain('onclick={() => files.setAlertSound(item.url, false)}');
    /*
      The command is INJECTED since slice 6 rather than imported by the handler, so the wiring is
      two halves and both are read: the page hands the remote command in, and the module is what
      awaits it. Asserting only the page would pass on a class that never called what it was given.
    */
    // The `RoomFiles` construction moved to the composition root in S7; the command wiring is
    // unchanged and is asserted where it now lives.
    expect(ROOT).toContain('setAlertSound: (payload) => overwriteCashRegisterSound(payload)');
    expect(filesModule).toContain('await this.#commands.setAlertSound({ url, on });');
  });

  it('gates the Files tab AND the pane on hideFiles, as the reference gates both', () => {
    /*
      `z('hidden', o.hideFiles)` on the main-tab `li` (full.js:5375) and on the `#files` pane
      (5410-5413). This test used to assert the opposite — that neither was gated, because
      `hideFiles` was not allow-listed across. It is now, so the assertion is inverted rather than
      dropped; `videoOnlyMode` is still absent and still not a setting, which
      `files-gates.test.ts` pins separately.
    */
    expect(bundle).toContain("z('hidden', o.hideFiles)");
    const roomConfig = readFileSync(
      new URL('server/room-config-client.ts', import.meta.url),
      'utf8'
    );
    expect(roomConfig).toContain('hideFiles?: boolean;');

    /*
      The two elements, by their own markup rather than by a count of the word `hidden` — and since
      2026-08-16 they are in two FILES. The tab is in the main strip, which stayed in
      `PresentationArea`; the pane is `FilesPane` itself. Reading both is what keeps the pair
      honest: either one alone leaves a tab that opens nothing or a pane still reachable from a tab
      that is gone, which is the whole point of the assertion.
    */
    expect(presentationArea).toContain(
      '<li role="presentation" class="nav-item" hidden={files.filesHidden}>'
    );
    const filesPaneEl = pane.slice(pane.indexOf('id="files"'));
    expect(filesPaneEl.slice(0, filesPaneEl.indexOf('>'))).toContain('hidden={files.filesHidden}');
    /*
      ...and the flag reaches the pane from the component that also gates the tab on it.

      SLICED TO THE INVOCATION, not searched whole-file, and that is not fussiness: the first
      version of this line was `expect(presentationArea).toContain('{filesHidden}')`, which the
      TAB's own `hidden={filesHidden}` satisfies as a substring. It could never fail, and a negative
      control proved it — deleting the hand-off entirely left this file green.

      Slice 6 replaced fifteen props with one object, so what crosses is `{files}`. The slice stays
      for the same reason: it is what makes this an assertion about the HAND-OFF rather than about
      the word appearing somewhere in a 1,145-line component.
    */
    const invocation = presentationArea.slice(presentationArea.indexOf('<FilesPane'));
    const handoff = invocation.slice(0, invocation.indexOf('/>'));
    expect(handoff, 'the FilesPane invocation must be findable').not.toBe('');
    expect(handoff).toContain('{files}');

    // ...and the pane's `display: none` is declared, because `#files.active` would otherwise win.
    const appCss = readFileSync(new URL('../app.css', import.meta.url), 'utf8');
    const declarations = appCss.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(declarations).toContain('#files[hidden]');
    expect(declarations.indexOf('#files[hidden]')).toBeGreaterThan(
      declarations.indexOf('#files.active')
    );
  });
});

describe('the Files pane stylesheet', () => {
  const appCss = readFileSync(new URL('../app.css', import.meta.url), 'utf8');
  /*
    Comments stripped. Both notes left where these rules and this declaration used to be QUOTE the
    thing they explain the removal of, and a string assertion over raw CSS cannot tell a rule from
    the prose about it - the same trap `guardsFor` documents at the top of this file, and it caught
    both of these assertions on their first run.
  */
  const declarations = appCss.replace(/\/\*[\s\S]*?\*\//g, '');

  it('has no .file-list rules, because no markup here carries that class', () => {
    // They dressed the `<article>` stub the captured table replaced. The class appears in no
    // template in this repo, so all three rules were unreachable.
    expect(declarations).not.toContain('.file-list');
    expect(pane).not.toContain('file-list');
  });

  it('does not re-declare the files badge background Bootstrap pins with !important', () => {
    /*
      `.bg-danger` is `background-color: rgba(var(--bs-danger-rgb), var(--bs-bg-opacity))
      !important` (css/complete-app-styles.css:5236, imported at the top of app.css), so
      `#myTab .files-badge { background: var(--bs-danger) }` never applied despite its higher
      specificity - and it was the same colour anyway (`--bs-danger: #dc3545`,
      `--bs-danger-rgb: 220,53,69`). A declaration that reads as the source of a colour it does not
      set is worse than no declaration.
    */
    const captured = readFileSync(
      new URL('../../css/complete-app-styles.css', import.meta.url),
      'utf8'
    );
    expect(captured).toContain(
      '.bg-danger { --bs-bg-opacity: 1; background-color: rgba(var(--bs-danger-rgb),var(--bs-bg-opacity)) !important; }'
    );
    const badge = declarations.slice(declarations.indexOf('#myTab .files-badge'));
    expect(badge.slice(0, badge.indexOf('}'))).not.toContain('background:');
  });
});

/*
  The write half, executed rather than read.

  Everything above this line reads source text, which is the right shape for markup and cannot
  prove a single thing about authorization: a `{#if isPresenter}` in the template says who sees a
  button, not who may use it. This block calls the action.
*/

const ROOM = '3625';
const OTHER_ROOM = '9999';
const MP3 = '/uploads/chaching.mp3';
const PDF = '/uploads/prospectus.pdf';
const OTHER_ROOMS_MP3 = '/uploads/not-ours.mp3';

let presenterLocals: App.Locals;
let memberLocals: App.Locals;

beforeAll(() => {
  ensureDatabase();

  const account = (role: 'staff' | 'participant', email: string) =>
    db
      .insert(users)
      .values({
        displayName: email,
        email,
        role,
        passwordHash: 'scrypt$00$00',
        createdAt: new Date()
      })
      .returning()
      .get();

  presenterLocals = {
    user: account('staff', 'files-pane-presenter@example.test'),
    sessionId: 'files-pane-contract-presenter',
    roomShortCode: ROOM
  } as App.Locals;
  memberLocals = {
    user: account('participant', 'files-pane-member@example.test'),
    sessionId: 'files-pane-contract-member',
    roomShortCode: ROOM
  } as App.Locals;

  const file = (roomShortCode: string, url: string, contentType: string) =>
    db
      .insert(sharedFiles)
      .values({
        roomShortCode,
        name: url.slice(url.lastIndexOf('/') + 1),
        kind: contentType.startsWith('audio/') ? 'sound' : 'file',
        url,
        contentType,
        size: 1,
        createdAt: new Date()
      })
      .run();

  file(ROOM, MP3, 'audio/mpeg');
  file(ROOM, PDF, 'application/pdf');
  file(OTHER_ROOM, OTHER_ROOMS_MP3, 'audio/mpeg');
});

/*
  REWRITTEN, not re-pointed, when `overwriteCashRegisterSound` became a remote command.

  Every assertion below still EXECUTES the write path against a live database and the fake
  controller — which was the whole point of this block and the reason the conversion was deferred
  until there was a way to keep it. A `command` cannot be called as a plain function: its wrapper
  opens with `get_request_store()`. `callRemote` establishes that store, and
  `remote-command-harness.ts` records which four fields Kit reads and where each was read from.

  Two things changed shape, and both are the conversion rather than a weakening:

    - a refusal REJECTS instead of returning a `fail()`, so `expect(result).toMatchObject({status})`
      became `rejects.toMatchObject({ status, body: { message } })`. The message is still asserted;
      it now rides on `body` because that is where Kit's `HttpError` puts it.
    - success returns `undefined` rather than `{ success: true }`. The command hands back nothing,
      so `expect(result).toEqual({ success: true })` would have been asserting a value invented for
      the test. What proves success is the CONTROLLER WRITE, which is what mattered all along.

  The `on: 'yes'` case became a schema test rather than a hand-written one: `z.boolean()` refuses a
  string before the handler runs, so the message is Kit's `Bad Request` and not `Unknown command.`
  Same refusal, moved one layer out, and the assertion says which layer it now lives in.
*/
const { deleteFile, fileMediaCommand, overwriteCashRegisterSound } =
  await import('../routes/files-pane.remote');

const setAlertSound = (locals: App.Locals, args: { url: string; on: boolean }) =>
  callRemote(locals, () => overwriteCashRegisterSound(args));

describe('setting the alert sound', () => {
  it('writes the url through to the controller, where it survives a reload', async () => {
    controller.writes.length = 0;
    await setAlertSound(presenterLocals, { url: MP3, on: true });

    /*
      This is the assertion the whole write path exists for. `publishToRoom` would also have made
      the buttons swap labels — and would have persisted nothing, so the next load would serve the
      old sound back. The setting reaches the controller, named, with the room and the member who
      chose it.
    */
    expect(controller.writes).toEqual([
      {
        shortCode: ROOM,
        email: 'files-pane-presenter@example.test',
        name: 'overwriteCashRegisterSound',
        value: MP3
      }
    ]);
  });

  it('sends the EMPTY STRING to remove, exactly as the reference does', async () => {
    controller.writes.length = 0;
    // `{ url: i ? e : '' }` — full.js:3085. Not the url being removed, and not an absent field.
    await setAlertSound(presenterLocals, { url: MP3, on: false });

    expect(controller.writes[0]?.value).toBe('');
  });

  it('refuses a member, and writes NOTHING when it does', async () => {
    controller.writes.length = 0;
    await expect(setAlertSound(memberLocals, { url: MP3, on: true })).rejects.toMatchObject({
      status: 403,
      body: { message: 'Presenters only.' }
    });
    // The status alone would pass with the write already sent. This is the half that matters.
    expect(controller.writes).toEqual([]);
  });

  it("refuses a file this room does not hold, so the room's alerts cannot be pointed anywhere", async () => {
    controller.writes.length = 0;
    for (const url of [OTHER_ROOMS_MP3, 'https://example.com/evil.mp3']) {
      await expect(setAlertSound(presenterLocals, { url, on: true }), url).rejects.toMatchObject({
        status: 400,
        body: { message: 'No such file.' }
      });
    }
    expect(controller.writes).toEqual([]);
  });

  it('refuses a file that is not audio, even though this room holds it', async () => {
    controller.writes.length = 0;
    await expect(setAlertSound(presenterLocals, { url: PDF, on: true })).rejects.toMatchObject({
      status: 400,
      body: { message: 'That file is not a sound.' }
    });
    expect(controller.writes).toEqual([]);
  });

  it('refuses a non-boolean `on` at the SCHEMA, rather than falling through to remove', async () => {
    /*
      A loose parse would read anything that is not "true" as false and silently clear the room's
      alert sound. The action compared against the exact strings to prevent that; `z.boolean()` now
      refuses before the handler runs, which is the same guarantee one layer earlier.

      Cast because TypeScript would not let these through — which IS the improvement, and is why the
      test has to reach around the compiler to prove the runtime still refuses them.
    */
    controller.writes.length = 0;
    for (const on of ['', 'yes', '1', 0, null]) {
      await expectSchemaRefusal(
        setAlertSound(presenterLocals, { url: MP3, on } as unknown as { url: string; on: boolean }),
        String(on)
      );
    }
    expect(controller.writes).toEqual([]);
  });

  it('fails LOUDLY when the controller refuses, rather than reporting success', async () => {
    controller.refuse = true;
    try {
      await expect(setAlertSound(presenterLocals, { url: MP3, on: true })).rejects.toMatchObject({
        status: 502
      });
    } finally {
      controller.refuse = false;
    }
  });
});

/*
  The other two Files-pane commands, which had NO executed coverage at all before this — only
  source-text assertions. Both enforce the same "a file this room holds" predicate, and that is
  precisely the sort of claim a string match cannot make.
*/
describe('playing a sound to the room', () => {
  it('refuses a member', async () => {
    await expect(
      callRemote(memberLocals, () => fileMediaCommand({ cmd: 'playMP3ForAll', url: MP3 }))
    ).rejects.toMatchObject({ status: 403, body: { message: 'Presenters only.' } });
  });

  it("refuses another room's file, so a url cannot be played into this room's speakers", async () => {
    for (const url of [OTHER_ROOMS_MP3, 'https://example.com/evil.mp3', '']) {
      await expect(
        callRemote(presenterLocals, () => fileMediaCommand({ cmd: 'playMP3ForAll', url })),
        url
      ).rejects.toMatchObject({ status: 400, body: { message: 'No such file.' } });
    }
  });

  it('allows a file this room does hold', async () => {
    await expect(
      callRemote(presenterLocals, () => fileMediaCommand({ cmd: 'playMP3ForAll', url: MP3 }))
    ).resolves.toBeUndefined();
  });

  it('and a STOP carries no url, so it is not gated on one', async () => {
    // `stopMp3ForAll() { sendServerAdminCommand('stopMp3ForAll') }` — no payload at all.
    await expect(
      callRemote(presenterLocals, () => fileMediaCommand({ cmd: 'stopMp3ForAll' }))
    ).resolves.toBeUndefined();
  });

  it('refuses a command name that is not one of the two', async () => {
    // An unknown string would reach every client in the room and be dispatched by none.
    await expectSchemaRefusal(
      callRemote(presenterLocals, () =>
        fileMediaCommand({ cmd: 'playMp3ForAll' } as unknown as { cmd: 'stopMp3ForAll' })
      ),
      'the capture capitalises MP3 on play and not on stop; a tidied-up name dispatches nowhere'
    );
  });
});

describe('deleting a file', () => {
  it('refuses a member', async () => {
    await expect(callRemote(memberLocals, () => deleteFile({ fileId: 1 }))).rejects.toMatchObject({
      status: 403,
      body: { message: 'Presenters only.' }
    });
  });

  it("refuses another room's file by id, and leaves the row where it was", async () => {
    const other = db.select().from(sharedFiles).where(eq(sharedFiles.url, OTHER_ROOMS_MP3)).get();
    expect(other, 'the fixture must exist for this to mean anything').toBeTruthy();

    await expect(
      callRemote(presenterLocals, () => deleteFile({ fileId: other!.id }))
    ).rejects.toMatchObject({ status: 404, body: { message: 'No such file.' } });

    // The half that matters: a 404 with the row already gone would be the breach, not the refusal.
    expect(db.select().from(sharedFiles).where(eq(sharedFiles.id, other!.id)).get()).toBeTruthy();
  });

  it('deletes one this room holds, and a second attempt loses the race rather than repeating', async () => {
    const row = db
      .insert(sharedFiles)
      .values({
        roomShortCode: ROOM,
        name: 'doomed.mp3',
        kind: 'sound',
        url: '/uploads/doomed.mp3',
        contentType: 'audio/mpeg',
        size: 1,
        createdAt: new Date()
      })
      .returning()
      .get();

    await expect(
      callRemote(presenterLocals, () => deleteFile({ fileId: row.id }))
    ).resolves.toBeUndefined();
    expect(db.select().from(sharedFiles).where(eq(sharedFiles.id, row.id)).get()).toBeUndefined();

    // A second delete finds nothing. True of both shapes, which is exactly the point made below.
    await expect(
      callRemote(presenterLocals, () => deleteFile({ fileId: row.id }))
    ).rejects.toMatchObject({ status: 404 });
  });

  it('closes the TOCTOU in ONE statement — and this guard is textual, deliberately', () => {
    /*
      Honest about what it can prove, because the first version of this was not.

      The claim: the action SELECTed the row, then DELETEd by the same predicate. Two presenters
      pressing delete together both find a row, both proceed, and both call `deleteStoredFile` on a
      path the first has already removed. One conditional `DELETE … RETURNING` makes zero rows the
      whole answer.

      I wrote this as a behavioural test first — delete, then delete again, expect 404 — and ran the
      negative control: putting the SELECT-then-DELETE back left it GREEN. It had to. `better-sqlite3`
      is SYNCHRONOUS, so nothing can interleave between the two statements inside one process, and
      two sequential calls behave identically either way. The race is across requests, which this
      suite cannot stage.

      So the guard is a source-text one, and it says so rather than dressing itself up as a
      behavioural proof that never was. A `db.select()` reappearing in `deleteFile` fails here.
    */
    const filesPane = readFileSync(
      new URL('../routes/files-pane.remote.ts', import.meta.url),
      'utf8'
    );
    const from = filesPane.indexOf('export const deleteFile = command(');
    expect(from, 'the command must exist for this to guard anything').toBeGreaterThan(-1);
    const body = filesPane.slice(from, filesPane.indexOf('\n);', from));

    expect(body).toContain('.delete(sharedFiles)');
    expect(body).toContain('.returning()');
    expect(body).not.toContain('.select()');
    // And the blob goes only after the row is provably gone, never before.
    expect(body.indexOf('await deleteStoredFile(row.url);')).toBeGreaterThan(
      body.indexOf("if (!row) error(404, 'No such file.');")
    );
  });
});
