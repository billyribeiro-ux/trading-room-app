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

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

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
    // `O(3, !e.hideChatAlerts && e.appService.globals.preferences.extraChatColumn ? 3 : -1)`
    expect(pageCode).toContain('{#if !hideChatAlerts && extraChatColumn}{@render extraChatPane()}');
  });

  it('and it is an area, not a pane nested inside the chat column', () => {
    const from = pageCode.indexOf('{#snippet extraChatPane()}');
    expect(from, 'the snippet must exist').toBeGreaterThan(-1);
    const snippet = pageCode.slice(from, pageCode.indexOf('{/snippet}', from));
    expect(snippet).toContain('<as-split-area');
    expect(snippet).toContain('style={extraChatAreaStyle}');
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
    expect(pageCode).toContain('hasMoreData: chatHasMoreData[extraChatTab] ?? true,');
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
    expect(pageCode).toContain("form.set('room', room);");
    expect(pageCode).toContain('if (await sendMessageBody(body, undefined, extraChatTab))');
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
