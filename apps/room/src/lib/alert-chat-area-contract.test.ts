// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { mount, unmount } from 'svelte';
import { describe, expect, it } from 'vitest';

import ChatTabStrip from './components/ChatTabStrip.svelte';
import { codeOf } from './source-comments';

/**
 * `acA-04`, `acA-06`, `acA-07`, `acA-11`, `acA-12` — the alerts/chat column, read from the bundle.
 *
 * `acA-05` was already built when its row was written and `acA-08` belongs to
 * `extra-chat-column-contract.test.ts`, which owns the second column's placement. What is left is
 * one surface: the header of each column, the toolbar under it, and one gate inside the alerts one.
 *
 * Every assertion here reads code with its comments stripped — `codeOf` — because this file quotes
 * the very strings it asserts, and a `toContain` that a docblock can satisfy is not a test. That
 * mistake has been made four times in this repository.
 */

const read = (name: string) => readFileSync(new URL(name, import.meta.url), 'utf8');

const PANE = 'components/AlertChatArea.svelte';
const STRIP = 'components/ChatTabStrip.svelte';
const BAR = 'components/ChatSearchBar.svelte';

const pane = codeOf(PANE, read('./components/AlertChatArea.svelte'));
const strip = codeOf(STRIP, read('./components/ChatTabStrip.svelte'));
const bar = codeOf(BAR, read('./components/ChatSearchBar.svelte'));
const chatClass = read('./room/chat.svelte.ts');
const searchClass = read('./room/chat-search.svelte.ts');
const events = read('./room/events.svelte.ts');

/**
 * The `{#if}` block that starts at `at`, sliced by counting its own opens and closes.
 *
 * A PROXIMITY check is what this replaces, and the difference is not academic: five contract tests
 * in this repository asserted "the marker appears within N characters of the gate", every one of
 * them passed against markup where the marker sat AFTER the block had closed, and each was found
 * only when somebody moved the code. A block that does not balance returns the empty string, so a
 * malformed template fails loudly rather than matching everything.
 */
function ifBlockAt(source: string, at: number): string {
  let depth = 0;
  let cursor = at;
  while (cursor < source.length) {
    const open = source.indexOf('{#if', cursor);
    const close = source.indexOf('{/if}', cursor);
    if (close === -1) return '';
    if (open !== -1 && open < close) {
      depth++;
      cursor = open + 4;
      continue;
    }
    depth--;
    if (depth === 0) return source.slice(at, close + 5);
    cursor = close + 5;
  }
  return '';
}

describe('acA-07 — the alerts archive control drops nobody by half a gate', () => {
  /*
    `O(2, e.appService.globals.isPresenter && !e.appService.globals.isLimitedPresenter ? 2 : -1)`
    at bundle byte 2,043,456.

    The file's own comment had stated the full gate since the block was written and the code applied
    half of it — the shape `CLAUDE.md` names outright: "every comment claiming X is
    bounded/constant/checked still matches the next line". A member handed mic and screen at runtime
    satisfies `isPresenter` (`giveMicScreen` assigns `globals.user.isPresenter =
    globals.isLimitedPresenter = e.give`) and was being offered a control the reference withholds.
  */
  it('gates the archive button on BOTH terms', () => {
    const at = pane.indexOf('{#if isPresenter && !isLimitedPresenter}');
    expect(at, 'the two-term gate is gone').toBeGreaterThan(-1);
    const block = ifBlockAt(pane, at);
    expect(block, 'the gate does not close').not.toBe('');
    expect(block).toContain('id="addon-chat-messages-archive"');
  });

  it('takes the second term as a PROP, never deciding the role for itself', () => {
    expect(pane).toContain('isLimitedPresenter?: boolean;');
    expect(pane).toContain('isLimitedPresenter = false,');
    const page = codeOf('routes/+page.svelte', read('../routes/+page.svelte'));
    expect(page).toContain('isLimitedPresenter={media.limitedPresenter}');
  });
});

