import { DEFAULT_ALERT_DELIVERY_PREFERENCES } from '$lib/alert-delivery';
import { mirrorPreferenceToLocalStorage } from '$lib/dead-preference-keys';

/*
  Every preference this VIEWER owns, and the one write path that persists them.

  Phase 5 slice 3, and the widest of the three service slices: 27 preferences that were declared
  across eleven hundred lines of `+page.svelte`, from `doNotDisturbOn` at 742 to `pushToTalk` at
  1853, with the function that writes them sitting two thousand lines below the values it assigns.

  ## The invariant this makes STRUCTURAL, which is the point rather than the line count

  Twenty-five of the twenty-seven have NO public setter. That is not tidiness — before this, any code
  anywhere in the page could write `chatGif = true` and the preference would change on screen and
  never reach the server, because persistence lived in a separate function nobody was obliged to
  call. Now the only way in is {@link save}, which mirrors, assigns and persists in one place.

  The two that keep a setter are the two the room genuinely writes without persisting, and both are
  transient by the reference's own design: `doNotDisturbOn` (the private-chat toolbar's `setDND`
  flips the flag and calls no `setPreference`, unlike every neighbouring handler) and `subtitles`
  (`setMasterVolume` forces it on at zero volume). Anything else that needs to change a preference
  has to go through the write path, and there is no longer an expression that lets it not.

  ## The initialisers are byte-exact

  Every seeding expression below is the one that was in the page, moved rather than retyped, with its
  comment. `svelte/$state` permits `this.#x = $state(...)` as the first assignment in a
  constructor, so the transformation was `let x = ` to `this.#x = ` and nothing else — which
  matters, because these comments carry the polarity reasoning (`!== false` against `=== true`)
  that has already caused two defects in this room when it was guessed at instead of read.

  ## What this class deliberately does NOT own

  Two branches of the old `savePreference` are not preferences and are handed back through
  {@link RoomPrefsHooks.onSideEffect}: `chatStyle` writes the room's chat rendering style and
  `roomSplitDir` re-seeds the split geometry. Folding those in would make a preferences class the
  owner of the room's layout, which is how a module stops having a boundary.

  The server write is injected for the same reason and one more: it keeps a route-level remote
  function out of `$lib`, and it makes {@link save} testable without mocking the wire.
*/

/** What decodes out of `settings_json` — arbitrary keys, so every read narrows before use. */
export type LoadedSettings = Record<string, unknown>;

export interface RoomPrefsHooks {
  /** The server write. Injected so this class needs no route import and `save` stays testable. */
  persist: (key: string, value: unknown) => void;
  /**
   * The two branches of the write path that are NOT preferences — `chatStyle` and `roomSplitDir`.
   * Called after the snapshot is mirrored and before the boolean cases, which is where they ran.
   */
  onSideEffect?: (key: string, value: unknown) => void;
}

/**
 * `settings_json` as it comes back from the server.
 *
 * Deliberately forgiving about the SHAPE and strict about the type: anything that is not a plain
 * object decodes to `{}`, so a corrupt blob costs a viewer their preferences and never the room.
 */
