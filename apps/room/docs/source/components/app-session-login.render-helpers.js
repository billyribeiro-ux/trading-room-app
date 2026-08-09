const oL = () => ({ standalone: !0 });
function gde(t, n) {
  1 & t &&
    (d(0, 'div', 0)(1, 'div', 1), T(2, 'i', 2), d(3, 'span', 3), v(4, 'Loading...'), u()()());
}
function _de(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 32),
      x('click', function () {
        return (D(e), E((g(3).browserOKDismissed = !0)));
      }),
      v(1, ' Let me try anyhow (NOT RECOMENDED)'),
      u());
  }
}
function bde(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 6)(1, 'h3', 23),
      v(
        2,
        ' WARNING Unsupported/Outdated Browser. Please use a more recent version of Chrome, Firefox, or Opera '
      ),
      u(),
      d(3, 'h5'),
      v(4, 'Your browser might NOT work properly with this room'),
      u(),
      T(5, 'hr'),
      d(6, 'div', 24),
      T(7, 'img', 25),
      u(),
      d(8, 'p', 26),
      v(9, ' For best results, We suggest using '),
      d(10, 'span', 27),
      v(11, 'CURRENT VERSIONS of'),
      u(),
      d(12, 'a', 28),
      v(13, 'Google Chrome'),
      u(),
      v(14, ', '),
      d(15, 'a', 29),
      v(16, 'Firefox (v52 and up)'),
      u(),
      v(17, ', or '),
      d(18, 'a', 30),
      v(19, 'Opera'),
      u()(),
      T(20, 'br'),
      H(21, _de, 2, 0, 'button', 31),
      u()),
    2 & t)
  ) {
    const e = g(2);
    (m(21), O(21, e.strictBrowserMode ? -1 : 21));
  }
}
function vde(t, n) {
  if ((1 & t && (d(0, 'h1', 34), v(1), u()), 2 & t)) {
    const e = g(3);
    (m(), Ne(' Welcome to the ', e.appService.globals.sessData.name, ' '));
  }
}
function yde(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'p', 42),
      v(1),
      u(),
      T(2, 'hr'),
      d(3, 'button', 43),
      x('click', function () {
        return (D(e), E(g(4).toggleRoomForgotPassword('success')));
      }),
      T(4, 'i', 44),
      v(5, ' Back '),
      u());
  }
  if (2 & t) {
    const e = g(4);
    (m(), Ze(e.forgotPasswordStatus.msg));
  }
}
function Fde(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'form', 41)(1, 'div', 14)(2, 'label', 45),
      v(3, 'Email'),
      u(),
      d(4, 'div', 46)(5, 'input', 47),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(4);
        return (He(s.email, o) || (s.email = o), E(o));
      }),
      u(),
      d(6, 'span', 48),
      T(7, 'i', 49),
      u()()(),
      d(8, 'div', 14),
      T(9, 're-captcha', 50),
      u(),
      d(10, 'div', 51)(11, 'button', 43),
      x('click', function () {
        return (D(e), E(g(4).toggleRoomForgotPassword()));
      }),
      T(12, 'i', 44),
      v(13, ' Back '),
      u(),
      d(14, 'button', 52),
      x('click', function () {
        return (D(e), E(g(4).doRoomForgotPassword()));
      }),
      T(15, 'i', 53),
      v(16, ' Send '),
      u()()());
  }
  if (2 & t) {
    const e = g(4);
    (z('formGroup', e.forgotPasswordFormGroup),
      m(5),
      je('ngModel', e.email),
      z('disabled', !!e.readOnlyEmail || null),
      m(9),
      z('disabled', e.forgotPasswordFormGroup.invalid));
  }
}
function Cde(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 37)(1, 'h4'),
      v(2, 'Forgot Password'),
      u(),
      T(3, 'hr'),
      H(4, yde, 6, 1)(5, Fde, 17, 4, 'form', 41),
      u()),
    2 & t)
  ) {
    const e = g(3);
    (m(4),
      O(4, e.forgotPasswordStatus ? 4 : -1),
      m(),
      O(
        5,
        !e.forgotPasswordStatus || (e.forgotPasswordStatus && !e.forgotPasswordStatus.success)
          ? 5
          : -1
      ));
  }
}
function Sde(t, n) {
  if ((1 & t && (d(0, 'p', 42)(1, 'a', 54), v(2, 'Login'), u()()), 2 & t)) {
    const e = g(5);
    (m(), z('href', e.roomLoginURL, Mt));
  }
}
function wde(t, n) {
  if ((1 & t && (d(0, 'p', 42), v(1), u(), H(2, Sde, 3, 1, 'p', 42), T(3, 'hr')), 2 & t)) {
    const e = g(4);
    (m(), Ze(e.changePasswordStatus.msg), m(), O(2, e.changePasswordStatus.success ? 2 : -1));
  }
}
function Tde(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'form', 41)(1, 'div', 14)(2, 'label', 55),
      v(3, 'New Password'),
      u(),
      d(4, 'div', 46),
      T(5, 'input', 56),
      d(6, 'span', 57),
      T(7, 'i', 58),
      u()()(),
      d(8, 'div', 14)(9, 'label', 59),
      v(10, 'Repeat Password'),
      u(),
      d(11, 'div', 46),
      T(12, 'input', 60),
      d(13, 'span', 61),
      T(14, 'i', 58),
      u()()(),
      d(15, 'div', 14),
      T(16, 're-captcha', 50),
      u(),
      d(17, 'div', 62)(18, 'button', 52),
      x('click', function () {
        return (D(e), E(g(4).doRoomChangePassword()));
      }),
      T(19, 'i', 53),
      v(20, ' Change Password '),
      u()()());
  }
  if (2 & t) {
    const e = g(4);
    (z('formGroup', e.changePasswordFormGroup),
      m(18),
      z('disabled', e.changePasswordFormGroup.invalid));
  }
}
function Dde(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 37)(1, 'h4'),
      v(2, 'Change Password'),
      u(),
      T(3, 'hr'),
      H(4, wde, 4, 2)(5, Tde, 21, 2, 'form', 41),
      u()),
    2 & t)
  ) {
    const e = g(3);
    (m(4),
      O(4, e.changePasswordStatus ? 4 : -1),
      m(),
      O(
        5,
        !e.changePasswordStatus || (e.changePasswordStatus && !e.changePasswordStatus.success)
          ? 5
          : -1
      ));
  }
}
function Ede(t, n) {
  1 & t && T(0, 'img', 67);
}
function kde(t, n) {
  (1 & t && T(0, 'img', 85), 2 & t && z('src', g(4).avatarURL, Mt));
}
function xde(t, n) {
  if ((1 & t && (d(0, 'div', 70), v(1), u()), 2 & t)) {
    const e = g(4);
    (m(), Ne('@', e.nick, ''));
  }
}
function Mde(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 86),
      T(1, 'i', 75),
      v(2, ' Setup Gravatar '),
      T(3, 'br'),
      u(),
      d(4, 'a', 87),
      x('click', function (o) {
        return (D(e), E(g(5).setupProfilePic(o)));
      }),
      T(5, 'i', 88),
      v(6, ' Or upload a picture'),
      u());
  }
}
function Ade(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 87),
      x('click', function (o) {
        return (D(e), E(g(5).setupProfilePic(o)));
      }),
      T(1, 'i', 88),
      v(2, ' Replace picture'),
      u(),
      d(3, 'button', 89),
      x('click', function () {
        return (D(e), E(g(5).clearProfilePic()));
      }),
      T(4, 'i', 90),
      v(5, ' Remove profile picture'),
      u());
  }
}
function Pde(t, n) {
  if ((1 & t && (d(0, 'div', 71), H(1, Mde, 7, 0)(2, Ade, 6, 0), T(3, 'br'), u()), 2 & t)) {
    const e = g(4);
    (m(), O(1, e.appService.globals.preferences.profilePic ? 2 : 1));
  }
}
function Rde(t, n) {
  if ((1 & t && (d(0, 'div', 76), T(1, 'i', 91), v(2), u()), 2 & t)) {
    const e = g(4);
    (m(2), Ne(' ', e.usernameInstructions, ' '));
  }
}
function Ide(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 14)(1, 'label', 94),
      v(2, 'Phone Number'),
      u(),
      d(3, 'div', 46)(4, 'input', 95),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(5);
        return (He(s.phoneNumber, o) || (s.phoneNumber = o), E(o));
      }),
      u(),
      d(5, 'div', 96)(6, 'span', 97),
      T(7, 'i', 98),
      u()()()());
  }
  if (2 & t) {
    const e = g(5);
    (m(4), je('ngModel', e.phoneNumber));
  }
}
function Ode(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 14)(1, 'label', 99),
      v(2, 'Password'),
      u(),
      d(3, 'div', 100)(4, 'input', 101),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(5);
        return (He(s.pw, o) || (s.pw = o), E(o));
      }),
      u(),
      d(5, 'span', 102),
      T(6, 'i', 58),
      u()(),
      d(7, 'div', 103)(8, 'a', 84),
      x('click', function () {
        return (D(e), E(g(5).toggleRoomForgotPassword()));
      }),
      v(9, 'Forgot Password?'),
      u()()());
  }
  if (2 & t) {
    const e = g(5);
    (m(4), je('ngModel', e.pw));
  }
}
function Nde(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 14)(1, 'label', 92),
      v(2, 'Email'),
      u(),
      d(3, 'div', 46)(4, 'input', 93),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(4);
        return (He(s.email, o) || (s.email = o), E(o));
      }),
      x('input', function () {
        return (D(e), E(g(4).calculateAvatar()));
      }),
      u(),
      d(5, 'span', 48),
      T(6, 'i', 49),
      u()()(),
      H(7, Ide, 8, 1, 'div', 14)(8, Ode, 10, 1, 'div', 14));
  }
  if (2 & t) {
    const e = g(4);
    (m(4),
      je('ngModel', e.email),
      z('disabled', !!e.readOnlyEmail || null),
      m(3),
      O(7, e.hasRequiredPhoneInLogin ? 7 : -1),
      m(),
      O(8, e.showPresenter || 'pw' == e.authMode || 'webinarRoom' === e.authMode ? 8 : -1));
  }
}
function Lde(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 78),
      T(1, 'i', 49),
      d(2, 'span', 104),
      v(3),
      d(4, 'a', 105),
      v(5, 'Not you? log out'),
      u()()()),
    2 & t)
  ) {
    const e = g(4);
    (m(3), Ne(' Email: ', e.email, ' '));
  }
}
function Bde(t, n) {
  1 & t && (d(0, 'label', 79), T(1, 'i', 106), v(2, ' Initializing...'), u());
}
function Ude(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 81)(1, 'input', 107),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(4);
        return (He(s.rememberMe, o) || (s.rememberMe = o), E(o));
      }),
      u(),
      d(2, 'label', 108),
      v(3, 'Remember me'),
      u()());
  }
  if (2 & t) {
    const e = g(4);
    (m(), je('ngModel', e.rememberMe), z('ngModelOptions', wo(2, oL)));
  }
}
function jde(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 109),
      x('click', function () {
        return (D(e), E(g(4).doLoginCheck()));
      }),
      v(1, 'Login'),
      u());
  }
}
function Vde(t, n) {
  1 & t && (d(0, 'span'), v(1, ' Connecting '), T(2, 'i', 110), u());
}
function Hde(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 112),
      x('click', function () {
        return (D(e), E((g(5).showPresenter = !0)));
      }),
      d(1, 'a', 113),
      v(2, 'Have a password?'),
      T(3, 'br'),
      d(4, 'span', 114),
      v(5, 'Click here'),
      u()()());
  }
}
function $de(t, n) {
  (1 & t && H(0, Hde, 6, 0, 'div', 111), 2 & t && O(0, g(4).disableLoginForm ? -1 : 0));
}
function zde(t, n) {
  1 & t &&
    (d(0, 'div', 42)(1, 'div', 81),
    T(2, 'input', 115),
    d(3, 'label', 116),
    v(4, 'Non Presenter Admin'),
    u()()());
}
function Gde(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'p', 63),
      v(1, 'Please complete this form:'),
      u(),
      d(2, 'form', 64),
      x('submit', function () {
        return (D(e), E(g(3).doLoginCheck()));
      }),
      d(3, 'div', 65)(4, 'div', 66),
      H(5, Ede, 1, 0, 'img', 67)(6, kde, 1, 1),
      d(7, 'span', 68),
      x('click', function () {
        return (D(e), E(g(3).showAvatarOptions()));
      }),
      T(8, 'i', 69),
      u(),
      H(9, xde, 2, 1, 'div', 70),
      u(),
      H(10, Pde, 4, 1, 'div', 71),
      u(),
      d(11, 'div', 14)(12, 'label', 72),
      v(13, 'Name'),
      u(),
      d(14, 'div', 46)(15, 'input', 73),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(3);
        return (He(s.nick, o) || (s.nick = o), E(o));
      }),
      u(),
      d(16, 'span', 74),
      T(17, 'i', 75),
      u()(),
      H(18, Rde, 3, 1, 'div', 76),
      u(),
      H(19, Nde, 9, 4),
      T(20, 'div', 77),
      H(21, Lde, 6, 1, 'div', 78)(22, Bde, 3, 0, 'label', 79),
      d(23, 'div', 80),
      H(24, Ude, 4, 3, 'div', 81),
      d(25, 'div')(26, 'button', 82),
      H(27, jde, 2, 0, 'span')(28, Vde, 3, 0, 'span'),
      u()()(),
      d(29, 'div', 83)(30, 'a', 84),
      x('click', function () {
        return (D(e), E(g(3).doLoginFormClear()));
      }),
      v(31, 'Not you? clear form'),
      u()(),
      H(32, $de, 1, 1)(33, zde, 5, 0),
      u());
  }
  if (2 & t) {
    const e = g(3);
    (m(5),
      O(5, e.avatarURL ? 6 : 5),
      m(4),
      O(9, e.nick ? 9 : -1),
      m(),
      O(10, e.avatarOptions ? 10 : -1),
      m(5),
      je('ngModel', e.nick),
      z('disabled', e.disableEditingUsername),
      m(3),
      O(18, e.usernameInstructions ? 18 : -1),
      m(),
      O(19, e.disableLoginForm ? -1 : 19),
      m(2),
      O(21, 'sso' == e.authMode ? 21 : -1),
      m(),
      O(22, e.loginReady ? -1 : 22),
      m(2),
      O(24, e.disableLoginForm ? -1 : 24),
      m(2),
      z('disabled', e.appService.globals.logginIn || !e.loginReady),
      m(),
      O(27, e.appService.globals.logginIn ? -1 : 27),
      m(),
      O(28, e.appService.globals.logginIn ? 28 : -1),
      m(4),
      O(32, e.showPresenter ? 33 : 32));
  }
}
function Wde(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 7)(1, 'div', 33),
      H(2, vde, 2, 1, 'h1', 34),
      T(3, 'div', 35),
      Je(4, 'noSanitize'),
      u(),
      d(5, 'div', 36),
      H(6, Cde, 6, 2, 'div', 37)(7, Dde, 6, 2)(8, Gde, 34, 14),
      d(9, 'div', 38)(10, 'p', 39),
      v(11, ' Powered by: '),
      d(12, 'a', 40),
      v(13, 'ProTradingRoom.com'),
      u()(),
      d(14, 'p', 39),
      v(15),
      u()()()()),
    2 & t)
  ) {
    const e = g(2);
    (m(2),
      O(2, e.appService.globals.sessData.hideWelcomeTo ? -1 : 2),
      m(),
      z('innerHtml', Ct(4, 4, e.appService.globals.sessData.description, 'html'), wn),
      m(3),
      O(6, e.forgotPassword ? 6 : e.appService.globals.changePasswordUID ? 7 : 8),
      m(9),
      Ne(' Version: ', e.appService.globals.appVersion, ' '));
  }
}
function qde(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'p', 42),
      v(1),
      u(),
      T(2, 'hr'),
      d(3, 'button', 43),
      x('click', function () {
        return (D(e), E(g(4).toggleRoomForgotPassword('success')));
      }),
      T(4, 'i', 44),
      v(5, ' Back '),
      u());
  }
  if (2 & t) {
    const e = g(4);
    (m(), Ze(e.forgotPasswordStatus.msg));
  }
}
function Kde(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'form', 41)(1, 'div', 14)(2, 'label', 45),
      v(3, 'Email'),
      u(),
      d(4, 'div', 46)(5, 'input', 118),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(4);
        return (He(s.email, o) || (s.email = o), E(o));
      }),
      u(),
      d(6, 'span', 119),
      T(7, 'i', 49),
      u()()(),
      d(8, 'div', 14),
      T(9, 're-captcha', 50),
      u(),
      d(10, 'div', 51)(11, 'button', 43),
      x('click', function () {
        return (D(e), E(g(4).toggleRoomForgotPassword()));
      }),
      T(12, 'i', 44),
      v(13, ' Back '),
      u(),
      d(14, 'button', 52),
      x('click', function () {
        return (D(e), E(g(4).doRoomForgotPassword()));
      }),
      T(15, 'i', 53),
      v(16, ' Send '),
      u()()());
  }
  if (2 & t) {
    const e = g(4);
    (z('formGroup', e.forgotPasswordFormGroup),
      m(5),
      je('ngModel', e.email),
      z('disabled', !!e.readOnlyEmail || null),
      m(9),
      z('disabled', e.forgotPasswordFormGroup.invalid));
  }
}
function Yde(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 37)(1, 'h4'),
      v(2, 'Forgot Password'),
      u(),
      T(3, 'hr'),
      H(4, qde, 6, 1)(5, Kde, 17, 4, 'form', 41),
      d(6, 'button', 43),
      x('click', function () {
        return (D(e), E(g(3).toggleRoomForgotPassword()));
      }),
      T(7, 'i', 44),
      v(8, ' Back '),
      u()());
  }
  if (2 & t) {
    const e = g(3);
    (m(4),
      O(4, e.forgotPasswordStatus ? 4 : -1),
      m(),
      O(
        5,
        !e.forgotPasswordStatus || (e.forgotPasswordStatus && !e.forgotPasswordStatus.success)
          ? 5
          : -1
      ));
  }
}
function Qde(t, n) {
  if ((1 & t && (d(0, 'p', 42)(1, 'a', 54), v(2, 'Login'), u()()), 2 & t)) {
    const e = g(5);
    (m(), z('href', e.roomLoginURL, Mt));
  }
}
function Xde(t, n) {
  if ((1 & t && (d(0, 'p', 42), v(1), u(), H(2, Qde, 3, 1, 'p', 42), T(3, 'hr')), 2 & t)) {
    const e = g(4);
    (m(), Ze(e.changePasswordStatus.msg), m(), O(2, e.changePasswordStatus.success ? 2 : -1));
  }
}
function Jde(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'form', 41)(1, 'div', 14)(2, 'label', 55),
      v(3, 'New Password'),
      u(),
      d(4, 'div', 46),
      T(5, 'input', 56),
      d(6, 'span', 57),
      T(7, 'i', 58),
      u()()(),
      d(8, 'div', 14)(9, 'label', 59),
      v(10, 'Repeat Password'),
      u(),
      d(11, 'div', 100),
      T(12, 'input', 60),
      d(13, 'span', 61),
      T(14, 'i', 58),
      u()()(),
      d(15, 'div', 14),
      T(16, 're-captcha', 50),
      u(),
      d(17, 'div', 62)(18, 'button', 52),
      x('click', function () {
        return (D(e), E(g(4).doRoomChangePassword()));
      }),
      T(19, 'i', 53),
      v(20, ' Change Password '),
      u()()());
  }
  if (2 & t) {
    const e = g(4);
    (z('formGroup', e.changePasswordFormGroup),
      m(18),
      z('disabled', e.changePasswordFormGroup.invalid));
  }
}
function Zde(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 37)(1, 'h4'),
      v(2, 'Change Password'),
      u(),
      T(3, 'hr'),
      H(4, Xde, 4, 2)(5, Jde, 21, 2, 'form', 41),
      u()),
    2 & t)
  ) {
    const e = g(3);
    (m(4),
      O(4, e.changePasswordStatus ? 4 : -1),
      m(),
      O(
        5,
        !e.changePasswordStatus || (e.changePasswordStatus && !e.changePasswordStatus.success)
          ? 5
          : -1
      ));
  }
}
function eue(t, n) {
  if ((1 & t && (d(0, 'h1', 34), v(1), u()), 2 & t)) {
    const e = g(4);
    (m(), Ne(' Welcome to the ', e.appService.globals.sessData.name, ' '));
  }
}
function tue(t, n) {
  1 & t && T(0, 'img', 67);
}
function nue(t, n) {
  (1 & t && T(0, 'img', 85), 2 & t && z('src', g(4).avatarURL, Mt));
}
function iue(t, n) {
  if ((1 & t && (d(0, 'div', 70), v(1), u()), 2 & t)) {
    const e = g(4);
    (m(), Ne('@', e.nick, ''));
  }
}
function oue(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 86),
      T(1, 'i', 75),
      v(2, ' Setup Gravatar '),
      T(3, 'br'),
      u(),
      d(4, 'a', 87),
      x('click', function (o) {
        return (D(e), E(g(5).setupProfilePic(o)));
      }),
      T(5, 'i', 88),
      v(6, ' Or upload a picture'),
      u());
  }
}
function sue(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 87),
      x('click', function (o) {
        return (D(e), E(g(5).setupProfilePic(o)));
      }),
      T(1, 'i', 88),
      v(2, ' Replace picture'),
      u(),
      d(3, 'button', 89),
      x('click', function () {
        return (D(e), E(g(5).clearProfilePic()));
      }),
      T(4, 'i', 90),
      v(5, ' Remove profile picture'),
      u());
  }
}
function rue(t, n) {
  if ((1 & t && (d(0, 'div', 71), H(1, oue, 7, 0)(2, sue, 6, 0), T(3, 'br'), u()), 2 & t)) {
    const e = g(4);
    (m(), O(1, e.appService.globals.preferences.profilePic ? 2 : 1));
  }
}
function aue(t, n) {
  if ((1 & t && (d(0, 'div', 76), T(1, 'i', 91), v(2), u()), 2 & t)) {
    const e = g(4);
    (m(2), Ne('', e.usernameInstructions, ' '));
  }
}
function lue(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 14)(1, 'label', 92),
      v(2, 'Email'),
      u(),
      d(3, 'div', 46)(4, 'input', 93),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(4);
        return (He(s.email, o) || (s.email = o), E(o));
      }),
      x('input', function () {
        return (D(e), E(g(4).calculateAvatar()));
      }),
      u(),
      d(5, 'span', 48),
      T(6, 'i', 49),
      u()()());
  }
  if (2 & t) {
    const e = g(4);
    (m(4), je('ngModel', e.email), z('disabled', !!e.readOnlyEmail || null));
  }
}
function cue(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 14)(1, 'label', 94),
      v(2, 'Phone Number'),
      u(),
      d(3, 'div', 46)(4, 'input', 95),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(4);
        return (He(s.phoneNumber, o) || (s.phoneNumber = o), E(o));
      }),
      u(),
      d(5, 'div', 96)(6, 'span', 97),
      T(7, 'i', 98),
      u()()()());
  }
  if (2 & t) {
    const e = g(4);
    (m(4), je('ngModel', e.phoneNumber));
  }
}
function due(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 14)(1, 'label', 99),
      v(2, 'Password'),
      u(),
      d(3, 'div', 100)(4, 'input', 101),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(4);
        return (He(s.pw, o) || (s.pw = o), E(o));
      }),
      u(),
      d(5, 'span', 102),
      T(6, 'i', 58),
      u()(),
      d(7, 'div', 103)(8, 'a', 84),
      x('click', function () {
        return (D(e), E(g(4).toggleRoomForgotPassword()));
      }),
      v(9, 'Forgot Password?'),
      u()()());
  }
  if (2 & t) {
    const e = g(4);
    (m(4), je('ngModel', e.pw));
  }
}
function uue(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 78),
      T(1, 'i', 49),
      d(2, 'span', 104),
      v(3),
      d(4, 'a', 105),
      v(5, 'Not you? log out'),
      u()()()),
    2 & t)
  ) {
    const e = g(4);
    (m(3), Ne(' Email: ', e.email, ' '));
  }
}
function hue(t, n) {
  1 & t && (d(0, 'label', 79), T(1, 'i', 106), v(2, ' Initializing...'), u());
}
function pue(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 81)(1, 'input', 107),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(4);
        return (He(s.rememberMe, o) || (s.rememberMe = o), E(o));
      }),
      u(),
      d(2, 'label', 108),
      v(3, 'Keep me logged in'),
      u()());
  }
  if (2 & t) {
    const e = g(4);
    (m(), je('ngModel', e.rememberMe), z('ngModelOptions', wo(2, oL)));
  }
}
function fue(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 109),
      x('click', function () {
        return (D(e), E(g(4).doLoginCheck()));
      }),
      v(1, 'Login'),
      u());
  }
}
function mue(t, n) {
  1 & t && (d(0, 'span'), v(1, ' Connecting '), T(2, 'i', 110), u());
}
function gue(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 112),
      x('click', function () {
        return (D(e), E((g(4).showPresenter = !0)));
      }),
      d(1, 'a', 113),
      v(2, 'Have a password?'),
      T(3, 'br'),
      v(4, 'Click here'),
      u()());
  }
}
function _ue(t, n) {
  1 & t &&
    (d(0, 'div', 42)(1, 'div', 81),
    T(2, 'input', 115),
    d(3, 'label', 116),
    v(4, 'Non Presenter Admin'),
    u()()());
}
function bue(t, n) {
  if (1 & t) {
    const e = Y();
    (H(0, eue, 2, 1, 'h1', 34),
      d(1, 'p', 63),
      v(2, 'Please complete this form:'),
      u(),
      d(3, 'form', 64),
      x('submit', function () {
        return (D(e), E(g(3).doLoginCheck()));
      }),
      d(4, 'div', 65)(5, 'div', 66),
      H(6, tue, 1, 0, 'img', 67)(7, nue, 1, 1),
      d(8, 'span', 68),
      x('click', function () {
        return (D(e), E(g(3).showAvatarOptions()));
      }),
      T(9, 'i', 69),
      u(),
      H(10, iue, 2, 1, 'div', 70),
      u(),
      H(11, rue, 4, 1, 'div', 71),
      u(),
      d(12, 'div', 14)(13, 'label', 72),
      v(14, 'Name'),
      u(),
      d(15, 'div', 46)(16, 'input', 73),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(3);
        return (He(s.nick, o) || (s.nick = o), E(o));
      }),
      u(),
      d(17, 'span', 74),
      T(18, 'i', 75),
      u()(),
      H(19, aue, 3, 1, 'div', 76),
      u(),
      H(20, lue, 7, 2, 'div', 14)(21, cue, 8, 1, 'div', 14)(22, due, 10, 1, 'div', 14),
      T(23, 'div', 77),
      H(24, uue, 6, 1, 'div', 78)(25, hue, 3, 0, 'label', 79),
      d(26, 'div', 80),
      H(27, pue, 4, 3, 'div', 81),
      d(28, 'div')(29, 'button', 82),
      H(30, fue, 2, 0, 'span')(31, mue, 3, 0),
      u()()(),
      d(32, 'div', 83)(33, 'a', 84),
      x('click', function () {
        return (D(e), E(g(3).doLoginFormClear()));
      }),
      v(34, 'Not you? clear form'),
      u()(),
      H(35, gue, 5, 0, 'div', 111)(36, _ue, 5, 0),
      u());
  }
  if (2 & t) {
    const e = g(3);
    (O(0, e.appService.globals.sessData.hideWelcomeTo ? -1 : 0),
      m(6),
      O(6, e.avatarURL ? 7 : 6),
      m(4),
      O(10, e.nick ? 10 : -1),
      m(),
      O(11, e.avatarOptions ? 11 : -1),
      m(5),
      je('ngModel', e.nick),
      z('disabled', e.disableEditingUsername),
      m(3),
      O(19, e.usernameInstructions ? 19 : -1),
      m(),
      O(20, e.disableLoginForm ? -1 : 20),
      m(),
      O(21, e.hasRequiredPhoneInLogin ? 21 : -1),
      m(),
      O(22, e.showPresenter || 'pw' == e.authMode || 'webinarRoom' === e.authMode ? 22 : -1),
      m(2),
      O(24, 'sso' == e.authMode ? 24 : -1),
      m(),
      O(25, e.loginReady ? -1 : 25),
      m(2),
      O(27, e.disableLoginForm ? -1 : 27),
      m(2),
      z('disabled', e.appService.globals.logginIn || !e.loginReady),
      m(),
      O(30, e.appService.globals.logginIn ? 31 : 30),
      m(5),
      O(35, e.showPresenter || e.disableLoginForm ? (e.showPresenter ? 36 : -1) : 35));
  }
}
function vue(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 7)(1, 'div', 117),
      H(2, Yde, 9, 2, 'div', 37)(3, Zde, 6, 2)(4, bue, 37, 16),
      d(5, 'div', 38)(6, 'p', 39),
      v(7, ' Powered by: '),
      d(8, 'a', 40),
      v(9, 'ProTradingRoom.com'),
      u()(),
      d(10, 'p', 39),
      v(11),
      u()()()()),
    2 & t)
  ) {
    const e = g(2);
    (m(2),
      O(2, e.forgotPassword ? 2 : e.appService.globals.changePasswordUID ? 3 : 4),
      m(9),
      Ne(' Version: ', e.appService.globals.appVersion, ' '));
  }
}
function yue(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 4)(1, 'div', 5),
      H(2, bde, 22, 1, 'div', 6)(3, Wde, 16, 7, 'div', 7)(4, vue, 12, 2),
      u()(),
      d(5, 'div', 8)(6, 'div', 9)(7, 'div', 10)(8, 'div', 11)(9, 'h5'),
      v(10, 'Avatar from gmail address'),
      u(),
      T(11, 'button', 12),
      u(),
      d(12, 'div', 13)(13, 'div', 14)(14, 'label', 15),
      v(15, 'Enter your Gmail address'),
      u(),
      T(16, 'input', 16),
      u()(),
      d(17, 'div', 17)(18, 'button', 18),
      v(19, ' Close '),
      u(),
      d(20, 'button', 19),
      v(21, 'Save'),
      u()()()()(),
      d(22, 'div', 20)(23, 'div', 9)(24, 'div', 10)(25, 'div', 11)(26, 'h5'),
      v(27, 'Facebook profile image as avatar'),
      u(),
      T(28, 'button', 12),
      u(),
      d(29, 'div', 13)(30, 'div', 14)(31, 'label', 21),
      v(32, 'Enter your facebook username'),
      u(),
      T(33, 'input', 22),
      u()(),
      d(34, 'div', 17)(35, 'button', 18),
      v(36, ' Close '),
      u(),
      d(37, 'button', 19),
      v(38, 'Save'),
      u()()()()()),
    2 & t)
  ) {
    const e = g();
    (m(2),
      O(2, e.browserOK || e.browserOKDismissed ? -1 : 2),
      m(),
      O(3, e.appService.globals.sessData.description ? 3 : 4));
  }
}
