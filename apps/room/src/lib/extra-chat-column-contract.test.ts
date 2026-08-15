import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  The extra chat column — `app-extra-chat`, the room's second chat pane.

  It is a SEPARATE COMPONENT here because it is a separate component upstream. `app-chat` and
  `app-extra-chat` have near-identical templates and live in different split areas, so reproducing
  it as its own file is both faithful and the smaller change: `+page.svelte` keeps its chat pane
  exactly where it is, and the 37 contract tests that read that file are untouched by it.

  What differs from `app-chat`, and it is a short list:

    this.channel      = 'offTopic'          // app-chat defaults to 'main'
    this.extraChatMsg = !0
    composer id       = textAreaTxtExtra    // and focusing it sets globals.chatInputFocus

  Everything else — header, tab strip, scroller, webinar banner, composer, Chat Disabled block — is
  the same shape, which is why the two components' template consts line up one for one.
*/

const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
const PANE = readFileSync(new URL('./components/ExtraChatPane.svelte', import.meta.url), 'utf8');
const MODAL = readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8');
/*
  The `hideChat` collapse left `+page.svelte` for `room/split.svelte.ts` on 2026-08-15 — it writes
  the chat/alerts split, so it belongs with the geometry. What stayed in the page is WHO collapses,
  which is a room-authority question. Both halves are asserted, in their new homes.
*/
const SPLIT = readFileSync(new URL('./room/split.svelte.ts', import.meta.url), 'utf8');

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

/*
  Stripped, because the first draft of the `localStorage` guard below read the RAW module and went
  red on the class's own prose — `resolveSplitSizes` explains which `localStorage` keys upstream
  reads. That was my instrument being wrong, not the code, and the fix is the one this file already
  applies to the page: assert on code, never on comments.
*/
const splitCode = stripComments(SPLIT);
const pageCode = stripComments(PAGE);
const paneCode = stripComments(PANE);
const modalCode = stripComments(MODAL);

describe('the preference', () => {
  it('is wired, where it used to be a dead element id', () => {
    /*
      `extra-chat-column` sat in `DEAD_PREFERENCE_KEYS` and in nothing else: the checkbox wrote its
      own HTML id into the settings blob and no code read it back.
    */
    expect(modalCode).toContain("'extra-chat-column': 'extraChatColumn'");
    expect(pageCode).toContain("if (key === 'extraChatColumn') extraChatColumn = value;");
  });

  it('defaults OFF, as the reference default preferences do', () => {
    // Absent from the reference's twenty-five defaults, exactly like `enableRTE`.
    expect(pageCode).toContain(
      'let extraChatColumn = $state(loadedSettings.extraChatColumn === true);'
    );
    expect(pageCode).not.toContain('loadedSettings.extraChatColumn !== false');
  });
});

describe('the column is its own split area', () => {
  it('gated exactly as K4e gates index 3', () => {
    /*
      `O(3, !e.hideChatAlerts && e.appService.globals.preferences.extraChatColumn ? 3 : -1)`.

      The gate reads `extraChatColumnVisible` rather than the preference directly, because
      `hideChat` turns the column off WITHOUT persisting — see the collapse below. That is upstream's
      shape too: it assigns `preferences.extraChatColumn` at runtime and remembers the old value in
      `extraChatColumnWasEnabled`.
    */
    expect(pageCode).toContain(
      '{#if !hideChatAlerts && extraChatColumnVisible}{@render extraChatPane()}'
    );
  });

  it('and it is an area, not a pane nested inside the chat column', () => {
    const from = pageCode.indexOf('{#snippet extraChatPane()}');
    expect(from, 'the snippet must exist').toBeGreaterThan(-1);
    const snippet = pageCode.slice(from, pageCode.indexOf('{/snippet}', from));
    expect(snippet).toContain('<as-split-area');
    expect(snippet).toContain('style={split.extraChatAreaStyle}');
    expect(snippet).toContain('<ExtraChatPane');
  });
});

