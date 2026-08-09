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

  it('leaves the three editor fields as bare UA controls', () => {
    // The reference's are `input-emoji-txt` / `input-name-txt` / `input-text` — its own class
    // names, none of which has a rule. Applying `.acc-input` made them form-controls and
    // contradicted the measurement on six properties.
    expect(markup).toContain('class="input-emoji-txt"');
    expect(markup).toContain('class="input-name-txt"');
    expect(markup).toContain('class="input-text"');
  });
});
