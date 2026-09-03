const NCe = ['speechRecoBody'],
  pc = (t, n) => n._id,
  LCe = (t, n) => n.userID,
  BCe = (t, n) => n.sender,
  UCe = (t, n) => n.timestamp,
  mo = (t) => ({ active: t }),
  jCe = (t, n) => ({ 'show active': t, 'is-fullscreenshare': n }),
  Hr = (t) => ({ 'show active': t }),
  VCe = (t) => ({ 'viewer-only-screen-tab': t }),
  HCe = (t) => ({ 'viewer-only-screen-zoom-controls': t }),
  $Ce = (t) => ({ muted: t }),
  zCe = () => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  GCe = (t) => ({ 'swing-symbol-container': t }),
  WCe = () => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  qCe = (t) => ({ 'day-trade-symbol-container': t });
function KCe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 15)(1, 'span', 53),
      T(2, 'i', 54),
      u(),
      d(3, 'ul', 55)(4, 'li', 56),
      x('click', function () {
        return (D(e), E(g().newNote()));
      }),
      d(5, 'a', 57),
      T(6, 'i', 58),
      v(7, ' New Note'),
      u()()()());
  }
}
function YCe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 31),
      x('click', function () {
        return (D(e), E(g().onMainTabChange('presAreaTabs-recordings')));
      }),
      d(1, 'a', 59)(2, 'div', 12)(3, 'div'),
      T(4, 'i', 60),
      d(5, 'span', 14),
      v(6, 'Recordings'),
      u()()()()());
  }
  if (2 & t) {
    const e = g();
    (m(), z('ngClass', ct(1, mo, 'presAreaTabs-recordings' == e.selectedMainTab)));
  }
}
function QCe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 31),
      x('click', function () {
        return (D(e), E(g().onMainTabChange('presAreaTabs-videoplayer')));
      }),
      d(1, 'a', 61)(2, 'div', 12)(3, 'div'),
      T(4, 'i', 62),
      d(5, 'span', 14),
      v(6, 'VideoPlayer'),
      u()()()()());
  }
  if (2 & t) {
    const e = g();
    (m(), z('ngClass', ct(1, mo, 'presAreaTabs-videoplayer' == e.selectedMainTab)));
  }
}
function XCe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 31),
      x('click', function () {
        return (D(e), E(g().onMainTabChange('presAreaTabs-swingAlerts')));
      }),
      d(1, 'a', 63)(2, 'div', 12)(3, 'div'),
      T(4, 'i', 64),
      d(5, 'span', 14),
      v(6, 'Swing Alerts'),
      u()()()()());
  }
  if (2 & t) {
    const e = g();
    (m(), z('ngClass', ct(1, mo, 'presAreaTabs-swingAlerts' == e.selectedMainTab)));
  }
}
function JCe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 31),
      x('click', function () {
        return (D(e), E(g().onMainTabChange('presAreaTabs-dayTradeAlerts')));
      }),
      d(1, 'a', 65)(2, 'div', 12)(3, 'div'),
      T(4, 'i', 64),
      d(5, 'span', 14),
      v(6, 'Day Trades'),
      u()()()()());
  }
  if (2 & t) {
    const e = g();
    (m(), z('ngClass', ct(1, mo, 'presAreaTabs-dayTradeAlerts' == e.selectedMainTab)));
  }
}
function ZCe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div')(1, 'span', 66),
      T(2, 'i', 54),
      u(),
      d(3, 'ul', 67)(4, 'li', 56),
      x('click', function () {
        return (D(e), E(g().newFile()));
      }),
      d(5, 'a', 57),
      T(6, 'i', 58),
      v(7, ' Upload File'),
      u()()()());
  }
}
function eSe(t, n) {
  if ((1 & t && (d(0, 'div', 21), T(1, 'iframe', 68), Xe(2, 'noSanitize'), u()), 2 & t)) {
    const e = g();
    (m(), z('src', Ct(2, 1, e.appService.globals.sessData.customPlayerURL, 'resourceUrl'), Oa));
  }
}
function tSe(t, n) {
  1 & t && (d(0, 'h3', 23), v(1, 'Video off to preserve data...'), u());
}
function nSe(t, n) {
  1 & t && (d(0, 'h3', 23), v(1, 'No one is presenting right now...'), u());
}
function iSe(t, n) {
  1 & t && (d(0, 'span', 74), T(1, 'i', 81), u());
}
function oSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 82),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(3).toggleLockScreen(o._id));
      }),
      T(1, 'i', 83),
      u());
  }
}
function sSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 56),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(3).bringFocusToScreen(o._id));
      }),
      d(1, 'a', 57),
      T(2, 'i', 81),
      v(3, ' Bring everyone here'),
      u()(),
      d(4, 'li', 56),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(3).stopSharingThisScreenRemote(o));
      }),
      d(5, 'a', 57),
      T(6, 'i', 84),
      v(7, ' Stop This Screen'),
      u()());
  }
}
function rSe(t, n) {
  1 & t && (d(0, 'span', 80), T(1, 'i', 83), v(2, ' Lock Screen'), u());
}
function aSe(t, n) {
  1 & t && (d(0, 'span', 85), T(1, 'i', 86), v(2, ' Unlock Screen'), u());
}
function lSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 31),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(3).onScreenShareTabChange(o._id));
      }),
      d(1, 'a', 73),
      H(2, iSe, 2, 0, 'span', 74)(3, oSe, 2, 0, 'span', 75),
      T(4, 'img', 76),
      d(5, 'span', 14),
      v(6),
      u(),
      d(7, 'div', 77)(8, 'span', 78),
      T(9, 'i', 54),
      u(),
      d(10, 'ul', 55),
      H(11, sSe, 8, 0),
      d(12, 'li', 56),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(3).detachScreen(o._id));
      }),
      d(13, 'a', 57),
      T(14, 'i', 79),
      v(15, ' Detach Screen to a new window'),
      u()(),
      d(16, 'li', 56),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(3).toggleLockScreen(o._id));
      }),
      d(17, 'a', 57),
      H(18, rSe, 3, 0, 'span', 80)(19, aSe, 3, 0),
      u()()()()()());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = g(3);
    (m(),
      ei('id', '', e._id, '-tab'),
      z('ngClass', ct(11, mo, i.selectedScreenShareTab == e._id)),
      Et('aria-controls', e._id),
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
function cSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 88)(1, 'button', 101),
      x('click', function () {
        return (D(e), E(g(4).panZoomIn()));
      }),
      T(2, 'i', 102),
      u(),
      d(3, 'button', 101),
      x('click', function () {
        return (D(e), E(g(4).panZoomOut()));
      }),
      T(4, 'i', 103),
      u(),
      d(5, 'button', 101),
      x('click', function () {
        return (D(e), E(g(4).panZoomReset()));
      }),
      T(6, 'i', 104),
      u()());
  }
  if (2 & t) {
    const e = g(4);
    z('ngClass', ct(1, HCe, e.appService.globals.viewerOnlyMode));
  }
}
function dSe(t, n) {
  1 & t && T(0, 'i', 105);
}
function uSe(t, n) {
  1 & t && T(0, 'i', 106);
}
function hSe(t, n) {
  1 & t && T(0, 'i', 107);
}
function pSe(t, n) {
  if (
    (1 & t &&
      (d(0, 'button', 89),
      H(1, dSe, 1, 0, 'i', 105)(2, uSe, 1, 0, 'i', 106)(3, hSe, 1, 0, 'i', 107),
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
function fSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 108),
      x('click', function () {
        return (D(e), E(g(4).mute()));
      }),
      v(1, ' Mute '),
      u());
  }
}
function mSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 109),
      x('click', function () {
        return (D(e), E(g(4).unmute()));
      }),
      v(1, ' Unmute '),
      u());
  }
}
function gSe(t, n) {
  1 & t && (d(0, 'span'), v(1, 'Mute'), u());
}
function _Se(t, n) {
  1 & t && (d(0, 'span'), v(1, 'Muted'), u());
}
function bSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 113)(1, 'input', 114),
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
function vSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 110)(1, 'input', 111),
      x('change', function () {
        const o = D(e).$implicit;
        return E(g(5).toggleTalkingPresenter(o));
      }),
      u(),
      d(2, 'label', 112),
      H(3, gSe, 2, 0, 'span'),
      v(4),
      H(5, _Se, 2, 0, 'span'),
      u()(),
      H(6, bSe, 2, 1, 'div', 113));
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
      z('ngClass', ct(12, $Ce, o.appService.globals.preferences.audioMutedFor[e.userID])),
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
function ySe(t, n) {
  (1 & t && ht(0, vSe, 7, 14, null, null, LCe), 2 & t && pt(g(4).mediaService.talkingUsers));
}
function FSe(t, n) {
  1 & t && T(0, 'i', 100);
}
function CSe(t, n) {
  1 & t && T(0, 'i', 115);
}
function SSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 70)(1, 'div', 87),
      H(2, cSe, 7, 3, 'div', 88)(3, pSe, 4, 3, 'button', 89),
      d(4, 'div', 90)(5, 'h4'),
      v(6, ' Volume '),
      d(7, 'span', 91),
      T(8, 'i', 92),
      u()(),
      d(9, 'input', 93),
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
      H(11, fSe, 2, 0, 'button', 94)(12, mSe, 2, 0, 'button', 95),
      T(13, 'hr'),
      d(14, 'div', 96),
      H(15, ySe, 2, 0),
      u()(),
      d(16, 'button', 97),
      x('click', function () {
        return (D(e), E(g(3).togglePanZoom()));
      }),
      T(17, 'i', 98),
      u(),
      d(18, 'button', 97),
      x('click', function () {
        return (D(e), E(g(3).captureVideoImage()));
      }),
      T(19, 'i', 99),
      u(),
      d(20, 'button', 97),
      x('click', function () {
        return (D(e), E(g(3).fullScreenshare()));
      }),
      H(21, FSe, 1, 0, 'i', 100)(22, CSe, 1, 0),
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
function wSe(t, n) {
  if ((1 & t && (d(0, 'div', 72), T(1, 'app-screenshare-view', 116), u()), 2 & t)) {
    const e = n.$implicit,
      i = g(3);
    (Ah('aria-labelledby', '', e._id, '-tab'),
      xn('id', e._id),
      z('ngClass', ct(5, Hr, i.selectedScreenShareTab == e._id)),
      m(),
      z('muser', e));
  }
}
function TSe(t, n) {
  if (
    (1 & t &&
      (H(0, nSe, 2, 0, 'h3', 23),
      d(1, 'ul', 69),
      ht(2, lSe, 20, 13, 'li', 16, pc),
      H(4, SSe, 23, 7, 'li', 70),
      u(),
      d(5, 'div', 71),
      ht(6, wSe, 2, 7, 'div', 72, pc),
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
      z('ngClass', ct(3, VCe, e.appService.globals.viewerOnlyMode)),
      m(),
      pt(e.mediaService.screenSharingUsers));
  }
}
function DSe(t, n) {
  (1 & t && H(0, tSe, 2, 0, 'h3', 23)(1, TSe, 8, 5),
    2 & t && O(0, g().appService.globals.preferences.disableVideo ? 0 : 1));
}
function ESe(t, n) {
  1 & t && (d(0, 'h3', 23), v(1, 'Video off to preserve data...'), u());
}
function kSe(t, n) {
  1 & t && (d(0, 'h3', 23), v(1, 'No one is streaming right now...'), u());
}
function xSe(t, n) {
  1 & t && (d(0, 'span', 74), T(1, 'i', 81), u());
}
function MSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 82),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(2).toggleLockScreenMTX(o._id));
      }),
      T(1, 'i', 83),
      u());
  }
}
function ASe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 56),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(2).bringFocusToScreen(o._id));
      }),
      d(1, 'a', 57),
      T(2, 'i', 81),
      v(3, ' Bring everyone here'),
      u()());
  }
}
function PSe(t, n) {
  1 & t && (d(0, 'span', 80), T(1, 'i', 83), v(2, ' Lock Screen'), u());
}
function RSe(t, n) {
  1 & t && (d(0, 'span', 85), T(1, 'i', 86), v(2, ' Unlock Screen'), u());
}
function ISe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 31),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(2).onStreamTabChange(o._id));
      }),
      d(1, 'a', 73),
      H(2, xSe, 2, 0, 'span', 74)(3, MSe, 2, 0, 'span', 75),
      d(4, 'span', 14),
      v(5),
      u(),
      d(6, 'div', 77)(7, 'span', 78),
      T(8, 'i', 54),
      u(),
      d(9, 'ul', 55),
      H(10, ASe, 4, 0, 'li'),
      d(11, 'li', 56),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(2).toggleLockScreenMTX(o._id));
      }),
      d(12, 'a', 57),
      H(13, PSe, 3, 0, 'span', 80)(14, RSe, 3, 0),
      u()()()()()());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = g(2);
    (m(),
      ei('id', '', e._id, '-tab'),
      z('ngClass', ct(9, mo, i.selectedMTXStreamTab == e._id)),
      Et('aria-controls', e._id),
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
function OSe(t, n) {
  if ((1 & t && (d(0, 'div', 72), T(1, 'app-streaming-view', 116), u()), 2 & t)) {
    const e = n.$implicit,
      i = g(2);
    (Ah('aria-labelledby', '', e._id, '-tab'),
      xn('id', e._id),
      z('ngClass', ct(5, Hr, i.selectedMTXStreamTab == e._id)),
      m(),
      z('muser', e));
  }
}
function NSe(t, n) {
  if (
    (1 & t &&
      (H(0, kSe, 2, 0, 'h3', 23),
      d(1, 'ul', 117),
      ht(2, ISe, 15, 11, 'li', 16, pc),
      u(),
      d(4, 'div', 118),
      ht(5, OSe, 2, 7, 'div', 72, pc),
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
function LSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div')(1, 'h3'),
      v(2, 'No Notes to display...'),
      u(),
      d(3, 'button', 119),
      x('click', function () {
        return (D(e), E(g().newNote()));
      }),
      v(4, ' New Note '),
      u()());
  }
}
function BSe(t, n) {
  1 & t && (d(0, 'span', 122), T(1, 'i', 125), u());
}
function USe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div')(1, 'span', 126),
      T(2, 'i', 54),
      u(),
      d(3, 'ul', 127)(4, 'li', 56),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(2).editNote(o._id));
      }),
      d(5, 'a', 57),
      T(6, 'i', 128),
      v(7, ' Edit Note'),
      u()(),
      d(8, 'li', 56),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(2).renameTab(o.name, o._id));
      }),
      d(9, 'a', 57),
      v(10, ' Rename Note'),
      u()(),
      d(11, 'li', 56),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(2).bringFocusToTab(o._id));
      }),
      d(12, 'a', 57),
      T(13, 'i', 81),
      v(14, ' Bring everyone here'),
      u()(),
      d(15, 'li', 56),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(2).setAsWelcomeTab(o._id, !1));
      }),
      d(16, 'a', 57),
      T(17, 'i', 125),
      v(18, ' Make Welcome Mat'),
      u()(),
      d(19, 'li', 56),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(2).setAsWelcomeTab(o._id, !0));
      }),
      d(20, 'a', 57),
      T(21, 'i', 125),
      v(22, ' Apply as Welcome Mat to multiple rooms'),
      u()(),
      d(23, 'li', 56),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(2).deleteNote(o._id));
      }),
      d(24, 'a', 57),
      T(25, 'i', 84),
      v(26, ' Delete'),
      u()()()());
  }
}
function jSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 31),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(2).onNotesTabChange(o._id));
      }),
      d(1, 'a', 73)(2, 'div', 12)(3, 'div'),
      H(4, BSe, 2, 0, 'span', 122),
      T(5, 'i', 123),
      d(6, 'a', 124),
      x('dblclick', function () {
        const o = D(e).$implicit;
        return E(g(2).renameTab(o.name, o._id));
      }),
      v(7),
      u()(),
      H(8, USe, 27, 0, 'div'),
      u()()());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = g(2);
    (m(),
      ei('id', '', e._id, '-tab'),
      z('ngClass', ct(9, mo, i.selectedNoteTab == 'noteTab-' + e._id)),
      Et('aria-controls', e._id),
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
function VSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 136),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(2).editNote(o._id));
      }),
      T(1, 'i', 137),
      v(2, 'Edit '),
      u());
  }
}
function HSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 138),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(2).deleteNote(o._id));
      }),
      T(1, 'i', 139),
      v(2, 'Delete '),
      u());
  }
}
function $Se(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 72)(1, 'div', 129),
      T(2, 'app-note', 130),
      u(),
      d(3, 'div', 131)(4, 'div'),
      H(5, VSe, 3, 0, 'button', 132),
      d(6, 'button', 133),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(2).downloadNote(o));
      }),
      T(7, 'i', 134),
      v(8, 'Download '),
      u(),
      H(9, HSe, 3, 0, 'button', 135),
      u()()());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = g(2);
    (Ah('aria-labelledby', '', e._id, '-tab'),
      xn('id', e._id),
      z('ngClass', ct(7, Hr, i.selectedNoteTab == 'noteTab-' + e._id)),
      m(2),
      z('tab', e),
      m(3),
      O(5, i.isP || i.appService.globals.user.canEditNotes ? 5 : -1),
      m(4),
      O(9, i.isP || i.appService.globals.user.canEditNotes ? 9 : -1));
  }
}
function zSe(t, n) {
  if (
    (1 & t &&
      (d(0, 'ul', 120),
      ht(1, jSe, 9, 11, 'li', 16, pc),
      u(),
      d(3, 'div', 121),
      ht(4, $Se, 10, 9, 'div', 72, pc),
      u()),
    2 & t)
  ) {
    const e = g();
    (m(), pt(e.appService.globals.sessionNotes), m(3), pt(e.appService.globals.sessionNotes));
  }
}
function GSe(t, n) {
  if ((1 & t && (d(0, 'div', 25), T(1, 'iframe', 140), Xe(2, 'noSanitize'), u()), 2 & t)) {
    const e = g();
    (z('ngClass', ct(5, Hr, 'presAreaTabs-recordings' == e.selectedMainTab)),
      m(),
      z('src', Ct(2, 2, e.getRecordingsUrl(), 'resourceUrl'), Oa));
  }
}
function WSe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 141),
      v(1, ' Video URL: '),
      d(2, 'strong', 142),
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
function qSe(t, n) {
  if (1 & t) {
    const e = Y();
    (H(0, WSe, 6, 1),
      d(1, 'div', 141),
      v(2, ' Video scheduled for: '),
      d(3, 'span', 142),
      v(4),
      Xe(5, 'date'),
      u()(),
      d(6, 'button', 143),
      x('click', function () {
        return (D(e), E(g(4).stopVideoForAll('remove')));
      }),
      T(7, 'i', 144),
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
function KSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 156),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(5).playVideoForAll(o));
      }),
      T(1, 'i', 157),
      v(2, 'Play For All '),
      u());
  }
}
function YSe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 145)(1, 'span', 152)(2, 'i', 153),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(5).deleteVideoFromList(o));
      }),
      u(),
      v(3),
      u(),
      d(4, 'span', 154),
      H(5, KSe, 3, 0, 'button', 155),
      u()());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = g(5);
    (m(3), Ne('', e, ' '), m(2), O(5, i.videoPlayerUrl || i.videoPlayerUrl === e ? -1 : 5));
  }
}
function QSe(t, n) {
  1 & t && (d(0, 'div', 146), v(1, 'No videos.'), u());
}
function XSe(t, n) {
  if (1 & t) {
    const e = Y();
    (ht(0, YSe, 6, 2, 'div', 145, Li, !1, QSe, 2, 0, 'div', 146),
      d(3, 'div', 147)(4, 'div', 148)(5, 'input', 149),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(4);
        return (He(s.videoURL, o) || (s.videoURL = o), E(o));
      }),
      u(),
      d(6, 'span', 150),
      x('click', function () {
        return (D(e), E(g(4).sendVideoToRoom()));
      }),
      T(7, 'i', 151),
      u()()());
  }
  if (2 & t) {
    const e = g(4);
    (pt(e.videoList), m(5), je('ngModel', e.videoURL));
  }
}
function JSe(t, n) {
  (1 & t && H(0, qSe, 9, 5)(1, XSe, 8, 2),
    2 & t && O(0, g(3).scheduledVideo.videoPlayTime ? 0 : 1));
}
function ZSe(t, n) {
  (1 & t && H(0, JSe, 2, 1), 2 & t && O(0, g(2).isP ? 0 : -1));
}
function ewe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 159)(1, 'button', 161),
      x('click', function () {
        return (D(e), E(g(3).stopVideoForAll('stop')));
      }),
      T(2, 'i', 162),
      v(3, ' Stop For All '),
      u()());
  }
}
function twe(t, n) {
  (1 & t && (T(0, 'iframe', 160), Xe(1, 'noSanitize')),
    2 & t && z('src', Ct(1, 1, g(3).videoPlayerUrl, 'resourceUrl'), Oa));
}
function nwe(t, n) {
  (1 & t && (T(0, 'video', 163), Xe(1, 'noSanitize')),
    2 & t && z('src', Ct(1, 1, g(3).videoPlayerUrl, 'resourceUrl'), Mt));
}
function iwe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 158),
      H(1, ewe, 4, 0, 'div', 159)(2, twe, 2, 4, 'iframe', 160)(3, nwe, 2, 4),
      u()),
    2 & t)
  ) {
    const e = g(2);
    (m(), O(1, e.isP ? 1 : -1), m(), O(2, e.videoPlayerUrl.includes('youtube') ? 2 : 3));
  }
}
function owe(t, n) {
  if ((1 & t && (d(0, 'div', 26), H(1, ZSe, 1, 1)(2, iwe, 4, 2), u()), 2 & t)) {
    const e = g();
    (z('ngClass', ct(2, Hr, 'presAreaTabs-videoplayer' == e.selectedMainTab)),
      m(),
      O(1, e.videoPlayerUrl ? 2 : 1));
  }
}
function swe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 191),
      x('click', function () {
        D(e);
        const o = g(3);
        return E(o.showImagePreview(o.swingAlert.image));
      }),
      T(1, 'img', 192),
      u());
  }
  if (2 & t) {
    const e = g(3);
    (m(), z('src', e.swingAlert.image, Mt)('alt', e.swingAlert.image));
  }
}
function rwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 193),
      x('click', function () {
        return (D(e), E(g(3).imgUpload('swing')));
      }),
      T(1, 'i', 194),
      v(2, ' Image '),
      u());
  }
}
function awe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 195),
      x('click', function () {
        return (D(e), E(g(3).removeImageSwing()));
      }),
      T(1, 'i', 92),
      u());
  }
}
function lwe(t, n) {
  1 & t && (T(0, 'i', 196), v(1, 'Discard '));
}
function cwe(t, n) {
  1 & t && (T(0, 'i', 197), v(1, 'Cancel '));
}
function dwe(t, n) {
  1 & t && (T(0, 'i', 198), v(1, 'Save Changes '));
}
function uwe(t, n) {
  1 & t && (T(0, 'i', 199), v(1, 'Submit Alert '));
}
function hwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'form', 170, 0),
      x('ngSubmit', function () {
        return (D(e), E(g(2).onSwingAlertSubmit()));
      }),
      d(2, 'div', 171)(3, 'span', 172),
      v(4, 'Symbol'),
      u(),
      d(5, 'input', 173),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.swingAlert.symbol, o) || (s.swingAlert.symbol = o), E(o));
      }),
      u()(),
      d(6, 'div', 171)(7, 'span', 172),
      v(8, 'Entry Price'),
      u(),
      d(9, 'input', 174),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.swingAlert.entryPrice, o) || (s.swingAlert.entryPrice = o), E(o));
      }),
      u()(),
      d(10, 'div', 171)(11, 'span', 172),
      v(12, 'Stop'),
      u(),
      d(13, 'input', 175),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.swingAlert.stop, o) || (s.swingAlert.stop = o), E(o));
      }),
      u()(),
      d(14, 'div', 171)(15, 'span', 172),
      v(16, 'Target'),
      u(),
      d(17, 'input', 176),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.swingAlert.target, o) || (s.swingAlert.target = o), E(o));
      }),
      u()(),
      d(18, 'div', 171),
      H(19, swe, 2, 2, 'span', 177)(20, rwe, 3, 0),
      d(21, 'input', 178),
      x('paste', function (o) {
        return (D(e), E(g(2).onImagePaste(o, 'swing')));
      }),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.swingAlert.image, o) || (s.swingAlert.image = o), E(o));
      }),
      u(),
      H(22, awe, 2, 0, 'span', 179),
      u(),
      d(23, 'div', 180)(24, 'div', 181)(25, 'div', 182)(26, 'input', 183),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.swingAlert.direction, o) || (s.swingAlert.direction = o), E(o));
      }),
      u(),
      d(27, 'label', 184),
      v(28, ' Long '),
      u()(),
      d(29, 'div', 185)(30, 'input', 186),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.swingAlert.direction, o) || (s.swingAlert.direction = o), E(o));
      }),
      u(),
      d(31, 'label', 187),
      v(32, ' Short '),
      u()()(),
      d(33, 'div', 188)(34, 'button', 189),
      x('click', function () {
        return (D(e), E(g(2).onSwingAlertCancel()));
      }),
      H(35, lwe, 2, 0)(36, cwe, 2, 0),
      u(),
      d(37, 'button', 190),
      H(38, dwe, 2, 0)(39, uwe, 2, 0),
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
function pwe(t, n) {
  if ((1 & t && (d(0, 'option', 168), v(1), u()), 2 & t)) {
    const e = n.$implicit;
    (z('ngValue', e), m(), Ze(e));
  }
}
function fwe(t, n) {
  1 & t && (d(0, 'h4', 169), v(1, ' No Swing Trade Alerts to display. '), u());
}
function mwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 215),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(3).deleteSwingAlert(o._id, o));
      }),
      T(1, 'i', 216),
      u(),
      d(2, 'span', 142),
      v(3, '|'),
      u(),
      d(4, 'span', 217),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(3).editSwingAlert(o));
      }),
      T(5, 'i', 218),
      u());
  }
}
function gwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'img', 219),
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
function _we(t, n) {
  if (
    (1 & t &&
      (d(0, 'tr')(1, 'td')(2, 'span', 208),
      H(3, mwe, 6, 0),
      d(4, 'strong', 209),
      v(5),
      u()()(),
      d(6, 'td'),
      v(7),
      u(),
      d(8, 'td'),
      v(9),
      Xe(10, 'date'),
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
      d(17, 'td', 210),
      H(18, gwe, 1, 2, 'img', 211),
      u(),
      d(19, 'td', 212)(20, 'strong', 213),
      v(21),
      u(),
      T(22, 'img', 214),
      u()()),
    2 & t)
  ) {
    const e = n.$implicit,
      i = g(3);
    (m(2),
      z('ngClass', ct(15, GCe, i.isP)),
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
function bwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 180)(1, 'div', 12)(2, 'div', 200)(3, 'span', 201),
      v(4, 'Show'),
      u(),
      d(5, 'input', 202),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.swingAlertLimit, o) || (s.swingAlertLimit = o), E(o));
      }),
      u(),
      d(6, 'span', 201),
      v(7, 'entries'),
      u()(),
      d(8, 'span', 203),
      x('click', function () {
        return (D(e), E(g(2).downloadSwingTrades()));
      }),
      T(9, 'i', 204),
      u()(),
      d(10, 'input', 205),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.swingAlertSearch, o) || (s.swingAlertSearch = o), E(o));
      }),
      u()(),
      d(11, 'div', 206)(12, 'table', 207)(13, 'thead')(14, 'tr')(15, 'th'),
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
      ht(32, _we, 23, 17, 'tr', null, Li),
      Xe(34, 'searchSwingLogs'),
      Xe(35, 'limitSwingLogs'),
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
function vwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 27),
      H(1, hwe, 40, 11, 'form', 164),
      d(2, 'div', 165)(3, 'h4', 166),
      v(4, ' Latest Swing Trade Alerts (Last '),
      d(5, 'select', 167),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.swingAlertMonths, o) || (s.swingAlertMonths = o), E(o));
      }),
      x('ngModelChange', function () {
        return (D(e), E(g().onTradeAlertWeeksChange('Swing')));
      }),
      ht(6, pwe, 2, 2, 'option', 168, Li),
      u(),
      v(8, ' Months) '),
      u(),
      H(9, fwe, 2, 0, 'h4', 169)(10, bwe, 36, 8),
      u()());
  }
  if (2 & t) {
    const e = g();
    (z('ngClass', ct(4, Hr, 'presAreaTabs-swingAlerts' == e.selectedMainTab)),
      m(),
      O(1, e.isP ? 1 : -1),
      m(4),
      je('ngModel', e.swingAlertMonths),
      m(),
      pt(To(6, zCe)),
      m(3),
      O(
        9,
        e.appService.globals.swingAlertsLog && 0 === e.appService.globals.swingAlertsLog.length
          ? 9
          : 10
      ));
  }
}
function ywe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 191),
      x('click', function () {
        D(e);
        const o = g(3);
        return E(o.showImagePreview(o.dayTradeAlert.image));
      }),
      T(1, 'img', 192),
      u());
  }
  if (2 & t) {
    const e = g(3);
    (m(), z('src', e.dayTradeAlert.image, Mt)('alt', e.dayTradeAlert.image));
  }
}
function Fwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 193),
      x('click', function () {
        return (D(e), E(g(3).imgUpload('dayTrade')));
      }),
      T(1, 'i', 194),
      v(2, ' Image '),
      u());
  }
}
function Cwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 195),
      x('click', function () {
        return (D(e), E(g(3).removeImageDayTrade()));
      }),
      T(1, 'i', 92),
      u());
  }
}
function Swe(t, n) {
  1 & t && (T(0, 'i', 196), v(1, 'Discard '));
}
function wwe(t, n) {
  1 & t && (T(0, 'i', 197), v(1, 'Cancel '));
}
function Twe(t, n) {
  1 & t && (T(0, 'i', 198), v(1, 'Save Changes '));
}
function Dwe(t, n) {
  1 & t && (T(0, 'i', 199), v(1, 'Submit Alert '));
}
function Ewe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'form', 222, 0),
      x('ngSubmit', function () {
        return (D(e), E(g(2).onDayTradeAlertSubmit()));
      }),
      d(2, 'div', 171)(3, 'span', 172),
      v(4, 'Symbol'),
      u(),
      d(5, 'input', 223),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.dayTradeAlert.symbol, o) || (s.dayTradeAlert.symbol = o), E(o));
      }),
      u()(),
      d(6, 'div', 171)(7, 'span', 172),
      v(8, 'Entry Price'),
      u(),
      d(9, 'input', 224),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.dayTradeAlert.entryPrice, o) || (s.dayTradeAlert.entryPrice = o), E(o));
      }),
      u()(),
      d(10, 'div', 171)(11, 'span', 172),
      v(12, 'Stop'),
      u(),
      d(13, 'input', 225),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.dayTradeAlert.stop, o) || (s.dayTradeAlert.stop = o), E(o));
      }),
      u()(),
      d(14, 'div', 171)(15, 'span', 172),
      v(16, 'Target'),
      u(),
      d(17, 'input', 226),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.dayTradeAlert.target, o) || (s.dayTradeAlert.target = o), E(o));
      }),
      u()(),
      d(18, 'div', 171),
      H(19, ywe, 2, 2, 'span', 177)(20, Fwe, 3, 0),
      d(21, 'input', 227),
      x('paste', function (o) {
        return (D(e), E(g(2).onImagePaste(o, 'dayTrade')));
      }),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.dayTradeAlert.image, o) || (s.dayTradeAlert.image = o), E(o));
      }),
      u(),
      H(22, Cwe, 2, 0, 'span', 179),
      u(),
      d(23, 'div', 180)(24, 'div', 181)(25, 'div', 182)(26, 'input', 228),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.dayTradeAlert.direction, o) || (s.dayTradeAlert.direction = o), E(o));
      }),
      u(),
      d(27, 'label', 229),
      v(28, ' Long '),
      u()(),
      d(29, 'div', 185)(30, 'input', 230),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.dayTradeAlert.direction, o) || (s.dayTradeAlert.direction = o), E(o));
      }),
      u(),
      d(31, 'label', 231),
      v(32, ' Short '),
      u()()(),
      d(33, 'div', 188)(34, 'button', 189),
      x('click', function () {
        return (D(e), E(g(2).onDayTradeAlertCancel()));
      }),
      H(35, Swe, 2, 0)(36, wwe, 2, 0),
      u(),
      d(37, 'button', 190),
      H(38, Twe, 2, 0)(39, Dwe, 2, 0),
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
function kwe(t, n) {
  if ((1 & t && (d(0, 'option', 168), v(1), u()), 2 & t)) {
    const e = n.$implicit;
    (z('ngValue', e), m(), Ze(e));
  }
}
function xwe(t, n) {
  1 & t && (d(0, 'h4', 169), v(1, ' No Day Trade Alerts to display. '), u());
}
function Mwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 236),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(3).deleteDayTradeAlert(o._id, o));
      }),
      T(1, 'i', 216),
      u(),
      d(2, 'span', 142),
      v(3, '|'),
      u(),
      d(4, 'span', 237),
      x('click', function () {
        D(e);
        const o = g().$implicit;
        return E(g(3).editDayTradeAlert(o));
      }),
      T(5, 'i', 218),
      u());
  }
}
function Awe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'img', 219),
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
function Pwe(t, n) {
  if (
    (1 & t &&
      (d(0, 'tr')(1, 'td')(2, 'span', 208),
      H(3, Mwe, 6, 0),
      d(4, 'strong', 209),
      v(5),
      u()()(),
      d(6, 'td'),
      v(7),
      u(),
      d(8, 'td'),
      v(9),
      Xe(10, 'date'),
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
      d(17, 'td', 210),
      H(18, Awe, 1, 2, 'img', 211),
      u(),
      d(19, 'td', 212)(20, 'strong', 213),
      v(21),
      u(),
      T(22, 'img', 214),
      u()()),
    2 & t)
  ) {
    const e = n.$implicit,
      i = g(3);
    (m(2),
      z('ngClass', ct(15, qCe, i.isP)),
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
function Rwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 180)(1, 'div', 12)(2, 'div', 232)(3, 'span', 201),
      v(4, 'Show'),
      u(),
      d(5, 'input', 233),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.dayTradeAlertLimit, o) || (s.dayTradeAlertLimit = o), E(o));
      }),
      u(),
      d(6, 'span', 201),
      v(7, 'entries'),
      u()(),
      d(8, 'span', 234),
      x('click', function () {
        return (D(e), E(g(2).downloadDayTrades()));
      }),
      T(9, 'i', 204),
      u()(),
      d(10, 'input', 235),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.dayTradeAlertSearch, o) || (s.dayTradeAlertSearch = o), E(o));
      }),
      u()(),
      d(11, 'div', 206)(12, 'table', 207)(13, 'thead')(14, 'tr')(15, 'th'),
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
      ht(32, Pwe, 23, 17, 'tr', null, Li),
      Xe(34, 'searchDayTradeLogs'),
      Xe(35, 'limitDayTradeLogs'),
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
function Iwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 28),
      H(1, Ewe, 40, 11, 'form', 220),
      d(2, 'div', 221)(3, 'h4', 166),
      v(4, ' Latest Day Trade Alerts (Last '),
      d(5, 'select', 167),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.dayTradeAlertMonths, o) || (s.dayTradeAlertMonths = o), E(o));
      }),
      x('ngModelChange', function () {
        return (D(e), E(g().onTradeAlertWeeksChange('DayTrade')));
      }),
      ht(6, kwe, 2, 2, 'option', 168, Li),
      u(),
      v(8, ' Months) '),
      u(),
      H(9, xwe, 2, 0, 'h4', 169)(10, Rwe, 36, 8),
      u()());
  }
  if (2 & t) {
    const e = g();
    (z('ngClass', ct(4, Hr, 'presAreaTabs-dayTradeAlerts' == e.selectedMainTab)),
      m(),
      O(1, e.isP ? 1 : -1),
      m(4),
      je('ngModel', e.dayTradeAlertMonths),
      m(),
      pt(To(6, WCe)),
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
function Owe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 238),
      x('click', function () {
        return (D(e), E(g().deleteSelected()));
      }),
      T(1, 'i', 239),
      v(2, 'Delete Selected '),
      u());
  }
}
function Nwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 240),
      x('click', function () {
        return (D(e), E(g().newFile()));
      }),
      T(1, 'i', 58),
      v(2, ' Upload File '),
      u());
  }
}
function Lwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 241),
      x('click', function () {
        return (D(e), E(g().stopMp3ForAll()));
      }),
      T(1, 'i', 157),
      v(2, 'Stop Playing For All '),
      u());
  }
}
function Bwe(t, n) {
  1 & t && (d(0, 'h4', 48), v(1, 'No room files found.'), u());
}
function Uwe(t, n) {
  (1 & t && T(0, 'i', 245),
    2 & t && z('ngClass', 'asc' === g(2).fileSortDir ? 'fa-sort-alpha-down' : 'fa-sort-alpha-up'));
}
function jwe(t, n) {
  1 & t && T(0, 'i', 249);
}
function Vwe(t, n) {
  (1 & t && T(0, 'i', 245),
    2 & t &&
      z('ngClass', 'asc' === g(2).fileSortDir ? 'fa-sort-amount-down' : 'fa-sort-amount-up'));
}
function Hwe(t, n) {
  1 & t && T(0, 'i', 249);
}
function $we(t, n) {
  if ((1 & t && (d(0, 'td'), T(1, 'input', 262), u()), 2 & t)) {
    const e = g(2).$implicit;
    (m(), xn('value', e._id));
  }
}
function zwe(t, n) {
  if ((1 & t && (d(0, 'a', 253), T(1, 'img', 263), u()), 2 & t)) {
    const e = g(2).$implicit;
    (z('href', e.vidPath, Mt)('type', e.contentType)('download', e.name),
      m(),
      z('src', e.vidPath, Mt));
  }
}
function Gwe(t, n) {
  if ((1 & t && T(0, 'a', 255), 2 & t)) {
    const e = g(2).$implicit;
    z('href', e.vidPath, Mt)('type', e.contentType)('download', e.name);
  }
}
function Wwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 264),
      x('click', function () {
        D(e);
        const o = g(2).$implicit;
        return E(g(2).deleteFile(o.name, o._id));
      }),
      T(1, 'i', 144),
      v(2, 'Delete '),
      u());
  }
}
function qwe(t, n) {
  1 & t && (d(0, 'span'), T(1, 'i', 162), v(2, 'Stop '), u());
}
function Kwe(t, n) {
  1 & t && (d(0, 'span'), T(1, 'i', 157), v(2, 'Play '), u());
}
function Ywe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 265),
      x('click', function () {
        D(e);
        const o = g(2).$implicit;
        return E(g(2).playMp3ForMe(o));
      }),
      H(1, qwe, 3, 0, 'span')(2, Kwe, 3, 0),
      u());
  }
  if (2 & t) {
    const e = g(2).$implicit,
      i = g(2);
    (m(), O(1, i.isPlayingForMe && i.isPlayingForMe[e._id] ? 1 : 2));
  }
}
function Qwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 266),
      x('click', function () {
        D(e);
        const o = g(2).$implicit;
        return E(g(2).playMp3ForAll(o.vidPath));
      }),
      T(1, 'i', 157),
      v(2, 'Play For All '),
      u());
  }
}
function Xwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 267),
      x('click', function () {
        D(e);
        const o = g(2).$implicit;
        return E(g(2).overwriteCashRegisterSound(o.vidPath, !0));
      }),
      T(1, 'i', 268),
      v(2, 'Set as alert sound '),
      u());
  }
}
function Jwe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 269),
      x('click', function () {
        D(e);
        const o = g(2).$implicit;
        return E(g(2).overwriteCashRegisterSound(o.vidPath, !1));
      }),
      T(1, 'i', 144),
      v(2, 'Remove as alert sound '),
      u());
  }
}
function Zwe(t, n) {
  if (
    (1 & t &&
      (H(0, $we, 2, 1, 'td'),
      d(1, 'td')(2, 'div', 250)(3, 'div')(4, 'span', 251),
      v(5),
      u(),
      d(6, 'span', 252),
      v(7),
      u(),
      d(8, 'div', 251)(9, 'i'),
      v(10),
      Xe(11, 'date'),
      u()()(),
      H(12, zwe, 2, 4, 'a', 253),
      u()(),
      d(13, 'td')(14, 'div', 254),
      H(15, Gwe, 1, 3, 'a', 255),
      d(16, 'a', 256),
      T(17, 'i', 134),
      v(18, 'Download '),
      u(),
      H(19, Wwe, 3, 0, 'button', 257)(20, Ywe, 3, 1, 'button', 258)(21, Qwe, 3, 0, 'button', 259)(
        22,
        Xwe,
        3,
        0,
        'button',
        260
      )(23, Jwe, 3, 0, 'button', 261),
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
function e2e(t, n) {
  if ((1 & t && (d(0, 'tr'), H(1, Zwe, 24, 17), u()), 2 & t)) {
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
function t2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 242)(1, 'span', 243),
      v(2, 'Sorting by:'),
      u(),
      d(3, 'button', 244),
      x('click', function () {
        return (D(e), E(g().toggleFileSort('name')));
      }),
      v(4, ' Name '),
      H(5, Uwe, 1, 1, 'i', 245)(6, jwe, 1, 0),
      u(),
      d(7, 'button', 246),
      x('click', function () {
        return (D(e), E(g().toggleFileSort('date')));
      }),
      v(8, ' Date '),
      H(9, Vwe, 1, 1, 'i', 245)(10, Hwe, 1, 0),
      u()(),
      d(11, 'table', 247)(12, 'tbody', 248),
      ht(13, e2e, 2, 1, 'tr', null, pc),
      Xe(15, 'filter'),
      Xe(16, 'sortFiles'),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(3),
      z('ngClass', ct(13, mo, 'name' === e.fileSortField))(
        'title',
        'name' === e.fileSortField && 'desc' === e.fileSortDir
          ? 'Sorted Z to A (click to sort A to Z)'
          : 'Sorted A to Z (click to sort Z to A)'
      ),
      m(2),
      O(5, 'name' === e.fileSortField ? 5 : 6),
      m(2),
      z('ngClass', ct(15, mo, 'date' === e.fileSortField))(
        'title',
        'date' === e.fileSortField && 'asc' === e.fileSortDir
          ? 'Sorted oldest to newest (click to sort newest to oldest)'
          : 'Sorted newest to oldest (click to sort oldest to newest)'
      ),
      m(2),
      O(9, 'date' === e.fileSortField ? 9 : 10),
      m(4),
      pt(rg(16, 9, Ct(15, 6, e.sessionFiles, e.filesSearch), e.fileSortField, e.fileSortDir)));
  }
}
function n2e(t, n) {
  if ((1 & t && T(0, 'app-ytplayer', 49), 2 & t)) {
    const e = g();
    z('startTime', e.startTime)('ytURL', e.ytURL);
  }
}
function i2e(t, n) {
  (1 & t && T(0, 'app-scplayer', 50), 2 & t && z('scUrl', g().scUrl));
}
function o2e(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 278)(1, 'span', 279),
      T(2, 'i', 280),
      d(3, 'strong', 281),
      v(4),
      u()(),
      d(5, 'span', 282),
      v(6),
      u()()),
    2 & t)
  ) {
    const e = n.$implicit;
    (m(4), Ne('', e.sender, ':'), m(2), Ze(e.text));
  }
}
function s2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 277, 1),
      x('scroll', function (o) {
        return (D(e), E(g(2).onSpeechRecoScroll(o)));
      }),
      ht(2, o2e, 7, 2, 'div', 278, BCe),
      u());
  }
  if (2 & t) {
    const e = g(2);
    (m(2), pt(e.getSpeechRecognitionEntries()));
  }
}
function r2e(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 284)(1, 'span', 286),
      v(2),
      Xe(3, 'date'),
      u(),
      d(4, 'span', 287)(5, 'strong', 288),
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
function a2e(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 285)(1, 'span', 286),
      v(2, 'now'),
      u(),
      d(3, 'span', 287)(4, 'strong', 288),
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
function l2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 283, 1),
      x('scroll', function (o) {
        return (D(e), E(g(2).onSpeechRecoScroll(o)));
      }),
      ht(2, r2e, 9, 6, 'div', 284, UCe),
      H(4, a2e, 8, 2, 'div', 285),
      u());
  }
  if (2 & t) {
    const e = g(2);
    (m(2), pt(e.getSpeechRecognitionHistory()), m(2), O(4, e.currentSpeechReco ? 4 : -1));
  }
}
function c2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 289),
      x('click', function () {
        return (D(e), E(g(2).openTranscriptPage()));
      }),
      T(1, 'i', 79),
      u());
  }
  2 & t && Et('aria-pressed', g(2).speechRecoHistoryMode);
}
function d2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 290),
      x('click', function (o) {
        return (D(e), E(g(2).toggleSpeechRecoHistory(o)));
      }),
      T(1, 'i', 291),
      u());
  }
  2 & t && Et('aria-pressed', g(2).speechRecoHistoryMode);
}
function u2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 270)(1, 'div', 271),
      H(2, s2e, 4, 0, 'div', 272)(3, l2e, 5, 1),
      u(),
      d(4, 'div', 273),
      H(5, c2e, 2, 1, 'button', 274)(6, d2e, 2, 1, 'button', 275),
      d(7, 'button', 276),
      x('click', function (o) {
        return (D(e), E(g().hideSpeechRecognition(o)));
      }),
      T(8, 'i', 92),
      u()()());
  }
  if (2 & t) {
    const e = g();
    (Tt('history-mode', e.speechRecoHistoryMode)('single-line', !e.speechRecoHistoryMode),
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
function c0(t) {
  (ii('#fileList').show(), ii('#filedrag').hide(), vf(t));
  let n = t.target.files || t.dataTransfer.files;
  ii('#fileList').empty();
  const e = ii('<ul>');
  gs = [];
  for (let o, i = 0; (o = n[i]); i++) (gs.push(o), ii(e).append(`<li>${o.name}</li>`));
  ii('#fileList').append(e);
}
