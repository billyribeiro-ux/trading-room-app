/*
  What to SAY when `getUserMedia` / `getDisplayMedia` refuses — taken out of `+page.svelte`.

  Slice 2 of the decomposition. 131 lines came out of the component and only one of them was
  stateful: the final `bootboxAlert = …`. Everything else was a decision about which sentence to
  show, which is exactly the kind of thing that belongs in a module with tests rather than in a
  page. The component keeps the assignment and nothing else.

  This is a plain `.ts` and NOT a `.svelte.ts`, deliberately: there is no reactive state here. A
  `.svelte.ts` would advertise runes that do not exist and invite somebody to add some.

  The strings are reproduced to the character, including the ones that read oddly. They are the
  user-facing copy this room already ships; changing them here would be a silent product change
  smuggled in under a refactor.
*/

/** The three things a room can try to capture. */
export type MediaCaptureKind = 'microphone' | 'camera' | 'screen';

/** What the Permissions API calls them, which is not the same set of words. */
export type MediaPermissionKind = 'microphone' | 'camera' | 'display-capture';

/**
 * Screen capture is `display-capture` to the Permissions API and `screen` to us.
 *
 * Kept as a function rather than inlined at the one call site, because it is the only place the
 * two vocabularies meet and a future third capture kind will need exactly this map.
 */
export function permissionForCapture(kind: MediaCaptureKind): MediaPermissionKind {
  return kind === 'screen' ? 'display-capture' : kind;
}

/** The `name` off a DOMException, or an empty string when the thrown value is not one. */
export function captureErrorName(error: unknown): string {
  return error && typeof error === 'object' && 'name' in error ? String(error.name) : '';
}

/** The `message` off a DOMException, with a stand-in rather than `undefined` in the sentence. */
export function captureErrorMessage(error: unknown): string {
  return error && typeof error === 'object' && 'message' in error
    ? String(error.message)
    : 'Unknown error occurred';
}

/**
 * Where in THIS browser the user has to go to undo a denial.
 *
 * Sniffing the user agent is the right call here and nowhere else: there is no feature to detect,
 * because the question is "what is this vendor's settings menu called", and getting it wrong sends
 * somebody hunting through a menu that does not exist. The order matters — Edge and Chrome both
 * claim `chrome`, and Safari's string contains neither more nor less than `safari` unless Chrome
 * put it there, which is why each test excludes the impostor rather than just matching.
 */
export function getBrowserPermissionGuidance(
  permission: MediaPermissionKind,
  userAgentRaw: string
): string {
  const userAgent = userAgentRaw.toLowerCase();
  const isChrome = userAgent.includes('chrome') && !userAgent.includes('edg');
  const isFirefox = userAgent.includes('firefox');
  const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');
  const isEdge = userAgent.includes('edg');
  const permissionLabel =
    permission === 'microphone' ? 'Microphone' : permission === 'camera' ? 'Camera' : 'Screen capture';
  let browserName = 'your browser';
  let settingsPath = '';

  if (isChrome) {
    browserName = 'Chrome';
    settingsPath = `Settings > Privacy and security > Site Settings > ${permissionLabel}`;
  } else if (isFirefox) {
    browserName = 'Firefox';
    settingsPath = `Settings > Privacy & Security > Permissions > ${permissionLabel}`;
  } else if (isSafari) {
    browserName = 'Safari';
    settingsPath = `Safari > Preferences > Websites > ${permissionLabel}`;
  } else if (isEdge) {
    browserName = 'Edge';
    settingsPath = `Settings > Cookies and site permissions > ${permissionLabel}`;
  }

  const mediaLabel =
    permission === 'microphone' ? 'microphone' : permission === 'camera' ? 'camera' : 'screen sharing';
  return `Permission denied. To enable ${mediaLabel}, go to ${browserName} ${settingsPath} and allow access for this site.`;
}

/**
 * Ask the Permissions API what state we are actually in.
 *
 * Every non-denied answer is a SENTINEL, not prose — `permission_granted`, `permission_prompt`,
 * `permission_unknown`, `permission_check_failed`. Only the denied branch returns a sentence, and
 * the caller distinguishes them by testing for the `Permission denied` prefix. That is load-bearing
 * and easy to break: return a friendly sentence for `prompt` and the room starts telling people
 * their permission was denied when the browser has not asked yet.
 */
