/*
  The DECISIONS `handleUserAction` makes, separated from the state it writes.

  Slice 3. `handleUserAction` is 253 lines and cannot be moved wholesale: it writes six pieces of
  `$state` (`bootboxAlert`, `bootboxPrompt`, `modal`, `previewWindowsVisible`, `selectedUserId`,
  `selectedMessageUser`), and Svelte's rule that reassigned state cannot be exported from a module
  means a wholesale move becomes a fourteen-setter dependency object — worse coupling than the
  original, bought purely to move line count.

  So only the decisions come out, which is the same split that worked for `media-capture-error.ts`.
  Everything here is a pure function over its arguments. The component keeps every assignment.
*/

/** Verbatim, including the mixed quoting — this is the capture's own string. */
export const MISSING_SCHEME_ALERT = 'The link seems to be missing "https://" or "http://"';

/**
 * Whether a URL typed into the "Please enter the URL:" prompt is acceptable.
 *
 * `includes`, NOT `startsWith`, and that is reproduced deliberately rather than corrected. The
 * reference tests whether the string CONTAINS a scheme anywhere, so `"see http://x.com"` passes and
 * so does `"xxhttps://y"`. Tightening it to `startsWith` would reject inputs the reference accepts,
 * which is a behaviour change wearing a bug fix's clothes. Locked by a test so nobody tidies it.
 *
 * Case-insensitive because the reference lowercases before testing.
 */
export function isAcceptableSendUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes('http://') || lower.includes('https://');
}

/** The outcome of adding a URL to a presenter's saved video list. */
export type VideoListAdd =
  | { added: false; reason: 'duplicate' }
  | { added: true; videos: readonly string[] };

/**
 * Add a URL to the saved video list, refusing an exact duplicate.
 *
 * The list lives in `localStorage` under `videos-{sessionHandle}`; reading and writing it stays in
 * the component because that is I/O. What is decided here is the only part with a rule: whether the
 * URL is already present, and what the list becomes if it is not.
 *
 * The comparison is exact — no trimming, no case folding, no normalising a trailing slash. The
 * caller has already trimmed, and two URLs differing only in case are two entries upstream too.
 */
export function addVideoToList(existing: readonly string[], url: string): VideoListAdd {
  if (existing.includes(url)) return { added: false, reason: 'duplicate' };
  return { added: true, videos: [...existing, url] };
}

/**
 * Actions whose ENTIRE effect is raising one fixed alert.
 *
 * This was an inline `Record<string, string>` named `exactAlerts`, and its existence is a smell the
 * repository has a name for: a control whose only effect is changing its own label. Every entry
 * here is a button that reports success and sends nothing — `mute-chat-24` from this modal does not
 * mute (the working mute is the message context menu's `mute24`), and `force-reload` and
 * `restart-audio` have never been checked for a wire.
 *
 * They are reproduced as-is because the port is not finished, NOT because they are correct. TODO
 * row W tracks them. Keeping them in one exported table rather than inline is what makes the list
 * countable, and the test asserts the count so that wiring one up for real is a visible change here
 * rather than a quiet edit inside a 253-line function.
 */
const EXACT_ALERTS: Readonly<Record<string, string>> = {
  'save-permissions': 'Permissions applied, user will reload the page now to apply...',
  'mute-chat-24': 'user chat muted',
  'mute-chat-indefinitely': 'user chat muted',
  'restart-audio': 'Audio restart request sent OK',
  'force-reload': 'Reload request sent OK'
};

/** The fixed alert for an action, or null when the action does something more than talk. */
export function userActionAlert(action: string): string | null {
  return EXACT_ALERTS[action] ?? null;
}

/** The actions still stuck at "reports success, sends nothing". Exported so the test can count them. */
export const TOAST_ONLY_ACTIONS: readonly string[] = Object.keys(EXACT_ALERTS);
