import { createSign } from 'node:crypto';
import { FCM_SERVICE_ACCOUNT_JSON } from '$app/env/private';

/**
 * Firebase Cloud Messaging, HTTP v1.
 *
 * ## What this is for
 *
 * The reference's row menu has five push actions — `sendTestFCM`, `getFCMTokens`, `resetFCMForuser`
 * and `pauseUserNotifs(…,'pause'|'resume'|'unsub')` — and its own API documentation shows the field
 * they operate on: `"alerterAppTokens": ["fcm-token-1", "fcm-token-2"]` beside
 * `"alerterAppFCMUserOff": false` (`evidence-dumps/login-page/api-docs`, the `/sessions/users`
 * response). So the "alerter app tokens" ARE FCM registration tokens; there is not a second,
 * separate token store, and this module is the one thing that can say anything true about them.
 *
 * ## The provider is not a choice here
 *
 * Unlike mail, where Resend was a decision, FCM is named by the reference itself — the handlers say
 * FCM and the stored field says FCM. HTTP v1 is the only supported API (the legacy
 * `fcm.googleapis.com/fcm/send` server-key endpoint was retired), and it authenticates with an
 * OAuth2 access token minted from a service-account key rather than a static secret.
 *
 * ## Configured, or honestly not
 *
 * There is exactly ONE variable, {@link FCM_SERVICE_ACCOUNT_JSON}, so there is no half-configured
 * state to trap anybody — but there IS a malformed state, and it is loud: a key missing
 * `project_id`, `client_email` or `private_key` throws {@link FcmCredentialInvalid} naming the
 * fields that are absent. Nothing here degrades to a no-op; a push subsystem that quietly reports
 * success is indistinguishable from one that works, right up until an alert does not arrive.
 *
 * **As of this commit there is no Firebase project**: no service account exists and the owner has
 * to create one. Until then every entry point below throws {@link FcmNotConfigured}, which names
 * the variable to set.
 *
 * ## Secrets
 *
 * The private key, the signed assertion and the access token never leave this module, never appear
 * in a thrown message, never reach a returned value and never reach a log line. Registration tokens
 * are credentials for pushing to a device, so the provider's error body — which echoes them — is
 * redacted before it is logged and is never returned to a caller at all.
 */

/** Google's OAuth2 token endpoint. Not configurable: a wrong host is a silent auth failure. */
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

/** The single scope FCM v1 needs. Deliberately not `cloud-platform`: this key sends push, only. */
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

/**
 * Two deadlines, not one.
 *
 * `CONNECT_MS` bounds DNS + TCP + TLS + the wait for response headers — the phase where a wedged
 * endpoint costs the most and tells you the least. `TOTAL_MS` then bounds reading the body. A single
 * overall timeout hides a connect stall behind a slow-response budget, and a connect stall is the
 * failure that actually happens when a project is deleted or a network path is blocked.
 */
const CONNECT_MS = 3_000;
const TOTAL_MS = 8_000;

/** Refresh a little before Google would: a token that expires in flight reads as an auth failure. */
const TOKEN_SKEW_MS = 60_000;

export class FcmNotConfigured extends Error {
  constructor() {
    super('Push notifications are not configured: set FCM_SERVICE_ACCOUNT_JSON.');
    this.name = 'FcmNotConfigured';
  }
}

export class FcmCredentialInvalid extends Error {
  constructor(detail: string) {
    super(`FCM_SERVICE_ACCOUNT_JSON is not a usable service-account key: ${detail}`);
    this.name = 'FcmCredentialInvalid';
  }
}

/**
 * Google could not be reached, or refused to mint a token.
 *
 * Distinct from every per-token outcome on purpose. "We could not ask" must NEVER be recorded as
 * "that registration is dead" — treating an outage as a stale token would delete every working
 * registration in the room the first time the network hiccuped.
 */
export class FcmUnreachable extends Error {
  constructor(detail: string) {
    super(`Firebase Cloud Messaging could not be reached: ${detail}`);
    this.name = 'FcmUnreachable';
  }
}

