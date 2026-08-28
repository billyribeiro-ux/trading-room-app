<script lang="ts">
  import { calculateMessageMenuPosition } from '#lib/message-menu-position.js';
  import type { MessageAction } from '#lib/types.js';
  import type { MessageMenuAllows } from '#lib/message-behavior.js';

  /**
   * The kebab menu on a message — the trigger, the dropdown, and the twelve entries.
   *
   * ## Why it is a component
   *
   * It was 143 lines inside `RoomMessage.svelte`, and `altChatRender` needed a SECOND renderer
   * (`app-st-compactmessage`) whose menu is the same twelve entries with the same twelve gates. A
   * second copy of that is the duplication `room-message-chrome.ts` exists to prevent — twelve
   * entitlement gates written out twice, drifting silently, is the exact failure that put four
   * different answers behind one question before that type was written.
   *
   * So the menu moved once, and both renderers use it. Nothing about it changed in the move, and
   * that is asserted rather than claimed: `room-message-render.test.ts` pins all 18 captured kebabs
   * with their exact labels and source order, the `msgMenu dropright pt-1` class string and
   * `dropdown-menu users-dropdown-options`, and it was run green before and after.
   *
   * ## Everything positional came WITH it
   *
   * The two element refs and the popper placement effect are here rather than left behind, because
   * they exist only to position this dropdown: the trigger rect, the menu rect and the viewport are
   * the whole input, and `RoomMessage` never read any of them for anything else. Splitting a
   * component from the effect that measures it is how a ref goes stale.
   *
   * ## What it does NOT own
   *
   * The reaction PICKER. `Add Reaction` opens a popover that both the menu and the reaction pill can
   * raise, so which one is open is the renderer's state, not the menu's — the menu reports the click
   * through `onreactiontoggle` and is handed back the `aria-describedby` to render.
   */
  let {
    /** The twelve gates, already resolved. See `messageMenuAllows`. */
    allows,
    menuOpen,
    /**
     * Which of the three captured trigger classes to render. See {@link TRIGGER_CLASS}.
     */
    variant = 'regular',
    /** The background inversion the captured DOM puts on `.msgMenu`, or nothing. */
    style,
    /** Set only while the picker is open FROM this menu; the pill sets its own. */
    reactionPopoverId,
    onaction,
    ontoggle,
    onreactiontoggle
  }: {
    allows: MessageMenuAllows;
    menuOpen: boolean;
    variant?: MessageMenuVariant;
    style?: string;
    reactionPopoverId?: string;
    onaction: (action: MessageAction, event?: MouseEvent) => void;
    ontoggle: () => void;
    onreactiontoggle: () => void;
  } = $props();

  /**
   * The three trigger classes the capture uses, written out rather than composed.
   *
   * They are NOT variations on a theme and composing them from parts would invent a pattern the
   * reference does not have — read them side by side:
   *
   * ```
   * app-st-message                    msgMenu dropright pt-1
   * app-st-compactmessage, admin      msgMenu dropleft  float-right align-baseline
   * app-st-compactmessage, member     msgMenu dropright float-left  align-baseline
   * ```
   *
   * The compact pair MIRRORS: the admin row is laid out `flex-row-reverse` with everything floated
   * right, so its menu opens LEFT; the member row runs the other way. The regular renderer does not
   * mirror at all — it is `dropright` for both and carries `pt-1`, which neither compact one does.
   *
   * Pinned here in one lookup so a call site cannot pass a fourth. `room-message-render.test.ts`
   * asserts the first string against the captured DOM.
   */
  const TRIGGER_CLASS = {
    regular: 'msgMenu dropright pt-1',
    compactAdmin: 'msgMenu dropleft float-right align-baseline',
    compactMember: 'msgMenu dropright float-left align-baseline'
  } as const;

  type MessageMenuVariant = keyof typeof TRIGGER_CLASS;

  /**
   * `⠇ ` — U+2807, braille dots-123, and the trailing space is in the capture.
   *
   * Moved here with the markup rather than left as a prop: it is a literal of this menu and the two
   * renderers must not be able to disagree about it.
   */
  const KEBAB_TEXT = '\u2807 ';

  let menuTriggerElement: HTMLAnchorElement | null = null;
  let menuElement: HTMLDivElement | null = null;

  function hideMenuPosition() {
    if (!menuElement) return;
    menuElement.style.removeProperty('position');
    menuElement.style.removeProperty('inset');
    menuElement.style.removeProperty('margin');
    menuElement.style.removeProperty('visibility');
    menuElement.style.removeProperty('display');
    menuElement.style.removeProperty('transform');
    delete menuElement.dataset.popperPlacement;
  }

  function positionMenu() {
    if (!menuOpen || !menuTriggerElement || !menuElement) return;

    const triggerRect = menuTriggerElement.getBoundingClientRect();
    const menuRect = menuElement.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const { left, top, placement } = calculateMessageMenuPosition(triggerRect, menuRect, {
      width: viewportWidth,
      height: viewportHeight,
      devicePixelRatio: window.devicePixelRatio
    });

    menuElement.dataset.popperPlacement = placement;
    menuElement.style.cssText =
      `position: fixed; inset: 0px auto auto 0px; margin: 0px; visibility: visible; ` +
      `display: block; transform: translate3d(${left}px, ${top}px, 0px);`;
  }

  $effect(() => {
    if (!menuOpen) {
      hideMenuPosition();
      return;
    }

    if (menuElement) {
      menuElement.style.cssText =
        'position: fixed; inset: 0px auto auto 0px; visibility: hidden; display: block;';
    }
    const frame = window.requestAnimationFrame(positionMenu);
    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, true);
    const resizeObserver = new ResizeObserver(positionMenu);
    if (menuTriggerElement) resizeObserver.observe(menuTriggerElement);
    if (menuElement) resizeObserver.observe(menuElement);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', positionMenu);
      window.removeEventListener('scroll', positionMenu, true);
      resizeObserver.disconnect();
      hideMenuPosition();
    };
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
<a
  bind:this={menuTriggerElement}
  role="button"
  id="dropdownMenuLink"
  data-bs-toggle="dropdown"
  aria-haspopup="true"
  aria-expanded={menuOpen}
  class={TRIGGER_CLASS[variant]}
  {style}
  onclick={(event) => {
    event.stopPropagation();
    ontoggle();
  }}>{KEBAB_TEXT}</a
