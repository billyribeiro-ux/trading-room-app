import { defineEnvVars } from '@sveltejs/kit/env';
import * as v from 'valibot';

const optionalText = v.optional(v.string());
const optionalUrl = v.optional(v.union([v.literal(''), v.pipe(v.string(), v.url())]));
const optionalControlPlaneMode = v.optional(v.union([v.literal(''), v.picklist(['marketing-only', 'postgres'])]));
const optionalProfileAuthorityMode = v.optional(v.union([v.literal(''), v.picklist(['legacy', 'rust'])]));
const optionalRoomAuthorityMode = v.optional(v.union([v.literal(''), v.picklist(['legacy', 'rust'])]));
const optionalRoomSettingsAuthorityMode = v.optional(v.union([v.literal(''), v.picklist(['legacy', 'rust'])]));
const optionalMembershipAuthorityMode = v.optional(v.union([v.literal(''), v.picklist(['legacy', 'rust'])]));
const optionalBadgeAuthorityMode = v.optional(v.union([v.literal(''), v.picklist(['legacy', 'rust'])]));
const optionalAdministratorAuthorityMode = v.optional(v.union([v.literal(''), v.picklist(['legacy', 'rust'])]));
const optionalCustomerApiKeyAuthorityMode = v.optional(v.union([v.literal(''), v.picklist(['legacy', 'rust'])]));
const optionalRoomLaunchAuthorityMode = v.optional(v.union([v.literal(''), v.picklist(['legacy', 'rust'])]));

/**
 * The application environment contract.
 *
 * Standalone maintenance scripts have their own documented `process.env`
 * boundary; SvelteKit application code imports only these named variables from
 * `$app/env/private` or `$app/env/public`.
 */
