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
  { added: false; reason: 'duplicate' } | { added: true; videos: readonly string[] };

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
 *
 * `unmute-chat` was a SIXTH entry, and it is the reason this table is treated as a defect list
 * rather than a copy table. Its presence here WAS the bug: the presenter got "user chat unmuted"
 * and the member stayed silenced for the full 24 hours, because an entry in this table is the
 * definition of a control that sends nothing. It now has a real wire — `chat-mute.remote.ts` — and
 * `+page.svelte` handles it before consulting this table. It must never come back.
 */
const EXACT_ALERTS: Readonly<Record<string, string>> = {
  'save-permissions': 'Permissions applied, user will reload the page now to apply...',
  'mute-chat-24': 'user chat muted',
  'mute-chat-indefinitely': 'user chat muted',
  'restart-audio': 'Audio restart request sent OK'
  /*
    `force-reload` was HERE and is gone, 2026-08-23 — the second entry ever removed from this table,
    and for the same reason as `unmute-chat`: its presence WAS the bug. The button raised "Reload
    request sent OK" and sent nothing, while a working action and a working receiver sat in the
    source with nothing joining them. It now has a real command in `presenter-commands.remote.ts`.
  */
};

/** The fixed alert for an action, or null when the action does something more than talk. */
export function userActionAlert(action: string): string | null {
  return EXACT_ALERTS[action] ?? null;
}

/** The actions still stuck at "reports success, sends nothing". Exported so the test can count them. */
export const TOAST_ONLY_ACTIONS: readonly string[] = Object.keys(EXACT_ALERTS);

/*
  ── THE THIRD DISPOSITION: controls that are SILENT ──────────────────────────────────────────────

  `EXACT_ALERTS` above is the "reports success, sends nothing" family — controls that LIE. This is the
  quieter family beside it: controls that do not even lie. They dispatch an action string that
  `RoomUserActions.handle` has no branch for and this file has no entry for, and `handle` ends on a
  bare `if (fixedAlert)` with **no fallback**, so the call returns having done nothing at all. No
  command, no toast, no error, nothing in the console.

  ## Why this map exists rather than a comment

  Eleven of them were live on 2026-08-23 and **nine had never been recorded anywhere** — not in
  `TODO.md`, not in a test, not in a comment. They were found by diffing every `onUserAction('…')`
  string in the source against every branch in `handle` and every key above; nobody can find that
  class by eye, and nobody had. `user-action-disposition-contract.test.ts` now makes it impossible to
  add a twelfth silently: every dispatched action must be handled, alerted, or named HERE with a
  reason, and the test goes red otherwise. Deny by default.

  ## What an entry means, and what it does NOT mean

  An entry is **not** permission for a control to be dead. It is a record that the control is dead,
  why it cannot currently be otherwise, and what would unblock it. Removing an entry is how you
  declare a control fixed — and the test then requires it to actually be handled.

  **None of these eleven has a server half.** Verified 2026-08-23 by searching `src/routes` and
  `src/lib/server` for each name: zero files. So none can be wired by connecting an existing endpoint;
  each needs either the reference's captured wire protocol or an infrastructure decision, and this
  repository forbids inventing either. That is the honest reason they are all still here.
*/
export const INERT_ACTIONS: Readonly<Record<string, string>> = {
  /*
    The four media controls in the user-info modal's presenter column, `ModalHost.svelte:2253-2272`.
    The reference drives a peer's capture from the server; this room has no such command, and
    inventing one would let any presenter silence a member with no server-side authority check —
    exactly the 2026-08-07 escalation shape. Needs the captured wire protocol first.
  */
  'mute-mic':
    'ModalHost.svelte:2253 — no wire captured; a peer-capture command needs server authority',
  'mute-camera':
    'ModalHost.svelte:2259 — no wire captured; same server-authority requirement as mute-mic',
  'stop-screens':
    'ModalHost.svelte:2265 — no wire captured. NOTE: distinct from RoomScreens.stop(), which is an HONEST PARTIAL for your OWN screen; this button targets somebody else',
  'restart-screens': 'ModalHost.svelte:2272 — no wire captured; the restart half was never ported',

  /*
    Recording is not a room feature in this product — the reference hands it to MediaMTX, and the
    room only asks the server to record. `TODO.md` rows X and AC hold the detail: there is no room
    code waiting to be written, there is a host waiting to be stood up.
  */
  'start-recording': 'ModalHost.svelte:2279 — blocked on a MediaMTX host (TODO rows X and AC)',
  'stop-recording': 'ModalHost.svelte:2285 — blocked on a MediaMTX host (TODO rows X and AC)',

  /*
    `getDebugLog` and `setUserProfilePic` are the two this class was already known by — `TODO.md`
    records both under "DEAD CONTROLS". Their modals exist and are unreachable: nothing ever sets
    `name === 'debug'`, and nothing ever fills `debugLogModalTxt`.
  */
  'debug-log':
    'ModalHost.svelte:2306 — no handler; its modal at :3844 is unreachable and nothing fills debugLogModalTxt',
  'upload-profile-picture':
    'ModalHost.svelte:2379 — no handler and no upload target (TODO: setUserProfilePic)',

  /*
    Three more found in the same 2026-08-23 diff, none previously recorded.
  */
  'disable-private-chat':
    'ModalHost.svelte:2373 — no wire captured; the per-user private-chat gate was never ported',
  'get-my-token':
    'ModalHost.svelte:3075 — no handler; what token it should show is not evidenced anywhere read so far',
  'test-follow-sound':
    'ModalHost.svelte:2505 — no handler. The ONLY one of the eleven that needs no server: it would play the follow sound locally. Left inert deliberately rather than guessed, because which sound the reference plays here is not evidenced'
};

/** Every action that is knowingly silent. Exported so the disposition contract can read it. */
export const INERT_ACTION_NAMES: readonly string[] = Object.keys(INERT_ACTIONS);
