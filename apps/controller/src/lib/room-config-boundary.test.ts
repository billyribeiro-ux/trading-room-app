import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ROOM_PRESENTER_SETTINGS,
  ROOM_VISIBLE_SETTINGS,
  ROOM_WRITABLE_SETTINGS,
  isRoomWritableSetting,
  resolveRoomConfig,
  roomPresenterConfig,
  roomVisibleConfig
} from './room-config';
import { scriptListNames } from './script-list-names';
import { ROOM_SETTINGS } from './room-settings-schema';

/**
 * The trust boundary between the controller and the room application.
 *
 * The room serialises whatever it is given into SSR HTML and into `__sveltekit` data on every
 * load, so a value that crosses this boundary reaches the browser, any cache in front of it, and
 * any HAR a user attaches to a support ticket. These tests exist because the first version of
 * `/internal/room-config/[code]` returned `resolveRoomConfig()` whole, which would have done
 * exactly that with every credential a configured room holds.
 */

/** A room with one of everything sensitive actually set. */
const CONFIGURED_ROOM = {
  ssoJWTSecret: 'jwt-secret-abc',
  webinarPW: 'hunter2',
  webinarPW2: 'hunter3',
  webinarPWFreeTrial: 'trial-pw',
  deleteAlertPW: 'del-pw',
  allRoomsWelcomeMatPW: 'mat-pw',
  needPasswordForUserNotes: 'notes-pw',
  secTok: '5081b73a690762e2526bc1fef3c46eedf1ec8832',
  apiSecret: 'api-sec',
  slackPostURL: 'https://hooks.slack.com/services/T/B/XXXX',
  login_webhook_url: 'https://example.com/hook',
  runawayRecPostURL: 'https://hooks.slack.com/services/T/B/YYYY',
  pairSecretKey: 'pair-key',
  imgurApiKey: 'imgur-key',
  imgurRapidKey: 'imgur-rapid',
  xuserAccessToken: 'x-tok',
  xuserAccessTokenSecret: 'x-sec',
  s3KeyID: 'AKIAEXAMPLE',
  s3KeySecret: 'AKIA-SECRET',
  vimeoClientSecret: 'vimeo-sec',
  vimeoToken: 'vimeo-tok',
  twillioApiSID: 'AC-sid',
  twillioApiToken: 'tw-tok',
  protextingSecretTok: 'ptx-tok',
  customClientAlertPostSecret: 'alert-sec',
  obsStreamKey: 'obs-key',
  restreamToURLKey: 'restream-key',
  banIPList: '198.51.100.4',
  reportEmail: 'ops@example.com',
  modAdminLoginList: 'a@example.com,b@example.com',
  allowedMemberships: 'gold,platinum',
  stripeEmail: 'billing@example.com',
  // ...and a handful the room legitimately needs, to prove the filter is not simply empty.
  rosterVisibleToViewers: true,
  userUploads: true,
  simUserCount: 12
} as never;

describe('what may cross into the room', () => {
  it('sends only the allow-listed settings', () => {
    const { values } = roomVisibleConfig(CONFIGURED_ROOM);
    for (const name of Object.keys(values)) {
      expect(ROOM_VISIBLE_SETTINGS as readonly string[]).toContain(name);
    }
  });

  it('sends none of the credentials a configured room holds', () => {
    const { values } = roomVisibleConfig(CONFIGURED_ROOM);
    const serialized = JSON.stringify(values);

    for (const [name, secret] of Object.entries(CONFIGURED_ROOM as Record<string, unknown>)) {
      if ((ROOM_VISIBLE_SETTINGS as readonly string[]).includes(name)) continue;
      expect(values).not.toHaveProperty(name);
      // Not just absent under its own key — absent as a value, wherever it might have been copied.
      if (typeof secret === 'string') expect(serialized).not.toContain(secret);
    }
  });

  it('does still send what the room needs, so the filter is not vacuously safe', () => {
    // A boundary that lets nothing through passes every test above and breaks the product.
    const { values } = roomVisibleConfig(CONFIGURED_ROOM);
    expect(values).toMatchObject({ rosterVisibleToViewers: true, userUploads: true, simUserCount: 12 });
  });

  it('proves the unfiltered call would have leaked, so this is a filter and not decoration', () => {
    const unfiltered = resolveRoomConfig(CONFIGURED_ROOM).values;
    expect(unfiltered).toHaveProperty('webinarPW', 'hunter2');
    expect(unfiltered).toHaveProperty('s3KeySecret', 'AKIA-SECRET');
    expect(unfiltered).toHaveProperty('ssoJWTSecret', 'jwt-secret-abc');
  });

  it('omits an unset setting rather than sending null', () => {
    // The room treats absent as off. A null it has to distinguish from false is a second state
    // for no reason.
    const { values } = roomVisibleConfig({});
    expect(Object.keys(values)).toHaveLength(0);
  });

  it('narrows `locked` to the same set', () => {
    // Telling the room a setting is enforced when it will never see the setting is noise, and
    // noise inside a security boundary is how the boundary stops being read.
    const { locked } = roomVisibleConfig(CONFIGURED_ROOM);
    for (const name of locked) expect(ROOM_VISIBLE_SETTINGS as readonly string[]).toContain(name);
  });
});

