<script lang="ts">
  import type { MessageAction, RoomMessageItem } from '$lib/types';
  import EmojiPicker from '$lib/components/EmojiPicker.svelte';
  import type { EmojiDumpEntry } from '$lib/emoji-data';
  import { isMentionOf } from '$lib/mention';
  import { safeChatHtml } from './chat-safe-html';
  import { calculateMessageMenuPosition } from '$lib/message-menu-position';
  import { ngbTooltipWith } from '$lib/ngb-tooltip';
  import {
    alertDateFormatter,
    chatTimeFormatter,
    longDateFormatter
  } from '$lib/message-formatters';
  import {
    capturedMenuAllows,
    MESSAGE_MENU_LABEL,
    sourceMessageBehavior
  } from '$lib/message-behavior';
  import type { FollowChatStyle, MessageBadge, MessageReactions } from '$lib/types';

  type MessageKind = 'alert' | 'chat';
  interface MessageReactionPayload {
    key: string;
    emoji: string;
  }

  interface Props {
    item: RoomMessageItem;
    kind: MessageKind;
    currentUserId: number;
    currentUserEmailHash: string;
    viewerIsPresenter: boolean;
    theme: 'light' | 'dark';
    menuOpen: boolean;
    showDateSeparator: boolean;
    currentUserName?: string;
    followedStyle?: FollowChatStyle;
    chatStyle?: FollowChatStyle;
    allowDeleteOwnMessage?: boolean;
    usersPublicReply?: boolean;
    userPrivateMessaging?: boolean;
    userToPresenterPrivateMessaging?: boolean;
    disablePrivateMessagingForTrials?: boolean;
    currentUserIsTrial?: boolean;
    viewerIsLimitedPresenter?: boolean;
    enableReactions?: boolean;
    enableQaReactions?: boolean;
    isQaMessage?: boolean;
    hasQaOnAlerts?: boolean;
    enableEditMessage?: boolean;
    enableEditAlerts?: boolean;
    hideAvatars?: boolean;
    presenterMessagesOnTheRight?: boolean;
    /**
     * `preferences.chatGif` — whether an inline `.gif` plays, or shows a click-to-reveal placeholder.
     *
     * Default TRUE, matching the reference's blob (`chatGif:!0`). It is passed into the
     * `urlwrapImg` pipe as its second argument (`main.d6d3c112b59b7d0d.js` byte 1326105), and gates
     * ONLY `.gif` — a `.png` is never muted.
     */
    chatGif?: boolean;
    chatBadges?: boolean;
    enableBadges?: boolean;
    showBadgesToPresentersOnly?: boolean;
    showNewIndicator?: boolean;
    disableStarYears?: boolean;
    ontoggle: (id: number) => void;
    onaction: (
      action: MessageAction,
      item: RoomMessageItem,
      payload?: MouseEvent | MessageReactionPayload
    ) => void;
  }

  let {
    item,
    kind,
    currentUserId,
    currentUserEmailHash,
    viewerIsPresenter,
    theme,
    menuOpen,
    showDateSeparator,
    currentUserName = '',
    followedStyle,
    chatStyle,
    allowDeleteOwnMessage = false,
    usersPublicReply = false,
    userPrivateMessaging = false,
    userToPresenterPrivateMessaging = false,
    disablePrivateMessagingForTrials = false,
    currentUserIsTrial = false,
    viewerIsLimitedPresenter = false,
    enableReactions = false,
    enableQaReactions = false,
    isQaMessage = false,
    hasQaOnAlerts = true,
    enableEditMessage = false,
    enableEditAlerts = false,
    hideAvatars = false,
    presenterMessagesOnTheRight = false,
    chatGif = true,
    chatBadges = false,
    enableBadges = false,
    showBadgesToPresentersOnly = false,
    showNewIndicator = false,
    disableStarYears = false,
    ontoggle,
    onaction
  }: Props = $props();

  let reactionPickerOpen = $state(false);
  let reactionPickerTrigger = $state<'menu' | 'pill' | null>(null);
  let menuTriggerElement: HTMLAnchorElement | undefined;
  let menuElement: HTMLDivElement | undefined;
  const kebabText = '⠇ ';

  const isOwnMessage = $derived(item.senderId === currentUserId);
  const isAdminMessage = $derived(item.isAdmin === true);
  const capturedMenuItems = $derived(viewerIsPresenter ? item.evidenceMenuItems : undefined);
  const behavior = $derived(
    sourceMessageBehavior({
      kind,
      viewerIsPresenter,
      viewerIsLimitedPresenter,
      isOwnMessage,
      isAdminMessage,
      allowDeleteOwnMessage: !viewerIsPresenter && isOwnMessage && allowDeleteOwnMessage,
      usersPublicReply,
      userPrivateMessaging,
      userToPresenterPrivateMessaging,
      disablePrivateMessagingForTrials,
      currentUserIsTrial,
      enableReactions,
      enableQaReactions,
      isQaMessage,
      enableEditMessage,
      enableEditAlerts
    })
  );
  const canDeleteMessage = $derived(
    capturedMenuAllows(capturedMenuItems, MESSAGE_MENU_LABEL.delete, behavior.deleteMessage)
  );
  const canMuteMessage = $derived(
    capturedMenuAllows(capturedMenuItems, MESSAGE_MENU_LABEL.mute, behavior.muteMessage)
  );
  const canOpenUserInfo = $derived(
    capturedMenuAllows(capturedMenuItems, MESSAGE_MENU_LABEL.user, behavior.openUserInfo)
  );
  const canMention = $derived(
    capturedMenuAllows(capturedMenuItems, MESSAGE_MENU_LABEL.mention, behavior.mention)
  );
  const canShowToAll = $derived(
    capturedMenuAllows(capturedMenuItems, MESSAGE_MENU_LABEL.showAll, behavior.showToAll)
  );
  const canOpenAlertReport = $derived(
    capturedMenuAllows(capturedMenuItems, MESSAGE_MENU_LABEL.report, behavior.openAlertReport)
  );
  const canPublicReply = $derived(
    capturedMenuAllows(capturedMenuItems, MESSAGE_MENU_LABEL.reply, behavior.publicReply)
  );
  const canMarkAnswered = $derived(
    capturedMenuAllows(capturedMenuItems, MESSAGE_MENU_LABEL.answered, behavior.markAnswered)
  );
  const canPrivateMessage = $derived(
    capturedMenuAllows(capturedMenuItems, MESSAGE_MENU_LABEL.private, behavior.privateMessage)
  );
  const canReact = $derived(
    capturedMenuAllows(capturedMenuItems, MESSAGE_MENU_LABEL.reaction, behavior.react)
  );
  const canEdit = $derived(
    capturedMenuAllows(capturedMenuItems, MESSAGE_MENU_LABEL.edit, behavior.edit)
  );
  const canCopy = $derived(
    capturedMenuAllows(capturedMenuItems, MESSAGE_MENU_LABEL.copy, behavior.copy)
  );
  const reverseMessage = $derived(
    item.evidenceDirection
      ? item.evidenceDirection === 'reverse'
      : kind === 'chat' && isAdminMessage
  );
  const messageBoxClass = $derived(
    item.evidenceMessageBoxClass ??
      `msg-box pb-1${kind === 'chat' && isAdminMessage ? ' msg-box-adm' : ''}`
  );
  const messageRowClass = $derived(
    `mr-1 d-flex ${reverseMessage ? 'flex-row-reverse' : 'flex-row'}`
  );
  const avatarRowClass = $derived(
    `d-flex ${reverseMessage ? 'flex-row-reverse ' : ''}justify-content-center align-items-start flex-nowrap mt-1`
  );
  const effectiveStyle = $derived(
    item.evidenceKey
      ? undefined
      : (followedStyle ?? (kind === 'chat' && !item.backgroundColor ? chatStyle : undefined))
  );
  const messageBoxStyle = $derived.by(() => {
    if (item.evidenceMessageBoxStyle !== undefined) {
      return item.evidenceMessageBoxStyle ?? undefined;
    }
    const backgroundColor = effectiveStyle?.bgColor ?? item.backgroundColor;
    return backgroundColor ? `background-color: ${backgroundColor};` : undefined;
  });
  // The only inline style the captured DOM ever puts on `.msgMenu` is this background inversion:
  // app-room/complete.html has 13 kebab anchors carrying `color: <box background>; filter:
  // invert(1);` and 5 carrying no style attribute at all - never a font size. The captured
  // stylesheet pins `app-st-message .msgMenu` at 20px, so feeding the follow/global chat font
  // size into that anchor shrank the kebab on newly posted messages while captured ones (which
  // have no effectiveStyle) stayed at 20px.
  const backgroundInversionStyle = $derived(
    item.backgroundColor ? `color: ${item.backgroundColor}; filter: invert(1);` : undefined
  );
  const invertedTextStyle = $derived(
    effectiveStyle
      ? `color: ${effectiveStyle.usernameColor}; font-size: ${effectiveStyle.fontSize}px;`
      : backgroundInversionStyle
  );
  const usernameStyle = $derived.by(() => {
    if (effectiveStyle) {
      return `color: ${effectiveStyle.usernameColor}; font-size: ${effectiveStyle.fontSize + 1}px;`;
    }
    return invertedTextStyle;
  });
  const dateStyle = $derived.by(() => {
    if (effectiveStyle) {
      return `color: ${effectiveStyle.usernameColor}; font-size: ${effectiveStyle.fontSize - 2}px;`;
    }
    return invertedTextStyle;
  });
  const bodyStyle = $derived.by(() => {
    if (item.evidenceBodyStyle !== undefined) return item.evidenceBodyStyle ?? undefined;
    const color = effectiveStyle?.color ?? item.fontColor;
    const fontSize = effectiveStyle?.fontSize;
    return (
      [color ? `color: ${color};` : '', fontSize ? `font-size: ${fontSize}px;` : '']
        .filter(Boolean)
        .join(' ') || undefined
    );
  });
  const stockStyle = $derived(effectiveStyle ? `color: ${effectiveStyle.tickerColor};` : undefined);
  /*
    The shared rule, not a second copy. This was `item.body.includes('@' + currentUserName)` —
    case-sensitive, no trailing space and blind to `@all`, so `@Bob` never highlighted for bob,
    `@bobby` always did, and a presenter addressing the room with `@all ` highlighted for nobody.
    See `$lib/mention` for the reference's own three terms.
  */
  const isMention = $derived(isMentionOf(item.body, currentUserName, isAdminMessage));
  const isQuestion = $derived(
    item.evidenceQuestion ??
      (kind === 'chat' && item.body.includes('?') && followedStyle === undefined)
  );
  const messageBodyClass = $derived(
    `msg-left text-formated preText ml-2 mr-2 p-0${isMention && followedStyle === undefined ? ' mentionColor' : ''}${isQuestion ? ' questionColor' : ''}${presenterMessagesOnTheRight ? ' presenter-msg-right' : ''}`
  );
  const reactions = $derived(Object.entries(item.reactions ?? {}));
  const visibleBadges = $derived(
    chatBadges &&
      !presenterMessagesOnTheRight &&
      enableBadges &&
      (item.badges?.length ?? 0) > 0 &&
      (!showBadgesToPresentersOnly || viewerIsPresenter)
      ? (item.badges ?? [])
      : []
  );

  /**
   * The URL pattern from the capture's `parseLinks` pipe, verbatim:
   *
   * ```js
   * e.replace(/((http|https|ftp):\/\/[\w?=&.@\/-;#~%-]+(?![\w\s?&.@\/;#~%"=-]*>))/gi,
   *           r => this.urlwrapImg(r, i, o, s))
   * ```
   *
   * `\/-;` inside the class is a RANGE - `/` (0x2F) through `;` (0x3B) - so it also admits digits
   * and `:`. Copied as written rather than "tidied", because narrowing it would stop matching URLs
   * the real room links today.
   */
  const CAPTURED_URL = /((http|https|ftp):\/\/[\w?=&.@\/-;#~%-]+(?![\w\s?&.@\/;#~%"=-]*>))/gi;

  /**
   * Which muted gifs this viewer has clicked open, keyed by the segment's URL.
   *
   * Upstream this is DOM state: `showChatGif(id)` looks the placeholder up with jQuery and toggles
   * `d-none` on its next sibling (`deployed-index.html`). Held as component state here instead,
   * because the captured function depends on `el.next()` being the image — a structural assumption
   * that breaks the moment anything is inserted between them.
   *
   * Keyed by URL rather than by the `gif_${id}` the reference builds: that id is derived from the
   * MESSAGE, so a message containing two gifs would give both the same id upstream. The id is still
   * rendered for fidelity, but nothing here resolves anything through it.
   */
  let revealedGifs = $state<Record<string, boolean>>({});

  /** `!i && -1 !== r.indexOf('.gif')` — the muting applies to gifs only, case-insensitively. */
  function isMutedGif(url: string) {
    return !chatGif && url.toLowerCase().includes('.gif');
  }

  /** `urlwrapImg` renders these inline instead of as an anchor. */
  const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.jfif'];

  type BodySegment = { kind: 'text' | 'stock' | 'link' | 'image'; text: string; url?: string };

  /**
   * Splits a message body into tickers, links, inline images and plain text.
   *
   * Links were not parsed at all - a pasted URL rendered as dead text. The capture wraps each one
   * as `<a href target="_blank" class="linkColor" onclick="event.stopPropagation()">`; the
   * `stopPropagation` matters because the message row itself is clickable, so without it opening a
   * link would also fire the row's own handler.
   *
   * Built as segments rather than an HTML string. The capture pipes through
   * `bypassSecurityTrustHtml` and leans on DOMPurify to make that safe; emitting real elements
   * means the message text can never be parsed as markup in the first place, and the rendered DOM
   * is the same.
   */
  function parseBodySegments(value: string): BodySegment[] {
    const segments: BodySegment[] = [];

    for (const chunk of value.split(/(\s*\$[A-Za-z_?]+\b)/g).filter(Boolean)) {
      if (/^\s*\$[A-Za-z_?]+\b$/.test(chunk)) {
        segments.push({ kind: 'stock', text: chunk });
        continue;
      }

      let cursor = 0;
      for (const match of chunk.matchAll(CAPTURED_URL)) {
        const at = match.index ?? 0;
        if (at > cursor) segments.push({ kind: 'text', text: chunk.slice(cursor, at) });
        const url = match[0];
        const lower = url.toLowerCase();
        segments.push({
          kind: IMAGE_EXTENSIONS.some((extension) => lower.includes(extension)) ? 'image' : 'link',
          text: url,
          url
        });
        cursor = at + url.length;
      }
      if (cursor < chunk.length) segments.push({ kind: 'text', text: chunk.slice(cursor) });
    }

    return segments;
  }

  const stockSegments = $derived(parseBodySegments(item.body));
  const replyStockSegments = $derived(item.replyToBody ? parseBodySegments(item.replyToBody) : []);

  /*
    The three formatters live in `$lib/message-formatters` and are built ONCE for the page.

    This script runs per rendered item — one per alert, one per chat message — so declaring them
    here constructed three `Intl.DateTimeFormat` objects per message, of which at most one is ever
    called: the long date only under the separator, the alert stamp only on the alert branch, the
    chat time only on the chat branch. Construction costs ~35x a `format()` call, and the objects
    are byte-identical every time because the locale and every option are literals.
  */
  function runAction(action: MessageAction, payload?: MouseEvent | MessageReactionPayload) {
    onaction(action, item, payload);
  }

  function chooseReaction(entry: EmojiDumpEntry) {
    runAction('reaction', { key: entry.id, emoji: entry.glyph });
    window.setTimeout(() => {
      reactionPickerOpen = false;
      reactionPickerTrigger = null;
    }, 500);
  }

  function captureMenuTrigger(node: HTMLAnchorElement) {
    menuTriggerElement = node;
    return () => {
      if (menuTriggerElement === node) menuTriggerElement = undefined;
    };
  }

  function captureMenu(node: HTMLDivElement) {
    menuElement = node;
    return () => {
      if (menuElement === node) menuElement = undefined;
    };
  }

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

  // `.img-container` is `inline-flex` (shrink-to-fit) and `.uploaded-img` is `width: 100%`, so the
  // used width is circular and stays collapsed until the bytes arrive - the width/height
  // attributes only supply the aspect ratio. Publishing the intrinsic width lets the paired
  // app.css rule reserve the exact box the image settles into.
  function uploadWidthVariable(intrinsicWidth: number | null | undefined) {
    return typeof intrinsicWidth === 'number' && intrinsicWidth > 0
      ? `--upload-intrinsic-width: ${intrinsicWidth}px;`
      : undefined;
  }

  function evidenceImageAttachment(url: string) {
    return (node: HTMLElement) => {
      const onclick = `openImageModal(event,'${url.replaceAll("'", "\\'")}')`;
      node.setAttribute('onclick', onclick);
      return () => {
        if (node.getAttribute('onclick') === onclick) node.removeAttribute('onclick');
      };
    };
  }
</script>

{#snippet bodySegments(segments: BodySegment[])}
  {#each segments as segment, index (index)}
    {#if segment.kind === 'stock'}<span class="stockColor" style={stockStyle}>{segment.text}</span
      >{:else if segment.kind === 'link' && segment.url}<!-- svelte-ignore a11y_click_events_have_key_events --><a
        href={segment.url}
        target="_blank"
        rel="noreferrer"
        class="linkColor"
        onclick={(event) => event.stopPropagation()}>{segment.text}</a
      >{:else if segment.kind === 'image' && segment.url}{#if isMutedGif(segment.url)}<!-- svelte-ignore a11y_no_static_element_interactions --><!-- svelte-ignore a11y_click_events_have_key_events --><div
        class="chat-gif-muted"
        id="gif_{item.id}"
        onclick={() =>
          (revealedGifs = { ...revealedGifs, [segment.url!]: !revealedGifs[segment.url!] })}
      >
        {revealedGifs[segment.url] ? 'click to hide' : 'gif muted, click to show'}
      </div>{/if}<!-- svelte-ignore a11y_no_static_element_interactions --><!-- svelte-ignore a11y_click_events_have_key_events --><div
        class="img-container"
        class:d-none={isMutedGif(segment.url) && !revealedGifs[segment.url]}
        onclick={(event) => runAction('image', event)}
      >
        <!-- svelte-ignore a11y_missing_attribute -->
        <img class="uploaded-img" src={segment.url} /><br
          {...{ clear: 'both' } as Record<string, string>}
        />
      </div>{:else}{segment.text}{/if}
  {/each}
{/snippet}


<app-st-message>
  {#if showDateSeparator}
    <div class="separator">
      <!-- svelte-ignore a11y_missing_attribute -->
      <a>{item.evidenceSeparatorText ?? longDateFormatter.format(item.createdAt)}</a>
    </div>
  {/if}
  <div class={messageBoxClass} style={messageBoxStyle}>
    <div {...{ clas: 'd-flex flex-column  align-items-center w-100 ' } as Record<string, string>}>
      <div class={messageRowClass}>
        <div class={avatarRowClass}>
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_interactive_supports_focus -->
          <a
            {@attach captureMenuTrigger}
            role="button"
            id="dropdownMenuLink"
            data-bs-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            class="msgMenu dropright pt-1"
            style={backgroundInversionStyle}
            onclick={(event) => {
              event.stopPropagation();
              reactionPickerOpen = false;
              reactionPickerTrigger = null;
              ontoggle(item.id);
            }}>{kebabText}</a
          >
          <div
            {@attach captureMenu}
            aria-labelledby="dropdownMenuLink"
            class={menuOpen
              ? 'dropdown-menu users-dropdown-options show'
              : 'dropdown-menu users-dropdown-options'}
          >
            {#if canDeleteMessage}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <!-- svelte-ignore a11y_missing_attribute -->
              <a class="dropdown-item" onclick={(event) => runAction('delete', event)}
                ><i class="fas fa-trash"></i>&nbsp;&nbsp;Delete Message</a
              >
              {#if canMuteMessage}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <!-- svelte-ignore a11y_missing_attribute -->
                <a class="dropdown-item" onclick={() => runAction('mute')}
                  ><i class="fa fa-comment-slash"></i>&nbsp;&nbsp;Mute Chat for 24hrs</a
                >
              {/if}
              <div class="dropdown-divider"></div>
            {/if}
            {#if canOpenUserInfo}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <!-- svelte-ignore a11y_missing_attribute -->
              <a class="dropdown-item" onclick={() => runAction('user')}
                ><i class="fas fa-user"></i>&nbsp;&nbsp;User Info</a
              >
            {/if}
            {#if canMention}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <!-- svelte-ignore a11y_missing_attribute -->
              <a class="dropdown-item" onclick={() => runAction('mention')}
                ><i class="fas fa-reply"></i>&nbsp;&nbsp;Mention</a
              >
            {/if}
            {#if canShowToAll}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <!-- svelte-ignore a11y_missing_attribute -->
              <a class="dropdown-item" onclick={() => runAction('show-all')}
                ><i class="fas fa-envelope-open"></i>&nbsp;&nbsp;Show message to all</a
              >
            {/if}
            {#if canOpenAlertReport}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <!-- svelte-ignore a11y_missing_attribute -->
              <a
                data-bs-toggle="modal"
                data-bs-target="#alert-send-report-modal"
                class="dropdown-item"
                onclick={() => runAction('report')}
                ><i class="fas fa-chart-pie"></i>&nbsp;&nbsp;Alert Send Report
              </a>
            {/if}
            {#if canPublicReply}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <!-- svelte-ignore a11y_missing_attribute -->
              <a
                data-bs-toggle="modal"
                data-bs-target="#replyModal"
                class="dropdown-item"
                onclick={() => runAction('reply')}
                ><i class="fas fa-comment"></i>&nbsp;&nbsp;Reply</a
              >
            {/if}
            {#if canMarkAnswered}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <!-- svelte-ignore a11y_missing_attribute -->
              <a class="dropdown-item" onclick={() => runAction('answered')}
                ><i class="fas fa-check"></i>&nbsp;&nbsp;Mark Answered
              </a>
            {/if}
            {#if canReact}
              <a
                {...{
                  container: 'body',
                  autoClose: 'outside',
                  popoverClass: 'popOverDiv'
                } as Record<string, string>}
                class="dropdown-item"
                onclick={(event) => {
                  event.stopPropagation();
                  reactionPickerOpen = !reactionPickerOpen;
                  reactionPickerTrigger = reactionPickerOpen ? 'menu' : null;
                }}
                aria-describedby={reactionPickerOpen && reactionPickerTrigger === 'menu'
                  ? `message-reaction-popover-${kind}-${item.id}`
                  : undefined}
              >
                <i class="far fa-smile"></i>&nbsp;&nbsp;Add Reaction
              </a>
            {/if}
            {#if canEdit}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <!-- svelte-ignore a11y_missing_attribute -->
              <a class="dropdown-item" onclick={() => runAction('edit')}
                ><i class="fas fa-edit"></i>&nbsp;&nbsp;Edit</a
              >
            {/if}
            {#if canCopy}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <!-- svelte-ignore a11y_missing_attribute -->
              <a class="dropdown-item" onclick={() => runAction('copy')}
                ><i class="fas fa-copy"></i>&nbsp;&nbsp;Copy</a
              >
            {/if}
            {#if canPrivateMessage}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <!-- svelte-ignore a11y_missing_attribute -->
              <a class="dropdown-item" onclick={() => runAction('private')}
                ><i class="fas fa-comments"></i>&nbsp;&nbsp;Private Chat
              </a>
            {/if}
          </div>
          {#if !hideAvatars}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="avatar pl-1" onclick={() => runAction('user')}>
              <img alt="msg.avt" src={item.senderAvatarUrl} />
            </div>
          {/if}
        </div>
        <div class="w-100">
          <div class="d-flex justify-content-between align-items-center w-100">
            {#if reverseMessage}
              <span
                {...{ placement: 'top' } as Record<string, string>}
                {@attach ngbTooltipWith(alertDateFormatter.format(item.createdAt))}
                class="created-at mx-2"
                style={dateStyle}
                >{item.evidenceTimestampText ?? chatTimeFormatter.format(item.createdAt)}
              </span>
            {/if}
            <div
              class="d-flex align-items-center justify-content-between flex-nowrap"
              style={kind === 'alert' ? bodyStyle : undefined}
            >
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
              <strong
                class="username mx-1"
                class:text-primary={kind === 'alert' && isAdminMessage && !item.evidenceKey}
                style={usernameStyle}
                onclick={() => runAction('mention')}
                ondblclick={() => runAction('user')}
              >
                {item.senderName}
              </strong>
              {#each visibleBadges as badge, badgeIndex (`${item.id}-${badgeIndex}`)}
                {#if badge.imageUrl}
                  <img class="user-badge-img" src={badge.imageUrl} alt={badge.imageUrl} />
                {:else}
                  <span
                    class="badge px-1 mx-1 user-badge"
                    style="background-color: {badge.backgroundColor}; color: {badge.color};"
                    >{badge.text}</span
                  >
                {/if}
              {/each}
              {#if viewerIsPresenter && item.isTrial}
                <span class="badge bg-danger trial-badge"> Trial </span>
              {/if}
              {#if showNewIndicator && viewerIsPresenter && item.isNew}
                <span class="badge bg-warning new-badge">New</span>
              {/if}
              {#if !disableStarYears && kind === 'chat' && !isAdminMessage && item.membershipYears !== null && item.membershipYears !== undefined && chatBadges}
                <span class="stars-container" style={dateStyle}>
                  <i class="fas fa-star stars-icon"></i>
                  <span class="stars-num">{item.membershipYears}</span>
                </span>
              {/if}
              {#if item.sessionName}
                <span class="ms-1 badge text-bg-secondary">[{item.sessionName}]</span>
              {/if}
            </div>
            {#if kind === 'alert'}
              <div>
                {#if !isQaMessage && hasQaOnAlerts}
                  <button
                    title="Ask a question"
                    class="btn btn-sm btn-secondary me-1 alert-qa"
                    class:btn-danger={Boolean(item.unreadQa)}
                    class:animated={Boolean(item.unreadQa)}
                    class:flash={Boolean(item.unreadQa)}
                    style={bodyStyle}
                    onclick={() => runAction('question')}
                  >
                    <!--
                      The captured button keeps a literal space inside each span - `> (1) <` and
                      `> ✅<` - and that space is what separates the checkmark from the icon.
                      Svelte trims whitespace at element boundaries, so it has to be written as an
                      expression to survive into the rendered output.
                    -->
                    {#if item.questionCount}
                      <span class="me-1">{' '}({item.questionCount}){' '}</span>
                    {/if}
                    <i class="fas fa-question-circle"></i>
                    {#if item.questionAnswered}<span>{' '}✅</span>{/if}
                  </button>
                {/if}
                <span class="created-at mr-2" style={dateStyle}
                  >{item.evidenceTimestampText ?? alertDateFormatter.format(item.createdAt)}</span
                >
              </div>
            {:else if !reverseMessage}
              <span
                {...{ placement: 'top' } as Record<string, string>}
                {@attach ngbTooltipWith(alertDateFormatter.format(item.createdAt))}
                class="created-at mx-2"
                style={dateStyle}
                >{item.evidenceTimestampText ?? chatTimeFormatter.format(item.createdAt)}
              </span>
            {/if}
          </div>
          <div class="d-flex">
            {#if item.answered && kind !== 'alert'}
              <div>✅</div>
            {/if}
            {#if item.replyToName && item.replyToBody}
              <div class="ms-1 private-reply">
                <div
                  class="private-reply-message w-100"
                  class:private-reply-bg-light={theme === 'light'}
                  class:private-reply-bg-dark={theme === 'dark'}
                >
                  <strong class="d-block username" style={usernameStyle}>
                    {item.replyToName}
                  </strong>
                  <div class={messageBodyClass} style={bodyStyle}>
                    {@render bodySegments(replyStockSegments)}
                  </div>
                  <div class={messageBodyClass} style={bodyStyle}>
                    {@render bodySegments(stockSegments)}
                  </div>
                </div>
              </div>
            {:else}
              <div class={messageBodyClass} style={bodyStyle}>
                {#if item.evidenceBodySegments}
                  {#each item.evidenceBodySegments as segment, index (index)}
                    {#if segment.kind === 'stock'}
                      <span class="stockColor" style={stockStyle}>{segment.text}</span>
                    {:else if segment.kind === 'image' && segment.url}
                      <div
                        class="img-container"
                        style={uploadWidthVariable(segment.width)}
                        {@attach evidenceImageAttachment(segment.url)}
                      >
                        <!-- svelte-ignore a11y_missing_attribute -->
                        <img
                          class="uploaded-img"
                          src={segment.url}
                          width={segment.width}
                          height={segment.height}
                        /><br
                          {...{ clear: 'both' } as Record<string, string>}
                        />
                      </div>
                    {:else}{segment.text}{/if}
                  {/each}
                {:else if item.bodyHtml}
                  <!--
                    The rich-text branch, and it does NOT use Svelte's raw-html tag. That rule is
                    asserted next door in `message-links-contract.test.ts` and is kept: markup
                    reaches the DOM through an attachment that sanitises first, so there is no path
                    where an unfiltered string is trusted. `item.bodyHtml` was already sanitised by
                    the server on the way in, and is sanitised AGAIN here before insertion.

                    (This comment names no raw-html tag on purpose. That contract reads SOURCE TEXT,
                    so a comment mentioning the literal fails it just as code would — which is
                    exactly what happened on the first draft.)

                    Twice is not belt-and-braces for its own sake. The server pass is the control —
                    it is what a crafted request cannot bypass. The browser pass covers the rows
                    that already existed when the allow-list was narrower, which is the case that
                    bit the notes table: `notes-repository` re-sanitises historical rows on read for
                    exactly this reason, and its test says so.

                    The segment parser is deliberately NOT applied here. It exists to find links,
                    tickers and images in PLAIN text; run over markup it would rewrite the author's
                    own tags.
                  -->
                  <span {@attach safeChatHtml(item.bodyHtml)}></span>
                {:else}
                  {@render bodySegments(stockSegments)}
                  {#if kind === 'alert' && item.targetUrl}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div
                      class="img-container"
                      style={uploadWidthVariable(item.targetWidth)}
                      onclick={(event) => runAction('image', event)}
                    >
                      <!-- svelte-ignore a11y_missing_attribute -->
                      <img
                        class="uploaded-img"
                        src={item.targetUrl}
                        width={item.targetWidth ?? undefined}
                        height={item.targetHeight ?? undefined}
                      /><br
                        {...{ clear: 'both' } as Record<string, string>}
                      />
                    </div>
                  {/if}
                {/if}
              </div>
            {/if}
          </div>
          {#if canReact && reactions.length > 0}
            <span class:presenter-reactions-right={presenterMessagesOnTheRight} style={bodyStyle}>
              {#each reactions as [reactionKey, reaction] (reactionKey)}
                {#if reaction.clickedBy.length > 0}
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <span
                    class="badge chat-reaction"
                    class:chat-reaction-added={reaction.clickedBy.includes(currentUserEmailHash)}
                    onclick={() =>
                      runAction('reaction', {
                        key: reactionKey,
                        emoji: reaction.emoji
                      })}
                  >
                    {reaction.emoji}
                    {reaction.clickedBy.length}
                  </span>
                {/if}
              {/each}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <span
                class="badge chat-reaction chat-reaction-hover"
                aria-describedby={reactionPickerOpen && reactionPickerTrigger === 'pill'
                  ? `message-reaction-popover-${kind}-${item.id}`
                  : undefined}
                onclick={() => {
                  reactionPickerOpen = !reactionPickerOpen;
                  reactionPickerTrigger = reactionPickerOpen ? 'pill' : null;
                }}
              >
                <i class="far fa-smile"></i>
              </span>
            </span>
          {/if}
        </div>
      </div>
    </div>
  </div>
  {#if reactionPickerOpen}
    <EmojiPicker
      popoverId={`message-reaction-popover-${kind}-${item.id}`}
      onselect={() => {}}
      onentry={chooseReaction}
    />
  {/if}
</app-st-message>
