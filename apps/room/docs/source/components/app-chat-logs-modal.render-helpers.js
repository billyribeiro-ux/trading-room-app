const dxe = (t, n) => n.updated,
  uxe = (t, n) => n._id;
function hxe(t, n) {
  if ((1 & t && (d(0, 'span'), v(1), Je(2, 'date'), u()), 2 & t)) {
    const e = g();
    (m(), Ne(': ', Ct(2, 1, e.date, 'mediumDate'), ''));
  }
}
function pxe(t, n) {
  1 & t && (d(0, 'h5', 12), v(1, 'There are no archived chats at this time'), u());
}
function fxe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 14),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(2).toggleShowLogs(o));
      }),
      d(1, 'div')(2, 'strong', 15),
      v(3),
      Je(4, 'date'),
      u()(),
      d(5, 'div')(6, 'strong', 15),
      v(7, 'By:\xa0'),
      u(),
      d(8, 'i'),
      v(9),
      u()(),
      d(10, 'div')(11, 'strong', 15),
      v(12, 'Channel:\xa0'),
      u(),
      d(13, 'i'),
      v(14),
      u()()());
  }
  if (2 & t) {
    const e = n.$implicit;
    (m(3), Ze(Ct(4, 3, e.updated, 'mediumDate')), m(6), Ze(e.createdBy), m(5), Ze(e.channel));
  }
}
function mxe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div')(1, 'button', 10),
      x('click', function () {
        return (D(e), E(g().loadLogs()));
      }),
      v(2, ' Reload Log List '),
      u(),
      d(3, 'div', 11),
      H(4, pxe, 2, 0, 'h5', 12),
      ht(5, fxe, 15, 6, 'div', 13, dxe),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(4), O(4, e.logDates && 0 != e.logDates.length ? -1 : 4), m(), pt(e.logDates));
  }
}
function gxe(t, n) {
  1 & t && (d(0, 'div', 6)(1, 'h5'), T(2, 'i', 16), v(3, ' Loading...'), u()());
}
function _xe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 25),
      x('click', function () {
        return (D(e), E(g(2).clearInput()));
      }),
      T(1, 'i', 33),
      u());
  }
}
function bxe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 34),
      x('click', function () {
        return (D(e), E(g(2).unarchiveLog()));
      }),
      T(1, 'i', 35),
      v(2, ' Unarchive'),
      u());
  }
}
function vxe(t, n) {
  if ((1 & t && T(0, 'app-st-message', 36), 2 & t)) {
    const e = n.$implicit,
      i = n.$index,
      o = g(3);
    z('msg', e)('logType', 'chat')('prevD', i > 0 ? o.msgs[i - 1].t : 0);
  }
}
function yxe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 32), ht(1, vxe, 1, 3, 'app-st-message', 36, uxe), Je(3, 'searchLogs'), u()),
    2 & t)
  ) {
    const e = g(2);
    (m(), pt(Ct(3, 0, e.msgs, e.searchTxt)));
  }
}
function Fxe(t, n) {
  1 & t && (d(0, 'div', 37), v(1, 'No logs.'), u());
}
function Cxe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 7)(1, 'div', 17)(2, 'div', 18)(3, 'button', 19),
      x('click', function () {
        return (D(e), E(g().toggleShowLogs(!1)));
      }),
      T(4, 'i', 20),
      v(5, ' Back '),
      u(),
      d(6, 'div', 21)(7, 'div', 22)(8, 'input', 23),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.inputTxt, o) || (s.inputTxt = o), E(o));
      }),
      x('keyup', function (o) {
        return (D(e), E(g().onInputChange(o)));
      }),
      u(),
      H(9, _xe, 2, 0, 'span', 24),
      d(10, 'span', 25),
      x('click', function () {
        return (D(e), E(g().searchLogs()));
      }),
      T(11, 'i', 26),
      u()()()()(),
      d(12, 'div', 27)(13, 'div', 28)(14, 'button', 29),
      x('click', function () {
        return (D(e), E(g().downloadLog()));
      }),
      T(15, 'i', 30),
      v(16, ' Download Log '),
      u(),
      H(17, bxe, 3, 0, 'button', 31),
      u(),
      H(18, yxe, 4, 3, 'div', 32),
      Je(19, 'searchLogs'),
      H(20, Fxe, 2, 0),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(8),
      je('ngModel', e.inputTxt),
      m(),
      O(9, e.inputTxt && e.inputTxt.length > 0 ? 9 : -1),
      m(8),
      O(17, e.appService.globals.isPresenter ? 17 : -1),
      m(),
      O(18, Ct(19, 4, e.msgs, e.searchTxt).length > 0 ? 18 : 20));
  }
}
