<script lang="ts">
  /*
    SoundCloud in the top bar — BOTH of the reference's items, which is why this is a component.

    ## The reference renders two, on complementary gates, and this room had one

    `app-room`'s navbar template `U4e` (bundle byte 2,484,831) puts them in adjacent slots, decoded
    by walking the consts array from `consts:[[` at byte 2,533,197 rather than by looking a slot
    number up:

    ```js
    H(22,i4e,18,4,"li",96)   // 96 ["title","Play music from SoundCloud for all",1,"nav-item","dropdown"]
     (23,o4e,4,3,"li",97)    // 97 ["title","Music is playing from SoundCloud for all",1,"nav-item"]

    O(22, isPresenter || isNonPresenterAdmin ? 22 : -1)                          // byte 2,488,593
    O(23, isPresenter || isNonPresenterAdmin || !scPlaying ? -1 : 23)            // byte 2,488,684
    ```

    Slot 22 is the presenter's dropdown — play, stop for all, stop for me. **Slot 23 is a LISTENER's
    single control**, rendered only to somebody who is not running the room while a track is playing,
    and its click is `doSoundCloudUserStop()` — the same command as the dropdown's third entry.

    `NAV-02`: only the dropdown existed here. `onstopsoundcloudforme` was reachable from the
    presenter's menu and from nowhere else, so a member who wanted the room's music off in their own
    browser had no control at all — they could only pull the master volume down, which also silences
    the presenter.

    ## Why one component with a variant rather than two files

    The two items share the icon, the "is it playing" class and the stop-for-me command, and the
    listener's arm is four elements. Splitting them would put `fa-soundcloud`, `text-white` and the
    `playing.gif` decision in two places, and the `playing.gif` decision is the one that has already
    had to be made twice in this repository. Same reasoning, and the same shape, as `MessageMenu`'s
    `variant`.
  */
  import type { RoomMedia } from '#lib/room/media.svelte.js';
  import type { RoomMenus } from '#lib/room/menus.svelte.js';

  let {
    /**
     * `presenter` is slot 22, `listener` is slot 23. A literal union rather than a boolean, because
     * a boolean named `isPresenter` would invite a call site to pass the viewer's role and get the
     * listener arm rendered for a presenter with the music off — the two gates are not each other's
     * negation, and the call site owns them.
     */
    variant,
    media,
    menus,
    ontoggletopmenu,
    onpromptforsoundcloud,
    onstopsoundcloud,
    onstopsoundcloudforme
  }: {
    variant: 'presenter' | 'listener';
    media: RoomMedia;
    menus: RoomMenus;
    ontoggletopmenu: (menu: 'soundcloud') => void;
    onpromptforsoundcloud: () => void;
    onstopsoundcloud: () => void;
    onstopsoundcloudforme: () => void;
  } = $props();
</script>

