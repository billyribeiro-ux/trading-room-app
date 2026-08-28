import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  `hideChatAlerts` and `hidePresentation` — the two flags that decide which COLUMNS the room draws.

  Both are pinned against the decoded component rather than a transcription of it: the writers are
  read out of `app-room.full.js` and the gates out of `app-room.render-helpers.js` at runtime, so a
  reference that says something different tomorrow makes this file say so rather than quietly agree.

  Why these two are one file: upstream they are set in ONE statement chain in `ngOnInit`
  (`full.js:1893-1907`) and consumed by adjacent nodes of the same split (`render-helpers.js:1650`
  and `:1662`). Splitting them into two files would hide that the `beforeunload` listener belongs to
  the second one — it is registered inside `hidePresentation`'s own `&&`, not beside it.
*/

const ROOM_FULL = readFileSync(
  new URL('../../docs/source/components/app-room.full.js', import.meta.url),
  'utf8'
);
const ROOM_HELPERS = readFileSync(
  new URL('../../docs/source/components/app-room.render-helpers.js', import.meta.url),
  'utf8'
);
const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
/*
  THE ROOM'S LAYOUT MOVED TO `RoomShell.svelte` on 2026-08-17 (Phase 5, S4+S8).

  The `as-split` element, the gutter, the mobile/desktop child ORDER and the two layout effects left
  `+page.svelte` for the component that owns them. The three panes did NOT: they are still built on
  the page and handed over as SNIPPETS, which is why every pane prop list and every pane contract is
  untouched by that move.

  Assertions about layout therefore read `SHELL`, and the ones that still read `PAGE` are the ones
  about what the page still decides. Where an assertion moved, the page is also asserted NOT to carry
  it any more — a second `as-split` would render the room twice and the positive half alone would
  stay green.
*/
const SHELL = readFileSync(new URL('./components/RoomShell.svelte', import.meta.url), 'utf8');
const ROOM_CONFIG_CLIENT = readFileSync(
  new URL('./server/room-config-client.ts', import.meta.url),
  'utf8'
);

/*
  `.room-sidebar` became `RoomSidebar.svelte` on 2026-08-15. The reference-bundle assertions are
  untouched; ours follow the markup into the component.
*/
const SIDEBAR = readFileSync(new URL('./components/RoomSidebar.svelte', import.meta.url), 'utf8');

/** Whitespace is the only thing that differs between the decode and a quotation of it. */
const compact = (source: string) => source.replace(/\s+/g, '');
const ROOM_FULL_COMPACT = compact(ROOM_FULL);
const ROOM_HELPERS_COMPACT = compact(ROOM_HELPERS);
const PAGE_COMPACT = compact(PAGE);
/*
  The sixteen view gates moved to `room/gates.ts` in Phase 5 slice 27. A DECLARATION is
  asserted there; a USE stays on the page or in a pane and carries the `gates.` prefix.
*/
const GATES_COMPACT = compact(
  readFileSync(new URL('./room/gates.ts', import.meta.url), 'utf8')
);
/*
  The `beforeunload` BODY moved to `RoomWindowHandlers` in Phase 5 slice 18; the binding stayed on
  `<svelte:window>`. So the post is asserted in the module and the listener in the page - both
  halves, because a body nobody binds and a binding with no body each look correct alone.
*/
const HANDLERS_COMPACT = compact(
  readFileSync(new URL('./room/window-handlers.ts', import.meta.url), 'utf8')
);

