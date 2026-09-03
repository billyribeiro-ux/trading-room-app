// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ngbTooltip } from './ngb-tooltip';

/**
 * The tooltip, asserted against a capture of the LIVE original rather than against a description.
 *
 * `evidence-tooltips-presenter-2026-08-11.json` was collected by `scripts/collect-tooltips.js` on
 * `chat.protradingroom.com`, signed in as a presenter. Every expectation below is READ OUT of that
 * file at run time — the element name, the class list, the placement attribute, the arrow, the
 * insertion point. Nothing is transcribed here by hand, so the test cannot drift from the evidence
 * and cannot be satisfied by a value somebody typed into it.
 *
 * ## Why that matters more than usual here
 *
 * The first implementation was built on inference — Bootstrap 4, because `x-placement` appears in
 * three modal captures — and shipped with the reasoning written up as though it were evidence. The
 * collector was written afterwards and disproved all five of its decisions: the element, the arrow
 * class, the placement attribute, the direction class and the insertion point. Reading the capture
 * here is what stops that happening a second time.
 *
 * The CSS side is asserted against `docs/source/styles.d622cb9ed2bbc221.css`, the reference's own
 * stylesheet, SHA-256 pinned by `dump-contract.test.ts`. The collector could not read the live
 * sheets — all eight were CORS-blocked, and it recorded that as an error rather than as an empty
 * result — so the rules come from the pinned copy instead.
 *
 * ## That stylesheet moved out of this file on 2026-09-03, and here is why
 *
 * It is gitignored, so a MODULE-SCOPE read of it excluded all twenty-one cases here from every
 * checkout without the dumps — this container, and CI. The collector's own JSON is COMMITTED, so
 * eighteen of them never needed anything that was missing. `ngb-tooltip-capture.test.ts` holds the
 * three reference-sheet assertions and is named for what each one anchors; what stays here is every
 * claim about the capture and about the sheet this application applies.
 */

const cwd = process.cwd();
const CAPTURE = JSON.parse(
  readFileSync(resolve(cwd, 'evidence-tooltips-presenter-2026-08-11.json'), 'utf8')
) as {
  tooltips: {
    label: string;
    appeared: boolean;
    tooltip: { tag: string; attrs: Record<string, string>; outerHTML: string } | null;
    parts: { inner: { outerHTML: string } | null };
    insertedInto: { isDirectChildOfBody: boolean; isSiblingOfHost: boolean } | null;
    hostWhileOpen?: { attrs: Record<string, string> };
  }[];
};

/** The sheet this app actually applies. The reference's own is `ngb-tooltip-capture.test.ts`. */
const APPLIED_SHEET = readFileSync(resolve(cwd, 'css/complete-app-styles.css'), 'utf8');

/** The one captured example: `placement="left"`, which is what all nine wired sites use. */
const CAPTURED = CAPTURE.tooltips.find((t) => t.appeared && t.label === 'Add Emojis')!;

function mount(text: string | null, placement: string | null) {
  // A sibling-capable parent, because the capture puts the bubble inside the host's own parent.
  const parent = document.createElement('span');
  parent.className = 'textAreaBtns';
  const host = document.createElement('i');
  if (text !== null) host.setAttribute('ngbtooltip', text);
  if (placement !== null) host.setAttribute('placement', placement);
  host.className = 'far fa-smile';
  parent.appendChild(host);
  document.body.appendChild(parent);
  const cleanup = ngbTooltip(host);
  return { parent, host, cleanup };
}

const bubble = () => document.querySelector('ngb-tooltip-window, .tooltip');
const enter = (host: Element) => host.dispatchEvent(new MouseEvent('mouseenter'));

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the capture this is built from', () => {
  it('exists and recorded a rendered tooltip', () => {
    // If this fails, every assertion below is meaningless — they all read from it.
    expect(CAPTURED, 'the capture must contain a rendered "Add Emojis" tooltip').toBeTruthy();
    expect(CAPTURED.tooltip).toBeTruthy();
  });
});

