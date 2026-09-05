/**
 * GENERATED from services/api/openapi/v1.json by
 * apps/controller/scripts/generate-tradingroom-api-client.mjs.
 * Do not edit by hand; run `pnpm api:client:generate`.
 */

export type Account = {
  readonly id: string;
  readonly name: string;
  readonly role: AccountRole;
  readonly rooms: Array<AccountRoom>;
  readonly slug: string;
};

export type AccountBootstrap = { readonly accounts: Array<Account>; readonly user: CurrentUser };

export type AccountRole = 'owner' | 'admin';

export type AccountRoom = {
  readonly id: string;
  readonly memberId: string;
  readonly name: string;
  readonly role: 'owner' | 'presenter' | 'limited_presenter' | 'moderator' | 'member';
  readonly state: string;
};

export type AccountRoomSettings = {
  readonly revision: number;
  readonly roomId: string;
  readonly settings: RoomSettings;
};

export type ArchiveAccountRoomRequest = { readonly archived: boolean };

export type CreateAccountRoomRequest = { readonly name: string; readonly requestId: string };

export type CurrentUser = {
  readonly displayName: string;
  readonly id: string;
  readonly isGuest: boolean;
  readonly isPlatformAdmin: boolean;
  readonly preferences: { readonly [key: string]: unknown };
};

export type Error = { readonly error: { readonly code: string; readonly message: string } };

export type InviteMemberRequest = { readonly displayName: string; readonly email: string; readonly requestId: string };

export type LoginRequest = { readonly email: string; readonly password: string };

export type ManageMemberOperation =
  | { readonly role: 'presenter' | 'moderator' | 'member'; readonly type: 'setRole' }
  | { readonly muted: boolean; readonly type: 'setMuted' }
  | { readonly banned: boolean; readonly type: 'setBanned' }
  | { readonly trial: boolean; readonly type: 'setTrial' }
  | { readonly hidden: boolean; readonly type: 'setHideUserCount' }
  | { readonly hidden: boolean; readonly type: 'setHidePersonalInfo' }
  | { readonly allowed: boolean; readonly type: 'setArchiveAccess' }
  | { readonly restricted: boolean; readonly type: 'setPmRestricted' }
  | { readonly status: 'approved' | 'pending'; readonly type: 'setApproval' }
  | { readonly allowed: boolean; readonly type: 'setMobileApp' }
  | { readonly allowed: boolean; readonly type: 'setFileAccess' }
  | { readonly note: string | null; readonly type: 'setNote' }
  | {
      readonly editNotes: boolean;
      readonly publishCam: boolean;
      readonly publishMic: boolean;
      readonly publishScreen: boolean;
      readonly type: 'setPermissions';
      readonly useAdminChat: boolean;
    }
  | { readonly type: 'freshenLogin' }
  | { readonly displayName: string; readonly type: 'rename' }
  | { readonly password: string; readonly type: 'setPassword' }
  | { readonly type: 'remove' };

export type ManageMembersRequest = {
  readonly allRooms?: boolean;
  readonly operation: ManageMemberOperation;
  readonly requestId: string;
  readonly targets: Array<MemberTarget>;
};

export type ManagedMember = {
  readonly adminNote: string | null;
  readonly approvalStatus: 'approved' | 'pending';
  readonly badges: Array<string>;
  readonly canAccessArchives: boolean;
  readonly canAccessFiles: boolean;
  readonly canEditNotes: boolean;
  readonly canPublishCam: boolean;
  readonly canPublishMic: boolean;
  readonly canPublishScreen: boolean;
  readonly canUseAdminChat: boolean;
  readonly createdAt: string;
  readonly displayName: string;
  readonly email: string;
  readonly hasMobileApp: boolean;
  readonly hasPassword: boolean;
  readonly hidePersonalInfo: boolean;
  readonly hideUserCount: boolean;
  readonly id: string;
  readonly invitedAt: string | null;
  readonly isBanned: boolean;
  readonly isMuted: boolean;
  readonly isPaused: boolean;
  readonly isPmRestricted: boolean;
  readonly isTrial: boolean;
  readonly joinedAt: string | null;
  readonly lastSeenAt: string | null;
  readonly revision: number;
  readonly role: 'owner' | 'presenter' | 'limited_presenter' | 'moderator' | 'member';
  readonly roomId: string;
  readonly userId: string;
};

export type ManagedRoom = {
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly id: string;
  readonly maxCapacity: number;
  readonly memberCount: number;
  readonly name: string;
  readonly shortCode: string;
  readonly state: 'open' | 'closed' | 'locked';
};

export type MemberTarget = { readonly expectedRevision: number; readonly memberId: string };

export type MembershipMutationResponse = {
  readonly changed: number;
  readonly members: Array<ManagedMember>;
  readonly removedMemberIds: Array<string>;
};

