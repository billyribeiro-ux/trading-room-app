import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Generate the second chat column's component stylesheet — `XCP-09`.
 *
 * ## The gap this closes, and the blocker that named the wrong thing
 *
 * `app-extra-chat` ships 5,807 bytes of component styles in the reference bundle, and
 * `src/lib/styles/captured-runtime-components.css` contained the string `app-extra-chat` zero times.
 * The column rendered with none of `.chatTabs`, `.roomLog`, `.txt-area`, `.counterBadge`,
 * `#textAreaHolder` or the Giphy popover.
 *
 * That was filed on 2026-08-31 as blocked on a RE-CAPTURE of `css/complete-app-styles.css` from a
 * room with the second column enabled, on the reasoning that the capture we hold was taken with
 * `preferences.extraChatColumn` off, so Angular never mounted the component and never injected its
 * styles into the captured document. The first half of that is true. The conclusion was wrong, and
 * it was wrong in the specific way this repository keeps having to relearn: **the blocker named a
 * file rather than the missing thing.** A captured DOCUMENT is not the only place a component's
 * rules exist — the compiled COMPONENT carries them, and the compiled component ships here, pinned.
 *
 * ## Why this is a substitution and not a translator
 *
 * The obvious generator would parse the bundle's `styles:` array and perform Angular's
 * `[_ngcontent-%COMP%]` → captured-host translation itself. It does not, and the reason is the
 * strongest evidence this file has:
 *
 * **`app-chat` and `app-extra-chat` ship BYTE-IDENTICAL style arrays.** 5,807 bytes each, at bundle
 * offsets 1,454,430 and 2,400,462. So does the scroller pair: `app-roomscroller` and
 * `app-extra-roomscroller` are 49 bytes each, at 1,419,485 and 2,367,140. The reference builds the
 * second column by re-declaring the same component under a second selector, and it does not vary one
 * declaration.
 *
 * The translation of the FIRST of each pair is therefore already in this repository, performed by
 * the generator that wrote `captured-runtime-components.css` from a live document's CSSOM — with the
 * value normalisation only a CSSOM can do (`border: none` expanded to five longhands, `#fff` to
 * `rgb(255, 255, 255)`). Re-deriving that from the bundle's text would produce a DIFFERENT
 * stylesheet for identical input, and the difference would be this generator's opinion rather than
 * the reference's.
 *
 * So the transform is: take the already-translated sections, rename the two hosts, and **prove the
 * inputs were identical before doing it**. The identity check is not a sanity assertion, it is the
 * entire licence for the substitution. If a future bundle makes the two components differ by one
 * byte, this fails loudly and the answer becomes a real translator.
 *
 * ## What this deliberately does not do
 *
 * It does not touch `captured-runtime-components.css`. That file is generated from
 * `css/complete-app-styles.css` and its header pins that input's SHA-256; appending a section
 * derived from a different source would make its own provenance line a lie. This writes a sibling
 * artifact with its own header and its own two pinned inputs.
 *
 * It also does not resurrect `pnpm css:sync-captured`, the command that header names. That script is
 * among the evicted `apps/room/scripts/` files that `git ls-files` returns zero for, and rebuilding
 * it needs the live document it read, which is not the gap this closes.
 *
 * Run: `pnpm css:sync-extra-chat`. Checked on every CI run by
 * `apps/room/src/lib/extra-chat-styles-contract.test.ts`, which regenerates in memory and compares —
 * so a hand-edit of the output fails rather than surviving.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOM_ROOT = resolve(HERE, '..');

const BUNDLE_PATH = 'docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js';
const TRANSLATED_PATH = 'src/lib/styles/captured-runtime-components.css';
const OUTPUT_PATH = 'src/lib/styles/captured-extra-chat.css';

/**
 * The two components the reference re-declares verbatim under a second selector.
 *
 * `section` is the heading text in the translated sheet, matched exactly rather than by number: the
 * numbers are the capture's own section indices and renumbering them would silently move a slice.
 */
