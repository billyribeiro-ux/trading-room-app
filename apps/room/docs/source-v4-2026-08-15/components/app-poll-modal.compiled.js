jTe = (() => {
  class t {
    constructor(e) {
      ((this.appService = e),
        (this.mode = 'setup'),
        (this.pollChoices = []),
        (this.pollChoicesTotals = {}),
        (this.textResponses = ''),
        (this.pollChoice = ''),
        (this.pieChartInit = !1),
        (this.pieData = []),
        (this.total = 0),
        (this.answered = !1),
        (this.senderUID = null),
        (this.eventsWired = !1),
        (this.anonymousPoll = !1),
        (this.isMinimized = !1),
        (this.isMaximized = !1),
        (this.dragInitialized = !1),
        (this.wasMaximizedBeforeMin = !1),
        (this.preMaxBounds = { width: '', height: '', top: '', left: '' }),
        (this.savePollToStorage = function () {
          (this.savedPolls || (P('loading stored polls'), this.loadPollsFromStorage()),
            this.savedPolls.push({ q: this.pollQuestion, choices: this.pollChoices.slice(0) }),
            this.appService.sendServerCommand('savedSessionPolls', {
              savedSessionPolls: JSON.stringify(this.savedPolls)
            }),
            bootbox.alert('Poll Saved to Pre-Canned polls...'));
        }));
    }
    ngOnInit() {
      (this.appService.guiEventBus.subscribe('doPollModal', (e) => {
        ((this.senderUID = e.senderUID),
          (this.mode = e.mode),
          (this.pieChartInit = !1),
          (this.pollQuestion = null),
          (this.pollChoices = []),
          (this.pollChoicesTotals = {}),
          (this.textResponses = ''),
          (this.pieData = []),
          (this.total = 0),
          (this.answered = !1),
          (this.anonymousPoll = !1),
          $('#responsesTxt').empty(),
          'setup' == this.mode
            ? this.loadPollsFromStorage()
            : 'answer' == this.mode &&
              (console.log('mode=answer data:', e),
              (this.pollQuestion = e.data.q),
              (this.pollChoices = e.data.choices),
              this.appService.guiEventBus.emit('pollActive', !0)),
          this.eventsWired ||
            ((this.eventsWired = !0),
            this.appService.appEventBus.subscribe('gotPollAnswer', (i) => {
              if ((P('pollAnswer data:' + JSON.stringify(i)), i)) {
                (this.total++,
                  this.pieChartInit ||
                    ((this.pieChartInit = !0),
                    $('#pollPieChart').show(),
                    $.plot('#pollPieChart', this.pieData, EB)));
                var o = i.a,
                  s = this.pollChoices[o];
                ((this.textResponses +=
                  this.total + ': [' + i.senderNick + ' - ' + i.x + ' ]: ' + s + '\n'),
                  $('#responsesTxt').append(this.total + ': [' + i.senderNick + ']: ' + s + '\n'),
                  this.pollChoicesTotals[o]
                    ? this.pollChoicesTotals[o]++
                    : (this.pollChoicesTotals[o] = 1),
                  console.log('data.a: ' + i.a),
                  console.log('pollChoicesTotals: ', this.pollChoicesTotals),
                  this.calcPieData());
              }
            }),
            this.appService.appEventBus.subscribe('pollDone', () => {
              this.hidePanel();
            })),
          this.showPanel());
      }),
        this.appService.guiEventBus.subscribe('pollRestore', () => {
          this.isMinimized && this.restorePanel();
        }));
    }
    ngOnDestroy() {
      P('destroyong the view');
    }
    closeModal() {
      let e = this;
      (console.log(
        'closModal senderUID:' +
          this.senderUID +
          '. this.globals.user.userXrefID:' +
          this.appService.globals.user.userXrefID
      ),
        'setup' != this.mode && this.senderUID == this.appService.globals.user.userXrefID
          ? bootbox.confirm('Closing this window, will end the poll. Are you sure?', function (i) {
              i && (e.appService.sendServerAdminCommand('pollDone', {}), e.hidePanel());
            })
          : this.hidePanel());
    }
    showPanel() {
      ((this.isMinimized = !1), (this.isMaximized = !1), (this.wasMaximizedBeforeMin = !1));
      const e = $('#pollModalCompHolder'),
        i = $('.wrapper').width(),
        o = $('.wrapper').height();
      (e.css({ width: '580px', height: '553px' }),
        e.show(),
        e.css({ left: (i - e.outerWidth()) / 2 + 'px', top: (o - e.outerHeight()) / 2 + 'px' }),
        this.dragInitialized || ((this.dragInitialized = !0), this.initDrag()));
    }
    hidePanel() {
      ($('#pollModalCompHolder').hide(),
        (this.isMinimized = !1),
        (this.isMaximized = !1),
        this.appService.guiEventBus.emit('pollMinimized', !1),
        this.appService.guiEventBus.emit('pollActive', !1));
    }
    initDrag() {
      $('#pollModalCompHolder')
        .draggable({
          appendTo: 'body',
          containment: '.wrapper',
          handle: '#pollPanelTitlebar',
          cursor: 'move',
          scroll: !1,
          snap: !0,
          cancel: 'input, textarea, button, select, .poll-panel-controls'
        })
        .resizable({
          handles: 'n, e, s, w, ne, se, sw, nw',
          maxWidth: $('.wrapper').width(),
          maxHeight: $('.wrapper').height(),
          minWidth: 580,
          minHeight: 553
        });
    }
    toggleMinimize() {
      ((this.isMinimized = !this.isMinimized),
        this.isMinimized
          ? ((this.wasMaximizedBeforeMin = this.isMaximized),
            $('#pollModalCompHolder').hide(),
            this.appService.guiEventBus.emit('pollMinimized', !0))
          : this.restorePanel());
    }
    restorePanel() {
      this.isMinimized = !1;
      const e = $('#pollModalCompHolder');
      if ((e.show(), this.wasMaximizedBeforeMin)) {
        this.isMaximized = !0;
        const i = $('.wrapper');
        e.css({
          width: i.outerWidth() + 'px',
          height: i.outerHeight() + 'px',
          top: i.offset().top + 'px',
          left: i.offset().left + 'px'
        });
      }
      ((this.wasMaximizedBeforeMin = !1),
        this.appService.guiEventBus.emit('pollMinimized', !1),
        'results' == this.mode && this.total > 0 && setTimeout(() => this.calcPieData(), 100));
    }
    toggleMaximize() {
      const e = $('#pollModalCompHolder');
      if (this.isMaximized)
        (e.css({
          width: this.preMaxBounds.width,
          height: this.preMaxBounds.height,
          top: this.preMaxBounds.top,
          left: this.preMaxBounds.left
        }),
          (this.isMaximized = !1));
      else {
        ((this.preMaxBounds = {
          width: e.css('width'),
          height: e.css('height'),
          top: e.css('top'),
          left: e.css('left')
        }),
          this.isMinimized && (this.isMinimized = !1));
        const i = $('.wrapper');
        (e.css({
          width: i.outerWidth() + 'px',
          height: i.outerHeight() + 'px',
          top: i.offset().top + 'px',
          left: i.offset().left + 'px'
        }),
          (this.isMaximized = !0),
          'results' == this.mode && this.total > 0 && setTimeout(() => this.calcPieData(), 100));
      }
    }
    calcPieData() {
      this.pieData = [];
      for (var e = 0; e < this.pollChoices.length; e++)
        (this.pieData.push({
          data: ((this.pollChoicesTotals[e] || 0) / this.total) * 100,
          label: this.pollChoices[e]
        }),
          console.log('calcPieData pie chart now:', this.pieData));
      $.plot('#pollPieChart', this.pieData, EB);
    }
    postResults() {
      for (
        var e = 'Poll Results\nQuestion: ' + this.pollQuestion + '\n', i = 0;
        i < this.pollChoices.length;
        i++
      ) {
        var o = (this.pollChoicesTotals[i] / this.total) * 100;
        (o || (o = 0), (o = Math.round(o)), (e += this.pollChoices[i] + ' - ' + o + '%\n'));
      }
      (this.appService.sendServerCommand('alertMsg', {
        txt: e,
        n: this.appService.globals.user.name,
        sendTxt: !1
      }),
        this.closeModal());
    }
    addChoice() {
      this.pollChoice && (this.pollChoices.push('' + this.pollChoice), (this.pollChoice = ''));
    }
    delChoice(e) {
      (P('delChoice idx:' + e + '. choices: ' + JSON.stringify(this.pollChoices)),
        this.pollChoices.splice(e, 1));
    }
    sendPoll() {
      let e = this;
      bootbox.confirm('Are you sure you want to send this poll?', function (i) {
        i &&
          setTimeout(() => {
            (e.appService.sendServerAdminCommand('sendPoll', {
              q: e.pollQuestion,
              choices: e.pollChoices
            }),
              (e.pollChoicesTotals = new Array(e.pollChoices.length)),
              (e.mode = 'results'),
              e.appService.guiEventBus.emit('pollActive', !0));
          });
      });
    }
    sendAnswer(e) {
      (this.answered ||
        ((this.answered = !0),
        this.appService.sendServerCommand('sendPollAnswer', { a: e }),
        (this.pollQuestion = this.pollQuestion.q),
        (this.mode = 'done')),
        this.closeModal());
    }
    loadPollsFromLS() {
      try {
        return JSON.parse(this.appService.localstorage.get('savedPolls', []));
      } catch {
        return [];
      }
    }
    loadPollsFromStorage() {
      let e = this.loadPollsFromLS() || [];
      if (e && e.length > 0)
        (this.appService.sendServerCommand('savedSessionPolls', {
          savedSessionPolls: JSON.stringify(e)
        }),
          (this.savedPolls = e),
          this.appService.localstorage.deleteKey('savedPolls'));
      else
        try {
          let i = null;
          (this.appService.globals.sessData.savedSessionPolls &&
            (i = JSON.parse(this.appService.globals.sessData.savedSessionPolls)),
            (this.savedPolls = i || []));
        } catch {
          this.savedPolls = [];
        }
    }
    deleteSavedPoll(e) {
      if (!this.savedPolls) return;
      let i = this;
      (P('delete saved poll idx'),
        bootbox.confirm(
          'Are you sure you want to delete poll "' + this.savedPolls[e].q + '" ?',
          function (s) {
            s &&
              (i.savedPolls.splice(e, 1),
              i.appService.sendServerCommand('savedSessionPolls', {
                savedSessionPolls: JSON.stringify(i.savedPolls)
              }));
          }
        ));
    }
    savePollResults() {
      for (
        var e = 'Poll Results\nQuestion: ' + this.pollQuestion + '\n', i = 0;
        i < this.pollChoices.length;
        i++
      ) {
        var o = (this.pollChoicesTotals[i] / this.total) * 100;
        (o || (o = 0), (o = Math.round(o)), (e += this.pollChoices[i] + ' - ' + o + '%\n'));
      }
      e += '\n\nUser Responses:\n' + this.textResponses;
      var s = 'Poll Results ',
        r = new Blob([e], { type: 'text/plain' });
      ((s += new Date().toDateString()), kTe.saveAs(r, s + '.txt', !0));
    }
    loadSavedPoll(e) {
      if (this.savedPolls) {
        var i = this.savedPolls[e];
        ((this.pollChoices = i.choices.slice(0)),
          (this.pollQuestion = i.q),
          $('#sendpolltab').tab('show'));
      }
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt));
      };
    }
    static {
      this.ɵcmp = ut({
        type: t,
        selectors: [['app-poll-modal']],
        decls: 14,
        vars: 6,
        consts: [
          ['id', 'pollPanelTitlebar', 1, 'poll-panel-titlebar'],
          [1, 'poll-panel-title'],
          [1, 'poll-panel-controls'],
          ['type', 'button', 'title', 'Minimize', 1, 'poll-panel-btn', 3, 'click'],
          [1, 'fa', 'fa-window-minimize'],
          ['type', 'button', 'title', 'Maximize', 1, 'poll-panel-btn', 3, 'click'],
          [1, 'fa', 3, 'ngClass'],
          [
            'type',
            'button',
            'aria-label',
            'Close',
            'title',
            'Close',
            1,
            'poll-panel-btn',
            'poll-panel-btn-close',
            3,
            'click'
          ],
          [1, 'fa', 'fa-times'],
          [1, 'poll-panel-body'],
          [1, 'row'],
          [1, 'row', 'w-100', 2, 'text-align', 'center'],
          ['id', 'nav-tab', 'role', 'tablist', 1, 'nav', 'nav-tabs'],
          [1, 'nav-item'],
          [
            'id',
            'sendpolltab',
            'aria-controls',
            'sendpoll',
            'data-bs-target',
            '#sendpoll',
            'role',
            'tab',
            'data-bs-toggle',
            'tab',
            'aria-selected',
            'true',
            1,
            'nav-link',
            'active'
          ],
          [
            'ria-controls',
            'savedPolls',
            'role',
            'tab',
            'data-bs-target',
            '#savedPolls',
            'data-bs-toggle',
            'tab',
            'aria-selected',
            'false',
            1,
            'nav-link'
          ],
          [1, 'tab-content', 'w-100', 'p-2'],
          ['role', 'tabpanel', 'id', 'sendpoll', 1, 'tab-pane', 'active'],
          [1, 'p-2'],
          [1, 'label', 'label-warning'],
          [
            'type',
            'text',
            'id',
            'pollQuestionTxt',
            'placeholder',
            'Main poll question (i.e. Where do you think the market is going?)',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [1, 'input-group'],
          [
            'type',
            'text',
            'id',
            'pollChoiceTxt',
            'placeholder',
            'Enter a choice (i.e. Up, Down, Sideways)',
            1,
            'form-control',
            3,
            'ngModelChange',
            'keyup.enter',
            'ngModel'
          ],
          [1, 'input-group-btn'],
          ['type', 'button', 1, 'btn', 'btn-outline-light', 3, 'click'],
          ['aria-hidden', 'true', 1, 'fa', 'fa-plus-circle'],
          [1, 'anonymous-poll-container'],
          [
            'type',
            'checkbox',
            'name',
            'anonymous-poll',
            'id',
            'anonymous-poll',
            'title',
            'Anonymous Poll',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel',
            'ngModelOptions'
          ],
          ['for', 'anonymous-poll', 1, 'form-check-label'],
          [1, 'poll-panel-footer'],
          [
            'type',
            'button',
            1,
            'btn',
            'btn-outline-light',
            'pull-right',
            2,
            'text-align',
            'center',
            3,
            'click'
          ],
          ['aria-hidden', 'true', 1, 'fa', 'fa-floppy-o'],
          [
            'type',
            'button',
            1,
            'btn',
            'btn-success',
            'centered',
            'float-right',
            2,
            'text-align',
            'center',
            3,
            'click'
          ],
          ['role', 'tabpanel', 'id', 'savedPolls', 1, 'tab-pane'],
          [1, 'list-group'],
          [1, 'list-group-item'],
          ['type', 'button', 1, 'btn', 'btn-link', 'pull-right', 'btn-default', 3, 'click'],
          ['aria-hidden', 'true', 1, 'fa', 'fa-minus-circle'],
          ['clear', 'both'],
          [1, 'float-right'],
          [1, 'btn', 'btn-default', 'btn-sm', 'mr-2', 3, 'click'],
          [1, 'fas', 'fa-trash'],
          [1, 'btn', 'btn-primary', 'btn-sm', 3, 'click'],
          [1, 'p-2', 2, 'text-align', 'center'],
          [2, 'text-align', 'left'],
          [
            'type',
            'button',
            1,
            'btn',
            'btn-primary',
            'float-right',
            'btn-sm',
            2,
            'color',
            'white',
            3,
            'click'
          ],
          [1, 'p-2', 'w-100', 2, 'text-align', 'center'],
          [
            'id',
            'pollPieChart',
            2,
            'display',
            'none',
            'width',
            '100%',
            'height',
            '300px',
            'text-align',
            'center'
          ],
          ['type', 'button', 1, 'btn', 'btn-warning', 'float-left', 2, 'text-align', 'center'],
          ['src', '../../assets/images/ajax-loader.gif'],
          [2, 'margin', '10px', 'text-align', 'center'],
          [
            'id',
            'responsesTxt',
            'rows',
            '10',
            'maxlength',
            '500',
            'readonly',
            'readonly',
            1,
            'form-control',
            2,
            'width',
            '100%'
          ],
          [
            'type',
            'button',
            1,
            'btn',
            'btn-warning',
            'float-left',
            2,
            'text-align',
            'center',
            3,
            'click'
          ]
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 0)(1, 'span', 1),
            v(2, 'Polls'),
            u(),
            d(3, 'div', 2)(4, 'button', 3),
            x('click', function () {
              return o.toggleMinimize();
            }),
            T(5, 'i', 4),
            u(),
            d(6, 'button', 5),
            x('click', function () {
              return o.toggleMaximize();
            }),
            T(7, 'i', 6),
            u(),
            d(8, 'button', 7),
            x('click', function () {
              return o.closeModal();
            }),
            T(9, 'i', 8),
            u()()(),
            d(10, 'div', 9),
            H(11, RTe, 51, 5, 'div', 10)(12, OTe, 8, 1, 'div', 10)(13, UTe, 10, 5, 'div', 11),
            u()),
            2 & i &&
              (m(7),
              z('ngClass', o.isMaximized ? 'fa-window-restore' : 'fa-window-maximize'),
              m(3),
              Lo('display', o.isMinimized ? 'none' : 'block'),
              m(),
              O(11, 'setup' == o.mode ? 11 : -1),
              m(),
              O(12, 'answer' == o.mode ? 12 : -1),
              m(),
              O(13, 'results' == o.mode ? 13 : -1)));
        },
        dependencies: [Di, ai, Ss, ti, Yn],
        styles: [
          '.poll-panel-titlebar[_ngcontent-%COMP%]{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background-color:#2c2c2c;border-bottom:1px solid #555;cursor:move;user-select:none;-webkit-user-select:none}.poll-panel-title[_ngcontent-%COMP%]{font-weight:700;font-size:14px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.poll-panel-controls[_ngcontent-%COMP%]{display:flex;gap:6px;flex-shrink:0}.poll-panel-btn[_ngcontent-%COMP%]{background:transparent;border:1px solid #666;color:#ccc;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:3px;cursor:pointer;font-size:12px;padding:0}.poll-panel-btn[_ngcontent-%COMP%]:hover{background-color:#444;color:#fff}.poll-panel-btn-close[_ngcontent-%COMP%]:hover{background-color:#c0392b;color:#fff}.poll-panel-body[_ngcontent-%COMP%]{padding:10px;overflow-x:hidden;overflow-y:auto;height:calc(100% - 40px);color:#ddd}.poll-panel-footer[_ngcontent-%COMP%]{display:flex;justify-content:flex-end;gap:8px;padding-top:10px}#sendpoll[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%]{font-size:20px}.nav-tabs[_ngcontent-%COMP%]{width:100%;margin:0;display:flex;align-items:center;justify-content:center}#responsesTxt[_ngcontent-%COMP%]{max-height:300px;overflow-y:auto}.anonymous-poll-container[_ngcontent-%COMP%]{margin:8px 0 8px 20px}.form-check-input[_ngcontent-%COMP%]{-webkit-appearance:none;-o-appearance:none;appearance:none;height:20px;width:20px;transition:all .15s ease-out 0s;background-color:var(--light-gray);border:none;color:var(--white);cursor:pointer;display:inline-block;margin-right:.5rem;outline:none;position:relative;z-index:1000;border-radius:50%;margin-top:0}.form-check-input[_ngcontent-%COMP%]:checked{background-color:var(--checkbox-bg-color)}.form-check-label[_ngcontent-%COMP%]:hover{cursor:pointer;opacity:.85}.input-group-btn[_ngcontent-%COMP%]   .btn[_ngcontent-%COMP%]{border-radius:0 6px 6px 0}.nav-link.active[_ngcontent-%COMP%], .nav-link.active[_ngcontent-%COMP%]:hover{color:#000!important}'
        ]
      });
    }
  }
  return t;
})();
