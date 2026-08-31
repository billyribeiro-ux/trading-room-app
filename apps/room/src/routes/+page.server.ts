// `fail` is gone, and so is every form action: this file exports a load and nothing else. Each
// mutation is a remote command now, and a command's refusal is `error(…)` — a rejected promise the
// caller can see — not a value it may ignore. See the block at the foot of the file for where each
// action went, and why the last one was deleted rather than moved.
import { and, asc, desc, eq, gt } from 'drizzle-orm';
// `isEmptyChatHtml` and `sanitizeChatHtml` left with the two paths that sanitise — `sendMessage` in
// `chat-messages.remote.ts` and the edit branch in `message-actions.remote.ts`.
// `pruneDeadPreferenceKeys` left with `savePreference` for `user-settings.remote.ts`; the browser
// half went to `mirrorPreferenceToLocalStorage`, beside the list it evicts.
import { calculatePollTotals, parsePollChoices } from '#lib/poll-behavior.js';
// The six note-command schemas left with the commands they validate, for
// `session-notes.remote.ts`. `#lib/notes-command.ts` is still their home and still carries the
// captured `{cmd, data}` envelope and its own test; nothing in this file parses one any more.
import { db, ensureDatabase } from '#lib/server/db/index.js';
// `isPresenterRole` left with the gates that call it — `notesRoom`, `swingAlertsRoom` and
// `dayTradeAlertsRoom` in the three new `.remote.ts` modules, and `presenterRoom` in `auth.ts` for
// the rest. Nothing in this file decides authority any more; the load reports it.
import { logout, requireRoomShortCode, requireSessionId, requireUser } from '#lib/server/auth.js';
import { redirectSignedOut } from '#lib/server/control-plane.js';
import {
  CAPTURE_REFERENCE_ROOM,
  capturedRoomItems,
  noCapturedRoomItems
} from '#lib/server/captured-room.js';
import { hashEmail, publicSessionHandle } from '#lib/server/connection.js';
// `MAX_CHAT_LOG_PAGE`, `isChatChannel` and `loadChatPage` left with the paging queries for
// `log-pages.remote.ts`. What stays is the FIRST page, which the loader still sends with the room.
import { loadNewestChatPages } from '#lib/server/chat-log.js';
import { memberChatChannels } from '#lib/server/chat-channels.js';
import { loadAlertPage, loadQuestionsForAlerts } from '#lib/server/alert-log.js';
// `isChatMode` left with `changeChatMode` for `chat-mode.remote.ts`, where it is `z.enum(CHAT_MODES)`.
import { parseReactions } from '#lib/server/reactions.js';
// `requestMobilePin` left with `getMyMobilePin` for `mobile-pin.remote.ts`; this file no longer calls it.
// `writeRoomSetting` and `alertSoundCommandValue` left with `overwriteCashRegisterSound` for
// `files-pane.remote.ts`; nothing else in this file writes a room setting.
// `checkWelcomeMatPasswordRemotely` left with `setWelcomeMatNoteTab` for
// `session-notes.remote.ts`, which is the only caller it ever had.
import { readRoomConfig, requestStreamReadToken } from '#lib/server/room-config-client.js';
import { memberDeniedArchives } from '#lib/roster-gates.js';
import { isBannedFromRoom, isShutOutByRoomState, roomRoleFor } from '#lib/server/room-role.js';
// `consumeRateLimit` left with the two trade-alert creates, which were the last writers in this
// file to spend the `alert` bucket. `post-alert.remote.ts` and the two new alert modules share it.
import { mediaSignallingUrl } from '#lib/server/media-grant.js';
// `publishToUsers` left with the private-message commands for `private-chat.remote.ts`, and
// `publishToRoom` followed it on 2026-08-30: the last three publishes in this file were
// `updatedSessionNote` and the two trade-alert feed mirrors, and all three left with their commands.
// This file now READS the room and announces nothing.
// `grantMediaElevation` / `revokeMediaElevation` left with `giveMicScreen` for
// `presenter-commands.remote.ts`; nothing else in this file elevates anybody.
// `deleteStoredFile` and `storeUpload` left with the Files-pane commands; nothing here stores a
// file any more.
// `deleteThread`, `insertPrivateMessage`, `loadThread` and `searchThread` left with the trio for
// `private-chat.remote.ts`. What stays is the CONVERSATION LIST, which the loader still sends.
import { loadConversations } from '#lib/server/private-chat.js';

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
// `createNote`, `deleteNote`, `renameNote`, `restoreNoteVersion`, `saveNote`, `setWelcomeMatNote`
// and `setWelcomeMatNoteEverywhere` left with the six commands for `session-notes.remote.ts`. What
// stays is the READ, which the loader still sends with the room.
import { getNotes } from '#lib/server/notes-repository.js';
// The three Swing mutations and their schemas left for `swing-alerts.remote.ts`, where the
// entitlement is re-asked on every write. What stays is the READ, plus `swingAlertsTabVisible` —
// the load tells the page whether to draw the tab at all, and it is the same setting read from the
// same config, deliberately: a tab drawn against one answer and a write refused against another is
// how the two get to disagree.
import { getSwingAlerts } from '#lib/server/swing-alerts-repository.js';
import { SWING_ALERT_INITIAL_DAYS, swingAlertsTabVisible } from '#lib/swing-alerts.js';
// The three Day Trade mutations and their schemas left for `day-trade-alerts.remote.ts`, the same
// way and for the same reason as their Swing twins. What stays is the READ and the tab gate.
import { getDayTradeAlerts } from '#lib/server/day-trade-alerts-repository.js';
import { DAY_TRADE_ALERT_INITIAL_DAYS, dayTradeAlertsTabVisible } from '#lib/day-trade-alerts.js';
import {
  capturedItemOverrides,
  chatMutes,
  presenterColors,
  roomState,
  hiddenRoomItems,
  pollAnswers,
  polls,
  savedPolls,
  sharedFiles,
  users,
  userSettings
} from '#lib/server/db/schema.js';
// `isChatTab` left with `sendMessage` for `chat-messages.remote.ts`; the loader reads the channel
// from the row, not from a request.
import type { ActivePoll } from '#lib/types.js';

