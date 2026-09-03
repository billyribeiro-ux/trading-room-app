const Fa = () => ({ standalone: !0 });
function VTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 35)(1, 'input', 46),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.sendText, o) || (s.sendText = o), E(o));
      }),
      u(),
      d(2, 'label', 47),
      v(3, 'Text this out?'),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(), je('ngModel', e.sendText), z('ngModelOptions', To(2, Fa)));
  }
}
function HTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 35)(1, 'input', 48),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.dontPush, o) || (s.dontPush = o), E(o));
      }),
      u(),
      d(2, 'label', 49),
      v(3, "Don't send to push notification?"),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(), je('ngModel', e.dontPush), z('ngModelOptions', To(2, Fa)));
  }
}
function $Te(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 35)(1, 'input', 50),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.nonTradeAlert, o) || (s.nonTradeAlert = o), E(o));
      }),
      u(),
      d(2, 'label', 51),
      v(3, 'Non-trade alert? (Different Sound)'),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(), je('ngModel', e.nonTradeAlert), z('ngModelOptions', To(2, Fa)));
  }
}
function zTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 35)(1, 'input', 52),
      Ve('ngModelChange', function (o) {
        const s = D(e).$implicit;
        return (He(s.checked, o) || (s.checked = o), E(o));
      }),
      u(),
      d(2, 'label', 53),
      v(3),
      u()());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = n.$index;
    (m(),
      je('ngModel', e.checked),
      z('ngModelOptions', To(5, Fa))('id', 'alert-trade-label-' + i),
      m(),
      z('for', 'alert-trade-label-' + i),
      m(),
      Ne('', e.name, '?'));
  }
}
function GTe(t, n) {
  (1 & t && ht(0, zTe, 4, 6, 'div', 35, Yx), 2 & t && pt(g().appService.globals.alertLabels));
}
function WTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 35)(1, 'input', 54),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.dontCrossPost, o) || (s.dontCrossPost = o), E(o));
      }),
      u(),
      d(2, 'label', 55),
      v(3, "Don't cross post to linked alert rooms"),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(), je('ngModel', e.dontCrossPost), z('ngModelOptions', To(2, Fa)));
  }
}
function qTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 35)(1, 'input', 56),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.legalDisclosure, o) || (s.legalDisclosure = o), E(o));
      }),
      u(),
      d(2, 'label', 57),
      v(3, 'Add Legal Disclosure?'),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(), je('ngModel', e.legalDisclosure), z('ngModelOptions', To(2, Fa)));
  }
}
function KTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 40)(1, 'input', 58),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.legalDisclosureTxt, o) || (s.legalDisclosureTxt = o), E(o));
      }),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(), je('ngModel', e.legalDisclosureTxt));
  }
}
function YTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 69)(1, 'input', 72),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.ignoreWeekends, o) || (s.ignoreWeekends = o), E(o));
      }),
      u(),
      d(2, 'label', 73),
      v(3, 'Ignore weekends?'),
      u()());
  }
  if (2 & t) {
    const e = g(2);
    (m(), je('ngModel', e.ignoreWeekends), z('ngModelOptions', To(2, Fa)));
  }
}
function QTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div'),
      T(1, 'hr'),
      d(2, 'form')(3, 'div', 21)(4, 'label', 59),
      v(5, 'NOTE: All times should be on '),
      d(6, 'span', 60),
      v(7, 'your local time zone'),
      u()(),
      d(8, 'label', 61),
      v(9, 'Send on this date & time:'),
      u(),
      d(10, 'input', 62),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.sendLaterDate, o) || (s.sendLaterDate = o), E(o));
      }),
      u()(),
      d(11, 'div', 63)(12, 'label', 64),
      v(13, 'Repeat:'),
      u(),
      d(14, 'select', 65),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.repeatScheduledAlert, o) || (s.repeatScheduledAlert = o), E(o));
      }),
      d(15, 'option', 66),
      v(16, 'Off'),
      u(),
      d(17, 'option', 67),
      v(18, 'Daily'),
      u(),
      d(19, 'option', 68),
      v(20, 'Weekly'),
      u()()(),
      H(21, YTe, 4, 3, 'div', 69),
      d(22, 'div', 21)(23, 'label', 61),
      v(24, 'Send as email:'),
      u(),
      d(25, 'input', 70),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.sendLaterAsEmail, o) || (s.sendLaterAsEmail = o), E(o));
      }),
      u()(),
      d(26, 'div', 21)(27, 'label', 61),
      v(28, 'Send as Name:'),
      u(),
      d(29, 'input', 71),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.sendLaterAsNick, o) || (s.sendLaterAsNick = o), E(o));
      }),
      u()()()());
  }
  if (2 & t) {
    const e = g();
    (m(10),
      je('ngModel', e.sendLaterDate),
      m(4),
      je('ngModel', e.repeatScheduledAlert),
      m(7),
      O(21, 'daily' === e.repeatScheduledAlert ? 21 : -1),
      m(4),
      je('ngModel', e.sendLaterAsEmail),
      m(4),
      je('ngModel', e.sendLaterAsNick));
  }
}
function XTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 74),
      x('click', function () {
        return (D(e), E(g().manageScheduledAlerts()));
      }),
      T(1, 'i', 75),
      v(2, ' See Scheduled Alerts '),
      u());
  }
}
function JTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 76),
      x('click', function () {
        return (D(e), E((g().showSendLater = !0)));
      }),
      T(1, 'i', 75),
      v(2, ' Send Later? '),
      u());
  }
}
function ZTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 77),
      x('click', function () {
        return (D(e), E((g().showSendLater = !1)));
      }),
      v(1, ' Cancel '),
      u());
  }
}
function eDe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 78),
      x('click', function () {
        return (D(e), E(g().postAlert()));
      }),
      v(1, ' Post Alert '),
      u());
  }
}
function tDe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 78),
      x('click', function () {
        return (D(e), E(g().postAlertLater()));
      }),
      v(1, ' Send Later '),
      u());
  }
}
const di = window.$;
var fc;
function x2(t) {
  (t.stopPropagation(),
    t.preventDefault(),
    (t.target.className = 'dragover' == t.type ? 'hover' : ''));
}
function nDe(t) {
  console.log('FileDropped:', t);
  var n = document.createElement('img'),
    e = new FileReader();
  ((e.onloadend = function () {
    ((n.src = e.result), di('#fileListAlert').append(n));
  }),
    e.readAsDataURL(t));
}
function MB(t) {
  (di('#fileListAlert').show(), di('#filedragAlert').hide(), x2(t));
  var n = t.target.files || t.dataTransfer.files;
  (di('#fileListAlert').empty(), (fc = []));
  for (var i, e = 0; (i = n[e]); e++) (fc.push(i), nDe(i));
}
