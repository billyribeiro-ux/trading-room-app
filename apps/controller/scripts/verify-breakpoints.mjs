import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

async function css(name) {
  return readFile(new URL(`../src/${name}`, import.meta.url), 'utf8');
}

function widthThresholds(source) {
  const values = new Set();
  for (const media of source.matchAll(/@media\s*([^{]+)\{/g)) {
    for (const width of media[1].matchAll(/(?:min|max)(?:-device)?-width\s*:\s*(\d+(?:\.\d+)?)px/g)) {
      values.add(Number(width[1]));
    }
  }
  return [...values].sort((a, b) => a - b);
}

/*
  A QUERY'S BLOCK ENDS AT ITS OWN CLOSING BRACE, NOT AT THE NEXT `@media`.

  The first spelling of `mediaBlock` sliced from the header to the next `@media ` in the file, and to
  END OF FILE when there was none. That slice is not the block. Everything written after the query
  closes and before the next one opens — which, for the last media query in a stylesheet, is the
  entire rest of the file — was read as though it sat inside the query.

  Measured on this tree, 2026-09-01, as bytes of unconditional stylesheet that the old slice handed
  to each assertion: `manage.css` 49,074, `auth.css` 9,164, `account.css` 5,545, `public.css` 4,207.
  `manage.css` has exactly one media query, so `.mg-root [class*='col-sm-'] { float: left }`
  satisfied its "inside min-width: 768px" assertion from ANY line of the file.

  THE CONTROL, and it took two goes to state precisely — re-run 2026-09-01:

    * **Deleting the whole `@media` and inlining its rules is NOT the control.** Both spellings go
      red on it, because `indexOf(header)` then returns -1 and the loop never runs. Reported as the
      control at first; it proves nothing about the slice.
    * **Moving the guarded rule OUT of the block while KEEPING the header and the block IS.** That
      is the real regression — the responsive gate lost, the rule still in the file — and it is
      exactly what the old slice could not see: **old exit 0 (green), fixed exit 1 (red).**

  The distinction matters beyond this file: a control that fails for the wrong reason looks like
  proof and is not.

  Braces are counted from the query's own `{`, so a nested `@media`/`@supports` is included and a
  sibling one is not. A header whose block never closes is a truncated stylesheet: `blockOf` returns
  null, the candidate is skipped, and the assertion fails rather than reading on to end of file.
*/
function blockOf(source, at, headerLength) {
  const open = source.indexOf('{', at + headerLength);
  if (open === -1) return null;
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    else if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(at, index + 1);
    }
  }
  return null;
}

function mediaBlock(source, query, selector, declaration) {
  const header = `@media (${query})`;
  let queryAt = source.indexOf(header);
  while (queryAt !== -1) {
    const block = blockOf(source, queryAt, header.length);
    if (block && selector.test(block) && (!declaration || declaration.test(block))) return;
    queryAt = source.indexOf(header, queryAt + header.length);
  }
  assert.fail(`${query} is missing ${selector} with ${declaration}`);
}

const publicCss = await css('public.css');
assert.deepEqual(widthThresholds(publicCss), [767, 768, 991, 992, 1200]);
mediaBlock(publicCss, 'min-width: 768px', /\.pub-root \.container/, /width:\s*750px/);
mediaBlock(publicCss, 'min-width: 768px', /\.pub-root \.col-sm-6/, /width:\s*50%/);
mediaBlock(publicCss, 'min-width: 992px', /\.pub-root \.container/, /width:\s*970px/);
mediaBlock(publicCss, 'min-width: 992px', /\.pub-root \.col-md-4/, /width:\s*33\.33333333%/);
mediaBlock(publicCss, 'min-width: 1200px', /\.pub-root \.container/, /width:\s*970px/);
mediaBlock(publicCss, 'max-width: 767px', /\.pub-root \.hidden-xs/, /display:\s*none\s*!important/);

const accountCss = await css('account.css');
assert.deepEqual(widthThresholds(accountCss), [767, 768, 992, 1200]);
mediaBlock(accountCss, 'min-width: 768px', /\.acc-container/, /width:\s*750px/);
mediaBlock(accountCss, 'min-width: 992px', /\.acc-body \.col-md-6/, /width:\s*50%/);
mediaBlock(accountCss, 'min-width: 1200px', /\.acc-container/, /width:\s*1170px/);
mediaBlock(accountCss, 'min-width: 768px', /\.bootbox \.modal-dialog/, /width:\s*600px/);
assert.doesNotMatch(accountCss, /@media\s*\(max-width:\s*991px\)[\s\S]{0,500}\.col-md-/);

const manageCss = await css('manage.css');
assert.deepEqual(widthThresholds(manageCss), [768]);
mediaBlock(manageCss, 'min-width: 768px', /\.mg-root \[class\*='col-sm-'\]/, /float:\s*left/);
assert.match(manageCss, /\.ad-root\s*\{[^}]*min-height:\s*100vh/);

const authCss = await css('auth.css');
assert.deepEqual(widthThresholds(authCss), [576]);
mediaBlock(authCss, 'min-width: 576px', /\.auth-column/, /width:\s*50%/);
mediaBlock(authCss, 'min-width: 576px', /\.auth-modal-dialog/, /max-width:\s*500px/);

console.log(`Breakpoint contract verified from ${root}`);
