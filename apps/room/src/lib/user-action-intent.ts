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
 * repository has a name for: a control whose only effect is changing its own label.
 *
 * **"Every entry here is a button that reports success and sends nothing" — that sentence stood at
 * the top of this docblock and was FALSE, found 2026-08-23.** `save-permissions` reads its string
 * from this table through `userActionAlert('save-permissions')` and then genuinely sends, via
 * `RoomUserActions.savePermissions` → `permissions.remote.ts`, reached from
 * `RoomOverlays.svelte:563`. It is an ANNOUNCEMENT for a real action that happens to be stored here
 * beside the liars, and counting it as one made `TOAST_ONLY_ACTIONS.length` overstate the defect by
 * one for as long as the entry has existed.
 *
 * So this table is "the fixed alert for an action", and the LIARS are the subset with no branch
 * anywhere — which the disposition contract is what actually establishes, by scanning for a branch
 * rather than by trusting a sentence in a comment.
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
  /*
    `mute-chat-24` was HERE and is gone, 2026-08-23 — the THIRD entry ever removed, after
    `unmute-chat` and `force-reload`, and for the identical reason: its presence WAS the bug. The
    button raised the reference's own "user chat muted" and sent nothing, while a working mute — the
    message context menu's `mute24` — sat in the same source with nothing joining them. The docblock
    above still names it as the example, which is now history rather than a live defect. Both doors
    call `applyChatMute`, in `#lib/server/chat-mute.ts`.
  */
  /*
    `mute-chat-indefinitely` STAYS, and is the one entry here that is honestly blocked rather than
    merely unbuilt. The reference reaches it with `muteChat("0")` against a " Mute Chat indefinately "
    label (its own spelling) at bundle byte 2067543, and `"0" >= 0` is true, so it sends
    `{user, time:0}` down the same command as the 24-hour one.

    An indefinite mute ALREADY EXISTS in this system and is already enforced: the controller's opcode
    3 sets `role = 3, muted = true`, and `refuseIfChatMuted` reads `member.muted` on every send. What
    is missing is a DOOR from the room to it — the equivalent of `internal/room-ban` for a ban. That
    is a controller endpoint with its own authority checks, not a line here, so it is recorded rather
    than faked with a 24-hour mute wearing an "indefinite" label.
  */
  'mute-chat-indefinitely': 'user chat muted',
  /*
    `restart-audio` KEEPS ITS ENTRY AND IS NO LONGER A LIAR — 2026-08-23.

    Unlike `unmute-chat`, `force-reload` and `mute-chat-24`, which were REMOVED when they were wired,
    this one stays: the capture's sender genuinely raises `bootbox.alert("Audio restart request sent
    OK")` right after `sendServerAdminCommand("remoteRestartAudio", this.user)` at byte 2080461. The
    string is real and belongs to a real action, so it lives here for the same reason
    `save-permissions` does — this table is "the fixed alert for an action", not a defect list.

    Which entries are DEAD is established by `user-action-disposition-contract.test.ts`, which scans
    for a branch. `restart-audio` now has one, in `RoomUserActions.handle`.
  */
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
  /*
    `mute-mic`, `mute-camera` and `stop-screens` WERE HERE AND ARE GONE, 2026-08-23, and the reason
    they were here was FALSE THE DAY IT WAS WRITTEN — for the second time on this same block.

    The entry said "Blocked on a SERVER-side presenter check, not on evidence". That check existed
    the whole time, and so did everything else. All three ends were already built and already in use:

      SEND      `presenterCommand` — `presenter-commands.remote.ts:60`, `z.enum(['mutemic',
                'mutecam','mutescreens'])`, gated by `presenterRoom()`, ADDRESSED via
                `publishToUsers` so no other member sees that a named person was silenced
      RECEIVE   `events.svelte.ts:573-582` — the member's OWN browser does the work:
                `toggleMicrophone()`, `toggleWebcam()`, `stopScreenSharing()`
      IN USE    `muteAllNonAdmins()` in this same class has been calling that exact command, with
                that exact subCmd, since it was built

    So a working command with a working receiver, already exercised by a neighbouring control, sat
    behind three buttons that dispatched action strings nothing had a branch for. What was missing
    was the branch — and this table was the reason nobody looked for it.

    THE LESSON, recorded because it has now cost three separate turns: an entry here is a claim
    about the REPOSITORY, and it must be re-verified against the repository rather than inherited.
    Every one of these blockers that has been checked so far turned out to be a search that stopped
    at one directory.

    `restart-screens` LEFT TOO, on 2026-08-26, and its stated blocker was wrong in the same way —
    the fourth entry in a row on this block to be corrected by looking rather than inheriting.

    It read "`RoomMediaTransport` has stopLocalScreen but no re-share". True, and irrelevant: a
    re-share is not what the capture does. `restartScreenSharing` (byte 1106692) produces the SAME
    live track onto a new producer under `stopTracks:!1`, and `session.ts:562` has passed
    `stopTracks: false` on every produce in this room since it was written. So the one piece the
    entry named as missing was the one piece that would have been WRONG to build: a re-share means
    `getDisplayMedia`, which needs a user gesture and cannot be reached from a socket at all.

    Built as `RoomMediaTransport.restartLocalScreens`.
  */

  /*
    THE RECORDING PAIR IS AN HONEST GAP, and the reason changed on 2026-08-26 after reading both
    ends. It is no longer "absent from presenterCommand's enum" — that was true and was not the
    blocker.

    `startRec` and `stopRec` resolve to `startRecForMuser(e){ this.mediaSoupService.startRec(e) }`
    (byte 1136815), the reference's SERVER-side recorder. **This room has no server-side recorder.**
    `RoomRecording`'s own docblock records that as a deliberate divergence: it records in the browser
    with `MediaRecorder` because *"server-side recording needs the recording/transcoding workers that
    the deployment plan defers"*, and notes the whole 2.9 MB bundle contains exactly ONE
    `new MediaRecorder`, which is the microphone test in the AV modal.

    Pointing this command at THAT recorder would not port the captured behaviour, it would invent a
    worse one: `RoomRecording.startRecording()` calls `downloadRecording()` from its own `stop`
    handler, so a presenter's click would write a video file to a member's hard drive with no prompt.
    And on a member not sharing a screen it returns immediately, so the same button would be silently
    inert for most of the room. Neither is what the reference does.

    So these two stay INERT on purpose, and the entry now says what actually blocks them. They are
    unblocked by the same thing that unblocks server-side recording generally, and by nothing else.

    `recording-state.remote.ts:61` remains a different act despite sharing the verb: it is
    `publishToRoom`, announcing the PRESENTER'S OWN recording to everybody. Collapsing the two would
    make a presenter's button start their own recording while claiming to start somebody else's.
  */
  'start-recording':
    'ModalHost.svelte:2279 — wire IS captured: remotePresCommand("startRec") → the MEMBER runs startRecForMuser(null) → mediaSoupService.startRec, the SERVER-side recorder. Blocked on this room having no server-side recorder — a deferred deployment decision recorded on RoomRecording. Mapping it onto the local MediaRecorder would write a file to the member\'s own disk unprompted, which the reference never does',
  'stop-recording':
    'ModalHost.svelte:2285 — wire IS captured: remotePresCommand("stopRec") → stopRecForMuser(null) → mediaSoupService.stopRec. Same blocker as start-recording: no server-side recorder exists to stop',

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
    'ModalHost.svelte:3075 — no handler, but FULLY EVIDENCED at byte 2255348: a "Session Information" bootbox showing globals.sessionID in a readonly #sessionId and globals.sesionToken in a readonly #sessionToken, each with a Copy button, and one "Close" button'
};