describe('the component', () => {
  it('is its own component, so the main pane was not disturbed', () => {
    /*
      The alternative was folding `+page.svelte`'s chat pane into something instantiable twice. That
      would have moved ~300 lines of markup that 37 contract tests read by source text — a great
      deal of churn to reproduce a structure the reference does not have.
    */
    expect(paneCode).toContain('<app-extra-chat>');
    expect(pageCode).toContain("import ExtraChatPane from '$lib/components/ExtraChatPane.svelte';");
  });

  it('defaults to the off-topic channel', () => {
    // `this.channel = 'offTopic'`.
    expect(paneCode).toContain("tab = $bindable('off-topic')");
    expect(pageCode).toContain("let extraChatTab: ChatTab = $state('off-topic');");
  });

  it('has its own composer id, which is what the mention router keys on', () => {
    // `preferences.extraChatColumn && 'textAreaTxtExtra' === chatInputFocus ? 'doMentionExtra' : …`
    expect(paneCode).toContain('id="textAreaTxtExtra"');
    expect(pageCode).toContain("let chatInputFocus = $state('textAreaTxt');");
  });

  it('and its own scroller element, per the capture', () => {
    // `app-extra-roomscroller` is a separate component upstream: two scrollers, two positions.
    expect(paneCode).toContain('<app-extra-roomscroller');
  });

  it('carries the same captured states the main pane does', () => {
    expect(paneCode).toContain('<div class="chatDisabled d-flex align-items-center">');
    expect(paneCode).toContain('<div class="px-1 webinarMode">');
    expect(paneCode).toContain(
      'In webinar mode users only see their own chat messages, while Presenters see everyones messages...'
    );
  });

  it('offers the RTE button, because the reference puts it on BOTH composers', () => {
    /*
      `openRTEModal()` appears on exactly two components — `app-chat` and `app-extra-chat` — and on
      neither private chat component. The extra one reads `#textAreaTxtExtra`.
    */
    expect(paneCode).toContain('{#if canUseRTE}');
    expect(paneCode).toContain('class="fas fa-font"');
    expect(pageCode).toContain('function openExtraRTEModal() {');
    expect(pageCode).toContain('rteDraft = textToEditorHtml(extraComposer.trim());');
    expect(pageCode).toContain("extraComposer = '';");
  });
});

describe('both columns share one pipeline, and that is the point', () => {
  it('the messages come from ONE function, parameterised by channel', () => {
    /*
      A second derived would have been a second copy of merge, trim, hide, badge and the webinar
      filter — five steps that must agree, in two places that would drift.
    */
    expect(pageCode).toContain('function chatMessagesFor(tab: ChatTab) {');
    expect(pageCode).toContain('const visibleChatMessages = $derived(chatMessagesFor(chatTab));');
    expect(pageCode).toContain(
      'const visibleExtraChatMessages = $derived(chatMessagesFor(extraChatTab));'
    );
  });

  it('the paging state is shared, because it is keyed by CHANNEL', () => {
    /*
      Two columns showing the same channel are looking at the same history and must not fetch it
      twice; two columns on different channels get different keys and page independently. That falls
      out of the paging state being a record keyed by channel rather than by column.
    */
    expect(pageCode).toContain('void loadOlderChatMessages(extraChatTab, scroller);');
    expect(pageCode).toContain('hasMoreData: chatPages.hasMore(extraChatTab),');
    // ONE instance for both columns, so "keyed by channel rather than by column" is structural.
    expect(pageCode).toContain('if (!extraChatScrollingUp) chatPages.arm(extraChatTab);');
  });

  it('but each column scrolls independently', () => {
    // `app-extra-roomscroller` exists upstream for exactly this reason.
    expect(pageCode).toContain('function trackExtraChatScroll(scroller: HTMLElement) {');
    expect(pageCode).toContain('let extraChatScrollingUp = false;');
  });

  it('and sends into the channel IT is showing, not the main column’s', () => {
    /*
      `sendMessageBody` took the main tab from module scope until the extra column arrived. Left
      that way, a message typed in the off-topic column would have landed in main.
    */
    expect(pageCode).toContain(
      'async function sendMessageBody(body: string, bodyHtml?: string, room: ChatTab = chatTab) {'
    );
    // `room` rides on the command's argument now, not on a hand-built `FormData`.
    expect(pageCode).toContain('await sendMessageCommand({ body: trimmedBody, bodyHtml, room });');
    expect(pageCode).toContain('if (await sendMessageBody(body, undefined, extraChatTab))');
  });
});

