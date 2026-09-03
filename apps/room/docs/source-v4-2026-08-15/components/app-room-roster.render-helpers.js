const m2e = (t, n) => n.userXrefID,
  g2e = (t, n) => ({ regUser: t, presUser: n });
function _2e(t, n) {
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
function b2e(t, n) {
  if ((1 & t && (T(0, 'div', 8), Xe(1, 'noSanitize')), 2 & t)) {
    const e = g(3).$implicit;
    z('innerHTML', Ct(1, 1, g().parseBadges(e.data.badges), 'html'), wn);
  }
}
function v2e(t, n) {
  1 & t && (d(0, 'span', 9), v(1, 'Trial'), u());
}
function y2e(t, n) {
  1 & t && (d(0, 'span', 10), v(1, 'New'), u());
}
function F2e(t, n) {
  if ((1 & t && (d(0, 'span', 11), T(1, 'i', 20), d(2, 'span', 21), v(3), u()()), 2 & t)) {
    const e = g(3).$implicit;
    (m(3), Ze(e.data.years));
  }
}
function C2e(t, n) {
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
function S2e(t, n) {
  if ((1 & t && (d(0, 'p', 18), v(1), u()), 2 & t)) {
    const e = g(3).$implicit;
    (m(), Ne(' ', e.privData.locStr, ' '));
  }
}
function w2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 3),
      H(1, _2e, 1, 2, 'img', 4),
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
      H(6, b2e, 2, 4, 'div', 8)(7, v2e, 2, 0, 'span', 9)(8, y2e, 2, 0, 'span', 10)(
        9,
        F2e,
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
      H(19, C2e, 3, 0, 'a', 17),
      u()(),
      H(20, S2e, 2, 1, 'p', 18),
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
function T2e(t, n) {
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
function D2e(t, n) {
  if ((1 & t && (d(0, 'div', 2), H(1, w2e, 21, 8, 'div', 3)(2, T2e, 4, 1), u()), 2 & t)) {
    const e = g().$implicit,
      i = g();
    (z('ngClass', Kn(2, g2e, !e.isP, e.isP || e.hasAdminChat)),
      m(),
      O(1, !i.appService.globals.sessData.showOnlyUsernames || e.isP ? 1 : 2));
  }
}
function E2e(t, n) {
  if ((1 & t && (d(0, 'div', 1), H(1, D2e, 3, 5, 'div', 2), u()), 2 & t)) {
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
function k2e(t, n) {}
