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
/*
  The preference declarations and the write path moved to `RoomPrefs` in Phase 5 slice 3, so the
  assertions about them read the class that now owns them. The page half is still read above -
  each assertion points at the file that owns its subject.
*/
const PREFS_SOURCE = readFileSync(new URL('./room/prefs.svelte.ts', import.meta.url), 'utf8');
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
/*
  The two columns' state moved to `room/chat.svelte.ts` on 2026-08-15 — which channel each shows,
  what is typed in each, which one has focus, and the mention router that reads three of those at
  once. The assertions against the reference bundle are untouched; ours follow the code.
*/
const chatClass = readFileSync(new URL('./room/chat.svelte.ts', import.meta.url), 'utf8');
const splitCode = stripComments(SPLIT);
/*
  The composer left the page for `RoomComposer` in Phase 5 slice 10. Read as its own source, so an
  assertion about the RTE gate cannot pass against a file that no longer holds it — and so the
  NEGATIVES below still point at something that could hold the wrong version.
*/
const composerModule = readFileSync(new URL('room/composer.svelte.ts', import.meta.url), 'utf8');
/*
  The read pipelines left the page for `RoomFeeds` in Phase 5 slice 9. Read as their own source, so
  an assertion about what a pane renders cannot pass against a file that no longer builds it.
*/
const feedsModule = readFileSync(new URL('room/feeds.svelte.ts', import.meta.url), 'utf8');
/*
  The message-action dispatcher left the page for `RoomMessageActions` in Phase 5 slice 8. Read as
  its own source, so an assertion about what a click does cannot pass against a file that no longer
  decides it.
*/
const messageActionsModule = readFileSync(
  new URL('room/message-actions.svelte.ts', import.meta.url),
  'utf8'
);
const pageCode = stripComments(PAGE);
/*
  The extra column's SCROLLING moved to `room/feed-scroll.ts` in Phase 5 slice 23 — its tracker, its
  own `extraChatScrollingUp` flag, and the paging arm keyed by its channel.

  The follow EFFECT stayed on the page until 2026-08-16 and then went to `ExtraChatPane` itself,
  which owns the scroller it drives. So three files are named here and each assertion points at the
  one that owns its subject: the tracker in `feed-scroll.ts`, the effect in the pane, and the props
  that feed it on the page.
*/
const scrollCode = stripComments(
  readFileSync(new URL('./room/feed-scroll.ts', import.meta.url), 'utf8')
);
const prefsCode = stripComments(PREFS_SOURCE);
const paneCode = stripComments(PANE);
const modalCode = stripComments(MODAL);

describe('the preference', () => {
  it('is wired, where it used to be a dead element id', () => {
    /*
      `extra-chat-column` sat in `DEAD_PREFERENCE_KEYS` and in nothing else: the checkbox wrote its
      own HTML id into the settings blob and no code read it back.
    */
    expect(modalCode).toContain("'extra-chat-column': 'extraChatColumn'");
    expect(prefsCode).toContain("if (key === 'extraChatColumn') this.#extraChatColumn = value;");
  });

  it('defaults OFF, as the reference default preferences do', () => {
    // Absent from the reference's twenty-five defaults, exactly like `enableRTE`.
    expect(prefsCode).toContain(
      'this.#extraChatColumn = $state(loadedSettings.extraChatColumn === true);'
    );
    expect(pageCode).not.toContain('prefs.loaded.extraChatColumn !== false');
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
      '{#if !gates.hideChatAlerts && extraChatColumnVisible}{@render extraChatPane()}'
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
    expect(pageCode).toContain("import ExtraChatPane from '#lib/components/ExtraChatPane.svelte';");
  });

  it('defaults to the off-topic channel', () => {
    // `this.channel = 'offTopic'`.
    expect(paneCode).toContain("tab = $bindable('off-topic')");
    expect(chatClass).toContain("#extraTab = $state<ChatTab>('off-topic');");
  });

  it('has its own composer id, which is what the mention router keys on', () => {
    // `preferences.extraChatColumn && 'textAreaTxtExtra' === chatInputFocus ? 'doMentionExtra' : …`
    expect(paneCode).toContain('id="textAreaTxtExtra"');
    expect(chatClass).toContain("#focus = $state<ChatComposerId>('textAreaTxt');");
    // A UNION now, not a bare string: a typo in the comparison would route every mention silently.
    expect(chatClass).toContain("export type ChatComposerId = 'textAreaTxt' | 'textAreaTxtExtra';");
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
    expect(composerModule).toContain('openExtraRTE() {');
    // Take-and-clear in ONE call, so the draft cannot exist in the modal and behind it at once.
    expect(composerModule).toContain(
      'this.#rteDraft = this.#textToEditorHtml(this.#chat.take(EXTRA_COMPOSER));'
    );
    expect(chatClass).toContain('take(composer: ChatComposerId): string {');
    expect(chatClass).toContain('this.clear(composer);');
  });
});

