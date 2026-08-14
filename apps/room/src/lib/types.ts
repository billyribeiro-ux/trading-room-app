export type Theme = 'light' | 'dark';
export type MainTab = 'screens' | 'streams' | 'notes' | 'videoplayer' | 'files';
export type FileTab = 'files' | 'images' | 'sounds';
export type ChatTab = 'main' | 'off-topic';

/** The only channels a message may be written to. */
export const CHAT_TABS: readonly ChatTab[] = ['main', 'off-topic'];

export function isChatTab(value: string): value is ChatTab {
  return (CHAT_TABS as readonly string[]).includes(value);
}
export type SettingsTab = 'app' | 'alerts' | 'chat' | 'presenter';
export type AlertTab = 'text' | 'url' | 'media';

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
  ip?: string;
  userAgent?: string;
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
  | 'reaction';

/** A reaction pill's payload, as `RoomMessage` emits it with the `reaction` action. */
export interface MessageReactionPayload {
  key: string;
  emoji: string;
}

/** What rides with a message action: a click, or a reaction pill. */
export type MessageActionEvent = MouseEvent | MessageReactionPayload | undefined;