describe('the allow-list itself', () => {
  it('names only real settings', () => {
    const known = new Set(ROOM_SETTINGS.map((definition) => definition.name));
    for (const name of ROOM_VISIBLE_SETTINGS) expect(known).toContain(name);
  });

  it("matches the generator's ROOM_CONSUMED, which decides the wired flag", () => {
    /*
      Two lists, and they have to agree.

      `ROOM_VISIBLE_SETTINGS` decides what actually crosses to the room.
      `ROOM_CONSUMED` in `scripts/extract-manage-schema.mjs` decides which settings the Manage page
      marks as wired. The generator cannot import this module — this module imports the generated
      schema, and the generator has to run when that file does not exist — so the duplication is
      deliberate and this test is what keeps it honest. A setting marked wired but not sent, or
      sent but marked dead, is a control whose UI lies about it.
    */
    const generator = readFileSync(new URL('../../scripts/extract-manage-schema.mjs', import.meta.url), 'utf8');
    const declared = scriptListNames(generator, 'ROOM_CONSUMED');
    expect(declared, 'scripts/extract-manage-schema.mjs must declare ROOM_CONSUMED').not.toBeNull();
    expect(declared).toEqual([...ROOM_VISIBLE_SETTINGS].sort());
  });

  it('is entirely marked wired in the generated schema', () => {
    // The flag's documented meaning is "nothing reads it yet". Everything on this list is read.
    const wired = new Set(ROOM_SETTINGS.filter((d) => d.wired).map((d) => d.name));
    for (const name of ROOM_VISIBLE_SETTINGS) {
      expect(wired.has(name), `${name} crosses to the room but is marked unwired`).toBe(true);
    }
  });

  it('has no duplicates', () => {
    expect(new Set(ROOM_VISIBLE_SETTINGS).size).toBe(ROOM_VISIBLE_SETTINGS.length);
  });

  it('contains nothing whose name reads like a credential', () => {
    /*
      A tripwire, not the mechanism. The allow-list is the mechanism; this catches the specific way
      it would most plausibly go wrong — somebody adding `webinarPW` because the room "needs to
      check the password", which it does not: the controller's own login does that before the room
      is ever reached.
    */
    /*
      Narrowed from `URL$` to the endpoint-shaped ones.

      The first version rejected any name ending in URL or Url, which was the wrong test: a public
      app-store listing and a logo address are not credentials, and blocking them would have kept
      Mobile App Info and Benzinga unbuildable for the wrong reason. What matters is a URL that IS
      a secret — a webhook or a post endpoint whose only protection is that nobody knows it.
    */
    /*
      `Password` JOINED THE PATTERN 2026-08-29, and it needed the type check beside it.

      `TODO.md` row 2 recorded the hole and named it exactly: `needPasswordForUserNotes` — the
      setting whose VALUE a presenter types to unlock user notes — matched NONE of the patterns
      above. `PW$` catches `deleteAlertPW` and `allRoomsWelcomeMatPW` because the reference
      abbreviates; this one it spells out, so the tripwire meant to catch a credential crossing to
      the room would have watched this one go past.

      **A bare `/[Pp]assword/` is the wrong fix**, and measuring said so before it was written:
      `showPasswordField` is already on `ROOM_VISIBLE_SETTINGS` and is a BOOLEAN — whether the login
      page draws a password box. Blocking it would repeat the mistake the note above records about
      `URL$`, where a rule that read the name instead of the thing kept two buildable features out.

      What separates them is not the name, it is the SHAPE: a `checkbox` cannot hold a secret,
      whatever it is called. The schema already says which is which and is already imported for the
      wired check above, so the rule asks it rather than encoding `(?!Field)` and hoping the next
      credential is spelled the same way.
    */
    const credentialShaped =
      /PW$|PW\d|[Pp]assword|Secret|secret|Token|token|ApiKey|apiKey|KeyID|KeySecret|[Ww]ebhook|WebHook|_url$|PostURL$|Email$|banIPList|LoginList/;

    /** Settings whose value is a flag. A boolean is not a credential however it is named. */
    const booleanSettings = new Set(
      ROOM_SETTINGS.filter((setting) => setting.type === 'checkbox').map((setting) => setting.name)
    );

    for (const name of ROOM_VISIBLE_SETTINGS) {
      if (booleanSettings.has(name)) continue;
      expect(name, `${name} reads like a credential`).not.toMatch(credentialShaped);
    }
  });

  it('the credential tripwire would catch the one that got past it', () => {
    /*
      A POSITIVE control on the tripwire itself, which the assertion above cannot give: it passes
      when the allow-list is clean, which is also exactly what it does when the pattern matches
      nothing at all. `TODO.md` row 2 is the case in point — the pattern was clean and blind at the
      same time, for as long as the row went unread.

      Both halves are asserted. `needPasswordForUserNotes` must be caught, and `showPasswordField`
      must be exempt on its TYPE rather than its name, because a rule that catches everything is a
      rule somebody deletes the first time it blocks real work.
    */
    const credentialShaped =
      /PW$|PW\d|[Pp]assword|Secret|secret|Token|token|ApiKey|apiKey|KeyID|KeySecret|[Ww]ebhook|WebHook|_url$|PostURL$|Email$|banIPList|LoginList/;

    expect('needPasswordForUserNotes', 'the hole row 2 named').toMatch(credentialShaped);
    expect('deleteAlertPW').toMatch(credentialShaped);
    expect('allRoomsWelcomeMatPW').toMatch(credentialShaped);

    /*
      `showPasswordField` DOES match the pattern and crosses to the room anyway. That is the whole
      reason the loop above consults the schema, so it is asserted here rather than left implicit —
      if this ever stops being a checkbox, the exemption stops being safe and this fails.
    */
    expect('showPasswordField').toMatch(credentialShaped);
    expect([...ROOM_VISIBLE_SETTINGS]).toContain('showPasswordField');
    const showPasswordField = ROOM_SETTINGS.find((s) => s.name === 'showPasswordField');
    expect(showPasswordField?.type, 'the exemption depends on this').toBe('checkbox');

    /*
      ONE CONTROL ON THIS FILE DID NOT FIRE, and it is recorded rather than left implied.

      Replacing the loop's `booleanSettings.has(name)` with `name === 'showPasswordField'` keeps
      every assertion here green. So this file pins the OUTCOME — that flag stays visible, that
      credential does not — and not the MECHANISM.

      The type-based form was kept anyway, and the reason is that it is the one that survives: a
      name exemption is an allow-list of one, and the next `...Password...` checkbox somebody adds
      would be blocked by a rule that had already decided the answer for a different setting.

      It is not asserted because it CANNOT be, honestly. `showPasswordField` is the only entry on
      `ROOM_VISIBLE_SETTINGS` that is both credential-shaped and a checkbox — measured, all ninety —
      so a test that the rule generalises would need a second setting invented to prove it, and an
      invented fixture proving a rule about real settings is the hollow coverage this repository
      keeps catching. The day a second one exists, it belongs here.
    */
  });

  it('every entry is a setting some room code actually reads', () => {
    /*
      Recorded so the list cannot quietly accumulate. Each name maps to the gate that consumes it;
      if a consumer is deleted, its entry should go with it rather than keep crossing the boundary.

      This map is a statement of intent, not proof — it agreed with itself while `hideAppInfo` and
      `hasBenzingaNews` sat on the list with no consumer anywhere in the room. What caught that was
      `apps/room/e2e/room-config-seam.spec.ts` flipping one and watching nothing happen. This named
      `scripts/room-config-seam-e2e.mjs` until 2026-08-31 — the instrument that probe originally had,
      which `git ls-files` returns 0 for and which the spec's own docblock records as the reason it
      exists. Citing a file nobody can open is citing nothing.
    */
    const consumers: Record<string, string> = {
      /*
        Added 2026-08-31, and it is a defect closed rather than a setting wired. Only `main` is
        unconditional in the reference's tab builder; this room shipped Off Topic to every room
        including those whose owners had switched it off. Absence means TRUE — `chat-tabs.ts` carries
        the argument, because reading it as false would take the tab from every room that has never
        stored the setting.
      */
      hasChannelTabs: 'chat-tabs.ts `chatTabsForMember` — whether the room has an Off Topic channel',
      enableBadges: 'RoomMessage `visibleBadges` — the owner master switch on chat badges',
      showBadgesToPresentersOnly: 'RoomMessage `visibleBadges` — narrows badges to presenters',
      disableStarYears: 'RoomMessage — the membership-star gate',
      /*
        Verified in the room before being written here, as the note above requires: `canUseRTE` in
        `+page.svelte` gates the composer's `fa-font` button, and the same expression gates the
        modal's editor and its send. Gated THREE ways — `sessData.enableRTE &&
        preferences.enableRTE && isPresenter` — so this name is only one term of it, exactly as
        `beepOnUserJoin` is one term of the join beep.
      */
      /*
        The room's own login page, added 2026-08-14. Each is read from `sessData` in the decoded
        bundle — offsets in the note on `ROOM_VISIBLE_SETTINGS` — so each has a consumer in the
        room today, which is this list's rule.
      */
      showPasswordField: 'app-session-login — whether the password field is shown at all',
      usernameInstructions: 'app-session-login — the help text under the name field',
      hasRequiredPhoneInLogin: 'app-session-login — whether a phone number is collected and required',
      customEnterDisclosure: 'app-session-login — the disclosure dialog shown before entry',
      disableEditingUsername: 'app-session-login — whether a non-presenter may change their name',
      enableRTE: '+page.svelte `canUseRTE` — the composer rich-text button, the editor, and the send, all three',
      presenterMsgsOnTheRight:
        'RoomMessage — `presenter-msg-right` on the body and `presenter-reactions-right` on the reactions',
      allowUsersToChangeUsername: 'O(9) fallback — a member renaming themselves',
      hideAppInfo: 'O(12) — the paragraph holding the Mobile App Info button',
      ptrMobileAppEnabled: 'the inner gate on that button',
      customMobileAppEnabled: 'the inner gate, and which store links the modal uses',
      customMobileAppAndroidUrl: 'the modal Google Play link when custom is on',
      customMobileAppIOSUrl: 'the modal App Store link when custom is on',
      freeTrialsGetApp: 'whether a trial account may reach the button at all',
      hideMobileCredentials: 'O(13) — the email/pin block inside the modal',
      hasBenzingaNews: 'O(31) sidebar and O(15) navbar — the Benzinga item',
      altBenzingaLogoURL: 'swaps the Benzinga image for a custom one',
      altBenzingaLinkURL: 'replaces the session-derived Benzinga destination',
      rosterVisibleToViewers: 'O(44) block gate, and the per-row gate',
      onlyPresentersVisibleToViewers: 'O(44) block gate, and the per-row gate',
      rosterCountVisibleToViewers: 'O(6) — the Users badge',
      simUserCount: 'added to the headcount in the navbar and the sidebar badge',
      showArchivesToUsers: 'archivesAvailableTo()',
      showArchivesToSpecificPresenters: 'archivesAvailableTo()',
      hideRecs: 'O(6) inside the Archives menu — Recording',
      hideChatLog: 'O(11)/O(12) inside the Archives menu',
      userUploads: 'canPostImages in the composer',
      /*
        Both of these were verified IN THE ROOM before being written here, because the note above is
        precisely about this map agreeing with itself: `filesSectionHidden` is imported at
        `src/routes/+page.svelte:40` and drives `filesHidden` at :569, bound to the Files tab and the
        pane together; `alertSoundButtonFor` is called at :8510 and its answer selects between the
        two buttons at :8643 and :8652. Neither is a name on a list with nothing behind it.
      */
      hideFiles: 'filesSectionHidden() — hides the Files tab AND the #files pane together',
      /*
        Verified in the room before being written here, like its neighbours: `RoomGates.notesHidden`
        ORs it with viewer-only mode exactly as the reference does
        (`this.hideNotes = sessData.hideNotes || globals.viewerOnlyMode`, bundle byte 1,955,694), the
        page passes it at `src/routes/+page.svelte:1217`, and `PresentationArea.svelte` binds it to
        the Notes TAB and the Notes PANE together — the same pair-or-nothing shape `hideFiles` has,
        and for the same reason: hiding one of the two leaves a tab that opens onto nothing.
      */
      hideNotes: 'RoomGates.notesHidden — hides the Notes tab AND the notes pane together',
      /*
        The three ROOM DEFAULTS share ONE consumer, and that is the honest way to name them: they
        are three clauses of one expression upstream and one loop in `applyRoomDefaults` here.
        Verified in the room before being written, as the note above requires — `+page.svelte` calls
        it inside `onMount`, and `room-defaults.test.ts` asserts the six writes the loop makes in
        the order the reference makes them.
      */
      darkThemeAsDefault: 'applyRoomDefaults() — seeds the dark theme once, then latches',
      alertSoundOff: 'applyRoomDefaults() — seeds alertSoundOn=false once, then latches',
      alertsChatOnBottom: 'applyRoomDefaults() — seeds roomSplitDir=btt once, then latches',
      /*
        Verified in the room before being written here: `RoomGates.recordingTooltip` returns the
        empty string — no tooltip — when this setting is on and the viewer is not a presenter, and
        `RoomNavbar.svelte:305` binds that value to the [ REC ] indicator. The gate already existed;
        what changed on 2026-08-28 is WHICH SIDE it reads. It was `prefs.loaded`, a viewer
        preference nothing in this room writes, so the owner switch did nothing at all.
      */
      dontShowRecInfoToUsers: 'RoomGates.recordingTooltip — blanks the [ REC ] tooltip for members',
      /*
        Verified in the room before being written here: `chatComposerAvailable` in
        `#lib/chat-mode.js` takes it as one of four inputs and `+page.svelte` passes
        `data.sessData?.chatDisabledForTrials === true` into the `chatEnabled` derivation that gates
        every composer in the room. It is the third of the reference's three reasons; this room had
        the other two and no term for the owner policy.
      */
      chatDisabledForTrials: 'chatComposerAvailable() — the third reason the composer is off',
      /*
        Verified in the room before being written here: `RoomMessage.svelte:774` gates the
        ask-a-question button on `!isQaMessage && hasQaOnAlerts`, and that prop now arrives on
        `RoomMessageChrome` — ONE derivation on the page, spread into the three call sites that
        render a message. Its default also changed from `true` to `false` in the same commit: an
        entitlement whose prop defaults open is not an entitlement.
      */
      hasQAOnAlerts: 'RoomMessage — the ask-a-question button on an alert, through RoomMessageChrome',
      /*
        TWO consumers, and naming only the first would have been the mistake this whole map exists to
        prevent. `message-behavior.ts` already carried the rule — reactions on a row drawn inside the
        Q&A thread — and it could never evaluate true, because that thread passed `kind="chat"` and
        an `onaction` that did nothing. The gate on the SERVER is the one that makes the setting
        binding: `reactToQuestion` reads the room's own configuration and refuses when it is off, so
        an owner who left it off gets a room where the reaction cannot be recorded, not one where the
        button is merely hidden.
      */
      /*
        The raw JSON crosses; the ENTITLEMENT does not. That distinction is the whole reason this map
        entry is worth reading: the reference evaluates the badge gate in the browser against
        `globals.user.badges` and then subscribes the socket to the channel, so a member who edits
        that list in a console gets it. Here the room server decides — `memberChatChannels` — and
        every path that could reach a channel asks it: the page load, the send, the reply, the older-
        pages query and the realtime fan-out.
      */
      /*
        Its DISPLAY-MODE half never reaches a message: the mode is resolved once per surface on the
        page and travels as `displayMode`, so a component cannot read this setting and decide for
        itself. What travels on the chrome is the one term it contributes to the hide-avatar rule.
      */
      /*
        The only consumer on this map that is not a DOM read: it decides whether a canvas is spliced
        between `getDisplayMedia` and the producer. `RoomScreenOverlay` is the gate and the
        lifecycle; the SSE router feeds it each arriving alert, including this presenter's own, which
        is the one frame the router must not skip on the own-sender guard.
      */
      /*
        ONE feature, two names. `autoRecord` is the gate on the stop as well as on both starts, so
        `dontStopRecOnMicMute` decides nothing on its own — which is why they are listed as one
        consumer rather than two.
      */
      autoRecord: 'autoRecordAction decides all three moments, and RoomRecording applies it',
      dontStopRecOnMicMute: 'autoRecordAction reads it on the stop path, and only when autoRecord is on',
      /*
        The only setting on this map whose consumer runs on a TIMER rather than on a request, and the
        only one enforced by a server the reference gates in the browser alone.
      */
      hasAlertScheduler:
        'scheduled-alerts.remote.ts refuses all three commands without it, and the sweep in server/scheduled-alerts.ts posts what it allowed',
      alertsOverlayOnScreenshare:
        'RoomScreenOverlay wraps the display capture with it, and the SSE router feeds every arriving alert to it',
      altChatRender: 'RoomDisplayModes seeds the compact mode from it, and hideMessageAvatar reads it as one term',
      chatTabsWithBadges: 'chat-tabs.ts parses it, and memberChatChannels decides which channels each member holds',
      enableQAReactions:
        'RoomMessageChrome — reactions inside the Q&A thread — and reactToQuestion, which refuses when the room has it off',
      /*
        Both verified in the room before being written here. `alwaysShowRoster` seeds `sidebarOpen`
        in `+page.svelte`, which `RoomSidebar` and `RoomNavbar` both read; the reference's SECOND use
        of it — a third OR-term on the mobile-app icon — is deliberately refused, with the reason at
        `RoomGates.mobileAppAvailable`. `hasSpeechRecognitionDisabled` reaches
        `RoomGates.speechRecognitionAvailable`, which `RoomRecording.beginSpeechRecognition` asks
        before starting; its docblock has quoted that half of the capture's refusal since it was
        written while implementing only the preferences half.
      */
      alwaysShowRoster: 'seeds sidebarOpen — the sidebar opens on arrival and can still be closed',
      hasSpeechRecognitionDisabled: 'RoomGates.speechRecognitionAvailable — the room half of the captions gate',
      /*
        Both verified in the navbar before being written here. `hideWebcamForRoom` is the fifth term
        of the webcam control's `{#if}`, and the only one this room could not evaluate — the other
        four are facts it already holds about the viewer and their devices. `blinkingRec` gates the
        `breathing-rec` class, which unlike `smallImagePreview`'s dead class has a real keyframe rule
        in `captured-runtime-components.css`.
      */
      hideWebcamForRoom: 'RoomNavbar — the webcam control disappears for the whole room',
      blinkingRec: 'RoomNavbar — the REC badge breathes while recording',
      /*
        Both verified in the room before being written here, and both are SEEDS re-applied where the
        reference re-applies them: `autoSwitchToOfftopics` seeds `RoomChat`'s main-column channel at
        construction, and `styckyNonTradeAlert` re-ticks the composer's Non-Trade box on EVERY open
        of the modal, which is what sticky means and where `doAlertsModal` puts it.
      */
      autoSwitchToOfftopics: 'RoomChat — the main chat column opens on the off-topic channel',
      styckyNonTradeAlert: 'PostAlertModal — the Non-Trade checkbox starts ticked on every open',
      /*
        Both verified in the room before being written here. `name` becomes the document title
        through `+page.svelte`'s `<svelte:head>`, which is what a page's head is for;
        `ModeratorMessage.svelte` draws the presenter-only bar with the reference's three captured
        classes, all of which have real rules in `captured-runtime-components.css`.
      */
      name: 'the browser tab — <svelte:head><title> on the room page',
      modMessage: 'ModeratorMessage — a presenter-only bar above the presentation area',
      /*
        Verified in the room before being written here. It is a field of `NoteSurfaceGates` rather
        than a fourth prop, because `noteGates` already crosses to `PresentationArea` whole — and the
        module that resolves it is also where the honest gap lives: the Summernote build that turns
        the reference's two button names into DOM is not in the capture.
      */
      simplifiedEditor: 'resolveNoteSurfaceGates — foreground-only colour on the NoteEditor toolbar',
      /*
        Verified in the room before being written here, and the consumer named is the SERVER one on
        purpose: `loadPeerPrivateMessageHistory` refuses before it selects a row. The button in the
        user-info modal reads the same setting, but a markup gate is not what stops a direct call.
      */
      enablePrivateMessageHistory:
        'loadPeerPrivateMessageHistory — refuses the getAllUserPM read unless the room enabled it',
      /*
        Verified in the room before being written here. `rosterRowIsFull` sits with the other roster
        predicates rather than as an `{#if}` in the sidebar, because those are the functions that
        decide what one member sees of another and they are tested as such.
      */
      showOnlyUsernames: 'rosterRowIsFull — which shape a roster row draws in',
      /*
        Verified in the room before being written here. All three name the SAME consumer, which is
        the honest entry: `tipButtonFor` is where the conjunction lives, and none of the three has a
        reader of its own. A row here that named three different consumers would be describing three
        gates the reference does not have.
      */
      tipMeBtnEnabled: 'tipButtonFor — the tip button, all three settings or none',
      tipMeBtnUrl: 'tipButtonFor — the tip button, all three settings or none',
      tipMeBtnTxt: 'tipButtonFor — the tip button, all three settings or none',
      /*
        Verified in the room before being written here. `RoomBranding` owns both, and the second is
        deliberately named with what it IS rather than with what it does: owner-authored code in
        every member's page is the fact a reader of this table should meet first.
      */
      customFaviconURL: 'RoomBranding — the room’s own favicon, replacing the shell’s',
      customCSS: 'RoomBranding — owner-authored CSS, linked or inlined as a text node',
      /*
        Verified in the room before being written here. It replaces the entire screens pane, so the
        consumer named is the pane rather than a helper — that is what a reader of this table needs
        to know first about a setting that can remove the room's whole video surface.
      */
      customPlayerURL: 'PresentationArea #screens — an owner iframe instead of the whole pane',
      copyTrades: 'buildMessageChrome — the click-to-copy order marker on an ALERT body',
      /*
        Verified in the room before being written here. Both name the SAME consumer, which is the
        honest entry for a conjunction: the switch and the URL only ever mean anything together, and
        `PresentationArea` conjoins them once before anything downstream sees either.
      */
      positionsIframe: 'PresentationArea — the Show/Hide Positions buttons and the panel they open',
      positionsIframeUrl: 'PresentationArea — the Show/Hide Positions buttons and the panel they open',
      /*
        Verified in the room before being written here, and the consumer named is the SERVER one:
        `messageAction`'s delete branch refuses a non-presenter unless the room enabled it. The menu
        entry reads the same setting through the chrome, but a markup gate is not what stops a direct
        call — and in this case the markup gate was defaulting off while the endpoint was open.
      */
      usersCanDeleteOwnMsgs: 'messageAction delete — refuses a member self-delete unless enabled',
      hasTypingIndicator: 'setTyping — refuses to record or broadcast unless the room enabled it',
      overwriteCashRegisterSound:
        'alertSoundButtonFor() — picks Set / Remove as alert sound, or neither, per audio row',
      userPM: 'canPM in the roster kebab',
      userToPresenterPM: 'canPM in the roster kebab',
      disablePMForTrials: 'canPM in the roster kebab',
      dingOnNewMessage: 'the chat ding — `app-chat.compiled.js:135`, played on an incoming message from somebody else',
      /*
        Verified in the room before being written here, as the note above requires.

        `individualVolumeControls` was added to the allow-list with the viewer-only work and never
        given an entry, which left this assertion RED — the map and the list disagreed by one name.
        It was not caught because nothing ran this file between then and 2026-08-12. Its consumer is
        real: the prop reaches `PresenterMuteRows.svelte:40`, and `:123` is the gate that reveals
        each presenter's own slider (const 114 > 115 / 203 > 204).
      */
      individualVolumeControls: 'PresenterMuteRows.svelte:123 — the per-presenter volume slider',
      hideChatAlerts: 'O(1, hideChatAlerts ? -1 : 1) — the chat/alerts column, one of five writers of that flag',
      isChatOnlyRoom: 'O(3, hidePresentation ? -1 : 3) — the presentation column, with chatOnlyMode',
      disableCopy: 'the contextmenu / Ctrl+C,U,S / F12 gate and body.noselect, for non-presenters only',
      /*
        THE SAME DRIFT AS `individualVolumeControls` ABOVE, three more times, and for the same
        reason: these three crossed the boundary when the join/leave and Tawk work landed, and
        nobody added them here. This assertion was RED before the settings-schema drift was even
        looked at — found 2026-08-13 by running the whole `src/lib` suite rather than the tests
        touching the change in hand.

        The lesson the `individualVolumeControls` note already recorded, now with a third data
        point: adding a name to `ROOM_VISIBLE_SETTINGS` and to `ROOM_CONSUMED` is TWO of the three
        places. This map is the third, and it is the only one that has to say WHY.

        Each verified in the room before being written here, as the note above requires.
      */
      beepOnUserJoin:
        '+page.svelte:6118 — the join/leave beep, gated TWICE: `sessData.beepOnUserJoin && preferences.beepOnUserJoin`, so the owner and the viewer must both allow it',
      userJoinAndLeavePopup:
        '+page.svelte — the join/leave toast, the second of the two independent join/leave notifications',
      tawkPresenterSupport:
        'tawkSupportAvailable() in $lib/tawk-support — the navbar support item, which also requires presenter AND a configured PUBLIC_PTR_TAWK_PROPERTY_ID',
      useMediaMTX:
        '+page.svelte — `hideStreams = !useMediaMTX`, applied to BOTH the #streams-tab li and the #streams pane, exactly as app-presentationarea.full.js:2293 and :5357/:5388 do. This is the whole Streams tab: without it the room hid the tab in every room, MediaMTX or not',
      overlayUserIdOnScreenshare:
        'StreamingView.svelte — the `span.overlay-userID-container` printing the viewer’s own userXrefID over the video, gated on this AND !isPresenter (TCe, main bundle byte 1901148)',
      /*
        THE THIRD PLACE, as the note above records — added here in the same change that put the name
        on `ROOM_VISIBLE_SETTINGS` and on `ROOM_CONSUMED`, rather than being found red later.

        Verified in the room before being written here: `swingAlertsTabVisible` is imported by
        `+page.svelte`, where `swingAlertsEnabled` gates the `#swingAlerts-tab` li AND the
        `#swingAlerts` pane, and by `+page.server.ts`, where it gates the initial log read and all
        three mutations. The pane re-applies it so the component renders nothing on its own.
      */
      hasSwingTradeAlerts:
        'swingAlertsTabVisible() — the Swing Alerts tab, the #swingAlerts pane, the initial getSwingAlertsLog read and the three mutations, all on one flag',
      /*
        THE THIRD PLACE again, added in the same change that put the name on
        `ROOM_VISIBLE_SETTINGS` and on `ROOM_CONSUMED` — the lesson the notes above record, applied
        rather than re-learned.

        Verified in the room before being written here: `dayTradeAlertsTabVisible` is imported by
        `+page.svelte`, where `dayTradeAlertsEnabled` gates the `#dayTradeAlerts-tab` li AND the
        `#dayTradeAlerts` pane, by `+page.server.ts`, where it gates the initial log read and all
        three mutations, and by `api/day-trade-alerts/+server.ts`. The pane re-applies it so the
        component renders nothing on its own.

        The name is spelled WITHOUT the doubled word its Swing sibling carries. That is upstream's,
        read at bundle bytes 1,009,430 and 1,009,503, and it is why this entry cannot be derived
        from the one above by substitution.
      */
      hasDayTradeAlerts:
        'dayTradeAlertsTabVisible() — the Day Trades tab, the #dayTradeAlerts pane, the initial getDayTradeAlertsLog read and the three mutations, all on one flag',
      /*
        THE THIRD PLACE, added in the same change that put the name on `ROOM_VISIBLE_SETTINGS` and
        on `ROOM_CONSUMED`, rather than being found red afterwards.

        Not a boolean like its neighbours. `alertFilterAvailable()` in `alert-filter.ts` treats a
        truthy, non-whitespace value as "the feature exists at all", which is the reference's own
        gate at bundle bytes 2,042,979 and 2,286,654.
      */
      modAlertFilterList:
        'alert-filter.ts — alertFilterAvailable() gates the whole feature, and parseModAlertFilterList() turns the JSON string into the {username, avatar} rows the filter modal lists',
      /*
        THE FOURTH PLACE, and the fourth setting shipped as a JSON string rather than a flag.

        Named here in the same change that put it on `ROOM_VISIBLE_SETTINGS` and `ROOM_CONSUMED`,
        for the reason the note above gives.

        The consumer is a RENDER path, not a gate: `parseAlertLabels()` reads the string once for
        the page and `splitAlertLabels()` swaps the first occurrence of each configured hash for a
        badge — on the ALERTS log only, because `parseSymbols` substitutes nothing over chat.
      */
      alertLabels:
        'alert-labels.ts — parseAlertLabels() reads the JSON string once per page and splitAlertLabels() turns each #hash into the coloured badge RoomMessage.svelte renders, alerts only',
      /*
        FOUR gates RoomMessage.svelte already implemented and the page never fed. Each was a prop
        defaulting false, so the feature was unreachable however the room was configured.
      */
      usersPublicReply: 'RoomMessage.svelte via sourceMessageBehavior() — the Reply menu entry for non-presenters',
      enableReactions: 'RoomMessage.svelte via sourceMessageBehavior() — the reaction picker and the reaction pill',
      enableEditMessage: 'RoomMessage.svelte via sourceMessageBehavior() — the Edit menu entry on CHAT messages',
      enableEditAlerts:
        'RoomMessage.svelte via sourceMessageBehavior() — the Edit menu entry on ALERTS, gated apart from chat because the reference gates them apart',
      /*
        The POLICY half of a name the room already uses for a runtime flag. The gate upstream needs
        both, and the room had only the flag.
      */
      recordingReminder:
        '+page.svelte — the owner term of the recording-reminder banner, ANDed with the local runtime flag and the recording state',
      /*
        USM-18, added 2026-09-02. The room DEFAULT for a per-member preference, and the only entry on
        this list whose visible effect is a class with no rule in any stylesheet — transcribed rather
        than corrected, on the `btn-ligth` precedent, and argued at the entry in `room-config.ts`.
      */
      smallerImagePreview:
        'RoomPrefs.latchRoomImagePreview — the one-shot seed of the members own smallImagePreview, latched so their later choice survives it'
    };
    expect(Object.keys(consumers).sort()).toEqual([...ROOM_VISIBLE_SETTINGS].sort());
  });
});