describe('hideChatAlerts is ONE flag, not one mechanism per writer', () => {
  it('is the sole gate on the chat/alerts column upstream', () => {
    // `O(1, e.hideChatAlerts ? -1 : 1)` — `app-room.render-helpers.js:1650`.
    expect(ROOM_HELPERS_COMPACT).toContain('O(1,e.hideChatAlerts?-1:1)');
  });

  it('also gates the extra chat column, which is why it cannot be a per-branch test', () => {
    /*
      `O(2, hideChatAlerts || !preferences.extraChatColumn || (roomSplitDir is neither ltr nor rtl)
      ? -1 : 2)` (`app-room.render-helpers.js:1652-1660`). The first term is the same flag, so a
      room that hides the column hides the extra one with it.
    */
    expect(ROOM_HELPERS_COMPACT).toContain(
      'O(2,e.hideChatAlerts||!e.appService.globals.preferences.extraChatColumn'
    );
  });

  it('has five writers upstream, and the room setting is the first of them', () => {
    // `this.hideChatAlerts = this.appService.globals.sessData.hideChatAlerts` — `full.js:1893`.
    expect(ROOM_FULL_COMPACT).toContain(
      '(this.hideChatAlerts=this.appService.globals.sessData.hideChatAlerts)'
    );
    // `isPlayer && isPresenter` — `:1894-1896`.
    expect(ROOM_FULL_COMPACT).toContain(
      'this.appService.globals.isPlayer&&this.appService.globals.isPresenter&&(this.hideChatAlerts=!0)'
    );
    // `videoOnlyMode && (hideChatAlerts = !recordChat && videoOnlyMode)` — `:1898-1900`.
    expect(ROOM_FULL_COMPACT).toContain(
      'this.appService.globals.videoOnlyMode&&(this.hideChatAlerts=!this.appService.globals.sessData.recordChat&&this.appService.globals.videoOnlyMode)'
    );
    // `viewerOnlyMode && (hideChatAlerts = viewerOnlyMode)` — `:1901-1902`.
    expect(ROOM_FULL_COMPACT).toContain(
      'this.appService.globals.viewerOnlyMode&&(this.hideChatAlerts=this.appService.globals.viewerOnlyMode)'
    );
    // The `detachChat` event — `:2179-2181`, the only writer outside `ngOnInit`.
    expect(ROOM_FULL_COMPACT).toContain(
      "this.appService.appEventBus.subscribe('detachChat',()=>{((this.hideChatAlerts=!0),(this.reopenAlertsChatBtn=!0));})"
    );
  });

  it('is one derived flag here, fed by the three sources this room can resolve', () => {
    expect(GATES_COMPACT).toContain('getviewerOnlyMode()');
    /* The three sources, still one expression: the room setting, the mode, and the detach. */
    expect(GATES_COMPACT).toContain(
      'gethideChatAlerts(){return(this.#session().sessData?.hideChatAlerts===true||this.viewerOnlyMode||this.#chatAlertsDetached());}'
    );
  });

  it('gates the column exactly once, and no branch tests a single writer directly', () => {
    /*
      The gate reads `hideChatAlerts` rather than `gates.hideChatAlerts` here, and the rename is the
      extraction rather than a change of meaning: `RoomShell` receives the RESOLVED boolean as a prop
      instead of reaching into the gates object. The page still computes it from `gates`, which the
      call-site assertion below pins, so the flag still has exactly one author.
    */
    expect(SHELL).toContain('{#if !hideChatAlerts}');
    expect(PAGE).toContain('hideChatAlerts={gates.hideChatAlerts}');
    // ONE `as-split`. A second would render the whole room twice.
    expect(PAGE, 'the split moved to RoomShell in S8').not.toContain('<as-split\n');
    /*
      The defect this replaced: `viewerOnlyMode` and `chatAlertsDetached` each had their own branch
      on this column, so the room SETTING had nowhere to be read and did nothing. Either name
      reappearing as a branch condition here means the flag has been split apart again.
    */
    expect(PAGE).not.toContain('{#if gates.viewerOnlyMode}');
    expect(PAGE).not.toContain('{:else if chatAlertsDetached}');
  });

  it('carries the setting across the boundary, with recordChat deliberately left off', () => {
    expect(ROOM_CONFIG_CLIENT).toContain('hideChatAlerts?: boolean;');
    /*
      `recordChat` appears ONLY inside the `videoOnlyMode` writer, and `videoOnlyMode` is the `r`
      query parameter this room does not model. Sending it would put a setting on the wire that
      nothing can read — the "no config nothing reads" rule, applied to a field that looks useful.
    */
    // The FIELD, not the word: the doc comment beside `hideChatAlerts` names `recordChat` to say
    // why it is absent, and an assertion that forbids the name forbids explaining the decision.
    expect(ROOM_CONFIG_CLIENT).not.toContain('recordChat?:');
  });
});

