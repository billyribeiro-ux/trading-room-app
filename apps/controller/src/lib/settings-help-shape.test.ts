import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROOM_SETTINGS } from './room-settings-schema';

/**
 * Every settings row's HELP LABEL shape, against the reference's own markup.
 *
 * ## Why the shape is not cosmetic
 *
 * The reference writes its helper copy three different ways, and they render differently:
 *
 *     muted   <br><label class="muted">…   grey, rgb(119,119,119)
 *     plain   <br><label>…                 inherited colour, on its own line
 *     bare    <label>…                     inherited colour, NO line break before it
 *
 * Rendering one shape for all of them is a visible difference on 267 rows. `helpShape` records
 * which, and `helpOutside` records the rows whose helper sits OUTSIDE the `<p>` as a sibling.
 *
 * ## Why this test exists rather than more reading
 *
 * `page.manageSession.html` is ~2,700 lines and most of it is these rows, one after another, varying
 * only in name, label and helper. Reading them individually is how a difference in row 180 gets
 * missed after 179 identical ones. This compares all of them at once, using the extractor's own
 * rule — muted if `class="muted"`, else plain if preceded by `<br>`, else bare.
 *
 * ## A wrong version of this check came first
 *
 * The first attempt collapsed `plain` and `bare` into one bucket (it only looked for `class="muted"`)
 * and stopped scanning at `</p>`, so it missed every `helpOutside` row. It reported 52 mismatches,
 * all of them its own. The schema was right about all 267. That is recorded because a check that
 * disagrees with the data is not automatically the one that is correct.
 */

const TEMPLATE = readFileSync(
  `${process.cwd()}/evidence-dumps/TIER1-fetched/views/page.manageSession.html`,
  'utf8'
);
/** Rows the reference has switched off are not rows we must match. */
const LIVE = TEMPLATE.replace(/<!--[\s\S]*?-->/g, '');

/**
 * The reference's own rule, from `scripts/extract-manage-schema.mjs`:
 *   muted if the label carries `class="muted"`, else plain if a `<br>` precedes it, else bare.
 */
function shapeOfHelper(segment: string): string | null {
  const m = /(<br\s*\/?>)?\s*<label([^>]*)>/.exec(segment);
  if (!m) return null;
  if (m[2].includes('class="muted"')) return 'muted';
  return m[1] ? 'plain' : 'bare';
}

/** The markup following a row's editable anchor, widened past `</p>` for `helpOutside` rows. */
function helperSegment(name: string, outside: boolean): string | null {
  const at = LIVE.indexOf(`saveSessField('${name}')`);
  if (at < 0) return null;
  const window = LIVE.slice(at, at + 1400);
  const body = outside ? window : window.slice(0, window.indexOf('</p>') + 4 || 1400);
  const afterAnchor = body.indexOf('</a>');
  return afterAnchor >= 0 ? body.slice(afterAnchor + 4) : body;
}

/* Only rows with a `<label>` helper are comparable — `text` helpers have no label, and null has no
   helper at all. */
const comparable = ROOM_SETTINGS.filter(
  (d) => d.helpShape === 'muted' || d.helpShape === 'plain' || d.helpShape === 'bare'
);

describe('help-label shapes match the reference row for row', () => {
  it('has a real set to compare, so the assertion cannot be vacuous', () => {
    /* Counted 2026-08-13. If the schema shape ever stops being populated this is 0 and the loop
       below would pass while checking nothing. */
    expect(comparable.length).toBeGreaterThan(150);
  });

  it('every comparable row agrees with the template', () => {
    const wrong: string[] = [];
    for (const def of comparable) {
      const segment = helperSegment(def.name, def.helpOutside);
      if (segment === null) continue; // covered by settings-schema-covers-template
      const got = shapeOfHelper(segment);
      if (got !== def.helpShape) wrong.push(`${def.name}: template=${got} schema=${def.helpShape}`);
    }
    expect(wrong, `help shape drifted:\n${wrong.join('\n')}`).toEqual([]);
  });

  it('uses all three shapes, so none is a bucket everything fell into', () => {
    /*
      The failure this catches: an extractor that stopped distinguishing them would label all 267
      `muted` and the assertion above would still pass against a template read the same wrong way.
    */
    const shapes = new Set(comparable.map((d) => d.helpShape));
    expect([...shapes].sort()).toEqual(['bare', 'muted', 'plain']);
  });

  it('records the rows whose helper sits OUTSIDE the <p>', () => {
    /* `pairOKRedirect` and `pairErrorRedirect` put their `<br><label class="muted">` after the
       closing `</p>`, as siblings. Missing that is what made the first version of this check report
       them as having no helper at all. */
    const outside = ROOM_SETTINGS.filter((d) => d.helpOutside).map((d) => d.name);
    expect(outside).toContain('pairOKRedirect');
    expect(outside).toContain('pairErrorRedirect');
  });
});

describe('two rows that have NO helper, and used to be given someone else’s', () => {
  /*
    The extractor scanned forward from a row's anchor for a helper and did not stop at the row's own
    paragraph. Two settings whose `<p>` closes with nothing in it therefore adopted whatever came
    next:

      hidePoweredBy     took "For pushing alerts and streams to other rooms…" — the SECTION
                        INTRODUCTION for the linked-rooms block that follows an `<hr>`. An operator
                        saw a paragraph about relaying alerts under a toggle that hides a footer
                        credit.
      streamingThreads  is the LAST row in the pane. The scan ran out of the panel, through the
                        footer, into the permissions MODAL, and took its close button's `×`.

    An indent outline has no closing tags, so nothing else stopped it. Both now break on `<hr>`, on a
    new `<p>`, and on any element shallower than the row's own paragraph.
  */
  it('hidePoweredBy has no helper', () => {
    const def = ROOM_SETTINGS.find((d) => d.name === 'hidePoweredBy');
    expect(def?.help).toBeNull();
    expect(def?.helpShape).toBeNull();
  });

  it('streamingThreads has no helper', () => {
    const def = ROOM_SETTINGS.find((d) => d.name === 'streamingThreads');
    expect(def?.help).toBeNull();
    expect(def?.helpShape).toBeNull();
  });

  it('and NO row anywhere carries the linked-rooms section intro as its help', () => {
    /* The text is real and belongs to the group heading, not to any single setting. If it reappears
       attached to a row, the boundary has regressed. */
    const stolen = ROOM_SETTINGS.filter((d) => d.help?.startsWith('For pushing alerts and streams'));
    expect(stolen.map((d) => d.name)).toEqual([]);
  });

  it('nor a modal close button’s ×', () => {
    expect(ROOM_SETTINGS.filter((d) => d.help === '×').map((d) => d.name)).toEqual([]);
  });

  it('the helpOutside shape the boundary had to preserve still works', () => {
    /* `doNotAutoSoftReset`'s helper is a SIBLING of its `<p>`, one indent shallower than its anchor.
       A stricter boundary would have dropped it, which is why the test is `< anchorIndent - 2`. */
    const def = ROOM_SETTINGS.find((d) => d.name === 'doNotAutoSoftReset');
    expect(def?.help).toContain('prevent media server soft reset');
  });
});
