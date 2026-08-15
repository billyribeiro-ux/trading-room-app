import { fail } from '@sveltejs/kit';
import { and, asc, desc, eq, gt, isNull } from 'drizzle-orm';
import { isEmptyChatHtml, sanitizeChatHtml } from '$lib/server/chat-html';
// `pruneDeadPreferenceKeys` left with `savePreference` for `user-settings.remote.ts`; the browser
// half went to `mirrorPreferenceToLocalStorage`, beside the list it evicts.
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
import { redirectSignedOut } from '$lib/server/control-plane';
import {
  CAPTURE_REFERENCE_ROOM,
  capturedRoomItem,
  capturedRoomItems,
  noCapturedRoomItems
} from '$lib/server/captured-room';
import { hashEmail, publicSessionHandle } from '$lib/server/connection';
// `MAX_CHAT_LOG_PAGE`, `isChatChannel` and `loadChatPage` left with the paging queries for
// `log-pages.remote.ts`. What stays is the FIRST page, which the loader still sends with the room.
import { loadNewestChatPages } from '$lib/server/chat-log';
import { loadAlertPage } from '$lib/server/alert-log';
// `isChatMode` left with `changeChatMode` for `chat-mode.remote.ts`, where it is `z.enum(CHAT_MODES)`.
import { parseReactions } from '$lib/server/reactions';
// `requestMobilePin` left with `getMyMobilePin` for `mobile-pin.remote.ts`; this file no longer calls it.
// `writeRoomSetting` and `alertSoundCommandValue` left with `overwriteCashRegisterSound` for
// `files-pane.remote.ts`; nothing else in this file writes a room setting.
import { readRoomConfig, requestStreamReadToken } from '$lib/server/room-config-client';
import { memberDeniedArchives } from '$lib/roster-gates';
import { isBannedFromRoom, isShutOutByRoomState, roomRoleFor } from '$lib/server/room-role';
import { consumeRateLimit } from '$lib/server/rate-limit';
import { mediaSignallingUrl } from '$lib/server/media-grant';
import { publishToRoom } from '$lib/server/room-events';
import { grantMediaElevation, revokeMediaElevation } from '$lib/server/media-elevation';
// `deleteStoredFile` left with `deleteFile`. `storeUpload` stays: `uploadFile` is still a form
// action here, because it is submitted from a real `<form>` and degrades without JavaScript.
import { storeUpload } from '$lib/server/file-storage';
// `deleteThread`, `insertPrivateMessage`, `loadThread` and `searchThread` left with the trio for
// `private-chat.remote.ts`. What stays is the CONVERSATION LIST, which the loader still sends.
import { loadConversations } from '$lib/server/private-chat';

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
  createSwingAlert,
  deleteSwingAlert,
  editSwingAlert,
  getSwingAlerts
} from '$lib/server/swing-alerts-repository';
import {
  deleteSwingAlertMsgSchema,
  editSwingAlertMsgSchema,
  swingAlertMsgSchema
} from '$lib/swing-alerts-command';
import { SWING_ALERT_INITIAL_DAYS, swingAlertsTabVisible } from '$lib/swing-alerts';
import {
  createDayTradeAlert,
  deleteDayTradeAlert,
  editDayTradeAlert,
  getDayTradeAlerts
} from '$lib/server/day-trade-alerts-repository';
import {
  dayTradeAlertMsgSchema,
  deleteDayTradeAlertMsgSchema,
  editDayTradeAlertMsgSchema
} from '$lib/day-trade-alerts-command';
import { DAY_TRADE_ALERT_INITIAL_DAYS, dayTradeAlertsTabVisible } from '$lib/day-trade-alerts';
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

/**
 * The two gates every Swing Trade Alerts mutation passes, in cost order.
 *
 * Returns an `ActionFailure` to hand straight back, or `null` to proceed.
 *
 * **Presenter first, entitlement second.** The role check is a field read on a row already in
 * memory; the entitlement is a call to the controller with a two-second timeout. Asking the cheap
 * question first means a member who should never have reached this action does not cost a round
 * trip, and it means a controller outage cannot be used to probe for it.
 *
 * The entitlement is re-asked here rather than trusted from the page load, because the load ran
 * against a different request: a presenter whose owner turned the feature off mid-session must stop
 * being able to write, and this is the only place that can know. `readRoomConfig` throws when the
 * controller cannot be reached, which fails the action closed — the correct direction for a feature
 * switch, and the same behaviour the page load has.
 */
