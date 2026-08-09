const Cue = (t, n) => n.avatar;
function Sue(t, n) {
  1 & t && v(0, 'Show');
}
function wue(t, n) {
  1 & t && v(0, 'Filter out');
}
function Tue(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 13),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(2).toggleTraders(o.avatar, o.username));
      }),
      T(1, 'i'),
      v(2),
      u());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = g(2);
    (m(),
      Rh(
        'fas me-1 ',
        i.appService.globals.user.alertFilterFor[e.avatar]
          ? 'fa-check-square text-success'
          : 'fa-square text-opacity',
        ''
      ),
      m(),
      Ne(' ', e.username, ' '));
  }
}
function Due(t, n) {
  if ((1 & t && (d(0, 'ul', 9), ht(1, Tue, 3, 4, 'li', 12, Cue), u()), 2 & t)) {
    const e = g();
    (m(), pt(e.appService.globals.modAlertFilterList));
  }
}
function Eue(t, n) {
  1 & t && (d(0, 'p'), v(1, 'List is empty.'), u());
}
function kue(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div')(1, 'button', 14),
      x('click', function () {
        return (D(e), E(g().unselectAll()));
      }),
      T(2, 'i', 15),
      v(3, ' Unselect All '),
      u(),
      d(4, 'button', 16),
      x('click', function () {
        return (D(e), E(g().selectAll()));
      }),
      T(5, 'i', 17),
      v(6, ' Select All '),
      u()(),
      d(7, 'button', 18),
      x('click', function () {
        return (D(e), E(g().updateAlertFilter()));
      }),
      v(8, ' Save'),
      u());
  }
}
rL = (() => {
  class t {
    constructor(e) {
      this.appService = e;
    }
    ngOnInit() {
      this.appService.guiEventBus.subscribe('doAlertFilterModal', () => {
        this.syncModAlertFilterList();
      });
    }
    toggleTraders(e, i) {
      this.appService.globals.user.alertFilterFor[e]
        ? delete this.appService.globals.user.alertFilterFor[e]
        : (this.appService.globals.user.alertFilterFor[e] = i);
    }
    unselectAll() {
      for (let e in this.appService.globals.user.alertFilterFor)
        this.appService.globals.user.alertFilterFor.hasOwnProperty(e) &&
          delete this.appService.globals.user.alertFilterFor[e];
    }
    selectAll() {
      for (const e of this.appService.globals.modAlertFilterList)
        this.appService.globals.user.alertFilterFor[e.avatar] ||
          (this.appService.globals.user.alertFilterFor[e.avatar] = e.username);
    }
    showAlertsFrom() {
      ((this.appService.globals.preferences.showAlertsFrom =
        !this.appService.globals.preferences.showAlertsFrom),
        this.updateAlertFilter());
    }
    updateAlertFilter() {
      let e = 0 === Object.keys(this.appService.globals.user.alertFilterFor).length;
      bootbox.confirm(
        e
          ? `Are you sure you want to disable "${this.appService.globals.preferences.showAlertsFrom ? 'only show alert ' : 'alert'}" filtering?`
          : `Are you sure you want to ${this.appService.globals.preferences.showAlertsFrom ? 'only show ' : 'filter out '} alerts from the selected people?`,
        (s) => {
          s
            ? ((this.appService.globals.doFilteredAlerts =
                Object.keys(this.appService.globals.user.alertFilterFor).length > 0),
              this.appService.sendServerCommand('updateAlertFilter', {
                alertFilterFor: this.appService.globals.user.alertFilterFor,
                userXrefID: this.appService.globals.user.userXrefID
              }),
              this.appService.setPreference(
                'showAlertsFrom',
                this.appService.globals.preferences.showAlertsFrom
              ))
            : (this.appService.globals.preferences.showAlertsFrom =
                !this.appService.globals.preferences.showAlertsFrom);
        }
      );
    }
    syncModAlertFilterList() {
      const e = JSON.parse(this.appService.globals.sessData.modAlertFilterList) || [];
      this.appService.globals.modAlertFilterList = e;
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-alert-filter-modal']],
        standalone: !0,
        features: [qn],
        decls: 20,
        vars: 4,
        consts: [
          [
            'id',
            'alert-filter-modal',
            'tabIndex',
            '-1',
            'role',
            'dialog',
            'aria-labelledby',
            'alert-filter-modal',
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
          [1, 'modal-body', 'pt-1'],
          [1, 'form-check', 'm-2'],
          [
            'type',
            'checkbox',
            'value',
            '',
            'id',
            'show-alerts',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'click',
            'ngModel'
          ],
          ['for', 'show-alerts', 1, 'form-check-label'],
          [1, 'list-group'],
          [1, 'modal-footer', 'd-flex', 'align-items-center', 'justify-content-between'],
          ['type', 'button', 'data-bs-dismiss', 'modal', 1, 'btn', 'btn-secondary'],
          [1, 'list-group-item', 'list-group-item-action'],
          [1, 'list-group-item', 'list-group-item-action', 3, 'click'],
          ['type', 'button', 1, 'btn', 'btn-warning', 'm-1', 3, 'click'],
          [1, 'fas', 'fa-minus-square', 'me-1'],
          ['type', 'button', 1, 'btn', 'btn-info', 'm-1', 3, 'click'],
          [1, 'fas', 'fa-plus-square', 'me-1'],
          ['type', 'button', 1, 'btn', 'btn-success', 3, 'click']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 0)(1, 'div', 1)(2, 'div', 2)(3, 'div', 3)(4, 'h5'),
            H(5, Sue, 1, 0)(6, wue, 1, 0),
            v(7, ' alerts from the following: '),
            u(),
            T(8, 'button', 4),
            u(),
            d(9, 'div', 5)(10, 'div', 6)(11, 'input', 7),
            Ve('ngModelChange', function (r) {
              return (
                He(o.appService.globals.preferences.showAlertsFrom, r) ||
                  (o.appService.globals.preferences.showAlertsFrom = r),
                r
              );
            }),
            x('click', function () {
              return o.showAlertsFrom();
            }),
            u(),
            d(12, 'label', 8),
            v(13, ' Only show alerts from these people: '),
            u()(),
            H(14, Due, 3, 0, 'ul', 9)(15, Eue, 2, 0),
            u(),
            d(16, 'div', 10)(17, 'button', 11),
            v(18, ' Close '),
            u(),
            H(19, kue, 9, 0),
            u()()()()),
            2 & i &&
              (m(5),
              O(5, o.appService.globals.preferences.showAlertsFrom ? 5 : 6),
              m(6),
              je('ngModel', o.appService.globals.preferences.showAlertsFrom),
              m(3),
              O(
                14,
                o.appService.globals.modAlertFilterList &&
                  o.appService.globals.modAlertFilterList.length > 0
                  ? 14
                  : 15
              ),
              m(5),
              O(
                19,
                o.appService.globals.modAlertFilterList &&
                  o.appService.globals.modAlertFilterList.length > 0
                  ? 19
                  : -1
              )));
        },
        dependencies: [t_, Ss, ti, Yn],
        styles: [
          '.text-opacity[_ngcontent-%COMP%]{opacity:.1}.list-group-item-action[_ngcontent-%COMP%]{padding:4px 4px 4px 16px}.list-group-item-action[_ngcontent-%COMP%]:hover{cursor:pointer}.form-check-input[_ngcontent-%COMP%]:hover{cursor:pointer;opacity:.85}'
        ]
      });
    }
  }
  return t;
})();
