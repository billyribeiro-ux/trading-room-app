const cMe = (t, n) => n.sendOn,
  dMe = (t, n, e) => ({ 'text-bg-danger': t, 'text-bg-info': n, 'text-bg-warning': e });
function uMe(t, n) {
  1 & t && (d(0, 'span', 14), v(1, 'no weekends'), u());
}
function hMe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'tr', 9)(1, 'th', 12),
      v(2),
      Je(3, 'date'),
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
      H(11, uMe, 2, 0, 'span', 14),
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
        $a(9, dMe, '' === e.repeat || !e.repeat, 'daily' === e.repeat, 'weekly' === e.repeat)
      ),
      m(),
      Ne(' ', e.repeat || 'off', ' '),
      m(),
      O(11, 'daily' === e.repeat && e.ignoreWeekends ? 11 : -1));
  }
}
