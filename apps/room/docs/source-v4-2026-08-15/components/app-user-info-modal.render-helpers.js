const z2e = (t, n) => n.date,
  G2e = (t, n, e) => ({ 'background-color': t, color: n, 'font-size': e }),
  TB = (t) => ({ color: t });
function W2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li')(1, 'a', 19),
      T(2, 'i', 20),
      v(3, ' Setup Gravatar '),
      T(4, 'br'),
      u()(),
      d(5, 'li')(6, 'a', 21),
      x('click', function (o) {
        return (D(e), E(g(2).setupProfilePic(o)));
      }),
      T(7, 'i', 22),
      v(8, ' Or upload a picture'),
      u()());
  }
}
function q2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li')(1, 'button', 23),
      x('click', function () {
        return (D(e), E(g(2).clearProfilePic()));
      }),
      T(2, 'i', 24),
      v(3, ' Remove profile picture '),
      u()());
  }
}
function K2e(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 6)(1, 'span', 16),
      T(2, 'i', 17),
      u(),
      d(3, 'ul', 18),
      H(4, W2e, 9, 0)(5, q2e, 4, 0),
      u()()),
    2 & t)
  ) {
    const e = g();
    (m(4), O(4, e.appService.globals.preferences.profilePic ? 5 : 4));
  }
}
function Y2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 25),
      x('click', function () {
        D(e);
        const o = g();
        return E(o.editUsername(o.user));
      }),
      T(1, 'i', 26),
      u());
  }
}
function Q2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 25),
      x('click', function () {
        D(e);
        const o = g();
        return E(o.editUsernameByUser(o.user));
      }),
      T(1, 'i', 26),
      u());
  }
}
function X2e(t, n) {
  1 & t && (d(0, 'span', 9), v(1, 'Offline'), u());
}
function J2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 54),
      v(1, ' System '),
      u(),
      d(2, 'a', 55),
      v(3, ' Actions '),
      u(),
      d(4, 'a', 56),
      x('click', function () {
        return (D(e), E(g(2).manageAdminNotes()));
      }),
      v(5, ' Admin Notes '),
      u());
  }
}
function Z2e(t, n) {
  1 & t && (d(0, 'span', 9), v(1, 'Offline'), u());
}
function eTe(t, n) {
  1 & t && (d(0, 'span', 58), v(1, 'Trial'), u());
}
function tTe(t, n) {
  1 & t && (d(0, 'span', 59), v(1, 'New'), u());
}
function nTe(t, n) {
  if ((1 & t && (d(0, 'span', 60), T(1, 'i', 61), d(2, 'span', 62), v(3), u()()), 2 & t)) {
    const e = g(3);
    (m(3), Ze(e.user.data.years));
  }
}
function iTe(t, n) {
  if ((1 & t && (d(0, 'span'), v(1, 'IP: '), d(2, 'a', 36), v(3), u()()), 2 & t)) {
    const e = g(3);
    (m(2),
      ei('href', 'http://ip-api.com/#', e.user.privData.ip, '', Mt),
      m(),
      Ne('', e.user.privData.ip, ' (click to lookup)'));
  }
}
function oTe(t, n) {
  if (
    (1 & t &&
      (d(0, 'tr')(1, 'th', 34),
      v(2, 'Last Login:'),
      u(),
      d(3, 'td'),
      v(4),
      Xe(5, 'date'),
      H(6, Z2e, 2, 0, 'span', 9),
      u()(),
      d(7, 'tr')(8, 'th', 34),
      v(9, 'Email:'),
      u(),
      d(10, 'td')(11, 'a', 36),
      v(12),
      u()()(),
      d(13, 'tr')(14, 'th', 34),
      v(15, 'Badges:'),
      u(),
      d(16, 'td'),
      T(17, 'div', 57),
      Xe(18, 'noSanitize'),
      H(19, eTe, 2, 0, 'span', 58)(20, tTe, 2, 0, 'span', 59)(21, nTe, 4, 1, 'span', 60),
      u()(),
      d(22, 'tr')(23, 'th', 34),
      v(24, 'Location:'),
      u(),
      d(25, 'td'),
      v(26),
      H(27, iTe, 4, 3, 'span'),
      u()()),
    2 & t)
  ) {
    const e = g(2);
    (m(4),
      Ne(' ', e.user.loggedIn ? Ct(5, 11, e.user.loggedIn, 'short') : 'n/a', ' '),
      m(2),
      O(6, e.user.isOffline ? 6 : -1),
      m(5),
      ei('href', 'mailto:', e.user.privData.email, '', Mt),
      m(),
      Ze(e.user.privData.email || e.user.email),
      m(5),
      z('innerHTML', Ct(18, 14, e.badges, 'html'), wn),
      m(2),
      O(19, e.appService.globals.isPresenter && e.user.isFT ? 19 : -1),
      m(),
      O(
        20,
        e.appService.globals.sessData.isNewIndicatorOn &&
          e.appService.globals.isPresenter &&
          e.user.isNew
          ? 20
          : -1
      ),
      m(),
      O(
        21,
        e.appService.globals.sessData.disableStarYears || e.user.isP || !e.user.data.years ? -1 : 21
      ),
      m(5),
      Ne(' ', e.user.privData.locStr || 'n/a', ' \xa0\xa0 '),
      m(),
      O(27, e.user.privData.ip ? 27 : -1));
  }
}
function sTe(t, n) {
  1 & t && (d(0, 'span'), v(1, 'Regular User'), u());
}
function rTe(t, n) {
  1 & t && (d(0, 'span'), v(1, 'Presenter / Admin'), u());
}
function aTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 64)(1, 'form')(2, 'div', 65)(3, 'input', 66),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(3);
        return (He(s.user.hasMic, o) || (s.user.hasMic = o), E(o));
      }),
      u(),
      d(4, 'label', 67),
      T(5, 'i', 68),
      v(6, ' \xa0Microphone'),
      u()(),
      d(7, 'div', 65)(8, 'input', 69),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(3);
        return (He(s.user.hasScreen, o) || (s.user.hasScreen = o), E(o));
      }),
      u(),
      d(9, 'label', 70),
      T(10, 'i', 71),
      v(11, '\xa0Screenshare'),
      u()(),
      d(12, 'div', 65)(13, 'input', 72),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(3);
        return (He(s.user.hasCam, o) || (s.user.hasCam = o), E(o));
      }),
      u(),
      d(14, 'label', 73),
      T(15, 'i', 74),
      v(16, '\xa0WebCam'),
      u()(),
      d(17, 'div', 65)(18, 'input', 75),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(3);
        return (He(s.user.hasAdminChat, o) || (s.user.hasAdminChat = o), E(o));
      }),
      u(),
      d(19, 'label', 76),
      T(20, 'i', 77),
      v(21, '\xa0Admin Chat'),
      u()(),
      d(22, 'div', 65)(23, 'input', 78),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(3);
        return (He(s.user.canEditNotes, o) || (s.user.canEditNotes = o), E(o));
      }),
      u(),
      d(24, 'label', 79),
      T(25, 'i', 26),
      v(26, '\xa0Can Edit Notes'),
      u()()(),
      d(27, 'div')(28, 'button', 80),
      x('click', function () {
        return (D(e), E(g(3).saveCustomPerms()));
      }),
      T(29, 'i', 81),
      v(30, ' Save '),
      u(),
      d(31, 'div', 82)(32, 'input', 83),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(3);
        return (He(s.user.temporaryAccessOnly, o) || (s.user.temporaryAccessOnly = o), E(o));
      }),
      u(),
      d(33, 'label', 84),
      T(34, 'i', 85),
      v(35, '\xa0Temporary Access Only'),
      u()()()());
  }
  if (2 & t) {
    const e = g(3);
    (m(3),
      je('ngModel', e.user.hasMic),
      m(5),
      je('ngModel', e.user.hasScreen),
      m(5),
      je('ngModel', e.user.hasCam),
      m(5),
      je('ngModel', e.user.hasAdminChat),
      m(5),
      je('ngModel', e.user.canEditNotes),
      m(9),
      je('ngModel', e.user.temporaryAccessOnly));
  }
}
function lTe(t, n) {
  if (
    (1 & t &&
      (d(0, 'tr')(1, 'th', 34),
      v(2, 'Permissions:'),
      u(),
      d(3, 'td')(4, 'p', 63),
      H(5, sTe, 2, 0, 'span')(6, rTe, 2, 0, 'span'),
      u(),
      H(7, aTe, 36, 6, 'div', 64),
      u()()),
    2 & t)
  ) {
    const e = g(2);
    (m(5),
      O(5, 'r' == e.user.perms ? 5 : -1),
      m(),
      O(6, 'a' == e.user.perms ? 6 : -1),
      m(),
      O(7, e.appService.globals.isPresenter ? 7 : -1));
  }
}
function cTe(t, n) {
  if ((1 & t && (d(0, 'a', 36), v(1), u()), 2 & t)) {
    const e = g(2);
    (ei('href', 'http://ip-api.com/#', e.user.privData.ip, '', Mt),
      m(),
      Ne('', e.user.privData.ip, ' (click to lookup)'));
  }
}
function dTe(t, n) {
  if ((1 & t && (d(0, 'a', 36), v(1, '(test it)'), u()), 2 & t)) {
    const e = g(2);
    my('href', '', e.locHref, '&forcedStream=', e.user.data.streamServer, '', Mt);
  }
}
function uTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 39)(1, 'button', 40),
      x('click', function () {
        return (D(e), E(g(2).remotePresCommand('mutemic')));
      }),
      T(2, 'i', 86),
      v(3, ' Mute Audio '),
      u(),
      d(4, 'button', 40),
      x('click', function () {
        return (D(e), E(g(2).remotePresCommand('mutecam')));
      }),
      T(5, 'i', 87),
      v(6, ' Mute Camera '),
      u(),
      d(7, 'button', 40),
      x('click', function () {
        return (D(e), E(g(2).remotePresCommand('mutescreens')));
      }),
      T(8, 'i', 71),
      v(9, '\xa0'),
      T(10, 'i', 88),
      v(11, ' Stop Screens '),
      u(),
      d(12, 'button', 40),
      x('click', function () {
        return (D(e), E(g(2).remotePresCommand('restartScreen')));
      }),
      T(13, 'i', 71),
      v(14, '\xa0'),
      T(15, 'i', 41),
      v(16, ' Restart Screens '),
      u(),
      d(17, 'button', 40),
      x('click', function () {
        return (D(e), E(g(2).remotePresCommand('startRec')));
      }),
      T(18, 'i', 89),
      v(19, ' Start Rec '),
      u(),
      d(20, 'button', 40),
      x('click', function () {
        return (D(e), E(g(2).remotePresCommand('stopRec')));
      }),
      T(21, 'i', 88),
      v(22, ' Stop Rec '),
      u()());
  }
}
function hTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 90),
      x('click', function () {
        return (D(e), E(g(2).showPrivateMessages()));
      }),
      T(1, 'i', 91),
      v(2, ' Show private messages '),
      u());
  }
}
function pTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div')(1, 'p'),
      v(2, " To be able to manage user's notes, please enter the password. "),
      u(),
      d(3, 'button', 92),
      x('click', function () {
        return (D(e), E(g(2).manageAdminNotes()));
      }),
      v(4, ' Enter Password '),
      u()());
  }
}
function fTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 94)(1, 'span', 97),
      T(2, 'img', 98),
      v(3),
      Xe(4, 'date'),
      u(),
      d(5, 'button', 95),
      x('click', function () {
        const o = D(e),
          s = o.$implicit,
          r = o.$index;
        return E(g(3).deleteNode(s, r));
      }),
      T(6, 'i', 99),
      u()());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = g(3);
    (m(2),
      xn('alt', i.user.nick),
      z('src', e.pic || 'https://secure.gravatar.com/avatar/' + e.emailHash + '?d=mm&s=80', Mt),
      m(),
      gy(' [', Ct(4, 5, e.date, 'short'), '] ', e.name, ': ', e.note, ' '));
  }
}
function mTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 38)(1, 'div', 93),
      ht(2, fTe, 7, 8, 'div', 94, z2e),
      u()(),
      T(4, 'hr'),
      d(5, 'div', 38)(6, 'div', 39)(7, 'button', 95),
      x('click', function () {
        return (D(e), E(g(2).addNote()));
      }),
      T(8, 'i', 96),
      v(9, ' Add Note '),
      u()()());
  }
  if (2 & t) {
    const e = g(2);
    (m(2), pt(e.user.notes));
  }
}
function gTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 12)(1, 'nav')(2, 'div', 27)(3, 'a', 28),
      v(4, ' User Info '),
      u(),
      H(5, J2e, 6, 0),
      u()(),
      d(6, 'div', 29)(7, 'div', 30)(8, 'div', 31)(9, 'div', 32)(10, 'table', 33)(11, 'tbody')(
        12,
        'tr'
      )(13, 'th', 34),
      v(14, 'Name:'),
      u(),
      d(15, 'td'),
      v(16),
      u()(),
      H(17, oTe, 28, 17),
      d(18, 'tr')(19, 'th', 34),
      v(20, 'System:'),
      u(),
      d(21, 'td'),
      v(22),
      u()(),
      H(23, lTe, 8, 3, 'tr'),
      u()()()()(),
      d(24, 'div', 35)(25, 'div', 31)(26, 'div', 32)(27, 'table', 33)(28, 'tbody')(29, 'tr')(
        30,
        'th',
        34
      ),
      v(31, 'App Version:'),
      u(),
      d(32, 'td'),
      v(33),
      u()(),
      d(34, 'tr')(35, 'th', 34),
      v(36, 'IP:'),
      u(),
      d(37, 'td')(38, 'span'),
      v(39),
      u(),
      H(40, cTe, 2, 3, 'a', 36),
      u()(),
      d(41, 'tr')(42, 'th', 34),
      v(43, 'System:'),
      u(),
      d(44, 'td'),
      v(45),
      u()(),
      d(46, 'tr')(47, 'th', 34),
      v(48, 'Stream Server:'),
      u(),
      d(49, 'td'),
      v(50),
      H(51, dTe, 2, 3, 'a', 36),
      u()(),
      d(52, 'tr')(53, 'th', 34),
      v(54, 'Socket Server:'),
      u(),
      d(55, 'td'),
      v(56),
      u()(),
      d(57, 'tr')(58, 'th', 34),
      v(59, 'UserID:'),
      u(),
      d(60, 'td'),
      v(61),
      T(62, 'br'),
      v(63),
      u()()()()()()(),
      d(64, 'div', 37)(65, 'div', 38),
      H(66, uTe, 23, 0, 'div', 39),
      d(67, 'div', 39)(68, 'button', 40),
      x('click', function () {
        return (D(e), E(g().forceReload()));
      }),
      T(69, 'i', 41),
      v(70, ' Force Reload '),
      u(),
      d(71, 'button', 40),
      x('click', function () {
        return (D(e), E(g().remoteRestartAudio()));
      }),
      T(72, 'i', 42),
      v(73, ' Restart Audio '),
      u(),
      d(74, 'button', 40),
      x('click', function () {
        return (D(e), E(g().getDebugLog()));
      }),
      T(75, 'i', 43),
      v(76, ' Get Debug Log '),
      u(),
      d(77, 'button', 40),
      x('click', function () {
        return (D(e), E(g().kickUser(!1)));
      }),
      T(78, 'i', 44),
      v(79, ' Kick '),
      u(),
      d(80, 'button', 40),
      x('click', function () {
        return (D(e), E(g().kickUser(!0)));
      }),
      T(81, 'i', 44),
      v(82, ' Kick & Ban '),
      u(),
      d(83, 'button', 40),
      x('click', function () {
        return (D(e), E(g().kickDuplicates()));
      }),
      T(84, 'i', 44),
      v(85, ' Kick Duplicates '),
      u(),
      d(86, 'div', 45)(87, 'button', 46),
      v(88, ' Mute / Unmute Chat '),
      u(),
      d(89, 'div', 47)(90, 'button', 48),
      x('click', function () {
        return (D(e), E(g().muteChat('24')));
      }),
      v(91, ' Mute Chat for 24hrs '),
      u(),
      d(92, 'button', 48),
      x('click', function () {
        return (D(e), E(g().muteChat('0')));
      }),
      v(93, ' Mute Chat indefinately '),
      u(),
      d(94, 'button', 48),
      x('click', function () {
        return (D(e), E(g().muteChat('-1')));
      }),
      v(95, ' Unmute Chat '),
      u()()(),
      d(96, 'button', 49),
      T(97, 'i', 50),
      v(98, ' Disable Private Chat '),
      u(),
      d(99, 'button', 40),
      x('click', function (o) {
        return (D(e), E(g().adminUploadProfilePic(o)));
      }),
      T(100, 'i', 51),
      v(101, ' Upload Profile Picture '),
      u(),
      H(102, hTe, 3, 0, 'button', 52),
      u()()(),
      d(103, 'div', 53),
      H(104, pTe, 5, 0, 'div')(105, mTe, 10, 0),
      u()()());
  }
  if (2 & t) {
    const e = g();
    (m(5),
      O(5, e.user.hidePrivateInfo ? -1 : 5),
      m(11),
      Ze(e.user.nick),
      m(),
      O(17, e.user.hidePrivateInfo ? -1 : 17),
      m(5),
      Ze(e.user.privData.uaStr || 'n/a'),
      m(),
      O(23, e.user.hidePrivateInfo ? -1 : 23),
      m(10),
      Ze(e.user.data.cver || 'n/a'),
      m(6),
      Ze(e.user.privData.ip || 'n/a'),
      m(),
      O(40, e.user.privData.ip ? 40 : -1),
      m(5),
      Ze(e.user.privData.uaStr || 'n/a'),
      m(5),
      Ne(' ', e.user.data.streamServer || 'n/a', ' '),
      m(),
      O(51, e.user.data.streamServer ? 51 : -1),
      m(5),
      Ne(' Host ID: ', e.user.serverID || 'n/a', ' '),
      m(5),
      Ne(' UID: ', e.user.userXrefID || 'n/a', ' '),
      m(2),
      Ne('RID: ', e.user._id || 'n/a', ' '),
      m(3),
      O(66, 'a' == e.user.perms ? 66 : -1),
      m(36),
      O(102, e.appService.globals.sessData.enablePrivateMessageHistory ? 102 : -1),
      m(2),
      O(104, e.allowToManageNotes ? 105 : 104));
  }
}
function _Te(t, n) {
  1 & t && (d(0, 'span'), v(1, 'on'), u());
}
function bTe(t, n) {
  1 & t && (d(0, 'span'), v(1, 'off'), u());
}
function vTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 12)(1, 'div', 100)(2, 'div', 101)(3, 'div', 102),
      T(4, 'i', 85),
      d(5, 'span', 103),
      v(6, 'Edit chat text colors & size:'),
      u()(),
      d(7, 'div', 104)(8, 'input', 105),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.followChatStyle.color, o) || (s.followChatStyle.color = o), E(o));
      }),
      u(),
      d(9, 'label', 106),
      v(10, ' Text Color '),
      u()(),
      d(11, 'div', 104)(12, 'input', 107),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (
          He(s.followChatStyle.usernameColor, o) || (s.followChatStyle.usernameColor = o),
          E(o)
        );
      }),
      u(),
      d(13, 'label', 108),
      v(14, ' Username Color '),
      u()(),
      d(15, 'div', 104)(16, 'input', 109),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.followChatStyle.bgColor, o) || (s.followChatStyle.bgColor = o), E(o));
      }),
      u(),
      d(17, 'label', 110),
      v(18, ' Background Color '),
      u()(),
      d(19, 'div', 104)(20, 'input', 111),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.followChatStyle.tickerColor, o) || (s.followChatStyle.tickerColor = o), E(o));
      }),
      u(),
      d(21, 'label', 112),
      v(22, ' Ticker Color '),
      u()(),
      d(23, 'div', 104)(24, 'input', 113),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.followChatStyle.fontSize, o) || (s.followChatStyle.fontSize = o), E(o));
      }),
      u(),
      d(25, 'label', 114),
      v(26, ' Text Size '),
      u()(),
      d(27, 'div', 115)(28, 'input', 116),
      x('change', function () {
        return (D(e), E(g().followChatSoundOnChange()));
      }),
      u(),
      d(29, 'label', 117),
      v(30, ' Chat sound '),
      H(31, _Te, 2, 0, 'span')(32, bTe, 2, 0),
      u()()()(),
      d(33, 'div', 118)(34, 'div')(35, 'div', 119)(36, 'strong', 120),
      v(37, 'Username:'),
      u()(),
      v(38, ' This is the followed user message example with '),
      d(39, 'span', 121),
      v(40, '$TICKER'),
      u(),
      v(41, ' color! '),
      u(),
      d(42, 'button', 122),
      x('click', function () {
        return (D(e), E(g().testFollowChatSound()));
      }),
      T(43, 'span', 123),
      u()(),
      d(44, 'div', 124)(45, 'button', 125),
      x('click', function () {
        D(e);
        const o = g();
        return E(o.resetFollowChatStyle(o.user.emailHash));
      }),
      v(46, ' Reset '),
      u(),
      d(47, 'button', 126),
      x('click', function () {
        D(e);
        const o = g();
        return E(o.saveFollowChatStyle(o.user.emailHash));
      }),
      v(48, ' Save changes '),
      u()()());
  }
  if (2 & t) {
    const e = g();
    (m(8),
      je('ngModel', e.followChatStyle.color),
      m(4),
      je('ngModel', e.followChatStyle.usernameColor),
      m(4),
      je('ngModel', e.followChatStyle.bgColor),
      m(4),
      je('ngModel', e.followChatStyle.tickerColor),
      m(4),
      je('ngModel', e.followChatStyle.fontSize),
      m(4),
      z('checked', e.followChatStyle.playSound),
      m(3),
      O(31, e.followChatStyle.playSound ? 31 : 32),
      m(2),
      z(
        'ngStyle',
        $a(
          13,
          G2e,
          e.followChatStyle.bgColor,
          e.followChatStyle.color,
          e.followChatStyle.fontSize + 'px'
        )
      ),
      m(2),
      z('ngStyle', ct(17, TB, e.followChatStyle.usernameColor)),
      m(4),
      z('ngStyle', ct(19, TB, e.followChatStyle.tickerColor)),
      m(3),
      z('disabled', !e.followChatStyle.playSound)(
        'title',
        e.followChatStyle.playSound ? 'Chat sound is on.' : 'Chat sound is off.'
      ),
      m(),
      z('ngClass', e.followChatStyle.playSound ? 'fa-volume-up' : 'fa-volume-mute'));
  }
}
function yTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 126),
      x('click', function () {
        D(e);
        const o = g();
        return E(o.doUserMention(o.user.nick));
      }),
      v(1, ' @Mention '),
      u());
  }
}
function FTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 126),
      x('click', function () {
        return (D(e), E(g().startPrivateChat()));
      }),
      v(1, ' Private Chat '),
      u());
  }
}
function CTe(t, n) {
  1 & t && (d(0, 'span'), v(1, 'Follow'), u());
}
function STe(t, n) {
  1 & t && (d(0, 'span')(1, 'span', 129), v(2, 'Following'), u()());
}
function wTe(t, n) {
  1 & t && (d(0, 'span'), v(1, 'Mute'), u());
}
function TTe(t, n) {
  1 & t && (d(0, 'span'), T(1, 'i', 130), v(2, 'Muted'), u());
}
function DTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 127),
      x('click', function () {
        D(e);
        const o = g();
        return E(o.doFollowUser(o.user));
      }),
      H(1, CTe, 2, 0, 'span')(2, STe, 3, 0),
      u(),
      d(3, 'button', 128),
      x('click', function () {
        D(e);
        const o = g();
        return E(o.doMuteUser(o.user));
      }),
      H(4, wTe, 2, 0, 'span')(5, TTe, 3, 0),
      u());
  }
  if (2 & t) {
    const e = g();
    (m(), O(1, e.isFollowed ? 2 : 1), m(3), O(4, e.isMuted ? 5 : 4));
  }
}
