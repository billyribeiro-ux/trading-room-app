import { readFileSync, writeFileSync } from 'node:fs';
import { format } from 'prettier';

const bundlePath = process.argv[2] ?? 'docs/source/main.d6d3c112b59b7d0d.js';
const selector = process.argv[3] ?? 'app-st-message';
const outputPath = process.argv[4] ?? `docs/source/${selector}.component.css`;
const source = readFileSync(bundlePath, 'utf8');
const selectorMarker = `selectors:[["${selector}"]]`;
const selectorIndex = source.indexOf(selectorMarker);

if (selectorIndex === -1) {
  throw new Error(`Selector marker not found: ${selectorMarker}`);
}

const stylesMarker = 'styles:[';
const stylesIndex = source.indexOf(stylesMarker, selectorIndex);
if (stylesIndex === -1) {
  throw new Error(`Styles array not found after ${selectorMarker}`);
}

function decodeString(start) {
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
    if (escaped === '\n') continue;
    if (escaped === '\r') {
      if (source[cursor] === '\n') cursor += 1;
      continue;
    }
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

  throw new Error('Unterminated JavaScript string');
}

const styles = [];
let cursor = stylesIndex + stylesMarker.length;
while (cursor < source.length) {
  while (/\s|,/.test(source[cursor])) cursor += 1;
  if (source[cursor] === ']') break;
  if (source[cursor] !== '"' && source[cursor] !== "'") {
    throw new Error(`Unexpected styles token at byte ${cursor}`);
  }
  const decoded = decodeString(cursor);
  styles.push(decoded.value);
  cursor = decoded.cursor;
}

if (styles.length === 0) throw new Error(`No styles found for ${selector}`);

writeFileSync(outputPath, `${styles.join('\n')}\n`);

let compiledOutputPath = null;
if (selector === 'app-st-message') {
  const compiledStart = source.lastIndexOf('const cge=', selectorIndex);
  const compiledEnd = source.indexOf('})();', selectorIndex) + 5;
  if (compiledStart === -1 || compiledEnd < selectorIndex) {
    throw new Error('Unable to isolate the compiled app-st-message component');
  }
  compiledOutputPath = 'docs/source/app-st-message.compiled.js';
  const compiled = await format(source.slice(compiledStart, compiledEnd), {
    parser: 'babel',
    printWidth: 100
  });
  writeFileSync(compiledOutputPath, compiled);
}

console.log(
  JSON.stringify(
    {
      bundlePath,
      selector,
      selectorIndex,
      styleBlocks: styles.length,
      characters: styles.reduce((total, style) => total + style.length, 0),
      outputPath,
      compiledOutputPath
    },
    null,
    2
  )
);
