import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { format } from 'prettier';

const root = new URL('../', import.meta.url);
const bundlePath = new URL('docs/source/main.d6d3c112b59b7d0d.js', root);
const outputDirectory = new URL('docs/source/components/', root);
const bundle = readFileSync(bundlePath, 'utf8');

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

const selectors = [
  ...new Set([...bundle.matchAll(/selectors:\[\["(app-[^"]+)"\]\]/g)].map((match) => match[1]))
].sort();

mkdirSync(outputDirectory, { recursive: true });

const components = [];
for (const selector of selectors) {
  const resolved = resolveComponent(selector);
  const selectorIndex = resolved?.selectorIndex ?? -1;
  const start = resolved?.start;
  const startIndex = classStarts.indexOf(start);
  const end = start ? classEnd(start) : -1;

  if (!start || end < 0) {
    throw new Error(`Could not resolve compiled component boundary for ${selector}`);
  }

  const source = bundle.slice(start.index, end);
  const previousClass = classStarts[startIndex - 1];
  const renderPreludeStart = previousClass ? classEnd(previousClass) : 0;
  const renderPreludeEnd = start.inlineComponent
    ? bundle.lastIndexOf('const ', start.index)
    : start.index;
  const renderPrelude = bundle.slice(renderPreludeStart, renderPreludeEnd);
  const renderPreludeCode = renderPrelude
    .trim()
    .replace(/^[,;]+/, '')
    .replace(/(?:const|let|var)\s*[,;]*$/, '')
    .replace(/[,;]+$/, '')
    .trim();
  const readableSource = await format(`${source};\n`, {
    parser: 'babel',
    printWidth: 100,
    singleQuote: true,
    trailingComma: 'none'
  });
  const readableRenderPrelude = renderPreludeCode.trim()
    ? await format(`${renderPreludeCode}\n`, {
        parser: 'babel',
        printWidth: 100,
        singleQuote: true,
        trailingComma: 'none'
      })
    : '';
  const fullReadableSource = `${readableRenderPrelude}${readableSource}`;
  const styles = decodeStyles(source);
  const css = styles.join('\n');
  const inputsMatch = source.match(/inputs:\{([^}]*)\}/);
  const inputNames = inputsMatch
    ? [...inputsMatch[1].matchAll(/([A-Za-z0-9_$]+):/g)].map((match) => match[1])
    : [];

  writeFileSync(new URL(`${selector}.compiled.js`, outputDirectory), readableSource);
  if (readableRenderPrelude) {
    writeFileSync(new URL(`${selector}.render-helpers.js`, outputDirectory), readableRenderPrelude);
  }
  writeFileSync(new URL(`${selector}.full.js`, outputDirectory), fullReadableSource);
  if (styles.length)
    writeFileSync(new URL(`${selector}.component.css`, outputDirectory), `${css}\n`);

  components.push({
    selector,
    symbol: start.symbol,
    selectorIndex,
    start: start.index,
    end,
    bytes: source.length,
    sha256: sha256(source),
    readableBytes: readableSource.length,
    readableSha256: sha256(readableSource),
    renderPreludeStart,
    renderPreludeBytes: renderPrelude.length,
    renderPreludeSha256: renderPrelude.length ? sha256(renderPrelude) : null,
    readableRenderPreludeBytes: readableRenderPrelude.length,
    readableRenderPreludeSha256: readableRenderPrelude ? sha256(readableRenderPrelude) : null,
    fullReadableBytes: fullReadableSource.length,
    fullReadableSha256: sha256(fullReadableSource),
    decls: Number(source.match(/decls:(\d+)/)?.[1] ?? 0),
    vars: Number(source.match(/vars:(\d+)/)?.[1] ?? 0),
    inputNames,
    styleBlocks: styles.length,
    styleCharacters: css.length,
    styleSha256: styles.length ? sha256(css) : null,
    sourceFile: `docs/source/components/${selector}.compiled.js`,
    renderHelpersFile: readableRenderPrelude
      ? `docs/source/components/${selector}.render-helpers.js`
      : null,
    fullSourceFile: `docs/source/components/${selector}.full.js`,
    styleFile: styles.length ? `docs/source/components/${selector}.component.css` : null
  });
}

const manifest = {
  generatedAt: new Date().toISOString(),
  bundle: {
    path: 'docs/source/main.d6d3c112b59b7d0d.js',
    bytes: bundle.length,
    sha256: sha256(bundle)
  },
  componentCount: components.length,
  components
};

writeFileSync(new URL('manifest.json', outputDirectory), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      componentCount: components.length,
      totalCompiledBytes: components.reduce((total, component) => total + component.bytes, 0),
      totalReadableBytes: components.reduce(
        (total, component) => total + component.readableBytes,
        0
      ),
      totalStyleCharacters: components.reduce(
        (total, component) => total + component.styleCharacters,
        0
      ),
      selectors: components.map((component) => component.selector)
    },
    null,
    2
  )
);
