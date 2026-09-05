import {
  BADGE_AUTHORITY_MODE,
  ADMINISTRATOR_AUTHORITY_MODE,
  CUSTOMER_API_KEY_AUTHORITY_MODE,
  CONTROL_PLANE_MODE,
  DATABASE_URL,
  MEMBERSHIP_AUTHORITY_MODE,
  PROFILE_AUTHORITY_MODE,
  ROOM_AUTHORITY_MODE,
  ROOM_BASE_URL,
  ROOM_JWT_SECRET,
  ROOM_LAUNCH_AUTHORITY_MODE,
  ROOM_SETTINGS_AUTHORITY_MODE,
  RECAPTCHA_SECRET_KEY,
  API_KEY_ENCRYPTION_KEY,
  TRADINGROOM_INTERNAL_SECRET,
  TRADINGROOM_API_URL
} from '$app/env/private';
import { PUBLIC_RECAPTCHA_SITE_KEY } from '$app/env/public';
import { assertControlPlaneConfiguration, resolveControlPlaneMode } from './control-plane-policy';
import { assertRecaptchaConfiguration } from './recaptcha';
import { assertProfileAuthorityConfiguration, resolveProfileAuthorityMode } from './profile-authority-policy';
import { assertMembershipAuthorityConfiguration, resolveMembershipAuthorityMode } from './membership-authority-policy';
import { assertBadgeAuthorityConfiguration, resolveBadgeAuthorityMode } from './badge-authority-policy';
import {
  assertAdministratorAuthorityConfiguration,
  resolveAdministratorAuthorityMode
} from './administrator-authority-policy';
import {
  assertCustomerApiKeyAuthorityConfiguration,
  resolveCustomerApiKeyAuthorityMode
} from './customer-api-key-authority-policy';
import { assertRoomAuthorityConfiguration, resolveRoomAuthorityMode } from './room-authority-policy';
import {
  assertRoomSettingsAuthorityConfiguration,
  resolveRoomSettingsAuthorityMode
} from './room-settings-authority-policy';
import { assertRoomLaunchAuthorityConfiguration, resolveRoomLaunchAuthorityMode } from './room-launch-authority-policy';

export const controlPlaneMode = resolveControlPlaneMode(CONTROL_PLANE_MODE);
export const profileAuthorityMode = resolveProfileAuthorityMode(PROFILE_AUTHORITY_MODE);
export const roomAuthorityMode = resolveRoomAuthorityMode(ROOM_AUTHORITY_MODE);
export const roomSettingsAuthorityMode = resolveRoomSettingsAuthorityMode(ROOM_SETTINGS_AUTHORITY_MODE);
export const membershipAuthorityMode = resolveMembershipAuthorityMode(MEMBERSHIP_AUTHORITY_MODE);
export const badgeAuthorityMode = resolveBadgeAuthorityMode(BADGE_AUTHORITY_MODE);
export const administratorAuthorityMode = resolveAdministratorAuthorityMode(ADMINISTRATOR_AUTHORITY_MODE);
export const customerApiKeyAuthorityMode = resolveCustomerApiKeyAuthorityMode(CUSTOMER_API_KEY_AUTHORITY_MODE);
export const roomLaunchAuthorityMode = resolveRoomLaunchAuthorityMode(ROOM_LAUNCH_AUTHORITY_MODE);

assertControlPlaneConfiguration(controlPlaneMode, DATABASE_URL);
assertProfileAuthorityConfiguration(profileAuthorityMode, TRADINGROOM_API_URL);
assertRoomAuthorityConfiguration(roomAuthorityMode, profileAuthorityMode, TRADINGROOM_API_URL);
assertRoomSettingsAuthorityConfiguration(
  roomSettingsAuthorityMode,
  roomAuthorityMode,
  profileAuthorityMode,
  TRADINGROOM_API_URL
);
assertMembershipAuthorityConfiguration(
  membershipAuthorityMode,
  roomSettingsAuthorityMode,
  roomAuthorityMode,
  profileAuthorityMode,
  TRADINGROOM_API_URL,
  TRADINGROOM_INTERNAL_SECRET
);
assertBadgeAuthorityConfiguration(badgeAuthorityMode, membershipAuthorityMode, TRADINGROOM_API_URL);
assertAdministratorAuthorityConfiguration(administratorAuthorityMode, badgeAuthorityMode, TRADINGROOM_API_URL);
assertCustomerApiKeyAuthorityConfiguration(
  customerApiKeyAuthorityMode,
  administratorAuthorityMode,
  TRADINGROOM_API_URL,
  API_KEY_ENCRYPTION_KEY
);
assertRoomLaunchAuthorityConfiguration(
  roomLaunchAuthorityMode,
  customerApiKeyAuthorityMode,
  TRADINGROOM_API_URL,
  TRADINGROOM_INTERNAL_SECRET,
  ROOM_BASE_URL,
  ROOM_JWT_SECRET
);

/*
  Beside the database assertion because it answers the same question: is this deployment configured
  to do what its UI claims. A site key without a secret renders a real-looking checkbox that nothing
  verifies — silent in production, obvious here.
*/
assertRecaptchaConfiguration(PUBLIC_RECAPTCHA_SITE_KEY, RECAPTCHA_SECRET_KEY);
