import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { parse } from 'svelte/compiler';
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

  /*
    AND THE OTHER DIRECTION — a comment with NO OPENER, added 2026-08-20 after one shipped.

    `RoomOverlays.svelte:471` began `One hidden sink per remote microphone.` with no `<!--` before it
    and a `-->` three lines later. Three lines of developer prose plus a literal `-->` rendered as
    the first visible node of the overlay layer, which `+page.svelte` mounts at page top level.
    `git log -L` attributes it to the commit that created the file: the opener never existed.

    The check above could not see it, and could not have. Its pattern is `/<!--([\s\S]*?)-->/g`,
    which REQUIRES a well-formed opener to match at all — an orphan closer is not a malformed comment
    to it, it is simply not a comment. A second rule was needed, not a better regex.

    Asked of the COMPILER rather than of a pattern: parse the template and look for a text node that
    reached the fragment carrying comment prose. A real comment is a `Comment` node and never appears
    as `Text`, so this cannot false-positive on a legitimate one.
  */
  it('never leaks a comment CLOSER into the rendered page', () => {
    const offenders: string[] = [];

    for (const file of templates) {
      const source = readFileSync(file, 'utf8');
      let ast;
      try {
        ast = parse(source, { modern: true });
      } catch {
        // A file that does not parse is the compiler's problem to report, not this rule's.
        continue;
      }

      const visit = (node: unknown): void => {
        if (!node || typeof node !== 'object') return;
        const candidate = node as { type?: string; data?: string; start?: number };
        if (candidate.type === 'Text' && typeof candidate.data === 'string') {
          if (candidate.data.includes('-->')) {
            const line = source.slice(0, candidate.start ?? 0).split('\n').length;
            offenders.push(`${file}:${line} — ${candidate.data.trim().slice(0, 60)}`);
          }
        }
        for (const value of Object.values(node as Record<string, unknown>)) {
          if (Array.isArray(value)) value.forEach(visit);
          else if (value && typeof value === 'object') visit(value);
        }
      };
      visit(ast.fragment);
    }

    expect(
      offenders,
      `A '-->' reached the rendered page as TEXT, which means a comment above it is missing its ` +
        `'<!--' opener and its prose is on screen:\n  ${offenders.join('\n  ')}`
    ).toEqual([]);
  });
});
