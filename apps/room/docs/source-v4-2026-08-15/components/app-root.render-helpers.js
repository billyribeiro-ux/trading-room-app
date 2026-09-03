function xRe(t, n) {
  (1 & t && T(0, 'app-room', 1), 2 & t && z('ngClass', g(2).activeTheme));
}
function MRe(t, n) {
  1 & t && T(0, 'app-closed-session-page');
}
function ARe(t, n) {
  (1 & t && T(0, 'app-kicked-page', 2), 2 & t && z('msg', g(2).kickedMsg));
}
function PRe(t, n) {
  1 & t && T(0, 'app-detached-screen');
}
function RRe(t, n) {
  (1 & t && T(0, 'app-session-login', 3), 2 & t && z('loginReady', g(2).loginReady));
}
function IRe(t, n) {
  if ((1 & t && H(0, xRe, 1, 1)(1, MRe, 1, 0)(2, ARe, 1, 1)(3, PRe, 1, 0)(4, RRe, 1, 1), 2 & t)) {
    let e;
    O(
      0,
      'chat' === (e = g().currPage)
        ? 0
        : 'closed' === e
          ? 1
          : 'kicked' === e
            ? 2
            : 'detachedScreen' === e
              ? 3
              : 4
    );
  }
}
