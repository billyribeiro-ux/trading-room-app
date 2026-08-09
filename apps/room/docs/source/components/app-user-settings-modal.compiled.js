RB = (() => {
  class t {
    constructor(e, i) {
      ((this.appService = e),
        (this.mediaSoupService = i),
        (this.isChatAlertsOnBottom = !1),
        (this.isChatAlertsOnRight = !1),
        (this.bufferSizeLevel = 3));
    }
    ngOnInit() {
      if (
        ((this.alertStyle =
          JSON.parse(window.localStorage.getItem('alertStyle')) ||
          this.appService.globals.alertStyle[this.appService.globals.preferences.theme]),
        (this.chatStyle = JSON.parse(window.localStorage.getItem('chatStyle')) || {
          ...this.appService.globals.chatStyle[this.appService.globals.preferences.theme]
        }),
        this.appService.globals.isPresenter)
      ) {
        this.presenterStyle = { color: '#1a1a1a', bgColor: '#e8e8e8' };
        const e =
          this.appService.globals.sessData.presenterSettings &&
          this.appService.globals.sessData.presenterSettings[
            this.appService.hashEmail(this.appService.globals.user.email)
          ]
            ? this.appService.globals.sessData.presenterSettings[
                this.appService.hashEmail(this.appService.globals.user.email)
              ]
            : null;
        (e &&
          e.hasOwnProperty('color') &&
          e.hasOwnProperty('bkgColor') &&
          '' !== e.color &&
          '' !== e.bkgColor &&
          (this.presenterStyle = { color: e.color, bgColor: e.bkgColor }),
          this.appService.globals.sessData &&
            this.appService.globals.sessData.enableDiscord &&
            !this.appService.globals.discordState.discordChecked &&
            this.appService.checkDiscordAuth());
      }
      this.bufferSizeLevel = this.appService.globals.preferences.bufferSizeLevel || 3;
    }
    ngAfterViewInit() {}
    switchRoomLayout(e) {
      ((this.appService.globals.preferences.roomSplitDir = e),
        this.appService.guiEventBus.emit('manageRoomLayout'));
      try {
        this.appService.setPreference('roomSplitDir', e);
      } catch {}
    }
    switchPMLogsOnRight() {
      bootbox.confirm(
        `Are you sure you want to change PM logs on the ${this.appService.globals.preferences.pmLogsOnRight ? 'LEFT' : 'RIGHT'}?`,
        (i) => {
          i
            ? this.appService.setPreference(
                'pmLogsOnRight',
                this.appService.globals.preferences.pmLogsOnRight
              )
            : (this.appService.globals.preferences.pmLogsOnRight =
                !this.appService.globals.preferences.pmLogsOnRight);
        }
      );
    }
    saveAlertStyle() {
      (this.appService.guiEventBus.emit('alertStyle', this.alertStyle),
        window.localStorage.setItem('alertStyle', JSON.stringify(this.alertStyle)));
    }
    resetAlertStyle() {
      return (
        void 0 !== window.localStorage.getItem('alertStyle') &&
          (window.localStorage.removeItem('alertStyle'),
          (this.alertStyle =
            this.appService.globals.alertStyle[this.appService.globals.preferences.theme]),
          this.appService.guiEventBus.emit('alertStyle', this.alertStyle)),
        !1
      );
    }
    saveChatStyle() {
      (this.appService.guiEventBus.emit('chatStyle', this.chatStyle),
        window.localStorage.setItem('chatStyle', JSON.stringify(this.chatStyle)),
        this.appService.guiEventBus.emit('redrawChatAndAlerts'));
    }
    resetChatStyle() {
      return (
        void 0 !== window.localStorage.getItem('chatStyle') &&
          (window.localStorage.removeItem('chatStyle'),
          (this.chatStyle = {
            ...this.appService.globals.chatStyle[this.appService.globals.preferences.theme]
          }),
          this.appService.guiEventBus.emit('chatStyle', this.chatStyle),
          this.appService.guiEventBus.emit('redrawChatAndAlerts')),
        !1
      );
    }
    savePresenterStyle() {
      this.appService.sendServerAdminCommand('savePresenterColors', {
        key: this.appService.hashEmail(this.appService.globals.user.email),
        val: { bkgColor: this.presenterStyle.bgColor, color: this.presenterStyle.color }
      });
    }
    resetPresenterStyle() {
      ((this.presenterStyle = {
        color:
          this.appService.globals.presenterStyle[this.appService.globals.preferences.theme].color,
        bgColor:
          this.appService.globals.presenterStyle[this.appService.globals.preferences.theme].bgColor
      }),
        this.appService.sendServerAdminCommand('savePresenterColors', {
          key: this.appService.hashEmail(this.appService.globals.user.email),
          val: { bkgColor: '', color: '' }
        }));
    }
    alertPopupChange() {
      ((this.appService.globals.preferences.alertPopup =
        !this.appService.globals.preferences.alertPopup),
        this.appService.setPreference('alertPopup', this.appService.globals.preferences.alertPopup),
        this.appService.globals.preferences.alertPopup &&
          window.Notification &&
          Notification.requestPermission()
            .then(function (e) {
              (console.log('p: ', e),
                'granted' == e || 'default' == e
                  ? console.log('User enabled notifications.')
                  : console.log('User blocked notifications.'));
            })
            .catch(function (e) {
              console.error(e);
            }));
    }
    alertSoundOnChange() {
      ((this.appService.globals.preferences.alertSoundOn =
        !this.appService.globals.preferences.alertSoundOn),
        this.appService.setPreference(
          'alertSoundOn',
          this.appService.globals.preferences.alertSoundOn
        ));
    }
    qaSoundOnChange() {
      ((this.appService.globals.preferences.qaSoundOn =
        !this.appService.globals.preferences.qaSoundOn),
        this.appService.setPreference('qaSoundOn', this.appService.globals.preferences.qaSoundOn));
    }
    chatGifOnChange() {
      ((this.appService.globals.preferences.chatGif = !this.appService.globals.preferences.chatGif),
        this.appService.setPreference('chatGif', this.appService.globals.preferences.chatGif),
        this.appService.guiEventBus.emit('redrawChatAndAlerts', { logType: 'chat' }));
    }
    chatBadgesOnChange() {
      ((this.appService.globals.preferences.chatBadges =
        !this.appService.globals.preferences.chatBadges),
        this.appService.setPreference('chatBadges', this.appService.globals.preferences.chatBadges),
        this.appService.guiEventBus.emit('redrawChatAndAlerts', { logType: 'chat' }));
    }
    chatPopupChange() {
      ((this.appService.globals.preferences.chatPopup =
        !this.appService.globals.preferences.chatPopup),
        this.appService.setPreference('chatPopup', this.appService.globals.preferences.chatPopup),
        this.appService.globals.preferences.chatPopup &&
          window.Notification &&
          Notification.requestPermission()
            .then(function (e) {
              (console.log('p: ', e),
                'granted' == e || 'default' == e
                  ? console.log('User enabled notifications.')
                  : console.log('User blocked notifications.'));
            })
            .catch(function (e) {
              console.error(e);
            }));
    }
    chatSoundOnChange() {
      ((this.appService.globals.preferences.chatSoundOn =
        !this.appService.globals.preferences.chatSoundOn),
        this.appService.setPreference(
          'chatSoundOn',
          this.appService.globals.preferences.chatSoundOn
        ));
    }
    speechRecoCCOnChange() {
      ((this.appService.globals.preferences.speechRecoCC =
        !this.appService.globals.preferences.speechRecoCC),
        (this.appService.globals.preferences.doSpeechReco =
          this.appService.globals.preferences.speechRecoCC),
        this.appService.setPreference(
          'speechRecoCC',
          this.appService.globals.preferences.speechRecoCC
        ),
        this.appService.setPreference(
          'doSpeechReco',
          this.appService.globals.preferences.doSpeechReco
        ),
        this.appService.globals.preferences.speechRecoCC
          ? this.mediaSoupService.micProducer &&
            !this.mediaSoupService.micMuted &&
            this.mediaSoupService.startSpeechRecognition()
          : this.mediaSoupService.stopSpeechRecognition());
    }
    showSpeechRecoOverlayOnChange() {
      ((this.appService.globals.preferences.showSpeechRecoOverlay =
        !this.appService.globals.preferences.showSpeechRecoOverlay),
        this.appService.setPreference(
          'showSpeechRecoOverlay',
          this.appService.globals.preferences.showSpeechRecoOverlay
        ),
        this.appService.guiEventBus.emit(
          this.appService.globals.preferences.showSpeechRecoOverlay
            ? 'reEnableSpeechRecoOverlay'
            : 'hideSpeechRecoOverlay',
          {}
        ));
    }
    pushToTalkOnChange() {
      ((this.appService.globals.preferences.pushToTalk =
        !this.appService.globals.preferences.pushToTalk),
        this.appService.setPreference(
          'pushToTalk',
          this.appService.globals.preferences.pushToTalk
        ));
    }
    enableRTEOnChange() {
      ((this.appService.globals.preferences.enableRTE =
        !this.appService.globals.preferences.enableRTE),
        this.appService.setPreference('enableRTE', this.appService.globals.preferences.enableRTE));
    }
    makeUsersFollowMyScreensOnChange() {
      ((this.appService.globals.preferences.makeUsersFollowMyScreens =
        !this.appService.globals.preferences.makeUsersFollowMyScreens),
        this.appService.setPreference(
          'makeUsersFollowMyScreens',
          this.appService.globals.preferences.makeUsersFollowMyScreens
        ));
    }
    extraChatColumnOnChange() {
      ((this.appService.globals.preferences.extraChatColumn =
        !this.appService.globals.preferences.extraChatColumn),
        this.appService.globals.preferences.extraChatColumn &&
          this.appService.sendServerCommand('getChatLog', {
            channel: 'offTopic',
            page: 0,
            extraChat: !0
          }),
        this.appService.setPreference(
          'extraChatColumn',
          this.appService.globals.preferences.extraChatColumn
        ));
    }
    chatAlwaysScrollToBottomChange() {
      ((this.appService.globals.preferences.alwaysScrollToBottom =
        !this.appService.globals.preferences.alwaysScrollToBottom),
        this.appService.setPreference(
          'alwaysScrollToBottom',
          this.appService.globals.preferences.alwaysScrollToBottom
        ));
    }
    reduceChatLogMemoryChange() {
      ((this.appService.globals.preferences.trimChatLogs =
        !this.appService.globals.preferences.trimChatLogs),
        this.appService.setPreference(
          'trimChatLogs',
          this.appService.globals.preferences.trimChatLogs
        ));
    }
    visibilityChangeEnabledChange() {
      ((this.appService.globals.preferences.visibilityChangeEnabled =
        !this.appService.globals.preferences.visibilityChangeEnabled),
        this.appService.guiEventBus.emit(
          'appVisibilityChange',
          this.appService.globals.preferences.visibilityChangeEnabled
        ),
        this.appService.setPreference(
          'visibilityChangeEnabled',
          this.appService.globals.preferences.visibilityChangeEnabled
        ));
    }
    nonTradeSoundOnChange() {
      ((this.appService.globals.preferences.nonTradeSound =
        !this.appService.globals.preferences.nonTradeSound),
        this.appService.setPreference(
          'nonTradeSound',
          this.appService.globals.preferences.nonTradeSound
        ));
    }
    longerAlertPopupOnChange() {
      ((this.appService.globals.preferences.longerAlertPopup =
        !this.appService.globals.preferences.longerAlertPopup),
        this.appService.setPreference(
          'longerAlertPopup',
          this.appService.globals.preferences.longerAlertPopup
        ));
    }
    doNotDisturbOnChange() {
      this.appService.globals.preferences.doNotDisturbOn =
        !this.appService.globals.preferences.doNotDisturbOn;
    }
    recordingStartSoundOnChange() {
      ((this.appService.globals.preferences.recordingStartSound =
        !this.appService.globals.preferences.recordingStartSound),
        this.appService.setPreference(
          'recordingStartSound',
          this.appService.globals.preferences.recordingStartSound
        ));
    }
    recordingStopSoundOnChange() {
      ((this.appService.globals.preferences.recordingStopSound =
        !this.appService.globals.preferences.recordingStopSound),
        this.appService.setPreference(
          'recordingStopSound',
          this.appService.globals.preferences.recordingStopSound
        ));
    }
    recPreviewWindowOnChange() {
      ((this.appService.globals.preferences.recPreviewWindow =
        !this.appService.globals.preferences.recPreviewWindow),
        this.appService.setPreference(
          'recPreviewWindow',
          this.appService.globals.preferences.recPreviewWindow
        ),
        this.appService.globals.preferences.recPreviewWindow ||
          this.appService.guiEventBus.emit('closeRecPreviewWindow'));
    }
    reactionsPopupOnChange() {
      ((this.appService.globals.preferences.reactionsPopup =
        !this.appService.globals.preferences.reactionsPopup),
        this.appService.setPreference(
          'reactionsPopup',
          this.appService.globals.preferences.reactionsPopup
        ));
    }
    reactionsPopupQAOnChange() {
      ((this.appService.globals.preferences.reactionsPopupQA =
        !this.appService.globals.preferences.reactionsPopupQA),
        this.appService.setPreference(
          'reactionsPopupQA',
          this.appService.globals.preferences.reactionsPopupQA
        ));
    }
    reactionsSoundOnChange() {
      ((this.appService.globals.preferences.reactionsSoundOn =
        !this.appService.globals.preferences.reactionsSoundOn),
        this.appService.setPreference(
          'reactionsSoundOn',
          this.appService.globals.preferences.reactionsSoundOn
        ));
    }
    reactionsSoundQAOnChange() {
      ((this.appService.globals.preferences.qaReactionSoundOn =
        !this.appService.globals.preferences.qaReactionSoundOn),
        this.appService.setPreference(
          'qaReactionSoundOn',
          this.appService.globals.preferences.qaReactionSoundOn
        ));
    }
    noteUpdatePopupOnChange() {
      ((this.appService.globals.preferences.noteUpdatePopup =
        !this.appService.globals.preferences.noteUpdatePopup),
        this.appService.setPreference(
          'noteUpdatePopup',
          this.appService.globals.preferences.noteUpdatePopup
        ));
    }
    updatePositionsIframeOnChange() {
      ((this.appService.globals.preferences.updatePositionsIframe =
        !this.appService.globals.preferences.updatePositionsIframe),
        this.appService.setPreference(
          'updatePositionsIframe',
          this.appService.globals.preferences.updatePositionsIframe
        ),
        this.appService.guiEventBus.emit('updatePositionsIframeChanged'));
    }
    beepOnUserJoinChange() {
      ((this.appService.globals.preferences.beepOnUserJoin =
        !this.appService.globals.preferences.beepOnUserJoin),
        this.appService.setPreference(
          'beepOnUserJoin',
          this.appService.globals.preferences.beepOnUserJoin
        ));
    }
    popupOnUserJoinChange() {
      ((this.appService.globals.preferences.popupOnUserJoin =
        !this.appService.globals.preferences.popupOnUserJoin),
        this.appService.setPreference(
          'popupOnUserJoin',
          this.appService.globals.preferences.popupOnUserJoin
        ));
    }
    beepOnUserLeaveChange() {
      ((this.appService.globals.preferences.beepOnUserLeave =
        !this.appService.globals.preferences.beepOnUserLeave),
        this.appService.setPreference(
          'beepOnUserLeave',
          this.appService.globals.preferences.beepOnUserLeave
        ));
    }
    popupOnUserLeaveChange() {
      ((this.appService.globals.preferences.popupOnUserLeave =
        !this.appService.globals.preferences.popupOnUserLeave),
        this.appService.setPreference(
          'popupOnUserLeave',
          this.appService.globals.preferences.popupOnUserLeave
        ));
    }
    smallImagePreviewOnChange() {
      ((this.appService.globals.preferences.smallImagePreview =
        !this.appService.globals.preferences.smallImagePreview),
        (this.appService.globals.preferences.defaultImagePreview =
          this.appService.globals.preferences.smallImagePreview),
        this.appService.setPreference(
          'smallImagePreview',
          this.appService.globals.preferences.smallImagePreview
        ));
    }
    disableVideoChange() {
      this.appService.globals.preferences.disableVideo =
        !this.appService.globals.preferences.disableVideo;
    }
    changeChatMode(e, i) {
      if ((i.stopPropagation(), i.preventDefault(), this.appService.globals.sessData.chatMode == e))
        return;
      let o = '"Group Chat"?';
      ('p' == e ? (o = '"Webinar Mode"?') : 'd' == e && (o = '"Disabled"?'),
        bootbox.confirm('Are you sure you want to change the chat mode to ' + o, (s) => {
          s
            ? (P('changing mode...'),
              this.appService.sendServerAdminCommand('changeChatMode', { mode: e }))
            : P('mode not changed. currently:' + this.appService.globals.sessData.chatMode);
        }));
    }
    switchTheme(e) {
      if (
        ((this.alertStyle =
          JSON.parse(window.localStorage.getItem('alertStyle')) ||
          this.appService.globals.alertStyle[e]),
        (this.chatStyle =
          JSON.parse(window.localStorage.getItem('chatStyle')) ||
          this.appService.globals.chatStyle[e]),
        this.appService.globals.isPresenter)
      ) {
        const i =
          this.appService.globals.sessData.presenterSettings &&
          this.appService.globals.sessData.presenterSettings[
            this.appService.hashEmail(this.appService.globals.user.email)
          ];
        ((this.presenterStyle = { color: '#1a1a1a', bgColor: '#e8e8e8' }),
          i &&
            i.hasOwnProperty('color') &&
            i.hasOwnProperty('bkgColor') &&
            '' !== i.color &&
            '' !== i.bkgColor &&
            (this.presenterStyle = { color: i.color, bgColor: i.bkgColor }));
      }
      (this.resetChatStyle(), this.appService.guiEventBus.emit('switchTheme', e));
    }
    switchAlertMode(e) {
      this.appService.guiEventBus.emit('switchAlertsDisplayMode', e);
    }
    switchChatMode(e) {
      this.appService.guiEventBus.emit('switchChatDisplayMode', e);
    }
    switchChatAndAlertMode(e) {
      (this.switchAlertMode(e), this.switchChatMode(e));
    }
    switchChatDisplayMode(e) {
      this.appService.guiEventBus.emit('switchChatDisplayMode', e);
    }
    removePreviewWindows() {
      ($('.webcamsHolder').remove(), $('#screenshareLocalPreviewHolder').remove());
    }
    openUserInfo() {
      ($('#user-settings-modal').modal('hide'),
        this.appService.getUserInfo(
          this.appService.globals.user.userXrefID,
          this.appService.globals.user.id,
          null,
          this.appService.globals.user.serverID,
          !0
        ),
        this.appService.guiEventBus.emit('doUserInfo', this.appService.globals.user.userXrefID));
    }
    getMyToken() {
      let e = this.appService.globals.sessionID,
        i = this.appService.globals.sesionToken;
      ($('#user-settings-modal').modal('hide'),
        bootbox.dialog({
          title: 'Session Information',
          message: `\n        <div class="mb-3">\n          <label class="form-label"><strong>Session ID:</strong></label>\n          <div class="input-group">\n            <input type="text" class="form-control" id="sessionId" value="${e}" readonly>\n            <button class="btn btn-outline-secondary" type="button" onclick="navigator.clipboard.writeText('${e}').then(() => alert('Session ID copied!'))">\n              <i class="fas fa-copy"></i> Copy\n            </button>\n          </div>\n        </div>\n        <div class="mb-3">\n          <label class="form-label"><strong>Session Token:</strong></label>\n          <div class="input-group">\n            <input type="text" class="form-control" id="sessionToken" value="${i}" readonly>\n            <button class="btn btn-outline-secondary" type="button" onclick="navigator.clipboard.writeText('${i}').then(() => alert('Session Token copied!'))">\n              <i class="fas fa-copy"></i> Copy\n            </button>\n          </div>\n        </div>\n      `,
          buttons: { ok: { label: 'Close', className: 'btn-primary' } }
        }));
    }
    openAlertFilterModal() {
      this.appService.guiEventBus.emit('doAlertFilterModal');
    }
    bufferSizeLevelChange() {
      ((this.appService.globals.preferences.bufferSizeLevel = this.bufferSizeLevel),
        this.appService.setPreference('bufferSizeLevel', this.bufferSizeLevel));
    }
    doDiscordAuth() {
      (P('Discord auth initiated'),
        window.open(
          `${this.appService.globals.apiROOT}/discord/v2/auth/start?token=${this.appService.globals.sesionToken}`,
          '_blank'
        ),
        (this.appService.globals.discordState.discordLinking = !0));
    }
    revokeDiscord() {
      var e = this;
      return I(function* () {
        (P('Revoking Discord auth'),
          (yield e.appService.revokeDiscord()).success &&
            (bootbox.alert('Discord account successfully unlinked'),
            (e.appService.globals.discordState.discordChecked = !0),
            (e.appService.globals.discordState.discordConnected = !1),
            (e.appService.globals.discordState.discordUserId = ''),
            (e.appService.globals.discordState.discordUsername = ''),
            (e.appService.globals.discordState.discordLinkedAt = '')));
      })();
    }
    checkDiscordStatus() {
      var e = this;
      return I(function* () {
        let i = yield e.appService.checkDiscordAuth();
        if (i.success) {
          ((e.appService.globals.discordState.discordChecked = !0),
            (e.appService.globals.discordState.discordConnected = i.discordLinked),
            (e.appService.globals.discordState.discordUserId = i.discordData.discordUserId),
            (e.appService.globals.discordState.discordUsername = i.discordData.userName));
          try {
            e.appService.globals.discordState.discordLinkedAt = new Date(
              i.discordData.discordLinkedAt
            ).toLocaleString();
          } catch {
            e.appService.globals.discordState.discordLinkedAt = '';
          }
        }
        e.appService.globals.discordState.discordLinking = !1;
      })();
    }
    muteAllNonAdmins() {
      this.appService.appEventBus.emit('muteAllNonAdmins');
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(fa));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-user-settings-modal']],
        decls: 296,
        vars: 69,
        consts: [
          [
            'id',
            'user-settings-modal',
            'tabIndex',
            '-1',
            'role',
            'dialog',
            'aria-labelledby',
            'user-settings-modal',
            'aria-hidden',
            'true',
            1,
            'modal',
            'fade'
          ],
          ['role', 'document', 1, 'modal-dialog'],
          [1, 'modal-content'],
          [1, 'modal-header'],
          [
            'type',
            'button',
            'data-bs-dismiss',
            'modal',
            'aria-label',
            'Close',
            1,
            'btn-close',
            'btn-close-white'
          ],
          [1, 'modal-body'],
          ['id', 'userSettingsTab', 'role', 'tablist', 1, 'nav', 'nav-tabs'],
          [1, 'nav-item'],
          [
            'id',
            'user-app-settings-tab',
            'data-bs-toggle',
            'tab',
            'href',
            '#user-app-settings',
            'role',
            'tab',
            'aria-controls',
            'user-app-settings',
            'aria-selected',
            'true',
            1,
            'nav-link',
            'active'
          ],
          [
            'id',
            'user-alert-settings-tab',
            'data-bs-toggle',
            'tab',
            'href',
            '#user-alert-settings',
            'role',
            'tab',
            'aria-controls',
            'user-alert-settings',
            'aria-selected',
            'false',
            1,
            'nav-link'
          ],
          [
            'id',
            'user-chat-settings-tab',
            'data-bs-toggle',
            'tab',
            'href',
            '#user-chat-settings',
            'role',
            'tab',
            'aria-controls',
            'user-chat-settings',
            'aria-selected',
            'false',
            1,
            'nav-link'
          ],
          ['id', 'userSettingsTabContent', 1, 'tab-content'],
          [
            'id',
            'user-app-settings',
            'role',
            'tabpanel',
            'aria-labelledby',
            'user-app-settings-tab',
            1,
            'tab-pane',
            'fade',
            'show',
            'active'
          ],
          [1, 'p-2', 'themes'],
          ['id', 'colorTheme', 'title', 'Choose Color Theme', 1, 'pb-2'],
          [1, 'fas', 'fa-palette'],
          [1, 'pl-2'],
          [1, 'ml-5'],
          [
            'type',
            'radio',
            'name',
            'app-color-theme',
            'value',
            'Light Theme',
            'id',
            'app-light-theme',
            1,
            'form-check-input',
            3,
            'click',
            'checked'
          ],
          ['for', 'app-light-theme', 1, 'form-check-label', 3, 'click'],
          [
            'type',
            'radio',
            'name',
            'app-color-theme',
            'value',
            'Dark Theme',
            'id',
            'app-dark-theme',
            1,
            'form-check-input',
            3,
            'click',
            'checked'
          ],
          ['for', 'app-dark-theme', 1, 'form-check-label', 3, 'click'],
          ['id', 'roomLayout', 'title', 'Choose Room Layout', 1, 'pb-2'],
          [1, 'fa', 'fa-columns'],
          [1, 'form-check'],
          [
            'type',
            'radio',
            'name',
            'roomLayoutOptions',
            'id',
            'chat-alerts-left',
            'value',
            'chat-alerts-left',
            1,
            'form-check-input',
            3,
            'checked'
          ],
          ['for', 'chat-alerts-left', 1, 'form-check-label', 3, 'click'],
          [
            'type',
            'radio',
            'name',
            'roomLayoutOptions',
            'id',
            'chat-alerts-top',
            'value',
            'chat-alerts-top',
            1,
            'form-check-input',
            3,
            'checked'
          ],
          ['for', 'chat-alerts-top', 1, 'form-check-label', 3, 'click'],
          [
            'type',
            'radio',
            'name',
            'roomLayoutOptions',
            'id',
            'chat-alerts-right',
            'value',
            'chat-alerts-right',
            1,
            'form-check-input',
            3,
            'checked'
          ],
          ['for', 'chat-alerts-right', 1, 'form-check-label', 3, 'click'],
          [
            'type',
            'radio',
            'name',
            'roomLayoutOptions',
            'id',
            'chat-alerts-bottom',
            'value',
            'chat-alerts-bottom',
            1,
            'form-check-input',
            3,
            'checked'
          ],
          ['for', 'chat-alerts-bottom', 1, 'form-check-label', 3, 'click'],
          [
            'type',
            'checkbox',
            'name',
            'pm-window-layout',
            'value',
            'appService.globals.preferences.pmLogsOnRight',
            'id',
            'pm-window-layout',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'click',
            'checked',
            'ngModel'
          ],
          ['for', 'pm-window-layout', 1, 'form-check-label'],
          [1, 'p-2', 'd-flex', 'align-items-end', 'justify-content-between'],
          [1, 'flex-fill'],
          ['id', 'chatColorMode', 'title', 'Chat Color Mode', 1, 'pb-2'],
          [1, 'fas', 'fa-wrench'],
          [
            'type',
            'color',
            'name',
            'chat-text-color',
            'value',
            'chatStyle.color',
            'id',
            'chat-text-color',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'chat-text-color', 1, 'form-check-label', 'ml-4', 'pl-2'],
          [
            'type',
            'color',
            'name',
            'chat-username-color',
            'value',
            'chatStyle.usernameColor',
            'id',
            'chat-username-color',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'chat-username-color', 1, 'form-check-label', 'ml-4', 'pl-2'],
          [
            'type',
            'color',
            'name',
            'chat-bg-color',
            'value',
            'chatStyle.bgColor',
            'id',
            'chat-bg-color',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'chat-bg-color', 1, 'form-check-label', 'ml-4', 'pl-2'],
          [
            'type',
            'color',
            'name',
            'chat-ticker-color',
            'value',
            'chatStyle.tickerColor',
            'id',
            'chat-ticker-color',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'chat-ticker-color', 1, 'form-check-label', 'ml-4', 'pl-2'],
          [
            'type',
            'number',
            'name',
            'chat-text-size',
            'value',
            'chatStyle.fontSize',
            'id',
            'chat-text-size',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'chat-text-size', 1, 'form-check-label', 'ml-4', 'pl-2'],
          [1, 'text-right'],
          ['type', 'button', 1, 'btn', 'btn-outline-danger', 'mx-1', 3, 'click'],
          ['type', 'button', 1, 'btn', 'btn-outline-light', 3, 'click'],
          [1, 'p-2', 'text-mode-box'],
          ['id', 'appDoNotDisturb', 'title', 'Do not disturb', 1, 'pb-2'],
          [1, 'fas', 'fa-bell-slash'],
          [
            'type',
            'checkbox',
            'name',
            'app-donot-disturb',
            'value',
            'Do not disturb',
            'id',
            'app-donot-disturb',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'app-donot-disturb', 1, 'form-check-label'],
          [
            'type',
            'checkbox',
            'name',
            'app-recording-start-sound',
            'value',
            'Do not disturb',
            'id',
            'app-recording-start-sound',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'app-recording-start-sound', 1, 'form-check-label'],
          [
            'type',
            'checkbox',
            'name',
            'app-recording-stop-sound',
            'value',
            'Do not disturb',
            'id',
            'app-recording-stop-sound',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'app-recording-stop-sound', 1, 'form-check-label'],
          ['class', 'ml-5', 4, 'ngIf'],
          ['id', 'appDisableVideo', 'title', 'Disable/Enable Video', 1, 'pb-2'],
          [1, 'fas', 'fa-desktop'],
          [
            'type',
            'checkbox',
            'name',
            'app-disable-video',
            'value',
            'Disable video',
            'id',
            'app-disable-video',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'app-disable-video', 1, 'form-check-label'],
          [1, 'mx-3'],
          [1, 'btn', 'btn-warning', 'btn-sm', 'm-1', 3, 'click'],
          [1, 'fas', 'fa-user-tie', 'me-1'],
          [
            'id',
            'user-alert-settings',
            'role',
            'tabpanel',
            'aria-labelledby',
            'user-alert-settings-tab',
            1,
            'tab-pane',
            'fade'
          ],
          ['id', 'alertTextMode', 'title', 'Alert Text Mode', 1, 'pb-2'],
          [1, 'fas', 'fa-file-alt'],
          [
            'type',
            'radio',
            'name',
            'alert-text-mode',
            'value',
            'Alert Regular Mode',
            'id',
            'alert-regular-mode',
            1,
            'form-check-input',
            3,
            'click',
            'checked'
          ],
          ['for', 'alert-regular-mode', 1, 'form-check-label', 3, 'click'],
          [
            'type',
            'radio',
            'name',
            'alert-text-mode',
            'value',
            'Alert Compact Mode',
            'id',
            'alert-compact-mode',
            1,
            'form-check-input',
            3,
            'click',
            'checked'
          ],
          ['for', 'alert-compact-mode', 1, 'form-check-label', 3, 'click'],
          ['id', 'alertDoNotDisturb', 'title', 'Alert Do not disturb', 1, 'pb-2'],
          [
            'type',
            'checkbox',
            'name',
            'alert-popup-donot-disturb',
            'value',
            'Alert Popup Do not disturb',
            'id',
            'alert-popup-donot-disturb',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'alert-popup-donot-disturb', 1, 'form-check-label'],
          [
            'type',
            'checkbox',
            'name',
            'alert-donot-disturb',
            'value',
            'Alert Do not disturb',
            'id',
            'alert-donot-disturb',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'alert-donot-disturb', 1, 'form-check-label'],
          [
            'type',
            'checkbox',
            'name',
            'qa-donot-disturb',
            'value',
            'QA Do not disturb',
            'id',
            'qa-donot-disturb',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'qa-donot-disturb', 1, 'form-check-label'],
          [
            'type',
            'checkbox',
            'name',
            'non-trade-alert',
            'value',
            'Alert Do not disturb',
            'id',
            'non-trade-alert',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'non-trade-alert', 1, 'form-check-label'],
          ['id', 'alertPopup', 'title', 'Alert popup', 1, 'pb-2'],
          [1, 'fas', 'fa-bell'],
          [
            'type',
            'checkbox',
            'name',
            'longer-alert-popup',
            'value',
            'Longer alert popup',
            'id',
            'longer-alert-popup',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'longer-alert-popup', 1, 'form-check-label'],
          [
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#alert-filter-modal',
            1,
            'btn',
            'btn-primary',
            'btn-sm',
            'mt-4',
            'ml-4'
          ],
          [
            'id',
            'user-chat-settings',
            'role',
            'tabpanel',
            'aria-labelledby',
            'user-chat-settings-tab',
            1,
            'tab-pane',
            'fade'
          ],
          ['id', 'chatTextMode', 'title', 'Chat Text Mode', 1, 'pb-2'],
          [
            'type',
            'radio',
            'name',
            'chat-text-mode',
            'value',
            'Chat Regular Mode',
            'id',
            'chat-regular-mode',
            'aria-checked',
            'true',
            1,
            'form-check-input',
            3,
            'click',
            'checked'
          ],
          ['for', 'chat-regular-mode', 1, 'form-check-label', 3, 'click'],
          [
            'type',
            'radio',
            'name',
            'chat-text-mode',
            'value',
            'Chat Compact Mode',
            'id',
            'chat-compact-mode',
            1,
            'form-check-input',
            3,
            'click',
            'checked'
          ],
          ['for', 'chat-compact-mode', 1, 'form-check-label', 3, 'click'],
          ['id', 'chatImagePreview', 'title', 'Chat Image Preview', 1, 'pb-2'],
          [1, 'fas', 'fa-image'],
          [
            'type',
            'checkbox',
            'name',
            'small-image-preview',
            'value',
            'Small image preview',
            'id',
            'small-image-preview',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'small-image-preview', 1, 'form-check-label'],
          ['id', 'chatDoNotDisturb', 'title', 'chat Do not disturb', 1, 'pb-2'],
          [
            'type',
            'checkbox',
            'name',
            'chat-gif-donot-disturb',
            'value',
            'Chat Gif Do not disturb',
            'id',
            'chat-gif-donot-disturb',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'chat-gif-donot-disturb', 1, 'form-check-label'],
          [
            'type',
            'checkbox',
            'name',
            'chat-badges-donot-disturb',
            'value',
            'Chat Badges Do not disturb',
            'id',
            'chat-badges-donot-disturb',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'chat-badges-donot-disturb', 1, 'form-check-label'],
          [
            'type',
            'checkbox',
            'name',
            'chat-popup-donot-disturb',
            'value',
            'Chat Popup Do not disturb',
            'id',
            'chat-popup-donot-disturb',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'chat-popup-donot-disturb', 1, 'form-check-label'],
          [
            'type',
            'checkbox',
            'name',
            'chat-donot-disturb',
            'value',
            'Chat Do not disturb',
            'id',
            'chat-donot-disturb',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'chat-donot-disturb', 1, 'form-check-label'],
          ['id', 'extraChatColumn', 'title', 'Extra Chat Column', 1, 'pb-2'],
          [1, 'fas', 'fa-comment'],
          [
            'type',
            'checkbox',
            'name',
            'extra-chat-column',
            'value',
            'Extra Chat Column',
            'id',
            'extra-chat-column',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'extra-chat-column', 1, 'form-check-label'],
          ['id', 'alwaysScrollToBottom', 'title', 'Always Scroll To Bottom', 1, 'pb-2'],
          [1, 'fas', 'fa-scroll'],
          [
            'type',
            'checkbox',
            'name',
            'chat-always-scroll',
            'value',
            'Chat Always Scroll To Bottom',
            'id',
            'chat-always-scroll',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'chat-always-scroll', 1, 'form-check-label'],
          ['id', 'trimChatlogFat', 'title', 'Reduce Chatlog Memory', 1, 'pb-2'],
          [1, 'fas', 'fa-trash'],
          [
            'type',
            'checkbox',
            'name',
            'chat-mem-clear',
            'value',
            'Reduce Chatlog Memory',
            'id',
            'chat-mem-clear',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'chat-mem-clear', 1, 'form-check-label'],
          [
            'type',
            'checkbox',
            'name',
            'visibility-change-enabled',
            'value',
            'Tab sleep optimization',
            'id',
            'visibility-change-enabled',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'visibility-change-enabled', 1, 'form-check-label'],
          [
            'id',
            'discord-settings',
            'role',
            'tabpanel',
            'aria-labelledby',
            'discord-settings-tab',
            1,
            'tab-pane',
            'fade'
          ],
          [
            'id',
            'presenter-settings',
            'role',
            'tabpanel',
            'aria-labelledby',
            'presenter-settings-tab',
            1,
            'tab-pane',
            'fade'
          ],
          [1, 'modal-footer', 'text-center'],
          ['type', 'button', 'data-bs-dismiss', 'modal', 1, 'btn', 'btn-secondary'],
          [
            'id',
            'presenter-settings-tab',
            'data-bs-toggle',
            'tab',
            'href',
            '#presenter-settings',
            'role',
            'tab',
            'aria-controls',
            'presenter-settings',
            'aria-selected',
            'false',
            1,
            'nav-link'
          ],
          [
            'id',
            'discord-settings-tab',
            'data-bs-toggle',
            'tab',
            'href',
            '#discord-settings',
            'role',
            'tab',
            'aria-controls',
            'discord-settings',
            'aria-selected',
            'false',
            1,
            'nav-link'
          ],
          [
            'type',
            'checkbox',
            'name',
            'app-recording-preview-window',
            'value',
            'Do not disturb',
            'id',
            'app-recording-preview-window',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'app-recording-preview-window', 1, 'form-check-label'],
          [
            'type',
            'checkbox',
            'name',
            'app-reactions-popup',
            'value',
            'Do not disturb',
            'id',
            'app-reactions-popup',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'app-reactions-popup', 1, 'form-check-label'],
          [
            'type',
            'checkbox',
            'name',
            'app-reactions-popup-qa',
            'value',
            'Do not disturb',
            'id',
            'app-reactions-popup-qa',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'app-reactions-popup-qa', 1, 'form-check-label'],
          [
            'type',
            'checkbox',
            'name',
            'note-update-popup',
            'value',
            'Do not disturb',
            'id',
            'note-update-popup',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'note-update-popup', 1, 'form-check-label'],
          [
            'type',
            'checkbox',
            'name',
            'app-positions-update',
            'value',
            'Do not disturb',
            'id',
            'app-positions-update',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'app-positions-update', 1, 'form-check-label'],
          ['id', 'appBeepOnUserJoinLeave', 'title', 'Beep on user', 1, 'pb-2'],
          [1, 'fas', 'fa-user'],
          [
            'type',
            'checkbox',
            'name',
            'beep-on-user-join',
            'value',
            'Do not disturb',
            'id',
            'beep-on-user-join',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'beep-on-user-join', 1, 'form-check-label'],
          [
            'type',
            'checkbox',
            'name',
            'popup-on-user-join',
            'value',
            'Do not disturb',
            'id',
            'popup-on-user-join',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'popup-on-user-join', 1, 'form-check-label'],
          [
            'type',
            'checkbox',
            'name',
            'beep-on-user-leave',
            'value',
            'Do not disturb',
            'id',
            'beep-on-user-leave',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'beep-on-user-leave', 1, 'form-check-label'],
          [
            'type',
            'checkbox',
            'name',
            'popup-on-user-leave',
            'value',
            'Do not disturb',
            'id',
            'popup-on-user-leave',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'popup-on-user-leave', 1, 'form-check-label'],
          ['id', 'appSpeechRecoOverlay', 'title', 'Show Speech Recognition Overlay', 1, 'pb-2'],
          [1, 'fas', 'fa-closed-captioning'],
          [
            'type',
            'checkbox',
            'name',
            'app-speech-reco-overlay',
            'value',
            'Show Speech Recognition Overlay',
            'id',
            'app-speech-reco-overlay',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'app-speech-reco-overlay', 1, 'form-check-label'],
          [1, 'btn', 'btn-danger', 'btn-sm', 'm-1', 3, 'click'],
          [1, 'fas', 'fa-video-slash', 'me-1'],
          [1, 'fas', 'fa-microphone-slash', 'me-1'],
          [1, 'btn', 'btn-info', 'btn-sm', 'm-1', 3, 'click'],
          [
            'type',
            'checkbox',
            'name',
            'app-reactions-sound-qa',
            'value',
            'Do not disturb',
            'id',
            'app-reactions-sound-qa',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'app-reactions-sound-qa', 1, 'form-check-label'],
          [
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#alert-filter-modal',
            1,
            'btn',
            'btn-primary',
            'btn-sm',
            'mt-4',
            'ml-4',
            3,
            'click'
          ],
          [1, 'fas', 'fa-filter', 'me-1'],
          ['id', 'groupChatControl', 'title', 'Group Chat Control', 1, 'pb-2'],
          [1, 'fas', 'fa-comments'],
          [
            'type',
            'radio',
            'name',
            'regular-group-chat',
            'value',
            'Regular Group Chat',
            'id',
            'regular-group-chat',
            'aria-checked',
            'true',
            1,
            'form-check-input',
            3,
            'click',
            'checked'
          ],
          ['for', 'regular-group-chat', 1, 'form-check-label', 3, 'click'],
          [
            'type',
            'radio',
            'name',
            'webinar-group-chat',
            'value',
            'Webinar Mode',
            'id',
            'webinar-group-chat',
            'aria-checked',
            'true',
            1,
            'form-check-input',
            3,
            'click',
            'checked'
          ],
          ['for', 'webinar-group-chat', 1, 'form-check-label', 3, 'click'],
          [1, 'form-text', 'text-white'],
          [
            'type',
            'radio',
            'name',
            'disabled-group-chat',
            'value',
            'Disable Group Chat',
            'id',
            'disabled-group-chat',
            'aria-checked',
            'true',
            1,
            'form-check-input',
            3,
            'click',
            'checked'
          ],
          ['for', 'disabled-group-chat', 1, 'form-check-label', 3, 'click'],
          [1, 'p-2'],
          [1, 'fas', 'fa-spinner', 'fa-spin'],
          [1, 'btn', 'btn-outline-warning', 3, 'click'],
          [1, 'btn', 'btn-outline-info', 3, 'click'],
          [2, 'font-weight', 'bold'],
          [1, 'btn', 'btn-outline-danger', 3, 'click'],
          ['id', 'presenterDoNotDisturb', 'title', 'Presenter Do not disturb', 1, 'pb-2'],
          [
            'type',
            'checkbox',
            'name',
            'presenter-alert-donot-disturb',
            'value',
            'Presenter Alert Do not disturb',
            'id',
            'presenter-alert-donot-disturb',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'presenter-alert-donot-disturb', 1, 'form-check-label'],
          [
            'type',
            'checkbox',
            'name',
            'presenter-chat-donot-disturb',
            'value',
            'Presenter Chat Do not disturb',
            'id',
            'presenter-chat-donot-disturb',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'presenter-chat-donot-disturb', 1, 'form-check-label'],
          ['id', 'presenterPushToTalk', 'title', 'Presenter Push To Talk', 1, 'pb-2'],
          [1, 'fas', 'fa-microphone-alt'],
          [
            'type',
            'checkbox',
            'name',
            'presenter-push-to-talk',
            'value',
            'Presenter Push To Talk',
            'id',
            'presenter-push-to-talk',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'presenter-push-to-talk', 1, 'form-check-label'],
          ['id', 'presenterEnableRTE', 'title', 'Presenter Enable RTE', 1, 'pb-2'],
          [1, 'fas', 'fa-edit'],
          [
            'type',
            'checkbox',
            'name',
            'presenter-enable-rte',
            'value',
            'Presenter Enable RTE',
            'id',
            'presenter-enable-rte',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'presenter-enable-rte', 1, 'form-check-label'],
          ['id', 'presenterFollowMyScreens', 'title', 'Presenter Follow My Screens', 1, 'pb-2'],
          [
            'type',
            'checkbox',
            'name',
            'presenter-follow-my-screens',
            'value',
            'Presenter Follow My Screens',
            'id',
            'presenter-follow-my-screens',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'presenter-follow-my-screens', 1, 'form-check-label'],
          ['id', 'presenterColorMode', 'title', 'Presenter Color Mode', 1, 'pb-2'],
          [
            'type',
            'color',
            'name',
            'presenter-text-color',
            'value',
            'presenterStyle.color',
            'id',
            'presenter-text-color',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'presenter-text-color', 1, 'form-check-label', 'ml-4', 'pl-2'],
          [
            'type',
            'color',
            'name',
            'presenter-bg-color',
            'value',
            'presenterStyle.bgColor',
            'id',
            'presenter-bg-color',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'presenter-bg-color', 1, 'form-check-label', 'ml-4', 'pl-2'],
          ['id', 'presenterSpeechRecognition', 'title', 'Presenter Speech Recognition', 1, 'pb-2'],
          [
            'type',
            'checkbox',
            'name',
            'presenter-speech-recognition',
            'value',
            'Presenter Speech Recognition',
            'id',
            'presenter-speech-recognition',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'presenter-speech-recognition', 1, 'form-check-label']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 0)(1, 'div', 1)(2, 'div', 2)(3, 'div', 3)(4, 'h5'),
            v(5, 'General Settings'),
            u(),
            T(6, 'button', 4),
            u(),
            d(7, 'div', 5)(8, 'ul', 6)(9, 'li', 7)(10, 'a', 8),
            v(11, 'App Settings'),
            u()(),
            d(12, 'li', 7)(13, 'a', 9),
            v(14, 'Alert Settings'),
            u()(),
            d(15, 'li', 7)(16, 'a', 10),
            v(17, 'Chat Settings'),
            u()(),
            H(18, mEe, 3, 0, 'li', 7)(19, gEe, 3, 0, 'li', 7),
            u(),
            d(20, 'div', 11)(21, 'div', 12)(22, 'div', 13)(23, 'div', 14),
            T(24, 'i', 15),
            d(25, 'span', 16),
            v(26, 'Choose Color Theme:'),
            u()(),
            d(27, 'div', 17)(28, 'input', 18),
            x('click', function () {
              return o.switchTheme('lightTheme');
            }),
            u(),
            d(29, 'label', 19),
            x('click', function () {
              return o.switchTheme('lightTheme');
            }),
            v(30, ' Light Theme '),
            u()(),
            d(31, 'div', 17)(32, 'input', 20),
            x('click', function () {
              return o.switchTheme('darkTheme');
            }),
            u(),
            d(33, 'label', 21),
            x('click', function () {
              return o.switchTheme('darkTheme');
            }),
            v(34, ' Dark Theme '),
            u()()(),
            d(35, 'div', 13)(36, 'div', 22),
            T(37, 'i', 23),
            d(38, 'span', 16),
            v(39, 'Room Layout:'),
            u()(),
            d(40, 'div', 17)(41, 'div', 24),
            T(42, 'input', 25),
            d(43, 'label', 26),
            x('click', function () {
              return o.switchRoomLayout('ltr');
            }),
            v(44, ' Chat and Alerts left '),
            u()(),
            d(45, 'div', 24),
            T(46, 'input', 27),
            d(47, 'label', 28),
            x('click', function () {
              return o.switchRoomLayout('ttb');
            }),
            v(48, ' Chat and Alerts top '),
            u()(),
            d(49, 'div', 24),
            T(50, 'input', 29),
            d(51, 'label', 30),
            x('click', function () {
              return o.switchRoomLayout('rtl');
            }),
            v(52, ' Chat and Alerts right '),
            u()(),
            d(53, 'div', 24),
            T(54, 'input', 31),
            d(55, 'label', 32),
            x('click', function () {
              return o.switchRoomLayout('btt');
            }),
            v(56, ' Chat and Alerts bottom '),
            u()()(),
            d(57, 'div', 17),
            T(58, 'hr'),
            d(59, 'input', 33),
            Ve('ngModelChange', function (r) {
              return (
                He(o.appService.globals.preferences.pmLogsOnRight, r) ||
                  (o.appService.globals.preferences.pmLogsOnRight = r),
                r
              );
            }),
            x('click', function () {
              return o.switchPMLogsOnRight();
            }),
            u(),
            d(60, 'label', 34),
            v(61, ' PM logs on the right '),
            u()()(),
            d(62, 'div', 35)(63, 'div', 36)(64, 'div', 37),
            T(65, 'i', 38),
            d(66, 'span', 16),
            v(67, 'Colors & Size:'),
            u()(),
            d(68, 'div', 17)(69, 'input', 39),
            Ve('ngModelChange', function (r) {
              return (He(o.chatStyle.color, r) || (o.chatStyle.color = r), r);
            }),
            u(),
            d(70, 'label', 40),
            v(71, ' Text Color '),
            u()(),
            d(72, 'div', 17)(73, 'input', 41),
            Ve('ngModelChange', function (r) {
              return (He(o.chatStyle.usernameColor, r) || (o.chatStyle.usernameColor = r), r);
            }),
            u(),
            d(74, 'label', 42),
            v(75, ' Username Color '),
            u()(),
            d(76, 'div', 17)(77, 'input', 43),
            Ve('ngModelChange', function (r) {
              return (He(o.chatStyle.bgColor, r) || (o.chatStyle.bgColor = r), r);
            }),
            u(),
            d(78, 'label', 44),
            v(79, ' Background Color '),
            u()(),
            d(80, 'div', 17)(81, 'input', 45),
            Ve('ngModelChange', function (r) {
              return (He(o.chatStyle.tickerColor, r) || (o.chatStyle.tickerColor = r), r);
            }),
            u(),
            d(82, 'label', 46),
            v(83, ' Ticker Color '),
            u()(),
            d(84, 'div', 17)(85, 'input', 47),
            Ve('ngModelChange', function (r) {
              return (He(o.chatStyle.fontSize, r) || (o.chatStyle.fontSize = r), r);
            }),
            u(),
            d(86, 'label', 48),
            v(87, ' Text Size '),
            u()()(),
            d(88, 'div', 49)(89, 'button', 50),
            x('click', function () {
              return o.resetChatStyle();
            }),
            v(90, ' Reset '),
            u(),
            d(91, 'button', 51),
            x('click', function () {
              return o.saveChatStyle();
            }),
            v(92, ' Save changes '),
            u()()(),
            d(93, 'div', 52)(94, 'div', 53),
            T(95, 'i', 54),
            d(96, 'span', 16),
            v(97, 'Do not disturb:'),
            u()(),
            d(98, 'div', 17)(99, 'input', 55),
            x('change', function () {
              return o.doNotDisturbOnChange();
            }),
            u(),
            d(100, 'label', 56),
            H(101, _Ee, 2, 0, 'span')(102, bEe, 2, 0),
            u()(),
            d(103, 'div', 17)(104, 'input', 57),
            x('change', function () {
              return o.recordingStartSoundOnChange();
            }),
            u(),
            d(105, 'label', 58),
            v(106, ' Start recording sound '),
            H(107, vEe, 2, 0, 'span')(108, yEe, 2, 0),
            u()(),
            d(109, 'div', 17)(110, 'input', 59),
            x('change', function () {
              return o.recordingStopSoundOnChange();
            }),
            u(),
            d(111, 'label', 60),
            v(112, ' Stop recording sound '),
            H(113, FEe, 2, 0, 'span')(114, CEe, 2, 0),
            u()(),
            H(115, TEe, 6, 2, 'div', 17)(116, kEe, 6, 2, 'div', 17)(117, AEe, 6, 2, 'div', 17)(
              118,
              IEe,
              6,
              2,
              'div',
              61
            )(119, LEe, 6, 2, 'div', 17),
            u(),
            H(120, QEe, 10, 4, 'div', 52),
            d(121, 'div', 52)(122, 'div', 62),
            T(123, 'i', 63),
            d(124, 'span', 16),
            v(125, 'Disable/Enable Video:'),
            u()(),
            d(126, 'div', 17)(127, 'input', 64),
            x('change', function () {
              return o.disableVideoChange();
            }),
            u(),
            d(128, 'label', 65),
            v(129, ' Video\xa0 '),
            H(130, XEe, 2, 0, 'span')(131, JEe, 2, 0),
            u()()(),
            H(132, tke, 10, 2, 'div', 52),
            d(133, 'div', 52)(134, 'div', 66),
            H(135, nke, 9, 0),
            d(136, 'button', 67),
            x('click', function () {
              return o.openUserInfo();
            }),
            T(137, 'i', 68),
            v(138, ' Edit my Info and Avatar '),
            u()()()(),
            d(139, 'div', 69)(140, 'div', 52)(141, 'div', 70),
            T(142, 'i', 71),
            d(143, 'span', 16),
            v(144, 'Text Mode:'),
            u()(),
            d(145, 'div', 17)(146, 'input', 72),
            x('click', function () {
              return o.switchAlertMode('r');
            }),
            u(),
            d(147, 'label', 73),
            x('click', function () {
              return o.switchAlertMode('r');
            }),
            v(148, ' Regular Mode '),
            u()(),
            d(149, 'div', 17)(150, 'input', 74),
            x('click', function () {
              return o.switchAlertMode('c');
            }),
            u(),
            d(151, 'label', 75),
            x('click', function () {
              return o.switchAlertMode('c');
            }),
            v(152, ' Compact Mode '),
            u()()(),
            d(153, 'div', 52)(154, 'div', 76),
            T(155, 'i', 54),
            d(156, 'span', 16),
            v(157, 'Do not disturb:'),
            u()(),
            d(158, 'div', 17)(159, 'input', 77),
            x('change', function () {
              return o.alertPopupChange();
            }),
            u(),
            d(160, 'label', 78),
            v(161, ' Alert / QA Popup '),
            H(162, ike, 2, 0, 'span')(163, oke, 2, 0),
            u(),
            T(164, 'hr'),
            u(),
            d(165, 'div', 17)(166, 'input', 79),
            x('change', function () {
              return o.alertSoundOnChange();
            }),
            u(),
            d(167, 'label', 80),
            v(168, ' Alert sound '),
            H(169, ske, 2, 0, 'span')(170, rke, 2, 0),
            u()(),
            d(171, 'div', 17)(172, 'input', 81),
            x('change', function () {
              return o.qaSoundOnChange();
            }),
            u(),
            d(173, 'label', 82),
            v(174, ' QA sound '),
            H(175, ake, 2, 0, 'span')(176, lke, 2, 0),
            u()(),
            H(177, uke, 6, 2, 'div', 17),
            d(178, 'div', 17)(179, 'input', 83),
            x('change', function () {
              return o.nonTradeSoundOnChange();
            }),
            u(),
            d(180, 'label', 84),
            v(181, ' Non-trade alert sound '),
            H(182, hke, 2, 0, 'span')(183, pke, 2, 0),
            u()()(),
            d(184, 'div', 52)(185, 'div', 85),
            T(186, 'i', 86),
            d(187, 'span', 16),
            v(188, 'Alert popup:'),
            u()(),
            d(189, 'div', 17)(190, 'input', 87),
            x('change', function () {
              return o.longerAlertPopupOnChange();
            }),
            u(),
            d(191, 'label', 88),
            v(192, ' Longer alert popup '),
            H(193, fke, 2, 0, 'span')(194, mke, 2, 0),
            u()(),
            H(195, gke, 3, 0, 'button', 89),
            u()(),
            d(196, 'div', 90)(197, 'div', 52)(198, 'div', 91),
            T(199, 'i', 71),
            d(200, 'span', 16),
            v(201, 'Text Mode:'),
            u()(),
            d(202, 'div', 17)(203, 'input', 92),
            x('click', function () {
              return o.switchChatMode('r');
            }),
            u(),
            d(204, 'label', 93),
            x('click', function () {
              return o.switchChatMode('r');
            }),
            v(205, ' Regular Mode '),
            u()(),
            d(206, 'div', 17)(207, 'input', 94),
            x('click', function () {
              return o.switchChatMode('c');
            }),
            u(),
            d(208, 'label', 95),
            x('click', function () {
              return o.switchChatMode('c');
            }),
            v(209, ' Compact Mode '),
            u()()(),
            d(210, 'div', 52)(211, 'div', 96),
            T(212, 'i', 97),
            d(213, 'span', 16),
            v(214, 'Image Preview:'),
            u()(),
            d(215, 'div', 17)(216, 'input', 98),
            x('change', function () {
              return o.smallImagePreviewOnChange();
            }),
            u(),
            d(217, 'label', 99),
            v(218, ' Smaller image preview '),
            H(219, _ke, 2, 0, 'span')(220, bke, 2, 0, 'span'),
            u()()(),
            d(221, 'div', 52)(222, 'div', 100),
            T(223, 'i', 54),
            d(224, 'span', 16),
            v(225, 'Do not disturb:'),
            u()(),
            d(226, 'div', 17)(227, 'input', 101),
            x('change', function () {
              return o.chatGifOnChange();
            }),
            u(),
            d(228, 'label', 102),
            v(229, ' Gif '),
            H(230, vke, 2, 0, 'span')(231, yke, 2, 0),
            u()(),
            d(232, 'div', 17)(233, 'input', 103),
            x('change', function () {
              return o.chatBadgesOnChange();
            }),
            u(),
            d(234, 'label', 104),
            v(235, ' Badges '),
            H(236, Fke, 2, 0, 'span')(237, Cke, 2, 0),
            u()(),
            d(238, 'div', 17)(239, 'input', 105),
            x('change', function () {
              return o.chatPopupChange();
            }),
            u(),
            d(240, 'label', 106),
            v(241, ' Chat / PM Popup '),
            H(242, Ske, 2, 0, 'span')(243, wke, 2, 0),
            u(),
            T(244, 'hr'),
            u(),
            d(245, 'div', 17)(246, 'input', 107),
            x('change', function () {
              return o.chatSoundOnChange();
            }),
            u(),
            d(247, 'label', 108),
            v(248, ' Chat sound '),
            H(249, Tke, 2, 0, 'span')(250, Dke, 2, 0),
            u()()(),
            d(251, 'div', 52)(252, 'div', 109),
            T(253, 'i', 110),
            d(254, 'span', 16),
            v(255, 'Extra chat column:'),
            u()(),
            d(256, 'div', 17)(257, 'input', 111),
            x('change', function () {
              return o.extraChatColumnOnChange();
            }),
            u(),
            d(258, 'label', 112),
            v(259, ' Chat column '),
            H(260, Eke, 2, 0, 'span')(261, kke, 2, 0),
            u()()(),
            d(262, 'div', 52)(263, 'div', 113),
            T(264, 'i', 114),
            d(265, 'span', 16),
            v(266, 'Always Scroll To Bottom:'),
            u()(),
            d(267, 'div', 17)(268, 'input', 115),
            x('change', function () {
              return o.chatAlwaysScrollToBottomChange();
            }),
            u(),
            d(269, 'label', 116),
            v(270, ' Always scroll to bottom '),
            H(271, xke, 2, 0, 'span')(272, Mke, 2, 0),
            u()()(),
            d(273, 'div', 52)(274, 'div', 117),
            T(275, 'i', 118),
            d(276, 'span', 16),
            v(277, 'Reduce Chatlog Memory:'),
            u()(),
            d(278, 'div', 17)(279, 'input', 119),
            x('change', function () {
              return o.reduceChatLogMemoryChange();
            }),
            u(),
            d(280, 'label', 120),
            v(281, ' Reduce Chatlog Memory '),
            H(282, Ake, 2, 0, 'span')(283, Pke, 2, 0),
            u()(),
            d(284, 'div', 17)(285, 'input', 121),
            x('change', function () {
              return o.visibilityChangeEnabledChange();
            }),
            u(),
            d(286, 'label', 122),
            v(287, ' Tab sleep optimization '),
            H(288, Rke, 2, 0, 'span')(289, Ike, 2, 0),
            u()()(),
            H(290, Oke, 19, 3, 'div', 52),
            u(),
            H(291, Uke, 4, 1, 'div', 123)(292, Zke, 67, 13, 'div', 124),
            u()(),
            d(293, 'div', 125)(294, 'button', 126),
            v(295, ' Close '),
            u()()()()()),
            2 & i &&
              (m(18),
              O(
                18,
                o.appService.globals.isPresenter && !o.appService.globals.isLimitedPresenter
                  ? 18
                  : -1
              ),
              m(),
              O(
                19,
                o.appService.globals.isPresenter &&
                  o.appService.globals.sessData &&
                  o.appService.globals.sessData.enableDiscord
                  ? 19
                  : -1
              ),
              m(9),
              z(
                'checked',
                'lightTheme' == o.appService.globals.preferences.theme &&
                  (o.appService.globals.sessData.darkThemeAsDefault ||
                    !o.appService.globals.preferences.defaultDarkTheme)
              ),
              m(4),
              z(
                'checked',
                'darkTheme' == o.appService.globals.preferences.theme &&
                  (!o.appService.globals.sessData.darkThemeAsDefault ||
                    o.appService.globals.preferences.defaultDarkTheme)
              ),
              m(10),
              z('checked', 'ltr' === o.appService.globals.preferences.roomSplitDir),
              m(4),
              z('checked', 'ttb' === o.appService.globals.preferences.roomSplitDir),
              m(4),
              z('checked', 'rtl' === o.appService.globals.preferences.roomSplitDir),
              m(4),
              z('checked', 'btt' === o.appService.globals.preferences.roomSplitDir),
              m(5),
              z('checked', o.appService.globals.preferences.pmLogsOnRight),
              je('ngModel', o.appService.globals.preferences.pmLogsOnRight),
              m(10),
              je('ngModel', o.chatStyle.color),
              m(4),
              je('ngModel', o.chatStyle.usernameColor),
              m(4),
              je('ngModel', o.chatStyle.bgColor),
              m(4),
              je('ngModel', o.chatStyle.tickerColor),
              m(4),
              je('ngModel', o.chatStyle.fontSize),
              m(14),
              z('checked', o.appService.globals.preferences.doNotDisturbOn),
              m(2),
              O(101, o.appService.globals.preferences.doNotDisturbOn ? 101 : 102),
              m(3),
              z('checked', o.appService.globals.preferences.recordingStartSound),
              m(3),
              O(107, o.appService.globals.preferences.recordingStartSound ? 107 : 108),
              m(3),
              z('checked', o.appService.globals.preferences.recordingStopSound),
              m(3),
              O(113, o.appService.globals.preferences.recordingStopSound ? 113 : 114),
              m(2),
              O(115, o.appService.globals.isPresenter ? 115 : -1),
              m(),
              O(116, o.appService.globals.sessData.enableReactions ? 116 : -1),
              m(),
              O(117, o.appService.globals.sessData.enableQAReactions ? 117 : -1),
              m(),
              z('ngIf', o.appService.globals.sessData.beepOnUserJoin),
              m(),
              O(
                119,
                o.appService.globals.sessData.positionsIframe &&
                  o.appService.globals.sessData.positionsIframeUrl
                  ? 119
                  : -1
              ),
              m(),
              O(
                120,
                (o.appService.globals.sessData.beepOnUserJoin ||
                  o.appService.globals.sessData.userJoinAndLeavePopup) &&
                  o.appService.globals.isPresenter
                  ? 120
                  : -1
              ),
              m(7),
              z('checked', !o.appService.globals.preferences.disableVideo),
              m(3),
              O(130, o.appService.globals.preferences.disableVideo ? 131 : 130),
              m(2),
              O(132, o.appService.globals.hasSpeechRecognition ? 132 : -1),
              m(3),
              O(135, o.appService.globals.isPresenter ? 135 : -1),
              m(11),
              z('checked', 'r' == o.appService.globals.preferences.alertsMode),
              m(4),
              z('checked', 'c' == o.appService.globals.preferences.alertsMode),
              m(9),
              z('checked', o.appService.globals.preferences.alertPopup),
              m(3),
              O(162, o.appService.globals.preferences.alertPopup ? 162 : 163),
              m(4),
              z('checked', o.appService.globals.preferences.alertSoundOn),
              m(3),
              O(169, o.appService.globals.preferences.alertSoundOn ? 169 : 170),
              m(3),
              z('checked', o.appService.globals.preferences.qaSoundOn),
              m(3),
              O(175, o.appService.globals.preferences.qaSoundOn ? 175 : 176),
              m(2),
              O(177, o.appService.globals.sessData.enableQAReactions ? 177 : -1),
              m(2),
              z('checked', o.appService.globals.preferences.nonTradeSound),
              m(3),
              O(182, o.appService.globals.preferences.nonTradeSound ? 182 : 183),
              m(8),
              z('checked', o.appService.globals.preferences.longerAlertPopup),
              m(3),
              O(193, o.appService.globals.preferences.longerAlertPopup ? 193 : 194),
              m(2),
              O(195, o.appService.globals.sessData.modAlertFilterList ? 195 : -1),
              m(8),
              z('checked', 'r' == o.appService.globals.preferences.chatMode),
              m(4),
              z('checked', 'c' == o.appService.globals.preferences.chatMode),
              m(9),
              z(
                'checked',
                o.appService.globals.preferences.smallImagePreview &&
                  o.appService.globals.preferences.defaultImagePreview
              ),
              m(3),
              O(
                219,
                o.appService.globals.preferences.smallImagePreview &&
                  o.appService.globals.preferences.defaultImagePreview
                  ? 219
                  : -1
              ),
              m(),
              O(
                220,
                !o.appService.globals.preferences.smallImagePreview &&
                  o.appService.globals.preferences.defaultImagePreview
                  ? 220
                  : -1
              ),
              m(7),
              z('checked', o.appService.globals.preferences.chatGif),
              m(3),
              O(230, o.appService.globals.preferences.chatGif ? 230 : 231),
              m(3),
              z('checked', o.appService.globals.preferences.chatBadges),
              m(3),
              O(236, o.appService.globals.preferences.chatBadges ? 236 : 237),
              m(3),
              z('checked', o.appService.globals.preferences.chatPopup),
              m(3),
              O(242, o.appService.globals.preferences.chatPopup ? 242 : 243),
              m(4),
              z('checked', o.appService.globals.preferences.chatSoundOn),
              m(3),
              O(249, o.appService.globals.preferences.chatSoundOn ? 249 : 250),
              m(8),
              z('checked', o.appService.globals.preferences.extraChatColumn),
              m(3),
              O(260, o.appService.globals.preferences.extraChatColumn ? 260 : 261),
              m(8),
              z('checked', o.appService.globals.preferences.alwaysScrollToBottom),
              m(3),
              O(271, o.appService.globals.preferences.alwaysScrollToBottom ? 271 : 272),
              m(8),
              z('checked', o.appService.globals.preferences.trimChatLogs),
              m(3),
              O(282, o.appService.globals.preferences.trimChatLogs ? 282 : 283),
              m(3),
              z('checked', o.appService.globals.preferences.visibilityChangeEnabled),
              m(3),
              O(288, o.appService.globals.preferences.visibilityChangeEnabled ? 288 : 289),
              m(2),
              O(
                290,
                o.appService.globals.isPresenter && !o.appService.globals.isLimitedPresenter
                  ? 290
                  : -1
              ),
              m(),
              O(
                291,
                o.appService.globals.isPresenter &&
                  o.appService.globals.sessData &&
                  o.appService.globals.sessData.enableDiscord
                  ? 291
                  : -1
              ),
              m(),
              O(
                292,
                o.appService.globals.isPresenter && !o.appService.globals.isLimitedPresenter
                  ? 292
                  : -1
              )));
        },
        dependencies: [zs, ai, Dd, Ss, ti, Yn],
        styles: [
          '#user-settings-modal[_ngcontent-%COMP%]   .modal-dialog[_ngcontent-%COMP%]{max-width:700px}#user-settings-modal[_ngcontent-%COMP%]   button.close[_ngcontent-%COMP%]{color:#fff}#chat-ticker-color[_ngcontent-%COMP%], #alert-ticker-color[_ngcontent-%COMP%], #presenter-text-color[_ngcontent-%COMP%], #chat-username-color[_ngcontent-%COMP%], #presenter-bg-color[_ngcontent-%COMP%], #alert-text-color[_ngcontent-%COMP%], #alert-bg-color[_ngcontent-%COMP%], #chat-text-color[_ngcontent-%COMP%], #chat-bg-color[_ngcontent-%COMP%], #chat-text-size[_ngcontent-%COMP%], #alert-text-size[_ngcontent-%COMP%], #presenter-text-size[_ngcontent-%COMP%]{width:45px;height:20px}#chat-text-size[_ngcontent-%COMP%], #alert-text-size[_ngcontent-%COMP%], #presenter-text-size[_ngcontent-%COMP%]{font-size:13px}.themes[_ngcontent-%COMP%]   .form-check-input[_ngcontent-%COMP%]:checked + label[_ngcontent-%COMP%], .text-mode-box[_ngcontent-%COMP%]   .form-check-input[_ngcontent-%COMP%]:checked + label[_ngcontent-%COMP%]{text-transform:uppercase;font-weight:700}.themes[_ngcontent-%COMP%]   .form-check-input[_ngcontent-%COMP%], .text-mode-box[_ngcontent-%COMP%]   .form-check-input[_ngcontent-%COMP%]{-webkit-appearance:none;-o-appearance:none;appearance:none;height:20px;width:20px;transition:all .15s ease-out 0s;background-color:var(--light-gray);border:none;color:var(--white);cursor:pointer;display:inline-block;margin-right:.5rem;outline:none;position:relative;z-index:1000;border-radius:50%}.form-check-label[_ngcontent-%COMP%]:hover{cursor:pointer;opacity:.85}.themes[_ngcontent-%COMP%]   .form-check-input[_ngcontent-%COMP%]:checked, .text-mode-box[_ngcontent-%COMP%]   .form-check-input[_ngcontent-%COMP%]:checked{background-color:var(--checkbox-bg-color)}@keyframes _ngcontent-%COMP%_click-wave{0%{height:40px;width:40px;opacity:.35;position:relative}to{height:200px;width:200px;margin-left:-80px;margin-top:-80px;opacity:0}}@media only screen and (max-width: 750px){#user-settings-modal[_ngcontent-%COMP%]   .modal-dialog[_ngcontent-%COMP%]{max-width:60%}}@media only screen and (max-width: 500px){#user-settings-modal[_ngcontent-%COMP%]   .modal-dialog[_ngcontent-%COMP%]{max-width:50%}}'
        ]
      });
    }
  }
  return t;
})();
