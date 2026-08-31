import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments.js';
/*
  The two scroll numbers moved to `private-chat-scroll.ts` on 2026-08-30, when the composer's
  image-upload path put `private-chat.svelte.ts` past its ceiling and the seam that entry had already
  named came due. The values are unchanged; only their home is.
*/
import { LOAD_MORE_OVERSCROLL_PX, PRIVATE_CHAT_RESCROLL_MS } from './room/private-chat-scroll.js';
import { TITLE_FLASH_MS } from './room/private-chat-title-flash.js';

/**
 * Seven rows of the `PrivateChatPanel` surface audit, and one defect none of them was looking for.
 *
 * | row | what it wanted |
 * | --- | --- |
 * | G6 | the tab strip reversed, so the newest conversation is first |
 * | G15 | the gravatar fallback, `?d=mm&s=25` in the header and `&s=32` in the list |
 * | G16 | the online dot answered from the roster instead of hard-coded false |
 * | G17 | the clear-search button clearing the input it sits beside |
 * | G18 | two independent gates where this had one wrapping both columns |
 * | G21 | the composer's four transcribed attributes, and the wrapper structure |
 * | G23 | the re-scroll delay, 500ms and not 60 |
 *
 * ## AND THE DEFECT: `avt` WAS THE MEMBER'S RAW EMAIL
 *
 * G15 asks for `pic || "https://secure.gravatar.com/avatar/" + avt + "?d=mm&s=32"`. Building it
 * against `avt` as it stood would have put **every member's email address into an outbound URL to
 * gravatar.com**, because `lib/server/private-chat.ts` filled that field with `sender.email` and
 * `peer.email`. `private-chat-delivery.test.ts` had already found and fixed that exact leak on the
 * live broadcast, and its assertion read one file — so the two READ paths shipped the address for
 * weeks. That contract now sweeps every producer of the field; this one covers the consumer.
 *
 * ## Four rows of this surface were ALREADY BUILT, and are marked by reading rather than rebuilt
 *
 * G2 (`.pc-messages` has no rule), G3 (`PAGE_SIZE = 50`), G4 (`hasMoreData` unmodelled) and G19 (no
 * loading badge) all describe a revision this panel has moved past: the rule is in
 * `captured-runtime-components.css` with an `app-privchatscroller` host rule beside it in `app.css`,
 * and the paging is `RoomLogPages` — `hasMoreData`, `loadingMore` and the component-owned counter
 * the audit said was missing. Verified against the source before anything was written, which is what
 * kept them from being built twice.
 */

const read = (path: string) => codeOf(path, readFileSync(new URL(path, import.meta.url), 'utf8'));

const PANEL = read('./components/PrivateChatPanel.svelte');
/*
  The composer became its own component on 2026-08-30, when G1's button column put the panel past its
  ceiling and the size ratchet's remedy is a slice rather than a bigger number. Nothing about the
  markup below changed in the move, which is why these assertions are re-pointed and not rewritten.
*/
const COMPOSER = read('./components/PrivateChatComposer.svelte');
const STATE = read('./room/private-chat.svelte.ts');
const SCROLL = read('./room/private-chat-scroll.ts');
const SERVER = read('./server/private-chat.ts');
const ROOM = read('./room/create-room.svelte.ts');

describe('the avatar', () => {
  it('falls back to a gravatar, at the size each site uses', () => {
    /*
      Two sizes, and both are the capture's: 25 in the header tab (byte 2,195,104), 32 in the list
      (2,196,585). One number for both would make one of them a scaled bitmap, since
      `app-privchat .avatarImg` and `.avatarImg-active` are fixed squares at exactly those numbers.
    */
    expect(PANEL).toContain('`https://secure.gravatar.com/avatar/${avt}?d=mm&s=${size}`');
    expect(PANEL).toContain('avatarSrc(peer.pic, peer.emailHash, 25)');
    expect(PANEL).toContain('avatarSrc(tab.pic, tab.avt, 32)');
  });

  it('prefers the member s own picture, which is the `||` and not a ternary on emptiness', () => {
    /* `e.pic || …` — an empty string is falsy, which is the whole mechanism. */
    expect(PANEL).toContain('return pic || `https://secure.gravatar.com/avatar/');
  });

  it('is fed a HASH by the server, never an address', () => {
    /*
      The defect. `avt` is the gravatar key — `md5` of the lowercased address — and the two read
      paths sent the raw email until 2026-08-30. `private-chat-delivery.test.ts` sweeps every
      producer; this asserts the two that were wrong, by name, so a revert is visible from here too.
    */
    expect(SERVER).toContain('avt: hashEmail(sender.email)');
    expect(SERVER).toContain('avt: hashEmail(peer.email)');
    expect(SERVER).not.toContain('avt: sender.email');
    expect(SERVER).not.toContain('avt: peer.email');
  });
});

