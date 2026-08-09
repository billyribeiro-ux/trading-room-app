import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseFragment } from 'parse5';

const sourcePath = resolve(process.argv[2] ?? 'emojis');
const outputPath = resolve(process.argv[3] ?? 'src/lib/emoji-data.ts');
const bundlePath = resolve(process.argv[4] ?? 'docs/source/main.d6d3c112b59b7d0d.js');
const source = await readFile(sourcePath, 'utf8');
const bundleSource = await readFile(bundlePath, 'utf8');
const document = parseFragment(source);

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

const SPRITE_SHEET =
  'https://cdn.jsdelivr.net/npm/emoji-datasource-apple@14.0.0/img/apple/sheets-256/64.png';

// Must stay identical to composeSpriteStyle() in EmojiPicker.svelte.
function composeSpriteStyle(size, position) {
  return (
    `width: ${size}px; height: ${size}px; display: inline-block; ` +
    `background-image: url("${SPRITE_SHEET}"); background-size: 6100% 6000%; ` +
    `background-position: ${position};`
  );
}

function elements(node) {
  return node.childNodes?.filter((child) => child.tagName) ?? [];
}

function descendants(node) {
  return [node, ...(node.childNodes ?? []).flatMap(descendants)];
}

function attribute(node, name) {
  return node.attrs?.find((entry) => entry.name === name)?.value ?? '';
}

function hasClass(node, className) {
  return attribute(node, 'class').split(/\s+/).includes(className);
}

function first(node, predicate) {
  return descendants(node).find(predicate);
}

function all(node, predicate) {
  return descendants(node).filter(predicate);
}

function emojiRecord(component) {
  if (!component) return null;
  const outer = first(component, (node) => hasClass(node, 'emoji-mart-emoji'));
  if (!outer) return null;
  const sprite = elements(outer).find((node) => node.tagName === 'span');
  if (!sprite) return null;

  const ariaLabel = attribute(outer, 'aria-label');
  const glyph = ariaLabel.split(',')[0];
  const deployedEntry = deployedEmojiByGlyph.get(glyph);
  if (!deployedEntry) {
    throw new Error(`Could not resolve deployed emoji id for ${JSON.stringify(glyph)}.`);
  }

  /*
    `uncompress()` in the deployed bundle normalises each record before the picker ever
    sees it: shortNames gets the shortName unshifted onto it (so shortNames[0] is the id),
    and keywords/emoticons/text default to empty. Mirrored here so search and the preview
    read the same values the captured app searched and displayed.
  */
  const shortNames = [deployedEntry.shortName, ...(deployedEntry.shortNames ?? [])];
  const emoticons = deployedEntry.emoticons ?? [];

  /*
    Only the size and the background-position vary between the dump's 1820 sprite cells;
    the other ~200 characters are the same URL and background-size every time. Storing
    just the two variables and recomposing them cuts roughly 360KB of duplication out of
    the generated module. The recomposition is asserted below to reproduce every captured
    style string byte for byte, so this stays verbatim data rather than a re-derivation.
  */
  const spriteStyle = attribute(sprite, 'style');
  const parsed = /^width: (\d+)px; height: \1px; .*background-position: ([^;]+);$/.exec(
    spriteStyle
  );
  if (!parsed) throw new Error(`Unrecognised sprite style: ${spriteStyle}`);
  const [, size, spritePosition] = parsed;
  if (composeSpriteStyle(Number(size), spritePosition) !== spriteStyle) {
    throw new Error(`Sprite style does not round-trip for ${glyph}:\n${spriteStyle}`);
  }

  return {
    id: deployedEntry.shortName,
    ariaLabel,
    glyph,
    size: Number(size),
    spritePosition,
    name: deployedEntry.name,
    shortNames,
    keywords: deployedEntry.keywords ?? [],
    emoticons,
    sheet: deployedEntry.sheet,
    // Sheet coordinates for skin tones 2-6; absent when an emoji has no skin variations.
    skinSheets: (deployedEntry.skinVariations ?? []).map((variation) => variation.sheet)
  };
}

const anchorContainer = first(document, (node) => hasClass(node, 'emoji-mart-anchors'));
const anchors = elements(anchorContainer)
  .filter((node) => hasClass(node, 'emoji-mart-anchor'))
  .map((node) => ({
    title: attribute(node, 'title'),
    selected: hasClass(node, 'emoji-mart-anchor-selected'),
    path: attribute(
      first(node, (candidate) => candidate.tagName === 'path'),
      'd'
    )
  }));

const categorySections = all(
  document,
  (node) => hasClass(node, 'emoji-mart-category') && !hasClass(node, 'emoji-mart-no-results')
);
const categories = categorySections.map((section, index) => {
  const label = first(section, (node) => hasClass(node, 'emoji-mart-category-label'));
  const emojiComponents = all(section, (node) => node.tagName === 'ngx-emoji');

  return {
    anchorTitle: anchors[index]?.title ?? '',
    name: attribute(label, 'data-name'),
    // Empty <ngx-emoji></ngx-emoji> placeholders are kept as `null` rather than
    // dropped: the dump has 1823 ngx-emoji elements but only 1820 sprite cells,
    // and the three gaps have to stay at their captured indexes so the rendered
    // element count and ordering match the capture.
    entries: emojiComponents.map(emojiRecord)
  };
});

