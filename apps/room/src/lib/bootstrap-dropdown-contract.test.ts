import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';

/**
 * NO DROPDOWN IN THIS ROOM WAITS FOR A BOOTSTRAP THAT NEVER ARRIVES.
 *
 * ## The premise, which is the whole reason this file exists
 *
 * This app renders Bootstrap's markup - `data-bs-toggle="dropdown"`, `.dropdown-menu`,
 * `.dropdown-item` - because the components are transcriptions of a reference that shipped
 * Bootstrap. **It does not ship Bootstrap's JavaScript.** `bootstrap` is not a dependency of any
 * app in this repository; what ships is the captured CSS, and that CSS says
 * `.dropdown-menu { display: none }` with `.dropdown-menu.show { display: block }`.
 *
 * So `data-bs-toggle="dropdown"` is INERT here. Nothing reads it. A dropdown opens only if
 * something in this codebase adds `.show`, and `RoomMenus` (`lib/room/menus.svelte.ts`) is the
 * thing that does - it exists for exactly this reason.
 *
 * ## What was found when this was first measured, 2026-08-29
 *
 * Nineteen `.dropdown-menu` elements. **Seventeen drove `.show` from `RoomMenus`. Two did not**, and
 * both were therefore unopenable:
 *
 *   - `ScreenVolumeControl.svelte` - the presentation area's volume dropdown. Its own docblock said
 *     the menu is *"hidden by Bootstrap's own `.dropdown-menu { display: none }` until `.show`
 *     lands"*, which is a true sentence about the reference and a false one about this app. The
 *     navbar's twin of the same control had driven `menus.volume` all along.
 *   - `StreamingView.svelte` - the buffer-size dropdown. Its three `setBufferSize` entries had been
 *     repaired on 2026-08-28, when they were found calling `undefined?.()`; that repair could not
 *     see that the menu holding them never opened. Two layers of one control, each dead for a
 *     different reason, fixed a day apart.
 *
 * Neither was visible to anything else here. Both type-check, both lint clean, `svelte-check` is
 * silent on both, and every unit test around them constructs the component directly.
 *
 * ## Why the premise is asserted rather than assumed
 *
 * If somebody adds Bootstrap's JavaScript, every rule below becomes wrong rather than merely
 * redundant - `data-bs-toggle` would start working and hand-driven `.show` would fight it. So the
 * absence of the dependency is the FIRST assertion, and its failure message says to reconsider this
 * file rather than to satisfy it.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const REPOSITORY_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

/**
 * `.dropdown-menu` as a whole class token.
 *
 * `note-dropdown-menu` is summernote's own class on the note editor's seven toolbar menus, governed
 * by its own rule and not by Bootstrap's `display: none`. A substring match folds those in and
 * reports seven false positives, which is how this pattern earned its boundaries.
 */
const DROPDOWN_MENU = /(^|[^-\w])dropdown-menu($|[^-\w])/;

interface Element {
  file: string;
  line: number;
  tag: string;
  classText: string;
  attributeNames: Set<string>;
  hasHandler: boolean;
  dropdownTrigger: boolean;
}

function elementsIn(file: string, source: string): Element[] {
  const found: Element[] = [];
  const ast = parse(source, { modern: true, filename: file });

  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    const element = node as {
      type?: string;
      name?: string;
      start?: number;
      attributes?: { type: string; name?: string; start: number; end: number }[];
    };

    if (element.type === 'RegularElement' && element.name) {
      const attributes = element.attributes ?? [];
      const names = new Set(
        attributes.filter((a) => a.type === 'Attribute' && a.name).map((a) => a.name as string)
      );
      const cls = attributes.find((a) => a.type === 'Attribute' && a.name === 'class');
      const toggle = attributes.find((a) => a.type === 'Attribute' && a.name === 'data-bs-toggle');
      found.push({
        file,
        line: source.slice(0, element.start ?? 0).split('\n').length,
        tag: element.name,
        classText: cls ? source.slice(cls.start, cls.end) : '',
        attributeNames: names,
        hasHandler:
          [...names].some((n) => n.startsWith('on')) ||
          attributes.some((a) => a.type === 'SpreadAttribute'),
        dropdownTrigger: toggle
          ? source.slice(toggle.start, toggle.end).includes('"dropdown"')
          : false
      });
    }

    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      visit((node as Record<string, unknown>)[key]);
    }
  };

  visit((ast as { fragment: unknown }).fragment);
  return found;
}