describe('the tab strip', () => {
  it('reverses for DISPLAY and leaves the model ascending', () => {
    /*
      `pt(e.chatTabs.slice().reverse())` at byte 2,196,816. The model's order is the reference's own
      — `newMessage` splices a tab out and pushes it, so the most recent sits last — and every other
      reader of the getter expects that. Reversing the sort instead would have moved the divergence
      somewhere harder to see.
    */
    expect(PANEL).toContain('const orderedTabs = $derived([...tabs].reverse());');
    expect(PANEL).toContain('{#each orderedTabs as tab (tab.uid)}');
    /* A spread, because `reverse()` mutates the array the caller still holds. */
    expect(PANEL).not.toContain('tabs.reverse()');
  });

  it('answers the online dot from the roster, at the moment the strip recomputes', () => {
    /*
      `checkUserOnlineStatus` (byte 2,203,628) runs on `getRoster`, `onUserJoin` and `onUserLeave`.
      A function read inside the getter is the same thing without three subscriptions to keep in
      step — and it can go back to FALSE, which upstream's cannot: that function only ever writes
      `!0`, so a member who leaves stays lit until something rebuilds the tab list.
    */
    expect(STATE).toContain('onlineUserIds: () => ReadonlySet<number>;');
    expect(STATE).toContain('const online = this.#onlineUserIds();');
    expect(STATE).toContain('online: online.has(tab.uid)');
    expect(ROOM).toContain('onlineUserIds: () => new Set(roster.users.map((user) => user.id))');
  });

  it('reads the roster ONCE per recompute, not once per tab', () => {
    /* Upstream's nested loop is O(roster × tabs). A `Set` read once outside the map is O(tabs). */
    const at = STATE.indexOf('const online = this.#onlineUserIds();');
    expect(at, 'the read must exist').toBeGreaterThan(-1);
    const mapAt = STATE.indexOf('.map((tab) => ({', at);
    expect(mapAt, 'and it must come before the map').toBeGreaterThan(at);
    expect(STATE.slice(mapAt)).not.toContain('this.#onlineUserIds()');
  });
});

describe('the search box', () => {
  it('clears its own input, before it searches', () => {
    /*
      `x("click", function() { const o = It(6); o.value = ""; return E(s.onEnterSearchChat("")) })`
      at byte 2,195,340. This called `onsearch('')` alone, and the page passes `searchTerm` UNBOUND —
      so typing without submitting and then clicking clear changed no prop and left the text sitting
      beside results it did not produce.
    */
    const at = PANEL.indexOf('id="addon-chat-clear"');
    expect(at, 'the clear button must exist').toBeGreaterThan(-1);
    const closes = PANEL.indexOf('</span>', at);
    expect(closes, 'the button must be closed').toBeGreaterThan(at);
    const button = PANEL.slice(at, closes);
    expect(button).toContain("searchTerm = '';");
    expect(button.indexOf("searchTerm = '';")).toBeLessThan(button.indexOf("onsearch('')"));
  });

  it('writes the local state rather than reaching past the binding to the DOM', () => {
    /* `bind:value` owns the element; setting `.value` beside it is how the two disagree. */
    expect(PANEL).toContain('bind:value={searchTerm}');
    expect(PANEL).not.toContain('.value = ');
  });
});

