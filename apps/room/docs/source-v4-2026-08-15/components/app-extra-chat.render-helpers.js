const I3e = ['chatWidthExtra'],
  O3e = ['searchTermTxt'],
  N3e = (t, n) => n.name,
  L3e = (t, n) => n.title,
  B3e = (t) => ({ 'chat-uploaded-img-sm': t }),
  U3e = (t) => ({ active: t }),
  R2 = (t) => ({ visible: t });
function j3e(t, n) {
  1 & t && (d(0, 'span'), v(1, '\xa0Chat'), u());
}
function V3e(t, n) {
  1 & t && (d(0, 'span', 11), T(1, 'i', 26), v(2, ' DND'), u());
}
function H3e(t, n) {
  if ((1 & t && (d(0, 'span', 29), v(1), u()), 2 & t)) {
    const e = g(2).$implicit,
      i = g(2);
    (m(), Ne(' (', i.unreadMentions[e.name], ') '));
  }
}
function $3e(t, n) {
  if ((1 & t && (d(0, 'span', 28), v(1), H(2, H3e, 2, 1, 'span', 29), u()), 2 & t)) {
    const e = g().$implicit,
      i = g(2);
    (m(),
      Ne(' ', i.unreadMsgs[e.name], ' '),
      m(),
      O(2, i.appService.globals.isPresenter && i.unreadMentions[e.name] ? 2 : -1));
  }
}
function z3e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 14)(1, 'a', 27),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(2).switchChatChannelExtra(o.name));
      }),
      v(2),
      H(3, $3e, 3, 2, 'span', 28),
      u()());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = g(2);
    (m(),
      z('ngClass', ct(3, U3e, e.name == i.channel)),
      m(),
      Ne('', e.displayName, ' '),
      m(),
      O(3, i.unreadMsgs[e.name] || i.unreadMentions[e.name] ? 3 : -1));
  }
}
function G3e(t, n) {
  if ((1 & t && (d(0, 'ul', 12), ht(1, z3e, 4, 5, 'li', 14, N3e), u()), 2 & t)) {
    const e = g();
    (m(), pt(e.chatTabs));
  }
}
function W3e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 14)(1, 'a', 30),
      x('click', function () {
        return (D(e), E(g().showPrivateChat()));
      }),
      T(2, 'i', 31),
      u()());
  }
}
function q3e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 41),
      x('click', function () {
        return (D(e), E(g(3).archiveOptions()));
      }),
      T(1, 'i', 42),
      u());
  }
}
function K3e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 38),
      x('click', function () {
        return (D(e), g(2), E(It(18).downloadLog('chat')));
      }),
      T(1, 'i', 39),
      u(),
      H(2, q3e, 2, 0, 'div', 40));
  }
  if (2 & t) {
    const e = g(2);
    (m(2),
      O(2, e.appService.globals.isPresenter && !e.appService.globals.isLimitedPresenter ? 2 : -1));
  }
}
function Y3e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 46)(1, 'button', 47),
      v(2, ' Group Chat Control '),
      u(),
      d(3, 'ul', 48)(4, 'li', 49),
      x('click', function (o) {
        return (D(e), E(g(3).changeChatMode('g', o)));
      }),
      d(5, 'a', 50),
      T(6, 'i', 51),
      v(7, 'Regular Group Chat'),
      u()(),
      d(8, 'li', 49),
      x('click', function (o) {
        return (D(e), E(g(3).changeChatMode('p', o)));
      }),
      d(9, 'a', 50),
      T(10, 'i', 51),
      v(11, 'Webinar Mode'),
      u()(),
      d(12, 'li', 49),
      x('click', function (o) {
        return (D(e), E(g(3).changeChatMode('d', o)));
      }),
      d(13, 'a', 50),
      T(14, 'i', 51),
      v(15, 'Disable Group Chat'),
      u()()()());
  }
  if (2 & t) {
    const e = g(3);
    (m(6),
      z('ngClass', ct(3, R2, 'g' == e.appService.globals.sessData.chatMode)),
      m(4),
      z('ngClass', ct(5, R2, 'p' == e.appService.globals.sessData.chatMode)),
      m(4),
      z('ngClass', ct(7, R2, 'd' == e.appService.globals.sessData.chatMode)));
  }
}
function Q3e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 43)(1, 'input', 44),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (
          He(s.appService.globals.filterChatMsgs.modOnlyExtra, o) ||
            (s.appService.globals.filterChatMsgs.modOnlyExtra = o),
          E(o)
        );
      }),
      x('change', function () {
        return (D(e), E(g(2).toggleModOnlyFilter()));
      }),
      u(),
      d(2, 'label', 45),
      v(3, ' Mod Only '),
      u()(),
      H(4, Y3e, 16, 9, 'div', 46));
  }
  if (2 & t) {
    const e = g(2);
    (m(),
      je('ngModel', e.appService.globals.filterChatMsgs.modOnlyExtra),
      m(3),
      O(
        4,
        (!e.appService.globals.isPresenter && !e.appService.globals.user.hasMic) ||
          e.appService.globals.isLimitedPresenter
          ? -1
          : 4
      ));
  }
}
function X3e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 21)(1, 'form', 32),
      x('change', function () {
        D(e);
        const o = g();
        return E(o.searchTermChanged(o.chatSearchTerm));
      })('keydown.enter', function (o) {
        D(e);
        const s = It(6),
          r = g();
        return (o.preventDefault(), E(r.onEnterSearchChat(s.value)));
      }),
      d(2, 'div')(3, 'div', 33)(4, 'div', 34)(5, 'input', 35, 2),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.chatSearchTerm, o) || (s.chatSearchTerm = o), E(o));
      }),
      u(),
      d(7, 'span', 36),
      x('click', function () {
        D(e);
        const o = It(6),
          s = g();
        return ((o.value = ''), E(s.onEnterSearchChat('')));
      }),
      T(8, 'i', 37),
      u(),
      H(9, K3e, 3, 1),
      u()()()(),
      H(10, Q3e, 5, 2),
      u());
  }
  if (2 & t) {
    const e = g();
    (m(5),
      je('ngModel', e.chatSearchTerm),
      m(4),
      O(9, e.showChatToolbarExtended ? 9 : -1),
      m(),
      O(10, e.showChatToolbarExtended ? 10 : -1));
  }
}
function J3e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'emoji-mart', 52),
      x('emojiSelect', function (o) {
        return (D(e), E(g().selectEmoji(o)));
      }),
      u());
  }
}
function Z3e(t, n) {
  1 & t &&
    (d(0, 'div', 24), v(1, ' Webinar Mode '), d(2, 'span', 53), T(3, 'i', 54), u(), T(4, 'i'), u());
}
function eMe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div')(1, 'div', 55)(2, 'strong', 56),
      v(3),
      u(),
      T(4, 'app-typing-indicator-dots'),
      d(5, 'span', 57)(6, 'em', 58),
      v(7),
      u()()()()),
    2 & t)
  ) {
    const e = g();
    (m(3), Ne('[', e.usersTypingCnt, ']'), m(4), Ze(e.usersTyping));
  }
}
function tMe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 64),
      x('click', function () {
        return (D(e), E(g(2).toggleMessageOptions()));
      }),
      T(1, 'i', 65),
      u());
  }
}
function nMe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 64),
      x('click', function () {
        return (D(e), E(g(3).imgUpload()));
      }),
      T(1, 'i', 70),
      u());
  }
}
function iMe(t, n) {
  1 & t && (d(0, 'span', 68), T(1, 'i', 71), u());
}
function oMe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 84)(1, 'img', 85),
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
function sMe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 73)(1, 'div', 74)(2, 'div', 75)(3, 'h4'),
      v(4, 'Giphy Search'),
      u(),
      d(5, 'button', 76),
      x('click', function () {
        return (D(e), g(), E(It(1).close()));
      }),
      u()(),
      T(6, 'hr', 77),
      d(7, 'h6'),
      v(8, '*Double click an image to select it'),
      u(),
      d(9, 'form', 78),
      x('ngSubmit', function () {
        return (D(e), E(g(4).searchGiphy()));
      }),
      d(10, 'div', 79)(11, 'div', 34)(12, 'input', 80),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(4);
        return (He(s.giphySearchTerm, o) || (s.giphySearchTerm = o), E(o));
      }),
      u(),
      d(13, 'span', 81),
      x('click', function () {
        return (D(e), E(g(4).clearSearchGiphy()));
      }),
      T(14, 'i', 82),
      u()()()()(),
      d(15, 'ul', 83),
      ht(16, oMe, 2, 1, 'li', 84, L3e),
      u()());
  }
  if (2 & t) {
    const e = g(4);
    (m(12), je('ngModel', e.giphySearchTerm), m(4), pt(e.giphyResults));
  }
}
function rMe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 72, 4),
      x('click', function () {
        D(e);
        const o = It(1);
        return E(g(3).toggleGiphyPanel(o));
      }),
      d(2, 'span'),
      v(3, 'GIF'),
      u(),
      H(4, sMe, 18, 1, 'ng-template', null, 5, In),
      u());
  }
  2 & t && z('ngbPopover', It(5));
}
function aMe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 64),
      x('click', function () {
        return (D(e), E(g(3).openRTEModal()));
      }),
      T(1, 'i', 86),
      u());
  }
}
function lMe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 66),
      x('click', function () {
        return (D(e), E(g(2).toggleEmojiPanel()));
      }),
      T(1, 'i', 67),
      u(),
      H(2, nMe, 2, 0, 'span', 63)(3, iMe, 2, 0, 'span', 68)(4, rMe, 6, 1, 'span', 69)(
        5,
        aMe,
        2,
        0,
        'span',
        63
      ));
  }
  if (2 & t) {
    const e = g(2);
    (z('ngbPopover', It(20)),
      m(2),
      O(2, e.canPostImages ? 2 : -1),
      m(),
      O(3, e.isPresenter ? 3 : -1),
      m(),
      O(4, e.canPostImages ? 4 : -1),
      m(),
      O(
        5,
        e.appService.globals.sessData.enableRTE &&
          e.appService.globals.preferences.enableRTE &&
          e.appService.globals.isPresenter
          ? 5
          : -1
      ));
  }
}
function cMe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 25)(1, 'div', 59, 3)(3, 'div', 60)(4, 'textarea', 61),
      x('keyup', function (o) {
        return (D(e), E(g().onKey(o)));
      })('paste', function (o) {
        return (D(e), E(g().onImagePaste(o)));
      })('keydown.enter', function (o) {
        return (D(e), E(g().onKeydown(o)));
      })('focus', function (o) {
        return (D(e), E(g().onTextareaFocus(o, 'textAreaTxtExtra')));
      }),
      u()(),
      d(5, 'div', 62),
      H(6, tMe, 2, 0, 'span', 63)(7, lMe, 6, 5),
      u()()());
  }
  if (2 & t) {
    const e = g();
    (m(6), O(6, e.showMessageOptions ? 7 : 6));
  }
}
function dMe(t, n) {
  if ((1 & t && (d(0, 'span'), v(1), Xe(2, 'date'), u()), 2 & t)) {
    const e = g(2);
    (m(), Ne(' till ', Ct(2, 1, e.chatMutedTill, 'EEE @ h:mm a'), ''));
  }
}
function uMe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 87)(1, 'h5', 88),
      T(2, 'i', 89),
      v(3, ' Chat Disabled '),
      H(4, dMe, 3, 4, 'span'),
      u()()),
    2 & t)
  ) {
    const e = g();
    (m(4), O(4, e.chatMutedTill ? 4 : -1));
  }
}
const ui = window.$;
var vc;
function I2(t) {
  (t.stopPropagation(),
    t.preventDefault(),
    (t.target.className = 'dragover' == t.type ? 'hover' : ''));
}
function hMe(t) {
  console.log('FileDropped:', t);
  var n = document.createElement('img'),
    e = new FileReader();
  ((e.onloadend = function () {
    ((n.src = e.result), ui('#fileList').append(n));
  }),
    e.readAsDataURL(t));
}
function zB(t) {
  (ui('#fileList').show(), ui('#filedrag').hide(), I2(t));
  var n = t.target.files || t.dataTransfer.files;
  (ui('#fileList').empty(), (vc = []));
  for (var i, e = 0; (i = n[e]); e++) (vc.push(i), hMe(i));
}
