function DRe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div'),
      T(1, 'br')(2, 'br')(3, 'br')(4, 'br'),
      d(5, 'h3', 1),
      T(6, 'i', 2),
      v(7),
      u()()),
    2 & t)
  ) {
    const e = g();
    (m(7),
      ns(
        ' Connecting To Screen of ',
        e.pres.mediaValue.name,
        '-',
        e.pres.mediaValue.screenName,
        ' '
      ));
  }
}
function ERe(t, n) {
  if ((1 & t && (d(0, 'div', 0), T(1, 'app-screenshare-view', 3), u()), 2 & t)) {
    const e = g();
    (m(), z('muser', e.pres));
  }
}
kRe = (() => {
  class t {
    constructor(e, i, o) {
      ((this.mediaHandlerService = e),
        (this.appService = i),
        (this.titleService = o),
        (this.connected = !1));
    }
    ngOnInit() {
      (window.opener.addEventListener('unload', this.handleUnload.bind(this), !1),
        parent.addEventListener('message', this.handleParentMessage.bind(this), !1));
      const e = new URLSearchParams(window.location.search);
      ((this.sessionID = e.get('id')),
        (this.presID = e.get('presID')),
        this.appService.appEventBus.subscribe('globalsLoaded', (i) => {
          parent.postMessage(
            { cmd: 'ready', id: this.sessionID, presID: this.presID },
            location.origin
          );
        }),
        this.appService.appEventBus.subscribe('mediaServerConnected', (i) => {
          (P('Connected!!!!'),
            this.titleService.setTitle(
              this.appService.globals.sessionName +
                ' - ' +
                this.pres.mediaValue.name +
                ' - ' +
                this.pres.mediaValue.screenName
            ),
            this.mediaHandlerService.mediaSoupService.connectToScreenOfProducer(this.pres));
        }),
        this.appService.appEventBus.subscribe('newScreenStream', (i) => {
          this.connected = !0;
        }));
    }
    handleParentMessage(e) {
      if (e.source == window) return;
      (console.log('detached screen handlePopoutMessage:', e),
        P(
          'detached screen handlePopoutMessage: ',
          JSON.stringify(e.data) + '. origin: ' + window.location.origin
        ));
      let i = e.data.cmd;
      i &&
        e.origin == window.location.origin &&
        ((i = 'callScreeen')
          ? (console.log('callScreeen data:', e.data),
            (this.appService.globals.user = e.data.user),
            (this.appService.globals.streamServer = e.data.ms),
            (this.pres = e.data.pres),
            this.mediaHandlerService.initWithGlobalsAndEventHandler(
              this.appService.globals,
              this.appService.appEventBus,
              this.appService.guiEventBus
            ))
          : 'screeenStopped' == i &&
            bootbox.alert('the screen stream stopped.. this window will now close.', () => {
              window.close();
            }));
    }
    handleUnload() {
      (console.log('popout unload'), window.close());
    }
    pingBack() {
      (console.log('ping back to: ' + location.origin),
        parent.postMessage({ cmd: 'pingPopup' }, location.origin));
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(ma), be(Nt), be(mF));
      };
    }
    static {
      this.ɵcmp = ut({
        type: t,
        selectors: [['app-detached-screen']],
        decls: 2,
        vars: 2,
        consts: [
          [1, 'detach-screen', 2, 'width', '100%', 'height', 'auto'],
          [2, 'text-align', 'center'],
          [1, 'fas', 'fa-spinner', 'fa-pulse'],
          [3, 'muser']
        ],
        template: function (i, o) {
          (1 & i && H(0, DRe, 8, 2, 'div')(1, ERe, 2, 1, 'div', 0),
            2 & i && (O(0, o.connected ? -1 : 0), m(), O(1, o.pres ? 1 : -1)));
        },
        dependencies: [u6]
      });
    }
  }
  return t;
})();
