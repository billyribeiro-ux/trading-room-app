/**
 * Implemented room features and the settings needed to make each integration
 * operational.
 *
 * These settings describe configuration readiness, not authorization. The
 * reference's demo tenant conflates the two by hiding paid features when a
 * token or Stripe email is absent. This build exposes every implemented feature
 * and uses the server-only account-entitlement policy as the future RBAC/ABAC
 * boundary. A missing setting may explain why an external integration cannot
 * complete, but it never removes the feature from the UI.
 */
import type { RoomSettings } from './room-settings-schema';

export interface FeatureDef {
  readonly id: string;
  readonly label: string;
  /** the room setting required before the integration is operational */
  readonly setting: keyof RoomSettings;
  /** configuration guidance; this is not access-denial copy */
  readonly reason: string;
}

export const FEATURES = [
  {
    id: 'text-list',
    label: 'Text List',
    setting: 'twillioApiToken',
    reason: 'Add a Twilio API token in Settings to send texts from this room.'
  },
  {
    id: 'sso',
    label: 'SSO Setup',
    setting: 'ssoHost',
    reason: 'Set an SSO host in Settings to sign members in from your own site.'
  },
  {
    id: 'mobile',
    label: 'Mobile app',
    setting: 'ptrMobileAppEnabled',
    reason: 'Turn on "Enable PTR app?" in Settings to pair devices and send notifications.'
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    // the marketplace is Stripe-backed — `stripeEmail` and `subscriptionPlans`
    // are the settings behind it, and you cannot sell access without the first
    setting: 'stripeEmail',
    reason: 'Add your Stripe email in Settings to sell access to this room.'
  }
] as const satisfies readonly FeatureDef[];

export type FeatureId = (typeof FEATURES)[number]['id'];

/** Which integrations have the configuration needed to operate externally. */
export function resolveFeatureReadiness(settings: Partial<Record<string, unknown>>): Record<FeatureId, boolean> {
  const out = {} as Record<FeatureId, boolean>;
  for (const f of FEATURES) out[f.id] = Boolean(settings[f.setting]);
  return out;
}

export const FEATURE_BY_ID = new Map(FEATURES.map((f) => [f.id as FeatureId, f]));
