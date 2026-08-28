import type { FollowChatStyle, Theme } from '#lib/types.js';

/**
 * `RoomMessageChrome` — everything `RoomMessage` needs that is the SAME for every message.
 *
 * ## What this is for
 *
 * `RoomMessage` takes just over thirty props. Sixteen of them do not vary from one message to the
 * next: they describe the room's configuration and the viewer, not the row. Spelled individually,
 * they were sixteen lines at each call site, and any component standing between the page and a
 * message had to DECLARE all sixteen, DESTRUCTURE all sixteen and FORWARD all sixteen — three
 * spellings apiece to pass a value through untouched. `ExtraChatPane` carries thirteen of those
 * today and does exactly that with each.
 *
 * That cost is what makes the alert/chat column a ninety-prop component when it is extracted, so
 * this is groundwork for that extraction as much as it is a tidy-up.
 *
 * ## What is deliberately NOT in here
 *
 * * **`item`, `kind`, `menuOpen`, `showDateSeparator`, `ontoggle`, `onaction`** — per message.
 * * **`followedStyle`** — per message, looked up from the sender's hash.
 * * **`alertLabels`** — the alerts column only. Putting it here would hand a chat message a parsed
 *   label table it never reads.
 *
 * ## THE Q&A THREAD USED TO BE ON THAT LIST, and taking it off was the right call
 *
 * This entry read: *"the Q&A modal's subset. `ModalHost` renders Q&A entries with FOUR of these and
 * no badges, no reactions and no edit controls. Spreading the full chrome there would silently turn
 * those on inside a modal that has never shown them, so it is left spelling its four."*
 *
 * That was correct while the thread was INERT — it rendered `kind="chat"` behind an `onaction` that
 * did nothing, so anything the chrome switched on would have been a control that could not act. The
 * thread acts now (`AlertQaModal.svelte`), and it renders `kind="alert"` because that is what the
 * reference does, so the full chrome is exactly what makes its menu the menu the reference draws.
 *
 * `alertLabels` stays out, and there it is the REFERENCE's own choice rather than ours: the body
 * pipe receives `e.isQAMsg ? null : alertLabels`, so a hash inside a question stays text.
 *
 * ## A `$derived` object rather than sixteen getters, and the trade
 *
 * The page builds one of these with `$derived`, so changing ONE preference replaces the whole object
 * and every rendered message re-reads all sixteen props instead of only the one that moved. Stated
 * rather than glossed, because it IS a real difference from sixteen individually-tracked props.
 *
 * It is the right trade here: these are settings — a checkbox in a modal, a room configuration
 * pushed by the owner — not per-keystroke state, and the log is re-rendered wholesale by every
 * `invalidate` anyway. Sixteen hand-written getters to avoid an allocation nobody can perceive would
 * be the tail wagging the dog. If something in here ever becomes high-frequency, that is the moment
 * to revisit it, and this paragraph is the note saying so.
 *
 * ## `viewerIsPresenter` is the ROLE, not the elevation
 *
 * Both call sites pass `data.user.role === 'staff' || data.user.role === 'admin'` rather than the
 * page's `isPresenter`, and that difference is load-bearing — see `media-elevation.ts`. A member
 * handed mic and screen becomes a limited presenter for MEDIA purposes and must not thereby gain a
 * presenter's controls on every message in the room. The expression is copied here verbatim rather
 * than swapped for the shorter identifier.
 */
