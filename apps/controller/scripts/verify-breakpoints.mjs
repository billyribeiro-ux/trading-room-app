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

function mediaBlock(source, query, selector, declaration) {
  const header = `@media (${query})`;
  let queryAt = source.indexOf(header);
  while (queryAt !== -1) {
    const nextMedia = source.indexOf('@media ', queryAt + header.length);
    const block = source.slice(queryAt, nextMedia === -1 ? source.length : nextMedia);
    if (selector.test(block) && (!declaration || declaration.test(block))) return;
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
