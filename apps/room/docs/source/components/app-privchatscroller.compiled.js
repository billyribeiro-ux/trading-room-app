VDe = (() => {
  class t {
    constructor(e) {
      ((this.appService = e),
        (this.searchTerm = ''),
        (this.isScrollingUp = !1),
        (this.isP = !1),
        (this.loadingMore = !1),
        (this.shouldtrimFat = !0),
        (this.hasMoreData = !0),
        (this.scroller = null),
        (this.currPage = 0),
        (this.isLoadingMore = !1),
        (this.loadMoreLastID = ''));
    }
    ngOnInit() {
      ((this.isP = this.appService.globals.isPresenter),
        this.appService.appEventBus.subscribe('scrollPCLogToBottom', (e) => {
          this.scrollToBottom(e.force, e.repeat);
        }),
        this.appService.appEventBus.subscribe('getChatLogPrivMssg', (e) => {
          this.isLoadingMore = !1;
        }),
        this.appService.appEventBus.subscribe('getPCLog', (e) => {
          ((this.isLoadingMore = !1),
            0 == e.length && ((this.hasMoreData = !1), (this.loadMoreLastID = '')),
            this.loadMoreLastID &&
              (document.getElementById(this.loadMoreLastID).scrollIntoView(!0),
              (this.scrollRef.nativeElement.parentElement.scrollTop =
                this.scrollRef.nativeElement.parentElement.scrollTop - 20)));
        }),
        this.appService.guiEventBus.subscribe('PCswitchChatToUser', (e) => {
          ((this.currPage = 0),
            (this.hasMoreData = !0),
            (this.isLoadingMore = !1),
            (this.loadMoreLastID = ''));
        }),
        this.scrollToBottom(!0, !0));
    }
    offset(e) {
      var i = e.getBoundingClientRect(),
        o = window.pageXOffset || document.documentElement.scrollLeft,
        s = window.pageYOffset || document.documentElement.scrollTop;
      return { top: i.top + s, left: i.left + o };
    }
    ngAfterViewInit() {
      ((this.offsetHeightVal = this.offset(document.querySelector('.pc-messages')).top),
        this.scrollToBottom(!0, !0));
    }
    scrollToBottom(e = !1, i = !1) {
      try {
        (P(
          'scrollPCLogToBottom called on log....force:' + e + '.  parent:',
          this.scrollRef.nativeElement.parentElement
        ),
          (this.scrollRef.nativeElement.scrollTop = this.scrollRef.nativeElement.scrollHeight));
        const o = this;
        setTimeout(() => {
          (P('scrolling delayed.... SH:' + o.scrollRef.nativeElement.scrollHeight),
            (o.scrollRef.nativeElement.scrollTop = o.scrollRef.nativeElement.scrollHeight),
            P('scrolling delayed.... ST:' + o.scrollRef.nativeElement.scrollTop));
        }, 500);
      } catch {}
    }
    scrolling(e) {
      let i = e.target;
      (console.log(`PC Scroll position: ${i.scrollTop}`),
        i.scrollHeight - i.scrollTop <= i.offsetHeight + 20
          ? (P('onScroll NOT scrolling up!'), (this.isScrollingUp = !1))
          : (P('onScroll scrolling up!'), (this.isScrollingUp = !0)));
    }
    loadMore() {
      ((this.loadMoreLastID = 'pcm-' + this.msgs[0]._id),
        this.appService.guiEventBus.emit('PCLoadMore', { page: ++this.currPage }),
        (this.isLoadingMore = !0));
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-privchatscroller']],
        viewQuery: function (i, o) {
          if ((1 & i && Xt(NDe, 5), 2 & i)) {
            let s;
            yt((s = Ft())) && (o.scrollRef = s.first);
          }
        },
        hostBindings: function (i, o) {
          1 & i &&
            x('scroll', function (r) {
              return o.scrolling(r);
            });
        },
        inputs: { msgs: 'msgs', searchTerm: 'searchTerm' },
        decls: 6,
        vars: 2,
        consts: [
          ['scrollerref', ''],
          [1, 'pc-messages', 3, 'scroll'],
          [1, 'text-center'],
          ['logType', 'pc', 'isP', 'isP', 3, 'msg', 'prevD', 'id'],
          [1, 'badge', 'badge-warning', 3, 'click'],
          [1, 'badge', 'badge-warning'],
          [1, 'fas', 'fa-spinner', 'fa-spin']
        ],
        template: function (i, o) {
          if (1 & i) {
            const s = Y();
            (d(0, 'div', 1, 0),
              x('scroll', function (a) {
                return (D(s), E(o.scrolling(a)));
              }),
              H(2, BDe, 3, 0, 'div', 2)(3, UDe, 4, 0, 'div', 2),
              ht(4, jDe, 1, 4, 'app-st-compactmessage', 3, LDe),
              u());
          }
          2 & i &&
            (m(2),
            O(2, o.hasMoreData && !o.searchTerm ? 2 : -1),
            m(),
            O(3, o.isLoadingMore ? 3 : -1),
            m(),
            pt(o.msgs));
        },
        dependencies: [uf],
        styles: ['.pc-messages[_ngcontent-%COMP%]{height:calc(100% - 50px);overflow:hidden auto}']
      });
    }
  }
  return t;
})();
