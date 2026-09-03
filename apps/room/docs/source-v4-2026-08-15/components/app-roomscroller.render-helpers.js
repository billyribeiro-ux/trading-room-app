const v_e = ['scrollerref'],
  x_ = (t, n) => n._id;
function y_e(t, n) {
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
function F_e(t, n) {}
function C_e(t, n) {
  if ((1 & t && ht(0, y_e, 1, 4, 'app-st-message', 2, x_, !1, F_e, 0, 0), 2 & t)) {
    const e = g(2);
    pt(e.filterChatMessages(e.msgs, e.logType));
  }
}
function S_e(t, n) {
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
function w_e(t, n) {}
function T_e(t, n) {
  if ((1 & t && ht(0, S_e, 1, 4, 'app-st-compactmessage', 2, x_, !1, w_e, 0, 0), 2 & t)) {
    const e = g(2);
    pt(e.filterChatMessages(e.msgs, e.logType));
  }
}
function D_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 1, 0),
      x('scroll', function (o) {
        return (D(e), E(g().scrolling(o)));
      }),
      H(2, C_e, 3, 1)(3, T_e, 3, 1),
      u());
  }
  if (2 & t) {
    const e = g();
    (m(2), O(2, 'r' == e.displayMode ? 2 : 3));
  }
}
function E_e(t, n) {
  if ((1 & t && T(0, 'app-st-message', 2), 2 & t)) {
    const e = n.$implicit,
      i = n.$index,
      o = g(3);
    z('msg', e)('isP', o.isPresenter)('logType', o.logType)('prevD', i > 0 ? o.msgs[i - 1].t : 0);
  }
}
function k_e(t, n) {}
function x_e(t, n) {
  if ((1 & t && ht(0, E_e, 1, 4, 'app-st-message', 2, x_, !1, k_e, 0, 0), 2 & t)) {
    const e = g(2);
    pt(e.filterChatMessages(e.msgs, e.logType));
  }
}
function M_e(t, n) {
  if ((1 & t && T(0, 'app-st-compactmessage', 2), 2 & t)) {
    const e = n.$implicit,
      i = n.$index,
      o = g(3);
    z('msg', e)('isP', o.isPresenter)('logType', o.logType)('prevD', i > 0 ? o.msgs[i - 1].t : 0);
  }
}
function A_e(t, n) {}
function P_e(t, n) {
  if ((1 & t && ht(0, M_e, 1, 4, 'app-st-compactmessage', 2, x_, !1, A_e, 0, 0), 2 & t)) {
    const e = g(2);
    pt(e.filterChatMessages(e.msgs, e.logType));
  }
}
function R_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 1, 0),
      x('scroll', function (o) {
        return (D(e), E(g().scrolling(o)));
      }),
      H(2, x_e, 3, 1)(3, P_e, 3, 1),
      u());
  }
  if (2 & t) {
    const e = g();
    (m(2), O(2, 'r' == e.displayMode ? 2 : 3));
  }
}
