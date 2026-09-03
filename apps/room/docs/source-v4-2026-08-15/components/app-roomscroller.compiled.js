a6 = (() => {
  class t {
    constructor(e, i, o) {
      ((this.appService = e),
        (this.alertService = i),
        (this.soundEffectsService = o),
        (this.searchTerm = ''),
        (this.channel = 'main'),
        (this.currPage = 0),
        (this.isScrollingUp = !1),
        (this.loadingMore = !1),
        (this.shouldtrimFat = !0),
        (this.hasMoreData = !0),
        (this.scroller = null),
        (this.copyTradeAlertVisible = !1),
        (this.appEventBus = e.appEventBus),
        (this.guiEventBus = e.guiEventBus));
    }
    ngOnInit() {
      (this.appService.globals.sessData.autoSwitchToOfftopics &&
        ((this.channel = 'offTopic'), this.appEventBus.emit('switchChatChannel', this.channel)),
        this.guiEventBus.subscribe('scrollChatLogToBottom', (o) => {
          this.scrollToBottom(o.force, o.repeat);
        }),
        this.guiEventBus.subscribe('redrawChatAndAlerts', (o) => {
          (P('roomlog redrawChatAndAlerts'),
            (this.msgs = []),
            setTimeout(() => {
              'chat' == this.logType
                ? ((this.msgs = this.appService.globals.chatLog[this.channel]),
                  (this.isScrollingUp = !1),
                  this.scrollToBottom(!0),
                  P('roomlog redraw done...'))
                : ((this.msgs = this.appService.globals.alertsLog),
                  (this.isScrollingUp = !1),
                  this.scrollToBottom(!0));
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
        this.appService.appEventBus.subscribe(
          'updateAlertMsg',
          ({
            updatedAlert: o,
            question: s,
            deletedQA: r,
            updateAlertFromLog: a,
            updatedQAMsg: l,
            qaReactionDetails: c
          }) => {
            if ('alerts' === this.logType && a) {
              let f = this.msgs;
              for (let _ = 0; _ < f.length; _++) if (f[_]._id == o._id) return void (f[_] = o);
              return void P('updateAlertMsg. not found...');
            }
            if ('alerts' != this.logType || !this.appService.globals.sessData.hasQAOnAlerts) return;
            if (s.uid !== this.appService.globals.user.userXrefID && !r) {
              const f = s.isA ? 'answer' : 'question';
              for (let _ of o.qa)
                _.uid === this.appService.globals.user.userXrefID &&
                  (this.appService.globals.preferences.doNotDisturbOn ||
                    (!l &&
                      this.appService.globals.preferences.qaSoundOn &&
                      this.soundEffectsService.qaAlert.play(),
                    c &&
                      this.appService.globals.preferences.qaReactionSoundOn &&
                      this.soundEffectsService.qaAlert.play()),
                  !l &&
                    this.appService.globals.preferences.alertPopup &&
                    this.alertService.info(
                      `"${s.txt}" for alert: "${o.txt}" by ${o.n}`,
                      `Alert ${f} from @${s.n}`
                    ),
                  this.appService.globals.preferences.reactionsPopupQA &&
                    l &&
                    c &&
                    this.alertService.info(
                      `${c.n}: ${c.remove ? 'removed' : ''} ${c.emoji} on "${c.txt}"`,
                      'QA Reaction',
                      { enableHtml: !0 }
                    ));
              this.appService.globals.user.isPresenter &&
                (this.appService.globals.preferences.doNotDisturbOn ||
                  (!l &&
                    this.appService.globals.preferences.qaSoundOn &&
                    this.soundEffectsService.qaAlert.play(),
                  c &&
                    this.appService.globals.preferences.qaReactionSoundOn &&
                    this.soundEffectsService.qaAlert.play()),
                !l &&
                  this.appService.globals.preferences.alertPopup &&
                  this.alertService.info(
                    `"${s.txt}" for alert: "${o.txt}" by ${o.n}`,
                    `Alert ${f} from @${s.n}`
                  ),
                this.appService.globals.preferences.reactionsPopupQA &&
                  l &&
                  c &&
                  this.alertService.info(
                    `${c.n}: ${c.remove ? 'removed' : ''} ${c.emoji} on "${c.txt}"`,
                    'QA Reaction',
                    { enableHtml: !0 }
                  ));
            }
            this.appService.globals.user.isPresenter ||
              (this.appService.globals.preferences.doNotDisturbOn ||
                (c &&
                  this.appService.globals.preferences.qaReactionSoundOn &&
                  this.soundEffectsService.qaAlert.play()),
              this.appService.globals.preferences.reactionsPopupQA &&
                l &&
                c &&
                this.alertService.info(
                  `${c.n}: ${c.remove ? 'removed' : ''} ${c.emoji} on "${c.txt}"`,
                  'QA Reaction',
                  { enableHtml: !0 }
                ));
            let h = this.msgs;
            for (let f = 0; f < h.length; f++)
              if (h[f]._id == o._id)
                return (
                  P('updateAlertMsg found at idx: ' + f),
                  l
                    ? this.appService.globals.preferences.qaReactionSoundOn &&
                      c &&
                      (o.unreadQA = !0)
                    : (o.unreadQA = !0),
                  (h[f] = o),
                  void this.appService.guiEventBus.emit('openAlertQAModal', {
                    msg: o,
                    openModal: !1
                  })
                );
            P('updateAlertMsg. not found...');
          }
        ),
        this.appEventBus.subscribe('deleteAlertMsg', (o) => {
          if ((P('deleteAlertMsg in roomScroller.  msg', o), 'alerts' != this.logType)) return;
          let s = this.msgs;
          console.log(`msgs len: ${s.length}`);
          for (let r = 0; r < s.length; r++)
            if (s[r]._id == o.msgID)
              return (P('deleteAlertMsg found at idx: ' + r), void s.splice(r, 1));
          P('deleteChatMsg. not found...');
        }),
        this.guiEventBus.subscribe('resizeScrollviewChatEnd', () => {
          this.adjustScrollViewSize();
        }),
        this.guiEventBus.subscribe('resizeScrollviewChatStart', () => {
          this.adjustScrollViewSizeStart(this.logType);
        }),
        $(window).resize(() => {
          this.scrollToBottom(!0);
        }));
      let e = 'chat' == this.logType ? 'getChatLog' : 'getAlertsLog',
        i = 'chat' == this.logType ? 'chatMsg' : 'alertMsg';
      ('chat' == this.logType &&
        this.appEventBus.subscribe('switchChatChannel', (o) => {
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
        this.appEventBus.subscribe(e, (o) => {
          if (
            ((this.loadingMore = !1),
            0 == o.length && (this.hasMoreData = !1),
            'alerts' == this.logType)
          )
            return (
              (this.msgs = this.appService.globals.alertsLog),
              (this.isScrollingUp = !1),
              void (this.scroller && o && o.page && o.page > 0
                ? (this.scroller.scrollTop = this.scroller.scrollTop + 1)
                : ((this.isScrollingUp = !1),
                  setTimeout(() => {
                    this.adjustScrollViewSize();
                  }, 1e3)))
            );
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
                }, 1e3)));
        }),
        this.appEventBus.subscribe(i, (o) => {
          'alerts' == this.logType
            ? (!this.isScrollingUp || o.uid == this.appService.globals.user.uid) &&
              ((this.isScrollingUp = !1),
              this.scrollToBottom(!0),
              this.searchTerm &&
                ((o && o.txt && -1 != o.txt.toLowerCase().indexOf(this.searchTerm)) ||
                  (o.n && -1 != o.n.toLowerCase().indexOf(this.searchTerm))) &&
                this.msgs.push(o))
            : (this.channel == o.c ||
                (!o.c && 'main' == this.channel) ||
                (!o.c && !this.channel)) &&
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
        this.appEventBus.subscribe('getChatLogSearch', (o) => {
          ('chat' == this.logType &&
            'chat' == o.type &&
            (P('got search results...type=' + this.logType),
            (this.msgs = this.appService.globals.chatSearchResults)),
            'alerts' == this.logType &&
              'alerts' == o.type &&
              (P('got search results...type=' + this.logType),
              (this.msgs = this.appService.globals.alertsSearchResults)),
            setTimeout(() => {
              this.adjustScrollViewSize();
            }, 1e3));
        }),
        this.guiEventBus.subscribe('setSearchTerm', (o) => {
          (P('room-log setSearchTerm type:' + this.logType + ' caught: ' + JSON.stringify(o)),
            o &&
              ('alerts' == this.logType &&
                'alerts' == o.type &&
                ((this.searchTerm = o.searchTerm),
                this.searchTerm ||
                  ((this.msgs = this.appService.globals.alertsLog),
                  setTimeout(() => {
                    this.adjustScrollViewSize();
                  }, 1e3))),
              'chat' == this.logType &&
                'chat' == o.type &&
                ((this.searchTerm = o.searchTerm),
                this.searchTerm ||
                  ((this.msgs = this.appService.globals.chatLog[this.channel]),
                  setTimeout(() => {
                    this.adjustScrollViewSize();
                  }, 1e3),
                  P('reset from search to chatlog...')))));
        }));
    }
    ngAfterViewInit() {
      this.adjustScrollViewSize();
    }
    filterChatMessages(e, i) {
      if ('chat' === i && e && e.length > 0) {
        const { mutedUsers: o, user: s } = this.appService.globals;
        o && Object.keys(o).length > 0 && e && e.length > 0 && (e = e.filter((a) => !o[a.avt]));
        const { modOnly: r } = this.appService.globals.filterChatMsgs;
        r &&
          (e = e.filter((a) => {
            if (a.uid === s.userXrefID || (r && a.isA)) return !0;
          }));
      }
      return (
        this.appService.globals.sessData.copyTrades &&
          'alerts' === i &&
          e &&
          e.length > 0 &&
          (e = e.map(
            (o) => (
              o.txt.includes('[{(') &&
                o.txt.includes(')}]') &&
                ((o.txt = o.txt.replace('[{(', '<span class="tradeColor" id="id_' + o._id + '">')),
                (o.txt = o.txt.replace(')}]', '</span>'))),
              o
            )
          )),
        e
      );
    }
    copyTradeOnClick(e, i) {
      const o = e.target;
      'SPAN' === o.tagName &&
        o.classList?.contains('tradeColor') &&
        o.id === i &&
        (this.doTradeCopy(i), e.stopPropagation());
    }
    doTradeCopy(e) {
      const i = document.getElementById(e);
      if (i) {
        const o = i.textContent || '';
        navigator.clipboard
          .writeText(o)
          .then(() => {
            (console.log('Text copied to clipboard:', o),
              this.copyTradeAlertVisible ||
                ((this.copyTradeAlertVisible = !0),
                bootbox.alert('Order copied to clipboard.', () => {
                  this.copyTradeAlertVisible = !1;
                })));
          })
          .catch((s) => {
            console.error('Failed to copy text:', s);
          });
      } else console.error('Element not found for id:', e);
    }
    downloadLog(e) {
      var i = this;
      return I(function* () {
        if ('alerts' === e) {
          const o = i,
            s = bootbox.dialog({
              title: 'Download alerts',
              message: 'Choose an option bellow:',
              buttons: {
                cancel: {
                  label: 'Cancel',
                  className: 'btn-secondary',
                  callback() {
                    console.log('Cancel button clicked');
                  }
                },
                noclose: {
                  label: 'JUST ALERTS',
                  className: 'btn-warning',
                  callback() {
                    (o.downloadLogType(e, !1), s.modal('hide'));
                  }
                },
                ok: {
                  className: 'btn-info',
                  label: 'ALERTS & QA',
                  callback() {
                    (o.downloadLogType(e, !0), s.modal('hide'));
                  }
                }
              }
            });
        } else
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
          f = (yield o.appService.invokeServerCommand(
            'getAllLog',
            { type: s, channel: o.channel, limit: a },
            { ackTimeoutMs: 6e4 }
          )).data;
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
          F = ('chat' == s ? 'ChatLog_' : 'AlertsLog_') + new Date().toDateString() + '.txt',
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
            page: this.currPage
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
        'chat' == this.logType
          ? this.appService.appEventBus.emit('trimChatLog', this.channel)
          : 'alerts' == this.logType && this.appService.appEventBus.emit('trimAlertsLog'),
        this.scrollToBottom(!0, !0));
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(fo), be(Ir));
      };
    }
    static {
      this.ɵcmp = ut({
        type: t,
        selectors: [['app-roomscroller']],
        viewQuery: function (i, o) {
          if ((1 & i && Xt(v_e, 5), 2 & i)) {
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
        inputs: { logType: 'logType', displayMode: 'displayMode', isPresenter: 'isPresenter' },
        decls: 2,
        vars: 1,
        consts: [
          ['scrollerref', ''],
          [3, 'scroll'],
          [3, 'msg', 'isP', 'logType', 'prevD'],
          [3, 'click', 'msg', 'isP', 'logType', 'prevD']
        ],
        template: function (i, o) {
          (1 & i && H(0, D_e, 4, 1, 'div')(1, R_e, 4, 1),
            2 & i && O(0, o.appService.globals.sessData.copyTrades ? 0 : 1));
        },
        dependencies: [pu, uf],
        styles: ['[_nghost-%COMP%]{background-color:var(--msgs-bg)}']
      });
    }
  }
  return t;
})();
