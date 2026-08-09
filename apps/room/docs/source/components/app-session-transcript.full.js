const kRe = (t, n) => n._id;
function xRe(t, n) {
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
function MRe(t, n) {
  if ((1 & t && v(0), 2 & t)) {
    const e = g(2);
    ns(' (Page ', e.currentPage + 1, ' of ', e.totalPages, ') ');
  }
}
function ARe(t, n) {
  if ((1 & t && (d(0, 'div', 12), v(1), H(2, MRe, 1, 2), u()), 2 & t)) {
    const e = g();
    (m(),
      ns(' Showing ', e.filteredTranscripts.length, ' of ', e.totalCount, ' entries '),
      m(),
      O(2, e.totalPages > 0 ? 2 : -1));
  }
}
function PRe(t, n) {
  1 & t &&
    (d(0, 'div', 14)(1, 'div', 17)(2, 'span', 18),
    v(3, 'Loading...'),
    u()(),
    d(4, 'p', 19),
    v(5, 'Loading transcripts...'),
    u()());
}
function RRe(t, n) {
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
function IRe(t, n) {
  1 & t &&
    (d(0, 'div', 33)(1, 'div', 36)(2, 'span', 18),
    v(3, 'Loading...'),
    u()(),
    d(4, 'span', 37),
    v(5, 'Loading more...'),
    u()());
}
function ORe(t, n) {
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
function NRe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 34)(1, 'p'),
      v(2, 'No transcripts found.'),
      u(),
      H(3, ORe, 2, 0, 'button', 38),
      u()),
    2 & t)
  ) {
    const e = g(2);
    (m(3), O(3, e.searchText ? 3 : -1));
  }
}
function LRe(t, n) {
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
function BRe(t, n) {
  if ((1 & t && (d(0, 'div', 40), ht(1, LRe, 7, 3, 'div', 41, kRe), u()), 2 & t)) {
    const e = g(2);
    (m(), pt(e.filteredTranscripts));
  }
}
function URe(t, n) {
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
      H(16, IRe, 6, 0, 'div', 33)(17, NRe, 4, 1, 'div', 34)(18, BRe, 3, 0),
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
(() => {
  class t {
    constructor(e, i) {
      ((this.appService = e),
        (this.route = i),
        (this.transcripts = []),
        (this.filteredTranscripts = []),
        (this.loading = !1),
        (this.searchText = ''),
        (this.currentPage = 0),
        (this.pageSize = 300),
        (this.hasMore = !1),
        (this.hasPrevious = !1),
        (this.totalCount = 0),
        (this.totalPages = 0),
        (this.error = null),
        (this.token = null),
        (this.sessionName = 'Unknown Session'),
        (this.selectedDate = this.getDefaultDate()),
        (this.selectedDateString = ''),
        (this.selectedDateString = this.formatDateForInput(this.selectedDate)));
    }
    getDefaultDate() {
      const e = new Date();
      return new Date(e.getFullYear(), e.getMonth(), e.getDate());
    }
    formatDateForInput(e) {
      return `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`;
    }
    ngOnInit() {
      if (
        (console.log('SessionTranscriptComponent ngOnInit called'),
        console.log('Current route:', this.route.snapshot),
        console.log('Window hash:', window.location.hash),
        this.route.queryParams.subscribe((e) => {
          (console.log('Query params:', e),
            e.token && (this.token = e.token),
            (this.sessionName = e.name || 'Unknown Session'));
        }),
        !this.token && typeof window < 'u')
      ) {
        const e = window.location.hash,
          i = e.match(/[?&]token=([^&]+)/);
        i && (this.token = decodeURIComponent(i[1]));
        const o = e.match(/[?&]name=([^&]+)/);
        o && (this.sessionName = decodeURIComponent(o[1]));
      }
      (!this.token &&
        this.appService.globals?.sesionToken &&
        (this.token = this.appService.globals.sesionToken),
        this.token ? this.loadTranscripts(0, !1) : (this.error = 'No session token available'),
        window.opener &&
          window.addEventListener('beforeunload', () => {
            window.opener &&
              !window.opener.closed &&
              window.opener.postMessage('transcriptWindowClosing', window.location.origin);
          }));
    }
    ngOnDestroy() {}
    loadTranscripts() {
      var e = this;
      return I(function* (i = 0, o = !1) {
        if (!e.token) return void (e.error = 'No session token available');
        ((e.loading = !0), (e.error = null));
        const s = e.selectedDate.getFullYear(),
          r = e.selectedDate.getMonth(),
          a = e.selectedDate.getDate(),
          c = new Date(Date.UTC(s, r, a, 13, 0, 0)).toISOString();
        try {
          const h = yield e.appService.getSessionTranscripts(e.token, {
            startDate: c,
            page: i,
            limit: e.pageSize
          });
          h.success
            ? ((e.transcripts = o ? [...h.transcripts, ...e.transcripts] : h.transcripts),
              h.pagination &&
                ((e.currentPage = h.pagination.page),
                (e.hasMore = h.pagination.hasMore),
                (e.hasPrevious = h.pagination.hasPrevious),
                (e.totalCount = h.pagination.totalCount),
                (e.totalPages = h.pagination.totalPages)),
              e.applySearch())
            : (e.error = h.error || 'Failed to load transcripts');
        } catch (h) {
          (P('Error loading transcripts:', h),
            (e.error = h.message || 'An error occurred while loading transcripts'));
        } finally {
          e.loading = !1;
        }
      }).apply(this, arguments);
    }
    loadPrevious() {
      var e = this;
      return I(function* () {
        const i = new Date(e.selectedDate);
        (i.setDate(i.getDate() - 1),
          (e.selectedDate = i),
          (e.selectedDateString = e.formatDateForInput(i)),
          (e.currentPage = 0),
          yield e.loadTranscripts(0, !1),
          window.scrollTo({ top: 0, behavior: 'smooth' }));
      })();
    }
    loadNextDay() {
      var e = this;
      return I(function* () {
        const i = new Date(e.selectedDate);
        (i.setDate(i.getDate() + 1),
          (e.selectedDate = i),
          (e.selectedDateString = e.formatDateForInput(i)),
          (e.currentPage = 0),
          yield e.loadTranscripts(0, !1),
          window.scrollTo({ top: 0, behavior: 'smooth' }));
      })();
    }
    loadPrev() {
      var e = this;
      return I(function* () {
        e.currentPage > 0 &&
          (yield e.loadTranscripts(e.currentPage - 1, !1),
          window.scrollTo({ top: 0, behavior: 'smooth' }));
      })();
    }
    loadMore() {
      var e = this;
      return I(function* () {
        (yield e.loadTranscripts(e.currentPage + 1, !1),
          window.scrollTo({ top: 0, behavior: 'smooth' }));
      })();
    }
    resetToToday() {
      ((this.selectedDate = this.getDefaultDate()),
        (this.selectedDateString = this.formatDateForInput(this.selectedDate)),
        (this.currentPage = 0),
        this.loadTranscripts(0, !1));
    }
    applySearch() {
      if (!this.searchText || 0 === this.searchText.trim().length)
        return void (this.filteredTranscripts = this.transcripts);
      const e = this.searchText.toLowerCase().trim();
      this.filteredTranscripts = this.transcripts.filter(
        (i) => i.text.toLowerCase().includes(e) || i.speaker.toLowerCase().includes(e)
      );
    }
    onSearchChange() {
      this.applySearch();
    }
    clearSearch() {
      ((this.searchText = ''), this.applySearch());
    }
    formatDate(e) {
      const i = new Date(e),
        o = i.getMonth() + 1,
        s = i.getDate(),
        r = i.getFullYear(),
        a = i.getHours();
      return `${o}/${s}/${r} ${a % 12 || 12}:${String(i.getMinutes()).padStart(2, '0')}:${String(i.getSeconds()).padStart(2, '0')} ${a >= 12 ? 'PM' : 'AM'}`;
    }
    onDateChange() {
      if (this.selectedDateString) {
        const [e, i, o] = this.selectedDateString.split('-').map(Number);
        ((this.selectedDate = new Date(e, i - 1, o, 8, 0, 0)),
          (this.currentPage = 0),
          this.loadTranscripts(0, !1));
      }
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(sc));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-session-transcript']],
        decls: 20,
        vars: 6,
        consts: [
          [1, 'transcript-container'],
          [1, 'transcript-header'],
          [1, 'header-controls'],
          [1, 'date-picker-container'],
          ['for', 'date-picker', 1, 'date-label'],
          [
            'type',
            'date',
            'id',
            'date-picker',
            1,
            'form-control',
            'date-input',
            3,
            'ngModelChange',
            'change',
            'ngModel'
          ],
          [1, 'search-container'],
          [1, 'input-group'],
          [
            'type',
            'text',
            'placeholder',
            'Search transcripts...',
            1,
            'form-control',
            3,
            'ngModelChange',
            'input',
            'keyup.enter',
            'ngModel'
          ],
          ['title', 'Clear search', 1, 'input-group-text', 'btn', 'btn-light'],
          ['title', 'Search', 1, 'input-group-text', 'btn', 'btn-light', 3, 'click'],
          [1, 'fas', 'fa-search'],
          [1, 'pagination-info'],
          [1, 'transcript-body'],
          [1, 'loading-container'],
          ['title', 'Clear search', 1, 'input-group-text', 'btn', 'btn-light', 3, 'click'],
          [1, 'fas', 'fa-times'],
          ['role', 'status', 1, 'spinner-border', 'text-primary'],
          [1, 'visually-hidden'],
          [1, 'mt-3'],
          [1, 'error-container'],
          ['role', 'alert', 1, 'alert', 'alert-danger'],
          [1, 'fas', 'fa-exclamation-triangle'],
          [1, 'btn', 'btn-primary', 3, 'click'],
          [1, 'pagination-controls-top'],
          [1, 'btn', 'btn-primary', 3, 'click', 'disabled'],
          [1, 'fas', 'fa-arrow-up'],
          [1, 'btn', 'btn-secondary', 3, 'click', 'disabled'],
          [1, 'fas', 'fa-chevron-up'],
          [1, 'fas', 'fa-chevron-down'],
          [1, 'fas', 'fa-arrow-down'],
          [1, 'btn', 'btn-outline-primary', 3, 'click', 'disabled'],
          [1, 'fas', 'fa-home'],
          [1, 'loading-more'],
          [1, 'empty-container'],
          [1, 'pagination-controls-bottom'],
          ['role', 'status', 1, 'spinner-border', 'spinner-border-sm', 'text-primary'],
          [1, 'ms-2'],
          [1, 'btn', 'btn-link'],
          [1, 'btn', 'btn-link', 3, 'click'],
          [1, 'transcript-entries'],
          [1, 'transcript-entry'],
          [1, 'entry-date'],
          [1, 'entry-speaker']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 0)(1, 'div', 1)(2, 'h2'),
            v(3),
            u(),
            d(4, 'div', 2)(5, 'div', 3)(6, 'label', 4),
            v(7, 'Date:'),
            u(),
            d(8, 'input', 5),
            Ve('ngModelChange', function (r) {
              return (He(o.selectedDateString, r) || (o.selectedDateString = r), r);
            }),
            x('change', function () {
              return o.onDateChange();
            }),
            u()(),
            d(9, 'div', 6)(10, 'div', 7)(11, 'input', 8),
            Ve('ngModelChange', function (r) {
              return (He(o.searchText, r) || (o.searchText = r), r);
            }),
            x('input', function () {
              return o.onSearchChange();
            })('keyup.enter', function () {
              return o.onSearchChange();
            }),
            u(),
            H(12, xRe, 2, 0, 'span', 9),
            d(13, 'span', 10),
            x('click', function () {
              return o.onSearchChange();
            }),
            T(14, 'i', 11),
            u()()(),
            H(15, ARe, 3, 3, 'div', 12),
            u()(),
            d(16, 'div', 13),
            H(17, PRe, 6, 0, 'div', 14)(18, RRe, 6, 1)(19, URe, 35, 12),
            u()()),
            2 & i &&
              (m(3),
              Ne('Session Transcript for: ', o.sessionName, ''),
              m(5),
              je('ngModel', o.selectedDateString),
              m(3),
              je('ngModel', o.searchText),
              m(),
              O(12, o.searchText && o.searchText.length > 0 ? 12 : -1),
              m(3),
              O(15, o.totalCount > 0 ? 15 : -1),
              m(2),
              O(17, o.loading && 0 === o.transcripts.length ? 17 : o.error ? 18 : 19)));
        },
        dependencies: [ai, ti, Yn],
        styles: [
          '.transcript-container[_ngcontent-%COMP%]{width:100%;height:100vh;display:flex;flex-direction:column;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Cantarell,sans-serif}.transcript-header[_ngcontent-%COMP%]{background-color:#fff;border-bottom:1px solid #dee2e6;padding:1rem 1.5rem;box-shadow:0 2px 4px #0000001a;flex-shrink:0}.transcript-header[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%]{margin:0 0 1rem;font-size:1.5rem;font-weight:600;color:#333}.transcript-header[_ngcontent-%COMP%]   .header-controls[_ngcontent-%COMP%]{display:flex;flex-direction:row;align-items:center;gap:1rem;flex-wrap:wrap}.transcript-header[_ngcontent-%COMP%]   .header-controls[_ngcontent-%COMP%]   .date-picker-container[_ngcontent-%COMP%]{display:flex;align-items:center;gap:.5rem}.transcript-header[_ngcontent-%COMP%]   .header-controls[_ngcontent-%COMP%]   .date-picker-container[_ngcontent-%COMP%]   .date-label[_ngcontent-%COMP%]{font-weight:500;color:#495057;margin:0;white-space:nowrap}.transcript-header[_ngcontent-%COMP%]   .header-controls[_ngcontent-%COMP%]   .date-picker-container[_ngcontent-%COMP%]   .date-input[_ngcontent-%COMP%]{width:auto;min-width:150px}.transcript-header[_ngcontent-%COMP%]   .header-controls[_ngcontent-%COMP%]   .search-container[_ngcontent-%COMP%]{flex:1;max-width:500px}.transcript-header[_ngcontent-%COMP%]   .header-controls[_ngcontent-%COMP%]   .search-container[_ngcontent-%COMP%]   .input-group[_ngcontent-%COMP%]   .form-control[_ngcontent-%COMP%]{border-radius:.25rem 0 0 .25rem}.transcript-header[_ngcontent-%COMP%]   .header-controls[_ngcontent-%COMP%]   .search-container[_ngcontent-%COMP%]   .input-group[_ngcontent-%COMP%]   .input-group-text[_ngcontent-%COMP%]{cursor:pointer;border-left:none}.transcript-header[_ngcontent-%COMP%]   .header-controls[_ngcontent-%COMP%]   .search-container[_ngcontent-%COMP%]   .input-group[_ngcontent-%COMP%]   .input-group-text[_ngcontent-%COMP%]:hover{background-color:#e9ecef}.transcript-header[_ngcontent-%COMP%]   .header-controls[_ngcontent-%COMP%]   .pagination-info[_ngcontent-%COMP%]{font-size:.875rem;color:#6c757d;margin-top:.5rem}.transcript-body[_ngcontent-%COMP%]{flex:1;overflow-y:auto;padding:1.5rem;display:flex;flex-direction:column}.loading-container[_ngcontent-%COMP%], .error-container[_ngcontent-%COMP%], .empty-container[_ngcontent-%COMP%]{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:400px;text-align:center}.loading-container[_ngcontent-%COMP%]   p[_ngcontent-%COMP%], .error-container[_ngcontent-%COMP%]   p[_ngcontent-%COMP%], .empty-container[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]{font-size:1.1rem;color:#6c757d;margin:0}.loading-more[_ngcontent-%COMP%]{display:flex;align-items:center;justify-content:center;padding:1rem;color:#6c757d}.pagination-controls-top[_ngcontent-%COMP%], .pagination-controls-bottom[_ngcontent-%COMP%]{display:flex;gap:.5rem;justify-content:center;padding:1rem 0;flex-shrink:0;flex-wrap:wrap}.pagination-controls-top[_ngcontent-%COMP%]   .btn[_ngcontent-%COMP%], .pagination-controls-bottom[_ngcontent-%COMP%]   .btn[_ngcontent-%COMP%]{min-width:140px;white-space:nowrap}.transcript-entries[_ngcontent-%COMP%]{flex:1;display:flex;flex-direction:column;gap:0;margin:1rem 0;background-color:#fff;padding:.5rem;border-radius:.375rem}.transcript-entry[_ngcontent-%COMP%]{padding:.25rem .5rem;color:#212529;line-height:1.5;word-wrap:break-word;font-size:.95rem;margin:0;border:none;background:none;box-shadow:none}.transcript-entry[_ngcontent-%COMP%]:hover{background-color:#f8f9fa}.transcript-entry[_ngcontent-%COMP%]   .entry-date[_ngcontent-%COMP%]{font-style:italic}.transcript-entry[_ngcontent-%COMP%]   .entry-speaker[_ngcontent-%COMP%]{font-weight:700}@media (max-width: 768px){.transcript-header[_ngcontent-%COMP%]{padding:.75rem 1rem}.transcript-header[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%]{font-size:1.25rem}.transcript-header[_ngcontent-%COMP%]   .header-controls[_ngcontent-%COMP%]   .search-container[_ngcontent-%COMP%]{max-width:100%}.transcript-body[_ngcontent-%COMP%]{padding:1rem}.transcript-entry[_ngcontent-%COMP%]{padding:.25rem .5rem;font-size:.875rem}.header-controls[_ngcontent-%COMP%]{flex-direction:column;align-items:stretch}.header-controls[_ngcontent-%COMP%]   .date-picker-container[_ngcontent-%COMP%]{width:100%}.pagination-controls-top[_ngcontent-%COMP%], .pagination-controls-bottom[_ngcontent-%COMP%]{flex-direction:column}.pagination-controls-top[_ngcontent-%COMP%]   .btn[_ngcontent-%COMP%], .pagination-controls-bottom[_ngcontent-%COMP%]   .btn[_ngcontent-%COMP%]{width:100%}}'
        ]
      });
    }
  }
  return t;
})();