describe('mentions reach the column you are in', () => {
  it('routes on BOTH terms the reference uses', () => {
    /*
      `preferences.extraChatColumn && (this.extraChatMsg || 'textAreaTxtExtra' === chatInputFocus)`.

      Two ways in, and the second is the one that is easy to miss: clicking a name in the MAIN log
      while composing in the extra column has to insert where you are typing, not where you clicked.
    */
    expect(pageCode).toContain('function mentionTargetIsExtraColumn(fromExtraColumn: boolean) {');
    expect(pageCode).toContain(
      "return extraChatColumn && (fromExtraColumn || chatInputFocus === 'textAreaTxtExtra');"
    );
  });

  it('the extra column reports that its rows are ITS rows', () => {
    // `extraChatMsg` is true for every row that component renders.
    expect(pageCode).toContain("handleMessageAction('chat', action, message, event, true)");
  });

  it('and both composers report focus, or the flag would never move', () => {
    expect(pageCode).toContain("onfocus={() => (chatInputFocus = 'textAreaTxt')}");
    expect(pageCode).toContain("onfocus={() => (chatInputFocus = 'textAreaTxtExtra')}");
  });

  it('the insert goes into the composer that was chosen', () => {
    expect(pageCode).toContain('function mentionUser(name: string, toExtraColumn = false) {');
    expect(pageCode).toContain("extraComposer += `${extraComposer ? ' ' : ''}@${name} `;");
  });
});

describe('hideChat — the pane collapses for non-presenters while chat is disabled', () => {
  it('presenters keep their pane', () => {
    /*
      `this.isPresenter || guiEventBus.emit('hideChat', 'd' == e)` — emitted only for everyone else.

      The predicate stays in the page deliberately: `RoomSplit` owns the geometry and has no business
      knowing what a presenter is, so the page answers WHO and the class answers WHAT MOVES.
    */
    expect(pageCode).toContain("split.collapseChatForMode(!isPresenter && chatMode === 'd');");
  });

  it('chat goes to 0 and alerts take the column', () => {
    // `this.chatSize = 0; this.alertSize = 100`.
    expect(SPLIT).toContain('collapseChatForMode(shouldHide: boolean): void {');
    expect(SPLIT).toContain('this.#chatAlerts = 1;');
    expect(SPLIT).toContain('this.#beforeCollapse = this.#chatAlerts;');
    expect(SPLIT).toContain('this.#chatAlerts = this.#beforeCollapse;');
  });

  it('the extra column is hidden WITHOUT overwriting the viewer’s setting', () => {
    /*
      Upstream does this with a REMEMBERED FLAG because it destroys the setting to hide the column:
      `preferences.extraChatColumn = !1` on hide (no `setPreference`, so it is a runtime override),
      then `extraChatColumnWasEnabled && (preferences.extraChatColumn = !0)` to put it back.

      Ours reaches the same outcome with no flag at all, and this assertion is the reason it is
      allowed to: the preference is never written, and visibility is DERIVED from it plus the
      collapse. Clearing the collapse restores the column by construction.

      This test used to also require `extraChatColumnWasEnabled = extraChatColumn;`. That assignment
      was never read — it recorded an answer nothing asked, because the derived had already made the
      question unnecessary — so requiring it pinned a second source of truth for one fact. It was
      removed 2026-08-14 once ESLint surfaced it. The two assertions below are the actual mechanism.
    */
    expect(pageCode).toContain(
      'const extraChatColumnVisible = $derived(extraChatColumn && !split.chatCollapsed);'
    );
    expect(pageCode).toContain(
      '{#if !hideChatAlerts && extraChatColumnVisible}{@render extraChatPane()}'
    );
    /*
      The collapse must never write the preference — now a STRUCTURAL guarantee rather than a slice.

      `RoomSplit` is constructed with a READER and is handed one again on a direction change; it has
      no writer at all, and `endDrag` returns the preference write for the page to perform instead
      of performing it. So no path through the class can persist anything, which is a stronger
      statement than "this particular effect body does not", and it cannot go vacuous the way a
      `slice(indexOf(...))` does when the text it looks for moves.
    */
    expect(splitCode).not.toContain('savePreference(');
    expect(splitCode).not.toContain('onPreferenceChange');
    expect(splitCode, 'the class must have no way to write a preference').not.toContain(
      'localStorage'
    );
  });
});

