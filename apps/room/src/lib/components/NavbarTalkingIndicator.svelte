<script lang="ts">
  import type { TalkingUser } from '#lib/room/media.svelte.js';

  /**
   * `NPe` and `LPe` — the navbar's talking indicator, both arms, and the image that flips between them.
   *
   * ## Why it is its own component
   *
   * `RoomNavbar.svelte` sat at 1,171 lines against a ceiling of 1,172 when `G08` was built, and
   * `source-size-contract`'s instruction is *extract rather than raise*. It is also the third time
   * this bar has produced a natural seam — `NavbarRecIndicator` and `NavbarSoundCloud` came out of it
   * the same way — and upstream agrees with the split: `NPe` (byte 2,473,780) and `LPe` are two
   * sibling sub-templates, not markup inline in the navbar's own create block.
   *
   * ## `G08` — the idle waveform, BUILT, and the earlier refusal was wrong about the default
   *
   * The reference flips one image on a server signal:
   *
   * ```js
   * H(8,IPe,1,0,"img",146)(9,OPe,1,0)          // the two arms
   * O(8, e.mediaService.presenterTalking ? 8 : 9)                        // byte 2,473,920
   * 146 ["id","talkingLevelsImg","src","/assets/images/talking.gif",1,"talkingWaveform","animated","fadeIn"]
   * 148 ["id","nolevelsImg","src","/assets/images/notalking.png",1,"talkingWaveform","animated","fadeIn"]
   * ```
   *
   * This room rendered **only the first arm**, hard-coded, and a note here argued that building the
   * branch meant *"an image that can never show or one that always shows, and neither is the
   * reference"*. **That was wrong, and measuring `presenterTalking` end to end is what showed it.**
   * It occurs ten times in the bundle and every one was read:
   *
   * - initialised **`!1`** at bytes 1,114,654 and 1,129,852 — so the reference's own default is the
   *   FLAT LINE, not the waveform this room was showing unconditionally;
   * - set `!0` by `guiEventBus.subscribe("presenterTalking", …)` and back to `!1` by
   *   `presenterNotTalking` (1,117,020–1,117,129);
   * - both emitted by the SERVER command switch at byte 1,014,971, one `case` each, payload-free.
   *
   * So the signal is an ordinary room command, the two commands are named in the dump, and the
   * default is knowable. `RoomMedia.presenterTalking` and the two receivers in `events.svelte.ts`
   * complete it, and the branch is now the reference's branch rather than a choice.
   */
  interface Props {
    /** `mediaService.talkingUsers` — a peer with an OPEN microphone, which is what upstream means. */
    talkingUsers: readonly TalkingUser[];
    /** The room's own gate on whether the cluster shows at all. */
    anyoneTalking: boolean;
    /** `mediaService.presenterTalking` — the server's audio-activity flag. Defaults FALSE, as upstream. */
    presenterTalking: boolean;
    /** `LPe`'s text — " ( No one is speaking )" upstream, supplied by the page. */
    noSpeakerText: string;
    onmutetalkinguser: (user: TalkingUser) => void;
  }

  const { talkingUsers, anyoneTalking, presenterTalking, noSpeakerText, onmutetalkinguser }: Props =
    $props();
</script>

{#if anyoneTalking && talkingUsers.length > 0}
  <li class="nav-item talkingIndicator animated fadeIn">
    <!-- svelte-ignore a11y_missing_attribute -->
    <a class="talking">
      <i class="icon fa fa-microphone"></i>
      &nbsp;
      <span class="talking-string">
        <!--
          G04 — `d(0,"span",147)` at byte 2,473,449, const 147 `[3,"click"]`: each name is a
          CONTROL, bound to `muteTalkingUserDialog(o)`. Ours was a bare `<span>`, so a
          presenter watching one member hold the floor had no way to take it back short of
          opening the roster and finding them — and `muteAllNonAdmins`, which is built, is
          all-or-nothing.

          The comma and the surrounding spaces are `ns(" ", i > 0 ? "," : "", " ", name, " ")`
          and were already right; only the handler was missing. `role`/`tabindex`/`onkeydown`
          are OURS, because the capture puts a click on a bare span and a span is neither
          focusable nor keyboard-reachable — the same addition, for the same reason, as the
          trade-order span in `MessageBody`.

          The gate is inside `muteTalkingUserDialog`, not here: upstream's whole method body
          is behind `globals.user.isPresenter`, so a member clicking a name gets no dialog
          rather than a dialog whose command is refused.
        -->
        {#each talkingUsers as talkingUser, index (talkingUser.userID)}
          <span
            role="button"
            tabindex="0"
            onclick={() => onmutetalkinguser(talkingUser)}
            onkeydown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              onmutetalkinguser(talkingUser);
            }}
          >
            {index > 0 ? ',' : ''}
            {talkingUser.mediaValue.name}
          </span>
        {/each}
      </span>
      &nbsp;
      <!--
        `O(8, presenterTalking ? 8 : 9)`, byte 2,473,920 — both arms, as the dump has them.

        The refusal that stood here is quoted and retired in this file's header: it said the branch
        could only be "an image nothing can ever show, or one that always shows". The signal is an
        ordinary room command with a knowable default, and reading all ten occurrences of
        `presenterTalking` is what established that.
      -->
      {#if presenterTalking}
        <img
          id="talkingLevelsImg"
          src="/assets/images/talking.gif"
          class="talkingWaveform animated fadeIn ng-star-inserted"
          alt=""
          width="53"
          height="60"
        />
      {:else}
        <!-- Const 148. Both assets ship in `static/assets/images/`; this arm had no consumer before. -->
        <img
          id="nolevelsImg"
          src="/assets/images/notalking.png"
          class="talkingWaveform animated fadeIn ng-star-inserted"
          alt=""
          width="53"
          height="60"
        />
      {/if}
    </a>
  </li>
{:else}
  <li class="nav-item talkingIndicator animated fadeIn">
    <!-- svelte-ignore a11y_missing_attribute -->
    <a>{noSpeakerText}</a>
  </li>
{/if}
