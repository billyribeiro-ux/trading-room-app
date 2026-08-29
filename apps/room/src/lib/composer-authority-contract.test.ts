import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';

import AlertChatArea from './components/AlertChatArea.svelte';

/*
  WHO GETS A COMPOSER, AND WHAT THEY GET IN IT — rendered, because "disabled" and "absent" are not
  the same thing and no source-text assertion can tell them apart.

  ## Why this is an authority contract and not a styling one

  `chatEnabled` is two rules in one value: `'d' != chatMode`, which applies to everyone, and this
  viewer's own mute, which does not. The component's own note records what it cost to get wrong:

  > The mute half was ENFORCED here long before it was ever shown — `sendMessage` refuses while a
  > live row exists — so a muted member typed, pressed send, and watched nothing happen with no
  > explanation anywhere.

  The server has always refused the message. What is asserted here is the other half: that a muted
  member is not handed a text box at all. A composer rendered-then-disabled is a different product —
  it invites the typing that the server will silently discard.

  ## Absence, specifically

  `{#if !chatEnabled} … {:else} <textarea id="textAreaTxt"> … ` — so the element is not in the
  document. A source assertion can prove that `{#if}` is written; it cannot prove the branch
  produces no `#textAreaTxt`, which is the only form of the claim a reader can rely on.

  ## SSR rather than a mount

  The question is markup. `{@attach}` never runs during SSR, which is what makes a 46-prop component
  affordable to render — no ResizeObserver on the composer, no scroller capture.
*/

const noop = () => undefined;

const renderArea = (over: {
  isPresenter?: boolean;
  chatEnabled?: boolean;
  selfMutedUntil?: Date | null;
  canPostImages?: boolean;
  canUseRTE?: boolean;
  webinarMode?: boolean;
}) =>
  render(AlertChatArea, {
    props: {
      split: { alertChatAreaStyle: '', chatAreaStyle: '', alertsAreaStyle: '' },
      alerts: { search: '', filterSelected: false, toolbarOpen: false, searchOnly: false },
      // The overlay this pane renders from. `null` is the ordinary case — no image pinned —
      // and the dismiss receiver is never reached by these assertions.
      broadcasts: { salesImageUrl: null, salesImageDismissed: noop },
      chat: {
        tab: 'main',
        composer: '',
        focused: noop,
        search: { isOpen: () => false, term: () => '', setTerm: noop, toggle: noop, clear: noop }
      },
      polls: { minimized: false, active: null },
      menus: { messageId: null, openMessageMenu: noop, emoji: false, giphy: false, set: noop },
      isPresenter: over.isPresenter ?? false,
      doNotDisturbOn: false,
      pollIsActive: false,
      alertFilterConfigured: false,
      alertFilterActive: false,
      chatOnlyMode: false,
      webinarMode: over.webinarMode ?? false,
      chatEnabled: over.chatEnabled ?? true,
      selfMutedUntil: over.selfMutedUntil ?? null,
      canPostImages: over.canPostImages ?? true,
      canUseRTE: over.canUseRTE ?? true,
      giphyApiKey: '',
      /* The typing indicator. Empty typists reads the same as nobody typing. */
      typists: [],
      showMessageOptions: false,
      visibleAlerts: [],
      visibleChatMessages: [],
      alertLabels: { alerts: 'Alerts', chat: 'Chat' },
      messageChrome: {
        currentUserId: 1,
        currentUserEmailHash: 'h',
        currentUserName: 'A',
        viewerIsPresenter: over.isPresenter ?? false,
        theme: 'dark',
        chatStyle: {},
        chatGif: true,
        chatBadges: true,
        enableBadges: false,
        showBadgesToPresentersOnly: false,
        disableStarYears: false,
        presenterMessagesOnTheRight: false,
        usersPublicReply: false,
        enableReactions: false,
        enableEditMessage: false,
        enableEditAlerts: false
      },
      followedUsers: {},
      captureAlertChatElement: noop,
      captureAlertsScroller: noop,
      captureComposerElement: noop,
      observeComposerWidth: noop,
      feedScroll: {
        alertsReadingHistory: false,
        chatReadingHistory: false,
        stopReadingHistory: noop,
        forceAlertsToBottom: noop,
        forceChatToBottom: noop,
        trackAlertsScroll: noop,
        trackChatScroll: noop
      },
      alertsFollow: { follows: () => false },
      chatFollow: { follows: () => false },
      viewerId: 1,
      onopenmodal: noop,
      onopenpoll: noop,
      ontogglealertstoolbar: noop,
      ontogglealertssearch: noop,
      ondetachalerts: noop,
      onsavealerts: noop,
      onarchivealerts: noop,
      onmessageaction: noop,
      onprivatechat: noop,
      onchatsearch: noop,
      onexpandcomposer: noop,
      onsend: noop,
      onimageupload: noop,
      onrte: noop,
      onselectgif: noop,
      onbeginsplit: noop
    } as never
  }).body;

