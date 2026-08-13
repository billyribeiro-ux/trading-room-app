import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EMOJI_GROUPS, EMOJI_TOTAL } from './content/emoji-picker';

/**
 * The badge editor's emoji picker — `page.welcome.html:476` onward.
 *
 * ## What was missing
 *
 * The reference inlines 678 lines of picker markup behind its `#emoji-picker` button: a search box
 * and six groups holding 635 emoji. Ours rendered the BUTTON and nothing behind it — a control
 * whose only effect is its own presence, which this project forbids.
 *
 * ## Generated, and it fails loud
 *
 * 635 emoji is not something to retype, and the spans are written two different ways in the source
 * (`</span\n><span` run together, and one per line) — the first extraction attempt matched 9 of 635
 * because its pattern was line-anchored. The generator asserts both the group titles and the total
 * at generation time, so a re-fetch that changes either stops rather than silently emitting a
 * shorter picker. A picker missing a category looks complete to anyone who does not know what is
 * absent.
 */

const cwd = process.cwd();
const TEMPLATE = readFileSync(`${cwd}/evidence-dumps/TIER1-fetched/views/page.welcome.html`, 'utf8');
const PAGE = readFileSync(`${cwd}/src/routes/(app)/account/+page.svelte`, 'utf8');
const PICKER = readFileSync(`${cwd}/src/lib/components/EmojiPicker.svelte`, 'utf8');

describe('the evidence', () => {
  it('the reference really inlines a picker behind that button', () => {
    expect(TEMPLATE).toContain('intercom-composer-emoji-popover');
    expect(TEMPLATE).toContain('<button id="emoji-picker"');
    expect(TEMPLATE).toContain('placeholder="Search"');
  });
});

describe('the generated data', () => {
  it('has the six groups the capture holds, in its order', () => {
    expect(EMOJI_GROUPS.map((g) => g.title)).toEqual([
      'Frequently used',
      'People',
      'Nature',
      'Objects',
      'Places',
      'Symbols'
    ]);
  });

  it('holds 635 emoji, and the count is self-consistent', () => {
    expect(EMOJI_TOTAL).toBe(635);
    expect(EMOJI_GROUPS.reduce((n, g) => n + g.emoji.length, 0)).toBe(635);
  });

  it('gives every entry a name AND a character', () => {
    /* The line-anchored first attempt produced entries with empty characters. */
    for (const g of EMOJI_GROUPS) {
      for (const e of g.emoji) {
        expect(e.name, `${g.title}/${e.name}`).toMatch(/\S/);
        expect(e.char, `${g.title}/${e.name}`).toMatch(/\S/);
        expect(e.char).not.toContain('<');
      }
    }
  });

  it('is NOT stale — regenerating reproduces it exactly', () => {
    const tmp = `${cwd}/.svelte-kit/emoji.check.ts`;
    execFileSync(process.execPath, ['scripts/extract-emoji-picker.mjs', '--out', tmp], { cwd, stdio: 'pipe' });
    expect(readFileSync(tmp, 'utf8')).toBe(readFileSync(`${cwd}/src/lib/content/emoji-picker.ts`, 'utf8'));
  });
});

describe('the component and its wiring', () => {
  it('keeps the reference’s class names, which its stylesheet targets', () => {
    for (const cls of [
      'intercom-composer-popover',
      'intercom-emoji-picker',
      'intercom-composer-popover-input',
      'intercom-emoji-picker-group-title',
      'intercom-emoji-picker-emoji'
    ]) {
      expect(PICKER).toContain(cls);
    }
  });

  it('uses a BUTTON per emoji, not the reference’s span', () => {
    /*
      The one deliberate deviation, and it is stated in the component: a span carrying a click
      handler is unreachable by keyboard and invisible to a screen reader, and this is a grid of 635.
      The class is unchanged so the reference's stylesheet still applies.
    */
    expect(PICKER).toContain('<button\n                  class="intercom-emoji-picker-emoji"');
    expect(PICKER).toContain('type="button"');
  });

  it('the badge button opens it and a pick appends to the badge text', () => {
    expect(PAGE).toContain('showEmojiPicker = !showEmojiPicker');
    expect(PAGE).toContain('badgeText += char');
    /* The button is no longer inert. */
    expect(PAGE).toContain('aria-expanded={showEmojiPicker}');
  });
});
