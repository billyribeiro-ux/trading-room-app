<script lang="ts">
  /*
    A FIXTURE, and its only consumer is `class-clsx-equivalence.test.ts`.

    It exists because Phase 4 of the decomposition converts 160 `class:` directives to clsx-style
    `class` attributes across 25 files, and this repository's contract tests assert on EXACT class
    strings taken from the capture. `svelte/best-practices` says to prefer the attribute, and
    `svelte/class` says the two forms are "equivalent" — but equivalent in WHICH ORDER is the
    question that decides whether 160 mechanical edits are safe or whether they silently rewrite
    every rendered class attribute in the room.

    That question is not answerable by reading the docs, so it is answered by rendering both forms
    and comparing. Each pair below is one shape that actually occurs in this codebase.
  */
  interface Props {
    active: boolean;
    show: boolean;
    muted: boolean;
    expr: string;
  }

  let { active, show, muted, expr }: Props = $props();
</script>

<!-- 1. static class + ONE directive — by far the most common shape here (55 of `class:active`). -->
<div data-case="one" class="nav-link" class:active></div>
<div data-case="one-clsx" class={['nav-link', { active }]}></div>

<!-- 2. static class + TWO directives, order preserved as written. -->
<div data-case="two" class="tab-pane fade" class:show class:active></div>
<div data-case="two-clsx" class={['tab-pane fade', { show, active }]}></div>

<!-- 3. a directive whose condition is FALSE — proves nothing stray is emitted. -->
<div data-case="false" class="btn" class:muted></div>
<div data-case="false-clsx" class={['btn', { muted }]}></div>

<!-- 4. an EXPRESSION class beside a directive, which is the merge case that needs most care. -->
<div data-case="expr" class={expr} class:active></div>
<div data-case="expr-clsx" class={[expr, { active }]}></div>

<!-- 5. a directive with an explicit expression rather than the shorthand. -->
<div data-case="explicit" class="icon" class:spin={show && !muted}></div>
<div data-case="explicit-clsx" class={['icon', { spin: show && !muted }]}></div>

<!-- 6. a hyphenated class name, which the object form has to quote. -->
<div data-case="hyphen" class="cell" class:text-white={active}></div>
<div data-case="hyphen-clsx" class={['cell', { 'text-white': active }]}></div>

<!-- 7. NO static class at all — the attribute must not appear when everything is falsy. -->
<div data-case="bare" class:active></div>
<div data-case="bare-clsx" class={{ active }}></div>
