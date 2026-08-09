const m3e = (t, n) => n._id;
function g3e(t, n) {
  1 & t && (d(0, 'div', 7), v(1, "You don't have any followed users."), u());
}
function _3e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 17),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(2).openUserInfo(o.userXrefID, o._id));
      }),
      T(1, 'i', 18),
      u());
  }
}
function b3e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 11)(1, 'div', 12),
      T(2, 'img', 13),
      v(3),
      u(),
      d(4, 'div'),
      H(5, _3e, 2, 0, 'button', 14),
      d(6, 'button', 15),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(2).removeUser(o));
      }),
      T(7, 'i', 16),
      u()()());
  }
  if (2 & t) {
    const e = n.$implicit;
    (m(2),
      xn('alt', e.nick),
      z('src', e.pic || 'https://secure.gravatar.com/avatar/' + e.emailHash + '?d=mm&s=30', Mt),
      m(),
      Ne(' ', e.nick, ' '),
      m(2),
      O(5, e.hasOwnProperty('_id') && e.hasOwnProperty('userXrefID') ? 5 : -1));
  }
}
function v3e(t, n) {
  if ((1 & t && (d(0, 'ul', 10), ht(1, b3e, 8, 4, 'li', 11, m3e), u()), 2 & t)) {
    const e = g();
    (m(), pt(e.followedUsers));
  }
}
