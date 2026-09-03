const IMe = (t, n) => n._id;
function OMe(t, n) {
  if ((1 & t && (d(0, 'strong'), v(1), u()), 2 & t)) {
    const e = g();
    (m(), Ze(null == e.userData ? null : e.userData.nick));
  }
}
function NMe(t, n) {
  1 & t && (d(0, 'div', 6)(1, 'h5'), T(2, 'i', 10), v(3, ' Loading...'), u()());
}
function LMe(t, n) {
  if ((1 & t && T(0, 'app-st-compactmessage', 13), 2 & t)) {
    const e = n.$implicit,
      i = n.$index,
      o = g(3);
    (ei('id', 'pcm-', e._id, ''), z('msg', e)('prevD', i > 0 ? o.msgs[i - 1].t : 0));
  }
}
function BMe(t, n) {
  if (
    (1 & t && (d(0, 'div', 12), ht(1, LMe, 1, 4, 'app-st-compactmessage', 13, IMe), u()), 2 & t)
  ) {
    const e = g(2);
    (m(), pt(e.msgs));
  }
}
function UMe(t, n) {
  1 & t && (d(0, 'div', 14), v(1, 'No logs.'), u());
}
function jMe(t, n) {
  if (
    (1 & t && (d(0, 'div', 7)(1, 'div', 11), H(2, BMe, 3, 0, 'div', 12)(3, UMe, 2, 0), u()()),
    2 & t)
  ) {
    const e = g();
    (m(2), O(2, e.msgs && e.msgs.length > 0 ? 2 : 3));
  }
}
