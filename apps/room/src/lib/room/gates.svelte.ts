import { PUBLIC_PTR_TAWK_PROPERTY_ID } from '$app/env/public';
import { page } from '$app/state';

import { parseAlertLabels } from '#lib/alert-labels.js';
import {
  archivesAvailableTo,
  rosterBlockVisible,
  rosterCountVisibleTo
} from '#lib/roster-gates.js';
import { tawkSupportAvailable } from '#lib/tawk-support.js';

import type { PageData } from '../../routes/$types';

import type { RoomMedia } from './media.svelte';
import type { RoomPrefs } from './prefs.svelte';

/**
 * What the sixteen predicates read off the loaded page data.
 *
 * DERIVED from `PageData` rather than restated. Between them these read a dozen fields off
 * `sessData`, and hand-narrowing that is how a gate ends up reading `unknown` and being cast into
 * working — which is a cast standing where a type should be.
 */
type GatesSession = Pick<PageData, 'sessData' | 'user' | 'streamRead'>;

/** The viewer and session shapes `#lib/roster-gates.js` takes, assembled by the page. */
type RosterViewer = Parameters<typeof rosterBlockVisible>[0];
type RosterSession = Parameters<typeof rosterBlockVisible>[1];

/**
 * WHAT THIS VIEWER MAY SEE, in one place.
 *
 * Phase 5 slice 27. Sixteen `$derived` predicates — whether the roster is visible, whether archives
 * are reachable, which alert labels this room uses, whether the Benzinga panel appears and at what
 * URL, whether the mobile app link is offered, whether the chat column is hidden at all.
 *
 * **They are one module because they answer one question**, asked sixteen ways: given this room's
 * configuration and this viewer's role, what is on screen. Every one reads `data` and most read
 * nothing else; none of them writes anything. That is the tightest seam left on the page — seven
 * collaborators across 286 lines, and not a single field shared with it.
 *
 * **GETTERS, not `$derived` class fields, and this is the precedent rather than a preference.** A
 * derived field initialises in DECLARATION ORDER, before the constructor has assigned the thunks it
 * reads, so it would evaluate against `undefined` once and cache that. `RoomFiles.filesHidden` is
 * where that was first paid for. A getter is evaluated on read and is exactly as reactive, because
 * a `$derived` read through a getter is the same signal read.
 *
 * **The RULES are not here.** `archivesAvailableTo`, `rosterBlockVisible`, `benzingaVisibleTo` and
 * the rest live in `#lib/*-gates.ts` with their citations and their own tests; this class asks them.
 * Moving a predicate into a class that also holds state is how a rule stops being testable on its
 * own, and every one of these is a gate on what a member may see.
 */
export class RoomGates {
  readonly #prefs: RoomPrefs;
  readonly #media: RoomMedia;
  readonly #session: () => GatesSession;
  readonly #isPresenter: () => boolean;
  readonly #rosterViewer: () => RosterViewer;
  readonly #rosterSession: () => RosterSession;
  readonly #chatAlertsDetached: () => boolean;

  constructor(options: {
    prefs: RoomPrefs;
    media: RoomMedia;
    /** The loaded page data, through a thunk because the load replaces it on every refetch. */
    session: () => GatesSession;
    isPresenter: () => boolean;
    /** The viewer and session shapes the roster gates take, already assembled by the page. */
    rosterViewer: () => RosterViewer;
    rosterSession: () => RosterSession;
    /** Whether the alerts column has been detached into its own window. */
    chatAlertsDetached: () => boolean;
  }) {
    this.#prefs = options.prefs;
    this.#media = options.media;
    this.#session = options.session;
    this.#isPresenter = options.isPresenter;
    this.#rosterViewer = options.rosterViewer;
    this.#rosterSession = options.rosterSession;
    this.#chatAlertsDetached = options.chatAlertsDetached;
  }

  /**
   * `sessData.presenterMsgsOnTheRight` — a ROOM setting, not a viewer preference.
   *
   * `RoomMessage.svelte` has carried both consumers since it was written and neither was ever fed:
   * `messageBodyClass` adds `presenter-msg-right`, and the reaction row takes
   * `presenter-reactions-right`. Owner-configurable at
   * `page.manageSession.html:1108`.
   *
   * It is also the FIRST term of the reference's chat-badge gate —
   * `preferences.chatBadges && !sessData.presenterMsgsOnTheRight && sessData.enableBadges && …` —
   * so with it on, badges are suppressed regardless of the other three. That coupling is upstream's
   * and is reproduced by `visibleBadges`.
   */
  get presenterMessagesOnTheRight() {
    return this.#session().sessData?.presenterMsgsOnTheRight === true;
  }

