/**
 * SIDE BY SIDE: the reference's user table against ours, element for element.
 *
 * Reads the reference straight out of the owner's own rendered DOM and compares it to what our
 * component actually produces for the same three members — an owner and two presenters, which is
 * what the reference's three rows are.
 *
 * ## Why it compares a NORMALISED sequence rather than raw HTML
 *
 * The two cannot be diffed as text and should not be: the reference is AngularJS, so it carries
 * `ng-scope`, `ng-binding`, `ng-hide` and `ng-*` directives that are that framework's bookkeeping,
 * not the page's appearance. What must match is the rendered SHAPE — which elements, in which
 * order, with which meaningful classes and which text.
 *
 * So both sides are reduced to one line per element: `tag.class1.class2  «text»`, with framework
 * bookkeeping dropped and elements that are HIDDEN on both sides dropped too. What survives is what
 * a person sees.
 *
 * ## The one rule that makes this honest
 *
 * `ng-hide` means the element is in the DOM and invisible. Our equivalent is to not render it at
 * all. Those are the same to a user and different to a differ, so a reference element carrying
 * `ng-hide` is EXPECTED to be absent from ours — it is reported as `hidden both sides` rather than
 * as a divergence. Four icons that were `ng-show="false"` were transcribed literally once, rendered
 * anyway because the HTML `hidden` attribute loses to Font Awesome's `display: inline-block`, and
 * sat visibly on every row. That is the failure this distinction exists to keep visible.
 *
 * Usage:  npx vitest run src/lib/manage-user-table-sbs.test.ts
 * This module holds the comparison; the test file supplies the render.
 */

/**
 * AngularJS bookkeeping — present in the reference, meaningless to appearance.
 *
 * `ng-valid` and `ng-invalid` take an optional PER-VALIDATOR suffix. ngModel writes
 * `ng-invalid ng-invalid-required` as a pair, and this enumerated only the first half — so the
 * reference's stats search box (file2:927, `class="form-control ng-pristine ng-untouched ng-invalid
 * ng-invalid-required"`) normalised to `input.form-control.ng-invalid-required` and read as a class
 * our page was missing. It is not: our box carries the same `required` the reference does. One
 * piece of framework bookkeeping was surviving the filter that exists to remove it.
 */
const FRAMEWORK_CLASS =
  /^(ng-scope|ng-binding|ng-isolate-scope|ng-pristine|ng-untouched|ng-valid(-[a-z0-9-]+)?|ng-dirty|ng-touched|ng-invalid(-[a-z0-9-]+)?|ng-empty|ng-not-empty)$/;

/**
 * One line per element, in document order.
 *
 * `hidden` elements are dropped: on the reference side that is `ng-hide`, on ours it is simply not
 * being rendered. Both mean "nobody sees this".
 */