/*
  Body caps. The adapter's request-size limit already stops a multi-megabyte upload, but a
  half-megabyte "chat message" is still absurd: it is stored forever and re-sent to every
  reader on every five-second poll.
*/
// `MAX_MESSAGE_BODY` and `MAX_ALERT_BODY` left for `#lib/message-bounds.ts`, which exists because a
// `.remote.ts` file cannot export a constant and three commands across two modules need them.
import type { PageServerLoad } from './$types';

/*
  `refuseSwingAlert`, `refuseDayTradeAlert`, `swingAlertFieldsFrom` and `dayTradeAlertFieldsFrom`
  left with the six mutations they served.

  The two GUARDS are `swingAlertsRoom` and `dayTradeAlertsRoom` in the two `.remote.ts` modules,
  still two functions rather than one taking a predicate, and still asking the cheap question first.
  The two READERS became one `draftFrom` at the client edge, because a command's payload arrives as
  a typed object rather than as a `FormData` — see `lib/room/trade-alerts.svelte.ts`, which records
  why a missing field is now a loud refusal instead of `?? ''`.

  Their long docblocks went with them rather than being summarised here. The one thing worth leaving
  behind is the reason the two guards were never merged: the entitlement each consults is a
  DIFFERENT room setting, so a shared guard taking a predicate would be one place where turning
  Swing off could be made to turn Day Trade off too.
*/

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

    `/session` writes it once, at entry. `presenterRoom()` then authorises every presenter-gated call
    against it, reading the field written four lines below — and a session can be open for hours.
    Without this, an owner demoting somebody in the controller changes nothing until that person
    re-enters the room: they keep Archives, alerts, polls and every presenter command meanwhile.

    This said "Seventeen server actions then authorise against it" until 2026-08-31, by which time
    this file exported NONE — every one was a remote function (row AG). A count in prose beside the
    thing it counts is the copy nobody updates, so there is none here now.

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
    redirectSignedOut();
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
    `#lib/server/chat-log.ts` for why a bare LIMIT would have been worse than the bug.
  */
  /*
    THE CHANNELS THIS MEMBER MAY READ, resolved before a single row is selected.

    `chatTabsWithBadges` makes a chat channel an entitlement, so the set is per room AND per member.
    Reading a fixed list here would have put a private channel's messages into every member's page
    payload — SSR HTML included — with the client filtering them for display, which is not a filter,
    it is a leak with a rendering step after it. `#lib/chat-tabs.ts` has the rule; this is the read.
  */
  const chatChannels = await memberChatChannels(request, requireRoomShortCode(locals), {
    email: requireUser(locals).email,
    role: requireUser(locals).role
  });

  const messageRows = loadNewestChatPages(requireRoomShortCode(locals), chatChannels);

  /*
    THE NEWEST PAGE, not every alert the room has ever posted.

    The same defect the chat log had and the same cure — see `#lib/server/alert-log.ts`. Older
    pages come from `loadOlderAlerts` and are held in client state, so an `invalidateAll()` cannot
    throw away what a reader scrolled back to.
  */
  const alertRows = loadAlertPage(requireRoomShortCode(locals));

  /*
    THE THIRD UNBOUNDED READ, and the last one — moved to `alert-log.ts` 2026-08-15 along with the
    reasoning, because the module that owns how alerts are PAGED is the one that owns what bounds
    their questions.
  */
  const questionRows = loadQuestionsForAlerts(requireRoomShortCode(locals), [
    /*
      CAPTURED ALERT IDS TRAVEL TOO, added 2026-08-28.

      `askQuestion` accepts a negative alert id — it resolves the fixture through `capturedRoomItem`
      and writes a real row — so a captured alert can have questions. This list used to hold only
      `alertRows`, and `loadQuestionsForAlerts` used to reach its room by joining `alerts`, so those
      rows were dropped twice over: absent from the id list, and unjoinable if they had been in it.
      A member asking a question on a captured alert got no error and an empty thread.

      Filtered by `isVisible` for the same reason the merge below is: an alert hidden in this room
      does not get to bring its questions back.
    */
    ...capturedRoom.alerts.filter(isVisible).map((alert) => alert.id),
    ...alertRows.map((alert) => alert.id)
  ]);

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
    /*
      What a member is told when the room is closed, so the presenter's editor opens on what is
      actually stored rather than on an empty box.

      `''` and not `null` for the CLIENT, because a textarea binds to a string; the distinction
      between "never written" and "cleared" is the column's job and the refusal's, not the editor's.
      Room state, so it comes from the row — every other reader of this value is on the server.
    */
    closedMessage:
      db
        .select({ closedMessage: roomState.closedMessage })
        .from(roomState)
        .where(eq(roomState.roomShortCode, requireRoomShortCode(locals)))
        .get()?.closedMessage ?? '',
    /*
      Every presenter's message colours for this room, as a map keyed by the sender's email hash —
      the shape the renderer looks a message up in, so no per-message query and no per-message
      allocation. `presenter-colors.ts` holds the feature; the read is here because it is room
      state, exactly like `chatMode` above, and for the same reason: a client that asserted these
      would be asserting how OTHER people's messages look.

      Bounded by the number of presenters in the room, not by its history — the composite primary
      key's leading column is the filter, so this is an index range scan over a handful of rows
      however long the room has been running. That is the question `CLAUDE.md` asks of a new read
      path, and it is why this is a table rather than the reference's JSON blob.
    */
    presenterColors: Object.fromEntries(
      db
        .select({
          senderEmailHash: presenterColors.senderEmailHash,
          color: presenterColors.textColor,
          bgColor: presenterColors.backgroundColor
        })
        .from(presenterColors)
        .where(eq(presenterColors.roomShortCode, requireRoomShortCode(locals)))
        .all()
        .map(({ senderEmailHash, color, bgColor }) => [senderEmailHash, { color, bgColor }])
    ),
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
    /** The tab strip, in the order it is drawn — resolved above. `#lib/chat-tabs.ts` has the rest. */
    chatTabs: chatChannels,
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
    /**
     * `loadTradeAlerts("Swing")` — the log, fetched with the page as the reference fetches it on
     * session load.
     *
     * Gated on the SAME room setting that gates the tab, so a room without the entitlement does not
     * read the table, does not serialise a log into its SSR HTML, and cannot have one recovered
     * from `__sveltekit` data by a member who edits the DOM. `loadSessionLogs()` gates its own
     * fetch identically: `sessData.hasSwingTradeAlerts && this.loadTradeAlerts("Swing")`.
     *
     * **42 days, not `30 * swingAlertMonths`.** The first fetch hardcodes `days: 42` while the
     * select that describes the window initialises to 2 and would ask for 60, so the first list is
     * 42 days of data under a label reading "Last 2 Months". That mismatch is the reference's, read
     * from three separate places, and changing the select once reconciles them. Reproduced rather
     * than corrected — see `SWING_ALERT_INITIAL_DAYS`.
     */
    swingAlerts: swingAlertsTabVisible(roomConfig.settings)
      ? getSwingAlerts(requireRoomShortCode(locals), SWING_ALERT_INITIAL_DAYS, new Date())
      : [],
    /**
     * `loadTradeAlerts("DayTrade")` — the log, fetched with the page as the reference fetches it on
     * session load.
     *
     * Gated on the SAME room setting that gates the tab, so a room without the entitlement does not
     * read the table, does not serialise a log into its SSR HTML, and cannot have one recovered
     * from `__sveltekit` data by a member who edits the DOM. `loadSessionLogs()` gates its own
     * fetch identically, on the line immediately after the Swing one (byte 1,009,503):
     * `sessData.hasDayTradeAlerts && this.loadTradeAlerts("DayTrade")`.
     *
     * **21 days, not 42 and not `4 * dayTradeAlertMonths * 7`.** `loadTradeAlerts` builds
     * `{ sessionID, days: 21 }` and then overrides it only for Swing — 21 is the DEFAULT and 42 is
     * the special case, which is the opposite of what the sibling feature makes you expect. With
     * the select initialising to 1 month the dropdown would ask for 28, so the first list is 21
     * days of data under a label reading "Last 1 Months". That mismatch is the reference's and
     * changing the select once reconciles it. Reproduced rather than corrected — see
     * `DAY_TRADE_ALERT_INITIAL_DAYS`.
     */
    dayTradeAlerts: dayTradeAlertsTabVisible(roomConfig.settings)
      ? getDayTradeAlerts(requireRoomShortCode(locals), DAY_TRADE_ALERT_INITIAL_DAYS, new Date())
      : [],
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
    /**
     * "Play chat message sound for" — the member hashes an arriving message is checked against.
     *
     * Hashes and never addresses: the setting holds raw emails and does not cross at all. See
     * `RoomConfig.chatSoundForEmailHashes` for why the derivation is the controller's job.
     */
    chatSoundForEmailHashes: roomConfig.chatSoundForEmailHashes ?? [],
    /** Settings the owner is enforcing. A locked control must not render as a flippable toggle. */
    lockedSettings: roomConfig.locked,
    /** This room, as the controller describes it. */
    room: roomConfig.room
  };
};