async function refuseSwingAlert(
  request: Request,
  locals: App.Locals,
  verb: string
): Promise<ReturnType<typeof fail> | null> {
  const user = requireUser(locals);
  if (!isPresenterRole(user.role)) {
    return fail(403, { message: `You cannot ${verb}.` });
  }
  const { settings } = await readRoomConfig(request, requireRoomShortCode(locals), user.email);
  if (!swingAlertsTabVisible(settings)) {
    // 404 rather than 403: in a room without the entitlement the feature does not exist, and
    // saying "forbidden" would confirm that it exists somewhere and this member is not allowed it.
    return fail(404, { message: 'Swing Trade Alerts are not enabled for this room.' });
  }
  return null;
}

/**
 * The six typed fields, read off the form untouched.
 *
 * No coercion and no defaulting beyond `''` for an absent field: the zod schema trims, bounds and
 * refuses, and doing any of that twice in two places is how the two get to disagree. In particular
 * the three price fields stay strings — they came from `type="text"` inputs and are rendered back
 * verbatim.
 */
function swingAlertFieldsFrom(formData: FormData) {
  return {
    symbol: String(formData.get('symbol') ?? ''),
    direction: String(formData.get('direction') ?? ''),
    entryPrice: String(formData.get('entryPrice') ?? ''),
    stop: String(formData.get('stop') ?? ''),
    target: String(formData.get('target') ?? ''),
    image: String(formData.get('image') ?? '')
  };
}

/**
 * The two gates every Day Trade Alerts mutation passes, in cost order.
 *
 * The port of {@link refuseSwingAlert}, and a SEPARATE function rather than a parameterised one:
 * the entitlement it consults is a different room setting, the message it returns names a different
 * feature, and a shared guard taking a predicate would be one place where turning Swing off could
 * be made to turn Day Trade off too.
 *
 * **Presenter first, entitlement second.** The role check is a field read on a row already in
 * memory; the entitlement is a call to the controller with a two-second timeout. Asking the cheap
 * question first means a member who should never have reached this action does not cost a round
 * trip, and it means a controller outage cannot be used to probe for it.
 *
 * The entitlement is re-asked here rather than trusted from the page load, because the load ran
 * against a different request: a presenter whose owner turned the feature off mid-session must stop
 * being able to write, and this is the only place that can know. `readRoomConfig` throws when the
 * controller cannot be reached, which fails the action closed — the correct direction for a feature
 * switch, and the same behaviour the page load has.
 */
async function refuseDayTradeAlert(
  request: Request,
  locals: App.Locals,
  verb: string
): Promise<ReturnType<typeof fail> | null> {
  const user = requireUser(locals);
  if (!isPresenterRole(user.role)) {
    return fail(403, { message: `You cannot ${verb}.` });
  }
  const { settings } = await readRoomConfig(request, requireRoomShortCode(locals), user.email);
  if (!dayTradeAlertsTabVisible(settings)) {
    // 404 rather than 403: in a room without the entitlement the feature does not exist, and
    // saying "forbidden" would confirm that it exists somewhere and this member is not allowed it.
    return fail(404, { message: 'Day Trade Alerts are not enabled for this room.' });
  }
  return null;
}

/**
 * The six typed fields, read off the form untouched.
 *
 * Identical in shape to `swingAlertFieldsFrom` and deliberately not shared with it: the two forms
 * post the same six field names today, and the day one of them gains a seventh is the day a shared
 * reader starts silently dropping it for the other. No coercion and no defaulting beyond `''` for
 * an absent field — the zod schema trims, bounds and refuses, and doing any of that twice in two
 * places is how the two get to disagree. In particular the three price fields stay strings: they
 * came from `type="text"` inputs and are rendered back verbatim.
 */