  /**
   * The other three terms of the reference's chat-badge gate:
   *
   * ```js
   * preferences.chatBadges && !sessData.presenterMsgsOnTheRight && sessData.enableBadges &&
   *   msg.b && msg.b.length && (!sessData.showBadgesToPresentersOnly || globals.isPresenter)
   * ```
   *
   * `enableBadges` is the owner's master switch and is `=== true`: a room that has never been
   * configured shows no badges, which is what an absent setting means everywhere else in this
   * payload — the controller omits unset values rather than sending null.
   *
   * `showBadgesToPresentersOnly` narrows them to presenters. `disableStarYears` gates the
   * membership-star, whose `item.membershipYears` still has no supply, so it is passed for the
   * component's own gate and is expected to change nothing until that lands — recorded rather than
   * left to look like an oversight.
   */
  get enableBadges() {
    return this.#session().sessData?.enableBadges === true;
  }

  /**
   * `'Recording to: ' + decodedRecName()`, suppressed for non-presenters when the session says so.
   *
   * `dontShowRecInfoToUsers` is not captured in our session data, so it is read defensively and
   * treated as off when absent - the capture's default is to SHOW the name.
   */
  get recordingTooltip() {
    const hideFromUsers = this.#prefs.loaded.dontShowRecInfoToUsers === true;
    if ((hideFromUsers && !this.#isPresenter()) || !this.#media.roomRecordingName) return '';
    return `Recording to: ${decodeURIComponent(this.#media.roomRecordingName)}`;
  }

  /**
   * `appService.globals.viewerOnlyMode` — the `vo` query parameter, and the ONLY gate on the screen
   * overlay's volume trigger (`ScreenVolumeControl.svelte`).
   *
   * Read the same way `chatOnlyMode` above reads `co` and `detachedScreenId` reads `dscreen`: this
   * app's query parameters are its own, and the reference's parser assigns all three out of one
   * block. `?vo=2` additionally sets `viewerOnlyModeLimited` upstream; nothing in this room reads
   * that yet, so it is deliberately not modelled here rather than added as state with no consumer.
   *
   * PROVENANCE, stated because it is the one fact in this change that was not re-read this session:
   * the `vo` -> `viewerOnlyMode` mapping comes from `HANDOFF.md`, which quotes it from the minified
   * bundle at ~2595500. It is NOT in `docs/source/components/**` — that tree decodes the 51
   * COMPONENTS, and the query-parameter block belongs to the app service. What IS re-read and cited
   * is every consumer: `app-presentationarea.compiled.js:92`, `app-room.compiled.js:76,856`, and
   * the two `ngClass` helpers `jCe`/`VCe` in `app-presentationarea.render-helpers.js:9-10`.
   */
  get viewerOnlyMode() {
    return page.url.searchParams.get('vo') === '1' || page.url.searchParams.get('vo') === '2';
  }

  /**
   * `hideStreams` — the streams tab's own `hidden`, moved here 2026-08-28 to sit with its sibling.
   *
   * ```js
   * this.hideStreams = !this.appService.globals.sessData.useMediaMTX
   * ```
   * (`app-presentationarea.full.js:2293`), applied to BOTH the `#streams-tab` `li` (`:5357`) and the
   * `#streams` pane (`:5388-5391`) — the same value twice, so the tab and its content can never
   * disagree.
   *
   * **Note the NEGATION and the default that falls out of it.** The setting says the feature is ON;
   * the flag says the tab is HIDDEN. A room with no MediaMTX sends no `useMediaMTX` at all,
   * `!undefined` is true, and the tab stays hidden — which is right, and is why this is not written
   * as an `=== false` check.
   *
   * It was a `$derived` in the page until `notesHidden` arrived beside it and the two read as one
   * subject: which main tabs this room does not show. A gate on what a member may see belongs with
   * the other gates.
   */
  get streamsHidden() {
    return this.#session().sessData?.useMediaMTX !== true;
  }

  /**
   * `hideNotes` — "Hide Notes Section?", ORed with viewer-only mode, exactly as the reference does.
   *
   * ```js
   * this.hideNotes = this.appService.globals.sessData.hideNotes || this.appService.globals.viewerOnlyMode
   * ```
   * (bundle byte 1955694), applied as `z('hidden', o.hideNotes)` to BOTH the notes `li` (2016630)
   * and the notes pane (2017506) — the same value twice, so the tab and its content can never
   * disagree.
   *
   * ## Why it is composed HERE and not sent composed
   *
   * `ROOM_VISIBLE_SETTINGS` sends the SETTING and not the OR. The room already knows whether it is
   * in viewer-only mode — it is the `vo` query parameter, read three lines up — so folding it in on
   * the controller would be the control plane answering a question this side answers better, and it
   * would make the value sent depend on how the member arrived. The reference composes it in the
   * room too.
   *
   * ## Found by ENUMERATION
   *
   * `hideFiles` and `hideStreams` have crossed since `ROOM_VISIBLE_SETTINGS` was written and are
   * applied the same way; `hideNotes` was not on that list, so an owner who ticked the box got a
   * room that still showed the tab. Nobody noticed the trio was a pair until
   * `gate/audit-setting-coverage.mjs` asked the bundle which settings the reference reads that this
   * room does not.
   */
  get notesHidden() {
    return this.#session().sessData?.hideNotes === true || this.viewerOnlyMode;
  }

  /**
   * `sessData.individualVolumeControls` — "Individual Volume Controls?", the room setting that
   * reveals the per-presenter slider inside the overlay's `room-sound-options`
   * (`bSe`'s `O(6, …sessData.individualVolumeControls ? 6 : -1)`).
   *
   * It exists in the controller's schema (`room-settings-schema.ts`, "Individual volume controls
   * for each Presenter") and had to be added to `ROOM_VISIBLE_SETTINGS` to reach this room; that
   * change and its consumer land together.
   */
  get individualVolumeControls() {
    return this.#session().sessData?.individualVolumeControls === true;
  }

  /**
   * `hideChatAlerts` — ONE flag with five writers upstream, and the single gate on the whole
   * chat/alerts column: `O(1, e.hideChatAlerts ? -1 : 1)` (`app-room.render-helpers.js:1650`),
   * plus the extra chat column beside it at `:1652-1660`.
   *
   * The five writers, all in `ngOnInit` except the last (`app-room.full.js`):
   *
   *   :1893      `this.hideChatAlerts = sessData.hideChatAlerts`        — the room setting
   *   :1894-1896 `isPlayer && isPresenter` forces it true
   *   :1898-1900 `videoOnlyMode && (hideChatAlerts = !recordChat && videoOnlyMode)`
   *   :1901-1902 `viewerOnlyMode && (hideChatAlerts = viewerOnlyMode)`
   *   :2179-2181 the `detachChat` event sets it true, with `reopenAlertsChatBtn`
   *
   * THREE of the five are modelled here. The two that are not are honest gaps, not oversights:
   *
   * - `isPlayer` has ZERO occurrences in this room. Upstream it is a client global for a stream
   *   PLAYBACK mode — the only other thing that reads it raises "The stream has ended. You can
   *   close this page now." on `streamPlayerEnded` (`full.js:2162-2165`). This room has no such
   *   mode, so there is nothing to read.
   * - `videoOnlyMode` is the `r` query parameter, the recording-bot mode — the same gap
   *   `files-gates.ts` already records for `hideFiles`. `recordChat` is deliberately not on the
   *   wire either, because it appears ONLY inside that writer and would arrive with no reader.
   *
   * This replaces two unrelated mechanisms that each carried one writer: a hardcoded branch on
   * `viewerOnlyMode` and a separate `chatAlertsDetached` branch. They were the same decision
   * rendered twice, which is why the room setting an owner ticks did nothing at all.
   */
  get hideChatAlerts() {
    return (
      this.#session().sessData?.hideChatAlerts === true ||
      this.viewerOnlyMode ||
      this.#chatAlertsDetached()
    );
  }

  /**
   * Mobile App Info.
   *
   * `getMyPinAndDoInfo()`, transcribed:
   *
   * ```js
   * (sessData.ptrMobileAppEnabled || sessData.customMobileAppEnabled)
   *   && (!globals.user.isFT || sessData.freeTrialsGetApp)
   *   && appService.sendServerCommand("getMyMobilePin", null)
   * ```
   *
   * The same predicate gates the two buttons that call it, so it is named once. Re-checking it
   * inside the handler is the capture's own belt-and-braces and is kept: a `data-bs-toggle` opens
   * the modal whether or not the click handler agrees, so the command must not go out on a room
   * with no app.
   */
  get mobileAppAvailable() {
    return (
      (Boolean(this.#session().sessData?.ptrMobileAppEnabled) ||
        Boolean(this.#session().sessData?.customMobileAppEnabled)) &&
      (!this.#session().user.isFT || Boolean(this.#session().sessData?.freeTrialsGetApp))
    );
  }

  /**
   * Benzinga.
   *
   * ```js
   * benzingaUrl = `https://ptrv3.protradingroom.com/public/bz/index.html
   *                ?sessID=${globals.sessionID}&id=${sessData.uuid}&tok=${globals.sesionToken}`;
   * "" != sessData.altBenzingaLinkURL && (benzingaUrl = sessData.altBenzingaLinkURL)
   * ```
   *
   * The default is built from three values this room does not have: the reference's own
   * `sessionID`, a `sessData.uuid` that is not in the 268-key schema at all, and `sesionToken`
   * (the capture's spelling), which is the controller's session credential and has no business
   * crossing into a page. So the default is NOT reproduced - a link built from three blanks is a
   * broken link wearing a logo.
   *
   * `altBenzingaLinkURL` is reproduced exactly, and a room that sets it gets a working item.
   * Without it the item does not render, and `TODO.md` records why.
   */
  get benzingaUrl() {
    return this.#session().sessData?.altBenzingaLinkURL?.trim() || null;
  }

  get benzingaVisible() {
    return Boolean(this.#session().sessData?.hasBenzingaNews) && this.benzingaUrl !== null;
  }

  /** `O(32, e.archivesAvailableTo() ? 32 : -1)` */
  get archivesAvailable() {
    return archivesAvailableTo(this.#rosterViewer(), this.#rosterSession());
  }

  /** `O(44, …)` - the Users block. */
  get rosterVisible() {
    return rosterBlockVisible(this.#rosterViewer(), this.#rosterSession());
  }

  /** `O(6, …)` - the badge, which is gated separately from the list. */
  get rosterCountVisible() {
    return rosterCountVisibleTo(this.#rosterViewer(), this.#rosterSession());
  }

  /**
   * `showPMBtn` — the chat header's private-chat button.
   *
   * ```js
   * this.showPMBtn = (isPresenter || sessData.userPM || sessData.userToPresenterPM)
   *   && !(user.isFT && sessData.disablePMForTrials)
   * ```
   *
   * The same three settings the roster's per-target `canShowRosterPrivateChat` reads, asked without
   * a target because this button opens the chooser rather than one conversation.
   */
  get showPmButton() {
    return (
      (this.#isPresenter() ||
        this.#session().sessData?.userPM === true ||
        this.#session().sessData?.userToPresenterPM === true) &&
      !(this.#session().user.isFT === true && this.#session().sessData?.disablePMForTrials === true)
    );
  }

  /**
   * The room's Alert Labels, parsed ONCE for the page rather than once per rendered alert.
   *
   * `RoomMessage` is instantiated per message, so parsing inside it would run `JSON.parse` for
   * every row in the log. The reference parses once too, at byte 1,147,290, when the session
   * arrives.
   *
   * This THROWS on a malformed setting, deliberately and like the reference — see
   * `parseAlertLabels`. A room that typed bad JSON into Alert Labels should find out.
   */
  get alertLabels() {
    return parseAlertLabels(this.#session().sessData?.alertLabels);
  }

  /*
    The OWNER term of the recording-reminder banner, byte 2,477,770.

    Upstream shares this name between a room setting and a local runtime flag, and the gate needs
    BOTH. The room already had the flag and the banner, so this is the missing half rather than a
    new feature: without it an owner cannot switch the reminder off at all.

    HONEST GAP: the captured gate also requires mic state -
    !micDisabled && !media.micMuted - which this room does not model on that banner. Named here rather
    than silently approximated.
  */
  get recordingReminderAllowed() {
    return this.#session().sessData?.recordingReminder === true;
  }

  /**
   * Tawk.to presenter support — `app-room.full.js:2224-2298`.
   *
   * The gates, the URL shape and the attribute fallbacks are in `#lib/tawk-support.js`, with the one
   * DIVERGENCE stated there and tested: the property id is configuration, never the capture's
   * literal, because copying `5aecb59f227d3d7edc24f7c2` would open every presenter's support chat
   * into another company's inbox and post their name and email into it.
   *
   * `loadTawkSupport()` runs from `ngAfterViewInit` upstream — after the view exists, once — which
   * is `onMount` here. `setTAWKAttributes()` then awaits the API and calls `hideWidget()`, so the
   * widget is present and invisible until the navbar control is used; that is why the control is a
   * toggle rather than a launcher.
   */
  get tawkAvailable() {
    return tawkSupportAvailable(
      { isPresenter: this.#isPresenter() },
      this.#session().sessData ?? {},
      PUBLIC_PTR_TAWK_PROPERTY_ID
    );
  }
}