export function decodeSettingsJson(value: string | null | undefined): LoadedSettings {
  try {
    const parsed: unknown = JSON.parse(value ?? '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as LoadedSettings)
      : {};
  } catch {
    return {};
  }
}

export class RoomPrefs {
  readonly #loaded: LoadedSettings;
  readonly #hooks: RoomPrefsHooks;
  #doNotDisturbOn;
  #alertSoundOn;
  #nonTradeSound;
  #popupOnUserJoin;
  #popupOnUserLeave;
  #beepOnUserJoin;
  #beepOnUserLeave;
  #trimChatLogs;
  #chatPopup;
  #chatBadges;
  #chatGif;
  #makeUsersFollowMyScreens;
  #alwaysScrollToBottom;
  #recordingStartSound;
  #recordingStopSound;
  #enableRTE;
  #extraChatColumn;
  #visibilityChangeEnabled;
  #alertPopup;
  #longerAlertPopup;
  #qaSoundOn;
  #chatSoundOn;
  #subtitles;
  #doSpeechReco;
  #soundChecks;
  #pushToTalk;
  #videoDisabled;

  constructor(settingsJson: string | null | undefined, hooks: RoomPrefsHooks) {
    this.#hooks = hooks;
    /* The decoded blob is kept because ~40 reads in the page are NOT preferences — the saved
       nick, the streaming type, the device id, the presenter volume maps. They read it through
       {@link loaded}. */
    const loadedSettings = decodeSettingsJson(settingsJson);
    this.#loaded = loadedSettings;

    // The deployed client seeds this global flag from the per-session preferences object.
    // Its direct DND controls toggle the flag without calling setPreference.
    this.#doNotDisturbOn = $state(
      typeof loadedSettings.doNotDisturbOn === 'boolean'
        ? loadedSettings.doNotDisturbOn
        : DEFAULT_ALERT_DELIVERY_PREFERENCES.doNotDisturbOn
    );

    this.#alertSoundOn = $state(
      typeof loadedSettings.alertSoundOn === 'boolean'
        ? loadedSettings.alertSoundOn
        : DEFAULT_ALERT_DELIVERY_PREFERENCES.alertSoundOn
    );

    this.#nonTradeSound = $state(
      typeof loadedSettings.nonTradeSound === 'boolean'
        ? loadedSettings.nonTradeSound
        : DEFAULT_ALERT_DELIVERY_PREFERENCES.nonTradeSound
    );

    /**
     * `preferences.recordingStartSound` / `recordingStopSound` - whether this listener hears the room
     * start and stop media.recording. Both default ON: the capture's checks are
     * `!doNotDisturbOn && preferences.recordingStartSound && ...`, so an unset preference would
     * silence a cue the room is meant to give everyone.
     */
    /**
     * The four per-viewer halves of the join/leave gates (`app-room.full.js:2137-2153`).
     *
     * Default ON, for the same reason `recordingStartSound` does: the reference's checks are
     * `sessData.X && preferences.Y && …`, so an unset preference would silence a cue the ROOM has
     * been configured to give. The room setting is the off switch; the preference is the override.
     */
    this.#popupOnUserJoin = $state(loadedSettings.popupOnUserJoin !== false);

    this.#popupOnUserLeave = $state(loadedSettings.popupOnUserLeave !== false);

    this.#beepOnUserJoin = $state(loadedSettings.beepOnUserJoin !== false);

    this.#beepOnUserLeave = $state(loadedSettings.beepOnUserLeave !== false);

    /**
     * `preferences.chatBadges` — the VIEWER's half of the badge gate, distinct from the owner's
     * `enableBadges`. Ships `!0`, so `!== false`.
     */
    /**
     * `preferences.chatPopup` — a toast and a browser notification when somebody mentions you.
     *
     * `!doNotDisturbOn && chatPopup` upstream, sitting beside the sound in the same block:
     * `doNotDisturbOn || (chatSoundOn && pling.play(), chatPopup && (alertService.info(…), new
     * Notification(…)))` (`main.d6d3c112b59b7d0d.js` byte 1431308). The sound half has been here since
     * the SSE handler was written; this is the other half.
     *
     * `!== false`, because the blob ships it on with its siblings and a viewer who has never opened
     * the settings modal should be told when they are addressed by name.
     */
    /**
     * `preferences.trimChatLogs` — "Reduce chat log memory", the settings modal's own label.
     *
     * `!== false`: the blob ships it ON, and it is the safer default in a room this one cannot bound
     * — see the note on `visibleChatMessages`. Upstream trims one message per arrival; ours caps the
     * derived view, which reaches the same steady state and also bounds the DOM.
     */
    this.#trimChatLogs = $state(loadedSettings.trimChatLogs !== false);

    this.#chatPopup = $state(loadedSettings.chatPopup !== false);

    this.#chatBadges = $state(loadedSettings.chatBadges !== false);

    /**
     * `preferences.chatGif` — whether inline gifs play or show a click-to-reveal placeholder.
     *
     * `!== false`, because the blob ships `prefs.chatGif:!0`. A viewer who has never touched the checkbox
     * gets gifs, which is what the reference does; `=== true` would mute them for everybody.
     */
    this.#chatGif = $state(loadedSettings.chatGif !== false);

    /**
     * `preferences.makeUsersFollowMyScreens` — when this presenter changes screen tab, take the room
     * with them.
     *
     * `i && globals.isPresenter && preferences.makeUsersFollowMyScreens && this.bringFocusToScreen(…)`
     * at the end of `onScreenShareTabChange` (`main.d6d3c112b59b7d0d.js` byte 1967413). `i` defaults
     * true and is passed false for programmatic changes, which is the loop guard: receiving a focus
     * command must not send one back.
     *
     * `=== true` — the blob ships `prefs.makeUsersFollowMyScreens:!1` (byte 980006). A presenter who has
     * never touched it should not be dragging the room around by clicking their own tabs.
     */
    this.#makeUsersFollowMyScreens = $state(loadedSettings.makeUsersFollowMyScreens === true);

    /**
     * `preferences.alwaysScrollToBottom` — the chat's "always scroll to bottom" override.
     *
     * `=== true`, not `!== false`, and the difference is the reference's own default: the preferences
     * blob ships `prefs.alwaysScrollToBottom:!1` (`main.d6d3c112b59b7d0d.js` byte 979602). Seeding it ON for
     * anyone who has never touched the checkbox would drag a reader out of the history they are
     * scrolled up into — the opposite of the mistake made with `showSpeechRecoOverlay`, where
     * `=== true` wrongly disabled a feature that defaults ON. The default decides which comparison is
     * correct; neither is a house style.
     *
     * PERSISTED, unlike `saveData`: `chatAlwaysScrollToBottomChange` calls
     * `setPreference('prefs.alwaysScrollToBottom', …)` (byte 2246247).
     */
    this.#alwaysScrollToBottom = $state(loadedSettings.alwaysScrollToBottom === true);

    this.#recordingStartSound = $state(loadedSettings.recordingStartSound !== false);

    this.#recordingStopSound = $state(loadedSettings.recordingStopSound !== false);

    /**
     * `preferences.enableRTE` — the presenter's own half of the rich text editor gate.
     *
     * Defaults OFF, and that polarity is read rather than chosen: the reference's default preferences
     * object lists twenty-five keys and `enableRTE` is not one of them, so a fresh account evaluates
     * the gate on `undefined`. Its neighbours here that DO appear in that object are written to match
     * it — `pushToTalk:!1` and `makeUsersFollowMyScreens:!1` are both `=== true` for the same reason.
     */
    this.#enableRTE = $state(loadedSettings.enableRTE === true);

    /**
     * `preferences.extraChatColumn` — the second chat column.
     *
     * Defaults OFF, read rather than chosen: it is absent from the reference's twenty-five default
     * preferences, exactly like `enableRTE`, so a fresh account evaluates the gate on `undefined`.
     */
    this.#extraChatColumn = $state(loadedSettings.extraChatColumn === true);

    /**
     * `preferences.visibilityChangeEnabled`, and `globals.appHasFocus` — pause chat work while the
     * tab is hidden, catch up when it comes back.
     *
     * ```js
     * document.hidden
     *   ? (globals.appHasFocus = !1, unloadRoster())
     *   : (globals.appHasFocus = !0, …, guiEventBus.emit('appHasFocusGetChatLog'),
     *      preferences.extraChatColumn && guiEventBus.emit('appHasFocusGetChatLogExtraChatColumn'))
     * ```
     *
     * ## Why this matters MORE here than upstream
     *
     * Upstream a hidden tab merely stops appending to an in-memory array. This room re-reads its chat
     * log from the server on every SSE event, so a hidden tab was doing a full page load per message
     * posted in the room. That is the cost this removes.
     *
     * ## The ROSTER half is deliberately not reproduced
     *
     * `unloadRoster()` / `loadRoster()` gate a five-second POLL. This roster is SSE-pushed, so gating
     * it the same way would make a hidden tab hold a stale roster for anyone who has not opted in —
     * strictly worse than doing nothing. Recorded in item AA before this was built and still true.
     *
     * ## Mentions are never paused
     *
     * `visibilityChangeEnabled && !appHasFocus ? te.isMention && emit('chatMsg', te) : push(...)` —
     * the hidden branch still surfaces a mention. A feature that silences the one message addressed
     * to you by name is not a saving.
     */
    this.#visibilityChangeEnabled = $state(loadedSettings.visibilityChangeEnabled === true);

    this.#alertPopup = $state(
      typeof loadedSettings.alertPopup === 'boolean'
        ? loadedSettings.alertPopup
        : DEFAULT_ALERT_DELIVERY_PREFERENCES.alertPopup
    );

    this.#longerAlertPopup = $state(
      typeof loadedSettings.longerAlertPopup === 'boolean'
        ? loadedSettings.longerAlertPopup
        : DEFAULT_ALERT_DELIVERY_PREFERENCES.longerAlertPopup
    );

    this.#qaSoundOn = $state(
      typeof loadedSettings.qaSoundOn === 'boolean' ? loadedSettings.qaSoundOn : true
    );

    this.#chatSoundOn = $state(
      typeof loadedSettings.chatSoundOn === 'boolean' ? loadedSettings.chatSoundOn : true
    );

    /**
     * This viewer's caption-overlay preference — `preferences.showSpeechRecoOverlay`.
     *
     * `$state(false)` before, seeded from nothing, and that was the whole bug: the navbar's
     * `presentation-subtitles` checkbox seeds and renders from
     * `soundChecks['presentation-subtitles']`, persists through `savePreference`, and **never touched
     * this**. Two comments in this file asserted it was "already wired". It was not — the only
     * writers were `toggleMute`, `setMasterVolume` and the overlay's own close button. So the
     * checkbox read "on" by default while the overlay was off, and ticking it did nothing at all.
     *
     * `!== false` reproduces the reference's gate exactly:
     * `isSpeechRecoOverlayEnabled() { const e = …preferences.showSpeechRecoOverlay; return null == e
     * || !!e }` (`app-presentationarea.full.js:2409-2412`) — absent, null and true all enable it, and
     * only an explicit `false` turns it off. The same expression already seeds the checkbox at the
     * `soundChecks` declaration below, which is where that reasoning was first written down; it
     * simply never reached the state the overlay reads.
     *
     * Defaulting ON is safe rather than noisy, because the overlay carries its OWN second gate:
     * `SpeechRecoOverlay.svelte:86` renders nothing at all unless there is a current caption or a
     * non-empty history. Two gates, both of which must be open — which is what the comment at the
     * render site already claimed.
     */
    this.#subtitles = $state(loadedSettings.showSpeechRecoOverlay !== false);

    /**
     * The session-level "Speech Recognition for Closed Captions:" switch, distinct from the
     * per-viewer `subtitles` overlay toggle. Defaults on, matching the captured preference
     * (`doSpeechReco:!0`, byte 979439).
     */
    this.#doSpeechReco = $state(
      typeof loadedSettings.doSpeechReco === 'boolean' ? loadedSettings.doSpeechReco : true
    );

    this.#soundChecks = $state<Record<string, boolean>>({
      'alert-donot-disturb':
        typeof loadedSettings.alertSoundOn === 'boolean'
          ? loadedSettings.alertSoundOn
          : DEFAULT_ALERT_DELIVERY_PREFERENCES.alertSoundOn,
      'qa-donot-disturb':
        typeof loadedSettings.qaSoundOn === 'boolean' ? loadedSettings.qaSoundOn : true,
      'non-trade-donot-disturb':
        typeof loadedSettings.nonTradeSound === 'boolean'
          ? loadedSettings.nonTradeSound
          : DEFAULT_ALERT_DELIVERY_PREFERENCES.nonTradeSound,
      'chat-donot-disturb':
        typeof loadedSettings.chatSoundOn === 'boolean' ? loadedSettings.chatSoundOn : true,
      /*
       * Absent means ENABLED, which is the opposite of what `=== true` did here.
       *
       * The capture gates the overlay on `isSpeechRecoOverlayEnabled()` and reads the stored
       * preference as `null == e || !!e` - null, undefined and true all enable it, and only an
       * explicit `false` turns it off. Written as `=== true`, a reader who had never touched the
       * subtitles checkbox had no stored value, so the overlay stayed disabled and captions never
       * appeared however well the rest of the pipeline worked.
       */
      'presentation-subtitles': loadedSettings.showSpeechRecoOverlay !== false
    });

    /**
     * `preferences.pushToTalk` — a per-USER preference, not a room setting, so it is seeded from the
     * persisted settings blob like every other preference rather than crossing the config boundary.
     *
     * This USED to read "HONEST GAP: nothing in this room WRITES it yet", and that claim expired
     * without anything here changing — the failure mode working-rule 2 exists for. The control was
     * already built: `ModalHost.svelte` renders it as `id="presenter-push-to-talk"`. What was missing
     * was one row in that component's id-to-preference table, so the checkbox persisted itself under
     * its own element id and this gate never saw it. The old comment's own words were right about
     * what to do — it "will do the right thing the moment a control sets it" — and now one does.
     *
     * `$state` rather than `$derived`, and the difference is not cosmetic. `loadedSettings` is a
     * plain object, deliberately (`svelte-ignore state_referenced_locally` where it is built), so
     * `savePreference` mutating it notifies nothing: a `$derived` over it would hold its
     * page-load value until some unrelated dependency happened to change, and push-to-talk would
     * start working only after a reload. Seeded from the same blob, then assigned by
     * `savePreference`, which is what every other live preference on this page does.
     */
    this.#pushToTalk = $state(loadedSettings.pushToTalk === true);

    /**
     * `preferences.disableVideo` - the viewer's own "turn the video off to preserve data" switch.
     *
     * The CHECKBOX has been in the settings modal since it was built (`ModalHost.svelte:2652`,
     * `id="app-disable-video"`). Nothing read it. `settingChecks['app-disable-video']` is written at
     * `ModalHost.svelte:1172` and was read only by its own label two lines below itself, which made
     * it a control whose only effect was changing its own words - the thing this repository
     * forbids. This state is the missing consumer.
     *
     * Upstream the flag swaps the ENTIRE screens pane for one line of text.
     * `app-presentationarea.render-helpers.js:496-499` - `TSe` renders `eSe` when the flag is set
     * and `wSe` otherwise, and `wSe` is the "No one is presenting right now..." h3, `ul#screenTabs`
     * and `div#screensTabsContent` together. The message is `eSe` at `:126-128`:
     * `<h3 class="text-center mt-4">Video off to preserve data...</h3>`, its class being const 23 at
     * `app-presentationarea.full.js:3907`.
     *
     * INVERTED relative to the checkbox, which is checked when video is ENABLED: the reference binds
     * `checked: !preferences.disableVideo` (`app-user-settings-modal.full.js:3070`) and labels it
     * "Enabled" / "Disabled" (`XEe` / `JEe`, `:293-298`). The modal's own default is
     * `'app-disable-video': true`, so both halves start at "video on" without being wired together.
     *
     * NOT restored from a saved preference, and that is deliberate rather than an omission.
     * `disableVideoChange()` (`app-user-settings-modal.full.js:1223-1226`) is the ONE handler in that
     * neighbourhood that does not call `appService.setPreference` - `beepOnUserLeaveChange`,
     * `popupOnUserLeaveChange` and `smallImagePreviewOnChange` (`:1197-1221`) all do. Upstream the
     * switch lasts for the session and a reload comes back with video on. Matching that is also the
     * kinder default: a member who turned the screens off on a phone last month should not open the
     * room today to an empty pane and no idea why.
     */
    this.#videoDisabled = $state(false);
  }

  /** The decoded settings blob, for the reads that are not preferences. */
  get loaded(): LoadedSettings {
    return this.#loaded;
  }

  get doNotDisturbOn() {
    return this.#doNotDisturbOn;
  }

  set doNotDisturbOn(next) {
    this.#doNotDisturbOn = next;
  }

  get alertSoundOn() {
    return this.#alertSoundOn;
  }

  get nonTradeSound() {
    return this.#nonTradeSound;
  }

  get popupOnUserJoin() {
    return this.#popupOnUserJoin;
  }

  get popupOnUserLeave() {
    return this.#popupOnUserLeave;
  }

  get beepOnUserJoin() {
    return this.#beepOnUserJoin;
  }

  get beepOnUserLeave() {
    return this.#beepOnUserLeave;
  }

  get trimChatLogs() {
    return this.#trimChatLogs;
  }

  get chatPopup() {
    return this.#chatPopup;
  }

  get chatBadges() {
    return this.#chatBadges;
  }

  get chatGif() {
    return this.#chatGif;
  }

  get makeUsersFollowMyScreens() {
    return this.#makeUsersFollowMyScreens;
  }

  get alwaysScrollToBottom() {
    return this.#alwaysScrollToBottom;
  }

  get recordingStartSound() {
    return this.#recordingStartSound;
  }

  get recordingStopSound() {
    return this.#recordingStopSound;
  }

  get enableRTE() {
    return this.#enableRTE;
  }

  get extraChatColumn() {
    return this.#extraChatColumn;
  }

  get visibilityChangeEnabled() {
    return this.#visibilityChangeEnabled;
  }

  get alertPopup() {
    return this.#alertPopup;
  }

  get longerAlertPopup() {
    return this.#longerAlertPopup;
  }

  get qaSoundOn() {
    return this.#qaSoundOn;
  }

  get chatSoundOn() {
    return this.#chatSoundOn;
  }

  get subtitles() {
    return this.#subtitles;
  }

  set subtitles(next) {
    this.#subtitles = next;
  }

  get doSpeechReco() {
    return this.#doSpeechReco;
  }

  get soundChecks() {
    return this.#soundChecks;
  }

  get pushToTalk() {
    return this.#pushToTalk;
  }

  get videoDisabled() {
    return this.#videoDisabled;
  }

  save(key: string, value: unknown) {
    // Mirror into the decoded snapshot so anything that resolves a preference later in the same
    // session (the split sizes, for instance) sees the write instead of the value the page was
    // server-rendered with.
    this.#loaded[key] = value;

    /*
      The two branches that are NOT preferences — the room's chat style and the split
      geometry. Handed back to the page rather than owned here, with their reasoning; a
      preferences class that re-seeded the layout would have stopped having a boundary. Called
      HERE because this is where they ran: after the snapshot, before the boolean cases.
    */
    this.#hooks.onSideEffect?.(key, value);

    if (typeof value === 'boolean') {
      if (key === 'alertSoundOn') {
        this.#alertSoundOn = value;
        this.#soundChecks['alert-donot-disturb'] = value;
      }
      if (key === 'nonTradeSound') {
        this.#nonTradeSound = value;
        this.#soundChecks['non-trade-donot-disturb'] = value;
      }
      if (key === 'alertPopup') this.#alertPopup = value;
      if (key === 'longerAlertPopup') this.#longerAlertPopup = value;
      if (key === 'qaSoundOn') {
        this.#qaSoundOn = value;
        this.#soundChecks['qa-donot-disturb'] = value;
      }
      if (key === 'chatSoundOn') {
        this.#chatSoundOn = value;
        this.#soundChecks['chat-donot-disturb'] = value;
      }
      /*
        INVERTED, and the inversion is the whole point: the modal reports whether the box is
        TICKED, and a ticked box means video is enabled. `updateSettingCheck` sends `input.checked`
        under the reference's own preference name, and the label reads "Enabled" when checked -
        matching the reference's `checked: !preferences.disableVideo`
        (`app-user-settings-modal.full.js:3070`). Storing `value` here rather than `!value` would
        blank the screens pane for every viewer who has video ON, which is all of them by default.
      */
      if (key === 'disableVideo') this.#videoDisabled = !value;
      /*
        Four preferences whose CONSUMER already existed and whose control never reached it. The
        modal writes them under their reference names (see the mapping table in
        `ModalHost.svelte`); these lines are the other half, because persisting a preference does
        not move the state this page already read it into. Without them the setting would take
        effect only after a reload — which is how `recordingStartSound` behaved: the checkbox
        flipped, the POST succeeded, and the sound still played.
      */
      if (key === 'recordingStartSound') this.#recordingStartSound = value;
      if (key === 'recordingStopSound') this.#recordingStopSound = value;
      if (key === 'pushToTalk') this.#pushToTalk = value;
      if (key === 'doSpeechReco') this.#doSpeechReco = value;
      if (key === 'alwaysScrollToBottom') this.#alwaysScrollToBottom = value;
      if (key === 'makeUsersFollowMyScreens') this.#makeUsersFollowMyScreens = value;
      if (key === 'chatGif') this.#chatGif = value;
      if (key === 'chatBadges') this.#chatBadges = value;
      if (key === 'chatPopup') this.#chatPopup = value;
      if (key === 'trimChatLogs') this.#trimChatLogs = value;
      if (key === 'enableRTE') this.#enableRTE = value;
      if (key === 'extraChatColumn') this.#extraChatColumn = value;
      if (key === 'visibilityChangeEnabled') this.#visibilityChangeEnabled = value;
      /*
        Both halves, because this preference has TWO controls: the navbar's
        `presentation-subtitles` checkbox and the settings modal's `app-speech-reco-overlay`. The
        navbar one sets `soundChecks` itself before calling here, so that line is redundant for it
        and load-bearing for the modal — without it, changing the setting from the modal would open
        the overlay while the navbar checkbox went on reading "off".
      */
      if (key === 'showSpeechRecoOverlay') {
        this.#subtitles = value;
        this.#soundChecks['presentation-subtitles'] = value;
      }
    }
    mirrorPreferenceToLocalStorage(key, value);
    // The value goes as a VALUE — devalue carries it, and `z.json()` is the schema for what the
    // settings blob can hold. It used to be stringified for the wire and parsed back in a `try`.
    this.#hooks.persist(key, value);
  }

  updateSoundCheck(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    if (input.id === 'app-donot-disturb') {
      this.#doNotDisturbOn = input.checked;
      return;
    }
    this.#soundChecks[input.id] = input.checked;
    const preferenceKeyByInputId: Record<string, string> = {
      'alert-donot-disturb': 'alertSoundOn',
      'non-trade-donot-disturb': 'nonTradeSound',
      'qa-donot-disturb': 'qaSoundOn',
      'chat-donot-disturb': 'chatSoundOn',
      'presentation-subtitles': 'showSpeechRecoOverlay'
    };
    const preferenceKey = preferenceKeyByInputId[input.id];
    if (preferenceKey) this.save(preferenceKey, input.checked);
  }
}