describe('the two columns', () => {
  it('gates them independently, as `O(16, …), O(17, …)` does', () => {
    /*
      Byte 2,219,468. The window that makes it visible is between `openFromRoster` and
      `getAllPCLogs` returning: a selected peer, no tabs yet. This showed "No active chat" and no
      composer, then changed its mind.
    */
    /*
      ## THIS ASSERTION WAS HOLLOW ON ITS FIRST DRAFT, and its own negative control found it

      It read: slice from the gate to `.pc-logs`, then `toContain('{/if}')` and
      `not.toContain('{:else}')`. Deleting the gate's closing `{/if}` did not fail it, because the
      list column contains `{#if tab.unread > 0} … {/if}` and the slice could not tell an inner close
      from the gate's own.

      A pattern that cannot distinguish two shapes is a pattern that measures neither. The gate's
      close is asserted as the exact two lines it must be, and the `{:else}` check stays because the
      old structure had one — a single "No active chat" serving both columns.
    */
    expect(PANEL).toContain('      {/if}\n      <div class="pc-logs">');
    const listGate = PANEL.indexOf('{#if tabs.length > 0}');
    expect(listGate, 'the list gate must exist').toBeGreaterThan(-1);
    const logs = PANEL.indexOf('<div class="pc-logs">');
    expect(logs, 'the logs column must exist').toBeGreaterThan(-1);
    expect(PANEL.slice(listGate, logs), 'no shared else branch').not.toContain('{:else}');
  });
});

describe('the composer', () => {
  it('carries the four attributes the const table names', () => {
    /*
      `["name","txt-area","id","textAreaTxtPM","rows","1","spellcheck","true",
        "placeholder","Type your message here...",1,"txt-area","form-control",…]` — byte 2,217,341.

      `form-control` is the one that is not cosmetic: it gives the box its border, padding and focus
      ring inside `.textSendDiv`. `w-100`, which stood in its place, only made it wide.
    */
    expect(COMPOSER).toContain('name="txt-area"');
    expect(COMPOSER).toContain('spellcheck="true"');
    expect(COMPOSER).toContain('class="txt-area form-control"');
    expect(COMPOSER).toContain('placeholder="Type your message here..."');
    /*
      Three dots, and the two-dot version gone. Asserted as `here.."` — the closing quote is what
      makes the string a whole attribute value, so a three-dot placeholder does not match it. Without
      that quote the check would be vacuous: `here..` is a prefix of `here...`.
    */
    expect(COMPOSER).not.toContain('Type your message here.."');
    expect(COMPOSER).not.toContain('class="txt-area w-100"');
  });

  it('puts the flex row on the element the capture puts it on', () => {
    /*
      `["id","textAreaHolderPM",1,"textSendDiv"]` — no flex classes — with an inner `div.d-flex.mx-0`
      and a `div.flex-fill.px-0` around the textarea. The row was on the holder, which is where the
      button column (G1, still open) would have had nowhere to sit.
    */
    expect(COMPOSER).toContain('<div class="textSendDiv" id="textAreaHolderPM">');
    expect(COMPOSER).toContain('<div class="d-flex mx-0">');
    expect(COMPOSER).toContain('<div class="flex-fill px-0">');
    expect(COMPOSER).not.toContain('class="d-flex align-items-center textSendDiv"');
  });
});

describe('the re-scroll', () => {
  it('waits the reference s 500ms, read from the constant rather than restated', () => {
    /*
      `setTimeout(…, 500)` at byte 2,192,880. It was 60, which fires before avatars load and before a
      long message wraps — so it re-scrolled to the same wrong place and a conversation opened
      part-way up its own last message.
    */
    expect(PRIVATE_CHAT_RESCROLL_MS).toBe(500);
    expect(SCROLL).toContain('setTimeout(run, PRIVATE_CHAT_RESCROLL_MS);');
    expect(SCROLL).not.toContain('setTimeout(run, 60)');
  });

  it('scrolls immediately as well, which is what the second one is a correction to', () => {
    const at = SCROLL.indexOf('export function scrollPrivateChatToBottom()');
    expect(at, 'the function must exist').toBeGreaterThan(-1);
    const closes = SCROLL.indexOf('\n}', at);
    expect(closes, 'the function must be closed').toBeGreaterThan(at);
    const body = SCROLL.slice(at, closes);
    expect(body.indexOf('run();')).toBeLessThan(body.indexOf('setTimeout('));
  });
});

