const I_e = ['chatWidth'],
  O_e = ['searchTermTxt'],
  N_e = (t, n) => n.name,
  L_e = (t, n) => n.title,
  B_e = (t) => ({ 'chat-uploaded-img-sm': t }),
  U_e = (t) => ({ active: t }),
  kw = (t) => ({ visible: t });
function j_e(t, n) {
  1 & t && (d(0, 'span'), v(1, '\xa0Chat'), u());
}
function V_e(t, n) {
  1 & t && (d(0, 'span', 11), T(1, 'i', 26), v(2, ' DND'), u());
}
function H_e(t, n) {
  if ((1 & t && (d(0, 'span', 29), v(1), u()), 2 & t)) {
    const e = g(2).$implicit,
      i = g(2);
    (m(), Ne(' (', i.unreadMentions[e.name], ')'));
  }
}
function $_e(t, n) {
  if ((1 & t && (d(0, 'span', 28), v(1), H(2, H_e, 2, 1, 'span', 29), u()), 2 & t)) {
    const e = g().$implicit,
      i = g(2);
    (m(),
      Ne('', i.unreadMsgs[e.name], ' '),
      m(),
      O(2, i.appService.globals.isPresenter && i.unreadMentions[e.name] ? 2 : -1));
  }
}
function z_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 14)(1, 'a', 27),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(2).switchChatChannel(o.name));
      }),
      v(2),
      H(3, $_e, 3, 2, 'span', 28),
      u()());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = g(2);
    (m(),
      z('ngClass', ct(3, U_e, e.name == i.channel)),
      m(),
      Ze(e.displayName),
      m(),
      O(3, i.unreadMsgs[e.name] || i.unreadMentions[e.name] ? 3 : -1));
  }
}
function G_e(t, n) {
  if ((1 & t && (d(0, 'ul', 12), ht(1, z_e, 4, 5, 'li', 14, N_e), u()), 2 & t)) {
    const e = g();
    (m(), pt(e.chatTabs));
  }
}
function W_e(t, n) {
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
function q_e(t, n) {
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
function K_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 38),
      x('click', function () {
        return (D(e), g(2), E(It(18).downloadLog('chat')));
      }),
      T(1, 'i', 39),
      u(),
      H(2, q_e, 2, 0, 'div', 40));
  }
  if (2 & t) {
    const e = g(2);
    (m(2),
      O(2, e.appService.globals.isPresenter && !e.appService.globals.isLimitedPresenter ? 2 : -1));
  }
}
function Y_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 46)(1, 'button', 48),
      v(2, ' Group Chat Control '),
      u(),
      d(3, 'ul', 49)(4, 'li', 50),
      x('click', function (o) {
        return (D(e), E(g(3).changeChatMode('g', o)));
      }),
      d(5, 'a', 51),
      T(6, 'i', 52),
      v(7, 'Regular Group Chat'),
      u()(),
      d(8, 'li', 50),
      x('click', function (o) {
        return (D(e), E(g(3).changeChatMode('p', o)));
      }),
      d(9, 'a', 51),
      T(10, 'i', 52),
      v(11, 'Webinar Mode'),
      u()(),
      d(12, 'li', 50),
      x('click', function (o) {
        return (D(e), E(g(3).changeChatMode('d', o)));
      }),
      d(13, 'a', 51),
      T(14, 'i', 52),
      v(15, 'Disable Group Chat'),
      u()()()());
  }
  if (2 & t) {
    const e = g(3);
    (m(6),
      z('ngClass', ct(3, kw, 'g' == e.appService.globals.sessData.chatMode)),
      m(4),
      z('ngClass', ct(5, kw, 'p' == e.appService.globals.sessData.chatMode)),
      m(4),
      z('ngClass', ct(7, kw, 'd' == e.appService.globals.sessData.chatMode)));
  }
}
function Q_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 53),
      x('click', function () {
        return (D(e), E(g(3).detachChat()));
      }),
      T(1, 'i', 54),
      v(2, ' Detach Chat'),
      u());
  }
}
function X_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 43)(1, 'input', 44),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (
          He(s.appService.globals.filterChatMsgs.modOnly, o) ||
            (s.appService.globals.filterChatMsgs.modOnly = o),
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
      H(4, Y_e, 16, 9, 'div', 46)(5, Q_e, 3, 0, 'button', 47));
  }
  if (2 & t) {
    const e = g(2);
    (m(),
      je('ngModel', e.appService.globals.filterChatMsgs.modOnly),
      m(3),
      O(
        4,
        (!e.appService.globals.isPresenter && !e.appService.globals.user.hasMic) ||
          e.appService.globals.isLimitedPresenter
          ? -1
          : 4
      ),
      m(),
      O(5, e.appService.globals.chatOnlyMode ? -1 : 5));
  }
}
function J_e(t, n) {
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
      H(9, K_e, 3, 1),
      u()()()(),
      H(10, X_e, 6, 3),
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
function Z_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'emoji-mart', 55),
      x('emojiSelect', function (o) {
        return (D(e), E(g().selectEmoji(o)));
      }),
      u());
  }
}
function e0e(t, n) {
  1 & t &&
    (d(0, 'div', 24), v(1, ' Webinar Mode '), d(2, 'span', 56), T(3, 'i', 57), u(), T(4, 'i'), u());
}
function t0e(t, n) {
  if (
    (1 & t &&
      (d(0, 'div')(1, 'div', 58)(2, 'strong', 59),
      v(3),
      u(),
      T(4, 'app-typing-indicator-dots'),
      d(5, 'span', 60)(6, 'em', 61),
      v(7),
      u()()()()),
    2 & t)
  ) {
    const e = g();
    (m(3), Ne('[', e.usersTypingCnt, ']'), m(4), Ze(e.usersTyping));
  }
}
function n0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 67),
      x('click', function () {
        return (D(e), E(g(2).toggleMessageOptions()));
      }),
      T(1, 'i', 68),
      u());
  }
}
function i0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 67),
      x('click', function () {
        return (D(e), E(g(3).imgUpload()));
      }),
      T(1, 'i', 73),
      u());
  }
}
function o0e(t, n) {
  1 & t && (d(0, 'span', 71), T(1, 'i', 74), u());
}
function s0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 87)(1, 'img', 88),
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
function r0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 76)(1, 'div', 77)(2, 'div', 78)(3, 'h4'),
      v(4, 'Giphy Search'),
      u(),
      d(5, 'button', 79),
      x('click', function () {
        return (D(e), g(), E(It(1).close()));
      }),
      u()(),
      T(6, 'hr', 80),
      d(7, 'h6'),
      v(8, '*Double click an image to select it'),
      u(),
      d(9, 'form', 81),
      x('ngSubmit', function () {
        return (D(e), E(g(4).searchGiphy()));
      }),
      d(10, 'div', 82)(11, 'div', 34)(12, 'input', 83),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(4);
        return (He(s.giphySearchTerm, o) || (s.giphySearchTerm = o), E(o));
      }),
      u(),
      d(13, 'span', 84),
      x('click', function () {
        return (D(e), E(g(4).clearSearchGiphy()));
      }),
      T(14, 'i', 85),
      u()()()()(),
      d(15, 'ul', 86),
      ht(16, s0e, 2, 1, 'li', 87, L_e),
      u()());
  }
  if (2 & t) {
    const e = g(4);
    (m(12), je('ngModel', e.giphySearchTerm), m(4), pt(e.giphyResults));
  }
}
function a0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 75, 4),
      x('click', function () {
        D(e);
        const o = It(1);
        return E(g(3).toggleGiphyPanel(o));
      }),
      d(2, 'span'),
      v(3, 'GIF'),
      u(),
      H(4, r0e, 18, 1, 'ng-template', null, 5, In),
      u());
  }
  2 & t && z('ngbPopover', It(5));
}
function l0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 67),
      x('click', function () {
        return (D(e), E(g(3).openRTEModal()));
      }),
      T(1, 'i', 89),
      u());
  }
}
function c0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 69),
      x('click', function () {
        return (D(e), E(g(2).toggleEmojiPanel()));
      }),
      T(1, 'i', 70),
      u(),
      H(2, i0e, 2, 0, 'span', 66)(3, o0e, 2, 0, 'span', 71)(4, a0e, 6, 1, 'span', 72)(
        5,
        l0e,
        2,
        0,
        'span',
        66
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
function d0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 25)(1, 'div', 62, 3)(3, 'div', 63)(4, 'textarea', 64),
      x('keyup', function (o) {
        return (D(e), E(g().onKey(o)));
      })('paste', function (o) {
        return (D(e), E(g().onImagePaste(o)));
      })('keydown.enter', function (o) {
        return (D(e), E(g().onKeydown(o)));
      })('focus', function (o) {
        return (D(e), E(g().onTextareaFocus(o, 'textAreaTxt')));
      }),
      u()(),
      d(5, 'div', 65),
      H(6, n0e, 2, 0, 'span', 66)(7, c0e, 6, 5),
      u()()());
  }
  if (2 & t) {
    const e = g();
    (m(6), O(6, e.showMessageOptions ? 7 : 6));
  }
}
function u0e(t, n) {
  if ((1 & t && (d(0, 'span'), v(1), Xe(2, 'date'), u()), 2 & t)) {
    const e = g(2);
    (m(), Ne(' till ', Ct(2, 1, e.chatMutedTill, 'EEE @ h:mm a'), ''));
  }
}
function h0e(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 90)(1, 'h5', 91),
      T(2, 'i', 92),
      v(3, ' Chat Disabled '),
      H(4, u0e, 3, 4, 'span'),
      u()()),
    2 & t)
  ) {
    const e = g();
    (m(4), O(4, e.chatMutedTill ? 4 : -1));
  }
}
const li = window.$;
var lc;
function xw(t) {
  (t.stopPropagation(),
    t.preventDefault(),
    (t.target.className = 'dragover' == t.type ? 'hover' : ''));
}
function p0e(t) {
  console.log('FileDropped:', t);
  var n = document.createElement('img'),
    e = new FileReader();
  ((e.onloadend = function () {
    ((n.src = e.result), li('#fileList').append(n));
  }),
    e.readAsDataURL(t));
}
function c6(t) {
  (li('#fileList').show(), li('#filedrag').hide(), xw(t));
  var n = t.target.files || t.dataTransfer.files;
  (li('#fileList').empty(), (lc = []));
  for (var i, e = 0; (i = n[e]); e++) (lc.push(i), p0e(i));
}
