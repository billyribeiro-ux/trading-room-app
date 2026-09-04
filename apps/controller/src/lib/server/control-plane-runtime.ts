import {
  CONTROL_PLANE_MODE,
  DATABASE_URL,
  PROFILE_AUTHORITY_MODE,
  ROOM_AUTHORITY_MODE,
  ROOM_SETTINGS_AUTHORITY_MODE,
  RECAPTCHA_SECRET_KEY,
  TRADINGROOM_API_URL
} from '$app/env/private';
import { PUBLIC_RECAPTCHA_SITE_KEY } from '$app/env/public';
import { assertControlPlaneConfiguration, resolveControlPlaneMode } from './control-plane-policy';
import { assertRecaptchaConfiguration } from './recaptcha';
import { assertProfileAuthorityConfiguration, resolveProfileAuthorityMode } from './profile-authority-policy';
import { assertRoomAuthorityConfiguration, resolveRoomAuthorityMode } from './room-authority-policy';
import {
  assertRoomSettingsAuthorityConfiguration,
  resolveRoomSettingsAuthorityMode
} from './room-settings-authority-policy';

export const controlPlaneMode = resolveControlPlaneMode(CONTROL_PLANE_MODE);
export const profileAuthorityMode = resolveProfileAuthorityMode(PROFILE_AUTHORITY_MODE);
export const roomAuthorityMode = resolveRoomAuthorityMode(ROOM_AUTHORITY_MODE);
export const roomSettingsAuthorityMode = resolveRoomSettingsAuthorityMode(ROOM_SETTINGS_AUTHORITY_MODE);

assertControlPlaneConfiguration(controlPlaneMode, DATABASE_URL);
assertProfileAuthorityConfiguration(profileAuthorityMode, TRADINGROOM_API_URL);
assertRoomAuthorityConfiguration(roomAuthorityMode, profileAuthorityMode, TRADINGROOM_API_URL);
assertRoomSettingsAuthorityConfiguration(
  roomSettingsAuthorityMode,
  roomAuthorityMode,
  profileAuthorityMode,
  TRADINGROOM_API_URL
);

/*
  Beside the database assertion because it answers the same question: is this deployment configured
  to do what its UI claims. A site key without a secret renders a real-looking checkbox that nothing
  verifies — silent in production, obvious here.
*/
assertRecaptchaConfiguration(PUBLIC_RECAPTCHA_SITE_KEY, RECAPTCHA_SECRET_KEY);