export type RoomMessageChrome = {
  /** The viewer, as `RoomMessage` needs them. */
  readonly currentUserId: number;
  readonly currentUserEmailHash: string;
  readonly currentUserName: string;
  /** The ROLE, never the media elevation. See the note above. */
  readonly viewerIsPresenter: boolean;

  readonly theme: Theme;
  readonly chatStyle: FollowChatStyle;

  /** The viewer's own preferences. */
  readonly chatGif: boolean;
  readonly chatBadges: boolean;

  /** The owner's room settings. */
  readonly enableBadges: boolean;
  readonly showBadgesToPresentersOnly: boolean;
  readonly disableStarYears: boolean;
  readonly presenterMessagesOnTheRight: boolean;
  readonly usersPublicReply: boolean;
  readonly enableReactions: boolean;
  /**
   * "Enable QA Reactions?" — the second half of ONE rule, and the half that could never be true.
   *
   * `sourceMessageBehavior.react` has read both since it was written: reactions on chat when
   * `enableReactions`, reactions on an alert row drawn INSIDE the Q&A thread when this one. The
   * thread rendered its rows as `kind="chat"` behind a handler that did nothing, so the second
   * clause was unreachable no matter what the owner ticked.
   */
  readonly enableQaReactions: boolean;
  /**
   * "Q&A on alerts?" — whether an alert carries the ask-a-question button at all.
   *
   * On the CHROME rather than passed per call site, for the reason this whole type exists: three
   * components render a message, and a room setting handed to each of them separately is a room
   * setting one of them will stop being handed. `RoomMessage` declares it with a `false` default
   * now; before 2026-08-28 it defaulted to `true` and nothing passed it, which is how an
   * entitlement ended up on in every room.
   */
  readonly hasQaOnAlerts: boolean;
  readonly enableEditMessage: boolean;
  readonly enableEditAlerts: boolean;

  /*
    ── FIVE MORE THE MESSAGE NEVER RECEIVED, added 2026-08-28 ──────────────────────────────────────

    Every one of these was already a prop on `RoomMessage`, already fed into `sourceMessageBehavior`,
    and already had its value crossing the boundary — `userPM`, `userToPresenterPM`,
    `disablePMForTrials` and `hideAvatars` have been on `ROOM_VISIBLE_SETTINGS` for weeks, and
    `user.isFT` and `media.limitedPresenter` are facts this room has always held. **Nothing passed
    them.** They were found by asking which of `RoomMessage`'s thirty-five props no call site
    supplies, which is a question nothing had asked.

    What each one being absent actually did:

      userPrivateMessaging               `privateMessage` collapsed to `viewerIsPresenter`, so the
      userToPresenterPrivateMessaging    kebab's Private Message entry was PRESENTER-ONLY in every
      disablePrivateMessagingForTrials   room — while the chat header's PM button and the roster
      currentUserIsTrial                 kebab, which read the same three settings from their own
                                         copies of the rule, offered it to members. Three
                                         implementations, one of them unfed, and the disagreement
                                         was invisible because each looked right on its own.

      hideAvatars                        an owner who hid avatars got them anyway on every message.

      viewerIsLimitedPresenter           `showToAll` is `viewerIsPresenter && !viewerIsLimited`, so a
                                         member handed mic and screen by `giveMicScreen` kept the
                                         Show To All entry that gate exists to take away.

    They are on the CHROME and not per call site for the reason the whole type exists, and the three
    PM values travel together because `sourceMessageBehavior` needs all three to evaluate one rule:
    handing it two of them would produce a confident wrong answer rather than an error.
  */
  readonly userPrivateMessaging: boolean;
  readonly userToPresenterPrivateMessaging: boolean;
  readonly disablePrivateMessagingForTrials: boolean;
  readonly currentUserIsTrial: boolean;
  readonly hideAvatars: boolean;
  readonly viewerIsLimitedPresenter: boolean;
  /**
   * "Copy trades" — whether `[{( … )}]` in an ALERT becomes a click-to-copy order.
   *
   * On the chrome for this type's own reason: three components render a message, and a room setting
   * handed to each of them separately is a room setting one of them will stop being handed.
   */
  readonly copyTrades: boolean;
  /**
   * "Users can delete own messages?" — the first term of `canDeleteOwnMessage` (byte 1,158,799).
   *
   * NAMED FOR THE PROP IT FEEDS, not for the setting it comes from. The chrome is applied with
   * `{...messageChrome}`, so a field whose name does not match the prop feeds nothing and says
   * nothing — which is the failure this whole type was written to end. The other two terms of that
   * gate are per MESSAGE and per VIEWER, and `RoomMessage` computes both; only the room's half is
   * here.
   */
  readonly allowDeleteOwnMessage: boolean;
};

/**
 * The settings a message reads, as they arrive from `internal/room-config/[code]`.
 *
 * Declared structurally rather than importing `RoomSessionSettings`, and that is deliberate: this
 * module is shared client code and that type lives behind `$lib/server`. Listing the keys out is
 * also the more honest shape — it says on its face exactly which settings a message depends on, and
 * one more cannot be added without appearing here.
 *
 * It said "the eleven keys" and "a twelfth" until 2026-08-28, when there were fourteen. A count in
 * prose beside the list it counts is a second copy of the same fact, and it is the copy nobody
 * updates; the list is the fact.
 */
