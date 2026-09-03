sL = (() => {
  class t {
    constructor(e, i) {
      ((this.appService = e), (this.mediaSoupService = i));
    }
    ngOnInit() {
      this.muser &&
        (P(
          `PresenterCam component created name:${this.pName}. id:${this.pID}. isME:${this.muser.isMe}`
        ),
        this.muser.isMe
          ? ((this.pStream = this.mediaSoupService.localWebcamStream),
            P('PresenterCam component wired to localstream...'))
          : (this.appService.appEventBus.subscribe('newWebcamStream', (e) => {
              (P('PresenterCam component newWebcamStream caught..', e),
                e.muserID == this.muser._id &&
                  (P('PresenterCam component  hitting play...'), (this.pStream = e.stream)));
            }),
            this.mediaSoupService.connectToScreenOfProducer(this.muser)),
        setTimeout(() => {
          this.initDrag();
        }, 1e3));
    }
    ngAfterViewInit() {}
    showWebcams() {
      tu('#webcamsHolder').show();
    }
    hideWebcams() {
      tu('#webcamsHolder').hide();
    }
    reposition() {
      tu('#webcamsHolder');
    }
    closeMe() {
      (P('Closing preview... ' + this.pID),
        this.muser.isMe
          ? (this.pStream = null)
          : ((this.pStream = null), this.mediaSoupService.hupScreenOfProducer(this.muser)),
        this.appService.guiEventBus.emit('removeWebcamPresenter', this.muser));
    }
    initDrag() {
      const e = `webcamsHolder-${this.pID}`,
        i = `webcam-${this.muser.sessionID}-${this.muser.mediaValue.name.replace(' ', '_')}`,
        o = localStorage.getItem(i);
      if (o) {
        const { top: s, left: r, width: a, height: l } = JSON.parse(o);
        tu(`#${e}`).css({ top: s, left: r, width: a, height: l });
      }
      (tu(`#${e}`)
        .draggable({
          appendTo: '.app-room',
          containment: 'window',
          cursor: 'move',
          scroll: !1,
          snap: !0,
          stop: (s, r) => {
            this.saveWebcamPosition(i, { top: r.position.top, left: r.position.left });
          }
        })
        .resizable({
          handles: 'n, e, s, w, ne, se, sw, nw',
          stop: (s, r) => {
            this.saveWebcamPosition(i, { width: r.size.width, height: r.size.height });
          }
        })
        .show(),
        console.log('initDrag() done...'));
    }
    saveWebcamPosition(e, i) {
      const o = JSON.parse(localStorage.getItem(e)) || {};
      localStorage.setItem(e, JSON.stringify({ ...o, ...i }));
    }
    playStream(e) {
      let i = tu(`#webcamVideo-${this.pID}`).get(0);
      i.srcObject = e;
      try {
        i.play();
      } catch (o) {
        console.error('play error:', o);
      }
      console.log('playStream ok:', e);
    }
    adjustPos() {
      P('adjust pos called... TODO..');
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(fa));
      };
    }
    static {
      this.ɵcmp = ut({
        type: t,
        selectors: [['app-presenter-cams']],
        inputs: { muser: 'muser', pName: 'pName', pID: 'pID', pStream: 'pStream' },
        decls: 7,
        vars: 6,
        consts: [
          [1, 'card', 'webcamsHolder', 3, 'id'],
          ['autoplay', 'autoplay', 1, 'webcamsHolderVideo', 3, 'srcObject', 'id'],
          [1, 'overlay'],
          [1, 'pNameLabel', 'm-0'],
          [1, 'closeIcon', 3, 'click'],
          [1, 'fas', 'fa-times']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 0),
            T(1, 'video', 1),
            d(2, 'div', 2)(3, 'h5', 3),
            v(4),
            d(5, 'span', 4),
            x('click', function () {
              return o.closeMe();
            }),
            T(6, 'i', 5),
            u()()()()),
            2 & i &&
              (ei('id', 'webcamsHolder-', o.pID, ''),
              m(),
              ei('id', 'webcamVideo-', o.pID, ''),
              z('srcObject', o.pStream),
              m(3),
              Ne(' ', o.pName, ' ')));
        },
        styles: [
          '.webcamsHolder[_ngcontent-%COMP%]{position:absolute;z-index:105;border:1px solid yellowgreen;cursor:move;background-color:#000;width:320px;height:240px;margin:5px}.webcamsHolderVideo[_ngcontent-%COMP%]{object-fit:contain;position:relative;width:100%;height:100%}.pNameLabel[_ngcontent-%COMP%]{background-color:#00000080;color:#fff;text-align:center;width:100%}.overlay[_ngcontent-%COMP%]{position:absolute;top:0;left:0;right:0;z-index:101}.closeIcon[_ngcontent-%COMP%]{position:absolute;right:5px;z-index:102}.closeIcon[_ngcontent-%COMP%]:hover{cursor:pointer}'
        ]
      });
    }
  }
  return t;
})();
