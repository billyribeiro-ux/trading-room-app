<script lang="ts">
  import { nextFollowChatFontSize, type FollowChatStylePaneProps } from '#lib/follow-chat-style.js';

  /**
   * The follow-chat STYLE editor — `#user-modal`'s body when the target is already followed.
   *
   * The props, why they are `$bindable`, why this is a component at all, and FCS-1 — the one rule
   * here that is not a transcription — are all in `#lib/follow-chat-style.js`, beside the code they
   * govern.
   */
  let { style = $bindable(), onreset, onsave, ontestsound }: FollowChatStylePaneProps = $props();

  /*
    ── THE FOUR STATIC `value` ATTRIBUTES CANNOT BE TRANSCRIBED, AND THE COMPILER IS THE EVIDENCE ───

    Each of the four colour inputs carries one in the reference, between `name` and `id`:

    ```js
    ["type","color","name","follow-chat-text-color","value","followChatStyle.color",
     "id","follow-chat-text-color",1,"form-check-input",3,"ngModelChange","ngModel"]   // 2,093,187
    ```

    They are a DEFECT upstream — a static attribute where a binding was meant, so every one of those
    inputs is served with the literal text of an expression as its value until Angular's `ngModel`
    overwrites it. The four in `#user-settings-modal` (`chatStyle.*`, byte 2,261,183) are the same
    mistake again.

    **Transcribing them was attempted on 2026-09-01 and Svelte refuses it:**

        ERROR FollowChatStylePane.svelte 28:11 "Attributes need to be unique"
        https://svelte.dev/e/attribute_duplicate

    `value` and `bind:value` are the same attribute to the Svelte compiler, so the pair Angular
    accepts is unwritable here — not undesirable, unwritable. Angular treats `value="…"` and
    `[(ngModel)]` as two separate things and lets the second win; Svelte has one slot.

    The binding is the half that does something, so the binding is what stays. This is a limit of the
    target language rather than a judgement about the reference, and it is recorded with the error
    that establishes it so nobody re-attempts it from the const table alone.
  */
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
        <!--
          FCS-1 — `value` + `oninput`, never `bind:value`. Svelte's numeric binding writes `null`
          for an empty box, and `null + 1` is `1`, so clearing this field rendered the followed
          member's username at one pixel and saved it. `nextFollowChatFontSize` carries the
          measurement and the three `message-styles.ts` lines it lands on.
        -->
        <input
          type="number"
          name="follow-chat-text-size"
          id="follow-chat-text-size"
          class="form-check-input"
          value={style.fontSize}
          oninput={(event) =>
            (style.fontSize = nextFollowChatFontSize(event.currentTarget.value, style.fontSize))}
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
          Chat sound <span>{style.playSound ? 'on' : 'off'}</span>
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

        Read at bundle byte 2,070,265: `d(36,"strong",120), v(37,"Username:")`, and const 120 —
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
