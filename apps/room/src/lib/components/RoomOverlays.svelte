<script lang="ts">
  import RoomBranding from '#lib/components/RoomBranding.svelte';
  import { saveCloseMessageThen } from '#lib/room/close-message.js';
  import { saveRestreamUrlThen } from '#lib/room/restream-url.js';
  import type { SvelteSet } from 'svelte/reactivity';

  import { alertPassesFilter, type AlertFilterFor } from '#lib/alert-filter.js';
  import { captureSettingsFrom } from '#lib/capture-settings.js';
  import { viewerAlertPrefsFrom } from '#lib/viewer-alert-prefs.js';
  import { resolveAlertDelivery } from '#lib/alert-delivery.js';
  import { isMentionOf } from '#lib/mention.js';
  /*
    UIM-04 — `canPM`, resolved HERE and handed to `ModalHost` as one boolean.

    This module is the transcription of the reference's own expression (byte 2,073,550) and it
    already had one caller, `RoomPrivateChat.canOpenFor`, for the ROSTER row. The user card asks
    the identical question about the identical target and was not asking it at all. Both call
    sites now go through the one function, which is the point of it having been extracted: the
    reference asks this question twice and disagrees with itself once.
  */
  import { canShowRosterPrivateChat } from '#lib/roster-private-chat.js';
  import { RoomArrivals, RoomOrderedArrivals } from '#lib/room/arrivals.js';
  import { ReactionArrivals } from '#lib/reaction-arrivals.js';
  import { chatReactionNotice, questionReactionNotice } from '#lib/room/reaction-notices.js';
  import { playSoundEffect } from '#lib/sound-effects.js';
  import type { ChatMode } from '#lib/chat-mode.js';
  import type { RoomMessageChrome } from '#lib/room-message-chrome.js';
  import type { PresenterColorMap } from '#lib/presenter-colors.js';
  import type { AlertLabel } from '#lib/alert-labels.js';
  import type { ChatDisplayMode, ChatDisplaySurface } from '#lib/chat-display-mode.js';
  import BootboxDialog from '#lib/components/BootboxDialog.svelte';
  import GifConfirmDialog from '#lib/components/GifConfirmDialog.svelte';
  import ImageLightbox from '#lib/components/ImageLightbox.svelte';
  import ImagePasteConfirm from '#lib/components/ImagePasteConfirm.svelte';
  import ImageUploadDialog from '#lib/components/ImageUploadDialog.svelte';
  import ModalHost from '#lib/components/ModalHost.svelte';
  import RemoteAudioSinks from '#lib/components/RemoteAudioSinks.svelte';
  import RecordingPreviewCard from '#lib/components/RecordingPreviewCard.svelte';
  import ToastHost from '#lib/components/ToastHost.svelte';
  import type { RoomAlerts } from '#lib/room/alerts.svelte.js';
  import type { RoomBroadcasts } from '#lib/room/broadcasts.svelte.js';
  import type { RoomComposer } from '#lib/room/composer.svelte.js';
  import type { RoomDialogs } from '#lib/room/dialogs.svelte.js';
  import type { RoomEventStream } from '#lib/room/events.svelte.js';
  import type { RoomFeeds } from '#lib/room/feeds.svelte.js';
  import type { RoomMedia } from '#lib/room/media.svelte.js';
  import type { RoomMediaTransport } from '#lib/room/media-transport.svelte.js';
  import type { RoomMessageActions } from '#lib/room/message-actions.svelte.js';
  import type { RoomModals } from '#lib/room/modals.svelte.js';
  import type { RoomDebugLog } from '#lib/room/debug-log.svelte.js';
  import type { RoomPolls } from '#lib/room/polls.svelte.js';
  import type { RoomPrefs } from '#lib/room/prefs.svelte.js';
  import type { RoomPrivateChat } from '#lib/room/private-chat.svelte.js';
  import type { RoomRoster } from '#lib/room/roster.svelte.js';
  import type { RoomSplit } from '#lib/room/split.svelte.js';
  import type { RoomToasts } from '#lib/room/toasts.svelte.js';
  import type {
    DayTradeAlertAction,
    RoomTradeAlerts,
    SwingAlertAction
  } from '#lib/room/trade-alerts.svelte.js';
  import type { RoomUserActions } from '#lib/room/user-actions.svelte.js';
  /*
    `ModalName` went with `openModal` on 2026-08-18 — the last thing in this file that named the
    union was the removed callback's signature. `modals.open()` carries it now, from the class.
  */
  import type { DayTradeAlertRow, FollowChatStyle, SwingAlertRow, Theme } from '#lib/types.js';

  import type { PageData } from '../../routes/$types';

  /*
    EVERYTHING THAT FLOATS ABOVE THE ROOM, in one place.

    Phase 5 slice 17: the modal host, the seven dialog blocks, the toast host, the image lightbox,
    the hidden remote-audio sinks and the "Conected" overlay. 311 lines of the page's template,
    which was the largest single region left in it after Phase 2 took the five panes out.

    They are ONE component because they are one LAYER, not because they are one feature. Every node
    here is positioned over the room rather than in it, none of them participates in the split
    layout, and each is conditional on state the page already owns. That is a real boundary: a
    reader looking for why a dialog appears has one file to open, and the page's template is left
    with the shell and the panes.

    **The props are FACADES, and that is what makes this a saving rather than a move.** Nineteen of
    the thirty-six below are the room's state classes handed over whole — `dialogs`, `userActions`,
    `composer`, `swingAlerts` and the rest. `ModalHost` alone takes 85 props; it still does, but
    they are assembled next to it now instead of being drilled through the page's template. The
    ratchet already records this working: `RoomSidebar` took `roster` and `menus` whole, "three
    references replacing about twenty".

    **Two props are `$bindable` and the rest are not**, which is the honest split rather than a
    convenience. `modal` and `selectedImageUrl` are WRITTEN here — a dialog closing itself, the
    lightbox dismissing — and the page reads both. Everything else is read here and written through
    a class or a callback, so making it bindable would invent a second writer for state that has
    exactly one.

    **The unions are the children's own, never widened to `string`.** `ModalHost` takes a
    `ModalName`; a component that promised `string` to a child expecting a seven-member union would
    have moved the type error rather than removed it, and would have made this call site
    uncheckable. `SessionControlTab` moved to `#lib/types.ts` for the same reason — a second
    consumer arrived, and `RoomNavbar.svelte`'s note that "moving it would be a change to a file
    this extraction is trying to shrink" is now the opposite of true.
  */
  let {
    // The room's state classes, handed over whole.
    alerts,
    broadcasts,
    composer,
    data,
    dayTradeAlerts,
    dialogs,
    feeds,
    media,
    mediaTransport,
    messageActions,
    polls,
    prefs,
    privateChat,
    roomEvents,
    roster,
    split,
    swingAlerts,
    toasts,
    userActions,

    // Page state this layer renders from. Only these two are written back.
    isPresenter,
    canPostImages,
    messageChrome,
    presenterColors,
    alertLabels,
    captionsAvailable,
    alertsDisplayMode,
    chatLogDisplayMode,
    onDisplayModeChange,
    unreadQaAlertIds,
    modals,
    debugLog,
    chatMode,
    globalChatStyle,
    mobilePin,
    mobileAppAvailable,
    onrestoremobiletokens,
    theme,

    /*
      Page actions, passed as callbacks rather than reached for: the component asks and the page
      decides, which is the boundary every pane from Phase 2 already uses.

      TWO OF THEM, since 2026-08-18. Six more stood here — `closeActiveModal`, `downloadImage`,
      `minimizePoll`, `openModal`, `setTheme`, `submitPollAction` — and every one was a method of
      `modals`, which is a prop of this component and which the markup below ALREADY reaches for
      directly: it writes `modals.settingsTab`, `modals.modal` and `modals.selectedImageUrl` and
      reads four more. So the boundary this paragraph describes was not the one the file had for
      that object; the callbacks were a second path to something already in scope.

      `submitPollAction` is five named methods since 2026-08-30 (see `RoomModals`); the five call
      sites below changed shape with it and did NOT change owner — they already reached for `modals`.
      The two that remain are genuinely the page's. `changeChatMode` is the page's own async
      function — a remote command plus `invalidateAll()` — and belongs to no class here.
      `saveAlertFilter` is `RoomAlertsPane`'s, and that object is NOT a prop of this component, so
      passing it to remove one callback would add one.

    */
    changeChatMode,
    saveAlertFilter
  }: {
    alerts: RoomAlerts;
    broadcasts: RoomBroadcasts;
    composer: RoomComposer;
    data: PageData;
    dayTradeAlerts: RoomTradeAlerts<DayTradeAlertRow, DayTradeAlertAction>;
    dialogs: RoomDialogs;
    feeds: RoomFeeds<PageData['alerts'][number], PageData['messages'][number]>;
    media: RoomMedia;
    mediaTransport: RoomMediaTransport;
    messageActions: RoomMessageActions;
    polls: RoomPolls;
    prefs: RoomPrefs;
    privateChat: RoomPrivateChat<PageData['connectedUsers'][number]>;
    roomEvents: RoomEventStream<PageData['connectedUsers'][number]>;
    roster: RoomRoster<PageData['connectedUsers'][number]>;
    split: RoomSplit;
    swingAlerts: RoomTradeAlerts<SwingAlertRow, SwingAlertAction>;
    toasts: RoomToasts;
    userActions: RoomUserActions<PageData['connectedUsers'][number]>;
    /** Resolved on the SERVER from `data.user.role`. Read here only to decide who gets a toast. */
    isPresenter: boolean;
    /**
     * `QAM-05` — `(isPresenter || sessData.userUploads)`, byte 2,334,626.
     *
     * The page's single answer, forwarded to `ModalHost` for the Q&A composer's image button. NOT
     * derived from the `isPresenter` beside it: `sessData.userUploads` is the other half and this
     * component is not given it, so re-deriving here would produce a narrower gate that quietly
     * disagreed with the four composers the page already feeds from the same value.
     */
    canPostImages: boolean;
    /**
     * The chrome every rendered message shares, built ONCE on the page.
     *
     * Passed straight through to `ModalHost`, which spreads it onto each Q&A thread entry. It is a
     * prop rather than rebuilt here for the reason `room-message-chrome.ts` exists at all: a second
     * construction is a second answer to which settings a message reads.
     */
    messageChrome: RoomMessageChrome;
    /** The room's presenter colour map, forwarded whole to `ModalHost` — see `presenter-colors.ts`. */
    presenterColors: PresenterColorMap;
    /**
     * The room's parsed Alert Labels, forwarded to `ModalHost` for the composer's picker (`PAM-01`).
     *
     * The PAGE parses them (`gates.alertLabels`) and the alerts column already receives the same
     * array, so this is the second consumer of one parse rather than a second parse.
     */
    alertLabels: readonly AlertLabel[];
    /**
     * `RoomGates.speechRecognitionAvailable` — USM-15, passed straight to `ModalHost`.
     *
     * Resolved on the PAGE and not here, unlike the `data.sessData` reads above it: the `!== true`
     * rule (absent means NOT disabled) belongs to `RoomGates`, which is also what
     * `RoomRecording.beginSpeechRecognition` refuses on. One reading of the setting, two consumers.
     */
    captionsAvailable: boolean;
    /** The two display modes, passed straight through to the settings radios and the Q&A thread. */
    alertsDisplayMode: ChatDisplayMode;
    chatLogDisplayMode: ChatDisplayMode;
    onDisplayModeChange: (surface: ChatDisplaySurface, mode: ChatDisplayMode) => void;
    /**
     * The page's INSTANCE, not a copy — `RoomFeeds` reads it for the badge and `RoomModals`
     * clears it, so a second set would be a second answer to which alerts are unread.
     */
    unreadQaAlertIds: SvelteSet<number>;
    /** Which overlay is showing, and how it is configured. Owned by the class, not by props. */
    modals: RoomModals;
    /**
     * The room's console log — the buffer this browser fills and the one a presenter received.
     *
     * The CLASS rather than its value, because both ends are read here: the markup passes
     * `debugLog.received` down to `ModalHost`, and the page's own effect opens the modal when it
     * arrives. Passing the value alone would mean a second prop for the arrival.
     */
    debugLog: RoomDebugLog;
    chatMode: ChatMode;
    globalChatStyle: FollowChatStyle;
    mobilePin: string;
    /** Gates the troubleshooter's Mobile App tab — see the note on `ModalHost`'s own prop. */
    mobileAppAvailable: boolean;
    onrestoremobiletokens: () => Promise<{
      registrations: number;
      sent: number;
      failed: number;
      pruned: number;
    }>;
    theme: Theme;
    changeChatMode: (mode: ChatMode) => void;
    /* It takes the NEXT filter - `ModalHost` calls it with the pair the modal collected. */
    saveAlertFilter: (next: { alertFilterFor: AlertFilterFor; showAlertsFrom: boolean }) => void;
  } = $props();

  /*
    ── DELIVERY: what a viewer is TOLD when something arrives ───────────────────────────────────
    Phase 5 S3. Four effects, two policy functions and the four arrival trackers they read.

    ## Why they are HERE and not in a class

    Svelte's `$effect` docs are explicit about the trap a class would walk into: *"If `$state` and
    `$derived` are used directly inside the `$effect` (for example, during creation of a reactive
    class), those values will not be treated as dependencies."* A constructor-registered effect
    reading `prefs.doNotDisturbOn` would therefore never re-run when the viewer toggled Do Not
    Disturb. So an effect belongs to a COMPONENT, and best-practices names the component it belongs
    to: an effect is an escape hatch for side effects, and the side effect here is a toast and an OS
    notification — the layer this component renders. `ToastHost` is twelve lines below.

    ## Why they moved NOW rather than with slice 1

    Because the condition written down at the time was met, and it was written down precisely so it
    could be checked rather than remembered. `RoomToasts`'s construction note said the class *"owns
    the MECHANISM and deliberately not the policy: `deliverAlert` and `deliverQaNotice` decide who is
    told and with which sound, reading six preferences that still live in this file, so they stay
    here until those do."* Slice 3 moved those six into `RoomPrefs`. The trigger fired; this is the
    move it was waiting for, and the note on the page has been updated to say so rather than being
    silently dropped.

    ## The trackers are LOCAL, and that is the test that this is the right home

    `mentionArrivals`, `alertArrivals` and `qaArrivals` have exactly one reader each — their own
    effect — so they came across as local state rather than as props. State whose only reader is one
    component belongs to that component; `PrivateChatPanel` is the recorded precedent. A fourth,
    `chatArrivals`, came with them and went on 2026-08-31; the note where it stood says why.

    `unreadQaAlertIds` did NOT, and so is a prop: `RoomFeeds` reads it for the unread badge and
    `RoomModals` clears it. It is the page's INSTANCE, not a copy — a `SvelteSet` handed over whole,
    the same shape `ExtraChatPane` uses for its `follow`, because a second set would be a second
    answer to "which alerts are unread".

    Nothing here decides AUTHORITY. `isPresenter` arrives already resolved from `data.user.role` on
    the server; this only decides who gets a toast.

    ## Why these are `$effect`s at all, since the autofixer asks — and it asks seventeen times

    `svelte-autofixer` returns zero ISSUES here and seventeen SUGGESTIONS, every one the same
    sentence: *"You are calling a function inside an $effect… check if it could use `$derived`
    instead."* It is right that state is written. The suggestion is still declined, and the reasons
    are written down rather than the warning ignored — the same treatment, and for the same reason,
    that `ExtraChatPane.svelte` gives its scroll-follow effect.

    * **What these produce is not a VALUE.** A toast, a sound and an OS notification are events. There
      is nothing for `$derived` to hold: you cannot derive "the room played a sound". The docs name
      this case in as many words — an effect is for side effects, and lists "analytics" beside DOM
      work, which is exactly the shape of "tell the member something arrived".
    * **They are not event handlers either.** The trigger is a row ARRIVING from the server, which
      reaches this component as changed props after an `invalidateAll()`, not as a user gesture. There
      is no `onclick` to hang them on.
    * **Nine of the seventeen name a pure function** — `isMentionOf`, `alertPassesFilter`,
      `queueMicrotask` — which write nothing at all. The autofixer cannot see across the import and
      says so ("ignore this suggestion if you are sure"); these were checked, and they are pure.

    The one write worth defending on its own is `unreadQaAlertIds.add(…)` in the Q&A effect, because
    that IS shared state written from inside an effect. It is not derivable: "unread" means *arrived
    since this viewer last looked*, which is a fact about time and not a function of the current
    rows. The CLEARING half beside it looks derivable and deliberately is not folded in — it encodes
    a stated deviation from the capture (an alert stops flashing once nothing is unanswered), and
    splitting the pair across a `$derived` and an effect would put half a rule in each.
  */
  /**
   * Which chat messages are new since the popup last looked.
   *
   * `RoomOrderedArrivals`, not `RoomArrivals` — it marks a POSITION and re-seeds silently when the
   * marker has been trimmed away, and its `Row` is constrained to `{ id: unknown }` so the id stays
   * the opaque key `id-opacity-contract.test.ts` requires. The reasoning lives with the class.
   */
  const mentionArrivals = new RoomOrderedArrivals<(typeof data.messages)[number]>();

  /**
   * Which alerts are NEW since the last load — see `RoomArrivals` for why the three lists that ask
   * this question share one implementation, and why it is a plain class rather than a rune module.
   */
  const alertArrivals = new RoomArrivals<(typeof data.alerts)[number]>();

  /*
    ── THE PER-MESSAGE CHAT DING IS NOT HERE, AND THE COMMENT THAT SAID IT WAS QUOTED NOTHING ──

    A `chatArrivals` tracker stood here with this claim above it: *"app-chat plays `pling` for an
    incoming chat message under exactly this gate: `preferences.doNotDisturbOn ||
    (preferences.chatSoundOn && soundEffectsService.pling.play())`"*, and an effect below rang for
    every batch that satisfied it. Removed 2026-08-31, after reading **all eight** `pling.play()`
    sites in the bundle. There is no such gate at any of them. The one nearest that shape is the
    MENTION ring (byte 1,431,259), which is now where it belongs — in the mention effect above.

    What app-chat actually does on a non-mention message is a three-way choice, byte 1,431,911:

    ```js
    !preferences.doNotDisturbOn && preferences.chatSoundOn && (() => { const {followedUsers}=globals;
      try { followedUsers && Object.keys(followedUsers).length>0
            && followedUsers[e.avt].followChatStyle.playSound ? soundEffects.pling.play()
          : ( globals.playChatMessageSoundFor?.length>0 && hashEmail(user.email)!==e.avt
                && globals.playChatMessageSoundFor.includes(e.avt)
              || globals.sessData.dingOnNewMessage && hashEmail(user.email)!==e.avt
            ) && soundEffects.followed.play() } catch { … } })()
    ```

    a followed sender, a per-member list, or the room-wide ding — and silence otherwise. That rule
    is `#lib/chat-arrival-sound.ts` and it is ALREADY WIRED, on the SSE arrival in
    `room/events.svelte.ts:861-876`, where the sender's hash is in hand. So this effect was a
    SECOND, wrong copy layered on top of the right one: a room with `dingOnNewMessage` off and
    nobody followed — upstream's silent case — rang on every message, and a room with it on rang
    twice. One rule, one caller, and the caller is not this file.
  */

  function deliverAlert(alert: {
    senderName: string;
    senderEmailHash: string;
    senderAvatarUrl?: string | null;
    body: string;
    nonTrade?: boolean;
  }) {
    const delivery = resolveAlertDelivery(
      {
        senderName: alert.senderName,
        body: alert.body,
        nonTradeAlert: alert.nonTrade === true
      },
      {
        doNotDisturbOn: prefs.doNotDisturbOn,
        alertSoundOn: prefs.alertSoundOn,
        nonTradeSound: prefs.nonTradeSound,
        alertPopup: prefs.alertPopup,
        longerAlertPopup: prefs.longerAlertPopup
      }
    );
    if (!delivery) return;

    if (delivery.sound) playSoundEffect(delivery.sound);
    if (!delivery.toast) return;

    const { timeOut, ...toast } = delivery.toast;
    toasts.show(toast, timeOut);
    toasts.notify(
      delivery.toast.title,
      delivery.toast.message,
      alert.senderAvatarUrl,
      alert.senderEmailHash
    );
  }

  /**
   * The mention popup — `prefs.chatPopup`'s half of the reference's notification block.
   *
   * Driven off `data.messages` rather than off the SSE payload, and that is a deliberate security
   * choice rather than convenience. The chat event carries only `senderId`, `senderEmailHash` and
   * the CHANNEL — never the text — because `room` is a chat channel and can be an admin one; a
   * payload carrying message bodies would put admin chat on every subscriber's wire. The refetched
   * `data.messages` has already been filtered by the server for THIS viewer, so reading the text
   * from there cannot show anybody something they were not already entitled to see.
   *
   * An `$effect` because this IS a side effect — a toast and an OS notification — not a derivation.
   *
   * `RoomOrderedArrivals` owns which messages are new, and it is deliberately NOT `RoomArrivals`:
   * this marks a POSITION in the server's ordering and re-seeds silently when that marker has been
   * trimmed out of the newest page, where an identity set would announce the entire log. Both live
   * in `#lib/room/arrivals.ts`, next to each other, so nobody merges them. Arriving in a room with
   * fifty unread mentions is silent; only messages that appear afterwards pop.
   */
  $effect(() => {
    const fresh = mentionArrivals.fresh(data.messages);
    if (fresh.length === 0) return;

    /*
      `prefs.doNotDisturbOn ||` — the outer gate on the whole block, sound and popup alike.

      `chatPopup` is NOT part of it, and the sentence above said "sound and popup alike" while the
      next line returned on both. Byte 1,431,196:

      ```js
      preferences.doNotDisturbOn || (
        preferences.chatSoundOn && soundEffectsService.pling.play(),        // 1,431,259
        preferences.chatPopup && (alertService.info(e.txt, "Mention from @" + e.n, {enableHtml:!0}),
                                  window.Notification && Notification.requestPermission()…))
      ```

      Two SIBLING gates under one Do Not Disturb: `chatSoundOn` decides the sound, `chatPopup`
      decides the toast and the OS notification. Returning on `chatPopup` took the sound with it, so
      a member who had turned the popup off was never told they had been named at all.
    */
    if (prefs.doNotDisturbOn) return;

    const mentions = fresh.filter(
      (item) =>
        // Your own message is never a mention of you, whatever it says.
        item.senderId !== data.user.id &&
        isMentionOf(item.body, data.user.displayName, item.isAdmin === true)
    );
    if (mentions.length === 0) return;

    /*
      ONE ring for a batch, which is ours and is the same rule the alert delivery already applies:
      upstream handles `chatMsg` one frame at a time, so five mentions arriving together ring five
      times. `data.messages` reaches this component as a page, not as a frame, so the batch is what
      there is to respond to.
    */
    if (prefs.chatSoundOn) playSoundEffect('pling');
    if (!prefs.chatPopup) return;

    for (const item of mentions) {
      const title = `Mention from @${item.senderName ?? 'Unknown'}`;
      /*
        `alertService.info(e.txt, "Mention from @" + e.n, { enableHtml: !0 })` — byte 1431320 of
        `docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`. The reference passes the body as the
        toast TEXT and the title SECOND, and enables HTML because chat bodies carry markup.

        The citation is restored, not written: this comment has read `/*  — the reference passes…`
        since the commit that created it, with its subject missing and nothing left to say what
        "the reference" did. Recovered by reading the bundle at the offset above.
      */
      toasts.show({ kind: 'info', title, message: item.body, enableHtml: true });
      toasts.notify(title, item.body, null, item.senderEmailHash ?? '');
    }
  });

  /*
    A LIVE ALERT ARRIVES — the toast, the sound and the filter that suppresses both.

    Two block comments used to stand here and NEITHER described this effect. One explained where
    older chat pages come from; the other explained why the second chat column follows its own
    messages. Both had lost their code — the paging to `+page.server.ts:462-476`, the scroll-follow
    to `ExtraChatPane.svelte:220-250` on 2026-08-16 — and both came to rest on top of the alert
    filter, so a reader arriving here was told about chat scrolling and then shown alert delivery.
    Removed 2026-08-17, verified first that each one's reasoning survives at the reference given
    above, so this deletes a stale duplicate rather than the last copy of anything.
  */
  $effect(() => {
    const unseenAlerts = alertArrivals.fresh(data.alerts);
    if (unseenAlerts.length === 0) return;

    queueMicrotask(() => {
      /*
        THE ALERT FILTER, site one of three — the LIVE arrival, byte 1,004,533.

        This is a genuinely separate site from the paged log, not a duplicate of it, and the reason
        is where the reference puts its two `continue`s:

          if (sessData.modAlertFilterList?.trim()?.length > 0 &&
              Object.keys(user.alertFilterFor).length > 0) {
            P("filtered out alert for " + te.avt);
            if (preferences.showAlertsFrom && !user.alertFilterFor[te.avt]) continue;
            if (!preferences.showAlertsFrom && user.alertFilterFor[te.avt]) continue;
          }
          globals.alertsLog.push(te);
          appEventBus.emit("alertMsg", te);

        BOTH the push and the emit are skipped, so a filtered-out alert makes no toast and plays no
        sound. Filtering only at render — which `visibleAlerts` already does, and which is this
        room's equivalent of the push — would still have popped and beeped for every alert the
        reader asked not to see.

        The two `continue`s are one predicate: skip unless `showAlertsFrom ? selected : !selected`.
        That is `alertPassesFilter`, so it is called rather than re-derived here.

        Read inside the microtask, deliberately: the values are wanted as of DELIVERY, and reading
        them in the effect body would make the filter a dependency, so toggling it would re-run
        this and re-deliver alerts that already arrived.

        NOT reproduced: the reference logs "filtered out alert for …" BEFORE both conditionals, so
        it claims to have filtered every alert once a selection exists, including the ones it then
        keeps. That is a defect in a debug line, and there is no `P()` here to carry it.
      */
      for (const alert of unseenAlerts) {
        if (
          !alertPassesFilter({
            avatarHash: alert.senderEmailHash,
            alertFilterFor: alerts.filterFor,
            showAlertsFrom: alerts.showFrom,
            modAlertFilterListRaw: data.sessData?.modAlertFilterList
          })
        ) {
          continue;
        }
        deliverAlert(alert);
      }
    });
  });

  // A new Q&A entry notifies exactly the people the compiled roomscroller notifies:
  //
  //   if (s.uid !== globals.user.userXrefID && !r) {
  //     const f = s.isA ? 'answer' : 'question';
  //     for (let _ of o.qa) _.uid === globals.user.userXrefID && (
  //       preferences.doNotDisturbOn || (!l && preferences.qaSoundOn && soundEffectsService.qaAlert.play()),
  //       !l && preferences.alertPopup && alertService.info(
  //         `"${s.txt}" for alert: "${o.txt}" by ${o.n}`, `Alert ${f} from @${s.n}`)) }
  //   globals.user.isPresenter && ( ...the same... );
  //
  // so: never for your own post, otherwise every presenter plus anyone who has asked on that same
  // alert. `alertService.info` is the cyan `.toast-info` skin (background rgb(47, 150, 180)) and
  // `qaAlert` is clearly.mp3, which is why it sounds different from an alert's `cash`.
  const qaArrivals = new RoomArrivals<(typeof data.alertQuestions)[number]>();

  /*
    USM-08 / USM-09 / USM-10 — a reaction on something of mine. `#lib/room/reaction-notices.ts`
    holds the audiences, the two byte offsets and why Do Not Disturb is on the sound and not on the
    popup; `#lib/reaction-arrivals.ts` holds why a reaction is noticed by diffing two page loads
    rather than read off the frame.
  */
  /*
    NAMED `…Arrivals` rather than `chatReactions`, and the coverage gate is why: `chatReactions` is
    a REFERENCE COMMAND NAME on `feature-coverage-contract`'s absent list, and a local called that
    would have made the enumeration report a command this room does not implement. The scanner is
    right to be literal — that is what caught it — and the fix is the local's name, not the list.
  */
  const chatReactionArrivals = new ReactionArrivals();
  const questionReactionArrivals = new ReactionArrivals();
  const reactorName = (emailHash: string) =>
    roster.users.find((user) => user.emailHash === emailHash)?.displayName ?? 'Someone';

  /**
   * `OVL-07` — the notice is delivered ONCE PER ENTRY the viewer owns, and then once more to a
   * presenter. That is a repeat, and it is the reference's.
   *
   * Read whole at bundle bytes 1,408,880-1,410,100:
   *
   * ```js
   * const f = s.isA ? "answer" : "question";
   * for (let _ of o.qa)
   *   _.uid === globals.user.userXrefID && (
   *     doNotDisturbOn || (!l && qaSoundOn && qaAlert.play(), …),
   *     !l && alertPopup && info(`"${s.txt}" for alert: "${o.txt}" by ${o.n}`, `Alert ${f} from @${s.n}`),
   *     …);
   * globals.user.isPresenter && (          // ← the SAME body again, outside the loop
   *     doNotDisturbOn || (…), !l && alertPopup && info(…same two strings…), …);
   * ```
   *
   * This room resolved the audience ONCE — *"have I asked on this alert, or am I a presenter"* — and
   * delivered one notice. The two are the same for a member with one question and diverge sharply
   * otherwise.
   *
   * ## The amplification, stated plainly because it is severe
   *
   * A viewer with N of their own entries on an alert gets **N notices and N sounds** for one new
   * question or answer, and a PRESENTER with N gets **N + 1** — the loop runs for each, then the
   * presenter arm runs again unconditionally. A presenter who has answered five times on a busy
   * alert hears six dings for the sixth reply.
   *
   * That is upstream's behaviour and reproducing it is matching; "it would reproduce an upstream
   * defect" is not one of the four things that excuse a divergence. It is written here at this
   * length so the owner reads a sentence rather than discovering it from a room, and so that anybody
   * who later wants one notice per event knows they are choosing to diverge rather than fixing a bug
   * we introduced.
   *
   * The two arms are kept SEPARATE rather than collapsed to a count, because that is what the
   * capture does: the loop's guard is `uid === me` and the second arm's is `isPresenter`, and a
   * presenter who has asked nothing still gets exactly one.
   */
  function deliverQaNotice(question: (typeof data.alertQuestions)[number]) {
    if (question.senderId === data.user.id) return;

    const alert = data.alerts.find((item) => item.id === question.alertId);
    if (!alert) return;

    const senderIsPresenter = question.senderRole === 'staff' || question.senderRole === 'admin';
    const deliverOnce = () => {
      if (!prefs.doNotDisturbOn && prefs.qaSoundOn) playSoundEffect('qaAlert');
      if (!prefs.alertPopup) return;
      toasts.show({
        kind: 'info',
        title: `Alert ${senderIsPresenter ? 'answer' : 'question'} from @${question.senderName}`,
        message: `"${question.body}" for alert: "${alert.body}" by ${alert.senderName}`,
        enableHtml: false
      });
    };

    /* `for (let _ of o.qa) _.uid === globals.user.userXrefID && (…)` — once per entry I own. */
    for (const other of data.alertQuestions) {
      if (other.alertId === question.alertId && other.senderId === data.user.id) deliverOnce();
    }

    /* `globals.user.isPresenter && (…)` — the same body again, outside the loop. */
    if (isPresenter) deliverOnce();
  }

  $effect(() => {
    const questions = data.alertQuestions;

    /*
      THE ENTITLEMENT, and it gated nothing here until 2026-08-31.

      `updateAlertMsg` — the handler that raises every Q&A notice, sets the flash and plays the
      sound — opens with a refusal, byte 1,408,794:

      ```js
      if ("alerts" != this.logType || !this.appService.globals.sessData.hasQAOnAlerts) return;
      ```

      so in a room that never bought Q&A on alerts NOTHING below it runs: no toast, no `qaAlert`,
      and no `unreadQA` marker — that flag is set further down the same handler, past this return.
      This effect had no such gate, so a room without the entitlement still flashed alerts and rang
      for questions its own composer refuses to draw the button for
      (`qa-entitlement-contract.test.ts`, and `O(1, !e.isQAMsg && sessData.hasQAOnAlerts ? 1 : -1)`
      at byte 1,339,784).

      READ OFF `messageChrome`, not from `data.sessData`, and that is the whole reason the chrome
      exists: `buildMessageChrome` resolves `hasQAOnAlerts === true` once on the page and three
      components already read the answer. A second `data.sessData?.hasQAOnAlerts === true` here
      would be a second answer to the same question, which is the failure `room-message-chrome.ts`
      was written to end.
    */
    if (!messageChrome.hasQaOnAlerts) return;

    // The first pass is whatever was already stored when the page loaded, not news, and
    // `RoomArrivals` returns nothing for it — a reader opening the room gets no toast per
    // historical question.
    for (const question of qaArrivals.fresh(questions)) {
      // updateAlertMsg sets the marker for whoever receives the update, with no role check.
      unreadQaAlertIds.add(question.alertId);
      deliverQaNotice(question);
    }

    /* USM-09 and USM-10 — the same audience the question notice above goes to. */
    questionReactionNotice(
      questionReactionArrivals.changes(questions),
      {
        questions,
        viewerId: data.user.id,
        viewerEmailHash: data.user.emailHash,
        isPresenter,
        doNotDisturbOn: prefs.doNotDisturbOn,
        soundEnabled: prefs.qaReactionSoundOn,
        popupEnabled: prefs.reactionsPopupQA
      },
      { nameOf: reactorName, toasts, playSound: () => playSoundEffect('qaAlert') }
    );

    // DELIBERATE DEVIATION from the captured app, on an explicit product decision.
    //
    // Upstream the flash is purely an unread marker: the class binds to `msg.unreadQA` alone
    // (`ut(4, mge, (null == e.msg ? null : e.msg.unreadQA) || !1)` - `msg.ans` never appears in
    // it), it is set by updateAlertMsg on any Q&A update, and the only two things that clear it
    // are opening the modal (`openAlertQAModal`) and hiding it (`hidden.bs.modal`). Answering
    // clears nothing upstream; even app-alert-qa-modal, which handles answering, touches
    // `unreadQA` only in its hide handler.
    //
    // Here an alert stops flashing as soon as it has no unanswered question left, so the flash
    // reads as "someone is waiting on you" rather than "there is something you have not opened".
    // The two upstream clears still apply in the meantime.
    //
    // The priming pass used to `return` above this, so this ran from the SECOND pass onwards; it now
    // runs from the first. That is a no-op and not a behaviour change: `unreadQaAlertIds` is
    // declared empty and only ever filled by the loop directly above, so on the first pass there is
    // nothing to clear.
    const answered = [...unreadQaAlertIds].filter(
      (alertId) =>
        !questions.some((question) => question.alertId === alertId && !question.answeredAt)
    );
    for (const alertId of answered) unreadQaAlertIds.delete(alertId);
  });

  $effect(() => {
    /* USM-08 — MY messages only, and never my own reaction. See `reaction-notices.ts`. */
    chatReactionNotice(
      chatReactionArrivals.changes(data.messages),
      {
        messages: data.messages,
        viewerId: data.user.id,
        viewerEmailHash: data.user.emailHash,
        popupEnabled: prefs.reactionsPopup
      },
      { nameOf: reactorName, toasts }
    );
  });
