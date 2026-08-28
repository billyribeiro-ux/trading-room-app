import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  CHAT_DISPLAY_MODES,
  CHAT_DISPLAY_MODE_KEYS,
  DEFAULT_CHAT_DISPLAY_MODE,
  hideMessageAvatar,
  isChatDisplayMode,
  resolveChatDisplayMode
} from '#lib/chat-display-mode.js';
import { messageMenuAllows, sourceMessageBehavior } from '#lib/message-behavior.js';
import { DEAD_PREFERENCE_KEYS } from '#lib/dead-preference-keys.js';

/*
  ── `altChatRender`, AND THE COMPACT RENDERER IT NEEDED UNDERNEATH IT ──────────────────────────────

  One checkbox, three behaviours, six reads in the bundle. It forces `displayMode = 'c'` on the chat
  columns (byte 1,434,685), the alerts log (2,047,129) and the Q&A thread (2,335,599) — writing the
  preference as it goes — and it is the first term of `hideAvatar` on chat and the Q&A thread but
  NOT on the alerts log (1,349,065).

  Two of the three were unbuildable until the room had a compact renderer at all, which is what the
  triage meant by sizing this row at the MODE rather than at the setting. `app-st-compactmessage`
  is that renderer: the same twelve-entry kebab as the card, laid out on one line, in two mirrored
  variants.

  THE MENU IS SHARED, NOT COPIED. `MessageMenu.svelte` came out of `RoomMessage.svelte` so that both
  layouts raise the same twelve gates — twelve entitlement rules written out twice is the failure
  `room-message-chrome.ts` exists to prevent. That extraction is verified by
  `room-message-render.test.ts`, which pins all 18 captured kebabs with their exact labels and source
  order and was run green either side of the move.
*/

/* ───────────────────────────── the mode resolver ───────────────────────────── */

describe('resolveChatDisplayMode', () => {
  it('forces compact when the owner ticked the setting, and persists it', () => {
    // `if (sessData.altChatRender) { this.displayMode = "c"; setPreference(key, "c") }`
    expect(resolveChatDisplayMode(true, undefined)).toEqual({ mode: 'c', persist: 'c' });
    expect(resolveChatDisplayMode(true, 'r'), 'the owner beats the stored value').toEqual({
      mode: 'c',
      persist: 'c'
    });
  });

  it('reads the stored value otherwise, and writes it back', () => {
    /*
      The else branch persists what it read, which seeds the key on a first load. Upstream's own
      behaviour and reproduced — `chat-display-mode.ts` says why.
    */
    expect(resolveChatDisplayMode(false, 'c')).toEqual({ mode: 'c', persist: 'c' });
    expect(resolveChatDisplayMode(false, 'r')).toEqual({ mode: 'r', persist: 'r' });
    expect(resolveChatDisplayMode(false, undefined)).toEqual({ mode: 'r', persist: 'r' });
  });

  /*
    THE COLLISION, AND IT IS THE REASON THIS FUNCTION VALIDATES.

    Upstream stores the display mode under `preferences.chatMode` and reads the ROOM's chat policy
    from `sessData.chatMode` — two stores, one key. **This room has written the wrong one under it:**
    the settings modal's three-way radio called `onPreferenceChange('chatMode', 'g' | 'p' | 'd')` for
    as long as it existed and nothing read it back (`chat-mode.remote.ts` records the whole defect).
    Every account that touched that control is carrying one of those three values right now.

    So a stale room-policy value must read as ABSENT. The literal transcription of the reference's
    template — `"r" == displayMode ? card : compact` — would have handed the compact log to every one
    of those accounts on the first load after this feature shipped.
  */
  it.each(['g', 'p', 'd'])(
    'reads the stale room-policy value %o as absent, not as compact',
    (stale) => {
      expect(resolveChatDisplayMode(false, stale)).toEqual({ mode: 'r', persist: 'r' });
    }
  );

  it.each([null, 0, 1, true, {}, [], 'R', 'C', 'compact', 'regular'])(
    'and so does %o',
    (stored) => {
      expect(resolveChatDisplayMode(false, stored)).toEqual({ mode: 'r', persist: 'r' });
    }
  );

  it('recognises exactly the two the reference uses', () => {
    expect([...CHAT_DISPLAY_MODES]).toEqual(['r', 'c']);
    expect(DEFAULT_CHAT_DISPLAY_MODE).toBe('r');
    expect(isChatDisplayMode('r')).toBe(true);
    expect(isChatDisplayMode('c')).toBe(true);
    expect(isChatDisplayMode('g')).toBe(false);
  });

  it('keys the two surfaces the way the reference does', () => {
    /*
      `loadChatMode` against `chatMode`, `loadAlertsMode` against `alertsMode` — and the Q&A modal
      calls `loadAlertsMode()` rather than having a third key, so the thread follows the alerts log.
    */
    expect(CHAT_DISPLAY_MODE_KEYS).toEqual({ chat: 'chatMode', alerts: 'alertsMode' });
  });
});

