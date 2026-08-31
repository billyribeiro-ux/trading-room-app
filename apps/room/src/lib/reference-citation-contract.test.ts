import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * EVERY `symbol` + `byte N` CITATION IN THIS APP RESOLVES IN THE BUNDLE IT NAMES.
 *
 * ## The defect class, which appeared five times in one week
 *
 * This repository is built by decoding a minified bundle, so its comments are full of citations like
 * *"`E2e`, byte 2,035,701"*. A wrong one is the hardest kind of error to catch by reading, because
 * **the sentence is true and only the label is wrong**: the expression quoted beside it is correct,
 * so a reader who checks the claim finds it correct and moves on.
 *
 * Found by reading, one at a time, between 2026-08-30 and 2026-08-31:
 *
 * | claimed | actually | what the claimed symbol really is |
 * | --- | --- | --- |
 * | `K4e` | `nRe` | an `as-split` wrapper — a real sibling with the same shape (`SHL-06`) |
 * | `hSe` | `pSe` | one icon, not the three-way chooser (`SVC-02`) |
 * | `bSe` | `vSe` | the slider row, which builds no ids (`SVC-03`) |
 * | `C2e` | `E2e` | the Private Chat dropdown ITEM (`RSG-01`) |
 * | `u2e` | `g2e` | a template in a DIFFERENT component (`RSG-02`) |
 *
 * Every one names real code. That is what makes the class dangerous rather than merely untidy — a
 * citation pointing at nothing is found the first time somebody looks it up.
 *
 * ## What this file checks, and what it deliberately cannot
 *
 * A citation that pairs a symbol with a byte makes one falsifiable claim: **that byte is code
 * belonging to that symbol.** This sweeps every such pair in the app and checks it.
 *
 * It CANNOT check a citation that names a symbol without an offset — `SVC-02`'s and `RSG-02`'s
 * originals were of that shape and this would not have caught them. That is an argument for the
 * house style rather than a gap to apologise for: pair the symbol with the byte, and the claim
 * becomes checkable. Measured 2026-08-31: **84 pairs across the app, all resolving.**
 *
 * Nor can it separate a symbol DEFINED at an offset from one merely REFERENCED there — `hSe` appears
 * inside `pSe`'s body as a slot argument, so the `hSe` citation would still pass. Stated because a
 * sweep whose limits are not written down gets read as covering more than it does.
 */

const BUNDLE = readFileSync('docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', 'utf8');

/**
 * Angular's minifier emits short names with a digit or an internal capital — `E2e`, `g2e`, `pSe`,
 * `K4e`, `$4e`, `ISe`. Ordinary identifiers this repository also backticks (`File`, `Save`, `body`)
 * must not be swept: they are not in the bundle as symbols and would be 300 false positives.
 */
const MINIFIED =
  /^(?:[A-Za-z_$]{1,3}[0-9][A-Za-z]{1,2}|[a-z]{1,2}[A-Z][a-z]e|[A-Z][A-Za-z]{1,2}e)$/;

/**
 * A backticked symbol, then a byte offset within ninety characters on the same line.
 *
 * The thousands separators are written as ESCAPES — `\u00a0`, `\u202f` — rather than as themselves.
 * Two offsets in this app are typed with a non-breaking space, and eslint's `no-irregular-whitespace`
 * refuses the literal character in source; it failed the gate on the first run of this file.
 *
 * The window is what ties the two together as ONE claim. Widen it and a symbol at the start of a
 * paragraph pairs with an offset at the end that belongs to a different sentence.
 */
