import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  No HTML comment in a Svelte template may contain a comment marker.

  This exists because it went wrong three times in one session, and the third time shipped.

  These templates document themselves by quoting the captured Angular markup, and that markup is
  full of `<!---->` - the anchors Angular leaves where a collapsed `*ngIf` used to be. Quoting one
  inside an HTML comment ENDS THE COMMENT: `<!---->` contains `-->`. Everything after it stops
  being a comment and becomes page content.

  The failure is not subtle in the browser and is nearly invisible in the diff. The live symptom
  was paragraphs of explanatory prose rendering inside `<ul id="mainTabs">`, splitting the tab bar
  across two lines with a stray `-->` on screen. `svelte-check` passed; the tests passed; the page
  was broken.

  Write "an empty Angular comment anchor" instead, or put the marker in a `//` comment in the
  script block where it is inert.
*/

const templates = globSync('src/**/*.svelte', { cwd: process.cwd() });

describe('svelte template comments', () => {
  it('finds template files to check', () => {
    // A glob that silently matches nothing would make every assertion below vacuous.
    expect(templates.length).toBeGreaterThan(5);
  });

  it('never nests a comment marker inside an HTML comment', () => {
    const offenders: string[] = [];

    for (const file of templates) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/<!--([\s\S]*?)-->/g)) {
        const body = match[1];
        if (!body.includes('<!--') && !body.includes('-->')) continue;
        const line = source.slice(0, match.index).split('\n').length;
        offenders.push(`${file}:${line}`);
      }
    }

    expect(
      offenders,
      `An HTML comment contains a comment marker, so it terminates early and the rest leaks into ` +
        `the rendered page:\n  ${offenders.join('\n  ')}`
    ).toEqual([]);
  });
});
