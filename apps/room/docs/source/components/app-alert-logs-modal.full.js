const Sxe = (t, n) => n.updated,
  wxe = (t, n) => n._id;
function Txe(t, n) {
  if ((1 & t && (d(0, 'span'), v(1), Je(2, 'date'), u()), 2 & t)) {
    const e = g();
    (m(), Ne(' : ', Ct(2, 1, e.date, 'mediumDate'), ' '));
  }
}
function Dxe(t, n) {
  1 & t && (d(0, 'h5', 12), v(1, 'There are no archived alerts at this time'), u());
}
function Exe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 14),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(2).toggleShowLogs(o));
      }),
      d(1, 'div')(2, 'strong', 15),
      v(3),
      Je(4, 'date'),
      u()(),
      d(5, 'div')(6, 'strong', 15),
      v(7, 'By:\xa0'),
      u(),
      d(8, 'i'),
      v(9),
      u()()());
  }
  if (2 & t) {
    const e = n.$implicit;
    (m(3), Ze(Ct(4, 2, e.updated, 'mediumDate')), m(6), Ze(e.createdBy));
  }
}
function kxe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div')(1, 'button', 10),
      x('click', function () {
        return (D(e), E(g().loadLogs()));
      }),
      v(2, ' Reload Log List '),
      u(),
      d(3, 'div', 11),
      H(4, Dxe, 2, 0, 'h5', 12),
      ht(5, Exe, 10, 5, 'div', 13, Sxe),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(4), O(4, e.logDates && 0 != e.logDates.length ? -1 : 4), m(), pt(e.logDates));
  }
}
function xxe(t, n) {
  1 & t && (d(0, 'div', 6)(1, 'h5'), T(2, 'i', 16), v(3, ' Loading...'), u()());
}
function Mxe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 25),
      x('click', function () {
        return (D(e), E(g(2).clearInput()));
      }),
      T(1, 'i', 33),
      u());
  }
}
function Axe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 34),
      x('click', function () {
        return (D(e), E(g(2).unarchiveLog()));
      }),
      T(1, 'i', 35),
      v(2, ' Unarchive'),
      u());
  }
}
function Pxe(t, n) {
  if ((1 & t && T(0, 'app-st-message', 36), 2 & t)) {
    const e = n.$implicit,
      i = n.$index,
      o = g(3);
    z('msg', e)('logType', 'alerts')('prevD', i > 0 ? o.msgs[i - 1].t : 0);
  }
}
function Rxe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 32), ht(1, Pxe, 1, 3, 'app-st-message', 36, wxe), Je(3, 'searchLogs'), u()),
    2 & t)
  ) {
    const e = g(2);
    (m(), pt(Ct(3, 0, e.msgs, e.searchTxt)));
  }
}
function Ixe(t, n) {
  1 & t && (d(0, 'div', 37), v(1, 'No logs.'), u());
}
function Oxe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 7)(1, 'div', 17)(2, 'div', 18)(3, 'button', 19),
      x('click', function () {
        return (D(e), E(g().toggleShowLogs(!1)));
      }),
      T(4, 'i', 20),
      v(5, ' Back '),
      u(),
      d(6, 'div', 21)(7, 'div', 22)(8, 'input', 23),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.inputTxt, o) || (s.inputTxt = o), E(o));
      }),
      x('keyup', function (o) {
        return (D(e), E(g().onInputChange(o)));
      }),
      u(),
      H(9, Mxe, 2, 0, 'span', 24),
      d(10, 'span', 25),
      x('click', function () {
        return (D(e), E(g().searchLogs()));
      }),
      T(11, 'i', 26),
      u()()()()(),
      d(12, 'div', 27)(13, 'div', 28)(14, 'button', 29),
      x('click', function () {
        return (D(e), E(g().downloadLog()));
      }),
      T(15, 'i', 30),
      v(16, ' Download Log '),
      u(),
      H(17, Axe, 3, 0, 'button', 31),
      u(),
      H(18, Rxe, 4, 3, 'div', 32),
      Je(19, 'searchLogs'),
      H(20, Ixe, 2, 0),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(8),
      je('ngModel', e.inputTxt),
      m(),
      O(9, e.inputTxt && e.inputTxt.length > 0 ? 9 : -1),
      m(8),
      O(17, e.appService.globals.isPresenter ? 17 : -1),
      m(),
      O(18, Ct(19, 4, e.msgs, e.searchTxt).length > 0 ? 18 : 20));
  }
}
NB = (() => {
  class t {
    constructor(e) {
      ((this.appService = e),
        (this.logDates = []),
        (this.showLogs = !1),
        (this.msgs = []),
        (this.loading = !0),
        (this.logId = null),
        (this.date = null),
        (this.inputTxt = ''),
        (this.searchTxt = ''));
    }
    ngOnInit() {
      (this.loadLogs(),
        this.appService.guiEventBus.subscribe('doAlertsLogsModal', () => {
          ((this.showLogs = !1), this.clearInput());
        }));
    }
    toggleShowLogs(e) {
      var i = this;
      return I(function* () {
        if (((i.showLogs = !i.showLogs), e)) {
          ((i.logId = e._id), (i.date = e.updated));
          const o = yield i.appService.invokeServerCommand('getArchiveLog', { id: i.logId });
          (console.log('resp: ', o), (i.msgs = o.data.logArr), (i.loading = !1));
        } else ((i.msgs = []), (i.loading = !0), i.clearInput());
      })();
    }
    searchLogs() {
      if (!this.inputTxt || 0 === this.inputTxt.length) return ((this.searchTxt = ''), !1);
      this.searchTxt = this.inputTxt;
    }
    onInputChange(e) {
      if (!this.inputTxt || 0 === this.inputTxt.length) return ((this.searchTxt = ''), !1);
      13 === e.keyCode && (e.preventDefault(), (this.searchTxt = this.inputTxt));
    }
    clearInput() {
      ((this.inputTxt = ''), (this.searchTxt = ''));
    }
    loadLogs() {
      var e = this;
      I(function* () {
        let i = yield e.appService.invokeServerCommand('getArchiveList', { type: 'alerts' });
        (console.log('resp: ', i), (e.logDates = i.data));
      })();
    }
    unarchiveLog() {
      bootbox.confirm('Are you sure you want to unarchive (restore) this alerts?', (e) => {
        e &&
          (this.appService.sendServerAdminCommand('unarchiveLogs', {
            type: 'alerts',
            roomID: this.appService.globals.sessData.roomID,
            archiveID: this.logId
          }),
          (this.showLogs = !this.showLogs),
          this.loadLogs(),
          bootbox.alert('Alerts restored'));
      });
    }
    downloadLog() {
      var e = this;
      return I(function* () {
        const i = [],
          o = {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          },
          s = e.msgs;
        for (const c of s) {
          const h =
            new Date(c.t).toLocaleTimeString('en-us', o) + ' [' + c.n + ']: ' + c.txt + '\r\n';
          i.push(h);
        }
        const r = new Blob(i, { type: 'text/plain;charset=utf-8' }),
          a = window.URL.createObjectURL(r),
          l = document.createElement('a');
        ((l.href = a),
          (l.download = `AlertsLog_${e.date}.txt`),
          (l.style.display = 'none'),
          document.body.appendChild(l),
          l.click(),
          document.body.removeChild(l));
      })();
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-alert-logs-modal']],
        decls: 15,
        vars: 4,
        consts: [
          [
            'id',
            'alerts-logs-modal',
            'tabIndex',
            '-1',
            'role',
            'dialog',
            'aria-labelledby',
            'alerts-logs-modal',
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
          ['type', 'button', 1, 'btn', 'btn-primary', 'my-2', 3, 'click'],
          [1, 'list-group'],
          [1, 'mt-2'],
          [1, 'list-group-item', 'list-group-item-action'],
          [1, 'list-group-item', 'list-group-item-action', 3, 'click'],
          [1, 'fw-bold'],
          [1, 'ml-2', 'fas', 'fa-spinner', 'fa-spin'],
          [1, 'log-header-container', 'bg-secondary', 'text-white'],
          [1, 'd-flex', 'align-items-center', 'justify-content-between', 'my-1', 'log-header'],
          ['type', 'button', 1, 'btn', 'btn-light', 'me-2', 3, 'click'],
          [1, 'fas', 'fa-arrow-left'],
          [1, 'flex-fill'],
          [1, 'input-group'],
          [
            'type',
            'text',
            'id',
            'search-term',
            'aria-describedby',
            'search-addon',
            'placeholder',
            'Enter search term',
            1,
            'form-control',
            3,
            'ngModelChange',
            'keyup',
            'ngModel'
          ],
          ['id', 'search-addon', 1, 'input-group-text', 'btn', 'btn-ligth'],
          ['id', 'search-addon', 1, 'input-group-text', 'btn', 'btn-ligth', 3, 'click'],
          [1, 'fas', 'fa-search'],
          [1, 'log-body'],
          [1, 'my-2'],
          ['type', 'button', 1, 'btn', 'btn-light', 'btn-sm', 3, 'click'],
          [1, 'fas', 'fa-download'],
          ['type', 'button', 1, 'btn', 'btn-secondary', 'btn-sm', 'mx-1'],
          [1, 'log-messages'],
          [1, 'fas', 'fa-times'],
          ['type', 'button', 1, 'btn', 'btn-secondary', 'btn-sm', 'mx-1', 3, 'click'],
          [1, 'fas', 'fa-box-open'],
          [3, 'msg', 'logType', 'prevD'],
          [1, 'mt-3']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 0)(1, 'div', 1)(2, 'div', 2)(3, 'div', 3)(4, 'h5'),
            v(5, ' Alerts Logs '),
            H(6, Txe, 3, 4, 'span'),
            u(),
            T(7, 'button', 4),
            u(),
            d(8, 'div', 5),
            H(9, kxe, 7, 1, 'div')(10, xxe, 4, 0, 'div', 6)(11, Oxe, 21, 7, 'div', 7),
            u(),
            d(12, 'div', 8)(13, 'button', 9),
            v(14, ' Close '),
            u()()()()()),
            2 & i &&
              (m(6),
              O(6, o.showLogs && o.date ? 6 : -1),
              m(3),
              O(9, o.showLogs ? -1 : 9),
              m(),
              O(10, o.showLogs && o.loading ? 10 : -1),
              m(),
              O(11, o.showLogs && !o.loading ? 11 : -1)));
        },
        dependencies: [ai, ti, Yn, pu, os, IB],
        styles: [
          '.list-group[_ngcontent-%COMP%]{text-align:center;width:100%;max-width:600px;margin:0 auto}.list-group-item[_ngcontent-%COMP%]{margin-bottom:1px}.list-group-item[_ngcontent-%COMP%]:hover{cursor:pointer}.log-header[_ngcontent-%COMP%], .log-body[_ngcontent-%COMP%]{width:100%;margin:0 auto}.log-header-container[_ngcontent-%COMP%]{padding:10px}.log-body[_ngcontent-%COMP%]{text-align:center}.modal-dialog[_ngcontent-%COMP%]{overflow-y:initial!important}.log-messages[_ngcontent-%COMP%]{max-height:calc(100vh - 350px);overflow-y:auto}.modal-dialog[_ngcontent-%COMP%]{width:100%;max-width:1000px}'
        ]
      });
    }
  }
  return t;
})();