function dayTradeAlertFieldsFrom(formData: FormData) {
  return {
    symbol: String(formData.get('symbol') ?? ''),
    direction: String(formData.get('direction') ?? ''),
    entryPrice: String(formData.get('entryPrice') ?? ''),
    stop: String(formData.get('stop') ?? ''),
    target: String(formData.get('target') ?? ''),
    image: String(formData.get('image') ?? '')
  };
}

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
    redirectSignedOut();
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

  /*
    ── Swing Trade Alerts ──────────────────────────────────────────────────────────────────────

    The three mutations, named for the wire commands they reproduce — `swingAlertMsg`,
    `editSwingAlertMsg`, `deleteSwingAlertMsg`. `SWING_ALERT_COMMANDS` in `$lib/swing-alerts` holds
    those three plus the log read and the two feed-mirror commands, and
    `swing-alerts-contract.test.ts` asserts that the actions declared here still match it, because a
    renamed action is a 404 the browser reports only as "Unable to save".

    **Create is `swingAlertMsg`, never `newSwingAlertMsg`.** That name is a payload KEY on the edit
    command and, separately, the server→client push. Two independent decodes had to correct it.

    Every one of the three is gated twice and neither gate is the browser's: the room must have the
    entitlement, and the caller must be a presenter. A hidden form is not a check.
  */

  /**
   * `swingAlertMsg` — post a swing alert.
   *
   * Two writes, in one transaction: the row, and the mirrored message the reference also posts into
   * the main alerts feed with `alertMsg`. See `swing-alerts-repository.ts`.
   */
  swingAlertMsg: async ({ request, locals }) => {
    ensureDatabase();
    const user = requireUser(locals);
    const guard = await refuseSwingAlert(request, locals, 'post swing trade alerts');
    if (guard) return guard;

    /*
      The SAME bucket `postAlert` spends, and that is the point rather than a copy-paste.

      This action posts into the main alerts feed — that is the second of its two writes — so
      without this it is a way to post alerts at any rate the network allows, straight past the
      limiter guarding the composer that posts the identical row. Found by re-reading the diff
      against `postAlert`, not by a test. Only the create needs it: edit rewrites a message that
      already exists and delete removes one.
    */
    const limit = consumeRateLimit('alert', user.id);
    if (!limit.allowed) {
      return fail(429, {
        message: `You are posting alerts too quickly. Try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.`
      });
    }

    const formData = await request.formData();
    const command = swingAlertMsgSchema.safeParse({
      cmd: 'swingAlertMsg',
      data: swingAlertFieldsFrom(formData)
    });
    if (!command.success) return fail(400, { message: 'That swing alert is not valid.' });

    const created = createSwingAlert({
      room: requireRoomShortCode(locals),
      alert: command.data.data,
      now: new Date(),
      // `senderName: globals.user.nick || globals.user.name` — taken from the session, never sent
      // by the client, because a client-supplied author is a client-supplied identity.
      senderName: user.displayName,
      userId: user.id
    });

    /*
      Tell the room about the mirrored message, on the same channel and in the same shape as
      `postAlert` — writing the row made the alert exist, it did not make anyone see it.

      Only the CREATE announces. Edits and deletes of an alert are not published anywhere in this
      room today (`messageAction`'s delete branch writes and returns), so they reach other members
      on their next load. Publishing an edit on this channel would append a SECOND copy of the alert
      to every open feed, which is worse than the delay. Named here rather than left as a surprise.
    */
    if (created.mirror.alertId !== null) {
      publishToRoom(requireRoomShortCode(locals), {
        channel: 'alerts',
        data: {
          id: created.mirror.alertId,
          senderId: user.id,
          senderName: user.displayName,
          body: created.mirror.body ?? '',
          kind: 'text',
          nonTrade: false
        }
      });
    }
    return { success: true, swingAlert: created.row };
  },

  /**
   * `editSwingAlertMsg` — rewrite a swing alert and its mirrored feed message.
   *
   * The reference sends `editAlertMessageSwing` as a second command to update the mirror; here the
   * repository does both halves in one transaction, keyed by the recorded `alert_id` rather than by
   * re-deriving the old text and scanning the feed for it.
   */
  editSwingAlertMsg: async ({ request, locals }) => {
    ensureDatabase();
    const user = requireUser(locals);
    const guard = await refuseSwingAlert(request, locals, 'edit swing trade alerts');
    if (guard) return guard;

    const formData = await request.formData();
    const command = editSwingAlertMsgSchema.safeParse({
      cmd: 'editSwingAlertMsg',
      data: {
        swingAlertID: Number(formData.get('swingAlertID')),
        ...swingAlertFieldsFrom(formData)
      }
    });
    if (!command.success) return fail(400, { message: 'That swing alert is not valid.' });

    const updated = editSwingAlert({
      room: requireRoomShortCode(locals),
      swingAlertID: command.data.data.swingAlertID,
      alert: command.data.data,
      senderName: user.displayName,
      userId: user.id
    });
    if (updated === null) return fail(404, { message: 'That swing alert was not found.' });
    return { success: true, swingAlert: updated.row };
  },

  /** `deleteSwingAlertMsg` — soft-delete the row, hard-delete its mirrored feed message. */
  deleteSwingAlertMsg: async ({ request, locals }) => {
    ensureDatabase();
    const user = requireUser(locals);
    const guard = await refuseSwingAlert(request, locals, 'delete swing trade alerts');
    if (guard) return guard;

    const formData = await request.formData();
    const command = deleteSwingAlertMsgSchema.safeParse({
      cmd: 'deleteSwingAlertMsg',
      data: { swingAlertID: Number(formData.get('swingAlertID')) }
    });
    if (!command.success) return fail(400, { message: 'A valid swing alert is required.' });

    const deleted = deleteSwingAlert({
      room: requireRoomShortCode(locals),
      swingAlertID: command.data.data.swingAlertID,
      now: new Date(),
      userId: user.id
    });
    if (deleted === null) return fail(404, { message: 'That swing alert was not found.' });
    return { success: true };
  },

  /*
    ── Day Trade Alerts ────────────────────────────────────────────────────────────────────────

    The three mutations, named for the wire commands they reproduce — `dayTradeAlertMsg`,
    `editDayTradeAlertMsg`, `deleteDayTradeAlertMsg`. `DAY_TRADE_ALERT_COMMANDS` in
    `$lib/day-trade-alerts` holds those three plus the log read and the two feed-mirror commands,
    and `day-trade-alerts-contract.test.ts` asserts that the actions declared here still match it,
    because a renamed action is a 404 the browser reports only as "Unable to save".

    **Create is `dayTradeAlertMsg`, never `newDayTradeAlertMsg`.** That name is a payload KEY on the
    edit command and, separately, the server→client push. It is the same trap the Swing build hit,
    with the same shape and a different word in the middle.

    **The edit's second command keeps the word `Swing`.** `editAlertMessageSwing` is sent by this
    feature too (byte 1,987,189); `editAlertMessageDayTrade` exists nowhere in the bundle. The
    repository does both halves of that edit in one transaction rather than sending two commands, so
    no action here is named for it — but the name is pinned in the contract test, because inventing
    the analogous one is the port's most tempting mistake.

    Every one of the three is gated twice and neither gate is the browser's: the room must have the
    entitlement, and the caller must be a presenter. A hidden form is not a check.
  */

  /**
   * `dayTradeAlertMsg` — post a day trade alert.
   *
   * Two writes, in one transaction: the row, and the mirrored message the reference also posts into
   * the main alerts feed with `alertMsg`. See `day-trade-alerts-repository.ts`.
   */
  dayTradeAlertMsg: async ({ request, locals }) => {
    ensureDatabase();
    const user = requireUser(locals);
    const guard = await refuseDayTradeAlert(request, locals, 'post day trade alerts');
    if (guard) return guard;

    /*
      The SAME bucket `postAlert` and `swingAlertMsg` spend, and that is the point rather than a
      copy-paste.

      This action posts into the main alerts feed — that is the second of its two writes — so
      without this it is a way to post alerts at any rate the network allows, straight past the
      limiter guarding the composer that posts the identical row. The Swing action was written
      WITHOUT it and the omission was found by re-reading the diff against `postAlert`, not by a
      test; it is here from the first line for that reason. Only the create needs it: edit rewrites
      a message that already exists and delete removes one.

      One bucket for both features and not two, deliberately: `alert` names the feed being written,
      and two buckets would mean a presenter could post at twice the rate by alternating tabs.
    */
    const limit = consumeRateLimit('alert', user.id);
    if (!limit.allowed) {
      return fail(429, {
        message: `You are posting alerts too quickly. Try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.`
      });
    }

    const formData = await request.formData();
    const command = dayTradeAlertMsgSchema.safeParse({
      cmd: 'dayTradeAlertMsg',
      data: dayTradeAlertFieldsFrom(formData)
    });
    if (!command.success) return fail(400, { message: 'That day trade alert is not valid.' });

    const created = createDayTradeAlert({
      room: requireRoomShortCode(locals),
      alert: command.data.data,
      now: new Date(),
      // `senderName: globals.user.nick || globals.user.name` — taken from the session, never sent
      // by the client, because a client-supplied author is a client-supplied identity.
      senderName: user.displayName,
      userId: user.id
    });

    /*
      Tell the room about the mirrored message, on the same channel and in the same shape as
      `postAlert` — writing the row made the alert exist, it did not make anyone see it.

      Only the CREATE announces. Edits and deletes of an alert are not published anywhere in this
      room today (`messageAction`'s delete branch writes and returns), so they reach other members
      on their next load. Publishing an edit on this channel would append a SECOND copy of the alert
      to every open feed, which is worse than the delay. Named here rather than left as a surprise.
    */
    if (created.mirror.alertId !== null) {
      publishToRoom(requireRoomShortCode(locals), {
        channel: 'alerts',
        data: {
          id: created.mirror.alertId,
          senderId: user.id,
          senderName: user.displayName,
          body: created.mirror.body ?? '',
          kind: 'text',
          nonTrade: false
        }
      });
    }
    return { success: true, dayTradeAlert: created.row };
  },

  /**
   * `editDayTradeAlertMsg` — rewrite a day trade alert and its mirrored feed message.
   *
   * The reference sends `editAlertMessageSwing` as a second command to update the mirror — that
   * exact literal, on this path — while here the repository does both halves in one transaction,
   * keyed by the recorded `alert_id` rather than by re-deriving the old text and scanning the feed
   * for it. That scan is worse on this feature than on Swing: its loop has no `break`, so it walks
   * the whole feed and the last match wins.
   */
  editDayTradeAlertMsg: async ({ request, locals }) => {
    ensureDatabase();
    const user = requireUser(locals);
    const guard = await refuseDayTradeAlert(request, locals, 'edit day trade alerts');
    if (guard) return guard;

    const formData = await request.formData();
    const command = editDayTradeAlertMsgSchema.safeParse({
      cmd: 'editDayTradeAlertMsg',
      data: {
        dayTradeAlertID: Number(formData.get('dayTradeAlertID')),
        ...dayTradeAlertFieldsFrom(formData)
      }
    });
    if (!command.success) return fail(400, { message: 'That day trade alert is not valid.' });

    const updated = editDayTradeAlert({
      room: requireRoomShortCode(locals),
      dayTradeAlertID: command.data.data.dayTradeAlertID,
      alert: command.data.data,
      senderName: user.displayName,
      userId: user.id
    });
    if (updated === null) return fail(404, { message: 'That day trade alert was not found.' });
    return { success: true, dayTradeAlert: updated.row };
  },

  /** `deleteDayTradeAlertMsg` — soft-delete the row, hard-delete its mirrored feed message. */
  deleteDayTradeAlertMsg: async ({ request, locals }) => {
    ensureDatabase();
    const user = requireUser(locals);
    const guard = await refuseDayTradeAlert(request, locals, 'delete day trade alerts');
    if (guard) return guard;

    const formData = await request.formData();
    const command = deleteDayTradeAlertMsgSchema.safeParse({
      cmd: 'deleteDayTradeAlertMsg',
      data: { dayTradeAlertID: Number(formData.get('dayTradeAlertID')) }
    });
    if (!command.success) return fail(400, { message: 'A valid day trade alert is required.' });

    const deleted = deleteDayTradeAlert({
      room: requireRoomShortCode(locals),
      dayTradeAlertID: command.data.data.dayTradeAlertID,
      now: new Date(),
      userId: user.id
    });
    if (deleted === null) return fail(404, { message: 'That day trade alert was not found.' });
    return { success: true };
  },

  /*
    `editUsername` left for `src/routes/username.remote.ts` — a module of ONE, deliberately not
    folded in with the settings writes beside it. Those name nobody; this takes a `userId` and can
    rename any account when the caller is a presenter, so it is split on the GATE.

    The whole dead-`'user'`-role story went with it, along with the positive restatement that
    replaced it. New at the boundary: `z.number().int().positive()` also refuses 0 and negatives,
    where `Number.isInteger` let them through to match no row and report success; and
    `displayName` gained a 200-character bound it never had.
  */

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

  /*
    `deleteFile`, `fileMediaCommand` and `overwriteCashRegisterSound` left together for
    `src/routes/files-pane.remote.ts` — one module because all three enforced, in three separate
    hand-written copies, that the file named must be one THIS ROOM HOLDS. That predicate is
    `roomFileByUrl` there now, declared once and returning the row, so the caller that needs the
    content type gets it from the same read that proved ownership.

    `deleteFile`'s SELECT-then-DELETE became a single conditional `DELETE … RETURNING`, which is a
    FIX and not a move: two statements with a gap between them is the TOCTOU this repository's
    standard names, and two presenters deleting the same file both reached `deleteStoredFile` on a
    path the first had already removed. Zero rows now means somebody else won the race.

    `overwriteCashRegisterSound`'s `on` is a real `z.boolean()` where the form body carried the
    strings `'true'`/`'false'`. The action compared against those exact strings so an unrecognised
    value could not fall through to "remove" and silently clear the room's sound; the schema is that
    same refusal, enforced before the handler runs.

    `uploadComposerImage` did NOT go with them. It is gated by `isPresenter || settings.userUploads`
    rather than by the presenter role, and a looser gate living in a module whose every other export
    opens with `presenterRoom()` is how gates drift. `src/routes/composer-image.remote.ts`.

    `uploadFile` STAYS here, and stays a form action: it is submitted from a real `<form>` in the
    Files-pane modal, so it degrades without JavaScript — the case SvelteKit's guidance says to
    prefer `form` for.
  */

  /*
    `videoForAll` and `youtubeForAll` left together for
    `src/routes/for-all-broadcast.remote.ts`, and `broadcastableMediaUrl` /
    `MAX_BROADCAST_URL` went with them — they were declared at the top of this file and used by
    nothing else.

    One feature, one decision: a presenter's typed string becomes an `src` attribute in every
    browser in the room. They share the presenter gate and the length bound; they do NOT share the
    URL check, and that module says at each of them why making them consistent would break one.
  */

  /*
    `recordingState` and `changeChatMode` left together for `src/routes/recording-state.remote.ts`
    and `src/routes/chat-mode.remote.ts` — two modules, because they are two features that merely
    LOOKED alike here.

    Both are presenter-gated `cmds` broadcasts scoped to the caller's own room, so both now share
    `presenterRoom()` instead of spelling the role test out by hand. The one place they diverge is
    the one that matters and it is written at both ends: recording is MOMENTARY and stores nothing,
    the chat mode is a standing fact about the room and writes a row. Folding them into one module
    would have buried that difference under a shared name.

    Two changes went with them, neither of them a move:
      - `recName` now REFUSES over 200 characters where this truncated with `.slice(0, 200)`. A
        silent truncation is the fallback this repository forbids.
      - the mode allow-list is `z.enum(CHAT_MODES)` rather than a hand-called `isChatMode`, so it is
        derived from the constant `$lib/chat-mode.ts` already exports instead of restated.
  */

  /*
    `getMyMobilePin` — `sendServerCommand("getMyMobilePin", null)` upstream — was an action here and
    is now `src/routes/mobile-pin.remote.ts`. The gate, the controller call and both messages moved
    with it unchanged; `fail(409)`/`fail(502)` became `error(409)`/`error(502)`, because a command
    has no form-action caller to understand a `fail`.

    It is a `command` and NOT a `query` despite being a read, and that module explains why at length:
    the pin is minted fresh per request, and a query would cache it.
  */

  /*
    `presenterCommand` and `focusOnScreen` left together for
    `src/routes/presenter-commands.remote.ts`. Both broadcast on the `cmds` channel, both are
    refused to non-presenters, and both scope the broadcast to the caller's own room — so the gate
    and the room scope, which were spelled out by hand in BOTH actions, are written once there.

    They stay two commands with two schemas, which `focus-on-screen-contract.test.ts` exists to
    enforce: one names a PERSON and validates an integer target, the other names a SCREEN. Folding
    them together would loosen a check to fit a payload it was never for.
  */

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
  }

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
};
