import type { FollowChatStyle, Theme } from '$lib/types';

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
 * * **the Q&A modal's subset.** `ModalHost` renders Q&A entries with FOUR of these and no badges,
 *   no reactions and no edit controls. Spreading the full chrome there would silently turn those on
 *   inside a modal that has never shown them, so it is left spelling its four.
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
  readonly enableEditMessage: boolean;
  readonly enableEditAlerts: boolean;
};
