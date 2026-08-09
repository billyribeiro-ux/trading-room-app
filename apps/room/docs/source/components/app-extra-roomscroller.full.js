const y3e = ['scrollerref'],
  $B = (t, n) => n._id;
function F3e(t, n) {
  if ((1 & t && T(0, 'app-st-message', 2), 2 & t)) {
    const e = n.$implicit,
      i = n.$index,
      o = g(3);
    z('msg', e)('isP', o.isPresenter)('logType', o.logType)('prevD', i > 0 ? o.msgs[i - 1].t : 0)(
      'extraChatMsg',
      o.extraChatMsg
    );
  }
}
function C3e(t, n) {}
function S3e(t, n) {
  if ((1 & t && ht(0, F3e, 1, 5, 'app-st-message', 2, $B, !1, C3e, 0, 0), 2 & t)) {
    const e = g(2);
    pt(e.filterChatMessages(e.msgs, e.logType));
  }
}
function w3e(t, n) {
  if ((1 & t && T(0, 'app-st-compactmessage', 2), 2 & t)) {
    const e = n.$implicit,
      i = n.$index,
      o = g(3);
    z('msg', e)('isP', o.isPresenter)('logType', o.logType)('prevD', i > 0 ? o.msgs[i - 1].t : 0)(
      'extraChatMsg',
      o.extraChatMsg
    );
  }
}
function T3e(t, n) {}
function D3e(t, n) {
  if ((1 & t && ht(0, w3e, 1, 5, 'app-st-compactmessage', 2, $B, !1, T3e, 0, 0), 2 & t)) {
    const e = g(2);
    pt(e.filterChatMessages(e.msgs, e.logType));
  }
}
function E3e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 1, 0),
      x('scroll', function (o) {
        return (D(e), E(g().scrolling(o)));
      }),
      H(2, S3e, 3, 1)(3, D3e, 3, 1),
      u());
  }
  if (2 & t) {
    const e = g();
    (m(2), O(2, 'r' == e.displayMode ? 2 : 3));
  }
}
k3e = (() => {
  class t {
    constructor(e, i, o) {
      ((this.appService = e),
        (this.alertService = i),
        (this.soundEffectsService = o),
        (this.searchTerm = ''),
        (this.channel = 'offTopic'),
        (this.currPage = 0),
        (this.isScrollingUp = !1),
        (this.loadingMore = !1),
        (this.shouldtrimFat = !0),
        (this.hasMoreData = !0),
        (this.scroller = null),
        (this.appEventBus = e.appEventBus),
        (this.guiEventBus = e.guiEventBus));
    }
    ngOnInit() {
      this.appService.globals.preferences.extraChatColumn &&
        (this.appService.globals.sessData.autoSwitchToOfftopics &&
          ((this.channel = 'offTopic'),
          this.appEventBus.emit('switchChatChannelExtra', this.channel)),
        this.guiEventBus.subscribe('scrollChatLogToBottom', (o) => {
          this.scrollToBottom(o.force, o.repeat);
        }),
        this.guiEventBus.subscribe('redrawChatAndAlerts', (o) => {
          (P('roomlog redrawChatAndAlerts'),
            (this.msgs = []),
            setTimeout(() => {
              'chat' == this.logType &&
                ((this.msgs = this.appService.globals.chatLog[this.channel]),
                (this.isScrollingUp = !1),
                this.scrollToBottom(!0),
                P('roomlog redraw done for extraChat...'));
            }));
        }),
        this.appEventBus.subscribe('deleteChatMsg', (o) => {
          if (
            (P(`deleteChatMsg in roomScroller. my chan: ${this.channel}. msg`, o),
            'chat' != this.logType)
          )
            return;
          let s = this.msgs;
          P(`deleteChatMsg msgs len: ${s.length}. chan: ${o.channel}`);
          for (let r = 0; r < s.length; r++)
            if (s[r]._id == o.msgID)
              return (P('deleteChatMsg found at idx: ' + r), void s.splice(r, 1));
          P('deleteChatMsg. not found...');
        }),
        this.appEventBus.subscribe('updateChatMsg', (o) => {
          if (
            (P(`updateChatMsg in roomScroller. my chan: ${this.channel}. msg`, o),
            'chat' != this.logType)
          )
            return;
          let s = this.msgs;
          P(`updateChatMsg msgs len: ${s.length}. chan: ${o.channel}`);
          for (let r = 0; r < s.length; r++)
            if (s[r]._id == o._id) return (P('updateChatMsg found at idx: ' + r), void (s[r] = o));
          P('updateChatMsg. not found...');
        }),
        this.guiEventBus.subscribe('resizeScrollviewChatEnd', () => {
          this.adjustScrollViewSize();
        }),
        this.guiEventBus.subscribe('resizeScrollviewChatStart', () => {
          this.adjustScrollViewSizeStart(this.logType);
        }),
        $(window).resize(() => {
          this.scrollToBottom(!0);
        }),
        'chat' == this.logType &&
          this.appEventBus.subscribe('switchChatChannelExtra', (o) => {
            (P(`roomlog switch to channel ${o}`),
              (this.searchTerm = ''),
              this.appService.globals.chatLog[o] ||
                ((this.appService.globals.chatLog[o] = new Array()),
                P(`room log siwtched to empty channel  ${o}`)),
              (this.msgs = this.appService.globals.chatLog[o]),
              (this.channel = o),
              P(`roomlog switch to channel ${o} msgs len now:${this.msgs.length}`),
              (this.isScrollingUp = !1),
              this.scrollToBottom(!0));
          }),
        this.appEventBus.subscribe('getChatLogExtra', (o) => {
          ((this.loadingMore = !1),
            0 == o.length && (this.hasMoreData = !1),
            ((o && this.channel == o.channel) ||
              (!o.channel && 'main' == this.channel) ||
              (!o.channel && !this.channel)) &&
              (P(
                `roomlog comp mode ${this.logType} got chatlog...len:` +
                  this.appService.globals.chatLog[o.channel].length
              ),
              (this.msgs = this.appService.globals.chatLog[o.channel]),
              this.scroller && o && o.page && o.page > 0
                ? (this.scroller.scrollTop = this.scroller.scrollTop + 1)
                : ((this.isScrollingUp = !1),
                  setTimeout(() => {
                    this.adjustScrollViewSize();
                  }, 1e3))));
        }),
        this.appEventBus.subscribe('chatMsg', (o) => {
          (this.channel == o.c || (!o.c && 'main' == this.channel) || (!o.c && !this.channel)) &&
            (this.searchTerm &&
              ((o && o.txt && -1 != o.txt.toLowerCase().indexOf(this.searchTerm)) ||
                (o.n && -1 != o.n.toLowerCase().indexOf(this.searchTerm))) &&
              this.msgs.push(o),
            this.appService.globals.preferences.extraChatColumn &&
              !this.searchTerm &&
              (this.msgs = this.appService.globals.chatLog[o.c]),
            (!this.isScrollingUp || o.uid == this.appService.globals.user.uid) &&
              ((this.isScrollingUp = !1), this.scrollToBottom(!0)));
        }),
        this.appEventBus.subscribe('alwaysScrollToBottom', () => {
          this.appService.globals.preferences.alwaysScrollToBottom && this.scrollToBottom(!0);
        }),
        this.appEventBus.subscribe('getChatLogSearchExtra', (o) => {
          ('chat' == this.logType &&
            'chat' == o.type &&
            (P('got search results...type=' + this.logType),
            (this.msgs = this.appService.globals.chatSearchResultsExtra)),
            setTimeout(() => {
              this.adjustScrollViewSize();
            }, 1e3));
        }),
        this.guiEventBus.subscribe('setSearchTermExtra', (o) => {
          (P('room-log setSearchTermExtra type:' + this.logType + ' caught: ' + JSON.stringify(o)),
            o &&
              'chat' == this.logType &&
              'chat' == o.type &&
              ((this.searchTerm = o.searchTerm),
              this.searchTerm ||
                ((this.msgs = this.appService.globals.chatLog[this.channel]),
                setTimeout(() => {
                  this.adjustScrollViewSize();
                }, 1e3),
                P('reset from search to chatlog...'))));
        }));
    }
    ngAfterViewInit() {
      this.adjustScrollViewSize();
    }
    filterChatMessages(e, i) {
      if ('chat' === i && e && e.length > 0) {
        const { mutedUsers: o, user: s } = this.appService.globals;
        o && Object.keys(o).length > 0 && e && e.length > 0 && (e = e.filter((a) => !o[a.avt]));
        const { modOnlyExtra: r } = this.appService.globals.filterChatMsgs;
        r &&
          (e = e.filter((a) => {
            if (a.uid === s.userXrefID || (r && a.isA)) return !0;
          }));
      }
      return e;
    }
    downloadLog(e) {
      var i = this;
      return I(function* () {
        'chat' === e &&
          bootbox.prompt({
            title: 'Chat Log',
            message: '<p>Please select an option below:</p>',
            inputType: 'radio',
            inputOptions: [
              { text: 'Entire chat history', value: 'all' },
              { text: 'Last 24 hours', value: '24hrs' },
              { text: 'Last 7 days', value: '7days' }
            ],
            callback: (o) => {
              o && i.downloadLogType(e, !1, o);
            }
          });
      })();
    }
    downloadLogType(e, i) {
      var o = this;
      return I(function* (s, r, a = null) {
        const l = [],
          c = {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          },
          f = (yield o.appService.invokeServerCommand('getAllLog', {
            type: s,
            channel: o.channel,
            limit: a
          })).data;
        for (let M = 0; M < f.length; M++) {
          const B = f[M],
            W = new Date(B.t).toLocaleTimeString('en-us', c) + '[' + B.n + ']: ' + B.txt + '\r\n';
          if ((l.push(W), r && B.hasOwnProperty('qa') && B.qa.length > 0)) {
            let J = ['\r\nQA for "' + B.txt + '": \n'];
            for (let te = 0; te < B.qa.length; te++) {
              const oe = B.qa[te],
                se =
                  '\t' +
                  new Date(oe.t).toLocaleTimeString('en-us', c) +
                  '[' +
                  oe.n +
                  ']: ' +
                  oe.txt +
                  '\r\n';
              J.push(se);
            }
            l.push(...J);
          }
        }
        const _ = new Blob(l, { type: 'text/plain;charset=utf-8' }),
          F = ('chat' == s ? 'ChatLog_' : '') + new Date().toDateString() + '.txt',
          S = window.URL.createObjectURL(_),
          w = document.createElement('a');
        ((w.href = S),
          (w.download = F),
          (w.style.display = 'none'),
          document.body.appendChild(w),
          w.click(),
          document.body.removeChild(w));
      }).apply(this, arguments);
    }
    adjustScrollViewSizeStart(e) {}
    adjustScrollViewSize(e = !0) {
      this.scrollToBottom(!0, !1);
    }
    scrolling(e) {
      let i = e.target;
      if (
        ((this.scroller = i),
        i.scrollHeight - i.scrollTop <= i.offsetHeight + 20
          ? ((this.isScrollingUp = !1),
            (this.shouldtrimFat = !0),
            (this.hasMoreData = !0),
            this.currPage > 0 && this.trimFat())
          : (this.isScrollingUp = !0),
        i.scrollTop < 100 && this.msgs && this.msgs.length > 15 && !this.searchTerm)
      ) {
        if (!this.hasMoreData) return void P('loading more: no more data...');
        if (this.loadingMore) return void P('loading more already...');
        ((this.loadingMore = !0),
          this.currPage++,
          this.appService.appEventBus.emit('loadMoreLogs', {
            type: this.logType,
            channel: this.channel,
            page: this.currPage,
            extraChat: !0
          }),
          (this.scrollRef.nativeElement.parentElement.scrollTop =
            this.scrollRef.nativeElement.parentElement.scrollTop + 30));
      }
    }
    scrollToBottom(e = !1, i = !1) {
      if (
        this.scrollRef &&
        this.scrollRef.nativeElement &&
        this.scrollRef.nativeElement.parentElement
      )
        try {
          ((this.scrollRef.nativeElement.parentElement.scrollTop =
            this.scrollRef.nativeElement.parentElement.scrollHeight),
            setTimeout(() => {
              this.scrollRef.nativeElement.parentElement.scrollTop =
                this.scrollRef.nativeElement.parentElement.scrollHeight;
            }, 200));
        } catch (o) {
          console.error('scrollToBottom error:', o);
        }
    }
    trimFat() {
      (P('Trimming the fat a little'),
        (this.currPage = 0),
        (this.loadingMore = !1),
        'chat' == this.logType && this.appService.appEventBus.emit('trimChatLog', this.channel, !0),
        this.scrollToBottom(!0, !0));
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(fo), be(Ir));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-extra-roomscroller']],
        viewQuery: function (i, o) {
          if ((1 & i && Xt(y3e, 5), 2 & i)) {
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
        inputs: {
          logType: 'logType',
          displayMode: 'displayMode',
          isPresenter: 'isPresenter',
          extraChatMsg: 'extraChatMsg'
        },
        decls: 1,
        vars: 1,
        consts: [
          ['scrollerref', ''],
          [3, 'scroll'],
          [3, 'msg', 'isP', 'logType', 'prevD', 'extraChatMsg']
        ],
        template: function (i, o) {
          (1 & i && H(0, E3e, 4, 1, 'div'),
            2 & i && O(0, o.filterChatMessages(o.msgs, o.logType) ? 0 : -1));
        },
        dependencies: [pu, uf],
        styles: ['[_nghost-%COMP%]{background-color:var(--msgs-bg)}']
      });
    }
  }
  return t;
})();
