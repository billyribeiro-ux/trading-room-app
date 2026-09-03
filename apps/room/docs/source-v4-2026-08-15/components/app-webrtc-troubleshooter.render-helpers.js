const cAe = ['waveformCanvas'],
  u0 = (t, n) => ({ passed: t, failed: n }),
  h0 = (t, n, e, i) => ({ 'pending spin': t, pending: n, passed: e, failed: i });
function dAe(t, n) {
  1 & t && v(0, ' Connectivity/Mic Troubleshooter ');
}
function uAe(t, n) {
  1 & t && v(0, ' Connectivity Troubleshooter ');
}
function hAe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 9)(1, 'button', 10),
      x('click', function () {
        return (D(e), E(g().onTabChange('network')));
      }),
      T(2, 'i', 17),
      v(3, ' Network Test '),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(), Tt('active', 'network' === e.activeTab));
  }
}
function pAe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 9)(1, 'button', 10),
      x('click', function () {
        return (D(e), E(g().onTabChange('mic')));
      }),
      T(2, 'i', 18),
      v(3, ' Mic Test '),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(), Tt('active', 'mic' === e.activeTab));
  }
}
function fAe(t, n) {
  1 & t && (Jn(0), v(1, '...'), Zn());
}
function mAe(t, n) {
  1 & t && (Jn(0), v(1, '\u25cf'), Zn());
}
function gAe(t, n) {
  1 & t && (Jn(0), v(1, '\u2714'), Zn());
}
function _Ae(t, n) {
  1 & t && (Jn(0), v(1, '\u2716'), Zn());
}
function bAe(t, n) {
  1 & t && (Jn(0), v(1, '...'), Zn());
}
function vAe(t, n) {
  1 & t && (Jn(0), v(1, '\u25cf'), Zn());
}
function yAe(t, n) {
  1 & t && (Jn(0), v(1, '\u2714'), Zn());
}
function FAe(t, n) {
  1 & t && (Jn(0), v(1, '\u2716'), Zn());
}
function CAe(t, n) {
  1 & t && (Jn(0), v(1, '...'), Zn());
}
function SAe(t, n) {
  1 & t && (Jn(0), v(1, '\u25cf'), Zn());
}
function wAe(t, n) {
  1 & t && (Jn(0), v(1, '\u2714'), Zn());
}
function TAe(t, n) {
  1 & t && (Jn(0), v(1, '\u2716'), Zn());
}
function DAe(t, n) {
  1 & t && (Jn(0), v(1, '...'), Zn());
}
function EAe(t, n) {
  1 & t && (Jn(0), v(1, '\u25cf'), Zn());
}
function kAe(t, n) {
  1 & t && (Jn(0), v(1, '\u2714'), Zn());
}
function xAe(t, n) {
  1 & t && (Jn(0), v(1, '\u2716'), Zn());
}
function MAe(t, n) {
  if ((1 & t && (d(0, 'div', 25), v(1), u()), 2 & t)) {
    const e = g(2);
    (Tt('alert-success', e.messageText.includes('passed'))(
      'alert-danger',
      e.messageText.includes('failed')
    ),
      m(),
      Ne(' ', e.messageText, ' '));
  }
}
function AAe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div')(1, 'p', 19),
      v(2, ' This tool checks your network and connectivity to essential WebRTC servers. '),
      u(),
      d(3, 'div', 20)(4, 'span', 21),
      v(5, 'UDP Enabled'),
      u(),
      d(6, 'span', 22),
      H(7, fAe, 2, 0, 'ng-container', 13)(8, mAe, 2, 0, 'ng-container', 13)(
        9,
        gAe,
        2,
        0,
        'ng-container',
        13
      )(10, _Ae, 2, 0, 'ng-container', 13),
      u()(),
      d(11, 'div', 20)(12, 'span', 21),
      v(13, 'TCP Enabled'),
      u(),
      d(14, 'span', 22),
      H(15, bAe, 2, 0, 'ng-container', 13)(16, vAe, 2, 0, 'ng-container', 13)(
        17,
        yAe,
        2,
        0,
        'ng-container',
        13
      )(18, FAe, 2, 0, 'ng-container', 13),
      u()(),
      d(19, 'div', 20)(20, 'span', 21),
      v(21, 'STUN Server Connectivity'),
      u(),
      d(22, 'span', 22),
      H(23, CAe, 2, 0, 'ng-container', 13)(24, SAe, 2, 0, 'ng-container', 13)(
        25,
        wAe,
        2,
        0,
        'ng-container',
        13
      )(26, TAe, 2, 0, 'ng-container', 13),
      u()(),
      d(27, 'div', 23)(28, 'span', 21),
      v(29, 'TURN Server Connectivity'),
      u(),
      d(30, 'span', 22),
      H(31, DAe, 2, 0, 'ng-container', 13)(32, EAe, 2, 0, 'ng-container', 13)(
        33,
        kAe,
        2,
        0,
        'ng-container',
        13
      )(34, xAe, 2, 0, 'ng-container', 13),
      u()(),
      H(35, MAe, 2, 5, 'div', 24),
      u()),
    2 & t)
  ) {
    const e = g();
    (m(3),
      z('ngClass', Kn(25, u0, 'passed' === e.testStates.udp, 'failed' === e.testStates.udp)),
      m(3),
      z(
        'ngClass',
        Vh(
          28,
          h0,
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
      z('ngClass', Kn(33, u0, 'passed' === e.testStates.tcp, 'failed' === e.testStates.tcp)),
      m(3),
      z(
        'ngClass',
        Vh(
          36,
          h0,
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
      z('ngClass', Kn(41, u0, 'passed' === e.testStates.stun, 'failed' === e.testStates.stun)),
      m(3),
      z(
        'ngClass',
        Vh(
          44,
          h0,
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
      z('ngClass', Kn(49, u0, 'passed' === e.testStates.turn, 'failed' === e.testStates.turn)),
      m(3),
      z(
        'ngClass',
        Vh(
          52,
          h0,
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
function PAe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 26)(1, 'p', 19),
      v(
        2,
        ' Use this to restore your mobile app connectivity and get a test notification on your device. Only do this if you are not getting notifications '
      ),
      u(),
      d(3, 'button', 27),
      x('click', function () {
        return (D(e), E(g().restoreMobileAppTokens()));
      }),
      T(4, 'i', 28),
      v(5, ' Restore Connectivity '),
      u()());
  }
}
function RAe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 31)(1, 'div', 32),
      T(2, 'i', 33),
      u(),
      d(3, 'h5', 34),
      v(4, 'No Microphone Detected'),
      u(),
      d(5, 'p', 35),
      v(
        6,
        ' Please connect a microphone to your computer and make sure it is enabled in your system settings. '
      ),
      u(),
      d(7, 'button', 36),
      x('click', function () {
        return (D(e), E(g(2).loadMicDevices()));
      }),
      T(8, 'i', 37),
      v(9, ' Retry Detection '),
      u()());
  }
}
function IAe(t, n) {
  1 & t &&
    (d(0, 'div', 31)(1, 'div', 38),
    T(2, 'i', 39),
    u(),
    d(3, 'p', 35),
    v(4, 'Detecting microphones...'),
    u()());
}
function OAe(t, n) {
  if ((1 & t && (d(0, 'option', 64), v(1), u()), 2 & t)) {
    const e = n.$implicit;
    (z('value', e.deviceId),
      m(),
      Ne(' ', e.label || 'Microphone (' + e.deviceId.slice(0, 8) + '...)', ' '));
  }
}
function NAe(t, n) {
  1 & t &&
    (d(0, 'div', 65), T(1, 'i', 66), d(2, 'span'), v(3, 'Start test to see waveform'), u()());
}
function LAe(t, n) {
  1 & t && (d(0, 'span', 67), v(1, 'Ready to test'), u());
}
function BAe(t, n) {
  1 & t && (d(0, 'span', 67), v(1, 'Listening...'), u());
}
function UAe(t, n) {
  1 & t && (d(0, 'span', 67), v(1, 'Microphone is working!'), u());
}
function jAe(t, n) {
  1 & t && (d(0, 'span', 67), v(1, 'No audio detected \u2014 check your mic'), u());
}
function VAe(t, n) {
  if ((1 & t && (d(0, 'span', 67), v(1), u()), 2 & t)) {
    const e = g(3);
    (m(), Ze(e.micErrorMessage));
  }
}
function HAe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 36),
      x('click', function () {
        return (D(e), E(g(3).startMicTest()));
      }),
      T(1, 'i', 68),
      v(2, ' Start Test '),
      u());
  }
}
function $Ae(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 69),
      x('click', function () {
        return (D(e), E(g(3).stopMicTest()));
      }),
      T(1, 'i', 70),
      v(2, ' Stop '),
      u());
  }
}
function zAe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 71),
      x('click', function () {
        return (D(e), E(g(3).startRecording()));
      }),
      T(1, 'i', 72),
      v(2, ' Record '),
      u());
  }
  2 & t && Tt('recording', g(3).isRecording);
}
function GAe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 73),
      x('click', function () {
        return (D(e), E(g(3).stopRecording()));
      }),
      T(1, 'i', 70),
      v(2),
      u());
  }
  if (2 & t) {
    const e = g(3);
    (m(2), Ne(' Stop (', e.recordingDuration, 's) '));
  }
}
function WAe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 74)(1, 'button', 75),
      x('click', function () {
        return (D(e), E(g(3).playRecording()));
      }),
      T(2, 'i', 76),
      v(3),
      u()());
  }
  if (2 & t) {
    const e = g(3);
    (m(),
      z('disabled', e.isPlayingBack),
      m(),
      Tt('fa-play', !e.isPlayingBack)('fa-volume-up', e.isPlayingBack),
      m(),
      Ne(' ', e.isPlayingBack ? 'Playing...' : 'Play Recording', ' '));
  }
}
function qAe(t, n) {
  if (1 & t) {
    const e = Y();
    (Jn(0),
      d(1, 'p', 40),
      v(2, ' Test your microphone, visualize audio input, and record a sample to play back. '),
      u(),
      d(3, 'div', 41)(4, 'label', 42),
      v(5, 'Microphone Device'),
      u(),
      d(6, 'select', 43),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.selectedDeviceId, o) || (s.selectedDeviceId = o), E(o));
      }),
      H(7, OAe, 2, 2, 'option', 44),
      u()(),
      d(8, 'div', 45),
      T(9, 'canvas', 46, 0),
      H(11, NAe, 4, 0, 'div', 47),
      u(),
      d(12, 'div', 48)(13, 'div', 49)(14, 'span', 50),
      v(15, 'Volume Level'),
      u(),
      d(16, 'span', 51),
      v(17),
      u()(),
      d(18, 'div', 52),
      T(19, 'div', 53),
      u()(),
      d(20, 'div', 54),
      T(21, 'span', 55),
      H(22, LAe, 2, 0, 'span', 56)(23, BAe, 2, 0, 'span', 56)(24, UAe, 2, 0, 'span', 56)(
        25,
        jAe,
        2,
        0,
        'span',
        56
      )(26, VAe, 2, 1, 'span', 56),
      u(),
      d(27, 'div', 57)(28, 'div', 58),
      H(29, HAe, 3, 0, 'button', 59)(30, $Ae, 3, 0, 'button', 60)(31, zAe, 3, 2, 'button', 61)(
        32,
        GAe,
        3,
        1,
        'button',
        62
      ),
      u(),
      H(33, WAe, 4, 6, 'div', 63),
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
      Tt('active', e.isMicTesting),
      m(3),
      z('ngIf', !e.isMicTesting),
      m(5),
      Tt('active', e.isMicTesting),
      m(),
      Ne('', e.micLevel, '%'),
      m(2),
      Lo('width', e.micLevel, '%'),
      Tt('low', e.micLevel <= 30)('mid', e.micLevel > 30 && e.micLevel <= 70)(
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
function KAe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 29),
      H(1, RAe, 10, 0, 'div', 30)(2, IAe, 5, 0, 'div', 30)(3, qAe, 34, 28, 'ng-container', 13),
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
function YAe(t, n) {
  1 & t && T(0, 'i', 84);
}
function QAe(t, n) {
  1 & t && T(0, 'i', 39);
}
function XAe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 77)(1, 'button', 78),
      x('click', function () {
        return (D(e), E(g().runWebRTCTest()));
      }),
      H(2, YAe, 1, 0, 'i', 79)(3, QAe, 1, 0, 'i', 80),
      v(4),
      u(),
      d(5, 'button', 81),
      x('click', function () {
        return (D(e), E(g().copyResults()));
      }),
      T(6, 'i', 82),
      v(7, ' Copy Results '),
      u(),
      d(8, 'button', 83),
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
function JAe(t, n) {
  1 & t && (d(0, 'div', 77)(1, 'button', 83), v(2, ' Close '), u()());
}
