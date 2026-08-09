pMe = (() => {
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
      this.ɵcmp = dt({
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
            ht(22, hMe, 16, 13, 'tr', 9, cMe),
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
