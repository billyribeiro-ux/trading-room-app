import { readFile } from 'node:fs/promises';
import { parse } from 'parse5';

const target = process.argv[2] ?? 'http://127.0.0.1:5178/';
const fixture = JSON.parse(
  await readFile(
    new URL('../src/lib/server/captured-message-fixture.json', import.meta.url),
    'utf8'
  )
);
const response = await fetch(target);

if (!response.ok) {
  throw new Error(`Unable to audit ${target}: HTTP ${response.status}`);
}

const document = parse(await response.text());

function attributes(node) {
  return Object.fromEntries(
    (node?.attrs ?? []).map((attribute) => [attribute.name, attribute.value])
  );
}

function hasClass(node, className) {
  return (attributes(node).class ?? '').split(/\s+/).includes(className);
}

function walk(node, visit, ancestors = []) {
  visit(node, ancestors);
  for (const child of node?.childNodes ?? []) walk(child, visit, [...ancestors, node]);
  if (node?.content) walk(node.content, visit, [...ancestors, node]);
}

function descendants(node, predicate) {
  const matches = [];
  walk(node, (candidate) => {
    if (predicate(candidate)) matches.push(candidate);
  });
  return matches;
}

function first(node, predicate) {
  return descendants(node, predicate)[0];
}

function textContent(node) {
  let value = '';
  walk(node, (candidate) => {
    if (candidate.nodeName === '#text') value += candidate.value;
  });
  return value;
}

function normalizedText(node) {
  return textContent(node).replace(/\s+/g, ' ').trim();
}

function fail(message) {
  throw new Error(`Rendered app-st-message audit failed: ${message}`);
}

const rendered = [];

walk(document, (node, ancestors) => {
  if (node.nodeName !== 'app-st-message') return;
  const panel = ancestors.some((ancestor) => ancestor.nodeName === 'app-alerts')
    ? 'alert'
    : ancestors.some((ancestor) => ancestor.nodeName === 'app-chat')
      ? 'chat'
      : null;
  if (!panel) return;

  const messageBox = first(node, (candidate) => hasClass(candidate, 'msg-box'));
  const messageRow = first(
    node,
    (candidate) =>
      candidate.nodeName === 'div' && hasClass(candidate, 'mr-1') && hasClass(candidate, 'd-flex')
  );
  const separator = first(node, (candidate) => hasClass(candidate, 'separator'));
  const username = first(node, (candidate) => hasClass(candidate, 'username'));
  const timestamp = first(node, (candidate) => hasClass(candidate, 'created-at'));
  const body = first(node, (candidate) => hasClass(candidate, 'msg-left'));
  const kebab = first(node, (candidate) => hasClass(candidate, 'msgMenu'));
  const menu = first(node, (candidate) => hasClass(candidate, 'users-dropdown-options'));
  const menuItems = descendants(
    menu,
    (candidate) => candidate.nodeName === 'a' && hasClass(candidate, 'dropdown-item')
  ).map(normalizedText);

  rendered.push({
    panel,
    messageBoxClass: attributes(messageBox).class,
    direction: hasClass(messageRow, 'flex-row-reverse') ? 'reverse' : 'forward',
    separatorText: separator ? normalizedText(separator) : null,
    username: normalizedText(username),
    timestampText: normalizedText(timestamp),
    body: normalizedText(body),
    bodyClass: attributes(body).class,
    kebabText: textContent(kebab),
    kebabClass: attributes(kebab).class,
    menuClass: attributes(menu).class,
    menuItems,
    stockCount: descendants(node, (candidate) => hasClass(candidate, 'stockColor')).length,
    uploadedImageCount: descendants(
      node,
      (candidate) => candidate.nodeName === 'img' && hasClass(candidate, 'uploaded-img')
    ).length,
    question: hasClass(body, 'questionColor')
  });
});

const viewerMode = rendered
  .find((message) => message.panel === 'alert')
  ?.menuItems.includes('Delete Message')
  ? 'presenter'
  : 'non-presenter';

for (const panel of ['alert', 'chat']) {
  const expected = fixture.messages.filter((message) => message.panel === panel);
  const actual = rendered.filter((message) => message.panel === panel).slice(0, expected.length);

  if (actual.length !== expected.length) {
    fail(`${panel} expected ${expected.length} captured rows, found ${actual.length}`);
  }

  for (let index = 0; index < expected.length; index += 1) {
    const source = expected[index];
    const output = actual[index];
    const label = `${panel} row ${index + 1}`;

    if (output.messageBoxClass !== source.messageBoxClass) {
      fail(`${label} message-box class differs`);
    }
    if (output.direction !== source.direction) fail(`${label} direction differs`);
    if (output.separatorText !== source.separatorText) fail(`${label} separator differs`);
    if (output.username !== source.senderName) fail(`${label} username differs`);
    if (output.timestampText !== source.timestampText) fail(`${label} timestamp differs`);
    if (output.body !== source.body) fail(`${label} body differs`);
    if (output.bodyClass.includes('pe-3') || output.bodyClass.includes('w-100')) {
      fail(`${label} contains a non-rendered body class variant`);
    }
    if (output.kebabText !== '⠇ ') fail(`${label} kebab text differs`);
    if (output.kebabClass !== 'msgMenu dropright pt-1') fail(`${label} kebab class differs`);
    if (output.menuClass !== 'dropdown-menu users-dropdown-options') {
      fail(`${label} closed menu class differs`);
    }
    const expectedMenuItems =
      viewerMode === 'presenter'
        ? source.menuItems
        : panel === 'alert'
          ? ['User Info', 'Mention', 'Copy']
          : ['User Info', 'Mention'];

    if (JSON.stringify(output.menuItems) !== JSON.stringify(expectedMenuItems)) {
      fail(
        `${label} menu order or labels differ for ${viewerMode}: rendered=${JSON.stringify(output.menuItems)} source=${JSON.stringify(expectedMenuItems)}`
      );
    }
  }
}

const captured = [
  ...rendered.filter((message) => message.panel === 'alert').slice(0, 8),
  ...rendered.filter((message) => message.panel === 'chat').slice(0, 10)
];
const summary = {
  messages: captured.length,
  alerts: captured.filter((message) => message.panel === 'alert').length,
  chats: captured.filter((message) => message.panel === 'chat').length,
  separators: captured.filter((message) => message.separatorText !== null).length,
  reversedAdminChatRows: captured.filter(
    (message) => message.panel === 'chat' && message.direction === 'reverse'
  ).length,
  questionRows: captured.filter((message) => message.question).length,
  stockSpans: captured.reduce((total, message) => total + message.stockCount, 0),
  uploadedImages: captured.reduce((total, message) => total + message.uploadedImageCount, 0)
};

const expectedSummary = {
  messages: 18,
  alerts: 8,
  chats: 10,
  separators: 4,
  reversedAdminChatRows: 6,
  questionRows: 4,
  stockSpans: 3,
  uploadedImages: 1
};

if (JSON.stringify(summary) !== JSON.stringify(expectedSummary)) {
  fail(`aggregate state differs: ${JSON.stringify(summary)}`);
}

console.log(
  `Rendered app-st-message audit passed at ${target}: viewer=${viewerMode}; ${JSON.stringify(summary)}; every menu matches its source-proven role branch.`
);
