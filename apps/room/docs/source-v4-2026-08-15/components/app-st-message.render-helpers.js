const cge = ['popover'],
  o6 = (t) => ({ 'msg-box-adm': t }),
  dge = (t) => ({ 'justify-content-end': t }),
  uge = (t, n, e) => ({ mentionColor: t, questionColor: n, 'presenter-msg-right': e }),
  hge = (t) => ({ 'presenter-msg-right': t }),
  Dw = (t, n) => ({ mentionColor: t, questionColor: n }),
  pge = (t) => ({ 'presenter-reactions-right': t }),
  s6 = (t) => ({ 'chat-reaction-added': t }),
  fge = (t) => ({ 'text-primary': t }),
  mge = (t) => ({ 'btn-danger animated flash': t });
function gge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'emoji-mart', 5),
      x('emojiSelect', function (o) {
        return (D(e), E(g().selectEmoji(o)));
      }),
      u());
  }
}
function _ge(t, n) {
  if ((1 & t && (d(0, 'div', 3)(1, 'a', 6), v(2), Xe(3, 'date'), u()()), 2 & t)) {
    const e = g();
    (m(), z('ngStyle', e.styleF), m(), Ze(Ct(3, 2, e.msg.t, 'fullDate')));
  }
}
function bge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 12),
      x('click', function () {
        return (D(e), E(g(3).muteChat('24')));
      }),
      T(1, 'i', 32),
      v(2, '\xa0\xa0Mute Chat for 24hrs'),
      u());
  }
}
function vge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 12),
      x('click', function (o) {
        D(e);
        const s = g(2);
        return E(s.doMsgDelete(s.msg, o));
      }),
      T(1, 'i', 30),
      v(2, '\xa0\xa0Delete Message'),
      u(),
      H(3, bge, 3, 0, 'a', 15),
      T(4, 'div', 31));
  }
  if (2 & t) {
    const e = g(2);
    (m(3), O(3, e.msg.isA ? -1 : 3));
  }
}
function yge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 12),
      x('click', function (o) {
        D(e);
        const s = g(2);
        return E(s.usersDoMsgDelete(s.msg, o));
      }),
      T(1, 'i', 30),
      v(2, '\xa0\xa0Delete Message'),
      u(),
      T(3, 'div', 31));
  }
}
function Fge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 12),
      x('click', function () {
        D(e);
        const o = g(2);
        return E(o.doShowMsgToAll(o.msg));
      }),
      T(1, 'i', 33),
      v(2, '\xa0\xa0Show message to all'),
      u());
  }
}
function Cge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 34),
      x('click', function () {
        D(e);
        const o = g(2);
        return E(o.openAlertSendReport(o.msg._id));
      }),
      T(1, 'i', 35),
      v(2, '\xa0\xa0Alert Send Report '),
      u());
  }
}
function Sge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 36),
      x('click', function () {
        D(e);
        const o = g(2);
        return E(o.doPublicReply(o.msg));
      }),
      T(1, 'i', 37),
      v(2, '\xa0\xa0Reply'),
      u());
  }
}
function wge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 12),
      x('click', function () {
        D(e);
        const o = g(2);
        return E(o.markAsAnswered(o.msg));
      }),
      T(1, 'i', 38),
      v(2, '\xa0\xa0Mark Answered '),
      u());
  }
}
function Tge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 39, 1),
      x('click', function () {
        return (D(e), E(g(2).addReaction()));
      })('shown', function () {
        return (D(e), E(g(2).onPopoverOpen()));
      })('hidden', function () {
        return (D(e), E(g(2).onPopoverClose()));
      }),
      T(2, 'i', 40),
      v(3, '\xa0\xa0Add Reaction'),
      u());
  }
  2 & t && (g(2), z('ngbPopover', It(1)));
}
function Dge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 12),
      x('click', function () {
        return (D(e), E(g(2).editMessage()));
      }),
      T(1, 'i', 41),
      v(2, '\xa0\xa0Edit'),
      u());
  }
}
function Ege(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 12),
      x('click', function () {
        return (D(e), E(g(2).copyMessage()));
      }),
      T(1, 'i', 42),
      v(2, '\xa0\xa0Copy'),
      u());
  }
}
function kge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 12),
      x('click', function () {
        D(e);
        const o = g(2);
        return E(o.startPC(o.msg.uid));
      }),
      T(1, 'i', 43),
      v(2, '\xa0\xa0Private Chat '),
      u());
  }
}
function xge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 44),
      x('click', function () {
        D(e);
        const o = g(2);
        return E(o.doUserInfo(o.msg.uid, o.msg.rid));
      }),
      T(1, 'img', 45),
      u());
  }
  if (2 & t) {
    const e = g(2);
    (m(),
      z('src', e.msg.pic || 'https://secure.gravatar.com/avatar/' + e.msg.avt + '?d=mm&s=50', Mt));
  }
}
function Mge(t, n) {
  if ((1 & t && (T(0, 'div', 25), Xe(1, 'noSanitize')), 2 & t)) {
    const e = g(2);
    z('innerHTML', Ct(1, 2, e.badges, 'html'), wn)('ngStyle', e.styleF);
  }
}
function Age(t, n) {
  1 & t && (d(0, 'div', 27), v(1, '\u2705'), u());
}
function Pge(t, n) {
  if ((1 & t && (T(0, 'div', 28), Xe(1, 'parseSymbols'), Xe(2, 'parseLinks')), 2 & t)) {
    const e = g(2);
    z('ngStyle', e.styleF)(
      'ngClass',
      $a(
        13,
        uge,
        e.msg.isMention && !e.hasCustomFollowedUserColors,
        e.msg.txt.includes('?') && !e.hasCustomFollowedUserColors,
        e.appService.globals.sessData.presenterMsgsOnTheRight
      )
    )(
      'innerHTML',
      Tn(
        2,
        8,
        Tn(
          1,
          3,
          e.msg.txt,
          e.logType,
          e.msg.avt,
          e.isQAMsg ? null : e.appService.globals.alertLabels
        ),
        e.appService.globals.preferences.chatGif,
        e.msg._id,
        e.extraChatMsg
      ),
      wn
    );
  }
}
function Rge(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 46)(1, 'div', 47)(2, 'strong', 48),
      v(3),
      u(),
      T(4, 'div', 49),
      Xe(5, 'parseSymbols'),
      Xe(6, 'parseLinks'),
      u(),
      T(7, 'div', 50),
      Xe(8, 'parseSymbols'),
      Xe(9, 'parseLinks'),
      u()),
    2 & t)
  ) {
    const e = g(2);
    (z('ngClass', ct(29, hge, e.appService.globals.sessData.presenterMsgsOnTheRight))(
      'ngStyle',
      e.invertTxtColorToggler(e.invertTxtColor, 'name')
    ),
      m(),
      z(
        'ngClass',
        'lightTheme' == e.appService.globals.preferences.theme
          ? 'private-reply-bg-light'
          : 'private-reply-bg-dark'
      ),
      m(),
      z('ngStyle', e.invertTxtColorToggler(e.invertTxtColor, 'name')),
      m(),
      Ze(e.msg.repl.n),
      m(),
      z('ngStyle', e.styleF)(
        'ngClass',
        Kn(
          31,
          Dw,
          e.msg.isMention && !e.hasCustomFollowedUserColors,
          e.msg.txt.includes('?') && !e.hasCustomFollowedUserColors
        )
      )(
        'innerHTML',
        Tn(
          6,
          14,
          Tn(
            5,
            9,
            e.msg.repl.txt,
            e.logType,
            e.msg.avt,
            e.isQAMsg ? null : e.appService.globals.alertLabels
          ),
          e.appService.globals.preferences.chatGif,
          e.msg._id,
          e.extraChatMsg
        ),
        wn
      ),
      m(3),
      z(
        'innerHTML',
        Tn(
          9,
          24,
          Tn(
            8,
            19,
            e.msg.txt,
            e.logType,
            e.msg.avt,
            e.isQAMsg ? null : e.appService.globals.alertLabels
          ),
          e.appService.globals.preferences.chatGif,
          e.msg._id,
          e.extraChatMsg
        ),
        wn
      ));
  }
}
function Ige(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 54),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(3).addRemoveReaction(o.key));
      }),
      v(1),
      u());
  }
  if (2 & t) {
    const e = g().$implicit,
      i = g(3);
    (z('ngClass', ct(3, s6, e.value.clickedBy.includes(i.hashEmail))),
      m(),
      ns('', e.value.emoji, ' ', e.value.clickedBy.length, ' '));
  }
}
function Oge(t, n) {
  if ((1 & t && (d(0, 'span'), H(1, Ige, 2, 5, 'span', 53), u()), 2 & t)) {
    const e = n.$implicit;
    (m(), O(1, e.value.clickedBy.length > 0 ? 1 : -1));
  }
}
function Nge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 55),
      x('click', function () {
        return (D(e), E(g(3).addReaction()));
      }),
      T(1, 'i', 40),
      u());
  }
  2 & t && (g(3), z('ngbPopover', It(1)));
}
function Lge(t, n) {
  if (
    (1 & t &&
      (d(0, 'span', 29),
      H(1, Oge, 2, 1, 'span', 51),
      Xe(2, 'keyvalue'),
      H(3, Nge, 2, 1, 'span', 52),
      u()),
    2 & t)
  ) {
    const e = g(2);
    (z('ngClass', ct(6, pge, e.appService.globals.sessData.presenterMsgsOnTheRight))(
      'ngStyle',
      e.styleF
    ),
      m(),
      z('ngForOf', yr(2, 4, e.msg.r)),
      m(2),
      O(3, 'chat' === e.logType || ('alerts' === e.logType && e.isQAMsg) ? 3 : -1));
  }
}
function Bge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 4)(1, 'div', 7)(2, 'div', 8)(3, 'div', 9)(4, 'a', 10),
      v(5, '\u2807 '),
      u(),
      d(6, 'div', 11),
      H(7, vge, 5, 1)(8, yge, 4, 0),
      d(9, 'a', 12),
      x('click', function () {
        D(e);
        const o = g();
        return E(o.doUserInfo(o.msg.uid, o.msg.rid));
      }),
      T(10, 'i', 13),
      v(11, '\xa0\xa0User Info'),
      u(),
      d(12, 'a', 12),
      x('click', function () {
        D(e);
        const o = g();
        return E(o.doMention(o.msg.n));
      }),
      T(13, 'i', 14),
      v(14, '\xa0\xa0Mention'),
      u(),
      H(15, Fge, 3, 0, 'a', 15)(16, Cge, 3, 0, 'a', 16)(17, Sge, 3, 0, 'a', 17)(
        18,
        wge,
        3,
        0,
        'a',
        15
      )(19, Tge, 4, 1, 'a', 18)(20, Dge, 3, 0, 'a', 15)(21, Ege, 3, 0, 'a', 15)(
        22,
        kge,
        3,
        0,
        'a',
        15
      ),
      u(),
      H(23, xge, 2, 1, 'div', 19),
      u(),
      d(24, 'div', 20)(25, 'div', 21)(26, 'span', 22),
      Xe(27, 'date'),
      v(28),
      Xe(29, 'date'),
      u(),
      d(30, 'div', 23)(31, 'strong', 24),
      x('click', function () {
        D(e);
        const o = g();
        return E(o.doMention(o.msg.n));
      })('dblclick', function () {
        D(e);
        const o = g();
        return E(o.doUserInfo(o.msg.uid, o.msg.rid));
      }),
      v(32),
      u(),
      H(33, Mge, 2, 5, 'div', 25),
      u()(),
      d(34, 'div', 26),
      H(35, Age, 2, 0, 'div', 27)(36, Pge, 3, 17, 'div', 28)(37, Rge, 10, 34),
      u(),
      H(38, Lge, 4, 8, 'span', 29),
      u()()()());
  }
  if (2 & t) {
    const e = g();
    (z('ngClass', ct(30, o6, e.msg.isA))('ngStyle', e.styleB),
      m(4),
      z('ngStyle', e.invertTxtColorToggler(e.invertTxtColor, 'name')),
      m(3),
      O(7, e.isP ? 7 : -1),
      m(),
      O(8, !e.isP && e.canDeleteOwnMsg ? 8 : -1),
      m(7),
      O(15, e.appService.globals.isPresenter && !e.appService.globals.isLimitedPresenter ? 15 : -1),
      m(),
      O(16, e.isP && 'alerts' === e.logType ? 16 : -1),
      m(),
      O(17, e.canDoPublicReply ? 17 : -1),
      m(),
      O(18, e.isP && 'chat' === e.logType ? 18 : -1),
      m(),
      O(
        19,
        (e.appService.globals.sessData.enableReactions && 'chat' === e.logType) ||
          (e.appService.globals.sessData.enableQAReactions && 'alerts' === e.logType && e.isQAMsg)
          ? 19
          : -1
      ),
      m(),
      O(20, e.canEditMessage ? 20 : -1),
      m(),
      O(21, 'alerts' === e.logType ? 21 : -1),
      m(),
      O(22, e.canPM ? 22 : -1),
      m(),
      O(23, e.hideAvatar ? -1 : 23),
      m(3),
      xn('ngbTooltip', Ct(27, 24, e.msg.t, 'short')),
      z('ngStyle', e.invertTxtColorToggler(e.invertTxtColor, 'date')),
      m(2),
      Ze(Ct(29, 27, e.msg.t, 'hh:mm a')),
      m(3),
      z('ngStyle', e.invertTxtColorToggler(e.invertTxtColor, 'name')),
      m(),
      Ne(' ', e.msg.n, ' '),
      m(),
      O(33, e.badges ? 33 : -1),
      m(),
      z('ngClass', ct(32, dge, e.appService.globals.sessData.presenterMsgsOnTheRight)),
      m(),
      O(35, e.msg.ans && 'alerts' != e.logType ? 35 : -1),
      m(),
      O(36, e.msg.repl ? 37 : 36),
      m(2),
      O(
        38,
        ((e.appService.globals.sessData.enableReactions && 'chat' === e.logType) ||
          (e.appService.globals.sessData.enableQAReactions &&
            'alerts' === e.logType &&
            e.isQAMsg)) &&
          e.checkMsgReactions(e.msg)
          ? 38
          : -1
      ));
  }
}
function Uge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 12),
      x('click', function () {
        return (D(e), E(g(3).muteChat('24')));
      }),
      T(1, 'i', 32),
      v(2, '\xa0\xa0Mute Chat for 24hrs'),
      u());
  }
}
function jge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 12),
      x('click', function (o) {
        D(e);
        const s = g(2);
        return E(s.doMsgDelete(s.msg, o));
      }),
      T(1, 'i', 30),
      v(2, '\xa0\xa0Delete Message'),
      u(),
      H(3, Uge, 3, 0, 'a', 15),
      T(4, 'div', 31));
  }
  if (2 & t) {
    const e = g(2);
    (m(3), O(3, e.msg.isA ? -1 : 3));
  }
}
function Vge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 12),
      x('click', function (o) {
        D(e);
        const s = g(2);
        return E(s.usersDoMsgDelete(s.msg, o));
      }),
      T(1, 'i', 30),
      v(2, '\xa0\xa0Delete Message'),
      u(),
      T(3, 'div', 31));
  }
}
function Hge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 12),
      x('click', function () {
        D(e);
        const o = g(2);
        return E(o.doShowMsgToAll(o.msg));
      }),
      T(1, 'i', 33),
      v(2, '\xa0\xa0Show message to all'),
      u());
  }
}
function $ge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 34),
      x('click', function () {
        D(e);
        const o = g(2);
        return E(o.openAlertSendReport(o.msg._id));
      }),
      T(1, 'i', 35),
      v(2, '\xa0\xa0Alert Send Report '),
      u());
  }
}
function zge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 36),
      x('click', function () {
        D(e);
        const o = g(2);
        return E(o.doPublicReply(o.msg));
      }),
      T(1, 'i', 37),
      v(2, '\xa0\xa0Reply'),
      u());
  }
}
function Gge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 12),
      x('click', function () {
        D(e);
        const o = g(2);
        return E(o.markAsAnswered(o.msg));
      }),
      T(1, 'i', 38),
      v(2, '\xa0\xa0Mark Answered '),
      u());
  }
}
function Wge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 39, 1),
      x('click', function () {
        return (D(e), E(g(2).addReaction()));
      })('shown', function () {
        return (D(e), E(g(2).onPopoverOpen()));
      })('hidden', function () {
        return (D(e), E(g(2).onPopoverClose()));
      }),
      T(2, 'i', 40),
      v(3, '\xa0\xa0Add Reaction'),
      u());
  }
  2 & t && (g(2), z('ngbPopover', It(1)));
}
function qge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 12),
      x('click', function () {
        return (D(e), E(g(2).editMessage()));
      }),
      T(1, 'i', 41),
      v(2, '\xa0\xa0Edit'),
      u());
  }
}
function Kge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 12),
      x('click', function () {
        return (D(e), E(g(2).copyMessage()));
      }),
      T(1, 'i', 42),
      v(2, '\xa0\xa0Copy'),
      u());
  }
}
function Yge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 12),
      x('click', function () {
        D(e);
        const o = g(2);
        return E(o.startPC(o.msg.uid));
      }),
      T(1, 'i', 43),
      v(2, '\xa0\xa0Private Chat '),
      u());
  }
}
function Qge(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 44),
      x('click', function () {
        D(e);
        const o = g(2);
        return E(o.doUserInfo(o.msg.uid, o.msg.rid));
      }),
      T(1, 'img', 45),
      u());
  }
  if (2 & t) {
    const e = g(2);
    (m(),
      z('src', e.msg.pic || 'https://secure.gravatar.com/avatar/' + e.msg.avt + '?d=mm&s=50', Mt));
  }
}
function Xge(t, n) {
  (1 & t && (T(0, 'div', 60), Xe(1, 'noSanitize')),
    2 & t && z('innerHTML', Ct(1, 1, g(2).badges, 'html'), wn));
}
function Jge(t, n) {
  1 & t && (d(0, 'span', 61), v(1, ' Trial '), u());
}
function Zge(t, n) {
  1 & t && (d(0, 'span', 62), v(1, 'New'), u());
}
function e1e(t, n) {
  if ((1 & t && (d(0, 'span', 63), T(1, 'i', 66), d(2, 'span', 67), v(3), u()()), 2 & t)) {
    const e = g(2);
    (z('ngStyle', e.invertTxtColorToggler(e.invertTxtColor, 'date')), m(3), Ze(e.msg.d.years));
  }
}
function t1e(t, n) {
  if ((1 & t && (d(0, 'span', 64), v(1), u()), 2 & t)) {
    const e = g(2);
    (m(), Ne('[', e.sessName, ']'));
  }
}
function n1e(t, n) {
  if ((1 & t && (d(0, 'span', 71), v(1), u()), 2 & t)) {
    const e = g(4);
    (m(), Ne(' (', e.msg.qa.length, ') '));
  }
}
function i1e(t, n) {
  1 & t && (d(0, 'span'), v(1, ' \u2705'), u());
}
function o1e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 70),
      x('click', function () {
        D(e);
        const o = g(3);
        return E(o.openAlertQAModal(o.msg));
      }),
      H(1, n1e, 2, 1, 'span', 71),
      T(2, 'i', 72),
      H(3, i1e, 2, 0, 'span'),
      u());
  }
  if (2 & t) {
    const e = g(3);
    (z('ngClass', ct(4, mge, (null == e.msg ? null : e.msg.unreadQA) || !1))('ngStyle', e.styleF),
      m(),
      O(1, e.msg.qa && e.msg.qa.length > 0 ? 1 : -1),
      m(2),
      O(3, e.msg.ans && 'alerts' === e.logType ? 3 : -1));
  }
}
function s1e(t, n) {
  if (
    (1 & t &&
      (d(0, 'div'), H(1, o1e, 4, 6, 'button', 68), d(2, 'span', 69), v(3), Xe(4, 'date'), u()()),
    2 & t)
  ) {
    const e = g(2);
    (m(),
      O(1, !e.isQAMsg && e.appService.globals.sessData.hasQAOnAlerts ? 1 : -1),
      m(),
      z('ngStyle', e.invertTxtColorToggler(e.invertTxtColor, 'date')),
      m(),
      Ze(Ct(4, 3, e.msg.t, 'short')));
  }
}
function r1e(t, n) {
  if ((1 & t && (d(0, 'span', 22), Xe(1, 'date'), v(2), Xe(3, 'date'), u()), 2 & t)) {
    const e = g(2);
    (xn('ngbTooltip', Ct(1, 3, e.msg.t, 'short')),
      z('ngStyle', e.invertTxtColorToggler(e.invertTxtColor, 'date')),
      m(2),
      Ne('', Ct(3, 6, e.msg.t, 'hh:mm a'), ' '));
  }
}
function a1e(t, n) {
  1 & t && (d(0, 'div', 27), v(1, '\u2705'), u());
}
function l1e(t, n) {
  if ((1 & t && (T(0, 'div', 28), Xe(1, 'parseSymbols'), Xe(2, 'parseLinks')), 2 & t)) {
    const e = g(2);
    z('ngStyle', e.styleF)(
      'ngClass',
      Kn(
        13,
        Dw,
        e.msg.isMention && !e.hasCustomFollowedUserColors,
        e.msg.txt.includes('?') && !e.hasCustomFollowedUserColors
      )
    )(
      'innerHTML',
      Tn(
        2,
        8,
        Tn(
          1,
          3,
          e.msg.txt,
          e.logType,
          e.msg.avt,
          e.isQAMsg ? null : e.appService.globals.alertLabels
        ),
        e.appService.globals.preferences.chatGif,
        e.msg._id,
        e.extraChatMsg
      ),
      wn
    );
  }
}
function c1e(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 73)(1, 'div', 47)(2, 'strong', 48),
      v(3),
      u(),
      T(4, 'div', 49),
      Xe(5, 'parseSymbols'),
      Xe(6, 'parseLinks'),
      u(),
      T(7, 'div', 50),
      Xe(8, 'parseSymbols'),
      Xe(9, 'parseLinks'),
      u()),
    2 & t)
  ) {
    const e = g(2);
    (z('ngStyle', e.invertTxtColorToggler(e.invertTxtColor, 'name')),
      m(),
      z(
        'ngClass',
        'lightTheme' == e.appService.globals.preferences.theme
          ? 'private-reply-bg-light'
          : 'private-reply-bg-dark'
      ),
      m(),
      z('ngStyle', e.invertTxtColorToggler(e.invertTxtColor, 'name')),
      m(),
      Ze(e.msg.repl.n),
      m(),
      z('ngStyle', e.styleF)(
        'ngClass',
        Kn(
          28,
          Dw,
          e.msg.isMention && !e.hasCustomFollowedUserColors,
          e.msg.txt.includes('?') && !e.hasCustomFollowedUserColors
        )
      )(
        'innerHTML',
        Tn(
          6,
          13,
          Tn(
            5,
            8,
            e.msg.repl.txt,
            e.logType,
            e.msg.avt,
            e.isQAMsg ? null : e.appService.globals.alertLabels
          ),
          e.appService.globals.preferences.chatGif,
          e.msg._id,
          e.extraChatMsg
        ),
        wn
      ),
      m(3),
      z(
        'innerHTML',
        Tn(
          9,
          23,
          Tn(
            8,
            18,
            e.msg.txt,
            e.logType,
            e.msg.avt,
            e.isQAMsg ? null : e.appService.globals.alertLabels
          ),
          e.appService.globals.preferences.chatGif,
          e.msg._id,
          e.extraChatMsg
        ),
        wn
      ));
  }
}
function d1e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 54),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(3).addRemoveReaction(o.key));
      }),
      v(1),
      u());
  }
  if (2 & t) {
    const e = g().$implicit,
      i = g(3);
    (z('ngClass', ct(3, s6, e.value.clickedBy.includes(i.hashEmail))),
      m(),
      ns('', e.value.emoji, ' ', e.value.clickedBy.length, ' '));
  }
}
function u1e(t, n) {
  if ((1 & t && (d(0, 'span'), H(1, d1e, 2, 5, 'span', 53), u()), 2 & t)) {
    const e = n.$implicit;
    (m(), O(1, e.value.clickedBy.length > 0 ? 1 : -1));
  }
}
function h1e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 55),
      x('click', function () {
        return (D(e), E(g(3).addReaction()));
      }),
      T(1, 'i', 40),
      u());
  }
  2 & t && (g(3), z('ngbPopover', It(1)));
}
function p1e(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 6),
      H(1, u1e, 2, 1, 'span', 51),
      Xe(2, 'keyvalue'),
      H(3, h1e, 2, 1, 'span', 52),
      u()),
    2 & t)
  ) {
    const e = g(2);
    (z('ngStyle', e.styleF),
      m(),
      z('ngForOf', yr(2, 3, e.msg.r)),
      m(2),
      O(3, 'chat' === e.logType || ('alerts' === e.logType && e.isQAMsg) ? 3 : -1));
  }
}
function f1e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 4)(1, 'div', 7)(2, 'div', 56)(3, 'div', 57)(4, 'a', 10),
      v(5, '\u2807 '),
      u(),
      d(6, 'div', 11),
      H(7, jge, 5, 1)(8, Vge, 4, 0),
      d(9, 'a', 12),
      x('click', function () {
        D(e);
        const o = g();
        return E(o.doUserInfo(o.msg.uid, o.msg.rid));
      }),
      T(10, 'i', 13),
      v(11, '\xa0\xa0User Info'),
      u(),
      d(12, 'a', 12),
      x('click', function () {
        D(e);
        const o = g();
        return E(o.doMention(o.msg.n));
      }),
      T(13, 'i', 14),
      v(14, '\xa0\xa0Mention'),
      u(),
      H(15, Hge, 3, 0, 'a', 15)(16, $ge, 3, 0, 'a', 16)(17, zge, 3, 0, 'a', 17)(
        18,
        Gge,
        3,
        0,
        'a',
        15
      )(19, Wge, 4, 1, 'a', 18)(20, qge, 3, 0, 'a', 15)(21, Kge, 3, 0, 'a', 15)(
        22,
        Yge,
        3,
        0,
        'a',
        15
      ),
      u(),
      H(23, Qge, 2, 1, 'div', 19),
      u(),
      d(24, 'div', 20)(25, 'div', 21)(26, 'div', 58)(27, 'strong', 59),
      x('click', function () {
        D(e);
        const o = g();
        return E(o.doMention(o.msg.n));
      })('dblclick', function () {
        D(e);
        const o = g();
        return E(o.doUserInfo(o.msg.uid, o.msg.rid));
      }),
      v(28),
      u(),
      H(29, Xge, 2, 4, 'div', 60)(30, Jge, 2, 0, 'span', 61)(31, Zge, 2, 0, 'span', 62)(
        32,
        e1e,
        4,
        2,
        'span',
        63
      )(33, t1e, 2, 1, 'span', 64),
      u(),
      H(34, s1e, 5, 6, 'div')(35, r1e, 4, 9),
      u(),
      d(36, 'div', 65),
      H(37, a1e, 2, 0, 'div', 27)(38, l1e, 3, 16, 'div', 28)(39, c1e, 10, 31),
      u(),
      H(40, p1e, 4, 5, 'div', 6),
      u()()()());
  }
  if (2 & t) {
    const e = g();
    (z('ngClass', ct(27, o6, e.msg.isA))('ngStyle', e.styleB),
      m(4),
      z('ngStyle', e.invertTxtColorToggler(e.invertTxtColor, 'name')),
      m(3),
      O(7, e.isP ? 7 : -1),
      m(),
      O(8, !e.isP && e.canDeleteOwnMsg ? 8 : -1),
      m(7),
      O(15, e.appService.globals.isPresenter && !e.appService.globals.isLimitedPresenter ? 15 : -1),
      m(),
      O(16, e.isP && 'alerts' === e.logType ? 16 : -1),
      m(),
      O(17, e.canDoPublicReply ? 17 : -1),
      m(),
      O(18, e.isP && 'chat' === e.logType ? 18 : -1),
      m(),
      O(
        19,
        (e.appService.globals.sessData.enableReactions && 'chat' === e.logType) ||
          (e.appService.globals.sessData.enableQAReactions && 'alerts' === e.logType && e.isQAMsg)
          ? 19
          : -1
      ),
      m(),
      O(20, e.canEditMessage ? 20 : -1),
      m(),
      O(21, 'alerts' === e.logType ? 21 : -1),
      m(),
      O(22, e.canPM ? 22 : -1),
      m(),
      O(23, e.hideAvatar ? -1 : 23),
      m(3),
      z('ngStyle', e.styleF),
      m(),
      z('ngClass', ct(29, fge, e.msg.isA))(
        'ngStyle',
        e.invertTxtColorToggler(e.invertTxtColor, 'name')
      ),
      m(),
      Ne(' ', e.msg.n, ' '),
      m(),
      O(29, e.badges ? 29 : -1),
      m(),
      O(30, e.appService.globals.isPresenter && e.msg.isFT ? 30 : -1),
      m(),
      O(
        31,
        e.appService.globals.sessData.isNewIndicatorOn &&
          e.appService.globals.isPresenter &&
          e.msg.isNew
          ? 31
          : -1
      ),
      m(),
      O(
        32,
        !e.appService.globals.sessData.disableStarYears &&
          'chat' === e.logType &&
          !e.msg.isA &&
          e.msg.hasOwnProperty('d') &&
          e.appService.globals.preferences.chatBadges
          ? 32
          : -1
      ),
      m(),
      O(33, e.sessName ? 33 : -1),
      m(),
      O(34, 'alerts' === e.logType ? 34 : 35),
      m(3),
      O(37, e.msg.ans && 'alerts' != e.logType ? 37 : -1),
      m(),
      O(38, e.msg.repl ? 39 : 38),
      m(2),
      O(
        40,
        ((e.appService.globals.sessData.enableReactions && 'chat' === e.logType) ||
          (e.appService.globals.sessData.enableQAReactions &&
            'alerts' === e.logType &&
            e.isQAMsg)) &&
          e.checkMsgReactions(e.msg)
          ? 40
          : -1
      ));
  }
}
