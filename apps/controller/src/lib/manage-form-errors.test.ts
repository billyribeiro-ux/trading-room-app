import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Every failure the manage page can produce has to be visible.
 *
 * `+page.server.ts` returns `fail(...)` with a `message` on 43 paths — a blank room name, a vanity
 * slug already taken, a setting that is not in the schema, a logo of the wrong type, a member who
 * is not in this room. The page rendered NONE of them. `form` was declared as a prop and never
 * read once.
 *
 * The result was a page that looked broken rather than a page that said no. Editing a field opened
 * the editor, posted the save, got refused, and redrew identically — no change, no error, and
 * nothing in the browser console, because there was no error. The server was declining politely
 * and nobody was listening.
 *
 * That was reported as "nothing on the branding page works", and it cost most of an evening,
 * because every static check passes on a page whose only fault is that it keeps quiet. The same
 * defect was found and fixed on the account page first; this page was missed.
 *
 * Asserted on the source rather than a render because the failure only exists once a form action
 * returns — and the whole point is that the page must never be silent about it again.
 */

const PAGE = new URL('../routes/(app)/account/rooms/[id]/+page.svelte', import.meta.url);
const SERVER = new URL('../routes/(app)/account/rooms/[id]/+page.server.ts', import.meta.url);

const markup = readFileSync(PAGE, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const server = readFileSync(SERVER, 'utf8');

describe('the manage page reports server refusals', () => {
  it('the server really does have failure paths worth showing', () => {
    // guards against a vacuous pass: if these ever stop existing, the assertions below prove nothing
    const fails = server.match(/\bfail\(/g) ?? [];
    expect(fails.length).toBeGreaterThan(20);
  });

  it('renders the message from a failed action', () => {
    expect(markup).toContain('form?.message');
  });

  it('marks it as an alert, so it is announced and not merely coloured', () => {
    expect(markup).toMatch(/role="alert"/);
  });

  it('has a style for it rather than rendering unstyled text', () => {
    const css = readFileSync(new URL('../manage.css', import.meta.url), 'utf8');
    expect(css).toMatch(/^\.mg-root \.mg-error\s*\{/m);
    expect(markup).toContain('class="mg-error"');
  });

  it('puts it where it will be seen — inside the panel body, above the fields', () => {
    /*
      Position matters more than it looks. A message rendered after 260 settings rows is a message
      nobody reads, and the operator would draw exactly the same conclusion they drew before: that
      the control is dead.
    */
    /*
      Anchored on the panel body only. Two earlier versions of this assertion compared against
      `form-vertical` and then `Room Title`, and both were wrong for the same reason: those strings
      also occur in the file's header JSDoc, which is not an HTML comment and so survives the
      comment strip above. The check kept failing on correct code, which is worse than no check.
    */
    const alertAt = markup.indexOf('form?.message');
    const panelBody = markup.indexOf('class="panel-body"');
    expect(panelBody).toBeGreaterThan(-1);
    expect(alertAt).toBeGreaterThan(panelBody);
  });
});