const COMPONENTS = globSync('**/*.svelte', { cwd: ROOT }).sort();
const ALL = COMPONENTS.flatMap((file) => elementsIn(file, readFileSync(`${ROOT}${file}`, 'utf8')));

const MENUS = ALL.filter((e) => DROPDOWN_MENU.test(e.classText));
/**
 * Dropdown triggers only, and the scope is measured rather than assumed.
 *
 * `data-bs-toggle` carries four values in this app: `dropdown` (21), `tab` (31), `modal` (16) and
 * `collapse` (1). Each is a SEPARATE Bootstrap plugin with a separate replacement here, and only
 * the dropdown one has been measured end to end - which is what this file documents. Tabs are
 * driven by conditional `active` classes on real `<button onclick>` elements, and modals by the
 * project's own `Modal` component and its `open` prop; asserting over those without doing the same
 * measurement would be a claim rather than a finding.
 */
const TRIGGERS = ALL.filter((e) => e.dropdownTrigger);

describe('no dropdown waits for a Bootstrap that never arrives', () => {
  it('holds its premise: no app in this repository depends on bootstrap', () => {
    const manifests = ['package.json', 'apps/room/package.json', 'apps/controller/package.json'];
    for (const manifest of manifests) {
      const parsed = JSON.parse(readFileSync(`${REPOSITORY_ROOT}${manifest}`, 'utf8')) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const named = [
        ...Object.keys(parsed.dependencies ?? {}),
        ...Object.keys(parsed.devDependencies ?? {})
      ];
      expect(
        named.filter((name) => name === 'bootstrap' || name.startsWith('bootstrap@')),
        `${manifest} now depends on bootstrap. If its JavaScript is genuinely being loaded, ` +
          'this whole file is obsolete and the hand-driven `show` toggles it protects would ' +
          'FIGHT it - reconsider the file rather than satisfying it.'
      ).toEqual([]);
    }
  });

  it('measures enough elements to mean something', () => {
    /*
      The vacuity floor. Both lists below are "expect no offenders", which is exactly the shape that
      reports success when the walk breaks and finds nothing at all.
    */
    expect(MENUS.length).toBeGreaterThanOrEqual(19);
    expect(TRIGGERS.length).toBeGreaterThanOrEqual(19);

    /* And that the token boundary still excludes summernote's own menus, which are not Bootstrap's. */
    expect(MENUS.filter((m) => m.classText.includes('note-dropdown-menu'))).toEqual([]);
    expect(
      ALL.filter((e) => e.classText.includes('note-dropdown-menu')).length,
      'the note editor still has its own toolbar menus, so the exclusion is still load-bearing'
    ).toBeGreaterThan(0);
  });

  it('gives every .dropdown-menu a class that can carry `show`', () => {
    const stuck = MENUS.filter((menu) => !/\bshow\b/.test(menu.classText)).map(
      (menu) => `${menu.file}:${menu.line}  <${menu.tag}>  ${menu.classText.replace(/\s+/g, ' ')}`
    );

    expect(
      stuck,
      'this menu can never open. `.dropdown-menu { display: none }` is lifted only by `.show`, ' +
        'and no Bootstrap JavaScript ships here to add it - drive the class from `RoomMenus`, ' +
        'the way the other seventeen do.'
    ).toEqual([]);
  });

  it('gives every data-bs-toggle trigger a real handler', () => {
    /*
      The other half, and the one that catches the same bug from the opposite side: a menu whose
      class CAN carry `show` is still dead if nothing ever flips the flag. `data-bs-toggle` is the
      attribute that used to do this, and here it does nothing at all.
    */
    const inert = TRIGGERS.filter((trigger) => !trigger.hasHandler).map(
      (trigger) => `${trigger.file}:${trigger.line}  <${trigger.tag}>`
    );

    expect(
      inert,
      'this control carries `data-bs-toggle` and no handler, so clicking it does nothing. ' +
        'The attribute is inert in this app - give it an `onclick` that drives `RoomMenus`.'
    ).toEqual([]);
  });
});
