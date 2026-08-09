Q4e = (() => {
  class t {
    constructor(e, i, o, s, r, a, l, c) {
      ((this.appService = e),
        (this.mediaService = i),
        (this.mediaSoupService = o),
        (this.mtxService = s),
        (this.alertsService = r),
        (this.soundEffectsService = a),
        (this.resolver = l),
        (this.sanitizer = c),
        (this.showSidebar = !1),
        (this.hideCount = !1),
        (this.isTipEnabled = !1),
        (this.micDisabled = !1),
        (this.videoPlayerOn = !1),
        (this.audioOutputOn = !0),
        (this.audioVolume = 100),
        (this.prevVolume = 100),
        (this.audioBgVolume = 70),
        (this.hideChatAlerts = !0),
        (this.hidePresentation = !1),
        (this.presAreaSize = 70),
        (this.chatAlertsSize = 30),
        (this.chatSize = 70),
        (this.alertSize = 30),
        (this.chatAlertsSizeMobile = 50),
        (this.presAreaSizeMobile = 50),
        (this.presAreaSizeBottom = 50),
        (this.chatAlertsSizeBottom = 50),
        (this.chatSizeBottom = 70),
        (this.alertSizeBottom = 30),
        (this.isMobileScreen = !1),
        (this.isChatAlertsOnBottom = !1),
        (this.showUserSearch = !1),
        (this.userSearchTermTxt = ''),
        (this.webcams = {}),
        (this.webcamsIdxs = []),
        (this.showWebcams = !0),
        (this.hasSTHelpLink = !1),
        (this.scPlaying = !1),
        (this.mp3Playing = !1),
        (this.isSortUsers = !1),
        (this.isSortFTUsers = !1),
        (this.simUserCount = 0),
        (this.isRecordingStarting = !1),
        (this.alwaysShowRoster = !1),
        (this.recordingReminder = !1),
        (this.roomV4Link = ''),
        (this.visibilityChangeTimer = null),
        (this.alwaysShowRosterTimer = null),
        (this.onResizeTimer = null),
        (this.onResizeChange = !1),
        (this.modMessage = ''),
        (this.tawkWidgetOpen = !1),
        (this.reopenAlertsChatBtn = !1),
        (this.extraChatColumnWasEnabled = !1),
        (this.privChatVisible = !0),
        (this.privChatInited = !1),
        (this.webcamCount = 0));
    }
    ngOnInit() {
      ((this.tawkWidgetOpen = !1),
        (this.isMobileScreen = this.onResizeChange = window.innerWidth <= 601),
        this.manageRoomLayout());
      const e = this.appService.globals.sessData.simUserCount;
      var i;
      ((this.hideChatAlerts = this.appService.globals.sessData.hideChatAlerts),
        this.appService.globals.isPlayer &&
          this.appService.globals.isPresenter &&
          (this.hideChatAlerts = !0),
        (this.modMessage = this.appService.globals.sessData.modMessage),
        this.appService.globals.videoOnlyMode &&
          (this.hideChatAlerts =
            !this.appService.globals.sessData.recordChat && this.appService.globals.videoOnlyMode),
        this.appService.globals.viewerOnlyMode &&
          (this.hideChatAlerts = this.appService.globals.viewerOnlyMode),
        (this.appService.globals.chatOnlyMode || this.appService.globals.sessData.isChatOnlyRoom) &&
          ((this.hidePresentation = !0),
          window.addEventListener('beforeunload', () => {
            window.opener.postMessage('windowClosing', window.location.origin);
          })),
        this.appService.globals.sessData.alwaysShowRoster &&
          ((this.showSidebar = !0),
          (this.alwaysShowRoster = !0),
          setTimeout(() => {
            this.appService.loadRoster();
          }, 500)),
        e &&
          ((this.simUserCount = Number(e)),
          this.simUserCount > 5e3 && (this.simUserCount = 5e3),
          this.simUserCount <= 0 && (this.simUserCount = 0)),
        (this.benzingaUrl = this.sanitizer.bypassSecurityTrustUrl(
          `https://ptrv3.protradingroom.com/public/bz/index.html?sessID=${this.appService.globals.sessionID}&id=${this.appService.globals.sessData.uuid}&tok=${this.appService.globals.sesionToken}`
        )),
        '' != this.appService.globals.sessData.altBenzingaLinkURL &&
          (this.benzingaUrl = this.sanitizer.bypassSecurityTrustUrl(
            this.appService.globals.sessData.altBenzingaLinkURL
          )),
        (this.roomV4Link = window.location.href.replace('.com/', '.com/v3/')),
        un('.alert-chat-box')
          .mouseenter(function () {
            un('.mainTabset ul.nav-tabs').hide();
          })
          .mouseleave(function () {
            un('.mainTabset ul.nav-tabs').show();
          }),
        this.appService.globals.sessData.isLocked &&
          this.appService.globals.user.isPresenter &&
          bootbox.confirm({
            title: 'Session Locked',
            message:
              'Session is locked, no users are allowed in the room.<br><br>To unlock: Go to Session Control, then Lock Session tab, then click on Unlock Session.',
            buttons: {
              confirm: { label: 'Session Control', className: 'btn-primary' },
              cancel: { label: 'Close', className: 'btn-secondary' }
            },
            callback:
              ((i = I(function* (o) {
                o &&
                  (yield un('#session-control-modal').modal('show'),
                  yield un('#lock-session-tab').tab('show'));
              })),
              function (s) {
                return i.apply(this, arguments);
              })
          }),
        this.appService.guiEventBus.subscribe('manageRoomLayout', () => {
          this.manageRoomLayout();
        }),
        this.appService.appEventBus.subscribe('getRoster', (i) => {
          ((this.visibleRoster = this.appService.globals.roster), (this.userSearchTermTxt = ''));
        }),
        this.appService.guiEventBus.subscribe('editUsername', (i) => {
          this.appService.globals.user.id === i.userID &&
            ((this.appService.globals.user.name = i.newName),
            this.appService.setPreference('savedNick', i.newName),
            bootbox.alert('You name was changed by an administrator to ' + i.newName));
        }),
        this.appService.guiEventBus.subscribe('editUsernameByUser', (i) => {
          this.appService.globals.user.id === i.userID &&
            ((this.appService.globals.user.name = i.newName),
            this.appService.setPreference('savedNick', i.newName),
            bootbox.alert('You name was changed successfully to ' + i.newName));
        }),
        this.appService.guiEventBus.subscribe('updateUsername', (i) => {
          (this.showSidebar && this.appService.loadRoster(), P('roster re-loaded'));
        }),
        this.appService.appEventBus.subscribe('resetSession', () => {
          (this.appService.disconnectAll(),
            bootbox.alert(
              'The session is being reset, please click ok to proceed... You might need to relaunch the room from the main site...',
              () => {
                window.location.reload();
              }
            ));
        }),
        this.appService.appEventBus.subscribe('softResetDone', () => {
          ((this.appService.globals.roomState.isRecording = !1), (this.recordingReminder = !1));
        }),
        this.appService.appEventBus.subscribe('sendSalesImageToChat', (i) => {
          un('.chat-box').addClass('position-relative');
          const o = un(
            `<div id="added-image-to-chat">\n          <div class="text-right m-2">\n            <span class="p-2" onclick="removeImageFromChat()" title="Close">&times;</span>\n          </div>\n          <a href="${i.url}" target="_blank" title="Open link: ${i.url}"><img src="${i.url}"/></a>\n        </div>`
          );
          un('.chat-box').append(o);
        }),
        this.appService.appEventBus.subscribe('sendUsersToURL', (i) => {
          window.location.href = i.url;
        }),
        this.appService.appEventBus.subscribe('giveMicScreen', (i) => {
          i.give
            ? this.alertsService.success('You can now Talk / Screenshare')
            : this.alertsService.error('You can no longer Talk / Screenshare');
        }),
        this.appService.guiEventBus.subscribe('newWebcamPresenter', (i) => {
          (this.addPresenterdWebcam(i),
            setTimeout(() => {
              this.resetWebcamPositionsAlt();
            }, 100));
        }),
        this.appService.guiEventBus.subscribe('removeWebcamPresenter', (i) => {
          (P('room removeWebcamPresenter muser:', i), this.removePresenterWebcam(i));
        }),
        this.appService.appEventBus.subscribe('audioServerDisableMic', () => {
          ((this.micDisabled = !0),
            (this.recordingReminder = !1),
            bootbox.alert(
              'There is an issue with your microphone, make sure you allowed its use on the browser. Also, if this is a USB microphone, try to unplug it and plug it back in, then reload the page and it should work.'
            ));
        }),
        this.appService.appEventBus.subscribe('stopWebcam', (i) => {
          this.removePresenterWebcam(i);
        }),
        this.appService.appEventBus.subscribe('recStartedOK', () => {
          this.isRecordingStarting = !1;
        }),
        this.appService.appEventBus.subscribe('recStarting', () => {
          ((this.isRecordingStarting = !0),
            setTimeout(() => {
              this.isRecordingStarting = !1;
            }, 5e3));
        }),
        this.appService.appEventBus.subscribe('startRecLocal', (i) => {
          this.startRecFromMuser(i);
        }),
        this.appService.appEventBus.subscribe('stopRecLocal', (i) => {
          this.stopRecFromMuser(i);
        }),
        this.appService.appEventBus.subscribe('reconnectedSocket', () => {
          (un('#connectedMsg').show(),
            setTimeout(() => {
              un('#connectedMsg').hide();
            }, 3e3),
            this.appService.loadSessionLogs());
        }),
        this.appService.appEventBus.subscribe('webRTCServerDisconnected', (i) => {
          this.alertsService.error('Reconecting audio/video...');
        }),
        this.appService.appEventBus.subscribe('startRec', (i) => {
          ((this.appService.globals.roomState.isRecording = !0),
            !this.appService.globals.preferences.doNotDisturbOn &&
              this.appService.globals.preferences.recordingStartSound &&
              !this.appService.globals.videoOnlyMode &&
              this.soundEffectsService.recordingStart.play());
        }),
        this.appService.appEventBus.subscribe('stopRec', (i) => {
          ((this.appService.globals.roomState.isRecording = !1),
            !this.appService.globals.preferences.doNotDisturbOn &&
              this.appService.globals.preferences.recordingStopSound &&
              !this.appService.globals.videoOnlyMode &&
              this.soundEffectsService.recordingStop.play());
        }),
        this.appService.appEventBus.subscribe('pauseRec', () => {
          ((this.appService.globals.roomState.isRecordingPaused = !0),
            !this.appService.globals.preferences.doNotDisturbOn &&
              this.appService.globals.preferences.recordingStopSound &&
              this.soundEffectsService.recordingStop.play());
        }),
        this.appService.appEventBus.subscribe('resumeRec', () => {
          ((this.appService.globals.roomState.isRecordingPaused = !1),
            !this.appService.globals.preferences.doNotDisturbOn &&
              this.appService.globals.preferences.recordingStopSound &&
              this.soundEffectsService.recordingStart.play());
        }),
        this.appService.guiEventBus.subscribe('stopRecMsg', (i) => {
          (-1 != i.data.indexOf('Stopped')
            ? this.alertsService.error(i.data)
            : this.alertsService.info(i.data),
            new Notification(i.data, { body: i.data }));
        }),
        this.appService.guiEventBus.subscribe('speechReco', (i) => {
          i && (i.text ?? i.txt ?? '').trim();
        }),
        this.appService.guiEventBus.subscribe('startPrivChat', (i) => {
          i.user._id != this.appService.globals.user.id
            ? (this.privChatInited || ((this.privChatInited = !0), this.initPMDrag()),
              (this.privChatVisible = !0),
              this.appService.guiEventBus.emit('privChatVisible', this.privChatVisible),
              un('#privaChatCompHolder').show(),
              console.log('room startPrivChat data:', i),
              this.appService.guiEventBus.emit('PCfocusOnUser', {
                uid: i.uid,
                isInit: i.isInit,
                user: i.user
              }))
            : bootbox.alert('Chatting with yourself again?');
        }),
        this.appService.guiEventBus.subscribe('doChatLogSearchDelete', (i) => {
          bootbox.alert(`Deleted ${i.deletedCount} messages.`);
        }),
        this.appService.appEventBus.subscribe('privChatIn', (i) => {
          (console.log('room comp privChatIn:', i),
            this.appService.globals.preferences.doNotDisturbOn &&
            this.appService.globals.isPresenter
              ? this.appService.guiEventBus.emit('PCnewMessage', i)
              : (this.privChatInited || ((this.privChatInited = !0), this.initPMDrag()),
                this.privChatVisible ||
                  ((this.privChatVisible = !0),
                  un('#privaChatCompHolder').show(),
                  this.appService.globals.preferences.doNotDisturbOn ||
                    this.soundEffectsService.pling.play()),
                this.appService.guiEventBus.emit('PCnewMessage', i),
                this.appService.guiEventBus.emit('privChatVisible', this.privChatVisible)));
        }),
        this.appService.guiEventBus.subscribe('PCClosePanel', () => {
          (P('RoomComp PCClosePanel received...'),
            (this.privChatVisible = !1),
            this.appService.guiEventBus.emit('privChatVisible', this.privChatVisible),
            un('#privaChatCompHolder').hide());
        }),
        this.appService.appEventBus.subscribe('gotPoll', (i) => {
          (this.appService.globals.preferences.doNotDisturbOn ||
            this.soundEffectsService.fileShare.play(),
            this.appService.guiEventBus.emit('doPollModal', { mode: 'answer', data: i }));
        }),
        this.appService.guiEventBus.subscribe('playSoundCloudForAll', (i) => {
          this.scPlaying = !0;
        }),
        this.appService.guiEventBus.subscribe('stopSoundCloudForAll', (i) => {
          this.scPlaying = !1;
        }),
        this.appService.guiEventBus.subscribe('playMP3ForAll', (i) => {
          this.mp3Playing = !0;
        }),
        this.appService.guiEventBus.subscribe('stopMp3ForAll', () => {
          this.mp3Playing = !1;
        }),
        this.appService.appEventBus.subscribe('onUserJoin', (i) => {
          this.appService.globals.isPresenter &&
            this.appService.globals.user.userXrefID !== i.userXrefID &&
            (this.appService.globals.sessData.userJoinAndLeavePopup &&
              this.appService.globals.preferences.popupOnUserJoin &&
              this.alertsService.info(`${i.nick} logged in.`),
            this.appService.globals.sessData.beepOnUserJoin &&
              this.appService.globals.preferences.beepOnUserJoin &&
              !this.appService.globals.preferences.doNotDisturbOn &&
              this.soundEffectsService.userJoin.play());
        }),
        this.appService.appEventBus.subscribe('onUserLeave', (i) => {
          this.appService.globals.isPresenter &&
            this.appService.globals.user.userXrefID !== i.userXrefID &&
            (this.appService.globals.sessData.userJoinAndLeavePopup &&
              this.appService.globals.preferences.popupOnUserLeave &&
              this.alertsService.warning(`${i.nick} logged out.`),
            this.appService.globals.sessData.beepOnUserJoin &&
              this.appService.globals.preferences.beepOnUserLeave &&
              !this.appService.globals.preferences.doNotDisturbOn &&
              this.soundEffectsService.userLeave.play());
        }),
        this.appService.guiEventBus.subscribe('micMuted', (i) => {
          this.recordingReminder = !i;
        }),
        this.appService.guiEventBus.subscribe('appVisibilityChange', (i) => {
          this.appVisibilityChange(i);
        }),
        this.appService.guiEventBus.subscribe('streamPlayerEnded', () => {
          (P('streamPlayerEnded in room component. isPlayer: ', this.appService.globals.isPlayer),
            this.appService.globals.isPlayer &&
              bootbox.alert('The stream has ended. You can close this page now.'));
        }),
        this.appService.appEventBus.subscribe('updateChatMsgReaction', (i) => {
          this.appService.globals.preferences.reactionsPopup &&
            this.alertsService.info(
              `${i.n}: ${i.remove ? 'removed' : ''} ${i.emoji} on "${i.txt}"`,
              'Message Reaction',
              { enableHtml: !0 }
            );
        }),
        (this.isTipEnabled =
          this.appService.globals.sessData.tipMeBtnEnabled &&
          this.appService.globals.sessData.tipMeBtnUrl &&
          this.appService.globals.sessData.tipMeBtnTxt),
        this.appService.appEventBus.subscribe('detachChat', () => {
          ((this.hideChatAlerts = !0), (this.reopenAlertsChatBtn = !0));
        }),
        this.appService.appEventBus.subscribe('reatachChat', () => {
          this.reopenAlertsChat();
        }),
        this.appService.guiEventBus.subscribe('hideChat', (i) => {
          if (i)
            ((this.chatSize = 0),
              (this.alertSize = 100),
              this.appService.globals.preferences.extraChatColumn &&
                ((this.appService.globals.preferences.extraChatColumn = !1),
                (this.extraChatColumnWasEnabled = !0)));
          else if (
            (this.extraChatColumnWasEnabled &&
              ((this.appService.globals.preferences.extraChatColumn = !0),
              (this.extraChatColumnWasEnabled = !1),
              this.appService.sendServerCommand('getChatLog', {
                channel: 'offTopic',
                page: 0,
                extraChat: !0
              })),
            'ltr' === this.appService.globals.preferences.roomSplitDir ||
              'rtl' === this.appService.globals.preferences.roomSplitDir)
          ) {
            const o = window.localStorage.getItem('chatAlertSizes');
            if (o) {
              const s = JSON.parse(o);
              ((this.alertSize = s[0]), (this.chatSize = s[1]));
            }
            console.log('showChat called: ', this.chatSize);
          } else {
            const o = window.localStorage.getItem('chatAlertSizes-bottom');
            if (o) {
              const s = JSON.parse(o);
              ((this.alertSize = s[0]), (this.chatSize = s[1]));
            } else ((this.alertSize = this.alertSizeBottom), (this.chatSize = this.chatSizeBottom));
            console.log('bottom showChat called: ', this.chatSizeBottom);
          }
        }),
        this.appService.appEventBus.subscribe('muteAllNonAdmins', () => {
          this.muteAllNonAdmins();
        }));
    }
    ngAfterViewInit() {
      (this.appService.globals.sessData.tawkPresenterSupport &&
        (this.loadTawkSupport(), this.setTAWKAttributes()),
        this.appService.globals.preferences.visibilityChangeEnabled && this.appVisibilityChange(!0),
        !this.appService.globals.isPresenter &&
          this.appService.globals.sessData.disableCopy &&
          document.body.classList.add('noselect'),
        this.appService.getNewFeatures());
    }
    toggleTAWKSupport() {
      (window.Tawk_API.toggleVisibility(),
        this.tawkWidgetOpen ||
          (window.Tawk_API.setAttributes(
            {
              name:
                this.appService.globals.preferences.savedNick ||
                this.appService.globals.user.nick ||
                this.appService.globals.user.name ||
                '',
              email:
                this.appService.globals.preferences.savedEmail ||
                this.appService.globals.user.email ||
                ''
            },
            (e) => {
              e && console.error('Error setting Tawk.to attributes:', e);
            }
          ),
          (this.tawkWidgetOpen = !0)));
    }
    appVisibilityChange(e) {
      (console.log('appVisibilityChange enabled: ', e),
        e
          ? (this.visibilityChangeTimer = setTimeout(() => {
              document.addEventListener('visibilitychange', () => {
                (console.log('document.hidden: ', document.hidden),
                  document.hidden
                    ? ((this.appService.globals.appHasFocus = !1), this.appService.unloadRoster())
                    : ((this.appService.globals.appHasFocus = !0),
                      clearInterval(this.visibilityChangeTimer),
                      (this.visibilityChangeTimer = null),
                      this.showSidebar && this.appService.loadRoster(),
                      this.appService.guiEventBus.emit('appHasFocusGetChatLog'),
                      this.appService.globals.preferences.extraChatColumn &&
                        this.appService.guiEventBus.emit('appHasFocusGetChatLogExtraChatColumn')));
              });
            }, 1e4))
          : document.removeEventListener('visibilitychange', () => {
              console.log('visibilitychange removed');
            }));
    }
    loadTawkSupport() {
      if (this.appService.globals.isPresenter) {
        var e = document.createElement('script'),
          i = document.getElementsByTagName('script')[0];
        ((e.async = !0),
          (e.src = 'https://embed.tawk.to/5aecb59f227d3d7edc24f7c2/default'),
          (e.charset = 'UTF-8'),
          e.setAttribute('crossorigin', '*'),
          i.parentNode.insertBefore(e, i));
      }
    }
    waitForTawkAPI() {
      return new Promise((e) => {
        const i = () => {
          window.Tawk_API ? e() : setTimeout(i, 100);
        };
        i();
      });
    }
    setTAWKAttributes() {
      var e = this;
      return I(function* () {
        (yield e.waitForTawkAPI(), window.Tawk_API.hideWidget());
      })();
    }
    toggleShowPositions() {
      this.appService.globals.showPositions = !this.appService.globals.showPositions;
    }
    updatePositionsIframe() {
      this.appService.guiEventBus.emit('updatePositionsIframe');
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
    manageRoomLayout() {
      if (
        'ltr' === this.appService.globals.preferences.roomSplitDir ||
        'rtl' === this.appService.globals.preferences.roomSplitDir
      ) {
        const e = window.localStorage.getItem('roomSizes');
        if (e) {
          const o = JSON.parse(e);
          ((this.chatAlertsSize = o[0]), (this.presAreaSize = o[1]));
        }
        const i = window.localStorage.getItem('chatAlertSizes');
        if (i) {
          const o = JSON.parse(i);
          ((this.alertSize = o[0]), (this.chatSize = o[1]));
        }
      } else {
        const e = window.localStorage.getItem('roomSizes-bottom');
        if (e) {
          const o = JSON.parse(e);
          ((this.presAreaSize = o[0]), (this.chatAlertsSize = o[1]));
        } else
          ((this.presAreaSize = this.presAreaSizeBottom),
            (this.chatAlertsSize = this.chatAlertsSizeBottom));
        const i = window.localStorage.getItem('chatAlertSizes-bottom');
        if (i) {
          const o = JSON.parse(i);
          ((this.alertSize = o[0]), (this.chatSize = o[1]));
        } else ((this.alertSize = this.alertSizeBottom), (this.chatSize = this.chatSizeBottom));
      }
      this.appService.globals.preferences.extraChatColumn &&
        this.appService.sendServerCommand('getChatLog', {
          channel: 'offTopic',
          page: 0,
          extraChat: !0
        });
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
    attachAudioStream(e) {
      let i = this;
      P('Room attachAudioStream called...');
      let o = un('#webcam').get(0);
      o.srcObject = e;
      let s = o.play();
      void 0 !== s &&
        s
          .catch(function (r) {
            (bootbox.hideAll(),
              P('audiobridge Autoplay FAILED. need user OK...'),
              bootbox.alert("Your browser needs your OK to play the room's audio", () => {
                (P('Autoplay after UI, pressing play()...'),
                  o.play(),
                  i.appService.guiEventBus.emit('resizeScrollviewChatEnd'));
              }));
          })
          .then(function () {
            P('Autoplay OK...');
          });
    }
    toggleSideBar() {
      ((this.showSidebar = !this.showSidebar),
        this.showSidebar ? this.appService.loadRoster() : this.appService.unloadRoster());
    }
    toggleSideBarUsersCount() {
      this.alwaysShowRoster &&
        ((this.showSidebar = !this.showSidebar), this.showSidebar && this.appService.loadRoster());
    }
    toggleUserSearch() {
      ((this.showUserSearch = !this.showUserSearch),
        this.showUserSearch &&
          setTimeout(() => {
            document.getElementById('userSearchTermInput').focus();
          }, 300));
    }
    uniqueRoster(e) {
      let i = e.length,
        o = [],
        s = [],
        r = [],
        a = 0;
      for (let l = 0; l < i; l++) {
        const c = e[l];
        o.includes(c.emailHash) ? r.push(c) : (o.push(c.emailHash), s.push(c), a++);
      }
      return { uniqueUsers: s, totalUsers: i, unique: a };
    }
    calculateDuplicates() {
      var i = this.uniqueRoster(this.appService.globals.roster);
      return (
        bootbox.alert('Unique Users: ' + i.unique + '. Duplicate: ' + (i.totalUsers - i.unique)),
        !1
      );
    }
    randomUser(e) {
      const i = this;
      var o = e.length;
      if (o >= 2) {
        var r = e[Math.floor(Math.random() * o)],
          a = bootbox.dialog({
            title: 'Random User',
            message:
              '<p class="text-center"><img src="https://media.giphy.com/media/dyXPQavQUyeSK4nlpt/giphy.gif" alt=""></p>',
            className: 'random-user-modal',
            buttons: {
              noclose: {
                label: 'User Info',
                className: 'btn-warning btn-random-user',
                callback: () => (
                  i.appService.getUserInfo(r.userXrefID, r._id, null, null, !0),
                  i.appService.guiEventBus.emit('doUserInfo', r.userXrefID),
                  !1
                )
              },
              cancel: { label: 'Close', className: 'btn-danger', callback() {} }
            }
          });
        a.init(() => {
          setTimeout(() => {
            (a
              .find('.bootbox-body')
              .html('<h2 class="text-center flash animated">' + r.nick + '</h2>'),
              un('.btn-random-user').css('display', 'inline-block'));
          }, 3e3);
        });
      }
    }
    getRandomUser() {
      const e = this;
      bootbox.confirm({
        message: 'Only select from Trials?',
        buttons: {
          confirm: { label: 'Yes', className: 'btn-success' },
          cancel: { label: 'No', className: 'btn-danger' }
        },
        callback(i) {
          let o = e.appService.globals.roster.filter((r) => !r.isP),
            { uniqueUsers: s } = e.uniqueRoster(o);
          (console.log('unique users for random', s),
            i && (s = s.filter((r) => r.isFT)),
            e.randomUser(s));
        }
      });
    }
    manageFollowedUsers() {
      this.appService.appEventBus.emit('manageFollowedUsers');
    }
    manageMutedUsers() {
      this.appService.appEventBus.emit('manageMutedUsers');
    }
    sortUsers() {
      ((this.isSortUsers = !this.isSortUsers),
        this.appService.guiEventBus.emit('sortUsers', this.isSortUsers));
    }
    sortFTUsers() {
      ((this.isSortFTUsers = !this.isSortFTUsers),
        this.appService.guiEventBus.emit('sortFTUsers', this.isSortFTUsers));
    }
    alertSoundOnChange() {
      ((this.appService.globals.preferences.alertSoundOn =
        !this.appService.globals.preferences.alertSoundOn),
        this.appService.setPreference(
          'alertSoundOn',
          this.appService.globals.preferences.alertSoundOn
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
    qaSoundOnChange() {
      ((this.appService.globals.preferences.qaSoundOn =
        !this.appService.globals.preferences.qaSoundOn),
        this.appService.setPreference('qaSoundOn', this.appService.globals.preferences.qaSoundOn));
    }
    chatSoundOnChange() {
      ((this.appService.globals.preferences.chatSoundOn =
        !this.appService.globals.preferences.chatSoundOn),
        this.appService.setPreference(
          'chatSoundOn',
          this.appService.globals.preferences.chatSoundOn
        ));
    }
    subtitlesOnChange() {
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
    doNotDisturbOnChange() {
      this.appService.globals.preferences.doNotDisturbOn =
        !this.appService.globals.preferences.doNotDisturbOn;
    }
    closeRecordingReminder() {
      this.recordingReminder = !1;
    }
    reopenWebcams() {
      if (!this.mediaService.camLaunching) return !1;
      this.showWebcams = !this.showWebcams;
    }
    reopenPreviewWindow() {
      if (!this.mediaService.isScreenSharing) return !1;
      this.appService.guiEventBus.emit('reopenPreviewWindow');
    }
    reopenRecPreviewWindow() {
      if (!this.appService.globals.roomState.isRecording) return !1;
      ((this.appService.globals.recPreviewOpen = !0),
        this.appService.guiEventBus.emit('reopenRecPreviewWindow'));
    }
    doSoundCloudEmbed() {
      bootbox.prompt(
        'You can play SoundCloud music for all. Click on "Share" from your track or playlist, copy and paste the share url here',
        (e) => {
          if (e) {
            if (0 !== e.indexOf('https://soundcloud.com'))
              return void bootbox.alert('Invalid SoundCloud URL...');
            (console.log('soundcloud url', e),
              (this.scPlaying = !0),
              this.appService.sendServerAdminCommand('playSoundCloudForAll', { url: e }));
          }
        }
      );
    }
    stopSoundCloudEmbed() {
      ((this.scPlaying = !1),
        this.appService.sendServerAdminCommand('stopSoundCloudForAll', { url: null }));
    }
    doSoundCloudUserStop() {
      this.scPlaying = !1;
    }
    setBkgMusicVol(e) {
      let i = 100;
      i = e ? e.target.value : this.audioBgVolume;
      const o = i / 100;
      if (
        (console.log(
          'AdjustVol to: ' + o + '. this.audioBgVol:' + this.audioBgVolume + '. vol:' + Number(i)
        ),
        this.mp3Playing && un('#mp3player').prop('volume', o),
        this.scPlaying)
      ) {
        const s = document.getElementById('soundCloudIFrame');
        SC.Widget(s).setVolume(Number(i));
      }
      this.appService.appEventBus.emit('setYTVolume', Number(i));
    }
    toggleMic() {
      this.mediaService.toggleMicMute();
    }
    openAvDeviceSelection() {
      return I(function* () {
        (yield un('#session-control-modal').modal('show'),
          yield un('#av-device-selection-tab').tab('show'));
      })();
    }
    adjustVol(e) {
      let i = 100;
      i = e ? e.target.value : this.audioVolume;
      var o = i / 100;
      (console.log('AdjustVol to: ' + i + '. this.audioVol:' + this.audioVolume),
        (this.appService.globals.audioVolume = o),
        un('[id^=msRemAudio-]').prop('volume', o),
        un('[id^=video-]').prop('volume', o),
        0 === Number(i) && (this.appService.globals.preferences.subtitles = !0));
    }
    adjustVolPres(e, i) {
      const { userID: o, mediaValue: s } = i,
        r = e.target.value,
        a = r / 100;
      ((this.appService.globals.preferences.audioVolumeFor[o] = r),
        un('[id^=msRemAudio-' + o + ']').prop('volume', a),
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
        (this.appService.globals.preferences.doNotDisturbOn = !0),
        (this.appService.globals.preferences.subtitles = !0),
        (this.audioBgVolume = this.audioVolume),
        this.setBkgMusicVol(null));
    }
    unmute() {
      ((this.audioVolume = this.prevVolume),
        this.adjustVol(null),
        (this.appService.globals.preferences.doNotDisturbOn = !1),
        (this.appService.globals.preferences.subtitles = !1),
        (this.audioBgVolume = this.audioVolume),
        this.setBkgMusicVol(null));
    }
    switchTheme(e) {
      this.appService.guiEventBus.emit('switchTheme', e);
    }
    doReload() {
      bootbox.confirm('Are you sure you want to reload the page?', (e) => {
        e && window.location.reload();
      });
    }
    launchRecordings() {
      window.open(
        `${this.appService.globals.apiROOT}/sessions/v2/archives/recordings/${this.appService.globals.sessionID}/${this.appService.globals.sesionToken}`,
        '_blank'
      );
    }
    initPMDrag() {
      un('#privaChatCompHolder')
        .draggable({
          appendTo: 'body',
          containment: '.wrapper',
          cursor: 'move',
          scroll: !1,
          snap: !0,
          cancel: '.privChatScroller, .textSendDiv, #pmSearchTermTxt'
        })
        .resizable({
          handles: 'n, e, s, w, ne, se, sw, nw',
          maxWidth: un('.wrapper').width(),
          maxHeight: un('.wrapper').height()
        })
        .show();
    }
    showPrivateChat(e = null, i = null) {
      this.appService.globals.videoOnlyMode ||
        this.appService.globals.viewerOnlyMode ||
        (this.privChatInited || ((this.privChatInited = !0), this.initPMDrag()),
        (this.privChatVisible = !0),
        this.appService.guiEventBus.emit('privChatVisible', this.privChatVisible),
        un('#privaChatCompHolder').show());
    }
    closePrivateChat() {
      ((this.privChatVisible = !1),
        this.appService.guiEventBus.emit('privChatVisible', this.privChatVisible),
        un('#privaChatCompHolder').hide());
    }
    hideShowPresentationArea() {
      (this.presAreaSize > 0
        ? ((this.presAreaSize = 0), (this.chatAlertsSize = 100))
        : ((this.presAreaSize = 70), (this.chatAlertsSize = 30)),
        this.printSizes());
    }
    reloadUsers() {
      this.appService.loadRoster();
    }
    doAlertsLogsModal() {
      this.appService.guiEventBus.emit('doAlertsLogsModal');
    }
    doChatLogsModal() {
      this.appService.guiEventBus.emit('doChatLogsModal');
    }
    printSizes() {
      console.log(
        `presAreaSize: ${this.presAreaSize}. chatAlertsSize: ${this.chatAlertsSize}. alertSize: ${this.alertSize}.`
      );
    }
    resizeStart() {
      P('resizeStart');
    }
    directionRoom() {
      switch (this.appService.globals.preferences.roomSplitDir) {
        case 'rtl':
        case 'ltr':
          return 'horizontal';
        default:
          return 'vertical';
      }
    }
    directionChatAlerts() {
      switch (this.appService.globals.preferences.roomSplitDir) {
        case 'ttb':
        case 'btt':
          return 'horizontal';
        default:
          return 'vertical';
      }
    }
    orderPresentation() {
      switch (this.appService.globals.preferences.roomSplitDir) {
        case 'ttb':
        case 'ltr':
          return 1;
        default:
          return 0;
      }
    }
    orderChatAlerts() {
      switch (this.appService.globals.preferences.roomSplitDir) {
        case 'btt':
        case 'rtl':
          return 1;
        default:
          return 0;
      }
    }
    resizeEndChat(e) {
      (this.appService.guiEventBus.emit('resizeChatView'),
        'ltr' === this.appService.globals.preferences.roomSplitDir ||
        'rtl' === this.appService.globals.preferences.roomSplitDir
          ? window.localStorage.setItem('chatAlertSizes', JSON.stringify(e.sizes))
          : window.localStorage.setItem('chatAlertSizes-bottom', JSON.stringify(e.sizes)));
    }
    resizeEndPresentation(e) {
      (this.appService.guiEventBus.emit('resizeChatView'),
        'ltr' === this.appService.globals.preferences.roomSplitDir ||
        'rtl' === this.appService.globals.preferences.roomSplitDir
          ? window.localStorage.setItem('roomSizes', JSON.stringify(e.sizes))
          : window.localStorage.setItem('roomSizes-bottom', JSON.stringify(e.sizes)));
    }
    onDragEnd() {}
    doUserSearch(e) {
      13 == e.keyCode && (this.userSearchTermTxt ? this.searchUsers() : this.clearUserSearch());
    }
    searchUsers() {
      let e = this.userSearchTermTxt.toLocaleLowerCase();
      (console.log('Searching for: ' + e),
        (this.visibleRoster = this.appService.globals.roster.filter(
          (i) =>
            !!(
              i.nick.toLowerCase().indexOf(e) >= 0 ||
              (i.emailHash && i.emailHash === this.appService.hashEmail(e))
            )
        )));
    }
    clearUserSearch() {
      (P('Clear search...'), (this.visibleRoster = this.appService.globals.roster));
    }
    toggleWebcam() {
      ((this.mediaService.camLaunching = !0), this.mediaService.toggleCamMute());
    }
    doSessionControl() {
      this.appService.guiEventBus.emit('doSessionControlModal');
    }
    addPresenterdWebcam(e) {
      if (this.webcamsIdxs.includes(e._id))
        return void P('addPresenterdWebcam already have entry for this muser.. NOP');
      let i = Object.keys(this.webcams).length,
        o = this.resolver.resolveComponentFactory(sL),
        s = this.container.createComponent(o, i);
      ((s.instance.muser = e),
        (s.instance.pID = e._id),
        (s.instance.pName = e.mediaValue.name),
        (this.webcams[e._id] = s),
        this.webcamsIdxs.push(e._id));
    }
    removePresenterWebcam(e) {
      let i = this.webcams[e._id],
        o = this.webcamsIdxs.indexOf(e._id);
      i &&
        (console.log('removePresenterWebcam comp at idx:' + o),
        o > -1 &&
          (this.container.remove(o),
          delete this.webcams[e._id],
          this.webcamsIdxs.splice(o, 1),
          console.log('removePresenterWebcam webcamsIdxs:', this.webcamsIdxs)));
    }
    resetWebcamPositions() {
      P('resetWebcamPositions...');
      let e = un('#mainAreaSplit'),
        i = e.innerWidth(),
        o = e.innerHeight() + 45;
      P('resetWebcamPositions container w=' + i + '. h=' + o);
      let s = 0,
        r = 0,
        a = 0,
        l = null;
      Object.keys(this.webcams).forEach((c) => {
        P('resetWebcamPositions webcamID ' + c);
        let h = this.webcams[c],
          f = un(`#webcamsHolder-${h.instance.pID}`),
          _ = f.offset();
        (P(`resetWebcamPositions prosessing #webcamsHolder-${h.instance.pID}`),
          0 == a
            ? ((l = _), (s = i - f.innerWidth()), (r = o - f.innerHeight()))
            : ((s = s - f.innerWidth() - 5), (r = o - f.innerHeight())),
          f.innerHeight(),
          P(
            'resetWebcamPositions lastX:' +
              s +
              '. lastY: ' +
              r +
              '. elemW:' +
              f.innerWidth() +
              '. elemH:' +
              f.innerHeight()
          ),
          f.offset({ top: r, left: s }),
          a++);
      });
    }
    resetWebcamPositionsAlt() {
      P('resetWebcamPositionsAlt...');
      let e = un('#mainAreaSplit'),
        i = e.innerWidth(),
        o = e.innerHeight() + 45,
        s = e.offset();
      P('resetWebcamPositionsAlt container w=' + i + '. h=' + o);
      let r = 0,
        a = 0,
        l = 0,
        c = null;
      Object.keys(this.webcams).forEach((h) => {
        P('resetWebcamPositions webcamID ' + h);
        let f = this.webcams[h],
          _ = un(`#webcamsHolder-${f.instance.pID}`),
          F = _.offset();
        (P(`resetWebcamPositions prosessing #webcamsHolder-${f.instance.pID}`),
          0 == l
            ? ((c = F), (r = s.left + 20), (a = s.top + 20))
            : ((r = r + _.innerWidth() + 5), (a = s.top + 20)),
          _.innerHeight(),
          P(
            'resetWebcamPositionsAlt lastX:' +
              r +
              '. lastY: ' +
              a +
              '. elemW:' +
              _.innerWidth() +
              '. elemH:' +
              _.innerHeight()
          ),
          _.offset({ top: a, left: r }),
          l++);
      });
    }
    startRecFromMuser(e) {
      if (e) {
        ((e.isRec = !0), this.mediaService.startRecForMuser(e));
        let i = this.mediaSoupService.screenProducers.get(e.producerID);
        i && ((i.isRec = !0), console.log('************* set isRec to true. muser:', e));
      } else
        (console.error('startRecFromMuser: no muser. mtxStreams:', this.mtxService.mtxStreams),
          this.mtxService.mtxStreams.length > 0
            ? this.appService.sendServerAdminCommand('startRecMtx', {
                streams: this.mtxService.mtxStreams
              })
            : this.mediaService.startRecForMuser(null));
    }
    stopRecFromMuser(e) {
      if (e) {
        ((e.isRec = !1), this.mediaService.stopRecForMuser(e));
        let i = this.mediaSoupService.screenProducers.get(e.producerID);
        i && (i.isRec = !1);
      } else
        (this.mtxService.initOK && this.appService.sendServerAdminCommand('stopRecMtx'),
          this.mediaService.stopRecForMuser(null));
    }
    startRecording(e) {
      var i = this;
      return I(function* () {
        if ((console.log('startRec pres:', e), e)) {
          P('startRecording startRecording:' + e._id);
          let o = yield i.mediaService.getLocalMuserFromProducerId(e._id);
          (i.startRecFromMuser(o), (i.recordingReminder = !0));
        } else i.startRecFromMuser(null);
      })();
    }
    stopRecording(e) {
      var i = this;
      return I(function* () {
        if ((P('stopRecording pres:', e), e)) {
          let o = yield i.mediaService.getLocalMuserFromProducerId(e._id);
          (i.stopRecFromMuser(o), (i.recordingReminder = !1));
        } else i.stopRecFromMuser(null);
      })();
    }
    pauseRecording() {
      (P('Pause rec clicked'),
        (this.appService.globals.roomState.isRecordingPaused = !0),
        this.mediaService.pauseRec(),
        (this.recordingReminder = !0));
    }
    resumeRecording() {
      (P('Resume rec clicked'),
        (this.appService.globals.roomState.isRecordingPaused = !1),
        this.mediaService.resumeRec(),
        (this.recordingReminder = !1));
    }
    reconnectAudio() {
      this.mediaService.reconnectAudio();
    }
    getMyPinAndDoInfo() {
      var e = this;
      return I(function* () {
        (e.appService.globals.sessData.ptrMobileAppEnabled ||
          e.appService.globals.sessData.customMobileAppEnabled) &&
          (!e.appService.globals.user.isFT || e.appService.globals.sessData.freeTrialsGetApp) &&
          e.appService.sendServerCommand('getMyMobilePin', null);
      })();
    }
    decodedRecName() {
      return decodeURIComponent(this.appService.globals.roomState.recName);
    }
    muteTalkingUserDialog(e) {
      this.appService.globals.user.isPresenter &&
        bootbox.prompt(
          'Would you like to force stop ' +
            e.mediaValue.name +
            ' from talking? (forces a remote mute for all). type: yes to proceed',
          (i) => {
            i &&
              'yes' == i.toLowerCase() &&
              this.appService.sendServerCommand('muteTalkingUser', e);
          }
        );
    }
    muteAllNonAdmins() {
      if (!this.appService.globals.user.isPresenter) return;
      const e = this.mediaService.talkingUsers;
      !e ||
        0 === e.length ||
        bootbox.confirm('Mute all non-admin users currently speaking?', (i) => {
          if (!i) return;
          const o = this.appService.globals.roster;
          if (!o || 0 === o.length) return;
          const s = new Map();
          for (const a of o) s.set(a._id, a);
          const r = [];
          for (const a of e) {
            const l = s.get(a.userID);
            l && 'a' !== l.perms && r.push(a);
          }
          0 !== r.length &&
            r.forEach((a, l) => {
              setTimeout(() => {
                this.appService.sendServerCommand('muteTalkingUser', a);
              }, 100 * l);
            });
        });
    }
    onResize(e) {
      ((this.isMobileScreen = e.target.innerWidth <= 601),
        this.appService.guiEventBus.emit('resizeChatView'),
        this.isMobileScreen !== this.onResizeChange &&
          (clearTimeout(this.onResizeTimer),
          (this.onResizeTimer = setTimeout(() => {
            (console.log('onResize event end'),
              this.appService.guiEventBus.emit('appHasFocusGetChatLog'),
              this.appService.globals.preferences.extraChatColumn &&
                this.appService.guiEventBus.emit('appHasFocusGetChatLogExtraChatColumn'),
              this.appService.sendServerCommand('getAlertsLog', { page: 0 }),
              (this.onResizeChange = this.isMobileScreen));
          }, 500))));
    }
    showRecPreview() {
      if (!this.appService.globals.roomState.isRecording) return !1;
      ((this.appService.globals.recPreviewOpen = !0),
        this.appService.guiEventBus.emit('reopenRecPreviewWindow'));
    }
    hideRecPreview() {
      if (!this.appService.globals.roomState.isRecording) return !1;
      ((this.appService.globals.recPreviewOpen = !1),
        this.appService.guiEventBus.emit('closeRecPreviewWindow'));
    }
    onKeyDown(e) {
      (this.appService.globals.preferences.pushToTalk &&
        !e.repeat &&
        ('ControlRight' === e.code || 17 == e.which) &&
        this.mediaService.micMuted &&
        this.toggleMic(),
        !this.appService.globals.isPresenter &&
          this.appService.globals.sessData.disableCopy &&
          ((e.ctrlKey && ['c', 'u', 's'].includes(e.key.toLowerCase())) || 'F12' === e.key) &&
          e.preventDefault());
    }
    onRightClick(e) {
      !this.appService.globals.isPresenter &&
        this.appService.globals.sessData.disableCopy &&
        e.preventDefault();
    }
    onKeyUp(e) {
      this.appService.globals.preferences.pushToTalk &&
        ('ControlRight' === e.code || 17 == e.which) &&
        !this.mediaService.micMuted &&
        this.toggleMic();
    }
    openStreamingTab() {
      return I(function* () {
        (yield un('#session-control-modal').modal('show'),
          yield un('#streaming-selection-tab').tab('show'),
          yield un('#obs-streaming-tab').tab('show'));
      })();
    }
    doTipToUser() {
      this.appService.globals.sessData.tipMeBtnUrl &&
        window.open(this.appService.globals.sessData.tipMeBtnUrl, '_blank');
    }
    closeModMessage() {
      this.modMessage = '';
    }
    reopenAlertsChat() {
      ((this.hideChatAlerts = !1),
        (this.reopenAlertsChatBtn = !1),
        this.appService.guiEventBus.emit('appHasFocusGetChatLog'),
        this.appService.globals.preferences.extraChatColumn &&
          this.appService.guiEventBus.emit('appHasFocusGetChatLogExtraChatColumn'),
        this.appService.sendServerCommand('getAlertsLog', { page: 0 }));
    }
    toggleSpeechRecoHistory() {
      const e = this.appService.globals.sesionToken;
      if (!e) return void P('No session token available for transcript');
      const o = `${window.location.origin + window.location.pathname}#/session-transcript?token=${encodeURIComponent(e)}&name=${encodeURIComponent(this.appService.globals.sessionName)}`;
      window.open(o, '_blank');
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(ma), be(fa), be(g1), be(fo), be(Ir), be(Xc), be(sa));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-room']],
        viewQuery: function (i, o) {
          if ((1 & i && Xt(GAe, 5, po), 2 & i)) {
            let s;
            yt((s = Ft())) && (o.container = s.first);
          }
        },
        hostBindings: function (i, o) {
          1 & i &&
            x(
              'resize',
              function (r) {
                return o.onResize(r);
              },
              0,
              Cm
            )(
              'keydown',
              function (r) {
                return o.onKeyDown(r);
              },
              !1,
              Cm
            )(
              'contextmenu',
              function (r) {
                return o.onRightClick(r);
              },
              !1,
              mE
            )(
              'keyup',
              function (r) {
                return o.onKeyUp(r);
              },
              !1,
              Cm
            );
        },
        decls: 38,
        vars: 9,
        consts: [
          ['privChatContainer', ''],
          ['webcamContainer', ''],
          ['rosterScrollerParent', ''],
          ['rosterHolder', ''],
          [1, 'wrapper', 3, 'ngClass'],
          [1, 'd-flex', 'flex-column-reverse', 'flex-sm-row', 'room-container'],
          [1, 'room-sidebar'],
          [1, 'navbar', 'navbar-expand-md', 'navbar-dark', 'fixed-top', 'mainAppNav'],
          [
            'minSize',
            '0',
            'id',
            'mainAreaSplit',
            'gutterDblClickDuration',
            '400',
            3,
            'direction',
            'ngClass'
          ],
          [1, 'notConnectedOverlay', 'animated', 'fadeIn'],
          ['id', 'connectedMsg', 1, 'notConnectedOverlay', 'animated', 'fadeIn'],
          [1, 'fas', 'fa-check'],
          ['id', 'pollModalCompHolder', 1, 'pollModalHolder'],
          ['id', 'privaChatCompHolder', 1, 'privChatHolder'],
          [1, 'sidebar-wrapper'],
          [1, 'navbar', 'w-100', 'h-100'],
          [1, 'navbar-nav', 'small', 'w-100', 'h-100'],
          [1, 'nav-item', 'text-center'],
          [
            'href',
            'https://protradingroom.com',
            'target',
            '_blank',
            'rel',
            'noopener noreferrer',
            1,
            'ptr-website-link'
          ],
          [1, 'nav-item'],
          [
            'title',
            'Connectivity Check',
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#webrtc-troubleshooter-modal',
            1,
            'nav-link',
            'sidebar-item'
          ],
          [1, 'fas', 'fa-network-wired'],
          [1, 'pl-2'],
          [
            'title',
            'General Settings',
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#user-settings-modal',
            1,
            'nav-link',
            'sidebar-item'
          ],
          [1, 'fas', 'fa-cogs'],
          [1, 'nav-item', 'py-0'],
          [1, 'nav-item', 'dropdown'],
          [
            'title',
            'Manage Muted Users',
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#mutedUsersModal',
            1,
            'nav-link',
            'sidebar-item',
            'ps-1',
            3,
            'click'
          ],
          [1, 'fas', 'fa-comments'],
          [
            'title',
            'Manage Followed Users',
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#followedUsersModal',
            1,
            'nav-link',
            'sidebar-item',
            'ps-1',
            3,
            'click'
          ],
          [1, 'fas', 'fa-users'],
          [1, 'nav-item', 'd-flex', 'flex-column', 'h-100'],
          [
            'type',
            'button',
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#mobileAppInfoModal',
            1,
            'btn',
            'btn-sm',
            'btn-secondary',
            3,
            'ngClass'
          ],
          [
            'type',
            'button',
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#mobileAppInfoModal',
            1,
            'btn',
            'btn-sm',
            'btn-secondary',
            3,
            'click',
            'ngClass'
          ],
          ['type', 'button', 1, 'btn', 'btn-primary', 'btn-sm', 3, 'click', 'title'],
          [1, 'fas', 'fa-dollar-sign'],
          [1, 'ms-1'],
          [1, 'fas', 'fa-cog', 'fa-spin'],
          ['title', 'Reopen Alerts / Chat', 1, 'nav-link', 'sidebar-item', 3, 'click'],
          [1, 'fas', 'fa-window-restore'],
          ['target', '_blank', 'title', 'Benzinga News', 1, 'nav-link', 'sidebar-item', 'ps-1'],
          [1, 'benzinga-logo-alt', 3, 'src'],
          [1, 'fas', 'fa-newspaper'],
          [
            'id',
            'archivesDropdown',
            'title',
            'Archives',
            'data-bs-toggle',
            'dropdown',
            'aria-haspopup',
            'true',
            'aria-expanded',
            'false',
            1,
            'nav-link',
            'sidebar-item',
            'dropdown-toggle'
          ],
          [1, 'fas', 'fa-archive'],
          ['aria-labelledby', 'archivesDropdown', 1, 'dropdown-menu', 'users-dropdown-options'],
          [1, 'dropdown-item', 'small'],
          [
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#alerts-logs-modal',
            1,
            'dropdown-item',
            'small',
            3,
            'click'
          ],
          [1, 'fas', 'fa-bell'],
          [
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#chat-logs-modal',
            1,
            'dropdown-item',
            'small'
          ],
          [1, 'dropdown-item', 'small', 3, 'click'],
          [1, 'fas', 'fa-circle'],
          [
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#chat-logs-modal',
            1,
            'dropdown-item',
            'small',
            3,
            'click'
          ],
          [1, 'fas', 'fa-comment'],
          [1, 'fas', 'fa-closed-captioning'],
          ['title', 'Get Random User', 1, 'nav-link', 'sidebar-item', 'ps-1', 3, 'click'],
          [1, 'fas', 'fa-user'],
          [
            1,
            'nav-link',
            'active-room-users',
            'd-flex',
            'align-items-center',
            'justify-content-between',
            'pt-0'
          ],
          ['title', 'Users'],
          [1, 'badge', 'badge-primary', 'd-inline-block', 'ml-1'],
          [1, 'flex-fill', 'users-btns'],
          ['title', 'Users Options', 1, 'dropdown', 'user-options'],
          [
            'id',
            'user-options-btn',
            'data-bs-toggle',
            'dropdown',
            'aria-expanded',
            'false',
            1,
            'btn',
            'btn-sm',
            'btn-dark',
            'ml-1',
            'float-right',
            'border-0',
            'dropdown-toggle'
          ],
          [1, 'fas', 'fa', 'fa-cog'],
          ['aria-labelledby', 'user-options-btn', 1, 'dropdown-menu'],
          [
            1,
            'dropdown-item',
            'd-flex',
            'align-items-center',
            'justify-content-between',
            3,
            'click'
          ],
          [1, 'fas', 'fa-check-circle'],
          [
            'title',
            'Reload Users',
            1,
            'btn',
            'btn-sm',
            'btn-default',
            'ml-1',
            'float-right',
            'reload-room-users',
            'border-0',
            3,
            'click'
          ],
          [1, 'fas', 'fa', 'fa-sync'],
          [
            'title',
            'Sort Users',
            1,
            'btn',
            'btn-sm',
            'btn-secondary',
            'float-right',
            'border-0',
            'ms-1',
            3,
            'click',
            'ngClass'
          ],
          [1, 'fas', 'fa-sort-alpha-down'],
          [
            'title',
            'Search Users',
            1,
            'btn',
            'btn-sm',
            'btn-default',
            'float-right',
            'search-room-users',
            'border-0',
            3,
            'click'
          ],
          [1, 'fas', 'fa', 'fa-search'],
          [
            'type',
            'search',
            'id',
            'userSearchTermInput',
            'placeholder',
            'Search by nick or email,enter to search',
            'aria-label',
            'Search',
            'aria-describedby',
            'addon-search',
            1,
            'form-control',
            3,
            'ngModel'
          ],
          [1, 'flex-grow-1'],
          [3, 'roster', 'parent'],
          [
            'type',
            'search',
            'id',
            'userSearchTermInput',
            'placeholder',
            'Search by nick or email,enter to search',
            'aria-label',
            'Search',
            'aria-describedby',
            'addon-search',
            1,
            'form-control',
            3,
            'ngModelChange',
            'search',
            'keyup',
            'ngModel'
          ],
          ['title', 'Close Sidebar', 1, 'sidebar-menu', 'active-icon'],
          ['title', 'Open Sidebar', 1, 'sidebar-menu'],
          [
            'title',
            'Users Connected',
            1,
            'users',
            'ml-1',
            'mr-1',
            'd-flex',
            'align-items-center',
            3,
            'click',
            'dblclick'
          ],
          [1, 'ml-1'],
          [
            'title',
            'Launch in Mobile App',
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#mobileAppInfoModal',
            1,
            'fas',
            'fa-mobile',
            'mr-1',
            'mobile-info-app-btn'
          ],
          [1, 'navbar-brand', 'ml-1', 'mr-auto'],
          ['id', 'cssLogo', 'alt', 'App Logo', 1, 'brand-logo', 3, 'src'],
          [
            'href',
            'https://intercom.help/simpler-trading/en/',
            'target',
            '_blank',
            1,
            'helpLink',
            'mr-auto'
          ],
          [
            'type',
            'button',
            'data-bs-toggle',
            'collapse',
            'data-bs-target',
            '#navbarsRoom',
            'aria-controls',
            'navbarsRoom',
            'aria-expanded',
            'false',
            'aria-label',
            'Toggle navigation',
            1,
            'navbar-toggler',
            'btnNavToggler'
          ],
          [1, 'navbar-toggler-icon'],
          ['id', 'navbarsRoom', 1, 'collapse', 'navbar-collapse'],
          [1, 'navbar-nav', 'align-items-center', 'ml-auto'],
          [1, 'nav-item', 3, 'title'],
          [1, 'nav-item', 'animated', 'fadeIn', 'benzinga-li'],
          [1, 'nav-item', 'talkingIndicator', 'animated', 'fadeIn'],
          [1, 'nav-item', 'recIndicator', 'animated', 'flash'],
          [1, 'nav-item', 'recIndicator', 'animated', 'fadeIn'],
          [1, 'nav-item', 'recIndicatorStart'],
          ['title', 'Star/Stop Recording', 1, 'nav-item', 'dropdown'],
          ['title', 'Play music from SoundCloud for all', 1, 'nav-item', 'dropdown'],
          ['title', 'Music is playing from SoundCloud for all', 1, 'nav-item'],
          ['title', 'Unmute/Mute Microphone', 1, 'nav-item', 'd-flex', 'align-items-center'],
          ['title', 'Start/Stop Screen Sharing', 1, 'screen-sharing', 'nav-item', 'dropdown'],
          ['title', 'Start / Stop WebCam', 1, 'nav-item'],
          [
            'title',
            'Session Control',
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#session-control-modal',
            1,
            'nav-item'
          ],
          ['title', 'TAWK Support', 1, 'nav-item'],
          [1, 'nav-item', 'dropdown', 'dropstart'],
          [
            'id',
            'dropdownVolume',
            'data-bs-toggle',
            'dropdown',
            1,
            'nav-link',
            'd-flex',
            'align-items-center'
          ],
          [1, 'fas', 'fa-2x', 'fa-volume-up'],
          [1, 'fas', 'fa-2x', 'fa-volume-down'],
          [1, 'fas', 'fa-2x', 'fa-volume-off'],
          [1, 'ml-2', 'mainNavItem'],
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
          [2, 'text-align', 'center'],
          [1, 'dropdown-divider'],
          [1, 'room-sound-options'],
          [1, 'my-1'],
          [
            'type',
            'checkbox',
            'name',
            'alert-donot-disturb',
            'value',
            'Alert Do not disturb',
            'id',
            'alert-donot-disturb',
            'title',
            'Alert sound',
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
            'title',
            'QA sound',
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
            'non-trade-donot-disturb',
            'value',
            'Non-trade alerts do not disturb',
            'id',
            'non-trade-donot-disturb',
            'title',
            'Non-trade alert sound',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'non-trade-donot-disturb', 1, 'form-check-label'],
          [
            'type',
            'checkbox',
            'name',
            'chat-donot-disturb',
            'value',
            'Chat Do not disturb',
            'id',
            'chat-donot-disturb',
            'title',
            'Chat sound',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'chat-donot-disturb', 1, 'form-check-label'],
          [
            'type',
            'checkbox',
            'name',
            'presentation-subtitles',
            'value',
            'Presentation Subtitles',
            'id',
            'presentation-subtitles',
            'title',
            'Show Speech Recognition Overlay',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'presentation-subtitles', 1, 'form-check-label'],
          [
            'type',
            'checkbox',
            'name',
            'app-donot-disturb',
            'value',
            'Do not disturb',
            'id',
            'app-donot-disturb',
            'title',
            "Don't Disturb",
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'app-donot-disturb', 1, 'form-check-label'],
          ['title', 'Reload', 1, 'nav-item'],
          [1, 'nav-link', 'd-flex', 'align-items-center', 3, 'click'],
          [1, 'fas', 'fa-2x', 'fa-sync'],
          ['title', 'Close Sidebar', 1, 'sidebar-menu', 'active-icon', 3, 'click'],
          [1, 'fas', 'fa-arrow-left'],
          ['title', 'Open Sidebar', 1, 'sidebar-menu', 3, 'click'],
          [1, 'fas', 'fa-bars'],
          [
            'title',
            'Launch in Mobile App',
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#mobileAppInfoModal',
            1,
            'fas',
            'fa-mobile',
            'mr-1',
            'mobile-info-app-btn',
            3,
            'click'
          ],
          [1, 'fas', 'fa-question-circle'],
          [1, 'nav-item', 3, 'click', 'title'],
          [1, 'd-flex', 'align-items-center', 'btn', 'btn-primary', 'btn-sm'],
          ['target', '_blank', 'title', 'Benzinga News', 1, 'nav-link'],
          [1, 'benzinga-logo', 'animated', 'fadeIn', 3, 'src'],
          [1, 'talking'],
          [1, 'icon', 'fa', 'fa-microphone'],
          [1, 'talking-string'],
          [
            'id',
            'talkingLevelsImg',
            'src',
            '/assets/images/talking.gif',
            1,
            'talkingWaveform',
            'animated',
            'fadeIn'
          ],
          [3, 'click'],
          [
            'id',
            'nolevelsImg',
            'src',
            '/assets/images/notalking.png',
            1,
            'talkingWaveform',
            'animated',
            'fadeIn'
          ],
          [3, 'ngbTooltip'],
          [1, 'nav-link'],
          [1, 'fas', 'fa-spinner', 'fa-spin'],
          [
            'id',
            'dropdownRecording',
            'data-bs-toggle',
            'dropdown',
            'aria-haspopup',
            'true',
            'aria-expanded',
            'false',
            1,
            'nav-link',
            'dropdown-toggle',
            'd-flex',
            'align-items-center',
            3,
            'ngClass'
          ],
          [1, 'far', 'fa-2x', 'fa-dot-circle', 3, 'ngClass'],
          [1, 'recording-reminder'],
          [
            'aria-labelledby',
            'dropdownRecording',
            1,
            'screen-options-start-screen',
            'dropdown-menu',
            'dropdown-menu-end'
          ],
          [1, 'recording-reminder-arrow'],
          ['type', 'button', 1, 'btn-close', 3, 'click'],
          ['aria-hidden', 'true'],
          [1, 'far', 'fa-dot-circle'],
          [1, 'far', 'fa-square'],
          [1, 'far', 'fa-pause-circle'],
          [1, 'far', 'fa-pause-circle-o'],
          ['aria-hidden', 'true', 3, 'click'],
          [1, 'fas', 'fa-times-circle'],
          [
            'id',
            'cssSoundCloudIcon',
            'id',
            'soundcloudDropdown',
            'data-bs-toggle',
            'dropdown',
            'aria-haspopup',
            'true',
            'aria-expanded',
            'false',
            1,
            'nav-link',
            'dropdown-toggle',
            'd-flex',
            'align-items-center',
            3,
            'ngClass'
          ],
          [1, 'fab', 'fa-2x', 'fa-soundcloud'],
          [1, 'ml-2'],
          [1, 'caret'],
          ['src', '/assets/images/playing.gif', 2, 'max-height', '25px'],
          [
            'aria-labelledby',
            'soundcloudDropdown',
            1,
            'dropdown-menu',
            'dropdown-menu-end',
            'soundcloud-options'
          ],
          [1, 'nav-item', 3, 'click'],
          [1, 'fa', 'fa-play-circle'],
          [1, 'fa', 'fa-square'],
          [1, 'fa', 'fa-users'],
          [1, 'divider'],
          [
            'id',
            'cssSoundCloudIcon',
            'id',
            'soundcloudDropdown',
            'aria-haspopup',
            'true',
            'aria-expanded',
            'false',
            1,
            'nav-link',
            'd-flex',
            'align-items-center',
            3,
            'click',
            'ngClass'
          ],
          [
            'id',
            'unmuteMuteMicrophone',
            1,
            'nav-link',
            'd-flex',
            'align-items-center',
            3,
            'click',
            'ngClass'
          ],
          [1, 'fas', 'fa-2x', 'fa-microphone'],
          [
            'title',
            'Audio Device Settings',
            1,
            'nav-link',
            'mic-gear-btn',
            'p-0',
            'm-0',
            3,
            'click'
          ],
          [1, 'fas', 'fa-cog'],
          [1, 'fas', 'fa-2x', 'fa-spinner', 'fa-spin'],
          [
            'id',
            'dropdownScreenSharing',
            'data-bs-toggle',
            'dropdown',
            'aria-haspopup',
            'true',
            'aria-expanded',
            'false',
            1,
            'nav-link',
            'dropdown-toggle',
            'd-flex',
            'align-items-center',
            3,
            'ngClass'
          ],
          [1, 'fas', 'fa-2x', 'fa-desktop'],
          [
            'aria-labelledby',
            'dropdownScreenSharing',
            1,
            'screen-options-start-screen',
            'dropdown-menu',
            'dropdown-menu-end'
          ],
          ['title', '(Regular Bandwidth) ** RECOMMENDED', 3, 'click'],
          ['title', 'OBS', 3, 'click'],
          ['title', 'OBS / RTMP / Stream / Restream', 3, 'click'],
          [1, 'badge', 'text-bg-danger', 'ms-1'],
          ['title', 'Start / Stop WebCam', 1, 'nav-item', 3, 'click'],
          ['id', 'startStopWebCam', 1, 'nav-link', 'd-flex', 'align-items-center', 3, 'ngClass'],
          [1, 'fas', 'fa-2x', 'fa-video'],
          [
            'title',
            'Session Control',
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#session-control-modal',
            1,
            'nav-item',
            3,
            'click'
          ],
          [1, 'nav-link', 'd-flex', 'align-items-center'],
          [1, 'fas', 'fa-2x', 'fa-cog'],
          ['title', 'TAWK Support', 1, 'nav-item', 3, 'click'],
          [1, 'fas', 'fa-2x', 'fa-question-circle'],
          ['title', 'Mute Audio', 1, 'btn', 'btn-primary', 'btn-sm', 3, 'click'],
          ['title', 'Unmute Audio', 1, 'btn', 'btn-primary', 'btn-sm', 3, 'click'],
          [1, 'm-0'],
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
            'Background Volume',
            1,
            'px-0',
            'py-2',
            3,
            'ngModelChange',
            'input',
            'ngModel'
          ],
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
          [
            'minSize',
            '0',
            'id',
            'mainAreaSplit',
            'gutterDblClickDuration',
            '400',
            3,
            'dragEnd',
            'gutterDblClick',
            'dragStart',
            'direction',
            'ngClass'
          ],
          ['minSize', '0', 1, 'alert-chat-box', 'alert-chat-regular', 3, 'size', 'order'],
          ['minSize', '0', 1, 'alert-chat-box', 'alert-chat-box-extra-column', 3, 'size', 'order'],
          ['minSize', '0', 1, 'presentation-box', 3, 'size', 'order'],
          ['minSize', '0', 3, 'dragEnd', 'direction'],
          ['minSize', '0', 1, 'alert-box', 3, 'size'],
          ['minSize', '0', 1, 'chat-box', 3, 'size'],
          [3, 'openPrivateChat'],
          [1, 'animated', 'fadeIn', 'mod-msg-container'],
          [3, 'scPlaying'],
          ['type', 'button', 1, 'btn', 'btn-sm', 'positionBtn'],
          [1, 'text-danger', 'd-flex', 'align-items-center', 'justify-content-between'],
          [1, 'mod-msg-btn', 3, 'click'],
          [1, 'fas', 'fa-times', 'text-warning'],
          [1, 'text-warning', 'mod-msg'],
          ['type', 'button', 1, 'btn', 'btn-sm', 'updatePositionBtn'],
          ['type', 'button', 1, 'btn', 'btn-sm', 'positionBtn', 3, 'click'],
          ['type', 'button', 1, 'btn', 'btn-sm', 'updatePositionBtn', 3, 'click'],
          [1, 'fas', 'fa-sync'],
          [
            'minSize',
            '0',
            'direction',
            'vertical',
            'id',
            'mainAreaSplit',
            'gutterDblClickDuration',
            '400',
            3,
            'gutterDblClick',
            'dragStart',
            'ngClass'
          ],
          ['minSize', '0', 1, 'presentation-box', 3, 'size'],
          ['minSize', '0', 1, 'alert-chat-box', 3, 'size'],
          ['minSize', '0', 1, 'alert-chat-box', 3, 'size', 'order'],
          ['direction', 'vertical', 'minSize', '0']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 4),
            H(1, QAe, 2, 0, 'ng-container'),
            d(2, 'div', 5),
            H(3, _Pe, 45, 12, 'div', 6)(4, A4e, 93, 42, 'nav', 7)(5, j4e, 4, 7, 'as-split', 8)(
              6,
              K4e,
              4,
              6
            ),
            u()(),
            H(7, Y4e, 3, 0, 'div', 9),
            d(8, 'div', 10),
            T(9, 'i', 11),
            v(10, ' Conected\n'),
            u(),
            T(11, 'app-user-info-modal')(12, 'app-play-youtube-modal')(
              13,
              'app-user-settings-modal'
            )(14, 'app-av-settings-modal')(15, 'app-debug-log-modal')(16, 'app-post-alert-modal')(
              17,
              'app-poll-modal',
              12
            )(18, 'app-chat-logs-modal')(19, 'app-alert-logs-modal')(
              20,
              'app-session-control-modal'
            )(21, 'app-mobile-app-info-modal')(22, 'app-reply-modal')(23, 'app-alert-qa-modal')(
              24,
              'app-muted-users-modal'
            )(25, 'app-followed-users-modal')(26, 'app-screenshare-preview')(27, 'app-rec-preview')(
              28,
              'app-followed-users-modal'
            )(29, 'app-scheduled-alerts-modal')(30, 'app-alert-send-report-modal')(
              31,
              'app-all-user-pmmodal'
            )(32, 'app-alerts-advanced-search')(33, 'app-alert-filter-modal')(
              34,
              'app-webrtc-troubleshooter'
            )(35, 'app-rich-text-editor')(36, 'app-privchat', 13, 0)),
            2 & i &&
              (z(
                'ngClass',
                Kn(
                  6,
                  KAe,
                  o.showSidebar,
                  o.appService.globals.videoOnlyMode ||
                    o.appService.globals.chatOnlyMode ||
                    o.appService.globals.viewerOnlyMode
                )
              ),
              m(),
              O(1, o.showWebcams ? 1 : -1),
              m(2),
              O(
                3,
                o.appService.globals.videoOnlyMode ||
                  o.appService.globals.chatOnlyMode ||
                  o.appService.globals.viewerOnlyMode
                  ? -1
                  : 3
              ),
              m(),
              O(
                4,
                o.appService.globals.videoOnlyMode ||
                  o.appService.globals.chatOnlyMode ||
                  o.appService.globals.viewerOnlyMode
                  ? -1
                  : 4
              ),
              m(),
              O(5, o.isMobileScreen ? 6 : 5),
              m(2),
              O(7, o.appService.globals.socketConnected ? -1 : 7)));
        },
        dependencies: [
          Di,
          ai,
          Jg,
          ti,
          Yn,
          FO,
          Use,
          ha,
          rL,
          Aue,
          f0e,
          a2e,
          wB,
          B2e,
          DB,
          CTe,
          OTe,
          JTe,
          ZTe,
          AB,
          ODe,
          fEe,
          RB,
          ixe,
          cxe,
          OB,
          NB,
          LB,
          jxe,
          Vxe,
          s3e,
          VB,
          f3e,
          HB,
          lMe,
          pMe,
          kMe,
          NMe,
          iAe,
          GB,
          Cd
        ],
        styles: [
          '@charset "UTF-8";body[_ngcontent-%COMP%]{width:100vw;height:100%}.container-fluid[_ngcontent-%COMP%]{padding:0}.sidebar-menu[_ngcontent-%COMP%], .users[_ngcontent-%COMP%], .helpLink[_ngcontent-%COMP%], .navbar-nav[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{cursor:pointer;margin:0 5px}.mobile-info-app-btn[_ngcontent-%COMP%]:hover{cursor:pointer}.sidebar-menu[_ngcontent-%COMP%], .users[_ngcontent-%COMP%], .helpLink[_ngcontent-%COMP%]{font-size:18px}.sidebar-menu[_ngcontent-%COMP%]{padding:1px 5px;border:1px solid transparent}.sidebar-menu[_ngcontent-%COMP%]:hover{color:var(--lighter-gray);border:1px solid transparent}.users[_ngcontent-%COMP%]{color:var(--users-color);border:1px solid var(--users-border-color);font-size:14px;padding:1px 5px}.sidebar-menu[_ngcontent-%COMP%]{background-color:var(--sidebar-menu-bg);color:var(--sidebar-menu-color)}.active-icon[_ngcontent-%COMP%]{color:var(--sidebar-menu-active-color);border:1px solid var(--sidebar-menu-active-color);border-radius:5px;transition:all .5s}.room-sound-options[_ngcontent-%COMP%]{text-align:left;padding-left:30px}.room-sound-options[_ngcontent-%COMP%]   .form-check-label[_ngcontent-%COMP%]:hover{opacity:.85;cursor:pointer}.soundcloud-options[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]:hover, .screen-options-start-screen[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]:hover, .screen-options[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]:hover{cursor:pointer;color:var(--light-black)}.volumeControl[_ngcontent-%COMP%]{text-align:center;color:var(--light-gray);background-color:var(--darker-black)}.notConnectedOverlay[_ngcontent-%COMP%]{display:block;position:absolute;bottom:5px;right:5px;z-index:10000;background-color:#000;color:var(--presenter-noRecording-color);opacity:.7}.positionBtn[_ngcontent-%COMP%]{display:block;position:absolute;bottom:18px;right:5px;z-index:11;border-color:#00bc8c;color:#00bc8c}.positionBtn[_ngcontent-%COMP%]:hover{color:#000;background-color:#00bc8c}.updatePositionBtn[_ngcontent-%COMP%]{display:block;position:absolute;bottom:18px;right:122px;z-index:11;border-color:#00bc8c;color:#00bc8c}.updatePositionBtn[_ngcontent-%COMP%]:hover{color:#000;background-color:#00bc8c}.recIndicatorStart[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{line-height:41px;color:#ff0}.talkingIndicator[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{color:var(--presenter-noRecording-color)}.recIndicator[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{color:var(--presenter-recording-color)}.wrapper[_ngcontent-%COMP%]{position:relative;display:inline-block;margin-top:49px;color:var(--light-gray);background-color:var(--darker-black)}.push-wrapper[_ngcontent-%COMP%]{left:250px;width:calc(100% - 250px)}.gutter[_ngcontent-%COMP%]{background-color:var(--split-gutter-bg);background-repeat:no-repeat;background-position:50%}.gutter-horizontal[_ngcontent-%COMP%]{background-image:url(/static/img/grips/vertical.png);cursor:ew-resize;height:calc(100vh - 60px);z-index:5}.gutter-vertical[_ngcontent-%COMP%]{background-image:url(/static/img/grips/horizontal.png);cursor:ns-resize;z-index:5}.box-left[_ngcontent-%COMP%], .box-right[_ngcontent-%COMP%]{height:calc(100vh - 60px)}.brand-logo[_ngcontent-%COMP%]{max-width:200px;height:auto;max-height:40px}#mainAreaSplit[_ngcontent-%COMP%]{height:calc(100vh - 49px);width:100vw}#connectedMsg[_ngcontent-%COMP%]{display:none}.room-sidebar[_ngcontent-%COMP%]   .navbar-nav[_ngcontent-%COMP%]{overflow:hidden auto!important}.h-inherit[_ngcontent-%COMP%]{height:inherit!important}.vh-100[_ngcontent-%COMP%]{height:100vh!important}.room-sidebar[_ngcontent-%COMP%]   .navbar-nav[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]{font-size:14px;font-weight:700;border-bottom:1px solid var(--sidebar-navItem-border-color);padding:5px 2px}.room-sidebar[_ngcontent-%COMP%]   .navbar-nav[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]:first-child{font-size:14px;font-weight:400}.room-sidebar[_ngcontent-%COMP%]   .navbar-nav[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]{margin-bottom:8px}.room-sidebar[_ngcontent-%COMP%]   .navbar-nav[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]   hr[_ngcontent-%COMP%]{margin:5px 0}.room-sidebar[_ngcontent-%COMP%]   .navbar-nav[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]   .saves-bandwidth[_ngcontent-%COMP%]{font-size:11px}.room-sidebar[_ngcontent-%COMP%]   .navbar-nav[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]   .dropdown-toggle[_ngcontent-%COMP%]:after{float:right;margin:10px 10px 15px}.hidden[_ngcontent-%COMP%]{display:none}.privChatHolder[_ngcontent-%COMP%]{display:none;position:fixed;left:50%;bottom:0;margin:0 auto;z-index:500;border:1px solid rgb(133,133,133);background-color:#000;width:600px;height:400px;max-width:calc(100vw - 100px)!important;max-height:calc(100vh - 50px)!important;font-size:14px}.pollModalHolder[_ngcontent-%COMP%]{display:none;position:fixed;left:50%;top:50%;margin:0 auto;z-index:501;border:1px solid rgb(133,133,133);border-radius:4px;background-color:#1e1e1e;width:580px;height:553px;max-width:calc(100vw - 100px)!important;max-height:calc(100vh - 50px)!important;font-size:14px;box-shadow:0 4px 20px #00000080;overflow:visible;padding:10px}.sidebar-wrapper[_ngcontent-%COMP%]{position:absolute!important;margin-left:-250px;top:0;height:calc(100vh - 49px);width:250px;background-color:var(--sidebar-wrapper-bg-color)!important;color:var(--sidebar-wrapper-color)!important;z-index:3}.themes[_ngcontent-%COMP%]   .form-check-input[_ngcontent-%COMP%]:checked + label[_ngcontent-%COMP%]{text-transform:uppercase;font-weight:700}.themes[_ngcontent-%COMP%]   .form-check-input[_ngcontent-%COMP%]{-webkit-appearance:none;-o-appearance:none;appearance:none;inset:5px 0 0;height:20px;width:20px;transition:all .15s ease-out 0s;background-color:var(--light-gray);border:none;color:var(--white);cursor:pointer;display:inline-block;margin-right:.5rem;outline:none;position:relative;z-index:1000;border-radius:50%}.themes[_ngcontent-%COMP%]   .form-check[_ngcontent-%COMP%]:hover{cursor:pointer}.themes[_ngcontent-%COMP%]   .form-check-input[_ngcontent-%COMP%]:checked{background-color:var(--checkbox-bg-color)}.themes[_ngcontent-%COMP%]   .form-check-input[_ngcontent-%COMP%]:checked:before{height:20px;width:20px;position:absolute;content:"\\2714";display:inline-block;font-size:20px;text-align:center;line-height:20px}.themes[_ngcontent-%COMP%]   .form-check-input[_ngcontent-%COMP%]:checked:after{animation:_ngcontent-%COMP%_click-wave .65s;background-color:var(--checkbox-bg-color);content:"";display:block;position:relative;z-index:100;border-radius:50%}@keyframes _ngcontent-%COMP%_click-wave{0%{height:40px;width:40px;opacity:.35;position:relative}to{height:200px;width:200px;margin-left:-80px;margin-top:-80px;opacity:0}}.navbar[_ngcontent-%COMP%]{padding:0;height:49px}.btnNavToggler[_ngcontent-%COMP%]{height:49px}.navbar-nav[_ngcontent-%COMP%]   .fa-1x[_ngcontent-%COMP%]{font-size:25px!important}#dropdownVolume[_ngcontent-%COMP%]{width:40px}#dropdownVolume[_ngcontent-%COMP%]:after{display:none}.screen-options[_ngcontent-%COMP%]{background-color:var(--white);font-size:16px;color:var(--darker-black);width:300px;padding:5px}.soundcloud-options[_ngcontent-%COMP%], .screen-options-start-screen[_ngcontent-%COMP%]{background-color:var(--white);font-size:16px;width:350px;color:var(--darker-black);padding:5px}.screen-options[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{text-decoration:none}.screen-options[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]:hover{color:var(--brown);background-color:var(--lighter-gray)}.screen-presenters[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]{font-size:14px}.screen-presenters[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]{padding-top:4px;padding-bottom:4px}.screen-presenters[_ngcontent-%COMP%]   i[_ngcontent-%COMP%]{vertical-align:middle;padding-right:5px}.screen-presenters-cmb[_ngcontent-%COMP%]{color:#fff!important;background-color:#363f45;border-color:#363f45;border-radius:3px}.presenter-img[_ngcontent-%COMP%]{max-width:28px}.volumeControl[_ngcontent-%COMP%]{text-align:center;color:var(--light-gray);background-color:var(--darker-black);border:1px solid #fafafa}.audioVolSlider[_ngcontent-%COMP%]{background-color:#fafafa}.volCtrl[_ngcontent-%COMP%]{background-color:var(--darker-black);height:32px;width:129px}.volumeControl[_ngcontent-%COMP%]   input[type=range][_ngcontent-%COMP%]::-moz-range-progress{background-color:#0d6efd;border-color:#0d6efd;height:8px;border-radius:3px}.volumeControl[_ngcontent-%COMP%]   input[type=range][_ngcontent-%COMP%]::-moz-range-thumb{background-color:#0d6efd;border-color:#0d6efd;height:13px;width:13px}.talkingIndicator[_ngcontent-%COMP%]{max-width:400px;white-space:nowrap;text-overflow:ellipsis}.talkingIndicator[_ngcontent-%COMP%]   a[_ngcontent-%COMP%], .recIndicator[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{line-height:41px;color:var(--presenter-noRecording-color)}.talkingIndicator[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{color:var(--presenter-noRecording-color);width:inherit;display:inline-flex;align-items:center;max-height:47px}.talkingIndicator[_ngcontent-%COMP%]   .talking-string[_ngcontent-%COMP%]{white-space:nowrap;overflow:auto hidden;width:100%;font-size:14px;margin:0 5px;height:100%;max-height:47px;max-width:250px}.recIndicator[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{color:var(--presenter-recording-color);max-width:117px;display:inline-block;width:100%}.talkingWaveform[_ngcontent-%COMP%]{max-height:25px;max-width:30px}.navbar-dark[_ngcontent-%COMP%]   .navbar-nav[_ngcontent-%COMP%]   .nav-link[_ngcontent-%COMP%], .muted[_ngcontent-%COMP%]{color:#abb0b5}.mic-gear-btn[_ngcontent-%COMP%]{font-size:.7rem;color:#abb0b5;cursor:pointer;transition:opacity .2s ease,color .2s ease;margin-left:-7px!important}.mic-gear-btn[_ngcontent-%COMP%]:hover{color:#fff!important}.mainNavItem[_ngcontent-%COMP%]{display:none;color:var(--light-gray)}#navbarsRoom[_ngcontent-%COMP%]{color:var(--navbar-color);background-color:var(--navbar-bg)}.btnNavToggler[_ngcontent-%COMP%]{color:var(--navbar-color)}.mainAppNav[_ngcontent-%COMP%]{color:var(--navbar-color);background-color:var(--navbar-bg)}.reload-room-users[_ngcontent-%COMP%]{background-color:var(--reload-icon-bg-color);color:var(--reload-icon-color)}.search-room-users[_ngcontent-%COMP%]{background-color:var(--search-icon-bg-color);color:var(--search-icon-color)}.active-room-users[_ngcontent-%COMP%]   .badge[_ngcontent-%COMP%]{background-color:var(--users-badge-bg-color);color:var(--users-badge-color)}.ptr-website-link[_ngcontent-%COMP%]{color:var(--ptr-website-link-color)}.mobile-app-info[_ngcontent-%COMP%]{background-color:var(--mobileApp-info-bg-color);color:var(--mobileApp-info-color)}.mobile-app-info[_ngcontent-%COMP%]:hover{opacity:.9}.benzinga-logo[_ngcontent-%COMP%]{max-height:25px!important}.sidebar-item[_ngcontent-%COMP%]{color:inherit!important}.sidebar-item[_ngcontent-%COMP%]:hover{background-color:#e9ecef}.room-split-dir[_ngcontent-%COMP%]{flex-direction:row-reverse!important;direction:ltr!important}.user-options[_ngcontent-%COMP%]   .dropdown-menu[_ngcontent-%COMP%]{position:absolute!important;z-index:1000!important;top:30px!important;left:-106px!important;width:228px;font-size:13px;padding:2px}.user-options[_ngcontent-%COMP%]   .dropdown-toggle[_ngcontent-%COMP%]:after{display:none!important}.users-btns[_ngcontent-%COMP%]   .btn[_ngcontent-%COMP%]{padding:3px 6px}.recording-reminder[_ngcontent-%COMP%]{position:absolute;top:50px;left:-50px;background-color:#fff;color:#000;width:160px;padding:5px 5px 5px 10px;font-size:12px;display:flex;align-items:center;justify-content:space-between}.recording-reminder-arrow[_ngcontent-%COMP%]{width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:5px solid #fff;position:absolute;top:-5px;left:75px}.benzinga-logo-alt[_ngcontent-%COMP%]{background-color:#000;width:100%!important;max-height:25px!important;max-width:230px!important}.blinking-rec[_ngcontent-%COMP%]{animation:_ngcontent-%COMP%_blinking 1s step-start infinite}.mod-msg-container[_ngcontent-%COMP%]{background-color:#000;position:absolute;bottom:5px;left:0;width:85%;z-index:11;padding:10px;margin:0 10px;border-radius:5px}.mod-msg-btn[_ngcontent-%COMP%]{margin:0 10px;font-size:20px}.mod-msg-btn[_ngcontent-%COMP%]:hover{cursor:pointer;opacity:.85}@keyframes _ngcontent-%COMP%_blinking{50%{opacity:0}}.breathing-rec[_ngcontent-%COMP%]{color:red!important;animation:_ngcontent-%COMP%_breathing 5s ease-out infinite normal}@keyframes _ngcontent-%COMP%_breathing{0%{transform:scale(.9)}25%{transform:scale(1.1)}60%{transform:scale(.9)}to{transform:scale(.9)}}@media only screen and (min-width: 768px) and (max-width: 930px){#navbarsRoom[_ngcontent-%COMP%], #navbarsRoom[_ngcontent-%COMP%]   .fa-2x[_ngcontent-%COMP%]{font-size:15px}#navbarsRoom[_ngcontent-%COMP%]   .talkingIndicator[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{font-size:12px}.brand-logo[_ngcontent-%COMP%]{max-width:150px}}@media only screen and (max-width: 768px){.mainNavItem[_ngcontent-%COMP%]{display:block}}@media only screen and (max-width: 600px){.soundcloud-options[_ngcontent-%COMP%], .screen-options-start-screen[_ngcontent-%COMP%]{width:inherit!important}.brand-logo[_ngcontent-%COMP%]{max-width:120px}#textAreaHolder[_ngcontent-%COMP%]{min-height:150px!important}}'
        ]
      });
    }
  }
  return t;
})();
