const qxe = ['qaContainer'],
  UB = (t, n) => n._id;
function Kxe(t, n) {
  if ((1 & t && (d(0, 'div', 25), T(1, 'img', 31), u()), 2 & t)) {
    const e = g(2);
    (m(),
      z(
        'src',
        e.qaMsg.pic || 'https://secure.gravatar.com/avatar/' + e.qaMsg.avt + '?d=mm&s=50',
        Mt
      ));
  }
}
function Yxe(t, n) {
  if ((1 & t && (d(0, 'span', 28), Xe(1, 'date'), v(2), Xe(3, 'date'), u()), 2 & t)) {
    const e = g(2);
    (xn('ngbTooltip', Ct(1, 2, e.qaMsg.t, 'short')), m(2), Ze(Ct(3, 5, e.qaMsg.t, 'hh:mm a')));
  }
}
function Qxe(t, n) {
  if ((1 & t && (d(0, 'strong', 30), v(1), u()), 2 & t)) {
    const e = g(2);
    (m(), Ne(' ', e.qaMsg.n, ' '));
  }
}
function Xxe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 33),
      Xe(1, 'parseSymbols'),
      Xe(2, 'parseLinks'),
      x('click', function (o) {
        D(e);
        const s = g(3);
        return E(s.copyTradeOnClick(o, 'id_' + s.qaMsg._id));
      }),
      u());
  }
  if (2 & t) {
    const e = g(3);
    z(
      'innerHTML',
      Tn(
        2,
        6,
        Tn(1, 1, e.qaMsg.txt, 'chat', e.qaMsg.avt, null),
        e.appService.globals.preferences.chatGif,
        e.qaMsg._id,
        !1
      ),
      wn
    );
  }
}
function Jxe(t, n) {
  if ((1 & t && (T(0, 'div', 32), Xe(1, 'parseSymbols'), Xe(2, 'parseLinks')), 2 & t)) {
    const e = g(3);
    z(
      'innerHTML',
      Tn(
        2,
        6,
        Tn(1, 1, e.qaMsg.txt, 'chat', e.qaMsg.avt, null),
        e.appService.globals.preferences.chatGif,
        e.qaMsg._id,
        !1
      ),
      wn
    );
  }
}
function Zxe(t, n) {
  (1 & t && H(0, Xxe, 3, 11, 'div', 32)(1, Jxe, 3, 11),
    2 & t && O(0, g(2).appService.globals.sessData.copyTrades ? 0 : 1));
}
function e3e(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 8)(1, 'div', 22)(2, 'div', 23)(3, 'div', 24),
      H(4, Kxe, 2, 1, 'div', 25),
      u(),
      d(5, 'div', 26)(6, 'div', 27),
      H(7, Yxe, 4, 8, 'span', 28),
      d(8, 'div', 29),
      H(9, Qxe, 2, 1, 'strong', 30),
      u()(),
      H(10, Zxe, 2, 1),
      u()()()()),
    2 & t)
  ) {
    const e = g();
    (m(4),
      O(4, (e.qaMsg && e.qaMsg.hasOwnProperty('avt')) || e.qaMsg.hasOwnProperty('pic') ? 4 : -1),
      m(3),
      O(7, e.qaMsg && e.qaMsg.hasOwnProperty('t') ? 7 : -1),
      m(2),
      O(9, e.qaMsg && e.qaMsg.hasOwnProperty('n') ? 9 : -1),
      m(),
      O(10, e.qaMsg && e.qaMsg.hasOwnProperty('txt') ? 10 : -1));
  }
}
function t3e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'emoji-mart', 34),
      x('emojiSelect', function (o) {
        return (D(e), E(g().selectEmoji(o)));
      }),
      u());
  }
}
function n3e(t, n) {
  1 & t && (d(0, 'div', 12), v(1, 'There are no questions.'), u());
}
function i3e(t, n) {
  if ((1 & t && T(0, 'app-st-message', 35), 2 & t)) {
    const e = n.$implicit,
      i = n.$index,
      o = g(3);
    z('msg', e)('isP', o.isPresenter)('logType', o.logType)('isQAMsg', o.isQAMsg)(
      'qaMsgID',
      o.qaMsg._id
    )('msgIndex', i)('prevD', i > 0 ? o.msgs[i - 1].t : 0);
  }
}
function o3e(t, n) {
  (1 & t && ht(0, i3e, 1, 7, 'app-st-message', 35, UB), 2 & t && pt(g(2).msgs));
}
function s3e(t, n) {
  if ((1 & t && T(0, 'app-st-compactmessage', 35), 2 & t)) {
    const e = n.$implicit,
      i = n.$index,
      o = g(3);
    z('msg', e)('isP', o.isPresenter)('logType', o.logType)('isQAMsg', o.isQAMsg)(
      'qaMsgID',
      o.qaMsg._id
    )('msgIndex', i)('prevD', i > 0 ? o.msgs[i - 1].t : 0);
  }
}
function r3e(t, n) {
  (1 & t && ht(0, s3e, 1, 7, 'app-st-compactmessage', 35, UB), 2 & t && pt(g(2).msgs));
}
function a3e(t, n) {
  (1 & t && H(0, o3e, 2, 0)(1, r3e, 2, 0), 2 & t && O(0, 'r' == g().displayMode ? 0 : 1));
}
function l3e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 36),
      x('click', function () {
        return (D(e), E(g().imgUpload()));
      }),
      T(1, 'i', 37),
      u());
  }
}
const yi = window.$;
let _c;
function P2(t) {
  (t.stopPropagation(),
    t.preventDefault(),
    (t.target.className = 'dragover' === t.type ? 'hover' : ''));
}
function c3e(t) {
  console.log('FileDropped:', t);
  const n = document.createElement('img'),
    e = new FileReader();
  ((e.onloadend = () => {
    ((n.src = e.result), yi('#fileList').append(n));
  }),
    e.readAsDataURL(t));
}
function jB(t) {
  (yi('#fileList').show(), yi('#filedrag').hide(), P2(t));
  const n = t.target.files || t.dataTransfer.files;
  (yi('#fileList').empty(), (_c = []));
  for (let i, e = 0; (i = n[e]); e++) (_c.push(i), c3e(i));
}
