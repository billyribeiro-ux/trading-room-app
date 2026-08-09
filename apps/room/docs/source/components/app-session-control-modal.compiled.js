AB = (() => {
  class t {
    onRestreamLinkChange(e) {
      this.restreamLink = e.target.value;
    }
    constructor(e, i, o, s) {
      ((this.appService = e),
        (this.modalService = i),
        (this.mediasoup = o),
        (this.alertService = s),
        (this.config = {
          placeholder: 'Type your note here and press save',
          height: '600',
          toolbar: [
            ['style', ['style']],
            ['view', ['fullscreen', 'codeview']],
            ['misc', ['undo', 'redo']],
            ['font', ['bold', 'italic', 'underline', 'clear']],
            ['fontname', ['fontname']],
            ['fontsize', ['fontsize']],
            ['color', ['color']],
            ['para', ['ul', 'ol', 'paragraph']],
            ['height', ['height']],
            ['table', ['table']],
            ['insert', ['link', 'picture', 'video', 'emoji']]
          ],
          popover: {
            image: [
              ['custom', ['imageAttributes']],
              ['image', ['resizeFull', 'resizeHalf', 'resizeQuarter', 'resizeNone']],
              ['float', ['floatLeft', 'floatRight', 'floatNone']],
              ['remove', ['removeMedia']]
            ]
          }
        }),
        (this.audioDevicesList = []),
        (this.videoDevicesList = []),
        (this.isInited = !1),
        (this.useMTX = !1),
        (this.devicesLoading = !1),
        (this.devicesLoadError = ''),
        (this.serverArr = []),
        (this.streamingLink = ''),
        (this.streamKey = ''),
        (this.streamingLinkRTMP = ''),
        (this.streamingLinkPlayer = ''),
        (this.streamingPlayerEnabled = !1),
        (this.yourName = 'OBSStream'),
        (this.streamingType = 'RTMP'));
    }
    ngOnInit() {
      (this.appService.guiEventBus.subscribe('doSessionControlModal', () => {
        ($r('#session-control-modal').modal('show'),
          this.isInited ||
            ($r('#summernoteClosedMsg').summernote(this.config), (this.isInited = !0)));
      }),
        this.appService.appEventBus.subscribe('globalsLoaded', () => {
          this.handleStreaming();
        }));
    }
    ngAfterViewInit() {
      var e = this;
      this.appService.globals.isPresenter &&
        !this.appService.globals.chatOnlyMode &&
        (this.loadDevices(),
        I(function* () {
          let i = yield e.appService.invokeAdminCmd('getStreamServers');
          ((e.serverArr = i.servers), P('streamServers: ', e.serverArr), e.handleStreaming());
        })());
    }
    handleStreaming() {
      var e = this;
      return I(function* () {
        (yield e.getPlayerLink(),
          (e.yourName = encodeURIComponent(
            e.appService.globals.user.name.replace(/[^a-zA-Z0-9_-]/g, '_')
          )),
          e.appService.globals.sessData.useMediaMTX
            ? ((e.useMTX = !0),
              (e.streamingLinkRTMP = `rtmp://${e.appService.globals.streamServerMTX}/room__${e.appService.globals.sessionID}__${e.yourName}?jwt=${e.appService.globals.mtxToken}`),
              (e.restreamLink = e.appService.globals.sessData.restreamToURL
                ? e.appService.globals.sessData.restreamToURL
                : ''),
              (e.streamKey = e.appService.globals.mtxToken),
              (e.streamingLink = `http://${e.appService.globals.streamServerMTX}:8889/room__${e.appService.globals.sessionID}__${e.yourName}/whip`))
            : (e.streamingLink = e.appService.globals.sessData.obsStreamKey
                ? `https://${e.appService.globals.streamServer}/api/stream/${e.appService.globals.sessionID}/${e.appService.globals.sessData.obsStreamKey}?name=${e.yourName}`
                : ''),
          e.appService.globals.sessData.strreamingPlayerEnabled &&
            (e.streamingPlayerEnabled = e.appService.globals.sessData.streamingPlayerEnabled));
      })();
    }
    done() {
      $r('#session-control-modal').modal('hide');
    }
    onAudioDeviceChange(e) {
      (console.log('onAudioDeviceChange: ' + e),
        this.appService.globals.audioDeviceID !== e &&
          ((this.appService.globals.audioDeviceID = e),
          this.appService.localstorage.set('audioDeviceID', e)));
    }
    onVideoDeviceChange(e) {
      this.appService.globals.videoDeviceID !== e &&
        ((this.appService.globals.videoDeviceID = e),
        this.appService.localstorage.set('videoDeviceID', e));
    }
    submitNewDevices(e) {
      console.log(e.form.value);
      const i = e.form.value.audioID || '',
        o = e.form.value.videoID || '';
      (this.appService.globals.audioDeviceID !== i &&
        ((this.appService.globals.audioDeviceID = i),
        this.appService.localstorage.set('audioDeviceID', i)),
        this.appService.globals.videoDeviceID !== o &&
          ((this.appService.globals.videoDeviceID = o),
          this.appService.localstorage.set('videoDeviceID', o)));
    }
    setNewDevices() {
      const e = $r('#audio-deviceList').val(),
        i = $r('#video-deviceList').val();
      (console.log('soundID: ' + e),
        console.log('videoI: ' + i),
        this.appService.globals.audioDeviceID !== e &&
          ((this.appService.globals.audioDeviceID = e),
          this.appService.localstorage.set('audioDeviceID', e)),
        this.appService.globals.videoDeviceID !== i &&
          ((this.appService.globals.videoDeviceID = i),
          this.appService.localstorage.set('videoDeviceID', i)));
    }
    getDeviceLabel(e, i) {
      const s = ('audioinput' === i ? this.audioDevicesList : this.videoDevicesList).find(
        (r) => r.deviceId === e
      );
      return s ? s.label : 'Unknown Device';
    }
    loadDevices() {
      var e = this;
      ((this.devicesLoading = !0),
        (this.devicesLoadError = ''),
        (this.audioDevicesList = []),
        (this.videoDevicesList = []),
        I(function* () {
          try {
            const i = [];
            try {
              const s = yield navigator.mediaDevices.getUserMedia({ audio: !0 });
              (i.push(s), P('Audio permission granted'));
            } catch (s) {
              P('Audio permission denied or no audio device:', s);
            }
            try {
              const s = yield navigator.mediaDevices.getUserMedia({ video: !0 });
              (i.push(s), P('Video permission granted'));
            } catch (s) {
              P('Video permission denied or no video device:', s);
            }
            0 === i.length &&
              P('No permissions granted, attempting to enumerate devices without labels');
            const o = yield navigator.mediaDevices.enumerateDevices();
            if (
              (P('ListDevices after getusermedia devices:', JSON.stringify(o)),
              $r('#audio-deviceList, #video-deviceList').find('option').remove(),
              o.forEach((s) => {
                let r = s.label;
                (null == r || '' === r) && (r = `${s.kind} (${s.deviceId.substring(0, 8)}...)`);
                const a = 'default' === s.deviceId || 'communications' === s.deviceId;
                let l = !1;
                if (r.toLowerCase().startsWith('default - ')) {
                  const h = r.substring(10);
                  l = o.some(
                    (f) => f.kind === s.kind && f.label === h && f.deviceId !== s.deviceId
                  );
                }
                const c = a || l;
                ('audioinput' != s.kind || c
                  ? 'videoinput' == s.kind && !c && e.videoDevicesList.push(s)
                  : e.audioDevicesList.push(s),
                  c && P(`Skipping virtual/duplicate device: ${r} (${s.deviceId})`));
              }),
              e.audioDevicesList.length > 0)
            ) {
              const s = e.audioDevicesList.some(
                (r) => r.deviceId === e.appService.globals.audioDeviceID
              );
              ((e.currentAudioDevice = s
                ? e.appService.globals.audioDeviceID
                : e.audioDevicesList[0].deviceId),
                s ||
                  ((e.appService.globals.audioDeviceID = e.currentAudioDevice),
                  e.appService.localstorage.set('audioDeviceID', e.currentAudioDevice),
                  P(`Set default audio device: ${e.currentAudioDevice}`)));
            }
            if (e.videoDevicesList.length > 0) {
              const s = e.videoDevicesList.some(
                (r) => r.deviceId === e.appService.globals.videoDeviceID
              );
              ((e.currentVideoDevice = s
                ? e.appService.globals.videoDeviceID
                : e.videoDevicesList[0].deviceId),
                s ||
                  ((e.appService.globals.videoDeviceID = e.currentVideoDevice),
                  e.appService.localstorage.set('videoDeviceID', e.currentVideoDevice),
                  P(`Set default video device: ${e.currentVideoDevice}`)));
            }
            (P(
              `Found ${e.audioDevicesList.length} audio devices and ${e.videoDevicesList.length} video devices`
            ),
              P(`Current audio device: ${e.currentAudioDevice}`),
              P(`Current video device: ${e.currentVideoDevice}`),
              0 === e.audioDevicesList.length &&
                0 === e.videoDevicesList.length &&
                (e.devicesLoadError =
                  'No audio or video devices detected. Please ensure devices are connected and permissions are granted.'),
              i.forEach((s) => {
                s.getTracks().forEach((r) => {
                  r.stop();
                });
              }),
              (e.devicesLoading = !1));
          } catch (i) {
            (P('Error loading devices:', i),
              (e.devicesLoading = !1),
              (e.devicesLoadError =
                'NotFoundError' === i.name
                  ? 'No audio or video devices found. Please connect a microphone and/or camera.'
                  : 'NotAllowedError' === i.name
                    ? 'Permission denied. Please allow access to your microphone and camera in your browser settings.'
                    : 'NotSupportedError' === i.name
                      ? 'Your browser does not support device enumeration. Please use a modern browser.'
                      : 'SecurityError' === i.name
                        ? 'Security error. Please ensure the page is loaded over HTTPS.'
                        : `Error loading devices: ${i.message || 'Unknown error'}`),
              console.error('Device enumeration error:', i));
          }
        })());
    }
    saveAndCloseSession() {
      let e = $r('#summernoteClosedMsg').summernote('code');
      (console.log('closedMsg:', e),
        this.done(),
        (this.appService.globals.sessData.closedTxt = e),
        this.appService.sendServerAdminCommand('saveAndCloseSession', { closedMsg: e }));
    }
    saveCloseMessage() {
      let e = $r('#summernoteClosedMsg').summernote('code');
      (this.appService.sendServerAdminCommand('saveCloseMessage', { closedMsg: e }),
        (this.appService.globals.sessData.closedTxt = e),
        bootbox.alert('Message Saved'));
    }
    openSession() {
      (this.done(), this.appService.sendServerAdminCommand('openSession', {}));
    }
    lockSession(e = !1) {
      (this.appService.sendServerAdminCommand('lockSession', { kick: e, lock: !0 }),
        bootbox.alert('Session Locked'));
    }
    unlockSession() {
      (this.appService.sendServerAdminCommand('lockSession', { lock: !1 }),
        bootbox.alert('Session Unlocked'));
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
    reloadSession() {
      bootbox.confirm('Are you sure you want to reload tge session config?', (e) => {
        e &&
          (this.done(),
          this.appService.sendServerAdminCommand('reloadSessionConfig', {}),
          bootbox.alert('Session config reloaded...'));
      });
    }
    resetAudioBridge() {
      bootbox.confirm('Are you sure you want to reset the audio bridge?', (e) => {
        e && (this.done(), this.appService.sendServerAdminCommand('resetAudioBridge', {}));
      });
    }
    resetAudioBridgeOnServer(e) {
      bootbox.confirm(`Are you sure you want to reset the audio on Server: ${e} ?`, (i) => {
        i &&
          (this.done(),
          this.appService.sendServerAdminCommand('resetAudioBridgeOnServer', { server: e }),
          bootbox.alert('Command send OK.'));
      });
    }
    softReset() {
      bootbox.confirm('Are you sure you want to soft reset the room?', (e) => {
        e &&
          (this.appService.sendServerAdminCommand('softResetSession', {}),
          this.done(),
          bootbox.alert('Soft reset request sent...'));
      });
    }
    getMediaServerLost() {
      var e = this;
      return I(function* () {
        let i = yield e.appService.invokeServerCommand('getMediaServerList', null);
        console.log('media resp:', i);
      })();
    }
    resetAllMediaServers() {
      this.appService.globals.sessData.deleteAlertPW
        ? bootbox.prompt({
            title: 'Please enter the password for this action:',
            value: '',
            callback: (e) => {
              e &&
                (e.trim() === this.appService.globals.sessData.deleteAlertPW
                  ? bootbox.confirm(
                      'Are you sure you want to hard reset ALL media servers ?',
                      (o) => {
                        o &&
                          (this.appService.sendServerAdminCommand('resetAllMediaServers', {}),
                          this.done(),
                          bootbox.alert('All Media Server reset request sent...'));
                      }
                    )
                  : bootbox.alert('Wrong password!'));
            }
          })
        : bootbox.confirm('Are you sure you want to hard reset ALL media servers ?', (e) => {
            e &&
              (this.appService.sendServerAdminCommand('resetAllMediaServers', {}),
              this.done(),
              bootbox.alert('All Media Server reset request sent...'));
          });
    }
    hardResetMediaServer(e) {
      bootbox.confirm('Are you sure you want to hard reset the media server?', (i) => {
        i &&
          (this.appService.sendServerAdminCommand('resetMediaServer', {}),
          this.done(),
          bootbox.alert('Media Server reset request sent...'));
      });
    }
    hardResetMediaServerOnServer(e) {
      this.appService.globals.sessData.deleteAlertPW
        ? bootbox.prompt({
            title: 'Please enter the password for this action:',
            value: '',
            callback: (i) => {
              i &&
                (i.trim() === this.appService.globals.sessData.deleteAlertPW
                  ? bootbox.confirm(
                      `Are you sure you want to hard reset the media server: ${e.name}. ip: ${e.ip} ?`,
                      (s) => {
                        s &&
                          (this.done(),
                          this.appService.sendServerAdminCommand('resetMediaServer', { server: e }),
                          bootbox.alert('Command send OK.'));
                      }
                    )
                  : bootbox.alert('Wrong password!'));
            }
          })
        : bootbox.confirm(
            `Are you sure you want to hard reset the media server: ${e.name}. ip: ${e.ip} ?`,
            (i) => {
              i &&
                (this.done(),
                this.appService.sendServerAdminCommand('resetMediaServer', { server: e }),
                bootbox.alert('Command send OK.'));
            }
          );
    }
    hardReset() {
      bootbox.confirm('Are you sure you want to reset the room?', (e) => {
        e &&
          (this.done(), this.appService.sendServerAdminCommand('hardResetSession', { revoke: !1 }));
      });
    }
    refreshRoster() {
      (this.appService.sendServerAdminCommand('refreshRoster', null),
        bootbox.alert(
          'Command send OK. Please allow 1/2 minute for old entries to get deleted from the list'
        ));
    }
    hardResetAndRevoke() {
      bootbox.confirm('Are you sure you want to reset the room?', (e) => {
        e &&
          (this.done(), this.appService.sendServerAdminCommand('hardResetSession', { revoke: !0 }));
      });
    }
    echoCancellationOnChange() {
      ((this.appService.globals.preferences.echoCancellation =
        !this.appService.globals.preferences.echoCancellation),
        this.appService.setPreference(
          'echoCancellation',
          this.appService.globals.preferences.echoCancellation
        ));
    }
    noiseSuppressionOnChange() {
      ((this.appService.globals.preferences.noiseSuppression =
        !this.appService.globals.preferences.noiseSuppression),
        this.appService.setPreference(
          'noiseSuppression',
          this.appService.globals.preferences.noiseSuppression
        ));
    }
    autoGainControlOnChange() {
      ((this.appService.globals.preferences.autoGainControl =
        !this.appService.globals.preferences.autoGainControl),
        this.appService.setPreference(
          'autoGainControl',
          this.appService.globals.preferences.autoGainControl
        ));
    }
    startStreaming() {
      var e = this;
      return I(function* () {
        let i = yield e.appService.invokeAdminCmd('startOBStream');
        (console.log('startStreaming rc:', i), (e.streamingLink = i.rc.streamURL));
      })();
    }
    stopStreaming() {
      var e = this;
      return I(function* () {
        (yield e.appService.sendServerAdminCommand('stopOBStream'), (e.streamingLink = ''));
      })();
    }
    getPlayerLink() {
      var e = this;
      return I(function* () {
        let i = yield e.appService.invokeAdminCmd('streamStatus');
        (console.log('getPlayerLink rc:', i),
          (e.streamingPlayerEnabled = i.rc.enablePlayer),
          (e.streamingLinkPlayer = i.rc.playerURL));
      })();
    }
    enablePlayer() {
      var e = this;
      return I(function* () {
        let i = yield e.appService.invokeAdminCmd('changePlayerStatus', { enablePlayer: !0 });
        (console.log('enablePlayer rc:', i), e.getPlayerLink());
      })();
    }
    disablePlayer() {
      var e = this;
      return I(function* () {
        let i = yield e.appService.invokeAdminCmd('changePlayerStatus', { enablePlayer: !1 });
        (console.log('disablePlayer rc:', i), (e.streamingPlayerEnabled = !1));
      })();
    }
    copyToClipboard() {
      var e = this;
      return I(function* () {
        const i = yield document.querySelector('#streaming-link');
        (yield i.select(),
          yield navigator.clipboard.writeText(i.value),
          e.alertService.success('Copied to clipboard.'));
      })();
    }
    copyToClipboardPlayer() {
      var e = this;
      return I(function* () {
        const i = yield document.querySelector('#streaming-link-playyer');
        (yield i.select(),
          yield navigator.clipboard.writeText(i.value),
          e.alertService.success('Copied to clipboard.'));
      })();
    }
    copyToClipboardRTMP() {
      var e = this;
      return I(function* () {
        const i = yield document.querySelector('#streaming-link-rtmp');
        (yield i.select(),
          yield navigator.clipboard.writeText(i.value),
          e.alertService.success('Copied to clipboard.'));
      })();
    }
    copyToClipboardBearer() {
      var e = this;
      return I(function* () {
        const i = yield document.querySelector('#stream-whip-key');
        (yield i.select(),
          yield navigator.clipboard.writeText(i.value),
          e.alertService.success('Copied to clipboard.'));
      })();
    }
    getNewToken() {
      var e = this;
      return I(function* () {
        let i = yield e.appService.invokeAdminCmd('getRTMPToken');
        (console.log('getNewToken rc:', i),
          (e.appService.globals.mtxToken = i.rtmpToken),
          (e.yourName = encodeURIComponent(
            e.appService.globals.user.name.replace(/[^a-zA-Z0-9_-]/g, '_')
          )),
          (e.streamingLinkRTMP = `rtmp://${e.appService.globals.streamServerMTX}/room__${e.appService.globals.sessionID}__${e.yourName}?jwt=${e.appService.globals.mtxToken}`));
      })();
    }
    validURL(e) {
      return e.toLowerCase().includes('http://') || e.toLowerCase().includes('https://');
    }
    sendVideoToRoom() {
      bootbox.prompt({
        title: 'Please enter the URL:',
        value: '',
        callback: (e) => {
          if (e) {
            const i = e.trim();
            if (this.validURL(i)) {
              this.done();
              let o = [];
              const s = this.appService.localstorage.get(
                `videos-${this.appService.globals.sessionID}`,
                ''
              );
              if ((s && (o = JSON.parse(s)), o.length > 0 && o.includes(i)))
                return void bootbox.alert('Video already exists.');
              (o.push(i),
                this.appService.localstorage.set(
                  `videos-${this.appService.globals.sessionID}`,
                  JSON.stringify(o)
                ),
                bootbox.alert('Video added.'));
            } else bootbox.alert('The link seems to be missing "https://" or "http://"');
          }
        }
      });
    }
    sendSalesImageToChat() {
      bootbox.prompt({
        title: 'Please enter the URL:',
        value: '',
        callback: (e) => {
          if (e) {
            const i = e.trim();
            this.validURL(i)
              ? (this.done(),
                this.appService.sendServerAdminCommand('sendSalesImageToChat', {
                  url: i,
                  sessID: this.appService.globals.sessionID
                }),
                bootbox.alert('Command send OK.'))
              : bootbox.alert('The link seems to be missing "https://" or "http://"');
          }
        }
      });
    }
    sendUsersToURL() {
      var e = this;
      return I(function* () {
        bootbox.prompt({
          title: 'Please enter the URL:',
          value: '',
          callback: (i) => {
            if (i) {
              const o = i.trim();
              e.validURL(o)
                ? (e.done(),
                  e.appService.sendServerAdminCommand('sendUsersToURL', {
                    url: o,
                    sessID: e.appService.globals.sessionID
                  }),
                  bootbox.alert('Command send OK.'))
                : bootbox.alert('The link seems to be missing "https://" or "http://"');
            }
          }
        });
      })();
    }
    sendRTMPoutput() {}
    switchToBackup() {
      this.appService.globals.sessData.deleteAlertPW
        ? bootbox.prompt({
            title: 'Please enter the password for this action:',
            value: '',
            callback: (e) => {
              e &&
                (e.trim() === this.appService.globals.sessData.deleteAlertPW
                  ? bootbox.confirm(
                      'Are you sure you want to switch to the backup cluster? this will result in a soft reset of the session.',
                      (o) => {
                        o &&
                          (this.appService.invokeAdminCmd('swapBackupClusterID', {}),
                          this.done(),
                          bootbox.alert(
                            'Switch to backup cluster request sent... Session will soft reset...'
                          ));
                      }
                    )
                  : bootbox.alert('Wrong password!'));
            }
          })
        : bootbox.confirm(
            'Are you sure you want to switch to the backup cluster? this will result in a soft reset of the session.',
            (e) => {
              e &&
                (this.appService.invokeAdminCmd('swapBackupClusterID', {}),
                this.done(),
                bootbox.alert('Switch to backup cluster request sent...'));
            }
          );
    }
    startRestream(e = !1) {
      if (e)
        return (
          this.appService.invokeAdminCmd('setRestreamURL', { restreamToURL: '' }),
          void (this.restreamLink = '')
        );
      this.restreamLink.startsWith('rtmp://') && !this.restreamLink.includes(' ')
        ? this.appService.invokeAdminCmd('setRestreamURL', { restreamToURL: this.restreamLink })
        : bootbox.alert(
            'Invalid RTMP link!, please make sure it starts with "rtmp://" and does not contain spaces or special characters. For example: rtmp://example.com/live/stream'
          );
    }
    openRestreamTab() {
      $r('#restream-tab').tab('show');
    }
    adminLogin() {
      bootbox.confirm('Are you sure you want to login to the Admin Dashboard?', (e) => {
        e && this.appService.doAdminLogin();
      });
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(ZC), be(fa), be(fo));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-session-control-modal']],
        decls: 13,
        vars: 2,
        consts: [
          ['form', 'ngForm'],
          [
            'id',
            'session-control-modal',
            'tabIndex',
            '-1',
            'role',
            'dialog',
            'aria-labelledby',
            'session-control',
            'aria-hidden',
            'true',
            1,
            'modal',
            'fade'
          ],
          ['role', 'document', 1, 'modal-dialog', 'modal-lg'],
          [1, 'modal-content'],
          [1, 'modal-header'],
          ['id', 'session-control', 1, 'modal-title'],
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
          [1, 'modal-footer'],
          ['type', 'button', 1, 'btn', 'btn-success', 'btn-block', 3, 'click'],
          ['id', 'myTab', 'role', 'tablist', 1, 'nav', 'nav-tabs'],
          ['role', 'presentation', 1, 'nav-item'],
          [
            'id',
            'reset-session-tab',
            'data-bs-toggle',
            'tab',
            'data-bs-target',
            '#reset-session',
            'role',
            'tab',
            'aria-controls',
            'reset-session',
            'aria-selected',
            'true',
            1,
            'nav-link',
            'active'
          ],
          [
            'id',
            'close-session-tab',
            'data-bs-toggle',
            'tab',
            'data-bs-target',
            '#close-session',
            'role',
            'tab',
            'aria-controls',
            'close-session',
            'aria-selected',
            'false',
            1,
            'nav-link'
          ],
          [
            'id',
            'lock-session-tab',
            'data-bs-toggle',
            'tab',
            'data-bs-target',
            '#lock-session',
            'role',
            'tab',
            'aria-controls',
            'lock-session',
            'aria-selected',
            'false',
            1,
            'nav-link'
          ],
          [
            'id',
            'av-device-selection-tab',
            'data-bs-toggle',
            'tab',
            'data-bs-target',
            '#av-device-selection',
            'role',
            'tab',
            'aria-controls',
            'av-device-selection',
            'aria-selected',
            'false',
            1,
            'nav-link'
          ],
          [
            'id',
            'streaming-selection-tab',
            'data-bs-toggle',
            'tab',
            'data-bs-target',
            '#streaming-selection',
            'role',
            'tab',
            'aria-controls',
            'streaming-selection',
            'aria-selected',
            'false',
            1,
            'nav-link'
          ],
          ['id', 'myTabContent', 1, 'tab-content'],
          [
            'id',
            'reset-session',
            'role',
            'tabpanel',
            'aria-labelledby',
            'reset-session-tab',
            1,
            'tab-pane',
            'fade',
            'show',
            'active'
          ],
          [1, 'row', 'mt-4'],
          [1, 'col', 'border-right', 'pr-4'],
          ['type', 'button', 1, 'btn', 'btn-outline-light', 'mr-2', 3, 'click'],
          [1, 'small', 'mt-2'],
          [2, 'text-decoration', 'underline'],
          ['type', 'button', 1, 'btn', 'btn-primary', 'mr-2', 3, 'click'],
          ['type', 'button', 1, 'btn', 'btn-info', 'mx-2'],
          ['type', 'button', 1, 'btn', 'btn-danger', 'mr-2', 3, 'click'],
          [1, 'col', 'pl-4'],
          [1, 'fas', 'fa-comments'],
          [1, 'custom-control', 'custom-radio', 'my-2'],
          [
            'type',
            'radio',
            'id',
            'customRadio1',
            'value',
            'g',
            'name',
            'customRadio',
            1,
            'custom-control-input',
            3,
            'click',
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'customRadio1', 1, 'custom-control-label'],
          [
            'type',
            'radio',
            'id',
            'customRadio2',
            'value',
            'p',
            'name',
            'customRadio',
            1,
            'custom-control-input',
            3,
            'click',
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'customRadio2', 1, 'custom-control-label'],
          [
            'type',
            'radio',
            'id',
            'customRadio3',
            'value',
            'd',
            'name',
            'customRadio',
            1,
            'custom-control-input',
            3,
            'click',
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'customRadio3', 1, 'custom-control-label'],
          [
            'id',
            'close-session',
            'role',
            'tabpanel',
            'aria-labelledby',
            'close-session-tab',
            1,
            'tab-pane',
            'fade'
          ],
          [1, 'd-flex', 'justify-content-center'],
          ['type', 'button', 1, 'btn', 'btn-outline-light', 'mr-2', 'my-2', 3, 'click'],
          [1, 'fas', 'fa-save'],
          ['id', 'summernoteClosedMsg', 3, 'innerHTML'],
          [
            'id',
            'lock-session',
            'role',
            'tabpanel',
            'aria-labelledby',
            'lock-session-tab',
            1,
            'tab-pane',
            'fade'
          ],
          ['type', 'button', 1, 'btn', 'btn-warning', 'm-2', 3, 'click'],
          ['type', 'button', 1, 'btn', 'btn-danger', 'm-2', 3, 'click'],
          ['type', 'button', 1, 'btn', 'btn-success', 'm-2', 3, 'click'],
          [
            'id',
            'av-device-selection',
            'role',
            'tabpanel',
            'aria-labelledby',
            'av-device-selection-tab',
            1,
            'tab-pane',
            'fade'
          ],
          [1, 'd-flex', 'justify-content-end', 'align-items-center', 'mt-2', 'mb-3'],
          [
            'type',
            'button',
            'title',
            'Refresh device list',
            1,
            'btn',
            'btn-sm',
            'btn-outline-primary',
            3,
            'click',
            'disabled'
          ],
          [1, 'fas', 3, 'ngClass'],
          [1, 'alert', 'alert-info'],
          [1, 'alert', 'alert-danger'],
          [1, 'mt-2'],
          [1, 'form-group'],
          [1, 'mt-4'],
          [1, 'ml-4'],
          [
            'type',
            'checkbox',
            'name',
            'echo-cancellation',
            'value',
            'Echo Cancellation',
            'id',
            'echo-cancellation',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'echo-cancellation', 1, 'form-check-label'],
          [
            'type',
            'checkbox',
            'name',
            'noise-suppression',
            'value',
            'Noise Suppression',
            'id',
            'noise-suppression',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'noise-suppression', 1, 'form-check-label'],
          [
            'type',
            'checkbox',
            'name',
            'auto-gain-control',
            'value',
            'Auto Gain Control',
            'id',
            'auto-gain-control',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'auto-gain-control', 1, 'form-check-label'],
          [
            'id',
            'streaming-selection',
            'role',
            'tabpanel',
            'aria-labelledby',
            'streaming-selection-tab',
            1,
            'tab-pane',
            'fade'
          ],
          ['id', 'streaming-settings-tab', 'role', 'tablist', 1, 'nav', 'nav-tabs'],
          [1, 'nav-item'],
          [
            'id',
            'obs-streaming-tab',
            'data-bs-toggle',
            'tab',
            'href',
            '#obs-streaming',
            'role',
            'tab',
            'aria-controls',
            'obs-streaming',
            'aria-selected',
            'false',
            1,
            'nav-link',
            'active'
          ],
          [
            'id',
            'restream-tab',
            'data-bs-toggle',
            'tab',
            'href',
            '#restream',
            'role',
            'tab',
            'aria-controls',
            'restream',
            'aria-selected',
            'false',
            1,
            'nav-link'
          ],
          [
            'id',
            'stream-player-tab',
            'data-bs-toggle',
            'tab',
            'href',
            '#stream-player',
            'role',
            'tab',
            'aria-controls',
            'stream-player',
            'aria-selected',
            'true',
            1,
            'nav-link'
          ],
          ['id', 'streaming-settings-tabContent', 1, 'tab-content'],
          [
            'id',
            'stream-player',
            'role',
            'tabpanel',
            'aria-labelledby',
            'stream-player-tab',
            1,
            'tab-pane',
            'fade'
          ],
          [1, 'btn', 'btn-outline-primary', 'btn-sm', 'm-1', 3, 'click'],
          [1, 'fas', 'fa-desktop'],
          [1, 'btn', 'btn-outline-danger', 'btn-sm', 'm-1', 3, 'click'],
          [1, 'fas', 'fa-stop'],
          [
            'id',
            'obs-streaming',
            'role',
            'tabpanel',
            'aria-labelledby',
            'obs-streaming-tab',
            1,
            'tab-pane',
            'fade',
            'show',
            'active'
          ],
          [1, 'form-group', 'm-4', 'w-100', 'text-center'],
          [1, 'form-check', 'form-check-inline'],
          [
            'type',
            'radio',
            'name',
            'streaming-rtmp',
            'id',
            'streaming-rtmp',
            'value',
            'RTMP',
            'required',
            '',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'streaming-rtmp', 1, 'form-check-label', 'font-weight-bold'],
          [
            'type',
            'radio',
            'name',
            'streaming-whip',
            'id',
            'streaming-whip',
            'value',
            'WHIP',
            'required',
            '',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'streaming-whip', 1, 'form-check-label', 'font-weight-bold'],
          [1, 'mt-1'],
          [
            'id',
            'restream',
            'role',
            'tabpanel',
            'aria-labelledby',
            'restream-tab',
            1,
            'tab-pane',
            'fade'
          ],
          [
            'id',
            'restream-link',
            1,
            'form-control',
            'border',
            'border-danger',
            2,
            'height',
            '100px',
            3,
            'ngModelChange',
            'change',
            'ngModel'
          ],
          [1, 'btn', 'btn-outline-info', 'btn-sm', 'm-1', 3, 'click'],
          [1, 'btn', 'btn-outline-warning', 'btn-sm', 'm-1', 3, 'click'],
          [
            'id',
            'session-history',
            'role',
            'tabpanel',
            'aria-labelledby',
            'session-history-tab',
            1,
            'tab-pane',
            'fade'
          ],
          [
            'id',
            'webinar-tools',
            'role',
            'tabpanel',
            'aria-labelledby',
            'webinar-tools-tab',
            1,
            'tab-pane',
            'fade'
          ],
          [
            'id',
            'session-history-tab',
            'data-bs-toggle',
            'tab',
            'data-bs-target',
            '#session-history',
            'role',
            'tab',
            'aria-controls',
            'session-history',
            'aria-selected',
            'false',
            1,
            'nav-link'
          ],
          [
            'id',
            'webinar-tools-tab',
            'data-bs-toggle',
            'tab',
            'data-bs-target',
            '#webinar-tools',
            'role',
            'tab',
            'aria-controls',
            'webinar-tools',
            'aria-selected',
            'false',
            1,
            'nav-link'
          ],
          ['type', 'button', 1, 'btn', 'btn-info', 'mx-2', 3, 'click'],
          ['type', 'button', 1, 'btn', 'btn-outline-primary', 'm-2', 3, 'click'],
          [1, 'fas', 'fa-spinner', 'fa-spin'],
          [1, 'fas', 'fa-exclamation-triangle'],
          ['type', 'button', 1, 'btn', 'btn-sm', 'btn-outline-secondary', 'ml-2', 3, 'click'],
          [1, 'fas', 'fa-redo'],
          ['for', 'audio-deviceList'],
          [
            'id',
            'audio-deviceList',
            'aria-label',
            'Audio device (input)',
            1,
            'form-select',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [3, 'value', 'selected'],
          [1, 'text-white', 'mt-1', 'd-block'],
          [1, 'fas', 'fa-check-circle', 'text-success'],
          [1, 'form-group', 'text-white'],
          [1, 'fas', 'fa-microphone-slash'],
          ['for', 'video-deviceList'],
          [
            'id',
            'video-deviceList',
            'aria-label',
            'Video device (input)',
            1,
            'form-select',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [1, 'fas', 'fa-video-slash'],
          [1, 'd-flex', 'align-items-center'],
          ['for', 'streaming-link', 1, 'form-label', 'me-2'],
          [1, 'fas', 'fa-copy'],
          [
            'id',
            'streaming-link-playyer',
            'readonly',
            'readonly',
            1,
            'form-control',
            'border',
            2,
            'height',
            '100px',
            3,
            'value'
          ],
          [1, 'm-2'],
          [1, 'fas', 'fa-sync'],
          [
            'id',
            'streaming-link-rtmp',
            'readonly',
            'readonly',
            1,
            'form-control',
            'border',
            'border-danger',
            2,
            'height',
            '100px',
            3,
            'value'
          ],
          [1, 'text-primary', 'fw-bold', 'restream-link', 3, 'click'],
          [1, 'mb-2'],
          ['for', 'streaming-link'],
          [
            'id',
            'streaming-link',
            'readonly',
            'readonly',
            'rows',
            '2',
            1,
            'form-control',
            'border',
            'border-danger',
            2,
            'height',
            'auto',
            'overflow-y',
            'scroll',
            3,
            'value'
          ],
          ['for', 'stream-whip-key'],
          [
            'type',
            'text',
            'id',
            'stream-whip-key',
            'readonly',
            'readonly',
            'rows',
            '2',
            1,
            'form-control',
            'border',
            'border-danger',
            2,
            'height',
            'auto',
            'overflow-y',
            'scroll',
            3,
            'value'
          ],
          [1, 'fas', 'fa-play'],
          [1, 'list-group', 'text-dark'],
          [1, 'p-4', 'text-center'],
          [1, 'btn', 'btn-primary', 3, 'click'],
          [1, 'fas', 'fa', 'fa-sync'],
          [
            'aria-current',
            'true',
            1,
            'list-group-item',
            'list-group-item-action',
            'border-bottom',
            'border-top',
            'border-dark'
          ],
          [1, 'd-flex', 'w-100', 'justify-content-between'],
          [1, 'mb-1'],
          [1, 'p-4'],
          ['type', 'button', 1, 'btn', 'btn-outline-info', 'm-2', 3, 'click'],
          [1, 'fas', 'fa-video', 'me-1'],
          [1, 'fas', 'fa-image', 'me-1'],
          [1, 'fas', 'fa-link', 'me-1'],
          [1, 'mt-2', 3, 'ngSubmit'],
          ['type', 'submit', 1, 'btn', 'btn-primary'],
          [
            'id',
            'audio-deviceList',
            'name',
            'audioID',
            'aria-label',
            'Audio device (input)',
            'ngModel',
            '',
            1,
            'form-select',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [
            'id',
            'video-deviceList',
            'name',
            'videoID',
            'aria-label',
            'Video device (input)',
            'ngModel',
            '',
            1,
            'form-select',
            3,
            'ngModelChange',
            'ngModel'
          ]
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 1)(1, 'div', 2)(2, 'div', 3)(3, 'div', 4)(4, 'h5', 5),
            v(5, 'Session Control'),
            u(),
            T(6, 'button', 6),
            u(),
            d(7, 'div', 7),
            H(8, TDe, 165, 32)(9, PDe, 21, 5),
            u(),
            d(10, 'div', 8)(11, 'button', 9),
            x('click', function () {
              return o.done();
            }),
            v(12, ' Done '),
            u()()()()()),
            2 & i &&
              (m(8),
              O(8, o.appService.globals.isPresenter ? 8 : -1),
              m(),
              O(
                9,
                !o.appService.globals.isPresenter && o.appService.globals.user.hasMic ? 9 : -1
              )));
        },
        dependencies: [Di, qs, Vl, Hl, ai, jl, Xg, ti, Ws, fp, Yn, as, os, Rr],
        styles: [
          '#session-control-modal[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]{font-size:14px;margin-top:5px}#session-control-modal[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]:last-child{margin-bottom:0}#session-control-modal[_ngcontent-%COMP%]   .dropdown-menu[_ngcontent-%COMP%]{background-color:var(--session-control-dropdown-bg)}#session-control-modal[_ngcontent-%COMP%]   .dropdown-menu[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover{cursor:pointer}#session-control-modal[_ngcontent-%COMP%]   .modal-body[_ngcontent-%COMP%]   form[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]{width:45%;margin:0 2.5%}#session-control-modal[_ngcontent-%COMP%]   .modal-body[_ngcontent-%COMP%]   button[_ngcontent-%COMP%], #session-control-modal[_ngcontent-%COMP%]   textarea[_ngcontent-%COMP%], #session-control-modal[_ngcontent-%COMP%]   label[_ngcontent-%COMP%]{font-size:14px}.form-check-input[_ngcontent-%COMP%]:checked + label[_ngcontent-%COMP%]{text-transform:uppercase;font-weight:700}.form-check-input[_ngcontent-%COMP%]{-webkit-appearance:none;-o-appearance:none;appearance:none;height:20px;width:20px;transition:all .15s ease-out 0s;background-color:var(--light-gray);border:none;color:var(--white);cursor:pointer;display:inline-block;margin-right:.5rem;outline:none;position:relative;z-index:1000;border-radius:50%}.disable-video[_ngcontent-%COMP%]:hover, .form-check-label[_ngcontent-%COMP%]:hover{cursor:pointer;opacity:.85}.form-check-input[_ngcontent-%COMP%]:checked{background-color:var(--checkbox-bg-color)}.restream-link[_ngcontent-%COMP%]:hover{text-decoration:underline;cursor:pointer}'
        ]
      });
    }
  }
  return t;
})();
