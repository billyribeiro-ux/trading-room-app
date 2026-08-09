import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'parse5';
import { DIRECT_EVIDENCE_CONTRACT } from '../src/lib/direct-evidence-contract.ts';

const root = new URL('../', import.meta.url);
const bundlePath = new URL('docs/source/main.d6d3c112b59b7d0d.js', root);
const bundle = readFileSync(bundlePath, 'utf8');
const modalSource = readFileSync(new URL('src/lib/components/ModalHost.svelte', root), 'utf8');
const pageSource = readFileSync(new URL('src/routes/+page.svelte', root), 'utf8');

const artifactAliases = {
  'app-alerts-advanced-search': 'app-alerts-advanced-modal',
  'app-all-user-pmmodal': 'app-user-pmmodal',
  'app-debug-log-modal': 'app-debug-settings-modal',
  'app-scheduled-alerts-modal': 'app-schedule-alerts-modal'
};

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function decodeString(source, start) {
  const quote = source[start];
  let value = '';
  let cursor = start + 1;
  while (cursor < source.length) {
    const character = source[cursor++];
    if (character === quote) return { value, cursor };
    if (character !== '\\') {
      value += character;
      continue;
    }
    const escaped = source[cursor++];
    if (escaped === 'n') value += '\n';
    else if (escaped === 'r') value += '\r';
    else if (escaped === 't') value += '\t';
    else if (escaped === 'b') value += '\b';
    else if (escaped === 'f') value += '\f';
    else if (escaped === 'v') value += '\v';
    else if (escaped === '0') value += '\0';
    else if (escaped === 'x') {
      value += String.fromCodePoint(Number.parseInt(source.slice(cursor, cursor + 2), 16));
      cursor += 2;
    } else if (escaped === 'u') {
      if (source[cursor] === '{') {
        const end = source.indexOf('}', cursor);
        value += String.fromCodePoint(Number.parseInt(source.slice(cursor + 1, end), 16));
        cursor = end + 1;
      } else {
        value += String.fromCodePoint(Number.parseInt(source.slice(cursor, cursor + 4), 16));
        cursor += 4;
      }
    } else {
      value += escaped;
    }
  }
  throw new Error(`Unterminated JavaScript string at ${start}`);
}

function decodeStyles(componentSource) {
  const marker = 'styles:[';
  const stylesIndex = componentSource.indexOf(marker);
  if (stylesIndex === -1) return [];
  const styles = [];
  let cursor = stylesIndex + marker.length;
  while (cursor < componentSource.length) {
    while (/\s|,/.test(componentSource[cursor])) cursor += 1;
    if (componentSource[cursor] === ']') break;
    if (componentSource[cursor] !== '"' && componentSource[cursor] !== "'") break;
    const decoded = decodeString(componentSource, cursor);
    styles.push(decoded.value);
    cursor = decoded.cursor;
  }
  return styles;
}

function countElements(html) {
  const document = parse(html);
  let elements = 0;
  function walk(node) {
    if (node.tagName) elements += 1;
    for (const child of node.childNodes ?? []) walk(child);
  }
  walk(document);
  return elements;
}

function countExactHost(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...source.matchAll(new RegExp(`<${escaped}(?=[\\s>/])`, 'g'))].length;
}