describe('a viewer who may not post is not handed a composer', () => {
  it('renders the composer when chat is enabled — the positive control', () => {
    /*
      First, and by the id the capture uses. Every absence assertion below is meaningless until the
      presence case is shown to work: an area that failed to render passes all of them.
    */
    const html = renderArea({ chatEnabled: true });
    expect(html, 'the captured composer id').toContain('id="textAreaTxt"');
    expect(html, 'and no disabled block').not.toContain('Chat Disabled');
  });

  it('gives a muted viewer NO textarea at all, not a disabled one', () => {
    const html = renderArea({
      chatEnabled: false,
      selfMutedUntil: new Date('2026-08-18T12:00:00Z')
    });

    expect(
      html,
      'the element must be absent — a disabled box invites typing the server will discard'
    ).not.toContain('id="textAreaTxt"');
    expect(html, 'and the captured explanation takes its place').toContain('Chat Disabled');
  });

  it('distinguishes "the room turned chat off" from "you personally cannot post"', () => {
    /*
      `O(4, e.chatMutedTill ? 4 : -1)` — the `till …` span appears only for a personal mute. Without
      it both states render the same words, and a member whose ROOM disabled chat is told they are
      muted, which is a different and worse thing to be told.
    */
    const personal = renderArea({
      chatEnabled: false,
      selfMutedUntil: new Date('2026-08-18T12:00:00Z')
    });
    expect(personal, 'a personal mute says until when').toContain('till ');

    const roomWide = renderArea({ chatEnabled: false, selfMutedUntil: null });
    expect(roomWide, 'a room-wide disable says only that chat is off').toContain('Chat Disabled');
    expect(roomWide, 'and must not imply a personal mute').not.toContain('till ');
  });
});

describe('what a viewer gets INSIDE the composer is gated too', () => {
  /*
    `(isPresenter || sessData.userUploads) && (canPostImages = !0)` — one flag gates BOTH the image
    upload and the GIF picker, which is why a member's composer had the emoji button and nothing
    else when this was `isPresenter` alone.
  */
  /*
    Identified by the CAPTURED TOOLTIP TEXT rather than by an icon class, and that is a correction:
    a first draft asserted `fa-camera` and `fa-pen-nib`, neither of which is in this markup. The
    icons are `fas fa-image` and `fas fa-font`. Guessing a class name to make a test read nicely is
    the invented-value failure this repository forbids, and it went red immediately — the tooltip
    strings are transcribed from the capture and cannot be confused with a sibling control.
  */
  it('withholds the image and GIF controls when `canPostImages` is false', () => {
    const without = renderArea({ canPostImages: false });
    const permitted = renderArea({ canPostImages: true });

    // Proven by DIFFERENCE too, so no assertion here can pass on a composer that failed to render.
    expect(permitted.length, 'the permitted render must be the larger one').toBeGreaterThan(
      without.length
    );

    expect(without, 'no image upload').not.toContain('Upload an Image');
    expect(without, 'and no GIF picker — one flag gates BOTH').not.toContain('Search for GIFs');
    expect(permitted).toContain('Upload an Image');
    expect(permitted).toContain('Search for GIFs');
  });

  it('withholds the rich-text control when `canUseRTE` is false', () => {
    const without = renderArea({ canUseRTE: false });
    const permitted = renderArea({ canUseRTE: true });

    expect(permitted.length).toBeGreaterThan(without.length);
    expect(without).not.toContain('Rich Text Editor');
    expect(permitted).toContain('Rich Text Editor');
  });

  it('withholds the presenter-only YouTube control from a member', () => {
    // `{#if isPresenter}` on the `play-youtube-modal` trigger, beside the two gated above.
    expect(renderArea({ isPresenter: false })).not.toContain('play-youtube-modal');
    expect(renderArea({ isPresenter: true })).toContain('play-youtube-modal');
  });
});
