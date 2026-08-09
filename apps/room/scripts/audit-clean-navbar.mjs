import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import * as parse5 from 'parse5';

const sourceArgument = process.argv.find((argument) => argument.startsWith('--source='));
const sourcePath = sourceArgument
  ? path.resolve(sourceArgument.slice('--source='.length))
  : new URL('../navbar-section/navbar.html', import.meta.url);
const sourceHtml = fs.readFileSync(sourcePath, 'utf8');
const urlArgument = process.argv.find((argument) => argument.startsWith('--url='));
const htmlArgument = process.argv.find((argument) => argument.startsWith('--html='));
const liveUrl = urlArgument?.slice('--url='.length) ?? 'http://127.0.0.1:5178/';

function findElement(node, predicate) {
  if (node?.tagName && predicate(node)) return node;
  for (const child of node?.childNodes ?? []) {
    const match = findElement(child, predicate);
    if (match) return match;
  }
  return null;
}

function hasClass(node, className) {
  const classAttribute = node.attrs?.find((attribute) => attribute.name === 'class');
  return classAttribute?.value.split(/\s+/).includes(className) ?? false;
}

function normalizeNode(node) {
  if (node.nodeName === '#text') {
    const value = node.value.replace(/\s+/g, ' ').trim();
    return value ? { text: value } : null;
  }

  if (!node.tagName) return null;

  const attrs = Object.fromEntries(
    [...(node.attrs ?? [])]
      .map(({ name, value }) => [name, value])
      .sort(([left], [right]) => left.localeCompare(right))
  );
  const children = (node.childNodes ?? []).map(normalizeNode).filter(Boolean);

  return { tag: node.tagName, attrs, children };
}

function flatten(node, path = 'nav', rows = []) {
  rows.push({ path, tag: node.tag, attrs: node.attrs, text: node.text });
  let elementIndex = 0;
  for (const child of node.children ?? []) {
    if (child.text !== undefined) {
      rows.push({ path: `${path}/#text`, text: child.text });
      continue;
    }
    flatten(child, `${path}/${child.tag}[${elementIndex}]`, rows);
    elementIndex += 1;
  }
  return rows;
}

function firstDifference(expected, actual) {
  const expectedRows = flatten(expected);
  const actualRows = flatten(actual);
  const length = Math.max(expectedRows.length, actualRows.length);
  for (let index = 0; index < length; index += 1) {
    if (JSON.stringify(expectedRows[index]) !== JSON.stringify(actualRows[index])) {
      return {
        index,
        expected: expectedRows[index] ?? null,
        actual: actualRows[index] ?? null
      };
    }
  }
  return null;
}

let responseStatus = null;
let liveHtml;
if (htmlArgument) {
  liveHtml = fs.readFileSync(htmlArgument.slice('--html='.length), 'utf8');
} else {
  const liveResponse = await fetch(liveUrl);
  if (!liveResponse.ok) {
    throw new Error(`Unable to load ${liveUrl}: ${liveResponse.status} ${liveResponse.statusText}`);
  }
  responseStatus = liveResponse.status;
  liveHtml = await liveResponse.text();
}
const expectedDocument = parse5.parseFragment(sourceHtml);
const liveDocument = parse5.parse(liveHtml);
const expectedNavbar = findElement(expectedDocument, (node) => hasClass(node, 'mainAppNav'));
const actualNavbar = findElement(liveDocument, (node) => hasClass(node, 'mainAppNav'));

if (!expectedNavbar || !actualNavbar) {
  throw new Error(
    `Navbar root missing. expected=${Boolean(expectedNavbar)} actual=${Boolean(actualNavbar)}`
  );
}

const expected = normalizeNode(expectedNavbar);
const actual = normalizeNode(actualNavbar);
const difference = firstDifference(expected, actual);
const report = {
  source: sourcePath instanceof URL ? sourcePath.pathname : sourcePath,
  live: htmlArgument?.slice('--html='.length) ?? liveUrl,
  responseStatus,
  exact: difference === null,
  expectedNodes: flatten(expected).length,
  actualNodes: flatten(actual).length,
  firstDifference: difference
};

console.log(JSON.stringify(report, null, 2));
if (difference) process.exitCode = 1;
