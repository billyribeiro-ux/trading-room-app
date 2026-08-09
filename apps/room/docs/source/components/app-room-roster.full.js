const d2e = (t, n) => n.userXrefID,
  u2e = (t, n) => ({ regUser: t, presUser: n });
function h2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'img', 19),
      x('click', function () {
        D(e);
        const o = g(3).$implicit;
        return E(g().doUserInfo(o.userXrefID, o._id, o.socketID, o.serverID));
      }),
      u());
  }
  if (2 & t) {
    const e = g(3).$implicit;
    (xn('alt', e.nick),
      z('src', e.pic || 'https://secure.gravatar.com/avatar/' + e.emailHash + '?d=mm&s=50', Mt));
  }
}
function p2e(t, n) {
  if ((1 & t && (T(0, 'div', 8), Je(1, 'noSanitize')), 2 & t)) {
    const e = g(3).$implicit;
    z('innerHTML', Ct(1, 1, g().parseBadges(e.data.badges), 'html'), wn);
  }
}
function f2e(t, n) {
  1 & t && (d(0, 'span', 9), v(1, 'Trial'), u());
}
function m2e(t, n) {
  1 & t && (d(0, 'span', 10), v(1, 'New'), u());
}
function g2e(t, n) {
  if ((1 & t && (d(0, 'span', 11), T(1, 'i', 20), d(2, 'span', 21), v(3), u()()), 2 & t)) {
    const e = g(3).$implicit;
    (m(3), Ze(e.data.years));
  }
}
function _2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 14),
      x('click', function () {
        D(e);
        const o = g(3).$implicit;
        return E(g().startPC(o));
      }),
      T(1, 'i', 22),
      v(2, '\xa0\xa0Private Chat '),
      u());
  }
}
function b2e(t, n) {
  if ((1 & t && (d(0, 'p', 18), v(1), u()), 2 & t)) {
    const e = g(3).$implicit;
    (m(), Ne(' ', e.privData.locStr, ' '));
  }
}
function v2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 3),
      H(1, h2e, 1, 2, 'img', 4),
      d(2, 'div', 5)(3, 'div', 6)(4, 'span', 7),
      x('click', function () {
        D(e);
        const o = g(2).$implicit;
        return E(g().doMention(o.nick));
      })('dblclick', function () {
        D(e);
        const o = g(2).$implicit;
        return E(g().doUserInfo(o.userXrefID, o._id, o.socketID, o.serverID));
      }),
      v(5),
      u(),
      H(6, p2e, 2, 4, 'div', 8)(7, f2e, 2, 0, 'span', 9)(8, m2e, 2, 0, 'span', 10)(
        9,
        g2e,
        4,
        1,
        'span',
        11
      ),
      d(10, 'a', 12),
      v(11, '\u2807 '),
      u(),
      d(12, 'div', 13)(13, 'a', 14),
      x('click', function () {
        D(e);
        const o = g(2).$implicit;
        return E(g().doUserInfo(o.userXrefID, o._id, o.socketID, o.serverID));
      }),
      T(14, 'i', 15),
      v(15, '\xa0\xa0User Info'),
      u(),
      d(16, 'a', 14),
      x('click', function () {
        D(e);
        const o = g(2).$implicit;
        return E(g().doMention(o.nick));
      }),
      T(17, 'i', 16),
      v(18, '\xa0\xa0Mention / Reply'),
      u(),
      H(19, _2e, 3, 0, 'a', 17),
      u()(),
      H(20, b2e, 2, 1, 'p', 18),
      u()());
  }
  if (2 & t) {
    const e = g(2).$implicit,
      i = g();
    (m(),
      O(1, i.showUserAvatar(e.isP) ? 1 : -1),
      m(4),
      Ze(e.nick),
      m(),
      O(6, e.data.badges ? 6 : -1),
      m(),
      O(7, i.appService.globals.isPresenter && e.isFT ? 7 : -1),
      m(),
      O(
        8,
        i.appService.globals.sessData.isNewIndicatorOn &&
          i.appService.globals.isPresenter &&
          e.isNew
          ? 8
          : -1
      ),
      m(),
      O(9, i.appService.globals.sessData.disableStarYears || e.isP || !e.data.years ? -1 : 9),
      m(10),
      O(
        19,
        i.canPM ||
          (('a' === e.perms || e.hasAdminChat) && i.appService.globals.sessData.userToPresenterPM)
          ? 19
          : -1
      ),
      m(),
      O(20, i.appService.globals.isPresenter && e.privData ? 20 : -1));
  }
}
function y2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 3),
      T(1, 'i', 23),
      d(2, 'span', 7),
      x('click', function () {
        D(e);
        const o = g(2).$implicit;
        return E(g().doMention(o.nick));
      })('dblclick', function () {
        D(e);
        const o = g(2).$implicit;
        return E(g().doUserInfo(o.userXrefID, o._id, o.socketID, o.serverID));
      }),
      v(3),
      u()());
  }
  if (2 & t) {
    const e = g(2).$implicit;
    (m(3), Ze(e.nick));
  }
}
function F2e(t, n) {
  if ((1 & t && (d(0, 'div', 2), H(1, v2e, 21, 8, 'div', 3)(2, y2e, 4, 1), u()), 2 & t)) {
    const e = g().$implicit,
      i = g();
    (z('ngClass', Kn(2, u2e, !e.isP, e.isP || e.hasAdminChat)),
      m(),
      O(1, !i.appService.globals.sessData.showOnlyUsernames || e.isP ? 1 : 2));
  }
}
function C2e(t, n) {
  if ((1 & t && (d(0, 'div', 1), H(1, F2e, 3, 5, 'div', 2), u()), 2 & t)) {
    const e = n.$implicit,
      i = g();
    (m(),
      O(
        1,
        (i.appService.globals.sessData.onlyPresentersVisibleToViewers &&
          (e.isP || e.hasAdminChat)) ||
          i.appService.globals.sessData.rosterVisibleToViewers ||
          i.appService.globals.isPresenter ||
          (i.appService.globals.user.hasAdminChat &&
            (e.isP || e.hasAdminChat || i.appService.globals.user.userXrefID === e.userXrefID))
          ? 1
          : -1
      ));
  }
}
function S2e(t, n) {}
wB = (() => {
  class t {
    constructor(e) {
      ((this.appService = e),
        (this.canPM = !0),
        (this.isSortUsers = !1),
        (this.isSortFTUsers = !1),
        (this.badges = ''));
    }
    ngOnInit() {
      ((this.canPM =
        (this.appService.globals.isPresenter || this.appService.globals.sessData.userPM) &&
        !(
          this.appService.globals.user.isFT && this.appService.globals.sessData.disablePMForTrials
        )),
        this.appService.guiEventBus.subscribe('sortUsers', (e) => {
          this.isSortUsers = e;
        }),
        this.appService.guiEventBus.subscribe('sortFTUsers', (e) => {
          this.isSortFTUsers = e;
        }));
    }
    ngAfterContentInit() {}
    showUserAvatar(e) {
      return !this.appService.globals.sessData.hideAvatars || !!e;
    }
    parseBadges(e) {
      if (
        ((this.badges = ''),
        this.appService.globals.sessData.enableBadges &&
          e &&
          (!this.appService.globals.sessData.showBadgesToPresentersOnly ||
            this.appService.globals.isPresenter))
      )
        for (let i = 0; i < e.length; i++) {
          let s = this.appService.globals.sessData.badgesH[e[i]];
          (s &&
            s.hasOwnProperty('darkTheme') &&
            s.darkTheme &&
            'darkTheme' === this.appService.globals.preferences.theme &&
            ((s = this.appService.globals.sessData.badgesH[s.darkTheme]),
            console.log('parseBadges DARK b: ', s)),
            s &&
              (this.badges +=
                s.hasOwnProperty('imgURL') && s.imgURL
                  ? '<img class="user-badge-img" src="' + s.imgURL + '" alt="' + s.imgURL + '"/>'
                  : '<span class="badge px-1 mx-1 user-badge" style="background-color: ' +
                    s.bkcolor +
                    '; color: ' +
                    s.color +
                    '" >' +
                    s.text +
                    '</span>'));
        }
      return this.badges;
    }
    doUserInfo(e, i, o = null, s = null) {
      (this.appService.getUserInfo(e, i, o, s, !0),
        this.appService.guiEventBus.emit('doUserInfo', e));
    }
    doMention(e) {
      this.appService.guiEventBus.emit(
        this.appService.globals.preferences.extraChatColumn &&
          'textAreaTxtExtra' === this.appService.globals.chatInputFocus
          ? 'doMentionExtra'
          : 'doMention',
        e
      );
    }
    startPC(e) {
      e.userXrefID !== this.appService.globals.user.userXrefID
        ? (!this.appService.globals.isPresenter &&
            !this.appService.globals.sessData.userPM &&
            !this.appService.globals.sessData.userToPresenterPM) ||
          this.appService.guiEventBus.emit('startPrivChat', {
            uid: e.userXrefID,
            isInit: !0,
            user: e
          })
        : bootbox.alert('Chatting with yourself again???');
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-room-roster']],
        inputs: { roster: 'roster', parent: 'parent' },
        decls: 6,
        vars: 7,
        consts: [
          [1, 'room-roster-list'],
          [1, 'room-roster-container'],
          [3, 'ngClass'],
          [1, 'media'],
          [1, 'rosterImg', 'mr-3', 3, 'src', 'alt'],
          [1, 'media-body'],
          [1, 'mt-0', 'mb-0', 'nickName', 'd-inline'],
          [3, 'click', 'dblclick'],
          [1, 'd-inline-block', 'align-baseline', 'mr-1', 3, 'innerHTML'],
          [1, 'badge', 'bg-danger', 'trial-badge'],
          [1, 'badge', 'bg-warning', 'new-badge'],
          [1, 'stars-container'],
          [
            'role',
            'button',
            'id',
            'dropdownMenuLink',
            'data-bs-toggle',
            'dropdown',
            'aria-haspopup',
            'true',
            'aria-expanded',
            'false',
            1,
            'msgMenu',
            'dropright',
            'd-inline-block',
            'float-right'
          ],
          ['aria-labelledby', 'dropdownMenuLink', 1, 'dropdown-menu', 'users-dropdown-options'],
          [1, 'dropdown-item', 3, 'click'],
          [1, 'fas', 'fa-user'],
          [1, 'fas', 'fa-reply'],
          [1, 'dropdown-item'],
          [1, 'userLocation'],
          [1, 'rosterImg', 'mr-3', 3, 'click', 'src', 'alt'],
          [1, 'fas', 'fa-star', 'stars-icon'],
          [1, 'stars-num'],
          [1, 'fas', 'fa-comments'],
          [1, 'fas', 'fa-user', 'm-1']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 0),
            ht(1, C2e, 2, 1, 'div', 1, d2e, !1, S2e, 0, 0),
            Je(4, 'sortUsers'),
            Je(5, 'sortFTUsers'),
            u()),
            2 & i && (m(), pt(Ct(5, 4, Ct(4, 1, o.roster, o.isSortUsers), o.isSortFTUsers))));
        },
        dependencies: [Di, Rr, l2e, c2e],
        styles: [
          '.rosterImg[_ngcontent-%COMP%]{width:45px;height:45px;object-fit:cover;border-radius:var(--rosterImg-border-radius)}.presUser[_ngcontent-%COMP%], .regUser[_ngcontent-%COMP%]{font-size:14px}.presUser[_ngcontent-%COMP%]:hover, .regUser[_ngcontent-%COMP%]:hover{cursor:pointer;transition:all .2s}.nickName[_ngcontent-%COMP%]{font-weight:bolder;font-size:16px;color:var(--nickname-color);position:relative}.nickName[_ngcontent-%COMP%]   .dropdown-menu[_ngcontent-%COMP%]{position:absolute;left:-12px}.presUser[_ngcontent-%COMP%]{background-color:var(--roster-bg-adm)!important;border-bottom:1px solid var(--dark-gray)!important}.regUser[_ngcontent-%COMP%]{background-color:var(--roster-bg);border-bottom:1px solid var(--dark-gray)}.userLocation[_ngcontent-%COMP%]{font-weight:200;font-size:12px;margin-bottom:0;color:var(--user-location-color)}.msgMenu[_ngcontent-%COMP%]{padding-left:5px;font-size:20px;font-weight:600;color:var(--username-color)!important}.msgMenu[_ngcontent-%COMP%]:hover{color:var(--light-brown)!important;font-weight:900;cursor:pointer}.room-roster-list[_ngcontent-%COMP%]{width:100%;height:100%;overflow-y:inherit!important}.chat-stars[_ngcontent-%COMP%]{font-size:8px;vertical-align:text-top!important}span.chat-stars[_ngcontent-%COMP%]{margin-top:2px;margin-left:2px;display:inline-block}span.chat-stars[_ngcontent-%COMP%]{color:var(--app-primary-color)}.stars-container[_ngcontent-%COMP%]{position:relative}.stars-container[_ngcontent-%COMP%]   .stars-icon[_ngcontent-%COMP%]{color:var(--msg-color)}.stars-num[_ngcontent-%COMP%]{position:absolute;color:var(--msgs-bg);left:6px;top:4px;font-size:10px;font-weight:700}.room-roster-container[_ngcontent-%COMP%]{display:block;width:100%;min-height:42px}virtual-scroller[_ngcontent-%COMP%]{width:100%;height:100vh}'
        ]
      });
    }
  }
  return t;
})();
