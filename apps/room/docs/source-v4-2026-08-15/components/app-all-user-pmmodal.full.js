const IMe = (t, n) => n._id;
function OMe(t, n) {
  if ((1 & t && (d(0, 'strong'), v(1), u()), 2 & t)) {
    const e = g();
    (m(), Ze(null == e.userData ? null : e.userData.nick));
  }
}
function NMe(t, n) {
  1 & t && (d(0, 'div', 6)(1, 'h5'), T(2, 'i', 10), v(3, ' Loading...'), u()());
}
function LMe(t, n) {
  if ((1 & t && T(0, 'app-st-compactmessage', 13), 2 & t)) {
    const e = n.$implicit,
      i = n.$index,
      o = g(3);
    (ei('id', 'pcm-', e._id, ''), z('msg', e)('prevD', i > 0 ? o.msgs[i - 1].t : 0));
  }
}
function BMe(t, n) {
  if (
    (1 & t && (d(0, 'div', 12), ht(1, LMe, 1, 4, 'app-st-compactmessage', 13, IMe), u()), 2 & t)
  ) {
    const e = g(2);
    (m(), pt(e.msgs));
  }
}
function UMe(t, n) {
  1 & t && (d(0, 'div', 14), v(1, 'No logs.'), u());
}
function jMe(t, n) {
  if (
    (1 & t && (d(0, 'div', 7)(1, 'div', 11), H(2, BMe, 3, 0, 'div', 12)(3, UMe, 2, 0), u()()),
    2 & t)
  ) {
    const e = g();
    (m(2), O(2, e.msgs && e.msgs.length > 0 ? 2 : 3));
  }
}
VMe = (() => {
  class t {
    constructor(e) {
      ((this.appService = e),
        (this.msgs = []),
        (this.loading = !0),
        (this.userData = { nick: '', peerID: '' }));
    }
    ngOnInit() {
      this.appService.guiEventBus.subscribe('doUserPMModal', (e) => {
        (this.clearData(), e && ((this.userData = e), this.loadLogs()));
      });
    }
    clearData() {
      ((this.userData = { nick: '', peerID: '' }), (this.loading = !0), (this.msgs = []));
    }
    loadLogs() {
      var e = this;
      return I(function* () {
        if (e.userData?.peerID) {
          const i = yield e.appService.invokeAdminCmd('getAllUserPM', {
            peerID: e.userData.peerID
          });
          ((e.msgs = i.msgs), (e.loading = !1), console.log('this.msgs: ', e.msgs));
        }
      })();
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt));
      };
    }
    static {
      this.ɵcmp = ut({
        type: t,
        selectors: [['app-all-user-pmmodal']],
        decls: 14,
        vars: 3,
        consts: [
          [
            'id',
            'all-user-pm-modal',
            'tabIndex',
            '-1',
            'role',
            'dialog',
            'aria-labelledby',
            'all-user-pm-modal',
            'aria-hidden',
            'true',
            1,
            'modal',
            'fade'
          ],
          ['role', 'document', 1, 'modal-dialog'],
          [1, 'modal-content'],
          [1, 'modal-header'],
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
          [1, 'text-center', 'my-4'],
          [1, 'w-100'],
          [1, 'modal-footer', 'text-center'],
          ['type', 'button', 'data-bs-dismiss', 'modal', 1, 'btn', 'btn-secondary'],
          [1, 'ml-2', 'fas', 'fa-spinner', 'fa-spin'],
          [1, 'log-body'],
          [1, 'log-messages'],
          ['logType', 'pc', 'isP', 'isP', 3, 'msg', 'prevD', 'id'],
          [1, 'mt-3']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 0)(1, 'div', 1)(2, 'div', 2)(3, 'div', 3)(4, 'h5'),
            v(5, ' All private messages: '),
            H(6, OMe, 2, 1, 'strong'),
            u(),
            T(7, 'button', 4),
            u(),
            d(8, 'div', 5),
            H(9, NMe, 4, 0, 'div', 6)(10, jMe, 4, 1, 'div', 7),
            d(11, 'div', 8)(12, 'button', 9),
            v(13, ' Close '),
            u()()()()()()),
            2 & i &&
              (m(6),
              O(6, null != o.userData && o.userData.nick ? 6 : -1),
              m(3),
              O(9, o.loading ? 9 : -1),
              m(),
              O(10, o.loading ? -1 : 10)));
        },
        dependencies: [uf],
        styles: [
          '.log-header[_ngcontent-%COMP%], .log-body[_ngcontent-%COMP%]{width:100%;margin:0 auto}.log-header-container[_ngcontent-%COMP%]{padding:10px}.log-body[_ngcontent-%COMP%]{text-align:center}.modal-dialog[_ngcontent-%COMP%]{overflow-y:initial!important;width:100%;max-width:800px}.log-messages[_ngcontent-%COMP%]{max-height:calc(100vh - 350px);overflow-y:auto}'
        ]
      });
    }
  }
  return t;
})();
