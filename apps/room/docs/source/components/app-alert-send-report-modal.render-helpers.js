const mMe = (t, n) => n.alertID,
  gMe = (t, n, e) => ({ 'text-success': t, 'text-danger': n, 'text-warning': e });
function _Me(t, n) {
  if ((1 & t && (d(0, 'div', 8), v(1), u()), 2 & t)) {
    const e = g(2);
    (m(), Ne(' ', e.loadingError, ' '));
  }
}
function bMe(t, n) {
  1 & t && (d(0, 'div', 9)(1, 'h5'), T(2, 'i', 10), v(3, ' Loading...'), u()());
}
function vMe(t, n) {
  (1 & t && H(0, _Me, 2, 1, 'div', 8)(1, bMe, 4, 0), 2 & t && O(0, g().loadingError ? 0 : 1));
}
function yMe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 27),
      x('click', function () {
        return (D(e), E(g(2).clearInput()));
      }),
      T(1, 'i', 28),
      u());
  }
}
function FMe(t, n) {
  if ((1 & t && (d(0, 'span'), v(1), u()), 2 & t)) {
    const e = g(2).$implicit;
    (m(), Ne('Latency: ', e.latency, ' secs'));
  }
}
function CMe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 33),
      T(1, 'i', 35),
      d(2, 'span', 36),
      v(3),
      Je(4, 'date'),
      u(),
      v(5, '\xa0\xa0'),
      H(6, FMe, 2, 1, 'span'),
      u()),
    2 & t)
  ) {
    const e = g().$implicit;
    (m(3), Ze(Ct(4, 2, e.sentTime, 'medium')), m(3), O(6, e.latency ? 6 : -1));
  }
}
function SMe(t, n) {
  if ((1 & t && (d(0, 'div', 34), T(1, 'i', 37), v(2), u()), 2 & t)) {
    const e = g().$implicit;
    (m(2), Ne('', e.failReason, ' '));
  }
}
function wMe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 30)(1, 'div', 31),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(3).showTokenReport(o.token));
      }),
      d(2, 'strong', 32),
      v(3),
      u(),
      d(4, 'i'),
      v(5),
      u(),
      H(6, CMe, 7, 5, 'div', 33)(7, SMe, 3, 1, 'div', 34),
      u()());
  }
  if (2 & t) {
    const e = n.$implicit;
    (z('ngClass', $a(5, gMe, 'sent' === e.status, 'failed' === e.status, 'queued' === e.status)),
      m(3),
      Ne('', e.name, '\xa0'),
      m(2),
      Ne('(', e.email, ')'),
      m(),
      O(6, null != e && e.sentTime ? 6 : -1),
      m(),
      O(7, null != e && e.failReason ? 7 : -1));
  }
}
function TMe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 26)(1, 'div', 29),
      ht(2, wMe, 8, 9, 'div', 30, mMe),
      Je(4, 'searchReports'),
      u()()),
    2 & t)
  ) {
    const e = g(2);
    (m(2), pt(yy(4, 0, e.reports, e.searchTxt, e.searchStatus)));
  }
}
function DMe(t, n) {
  1 & t && (d(0, 'div', 38), v(1, 'No Reports.'), u());
}
function EMe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 11)(1, 'div', 12)(2, 'div', 13),
      T(3, 'div', 14),
      d(4, 'div', 15)(5, 'span', 16)(6, 'select', 17),
      x('change', function (o) {
        return (D(e), E(g().onSelectChange(o.target.value)));
      }),
      d(7, 'option', 18),
      v(8, 'All'),
      u(),
      d(9, 'option', 19),
      v(10, 'Sent'),
      u(),
      d(11, 'option', 20),
      v(12, 'Queued'),
      u(),
      d(13, 'option', 21),
      v(14, 'Failed'),
      u()()(),
      d(15, 'input', 22),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.inputTxt, o) || (s.inputTxt = o), E(o));
      }),
      x('keyup', function (o) {
        return (D(e), E(g().onInputChange(o)));
      }),
      u(),
      H(16, yMe, 2, 0, 'span', 23),
      d(17, 'span', 24),
      x('click', function () {
        return (D(e), E(g().searchReports()));
      }),
      T(18, 'i', 25),
      u()()()(),
      H(19, TMe, 5, 4, 'div', 26),
      Je(20, 'searchReports'),
      H(21, DMe, 2, 0),
      u());
  }
  if (2 & t) {
    const e = g();
    (m(15),
      je('ngModel', e.inputTxt),
      m(),
      O(16, e.inputTxt && e.inputTxt.length > 0 ? 16 : -1),
      m(3),
      O(19, yy(20, 3, e.reports, e.searchTxt, e.searchStatus).length > 0 ? 19 : 21));
  }
}
