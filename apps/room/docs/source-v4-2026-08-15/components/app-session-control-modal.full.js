const d0 = (t, n) => n.deviceId,
  sDe = (t, n) => n.created;
function rDe(t, n) {
  1 & t && (d(0, 'li', 11)(1, 'a', 87), v(2, 'Session History'), u()());
}
function aDe(t, n) {
  1 & t && (d(0, 'li', 11)(1, 'a', 88), v(2, 'Webinar Tools'), u()());
}
function lDe(t, n) {
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
function cDe(t, n) {
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
function dDe(t, n) {
  1 & t && (d(0, 'div', 49), T(1, 'i', 91), v(2, ' Loading devices... '), u());
}
function uDe(t, n) {
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
function hDe(t, n) {
  if ((1 & t && (d(0, 'option', 97), v(1), u()), 2 & t)) {
    const e = n.$implicit,
      i = g(3);
    (z('value', e.deviceId)('selected', e.deviceId === i.currentAudioDevice),
      m(),
      Ne(' ', e.label, ' '));
  }
}
function pDe(t, n) {
  if ((1 & t && (d(0, 'small', 98), T(1, 'i', 99), v(2), u()), 2 & t)) {
    const e = g(3);
    (m(2), Ne(' Selected: ', e.getDeviceLabel(e.currentAudioDevice, 'audioinput'), ' '));
  }
}
function fDe(t, n) {
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
      ht(4, hDe, 2, 3, 'option', 97, d0),
      u(),
      H(6, pDe, 3, 1, 'small', 98),
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
function mDe(t, n) {
  1 & t && (d(0, 'div', 100), T(1, 'i', 101), v(2, ' Please connect audio devices. '), u());
}
function gDe(t, n) {
  if ((1 & t && (d(0, 'option', 97), v(1), u()), 2 & t)) {
    const e = n.$implicit,
      i = g(3);
    (z('value', e.deviceId)('selected', e.deviceId === i.currentVideoDevice),
      m(),
      Ne(' ', e.label, ' '));
  }
}
function _De(t, n) {
  if ((1 & t && (d(0, 'small', 98), T(1, 'i', 99), v(2), u()), 2 & t)) {
    const e = g(3);
    (m(2), Ne(' Selected: ', e.getDeviceLabel(e.currentVideoDevice, 'videoinput'), ' '));
  }
}
function bDe(t, n) {
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
      ht(4, gDe, 2, 3, 'option', 97, d0),
      u(),
      H(6, _De, 3, 1, 'small', 98),
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
function vDe(t, n) {
  1 & t && (d(0, 'div', 100), T(1, 'i', 104), v(2, ' Please connect video devices. '), u());
}
function yDe(t, n) {
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
      Lo('border-color', e.streamingPlayerEnabled ? 'green' : 'red'),
      z('value', e.streamingLinkPlayer));
  }
}
function FDe(t, n) {
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
function CDe(t, n) {
  if (
    (1 & t &&
      (d(0, 'p'),
      v(
        1,
        ' If you want to stream directly from OBS into this room, you can use the following interface to get your WHIP streraming link. '
      ),
      u(),
      H(2, FDe, 22, 1)),
    2 & t)
  ) {
    const e = g(2);
    (m(2), O(2, e.streamingLinkRTMP ? 2 : -1));
  }
}
function SDe(t, n) {
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
function wDe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 80),
      H(1, SDe, 6, 0),
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
function TDe(t, n) {
  if (
    (1 & t &&
      (d(0, 'a', 123)(1, 'div', 124)(2, 'h5', 125),
      v(3),
      u(),
      d(4, 'small'),
      v(5),
      Xe(6, 'date'),
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
function DDe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 119)(1, 'div', 120)(2, 'button', 121),
      x('click', function () {
        return (D(e), E(g(3).appService.fetchSessionHistory()));
      }),
      T(3, 'i', 122),
      v(4, ' Refresh '),
      u()(),
      ht(5, TDe, 9, 6, 'a', 123, sDe),
      u());
  }
  if (2 & t) {
    const e = g(3);
    (m(5), pt(e.appService.globals.sessionHistory));
  }
}
function EDe(t, n) {
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
function kDe(t, n) {
  if ((1 & t && (d(0, 'div', 85), H(1, DDe, 7, 0, 'div', 119)(2, EDe, 6, 0), u()), 2 & t)) {
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
function xDe(t, n) {
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
function MDe(t, n) {
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
      H(16, rDe, 3, 0, 'li', 11)(17, aDe, 3, 0, 'li', 11),
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
      H(36, lDe, 2, 0, 'button', 25),
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
      H(69, cDe, 3, 0),
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
      Xe(81, 'noSanitize'),
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
      H(96, dDe, 3, 0, 'div', 49)(97, uDe, 6, 1, 'div', 50),
      d(98, 'div', 51),
      H(99, fDe, 7, 2, 'div', 52)(100, mDe, 3, 0)(101, bDe, 7, 2, 'div', 52)(102, vDe, 3, 0),
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
      H(142, yDe, 8, 3, 'div'),
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
      H(153, CDe, 3, 1)(154, wDe, 30, 3, 'div', 80),
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
      H(163, kDe, 3, 1, 'div', 85)(164, xDe, 11, 0, 'div', 86),
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
      Lo('color', e.streamingPlayerEnabled ? 'green' : 'red'),
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
function ADe(t, n) {
  if ((1 & t && (d(0, 'option', 97), v(1), u()), 2 & t)) {
    const e = n.$implicit,
      i = g(3);
    (z('value', e.deviceId)('selected', e.deviceId === i.currentAudioDevice),
      m(),
      Ne(' ', e.label, ' '));
  }
}
function PDe(t, n) {
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
      ht(4, ADe, 2, 3, 'option', 97, d0),
      u()());
  }
  if (2 & t) {
    const e = g(2);
    (m(3), je('ngModel', e.currentAudioDevice), m(), pt(e.audioDevicesList));
  }
}
function RDe(t, n) {
  1 & t && (d(0, 'div', 52), v(1, 'Please connect audio devices.'), u());
}
function IDe(t, n) {
  if ((1 & t && (d(0, 'option', 97), v(1), u()), 2 & t)) {
    const e = n.$implicit,
      i = g(3);
    (z('value', e.deviceId)('selected', e.deviceId === i.currentVideoDevice),
      m(),
      Ne(' ', e.label, ' '));
  }
}
function ODe(t, n) {
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
      ht(4, IDe, 2, 3, 'option', 97, d0),
      u()());
  }
  if (2 & t) {
    const e = g(2);
    (m(3), je('ngModel', e.currentVideoDevice), m(), pt(e.videoDevicesList));
  }
}
function NDe(t, n) {
  1 & t && (d(0, 'div', 52), v(1, 'Please connect video devices.'), u());
}
function LDe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'form', 131, 0),
      x('ngSubmit', function () {
        D(e);
        const o = It(1);
        return E(g().submitNewDevices(o));
      }),
      H(2, PDe, 6, 1, 'div', 52)(3, RDe, 2, 0)(4, ODe, 6, 1, 'div', 52)(5, NDe, 2, 0),
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
AB = (() => {
  class t {
    onRestreamLinkChange(e) {
      this.restreamLink = e.target.value;
    }
    constructor(e, i, o, s) {
      ((this.appService = e),
        (this.modalService = i),
        (this.mediasoup = o),
        (this.alertService = s),
        (this.config = {
          placeholder: 'Type your note here and press save',
          height: '600',
          toolbar: [
            ['style', ['style']],
            ['view', ['fullscreen', 'codeview']],
            ['misc', ['undo', 'redo']],
            ['font', ['bold', 'italic', 'underline', 'clear']],
            ['fontname', ['fontname']],
            ['fontsize', ['fontsize']],
            ['color', ['color']],
            ['para', ['ul', 'ol', 'paragraph']],
            ['height', ['height']],
            ['table', ['table']],
            ['insert', ['link', 'picture', 'video', 'emoji']]
          ],
          popover: {
            image: [
              ['custom', ['imageAttributes']],
              ['image', ['resizeFull', 'resizeHalf', 'resizeQuarter', 'resizeNone']],
              ['float', ['floatLeft', 'floatRight', 'floatNone']],
              ['remove', ['removeMedia']]
            ]
          }
        }),
        (this.audioDevicesList = []),
        (this.videoDevicesList = []),
        (this.isInited = !1),
        (this.useMTX = !1),
        (this.devicesLoading = !1),
        (this.devicesLoadError = ''),
        (this.serverArr = []),
        (this.streamingLink = ''),
        (this.streamKey = ''),
        (this.streamingLinkRTMP = ''),
        (this.streamingLinkPlayer = ''),
        (this.streamingPlayerEnabled = !1),
        (this.yourName = 'OBSStream'),
        (this.streamingType = 'RTMP'));
    }
    ngOnInit() {
      (this.appService.guiEventBus.subscribe('doSessionControlModal', () => {
        ($r('#session-control-modal').modal('show'),
          this.isInited ||
            ($r('#summernoteClosedMsg').summernote(this.config), (this.isInited = !0)));
      }),
        this.appService.appEventBus.subscribe('globalsLoaded', () => {
          this.handleStreaming();
        }));
    }
    ngAfterViewInit() {
      var e = this;
      this.appService.globals.isPresenter &&
        !this.appService.globals.chatOnlyMode &&
        (this.loadDevices(),
        I(function* () {
          let i = yield e.appService.invokeAdminCmd('getStreamServers');
          ((e.serverArr = i.servers), P('streamServers: ', e.serverArr), e.handleStreaming());
        })());
    }
    handleStreaming() {
      var e = this;
      return I(function* () {
        (yield e.getPlayerLink(),
          (e.yourName = encodeURIComponent(
            e.appService.globals.user.name.replace(/[^a-zA-Z0-9_-]/g, '_')
          )),
          e.appService.globals.sessData.useMediaMTX
            ? ((e.useMTX = !0),
              (e.streamingLinkRTMP = `rtmp://${e.appService.globals.streamServerMTX}/room__${e.appService.globals.sessionID}__${e.yourName}?jwt=${e.appService.globals.mtxToken}`),
              (e.restreamLink = e.appService.globals.sessData.restreamToURL
                ? e.appService.globals.sessData.restreamToURL
                : ''),
              (e.streamKey = e.appService.globals.mtxToken),
              (e.streamingLink = `http://${e.appService.globals.streamServerMTX}:8889/room__${e.appService.globals.sessionID}__${e.yourName}/whip`))
            : (e.streamingLink = e.appService.globals.sessData.obsStreamKey
                ? `https://${e.appService.globals.streamServer}/api/stream/${e.appService.globals.sessionID}/${e.appService.globals.sessData.obsStreamKey}?name=${e.yourName}`
                : ''),
          e.appService.globals.sessData.strreamingPlayerEnabled &&
            (e.streamingPlayerEnabled = e.appService.globals.sessData.streamingPlayerEnabled));
      })();
    }
    done() {
      $r('#session-control-modal').modal('hide');
    }
    onAudioDeviceChange(e) {
      (console.log('onAudioDeviceChange: ' + e),
        this.appService.globals.audioDeviceID !== e &&
          ((this.appService.globals.audioDeviceID = e),
          this.appService.localstorage.set('audioDeviceID', e)));
    }
    onVideoDeviceChange(e) {
      this.appService.globals.videoDeviceID !== e &&
        ((this.appService.globals.videoDeviceID = e),
        this.appService.localstorage.set('videoDeviceID', e));
    }
    submitNewDevices(e) {
      console.log(e.form.value);
      const i = e.form.value.audioID || '',
        o = e.form.value.videoID || '';
      (this.appService.globals.audioDeviceID !== i &&
        ((this.appService.globals.audioDeviceID = i),
        this.appService.localstorage.set('audioDeviceID', i)),
        this.appService.globals.videoDeviceID !== o &&
          ((this.appService.globals.videoDeviceID = o),
          this.appService.localstorage.set('videoDeviceID', o)));
    }
    setNewDevices() {
      const e = $r('#audio-deviceList').val(),
        i = $r('#video-deviceList').val();
      (console.log('soundID: ' + e),
        console.log('videoI: ' + i),
        this.appService.globals.audioDeviceID !== e &&
          ((this.appService.globals.audioDeviceID = e),
          this.appService.localstorage.set('audioDeviceID', e)),
        this.appService.globals.videoDeviceID !== i &&
          ((this.appService.globals.videoDeviceID = i),
          this.appService.localstorage.set('videoDeviceID', i)));
    }
    getDeviceLabel(e, i) {
      const s = ('audioinput' === i ? this.audioDevicesList : this.videoDevicesList).find(
        (r) => r.deviceId === e
      );
      return s ? s.label : 'Unknown Device';
    }
    loadDevices() {
      var e = this;
      ((this.devicesLoading = !0),
        (this.devicesLoadError = ''),
        (this.audioDevicesList = []),
        (this.videoDevicesList = []),
        I(function* () {
          try {
            const i = [];
            try {
              const s = yield navigator.mediaDevices.getUserMedia({ audio: !0 });
              (i.push(s), P('Audio permission granted'));
            } catch (s) {
              P('Audio permission denied or no audio device:', s);
            }
            try {
              const s = yield navigator.mediaDevices.getUserMedia({ video: !0 });
              (i.push(s), P('Video permission granted'));
            } catch (s) {
              P('Video permission denied or no video device:', s);
            }
            0 === i.length &&
              P('No permissions granted, attempting to enumerate devices without labels');
            const o = yield navigator.mediaDevices.enumerateDevices();
            if (
              (P('ListDevices after getusermedia devices:', JSON.stringify(o)),
              $r('#audio-deviceList, #video-deviceList').find('option').remove(),
              o.forEach((s) => {
                let r = s.label;
                (null == r || '' === r) && (r = `${s.kind} (${s.deviceId.substring(0, 8)}...)`);
                const a = 'default' === s.deviceId || 'communications' === s.deviceId;
                let l = !1;
                if (r.toLowerCase().startsWith('default - ')) {
                  const h = r.substring(10);
                  l = o.some(
                    (f) => f.kind === s.kind && f.label === h && f.deviceId !== s.deviceId
                  );
                }
                const c = a || l;
                ('audioinput' != s.kind || c
                  ? 'videoinput' == s.kind && !c && e.videoDevicesList.push(s)
                  : e.audioDevicesList.push(s),
                  c && P(`Skipping virtual/duplicate device: ${r} (${s.deviceId})`));
              }),
              e.audioDevicesList.length > 0)
            ) {
              const s = e.audioDevicesList.some(
                (r) => r.deviceId === e.appService.globals.audioDeviceID
              );
              ((e.currentAudioDevice = s
                ? e.appService.globals.audioDeviceID
                : e.audioDevicesList[0].deviceId),
                s ||
                  ((e.appService.globals.audioDeviceID = e.currentAudioDevice),
                  e.appService.localstorage.set('audioDeviceID', e.currentAudioDevice),
                  P(`Set default audio device: ${e.currentAudioDevice}`)));
            }
            if (e.videoDevicesList.length > 0) {
              const s = e.videoDevicesList.some(
                (r) => r.deviceId === e.appService.globals.videoDeviceID
              );
              ((e.currentVideoDevice = s
                ? e.appService.globals.videoDeviceID
                : e.videoDevicesList[0].deviceId),
                s ||
                  ((e.appService.globals.videoDeviceID = e.currentVideoDevice),
                  e.appService.localstorage.set('videoDeviceID', e.currentVideoDevice),
                  P(`Set default video device: ${e.currentVideoDevice}`)));
            }
            (P(
              `Found ${e.audioDevicesList.length} audio devices and ${e.videoDevicesList.length} video devices`
            ),
              P(`Current audio device: ${e.currentAudioDevice}`),
              P(`Current video device: ${e.currentVideoDevice}`),
              0 === e.audioDevicesList.length &&
                0 === e.videoDevicesList.length &&
                (e.devicesLoadError =
                  'No audio or video devices detected. Please ensure devices are connected and permissions are granted.'),
              i.forEach((s) => {
                s.getTracks().forEach((r) => {
                  r.stop();
                });
              }),
              (e.devicesLoading = !1));
          } catch (i) {
            (P('Error loading devices:', i),
              (e.devicesLoading = !1),
              (e.devicesLoadError =
                'NotFoundError' === i.name
                  ? 'No audio or video devices found. Please connect a microphone and/or camera.'
                  : 'NotAllowedError' === i.name
                    ? 'Permission denied. Please allow access to your microphone and camera in your browser settings.'
                    : 'NotSupportedError' === i.name
                      ? 'Your browser does not support device enumeration. Please use a modern browser.'
                      : 'SecurityError' === i.name
                        ? 'Security error. Please ensure the page is loaded over HTTPS.'
                        : `Error loading devices: ${i.message || 'Unknown error'}`),
              console.error('Device enumeration error:', i));
          }
        })());
    }
    saveAndCloseSession() {
      let e = $r('#summernoteClosedMsg').summernote('code');
      (console.log('closedMsg:', e),
        this.done(),
        (this.appService.globals.sessData.closedTxt = e),
        this.appService.sendServerAdminCommand('saveAndCloseSession', { closedMsg: e }));
    }
    saveCloseMessage() {
      let e = $r('#summernoteClosedMsg').summernote('code');
      (this.appService.sendServerAdminCommand('saveCloseMessage', { closedMsg: e }),
        (this.appService.globals.sessData.closedTxt = e),
        bootbox.alert('Message Saved'));
    }
    openSession() {
      (this.done(), this.appService.sendServerAdminCommand('openSession', {}));
    }
    lockSession(e = !1) {
      (this.appService.sendServerAdminCommand('lockSession', { kick: e, lock: !0 }),
        bootbox.alert('Session Locked'));
    }
    unlockSession() {
      (this.appService.sendServerAdminCommand('lockSession', { lock: !1 }),
        bootbox.alert('Session Unlocked'));
    }
    changeChatMode(e, i) {
      if ((i.stopPropagation(), i.preventDefault(), this.appService.globals.sessData.chatMode == e))
        return;
      let o = '"Group Chat"?';
      ('p' == e ? (o = '"Webinar Mode"?') : 'd' == e && (o = '"Disabled"?'),
        bootbox.confirm('Are you sure you want to change the chat mode to ' + o, (s) => {
          s
            ? (P('changing mode...'),
              this.appService.sendServerAdminCommand('changeChatMode', { mode: e }))
            : P('mode not changed. currently:' + this.appService.globals.sessData.chatMode);
        }));
    }
    reloadSession() {
      bootbox.confirm('Are you sure you want to reload tge session config?', (e) => {
        e &&
          (this.done(),
          this.appService.sendServerAdminCommand('reloadSessionConfig', {}),
          bootbox.alert('Session config reloaded...'));
      });
    }
    resetAudioBridge() {
      bootbox.confirm('Are you sure you want to reset the audio bridge?', (e) => {
        e && (this.done(), this.appService.sendServerAdminCommand('resetAudioBridge', {}));
      });
    }
    resetAudioBridgeOnServer(e) {
      bootbox.confirm(`Are you sure you want to reset the audio on Server: ${e} ?`, (i) => {
        i &&
          (this.done(),
          this.appService.sendServerAdminCommand('resetAudioBridgeOnServer', { server: e }),
          bootbox.alert('Command send OK.'));
      });
    }
    softReset() {
      bootbox.confirm('Are you sure you want to soft reset the room?', (e) => {
        e &&
          (this.appService.sendServerAdminCommand('softResetSession', {}),
          this.done(),
          bootbox.alert('Soft reset request sent...'));
      });
    }
    getMediaServerLost() {
      var e = this;
      return I(function* () {
        let i = yield e.appService.invokeServerCommand('getMediaServerList', null);
        console.log('media resp:', i);
      })();
    }
    resetAllMediaServers() {
      this.appService.globals.sessData.deleteAlertPW
        ? bootbox.prompt({
            title: 'Please enter the password for this action:',
            value: '',
            callback: (e) => {
              e &&
                (e.trim() === this.appService.globals.sessData.deleteAlertPW
                  ? bootbox.confirm(
                      'Are you sure you want to hard reset ALL media servers ?',
                      (o) => {
                        o &&
                          (this.appService.sendServerAdminCommand('resetAllMediaServers', {}),
                          this.done(),
                          bootbox.alert('All Media Server reset request sent...'));
                      }
                    )
                  : bootbox.alert('Wrong password!'));
            }
          })
        : bootbox.confirm('Are you sure you want to hard reset ALL media servers ?', (e) => {
            e &&
              (this.appService.sendServerAdminCommand('resetAllMediaServers', {}),
              this.done(),
              bootbox.alert('All Media Server reset request sent...'));
          });
    }
    hardResetMediaServer(e) {
      bootbox.confirm('Are you sure you want to hard reset the media server?', (i) => {
        i &&
          (this.appService.sendServerAdminCommand('resetMediaServer', {}),
          this.done(),
          bootbox.alert('Media Server reset request sent...'));
      });
    }
    hardResetMediaServerOnServer(e) {
      this.appService.globals.sessData.deleteAlertPW
        ? bootbox.prompt({
            title: 'Please enter the password for this action:',
            value: '',
            callback: (i) => {
              i &&
                (i.trim() === this.appService.globals.sessData.deleteAlertPW
                  ? bootbox.confirm(
                      `Are you sure you want to hard reset the media server: ${e.name}. ip: ${e.ip} ?`,
                      (s) => {
                        s &&
                          (this.done(),
                          this.appService.sendServerAdminCommand('resetMediaServer', { server: e }),
                          bootbox.alert('Command send OK.'));
                      }
                    )
                  : bootbox.alert('Wrong password!'));
            }
          })
        : bootbox.confirm(
            `Are you sure you want to hard reset the media server: ${e.name}. ip: ${e.ip} ?`,
            (i) => {
              i &&
                (this.done(),
                this.appService.sendServerAdminCommand('resetMediaServer', { server: e }),
                bootbox.alert('Command send OK.'));
            }
          );
    }
    hardReset() {
      bootbox.confirm('Are you sure you want to reset the room?', (e) => {
        e &&
          (this.done(), this.appService.sendServerAdminCommand('hardResetSession', { revoke: !1 }));
      });
    }
    refreshRoster() {
      (this.appService.sendServerAdminCommand('refreshRoster', null),
        bootbox.alert(
          'Command send OK. Please allow 1/2 minute for old entries to get deleted from the list'
        ));
    }
    hardResetAndRevoke() {
      bootbox.confirm('Are you sure you want to reset the room?', (e) => {
        e &&
          (this.done(), this.appService.sendServerAdminCommand('hardResetSession', { revoke: !0 }));
      });
    }
    echoCancellationOnChange() {
      ((this.appService.globals.preferences.echoCancellation =
        !this.appService.globals.preferences.echoCancellation),
        this.appService.setPreference(
          'echoCancellation',
          this.appService.globals.preferences.echoCancellation
        ));
    }
    noiseSuppressionOnChange() {
      ((this.appService.globals.preferences.noiseSuppression =
        !this.appService.globals.preferences.noiseSuppression),
        this.appService.setPreference(
          'noiseSuppression',
          this.appService.globals.preferences.noiseSuppression
        ));
    }
    autoGainControlOnChange() {
      ((this.appService.globals.preferences.autoGainControl =
        !this.appService.globals.preferences.autoGainControl),
        this.appService.setPreference(
          'autoGainControl',
          this.appService.globals.preferences.autoGainControl
        ));
    }
    startStreaming() {
      var e = this;
      return I(function* () {
        let i = yield e.appService.invokeAdminCmd('startOBStream');
        (console.log('startStreaming rc:', i), (e.streamingLink = i.rc.streamURL));
      })();
    }
    stopStreaming() {
      var e = this;
      return I(function* () {
        (yield e.appService.sendServerAdminCommand('stopOBStream'), (e.streamingLink = ''));
      })();
    }
    getPlayerLink() {
      var e = this;
      return I(function* () {
        let i = yield e.appService.invokeAdminCmd('streamStatus');
        (console.log('getPlayerLink rc:', i),
          (e.streamingPlayerEnabled = i.rc.enablePlayer),
          (e.streamingLinkPlayer = i.rc.playerURL));
      })();
    }
    enablePlayer() {
      var e = this;
      return I(function* () {
        let i = yield e.appService.invokeAdminCmd('changePlayerStatus', { enablePlayer: !0 });
        (console.log('enablePlayer rc:', i), e.getPlayerLink());
      })();
    }
    disablePlayer() {
      var e = this;
      return I(function* () {
        let i = yield e.appService.invokeAdminCmd('changePlayerStatus', { enablePlayer: !1 });
        (console.log('disablePlayer rc:', i), (e.streamingPlayerEnabled = !1));
      })();
    }
    copyToClipboard() {
      var e = this;
      return I(function* () {
        const i = yield document.querySelector('#streaming-link');
        (yield i.select(),
          yield navigator.clipboard.writeText(i.value),
          e.alertService.success('Copied to clipboard.'));
      })();
    }
    copyToClipboardPlayer() {
      var e = this;
      return I(function* () {
        const i = yield document.querySelector('#streaming-link-playyer');
        (yield i.select(),
          yield navigator.clipboard.writeText(i.value),
          e.alertService.success('Copied to clipboard.'));
      })();
    }
    copyToClipboardRTMP() {
      var e = this;
      return I(function* () {
        const i = yield document.querySelector('#streaming-link-rtmp');
        (yield i.select(),
          yield navigator.clipboard.writeText(i.value),
          e.alertService.success('Copied to clipboard.'));
      })();
    }
    copyToClipboardBearer() {
      var e = this;
      return I(function* () {
        const i = yield document.querySelector('#stream-whip-key');
        (yield i.select(),
          yield navigator.clipboard.writeText(i.value),
          e.alertService.success('Copied to clipboard.'));
      })();
    }
    getNewToken() {
      var e = this;
      return I(function* () {
        let i = yield e.appService.invokeAdminCmd('getRTMPToken');
        (console.log('getNewToken rc:', i),
          (e.appService.globals.mtxToken = i.rtmpToken),
          (e.yourName = encodeURIComponent(
            e.appService.globals.user.name.replace(/[^a-zA-Z0-9_-]/g, '_')
          )),
          (e.streamingLinkRTMP = `rtmp://${e.appService.globals.streamServerMTX}/room__${e.appService.globals.sessionID}__${e.yourName}?jwt=${e.appService.globals.mtxToken}`));
      })();
    }
    validURL(e) {
      return e.toLowerCase().includes('http://') || e.toLowerCase().includes('https://');
    }
    sendVideoToRoom() {
      bootbox.prompt({
        title: 'Please enter the URL:',
        value: '',
        callback: (e) => {
          if (e) {
            const i = e.trim();
            if (this.validURL(i)) {
              this.done();
              let o = [];
              const s = this.appService.localstorage.get(
                `videos-${this.appService.globals.sessionID}`,
                ''
              );
              if ((s && (o = JSON.parse(s)), o.length > 0 && o.includes(i)))
                return void bootbox.alert('Video already exists.');
              (o.push(i),
                this.appService.localstorage.set(
                  `videos-${this.appService.globals.sessionID}`,
                  JSON.stringify(o)
                ),
                bootbox.alert('Video added.'));
            } else bootbox.alert('The link seems to be missing "https://" or "http://"');
          }
        }
      });
    }
    sendSalesImageToChat() {
      bootbox.prompt({
        title: 'Please enter the URL:',
        value: '',
        callback: (e) => {
          if (e) {
            const i = e.trim();
            this.validURL(i)
              ? (this.done(),
                this.appService.sendServerAdminCommand('sendSalesImageToChat', {
                  url: i,
                  sessID: this.appService.globals.sessionID
                }),
                bootbox.alert('Command send OK.'))
              : bootbox.alert('The link seems to be missing "https://" or "http://"');
          }
        }
      });
    }
    sendUsersToURL() {
      var e = this;
      return I(function* () {
        bootbox.prompt({
          title: 'Please enter the URL:',
          value: '',
          callback: (i) => {
            if (i) {
              const o = i.trim();
              e.validURL(o)
                ? (e.done(),
                  e.appService.sendServerAdminCommand('sendUsersToURL', {
                    url: o,
                    sessID: e.appService.globals.sessionID
                  }),
                  bootbox.alert('Command send OK.'))
                : bootbox.alert('The link seems to be missing "https://" or "http://"');
            }
          }
        });
      })();
    }
    sendRTMPoutput() {}
    switchToBackup() {
      this.appService.globals.sessData.deleteAlertPW
        ? bootbox.prompt({
            title: 'Please enter the password for this action:',
            value: '',
            callback: (e) => {
              e &&
                (e.trim() === this.appService.globals.sessData.deleteAlertPW
                  ? bootbox.confirm(
                      'Are you sure you want to switch to the backup cluster? this will result in a soft reset of the session.',
                      (o) => {
                        o &&
                          (this.appService.invokeAdminCmd('swapBackupClusterID', {}),
                          this.done(),
                          bootbox.alert(
                            'Switch to backup cluster request sent... Session will soft reset...'
                          ));
                      }
                    )
                  : bootbox.alert('Wrong password!'));
            }
          })
        : bootbox.confirm(
            'Are you sure you want to switch to the backup cluster? this will result in a soft reset of the session.',
            (e) => {
              e &&
                (this.appService.invokeAdminCmd('swapBackupClusterID', {}),
                this.done(),
                bootbox.alert('Switch to backup cluster request sent...'));
            }
          );
    }
    startRestream(e = !1) {
      if (e)
        return (
          this.appService.invokeAdminCmd('setRestreamURL', { restreamToURL: '' }),
          void (this.restreamLink = '')
        );
      this.restreamLink.startsWith('rtmp://') && !this.restreamLink.includes(' ')
        ? this.appService.invokeAdminCmd('setRestreamURL', { restreamToURL: this.restreamLink })
        : bootbox.alert(
            'Invalid RTMP link!, please make sure it starts with "rtmp://" and does not contain spaces or special characters. For example: rtmp://example.com/live/stream'
          );
    }
    openRestreamTab() {
      $r('#restream-tab').tab('show');
    }
    adminLogin() {
      bootbox.confirm('Are you sure you want to login to the Admin Dashboard?', (e) => {
        e && this.appService.doAdminLogin();
      });
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(ZC), be(fa), be(fo));
      };
    }
    static {
      this.ɵcmp = ut({
        type: t,
        selectors: [['app-session-control-modal']],
        decls: 13,
        vars: 2,
        consts: [
          ['form', 'ngForm'],
          [
            'id',
            'session-control-modal',
            'tabIndex',
            '-1',
            'role',
            'dialog',
            'aria-labelledby',
            'session-control',
            'aria-hidden',
            'true',
            1,
            'modal',
            'fade'
          ],
          ['role', 'document', 1, 'modal-dialog', 'modal-lg'],
          [1, 'modal-content'],
          [1, 'modal-header'],
          ['id', 'session-control', 1, 'modal-title'],
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
          [1, 'modal-body'],
          [1, 'modal-footer'],
          ['type', 'button', 1, 'btn', 'btn-success', 'btn-block', 3, 'click'],
          ['id', 'myTab', 'role', 'tablist', 1, 'nav', 'nav-tabs'],
          ['role', 'presentation', 1, 'nav-item'],
          [
            'id',
            'reset-session-tab',
            'data-bs-toggle',
            'tab',
            'data-bs-target',
            '#reset-session',
            'role',
            'tab',
            'aria-controls',
            'reset-session',
            'aria-selected',
            'true',
            1,
            'nav-link',
            'active'
          ],
          [
            'id',
            'close-session-tab',
            'data-bs-toggle',
            'tab',
            'data-bs-target',
            '#close-session',
            'role',
            'tab',
            'aria-controls',
            'close-session',
            'aria-selected',
            'false',
            1,
            'nav-link'
          ],
          [
            'id',
            'lock-session-tab',
            'data-bs-toggle',
            'tab',
            'data-bs-target',
            '#lock-session',
            'role',
            'tab',
            'aria-controls',
            'lock-session',
            'aria-selected',
            'false',
            1,
            'nav-link'
          ],
          [
            'id',
            'av-device-selection-tab',
            'data-bs-toggle',
            'tab',
            'data-bs-target',
            '#av-device-selection',
            'role',
            'tab',
            'aria-controls',
            'av-device-selection',
            'aria-selected',
            'false',
            1,
            'nav-link'
          ],
          [
            'id',
            'streaming-selection-tab',
            'data-bs-toggle',
            'tab',
            'data-bs-target',
            '#streaming-selection',
            'role',
            'tab',
            'aria-controls',
            'streaming-selection',
            'aria-selected',
            'false',
            1,
            'nav-link'
          ],
          ['id', 'myTabContent', 1, 'tab-content'],
          [
            'id',
            'reset-session',
            'role',
            'tabpanel',
            'aria-labelledby',
            'reset-session-tab',
            1,
            'tab-pane',
            'fade',
            'show',
            'active'
          ],
          [1, 'row', 'mt-4'],
          [1, 'col', 'border-right', 'pr-4'],
          ['type', 'button', 1, 'btn', 'btn-outline-light', 'mr-2', 3, 'click'],
          [1, 'small', 'mt-2'],
          [2, 'text-decoration', 'underline'],
          ['type', 'button', 1, 'btn', 'btn-primary', 'mr-2', 3, 'click'],
          ['type', 'button', 1, 'btn', 'btn-info', 'mx-2'],
          ['type', 'button', 1, 'btn', 'btn-danger', 'mr-2', 3, 'click'],
          [1, 'col', 'pl-4'],
          [1, 'fas', 'fa-comments'],
          [1, 'custom-control', 'custom-radio', 'my-2'],
          [
            'type',
            'radio',
            'id',
            'customRadio1',
            'value',
            'g',
            'name',
            'customRadio',
            1,
            'custom-control-input',
            3,
            'click',
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'customRadio1', 1, 'custom-control-label'],
          [
            'type',
            'radio',
            'id',
            'customRadio2',
            'value',
            'p',
            'name',
            'customRadio',
            1,
            'custom-control-input',
            3,
            'click',
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'customRadio2', 1, 'custom-control-label'],
          [
            'type',
            'radio',
            'id',
            'customRadio3',
            'value',
            'd',
            'name',
            'customRadio',
            1,
            'custom-control-input',
            3,
            'click',
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'customRadio3', 1, 'custom-control-label'],
          [
            'id',
            'close-session',
            'role',
            'tabpanel',
            'aria-labelledby',
            'close-session-tab',
            1,
            'tab-pane',
            'fade'
          ],
          [1, 'd-flex', 'justify-content-center'],
          ['type', 'button', 1, 'btn', 'btn-outline-light', 'mr-2', 'my-2', 3, 'click'],
          [1, 'fas', 'fa-save'],
          ['id', 'summernoteClosedMsg', 3, 'innerHTML'],
          [
            'id',
            'lock-session',
            'role',
            'tabpanel',
            'aria-labelledby',
            'lock-session-tab',
            1,
            'tab-pane',
            'fade'
          ],
          ['type', 'button', 1, 'btn', 'btn-warning', 'm-2', 3, 'click'],
          ['type', 'button', 1, 'btn', 'btn-danger', 'm-2', 3, 'click'],
          ['type', 'button', 1, 'btn', 'btn-success', 'm-2', 3, 'click'],
          [
            'id',
            'av-device-selection',
            'role',
            'tabpanel',
            'aria-labelledby',
            'av-device-selection-tab',
            1,
            'tab-pane',
            'fade'
          ],
          [1, 'd-flex', 'justify-content-end', 'align-items-center', 'mt-2', 'mb-3'],
          [
            'type',
            'button',
            'title',
            'Refresh device list',
            1,
            'btn',
            'btn-sm',
            'btn-outline-primary',
            3,
            'click',
            'disabled'
          ],
          [1, 'fas', 3, 'ngClass'],
          [1, 'alert', 'alert-info'],
          [1, 'alert', 'alert-danger'],
          [1, 'mt-2'],
          [1, 'form-group'],
          [1, 'mt-4'],
          [1, 'ml-4'],
          [
            'type',
            'checkbox',
            'name',
            'echo-cancellation',
            'value',
            'Echo Cancellation',
            'id',
            'echo-cancellation',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'echo-cancellation', 1, 'form-check-label'],
          [
            'type',
            'checkbox',
            'name',
            'noise-suppression',
            'value',
            'Noise Suppression',
            'id',
            'noise-suppression',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'noise-suppression', 1, 'form-check-label'],
          [
            'type',
            'checkbox',
            'name',
            'auto-gain-control',
            'value',
            'Auto Gain Control',
            'id',
            'auto-gain-control',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'auto-gain-control', 1, 'form-check-label'],
          [
            'id',
            'streaming-selection',
            'role',
            'tabpanel',
            'aria-labelledby',
            'streaming-selection-tab',
            1,
            'tab-pane',
            'fade'
          ],
          ['id', 'streaming-settings-tab', 'role', 'tablist', 1, 'nav', 'nav-tabs'],
          [1, 'nav-item'],
          [
            'id',
            'obs-streaming-tab',
            'data-bs-toggle',
            'tab',
            'href',
            '#obs-streaming',
            'role',
            'tab',
            'aria-controls',
            'obs-streaming',
            'aria-selected',
            'false',
            1,
            'nav-link',
            'active'
          ],
          [
            'id',
            'restream-tab',
            'data-bs-toggle',
            'tab',
            'href',
            '#restream',
            'role',
            'tab',
            'aria-controls',
            'restream',
            'aria-selected',
            'false',
            1,
            'nav-link'
          ],
          [
            'id',
            'stream-player-tab',
            'data-bs-toggle',
            'tab',
            'href',
            '#stream-player',
            'role',
            'tab',
            'aria-controls',
            'stream-player',
            'aria-selected',
            'true',
            1,
            'nav-link'
          ],
          ['id', 'streaming-settings-tabContent', 1, 'tab-content'],
          [
            'id',
            'stream-player',
            'role',
            'tabpanel',
            'aria-labelledby',
            'stream-player-tab',
            1,
            'tab-pane',
            'fade'
          ],
          [1, 'btn', 'btn-outline-primary', 'btn-sm', 'm-1', 3, 'click'],
          [1, 'fas', 'fa-desktop'],
          [1, 'btn', 'btn-outline-danger', 'btn-sm', 'm-1', 3, 'click'],
          [1, 'fas', 'fa-stop'],
          [
            'id',
            'obs-streaming',
            'role',
            'tabpanel',
            'aria-labelledby',
            'obs-streaming-tab',
            1,
            'tab-pane',
            'fade',
            'show',
            'active'
          ],
          [1, 'form-group', 'm-4', 'w-100', 'text-center'],
          [1, 'form-check', 'form-check-inline'],
          [
            'type',
            'radio',
            'name',
            'streaming-rtmp',
            'id',
            'streaming-rtmp',
            'value',
            'RTMP',
            'required',
            '',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'streaming-rtmp', 1, 'form-check-label', 'font-weight-bold'],
          [
            'type',
            'radio',
            'name',
            'streaming-whip',
            'id',
            'streaming-whip',
            'value',
            'WHIP',
            'required',
            '',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'streaming-whip', 1, 'form-check-label', 'font-weight-bold'],
          [1, 'mt-1'],
          [
            'id',
            'restream',
            'role',
            'tabpanel',
            'aria-labelledby',
            'restream-tab',
            1,
            'tab-pane',
            'fade'
          ],
          [
            'id',
            'restream-link',
            1,
            'form-control',
            'border',
            'border-danger',
            2,
            'height',
            '100px',
            3,
            'ngModelChange',
            'change',
            'ngModel'
          ],
          [1, 'btn', 'btn-outline-info', 'btn-sm', 'm-1', 3, 'click'],
          [1, 'btn', 'btn-outline-warning', 'btn-sm', 'm-1', 3, 'click'],
          [
            'id',
            'session-history',
            'role',
            'tabpanel',
            'aria-labelledby',
            'session-history-tab',
            1,
            'tab-pane',
            'fade'
          ],
          [
            'id',
            'webinar-tools',
            'role',
            'tabpanel',
            'aria-labelledby',
            'webinar-tools-tab',
            1,
            'tab-pane',
            'fade'
          ],
          [
            'id',
            'session-history-tab',
            'data-bs-toggle',
            'tab',
            'data-bs-target',
            '#session-history',
            'role',
            'tab',
            'aria-controls',
            'session-history',
            'aria-selected',
            'false',
            1,
            'nav-link'
          ],
          [
            'id',
            'webinar-tools-tab',
            'data-bs-toggle',
            'tab',
            'data-bs-target',
            '#webinar-tools',
            'role',
            'tab',
            'aria-controls',
            'webinar-tools',
            'aria-selected',
            'false',
            1,
            'nav-link'
          ],
          ['type', 'button', 1, 'btn', 'btn-info', 'mx-2', 3, 'click'],
          ['type', 'button', 1, 'btn', 'btn-outline-primary', 'm-2', 3, 'click'],
          [1, 'fas', 'fa-spinner', 'fa-spin'],
          [1, 'fas', 'fa-exclamation-triangle'],
          ['type', 'button', 1, 'btn', 'btn-sm', 'btn-outline-secondary', 'ml-2', 3, 'click'],
          [1, 'fas', 'fa-redo'],
          ['for', 'audio-deviceList'],
          [
            'id',
            'audio-deviceList',
            'aria-label',
            'Audio device (input)',
            1,
            'form-select',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [3, 'value', 'selected'],
          [1, 'text-white', 'mt-1', 'd-block'],
          [1, 'fas', 'fa-check-circle', 'text-success'],
          [1, 'form-group', 'text-white'],
          [1, 'fas', 'fa-microphone-slash'],
          ['for', 'video-deviceList'],
          [
            'id',
            'video-deviceList',
            'aria-label',
            'Video device (input)',
            1,
            'form-select',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [1, 'fas', 'fa-video-slash'],
          [1, 'd-flex', 'align-items-center'],
          ['for', 'streaming-link', 1, 'form-label', 'me-2'],
          [1, 'fas', 'fa-copy'],
          [
            'id',
            'streaming-link-playyer',
            'readonly',
            'readonly',
            1,
            'form-control',
            'border',
            2,
            'height',
            '100px',
            3,
            'value'
          ],
          [1, 'm-2'],
          [1, 'fas', 'fa-sync'],
          [
            'id',
            'streaming-link-rtmp',
            'readonly',
            'readonly',
            1,
            'form-control',
            'border',
            'border-danger',
            2,
            'height',
            '100px',
            3,
            'value'
          ],
          [1, 'text-primary', 'fw-bold', 'restream-link', 3, 'click'],
          [1, 'mb-2'],
          ['for', 'streaming-link'],
          [
            'id',
            'streaming-link',
            'readonly',
            'readonly',
            'rows',
            '2',
            1,
            'form-control',
            'border',
            'border-danger',
            2,
            'height',
            'auto',
            'overflow-y',
            'scroll',
            3,
            'value'
          ],
          ['for', 'stream-whip-key'],
          [
            'type',
            'text',
            'id',
            'stream-whip-key',
            'readonly',
            'readonly',
            'rows',
            '2',
            1,
            'form-control',
            'border',
            'border-danger',
            2,
            'height',
            'auto',
            'overflow-y',
            'scroll',
            3,
            'value'
          ],
          [1, 'fas', 'fa-play'],
          [1, 'list-group', 'text-dark'],
          [1, 'p-4', 'text-center'],
          [1, 'btn', 'btn-primary', 3, 'click'],
          [1, 'fas', 'fa', 'fa-sync'],
          [
            'aria-current',
            'true',
            1,
            'list-group-item',
            'list-group-item-action',
            'border-bottom',
            'border-top',
            'border-dark'
          ],
          [1, 'd-flex', 'w-100', 'justify-content-between'],
          [1, 'mb-1'],
          [1, 'p-4'],
          ['type', 'button', 1, 'btn', 'btn-outline-info', 'm-2', 3, 'click'],
          [1, 'fas', 'fa-video', 'me-1'],
          [1, 'fas', 'fa-image', 'me-1'],
          [1, 'fas', 'fa-link', 'me-1'],
          [1, 'mt-2', 3, 'ngSubmit'],
          ['type', 'submit', 1, 'btn', 'btn-primary'],
          [
            'id',
            'audio-deviceList',
            'name',
            'audioID',
            'aria-label',
            'Audio device (input)',
            'ngModel',
            '',
            1,
            'form-select',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [
            'id',
            'video-deviceList',
            'name',
            'videoID',
            'aria-label',
            'Video device (input)',
            'ngModel',
            '',
            1,
            'form-select',
            3,
            'ngModelChange',
            'ngModel'
          ]
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 1)(1, 'div', 2)(2, 'div', 3)(3, 'div', 4)(4, 'h5', 5),
            v(5, 'Session Control'),
            u(),
            T(6, 'button', 6),
            u(),
            d(7, 'div', 7),
            H(8, MDe, 165, 32)(9, LDe, 21, 5),
            u(),
            d(10, 'div', 8)(11, 'button', 9),
            x('click', function () {
              return o.done();
            }),
            v(12, ' Done '),
            u()()()()()),
            2 & i &&
              (m(8),
              O(8, o.appService.globals.isPresenter ? 8 : -1),
              m(),
              O(
                9,
                !o.appService.globals.isPresenter && o.appService.globals.user.hasMic ? 9 : -1
              )));
        },
        dependencies: [Di, qs, Vl, Hl, ai, jl, Jg, ti, Ws, fp, Yn, as, os, Rr],
        styles: [
          '#session-control-modal[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]{font-size:14px;margin-top:5px}#session-control-modal[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]:last-child{margin-bottom:0}#session-control-modal[_ngcontent-%COMP%]   .dropdown-menu[_ngcontent-%COMP%]{background-color:var(--session-control-dropdown-bg)}#session-control-modal[_ngcontent-%COMP%]   .dropdown-menu[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover{cursor:pointer}#session-control-modal[_ngcontent-%COMP%]   .modal-body[_ngcontent-%COMP%]   form[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]{width:45%;margin:0 2.5%}#session-control-modal[_ngcontent-%COMP%]   .modal-body[_ngcontent-%COMP%]   button[_ngcontent-%COMP%], #session-control-modal[_ngcontent-%COMP%]   textarea[_ngcontent-%COMP%], #session-control-modal[_ngcontent-%COMP%]   label[_ngcontent-%COMP%]{font-size:14px}.form-check-input[_ngcontent-%COMP%]:checked + label[_ngcontent-%COMP%]{text-transform:uppercase;font-weight:700}.form-check-input[_ngcontent-%COMP%]{-webkit-appearance:none;-o-appearance:none;appearance:none;height:20px;width:20px;transition:all .15s ease-out 0s;background-color:var(--light-gray);border:none;color:var(--white);cursor:pointer;display:inline-block;margin-right:.5rem;outline:none;position:relative;z-index:1000;border-radius:50%}.disable-video[_ngcontent-%COMP%]:hover, .form-check-label[_ngcontent-%COMP%]:hover{cursor:pointer;opacity:.85}.form-check-input[_ngcontent-%COMP%]:checked{background-color:var(--checkbox-bg-color)}.restream-link[_ngcontent-%COMP%]:hover{text-decoration:underline;cursor:pointer}'
        ]
      });
    }
  }
  return t;
})();