const PAIRS = [
  {
    from: 'app-chat',
    to: 'app-extra-chat',
    section: '/* Captured runtime section 34: app-chat; scope 3761163150 */',
    next: '/* Captured runtime section 35: app-roomscroller; scope 1936721513 */'
  },
  {
    from: 'app-roomscroller',
    to: 'app-extra-roomscroller',
    section: '/* Captured runtime section 35: app-roomscroller; scope 1936721513 */',
    next: '/* Captured runtime section 36: app-webcam-holder; scope 654575438 */'
  }
];

/** @param {string} text @returns {string} */
const sha256 = (text) => createHash('sha256').update(text).digest('hex');

/**
 * @param {string} message
 * @returns {never}
 */
const fail = (message) => {
  throw new Error(message);
};

/**
 * The decoded `styles:` array of one component definition.
 *
 * Reads the FIRST `styles:[` after the selector rather than searching the file for one, because a
 * search would happily return a neighbour's array and every byte below would still compare equal to
 * something.
 *
 * THROWS rather than returning null for a component that declares no styles. Every caller here needs
 * the bytes — the whole point is comparing two arrays — so a null would only be checked once and then
 * carried through four expressions as a maybe. Fail loud, at the read, naming the selector.
 *
 * @param {string} bundle
 * @param {string} selector
 * @returns {{ at: number; css: string }}
 */
function componentStyles(bundle, selector) {
  const declaration = `selectors:[["${selector}"]]`;
  const at = bundle.indexOf(declaration);
  if (at === -1) fail(`${selector} is not declared in ${BUNDLE_PATH}`);

  const styles = bundle.indexOf('styles:[', at);
  if (styles === -1) fail(`${selector} has no styles array anywhere after its declaration`);

  let cursor = styles + 'styles:['.length;
  if (bundle[cursor] !== '"') {
    fail(`${selector}'s styles array does not open with a string literal`);
  }
  cursor += 1;

  const parts = [];
  for (;;) {
    const character = bundle[cursor];
    if (character === undefined) fail(`${selector}'s styles array is never closed`);
    if (character === '\\') {
      parts.push(bundle.slice(cursor, cursor + 2));
      cursor += 2;
      continue;
    }
    if (character === '"') break;
    parts.push(character);
    cursor += 1;
  }
  return { at: styles, css: parts.join('') };
}

/**
 * One already-translated section, sliced between its own heading and the next one.
 *
 * Both anchors are bound and asserted before the slice. `slice-anchor-contract.test.ts` records why:
 * an inlined `indexOf` that returns -1 slices from the END of the file, and every assertion about
 * the result then passes against an empty tail.
 *
 * @param {string} sheet
 * @param {{ section: string; next: string }} pair
 * @returns {string}
 */
function translatedSection(sheet, { section, next }) {
  const from = sheet.indexOf(section);
  if (from === -1) fail(`${TRANSLATED_PATH} no longer contains ${section}`);
  const to = sheet.indexOf(next, from);
  if (to === -1) fail(`${TRANSLATED_PATH} no longer contains ${next} after ${section}`);
  return sheet.slice(from + section.length, to).trim();
}

/**
 * Rename a host selector without touching a longer name that starts with it.
 *
 * `app-chat` is a prefix of `app-chat-logs-modal`, and a `\b` boundary does not help: `t` followed
 * by `-` IS a word boundary, so `\bapp-chat\b` matches inside the longer name. The lookarounds
 * reject any name character on either side, hyphen included.
 *
 * @param {string} text
 * @param {string} from
 * @param {string} to
 * @returns {string}
 */
function renameHost(text, from, to) {
  return text.replace(new RegExp(`(?<![\\w-])${from}(?![\\w-])`, 'g'), to);
}

