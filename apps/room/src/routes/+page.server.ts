import { fail, redirect } from '@sveltejs/kit';
import { and, asc, desc, eq, gt, isNull } from 'drizzle-orm';
import { isEmptyChatHtml, sanitizeChatHtml } from '$lib/server/chat-html';
import { pruneDeadPreferenceKeys } from '$lib/dead-preference-keys';
import { calculatePollTotals, parsePollChoices } from '$lib/poll-behavior';
import {
  deleteSessionNoteTabSchema,
  newSessionNoteTabSchema,
  renameSessionNoteTabSchema,
  restoreNoteVersionSchema,
  saveSessionNoteSchema,
  setWelcomeMatNoteTabSchema
} from '$lib/notes-command';
import { db, ensureDatabase } from '$lib/server/db';
import {
  isPresenterRole,
  logout,
  requireRoomShortCode,
  requireSessionId,
  requireUser
} from '$lib/server/auth';
import { signedOutDestination } from '$lib/server/control-plane';
import {
  CAPTURE_REFERENCE_ROOM,
  capturedRoomItem,
  capturedRoomItems,
  noCapturedRoomItems
} from '$lib/server/captured-room';
import { hashEmail, publicSessionHandle } from '$lib/server/connection';
import {
  MAX_CHAT_LOG_PAGE,
  isChatChannel,
  loadChatPage,
  loadNewestChatPages
} from '$lib/server/chat-log';
import { loadAlertPage } from '$lib/server/alert-log';
import { isChatMode } from '$lib/chat-mode';
import { parseReactions } from '$lib/server/reactions';
import {
  readRoomConfig,
  requestMobilePin,
  requestStreamReadToken,
  writeRoomSetting
} from '$lib/server/room-config-client';
import { alertSoundCommandValue } from '$lib/files-gates';
import { memberDeniedArchives } from '$lib/roster-gates';
import { isBannedFromRoom, isShutOutByRoomState, roomRoleFor } from '$lib/server/room-role';
import { consumeRateLimit } from '$lib/server/rate-limit';
import { mediaSignallingUrl } from '$lib/server/media-grant';
import { publishToRoom } from '$lib/server/room-events';
import { grantMediaElevation, revokeMediaElevation } from '$lib/server/media-elevation';
import { deleteStoredFile, storeUpload } from '$lib/server/file-storage';
import {
  deleteThread,
  insertPrivateMessage,
  loadConversations,
  loadThread,
  searchThread
} from '$lib/server/private-chat';

/**
 * The single room this build serves.
 *
 * The capture keys every channel by `sessionID` because it hosts many rooms. So does this now.
 *
 * This was the constant `'ptr-room'`, justified by "this one has exactly one [room]". That stopped
 * being true the moment the controller became the front door: it creates as many rooms as an owner
 * wants and the handoff says which one you entered. One shared channel meant every room's alerts,
 * chat, roster and presenter commands reaching every other room's members — the constant was a
 * correct simplification for a single-room build and a cross-room leak in a multi-room one.
 *
 * The key is the controller's four-digit short code, taken from the session rather than a
 * parameter, so a client cannot subscribe itself to somebody else's room by editing a URL.
 */
import {
  createNote,
  deleteNote,
  getNotes,
  renameNote,
  restoreNoteVersion,
  saveNote,
  setWelcomeMatNote
} from '$lib/server/notes-repository';
import {
  alertQuestions,
  alerts,
  capturedItemOverrides,
  chatMutes,
  roomState,
  hiddenRoomItems,
  messages,
  pollAnswers,
  polls,
  savedPolls,
  sharedFiles,
  users,
  userSettings
} from '$lib/server/db/schema';
import { isChatTab } from '$lib/types';
import type { ActivePoll } from '$lib/types';

