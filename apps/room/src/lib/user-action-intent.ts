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
    "NO WIRE CAPTURED" WAS FALSE FOR ALL SIX OF THESE, AND IT WAS FALSE THE DAY IT WAS WRITTEN.

    ## What the six actually are, read 2026-08-23

    Every one is a `remotePresCommand` sub-command, and all six call sites sit together in one menu
    at bytes 2063708-2064410 of `apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`:

      remotePresCommand("mutemic")        " Mute Audio "
      remotePresCommand("mutecam")        " Mute Camera "
      remotePresCommand("mutescreens")    " Stop Screens "
      remotePresCommand("restartScreen")  " Restart Screens "     (singular Screen, plural label)
      remotePresCommand("startRec")       " Start Rec "
      remotePresCommand("stopRec")        " Stop Rec "

    Both ends are captured:

      SEND     `remotePresCommand(c){ this.appService.sendServerAdminCommand(
                 "remotePresCommand", {user:this.user, cmd:c}) }`      (byte 2080529)
      RECEIVE  `case"remotePresCommand": e.appEventBus.emit(
                 "remotePresCommand", xe.subCmd); break;`              (byte 996380)

    **Note the key changes across the hop**: the presenter sends `cmd`, the member reads `subCmd`.
    That is the reference's own shape, not a transcription slip — the server is re-wrapping the
    payload, which is also where the authority check must live.

    ## The security reasoning is UNCHANGED, and it is why these stay inert

    The old note was right that a peer-capture command needs server authority and that inventing one
    would reproduce the 2026-08-07 escalation. That still holds. What is no longer true is the stated
    BLOCKER: the wire is not missing, the server-side gate is. These are unblocked for design and
    still blocked on `services/**` enforcing that the caller is a presenter in that room.

    ## Recording is NOT blocked on a MediaMTX host

    `start-recording` and `stop-recording` were filed as "blocked on a MediaMTX host". The room half
    is `remotePresCommand("startRec")` / `("stopRec")` — the same peer command as the other four,
    sent to a MEMBER. Whatever MediaMTX does afterwards, the control this room is missing is this
    one, and it is captured.
  */
  'mute-mic':
    'ModalHost.svelte:2253 — wire IS captured: remotePresCommand("mutemic"). Blocked on a SERVER-side presenter check, not on evidence',
  'mute-camera':
    'ModalHost.svelte:2259 — wire IS captured: remotePresCommand("mutecam"). Same server-authority requirement as mute-mic',
  'stop-screens':
    'ModalHost.svelte:2265 — wire IS captured: remotePresCommand("mutescreens"). NOTE: distinct from RoomScreens.stop(), which is an HONEST PARTIAL for your OWN screen; this button targets somebody else',
  'restart-screens':
    'ModalHost.svelte:2272 — wire IS captured: remotePresCommand("restartScreen"), singular, against a " Restart Screens " label',

  'start-recording':
    'ModalHost.svelte:2279 — wire IS captured: remotePresCommand("startRec"). NOT blocked on a MediaMTX host; blocked on the same server-side presenter check',
  'stop-recording':
    'ModalHost.svelte:2285 — wire IS captured: remotePresCommand("stopRec"). Same as start-recording',

  /*
    `getDebugLog` and `setUserProfilePic` are the two this class was already known by — `TODO.md`
    records both under "DEAD CONTROLS". Their modals exist and are unreachable: nothing ever sets
    `name === 'debug'`, and nothing ever fills `debugLogModalTxt`.
  */
  /*
    BOTH OF THESE ALSO HAVE THEIR WIRE, found in the same 2026-08-23 read.

    `debug-log` is a THREE-hop exchange, not a modal waiting for content:
      presenter  `getDebugLog(){ sendServerAdminCommand("getDebugLog", this.user) }`  (2080323)
      member     `case"getDebugLog": e.send("debugLogResp",{requestor:xe.requestor, log:V1})`
      presenter  `case"debugLogResp": e.appEventBus.emit("debugLogResp", xe.log)`
    `V1` is the member's rolling client log. The receiving UI is `app-debug-log-modal`: modal
    `#debug-log-modal`, `<h3 class="modal-title">Debug Log</h3>`, and ONE readonly
    `<textarea id="debugLogModalTxt" rows="1000">`. So "nothing fills debugLogModalTxt" was true of
    OUR room and reads as though the reference had the same hole; it does not.

    `upload-profile-picture` likewise has both halves: the presenter menu button
    `" Upload Profile Picture "` calls `adminUploadProfilePic($event)`, and the member applies it at
    `case"updateProfilePic"`, which sets BOTH `globals.preferences.profilePic` and
    `globals.user.profilePic` and then emits `preferenceChanged {key:"profilePic", value}`.
  */
  'debug-log':
    'ModalHost.svelte:2306 — wire IS captured: getDebugLog → member replies debugLogResp{requestor,log:V1} → presenter fills a readonly textarea#debugLogModalTxt rows=1000 in #debug-log-modal titled "Debug Log"',
  'upload-profile-picture':
    'ModalHost.svelte:2379 — wire IS captured: adminUploadProfilePic sends, member applies case"updateProfilePic" setting preferences.profilePic AND user.profilePic then emitting preferenceChanged',

  /*
    Three more found in the same 2026-08-23 diff, none previously recorded.
  */
  /*
    THE REFERENCE'S OWN BUTTON IS DEAD TOO, which makes ours a MATCH rather than a gap.

    In the presenter menu at byte 2067000ff every button is built the same way — `d(n,"button",40)`
    followed immediately by `x("click", …)`. `" Disable Private Chat "` is the ONE that is not:

      d(96,"button",49),T(97,"i",50),v(98," Disable Private Chat "),u(),
      d(99,"button",40),x("click",function(o){… adminUploadProfilePic(o) …})

    Button 96 carries an icon and a label and NO click binding, while 99 beside it does. So upstream
    renders this control and wires nothing to it. Leaving ours inert reproduces the reference
    exactly; wiring it would be a divergence, not a fix.
  */
  'disable-private-chat':
    'ModalHost.svelte:2373 — MATCHES THE REFERENCE, which renders this button at bundle byte ~2067000 with an icon, a label and no x("click") binding at all while every neighbouring button has one',
  /*
    `test-follow-sound` IS GONE FROM THIS TABLE — it was wired on 2026-08-23 and now has a real
    branch in `RoomUserActions.handle`, which is what removing an entry here demands. The sound is
    `pling`, from `testFollowChatSound()` at byte 2075886. See that handler for the full reasoning.

    `get-my-token` is now EVIDENCED and stays inert only because nobody has built it yet. The row
    said "what token it should show is not evidenced anywhere read so far"; it is, at byte 2255348,
    and the answer is BOTH identifiers, not one:

      getMyToken(){
        let e=globals.sessionID, i=globals.sesionToken;      // sesionToken: the reference's own typo
        $("#user-settings-modal").modal("hide");
        bootbox.dialog({ title:"Session Information", message:`…`,
                         buttons:{ok:{label:"Close",className:"btn-primary"}} })
      }

    The dialog is two `mb-3` blocks, each `<label class="form-label"><strong>…:</strong></label>`
    over an `input-group` holding a readonly `<input class="form-control">` and a
    `<button class="btn btn-outline-secondary">` with `<i class="fas fa-copy"></i> Copy`:

      Session ID     input id="sessionId"     copies, then alerts 'Session ID copied!'
      Session Token  input id="sessionToken"  copies, then alerts 'Session Token copied!'

    Two things to carry when it IS built. The reference copies with an INLINE `onclick` string
    calling `navigator.clipboard.writeText(...)` and a bare `alert(...)`; this repository forbids
    `window.alert` and would use the project's dialog primitive, which is a divergence to record
    rather than hide. And the button label is `" Get my token "` — lower-case `my` and `token` —
    sitting in the same menu as `" Mute Microphone for all non-admins "`.
  */
  'get-my-token':
    'ModalHost.svelte:3075 — no handler, but FULLY EVIDENCED at byte 2255348: a "Session Information" bootbox showing globals.sessionID in a readonly #sessionId and globals.sesionToken in a readonly #sessionToken, each with a Copy button, and one "Close" button',

  /*
    `kick-ban` BECAME INERT ON 2026-08-23, and it moved in the honest direction.

    It used to share a branch with `kick`, and that branch alerted *"User kicked OK"* while sending
    nothing at all — so both controls lied. `kick` now sends a real, presenter-gated `kickUser`.

    `kick-ban` deliberately did NOT come with it. The reference's payload is
    `{user, msg, ban, kickAllInstances}`, and a ban has to OUTLIVE the frame: something durable must
    record that this person may not come back. This room has no such store. Pointing `kick-ban` at
    the plain kick would drop the ban silently and rebuild the exact defect the kick fix removed —
    a control reporting something it did not do.

    So it is inert and says so here, which is strictly better than what it was: a lie counted as
    `handled`. `TODO.md` row 7 carries what it needs.
  */
  'kick-ban':
    'ModalHost.svelte:2362 — no handler since 2026-08-23, when `kick` was given a real command and this was NOT: a ban needs durable storage this room does not have, and reusing the plain kick would drop it silently'
};

/** Every action that is knowingly silent. Exported so the disposition contract can read it. */
export const INERT_ACTION_NAMES: readonly string[] = Object.keys(INERT_ACTIONS);