export interface ServiceAccount {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export function fcmConfigured(): boolean {
  return Boolean(FCM_SERVICE_ACCOUNT_JSON?.trim());
}

/**
 * Parses the service-account key, or explains exactly what is wrong with it.
 *
 * The `\n` unescaping is not cosmetic. Every host that takes secrets through a web form or a CLI
 * flag — Vercel included — stores the PEM's newlines as the two characters backslash-n, and
 * `createSign` rejects the result with "error:0909006C:PEM routines:get_name:no start line", which
 * names nothing an operator can act on. Normalising here turns a mystifying crypto error into a
 * working key.
 */
export function readServiceAccount(): ServiceAccount {
  const raw = FCM_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) throw new FcmNotConfigured();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // The value itself is a secret and is deliberately not echoed.
    throw new FcmCredentialInvalid('it is not valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new FcmCredentialInvalid('it is not a JSON object');
  }

  const key = parsed as Record<string, unknown>;
  const text = (name: string) => (typeof key[name] === 'string' ? (key[name] as string).trim() : '');
  const projectId = text('project_id');
  const clientEmail = text('client_email');
  const privateKey = text('private_key');

  const missing = [
    projectId ? null : 'project_id',
    clientEmail ? null : 'client_email',
    privateKey ? null : 'private_key'
  ].filter((n): n is string => n !== null);
  if (missing.length > 0) {
    throw new FcmCredentialInvalid(`it has no ${missing.join(', ')}`);
  }