describe('what the room may WRITE back', () => {
  /*
    A second allow-list, and strictly narrower than the read ones.

    Reading a setting exposes it; writing one lets the room change what its owner configured on the
    Manage page. TWO settings need it, and both for the same reason — the reference puts the control
    inside the ROOM and the value is durable per-room state, so a broadcast would change every
    browser's belief and persist nothing:

      overwriteCashRegisterSound   the Files pane's two `set-alert-sound-btn` buttons
                                   (`app-presentationarea.full.js:3084-3086`)
      restreamToURL                `startRestream` → `setRestreamURL` (bundle byte 2,174,659)

    `restreamToURL` joined on 2026-08-30 with SC-13, and it is the one that made this list stop
    being a subset of `ROOM_VISIBLE_SETTINGS` — see the assertion below, which is the invariant
    restated rather than relaxed.
  */
  it('permits exactly the settings on the write list', () => {
    expect([...ROOM_WRITABLE_SETTINGS]).toEqual(['overwriteCashRegisterSound', 'restreamToURL']);
    expect(isRoomWritableSetting('overwriteCashRegisterSound')).toBe(true);
    expect(isRoomWritableSetting('restreamToURL')).toBe(true);
  });

  it('refuses a setting the room may READ but not write', () => {
    // `hideFiles` crosses to the room and is still not writable: a room that could switch it off
    // would be overriding the owner who turned it on.
    expect((ROOM_VISIBLE_SETTINGS as readonly string[]).includes('hideFiles')).toBe(true);
    expect(isRoomWritableSetting('hideFiles')).toBe(false);
  });

  it('refuses a setting that never crosses at all, and an unknown name', () => {
    expect(isRoomWritableSetting('webinarPW')).toBe(false);
    expect(isRoomWritableSetting('ssoJWTSecret')).toBe(false);
    expect(isRoomWritableSetting('')).toBe(false);
    // A `Set` lookup, not a property lookup — so an inherited key is not a way in.
    expect(isRoomWritableSetting('__proto__')).toBe(false);
    expect(isRoomWritableSetting('constructor')).toBe(false);
  });

  it('is readable by the party that can write it, so the UI can show the result', () => {
    /*
      This read "is a subset of the read list" until 2026-08-30, and the change is a restatement
      rather than a relaxation. The rule was never about the general list — it is that a setting the
      room may write but never read is one whose UI cannot show the result of the write. A
      presenter-only setting satisfies that for the presenter, who is the only party the endpoint
      lets write at all.

      The alternative was putting `restreamToURL` on the list every member receives in order to let
      one presenter edit it, which is a strictly worse trade and is the one the third list refuses.
    */
    for (const name of ROOM_WRITABLE_SETTINGS) {
      const readable =
        (ROOM_VISIBLE_SETTINGS as readonly string[]).includes(name) ||
        (ROOM_PRESENTER_SETTINGS as readonly string[]).includes(name);
      expect(readable, `${name} is writable but readable by nobody`).toBe(true);
    }
  });

  it('is enforced by the endpoint, together with a presenter check of its own', () => {
    /*
      Read as text, and the limitation is stated rather than hidden.
      `internal/room-setting/[code]/+server.ts` needs a database and `$app/env/private` to execute,
      and every `*.db.test.ts` is excluded from this run because it needs a real PostgreSQL binary.
      What this pins is that none of the three gates has been dropped: the shared-secret token, the
      write allow-list, and a presenter check that does not depend on the room having hidden the
      button.

      The room's own `files-pane-contract.test.ts` EXECUTES the caller and proves it refuses a
      member before any write leaves the room. This is the second lock on the same door.
    */
    const endpoint = readFileSync(
      new URL('../routes/internal/room-setting/[code]/+server.ts', import.meta.url),
      'utf8'
    );
    /*
      The WRITE capability since 2026-08-27, and the negative half is asserted beside it: this
      endpoint used to take `config-read:`, so a capability minted to read a room's settings also
      authorised writing one. `config-read-cannot-write-contract.test.ts` owns the property; this
      line is the one that would notice the endpoint quietly going back.
    */
    expect(endpoint).toContain('verifyConfigWriteToken(secret, params.code, presented)');
    expect(endpoint).not.toContain('verifyConfigReadToken(');
    expect(endpoint).toContain('if (!isRoomWritableSetting(name))');
    expect(endpoint).toContain('membership.roomUser.role === 0 || isRoomPresenter(membership.roomUser)');
    expect(endpoint).toContain("error(403, 'Presenters only.')");
    // A guest has no membership row and therefore no authority.
    expect(endpoint).toContain("error(403, 'Not a member of this room.')");
    // The same suspended-account refusal the config read makes; a suspended room stops writing too.
    expect(endpoint).toContain('account.status !== ACCOUNT_ACTIVE');
  });
});

