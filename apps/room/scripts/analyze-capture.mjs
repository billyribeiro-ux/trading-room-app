import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const input = process.argv[2];

if (!input) {
  console.error('Usage: pnpm capture:analyze <capture.json>');
  process.exitCode = 1;
} else {
  const capturePath = resolve(input);
  const payload = JSON.parse(await readFile(capturePath, 'utf8'));

  const normalizeText = (value = '') => value.replace(/\s+/g, ' ').trim();
  const isVisible = (node, viewport) => {
    const rect = node.rect;
    return (
      rect &&
      rect.w > 0 &&
      rect.h > 0 &&
      rect.x < viewport.w &&
      rect.y < viewport.h &&
      rect.x + rect.w > 0 &&
      rect.y + rect.h > 0 &&
      node.style?.display !== 'none' &&
      node.style?.visibility !== 'hidden'
    );
  };

  const captures = payload.caps.map((capture, index) => {
    const treeName = capture.fullDom ? 'fullDom' : 'subtree';
    const tree = capture[treeName];
    const visibleNodes = tree.nodes.filter((node) => isVisible(node, capture.viewport));
    const visibleText = [
      ...new Set(visibleNodes.map((node) => normalizeText(node.text)).filter(Boolean))
    ].sort((left, right) => left.length - right.length || left.localeCompare(right));

    return {
      index,
      label: capture.label,
      timestamp: capture.ts,
      viewport: capture.viewport,
      themeClass: capture.themeClass,
      tree: treeName,
      nodeCount: tree.count,
      truncated: tree.truncated,
      visibleNodeCount: visibleNodes.length,
      visibleText
    };
  });

  const rootVariables = payload.caps[0]?.cssVars?.root ?? {};
  const customVariables = Object.fromEntries(
    Object.entries(rootVariables)
      .filter(([name]) => !name.startsWith('--bs-'))
      .sort(([left], [right]) => left.localeCompare(right))
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        source: capturePath,
        part: payload.part,
        captureCount: captures.length,
        labels: captures.map(({ index, label }) => ({ index, label })),
        customVariables,
        captures
      },
      null,
      2
    )}\n`
  );
}
