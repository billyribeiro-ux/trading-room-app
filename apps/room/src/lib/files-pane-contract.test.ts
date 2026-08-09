import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { db, ensureDatabase } from '$lib/server/db';
import { sharedFiles, users } from '$lib/server/db/schema';

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
vi.mock('$lib/server/room-config-client', () => ({
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

  3. THE SORT BAR. `st-fileSortBar` / `st-fileSortName` / `st-fileSortDate` / `fa-sort` /
     `fa-sort-amount-up` appear NOWHERE in the evidence we hold - not in the bundle, not in
     complete-app-styles.css (where `.fa-sort-amount-up` is only FontAwesome's glyph table), not in
     the rendered Files dump. The deployment we captured predates the feature. These class names
     come from the owner's own markup, and this file records that provenance so nobody later
     "corrects" them against a bundle that has never contained them.
*/

const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
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
  const at = page.indexOf(marker);
  if (at === -1) return null;
  // Comments first. A comment that QUOTES template syntax - "while this sat inside `{#if recording}`"
  // - is prose, but to a regex it is an `{#if}` that never closes, and every guard after it comes
  // back wrong. That is exactly how this test started failing while svelte-check stayed clean.
  const template = page.slice(0, at).replace(/<!--[\s\S]*?-->/g, '');
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
    expect(page).toContain('table table-striped m-auto w-100 mt-3 st-fileTable');
    expect(page).toContain('id="filesDriveList"');
    expect(page).toContain('class="st-fileName"');
    expect(page).toContain('class="st-fileSize ml-2"');
    expect(page).toContain('btn st-fileDownload');
    // The stub this replaced.
    expect(page).not.toContain('<article>{item.name}</article>');
  });

  it('does NOT render the captured empty heading, because its gate can never fire here', () => {
    /*
      This asserted `expect(page).toContain('No room files found.')` and went on passing after the
      heading was deleted — because the phrase survives in the comment that explains why it is
      gone. A string assertion against a whole source file cannot tell markup from prose, so it
      pins the ELEMENT instead.

      The heading is real in the reference and stays pinned in the bundle; what changed is that its
      gate (`sessionFiles` FALSY) cannot arise behind a loader that ends in `.all()`.
    */
    expect(bundle).toContain("v(1, 'No room files found.')");
    expect(page).not.toContain('<h4 class="mt-4 text-center">');
  });

  it('reports size the way the capture does', () => {
    expect(bundle).toContain('i.round(e.size / 1024)');
    expect(page).toContain('Math.round(size / 1024)');
  });
});

