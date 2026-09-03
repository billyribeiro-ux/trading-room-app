const NRe = (t, n) => n._id;
function LRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 15),
      x('click', function () {
        return (D(e), E(g().clearSearch()));
      }),
      T(1, 'i', 16),
      u());
  }
}
function BRe(t, n) {
  if ((1 & t && v(0), 2 & t)) {
    const e = g(2);
    ns(' (Page ', e.currentPage + 1, ' of ', e.totalPages, ') ');
  }
}
function URe(t, n) {
  if ((1 & t && (d(0, 'div', 12), v(1), H(2, BRe, 1, 2), u()), 2 & t)) {
    const e = g();
    (m(),
      ns(' Showing ', e.filteredTranscripts.length, ' of ', e.totalCount, ' entries '),
      m(),
      O(2, e.totalPages > 0 ? 2 : -1));
  }
}
function jRe(t, n) {
  1 & t &&
    (d(0, 'div', 14)(1, 'div', 17)(2, 'span', 18),
    v(3, 'Loading...'),
    u()(),
    d(4, 'p', 19),
    v(5, 'Loading transcripts...'),
    u()());
}
function VRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 20)(1, 'div', 21),
      T(2, 'i', 22),
      v(3),
      u(),
      d(4, 'button', 23),
      x('click', function () {
        return (D(e), E(g().loadTranscripts()));
      }),
      v(5, ' Retry '),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(3), Ne(' ', e.error, ' '));
  }
}
function HRe(t, n) {
  1 & t &&
    (d(0, 'div', 33)(1, 'div', 36)(2, 'span', 18),
    v(3, 'Loading...'),
    u()(),
    d(4, 'span', 37),
    v(5, 'Loading more...'),
    u()());
}
function $Re(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 39),
      x('click', function () {
        return (D(e), E(g(3).clearSearch()));
      }),
      v(1, ' Clear search to see all transcripts '),
      u());
  }
}
function zRe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 34)(1, 'p'),
      v(2, 'No transcripts found.'),
      u(),
      H(3, $Re, 2, 0, 'button', 38),
      u()),
    2 & t)
  ) {
    const e = g(2);
    (m(3), O(3, e.searchText ? 3 : -1));
  }
}
function GRe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 41)(1, 'span', 42),
      v(2),
      u(),
      v(3, '\xa0\xa0'),
      d(4, 'span', 43),
      v(5),
      u(),
      v(6),
      u()),
    2 & t)
  ) {
    const e = n.$implicit,
      i = g(3);
    (m(2), Ze(i.formatDate(e.ts)), m(3), Ze(e.speaker), m(), Ne(': ', e.text, ' '));
  }
}
function WRe(t, n) {
  if ((1 & t && (d(0, 'div', 40), ht(1, GRe, 7, 3, 'div', 41, NRe), u()), 2 & t)) {
    const e = g(2);
    (m(), pt(e.filteredTranscripts));
  }
}
function qRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 24)(1, 'button', 25),
      x('click', function () {
        return (D(e), E(g().loadPrevious()));
      }),
      T(2, 'i', 26),
      v(3, ' Load Previous Day '),
      u(),
      d(4, 'button', 27),
      x('click', function () {
        return (D(e), E(g().loadPrev()));
      }),
      T(5, 'i', 28),
      v(6, ' Load Prev '),
      u(),
      d(7, 'button', 27),
      x('click', function () {
        return (D(e), E(g().loadMore()));
      }),
      v(8, ' Load More '),
      T(9, 'i', 29),
      u(),
      d(10, 'button', 25),
      x('click', function () {
        return (D(e), E(g().loadNextDay()));
      }),
      v(11, ' Load Next Day '),
      T(12, 'i', 30),
      u(),
      d(13, 'button', 31),
      x('click', function () {
        return (D(e), E(g().resetToToday()));
      }),
      T(14, 'i', 32),
      v(15, ' Reset to Today '),
      u()(),
      H(16, HRe, 6, 0, 'div', 33)(17, zRe, 4, 1, 'div', 34)(18, WRe, 3, 0),
      d(19, 'div', 35)(20, 'button', 25),
      x('click', function () {
        return (D(e), E(g().loadPrevious()));
      }),
      T(21, 'i', 26),
      v(22, ' Load Previous Day '),
      u(),
      d(23, 'button', 27),
      x('click', function () {
        return (D(e), E(g().loadPrev()));
      }),
      T(24, 'i', 28),
      v(25, ' Load Prev '),
      u(),
      d(26, 'button', 27),
      x('click', function () {
        return (D(e), E(g().loadMore()));
      }),
      v(27, ' Load More '),
      T(28, 'i', 29),
      u(),
      d(29, 'button', 25),
      x('click', function () {
        return (D(e), E(g().loadNextDay()));
      }),
      v(30, ' Load Next Day '),
      T(31, 'i', 30),
      u(),
      d(32, 'button', 31),
      x('click', function () {
        return (D(e), E(g().resetToToday()));
      }),
      T(33, 'i', 32),
      v(34, ' Reset to Today '),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(),
      z('disabled', e.loading),
      m(3),
      z('disabled', e.loading || 0 === e.currentPage),
      m(3),
      z('disabled', e.loading),
      m(3),
      z('disabled', e.loading),
      m(3),
      z('disabled', e.loading),
      m(3),
      O(16, e.loading && e.transcripts.length > 0 ? 16 : -1),
      m(),
      O(17, 0 !== e.filteredTranscripts.length || e.loading ? 18 : 17),
      m(3),
      z('disabled', e.loading),
      m(3),
      z('disabled', e.loading || 0 === e.currentPage),
      m(3),
      z('disabled', e.loading),
      m(3),
      z('disabled', e.loading),
      m(3),
      z('disabled', e.loading));
  }
}
