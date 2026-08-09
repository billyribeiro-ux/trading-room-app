const OCe = ['speechRecoBody'],
  pc = (t, n) => n._id,
  NCe = (t, n) => n.userID,
  LCe = (t, n) => n.sender,
  BCe = (t, n) => n.timestamp,
  Go = (t) => ({ active: t }),
  UCe = (t, n) => ({ 'show active': t, 'is-fullscreenshare': n }),
  Hr = (t) => ({ 'show active': t }),
  jCe = (t) => ({ 'viewer-only-screen-tab': t }),
  VCe = (t) => ({ 'viewer-only-screen-zoom-controls': t }),
  HCe = (t) => ({ muted: t }),
  $Ce = () => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  zCe = (t) => ({ 'swing-symbol-container': t }),
  GCe = () => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  WCe = (t) => ({ 'day-trade-symbol-container': t });
function qCe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 15)(1, 'span', 54),
      T(2, 'i', 55),
      u(),
      d(3, 'ul', 56)(4, 'li', 57),
      x('click', function () {
        return (D(e), E(g().newNote()));
      }),
      d(5, 'a', 58),
      T(6, 'i', 59),
      v(7, ' New Note'),
      u()()()());
  }
}
function KCe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 31),
      x('click', function () {
        return (D(e), E(g().onMainTabChange('presAreaTabs-recordings')));
      }),
      d(1, 'a', 60)(2, 'div', 12)(3, 'div'),
      T(4, 'i', 61),
      d(5, 'span', 14),
      v(6, 'Recordings'),
      u()()()()());
  }
  if (2 & t) {
    const e = g();
    (m(), z('ngClass', ut(1, Go, 'presAreaTabs-recordings' == e.selectedMainTab)));
  }
}
function YCe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 31),
      x('click', function () {
        return (D(e), E(g().onMainTabChange('presAreaTabs-videoplayer')));
      }),
      d(1, 'a', 62)(2, 'div', 12)(3, 'div'),
      T(4, 'i', 63),
      d(5, 'span', 14),
      v(6, 'VideoPlayer'),
      u()()()()());
  }
  if (2 & t) {
    const e = g();
    (m(), z('ngClass', ut(1, Go, 'presAreaTabs-videoplayer' == e.selectedMainTab)));
  }
}
function QCe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 31),
      x('click', function () {
        return (D(e), E(g().onMainTabChange('presAreaTabs-swingAlerts')));
      }),
      d(1, 'a', 64)(2, 'div', 12)(3, 'div'),
      T(4, 'i', 65),
      d(5, 'span', 14),
      v(6, 'Swing Alerts'),
      u()()()()());
  }
  if (2 & t) {
    const e = g();
    (m(), z('ngClass', ut(1, Go, 'presAreaTabs-swingAlerts' == e.selectedMainTab)));
  }
}
function XCe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 31),
      x('click', function () {
        return (D(e), E(g().onMainTabChange('presAreaTabs-dayTradeAlerts')));
      }),
      d(1, 'a', 66)(2, 'div', 12)(3, 'div'),
      T(4, 'i', 65),
      d(5, 'span', 14),
      v(6, 'Day Trades'),
      u()()()()());
  }
  if (2 & t) {
    const e = g();
    (m(), z('ngClass', ut(1, Go, 'presAreaTabs-dayTradeAlerts' == e.selectedMainTab)));
  }
}
function JCe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div')(1, 'span', 67),
      T(2, 'i', 55),
      u(),
      d(3, 'ul', 68)(4, 'li', 57),
      x('click', function () {
        return (D(e), E(g().newFile()));
      }),
      d(5, 'a', 58),
      T(6, 'i', 59),
      v(7, ' Upload File'),
      u()()()());
  }
}
function ZCe(t, n) {
  if ((1 & t && (d(0, 'div', 21), T(1, 'iframe', 69), Je(2, 'noSanitize'), u()), 2 & t)) {
    const e = g();
    (m(), z('src', Ct(2, 1, e.appService.globals.sessData.customPlayerURL, 'resourceUrl'), Oa));
  }
}
function eSe(t, n) {
  1 & t && (d(0, 'h3', 23), v(1, 'Video off to preserve data...'), u());
}
function tSe(t, n) {
  1 & t && (d(0, 'h3', 23), v(1, 'No one is presenting right now...'), u());
}
function nSe(t, n) {
  1 & t && (d(0, 'span', 75), T(1, 'i', 82), u());
}
function iSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 83),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(3).toggleLockScreen(o._id));
      }),
      T(1, 'i', 84),
      u());
  }
}
function oSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 57),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(3).bringFocusToScreen(o._id));
      }),
      d(1, 'a', 58),
      T(2, 'i', 82),
      v(3, ' Bring everyone here'),
      u()(),
      d(4, 'li', 57),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(3).stopSharingThisScreenRemote(o));
      }),
      d(5, 'a', 58),
      T(6, 'i', 85),
      v(7, ' Stop This Screen'),
      u()());
  }
}
function sSe(t, n) {
  1 & t && (d(0, 'span', 81), T(1, 'i', 84), v(2, ' Lock Screen'), u());
}
function rSe(t, n) {
  1 & t && (d(0, 'span', 86), T(1, 'i', 87), v(2, ' Unlock Screen'), u());
}
function aSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 31),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(3).onScreenShareTabChange(o._id));
      }),
      d(1, 'a', 74),
      H(2, nSe, 2, 0, 'span', 75)(3, iSe, 2, 0, 'span', 76),
      T(4, 'img', 77),
      d(5, 'span', 14),
      v(6),
      u(),
      d(7, 'div', 78)(8, 'span', 79),
      T(9, 'i', 55),
      u(),
      d(10, 'ul', 56),
      H(11, oSe, 8, 0),
      d(12, 'li', 57),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(3).detachScreen(o._id));
      }),
      d(13, 'a', 58),
      T(14, 'i', 80),
      v(15, ' Detach Screen to a new window'),
      u()(),
      d(16, 'li', 57),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(3).toggleLockScreen(o._id));
      }),
      d(17, 'a', 58),
      H(18, sSe, 3, 0, 'span', 81)(19, rSe, 3, 0),
      u()()()()()());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = g(3);
    (m(),
      ei('id', '', e._id, '-tab'),
      z('ngClass', ut(11, Go, i.selectedScreenShareTab == e._id)),
      Dt('aria-controls', e._id),
      m(),
      O(2, i.forcedScreenID == e._id ? 2 : -1),
      m(),
      O(3, i.appService.globals.lockedScreenID === e._id ? 3 : -1),
      m(),
      z('src', 'https://secure.gravatar.com/avatar/' + e.mediaValue.avt + '?d=mm&s=20', Mt),
      m(2),
      ns('', e.mediaValue.name, '-', e.mediaValue.screenName, ''),
      m(5),
      O(11, i.isP ? 11 : -1),
      m(7),
      O(18, i.appService.globals.lockedScreenID !== e._id ? 18 : 19));
  }
}
function lSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 89)(1, 'button', 102),
      x('click', function () {
        return (D(e), E(g(4).panZoomIn()));
      }),
      T(2, 'i', 103),
      u(),
      d(3, 'button', 102),
      x('click', function () {
        return (D(e), E(g(4).panZoomOut()));
      }),
      T(4, 'i', 104),
      u(),
      d(5, 'button', 102),
      x('click', function () {
        return (D(e), E(g(4).panZoomReset()));
      }),
      T(6, 'i', 105),
      u()());
  }
  if (2 & t) {
    const e = g(4);
    z('ngClass', ut(1, VCe, e.appService.globals.viewerOnlyMode));
  }
}
function cSe(t, n) {
  1 & t && T(0, 'i', 106);
}
function dSe(t, n) {
  1 & t && T(0, 'i', 107);
}
function uSe(t, n) {
  1 & t && T(0, 'i', 108);
}
function hSe(t, n) {
  if (
    (1 & t &&
      (d(0, 'button', 90),
      H(1, cSe, 1, 0, 'i', 106)(2, dSe, 1, 0, 'i', 107)(3, uSe, 1, 0, 'i', 108),
      u()),
    2 & t)
  ) {
    const e = g(4);
    (m(),
      O(1, e.audioVolume > 50 ? 1 : -1),
      m(),
      O(2, e.audioVolume < 50 && e.audioVolume > 4 ? 2 : -1),
      m(),
      O(3, e.audioVolume < 4 ? 3 : -1));
  }
}
function pSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 109),
      x('click', function () {
        return (D(e), E(g(4).mute()));
      }),
      v(1, ' Mute '),
      u());
  }
}
function fSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 110),
      x('click', function () {
        return (D(e), E(g(4).unmute()));
      }),
      v(1, ' Unmute '),
      u());
  }
}
function mSe(t, n) {
  1 & t && (d(0, 'span'), v(1, 'Mute'), u());
}
function gSe(t, n) {
  1 & t && (d(0, 'span'), v(1, 'Muted'), u());
}
function _Se(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 114)(1, 'input', 115),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g().$implicit,
          r = g(5);
        return (
          He(r.appService.globals.preferences.audioVolumeFor[s.userID], o) ||
            (r.appService.globals.preferences.audioVolumeFor[s.userID] = o),
          E(o)
        );
      }),
      x('change', function (o) {
        D(e);
        const s = g().$implicit;
        return E(g(5).adjustVolPres(o, s));
      })('input', function (o) {
        D(e);
        const s = g().$implicit;
        return E(g(5).adjustVolPres(o, s));
      }),
      u()());
  }
  if (2 & t) {
    const e = g().$implicit,
      i = g(5);
    (m(), je('ngModel', i.appService.globals.preferences.audioVolumeFor[e.userID]));
  }
}
function bSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 111)(1, 'input', 112),
      x('change', function () {
        const o = D(e).$implicit;
        return E(g(5).toggleTalkingPresenter(o));
      }),
      u(),
      d(2, 'label', 113),
      H(3, mSe, 2, 0, 'span'),
      v(4),
      H(5, gSe, 2, 0, 'span'),
      u()(),
      H(6, _Se, 2, 1, 'div', 114));
  }
  if (2 & t) {
    const e = n.$implicit,
      i = n.$index,
      o = g(5);
    (m(),
      ei('name', 'talkingPresenter', i, '-donot-disturb'),
      ei('id', 'talkingPresenter', i, '-donot-disturb'),
      z('checked', o.appService.globals.preferences.audioMutedFor[e.userID]),
      m(),
      ei('for', 'talkingPresenter', i, '-donot-disturb'),
      z('ngClass', ut(12, HCe, o.appService.globals.preferences.audioMutedFor[e.userID])),
      m(),
      O(3, o.appService.globals.preferences.audioMutedFor[e.userID] ? -1 : 3),
      m(),
      Ne(' ', e.mediaValue.name, ' '),
      m(),
      O(5, o.appService.globals.preferences.audioMutedFor[e.userID] ? 5 : -1),
      m(),
      O(6, o.appService.globals.sessData.individualVolumeControls ? 6 : -1));
  }
}
function vSe(t, n) {
  (1 & t && ht(0, bSe, 7, 14, null, null, NCe), 2 & t && pt(g(4).mediaService.talkingUsers));
}
function ySe(t, n) {
  1 & t && T(0, 'i', 101);
}
function FSe(t, n) {
  1 & t && T(0, 'i', 116);
}
function CSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 71)(1, 'div', 88),
      H(2, lSe, 7, 3, 'div', 89)(3, hSe, 4, 3, 'button', 90),
      d(4, 'div', 91)(5, 'h4'),
      v(6, ' Volume '),
      d(7, 'span', 92),
      T(8, 'i', 93),
      u()(),
      d(9, 'input', 94),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(3);
        return (He(s.audioVolume, o) || (s.audioVolume = o), E(o));
      }),
      x('change', function (o) {
        return (D(e), E(g(3).adjustVol(o)));
      })('input', function (o) {
        return (D(e), E(g(3).adjustVol(o)));
      }),
      u(),
      T(10, 'br'),
      H(11, pSe, 2, 0, 'button', 95)(12, fSe, 2, 0, 'button', 96),
      T(13, 'hr'),
      d(14, 'div', 97),
      H(15, vSe, 2, 0),
      u()(),
      d(16, 'button', 98),
      x('click', function () {
        return (D(e), E(g(3).togglePanZoom()));
      }),
      T(17, 'i', 99),
      u(),
      d(18, 'button', 98),
      x('click', function () {
        return (D(e), E(g(3).captureVideoImage()));
      }),
      T(19, 'i', 100),
      u(),
      d(20, 'button', 98),
      x('click', function () {
        return (D(e), E(g(3).fullScreenshare()));
      }),
      H(21, ySe, 1, 0, 'i', 101)(22, FSe, 1, 0),
      u()()());
  }
  if (2 & t) {
    const e = g(3);
    (m(2),
      O(2, e.showZoomCtrl ? 2 : -1),
      m(),
      O(3, e.appService.globals.viewerOnlyMode ? 3 : -1),
      m(6),
      je('ngModel', e.audioVolume),
      m(2),
      O(11, e.audioVolume > 0 ? 11 : -1),
      m(),
      O(12, 0 == e.audioVolume ? 12 : -1),
      m(3),
      O(15, e.mediaService.talkingUsers && e.mediaService.talkingUsers.length > 0 ? 15 : -1),
      m(6),
      O(21, e.isFullScreenshare ? 21 : 22));
  }
}
function SSe(t, n) {
  if ((1 & t && (d(0, 'div', 73), T(1, 'app-screenshare-view', 117), u()), 2 & t)) {
    const e = n.$implicit,
      i = g(3);
    (Ah('aria-labelledby', '', e._id, '-tab'),
      xn('id', e._id),
      z('ngClass', ut(5, Hr, i.selectedScreenShareTab == e._id)),
      m(),
      z('muser', e));
  }
}
function wSe(t, n) {
  if (
    (1 & t &&
      (H(0, tSe, 2, 0, 'h3', 23),
      d(1, 'ul', 70),
      ht(2, aSe, 20, 13, 'li', 16, pc),
      H(4, CSe, 23, 7, 'li', 71),
      u(),
      d(5, 'div', 72),
      ht(6, SSe, 2, 7, 'div', 73, pc),
      u()),
    2 & t)
  ) {
    const e = g(2);
    (O(0, 0 == e.mediaService.screenSharingUsers.length ? 0 : -1),
      m(2),
      pt(e.mediaService.screenSharingUsers),
      m(2),
      O(4, e.mediaService.screenSharingUsers.length > 0 ? 4 : -1),
      m(),
      z('ngClass', ut(3, jCe, e.appService.globals.viewerOnlyMode)),
      m(),
      pt(e.mediaService.screenSharingUsers));
  }
}
function TSe(t, n) {
  (1 & t && H(0, eSe, 2, 0, 'h3', 23)(1, wSe, 8, 5),
    2 & t && O(0, g().appService.globals.preferences.disableVideo ? 0 : 1));
}
function DSe(t, n) {
  1 & t && (d(0, 'h3', 23), v(1, 'Video off to preserve data...'), u());
}
function ESe(t, n) {
  1 & t && (d(0, 'h3', 23), v(1, 'No one is streaming right now...'), u());
}
function kSe(t, n) {
  1 & t && (d(0, 'span', 75), T(1, 'i', 82), u());
}
function xSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 83),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(2).toggleLockScreenMTX(o._id));
      }),
      T(1, 'i', 84),
      u());
  }
}
function MSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 57),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(2).bringFocusToScreen(o._id));
      }),
      d(1, 'a', 58),
      T(2, 'i', 82),
      v(3, ' Bring everyone here'),
      u()());
  }
}
function ASe(t, n) {
  1 & t && (d(0, 'span', 81), T(1, 'i', 84), v(2, ' Lock Screen'), u());
}
function PSe(t, n) {
  1 & t && (d(0, 'span', 86), T(1, 'i', 87), v(2, ' Unlock Screen'), u());
}
function RSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 31),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(2).onStreamTabChange(o._id));
      }),
      d(1, 'a', 74),
      H(2, kSe, 2, 0, 'span', 75)(3, xSe, 2, 0, 'span', 76),
      d(4, 'span', 14),
      v(5),
      u(),
      d(6, 'div', 78)(7, 'span', 79),
      T(8, 'i', 55),
      u(),
      d(9, 'ul', 56),
      H(10, MSe, 4, 0, 'li'),
      d(11, 'li', 57),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(2).toggleLockScreenMTX(o._id));
      }),
      d(12, 'a', 58),
      H(13, ASe, 3, 0, 'span', 81)(14, PSe, 3, 0),
      u()()()()()());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = g(2);
    (m(),
      ei('id', '', e._id, '-tab'),
      z('ngClass', ut(9, Go, i.selectedMTXStreamTab == e._id)),
      Dt('aria-controls', e._id),
      m(),
      O(2, i.forcedScreenMTXID == e._id ? 2 : -1),
      m(),
      O(3, i.appService.globals.lockedScreenIDMTX === e._id ? 3 : -1),
      m(2),
      Ze(e.mediaValue.name),
      m(5),
      O(10, i.isP ? 10 : -1),
      m(3),
      O(13, i.appService.globals.lockedScreenID !== e._id ? 13 : 14));
  }
}
function ISe(t, n) {
  if ((1 & t && (d(0, 'div', 73), T(1, 'app-streaming-view', 117), u()), 2 & t)) {
    const e = n.$implicit,
      i = g(2);
    (Ah('aria-labelledby', '', e._id, '-tab'),
      xn('id', e._id),
      z('ngClass', ut(5, Hr, i.selectedMTXStreamTab == e._id)),
      m(),
      z('muser', e));
  }
}
function OSe(t, n) {
  if (
    (1 & t &&
      (H(0, ESe, 2, 0, 'h3', 23),
      d(1, 'ul', 118),
      ht(2, RSe, 15, 11, 'li', 16, pc),
      u(),
      d(4, 'div', 119),
      ht(5, ISe, 2, 7, 'div', 73, pc),
      u()),
    2 & t)
  ) {
    const e = g();
    (O(0, 0 == e.mtxHandlerService.mtxStreams.length ? 0 : -1),
      m(2),
      pt(e.mtxHandlerService.mtxStreams),
      m(3),
      pt(e.mtxHandlerService.mtxStreams));
  }
}
function NSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div')(1, 'h3'),
      v(2, 'No Notes to display...'),
      u(),
      d(3, 'button', 120),
      x('click', function () {
        return (D(e), E(g().newNote()));
      }),
      v(4, ' New Note '),
      u()());
  }
}
function LSe(t, n) {
  1 & t && (d(0, 'span', 123), T(1, 'i', 126), u());
}
function BSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div')(1, 'span', 127),
      T(2, 'i', 55),
      u(),
      d(3, 'ul', 128)(4, 'li', 57),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(2).editNote(o._id));
      }),
      d(5, 'a', 58),
      T(6, 'i', 129),
      v(7, ' Edit Note'),
      u()(),
      d(8, 'li', 57),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(2).renameTab(o.name, o._id));
      }),
      d(9, 'a', 58),
      v(10, ' Rename Note'),
      u()(),
      d(11, 'li', 57),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(2).bringFocusToTab(o._id));
      }),
      d(12, 'a', 58),
      T(13, 'i', 82),
      v(14, ' Bring everyone here'),
      u()(),
      d(15, 'li', 57),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(2).setAsWelcomeTab(o._id, !1));
      }),
      d(16, 'a', 58),
      T(17, 'i', 126),
      v(18, ' Make Welcome Mat'),
      u()(),
      d(19, 'li', 57),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(2).setAsWelcomeTab(o._id, !0));
      }),
      d(20, 'a', 58),
      T(21, 'i', 126),
      v(22, ' Apply as Welcome Mat to multiple rooms'),
      u()(),
      d(23, 'li', 57),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(2).deleteNote(o._id));
      }),
      d(24, 'a', 58),
      T(25, 'i', 85),
      v(26, ' Delete'),
      u()()()());
  }
}
function USe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 31),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(2).onNotesTabChange(o._id));
      }),
      d(1, 'a', 74)(2, 'div', 12)(3, 'div'),
      H(4, LSe, 2, 0, 'span', 123),
      T(5, 'i', 124),
      d(6, 'a', 125),
      x('dblclick', function () {
        const o = D(e).$implicit;
        return E(g(2).renameTab(o.name, o._id));
      }),
      v(7),
      u()(),
      H(8, BSe, 27, 0, 'div'),
      u()()());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = g(2);
    (m(),
      ei('id', '', e._id, '-tab'),
      z('ngClass', ut(9, Go, i.selectedNoteTab == 'noteTab-' + e._id)),
      Dt('aria-controls', e._id),
      m(3),
      O(4, e.isWelcomeMat ? 4 : -1),
      m(),
      ei('id', 'noteUpd-', e._id, ''),
      m(2),
      Ne('', e.name, ' '),
      m(),
      O(8, i.isP || i.appService.globals.user.canEditNotes ? 8 : -1));
  }
}
function jSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 137),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(2).editNote(o._id));
      }),
      T(1, 'i', 138),
      v(2, 'Edit '),
      u());
  }
}
function VSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 139),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(2).deleteNote(o._id));
      }),
      T(1, 'i', 140),
      v(2, 'Delete '),
      u());
  }
}
function HSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 73)(1, 'div', 130),
      T(2, 'app-note', 131),
      u(),
      d(3, 'div', 132)(4, 'div'),
      H(5, jSe, 3, 0, 'button', 133),
      d(6, 'button', 134),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(2).downloadNote(o));
      }),
      T(7, 'i', 135),
      v(8, 'Download '),
      u(),
      H(9, VSe, 3, 0, 'button', 136),
      u()()());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = g(2);
    (Ah('aria-labelledby', '', e._id, '-tab'),
      xn('id', e._id),
      z('ngClass', ut(7, Hr, i.selectedNoteTab == 'noteTab-' + e._id)),
      m(2),
      z('tab', e),
      m(3),
      O(5, i.isP || i.appService.globals.user.canEditNotes ? 5 : -1),
      m(4),
      O(9, i.isP || i.appService.globals.user.canEditNotes ? 9 : -1));
  }
}
function $Se(t, n) {
  if (
    (1 & t &&
      (d(0, 'ul', 121),
      ht(1, USe, 9, 11, 'li', 16, pc),
      u(),
      d(3, 'div', 122),
      ht(4, HSe, 10, 9, 'div', 73, pc),
      u()),
    2 & t)
  ) {
    const e = g();
    (m(), pt(e.appService.globals.sessionNotes), m(3), pt(e.appService.globals.sessionNotes));
  }
}
function zSe(t, n) {
  if ((1 & t && (d(0, 'div', 25), T(1, 'iframe', 141), Je(2, 'noSanitize'), u()), 2 & t)) {
    const e = g();
    (z('ngClass', ut(5, Hr, 'presAreaTabs-recordings' == e.selectedMainTab)),
      m(),
      z('src', Ct(2, 2, e.getRecordingsUrl(), 'resourceUrl'), Oa));
  }
}
function GSe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 142),
      v(1, ' Video URL: '),
      d(2, 'strong', 143),
      v(3),
      u()(),
      d(4, 'p'),
      v(
        5,
        ' IMPORTANT: The video URL needs to be a link to an mp4 video hosted on a website or something like S3, not a YouTube/Vimeo etc... '
      ),
      u()),
    2 & t)
  ) {
    const e = g(5);
    (m(3), Ze(e.scheduledVideo.videoURL));
  }
}
function WSe(t, n) {
  if (1 & t) {
    const e = Y();
    (H(0, GSe, 6, 1),
      d(1, 'div', 142),
      v(2, ' Video scheduled for: '),
      d(3, 'span', 143),
      v(4),
      Je(5, 'date'),
      u()(),
      d(6, 'button', 144),
      x('click', function () {
        return (D(e), E(g(4).stopVideoForAll('remove')));
      }),
      T(7, 'i', 145),
      v(8, ' Remove Scheduled Video '),
      u());
  }
  if (2 & t) {
    const e = g(4);
    (O(0, e.scheduledVideo.videoURL ? 0 : -1),
      m(4),
      Ze(Ct(5, 2, e.scheduledVideo.videoPlayTime, 'medium')));
  }
}
function qSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 157),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(5).playVideoForAll(o));
      }),
      T(1, 'i', 158),
      v(2, 'Play For All '),
      u());
  }
}
function KSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 146)(1, 'span', 153)(2, 'i', 154),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(5).deleteVideoFromList(o));
      }),
      u(),
      v(3),
      u(),
      d(4, 'span', 155),
      H(5, qSe, 3, 0, 'button', 156),
      u()());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = g(5);
    (m(3), Ne('', e, ' '), m(2), O(5, i.videoPlayerUrl || i.videoPlayerUrl === e ? -1 : 5));
  }
}
function YSe(t, n) {
  1 & t && (d(0, 'div', 147), v(1, 'No videos.'), u());
}
function QSe(t, n) {
  if (1 & t) {
    const e = Y();
    (ht(0, KSe, 6, 2, 'div', 146, Li, !1, YSe, 2, 0, 'div', 147),
      d(3, 'div', 148)(4, 'div', 149)(5, 'input', 150),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(4);
        return (He(s.videoURL, o) || (s.videoURL = o), E(o));
      }),
      u(),
      d(6, 'span', 151),
      x('click', function () {
        return (D(e), E(g(4).sendVideoToRoom()));
      }),
      T(7, 'i', 152),
      u()()());
  }
  if (2 & t) {
    const e = g(4);
    (pt(e.videoList), m(5), je('ngModel', e.videoURL));
  }
}
function XSe(t, n) {
  (1 & t && H(0, WSe, 9, 5)(1, QSe, 8, 2),
    2 & t && O(0, g(3).scheduledVideo.videoPlayTime ? 0 : 1));
}
function JSe(t, n) {
  (1 & t && H(0, XSe, 2, 1), 2 & t && O(0, g(2).isP ? 0 : -1));
}
function ZSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 160)(1, 'button', 162),
      x('click', function () {
        return (D(e), E(g(3).stopVideoForAll('stop')));
      }),
      T(2, 'i', 163),
      v(3, ' Stop For All '),
      u()());
  }
}
function ewe(t, n) {
  (1 & t && (T(0, 'iframe', 161), Je(1, 'noSanitize')),
    2 & t && z('src', Ct(1, 1, g(3).videoPlayerUrl, 'resourceUrl'), Oa));
}
function twe(t, n) {
  (1 & t && (T(0, 'video', 164), Je(1, 'noSanitize')),
    2 & t && z('src', Ct(1, 1, g(3).videoPlayerUrl, 'resourceUrl'), Mt));
}
function nwe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 159),
      H(1, ZSe, 4, 0, 'div', 160)(2, ewe, 2, 4, 'iframe', 161)(3, twe, 2, 4),
      u()),
    2 & t)
  ) {
    const e = g(2);
    (m(), O(1, e.isP ? 1 : -1), m(), O(2, e.videoPlayerUrl.includes('youtube') ? 2 : 3));
  }
}
function iwe(t, n) {
  if ((1 & t && (d(0, 'div', 26), H(1, JSe, 1, 1)(2, nwe, 4, 2), u()), 2 & t)) {
    const e = g();
    (z('ngClass', ut(2, Hr, 'presAreaTabs-videoplayer' == e.selectedMainTab)),
      m(),
      O(1, e.videoPlayerUrl ? 2 : 1));
  }
}
function owe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 192),
      x('click', function () {
        D(e);
        const o = g(3);
        return E(o.showImagePreview(o.swingAlert.image));
      }),
      T(1, 'img', 193),
      u());
  }
  if (2 & t) {
    const e = g(3);
    (m(), z('src', e.swingAlert.image, Mt)('alt', e.swingAlert.image));
  }
}
function swe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 194),
      x('click', function () {
        return (D(e), E(g(3).imgUpload('swing')));
      }),
      T(1, 'i', 195),
      v(2, ' Image '),
      u());
  }
}
function rwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 196),
      x('click', function () {
        return (D(e), E(g(3).removeImageSwing()));
      }),
      T(1, 'i', 93),
      u());
  }
}
function awe(t, n) {
  1 & t && (T(0, 'i', 197), v(1, 'Discard '));
}
function lwe(t, n) {
  1 & t && (T(0, 'i', 198), v(1, 'Cancel '));
}
function cwe(t, n) {
  1 & t && (T(0, 'i', 199), v(1, 'Save Changes '));
}
function dwe(t, n) {
  1 & t && (T(0, 'i', 200), v(1, 'Submit Alert '));
}
function uwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'form', 171, 0),
      x('ngSubmit', function () {
        return (D(e), E(g(2).onSwingAlertSubmit()));
      }),
      d(2, 'div', 172)(3, 'span', 173),
      v(4, 'Symbol'),
      u(),
      d(5, 'input', 174),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.swingAlert.symbol, o) || (s.swingAlert.symbol = o), E(o));
      }),
      u()(),
      d(6, 'div', 172)(7, 'span', 173),
      v(8, 'Entry Price'),
      u(),
      d(9, 'input', 175),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.swingAlert.entryPrice, o) || (s.swingAlert.entryPrice = o), E(o));
      }),
      u()(),
      d(10, 'div', 172)(11, 'span', 173),
      v(12, 'Stop'),
      u(),
      d(13, 'input', 176),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.swingAlert.stop, o) || (s.swingAlert.stop = o), E(o));
      }),
      u()(),
      d(14, 'div', 172)(15, 'span', 173),
      v(16, 'Target'),
      u(),
      d(17, 'input', 177),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.swingAlert.target, o) || (s.swingAlert.target = o), E(o));
      }),
      u()(),
      d(18, 'div', 172),
      H(19, owe, 2, 2, 'span', 178)(20, swe, 3, 0),
      d(21, 'input', 179),
      x('paste', function (o) {
        return (D(e), E(g(2).onImagePaste(o, 'swing')));
      }),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.swingAlert.image, o) || (s.swingAlert.image = o), E(o));
      }),
      u(),
      H(22, rwe, 2, 0, 'span', 180),
      u(),
      d(23, 'div', 181)(24, 'div', 182)(25, 'div', 183)(26, 'input', 184),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.swingAlert.direction, o) || (s.swingAlert.direction = o), E(o));
      }),
      u(),
      d(27, 'label', 185),
      v(28, ' Long '),
      u()(),
      d(29, 'div', 186)(30, 'input', 187),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.swingAlert.direction, o) || (s.swingAlert.direction = o), E(o));
      }),
      u(),
      d(31, 'label', 188),
      v(32, ' Short '),
      u()()(),
      d(33, 'div', 189)(34, 'button', 190),
      x('click', function () {
        return (D(e), E(g(2).onSwingAlertCancel()));
      }),
      H(35, awe, 2, 0)(36, lwe, 2, 0),
      u(),
      d(37, 'button', 191),
      H(38, cwe, 2, 0)(39, dwe, 2, 0),
      u()()()());
  }
  if (2 & t) {
    const e = g(2);
    (m(5),
      je('ngModel', e.swingAlert.symbol),
      m(4),
      je('ngModel', e.swingAlert.entryPrice),
      m(4),
      je('ngModel', e.swingAlert.stop),
      m(4),
      je('ngModel', e.swingAlert.target),
      m(2),
      O(19, e.swingAlert.image ? 19 : 20),
      m(2),
      je('ngModel', e.swingAlert.image),
      m(),
      O(22, e.swingAlert.image ? 22 : -1),
      m(4),
      je('ngModel', e.swingAlert.direction),
      m(4),
      je('ngModel', e.swingAlert.direction),
      m(5),
      O(35, e.swingAlert.edit ? 35 : 36),
      m(3),
      O(38, e.swingAlert.edit ? 38 : 39));
  }
}
function hwe(t, n) {
  if ((1 & t && (d(0, 'option', 169), v(1), u()), 2 & t)) {
    const e = n.$implicit;
    (z('ngValue', e), m(), Ze(e));
  }
}
function pwe(t, n) {
  1 & t && (d(0, 'h4', 170), v(1, ' No Swing Trade Alerts to display. '), u());
}
function fwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 216),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(3).deleteSwingAlert(o._id, o));
      }),
      T(1, 'i', 217),
      u(),
      d(2, 'span', 143),
      v(3, '|'),
      u(),
      d(4, 'span', 218),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(3).editSwingAlert(o));
      }),
      T(5, 'i', 219),
      u());
  }
}
function mwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'img', 220),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(3).showImagePreview(o.image));
      }),
      u());
  }
  if (2 & t) {
    const e = g().$implicit;
    z('src', e.image, Mt)('alt', e.image);
  }
}
function gwe(t, n) {
  if (
    (1 & t &&
      (d(0, 'tr')(1, 'td')(2, 'span', 209),
      H(3, fwe, 6, 0),
      d(4, 'strong', 210),
      v(5),
      u()()(),
      d(6, 'td'),
      v(7),
      u(),
      d(8, 'td'),
      v(9),
      Je(10, 'date'),
      u(),
      d(11, 'td'),
      v(12),
      u(),
      d(13, 'td'),
      v(14),
      u(),
      d(15, 'td'),
      v(16),
      u(),
      d(17, 'td', 211),
      H(18, mwe, 1, 2, 'img', 212),
      u(),
      d(19, 'td', 213)(20, 'strong', 214),
      v(21),
      u(),
      T(22, 'img', 215),
      u()()),
    2 & t)
  ) {
    const e = n.$implicit,
      i = g(3);
    (m(2),
      z('ngClass', ut(15, zCe, i.isP)),
      m(),
      O(3, i.isP ? 3 : -1),
      m(2),
      Ne(' ', e.symbol, ' '),
      m(2),
      Ze(e.direction),
      m(2),
      Ne(' ', Ct(10, 12, e.entryDate, 'YYYY-MM-dd hh:mm:ss'), ' '),
      m(3),
      Ze(e.entryPrice),
      m(2),
      Ze(e.stop),
      m(2),
      Ze(e.target),
      m(2),
      O(18, e.image ? 18 : -1),
      m(3),
      Ze(e.senderName),
      m(),
      z(
        'src',
        e.senderPic || 'https://secure.gravatar.com/avatar/' + e.senderAvt + '?d=mm&s=30',
        Mt
      )('alt', e.senderName));
  }
}
function _we(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 181)(1, 'div', 12)(2, 'div', 201)(3, 'span', 202),
      v(4, 'Show'),
      u(),
      d(5, 'input', 203),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.swingAlertLimit, o) || (s.swingAlertLimit = o), E(o));
      }),
      u(),
      d(6, 'span', 202),
      v(7, 'entries'),
      u()(),
      d(8, 'span', 204),
      x('click', function () {
        return (D(e), E(g(2).downloadSwingTrades()));
      }),
      T(9, 'i', 205),
      u()(),
      d(10, 'input', 206),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.swingAlertSearch, o) || (s.swingAlertSearch = o), E(o));
      }),
      u()(),
      d(11, 'div', 207)(12, 'table', 208)(13, 'thead')(14, 'tr')(15, 'th'),
      v(16, 'Symbol'),
      u(),
      d(17, 'th'),
      v(18, 'Long/Short'),
      u(),
      d(19, 'th'),
      v(20, 'Alert Date'),
      u(),
      d(21, 'th'),
      v(22, 'Entry Price'),
      u(),
      d(23, 'th'),
      v(24, 'Stop'),
      u(),
      d(25, 'th'),
      v(26, 'Target'),
      u(),
      d(27, 'th'),
      v(28, 'Image'),
      u(),
      d(29, 'th'),
      v(30, 'Sender'),
      u()()(),
      d(31, 'tbody'),
      ht(32, gwe, 23, 17, 'tr', null, Li),
      Je(34, 'searchSwingLogs'),
      Je(35, 'limitSwingLogs'),
      u()()());
  }
  if (2 & t) {
    const e = g(2);
    (m(5),
      je('ngModel', e.swingAlertLimit),
      m(5),
      je('ngModel', e.swingAlertSearch),
      m(22),
      pt(
        Ct(
          35,
          5,
          Ct(34, 2, e.appService.globals.swingAlertsLog, e.swingAlertSearch),
          e.swingAlertLimit
        )
      ));
  }
}
function bwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 27),
      H(1, uwe, 40, 11, 'form', 165),
      d(2, 'div', 166)(3, 'h4', 167),
      v(4, ' Latest Swing Trade Alerts (Last '),
      d(5, 'select', 168),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.swingAlertMonths, o) || (s.swingAlertMonths = o), E(o));
      }),
      x('ngModelChange', function () {
        return (D(e), E(g().onTradeAlertWeeksChange('Swing')));
      }),
      ht(6, hwe, 2, 2, 'option', 169, Li),
      u(),
      v(8, ' Months) '),
      u(),
      H(9, pwe, 2, 0, 'h4', 170)(10, _we, 36, 8),
      u()());
  }
  if (2 & t) {
    const e = g();
    (z('ngClass', ut(4, Hr, 'presAreaTabs-swingAlerts' == e.selectedMainTab)),
      m(),
      O(1, e.isP ? 1 : -1),
      m(4),
      je('ngModel', e.swingAlertMonths),
      m(),
      pt(wo(6, $Ce)),
      m(3),
      O(
        9,
        e.appService.globals.swingAlertsLog && 0 === e.appService.globals.swingAlertsLog.length
          ? 9
          : 10
      ));
  }
}
function vwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 192),
      x('click', function () {
        D(e);
        const o = g(3);
        return E(o.showImagePreview(o.dayTradeAlert.image));
      }),
      T(1, 'img', 193),
      u());
  }
  if (2 & t) {
    const e = g(3);
    (m(), z('src', e.dayTradeAlert.image, Mt)('alt', e.dayTradeAlert.image));
  }
}
function ywe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 194),
      x('click', function () {
        return (D(e), E(g(3).imgUpload('dayTrade')));
      }),
      T(1, 'i', 195),
      v(2, ' Image '),
      u());
  }
}
function Fwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 196),
      x('click', function () {
        return (D(e), E(g(3).removeImageDayTrade()));
      }),
      T(1, 'i', 93),
      u());
  }
}
function Cwe(t, n) {
  1 & t && (T(0, 'i', 197), v(1, 'Discard '));
}
function Swe(t, n) {
  1 & t && (T(0, 'i', 198), v(1, 'Cancel '));
}
function wwe(t, n) {
  1 & t && (T(0, 'i', 199), v(1, 'Save Changes '));
}
function Twe(t, n) {
  1 & t && (T(0, 'i', 200), v(1, 'Submit Alert '));
}
function Dwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'form', 223, 0),
      x('ngSubmit', function () {
        return (D(e), E(g(2).onDayTradeAlertSubmit()));
      }),
      d(2, 'div', 172)(3, 'span', 173),
      v(4, 'Symbol'),
      u(),
      d(5, 'input', 224),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.dayTradeAlert.symbol, o) || (s.dayTradeAlert.symbol = o), E(o));
      }),
      u()(),
      d(6, 'div', 172)(7, 'span', 173),
      v(8, 'Entry Price'),
      u(),
      d(9, 'input', 225),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.dayTradeAlert.entryPrice, o) || (s.dayTradeAlert.entryPrice = o), E(o));
      }),
      u()(),
      d(10, 'div', 172)(11, 'span', 173),
      v(12, 'Stop'),
      u(),
      d(13, 'input', 226),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.dayTradeAlert.stop, o) || (s.dayTradeAlert.stop = o), E(o));
      }),
      u()(),
      d(14, 'div', 172)(15, 'span', 173),
      v(16, 'Target'),
      u(),
      d(17, 'input', 227),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.dayTradeAlert.target, o) || (s.dayTradeAlert.target = o), E(o));
      }),
      u()(),
      d(18, 'div', 172),
      H(19, vwe, 2, 2, 'span', 178)(20, ywe, 3, 0),
      d(21, 'input', 228),
      x('paste', function (o) {
        return (D(e), E(g(2).onImagePaste(o, 'dayTrade')));
      }),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.dayTradeAlert.image, o) || (s.dayTradeAlert.image = o), E(o));
      }),
      u(),
      H(22, Fwe, 2, 0, 'span', 180),
      u(),
      d(23, 'div', 181)(24, 'div', 182)(25, 'div', 183)(26, 'input', 229),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.dayTradeAlert.direction, o) || (s.dayTradeAlert.direction = o), E(o));
      }),
      u(),
      d(27, 'label', 230),
      v(28, ' Long '),
      u()(),
      d(29, 'div', 186)(30, 'input', 231),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.dayTradeAlert.direction, o) || (s.dayTradeAlert.direction = o), E(o));
      }),
      u(),
      d(31, 'label', 232),
      v(32, ' Short '),
      u()()(),
      d(33, 'div', 189)(34, 'button', 190),
      x('click', function () {
        return (D(e), E(g(2).onDayTradeAlertCancel()));
      }),
      H(35, Cwe, 2, 0)(36, Swe, 2, 0),
      u(),
      d(37, 'button', 191),
      H(38, wwe, 2, 0)(39, Twe, 2, 0),
      u()()()());
  }
  if (2 & t) {
    const e = g(2);
    (m(5),
      je('ngModel', e.dayTradeAlert.symbol),
      m(4),
      je('ngModel', e.dayTradeAlert.entryPrice),
      m(4),
      je('ngModel', e.dayTradeAlert.stop),
      m(4),
      je('ngModel', e.dayTradeAlert.target),
      m(2),
      O(19, e.dayTradeAlert.image ? 19 : 20),
      m(2),
      je('ngModel', e.dayTradeAlert.image),
      m(),
      O(22, e.dayTradeAlert.image ? 22 : -1),
      m(4),
      je('ngModel', e.dayTradeAlert.direction),
      m(4),
      je('ngModel', e.dayTradeAlert.direction),
      m(5),
      O(35, e.dayTradeAlert.edit ? 35 : 36),
      m(3),
      O(38, e.dayTradeAlert.edit ? 38 : 39));
  }
}
function Ewe(t, n) {
  if ((1 & t && (d(0, 'option', 169), v(1), u()), 2 & t)) {
    const e = n.$implicit;
    (z('ngValue', e), m(), Ze(e));
  }
}
function kwe(t, n) {
  1 & t && (d(0, 'h4', 170), v(1, ' No Day Trade Alerts to display. '), u());
}
function xwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 237),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(3).deleteDayTradeAlert(o._id, o));
      }),
      T(1, 'i', 217),
      u(),
      d(2, 'span', 143),
      v(3, '|'),
      u(),
      d(4, 'span', 238),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(3).editDayTradeAlert(o));
      }),
      T(5, 'i', 219),
      u());
  }
}
function Mwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'img', 220),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(3).showImagePreview(o.image));
      }),
      u());
  }
  if (2 & t) {
    const e = g().$implicit;
    z('src', e.image, Mt)('alt', e.image);
  }
}
function Awe(t, n) {
  if (
    (1 & t &&
      (d(0, 'tr')(1, 'td')(2, 'span', 209),
      H(3, xwe, 6, 0),
      d(4, 'strong', 210),
      v(5),
      u()()(),
      d(6, 'td'),
      v(7),
      u(),
      d(8, 'td'),
      v(9),
      Je(10, 'date'),
      u(),
      d(11, 'td'),
      v(12),
      u(),
      d(13, 'td'),
      v(14),
      u(),
      d(15, 'td'),
      v(16),
      u(),
      d(17, 'td', 211),
      H(18, Mwe, 1, 2, 'img', 212),
      u(),
      d(19, 'td', 213)(20, 'strong', 214),
      v(21),
      u(),
      T(22, 'img', 215),
      u()()),
    2 & t)
  ) {
    const e = n.$implicit,
      i = g(3);
    (m(2),
      z('ngClass', ut(15, WCe, i.isP)),
      m(),
      O(3, i.isP ? 3 : -1),
      m(2),
      Ne(' ', e.symbol, ' '),
      m(2),
      Ze(e.direction),
      m(2),
      Ne(' ', Ct(10, 12, e.entryDate, 'YYYY-MM-dd hh:mm:ss'), ' '),
      m(3),
      Ze(e.entryPrice),
      m(2),
      Ze(e.stop),
      m(2),
      Ze(e.target),
      m(2),
      O(18, e.image ? 18 : -1),
      m(3),
      Ze(e.senderName),
      m(),
      z(
        'src',
        e.senderPic || 'https://secure.gravatar.com/avatar/' + e.senderAvt + '?d=mm&s=30',
        Mt
      )('alt', e.senderName));
  }
}
function Pwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 181)(1, 'div', 12)(2, 'div', 233)(3, 'span', 202),
      v(4, 'Show'),
      u(),
      d(5, 'input', 234),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.dayTradeAlertLimit, o) || (s.dayTradeAlertLimit = o), E(o));
      }),
      u(),
      d(6, 'span', 202),
      v(7, 'entries'),
      u()(),
      d(8, 'span', 235),
      x('click', function () {
        return (D(e), E(g(2).downloadDayTrades()));
      }),
      T(9, 'i', 205),
      u()(),
      d(10, 'input', 236),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.dayTradeAlertSearch, o) || (s.dayTradeAlertSearch = o), E(o));
      }),
      u()(),
      d(11, 'div', 207)(12, 'table', 208)(13, 'thead')(14, 'tr')(15, 'th'),
      v(16, 'Symbol'),
      u(),
      d(17, 'th'),
      v(18, 'Long/Short'),
      u(),
      d(19, 'th'),
      v(20, 'Alert Date'),
      u(),
      d(21, 'th'),
      v(22, 'Entry Price'),
      u(),
      d(23, 'th'),
      v(24, 'Stop'),
      u(),
      d(25, 'th'),
      v(26, 'Target'),
      u(),
      d(27, 'th'),
      v(28, 'Image'),
      u(),
      d(29, 'th'),
      v(30, 'Sender'),
      u()()(),
      d(31, 'tbody'),
      ht(32, Awe, 23, 17, 'tr', null, Li),
      Je(34, 'searchDayTradeLogs'),
      Je(35, 'limitDayTradeLogs'),
      u()()());
  }
  if (2 & t) {
    const e = g(2);
    (m(5),
      je('ngModel', e.dayTradeAlertLimit),
      m(5),
      je('ngModel', e.dayTradeAlertSearch),
      m(22),
      pt(
        Ct(
          35,
          5,
          Ct(34, 2, e.appService.globals.dayTradeAlertsLog, e.dayTradeAlertSearch),
          e.dayTradeAlertLimit
        )
      ));
  }
}
function Rwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 28),
      H(1, Dwe, 40, 11, 'form', 221),
      d(2, 'div', 222)(3, 'h4', 167),
      v(4, ' Latest Day Trade Alerts (Last '),
      d(5, 'select', 168),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.dayTradeAlertMonths, o) || (s.dayTradeAlertMonths = o), E(o));
      }),
      x('ngModelChange', function () {
        return (D(e), E(g().onTradeAlertWeeksChange('DayTrade')));
      }),
      ht(6, Ewe, 2, 2, 'option', 169, Li),
      u(),
      v(8, ' Months) '),
      u(),
      H(9, kwe, 2, 0, 'h4', 170)(10, Pwe, 36, 8),
      u()());
  }
  if (2 & t) {
    const e = g();
    (z('ngClass', ut(4, Hr, 'presAreaTabs-dayTradeAlerts' == e.selectedMainTab)),
      m(),
      O(1, e.isP ? 1 : -1),
      m(4),
      je('ngModel', e.dayTradeAlertMonths),
      m(),
      pt(wo(6, GCe)),
      m(3),
      O(
        9,
        e.appService.globals.dayTradeAlertsLog &&
          0 === e.appService.globals.dayTradeAlertsLog.length
          ? 9
          : 10
      ));
  }
}
function Iwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 239),
      x('click', function () {
        return (D(e), E(g().deleteSelected()));
      }),
      T(1, 'i', 240),
      v(2, 'Delete Selected '),
      u());
  }
}
function Owe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 241),
      x('click', function () {
        return (D(e), E(g().newFile()));
      }),
      T(1, 'i', 59),
      v(2, ' Upload File '),
      u());
  }
}
function Nwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 242),
      x('click', function () {
        return (D(e), E(g().stopMp3ForAll()));
      }),
      T(1, 'i', 158),
      v(2, 'Stop Playing For All '),
      u());
  }
}
function Lwe(t, n) {
  1 & t && (d(0, 'h4', 48), v(1, 'No room files found.'), u());
}
function Bwe(t, n) {
  if ((1 & t && (d(0, 'td'), T(1, 'input', 256), u()), 2 & t)) {
    const e = g(2).$implicit;
    (m(), xn('value', e._id));
  }
}
function Uwe(t, n) {
  if ((1 & t && (d(0, 'a', 247), T(1, 'img', 257), u()), 2 & t)) {
    const e = g(2).$implicit;
    (z('href', e.vidPath, Mt)('type', e.contentType)('download', e.name),
      m(),
      z('src', e.vidPath, Mt));
  }
}
function jwe(t, n) {
  if ((1 & t && T(0, 'a', 249), 2 & t)) {
    const e = g(2).$implicit;
    z('href', e.vidPath, Mt)('type', e.contentType)('download', e.name);
  }
}
function Vwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 258),
      x('click', function () {
        D(e);
        const o = g(2).$implicit;
        return E(g(2).deleteFile(o.name, o._id));
      }),
      T(1, 'i', 145),
      v(2, 'Delete '),
      u());
  }
}
function Hwe(t, n) {
  1 & t && (d(0, 'span'), T(1, 'i', 163), v(2, 'Stop '), u());
}
function $we(t, n) {
  1 & t && (d(0, 'span'), T(1, 'i', 158), v(2, 'Play '), u());
}
function zwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 259),
      x('click', function () {
        D(e);
        const o = g(2).$implicit;
        return E(g(2).playMp3ForMe(o));
      }),
      H(1, Hwe, 3, 0, 'span')(2, $we, 3, 0),
      u());
  }
  if (2 & t) {
    const e = g(2).$implicit,
      i = g(2);
    (m(), O(1, i.isPlayingForMe && i.isPlayingForMe[e._id] ? 1 : 2));
  }
}
function Gwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 260),
      x('click', function () {
        D(e);
        const o = g(2).$implicit;
        return E(g(2).playMp3ForAll(o.vidPath));
      }),
      T(1, 'i', 158),
      v(2, 'Play For All '),
      u());
  }
}
function Wwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 261),
      x('click', function () {
        D(e);
        const o = g(2).$implicit;
        return E(g(2).overwriteCashRegisterSound(o.vidPath, !0));
      }),
      T(1, 'i', 262),
      v(2, 'Set as alert sound '),
      u());
  }
}
function qwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 263),
      x('click', function () {
        D(e);
        const o = g(2).$implicit;
        return E(g(2).overwriteCashRegisterSound(o.vidPath, !1));
      }),
      T(1, 'i', 145),
      v(2, 'Remove as alert sound '),
      u());
  }
}
function Kwe(t, n) {
  if (
    (1 & t &&
      (H(0, Bwe, 2, 1, 'td'),
      d(1, 'td')(2, 'div', 244)(3, 'div')(4, 'span', 245),
      v(5),
      u(),
      d(6, 'span', 246),
      v(7),
      u(),
      d(8, 'div', 245)(9, 'i'),
      v(10),
      Je(11, 'date'),
      u()()(),
      H(12, Uwe, 2, 4, 'a', 247),
      u()(),
      d(13, 'td')(14, 'div', 248),
      H(15, jwe, 1, 3, 'a', 249),
      d(16, 'a', 250),
      T(17, 'i', 135),
      v(18, 'Download '),
      u(),
      H(19, Vwe, 3, 0, 'button', 251)(20, zwe, 3, 1, 'button', 252)(21, Gwe, 3, 0, 'button', 253)(
        22,
        Wwe,
        3,
        0,
        'button',
        254
      )(23, qwe, 3, 0, 'button', 255),
      u()()),
    2 & t)
  ) {
    const e = g().$implicit,
      i = g(2);
    (O(0, i.isP ? 0 : -1),
      m(5),
      Ne('', e.name, ' '),
      m(2),
      Ne('', i.round(e.size / 1024), 'Kb '),
      m(3),
      Ze(Ct(11, 14, e.created, 'medium')),
      m(2),
      O(12, e.contentType.indexOf('image/') >= 0 ? 12 : -1),
      m(3),
      O(15, -1 == e.contentType.indexOf('image/') ? 15 : -1),
      m(),
      z('href', e.vidPath, Mt)('type', e.contentType)('download', e.name),
      m(3),
      O(19, i.isP ? 19 : -1),
      m(),
      O(20, e.contentType.indexOf('audio/') >= 0 ? 20 : -1),
      m(),
      O(21, i.isP && e.contentType.indexOf('audio/') >= 0 ? 21 : -1),
      m(),
      O(
        22,
        i.isP &&
          e.contentType.indexOf('audio/') >= 0 &&
          (!i.appService.globals.sessData.overwriteCashRegisterSound ||
            (i.appService.globals.sessData.overwriteCashRegisterSound &&
              !i.appService.globals.sessData.overwriteCashRegisterSound.includes(e.vidPath)))
          ? 22
          : -1
      ),
      m(),
      O(
        23,
        i.isP &&
          e.contentType.indexOf('audio/') >= 0 &&
          i.appService.globals.sessData.overwriteCashRegisterSound &&
          i.appService.globals.sessData.overwriteCashRegisterSound.includes(e.vidPath)
          ? 23
          : -1
      ));
  }
}
function Ywe(t, n) {
  if ((1 & t && (d(0, 'tr'), H(1, Kwe, 24, 17), u()), 2 & t)) {
    const e = n.$implicit,
      i = g(2);
    (m(),
      O(
        1,
        ('files' == i.selectedFileTab &&
          e.hasOwnProperty('contentType') &&
          -1 == e.contentType.indexOf('image/') &&
          -1 == e.contentType.indexOf('audio/')) ||
          ('images' == i.selectedFileTab &&
            e.hasOwnProperty('contentType') &&
            e.contentType.indexOf('image/') >= 0) ||
          ('sounds' == i.selectedFileTab &&
            e.hasOwnProperty('contentType') &&
            e.contentType.indexOf('audio/') >= 0)
          ? 1
          : -1
      ));
  }
}
function Qwe(t, n) {
  if (
    (1 & t &&
      (d(0, 'table', 49)(1, 'tbody', 243),
      ht(2, Ywe, 2, 1, 'tr', null, pc),
      Je(4, 'filter'),
      u()()),
    2 & t)
  ) {
    const e = g();
    (m(2), pt(Ct(4, 0, e.sessionFiles, e.filesSearch)));
  }
}
function Xwe(t, n) {
  if ((1 & t && T(0, 'app-ytplayer', 50), 2 & t)) {
    const e = g();
    z('startTime', e.startTime)('ytURL', e.ytURL);
  }
}
function Jwe(t, n) {
  (1 & t && T(0, 'app-scplayer', 51), 2 & t && z('scUrl', g().scUrl));
}
function Zwe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 272)(1, 'span', 273),
      T(2, 'i', 274),
      d(3, 'strong', 275),
      v(4),
      u()(),
      d(5, 'span', 276),
      v(6),
      u()()),
    2 & t)
  ) {
    const e = n.$implicit;
    (m(4), Ne('', e.sender, ':'), m(2), Ze(e.text));
  }
}
function e2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 271, 1),
      x('scroll', function (o) {
        return (D(e), E(g(2).onSpeechRecoScroll(o)));
      }),
      ht(2, Zwe, 7, 2, 'div', 272, LCe),
      u());
  }
  if (2 & t) {
    const e = g(2);
    (m(2), pt(e.getSpeechRecognitionEntries()));
  }
}
function t2e(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 278)(1, 'span', 280),
      v(2),
      Je(3, 'date'),
      u(),
      d(4, 'span', 281)(5, 'strong', 282),
      v(6),
      u(),
      d(7, 'span'),
      v(8),
      u()()()),
    2 & t)
  ) {
    const e = n.$implicit;
    (m(2),
      Ze(Ct(3, 3, e.timestamp, 'shortTime')),
      m(4),
      Ne('', e.sender || 'Unknown', ':'),
      m(2),
      Ne('\xa0', e.text, ''));
  }
}
function n2e(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 279)(1, 'span', 280),
      v(2, 'now'),
      u(),
      d(3, 'span', 281)(4, 'strong', 282),
      v(5),
      u(),
      d(6, 'span'),
      v(7),
      u()()()),
    2 & t)
  ) {
    const e = g(3);
    (m(5),
      Ne('', e.currentSpeechReco.sender || 'Unknown', ':'),
      m(2),
      Ne('\xa0', e.currentSpeechReco.text, ''));
  }
}
function i2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 277, 1),
      x('scroll', function (o) {
        return (D(e), E(g(2).onSpeechRecoScroll(o)));
      }),
      ht(2, t2e, 9, 6, 'div', 278, BCe),
      H(4, n2e, 8, 2, 'div', 279),
      u());
  }
  if (2 & t) {
    const e = g(2);
    (m(2), pt(e.getSpeechRecognitionHistory()), m(2), O(4, e.currentSpeechReco ? 4 : -1));
  }
}
function o2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 283),
      x('click', function () {
        return (D(e), E(g(2).openTranscriptPage()));
      }),
      T(1, 'i', 80),
      u());
  }
  2 & t && Dt('aria-pressed', g(2).speechRecoHistoryMode);
}
function s2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 284),
      x('click', function (o) {
        return (D(e), E(g(2).toggleSpeechRecoHistory(o)));
      }),
      T(1, 'i', 285),
      u());
  }
  2 & t && Dt('aria-pressed', g(2).speechRecoHistoryMode);
}
function r2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 264)(1, 'div', 265),
      H(2, e2e, 4, 0, 'div', 266)(3, i2e, 5, 1),
      u(),
      d(4, 'div', 267),
      H(5, o2e, 2, 1, 'button', 268)(6, s2e, 2, 1, 'button', 269),
      d(7, 'button', 270),
      x('click', function (o) {
        return (D(e), E(g().hideSpeechRecognition(o)));
      }),
      T(8, 'i', 93),
      u()()());
  }
  if (2 & t) {
    const e = g();
    (Et('history-mode', e.speechRecoHistoryMode)('single-line', !e.speechRecoHistoryMode),
      m(2),
      O(2, e.speechRecoHistoryMode ? 3 : 2),
      m(3),
      O(5, e.archivesAvailableTo() ? 5 : -1),
      m(),
      O(6, e.hasHistoryAvailable() ? 6 : -1));
  }
}
const ii = window.$;
let gs;
function vf(t) {
  (t.stopPropagation(),
    t.preventDefault(),
    (t.target.className = 'dragover' == t.type ? 'hover' : ''));
}
function l0(t) {
  (ii('#fileList').show(), ii('#filedrag').hide(), vf(t));
  let n = t.target.files || t.dataTransfer.files;
  ii('#fileList').empty();
  const e = ii('<ul>');
  gs = [];
  for (let o, i = 0; (o = n[i]); i++) (gs.push(o), ii(e).append(`<li>${o.name}</li>`));
  ii('#fileList').append(e);
}
