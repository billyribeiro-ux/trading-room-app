const w2e = ['searchTermTxtAlerts'];
function T2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 21),
      x('click', function () {
        return (D(e), E(g().openAlertFilterModal()));
      }),
      v(1, ' filtered'),
      u());
  }
}
function D2e(t, n) {
  1 & t && (d(0, 'span', 9), T(1, 'i', 22), v(2, ' DND'), u());
}
function E2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 11)(1, 'a', 23),
      x('click', function () {
        return (D(e), E(g().doPollUI()));
      }),
      T(2, 'i', 24),
      v(3, ' Poll'),
      u()(),
      d(4, 'li', 25)(5, 'a', 23),
      x('click', function () {
        return (D(e), E(g().doPostAlertUI()));
      }),
      T(6, 'i', 26),
      v(7, ' Post Alert'),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(),
      Et('poll-active-blink', e.pollIsActive && !e.pollIsMinimized)(
        'poll-active-indicator',
        e.pollIsMinimized
      ));
  }
}
function k2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 11)(1, 'a', 27),
      x('click', function () {
        return (D(e), E(g().doPollUI()));
      }),
      T(2, 'i', 24),
      v(3, ' Poll'),
      u()());
  }
}
function x2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 36)(1, 'input', 40),
      x('change', function () {
        return (D(e), E(g(3).toggleInlineAlertEntry()));
      }),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(3);
        return (He(s.showAlertsEntry, o) || (s.showAlertsEntry = o), E(o));
      }),
      u(),
      d(2, 'label', 41),
      v(3, ' Show inline alert entry '),
      u()());
  }
  if (2 & t) {
    const e = g(3);
    (m(), je('ngModel', e.showAlertsEntry));
  }
}
function M2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 42),
      x('click', function () {
        return (D(e), E(g(3).detachAlerts()));
      }),
      T(1, 'i', 43),
      v(2, ' Detach Alerts'),
      u());
  }
}
function A2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 44),
      x('click', function () {
        return (D(e), E(g(3).openAlertFilterModal()));
      }),
      T(1, 'i', 45),
      v(2, ' Filter alerts'),
      u());
  }
}
function P2e(t, n) {
  1 & t && (d(0, 'button', 39), T(1, 'i', 46), v(2, ' Advanced Search'), u());
}
function R2e(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 28)(1, 'div', 35),
      H(2, x2e, 4, 1, 'div', 36)(3, M2e, 3, 0, 'button', 37),
      u(),
      d(4, 'div'),
      H(5, A2e, 3, 0, 'button', 38)(6, P2e, 3, 0, 'button', 39),
      u()()),
    2 & t)
  ) {
    const e = g(2);
    (m(2),
      O(2, e.isPresenter ? 2 : -1),
      m(),
      O(3, e.appService.globals.chatOnlyMode ? -1 : 3),
      m(2),
      O(5, e.appService.globals.sessData.modAlertFilterList ? 5 : -1),
      m(),
      O(
        6,
        e.appService.globals.sessData.advancedSearchAlerts &&
          '56ba547185ae93560d186ea8' == e.appService.globals.sessData.ownerdID
          ? 6
          : -1
      ));
  }
}
function I2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 50),
      x('click', function () {
        return (D(e), E(g(3).archiveOptions()));
      }),
      T(1, 'i', 51),
      u());
  }
}
function O2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 47),
      x('click', function () {
        return (D(e), g(2), E(It(19).downloadLog('alerts')));
      }),
      T(1, 'i', 48),
      u(),
      H(2, I2e, 2, 0, 'div', 49));
  }
  if (2 & t) {
    const e = g(2);
    (m(2),
      O(2, e.appService.globals.isPresenter && !e.appService.globals.isLimitedPresenter ? 2 : -1));
  }
}
function N2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 18),
      H(1, R2e, 7, 4, 'div', 28),
      d(2, 'form', 29),
      x('change', function () {
        D(e);
        const o = It(7);
        return E(g().searchTermChanged(o.value));
      })('keydown.enter', function (o) {
        D(e);
        const s = It(7),
          r = g();
        return (o.preventDefault(), E(r.onEnterSearchChat(s.value)));
      }),
      d(3, 'div')(4, 'div', 30)(5, 'div', 31),
      T(6, 'input', 32, 1),
      d(8, 'span', 33),
      x('click', function () {
        D(e);
        const o = It(7),
          s = g();
        return ((o.value = ''), E(s.onEnterSearchChat('')));
      }),
      T(9, 'i', 34),
      u(),
      H(10, O2e, 3, 1),
      u()()()()());
  }
  if (2 & t) {
    const e = g();
    (m(),
      O(1, e.showAlertsToolbarExtended ? 1 : -1),
      m(9),
      O(10, e.showAlertsToolbarExtended ? 10 : -1));
  }
}
function L2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 20)(1, 'div', 52, 2)(3, 'textarea', 53),
      x('keyup', function (o) {
        return (D(e), E(g().onKey(o)));
      })('paste', function (o) {
        return (D(e), E(g().onImagePaste(o)));
      }),
      u()()());
  }
}
