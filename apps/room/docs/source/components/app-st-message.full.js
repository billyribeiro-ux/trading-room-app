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
  if ((1 & t && (d(0, 'div', 3)(1, 'a', 6), v(2), Je(3, 'date'), u()()), 2 & t)) {
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
  if ((1 & t && (T(0, 'div', 25), Je(1, 'noSanitize')), 2 & t)) {
    const e = g(2);
    z('innerHTML', Ct(1, 2, e.badges, 'html'), wn)('ngStyle', e.styleF);
  }
}
function Age(t, n) {
  1 & t && (d(0, 'div', 27), v(1, '\u2705'), u());
}
function Pge(t, n) {
  if ((1 & t && (T(0, 'div', 28), Je(1, 'parseSymbols'), Je(2, 'parseLinks')), 2 & t)) {
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
      Je(5, 'parseSymbols'),
      Je(6, 'parseLinks'),
      u(),
      T(7, 'div', 50),
      Je(8, 'parseSymbols'),
      Je(9, 'parseLinks'),
      u()),
    2 & t)
  ) {
    const e = g(2);
    (z('ngClass', ut(29, hge, e.appService.globals.sessData.presenterMsgsOnTheRight))(
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
    (z('ngClass', ut(3, s6, e.value.clickedBy.includes(i.hashEmail))),
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
      Je(2, 'keyvalue'),
      H(3, Nge, 2, 1, 'span', 52),
      u()),
    2 & t)
  ) {
    const e = g(2);
    (z('ngClass', ut(6, pge, e.appService.globals.sessData.presenterMsgsOnTheRight))(
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
      Je(27, 'date'),
      v(28),
      Je(29, 'date'),
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
    (z('ngClass', ut(30, o6, e.msg.isA))('ngStyle', e.styleB),
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
      z('ngClass', ut(32, dge, e.appService.globals.sessData.presenterMsgsOnTheRight)),
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
  (1 & t && (T(0, 'div', 60), Je(1, 'noSanitize')),
    2 & t && z('innerHTML', Ct(1, 1, g(2).badges, 'html'), wn));
}
function Jge(t, n) {
  1 & t && (d(0, 'span', 61), v(1, ' Trial '), u());
}
function Zge(t, n) {
  1 & t && (d(0, 'span', 62), v(1, 'New'), u());
}
function e_e(t, n) {
  if ((1 & t && (d(0, 'span', 63), T(1, 'i', 66), d(2, 'span', 67), v(3), u()()), 2 & t)) {
    const e = g(2);
    (z('ngStyle', e.invertTxtColorToggler(e.invertTxtColor, 'date')), m(3), Ze(e.msg.d.years));
  }
}
function t_e(t, n) {
  if ((1 & t && (d(0, 'span', 64), v(1), u()), 2 & t)) {
    const e = g(2);
    (m(), Ne('[', e.sessName, ']'));
  }
}
function n_e(t, n) {
  if ((1 & t && (d(0, 'span', 71), v(1), u()), 2 & t)) {
    const e = g(4);
    (m(), Ne(' (', e.msg.qa.length, ') '));
  }
}
function i_e(t, n) {
  1 & t && (d(0, 'span'), v(1, ' \u2705'), u());
}
function o_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 70),
      x('click', function () {
        D(e);
        const o = g(3);
        return E(o.openAlertQAModal(o.msg));
      }),
      H(1, n_e, 2, 1, 'span', 71),
      T(2, 'i', 72),
      H(3, i_e, 2, 0, 'span'),
      u());
  }
  if (2 & t) {
    const e = g(3);
    (z('ngClass', ut(4, mge, (null == e.msg ? null : e.msg.unreadQA) || !1))('ngStyle', e.styleF),
      m(),
      O(1, e.msg.qa && e.msg.qa.length > 0 ? 1 : -1),
      m(2),
      O(3, e.msg.ans && 'alerts' === e.logType ? 3 : -1));
  }
}
function s_e(t, n) {
  if (
    (1 & t &&
      (d(0, 'div'), H(1, o_e, 4, 6, 'button', 68), d(2, 'span', 69), v(3), Je(4, 'date'), u()()),
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
function r_e(t, n) {
  if ((1 & t && (d(0, 'span', 22), Je(1, 'date'), v(2), Je(3, 'date'), u()), 2 & t)) {
    const e = g(2);
    (xn('ngbTooltip', Ct(1, 3, e.msg.t, 'short')),
      z('ngStyle', e.invertTxtColorToggler(e.invertTxtColor, 'date')),
      m(2),
      Ne('', Ct(3, 6, e.msg.t, 'hh:mm a'), ' '));
  }
}
function a_e(t, n) {
  1 & t && (d(0, 'div', 27), v(1, '\u2705'), u());
}
function l_e(t, n) {
  if ((1 & t && (T(0, 'div', 28), Je(1, 'parseSymbols'), Je(2, 'parseLinks')), 2 & t)) {
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
function c_e(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 73)(1, 'div', 47)(2, 'strong', 48),
      v(3),
      u(),
      T(4, 'div', 49),
      Je(5, 'parseSymbols'),
      Je(6, 'parseLinks'),
      u(),
      T(7, 'div', 50),
      Je(8, 'parseSymbols'),
      Je(9, 'parseLinks'),
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
function d_e(t, n) {
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
    (z('ngClass', ut(3, s6, e.value.clickedBy.includes(i.hashEmail))),
      m(),
      ns('', e.value.emoji, ' ', e.value.clickedBy.length, ' '));
  }
}
function u_e(t, n) {
  if ((1 & t && (d(0, 'span'), H(1, d_e, 2, 5, 'span', 53), u()), 2 & t)) {
    const e = n.$implicit;
    (m(), O(1, e.value.clickedBy.length > 0 ? 1 : -1));
  }
}
function h_e(t, n) {
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
function p_e(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 6),
      H(1, u_e, 2, 1, 'span', 51),
      Je(2, 'keyvalue'),
      H(3, h_e, 2, 1, 'span', 52),
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
function f_e(t, n) {
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
        e_e,
        4,
        2,
        'span',
        63
      )(33, t_e, 2, 1, 'span', 64),
      u(),
      H(34, s_e, 5, 6, 'div')(35, r_e, 4, 9),
      u(),
      d(36, 'div', 65),
      H(37, a_e, 2, 0, 'div', 27)(38, l_e, 3, 16, 'div', 28)(39, c_e, 10, 31),
      u(),
      H(40, p_e, 4, 5, 'div', 6),
      u()()()());
  }
  if (2 & t) {
    const e = g();
    (z('ngClass', ut(27, o6, e.msg.isA))('ngStyle', e.styleB),
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
      z('ngClass', ut(29, fge, e.msg.isA))(
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
pu = (() => {
  class t {
    constructor(e, i) {
      ((this.appService = e),
        (this.alertsService = i),
        (this.badges = ''),
        (this.styleB = {}),
        (this.styleF = {}),
        (this.userChatB = {}),
        (this.userAlertB = {}),
        (this.userChatF = {}),
        (this.userAlertF = {}),
        (this.isND = !1),
        (this.canPM = !0),
        (this.canDeleteOwnMsg = !1),
        (this.invertTxtColor = {}),
        (this.hideAvatar = !1),
        (this.canDoPublicReply = !1),
        (this.showEmojiChooser = !1),
        (this.selectedEmoji = {}),
        (this.hashEmail = ''),
        (this.canEditMessage = !1),
        (this.hasCustomFollowedUserColors = !1),
        (this.pieData = []));
    }
    ngOnInit() {
      if (!this.msg) return;
      if (
        ((this.hashEmail = this.appService.hashEmail(this.appService.globals.user.email)),
        this.msg.bkgColor &&
          ((this.invertTxtColor = { color: this.msg.bkgColor, filter: 'invert(1)' }),
          (this.styleB = { 'background-color': this.msg.bkgColor })),
        this.msg.fontColor && (this.styleF.color = this.msg.fontColor),
        this.msg.txt.includes(`@${this.appService.globals.user.name}`) && (this.msg.isMention = !0),
        this.prevD &&
          ((this.prevD = new Date(this.prevD)),
          (this.msg.t = new Date(this.msg.t)),
          (this.isND = this.msg.t.getDay() != this.prevD.getDay())),
        this.appService.globals.preferences.chatBadges &&
          !this.appService.globals.sessData.presenterMsgsOnTheRight &&
          this.appService.globals.sessData.enableBadges &&
          this.msg.b &&
          this.msg.b.length &&
          (!this.appService.globals.sessData.showBadgesToPresentersOnly ||
            this.appService.globals.isPresenter))
      )
        for (let o = 0; o < this.msg.b.length; o++) {
          let r = this.appService.globals.sessData.badgesH[this.msg.b[o]];
          (r &&
            r.hasOwnProperty('darkTheme') &&
            r.darkTheme &&
            'darkTheme' === this.appService.globals.preferences.theme &&
            (r = this.appService.globals.sessData.badgesH[r.darkTheme]),
            r &&
              (this.badges +=
                r.hasOwnProperty('imgURL') && r.imgURL
                  ? '<img class="user-badge-img" src="' + r.imgURL + '" alt="' + r.imgURL + '"/>'
                  : '<span class="badge px-1 mx-1 user-badge" style="background-color: ' +
                    r.bkcolor +
                    '; color: ' +
                    r.color +
                    '" >' +
                    r.text +
                    '</span>'));
        }
      if (this.appService.globals.sessData.presenterSettings) {
        const o = this.appService.globals.sessData.presenterSettings[this.msg.avt];
        (o && o.color && o.bkgColor && (this.presenterColors = o),
          this.presenterColors &&
            ((this.invertTxtColor = { color: this.presenterColors.bkgColor, filter: 'invert(1)' }),
            (this.styleB = { 'background-color': this.presenterColors.bkgColor }),
            (this.styleF.color = this.presenterColors.color)));
      }
      const e = window.localStorage.getItem('chatStyle');
      if (e) {
        const o = JSON.parse(e);
        this.presenterColors
          ? ((this.invertTxtColor = {
              color: this.presenterColors.bkgColor,
              filter: 'invert(1)',
              fontSize: o.fontSize
            }),
            (this.styleF['font-size'] = o.fontSize + 'px'),
            (this.styleB = { 'background-color': this.presenterColors.bkgColor }),
            (this.styleF.color = this.presenterColors.color))
          : ((this.invertTxtColor = { color: o.usernameColor, fontSize: o.fontSize }),
            (this.styleF['font-size'] = o.fontSize + 'px'),
            (this.styleF.color = o.color),
            (this.styleB = { 'background-color': o.bgColor }));
      }
      const { followedUsers: i } = this.appService.globals;
      if (i && Object.keys(i).length > 0 && i[this.msg.avt]) {
        const o = i[this.msg.avt];
        o &&
          ((this.styleF['font-size'] = o.followChatStyle.fontSize + 'px'),
          (this.styleB = { 'background-color': o.followChatStyle.bgColor }),
          (this.styleF.color = o.followChatStyle.color),
          (this.invertTxtColor = {
            color: o.followChatStyle.usernameColor,
            fontSize: o.followChatStyle.fontSize
          }),
          (this.hasCustomFollowedUserColors = !0));
      }
      ((this.canPM =
        (this.appService.globals.isPresenter ||
          this.appService.globals.sessData.userPM ||
          (this.appService.globals.sessData.userToPresenterPM && this.msg.isA)) &&
        !(
          this.appService.globals.user.isFT && this.appService.globals.sessData.disablePMForTrials
        )),
        (this.canDeleteOwnMsg = this.appService.canDeleteOwnMessage(this.msg)),
        (this.canDoPublicReply =
          'chat' === this.logType &&
          this.appService.hashEmail(this.appService.globals.user.email) !== this.msg.avt &&
          (this.appService.globals.isPresenter ||
            this.appService.globals.sessData.usersPublicReply)),
        this.appService.globals.sessData.enableEditMessage &&
          'chat' === this.logType &&
          (this.canEditMessage =
            this.appService.hashEmail(this.appService.globals.user.email) === this.msg.avt ||
            (this.appService.globals.isPresenter && !this.msg.isA)),
        this.appService.globals.sessData.enableEditAlerts &&
          'alerts' === this.logType &&
          (this.canEditMessage = this.appService.globals.isPresenter),
        ((this.appService.globals.sessData.altChatRender &&
          ('chat' === this.logType || this.isQAMsg)) ||
          this.appService.globals.sessData.hideAvatars) &&
          (this.hideAvatar = !0));
    }
    ngAfterViewInit() {
      $('.msgMenu').on('hide.bs.dropdown', (e) => {
        (console.log('this.showEmojiChooser: ', this.showEmojiChooser),
          this.showEmojiChooser && e.preventDefault());
      });
    }
    invertTxtColorToggler(e, i) {
      const o = e.hasOwnProperty('fontSize') && '' !== e.fontSize;
      if (
        (o &&
          e.fontSize ===
            this.appService.globals.chatStyle[this.appService.globals.preferences.theme].color) ||
        (o &&
          e.fontSize ===
            this.appService.globals.presenterStyle[this.appService.globals.preferences.theme].color)
      )
        return {};
      if (o) {
        const s = Number(e.fontSize);
        e['font-size'] = 'name' === i ? s + 1 + 'px' : s - 2 + 'px';
      }
      return e;
    }
    openAlertSendReport(e) {
      e
        ? this.appService.guiEventBus.emit('doAlertSendReportModal', e)
        : bootbox.alert('No reports found.');
    }
    doMention(e) {
      this.appService.guiEventBus.emit(
        this.isQAMsg
          ? 'doQAMention'
          : this.appService.globals.preferences.extraChatColumn &&
              (this.extraChatMsg || 'textAreaTxtExtra' === this.appService.globals.chatInputFocus)
            ? 'doMentionExtra'
            : 'doMention',
        e
      );
    }
    doReply(e) {
      const i = this,
        o = bootbox.dialog({
          title: `<span class="do-private-reply"><strong>${e.n}:</strong> ${e.txt}</span>`,
          message: '<p>Choose between private or public reply.</p>',
          buttons: {
            cancel: {
              label: 'Cancel',
              className: 'btn-danger',
              callback() {
                console.log('Cancel button clicked');
              }
            },
            noclose: {
              label: 'Private Reply',
              className: 'btn-warning',
              callback: () => (
                i.doPrivateReply(e),
                o.modal('hide'),
                console.log('Private Reply button clicked'),
                !1
              )
            },
            ok: {
              label: 'Public Reply',
              className: 'btn-info',
              callback() {
                (i.doPublicReply(e), o.modal('hide'), console.log('Public Reply button clicked'));
              }
            }
          }
        });
    }
    doPrivateReply(e) {
      let i = this;
      bootbox.prompt({
        title: `<span class="do-private-reply"><strong>${e.n}:</strong> ${e.txt}</span>`,
        inputType: 'textarea',
        callback(o) {
          o &&
            (console.log('doPrivateReply msg: ', e),
            console.log('doPrivateReply reply: ', o),
            i.appService.sendChatReply(e.c, o, e.txt, e.n, e._id, e.uid));
        }
      });
    }
    markAsAnswered(e) {
      this.appService.markChatAnswered(e._id);
    }
    editMessage() {
      if ('chat' === this.logType) {
        if (
          this.appService.globals.sessData.enableRTE &&
          this.appService.globals.preferences.enableRTE &&
          this.appService.containsHtml(this.msg.txt)
        )
          return void this.appService.guiEventBus.emit('doRTEModalEdit', { msg: this.msg });
        bootbox.prompt({
          title: 'Edit chat message:',
          inputType: 'textarea',
          value: this.msg.txt,
          callback: (e) => {
            if (e) {
              const i = e.trim();
              this.appService.sendServerCommand('editChatMessage', {
                msgID: this.msg._id,
                newMsg: i
              });
            }
          }
        });
      } else
        bootbox.prompt({
          title: `Edit ${this.isQAMsg ? 'qa message' : 'alert'} by <strong>${this.msg.n}:</strong>`,
          inputType: 'textarea',
          value: this.msg.txt,
          callback: (i) => {
            if (i) {
              const o = i.trim();
              this.isQAMsg
                ? this.appService.sendServerCommand('editQAMessage', {
                    qaMsgID: this.qaMsgID,
                    msgIndex: this.msgIndex,
                    newAlertMsg: o
                  })
                : this.appService.sendServerCommand('editAlertMessage', {
                    alertID: this.msg._id,
                    newAlertMsg: o
                  });
            }
          }
        });
    }
    doPublicReply(e) {
      this.appService.guiEventBus.emit('doPublicReply', e);
    }
    doUserInfo(e, i) {
      (this.appService.getUserInfo(e, i),
        this.appService.guiEventBus.emit('doUserInfo', e),
        this.appService.globals.preferences.extraChatColumn &&
          (this.extraChatMsg || 'textAreaTxtExtra' === this.appService.globals.chatInputFocus) &&
          this.appService.guiEventBus.emit('doUserInfoExtra', this.extraChatMsg));
    }
    doMsgDelete(e, i) {
      (P('doMsgDelete: msgID:' + JSON.stringify(e)),
        i.shiftKey && (e.shiftDelete = !0),
        'chat' == this.logType
          ? this.appService.appEventBus.emit('doMsgDelete', e)
          : 'alerts' == this.logType
            ? this.isQAMsg
              ? this.appService.appEventBus.emit('doQAAlertDelete', {
                  msg: e,
                  qaMsgID: this.qaMsgID,
                  msgIndex: this.msgIndex
                })
              : this.appService.appEventBus.emit('doAlertDelete', e)
            : 'pc' == this.logType && this.appService.appEventBus.emit('doPCDelete', e));
    }
    usersDoMsgDelete(e, i) {
      (i?.shiftKey && (e.shiftDelete = !0),
        this.appService.appEventBus.emit('usersDoMsgDelete', e));
    }
    openAlertQAModal(e) {
      e &&
        (e.hasOwnProperty('unreadQA') && delete e.unreadQA,
        this.appService.guiEventBus.emit('openAlertQAModal', { msg: e, openModal: !0 }));
    }
    startPC(e) {
      this.appService.guiEventBus.emit('startPrivChat', {
        uid: e,
        isInit: !0,
        user: {
          uid: e,
          nick: this.msg.n,
          emailHash: this.msg.avt,
          pic: this.msg.pic,
          perms: this.msg.isA ? 'a' : 'r'
        }
      });
    }
    doShowMsgToAll(e) {
      this.appService.sendServerCommand('showMsgToAll', { msg: e });
    }
    addReaction() {
      ((this.showEmojiChooser = !0),
        console.log('this.popover: ', this.popover.isOpen()),
        $('.users-dropdown-options').on('click', (e) => {
          (console.log('event: ', e), e.stopPropagation());
        }));
    }
    addRemoveReaction(e) {
      (console.log('reaction key: ', e), (this.selectedEmoji = this.msg.r));
      let i = null;
      (this.selectedEmoji[e].clickedBy.length > 0 &&
      this.selectedEmoji[e].clickedBy.includes(this.hashEmail)
        ? ((i = {
            n: this.appService.globals.user.nick || this.appService.globals.user.name,
            emoji: this.selectedEmoji[e].emoji,
            remove: !0
          }),
          this.selectedEmoji[e].clickedBy.splice(
            this.selectedEmoji[e].clickedBy.indexOf(this.hashEmail),
            1
          ),
          0 === this.selectedEmoji[e].clickedBy.length && delete this.selectedEmoji[e])
        : (this.selectedEmoji[e].clickedBy.push(this.hashEmail),
          (i = {
            n: this.appService.globals.user.nick || this.appService.globals.user.name,
            emoji: this.selectedEmoji[e].emoji,
            remove: !1
          })),
        this.appService.manageChatReactions(
          this.isQAMsg ? this.qaMsgID : this.msg._id,
          this.selectedEmoji,
          i,
          this.logType,
          this.msgIndex
        ),
        (this.selectedEmoji = {}),
        setTimeout(() => {
          this.showEmojiChooser = !1;
        }, 500));
    }
    selectEmoji(e) {
      console.log('selectEmoji: ', e);
      let i = null;
      (this.msg.hasOwnProperty('r')
        ? ((this.selectedEmoji = this.msg.r),
          this.selectedEmoji[e.emoji.id]
            ? this.selectedEmoji[e.emoji.id].clickedBy.length > 0 &&
              this.selectedEmoji[e.emoji.id].clickedBy.includes(this.hashEmail)
              ? ((i = {
                  n: this.appService.globals.user.nick || this.appService.globals.user.name,
                  emoji: e.emoji.native,
                  remove: !0
                }),
                this.selectedEmoji[e.emoji.id].clickedBy.splice(
                  this.selectedEmoji[e.emoji.id].clickedBy.indexOf(this.hashEmail),
                  1
                ),
                0 === this.selectedEmoji[e.emoji.id].clickedBy.length &&
                  delete this.selectedEmoji[e.emoji.id])
              : (this.selectedEmoji[e.emoji.id].clickedBy.push(this.hashEmail),
                (i = {
                  n: this.appService.globals.user.nick || this.appService.globals.user.name,
                  emoji: e.emoji.native,
                  remove: !1
                }))
            : ((this.selectedEmoji[e.emoji.id] = {
                emoji: e.emoji.native,
                clickedBy: [this.hashEmail]
              }),
              (i = {
                n: this.appService.globals.user.nick || this.appService.globals.user.name,
                emoji: e.emoji.native,
                remove: !1
              })))
        : ((this.selectedEmoji[e.emoji.id] = {
            emoji: e.emoji.native,
            clickedBy: [this.hashEmail]
          }),
          (i = {
            n: this.appService.globals.user.nick || this.appService.globals.user.name,
            emoji: e.emoji.native,
            remove: !1
          })),
        this.appService.manageChatReactions(
          this.isQAMsg ? this.qaMsgID : this.msg._id,
          this.selectedEmoji,
          i,
          this.logType,
          this.msgIndex
        ),
        (this.selectedEmoji = {}),
        setTimeout(() => {
          this.showEmojiChooser = !1;
        }, 500));
    }
    checkMsgReactions(e) {
      return !!e.hasOwnProperty('r') && Object.keys(e.r).length > 0;
    }
    onPopoverOpen() {
      ((this.showEmojiChooser = !0),
        console.log('onPopoverOpen this.showEmojiChooser: ', this.showEmojiChooser));
    }
    onPopoverClose() {
      (setTimeout(() => {
        this.showEmojiChooser = !1;
      }, 500),
        console.log('onPopoverClose this.showEmojiChooser: ', this.showEmojiChooser));
    }
    copyMessage() {
      ((this.msg.txt = sf(this.msg.txt).result),
        console.log('copyMessage: ', this.msg.txt),
        navigator.clipboard.writeText(this.msg.txt),
        this.alertsService.info('Copied to clipboard.'));
    }
    kickUser() {
      var e = this;
      return I(function* (i = !1) {
        let o = e.appService.getPreference('kickMsg');
        o || (o = 'You have been kicked from the room by an administrator');
        const s = yield e.appService.invokeServerCommand('userInfoDB', {
          uid: e.msg.uid,
          rid: e.msg.rid
        });
        let r = s.user;
        (s.userXref &&
          ((r = s.userXref), (r.nick = s.userXref.userName), (r.userXrefID = s.userXref._id)),
          r
            ? bootbox.prompt({
                value: o,
                title: 'Enter the kick message for this user',
                inputType: 'textarea',
                callback: (a) => {
                  a &&
                    ((o = a),
                    e.appService.sendServerAdminCommand('kickUser', {
                      user: r,
                      msg: o,
                      ban: i,
                      kickAllInstances: !1
                    }),
                    e.appService.setPreference('kickMsg', o),
                    bootbox.alert('User kicked OK'));
                }
              })
            : bootbox.alert('Could not retrieve user info.'));
      }).apply(this, arguments);
    }
    muteChat(e) {
      var i = this;
      return I(function* () {
        const o = yield i.appService.invokeServerCommand('userInfoDB', {
          uid: i.msg.uid,
          rid: i.msg.rid
        });
        let s = o.user;
        (o.userXref &&
          ((s = o.userXref), (s.nick = o.userXref.userName), (s.userXrefID = o.userXref._id)),
          s
            ? bootbox.confirm({
                message: 'Are you sure you want to mute this user for 24 hours?',
                callback: (r) => {
                  r &&
                    (i.appService.sendServerAdminCommand('muteChat', { user: s, time: e }),
                    bootbox.alert('User chat muted.'));
                }
              })
            : bootbox.alert('Could not retrieve user info.'));
      })();
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(fo));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-st-message']],
        viewQuery: function (i, o) {
          if ((1 & i && Xt(cge, 5), 2 & i)) {
            let s;
            yt((s = Ft())) && (o.popover = s.first);
          }
        },
        inputs: {
          msg: 'msg',
          isP: 'isP',
          logType: 'logType',
          prevD: 'prevD',
          isQAMsg: 'isQAMsg',
          msgIndex: 'msgIndex',
          qaMsgID: 'qaMsgID',
          extraChatMsg: 'extraChatMsg',
          sessName: 'sessName'
        },
        decls: 5,
        vars: 2,
        consts: [
          ['emojiPanelDiv', ''],
          ['popover', 'ngbPopover'],
          [1, 'popoverClass'],
          [1, 'separator'],
          [1, 'msg-box', 'pb-1', 3, 'ngClass', 'ngStyle'],
          [3, 'emojiSelect'],
          [3, 'ngStyle'],
          ['clas', 'd-flex flex-column  align-items-center w-100 '],
          [1, 'mr-1', 'd-flex', 'flex-row-reverse'],
          [
            1,
            'd-flex',
            'flex-row-reverse',
            'justify-content-center',
            'align-items-start',
            'flex-nowrap',
            'mt-1'
          ],
          [
            'role',
            'button',
            'id',
            'dropdownMenuLink',
            'data-bs-toggle',
            'dropdown',
            'aria-haspopup',
            'true',
            'aria-expanded',
            'false',
            1,
            'msgMenu',
            'dropright',
            'pt-1',
            3,
            'ngStyle'
          ],
          ['aria-labelledby', 'dropdownMenuLink', 1, 'dropdown-menu', 'users-dropdown-options'],
          [1, 'dropdown-item', 3, 'click'],
          [1, 'fas', 'fa-user'],
          [1, 'fas', 'fa-reply'],
          [1, 'dropdown-item'],
          [
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#alert-send-report-modal',
            1,
            'dropdown-item'
          ],
          ['data-bs-toggle', 'modal', 'data-bs-target', '#replyModal', 1, 'dropdown-item'],
          [
            'container',
            'body',
            'autoClose',
            'outside',
            'popoverClass',
            'popOverDiv',
            1,
            'dropdown-item',
            3,
            'ngbPopover'
          ],
          [1, 'avatar', 'pl-1'],
          [1, 'w-100'],
          [1, 'd-flex', 'justify-content-between', 'align-items-center', 'w-100'],
          ['placement', 'top', 1, 'created-at', 'mx-2', 3, 'ngbTooltip', 'ngStyle'],
          [1, 'd-flex', 'align-items-center', 'justify-content-between', 'flex-nowrap'],
          [1, 'username', 'mx-1', 3, 'click', 'dblclick', 'ngStyle'],
          [
            1,
            'd-inline-block',
            'flex-shrink-1',
            2,
            'overflow',
            'hidden',
            3,
            'innerHTML',
            'ngStyle'
          ],
          [1, 'd-flex', 3, 'ngClass'],
          [1, 'ms-1', 'private-reply'],
          [
            1,
            'msg-left',
            'text-formated',
            'preText',
            'ml-2',
            'mr-2',
            'p-0',
            3,
            'ngStyle',
            'ngClass',
            'innerHTML'
          ],
          [1, 'ms-1', 3, 'ngClass', 'ngStyle'],
          [1, 'fas', 'fa-trash'],
          [1, 'dropdown-divider'],
          [1, 'fa', 'fa-comment-slash'],
          [1, 'fas', 'fa-envelope-open'],
          [
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#alert-send-report-modal',
            1,
            'dropdown-item',
            3,
            'click'
          ],
          [1, 'fas', 'fa-chart-pie'],
          [
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#replyModal',
            1,
            'dropdown-item',
            3,
            'click'
          ],
          [1, 'fas', 'fa-comment'],
          [1, 'fas', 'fa-check'],
          [
            'container',
            'body',
            'autoClose',
            'outside',
            'popoverClass',
            'popOverDiv',
            1,
            'dropdown-item',
            3,
            'click',
            'shown',
            'hidden',
            'ngbPopover'
          ],
          ['placement', 'left', 'ngbTooltip', 'Add Reaction', 1, 'far', 'fa-smile'],
          [1, 'fas', 'fa-edit'],
          [1, 'fas', 'fa-copy'],
          [1, 'fas', 'fa-comments'],
          [1, 'avatar', 'pl-1', 3, 'click'],
          ['alt', 'msg.avt', 3, 'src'],
          [
            1,
            'msg-left',
            'text-formated',
            'preText',
            'ml-2',
            'mr-2',
            'p-0',
            'pe-3',
            'w-100',
            3,
            'ngClass',
            'ngStyle'
          ],
          [1, 'private-reply-message', 'w-100', 3, 'ngClass'],
          [1, 'd-block', 'username', 3, 'ngStyle'],
          [3, 'ngStyle', 'ngClass', 'innerHTML'],
          [3, 'innerHTML'],
          [4, 'ngFor', 'ngForOf'],
          [
            'placement',
            'auto',
            'container',
            'body',
            'autoClose',
            'outside',
            'popoverClass',
            'popOverDiv',
            1,
            'badge',
            'chat-reaction',
            3,
            'ngbPopover'
          ],
          [1, 'badge', 'chat-reaction', 3, 'ngClass'],
          [1, 'badge', 'chat-reaction', 3, 'click', 'ngClass'],
          [
            'placement',
            'auto',
            'container',
            'body',
            'autoClose',
            'outside',
            'popoverClass',
            'popOverDiv',
            1,
            'badge',
            'chat-reaction',
            3,
            'click',
            'ngbPopover'
          ],
          [1, 'mr-1', 'd-flex', 'flex-row'],
          [1, 'd-flex', 'justify-content-center', 'align-items-start', 'flex-nowrap', 'mt-1'],
          [
            1,
            'd-flex',
            'align-items-center',
            'justify-content-between',
            'flex-nowrap',
            3,
            'ngStyle'
          ],
          [1, 'username', 'mx-1', 3, 'click', 'dblclick', 'ngClass', 'ngStyle'],
          [1, 'd-inline-block', 'flex-shrink-1', 2, 'overflow', 'hidden', 3, 'innerHTML'],
          [1, 'badge', 'bg-danger', 'trial-badge'],
          [1, 'badge', 'bg-warning', 'new-badge'],
          [1, 'stars-container', 3, 'ngStyle'],
          [1, 'ms-1', 'badge', 'text-bg-secondary'],
          [1, 'd-flex'],
          [1, 'fas', 'fa-star', 'stars-icon'],
          [1, 'stars-num'],
          [
            'title',
            'Ask a question',
            1,
            'btn',
            'btn-sm',
            'btn-secondary',
            'me-1',
            'alert-qa',
            3,
            'ngClass',
            'ngStyle'
          ],
          [1, 'created-at', 'mr-2', 3, 'ngStyle'],
          [
            'title',
            'Ask a question',
            1,
            'btn',
            'btn-sm',
            'btn-secondary',
            'me-1',
            'alert-qa',
            3,
            'click',
            'ngClass',
            'ngStyle'
          ],
          [1, 'me-1'],
          [1, 'fas', 'fa-question-circle'],
          [
            1,
            'msg-left',
            'text-formated',
            'preText',
            'ml-2',
            'mr-2',
            'p-0',
            'pe-3',
            'w-100',
            3,
            'ngStyle'
          ]
        ],
        template: function (i, o) {
          (1 & i &&
            H(0, gge, 1, 0, 'ng-template', 2, 0, Rn)(2, _ge, 4, 5, 'div', 3)(
              3,
              Bge,
              39,
              34,
              'div',
              4
            )(4, f_e, 41, 31),
            2 & i &&
              (m(2), O(2, o.isND ? 2 : -1), m(), O(3, o.msg.isA && 'alert' != o.logType ? 3 : 4)));
        },
        dependencies: [Di, Cr, Rl, tc, ha, el, os, Cd, Rr, ww, Tw],
        styles: [
          '@charset "UTF-8";.msg-box[_ngcontent-%COMP%]{font-weight:100;font-size:16px;word-wrap:normal;text-align:inherit;width:100%;background-color:var(--msgs-bg);border-top:1px solid var(--msg-border-color)}.msg-box-adm[_ngcontent-%COMP%]{background-color:var(--msgs-bg-adm);border-bottom:2px;padding-top:2px}.private-reply[_ngcontent-%COMP%]{font-size:12px}.private-reply-message[_ngcontent-%COMP%]{border-left:2px solid #00bc8c;margin-left:10px;margin-bottom:3px;padding:3px 3px 3px 5px}.private-reply-bg-light[_ngcontent-%COMP%]{background-color:#f4f4f4}.private-reply-bg-dark[_ngcontent-%COMP%]{background-color:#161515}@keyframes _ngcontent-%COMP%_slideInRight{0%,40%{transform:scale(0);transform-origin:bottom right}40%,to{transform:scale(1);transform-origin:bottom right}}.avatar[_ngcontent-%COMP%]{display:inline}.avatar[_ngcontent-%COMP%]   img[_ngcontent-%COMP%]{width:35px;height:35px;object-fit:cover}.username[_ngcontent-%COMP%]{cursor:pointer;font-size:14px;color:var(--username-color);font-weight:900}.msg-left[_ngcontent-%COMP%], .msg-right[_ngcontent-%COMP%]{color:var(--msg-color);word-break:break-word}.msg-right[_ngcontent-%COMP%]{text-align:right;margin-right:5px;padding-left:10px}.presenter-msg-right[_ngcontent-%COMP%]{text-align:right!important;margin-right:5px;padding-left:10px}.presenter-reactions-right[_ngcontent-%COMP%]{text-align:right!important;margin-right:50px;display:inline-block;width:100%}.alert-qa[_ngcontent-%COMP%]{font-size:10px;padding:1px 3px}.msg-left[_ngcontent-%COMP%]{text-align:left;margin-left:5px;padding-right:10px}.created-at[_ngcontent-%COMP%]{font-size:12px;color:var(--date-color);overflow:hidden;font-weight:600}.options-left[_ngcontent-%COMP%]{right:0}.options-right[_ngcontent-%COMP%]{left:0}.options[_ngcontent-%COMP%]{display:none;opacity:0;position:absolute;top:0}.options[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]{color:var(--dark-brown);border:1px solid var(--border-color);padding:2px 8px;min-width:30px;min-height:20px;cursor:pointer}.options[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:first-child{border-top-left-radius:5px;border-bottom-left-radius:5px}.options[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:last-child{border-top-right-radius:5px;border-bottom-right-radius:5px}.options[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:hover{color:var(--dark-black)}.options[_ngcontent-%COMP%]   i[_ngcontent-%COMP%]{font-size:16px}.bubble-box-left[_ngcontent-%COMP%]:hover   .options[_ngcontent-%COMP%], .bubble-box-right[_ngcontent-%COMP%]:hover   .options[_ngcontent-%COMP%]{display:block;z-index:1000;opacity:1}.smallChatLog[_ngcontent-%COMP%]{font-size:16px;font-weight:200}.smallChatLogBkg[_ngcontent-%COMP%]{background-color:var(--light-black)}.smallChatLog[_ngcontent-%COMP%]   img[_ngcontent-%COMP%]{max-width:16px;max-height:16px}.img-container[_ngcontent-%COMP%]{text-align:left;cursor:pointer;display:inline-flex;padding:3px}.uploaded-img[_ngcontent-%COMP%]{max-width:300px;max-height:300px}.msg-left[_ngcontent-%COMP%], .msg-right[_ngcontent-%COMP%]{float:inherit!important}.imgur-modal[_ngcontent-%COMP%]{text-align:center}.imgur-modal[_ngcontent-%COMP%]   .modal-dialog[_ngcontent-%COMP%]{max-width:90%;max-height:90%}.imgur-modal[_ngcontent-%COMP%]   img[_ngcontent-%COMP%]{width:inherit;height:inherit;max-width:100%;max-height:calc(100vh - 150px)}.preText[_ngcontent-%COMP%]{white-space:pre-wrap}.text-formated[_ngcontent-%COMP%]{font-size:13px}.chatNameAvatar[_ngcontent-%COMP%]{display:inline}.menuTrigger[_ngcontent-%COMP%]{margin-top:15px}.menuTriger[_ngcontent-%COMP%]:after{content:"\\2807";font-size:20px;color:var(--username-color);vertical-align:middle;border:none;padding-left:5px}.msgMenu[_ngcontent-%COMP%]{padding-left:5px;font-size:20px;font-weight:600;color:var(--username-color)!important}.msgMenu[_ngcontent-%COMP%]:hover{color:var(--light-brown)!important;font-weight:900;cursor:pointer}.chatDPMenu[_ngcontent-%COMP%]{font-size:12px;text-align:left}.chat-stars[_ngcontent-%COMP%]{font-size:8px;vertical-align:text-top!important}span.chat-stars[_ngcontent-%COMP%]{margin-top:2px;margin-left:2px;display:inline-block}span.chat-stars[_ngcontent-%COMP%]{color:var(--username-color)}.stars-container[_ngcontent-%COMP%]{position:relative}.stars-container[_ngcontent-%COMP%]   .stars-icon[_ngcontent-%COMP%]{color:var(--msg-color)}.stars-num[_ngcontent-%COMP%]{position:absolute;color:var(--msgs-bg);left:6px;top:5px;font-size:10px;font-weight:700}a[_ngcontent-%COMP%]{color:var(--light-black)}.separator[_ngcontent-%COMP%]{display:flex;align-items:center;text-align:center;background-color:var(--msgs-separator-bg)!important}.separator[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{color:var(--msgs-separator-color)!important;margin:0 auto;font-size:13px}.msg-box[_ngcontent-%COMP%]:hover   .chat-reaction-hover[_ngcontent-%COMP%]{display:inline-block}.chat-reaction-hover[_ngcontent-%COMP%]{display:none}'
        ]
      });
    }
  }
  return t;
})();
