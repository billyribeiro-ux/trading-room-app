import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'parse5';

const sourcePath = resolve(
  process.argv.find((argument) => argument.startsWith('--source='))?.slice('--source='.length) ??
    'app-room/complete.html'
);
const positionalOutput = process.argv.slice(2).find((argument) => !argument.startsWith('--'));
const outputPath = resolve(
  process.argv.find((argument) => argument.startsWith('--output='))?.slice('--output='.length) ??
    positionalOutput ??
    'src/lib/server/captured-message-fixture.json'
);
const source = await readFile(sourcePath, 'utf8');
const document = parse(source, { sourceCodeLocationInfo: true });

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function attributes(node) {
  return Object.fromEntries(
    (node?.attrs ?? []).map((attribute) => [attribute.name, attribute.value])
  );
}

function hasClass(node, className) {
  return (attributes(node).class ?? '').split(/\s+/).includes(className);
}

function walk(node, visit) {
  visit(node);
  for (const child of node?.childNodes ?? []) walk(child, visit);
}

function first(node, predicate) {
  let match;
  walk(node, (candidate) => {
    if (!match && predicate(candidate)) match = candidate;
  });
  return match;
}

function descendants(node, predicate) {
  const matches = [];
  walk(node, (candidate) => {
    if (predicate(candidate)) matches.push(candidate);
  });
  return matches;
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

function gravatarHash(url) {
  return url?.match(/\/avatar\/([a-f0-9]{32})(?:[/?]|$)/i)?.[1].toLowerCase() ?? null;
}

// Intrinsic pixel size of every uploaded image the capture references, read from the asset's own
// header (PNG IHDR at byte offsets 16/20 of the file served by the CDN). The captured markup does
// not carry width/height attributes, so without this the browser has no aspect ratio to reserve
// and the alert/chat list jumps when the bytes arrive. A URL that is absent here is emitted
// without dimensions rather than with a guessed box.
const IMAGE_INTRINSIC_SIZES = {
  'https://cdn1.protradingroom.com/uploads/images/6a628a99731b9f77ae9bf505_2026-07-18-FLEXIBLE_GRID_1785001553217.png':
    { width: 2546, height: 1238 }
};

function bodySegments(messageBody) {
  const segments = [];

  function collect(node) {
    if (node.nodeName === '#text') {
      segments.push({ kind: 'text', text: node.value });
      return;
    }
    if (hasClass(node, 'stockColor')) {
      segments.push({ kind: 'stock', text: textContent(node) });
      return;
    }
    if (hasClass(node, 'img-container')) {
      const image = first(
        node,
        (candidate) => candidate.nodeName === 'img' && hasClass(candidate, 'uploaded-img')
      );
      const url = attributes(image).src;
      segments.push({ kind: 'image', url, ...(IMAGE_INTRINSIC_SIZES[url] ?? {}) });
      return;
    }
    for (const child of node.childNodes ?? []) collect(child);
  }

  for (const child of messageBody?.childNodes ?? []) collect(child);
  return segments;
}

const messages = [];

function collectMessages(node, ancestors = []) {
  if (node.nodeName === 'app-st-message') {
    const panel = ancestors.some((ancestor) => ancestor.nodeName === 'app-alerts')
      ? 'alert'
      : 'chat';
    const messageBox = first(node, (candidate) => hasClass(candidate, 'msg-box'));
    const messageRow = first(
      node,
      (candidate) =>
        candidate.nodeName === 'div' && hasClass(candidate, 'mr-1') && hasClass(candidate, 'd-flex')
    );
    const separator = first(node, (candidate) => hasClass(candidate, 'separator'));
    const username = first(node, (candidate) => hasClass(candidate, 'username'));
    const timestamp = first(node, (candidate) => hasClass(candidate, 'created-at'));
    const messageBody = first(node, (candidate) => hasClass(candidate, 'msg-left'));
    const avatar = first(
      node,
      (candidate) => candidate.nodeName === 'img' && attributes(candidate).alt === 'msg.avt'
    );
    const questionCount = first(
      node,
      (candidate) => candidate.nodeName === 'span' && hasClass(candidate, 'me-1')
    );
    const answered = first(
      node,
      (candidate) =>
        candidate.nodeName === 'span' &&
        normalizedText(candidate) === '✅' &&
        candidate.parentNode?.nodeName === 'button'
    );
    const menuItems = descendants(
      node,
      (candidate) => candidate.nodeName === 'a' && hasClass(candidate, 'dropdown-item')
    ).map(normalizedText);
    const avatarUrl = attributes(avatar).src;
    const sourceLocation = node.sourceCodeLocation;
    const sourceSlice =
      sourceLocation?.startOffset !== undefined && sourceLocation?.endOffset !== undefined
        ? source.slice(sourceLocation.startOffset, sourceLocation.endOffset)
        : '';

    messages.push({
      evidenceKey: `app-room-complete:app-st-message:${messages.length + 1}`,
      sequence: messages.length + 1,
      panel,
      room: 'main',
      senderName: normalizedText(username),
      senderAvatarUrl: avatarUrl,
      senderEmailHash: gravatarHash(avatarUrl),
      timestampText: normalizedText(timestamp),
      separatorText: separator ? normalizedText(separator) : null,
      body: normalizedText(messageBody),
      bodySegments: bodySegments(messageBody),
      bodyStyle: attributes(messageBody).style ?? null,
      messageBoxClass: attributes(messageBox).class,
      messageBoxStyle: attributes(messageBox).style ?? null,
      direction: hasClass(messageRow, 'flex-row-reverse') ? 'reverse' : 'forward',
      isAdmin: hasClass(messageBox, 'msg-box-adm'),
      question: hasClass(messageBody, 'questionColor'),
      questionCount: questionCount
        ? Number.parseInt(normalizedText(questionCount).replace(/\D/g, ''), 10)
        : null,
      questionAnswered: Boolean(answered),
      targetUrl: bodySegments(messageBody).find((segment) => segment.kind === 'image')?.url ?? null,
      menuItems,
      sourceNodeSha256: sha256(sourceSlice)
    });
  }

  for (const child of node.childNodes ?? []) {
    collectMessages(child, [...ancestors, node]);
  }
}

collectMessages(document);

if (messages.length !== 18) {
  throw new Error(`Expected 18 captured app-st-message nodes, found ${messages.length}.`);
}
if (messages.filter((message) => message.panel === 'alert').length !== 8) {
  throw new Error('Expected exactly 8 captured alert messages.');
}
if (messages.filter((message) => message.panel === 'chat').length !== 10) {
  throw new Error('Expected exactly 10 captured chat messages.');
}
if (messages.some((message) => !message.senderEmailHash)) {
  throw new Error('Every captured message must retain its evidenced Gravatar hash.');
}

const fixture = {
  generatedFrom: sourcePath,
  sourceSha256: sha256(source),
  messages
};

await writeFile(outputPath, `${JSON.stringify(fixture, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      sourcePath,
      sourceSha256: fixture.sourceSha256,
      outputPath,
      messages: messages.length,
      alerts: messages.filter((message) => message.panel === 'alert').length,
      chats: messages.filter((message) => message.panel === 'chat').length
    },
    null,
    2
  )
);
