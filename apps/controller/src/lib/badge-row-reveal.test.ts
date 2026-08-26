import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The badges table's row — `page.welcome.html:1157-1182` — and its double-click ID reveal.
 *
 * ## Why a SOURCE test and not a render
 *
 * `showBadgeID` is client state that SSR always renders false, so a server render shows the same
 * thing whether the reveal works or has been deleted. That is not hypothetical: reverting the
 * Select All fix earlier today left all 780 tests green for exactly this reason.
 *
 * The markup was already correct when this file was written. What was missing was anything holding
 * it there — the register listed T5-28 as "not yet built", which was wrong; it was built and
 * unguarded. Those are different problems and only one of them was real.
 *
 * ## The reference's own bug, deliberately not reproduced
 *
 * `:1180` renders the name as `{{[b.name]}}` — an ARRAY interpolation, so AngularJS prints
 * `["Gold"]`, brackets and quotes included. Ours prints the name. That is a deliberate divergence
 * and it is asserted, so nobody "restores" it while matching the reference character by character.
 */

const cwd = process.cwd();
const TEMPLATE = readFileSync(`${cwd}/evidence-dumps/TIER1-fetched/views/page.welcome.html`, 'utf8');
const PAGE = readFileSync(`${cwd}/src/routes/(app)/account/+page.svelte`, 'utf8');

describe('the reference’s badge row', () => {
  it('reveals the id on a DOUBLE click of the Badge header', () => {
    /* Checked, not remembered — a re-fetch that changes this fails here first. */
    expect(TEMPLATE).toContain('<th ng-dblclick="showBadgeID=!showBadgeID;">Badge</th>');
    expect(TEMPLATE).toContain('ng-init="showBadgeID=false"');
  });

  it('prints the id in parentheses behind two non-breaking spaces', () => {
    expect(TEMPLATE).toContain('<span class="room-badge-id" ng-show="showBadgeID">&nbsp;&nbsp;({{b._id}})</span>');
  });

  it('adds label-badge-img to the chip only when the badge has an image', () => {
    expect(TEMPLATE).toContain(`ng-class="{'label-badge-img': b.hasOwnProperty('imgURL') && b.imgURL}"`);
  });
});

describe('ours implements it', () => {
  it('toggles on double click, not on click', () => {
    /* `onclick` would fire on the first press and make the reveal an ordinary control rather than
       the easter egg it is. Three of these exist in the reference; all three are double-click or a
       counter. */
    expect(PAGE).toContain('ondblclick={() => (showBadgeID = !showBadgeID)}');
    expect(PAGE).not.toContain('onclick={() => (showBadgeID = !showBadgeID)}');
  });

  it('starts hidden, as `ng-init="showBadgeID=false"` does', () => {
    expect(PAGE).toContain('let showBadgeID = $state(false);');
  });

  it('renders the id with the two nbsp and the parentheses', () => {
    expect(PAGE).toContain('&nbsp;&nbsp;({badge.id})');
    expect(PAGE).toContain('acc-room-badge-id');
  });

  it('adds the image class to the chip only for image badges', () => {
    expect(PAGE).toContain("badge.imageUrl ? ' acc-label-badge-img' : ''");
  });

  it('does NOT reproduce the reference’s array-interpolated name', () => {
    /*
      `{{[b.name]}}` prints `["Gold"]`. Ours prints `Gold`. Asserted so a later pass matching the
      template character by character does not "restore" a bug.
    */
    expect(TEMPLATE).toContain('{{[b.name]}}');
    expect(PAGE).not.toContain('[badge.label]');
    expect(PAGE).toContain('<span class="acc-room-badge-name">{badge.label}</span>');
  });
});