describe('the second cluster — G5, G7 and G14', () => {
  it('G5 — the side swap reads the preference the settings modal has always written', () => {
    /*
      `z("ngClass", ct(7, YDe, o.…preferences.pmLogsOnRight))` at byte 2,219,468, with
      `YDe = t => ({"flex-row-reverse": t})` at 2,194,594.

      The write existed and the read did not, which is the "control whose only effect is changing its
      own label" shape. `dead-preference-keys.ts` deliberately does not cover for this key, so
      nothing was excusing it either.
    */
    expect(PANEL).toContain("{ 'flex-row-reverse': pmLogsOnRight }");
    expect(PANEL).toContain('pmLogsOnRight: boolean;');
    /* The class, not two orderings of the markup: DOM order is the reading and tab order. */
    const body = PANEL.indexOf("'d-flex h-100 pc-body'");
    expect(body, 'the body must carry it').toBeGreaterThan(-1);
  });

  it('G5 — and the preference is now held, defaulting to the layout that already shipped', () => {
    const PREFS = read('./room/prefs.svelte.ts');
    expect(PREFS).toContain('this.#pmLogsOnRight = $state(loadedSettings.pmLogsOnRight === true);');
    /* `=== true`, not `!== false`: the neighbours default on, and this one must not flip anybody. */
    expect(PREFS).not.toContain('loadedSettings.pmLogsOnRight !== false');
    expect(PREFS).toContain("if (key === 'pmLogsOnRight') this.#pmLogsOnRight = value;");
  });

  it('G7 — the loading branches are NOT drawn, and the refusal is written down', () => {
    /*
      Upstream needs `getAllPCLogsLoading` because it POSTs `getAllPCLogs` on open. This room
      resolves the list in `+page.server.ts` and delivers it with the page, so there is no instant at
      which the strip exists and its contents are unknown — both branches could never render.

      Asserted as an ABSENCE plus the paragraph, because a refusal with no reason recorded is
      indistinguishable from an omission.
    */
    expect(STATE).not.toContain('getAllPCLogsLoading');
    expect(PANEL).not.toContain('Loading private chats');
    expect(PANEL).not.toContain('Loading all private chats');
    const raw = readFileSync(new URL('./room/private-chat.svelte.ts', import.meta.url), 'utf8');
    expect(raw, 'the reason must be recorded at the code').toContain(
      '`getAllPCLogsLoading` IS NOT MODELLED'
    );
  });

  it('G14 — Load More records the anchor BEFORE the request and restores after it', () => {
    /*
      `this.loadMoreLastID = "pcm-" + this.msgs[0]._id` then, on the response,
      `document.getElementById(this.loadMoreLastID).scrollIntoView(!0)` and `scrollTop - 20`.

      Without it the older page is inserted above the viewport and the scroll position stays where it
      was — a different message — so a reader was thrown backwards through history.
    */
    const at = STATE.indexOf('async loadMore()');
    expect(at, 'loadMore must exist').toBeGreaterThan(-1);
    const end = STATE.indexOf('\n  }', at);
    expect(end, 'loadMore must be closed').toBeGreaterThan(at);
    const body = STATE.slice(at, end);
    expect(body).toContain('`pcm-${anchor._id}`');
    expect(body.indexOf('this.#loadMoreAnchorId =')).toBeLessThan(
      body.indexOf('await this.loadLog')
    );
    expect(body.indexOf('await this.loadLog')).toBeLessThan(body.indexOf('restoreAfterLoadMore'));
  });

  it('G14 — overscrolls by the reference s own twenty pixels', () => {
    /*
      `scrollIntoView(true)` aligns the anchor to the very top, which hides the `Load More` badge and
      the last line of the page just fetched. Read from the constant rather than restated.
    */
    expect(LOAD_MORE_OVERSCROLL_PX).toBe(20);
    expect(SCROLL).toContain('box.scrollTop = box.scrollTop - LOAD_MORE_OVERSCROLL_PX;');
  });

  it('G14 — waits for the render that inserted the rows, with tick and not a timer', () => {
    /*
      The opposite choice from `scrollToBottom` in the same class, and the note says why: there the
      wait is for the BROWSER finishing layout after images arrive, which Svelte cannot await; here it
      is for Svelte inserting rows, which it knows exactly.
    */
    expect(SCROLL).toContain('await tick();');
  });
});

