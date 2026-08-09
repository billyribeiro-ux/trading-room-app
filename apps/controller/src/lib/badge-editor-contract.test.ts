import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  The badge editor, pinned against the owner's own rendered account-page DOM.

  Everything here corresponds to something that was wrong. The editor looked right and one of its
  controls did the opposite of what it said.
*/

const page = readFileSync(new URL('../routes/(app)/account/+page.svelte', import.meta.url), 'utf8');

/** Comments stripped, so an assertion can never be satisfied by its own documentation. */
const markup = page.replace(/<!--[\s\S]*?-->/g, '');

describe('the Transparent button', () => {
  it('sets the reference sentinel, not black', () => {
    /*
      It set `#000000`: a button labelled Transparent that painted the badge BLACK. That is the
      "control whose only effect is a lie about itself" this project forbids, and it shipped.

      The reference writes `badges.bkcolor='rgba(1,0,0,0)'` — an alpha-zero colour carrying a red
      channel of 1 — and its badges table then renders that exact string as the row's inline
      `background-color: rgba(1,0,0,0)`. The two agree by construction, which is why the sentinel
      has to be that string and not `transparent` or `rgba(0,0,0,0)`.
    */
    expect(markup).toContain("const TRANSPARENT_BADGE = 'rgba(1,0,0,0)'");
    expect(markup).toContain('badgeBk = TRANSPARENT_BADGE');
    expect(markup).not.toContain("badgeBk = '#000000'");
  });

  it('carries the reference class list, rule or no rule', () => {
    /*
      `btn-tiny` has NO rule in the reference — its button computes a plain `.btn`, which is why
      ours has no rule either. The CLASS is still in the reference's markup, and a class list that
      differs is one no contract can key on. Absence of the rule is the match; absence of the class
      is a divergence.
    */
    expect(markup).toContain('acc-btn acc-btn-tiny acc-btn-default');
  });
});

describe('the editor fields keep the reference ids', () => {
  it('uses the reference ids, which are what its own emoji picker binds to', () => {
    for (const id of ['badgeInputTxt', 'badgeNameTxt', 'badgeRolesTxt', 'emoji-picker']) {
      expect(markup, `${id} must survive`).toContain(id);
    }
  });

  it('bounds the roles textarea to its container without stretching it', () => {
    /*
      A DELIBERATE DIVERGENCE, pinned in both directions because each half undoes the other.

      The reference overflows: node #91 of `NEXT-STEP/run2/welcome-run2.json` computes
      `width: auto` and `max-width: none`, so the box comes from the `cols="70"` in the markup and
      is wider than the `.col-md-6` editor holding it. The owner confirmed it renders that way in
      the live original. The capture cannot show the overflow itself — every rect in that file is
      `0×0` because the editor is `ng-show`-collapsed when captured — so the numbers are an honest
      gap and the observation is the evidence.

      `max-width: 100%` bounds it. `width: 100%` would contradict the measured `width: auto` and
      stretch the field even where there is room, which the reference does not do. So:
      max-width yes, width no, and `cols="70"` stays in the markup because it is what sizes the
      field everywhere it fits.
    */
    /*
      Comments stripped FIRST, for the same reason `markup` above strips them: the note explaining
      this rule quotes the older `#badgeRolesTxt { width: 100% }` it replaced, and the first version
      of this assertion matched that quotation instead of the rule and failed against correct CSS.
      An assertion that can be satisfied — or broken — by its own documentation is not an assertion.
    */
    const css = readFileSync(new URL('../account.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const match = /#badgeRolesTxt\s*\{[^}]*\}/.exec(css);
    expect(match, '#badgeRolesTxt must carry a rule').not.toBeNull();
    // `?? ''` rather than `match[0]`: `expect(...).not.toBeNull()` is a runtime assertion and does
    // not narrow the type, which is how this file shipped two `possibly null` errors. An empty
    // string still fails both assertions below, so the guard costs no strictness.
    const rule = match?.[0] ?? '';
    expect(rule).toMatch(/max-width:\s*100%/);
    expect(rule, 'width: 100% would contradict the measured width: auto').not.toMatch(/[^-]width:\s*100%/);
    expect(markup).toContain('cols="70"');
  });

  it('leaves the three editor fields as bare UA controls', () => {
    // The reference's are `input-emoji-txt` / `input-name-txt` / `input-text` — its own class
    // names, none of which has a rule. Applying `.acc-input` made them form-controls and
    // contradicted the measurement on six properties.
    expect(markup).toContain('class="input-emoji-txt"');
    expect(markup).toContain('class="input-name-txt"');
    expect(markup).toContain('class="input-text"');
  });
});