</script>

<!-- One hidden sink per remote microphone. The reasoning travelled with the markup. -->
<RemoteAudioSinks {mediaTransport} />
<!--
  `app-rec-preview` — the server's recording preview card.

  It mounted inside `ModalHost` until 2026-09-01, which was the wrong layer twice over: it is not a
  modal, and that host has neither `media` nor `prefs`, so the card could not be given the four
  state terms its arming test needs. This component is defined as *"everything that floats above the
  room"* and already takes all three props whole, so the card asks nothing new of anybody.

  The card renders its markup unconditionally — the reference's template is unconditional, and the
  generated stylesheet scopes ten rules to `app-rec-preview`, which need an element to attach to.
  Whether it is ever SEEN is decided inside it, by the capture's own gate.
-->
<RecordingPreviewCard {media} {prefs} {isPresenter} />
<!--
  ── G03 — THE OVERLAY HAD ONLY ITS SUCCESS HALF ───────────────────────────────────────────────

  There are TWO elements on this class and this room had one of them:

  ```js
  function iRe(t,n){ 1&t && (d(0,"div",9), T(1,"i",37), v(2," Reconnecting Chat... "), u()) }
  O(7, o.appService.globals.socketConnected ? -1 : 7)          // byte 2,548,292
   9  [1,"notConnectedOverlay","animated","fadeIn"]            // the failure overlay
  10  ["id","connectedMsg",1,"notConnectedOverlay","animated","fadeIn"]   // the 3s success flash
  37  [1,"fas","fa-cog","fa-spin"]
  ```

  So a member whose chat connection dropped saw nothing at all, and then — once it came back — a
  three-second tick saying "Conected" for a failure they were never told about. The half that was
  built is the half nobody needs.

  `roomEvents.connected` is `socketConnected`'s counterpart and starts FALSE, so this is on screen
  during the first connect too. That is upstream's own behaviour: `globals.socketConnected` is never
  initialised, only assigned, so it is `undefined` until the socket opens. Gating on
  `hasConnectedBefore` as well would read better and would be OURS, and the wording is the
  reference's own — a room whose chat has not connected yet IS a room whose chat is connecting.

  " Reconnecting Chat... " keeps its leading and trailing spaces, written as an expression because
  Svelte normalises whitespace at element boundaries.

  ── AND THE SUCCESS FLASH HAD ITS TWO CHILDREN THE WRONG WAY ROUND ───────────────────────────

  ```js
  d(8,"div",10), T(9,"i",11), v(10," Conected\n"), u()               // byte 2,547,023
  11  [1,"fas","fa-check"]
  ```

  `T` is `ɵɵelement` and `v` is `ɵɵtext`, so the ORDER is tick then sentence, and the sentence
  opens with the space that separates them. This read `Conected<i class="fas fa-check"></i>` until
  2026-08-31 — the tick trailing the word, and no space anywhere, which is why the two ran
  together. Both halves come from the same four instructions and neither is a preference.