describe('the composer button column — G1, G11 and G13', () => {
  const COMPOSER_SRC = read('./components/PrivateChatComposer.svelte');
  /*
    `autoExpand` MOVED on 2026-08-31, to `private-composer-auto-expand.ts`, with its two paragraphs.
    `PrivateChatComposer.svelte` sat on its `source-size-contract` ceiling and the v4 audit batch
    (PCC-01…09) had markup to add, so the ratchet's own remedy applied: a slice comes out, the
    reasoning goes with it, and the tests that read it are re-pointed at the file that now owns the
    subject rather than left asserting against text that has gone. That last part is not optional —
    `source-size-contract`'s reader guard exists because two tests once fell out of it silently.
  */
  const AUTO_EXPAND_SRC = read('./private-composer-auto-expand.ts');

  it('has all three buttons, by the consts that name them', () => {
    /*
      `d(5,"div",56)(6,"span",57), T(7,"i",58), H(8,cEe,…,"span",59)(9,hEe,…,"span",60)` at byte
      2,198,563. The private composer was a textarea and nothing else, so a private conversation
      could carry no emoji, no image and no GIF — every one of which the main chat composer beside it
      has had since it was written.
    */
    expect(COMPOSER_SRC).toContain('textAreaBtnsCol');
    expect(COMPOSER_SRC).toContain('class="far fa-smile"');
    expect(COMPOSER_SRC).toContain('class="fas fa-image"');
    expect(COMPOSER_SRC).toContain('<span>GIF</span>');
  });

  it('gates the image and GIF on canPostImages and the emoji on NOTHING', () => {
    /*
      `O(8, i.canPostImages ? 8 : -1), O(9, i.canPostImages ? 9 : -1)` — and no such gate on the
      emoji span, which is the capture's split and the sensible one: an emoji is text.
    */
    const emoji = COMPOSER_SRC.indexOf("'ngb-popover-pm-emoji'");
    const gate = COMPOSER_SRC.indexOf('{#if canPostImages}');
    expect(emoji, 'the emoji button must exist').toBeGreaterThan(-1);
    expect(gate, 'and the gate must come after it').toBeGreaterThan(emoji);
    expect(COMPOSER_SRC.slice(gate)).toContain('class="fas fa-image"');
    expect(COMPOSER_SRC.slice(gate)).toContain('<span>GIF</span>');
  });

  it('opens one popover at a time, as a union and not two flags', () => {
    /*
      `toggleEmojiPanel` and `toggleGiphyPanel` are mutually exclusive in every composer in the
      bundle, and two booleans can represent a state that cannot happen.
    */
    expect(COMPOSER_SRC).toContain("let composerPopover = $state<'emoji' | 'giphy' | null>(null);");
  });

  it('carries the webinar notice with its tooltip verbatim', () => {
    /*
      Const 61, including the reference's own missing apostrophe in "everyones" and its trailing
      ellipsis. A tooltip tidied on the way in is a tooltip that no longer matches the capture.
    */
    expect(COMPOSER_SRC).toContain(
      'In webinar mode users only see their own chat messages, while Presenters see everyones messages...'
    );
    expect(COMPOSER_SRC).toContain('class="px-1 webinarMode"');
  });

  it('does NOT carry the RTE button, which is a recorded decision', () => {
    /* The reference puts `openRTEModal` on exactly two composers and private chat is not one. */
    expect(COMPOSER_SRC).not.toContain('openRTEModal');
    expect(COMPOSER_SRC).not.toContain('fa-font');
  });

  it('G11 — autoExpand resizes the LOG as well as the box, which the main composer s does not', () => {
    /*
      ```js
      e.style.height = o,
      querySelector(".pc-messages").style.height = `calc(100% - ${o} - 15px)`
      … "" === e.value.trim() && (e.style.height = "23px",
      querySelector(".pc-messages").style.height = "calc(100% - 50px)")
      ```

      `.pc-messages` is `calc(100% - 50px)` — fifty pixels reserved for a one-line composer — so a
      composer that grows without the log shrinking pushes the log's bottom off the panel, and the
      newest message disappears exactly when somebody is replying to it.
    */
    expect(AUTO_EXPAND_SRC).toContain('`calc(100% - ${height} - 15px)`');
    expect(AUTO_EXPAND_SRC).toContain("log.style.height = 'calc(100% - 50px)'");
    /* The `+ 2` is the capture's, and `+page.svelte` records why it is not padding for luck. */
    expect(AUTO_EXPAND_SRC).toContain('`${textarea.scrollHeight + 2}px`');
    expect(AUTO_EXPAND_SRC).toContain("textarea.style.height = '23px';");
    /* And the composer still calls it — an extraction nobody invokes is the other way this rots. */
    expect(COMPOSER_SRC).toContain('autoExpandPrivateComposer(textarea)');
  });

  it('G11 — finds THIS panel s log rather than the first one in the document', () => {
    /* `this.elementRef.nativeElement.querySelector` is component-scoped; `closest` is the same. */
    expect(AUTO_EXPAND_SRC).toContain("textarea.closest('app-privchat')?.querySelector");
    expect(AUTO_EXPAND_SRC).not.toContain("document.querySelector('.pc-messages')");
  });

  it('G11 — re-runs when the draft changes from anywhere, not only on input', () => {
    /*
      An emoji inserted, a send that cleared the box, a GIF URL put in and sent — the reference gets
      that half for free by calling `autoExpand` from each of those places.
    */
    expect(COMPOSER_SRC).toContain('$effect(() => {');
    expect(COMPOSER_SRC).toContain('untrack(autoExpand);');
    expect(COMPOSER_SRC).toContain('oninput={autoExpand}');
  });

  it('G13 — the refusal is the reference s sentence, and the authority is the room s', () => {
    /*
      `if (!this.canPost) return void bootbox.alert("Sorry, you can't post to this channel")` at byte
      2,208,062. There was no gate at all: a muted member typed, the server refused, and the refusal
      arrived as a generic failure rather than as the reason.

      `canPost` is INJECTED. The room already decides who may chat, and a second opinion computed in
      the panel is how two places come to disagree about one authority.
    */
    expect(STATE).toContain('canPost: () => boolean;');
    expect(STATE).toContain('this.#dialogs.alert = "Sorry, you can\'t post to this channel";');
    const at = STATE.indexOf('async send()');
    expect(at, 'send must exist').toBeGreaterThan(-1);
    const refusal = STATE.indexOf('if (!this.#canPost())', at);
    expect(refusal, 'the gate must be inside send').toBeGreaterThan(at);
    expect(refusal, 'and before anything is trimmed or sent').toBeLessThan(
      STATE.indexOf('const text = this.#draft.trim();', at)
    );
  });

  it('G1 — the image dialog is this conversation s OWN, not the chat composer s', () => {
    /*
      `RoomOverlays` already records the rule for the swing form: routing a feature's upload through
      the composer's handler posts the image into chat instead of into that feature. Here the cost of
      getting it wrong is larger — an image meant for one person would land in the room.
    */
    const OVERLAYS = read('./components/RoomOverlays.svelte');
    expect(OVERLAYS).toContain('{#if privateChat.imageUpload}');
    expect(OVERLAYS).toContain('void privateChat.completeImageUpload(files)');
    expect(STATE).toContain('beginImageUpload(): void {');
  });
});