export function shapeOf(source: string, { angular = false }: { angular?: boolean } = {}) {
  /*
    COMMENTS FIRST, on both sides, or the comparison is nonsense.

    The reference is littered with AngularJS's own markers — `<!-- ngRepeat: user in xrefs -->`,
    `<!-- ngIf: … -->`, `<!-- stripe data here -->` — and our SSR output is littered with Svelte's
    hydration markers, `<!--[-->` and `<!--]-->`. Neither renders anything. Left in, they push the
    two columns out of step and every line after the first comment reads as a divergence, which is
    how a differ produces 400 false findings and hides the four real ones.
  */
  const html = source.replace(/<!--[\s\S]*?-->/g, '');

  const out: Array<{ kind: string; value?: string; tag?: string; classes?: string[] }> = [];
  const tagRe = /<(\/?)([a-z][a-z0-9]*)\b([^>]*)>|([^<]+)/gi;
  let match;

  while ((match = tagRe.exec(html)) !== null) {
    const [, closing, tag, attrs, text] = match;

    if (text !== undefined) {
      const t = text
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (t) out.push({ kind: 'text', value: t });
      continue;
    }
    if (closing) continue;

    /*
      `class=` MATCHES INSIDE `ng-class=`.

      The reference's tab <li> carries `ng-class="{active: tab.active, disabled: tab.disabled}"`
      BEFORE its real class attribute, so a naive match read the Angular expression as the class
      list and every tab compared as `li.{active:.active,.disabled:.disabled}`. Same family as the
      \b bugs: an attribute name starts at a space or the string start.
    */
    const classAttr = /(^|\s)class="([^"]*)"/.exec(attrs ?? '')?.[2] ?? '';
    const classes = classAttr.split(/\s+/).filter(Boolean);

    // Invisible either way: skip.
    if (angular && classes.includes('ng-hide')) {
      // Skip this element AND its subtree — an ng-hide wrapper hides everything inside it.
      const depth = skipSubtree(html, tagRe.lastIndex, tag);
      if (depth !== null) tagRe.lastIndex = depth;
      continue;
    }
    /*
      `\bhidden\b` MATCHES INSIDE `aria-hidden`.

      A word boundary sits between `-` and `h`, so this dropped every reference element carrying
      `aria-hidden="true"` — which is most of the icons — and every one then read as a divergence.
      The same `\b` mistake this project fixed in the CSS gate this morning, reintroduced here in
      the tool built to find mistakes. An HTML attribute starts at a space or the string start.
    */
    /*
      `hidden` HIDES THE SUBTREE, exactly as `ng-hide` does.

      This used to `continue`, dropping the element and keeping its children — while the `ng-hide`
      branch above skips the whole subtree. Asymmetric, and the tab strip is where it showed:
      the reference's Text List `<li class="ng-hide">` vanishes with its anchor and its label
      (file2:7-9), ours is `<li hidden>` (+page.svelte:918) and lost only the `<li>`, leaving an
      orphan `action` and an orphan «Text List» behind. Two of those, four spurious nodes, and
      every line after the first one read as a divergence. `hidden` is `display: none` on the
      element AND everything inside it, so both sides now drop the same thing.
    */
    if (/(^|\s)hidden(\s|=|$)/.test(attrs ?? '')) {
      // null for a void element — nothing to skip, since it has no subtree
      const end = skipSubtree(html, tagRe.lastIndex, tag);
      if (end !== null) tagRe.lastIndex = end;
      continue;
    }

    /*
      The ripple pair is framework decoration, not page content.

      Every button in the reference carries `<span><span style="width: 107px; height: 107px;
      left: -10.6719px; top: -42.5px;"></span></span>` — 12 of them across the page. It is injected
      by a Material-style ripple directive: empty, classless, and carrying inline geometry computed
      from where a pointer last landed. It has no rule in any stylesheet we hold.

      It is skipped for the same reason `ng-scope` is: it describes the framework, not the page.
      Reproducing it would mean two empty elements with pixel values copied from one click, which
      is invented data AND dead scaffolding. Left in the comparison it desynchronises every line
      after it, which is worse than either.

      The rule is deliberately NARROW — a `span` with no class at all. Every span the reference
      uses for content (the role, "PW set", the caret, the badges) carries a class or text.
    */
    const emptySpan = tag === 'span' && classes.length === 0 && !/\bstyle=|\bng-/.test(attrs ?? '');
    if (emptySpan) {
      const next = html.slice(tagRe.lastIndex).match(/^\s*(<span style="[^"]*"><\/span><\/span>|<\/span>)/);
      if (next) {
        tagRe.lastIndex += next[0].length;
        continue;
      }
    }

    /*
      textAngular's OWN injected chrome, dropped by the same argument as the ripple pair above.

      Inside the reference's `.ta-scroll-window`, BEFORE the editing surface, sit two subtrees the
      editor injects for itself (all of this is on file2:879):

        <div class="popover fade bottom" style="max-width: none; width: 305px;">
          <div class="arrow"></div><div class="popover-content"></div>
        </div>
        <div class="ta-resizer-handle-overlay">
          a background, four corners in the order tl, tr, bl, br, and an info readout
        </div>

      Ten elements, every one of them EMPTY — no text, and no children beyond more empty divs. The
      popover is Bootstrap's link/image bubble, positioned and filled on demand; its only non-class
      attribute is inline geometry (`width: 305px`) that positioning computed at one moment. The
      overlay is the image-resize grip set, driven by a drag.

      We have neither. `manage.css`'s textAngular block (988-1167) declares `.ta-root`, `.ta-toolbar`,
      `.btn-group-small .btn`, `.ta-editor`, `.ta-scroll-window.form-control`, `textarea.ta-editor`
      and `.ta-scroll-window > .ta-bind`, and stops — nothing for `.popover`, `.arrow`,
      `.popover-content`, or any `.ta-resizer-handle-*`. Transcribing them would ship ten divs that no
      rule paints and no handler drives, plus a pixel width copied from one click: dead scaffolding
      and invented data, which is what the ripple rule above exists to refuse. Left in, they push
      every row after them out of step, which is worse than either.

      HONEST GAP: the reference's own stylesheets are not in this repo, so "invisible in the capture"
      is NOT claimed here. What is claimed is only what was read — empty, ruleless on our side, and
      injected by an editor we reimplemented rather than embedded.

      The popover match is deliberately narrow, requiring BOTH `popover` and `fade` — that is the
      shell in its un-shown state. A popover the page actually filled would still be compared.
    */
    const editorChrome =
      tag === 'div' &&
      ((classes.includes('popover') && classes.includes('fade')) ||
        classes.includes('ta-resizer-handle-overlay'));
    if (editorChrome) {
      const end = skipSubtree(html, tagRe.lastIndex, tag);
      if (end !== null) tagRe.lastIndex = end;
      continue;
    }

    /*
      A menu ACTION is one token, however it is plumbed.

      The reference fires each menu item from `<a href="" ng-click="updateUser(…)">` — an anchor
      that goes nowhere, driven entirely by JavaScript. Ours posts a real form:
      `<form><input type="hidden"><input type="hidden"><button>`. That is a deliberate divergence
      and the one place this project does not copy the reference: the menu keeps working with
      JavaScript off, and every mutation goes through a server action instead of an XHR.

      It is invisible. `manage.css` styles `.dropdown-menu > li > a`,
      `.dropdown-menu > li > button` and `.dropdown-menu > li > form > button` with one rule, and
      the form wrapper is `display: contents`. Same box, same paint.

      So the wrapper and its hidden inputs are dropped and both triggers reduce to `action`. What
      is still compared is what matters: that the item EXISTS, in the right place, with the right
      icons and the right label. Left un-normalised this turned 35 identical architectural choices
      into 478 "divergences" and buried the real ones.
    */
    if (tag === 'form') continue;
    if (tag === 'input' && /type="hidden"/.test(attrs ?? '')) continue;

    const meaningful = classes.filter((c) => !FRAMEWORK_CLASS.test(c));
    if ((tag === 'a' || tag === 'button') && meaningful.length === 0) {
      out.push({ kind: 'el', tag: 'action', classes: [] });
      continue;
    }
    out.push({ kind: 'el', tag, classes: meaningful });
  }
  return out;
}

/** Index just past the matching close tag, so an ng-hide subtree can be skipped whole. */
function skipSubtree(html: string, from: number, tag: string) {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  re.lastIndex = from;
  let depth = 1;
  let m;
  while ((m = re.exec(html)) !== null) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return re.lastIndex;
  }
  return null;
}

/** A single comparable line. */
export const render = (node: { kind: string; value?: string; tag?: string; classes?: string[] }) =>
  node.kind === 'text' ? `«${node.value}»` : [node.tag, ...(node.classes ?? [])].join('.');

/** Side-by-side lines, and the count that disagree. */
export function sideBySide(
  referenceShape: ReturnType<typeof shapeOf>,
  oursShape: ReturnType<typeof shapeOf>,
  width = 54
) {
  const rows = [];
  let differing = 0;
  for (let i = 0; i < Math.max(referenceShape.length, oursShape.length); i++) {
    const a = referenceShape[i] ? render(referenceShape[i]) : '';
    const b = oursShape[i] ? render(oursShape[i]) : '';
    const same = a === b;
    if (!same) differing += 1;
    rows.push(`${same ? '   ' : ' ! '}${String(i).padStart(3)}  ${a.padEnd(width)} | ${b}`);
  }
  return { rows, differing };
}
