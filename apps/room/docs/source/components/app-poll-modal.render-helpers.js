var STe = ue(2578);
const wTe = (t, n) => n.q,
  TTe = () => ({ standalone: !0 });
function DTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li'),
      v(1),
      d(2, 'button', 36),
      x('click', function () {
        const o = D(e).$index;
        return E(g(2).delChoice(o));
      }),
      T(3, 'i', 37),
      v(4, '\xa0Del'),
      u(),
      T(5, 'br', 38),
      u());
  }
  if (2 & t) {
    const e = n.$implicit;
    (m(), Ne(' ', e, ' '));
  }
}
function ETe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 35),
      v(1),
      d(2, 'div', 39)(3, 'button', 40),
      x('click', function () {
        const o = D(e).$index;
        return E(g(2).deleteSavedPoll(o));
      }),
      T(4, 'i', 41),
      v(5, ' Delete '),
      u(),
      d(6, 'button', 42),
      x('click', function () {
        const o = D(e).$index;
        return E(g(2).loadSavedPoll(o));
      }),
      v(7, ' Load '),
      u()()());
  }
  if (2 & t) {
    const e = n.$implicit;
    (m(), Ne(' ', e.q, ' '));
  }
}
function kTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 10)(1, 'ul', 12)(2, 'li', 13)(3, 'a', 14),
      v(4, 'Create New Poll '),
      u()(),
      d(5, 'li', 13)(6, 'a', 15),
      v(7, 'Pre-Canned Polls '),
      u()()(),
      d(8, 'div', 16)(9, 'div', 17)(10, 'div', 18)(11, 'h3')(12, 'span', 19),
      v(13, '1'),
      u(),
      v(14, ' Enter your poll question: '),
      u(),
      d(15, 'input', 20),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.pollQuestion, o) || (s.pollQuestion = o), E(o));
      }),
      u(),
      T(16, 'hr'),
      d(17, 'h3')(18, 'span', 19),
      v(19, '2'),
      u(),
      v(20, ' Add Choices/Answers: '),
      u(),
      d(21, 'div', 21)(22, 'input', 22),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.pollChoice, o) || (s.pollChoice = o), E(o));
      }),
      x('keyup.enter', function () {
        return (D(e), E(g().addChoice()));
      }),
      u(),
      d(23, 'span', 23)(24, 'button', 24),
      x('click', function () {
        return (D(e), E(g().addChoice()));
      }),
      T(25, 'i', 25),
      v(26, '\xa0\xa0Add Choice '),
      u()()(),
      d(27, 'ol'),
      ht(28, DTe, 6, 1, 'li', null, Li),
      u(),
      T(30, 'hr'),
      d(31, 'h3')(32, 'span', 19),
      v(33, '3'),
      u(),
      v(34, ' When done editing, Send your poll '),
      u(),
      d(35, 'div', 26)(36, 'input', 27),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.anonymousPoll, o) || (s.anonymousPoll = o), E(o));
      }),
      u(),
      d(37, 'label', 28),
      v(38, ' Anonymous Poll (Does not show the voting name/email, just results) '),
      u()(),
      d(39, 'div', 29)(40, 'button', 30),
      x('click', function () {
        return (D(e), E(g().savePollToStorage()));
      }),
      T(41, 'i', 31),
      v(42, '\xa0Save To Canned '),
      u(),
      d(43, 'button', 32),
      x('click', function () {
        return (D(e), E(g().sendPoll()));
      }),
      v(44, ' Send Poll '),
      u()()()(),
      d(45, 'div', 33)(46, 'p'),
      v(
        47,
        ' You can store polls you use often here. Just type the poll on the create poll tab and press "save" '
      ),
      u(),
      d(48, 'ul', 34),
      ht(49, ETe, 8, 1, 'li', 35, wTe),
      u()()()());
  }
  if (2 & t) {
    const e = g();
    (m(15),
      je('ngModel', e.pollQuestion),
      m(7),
      je('ngModel', e.pollChoice),
      m(6),
      pt(e.pollChoices),
      m(8),
      je('ngModel', e.anonymousPoll),
      z('ngModelOptions', wo(4, TTe)),
      m(13),
      pt(e.savedPolls));
  }
}
function xTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 18),
      v(1),
      d(2, 'button', 45),
      x('click', function () {
        const o = D(e).$index;
        return E(g(2).sendAnswer(o));
      }),
      v(3, ' \xa0Choose'),
      u(),
      T(4, 'br', 38),
      u());
  }
  if (2 & t) {
    const e = n.$implicit;
    (m(), Ne(' ', e, ' '));
  }
}
function MTe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 10)(1, 'div', 43)(2, 'h1'),
      v(3),
      u(),
      T(4, 'hr'),
      d(5, 'ol', 44),
      ht(6, xTe, 5, 1, 'li', 18, Li),
      u()()()),
    2 & t)
  ) {
    const e = g();
    (m(3), Ze(e.pollQuestion), m(3), pt(e.pollChoices));
  }
}
function ATe(t, n) {
  1 & t &&
    (T(0, 'img', 49),
    d(1, 'p', 50),
    v(2, ' Waiting for results to come in...Please Wait... '),
    u());
}
function PTe(t, n) {
  1 & t && T(0, 'hr')(1, 'textarea', 51)(2, 'hr');
}
function RTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 52),
      x('click', function () {
        return (D(e), E(g(2).postResults()));
      }),
      v(1, ' Post Results '),
      u());
  }
}
function ITe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 11)(1, 'div', 46)(2, 'h2'),
      v(3),
      u(),
      d(4, 'p'),
      v(5),
      u(),
      H(6, ATe, 3, 0),
      T(7, 'div', 47),
      u(),
      H(8, PTe, 3, 0)(9, RTe, 2, 0, 'button', 48),
      u()),
    2 & t)
  ) {
    const e = g();
    (m(3),
      Ze(e.pollQuestion),
      m(2),
      Ne('Total Responses: ', e.total, ''),
      m(),
      O(6, 0 == e.total ? 6 : -1),
      m(2),
      O(8, e.anonymousPoll ? -1 : 8),
      m(),
      O(9, e.total > 0 ? 9 : -1));
  }
}
const EB = {
  series: {
    pie: {
      show: !0,
      innerRadius: 0,
      label: {
        show: !0,
        radius: 0.8,
        color: '#FAFAFA',
        formatter: function (t, n) {
          return (
            "<div class='flot-pie-label' style='font-size:12px; text-align:center; padding:2px; color:white;'>" +
            t +
            ' : ' +
            Math.round(n.percent) +
            '%</div>'
          );
        },
        background: { opacity: 0.8, color: '#222' }
      }
    }
  }
};
