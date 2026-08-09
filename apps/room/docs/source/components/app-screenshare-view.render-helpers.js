const V0e = (t, n) => ({ 'screencast-pan': t, 'screencast-pan-grabbing': n }),
  H0e = (t, n) => ({ hidden: t, 'viewer-only-screen-video': n }),
  $0e = (t) => ({ hidden: t });
function z0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'h3', 10),
      x('click', function () {
        return (D(e), E(g().reAttachScren()));
      }),
      v(1, ' Screen Detached.. Click here to re-attach '),
      u());
  }
}
function G0e(t, n) {
  1 & t && (d(0, 'h3', 1), v(1, 'Video Disabled'), u());
}
function W0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'p', 11),
      x('click', function () {
        return (D(e), E(g().largePreview()));
      }),
      v(1),
      u());
  }
  if (2 & t) {
    const e = g();
    (m(),
      Ne(
        ' (You are sharing your screen as ',
        e.muser.mediaValue.screenName,
        ' click here for larger preview) '
      ));
  }
}
function q0e(t, n) {
  if ((1 & t && (d(0, 'h3', 3), T(1, 'i', 12), v(2), u()), 2 & t)) {
    const e = g();
    (m(2),
      ns(
        ' Connecting To Screen of ',
        e.muser.mediaValue.name,
        '-',
        e.muser.mediaValue.screenName,
        ' '
      ));
  }
}
function K0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div')(1, 'button', 16),
      x('click', function () {
        return (D(e), E(g(2).panZoomIn()));
      }),
      T(2, 'i', 17),
      u(),
      d(3, 'button', 16),
      x('click', function () {
        return (D(e), E(g(2).panZoomOut()));
      }),
      T(4, 'i', 18),
      u(),
      d(5, 'button', 16),
      x('click', function () {
        return (D(e), E(g(2).panZoomReset()));
      }),
      T(6, 'i', 19),
      u()());
  }
}
function Y0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 4)(1, 'button', 13),
      x('click', function () {
        return (D(e), E(g().togglePanZoomDetached()));
      }),
      T(2, 'i', 14),
      u(),
      d(3, 'button', 13),
      x('click', function () {
        return (D(e), E(g().captureVideoImage()));
      }),
      T(4, 'i', 15),
      u(),
      H(5, K0e, 7, 0, 'div'),
      u());
  }
  if (2 & t) {
    const e = g();
    (z(
      'ngClass',
      ut(
        2,
        $0e,
        !e.isDetached &&
          (!e.isConnected ||
            (e.isPresentingThisScreen && !e.localpreview) ||
            e.mediaService.saveData)
      )
    ),
      m(5),
      O(5, e.showZoomCtrlDetached ? 5 : -1));
  }
}
function Q0e(t, n) {
  if ((1 & t && (d(0, 'span', 9), v(1), u()), 2 & t)) {
    const e = g();
    (m(), Ne(' ', e.appService.globals.user.userXrefID, ' '));
  }
}
