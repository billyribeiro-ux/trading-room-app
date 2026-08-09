import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const sourcePath = resolve(
  process.argv[2] ?? 'proroom-ULTIMATE-staff-2026-07-24T12-42-02-part1.json'
);
const outputPath = resolve(process.argv[3] ?? 'src/lib/emoji-data.ts');
const bundlePath = resolve(process.argv[4] ?? 'docs/source/main.d6d3c112b59b7d0d.js');
const source = await readFile(sourcePath, 'utf8');
const bundleSource = await readFile(bundlePath, 'utf8');
const payload = JSON.parse(source);
const captureIndex = 54;
const nodes = payload.caps[captureIndex].subtree.nodes;
const byPath = new Map(nodes.map((node) => [node.path, node]));
const directChildren = (path, tag) =>
  nodes.filter(
    (node) =>
      node.tag === tag &&
      node.path.startsWith(`${path}.`) &&
      node.path.slice(path.length + 1).split('.').length === 1
  );

const emojiArrayStart = bundleSource.indexOf('See=[');
const emojiArrayEnd = bundleSource.indexOf('],wee=', emojiArrayStart);
if (emojiArrayStart === -1 || emojiArrayEnd === -1) {
  throw new Error('Could not locate the deployed emoji-datasource array.');
}

const deployedEmojiRecords = Function(
  `"use strict"; return (${bundleSource.slice(emojiArrayStart + 4, emojiArrayEnd + 1)});`
)();
const deployedEmojiByGlyph = new Map(
  deployedEmojiRecords.map((entry) => [
    String.fromCodePoint(...entry.unified.split('-').map((point) => Number.parseInt(point, 16))),
    entry
  ])
);

function emojiRecord(path) {
  const outer = byPath.get(`${path}.0`);
  const sprite = byPath.get(`${path}.0.0`);
  if (!outer || !sprite) return null;

  const ariaLabel = String(outer.attrs?.['aria-label'] ?? '');
  const glyph = ariaLabel.split(',')[0];
  const deployedEntry = deployedEmojiByGlyph.get(glyph);
  if (!deployedEntry) {
    throw new Error(`Could not resolve deployed emoji id for ${JSON.stringify(glyph)}.`);
  }

  return {
    id: deployedEntry.shortName,
    ariaLabel,
    glyph,
    spriteStyle: String(sprite.attrs?.style ?? '')
  };
}

const anchorContainer = nodes.find((node) => node.attrs?.class === 'emoji-mart-anchors');
const anchors = directChildren(anchorContainer.path, 'span')
  .filter((node) =>
    String(node.attrs?.class ?? '')
      .split(/\s+/)
      .includes('emoji-mart-anchor')
  )
  .map((node) => ({
    title: node.attrs.title,
    selected: String(node.attrs.class).includes('emoji-mart-anchor-selected'),
    path: nodes.find(
      (candidate) => candidate.tag === 'path' && candidate.path.startsWith(`${node.path}.`)
    )?.attrs?.d
  }));

const categoryComponents = nodes.filter((node) => node.tag === 'emoji-category').slice(1);
const categories = categoryComponents.map((component, index) => {
  const sectionPath = `${component.path}.0`;
  const label = byPath.get(`${sectionPath}.0`);
  const emojiComponents = directChildren(sectionPath, 'ngx-emoji');

  return {
    anchorTitle: anchors[index]?.title,
    name: label?.attrs?.['data-name'],
    height: component.rect?.h,
    entries: emojiComponents.map((emoji) => emojiRecord(emoji.path))
  };
});

const noResultsComponent = nodes.find(
  (node) => node.attrs?.class === 'emoji-mart-category emoji-mart-no-results'
);
const noResultsEmoji = nodes.find(
  (node) =>
    node.tag === 'ngx-emoji' &&
    node.path.startsWith(`${noResultsComponent.path}.`) &&
    node.path.endsWith('.0.0')
);
const previewEmoji = nodes.find(
  (node) => node.tag === 'ngx-emoji' && node.path.startsWith('r.0.3.0.0.0.')
);
const skinTones = nodes
  .filter((node) => String(node.attrs?.class ?? '').includes('emoji-mart-skin-tone-'))
  .map((node) => ({
    className: node.attrs.class,
    title: node.attrs.title,
    color: node.style?.['background-color']
  }));

const data = {
  evidence: {
    part: payload.part,
    captureIndex,
    captureLabel: payload.caps[captureIndex].label,
    sourceSha256: createHash('sha256').update(source).digest('hex'),
    bundleSha256: createHash('sha256').update(bundleSource).digest('hex'),
    nodeCount: nodes.length
  },
  anchors,
  categories,
  noResults: emojiRecord(noResultsEmoji.path),
  preview: emojiRecord(previewEmoji.path),
  skinTones
};

const output = `/**
 * Mechanically extracted from part 1, capture 54, and the deployed emoji data.
 * Do not hand-edit emoji IDs, labels, ordering, counts, or sprite coordinates.
 */
export type EmojiDumpEntry = {
  id: string;
  ariaLabel: string;
  glyph: string;
  spriteStyle: string;
};

export type EmojiDumpCategory = {
  anchorTitle: string;
  name: string;
  height: number;
  entries: Array<EmojiDumpEntry | null>;
};

export type EmojiDumpData = {
  evidence: {
    part: number;
    captureIndex: number;
    captureLabel: string;
    sourceSha256: string;
    bundleSha256: string;
    nodeCount: number;
  };
  anchors: Array<{ title: string; selected: boolean; path: string }>;
  categories: EmojiDumpCategory[];
  noResults: EmojiDumpEntry;
  preview: EmojiDumpEntry;
  skinTones: Array<{ className: string; title: string; color: string }>;
};

export const EMOJI_DUMP_DATA: EmojiDumpData = ${JSON.stringify(data, null, 2)};
`;

await writeFile(outputPath, output);
process.stdout.write(
  `${JSON.stringify(
    {
      output: outputPath,
      categories: categories.map((category) => ({
        name: category.name,
        entries: category.entries.length,
        rendered: category.entries.filter(Boolean).length
      })),
      totalEntries: categories.reduce((total, category) => total + category.entries.length, 0)
    },
    null,
    2
  )}\n`
);