/*
  ── THIS FILE EXPORTS NO FORM ACTIONS, and the notes below are what used to be here ─────────────

  `logout` was the last one and it was DELETED on 2026-08-30, not converted: nothing could reach it.
  `routes/logout/+page.svelte` posts a form with no `action`, so it reaches its OWN route's
  `default`, whose body was byte-identical. The full argument and both halves of the guard are in
  `remote-call-sites-contract.test.ts`, which is what enforces it.

  `logout` and `redirectSignedOut` are still IMPORTED here, and that is not left-over: the load
  signs a banned or shut-out member out before redirecting. That is a load, not an action.

  The rest of this block records where each action went, because a reader who greps this file for a
  name they remember should find out where it lives rather than nothing at all.
*/
/*
  THE SIX SESSION-NOTE ACTIONS left together for `src/routes/session-notes.remote.ts`.

  `newSessionNoteTab`, `saveSessionNote`, `restoreNoteVersion`, `renameSessionNoteTab`,
  `deleteSessionNoteTab` and `setWelcomeMatNoteTab` were reached by `RoomNotes.submitMutation` —
  ``fetch(`?/${action}`)`` over a six-member union, with a hand-built `FormData` body and a
  `deserialize()` of the response. Nothing connected the endpoint to the action it named, which is
  the `presenterCommand` failure in its least visible form.

  ONE module for all six, because they share the gate exactly: presenter, and the caller's own
  room, with the room taken from the session and never from an argument. What they do not share is
  the SENTENCE each refusal carries — *"You cannot create session notes."* against *"…edit…"*,
  *"…rename…"*, *"…delete…"*, *"…restore…"* and *"You cannot change the welcome mat."* — so the
  gate there is a small local helper that takes the verb rather than `presenterRoom()`. It keeps
  the property that matters: the room is returned only after the role check, so "may they" and
  "which room" cannot be applied separately.

  Three things at the BOUNDARY changed, and none of them is a move:

    - `Number(formData.get('noteId'))` is gone. It produced `NaN` for `'abc'`, which the schema
      then refused as a `fail(400)`; there is no coercion step now, so a non-number is refused as
      a number.
    - `String(formData.get('allRooms')) === 'true'` is gone. `allRooms` crosses as a real boolean.
    - `fail(…)` became `error(…)`, because `fail` returns a value only a form action's caller
      understands and a command has no such caller.

  THE SCHEMAS DID NOT MOVE. `#lib/notes-command.ts` still holds one `strictObject` per command,
  transcribed from the captured `{cmd, data}` envelope and tested by `notes-command.test.ts`; each
  command validates with that schema's `.shape.data`, so every bound is declared exactly once and
  the envelope keeps its own test.

  `notes-account-action-contract.test.ts` and `note-update-broadcast-contract.test.ts` were
  rewritten onto `callRemote` rather than re-pointed as text — including the `updatedSessionNote`
  frame, which is now proven by a real subscriber on the room instead of by reading the source.
*/
/*
  THE SIX TRADE ALERT ACTIONS left for TWO modules: `src/routes/swing-alerts.remote.ts` and
  `src/routes/day-trade-alerts.remote.ts`.

  `swingAlertMsg`, `editSwingAlertMsg`, `deleteSwingAlertMsg`, `dayTradeAlertMsg`,
  `editDayTradeAlertMsg` and `deleteDayTradeAlertMsg` were reached by ONE dispatcher — the generic
  `RoomTradeAlerts.submit(action, values)`, instantiated twice, posting ``fetch(`?/${action}`)``
  over two exported type aliases. One `fetch`, two unions, six names assembled at runtime and
  connected to nothing that could check them.

  TWO modules and not one, split on the GATE — which is the same reason `refuseSwingAlert` and
  `refuseDayTradeAlert` stood here as two functions with the same shape rather than one taking a
  predicate. The entitlement each consults is a DIFFERENT room setting and the sentence each
  refuses with names a different feature; a shared guard would be one place where turning Swing
  off could be made to turn Day Trade off too. Both readers left with their own module, and both
  kept the cost order the docblocks argued for: the role check is a field read on a row already in
  memory, the entitlement is a controller call with a two-second timeout, so the cheap question is
  asked first and a controller outage cannot be used to probe for the feature.

  `swingAlertFieldsFrom` and `dayTradeAlertFieldsFrom` went too, and they went to the CLIENT edge
  rather than to the server modules: `draftFrom` in `lib/room/trade-alerts.svelte.ts` is what reads
  the six fields off a composer's payload now, because the values arrive as a typed object rather
  than as a `FormData`. Their rule travelled unchanged — no coercion, no trimming, the schema
  decides — and the one thing that changed is that a MISSING field is now a loud refusal instead of
  `?? ''` producing a value the server would reject a round trip later.

  Three things at the BOUNDARY changed, and none of them is a move:

    - `Number(formData.get('swingAlertID'))` and `String(formData.get('symbol') ?? '')` are gone.
      The ids cross as numbers and the fields as strings, and `direction` crosses as its own union
      rather than as `string`.
    - `fail(…)` became `error(…)`, because `fail` returns a value only a form action's caller
      understands and a command has no such caller. The visible effect is that the pane's own
      `catch` now shows what the SERVER said — *"That swing alert was not found."*, *"Swing Trade
      Alerts are not enabled for this room."*, the 429 — where `submit` used to flatten all of
      them into `'Unable to save.'`.
    - the schemas did NOT move: `#lib/swing-alerts-command.ts` and `#lib/day-trade-alerts-command.ts`
      still hold the captured `{cmd, data}` envelopes and their own tests, and each command
      validates with that schema's `.shape.data`.

  `swing-alerts-contract.test.ts` and `day-trade-alerts-contract.test.ts` had assertions that read
  THIS FILE for `\n  <command>: async ({ request, locals }) => {`. Those were rewritten onto
  `callRemote` rather than re-pointed at the new modules — a text assertion about where an action
  lives proves nothing about whether it runs, and re-pointing one is how it starts passing for the
  wrong reason.
*/
/*
  `editUsername` left for `src/routes/username.remote.ts` — a module of ONE, deliberately not
  folded in with the settings writes beside it. Those name nobody; this takes a `userId` and can
  rename any account when the caller is a presenter, so it is split on the GATE.

  The whole dead-`'user'`-role story went with it, along with the positive restatement that
  replaced it. New at the boundary: `z.number().int().positive()` also refuses 0 and negatives,
  where `Number.isInteger` let them through to match no row and report success; and
  `displayName` gained a 200-character bound it never had.
*/

