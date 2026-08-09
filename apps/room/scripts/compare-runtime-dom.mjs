import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { parse } from 'parse5';

const capturePath = resolve(
  process.argv[2] ?? 'proroom-ULTIMATE-staff-2026-07-24T12-42-02-part1.json'
);
const captureIndex = Number(process.argv[3] ?? 0);
const outputArgument = process.argv.find((argument) => argument.startsWith('--output='));
const outputPath = outputArgument ? resolve(outputArgument.slice('--output='.length)) : null;
const htmlArgument = process.argv.find((argument) => argument.startsWith('--html='));
const runtimeHtml = htmlArgument
  ? await readFile(resolve(htmlArgument.slice('--html='.length)), 'utf8')
  : await readStdin();
const payload = JSON.parse(await readFile(capturePath, 'utf8'));
const capture = payload.caps[captureIndex];

if (!capture) {
  throw new Error(`Capture ${captureIndex} does not exist in ${capturePath}`);
}

const treeKind = capture.fullDom ? 'fullDom' : 'subtree';
const ignoredRuntimeTags = new Set(['script', 'style']);
const ignoredAttributePatterns = [
  /^_ngcontent-/,
  /^_nghost-/,
  /^ng-reflect-/,
  /^data-svelte/,
  /^data-sveltekit/
];

function normalizeText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function semanticAttributes(entries) {
  return Object.fromEntries(
    entries
      .filter(([name]) => !ignoredAttributePatterns.some((pattern) => pattern.test(name)))
      .map(([name, value]) => [name, normalizeText(value)])
      .sort(([left], [right]) => left.localeCompare(right))
  );
}

function captureRecord(node) {
  const attrs = semanticAttributes(Object.entries(node.attrs ?? {}));
  return {
    source: 'capture',
    path: node.path,
    tag: String(node.tag).toLowerCase(),
    attrs,
    directText: normalizeText(node.text),
    rect: node.rect ?? null
  };
}

function findElement(node, tagName) {
  if (node.nodeName === tagName) return node;
  for (const child of node.childNodes ?? []) {
    const match = findElement(child, tagName);
    if (match) return match;
  }
}

function directText(node) {
  return normalizeText(
    (node.childNodes ?? [])
      .filter((child) => child.nodeName === '#text')
      .map((child) => child.value)
      .join(' ')
  );
}

function runtimeRecords(root) {
  const records = [];

  function visit(node, path) {
    if (!node.tagName || ignoredRuntimeTags.has(node.tagName)) return;
    const attrs = semanticAttributes((node.attrs ?? []).map(({ name, value }) => [name, value]));
    records.push({
      source: 'runtime',
      path,
      tag: node.tagName,
      attrs,
      directText: directText(node),
      rect: null
    });

    let elementIndex = 0;
    for (const child of node.childNodes ?? []) {
      if (!child.tagName || ignoredRuntimeTags.has(child.tagName)) continue;
      visit(child, `${path}.${elementIndex}`);
      elementIndex += 1;
    }
  }

  visit(root, 'r');
  return records;
}

function signature(record, includeText = true) {
  return JSON.stringify([record.tag, record.attrs, includeText ? record.directText : undefined]);
}

function multiset(records, includeText) {
  const map = new Map();
  for (const record of records) {
    const key = signature(record, includeText);
    const entry = map.get(key) ?? { count: 0, records: [] };
    entry.count += 1;
    entry.records.push(record);
    map.set(key, entry);
  }
  return map;
}

function compareMultisets(captureRecords, currentRecords, includeText) {
  const expected = multiset(captureRecords, includeText);
  const actual = multiset(currentRecords, includeText);
  let matched = 0;
  const missing = [];
  const extra = [];

  for (const [key, entry] of expected) {
    const actualCount = actual.get(key)?.count ?? 0;
    matched += Math.min(entry.count, actualCount);
    const delta = entry.count - actualCount;
    if (delta > 0) {
      missing.push({
        count: delta,
        signature: JSON.parse(key),
        capturePaths: entry.records.slice(0, delta).map((record) => record.path)
      });
    }
  }

  for (const [key, entry] of actual) {
    const expectedCount = expected.get(key)?.count ?? 0;
    const delta = entry.count - expectedCount;
    if (delta > 0) {
      extra.push({
        count: delta,
        signature: JSON.parse(key),
        runtimePaths: entry.records.slice(0, delta).map((record) => record.path)
      });
    }
  }

  return {
    includeText,
    matched,
    captureTotal: captureRecords.length,
    runtimeTotal: currentRecords.length,
    missing,
    extra
  };
}

function tagCounts(records) {
  const counts = new Map();
  for (const record of records) counts.set(record.tag, (counts.get(record.tag) ?? 0) + 1);
  return counts;
}

function tagDelta(captureRecords, currentRecords) {
  const expected = tagCounts(captureRecords);
  const actual = tagCounts(currentRecords);
  return [...new Set([...expected.keys(), ...actual.keys()])]
    .sort()
    .map((tag) => ({
      tag,
      capture: expected.get(tag) ?? 0,
      runtime: actual.get(tag) ?? 0,
      delta: (actual.get(tag) ?? 0) - (expected.get(tag) ?? 0)
    }))
    .filter((entry) => entry.delta !== 0);
}

function idInventory(records) {
  return new Map(
    records
      .filter((record) => record.attrs.id)
      .map((record) => [
        record.attrs.id,
        {
          tag: record.tag,
          class: record.attrs.class ?? null,
          path: record.path
        }
      ])
  );
}

function compareIds(captureRecords, currentRecords) {
  const expected = idInventory(captureRecords);
  const actual = idInventory(currentRecords);
  const ids = [...new Set([...expected.keys(), ...actual.keys()])].sort();

  return ids.flatMap((id) => {
    const captureEntry = expected.get(id);
    const runtimeEntry = actual.get(id);
    if (
      captureEntry &&
      runtimeEntry &&
      captureEntry.tag === runtimeEntry.tag &&
      captureEntry.class === runtimeEntry.class
    ) {
      return [];
    }
    return [{ id, capture: captureEntry ?? null, runtime: runtimeEntry ?? null }];
  });
}

const document = parse(runtimeHtml);
const body = findElement(document, 'body');
if (!body) throw new Error('Runtime HTML did not contain a body element');

const expectedRecords = capture[treeKind].nodes.map(captureRecord);
const currentRecords = runtimeRecords(body);
const attributeComparison = compareMultisets(expectedRecords, currentRecords, false);
const textComparison = compareMultisets(expectedRecords, currentRecords, true);
const report = {
  generatedAt: new Date().toISOString(),
  capture: {
    path: capturePath,
    index: captureIndex,
    label: capture.label,
    themeClass: capture.themeClass,
    treeKind,
    truncated: capture[treeKind].truncated ?? false
  },
  totals: {
    captureElements: expectedRecords.length,
    runtimeElements: currentRecords.length,
    exactAttributeMatches: attributeComparison.matched,
    exactAttributeAndTextMatches: textComparison.matched
  },
  tagDelta: tagDelta(expectedRecords, currentRecords),
  idMismatches: compareIds(expectedRecords, currentRecords),
  attributeComparison,
  textComparison
};

if (outputPath) {
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

process.stdout.write(
  `${JSON.stringify(
    {
      outputPath,
      capture: report.capture,
      totals: report.totals,
      tagDelta: report.tagDelta,
      idMismatchCount: report.idMismatches.length,
      missingAttributeSignatures: report.attributeComparison.missing.length,
      extraAttributeSignatures: report.attributeComparison.extra.length
    },
    null,
    2
  )}\n`
);

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}