export type PatchAccountRoomSettingsRequest = {
  readonly base: RoomSettings;
  readonly expectedRevision: number;
  readonly requestId: string;
  readonly updates: RoomSettings;
};

export type PreferenceRequest = { readonly key: string; readonly value: unknown };

export type Preferences = { readonly [key: string]: unknown };

export type ProfileUpdateRequest = { readonly displayName: string; readonly preferences: Preferences };

export type RoomSettings = { readonly [key: string]: unknown };

export type Session = {
  readonly displayName: string;
  readonly expiresAt: number;
  readonly isPlatformAdmin: boolean;
  readonly userId: string;
};

export interface TradingRoomApiOperations {
  readonly login: {
    readonly method: 'POST';
    readonly path: '/api/auth/login';
    readonly request: LoginRequest;
    readonly response: Session;
    readonly successStatus: 200;
  };
  readonly logout: {
    readonly method: 'POST';
    readonly path: '/api/auth/logout';
    readonly request: undefined;
    readonly response: null;
    readonly successStatus: 204;
  };
  readonly refreshSession: {
    readonly method: 'POST';
    readonly path: '/api/auth/refresh';
    readonly request: undefined;
    readonly response: Session;
    readonly successStatus: 200;
  };
  readonly getAccountBootstrap: {
    readonly method: 'GET';
    readonly path: '/api/v1/account';
    readonly request: undefined;
    readonly response: AccountBootstrap;
    readonly successStatus: 200;
  };
  readonly updateAccountProfile: {
    readonly method: 'PATCH';
    readonly path: '/api/v1/account';
    readonly request: ProfileUpdateRequest;
    readonly response: CurrentUser;
    readonly successStatus: 200;
  };
  readonly getAccountPreferences: {
    readonly method: 'GET';
    readonly path: '/api/v1/account/preferences';
    readonly request: undefined;
    readonly response: Preferences;
    readonly successStatus: 200;
  };
  readonly setAccountPreference: {
    readonly method: 'PATCH';
    readonly path: '/api/v1/account/preferences';
    readonly request: PreferenceRequest;
    readonly response: Preferences;
    readonly successStatus: 200;
  };
  readonly updateAccountTheme: {
    readonly method: 'PUT';
    readonly path: '/api/v1/account/theme';
    readonly request: Preferences;
    readonly response: Preferences;
    readonly successStatus: 200;
  };
  readonly listAccountRooms: {
    readonly method: 'GET';
    readonly path: '/api/v1/accounts/{enterprise_id}/rooms';
    readonly request: undefined;
    readonly response: Array<ManagedRoom>;
    readonly successStatus: 200;
  };
  readonly createAccountRoom: {
    readonly method: 'POST';
    readonly path: '/api/v1/accounts/{enterprise_id}/rooms';
    readonly request: CreateAccountRoomRequest;
    readonly response: ManagedRoom;
    readonly successStatus: 200;
  };
  readonly setAccountRoomArchived: {
    readonly method: 'PATCH';
    readonly path: '/api/v1/accounts/{enterprise_id}/rooms/{room_id}';
    readonly request: ArchiveAccountRoomRequest;
    readonly response: ManagedRoom;
    readonly successStatus: 200;
  };
  readonly listAccountRoomMembers: {
    readonly method: 'GET';
    readonly path: '/api/v1/accounts/{enterprise_id}/rooms/{room_id}/members';
    readonly request: undefined;
    readonly response: Array<ManagedMember>;
    readonly successStatus: 200;
  };
  readonly manageAccountRoomMembers: {
    readonly method: 'PATCH';
    readonly path: '/api/v1/accounts/{enterprise_id}/rooms/{room_id}/members';
    readonly request: ManageMembersRequest;
    readonly response: MembershipMutationResponse;
    readonly successStatus: 200;
  };
  readonly inviteAccountRoomMember: {
    readonly method: 'POST';
    readonly path: '/api/v1/accounts/{enterprise_id}/rooms/{room_id}/members';
    readonly request: InviteMemberRequest;
    readonly response: MembershipMutationResponse;
    readonly successStatus: 200;
  };
  readonly getAccountRoomSettings: {
    readonly method: 'GET';
    readonly path: '/api/v1/accounts/{enterprise_id}/rooms/{room_id}/settings';
    readonly request: undefined;
    readonly response: AccountRoomSettings;
    readonly successStatus: 200;
  };
  readonly patchAccountRoomSettings: {
    readonly method: 'PATCH';
    readonly path: '/api/v1/accounts/{enterprise_id}/rooms/{room_id}/settings';
    readonly request: PatchAccountRoomSettingsRequest;
    readonly response: AccountRoomSettings;
    readonly successStatus: 200;
  };
}

export type TradingRoomApiOperation = keyof TradingRoomApiOperations;
