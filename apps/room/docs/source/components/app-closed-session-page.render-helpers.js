const J4e = (t, n) => ({ 'push-wrapper': t, 'mt-0': n }),
  Z4e = (t) => ({ 'btn-dark': t });
function eRe(t, n) {
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
function tRe(t, n) {
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
function nRe(t, n) {
  if ((1 & t && (d(0, 'span'), v(1), u()), 2 & t)) {
    const e = g();
    (m(), Ne(' ', e.appService.globals.rosterCount + e.simUserCount, ' '));
  }
}
function iRe(t, n) {
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
function oRe(t, n) {
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
function sRe(t, n) {
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
    z('ngClass', ut(1, Z4e, 'darkTheme' == e.appService.globals.preferences.theme));
  }
}
function rRe(t, n) {
  if ((1 & t && (d(0, 'p'), H(1, sRe, 2, 3, 'button', 48), u()), 2 & t)) {
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
function aRe(t, n) {
  (1 & t && T(0, 'img', 51),
    2 & t && z('src', g(2).appService.globals.sessData.altBenzingaLogoURL, Mt));
}
function lRe(t, n) {
  1 & t && (T(0, 'i', 52), d(1, 'span', 29), v(2, 'Benzinga News'), u());
}
function cRe(t, n) {
  if (
    (1 & t && (d(0, 'li', 32)(1, 'a', 50), H(2, aRe, 1, 1, 'img', 51)(3, lRe, 3, 0), u()()), 2 & t)
  ) {
    const e = g();
    (m(),
      Dt('href', e.benzingaUrl, Mt),
      m(),
      O(2, e.appService.globals.sessData.altBenzingaLogoURL ? 2 : 3));
  }
}
function dRe(t, n) {
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
function uRe(t, n) {
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
function hRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 33)(1, 'a', 53),
      T(2, 'i', 54),
      d(3, 'span', 29),
      v(4, 'Archives'),
      u()(),
      d(5, 'div', 55),
      H(6, dRe, 4, 0, 'a', 56),
      d(7, 'a', 57),
      x('click', function () {
        return (D(e), E(g().doAlertsLogsModal()));
      }),
      T(8, 'i', 58),
      d(9, 'span', 29),
      v(10, 'Alert Logs'),
      u()(),
      H(11, uRe, 4, 0, 'a', 59),
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
function pRe(t, n) {
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
function fRe(t, n) {
  if ((1 & t && (d(0, 'span', 67), v(1), u()), 2 & t)) {
    const e = g(2);
    (m(), Ne(' ', e.appService.globals.rosterCount + e.simUserCount, ' '));
  }
}
function mRe(t, n) {
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
function gRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 38)(1, 'a', 65)(2, 'div', 66),
      T(3, 'i', 6),
      d(4, 'span', 29),
      v(5, 'Users: '),
      u(),
      H(6, fRe, 2, 1, 'span', 67),
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
      H(12, mRe, 1, 1, 'input', 73),
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
