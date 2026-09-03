const u3e = (t, n) => n._id;
function h3e(t, n) {
  1 & t && (d(0, 'div', 7), v(1, "You don't have any muted/ignored users."), u());
}
function p3e(t, n) {
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
function f3e(t, n) {
  if ((1 & t && (d(0, 'ul', 10), ht(1, p3e, 6, 3, 'li', 11, u3e), u()), 2 & t)) {
    const e = g();
    (m(), pt(e.mutedUsers));
  }
}