describe('shared shapes, moved rather than copied', () => {
  it('the message item type and the day rule are one definition each', () => {
    /*
      `RoomMessageItem` lived inside `RoomMessage.svelte` and `sameCalendarDay` inside
      `+page.svelte`. Two components render rows and draw separators now, so both moved to shared
      modules — a shape declared inside one consumer is a shape the other has to guess at.
    */
    const types = readFileSync(new URL('./types.ts', import.meta.url), 'utf8');
    const formatters = readFileSync(new URL('./message-formatters.ts', import.meta.url), 'utf8');
    expect(types).toContain('export interface RoomMessageItem {');
    expect(types).toContain('export type MessageAction =');
    expect(formatters).toContain('export function sameCalendarDay(');
    // And no local redeclaration left behind to drift.
    expect(PAGE).not.toContain('  type MessageAction =');
    expect(PAGE).not.toContain('  function sameCalendarDay(');
  });
});

describe('the second column follows its own messages', () => {
  /*
    Until 2026-08-14 it did not. `onscrollerready` handed the element back and nothing read it, so a
    message arriving in the extra column left the view where it was while the main chat scrolled —
    the reader simply did not see it. ESLint surfaced the element as "assigned but never used".

    The four conditions below are the main chat's, reproduced rather than reinvented, because the
    two columns should not disagree about when a reader is left alone.
  */
  it('reads the scroller it is handed', () => {
    expect(pageCode).toContain('const scroller = extraChatScroller;');
    expect(pageCode).toContain('if (extraChatScroller === scroller) forceChatToBottom(scroller);');
  });

  it('scrolls on first view, on a channel switch, and on a new message', () => {
    const from = pageCode.indexOf('const scroller = extraChatScroller;');
    const effect = pageCode.slice(from, pageCode.indexOf('\n  });', from));
    expect(effect).toContain('const isInitialView = !extraChatScrollInitialized;');
    expect(effect).toContain('activeTab !== previousExtraChatTab');
    expect(effect).toContain('count > previousExtraChatCount');
  });

  it('honours the reader’s own scroll position, using THIS column’s flag', () => {
    /*
      The assertion that matters. Passing `chatScrollingUp` here would let the main column's reader
      position decide whether the extra column jumps — the two are independent panes and a reader
      scrolled up in one must not be yanked by traffic in the other.
    */
    const from = pageCode.indexOf('const scroller = extraChatScroller;');
    const effect = pageCode.slice(from, pageCode.indexOf('\n  });', from));
    expect(effect).toContain('shouldAutoScrollForMessage(\n          extraChatScrollingUp,');
    expect(effect).not.toContain('chatScrollingUp,\n');
  });

  it('is its own effect, not folded into the main chat’s', () => {
    /*
      One effect reading both columns would re-run each column's scroll logic whenever the other
      changed — "a message arrived anywhere" instead of "a message arrived here".
    */
    const main = pageCode.indexOf('const scroller = chatScroller;');
    const extra = pageCode.indexOf('const scroller = extraChatScroller;');
    expect(main).toBeGreaterThan(-1);
    expect(extra).toBeGreaterThan(main);
    expect(pageCode.slice(main, extra)).toContain('});');
  });
});