describe('both columns share one pipeline, and that is the point', () => {
  it('the messages come from ONE function, parameterised by channel', () => {
    /*
      A second derived would have been a second copy of merge, trim, hide, badge and the webinar
      filter — five steps that must agree, in two places that would drift.
    */
    expect(feedsModule).toContain('chatMessagesFor(tab: ChatTab) {');
    expect(feedsModule).toContain('return this.chatMessagesFor(this.#chat.tab);');
    expect(feedsModule).toContain('return this.chatMessagesFor(this.#chat.extraTab);');
  });

  it('the paging state is shared, because it is keyed by CHANNEL', () => {
    /*
      Two columns showing the same channel are looking at the same history and must not fetch it
      twice; two columns on different channels get different keys and page independently. That falls
      out of the paging state being a record keyed by channel rather than by column.
    */
    expect(scrollCode).toContain('void this.loadOlderChatMessages(this.#chat.extraTab, scroller);');
    expect(scrollCode).toContain('hasMoreData: this.#chatPages.hasMore(this.#chat.extraTab),');
    /*
      ONE instance for both columns, so "keyed by channel rather than by column" is structural — and
      that now covers the history RELEASE as well as the re-arm, both keyed by `extraTab`. If this
      column released by COLUMN rather than by channel it would drop history the main column is
      still scrolled up into.
    */
    expect(scrollCode).toContain('this.#chatPages.arm(this.#chat.extraTab);');
    expect(scrollCode).toContain('this.#chatPages.releaseHistory(this.#chat.extraTab);');
  });

  it('but each column scrolls independently', () => {
    // `app-extra-roomscroller` exists upstream for exactly this reason.
    expect(scrollCode).toContain('trackExtraChatScroll(scroller: HTMLElement) {');
    // It is a field of the scroll class now, and the page reads it through a getter — which is the
    // point: two writers of one flag is how a column follows while its reader is up the log.
    expect(scrollCode).toContain('#extraChatScrollingUp: boolean;');
    expect(pageCode).toContain('feedScroll.extraChatReadingHistory');
  });

  it('and sends into the channel IT is showing, not the main column’s', () => {
    /*
      `sendMessageBody` took the main tab from module scope until the extra column arrived. Left
      that way, a message typed in the off-topic column would have landed in main.
    */
    expect(composerModule).toContain(
      'async sendBody(body: string, bodyHtml?: string, room: ChatTab = this.#chat.tab) {'
    );
    // `room` rides on the command's argument now, not on a hand-built `FormData`.
    expect(composerModule).toContain(
      'await this.#commands.send({ body: trimmedBody, bodyHtml, room });'
    );
    expect(composerModule).toContain(
      'if (await this.sendBody(body, undefined, this.#chat.extraTab))'
    );
  });
});