/*
  Body caps. The adapter's request-size limit already stops a multi-megabyte upload, but a
  half-megabyte "chat message" is still absurd: it is stored forever and re-sent to every
  reader on every five-second poll.
*/
const MAX_MESSAGE_BODY = 4_000;
const MAX_ALERT_BODY = 8_000;
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ depends, locals, request, cookies }) => {
  ensureDatabase();

  // Lets the page re-fetch room data on its own without a full navigation. Nothing here is pushed
  // from the server - there is no socket - so a reader's question only reaches the presenter when
  // this load runs again.
  depends('room:data');

  /*
    This room's configuration, from the controller that owns it.

    Deliberately not wrapped in a try/catch. If the controller cannot be reached the load throws
    and the reader sees an error, which is the honest outcome: the alternative is serving my
    defaults under the impression they are the owner's settings, silently, at the exact moment the
    two halves of the product have stopped agreeing.

    `request` keys the per-request cache. The member's email is passed so the response carries
    their per-room standing - role, `isFT`, `hasAdminChat` - which is per room and cannot live on
    the account row here.
  */
  const roomConfig = await readRoomConfig(
    request,
    requireRoomShortCode(locals),
    requireUser(locals).email
  );

  const settings = db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, requireUser(locals).id))
    .get();

  // `passwordHash` is destructured off and dropped. Spreading the whole row put the scrypt
  // digest of the connected account into the page payload - so it was serialised into the SSR
  // HTML and into `__sveltekit` data on every single load, reaching the browser, any cache in
  // front of it, and any HAR a user attaches to a support ticket. Nothing in the client reads
  // it; it was there only because `...user` is shorter than naming the fields.
  //
  // Named rather than filtered so that a column added to `users` later is a compile-time
  // decision about whether the browser may see it, instead of a silent yes.
  const account = requireUser(locals);

  /*
    Reconcile the stored role with the controller, on every load.

    `/session` writes it once, at entry. Seventeen server actions then authorise against it — and a
    session can be open for hours. Without this, an owner demoting somebody in the controller
    changes nothing until that person happens to re-enter the room: they keep Archives, Get Random
    User, posting alerts, running polls and every presenter command in the meantime.

    A write only when it differs, so an unchanged role costs nothing. The same reconciliation
    handles a ban that lands mid-session, and a room CLOSING under somebody: `hooks.server.ts`
    cannot see the membership or the room's state, but the next load can, and it ends the session
    rather than leaving a member inside a room they were removed from or one that has shut.
  */
  const currentRole = roomRoleFor(roomConfig.member);
  if (account.role !== currentRole) {
    db.update(users).set({ role: currentRole }).where(eq(users.id, account.id)).run();
    account.role = currentRole;
  }

  if (
    isBannedFromRoom(roomConfig.member) ||
    isShutOutByRoomState(roomConfig.room.state, roomConfig.member)
  ) {
    logout(cookies);
    locals.user = null;
    locals.sessionId = undefined;
    redirect(303, signedOutDestination());
  }

  const connectedUser = {
    id: account.id,
    displayName: account.displayName,
    email: account.email,
    avatarUrl: account.avatarUrl,
    role: account.role,
    status: account.status,
    createdAt: account.createdAt,
    emailHash: hashEmail(account.email),
    /* `r.userXrefID` - the identity the capture keys presence and the per-row roster gate on. */
    userXrefID: String(account.id),
    /*
      The flags the sidebar's gates read, from the CONTROLLER's membership row rather than from
      this room's `users` table.

      They were four columns here — `is_free_trial`, `has_admin_chat`, `deny_archives_access`,
      `is_limited_presenter` — and all four were the wrong scope. The controller keeps them on
      `room_users`, per room: somebody can be a trial in one room and not another, and an
      admin-chat permission is granted for a room, not for an account. A column on `users` cannot
      express that, so it was quietly answering the same way everywhere.

      `isLimitedPresenter` is not stored at all, anywhere. `giveMicScreen` assigns it at runtime —
      `globals.user.isPresenter = globals.isLimitedPresenter = globals.isPresenter = e.give` — so
      it is what a member BECOMES when a presenter hands them mic and screen. Making it a column
      was inventing durable state for something the capture treats as transient.

        isP                  `r.isP`; role 0 owner or role 1 without the admin discriminator
        isFT                 `r.isFT`; "Only select from Trials?" and the PM gate
        hasAdminChat         one of the five `permissions_json` keys, per room
        denyArchivesAccess   the individual archives block, per room
        isLimitedPresenter   runtime only; false on arrival, set by `giveMicScreen`
    */
    /*
      One source, not a fallback pair. `account.role` is reconciled from this same membership a few
      lines above, so `isPresenterRole(account.role)` would be the same answer computed twice — and
      two ways of computing it is precisely how `isP` and `isPresenter` came to disagree.
    */
    isP: roomConfig.member?.isP === true,
    isFT: roomConfig.member?.isFT ?? false,
    hasAdminChat: roomConfig.member?.permissions.hasAdminChat ?? false,
    /*
      Fail CLOSED when a membership exists but does not say.

      This was `member?.denyArchivesAccess ?? false`, and the `??` covered two different
      situations with one answer: "there is no membership" and "there is a membership whose flag is
      missing". The first is a guest and is fine; the second is a malformed response, and answering
      it with "not denied" hands out the archives.

      What makes the guest case safe is local, not remote: a guest's archives access is decided by
      the ROOM's `showArchivesToUsers`, which `archivesAvailableTo()` checks first. This flag only
      ever means "this specific member is individually blocked", and a non-member cannot be.

      `readRoomConfig` throws rather than returning a partial config, so `member === null` is
      unambiguously "not a member" and never "we could not tell".
    */
    denyArchivesAccess: memberDeniedArchives(roomConfig.member),
    /*
      The other four of the five `permissions_json` keys. All five already crossed the seam; only
      `hasAdminChat` was read, and the rest were fetched and dropped.

      `hasMic`/`hasCam`/`hasScreen` are load-bearing: the reference feeds them straight into its
      media admission (`joinsMediaAsProducer`), so a Participant granted a mic produces audio
      without being promoted to Presenter. Dropping them made the owner's permissions modal
      decorative on the media path.

      Least privilege on the fallback: a guest has no membership row, so every one of these is
      false rather than inherited from the handoff.
    */
    hasMic: roomConfig.member?.permissions.hasMic ?? false,
    hasCam: roomConfig.member?.permissions.hasCam ?? false,
    hasScreen: roomConfig.member?.permissions.hasScreen ?? false,
    canEditNotes: roomConfig.member?.permissions.canEditNotes ?? false,
    restrictPmUser: roomConfig.member?.restrictPmUser ?? false,
    muted: roomConfig.member?.muted ?? false,
    /*
      A guest has no membership row, so `member` is null and every flag above falls back.

      The fallbacks are the least-privilege answer in each case except `isP`, which follows the
      handoff type the room already recorded as `role`: a `site` token means an account that owns
      or belongs to the room, and refusing it presenter authority here would contradict the token
      the controller signed.
    */
    /*
      The roster shape must agree between the page load and the SSE hub, because the sidebar renders
      whichever it has. Empty here by definition: the location comes from the BROWSER's lookup after
      subscribe, and the server never resolves it from the connection.
    */
    locStr: '',
    isMember: roomConfig.member !== null,
    /** The per-room role, so the room never has to infer one. 0/1/2/3/4; null for a guest. */
    roomRole: roomConfig.member?.role ?? null,
    isNonPresenterAdmin: roomConfig.member?.isNonPresenterAdmin ?? false
  };
  /*
    The capture renders in the room it was taken from, and nowhere else.

    These are the samples the reconstruction is matched against, not content. Served unconditionally
    they turned every room — including one created seconds earlier — into a copy of the reference
    room's alerts and chat.
  */
  const capturedRoom =
    requireRoomShortCode(locals) === CAPTURE_REFERENCE_ROOM
      ? capturedRoomItems(connectedUser)
      : noCapturedRoomItems();

  // Captured items are re-emitted from the fixture on every load, so a delete has to be remembered
  // somewhere or it comes straight back - which is exactly how a deleted alert used to survive on
  // every screen except the one that deleted it.
  const hiddenEvidenceKeys = new Set(
    db
      .select({ evidenceKey: hiddenRoomItems.evidenceKey })
      .from(hiddenRoomItems)
      // This room's deletions only — the fixture serves the same item into every room.
      .where(eq(hiddenRoomItems.roomShortCode, requireRoomShortCode(locals)))
      .all()
      .map((row) => row.evidenceKey)
  );
  const isVisible = (item: { evidenceKey: string }) => !hiddenEvidenceKeys.has(item.evidenceKey);

  // The same problem for edits rather than deletions: marking a captured message answered, editing
  // its body or reacting to it used to change nothing but the acting browser's own memory. Applied
  // as an overlay so the fixture stays exactly as captured.
  const overrides = new Map(
    db
      .select()
      .from(capturedItemOverrides)
      // This room's edits only, for the same reason as the deletions above.
      .where(eq(capturedItemOverrides.roomShortCode, requireRoomShortCode(locals)))
      .all()
      .map((row) => [row.evidenceKey, row])
  );
  function withOverrides<T extends { evidenceKey: string; body: string; answered?: boolean }>(
    item: T
  ): T {
    const override = overrides.get(item.evidenceKey);
    if (!override) return item;
    return {
      ...item,
      // `null` means untouched, so `??` is load-bearing: `'{}'` and `false` are real values a
      // reader can set - by removing their last reaction, say - and must beat the fixture.
      body: override.body ?? item.body,
      answered: override.answered ?? item.answered,
      ...(override.reactionsJson === null
        ? {}
        : {
            reactionsJson: override.reactionsJson,
            reactions: parseReactions(override.reactionsJson)
          })
    };
  }

  /*
    THE NEWEST PAGE PER CHANNEL, not the whole log.

    This selected every row in `messages` for the room until 2026-08-14 — no LIMIT, `.all()` — and
    every SSE event calls `invalidateAll()`, so a room with 50,000 messages re-read and
    re-serialised all of them each time anybody said anything. Older pages are fetched on demand by
    `loadOlderChatMessages` and held in client state, so nothing became unreachable; see
    `$lib/server/chat-log.ts` for why a bare LIMIT would have been worse than the bug.
  */
  const messageRows = loadNewestChatPages(requireRoomShortCode(locals));

  /*
    THE NEWEST PAGE, not every alert the room has ever posted.

    The same defect the chat log had and the same cure — see `$lib/server/alert-log.ts`. Older
    pages come from `loadOlderAlerts` and are held in client state, so an `invalidateAll()` cannot
    throw away what a reader scrolled back to.
  */
  const alertRows = loadAlertPage(requireRoomShortCode(locals));

  const questionRows = db
    .select({
      id: alertQuestions.id,
      alertId: alertQuestions.alertId,
      senderId: alertQuestions.senderId,
      body: alertQuestions.body,
      answeredAt: alertQuestions.answeredAt,
      createdAt: alertQuestions.createdAt,
      senderName: users.displayName,
      senderEmail: users.email,
      senderAvatarUrl: users.avatarUrl,
      // Drives `msg-box-adm` / the reversed layout on each Q&A entry. The captured reader-side
      // modal renders another reader's question as plain `msg-box pb-1` and the presenter's answer
      // as `msg-box pb-1 msg-box-adm`, so this follows the sender, not the viewer.
      senderRole: users.role
    })
    .from(alertQuestions)
    /*
      SCOPED TO THIS ROOM — added 2026-08-14, and it was a cross-tenant leak until then.

      `alert_questions` is the one room-owned table with NO `room_short_code` column: it reaches its
      room through `alert_id`, which the delete path already documents ("`alertQuestions` reaches
      its room through `alertId`"). This read had no filter of any kind, so every browser in every
      room received every alert question in the deployment — question bodies, and the name, avatar
      and role of whoever asked — serialised into the SSR HTML and into the `__sveltekit` payload.
      What the client chose to RENDER was never the point; the data had already crossed.

      Joining through `alerts` applies the room the same way every other read here does. The
      alternative — adding `room_short_code` to the table — would denormalise a fact this schema
      already derives, and would need a backfill that this join makes unnecessary.
    */
    .innerJoin(alerts, eq(alerts.id, alertQuestions.alertId))
    .innerJoin(users, eq(alertQuestions.senderId, users.id))
    .where(eq(alerts.roomShortCode, requireRoomShortCode(locals)))
    .orderBy(asc(alertQuestions.createdAt), asc(alertQuestions.id))
    .all()
    .map(({ senderEmail, ...question }) => ({
      ...question,
      senderEmailHash: hashEmail(senderEmail)
    }));

  // The Q&A button has three states and `alert_questions.answered_at` is the only source of truth
  // for which one an alert is in. Deriving them here means the button cannot disagree with the
  // questions actually stored: `question_count`/`question_answered` on the alert row are a cache
  // that only the askQuestion action maintains, and captured alerts have no rows at all.
  const questionStateByAlert = new Map<number, { total: number; pending: number }>();
  for (const question of questionRows) {
    const state = questionStateByAlert.get(question.alertId) ?? { total: 0, pending: 0 };
    state.total += 1;
    if (!question.answeredAt) state.pending += 1;
    questionStateByAlert.set(question.alertId, state);
  }

  function withQuestionState<
    T extends {
      id: number;
      questionCount: number | null;
      questionAnswered: boolean | null;
    }
  >(alert: T) {
    const live = questionStateByAlert.get(alert.id) ?? { total: 0, pending: 0 };
    // Captured alerts (negative ids) carry a fixture count for questions that were asked in the
    // recorded system and have no row here; real alerts already recount from those rows, so
    // adding their cached counter as well would double-count.
    const capturedBaseline = alert.id < 0 ? (alert.questionCount ?? 0) : 0;
    const capturedPending = capturedBaseline > 0 && !alert.questionAnswered;
    const total = capturedBaseline + live.total;

    return {
      ...alert,
      questionCount: total,
      // `unreadQa` is deliberately absent here. It is a transient per-viewer marker in the source -
      // set when a Q&A update arrives, deleted when that viewer opens or closes the modal - not a
      // property of the alert, and not derived from whether the questions are answered. The page
      // owns it; see unreadQaAlertIds in +page.svelte.
      questionAnswered: total > 0 && live.pending === 0 && !capturedPending
    };
  }

  const activePollRow = db
    .select({
      id: polls.id,
      senderId: polls.senderId,
      senderName: users.displayName,
      question: polls.question,
      choicesJson: polls.choicesJson,
      createdAt: polls.createdAt
    })
    .from(polls)
    .innerJoin(users, eq(polls.senderId, users.id))
    // One poll is active per ROOM, so the room is part of what makes this row unique.
    .where(and(eq(polls.roomShortCode, requireRoomShortCode(locals)), eq(polls.status, 'active')))
    .orderBy(desc(polls.createdAt))
    .get();

  let activePoll: ActivePoll | null = null;
  if (activePollRow) {
    const choices = parsePollChoices(activePollRow.choicesJson) ?? [];
    const answerRows = db
      .select({
        senderId: pollAnswers.senderId,
        senderNick: users.displayName,
        senderXref: users.email,
        choiceIndex: pollAnswers.choiceIndex
      })
      .from(pollAnswers)
      .innerJoin(users, eq(pollAnswers.senderId, users.id))
      .where(eq(pollAnswers.pollId, activePollRow.id))
      .orderBy(asc(pollAnswers.createdAt), asc(pollAnswers.id))
      .all();
    const isPollSender = activePollRow.senderId === requireUser(locals).id;
    const userAnswer = answerRows.find((answer) => answer.senderId === requireUser(locals).id);
    const senderAnswers = isPollSender
      ? answerRows.map(({ senderId: _senderId, ...answer }) => answer)
      : [];
    const totals = isPollSender ? calculatePollTotals(choices.length, senderAnswers) : [];

    activePoll = {
      id: activePollRow.id,
      senderId: activePollRow.senderId,
      senderName: activePollRow.senderName,
      q: activePollRow.question,
      choices,
      createdAt: activePollRow.createdAt,
      total: isPollSender ? answerRows.length : 0,
      totals,
      answers: senderAnswers,
      userAnswerChoice: userAnswer?.choiceIndex ?? null
    };
  }

  /*
    Pre-canned polls are PRESENTER-ONLY, and this gate is the fix for `TODO.md` entry 7.

    This query ran for every role and its result was returned to every role. A member never opens
    the poll panel, so they never SAW the list — but their browser was handed every unsent draft a
    presenter had written, in the SSR HTML and in `__sveltekit` data, on every page load. Invisible
    is not private: it reaches the browser, any cache in front of it, and any HAR attached to a
    support ticket. Same class as the `password_hash` that was spread into the page payload on
    2026-08-04.

    Gated on `connectedUser.isP` — the membership's own answer, the same predicate the poll panel
    renders from — rather than on `role`, so a Participant granted presenter rights in the
    controller and a Presenter who had them withheld both get the right answer.

    It also pre-empts entry 5. `GET /api/v1/rooms/{id}/saved-polls` refuses non-staff with 403, so
    when the room moves onto the API a member page load would have started failing. Returning an
    empty list here is what that route will agree with.
  */
  const storedPolls = !connectedUser.isP
    ? []
    : db
        .select({
          id: savedPolls.id,
          q: savedPolls.question,
          choicesJson: savedPolls.choicesJson
        })
        .from(savedPolls)
        .where(eq(savedPolls.roomShortCode, requireRoomShortCode(locals)))
        .orderBy(asc(savedPolls.createdAt), asc(savedPolls.id))
        .all()
        .map(({ choicesJson, ...poll }) => ({
          ...poll,
          choices: parsePollChoices(choicesJson) ?? []
        }));

  return {
    // A one-way handle, never the credential itself. See publicSessionHandle.
    sessionHandle: publicSessionHandle(requireSessionId(locals)),
    user: connectedUser,
    // Part 1 proves one roster entry: the identity attached to this connection.
    // Multi-user presence is intentionally deferred until supplied evidence
    // defines its transport and membership semantics.
    connectedUsers: [connectedUser],
    settings,
    messages: [...capturedRoom.messages.filter(isVisible).map(withOverrides), ...messageRows],
    alerts: [...capturedRoom.alerts.filter(isVisible).map(withOverrides), ...alertRows].map(
      withQuestionState
    ),
    /*
      The room's chat mode, and whether THIS viewer is muted — the two reasons the reference shows
      its `Chat Disabled` block, both read on the server.

      `chatMode` is room state, so it comes from the row rather than from anything the client says.
      Absent means `g`: a room whose presenter has never touched the control has group chat, which
      is the reference's default too.

      The mute was already ENFORCED here — `sendMessage` refuses while a row is live — and was
      never exposed, so a muted member typed, pressed send, and watched nothing happen. Upstream
      carries it on the session token as `chatMuted` / `chatMutedTill` precisely so the composer can
      say so. Only the viewer's OWN mute crosses; who else is muted is none of their business.
    */
    chatMode:
      db
        .select({ chatMode: roomState.chatMode })
        .from(roomState)
        .where(eq(roomState.roomShortCode, requireRoomShortCode(locals)))
        .get()?.chatMode ?? 'g',
    chatMutedTill:
      db
        .select({ expiresAt: chatMutes.expiresAt })
        .from(chatMutes)
        .where(
          and(
            eq(chatMutes.roomShortCode, requireRoomShortCode(locals)),
            eq(chatMutes.targetUserId, requireUser(locals).id),
            gt(chatMutes.expiresAt, new Date())
          )
        )
        .orderBy(desc(chatMutes.expiresAt))
        .get()?.expiresAt ?? null,
    alertQuestions: questionRows,
    files: db
      .select()
      .from(sharedFiles)
      .where(eq(sharedFiles.roomShortCode, requireRoomShortCode(locals)))
      .orderBy(asc(sharedFiles.createdAt))
      .all(),
    // `getAllPCLogs` - the tab strip. Sent with the page rather than fetched on open, because the
    // capture asks for it the first time the panel becomes visible and then caches it
    // (`getAllPCLogsLoaded`), which is one round trip we can simply not make.
    privateChats: loadConversations(requireRoomShortCode(locals), account.id),
    notes: getNotes(requireRoomShortCode(locals)),
    notesEnabled: true,
    /*
      The PERMISSION, not the role.

      This read `role === 'staff' || role === 'admin'`, which got it wrong in both directions: a
      Participant explicitly granted `canEditNotes` in the controller could not edit, and a
      Presenter who had it withheld could. `canEditNotes` is one of the five keys the owner ticks
      on `#permissionsModal`; deciding it from the role means the tick does nothing.

      `connectedUser.canEditNotes` is the membership's value, resolved above, and a guest with no
      membership row gets false.
    */
    canEditNotes: connectedUser.canEditNotes,
    activePoll,
    savedPolls: storedPolls,
    /**
     * The SFU's WebSocket URL. Read server-side because MEDIA_WS_URL has no PUBLIC_ prefix, and
     * handed to the page because the browser is what opens the socket. It is only a URL - the
     * grant that authorises the connection is minted separately, per attempt, at
     * POST /api/media/grant, and the signing key never leaves the server.
     */
    mediaWsUrl: mediaSignallingUrl(),
    /**
     * `globals.sessData` - ROOM configuration, from the controller that owns it.
     *
     * This was a hardcoded object literal: one global constant standing in for the settings of a
     * room, in a product where rooms are created freely and each one's options are set on its own
     * Manage page. Every gate that read it was reading a value I chose.
     *
     * `new-room-control` holds the real ones - 268 per room, in `room_settings.settings_json` -
     * and returns the fourteen this room has a consumer for. Anything unset is absent, and absent
     * means off, which is exactly what a newly created room is: `createRoom` writes no settings
     * row at all.
     */
    sessData: roomConfig.settings,
    /**
     * `globals.mtxToken` and `globals.streamServerMTX` — the viewer's HLS playback credential.
     *
     * Fetched with the page rather than on demand, because that is where the reference puts it:
     * `userLoggedIn` copies both out of the login response for EVERY session (bundle byte 994430),
     * and `app-streaming-view` spends the token as soon as a stream tab renders.
     *
     * `null` when the room has no MediaMTX behind it, when the controller refuses (a banned member),
     * or when it cannot be reached. The pane reads all three as "no playback" and says so, rather
     * than building a playlist URL that cannot work.
     *
     * NOT a credential that grants anything beyond watching: the token is scoped `read`, is
     * room-scoped, cannot publish, and `decideIngestAuth` refuses the crossover as `wrong-scope`.
     */
    streamRead: await requestStreamReadToken(
      requireRoomShortCode(locals),
      requireUser(locals).email
    ),
    /**
     * The account's badges and who wears which — `sessData.badgesH` and the ids behind `msg.b`
     * upstream. Passed straight through: the controller has already reduced it to definitions plus
     * a hash-keyed assignment map holding only members who have one, so there is nothing to filter
     * here and nothing identifying in it.
     */
    badges: roomConfig.badges ?? { definitions: {}, byEmailHash: {} },
    /** Settings the owner is enforcing. A locked control must not render as a flippable toggle. */
    lockedSettings: roomConfig.locked,
    /** This room, as the controller describes it. */
    room: roomConfig.room
  };
};

