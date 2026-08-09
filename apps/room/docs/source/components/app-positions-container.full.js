Vxe = (() => {
  class t {
    constructor(e) {
      ((this.appService = e), (this.positionsIframeUrl = ''));
    }
    ngOnInit() {
      this.appService.globals.preferences.updatePositionsIframe &&
        (this.appService.globals.showPositions
          ? this.startIframeRefresh()
          : this.stopIframeRefresh());
    }
    ngAfterViewInit() {
      (this.appService.guiEventBus.subscribe('updatePositionsIframe', () => {
        this.loadPositionsContainer();
      }),
        this.appService.guiEventBus.subscribe('updatePositionsIframeChanged', () => {
          this.appService.globals.preferences.updatePositionsIframe &&
          this.appService.globals.showPositions
            ? this.startIframeRefresh()
            : this.stopIframeRefresh();
        }));
    }
    ngOnDestroy() {
      (console.log('destroying positions container...'),
        this.stopIframeRefresh(),
        (this.positionsIframeUrl = ''),
        this.appService.guiEventBus.unsubscribeAll([
          'updatePositionsIframe',
          'updatePositionsIframeChanged'
        ]));
    }
    startIframeRefresh() {
      (this.stopIframeRefresh(),
        this.loadPositionsContainer(),
        (this.iframeInterval = setInterval(() => {
          this.loadPositionsContainer();
        }, 3e4)));
    }
    stopIframeRefresh() {
      this.iframeInterval && (clearInterval(this.iframeInterval), (this.iframeInterval = null));
    }
    loadPositionsContainer() {
      const e = this.appService.globals.sessData.positionsIframeUrl,
        i = e.includes('?') ? '&' : '?';
      this.positionsIframeUrl = e + i + `t=${Date.now()}`;
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-positions-container']],
        decls: 3,
        vars: 4,
        consts: [
          [1, 'positionOverlay', 'animated', 'fadeIn'],
          [3, 'src']
        ],
        template: function (i, o) {
          (1 & i && (d(0, 'div', 0), T(1, 'iframe', 1), Je(2, 'noSanitize'), u()),
            2 & i && (m(), z('src', Ct(2, 1, o.positionsIframeUrl, 'resourceUrl'), Oa)));
        },
        dependencies: [Rr],
        styles: [
          '.positionOverlay[_ngcontent-%COMP%]   iframe[_ngcontent-%COMP%]{width:100%;height:100%}.positionOverlay[_ngcontent-%COMP%]{display:block;position:absolute;bottom:60px;right:0;width:100%;height:300px;z-index:11;padding:0 5px}'
        ]
      });
    }
  }
  return t;
})();