const noResultsSection = first(document, (node) => hasClass(node, 'emoji-mart-no-results'));
const noResults = emojiRecord(first(noResultsSection, (node) => node.tagName === 'ngx-emoji'));
const preview = emojiRecord(
  first(
    first(document, (node) => hasClass(node, 'emoji-mart-preview-emoji')),
    (node) => node.tagName === 'ngx-emoji'
  )
);
const skinTones = all(document, (node) =>
  attribute(node, 'class')
    .split(/\s+/)
    .some((className) => className.startsWith('emoji-mart-skin-tone-'))
).map((node) => ({
  className: attribute(node, 'class'),
  title: attribute(node, 'title')
}));

const data = {
  evidence: {
    sourceFile: 'emojis',
    sourceSha256: createHash('sha256').update(source).digest('hex'),
    bundleSha256: createHash('sha256').update(bundleSource).digest('hex'),
    sourceBytes: Buffer.byteLength(source),
    renderedEmojiCount: all(document, (node) => node.tagName === 'ngx-emoji').length,
    spriteSheet:
      'https://cdn.jsdelivr.net/npm/emoji-datasource-apple@14.0.0/img/apple/sheets-256/64.png'
  },
  /*
    The deployed emojiSpriteStyles()/getSpritePosition() defaults, needed to build a
    sprite style for states the dump does not contain (a non-default skin tone, the 38px
    preview cell):

      background-size:     `${100 * sheetColumns}% ${100 * sheetRows}%`   -> 6100% 6000%
      background-position: 100 / (sheetColumns - 1) * sheet_x % , same * sheet_y %

    Both axes divide by sheetColumns - 1 = 60. The old dump's header comment claimed the
    y axis divided by 59; the rendered dump disagrees (thumbs-up is sheet [12, 50] at
    `20% 83.3333%`, i.e. 50/60), and getSpritePosition above is why.
  */
  sprite: {
    set: 'apple',
    sheetSize: 64,
    columns: 61,
    rows: 60,
    url: 'https://cdn.jsdelivr.net/npm/emoji-datasource-apple@14.0.0/img/apple/sheets-256/64.png'
  },
  anchors,
  categories,
  noResults,
  preview,
  skinTones
};

const output = `/**
 * Mechanically extracted from the rendered Emoji Mart DOM in /emojis and mapped
 * to the deployed emoji IDs. Do not hand-edit ordering, labels, glyphs, sprite
 * coordinates, category anchors, or SVG paths - re-run
 * \`node scripts/extract-clean-emoji-data.mjs\` instead.
 *
 * A \`null\` entry is an empty <ngx-emoji></ngx-emoji> placeholder that the
 * capture renders with no sprite inside it; the nulls hold their captured
 * positions so the element count and ordering stay faithful.
 */
export type EmojiDumpEntry = {
  id: string;
  ariaLabel: string;
  glyph: string;
  /** Rendered cell size in px, verbatim from the dump: 24 in the grid, 38 elsewhere. */
  size: number;
  /** background-position verbatim from the dump, e.g. '51.6667% 26.6667%'. */
  spritePosition: string;
  name: string;
  shortNames: string[];
  keywords: string[];
  emoticons: string[];
  sheet: [number, number];
  skinSheets: Array<[number, number]>;
};

export type EmojiDumpCategory = {
  anchorTitle: string;
  name: string;
  entries: Array<EmojiDumpEntry | null>;
};

export type EmojiDumpData = {
  evidence: {
    sourceFile: string;
    sourceSha256: string;
    bundleSha256: string;
    sourceBytes: number;
    renderedEmojiCount: number;
    spriteSheet: string;
  };
  sprite: {
    set: string;
    sheetSize: number;
    columns: number;
    rows: number;
    url: string;
  };
  anchors: Array<{ title: string; selected: boolean; path: string }>;
  categories: EmojiDumpCategory[];
  noResults: EmojiDumpEntry;
  preview: EmojiDumpEntry;
  skinTones: Array<{ className: string; title: string }>;
};

export const EMOJI_DUMP_DATA: EmojiDumpData = ${JSON.stringify(data, null, 2)};
`;

await writeFile(outputPath, output);
process.stdout.write(
  `${JSON.stringify(
    {
      source: sourcePath,
      output: outputPath,
      anchors: anchors.length,
      categories: categories.map((category) => ({
        name: category.name,
        entries: category.entries.length
      })),
      totalEntries: categories.reduce((total, category) => total + category.entries.length, 0),
      renderedEmojiCount: data.evidence.renderedEmojiCount,
      spriteSheet: data.evidence.spriteSheet
    },
    null,
    2
  )}\n`
);
