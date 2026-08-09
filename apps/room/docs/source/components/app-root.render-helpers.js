function FRe(t, n) {
  (1 & t && T(0, 'app-room', 1), 2 & t && z('ngClass', g(2).activeTheme));
}
function CRe(t, n) {
  1 & t && T(0, 'app-closed-session-page');
}
function SRe(t, n) {
  (1 & t && T(0, 'app-kicked-page', 2), 2 & t && z('msg', g(2).kickedMsg));
}
function wRe(t, n) {
  1 & t && T(0, 'app-detached-screen');
}
function TRe(t, n) {
  (1 & t && T(0, 'app-session-login', 3), 2 & t && z('loginReady', g(2).loginReady));
}
function DRe(t, n) {
  if ((1 & t && H(0, FRe, 1, 1)(1, CRe, 1, 0)(2, SRe, 1, 1)(3, wRe, 1, 0)(4, TRe, 1, 1), 2 & t)) {
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
