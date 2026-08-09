/**
 * Node-for-node diff of the rendered room against the captured `app-room-file.clean.html`.
 *
 *   node scripts/audit-clean-app-room.mjs --url=http://localhost:5190/ \
 *     --email=$PTR_PRESENTER_EMAIL --password=$PTR_PASSWORD
 *
 * The credentials are not optional against a real server: the room sits behind the session guard,
 * so an anonymous GET of `/` is a 403 and the audit fails with "App-room root missing",
 * which reads like a markup regression rather than a missing cookie.
 *
 * ## Reading the result
 *
 * `exact: true` is NOT the success condition, and chasing it would make the app worse. The captured
 * file is one user's session frozen at one moment; the live page is a different user's session with
 * different data. Three classes of difference are known and are not defects:
 *
 * 1. **Our own corrections.** `img.brand-logo` carries `width`/`height` here and not in the capture,
 *    because an image without intrinsic dimensions shifts the navbar on first paint. `input.volCtrl`
 *    carries an `id`. Reverting either to match the capture would be a regression.
 * 2. **Saved preferences.** The captured session had the four sound switches off, so the audit reads
 *    `off` where this renders `on`. The source's own defaults are `alertSoundOn:!0`, `qaSoundOn:!0`,
 *    `nonTradeSound:!0`, `chatSoundOn:!0` (`docs/source/main.d6d3c112b59b7d0d.js`) - so `on` is
 *    correct and the capture is showing that user's choices, not the default.
 * 3. **Room content.** Different alerts, messages, names and counts.
 *
 * What IS worth acting on: a landmark going missing, a host element changing tag or occurrence
 * count, and `differenceCount` jumping. Treat the count as a baseline to drive down, not a gate -
 * it was 2686 against 2780 expected nodes when this note was written.
 */
import { enterRoomWithFetch, roomJwtSecret } from './lib/enter-room.mjs';
import fs from 'node:fs';
import process from 'node:process';
import * as parse5 from 'parse5';

const sourcePath = new URL('../app-room/app-room-file.clean.html', import.meta.url);
const navbarSourcePath = new URL('../navbar-section/navbar.html', import.meta.url);
const reportPath = new URL('../docs/generated/clean-app-room-audit.json', import.meta.url);
const sourceHtml = fs.readFileSync(sourcePath, 'utf8');
const navbarSourceHtml = fs.readFileSync(navbarSourcePath, 'utf8');
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

