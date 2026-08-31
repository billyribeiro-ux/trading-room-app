<script lang="ts">
  /*
    THE COG ON A MAIN TAB — the notes one and the files one, which were two different controls.

    ## What this component is, in the reference

    Two sub-templates that are the same eight instructions with two constants swapped:

    ```js
    function KCe(t,n){ const e=Y(); d(0,"div",15)(1,"span",53), T(2,"i",54), u(),
      d(3,"ul",55)(4,"li",56), x("click",function(){return D(e),E(g().newNote())}),
      d(5,"a",57), T(6,"i",58), v(7," New Note"), u()()()() }        // byte 1,916,736
    function ZCe(t,n){ const e=Y(); d(0,"div")(1,"span",66), T(2,"i",54), u(),
      d(3,"ul",67)(4,"li",56), x("click",function(){return D(e),E(g().newFile())}),
      d(5,"a",57), T(6,"i",58), v(7," Upload File"), u()()()() }      // byte 1,918,232
    ```

    with `app-presentationarea`'s consts (table at 1,994,264) reading

    * 53 `["id","dropdownMenuNotes","data-bs-toggle","dropdown","aria-expanded","false",1,"dropdown-toggle"]`
    * 66 `["id","dropdownMenuFiles","data-bs-toggle","dropdown","aria-expanded","false",1,"dropdown-toggle"]`
    * 55 `["aria-labelledby","dropdownMenuButton",1,"dropdown-menu"]`
    * 67 `["aria-labelledby","dropdownMenuFiles",1,"dropdown-menu"]`
    * 54 `[1,"fas","fa-cog"]`, 15 `[1,"dropdown"]`

    Neither span carries a click handler: the reference hands the open/close to Bootstrap's
    `data-bs-toggle="dropdown"`, and both cogs sit inside a `<li>` whose own `x("click", …)` calls
    `onMainTabChange`. So upstream the two cogs behave IDENTICALLY — open the menu, and select the
    tab they sit on — because there is exactly one implementation and it is not in the template.

    ## Why it is a component here, and it is not tidiness

    This room has no Bootstrap dropdown behaviour, so each cog was hand-wired in `MainTabStrip`, and
    the two hand-wirings had DIVERGED. Measured 2026-08-31, before this file existed:

    | | notes cog | files cog |
    | --- | --- | --- |
    | selects its own tab | no — `stopPropagation()` suppressed the anchor that would have | yes, by re-setting `mainTab` by hand |
    | closes the sibling menu | no | yes, `menus.set('notes', false)` |

    So a member clicking the notes cog stayed on whichever tab they were on and was shown a menu
    belonging to a tab they could not see, while the files cog did the right thing twice over. That
    is one interaction with two implementations, and a second implementation is what drifts.

    **It is one implementation now, and the symmetry is structural rather than remembered**: the
    sibling menu is derived from `menu` below, so a cog cannot be added that forgets to close the
    other one. `main-tab-strip-gates.svelte.test.ts` drives both and asserts they agree.

    ## `onkeydown` below CANNOT FIRE, and that is recorded rather than quietly kept

    `MTS-05` gave every tab anchor in `MainTabStrip` a roving `tabindex`, because those anchors had
    `onkeydown` handlers no keyboard could ever reach. **This cog has the same defect and it is not
    repaired here.** A `<span>` with no `tabindex` is not focusable, so the handler is unreachable;
    and the only way to make it focusable is `tabindex="0"` plus a role — on an element that sits
    INSIDE `MainTabStrip`'s `<a role="tab">`, which nests one interactive control in another and is
    invalid whichever role is chosen.

    The reference has exactly this shape (`span[data-bs-toggle="dropdown"]` inside the tab anchor)
    and delegates the keyboard to Bootstrap, whose source is not in the bundle — so there is nothing
    to transcribe and no rendered capture to check a repair against. The handler stays because
    deleting it would remove the only statement of what the key is SUPPOSED to do, and a note is
    cheaper than rediscovering the constraint. `main-tab-strip-gates.svelte.test.ts` carries the
    measurement; the row is `MTS-05`, closed HALF BUILT for exactly this half.

    ## What it deliberately does NOT own

    The GATE. Upstream instantiates the notes cog only for `isP || user.canEditNotes` (byte
    2,016,713) and the files cog only for `isP` (byte 2,017,076); both live at the call site, where
    the values are, and `{#if}` there means an ungated viewer gets no element at all rather than a
    hidden one — the distinction `main-tab-strip-contract.test.ts` exists to defend.
  */
  import type { RoomMenus } from '#lib/room/menus.svelte.js';

  interface Props {
    /** `id` on the cog, and what the menu's `aria-labelledby` points at. Const 53 / 66. */
    id: string;
    /**
     * `aria-labelledby` on the `<ul>`, which is NOT always this cog's id.
     *
     * Const 55 says `dropdownMenuButton` for the notes menu and const 67 says `dropdownMenuFiles`
     * for the files one, so the notes menu is labelled by an element that does not exist in the
     * captured page. Transcribed rather than repaired: it is the reference's own value, and
     * `MainTabStrip` passes it explicitly for exactly that reason.
     */
    labelledBy: string;
    /**
     * `[1,"dropdown"]` for the notes cog (const 15); the files cog's wrapper has NO class at all.
     *
     * Optional with no default, so an omitted value omits the attribute. A `''` default would
     * render `class=""` where `ZCe` opens a bare `d(0,"div")` — a difference no styling notices and
     * every markup diff against the capture does.
     */
    wrapperClass?: string;
    /** Which flag on {@link RoomMenus} this cog owns. The OTHER one is what it closes. */
    menu: 'notes' | 'files';
    menus: RoomMenus;
    /**
     * Select the tab this cog sits on — `onMainTabChange(…)` on the enclosing `<li>`.
     *
     * A callback and not a `$bindable` `mainTab`, because this component has no business knowing
     * the tab NAMES: it is told what selecting means and calls it.
     */
    onselecttab: () => void;
    /**
     * The `<li><a>` the menu holds, mounted into the rendered `<ul>`.
     *
     * `RoomNotes` owns both link builders and each returns its own teardown, which is the
     * `{@attach}` contract. Typed as the attachment it is rather than as a bare function so a
     * call site cannot pass something that never cleans up.
     */
    mountItem: (menu: HTMLUListElement) => (() => void) | void;
  }

  let { id, labelledBy, wrapperClass, menu, menus, onselecttab, mountItem }: Props = $props();

  /**
   * The other cog's flag. DERIVED, so the pair cannot be wired asymmetrically by hand again.
   *
   * `$derived` and not a plain `const`: `menu` is a prop, and a bare `const` off a prop captures the
   * value this component mounted with. Both call sites pass a literal today, so it would work and
   * would go on working right up until one of them stopped — which is the class of bug that reads as
   * "it was fine yesterday". `svelte-check` says so too (`state_referenced_locally`).
   */
  const sibling = $derived(menu === 'notes' ? 'files' : 'notes');

  function open(): void {
    menus.set(sibling, false);
    onselecttab();
    menus.toggle(menu);
  }
</script>

<div class={wrapperClass}>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <span
    {id}
    data-bs-toggle="dropdown"
    aria-expanded={menus[menu]}
    class="dropdown-toggle"
    onclick={(event) => {
      event.preventDefault();
      event.stopPropagation();
      open();
    }}
    onkeydown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') open();
    }}
  >
    <i class="fas fa-cog"></i>
  </span>
  <ul
    aria-labelledby={labelledBy}
    class={['dropdown-menu', { show: menus[menu] }]}
    {@attach (list: HTMLUListElement) => mountItem(list)}
  ></ul>
</div>
