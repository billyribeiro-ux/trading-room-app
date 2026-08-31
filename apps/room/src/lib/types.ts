export type Theme = 'light' | 'dark';
export type MainTab =
  | 'screens'
  | 'streams'
  | 'notes'
  | 'videoplayer'
  | 'files'
  /** `presAreaTabs-swingAlerts`. Present only in rooms with `hasSwingTradeAlerts`. */
  | 'swingAlerts'
  /**
   * `presAreaTabs-dayTradeAlerts`. Present only in rooms with `hasDayTradeAlerts`.
   *
   * The tab key the reference passes to `onMainTabChange` (bundle byte 1,918,012); the visible
   * label on it is the shorter `Day Trades` (byte 1,918,110), which is why the two do not match.
   */
  | 'dayTradeAlerts';
export type FileTab = 'files' | 'images' | 'sounds';
/**
 * A chat channel's name, which is also its tab label and its `messages.room` value.
 *
 * IT WAS A CLOSED UNION of `'main' | 'off-topic'` until 2026-08-28, with `CHAT_TABS` and `isChatTab`
 * beside it, and `chatTabsWithBadges` is what ended that: an owner can configure extra channels
 * whose names come out of JSON at runtime, so the set is per ROOM and per MEMBER and cannot be a
 * type. `#lib/chat-tabs.ts` holds the two built-ins and the parser.
 *
 * WHAT THE UNION ACTUALLY BOUGHT, so that nothing is mourned that was not there: a typo in a
 * comparison became a compile error. It never protected against a member naming a channel they may
 * not read — that check did not exist until the same day, and it lives on the server now, where
 * every caller asks `memberChatChannels` and refuses anything not on the answer. The client's own
 * list arrives with the page as `data.chatTabs`, already decided.
 */
export type ChatTab = string;
export type SettingsTab = 'app' | 'alerts' | 'chat' | 'presenter';
export type AlertTab = 'text' | 'url' | 'media';

/**
 * The Session Control modal's seven tabs.
 *
 * Declared here since 2026-08-16 because a SECOND consumer arrived. It lived in `+page.svelte`
 * until `RoomOverlays.svelte` took the modal host, and `RoomNavbar.svelte` records the reason it
 * had not moved before: "moving it would be a change to a file this extraction is trying to
 * shrink." That objection is now the opposite of true — the page is the file being shrunk, and a
 * type two components share does not belong in either of them.
 */
export type SessionControlTab =
  | 'reset-session'
  | 'close-session'
  | 'lock-session'
  | 'av-device-selection'
  | 'streaming-selection'
  | 'session-history'
  | 'webinar-tools';

export interface FollowChatStyle {
  color: string;
  tickerColor: string;
  usernameColor: string;
  bgColor: string;
  fontSize: number;
  playSound: boolean;
}

export interface ManagedChatUser {
  nick: string;
  emailHash: string;
  pic: string;
  userXrefID?: string;
  _id?: string;
  followChatStyle?: FollowChatStyle;
}

export interface ModalTargetUser extends ManagedChatUser {
  id: number;
  status: string;
  email?: string;
  loggedIn?: string | Date | null;
  location?: string;
  /*
    `string | null` rather than just `string`, because `RoomUserDetail.decorate` spreads the server's
    answer over this object and the server answers `null` for a member who is not connected right
    now. Without the null the spread could not clear a stale address from an earlier roster row,
    which is the one value this cell must never show.
  */
  ip?: string | null;
  userAgent?: string | null;
  appVersion?: string;
  streamServer?: string;
  serverId?: string;
  permissions?: 'r' | 'a' | string;
  isTrial?: boolean;
  isNew?: boolean;
  years?: number;
  hasMic?: boolean;
  hasScreen?: boolean;
  hasCam?: boolean;
  hasAdminChat?: boolean;
  canEditNotes?: boolean;
  temporaryAccessOnly?: boolean;
}

export interface MessageReaction {
  emoji: string;
  clickedBy: string[];
}

export type MessageReactions = Record<string, MessageReaction>;

export interface MessageBadge {
  text?: string;
  backgroundColor?: string;
  color?: string;
  imageUrl?: string;
}

export interface SavedPoll {
  id: number;
  q: string;
  choices: string[];
}

export interface ActivePollAnswer {
  senderNick: string;
  senderXref: string;
  choiceIndex: number;
}

