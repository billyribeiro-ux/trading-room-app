<script lang="ts">
  import MessageBody from './MessageBody.svelte';
  import { ALERT_LABEL_BADGE_CLASS, alertLabelBadgeStyle } from '#lib/alert-labels.js';
  import type { BodySegment } from '#lib/message-body-segments.js';
  import type { MessageAction, TradeCopyPayload } from '#lib/types.js';

  /**
   * One parsed message body, rendered — the six segment kinds and nothing else.
   *
   * ## Why it is a component
   *
   * It was a `{#snippet}` on `RoomMessage.svelte` with six call sites (each renderer's body, quoted
   * reply and own line under a reply), and `source-size-contract` has named it as that file's next
   * seam through three separate entries. It takes a segment list and four values, none of which is
   * a gate or an entitlement — which is exactly what made it the right one to move and the compact
   * LAYOUT the wrong one: that branch reads two dozen values off its parent.
   *
   * ## It renders ITSELF for a trade order
   *
   * A trade segment WRAPS segments rather than carrying a string, because upstream's
   * `<span class="tradeColor">` is inserted by `filterChatMessages` before the symbol and link pipes
   * run — so a `$TICKER` inside an order is still coloured. Importing this file by name is the
   * Svelte 5 way to say that; `<svelte:self>` is the deprecated one.
   *
   * ## The revealed-gif map came WITH it, and is now per body
   *
   * Upstream this is DOM state — `showChatGif(id)` finds the placeholder with jQuery and toggles
   * `d-none` on its next sibling — and the id it builds is derived from the MESSAGE, so a message
   * with two gifs gives both the same id. Held here instead, keyed by URL, which is what makes two
   * gifs in one message independent. Holding it per BODY rather than per message is closer to the
   * reference than the shared map was: a gif quoted in a reply and the same gif in the line below
   * it are two placeholders upstream, not one.
   */
  let {
    segments,
    /** `parseStock`'s colour for a `stockColor` span, or nothing for the bare captured span. */
    stockStyle,
    /** The viewer's preference. `false` mutes gifs behind a click-to-show placeholder. */
    chatGif = false,
    /** `id_<messageId>` on a trade span and `gif_<messageId>` on a placeholder are both the msg's. */
    messageId,
    /**
     * RM-16 — true when this body is rendered in the EXTRA chat column.
     *
     * `urlwrapImg`'s fourth argument, and its only effect is the placeholder's id:
     *
     * ```js
     * const c = s ? `gifExtra_${o}` : `gif_${o}`     // bundle byte 1,326,195
     * ```
     *
     * The id is derived from the MESSAGE, so with the extra column on, the same message rendered in
     * both panes produced TWO elements with the same DOM id — which is invalid, and which
     * `document.getElementById` resolves to whichever came first. Nothing here resolves anything
     * through the id (the reveal is keyed by URL, see above), so the duplicate was inert; it is
     * still a duplicate, and the reference already carries the fix.
     */
    extraChatMsg = false,
    onaction
  }: {
    segments: BodySegment[];
    stockStyle?: string;
    chatGif?: boolean;
    messageId: number;
    extraChatMsg?: boolean;
    onaction: (action: MessageAction, payload?: MouseEvent | TradeCopyPayload) => void;
  } = $props();

  let revealedGifs = $state.raw<Record<string, boolean>>({});

  /** `!i && -1 !== r.indexOf('.gif')` — the muting applies to gifs only, case-insensitively. */
  function isMutedGif(url: string) {
    return !chatGif && url.toLowerCase().includes('.gif');
  }

  /**
   * Every prop a NESTED body inherits — all but `segments`, spread rather than respelled below,
   * where a prop nobody listed (`extraChatMsg`) reached the outer body and not the inner one.
   */
  const inherited = $derived({ stockStyle, chatGif, messageId, extraChatMsg, onaction });
</script>

