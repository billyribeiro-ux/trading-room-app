const V0e = (t, n) => ({ 'screencast-pan': t, 'screencast-pan-grabbing': n }),
  H0e = (t, n) => ({ hidden: t, 'viewer-only-screen-video': n }),
  $0e = (t) => ({ hidden: t });
function z0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'h3', 10),
      x('click', function () {
        return (D(e), E(g().reAttachScren()));
      }),
      v(1, ' Screen Detached.. Click here to re-attach '),
      u());
  }
}
function G0e(t, n) {
  1 & t && (d(0, 'h3', 1), v(1, 'Video Disabled'), u());
}
function W0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'p', 11),
      x('click', function () {
        return (D(e), E(g().largePreview()));
      }),
      v(1),
      u());
  }
  if (2 & t) {
    const e = g();
    (m(),
      Ne(
        ' (You are sharing your screen as ',
        e.muser.mediaValue.screenName,
        ' click here for larger preview) '
      ));
  }
}
function q0e(t, n) {
  if ((1 & t && (d(0, 'h3', 3), T(1, 'i', 12), v(2), u()), 2 & t)) {
    const e = g();
    (m(2),
      ns(
        ' Connecting To Screen of ',
        e.muser.mediaValue.name,
        '-',
        e.muser.mediaValue.screenName,
        ' '
      ));
  }
}
function K0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div')(1, 'button', 16),
      x('click', function () {
        return (D(e), E(g(2).panZoomIn()));
      }),
      T(2, 'i', 17),
      u(),
      d(3, 'button', 16),
      x('click', function () {
        return (D(e), E(g(2).panZoomOut()));
      }),
      T(4, 'i', 18),
      u(),
      d(5, 'button', 16),
      x('click', function () {
        return (D(e), E(g(2).panZoomReset()));
      }),
      T(6, 'i', 19),
      u()());
  }
}
function Y0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 4)(1, 'button', 13),
      x('click', function () {
        return (D(e), E(g().togglePanZoomDetached()));
      }),
      T(2, 'i', 14),
      u(),
      d(3, 'button', 13),
      x('click', function () {
        return (D(e), E(g().captureVideoImage()));
      }),
      T(4, 'i', 15),
      u(),
      H(5, K0e, 7, 0, 'div'),
      u());
  }
  if (2 & t) {
    const e = g();
    (z(
      'ngClass',
      ut(
        2,
        $0e,
        !e.isDetached &&
          (!e.isConnected ||
            (e.isPresentingThisScreen && !e.localpreview) ||
            e.mediaService.saveData)
      )
    ),
      m(5),
      O(5, e.showZoomCtrlDetached ? 5 : -1));
  }
}
function Q0e(t, n) {
  if ((1 & t && (d(0, 'span', 9), v(1), u()), 2 & t)) {
    const e = g();
    (m(), Ne(' ', e.appService.globals.user.userXrefID, ' '));
  }
}
u6 = (() => {
  class t {
    constructor(e, i, o, s) {
      ((this.appService = e),
        (this.mediaService = i),
        (this.mediaSoupService = o),
        (this.popoutService = s),
        (this.isConnected = !1),
        (this.isDetached = !1),
        (this.isDetachedCtrl = !1),
        (this.isPresentingThisScreen = !1),
        (this.webcamListenerAdded = !1),
        (this.screenConnectChecker = null),
        (this.tooSmallRetries = 0),
        (this.showControls = !1),
        (this.localpreview = !1),
        (this.showZoomCtrl = !1),
        (this.showZoomCtrlDetached = !1),
        (this.panZoomConfig = new Kse({
          zoomOnMouseWheel: !1,
          zoomOnDoubleClick: !1,
          noDragFromElementClass: 'screencast-pan',
          zoomLevels: 20,
          initialZoomLevel: 2,
          scalePerZoomLevel: 1.1
        })),
        (this.streamData = null));
    }
    ngOnInit() {
      const e = this;
      if (this.detachScreen) {
        const i = window.location.search,
          o = new URLSearchParams(i);
        this.isDetachedCtrl = o.has('dscreen') && o.has('presID');
      }
      (this.appService.guiEventBus.subscribe('stopWatchScreenOf', (i) => e.stopWatchScreenOf(i)),
        this.appService.guiEventBus.subscribe('startWatchScreenOf', (i) => e.startWatchScreenOf(i)),
        this.appService.appEventBus.subscribe('newScreenStream', (i) => e.newScreenStream(i)),
        this.appService.appEventBus.subscribe('detachScreenShare', (i) => {
          this.muser._id == i && this.detachScreen();
        }),
        this.appService.appEventBus.subscribe('reatachScreenShare', (i) => {
          this.muser._id == i && this.reAttachScren();
        }),
        this.appService.guiEventBus.subscribe('togglePanZoom', (i) => {
          ((this.showZoomCtrl = i), this.togglePanZoom());
        }),
        this.appService.guiEventBus.subscribe('panZoomIn', () => {
          this.panZoomIn();
        }),
        this.appService.guiEventBus.subscribe('panZoomOut', () => {
          this.panZoomOut();
        }),
        this.appService.guiEventBus.subscribe('panZoomReset', () => {
          this.panZoomReset();
        }),
        this.appService.guiEventBus.subscribe('captureVideoImage', (i) => {
          this.captureVideoImage(i);
        }),
        this.mediaService.callingScreenOf &&
          this.mediaService.callingScreenOf._id === this.muser._id &&
          this.startWatchScreenOf(this.muser._id),
        (this.apiSubscription = this.panZoomConfig.api.subscribe((i) => (this.panZoomAPI = i))));
    }
    ngOnDestroy() {
      P('Screenshare view comp destroy...');
      const e = this;
      (this.appService.guiEventBus.unsubscribe('startWatchScreenOf', e.startWatchScreenOf),
        this.appService.guiEventBus.unsubscribe('stopWatchScreenOf', e.stopWatchScreenOf),
        this.appService.guiEventBus.unsubscribe('newScreenStream', e.newScreenStream),
        this.apiSubscription.unsubscribe());
    }
    togglePanZoom() {
      this.panZoomReset();
    }
    togglePanZoomDetached() {
      ((this.showZoomCtrlDetached = !this.showZoomCtrlDetached),
        (this.showZoomCtrl = !this.showZoomCtrl),
        this.panZoomReset());
    }
    panZoomIn() {
      this.panZoomAPI.zoomIn();
    }
    panZoomOut() {
      this.panZoomAPI.zoomOut();
    }
    panZoomReset() {
      this.panZoomAPI.resetView();
    }
    captureVideoImage(e = null) {
      if (e && ('presAreaTabs-screens' !== e.tabType || e.screenId !== this.muser._id)) return;
      const i = document.querySelector(`#webcamScreen-${this.muser._id}`);
      if (!i) return;
      const o = document.createElement('canvas'),
        s = o.getContext('2d'),
        r = document.createElement('a');
      let a, l, c;
      ((c = Number(i.videoWidth / i.videoHeight)),
        (a = Number(i.videoWidth - 100)),
        (l = Number(a / c)),
        (o.width = a),
        (o.height = l),
        s.fillRect(0, 0, a, l),
        s.drawImage(i, 0, 0, a, l),
        (r.download = `screenshot-${this.muser._id}-${new Date().getTime()}.png`),
        (r.href = o.toDataURL()),
        r.click());
    }
    newScreenStream(e) {
      if ((P('Screenshare view comp newScreenStream muserID:' + e.muserID), this.isDetached))
        P('Screrenshareview newScreenStream but isDetached, nop');
      else if (e.muserID === this.muser._id) {
        ((this.isConnected = !0),
          P('newScreenStream playing vid for ' + e.muserID),
          (this.streamData = e));
        const i = $('#webcamScreen-' + this.muser._id).get(0);
        i.muted = !0;
        try {
          i.srcObject = e.stream;
          const o = i.play();
          (void 0 !== o &&
            o
              .then(() => {
                P('Autoplay worked....');
              })
              .catch((s) => {
                (P('Autoplay failed.... error: ', s), (i.muted = !0));
              }),
            this.appService.globals.videoOnlyMode &&
              !this.appService.globals.sessData.recordChat &&
              P('**RECBOT** request fullscreen:#webcamScreen-' + this.muser._id));
        } catch (o) {
          console.error('newScreenStream error:', o);
        }
      }
    }
    startWatchScreenOf(e) {
      const i = this;
      if (
        (P(
          'startWatchScreenOf caught for ' +
            e +
            '. my ID ' +
            this.muser._id +
            '. match? ' +
            (e === this.muser._id)
        ),
        this.isDetached)
      )
        P('Screrenshareview startWatchScreenOf but isDetached, nop');
      else {
        if (i.mediaService.isScreenSharing && i.mediaService.localSharingStreams[this.muser._id])
          return (
            P('startWatchScreenOf selected tab that I am sharing... nop'),
            void (this.isPresentingThisScreen = !0)
          );
        if (e === this.muser._id) {
          if (this.isConnected)
            return (
              P('startWatchScreenOf, already connected to this ID. abort...'),
              void (
                this.appService.globals.videoOnlyMode &&
                P('**RECBOT** request fullscreen:#webcamScreen-' + this.muser._id)
              )
            );
          const o = $('#webcamScreen-' + this.muser._id).get(0);
          try {
            o.stop();
          } catch {}
          ((this.isConnected = !1),
            i.mediaService.startWatchingScreenOf(e),
            o && this.appService.globals.videoOnlyMode && P('going full screen rec'),
            o &&
              !this.webcamListenerAdded &&
              ((this.webcamListenerAdded = !0),
              o.addEventListener(
                'playing',
                () => {
                  i.isConnected = !0;
                  const s = o.videoWidth,
                    r = o.videoHeight;
                  if (
                    (clearTimeout(i.screenConnectChecker),
                    P('------webcam playing event fired....w:' + s + '. h:' + r),
                    (s < 10 || r < 10) &&
                      i.tooSmallRetries < 3 &&
                      !i.mediaService.is_firefox &&
                      !i.mediaService.is_edge)
                  )
                    return (
                      P('------webcam playing event TOO small? retry...'),
                      i.tooSmallRetries++,
                      void setTimeout(() => {
                        i.mediaService.callScreenOfUserWEBRTC(this.muser);
                      }, 3e3)
                    );
                  i.tooSmallRetries = 0;
                },
                !1
              )));
        }
      }
    }
    stopWatchScreenOf(e) {
      const i = this;
      i.mediaService.isScreenSharing && i.mediaService.localSharingStreams[this.muser._id]
        ? P('stopWatchScreenOf selected tab that I am sharing... nop')
        : (P('stopWatchScreenOf streamdata: ' + JSON.stringify(this.streamData)),
          i.mediaService.stopWatchingScreenOf(this.muser),
          e === this.muser._id && ((this.isConnected = !1), (this.streamData = null)));
    }
    reAttachScren() {
      ((this.isDetached = !1), this.startWatchScreenOf(this.muser._id));
    }
    detachScreen() {
      ((this.isDetached = !0),
        this.stopWatchScreenOf(this.muser._id),
        this.popoutService.openPopoutModal('screen', { pres: this.muser }));
    }
    largePreview() {
      this.localpreview = !0;
      let e = this.mediaSoupService.screenProducers.get(this.muser.producerID);
      if (!e) return void P('screenshare comp screenProducer not found..');
      const i = $('#webcamScreen-' + this.muser._id).get(0);
      i.srcObject = e.localStream;
      try {
        i.play();
      } catch {}
      this.isConnected = !0;
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(ma), be(fa), be(d6));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-screenshare-view']],
        inputs: { muser: 'muser' },
        decls: 11,
        vars: 21,
        consts: [
          [1, 'h-inherit'],
          [1, 'mt-4', 'text-center'],
          [1, 'text-center', 'mt-4', 2, 'color', '#ffcc00'],
          [1, 'text-center', 'mt-4', 'animated', 'fadeIn', 2, 'color', '#fff'],
          [1, 'zoom-controls-container-detached', 3, 'ngClass'],
          [
            'appDoubleClick',
            '',
            1,
            'position-relative',
            'h-inherit',
            'overflow-hidden',
            3,
            'ngClass',
            'id'
          ],
          [1, 'h-inherit', 3, 'config'],
          [1, 'video-screen-container', 3, 'id'],
          [
            'autoplay',
            'autoplay',
            'data-ng-dblclick',
            'fullScreen()',
            'playsinline',
            '',
            'muted',
            'true',
            1,
            'webcamScreen',
            3,
            'click',
            'controls',
            'ngClass',
            'id'
          ],
          [1, 'overlay-userID-container'],
          [1, 'mt-4', 'text-center', 3, 'click'],
          [1, 'text-center', 'mt-4', 2, 'color', '#ffcc00', 3, 'click'],
          [1, 'fas', 'fa-spinner', 'fa-pulse'],
          [1, 'btn', 'btn-sm', 'btn-dark', 3, 'click'],
          [1, 'icon', 'fas', 'fa-search'],
          [1, 'icon', 'fas', 'fa-camera'],
          [1, 'btn', 'btn-sm', 'btn-warning', 3, 'click'],
          [1, 'icon', 'fas', 'fa-search-plus'],
          [1, 'icon', 'fas', 'fa-search-minus'],
          [1, 'icon', 'fas', 'fa-redo']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 0),
            H(1, z0e, 2, 0, 'h3', 1)(2, G0e, 2, 0, 'h3', 1)(3, W0e, 2, 1, 'p', 2)(
              4,
              q0e,
              3,
              2,
              'h3',
              3
            )(5, Y0e, 6, 4, 'div', 4),
            d(6, 'div', 5)(7, 'pan-zoom', 6)(8, 'div', 7)(9, 'video', 8),
            x('click', function () {
              return (o.showControls = !o.showControls);
            }),
            u(),
            H(10, Q0e, 2, 1, 'span', 9),
            u()()()()),
            2 & i &&
              (m(),
              O(1, o.isDetached ? 1 : -1),
              m(),
              O(2, o.mediaService.saveData ? 2 : -1),
              m(),
              O(
                3,
                o.mediaService.isScreenSharing &&
                  o.mediaService.localSharingStreams[o.muser._id] &&
                  !o.localpreview
                  ? 3
                  : -1
              ),
              m(),
              O(4, o.isConnected || o.isPresentingThisScreen || o.isDetached ? -1 : 4),
              m(),
              O(5, o.isDetachedCtrl ? 5 : -1),
              m(),
              z('ngClass', Kn(15, V0e, !o.showZoomCtrl, o.showZoomCtrl))('id', o.muser._id),
              m(),
              z('config', o.panZoomConfig),
              m(),
              ei('id', 'video-screen-container-', o.muser._id, ''),
              m(),
              ei('id', 'webcamScreen-', o.muser._id, ''),
              z('controls', o.showControls)(
                'ngClass',
                Kn(
                  18,
                  H0e,
                  !o.isConnected ||
                    (o.isPresentingThisScreen && !o.localpreview) ||
                    o.mediaService.saveData,
                  o.appService.globals.viewerOnlyMode
                )
              ),
              m(),
              O(
                10,
                !o.appService.globals.isPresenter &&
                  o.appService.globals.sessData.overlayUserIdOnScreenshare
                  ? 10
                  : -1
              )));
        },
        dependencies: [Di, Wse, j0e],
        styles: [
          '.webcamScreen[_ngcontent-%COMP%]{width:100%;height:100%;object-fit:contain;vertical-align:top;pointer-events:none}.hidden[_ngcontent-%COMP%]{display:none}.h-inherit[_ngcontent-%COMP%]{height:inherit}.zoom-controls-container-detached[_ngcontent-%COMP%]{background-color:transparent;z-index:10;opacity:.5;position:absolute;right:5px;top:5px;text-align:right}.zoom-controls[_ngcontent-%COMP%]{top:-33px;left:-33px}.screencast-pan-grabbing[_ngcontent-%COMP%]{cursor:grabbing}'
        ]
      });
    }
  }
  return t;
})();
