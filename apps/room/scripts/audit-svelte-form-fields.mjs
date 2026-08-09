import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src/', import.meta.url));
const files = [];

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await collect(path);
    } else if (entry.name.endsWith('.svelte')) {
      files.push(path);
    }
  }
}

await collect(root);

const missing = [];
const ids = new Map();

function extractAttribute(tag, attribute) {
  const escapedAttribute = attribute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const templateExpression = tag.match(
    new RegExp(`\\b${escapedAttribute}\\s*=\\s*\\{(\`(?:\\\\.|[^\`])*\`)\\}`)
  );
  if (templateExpression) return templateExpression[1];

  const regularAttribute = tag.match(
    new RegExp(`\\b${escapedAttribute}\\s*=\\s*(?:"([^"]+)"|'([^']+)'|\\{([^}]+)\\})`)
  );
  return regularAttribute?.slice(1).find(Boolean);
}

for (const file of files) {
  const source = await readFile(file, 'utf8');
  const lineStarts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\n') lineStarts.push(index + 1);
  }

  for (const match of source.matchAll(/<(input|textarea|select)\b[\s\S]*?>/g)) {
    const tag = match[0];
    const offset = match.index ?? 0;
    const line = lineStarts.findLastIndex((lineStart) => lineStart <= offset) + 1;
    const id = extractAttribute(tag, 'id') ?? (/\{id\}/.test(tag) ? '{id}' : undefined);
    const name = extractAttribute(tag, 'name') ?? (/\{name\}/.test(tag) ? '{name}' : undefined);
    const location = `${relative(join(root, '..'), file)}:${line}`;

    if (!id && !name) missing.push(location);
    if (id) {
      const occurrences = ids.get(id) ?? [];
      occurrences.push(location);
      ids.set(id, occurrences);
    }
  }
}

const duplicates = [...ids.entries()].filter(([, occurrences]) => occurrences.length > 1);

if (missing.length > 0) {
  console.error('Fields missing both id and name:');
  for (const location of missing) console.error(`  ${location}`);
}

if (duplicates.length > 0) {
  console.error('Duplicate literal field ids:');
  for (const [id, occurrences] of duplicates) {
    console.error(`  ${id}`);
    for (const location of occurrences) console.error(`    ${location}`);
  }
}

if (missing.length === 0 && duplicates.length === 0) {
  console.log('All Svelte form fields have an id or name, and literal field ids are unique.');
}

process.exitCode = missing.length + duplicates.length > 0 ? 1 : 0;
