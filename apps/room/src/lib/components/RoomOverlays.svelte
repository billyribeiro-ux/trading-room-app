<script lang="ts">
  import type { AlertFilterFor } from '#lib/alert-filter.js';
  import type { ChatMode } from '#lib/chat-mode.js';
  import BootboxDialog from '#lib/components/BootboxDialog.svelte';
  import GifConfirmDialog from '#lib/components/GifConfirmDialog.svelte';
  import ImageUploadDialog from '#lib/components/ImageUploadDialog.svelte';
  import ModalHost from '#lib/components/ModalHost.svelte';
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
  import type {
    DayTradeAlertRow,
    FollowChatStyle,
    ModalName,
    SwingAlertRow,
    Theme
  } from '#lib/types.js';

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
    modals,
    chatMode,
    globalChatStyle,
    mobilePin,
    theme,

    // Page actions, passed as callbacks rather than reached for: the component asks and the page
    // decides, which is the boundary every pane from Phase 2 already uses.
    changeChatMode,
    closeActiveModal,
    downloadImage,
    minimizePoll,
    openModal,
    saveAlertFilter,
    setTheme,
    submitPollAction
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
    /** Which overlay is showing, and how it is configured. Owned by the class, not by props. */
    modals: RoomModals;
    chatMode: ChatMode;
    globalChatStyle: FollowChatStyle;
    mobilePin: string;
    theme: Theme;
    changeChatMode: (mode: ChatMode) => void;
    closeActiveModal: () => void;
    downloadImage: (url: string) => void;
    minimizePoll: () => void;
    openModal: (name: Exclude<ModalName, null>) => void;
    /* It takes the NEXT filter - `ModalHost` calls it with the pair the modal collected. */
    saveAlertFilter: (next: { alertFilterFor: AlertFilterFor; showAlertsFrom: boolean }) => void;
    setTheme: (theme: Theme) => void;
    /* The page's own signature: a five-member union and a form-value record, not a loose pair. */
    submitPollAction: (
      action: 'savePoll' | 'deleteSavedPoll' | 'sendPoll' | 'sendPollAnswer' | 'pollDone',
      values?: Record<string, string | number>
    ) => Promise<boolean>;
  } = $props();
</script>

