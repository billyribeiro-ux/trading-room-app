const r3e = (t, n) => n._id;
function a3e(t, n) {
  1 & t && (d(0, 'div', 7), v(1, "You don't have any muted/ignored users."), u());
}
function l3e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 11)(1, 'div', 12),
      T(2, 'img', 13),
      v(3),
      u(),
      d(4, 'button', 14),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(2).removeUser(o));
      }),
      T(5, 'i', 15),
      u()());
  }
  if (2 & t) {
    const e = n.$implicit;
    (m(2),
      xn('alt', e.nick),
      z('src', e.pic || 'https://secure.gravatar.com/avatar/' + e.emailHash + '?d=mm&s=30', Mt),
      m(),
      Ne(' ', e.nick, ' '));
  }
}
function c3e(t, n) {
  if ((1 & t && (d(0, 'ul', 10), ht(1, l3e, 6, 3, 'li', 11, r3e), u()), 2 & t)) {
    const e = g();
    (m(), pt(e.mutedUsers));
  }
}
VB = (() => {
  class t {
    constructor(e) {
      ((this.appService = e), (this.mutedUsers = []));
    }
    ngOnInit() {
      this.appService.appEventBus.subscribe('manageMutedUsers', () => {
        this.mutedUsers = this.appService.globals.mutedUsers
          ? Object.values(this.appService.globals.mutedUsers)
          : [];
      });
    }
    removeUser(e) {
      const i = this;
      bootbox.confirm({
        message: 'Do you want to unmute ' + e.nick + '?',
        className: 'manage-user-list',
        callback(o) {
          o &&
            (i.appService.removeUserFromList(e.emailHash, 'mutedUsers'),
            i.appService.appEventBus.emit('manageMutedUsers'));
        }
      });
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-muted-users-modal']],
        decls: 13,
        vars: 1,
        consts: [
          [
            'id',
            'mutedUsersModal',
            'tabindex',
            '-1',
            'aria-labelledby',
            'mutedUsersModalLabel',
            'aria-hidden',
            'true',
            1,
            'modal',
            'fade'
          ],
          [1, 'modal-dialog'],
          [1, 'modal-content'],
          [1, 'modal-header'],
          ['id', 'mutedUsersModalLabel', 1, 'modal-title'],
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
          [1, 'text-center'],
          [1, 'modal-footer'],
          ['type', 'button', 'data-bs-dismiss', 'modal', 1, 'btn', 'btn-primary'],
          [1, 'list-group', 'list-group-flush'],
          [1, 'list-group-item', 'd-flex', 'justify-content-between', 'align-items-start'],
          [1, 'fw-bold'],
          [3, 'src', 'alt'],
          [1, 'btn', 'btn-outline-danger', 'btn-sm', 3, 'click'],
          [1, 'fas', 'fa-trash']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 0)(1, 'div', 1)(2, 'div', 2)(3, 'div', 3)(4, 'h5', 4),
            v(5, 'Muted Chat Users'),
            u(),
            T(6, 'button', 5),
            u(),
            d(7, 'div', 6),
            H(8, a3e, 2, 0, 'div', 7)(9, c3e, 3, 0),
            u(),
            d(10, 'div', 8)(11, 'button', 9),
            v(12, ' Close '),
            u()()()()()),
            2 & i && (m(8), O(8, 0 === o.mutedUsers.length ? 8 : 9)));
        },
        styles: [
          '.modal-dialog[_ngcontent-%COMP%]{overflow-y:initial!important}.modal-body[_ngcontent-%COMP%]{max-height:79vh;overflow-y:auto;height:100%}.list-group-item[_ngcontent-%COMP%]{background-color:inherit;color:#f1f1f1}.list-group-item[_ngcontent-%COMP%]:hover{background-color:#353535}.fw-bold[_ngcontent-%COMP%]{text-overflow:ellipsis;overflow:hidden;white-space:nowrap}.fw-bold[_ngcontent-%COMP%]   img[_ngcontent-%COMP%]{width:30px;height:30px}'
        ]
      });
    }
  }
  return t;
})();