-->
{#if !roomEvents.connected}
  <div class="notConnectedOverlay animated fadeIn">
    <i class="fas fa-cog fa-spin"></i>{' Reconnecting Chat... '}
  </div>
{/if}
<div
  id="connectedMsg"
  class="notConnectedOverlay animated fadeIn"
  style={roomEvents.reconnectedFlash ? 'display: block;' : 'display: none;'}
>
  <i class="fas fa-check"></i>{' Conected\n'}
</div>
<!-- The close message takes NO new prop: `data`, `dialogs` and `prefs` are already here. The rule,
     and the six callbacks deleted under it on 2026-08-18, are in the props docblock above. -->
<!--
  The room's own favicon and stylesheet, applied on `globalsLoaded` upstream (byte 2,594,998). Here
  rather than on the page because this component already holds `data`; `RoomBranding` explains why
  two of its three pieces are `<svelte:head>` and the other two are done by hand.
-->
<RoomBranding
  customFaviconURL={data.sessData?.customFaviconURL}
  customCSS={data.sessData?.customCSS}
/>
<ModalHost
  name={modals.modal}
  mediaIceServers={media.iceServers}
  {mobilePin}
  {mobileAppAvailable}
  {onrestoremobiletokens}
  modAlertFilterList={data.sessData?.modAlertFilterList}
  stickyNonTradeAlert={data.sessData?.styckyNonTradeAlert === true}
  schedulerAvailable={data.sessData?.hasAlertScheduler === true}
  bind:alertFilterFor={alerts.filterFor}
  bind:showAlertsFrom={alerts.showFrom}
  onsavealertfilter={saveAlertFilter}
  onopenalertfilter={() => modals.open('alert-filter')}
  mobileAndroidUrl={data.sessData?.customMobileAppEnabled
    ? data.sessData?.customMobileAppAndroidUrl
    : null}
  mobileIosUrl={data.sessData?.customMobileAppEnabled ? data.sessData?.customMobileAppIOSUrl : null}
  hideMobileCredentials={Boolean(data.sessData?.hideMobileCredentials)}
  isLimitedPresenter={media.limitedPresenter}
  hasMic={data.user.hasMic === true}
  {captionsAvailable}
  canEditUsername={Boolean(data.sessData?.allowUsersToChangeUsername)}
  alertSearchFilter={feeds.alertSearchFilter}
  {chatMode}
  closedMessage={data.closedMessage ?? ''}
  onChatModeChange={(mode) => void changeChatMode(mode)}
  onSaveCloseMessage={(message, then) =>
    void saveCloseMessageThen(message, then, { dialogs, savePreference: prefs.save })}
  canUseRTE={composer.canUseRTE}
  rteDraft={composer.rteDraft}
  rteIsEditing={composer.rteIsEditing}
  onRteDraftChange={(html) => (composer.rteDraft = html)}
  onRteSend={() => void composer.sendRTE()}
  settingsTab={modals.settingsTab}
  alertTab={modals.alertTab}
  {theme}
  roomSplitDir={split.direction}
  sessionControlInitialTab={modals.sessionControlInitialTab}
  chatStyle={globalChatStyle}
  doNotDisturbOn={prefs.doNotDisturbOn}
  alertSoundOn={prefs.alertSoundOn}
  nonTradeSound={prefs.nonTradeSound}
  alertPopup={prefs.alertPopup}
  longerAlertPopup={prefs.longerAlertPopup}
  qaSoundOn={prefs.qaSoundOn}
  chatSoundOn={prefs.chatSoundOn}
  smallImagePreview={prefs.smallImagePreview}
  defaultImagePreview={prefs.defaultImagePreview}
  pollOpenMode={polls.openMode}
  pollRestoreToken={polls.restoreToken}
  activePoll={data.activePoll}
  savedPolls={data.savedPolls}
  onclose={() => modals.closeActive()}
  onSettingsTab={(tab) => (modals.settingsTab = tab)}
  onAlertTab={(tab) => (modals.alertTab = tab)}
  onTheme={(next) => modals.setTheme(next)}
  onPreferenceChange={(key, value) => prefs.save(key, value)}
  restreamUrl={data.sessData?.restreamToURL}
  onSaveRestreamUrl={(url) => void saveRestreamUrlThen(url, { dialogs })}
  saveData={mediaTransport.saveData}
  onSaveDataChange={(enabled) => mediaTransport.setSaveData(enabled)}
  onDoNotDisturbChange={(enabled) => (prefs.doNotDisturbOn = enabled)}
  onPlayYoutube={(url) => void broadcasts.playYoutubeForAll(url)}
  onPostAlert={(submission) => composer.postAlert(submission)}
  onPastePostAlert={(submission) => composer.postPastedImage(submission)}
  onPollMinimize={() => modals.minimizePoll()}
  onPollSave={(question, choices) => modals.savePoll(question, choices)}
  onPollDelete={(pollId) => modals.deleteSavedPoll(pollId)}
  onPollSend={(question, choices) => modals.sendPoll(question, choices)}
  onPollAnswer={(choiceIndex) => modals.sendPollAnswer(choiceIndex)}
  onPollPostResults={(body) => composer.postPollResults(body)}
  onPollEnd={() => modals.pollDone()}
  onAlert={(message) => (dialogs.alert = message)}
  onConfirm={(message, onconfirm) => dialogs.confirm(message, onconfirm)}
  onReplySend={messageActions.sendReplyMessage}
  onQuestionSend={messageActions.sendAlertQuestion}
  {canPostImages}
  onQaImageUpload={() => messageActions.qaImage.beginUpload()}
  onQaImagePaste={(file, draft) => messageActions.qaImage.begin(file, draft)}
  onReplyImageUpload={() => messageActions.replyImage.beginUpload()}
  onReplyImagePaste={(file, draft) => messageActions.replyImage.begin(file, draft)}
  onQaAlertBodyAction={(action, payload) => {
    /*
      `QAM-10` — the header card's body acts on the ALERT, and the full `MessageActionItem` lives
      here rather than inside the modal. `selected` is what `targetMessage` already is, so this is
      the same row the card is rendering; the guard is for the window between a close and the next
      open, which `Modal` keeps mounted.
    */
    const alert = messageActions.selected;
    if (alert) messageActions.handle('alert', action, alert, payload);
  }}
  alertQuestions={data.alertQuestions}
  {messageChrome}
  {presenterColors}
  {alertLabels}
  {alertsDisplayMode}
  {chatLogDisplayMode}
  {onDisplayModeChange}
  onQaAction={(action, item, payload) =>
    messageActions.handle('alert', action, item, payload, false, 'qa')}
  onMentionUser={(name) => messageActions.mentionFromUserModal(name)}
  onPrivateChat={(user) => {
    userActions.selectedMessageUser = user;
    privateChat.show();
  }}
  onFollowToggle={(user) => userActions.requestFollowToggle(user)}
  onFollowStyleChange={(user, style) => userActions.applyFollowStyle(user, style)}
  onMuteToggle={(user) => userActions.requestMuteToggle(user)}
  onUserAction={(action, user) => userActions.handle(action, user)}
  userNotes={userActions.userNotes}
  onSavePermissions={(user, granted) => userActions.savePermissions(user, granted)}
  streamingType={typeof prefs.loaded.streamingType === 'string' ? prefs.loaded.streamingType : ''}
  capture={captureSettingsFrom(prefs.loaded)}
  viewerAlerts={viewerAlertPrefsFrom(data.sessData, prefs)}
  onManagedUserRemoval={(list, user) => userActions.requestManagedRemoval(list, user)}
  onManagedUserInfo={(user) => userActions.openManagedInfo(user)}
  currentUser={data.user}
  targetBadges={feeds.badgesFor(userActions.target.emailHash)}
  targetUser={userActions.target}
  debugLog={debugLog.received}
  onUploadProfilePicture={(user, file) => userActions.uploadProfilePicture(user, file)}
  onRemoveProfilePicture={(user) => userActions.removeProfilePicture(user)}
  room={data.room}
  canPrivateChat={canShowRosterPrivateChat(
    {
      isPresenter,
      userPmEnabled: data.sessData?.userPM,
      userToPresenterPmEnabled: data.sessData?.userToPresenterPM,
      currentUserIsTrial: data.user.isFT,
      disablePmForTrials: data.sessData?.disablePMForTrials
    },
    {
      id: userActions.target.id,
      permissions: userActions.target.permissions,
      hasAdminChat: userActions.target.hasAdminChat
    }
  )}
  privateMessageHistoryEnabled={data.sessData?.enablePrivateMessageHistory === true}
  onShowPrivateMessages={(user) => {
    modals.open('all-private');
    void privateChat.peerHistory.show(user.id);
  }}
  peerHistory={privateChat.peerHistory}
  mutedUsers={userActions.mutedUsers}
  followedUsers={userActions.followedUsers}
  targetMessage={messageActions.selected}
/>
<!--
  `onImagePaste(event)` on the CHAT composer — byte 1,427,208, whose handler is at 1,445,719.

  The reference's confirmation is a `bootbox.confirm` carrying a preview `<img>` and a textarea
  seeded with whatever was already in the composer, and the message that textarea holds is what
  travels with the image. The two alert forms below already have this shape for their own pastes;
  chat — the surface a member actually uses — had no `paste` binding at all until 2026-08-30
  (`acA-02`).

  `ImagePasteConfirm` and not `ImageUploadDialog`, deliberately: the file is already chosen, and a
  dialog whose top half is a drop zone would invite a viewer to replace the thing they just pasted.
  The dialog itself was three transcriptions of one control here until 2026-08-31; that file
  carries the argument, and the textarea below is the only thing that differs between them.
-->
{#if composer.pastedImage}
  {const chatPastePreviewUrl = $derived(composer.pastedImage.previewUrl)}
  <ImagePasteConfirm
    previewUrl={chatPastePreviewUrl}
    onclose={() => composer.cancelImagePaste()}
    onconfirm={() => void composer.confirmImagePaste()}
  >
    <div class="w-100 mt-3">
      <!-- `id="msg-text"`, `rows="2"` and the placeholder are the reference's own, byte 1,445,719. -->
      <textarea
        class="form-control w-100"
        rows="2"
        id="msg-text"
        name="msg-text"
        placeholder="Enter your message"
        bind:value={composer.pastedImageMessage}></textarea>
    </div>
  </ImagePasteConfirm>
{/if}
{#if modals.modal === 'image-upload'}
  <ImageUploadDialog
    onclose={() => (modals.modal = null)}
    onupload={(files, message) => void composer.uploadImages(files, message)}
  />
{/if}
<!--
  `imgUpload()` from the PRIVATE composer — G1, and a third instance for the reason the note below
  gives: a private image routed through the chat composer's handler would be posted into the ROOM.
-->
{#if privateChat.imageUpload}
  <ImageUploadDialog
    onclose={() => privateChat.cancelImageUpload()}
    onupload={(files) => void privateChat.completeImageUpload(files)}
  />
{/if}
<!--
  `QAM-05` / `QAM-06` — the Q&A thread's OWN upload and paste dialogs, and they are its own for the
  sharpest version of the reason the others are separate.

  `doImggurUpload` on `app-alert-qa` (byte 2,338,987) ends in
  `sendAlertQAReply(qaMsg._id, imggurUploadTxt)` and then `yi("#alertQAModal").modal("hide")`. The
  register's prescribed fix for `QAM-05` was `composer.openImageUpload()` — the CHAT path — which
  would have posted a presenter's answer to one member's question into the room's public chat.
-->
{#if messageActions.qaImage.uploadOpen}
  <ImageUploadDialog
    onclose={() => messageActions.qaImage.cancelUpload()}
    onupload={(files) => void messageActions.qaImage.complete(files)}
  />
{/if}
<!--
  `RPL-02` / `RPL-03` — the REPLY modal's own pair, and a SIXTH instance of this dialog for exactly
  the reason the five above are separate. `doImggurUpload` on `app-reply-modal` (byte 2,322,349) ends
  in `sendChatReply(msg.c, imggurUploadTxt, msg.txt, msg.n, msg._id, null)` and then
  `$("#replyModal").modal("hide")` — a public reply against one message, which is neither the Q&A
  thread's destination nor chat's.

  The textarea id is `msg-text-reply` (byte 2,323,720), one word from the other four.
-->
{#if messageActions.replyImage.uploadOpen}
  <ImageUploadDialog
    onclose={() => messageActions.replyImage.cancelUpload()}
    onupload={(files) => void messageActions.replyImage.complete(files)}
  />
{/if}
{#if messageActions.replyImage.pasted}
  {const replyPastePreviewUrl = $derived(messageActions.replyImage.pasted.previewUrl)}
  <ImagePasteConfirm
    previewUrl={replyPastePreviewUrl}
    onclose={() => messageActions.replyImage.cancel()}
    onconfirm={() => void messageActions.replyImage.confirm()}
  >
    <div class="w-100 mt-3">
      <textarea
        class="form-control w-100"
        rows="2"
        id="msg-text-reply"
        name="msg-text-reply"
        placeholder="Enter your message"
        bind:value={messageActions.replyImage.message}></textarea>
    </div>
  </ImagePasteConfirm>
{/if}
{#if messageActions.qaImage.pasted}
  {const qaPastePreviewUrl = $derived(messageActions.qaImage.pasted.previewUrl)}
  <ImagePasteConfirm
    previewUrl={qaPastePreviewUrl}
    onclose={() => messageActions.qaImage.cancel()}
    onconfirm={() => void messageActions.qaImage.confirm()}
  >
    <div class="w-100 mt-3">
      <!-- `id="msg-text-qa"` — byte 2,339,887. One character from the chat and private copies. -->
      <textarea
        class="form-control w-100"
        rows="2"
        id="msg-text-qa"
        name="msg-text-qa"
        placeholder="Enter your message"
        bind:value={messageActions.qaImage.message}></textarea>
    </div>
  </ImagePasteConfirm>
{/if}
<!--
  `PCC-06` — the PASTE confirmation for the same conversation, and a FOURTH instance of this dialog
  for the reason the three above are separate: `onImagePaste` at byte 2,212,274 ends in
  `doImggurUpload(s, c)` on `app-privchat`, which sends through `sendPrivChat`. Routing a private
  paste through the chat composer's handler would post the screenshot into the ROOM.

  The textarea is the reference's own, and its id is the one thing that differs from the chat copy
  above: `msg-text-pc`, not `msg-text`. Both are seeded with their own composer's trimmed text.
-->
{#if privateChat.pastedImage}
  {const pmPastePreviewUrl = $derived(privateChat.pastedImage.previewUrl)}
  <ImagePasteConfirm
    previewUrl={pmPastePreviewUrl}
    onclose={() => privateChat.cancelImagePaste()}
    onconfirm={() => void privateChat.confirmImagePaste()}
  >
    <div class="w-100 mt-3">
      <textarea
        class="form-control w-100"
        rows="2"
        id="msg-text-pc"
        name="msg-text-pc"
        placeholder="Enter your message"
        bind:value={privateChat.pastedImageMessage}></textarea>
    </div>
  </ImagePasteConfirm>
{/if}
<!--
  `imgUpload('swing')` — the swing form's own upload dialog.

  A SECOND instance rather than a share of the composer's `modal === 'image-upload'`: the
  reference's `imgUpload` takes the feature name as an argument and opens a dialog whose
  completion belongs to that feature, and routing the swing upload through the composer's
  handler would post the image into chat instead of putting its URL in the form.
-->
{#if swingAlerts.imageUpload}
  <ImageUploadDialog
    onclose={() => swingAlerts.cancelImageUpload()}
    onupload={(files) => void swingAlerts.completeImageUpload(files)}
  />
{/if}
<!--
  `onImagePaste(event, 'swing')` puts the pasted image in a `bootbox.confirm` before uploading,
  so a stray paste cannot silently push bytes to the upload server.
-->
{#if swingAlerts.imagePaste}
  {const pastePreviewUrl = $derived(swingAlerts.imagePaste.previewUrl)}
  <ImagePasteConfirm
    previewUrl={pastePreviewUrl}
    onclose={() => swingAlerts.closeImagePaste()?.resolve(null)}
    onconfirm={() => void swingAlerts.confirmImagePaste()}
  />
{/if}
<!--
  `imgUpload('dayTrade')` — the day trade form's own upload dialog.

  A THIRD instance rather than a share of the composer's or the swing form's: `imgUpload` takes
  the feature name as an argument and `doImggurUpload` dispatches on it deny-by-default —
  `"swing" === i ? swingAlert.image = F : "dayTrade" === i && (dayTradeAlert.image = F)` at byte
  1,992,037 — so the completion belongs to exactly one feature. Routing this through either of
  the others would put the URL in the wrong box or post the image into chat.
-->
{#if dayTradeAlerts.imageUpload}
  <ImageUploadDialog
    onclose={() => dayTradeAlerts.cancelImageUpload()}
    onupload={(files) => void dayTradeAlerts.completeImageUpload(files)}
  />
{/if}
<!--
  `onImagePaste(event, 'dayTrade')` puts the pasted image in a `bootbox.confirm` before
  uploading, so a stray paste cannot silently push bytes to the upload server.
-->
{#if dayTradeAlerts.imagePaste}
  {const dayTradePastePreviewUrl = $derived(dayTradeAlerts.imagePaste.previewUrl)}
  <ImagePasteConfirm
    previewUrl={dayTradePastePreviewUrl}
    onclose={() => dayTradeAlerts.closeImagePaste()?.resolve(null)}
    onconfirm={() => void dayTradeAlerts.confirmImagePaste()}
  />
{/if}
{#if composer.pendingGifUrl}
  <GifConfirmDialog
    url={composer.pendingGifUrl}
    onclose={() => composer.cancelGif()}
    onconfirm={() => void composer.confirmGif()}
  />
{/if}
{#if dialogs.confirmation}
  <BootboxDialog
    mode="confirm"
    message={dialogs.confirmation.message}
    className={dialogs.confirmation.className}
    confirmLabel={dialogs.confirmation.confirmLabel ?? 'OK'}
    confirmClassName={dialogs.confirmation.confirmClassName ?? 'btn-primary'}
    cancelLabel={dialogs.confirmation.cancelLabel ?? 'Cancel'}
    cancelClassName={dialogs.confirmation.cancelClassName ?? 'btn-secondary btn-default'}
    onclose={() => {
      const dismissed = dialogs.confirmation?.ondismiss;
      dialogs.confirmation = null;
      dismissed?.();
    }}
    onconfirm={dialogs.confirmation.onconfirm}
  />
{/if}
<!--
  `randomUser()`'s dialog. Two phases, because the delay IS the feature: the giphy spinner
  shows for three seconds with "User Info" hidden, then the body is replaced by
  `<h2 class="text-center flash animated">` carrying the name and the button appears
  (`$(".btn-random-user").css("display", "inline-block")`).

  `alt=""` and `class="random-user-modal"` are the capture's own. The image is fixed 480x270 so
  the dialog does not resize around it as it loads.
-->
{#if roster.pick}
  <BootboxDialog
    mode="alert"
    message=""
    title="Random User"
    className="random-user-modal"
    onclose={() => roster.closeDraw()}
  >
    {#if roster.pick.revealed}
      <h2 class="text-center flash animated">{roster.pick.entry.displayName}</h2>
    {:else}
      <p class="text-center">
        <img
          src="https://media.giphy.com/media/dyXPQavQUyeSK4nlpt/giphy.gif"
          alt=""
          width="480"
          height="270"
        />
      </p>
    {/if}
    {#snippet footer()}
      <!--
        The User Info handler ends in `!0` inverted - it returns `false`, which is bootbox's
        "do not dismiss". So the dialog stays open behind the user-info modal.
      -->
      {#if roster.pick?.revealed}
        <button
          type="button"
          class="btn btn-warning btn-random-user"
          onclick={() => roster.pick && userActions.openInfoFor(roster.pick.entry)}
        >
          User Info
        </button>
      {/if}
      <button type="button" class="btn btn-danger" onclick={() => roster.closeDraw()}>Close</button>
    {/snippet}
  </BootboxDialog>
{/if}
{#if dialogs.alert}
  <BootboxDialog mode="alert" message={dialogs.alert} onclose={() => dialogs.dismissAlert()} />
{/if}
{#if dialogs.prompt}
  <BootboxDialog
    mode="prompt"
    title={dialogs.prompt.title}
    value={dialogs.prompt.value}
    options={dialogs.prompt.options}
    message={dialogs.prompt.message ?? ''}
    onclose={() => (dialogs.prompt = null)}
    onconfirm={(value) => dialogs.prompt?.onconfirm(value ?? '')}
  />
{/if}
<ToastHost
  toasts={toasts.notices}
  ondismiss={(id) => toasts.dismiss(id)}
  onstick={(id) => toasts.stick(id)}
  onresume={(id) => toasts.resume(id)}
/>
{#if modals.selectedImageUrl}
  <ImageLightbox url={modals.selectedImageUrl} onclose={() => (modals.selectedImageUrl = null)} />
{/if}