export const actions: Actions = {
  logout: async ({ cookies, locals }) => {
    logout(cookies);
    // handle() ran before this action and will not run again before the redirect's load, so the
    // stale user has to be cleared here as well.
    locals.user = null;
    locals.sessionId = undefined;
    // Back to the controller, which is where signing in happens now.
    redirect(303, signedOutDestination());
  },

  newSessionNoteTab: async ({ request, locals }) => {
    ensureDatabase();
    if (requireUser(locals).role !== 'staff' && requireUser(locals).role !== 'admin') {
      return fail(403, { message: 'You cannot create session notes.' });
    }

    const formData = await request.formData();
    const command = newSessionNoteTabSchema.safeParse({
      cmd: 'newSessionNoteTab',
      data: { name: String(formData.get('name') ?? '') }
    });
    if (!command.success) return fail(400, { message: 'A valid note name is required.' });

    return {
      success: true,
      note: createNote({
        room: requireRoomShortCode(locals),
        name: command.data.data.name,
        now: new Date(),
        userId: requireUser(locals).id
      })
    };
  },

  saveSessionNote: async ({ request, locals }) => {
    ensureDatabase();
    if (requireUser(locals).role !== 'staff' && requireUser(locals).role !== 'admin') {
      return fail(403, { message: 'You cannot edit session notes.' });
    }

    const formData = await request.formData();
    const command = saveSessionNoteSchema.safeParse({
      cmd: 'saveSessionNote',
      data: {
        noteId: Number(formData.get('noteId')),
        contentHtml: String(formData.get('contentHtml') ?? '')
      }
    });
    if (!command.success) return fail(400, { message: 'Invalid session note content.' });

    const note = saveNote({
      room: requireRoomShortCode(locals),
      contentHtml: command.data.data.contentHtml,
      noteId: command.data.data.noteId,
      now: new Date(),
      userId: requireUser(locals).id
    });
    return note === null
      ? fail(404, { message: 'Session note was not found.' })
      : { success: true, note };
  },

  restoreNoteVersion: async ({ request, locals }) => {
    ensureDatabase();
    if (requireUser(locals).role !== 'staff' && requireUser(locals).role !== 'admin') {
      return fail(403, { message: 'You cannot restore session notes.' });
    }

    const formData = await request.formData();
    const command = restoreNoteVersionSchema.safeParse({
      cmd: 'restoreNoteVersion',
      data: {
        noteId: Number(formData.get('noteId')),
        versionId: Number(formData.get('versionId'))
      }
    });
    if (!command.success) return fail(400, { message: 'Invalid session note version.' });

    const note = restoreNoteVersion({
      room: requireRoomShortCode(locals),
      noteId: command.data.data.noteId,
      now: new Date(),
      userId: requireUser(locals).id,
      versionId: command.data.data.versionId
    });
    return note === null
      ? fail(404, { message: 'Session note version was not found.' })
      : { success: true, note };
  },

  renameSessionNoteTab: async ({ request, locals }) => {
    ensureDatabase();
    if (requireUser(locals).role !== 'staff' && requireUser(locals).role !== 'admin') {
      return fail(403, { message: 'You cannot rename session notes.' });
    }

    const formData = await request.formData();
    const command = renameSessionNoteTabSchema.safeParse({
      cmd: 'renameSessionNoteTab',
      data: {
        noteId: Number(formData.get('noteId')),
        newName: String(formData.get('newName') ?? '')
      }
    });
    if (!command.success) return fail(400, { message: 'A valid note name is required.' });

    const note = renameNote({
      room: requireRoomShortCode(locals),
      name: command.data.data.newName,
      noteId: command.data.data.noteId,
      now: new Date(),
      userId: requireUser(locals).id
    });
    return note === null
      ? fail(404, { message: 'Session note was not found.' })
      : { success: true, note };
  },

  deleteSessionNoteTab: async ({ request, locals }) => {
    ensureDatabase();
    if (requireUser(locals).role !== 'staff' && requireUser(locals).role !== 'admin') {
      return fail(403, { message: 'You cannot delete session notes.' });
    }

    const formData = await request.formData();
    const command = deleteSessionNoteTabSchema.safeParse({
      cmd: 'deleteSessionNoteTab',
      data: { noteId: Number(formData.get('noteId')) }
    });
    if (!command.success) return fail(400, { message: 'A valid note is required.' });

    const note = deleteNote({
      room: requireRoomShortCode(locals),
      noteId: command.data.data.noteId,
      now: new Date(),
      userId: requireUser(locals).id
    });
    return note === null
      ? fail(404, { message: 'Session note was not found.' })
      : { success: true, note };
  },

  setWelcomeMatNoteTab: async ({ request, locals }) => {
    ensureDatabase();
    if (requireUser(locals).role !== 'staff' && requireUser(locals).role !== 'admin') {
      return fail(403, { message: 'You cannot change the welcome mat.' });
    }

    const formData = await request.formData();
    const command = setWelcomeMatNoteTabSchema.safeParse({
      cmd: 'setWelcomeMatNoteTab',
      data: {
        noteId: Number(formData.get('noteId')),
        allRooms: String(formData.get('allRooms')) === 'true'
      }
    });
    if (!command.success) return fail(400, { message: 'A valid note is required.' });

    /*
      The captured command carries `allRooms`, and the controller's own help text for
      `allRoomsWelcomeMatPW` — "Presenters will need to enter the password to replace all the rooms
      welcome mats" — says what it means: set this note as the welcome mat in EVERY room on the
      account, behind a password.

      Only the per-room half is implemented. The room application does not know which other rooms
      the account owns; that list lives in the controller, and so does the password that gates the
      action. Applying it to this room regardless would be the wrong answer in the other direction,
      so `allRooms: true` currently sets this room's mat and no other.

      HONEST GAP, recorded in TODO.md: the all-rooms variant needs a controller endpoint that
      enumerates the account's rooms and verifies `allRoomsWelcomeMatPW`.
    */
    const note = setWelcomeMatNote({
      room: requireRoomShortCode(locals),
      noteId: command.data.data.noteId,
      now: new Date(),
      userId: requireUser(locals).id
    });
    return note === null
      ? fail(404, { message: 'Session note was not found.' })
      : { success: true, note };
  },

  editUsername: async ({ request, locals }) => {
    ensureDatabase();
    const data = await request.formData();
    const userId = Number(data.get('userId'));
    const username = String(data.get('username') ?? '').trim();

    if (!Number.isInteger(userId)) return fail(400, { message: 'A user ID is required.' });
    if (!username) return fail(400, { message: 'A username is required.' });

    /*
      This guard used to read `role === 'user' && id !== userId`, which never fired: no row
      ever holds the role `'user'`. The schema default is `'staff'`
      (src/lib/server/db/schema.ts:8), the provisioning script issues
      `admin | staff | member | guest` (scripts/set-password.mjs:13), and
      src/lib/server/media-grant.test.ts:199 says outright that `'user'` "exists in no row".
      A dead condition meant every authenticated caller - including a guest - could rename
      any other account by id, an admin's included.

      Stated positively instead: you may rename yourself, and a presenter may rename
      anyone. `isPresenterRole` is the same staff|admin test the rest of the file uses.
    */
    const actor = requireUser(locals);
    if (actor.id !== userId && !isPresenterRole(actor.role)) {
      return fail(403, { message: 'You cannot edit this username.' });
    }

    db.update(users).set({ displayName: username }).where(eq(users.id, userId)).run();
    return { success: true };
  },

  sendMessage: async ({ request, locals }) => {
    ensureDatabase();
    const limit = consumeRateLimit('message', requireUser(locals).id);
    if (!limit.allowed) {
      return fail(429, {
        message: `You are sending messages too quickly. Try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.`
      });
    }

    const data = await request.formData();
    const room = String(data.get('room') ?? 'main');

    /*
      RICH TEXT, when the editor sent it.

      `bodyHtml` arrives only from the RTE modal. It is sanitised HERE, on the server, and the
      sanitised value is what is stored — never the submitted one. A client-side sanitiser is a
      convenience for the person typing; it is not a control, because the request can be made
      without the client.

      `body` is then derived from the sanitised HTML with its tags stripped, so every existing
      reader keeps working: the plain-text segment renderer, the mention rule, the popup, search,
      and any client that never learns this column exists. Two representations of one message, and
      the HTML one is never the only copy.
    */
    const submittedHtml = String(data.get('bodyHtml') ?? '').trim();
    const sanitizedHtml = submittedHtml ? sanitizeChatHtml(submittedHtml) : '';
    const bodyHtml = sanitizedHtml && !isEmptyChatHtml(sanitizedHtml) ? sanitizedHtml : null;

    const body = bodyHtml
      ? bodyHtml
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .trim()
      : String(data.get('body') ?? '').trim();

    if (!body) return fail(400, { message: 'A message is required.' });
    if (body.length > MAX_MESSAGE_BODY) {
      return fail(400, { message: 'That message is too long.' });
    }
    /*
      `messages.room` is a channel label, not a foreign key, so nothing in the schema
      stops an arbitrary string being written here. The client only ever renders the two
      channels in `ChatTab`, so a crafted request could park messages in a channel nobody
      displays - invisible content that still occupies the table and still arrives in
      every reader's payload on the next poll.
    */
    if (!isChatTab(room)) return fail(400, { message: 'Unknown channel.' });
    // A mute is granted in one room and must not follow somebody into another.
    const activeMute = db
      .select({ id: chatMutes.id })
      .from(chatMutes)
      .where(
        and(
          eq(chatMutes.roomShortCode, requireRoomShortCode(locals)),
          eq(chatMutes.targetUserId, requireUser(locals).id),
          gt(chatMutes.expiresAt, new Date())
        )
      )
      .get();
    if (activeMute) return fail(403, { muted: true });

    /*
      Both segments of `/sess/${sessionID}/chat/${channel}/`.

      `roomShortCode` is the SESSION — which room this message belongs to. The local `room` is the
      CHANNEL within it, which is why it is almost always 'main'. They are different things and the
      original keeps both; conflating them is what let one room read another's chat.
    */
    db.insert(messages)
      .values({
        roomShortCode: requireRoomShortCode(locals),
        room,
        senderId: requireUser(locals).id,
        body,
        bodyHtml,
        isAdmin: isPresenterRole(requireUser(locals).role),
        createdAt: new Date()
      })
      .run();
    /*
      Tell the room, exactly as `postAlert` does.

      The capture carries chat on `/sess/{sessionID}/chat/{channel}/` - a sibling of the alerts
      channel, sent with `socketService.send("chatMsg", {channel, msg, n})` and drained into
      `chatLog[channel]` with an `emit("chatMsg")`. Without the publish, a message reached the
      database and nobody else's screen until they reloaded.

      `room` is the channel the capture keys by, and it is carried so a later per-channel
      subscription can filter without changing the wire shape.
    */
    publishToRoom(requireRoomShortCode(locals), {
      channel: 'chat',
      data: {
        senderId: requireUser(locals).id,
        senderEmailHash: hashEmail(requireUser(locals).email),
        room
      }
    });

    return { success: true };
  },

  replyMessage: async ({ request, locals }) => {
    ensureDatabase();
    const limit = consumeRateLimit('message', requireUser(locals).id);
    if (!limit.allowed) {
      return fail(429, {
        message: `You are sending messages too quickly. Try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.`
      });
    }

    const data = await request.formData();
    const body = String(data.get('body') ?? '').trim();
    const messageId = Number(data.get('messageId'));

    if (!body) return fail(400, { message: 'A message is required.' });
    if (!Number.isInteger(messageId)) return fail(400, { message: 'A message ID is required.' });

    const original =
      messageId < 0
        ? capturedRoomItem(
            {
              id: requireUser(locals).id,
              emailHash: hashEmail(requireUser(locals).email)
            },
            'chat',
            messageId,
            requireRoomShortCode(locals)
          )
        : db
            .select({
              id: messages.id,
              room: messages.room,
              body: messages.body,
              senderName: users.displayName
            })
            .from(messages)
            .innerJoin(users, eq(messages.senderId, users.id))
            .where(
              and(
                eq(messages.roomShortCode, requireRoomShortCode(locals)),
                eq(messages.id, messageId)
              )
            )
            .get();

    // Refuses a message id from another room, so a reply cannot quote across the boundary.
    if (!original) return fail(404, { message: 'Message not found.' });

    db.insert(messages)
      .values({
        roomShortCode: requireRoomShortCode(locals),
        room: original.room,
        senderId: requireUser(locals).id,
        body,
        replyToMessageId: original.id > 0 ? original.id : null,
        replyToName: original.senderName,
        replyToBody: original.body,
        isAdmin: isPresenterRole(requireUser(locals).role),
        createdAt: new Date()
      })
      .run();
    /*
      Tell the room, exactly as `postAlert` does.

      The capture carries chat on `/sess/{sessionID}/chat/{channel}/` - a sibling of the alerts
      channel, sent with `socketService.send("chatMsg", {channel, msg, n})` and drained into
      `chatLog[channel]` with an `emit("chatMsg")`. Without the publish, a message reached the
      database and nobody else's screen until they reloaded.

      `room` is the channel the capture keys by, and it is carried so a later per-channel
      subscription can filter without changing the wire shape.
    */
    publishToRoom(requireRoomShortCode(locals), {
      channel: 'chat',
      data: {
        senderId: requireUser(locals).id,
        senderEmailHash: hashEmail(requireUser(locals).email),
        room: original.room
      }
    });

    return { success: true };
  },

  // Asking a question against an alert. The count on the alert row and the question row are
  // written in one transaction so the badge can never disagree with the list, and the count is
  // derived from the rows rather than incremented blindly.
  askQuestion: async ({ request, locals }) => {
    ensureDatabase();
    const limit = consumeRateLimit('question', requireUser(locals).id);
    if (!limit.allowed) {
      return fail(429, {
        message: `You are asking questions too quickly. Try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.`
      });
    }

    const data = await request.formData();
    const body = String(data.get('body') ?? '').trim();
    const alertId = Number(data.get('alertId'));

    if (!body) return fail(400, { message: 'A question is required.' });
    if (!Number.isInteger(alertId)) return fail(400, { message: 'An alert ID is required.' });

    // A question stays outstanding until the presenter who posted the alert answers it, so the
    // button keeps flashing for everyone else until then. This deliberately keys off authorship
    // rather than role: resolveConnectedIdentity promotes every guest to `staff`
    // (connection.ts), so a role check would mark every question answered the moment it is asked.
    // Without this nothing ever writes answered_at and the button would flash red forever.
    const alertAuthorId =
      alertId > 0
        ? (db
            .select({ senderId: alerts.senderId })
            .from(alerts)
            .where(
              and(eq(alerts.roomShortCode, requireRoomShortCode(locals)), eq(alerts.id, alertId))
            )
            .get()?.senderId ?? null)
        : (capturedRoomItem(
            { id: requireUser(locals).id, emailHash: hashEmail(requireUser(locals).email) },
            'alert',
            alertId,
            requireRoomShortCode(locals)
          )?.senderId ?? null);
    /*
      THE ALERT MUST BE IN THIS ROOM — added 2026-08-14, and it was a cross-tenant WRITE until then.

      The lookup above is correctly scoped, but its answer was only ever used to decide `isAnswer`.
      A miss produced `null`, `isAnswer` went false, and the insert below ran anyway with whatever
      `alertId` the form carried — so a member of one room could attach a question to another room's
      alert, and that room's Q&A thread would display it. `alert_questions` has no room column of
      its own, so nothing downstream could catch it either.

      `null` here means exactly one thing: no alert with that id exists in THIS room. `senderId` is
      `notNull`, so a found row always answers; and `capturedRoomItem` is given the room too, so a
      captured alert that is hidden or belongs elsewhere is a miss as well. Refusing on `null` is
      therefore the whole check, and it fails closed.
    */
    if (alertAuthorId === null) return fail(404, { message: 'Alert not found.' });

    const isAnswer = alertAuthorId === requireUser(locals).id;
    const now = new Date();

    const stored = db.transaction((transaction) => {
      transaction
        .insert(alertQuestions)
        .values({ alertId, senderId: requireUser(locals).id, body, createdAt: now })
        .run();

      if (isAnswer) {
        transaction
          .update(alertQuestions)
          .set({ answeredAt: now })
          .where(and(eq(alertQuestions.alertId, alertId), isNull(alertQuestions.answeredAt)))
          .run();
      }

      // Captured alerts have negative ids and live in the fixture, not the alerts table, so only
      // a real row gets its cached counters synchronised. Read through `transaction` so the rows
      // just written are included.
      if (alertId > 0) {
        const rows = transaction
          .select({ answeredAt: alertQuestions.answeredAt })
          .from(alertQuestions)
          .where(eq(alertQuestions.alertId, alertId))
          .all();
        transaction
          .update(alerts)
          .set({
            questionCount: rows.length,
            questionAnswered: rows.length > 0 && rows.every((row) => row.answeredAt !== null)
          })
          .where(
            and(eq(alerts.roomShortCode, requireRoomShortCode(locals)), eq(alerts.id, alertId))
          )
          .run();
      }
      return true;
    });

    return { success: stored };
  },

  postAlert: async ({ request, locals }) => {
    ensureDatabase();
    const limit = consumeRateLimit('alert', requireUser(locals).id);
    if (!limit.allowed) {
      return fail(429, {
        message: `You are posting alerts too quickly. Try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.`
      });
    }

    const isPresenter =
      requireUser(locals).role === 'staff' || requireUser(locals).role === 'admin';
    if (!isPresenter) return fail(403);

    const data = await request.formData();
    const kind = String(data.get('kind') ?? '');
    const body = String(data.get('body') ?? '');
    const targetUrl = String(data.get('targetUrl') ?? '') || null;
    const nonTrade = data.get('nonTradeAlert') === 'true';

    if (kind !== 'text' && kind !== 'url' && kind !== 'media') return fail(400);
    if (!body) return fail(400);
    if (body.length > MAX_ALERT_BODY) return fail(400, { message: 'That alert is too long.' });

    const inserted = db
      .insert(alerts)
      .values({
        // `/sess/${sessionID}/alerts/` — an alert belongs to one room.
        roomShortCode: requireRoomShortCode(locals),
        senderId: requireUser(locals).id,
        kind,
        body,
        targetUrl: kind === 'media' ? targetUrl : null,
        nonTrade,
        createdAt: new Date()
      })
      .returning()
      .get();

    /*
      Tell the room. This is the line the product was missing.

      Writing the row made the alert exist; it did not make anyone see it. Every other member's
      page only refetches after that member's OWN action, so a posted alert sat invisible until
      they happened to reload - measured: zero `/api/v1` calls, no second socket, no polling.

      The capture fans this out on a dedicated channel, `/sess/{sessionID}/alerts/`, and each
      client pushes the row into `alertsLog` and emits `alertMsg`. `publishToRoom` is that channel;
      `src/routes/sess/[room]/events/+server.ts` is the wire.
    */
    publishToRoom(requireRoomShortCode(locals), {
      channel: 'alerts',
      data: {
        id: inserted?.id ?? null,
        senderId: requireUser(locals).id,
        senderName: requireUser(locals).displayName,
        body,
        kind,
        nonTrade
      }
    });

    return { success: true };
  },

  /**
   * `remotePresCommand` - a presenter telling ONE member's browser to do something.
   *
   * The capture's three moderation subCmds act on the receiving peer, not on the sender:
   * `mutemic` -> `muteMic()`, `mutecam` -> `stopCam()`, `mutescreens` -> `stopSharingAll()`. So
   * this action does not change any row; it publishes on the command channel and the target's own
   * client carries it out. That is why it is a command and not a mutation.
   *
   * Presenter-only, checked here rather than in the browser: the whole point of the command is
   * that it acts on someone else's machine, so the authority to send it cannot live on the
   * machine that sends it.
   */
  /**
   * `forceReload` - the only command on `/sess/{id}/privCmdsIn/{uid}-{id}/`.
   *
   * Addressed to one member and carried out by their browser, like `remotePresCommand`. Presenter
   * only, for the same reason: it acts on someone else's machine.
   */
  forceReload: async ({ request, locals }) => {
    ensureDatabase();
    const isPresenter =
      requireUser(locals).role === 'staff' || requireUser(locals).role === 'admin';
    if (!isPresenter) return fail(403);

    const data = await request.formData();
    const targetUserId = Number(data.get('targetUserId') ?? NaN);
    if (!Number.isInteger(targetUserId)) return fail(400, { message: 'No target.' });

    publishToRoom(requireRoomShortCode(locals), {
      channel: 'privCmds',
      data: { cmd: 'forceReload', targetUserId }
    });
    return { success: true };
  },

  /**
   * The Files pane upload, from `app-presentationarea`'s `doFileUpload()`:
   *
   * ```js
   * let l = `${apiROOT}/sessions/v2/upload/${sessionID}/${sesionToken}/1/files`,
   *     c = new FormData;
   * c.append("file", e); c.append("originalname", e.name);
   * $.ajax({ url: l, method: "POST", processData: !1, contentType: !1, data: c, ... })
   * ```
   *
   * One request per file - `doFileListUpload()` loops and awaits each one - so this takes a single
   * `file`, and the client drives the loop. Same field names as the capture.
   *
   * Presenter-only, matching `O(81, o.isP ? 81 : -1)` on the button that opens the modal. Gating
   * the button alone would leave the action reachable by anyone who can post a form.
   */
  uploadFile: async ({ request, locals }) => {
    ensureDatabase();
    const user = requireUser(locals);
    if (!isPresenterRole(user.role)) return fail(403, { message: 'Presenters only.' });

    const data = await request.formData();
    const file = data.get('file');
    if (!(file instanceof File)) return fail(400, { message: 'No file.' });

    // The capture sends the display name alongside the blob rather than trusting the part's own
    // filename; `originalname` is what ends up in the row and on screen.
    const originalName = String(data.get('originalname') ?? file.name).trim();
    if (!originalName) return fail(400, { message: 'No file name.' });

    let stored;
    try {
      stored = await storeUpload(file);
    } catch (cause) {
      // Fail loud with the real reason - too large, or empty - rather than a silent no-op that
      // looks like a successful upload of nothing.
      return fail(400, { message: cause instanceof Error ? cause.message : 'Upload failed.' });
    }

    const row = db
      .insert(sharedFiles)
      .values({
        // The Files pane is per room, so an upload lands in the room it was made from.
        roomShortCode: requireRoomShortCode(locals),
        name: originalName,
        kind: stored.kind,
        url: stored.url,
        contentType: stored.contentType,
        size: stored.size,
        uploadedBy: user.id,
        createdAt: new Date()
      })
      .returning()
      .get();

    // Everyone's Files pane is stale the moment this lands; `getSessionFiles()` is what the capture
    // calls after its own upload, and this is the equivalent for the other peers in the room.
    publishToRoom(requireRoomShortCode(locals), { channel: 'cmds', data: { cmd: 'filesChanged' } });

    return { success: true, file: row };
  },

  /**
   * An image posted into chat, an alert, or a private message.
   *
   * SEPARATE from `uploadFile`, and deliberately so: that one backs the Files pane, which the
   * capture gates presenter-only (`O(81, o.isP ? 81 : -1)`). Composer images use a different gate
   * entirely - the same one that decides whether the button is even drawn:
   *
   *   (this.isPresenter || this.appService.globals.sessData.userUploads) && (this.canPostImages = !0)
   *
   * Routing composer uploads through the Files action refused every member with "Presenters only."
   * while their own upload button sat right there, enabled.
   *
   * The capture posts these to an external CDN with no server-side role check at all - the button's
   * visibility IS the gate. Re-checking it here rather than trusting the client is the one
   * deliberate difference.
   */
  uploadComposerImage: async ({ request, locals }) => {
    ensureDatabase();
    const user = requireUser(locals);
    /*
      The room's own setting, asked of the controller — not an environment variable.

      This read `PTR_USER_UPLOADS`, which was a process-wide switch standing in for a per-room one.
      Two rooms on one deployment could not disagree about it, which is the whole point of a room
      setting. The check itself is unchanged and still server-side: in the capture the button's
      visibility IS the gate, and re-checking here rather than trusting the client is the one
      deliberate difference.
    */
    const { settings } = await readRoomConfig(request, requireRoomShortCode(locals), user.email);
    if (!isPresenterRole(user.role) && settings.userUploads !== true) {
      return fail(403, { message: 'Image uploads are turned off for this room.' });
    }

    const limit = consumeRateLimit('message', user.id);
    if (!limit.allowed) return fail(429, { message: 'You are uploading too quickly.' });

    const data = await request.formData();
    const file = data.get('file');
    if (!(file instanceof File)) return fail(400, { message: 'No file.' });
    if (!file.type.startsWith('image/')) {
      return fail(400, { message: 'That is not an image.' });
    }

    const originalName = String(data.get('originalname') ?? file.name).trim() || file.name;
    let stored;
    try {
      stored = await storeUpload(file);
    } catch (cause) {
      return fail(400, { message: cause instanceof Error ? cause.message : 'Upload failed.' });
    }

    const row = db
      .insert(sharedFiles)
      .values({
        // The Files pane is per room, so an upload lands in the room it was made from.
        roomShortCode: requireRoomShortCode(locals),
        name: originalName,
        kind: stored.kind,
        url: stored.url,
        contentType: stored.contentType,
        size: stored.size,
        uploadedBy: user.id,
        createdAt: new Date()
      })
      .returning()
      .get();

    publishToRoom(requireRoomShortCode(locals), { channel: 'cmds', data: { cmd: 'filesChanged' } });
    return { success: true, file: row };
  },

  /**
   * `deleteFile(name, id)` in the capture: a confirm, then one `deleteFile` command per file
   * carrying `fileID`, then `getSessionFiles()`. `deleteSelected()` is the same command in a loop
   * over `#filesDriveList input:checked`, so both share this action and the client drives the loop.
   *
   * Presenter-only, matching `O(19, i.isP ? 19 : -1)` on the row button and `O(77, o.isP ? 77 : -1)`
   * on Delete Selected.
   */
  deleteFile: async ({ request, locals }) => {
    ensureDatabase();
    const user = requireUser(locals);
    if (!isPresenterRole(user.role)) return fail(403, { message: 'Presenters only.' });

    const data = await request.formData();
    const fileId = Number(data.get('fileID') ?? NaN);
    if (!Number.isInteger(fileId)) return fail(400, { message: 'No file.' });

    // Scoped, so a presenter cannot delete another room's file by naming its id.
    const row = db
      .select()
      .from(sharedFiles)
      .where(
        and(eq(sharedFiles.roomShortCode, requireRoomShortCode(locals)), eq(sharedFiles.id, fileId))
      )
      .get();
    if (!row) return fail(404, { message: 'No such file.' });

    db.delete(sharedFiles)
      .where(
        and(eq(sharedFiles.roomShortCode, requireRoomShortCode(locals)), eq(sharedFiles.id, fileId))
      )
      .run();
    // The row is the only reference to the blob, so dropping it without the bytes would leak a
    // file on disk that nothing can ever reach or clean up.
    await deleteStoredFile(row.url);

    publishToRoom(requireRoomShortCode(locals), { channel: 'cmds', data: { cmd: 'filesChanged' } });
    return { success: true };
  },

  /**
   * `playMp3ForAll(e)` and `stopMp3ForAll()`, both `sendServerAdminCommand`:
   *
   * ```js
   * playMp3ForAll(e) { this.appService.sendServerAdminCommand('playMP3ForAll', { url: e }) }
   * stopMp3ForAll()  { this.appService.sendServerAdminCommand('stopMp3ForAll') }
   * ```
   *
   * Admin commands, so presenter-only, and the command name is checked against the two the capture
   * defines rather than forwarded - an unknown string would reach every client and be dispatched by
   * none, which is a silent no-op dressed as a success.
   */
  fileMediaCommand: async ({ request, locals }) => {
    ensureDatabase();
    const user = requireUser(locals);
    if (!isPresenterRole(user.role)) return fail(403, { message: 'Presenters only.' });

    const data = await request.formData();
    const cmd = String(data.get('cmd') ?? '');
    if (cmd !== 'playMP3ForAll' && cmd !== 'stopMp3ForAll') {
      return fail(400, { message: 'Unknown command.' });
    }

    const url = String(data.get('url') ?? '');
    // Only a file this room actually holds. A free-text URL broadcast to every peer is an open
    // redirect that plays whatever the sender names, on everyone's speakers.
    if (cmd === 'playMP3ForAll') {
      // The room predicate is what makes the comment above true — without it, "a file this room
      // holds" was any file on the deployment, playable into this room's speakers.
      const known = db
        .select()
        .from(sharedFiles)
        .where(
          and(eq(sharedFiles.roomShortCode, requireRoomShortCode(locals)), eq(sharedFiles.url, url))
        )
        .get();
      if (!known) return fail(400, { message: 'No such file.' });
    }

    publishToRoom(requireRoomShortCode(locals), {
      channel: 'cmds',
      data: cmd === 'playMP3ForAll' ? { cmd, url } : { cmd }
    });
    return { success: true };
  },

  /**
   * `overwriteCashRegisterSound(url, on)` — the Files pane's two `set-alert-sound-btn` buttons.
   *
   * ```js
   * overwriteCashRegisterSound(e, i) {
   *   this.appService.sendServerAdminCommand('overwriteCashRegisterSound', { url: i ? e : '' });
   *   this.appService.globals.sessData.overwriteCashRegisterSound = i ? e : '';
   * }
   * ```
   *
   * ## Why this is not `fileMediaCommand`
   *
   * That action BROADCASTS. `playMP3ForAll` is an event — every browser plays a sound once and
   * nothing about the room has changed. This is a room SETTING: `overwriteCashRegisterSound` is one
   * of the controller's 269, edited on the Manage page as "Overwrite Cash Register Sound". Widening
   * `fileMediaCommand` to carry it would change what the connected browsers believe and persist
   * nothing, so the next reload would put the old sound back.
   *
   * So it is written through to the controller, which owns room settings, and the room reads it
   * back the same way it reads every other one. No broadcast is needed and none is sent: the page's
   * five-second `invalidate('room:data')` re-runs `load`, which re-reads the configuration, so every
   * connected browser converges on the stored value rather than on a message it may have missed.
   * The reference does not broadcast either — line 3086 sets its own `globals.sessData` and leaves
   * everyone else to the server.
   *
   * ## Gating
   *
   * Presenter-only here, and presenter-only AGAIN on the controller: `internal/room-setting`
   * re-checks that the named member is the owner or a true presenter of that room, because a form
   * action is not the only way to reach an HTTP endpoint. The url must also be a file THIS room
   * holds — the same predicate `playMP3ForAll` applies, and for the same reason: without it, "the
   * sound this room plays for every alert" would be any URL the sender cared to name.
   */
  overwriteCashRegisterSound: async ({ request, locals }) => {
    ensureDatabase();
    const user = requireUser(locals);
    if (!isPresenterRole(user.role)) return fail(403, { message: 'Presenters only.' });

    const data = await request.formData();
    /*
      `on` is the reference's second argument: true from "Set as alert sound", false from "Remove
      as alert sound". Compared against the exact string rather than parsed loosely — an
      unrecognised value must not fall through to "remove" and silently clear the room's sound.
    */
    const raw = String(data.get('on') ?? '');
    if (raw !== 'true' && raw !== 'false') return fail(400, { message: 'Unknown command.' });
    const on = raw === 'true';

    const url = String(data.get('url') ?? '');
    if (on) {
      const known = db
        .select()
        .from(sharedFiles)
        .where(
          and(eq(sharedFiles.roomShortCode, requireRoomShortCode(locals)), eq(sharedFiles.url, url))
        )
        .get();
      if (!known) return fail(400, { message: 'No such file.' });
      // The same test the row's own gate applies (`contentType.indexOf('audio/') >= 0`). A pdf set
      // as the alert sound is a room whose alerts are silent, with nothing on screen saying why.
      if (known.contentType.indexOf('audio/') < 0) {
        return fail(400, { message: 'That file is not a sound.' });
      }
    }

    try {
      await writeRoomSetting(
        requireRoomShortCode(locals),
        user.email,
        'overwriteCashRegisterSound',
        // Removing sends the EMPTY STRING, exactly as the reference does — not the url being
        // removed, and not an absent field.
        alertSoundCommandValue(url, on)
      );
    } catch (cause) {
      // Loud. A button that changes its own label while the setting did not move is the defect
      // this whole path exists to avoid.
      console.error('[overwriteCashRegisterSound] the controller refused the write', cause);
      return fail(502, { message: 'Could not change the alert sound right now.' });
    }

    return { success: true };
  },

  /**
   * `sendPrivChat(peerID, msg, recvdUser)` in the capture, which puts
   * `{peerID, msg, n, recvdNick, recvdAvt, recvdPic, recvdIsA}` on the wire as `privMsg`.
   *
   * Everything after `peerID` and `msg` is display data about the recipient that the SENDER
   * supplies. None of it is trusted here: the row stores ids, and both names and avatars are read
   * back from `users` when the thread is loaded. A client that lies about `recvdNick` changes
   * nothing.
   *
   * Published to BOTH parties, matching the capture's channel semantics - see `RoomEvent`.
   */
  sendPrivateMessage: async ({ request, locals }) => {
    ensureDatabase();
    const user = requireUser(locals);

    const data = await request.formData();
    const peerId = Number(data.get('peerID') ?? NaN);
    const body = String(data.get('msg') ?? '').trim();
    if (!Number.isInteger(peerId)) return fail(400, { message: 'No recipient.' });
    if (!body) return fail(400, { message: 'Empty message.' });
    // Talking to yourself is the capture's own guard: `bootbox.alert("Chatting with yourself again?")`.
    if (peerId === user.id) return fail(400, { message: 'Chatting with yourself again?' });

    const peer = db.select().from(users).where(eq(users.id, peerId)).get();
    if (!peer) return fail(404, { message: 'No such user.' });

    // The same bucket public chat uses. A private message is a message; giving it its own quota
    // would let one user spend both budgets at once.
    const limit = consumeRateLimit('message', user.id);
    if (!limit.allowed) {
      return fail(429, { message: 'You are sending messages too quickly.' });
    }

    const row = insertPrivateMessage(requireRoomShortCode(locals), user.id, peerId, body);
    const message = {
      _id: String(row.id),
      t: row.createdAt.getTime(),
      n: user.displayName,
      txt: row.body,
      uid: user.id,
      recvdID: peerId,
      avt: user.email,
      pic: user.avatarUrl,
      isA: isPresenterRole(user.role)
    };

    // Both parties. The sender's own copy is how their message reaches their log.
    publishToRoom(requireRoomShortCode(locals), {
      channel: 'privChat',
      data: { toUserId: peerId, fromUserId: user.id, message }
    });
    publishToRoom(requireRoomShortCode(locals), {
      channel: 'privChat',
      data: { toUserId: user.id, fromUserId: user.id, message }
    });

    return { success: true, message };
  },

  /** `getPCLog {page, peerID}`, and `doPCLogSearch {searchTerm, peerID}` when a term is given. */
  loadPrivateChatLog: async ({ request, locals }) => {
    ensureDatabase();
    const user = requireUser(locals);

    const data = await request.formData();
    const peerId = Number(data.get('peerID') ?? NaN);
    if (!Number.isInteger(peerId)) return fail(400, { message: 'No peer.' });

    const searchTerm = String(data.get('searchTerm') ?? '').trim();
    if (searchTerm) {
      return {
        success: true,
        peerId,
        page: 0,
        messages: searchThread(requireRoomShortCode(locals), user.id, peerId, searchTerm)
      };
    }
    const page = Number(data.get('page') ?? 0) || 0;
    return {
      success: true,
      peerId,
      page,
      messages: loadThread(requireRoomShortCode(locals), user.id, peerId, page)
    };
  },

  /**
   * `getChatLog {channel, page}` — one page of older history for the main chat log.
   *
   * The reference's own command, minus the socket. Its client asks for page N when the reader
   * scrolls near the top, and the server answers with that page and nothing else; an EMPTY answer
   * is what tells the client to stop asking (`0 == o.length && (this.hasMoreData = !1)`).
   *
   * ## The channel is validated, not trusted
   *
   * `isChatChannel` is an allow-list of the two channels this room renders. Without it the field
   * would be an arbitrary string reaching a WHERE clause — parameterised, so not injectable, but it
   * would let a caller enumerate whether messages exist under any label they cared to guess. Deny
   * by default costs one line.
   *
   * ## Scoped like every other read here
   *
   * `requireRoomShortCode(locals)` — the room comes from the session, never from the request. A
   * `roomShortCode` field on this form would be the 2026-08-07 privilege escalation again, in a
   * new place.
   */
  loadOlderChatMessages: async ({ request, locals }) => {
    ensureDatabase();
    requireUser(locals);

    const data = await request.formData();
    const channel = String(data.get('channel') ?? '');
    if (!isChatChannel(channel)) return fail(400, { message: 'No such channel.' });

    /*
      Page 0 is the newest page and the page load already sent it, so asking for it here would
      duplicate what the client holds rather than reach further back. Bounded at the top too: a
      caller cannot ask for page 10,000,000 and make SQLite count its way there, which is what an
      unvalidated OFFSET is.
    */
    const page = Number(data.get('page') ?? 0);
    if (!Number.isInteger(page) || page < 1 || page > MAX_CHAT_LOG_PAGE) {
      return fail(400, { message: 'No such page.' });
    }

    return {
      success: true,
      channel,
      page,
      messages: loadChatPage(requireRoomShortCode(locals), channel, page)
    };
  },

  /**
   * `getAlertsLog {page}` — one page of older alerts.
   *
   * The sibling of `loadOlderChatMessages`, minus the channel: alerts are one stream per room, so
   * upstream's command carries a page and nothing else. An EMPTY answer is what stops the client
   * asking, and the arrival handler that reads it is literally the same component for both log
   * types, switched on `logType`.
   */
  loadOlderAlerts: async ({ request, locals }) => {
    ensureDatabase();
    requireUser(locals);

    const data = await request.formData();
    /* Page 0 is the newest page and the load already sent it; the upper bound caps the OFFSET
       walk, which is a scan. Same reasoning as the chat action, same constant. */
    const page = Number(data.get('page') ?? 0);
    if (!Number.isInteger(page) || page < 1 || page > MAX_CHAT_LOG_PAGE) {
      return fail(400, { message: 'No such page.' });
    }

    return {
      success: true,
      page,
      alerts: loadAlertPage(requireRoomShortCode(locals), page)
    };
  },

  /** `deletePeerPCLog {peerID}` - the whole conversation, both directions. */
  deletePrivateChatLog: async ({ request, locals }) => {
    ensureDatabase();
    const user = requireUser(locals);

    const data = await request.formData();
    const peerId = Number(data.get('peerID') ?? NaN);
    if (!Number.isInteger(peerId)) return fail(400, { message: 'No peer.' });

    deleteThread(requireRoomShortCode(locals), user.id, peerId);
    // The peer's copy is gone too, so their open tab is now lying to them.
    publishToRoom(requireRoomShortCode(locals), {
      channel: 'privChat',
      data: { toUserId: peerId, fromUserId: user.id }
    });
    return { success: true };
  },

  /**
   * Broadcasts the room's recording state.
   *
   * `roomState.isRecording` is SERVER state in the capture, not a local flag - the client only ever
   * reads it, and the four transitions arrive as events:
   *
   * ```js
   * appEventBus.subscribe("startRec",  i => { roomState.isRecording = !0; ...recordingStart.play() })
   * appEventBus.subscribe("stopRec",   i => { roomState.isRecording = !1; ...recordingStop.play() })
   * appEventBus.subscribe("pauseRec",  () => { roomState.isRecordingPaused = !0; ... })
   * appEventBus.subscribe("resumeRec", () => { roomState.isRecordingPaused = !1; ... })
   * ```
   *
   * That is why the `[ REC ]` badge shows to everyone: a member learns the room is being recorded
   * from the server, never from their own browser. Ours was gated on the presenter's local
   * `MediaRecorder` flag, so a member's copy was permanently false and the badge never appeared.
   *
   * `recName` rides along because the tooltip needs it - and the capture suppresses only the NAME
   * from non-presenters (`dontShowRecInfoToUsers && !isPresenter`), never the badge.
   */
  recordingState: async ({ request, locals }) => {
    ensureDatabase();
    const user = requireUser(locals);
    if (!isPresenterRole(user.role)) return fail(403, { message: 'Presenters only.' });

    const data = await request.formData();
    const cmd = String(data.get('cmd') ?? '');
    const allowed = new Set(['startRec', 'stopRec', 'pauseRec', 'resumeRec']);
    if (!allowed.has(cmd)) return fail(400, { message: 'Unknown command.' });

    const recName = String(data.get('recName') ?? '').slice(0, 200);
    publishToRoom(requireRoomShortCode(locals), {
      channel: 'cmds',
      data: { cmd, recName: recName || undefined }
    });
    return { success: true };
  },

  /**
   * `sendServerAdminCommand('changeChatMode', {mode})` — a PRESENTER act that changes the room.
   *
   * ```js
   * changeChatMode(e, i) {
   *   if (sessData.chatMode == e) return;
   *   let o = '"Group Chat"?';
   *   'p' == e ? (o = '"Webinar Mode"?') : 'd' == e && (o = '"Disabled"?');
   *   bootbox.confirm('Are you sure you want to change the chat mode to ' + o, s => {
   *     s && this.appService.sendServerAdminCommand('changeChatMode', {mode: e});
   *   });
   * }
   * ```
   *
   * PERSISTED, unlike the recording state next to it. Recording is momentary and a late joiner has
   * missed nothing by not hearing it; a disabled chat is a standing fact about the room, and a
   * member who arrives afterwards has to find it disabled. Broadcast as well, so the tabs that are
   * already open change without waiting for a reload.
   *
   * Presenter-gated on the SERVER from the session's own role. The radio is presenter-only in the
   * modal too, and a hidden control is not an authorization check.
   */
  changeChatMode: async ({ request, locals }) => {
    ensureDatabase();
    const user = requireUser(locals);
    if (!isPresenterRole(user.role)) return fail(403, { message: 'Presenters only.' });

    const data = await request.formData();
    const mode = String(data.get('mode') ?? '');
    // Deny by default: three letters, and anything else is refused rather than stored.
    if (!isChatMode(mode)) return fail(400, { message: 'Unknown chat mode.' });

    const roomShortCode = requireRoomShortCode(locals);
    db.insert(roomState)
      .values({ roomShortCode, chatMode: mode, updatedAt: new Date() })
      /* One row per room, so a second change UPDATES rather than appending a second opinion about
         what the mode is. The conflict target is the primary key. */
      .onConflictDoUpdate({
        target: roomState.roomShortCode,
        set: { chatMode: mode, updatedAt: new Date() }
      })
      .run();

    publishToRoom(roomShortCode, { channel: 'cmds', data: { cmd: 'changeChatMode', mode } });
    return { success: true, mode };
  },

  /**
   * `sendServerCommand("getMyMobilePin", null)`.
   *
   * The room has never held the pin: the reference sends this on the command channel and the
   * server answers with one. Here the controller is that server - the code lives on
   * `room_users.mobile_pair_code`, which is per room, and it is minted fresh per request.
   *
   * Gated the same way the button is, and re-gated here because a hidden button is not an
   * authorization check.
   */
  getMyMobilePin: async ({ request, locals }) => {
    ensureDatabase();
    const user = requireUser(locals);
    const shortCode = requireRoomShortCode(locals);

    const { settings } = await readRoomConfig(request, shortCode, user.email);
    const appEnabled =
      settings.ptrMobileAppEnabled === true || settings.customMobileAppEnabled === true;
    if (!appEnabled) return fail(409, { message: 'This room has no mobile app configured.' });

    try {
      return { pin: await requestMobilePin(shortCode, user.email) };
    } catch (cause) {
      // Loud, not a placeholder: showing a pin that was never issued is worse than saying so.
      console.error('[getMyMobilePin] the controller could not issue a pin', cause);
      return fail(502, { message: 'Could not get an app pin right now.' });
    }
  },

  presenterCommand: async ({ request, locals }) => {
    ensureDatabase();
    const isPresenter =
      requireUser(locals).role === 'staff' || requireUser(locals).role === 'admin';
    if (!isPresenter) return fail(403);

    const data = await request.formData();
    const subCmd = String(data.get('subCmd') ?? '');
    const targetUserId = Number(data.get('targetUserId') ?? NaN);

    // Only the subCmds the capture defines. An unknown string would be forwarded to every client
    // and dispatched by none, which is a silent no-op rather than an error.
    const allowed = new Set(['mutemic', 'mutecam', 'mutescreens']);
    if (!allowed.has(subCmd)) return fail(400, { message: 'Unknown command.' });
    if (!Number.isInteger(targetUserId)) return fail(400, { message: 'No target.' });

    publishToRoom(requireRoomShortCode(locals), {
      channel: 'cmds',
      data: { cmd: 'remotePresCommand', subCmd, targetUserId }
    });

    return { success: true };
  },

  /**
   * `focusOnScreen` — a presenter pulls the whole room to one screen.
   *
   * `bringFocusToScreen(e) { e && this.appService.sendServerAdminCommand("focusOnScreen", {id: e}) }`
   * (`main.d6d3c112b59b7d0d.js` byte 1918706 for the menu item, and the method itself). It is a
   * SERVER command upstream, and it has to be one here too: the room learns about it over the same
   * `cmds` channel every other broadcast uses, and the authority to send it belongs to the server.
   *
   * A separate action rather than another `presenterCommand` subCmd, deliberately. That action
   * validates `Number.isInteger(targetUserId)` because every command it carries names a PERSON;
   * this one names a SCREEN, so folding it in would mean loosening a check that currently rejects
   * anything without an integer target. Two payload shapes, two validations.
   *
   * The presenter check is made here, from the session's own role, and is not asserted by the
   * client — the 2026-08-07 privilege escalation was exactly that mistake. `requireRoomShortCode`
   * scopes the broadcast to the caller's own room, so a presenter of room A cannot move room B.
   */
  focusOnScreen: async ({ request, locals }) => {
    ensureDatabase();
    const isPresenter =
      requireUser(locals).role === 'staff' || requireUser(locals).role === 'admin';
    if (!isPresenter) return fail(403);

    const data = await request.formData();
    const screenId = String(data.get('screenId') ?? '').trim();
    /* `e &&` — the reference sends nothing for an empty id, and an empty broadcast would ask every
       client to focus a screen that does not exist. */
    if (!screenId) return fail(400, { message: 'No screen.' });

    publishToRoom(requireRoomShortCode(locals), {
      channel: 'cmds',
      data: { cmd: 'focusOnScreen', screenId }
    });

    return { success: true };
  },

  /**
   * `giveMicScreen` — a presenter hands a member mic and screenshare, or takes them back.
   *
   * Transcribed from `docs/source/main.d6d3c112b59b7d0d.js` offset 2075481, where it sits on the
   * same class as `saveCustomPerms` and `startPrivateChat` — the user-info modal:
   *
   * ```js
   * giveMicScreen(e) {
   *   if (this.user.userXrefID == this.appService.globals.user.userXrefID)
   *     return bootbox.alert(`Can't ${e ? 'give' : 'take'} 'Mic/Screenshare' to yourself.`), !1;
   *   this.appService.sendServerAdminCommand('giveMicScreen', { user: this.user._id, give: e });
   *   bootbox.alert(e ? 'Mic/Screenshare given OK' : 'Mic/Screen taken away OK');
   * }
   * ```
   *
   * It is a COMMAND, not a stored permission. The recipient's own client flips
   * `isPresenter`/`isLimitedPresenter` and reinitialises its media — which is why
   * `is_limited_presenter` was correctly removed as a column: it is transient state, not a
   * property of an account.
   *
   * The self-target refusal is enforced here as well as in the UI. The reference checks it only in
   * the browser, and a presenter who reached this endpoint directly would otherwise flip their own
   * presenter flag off and have no control left to flip it back.
   */
  giveMicScreen: async ({ request, locals }) => {
    ensureDatabase();
    const actor = requireUser(locals);
    if (actor.role !== 'staff' && actor.role !== 'admin') return fail(403);

    const data = await request.formData();
    const targetUserId = Number(data.get('targetUserId') ?? NaN);
    const give = data.get('give') === 'true';
    if (!Number.isInteger(targetUserId)) return fail(400, { message: 'No target.' });
    if (targetUserId === actor.id) {
      return fail(400, {
        message: `Can't ${give ? 'give' : 'take'} 'Mic/Screenshare' to yourself.`
      });
    }

    /*
      Recorded on the SERVER before it is announced — `TODO.md` gap 22.

      The SFU decides who may produce from the grant's role, and `/api/media/grant` reads this row
      when it mints. Without it the recipient restarts its media and is refused `forbidden`, because
      a runtime hand-over never touches the controller's membership.

      Written here rather than trusted from the client: the reference achieves the same thing by
      letting the browser re-join asserting its own `isP`, which is the privilege escalation removed
      on 2026-08-07. This action is already staff-gated and refuses a self-target, so the authority
      is established before the row is written.
    */
    if (give) grantMediaElevation(requireRoomShortCode(locals), targetUserId, actor.id);
    else revokeMediaElevation(requireRoomShortCode(locals), targetUserId);

    publishToRoom(requireRoomShortCode(locals), {
      channel: 'cmds',
      data: { cmd: 'giveMicScreen', targetUserId, give }
    });

    return { micScreen: give ? 'Mic/Screenshare given OK' : 'Mic/Screen taken away OK' };
  },

  savePoll: async ({ request, locals }) => {
    ensureDatabase();
    const isPresenter =
      requireUser(locals).role === 'staff' || requireUser(locals).role === 'admin';
    if (!isPresenter) return fail(403);

    const data = await request.formData();
    const question = String(data.get('q') ?? '');
    const choices = parsePollChoices(String(data.get('choices') ?? ''));
    if (!choices) return fail(400, { message: 'Invalid poll choices.' });

    db.insert(savedPolls)
      .values({
        // A saved poll is a presenter's re-usable template for THIS room's poll list.
        roomShortCode: requireRoomShortCode(locals),
        question,
        choicesJson: JSON.stringify(choices),
        createdByUserId: requireUser(locals).id,
        createdAt: new Date()
      })
      .run();

    return { success: true };
  },

  deleteSavedPoll: async ({ request, locals }) => {
    ensureDatabase();
    const isPresenter =
      requireUser(locals).role === 'staff' || requireUser(locals).role === 'admin';
    if (!isPresenter) return fail(403);

    const data = await request.formData();
    const pollId = Number(data.get('pollId'));
    if (!Number.isInteger(pollId)) return fail(400, { message: 'A saved poll ID is required.' });

    db.delete(savedPolls)
      .where(
        and(eq(savedPolls.roomShortCode, requireRoomShortCode(locals)), eq(savedPolls.id, pollId))
      )
      .run();
    return { success: true };
  },

  sendPoll: async ({ request, locals }) => {
    ensureDatabase();
    const isPresenter =
      requireUser(locals).role === 'staff' || requireUser(locals).role === 'admin';
    if (!isPresenter) return fail(403);

    const data = await request.formData();
    const question = String(data.get('q') ?? '');
    const choices = parsePollChoices(String(data.get('choices') ?? ''));
    if (!choices) return fail(400, { message: 'Invalid poll choices.' });

    const endedAt = new Date();
    /*
      Close the previously active poll in THIS room before opening another.

      Without the room predicate this closed the live poll in every room on the deployment: one
      presenter starting a poll ended everybody else's mid-vote. Only one poll is active per room,
      which is why the room has to be part of the condition.
    */
    db.update(polls)
      .set({ status: 'done', endedAt })
      .where(and(eq(polls.roomShortCode, requireRoomShortCode(locals)), eq(polls.status, 'active')))
      .run();
    const poll = db
      .insert(polls)
      .values({
        roomShortCode: requireRoomShortCode(locals),
        senderId: requireUser(locals).id,
        question,
        choicesJson: JSON.stringify(choices),
        status: 'active',
        createdAt: endedAt
      })
      .returning({ id: polls.id })
      .get();

    return { success: true, pollId: poll.id };
  },

  sendPollAnswer: async ({ request, locals }) => {
    ensureDatabase();
    const data = await request.formData();
    const choiceIndex = Number(data.get('a'));
    if (!Number.isInteger(choiceIndex)) return fail(400, { message: 'A poll choice is required.' });

    /*
      THIS room's active poll.

      Unscoped, a member voting resolved whichever poll was open anywhere on the deployment and
      recorded their answer against it — a vote cast into a room they are not in, and a stranger's
      vote counted in yours. `poll_answers` needs no room column of its own because it reaches its
      poll through `pollId`, and this is the lookup that makes that safe.
    */
    const activePoll = db
      .select()
      .from(polls)
      .where(and(eq(polls.roomShortCode, requireRoomShortCode(locals)), eq(polls.status, 'active')))
      .orderBy(desc(polls.createdAt))
      .get();
    if (!activePoll) return fail(404, { message: 'No active poll was found.' });

    const choices = parsePollChoices(activePoll.choicesJson) ?? [];
    if (choiceIndex < 0 || choiceIndex >= choices.length) {
      return fail(400, { message: 'The poll choice is out of range.' });
    }

    const existingAnswer = db
      .select({ id: pollAnswers.id })
      .from(pollAnswers)
      .where(
        and(eq(pollAnswers.pollId, activePoll.id), eq(pollAnswers.senderId, requireUser(locals).id))
      )
      .get();
    if (!existingAnswer) {
      db.insert(pollAnswers)
        .values({
          pollId: activePoll.id,
          senderId: requireUser(locals).id,
          choiceIndex,
          createdAt: new Date()
        })
        .run();
    }

    return { success: true };
    /*
      `handleServerCmdAdmin` is one line and this is the only command it carries:
        handleServerCmdAdmin(e, i) { "gotPollAnswer" === e && emit("gotPollAnswer", i) }
      It rides `/cmdsAdmin/`, so only presenters are subscribed to it - a member answering a poll
      must not tell every other member how they voted.
    */
    publishToRoom(requireRoomShortCode(locals), {
      channel: 'cmdsAdmin',
      data: { cmd: 'gotPollAnswer' }
    });
  },

  pollDone: async ({ locals }) => {
    ensureDatabase();
    const isPresenter =
      requireUser(locals).role === 'staff' || requireUser(locals).role === 'admin';
    if (!isPresenter) return fail(403);

    /*
      Ending the poll ends it here.

      The sender predicate limited the blast radius to this presenter's own polls, but a presenter
      who owns rooms A and B would have closed both at once. The room is what "done" means.
    */
    db.update(polls)
      .set({ status: 'done', endedAt: new Date() })
      .where(
        and(
          eq(polls.roomShortCode, requireRoomShortCode(locals)),
          eq(polls.status, 'active'),
          eq(polls.senderId, requireUser(locals).id)
        )
      )
      .run();
    return { success: true };
  },

  messageAction: async ({ request, locals }) => {
    ensureDatabase();
    const data = await request.formData();
    const operation = String(data.get('operation') ?? '');
    const kind = String(data.get('kind') ?? '');
    const id = Number(data.get('id'));
    const isPresenter =
      requireUser(locals).role === 'staff' || requireUser(locals).role === 'admin';

    if (!Number.isInteger(id)) return fail(400, { message: 'A message ID is required.' });

    /**
     * Resolves a captured item, or null for a real one.
     *
     * Negative ids belong to the fixture and have no row anywhere, so every branch below has to
     * decide between "update a table" and "record an override" before it can look anything up.
     */
    const captured =
      id < 0
        ? capturedRoomItem(
            { id: requireUser(locals).id, emailHash: hashEmail(requireUser(locals).email) },
            kind === 'alert' ? 'alert' : 'chat',
            id,
            requireRoomShortCode(locals)
          )
        : null;

    /** Writes one override column, leaving the others as they were. */
    function recordOverride(
      evidenceKey: string,
      patch: { answered?: boolean; body?: string; reactionsJson?: string }
    ) {
      const now = new Date();
      db.insert(capturedItemOverrides)
        .values({
          evidenceKey,
          roomShortCode: requireRoomShortCode(locals),
          ...patch,
          updatedByUserId: requireUser(locals).id,
          updatedAt: now
        })
        .onConflictDoUpdate({
          /*
            The conflict target is the whole key, room included. Keyed on `evidenceKey` alone this
            upsert would collapse every room's edit of the same captured item into one row, so
            editing it here rewrote it everywhere.
          */
          target: [capturedItemOverrides.evidenceKey, capturedItemOverrides.roomShortCode],
          // Only the columns in `patch` - an edit must not wipe an existing reaction override.
          set: { ...patch, updatedByUserId: requireUser(locals).id, updatedAt: now }
        })
        .run();
    }

    if (operation === 'delete') {
      // Captured items carry negative ids and live in the fixture, not in a table, so there is no
      // row to delete. Record the deletion instead: the load filters the fixture through
      // hidden_room_items, which makes it stick for everyone rather than only for the browser that
      // asked. Same authorisation rule as a real delete - a presenter may remove anything, anyone
      // else only what the capture attributes to them.
      if (id < 0) {
        if (!captured) return fail(404, { message: 'Message not found.' });
        if (!isPresenter && captured.senderId !== requireUser(locals).id) return fail(403);
        db.insert(hiddenRoomItems)
          .values({
            evidenceKey: captured.evidenceKey,
            // Hiding the fixture's copy in THIS room only — every room is served the same item.
            roomShortCode: requireRoomShortCode(locals),
            hiddenByUserId: requireUser(locals).id,
            hiddenAt: new Date()
          })
          .onConflictDoNothing()
          .run();
        return { success: true };
      }

      /*
        Every lookup below is room-scoped, and that is load-bearing rather than tidy.

        `id` comes from the form. Without the room predicate a presenter — who is a presenter only
        in their OWN room — could delete any alert or message on the deployment by naming its id,
        and the ownership check beneath would pass because the row really is theirs to delete in
        the room it came from. Resolving nothing outside this room is what makes that check mean
        what it says.
      */
      if (kind === 'alert') {
        const alert = db
          .select()
          .from(alerts)
          .where(and(eq(alerts.roomShortCode, requireRoomShortCode(locals)), eq(alerts.id, id)))
          .get();
        if (!alert) return fail(404, { message: 'Alert not found.' });
        if (!isPresenter && alert.senderId !== requireUser(locals).id) return fail(403);
        // The questions belong to the alert, so they go with it. Left behind they are unreachable -
        // nothing renders a question whose alert is gone - but they still count towards the pending
        // total that decides whether the Q&A button flashes.
        db.transaction((transaction) => {
          // `alertQuestions` reaches its room through `alertId`, which the lookup above just
          // proved belongs here.
          transaction.delete(alertQuestions).where(eq(alertQuestions.alertId, id)).run();
          transaction
            .delete(alerts)
            .where(and(eq(alerts.roomShortCode, requireRoomShortCode(locals)), eq(alerts.id, id)))
            .run();
        });
        return { success: true };
      }

      const message = db
        .select()
        .from(messages)
        .where(and(eq(messages.roomShortCode, requireRoomShortCode(locals)), eq(messages.id, id)))
        .get();
      if (!message) return fail(404, { message: 'Message not found.' });
      if (!isPresenter && message.senderId !== requireUser(locals).id) return fail(403);
      db.delete(messages)
        .where(and(eq(messages.roomShortCode, requireRoomShortCode(locals)), eq(messages.id, id)))
        .run();
      return { success: true };
    }

    if (operation === 'reaction') {
      const key = String(data.get('reactionKey') ?? '').trim();
      const emoji = String(data.get('reactionEmoji') ?? '').trim();
      if (!key || !emoji) return fail(400, { message: 'A reaction is required.' });

      const currentUserHash = hashEmail(requireUser(locals).email);

      // Captured items: same toggle, written to the overlay instead of to a row. Anyone who can see
      // the item may react to it, which is what the real branches below allow too.
      if (id < 0) {
        if (!captured) return fail(404, { message: 'Message not found.' });
        const stored = db
          .select({ reactionsJson: capturedItemOverrides.reactionsJson })
          .from(capturedItemOverrides)
          .where(
            and(
              eq(capturedItemOverrides.roomShortCode, requireRoomShortCode(locals)),
              eq(capturedItemOverrides.evidenceKey, captured.evidenceKey)
            )
          )
          .get();
        // Start from the override if one exists, otherwise from the fixture's own reactions.
        const reactions = parseReactions(stored?.reactionsJson ?? captured.reactionsJson);
        const reaction = reactions[key] ?? { emoji, clickedBy: [] };
        const clickedIndex = reaction.clickedBy.indexOf(currentUserHash);
        if (clickedIndex >= 0) reaction.clickedBy.splice(clickedIndex, 1);
        else reaction.clickedBy.push(currentUserHash);
        if (reaction.clickedBy.length === 0) delete reactions[key];
        else reactions[key] = { emoji: reaction.emoji || emoji, clickedBy: reaction.clickedBy };
        recordOverride(captured.evidenceKey, { reactionsJson: JSON.stringify(reactions) });
        return { success: true, reactions };
      }

      if (kind === 'alert') {
        const alert = db
          .select()
          .from(alerts)
          .where(and(eq(alerts.roomShortCode, requireRoomShortCode(locals)), eq(alerts.id, id)))
          .get();
        if (!alert) return fail(404, { message: 'Alert not found.' });
        const reactions = parseReactions(alert.reactionsJson);
        const reaction = reactions[key] ?? { emoji, clickedBy: [] };
        const clickedIndex = reaction.clickedBy.indexOf(currentUserHash);
        if (clickedIndex >= 0) reaction.clickedBy.splice(clickedIndex, 1);
        else reaction.clickedBy.push(currentUserHash);
        if (reaction.clickedBy.length === 0) delete reactions[key];
        else reactions[key] = { emoji: reaction.emoji || emoji, clickedBy: reaction.clickedBy };
        db.update(alerts)
          .set({ reactionsJson: JSON.stringify(reactions) })
          .where(and(eq(alerts.roomShortCode, requireRoomShortCode(locals)), eq(alerts.id, id)))
          .run();
        return { success: true, reactions };
      }

      const message = db
        .select()
        .from(messages)
        .where(and(eq(messages.roomShortCode, requireRoomShortCode(locals)), eq(messages.id, id)))
        .get();
      if (!message) return fail(404, { message: 'Message not found.' });
      const reactions = parseReactions(message.reactionsJson);
      const reaction = reactions[key] ?? { emoji, clickedBy: [] };
      const clickedIndex = reaction.clickedBy.indexOf(currentUserHash);
      if (clickedIndex >= 0) reaction.clickedBy.splice(clickedIndex, 1);
      else reaction.clickedBy.push(currentUserHash);
      if (reaction.clickedBy.length === 0) delete reactions[key];
      else reactions[key] = { emoji: reaction.emoji || emoji, clickedBy: reaction.clickedBy };
      db.update(messages)
        .set({ reactionsJson: JSON.stringify(reactions) })
        .where(and(eq(messages.roomShortCode, requireRoomShortCode(locals)), eq(messages.id, id)))
        .run();
      return { success: true, reactions };
    }

    if (operation === 'edit') {
      /*
        RICH TEXT on the edit path — `editChatMessage` with `newMsg` set to the editor's content.

        Sanitised here and derived here, exactly as the post path above does it, and for the same
        reason: the submitted value is never what gets stored.

        CHAT ONLY. The reference's rich edit branch is inside `if ("chat" === this.logType)`, the
        alerts table has no such column, and an alert edited through the presenter's prompt is
        plain text. Reading the field for an alert would be accepting input nothing can store.

        AND IT ALWAYS REWRITES BOTH COLUMNS. A chat edit sets `body_html` to the sanitised HTML or
        to NULL — never "leave whatever was there". Otherwise editing a rich message through the
        PLAIN prompt (which is what happens when the owner has since turned the editor off) would
        write a new `body` and leave the old markup behind, and the renderer picks the column: the
        message would keep displaying the sentence it no longer says.
      */
      const submittedHtml = kind === 'chat' ? String(data.get('newBodyHtml') ?? '').trim() : '';
      const sanitizedHtml = submittedHtml ? sanitizeChatHtml(submittedHtml) : '';
      const newBodyHtml = sanitizedHtml && !isEmptyChatHtml(sanitizedHtml) ? sanitizedHtml : null;

      const newBody = newBodyHtml
        ? newBodyHtml
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .trim()
        : String(data.get('newBody') ?? '').trim();
      if (!newBody) return fail(400, { message: 'A message is required.' });

      // Captured items, under the same rules the real branches apply below: an alert is
      // presenter-only, a chat message is the author's or a presenter's unless it is an admin
      // message.
      if (id < 0) {
        if (!captured) return fail(404, { message: 'Message not found.' });
        if (kind === 'alert') {
          if (!isPresenter) return fail(403);
        } else {
          const isOwner = captured.senderId === requireUser(locals).id;
          if (!isOwner && (!isPresenter || captured.isAdmin)) return fail(403);
        }
        recordOverride(captured.evidenceKey, { body: newBody });
        return { success: true };
      }

      if (kind === 'alert') {
        if (!isPresenter) return fail(403);
        const alert = db
          .select()
          .from(alerts)
          .where(and(eq(alerts.roomShortCode, requireRoomShortCode(locals)), eq(alerts.id, id)))
          .get();
        if (!alert) return fail(404, { message: 'Alert not found.' });
        db.update(alerts)
          .set({ body: newBody })
          .where(and(eq(alerts.roomShortCode, requireRoomShortCode(locals)), eq(alerts.id, id)))
          .run();
        return { success: true };
      }

      const message = db
        .select()
        .from(messages)
        .where(and(eq(messages.roomShortCode, requireRoomShortCode(locals)), eq(messages.id, id)))
        .get();
      if (!message) return fail(404, { message: 'Message not found.' });
      const isOwner = message.senderId === requireUser(locals).id;
      if (!isOwner && (!isPresenter || message.isAdmin)) return fail(403);
      db.update(messages)
        .set({ body: newBody, bodyHtml: newBodyHtml })
        .where(and(eq(messages.roomShortCode, requireRoomShortCode(locals)), eq(messages.id, id)))
        .run();
      return { success: true };
    }

    if (!isPresenter) return fail(403);

    if (operation === 'markAnswered' && kind === 'chat') {
      // Presenter-only already, by the guard above.
      if (id < 0) {
        if (!captured) return fail(404, { message: 'Message not found.' });
        recordOverride(captured.evidenceKey, { answered: true });
        return { success: true };
      }
      db.update(messages)
        .set({ answered: true })
        .where(and(eq(messages.roomShortCode, requireRoomShortCode(locals)), eq(messages.id, id)))
        .run();
      return { success: true };
    }

    if (operation === 'mute24') {
      const targetUserId = Number(data.get('targetUserId'));
      if (!Number.isInteger(targetUserId)) {
        return fail(400, { message: 'A target user ID is required.' });
      }
      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
      db.insert(chatMutes)
        .values({
          /*
            A mute is granted in the room it was issued in. The controller models the same thing as
            role 3 CHAT MUTED on a `room_users` membership, which is per room — muting somebody
            here must not silence them in a room this presenter has no authority over.
          */
          roomShortCode: requireRoomShortCode(locals),
          targetUserId,
          mutedByUserId: requireUser(locals).id,
          expiresAt,
          createdAt
        })
        .run();
      return { success: true };
    }

    if (operation === 'showMsgToAll') {
      return { success: true };
    }

    return fail(400, { message: 'Unsupported message operation.' });
  },

  saveTheme: async ({ request, locals }) => {
    ensureDatabase();
    const data = await request.formData();
    const theme = data.get('theme') === 'dark' ? 'dark' : 'light';

    db.update(userSettings)
      .set({ theme, updatedAt: new Date() })
      .where(eq(userSettings.userId, requireUser(locals).id))
      .run();

    return { success: true };
  },

  savePreference: async ({ request, locals }) => {
    ensureDatabase();
    const data = await request.formData();
    const key = String(data.get('key') ?? '').trim();
    const rawValue = String(data.get('value') ?? 'null');
    if (!key) return fail(400, { message: 'A preference key is required.' });

    let value: unknown;
    try {
      value = JSON.parse(rawValue);
    } catch {
      return fail(400, { message: 'The preference value must be valid JSON.' });
    }

    const current = db
      .select({ settingsJson: userSettings.settingsJson })
      .from(userSettings)
      .where(eq(userSettings.userId, requireUser(locals).id))
      .get();
    let settings: Record<string, unknown> = {};
    try {
      const parsed: unknown = JSON.parse(current?.settingsJson ?? '{}');
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        settings = parsed as Record<string, unknown>;
      }
    } catch {
      settings = {};
    }
    settings[key] = value;
    /*
      Remove what the old element-id fallback wrote, on the way past.

      `updateSettingCheck` used to persist `preferenceKeyByInputId[input.id] ?? input.id`, so
      nineteen HTML ids went into this blob as if they were preferences and nothing ever read them
      back. Deleting the write does not delete what was written: every account that has opened the
      settings modal is carrying some of them.

      Here rather than in a migration, because this action already parses and rewrites the whole
      blob — the prune is free, it needs no downtime, and it cannot half-apply. It is idempotent, so
      an account converges on its next preference change and a converged one pays nothing. The list
      is a deny-list for the reason `dead-preference-keys.ts` sets out: an allow-list would delete
      the next preference somebody adds without updating it.
    */
    pruneDeadPreferenceKeys(settings);

    db.update(userSettings)
      .set({ settingsJson: JSON.stringify(settings), updatedAt: new Date() })
      .where(eq(userSettings.userId, requireUser(locals).id))
      .run();

    return { success: true };
  }
};
