<script lang="ts">
  import type { FollowChatStyle } from '#lib/types.js';

  /**
   * The follow-chat STYLE editor — `#user-modal`'s body when the target is already followed.
   *
   * ## Why it moved out of `ModalHost.svelte`, which is the only reason it is a component
   *
   * The Admin Notes list arrived in that file on 2026-08-29 and took it 27 lines past its ceiling.
   * `source-size-contract.test.ts` answers that with one instruction and it is not "raise the
   * number": *extract a slice into a module or component*. This is the largest slice of the user
   * modal that nothing else in it reads — 128 lines whose only outside dependencies were the style
   * object and three handlers, which is what made it the right one to take rather than the first
   * one found.
   *
   * Nothing here is rewritten. The markup is the same markup, re-indented, with `followChatStyle`
   * renamed to the prop and the three inline handlers lifted to callbacks — so this extraction
   * cannot have changed what the panel renders, and the browser suite is the check that it did not.
   *
   * ## `$bindable`, and not a mutated plain prop
   *
   * Every input here is `bind:value={style.x}`, which MUTATES the object the parent owns. Svelte's
   * own guidance is explicit — mutation through a normal prop is "strongly discouraged" and warns at
   * runtime when it detects a component writing to state it does not own — so the prop is declared
   * `$bindable()` and the parent binds. The alternative, an `onchange` per field, would be five
   * callbacks and a copy of the object for no gain.
   */
  interface Props {
    style: FollowChatStyle;
    /** Back to the room's defaults. The parent owns what "default" means; this only asks. */
    onreset: () => void;
    onsave: () => void;
    /** `test-follow-sound` — plays the pling, and is disabled while the sound is off. */
    ontestsound: () => void;
  }

  let { style = $bindable(), onreset, onsave, ontestsound }: Props = $props();
</script>

<div class="py-2">
  <div class="p-2 d-flex align-items-end justify-content-between">
    <div class="flex-fill">
      <div title="Chat Color Mode" class="pb-2">
        <i class="fas fa-wrench"></i>
        <span class="pl-2">Edit chat text colors &amp; size:</span>
      </div>
      <div class="ml-5">
        <input
          type="color"
          name="follow-chat-text-color"
          id="follow-chat-text-color"
          class="form-check-input"
          bind:value={style.color}
        />
        <label for="follow-chat-text-color" class="form-check-label ml-4 pl-2"> Text Color </label>
      </div>
      <div class="ml-5">
        <input
          type="color"
          name="follow-chat-username-color"
          id="follow-chat-username-color"
          class="form-check-input"
          bind:value={style.usernameColor}
        />
        <label for="follow-chat-username-color" class="form-check-label ml-4 pl-2">
          Username Color
        </label>
      </div>
      <div class="ml-5">
        <input
          type="color"
          name="follow-chat-bg-color"
          id="follow-chat-bg-color"
          class="form-check-input"
          bind:value={style.bgColor}
        />
        <label for="follow-chat-bg-color" class="form-check-label ml-4 pl-2">
          Background Color
        </label>
      </div>
      <div class="ml-5">
        <input
          type="color"
          name="follow-chat-ticker-color"
          id="follow-chat-ticker-color"
          class="form-check-input"
          bind:value={style.tickerColor}
        />
        <label for="follow-chat-ticker-color" class="form-check-label ml-4 pl-2">
          Ticker Color
        </label>
      </div>
      <div class="ml-5">
        <input
          type="number"
          name="follow-chat-text-size"
          id="follow-chat-text-size"
          class="form-check-input"
          bind:value={style.fontSize}
        />
        <label for="follow-chat-text-size" class="form-check-label ml-4 pl-2"> Text Size </label>
      </div>
      <div class="ml-5 text-mode-box">
        <input
          type="checkbox"
          name="follow-chat-donot-disturb"
          value="Chat Sound for followed user"
          id="follow-chat-donot-disturb"
          class="form-check-input"
          bind:checked={style.playSound}
        />
        <label for="follow-chat-donot-disturb" class="form-check-label">
          Chat sound {style.playSound ? 'on' : 'off'}
        </label>
      </div>
    </div>
  </div>
  <div
    class="follow-user-example"
    style:background-color={style.bgColor}
    style:color={style.color}
    style:font-size={`${style.fontSize}px`}
  >
    <div>
      <!--
        UIM-16 (second half) — `fw-bold` on this `<strong>`, which is not the tautology it looks
        like.

        Read at bundle byte 2,070,269: `d(36,"strong",120), v(37,"Username:")`, and const 120 —
        walked out of the user-info modal's own consts table at 2,087,748 — is `[1,"fw-bold"]`.
        A bare `<strong>` was here.

        It matters because this preview is styled by the follow-chat colours around it and sits
        inside a room stylesheet that resets typography: Bootstrap's `fw-bold` sets
        `font-weight: 700 !important`, which is stronger than the browser's `bolder` default for
        `<strong>` and survives any rule that flattens it. The reference put the utility class
        there deliberately — every other `<strong>` in this component is bare — and the preview's
        whole job is to show the presenter what a followed member's line will look like. A preview
        that is a weight lighter than the real thing is a preview that lies quietly.

        The first half of UIM-16 (a gravatar fallback for the header avatar) was REFUTED before
        this was built and is not reproduced; see the audit row.
      -->
      <div style:color={style.usernameColor}><strong class="fw-bold">Username:</strong></div>
      This is the followed user message example with
      <span class="stockColor" style:color={style.tickerColor}>$TICKER</span>
      color!
    </div>
    <button
      class="btn btn-dark btn-sm"
      disabled={!style.playSound}
      title={style.playSound ? 'Chat sound is on.' : 'Chat sound is off.'}
      onclick={ontestsound}
    >
      <span
        class={[
          'fa',
          {
            'fa-volume-up': style.playSound,
            'fa-volume-mute': !style.playSound
          }
        ]}
      ></span>
    </button>
  </div>
  <div class="text-right">
    <button type="button" class="btn btn-outline-danger mx-1" onclick={onreset}> Reset </button>
    <button type="button" class="btn btn-outline-light" onclick={onsave}> Save changes </button>
  </div>
</div>
