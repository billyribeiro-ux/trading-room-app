import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The badge editor's two submit labels — `page.welcome.html:455-465`.
 *
 * ## A variable transcribed as a constant
 *
 * The reference's buttons are:
 *
 *     Add {{badges.text}}
 *     Save Edit for {{badges.text}}
 *
 * BOTH interpolate the badge's own text, so the label changes as you type: "Add VIP", "Save Edit
 * for VIP".
 *
 * Ours carried the literal strings "Add New Badge" and "Save Edit for New Badge". That is the
 * capture read as source: the text field happened to contain "New Badge" when the page was
 * captured, so the rendered label read "Save Edit for New Badge", and a fixed phrase was
 * transcribed from what was really a variable.
 *
 * It is the same trap as the four `ng-show="false"` icons and the Select All label — a rendered
 * value standing in for the expression that produced it. This file exists so it cannot come back as
 * a "tidier" constant.
 */

const cwd = process.cwd();
const TEMPLATE = readFileSync(`${cwd}/evidence-dumps/TIER1-fetched/views/page.welcome.html`, 'utf8');
const PAGE = readFileSync(`${cwd}/src/routes/(app)/account/+page.svelte`, 'utf8');

describe('the reference interpolates both labels', () => {
  it('is what the template says — checked, not remembered', () => {
    expect(TEMPLATE).toContain('Add {{badges.text}}');
    expect(TEMPLATE).toContain('Save Edit for {{badges.text}}');
  });
});

describe('ours interpolates them too', () => {
  it('the add button takes the live badge text', () => {
    expect(PAGE).toContain('>Add {badgeText}</button>');
  });

  it('the save button takes the live badge text', () => {
    expect(PAGE).toContain('Save Edit for {badgeText}</button');
  });

  it('neither label is the captured phrase frozen as a constant', () => {
    /* The exact shape of the defect. "New Badge" is still legitimate elsewhere on this page — the
       panel heading and the disclosure button — so these are asserted as the BUTTON labels only. */
    expect(PAGE).not.toContain('>Add New Badge</button>');
    expect(PAGE).not.toContain('Save Edit for New Badge</button');
  });

  it('still shows "New Badge" as the PREVIEW placeholder, which is ours and is fine', () => {
    /*
      The preview chip falls back to "New Badge" when nothing is typed — a placeholder for an empty
      chip, not a transcribed label. Distinguished so the assertion above is not read as banning the
      phrase outright.
    */
    expect(PAGE).toContain("{badgeText || 'New Badge'}");
  });
});
