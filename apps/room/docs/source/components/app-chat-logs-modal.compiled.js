OB = (() => {
  class t {
    constructor(e) {
      ((this.appService = e),
        (this.logDates = []),
        (this.showLogs = !1),
        (this.msgs = []),
        (this.loading = !0),
        (this.logId = null),
        (this.date = null),
        (this.inputTxt = ''),
        (this.searchTxt = ''));
    }
    ngOnInit() {
      (this.loadLogs(),
        this.appService.guiEventBus.subscribe('doChatLogsModal', () => {
          ((this.showLogs = !1), this.clearInput());
        }));
    }
    toggleShowLogs(e) {
      var i = this;
      return I(function* () {
        if (((i.showLogs = !i.showLogs), e)) {
          ((i.logId = e._id), (i.date = e.updated));
          const o = yield i.appService.invokeServerCommand('getArchiveLog', { id: i.logId });
          (console.log('resp: ', o), (i.msgs = o.data.logArr), (i.loading = !1));
        } else ((i.msgs = []), (i.loading = !0), i.clearInput());
      })();
    }
    searchLogs() {
      if (!this.inputTxt || 0 === this.inputTxt.length) return ((this.searchTxt = ''), !1);
      this.searchTxt = this.inputTxt;
    }
    onInputChange(e) {
      if (!this.inputTxt || 0 === this.inputTxt.length) return ((this.searchTxt = ''), !1);
      13 === e.keyCode && (e.preventDefault(), (this.searchTxt = this.inputTxt));
    }
    clearInput() {
      ((this.inputTxt = ''), (this.searchTxt = ''));
    }
    loadLogs() {
      var e = this;
      I(function* () {
        let i = yield e.appService.invokeServerCommand('getArchiveList', { type: 'chat' });
        (console.log('resp: ', i), (e.logDates = i.data));
      })();
    }
    unarchiveLog() {
      bootbox.confirm('Are you sure you want to unarchive (restore) this chatlog?', (e) => {
        e &&
          (this.appService.sendServerAdminCommand('unarchiveLogs', {
            type: 'chat',
            roomID: this.appService.globals.sessData.roomID,
            archiveID: this.logId
          }),
          (this.showLogs = !this.showLogs),
          this.loadLogs(),
          bootbox.alert('Chatlog restored'));
      });
    }
    downloadLog() {
      var e = this;
      return I(function* () {
        const i = [],
          o = {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          },
          s = e.msgs;
        for (const c of s) {
          const h =
            new Date(c.t).toLocaleTimeString('en-us', o) + ' [' + c.n + ']: ' + c.txt + '\r\n';
          i.push(h);
        }
        const r = new Blob(i, { type: 'text/plain;charset=utf-8' }),
          a = window.URL.createObjectURL(r),
          l = document.createElement('a');
        ((l.href = a),
          (l.download = `ChatLog_${e.date}.txt`),
          (l.style.display = 'none'),
          document.body.appendChild(l),
          l.click(),
          document.body.removeChild(l));
      })();
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-chat-logs-modal']],
        decls: 15,
        vars: 4,
        consts: [
          [
            'id',
            'chat-logs-modal',
            'tabIndex',
            '-1',
            'role',
            'dialog',
            'aria-labelledby',
            'chat-logs-modal',
            'aria-hidden',
            'true',
            1,
            'modal',
            'fade'
          ],
          ['role', 'document', 1, 'modal-dialog'],
          [1, 'modal-content'],
          [1, 'modal-header'],
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
          [1, 'text-center', 'my-4'],
          [1, 'w-100'],
          [1, 'modal-footer', 'text-center'],
          ['type', 'button', 'data-bs-dismiss', 'modal', 1, 'btn', 'btn-secondary'],
          ['type', 'button', 1, 'btn', 'btn-primary', 'my-2', 3, 'click'],
          [1, 'list-group'],
          [1, 'mt-2'],
          [1, 'list-group-item', 'list-group-item-action'],
          [1, 'list-group-item', 'list-group-item-action', 3, 'click'],
          [1, 'fw-bold'],
          [1, 'ml-2', 'fas', 'fa-spinner', 'fa-spin'],
          [1, 'log-header-container', 'bg-secondary', 'text-white'],
          [1, 'd-flex', 'align-items-center', 'justify-content-between', 'my-1', 'log-header'],
          ['type', 'button', 1, 'btn', 'btn-light', 'me-2', 3, 'click'],
          [1, 'fas', 'fa-arrow-left'],
          [1, 'flex-fill'],
          [1, 'input-group'],
          [
            'type',
            'text',
            'id',
            'search-term',
            'aria-describedby',
            'search-addon',
            'placeholder',
            'Enter search term',
            1,
            'form-control',
            3,
            'ngModelChange',
            'keyup',
            'ngModel'
          ],
          ['id', 'search-addon', 1, 'input-group-text', 'btn', 'btn-ligth'],
          ['id', 'search-addon', 1, 'input-group-text', 'btn', 'btn-ligth', 3, 'click'],
          [1, 'fas', 'fa-search'],
          [1, 'log-body'],
          [1, 'my-2'],
          ['type', 'button', 1, 'btn', 'btn-light', 'btn-sm', 3, 'click'],
          [1, 'fas', 'fa-download'],
          ['type', 'button', 1, 'btn', 'btn-secondary', 'btn-sm', 'mx-1'],
          [1, 'log-messages'],
          [1, 'fas', 'fa-times'],
          ['type', 'button', 1, 'btn', 'btn-secondary', 'btn-sm', 'mx-1', 3, 'click'],
          [1, 'fas', 'fa-box-open'],
          [3, 'msg', 'logType', 'prevD'],
          [1, 'mt-3']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 0)(1, 'div', 1)(2, 'div', 2)(3, 'div', 3)(4, 'h5'),
            v(5, ' Chat Logs'),
            H(6, hxe, 3, 4, 'span'),
            u(),
            T(7, 'button', 4),
            u(),
            d(8, 'div', 5),
            H(9, mxe, 7, 1, 'div')(10, gxe, 4, 0, 'div', 6)(11, Cxe, 21, 7, 'div', 7),
            u(),
            d(12, 'div', 8)(13, 'button', 9),
            v(14, ' Close '),
            u()()()()()),
            2 & i &&
              (m(6),
              O(6, o.showLogs && o.date ? 6 : -1),
              m(3),
              O(9, o.showLogs ? -1 : 9),
              m(),
              O(10, o.showLogs && o.loading ? 10 : -1),
              m(),
              O(11, o.showLogs && !o.loading ? 11 : -1)));
        },
        dependencies: [ai, ti, Yn, pu, os, IB],
        styles: [
          '.list-group[_ngcontent-%COMP%]{text-align:center;width:100%;max-width:600px;margin:0 auto}.list-group-item[_ngcontent-%COMP%]{margin-bottom:1px}.list-group-item[_ngcontent-%COMP%]:hover{cursor:pointer}.log-header[_ngcontent-%COMP%], .log-body[_ngcontent-%COMP%]{width:100%;margin:0 auto}.log-header-container[_ngcontent-%COMP%]{padding:10px}.log-body[_ngcontent-%COMP%]{text-align:center}.modal-dialog[_ngcontent-%COMP%]{overflow-y:initial!important}.log-messages[_ngcontent-%COMP%]{max-height:calc(100vh - 350px);overflow-y:auto}.modal-dialog[_ngcontent-%COMP%]{width:100%;max-width:1000px}'
        ]
      });
    }
  }
  return t;
})();
