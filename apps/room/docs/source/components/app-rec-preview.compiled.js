f3e = (() => {
  class t {
    constructor(e, i, o) {
      ((this.appService = e),
        (this.mediaService = i),
        (this.mediaSoupService = o),
        (this.recTimer = null),
        (this.expandRecPreview = !1));
    }
    ngOnInit() {
      this.appService.globals.videoOnlyMode ||
        !this.appService.globals.isPresenter ||
        !this.appService.globals.sessData.recPreviewLocation ||
        !this.appService.globals.preferences.recPreviewWindow ||
        ((this.expandRecPreview = !1),
        this.initDrag(),
        this.appService.guiEventBus.subscribe('reopenRecPreviewWindow', () => {
          (bc('#recLocalPreviewHolder').show(), this.startRecTimer());
        }),
        this.appService.guiEventBus.subscribe('closeRecPreviewWindow', () => {
          this.closePreview();
        }),
        this.appService.appEventBus.subscribe('startRec', () => {
          this.appService.globals.preferences.recPreviewWindow &&
            (bc('#recLocalPreviewHolder').show(), this.startRecTimer());
        }),
        this.appService.appEventBus.subscribe('stopRec', () => {
          (bc('#recLocalPreviewHolder').hide(), this.clearRecTimer());
        }),
        this.appService.appEventBus.subscribe('pauseRec', () => {
          this.clearRecTimer();
        }),
        this.appService.appEventBus.subscribe('resumeRec', () => {
          this.startRecTimer();
        }));
    }
    ngOnDestroy() {
      this.clearRecTimer();
    }
    startRecTimer() {
      this.appService.globals.roomState.isRecording &&
        !this.appService.globals.roomState.isRecordingPaused &&
        (this.recTimer ||
          (this.recTimer = setInterval(() => {
            bc('#recScreenLocalPreview').attr(
              'src',
              `${this.appService.globals.sessData.recPreviewLocation}?${Date.now()}`
            );
          }, 1e3)));
    }
    clearRecTimer() {
      this.recTimer && (clearInterval(this.recTimer), (this.recTimer = null));
    }
    initDrag() {
      (bc('#recLocalPreviewHolder')
        .draggable({
          appendTo: 'body',
          containment: 'window',
          cursor: 'move',
          scroll: !1,
          snap: 'true',
          addClasses: !0,
          stop: function (e, i) {}
        })
        .resizable({ handles: 'n, e, s, w, ne, se, sw, nw' }),
        P('initDrag() done...'));
    }
    closePreview() {
      (bc('#recLocalPreviewHolder').hide(),
        (this.appService.globals.recPreviewOpen = !1),
        this.clearRecTimer());
    }
    expandPreview() {
      this.expandRecPreview = !this.expandRecPreview;
      const e = bc('#recLocalPreviewHolder');
      e &&
        (this.expandRecPreview
          ? (e.toggleClass('recsHolderScreen-lg'),
            e.position().left > 700 && e.css({ left: '678px' }),
            e.position().top > 520 && e.css({ top: '415px' }))
          : e.toggleClass('recsHolderScreen-lg'));
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(ma), be(fa));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-rec-preview']],
        decls: 12,
        vars: 2,
        consts: [
          ['id', 'recLocalPreviewHolder', 1, 'card', 'recsHolderScreen'],
          [1, 'card-body'],
          [1, 'card-title', 'm-0'],
          [1, 'd-inline-block', 'p-2', 'text-white'],
          [1, 'float-right', 'p-2', 3, 'click'],
          [1, 'fas', 'fa-times', 'text-white'],
          [1, 'float-right', 'p-2', 'mx-1', 3, 'click'],
          [1, 'fas', 'fa-compress-arrows-alt', 'text-white'],
          ['id', 'recScreenLocalPreview', 1, 'recPreviewScreen'],
          [1, 'fas', 'fa-expand', 'text-white'],
          [1, 'text-center', 'py-4', 'text-white']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 0)(1, 'div', 1)(2, 'h5', 2)(3, 'div', 3),
            v(4, ' Recording Preview. (DELAYED UPTO 20s) '),
            u(),
            d(5, 'span', 4),
            x('click', function () {
              return o.closePreview();
            }),
            T(6, 'i', 5),
            u(),
            d(7, 'span', 6),
            x('click', function () {
              return o.expandPreview();
            }),
            H(8, d3e, 1, 0, 'i', 7)(9, u3e, 1, 0),
            u()(),
            H(10, h3e, 1, 0, 'img', 8)(11, p3e, 3, 0),
            u()()),
            2 & i &&
              (m(8),
              O(8, o.expandRecPreview ? 8 : 9),
              m(2),
              O(
                10,
                o.appService.globals.roomState.isRecording &&
                  !o.appService.globals.roomState.isRecordingPaused
                  ? 10
                  : 11
              )));
        },
        styles: [
          '.recsHolderScreen[_ngcontent-%COMP%]{width:350px;height:260px;position:fixed;bottom:265px;right:0;z-index:100;border:1px solid #fafafa;cursor:move;background-color:#000;display:none}.recsHolderScreen-lg[_ngcontent-%COMP%]{width:700px;height:520px}.recsHolderScreen[_ngcontent-%COMP%]   .card-body[_ngcontent-%COMP%]{padding:0;width:100%;height:100%}.recsHolderScreen[_ngcontent-%COMP%]   .card-title[_ngcontent-%COMP%]{padding:5px;font-size:12px}.recsHolderScreen[_ngcontent-%COMP%]   .card-title[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]{font-size:12px}.recsHolderScreen[_ngcontent-%COMP%]   .card-title[_ngcontent-%COMP%]   .float-right[_ngcontent-%COMP%]:hover{cursor:pointer}.pNameLabel[_ngcontent-%COMP%]{position:relative;background-color:#00000080;color:#fff;text-align:center}.recPreviewScreen[_ngcontent-%COMP%]{object-fit:contain;width:100%;max-height:calc(100% - 42px);padding:3px}.hidden[_ngcontent-%COMP%]{display:none}'
        ]
      });
    }
  }
  return t;
})();