{#if variant === 'presenter'}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <li
    title="Play music from SoundCloud for all"
    class="nav-item dropdown"
    onclick={(event) => event.stopPropagation()}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <a
      id="soundcloudDropdown"
      data-bs-toggle="dropdown"
      aria-haspopup="true"
      aria-expanded={menus.soundcloud}
      class={[
        'nav-link dropdown-toggle d-flex align-items-center',
        { 'text-white': media.soundCloudPlaying }
      ]}
      onclick={() => ontoggletopmenu('soundcloud')}
    >
      <i class="fab fa-2x fa-soundcloud"></i>
      <span class="ml-2">
        <span class="caret"></span>
        <!--
          THE ICON FORM: upstream renders `/assets/images/playing.gif` here and that asset is
          not in this repository, so the faithful transcription rendered a BROKEN image in the
          navbar on every play. Same case, and same resolution, as `benzinga-logo.png` in
          `RoomSidebar.svelte`. `fa-volume-up` is not a pick - it is what the bar this markup came
          out of already uses for "audio is on", on the volume dropdown's own trigger.

          Knowingly still: the reference's indicator animates and this one does not. FA 5.8.1
          ships here and its only animations are `fa-spin`/`fa-pulse`, both spinners meaning
          "working"; FA6's `fa-beat` would fit and does not exist in 5.8.1, so it would have
          been a class with no effect. Restore the animation by adding the asset, not by
          inventing a keyframe. Enforced by `img-dimensions-contract.test.ts`.

          Const 169 is the image both arms would use — `["src","/assets/images/playing.gif",2,
          "max-height","25px"]`, byte 2,543,310 — so the listener arm below wears the same
          substitute for the same reason rather than a second answer to one question.
        -->
        {#if media.soundCloudPlaying}
          <i class="fas fa-volume-up ml-1" title="Playing"></i>
        {/if}
      </span>
    </a>
    <ul
      aria-labelledby="soundcloudDropdown"
      data-bs-popper={menus.soundcloud ? 'static' : undefined}
      class={['dropdown-menu dropdown-menu-end soundcloud-options', { show: menus.soundcloud }]}
      style={menus.soundcloud ? 'display: block;' : undefined}
    >
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <li class="nav-item" onclick={onpromptforsoundcloud}>
        <i class="fa fa-play-circle"></i> Play a track or playlist from SoundCloud
      </li>
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <li class="nav-item" onclick={onstopsoundcloud}>
        <i class="fa fa-square"></i><i class="fa fa-users"></i> Stop Playing For All
      </li>
      <li class="divider"></li>
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <li class="nav-item" onclick={onstopsoundcloudforme}>
        <i class="fa fa-square"></i> Stop Playing For Me
      </li>
    </ul>
  </li>
{:else}
  <!--
    NAV-02 — the listener's copy, `o4e` at bundle byte 2,478,748, read whole:

    ```js
    function o4e(t,n){ … d(0,"li",97)(1,"a",176), x("click", () => doSoundCloudUserStop()),
                       T(2,"i",166)(3,"img",169), u()() …
                       z("ngClass", ct(1, YB, e.scPlaying)) }
    176 ["id","cssSoundCloudIcon","id","soundcloudDropdown","aria-haspopup","true",
         "aria-expanded","false",1,"nav-link","d-flex","align-items-center",3,"click","ngClass"]
    166 [1,"fab","fa-2x","fa-soundcloud"]
    YB = t => ({ "text-white": t })
    ```

    **Const 176 carries the `id` attribute TWICE** — `cssSoundCloudIcon` and then `soundcloudDropdown`
    — and the SECOND is the one that survives. This paragraph said the opposite until it was
    measured against Angular's own `setUpAttributes`; the measurement, and why the two arms can share
    an id safely, are in `navbar-decoded-rows-contract.test.ts`, which is what asserts it.

    `aria-haspopup`/`aria-expanded` come with that const and are **deliberately not worn here**. They
    are the dropdown's attributes, carried over by whoever copied the const, and this element opens
    nothing: its whole behaviour is one click that stops the track for this browser. Announcing a
    popup that does not exist is the same lie as a control whose only effect is changing its label.

    `text-white` is unconditional rather than bound. `ngClass` binds it to `scPlaying`, and the
    caller's gate is `media.soundCloudPlaying` — the same value — so a binding here would be a
    derivation that can only ever be true, which is the shape this repository removes rather than
    writes.

    ## What its absence cost, and the one term this room drops

    `onstopsoundcloudforme` already existed and was reachable from ONE place: the presenter's third
    dropdown entry. A member hearing the room's music had no way to stop it in their own browser —
    only the master volume, which silences the presenter along with it.

    `isNonPresenterAdmin` is the term this room does not carry. It is a role the server models
    (`routes/+page.server.ts:289`) and does not thread into the navbar, and the presenter half of
    this bar is already one `isPresenter` block rather than the reference's five-term conditions —
    the divergence `room-navbar-contract.test.ts` records and asserts. So the caller's gate is the
    complement of that one rule rather than of the reference's three-term one.
  -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <li title="Music is playing from SoundCloud for all" class="nav-item">
    <!--
      The label is ANSWERED rather than ignored now: the reference's anchor holds two icons and no
      text (`T(2,"i",166)(3,"img",169)`), so `aria-label` below is what a screen reader reads, and
      the `svelte-ignore` this comment used to justify is gone with the warning it silenced.
    -->
    <!--
      OURS: const 176's anchor has no href, no text and no label, so upstream a keyboard user cannot
      reach the only control that stops the room's music for them alone. The wording is the one the
      presenter's own entry for the same handler uses, and the contract asserts all three so they
      cannot be dropped later as "not in the reference".
    -->
    <a
      id="soundcloudDropdown"
      role="button"
      tabindex="0"
      aria-label="Stop Playing For Me"
      class="nav-link d-flex align-items-center text-white"
      onclick={onstopsoundcloudforme}
    >
      <i class="fab fa-2x fa-soundcloud"></i>
      <i class="fas fa-volume-up ml-1" title="Playing"></i>
    </a>
  </li>
{/if}