/**
 * THE THIRD ALLOW-LIST — what crosses to a presenter and to nobody else.
 *
 * Added 2026-08-30 with SC-12/SC-13. `ROOM_VISIBLE_SETTINGS` is delivered to every member: the
 * room returns it as `sessData` from a page load, and SvelteKit serialises a load's return into the
 * SSR payload, so a name on that list is a name in the HTML of every viewer's page. `restreamToURL`
 * must not be one of those — an rtmp destination usually carries its own stream key inline, and the
 * reference's own validator (`startsWith("rtmp://") && !includes(" ")`) accepts exactly that string.
 *
 * The reference reads it from `globals.sessData.restreamToURL`, i.e. it ships it to everyone. This
 * list is that divergence, and these are the assertions that make it a refusal rather than a note.
 */
describe('what crosses to a PRESENTER and to nobody else', () => {
  /* A room with a destination that carries its key inline, which is the realistic shape. */
  const RESTREAMING_ROOM = {
    ...(CONFIGURED_ROOM as unknown as Record<string, unknown>),
    restreamToURL: 'rtmp://a.rtmp.youtube.com/live2/abcd-efgh-ijkl-mnop-qrst'
  } as never;

  it('gives a presenter the value', () => {
    expect(roomPresenterConfig(RESTREAMING_ROOM, true)).toEqual({
      restreamToURL: 'rtmp://a.rtmp.youtube.com/live2/abcd-efgh-ijkl-mnop-qrst'
    });
  });

  it('gives a non-presenter NOTHING — not an empty string, not the key', () => {
    /*
      `{}` rather than `{restreamToURL: ''}`: an empty string is a VALUE this pane would render and
      then offer to save over the real one. Absent is the only honest answer for somebody who may
      not see it.
    */
    expect(roomPresenterConfig(RESTREAMING_ROOM, false)).toEqual({});
  });

  it('keeps it off the list every member receives', () => {
    /* The assertion the whole split exists for. */
    expect(ROOM_VISIBLE_SETTINGS as readonly string[]).not.toContain('restreamToURL');
    expect(Object.keys(roomVisibleConfig(RESTREAMING_ROOM).values)).not.toContain('restreamToURL');
  });

  it('shares no name with the list every member receives', () => {
    /*
      Not a tidiness rule. `internal/room-config` merges the presenter projection OVER the visible
      one, so a name on both would be delivered to everybody through the first list while reading in
      this file as presenter-only — the boundary would be documented one way and behave another.
    */
    const both = (ROOM_PRESENTER_SETTINGS as readonly string[]).filter((name) =>
      (ROOM_VISIBLE_SETTINGS as readonly string[]).includes(name)
    );
    expect(both, `${both.join(', ')} is on BOTH allow-lists`).toEqual([]);
  });

  it('holds none of the credentials a configured room holds', () => {
    /*
      Presenter-only is not a licence. The seven this room's boundary refuses outright stay refused
      for a presenter too — a presenter's browser is still a browser, and `restreamToURLKey` in
      particular sits one letter away from the entry that IS on this list.
    */
    const projected = roomPresenterConfig(RESTREAMING_ROOM, true);
    for (const name of ['restreamToURLKey', 'obsStreamKey', 'ssoJWTSecret', 'webinarPW', 'secTok']) {
      expect(projected, `${name} must not cross, presenter or not`).not.toHaveProperty(name);
    }
    /* And the positive control: something IS projected, so the loop above is not vacuous. */
    expect(Object.keys(projected).length).toBeGreaterThan(0);
  });

  it('omits an unset value rather than serialising a null', () => {
    expect(roomPresenterConfig({} as never, true)).toEqual({});
  });

  it('matches the generator s fourth list, which is what marks it wired', () => {
    /*
      The same invariant `ROOM_CONSUMED` carries against `ROOM_VISIBLE_SETTINGS`, one list along.
      `extract-manage-schema.mjs` cannot import this module — it has to run before the file it
      generates exists — so `ROOM_PRESENTER_CONSUMED` is a deliberate copy and this is what keeps it
      honest. A name marked wired but never projected is a Manage-page row claiming a consumer it
      does not have.
    */
    const generator = readFileSync(new URL('../../scripts/extract-manage-schema.mjs', import.meta.url), 'utf8');
    const declared = scriptListNames(generator, 'ROOM_PRESENTER_CONSUMED');
    expect(declared, 'the generator must declare ROOM_PRESENTER_CONSUMED').not.toBeNull();
    expect(declared).toEqual([...ROOM_PRESENTER_SETTINGS].sort());
  });

  it('is marked wired in the generated schema, like everything with a consumer', () => {
    const wired = new Set(ROOM_SETTINGS.filter((d) => d.wired).map((d) => d.name));
    for (const name of ROOM_PRESENTER_SETTINGS) {
      expect(wired.has(name), `${name} crosses to a presenter but is marked unwired`).toBe(true);
    }
  });

  it('lets the room write it, and the writable check knows why', () => {
    /*
      `isRoomWritableSetting` used to require the GENERAL read list, so this would have been refused.
      It accepts presenter-visible now — the endpoint that consults it already refuses any caller who
      is not an owner or true presenter, so the party that can write is the party this list projects
      to. The alternative was shipping the value to every viewer in order to let one presenter edit
      it, which is the trade the split refuses.
    */
    expect(isRoomWritableSetting('restreamToURL')).toBe(true);
    expect(ROOM_WRITABLE_SETTINGS as readonly string[]).toContain('restreamToURL');
  });

  it('still refuses a name that is on NEITHER read list', () => {
    /*
      The negative control on the widening above: making `isRoomWritableSetting` accept the presenter
      list must not have turned it into "on the writable list is enough". `hideFiles` is readable and
      not writable; `restreamToURLKey` is neither.
    */
    expect(isRoomWritableSetting('hideFiles')).toBe(false);
    expect(isRoomWritableSetting('restreamToURLKey')).toBe(false);
  });
});
