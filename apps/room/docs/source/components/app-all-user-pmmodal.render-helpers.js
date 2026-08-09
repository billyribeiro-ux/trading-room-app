const xMe = (t, n) => n._id;
function MMe(t, n) {
  if ((1 & t && (d(0, 'strong'), v(1), u()), 2 & t)) {
    const e = g();
    (m(), Ze(null == e.userData ? null : e.userData.nick));
  }
}
function AMe(t, n) {
  1 & t && (d(0, 'div', 6)(1, 'h5'), T(2, 'i', 10), v(3, ' Loading...'), u()());
}
function PMe(t, n) {
  if ((1 & t && T(0, 'app-st-compactmessage', 13), 2 & t)) {
    const e = n.$implicit,
      i = n.$index,
      o = g(3);
    (ei('id', 'pcm-', e._id, ''), z('msg', e)('prevD', i > 0 ? o.msgs[i - 1].t : 0));
  }
}
function RMe(t, n) {
  if (
    (1 & t && (d(0, 'div', 12), ht(1, PMe, 1, 4, 'app-st-compactmessage', 13, xMe), u()), 2 & t)
  ) {
    const e = g(2);
    (m(), pt(e.msgs));
  }
}
function IMe(t, n) {
  1 & t && (d(0, 'div', 14), v(1, 'No logs.'), u());
}
function OMe(t, n) {
  if (
    (1 & t && (d(0, 'div', 7)(1, 'div', 11), H(2, RMe, 3, 0, 'div', 12)(3, IMe, 2, 0), u()()),
    2 & t)
  ) {
    const e = g();
    (m(2), O(2, e.msgs && e.msgs.length > 0 ? 2 : 3));
  }
}
