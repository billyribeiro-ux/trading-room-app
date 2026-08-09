xCe = (() => {
  class t {
    constructor(e, i, o) {
      ((this.appService = e),
        (this.popoutService = i),
        (this.mtxMTXService = o),
        (this.isConnected = !1),
        (this.isDetached = !1),
        (this.isDetachedCtrl = !1),
        (this.showVolumeSlider = !1),
        (this.isMuted = !1),
        (this.volume = 1),
        (this.showControls = !1),
        (this.path = ''),
        (this.videoSrc = ''),
        (this.isLoading = !0),
        (this.hls = null),
        (this.currentPerformanceLevel = 'optimal'),
        (this.bufferingEvents = 0),
        (this.lastBufferCheck = Date.now()),
        (this.BUFFER_CHECK_WINDOW = 3e4),
        (this.BUFFER_THRESHOLD = 6),
        (this.recoveryAttempts = 0),
        (this.MAX_RECOVERY_ATTEMPTS = 2),
        (this.hasStartedPlaying = !1));
    }
    ngOnInit() {
      (console.log('Streaming view comp ngOnInit muser:' + JSON.stringify(this.muser)),
        (this.bufferPreferenceSubscription = this.appService.guiEventBus.subscribe(
          'preferenceChanged',
          (e) => {
            'bufferSizeLevel' === e.key &&
              this.hls &&
              (console.log('Buffer size preference changed, reloading stream'), this.loadStream());
          }
        )));
    }
    ngAfterViewInit() {
      this.setupStream();
    }
    ngOnDestroy() {
      (this.cleanup(),
        this.bufferPreferenceSubscription && this.bufferPreferenceSubscription.unsubscribe());
    }
    cleanup() {
      (this.retryTimeout && clearTimeout(this.retryTimeout),
        this.performanceMonitor && clearInterval(this.performanceMonitor),
        this.hls && (this.hls.destroy(), (this.hls = null)));
    }
    getHlsConfig() {
      const e = this.appService.globals.preferences.bufferSizeLevel || 3,
        i = {
          enableWorker: !0,
          startPosition: -1,
          manifestLoadingMaxRetry: 4,
          manifestLoadingRetryDelay: 500,
          manifestLoadingMaxRetryTimeout: 64e3,
          maxLiveSyncPlaybackRate: 1.5,
          lowLatencyMode: !0,
          liveSyncDuration: 0,
          liveMaxLatencyDuration: 6,
          maxBufferLength: 25,
          maxMaxBufferLength: 35,
          stretchShortVideoTrack: !0,
          abrBandWidthFactor: 0.9,
          abrBandWidthUpFactor: 0.7
        };
      if (
        (e > 1 &&
          (2 === e
            ? ((i.maxBufferLength = 40),
              (i.maxMaxBufferLength = 60),
              (i.liveSyncDuration = 3),
              (i.liveMaxLatencyDuration = 10),
              (i.lowLatencyMode = !0))
            : 3 === e &&
              ((i.maxBufferLength = 60),
              (i.maxMaxBufferLength = 90),
              (i.liveSyncDuration = 6),
              (i.liveMaxLatencyDuration = 15),
              (i.lowLatencyMode = !1))),
        this.hasStartedPlaying && 'optimal' !== this.currentPerformanceLevel)
      )
        switch (this.currentPerformanceLevel) {
          case 'conservative':
            return {
              ...i,
              maxLiveSyncPlaybackRate: 1.2,
              lowLatencyMode: !1,
              liveSyncDuration: 4,
              liveMaxLatencyDuration: 12,
              maxBufferLength: 40,
              maxMaxBufferLength: 60,
              abrBandWidthFactor: 0.7,
              abrBandWidthUpFactor: 0.5
            };
          case 'balanced':
            return {
              ...i,
              maxLiveSyncPlaybackRate: 1.3,
              lowLatencyMode: !0,
              liveSyncDuration: 3,
              liveMaxLatencyDuration: 8,
              maxBufferLength: 30,
              maxMaxBufferLength: 45,
              abrBandWidthFactor: 0.8,
              abrBandWidthUpFactor: 0.6
            };
        }
      return i;
    }
    setupStream() {
      let e = `room__${this.muser.sessionID}__${this.muser.producerID}`;
      (this.muser.mediaValue.serverName !== this.appService.globals.streamServerMTX &&
        (e += '__reb'),
        (this.videoSrc = `https://${this.appService.globals.streamServerMTX}/${e}/index.m3u8?jwt=${this.appService.globals.mtxToken}`),
        console.log('Streaming view comp videoSrc:' + this.videoSrc),
        this.loadStream(),
        this.startPerformanceMonitoring());
    }
    loadStream() {
      const e = this.videoPlayer.nativeElement;
      bf.isSupported()
        ? (this.cleanup(),
          (this.hls = new bf(this.getHlsConfig())),
          this.setupHlsEventListeners(e),
          this.hls.attachMedia(e),
          (e.volume = this.appService.globals.preferences.doNotDisturbOn
            ? 0
            : this.appService.globals.audioVolume))
        : e.canPlayType('application/vnd.apple.mpegurl') && this.setupNativeHLS(e);
    }
    startPerformanceMonitoring() {
      !this.hls ||
        !this.hasStartedPlaying ||
        (console.log('Starting performance monitoring'),
        (this.performanceMonitor = setInterval(() => {
          this.checkAndAdaptPerformance();
        }, 2e3)));
    }
    checkAndAdaptPerformance() {
      if (!this.hls || !this.videoPlayer || !this.hasStartedPlaying) return;
      const e = Date.now(),
        i = this.videoPlayer.nativeElement;
      if (
        (e - this.lastBufferCheck >= this.BUFFER_CHECK_WINDOW &&
          ((this.bufferingEvents = 0), (this.lastBufferCheck = e), (this.recoveryAttempts = 0)),
        this.bufferingEvents >= this.BUFFER_THRESHOLD && this.adaptToPerformanceIssues(),
        this.hls.liveSyncPosition)
      ) {
        const o = this.hls.liveSyncPosition - i.currentTime;
        o > 10 && 'optimal' === this.currentPerformanceLevel
          ? (i.playbackRate = 1.5)
          : o > 15
            ? (i.currentTime = this.hls.liveSyncPosition - 5)
            : (i.playbackRate = 1);
      }
    }
    adaptToPerformanceIssues() {
      if (!this.hasStartedPlaying || this.recoveryAttempts >= this.MAX_RECOVERY_ATTEMPTS)
        console.log(
          "Not adapting: either playback hasn't started or max recovery attempts reached"
        );
      else {
        switch (this.currentPerformanceLevel) {
          case 'optimal':
            (console.log('Switching to balanced mode due to performance issues'),
              (this.currentPerformanceLevel = 'balanced'));
            break;
          case 'balanced':
            (console.log('Switching to conservative mode due to continued issues'),
              (this.currentPerformanceLevel = 'conservative'));
            break;
          case 'conservative':
            return;
        }
        (this.recoveryAttempts++, (this.bufferingEvents = 0), this.loadStream());
      }
    }
    setupHlsEventListeners(e) {
      this.hls &&
        (this.hls.on(bf.Events.ERROR, (i, o) => {
          o.fatal &&
            (console.error('Fatal HLS error:', o.details),
            this.hasStartedPlaying
              ? this.handleFatalError(o)
              : (this.hls?.destroy(),
                (this.retryTimeout = setTimeout(() => {
                  this.loadStream();
                }, 2e3))));
        }),
        this.hls.on(bf.Events.MEDIA_ATTACHED, () => {
          this.hls?.loadSource(this.videoSrc);
        }),
        this.hls.on(bf.Events.MANIFEST_LOADED, () => {
          (e.play().catch((i) => console.warn('Autoplay failed:', i)), (this.isLoading = !1));
        }),
        e.addEventListener('playing', () => {
          this.hasStartedPlaying
            ? this.bufferingEvents > 0 && console.log('Playback resumed after buffering')
            : (console.log('Stream playback started successfully'),
              (this.hasStartedPlaying = !0),
              this.startPerformanceMonitoring());
        }),
        e.addEventListener('waiting', () => {
          this.hasStartedPlaying &&
            (this.bufferingEvents++,
            console.log(`Buffer event detected. Count: ${this.bufferingEvents}`));
        }));
    }
    handleFatalError(e) {
      this.hasStartedPlaying &&
        (this.hls?.destroy(),
        'conservative' !== this.currentPerformanceLevel && this.adaptToPerformanceIssues(),
        (this.retryTimeout = setTimeout(() => {
          this.loadStream();
        }, 2e3)));
    }
    setupNativeHLS(e) {
      ((e.src = this.videoSrc),
        e.addEventListener('loadedmetadata', () => {
          (e.play().catch((i) => console.warn('Autoplay failed:', i)),
            (e.volume = this.appService.globals.preferences.doNotDisturbOn
              ? 0
              : this.appService.globals.audioVolume),
            (this.isLoading = !1));
        }));
    }
    toggleFullscreen() {
      const e = this.videoPlayer.nativeElement;
      document.fullscreenElement
        ? document.exitFullscreen && document.exitFullscreen()
        : e.requestFullscreen
          ? e.requestFullscreen()
          : e.webkitRequestFullscreen
            ? e.webkitRequestFullscreen()
            : e.msRequestFullscreen && e.msRequestFullscreen();
    }
    toggleMute() {
      ((this.isMuted = !this.isMuted),
        (this.showVolumeSlider = !this.isMuted),
        (this.videoPlayer.nativeElement.muted = this.isMuted));
    }
    onVolumeChange(e) {
      ((this.volume = parseFloat(e.target.value)),
        this.videoPlayer &&
          ((this.videoPlayer.nativeElement.volume = this.volume),
          (this.isMuted = 0 === this.volume)));
    }
    newScreenStream(e) {
      (console.log('Screenshare view comp newScreenStream muserID:' + e.muserID),
        this.isDetached && console.log('Screenshareview newScreenStream but isDetached, nop'));
    }
    startWatchScreenOf(e) {}
    stopWatchScreenOf(e) {}
    reAttachScreen() {
      ((this.isDetached = !1), this.startWatchScreenOf(this.muser._id));
    }
    detachScreen() {
      ((this.isDetached = !0),
        this.stopWatchScreenOf(this.muser._id),
        this.popoutService.openPopoutModal('screen', { pres: this.muser }));
    }
    getBufferSizeLevel() {
      return this.appService.globals.preferences.bufferSizeLevel || 3;
    }
    getBufferSizeName() {
      switch (this.getBufferSizeLevel()) {
        case 1:
        default:
          return 'Normal';
        case 2:
          return 'Increased';
        case 3:
          return 'Maximum';
      }
    }
    setBufferSize(e) {
      e < 1 ||
        e > 3 ||
        (this.getBufferSizeLevel() !== e &&
          ((this.appService.globals.preferences.bufferSizeLevel = e),
          this.appService.setPreference('bufferSizeLevel', e),
          this.hls && this.loadStream()));
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(d6), be(g1));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-streaming-view']],
        viewQuery: function (i, o) {
          if ((1 & i && Xt(SCe, 5), 2 & i)) {
            let s;
            yt((s = Ft())) && (o.videoPlayer = s.first);
          }
        },
        inputs: { muser: 'muser' },
        decls: 27,
        vars: 9,
        consts: [
          ['videoPlayer', ''],
          [1, 'h-100'],
          ['id', 'loading-message'],
          ['autoplay', 'autoplay', 1, 'video-streaming', 3, 'dblclick', 'id', 'muted', 'volume'],
          [1, 'overlay-userID-container'],
          [1, 'controls-container'],
          [1, 'buffer-size-dropdown'],
          [1, 'dropdown'],
          [
            'type',
            'button',
            'id',
            'bufferSizeDropdown',
            'data-bs-toggle',
            'dropdown',
            'aria-expanded',
            'false',
            1,
            'btn',
            'btn-sm',
            'dropdown-toggle'
          ],
          [1, 'fas', 'fa-database'],
          ['aria-labelledby', 'bufferSizeDropdown', 1, 'dropdown-menu', 'dropdown-menu-end'],
          [1, 'dropdown-item', 3, 'click'],
          ['id', 'speed-indicator'],
          [1, 'mute-unmute-button', 3, 'click'],
          [3, 'ngClass'],
          [1, 'ml-2', 'fas', 'fa-spinner', 'fa-spin'],
          [1, 'fas', 'fa-signal'],
          [1, 'fas', 'fa-check']
        ],
        template: function (i, o) {
          if (1 & i) {
            const s = Y();
            (d(0, 'div', 1),
              H(1, wCe, 3, 0, 'div', 2),
              d(2, 'video', 3, 0),
              x('dblclick', function () {
                return (D(s), E(o.toggleFullscreen()));
              }),
              u(),
              H(4, TCe, 2, 1, 'span', 4),
              d(5, 'div', 5)(6, 'div', 6)(7, 'div', 7)(8, 'button', 8),
              T(9, 'i', 9),
              v(10),
              u(),
              d(11, 'ul', 10)(12, 'li')(13, 'a', 11),
              x('click', function () {
                return (D(s), E(o.setBufferSize(1)));
              }),
              v(14, 'Normal'),
              u()(),
              d(15, 'li')(16, 'a', 11),
              x('click', function () {
                return (D(s), E(o.setBufferSize(2)));
              }),
              v(17, 'Increased'),
              u()(),
              d(18, 'li')(19, 'a', 11),
              x('click', function () {
                return (D(s), E(o.setBufferSize(3)));
              }),
              v(20, 'Maximum'),
              u()()()()(),
              d(21, 'div', 12),
              H(22, DCe, 7, 0)(23, ECe, 5, 0)(24, kCe, 4, 0),
              u(),
              d(25, 'button', 13),
              x('click', function () {
                return (D(s), E(o.toggleMute()));
              }),
              T(26, 'i', 14),
              u()()());
          }
          2 & i &&
            (m(),
            O(1, o.isLoading ? 1 : -1),
            m(),
            ei('id', 'video-', o.muser._id, ''),
            z('muted', o.isMuted)('volume', o.volume),
            m(2),
            O(
              4,
              !o.appService.globals.isPresenter &&
                o.appService.globals.sessData.overlayUserIdOnScreenshare
                ? 4
                : -1
            ),
            m(6),
            Ne(' Buffer: ', o.getBufferSizeName(), ' '),
            m(12),
            O(
              22,
              'optimal' === o.currentPerformanceLevel
                ? 22
                : 'balanced' === o.currentPerformanceLevel
                  ? 23
                  : 'conservative' === o.currentPerformanceLevel
                    ? 24
                    : -1
            ),
            m(4),
            z('ngClass', o.isMuted ? 'fas fa-2x fa-volume-off' : 'fas fa-2x fa-volume-up'));
        },
        dependencies: [Di],
        styles: [
          '.video-streaming[_ngcontent-%COMP%]{width:100%;height:100%;background:#1e1e1e;object-fit:contain;vertical-align:top}#message[_ngcontent-%COMP%]{position:absolute;left:0;top:0;width:100%;height:100%;display:flex;align-items:center;text-align:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;pointer-events:none;padding:20px;box-sizing:border-box;text-shadow:0 0 5px black}#lang-icon[_ngcontent-%COMP%]{display:none;position:absolute;top:20px;right:20px;width:30px;height:30px;background-image:url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0iI2ZmZiIgeG1sbnM6dj0iaHR0cHM6Ly92ZWN0YS5pby9uYW5vIj48cGF0aCBkPSJNMzguNSAzMy45bC0xLjktMS42YzIuNS0yLjkgMy44LTYuMyAzLjgtOS45IDAtMy4xLTEtNi4xLTIuOS04LjhsMi4xLTEuNWMyLjIgMy4xIDMuNCA2LjYgMy40IDEwLjItLjEgNC4zLTEuNiA4LjMtNC41IDExLjZ6TTUuNiAyMy4yaC0zYy0uNSAwLTEgLjUtMSAxLjF2MTAuNWMwIC42LjQgMS4xIDEgMS4xaDNjLjIgMCAuMyAwIC40LjFsMTMuOCA3LjhjLjYuNCAxLjQtLjIgMS40LTFWMTYuM2MwLS44LS44LTEuMy0xLjQtMUw2LjEgMjMuMWMtLjIuMS0uMy4xLS41LjF6bTIxLTE2LjlMMTIuOCAxNGMtLjEuMS0uMy4xLS40LjFoLTNjLS41IDAtMSAuNS0xIDEuMVYyMGwxMi4yLTYuOGExLjM2IDEuMzYgMCAwIDEgMS41IDBjLjUuMy44LjguOCAxLjV2MTcuOWwzLjcgMi4xYy42LjQgMS40LS4yIDEuNC0xVjcuMmMuMS0uOC0uNy0xLjMtMS40LS45em0xNi41IDMwLjJsLTEuOS0xLjZjMy4xLTMuNyA0LjctOCA0LjctMTIuNSAwLTQtMS4zLTcuOC0zLjctMTEuMmwyLjEtMS41YzIuNyAzLjggNC4yIDguMiA0LjIgMTIuNy0uMiA1LjEtMiA5LjktNS40IDE0LjF6TTM1IDMxLjFsLTItMS42YzEuNy0yLjEgMi42LTQuNiAyLjYtNy4yIDAtMi40LS44LTQuNy0yLjItNi43bDItMS41YzEuOCAyLjUgMi43IDUuMyAyLjcgOC4yIDAgMy4yLTEuMSA2LTIuMSA4OHoiLz48L3N2Zz4=);background-size:80%;background-position:center;background-repeat:no-repeat;cursor:pointer}#lang-list[_ngcontent-%COMP%]{display:none;position:absolute;top:100%;right:0;background:#bebebe;color:#000}#lang-icon[_ngcontent-%COMP%]:hover   #lang-list[_ngcontent-%COMP%]{display:block}#lang-list[_ngcontent-%COMP%]   div[_ngcontent-%COMP%]{border-bottom:1px solid black;padding:5px 15px}.controls-container[_ngcontent-%COMP%]{position:absolute;bottom:10px;right:10px;z-index:1000;display:flex;align-items:center}#speed-indicator[_ngcontent-%COMP%]{margin-right:25px;opacity:.5}.mute-unmute-button[_ngcontent-%COMP%]{padding:3px 6px;font-size:14px;border-radius:4px;background-color:#fffc;border:none;cursor:pointer;opacity:.5}.mute-unmute-button[_ngcontent-%COMP%]:hover{background-color:#fff}#loading-message[_ngcontent-%COMP%]{position:absolute;top:40px;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff;background-color:#000000b3;z-index:1}.buffer-size-dropdown[_ngcontent-%COMP%]{margin-right:10px;z-index:10}.buffer-size-dropdown[_ngcontent-%COMP%]   .dropdown-toggle[_ngcontent-%COMP%]{background-color:#00000080;color:#fff;border:1px solid rgba(255,255,255,.2);font-size:12px;padding:4px 8px}.buffer-size-dropdown[_ngcontent-%COMP%]   .dropdown-toggle[_ngcontent-%COMP%]:hover, .buffer-size-dropdown[_ngcontent-%COMP%]   .dropdown-toggle[_ngcontent-%COMP%]:focus{background-color:#000000b3}.buffer-size-dropdown[_ngcontent-%COMP%]   .dropdown-menu[_ngcontent-%COMP%]{background-color:#000c;border:1px solid rgba(255,255,255,.2);min-width:120px}.buffer-size-dropdown[_ngcontent-%COMP%]   .dropdown-menu[_ngcontent-%COMP%]   .dropdown-item[_ngcontent-%COMP%]{color:#fff;font-size:12px;padding:4px 12px}.buffer-size-dropdown[_ngcontent-%COMP%]   .dropdown-menu[_ngcontent-%COMP%]   .dropdown-item[_ngcontent-%COMP%]:hover{background-color:#ffffff1a;cursor:pointer}'
        ]
      });
    }
  }
  return t;
})();
