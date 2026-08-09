import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as parse5 from 'parse5';
import postcss from 'postcss';
import { format } from 'prettier';

const stylesheetPath = resolve('css/complete-app-styles.css');
// The raw room capture. Two properties are required of whatever file is used here, and both were
// established by running this generator against every candidate in app-room/:
//
//   1. It must still carry the Angular `_ngcontent-ng-cNNNN` / `_nghost-ng-cNNNN` attributes, since
//      this generator maps those scope ids to their component hosts. Every `.clean.html` variant
//      has them stripped (0 occurrences) and fails with "Runtime CSS section 6 must resolve to
//      exactly one host; scopes=977335924 hosts=".
//   2. It must cover EVERY scope the stylesheet declares a runtime section for.
//      `app-room-file.txt` carries 35 distinct scopes and is missing 654575438 entirely - that is
//      `<app-webcam-holder>`, which lives outside the app-room subtree it captured - so it fails
//      with "Runtime CSS section 36 must resolve to exactly one host; scopes=654575438 hosts=".
//      `complete.html` carries all 36 and is a superset of it.
//
// complete.html regenerates this file byte-for-byte identically (216,123 bytes, 786 blocks).
const rawRoomPath = resolve('app-room/complete.html');
const outputPath = resolve('src/lib/styles/captured-runtime-components.css');
const [stylesheet, rawRoom] = await Promise.all([
  readFile(stylesheetPath, 'utf8'),
  readFile(rawRoomPath, 'utf8')
]);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function walkElements(node, callback) {
  if (node?.tagName) callback(node);
  for (const child of node?.childNodes ?? []) walkElements(child, callback);
}

const scopeHosts = new Map();
const childHosts = new Map();
const rawDocument = parse5.parseFragment(rawRoom);
walkElements(rawDocument, (node) => {
  for (const { name } of node.attrs ?? []) {
    const match = name.match(/^_nghost-ng-c([0-9]+)$/);
    if (!match) continue;
    const hosts = scopeHosts.get(match[1]) ?? new Set();
    hosts.add(node.tagName);
    scopeHosts.set(match[1], hosts);
  }
});
scopeHosts.set('4243810522', new Set(['app-root']));
childHosts.set('app-root', new Set(['app-room']));

function walkComponentTree(node, ownerHost = null) {
  let nextOwner = ownerHost;
  if (node?.tagName) {
    const isComponentHost = (node.attrs ?? []).some(({ name }) =>
      /^_nghost-ng-c[0-9]+$/.test(name)
    );
    if (isComponentHost) {
      nextOwner = node.tagName;
      if (ownerHost && ownerHost !== nextOwner) {
        const children = childHosts.get(ownerHost) ?? new Set();
        children.add(nextOwner);
        childHosts.set(ownerHost, children);
      }
    }
  }
  for (const child of node?.childNodes ?? []) walkComponentTree(child, nextOwner);
}
walkComponentTree(rawDocument);

function splitSelectors(value) {
  const selectors = [];
  let start = 0;
  let squareDepth = 0;
  let roundDepth = 0;
  let quote = null;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === '\\') index += 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === '[') squareDepth += 1;
    else if (character === ']') squareDepth -= 1;
    else if (character === '(') roundDepth += 1;
    else if (character === ')') roundDepth -= 1;
    else if (character === ',' && squareDepth === 0 && roundDepth === 0) {
      selectors.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  selectors.push(value.slice(start).trim());
  return selectors.filter(Boolean);
}

function addOwnershipBoundary(selector, host) {
  const pseudoElement = selector.match(/(::[a-zA-Z-]+(?:\([^)]*\))?)$/)?.[1] ?? '';
  const base = pseudoElement ? selector.slice(0, -pseudoElement.length) : selector;
  const children = [...(childHosts.get(host) ?? new Set())].sort();
  const boundary = children.length > 0 ? `:not(${host} :is(${children.join(', ')}) *)` : '';
  return `${host} ${base}${boundary}${pseudoElement}`;
}

/*
 * Angular's generated scope attributes contribute attribute-selector
 * specificity (0,1,0) at every occurrence. Removing them outright changes the
 * cascade even when the translated selector still matches. `:not(:root)` is
 * true for captured component hosts and descendants, contributes the same
 * pseudo-class specificity, and does not introduce a new application state.
 */