/**
 * The modal buttons that are one `remotePresCommand` sub-command each.
 *
 * A TABLE rather than a nested ternary, and exported so the mapping is testable without driving the
 * class: these strings crossing to the wrong subCmd would cut the wrong stream on somebody else's
 * machine, and nothing on screen would say so.
 *
 * The sub-command names are the capture's own — `remotePresCommand("mutemic")` and its neighbours at
 * bundle bytes 2063708-2064410 — and they are deliberately NOT the action strings: the reference's
 * labels are " Mute Audio ", " Mute Camera ", " Stop Screens " and " Restart Screens " while the
 * wire says `mutemic`, `mutecam`, `mutescreens`, `restartScreen`. Three names for one thing is
 * upstream's, not ours — and `restartScreen` is SINGULAR against a plural label, which is upstream's
 * too and is reproduced rather than tidied.
 *
 * **Named `PEER_SUBCMDS` since 2026-08-26, and it was `PEER_MUTE_SUBCMDS`.** `restartScreen` is not
 * a mute; leaving the old name would have made the table's own identifier the least accurate
 * description of it in the file.
 */
export const PEER_SUBCMDS: Readonly<
  Record<string, 'mutemic' | 'mutecam' | 'mutescreens' | 'restartScreen'>
> = {
  'mute-mic': 'mutemic',
  'mute-camera': 'mutecam',
  'stop-screens': 'mutescreens',
  'restart-screens': 'restartScreen'
};

/** Every action that is knowingly silent. Exported so the disposition contract can read it. */
export const INERT_ACTION_NAMES: readonly string[] = Object.keys(INERT_ACTIONS);
