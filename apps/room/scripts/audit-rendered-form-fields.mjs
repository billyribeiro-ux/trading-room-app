import { parse } from 'parse5';

const target = process.argv[2] ?? 'http://127.0.0.1:5178/';
const response = await fetch(target);

if (!response.ok) {
  throw new Error(`Unable to audit ${target}: HTTP ${response.status}`);
}

const document = parse(await response.text(), { sourceCodeLocationInfo: true });
const fields = [];

function walk(node) {
  if (node.tagName === 'input' || node.tagName === 'textarea' || node.tagName === 'select') {
    fields.push(node);
  }
  for (const child of node.childNodes ?? []) walk(child);
  if (node.content) walk(node.content);
}

walk(document);

function attribute(node, name) {
  return node.attrs?.find((candidate) => candidate.name === name)?.value.trim() ?? '';
}

function location(node) {
  const start = node.sourceCodeLocation?.startTag ?? node.sourceCodeLocation;
  return start ? `${start.startLine}:${start.startCol}` : 'unknown';
}

const missing = fields.filter((field) => !attribute(field, 'id') && !attribute(field, 'name'));
const ids = new Map();

for (const field of fields) {
  const id = attribute(field, 'id');
  if (!id) continue;
  const occurrences = ids.get(id) ?? [];
  occurrences.push(`${field.tagName}@${location(field)}`);
  ids.set(id, occurrences);
}

const duplicates = [...ids.entries()].filter(([, occurrences]) => occurrences.length > 1);

if (missing.length > 0) {
  console.error(`Rendered fields missing both id and name at ${target}:`);
  for (const field of missing) console.error(`  ${field.tagName}@${location(field)}`);
}

if (duplicates.length > 0) {
  console.error(`Rendered duplicate field ids at ${target}:`);
  for (const [id, occurrences] of duplicates) {
    console.error(`  ${id}: ${occurrences.join(', ')}`);
  }
}

if (missing.length === 0 && duplicates.length === 0) {
  console.log(
    `${fields.length} rendered form fields audited at ${target}: all have an id or name and all ids are unique.`
  );
}

process.exitCode = missing.length + duplicates.length > 0 ? 1 : 0;