export interface ActivePoll {
  id: number;
  senderId: number;
  senderName: string;
  q: string;
  choices: string[];
  createdAt: Date;
  total: number;
  totals: number[];
  answers: ActivePollAnswer[];
  userAnswerChoice: number | null;
}

export interface RoomNote {
  id: number;
  name: string;
  contentHtml: string | null;
  isWelcomeMat: boolean;
  position: number;
  updatedById: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoteVersion {
  id: number;
  noteId: number;
  contentHtml: string | null;
  updatedById: number | null;
  version: number;
  createdAt: string;
}

/**
 * `long` or `short` — the two values of the direction radio pair, and the two the row prints.
 *
 * A union rather than a `string`, because the pair is closed at both ends: the radios carry
 * `value="long"` / `value="short"` (const indices 183 and 186) and the model defaults to `"long"`.
 * Widening it would let a third value reach the table, where it would render as itself — the row's
 * `<td>` has no class, no `ngClass` and no pipe, so nothing would object.
 */
export type SwingAlertDirection = 'long' | 'short';

/**
 * One row of the Swing Trade Alerts log, as the table, the pipes and the CSV read it.
 *
 * Field names are the decode's, from `docs/decoded/swing-alerts.md` §5 — including `entryDate`,
 * which an earlier revision of that document had as `created`. The string `created` appears on no
 * swing path; `entryDate` occurs at exactly four offsets in the bundle, all reads, two in the row
 * templates and two in the CSV builders.
 *
 * ## Why the prices are strings
 *
 * `entryPrice`, `stop` and `target` are `type="text"` inputs whose values are rendered back through
 * bare interpolations — no pipe, no `toFixed`, no currency (spec §3). No arithmetic is performed on
 * them anywhere on this path, so there is nothing for the repository's money rule to protect: they
 * are transcribed strings, and storing them as cents would round what a presenter typed and change
 * what the table shows. See the `swingAlerts` table comment for the same note on the column type.
 *
 * ## `id` rather than `_id`
 *
 * The reference is Mongo-backed and the row carries `_id`; this room's rows come from its own
 * SQLite table with an integer primary key, exactly like {@link RoomNote}. The wire field is still
 * called `swingAlertID`, which is what the three mutation payloads name.
 */
export interface SwingAlertRow {
  id: number;
  symbol: string;
  direction: SwingAlertDirection;
  /** ISO 8601. Rendered through `date:'YYYY-MM-dd hh:mm:ss'`; the only formatted cell. */
  entryDate: string;
  entryPrice: string;
  stop: string;
  target: string;
  /** `''` when the row has no image, which is what empties the image cell. */
  image: string;
  senderName: string;
  /**
   * The sender's avatar, preferred over the Gravatar fallback exactly as the row template has it:
   * `row.senderPic || 'https://secure.gravatar.com/avatar/' + row.senderAvt + '?d=mm&s=30'`.
   *
   * The client never writes either of these — both occur only as reads inside the two row
   * templates — so both are produced server-side here too.
   */
  senderPic: string;
  /** The md5 of the sender's email, i.e. the Gravatar hash the fallback URL is built from. */
  senderAvt: string;
}

/**
 * `long` or `short` — the Day Trade radio pair, const indices 228 and 230.
 *
 * A separate type from {@link SwingAlertDirection} even though the two unions are identical today,
 * because they are two independent closed sets upstream: two `name="…-direction"` groups, two pairs
 * of `value=` attributes, two models each defaulting to `"long"`. Aliasing one to the other would
 * make a future change to either silently change both, and the whole risk of this port is exactly
 * that kind of accidental coupling.
 */
export type DayTradeAlertDirection = 'long' | 'short';

/**
 * One row of the Day Trade Alerts log, as the table, the pipes and the CSV read it.
 *
 * Field names are the decode's, from `docs/decoded/day-trade-alerts.md` §1.5 and §1.7 — including
 * `entryDate`, which the row template formats (byte 1,943,736) and the CSV builder reads (byte
 * 1,989,640). The string `created` appears on no Day Trade path.
 *
 * Structurally identical to {@link SwingAlertRow}, and separate for the same reason
 * {@link DayTradeAlertDirection} is: `_we` and `Pwe` are two row templates, and the day the server
 * adds a column to one of the two tables this type must be able to move without the other.
 *
 * ## Why the prices are strings
 *
 * `entryPrice`, `stop` and `target` are `type="text"` inputs (consts 224, 225, 226) whose values
 * are rendered back through bare `Ze(x)` interpolations — no pipe, no `toFixed`, no currency. No
 * arithmetic is performed on them anywhere on this path, so there is nothing for the repository's
 * money rule to protect: they are transcribed strings, and storing them as cents would round what a
 * presenter typed and change what the table shows. See the `dayTradeAlerts` table comment for the
 * same note on the column type.
 *
 * ## `id` rather than `_id`
 *
 * The reference is Mongo-backed and the row carries `_id`; this room's rows come from its own
 * SQLite table with an integer primary key. The wire field is still called `dayTradeAlertID`, which
 * is what the three mutation payloads name.
 */
export interface DayTradeAlertRow {
  id: number;
  symbol: string;
  direction: DayTradeAlertDirection;
  /** ISO 8601. Rendered through `date:'YYYY-MM-dd hh:mm:ss'`; the only formatted cell. */
  entryDate: string;
  entryPrice: string;
  stop: string;
  target: string;
  /** `''` when the row has no image, which is what empties the image cell. */
  image: string;
  senderName: string;
  /**
   * The sender's avatar, preferred over the Gravatar fallback exactly as the row template has it:
   * `e.senderPic || "https://secure.gravatar.com/avatar/" + e.senderAvt + "?d=mm&s=30"`
   * (byte 1,943,900).
   *
   * The client never writes either of these — both occur only as reads inside the two row
   * templates — so both are produced server-side here too.
   */
  senderPic: string;
  /** The md5 of the sender's email, i.e. the Gravatar hash the fallback URL is built from. */
  senderAvt: string;
}

export type ModalName =
  | 'user'
  | 'youtube'
  | 'settings'
  | 'av'
  | 'debug'
  | 'alert'
  | 'poll'
  | 'chat-logs'
  | 'alert-logs'
  | 'session'
  | 'mobile'
  | 'reply'
  | 'qa'
  | 'muted'
  | 'followed'
  | 'scheduled'
  | 'report'
  | 'all-private'
  | 'advanced-search'
  | 'alert-filter'
  | 'connectivity'
  | 'rich-text'
  | 'file-upload'
  | 'image-upload'
  | null;

/**
 * One rendered message, as `RoomMessage` needs it.
 *
 * Lifted out of `RoomMessage.svelte` on 2026-08-14 when the extra chat column arrived: two
 * components render the same rows now, and a shape declared inside one of them is a shape the other
 * has to guess at. Types are erased at runtime, so this costs nothing and stops the two drifting.
 */
export interface RoomMessageItem {
  id: number;
  senderId: number;
  senderName: string;
  senderEmailHash: string;
  senderAvatarUrl: string;
  senderRole?: string;
  senderStatus?: string;
  body: string;
  /**
   * Sanitised HTML for a message written with the rich text editor, or null/absent for a plain
   * one. Its presence is what selects the HTML branch — the renderer never sniffs `body` for
   * tags, so somebody who TYPES `<b>` still sees the characters they typed.
   */
  bodyHtml?: string | null;
  createdAt: Date;
  kind?: string;
  targetUrl?: string | null;
  questionCount?: number | null;
  questionAnswered?: boolean;
  unreadQa?: boolean;
  isAdmin?: boolean;
  backgroundColor?: string | null;
  fontColor?: string | null;
  answered?: boolean;
  replyToName?: string | null;
  replyToBody?: string | null;
  reactions?: MessageReactions;
  badges?: MessageBadge[];
  isTrial?: boolean;
  isNew?: boolean;
  membershipYears?: number | null;
  sessionName?: string | null;
  evidenceKey?: string;
  evidenceTimestampText?: string;
  evidenceSeparatorText?: string | null;
  evidenceMessageBoxClass?: string;
  evidenceMessageBoxStyle?: string | null;
  evidenceDirection?: string;
  evidenceQuestion?: boolean;
  evidenceBodyStyle?: string | null;
  targetWidth?: number | null;
  targetHeight?: number | null;
  evidenceBodySegments?: Array<{
    kind: string;
    text?: string;
    url?: string;
    // Intrinsic pixel size of the upload. Emitted as width/height attributes so the browser
    // reserves the box from the aspect ratio instead of collapsing to 0 until the bytes land.
    width?: number;
    height?: number;
  }>;
  evidenceMenuItems?: string[];
}

/**
 * What a message's kebab menu can ask for.
 *
 * Declared identically in `RoomMessage.svelte` and `+page.svelte` until 2026-08-14, when the extra
 * chat column made it three copies and one of them would have been the one to go stale.
 */
export type MessageAction =
  | 'delete'
  | 'mute'
  | 'user'
  | 'mention'
  | 'show-all'
  | 'report'
  | 'copy'
  | 'reply'
  | 'answered'
  | 'private'
  | 'question'
  | 'image'
  | 'edit'
  | 'reaction'
  /**
   * "Copy trades" — one `[{( … )}]` order copied to the clipboard.
   *
   * Its own action rather than a second use of `copy`: `copy` takes the WHOLE message, and the
   * whole point here is that a member gets the order and nothing else. The payload carries the
   * text, because the segment that was clicked is the only thing that knows which order it was.
   */
  | 'copy-trade';

/**
 * One entry per user with a live camera — the room's `webcamingUsers`.
 *
 * Lifted out of `+page.svelte` on 2026-08-15 when `PresentationArea` took the webcam strip: the
 * page owns the list and the component renders the cards, so a shape declared inside either one is
 * a shape the other has to guess at.
 */
export type WebcamPresenter = { id: string; name: string; isMe: boolean };

/** A reaction pill's payload, as `RoomMessage` emits it with the `reaction` action. */
export interface MessageReactionPayload {
  key: string;
  emoji: string;
}

/**
 * A message as the ACTION handlers need it — narrower than {@link RoomMessageItem} and not a subset
 * of it, which is why it is its own type rather than a `Pick<>`. `createdAt` is optional here
 * because a handler is given whatever the caller has; `replyToMessageId` and `nonTrade` are carried
 * because delete/reply/report read them, and the renderer never does.
 *
 * Lifted out of `+page.svelte` on 2026-08-15 for the same reason `RoomMessageItem` was lifted out of
 * `RoomMessage.svelte`: `AlertChatArea` renders the rows that raise these actions, so a shape
 * declared inside the page is a shape the pane has to guess at.
 */
export interface MessageActionItem {
  id: number;
  senderId: number;
  senderName: string;
  senderEmailHash: string;
  senderAvatarUrl: string;
  senderRole?: string;
  senderStatus?: string;
  body: string;
  /** Set when the message was written with the rich text editor. Its presence IS the fact. */
  bodyHtml?: string | null;
  targetUrl?: string | null;
  nonTrade?: boolean;
  isAdmin?: boolean;
  backgroundColor?: string | null;
  fontColor?: string | null;
  answered?: boolean;
  replyToMessageId?: number | null;
  replyToName?: string | null;
  replyToBody?: string | null;
  reactions?: MessageReactions;
  evidenceKey?: string;
  // Present on every item RoomMessage hands back; the Q&A modal reproduces the alert card and
  // needs the timestamp, using the captured text where the item carries one.
  createdAt?: Date;
  evidenceTimestampText?: string;
  evidenceBodySegments?: Array<{
    kind: string;
    text?: string;
    url?: string;
    width?: number;
    height?: number;
  }>;
}

/** The text of one `[{( … )}]` order, emitted with the `copy-trade` action. */
export interface TradeCopyPayload {
  text: string;
}

/**
 * `MSB-03` — WHICH image was clicked, travelling with the click that opened it.
 *
 * The reference puts the URL on the element: `onclick="openImageModal(event,'${a}')"` at bundle byte
 * 1,326,195, where `a` is THAT image's own sanitised URL, written into the handler by `urlwrapImg`
 * as it builds each container. So upstream every inline image knows its own address and the opener
 * is told it.
 *
 * This room raised `onaction('image', event)` with no URL, and the handler resolved one from
 * `item.targetUrl` — the ALERT's attachment, which is a different picture and often no picture at
 * all. Two consequences, both measured on 2026-08-31: a member clicking an inline image inside a
 * CHAT message got nothing, because that guard is false for every chat row; and a member clicking
 * one inside an alert that also carries an attachment got the ATTACHMENT instead of the picture
 * they had just clicked.
 *
 * The EVENT rides with the URL rather than being passed beside it, because `RoomModals.openImage`
 * reads its modifier keys — shift, alt and the synthesised `ctrlClick` open the popped-out window
 * instead of the lightbox. Splitting them into two parameters was the previous shape and is what
 * allowed a call site to supply one and not the other.
 */
export interface ImageOpenPayload {
  readonly url: string;
  readonly event: MouseEvent;
}

/** What rides with a message action: a click, a reaction pill, one copyable order, or one image. */
export type MessageActionEvent =
  MouseEvent | MessageReactionPayload | TradeCopyPayload | ImageOpenPayload | undefined;