  return { projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') };
}

/**
 * One HTTP exchange under the two deadlines described above.
 *
 * The controller is shared between both phases so that aborting after headers have arrived also
 * tears down the body stream — a response that stops mid-body is otherwise unbounded.
 */
async function fetchBounded(
  url: string,
  init: RequestInit,
  fetchImpl: typeof fetch
): Promise<{ status: number; body: string }> {
  const controller = new AbortController();
  const startedAt = Date.now();
  let phase: 'connect' | 'body' = 'connect';
  let timer = setTimeout(() => controller.abort(), CONNECT_MS);

  try {
    const response = await fetchImpl(url, { ...init, signal: controller.signal });
    clearTimeout(timer);
    phase = 'body';
    timer = setTimeout(() => controller.abort(), Math.max(0, TOTAL_MS - (Date.now() - startedAt)));
    const body = await response.text();
    return { status: response.status, body };
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new FcmUnreachable(phase === 'connect' ? `no response within ${CONNECT_MS}ms (${detail})` : detail);
  } finally {
    clearTimeout(timer);
  }
}

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

/**
 * The access-token cache.
 *
 * Keyed on `clientEmail` rather than being a bare pair of variables, so swapping the credential —
 * which is what happens between a staging deploy and a test — cannot serve a token minted for the
 * previous project. A cache that outlives the thing it caches is the classic refactor casualty;
 * this one cannot, because the key is the identity of the credential itself.
 */
let cachedToken: { clientEmail: string; token: string; expiresAt: number } | null = null;

async function accessToken(account: ServiceAccount, fetchImpl: typeof fetch, now = Date.now()): Promise<string> {
  if (cachedToken && cachedToken.clientEmail === account.clientEmail && cachedToken.expiresAt - TOKEN_SKEW_MS > now) {
    return cachedToken.token;
  }

  const issuedAt = Math.floor(now / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: account.clientEmail,
      scope: SCOPE,
      aud: TOKEN_ENDPOINT,
      iat: issuedAt,
      exp: issuedAt + 3600
    })
  );

  let signature: string;
  try {
    signature = base64url(createSign('RSA-SHA256').update(`${header}.${claims}`).sign(account.privateKey));
  } catch (cause) {
    // The key is a secret; only the reason it could not be used is surfaced.
    throw new FcmCredentialInvalid(
      `its private_key could not sign (${cause instanceof Error ? cause.message : String(cause)})`
    );
  }

  const { status, body } = await fetchBounded(
    TOKEN_ENDPOINT,
    {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${header}.${claims}.${signature}`
      }).toString()
    },
    fetchImpl
  );

  if (status !== 200) {
    /*
      Google's failure body names the reason (`invalid_grant`, clock skew, a disabled account) and
      contains nothing secret — but it is logged rather than thrown, because a thrown message ends
      up rendered on a page and this one is for whoever reads the server log.
    */
    console.error('[fcm] token endpoint refused the assertion', { status, body });
    throw new FcmUnreachable(`the token endpoint answered ${status}`);
  }

  let parsed: { access_token?: unknown; expires_in?: unknown };
  try {
    parsed = JSON.parse(body) as { access_token?: unknown; expires_in?: unknown };
  } catch {
    throw new FcmUnreachable('the token endpoint answered 200 with a body that is not JSON');
  }
  const token = typeof parsed.access_token === 'string' ? parsed.access_token : '';
  const expiresIn = typeof parsed.expires_in === 'number' ? parsed.expires_in : 0;
  if (!token) throw new FcmUnreachable('the token endpoint answered 200 with no access_token');

  cachedToken = {
    clientEmail: account.clientEmail,
    token,
    // A missing expires_in is treated as the shortest sane life rather than as forever.
    expiresAt: now + (expiresIn > 0 ? expiresIn : 300) * 1000
  };
  return token;
}

/**
 * What FCM said about ONE registration.
 *
 * `unregistered` is the one that matters: the app was uninstalled, the token was rotated, or the
 * device was wiped, and that registration will never receive anything again. The caller prunes on
 * it. `rejected` deliberately does NOT license pruning — it covers quota, permission and payload
 * problems, which are about us and not about the device.
 */
export type FcmOutcome =
  | { ok: true; name: string }
  | { ok: false; reason: 'unregistered' | 'invalid-token' | 'rejected'; status: number; errorCode: string };

export interface PushMessage {
  /** The device registration token. A credential: never logged, never returned. */
  registrationToken: string;
  title: string;
  body: string;
  /**
   * FCM's `validate_only`. Everything is checked — credential, project, payload and the
   * registration token — and nothing is delivered. This is how a token can be verified without
   * buzzing somebody's phone.
   */
  dryRun?: boolean;
}

/** Pulls FCM's structured error code out of its reply without trusting any of its shape. */
function errorCodeOf(body: string): { errorCode: string; status: string } {
  try {
    const parsed = JSON.parse(body) as {
      error?: { status?: unknown; details?: Array<Record<string, unknown>> };
    };
    const status = typeof parsed.error?.status === 'string' ? parsed.error.status : '';
    const detail = (parsed.error?.details ?? []).find((d) => typeof d?.errorCode === 'string');
    return { errorCode: typeof detail?.errorCode === 'string' ? detail.errorCode : '', status };
  } catch {
    return { errorCode: '', status: '' };
  }
}

/**
 * Sends one message to one registration.
 *
 * Throws only for the failures that are ours or Google's — unconfigured, unusable credential,
 * unreachable. Everything the registration itself can be blamed for comes back as a value, because
 * the caller has to be able to tell "this one device is gone" apart from "the push subsystem is
 * down" and act differently on each.
 */
export async function sendPush(message: PushMessage, fetchImpl: typeof fetch = fetch): Promise<FcmOutcome> {
  const account = readServiceAccount();
  const token = await accessToken(account, fetchImpl);

  const { status, body } = await fetchBounded(
    `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.projectId)}/messages:send`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        validate_only: message.dryRun === true,
        message: {
          token: message.registrationToken,
          notification: { title: message.title, body: message.body }
        }
      })
    },
    fetchImpl
  );

  if (status === 200) {
    let accepted: { name?: unknown };
    try {
      accepted = JSON.parse(body) as { name?: unknown };
    } catch {
      throw new FcmUnreachable('FCM answered 200 with a body that is not JSON');
    }
    // FCM's `name` is `projects/<id>/messages/<id>` — an opaque receipt, not a credential.
    return { ok: true, name: typeof accepted.name === 'string' ? accepted.name : '' };
  }

  const { errorCode, status: googleStatus } = errorCodeOf(body);

  /*
    The body is logged with the registration token blanked. FCM echoes the token it was given in
    several of its error messages, and a device credential in a log file is a device credential
    somebody can use.
  */
  console.error('[fcm] send refused', {
    status,
    googleStatus,
    errorCode,
    body: body.split(message.registrationToken).join('<registration-token>')
  });

  if (status === 404 || errorCode === 'UNREGISTERED') {
    return { ok: false, reason: 'unregistered', status, errorCode: errorCode || 'UNREGISTERED' };
  }
  if (status === 400 && (errorCode === 'INVALID_ARGUMENT' || googleStatus === 'INVALID_ARGUMENT')) {
    return { ok: false, reason: 'invalid-token', status, errorCode: errorCode || 'INVALID_ARGUMENT' };
  }
  return { ok: false, reason: 'rejected', status, errorCode: errorCode || googleStatus };
}
