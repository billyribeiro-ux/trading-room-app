const yMe = (t, n) => n.alertID,
  FMe = (t, n, e) => ({ 'text-success': t, 'text-danger': n, 'text-warning': e });
function CMe(t, n) {
  if ((1 & t && (d(0, 'div', 8), v(1), u()), 2 & t)) {
    const e = g(2);
    (m(), Ne(' ', e.loadingError, ' '));
  }
}
function SMe(t, n) {
  1 & t && (d(0, 'div', 9)(1, 'h5'), T(2, 'i', 10), v(3, ' Loading...'), u()());
}
function wMe(t, n) {
  (1 & t && H(0, CMe, 2, 1, 'div', 8)(1, SMe, 4, 0), 2 & t && O(0, g().loadingError ? 0 : 1));
}
function TMe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 27),
      x('click', function () {
        return (D(e), E(g(2).clearInput()));
      }),
      T(1, 'i', 28),
      u());
  }
}
function DMe(t, n) {
  if ((1 & t && (d(0, 'span'), v(1), u()), 2 & t)) {
    const e = g(2).$implicit;
    (m(), Ne('Latency: ', e.latency, ' secs'));
  }
}
function EMe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 33),
      T(1, 'i', 35),
      d(2, 'span', 36),
      v(3),
      Xe(4, 'date'),
      u(),
      v(5, '\xa0\xa0'),
      H(6, DMe, 2, 1, 'span'),
      u()),
    2 & t)
  ) {
    const e = g().$implicit;
    (m(3), Ze(Ct(4, 2, e.sentTime, 'medium')), m(3), O(6, e.latency ? 6 : -1));
  }
}
function kMe(t, n) {
  if ((1 & t && (d(0, 'div', 34), T(1, 'i', 37), v(2), u()), 2 & t)) {
    const e = g().$implicit;
    (m(2), Ne('', e.failReason, ' '));
  }
}
function xMe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 30)(1, 'div', 31),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(3).showTokenReport(o.token));
      }),
      d(2, 'strong', 32),
      v(3),
      u(),
      d(4, 'i'),
      v(5),
      u(),
      H(6, EMe, 7, 5, 'div', 33)(7, kMe, 3, 1, 'div', 34),
      u()());
  }
  if (2 & t) {
    const e = n.$implicit;
    (z('ngClass', $a(5, FMe, 'sent' === e.status, 'failed' === e.status, 'queued' === e.status)),
      m(3),
      Ne('', e.name, '\xa0'),
      m(2),
      Ne('(', e.email, ')'),
      m(),
      O(6, null != e && e.sentTime ? 6 : -1),
      m(),
      O(7, null != e && e.failReason ? 7 : -1));
  }
}
function MMe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 26)(1, 'div', 29),
      ht(2, xMe, 8, 9, 'div', 30, yMe),
      Xe(4, 'searchReports'),
      u()()),
    2 & t)
  ) {
    const e = g(2);
    (m(2), pt(rg(4, 0, e.reports, e.searchTxt, e.searchStatus)));
  }
}
function AMe(t, n) {
  1 & t && (d(0, 'div', 38), v(1, 'No Reports.'), u());
}
function PMe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 11)(1, 'div', 12)(2, 'div', 13),
      T(3, 'div', 14),
      d(4, 'div', 15)(5, 'span', 16)(6, 'select', 17),
      x('change', function (o) {
        return (D(e), E(g().onSelectChange(o.target.value)));
      }),
      d(7, 'option', 18),
      v(8, 'All'),
      u(),
      d(9, 'option', 19),
      v(10, 'Sent'),
      u(),
      d(11, 'option', 20),
      v(12, 'Queued'),
      u(),
      d(13, 'option', 21),
      v(14, 'Failed'),
      u()()(),
      d(15, 'input', 22),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.inputTxt, o) || (s.inputTxt = o), E(o));
      }),
      x('keyup', function (o) {
        return (D(e), E(g().onInputChange(o)));
      }),
      u(),
      H(16, TMe, 2, 0, 'span', 23),
      d(17, 'span', 24),
      x('click', function () {
        return (D(e), E(g().searchReports()));
      }),
      T(18, 'i', 25),
      u()()()(),
      H(19, MMe, 5, 4, 'div', 26),
      Xe(20, 'searchReports'),
      H(21, AMe, 2, 0),
      u());
  }
  if (2 & t) {
    const e = g();
    (m(15),
      je('ngModel', e.inputTxt),
      m(),
      O(16, e.inputTxt && e.inputTxt.length > 0 ? 16 : -1),
      m(3),
      O(19, rg(20, 3, e.reports, e.searchTxt, e.searchStatus).length > 0 ? 19 : 21));
  }
}
RMe = (() => {
  class t {
    constructor(e) {
      ((this.appService = e),
        (this.reports = []),
        (this.loading = !0),
        (this.alertID = ''),
        (this.inputTxt = ''),
        (this.searchTxt = ''),
        (this.searchStatus = ''),
        (this.loadingError = ''));
    }
    ngOnInit() {
      this.appService.guiEventBus.subscribe('doAlertSendReportModal', (e) => {
        ((this.alertID = e),
          (this.loading = !0),
          (this.loadingError = ''),
          this.clearInput(),
          this.loadReports());
      });
    }
    searchReports() {
      if (!this.inputTxt || 0 === this.inputTxt.length) return ((this.searchTxt = ''), !1);
      this.searchTxt = this.inputTxt;
    }
    onInputChange(e) {
      if (!this.inputTxt || 0 === this.inputTxt.length) return ((this.searchTxt = ''), !1);
      13 === e.keyCode && (e.preventDefault(), (this.searchTxt = this.inputTxt));
    }
    clearInput() {
      ((this.inputTxt = ''), (this.searchTxt = ''), (this.searchStatus = ''));
    }
    onSelectChange(e) {
      this.searchStatus = e;
    }
    calcPieData(e) {
      let i = 0,
        o = 0,
        s = 0,
        r = [];
      const a = ['sent', 'failed', 'queued'],
        l = e.length;
      for (const c of e)
        'sent' === c?.status ? ++i : 'failed' === c?.status ? ++o : 'queued' === c?.status && ++s;
      for (const c of a)
        ('sent' === c && r.push({ data: Number((i / l) * 100), label: c, color: '#00bc8c' }),
          'failed' === c && r.push({ data: Number((o / l) * 100), label: c, color: '#E74C3C' }),
          'queued' === c && r.push({ data: Number((s / l) * 100), label: c, color: '#ffc107' }));
      setTimeout(() => {
        $.plot('#pie-container', r, {
          series: {
            pie: {
              show: !0,
              radius: 1,
              tilt: 0.5,
              label: {
                show: !0,
                radius: 1,
                formatter: function (c, h) {
                  return (
                    "<div class='flot-pie-label' style='font-size:12px; text-align:center; padding:2px; color:white;'>" +
                    c +
                    ' : ' +
                    Math.round(h.percent) +
                    '%</div>'
                  );
                },
                background: { opacity: 0.8 }
              },
              combine: { color: '#999', threshold: 0.1 }
            }
          },
          legend: { show: !1 }
        });
      });
    }
    showTokenReport(e) {
      bootbox.alert({ title: 'Token', message: e });
    }
    loadReports() {
      var e = this;
      I(function* () {
        try {
          console.log('this.alertID: ', e.alertID);
          let i = yield e.appService.invokeAdminCmd('getAlertReport', { alertID: e.alertID });
          (console.log('resp: ', i),
            (e.reports = i?.queue),
            (e.loading = !1),
            e.reports && e.reports.length > 0 && e.calcPieData(e.reports));
        } catch {
          e.loadingError = 'There was an error loading the report.';
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
        selectors: [['app-alert-send-report-modal']],
        decls: 13,
        vars: 2,
        consts: [
          [
            'id',
            'alert-send-report-modal',
            'tabIndex',
            '-1',
            'role',
            'dialog',
            'aria-labelledby',
            'alert-send-report-modal',
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
          [1, 'modal-footer', 'text-center'],
          ['type', 'button', 'data-bs-dismiss', 'modal', 1, 'btn', 'btn-secondary'],
          [1, 'mt-3'],
          [1, 'text-center', 'my-4'],
          [1, 'ml-2', 'fas', 'fa-spinner', 'fa-spin'],
          [1, 'w-100'],
          [1, 'report-header-container', 'text-white'],
          [1, 'my-1', 'report-header'],
          ['id', 'pie-container'],
          [1, 'input-group'],
          ['id', 'search-select-addon', 1, 'input-group-text'],
          ['aria-label', 'Search select', 1, 'form-select', 3, 'change'],
          ['selected', '', 'value', ''],
          ['value', 'sent'],
          ['value', 'queued'],
          ['value', 'failed'],
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
          ['id', 'clear-search-addon', 1, 'input-group-text', 'btn', 'btn-ligth'],
          ['id', 'search-addon', 1, 'input-group-text', 'btn', 'btn-ligth', 3, 'click'],
          [1, 'fas', 'fa-search'],
          [1, 'report-body'],
          ['id', 'clear-search-addon', 1, 'input-group-text', 'btn', 'btn-ligth', 3, 'click'],
          [1, 'fas', 'fa-times'],
          [1, 'list-group'],
          [1, 'list-group-item', 'list-group-item-action', 'border-0', 'bg-dark', 3, 'ngClass'],
          [3, 'click'],
          [1, 'fw-bold'],
          [1, 'sent-time'],
          [1, 'failed-reason', 'm-1'],
          [1, 'fas', 'fa-clock'],
          [1, 'ms-1'],
          [1, 'fas', 'fa-exclamation-circle', 'me-1'],
          [1, 'mt-3', 'text-center']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 0)(1, 'div', 1)(2, 'div', 2)(3, 'div', 3)(4, 'h5'),
            v(5),
            u(),
            T(6, 'button', 4),
            u(),
            d(7, 'div', 5),
            H(8, wMe, 2, 1)(9, PMe, 22, 7),
            u(),
            d(10, 'div', 6)(11, 'button', 7),
            v(12, ' Close '),
            u()()()()()),
            2 & i &&
              (m(5),
              Ne('Alert Sent Report. AlertID: ', o.alertID, ''),
              m(3),
              O(8, o.loading ? 8 : 9)));
        },
        dependencies: [Di, Vl, Hl, ai, ti, Yn, os, vMe],
        styles: [
          '.list-group[_ngcontent-%COMP%]{width:100%;max-width:600px;margin:0 auto}.list-group-item[_ngcontent-%COMP%]{margin-bottom:1px}.list-group-item[_ngcontent-%COMP%]:hover{cursor:pointer}.report-header[_ngcontent-%COMP%], .report-body[_ngcontent-%COMP%]{width:100%;max-width:600px;margin:0 auto}.report-header-container[_ngcontent-%COMP%]{padding:10px}.report-body[_ngcontent-%COMP%]{text-align:left;max-height:calc(100vh - 500px);overflow-y:auto}.modal-dialog[_ngcontent-%COMP%]{overflow-y:initial!important}.modal-dialog[_ngcontent-%COMP%]{width:100%;max-width:800px}#search-select-addon[_ngcontent-%COMP%]{padding:0;border:0;margin:0}.form-select[_ngcontent-%COMP%]{border-top-right-radius:0;border-bottom-right-radius:0}.failed-reason[_ngcontent-%COMP%]{font-size:14px;font-weight:100;font-style:italic}.sent-time[_ngcontent-%COMP%]{font-size:14px;color:#6c757d}#pie-container[_ngcontent-%COMP%]{left:0;top:0;width:600px;height:192px;margin-bottom:8px}'
        ]
      });
    }
  }
  return t;
})();