export async function checkPermissionState(
  permission: MediaPermissionKind,
  userAgent: string
): Promise<string> {
  if (!navigator.permissions?.query) return 'Permissions API not supported in this browser';

  try {
    const result = await navigator.permissions.query({ name: permission } as PermissionDescriptor);
    if (result.state === 'granted') return 'permission_granted';
    if (result.state === 'denied') return getBrowserPermissionGuidance(permission, userAgent);
    if (result.state === 'prompt') return 'permission_prompt';
    return 'permission_unknown';
  } catch {
    return 'permission_check_failed';
  }
}

/** The per-kind copy. `overconstrained` is absent for `screen` because the original had no such branch. */
const COPY: Record<
  MediaCaptureKind,
  {
    unsupported: string;
    notFound: string;
    secure: string;
    insecure: string;
    overconstrained?: string;
    fallback: (message: string) => string;
  }
> = {
  microphone: {
    unsupported:
      'Your browser does not support microphone access. Please use Chrome, Firefox, or Safari.',
    notFound:
      'No microphone detected. Please ensure you have a microphone connected and try again.',
    secure: 'Security error accessing microphone. Please check your browser settings.',
    insecure:
      'Microphone access requires a secure connection (HTTPS). Please check your browser settings or contact your administrator.',
    overconstrained:
      'The selected microphone does not meet the required specifications. Please try a different microphone.',
    fallback: (message) => `Error enabling microphone: ${message}`
  },
  camera: {
    unsupported:
      'Your browser does not support camera access. Please use Chrome, Firefox, or Safari.',
    notFound: 'No camera detected. Please ensure you have a camera connected and try again.',
    secure: 'Security error accessing camera. Please check your browser settings.',
    insecure:
      'Camera access requires a secure connection (HTTPS). Please check your browser settings or contact your administrator.',
    overconstrained:
      'The selected camera does not meet the required specifications. Please try a different camera.',
    fallback: (message) => `Error enabling camera: ${message}`
  },
  screen: {
    unsupported:
      'Your browser does not support screen sharing. Please use Chrome, Firefox, or Safari.',
    notFound:
      'No screens or windows available for sharing. Please ensure you have a screen connected.',
    secure: 'Security error accessing screen sharing. Please check your browser settings.',
    insecure:
      'Screen sharing requires a secure connection (HTTPS). Please check your browser settings or contact your administrator.',
    /*
      No `overconstrained` entry, and that is not an omission. The original had an
      OverconstrainedError branch for microphone and camera and none for screen sharing, so a
      screen OverconstrainedError falls through to the generic sentence. Adding one here would be
      inventing copy nobody wrote.
    */
    fallback: (message) => `Screen sharing error: ${message}`
  }
};

/**
 * The sentence for a capture failure, or `null` when the caller must handle it instead.
 *
 * `null` for exactly two names, and both are the caller's job rather than a missing case:
 *
 * - `NotAllowedError` needs the ASYNC Permissions API round trip, and it is only shown when that
 *   comes back denied — the room deliberately says nothing when the user simply dismissed the
 *   prompt, because they know what they just did.
 * - `AbortError` is the user closing the picker. Saying anything at all would be noise.
 */
export function mediaCaptureErrorMessage(input: {
  kind: MediaCaptureKind;
  errorName: string;
  errorMessage: string;
  isSecureContext: boolean;
}): string | null {
  const { kind, errorName, errorMessage, isSecureContext } = input;
  if (errorName === 'NotAllowedError' || errorName === 'AbortError') return null;

  const copy = COPY[kind];
  if (errorName === 'NotSupportedError') return copy.unsupported;
  if (errorName === 'NotFoundError') return copy.notFound;
  if (errorName === 'SecurityError') return isSecureContext ? copy.secure : copy.insecure;
  if (errorName === 'OverconstrainedError' && copy.overconstrained) return copy.overconstrained;
  return copy.fallback(errorMessage);
}
