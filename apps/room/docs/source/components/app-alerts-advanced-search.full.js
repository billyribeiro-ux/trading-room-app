const LMe = (t, n) => n.avatar,
  BMe = (t, n) => n._id,
  UMe = (t) => ({ 'justify-content-between': t });
function jMe(t, n) {
  if ((1 & t && (d(0, 'span', 12), v(1), u()), 2 & t)) {
    const e = g();
    (m(), Ne('', e.selectedTradersStr, ' '));
  }
}
function VMe(t, n) {
  1 & t && (d(0, 'span'), v(1, '--Select Traders--'), u());
}
function HMe(t, n) {
  1 & t && T(0, 'i', 37);
}
function $Me(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 35),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g().toggleTraders(o.avatar, o.username));
      }),
      d(1, 'a', 36),
      H(2, HMe, 1, 0, 'i', 37),
      v(3),
      u()());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = g();
    (m(2), O(2, i.search.traders[e.avatar] ? 2 : -1), m(), Ne(' ', e.username, ''));
  }
}
function zMe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li'),
      T(1, 'hr', 38),
      u(),
      d(2, 'li', 39)(3, 'button', 40),
      x('click', function () {
        return (D(e), E(g().unselectTraders()));
      }),
      T(4, 'i', 41),
      v(5, ' Unselect All '),
      u()());
  }
}
function GMe(t, n) {
  if ((1 & t && (d(0, 'span', 16), v(1), u()), 2 & t)) {
    const e = g();
    (m(), Ne('', e.selectedRoomsStr, ' '));
  }
}
function WMe(t, n) {
  1 & t && (d(0, 'span'), v(1, '--Select Rooms--'), u());
}
function qMe(t, n) {
  1 & t && T(0, 'i', 37);
}
function KMe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 35),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g().toggleSess(o.key, o.value));
      }),
      d(1, 'a', 36),
      H(2, qMe, 1, 0, 'i', 37),
      v(3),
      u()());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = g();
    (m(2), O(2, i.search.rooms[e.key] ? 2 : -1), m(), Ne(' ', e.value, ''));
  }
}
function YMe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li'),
      T(1, 'hr', 38),
      u(),
      d(2, 'li', 39)(3, 'button', 40),
      x('click', function () {
        return (D(e), E(g().unselectRooms()));
      }),
      T(4, 'i', 41),
      v(5, ' Unselect All '),
      u()());
  }
}
function QMe(t, n) {
  1 & t && (d(0, 'div', 29)(1, 'h5'), T(2, 'i', 42), v(3, ' Loading...'), u()());
}
function XMe(t, n) {
  1 & t && v(0, 's');
}
function JMe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'app-st-message', 46),
      x('click', function (o) {
        const s = D(e).$implicit;
        return E(g(3).copyTradeOnClick(o, 'id_' + s._id));
      }),
      u());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = n.$index,
      o = g(3);
    z('msg', e)('logType', 'alerts')('prevD', i > 0 ? o.msgs[i - 1].t : 0)(
      'sessName',
      (null == e ? null : e.sessName) || null
    );
  }
}
function ZMe(t, n) {
  if (
    (1 & t &&
      (d(0, 'p', 39),
      v(1),
      H(2, XMe, 1, 0),
      v(3, '. '),
      u(),
      d(4, 'div', 44),
      ht(5, JMe, 1, 4, 'app-st-message', 45, BMe),
      u()),
    2 & t)
  ) {
    const e = g(2);
    (m(),
      Ne(' Found: ', e.msgs.length, ' alert'),
      m(),
      O(2, e.msgs.length > 1 ? 2 : -1),
      m(3),
      pt(e.msgs));
  }
}
function eAe(t, n) {
  1 & t && (d(0, 'div', 47), v(1, ' No logs to display. Please, change the input fields. '), u());
}
function tAe(t, n) {
  if ((1 & t && (d(0, 'div', 43), H(1, ZMe, 7, 2)(2, eAe, 2, 0), u()), 2 & t)) {
    const e = g();
    (m(), O(1, e.msgs.length > 0 ? 1 : 2));
  }
}
function nAe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 48),
      x('click', function () {
        return (D(e), E(g().clearInput()));
      }),
      T(1, 'i', 49),
      v(2, ' Clear '),
      u());
  }
}
iAe = (() => {
  class t {
    constructor(e) {
      ((this.appService = e),
        (this.traders = [
          { username: 'Allison', avatar: 'c90b7e877c17de66ff99477ffa260e5f' },
          { username: 'Big Bad Voodoo Daddy', avatar: '178f883e5d5e2d65014184ea8c53eccd' },
          { username: 'Bruce Marshall', avatar: 'c4463f1d9bc057681ce6489842ab3560' },
          { username: 'Chris Brecher', avatar: '32bd682110860e9a3236b40f18aea1d3' },
          { username: 'Danielle Shay', avatar: '69ec1c2bf45a0805a4de3857281f6552' },
          { username: 'Heather', avatar: '7a21075eb3a4351785c979aab0f9e619' },
          { username: 'Henry', avatar: 'b2477abea370f548161935971e626de3' },
          { username: 'JC', avatar: 'fad3b84a1be6c0a1a64f896d6b6d4c7e' },
          { username: 'Kody Ashmore', avatar: 'c7a42275225d6ea4165dc2dadde70fe0' },
          { username: 'Lorna St. George', avatar: '672796ec44d7650f0b13d9302cfc0829' },
          { username: 'Melissa Beegle', avatar: 'aa44e468f60cc33cd82da51f3ad2c7c8' },
          { username: 'Mirza Catic', avatar: 'd1f9096a89e8e8f16974f7b98c4cc412' },
          { username: 'Omer Krdzic', avatar: 'a0cb40d4732d9a3585b4bc08e2e21159' },
          { username: 'RH', avatar: '8984cfde2f7735f6a1c0b2b5e24caf13' },
          { username: 'Sam', avatar: '37d5bf5b1f72c7f8fdcb2527d648ea4b' },
          { username: 'ST_Neil', avatar: '8e811d6b96df8e19b73bc821db6a09bf' },
          { username: 'Taylor', avatar: '09b36ef470e6b78cb5566170b001e576' },
          { username: 'TG Watkins', avatar: 'b4d52c4a7bfbbc45333515d2ab9de59c' },
          { username: 'Trendy Jon', avatar: '6a67150edb9b26ab4f5dd2928c6d256a' },
          { username: 'CML Alert Bot', avatar: '3216c53b52f2d36b6a539931685b442e' }
        ]),
        (this.msgs = []),
        (this.loading = !1),
        (this.userSessions = {}),
        (this.selectedRoomsStr = ''),
        (this.selectedTradersStr = ''),
        (this.search = {
          traders: {},
          rooms: {},
          txt: '',
          nonTradeAlert: !1,
          startDate: '',
          endDate: '',
          isArchived: !1
        }),
        (this.copyTradeAlertVisible = !1));
    }
    ngOnInit() {
      this.clearInput();
      const e = this.appService.localstorage.getObject('userSessions');
      (e && Object.keys(e).length > 0
        ? (console.log('getUserSessions: ', e), (this.userSessions = e))
        : (console.log('getUserSessions getAllSTRoomsForUser(): '),
          this.appService.getAllSTRoomsForUser()),
        this.appService.appEventBus.subscribe('getAllSTRoomsForUserSuccess', (i) => {
          ((this.userSessions = i.userSessions),
            this.appService.localstorage.setObject('userSessions', this.userSessions));
        }),
        this.appService.appEventBus.subscribe('getAlertsAdvancedSearchFailed', (i) => {
          ((this.msgs = []), (this.loading = !1), bootbox.alert(i.msg));
        }),
        this.appService.appEventBus.subscribe('getAlertsAdvancedSearchSuccess', (i) => {
          (console.log('getAlertsAdvancedSearchSuccess got data: ', i),
            i &&
              ((this.msgs = i.alerts),
              this.msgs &&
                this.msgs.length > 0 &&
                (this.msgs = this.msgs.map(
                  (o) => (
                    o.txt.includes('[{(') &&
                      o.txt.includes(')}]') &&
                      ((o.txt = o.txt.replace(
                        '[{(',
                        '<span class="tradeColor" id="id_' + o._id + '">'
                      )),
                      (o.txt = o.txt.replace(')}]', '</span>'))),
                    o
                  )
                ))),
            (this.loading = !1));
        }));
    }
    copyTradeOnClick(e, i) {
      const o = e.target;
      'SPAN' === o.tagName &&
        o.classList.contains('tradeColor') &&
        o.id === i &&
        (this.doTradeCopy(i), e.stopPropagation());
    }
    doTradeCopy(e) {
      const i = document.getElementById(e);
      if (i) {
        const o = i.textContent || '';
        navigator.clipboard
          .writeText(o)
          .then(() => {
            (console.log('Text copied to clipboard:', o),
              this.copyTradeAlertVisible ||
                ((this.copyTradeAlertVisible = !0),
                bootbox.alert('Order copied to clipboard.', () => {
                  this.copyTradeAlertVisible = !1;
                })));
          })
          .catch((s) => {
            console.error('Failed to copy text:', s);
          });
      } else console.error('Element not found for id:', e);
    }
    searchAlerts() {
      if (
        '' === this.search.txt &&
        '' === this.search.startDate &&
        '' === this.search.endDate &&
        0 === Object.keys(this.search.rooms).length &&
        0 === Object.keys(this.search.traders).length &&
        !this.search.nonTradeAlert
      )
        return !1;
      console.log('searchAlerts() this.search: ', this.search);
      let {
        traders: e,
        rooms: i,
        txt: o,
        startDate: s,
        endDate: r,
        nonTradeAlert: a,
        isArchived: l
      } = this.search;
      0 === Object.keys(this.search.rooms).length && (i = this.userSessions);
      const c = {
        traders: Object.keys(e),
        rooms: i,
        txt: o,
        startDate: s,
        endDate: r,
        nonTradeAlert: a,
        isArchived: l
      };
      ((this.msgs = []), (this.loading = !0), this.appService.getAlertsAdvancedSearch(c));
    }
    onInputChange(e) {
      13 === e.keyCode && (e.preventDefault(), this.searchAlerts());
    }
    clearInput() {
      ((this.search = {
        traders: {},
        rooms: {},
        txt: '',
        nonTradeAlert: !1,
        startDate: '',
        endDate: ''
      }),
        (this.loading = !1),
        (this.msgs = []),
        (this.selectedRoomsStr = ''),
        (this.selectedTradersStr = ''));
    }
    checkInputs() {
      return (
        '' !== this.search.txt ||
        '' !== this.search.startDate ||
        '' !== this.search.endDate ||
        this.search.nonTradeAlert ||
        (this.msgs && this.msgs.length > 0)
      );
    }
    toggleSess(e, i) {
      this.search.rooms[e] ? delete this.search.rooms[e] : (this.search.rooms[e] = i);
      const o = Object.values(this.search.rooms);
      this.selectedRoomsStr = o ? o.join(', ') : '';
    }
    syncRooms() {
      bootbox.confirm('Are you sure you want to reload the room list?', (e) => {
        e && this.appService.getAllSTRoomsForUser();
      });
    }
    unselectRooms() {
      for (let e in this.search.rooms)
        this.search.rooms.hasOwnProperty(e) && delete this.search.rooms[e];
      this.selectedRoomsStr = '';
    }
    toggleTraders(e, i) {
      this.search.traders[e] ? delete this.search.traders[e] : (this.search.traders[e] = i);
      const o = Object.values(this.search.traders);
      this.selectedTradersStr = o ? o.join(', ') : '';
    }
    unselectTraders() {
      for (let e in this.search.traders)
        this.search.traders.hasOwnProperty(e) && delete this.search.traders[e];
      this.selectedTradersStr = '';
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-alerts-advanced-search']],
        decls: 60,
        vars: 16,
        consts: [
          [
            'id',
            'alerts-advanced-search-modal',
            'tabIndex',
            '-1',
            'role',
            'dialog',
            'aria-labelledby',
            'alerts-advanced-search-modal',
            'aria-hidden',
            'true',
            1,
            'modal',
            'fade'
          ],
          ['role', 'document', 1, 'modal-dialog'],
          [1, 'modal-content'],
          [1, 'modal-header'],
          ['type', 'button', 1, 'btn', 'btn-info', 'btn-sm', 'mx-1', 3, 'click'],
          [1, 'fas', 'fa-sync-alt', 'me-1'],
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
          [1, 'd-flex', 'align-items-center', 'justify-content-between', 'flex-wrap', 'mb-2'],
          [1, 'd-flex', 'align-items-center', 'justify-content-between', 'flex-wrap'],
          [1, 'dropdown', 'dropdown-trader-select', 'mx-1'],
          [
            'type',
            'button',
            'data-bs-toggle',
            'dropdown',
            'data-bs-auto-close',
            'outside',
            'aria-expanded',
            'false',
            'id',
            'selectTraderDropdown',
            1,
            'btn',
            'btn-light',
            'dropdown-toggle'
          ],
          [1, 'selected-traders-str'],
          [1, 'dropdown-menu', 'w-100'],
          [1, 'dropdown', 'dropdown-room-select', 'mx-1'],
          [
            'type',
            'button',
            'data-bs-toggle',
            'dropdown',
            'data-bs-auto-close',
            'outside',
            'aria-expanded',
            'false',
            'id',
            'selectRoomDropdown',
            1,
            'btn',
            'btn-light',
            'dropdown-toggle'
          ],
          [1, 'selected-rooms-str'],
          [
            'id',
            'search-term-input',
            'name',
            'search-term-input',
            'type',
            'search',
            'placeholder',
            'Type your search term',
            'aria-label',
            'Type your search term',
            'aria-describedby',
            'search-term-addon',
            1,
            'form-control',
            3,
            'ngModelChange',
            'keyup',
            'ngModel'
          ],
          [1, 'form-check', 'm-1'],
          [
            'type',
            'checkbox',
            'id',
            'checkNonTradeAlert',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'checkNonTradeAlert', 1, 'form-check-label'],
          [
            'type',
            'checkbox',
            'id',
            'checkArchives',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'checkArchives', 1, 'form-check-label'],
          [1, 'd-flex', 'align-items-center', 'flex-wrap', 'date-input-container'],
          [1, 'd-flex', 'align-items-center', 'flex-wrap', 'm-1'],
          ['for', 'startDateInput', 1, 'form-label', 'm-0', 'me-1'],
          [
            'type',
            'datetime-local',
            'id',
            'startDateInput',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'endDateInput', 1, 'form-label', 'm-0', 'me-1'],
          [
            'type',
            'datetime-local',
            'id',
            'endDateInput',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [1, 'text-center', 'my-4'],
          [1, 'modal-footer', 'd-flex', 'align-items-center', 'justify-content-end', 3, 'ngClass'],
          ['type', 'button', 1, 'btn', 'btn-danger', 'm-2'],
          ['type', 'button', 1, 'btn', 'btn-primary', 'm-2', 'align-self-end', 3, 'click'],
          [1, 'fas', 'fa-search', 'me-1'],
          [
            'type',
            'button',
            'data-bs-dismiss',
            'modal',
            1,
            'btn',
            'btn-secondary',
            'm-2',
            'align-self-end'
          ],
          [3, 'click'],
          [1, 'dropdown-item'],
          [1, 'fas', 'fa-check-square', 'me-1'],
          [1, 'dropdown-divider'],
          [1, 'text-center'],
          ['type', 'button', 1, 'btn', 'btn-warning', 'btn-sm', 'mx-1', 3, 'click'],
          [1, 'fas', 'fa-minus-square', 'me-1'],
          [1, 'ml-2', 'fas', 'fa-spinner', 'fa-spin'],
          [1, 'w-100'],
          [1, 'log-messages'],
          [3, 'msg', 'logType', 'prevD', 'sessName'],
          [3, 'click', 'msg', 'logType', 'prevD', 'sessName'],
          [1, 'mt-4', 'pt-4', 'text-center'],
          ['type', 'button', 1, 'btn', 'btn-danger', 'm-2', 3, 'click'],
          [1, 'fa', 'fa-trash', 'me-1']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 0)(1, 'div', 1)(2, 'div', 2)(3, 'div', 3)(4, 'h5'),
            v(5, ' Alerts Advanced Search '),
            d(6, 'button', 4),
            x('click', function () {
              return o.syncRooms();
            }),
            T(7, 'i', 5),
            v(8, ' Rooms '),
            u()(),
            T(9, 'button', 6),
            u(),
            d(10, 'div', 7)(11, 'div', 8)(12, 'div', 9)(13, 'div', 10)(14, 'button', 11),
            H(15, jMe, 2, 1, 'span', 12)(16, VMe, 2, 0),
            u(),
            d(17, 'ul', 13),
            ht(18, $Me, 4, 2, 'li', null, LMe),
            H(20, zMe, 6, 0),
            u()(),
            d(21, 'div', 14)(22, 'button', 15),
            H(23, GMe, 2, 1, 'span', 16)(24, WMe, 2, 0),
            u(),
            d(25, 'ul', 13),
            ht(26, KMe, 4, 2, 'li', null, Li),
            Je(28, 'keyvalue'),
            H(29, YMe, 6, 0),
            u()()(),
            d(30, 'input', 17),
            Ve('ngModelChange', function (r) {
              return (He(o.search.txt, r) || (o.search.txt = r), r);
            }),
            x('keyup', function (r) {
              return o.onInputChange(r);
            }),
            u()(),
            d(31, 'div', 8)(32, 'div')(33, 'div', 18)(34, 'input', 19),
            Ve('ngModelChange', function (r) {
              return (He(o.search.nonTradeAlert, r) || (o.search.nonTradeAlert = r), r);
            }),
            u(),
            d(35, 'label', 20),
            v(36, ' Non Trade Alert '),
            u()(),
            d(37, 'div', 18)(38, 'input', 21),
            Ve('ngModelChange', function (r) {
              return (He(o.search.isArchived, r) || (o.search.isArchived = r), r);
            }),
            u(),
            d(39, 'label', 22),
            v(40, ' Also search archives? '),
            u()()(),
            d(41, 'div', 23)(42, 'div', 24)(43, 'label', 25),
            v(44, 'Start Date:'),
            u(),
            d(45, 'input', 26),
            Ve('ngModelChange', function (r) {
              return (He(o.search.startDate, r) || (o.search.startDate = r), r);
            }),
            u()(),
            d(46, 'div', 24)(47, 'label', 27),
            v(48, 'End Date:'),
            u(),
            d(49, 'input', 28),
            Ve('ngModelChange', function (r) {
              return (He(o.search.endDate, r) || (o.search.endDate = r), r);
            }),
            u()()()(),
            H(50, QMe, 4, 0, 'div', 29)(51, tAe, 3, 1),
            u(),
            d(52, 'div', 30),
            H(53, nAe, 3, 0, 'button', 31),
            d(54, 'div')(55, 'button', 32),
            x('click', function () {
              return o.searchAlerts();
            }),
            T(56, 'i', 33),
            v(57, ' Search '),
            u(),
            d(58, 'button', 34),
            v(59, ' Close '),
            u()()()()()()),
            2 & i &&
              (m(15),
              O(15, o.selectedTradersStr ? 15 : 16),
              m(3),
              pt(o.appService.globals.stTraders),
              m(2),
              O(20, o.selectedTradersStr ? 20 : -1),
              m(3),
              O(23, o.selectedRoomsStr ? 23 : 24),
              m(3),
              pt(yr(28, 12, o.userSessions)),
              m(3),
              O(29, o.selectedRoomsStr ? 29 : -1),
              m(),
              je('ngModel', o.search.txt),
              m(4),
              je('ngModel', o.search.nonTradeAlert),
              m(4),
              je('ngModel', o.search.isArchived),
              m(7),
              je('ngModel', o.search.startDate),
              m(4),
              je('ngModel', o.search.endDate),
              m(),
              O(50, o.loading ? 50 : 51),
              m(2),
              z('ngClass', ut(14, UMe, o.checkInputs())),
              m(),
              O(53, o.checkInputs() ? 53 : -1)));
        },
        dependencies: [Di, ai, Ss, ti, Yn, pu, Cd],
        styles: [
          '.modal-dialog[_ngcontent-%COMP%]{overflow-y:initial!important}.log-messages[_ngcontent-%COMP%]{max-height:calc(100vh - 425px);overflow-y:auto}.modal-dialog[_ngcontent-%COMP%]{width:100%;max-width:1000px}.dropdown-trader-select[_ngcontent-%COMP%]   .dropdown-toggle[_ngcontent-%COMP%], .dropdown-room-select[_ngcontent-%COMP%]   .dropdown-toggle[_ngcontent-%COMP%]{width:200px;height:38px;display:flex;align-items:center;justify-content:space-between}.form-select[_ngcontent-%COMP%]{width:200px}#search-term-input[_ngcontent-%COMP%]{flex:1;flex-basis:300px}#search-term-input[_ngcontent-%COMP%], .form-select[_ngcontent-%COMP%]{margin:4px}#startDateInput[_ngcontent-%COMP%], #endDateInput[_ngcontent-%COMP%]{width:190px}.dropdown-trader-select[_ngcontent-%COMP%]   .dropdown-item[_ngcontent-%COMP%]:hover, .dropdown-room-select[_ngcontent-%COMP%]   .dropdown-item[_ngcontent-%COMP%]:hover, #search-term-addon[_ngcontent-%COMP%]:hover{cursor:pointer;opacity:.85}.dropdown-trader-select[_ngcontent-%COMP%]   .dropdown-menu.show[_ngcontent-%COMP%]{height:420px;display:flex;flex-direction:column;width:410px!important;flex-wrap:wrap}.dropdown-trader-select[_ngcontent-%COMP%]   .dropdown-item[_ngcontent-%COMP%], .dropdown-room-select[_ngcontent-%COMP%]   .dropdown-item[_ngcontent-%COMP%]{word-break:break-word;text-wrap:wrap}.selected-traders-str[_ngcontent-%COMP%], .selected-rooms-str[_ngcontent-%COMP%]{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
        ]
      });
    }
  }
  return t;
})();
