const fMe = (t, n) => n.sendOn,
  mMe = (t, n, e) => ({ 'text-bg-danger': t, 'text-bg-info': n, 'text-bg-warning': e });
function gMe(t, n) {
  1 & t && (d(0, 'span', 14), v(1, 'no weekends'), u());
}
function _Me(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'tr', 9)(1, 'th', 12),
      v(2),
      Xe(3, 'date'),
      u(),
      d(4, 'td'),
      v(5),
      u(),
      d(6, 'td'),
      v(7),
      u(),
      d(8, 'td')(9, 'span', 13),
      v(10),
      u(),
      H(11, gMe, 2, 0, 'span', 14),
      u(),
      d(12, 'td')(13, 'button', 15),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g().removeScheduledAlert(o));
      }),
      T(14, 'i', 16),
      v(15, ' Remove '),
      u()()());
  }
  if (2 & t) {
    const e = n.$implicit;
    (m(2),
      Ne(' ', Ct(3, 6, e.sendOn, 'short'), ' '),
      m(3),
      Ze(e.alert.n),
      m(2),
      Ze(e.alert.txt),
      m(2),
      z(
        'ngClass',
        $a(9, mMe, '' === e.repeat || !e.repeat, 'daily' === e.repeat, 'weekly' === e.repeat)
      ),
      m(),
      Ne(' ', e.repeat || 'off', ' '),
      m(),
      O(11, 'daily' === e.repeat && e.ignoreWeekends ? 11 : -1));
  }
}
bMe = (() => {
  class t {
    constructor(e) {
      this.appService = e;
    }
    ngOnInit() {}
    removeScheduledAlert(e) {
      bootbox.confirm(
        'Are you sure you want to delete this alert by ' + e.alert.n + '. text: ' + e.alert.txt,
        (i) => {
          i &&
            this.appService.sendServerCommand('removeScheduledAlert', { scheduledAlertID: e._id });
        }
      );
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt));
      };
    }
    static {
      this.ɵcmp = ut({
        type: t,
        selectors: [['app-scheduled-alerts-modal']],
        decls: 27,
        vars: 0,
        consts: [
          [
            'id',
            'scheduledAlertsModal',
            'tabindex',
            '-1',
            'aria-labelledby',
            'scheduledAlertsModalLabel',
            'aria-hidden',
            'true',
            1,
            'modal',
            'fade',
            'text-white'
          ],
          [1, 'modal-dialog', 'modal-xl'],
          [1, 'modal-content'],
          [1, 'modal-header'],
          ['id', 'scheduledAlertsModalLabel', 1, 'modal-title'],
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
          [1, 'table', 'table-striped', 'text-white', 'w-100'],
          ['scope', 'col'],
          [1, 'text-white'],
          [1, 'modal-footer'],
          ['type', 'button', 'data-bs-dismiss', 'modal', 1, 'btn', 'btn-primary'],
          ['scope', 'row', 1, 'alert-date-time-th'],
          [1, 'badge', 'rounded-pill', 3, 'ngClass'],
          [1, 'badge', 'rounded-pill', 'text-bg-secondary', 'ms-1'],
          [1, 'btn', 'btn-outline-danger', 'btn-sm', 'remove-scheduled-alert-btn', 3, 'click'],
          [1, 'fas', 'fa-trash']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 0)(1, 'div', 1)(2, 'div', 2)(3, 'div', 3)(4, 'h5', 4),
            v(5, ' Manage Scheduled Alerts '),
            u(),
            T(6, 'button', 5),
            u(),
            d(7, 'div', 6)(8, 'table', 7)(9, 'thead')(10, 'tr')(11, 'th', 8),
            v(12, 'Date / Time'),
            u(),
            d(13, 'th', 8),
            v(14, 'Sender'),
            u(),
            d(15, 'th', 8),
            v(16, 'Alert'),
            u(),
            d(17, 'th', 8),
            v(18, 'Repeat'),
            u(),
            d(19, 'th', 8),
            v(20, 'Actions'),
            u()()(),
            d(21, 'tbody'),
            ht(22, _Me, 16, 13, 'tr', 9, fMe),
            u()()(),
            d(24, 'div', 10)(25, 'button', 11),
            v(26, ' Close '),
            u()()()()()),
            2 & i && (m(22), pt(o.appService.globals.scheduledAlerts)));
        },
        dependencies: [Di, os],
        styles: [
          '.remove-scheduled-alert-btn[_ngcontent-%COMP%]{width:88px!important}.alert-date-time-th[_ngcontent-%COMP%]{min-width:150px!important}'
        ]
      });
    }
  }
  return t;
})();