describe('what we build matches what the original rendered', () => {
  it('uses the element the capture used', () => {
    const { host } = mount('Add Emojis', 'left');
    enter(host);
    // Read from the capture: `NGB-TOOLTIP-WINDOW`, a custom element. The first version used a div.
    expect(bubble()?.tagName).toBe(CAPTURED.tooltip!.tag);
  });

  it('carries the same classes, in the same set', () => {
    const { host } = mount('Add Emojis', 'left');
    enter(host);
    const expected = CAPTURED.tooltip!.attrs.class.split(/\s+/).filter(Boolean).sort();
    // `tooltip fade show bs-tooltip-start` — `fade` and the logical `start` are both things the
    // first implementation got wrong.
    expect([...bubble()!.classList].sort()).toEqual(expected);
  });

  it('uses the placement ATTRIBUTE the capture used, with its captured value', () => {
    const { host } = mount('Add Emojis', 'left');
    enter(host);
    expect(CAPTURED.tooltip!.attrs).toHaveProperty('data-popper-placement');
    expect(bubble()?.getAttribute('data-popper-placement')).toBe(
      CAPTURED.tooltip!.attrs['data-popper-placement']
    );
    // Popper 1's spelling, which the first implementation emitted, is absent from the capture.
    expect(CAPTURED.tooltip!.attrs).not.toHaveProperty('x-placement');
    expect(bubble()?.hasAttribute('x-placement')).toBe(false);
  });

  it('builds the arrow the capture built, with its Popper marker', () => {
    const { host } = mount('Add Emojis', 'left');
    enter(host);
    const capturedHtml = CAPTURED.tooltip!.outerHTML;
    expect(capturedHtml).toContain('class="tooltip-arrow"');
    expect(capturedHtml).toContain('data-popper-arrow=""');

    const arrow = bubble()?.querySelector('.tooltip-arrow');
    expect(arrow).not.toBeNull();
    expect(arrow?.hasAttribute('data-popper-arrow')).toBe(true);
    // Bootstrap 4's spelling. The capture has none, and neither may we.
    expect(capturedHtml).not.toContain('class="arrow"');
    expect(bubble()?.querySelector('.arrow')).toBeNull();
  });

  it('puts the text in a .tooltip-inner, as the capture does', () => {
    const { host } = mount('Add Emojis', 'left');
    enter(host);
    expect(CAPTURED.parts.inner!.outerHTML).toBe('<div class="tooltip-inner">Add Emojis</div>');
    expect(bubble()?.querySelector('.tooltip-inner')?.textContent).toBe('Add Emojis');
  });

  it('inserts it beside the host, not in the body', () => {
    const { parent, host } = mount('Add Emojis', 'left');
    enter(host);
    // From the capture: `isDirectChildOfBody: false`, `isSiblingOfHost: true`. The first version
    // appended to document.body, which changes what the offsets are measured against.
    expect(CAPTURED.insertedInto!.isDirectChildOfBody).toBe(false);
    expect(CAPTURED.insertedInto!.isSiblingOfHost).toBe(true);
    expect(bubble()?.parentElement).toBe(parent);
    expect(bubble()?.parentElement).toBe(host.parentElement);
  });

  it('gives the host the aria-describedby the capture recorded, in the same id format', () => {
    const { host } = mount('Add Emojis', 'left');
    enter(host);
    const capturedId = CAPTURED.tooltip!.attrs.id;
    expect(capturedId).toMatch(/^ngb-tooltip-\d+$/);
    expect(bubble()?.id).toMatch(/^ngb-tooltip-\d+$/);
    expect(host.getAttribute('aria-describedby')).toBe(bubble()?.id);
    expect(CAPTURED.hostWhileOpen?.attrs['aria-describedby']).toBe(capturedId);
  });

  it('positions with the anchoring the captured inline style used', () => {
    const { host } = mount('Add Emojis', 'left');
    enter(host);
    // Popper's own form: pin to the containing block's top-right, then translate.
    const capturedStyle = CAPTURED.tooltip!.attrs.style;
    expect(capturedStyle).toContain('position: absolute');
    expect(capturedStyle).toContain('inset: 0px 0px auto auto');
    expect(capturedStyle).toContain('translate3d(');

    const style = (bubble() as HTMLElement).style;
    expect(style.position).toBe('absolute');
    expect(style.transform).toMatch(/^translate3d\(/);
  });
});

describe('the classes we emit are ones the APPLIED stylesheet actually paints', () => {
  /*
    A class with no rule is an invisible element, and this repository has shipped a `.flipped` with
    no CSS before. The reference half of each assertion below — that the rule we match is one the
    original genuinely paints — is `ngb-tooltip-capture.test.ts`, which reads a gitignored sheet.
    What is here is the claim about THIS application, and it is the half that can regress.
  */
  it('has a rule for the direction class the capture carried', () => {
    const direction = CAPTURED.tooltip!.attrs.class.match(/bs-tooltip-[a-z-]+/)![0];
    expect(direction).toBe('bs-tooltip-start');
    expect(APPLIED_SHEET).toContain(`.${direction} .tooltip-arrow`);
  });

  it('has rules for both element parts', () => {
    expect(APPLIED_SHEET).toContain('.tooltip-inner');
    expect(APPLIED_SHEET).toContain('.tooltip-arrow');
  });
});

describe('placements ng-bootstrap cannot resolve are refused, not guessed', () => {
  it('renders nothing for a placement with no mapping, and says why', () => {
    /*
      This test used to assert that `bottom` rendered nothing, because the capture contains `left`
      and only `left`. That was the right rule applied to an incomplete reading of the evidence: the
      direction class is not something a capture has to supply one example of at a time. The bundle
      ships the mapping as code — the `Coe` table and `koe` — and porting it derives every direction
      from the same arithmetic that produces the one branch the capture proves.

      So `bottom` now renders `bs-tooltip-bottom`, asserted in
      `ngb-tooltip-placements-contract.test.ts` alongside the stylesheet rules that paint it. What is
      refused is what the REFERENCE cannot resolve either — a placement absent from its own table.
    */
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { host } = mount('Some future control', 'sideways');
    enter(host);

    expect(bubble(), 'an unresolvable placement must render nothing').toBeNull();
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0][0])).toContain('not one ng-bootstrap resolves');
    warn.mockRestore();
  });

  it('confirms the capture really does contain only "left"', () => {
    // So the refusal above is grounded in the evidence rather than in this file's opinion.
    const placements = new Set(
      CAPTURE.tooltips
        .filter((t) => t.appeared)
        .map((t) => t.tooltip!.attrs['data-popper-placement'])
    );
    expect([...placements]).toEqual(['left']);
  });
});

