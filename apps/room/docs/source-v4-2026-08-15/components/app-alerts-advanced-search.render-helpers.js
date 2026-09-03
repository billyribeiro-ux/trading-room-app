const HMe = (t, n) => n.avatar,
  $Me = (t, n) => n._id,
  zMe = (t) => ({ 'justify-content-between': t });
function GMe(t, n) {
  if ((1 & t && (d(0, 'span', 12), v(1), u()), 2 & t)) {
    const e = g();
    (m(), Ne('', e.selectedTradersStr, ' '));
  }
}
function WMe(t, n) {
  1 & t && (d(0, 'span'), v(1, '--Select Traders--'), u());
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
        return E(g().toggleTraders(o.avatar, o.username));
      }),
      d(1, 'a', 36),
      H(2, qMe, 1, 0, 'i', 37),
      v(3),
      u()());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = g();
    (m(2), O(2, i.search.traders[e.avatar] ? 2 : -1), m(), Ne(' ', e.username, ''));
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
        return (D(e), E(g().unselectTraders()));
      }),
      T(4, 'i', 41),
      v(5, ' Unselect All '),
      u()());
  }
}
function QMe(t, n) {
  if ((1 & t && (d(0, 'span', 16), v(1), u()), 2 & t)) {
    const e = g();
    (m(), Ne('', e.selectedRoomsStr, ' '));
  }
}
function XMe(t, n) {
  1 & t && (d(0, 'span'), v(1, '--Select Rooms--'), u());
}
function JMe(t, n) {
  1 & t && T(0, 'i', 37);
}
function ZMe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 35),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g().toggleSess(o.key, o.value));
      }),
      d(1, 'a', 36),
      H(2, JMe, 1, 0, 'i', 37),
      v(3),
      u()());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = g();
    (m(2), O(2, i.search.rooms[e.key] ? 2 : -1), m(), Ne(' ', e.value, ''));
  }
}
function eAe(t, n) {
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
function tAe(t, n) {
  1 & t && (d(0, 'div', 29)(1, 'h5'), T(2, 'i', 42), v(3, ' Loading...'), u()());
}
function nAe(t, n) {
  1 & t && v(0, 's');
}
function iAe(t, n) {
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
function oAe(t, n) {
  if (
    (1 & t &&
      (d(0, 'p', 39),
      v(1),
      H(2, nAe, 1, 0),
      v(3, '. '),
      u(),
      d(4, 'div', 44),
      ht(5, iAe, 1, 4, 'app-st-message', 45, $Me),
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
function sAe(t, n) {
  1 & t && (d(0, 'div', 47), v(1, ' No logs to display. Please, change the input fields. '), u());
}
function rAe(t, n) {
  if ((1 & t && (d(0, 'div', 43), H(1, oAe, 7, 2)(2, sAe, 2, 0), u()), 2 & t)) {
    const e = g();
    (m(), O(1, e.msgs.length > 0 ? 1 : 2));
  }
}
function aAe(t, n) {
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