const PAIR =
  /`([A-Za-z_$][A-Za-z0-9_$]{2,5})`[^`\n]{0,90}?\bbytes?\s*\**\s*([0-9][0-9,_\u00a0\u202f ]{5,12})/giu;

const DECLARATION = /function ([A-Za-z_$][A-Za-z0-9_$]{2,5})\(/g;

/** Does `offset` name code belonging to `symbol`? */
function resolves(symbol: string, offset: number): boolean {
  /*
    (a) The citation points AT a use site — `H(86, n2e, 1, 2, …)` — where the symbol is literally at
    the byte. A tight window, because the loose one is what made an earlier draft of this useless:
    at ±400 bytes, three of the five known-wrong citations PASSED, since minified siblings sit
    within a few hundred bytes of each other. Measured, on the first run.
  */
  if (BUNDLE.slice(Math.max(0, offset - 40), offset + 40).includes(symbol)) return true;

  /*
    (b) Or the byte lies inside the symbol's own body: at or after its declaration, and before the
    next one. The 64-byte grace before the declaration is not slack — it is for citations that point
    at the boundary rather than the token, and three in this app did until they were made exact.
  */
  const declaration = Math.max(
    BUNDLE.lastIndexOf(`function ${symbol}(`, offset),
    BUNDLE.lastIndexOf(`${symbol}=`, offset)
  );
  if (declaration === -1) return false;
  DECLARATION.lastIndex = 0;
  const next = DECLARATION.exec(BUNDLE.slice(declaration + 1));
  const end = next ? declaration + 1 + next.index : BUNDLE.length;
  return offset >= declaration - 64 && offset < end;
}

const citations = (): { where: string; symbol: string; offset: number }[] => {
  const found: { where: string; symbol: string; offset: number }[] = [];
  for (const path of globSync('src/**/*.{ts,svelte}')) {
    if (path.includes('.test.')) continue;
    for (const match of readFileSync(path, 'utf8').matchAll(PAIR)) {
      if (!MINIFIED.test(match[1])) continue;
      const offset = Number(match[2].replace(/[^0-9]/g, ''));
      if (!Number.isFinite(offset) || offset <= 0 || offset >= BUNDLE.length) continue;
      found.push({ where: path, symbol: match[1], offset });
    }
  }
  return found;
};

describe('the evidence this file measures is loaded', () => {
  it('reads the bundle at the pinned size, so an offset means something', () => {
    expect(BUNDLE.length).toBe(2_891_205);
  });

  it('and found citations to check, which is what makes the sweep mean anything', () => {
    /*
      At zero pairs every assertion here is vacuously true — the way a sweep dies quietly. The floor
      is far below the measured 84: this asserts the PATTERN still matches, not the count, because
      pinning the count would fail on every commit that adds a citation.
    */
    expect(citations().length).toBeGreaterThan(50);
  });
});

describe('every symbol/offset pair names code belonging to that symbol', () => {
  it('lists each one that does not, rather than failing on the first', () => {
    const broken = citations()
      .filter(({ symbol, offset }) => !resolves(symbol, offset))
      .map(({ where, symbol, offset }) => `${where}: \`${symbol}\` at ${offset}`);
    expect(
      broken,
      'these citations name a symbol that does not own the byte beside it — the sentence may be ' +
        'true and the quoted code right, which is exactly why nobody catches this by reading'
    ).toEqual([]);
  });
});

describe('the rule itself, checked against the five that were found by hand', () => {
  /*
    A guard whose own logic is never exercised is a guard nobody can trust. These are the real
    citations that shipped wrong, with the byte each was written beside, and their corrections.
  */
  it('flags the wrong symbol and passes the right one, where position can tell them apart', () => {
    /* `SHL-06` — two `as-split` wrappers with three areas each; the gate is `nRe`'s. */
    expect(resolves('K4e', 2_496_317)).toBe(false);
    expect(resolves('nRe', 2_496_317)).toBe(true);
    /* `RSG-01` — `C2e` is the Private Chat dropdown item; the row gate is `E2e`. */
    expect(resolves('C2e', 2_035_701)).toBe(false);
    expect(resolves('E2e', 2_035_701)).toBe(true);
    /* `SVC-03` — `bSe` is the slider row and builds no ids; `vSe` builds them. */
    expect(resolves('bSe', 1_922_603)).toBe(false);
    expect(resolves('vSe', 1_922_603)).toBe(true);
  });

  it('and does NOT claim to catch the case position cannot separate', () => {
    /*
      `SVC-02` credited `hSe` with the three-way icon choice that is `pSe`'s. Both pass, because
      `pSe` renders `hSe` into a slot — so `hSe` genuinely appears at that byte, as an argument.
      Asserted rather than left unsaid: a sweep read as catching more than it does is worse than one
      whose limit is written down, and this is the limit.
    */
    expect(resolves('hSe', 1_921_142)).toBe(true);
    expect(resolves('pSe', 1_921_142)).toBe(true);
  });
});
