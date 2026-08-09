const c0 = (t, n) => n.deviceId,
  eDe = (t, n) => n.created;
function tDe(t, n) {
  1 & t && (d(0, 'li', 11)(1, 'a', 87), v(2, 'Session History'), u()());
}
function nDe(t, n) {
  1 & t && (d(0, 'li', 11)(1, 'a', 88), v(2, 'Webinar Tools'), u()());
}
function iDe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 89),
      x('click', function () {
        return (D(e), E(g(2).switchToBackup()));
      }),
      v(1, ' Swap Primary and Backup Media Servers '),
      u());
  }
}
function oDe(t, n) {
  if (1 & t) {
    const e = Y();
    (T(0, 'hr'),
      d(1, 'button', 90),
      x('click', function () {
        return (D(e), E(g(2).adminLogin()));
      }),
      v(2, ' Admin Dashboard Login '),
      u());
  }
}
function sDe(t, n) {
  1 & t && (d(0, 'div', 49), T(1, 'i', 91), v(2, ' Loading devices... '), u());
}
function rDe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 50),
      T(1, 'i', 92),
      v(2),
      d(3, 'button', 93),
      x('click', function () {
        return (D(e), E(g(2).loadDevices()));
      }),
      T(4, 'i', 94),
      v(5, ' Retry '),
      u()());
  }
  if (2 & t) {
    const e = g(2);
    (m(2), Ne(' ', e.devicesLoadError, ' '));
  }
}
function aDe(t, n) {
  if ((1 & t && (d(0, 'option', 97), v(1), u()), 2 & t)) {
    const e = n.$implicit,
      i = g(3);
    (z('value', e.deviceId)('selected', e.deviceId === i.currentAudioDevice),
      m(),
      Ne(' ', e.label, ' '));
  }
}
function lDe(t, n) {
  if ((1 & t && (d(0, 'small', 98), T(1, 'i', 99), v(2), u()), 2 & t)) {
    const e = g(3);
    (m(2), Ne(' Selected: ', e.getDeviceLabel(e.currentAudioDevice, 'audioinput'), ' '));
  }
}
function cDe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 52)(1, 'label', 95),
      v(2, 'Audio device (input):'),
      u(),
      d(3, 'select', 96),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.currentAudioDevice, o) || (s.currentAudioDevice = o), E(o));
      }),
      x('ngModelChange', function (o) {
        return (D(e), E(g(2).onAudioDeviceChange(o)));
      }),
      ht(4, aDe, 2, 3, 'option', 97, c0),
      u(),
      H(6, lDe, 3, 1, 'small', 98),
      u());
  }
  if (2 & t) {
    const e = g(2);
    (m(3),
      je('ngModel', e.currentAudioDevice),
      m(),
      pt(e.audioDevicesList),
      m(2),
      O(6, e.currentAudioDevice ? 6 : -1));
  }
}
function dDe(t, n) {
  1 & t && (d(0, 'div', 100), T(1, 'i', 101), v(2, ' Please connect audio devices. '), u());
}
function uDe(t, n) {
  if ((1 & t && (d(0, 'option', 97), v(1), u()), 2 & t)) {
    const e = n.$implicit,
      i = g(3);
    (z('value', e.deviceId)('selected', e.deviceId === i.currentVideoDevice),
      m(),
      Ne(' ', e.label, ' '));
  }
}
function hDe(t, n) {
  if ((1 & t && (d(0, 'small', 98), T(1, 'i', 99), v(2), u()), 2 & t)) {
    const e = g(3);
    (m(2), Ne(' Selected: ', e.getDeviceLabel(e.currentVideoDevice, 'videoinput'), ' '));
  }
}
function pDe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 52)(1, 'label', 102),
      v(2, 'Video device (input):'),
      u(),
      d(3, 'select', 103),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.currentVideoDevice, o) || (s.currentVideoDevice = o), E(o));
      }),
      x('ngModelChange', function (o) {
        return (D(e), E(g(2).onVideoDeviceChange(o)));
      }),
      ht(4, uDe, 2, 3, 'option', 97, c0),
      u(),
      H(6, hDe, 3, 1, 'small', 98),
      u());
  }
  if (2 & t) {
    const e = g(2);
    (m(3),
      je('ngModel', e.currentVideoDevice),
      m(),
      pt(e.videoDevicesList),
      m(2),
      O(6, e.currentVideoDevice ? 6 : -1));
  }
}
function fDe(t, n) {
  1 & t && (d(0, 'div', 100), T(1, 'i', 104), v(2, ' Please connect video devices. '), u());
}
function mDe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div')(1, 'div', 105)(2, 'label', 106),
      v(
        3,
        ' Player Link (give this to viewers to be able to see your broadcast, each time you enabled the player this link changes): '
      ),
      u(),
      d(4, 'button', 83),
      x('click', function () {
        return (D(e), E(g(2).copyToClipboardPlayer()));
      }),
      T(5, 'i', 107),
      v(6, ' Copy '),
      u()(),
      T(7, 'textarea', 108),
      u());
  }
  if (2 & t) {
    const e = g(2);
    (m(7),
      No('border-color', e.streamingPlayerEnabled ? 'green' : 'red'),
      z('value', e.streamingLinkPlayer));
  }
}
function gDe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 109)(1, 'div', 105)(2, 'label', 106),
      v(3, ' Streaming link: '),
      u(),
      d(4, 'button', 83),
      x('click', function () {
        return (D(e), E(g(3).copyToClipboardRTMP()));
      }),
      T(5, 'i', 107),
      v(6, ' Copy '),
      u(),
      d(7, 'button', 83),
      x('click', function () {
        return (D(e), E(g(3).getNewToken()));
      }),
      T(8, 'i', 110),
      v(9, ' New Link '),
      u()(),
      T(10, 'textarea', 111),
      d(11, 'p'),
      v(12, ' IN OBS or any RTMP compatible broadcaster enter the above link. Replace '),
      d(13, 'strong'),
      v(14, '"name="'),
      u(),
      v(15, ' with your desired name '),
      u(),
      d(16, 'p'),
      v(17, ' Note: you can re-stream this incoming stream to another rtmp destination, click '),
      d(18, 'strong', 112),
      x('click', function () {
        return (D(e), E(g(3).openRestreamTab()));
      }),
      v(19, 'here'),
      u(),
      v(20, ' to set that up. '),
      u()(),
      T(21, 'hr'));
  }
  if (2 & t) {
    const e = g(3);
    (m(10), z('value', e.streamingLinkRTMP));
  }
}
function _De(t, n) {
  if (
    (1 & t &&
      (d(0, 'p'),
      v(
        1,
        ' If you want to stream directly from OBS into this room, you can use the following interface to get your WHIP streraming link. '
      ),
      u(),
      H(2, gDe, 22, 1)),
    2 & t)
  ) {
    const e = g(2);
    (m(2), O(2, e.streamingLinkRTMP ? 2 : -1));
  }
}
function bDe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 69),
      x('click', function () {
        return (D(e), E(g(3).startStreaming()));
      }),
      T(1, 'i', 118),
      v(2, ' Start WHIP Streaming '),
      u(),
      d(3, 'button', 84),
      x('click', function () {
        return (D(e), E(g(3).stopStreaming()));
      }),
      T(4, 'i', 72),
      v(5, ' Stop WHIP Streaming '),
      u());
  }
}
function vDe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 80),
      H(1, bDe, 6, 0),
      d(2, 'div', 109)(3, 'div', 105)(4, 'label', 106),
      v(5, ' Streaming link: '),
      u(),
      d(6, 'button', 83),
      x('click', function () {
        return (D(e), E(g(2).copyToClipboard()));
      }),
      T(7, 'i', 107),
      v(8, ' Copy '),
      u()(),
      d(9, 'div', 113)(10, 'label', 114),
      v(11, 'Streaming Link'),
      u(),
      T(12, 'textarea', 115),
      u(),
      d(13, 'div', 113)(14, 'label', 116),
      v(15, 'Bearer'),
      u(),
      d(16, 'button', 83),
      x('click', function () {
        return (D(e), E(g(2).copyToClipboardBearer()));
      }),
      T(17, 'i', 107),
      v(18, ' Copy '),
      u(),
      T(19, 'textarea', 117),
      u(),
      d(20, 'p'),
      v(21, ' Note: you can re-stream this incoming stream to another rtmp destination, click '),
      d(22, 'strong', 112),
      x('click', function () {
        return (D(e), E(g(2).openRestreamTab()));
      }),
      v(23, 'here'),
      u(),
      v(24, ' to set that up. '),
      u(),
      d(25, 'p'),
      v(26, ' IN OBS, under streaming, select "WHIP", and enter the above link. Replace '),
      d(27, 'strong'),
      v(28, '"name="'),
      u(),
      v(29, ' with your desired name '),
      u()()());
  }
  if (2 & t) {
    const e = g(2);
    (m(),
      O(1, e.useMTX ? -1 : 1),
      m(11),
      z('value', e.streamingLink),
      m(7),
      z('value', e.streamKey));
  }
}
function yDe(t, n) {
  if (
    (1 & t &&
      (d(0, 'a', 123)(1, 'div', 124)(2, 'h5', 125),
      v(3),
      u(),
      d(4, 'small'),
      v(5),
      Je(6, 'date'),
      u()(),
      d(7, 'p', 125),
      v(8),
      u()()),
    2 & t)
  ) {
    const e = n.$implicit;
    (m(3), Ze(e.eventName), m(2), Ze(Ct(6, 3, e.created, 'medium')), m(3), Ze(e.eventValue));
  }
}
function FDe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 119)(1, 'div', 120)(2, 'button', 121),
      x('click', function () {
        return (D(e), E(g(3).appService.fetchSessionHistory()));
      }),
      T(3, 'i', 122),
      v(4, ' Refresh '),
      u()(),
      ht(5, yDe, 9, 6, 'a', 123, eDe),
      u());
  }
  if (2 & t) {
    const e = g(3);
    (m(5), pt(e.appService.globals.sessionHistory));
  }
}
function CDe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 120),
      v(1, 'No session history.'),
      u(),
      d(2, 'div', 120)(3, 'button', 121),
      x('click', function () {
        return (D(e), E(g(3).appService.fetchSessionHistory()));
      }),
      T(4, 'i', 122),
      v(5, ' Load History '),
      u()());
  }
}
function SDe(t, n) {
  if ((1 & t && (d(0, 'div', 85), H(1, FDe, 7, 0, 'div', 119)(2, CDe, 6, 0), u()), 2 & t)) {
    const e = g(2);
    (m(),
      O(
        1,
        e.appService.globals.sessionHistory && e.appService.globals.sessionHistory.length > 0
          ? 1
          : 2
      ));
  }
}
function wDe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 86)(1, 'div', 126)(2, 'button', 127),
      x('click', function () {
        return (D(e), E(g(2).sendVideoToRoom()));
      }),
      T(3, 'i', 128),
      v(4, ' Send video to room '),
      u(),
      d(5, 'button', 127),
      x('click', function () {
        return (D(e), E(g(2).sendSalesImageToChat()));
      }),
      T(6, 'i', 129),
      v(7, ' Send sales image to chat '),
      u(),
      d(8, 'button', 127),
      x('click', function () {
        return (D(e), E(g(2).sendUsersToURL()));
      }),
      T(9, 'i', 130),
      v(10, ' Send users to URL '),
      u()()());
  }
}
function TDe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'ul', 10)(1, 'li', 11)(2, 'a', 12),
      v(3, 'Session Control / Reset'),
      u()(),
      d(4, 'li', 11)(5, 'a', 13),
      v(6, 'Close Session'),
      u()(),
      d(7, 'li', 11)(8, 'a', 14),
      v(9, 'Lock Session'),
      u()(),
      d(10, 'li', 11)(11, 'a', 15),
      v(12, 'A/V Device Selection'),
      u()(),
      d(13, 'li', 11)(14, 'a', 16),
      v(15, 'Streaming'),
      u()(),
      H(16, tDe, 3, 0, 'li', 11)(17, nDe, 3, 0, 'li', 11),
      u(),
      d(18, 'div', 17)(19, 'div', 18)(20, 'div', 19)(21, 'div', 20)(22, 'button', 21),
      x('click', function () {
        return (D(e), E(g().reloadSession()));
      }),
      v(23, ' Reload Session Config '),
      u(),
      d(24, 'h5', 22),
      v(
        25,
        ' Reloads the session configuration, useful if something changed and you want it to take effect. '
      ),
      u(),
      T(26, 'br'),
      d(27, 'button', 21),
      x('click', function () {
        return (D(e), E(g().refreshRoster()));
      }),
      v(28, ' Refresh Roster & Count (User List) '),
      u(),
      d(29, 'h5', 22),
      v(30, ' This clears the user list and forces all "stale" connections out. '),
      d(31, 'strong', 23),
      v(32, 'It will take up to 1/2 minute for changes to take effect'),
      u()(),
      T(33, 'hr'),
      d(34, 'button', 24),
      x('click', function () {
        return (D(e), E(g().softReset()));
      }),
      v(35, ' Soft Reset Session '),
      u(),
      H(36, iDe, 2, 0, 'button', 25),
      d(37, 'h5', 22),
      v(
        38,
        ' Use this before a hard reset. Resets the media state of the room, Makes all users reconnect to the media servers gently. Works Well... Swap to your backup media servers if the primary are not working, and vice versa. '
      ),
      u(),
      T(39, 'br')(40, 'br'),
      d(41, 'button', 26),
      x('click', function () {
        return (D(e), E(g().hardReset()));
      }),
      v(42, ' Hard Reset/ All Reload '),
      u(),
      d(43, 'h5', 22),
      v(44, ' Hard Resetting forces everyone to reload the session and page. '),
      u(),
      T(45, 'br'),
      d(46, 'button', 26),
      x('click', function () {
        return (D(e), E(g().hardResetAndRevoke()));
      }),
      v(47, ' Hard Reset and Revoke Tokens '),
      u(),
      T(48, 'br'),
      d(49, 'h5', 22),
      v(
        50,
        ' Hard Resetting forces everyone to reload the session and page, also revokes session tokens, forcing users to log in again. '
      ),
      u()(),
      d(51, 'div', 27)(52, 'h3'),
      T(53, 'i', 28),
      v(54, ' Group Chat Control'),
      u(),
      d(55, 'div', 29)(56, 'input', 30),
      x('click', function (o) {
        return (D(e), E(g().changeChatMode('g', o)));
      }),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (
          He(s.appService.globals.sessData.chatMode, o) ||
            (s.appService.globals.sessData.chatMode = o),
          E(o)
        );
      }),
      u(),
      d(57, 'label', 31),
      v(58, 'Regular Group Chat'),
      u()(),
      d(59, 'div', 29)(60, 'input', 32),
      x('click', function (o) {
        return (D(e), E(g().changeChatMode('p', o)));
      }),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (
          He(s.appService.globals.sessData.chatMode, o) ||
            (s.appService.globals.sessData.chatMode = o),
          E(o)
        );
      }),
      u(),
      d(61, 'label', 33),
      v(62, "Webinar Mode (Regular users don't see each others posts)"),
      u(),
      d(63, 'p'),
      v(
        64,
        " In this mode, presenters will see everyones questions/comments, but users will not see each others' chats. "
      ),
      u()(),
      d(65, 'div', 29)(66, 'input', 34),
      x('click', function (o) {
        return (D(e), E(g().changeChatMode('d', o)));
      }),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (
          He(s.appService.globals.sessData.chatMode, o) ||
            (s.appService.globals.sessData.chatMode = o),
          E(o)
        );
      }),
      u(),
      d(67, 'label', 35),
      v(68, 'Disable Group Chat'),
      u()(),
      H(69, oDe, 3, 0),
      u()()(),
      d(70, 'div', 36)(71, 'div', 37)(72, 'button', 38),
      x('click', function () {
        return (D(e), E(g().saveAndCloseSession()));
      }),
      T(73, 'i', 39),
      v(74, ' Save Message and Close Session '),
      u(),
      d(75, 'button', 38),
      x('click', function () {
        return (D(e), E(g().saveCloseMessage()));
      }),
      T(76, 'i', 39),
      v(77, ' Just Save Close Message '),
      u(),
      d(78, 'button', 38),
      x('click', function () {
        return (D(e), E(g().openSession()));
      }),
      v(79, ' Open Session '),
      u()(),
      T(80, 'div', 40),
      Je(81, 'noSanitize'),
      u(),
      d(82, 'div', 41)(83, 'button', 42),
      x('click', function () {
        return (D(e), E(g().lockSession(!1)));
      }),
      v(84, ' Lock Session '),
      u(),
      d(85, 'button', 43),
      x('click', function () {
        return (D(e), E(g().lockSession(!0)));
      }),
      v(86, ' Lock Session & kick users. '),
      u(),
      d(87, 'button', 44),
      x('click', function () {
        return (D(e), E(g().unlockSession()));
      }),
      v(88, ' Unlock Session '),
      u(),
      d(89, 'h4', 22),
      v(
        90,
        ' Lock Session? If locked only presenters/admins will be able to use the room. Regular users will not be allowed to enter until you unlock it. '
      ),
      u()(),
      d(91, 'div', 45)(92, 'div', 46)(93, 'button', 47),
      x('click', function () {
        return (D(e), E(g().loadDevices()));
      }),
      T(94, 'i', 48),
      v(95, ' Refresh Devices '),
      u()(),
      H(96, sDe, 3, 0, 'div', 49)(97, rDe, 6, 1, 'div', 50),
      d(98, 'div', 51),
      H(99, cDe, 7, 2, 'div', 52)(100, dDe, 3, 0)(101, pDe, 7, 2, 'div', 52)(102, fDe, 3, 0),
      u(),
      d(103, 'div', 53)(104, 'div', 54)(105, 'input', 55),
      x('change', function () {
        return (D(e), E(g().echoCancellationOnChange()));
      }),
      u(),
      d(106, 'label', 56),
      v(107, ' Echo Cancellation '),
      u()(),
      d(108, 'div', 54)(109, 'input', 57),
      x('change', function () {
        return (D(e), E(g().noiseSuppressionOnChange()));
      }),
      u(),
      d(110, 'label', 58),
      v(111, ' Noise Suppression '),
      u()(),
      d(112, 'div', 54)(113, 'input', 59),
      x('change', function () {
        return (D(e), E(g().autoGainControlOnChange()));
      }),
      u(),
      d(114, 'label', 60),
      v(115, ' Auto Gain '),
      u()()()(),
      d(116, 'div', 61)(117, 'ul', 62)(118, 'li', 63)(119, 'a', 64),
      v(120, 'Stream RTMP/WHIP/OBS'),
      u()(),
      d(121, 'li', 63)(122, 'a', 65),
      v(123, 'Restream'),
      u()(),
      d(124, 'li', 63)(125, 'a', 66),
      v(126, 'Stream Player'),
      u()()(),
      d(127, 'div', 67)(128, 'div', 68)(129, 'p'),
      v(
        130,
        ' The stream player tool allows you to create a link you can share with others to watch your stream. This is useful if you want to share your stream with others who are not logged in to the trading room. They will just see the screenshare sections (no chat/notes/files/etc) '
      ),
      u(),
      d(131, 'p'),
      v(132, ' Stream Player enabled: '),
      d(133, 'span'),
      v(134),
      u()(),
      d(135, 'div', 53)(136, 'button', 69),
      x('click', function () {
        return (D(e), E(g().enablePlayer()));
      }),
      T(137, 'i', 70),
      v(138, ' Enable Stream Player '),
      u(),
      d(139, 'button', 71),
      x('click', function () {
        return (D(e), E(g().disablePlayer()));
      }),
      T(140, 'i', 72),
      v(141, ' Disable Stream Player '),
      u()(),
      H(142, mDe, 8, 3, 'div'),
      u(),
      d(143, 'div', 73)(144, 'div', 74)(145, 'div', 75)(146, 'input', 76),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.streamingType, o) || (s.streamingType = o), E(o));
      }),
      u(),
      d(147, 'label', 77),
      v(148, ' Rtmp '),
      u()(),
      d(149, 'div', 75)(150, 'input', 78),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.streamingType, o) || (s.streamingType = o), E(o));
      }),
      u(),
      d(151, 'label', 79),
      v(152, ' Whip '),
      u()()(),
      H(153, _De, 3, 1)(154, vDe, 30, 3, 'div', 80),
      u(),
      d(155, 'div', 81)(156, 'textarea', 82),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.restreamLink, o) || (s.restreamLink = o), E(o));
      }),
      x('change', function (o) {
        return (D(e), E(g().onRestreamLinkChange(o)));
      }),
      u(),
      d(157, 'button', 83),
      x('click', function () {
        return (D(e), E(g().startRestream(!1)));
      }),
      T(158, 'i', 39),
      v(159, ' Set Restream URL '),
      u(),
      d(160, 'button', 84),
      x('click', function () {
        return (D(e), E(g().startRestream(!0)));
      }),
      T(161, 'i', 39),
      v(162, ' Clear Restream URL '),
      u()()()(),
      H(163, SDe, 3, 1, 'div', 85)(164, wDe, 11, 0, 'div', 86),
      u());
  }
  if (2 & t) {
    const e = g();
    (m(16),
      O(16, e.appService.globals.isPresenter ? 16 : -1),
      m(),
      O(17, e.appService.globals.isPresenter ? 17 : -1),
      m(19),
      O(36, e.appService.globals.sessData.backupClusterID ? 36 : -1),
      m(20),
      je('ngModel', e.appService.globals.sessData.chatMode),
      m(4),
      je('ngModel', e.appService.globals.sessData.chatMode),
      m(6),
      je('ngModel', e.appService.globals.sessData.chatMode),
      m(3),
      O(
        69,
        e.appService.globals.isPresenter && e.appService.globals.sessData.modAdminLoginList
          ? 69
          : -1
      ),
      m(11),
      z('innerHTML', Ct(81, 29, e.appService.globals.sessData.closedTxt, 'html'), wn),
      m(13),
      z('disabled', e.devicesLoading),
      m(),
      z('ngClass', e.devicesLoading ? 'fa-spinner fa-spin' : 'fa-sync-alt'),
      m(2),
      O(96, e.devicesLoading ? 96 : -1),
      m(),
      O(97, e.devicesLoadError ? 97 : -1),
      m(2),
      O(
        99,
        e.audioDevicesList && e.audioDevicesList.length > 0
          ? 99
          : e.devicesLoading || e.devicesLoadError
            ? -1
            : 100
      ),
      m(2),
      O(
        101,
        e.videoDevicesList && e.videoDevicesList.length > 0
          ? 101
          : e.devicesLoading || e.devicesLoadError
            ? -1
            : 102
      ),
      m(4),
      z('checked', e.appService.globals.preferences.echoCancellation),
      m(4),
      z('checked', e.appService.globals.preferences.noiseSuppression),
      m(4),
      z('checked', e.appService.globals.preferences.autoGainControl),
      m(20),
      No('color', e.streamingPlayerEnabled ? 'green' : 'red'),
      z('@flash', e.streamingPlayerEnabled ? 'flash' : null),
      m(),
      Ze(e.streamingPlayerEnabled),
      m(8),
      O(142, e.streamingPlayerEnabled ? 142 : -1),
      m(4),
      je('ngModel', e.streamingType),
      m(4),
      je('ngModel', e.streamingType),
      m(3),
      O(153, 'RTMP' === e.streamingType ? 153 : -1),
      m(),
      O(154, 'WHIP' === e.streamingType ? 154 : -1),
      m(2),
      je('ngModel', e.restreamLink),
      m(7),
      O(163, e.appService.globals.isPresenter ? 163 : -1),
      m(),
      O(164, e.appService.globals.isPresenter ? 164 : -1));
  }
}
function DDe(t, n) {
  if ((1 & t && (d(0, 'option', 97), v(1), u()), 2 & t)) {
    const e = n.$implicit,
      i = g(3);
    (z('value', e.deviceId)('selected', e.deviceId === i.currentAudioDevice),
      m(),
      Ne(' ', e.label, ' '));
  }
}
function EDe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 52)(1, 'label', 95),
      v(2, 'Audio device (input):'),
      u(),
      d(3, 'select', 133),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.currentAudioDevice, o) || (s.currentAudioDevice = o), E(o));
      }),
      ht(4, DDe, 2, 3, 'option', 97, c0),
      u()());
  }
  if (2 & t) {
    const e = g(2);
    (m(3), je('ngModel', e.currentAudioDevice), m(), pt(e.audioDevicesList));
  }
}
function kDe(t, n) {
  1 & t && (d(0, 'div', 52), v(1, 'Please connect audio devices.'), u());
}
function xDe(t, n) {
  if ((1 & t && (d(0, 'option', 97), v(1), u()), 2 & t)) {
    const e = n.$implicit,
      i = g(3);
    (z('value', e.deviceId)('selected', e.deviceId === i.currentVideoDevice),
      m(),
      Ne(' ', e.label, ' '));
  }
}
function MDe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 52)(1, 'label', 102),
      v(2, 'Video device (input):'),
      u(),
      d(3, 'select', 134),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.currentVideoDevice, o) || (s.currentVideoDevice = o), E(o));
      }),
      ht(4, xDe, 2, 3, 'option', 97, c0),
      u()());
  }
  if (2 & t) {
    const e = g(2);
    (m(3), je('ngModel', e.currentVideoDevice), m(), pt(e.videoDevicesList));
  }
}
function ADe(t, n) {
  1 & t && (d(0, 'div', 52), v(1, 'Please connect video devices.'), u());
}
function PDe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'form', 131, 0),
      x('ngSubmit', function () {
        D(e);
        const o = It(1);
        return E(g().submitNewDevices(o));
      }),
      H(2, EDe, 6, 1, 'div', 52)(3, kDe, 2, 0)(4, MDe, 6, 1, 'div', 52)(5, ADe, 2, 0),
      d(6, 'button', 132),
      v(7, ' Change Devices '),
      u()(),
      d(8, 'div', 53)(9, 'div', 54)(10, 'input', 55),
      x('change', function () {
        return (D(e), E(g().echoCancellationOnChange()));
      }),
      u(),
      d(11, 'label', 56),
      v(12, ' Echo Cancellation '),
      u()(),
      d(13, 'div', 54)(14, 'input', 57),
      x('change', function () {
        return (D(e), E(g().noiseSuppressionOnChange()));
      }),
      u(),
      d(15, 'label', 58),
      v(16, ' Noise Suppression '),
      u()(),
      d(17, 'div', 54)(18, 'input', 59),
      x('change', function () {
        return (D(e), E(g().autoGainControlOnChange()));
      }),
      u(),
      d(19, 'label', 60),
      v(20, ' Auto Gain '),
      u()()());
  }
  if (2 & t) {
    const e = g();
    (m(2),
      O(2, e.audioDevicesList && e.audioDevicesList.length > 0 ? 2 : 3),
      m(2),
      O(4, e.videoDevicesList && e.videoDevicesList.length > 0 ? 4 : 5),
      m(6),
      z('checked', e.appService.globals.preferences.echoCancellation),
      m(4),
      z('checked', e.appService.globals.preferences.noiseSuppression),
      m(4),
      z('checked', e.appService.globals.preferences.autoGainControl));
  }
}
window;
const $r = window.$;
