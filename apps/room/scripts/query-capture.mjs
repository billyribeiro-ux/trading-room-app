import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_CAPTURE = 'proroom-ULTIMATE-staff-2026-07-24T12-42-02-part1.json';
const capturePath = resolve(process.argv[2] ?? DEFAULT_CAPTURE);
const query = process.argv[3];

if (!query) {
  process.stderr.write('Usage: node scripts/query-capture.mjs [capture.json] <pattern>\n');
  process.exitCode = 1;
} else {
  const payload = JSON.parse(await readFile(capturePath, 'utf8'));
  const pattern = new RegExp(query, 'i');
  const idOnly = process.argv.includes('--id');
  const details = process.argv.includes('--details');
  const captureArgument = process.argv.find((argument) => argument.startsWith('--captures='));
  const regionArgument = process.argv.find((argument) => argument.startsWith('--region='));
  const styleKeysArgument = process.argv.find((argument) => argument.startsWith('--style-keys='));
  const styleKeys = String(styleKeysArgument?.split('=')[1] ?? '')
    .split(',')
    .filter(Boolean);
  const region = regionArgument ? regionArgument.split('=')[1].split(',').map(Number) : null;
  const requestedCaptures = new Set(
    String(captureArgument?.split('=')[1] ?? '')
      .split(',')
      .filter(Boolean)
      .map(Number)
  );
  const normalize = (value = '') => String(value).replace(/\s+/g, ' ').trim();

  for (const [captureIndex, capture] of payload.caps.entries()) {
    if (requestedCaptures.size > 0 && !requestedCaptures.has(captureIndex)) continue;

    const treeKind = capture.fullDom ? 'fullDom' : 'subtree';
    const matches = capture[treeKind].nodes.filter((node) => {
      if (region) {
        const [x, y, width, height] = region;
        const rect = node.rect;
        const visible =
          rect &&
          rect.w > 0 &&
          rect.h > 0 &&
          node.style?.display !== 'none' &&
          node.style?.visibility !== 'hidden' &&
          node.style?.opacity !== '0';
        const intersects =
          visible &&
          rect.x < x + width &&
          rect.y < y + height &&
          rect.x + rect.w > x &&
          rect.y + rect.h > y;
        if (!intersects) return false;
      }

      const searchable = idOnly
        ? normalize(node.attrs?.id)
        : [node.path, node.tag, node.text, ...Object.entries(node.attrs ?? {}).flat()]
            .map(normalize)
            .join(' ');
      return pattern.test(searchable);
    });

    if (matches.length === 0) continue;

    process.stdout.write(
      `CAPTURE ${captureIndex}\t${capture.label}\t${capture.themeClass}\tMATCHES ${matches.length}\n`
    );
    for (const node of matches) {
      const rect = node.rect
        ? `${node.rect.x},${node.rect.y},${node.rect.w},${node.rect.h}`
        : 'null';
      process.stdout.write(
        [
          node.path,
          node.tag,
          node.attrs?.id ?? '',
          node.attrs?.class ?? '',
          node.attrs?.title ?? '',
          node.attrs?.['aria-label'] ?? '',
          normalize(node.text),
          rect,
          node.style?.display ?? '',
          node.style?.visibility ?? ''
        ].join('\t') + '\n'
      );
      if (details) {
        process.stdout.write(
          `${JSON.stringify({ attrs: node.attrs ?? {}, style: node.style ?? {}, before: node.before, after: node.after })}\n`
        );
      } else if (styleKeys.length > 0) {
        process.stdout.write(
          `${JSON.stringify(
            Object.fromEntries(styleKeys.map((key) => [key, node.style?.[key] ?? null]))
          )}\n`
        );
      }
    }
  }
}