function attribute(node, name) {
  return node.attrs?.find((entry) => entry.name === name)?.value;
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

function flatten(node, path = node.tag ?? 'root', rows = []) {
  rows.push({ path, tag: node.tag, attrs: node.attrs });
  let elementIndex = 0;
  let textIndex = 0;
  for (const child of node.children ?? []) {
    if (child.text !== undefined) {
      rows.push({ path: `${path}/#text[${textIndex}]`, text: child.text });
      textIndex += 1;
      continue;
    }
    flatten(child, `${path}/${child.tag}[${elementIndex}]`, rows);
    elementIndex += 1;
  }
  return rows;
}

function differences(expectedRows, actualRows) {
  const result = [];
  const length = Math.max(expectedRows.length, actualRows.length);
  for (let index = 0; index < length; index += 1) {
    if (JSON.stringify(expectedRows[index]) !== JSON.stringify(actualRows[index])) {
      result.push({
        index,
        expected: expectedRows[index] ?? null,
        actual: actualRows[index] ?? null
      });
    }
  }
  return result;
}

function collectElements(node, predicate, rows = []) {
  if (node?.tagName && predicate(node)) rows.push(node);
  for (const child of node?.childNodes ?? []) collectElements(child, predicate, rows);
  return rows;
}

function compareElements(expectedElement, actualElement) {
  if (!expectedElement || !actualElement) {
    return {
      exact: false,
      expectedNodes: expectedElement ? flatten(normalizeNode(expectedElement)).length : 0,
      actualNodes: actualElement ? flatten(normalizeNode(actualElement)).length : 0,
      differenceCount: 1,
      firstDifference: {
        expected: expectedElement ? expectedElement.tagName : null,
        actual: actualElement ? actualElement.tagName : null
      }
    };
  }

  const expected = flatten(normalizeNode(expectedElement));
  const actual = flatten(normalizeNode(actualElement));
  const elementDifferences = differences(expected, actual);
  return {
    exact: elementDifferences.length === 0,
    expectedNodes: expected.length,
    actualNodes: actual.length,
    differenceCount: elementDifferences.length,
    firstDifference: elementDifferences[0] ?? null,
    differences: elementDifferences.slice(0, 100)
  };
}

let responseStatus = null;
let liveHtml;
if (htmlArgument) {
  liveHtml = fs.readFileSync(htmlArgument.slice('--html='.length), 'utf8');
} else {
  // The room is behind the session guard added in the auth work, so an anonymous GET of `/` is a
  // 303 to /login and this audit used to fail with "App-room root missing" - which reads like a
  // markup regression rather than a missing cookie. Sign in first when credentials are supplied.
  const headers = {};
  const emailArgument = process.argv.find((argument) => argument.startsWith('--email='));
  if (emailArgument) {
    const email = emailArgument.slice('--email='.length);
    /*
      Entered through the handoff, not a password: the room's `/login` is gone and the controller
      is where signing in happens. `--password=` is no longer read.
    */
    const origin = new URL(liveUrl).origin;
    headers.cookie = await enterRoomWithFetch({ base: origin, email, secret: roomJwtSecret() });
  }

  const liveResponse = await fetch(liveUrl, { headers });
  if (!liveResponse.ok) {
    throw new Error(`Unable to load ${liveUrl}: ${liveResponse.status} ${liveResponse.statusText}`);
  }
  if (liveResponse.redirected && new URL(liveResponse.url).pathname === '/login') {
    throw new Error(
      `${liveUrl} redirected to the login page. Pass --email=<address> --password=<password> so the audit can reach the room.`
    );
  }
  responseStatus = liveResponse.status;
  liveHtml = await liveResponse.text();
}

const expectedDocument = parse5.parseFragment(sourceHtml);
const navbarDocument = parse5.parseFragment(navbarSourceHtml);
const liveDocument = parse5.parse(liveHtml);
const expectedRoot = findElement(
  expectedDocument,
  (node) => node.tagName === 'app-room' && attribute(node, 'id') === 'topRoomDiv'
);
const actualRoot = findElement(
  liveDocument,
  (node) => node.tagName === 'app-room' && attribute(node, 'id') === 'topRoomDiv'
);

if (!expectedRoot || !actualRoot) {
  throw new Error(
    `App-room root missing. expected=${Boolean(expectedRoot)} actual=${Boolean(actualRoot)}`
  );
}

const embeddedNavbar = findElement(
  expectedRoot,
  (node) => attribute(node, 'class')?.split(/\s+/).includes('mainAppNav') ?? false
);
const canonicalNavbar = findElement(
  navbarDocument,
  (node) => attribute(node, 'class')?.split(/\s+/).includes('mainAppNav') ?? false
);
if (!embeddedNavbar || !canonicalNavbar || !embeddedNavbar.parentNode) {
  throw new Error(
    `Canonical navbar substitution failed. embedded=${Boolean(embeddedNavbar)} canonical=${Boolean(canonicalNavbar)}`
  );
}
const navbarIndex = embeddedNavbar.parentNode.childNodes.indexOf(embeddedNavbar);
embeddedNavbar.parentNode.childNodes[navbarIndex] = canonicalNavbar;

const expectedRows = flatten(normalizeNode(expectedRoot));
const actualRows = flatten(normalizeNode(actualRoot));
const allDifferences = differences(expectedRows, actualRows);

const expectedHosts = collectElements(expectedRoot, (node) => node.tagName.startsWith('app-'));
const actualHosts = collectElements(actualRoot, (node) => node.tagName.startsWith('app-'));
const hostTags = [...new Set(expectedHosts.map((node) => node.tagName))];
const hostAudit = hostTags.map((tag) => {
  const expectedOccurrences = expectedHosts.filter((node) => node.tagName === tag);
  const actualOccurrences = actualHosts.filter((node) => node.tagName === tag);
  const occurrenceCount = Math.max(expectedOccurrences.length, actualOccurrences.length);
  const occurrences = Array.from({ length: occurrenceCount }, (_, index) => ({
    occurrence: index + 1,
    ...compareElements(expectedOccurrences[index], actualOccurrences[index])
  }));
  return {
    tag,
    expectedOccurrences: expectedOccurrences.length,
    actualOccurrences: actualOccurrences.length,
    exactOccurrences: occurrences.filter((occurrence) => occurrence.exact).length,
    occurrences
  };
});

const landmarkDefinitions = [
  ['wrapper', (node) => attribute(node, 'class')?.split(/\s+/).includes('wrapper')],
  ['room-sidebar', (node) => attribute(node, 'class')?.split(/\s+/).includes('room-sidebar')],
  ['mainAppNav', (node) => attribute(node, 'class')?.split(/\s+/).includes('mainAppNav')],
  ['mainAreaSplit', (node) => attribute(node, 'id') === 'mainAreaSplit'],
  [
    'presentation-box',
    (node) => attribute(node, 'class')?.split(/\s+/).includes('presentation-box')
  ],
  ['mainTabs', (node) => attribute(node, 'id') === 'mainTabs'],
  ['mainTabsContent', (node) => attribute(node, 'id') === 'mainTabsContent'],
  ['screens-pane', (node) => attribute(node, 'id') === 'screens'],
  ['streams-pane', (node) => attribute(node, 'id') === 'streams'],
  ['notes-pane', (node) => attribute(node, 'id') === 'notes'],
  ['videoplayer-pane', (node) => attribute(node, 'id') === 'videoplayer'],
  ['files-pane', (node) => attribute(node, 'id') === 'files'],
  ['files-tabs', (node) => attribute(node, 'id') === 'myTab'],
  ['composer', (node) => attribute(node, 'id') === 'textAreaHolder'],
  ['alert-box', (node) => attribute(node, 'class')?.split(/\s+/).includes('alert-box')],
  ['chat-box', (node) => attribute(node, 'class')?.split(/\s+/).includes('chat-box')]
];
const landmarkAudit = landmarkDefinitions.map(([name, predicate]) => ({
  name,
  ...compareElements(findElement(expectedRoot, predicate), findElement(actualRoot, predicate))
}));

const report = {
  generatedAt: new Date().toISOString(),
  source: sourcePath.pathname,
  live: htmlArgument?.slice('--html='.length) ?? liveUrl,
  responseStatus,
  exact: allDifferences.length === 0,
  expectedNodes: expectedRows.length,
  actualNodes: actualRows.length,
  differenceCount: allDifferences.length,
  firstDifferences: allDifferences.slice(0, 100),
  landmarkAudit,
  hostAudit
};

fs.mkdirSync(new URL('.', reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      source: report.source,
      live: report.live,
      exact: report.exact,
      expectedNodes: report.expectedNodes,
      actualNodes: report.actualNodes,
      differenceCount: report.differenceCount,
      firstDifferences: report.firstDifferences.slice(0, 10),
      landmarkAudit: report.landmarkAudit,
      hostAudit: report.hostAudit.map((host) => ({
        tag: host.tag,
        expectedOccurrences: host.expectedOccurrences,
        actualOccurrences: host.actualOccurrences,
        exactOccurrences: host.exactOccurrences,
        occurrences: host.occurrences.map((occurrence) => ({
          occurrence: occurrence.occurrence,
          exact: occurrence.exact,
          expectedNodes: occurrence.expectedNodes,
          actualNodes: occurrence.actualNodes,
          differenceCount: occurrence.differenceCount,
          firstDifference: occurrence.firstDifference
        }))
      })),
      report: reportPath.pathname
    },
    null,
    2
  )
);

if (allDifferences.length > 0) process.exitCode = 1;
