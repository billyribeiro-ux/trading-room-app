const v1e = ['scrollerref'],
  k1 = (t, n) => n._id;
function y1e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'app-st-message', 3),
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
    z('msg', e)('isP', o.isPresenter)('logType', o.logType)('prevD', i > 0 ? o.msgs[i - 1].t : 0);
  }
}
function F1e(t, n) {}
function C1e(t, n) {
  if ((1 & t && ht(0, y1e, 1, 4, 'app-st-message', 2, k1, !1, F1e, 0, 0), 2 & t)) {
    const e = g(2);
    pt(e.filterChatMessages(e.msgs, e.logType));
  }
}
function S1e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'app-st-compactmessage', 3),
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
    z('msg', e)('isP', o.isPresenter)('logType', o.logType)('prevD', i > 0 ? o.msgs[i - 1].t : 0);
  }
}
function w1e(t, n) {}
function T1e(t, n) {
  if ((1 & t && ht(0, S1e, 1, 4, 'app-st-compactmessage', 2, k1, !1, w1e, 0, 0), 2 & t)) {
    const e = g(2);
    pt(e.filterChatMessages(e.msgs, e.logType));
  }
}
function D1e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 1, 0),
      x('scroll', function (o) {
        return (D(e), E(g().scrolling(o)));
      }),
      H(2, C1e, 3, 1)(3, T1e, 3, 1),
      u());
  }
  if (2 & t) {
    const e = g();
    (m(2), O(2, 'r' == e.displayMode ? 2 : 3));
  }
}
function E1e(t, n) {
  if ((1 & t && T(0, 'app-st-message', 2), 2 & t)) {
    const e = n.$implicit,
      i = n.$index,
      o = g(3);
    z('msg', e)('isP', o.isPresenter)('logType', o.logType)('prevD', i > 0 ? o.msgs[i - 1].t : 0);
  }
}
function k1e(t, n) {}
function x1e(t, n) {
  if ((1 & t && ht(0, E1e, 1, 4, 'app-st-message', 2, k1, !1, k1e, 0, 0), 2 & t)) {
    const e = g(2);
    pt(e.filterChatMessages(e.msgs, e.logType));
  }
}
function M1e(t, n) {
  if ((1 & t && T(0, 'app-st-compactmessage', 2), 2 & t)) {
    const e = n.$implicit,
      i = n.$index,
      o = g(3);
    z('msg', e)('isP', o.isPresenter)('logType', o.logType)('prevD', i > 0 ? o.msgs[i - 1].t : 0);
  }
}
function A1e(t, n) {}
function P1e(t, n) {
  if ((1 & t && ht(0, M1e, 1, 4, 'app-st-compactmessage', 2, k1, !1, A1e, 0, 0), 2 & t)) {
    const e = g(2);
    pt(e.filterChatMessages(e.msgs, e.logType));
  }
}
function R1e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 1, 0),
      x('scroll', function (o) {
        return (D(e), E(g().scrolling(o)));
      }),
      H(2, x1e, 3, 1)(3, P1e, 3, 1),
      u());
  }
  if (2 & t) {
    const e = g();
    (m(2), O(2, 'r' == e.displayMode ? 2 : 3));
  }
}
