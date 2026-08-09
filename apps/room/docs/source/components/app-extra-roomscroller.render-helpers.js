const y3e = ['scrollerref'],
  $B = (t, n) => n._id;
function F3e(t, n) {
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
function C3e(t, n) {}
function S3e(t, n) {
  if ((1 & t && ht(0, F3e, 1, 5, 'app-st-message', 2, $B, !1, C3e, 0, 0), 2 & t)) {
    const e = g(2);
    pt(e.filterChatMessages(e.msgs, e.logType));
  }
}
function w3e(t, n) {
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
function T3e(t, n) {}
function D3e(t, n) {
  if ((1 & t && ht(0, w3e, 1, 5, 'app-st-compactmessage', 2, $B, !1, T3e, 0, 0), 2 & t)) {
    const e = g(2);
    pt(e.filterChatMessages(e.msgs, e.logType));
  }
}
function E3e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 1, 0),
      x('scroll', function (o) {
        return (D(e), E(g().scrolling(o)));
      }),
      H(2, S3e, 3, 1)(3, D3e, 3, 1),
      u());
  }
  if (2 & t) {
    const e = g();
    (m(2), O(2, 'r' == e.displayMode ? 2 : 3));
  }
}