const angularScopeSpecificity = ':not(:root)';

function translateHostScopedSelector(selector, host, hostPattern) {
  const match = hostPattern.exec(selector);
  hostPattern.lastIndex = 0;
  if (!match) return selector;

  const withoutHostScope = selector.replace(hostPattern, '');
  const compoundStart =
    Math.max(
      withoutHostScope.lastIndexOf(' ', match.index - 1),
      withoutHostScope.lastIndexOf('>', match.index - 1),
      withoutHostScope.lastIndexOf('+', match.index - 1),
      withoutHostScope.lastIndexOf('~', match.index - 1)
    ) + 1;
  return `${withoutHostScope.slice(0, compoundStart)}${host}${angularScopeSpecificity}${withoutHostScope.slice(compoundStart)}`;
}

function translateSelector(selector, host, scopes) {
  const scopePattern = scopes.join('|');
  const hostPattern = new RegExp(`\\[_nghost-ng-c(?:${scopePattern})\\]`, 'g');
  const contentPattern = new RegExp(`\\[_ngcontent-ng-c(?:${scopePattern})\\]`, 'g');
  const hadHostScope = hostPattern.test(selector);
  hostPattern.lastIndex = 0;
  const hostTranslated = hadHostScope
    ? translateHostScopedSelector(selector, host, hostPattern)
    : selector;
  const translated = hostTranslated.replace(contentPattern, angularScopeSpecificity).trim();
  return hadHostScope ? translated : addOwnershipBoundary(translated, host);
}

const sectionPattern = /\/\*\s*=+\s*\n\s*SOURCE:\s*([^\n]+?)\s*\n\s*=+\s*\*\//g;
const markers = [...stylesheet.matchAll(sectionPattern)];
const renderedSections = [];
const sectionSummary = [];

for (let index = 0; index < markers.length; index += 1) {
  const marker = markers[index];
  const start = marker.index + marker[0].length;
  const end = markers[index + 1]?.index ?? stylesheet.length;
  const body = stylesheet.slice(start, end);
  const scopes = [
    ...new Set([...body.matchAll(/_(?:ngcontent|nghost)-ng-c([0-9]+)/g)].map((match) => match[1]))
  ].sort();
  if (scopes.length === 0) continue;
  const hosts = [
    ...new Set(scopes.flatMap((scope) => [...(scopeHosts.get(scope) ?? new Set())]))
  ].sort();
  if (hosts.length !== 1) {
    throw new Error(
      `Runtime CSS section ${index + 1} must resolve to exactly one host; scopes=${scopes.join(',')} hosts=${hosts.join(',')}`
    );
  }

  const host = hosts[0];
  const root = postcss.parse(body, {
    from: `${stylesheetPath}#runtime-section-${index + 1}`
  });
  root.walkRules((rule) => {
    if (rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return;
    rule.selector = splitSelectors(rule.selector)
      .map((selector) => translateSelector(selector, host, scopes))
      .join(', ');
  });
  let rules = 0;
  root.walkRules(() => {
    rules += 1;
  });
  renderedSections.push(
    `/* Captured runtime section ${index + 1}: ${host}; scope ${scopes.join(', ')} */\n${root.toString().trim()}`
  );
  sectionSummary.push({
    section: index + 1,
    source: marker[1].trim(),
    scopes,
    host,
    rules
  });
}

const unformattedOutput = `/*
 * GENERATED FROM css/complete-app-styles.css
 * Source SHA-256: ${sha256(stylesheet)}
 *
 * Angular's runtime scope attributes are translated to captured custom-element
 * hosts while retaining their original cascade specificity. The ownership
 * boundary prevents a component's rules from cascading into descendants
 * rendered by nested captured component hosts.
 * Do not edit this file by hand; run: pnpm css:sync-captured
 */

${renderedSections.join('\n\n')}
`;
const output = await format(unformattedOutput, { parser: 'css' });

await writeFile(outputPath, output);
console.log(
  JSON.stringify(
    {
      stylesheetPath,
      stylesheetSha256: sha256(stylesheet),
      outputPath,
      outputBytes: Buffer.byteLength(output),
      runtimeSections: sectionSummary.length,
      runtimeRules: sectionSummary.reduce((total, section) => total + section.rules, 0),
      sections: sectionSummary
    },
    null,
    2
  )
);
