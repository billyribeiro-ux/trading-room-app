// @vitest-environment jsdom
import { mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';

import Fixture from './class-clsx-equivalence.svelte';

/*
  THE PROOF THAT PHASE 4 IS SAFE, taken before the 160 conversions rather than after them.

  `svelte/best-practices` says in as many words: "use clsx-style arrays and objects in `class`
  attributes, instead of the `class:` directive". Following that meant rewriting 160 directives
  across 25 files — and this repository's contract tests assert on EXACT class strings read from the
  captured DOM, so the conversion is only mechanical if the two forms render the same string in the
  same ORDER.

  `svelte/class` calls them "equivalent" and shows the pair, but it does not state the order, and an
  order change here would not fail type-checking, would not fail the autofixer, and would fail a
  capture-fidelity assertion somewhere in the suite with a message about a class name rather than
  about ordering. So the question is settled by rendering both forms and comparing them, once, for
  every shape that actually occurs in this codebase.

  It stays as a permanent contract rather than being deleted after the conversion, because it is now
  also the thing that catches a future Svelte release changing clsx's join order under us.
*/

let component: Record<string, unknown> | null = null;

afterEach(() => {
  if (component) unmount(component);
  component = null;
  document.body.innerHTML = '';
});

const render = (props: { active: boolean; show: boolean; muted: boolean; expr: string }) => {
  component = mount(Fixture, { target: document.body, props });
  const classOf = (name: string) => {
    const element = document.querySelector(`[data-case="${name}"]`);
    if (!element) throw new Error(`fixture case "${name}" did not render`);
    // `getAttribute`, not `className`: the absent-attribute case is the point of case 7, and
    // `className` flattens that to an empty string.
    return element.getAttribute('class');
  };
  return classOf;
};

const CASES = ['one', 'two', 'false', 'expr', 'explicit', 'hyphen', 'bare'] as const;

describe('the class: directive and the clsx attribute render identically', () => {
  it.each([
    { name: 'all conditions true', active: true, show: true, muted: true },
    { name: 'all conditions false', active: false, show: false, muted: false },
    { name: 'mixed', active: true, show: false, muted: true }
  ])('$name', ({ active, show, muted }) => {
    const classOf = render({ active, show, muted, expr: 'from-an-expression' });

    for (const shape of CASES) {
      expect(
        classOf(`${shape}-clsx`),
        `shape "${shape}" must render the same class attribute in both forms`
      ).toBe(classOf(shape));
    }
  });

  it('puts the static classes FIRST and the conditional ones after, in written order', () => {
    /*
      The specific guarantee the conversion relies on. Asserting the literal string rather than only
      equality, because two forms could agree with each other and both disagree with the capture —
      and the capture is what `class="tab-pane fade show active"` has to keep matching.
    */
    const classOf = render({ active: true, show: true, muted: false, expr: 'x' });

    expect(classOf('two')).toBe('tab-pane fade show active');
    expect(classOf('two-clsx')).toBe('tab-pane fade show active');
  });

  it('omits the attribute entirely when there is nothing to emit', () => {
    // Case 7 has no static class. A stray `class=""` would be a new attribute in the rendered DOM.
    const classOf = render({ active: false, show: false, muted: false, expr: '' });

    expect(classOf('bare')).toBeNull();
    expect(classOf('bare-clsx')).toBeNull();
  });
});
