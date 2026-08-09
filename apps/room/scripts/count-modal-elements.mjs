import { readFile } from 'node:fs/promises';
import { parse } from 'svelte/compiler';

const source = await readFile('src/lib/components/ModalHost.svelte', 'utf8');
const ast = parse(source, { modern: true });

function walk(value, visit) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }

  visit(value);
  for (const [key, child] of Object.entries(value)) {
    if (key !== 'metadata') walk(child, visit);
  }
}

function literalAttribute(node, name) {
  const attribute = node.attributes?.find(
    (candidate) => candidate.type === 'Attribute' && candidate.name === name
  );
  return attribute?.value?.[0]?.data ?? null;
}

const modals = [];
walk(ast.fragment, (node) => {
  if (node.type !== 'Component' || node.name !== 'Modal') return;

  let ownedElements = 0;
  walk(node.fragment, (descendant) => {
    if (descendant.type === 'RegularElement' || descendant.type === 'SvelteElement') {
      ownedElements += 1;
    }
  });

  modals.push({
    id: literalAttribute(node, 'id'),
    ownedElements
  });
});

for (const modal of modals) {
  process.stdout.write(`${modal.id}\towned-elements=${modal.ownedElements}\n`);
}
