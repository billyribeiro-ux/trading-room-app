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

export type CurrentUser = {
  readonly displayName: string;
  readonly id: string;
  readonly isGuest: boolean;
  readonly isPlatformAdmin: boolean;
  readonly preferences: { readonly [key: string]: unknown };
};

export type Error = { readonly error: { readonly code: string; readonly message: string } };

export type LoginRequest = { readonly email: string; readonly password: string };

export type PreferenceRequest = { readonly key: string; readonly value: unknown };

export type Preferences = { readonly [key: string]: unknown };

export type ProfileUpdateRequest = { readonly displayName: string; readonly preferences: Preferences };

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
}

export type TradingRoomApiOperation = keyof TradingRoomApiOperations;