/*
  `sendMessage` and `replyMessage` left together for `src/routes/chat-messages.remote.ts`;
  `askQuestion` for `src/routes/alert-questions.remote.ts`; `postAlert` for
  `src/routes/post-alert.remote.ts`. Three modules for four commands, split on the GATE: chat and
  replies are open to any member of the room, asking a question is too, posting an alert is
  presenter-only — and a presenter-only function living among open ones is how a gate drifts.

  READING THE TWO CHAT PATHS SIDE BY SIDE IS WHAT MADE THIS WORTH DOING. Eighty lines apart they
  had drifted three ways, and every one of them is a fix rather than a move:

    1. THE MUTE APPLIED TO ONE OF THEM. `sendMessage` refused while a live `chat_mutes` row
       existed; `replyMessage` never looked. A muted member could not send and could reply, into
       the same log — so `mute24`, a control that says it stops somebody posting for a day, did
       not. Both call `refuseIfMuted` now. **A muted member who could previously reply cannot.**
    2. THE LENGTH BOUND APPLIED TO ONE OF THEM. `MAX_MESSAGE_BODY` was checked on send and not on
       reply, and `askQuestion` had no bound at all. All three are bounded now, from
       `#lib/message-bounds.ts` — which exists because a `.remote.ts` file cannot export a
       constant, so the alternative was the same number written three times.
    3. The rate limit and the `chat` publish were written out verbatim twice. Declared once.

  `MAX_MESSAGE_BODY` and `MAX_ALERT_BODY` were declared at the top of this file and went with
  them. `sendMessage`'s hand-written html-to-text derivation became `stripHtmlToText` — the same
  function the composer's optimistic copy already used, whose docstring said "the two must agree"
  and had no way to enforce it.
*/

