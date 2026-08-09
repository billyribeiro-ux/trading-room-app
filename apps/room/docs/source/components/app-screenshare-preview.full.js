const RDe = (t, n) => n.value.appData.screenName;
function IDe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 10),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g().selectStream(o.key));
      }),
      v(1),
      u());
  }
  if (2 & t) {
    const e = n.$implicit;
    (m(), Ne(' ', e.value.appData.screenName, ''));
  }
}
let Eu = window.$;
ODe = (() => {
  class t {
    constructor(e, i, o) {
      ((this.appService = e),
        (this.mediaService = i),
        (this.mediaSoupService = o),
        (this.currSelectedStream = ''),
        (this.shouldHide = !1),
        (this.inited = !1));
    }
    ngOnInit() {
      (this.appService.appEventBus.subscribe('newLocalScreenStream', (e) => {
        this.switchToLocalSession(e);
      }),
        this.appService.appEventBus.subscribe('softResetDone', () => {
          (Eu('#screenshareLocalPreviewHolder').hide(),
            (this.currSelectedStream = ''),
            (this.pStream = null),
            (this.shouldHide = !0));
        }),
        this.appService.appEventBus.subscribe('removeLocalScreenStream', (e) => {
          (console.error('preview comp caught: removeLocalScreenStream... streamID: ' + e),
            this.removeLocalPresenterScreen(e));
        }),
        this.appService.guiEventBus.subscribe('reopenPreviewWindow', () => {
          ((this.shouldHide = !1), Eu('#screenshareLocalPreviewHolder').show());
        }),
        this.appService.guiEventBus.subscribe('startWatchScreenOf', (e) => {
          if (this.shouldHide) return void P('shouldHide on, nop...');
          P('screenshare-preview startWatchScreenOf ' + e);
          let i = this.mediaService.localSharingStreams[e];
          i &&
            (this.switchToLocalSession(i.mediaValue.sessID),
            (this.appService.globals.currScreenID = e),
            this.mediaService.micMuted ||
              (P('making everyone focus on me: ' + e),
              this.appService.sendServerAdminCommand('focusOnScreen', { id: e })));
        }),
        this.initDrag());
    }
    initDrag() {
      (Eu('#screenshareLocalPreviewHolder')
        .draggable({
          appendTo: 'body',
          containment: 'window',
          cursor: 'move',
          scroll: !1,
          snap: !0,
          stop: function (e, i) {
            console.log('drag stop: ui', i);
          }
        })
        .resizable({ handles: 'n, e, s, w, ne, se, sw, nw' }),
        P('initDrag() done...'));
    }
    selectStream(e) {
      this.switchToLocalSession(e);
    }
    switchToLocalSession(e) {
      P('screenshare preview comp. switch to local screen: ' + e);
      let i = this.mediaSoupService.screenProducers.get(e);
      i
        ? ((this.pID = i.id),
          (this.pName = i.appData.screenName),
          (this.pStream = i.localStream),
          (this.currSelectedStream = i.id),
          this.inited || ((this.inited = !0), this.initDrag()),
          Eu('#screenshareLocalPreviewHolder').show())
        : P('screenshare preview comp screenProducer not found..');
    }
    removeLocalPresenterScreen(e) {
      if (
        (P('removeLocalPresenterScreen: ' + e),
        P('removeLocalPresenterScreen size:', this.mediaSoupService.screenProducers.size),
        0 == this.mediaSoupService.screenProducers.size)
      )
        return (
          Eu('#screenshareLocalPreviewHolder').hide(),
          (this.currSelectedStream = ''),
          void (this.pStream = null)
        );
      let i = Array.from(this.mediaSoupService.screenProducers.keys());
      this.switchToLocalSession(i[0]);
    }
    closePreview() {
      ((this.shouldHide = !0), Eu('#screenshareLocalPreviewHolder').hide());
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(ma), be(fa));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-screenshare-preview']],
        decls: 13,
        vars: 4,
        consts: [
          ['id', 'screenshareLocalPreviewHolder', 1, 'card', 'webcamsHolderScreen'],
          [1, 'card-body'],
          [1, 'card-title', 'm-0'],
          ['ngbDropdown', '', 1, 'd-inline-block'],
          ['id', 'dropdownBasic1', 'ngbDropdownToggle', '', 1, 'btn', 'btn-outline-dark'],
          ['ngbDropdownMenu', '', 'aria-labelledby', 'dropdownBasic1'],
          ['ngbDropdownItem', ''],
          [1, 'float-right', 'p-2', 3, 'click'],
          [1, 'fas', 'fa-times'],
          [
            'autoplay',
            'autoplay',
            'id',
            'webcamScreenLocalPreview',
            1,
            'webcamPreviewScreen',
            3,
            'srcObject'
          ],
          ['ngbDropdownItem', '', 3, 'click']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 0)(1, 'div', 1)(2, 'h5', 2)(3, 'div', 3)(4, 'button', 4),
            v(5),
            u(),
            d(6, 'div', 5),
            ht(7, IDe, 2, 1, 'button', 6, RDe),
            Je(9, 'keyvalue'),
            u()(),
            d(10, 'span', 7),
            x('click', function () {
              return o.closePreview();
            }),
            T(11, 'i', 8),
            u()(),
            T(12, 'video', 9),
            u()()),
            2 & i &&
              (m(5),
              Ne(' ', o.pName, ' '),
              m(2),
              pt(yr(9, 2, o.mediaSoupService.screenProducers)),
              m(5),
              z('srcObject', o.pStream)));
        },
        dependencies: [Op, XC, P_, Ip, QC, Cd],
        styles: [
          '.webcamsHolderScreen[_ngcontent-%COMP%]{width:350px;height:260px;position:fixed;bottom:0;right:0;z-index:100;border:1px solid #fafafa;cursor:move;background-color:#000;display:none}.webcamsHolderScreen[_ngcontent-%COMP%]   .card-body[_ngcontent-%COMP%]{padding:0;width:100%;height:100%}.webcamsHolderScreen[_ngcontent-%COMP%]   .card-title[_ngcontent-%COMP%]{padding:5px;font-size:12px}.webcamsHolderScreen[_ngcontent-%COMP%]   .card-title[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]{font-size:12px}.webcamsHolderScreen[_ngcontent-%COMP%]   .card-title[_ngcontent-%COMP%]   .float-right[_ngcontent-%COMP%]:hover{cursor:pointer}.pNameLabel[_ngcontent-%COMP%]{position:relative;background-color:#00000080;color:#fff;text-align:center}.webcamPreviewScreen[_ngcontent-%COMP%]{object-fit:contain;width:100%;max-height:calc(100% - 42px);padding:3px}.hidden[_ngcontent-%COMP%]{display:none}'
        ]
      });
    }
  }
  return t;
})();
