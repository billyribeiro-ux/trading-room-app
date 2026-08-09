const m_e = ['popover'],
  g_e = (t) => ({ 'flex-row-reverse': t }),
  __e = (t, n) => ({ 'w-100': t, 'flex-fill': n }),
  b_e = (t, n, e) => ({ mentionColor: t, questionColor: n, 'presenter-msg-right flex-fill': e }),
  v_e = (t) => ({ 'presenter-msg-right': t }),
  Ew = (t, n) => ({ mentionColor: t, questionColor: n }),
  y_e = (t) => ({ 'presenter-reactions-right': t }),
  r6 = (t) => ({ 'chat-reaction-added': t }),
  F_e = (t) => ({ 'btn-danger animated flash': t });
function C_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'emoji-mart', 5),
      x('emojiSelect', function (o) {
        return (D(e), E(g().selectEmoji(o)));
      }),
      u());
  }
}
function S_e(t, n) {
  if ((1 & t && (d(0, 'div', 3)(1, 'a', 6), v(2), Je(3, 'date'), u()()), 2 & t)) {
    const e = g();
    (m(), z('ngStyle', e.styleF), m(), Ze(Ct(3, 2, e.msg.t, 'fullDate')));
  }
}
function w_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 11),
      x('click', function () {
        return (D(e), E(g(3).muteChat('24')));
      }),
      T(1, 'i', 29),
      v(2, '\xa0\xa0Mute Chat for 24hrs'),
      u());
  }
}
function T_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 11),
      x('click', function (o) {
        D(e);
        const s = g(2);
        return E(s.doMsgDelete(s.msg, o));
      }),
      T(1, 'i', 27),
      v(2, '\xa0\xa0Delete Message'),
      u(),
      H(3, w_e, 3, 0, 'a', 14),
      T(4, 'div', 28));
  }
  if (2 & t) {
    const e = g(2);
    (m(3), O(3, e.msg.isA ? -1 : 3));
  }
}
function D_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 11),
      x('click', function (o) {
        D(e);
        const s = g(2);
        return E(s.usersDoMsgDelete(s.msg, o));
      }),
      T(1, 'i', 27),
      v(2, '\xa0\xa0Delete Message'),
      u(),
      T(3, 'div', 28));
  }
}
function E_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 11),
      x('click', function () {
        D(e);
        const o = g(2);
        return E(o.doShowMsgToAll(o.msg));
      }),
      T(1, 'i', 30),
      v(2, '\xa0\xa0Show message to all '),
      u());
  }
}
function k_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 31),
      x('click', function () {
        D(e);
        const o = g(2);
        return E(o.openAlertSendReport(o.msg._id));
      }),
      T(1, 'i', 32),
      v(2, '\xa0\xa0Show Send Report '),
      u());
  }
}
function x_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 33),
      x('click', function () {
        D(e);
        const o = g(2);
        return E(o.doPublicReply(o.msg));
      }),
      T(1, 'i', 34),
      v(2, '\xa0\xa0Reply '),
      u());
  }
}
function M_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 11),
      x('click', function () {
        D(e);
        const o = g(2);
        return E(o.markAsAnswered(o.msg));
      }),
      T(1, 'i', 35),
      v(2, '\xa0\xa0Mark Answered '),
      u());
  }
}
function A_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 36, 1),
      x('click', function () {
        return (D(e), E(g(2).addReaction()));
      })('shown', function () {
        return (D(e), E(g(2).onPopoverOpen()));
      })('hidden', function () {
        return (D(e), E(g(2).onPopoverClose()));
      }),
      T(2, 'i', 37),
      v(3, '\xa0\xa0Add Reaction'),
      u());
  }
  2 & t && (g(2), z('ngbPopover', It(1)));
}
function P_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 11),
      x('click', function () {
        return (D(e), E(g(2).editMessage()));
      }),
      T(1, 'i', 38),
      v(2, '\xa0\xa0Edit'),
      u());
  }
}
function R_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 11),
      x('click', function () {
        return (D(e), E(g(2).copyMessage()));
      }),
      T(1, 'i', 39),
      v(2, '\xa0\xa0Copy'),
      u());
  }
}
function I_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 11),
      x('click', function () {
        D(e);
        const o = g(2);
        return E(o.startPC(o.msg.uid));
      }),
      T(1, 'i', 40),
      v(2, '\xa0\xa0Private Chat '),
      u());
  }
}
function O_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 41),
      x('click', function () {
        D(e);
        const o = g(2);
        return E(o.doUserInfo(o.msg.uid, o.msg.rid));
      }),
      T(1, 'img', 42),
      u());
  }
  if (2 & t) {
    const e = g(2);
    (m(),
      z('src', e.msg.pic || 'https://secure.gravatar.com/avatar/' + e.msg.avt + '?d=mm&s=50', Mt));
  }
}
function N_e(t, n) {
  (1 & t && (T(0, 'div', 22), Je(1, 'noSanitize')),
    2 & t && z('innerHTML', Ct(1, 1, g(2).badges, 'html'), wn));
}
function L_e(t, n) {
  1 & t && (d(0, 'div', 24), v(1, '\u2705'), u());
}
function B_e(t, n) {
  if ((1 & t && (T(0, 'div', 25), Je(1, 'parseSymbols'), Je(2, 'parseLinks')), 2 & t)) {
    const e = g(2);
    z('ngStyle', e.styleF)(
      'ngClass',
      $a(
        13,
        b_e,
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
function U_e(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 43)(1, 'div', 44)(2, 'strong', 45),
      v(3),
      u(),
      T(4, 'div', 46),
      Je(5, 'parseSymbols'),
      Je(6, 'parseLinks'),
      u(),
      T(7, 'div', 47),
      Je(8, 'parseSymbols'),
      Je(9, 'parseLinks'),
      u()),
    2 & t)
  ) {
    const e = g(2);
    (z('ngClass', ut(29, v_e, e.appService.globals.sessData.presenterMsgsOnTheRight))(
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
          Ew,
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
function j_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 51),
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
    (z('ngClass', ut(3, r6, e.value.clickedBy.includes(i.hashEmail))),
      m(),
      ns('', e.value.emoji, ' ', e.value.clickedBy.length, ' '));
  }
}
function V_e(t, n) {
  if ((1 & t && (d(0, 'span'), H(1, j_e, 2, 5, 'span', 50), u()), 2 & t)) {
    const e = n.$implicit;
    (m(), O(1, e.value.clickedBy.length > 0 ? 1 : -1));
  }
}
function H_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 52),
      x('click', function () {
        return (D(e), E(g(3).addReaction()));
      }),
      T(1, 'i', 37),
      u());
  }
  2 & t && (g(3), z('ngbPopover', It(1)));
}
function $_e(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 26),
      H(1, V_e, 2, 1, 'span', 48),
      Je(2, 'keyvalue'),
      H(3, H_e, 2, 1, 'span', 49),
      u()),
    2 & t)
  ) {
    const e = g(2);
    (z('ngClass', ut(6, y_e, e.appService.globals.sessData.presenterMsgsOnTheRight))(
      'ngStyle',
      e.styleF
    ),
      m(),
      z('ngForOf', yr(2, 4, e.msg.r)),
      m(2),
      O(3, 'chat' === e.logType || ('alerts' === e.logType && e.isQAMsg) ? 3 : -1));
  }
}
function z_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 4)(1, 'div', 7)(2, 'div', 8)(3, 'a', 9),
      v(4, '\u2807 '),
      u(),
      d(5, 'div', 10),
      H(6, T_e, 5, 1)(7, D_e, 4, 0),
      d(8, 'a', 11),
      x('click', function () {
        D(e);
        const o = g();
        return E(o.doUserInfo(o.msg.uid, o.msg.rid));
      }),
      T(9, 'i', 12),
      v(10, '\xa0\xa0User Info'),
      u(),
      d(11, 'a', 11),
      x('click', function () {
        D(e);
        const o = g();
        return E(o.doMention(o.msg.n));
      }),
      T(12, 'i', 13),
      v(13, '\xa0\xa0Mention'),
      u(),
      H(14, E_e, 3, 0, 'a', 14)(15, k_e, 3, 0, 'a', 15)(16, x_e, 3, 0, 'a', 16)(
        17,
        M_e,
        3,
        0,
        'a',
        14
      )(18, A_e, 4, 1, 'a', 17)(19, P_e, 3, 0, 'a', 14)(20, R_e, 3, 0, 'a', 14)(
        21,
        I_e,
        3,
        0,
        'a',
        14
      ),
      u(),
      H(22, O_e, 2, 1, 'div', 18),
      d(23, 'span', 19)(24, 'strong', 20),
      x('click', function () {
        D(e);
        const o = g();
        return E(o.doMention(o.msg.n));
      })('dblclick', function () {
        D(e);
        const o = g();
        return E(o.doUserInfo(o.msg.uid, o.msg.rid));
      }),
      v(25),
      u()(),
      d(26, 'span', 21),
      Je(27, 'date'),
      v(28),
      Je(29, 'date'),
      u(),
      H(30, N_e, 2, 4, 'div', 22),
      d(31, 'div', 23),
      H(32, L_e, 2, 0, 'div', 24)(33, B_e, 3, 17, 'div', 25)(34, U_e, 10, 34),
      u()(),
      H(35, $_e, 4, 8, 'div', 26),
      u()());
  }
  if (2 & t) {
    const e = g();
    (z('ngStyle', e.styleB),
      m(2),
      z('ngClass', ut(30, g_e, e.appService.globals.sessData.presenterMsgsOnTheRight)),
      m(),
      z('ngStyle', e.invertTxtColorToggler(e.invertTxtColor, 'name')),
      m(3),
      O(6, e.isP ? 6 : -1),
      m(),
      O(7, !e.isP && e.canDeleteOwnMsg ? 7 : -1),
      m(7),
      O(14, e.appService.globals.isPresenter && !e.appService.globals.isLimitedPresenter ? 14 : -1),
      m(),
      O(15, e.isP && 'alerts' === e.logType ? 15 : -1),
      m(),
      O(16, e.canDoPublicReply ? 16 : -1),
      m(),
      O(17, e.isP && 'chat' === e.logType ? 17 : -1),
      m(),
      O(
        18,
        (e.appService.globals.sessData.enableReactions && 'chat' === e.logType) ||
          (e.appService.globals.sessData.enableQAReactions && 'alerts' === e.logType && e.isQAMsg)
          ? 18
          : -1
      ),
      m(),
      O(19, e.canEditMessage ? 19 : -1),
      m(),
      O(20, 'alerts' === e.logType ? 20 : -1),
      m(),
      O(21, e.canPM ? 21 : -1),
      m(),
      O(22, e.hideAvatar ? -1 : 22),
      m(2),
      z('ngStyle', e.invertTxtColorToggler(e.invertTxtColor, 'name')),
      m(),
      Ne(' ', e.msg.n, ' '),
      m(),
      xn('ngbTooltip', Ct(27, 24, e.msg.t, 'short')),
      z('ngStyle', e.invertTxtColorToggler(e.invertTxtColor, 'date')),
      m(2),
      Ne(' [', Ct(29, 27, e.msg.t, 'h:mm a'), '] '),
      m(2),
      O(30, e.badges ? 30 : -1),
      m(),
      z(
        'ngClass',
        Kn(
          32,
          __e,
          e.msg.repl && !e.appService.globals.sessData.presenterMsgsOnTheRight,
          e.appService.globals.sessData.presenterMsgsOnTheRight
        )
      ),
      m(),
      O(32, e.msg.ans && 'alerts' != e.logType ? 32 : -1),
      m(),
      O(33, e.msg.repl ? 34 : 33),
      m(2),
      O(
        35,
        ((e.appService.globals.sessData.enableReactions && 'chat' === e.logType) ||
          (e.appService.globals.sessData.enableQAReactions &&
            'alerts' === e.logType &&
            e.isQAMsg)) &&
          e.checkMsgReactions(e.msg)
          ? 35
          : -1
      ));
  }
}
function G_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 11),
      x('click', function () {
        return (D(e), E(g(3).muteChat('24')));
      }),
      T(1, 'i', 29),
      v(2, '\xa0\xa0Mute Chat for 24hrs'),
      u());
  }
}
function W_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 11),
      x('click', function (o) {
        D(e);
        const s = g(2);
        return E(s.doMsgDelete(s.msg, o));
      }),
      T(1, 'i', 27),
      v(2, '\xa0\xa0Delete Message'),
      u(),
      H(3, G_e, 3, 0, 'a', 14),
      T(4, 'div', 28));
  }
  if (2 & t) {
    const e = g(2);
    (m(3), O(3, e.msg.isA ? -1 : 3));
  }
}
function q_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 11),
      x('click', function (o) {
        D(e);
        const s = g(2);
        return E(s.usersDoMsgDelete(s.msg, o));
      }),
      T(1, 'i', 27),
      v(2, '\xa0\xa0Delete Message'),
      u(),
      T(3, 'div', 28));
  }
}
function K_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 11),
      x('click', function () {
        D(e);
        const o = g(2);
        return E(o.doShowMsgToAll(o.msg));
      }),
      T(1, 'i', 30),
      v(2, '\xa0\xa0Show message to all '),
      u());
  }
}
function Y_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 31),
      x('click', function () {
        D(e);
        const o = g(2);
        return E(o.openAlertSendReport(o.msg._id));
      }),
      T(1, 'i', 32),
      v(2, '\xa0\xa0Show Send Report '),
      u());
  }
}
function Q_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 33),
      x('click', function () {
        D(e);
        const o = g(2);
        return E(o.doPublicReply(o.msg));
      }),
      T(1, 'i', 34),
      v(2, '\xa0\xa0Reply '),
      u());
  }
}
function X_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 11),
      x('click', function () {
        D(e);
        const o = g(2);
        return E(o.markAsAnswered(o.msg));
      }),
      T(1, 'i', 35),
      v(2, '\xa0\xa0Mark Answered '),
      u());
  }
}
function J_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 36, 1),
      x('click', function () {
        return (D(e), E(g(2).addReaction()));
      })('shown', function () {
        return (D(e), E(g(2).onPopoverOpen()));
      })('hidden', function () {
        return (D(e), E(g(2).onPopoverClose()));
      }),
      T(2, 'i', 37),
      v(3, '\xa0\xa0Add Reaction'),
      u());
  }
  2 & t && (g(2), z('ngbPopover', It(1)));
}
function Z_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 11),
      x('click', function () {
        return (D(e), E(g(2).editMessage()));
      }),
      T(1, 'i', 38),
      v(2, '\xa0\xa0Edit'),
      u());
  }
}
function e1e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 11),
      x('click', function () {
        return (D(e), E(g(2).copyMessage()));
      }),
      T(1, 'i', 39),
      v(2, '\xa0\xa0Copy'),
      u());
  }
}
function t1e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 11),
      x('click', function () {
        D(e);
        const o = g(2);
        return E(o.startPC(o.msg.uid));
      }),
      T(1, 'i', 40),
      v(2, '\xa0\xa0Private Chat '),
      u());
  }
}
function n1e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 66),
      x('click', function () {
        D(e);
        const o = g(2);
        return E(o.doUserInfo(o.msg.uid, o.msg.rid));
      }),
      T(1, 'img', 42),
      u());
  }
  if (2 & t) {
    const e = g(2);
    (m(),
      z('src', e.msg.pic || 'https://secure.gravatar.com/avatar/' + e.msg.avt + '?d=mm&s=50', Mt));
  }
}
function i1e(t, n) {
  if ((1 & t && (d(0, 'span', 70), v(1), u()), 2 & t)) {
    const e = g(4);
    (m(), Ne('(', e.msg.qa.length, ')'));
  }
}
function o1e(t, n) {
  1 & t && (d(0, 'span'), v(1, ' \u2705'), u());
}
function s1e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 69),
      x('click', function () {
        D(e);
        const o = g(3);
        return E(o.openAlertQAModal(o.msg));
      }),
      H(1, i1e, 2, 1, 'span', 70),
      T(2, 'i', 71),
      H(3, o1e, 2, 0, 'span'),
      u());
  }
  if (2 & t) {
    const e = g(3);
    (z('ngClass', ut(4, F_e, (null == e.msg ? null : e.msg.unreadQA) || !1))('ngStyle', e.styleF),
      m(),
      O(1, e.msg.qa && e.msg.qa.length > 0 ? 1 : -1),
      m(2),
      O(3, e.msg.ans && 'alerts' === e.logType ? 3 : -1));
  }
}
function r1e(t, n) {
  if (
    (1 & t &&
      (d(0, 'span')(1, 'span', 67), v(2), Je(3, 'date'), u(), H(4, s1e, 4, 6, 'button', 68), u()),
    2 & t)
  ) {
    const e = g(2);
    (m(),
      z('ngStyle', e.invertTxtColorToggler(e.invertTxtColor, 'date')),
      m(),
      Ze(Ct(3, 3, e.msg.t, 'short')),
      m(2),
      O(4, !e.isQAMsg && e.appService.globals.sessData.hasQAOnAlerts ? 4 : -1));
  }
}
function a1e(t, n) {
  if ((1 & t && (d(0, 'span', 72), Je(1, 'date'), v(2), Je(3, 'date'), u()), 2 & t)) {
    const e = g(2);
    (xn('ngbTooltip', Ct(1, 3, e.msg.t, 'short')),
      z('ngStyle', e.invertTxtColorToggler(e.invertTxtColor, 'date')),
      m(2),
      Ne('[', Ct(3, 6, e.msg.t, 'h:mm a'), ']'));
  }
}
function l1e(t, n) {
  (1 & t && (T(0, 'div', 60), Je(1, 'noSanitize')),
    2 & t && z('innerHTML', Ct(1, 1, g(2).badges, 'html'), wn));
}
function c1e(t, n) {
  1 & t && (d(0, 'span', 61), v(1, 'Trial'), u());
}
function d1e(t, n) {
  1 & t && (d(0, 'span', 62), v(1, 'New'), u());
}
function u1e(t, n) {
  if ((1 & t && (d(0, 'span', 63), T(1, 'i', 73), d(2, 'span', 74), v(3), u()()), 2 & t)) {
    const e = g(2);
    (z('ngStyle', e.invertTxtColorToggler(e.invertTxtColor, 'date')), m(3), Ze(e.msg.d.years));
  }
}
function h1e(t, n) {
  1 & t && (d(0, 'div', 24), v(1, '\u2705'), u());
}
function p1e(t, n) {
  if (
    (1 & t && (d(0, 'div'), T(1, 'div', 75), Je(2, 'parseSymbols'), Je(3, 'parseLinks'), u()),
    2 & t)
  ) {
    const e = g(2);
    (m(),
      z('ngStyle', e.styleF)(
        'ngClass',
        Kn(
          13,
          Ew,
          e.msg.isMention && !e.hasCustomFollowedUserColors,
          e.msg.txt.includes('?') && !e.hasCustomFollowedUserColors
        )
      )(
        'innerHTML',
        Tn(
          3,
          8,
          Tn(
            2,
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
      ));
  }
}
function f1e(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 76)(1, 'div', 44)(2, 'strong', 45),
      v(3),
      u(),
      T(4, 'div', 46),
      Je(5, 'parseSymbols'),
      Je(6, 'parseLinks'),
      u(),
      T(7, 'div', 47),
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
          Ew,
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
function m1e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span')(1, 'span', 51),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(3).addRemoveReaction(o.key));
      }),
      v(2),
      u()());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = g(3);
    (m(),
      z('ngClass', ut(3, r6, e.value.clickedBy.includes(i.hashEmail))),
      m(),
      ns('', e.value.emoji, ' ', e.value.clickedBy.length, ' '));
  }
}
function g1e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 52),
      x('click', function () {
        return (D(e), E(g(3).addReaction()));
      }),
      T(1, 'i', 37),
      u());
  }
  2 & t && (g(3), z('ngbPopover', It(1)));
}
function _1e(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 65),
      H(1, m1e, 3, 5, 'span', 48),
      Je(2, 'keyvalue'),
      H(3, g1e, 2, 1, 'span', 49),
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
function b1e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 53)(1, 'div', 54)(2, 'div', 55)(3, 'a', 56),
      v(4, '\u2807 '),
      u(),
      d(5, 'div', 10),
      H(6, W_e, 5, 1)(7, q_e, 4, 0),
      d(8, 'a', 11),
      x('click', function () {
        D(e);
        const o = g();
        return E(o.doUserInfo(o.msg.uid, o.msg.rid));
      }),
      T(9, 'i', 12),
      v(10, '\xa0\xa0User Info'),
      u(),
      d(11, 'a', 11),
      x('click', function () {
        D(e);
        const o = g();
        return E(o.doMention(o.msg.n));
      }),
      T(12, 'i', 13),
      v(13, '\xa0\xa0Mention'),
      u(),
      H(14, K_e, 3, 0, 'a', 14)(15, Y_e, 3, 0, 'a', 15)(16, Q_e, 3, 0, 'a', 16)(
        17,
        X_e,
        3,
        0,
        'a',
        14
      )(18, J_e, 4, 1, 'a', 17)(19, Z_e, 3, 0, 'a', 14)(20, e1e, 3, 0, 'a', 14)(
        21,
        t1e,
        3,
        0,
        'a',
        14
      ),
      u(),
      H(22, n1e, 2, 1, 'div', 57),
      d(23, 'span', 58)(24, 'strong', 59),
      x('click', function () {
        D(e);
        const o = g();
        return E(o.doMention(o.msg.n));
      })('dblclick', function () {
        D(e);
        const o = g();
        return E(o.doUserInfo(o.msg.uid, o.msg.rid));
      }),
      v(25),
      u()(),
      H(26, r1e, 5, 6, 'span')(27, a1e, 4, 9)(28, l1e, 2, 4, 'div', 60)(29, c1e, 2, 0, 'span', 61)(
        30,
        d1e,
        2,
        0,
        'span',
        62
      )(31, u1e, 4, 2, 'span', 63),
      d(32, 'div', 64),
      H(33, h1e, 2, 0, 'div', 24)(34, p1e, 4, 16, 'div')(35, f1e, 10, 31),
      u()(),
      H(36, _1e, 4, 5, 'div', 65),
      u()());
  }
  if (2 & t) {
    const e = g();
    (z('ngStyle', e.styleB),
      m(3),
      z('ngStyle', e.invertTxtColorToggler(e.invertTxtColor, 'name')),
      m(3),
      O(6, e.isP ? 6 : -1),
      m(),
      O(7, !e.isP && e.canDeleteOwnMsg ? 7 : -1),
      m(7),
      O(14, e.appService.globals.isPresenter && !e.appService.globals.isLimitedPresenter ? 14 : -1),
      m(),
      O(15, e.isP && 'alerts' === e.logType ? 15 : -1),
      m(),
      O(16, e.canDoPublicReply ? 16 : -1),
      m(),
      O(17, e.isP && 'chat' === e.logType ? 17 : -1),
      m(),
      O(
        18,
        (e.appService.globals.sessData.enableReactions && 'chat' === e.logType) ||
          (e.appService.globals.sessData.enableQAReactions && 'alerts' === e.logType && e.isQAMsg)
          ? 18
          : -1
      ),
      m(),
      O(19, e.canEditMessage ? 19 : -1),
      m(),
      O(20, 'alerts' === e.logType ? 20 : -1),
      m(),
      O(21, e.canPM ? 21 : -1),
      m(),
      O(22, e.hideAvatar ? -1 : 22),
      m(2),
      z('ngStyle', e.invertTxtColorToggler(e.invertTxtColor, 'name')),
      m(),
      Ne(' ', e.msg.n, ' '),
      m(),
      O(26, 'alerts' === e.logType ? 26 : 27),
      m(2),
      O(28, e.badges ? 28 : -1),
      m(),
      O(29, e.appService.globals.isPresenter && e.msg.isFT ? 29 : -1),
      m(),
      O(
        30,
        e.appService.globals.sessData.isNewIndicatorOn &&
          e.appService.globals.isPresenter &&
          e.msg.isNew
          ? 30
          : -1
      ),
      m(),
      O(
        31,
        !e.appService.globals.sessData.disableStarYears &&
          'chat' === e.logType &&
          !e.msg.isA &&
          e.msg.hasOwnProperty('d') &&
          e.appService.globals.preferences.chatBadges
          ? 31
          : -1
      ),
      m(2),
      O(33, e.msg.ans && 'alerts' != e.logType ? 33 : -1),
      m(),
      O(34, e.msg.repl ? 35 : 34),
      m(2),
      O(
        36,
        ((e.appService.globals.sessData.enableReactions && 'chat' === e.logType) ||
          (e.appService.globals.sessData.enableQAReactions &&
            'alerts' === e.logType &&
            e.isQAMsg)) &&
          e.checkMsgReactions(e.msg)
          ? 36
          : -1
      ));
  }
}