/**
 * The whole artifact, as text, from the two inputs.
 *
 * A pure function and not a write, so `extra-chat-styles-contract.test.ts` can regenerate in memory
 * and compare with what is on disk. A generator that can only write is a generator whose output
 * nobody can check without trusting it first, and that is how a hand-edit survives.
 *
 * @param {string} bundle
 * @param {string} translated
 * @returns {{ text: string; sections: { from: string; to: string; bytes: number; sourceAt: number; twinAt: number; body: string }[] }}
 */
export function renderExtraChatStyles(bundle, translated) {
  const sections = PAIRS.map((pair) => {
    const source = componentStyles(bundle, pair.from);
    const twin = componentStyles(bundle, pair.to);

    if (source.css !== twin.css) {
      fail(
        `${pair.from} and ${pair.to} no longer ship identical styles ` +
          `(${source.css.length} vs ${twin.css.length} bytes, offsets ${source.at} and ${twin.at}). ` +
          `This generator renames an already-translated section on the strength of that identity; ` +
          `with the two diverged, the answer is a real [_ngcontent-%COMP%] translator, not this.`
      );
    }

    const body = renameHost(
      renameHost(translatedSection(translated, pair), pair.from, pair.to),
      // The ownership boundary inside `app-chat`'s section names the scroller; it has to move too.
      'app-roomscroller',
      'app-extra-roomscroller'
    );

    return {
      ...pair,
      bytes: source.css.length,
      sourceAt: source.at,
      twinAt: twin.at,
      body
    };
  });

  const header = `/*
 * GENERATED — do not edit by hand; run: pnpm css:sync-extra-chat
 *
 * The second chat column's component styles, XCP-09.
 *
 * Sources, both pinned:
 *   ${BUNDLE_PATH}
 *     SHA-256: ${sha256(bundle)}
 *   ${TRANSLATED_PATH}
 *     SHA-256: ${sha256(translated)}
 *
 * The reference declares the second column as a byte-identical copy of the first under a second
 * selector, and this file is the already-translated first copy with the hosts renamed. The identity
 * is re-proved on every run and is the whole licence for that substitution — see
 * gate/sync-extra-chat-styles.mjs for why re-translating from the bundle would produce a different
 * sheet for identical input.
 *
${sections
  .map(
    (section) =>
      ` *   ${section.from} (byte ${section.sourceAt.toLocaleString('en-US')}) ` +
      `= ${section.to} (byte ${section.twinAt.toLocaleString('en-US')}), ` +
      `${section.bytes.toLocaleString('en-US')} bytes`
  )
  .join('\n')}
 */
`;

  const body = sections
    .map((section) => `\n/* ${section.to}, renamed from ${section.from} */\n${section.body}\n`)
    .join('');

  return { text: `${header}${body}`, sections };
}

/** The two inputs, read from the room root so the paths read as locations rather than directions. */
export function readInputs() {
  return {
    bundle: readFileSync(resolve(ROOM_ROOT, BUNDLE_PATH), 'utf8'),
    translated: readFileSync(resolve(ROOM_ROOT, TRANSLATED_PATH), 'utf8')
  };
}

/**
 * Written only when this file is the entry point.
 *
 * The contract test imports {@link renderExtraChatStyles} and must not have the side effect of
 * rewriting the artifact it is about to compare against — which would make it pass unconditionally,
 * the exact shape of a test that cannot fail.
 */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { bundle, translated } = readInputs();
  const { text, sections } = renderExtraChatStyles(bundle, translated);
  writeFileSync(resolve(ROOM_ROOT, OUTPUT_PATH), text);
  console.log(
    `${OUTPUT_PATH}: ${sections.length} sections, ` +
      `${sections.map((section) => `${section.to} ${section.bytes}B`).join(', ')}`
  );
}

export {
  componentStyles,
  translatedSection,
  renameHost,
  PAIRS,
  BUNDLE_PATH,
  TRANSLATED_PATH,
  OUTPUT_PATH
};
