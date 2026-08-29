/**
 * A PROBE, not a feature. It answers one question on the real compiler: what does a caller get when
 * a function returns a `$derived` **by value** in an object literal?
 *
 * The question is load-bearing rather than academic. `createRoom` ends with a `return { … } as const`
 * carrying `rosterViewer`, a `$derived` over `isPresenter` and `media.limitedPresenter` — both of
 * which change mid-session, because `giveMicScreen` elevates a member to presenter. The Svelte
 * compiler flags that line `state_referenced_locally`; this proves what the flag means in practice
 * rather than arguing it from the docs.
 */
export function makeProbe() {
  let count = $state(0);
  const doubled = $derived(count * 2);

  return {
    /** By value — the shape `createRoom` used for `rosterViewer`. */
    snapshot: doubled,
    /** Through a getter — live, because the read happens at access time. */
    get live() {
      return doubled;
    },
    /** Through a thunk — live, and the shape `createRoom` already uses for `gates`. */
    thunk: () => doubled,
    bump: () => {
      count += 1;
    }
  };
}