export interface MessageChromeSettings {
  readonly showBadgesToPresentersOnly?: boolean;
  readonly disableStarYears?: boolean;
  readonly usersPublicReply?: boolean;
  readonly enableReactions?: boolean;
  readonly enableQAReactions?: boolean;
  readonly hasQAOnAlerts?: boolean;
  readonly enableEditMessage?: boolean;
  readonly enableEditAlerts?: boolean;
  readonly userPM?: boolean;
  readonly userToPresenterPM?: boolean;
  readonly disablePMForTrials?: boolean;
  readonly hideAvatars?: boolean;
  readonly copyTrades?: boolean;
  readonly usersCanDeleteOwnMsgs?: boolean;
}

export interface MessageChromeSources {
  /** The viewer, from the load. `role` decides presenter status; `isFT` is the trial flag. */
  readonly user: {
    readonly id: number;
    readonly emailHash: string;
    readonly displayName: string;
    readonly role?: string;
    readonly isFT?: boolean;
  };
  /** The room's settings, or absent — every read below treats absent as off. */
  readonly sessData: MessageChromeSettings | null | undefined;
  readonly theme: Theme;
  readonly chatStyle: FollowChatStyle;
  /** This viewer's own two message preferences. */
  readonly chatGif: boolean;
  readonly chatBadges: boolean;
  /**
   * The two rules that live on `RoomGates` rather than being re-read here.
   *
   * `enableBadges` is the first term of a four-term gate and `presenterMessagesOnTheRight` is the
   * second; both are transcribed, cited and tested there. Reading `sessData` for them again would
   * put a second copy of a rule in the file whose whole job is to stop copies.
   */
  readonly enableBadges: boolean;
  readonly presenterMessagesOnTheRight: boolean;
  /** `media.limitedPresenter` — the elevation, which is NOT the role. See the note above. */
  readonly viewerIsLimitedPresenter: boolean;
}

/**
 * Build the chrome from the room's own objects.
 *
 * ## Why this is a function and not twenty-two lines on the page
 *
 * It was twenty-two lines in `+page.svelte`, and every one of them was `data.sessData?.x === true`
 * or a field lifted off an object the page already had. That is not a decision the PAGE is making —
 * it is the answer to "which settings does a message read", which is the question this module
 * exists to answer. Keeping the list here means a new message setting is one edit in one file
 * instead of a type here and a field there, and it is why five props could sit on the component
 * unfed for weeks: the type and the construction were in different files and nothing compared them.
 *
 * `=== true` on every setting, and that is the fail-closed rule this repository applies everywhere:
 * `sessData` is JSON off the wire, so a string `"false"`, a `0` or a stray object must not switch a
 * capability on. Four of these unlock an action a member can take on somebody else's message.
 */
export function buildMessageChrome(sources: MessageChromeSources): RoomMessageChrome {
  const settings = sources.sessData;
  return {
    currentUserId: sources.user.id,
    currentUserEmailHash: sources.user.emailHash,
    currentUserName: sources.user.displayName,
    // The ROLE, never the media elevation — see the note at the top of this file.
    viewerIsPresenter: sources.user.role === 'staff' || sources.user.role === 'admin',
    viewerIsLimitedPresenter: sources.viewerIsLimitedPresenter,
    currentUserIsTrial: sources.user.isFT === true,
    theme: sources.theme,
    chatStyle: sources.chatStyle,
    chatGif: sources.chatGif,
    chatBadges: sources.chatBadges,
    enableBadges: sources.enableBadges,
    presenterMessagesOnTheRight: sources.presenterMessagesOnTheRight,
    showBadgesToPresentersOnly: settings?.showBadgesToPresentersOnly === true,
    disableStarYears: settings?.disableStarYears === true,
    usersPublicReply: settings?.usersPublicReply === true,
    enableReactions: settings?.enableReactions === true,
    enableQaReactions: settings?.enableQAReactions === true,
    hasQaOnAlerts: settings?.hasQAOnAlerts === true,
    enableEditMessage: settings?.enableEditMessage === true,
    enableEditAlerts: settings?.enableEditAlerts === true,
    userPrivateMessaging: settings?.userPM === true,
    userToPresenterPrivateMessaging: settings?.userToPresenterPM === true,
    disablePrivateMessagingForTrials: settings?.disablePMForTrials === true,
    hideAvatars: settings?.hideAvatars === true,
    copyTrades: settings?.copyTrades === true,
    allowDeleteOwnMessage: settings?.usersCanDeleteOwnMsgs === true
  };
}
