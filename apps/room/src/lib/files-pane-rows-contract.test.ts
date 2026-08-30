import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { alertSoundButtonFor, type FileRow } from './files-gates';
import { MainTabRefetch } from './room/main-tab-refetch';
import { codeOf } from './source-comments';

/**
 * `FP-01`, `FP-03`, `FP-05`, `FP-13` — the Files pane's four buildable rows.
 *
 * ## Why this file exists beside `files-pane-contract.test.ts`
 *
 * That file reads `docs/source/components/app-presentationarea.full.js`, one of the thirteen
 * reference-capture roots gitignored by design, so **it does not run in this checkout at all** —
 * `gate/evidence-bound-tests.mjs` excludes it and the suite prints that on every invocation. Its
 * assertions are real and they run in CI; they cannot verify a change made here.
 *
 * So the four rows built on 2026-08-30 are pinned HERE, against the v4 bundle (which IS in the
 * repository, SHA-256 pinned) and against source text and behaviour. A row whose only test is one
 * that cannot run locally is a row whose negative control cannot be seen red, and this repository
 * treats an unseen control as no control.
 */

const read = (name: string) => readFileSync(new URL(name, import.meta.url), 'utf8');

const pane = codeOf('components/FilesPane.svelte', read('./components/FilesPane.svelte'));
const page = codeOf('routes/+page.svelte', read('../routes/+page.svelte'));
const BUNDLE = read('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js');

describe('the bundle these rows were read from', () => {
  it('is the pinned one — the vacuity floor for every offset below', () => {
    expect(BUNDLE.length).toBe(2_891_205);
  });
});

describe('FP-01 — opening Files or the video player refetches', () => {
  it('is what the reference does, read at the offset', () => {
    expect(BUNDLE.slice(1_968_369, 1_968_369 + 62)).toBe(
      '"presAreaTabs-files"==this.selectedMainTab&&this.getSessionFiles()'.slice(0, 62)
    );
  });

  it('says nothing for the tab the room opened on', () => {
    /*
      The whole reason this is a class and not an `$effect` reading `mainTab`. An effect runs once at
      mount with whatever tab the room opened on, and a refetch there fires a second load on top of
      the one that just delivered the page — for every viewer, on every navigation.
    */
    expect(new MainTabRefetch().opened('files')).toBe(false);
    expect(new MainTabRefetch().opened('videoplayer')).toBe(false);
  });

  it('refetches when the viewer switches to one of the two', () => {
    const refetch = new MainTabRefetch();
    refetch.opened('notes');
    expect(refetch.opened('files')).toBe(true);
    expect(refetch.opened('videoplayer')).toBe(true);
  });

  it('says nothing for the other five tabs', () => {
    const refetch = new MainTabRefetch();
    refetch.opened('notes');
    for (const tab of ['screens', 'streams', 'notes', 'swingAlerts', 'dayTradeAlerts'] as const) {
      expect(refetch.opened(tab), tab).toBe(false);
    }
  });

  it('does not refetch again for the tab already showing', () => {
    /*
      An effect re-runs for reasons that have nothing to do with the strip. Each of those must not be
      a network round trip.
    */
    const refetch = new MainTabRefetch();
    refetch.opened('notes');
    expect(refetch.opened('files')).toBe(true);
    expect(refetch.opened('files')).toBe(false);
    expect(refetch.opened('files')).toBe(false);
  });

  it('refetches again on a return visit', () => {
    const refetch = new MainTabRefetch();
    refetch.opened('notes');
    refetch.opened('files');
    refetch.opened('notes');
    expect(refetch.opened('files')).toBe(true);
  });

  it('is wired to the page’s narrowest refetch', () => {
    expect(page).toContain("if (mainTabRefetch.opened(mainTab)) void invalidate('room:data');");
  });
});

describe('FP-03 — the active pane class string is the reference helper’s', () => {
  it('emits `show active`, in that order', () => {
    /*
      `Hr = t => ({"show active": t})` at byte 1,916,418, over const 29's static `tab-pane fade`.
      Same class SET either way; a byte-for-byte DOM diff against a capture reports the string.
    */
    expect(BUNDLE.slice(1_916_418, 1_916_418 + 24)).toContain('"show active"');
    expect(pane).toContain("'tab-pane fade show active'");
    expect(pane).not.toContain("'tab-pane fade active show'");
  });
});

describe('FP-05 — one click handler per tab, on the <li>', () => {
  it('keeps the click on the li and nowhere else', () => {
    /*
      Const 32/34/35 carry `ngClass` and nothing else — the reference's anchors have no click. Ours
      had it on both, so an anchor click bubbled and ran the handler twice. Idempotent, so nothing
      observable broke, which is exactly why it would have stayed.
    */
    for (const tab of ['files', 'images', 'sounds']) {
      const handler = `onclick={() => (files.fileTab = '${tab}')}`;
      const occurrences = pane.split(handler).length - 1;
      expect(occurrences, `${tab} tab`).toBe(1);
      const at = pane.indexOf(handler);
      const tagAt = pane.lastIndexOf('<', at);
      expect(tagAt, `${tab}: no element around the handler`).toBeGreaterThan(-1);
      expect(pane.slice(tagAt, tagAt + 4), `${tab}: not on an <li>`).toMatch(/^<li\s/);
    }
  });

  it('keeps the keydown, which is ours and not the reference’s', () => {
    /*
      The reference's anchors are not keyboard operable. That half of the divergence is an ADDITION
      and stays, which is why this row's fix is not "make the anchor inert".
    */
    for (const tab of ['files', 'images', 'sounds']) {
      expect(pane).toContain(
        `if (event.key === 'Enter' || event.key === ' ') files.fileTab = '${tab}';`
      );
    }
  });
});

