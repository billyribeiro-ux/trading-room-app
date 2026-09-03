h2e = (() => {
  class t {
    constructor(e, i, o, s, r, a, l, c) {
      ((this.appService = e),
        (this.alertsService = i),
        (this.mediaService = o),
        (this.httpClient = s),
        (this.mediaSoupService = r),
        (this.soundEffectsService = a),
        (this.mtxHandlerService = l),
        (this.ngZone = c),
        (this.showZoomCtrl = !1),
        (this.isP = this.appService.globals.isPresenter),
        (this.selectedMainTab = 'presAreaTabs-screens'),
        (this.selectedNoteTab = ''),
        (this.selectedScreenShareTab = ''),
        (this.selectedMTXStreamTab = ''),
        (this.forcedScreenID = ''),
        (this.forcedScreenMTXID = ''),
        (this.noscreensTimes = 0),
        (this.saveData = !1),
        (this.screenPresenter = ''),
        (this.screenLoading = !1),
        (this.callingScreenName = ''),
        (this.screenPresenterAvatar = ''),
        (this.hideScreens = !1),
        (this.hideStreams = !1),
        (this.hideNotes = !1),
        (this.hideFiles = !1),
        (this.hideVideoPlayer = !1),
        (this.sessionFiles = []),
        (this.filesSearch = ''),
        (this.selectedFileTab = 'files'),
        (this.soundsTotal = 0),
        (this.imagesTotal = 0),
        (this.filesTotal = 0),
        (this.fileSortField = 'date'),
        (this.fileSortDir = 'desc'),
        (this.mp3Playing = !1),
        (this.isPlayingForMe = {}),
        (this.audioVolume = 100),
        (this.prevVolume = 100),
        (this.newNoteCreatedBy = ''),
        (this.videoURL = ''),
        (this.videoPlayerUrl = ''),
        (this.videoList = []),
        (this.scheduledVideo = { videoURL: '', videoPlayTime: null }),
        (this.currentSpeechReco = null),
        (this.showSpeechRecognition = !1),
        (this.lastSpeechRecoEvent = 0),
        (this.speechRecoInterval = null),
        (this.speechRecoHistoryMode = !1),
        (this.speechRecoAutoScroll = !0),
        (this.speechRecoScrollContainer = null),
        (this.hasSwingTradeAlerts = !1),
        (this.swingAlert = {
          alertTxt: '',
          direction: 'long',
          symbol: '',
          entryPrice: '',
          stop: '',
          target: '',
          senderName: '',
          edit: !1,
          alertLogID: '',
          image: '',
          txtInAlerts: ''
        }),
        (this.swingAlertLimit = 10),
        (this.swingAlertSearch = ''),
        (this.swingAlertMonths = 2),
        (this.hasDayTradeAlerts = !1),
        (this.dayTradeAlert = {
          alertTxt: '',
          direction: 'long',
          symbol: '',
          entryPrice: '',
          stop: '',
          target: '',
          senderName: '',
          edit: !1,
          alertLogID: '',
          image: '',
          txtInAlerts: ''
        }),
        (this.dayTradeAlertLimit = 10),
        (this.dayTradeAlertSearch = ''),
        (this.dayTradeAlertMonths = 1),
        (this.imggurUploadTxt = ''),
        (this.isFullScreenshare = !1));
    }
    ngOnInit() {
      ((this.hideNotes =
        this.appService.globals.sessData.hideNotes || this.appService.globals.viewerOnlyMode),
        (this.hideFiles =
          this.appService.globals.sessData.hideFiles || this.appService.globals.videoOnlyMode),
        (this.hasSwingTradeAlerts = this.appService.globals.sessData.hasSwingTradeAlerts),
        (this.hasDayTradeAlerts = this.appService.globals.sessData.hasDayTradeAlerts),
        (this.hideStreams = !this.appService.globals.sessData.useMediaMTX),
        this.appService.guiEventBus.subscribe('doShowMsgToAll', (e) => {
          (this.alertsService.info(e.txt, `Message from ${e.n}:`, { timeOut: 1e4, enableHtml: !0 }),
            Notification.requestPermission()
              .then((i) => {
                if ('granted' == i || 'default' == i) {
                  let o = e.pic || 'https://secure.gravatar.com/avatar/' + e.avt + '?d=mm&s=50';
                  new Notification('Message from ' + e.n, {
                    body: this.decodeHtmlEntities(e.txt),
                    icon: o
                  });
                }
              })
              .catch(function (i) {
                console.error(i);
              }));
        }));
    }
    ngOnDestroy() {
      (P('presentationareacomp destroying...'),
        (this.selectedScreenShareTab = null),
        (this.selectedMTXStreamTab = null),
        (this.screenPresenter = ''),
        (this.screenLoading = !1),
        (this.callingScreenName = ''),
        (this.screenPresenterAvatar = ''),
        this.stopSpeechChecker());
    }
    startSpeechChecker() {
      this.speechRecoInterval ||
        (this.speechRecoInterval = setInterval(() => {
          this.lastSpeechRecoEvent + 7e3 < Date.now()
            ? ((this.currentSpeechReco = null),
              (this.showSpeechRecognition = !1),
              this.stopSpeechChecker(),
              console.log('speech checker NOT active.. stopping checker and hiding box'))
            : console.log('speech checker running.. still active...');
        }, 7e3));
    }
    hideSpeechRecognition(e) {
      (e.preventDefault(),
        e.stopPropagation(),
        (this.appService.globals.preferences.showSpeechRecoOverlay = !1),
        this.appService.setPreference('showSpeechRecoOverlay', !1),
        (this.showSpeechRecognition = !1),
        (this.currentSpeechReco = null),
        (this.lastSpeechRecoEvent = 0),
        this.stopSpeechChecker(),
        (this.speechRecoHistoryMode = !1));
    }
    stopSpeechChecker() {
      this.speechRecoInterval &&
        (clearInterval(this.speechRecoInterval), (this.speechRecoInterval = null));
    }
    checkSpeechRecognition() {
      return this.isSpeechRecoOverlayEnabled() && this.showSpeechRecognition;
    }
    getSpeechRecognitionEntries() {
      return this.currentSpeechReco ? [this.currentSpeechReco] : [];
    }
    getSpeechRecognitionHistory() {
      return this.appService.globals.lastSpeechReco || [];
    }
    hasHistoryAvailable() {
      return this.getSpeechRecognitionHistory().length > 0;
    }
    toggleSpeechRecoHistory(e) {
      if (
        (e.preventDefault(),
        e.stopPropagation(),
        this.appService.globals.preferences.showSpeechRecoOverlay &&
          (this.speechRecoHistoryMode || 0 !== this.getSpeechRecognitionHistory().length))
      )
        if (
          ((this.speechRecoHistoryMode = !this.speechRecoHistoryMode),
          (this.speechRecoAutoScroll = !0),
          this.speechRecoHistoryMode)
        )
          ((this.showSpeechRecognition = !0), this.scrollSpeechRecoToBottom());
        else {
          const i = this.lastSpeechRecoEvent && this.lastSpeechRecoEvent + 7e3 > Date.now();
          this.currentSpeechReco || i
            ? this.scrollSpeechRecoToBottom()
            : (this.showSpeechRecognition = !1);
        }
    }
    openTranscriptPage() {
      const e = this.appService.globals.sesionToken;
      if (!e) return void P('No session token available for transcript');
      const o = `${window.location.origin + window.location.pathname}#/session-transcript?token=${encodeURIComponent(e)}&name=${encodeURIComponent(this.appService.globals.sessionName)}`;
      window.open(o, '_blank');
    }
    hasSpeechRecognitionEntries() {
      const e = this.isSpeechRecoOverlayEnabled(),
        i = this.getSpeechRecognitionHistory().length;
      return (
        !!e &&
        (this.speechRecoHistoryMode
          ? i > 0
          : this.showSpeechRecognition && !!this.currentSpeechReco)
      );
    }
    onSpeechRecoScroll(e) {
      const i = e.target;
      i && (this.speechRecoAutoScroll = i.scrollHeight - i.scrollTop - i.clientHeight < 10);
    }
    scrollSpeechRecoToBottom() {
      this.speechRecoAutoScroll &&
        setTimeout(() => {
          const e = this.speechRecoBodyRef?.nativeElement || this.speechRecoScrollContainer;
          e && (e.scrollTop = e.scrollHeight);
        }, 0);
    }
    setSpeechRecoScrollContainer(e) {
      this.speechRecoScrollContainer = e;
    }
    isSpeechRecoOverlayEnabled() {
      const e = this.appService.globals.preferences.showSpeechRecoOverlay;
      return null == e || !!e;
    }
    archivesAvailableTo() {
      return this.appService.globals.isPresenter && !this.appService.globals.isLimitedPresenter
        ? !(
            this.appService.globals.sessData.showArchivesToSpecificPresenters &&
            !this.appService.globals.sessData.showArchivesToSpecificPresenters.includes(
              this.appService.globals.user.email
            )
          )
        : !(
            !this.appService.globals.sessData.showArchivesToUsers ||
            this.appService.globals.user.denyArchivesAccess
          );
    }
    getRecordingsUrl() {
      return `${this.appService.globals.apiROOT}/sessions/v2/archives/recordings/${this.appService.globals.sessionID}/${this.appService.globals.sesionToken}`;
    }
    onFileTabChange(e) {
      (console.log('tab', e), (this.selectedFileTab = e));
    }
    ngAfterViewInit() {
      (this.appService.guiEventBus.subscribe('resizeUI', () => {
        P('presentationArea resizeUI...');
      }),
        this.appService.appEventBus.subscribe('addScreenStream', (e) => {
          'screen' == e.mode && this.alertsService.info(e.userName + ' started screen sharing');
        }),
        this.appService.appEventBus.subscribe('callingScreenStart', (e) => {
          (e.uid != this.appService.globals.user.id &&
            this.alertsService.info('Connecting to ' + e.nick + '...'),
            (this.screenLoading = !0),
            (this.screenPresenter = this.callingScreenName = e.nick),
            (this.screenPresenterAvatar = e.avt || e.pic));
        }),
        this.appService.appEventBus.subscribe('screenBroadcastEnd', (e) => {
          ((this.screenLoading = !1),
            (this.screenPresenter = this.callingScreenName = ''),
            setTimeout(() => {
              this.mediaService.screenSharingUsers &&
              this.mediaService.screenSharingUsers.length > 0
                ? this.handleCurrPresChanged()
                : this.handleNoPresenter();
            }, 3e3));
        }),
        this.appService.appEventBus.subscribe('newNoteTab', (e) => {
          ((this.selectedNoteTab = `noteTab-${e._id}`),
            this.newNoteCreatedBy === this.appService.globals.user.userXrefID &&
              setTimeout(() => {
                (this.editNote(e._id), (this.newNoteCreatedBy = ''));
              }, 500));
        }),
        this.appService.guiEventBus.subscribe('switchToScreenAreaTab', () => {
          this.selectedMainTab = 'presAreaTabs-screens';
        }),
        this.appService.guiEventBus.subscribe('selectScreenTabOfId', (e) => {
          if (
            !this.appService.globals.lockedScreenID ||
            this.appService.globals.lockedScreenID === e._id
          ) {
            if (
              ((this.selectedMainTab = 'presAreaTabs-screens'),
              this.selectedScreenShareTab == e._id)
            )
              return void P(
                `presentationarea comp selectScreenTabOfId ALREADY ON   ${this.selectedScreenShareTab}. nop....`
              );
            ((this.selectedScreenShareTab = e._id),
              P(
                `presentationarea comp selectScreenTabOfId caught: id:${e._id}. swtiching selectedScreenShareTab to this id....`
              ),
              this.onScreenShareTabChange(e._id, !1));
          }
        }),
        this.appService.guiEventBus.subscribe('selectStreamTabOfId', (e) => {
          if (
            (P('((((((((((( guiEvent selectStreamTabOfId: ', e),
            !this.appService.globals.lockedScreenIDMTX ||
              this.appService.globals.lockedScreenIDMTX === e._id)
          ) {
            if (
              ((this.selectedMainTab = 'presAreaTabs-streams'), this.selectedMTXStreamTab == e._id)
            )
              return void P(
                `presentationarea comp selectedMTXStreamTab ALREADY ON   ${this.selectedMTXStreamTab}. nop....`
              );
            (P(
              `presentationarea comp selectedMTXStreamTab caught: id:${e._id}. swtiching selectedScreenShareTab to this id....`
            ),
              this.onStreamTabChange(e._id));
          }
        }),
        this.appService.guiEventBus.subscribe('focusOnSessionNote', (e) => {
          (P('focusing on note: ' + e),
            this.hideNotes
              ? (this.selectedMainTab = 'presAreaTabs-screens')
              : (!this.mtxHandlerService.mtxStreams ||
                  0 === this.mtxHandlerService.mtxStreams?.length) &&
                (!this.mediaService.screenSharingUsers ||
                  0 === this.mediaService.screenSharingUsers?.length) &&
                ((this.selectedMainTab = 'presAreaTabs-notes'),
                (this.selectedNoteTab = `noteTab-${e}`)));
        }),
        this.appService.appEventBus.subscribe('noteTabUpdated', (e) => {
          (ii('#noteUpd-' + e.id)
            .show()
            .addClass('visible animated infinite flash'),
            setTimeout(() => {
              ii('#noteUpd-' + e.id)
                .hide()
                .removeClass('visible animated infinite flash');
            }, 3e3),
            ('presAreaTabs-notes' !== this.selectedMainTab ||
              this.selectedNoteTab !== `noteTab-${e.id}`) &&
              (ii('#noteChangeIndicator').addClass('animated fadeIn flash'),
              setTimeout(() => {
                ii('#noteChangeIndicator').removeClass('animated fadeIn flash');
              }, 3e3),
              this.alertsService.clear(),
              this.appService.globals.preferences.noteUpdatePopup &&
                this.alertsService.info(`Note "${e.name}" updated`)));
        }),
        this.appService.appEventBus.subscribe('sessionNotesLoaded', (e) => {
          if (
            !this.appService.globals.sessionNotes ||
            !this.appService.globals.sessionNotes[0] ||
            this.videoPlayerUrl
          )
            return;
          const i = this.appService.globals.sessionNotes[0]._id;
          ((this.selectedNoteTab = `noteTab-${i}`),
            console.log('***** selectedNoted tab ID:' + i),
            setTimeout(() => {
              this.mediaService.screenSharingUsers && this.mediaService.screenSharingUsers.length
                ? this.handleCurrPresChanged()
                : this.handleNoPresenter();
            }, 3e3));
        }),
        this.appService.guiEventBus.subscribe('setFocusOnScreenIndicator', (e) => {
          if (
            this.appService.globals.lockedScreenID &&
            this.appService.globals.lockedScreenID !== e
          )
            return;
          const i = this.mediaService.screenSharingUsers;
          for (let o = 0; o < i.length; o++)
            if (i[o]._id == e) return void (this.forcedScreenID = e);
        }),
        this.appService.guiEventBus.subscribe('focusOnScreen', (e) => {
          const i = this.mediaService.screenSharingUsers;
          for (let o = 0; o < i.length; o++) {
            const s = i[o];
            if (s._id == e)
              return (
                (this.forcedScreenID = e),
                void this.appService.guiEventBus.emit('selectScreenTabOfId', s)
              );
          }
        }),
        this.appService.guiEventBus.subscribe('playSoundCloudForAll', (e) => {
          ((this.scUrl = e.url), console.log('soundcloud data', e), (this.scPlaying = !0));
        }),
        this.appService.guiEventBus.subscribe('stopSoundCloudForAll', () => {
          ((this.scUrl = null), (this.scPlaying = !1));
        }),
        this.appService.globals.roomState.soundCloudURL &&
          ((this.scPlaying = !0),
          this.appService.guiEventBus.emit('playSoundCloudForAll', {
            url: this.appService.globals.roomState.soundCloudURL
          })),
        this.appService.guiEventBus.subscribe('playYTForAll', (e) => {
          let i = 0;
          if (e.startTime) {
            let o = Number(e.startTime),
              s = Date.now();
            (console.log(`playYTForAll nowT: ${s}. startT: ${o}`),
              (i = Math.round((s - o) / 1e3)),
              console.log('playYTForAll startT:', o),
              (this.startTime = i));
          } else this.startTime = 0;
          ((this.ytURL = e.url), P('playYTForAll url: ' + e.url + '. startTime:' + this.startTime));
        }),
        this.appService.guiEventBus.subscribe('stopYTForAll', () => {
          this.ytURL = null;
        }),
        this.appService.globals.roomState.ytURL &&
          this.appService.guiEventBus.emit('playYTForAll', {
            url: this.appService.globals.roomState.ytURL,
            startTime: this.appService.globals.roomState.ytStartTime
          }),
        this.appService.guiEventBus.subscribe('playMP3ForAll', (e) => {
          ((this.mp3Url = e.url), console.log('mp3Url data', e), (this.mp3Playing = !0));
        }),
        this.appService.guiEventBus.subscribe('stopMp3ForAll', () => {
          ((this.mp3Url = null), (this.mp3Playing = !1));
        }),
        this.appService.guiEventBus.subscribe('speechReco', (e) => {
          this.ngZone.run(() => {
            if (!e) return;
            const i = e.sender || e.speaker || 'Unknown',
              o = (e.text ?? e.txt ?? '').trim();
            i &&
              o &&
              this.isSpeechRecoOverlayEnabled() &&
              ((this.lastSpeechRecoEvent = Date.now()),
              (this.currentSpeechReco = { text: o, sender: i }),
              (this.showSpeechRecognition = !0),
              this.startSpeechChecker(),
              this.scrollSpeechRecoToBottom());
          });
        }),
        this.appService.guiEventBus.subscribe('reEnableSpeechRecoOverlay', () => {
          this.ngZone.run(() => {
            this.lastSpeechRecoEvent &&
              this.lastSpeechRecoEvent + 7e3 > Date.now() &&
              ((this.showSpeechRecognition = !0), this.startSpeechChecker());
          });
        }),
        this.appService.guiEventBus.subscribe('hideSpeechRecoOverlay', () => {
          this.ngZone.run(() => {
            ((this.showSpeechRecognition = !1),
              (this.currentSpeechReco = null),
              (this.lastSpeechRecoEvent = 0),
              this.stopSpeechChecker(),
              (this.speechRecoHistoryMode = !1));
          });
        }),
        this.appService.globals.roomState.mp3URL &&
          (console.log('*********************** playMP3 '),
          this.appService.guiEventBus.emit('playMP3ForAll', {
            url: this.appService.globals.roomState.mp3URL,
            startTime: this.appService.globals.roomState.mp3StartTime
          })),
        this.appService.guiEventBus.subscribe('playVideoForAll', (e) => {
          ((this.videoPlayerUrl = e.url),
            (this.hideVideoPlayer = !0),
            this.isP || this.onMainTabChange('presAreaTabs-videoplayer'));
        }),
        this.appService.guiEventBus.subscribe('stopVideoForAll', () => {
          ((this.videoPlayerUrl = ''),
            (this.scheduledVideo.videoURL = ''),
            (this.scheduledVideo.videoPlayTime = null),
            (this.hideVideoPlayer = !1),
            this.isP || this.onMainTabChange('presAreaTabs-screens'));
        }),
        this.appService.globals.roomState.videoURL &&
          (this.scheduledVideo.videoURL = this.appService.globals.roomState.videoURL),
        this.appService.globals.roomState.videoPlayTime &&
          (this.scheduledVideo.videoPlayTime = this.appService.globals.roomState.videoPlayTime),
        this.appService.globals.roomState.videoURL &&
          !this.appService.globals.roomState.videoPlayTime &&
          ((this.hideVideoPlayer = !0),
          (this.videoPlayerUrl = this.appService.globals.roomState.videoURL),
          this.onMainTabChange('presAreaTabs-videoplayer')),
        this.loadVideos());
    }
    loadVideos() {
      if (this.appService.globals.isPresenter) {
        const e = this.appService.localstorage.get(
          `videos-${this.appService.globals.sessionID}`,
          ''
        );
        e && (this.videoList = JSON.parse(e));
      }
    }
    togglePanZoom() {
      ((this.showZoomCtrl = !this.showZoomCtrl),
        this.appService.guiEventBus.emit('togglePanZoom', this.showZoomCtrl));
    }
    panZoomIn() {
      this.appService.guiEventBus.emit('panZoomIn');
    }
    panZoomOut() {
      this.appService.guiEventBus.emit('panZoomOut');
    }
    panZoomReset() {
      this.appService.guiEventBus.emit('panZoomReset');
    }
    captureVideoImage() {
      this.appService.guiEventBus.emit('captureVideoImage', {
        tabType: this.selectedMainTab,
        screenId: this.selectedScreenShareTab,
        streamId: this.selectedMTXStreamTab
      });
    }
    fullScreenshare() {
      this.isFullScreenshare = !this.isFullScreenshare;
    }
    onMainTabChange(e) {
      (P('onMainTabChange', e),
        (this.selectedMainTab = e),
        'presAreaTabs-files' == this.selectedMainTab && this.getSessionFiles(),
        'presAreaTabs-videoplayer' == this.selectedMainTab && this.loadVideos());
    }
    onNotesTabChange(e) {
      (P('onNotesTabChange', e), (this.selectedNoteTab = `noteTab-${e}`));
    }
    onScreenShareTabChange(e, i = !0) {
      (P(
        `onScreenShareTabChange tab: ${e}. selectedScreenShareTab: ${this.selectedScreenShareTab}`
      ),
        this.selectedScreenShareTab != e &&
          this.appService.guiEventBus.emit('stopWatchScreenOf', this.selectedScreenShareTab),
        (this.selectedScreenShareTab = e),
        this.appService.guiEventBus.emit('startWatchScreenOf', this.selectedScreenShareTab),
        (this.appService.globals.currScreenID = this.selectedScreenShareTab),
        i &&
          this.appService.globals.isPresenter &&
          this.appService.globals.preferences.makeUsersFollowMyScreens &&
          this.bringFocusToScreen(this.selectedScreenShareTab));
    }
    onStreamTabChange(e) {
      (console.log('onStreamTabChange: ' + e),
        (this.selectedMTXStreamTab = e),
        (this.mtxHandlerService.selectedTabID = e));
    }
    bringFocusToScreen(e) {
      e && this.appService.sendServerAdminCommand('focusOnScreen', { id: e });
    }
    stopSharingThisScreen(e) {
      this.mediaService.stopSharingProducer(e);
    }
    stopSharingThisScreenRemote(e) {
      e &&
        (this.mediaService.stopSharingProducer(e.producerID),
        setTimeout(() => {
          this.appService.sendServerAdminCommand('forceStopScreen', { id: e._id });
        }, 2e3));
    }
    handleCurrPresChanged() {}
    handleNoPresenter() {
      if (this.appService.globals.sessionNotes.length) {
        for (let e = 0; e < this.appService.globals.sessionNotes.length; e++) {
          const i = this.appService.globals.sessionNotes[e];
          if (i.isWelcomeMat)
            return (
              P('handleNoPresenter Focusing on welcome mat for tab: ' + i.name),
              void this.appService.guiEventBus.emit('focusOnSessionNote', i._id)
            );
        }
        (P('handleNoPresenter Focusing on 1st note...'),
          this.appService.guiEventBus.emit(
            'focusOnSessionNote',
            this.appService.globals.sessionNotes[0]._id
          ));
      }
    }
    round(e) {
      return Math.round(e);
    }
    renameTab(e, i) {
      bootbox.prompt({
        title: 'Change note name',
        value: e,
        callback: (o) => {
          o &&
            this.appService.sendServerAdminCommand('renameSessionNoteTab', { newName: o, id: i });
        }
      });
    }
    newNote() {
      bootbox.prompt('New Note name:', (e) => {
        e &&
          ((this.newNoteCreatedBy = this.appService.globals.user.userXrefID),
          this.appService.sendServerAdminCommand('newSessionNoteTab', { name: e }));
      });
    }
    editNote(e) {
      this.appService.guiEventBus.emit('editNoteTab', e);
    }
    downloadNote(e) {
      const i = new Blob([e.noteContent], { type: 'text/plain;charset=utf-8' }),
        o = window.URL.createObjectURL(i),
        s = document.createElement('a');
      ((s.href = o),
        (s.download = e.name + '.html'),
        (s.style.display = 'none'),
        document.body.appendChild(s),
        s.click(),
        document.body.removeChild(s));
    }
    bringFocusToTab(e) {
      this.appService.sendServerAdminCommand('focusOnSessionNote', { id: e });
    }
    setAsWelcomeTab(e, i) {
      var o = this;
      return I(function* () {
        if (i) {
          let s = yield o.appService.invokeAdminCmd('getAllRooms');
          console.log('rc', s);
          let a = '';
          ii.each(s.rooms, function (c, h) {
            ((a +=
              '<input class="form-check-input" type="checkbox" id="room' +
              c +
              '" name="' +
              h.name +
              '" value="' +
              h._id +
              '">'),
              (a +=
                '<label class="form-check-label" for="room' + c + '">' + h.name + '</label><br>'),
              console.log('Adding room:' + h.name));
          });
          const l = `\n                <div class="container">\n                  <p>Select the rooms to apply this note as a welcome mat:</p>\n                  <form id="selectedNotesRoomsForm">\n                    <div class="form-check" id="roomsCheckboxContainer">\n                    ${a}\n                    </div>\n\n                  </form>\n                </div>\n                `;
          if (o.appService.globals.sessData.allRoomsWelcomeMatPW) {
            let c = o;
            bootbox.prompt({
              title: 'Please enter the password to replace all the rooms Welcome Mats:',
              value: '',
              callback:
                ((h = I(function* (f) {
                  if (f) {
                    const _ = f.trim();
                    _ === o.appService.globals.sessData.allRoomsWelcomeMatPW
                      ? bootbox.dialog({
                          message: l,
                          title: 'Multi room Welcome Mat',
                          backdrop: !0,
                          onEscape: !0,
                          size: 'xl',
                          buttons: {
                            cancel: { label: ' Cancel', className: 'btn-danger' },
                            success: {
                              label: 'Apply',
                              className: 'btn-success',
                              callback() {
                                var F = ii('#selectedNotesRoomsForm').serializeArray();
                                (console.log(F),
                                  c.appService.sendServerAdminCommand('setWelcomeMatNoteTab', {
                                    id: e,
                                    allRooms: i,
                                    pw: _,
                                    rooms: F
                                  }));
                              }
                            }
                          }
                        })
                      : bootbox.alert('Wrong password!');
                  }
                })),
                function (_) {
                  return h.apply(this, arguments);
                })
            });
          } else {
            let c = o;
            bootbox.dialog({
              message: l,
              title: 'Multi room Welcome Mat',
              backdrop: !0,
              onEscape: !0,
              size: 'xl',
              buttons: {
                cancel: { label: ' Cancel', className: 'btn-danger' },
                success: {
                  label: 'Apply',
                  className: 'btn-success',
                  callback() {
                    var h = ii('#selectedNotesRoomsForm').serializeArray();
                    (console.log(h),
                      c.appService.sendServerAdminCommand('setWelcomeMatNoteTab', {
                        id: e,
                        allRooms: i,
                        pw: '',
                        rooms: h
                      }));
                  }
                }
              }
            });
          }
        } else
          bootbox.confirm('Are you sure you want to apply this note as Welcome Mat', (s) => {
            s &&
              o.appService.sendServerAdminCommand('setWelcomeMatNoteTab', { id: e, allRooms: i });
          });
        var h;
      })();
    }
    deleteNote(e) {
      bootbox.confirm('Are you sure you want to delete this note?', (i) => {
        i && this.appService.sendServerAdminCommand('deleteSessionNoteTab', { id: e });
      });
    }
    newFile() {
      let e = this;
      ((gs = []),
        bootbox.dialog({
          message:
            "<div>\n      <label class='upload-area' style='width:100%;text-align:center;' for='fupload'>\n      <input id='fupload' name='fupload' type='file' style='display:none;' multiple='true'>\n      <i class='fas fa-file-upload fa-3x'></i><br />\n      Click to select files to upload\n      </label>\n      <div id=\"filedrag\" class=\"filedrag\">or drop files here</div>\n      <br />\n      <div style='margin-left:5px !important;' id='fileList' class=\"fileList\"></div>\n      </div><div class='clearfix'></div>\n      ",
          title: 'File Upload',
          backdrop: !0,
          onEscape: !0,
          size: 'xl',
          buttons: {
            success: {
              label: 'Upload',
              className: 'btn-success',
              callback() {
                gs && e.doFileListUpload();
              }
            }
          }
        }));
      const o = document.getElementById('filedrag');
      (o.addEventListener('dragover', vf, !1),
        o.addEventListener('dragleave', vf, !1),
        o.addEventListener('drop', c0, !1),
        (o.style.display = 'block'),
        document.getElementById('fupload').addEventListener('change', c0, !1));
    }
    doFileListUpload() {
      var e = this;
      return I(function* () {
        const i = gs.length;
        for (const [o, s] of gs.entries())
          (bootbox.hideAll(),
            e.alertsService.info(`Uploading ${o}/${i}: ${s.name}.`),
            yield e.doFileUpload(s));
        (e.alertsService.clear(), e.getSessionFiles(), gs.splice(0, gs.length - 1));
      })();
    }
    doFileUpload(e) {
      let i = this;
      return new Promise(function (o, s) {
        let l = `${i.appService.globals.apiROOT}/sessions/v2/upload/${i.appService.globals.sessionID}/${i.appService.globals.sesionToken}/1/files`,
          c = new FormData();
        (c.append('file', e),
          c.append('originalname', e.name),
          ii
            .ajax({
              async: !0,
              crossDomain: !0,
              url: l,
              method: 'POST',
              datatype: 'json',
              processData: !1,
              contentType: !1,
              data: c,
              beforeSend(f) {
                P('Uploading... ' + e.name);
              },
              success(f) {
                (bootbox.hideAll(), P('upload Rc link:', f), o(f));
              },
              error(f) {
                (bootbox.hideAll(), bootbox.alert('Upload Failed...'), s(f));
              }
            })
            .done((f) => {
              (console.log('done resp:', f), bootbox.hideAll(), o(f));
            }));
      });
    }
    getSessionFiles() {
      var e = this;
      return I(function* () {
        P('getSessionFiles...');
        const i = e.makeTokenForCmd('getSessionFiles');
        i.uploadType = 'files';
        const o = yield e.httpClient
          .post(`${e.appService.globals.apiROOT}/sessions/v2/cmd`, i)
          .toPromise();
        (P('getSessionFiles rc: ', o),
          o && o.success && ((e.sessionFiles = o.files), e.calculateFiles(e.sessionFiles)));
      })();
    }
    toggleFileSort(e) {
      this.fileSortField === e
        ? (this.fileSortDir = 'asc' === this.fileSortDir ? 'desc' : 'asc')
        : ((this.fileSortField = e), (this.fileSortDir = 'date' === e ? 'desc' : 'asc'));
    }
    calculateFiles(e) {
      return (
        e &&
          e.length > 0 &&
          ((this.soundsTotal = 0),
          (this.imagesTotal = 0),
          (this.filesTotal = 0),
          e.map((i) => {
            i.contentType.includes('audio/')
              ? ++this.soundsTotal
              : i.contentType.includes('image/')
                ? ++this.imagesTotal
                : ++this.filesTotal;
          })),
        !1
      );
    }
    deleteFile(e, i) {
      var o = this;
      bootbox.confirm(`Delete file: "${e}" ?`, (s) => {
        s &&
          I(function* () {
            const r = o.makeTokenForCmd('deleteFile');
            ((r.fileID = i),
              P(
                'Delete rc: ',
                yield o.httpClient
                  .post(`${o.appService.globals.apiROOT}/sessions/v2/cmd`, r)
                  .toPromise()
              ),
              o.getSessionFiles());
          })();
      });
    }
    deleteSelected() {
      var e = this;
      let i = new Array();
      (ii('#filesDriveList input:checked').each(function () {
        i.push(this.value);
      }),
        0 != i.length
          ? (P('About to delete ' + JSON.stringify(i)),
            bootbox.confirm('Are you sure you want to delete ' + i.length + ' files ?', (o) => {
              o &&
                I(function* () {
                  for (let s = 0; s < i.length; s++) {
                    const r = e.makeTokenForCmd('deleteFile');
                    ((r.fileID = i[s]),
                      P(
                        'Delete rc: ',
                        yield e.httpClient
                          .post(`${e.appService.globals.apiROOT}/sessions/v2/cmd`, r)
                          .toPromise()
                      ));
                  }
                  (P('Done deleting all'), e.getSessionFiles());
                })();
            }))
          : bootbox.alert('No files where checked...'));
    }
    makeTokenForCmd(e) {
      return {
        tok: this.appService.globals.sesionToken,
        sessionID: this.appService.globals.sessionID,
        cmd: e
      };
    }
    detachScreen(e) {
      this.appService.appEventBus.emit('detachScreenShare', e);
    }
    toggleLockScreen(e) {
      this.appService.globals.lockedScreenID =
        this.appService.globals.lockedScreenID && this.appService.globals.lockedScreenID === e
          ? ''
          : e;
    }
    toggleLockScreenMTX(e) {
      console.error('TODO: toggleLockScreenMTX');
    }
    playMp3ForMe(e) {
      if (
        ((this.isPlayingForMe[e._id] =
          !this.isPlayingForMe || !this.isPlayingForMe[e._id] || !this.isPlayingForMe[e._id]),
        this.isPlayingForMe && this.isPlayingForMe[e._id])
      ) {
        const i = document.createElement('audio');
        ((i.controls = !0),
          (i.type = e.contentType),
          (i.src = e.vidPath),
          (i.id = e._id),
          (i.style.display = 'none'),
          document.body.appendChild(i),
          i.play());
      } else {
        const i = document.getElementById(e._id);
        document.body.removeChild(i);
      }
    }
    playMp3ForAll(e) {
      this.appService.sendServerAdminCommand('playMP3ForAll', { url: e });
    }
    stopMp3ForAll() {
      this.appService.sendServerAdminCommand('stopMp3ForAll');
    }
    overwriteCashRegisterSound(e, i) {
      (this.appService.sendServerAdminCommand('overwriteCashRegisterSound', { url: i ? e : '' }),
        (this.appService.globals.sessData.overwriteCashRegisterSound = i ? e : ''));
    }
    adjustVol(e) {
      let i = 100;
      i = e ? e.target.value : this.audioVolume;
      var o = i / 100;
      (console.log('*** Audio AdjustVol to: ' + i + '. this.audioVol:' + this.audioVolume),
        (this.appService.globals.audioVolume = o),
        ii('[id^=msRemAudio-]').prop('volume', o),
        ii('[id^=video-]').prop('volume', o));
    }
    adjustVolPres(e, i) {
      const { userID: o, mediaValue: s } = i,
        r = e.target.value,
        a = r / 100;
      ((this.appService.globals.preferences.audioVolumeFor[o] = r),
        ii('[id^=msRemAudio-' + o + ']').prop('volume', a),
        0 == r &&
          ((this.appService.globals.preferences.audioMutedFor[o] = { name: s.name }),
          this.mediaSoupService.stopListeningToPresenter(i)),
        r > 0 &&
          this.appService.globals.preferences.audioMutedFor[o] &&
          (delete this.appService.globals.preferences.audioMutedFor[o],
          this.mediaSoupService.startListeningToPresenter(i)),
        this.appService.setPreference(
          'audioMutedFor',
          this.appService.globals.preferences.audioMutedFor
        ),
        this.appService.setPreference(
          'audioVolumeFor',
          this.appService.globals.preferences.audioVolumeFor
        ));
    }
    mute() {
      ((this.prevVolume = this.audioVolume),
        (this.audioVolume = 0),
        this.adjustVol(null),
        (this.appService.globals.preferences.doNotDisturbOn = !0));
    }
    unmute() {
      ((this.audioVolume = this.prevVolume),
        this.adjustVol(null),
        (this.appService.globals.preferences.doNotDisturbOn = !1));
    }
    reconnectAudio() {
      this.mediaService.reconnectAudio();
    }
    toggleTalkingPresenter(e) {
      const { userID: i, mediaValue: o } = e;
      (this.appService.globals.preferences.audioMutedFor[i]
        ? (delete this.appService.globals.preferences.audioMutedFor[i],
          this.mediaSoupService.startListeningToPresenter(e),
          (this.appService.globals.preferences.audioVolumeFor[i] = 100))
        : ((this.appService.globals.preferences.audioMutedFor[i] = { name: o.name }),
          this.mediaSoupService.stopListeningToPresenter(e),
          (this.appService.globals.preferences.audioVolumeFor[i] = 0)),
        this.appService.setPreference(
          'audioMutedFor',
          this.appService.globals.preferences.audioMutedFor
        ),
        this.appService.setPreference(
          'audioVolumeFor',
          this.appService.globals.preferences.audioVolumeFor
        ));
    }
    validURL(e) {
      return e.toLowerCase().includes('http://') || e.toLowerCase().includes('https://');
    }
    sendVideoToRoom() {
      let e = this.videoURL?.trim() || '';
      if (e)
        if (this.validURL(e)) {
          if (e.includes('youtube')) {
            const i = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/,
              o = e.match(i) ? e.match(i)[2] : null,
              s = /[?&]list=([^#\&\?]+)/,
              r = e.match(s) ? e.match(s)[1] : null;
            if (!o || !r) return void bootbox.alert('The youtube link seems wrong.');
            o
              ? (e = `https://www.youtube.com/embed/${o}?autoplay=1`)
              : r &&
                (e = `https://www.youtube.com/embed/videoseries?list=${r}&autoplay=1&loop=1&rel=0`);
          }
          if (this.videoList && this.videoList?.length > 0 && this.videoList.includes(e))
            return void bootbox.alert('Video already exists.');
          (this.videoList.push(e),
            this.appService.localstorage.set(
              `videos-${this.appService.globals.sessionID}`,
              JSON.stringify(this.videoList)
            ),
            (this.videoURL = ''),
            bootbox.alert('Video added.'));
        } else bootbox.alert('The link seems to be missing "https://" or "http://"');
      else bootbox.alert('Error. URL is empty.');
    }
    deleteVideoFromList(e) {
      bootbox.confirm(`Are you sure you want to delete this video url: ${e}?`, (i) => {
        i &&
          (this.videoList.splice(this.videoList.indexOf(e), 1),
          this.appService.localstorage.set(
            `videos-${this.appService.globals.sessionID}`,
            JSON.stringify(this.videoList)
          ));
      });
    }
    playVideoForAll(e) {
      bootbox.dialog({
        title: 'Video',
        message: '<p>Do you want to play this video at a specific time?',
        buttons: {
          cancel: {
            label: 'Cancel',
            className: 'btn-danger',
            callback: () => {
              console.log('Cancel clicked');
            }
          },
          noclose: {
            label: 'Choose time?',
            className: 'btn-success',
            callback: () => {
              bootbox.dialog({
                title: 'Choose time:',
                message:
                  "<p><input type='datetime-local' id='video-start-datetime' name='video-start-datetime' class='form-control' /></p>",
                buttons: {
                  cancel: {
                    label: 'Cancel',
                    className: 'btn-danger',
                    callback: () => {
                      console.log('Cancel clicked');
                    }
                  },
                  ok: {
                    label: 'Send',
                    className: 'btn-primary',
                    callback: () => {
                      let i = ii('#video-start-datetime').val();
                      ((this.scheduledVideo.videoPlayTime = i),
                        (this.scheduledVideo.videoURL = e),
                        (i = new Date(i)),
                        (i = i.getTime()),
                        console.log('videoPlayTime:', i),
                        this.appService.sendServerAdminCommand('playVideoForAll', {
                          url: e,
                          videoPlayTime: i
                        }));
                    }
                  }
                }
              });
            }
          },
          ok: {
            label: 'Play now',
            className: 'btn-primary',
            callback: () => {
              this.appService.sendServerAdminCommand('playVideoForAll', {
                url: e,
                videoPlayTime: null
              });
            }
          }
        }
      });
    }
    stopVideoForAll(e) {
      bootbox.confirm(`Are you sure you want to ${e} this video for all?`, (i) => {
        i && this.appService.sendServerAdminCommand('stopVideoForAll');
      });
    }
    onSwingAlertSubmit() {
      if (!(
        this.swingAlert.symbol &&
        this.swingAlert.entryPrice &&
        this.swingAlert.stop &&
        this.swingAlert.target
      ))
        return void bootbox.alert('Please, fill in required fields.');
      const e = this.swingAlert.alertTxt?.trim(),
        i = this.swingAlert.symbol?.trim(),
        o = this.swingAlert.entryPrice?.trim(),
        s = this.swingAlert.stop?.trim(),
        r = this.swingAlert.target?.trim(),
        a = this.swingAlert.image?.trim();
      (i && i.length < 1) || '' === i
        ? bootbox.alert('Please, fill in "symbol" field.')
        : (o && o.length < 1) || '' === o
          ? bootbox.alert('Please, fill in "entry price" field.')
          : (s && s.length < 1) || '' === s
            ? bootbox.alert('Please, fill in "stop" field.')
            : (r && r.length < 1) || '' === r
              ? bootbox.alert('Please, fill in "target" field.')
              : bootbox.confirm(
                  `Are you sure you want to ${this.swingAlert.edit ? 'save' : 'send'} this alert?`,
                  (c) => {
                    if (c) {
                      const h = {
                        alertTxt: e,
                        direction: this.swingAlert.direction,
                        symbol: i,
                        entryPrice: o,
                        stop: s,
                        target: r,
                        image: a,
                        senderName:
                          this.appService.globals.user.nick || this.appService.globals.user.name
                      };
                      if (this.swingAlert.edit) {
                        this.appService.sendServerCommand('editSwingAlertMsg', {
                          newSwingAlertMsg: h,
                          swingAlertID: this.swingAlert._id
                        });
                        const f = this.formatSwingAlertTxt(h);
                        (this.appService.sendServerCommand('editAlertMessageSwing', {
                          alertID: this.swingAlert.alertLogID,
                          newAlertMsg: f,
                          swingTradeAlert: !0,
                          txt: this.swingAlert.txtInAlerts
                        }),
                          (this.swingAlert.txtInAlerts = ''));
                      } else {
                        this.appService.sendServerCommand('swingAlertMsg', h);
                        const _ = {
                          txt: this.formatSwingAlertTxt(h),
                          n: this.appService.globals.user.nick || this.appService.globals.user.name,
                          sendTxt: !1,
                          sendEmail: !1,
                          sendTweet: !1,
                          dontPush: !1,
                          nonTradeAlert: !1,
                          swingTradeAlert: !0
                        };
                        this.appService.sendServerCommand('alertMsg', _);
                      }
                      this.clearSwingAlertFields();
                    }
                  }
                );
    }
    clearSwingAlertFields() {
      this.swingAlert = {
        alertTxt: '',
        direction: 'long',
        symbol: '',
        entryPrice: '',
        stop: '',
        target: '',
        senderName: '',
        edit: !1,
        alertLogID: '',
        image: '',
        txtInAlerts: ''
      };
    }
    onSwingAlertCancel() {
      (this.swingAlert.symbol ||
        this.swingAlert.entryPrice ||
        this.swingAlert.stop ||
        this.swingAlert.target ||
        this.swingAlert.image) &&
        bootbox.confirm(
          `Are you sure you want to ${this.swingAlert.edit ? 'discard' : 'clear'} inputs for this alert?`,
          (i) => {
            i && this.clearSwingAlertFields();
          }
        );
    }
    formatSwingAlertTxt(e) {
      let i = '#SwingTrade \n';
      return (
        (i += `${e.symbol} - ${e.direction} - Entry ${e.entryPrice} - Exit ${e.stop} - Target ${e.target}`),
        e.image && (i += `\n${e.image}`),
        i
      );
    }
    editSwingAlert(e) {
      var i = this;
      return I(function* () {
        ((i.swingAlert = { ...e }), (i.swingAlert.edit = !0));
        let o = i.formatSwingAlertTxt(e);
        for (const r of i.appService.globals.alertsLog)
          if (r.txt == o) {
            ((i.swingAlert.alertLogID = yield r._id), (i.swingAlert.txtInAlerts = r.txt));
            break;
          }
        ii('.swing-alert-form').addClass('animated flash');
        const s = setTimeout(() => {
          (ii('.swing-alert-form').removeClass('animated flash'), clearTimeout(s));
        }, 500);
      })();
    }
    deleteSwingAlert(e, i) {
      bootbox.confirm('Are you sure you want to DELETE this alert?', (o) => {
        if (o) {
          this.appService.sendServerCommand('deleteSwingAlertMsg', { swingAlertID: e });
          let s = this.formatSwingAlertTxt(i),
            r = '';
          for (const a of this.appService.globals.alertsLog)
            if (a.txt == s) {
              r = a._id;
              break;
            }
          this.appService.deleteAlert({ _id: r, swingTradeAlert: !0, txt: s });
        }
      });
    }
    downloadSwingTrades() {
      const e = {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        },
        i = [];
      i.push('Symbol, Long/Short, Alert Date, Entry Price, Stop, Target, Image, Sender \r\n');
      for (let a = 0; a < this.appService.globals.swingAlertsLog.length; a++)
        try {
          const l = this.appService.globals.swingAlertsLog[a],
            c = l.image?.trim() ? l.image : 'n/a',
            h =
              '"' +
              l.symbol +
              '","' +
              l.direction +
              '","' +
              new Date(l.entryDate).toLocaleTimeString('en-us', e) +
              '","' +
              l.entryPrice +
              '","' +
              l.stop +
              '","' +
              l.target +
              '","' +
              c +
              '","' +
              l.senderName +
              '"\r\n';
          i.push(h);
        } catch (l) {
          console.error(l);
        }
      const o = new Blob(i, { type: 'text/csv;charset=utf-8' }),
        s = window.URL.createObjectURL(o),
        r = document.createElement('a');
      ((r.href = s),
        (r.download = `SwingLog_${this.appService.globals.sessionID}.csv`),
        (r.style.display = 'none'),
        document.body.appendChild(r),
        r.click(),
        document.body.removeChild(r));
    }
    decodeHtmlEntities(e) {
      const i = document.createElement('textarea');
      return ((i.innerHTML = e), i.value);
    }
    onDayTradeAlertSubmit() {
      if (!(
        this.dayTradeAlert.symbol &&
        this.dayTradeAlert.entryPrice &&
        this.dayTradeAlert.stop &&
        this.dayTradeAlert.target
      ))
        return void bootbox.alert('Please, fill in required fields.');
      const e = this.dayTradeAlert.alertTxt?.trim(),
        i = this.dayTradeAlert.symbol?.trim(),
        o = this.dayTradeAlert.entryPrice?.trim(),
        s = this.dayTradeAlert.stop?.trim(),
        r = this.dayTradeAlert.target?.trim(),
        a = this.dayTradeAlert.image?.trim();
      (i && i.length < 1) || '' === i
        ? bootbox.alert('Please, fill in "symbol" field.')
        : (o && o.length < 1) || '' === o
          ? bootbox.alert('Please, fill in "entry price" field.')
          : (s && s.length < 1) || '' === s
            ? bootbox.alert('Please, fill in "stop" field.')
            : (r && r.length < 1) || '' === r
              ? bootbox.alert('Please, fill in "target" field.')
              : bootbox.confirm(
                  `Are you sure you want to ${this.dayTradeAlert.edit ? 'save' : 'send'} this alert?`,
                  (c) => {
                    if (c) {
                      const h = {
                        alertTxt: e,
                        direction: this.dayTradeAlert.direction,
                        symbol: i,
                        entryPrice: o,
                        stop: s,
                        target: r,
                        image: a,
                        senderName:
                          this.appService.globals.user.nick || this.appService.globals.user.name
                      };
                      if (this.dayTradeAlert.edit) {
                        this.appService.sendServerCommand('editDayTradeAlertMsg', {
                          newDayTradeAlertMsg: h,
                          dayTradeAlertID: this.dayTradeAlert._id
                        });
                        const f = this.formatDayTradeAlertTxt(h);
                        (this.appService.sendServerCommand('editAlertMessageSwing', {
                          alertID: this.dayTradeAlert.alertLogID,
                          newAlertMsg: f,
                          dayTradeAlert: !0,
                          txt: this.dayTradeAlert.txtInAlerts
                        }),
                          (this.dayTradeAlert.txtInAlerts = ''));
                      } else {
                        this.appService.sendServerCommand('dayTradeAlertMsg', h);
                        const _ = {
                          txt: this.formatDayTradeAlertTxt(h),
                          n: this.appService.globals.user.nick || this.appService.globals.user.name,
                          sendTxt: !1,
                          sendEmail: !1,
                          sendTweet: !1,
                          dontPush: !1,
                          nonTradeAlert: !1,
                          dayTradeAlert: !0
                        };
                        this.appService.sendServerCommand('alertMsg', _);
                      }
                      this.clearDayTradeAlertFields();
                    }
                  }
                );
    }
    clearDayTradeAlertFields() {
      this.dayTradeAlert = {
        alertTxt: '',
        direction: 'long',
        symbol: '',
        entryPrice: '',
        stop: '',
        target: '',
        senderName: '',
        edit: !1,
        alertLogID: '',
        image: '',
        txtInAlerts: ''
      };
    }
    onDayTradeAlertCancel() {
      (this.dayTradeAlert.symbol ||
        this.dayTradeAlert.entryPrice ||
        this.dayTradeAlert.stop ||
        this.dayTradeAlert.target ||
        this.dayTradeAlert.image) &&
        bootbox.confirm(
          `Are you sure you want to ${this.dayTradeAlert.edit ? 'discard' : 'clear'} inputs for this alert?`,
          (i) => {
            i &&
              (this.clearDayTradeAlertFields(),
              (this.appService.globals.dayTradeAlertsLog = [
                ...this.appService.globals.dayTradeAlertsLog
              ]));
          }
        );
    }
    formatDayTradeAlertTxt(e) {
      let i = '#DayTrade \n';
      return (
        (i += `${e.symbol} - ${e.direction} - Entry ${e.entryPrice} - Exit ${e.stop} - Target ${e.target}`),
        e.image && (i += `\n${e.image}`),
        i
      );
    }
    editDayTradeAlert(e) {
      var i = this;
      return I(function* () {
        ((i.dayTradeAlert = { ...e }), (i.dayTradeAlert.edit = !0));
        let o = i.formatDayTradeAlertTxt(e);
        for (const r of i.appService.globals.alertsLog)
          r.txt == o &&
            ((i.dayTradeAlert.txtInAlerts = o), (i.dayTradeAlert.alertLogID = yield r._id));
        ii('.day-trade-alert-form').addClass('animated flash');
        const s = setTimeout(() => {
          (ii('.day-trade-alert-form').removeClass('animated flash'), clearTimeout(s));
        }, 500);
      })();
    }
    deleteDayTradeAlert(e, i) {
      bootbox.confirm('Are you sure you want to DELETE this alert?', (o) => {
        if (o) {
          this.appService.sendServerCommand('deleteDayTradeAlertMsg', { dayTradeAlertID: e });
          let s = this.formatDayTradeAlertTxt(i),
            r = '';
          for (const a of this.appService.globals.alertsLog) a.txt == s && (r = a._id);
          this.appService.deleteAlert({ _id: r, dayTradeAlert: !0, txt: s });
        }
      });
    }
    downloadDayTrades() {
      const e = {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        },
        i = [];
      i.push('Symbol, Long/Short, Alert Date, Entry Price, Stop, Target, Image, Sender \r\n');
      for (let a = 0; a < this.appService.globals.dayTradeAlertsLog.length; a++)
        try {
          const l = this.appService.globals.dayTradeAlertsLog[a],
            c = l.image?.trim() ? l.image : 'n/a',
            h =
              '"' +
              l.symbol +
              '","' +
              l.direction +
              '","' +
              new Date(l.entryDate).toLocaleTimeString('en-us', e) +
              '","' +
              l.entryPrice +
              '","' +
              l.stop +
              '","' +
              l.target +
              '","' +
              c +
              '","' +
              l.senderName +
              '"\r\n';
          i.push(h);
        } catch (l) {
          console.error(l);
        }
      const o = new Blob(i, { type: 'text/csv;charset=utf-8' }),
        s = window.URL.createObjectURL(o),
        r = document.createElement('a');
      ((r.href = s),
        (r.download = `DayTradeLog_${this.appService.globals.sessionID}.csv`),
        (r.style.display = 'none'),
        document.body.appendChild(r),
        r.click(),
        document.body.removeChild(r));
    }
    imgUpload(e) {
      var i = this;
      ((gs = []),
        (this.imggurUploadTxt = ''),
        bootbox.dialog({
          message:
            "<div>\n        <label class='upload-area' style='width:100%;text-align:center;' for='fupload'>\n        <input id='fupload' name='fupload' type='file' style='display:none;' multiple='false' accept='image/*'>\n        <i class='fas fa-file-upload fa-3x'></i><br />\n        Click to select images to upload\n        </label>\n        <div id=\"filedrag\" class=\"filedrag\">or drop files here</div>\n        <br />\n        <div style='margin-left:5px !important;' id='fileList' class=\"fileList text-center\"></div>\n        </div><div class='clearfix'></div>\n        ",
          title: 'Image Upload',
          backdrop: !0,
          onEscape: !0,
          size: 'xl',
          buttons: {
            success: {
              label: 'Upload',
              className: 'btn-success',
              callback: function () {
                gs && i.doImagurFileListUpload(e);
              }
            }
          }
        }));
      let s = document.getElementById('filedrag');
      (s.addEventListener('dragover', vf, !1),
        s.addEventListener('dragleave', vf, !1),
        s.addEventListener('drop', c0, !1),
        (s.style.display = 'block'),
        document.getElementById('fupload').addEventListener('change', c0, !1));
    }
    doImagurFileListUpload(e) {
      var i = this;
      return I(function* () {
        let o = gs.length;
        for (const [s, r] of gs.entries())
          (bootbox.hideAll(),
            bootbox.alert(
              `Uploading ${s}/${o}: ${r.name}. Please wait...<br><div style="text-align: center;"><i class="ml-2 fas fa-spinner fa-spin fa-3x"></i></div>`
            ),
            yield i.doImggurUpload(r, e, o - 1 !== s));
        (bootbox.hideAll(), gs.splice(0, o - 1));
      })();
    }
    doImggurUpload(e, i = null, o = !1) {
      var s = this;
      return new Promise(function (r, a) {
        const l = `${s.appService.globals.upload_server}/image/${s.appService.globals.sessionID}`,
          c = s.appService.globals.cdn_upload_key;
        var h = new FormData();
        (h.append('image', e),
          h.append('name', e.name),
          ii
            .ajax({
              async: !0,
              crossDomain: !0,
              url: l,
              method: 'POST',
              datatype: 'json',
              headers: { Authorization: 'Client-ID ' + c },
              processData: !1,
              contentType: !1,
              data: h,
              beforeSend: function (_) {
                P('Uploading... ' + e.name);
              },
              success: function (_) {
                (bootbox.hideAll(), P('imge link:' + _.data.link));
                let F = _.data.link;
                ('swing' === i
                  ? (s.swingAlert.image = F)
                  : 'dayTrade' === i && (s.dayTradeAlert.image = F),
                  r(_));
              },
              error: function (_) {
                (bootbox.hideAll(), bootbox.alert('Upload Failed...'), a(_));
              }
            })
            .done(function (_) {
              (r(_), console.log('done resp:', _));
            }));
      });
    }
    onImagePaste(e, i) {
      const o = this,
        s = (e.clipboardData || e.originalEvent.clipboardData).items;
      let r = null;
      for (const a of s) 0 === a.type.indexOf('image') && (r = a.getAsFile());
      if (r) {
        const a = URL.createObjectURL(r);
        bootbox.confirm({
          message:
            '<div class="text-center"><h4>Upload this image?</h4><img style="max-width:100%; max-height: 50vh;" src="' +
            a +
            '" /> </div>',
          callback: (l) =>
            I(function* () {
              l
                ? (yield o.doImggurUpload(r, i), console.log('ok, uploading...'))
                : console.log('cancel uploading...');
            })()
        });
      }
    }
    showImagePreview(e, i = '') {
      e &&
        bootbox.dialog({
          title: i,
          message: `\n        <div class="text-center">\n          <img src="${e}"\n              class="img-fluid"\n               alt="${e}" />\n        </div>\n      `,
          size: 'large',
          buttons: {
            download: {
              label: '<i class="fa fa-download"></i> Download Image',
              className: 'btn-primary btn-sm m-auto',
              callback: () => (
                fetch(e)
                  .then((o) => o.blob())
                  .then((o) => {
                    const s = document.createElement('a');
                    s.href = URL.createObjectURL(o);
                    let r = e.split('/').pop() || 'image.jpg';
                    ((r = r.replace(/^[^_]+_/, '').replace(/_[^_]+(\.[^.]+)$/, '$1')),
                      (s.download = r),
                      console.log('img_name: ', r),
                      document.body.appendChild(s),
                      s.click(),
                      document.body.removeChild(s),
                      URL.revokeObjectURL(s.href));
                  })
                  .catch((o) => console.error('Download failed', o)),
                !1
              )
            }
          }
        });
    }
    removeImageSwing() {
      this.swingAlert.image = '';
    }
    removeImageDayTrade() {
      this.dayTradeAlert.image = '';
    }
    onTradeAlertWeeksChange(e) {
      const i = 'Swing' === e ? 30 * this.swingAlertMonths : 4 * this.dayTradeAlertMonths * 7;
      this.appService.globals['Swing' === e ? 'swingAlertsLog' : 'dayTradeAlertsLog'] = [];
      let s = this.appService.globals.sessData[`linkedRoom${e}AlertsOther`];
      ((s = s?.trim()),
        this.appService.sendServerCommand(`get${e}AlertsLog`, {
          sessionID: s || this.appService.globals.sessionID,
          days: i
        }));
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(fo), be(ma), be(jg), be(fa), be(Ir), be(__), be(Dt));
      };
    }
    static {
      this.ɵcmp = ut({
        type: t,
        selectors: [['app-presentationarea']],
        viewQuery: function (i, o) {
          if ((1 & i && Xt(NCe, 5), 2 & i)) {
            let s;
            yt((s = Ft())) && (o.speechRecoBodyRef = s.first);
          }
        },
        inputs: { scPlaying: 'scPlaying' },
        decls: 90,
        vars: 69,
        consts: [
          ['alertForm', 'ngForm'],
          ['speechRecoBody', ''],
          [1, 'mainPresentationAreaHolder'],
          ['id', 'mainTabs', 'role', 'tablist', 1, 'nav', 'nav-tabs', 'mainTabset', 3, 'hidden'],
          ['role', 'presentation', 1, 'nav-item', 3, 'click', 'hidden'],
          [
            'id',
            'screens-tab',
            'data-bs-toggle',
            'tab',
            'data-bs-target',
            '#screens',
            'role',
            'tab',
            'aria-controls',
            'screens',
            'aria-selected',
            'true',
            1,
            'nav-link',
            3,
            'ngClass'
          ],
          [1, 'd-flex'],
          [1, 'fas', 'fa-desktop'],
          [1, 'ml-1'],
          [
            'id',
            'streams-tab',
            'data-bs-toggle',
            'tab',
            'data-bs-target',
            '#streams',
            'role',
            'tab',
            'aria-controls',
            'streams',
            'aria-selected',
            'true',
            1,
            'nav-link',
            3,
            'ngClass'
          ],
          [1, 'fas', 'fa-podcast'],
          [
            'id',
            'notes-tab',
            'data-bs-toggle',
            'tab',
            'data-bs-target',
            '#notes',
            'role',
            'tab',
            'aria-controls',
            'notes',
            'aria-selected',
            'false',
            1,
            'nav-link',
            'presAreaTabs-notes',
            3,
            'ngClass'
          ],
          [1, 'd-flex', 'align-items-center'],
          ['id', 'noteChangeIndicator', 1, 'fas', 'fa-edit'],
          [1, 'mx-1'],
          [1, 'dropdown'],
          ['role', 'presentation', 1, 'nav-item'],
          [
            'data-bs-toggle',
            'tab',
            'data-bs-target',
            '#files',
            'role',
            'tab',
            'aria-controls',
            'files',
            'aria-selected',
            'false',
            1,
            'nav-link',
            3,
            'ngClass'
          ],
          [1, 'fas', 'fa-folder'],
          ['id', 'mainTabsContent', 1, 'tab-content'],
          [
            'id',
            'screens',
            'role',
            'tabpanel',
            'aria-labelledby',
            'screens-tab',
            1,
            'tab-pane',
            'fade',
            3,
            'ngClass',
            'hidden'
          ],
          [1, 'd-flex', 'align-items-start', 'justify-content-center', 'w-100', 'h-100'],
          [
            'id',
            'streams',
            'role',
            'tabpanel',
            'aria-labelledby',
            'streams-tab',
            1,
            'tab-pane',
            'fade',
            3,
            'ngClass',
            'hidden'
          ],
          [1, 'text-center', 'mt-4'],
          [
            'id',
            'notes',
            'role',
            'tabpanel',
            'aria-labelledby',
            'notes-tab',
            1,
            'tab-pane',
            3,
            'ngClass',
            'hidden'
          ],
          [
            'id',
            'recordings',
            'role',
            'tabpanel',
            'aria-labelledby',
            'recordings-tab',
            1,
            'tab-pane',
            'position-relative',
            'h-100',
            3,
            'ngClass'
          ],
          [
            'id',
            'videoplayer',
            'role',
            'tabpanel',
            'aria-labelledby',
            'videoplayer-tab',
            1,
            'tab-pane',
            'position-relative',
            'h-100',
            3,
            'ngClass'
          ],
          [
            'id',
            'swingAlerts',
            'role',
            'tabpanel',
            'aria-labelledby',
            'swingAlerts-tab',
            1,
            'tab-pane',
            'position-relative',
            3,
            'ngClass'
          ],
          [
            'id',
            'dayTradeAlerts',
            'role',
            'tabpanel',
            'aria-labelledby',
            'dayTradeAlerts-tab',
            1,
            'tab-pane',
            'position-relative',
            3,
            'ngClass'
          ],
          [
            'id',
            'files',
            'role',
            'tabpanel',
            'aria-labelledby',
            'files-tab',
            1,
            'tab-pane',
            'fade',
            3,
            'ngClass',
            'hidden'
          ],
          [
            'id',
            'myTab',
            'role',
            'tablist',
            1,
            'nav',
            'nav-tabs',
            'files-tabs',
            'd-flex',
            'justify-content-center'
          ],
          ['role', 'presentation', 1, 'nav-item', 3, 'click'],
          [
            'id',
            'files-tab',
            'data-bs-toggle',
            'tab',
            'role',
            'tab',
            'aria-controls',
            'files',
            'aria-selected',
            'true',
            1,
            'nav-link',
            'd-flex',
            'align-items-center',
            'justify-content-between',
            3,
            'ngClass'
          ],
          [1, 'badge', 'rounded-pill', 'bg-danger', 'files-badge'],
          [
            'id',
            'image-tab',
            'data-bs-toggle',
            'tab',
            'role',
            'tab',
            'aria-controls',
            'image',
            'aria-selected',
            'false',
            1,
            'nav-link',
            'd-flex',
            'align-items-center',
            'justify-content-between',
            3,
            'ngClass'
          ],
          [
            'id',
            'sounds-tab',
            'data-bs-toggle',
            'tab',
            'role',
            'tab',
            'aria-controls',
            'sounds',
            'aria-selected',
            'false',
            1,
            'nav-link',
            'd-flex',
            'align-items-center',
            'justify-content-between',
            3,
            'ngClass'
          ],
          [
            1,
            'mt-3',
            'mb-3',
            'text-center',
            'd-flex',
            'flex-wrap',
            'justify-content-center',
            'align-items-center',
            'w-75',
            'm-auto'
          ],
          [1, 'flex-fill', 'mb-1'],
          [1, 'input-group', 'st-searchbar'],
          [
            'type',
            'text',
            'placeholder',
            'Search files...',
            'aria-label',
            'search',
            'aria-describedby',
            'addon-wrapping',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [
            'id',
            'basic-addon1',
            1,
            'input-group-text',
            'st-searchbar-icon',
            'btn',
            'btn-outline-secondary'
          ],
          [1, 'fas', 'fa-search'],
          [1, 'd-flex', 'flex-wrap', 'justify-content-center', 'align-items-center', 'ml-2'],
          ['title', 'Delete Selected', 1, 'btn', 'm-2', 'st-fileDeleteSelected'],
          ['title', 'Reload list', 1, 'btn', 'mt-2', 'mr-2', 'mb-2', 'st-fileSeeMore', 3, 'click'],
          [1, 'fas', 'fa-sync', 'ml-2'],
          [
            'title',
            'Upload New File',
            1,
            'btn',
            'btn-secondary',
            'mt-2',
            'mr-2',
            'mb-2',
            'st-fileUpload'
          ],
          ['type', 'button', 'title', 'Stop For All', 1, 'btn', 'ml-2', 'st-fileDelete'],
          [1, 'mt-4', 'text-center'],
          [3, 'startTime', 'ytURL'],
          [3, 'scUrl'],
          ['id', 'mp3player', 'autoplay', 'autoplay', 3, 'src'],
          [1, 'speech-reco-overlay', 3, 'history-mode', 'single-line'],
          [
            'id',
            'dropdownMenuNotes',
            'data-bs-toggle',
            'dropdown',
            'aria-expanded',
            'false',
            1,
            'dropdown-toggle'
          ],
          [1, 'fas', 'fa-cog'],
          ['aria-labelledby', 'dropdownMenuButton', 1, 'dropdown-menu'],
          [3, 'click'],
          ['href', '#', 1, 'dropdown-item'],
          [1, 'fas', 'fa-plus'],
          [
            'id',
            'recordings-tab',
            'data-bs-toggle',
            'tab',
            'data-bs-target',
            '#recordings',
            'role',
            'tab',
            'aria-controls',
            'recordings',
            'aria-selected',
            'false',
            1,
            'nav-link',
            3,
            'ngClass'
          ],
          [1, 'fas', 'fa-file-video'],
          [
            'id',
            'videoplayer-tab',
            'data-bs-toggle',
            'tab',
            'data-bs-target',
            '#videoplayer',
            'role',
            'tab',
            'aria-controls',
            'videoplayer',
            'aria-selected',
            'true',
            1,
            'nav-link',
            3,
            'ngClass'
          ],
          [1, 'fas', 'fa-video'],
          [
            'id',
            'swingAlerts-tab',
            'data-bs-toggle',
            'tab',
            'data-bs-target',
            '#swingAlerts',
            'role',
            'tab',
            'aria-controls',
            'swingAlerts',
            'aria-selected',
            'true',
            1,
            'nav-link',
            3,
            'ngClass'
          ],
          [1, 'fas', 'fa-bell'],
          [
            'id',
            'dayTradeAlerts-tab',
            'data-bs-toggle',
            'tab',
            'data-bs-target',
            '#dayTradeAlerts',
            'role',
            'tab',
            'aria-controls',
            'dayTradeAlerts',
            'aria-selected',
            'true',
            1,
            'nav-link',
            3,
            'ngClass'
          ],
          [
            'id',
            'dropdownMenuFiles',
            'data-bs-toggle',
            'dropdown',
            'aria-expanded',
            'false',
            1,
            'dropdown-toggle'
          ],
          ['aria-labelledby', 'dropdownMenuFiles', 1, 'dropdown-menu'],
          [
            'width',
            '100%',
            'height',
            '95%',
            'scrolling',
            'no',
            'frameborder',
            'no',
            'allow',
            'autoplay',
            'allowfullscreen',
            '',
            3,
            'src'
          ],
          ['id', 'screenTabs', 'role', 'tablist', 1, 'nav', 'nav-tabs', 'screens-tabs'],
          [1, 'nav-item', 'ms-auto'],
          ['id', 'screensTabsContent', 1, 'tab-content', 3, 'ngClass'],
          ['role', 'tabpanel', 1, 'tab-pane', 'fade', 3, 'ngClass', 'id'],
          [
            'data-bs-toggle',
            'tab',
            'role',
            'tab',
            'aria-selected',
            'true',
            1,
            'nav-link',
            3,
            'ngClass',
            'id'
          ],
          [
            'placement',
            'bottom',
            'tooltip',
            'This is the default screen users are taken to right now. If you are a presenter and talking whichever screen you select will be forced on others. You can also select a specific screen and click the gear icon on this tab to force everyone to watch that screen.',
            1,
            'mr-2'
          ],
          ['placement', 'bottom', 'tooltip', 'Unlock this screen?', 1, 'mr-2'],
          [1, 'presenter-img', 3, 'src'],
          [1, 'd-inline-block'],
          [
            'id',
            'dropdownMenuScreen',
            'data-bs-toggle',
            'dropdown',
            'aria-expanded',
            'false',
            1,
            'dropdown-toggle'
          ],
          [1, 'fas', 'fa-external-link-alt'],
          ['title', 'Lock this screen?'],
          [1, 'fas', 'fa-eye'],
          ['placement', 'bottom', 'tooltip', 'Unlock this screen?', 1, 'mr-2', 3, 'click'],
          ['aria-hidden', 'true', 1, 'fas', 'fa-lock'],
          [1, 'fas', 'fa-trash-alt'],
          ['title', 'Unlock this screen?'],
          ['aria-hidden', 'true', 1, 'fas', 'fa-unlock'],
          [1, 'zoom-controls-container', 'position-relative'],
          [1, 'zoom-controls', 'position-absolute', 3, 'ngClass'],
          ['id', 'dropdownVolume', 'data-bs-toggle', 'dropdown', 1, 'btn', 'btn-sm', 'btn-dark'],
          ['aria-labelledby', 'dropdownVolume', 1, 'dropdown-menu', 'volumeControl'],
          ['data-bs-toggle', 'dropdown', 1, 'float-right', 'mr-2'],
          [1, 'fas', 'fa-times'],
          [
            'audioVolSlider',
            '',
            'type',
            'range',
            'min',
            '0',
            'max',
            '100',
            'title',
            'Volume',
            1,
            'mx-auto',
            'py-2',
            'volCtrl',
            3,
            'ngModelChange',
            'change',
            'input',
            'ngModel'
          ],
          ['title', 'Mute Audio', 1, 'btn', 'btn-primary', 'btn-sm'],
          ['title', 'Unmute Audio', 1, 'btn', 'btn-primary', 'btn-sm'],
          [1, 'room-sound-options'],
          [1, 'btn', 'btn-sm', 'btn-dark', 3, 'click'],
          [1, 'icon', 'fas', 'fa-search'],
          [1, 'icon', 'fas', 'fa-camera'],
          [1, 'icon', 'fas', 'fa-compress-arrows-alt'],
          [1, 'btn', 'btn-sm', 'btn-warning', 3, 'click'],
          [1, 'icon', 'fas', 'fa-search-plus'],
          [1, 'icon', 'fas', 'fa-search-minus'],
          [1, 'icon', 'fas', 'fa-redo'],
          [1, 'fas', 'fa-volume-up'],
          [1, 'fas', 'fa-volume-down'],
          [1, 'fas', 'fa-volume-off'],
          ['title', 'Mute Audio', 1, 'btn', 'btn-primary', 'btn-sm', 3, 'click'],
          ['title', 'Unmute Audio', 1, 'btn', 'btn-primary', 'btn-sm', 3, 'click'],
          [1, 'my-1'],
          [
            'type',
            'checkbox',
            'value',
            'Presenter audiob',
            'title',
            'Presenter audio',
            1,
            'form-check-input',
            3,
            'change',
            'name',
            'id',
            'checked'
          ],
          [1, 'form-check-label', 3, 'for', 'ngClass'],
          [1, 'mx-2', 'text-center'],
          [
            'audioVolSlider',
            '',
            'type',
            'range',
            'min',
            '0',
            'max',
            '100',
            'title',
            'Volume',
            1,
            'mx-auto',
            'py-1',
            'volCtrl',
            3,
            'ngModelChange',
            'change',
            'input',
            'ngModel'
          ],
          [1, 'icon', 'fas', 'fa-expand'],
          [1, 'h-inherit', 3, 'muser'],
          ['id', 'streamsTabs', 'role', 'tablist', 1, 'nav', 'nav-tabs', 'screens-tabs'],
          ['id', 'streamsTabsContent', 1, 'tab-content'],
          [1, 'btn', 'btn-small', 'btn-primary', 3, 'click'],
          ['id', 'notesTabs', 'role', 'tablist', 1, 'nav', 'nav-tabs', 'noteTabset'],
          ['id', 'notesTabsContent', 1, 'tab-content'],
          [
            'placement',
            'bottom',
            'ngbTooltip',
            'This note is the Welcome Mat, and will be shown by default when noboby is presenting',
            1,
            'badge',
            'badge-success',
            'mx-1',
            'p-0'
          ],
          [1, 'fas', 'fa-pen', 'mx-1', 2, 'display', 'none', 3, 'id'],
          [
            'placement',
            'bottom',
            'tooltip',
            'Double-Click to rename note tab',
            1,
            'editName',
            'mx-1',
            3,
            'dblclick'
          ],
          [1, 'fas', 'fa-home'],
          [
            'id',
            'dropdownMenuNote',
            'data-bs-toggle',
            'dropdown',
            'aria-expanded',
            'false',
            1,
            'dropdown-toggle'
          ],
          ['aria-labelledby', 'dropdownMenuNote', 1, 'dropdown-menu'],
          [1, 'fas', 'fa-edit'],
          [1, 'note-container'],
          [3, 'tab'],
          [1, 'noteOptions', 'd-flex', 'align-items-center', 'justify-content-between'],
          ['type', 'button', 'title', 'Edit Note', 1, 'btn', 'btn-sm', 'noteEdit', 'mr-3'],
          [
            'type',
            'button',
            'title',
            'Download Note',
            1,
            'btn',
            'btn-sm',
            'noteDownload',
            'mr-3',
            3,
            'click'
          ],
          [1, 'fas', 'fa-download', 'mr-2'],
          ['type', 'button', 'title', 'Delete Note', 1, 'btn', 'btn-sm', 'noteDelete'],
          [
            'type',
            'button',
            'title',
            'Edit Note',
            1,
            'btn',
            'btn-sm',
            'noteEdit',
            'mr-3',
            3,
            'click'
          ],
          [1, 'fas', 'fa-edit', 'mr-2'],
          ['type', 'button', 'title', 'Delete Note', 1, 'btn', 'btn-sm', 'noteDelete', 3, 'click'],
          [1, 'fas', 'fa-trash-alt', 'mr-2'],
          ['width', '100%', 'height', '100%', 'frameborder', '0', 3, 'src'],
          [1, 'm-4'],
          [1, 'mx-2'],
          [
            'type',
            'button',
            'title',
            'Remove For All',
            1,
            'btn',
            'btn-danger',
            'btn-sm',
            'ms-4',
            3,
            'click'
          ],
          [1, 'fa', 'fa-trash', 'mr-2'],
          [
            1,
            'w-100',
            'd-flex',
            'justify-content-between',
            'align-items-center',
            'm-2',
            'border-bottom'
          ],
          [1, 'm-2'],
          [1, 'd-flex', 'align-items-center', 'flex-column'],
          [1, 'input-group', 'm-2'],
          [
            'type',
            'text',
            'placeholder',
            'Video url...',
            'aria-label',
            'video url',
            'aria-describedby',
            'addon-video-url',
            1,
            'form-control',
            'ms-4',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [
            'id',
            'addon-video-url',
            1,
            'input-group-text',
            'btn',
            'btn-outline-primary',
            'me-4',
            3,
            'click'
          ],
          [1, 'fas', 'fa-plus-circle', 'px-2'],
          [1, 'ms-4', 'me-2'],
          [1, 'fas', 'fa-trash', 'me-2', 'text-danger', 'video-player-delete-btn', 3, 'click'],
          [1, 'video-player-btns'],
          ['type', 'button', 'title', 'Play For All', 1, 'btn', 'btn-primary', 'm-2', 'me-4'],
          [
            'type',
            'button',
            'title',
            'Play For All',
            1,
            'btn',
            'btn-primary',
            'm-2',
            'me-4',
            3,
            'click'
          ],
          [1, 'fa', 'fa-play-circle', 'mr-2'],
          [1, 'w-100', 'h-100'],
          [1, 'text-right', 'video-player-btns'],
          [
            'width',
            '100%',
            'height',
            '90%',
            'allow',
            'autoplay; encrypted-media',
            'frameborder',
            '0',
            'allowfullscreen',
            '',
            1,
            'videoPlayerUrl-iframe',
            3,
            'src'
          ],
          [
            'type',
            'button',
            'title',
            'Stop For All',
            1,
            'btn',
            'btn-danger',
            'btn-sm',
            'm-1',
            3,
            'click'
          ],
          [1, 'fa', 'fa-stop-circle', 'mr-2'],
          [
            'autoplay',
            'autoplay',
            'playsinline',
            '',
            'controls',
            '',
            1,
            'room-video-player',
            3,
            'src'
          ],
          [1, 'm-2', 'mx-auto', 'swing-alert-form'],
          [1, 'swing-alerts-container', 'm-2'],
          [1, 'text-center', 'm-0', 'p-1', 'px-3'],
          [
            1,
            'form-select',
            'form-select-sm',
            'd-inline-block',
            'w-auto',
            'trade-alerts-select',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [3, 'ngValue'],
          [1, 'text-center', 'm-0', 'p-1', 'px-3', 'bg-secondary'],
          [1, 'm-2', 'mx-auto', 'swing-alert-form', 3, 'ngSubmit'],
          [1, 'form-group', 'input-group', 'mb-1'],
          [1, 'input-group-text', 'bg-secondary', 'border-secondary', 'text-white'],
          [
            'type',
            'text',
            'id',
            'swingAlert-symbol',
            'placeholder',
            'AAPL',
            'minlength',
            '1',
            'name',
            'swingAlert-symbol',
            'required',
            '',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [
            'type',
            'text',
            'id',
            'swingAlert-entryPrice',
            'placeholder',
            '123.57',
            'minlength',
            '1',
            'name',
            'swingAlert-entryPrice',
            'required',
            '',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [
            'type',
            'text',
            'id',
            'swingAlert-stop',
            'placeholder',
            '120.40',
            'minlength',
            '1',
            'name',
            'swingAlert-stop',
            'required',
            '',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [
            'type',
            'text',
            'id',
            'swingAlert-target',
            'placeholder',
            '138.75',
            'minlength',
            '1',
            'name',
            'swingAlert-target',
            'required',
            '',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [
            'title',
            'Click to view image',
            1,
            'input-group-text',
            'bg-secondary',
            'border-secondary',
            'text-white',
            'text-center',
            'p-0',
            'd-block'
          ],
          [
            'type',
            'text',
            'id',
            'swingAlert-image',
            'placeholder',
            'Upload Image or Paste Image Link / Screenshot (optional)',
            'minlength',
            '1',
            'name',
            'swingAlert-image',
            1,
            'form-control',
            3,
            'paste',
            'ngModelChange',
            'ngModel'
          ],
          [
            'title',
            'Remove Image',
            1,
            'input-group-text',
            'bg-danger',
            'border-danger',
            'text-white',
            'remove-image-btn'
          ],
          [1, 'd-flex', 'align-items-center', 'justify-content-between', 'flex-wrap'],
          [1, 'form-group', 'mb-0', 'ms-1'],
          [1, 'form-check', 'form-check-inline', 'ms-2'],
          [
            'type',
            'radio',
            'name',
            'swingAlert-direction',
            'id',
            'swingAlert-long',
            'value',
            'long',
            'required',
            '',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'swingAlert-long', 1, 'form-check-label', 'text-success', 'font-weight-bold'],
          [1, 'form-check', 'form-check-inline'],
          [
            'type',
            'radio',
            'name',
            'swingAlert-direction',
            'id',
            'swingAlert-short',
            'value',
            'short',
            'required',
            '',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'swingAlert-short', 1, 'form-check-label', 'text-danger', 'font-weight-bold'],
          [1, 'text-end'],
          ['type', 'button', 1, 'btn', 'btn-secondary', 'btn-sm', 'm-1', 3, 'click'],
          ['type', 'submit', 1, 'btn', 'btn-primary', 'btn-sm', 'm-1'],
          [
            'title',
            'Click to view image',
            1,
            'input-group-text',
            'bg-secondary',
            'border-secondary',
            'text-white',
            'text-center',
            'p-0',
            'd-block',
            3,
            'click'
          ],
          [1, 'd-inline-block', 'uploaded-img-preview', 3, 'src', 'alt'],
          [
            'title',
            'Upload Image',
            1,
            'input-group-text',
            'bg-secondary',
            'border-secondary',
            'text-white',
            'img-upload-btn',
            3,
            'click'
          ],
          [1, 'fas', 'fa-image', 'me-1'],
          [
            'title',
            'Remove Image',
            1,
            'input-group-text',
            'bg-danger',
            'border-danger',
            'text-white',
            'remove-image-btn',
            3,
            'click'
          ],
          [1, 'fas', 'fa-trash', 'me-1'],
          [1, 'fas', 'fa-times', 'me-1'],
          [1, 'fas', 'fa-save', 'me-1'],
          [1, 'fas', 'fa-bell', 'me-1'],
          [1, 'input-group', 'input-group-sm', 'swingAlert-limit-container', 'm-2', 'ms-0'],
          [1, 'input-group-text'],
          [
            'type',
            'number',
            'step',
            '5',
            'min',
            '0',
            'id',
            'swingAlert-limit',
            'aria-label',
            'swingAlert-limit',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [
            'title',
            'Download Swing Trades',
            1,
            'm-1',
            'ms-4',
            'download-swing-trades-btn',
            3,
            'click'
          ],
          [1, 'fas', 'fa-save'],
          [
            'type',
            'search',
            'id',
            'swingAlert-search',
            'placeholder',
            'Enter your search term',
            'aria-label',
            'swingAlert-search',
            'aria-describedby',
            'swingAlert-search',
            1,
            'form-control',
            'form-control-sm',
            'm-2',
            'me-0',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [1, 'table-responsive'],
          [1, 'table', 'table-striped'],
          [3, 'ngClass'],
          [1, 'ms-2', 'font-weight-bold'],
          [1, 'text-center', 'align-middle', 'p-0', 'm-0'],
          ['title', 'Click to view image', 1, 'uploaded-alert-image', 3, 'src', 'alt'],
          [1, 'p-0'],
          [1, 'mx-1', 'font-weight-bold'],
          [1, 'alert-sender-img', 3, 'src', 'alt'],
          [1, 'p-1', 'swing-alert-btn-delete', 3, 'click'],
          [1, 'fa', 'fa-trash'],
          [1, 'p-1', 'swing-alert-btn-edit', 3, 'click'],
          [1, 'fa', 'fa-edit'],
          ['title', 'Click to view image', 1, 'uploaded-alert-image', 3, 'click', 'src', 'alt'],
          [1, 'm-2', 'mx-auto', 'day-trade-alert-form'],
          [1, 'day-trade-alerts-container', 'm-2'],
          [1, 'm-2', 'mx-auto', 'day-trade-alert-form', 3, 'ngSubmit'],
          [
            'type',
            'text',
            'id',
            'dayTradeAlert-symbol',
            'placeholder',
            'AAPL',
            'minlength',
            '1',
            'name',
            'dayTradeAlert-symbol',
            'required',
            '',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [
            'type',
            'text',
            'id',
            'dayTradeAlert-entryPrice',
            'placeholder',
            '123.57',
            'minlength',
            '1',
            'name',
            'dayTradeAlert-entryPrice',
            'required',
            '',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [
            'type',
            'text',
            'id',
            'dayTradeAlert-stop',
            'placeholder',
            '120.40',
            'minlength',
            '1',
            'name',
            'dayTradeAlert-stop',
            'required',
            '',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [
            'type',
            'text',
            'id',
            'dayTradeAlert-target',
            'placeholder',
            '138.75',
            'minlength',
            '1',
            'name',
            'dayTradeAlert-target',
            'required',
            '',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [
            'type',
            'text',
            'id',
            'dayTradeAlert-image',
            'placeholder',
            'Upload Image or Paste Image Link / Screenshot (optional)',
            'minlength',
            '1',
            'name',
            'dayTradeAlert-image',
            1,
            'form-control',
            3,
            'paste',
            'ngModelChange',
            'ngModel'
          ],
          [
            'type',
            'radio',
            'name',
            'dayTradeAlert-direction',
            'id',
            'dayTradeAlert-long',
            'value',
            'long',
            'required',
            '',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'dayTradeAlert-long', 1, 'form-check-label', 'text-success', 'font-weight-bold'],
          [
            'type',
            'radio',
            'name',
            'dayTradeAlert-direction',
            'id',
            'dayTradeAlert-short',
            'value',
            'short',
            'required',
            '',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'dayTradeAlert-short', 1, 'form-check-label', 'text-danger', 'font-weight-bold'],
          [1, 'input-group', 'input-group-sm', 'dayTradeAlert-limit-container', 'm-2', 'ms-0'],
          [
            'type',
            'number',
            'step',
            '5',
            'min',
            '0',
            'id',
            'dayTradeAlert-limit',
            'aria-label',
            'dayTradeAlert-limit',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['title', 'Download Day Trades', 1, 'm-1', 'ms-4', 'download-day-trades-btn', 3, 'click'],
          [
            'type',
            'search',
            'id',
            'dayTradeAlert-search',
            'placeholder',
            'Enter your search term',
            'aria-label',
            'dayTradeAlert-search',
            'aria-describedby',
            'dayTradeAlert-search',
            1,
            'form-control',
            'form-control-sm',
            'm-2',
            'me-0',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [1, 'p-1', 'day-trade-alert-btn-delete', 3, 'click'],
          [1, 'p-1', 'day-trade-alert-btn-edit', 3, 'click'],
          ['title', 'Delete Selected', 1, 'btn', 'm-2', 'st-fileDeleteSelected', 3, 'click'],
          [1, 'fa', 'fa-trash', 'fa-check', 'mr-2'],
          [
            'title',
            'Upload New File',
            1,
            'btn',
            'btn-secondary',
            'mt-2',
            'mr-2',
            'mb-2',
            'st-fileUpload',
            3,
            'click'
          ],
          [
            'type',
            'button',
            'title',
            'Stop For All',
            1,
            'btn',
            'ml-2',
            'st-fileDelete',
            3,
            'click'
          ],
          [
            1,
            'd-flex',
            'flex-wrap',
            'justify-content-center',
            'align-items-center',
            'mt-2',
            'st-fileSortBar'
          ],
          [1, 'mr-2'],
          [1, 'btn', 'btn-sm', 'm-1', 'st-fileSortName', 3, 'click', 'ngClass', 'title'],
          [1, 'fas', 'ml-2', 3, 'ngClass'],
          [1, 'btn', 'btn-sm', 'm-1', 'st-fileSortDate', 3, 'click', 'ngClass', 'title'],
          [1, 'table', 'table-striped', 'm-auto', 'w-100', 'mt-3', 'st-fileTable'],
          ['id', 'filesDriveList'],
          [1, 'fas', 'fa-sort', 'ml-2'],
          [1, 'd-flex', 'flex-column'],
          [1, 'st-fileName'],
          [1, 'st-fileSize', 'ml-2'],
          ['target', '_blank', 3, 'href', 'type', 'download'],
          [1, 'd-flex', 'justify-content-center', 'align-items-center', 'flex-wrap'],
          [1, 'fileDowload', 3, 'href', 'type', 'download'],
          [
            'title',
            'Download File',
            'target',
            '_blank',
            1,
            'btn',
            'st-fileDownload',
            3,
            'href',
            'type',
            'download'
          ],
          ['type', 'button', 'title', 'Delete File', 1, 'btn', 'ml-2', 'st-fileDelete'],
          ['type', 'button', 'title', 'Play', 1, 'btn', 'ml-2', 'st-fileDownload', 'btn-success'],
          ['type', 'button', 'title', 'Play For All', 1, 'btn', 'ml-2', 'st-fileDelete'],
          [
            'type',
            'button',
            'title',
            'Overwrite Cash Register Sound',
            1,
            'btn',
            'ml-2',
            'btn-info',
            'set-alert-sound-btn'
          ],
          [
            'pe',
            'button',
            'title',
            'Remove Overwrited Cash Register Sound',
            1,
            'btn',
            'ml-2',
            'btn-info',
            'set-alert-sound-btn'
          ],
          ['type', 'checkbox', 3, 'value'],
          ['alt', 'Image', 1, 'fileDriveImg', 2, 'background-color', '#000', 3, 'src'],
          ['type', 'button', 'title', 'Delete File', 1, 'btn', 'ml-2', 'st-fileDelete', 3, 'click'],
          [
            'type',
            'button',
            'title',
            'Play',
            1,
            'btn',
            'ml-2',
            'st-fileDownload',
            'btn-success',
            3,
            'click'
          ],
          [
            'type',
            'button',
            'title',
            'Play For All',
            1,
            'btn',
            'ml-2',
            'st-fileDelete',
            3,
            'click'
          ],
          [
            'type',
            'button',
            'title',
            'Overwrite Cash Register Sound',
            1,
            'btn',
            'ml-2',
            'btn-info',
            'set-alert-sound-btn',
            3,
            'click'
          ],
          [1, 'fa', 'fa-bell', 'mr-2'],
          [
            'pe',
            'button',
            'title',
            'Remove Overwrited Cash Register Sound',
            1,
            'btn',
            'ml-2',
            'btn-info',
            'set-alert-sound-btn',
            3,
            'click'
          ],
          [1, 'speech-reco-overlay'],
          [1, 'speech-reco-body'],
          [1, 'speech-reco-text-wrapper'],
          [1, 'speech-reco-buttons'],
          [
            'type',
            'button',
            'title',
            'Full Transcript History',
            'aria-label',
            'Full Transcript History',
            1,
            'speech-reco-history-btn'
          ],
          [
            'type',
            'button',
            'title',
            'Speech Recognition History',
            'aria-label',
            'Speech Recognition History',
            1,
            'speech-reco-history-btn'
          ],
          [
            'type',
            'button',
            'title',
            'Close Speech Recognition Overlay',
            'aria-label',
            'Close',
            1,
            'speech-reco-close-btn',
            3,
            'click'
          ],
          [1, 'speech-reco-text-wrapper', 3, 'scroll'],
          [1, 'speech-reco-line'],
          [1, 'd-flex', 'align-items-center', 'position-sticky', 'top-0'],
          [1, 'fas', 'fa-closed-captioning', 'speech-reco-icon', 'me-1'],
          [1, 'speech-reco-sender'],
          [1, 'speech-reco-text'],
          [1, 'speech-reco-history', 3, 'scroll'],
          [1, 'speech-reco-history-line'],
          [1, 'speech-reco-history-line', 'live-entry'],
          [1, 'speech-reco-history-time'],
          [1, 'speech-reco-history-text'],
          [1, 'speech-reco-history-sender'],
          [
            'type',
            'button',
            'title',
            'Full Transcript History',
            'aria-label',
            'Full Transcript History',
            1,
            'speech-reco-history-btn',
            3,
            'click'
          ],
          [
            'type',
            'button',
            'title',
            'Speech Recognition History',
            'aria-label',
            'Speech Recognition History',
            1,
            'speech-reco-history-btn',
            3,
            'click'
          ],
          [1, 'fas', 'fa-history']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 2)(1, 'ul', 3)(2, 'li', 4),
            x('click', function () {
              return o.onMainTabChange('presAreaTabs-screens');
            }),
            d(3, 'a', 5)(4, 'div', 6)(5, 'div'),
            T(6, 'i', 7),
            d(7, 'span', 8),
            v(8, 'Screens'),
            u()()()()(),
            d(9, 'li', 4),
            x('click', function () {
              return o.onMainTabChange('presAreaTabs-streams');
            }),
            d(10, 'a', 9)(11, 'div', 6)(12, 'div'),
            T(13, 'i', 10),
            d(14, 'span', 8),
            v(15, 'Streams'),
            u()()()()(),
            d(16, 'li', 4),
            x('click', function () {
              return o.onMainTabChange('presAreaTabs-notes');
            }),
            d(17, 'a', 11)(18, 'div', 12)(19, 'div'),
            T(20, 'i', 13),
            d(21, 'span', 14),
            v(22, 'Notes'),
            u()(),
            H(23, KCe, 8, 0, 'div', 15),
            u()()(),
            H(24, YCe, 7, 3, 'li', 16)(25, QCe, 7, 3, 'li', 16)(26, XCe, 7, 3, 'li', 16)(
              27,
              JCe,
              7,
              3,
              'li',
              16
            ),
            d(28, 'li', 4),
            x('click', function () {
              return o.onMainTabChange('presAreaTabs-files');
            }),
            d(29, 'a', 17)(30, 'div', 12)(31, 'div'),
            T(32, 'i', 18),
            d(33, 'span', 14),
            v(34, 'Files'),
            u()(),
            H(35, ZCe, 8, 0, 'div'),
            u()()()(),
            d(36, 'div', 19)(37, 'div', 20),
            H(38, eSe, 3, 4, 'div', 21)(39, DSe, 2, 1),
            u(),
            d(40, 'div', 22),
            H(41, ESe, 2, 0, 'h3', 23)(42, NSe, 7, 1),
            u(),
            d(43, 'div', 24),
            H(44, LSe, 5, 0, 'div')(45, zSe, 6, 0),
            u(),
            H(46, GSe, 3, 7, 'div', 25)(47, owe, 3, 4, 'div', 26)(48, vwe, 11, 7, 'div', 27)(
              49,
              Iwe,
              11,
              7,
              'div',
              28
            ),
            d(50, 'div', 29)(51, 'ul', 30)(52, 'li', 31),
            x('click', function () {
              return o.onFileTabChange('files');
            }),
            d(53, 'a', 32)(54, 'span'),
            v(55, 'Files'),
            u(),
            d(56, 'span', 33),
            v(57),
            u()()(),
            d(58, 'li', 31),
            x('click', function () {
              return o.onFileTabChange('images');
            }),
            d(59, 'a', 34)(60, 'span'),
            v(61, 'Images'),
            u(),
            d(62, 'span', 33),
            v(63),
            u()()(),
            d(64, 'li', 31),
            x('click', function () {
              return o.onFileTabChange('sounds');
            }),
            d(65, 'a', 35)(66, 'span'),
            v(67, 'Sounds'),
            u(),
            d(68, 'span', 33),
            v(69),
            u()()()(),
            d(70, 'div', 36)(71, 'div', 37)(72, 'div', 38)(73, 'input', 39),
            Ve('ngModelChange', function (r) {
              return (He(o.filesSearch, r) || (o.filesSearch = r), r);
            }),
            u(),
            d(74, 'span', 40),
            T(75, 'i', 41),
            u()()(),
            d(76, 'div', 42),
            H(77, Owe, 3, 0, 'button', 43),
            d(78, 'button', 44),
            x('click', function () {
              return o.getSessionFiles();
            }),
            v(79, ' Refresh'),
            T(80, 'i', 45),
            u(),
            H(81, Nwe, 3, 0, 'button', 46),
            u(),
            d(82, 'div'),
            H(83, Lwe, 3, 0, 'button', 47),
            u()(),
            H(84, Bwe, 2, 0, 'h4', 48)(85, t2e, 17, 17),
            u()(),
            H(86, n2e, 1, 2, 'app-ytplayer', 49)(87, i2e, 1, 1, 'app-scplayer', 50),
            T(88, 'audio', 51),
            H(89, u2e, 9, 7, 'div', 52),
            u()),
            2 & i &&
              (m(),
              z('hidden', o.appService.globals.viewerOnlyMode),
              m(),
              z('hidden', o.hideScreens),
              m(),
              z('ngClass', ct(46, mo, 'presAreaTabs-screens' == o.selectedMainTab)),
              m(6),
              z('hidden', o.hideStreams),
              m(),
              z('ngClass', ct(48, mo, 'presAreaTabs-streams' == o.selectedMainTab)),
              m(6),
              z('hidden', o.hideNotes),
              m(),
              z('ngClass', ct(50, mo, 'presAreaTabs-notes' == o.selectedMainTab)),
              m(6),
              O(23, o.isP || o.appService.globals.user.canEditNotes ? 23 : -1),
              m(),
              O(24, o.archivesAvailableTo() && o.appService.globals.sessData.recsInRoom ? 24 : -1),
              m(),
              O(25, (o.hideVideoPlayer && !o.isP) || o.isP ? 25 : -1),
              m(),
              O(26, o.hasSwingTradeAlerts ? 26 : -1),
              m(),
              O(27, o.hasDayTradeAlerts ? 27 : -1),
              m(),
              z('hidden', o.hideFiles),
              m(),
              z('ngClass', ct(52, mo, 'presAreaTabs-files' == o.selectedMainTab)),
              m(6),
              O(35, o.isP ? 35 : -1),
              m(2),
              z(
                'ngClass',
                Kn(54, jCe, 'presAreaTabs-screens' == o.selectedMainTab, o.isFullScreenshare)
              )('hidden', o.hideScreens),
              m(),
              O(38, o.appService.globals.sessData.customPlayerURL ? 38 : 39),
              m(2),
              z('ngClass', ct(57, Hr, 'presAreaTabs-streams' == o.selectedMainTab))(
                'hidden',
                o.hideStreams
              ),
              m(),
              O(41, o.appService.globals.preferences.disableVideo ? 41 : 42),
              m(2),
              z('ngClass', ct(59, Hr, 'presAreaTabs-notes' == o.selectedMainTab))(
                'hidden',
                o.hideNotes
              ),
              m(),
              O(44, o.appService.globals.sessionNotes ? 45 : 44),
              m(2),
              O(46, o.archivesAvailableTo() && o.appService.globals.sessData.recsInRoom ? 46 : -1),
              m(),
              O(47, (o.hideVideoPlayer && !o.isP) || o.isP ? 47 : -1),
              m(),
              O(48, o.hasSwingTradeAlerts ? 48 : -1),
              m(),
              O(49, o.hasDayTradeAlerts ? 49 : -1),
              m(),
              z('ngClass', ct(61, Hr, 'presAreaTabs-files' == o.selectedMainTab))(
                'hidden',
                o.hideFiles
              ),
              m(3),
              z('ngClass', ct(63, mo, 'files' === o.selectedFileTab)),
              m(4),
              Ze(o.filesTotal),
              m(2),
              z('ngClass', ct(65, mo, 'images' === o.selectedFileTab)),
              m(4),
              Ze(o.imagesTotal),
              m(2),
              z('ngClass', ct(67, mo, 'sounds' === o.selectedFileTab)),
              m(4),
              Ze(o.soundsTotal),
              m(4),
              je('ngModel', o.filesSearch),
              m(4),
              O(77, o.isP ? 77 : -1),
              m(4),
              O(81, o.isP ? 81 : -1),
              m(2),
              O(83, o.isP && o.mp3Playing ? 83 : -1),
              m(),
              O(84, o.sessionFiles ? -1 : 84),
              m(),
              O(85, o.sessionFiles && o.sessionFiles.length > 0 ? 85 : -1),
              m(),
              O(86, o.ytURL ? 86 : -1),
              m(),
              O(87, o.scUrl && o.scPlaying ? 87 : -1),
              m(),
              z('src', o.mp3Url, Mt),
              m(),
              O(
                89,
                o.hasSpeechRecognitionEntries() &&
                  o.showSpeechRecognition &&
                  o.appService.globals.hasSpeechRecognition
                  ? 89
                  : -1
              )));
        },
        dependencies: [
          Di,
          qs,
          Vl,
          Hl,
          ai,
          Dd,
          Zg,
          jl,
          Jg,
          ti,
          Ws,
          fp,
          GF,
          t1,
          Yn,
          as,
          ha,
          U0e,
          u6,
          J0e,
          ebe,
          xCe,
          os,
          Rr,
          MCe,
          ACe,
          PCe,
          RCe,
          ICe,
          OCe
        ],
        styles: [
          '.mainPresentationAreaHolder[_ngcontent-%COMP%]{display:block;width:100%;height:100%;position:relative}#screens[_ngcontent-%COMP%], #screens[_ngcontent-%COMP%]   .tab-pane.active[_ngcontent-%COMP%], #streams[_ngcontent-%COMP%], #streams[_ngcontent-%COMP%]   .tab-pane.active[_ngcontent-%COMP%], #mainTabsContent[_ngcontent-%COMP%], #notes[_ngcontent-%COMP%], #notesTabsContent[_ngcontent-%COMP%]{height:100%}#notesTabsContent[_ngcontent-%COMP%]   .tab-pane.active[_ngcontent-%COMP%]{height:100%;display:flex;flex-direction:column}#notesTabsContent[_ngcontent-%COMP%]   .note-container[_ngcontent-%COMP%]{flex:1;min-height:0;overflow:auto}#files[_ngcontent-%COMP%]{overflow:auto;height:calc(100% - 40px)}#streamsTabsContent[_ngcontent-%COMP%], #screensTabsContent[_ngcontent-%COMP%]{height:calc(100% - 82px)}.h-inherit[_ngcontent-%COMP%]{height:inherit}.zoom-controls-container[_ngcontent-%COMP%]{background-color:transparent;z-index:10;opacity:.5;margin-top:4px}.zoom-controls[_ngcontent-%COMP%]{top:-33px;left:-33px}.noteEditBtn[_ngcontent-%COMP%]{position:relative;top:10px;right:10px}.fileDriveImg[_ngcontent-%COMP%]{max-width:200px}.fileCount[_ngcontent-%COMP%]{font-size:18px}.screen-options[_ngcontent-%COMP%]{background-color:var(--white);font-size:16px;color:var(--darker-black);width:300px;padding:5px}.soundcloud-options[_ngcontent-%COMP%], .screen-options-start-screen[_ngcontent-%COMP%]{background-color:var(--white);font-size:16px;width:300px;color:var(--darker-black);padding:5px}.screen-options[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{text-decoration:none}.screen-options[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]:hover{color:var(--brown);background-color:var(--lighter-gray)}.files-badge[_ngcontent-%COMP%]{margin-top:-9px;margin-left:3px}.screen-presenters[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]{font-size:14px}.screen-presenters[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]{padding-top:4px;padding-bottom:4px}.screen-presenters[_ngcontent-%COMP%]   i[_ngcontent-%COMP%]{vertical-align:middle;padding-right:5px}.screen-presenters-cmb[_ngcontent-%COMP%]{color:#fff!important;background-color:#363f45;border-color:#363f45;border-radius:3px}.presenter-img[_ngcontent-%COMP%]{max-width:20px}.hidden[_ngcontent-%COMP%]{display:none}.fileDownload[_ngcontent-%COMP%]{width:120px}.fileName[_ngcontent-%COMP%]{word-break:break-all}.set-alert-sound-btn[_ngcontent-%COMP%]{font-size:12px}.volumeControl[_ngcontent-%COMP%]{text-align:center;color:var(--light-gray);background-color:var(--darker-black);border:1px solid #fafafa}.volCtrl[_ngcontent-%COMP%]{background-color:var(--darker-black);height:32px;width:129px}.volumeControl[_ngcontent-%COMP%]   input[type=range][_ngcontent-%COMP%]::-moz-range-progress{background-color:#0d6efd;border-color:#0d6efd;height:8px;border-radius:3px}.volumeControl[_ngcontent-%COMP%]   input[type=range][_ngcontent-%COMP%]::-moz-range-thumb{background-color:#0d6efd;border-color:#0d6efd;height:13px;width:13px}#dropdownVolume[_ngcontent-%COMP%]{width:31px}#dropdownVolume[_ngcontent-%COMP%]:after{display:none}.room-sound-options[_ngcontent-%COMP%]{text-align:left;padding-left:30px}.video-player-delete-btn[_ngcontent-%COMP%]:hover, .room-sound-options[_ngcontent-%COMP%]   .form-check-label[_ngcontent-%COMP%]:hover{opacity:.85;cursor:pointer}.room-video-player[_ngcontent-%COMP%]{width:100%;height:100%;object-fit:contain;vertical-align:top;max-height:calc(100vh - 140px)}.video-player-btns[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]{width:100px;padding:2px 4px;font-size:12px}#dayTradeAlerts[_ngcontent-%COMP%], #swingAlerts[_ngcontent-%COMP%]{overflow-y:auto;height:calc(100% - 40px)}.day-trade-alert-txt[_ngcontent-%COMP%], .swing-alert-txt[_ngcontent-%COMP%]{padding-left:5%}.download-day-trades-btn[_ngcontent-%COMP%], .download-swing-trades-btn[_ngcontent-%COMP%]{font-size:18px;background-color:#08668e;padding:3px 11px;color:#fff;border-radius:6px;line-height:24px}.download-day-trades-btn[_ngcontent-%COMP%]:hover, .day-trade-alert-btn-delete[_ngcontent-%COMP%]:hover, .day-trade-alert-btn-edit[_ngcontent-%COMP%]:hover, .download-swing-trades-btn[_ngcontent-%COMP%]:hover, .swing-alert-btn-delete[_ngcontent-%COMP%]:hover, .swing-alert-btn-edit[_ngcontent-%COMP%]:hover{opacity:.75;cursor:pointer}.day-trade-symbol-container[_ngcontent-%COMP%], .swing-symbol-container[_ngcontent-%COMP%]{width:100%;max-width:150px;text-align:left;display:block;margin:0 auto 0 24%}.day-trade-alert-form[_ngcontent-%COMP%], .swing-alert-form[_ngcontent-%COMP%]{font-size:12px;max-width:600px}.day-trade-alert-form[_ngcontent-%COMP%]   .input-group-text[_ngcontent-%COMP%], .swing-alert-form[_ngcontent-%COMP%]   .input-group-text[_ngcontent-%COMP%]{width:105px;font-size:12px}.day-trade-alert-form[_ngcontent-%COMP%]   .form-control[_ngcontent-%COMP%], .swing-alert-form[_ngcontent-%COMP%]   .form-control[_ngcontent-%COMP%]{font-size:12px}.day-trade-alert-form[_ngcontent-%COMP%]   #dayTradeAlert-long[_ngcontent-%COMP%], .day-trade-alert-form[_ngcontent-%COMP%]   #dayTradeAlert-short[_ngcontent-%COMP%], .day-trade-alert-form[_ngcontent-%COMP%]   #swingAlert-long[_ngcontent-%COMP%], .day-trade-alert-form[_ngcontent-%COMP%]   #swingAlert-short[_ngcontent-%COMP%], .swing-alert-form[_ngcontent-%COMP%]   #dayTradeAlert-long[_ngcontent-%COMP%], .swing-alert-form[_ngcontent-%COMP%]   #dayTradeAlert-short[_ngcontent-%COMP%], .swing-alert-form[_ngcontent-%COMP%]   #swingAlert-long[_ngcontent-%COMP%], .swing-alert-form[_ngcontent-%COMP%]   #swingAlert-short[_ngcontent-%COMP%]{margin-top:3px}.day-trade-alerts-container[_ngcontent-%COMP%]   .table[_ngcontent-%COMP%], .swing-alerts-container[_ngcontent-%COMP%]   .table[_ngcontent-%COMP%]{font-size:12px}.day-trade-alerts-container[_ngcontent-%COMP%]   .table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%], .day-trade-alerts-container[_ngcontent-%COMP%]   .table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%], .swing-alerts-container[_ngcontent-%COMP%]   .table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%], .swing-alerts-container[_ngcontent-%COMP%]   .table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%]{text-align:center;vertical-align:middle}.day-trade-alerts-container[_ngcontent-%COMP%]   h4[_ngcontent-%COMP%], .swing-alerts-container[_ngcontent-%COMP%]   h4[_ngcontent-%COMP%]{background-color:#08668e;color:#fff}.day-trade-alerts-container[_ngcontent-%COMP%]   #dayTradeAlert-search[_ngcontent-%COMP%], .day-trade-alerts-container[_ngcontent-%COMP%]   #swingAlert-search[_ngcontent-%COMP%], .day-trade-alerts-container[_ngcontent-%COMP%]   .swingAlert-limit-container[_ngcontent-%COMP%], .swing-alerts-container[_ngcontent-%COMP%]   #dayTradeAlert-search[_ngcontent-%COMP%], .swing-alerts-container[_ngcontent-%COMP%]   #swingAlert-search[_ngcontent-%COMP%], .swing-alerts-container[_ngcontent-%COMP%]   .swingAlert-limit-container[_ngcontent-%COMP%]{width:100%}.day-trade-alerts-container[_ngcontent-%COMP%]   #dayTradeAlert-search[_ngcontent-%COMP%], .day-trade-alerts-container[_ngcontent-%COMP%]   #swingAlert-search[_ngcontent-%COMP%], .swing-alerts-container[_ngcontent-%COMP%]   #dayTradeAlert-search[_ngcontent-%COMP%], .swing-alerts-container[_ngcontent-%COMP%]   #swingAlert-search[_ngcontent-%COMP%]{max-width:300px}.day-trade-alerts-container[_ngcontent-%COMP%]   .dayTradeAlert-limit-container[_ngcontent-%COMP%], .day-trade-alerts-container[_ngcontent-%COMP%]   .swingAlert-limit-container[_ngcontent-%COMP%], .swing-alerts-container[_ngcontent-%COMP%]   .dayTradeAlert-limit-container[_ngcontent-%COMP%], .swing-alerts-container[_ngcontent-%COMP%]   .swingAlert-limit-container[_ngcontent-%COMP%]{max-width:180px}.videoPlayerUrl-iframe[_ngcontent-%COMP%]{width:100%;height:90%}.alert-sender-img[_ngcontent-%COMP%], .uploaded-alert-image[_ngcontent-%COMP%], .uploaded-img-preview[_ngcontent-%COMP%]{width:auto;height:100%;max-height:30px;object-fit:contain}.remove-image-btn[_ngcontent-%COMP%]{width:36px!important}.uploaded-alert-image[_ngcontent-%COMP%]:hover, .form-check-label[_ngcontent-%COMP%]:hover, #dayTradeAlert-long[_ngcontent-%COMP%]:hover, #dayTradeAlert-short[_ngcontent-%COMP%]:hover, #swingAlert-long[_ngcontent-%COMP%]:hover, #swingAlert-short[_ngcontent-%COMP%]:hover, .uploaded-img-preview[_ngcontent-%COMP%]:hover, .img-upload-btn[_ngcontent-%COMP%]:hover, .remove-image-btn[_ngcontent-%COMP%]:hover{cursor:pointer}.img-fluid[_ngcontent-%COMP%]{max-width:100%;max-height:70vh;display:block;margin:0 auto}@media only screen and (max-width: 900px){.files-options[_ngcontent-%COMP%]   button[_ngcontent-%COMP%], .files-search[_ngcontent-%COMP%]   .form-control[_ngcontent-%COMP%], .fileName[_ngcontent-%COMP%], .fileDownload[_ngcontent-%COMP%], .fileActions[_ngcontent-%COMP%]{font-size:12px}.fileCount[_ngcontent-%COMP%]{height:32px;line-height:23px}}@media only screen and (max-width: 400px){.files-options[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]{padding:5px}.soundcloud-options[_ngcontent-%COMP%], .screen-options-start-screen[_ngcontent-%COMP%]{width:300px!important}}.speech-reco-overlay[_ngcontent-%COMP%]{position:absolute;bottom:0;left:0;right:0;background-color:#000c;padding:12px 20px;z-index:9999;max-height:40vh;overflow-y:auto;display:flex;flex-direction:row;align-items:center;justify-content:space-between;min-height:48px;gap:12px;pointer-events:auto}.speech-reco-overlay[_ngcontent-%COMP%]:hover   .speech-reco-close-btn[_ngcontent-%COMP%], .speech-reco-overlay[_ngcontent-%COMP%]:hover   .speech-reco-history-btn[_ngcontent-%COMP%]{opacity:1}.speech-reco-overlay.history-mode[_ngcontent-%COMP%]{flex-direction:column;align-items:stretch;max-height:60vh;padding:16px 24px;gap:16px}.speech-reco-overlay.single-line[_ngcontent-%COMP%]{max-height:none}.speech-reco-body[_ngcontent-%COMP%]{flex:1;display:flex;align-items:center;justify-content:flex-start;min-width:0;overflow:visible}.speech-reco-overlay.history-mode[_ngcontent-%COMP%]   .speech-reco-body[_ngcontent-%COMP%]{flex-direction:column;align-items:stretch;gap:12px}.speech-reco-overlay.history-mode[_ngcontent-%COMP%]   .speech-reco-buttons[_ngcontent-%COMP%]{align-self:flex-end;order:-1}.speech-reco-history[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:8px;overflow-y:auto;overflow-x:hidden;padding-right:8px;max-height:60vh}.speech-reco-history[_ngcontent-%COMP%]::-webkit-scrollbar{width:8px}.speech-reco-history[_ngcontent-%COMP%]::-webkit-scrollbar-track{background:#ffffff1a;border-radius:4px}.speech-reco-history[_ngcontent-%COMP%]::-webkit-scrollbar-thumb{background:#ffffff4d;border-radius:4px}.speech-reco-history[_ngcontent-%COMP%]::-webkit-scrollbar-thumb:hover{background:#ffffff80}.speech-reco-history-line[_ngcontent-%COMP%]{display:flex;gap:12px;align-items:baseline;color:#fff;font-size:16px;line-height:1.2}.speech-reco-history-time[_ngcontent-%COMP%]{font-size:14px;opacity:.7;flex:0 0 auto;width:60px}.speech-reco-history-text[_ngcontent-%COMP%]{flex:1 1 auto;word-break:break-word}.speech-reco-history-line.live-entry[_ngcontent-%COMP%]   .speech-reco-history-text[_ngcontent-%COMP%]{font-style:italic;opacity:.9}.speech-reco-history[_ngcontent-%COMP%], .speech-reco-line[_ngcontent-%COMP%], .speech-reco-history-text[_ngcontent-%COMP%], .speech-reco-line[_ngcontent-%COMP%]   .speech-reco-text[_ngcontent-%COMP%]{pointer-events:none}.speech-reco-buttons[_ngcontent-%COMP%]{display:none;gap:8px;pointer-events:auto;transition:display .2s ease}.speech-reco-buttons[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]{position:static;opacity:1}.speech-reco-overlay[_ngcontent-%COMP%]:hover   .speech-reco-buttons[_ngcontent-%COMP%]{display:flex}.speech-reco-close-btn[_ngcontent-%COMP%], .speech-reco-history-btn[_ngcontent-%COMP%]{background:transparent;border:2px solid #ffffff;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:10000;transition:opacity .2s ease,transform .2s ease;font-size:14px;padding:0}.speech-reco-text-wrapper[_ngcontent-%COMP%]{flex:1;min-width:0;overflow-y:auto;overflow-x:hidden;max-height:3.5em;padding-right:8px}.speech-reco-text-wrapper[_ngcontent-%COMP%]::-webkit-scrollbar{width:8px}.speech-reco-text-wrapper[_ngcontent-%COMP%]::-webkit-scrollbar-track{background:#ffffff1a;border-radius:4px}.speech-reco-text-wrapper[_ngcontent-%COMP%]::-webkit-scrollbar-thumb{background:#ffffff4d;border-radius:4px}.speech-reco-text-wrapper[_ngcontent-%COMP%]::-webkit-scrollbar-thumb:hover{background:#ffffff80}.speech-reco-line[_ngcontent-%COMP%]{color:#fff;font-size:22px;font-weight:400;line-height:1.4;word-wrap:break-word;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif;display:flex;align-items:flex-start;gap:12px}.speech-reco-icon[_ngcontent-%COMP%]{font-size:18px;opacity:.8;flex-shrink:0}.speech-reco-sender[_ngcontent-%COMP%]{font-weight:600;margin-right:8px}.speech-reco-text[_ngcontent-%COMP%]{font-weight:400}.trade-alerts-select[_ngcontent-%COMP%]{font-size:12px;vertical-align:bottom}@media only screen and (max-width: 1200px){.speech-reco-line[_ngcontent-%COMP%]{font-size:20px}.speech-reco-icon[_ngcontent-%COMP%]{font-size:18px}}@media only screen and (max-width: 768px){.speech-reco-overlay[_ngcontent-%COMP%]{padding:12px 16px}.speech-reco-line[_ngcontent-%COMP%]{font-size:16px}.speech-reco-icon[_ngcontent-%COMP%]{font-size:14px}}@media only screen and (max-width: 480px){.speech-reco-overlay[_ngcontent-%COMP%]{padding:12px;max-height:30vh}.speech-reco-line[_ngcontent-%COMP%]{font-size:14px;margin-bottom:8px;gap:8px}.speech-reco-icon[_ngcontent-%COMP%]{font-size:12px}}'
        ]
      });
    }
  }
  return t;
})();
