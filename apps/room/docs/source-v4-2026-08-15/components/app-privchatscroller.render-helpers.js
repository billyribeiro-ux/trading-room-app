const VDe = ['scrollerref'],
  HDe = (t, n) => n._id;
function $De(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 2)(1, 'span', 4),
      x('click', function () {
        return (D(e), E(g().loadMore()));
      }),
      v(2, ' Load More'),
      u()());
  }
}
function zDe(t, n) {
  1 & t && (d(0, 'div', 2)(1, 'span', 5), T(2, 'i', 6), v(3, ' Loading...'), u()());
}
function GDe(t, n) {
  if ((1 & t && T(0, 'app-st-compactmessage', 3), 2 & t)) {
    const e = n.$implicit,
      i = n.$index,
      o = g();
    (ei('id', 'pcm-', e._id, ''), z('msg', e)('prevD', i > 0 ? o.msgs[i - 1].t : 0));
  }
}
