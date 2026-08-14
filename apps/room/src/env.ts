import { defineEnvVars } from '@sveltejs/kit/env';

/*
  A plain function rather than a Standard Schema validator. `EnvVarConfig.schema` accepts either,
  and the room does not otherwise depend on valibot — the controller does, and adding a validation
  library to this app to express "an optional string" would be weight without a guarantee.

  Every use site already fails closed with a message naming the variable, which is a better error
  than a boot-time schema failure: it says what could not be done, not merely what was unset.
*/
const optionalText = (value: string | undefined) => value;
const optionalUrl = optionalText;

/**
 * The room's environment contract — and under Kit 3 this file is what makes the values EXIST.
 *
 * ## Why it had to be written, and what its absence broke
 *
 * The room read its configuration through `import { env as privateEnv } from '$env/dynamic/private'`
 * (`lib/server/room-config-client.ts:21`, `lib/server/media-grant.ts:62`). In Kit 2 that module was
 * a live view of `process.env`. In Kit 3 it is a five-line shim over this file's output:
 *
 * ```js
 * // @sveltejs/kit/src/runtime/env/dynamic/private.js
 * import * as env from '../../app/env/private.js';
 * export { env };
 * ```
 *
 * `$app/env/private` exports exactly the variables DECLARED here and nothing else. The controller
 * has had such a file since the explicit-env work; the room never did. So after the Kit 3 upgrade
 * every private lookup in the room returned `undefined` while `process.env` held the real value —
 * measured on the deployed box, where `/proc/<pid>/environ` showed `ROOM_JWT_SECRET` at its full
 * 64 characters and the app still logged
 * `[session] ROOM_JWT_SECRET is not configured; refusing every handoff`. Every Launch answered 500
 * until the build was rolled back.
 *
 * Nothing in the toolchain caught it: `svelte-check` passes, 524 unit tests pass, and both adapters
 * build cleanly, because the failure only exists when a built server boots against a real
 * environment.
 *
 * ## Optional, not required, and deliberately so
 *
 * Every schema below is optional. The room already fails CLOSED at each use site with a message
 * naming the variable — `RoomConfigUnavailable('ROOM_JWT_SECRET is not configured')`,
 * `GrantConfigError('MEDIA_GRANT_PRIVATE_KEY is not set: media admission grants cannot be signed')` —
 * and those messages are more useful than a boot-time schema failure that names one variable and
 * stops. Marking them required here would also make `vite build` and every test run demand a full
 * production environment.
 */
export const variables = defineEnvVars({
  DATABASE_URL: {
    description:
      'SQLite file path for the room, NOT a connection string — the room keeps its own store on disk beside the app.',
    schema: optionalText
  },
  CONTROL_BASE_URL: {
    description:
      'Absolute origin of the controller that owns this room. The room fetches settings, the lock list and per-room standing from it on every page load and fails closed if it cannot.',
    schema: optionalUrl
  },
  ROOM_JWT_SECRET: {
    description:
      'HS256 secret shared with the controller. It verifies the handoff token on /session and signs the room-config request. Must be byte-identical on both sides or every Launch link is rejected.',
    schema: optionalText
  },
  /*
    The bearer MediaMTX presents on `/internal/media-hook`.

    A SEPARATE secret from `ROOM_JWT_SECRET`, deliberately. That one is the controller↔room signing
    key and it verifies handoff tokens — the thing that decides who a person is. This one is handed
    to a third-party media server and then written into a `runOnAvailable` shell command in
    `mediamtx.yml`, where it will sit in a config file, in that host's process table, and in
    whatever provisioning tool wrote it. Reusing the identity key there would put the room's session
    signer on a media box for no reason.

    Unset means the hook route refuses everything, which is the correct closed state: without a
    secret there is no way to tell MediaMTX apart from anyone else who found the URL, and the
    reconcile already keeps the stream list correct without it.
  */
  MEDIA_HOOK_SECRET: {
    description:
      'Bearer token MediaMTX presents on /internal/media-hook, set in the runOnAvailable/runOnUnavailable commands in mediamtx.yml. Unset means the hook is refused and the room relies on reconciliation alone.',
    schema: optionalText
  },
  /*
    The control API MediaMTX exposes, which the reconcile polls for the true stream list.

    `api: yes` in `mediamtx.yml` and `127.0.0.1:9997` by default, localhost-only unless configured
    otherwise — so in a real deployment this is an internal address, not the public media host.
    Unset means no reconcile runs and the room depends on hooks alone.
  */
  MEDIA_API_URL: {
    description:
      "Origin of MediaMTX's control API, e.g. http://127.0.0.1:9997. Polled for /v3/paths/list to reconcile the room's stream list. Unset means no reconciliation.",
    schema: optionalUrl
  },
  MEDIA_WS_URL: {
    description:
      "The SFU's signalling socket, handed to the browser by /api/media/grant. wss:// in production; the grant rides the query string.",
    schema: optionalText
  },
  MEDIA_GRANT_PRIVATE_KEY: {
    description:
      'Ed25519 PKCS#8 PEM. SERVER ONLY — the half that mints admission grants. Escaped newlines are accepted, because systemd EnvironmentFile cannot carry a multi-line value.',
    schema: optionalText
  },
  MEDIA_STUN_URLS: {
    description:
      'Comma-separated STUN URLs offered to the browser. Empty means none are advertised.',
    schema: optionalText
  },
  MEDIA_TURN_URLS: {
    description:
      'Comma-separated TURN URLs. Requires MEDIA_TURN_SECRET; without both, no relay is advertised and the connectivity test reports TURN as unconfigured rather than failed.',
    schema: optionalText
  },
  MEDIA_TURN_SECRET: {
    description:
      'Shared secret for coturn time-limited credentials. The username IS the expiry, so there is no server-side state.',
    schema: optionalText
  },
  UPLOAD_DIR: {
    description: 'Directory for uploaded files. Defaults to the app-relative store when unset.',
    schema: optionalText
  },
  PUBLIC_PTR_UPLOAD_SERVER: {
    public: true,
    description: 'Optional external upload endpoint used by the composer.',
    schema: optionalText
  },
  PUBLIC_PTR_CDN_UPLOAD_KEY: {
    public: true,
    description:
      'Public key for that upload endpoint. Public by construction — it reaches the browser.',
    schema: optionalText
  },
  PUBLIC_PTR_GIPHY_API_KEY: {
    public: true,
    description: 'Public Giphy key for the emoji/GIF picker.',
    schema: optionalText
  },
  /*
    The tawk.to property the presenter support widget opens into.

    Optional, and its absence is a real state rather than a misconfiguration: with no property set
    no script is injected and the "TAWK Support" control does not render at all. That is deliberate.

    The reference hardcodes its own property — `5aecb59f227d3d7edc24f7c2`
    (`app-room.full.js:2279`) — and reproducing that literal would open every presenter's support
    chat into protradingroom's inbox, with `setAttributes` posting their name and email address
    into it. So this is the one value in that feature that is configuration rather than
    transcription. See `$lib/tawk-support`.

    Public by construction: it reaches the browser inside the script URL, exactly as the reference's
    does. It is an embed id, not a credential.
  */
  PUBLIC_PTR_TAWK_PROPERTY_ID: {
    public: true,
    description:
      'tawk.to property id for presenter support. Unset means the widget is not loaded at all.',
    schema: optionalText
  }
});
