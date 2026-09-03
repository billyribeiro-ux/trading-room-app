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
GB = (() => {
  class t {
    constructor(e, i) {
      ((this.ngZone = e),
        (this.appService = i),
        (this.activeTab = 'network'),
        (this.testResults = { udp: !1, tcp: !1, stun: !1, turn: !1 }),
        (this.testStates = { udp: 'pending', tcp: 'pending', stun: 'pending', turn: 'pending' }),
        (this.isTestRunning = !1),
        (this.showMessage = !1),
        (this.messageText = ''),
        (this.micDevices = []),
        (this.micDevicesLoading = !1),
        (this.micDevicesLoaded = !1),
        (this.selectedDeviceId = ''),
        (this.isMicTesting = !1),
        (this.micLevel = 0),
        (this.micStatus = 'idle'),
        (this.micErrorMessage = ''),
        (this.micStream = null),
        (this.audioContext = null),
        (this.analyser = null),
        (this.animationFrameId = 0),
        (this.noAudioTimeout = null),
        (this.audioDetected = !1),
        (this.isRecording = !1),
        (this.mediaRecorder = null),
        (this.recordedChunks = []),
        (this.recordedAudioUrl = null),
        (this.recordingDuration = 0),
        (this.recordingInterval = null),
        (this.isPlayingBack = !1),
        (this.playbackAudio = null),
        (this.activeTab = this.appService.globals.isPresenter ? 'network' : 'mobile'));
    }
    ngOnInit() {
      (this.setupModalResetListener(), this.loadMicDevices());
    }
    ngOnDestroy() {
      this.cleanupMicTest();
    }
    setupModalResetListener() {
      setTimeout(() => {
        const e = document.getElementById('webrtc-troubleshooter-modal');
        e &&
          (e.addEventListener('show.bs.modal', () => {
            (this.resetTestResults(), this.loadMicDevices());
          }),
          e.addEventListener('hide.bs.modal', () => {
            ((this.isTestRunning = !1), this.cleanupMicTest());
          }));
      }, 100);
    }
    resetTestResults() {
      ((this.testStates = { udp: 'pending', tcp: 'pending', stun: 'pending', turn: 'pending' }),
        (this.testResults = { udp: !1, tcp: !1, stun: !1, turn: !1 }),
        (this.showMessage = !1),
        (this.messageText = ''),
        (this.isTestRunning = !1),
        (this.micStatus = 'idle'),
        (this.micLevel = 0),
        (this.micErrorMessage = ''));
    }
    onTabChange(e) {
      e !== this.activeTab &&
        ('mic' === this.activeTab && this.cleanupMicTest(), (this.activeTab = e));
    }
    restoreMobileAppTokens() {
      (this.appService.sendServerCommand('restoreMobileAppTokens', {}),
        bootbox.alert(
          'Command sent successfully, check your mobile device for a test notification'
        ));
    }
    showMessageBox(e, i = 3e3) {
      ((this.messageText = e),
        (this.showMessage = !0),
        setTimeout(() => {
          this.showMessage = !1;
        }, i));
    }
    runWebRTCTest() {
      var e = this;
      return I(function* () {
        ((e.testStates = { udp: 'pending', tcp: 'pending', stun: 'pending', turn: 'pending' }),
          (e.testResults = { udp: !1, tcp: !1, stun: !1, turn: !1 }),
          (e.isTestRunning = !0));
        const i = {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            {
              urls: 'turn:flash.protradingroom.com:3478?transport=udp',
              username: 'ptrUser',
              credential: 'ptr123'
            },
            {
              urls: 'turn:flash.protradingroom.com:3478?transport=tcp',
              username: 'ptrUser',
              credential: 'ptr123'
            }
          ]
        };
        let o;
        try {
          o = new RTCPeerConnection(i);
        } catch (s) {
          return (
            console.error('Failed to create RTCPeerConnection', s),
            e.showMessageBox('WebRTC is not supported on this browser.'),
            void (e.isTestRunning = !1)
          );
        }
        ((o.onicecandidate = (s) => {
          if (s.candidate) {
            const r = s.candidate.candidate;
            (console.log('Candidate found:', r),
              r.includes('udp') &&
                !e.testResults.udp &&
                ((e.testResults.udp = !0), (e.testStates.udp = 'passed')),
              r.includes('tcp') &&
                !e.testResults.tcp &&
                ((e.testResults.tcp = !0), (e.testStates.tcp = 'passed')),
              r.includes('typ srflx') &&
                !e.testResults.stun &&
                ((e.testResults.stun = !0),
                (e.testStates.stun = 'passed'),
                e.showMessageBox('STUN connectivity test passed!')),
              r.includes('typ relay') &&
                !e.testResults.turn &&
                ((e.testResults.turn = !0),
                (e.testStates.turn = 'passed'),
                e.showMessageBox('TURN connectivity test passed!')));
          }
        }),
          o.createDataChannel('test'));
        try {
          const s = yield o.createOffer();
          yield o.setLocalDescription(s);
        } catch (s) {
          return (
            console.error('Failed to create offer:', s),
            e.showMessageBox('Failed to initiate test. Check console for details.'),
            void (e.isTestRunning = !1)
          );
        }
        setTimeout(() => {
          (e.testResults.udp || (e.testStates.udp = 'failed'),
            e.testResults.tcp || (e.testStates.tcp = 'failed'),
            e.testResults.stun ||
              ((e.testStates.stun = 'failed'),
              e.showMessageBox('STUN connectivity test failed. Check your network.', 5e3)),
            e.testResults.turn ||
              ((e.testStates.turn = 'failed'),
              e.showMessageBox(
                'TURN connectivity test failed. Check your network or firewall.',
                5e3
              )),
            o && 'complete' !== o.iceGatheringState && o.close(),
            (e.isTestRunning = !1));
        }, 1e4);
      })();
    }
    copyResults() {
      const e = [
        'UDP: ' + (this.testResults.udp ? 'OK' : 'FAILED'),
        'TCP: ' + (this.testResults.tcp ? 'OK' : 'FAILED'),
        'STUN Server Connectivity: ' + (this.testResults.stun ? 'OK' : 'FAILED'),
        'TURN Server Connectivity: ' + (this.testResults.turn ? 'OK' : 'FAILED')
      ].join('\n');
      navigator.clipboard
        .writeText(e)
        .then(() => {
          this.showMessageBox('Test results copied to clipboard!');
        })
        .catch((i) => {
          (console.error('Failed to copy results: ', i),
            this.showMessageBox('Failed to copy results to clipboard.'));
        });
    }
    loadMicDevices() {
      var e = this;
      return I(function* () {
        if (e.appService.globals.isPresenter) {
          ((e.micDevicesLoading = !0), (e.micDevicesLoaded = !1));
          try {
            (yield navigator.mediaDevices.getUserMedia({ audio: !0 }))
              .getTracks()
              .forEach((r) => r.stop());
            const s = (yield navigator.mediaDevices.enumerateDevices()).filter(
              (r) => 'audioinput' === r.kind
            );
            ((e.micDevices = s.filter((r) => {
              const a = 'default' === r.deviceId || 'communications' === r.deviceId;
              let l = !1;
              if (r.label.toLowerCase().startsWith('default - ')) {
                const c = r.label.substring(10);
                l = s.some((h) => h.kind === r.kind && h.label === c && h.deviceId !== r.deviceId);
              }
              return !a && !l;
            })),
              e.micDevices.length > 0 &&
                !e.selectedDeviceId &&
                (e.selectedDeviceId = e.micDevices[0].deviceId));
          } catch (i) {
            (console.warn('Could not enumerate mic devices:', i), (e.micDevices = []));
          } finally {
            ((e.micDevicesLoading = !1), (e.micDevicesLoaded = !0));
          }
        }
      })();
    }
    startMicTest() {
      var e = this;
      return I(function* () {
        (e.cleanupMicTest(),
          (e.micStatus = 'testing'),
          (e.micLevel = 0),
          (e.audioDetected = !1),
          (e.recordedAudioUrl = null));
        const i = { audio: !e.selectedDeviceId || { deviceId: { exact: e.selectedDeviceId } } };
        try {
          e.micStream = yield navigator.mediaDevices.getUserMedia(i);
        } catch (s) {
          return (
            (e.micStatus = 'error'),
            void (e.micErrorMessage =
              'NotAllowedError' === s.name
                ? 'Microphone access denied. Please allow mic permission.'
                : 'NotFoundError' === s.name
                  ? 'No microphone found. Please connect a mic.'
                  : 'Could not access microphone: ' + (s.message || s.name))
          );
        }
        ((e.isMicTesting = !0), (e.audioContext = new AudioContext()));
        const o = e.audioContext.createMediaStreamSource(e.micStream);
        ((e.analyser = e.audioContext.createAnalyser()),
          (e.analyser.fftSize = 2048),
          (e.analyser.smoothingTimeConstant = 0.8),
          o.connect(e.analyser),
          e.ngZone.runOutsideAngular(() => {
            e.drawLoop();
          }),
          (e.noAudioTimeout = setTimeout(() => {
            !e.audioDetected &&
              e.isMicTesting &&
              e.ngZone.run(() => {
                e.micStatus = 'no-audio';
              });
          }, 4e3)));
      })();
    }
    stopMicTest() {
      (this.cleanupMicTest(), 'testing' === this.micStatus && (this.micStatus = 'idle'));
    }
    drawLoop() {
      if (!this.analyser || !this.isMicTesting) return;
      const e = this.waveformCanvasRef?.nativeElement;
      if (!e) return void (this.animationFrameId = requestAnimationFrame(() => this.drawLoop()));
      const i = e.getContext('2d'),
        o = this.analyser.frequencyBinCount,
        s = new Uint8Array(o),
        r = new Uint8Array(o),
        a = () => {
          if (!this.analyser || !this.isMicTesting) return;
          ((this.animationFrameId = requestAnimationFrame(a)),
            this.analyser.getByteTimeDomainData(s),
            this.analyser.getByteFrequencyData(r));
          let l = 0;
          for (let W = 0; W < o; W++) {
            const J = (s[W] - 128) / 128;
            l += J * J;
          }
          const c = Math.sqrt(l / o),
            h = Math.min(100, Math.round(300 * c));
          (h > 5 &&
            !this.audioDetected &&
            ((this.audioDetected = !0),
            this.ngZone.run(() => {
              this.micStatus = 'success';
            })),
            this.ngZone.run(() => {
              this.micLevel = h;
            }));
          const f = e.width,
            _ = e.height;
          ((i.fillStyle = '#0f172a'), i.fillRect(0, 0, f, _));
          const S = f / 64,
            w = Math.floor(o / 64);
          for (let W = 0; W < 64; W++) {
            const J = r[W * w] / 255,
              te = J * _ * 0.6;
            ((i.fillStyle = `hsla(${160 - 120 * J}, 90%, 55%, 0.25)`),
              i.fillRect(W * S, _ - te, S - 1, te));
          }
          ((i.lineWidth = 2), i.beginPath());
          const M = f / o;
          let B = 0;
          for (let W = 0; W < o; W++) {
            const J = s[W] / 128,
              te = (J * _) / 2,
              se = 180 - 140 * Math.abs(J - 1);
            ((i.strokeStyle = `hsl(${se}, 100%, 60%)`),
              0 === W ? i.moveTo(B, te) : i.lineTo(B, te),
              (B += M));
          }
          (i.stroke(),
            (i.shadowBlur = 8),
            (i.shadowColor = 'rgba(34, 211, 238, 0.4)'),
            (i.lineWidth = 1),
            i.beginPath(),
            (B = 0));
          for (let W = 0; W < o; W++) {
            const te = ((s[W] / 128) * _) / 2;
            (0 === W ? i.moveTo(B, te) : i.lineTo(B, te), (B += M));
          }
          ((i.strokeStyle = 'rgba(34, 211, 238, 0.5)'), i.stroke(), (i.shadowBlur = 0));
        };
      a();
    }
    startRecording() {
      if (this.micStream && this.isMicTesting) {
        ((this.recordedChunks = []),
          (this.recordingDuration = 0),
          this.recordedAudioUrl &&
            (URL.revokeObjectURL(this.recordedAudioUrl), (this.recordedAudioUrl = null)));
        try {
          this.mediaRecorder = new MediaRecorder(this.micStream);
        } catch (e) {
          return void console.error('MediaRecorder not supported:', e);
        }
        ((this.mediaRecorder.ondataavailable = (e) => {
          e.data.size > 0 && this.recordedChunks.push(e.data);
        }),
          (this.mediaRecorder.onstop = () => {
            const e = new Blob(this.recordedChunks, { type: 'audio/webm' });
            this.recordedAudioUrl = URL.createObjectURL(e);
          }),
          this.mediaRecorder.start(),
          (this.isRecording = !0),
          (this.recordingInterval = setInterval(() => {
            (this.recordingDuration++, this.recordingDuration >= 30 && this.stopRecording());
          }, 1e3)));
      }
    }
    stopRecording() {
      (this.mediaRecorder && 'inactive' !== this.mediaRecorder.state && this.mediaRecorder.stop(),
        (this.isRecording = !1),
        this.recordingInterval &&
          (clearInterval(this.recordingInterval), (this.recordingInterval = null)));
    }
    playRecording() {
      this.recordedAudioUrl &&
        ((this.isPlayingBack = !0),
        (this.playbackAudio = new Audio(this.recordedAudioUrl)),
        (this.playbackAudio.onended = () => {
          ((this.isPlayingBack = !1), (this.playbackAudio = null));
        }),
        (this.playbackAudio.onerror = () => {
          ((this.isPlayingBack = !1), (this.playbackAudio = null));
        }),
        this.playbackAudio.play());
    }
    cleanupMicTest() {
      this.appService.globals.isPresenter &&
        ((this.isMicTesting = !1),
        this.animationFrameId &&
          (cancelAnimationFrame(this.animationFrameId), (this.animationFrameId = 0)),
        this.noAudioTimeout && (clearTimeout(this.noAudioTimeout), (this.noAudioTimeout = null)),
        this.isRecording && this.stopRecording(),
        this.playbackAudio &&
          (this.playbackAudio.pause(), (this.playbackAudio = null), (this.isPlayingBack = !1)),
        this.micStream &&
          (this.micStream.getTracks().forEach((e) => e.stop()), (this.micStream = null)),
        this.audioContext &&
          'closed' !== this.audioContext.state &&
          (this.audioContext.close(), (this.audioContext = null)),
        (this.analyser = null),
        (this.micLevel = 0));
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Dt), be(Nt));
      };
    }
    static {
      this.ɵcmp = ut({
        type: t,
        selectors: [['app-webrtc-troubleshooter']],
        viewQuery: function (i, o) {
          if ((1 & i && Xt(cAe, 5), 2 & i)) {
            let s;
            yt((s = Ft())) && (o.waveformCanvasRef = s.first);
          }
        },
        decls: 21,
        vars: 10,
        consts: [
          ['waveformCanvas', ''],
          [
            'id',
            'webrtc-troubleshooter-modal',
            'tabIndex',
            '-1',
            'role',
            'dialog',
            'aria-labelledby',
            'webrtc-troubleshooter-modal',
            'aria-hidden',
            'true',
            1,
            'modal',
            'fade'
          ],
          ['role', 'document', 1, 'modal-dialog', 2, 'max-width', '540px'],
          [1, 'modal-content'],
          [1, 'modal-header'],
          [1, 'modal-title'],
          [
            'type',
            'button',
            'data-bs-dismiss',
            'modal',
            'aria-label',
            'Close',
            1,
            'btn-close',
            'btn-close-white'
          ],
          ['role', 'tablist', 1, 'nav', 'nav-tabs', 'troubleshooter-tabs'],
          ['class', 'nav-item', 'role', 'presentation', 4, 'ngIf'],
          ['role', 'presentation', 1, 'nav-item'],
          ['type', 'button', 'role', 'tab', 1, 'nav-link', 3, 'click'],
          [1, 'fas', 'fa-mobile-alt', 'me-1'],
          [1, 'modal-body'],
          [4, 'ngIf'],
          ['class', 'mobile-app-container', 4, 'ngIf'],
          ['class', 'mic-test-container', 4, 'ngIf'],
          ['class', 'modal-footer', 4, 'ngIf'],
          [1, 'fas', 'fa-network-wired', 'me-1'],
          [1, 'fas', 'fa-microphone', 'me-1'],
          [1, 'text-muted', 'mb-4'],
          [1, 'status-item', 'mb-3', 3, 'ngClass'],
          [1, 'fw-medium'],
          [1, 'status-icon', 3, 'ngClass'],
          [1, 'status-item', 'mb-4', 3, 'ngClass'],
          ['class', 'alert alert-info', 3, 'alert-success', 'alert-danger', 4, 'ngIf'],
          [1, 'alert', 'alert-info'],
          [1, 'mobile-app-container'],
          ['type', 'button', 1, 'btn', 'btn-primary', 3, 'click'],
          [1, 'fas', 'fa-sync-alt', 'me-1'],
          [1, 'mic-test-container'],
          ['class', 'no-mic-container', 4, 'ngIf'],
          [1, 'no-mic-container'],
          [1, 'no-mic-icon'],
          [1, 'fas', 'fa-microphone-slash'],
          [1, 'no-mic-title'],
          [1, 'no-mic-text'],
          [1, 'btn', 'btn-mic-start', 3, 'click'],
          [1, 'fas', 'fa-sync-alt'],
          [1, 'no-mic-icon', 'loading'],
          [1, 'fas', 'fa-spinner', 'fa-spin'],
          [1, 'text-muted', 'mb-3'],
          [1, 'mic-device-selector', 'mb-3'],
          [1, 'mic-label', 'mb-1'],
          [1, 'form-select', 'mic-select', 3, 'ngModelChange', 'ngModel', 'disabled'],
          [3, 'value', 4, 'ngFor', 'ngForOf'],
          [1, 'waveform-wrapper', 'mb-3'],
          ['width', '480', 'height', '120', 1, 'waveform-canvas'],
          ['class', 'waveform-overlay', 4, 'ngIf'],
          [1, 'volume-meter', 'mb-3'],
          [1, 'volume-label'],
          [1, 'mic-label'],
          [1, 'volume-value'],
          [1, 'volume-bar-track'],
          [1, 'volume-bar-fill'],
          [1, 'mic-status', 'mb-3', 3, 'ngClass'],
          [1, 'mic-status-dot'],
          ['class', 'mic-status-text', 4, 'ngIf'],
          [1, 'mic-actions'],
          [1, 'mic-actions-row', 'mb-2'],
          ['class', 'btn btn-mic-start', 3, 'click', 4, 'ngIf'],
          ['class', 'btn btn-mic-stop', 3, 'click', 4, 'ngIf'],
          ['class', 'btn btn-mic-record', 3, 'recording', 'click', 4, 'ngIf'],
          ['class', 'btn btn-mic-record recording', 3, 'click', 4, 'ngIf'],
          ['class', 'mic-actions-row', 4, 'ngIf'],
          [3, 'value'],
          [1, 'waveform-overlay'],
          [1, 'fas', 'fa-waveform', 'fa-microphone-alt'],
          [1, 'mic-status-text'],
          [1, 'fas', 'fa-microphone'],
          [1, 'btn', 'btn-mic-stop', 3, 'click'],
          [1, 'fas', 'fa-stop'],
          [1, 'btn', 'btn-mic-record', 3, 'click'],
          [1, 'fas', 'fa-circle'],
          [1, 'btn', 'btn-mic-record', 'recording', 3, 'click'],
          [1, 'mic-actions-row'],
          [1, 'btn', 'btn-mic-play', 3, 'click', 'disabled'],
          [1, 'fas'],
          [1, 'modal-footer'],
          ['type', 'button', 1, 'btn', 'btn-primary', 3, 'click', 'disabled'],
          ['class', 'fas fa-play', 4, 'ngIf'],
          ['class', 'fas fa-spinner fa-spin', 4, 'ngIf'],
          ['type', 'button', 1, 'btn', 'btn-success', 3, 'click'],
          [1, 'fas', 'fa-copy'],
          ['type', 'button', 'data-bs-dismiss', 'modal', 1, 'btn', 'btn-secondary'],
          [1, 'fas', 'fa-play']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 1)(1, 'div', 2)(2, 'div', 3)(3, 'div', 4)(4, 'h3', 5),
            H(5, dAe, 1, 0)(6, uAe, 1, 0),
            u(),
            T(7, 'button', 6),
            u(),
            d(8, 'ul', 7),
            H(9, hAe, 4, 2, 'li', 8),
            d(10, 'li', 9)(11, 'button', 10),
            x('click', function () {
              return o.onTabChange('mobile');
            }),
            T(12, 'i', 11),
            v(13, ' Mobile App '),
            u()(),
            H(14, pAe, 4, 2, 'li', 8),
            u(),
            d(15, 'div', 12),
            H(16, AAe, 36, 57, 'div', 13)(17, PAe, 6, 0, 'div', 14)(18, KAe, 4, 3, 'div', 15),
            u(),
            H(19, XAe, 10, 4, 'div', 16)(20, JAe, 3, 0, 'div', 16),
            u()()()),
            2 & i &&
              (m(5),
              O(5, o.appService.globals.isPresenter ? 5 : 6),
              m(4),
              z('ngIf', o.appService.globals.isPresenter),
              m(2),
              Tt('active', 'mobile' === o.activeTab),
              m(3),
              z('ngIf', o.appService.globals.isPresenter),
              m(2),
              z('ngIf', 'network' === o.activeTab),
              m(),
              z('ngIf', 'mobile' === o.activeTab),
              m(),
              z('ngIf', 'mic' === o.activeTab),
              m(),
              z('ngIf', 'network' === o.activeTab),
              m(),
              z('ngIf', 'mic' === o.activeTab || 'mobile' === o.activeTab)));
        },
        dependencies: [Di, Cr, zs, Vl, Hl, jl, ti, Yn],
        styles: [
          '.troubleshooter-tabs[_ngcontent-%COMP%]{border-bottom:none;padding:.5rem 1rem 0;gap:.5rem}.troubleshooter-tabs[_ngcontent-%COMP%]   .nav-item[_ngcontent-%COMP%]   .nav-link[_ngcontent-%COMP%]{border:none;border-radius:.5rem .5rem 0 0;color:#94a3b8;font-weight:600;font-size:.9rem;padding:.6rem 1.2rem;transition:all .25s ease;background:transparent}.troubleshooter-tabs[_ngcontent-%COMP%]   .nav-item[_ngcontent-%COMP%]   .nav-link[_ngcontent-%COMP%]:hover{color:#e2e8f0;background:#ffffff0d}.troubleshooter-tabs[_ngcontent-%COMP%]   .nav-item[_ngcontent-%COMP%]   .nav-link.active[_ngcontent-%COMP%]{color:#22d3ee;background:#22d3ee14;box-shadow:inset 0 -2px #22d3ee}.troubleshooter-tabs[_ngcontent-%COMP%]   .nav-item[_ngcontent-%COMP%]   .nav-link[_ngcontent-%COMP%]   i[_ngcontent-%COMP%]{font-size:.85rem}.status-item[_ngcontent-%COMP%]{display:flex;align-items:center;justify-content:space-between;background-color:#f8fafc;padding:1rem 1.25rem;border-radius:.75rem;transition:background-color .3s ease;border:1px solid #e2e8f0}.status-item[_ngcontent-%COMP%]   span.fw-medium[_ngcontent-%COMP%]{color:#1a202c!important;font-weight:600!important;font-size:.95rem}.status-item.passed[_ngcontent-%COMP%]{background-color:#ecfdf5;border-left:4px solid #10b981}.status-item.failed[_ngcontent-%COMP%]{background-color:#fef2f2;border-left:4px solid #ef4444}.status-icon[_ngcontent-%COMP%]{font-size:1.5rem;min-width:24px;text-align:center}.status-icon.passed[_ngcontent-%COMP%]{color:#10b981}.status-icon.failed[_ngcontent-%COMP%]{color:#ef4444}.status-icon.pending[_ngcontent-%COMP%]{color:#64748b}@keyframes _ngcontent-%COMP%_spin{0%{transform:rotate(0)}to{transform:rotate(360deg)}}.spin[_ngcontent-%COMP%]{animation:_ngcontent-%COMP%_spin 1s linear infinite}.modal-header[_ngcontent-%COMP%]   .modal-title[_ngcontent-%COMP%]{color:#fff!important;font-weight:700!important;font-size:1.25rem}.modal-body[_ngcontent-%COMP%]{max-height:60vh;overflow-y:auto}.modal-body[_ngcontent-%COMP%]   .text-muted[_ngcontent-%COMP%]{color:#e5e7eb!important;font-weight:500!important;font-size:.95rem}.btn[_ngcontent-%COMP%]{border-radius:.375rem}.btn[_ngcontent-%COMP%]   i[_ngcontent-%COMP%]{margin-right:.5rem}.alert[_ngcontent-%COMP%]{border-radius:.5rem;border:none;font-size:.9rem}.alert.alert-info[_ngcontent-%COMP%]{background-color:#dbeafe;color:#1e40af}.alert.alert-success[_ngcontent-%COMP%]{background-color:#ecfdf5;color:#047857}.alert.alert-danger[_ngcontent-%COMP%]{background-color:#fef2f2;color:#dc2626}.no-mic-container[_ngcontent-%COMP%]{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem 1rem;text-align:center}.no-mic-icon[_ngcontent-%COMP%]{width:64px;height:64px;border-radius:50%;background:#ef44441a;display:flex;align-items:center;justify-content:center;margin-bottom:1rem}.no-mic-icon[_ngcontent-%COMP%]   i[_ngcontent-%COMP%]{font-size:1.6rem;color:#ef4444}.no-mic-icon.loading[_ngcontent-%COMP%]{background:#22d3ee1a}.no-mic-icon.loading[_ngcontent-%COMP%]   i[_ngcontent-%COMP%]{color:#22d3ee}.no-mic-title[_ngcontent-%COMP%]{color:#e2e8f0;font-weight:700;margin-bottom:.5rem}.no-mic-text[_ngcontent-%COMP%]{color:#94a3b8;font-size:.9rem;max-width:320px;margin-bottom:1rem}.mic-test-container[_ngcontent-%COMP%]   .mic-label[_ngcontent-%COMP%]{display:block;color:#cbd5e1;font-weight:600;font-size:.85rem;text-transform:uppercase;letter-spacing:.05em}.mic-select[_ngcontent-%COMP%]{background-color:#1e293b!important;border:1px solid #334155!important;color:#e2e8f0!important;border-radius:.5rem!important;font-size:.9rem;padding:.5rem .75rem;transition:border-color .2s ease,box-shadow .2s ease}.mic-select[_ngcontent-%COMP%]:focus{border-color:#22d3ee!important;box-shadow:0 0 0 2px #22d3ee26!important;outline:none}.mic-select[_ngcontent-%COMP%]:disabled{opacity:.5;cursor:not-allowed}.mic-select[_ngcontent-%COMP%]   option[_ngcontent-%COMP%]{background-color:#1e293b;color:#e2e8f0}.waveform-wrapper[_ngcontent-%COMP%]{position:relative;border-radius:.75rem;overflow:hidden;border:1px solid #1e293b;background:#0f172a;transition:border-color .3s ease,box-shadow .3s ease}.waveform-wrapper.active[_ngcontent-%COMP%]{border-color:#22d3ee;box-shadow:0 0 20px #22d3ee1f,inset 0 0 30px #22d3ee08}.waveform-canvas[_ngcontent-%COMP%]{display:block;width:100%;height:120px}.waveform-overlay[_ngcontent-%COMP%]{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.5rem;background:#0f172ad9;color:#475569}.waveform-overlay[_ngcontent-%COMP%]   i[_ngcontent-%COMP%]{font-size:1.5rem}.waveform-overlay[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]{font-size:.85rem;font-weight:500}.volume-meter[_ngcontent-%COMP%]   .volume-label[_ngcontent-%COMP%]{display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem}.volume-meter[_ngcontent-%COMP%]   .volume-value[_ngcontent-%COMP%]{font-size:.85rem;font-weight:700;color:#475569;font-variant-numeric:tabular-nums;transition:color .3s ease}.volume-meter[_ngcontent-%COMP%]   .volume-value.active[_ngcontent-%COMP%]{color:#22d3ee}.volume-bar-track[_ngcontent-%COMP%]{height:10px;background:#1e293b;border-radius:999px;overflow:hidden;border:1px solid #334155}.volume-bar-fill[_ngcontent-%COMP%]{height:100%;border-radius:999px;transition:width .08s linear;position:relative}.volume-bar-fill.low[_ngcontent-%COMP%]{background:linear-gradient(90deg,#22d3ee,#10b981);box-shadow:0 0 8px #10b98166}.volume-bar-fill.mid[_ngcontent-%COMP%]{background:linear-gradient(90deg,#10b981,#eab308);box-shadow:0 0 8px #eab30866}.volume-bar-fill.high[_ngcontent-%COMP%]{background:linear-gradient(90deg,#eab308,#ef4444);box-shadow:0 0 8px #ef444466}.mic-status[_ngcontent-%COMP%]{display:flex;align-items:center;gap:.6rem;padding:.75rem 1rem;border-radius:.625rem;font-size:.9rem;font-weight:600;transition:all .3s ease}.mic-status-dot[_ngcontent-%COMP%]{width:10px;height:10px;border-radius:50%;flex-shrink:0}.mic-status-idle[_ngcontent-%COMP%]{background:#1e293b;color:#94a3b8}.mic-status-idle[_ngcontent-%COMP%]   .mic-status-dot[_ngcontent-%COMP%]{background:#475569}.mic-status-testing[_ngcontent-%COMP%]{background:#22d3ee14;color:#22d3ee}.mic-status-testing[_ngcontent-%COMP%]   .mic-status-dot[_ngcontent-%COMP%]{background:#22d3ee;animation:_ngcontent-%COMP%_pulse-dot 1.5s ease-in-out infinite}.mic-status-success[_ngcontent-%COMP%]{background:#10b9811a;color:#10b981}.mic-status-success[_ngcontent-%COMP%]   .mic-status-dot[_ngcontent-%COMP%]{background:#10b981;box-shadow:0 0 6px #10b98180}.mic-status-no-audio[_ngcontent-%COMP%]{background:#eab3081a;color:#eab308}.mic-status-no-audio[_ngcontent-%COMP%]   .mic-status-dot[_ngcontent-%COMP%]{background:#eab308;animation:_ngcontent-%COMP%_pulse-dot 1s ease-in-out infinite}.mic-status-error[_ngcontent-%COMP%]{background:#ef44441a;color:#ef4444}.mic-status-error[_ngcontent-%COMP%]   .mic-status-dot[_ngcontent-%COMP%]{background:#ef4444}@keyframes _ngcontent-%COMP%_pulse-dot{0%,to{transform:scale(1);opacity:1}50%{transform:scale(1.6);opacity:.5}}.mic-actions[_ngcontent-%COMP%]   .mic-actions-row[_ngcontent-%COMP%]{display:flex;gap:.5rem;flex-wrap:wrap}.btn-mic-start[_ngcontent-%COMP%]{background:linear-gradient(135deg,#0891b2,#22d3ee);color:#fff;border:none;font-weight:600;padding:.5rem 1.2rem;border-radius:.5rem;transition:all .2s ease}.btn-mic-start[_ngcontent-%COMP%]:hover{background:linear-gradient(135deg,#0e7490,#06b6d4);color:#fff;box-shadow:0 4px 12px #22d3ee4d;transform:translateY(-1px)}.btn-mic-stop[_ngcontent-%COMP%]{background:#334155;color:#e2e8f0;border:none;font-weight:600;padding:.5rem 1.2rem;border-radius:.5rem;transition:all .2s ease}.btn-mic-stop[_ngcontent-%COMP%]:hover{background:#475569;color:#fff}.btn-mic-record[_ngcontent-%COMP%]{background:#7f1d1d;color:#fca5a5;border:none;font-weight:600;padding:.5rem 1.2rem;border-radius:.5rem;transition:all .2s ease}.btn-mic-record[_ngcontent-%COMP%]   i.fa-circle[_ngcontent-%COMP%]{color:#ef4444}.btn-mic-record[_ngcontent-%COMP%]:hover{background:#991b1b;color:#fecaca}.btn-mic-record.recording[_ngcontent-%COMP%]{background:#dc2626;color:#fff;animation:_ngcontent-%COMP%_recording-glow 1.5s ease-in-out infinite}.btn-mic-record.recording[_ngcontent-%COMP%]   i[_ngcontent-%COMP%]{color:#fff}@keyframes _ngcontent-%COMP%_recording-glow{0%,to{box-shadow:0 0 4px #dc26264d}50%{box-shadow:0 0 16px #dc262699}}.btn-mic-play[_ngcontent-%COMP%]{background:linear-gradient(135deg,#047857,#10b981);color:#fff;border:none;font-weight:600;padding:.5rem 1.2rem;border-radius:.5rem;transition:all .2s ease}.btn-mic-play[_ngcontent-%COMP%]:hover:not(:disabled){background:linear-gradient(135deg,#065f46,#059669);color:#fff;box-shadow:0 4px 12px #10b9814d;transform:translateY(-1px)}.btn-mic-play[_ngcontent-%COMP%]:disabled{opacity:.7;cursor:not-allowed}'
        ]
      });
    }
  }
  return t;
})();
