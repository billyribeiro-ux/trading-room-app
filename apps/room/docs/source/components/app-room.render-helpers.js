const GAe = ['webcamContainer'],
  WAe = (t, n) => n.mediaValue.name,
  WB = (t, n) => n.value.appData.screenName,
  qAe = (t, n) => n.userID,
  KAe = (t, n) => ({ 'push-wrapper': t, 'mt-0': n }),
  qB = (t) => ({ 'btn-dark': t }),
  KB = (t) => ({ muted: t }),
  YAe = (t, n) => ({ 'breathing-rec': t, recIndicatorStart: n }),
  YB = (t) => ({ 'text-white': t }),
  O2 = (t, n) => ({ muted: t, 'text-white': n }),
  QB = (t) => ({ 'vh-100': t });
function QAe(t, n) {
  1 & t && eg(0, null, 1);
}
function XAe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 33),
      x('click', function () {
        return (D(e), E(g(3).getMyPinAndDoInfo()));
      }),
      v(1, ' Mobile App Info '),
      u());
  }
  if (2 & t) {
    const e = g(3);
    z('ngClass', ut(1, qB, 'darkTheme' == e.appService.globals.preferences.theme));
  }
}
function JAe(t, n) {
  if ((1 & t && (d(0, 'p'), H(1, XAe, 2, 3, 'button', 32), u()), 2 & t)) {
    const e = g(2);
    (m(),
      O(
        1,
        (!e.appService.globals.sessData.ptrMobileAppEnabled &&
          !e.appService.globals.sessData.customMobileAppEnabled) ||
          (e.appService.globals.user.isFT && !e.appService.globals.sessData.freeTrialsGetApp)
          ? -1
          : 1
      ));
  }
}
function ZAe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'p')(1, 'button', 34),
      x('click', function () {
        return (D(e), E(g(2).doTipToUser()));
      }),
      T(2, 'i', 35),
      d(3, 'span', 36),
      v(4),
      u()()());
  }
  if (2 & t) {
    const e = g(2);
    (m(),
      xn('title', e.appService.globals.sessData.tipMeBtnTxt),
      m(3),
      Ze(e.appService.globals.sessData.tipMeBtnTxt));
  }
}
function ePe(t, n) {
  1 & t && (d(0, 'p'), T(1, 'i', 37), v(2, ' Reconnecting Chat...'), u());
}
function tPe(t, n) {
  1 & t && (d(0, 'p'), T(1, 'i', 37), v(2, ' Reconnecting Media... '), u());
}
function nPe(t, n) {
  1 & t && (d(0, 'span'), v(1, 'Chat '), T(2, 'i', 11), u());
}
function iPe(t, n) {
  1 & t && (d(0, 'span'), v(1, 'Media '), T(2, 'i', 11), u());
}
function oPe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 19)(1, 'a', 38),
      x('click', function () {
        return (D(e), E(g(2).reopenAlertsChat()));
      }),
      T(2, 'i', 39),
      d(3, 'span', 22),
      v(4, 'Reopen Alerts / Chat'),
      u()()());
  }
}
function sPe(t, n) {
  (1 & t && T(0, 'img', 41),
    2 & t && z('src', g(3).appService.globals.sessData.altBenzingaLogoURL, Mt));
}
function rPe(t, n) {
  1 & t && (T(0, 'i', 42), d(1, 'span', 22), v(2, 'Benzinga News'), u());
}
function aPe(t, n) {
  if (
    (1 & t && (d(0, 'li', 25)(1, 'a', 40), H(2, sPe, 1, 1, 'img', 41)(3, rPe, 3, 0), u()()), 2 & t)
  ) {
    const e = g(2);
    (m(),
      Dt('href', e.benzingaUrl, Mt),
      m(),
      O(2, e.appService.globals.sessData.altBenzingaLogoURL ? 2 : 3));
  }
}
function lPe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 50),
      x('click', function () {
        return (D(e), E(g(3).launchRecordings()));
      }),
      T(1, 'i', 51),
      d(2, 'span', 22),
      v(3, 'Recording'),
      u()());
  }
}
function cPe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 52),
      x('click', function () {
        return (D(e), E(g(3).doChatLogsModal()));
      }),
      T(1, 'i', 53),
      d(2, 'span', 22),
      v(3, 'Chat Logs'),
      u()());
  }
}
function dPe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 50),
      x('click', function () {
        return (D(e), E(g(3).toggleSpeechRecoHistory()));
      }),
      T(1, 'i', 54),
      d(2, 'span', 22),
      v(3, 'Transcript History'),
      u()());
  }
}
function uPe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 26)(1, 'a', 43),
      T(2, 'i', 44),
      d(3, 'span', 22),
      v(4, 'Archives'),
      u()(),
      d(5, 'div', 45),
      H(6, lPe, 4, 0, 'a', 46),
      d(7, 'a', 47),
      x('click', function () {
        return (D(e), E(g(2).doAlertsLogsModal()));
      }),
      T(8, 'i', 48),
      d(9, 'span', 22),
      v(10, 'Alert Logs'),
      u()(),
      H(11, cPe, 4, 0, 'a', 49)(12, dPe, 4, 0, 'a', 46),
      u()());
  }
  if (2 & t) {
    const e = g(2);
    (m(6),
      O(6, e.appService.globals.isPresenter || !e.appService.globals.sessData.hideRecs ? 6 : -1),
      m(5),
      O(
        11,
        !e.appService.globals.sessData.hideChatLog || e.appService.globals.isPresenter ? 11 : -1
      ),
      m(),
      O(
        12,
        !e.appService.globals.sessData.hideChatLog || e.appService.globals.isPresenter ? 12 : -1
      ));
  }
}
function hPe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 25)(1, 'a', 55),
      x('click', function () {
        return (D(e), E(g(2).getRandomUser()));
      }),
      T(2, 'i', 56),
      d(3, 'span', 22),
      v(4, 'Get Random User'),
      u()()());
  }
}
function pPe(t, n) {
  if ((1 & t && (d(0, 'span', 59), v(1), u()), 2 & t)) {
    const e = g(3);
    (m(), Ne(' ', e.appService.globals.rosterCount + e.simUserCount, ' '));
  }
}
function fPe(t, n) {
  1 & t && T(0, 'i', 66);
}
function mPe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'input', 76),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(3);
        return (He(s.userSearchTermTxt, o) || (s.userSearchTermTxt = o), E(o));
      }),
      x('search', function () {
        return (D(e), E(g(3).searchUsers()));
      })('keyup', function (o) {
        return (D(e), E(g(3).doUserSearch(o)));
      }),
      u());
  }
  2 & t && je('ngModel', g(3).userSearchTermTxt);
}
function gPe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 31)(1, 'a', 57)(2, 'div', 58),
      T(3, 'i', 56),
      d(4, 'span', 22),
      v(5, 'Users: '),
      u(),
      H(6, pPe, 2, 1, 'span', 59),
      u(),
      d(7, 'div', 60)(8, 'div', 61)(9, 'button', 62),
      T(10, 'i', 63),
      u(),
      d(11, 'ul', 64)(12, 'li', 65),
      x('click', function () {
        return (D(e), E(g(2).sortFTUsers()));
      }),
      d(13, 'span'),
      v(14, 'Sort by Trials'),
      u(),
      H(15, fPe, 1, 0, 'i', 66),
      u()()(),
      d(16, 'button', 67),
      x('click', function () {
        return (D(e), E(g(2).reloadUsers()));
      }),
      T(17, 'i', 68),
      u(),
      d(18, 'button', 69),
      x('click', function () {
        return (D(e), E(g(2).sortUsers()));
      }),
      T(19, 'i', 70),
      u(),
      d(20, 'button', 71),
      x('click', function () {
        return (D(e), E(g(2).toggleUserSearch()));
      }),
      T(21, 'i', 72),
      u()()(),
      H(22, mPe, 1, 1, 'input', 73),
      d(23, 'div', 74, 3),
      T(25, 'app-room-roster', 75),
      u()());
  }
  if (2 & t) {
    g();
    const e = It(4),
      i = g();
    (m(6),
      O(
        6,
        i.appService.globals.sessData.rosterCountVisibleToViewers ||
          i.appService.globals.isPresenter
          ? 6
          : -1
      ),
      m(9),
      O(15, i.isSortFTUsers ? 15 : -1),
      m(3),
      z('ngClass', ut(6, qB, i.isSortUsers)),
      m(4),
      O(22, i.showUserSearch ? 22 : -1),
      m(3),
      z('roster', i.visibleRoster)('parent', e));
  }
}
function _Pe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 6)(1, 'div', 14)(2, 'nav', 15)(3, 'ul', 16, 2)(5, 'li', 17)(6, 'p'),
      v(7, ' Powered by:\xa0 '),
      d(8, 'a', 18),
      v(9, ' ProTradingRoom.com '),
      u()(),
      d(10, 'p'),
      v(11),
      u(),
      H(12, JAe, 2, 1, 'p')(13, ZAe, 5, 2, 'p'),
      T(14, 'hr'),
      H(15, ePe, 3, 0, 'p')(16, tPe, 3, 0, 'p'),
      d(17, 'p'),
      H(18, nPe, 3, 0, 'span')(19, iPe, 3, 0, 'span'),
      u()(),
      d(20, 'li', 19)(21, 'a', 20),
      T(22, 'i', 21),
      d(23, 'span', 22),
      v(24, 'Connectivity Check'),
      u()()(),
      H(25, oPe, 5, 0, 'li', 19),
      d(26, 'li', 19)(27, 'a', 23),
      T(28, 'i', 24),
      d(29, 'span', 22),
      v(30, 'General Settings'),
      u()()(),
      H(31, aPe, 4, 2, 'li', 25)(32, uPe, 13, 3, 'li', 26),
      d(33, 'li', 25)(34, 'a', 27),
      x('click', function () {
        return (D(e), E(g().manageMutedUsers()));
      }),
      T(35, 'i', 28),
      d(36, 'span', 22),
      v(37, 'Manage Muted Users'),
      u()()(),
      d(38, 'li', 25)(39, 'a', 29),
      x('click', function () {
        return (D(e), E(g().manageFollowedUsers()));
      }),
      T(40, 'i', 30),
      d(41, 'span', 22),
      v(42, 'Manage Followed Users'),
      u()()(),
      H(43, hPe, 5, 0, 'li', 25)(44, gPe, 26, 8, 'li', 31),
      u()()()());
  }
  if (2 & t) {
    const e = g();
    (m(11),
      Ne('Version: ', e.appService.globals.appVersion, ''),
      m(),
      O(12, e.appService.globals.sessData.hideAppInfo ? -1 : 12),
      m(),
      O(13, e.isTipEnabled ? 13 : -1),
      m(2),
      O(15, e.appService.globals.socketConnected ? -1 : 15),
      m(),
      O(16, e.mediaSoupService.connected ? -1 : 16),
      m(2),
      O(18, e.appService.globals.socketConnected ? 18 : -1),
      m(),
      O(19, e.mediaSoupService.connected ? 19 : -1),
      m(6),
      O(25, e.reopenAlertsChatBtn ? 25 : -1),
      m(6),
      O(31, e.appService.globals.sessData.hasBenzingaNews ? 31 : -1),
      m(),
      O(32, e.archivesAvailableTo() ? 32 : -1),
      m(11),
      O(43, e.appService.globals.isPresenter ? 43 : -1),
      m(),
      O(
        44,
        e.appService.globals.sessData.onlyPresentersVisibleToViewers ||
          e.appService.globals.sessData.rosterVisibleToViewers ||
          e.appService.globals.isPresenter ||
          e.appService.globals.user.hasAdminChat
          ? 44
          : -1
      ));
  }
}
function bPe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 133),
      x('click', function () {
        return (D(e), E(g(2).toggleSideBar()));
      }),
      T(1, 'i', 134),
      u());
  }
}
function vPe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 135),
      x('click', function () {
        return (D(e), E(g(2).toggleSideBar()));
      }),
      T(1, 'i', 136),
      u());
  }
}
function yPe(t, n) {
  if ((1 & t && (d(0, 'span', 80), v(1), u()), 2 & t)) {
    const e = g(2);
    (m(), Ne(' ', e.appService.globals.rosterCount + e.simUserCount, ' '));
  }
}
function FPe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 137),
      x('click', function () {
        return (D(e), E(g(2).getMyPinAndDoInfo()));
      }),
      u());
  }
}
function CPe(t, n) {
  1 & t && (d(0, 'a', 84), T(1, 'i', 138), u());
}
function SPe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 139),
      x('click', function () {
        return (D(e), E(g(2).doTipToUser()));
      }),
      d(1, 'a', 140),
      T(2, 'i', 35),
      d(3, 'span', 36),
      v(4),
      u()()());
  }
  if (2 & t) {
    const e = g(2);
    (xn('title', e.appService.globals.sessData.tipMeBtnTxt),
      m(4),
      Ze(e.appService.globals.sessData.tipMeBtnTxt));
  }
}
function wPe(t, n) {
  if ((1 & t && (d(0, 'li', 90)(1, 'a', 141), T(2, 'img', 142), u()()), 2 & t)) {
    const e = g(2);
    (m(),
      Dt('href', e.benzingaUrl, Mt),
      m(),
      z(
        'src',
        e.appService.globals.sessData.altBenzingaLogoURL || '/assets/images/benzinga-logo.png',
        Mt
      ));
  }
}
function TPe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 147),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(3).muteTalkingUserDialog(o));
      }),
      v(1),
      u());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = n.$index;
    (m(), ns(' ', i > 0 ? ',' : '', ' ', e.mediaValue.name, ' '));
  }
}
function DPe(t, n) {
  1 & t && T(0, 'img', 146);
}
function EPe(t, n) {
  1 & t && T(0, 'img', 148);
}
function kPe(t, n) {
  if (
    (1 & t &&
      (d(0, 'li', 91)(1, 'a', 143),
      T(2, 'i', 144),
      v(3, ' \xa0 '),
      d(4, 'span', 145),
      ht(5, TPe, 2, 2, 'span', null, WAe),
      u(),
      v(7, ' \xa0 '),
      H(8, DPe, 1, 0, 'img', 146)(9, EPe, 1, 0),
      u()()),
    2 & t)
  ) {
    const e = g(2);
    (m(5), pt(e.mediaService.talkingUsers), m(3), O(8, e.mediaService.presenterTalking ? 8 : 9));
  }
}
function xPe(t, n) {
  1 & t && (d(0, 'li', 91)(1, 'a'), v(2, ' ( No one is speaking )'), u()());
}
function MPe(t, n) {
  1 & t && (d(0, 'li', 92)(1, 'a'), v(2, '[ REC PAUSED]'), u()());
}
function APe(t, n) {
  if ((1 & t && (d(0, 'li', 93)(1, 'a', 149), v(2, '[ REC ]'), u()()), 2 & t)) {
    const e = g(2);
    (m(),
      xn(
        'ngbTooltip',
        (e.appService.globals.sessData.dontShowRecInfoToUsers &&
          !e.appService.globals.isPresenter) ||
          !e.appService.globals.roomState.recName
          ? ''
          : 'Recording to: ' + e.decodedRecName()
      ));
  }
}
function PPe(t, n) {
  1 & t && (d(0, 'li', 94)(1, 'a', 150), T(2, 'i', 151), v(3, ' REC '), u()());
}
function RPe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 154),
      T(1, 'span', 156),
      d(2, 'span'),
      v(3, 'You are not recording!'),
      u(),
      d(4, 'button', 157),
      x('click', function () {
        return (D(e), E(g(3).closeRecordingReminder()));
      }),
      u()());
  }
}
function IPe(t, n) {
  1 & t && (d(0, 'a', 158), T(1, 'i', 159), v(2, ' Start Recording '), u());
}
function OPe(t, n) {
  1 & t && (d(0, 'a', 158), T(1, 'i', 160), v(2, ' STOP Recording '), u());
}
function NPe(t, n) {
  1 & t && (d(0, 'a', 158), T(1, 'i', 161), v(2, ' PAUSE Recording '), u());
}
function LPe(t, n) {
  1 & t && (d(0, 'a', 158), T(1, 'i', 162), v(2, ' RESUME Recording '), u());
}
function BPe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 163),
      x('click', function () {
        return (D(e), E(g(5).hideRecPreview()));
      }),
      T(1, 'i', 164),
      v(2, ' Hide Rec Preview '),
      u());
  }
}
function UPe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 163),
      x('click', function () {
        return (D(e), E(g(5).showRecPreview()));
      }),
      T(1, 'i', 51),
      v(2, ' Show Rec Preview'),
      u());
  }
}
function jPe(t, n) {
  if (
    (1 & t &&
      (d(0, 'li'),
      T(1, 'hr', 115),
      u(),
      d(2, 'li', 19),
      H(3, BPe, 3, 0, 'a', 158)(4, UPe, 3, 0),
      u()),
    2 & t)
  ) {
    const e = g(4);
    (m(3), O(3, e.appService.globals.recPreviewOpen ? 3 : 4));
  }
}
function VPe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'ul', 155)(1, 'li', 147),
      x('click', function () {
        return (D(e), E(g(3).startRecording(null)));
      }),
      H(2, IPe, 3, 0, 'a', 158),
      u(),
      d(3, 'li', 147),
      x('click', function () {
        return (D(e), E(g(3).stopRecording(null)));
      }),
      H(4, OPe, 3, 0, 'a', 158),
      u(),
      d(5, 'li', 147),
      x('click', function () {
        return (D(e), E(g(3).pauseRecording()));
      }),
      H(6, NPe, 3, 0, 'a', 158),
      u(),
      d(7, 'li', 147),
      x('click', function () {
        return (D(e), E(g(3).resumeRecording()));
      }),
      H(8, LPe, 3, 0, 'a', 158),
      u(),
      H(9, jPe, 5, 1),
      u());
  }
  if (2 & t) {
    const e = g(3);
    (m(2),
      O(2, 2),
      m(2),
      O(4, 4),
      m(2),
      O(
        6,
        e.appService.globals.roomState.isRecording &&
          !e.appService.globals.roomState.isRecordingPaused
          ? 6
          : -1
      ),
      m(2),
      O(
        8,
        e.appService.globals.roomState.isRecordingPaused &&
          e.appService.globals.roomState.isRecording
          ? 8
          : -1
      ),
      m(),
      O(
        9,
        e.appService.globals.roomState.isRecording &&
          e.appService.globals.sessData.recPreviewLocation
          ? 9
          : -1
      ));
  }
}
function HPe(t, n) {
  1 & t && (d(0, 'li', 19), v(1, " Can't start recording without screenshare "), u());
}
function $Pe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 163),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(4).startRecording(o.value));
      }),
      T(1, 'i', 159),
      v(2),
      u());
  }
  if (2 & t) {
    const e = g().$implicit;
    (m(2), Ne(' Start Recording ', e.value.appData.screenName, ''));
  }
}
function zPe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 163),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(4).stopRecording(o.value));
      }),
      T(1, 'i', 160),
      v(2),
      u());
  }
  if (2 & t) {
    const e = g().$implicit;
    (m(2), Ne(' Stop Recording ', e.value.appData.screenName, ''));
  }
}
function GPe(t, n) {
  if ((1 & t && (d(0, 'li'), H(1, $Pe, 3, 1, 'a', 158)(2, zPe, 3, 1, 'a', 158), u()), 2 & t)) {
    const e = n.$implicit,
      i = g(4);
    (m(),
      O(1, i.appService.globals.roomState.isRecording ? -1 : 1),
      m(),
      O(2, e.value.isRec ? 2 : -1));
  }
}
function WPe(t, n) {
  if (
    (1 & t &&
      (d(0, 'ul', 155),
      H(1, HPe, 2, 0, 'li', 19),
      ht(2, GPe, 3, 2, 'li', null, WB),
      Je(4, 'keyvalue'),
      u()),
    2 & t)
  ) {
    const e = g(3);
    (m(),
      O(1, e.mediaService.useMTX || e.mediaService.isScreenSharing ? -1 : 1),
      m(),
      pt(yr(4, 1, e.mediaSoupService.screenProducers)));
  }
}
function qPe(t, n) {
  if (
    (1 & t &&
      (d(0, 'li', 95)(1, 'a', 152),
      T(2, 'i', 153),
      d(3, 'span', 108),
      v(4, 'Start/Stop Recording'),
      u()(),
      H(5, RPe, 5, 0, 'div', 154)(6, VPe, 10, 5, 'ul', 155)(7, WPe, 5, 3),
      u()),
    2 & t)
  ) {
    const e = g(2);
    (m(),
      z('ngClass', ut(4, KB, !e.mediaService.isScreenSharing)),
      m(),
      z(
        'ngClass',
        Kn(
          6,
          YAe,
          e.appService.globals.roomState.isRecording && e.appService.globals.sessData.blinkingRec,
          e.isRecordingStarting
        )
      ),
      m(3),
      O(
        5,
        !e.appService.globals.sessData.recordingReminder ||
          !e.recordingReminder ||
          e.micDisabled ||
          e.mediaService.micMuted ||
          (!e.appService.globals.roomState.isRecordingPaused &&
            e.appService.globals.roomState.isRecording)
          ? -1
          : 5
      ),
      m(),
      O(6, e.mediaService.useMTX || e.mediaService.mediaSoupService.recBotMethod ? 6 : 7));
  }
}
function KPe(t, n) {
  1 & t && T(0, 'img', 169);
}
function YPe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 96)(1, 'a', 165),
      T(2, 'i', 166),
      d(3, 'span', 167),
      T(4, 'span', 168),
      H(5, KPe, 1, 0, 'img', 169),
      u()(),
      d(6, 'ul', 170)(7, 'li', 171),
      x('click', function () {
        return (D(e), E(g(2).doSoundCloudEmbed()));
      }),
      T(8, 'i', 172),
      v(9, ' Play a track or playlist from SoundCloud '),
      u(),
      d(10, 'li', 171),
      x('click', function () {
        return (D(e), E(g(2).stopSoundCloudEmbed()));
      }),
      T(11, 'i', 173)(12, 'i', 174),
      v(13, ' Stop Playing For All '),
      u(),
      T(14, 'li', 175),
      d(15, 'li', 171),
      x('click', function () {
        return (D(e), E(g(2).doSoundCloudUserStop()));
      }),
      T(16, 'i', 173),
      v(17, ' Stop Playing For Me '),
      u()()());
  }
  if (2 & t) {
    const e = g(2);
    (m(), z('ngClass', ut(2, YB, e.scPlaying)), m(4), O(5, e.scPlaying ? 5 : -1));
  }
}
function QPe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 97)(1, 'a', 176),
      x('click', function () {
        return (D(e), E(g(2).doSoundCloudUserStop()));
      }),
      T(2, 'i', 166)(3, 'img', 169),
      u()());
  }
  if (2 & t) {
    const e = g(2);
    (m(), z('ngClass', ut(1, YB, e.scPlaying)));
  }
}
function XPe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 98)(1, 'a', 177),
      x('click', function () {
        return (D(e), E(g(2).toggleMic()));
      }),
      T(2, 'i', 178),
      d(3, 'span', 108),
      v(4, 'Unmute/Mute Microphone'),
      u()(),
      d(5, 'a', 179),
      x('click', function () {
        return (D(e), E(g(2).openAvDeviceSelection()));
      }),
      T(6, 'i', 180),
      u()());
  }
  if (2 & t) {
    const e = g(2);
    (m(), z('ngClass', Kn(1, O2, e.mediaService.micMuted, !e.mediaService.micMuted)));
  }
}
function JPe(t, n) {
  1 & t && (d(0, 'li', 19)(1, 'a', 150), T(2, 'i', 181), u()());
}
function ZPe(t, n) {
  if (1 & t) {
    const e = Y();
    (T(0, 'div', 115),
      d(1, 'li', 187),
      x('click', function () {
        return (D(e), E(g(3).openStreamingTab()));
      }),
      d(2, 'a', 158),
      v(3, ' OBS / RTMP / Stream / Restream '),
      d(4, 'span', 188),
      v(5, 'New'),
      u()()());
  }
}
function e4e(t, n) {
  if (1 & t) {
    const e = Y();
    (T(0, 'div', 115)(1, 'div', 115),
      d(2, 'li')(3, 'a', 163),
      x('click', function () {
        return (D(e), E(g(3).mediaService.stopSharingAll()));
      }),
      v(4, ' Stop Sharing All Screens'),
      u()());
  }
}
function t4e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li')(1, 'a', 163),
      x('click', function () {
        return (D(e), E(g(3).reopenPreviewWindow()));
      }),
      v(2, ' Reopen Screenshare Preview'),
      u()(),
      T(3, 'div', 115));
  }
}
function n4e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li')(1, 'a', 163),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(3).mediaService.stopSharingProducer(o.key));
      }),
      v(2),
      u()());
  }
  if (2 & t) {
    const e = n.$implicit;
    (m(2), Ne(' Stop Sharing ', e.value.appData.screenName, ''));
  }
}
function i4e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 99)(1, 'a', 182),
      T(2, 'i', 183),
      d(3, 'span', 108),
      v(4, 'Start/Stop Screen Sharing'),
      u()(),
      d(5, 'ul', 184)(6, 'li', 185),
      x('click', function () {
        return (D(e), E(g(2).mediaService.startScreenSharing(512e3)));
      }),
      d(7, 'a', 158),
      v(8, 'Share Screen '),
      u()(),
      T(9, 'div', 115),
      d(10, 'li', 186),
      x('click', function () {
        return (D(e), E(g(2).mediaService.startScreenSharing('camera')));
      }),
      d(11, 'a', 158),
      v(12, ' OBS / XSPLIT/ Share Virtual Cam'),
      u()(),
      H(13, ZPe, 6, 0)(14, e4e, 5, 0)(15, t4e, 4, 0),
      ht(16, n4e, 3, 1, 'li', null, WB),
      Je(18, 'keyvalue'),
      u()());
  }
  if (2 & t) {
    const e = g(2);
    (m(),
      z('ngClass', Kn(6, O2, !e.mediaService.isScreenSharing, e.mediaService.isScreenSharing)),
      m(12),
      O(13, e.appService.globals.sessData.useMediaMTX ? 13 : -1),
      m(),
      O(14, e.mediaService.isScreenSharing ? 14 : -1),
      m(),
      O(15, e.mediaService.isScreenSharing ? 15 : -1),
      m(),
      pt(yr(18, 4, e.mediaSoupService.screenProducers)));
  }
}
function o4e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 189),
      x('click', function () {
        return (D(e), E(g(2).toggleWebcam()));
      }),
      d(1, 'a', 190),
      T(2, 'i', 191),
      d(3, 'span', 108),
      v(4, 'Start / Stop WebCam'),
      u()()());
  }
  if (2 & t) {
    const e = g(2);
    (m(), z('ngClass', Kn(1, O2, e.mediaService.camMuted, !e.mediaService.camMuted)));
  }
}
function s4e(t, n) {
  1 & t && (d(0, 'li', 19)(1, 'a', 150), T(2, 'i', 181), u()());
}
function r4e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 192),
      x('click', function () {
        return (D(e), E(g(2).doSessionControl()));
      }),
      d(1, 'a', 193),
      T(2, 'i', 194),
      d(3, 'span', 108),
      v(4, 'Session Control'),
      u()()());
  }
}
function a4e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 195),
      x('click', function () {
        return (D(e), E(g(2).toggleTAWKSupport()));
      }),
      d(1, 'a', 193),
      T(2, 'i', 196),
      d(3, 'span', 108),
      v(4, 'TAWK Support'),
      u()()());
  }
}
function l4e(t, n) {
  1 & t && T(0, 'i', 105);
}
function c4e(t, n) {
  1 & t && T(0, 'i', 106);
}
function d4e(t, n) {
  1 & t && T(0, 'i', 107);
}
function u4e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 197),
      x('click', function () {
        return (D(e), E(g(2).mute()));
      }),
      v(1, ' Mute '),
      u());
  }
}
function h4e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 198),
      x('click', function () {
        return (D(e), E(g(2).unmute()));
      }),
      v(1, ' Unmute '),
      u());
  }
}
function p4e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 114),
      T(1, 'hr'),
      d(2, 'p', 199),
      v(3, ' Background Music: '),
      u(),
      d(4, 'input', 200),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.audioBgVolume, o) || (s.audioBgVolume = o), E(o));
      }),
      x('input', function (o) {
        return (D(e), E(g(2).setBkgMusicVol(o)));
      }),
      u()());
  }
  if (2 & t) {
    const e = g(2);
    (m(4), je('ngModel', e.audioBgVolume));
  }
}
function f4e(t, n) {
  1 & t && (d(0, 'span'), v(1, 'Mute'), u());
}
function m4e(t, n) {
  1 & t && (d(0, 'span'), v(1, 'Muted'), u());
}
function g4e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 203)(1, 'input', 204),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g().$implicit,
          r = g(3);
        return (
          He(r.appService.globals.preferences.audioVolumeFor[s.userID], o) ||
            (r.appService.globals.preferences.audioVolumeFor[s.userID] = o),
          E(o)
        );
      }),
      x('change', function (o) {
        D(e);
        const s = g().$implicit;
        return E(g(3).adjustVolPres(o, s));
      })('input', function (o) {
        D(e);
        const s = g().$implicit;
        return E(g(3).adjustVolPres(o, s));
      }),
      u()());
  }
  if (2 & t) {
    const e = g().$implicit,
      i = g(3);
    (m(), je('ngModel', i.appService.globals.preferences.audioVolumeFor[e.userID]));
  }
}
function _4e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 117)(1, 'input', 201),
      x('change', function () {
        const o = D(e).$implicit;
        return E(g(3).toggleTalkingPresenter(o));
      }),
      u(),
      d(2, 'label', 202),
      H(3, f4e, 2, 0, 'span'),
      v(4),
      H(5, m4e, 2, 0, 'span'),
      u()(),
      H(6, g4e, 2, 1, 'div', 203));
  }
  if (2 & t) {
    const e = n.$implicit,
      i = n.$index,
      o = g(3);
    (m(),
      ei('name', 'talkingPresenter', i, '-donot-disturb'),
      ei('id', 'talkingPresenter', i, '-donot-disturb'),
      z('checked', o.appService.globals.preferences.audioMutedFor[e.userID]),
      m(),
      ei('for', 'talkingPresenter', i, '-donot-disturb'),
      z('ngClass', ut(12, KB, o.appService.globals.preferences.audioMutedFor[e.userID])),
      m(),
      O(3, o.appService.globals.preferences.audioMutedFor[e.userID] ? -1 : 3),
      m(),
      Ne(' ', e.mediaValue.name, ' '),
      m(),
      O(5, o.appService.globals.preferences.audioMutedFor[e.userID] ? 5 : -1),
      m(),
      O(6, o.appService.globals.sessData.individualVolumeControls ? 6 : -1));
  }
}
function b4e(t, n) {
  (1 & t && (ht(0, _4e, 7, 14, null, null, qAe), T(2, 'hr')),
    2 & t && pt(g(2).mediaService.talkingUsers));
}
function v4e(t, n) {
  1 & t && (d(0, 'span'), v(1, 'on'), u());
}
function y4e(t, n) {
  1 & t && (d(0, 'span'), v(1, 'off'), u());
}
function F4e(t, n) {
  1 & t && (d(0, 'span'), v(1, 'on'), u());
}
function C4e(t, n) {
  1 & t && (d(0, 'span'), v(1, 'off'), u());
}
function S4e(t, n) {
  1 & t && (d(0, 'span'), v(1, 'on'), u());
}
function w4e(t, n) {
  1 & t && (d(0, 'span'), v(1, 'off'), u());
}
function T4e(t, n) {
  1 & t && (d(0, 'span'), v(1, 'on'), u());
}
function D4e(t, n) {
  1 & t && (d(0, 'span'), v(1, 'off'), u());
}
function E4e(t, n) {
  1 & t && (d(0, 'span'), v(1, 'on'), u());
}
function k4e(t, n) {
  1 & t && (d(0, 'span'), v(1, 'off'), u());
}
function x4e(t, n) {
  1 & t && (d(0, 'span'), v(1, "DON'T DISTURB"), u());
}
function M4e(t, n) {
  1 & t && (d(0, 'span'), v(1, "Don't Disturb"), u());
}
function A4e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'nav', 7),
      H(1, bPe, 2, 0, 'span', 77)(2, vPe, 2, 0, 'span', 78),
      d(3, 'span', 79),
      x('click', function () {
        return (D(e), E(g().toggleSideBarUsersCount()));
      })('dblclick', function () {
        D(e);
        const o = g();
        return E((o.hideCount = !o.hideCount));
      }),
      T(4, 'i', 56),
      H(5, yPe, 2, 1, 'span', 80),
      u(),
      H(6, FPe, 1, 0, 'span', 81),
      d(7, 'a', 82),
      T(8, 'img', 83),
      u(),
      H(9, CPe, 2, 0, 'a', 84),
      d(10, 'button', 85),
      T(11, 'span', 86),
      u(),
      d(12, 'div', 87)(13, 'ul', 88),
      H(14, SPe, 5, 2, 'li', 89)(15, wPe, 3, 2, 'li', 90)(16, kPe, 10, 1, 'li', 91)(
        17,
        xPe,
        3,
        0,
        'li',
        91
      )(18, MPe, 3, 0, 'li', 92)(19, APe, 3, 1, 'li', 93)(20, PPe, 4, 0, 'li', 94)(
        21,
        qPe,
        8,
        9,
        'li',
        95
      )(22, YPe, 18, 4, 'li', 96)(23, QPe, 4, 3, 'li', 97)(24, XPe, 7, 4, 'li', 98)(
        25,
        JPe,
        3,
        0,
        'li',
        19
      )(26, i4e, 19, 9, 'li', 99)(27, o4e, 5, 4, 'li', 100)(28, s4e, 3, 0, 'li', 19)(
        29,
        r4e,
        5,
        0,
        'li',
        101
      )(30, a4e, 5, 0, 'li', 102),
      d(31, 'li', 103)(32, 'a', 104),
      H(33, l4e, 1, 0, 'i', 105)(34, c4e, 1, 0, 'i', 106)(35, d4e, 1, 0, 'i', 107),
      d(36, 'span', 108),
      v(37, 'Volume'),
      u()(),
      d(38, 'div', 109)(39, 'h4'),
      v(40, ' Volume '),
      d(41, 'span', 110),
      T(42, 'i', 111),
      u()(),
      d(43, 'input', 112),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.audioVolume, o) || (s.audioVolume = o), E(o));
      }),
      x('change', function (o) {
        return (D(e), E(g().adjustVol(o)));
      })('input', function (o) {
        return (D(e), E(g().adjustVol(o)));
      }),
      u(),
      T(44, 'br'),
      H(45, u4e, 2, 0, 'button', 113)(46, h4e, 2, 0),
      T(47, 'hr'),
      H(48, p4e, 5, 1, 'div', 114),
      T(49, 'div', 115),
      d(50, 'div', 116),
      H(51, b4e, 3, 0, 'hr'),
      d(52, 'div', 117)(53, 'input', 118),
      x('change', function () {
        return (D(e), E(g().alertSoundOnChange()));
      }),
      u(),
      d(54, 'label', 119),
      v(55, ' Alert sound '),
      H(56, v4e, 2, 0, 'span')(57, y4e, 2, 0),
      u()(),
      d(58, 'div', 117)(59, 'input', 120),
      x('change', function () {
        return (D(e), E(g().qaSoundOnChange()));
      }),
      u(),
      d(60, 'label', 121),
      v(61, ' QA sound '),
      H(62, F4e, 2, 0, 'span')(63, C4e, 2, 0),
      u()(),
      d(64, 'div', 117)(65, 'input', 122),
      x('change', function () {
        return (D(e), E(g().nonTradeSoundOnChange()));
      }),
      u(),
      d(66, 'label', 123),
      v(67, ' NTA sound '),
      H(68, S4e, 2, 0, 'span')(69, w4e, 2, 0),
      u()(),
      d(70, 'div', 117)(71, 'input', 124),
      x('change', function () {
        return (D(e), E(g().chatSoundOnChange()));
      }),
      u(),
      d(72, 'label', 125),
      v(73, ' Chat sound '),
      H(74, T4e, 2, 0, 'span')(75, D4e, 2, 0),
      u()(),
      d(76, 'div', 117)(77, 'input', 126),
      x('change', function () {
        return (D(e), E(g().subtitlesOnChange()));
      }),
      u(),
      d(78, 'label', 127),
      T(79, 'i', 54),
      v(80, ' Subtitles '),
      H(81, E4e, 2, 0, 'span')(82, k4e, 2, 0),
      u()(),
      d(83, 'div', 117)(84, 'input', 128),
      x('change', function () {
        return (D(e), E(g().doNotDisturbOnChange()));
      }),
      u(),
      d(85, 'label', 129),
      H(86, x4e, 2, 0, 'span')(87, M4e, 2, 0),
      u()()()()(),
      d(88, 'li', 130)(89, 'a', 131),
      x('click', function () {
        return (D(e), E(g().doReload()));
      }),
      T(90, 'i', 132),
      d(91, 'span', 108),
      v(92, 'Reload'),
      u()()()()()());
  }
  if (2 & t) {
    const e = g();
    (m(),
      O(1, e.showSidebar && !e.alwaysShowRoster ? 1 : -1),
      m(),
      O(2, e.showSidebar || e.alwaysShowRoster ? -1 : 2),
      m(3),
      O(
        5,
        e.hideCount ||
          (!e.appService.globals.sessData.rosterCountVisibleToViewers &&
            !e.appService.globals.isPresenter)
          ? -1
          : 5
      ),
      m(),
      O(
        6,
        !(
          e.appService.globals.sessData.ptrMobileAppEnabled ||
          e.appService.globals.sessData.customMobileAppEnabled ||
          e.alwaysShowRoster
        ) ||
          (e.appService.globals.user.isFT && !e.appService.globals.sessData.freeTrialsGetApp)
          ? -1
          : 6
      ),
      m(2),
      z('src', e.appService.globals.logoURL, Mt),
      m(),
      O(9, e.hasSTHelpLink ? 9 : -1),
      m(5),
      O(14, e.isTipEnabled ? 14 : -1),
      m(),
      O(15, e.appService.globals.sessData.hasBenzingaNews ? 15 : -1),
      m(),
      O(16, e.mediaService.talkingUsers && e.mediaService.talkingUsers.length > 0 ? 16 : -1),
      m(),
      O(17, e.mediaService.talkingStr ? -1 : 17),
      m(),
      O(
        18,
        e.appService.globals.roomState.isRecordingPaused &&
          e.appService.globals.roomState.isRecording
          ? 18
          : -1
      ),
      m(),
      O(
        19,
        !e.appService.globals.roomState.isRecording ||
          e.appService.globals.roomState.isRecordingPaused ||
          e.isRecordingStarting
          ? -1
          : 19
      ),
      m(),
      O(20, e.isRecordingStarting ? 20 : -1),
      m(),
      O(
        21,
        (e.appService.globals.isPresenter ||
          e.appService.globals.user.hasMic ||
          e.appService.globals.user.hasScreen) &&
          !e.appService.globals.isNonPresenterAdmin
          ? 21
          : -1
      ),
      m(),
      O(22, e.appService.globals.isPresenter || e.appService.globals.isNonPresenterAdmin ? 22 : -1),
      m(),
      O(
        23,
        e.appService.globals.isPresenter || e.appService.globals.isNonPresenterAdmin || !e.scPlaying
          ? -1
          : 23
      ),
      m(),
      O(
        24,
        !(
          e.appService.globals.isPresenter ||
          e.appService.globals.user.hasMic ||
          e.appService.globals.isLimitedPresenter
        ) ||
          e.appService.globals.isNonPresenterAdmin ||
          e.micDisabled ||
          e.mediaService.micLaunching
          ? -1
          : 24
      ),
      m(),
      O(25, e.mediaService.micLaunching ? 25 : -1),
      m(),
      O(
        26,
        (e.appService.globals.isPresenter ||
          e.appService.globals.user.hasScreen ||
          e.appService.globals.isLimitedPresenter) &&
          !e.appService.globals.isNonPresenterAdmin
          ? 26
          : -1
      ),
      m(),
      O(
        27,
        e.appService.globals.sessData.hideWebcamForRoom ||
          !(
            e.appService.globals.isPresenter ||
            e.appService.globals.user.hasCam ||
            e.appService.globals.isLimitedPresenter
          ) ||
          e.appService.globals.isNonPresenterAdmin ||
          e.mediaService.camLaunching
          ? -1
          : 27
      ),
      m(),
      O(28, e.mediaService.camLaunching ? 28 : -1),
      m(),
      O(
        29,
        (!e.appService.globals.isPresenter && !e.appService.globals.user.hasMic) ||
          e.appService.globals.isLimitedPresenter
          ? -1
          : 29
      ),
      m(),
      O(
        30,
        e.appService.globals.isPresenter && e.appService.globals.sessData.tawkPresenterSupport
          ? 30
          : -1
      ),
      m(3),
      O(33, e.audioVolume > 50 ? 33 : -1),
      m(),
      O(34, e.audioVolume < 50 && e.audioVolume > 4 ? 34 : -1),
      m(),
      O(35, e.audioVolume < 4 ? 35 : -1),
      m(8),
      je('ngModel', e.audioVolume),
      m(2),
      O(45, e.audioVolume > 0 ? 45 : 46),
      m(3),
      O(48, e.scPlaying || e.mp3Playing || e.appService.globals.roomState.ytURL ? 48 : -1),
      m(3),
      O(51, e.mediaService.talkingUsers && e.mediaService.talkingUsers.length > 0 ? 51 : -1),
      m(2),
      z('checked', e.appService.globals.preferences.alertSoundOn),
      m(3),
      O(56, e.appService.globals.preferences.alertSoundOn ? 56 : 57),
      m(3),
      z('checked', e.appService.globals.preferences.qaSoundOn),
      m(3),
      O(62, e.appService.globals.preferences.qaSoundOn ? 62 : 63),
      m(3),
      z('checked', e.appService.globals.preferences.nonTradeSound),
      m(3),
      O(68, e.appService.globals.preferences.nonTradeSound ? 68 : 69),
      m(3),
      z('checked', e.appService.globals.preferences.chatSoundOn),
      m(3),
      O(74, e.appService.globals.preferences.chatSoundOn ? 74 : 75),
      m(3),
      z('checked', e.appService.globals.preferences.showSpeechRecoOverlay),
      m(4),
      O(81, e.appService.globals.preferences.showSpeechRecoOverlay ? 81 : 82),
      m(3),
      z('checked', e.appService.globals.preferences.doNotDisturbOn),
      m(2),
      O(86, e.appService.globals.preferences.doNotDisturbOn ? 86 : 87));
  }
}
function P4e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'as-split-area', 211)(1, 'app-extra-chat', 212),
      x('openPrivateChat', function (o) {
        return (D(e), E(g(3).showPrivateChat(o)));
      }),
      u()());
  }
  2 & t && z('size', g(3).chatSize);
}
function R4e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'as-split-area', 206)(1, 'as-split', 209),
      x('dragEnd', function (o) {
        return (D(e), E(g(2).resizeEndChat(o)));
      }),
      d(2, 'as-split-area', 210),
      T(3, 'app-alerts'),
      u(),
      d(4, 'as-split-area', 211)(5, 'app-chat', 212),
      x('openPrivateChat', function (o) {
        return (D(e), E(g(2).showPrivateChat(o)));
      }),
      u()(),
      H(6, P4e, 2, 1, 'as-split-area', 211),
      u()());
  }
  if (2 & t) {
    const e = g(2);
    (z('size', e.chatAlertsSize)('order', e.orderChatAlerts()),
      m(),
      z('direction', e.directionChatAlerts()),
      m(),
      z('size', e.alertSize),
      m(2),
      z('size', e.chatSize),
      m(2),
      O(
        6,
        !e.appService.globals.preferences.extraChatColumn ||
          ('ttb' !== e.appService.globals.preferences.roomSplitDir &&
            'btt' !== e.appService.globals.preferences.roomSplitDir)
          ? -1
          : 6
      ));
  }
}
function I4e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'as-split-area', 207)(1, 'as-split', 209),
      x('dragEnd', function (o) {
        return (D(e), E(g(2).resizeEndChat(o)));
      }),
      d(2, 'as-split-area', 211)(3, 'app-extra-chat', 212),
      x('openPrivateChat', function (o) {
        return (D(e), E(g(2).showPrivateChat(o)));
      }),
      u()()()());
  }
  if (2 & t) {
    const e = g(2);
    (z('size', e.chatAlertsSize)('order', e.orderChatAlerts()),
      m(),
      z('direction', e.directionChatAlerts()),
      m(),
      z('size', e.chatSize));
  }
}
function O4e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 213)(1, 'h5', 216),
      v(2, ' Moderator Message (only you see this message): '),
      d(3, 'span', 217),
      x('click', function () {
        return (D(e), E(g(3).closeModMessage()));
      }),
      T(4, 'i', 218),
      u()(),
      d(5, 'div', 219),
      v(6),
      u()());
  }
  if (2 & t) {
    const e = g(3);
    (m(6), Ne(' ', e.modMessage, ' '));
  }
}
function N4e(t, n) {
  1 & t && T(0, 'app-positions-container');
}
function L4e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 222),
      x('click', function () {
        return (D(e), E(g(4).updatePositionsIframe()));
      }),
      T(1, 'i', 223),
      v(2, ' Update Positions '),
      u());
  }
}
function B4e(t, n) {
  if (1 & t) {
    const e = Y();
    (H(0, L4e, 3, 0, 'button', 220),
      d(1, 'button', 221),
      x('click', function () {
        return (D(e), E(g(3).toggleShowPositions()));
      }),
      v(2),
      u());
  }
  if (2 & t) {
    const e = g(3);
    (O(0, e.appService.globals.showPositions ? 0 : -1),
      m(2),
      Ne(' ', e.appService.globals.showPositions ? 'Hide Positions' : 'Show Positions', ' '));
  }
}
function U4e(t, n) {
  if (
    (1 & t &&
      (d(0, 'as-split-area', 208),
      T(1, 'app-webcam-holder'),
      H(2, O4e, 7, 1, 'div', 213)(3, N4e, 1, 0, 'app-positions-container'),
      T(4, 'app-presentationarea', 214),
      H(5, B4e, 3, 2, 'button', 215),
      u()),
    2 & t)
  ) {
    const e = g(2);
    (z('size', e.presAreaSize)('order', e.orderPresentation()),
      m(2),
      O(2, e.modMessage && e.appService.globals.isPresenter ? 2 : -1),
      m(),
      O(3, e.appService.globals.showPositions ? 3 : -1),
      m(),
      z('scPlaying', e.scPlaying),
      m(),
      O(
        5,
        e.appService.globals.sessData.positionsIframe &&
          e.appService.globals.sessData.positionsIframeUrl
          ? 5
          : -1
      ));
  }
}
function j4e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'as-split', 205),
      x('dragEnd', function (o) {
        return (D(e), E(g().resizeEndPresentation(o)));
      })('gutterDblClick', function () {
        return (D(e), E(g().hideShowPresentationArea()));
      })('dragStart', function () {
        return (D(e), E(g().resizeStart()));
      }),
      H(1, R4e, 7, 6, 'as-split-area', 206)(2, I4e, 4, 4, 'as-split-area', 207)(
        3,
        U4e,
        6,
        6,
        'as-split-area',
        208
      ),
      u());
  }
  if (2 & t) {
    const e = g();
    (z('direction', e.directionRoom())(
      'ngClass',
      ut(
        5,
        QB,
        e.appService.globals.videoOnlyMode ||
          e.appService.globals.chatOnlyMode ||
          e.appService.globals.viewerOnlyMode
      )
    ),
      m(),
      O(1, e.hideChatAlerts ? -1 : 1),
      m(),
      O(
        2,
        e.hideChatAlerts ||
          !e.appService.globals.preferences.extraChatColumn ||
          ('ltr' !== e.appService.globals.preferences.roomSplitDir &&
            'rtl' !== e.appService.globals.preferences.roomSplitDir)
          ? -1
          : 2
      ),
      m(),
      O(3, e.hidePresentation ? -1 : 3));
  }
}
function V4e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 213)(1, 'h5', 216),
      v(2, ' Moderator Message (only you see this message): '),
      d(3, 'span', 217),
      x('click', function () {
        return (D(e), E(g(3).closeModMessage()));
      }),
      T(4, 'i', 218),
      u()(),
      d(5, 'div', 219),
      v(6),
      u()());
  }
  if (2 & t) {
    const e = g(3);
    (m(6), Ne(' ', e.modMessage, ' '));
  }
}
function H4e(t, n) {
  1 & t && T(0, 'app-positions-container');
}
function $4e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 222),
      x('click', function () {
        return (D(e), E(g(4).updatePositionsIframe()));
      }),
      T(1, 'i', 223),
      v(2, ' Update Positions '),
      u());
  }
}
function z4e(t, n) {
  if (1 & t) {
    const e = Y();
    (H(0, $4e, 3, 0, 'button', 220),
      d(1, 'button', 221),
      x('click', function () {
        return (D(e), E(g(3).toggleShowPositions()));
      }),
      v(2),
      u());
  }
  if (2 & t) {
    const e = g(3);
    (O(0, e.appService.globals.showPositions ? 0 : -1),
      m(2),
      Ne(' ', e.appService.globals.showPositions ? 'Hide Positions' : 'Show Positions', ' '));
  }
}
function G4e(t, n) {
  if (
    (1 & t &&
      (d(0, 'as-split-area', 225),
      H(1, V4e, 7, 1, 'div', 213)(2, H4e, 1, 0, 'app-positions-container'),
      T(3, 'app-presentationarea', 214),
      H(4, z4e, 3, 2, 'button', 215),
      u()),
    2 & t)
  ) {
    const e = g(2);
    (z('size', e.presAreaSizeMobile),
      m(),
      O(1, e.modMessage && e.appService.globals.isPresenter ? 1 : -1),
      m(),
      O(2, e.appService.globals.showPositions ? 2 : -1),
      m(),
      z('scPlaying', e.scPlaying),
      m(),
      O(
        4,
        e.appService.globals.sessData.positionsIframe &&
          e.appService.globals.sessData.positionsIframeUrl
          ? 4
          : -1
      ));
  }
}
function W4e(t, n) {
  if (
    (1 & t &&
      (d(0, 'as-split-area', 226)(1, 'as-split', 228)(2, 'as-split-area', 210),
      T(3, 'app-alerts'),
      u(),
      d(4, 'as-split-area', 211),
      T(5, 'app-chat'),
      u()()()),
    2 & t)
  ) {
    const e = g(2);
    (z('size', e.chatAlertsSizeMobile), m(2), z('size', e.alertSize), m(2), z('size', e.chatSize));
  }
}
function q4e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'as-split-area', 227)(1, 'as-split', 209),
      x('dragEnd', function (o) {
        return (D(e), E(g(2).resizeEndChat(o)));
      }),
      d(2, 'as-split-area', 211)(3, 'app-extra-chat', 212),
      x('openPrivateChat', function (o) {
        return (D(e), E(g(2).showPrivateChat(o)));
      }),
      u()()()());
  }
  if (2 & t) {
    const e = g(2);
    (z('size', e.chatAlertsSize)('order', e.orderChatAlerts()),
      m(),
      z('direction', e.directionChatAlerts()),
      m(),
      z('size', e.chatSize));
  }
}
function K4e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'as-split', 224),
      x('gutterDblClick', function () {
        return (D(e), E(g().hideShowPresentationArea()));
      })('dragStart', function () {
        return (D(e), E(g().resizeStart()));
      }),
      H(1, G4e, 5, 5, 'as-split-area', 225)(2, W4e, 6, 3, 'as-split-area', 226)(
        3,
        q4e,
        4,
        4,
        'as-split-area',
        227
      ),
      u());
  }
  if (2 & t) {
    const e = g();
    (z(
      'ngClass',
      ut(
        4,
        QB,
        e.appService.globals.videoOnlyMode ||
          e.appService.globals.chatOnlyMode ||
          e.appService.globals.viewerOnlyMode
      )
    ),
      m(),
      O(1, e.hidePresentation ? -1 : 1),
      m(),
      O(2, e.hideChatAlerts ? -1 : 2),
      m(),
      O(3, !e.hideChatAlerts && e.appService.globals.preferences.extraChatColumn ? 3 : -1));
  }
}
function Y4e(t, n) {
  1 & t && (d(0, 'div', 9), T(1, 'i', 37), v(2, ' Reconnecting Chat... '), u());
}
const un = window.$;