describe('it does not leave anything behind', () => {
  it('removes the bubble when the pointer leaves', () => {
    const { host } = mount('Add Emojis', 'left');
    enter(host);
    expect(bubble()).not.toBeNull();
    host.dispatchEvent(new MouseEvent('mouseleave'));
    expect(bubble()).toBeNull();
  });

  it('removes it on click, so a control that opens a panel does not strand one', () => {
    // The collector's own run left four tooltips on the live original. This is that failure mode.
    const { host } = mount('Add Emojis', 'left');
    enter(host);
    host.dispatchEvent(new MouseEvent('click'));
    expect(bubble()).toBeNull();
  });

  it('removes it when the element is destroyed', () => {
    const { host, cleanup } = mount('Add Emojis', 'left');
    enter(host);
    cleanup?.();
    expect(bubble()).toBeNull();
  });

  it('does not stack duplicates when the pointer re-enters', () => {
    const { host } = mount('Add Emojis', 'left');
    enter(host);
    enter(host);
    expect(document.querySelectorAll('ngb-tooltip-window')).toHaveLength(1);
  });
});

describe('an element with no tooltip gets nothing', () => {
  it('attaches no listeners and builds nothing', () => {
    const { host, cleanup } = mount(null, 'left');
    enter(host);
    expect(bubble()).toBeNull();
    expect(cleanup).toBeUndefined();
  });

  it('treats an empty string as no tooltip rather than an empty black box', () => {
    const { host } = mount('', 'left');
    enter(host);
    expect(bubble()).toBeNull();
  });
});

describe('the text is never treated as markup', () => {
  it('renders it as text', () => {
    const { host } = mount('<img src=x onerror="alert(1)">', 'left');
    enter(host);
    const inner = bubble()?.querySelector('.tooltip-inner');
    expect(inner?.querySelector('img')).toBeNull();
    expect(inner?.textContent).toBe('<img src=x onerror="alert(1)">');
  });
});
