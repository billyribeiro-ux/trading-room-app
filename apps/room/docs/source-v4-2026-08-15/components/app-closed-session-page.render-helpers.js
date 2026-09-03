const rRe = (t, n) => ({ 'push-wrapper': t, 'mt-0': n }),
  aRe = (t) => ({ 'btn-dark': t });
function lRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 40),
      x('click', function () {
        return (D(e), E(g().toggleSideBar()));
      }),
      T(1, 'i', 41),
      u());
  }
}
function cRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 42),
      x('click', function () {
        return (D(e), E(g().toggleSideBar()));
      }),
      T(1, 'i', 43),
      u());
  }
}
function dRe(t, n) {
  if ((1 & t && (d(0, 'span'), v(1), u()), 2 & t)) {
    const e = g();
    (m(), Ne(' ', e.appService.globals.rosterCount + e.simUserCount, ' '));
  }
}
function uRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 44),
      x('click', function () {
        return (D(e), E(g().doSessionControl()));
      }),
      d(1, 'a', 45),
      T(2, 'i', 46),
      u()());
  }
}
function hRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li')(1, 'a', 47),
      x('click', function () {
        return (D(e), E(g().openSession()));
      }),
      v(2, 'Open Session'),
      u()());
  }
}
function pRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 49),
      x('click', function () {
        return (D(e), E(g(2).getMyPinAndDoInfo()));
      }),
      v(1, ' Mobile App Info'),
      u());
  }
  if (2 & t) {
    const e = g(2);
    z('ngClass', ct(1, aRe, 'darkTheme' == e.appService.globals.preferences.theme));
  }
}
function fRe(t, n) {
  if ((1 & t && (d(0, 'p'), H(1, pRe, 2, 3, 'button', 48), u()), 2 & t)) {
    const e = g();
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
function mRe(t, n) {
  (1 & t && T(0, 'img', 51),
    2 & t && z('src', g(2).appService.globals.sessData.altBenzingaLogoURL, Mt));
}
function gRe(t, n) {
  1 & t && (T(0, 'i', 52), d(1, 'span', 29), v(2, 'Benzinga News'), u());
}
function _Re(t, n) {
  if (
    (1 & t && (d(0, 'li', 32)(1, 'a', 50), H(2, mRe, 1, 1, 'img', 51)(3, gRe, 3, 0), u()()), 2 & t)
  ) {
    const e = g();
    (m(),
      Et('href', e.benzingaUrl, Mt),
      m(),
      O(2, e.appService.globals.sessData.altBenzingaLogoURL ? 2 : 3));
  }
}
function bRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 60),
      x('click', function () {
        return (D(e), E(g(2).launchRecordings()));
      }),
      T(1, 'i', 61),
      d(2, 'span', 29),
      v(3, 'Recording'),
      u()());
  }
}
function vRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 62),
      x('click', function () {
        return (D(e), E(g(2).doChatLogsModal()));
      }),
      T(1, 'i', 63),
      d(2, 'span', 29),
      v(3, 'Chat Logs'),
      u()());
  }
}
function yRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 33)(1, 'a', 53),
      T(2, 'i', 54),
      d(3, 'span', 29),
      v(4, 'Archives'),
      u()(),
      d(5, 'div', 55),
      H(6, bRe, 4, 0, 'a', 56),
      d(7, 'a', 57),
      x('click', function () {
        return (D(e), E(g().doAlertsLogsModal()));
      }),
      T(8, 'i', 58),
      d(9, 'span', 29),
      v(10, 'Alert Logs'),
      u()(),
      H(11, vRe, 4, 0, 'a', 59),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(6),
      O(6, e.appService.globals.isPresenter || !e.appService.globals.sessData.hideRecs ? 6 : -1),
      m(5),
      O(
        11,
        !e.appService.globals.sessData.hideChatLog || e.appService.globals.isPresenter ? 11 : -1
      ));
  }
}
function FRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 32)(1, 'a', 64),
      x('click', function () {
        return (D(e), E(g().getRandomUser()));
      }),
      T(2, 'i', 6),
      d(3, 'span', 29),
      v(4, 'Get Random User'),
      u()()());
  }
}
function CRe(t, n) {
  if ((1 & t && (d(0, 'span', 67), v(1), u()), 2 & t)) {
    const e = g(2);
    (m(), Ne(' ', e.appService.globals.rosterCount + e.simUserCount, ' '));
  }
}
function SRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'input', 76),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.userSearchTermTxt, o) || (s.userSearchTermTxt = o), E(o));
      }),
      x('search', function () {
        return (D(e), E(g(2).searchUsers()));
      }),
      u());
  }
  2 & t && je('ngModel', g(2).userSearchTermTxt);
}
function wRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 38)(1, 'a', 65)(2, 'div', 66),
      T(3, 'i', 6),
      d(4, 'span', 29),
      v(5, 'Users: '),
      u(),
      H(6, CRe, 2, 1, 'span', 67),
      u(),
      d(7, 'div', 68)(8, 'button', 69),
      x('click', function () {
        return (D(e), E(g().reloadUsers()));
      }),
      T(9, 'i', 70),
      u(),
      d(10, 'button', 71),
      x('click', function () {
        return (D(e), E(g().toggleUserSearch()));
      }),
      T(11, 'i', 72),
      u()()(),
      H(12, SRe, 1, 1, 'input', 73),
      d(13, 'div', 74, 1),
      T(15, 'app-room-roster', 75),
      u()());
  }
  if (2 & t) {
    const e = g(),
      i = It(23);
    (m(6),
      O(
        6,
        e.appService.globals.sessData.rosterCountVisibleToViewers ||
          e.appService.globals.isPresenter
          ? 6
          : -1
      ),
      m(6),
      O(12, e.showUserSearch ? 12 : -1),
      m(3),
      z('roster', e.visibleRoster)('parent', i));
  }
}
