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
