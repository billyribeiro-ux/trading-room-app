const qDe = (t, n) => n.uid,
  KDe = (t, n) => n.title,
  YDe = (t) => ({ 'flex-row-reverse': t }),
  QDe = (t) => ({ active: t }),
  XDe = (t) => ({ 'pc-active': t }),
  JDe = (t) => ({ 'bg-success': t });
function ZDe(t, n) {
  1 & t && (d(0, 'span', 9), T(1, 'i', 22), v(2, ' DND'), u());
}
function eEe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'ul', 10)(1, 'li', 23)(2, 'a', 24),
      T(3, 'img', 25),
      v(4),
      d(5, 'span', 26),
      x('click', function () {
        D(e);
        const o = g();
        return E(o.closeTab(o.user.uid));
      }),
      T(6, 'i', 27),
      u()()()());
  }
  if (2 & t) {
    const e = g();
    (m(2),
      z('ngClass', ct(3, QDe, '' !== e.currUser)),
      m(),
      z('src', e.user.pic || 'https://secure.gravatar.com/avatar/' + e.user.avt + '?d=mm&s=25', Mt),
      m(),
      Ne(' ', e.user.name, ' '));
  }
}
function tEe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 12)(1, 'a', 28),
      x('click', function () {
        return (D(e), E(g().deleteThisPM()));
      }),
      T(2, 'i', 29),
      v(3, ' This'),
      u()());
  }
}
function nEe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 18)(1, 'form', 30),
      x('keydown.enter', function (o) {
        D(e);
        const s = It(6),
          r = g();
        return (o.preventDefault(), E(r.onEnterSearchChat(s.value)));
      }),
      d(2, 'div')(3, 'div', 31)(4, 'div', 32)(5, 'input', 33, 0),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.pmSearchTerm, o) || (s.pmSearchTerm = o), E(o));
      }),
      u(),
      d(7, 'span', 34),
      x('click', function () {
        D(e);
        const o = It(6),
          s = g();
        return ((o.value = ''), E(s.onEnterSearchChat('')));
      }),
      T(8, 'i', 17),
      u()()()()(),
      d(9, 'li', 35)(10, 'a', 36),
      x('click', function () {
        return (D(e), E(g().setDND()));
      }),
      T(11, 'i', 22),
      v(12, " Don't Disturb"),
      u(),
      d(13, 'a', 37),
      x('click', function () {
        return (D(e), E(g().downloadLog()));
      }),
      T(14, 'i', 38),
      v(15, ' Download Log'),
      u()()());
  }
  if (2 & t) {
    const e = g();
    (m(5), je('ngModel', e.pmSearchTerm));
  }
}
function iEe(t, n) {
  if ((1 & t && (d(0, 'span', 46), v(1), u()), 2 & t)) {
    const e = g().$implicit;
    (m(), Ze(e.unread));
  }
}
function oEe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 41),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(2).switchChatToUser(o.uid, o));
      }),
      d(1, 'span', 42)(2, 'span', 43),
      v(3, '\xa0'),
      u(),
      T(4, 'img', 44),
      d(5, 'span', 45),
      v(6),
      u()(),
      H(7, iEe, 2, 1, 'span', 46),
      u());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = g(2);
    (z('ngClass', ct(5, XDe, i.currUser === e.uid)),
      m(2),
      z('ngClass', ct(7, JDe, e.online)),
      m(2),
      z('src', e.pic || 'https://secure.gravatar.com/avatar/' + e.avt + '?d=mm&s=32', Mt),
      m(2),
      Ne(' ', e.name, ' '),
      m(),
      O(7, e.unread ? 7 : -1));
  }
}
function sEe(t, n) {
  1 & t &&
    (d(0, 'div', 40)(1, 'div', 47),
    v(2, 'Loading all private chats.'),
    u(),
    d(3, 'div', 47),
    v(4, 'Please wait...'),
    u()());
}
function rEe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 20), ht(1, oEe, 8, 9, 'button', 39, qDe), H(3, sEe, 5, 0, 'div', 40), u()),
    2 & t)
  ) {
    const e = g();
    (m(), pt(e.chatTabs.slice().reverse()), m(2), O(3, e.getAllPCLogsLoading ? 3 : -1));
  }
}
function aEe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'emoji-mart', 51),
      x('emojiSelect', function (o) {
        return (D(e), E(g(2).selectEmoji(o)));
      }),
      u());
  }
}
function lEe(t, n) {
  1 & t &&
    (d(0, 'div', 53), v(1, ' Webinar Mode '), d(2, 'span', 61), T(3, 'i', 62), u(), T(4, 'i'), u());
}
function cEe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 63),
      x('click', function () {
        return (D(e), E(g(3).imgUpload()));
      }),
      T(1, 'i', 64),
      u());
  }
}
function dEe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 76)(1, 'img', 77),
      x('dblclick', function () {
        const o = D(e).$implicit;
        return E(g(5).sendGif(o.title, o.images.original.url));
      }),
      u()());
  }
  if (2 & t) {
    const e = n.$implicit;
    (m(), xn('src', e.images.downsized_large.url, Mt));
  }
}
function uEe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 66)(1, 'div', 67)(2, 'div', 68)(3, 'h4'),
      v(4, 'Giphy Search'),
      u(),
      d(5, 'button', 69),
      x('click', function () {
        return (D(e), g(), E(It(1).close()));
      }),
      u()(),
      T(6, 'hr', 70),
      d(7, 'h6'),
      v(8, '*Double click an image to select it'),
      u(),
      d(9, 'form', 71),
      x('ngSubmit', function () {
        return (D(e), E(g(4).searchGiphy()));
      }),
      d(10, 'div', 31)(11, 'div', 32)(12, 'input', 72),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(4);
        return (He(s.giphySearchTerm, o) || (s.giphySearchTerm = o), E(o));
      }),
      u(),
      d(13, 'span', 73),
      x('click', function () {
        return (D(e), E(g(4).clearSearchGiphy()));
      }),
      T(14, 'i', 74),
      u()()()()(),
      d(15, 'ul', 75),
      ht(16, dEe, 2, 1, 'li', 76, KDe),
      u()());
  }
  if (2 & t) {
    const e = g(4);
    (m(12), je('ngModel', e.giphySearchTerm), m(4), pt(e.giphyResults));
  }
}
function hEe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 65, 2),
      x('click', function () {
        D(e);
        const o = It(1);
        return E(g(3).toggleGiphyPanel(o));
      }),
      d(2, 'span'),
      v(3, 'GIF'),
      u(),
      H(4, uEe, 18, 1, 'ng-template', null, 3, In),
      u());
  }
  2 & t && z('ngbPopover', It(5));
}
function pEe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 50)(1, 'div', 52),
      H(2, lEe, 5, 0, 'div', 53),
      d(3, 'div', 54)(4, 'textarea', 55),
      x('keyup', function (o) {
        return (D(e), E(g(2).onKey(o)));
      })('paste', function (o) {
        return (D(e), E(g(2).onImagePaste(o)));
      })('focus', function () {
        return (D(e), E(g(2).onTextareaFocus()));
      }),
      u()(),
      d(5, 'div', 56)(6, 'span', 57),
      x('click', function () {
        return (D(e), E(g(2).toggleEmojiPanel()));
      }),
      T(7, 'i', 58),
      u(),
      H(8, cEe, 2, 0, 'span', 59)(9, hEe, 6, 1, 'span', 60),
      u()()());
  }
  if (2 & t) {
    g();
    const e = It(3),
      i = g();
    (m(2),
      O(2, i.webinarMode ? 2 : -1),
      m(4),
      z('ngbPopover', e),
      m(2),
      O(8, i.canPostImages ? 8 : -1),
      m(),
      O(9, i.canPostImages ? 9 : -1));
  }
}
function fEe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 21),
      T(1, 'app-privchatscroller', 48),
      H(2, aEe, 1, 0, 'ng-template', 49, 1, In)(4, pEe, 10, 4, 'div', 50),
      u()),
    2 & t)
  ) {
    const e = g();
    (m(),
      z('msgs', e.msgs)('searchTerm', e.pmSearchTerm),
      m(3),
      O(4, e.isConnected && e.chatEnabled ? 4 : -1));
  }
}
function mEe(t, n) {
  1 & t && v(0, ' Loading private chats. Please wait... ');
}
function gEe(t, n) {
  1 & t && v(0, ' No active chat ');
}
function _Ee(t, n) {
  if ((1 & t && (d(0, 'div', 78), H(1, mEe, 1, 0)(2, gEe, 1, 0), u()), 2 & t)) {
    const e = g();
    (m(), O(1, e.getAllPCLogsLoading ? 1 : 2));
  }
}
const Ao = window.$;
var mc;
function M2(t) {
  (t.stopPropagation(),
    t.preventDefault(),
    (t.target.className = 'dragover' == t.type ? 'hover' : ''));
}
function bEe(t) {
  console.log('FileDropped:', t);
  var n = document.createElement('img'),
    e = new FileReader();
  ((e.onloadend = function () {
    ((n.src = e.result), Ao('#fileList').append(n));
  }),
    e.readAsDataURL(t));
}
function PB(t) {
  (Ao('#fileList').show(), Ao('#filedrag').hide(), M2(t));
  var n = t.target.files || t.dataTransfer.files;
  (Ao('#fileList').empty(), (mc = []));
  for (var i, e = 0; (i = n[e]); e++) (mc.push(i), bEe(i));
}
