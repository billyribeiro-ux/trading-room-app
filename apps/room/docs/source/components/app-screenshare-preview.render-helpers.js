const RDe = (t, n) => n.value.appData.screenName;
function IDe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 10),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g().selectStream(o.key));
      }),
      v(1),
      u());
  }
  if (2 & t) {
    const e = n.$implicit;
    (m(), Ne(' ', e.value.appData.screenName, ''));
  }
}
let Eu = window.$;