/* ───────────────────────────── the avatar term ───────────────────────────── */

describe('hideMessageAvatar', () => {
  const base = {
    altChatRender: false,
    hideAvatars: false,
    kind: 'chat' as const,
    isQaMessage: false
  };

  it('hides on chat and in the Q&A thread when the owner ticked altChatRender', () => {
    expect(hideMessageAvatar({ ...base, altChatRender: true })).toBe(true);
    expect(
      hideMessageAvatar({ ...base, altChatRender: true, kind: 'alert', isQaMessage: true })
    ).toBe(true);
  });

  /*
    AND NOT ON THE ALERTS LOG, which is the term most likely to be "fixed" by somebody reading the
    setting's name. `("chat" === logType || isQAMsg)` is upstream's own gate: an owner who ticks
    `altChatRender` keeps avatars on alerts. `hideAvatars` is the control that means everywhere.
  */
  it('but NOT on the alerts log', () => {
    expect(hideMessageAvatar({ ...base, altChatRender: true, kind: 'alert' })).toBe(false);
  });

  it('and hideAvatars hides everywhere, on its own', () => {
    for (const kind of ['chat', 'alert'] as const) {
      expect(hideMessageAvatar({ ...base, hideAvatars: true, kind })).toBe(true);
    }
  });

  it('showing the avatar when neither term is set', () => {
    expect(hideMessageAvatar(base)).toBe(false);
    expect(hideMessageAvatar({ ...base, kind: 'alert' })).toBe(false);
  });
});

/* ───────────────────────────── the shared menu ───────────────────────────── */

const BEHAVIOR_INPUT = {
  kind: 'chat' as const,
  viewerIsPresenter: true,
  viewerIsLimitedPresenter: false,
  isOwnMessage: false,
  isAdminMessage: false,
  allowDeleteOwnMessage: false,
  usersPublicReply: true,
  userPrivateMessaging: true,
  userToPresenterPrivateMessaging: false,
  disablePrivateMessagingForTrials: false,
  currentUserIsTrial: false,
  enableReactions: true,
  enableQaReactions: false,
  isQaMessage: false,
  enableEditMessage: true,
  enableEditAlerts: false
};

