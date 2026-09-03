const cxe = ['closeModal'],
  dxe = (t, n) => n.url;
function uxe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 15),
      x('click', function () {
        return (D(e), E(g().clearYTURL()));
      }),
      v(1, '\xd7'),
      u());
  }
}
function hxe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'p')(1, 'button', 16),
      x('click', function () {
        const o = D(e).$index;
        return E(g(2).removeYtUrl(o));
      }),
      T(2, 'i', 17),
      u(),
      d(3, 'span', 18),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(2).playSavedYtUrl(o.url));
      }),
      v(4),
      u()());
  }
  if (2 & t) {
    const e = n.$implicit;
    (m(4), Ze(e.title));
  }
}
function pxe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 12)(1, 'h5'), v(2, 'Saved:'), u(), ht(3, hxe, 5, 1, 'p', null, dxe), u()),
    2 & t)
  ) {
    const e = g();
    (m(3), pt(e.ytVideoList));
  }
}
