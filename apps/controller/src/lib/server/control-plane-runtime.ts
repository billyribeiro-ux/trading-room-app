import { CONTROL_PLANE_MODE, DATABASE_URL, RECAPTCHA_SECRET_KEY } from '$app/env/private';
import { PUBLIC_RECAPTCHA_SITE_KEY } from '$app/env/public';
import { assertControlPlaneConfiguration, resolveControlPlaneMode } from './control-plane-policy';
import { assertRecaptchaConfiguration } from './recaptcha';

export const controlPlaneMode = resolveControlPlaneMode(CONTROL_PLANE_MODE);

assertControlPlaneConfiguration(controlPlaneMode, DATABASE_URL);

/*
  Beside the database assertion because it answers the same question: is this deployment configured
  to do what its UI claims. A site key without a secret renders a real-looking checkbox that nothing
  verifies — silent in production, obvious here.
*/
assertRecaptchaConfiguration(PUBLIC_RECAPTCHA_SITE_KEY, RECAPTCHA_SECRET_KEY);