describe('messageMenuAllows', () => {
  /*
    The twelve gates as one object, so the two renderers cannot disagree about any of them. It was
    twelve near-identical three-line derivations inside `RoomMessage.svelte`; copying that block into
    the compact renderer would have been twelve entitlement rules written out twice.
  */
  it('maps every behaviour field onto the label it guards', () => {
    const behavior = sourceMessageBehavior(BEHAVIOR_INPUT);
    const allows = messageMenuAllows(behavior, undefined);

    expect(allows.delete).toBe(behavior.deleteMessage);
    expect(allows.mute).toBe(behavior.muteMessage);
    expect(allows.user).toBe(behavior.openUserInfo);
    expect(allows.mention).toBe(behavior.mention);
    expect(allows.showAll).toBe(behavior.showToAll);
    expect(allows.report).toBe(behavior.openAlertReport);
    expect(allows.reply).toBe(behavior.publicReply);
    expect(allows.answered).toBe(behavior.markAnswered);
    expect(allows.reaction).toBe(behavior.react);
    expect(allows.edit).toBe(behavior.edit);
    expect(allows.copy).toBe(behavior.copy);
    expect(allows.private).toBe(behavior.privateMessage);
  });

  it('and a captured menu still overrides every one of them', () => {
    /*
      `capturedMenuAllows` is what makes a captured fixture's own menu authoritative over the derived
      rule. Collapsing the twelve derivations into one function had to keep that, and this is the
      assertion that says so: a captured list naming only `Copy` leaves exactly `copy` true.
    */
    const behavior = sourceMessageBehavior(BEHAVIOR_INPUT);
    const allows = messageMenuAllows(behavior, ['Copy']);
    expect(allows.copy).toBe(true);
    expect(allows.delete).toBe(false);
    expect(allows.user).toBe(false);
    expect(allows.mention).toBe(false);
  });
});

const menuSource = readFileSync(
  new URL('./components/MessageMenu.svelte', import.meta.url),
  'utf8'
);
const messageSource = readFileSync(
  new URL('./components/RoomMessage.svelte', import.meta.url),
  'utf8'
);

/** Both comment syntaxes — a `.svelte` file has HTML comments AND block comments in its script. */
const codeOf = (source: string) =>
  source.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

describe('the three captured trigger classes', () => {
  /*
    Written out rather than composed, because they are not variations on a theme — the compact pair
    MIRRORS (admin opens left, member opens right) and the regular one does neither and carries
    `pt-1`. `room-message-render.test.ts` asserts the first against the captured DOM; these three
    assertions are what stop a fourth being invented at a call site.
  */
  it('are pinned in one lookup', () => {
    const code = codeOf(menuSource);
    expect(code).toContain("regular: 'msgMenu dropright pt-1'");
    expect(code).toContain("compactAdmin: 'msgMenu dropleft float-right align-baseline'");
    expect(code).toContain("compactMember: 'msgMenu dropright float-left align-baseline'");
  });

  it('and the renderer picks the compact pair by the SAME rule that mirrors the row', () => {
    const code = codeOf(messageSource);
    expect(code).toContain("variant={reverseMessage ? 'compactAdmin' : 'compactMember'}");
    expect(code).toContain('variant="regular"');
  });
});

/* ───────────────────────────── the compact layout ───────────────────────────── */

describe('the compact renderer', () => {
  const code = codeOf(messageSource);

  it('is gated on the mode, not on a setting it reads itself', () => {
    expect(code).toContain("{#if displayMode === 'c'}");
    expect(code, 'the mode is resolved per surface and handed down').not.toContain(
      'sessData?.altChatRender'
    );
  });

  it('draws the two mirrored roots the capture has', () => {
    /*
      `msg-box msg-box-adm` inside `w-100 h-100 d-flex flex-row-reverse` for the admin row (template
      `z1e`), and plain `msg-box` inside `w-100 h-100 d-inline-block` for the member row (`b_e`).
      They share almost nothing but `msg-box`, which is why both are written out.
    */
    expect(code).toContain("reverseMessage ? 'msg-box msg-box-adm' : 'msg-box'");
    expect(code).toContain(
      "reverseMessage ? 'w-100 h-100 d-flex flex-row-reverse' : 'w-100 h-100 d-inline-block'"
    );
  });

  it('brackets its timestamp, which the card does not', () => {
    /*
      ` [{h:mm a}] ` against the card's bare `hh:mm a` — both the capture's own, and they differ by a
      leading zero as well as by the brackets. `compactTimeFormatter` is the second formatter.
    */
    expect(code).toContain('compactTimeFormatter.format(item.createdAt)}]');
  });

  it('keeps the trial, new and stars marks on the MEMBER row only', () => {
    // The admin template (`z1e`) has no node for any of the three; only `b_e` does.
    for (const mark of ['item.isTrial', 'item.isNew', 'membershipYears']) {
      const at = code.indexOf(`!reverseMessage && `);
      expect(at, 'the member-only gate is missing').toBeGreaterThan(-1);
      expect(code).toContain(mark);
    }
    expect(code).toContain('{#if !reverseMessage && viewerIsPresenter && item.isTrial}');
  });

  it('and both layouts render the SAME menu component', () => {
    // Two call sites, one component: that is the whole reason the menu was extracted.
    expect(code.match(/<MessageMenu/g) ?? []).toHaveLength(2);
  });
});

