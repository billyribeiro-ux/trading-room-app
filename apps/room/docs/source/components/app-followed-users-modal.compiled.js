HB = (() => {
  class t {
    constructor(e) {
      ((this.appService = e), (this.followedUsers = []));
    }
    ngOnInit() {
      this.appService.appEventBus.subscribe('manageFollowedUsers', () => {
        this.followedUsers = this.appService.globals.followedUsers
          ? Object.values(this.appService.globals.followedUsers)
          : [];
      });
    }
    removeUser(e) {
      const i = this;
      bootbox.confirm({
        message: 'Do you want to unfollow ' + e.nick + '?',
        className: 'manage-user-list',
        callback(o) {
          o &&
            (i.appService.removeUserFromList(e.emailHash, 'followedUsers'),
            i.appService.appEventBus.emit('manageFollowedUsers'));
        }
      });
    }
    openUserInfo(e, i) {
      e && i
        ? (this.appService.getUserInfo(e, i, null, null),
          this.appService.guiEventBus.emit('doUserInfo', e))
        : bootbox.alert('User is not logged in.');
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-followed-users-modal']],
        decls: 13,
        vars: 1,
        consts: [
          [
            'id',
            'followedUsersModal',
            'tabindex',
            '-1',
            'aria-labelledby',
            'followedUsersModalLabel',
            'aria-hidden',
            'true',
            1,
            'modal',
            'fade'
          ],
          [1, 'modal-dialog'],
          [1, 'modal-content'],
          [1, 'modal-header'],
          ['id', 'followedUsersModalLabel', 1, 'modal-title'],
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
          ['type', 'button', 'data-bs-dismiss', 'modal', 1, 'btn', 'btn-light'],
          [1, 'list-group', 'list-group-flush'],
          [1, 'list-group-item', 'd-flex', 'justify-content-between', 'align-items-start'],
          [1, 'fw-bold'],
          [3, 'src', 'alt'],
          [1, 'btn', 'btn-outline-success', 'btn-sm', 'me-1'],
          [1, 'btn', 'btn-outline-danger', 'btn-sm', 3, 'click'],
          [1, 'fas', 'fa-trash'],
          [1, 'btn', 'btn-outline-success', 'btn-sm', 'me-1', 3, 'click'],
          [1, 'fas', 'fa-edit']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 0)(1, 'div', 1)(2, 'div', 2)(3, 'div', 3)(4, 'h5', 4),
            v(5, ' Followed Chat Users '),
            u(),
            T(6, 'button', 5),
            u(),
            d(7, 'div', 6),
            H(8, g3e, 2, 0, 'div', 7)(9, v3e, 3, 0),
            u(),
            d(10, 'div', 8)(11, 'button', 9),
            v(12, ' Close '),
            u()()()()()),
            2 & i && (m(8), O(8, 0 === o.followedUsers.length ? 8 : 9)));
        },
        styles: [
          '#followedUsersModal[_ngcontent-%COMP%]{z-index:1054!important}.modal-dialog[_ngcontent-%COMP%]{overflow-y:initial!important}.modal-body[_ngcontent-%COMP%]{max-height:79vh;overflow-y:auto;height:100%}.list-group-item[_ngcontent-%COMP%]{background-color:inherit;color:#f1f1f1;border-color:#97cef0}.list-group-item[_ngcontent-%COMP%]:hover{background-color:#164663}.fw-bold[_ngcontent-%COMP%]{text-overflow:ellipsis;overflow:hidden;white-space:nowrap}.fw-bold[_ngcontent-%COMP%]   img[_ngcontent-%COMP%]{width:30px;height:30px}'
        ]
      });
    }
  }
  return t;
})();