describe('hidePresentation gates the presentation column on the mode AND the setting', () => {
  it('is the gate upstream', () => {
    // `O(3, e.hidePresentation ? -1 : 3)` — `app-room.render-helpers.js:1662`.
    expect(ROOM_HELPERS_COMPACT).toContain('O(3,e.hidePresentation?-1:3)');
  });

  it('is set by chatOnlyMode OR the room-wide isChatOnlyRoom', () => {
    // `full.js:1903-1904`.
    expect(ROOM_FULL_COMPACT).toContain(
      '(this.appService.globals.chatOnlyMode||this.appService.globals.sessData.isChatOnlyRoom)&&((this.hidePresentation=!0)'
    );
  });

  it('binds both terms here, not the query parameter alone', () => {
    expect(PAGE_COMPACT).toContain(
      'consthidePresentation=$derived(chatOnlyMode||data.sessData?.isChatOnlyRoom===true)'
    );
    expect(SHELL).toContain('{#if !hidePresentation}');
    expect(PAGE).toContain('{hidePresentation}');
    expect(ROOM_CONFIG_CLIENT).toContain('isChatOnlyRoom?: boolean;');
  });

  it('registers beforeunload inside the same block, which is how the opener learns', () => {
    /*
      `window.addEventListener('beforeunload', () => { window.opener.postMessage('windowClosing',
      window.location.origin) })` — `full.js:1905-1907`, inside `hidePresentation`'s own `&&`.
    */
    expect(ROOM_FULL_COMPACT).toContain(
      "window.addEventListener('beforeunload',()=>{window.opener.postMessage('windowClosing',window.location.origin);})"
    );
    // Ours posts the same message and origin, gated on the mode that means "this is a popout".
    expect(HANDLERS_COMPACT).toContain(
      "window.opener?.postMessage('windowClosing',window.location.origin)"
    );
    // And the page still binds it, which is the half the module cannot show.
    expect(PAGE).toContain('onbeforeunload={() => windowHandlers.beforeUnload()}');
  });
});

describe('the reopen control is a sidebar item, where the bootbox says it is', () => {
  it('is node 25 of the sidebar upstream, gated on reopenAlertsChatBtn', () => {
    // `O(25, e.reopenAlertsChatBtn ? 25 : -1)` — `app-room.render-helpers.js:355`.
    expect(ROOM_HELPERS_COMPACT).toContain('O(25,e.reopenAlertsChatBtn?25:-1)');
    // `oPe` — `:76-87`: an `li` (const 19) holding an `a` (const 38) that calls `reopenAlertsChat`.
    expect(ROOM_HELPERS_COMPACT).toContain('E(g(2).reopenAlertsChat())');
  });

  it('uses the reference’s own title, classes and icon', () => {
    /*
      Const 38 is `['title', 'Reopen Alerts / Chat', 1, 'nav-link', 'sidebar-item', 3, 'click']` and
      const 39 is `[1, 'fas', 'fa-window-restore']` (`app-room.compiled.js:1416-1417`). Read from the
      component rather than typed in, so a different label upstream fails here.
    */
    const COMPILED = readFileSync(
      new URL('../../docs/source/components/app-room.compiled.js', import.meta.url),
      'utf8'
    );
    expect(compact(COMPILED)).toContain(
      "['title','ReopenAlerts/Chat',1,'nav-link','sidebar-item',3,'click']"
    );
    expect(SIDEBAR).toContain('title="Reopen Alerts / Chat"');
    expect(SIDEBAR).toContain('<span class="pl-2">Reopen Alerts / Chat</span>');
    expect(SIDEBAR).toContain('{#if chatAlertsDetached}');
    // Still fed from the page, which owns the detached window and the flag that tracks it.
    expect(PAGE).toContain('{chatAlertsDetached}');
  });

  it('no longer offers the reopen affordance inside the column the reference deletes', () => {
    // The old in-column panel. Upstream, detaching removes this column outright.
    expect(PAGE).not.toContain('Chat and alerts are open in another window.');
  });
});
