import { globSync, readFileSync } from 'node:fs';
import postcss from 'postcss';
import { parse } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';

/**
 * EVERY `<img>` IN THIS APP HAS A SIZE BEFORE ITS BYTES ARRIVE.
 *
 * ## Why this file exists here, when the room has had one since 2026-08-25
 *
 * The room's `img-dimensions-contract.test.ts` has guarded its 46 components for a week. This app
 * had **no such gate at all**, and its six unsized images were found on 2026-08-31 by running the
 * room's rule against it rather than by anything failing. That is the same argument
 * `declaration-tag-contract.test.ts` makes in its own header: *"A rule enforced in one app and merely
 * believed in the other is a rule that holds in one app."*
 *
 * All six turned out to be CORRECT — every one is bounded by a stylesheet rule with its intent
 * recorded beside it — so nothing here is a fix. What was missing was the instrument. An unsized
 * image is a layout shift on every slow connection and a Core Web Vitals regression nobody can
 * attribute afterwards, and it costs one attribute to prevent; the reason to gate it is precisely
 * that it never fails loudly.
 *
 * ## What counts as sized, in the order the browser tries them
 *
 * `width` + `height` attributes, or an `aspect-ratio` in an inline `style`, or a CSS rule that
 * bounds BOTH axes — and for the third the rule is NAMED here and its text is asserted to exist in
 * the sheet that supposedly carries it. An allow-list of file paths would go stale the moment
 * somebody deleted the rule; naming the declaration means the exemption dies with it.
 */

/** Parsed with Svelte's own compiler: a regex over markup cannot tell an attribute from prose. */
const imagesIn = (file: string): { file: string; classes: string; sized: boolean }[] => {
  const found: { file: string; classes: string; sized: boolean }[] = [];
  const ast = parse(readFileSync(file, 'utf8'), { modern: true, filename: file });

  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    const element = node as {
      type?: string;
      name?: string;
      attributes?: { type?: string; name?: string; value?: unknown }[];
    };
    if (element.type === 'RegularElement' && element.name === 'img') {
      const attributes = (element.attributes ?? []).filter((a) => a.type === 'Attribute');
      const names = new Set(attributes.map((a) => a.name));
      const style = JSON.stringify(attributes.find((a) => a.name === 'style')?.value ?? '');
      const classAttribute = JSON.stringify(attributes.find((a) => a.name === 'class')?.value ?? '');
      found.push({
        file,
        classes: classAttribute,
        sized: (names.has('width') && names.has('height')) || /aspect-ratio/.test(style)
      });
    }
    for (const key of Object.keys(node)) if (key !== 'parent') visit((node as never)[key]);
  };

  visit(ast.fragment);
  return found;
};

/**
 * One class's own declarations, PARSED — property to value.
 *
 * ## The block, not the file, and a negative control forced the distinction
 *
 * The first version of the case below asked whether the SHEET contained the rule text. Its control —
 * delete `max-height: 20px` from `.acc-badge-img` — **came back green**, because `src/account.css`
 * says `max-height: 20px` twice more in the comment above that rule, where it transcribes the
 * reference's own declaration and argues the choice. A case written to assert a DECLARATION exists
 * passed on prose describing it: the fourth instance of that shape found in this repository in one
 * day.
 *
 * ## And then the regex that fixed it was replaced by the parser the room already used
 *
 * A comment-stripping brace walk closes that control, and it is still a regex reading CSS: it cannot
 * see a nested rule, an `@media` wrapper or a multi-selector block, and it would answer confidently
 * about all three. The room's copy of this contract has used **postcss** since it was written, so
 * `postcss` is a devDependency here now for the same reason — one technique, the stronger one, in
 * both apps, rather than a second weaker implementation of a rule that already exists.
 *
 * The selector match is on a WHOLE compound: `.navLogo` matches `.mg-root .navLogo` and would not
 * match a hypothetical `.navLogoSmall`, which a substring test would.
 */
const declarationsFor = (sheet: string, cls: string): Map<string, string> => {
  const declarations = new Map<string, string>();
  postcss.parse(readFileSync(sheet, 'utf8'), { from: sheet }).walkRules((rule) => {
    const matches = rule.selectors.some((selector) =>
      selector.split(/[\s>+~]+/).some((part) => part === `.${cls}` || part.startsWith(`.${cls}[`))
    );
    if (!matches) return;
    for (const node of rule.nodes) if (node.type === 'decl') declarations.set(node.prop, node.value);
  });
  return declarations;
};
/**
 * The images bounded by CSS instead, each naming the DECLARATION that bounds it.
 *
 * Every entry is checked twice below: the named class's own block must contain the rule, and the
 * image must still carry the class. Neither half alone is an exemption — a class with no rule is the
 * unsized image this file is about, and a rule with no wearer is the orphan
 * `orphan-style-contract` is about.
 */