/*
  TWO form actions WERE here and are gone, and both left their docblocks behind.

  `remotePresCommand` moved to `presenter-commands.remote.ts` as `presenterCommand` on 2026-08-15.
  `forceReload` followed it on 2026-08-23: it had ZERO call sites — both ends shipped and nothing
  joined them — and is now reached by the "Force Reload" button that used to raise a fixed alert
  and send nothing. Removing it took the actions export from nineteen to eighteen.

  `remotePresCommand`'s own docblock outlived it here by eleven days; that lesson now lives where it
  is enforced, in `orphaned-comment-contract`, which walks all of `src`. Its content moved with it —
  the enum to `presenterCommand`, the peer-side mapping to `revokePermission` in `ModalHost.svelte`.
*/

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
/*
  `giveMicScreen` left for `src/routes/presenter-commands.remote.ts`, beside `presenterCommand`
  and `focusOnScreen` — same gate, same `cmds` channel, same room scope. The media-elevation row
  and the reason it is written on the server went with it unchanged.

  IT WAS THE TWELFTH CALL SITE AND IT WAS NOT IN `+page.svelte`. Neither was `presenterCommand`'s,
  and that one was a LIVE DEFECT: `presenterCommand`'s action was removed on 2026-08-15 while
  `ModalHost.svelte` went on posting `fetch('?/presenterCommand')` to an action that no longer
  existed, so revoking a member's mic or camera from the user-info modal did nothing for three
  commits. Found by grepping the whole of `src/` rather than the one file being edited — which is
  what should have happened the first time.
*/