<!--
  UNKEYED, deliberately, and that is a correction rather than an omission.

  This was `(index)`, which Svelte's best-practices page names outright: *"The key MUST uniquely
  identify the object. Do not use the index as a key."* The reason it is wrong here is subtler than
  the reason it is usually wrong — an index key and no key at all produce IDENTICAL reuse, so this
  was never a bug. It was a false signal: it reads as a guarantee of identity across updates, and
  there is none to give.

  A segment has no identity. `segments` is parsed from one message body and replaced wholesale
  whenever that body changes; a segment never moves from one position to another while surviving.
  Writing no key says exactly that, and the next person is not told a promise that cannot be kept.

  ON THE DISABLE BELOW: `eslint-plugin-svelte`'s `require-each-key` wants a key on EVERY block, and
  here it and the official docs genuinely disagree. The plugin is a heuristic that cannot express
  "this list has no identity"; the docs' rule is the specific one and it forbids the only key
  available. The docs win, and the reason is written down rather than the rule silently satisfied
  with `(index)` again.

  The justification is in THIS comment and not on the disable line, because an eslint justification
  uses a double hyphen and a double hyphen inside an HTML comment is illegal — that exact mistake
  shipped once here and was silently unrecognised.
-->
<!-- eslint-disable-next-line svelte/require-each-key -->
{#each segments as segment}
  {#if segment.kind === 'trade'}<!--
      `<span class="tradeColor" id="id_<messageId>">` — the element `doTradeCopy` looks up by id
      and `copyTradeOnClick` compares against. `stopPropagation` is the reference's own: the
      message row is itself clickable, so without it copying an order would also fire the row.

      A BUTTON in a span's clothing. Upstream binds the click to the span and checks `tagName`
      inside the handler; a span is not focusable and not reachable by keyboard, so this carries
      the role and the key handler that make it a control. The class and the id are unchanged,
      because both are what the captured stylesheet and the captured handler select on.

      RM-24 — `title="Copy order"` was OURS and is gone. The reference's span is
      `'<span class="tradeColor" id="id_' + o._id + '">'` (byte 1,414,920) and carries no title, so
      a member hovering an order in the original sees nothing. A tooltip nobody wrote is a
      behaviour nobody can check against the capture.

      `aria-label` takes its place rather than nothing at all, and the two are not the same thing:
      `title` shows a tooltip to everyone, `aria-label` names the control for a screen reader and
      is invisible. This span is `role="button"` — ours, because the capture puts a click handler
      on a bare span — and a button whose only content is the order text needs a name that says
      what activating it does.
    --><span
      class="tradeColor"
      id={segment.tradeId}
      role="button"
      tabindex="0"
      aria-label="Copy this order"
      onclick={(event) => {
        event.stopPropagation();
        onaction('copy-trade', { text: segment.text });
      }}
      onkeydown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        onaction('copy-trade', { text: segment.text });
      }}><MessageBody segments={segment.children ?? []} {...inherited} /></span
    >{:else if segment.kind === 'label' && segment.label}<span
      class={ALERT_LABEL_BADGE_CLASS}
      style={alertLabelBadgeStyle(segment.label)}>{segment.label.name}</span
    >{:else if segment.kind === 'stock'}<span class="stockColor" style={stockStyle}
      >{segment.text}</span
    >{:else if segment.kind === 'link' && segment.url}<a
      href={segment.url}
      target="_blank"
      rel="noreferrer"
      class="linkColor"
      onclick={(event) => event.stopPropagation()}>{segment.text}</a
    >{:else if segment.kind === 'image' && segment.url}{#if isMutedGif(segment.url)}<!-- svelte-ignore a11y_no_static_element_interactions --><!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        class="chat-gif-muted"
        id={extraChatMsg ? `gifExtra_${messageId}` : `gif_${messageId}`}
        onclick={() =>
          (revealedGifs = { ...revealedGifs, [segment.url!]: !revealedGifs[segment.url!] })}
      >
        {revealedGifs[segment.url] ? 'click to hide' : 'gif muted, click to show'}
      </div>{/if}<!-- svelte-ignore a11y_no_static_element_interactions --><!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class={['img-container', { 'd-none': isMutedGif(segment.url) && !revealedGifs[segment.url] }]}
      onclick={(event) => onaction('image', event)}
    >
      <!-- svelte-ignore a11y_missing_attribute -->
      <img class="uploaded-img" src={segment.url} /><br
        {...{ clear: 'both' } as Record<string, string>}
      />
    </div>{:else}{segment.text}{/if}
{/each}