describe('files sort bar', () => {
  it('is absent from the pinned capture, so its provenance is the owner not the bundle', () => {
    // Still true, and worth keeping: our deployment of the app has no sort bar at all. The markup
    // below came from the owner's live room, which is a NEWER build than main.d6d3c112b59b7d0d.js.
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

  it("reproduces the owner's rendered markup exactly", () => {
    // <div class="d-flex flex-wrap justify-content-center align-items-center mt-2 st-fileSortBar">
    //   <span class="mr-2">Sorting by:</span>
    //   <button class="btn btn-sm m-1 st-fileSortName active"
    //           title="Sorted A to Z (click to sort Z to A)"> Name <i class="fas ml-2 fa-sort-alpha-down"></i></button>
    //   <button class="btn btn-sm m-1 st-fileSortDate"
    //           title="Sorted newest to oldest (click to sort oldest to newest)"> Date <i class="fas fa-sort ml-2"></i></button>
    // </div>
    expect(page).toContain(
      'd-flex flex-wrap justify-content-center align-items-center mt-2 st-fileSortBar'
    );
    expect(page).toContain('<span class="mr-2">Sorting by:</span>');
    expect(page).toContain('btn btn-sm m-1 st-fileSortName');
    expect(page).toContain('btn btn-sm m-1 st-fileSortDate');
    expect(page).toContain('Sorted A to Z (click to sort Z to A)');
    expect(page).toContain('Sorted newest to oldest (click to sort oldest to newest)');
  });

  it('keeps the icon class ORDER the capture uses, which differs by state', () => {
    // Active is `fas ml-2 fa-sort-alpha-down`; inactive is `fas fa-sort ml-2`. Not a typo - the
    // active icon is composed by ngClass and the inactive one is static, so the order flips.
    expect(page).toContain("'fa-sort-alpha-down'");
    expect(page).toContain('fas fa-sort ml-2');
  });
});

describe('file rows', () => {
  it('emits a <tr> for every searched file, empty when it belongs to another tab', () => {
    // more-fucking-evidence/sounds: 30 `<tr class="ng-star-inserted"><!----></tr>` around 2 mp3s.
    // Filtering these out would shift `nth-of-type` striping by one on every visible row.
    expect(page).toContain('{#each searchedFiles() as item (item.id)}');
    expect(page).toContain('{#if !matchesFileTab(item)}');
  });

  it('sets the anchor type to the CONTENT type, not the bucket', () => {
    // The evidence rows carry type="image/png" and type="audio/mpeg".
    expect(page).toContain('type={item.contentType}');
    expect(page).not.toContain('type={item.kind}');
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
    expect(page).toContain('{#if data.files.length > 0}');
    // The ELEMENT, not the phrase — the phrase still appears in the note explaining why it is gone,
    // and an assertion that a comment cannot mention is an assertion that forbids documenting.
    expect(page).not.toContain('<h4 class="mt-4 text-center">');
  });

  it('wires every row control', () => {
    expect(page).toContain('onclick={deleteSelectedFiles}');
    expect(page).toContain('onclick={() => deleteFile(item)}');
    expect(page).toContain('onclick={() => playMp3ForMe(item)}');
    expect(page).toContain('onclick={() => playMp3ForAll(item.url)}');
  });

  it("keeps the capture's misspelled empty-selection alert", () => {
    expect(page).toContain('No files where checked...');
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
    expect(page.split(rendered).length - 1).toBe(1);

    // ...and it sits ABOVE the per-row loop, so it cannot be emitted once per file
    const loopStart = page.indexOf('{#each searchedFiles()');
    expect(loopStart).toBeGreaterThan(-1);
    expect(page.indexOf(rendered)).toBeLessThan(loopStart);
  });

  it('searches every string field, not just the name', () => {
    /*
      The reference's `filter` pipe walks `Object.keys(row)` and tests every string-valued
      property, so "png" or "mp3" narrows the list by content type. Ours tested `item.name` alone
      and silently returned nothing for those.
    */
    expect(page).toContain("typeof field === 'string'");
    expect(page).not.toContain(
      'data.files.filter((item) => item.name.toLowerCase().includes(query))'
    );
  });

  it('leaves the row thumbnail unsized so CSS can clamp it', () => {
    /*
      The reference's const carries only alt, class, style and src; the sole sizing rule is
      `.fileDriveImg { max-width: 200px }`. A fixed 120x90 box distorted every upload that was
      not 4:3.
    */
    const img = page.slice(page.indexOf('class="fileDriveImg"'));
    const tagEnd = img.indexOf('/>');
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
    const at = page.indexOf('placeholder="Search files..."');
    expect(at).toBeGreaterThan(-1);
    const tag = page.slice(page.lastIndexOf('<input', at), page.indexOf('/>', at));
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

    const at = page.indexOf('st-fileSeeMore');
    expect(at).toBeGreaterThan(-1);
    const button = page.slice(at, page.indexOf('</button>', at));
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
      expect(page).toContain(label);
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
    expect(page.split('class="btn ml-2 btn-info set-alert-sound-btn"').length - 1).toBe(2);

    // The TITLE strings verbatim, misspelling and all.
    expect(page).toContain('title="Overwrite Cash Register Sound"');
    expect(page).toContain('title="Remove Overwrited Cash Register Sound"');

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
    const template = page.replace(/<!--[\s\S]*?-->/g, '');
    expect(template).not.toMatch(/\bpe="button"/);
    const set = page.slice(page.indexOf('title="Overwrite Cash Register Sound"'));
    expect(set.slice(0, set.indexOf('>'))).not.toContain('pe=');
    const remove = page.slice(page.indexOf('title="Remove Overwrited Cash Register Sound"'));
    expect(remove.slice(0, remove.indexOf('>'))).not.toContain('pe=');
    const setTag = page.slice(page.lastIndexOf('<button', page.indexOf('title="Overwrite Cash')));
    expect(setTag.slice(0, setTag.indexOf('>'))).toContain('type="button"');
  });

  it('renders exactly ONE of the two, because the gates are complements', () => {
    /*
      The behaviour is proven in `files-gates.test.ts` against `alertSoundButtonFor`. What this pins
      is that the TEMPLATE cannot render both: one `{#if}` with an `{:else if}`, not two
      independent blocks. Written separately, a room that never receives the setting shows both
      buttons on every sound file — which is how a missing read half announces itself.
    */
    expect(page).toContain("{#if alertSoundButton === 'set'}");
    expect(page).toContain("{:else if alertSoundButton === 'remove'}");
    // ...and the one answer both branches read is computed once per row.
    expect(page).toContain('{@const alertSoundButton = alertSoundButtonFor(');
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

    const server = readFileSync(new URL('../routes/+page.server.ts', import.meta.url), 'utf8');
    expect(server).toContain("if (cmd !== 'playMP3ForAll' && cmd !== 'stopMp3ForAll')");
    expect(server).toContain('overwriteCashRegisterSound: async ({ request, locals }) => {');

    expect(page).toContain('onclick={() => setAlertSound(item.url, true)}');
    expect(page).toContain('onclick={() => setAlertSound(item.url, false)}');
    expect(page).toContain("fetch('?/overwriteCashRegisterSound', { method: 'POST', body })");
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

    // The two elements, by their own markup rather than by a count of the word `hidden`.
    expect(page).toContain('<li role="presentation" class="nav-item" hidden={filesHidden}>');
    const pane = page.slice(page.indexOf('id="files"'));
    expect(pane.slice(0, pane.indexOf('>'))).toContain('hidden={filesHidden}');

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
    expect(page).not.toContain('file-list');
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
const { actions } = await import('../routes/+page.server');

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

/** The action's own argument type is SvelteKit-internal; this is the subset it reads. */
type ActionArgs = Parameters<(typeof actions)['overwriteCashRegisterSound']>[0];

async function setAlertSound(locals: App.Locals, fields: Record<string, string>) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  return actions.overwriteCashRegisterSound({
    request: new Request('http://room.test/', { method: 'POST', body }),
    locals
  } as unknown as ActionArgs);
}

describe('setting the alert sound', () => {
  it('writes the url through to the controller, where it survives a reload', async () => {
    controller.writes.length = 0;
    const result = await setAlertSound(presenterLocals, { url: MP3, on: 'true' });

    expect(result).toEqual({ success: true });
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
    const result = await setAlertSound(presenterLocals, { url: MP3, on: 'false' });

    expect(result).toEqual({ success: true });
    expect(controller.writes[0]?.value).toBe('');
  });

  it('refuses a member, and writes NOTHING when it does', async () => {
    controller.writes.length = 0;
    const result = await setAlertSound(memberLocals, { url: MP3, on: 'true' });

    expect(result).toMatchObject({ status: 403, data: { message: 'Presenters only.' } });
    // The status alone would pass with the write already sent. This is the half that matters.
    expect(controller.writes).toEqual([]);
  });

  it("refuses a file this room does not hold, so the room's alerts cannot be pointed anywhere", async () => {
    controller.writes.length = 0;
    for (const url of [OTHER_ROOMS_MP3, 'https://example.com/evil.mp3']) {
      const result = await setAlertSound(presenterLocals, { url, on: 'true' });
      expect(result, url).toMatchObject({ status: 400, data: { message: 'No such file.' } });
    }
    expect(controller.writes).toEqual([]);
  });

  it('refuses a file that is not audio, even though this room holds it', async () => {
    controller.writes.length = 0;
    const result = await setAlertSound(presenterLocals, { url: PDF, on: 'true' });

    expect(result).toMatchObject({ status: 400, data: { message: 'That file is not a sound.' } });
    expect(controller.writes).toEqual([]);
  });

  it('refuses an unrecognised `on`, rather than falling through to remove', async () => {
    // A loose parse would read anything that is not "true" as false and silently clear the room's
    // alert sound.
    controller.writes.length = 0;
    for (const on of ['', 'yes', '1']) {
      const result = await setAlertSound(presenterLocals, { url: MP3, on });
      expect(result, on).toMatchObject({ status: 400, data: { message: 'Unknown command.' } });
    }
    expect(controller.writes).toEqual([]);
  });

  it('fails LOUDLY when the controller refuses, rather than reporting success', async () => {
    controller.refuse = true;
    try {
      const result = await setAlertSound(presenterLocals, { url: MP3, on: 'true' });
      expect(result).toMatchObject({ status: 502 });
    } finally {
      controller.refuse = false;
    }
  });
});