/*
  THE FIVE POLL ACTIONS left together for `src/routes/polls.remote.ts`, and they left as a set.

  `savePoll`, `deleteSavedPoll`, `sendPoll`, `sendPollAnswer` and `pollDone` were the last actions
  in this file reached by a DYNAMIC dispatcher: `RoomModals.submitPollAction` built its endpoint as
  ``fetch(`?/${action}`)`` over a five-member union, so no compiler, search or build connected any
  of these five names to the call site that produced it. That is the failure `presenterCommand`
  already had once, in its least visible form.

  Four are presenter-only and `sendPollAnswer` is not, which is normally the split this repository
  makes — and deliberately is not here. The fifth is the OTHER SIDE of the same object: its range
  check is `choices.length` of the row `sendPoll` inserted, and the "one active poll per room"
  predicate is read by both. That predicate was written twice once already and BOTH copies were
  unscoped, so a member's vote resolved whichever poll was open anywhere on the deployment. Keeping
  every reader of it in one module is what stops one copy being fixed and the other not.

  Three things at the BOUNDARY changed, and none of them is a move:

    - `choices` crosses as a REAL ARRAY. The browser `JSON.stringify`d it and the server re-parsed
      it with `parsePollChoices`, so "not an array of strings" was a runtime string parse whose
      `null` became a hand-written `fail(400)`. devalue carries the array, so that failure mode is
      gone rather than relocated. `parsePollChoices` stays in this file for the LOAD, which reads
      `choicesJson` back out of the database and has always needed it.
    - `pollId` became `z.number().int().positive()`, which also refuses 0 and negatives where
      `Number.isInteger` let them through to match no row and report success.
    - the question and the choices gained LENGTH BOUNDS they never had — see `#lib/poll-command.ts`,
      which records why they are set far above anything the composer can produce.

  `poll-actions-contract.test.ts` was rewritten onto `callRemote` rather than re-pointed as text,
  including the `gotPollAnswer` publish that sat after a `return` and never ran.
*/

