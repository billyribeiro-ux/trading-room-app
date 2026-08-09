const oAe = ['waveformCanvas'],
  d0 = (t, n) => ({ passed: t, failed: n }),
  u0 = (t, n, e, i) => ({ 'pending spin': t, pending: n, passed: e, failed: i });
function sAe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 12)(1, 'button', 13),
      x('click', function () {
        return (D(e), E(g(2).onTabChange('mic')));
      }),
      T(2, 'i', 16),
      v(3, ' Mic Test '),
      u()());
  }
  if (2 & t) {
    const e = g(2);
    (m(), Et('active', 'mic' === e.activeTab));
  }
}
function rAe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'ul', 7)(1, 'li', 12)(2, 'button', 13),
      x('click', function () {
        return (D(e), E(g().onTabChange('network')));
      }),
      T(3, 'i', 14),
      v(4, ' Network Test '),
      u()(),
      H(5, sAe, 4, 2, 'li', 15),
      u());
  }
  if (2 & t) {
    const e = g();
    (m(2),
      Et('active', 'network' === e.activeTab),
      m(3),
      z('ngIf', e.appService.globals.isPresenter));
  }
}
function aAe(t, n) {
  1 & t && (Jn(0), v(1, '...'), Zn());
}
function lAe(t, n) {
  1 & t && (Jn(0), v(1, '\u25cf'), Zn());
}
function cAe(t, n) {
  1 & t && (Jn(0), v(1, '\u2714'), Zn());
}
function dAe(t, n) {
  1 & t && (Jn(0), v(1, '\u2716'), Zn());
}
function uAe(t, n) {
  1 & t && (Jn(0), v(1, '...'), Zn());
}
function hAe(t, n) {
  1 & t && (Jn(0), v(1, '\u25cf'), Zn());
}
function pAe(t, n) {
  1 & t && (Jn(0), v(1, '\u2714'), Zn());
}
function fAe(t, n) {
  1 & t && (Jn(0), v(1, '\u2716'), Zn());
}
function mAe(t, n) {
  1 & t && (Jn(0), v(1, '...'), Zn());
}
function gAe(t, n) {
  1 & t && (Jn(0), v(1, '\u25cf'), Zn());
}
function _Ae(t, n) {
  1 & t && (Jn(0), v(1, '\u2714'), Zn());
}
function bAe(t, n) {
  1 & t && (Jn(0), v(1, '\u2716'), Zn());
}
function vAe(t, n) {
  1 & t && (Jn(0), v(1, '...'), Zn());
}
function yAe(t, n) {
  1 & t && (Jn(0), v(1, '\u25cf'), Zn());
}
function FAe(t, n) {
  1 & t && (Jn(0), v(1, '\u2714'), Zn());
}
function CAe(t, n) {
  1 & t && (Jn(0), v(1, '\u2716'), Zn());
}
function SAe(t, n) {
  if ((1 & t && (d(0, 'div', 23), v(1), u()), 2 & t)) {
    const e = g(2);
    (Et('alert-success', e.messageText.includes('passed'))(
      'alert-danger',
      e.messageText.includes('failed')
    ),
      m(),
      Ne(' ', e.messageText, ' '));
  }
}
function wAe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div')(1, 'p', 17),
      v(2, ' This tool checks your network and connectivity to essential WebRTC servers. '),
      u(),
      d(3, 'div', 18)(4, 'span', 19),
      v(5, 'UDP Enabled'),
      u(),
      d(6, 'span', 20),
      H(7, aAe, 2, 0, 'ng-container', 9)(8, lAe, 2, 0, 'ng-container', 9)(
        9,
        cAe,
        2,
        0,
        'ng-container',
        9
      )(10, dAe, 2, 0, 'ng-container', 9),
      u()(),
      d(11, 'div', 18)(12, 'span', 19),
      v(13, 'TCP Enabled'),
      u(),
      d(14, 'span', 20),
      H(15, uAe, 2, 0, 'ng-container', 9)(16, hAe, 2, 0, 'ng-container', 9)(
        17,
        pAe,
        2,
        0,
        'ng-container',
        9
      )(18, fAe, 2, 0, 'ng-container', 9),
      u()(),
      d(19, 'div', 18)(20, 'span', 19),
      v(21, 'STUN Server Connectivity'),
      u(),
      d(22, 'span', 20),
      H(23, mAe, 2, 0, 'ng-container', 9)(24, gAe, 2, 0, 'ng-container', 9)(
        25,
        _Ae,
        2,
        0,
        'ng-container',
        9
      )(26, bAe, 2, 0, 'ng-container', 9),
      u()(),
      d(27, 'div', 21)(28, 'span', 19),
      v(29, 'TURN Server Connectivity'),
      u(),
      d(30, 'span', 20),
      H(31, vAe, 2, 0, 'ng-container', 9)(32, yAe, 2, 0, 'ng-container', 9)(
        33,
        FAe,
        2,
        0,
        'ng-container',
        9
      )(34, CAe, 2, 0, 'ng-container', 9),
      u()(),
      H(35, SAe, 2, 5, 'div', 22),
      u()),
    2 & t)
  ) {
    const e = g();
    (m(3),
      z('ngClass', Kn(25, d0, 'passed' === e.testStates.udp, 'failed' === e.testStates.udp)),
      m(3),
      z(
        'ngClass',
        Vh(
          28,
          u0,
          'pending' === e.testStates.udp && e.isTestRunning,
          'pending' === e.testStates.udp && !e.isTestRunning,
          'passed' === e.testStates.udp,
          'failed' === e.testStates.udp
        )
      ),
      m(),
      z('ngIf', 'pending' === e.testStates.udp && e.isTestRunning),
      m(),
      z('ngIf', 'pending' === e.testStates.udp && !e.isTestRunning),
      m(),
      z('ngIf', 'passed' === e.testStates.udp),
      m(),
      z('ngIf', 'failed' === e.testStates.udp),
      m(),
      z('ngClass', Kn(33, d0, 'passed' === e.testStates.tcp, 'failed' === e.testStates.tcp)),
      m(3),
      z(
        'ngClass',
        Vh(
          36,
          u0,
          'pending' === e.testStates.tcp && e.isTestRunning,
          'pending' === e.testStates.tcp && !e.isTestRunning,
          'passed' === e.testStates.tcp,
          'failed' === e.testStates.tcp
        )
      ),
      m(),
      z('ngIf', 'pending' === e.testStates.tcp && e.isTestRunning),
      m(),
      z('ngIf', 'pending' === e.testStates.tcp && !e.isTestRunning),
      m(),
      z('ngIf', 'passed' === e.testStates.tcp),
      m(),
      z('ngIf', 'failed' === e.testStates.tcp),
      m(),
      z('ngClass', Kn(41, d0, 'passed' === e.testStates.stun, 'failed' === e.testStates.stun)),
      m(3),
      z(
        'ngClass',
        Vh(
          44,
          u0,
          'pending' === e.testStates.stun && e.isTestRunning,
          'pending' === e.testStates.stun && !e.isTestRunning,
          'passed' === e.testStates.stun,
          'failed' === e.testStates.stun
        )
      ),
      m(),
      z('ngIf', 'pending' === e.testStates.stun && e.isTestRunning),
      m(),
      z('ngIf', 'pending' === e.testStates.stun && !e.isTestRunning),
      m(),
      z('ngIf', 'passed' === e.testStates.stun),
      m(),
      z('ngIf', 'failed' === e.testStates.stun),
      m(),
      z('ngClass', Kn(49, d0, 'passed' === e.testStates.turn, 'failed' === e.testStates.turn)),
      m(3),
      z(
        'ngClass',
        Vh(
          52,
          u0,
          'pending' === e.testStates.turn && e.isTestRunning,
          'pending' === e.testStates.turn && !e.isTestRunning,
          'passed' === e.testStates.turn,
          'failed' === e.testStates.turn
        )
      ),
      m(),
      z('ngIf', 'pending' === e.testStates.turn && e.isTestRunning),
      m(),
      z('ngIf', 'pending' === e.testStates.turn && !e.isTestRunning),
      m(),
      z('ngIf', 'passed' === e.testStates.turn),
      m(),
      z('ngIf', 'failed' === e.testStates.turn),
      m(),
      z('ngIf', e.showMessage));
  }
}
function TAe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 26)(1, 'div', 27),
      T(2, 'i', 28),
      u(),
      d(3, 'h5', 29),
      v(4, 'No Microphone Detected'),
      u(),
      d(5, 'p', 30),
      v(
        6,
        ' Please connect a microphone to your computer and make sure it is enabled in your system settings. '
      ),
      u(),
      d(7, 'button', 31),
      x('click', function () {
        return (D(e), E(g(2).loadMicDevices()));
      }),
      T(8, 'i', 32),
      v(9, ' Retry Detection '),
      u()());
  }
}
function DAe(t, n) {
  1 & t &&
    (d(0, 'div', 26)(1, 'div', 33),
    T(2, 'i', 34),
    u(),
    d(3, 'p', 30),
    v(4, 'Detecting microphones...'),
    u()());
}
function EAe(t, n) {
  if ((1 & t && (d(0, 'option', 59), v(1), u()), 2 & t)) {
    const e = n.$implicit;
    (z('value', e.deviceId),
      m(),
      Ne(' ', e.label || 'Microphone (' + e.deviceId.slice(0, 8) + '...)', ' '));
  }
}
function kAe(t, n) {
  1 & t &&
    (d(0, 'div', 60), T(1, 'i', 61), d(2, 'span'), v(3, 'Start test to see waveform'), u()());
}
function xAe(t, n) {
  1 & t && (d(0, 'span', 62), v(1, 'Ready to test'), u());
}
function MAe(t, n) {
  1 & t && (d(0, 'span', 62), v(1, 'Listening...'), u());
}
function AAe(t, n) {
  1 & t && (d(0, 'span', 62), v(1, 'Microphone is working!'), u());
}
function PAe(t, n) {
  1 & t && (d(0, 'span', 62), v(1, 'No audio detected \u2014 check your mic'), u());
}
function RAe(t, n) {
  if ((1 & t && (d(0, 'span', 62), v(1), u()), 2 & t)) {
    const e = g(3);
    (m(), Ze(e.micErrorMessage));
  }
}
function IAe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 31),
      x('click', function () {
        return (D(e), E(g(3).startMicTest()));
      }),
      T(1, 'i', 63),
      v(2, ' Start Test '),
      u());
  }
}
function OAe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 64),
      x('click', function () {
        return (D(e), E(g(3).stopMicTest()));
      }),
      T(1, 'i', 65),
      v(2, ' Stop '),
      u());
  }
}
function NAe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 66),
      x('click', function () {
        return (D(e), E(g(3).startRecording()));
      }),
      T(1, 'i', 67),
      v(2, ' Record '),
      u());
  }
  2 & t && Et('recording', g(3).isRecording);
}
function LAe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 68),
      x('click', function () {
        return (D(e), E(g(3).stopRecording()));
      }),
      T(1, 'i', 65),
      v(2),
      u());
  }
  if (2 & t) {
    const e = g(3);
    (m(2), Ne(' Stop (', e.recordingDuration, 's) '));
  }
}
function BAe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 69)(1, 'button', 70),
      x('click', function () {
        return (D(e), E(g(3).playRecording()));
      }),
      T(2, 'i', 71),
      v(3),
      u()());
  }
  if (2 & t) {
    const e = g(3);
    (m(),
      z('disabled', e.isPlayingBack),
      m(),
      Et('fa-play', !e.isPlayingBack)('fa-volume-up', e.isPlayingBack),
      m(),
      Ne(' ', e.isPlayingBack ? 'Playing...' : 'Play Recording', ' '));
  }
}
function UAe(t, n) {
  if (1 & t) {
    const e = Y();
    (Jn(0),
      d(1, 'p', 35),
      v(2, ' Test your microphone, visualize audio input, and record a sample to play back. '),
      u(),
      d(3, 'div', 36)(4, 'label', 37),
      v(5, 'Microphone Device'),
      u(),
      d(6, 'select', 38),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.selectedDeviceId, o) || (s.selectedDeviceId = o), E(o));
      }),
      H(7, EAe, 2, 2, 'option', 39),
      u()(),
      d(8, 'div', 40),
      T(9, 'canvas', 41, 0),
      H(11, kAe, 4, 0, 'div', 42),
      u(),
      d(12, 'div', 43)(13, 'div', 44)(14, 'span', 45),
      v(15, 'Volume Level'),
      u(),
      d(16, 'span', 46),
      v(17),
      u()(),
      d(18, 'div', 47),
      T(19, 'div', 48),
      u()(),
      d(20, 'div', 49),
      T(21, 'span', 50),
      H(22, xAe, 2, 0, 'span', 51)(23, MAe, 2, 0, 'span', 51)(24, AAe, 2, 0, 'span', 51)(
        25,
        PAe,
        2,
        0,
        'span',
        51
      )(26, RAe, 2, 1, 'span', 51),
      u(),
      d(27, 'div', 52)(28, 'div', 53),
      H(29, IAe, 3, 0, 'button', 54)(30, OAe, 3, 0, 'button', 55)(31, NAe, 3, 2, 'button', 56)(
        32,
        LAe,
        3,
        1,
        'button',
        57
      ),
      u(),
      H(33, BAe, 4, 6, 'div', 58),
      u(),
      Zn());
  }
  if (2 & t) {
    const e = g(2);
    (m(6),
      je('ngModel', e.selectedDeviceId),
      z('disabled', e.isMicTesting),
      m(),
      z('ngForOf', e.micDevices),
      m(),
      Et('active', e.isMicTesting),
      m(3),
      z('ngIf', !e.isMicTesting),
      m(5),
      Et('active', e.isMicTesting),
      m(),
      Ne('', e.micLevel, '%'),
      m(2),
      No('width', e.micLevel, '%'),
      Et('low', e.micLevel <= 30)('mid', e.micLevel > 30 && e.micLevel <= 70)(
        'high',
        e.micLevel > 70
      ),
      m(),
      z('ngClass', 'mic-status-' + e.micStatus),
      m(2),
      z('ngIf', 'idle' === e.micStatus),
      m(),
      z('ngIf', 'testing' === e.micStatus),
      m(),
      z('ngIf', 'success' === e.micStatus),
      m(),
      z('ngIf', 'no-audio' === e.micStatus),
      m(),
      z('ngIf', 'error' === e.micStatus),
      m(3),
      z('ngIf', !e.isMicTesting),
      m(),
      z('ngIf', e.isMicTesting),
      m(),
      z('ngIf', e.isMicTesting && !e.isRecording),
      m(),
      z('ngIf', e.isRecording),
      m(),
      z('ngIf', e.recordedAudioUrl));
  }
}
function jAe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 24),
      H(1, TAe, 10, 0, 'div', 25)(2, DAe, 5, 0, 'div', 25)(3, UAe, 34, 28, 'ng-container', 9),
      u()),
    2 & t)
  ) {
    const e = g();
    (m(),
      z('ngIf', 0 === e.micDevices.length && !e.micDevicesLoading && e.micDevicesLoaded),
      m(),
      z('ngIf', e.micDevicesLoading),
      m(),
      z('ngIf', e.micDevices.length > 0));
  }
}
function VAe(t, n) {
  1 & t && T(0, 'i', 79);
}
function HAe(t, n) {
  1 & t && T(0, 'i', 34);
}
function $Ae(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 72)(1, 'button', 73),
      x('click', function () {
        return (D(e), E(g().runWebRTCTest()));
      }),
      H(2, VAe, 1, 0, 'i', 74)(3, HAe, 1, 0, 'i', 75),
      v(4),
      u(),
      d(5, 'button', 76),
      x('click', function () {
        return (D(e), E(g().copyResults()));
      }),
      T(6, 'i', 77),
      v(7, ' Copy Results '),
      u(),
      d(8, 'button', 78),
      v(9, ' Close '),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(),
      z('disabled', e.isTestRunning),
      m(),
      z('ngIf', !e.isTestRunning),
      m(),
      z('ngIf', e.isTestRunning),
      m(),
      Ne(' ', e.isTestRunning ? 'Testing...' : 'Start Test', ' '));
  }
}
function zAe(t, n) {
  1 & t && (d(0, 'div', 72)(1, 'button', 78), v(2, ' Close '), u()());
}