/* ───────────────────────────── the dead controls it replaced ───────────────────────────── */

describe('the two Text Mode radios were dead, and are not any more', () => {
  const modalSource = readFileSync(
    new URL('./components/ModalHost.svelte', import.meta.url),
    'utf8'
  );
  const code = codeOf(modalSource);

  /*
    THEY EXISTED THE WHOLE TIME. Both radio pairs were `$state<'regular' | 'compact'>('regular')` —
    seeded from a CONSTANT, never from a preference — writing `onPreferenceChange('alertDisplayMode'
    | 'chatDisplayMode', 'regular' | 'compact')`, three invented names against the reference's own
    `alertsMode` / `chatMode` keys and its `'r'` / `'c'` values. Nothing read any of them, so the
    control persisted something nobody consulted and reopening the modal showed Regular whatever had
    been picked. Third control of that exact shape in this room, after the chat-mode radio and the
    permissions Save.
  */
  it('no longer write an invented preference name', () => {
    expect(code).not.toContain("onPreferenceChange('alertDisplayMode'");
    expect(code).not.toContain("onPreferenceChange('chatDisplayMode'");
    expect(code).not.toContain("$state<'regular' | 'compact'>");
  });

  it('report the change up instead, in the reference’s own values', () => {
    expect(code).toContain("onDisplayModeChange('alerts', 'r')");
    expect(code).toContain("onDisplayModeChange('alerts', 'c')");
    expect(code).toContain("onDisplayModeChange('chat', 'r')");
    expect(code).toContain("onDisplayModeChange('chat', 'c')");
  });

  it('and are CHECKED from the resolved mode rather than from local state', () => {
    // The half that made the old control look broken: it never reflected what was stored.
    expect(code).toContain("setInputChecked(alertsDisplayMode === 'r')");
    expect(code).toContain("setInputChecked(chatLogDisplayMode === 'c')");
  });

  it('and the two invented keys are retired', () => {
    /*
      Retired rather than left: every account that touched those radios is carrying one. They can
      never be revived, because the live feature uses the reference's names, which are different
      strings — so deleting them is safe in the way `dead-preference-keys.ts` requires.
    */
    expect(DEAD_PREFERENCE_KEYS).toContain('alertDisplayMode');
    expect(DEAD_PREFERENCE_KEYS).toContain('chatDisplayMode');
    expect(DEAD_PREFERENCE_KEYS, 'the LIVE keys must never be on this list').not.toContain(
      'chatMode'
    );
    expect(DEAD_PREFERENCE_KEYS).not.toContain('alertsMode');
  });
});

/* ───────────────────────────── the wire ───────────────────────────── */

describe('the mode is seeded once and then owned by the member', () => {
  const pageSource = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
  const code = codeOf(pageSource);

  it('seeds on mount rather than deriving', () => {
    /*
      A derivation would re-apply the owner's forced value on every `invalidateAll()` and the picker
      would appear to do nothing — the same trap `autoSwitchToOfftopics` records for the channel.
    */
    expect(code).toContain(
      'displayModes.seed(data.sessData?.altChatRender === true, prefs.loaded)'
    );
    expect(code).not.toContain('$derived(resolveChatDisplayMode');
  });

  it('and hands each surface its own mode', () => {
    expect(code).toContain('alertsDisplayMode={displayModes.alerts}');
    expect(code).toContain('chatDisplayMode={displayModes.chat}');
    expect(code).toContain('displayMode={displayModes.chat}');
    expect(code).toContain(
      'onDisplayModeChange={(surface, mode) => displayModes.set(surface, mode)}'
    );
  });
});