describe('acA-11 — a room with no channels says "Chat" and draws no empty strip', () => {
  /*
    ```js
    function j_e(t,n){1&t&&(d(0,"span"),v(1,"\xa0Chat"),u())}                   // byte 1,420,732
    O(5, 0 == o.chatTabs.length ? 5 : -1)                                       // byte 1,453,850
    O(7, o.chatTabs.length ? 7 : -1)                                            // byte 1,453,947
    ```

    Two halves of one behaviour: the strip is what normally names the column, so when there is no
    strip the brand grows the label instead. Neither reads right alone — without the first, a room
    with no channels showed a bare comment glyph; without the second, an empty styled `nav-tabs`
    list with padding and a border and nothing in it.
  */
  it('shows the label only when there are no channels', () => {
    expect(pane).toContain('{#if chatTabs.length === 0}<span>&nbsp;Chat</span>{/if}');
  });

  it('suppresses the whole list in the same case', () => {
    const at = strip.indexOf('{#if tabs.length > 0}');
    expect(at, 'the presence gate is gone').toBeGreaterThan(-1);
    const block = ifBlockAt(strip, at);
    expect(block).toContain('<ul role="tablist"');
    expect(block).toContain('{/each}');
  });

  it('renders nothing at all for an empty tab list', () => {
    const target = document.createElement('div');
    document.body.append(target);
    const component = mount(ChatTabStrip, { target, props: { tabs: [], active: 'main' } });
    expect(target.querySelector('ul')).toBeNull();
    void unmount(component);
    target.remove();
  });
});

describe('acA-12 — the whole nav-item is the hit target, not the anchor inside it', () => {
  /*
    ```js
    d(11,"li",12), x("click", () => o.toggleAlertsToolbarSearchOnly()),
      d(12,"a",13), T(13,"i",14), u()(),
    d(14,"li",15), x("click", () => o.toggleAlertsToolbar())                    // byte 2,055,851

    12 [1,"nav-item","mx-1",3,"click"]      13 ["title","Search",1,"nav-link","p-0"]
    ```

    Const 13 carries NO click, so upstream the `mx-1` margin is part of what you can press. Here it
    was dead space on a control people hit many times a session.

    The private-chat button is bound on the `<a>` in BOTH applications (`W_e` at 1,421,660), which is
    why the last assertion exists: the difference is specific to these two toggles, and a later
    "consistency" pass that moved the PM click to its `<li>` would be undoing a measurement.
  */
  it('binds all four toolbar toggles on the <li>', () => {
    for (const handler of [
      'onclick={ontogglealertssearch}',
      'onclick={ontogglealertstoolbar}',
      "onclick={() => chat.search.toggle('main')}",
      "onclick={() => chat.search.toggleExtended('main')}"
    ]) {
      const at = pane.indexOf(handler);
      expect(at, `${handler} is gone`).toBeGreaterThan(-1);
      /*
        The handler must belong to the `<li>` that opens before it and not to any element between:
        the slice back to the nearest `<` is that element's tag.
      */
      const tagAt = pane.lastIndexOf('<', at);
      expect(tagAt, `${handler} has no element around it`).toBeGreaterThan(-1);
      expect(pane.slice(tagAt, tagAt + 4), `${handler} is not on an <li>`).toMatch(/^<li\s/);
    }
  });

  it('leaves the private-chat button bound on its anchor, because the capture does', () => {
    const at = pane.indexOf('onclick={onprivatechat}');
    expect(at, 'the PM button is gone').toBeGreaterThan(-1);
    const tagAt = pane.lastIndexOf('<', at);
    expect(tagAt, 'the PM handler has no element around it').toBeGreaterThan(-1);
    expect(pane.slice(tagAt, tagAt + 3)).toMatch(/^<a\s/);
  });
});