>
<div
  bind:this={menuElement}
  aria-labelledby="dropdownMenuLink"
  class={menuOpen
    ? 'dropdown-menu users-dropdown-options show'
    : 'dropdown-menu users-dropdown-options'}
>
  {#if allows.delete}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_missing_attribute -->
    <a class="dropdown-item" onclick={(event) => onaction('delete', event)}
      ><i class="fas fa-trash"></i>&nbsp;&nbsp;Delete Message</a
    >
    {#if allows.mute}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_missing_attribute -->
      <a class="dropdown-item" onclick={() => onaction('mute')}
        ><i class="fa fa-comment-slash"></i>&nbsp;&nbsp;Mute Chat for 24hrs</a
      >
    {/if}
    <div class="dropdown-divider"></div>
  {/if}
  {#if allows.user}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_missing_attribute -->
    <a class="dropdown-item" onclick={() => onaction('user')}
      ><i class="fas fa-user"></i>&nbsp;&nbsp;User Info</a
    >
  {/if}
  {#if allows.mention}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_missing_attribute -->
    <a class="dropdown-item" onclick={() => onaction('mention')}
      ><i class="fas fa-reply"></i>&nbsp;&nbsp;Mention</a
    >
  {/if}
  {#if allows.showAll}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_missing_attribute -->
    <a class="dropdown-item" onclick={() => onaction('show-all')}
      ><i class="fas fa-envelope-open"></i>&nbsp;&nbsp;Show message to all</a
    >
  {/if}
  {#if allows.report}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_missing_attribute -->
    <a
      data-bs-toggle="modal"
      data-bs-target="#alert-send-report-modal"
      class="dropdown-item"
      onclick={() => onaction('report')}
      ><i class="fas fa-chart-pie"></i>&nbsp;&nbsp;Alert Send Report
    </a>
  {/if}
  {#if allows.reply}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_missing_attribute -->
    <a
      data-bs-toggle="modal"
      data-bs-target="#replyModal"
      class="dropdown-item"
      onclick={() => onaction('reply')}><i class="fas fa-comment"></i>&nbsp;&nbsp;Reply</a
    >
  {/if}
  {#if allows.answered}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_missing_attribute -->
    <a class="dropdown-item" onclick={() => onaction('answered')}
      ><i class="fas fa-check"></i>&nbsp;&nbsp;Mark Answered
    </a>
  {/if}
  {#if allows.reaction}
    <a
      {...{
        container: 'body',
        autoClose: 'outside',
        popoverClass: 'popOverDiv'
      } as Record<string, string>}
      class="dropdown-item"
      onclick={(event) => {
        event.stopPropagation();
        onreactiontoggle();
      }}
      aria-describedby={reactionPopoverId}
    >
      <i class="far fa-smile"></i>&nbsp;&nbsp;Add Reaction
    </a>
  {/if}
  {#if allows.edit}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_missing_attribute -->
    <a class="dropdown-item" onclick={() => onaction('edit')}
      ><i class="fas fa-edit"></i>&nbsp;&nbsp;Edit</a
    >
  {/if}
  {#if allows.copy}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_missing_attribute -->
    <a class="dropdown-item" onclick={() => onaction('copy')}
      ><i class="fas fa-copy"></i>&nbsp;&nbsp;Copy</a
    >
  {/if}
  {#if allows.private}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_missing_attribute -->
    <a class="dropdown-item" onclick={() => onaction('private')}
      ><i class="fas fa-comments"></i>&nbsp;&nbsp;Private Chat
    </a>
  {/if}
</div>
