const T3e = ['scrollerref'],
  $B = (t, n) => n._id;
function D3e(t, n) {
  if ((1 & t && T(0, 'app-st-message', 2), 2 & t)) {
    const e = n.$implicit,
      i = n.$index,
      o = g(3);
    z('msg', e)('isP', o.isPresenter)('logType', o.logType)('prevD', i > 0 ? o.msgs[i - 1].t : 0)(
      'extraChatMsg',
      o.extraChatMsg
    );
  }
}
function E3e(t, n) {}
function k3e(t, n) {
  if ((1 & t && ht(0, D3e, 1, 5, 'app-st-message', 2, $B, !1, E3e, 0, 0), 2 & t)) {
    const e = g(2);
    pt(e.filterChatMessages(e.msgs, e.logType));
  }
}
function x3e(t, n) {
  if ((1 & t && T(0, 'app-st-compactmessage', 2), 2 & t)) {
    const e = n.$implicit,
      i = n.$index,
      o = g(3);
    z('msg', e)('isP', o.isPresenter)('logType', o.logType)('prevD', i > 0 ? o.msgs[i - 1].t : 0)(
      'extraChatMsg',
      o.extraChatMsg
    );
  }
}
function M3e(t, n) {}
function A3e(t, n) {
  if ((1 & t && ht(0, x3e, 1, 5, 'app-st-compactmessage', 2, $B, !1, M3e, 0, 0), 2 & t)) {
    const e = g(2);
    pt(e.filterChatMessages(e.msgs, e.logType));
  }
}
function P3e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 1, 0),
      x('scroll', function (o) {
        return (D(e), E(g().scrolling(o)));
      }),
      H(2, k3e, 3, 1)(3, A3e, 3, 1),
      u());
  }
  if (2 & t) {
    const e = g();
    (m(2), O(2, 'r' == e.displayMode ? 2 : 3));
  }
}