const classStarts = [];
for (const match of bundle.matchAll(
  /(?:([A-Za-z0-9_$]+)=|component:)(\(\(\)=>\{class ([A-Za-z0-9_$]+)\{)/g
)) {
  const inlineComponent = !match[1];
  classStarts.push({
    index: match.index + (inlineComponent ? 'component:'.length : 0),
    symbol: match[1] ?? `inline-component-${match.index}`,
    className: match[3],
    inlineComponent
  });
}

function classEnd(entry) {
  const marker = `return ${entry.className}})()`;
  const markerIndex = bundle.indexOf(marker, entry.index);
  if (markerIndex === -1) {
    throw new Error(`Could not resolve class IIFE end for ${entry.symbol}`);
  }
  return markerIndex + marker.length;
}

function resolveComponent(selector) {
  const marker = `selectors:[["${selector}"]]`;
  let selectorIndex = bundle.indexOf(marker);
  while (selectorIndex !== -1) {
    const start = classStarts.findLast((entry) => entry.index < selectorIndex);
    if (start && selectorIndex < classEnd(start)) return { selectorIndex, start };
    selectorIndex = bundle.indexOf(marker, selectorIndex + marker.length);
  }
  return null;
}

function componentFor(selector) {
  const resolved = resolveComponent(selector);
  if (!resolved) {
    return {
      selector,
      selectorIndex: null,
      compiled: null
    };
  }

  const { selectorIndex, start } = resolved;
  const startIndex = classStarts.indexOf(start);
  const componentEnd = classEnd(start);
  const componentSource = bundle.slice(start.index, componentEnd);
  const previousClass = classStarts[startIndex - 1];
  const renderPreludeStart = previousClass ? classEnd(previousClass) : 0;
  const renderPreludeEnd = start.inlineComponent
    ? bundle.lastIndexOf('const ', start.index)
    : start.index;
  const renderPrelude = bundle.slice(renderPreludeStart, renderPreludeEnd);
  const styles = decodeStyles(componentSource);
  const inputsMatch = componentSource.match(/inputs:\{([^}]*)\}/);
  const inputNames = inputsMatch
    ? [...inputsMatch[1].matchAll(/([A-Za-z0-9_$]+):/g)].map((match) => match[1])
    : [];
  const decls = Number(componentSource.match(/decls:(\d+)/)?.[1] ?? 0);
  const vars = Number(componentSource.match(/vars:(\d+)/)?.[1] ?? 0);
  const artifactName = artifactAliases[selector] ?? selector;
  const artifactUrl = new URL(`app-modals/${artifactName}`, root);
  const artifactExists = existsSync(artifactUrl);
  const artifact = artifactExists ? readFileSync(artifactUrl, 'utf8') : '';

  return {
    selector,
    selectorIndex,
    compiled: {
      symbol: start.symbol,
      start: start.index,
      end: componentEnd,
      bytes: componentSource.length,
      sha256: sha256(componentSource),
      renderPreludeStart,
      renderPreludeBytes: renderPrelude.length,
      renderPreludeSha256: renderPrelude.length ? sha256(renderPrelude) : null,
      decls,
      vars,
      inputNames,
      styleBlocks: styles.length,
      styleCharacters: styles.reduce((total, style) => total + style.length, 0),
      styleSha256: styles.length ? sha256(styles.join('\n')) : null
    },
    suppliedArtifact: {
      path: artifactExists ? `app-modals/${artifactName}` : null,
      bytes: artifact.length,
      sha256: artifactExists ? sha256(artifact) : null,
      elements: artifact ? countElements(artifact) : 0
    },
    implementation: {
      hostInModalSource: countExactHost(modalSource, selector) > 0,
      hostInPageSource: countExactHost(pageSource, selector) > 0,
      sourceOccurrences:
        countExactHost(modalSource, selector) + countExactHost(pageSource, selector)
    }
  };
}

const screenshotSelectors = [...new Set(DIRECT_EVIDENCE_CONTRACT.rootHostOrder)];
const bundleSelectors = [...bundle.matchAll(/selectors:\[\["(app-[^"]+)"\]\]/g)].map(
  (match) => match[1]
);
const selectors = [...new Set([...screenshotSelectors, 'app-st-message', ...bundleSelectors])];
const components = selectors.map(componentFor);

const screenshotOccurrenceCounts = Object.fromEntries(
  screenshotSelectors.map((selector) => [
    selector,
    DIRECT_EVIDENCE_CONTRACT.rootHostOrder.filter((value) => value === selector).length
  ])
);

const screenshotAudit = screenshotSelectors.map((selector) => {
  const component = components.find((entry) => entry.selector === selector);
  return {
    selector,
    screenshotOccurrences: screenshotOccurrenceCounts[selector],
    compiledEvidence: Boolean(component?.compiled),
    suppliedArtifactElements: component?.suppliedArtifact.elements ?? 0,
    implementationOccurrences: component?.implementation.sourceOccurrences ?? 0
  };
});

const failures = [];
for (const entry of screenshotAudit) {
  if (!entry.compiledEvidence) failures.push(`${entry.selector}: no compiled component`);
  if (entry.implementationOccurrences !== entry.screenshotOccurrences) {
    failures.push(
      `${entry.selector}: expected ${entry.screenshotOccurrences} source hosts, found ${entry.implementationOccurrences}`
    );
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  bundle: {
    path: 'docs/source/main.d6d3c112b59b7d0d.js',
    bytes: bundle.length,
    sha256: sha256(bundle),
    appSelectors: bundleSelectors.length
  },
  screenshotHostOrder: DIRECT_EVIDENCE_CONTRACT.rootHostOrder,
  screenshotAudit,
  components,
  failures
};

writeFileSync(
  new URL('docs/generated/production-component-evidence.json', root),
  `${JSON.stringify(report, null, 2)}\n`
);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
