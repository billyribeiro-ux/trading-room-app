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

export type AdministratorMutationResponse = {
  readonly administrators: Array<ManagedAdministrator>;
  readonly changed: number;
  readonly removedUserIds: Array<string>;
};

export type ArchiveAccountRoomRequest = { readonly archived: boolean };

export type AssignBadgesRequest = {
  readonly allRooms?: boolean;
  readonly operation: BadgeAssignmentOperation;
  readonly requestId: string;
  readonly targets: Array<MemberTarget>;
};

export type BadgeAssignmentOperation =
  | { readonly assigned: boolean; readonly badgeId: string; readonly type: 'setBadge' }
  | { readonly type: 'clearBadges' };

export type BadgeMutationResponse = {
  readonly badges: Array<ManagedBadge>;
  readonly changed: number;
  readonly members: Array<ManagedMember>;
  readonly removedBadgeIds: Array<string>;
};

export type CreateAccountRoomRequest = { readonly name: string; readonly requestId: string };

export type CreateAdministratorRequest = {
  readonly displayName: string;
  readonly email: string;
  readonly password: string;
  readonly requestId: string;
};

export type CreateBadgeRequest = {
  readonly autoAssignRoles: Array<string>;
  readonly backgroundColor: string;
  readonly darkThemeBadgeId: string | null;
  readonly emoji: string | null;
  readonly imageDataUrl: string | null;
  readonly label: string;
  readonly requestId: string;
  readonly textColor: string;
};

export type CreateCustomerApiKeyRequest = {
  readonly keyId: string;
  readonly lastFour: string;
  readonly requestId: string;
  readonly secretHash: string;
};

export type CurrentUser = {
  readonly displayName: string;
  readonly id: string;
  readonly isGuest: boolean;
  readonly isPlatformAdmin: boolean;
  readonly preferences: { readonly [key: string]: unknown };
};

export type CustomerApiKeyMutationResponse = {
  readonly changed: number;
  readonly keys: Array<ManagedCustomerApiKey>;
  readonly removedKeyIds: Array<string>;
};

export type CustomerApiKeyRestrictions = {
  readonly ips: Array<string>;
  readonly scopes: Array<
    | 'sessions/list'
    | 'sessions/users'
    | 'sessions/addUsers'
    | 'sessions/delUsers'
    | 'sessions/userstats'
    | 'sessions/chatlogs'
    | 'sessions/alertlogs'
    | 'sessions/deletedlogs'
    | 'sessions/archivedlogs'
    | 'sessions/recordings'
    | 'sessions/cloneSession'
  >;
  readonly sessions: Array<string>;
};

export type DeleteAdministratorRequest = { readonly expectedRevision: number; readonly requestId: string };

export type DeleteBadgeRequest = { readonly expectedRevision: number; readonly requestId: string };

export type DeleteCustomerApiKeyRequest = { readonly expectedRevision: number; readonly requestId: string };

export type Error = { readonly error: { readonly code: string; readonly message: string } };

export type InviteMemberRequest = { readonly displayName: string; readonly email: string; readonly requestId: string };

export type LaunchAccountRoomRequest = { readonly requestId: string };

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

export type ManagedAdministrator = {
  readonly createdAt: string;
  readonly displayName: string;
  readonly email: string;
  readonly revision: number;
  readonly updatedAt: string;
  readonly userId: string;
};

export type ManagedBadge = {
  readonly autoAssignRoles: Array<string>;
  readonly backgroundColor: string;
  readonly createdAt: string;
  readonly darkThemeBadgeId: string | null;
  readonly emoji: string | null;
  readonly id: string;
  readonly imageDataUrl: string | null;
  readonly label: string;
  readonly revision: number;
  readonly textColor: string;
  readonly updatedAt: string;
};

