import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_CAPTURE = 'proroom-ULTIMATE-staff-2026-07-24T12-42-02-part1.json';
const capturePath = resolve(process.argv[2] ?? DEFAULT_CAPTURE);
const requestedCaptures = new Set(
  String(process.argv[3] ?? '')
    .split(',')
    .filter(Boolean)
    .map(Number)
);
const compact = process.argv.includes('--compact');
const payload = JSON.parse(await readFile(capturePath, 'utf8'));

const normalize = (value = '') => value.replace(/\s+/g, ' ').trim();
const topbarClasses = [
  'navbar',
  'navbarsRoom',
  'speaking',
  'speaker',
  'volume',
  'reload',
  'sync',
  'microphone',
  'webcam',
  'camera',
  'video',
  'screen',
  'session',
  'record'
];

function isTopbarCandidate(node) {
  const className = String(node.attrs?.class ?? '');
  const id = String(node.attrs?.id ?? '');
  const rect = node.rect;

  return (
    topbarClasses.some(
      (token) =>
        className.toLowerCase().includes(token.toLowerCase()) ||
        id.toLowerCase().includes(token.toLowerCase())
    ) ||
    (rect &&
      rect.w > 0 &&
      rect.h > 0 &&
      rect.y < 50 &&
      rect.x + rect.w > 0 &&
      rect.x < 1842 &&
      node.style?.display !== 'none' &&
      node.style?.visibility !== 'hidden')
  );
}

function summarize(node) {
  return {
    path: node.path,
    tag: node.tag,
    id: node.attrs?.id ?? null,
    class: node.attrs?.class ?? null,
    title: node.attrs?.title ?? null,
    ariaLabel: node.attrs?.['aria-label'] ?? null,
    text: normalize(node.text),
    rect: node.rect ?? null,
    display: node.style?.display ?? null,
    visibility: node.style?.visibility ?? null,
    color: node.style?.color ?? null,
    backgroundColor: node.style?.['background-color'] ?? null,
    fontFamily: node.style?.['font-family'] ?? null,
    fontSize: node.style?.['font-size'] ?? null,
    fontWeight: node.style?.['font-weight'] ?? null,
    lineHeight: node.style?.['line-height'] ?? null,
    before: node.before ?? null,
    after: node.after ?? null
  };
}

const captures = payload.caps.flatMap((capture, captureIndex) => {
  if (requestedCaptures.size > 0 && !requestedCaptures.has(captureIndex)) return [];

  const treeKind = capture.fullDom ? 'fullDom' : 'subtree';
  const nodes = capture[treeKind].nodes;
  const navbarsRoom = nodes.find((node) => node.attrs?.id === 'navbarsRoom');
  const navbarNodes = navbarsRoom
    ? nodes.filter(
        (node) => node.path === navbarsRoom.path || node.path.startsWith(`${navbarsRoom.path}.`)
      )
    : [];

  return [
    {
      captureIndex,
      label: capture.label,
      themeClass: capture.themeClass,
      viewport: capture.viewport,
      navbarsRoom: navbarNodes.map(summarize),
      otherTopbarCandidates: nodes
        .filter(
          (node) =>
            isTopbarCandidate(node) &&
            !navbarNodes.includes(node) &&
            (node.rect?.y ?? Number.POSITIVE_INFINITY) < 50
        )
        .map(summarize)
    }
  ];
});

if (compact) {
  for (const capture of captures) {
    process.stdout.write(
      `CAPTURE ${capture.captureIndex} ${capture.label} ${capture.themeClass} NAV_NODES ${capture.navbarsRoom.length}\n`
    );
    for (const node of capture.navbarsRoom) {
      const rect = node.rect
        ? `${node.rect.x},${node.rect.y},${node.rect.w},${node.rect.h}`
        : 'null';
      process.stdout.write(
        [
          node.path,
          node.tag,
          node.id ?? '',
          node.class ?? '',
          node.title ?? '',
          node.ariaLabel ?? '',
          node.text,
          rect,
          node.display ?? '',
          node.visibility ?? ''
        ].join('\t') + '\n'
      );
    }
  }
} else {
  process.stdout.write(`${JSON.stringify(captures, null, 2)}\n`);
}