const SIZED_BY_CSS: readonly {
  readonly cls: string;
  readonly sheet: string;
  /** The declaration that bounds the box, as postcss reads it: property, then value. */
  readonly property: string;
  readonly value: string;
  readonly why: string;
}[] = [
  {
    cls: 'acc-badge-img',
    sheet: 'src/account.css',
    property: 'max-height',
    value: '20px',
    why: "the account page's badge row — height 100% capped at 20px, and the sheet argues why a bounded honest height beats an invented precise one"
  },
  {
    cls: 'user-badge-img',
    sheet: 'src/manage.css',
    property: 'max-height',
    value: '20px',
    why: "the rooms page's badge row — the reference's own rule, copied byte for byte from its stylesheet"
  },
  {
    cls: 'navLogo',
    sheet: 'src/manage.css',
    property: 'height',
    value: '25px',
    why: 'the room logo in the manage preview — a fixed 25px height with a 300px width cap'
  },
  {
    cls: 'auth-upload-preview',
    sheet: 'src/auth.css',
    property: 'max-height',
    value: '125px',
    why: 'the avatar chooser preview — bounded on both axes at 125px'
  },
  {
    cls: 'acc-brand-logo',
    sheet: 'src/account.css',
    /*
      Not a SIZE at all, and that is the honest entry for it: this `<img>` carries `hidden` and no
      `src`, so it never renders and there is no box to shift. `display: none` on the `[hidden]`
      rule is what the sheet declares and what this asserts — if that rule ever goes, the element
      becomes a real unsized image and this entry fails rather than silently excusing it.
    */
    property: 'display',
    /*
      `none`, not `none !important`: postcss lifts `!important` onto the declaration's own `important`
      flag and leaves the VALUE clean. Reading the raw text would have accepted the string with the
      bang in it, which is one more reason the parser is the right instrument — it forced this entry
      to say what the declaration actually is.
    */
    value: 'none',
    why: 'carries `hidden` and no `src`: it never renders, and the sheet keeps it out of the flow'
  }
];

const COMPONENTS = globSync('src/**/*.svelte').sort();
const IMAGES = COMPONENTS.flatMap(imagesIn);

describe('the sweep is measuring something', () => {
  it('parsed every component and found images', () => {
    expect(COMPONENTS.length).toBeGreaterThan(30);
    expect(IMAGES.length).toBeGreaterThan(10);
  });
});

describe('every image is sized before it loads', () => {
  it('names each one that is not, rather than failing on the first', () => {
    const unsized = IMAGES.filter(
      (image) => !image.sized && !SIZED_BY_CSS.some((entry) => image.classes.includes(entry.cls))
    ).map((image) => `${image.file}  class=${image.classes}`);
    expect(
      unsized,
      'an <img> with no width/height, no aspect-ratio and no CSS exemption: the page reflows when ' +
        'its bytes arrive, which is a layout shift nobody can attribute afterwards'
    ).toEqual([]);
  });
});

describe('every CSS exemption is real, in both directions', () => {
  it('the declaration it names is in that class s own block', () => {
    /* A class with no rule is exactly the unsized image this file exists to catch. */
    const missing = SIZED_BY_CSS.filter(
      (entry) => declarationsFor(entry.sheet, entry.cls).get(entry.property) !== entry.value
    ).map(
      (entry) =>
        `${entry.cls}: ${entry.sheet} declares ` +
        `${entry.property}: ${declarationsFor(entry.sheet, entry.cls).get(entry.property) ?? 'nothing'}` +
        `, not ${entry.value}`
    );
    expect(missing).toEqual([]);
  });

  it('and something still wears it', () => {
    /* A rule with no wearer is a stale exemption, and it hides the next unsized image behind it. */
    const unworn = SIZED_BY_CSS.filter((entry) => !IMAGES.some((image) => image.classes.includes(entry.cls))).map(
      (entry) => `${entry.cls}: no <img> carries it any more`
    );
    expect(unworn).toEqual([]);
  });
});
