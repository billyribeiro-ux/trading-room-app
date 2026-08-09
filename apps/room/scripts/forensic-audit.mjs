import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const DEFAULT_CAPTURE = 'proroom-ULTIMATE-staff-2026-07-24T12-42-02-part1.json';
const DEFAULT_OUTPUT = 'docs/generated/part-1-forensic-audit.json';
const NODE_CHUNK_SIZE = 100;

const capturePath = resolve(process.argv[2] ?? DEFAULT_CAPTURE);
const outputPath = resolve(process.argv[3] ?? DEFAULT_OUTPUT);
const captureSource = await readFile(capturePath, 'utf8');
const payload = JSON.parse(captureSource);

const normalizeText = (value = '') => value.replace(/\s+/g, ' ').trim();
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const canonicalJson = (value) => JSON.stringify(value);
const isVisible = (node) =>
  Boolean(
    node.rect &&
    node.rect.w > 0 &&
    node.rect.h > 0 &&
    node.style?.display !== 'none' &&
    node.style?.visibility !== 'hidden' &&
    node.style?.opacity !== '0'
  );

function classTokens(node) {
  return String(node.attrs?.class ?? '')
    .split(/\s+/)
    .filter(Boolean);
}

function frequency(values) {
  return Object.fromEntries(
    [
      ...values.reduce(
        (counts, value) => counts.set(value, (counts.get(value) ?? 0) + 1),
        new Map()
      )
    ].sort(([left], [right]) => left.localeCompare(right))
  );
}

function summarizeNode(node, index) {
  return {
    index,
    path: node.path,
    tag: node.tag,
    id: node.attrs?.id ?? null,
    classes: classTokens(node),
    text: normalizeText(node.text),
    rect: node.rect ?? null,
    display: node.style?.display ?? null,
    visibility: node.style?.visibility ?? null,
    position: node.style?.position ?? null,
    zIndex: node.style?.['z-index'] ?? null,
    color: node.style?.color ?? null,
    backgroundColor: node.style?.['background-color'] ?? null,
    fontFamily: node.style?.['font-family'] ?? null,
    fontSize: node.style?.['font-size'] ?? null,
    fontWeight: node.style?.['font-weight'] ?? null,
    lineHeight: node.style?.['line-height'] ?? null
  };
}

function chunkNodes(nodes) {
  const chunks = [];

  for (let start = 0; start < nodes.length; start += NODE_CHUNK_SIZE) {
    const end = Math.min(start + NODE_CHUNK_SIZE, nodes.length);
    const chunk = nodes.slice(start, end);

    chunks.push({
      chunk: chunks.length,
      start,
      endExclusive: end,
      count: chunk.length,
      firstPath: chunk.at(0)?.path ?? null,
      lastPath: chunk.at(-1)?.path ?? null,
      sha256: sha256(canonicalJson(chunk))
    });
  }

  return chunks;
}

const captures = payload.caps.map((capture, captureIndex) => {
  const treeKind = capture.fullDom ? 'fullDom' : 'subtree';
  const tree = capture[treeKind];
  const visibleNodes = tree.nodes.filter(isVisible);
  const styleProperties = tree.nodes.flatMap((node) => Object.keys(node.style ?? {}));

  return {
    captureIndex,
    label: capture.label,
    timestamp: capture.ts,
    viewport: capture.viewport,
    themeClass: capture.themeClass,
    treeKind,
    declaredNodeCount: tree.count,
    actualNodeCount: tree.nodes.length,
    truncated: tree.truncated,
    visibleNodeCount: visibleNodes.length,
    nodeChunks: chunkNodes(tree.nodes),
    tags: frequency(tree.nodes.map((node) => node.tag)),
    classes: frequency(tree.nodes.flatMap(classTokens)),
    styleProperties: frequency(styleProperties),
    visibleNodes: visibleNodes.map(summarizeNode)
  };
});

const rootVariables = payload.caps[0]?.cssVars?.root ?? {};
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  evidence: {
    source: basename(capturePath),
    bytes: Buffer.byteLength(captureSource),
    sha256: sha256(captureSource),
    part: payload.part
  },
  coverage: {
    captureCount: captures.length,
    totalNodes: captures.reduce((sum, capture) => sum + capture.actualNodeCount, 0),
    totalVisibleNodes: captures.reduce((sum, capture) => sum + capture.visibleNodeCount, 0),
    nodeChunkSize: NODE_CHUNK_SIZE,
    totalNodeChunks: captures.reduce((sum, capture) => sum + capture.nodeChunks.length, 0),
    truncatedCaptureCount: captures.filter((capture) => capture.truncated).length
  },
  cssVariables: {
    total: Object.keys(rootVariables).length,
    bootstrap: Object.fromEntries(
      Object.entries(rootVariables)
        .filter(([name]) => name.startsWith('--bs-'))
        .sort(([left], [right]) => left.localeCompare(right))
    ),
    application: Object.fromEntries(
      Object.entries(rootVariables)
        .filter(([name]) => !name.startsWith('--bs-'))
        .sort(([left], [right]) => left.localeCompare(right))
    )
  },
  captures
};

await mkdir(resolve(outputPath, '..'), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);

process.stdout.write(
  `${JSON.stringify(
    {
      output: outputPath,
      evidence: report.evidence,
      coverage: report.coverage,
      cssVariableCount: report.cssVariables.total
    },
    null,
    2
  )}\n`
);