export const variables = defineEnvVars({
  CONTROL_PLANE_MODE: {
    description:
      'Fail-closed runtime boundary. marketing-only is the safe default and serves four static routes; postgres enables the application.',
    schema: optionalControlPlaneMode
  },
  DATABASE_URL: {
    description:
      'PostgreSQL connection string. Required only when CONTROL_PLANE_MODE=postgres. Use the pooled endpoint on a serverless host.',
    schema: optionalText
  },
  TRADINGROOM_API_URL: {
    description:
      'Private origin of the Rust authority service. Browser requests stay same-origin and reach it only through the reviewed SvelteKit proxy endpoints.',
    schema: optionalUrl
  },
  TRADINGROOM_INTERNAL_SECRET: {
    description:
      'Independent controller-to-Rust service credential for live-room membership writes. Required only when MEMBERSHIP_AUTHORITY_MODE=rust; never reuse another signing or encryption key.',
    schema: optionalText
  },
  PROFILE_AUTHORITY_MODE: {
    description:
      'Reversible Gate 3 profile authority switch. legacy is the safe default; rust requires reconciled UUID mappings and TRADINGROOM_API_URL and refuses mismatches.',
    schema: optionalProfileAuthorityMode
  },
  ROOM_AUTHORITY_MODE: {
    description:
      'Reversible Gate 3 room lifecycle switch. legacy is the safe default; rust requires the profile authority bridge, reconciled room UUID mappings, and TRADINGROOM_API_URL.',
    schema: optionalRoomAuthorityMode
  },
  ROOM_SETTINGS_AUTHORITY_MODE: {
    description:
      'Reversible Gate 3 room-settings authority switch. rust requires profile and room authority, reconciled setting revisions, and TRADINGROOM_API_URL.',
    schema: optionalRoomSettingsAuthorityMode
  },
  MEMBERSHIP_AUTHORITY_MODE: {
    description:
      'Reversible Gate 3 membership authority switch. rust requires profile, room, and room-settings authority plus reconciled membership UUID/revision mappings.',
    schema: optionalMembershipAuthorityMode
  },
  BADGE_AUTHORITY_MODE: {
    description:
      'Reversible Gate 3 badge authority switch. rust requires membership authority, reconciled badge UUID/revision mappings, and TRADINGROOM_API_URL.',
    schema: optionalBadgeAuthorityMode
  },
  ADMINISTRATOR_AUTHORITY_MODE: {
    description:
      'Reversible Gate 3 account-administrator authority switch. rust requires all preceding authority slices, reconciled administrator UUID/revision mappings, and TRADINGROOM_API_URL.',
    schema: optionalAdministratorAuthorityMode
  },
  CUSTOMER_API_KEY_AUTHORITY_MODE: {
    description:
      'Reversible Gate 3 customer API-key authority switch. rust requires all preceding authority slices, reconciled key revisions, TRADINGROOM_API_URL, and API_KEY_ENCRYPTION_KEY.',
    schema: optionalCustomerApiKeyAuthorityMode
  },
  ROOM_LAUNCH_AUTHORITY_MODE: {
    description:
      'Reversible final Gate 3 room-entry switch. rust requires every preceding authority, the Rust service credentials, a separate room origin, and a 32+ character handoff secret.',
    schema: optionalRoomLaunchAuthorityMode
  },
  SUPERADMIN_EMAILS: {
    description:
      'Comma-separated emails allowed to reach /admin and see every account. Deliberately NOT a password: a superadmin signs in through the ordinary hardened login and this list grants the extra privilege, so the credential and the privilege can be revoked independently. An env var rather than a database column so granting it requires deploy access rather than an INSERT.',
    schema: optionalText
  },
  RESEND_API_KEY: {
    description:
      'API key for outbound transactional email (verification, and password reset next). Optional, and the product behaves DIFFERENTLY without it rather than merely failing: when it is absent nothing is sent and email verification is NOT enforced, because enforcing a check that cannot be delivered locks every user out of a product that looks like it works.',
    schema: optionalText
  },
  MAIL_FROM: {
    description:
      'The From address for outbound email. Required alongside RESEND_API_KEY — a key with no sender is a half-configured transport that fails at send time rather than at boot. There is deliberately no default: the sending domain needs DKIM/SPF records before any address on it is real, and a plausible-looking default would silently bounce.',
    schema: optionalText
  },
  FCM_SERVICE_ACCOUNT_JSON: {
    description:
      'The complete Google service-account key JSON for the Firebase project that owns the mobile app, pasted verbatim — it must contain project_id, client_email and private_key, and the key needs the Firebase Cloud Messaging API enabled. Firebase Cloud Messaging HTTP v1 authenticates with an OAuth2 token minted from this key; there is no static server key any more. Optional, and absent it the push actions REFUSE rather than degrade: "Get FCM Tokens" and "Send Test Mobile Notifs" report that this variable is unset instead of returning an empty list, because a push subsystem that quietly answers "nothing to do" is indistinguishable from one that works. Hosts that take secrets through a web form store the PEM newlines as literal backslash-n; that is unescaped on read, so either form is accepted.',
    schema: optionalText
  },
  ROOM_JWT_SECRET: {
    description: 'Private HMAC secret used to sign short-lived room handoff tokens.',
    schema: optionalText
  },
  API_KEY_ENCRYPTION_KEY: {
    description: 'Private master key used to encrypt owner-visible API-key secrets at rest.',
    schema: optionalText
  },
  DISCORD_CLIENT_ID: {
    description: 'Discord OAuth2 application client id. Required only when a room enables Discord linking.',
    schema: optionalText
  },
  DISCORD_CLIENT_SECRET: {
    description: 'Discord OAuth2 application secret. Server-only and never persisted or exposed to either browser.',
    schema: optionalText
  },
  DISCORD_REDIRECT_URI: {
    description: 'Exact HTTPS callback URI registered on the Discord application.',
    schema: optionalUrl
  },
  ROOM_BASE_URL: {
    description: 'Optional absolute URL of the separate live-room application.',
    schema: optionalUrl
  },
  STREAM_SERVER_MTX: {
    description:
      "Host of the MediaMTX media server that external encoders (OBS, XSplit) publish into — HOST ONLY, no scheme and no port, because the two ingest URLs append their own: WHIP is http://<host>:8889/<path>/whip and RTMP is rtmp://<host>/<path>. Named after the reference's own `globals.streamServerMTX` so the two systems can be read side by side. Optional, and its absence is REPORTED rather than defaulted: with it blank the room's OBS panel says the server is not configured instead of handing a presenter a link to nowhere. It is a separate host from the SFU, and deliberately so — the reference keeps `streamServerMTX` and `streamServer` as two globals.",
    schema: optionalText
  },
  MEDIA_CLUSTER_HOSTS_JSON: {
    description:
      'Optional JSON object mapping clusterID values to MediaMTX hosts. A value may be a host string or {"host":"media.example.com","healthUrl":"https://media.example.com/health"}. When both primary and backup clusters are configured, a failed primary health check selects the backup.',
    schema: optionalText
  },
  PUBLIC_SITE_ORIGIN: {
    public: true,
    description:
      'Absolute origin the room, vanity, unique, registration and app-pair links are built from. Blank falls back to the request origin.',
    schema: optionalUrl
  },
  PUBLIC_RECAPTCHA_SITE_KEY: {
    public: true,
    description:
      'Public Google reCAPTCHA v2 site key. Blank disables the widget. Must be set together with RECAPTCHA_SECRET_KEY.',
    schema: optionalText
  },
  RECAPTCHA_SECRET_KEY: {
    description:
      'Private Google reCAPTCHA v2 secret, used only for server-side siteverify. Setting the site key without this renders a widget nothing verifies, so a half-configured pair is a startup error.',
    schema: optionalText
  }
});