/*
  `messageAction` left for `src/routes/message-actions.remote.ts` — 314 lines and six operations,
  the largest single thing in this file.

  ONE command and not six. The six share the room scope, the captured-fixture resolution, the
  override upsert and the presenter-or-author rule; split six ways those become six copies, which
  is exactly how `sendMessage` and `replyMessage` drifted apart. What they do NOT share is their
  argument shape, and as a form action that was invisible — every field was an optional string, so
  `delete` sent a `targetUserId` nothing read and `edit` sent none at all.
  `z.discriminatedUnion('operation', …)` gives each one its own fields and refuses the rest.

  Three tightenings went with it, none of them a move:
    - `kind` is `z.enum(['alert', 'chat'])`. It was a bare string compared with `kind === 'alert'`,
      so every other value — a typo, the empty string — fell through to the chat branch.
    - `mute24`'s `targetUserId` is `.positive()`; `Number.isInteger` let 0 and negatives through.
    - the edit path is bounded by `MAX_MESSAGE_BODY`, which it never was.

  `mute24` and `unmuteChat` are now the only pair left split across two files, and the note below
  is why that is recorded rather than left to be searched for.
*/

/*
  `unmuteChat` was an action here and is now `src/routes/chat-mute.remote.ts` — the first remote
  function in this application. The DATABASE half is unchanged and carried across intact: the same
  single conditional DELETE, the same room scope, the same live-mutes-only clause, the same
  per-user `privCmds` publish, and the reasoning for each.

  Three things at the BOUNDARY did change, and are named here so nobody reads "moved" as "identical":
  `Number.isInteger` became a zod schema (which also refuses 0 and negatives, where the old guard
  let them through to match nothing); `fail(400)` became the schema's own rejection; and `fail(403)`
  became `error(403)`, because `fail` returns a value only a form action's caller understands and a
  command has no such caller.

  What the move bought is that boundary. As an action it was reached by `fetch('?/unmuteChat')` with
  a hand-built `FormData`, so the endpoint name, the argument's type and the meaning of a failure
  were all agreements nothing checked. This note is left here because `mute24` is still in this file
  and the pair should not have to be searched for.
*/

/*
  `saveTheme` and `savePreference` left together for `src/routes/user-settings.remote.ts` — one
  module because they share the only gate either has: the row written is always the CALLER's, with
  no target on the argument.

  Two changes that are not moves, and both are stated there at length:

    - `saveTheme` refuses an unrecognised value where this read
      `data.get('theme') === 'dark' ? 'dark' : 'light'` and silently made everything else `light`.
    - `savePreference`'s value crosses as a VALUE. The client stringified, this parsed inside a
      `try`, and an unparseable string was a `fail(400)`. devalue carries the real value and
      `z.json()` is the schema for exactly what the blob can store — so the failure mode is gone
      rather than relocated. `key` also gained a 100-character bound, because this blob is parsed
      and rewritten on every preference write.
*/