describe('acA-06 — the per-tab unread badge', () => {
  /*
    ```js
    function H_e(t,n){ … d(0,"span",29) … Ne(" ",i.unreadMentions[e.name],")") }   // 1,420,857
    function $_e(t,n){ … d(0,"span",28),v(1),H(2,H_e,2,1,"span",29) …
      Ne("",i.unreadMsgs[e.name]," "),
      O(2, i.appService.globals.isPresenter && i.unreadMentions[e.name] ? 2 : -1) } // 1,420,987
    O(3, i.unreadMsgs[e.name] || i.unreadMentions[e.name] ? 3 : -1)                 // 1,421,206

    28 = [1,"badge","badge-pill","badge-warning","ml-1","counterBadge"]  29 = [1,"text-danger"]
    ```

    `app-chat .counterBadge` is a real rule in `captured-runtime-components.css` (line 7,759) that
    had no element to style until this row.
  */
  it('carries the captured classes', () => {
    expect(strip).toContain('class="badge badge-pill badge-warning ml-1 counterBadge"');
    /* Prettier breaks the attribute onto its own line; the assertion follows the file. */
    expect(strip).toContain('class="text-danger">({counts.mentions})</span');
  });

  it('reads each tab ONCE per render', () => {
    /*
      Five calls to `unreadFor` per tab per render is what a naive transcription produces.

      `tab.name` since 2026-09-02: the strip takes full `ChatTab` objects now rather than names,
      because `altGenChannelName` / `altOffTopicChannelName` let an owner rename the two built-ins
      and a label stopped being derivable from a name. The unread map is still keyed by NAME — it is
      keyed by `messages.room` — so the read narrows here and nowhere else.
    */
    expect(strip).toContain('{const counts = $derived(unreadFor(unread, tab.name))}');
  });

  it('states the presenter gate once, at the COUNT and not again at the badge', () => {
    /*
      Upstream states `globals.isPresenter` twice — deciding whether to count, and deciding whether
      to draw — so the second can never differ from the first. A strip that took the role of its own
      would be a second authority on a question the server already answered.
    */
    expect(chatClass).toContain('const mention = options.isMention && options.countMentions;');
    expect(strip).not.toContain('isPresenter');
  });

  it('counts from the SSE frame, above the own-sender guard', () => {
    /*
      Upstream's `chatMsg` subscription has no sender filter, and the guard below it is about a
      refetch rather than about what has been read. A message typed into the extra column arrives on
      a channel the main column may not be showing, and moving the count below the guard would drop
      exactly that one.
    */
    const counted = events.indexOf('this.#chat?.chatArrived(');
    const guard = events.indexOf('if (payload.data?.senderId === this.#session().user.id) return;');
    expect(counted, 'nothing counts an arrival').toBeGreaterThan(-1);
    expect(guard, 'the own-sender guard is gone').toBeGreaterThan(-1);
    expect(counted).toBeLessThan(guard);
    expect(events).toContain('countMentions: this.#isPresenter()');
  });
});

describe('acA-04 — Mod Only', () => {
  /*
    ```js
    43 ["placement","top","ngbTooltip","Show only Moderators messages",
        1,"form-check","text-white","d-inline-block","m-1","mt-2"]
    44 ["type","checkbox","id","mod-only",1,"form-check-input",3,"ngModelChange","change","ngModel"]
    45 ["for","mod-only",1,"form-check-label"]                                    // byte 1,450,283
    ```

    Rendered inside `X_e`, which `J_e` gates on `showChatToolbarExtended` (byte 1,424,325) — a flag
    this room deliberately did not hold while nothing in the extended bar was built.
  */
  it('renders the checkbox in the extended toolbar', () => {
    const at = bar.indexOf('{#if extended}');
    expect(at, 'the extended section is gone').toBeGreaterThan(-1);
    const block = ifBlockAt(bar, at);
    expect(block).toContain('class="form-check text-white d-inline-block m-1 mt-2"');
    expect(block).toContain('title="Show only Moderators messages"');
    expect(block).toContain('class="form-check-input"');
    expect(block).toContain('class="form-check-label"> Mod Only </label>');
  });

  it('gives each column its own id, because the capture ships a duplicate', () => {
    /*
      `"mod-only"` occurs four times in the bundle — twice for `app-chat` and twice for
      `app-extra-chat` — so a room with both bars open has two elements with one id and the extra
      column's `<label for>` operates the main column's checkbox. A functional break, not a cosmetic
      one, which is why this is the row's one divergence.
    */
    expect(bar).toContain(
      "const modOnlyId = $derived(column === 'extra' ? 'mod-only-extra' : 'mod-only');"
    );
    expect(bar).toContain('id={modOnlyId}');
    expect(bar).toContain('for={modOnlyId}');
  });

  it('holds the extended flag now that something reads it', () => {
    /*
      `toggleChatToolbarSearchOnly` (1,435,310) and `toggleChatToolbar` (1,435,047), both
      transcribed. The `||` in the first is easy to misread: an open EXTENDED bar collapses to
      search-only rather than closing.
    */
    expect(searchClass).toContain('#extended = $state({ main: false, extra: false });');
    expect(searchClass).toContain(
      'const collapsing = this.#open[column] && this.#extended[column];'
    );
    expect(searchClass).toContain('toggleExtended(column: ChatColumn): void {');
  });

  it('is the CHAT gear that opens it, which is what the reference binds', () => {
    expect(pane).toContain("onclick={() => chat.search.toggleExtended('main')}");
    const page = codeOf('routes/+page.svelte', read('../routes/+page.svelte'));
    expect(page).toContain("ontoggletoolbar={() => chat.search.toggleExtended('extra')}");
  });
});