One hidden sink per remote microphone. A consumed audio track produces no sound until it is attached
to an element, and the room has no visible control for a peer's voice - the capture keeps its own
audio elements out of sight the same way (`#mp3player` is `display: none`). -->
{#each [...mediaTransport.remoteAudioStreams.keys()] as producerId (producerId)}
  <!--
      `msRemAudio-{userID}` is the capture's own id and it is load-bearing, not decorative:
      `adjustVol` does `$("[id^=msRemAudio-]").prop("roomVolume.volume", …)` (bundle byte 2517022),
      `adjustVolPres` targets one peer's element, and `reconnectAudio` does
      `$("[id^='msRemAudio-']").remove()` before re-subscribing. This room already queries that
      exact prefix in `roomVolume.setMasterVolume`, against elements that had no id at all - so the master
      roomVolume.volume slider moved nothing.
    -->
  <audio
    id="msRemAudio-{mediaTransport.audioProducerOwners.get(producerId)?.userID ?? producerId}"
    {@attach mediaTransport.attachRemoteAudio(producerId)}
    autoplay
    style="display: none;"
  ></audio>
{/each}
<div
  id="connectedMsg"
  class="notConnectedOverlay animated fadeIn"
  style={roomEvents.reconnectedFlash ? 'display: block;' : 'display: none;'}
>
  Conected<i class="fas fa-check"></i>
</div>
<ModalHost
  name={modals.modal}
  mediaIceServers={media.iceServers}
  {mobilePin}
  modAlertFilterList={data.sessData?.modAlertFilterList}
  bind:alertFilterFor={alerts.filterFor}
  bind:showAlertsFrom={alerts.showFrom}
  onsavealertfilter={saveAlertFilter}
  onopenalertfilter={() => openModal('alert-filter')}
  mobileAndroidUrl={data.sessData?.customMobileAppEnabled
    ? data.sessData?.customMobileAppAndroidUrl
    : null}
  mobileIosUrl={data.sessData?.customMobileAppEnabled ? data.sessData?.customMobileAppIOSUrl : null}
  hideMobileCredentials={Boolean(data.sessData?.hideMobileCredentials)}
  isLimitedPresenter={media.limitedPresenter}
  canEditUsername={Boolean(data.sessData?.allowUsersToChangeUsername)}
  alerts={feeds.searchableAlerts}
  {chatMode}
  onChatModeChange={(mode) => void changeChatMode(mode)}
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
  pollOpenMode={polls.openMode}
  pollRestoreToken={polls.restoreToken}
  activePoll={data.activePoll}
  savedPolls={data.savedPolls}
  onclose={closeActiveModal}
  onSettingsTab={(tab) => (modals.settingsTab = tab)}
  onAlertTab={(tab) => (modals.alertTab = tab)}
  onTheme={setTheme}
  onPreferenceChange={(key, value) => prefs.save(key, value)}
  saveData={mediaTransport.saveData}
  onSaveDataChange={(enabled) => mediaTransport.setSaveData(enabled)}
  onDoNotDisturbChange={(enabled) => (prefs.doNotDisturbOn = enabled)}
  onPlayYoutube={(url) => void broadcasts.playYoutubeForAll(url)}
  onPostAlert={(submission) => composer.postAlert(submission)}
  onPastePostAlert={(submission) => composer.postPastedImage(submission)}
  onPollMinimize={minimizePoll}
  onPollSave={(question, choices) =>
    submitPollAction('savePoll', { q: question, choices: JSON.stringify(choices) })}
  onPollDelete={(pollId) => submitPollAction('deleteSavedPoll', { pollId })}
  onPollSend={(question, choices) =>
    submitPollAction('sendPoll', { q: question, choices: JSON.stringify(choices) })}
  onPollAnswer={(choiceIndex) => submitPollAction('sendPollAnswer', { a: choiceIndex })}
  onPollPostResults={(body) => composer.postPollResults(body)}
  onPollEnd={() => submitPollAction('pollDone')}
  onAlert={(message) => (dialogs.alert = message)}
  onConfirm={(message, onconfirm) => dialogs.confirm(message, onconfirm)}
  onReplySend={messageActions.sendReplyMessage}
  onQuestionSend={messageActions.sendAlertQuestion}
  alertQuestions={data.alertQuestions}
  onMentionUser={(name) => messageActions.mention(name)}
  onPrivateChat={(user) => {
    userActions.selectedMessageUser = user;
    privateChat.show();
  }}
  onFollowToggle={(user) => userActions.requestFollowToggle(user)}
  onFollowStyleChange={(user, style) => userActions.applyFollowStyle(user, style)}
  onMuteToggle={(user) => userActions.requestMuteToggle(user)}
  onUserAction={(action, user) => userActions.handle(action, user)}
  streamingType={typeof prefs.loaded.streamingType === 'string' ? prefs.loaded.streamingType : ''}
  onManagedUserRemoval={(list, user) => userActions.requestManagedRemoval(list, user)}
  onManagedUserInfo={(user) => userActions.openManagedInfo(user)}
  currentUser={data.user}
  targetUser={userActions.target}
  mutedUsers={userActions.mutedUsers}
  followedUsers={userActions.followedUsers}
  targetMessage={messageActions.selected}
/>
{#if modals.modal === 'image-upload'}
  <ImageUploadDialog
    onclose={() => (modals.modal = null)}
    onupload={(files, message) => void composer.uploadImages(files, message)}
  />
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
  {@const pastePreviewUrl = swingAlerts.imagePaste.previewUrl}
  <BootboxDialog
    mode="confirm"
    message=""
    onclose={() => swingAlerts.closeImagePaste()?.resolve(null)}
    onconfirm={() => void swingAlerts.confirmImagePaste()}
  >
    <div class="text-center">
      <img src={pastePreviewUrl} class="img-fluid" alt="Pasted screenshot" />
    </div>
  </BootboxDialog>
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
  {@const dayTradePastePreviewUrl = dayTradeAlerts.imagePaste.previewUrl}
  <BootboxDialog
    mode="confirm"
    message=""
    onclose={() => dayTradeAlerts.closeImagePaste()?.resolve(null)}
    onconfirm={() => void dayTradeAlerts.confirmImagePaste()}
  >
    <div class="text-center">
      <img src={dayTradePastePreviewUrl} class="img-fluid" alt="Pasted screenshot" />
    </div>
  </BootboxDialog>
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
  <BootboxDialog mode="alert" message={dialogs.alert} onclose={() => (dialogs.alert = null)} />
{/if}
{#if dialogs.prompt}
  <BootboxDialog
    mode="prompt"
    message=""
    title={dialogs.prompt.title}
    value={dialogs.prompt.value}
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
  <div
    class="bootbox modal fade imgur-modal show"
    tabindex="-1"
    role="dialog"
    aria-hidden="true"
    style="display: block;"
    onclick={(event) => {
      if (event.target === event.currentTarget) modals.selectedImageUrl = null;
    }}
  >
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header border-0">
          <!-- svelte-ignore a11y_missing_content -->
          <h5 class="modal-title"></h5>
          <button
            type="button"
            class="bootbox-close-button close btn-close"
            aria-hidden="true"
            aria-label="Close"
            onclick={() => (modals.selectedImageUrl = null)}
          ></button>
        </div>
        <div class="modal-body">
          <div class="bootbox-body">
            <img
              src={modals.selectedImageUrl}
              alt={modals.selectedImageUrl.substring(modals.selectedImageUrl.lastIndexOf('/') + 1)}
            />
            <hr />
            <button
              class="btn btn-primary btn-sm"
              onclick={() => downloadImage(modals.selectedImageUrl as string)}
              ><i class="fa fa-download"></i> Download Image</button
            >
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