describe('FP-13 — one answer to "is this a sound", not two', () => {
  const presenter = { isPresenter: true };

  it('reads the stored kind', () => {
    expect(alertSoundButtonFor(presenter, {}, { kind: 'sound', url: '/a' })).toBe('set');
    expect(alertSoundButtonFor(presenter, {}, { kind: 'image', url: '/a' })).toBeNull();
    expect(alertSoundButtonFor(presenter, {}, { kind: 'file', url: '/a' })).toBeNull();
  });

  it('agrees with the tab the row is filed under, which it did not', () => {
    /*
      The defect, stated as the case that separates the two predicates. `kindForContentType` uses
      `startsWith`, so `application/x-audio/foo` is a `file`; the gate used
      `contentType.indexOf('audio/') >= 0`, a SUBSTRING test, so it said yes. That row was absent
      from the Sounds tab and offered the Set-Alert-Sound button anyway.
    */
    const oddball: FileRow = { kind: 'file', url: '/uploads/odd' };
    expect(alertSoundButtonFor(presenter, {}, oddball)).toBeNull();
  });

  it('has no contentType test left in the gate at all', () => {
    const gates = codeOf('files-gates.ts', read('./files-gates.ts'));
    expect(gates).toContain("if (file.kind !== 'sound') return null;");
    expect(gates).not.toContain("contentType.indexOf('audio/')");
  });
});

/**
 * `FP-12` — the const indices this file's comments cite, checked against the bundle they name.
 *
 * The row is not "a comment has a typo". It is that **the comments cited a capture this repository
 * does not hold** — `app-presentationarea.full.js`, one of the thirteen gitignored roots — so every
 * index in them was unverifiable by anybody but their author, while reading as verified. Every
 * transcribed VALUE was correct; three indices were not.
 *
 * They are cited against the v4 bundle now, and the point of this block is that the citation is
 * CHECKED rather than restated: if a future bundle renumbers these consts, this goes red and the
 * comments get corrected instead of quietly becoming wrong again.
 */
describe('FP-12 — the const citations name this bundle and are true of it', () => {
  const constAt = (index: number) => {
    /* The component's own const table — the one whose `consts:[[` follows the row templates. */
    const start = BUNDLE.indexOf('consts:[[', 1_994_000) + 'consts:'.length;
    let depth = 0;
    let cursor = start;
    while (cursor < BUNDLE.length) {
      if (BUNDLE[cursor] === '[') depth++;
      else if (BUNDLE[cursor] === ']' && --depth === 0) break;
      cursor++;
    }
    const entries: string[] = [];
    let inner = 0;
    let current = '';
    for (const character of BUNDLE.slice(start + 1, cursor)) {
      if (character === '[') inner++;
      else if (character === ']') inner--;
      if (character === ',' && inner === 0) {
        entries.push(current);
        current = '';
      } else current += character;
    }
    entries.push(current);
    return entries[index] ?? '';
  };

  it('finds a table with enough entries — the vacuity floor', () => {
    expect(constAt(0)).not.toBe('');
    expect(constAt(269)).not.toBe('');
  });

  it('157 is the Stop-Playing-For-All glyph, and it is a PLAY glyph', () => {
    expect(constAt(157)).toBe('[1,"fa","fa-play-circle","mr-2"]');
    expect(BUNDLE.slice(1_946_166, 1_946_166 + 160)).toContain(
      'T(1,"i",157),v(2,"Stop Playing For All ")'
    );
  });

  it('267 and 269 are the two alert-sound buttons that carry a click', () => {
    expect(constAt(267)).toContain('"title","Overwrite Cash Register Sound"');
    expect(constAt(267)).toContain('3,"click"');
    expect(constAt(269)).toContain('"title","Remove Overwrited Cash Register Sound"');
    expect(constAt(269)).toContain('3,"click"');
  });

  it('260 and 261 are the same two WITHOUT one — the placeholders', () => {
    expect(constAt(260)).toContain('"title","Overwrite Cash Register Sound"');
    expect(constAt(260)).not.toContain('3,"click"');
    expect(constAt(261)).not.toContain('3,"click"');
  });

  it('the `pe="button"` typo is on the Remove pair, 261 and 269', () => {
    expect(constAt(261)).toContain('["pe","button"');
    expect(constAt(269)).toContain('["pe","button"');
    expect(constAt(260)).toContain('["type","button"');
    expect(constAt(267)).toContain('["type","button"');
  });

  it('the glyphs are 268 (bell) and 144 (trash)', () => {
    expect(constAt(268)).toBe('[1,"fa","fa-bell","mr-2"]');
    expect(constAt(144)).toBe('[1,"fa","fa-trash","mr-2"]');
  });

  it('the comments themselves cite the corrected indices', () => {
    /*
      THE ONE PLACE IN THIS REPOSITORY WHERE PROSE IS THE SUBJECT, so it is read from the RAW source
      rather than through `codeOf`. Everywhere else a comment must never satisfy an assertion about
      code — this row is about the comments, and asserting them through a comment-stripper would
      assert nothing at all.
    */
    const prose = read('./components/FilesPane.svelte');
    expect(prose, 'the stale play-glyph index').not.toContain('its const 158');
    /*
      `261/262/263` and `263` still APPEAR — inside the sentences that say those were the stale
      numbers. That history is the useful half of the correction, so what is asserted is that they
      appear only as history: never as a live claim about what a const IS.
    */
    expect(prose, 'the stale alert-sound indices, as a live claim').not.toContain(
      'consts\n                                    261/262/263, both'
    );
    expect(prose).toContain('these were cited as consts 261/262/263');
    expect(prose).toContain('(Cited as 263 before `FP-12`');
    expect(prose).toContain('**157**');
    expect(prose).toContain('**267**');
    expect(prose).toContain('**269**');
  });
});