describe('the tab-title flash — G27', () => {
  const FLASH = read('./room/private-chat-title-flash.ts');

  it('is where it belongs, and NOT on the page', () => {
    /*
      `moderator-message-contract.test.ts` keeps the other half of this: the page must not carry the
      flasher, because a second thing writing `document.title` gives no way to tell which won. This
      asserts it IS in the module that owns it, so the two together say where it may appear.
    */
    expect(FLASH).toContain('`${senderName} messaged you - ${roomName}`');
    expect(TITLE_FLASH_MS).toBe(2_000);
  });

  it('takes the room name as an argument rather than reading the title back', () => {
    /*
      The title is the thing being changed; reading it back would capture whichever half of the
      flash happened to be showing, and the restore would then leave the flashing text in place.
    */
    expect(FLASH).toContain(
      'export function startTitleFlash(senderName: string, roomName: string)'
    );
    expect(FLASH).toContain('export function stopTitleFlash(roomName: string)');
  });

  it('clears conditionally and restores unconditionally', () => {
    /*
      With no flash running, `stopTitleFlash` must leave the title alone — a panel closing must not
      overwrite a title something else had set. The restore inside is unconditional because
      assigning the same string is free; upstream's `document.title !== sessionName &&` only avoids
      a redundant DOM write.
    */
    const at = FLASH.indexOf('export function stopTitleFlash');
    expect(at, 'the function must exist').toBeGreaterThan(-1);
    const end = FLASH.indexOf('\n}', at);
    expect(end, 'the function must be closed').toBeGreaterThan(at);
    const body = FLASH.slice(at, end);
    expect(body.indexOf('if (timer === null) return;')).toBeLessThan(
      body.indexOf('document.title = roomName;')
    );
  });

  it('is gated on the message and the focus, in the class that has both', () => {
    expect(STATE).toContain('if (!isMine && !this.#composerHasFocus()) {');
    expect(STATE).toContain('startTitleFlash(message.n, this.#roomName());');
    /* Three stops, each transcribed from its own site: focus, tab close, panel close. */
    const stops = [...STATE.matchAll(/stopTitleFlash\(this\.#roomName\(\)\);/g)];
    expect(stops, 'onTextareaFocus, closeTab and closePanel').toHaveLength(3);
  });
});
