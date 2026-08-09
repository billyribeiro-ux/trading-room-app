import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

process.stdout.on('error', (error) => {
  if (error.code === 'EPIPE') process.exit(0);
  throw error;
});

const DEFAULT_CAPTURE = 'proroom-ULTIMATE-staff-2026-07-24T12-42-02-part1.json';
const capturePath = resolve(process.argv[2] ?? DEFAULT_CAPTURE);
const captureIndex = Number(process.argv[3]);
const rootArgument = process.argv.find((argument) => argument.startsWith('--root='));
const requestedRootPath = rootArgument?.slice('--root='.length);
const depthArgument = process.argv.find((argument) => argument.startsWith('--max-depth='));
const maxDepth = depthArgument ? Number(depthArgument.slice('--max-depth='.length)) : Infinity;

if (!Number.isInteger(captureIndex)) {
  process.stderr.write(
    'Usage: node scripts/render-capture-dom.mjs [capture.json] <capture-index>\n'
  );
  process.exitCode = 1;
} else {
  const payload = JSON.parse(await readFile(capturePath, 'utf8'));
  const capture = payload.caps[captureIndex];

  if (!capture) {
    process.stderr.write(`Capture ${captureIndex} does not exist.\n`);
    process.exitCode = 1;
  } else {
    const treeKind = capture.fullDom ? 'fullDom' : 'subtree';
    const nodes = capture[treeKind].nodes;
    const paths = new Set(nodes.map((node) => node.path));
    const normalize = (value = '') => String(value).replace(/\s+/g, ' ').trim();
    const escape = (value) =>
      String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('\n', '&#10;');

    function parentPath(path) {
      let candidate = path;

      while (candidate.includes('.')) {
        candidate = candidate.slice(0, candidate.lastIndexOf('.'));
        if (paths.has(candidate)) return candidate;
      }

      return null;
    }

    const children = new Map();
    for (const node of nodes) {
      const parent = parentPath(node.path);
      const siblings = children.get(parent) ?? [];
      siblings.push(node);
      children.set(parent, siblings);
    }

    process.stdout.write(
      `CAPTURE ${captureIndex}\t${capture.label}\t${capture.themeClass}\t${nodes.length} nodes\n`
    );

    function writeNode(node, depth) {
      const indent = '  '.repeat(depth);
      const attrs = Object.entries(node.attrs ?? {})
        .filter(([name]) => !name.startsWith('_ngcontent-') && !name.startsWith('_nghost-'))
        .map(([name, value]) => (value === '' ? name : `${name}="${escape(value)}"`))
        .join(' ');
      const nodeChildren = children.get(node.path) ?? [];
      const directText = normalize(node.text);
      const text = directText ? ` ${JSON.stringify(directText)}` : '';
      const rect = node.rect ? ` @${node.rect.x},${node.rect.y},${node.rect.w},${node.rect.h}` : '';

      process.stdout.write(
        `${indent}<${node.tag}${attrs ? ` ${attrs}` : ''}>${text}${rect} [${node.path}]\n`
      );

      if (depth < maxDepth) {
        for (const child of nodeChildren) writeNode(child, depth + 1);
      }
    }

    if (requestedRootPath) {
      const requestedRoot = nodes.find((node) => node.path === requestedRootPath);
      if (!requestedRoot) {
        process.stderr.write(`Root path ${requestedRootPath} does not exist in capture.\n`);
        process.exitCode = 1;
      } else {
        writeNode(requestedRoot, 0);
      }
    } else {
      for (const root of children.get(null) ?? []) writeNode(root, 0);
    }
  }
}