export type ManagedCustomerApiKey = {
  readonly createdAt: string;
  readonly id: string;
  readonly lastFour: string;
  readonly lastUsedAt: string | null;
  readonly restrictions: CustomerApiKeyRestrictions;
  readonly revision: number;
  readonly updatedAt: string;
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

export type RestrictCustomerApiKeyRequest = {
  readonly expectedRevision: number;
  readonly requestId: string;
  readonly restrictions: CustomerApiKeyRestrictions;
};

export type RoomLaunchVisit = {
  readonly displayName: string;
  readonly email: string;
  readonly enteredAt: string;
  readonly roomId: string;
  readonly shortCode: string;
  readonly userId: string;
  readonly visitId: string;
};

export type RoomSettings = { readonly [key: string]: unknown };

export type RotateCustomerApiKeyRequest = {
  readonly expectedRevision: number;
  readonly lastFour: string;
  readonly requestId: string;
  readonly secretHash: string;
};

export type Session = {
  readonly displayName: string;
  readonly expiresAt: number;
  readonly isPlatformAdmin: boolean;
  readonly userId: string;
};

export type StatsAddUser = { readonly email: string; readonly name: string };

export type StatsAddUsersRequest = { readonly users: Array<StatsAddUser> };

export type StatsAddUsersResponse = { readonly added: number; readonly freshen: number; readonly success: boolean };

export type StatsAlertLog = {
  readonly alertType: string;
  readonly message: string;
  readonly sessionID: string;
  readonly t: string;
};

export type StatsAlertLogsResponse = { readonly chatlogs: Array<StatsAlertLog>; readonly success: boolean };

export type StatsArchivedLog = {
  readonly channel: string;
  readonly content: string;
  readonly logType: 'chat' | 'alerts';
  readonly sessionID: string;
  readonly updated: string;
};

export type StatsArchivedLogsResponse = { readonly archivedlogs: Array<StatsArchivedLog>; readonly success: boolean };

export type StatsChatLog = {
  readonly c: string;
  readonly m: string;
  readonly sessionID: string;
  readonly t: string;
  readonly u: string;
};

export type StatsChatLogsResponse = { readonly chatlogs: Array<StatsChatLog>; readonly success: boolean };

export type StatsCloneSession = {
  readonly _id: string;
  readonly clonedFrom: string;
  readonly created: string;
  readonly currentState: string;
  readonly isClonedRoom: boolean;
  readonly name: string;
  readonly ownerdID: string;
  readonly updated: string;
  readonly uuid: string;
};

export type StatsCloneSessionResponse = { readonly session: StatsCloneSession; readonly success: boolean };

export type StatsDeleteUsersRequest = { readonly delUsers: Array<string> };

export type StatsDeleteUsersResponse = { readonly deletedUsers: Array<string>; readonly success: boolean };

export type StatsDeletedLog = {
  readonly eventType: 'E' | 'D';
  readonly logType: 'chat' | 'alerts';
  readonly originalMessage: string;
  readonly sessionID: string;
  readonly time: string;
};

export type StatsDeletedLogsResponse = { readonly deletedlogs: Array<StatsDeletedLog>; readonly success: boolean };

export type StatsRecording = {
  readonly _id: string;
  readonly contentType: string;
  readonly created: string;
  readonly duration: number;
  readonly fpath: string;
  readonly isUpload: boolean;
  readonly length: number;
  readonly media_server: string | null;
  readonly ms: string | null;
  readonly name: string;
  readonly namemkv: string;
  readonly sessionID: string;
  readonly vidPath: string | null;
};

export type StatsRecordingsResponse = { readonly recordings: Array<StatsRecording>; readonly success: boolean };

export type StatsSession = {
  readonly _id: string;
  readonly created: string;
  readonly currentState: string;
  readonly current_capacity: number;
  readonly current_max: number;
  readonly isMainRoom: boolean;
  readonly media: Array<{ readonly [key: string]: unknown }>;
  readonly modCount: number;
  readonly name: string;
  readonly recPreviewLocation: string | null;
  readonly recordedMaxCapacity: number;
  readonly recording: boolean;
  readonly s3Bucket: string | null;
  readonly s3BucketFolderPath: string | null;
  readonly updated: string;
  readonly uuid: string;
};

export type StatsSessionsResponse = { readonly sessions: Array<StatsSession>; readonly success: boolean };

export type StatsUser = {
  readonly _id: string;
  readonly active: boolean;
  readonly activeDateAPI: string | null;
  readonly alerterAppFCMUserOff: boolean;
  readonly alerterAppTokens: Array<string>;
  readonly created: string;
  readonly email: string;
  readonly lastLogin: string | null;
  readonly name: string;
  readonly role: number;
  readonly updated: string;
  readonly userName: string;
};

export type StatsUsersResponse = { readonly success: boolean; readonly users: Array<StatsUser> };

export type StatsVisit = {
  readonly duration: number;
  readonly email: string;
  readonly inTime: string;
  readonly ip: string | null;
  readonly isMobile: boolean;
  readonly outTime: string | null;
  readonly userName: string;
  readonly uuid: string;
};

export type StatsVisitsResponse = { readonly success: boolean; readonly userstats: Array<StatsVisit> };

export type UpdateBadgeRequest = {
  readonly autoAssignRoles: Array<string>;
  readonly backgroundColor: string;
  readonly darkThemeBadgeId: string | null;
  readonly emoji: string | null;
  readonly expectedRevision: number;
  readonly imageDataUrl: string | null;
  readonly label: string;
  readonly requestId: string;
  readonly textColor: string;
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
  readonly listAccountAdministrators: {
    readonly method: 'GET';
    readonly path: '/api/v1/accounts/{enterprise_id}/administrators';
    readonly request: undefined;
    readonly response: Array<ManagedAdministrator>;
    readonly successStatus: 200;
  };
  readonly createAccountAdministrator: {
    readonly method: 'POST';
    readonly path: '/api/v1/accounts/{enterprise_id}/administrators';
    readonly request: CreateAdministratorRequest;
    readonly response: AdministratorMutationResponse;
    readonly successStatus: 200;
  };
  readonly deleteAccountAdministrator: {
    readonly method: 'DELETE';
    readonly path: '/api/v1/accounts/{enterprise_id}/administrators/{user_id}';
    readonly request: DeleteAdministratorRequest;
    readonly response: AdministratorMutationResponse;
    readonly successStatus: 200;
  };
  readonly listAccountBadges: {
    readonly method: 'GET';
    readonly path: '/api/v1/accounts/{enterprise_id}/badges';
    readonly request: undefined;
    readonly response: Array<ManagedBadge>;
    readonly successStatus: 200;
  };
  readonly createAccountBadge: {
    readonly method: 'POST';
    readonly path: '/api/v1/accounts/{enterprise_id}/badges';
    readonly request: CreateBadgeRequest;
    readonly response: BadgeMutationResponse;
    readonly successStatus: 200;
  };
  readonly deleteAccountBadge: {
    readonly method: 'DELETE';
    readonly path: '/api/v1/accounts/{enterprise_id}/badges/{badge_id}';
    readonly request: DeleteBadgeRequest;
    readonly response: BadgeMutationResponse;
    readonly successStatus: 200;
  };
  readonly updateAccountBadge: {
    readonly method: 'PATCH';
    readonly path: '/api/v1/accounts/{enterprise_id}/badges/{badge_id}';
    readonly request: UpdateBadgeRequest;
    readonly response: BadgeMutationResponse;
    readonly successStatus: 200;
  };
  readonly listAccountCustomerApiKeys: {
    readonly method: 'GET';
    readonly path: '/api/v1/accounts/{enterprise_id}/customer-api-keys';
    readonly request: undefined;
    readonly response: Array<ManagedCustomerApiKey>;
    readonly successStatus: 200;
  };
  readonly createAccountCustomerApiKey: {
    readonly method: 'POST';
    readonly path: '/api/v1/accounts/{enterprise_id}/customer-api-keys';
    readonly request: CreateCustomerApiKeyRequest;
    readonly response: CustomerApiKeyMutationResponse;
    readonly successStatus: 200;
  };
  readonly deleteAccountCustomerApiKey: {
    readonly method: 'DELETE';
    readonly path: '/api/v1/accounts/{enterprise_id}/customer-api-keys/{key_id}';
    readonly request: DeleteCustomerApiKeyRequest;
    readonly response: CustomerApiKeyMutationResponse;
    readonly successStatus: 200;
  };
  readonly restrictAccountCustomerApiKey: {
    readonly method: 'PUT';
    readonly path: '/api/v1/accounts/{enterprise_id}/customer-api-keys/{key_id}/restrictions';
    readonly request: RestrictCustomerApiKeyRequest;
    readonly response: CustomerApiKeyMutationResponse;
    readonly successStatus: 200;
  };
  readonly rotateAccountCustomerApiKey: {
    readonly method: 'POST';
    readonly path: '/api/v1/accounts/{enterprise_id}/customer-api-keys/{key_id}/rotate';
    readonly request: RotateCustomerApiKeyRequest;
    readonly response: CustomerApiKeyMutationResponse;
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
  readonly assignAccountRoomBadges: {
    readonly method: 'POST';
    readonly path: '/api/v1/accounts/{enterprise_id}/rooms/{room_id}/badge-assignments';
    readonly request: AssignBadgesRequest;
    readonly response: BadgeMutationResponse;
    readonly successStatus: 200;
  };
  readonly launchAccountRoom: {
    readonly method: 'POST';
    readonly path: '/api/v1/accounts/{enterprise_id}/rooms/{room_id}/launch';
    readonly request: LaunchAccountRoomRequest;
    readonly response: RoomLaunchVisit;
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
