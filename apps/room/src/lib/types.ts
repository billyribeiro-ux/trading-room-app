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
