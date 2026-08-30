<script lang="ts">
  /**
   * `o4e`, bundle byte 2,478,748 — the ONE SoundCloud control upstream renders for a viewer.
   *
   * Its sibling is `SoundCloudMenu.svelte` (the presenter's dropdown, `i4e`), whose docblock records
   * why the two are separate components and how their gates relate. This half exists because of
   * NAV-02, and its whole argument is below.
   */
  let {
    onstopsoundcloudforme
  }: {
    onstopsoundcloudforme: () => void;
  } = $props();
</script>

<!--
  ── NAV-02 — A MEMBER COULD NOT TURN THE PRESENTER'S MUSIC OFF ────────────────────────────────

  ```js
  function o4e(t,n){ … d(0,"li",97)(1,"a",176),
      x("click", () => g(2).doSoundCloudUserStop()), T(2,"i",166)(3,"img",169) … }  // 2,478,748
   97 ["title","Music is playing from SoundCloud for all",1,"nav-item"]
  176 ["id","cssSoundCloudIcon","id","soundcloudDropdown","aria-haspopup","true",
       "aria-expanded","false",1,"nav-link","d-flex","align-items-center",3,"click","ngClass"]
  169 ["src","/assets/images/playing.gif",2,"max-height","25px"]
  ```

  `doSoundCloudUserStop` is the SAME method the presenter's "Stop Playing For Me" entry
  calls — it silences the stream in this browser and touches nobody else's. And that entry is the
  whole finding: it lives inside a dropdown gated on `isPresenter`, so the only control in the room
  that stops room-wide music for one listener was one a listener never saw. A member who did
  not want the presenter's soundtrack had the master volume slider, which also silences the
  presenter. Argued in full as NAV-02 in `docs/decoded/room-surface-audit-2026-08-30.md`.

  ## WHERE IT IS MOUNTED IS PART OF THIS COMPONENT'S CORRECTNESS

  It was first written INSIDE `RoomNavbar`'s `{#if isPresenter}` block. A control whose own gate is
  `not a presenter`, nested in a block that renders only FOR a presenter, is unreachable in both
  directions at once: no member ever saw it, and the only browser that evaluated its gate was the
  one it excludes. The defect it was built to fix — a member with no way to silence room-wide music
  — survived the fix, and every source assertion about this component was green throughout, because
  the component was correct and its mount was not.

  It is mounted BEFORE that block rather than after, and the row order is identical either way: for
  a member the presenter block renders nothing, so this is still slot 23's place in the row; for a
  presenter this renders nothing. `navbar-viewer-controls-contract.test.ts` asserts both directions
  by rendering, which is the only instrument that can tell a mounted-but-unreachable control from a
  missing one.

  The `<li>` carries the title and the `<a>` carries the click, which is what consts 97 and 176
  say rather than a choice. The duplicate `id` on const 176 is upstream's own; only the second
  survives in a browser, and it is the same id `SoundCloudMenu`'s toggle carries — safe because the
  two gates are exact negations and never both hold, which is the fact that made these two files
  rather than three.
  `role`/`tabindex`/`onkeydown`/`aria-label` are OURS, because the capture puts a click on an
  anchor with no href, no text and no label: that is neither focusable, keyboard-reachable, nor
  announceable. The label is the wording the presenter's own entry for the SAME handler uses —
  "Stop Playing For Me" — rather than the `<li>` title, which names the situation ("Music is
  playing…") and not the action.

  `z("ngClass", ct(1, YB, e.scPlaying))` with `YB = t => ({"text-white": t})` is a STATIC class
  here and that is not a simplification: this element renders only while `scPlaying`, so the map's
  one entry is always on. A binding to a value that cannot be false is a control that lies about
  having a second state.

  `playing.gif` is not in this repository and this is the second element to want it; the note in
  `SoundCloudMenu.svelte` records that finding and why `fa-volume-up` rather than an invented
  keyframe. Pointed at rather than restated.
-->
<li title="Music is playing from SoundCloud for all" class="nav-item">
  <a
    role="button"
    tabindex="0"
    aria-label="Stop Playing For Me"
    id="soundcloudDropdown"
    aria-haspopup="true"
    aria-expanded="false"
    class="nav-link d-flex align-items-center text-white"
    onclick={onstopsoundcloudforme}
    onkeydown={(event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      onstopsoundcloudforme();
    }}
  >
    <i class="fab fa-2x fa-soundcloud"></i>
    <i class="fas fa-volume-up ml-1" title="Playing"></i>
  </a>
</li>