describe('mentions reach the column you are in', () => {
  it('routes on BOTH terms the reference uses', () => {
    /*
      `preferences.extraChatColumn && (this.extraChatMsg || 'textAreaTxtExtra' === chatInputFocus)`.

      Two ways in, and the second is the one that is easy to miss: clicking a name in the MAIN log
      while composing in the extra column has to insert where you are typing, not where you clicked.
    */
    expect(chatClass).toContain('mentionTargetIsExtra(fromExtraColumn: boolean): boolean {');
    expect(chatClass).toContain(
      'return this.#extraColumnEnabled() && (fromExtraColumn || this.#focus === EXTRA_COMPOSER);'
    );
  });

  it('the extra column reports that its rows are ITS rows', () => {
    // `extraChatMsg` is true for every row that component renders.
    expect(pageCode).toContain("messageActions.handle('chat', action, message, event, true)");
  });

  it('and both composers report focus, or the flag would never move', () => {
    // The MAIN composer moved to `AlertChatArea.svelte` on 2026-08-15; the extra column's `onfocus`
    // is still supplied by the page, so the pair is now read from the two files that own them.
    const mainPane = readFileSync(
      new URL('./components/AlertChatArea.svelte', import.meta.url),
      'utf8'
    );
    expect(mainPane).toContain("onfocus={() => chat.focused('textAreaTxt')}");
    expect(pageCode).toContain('onfocus={() => chat.focused(EXTRA_COMPOSER)}');
  });

  it('the insert goes into the composer that was chosen', () => {
    expect(messageActionsModule).toContain('mention(name: string, toExtraColumn = false) {');
    expect(chatClass).toContain(
      "this.#extraComposer += `${this.#extraComposer ? ' ' : ''}@${name} `;"
    );
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
      'const extraChatColumnVisible = $derived(prefs.extraChatColumn && !split.chatCollapsed);'
    );
    expect(pageCode).toContain(
      '{#if !gates.hideChatAlerts && extraChatColumnVisible}{@render extraChatPane()}'
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
  /*
    RE-POINTED 2026-08-16, from `+page.svelte` to `ExtraChatPane.svelte`.

    The effect moved into the component that OWNS the scroller, which is what Svelte's
    best-practices page asks for and what `scroll-follow.ts` had already written down for its own
    reasons: *"the `tick()`-then-check dance around a scroller that may have been replaced
    mid-flight belongs where the element lives."* The element always lived here; the dance did not.

    Nothing about what these four assert changed — only which file is read. The `extraChatScroller`
    `let` on the page and the `onscrollerready` prop that fed it are both gone, because their only
    reader was the effect that left.
  */
  it('reads the scroller it owns', () => {
    expect(paneCode).toContain('const current = scroller;');
    expect(paneCode).toContain('if (scroller === current) onscrolltobottom(current);');
    // And the page no longer holds an element it cannot use.
    expect(pageCode).not.toContain('extraChatScroller');
  });

  it('scrolls on first view, on a channel switch, and on a new message', () => {
    /*
      RE-POINTED 2026-08-15. The three conditions used to be spelled out inline here as
      `!extraChatScrollInitialized`, `activeTab !== previousExtraChatTab` and
      `count > previousExtraChatCount`. All three moved into `RoomScrollFollow`, which is where they
      are now EXECUTED rather than read as text — `scroll-follow.test.ts` asserts each of the three
      by calling it.

      What remains this file's business is that the extra column still asks the question, and asks it
      with its own tab and its own count. Deleting the assertions instead would have been the
      vacuous-guard failure this repository has already shipped twice.
    */
    const from = paneCode.indexOf('const current = scroller;');
    expect(from, 'the extra column scroll effect is not in ExtraChatPane.svelte').toBeGreaterThan(
      -1
    );
    const effect = paneCode.slice(from, paneCode.indexOf('\n  });', from));
    expect(effect).toContain('follow.follows({');
    expect(effect).toContain('tab: activeTab');
    expect(effect).toContain('count,');
  });

  it('honours the reader’s own scroll position, using THIS column’s flag', () => {
    /*
      The assertion that matters. Passing `chatScrollingUp` here would let the main column's reader
      position decide whether the extra column jumps — the two are independent panes and a reader
      scrolled up in one must not be yanked by traffic in the other.

      Still a text assertion after the move, and deliberately so: `RoomScrollFollow` cannot check
      this. Which flag is handed in is the CALLER's decision, and the class would answer a question
      about the main column just as happily.
    */
    const from = paneCode.indexOf('const current = scroller;');
    expect(from, 'the extra column scroll effect is not in ExtraChatPane.svelte').toBeGreaterThan(
      -1
    );
    const effect = paneCode.slice(from, paneCode.indexOf('\n  });', from));
    /*
      The flag arrives as THIS column's prop, passed through in SHORTHAND — and the shorthand is the
      assertion rather than a detail of style.

      `toContain('readingHistory')` was the first version and its negative control came back GREEN:
      replacing the prop with `readingHistory: false` still contains the string, so the guard would
      have watched this column stop honouring the reader's scroll position and said nothing. That is
      the fifth control in this phase to expose a weak test rather than missing behaviour.

      A COLON here means a value is being supplied at the call rather than the prop being passed
      through, which is exactly the substitution that must not happen.
    */
    expect(effect).toContain('readingHistory');
    expect(effect).not.toContain('readingHistory:');
    expect(effect).not.toContain('chatScrollingUp');
    // And the page hands it THIS column's flag, not the main column's.
    expect(pageCode).toContain('readingHistory={feedScroll.extraChatReadingHistory}');
  });

  it('gets the SAME message chrome as the main column, which the capture requires', () => {
    /*
      CLOSED 2026-08-15, and it was a real defect rather than a tidy-up.

      `ExtraChatPane` declared twelve of the sixteen shared props and did NOT declare
      `usersPublicReply`, `enableReactions`, `enableEditMessage` or `enableEditAlerts` at all, so they
      fell to their `false` defaults. The same chat message carried a reaction bar and an edit entry
      in the main column and neither in this one.

      THE CAPTURE SETTLES IT, from the bundle rather than from an opinion about what a second column
      ought to be. `app-chat` and `app-extra-chat` are declared with the SAME const 212 in the room
      template, and the message component reads all four gates off the shared service keyed on
      `logType` alone — never off a per-column input:

        O(19, sessData.enableReactions && "chat" === logType || … ? 19 : -1)
        sessData.enableEditMessage && "chat" === logType && (this.canEditMessage = …)
        canPublicReply = "chat" === logType && … && (isPresenter || sessData.usersPublicReply)

      A message here is `logType === "chat"` exactly as one in the main column is. There is no
      per-column narrowing upstream to reproduce, so passing anything less than the whole chrome is
      the divergence.
    */
    expect(pageCode).toContain('chrome={messageChrome}');

    const component = readFileSync(
      new URL('./components/ExtraChatPane.svelte', import.meta.url),
      'utf8'
    );
    expect(component).toContain('chrome: RoomMessageChrome;');
    expect(component).toContain('{...chrome}');
    // The four that were missing cannot come back as narrowed props without this going red.
    for (const gate of [
      'usersPublicReply',
      'enableReactions',
      'enableEditMessage',
      'enableEditAlerts'
    ]) {
      expect(component).not.toContain(`${gate}:`);
    }
  });

  it('has its OWN RoomScrollFollow, not the main column’s', () => {
    /*
      Three instances, one per column. A shared instance would make "a message arrived here" into "a
      message arrived anywhere" through the marker state rather than through the effect graph —
      the same defect the separate-effect test below guards, arriving by a different door.
    */
    expect(pageCode).toContain('const alertsFollow = new RoomScrollFollow(');
    expect(pageCode).toContain('const chatFollow = new RoomScrollFollow<ChatTab>(');
    expect(pageCode).toContain('const extraChatFollow = new RoomScrollFollow<ChatTab>(');
    expect(pageCode.match(/new RoomScrollFollow/g) ?? []).toHaveLength(3);
  });

  it('is its own effect, not folded into the main chat’s', () => {
    /*
      One effect reading both columns would re-run each column's scroll logic whenever the other
      changed — "a message arrived anywhere" instead of "a message arrived here".
    */
    /*
      Since 2026-08-16 the two are not merely separate effects, they are in separate FILES — this
      column's went to `ExtraChatPane`, which owns its scroller. That is a stronger form of the same
      property and it is asserted as such: one effect per column, each reading only its own column's
      tab, count and reading-history flag.

      The main chat's is still on `+page.svelte` and is expected to follow into `AlertChatArea`,
      which owns ITS scroller. When it does, the first assertion here moves with it — and the
      property being guarded does not change.
    */
    const main = pageCode.indexOf('const scroller = chatScroller;');
    expect(main, 'the main chat scroll effect is not in +page.svelte').toBeGreaterThan(-1);
    expect(paneCode).toContain('const current = scroller;');
    // Neither reads the other's column: the extra pane cannot see the main chat's tab or flag.
    expect(paneCode).not.toContain('chat.tab');
    expect(paneCode).not.toContain('visibleChat');
  });
});
