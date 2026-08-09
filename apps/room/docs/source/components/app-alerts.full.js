const w2e = ['searchTermTxtAlerts'];
function T2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 21),
      x('click', function () {
        return (D(e), E(g().openAlertFilterModal()));
      }),
      v(1, ' filtered'),
      u());
  }
}
function D2e(t, n) {
  1 & t && (d(0, 'span', 9), T(1, 'i', 22), v(2, ' DND'), u());
}
function E2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 11)(1, 'a', 23),
      x('click', function () {
        return (D(e), E(g().doPollUI()));
      }),
      T(2, 'i', 24),
      v(3, ' Poll'),
      u()(),
      d(4, 'li', 25)(5, 'a', 23),
      x('click', function () {
        return (D(e), E(g().doPostAlertUI()));
      }),
      T(6, 'i', 26),
      v(7, ' Post Alert'),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(),
      Et('poll-active-blink', e.pollIsActive && !e.pollIsMinimized)(
        'poll-active-indicator',
        e.pollIsMinimized
      ));
  }
}
function k2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 11)(1, 'a', 27),
      x('click', function () {
        return (D(e), E(g().doPollUI()));
      }),
      T(2, 'i', 24),
      v(3, ' Poll'),
      u()());
  }
}
function x2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 36)(1, 'input', 40),
      x('change', function () {
        return (D(e), E(g(3).toggleInlineAlertEntry()));
      }),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(3);
        return (He(s.showAlertsEntry, o) || (s.showAlertsEntry = o), E(o));
      }),
      u(),
      d(2, 'label', 41),
      v(3, ' Show inline alert entry '),
      u()());
  }
  if (2 & t) {
    const e = g(3);
    (m(), je('ngModel', e.showAlertsEntry));
  }
}
function M2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 42),
      x('click', function () {
        return (D(e), E(g(3).detachAlerts()));
      }),
      T(1, 'i', 43),
      v(2, ' Detach Alerts'),
      u());
  }
}
function A2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 44),
      x('click', function () {
        return (D(e), E(g(3).openAlertFilterModal()));
      }),
      T(1, 'i', 45),
      v(2, ' Filter alerts'),
      u());
  }
}
function P2e(t, n) {
  1 & t && (d(0, 'button', 39), T(1, 'i', 46), v(2, ' Advanced Search'), u());
}
function R2e(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 28)(1, 'div', 35),
      H(2, x2e, 4, 1, 'div', 36)(3, M2e, 3, 0, 'button', 37),
      u(),
      d(4, 'div'),
      H(5, A2e, 3, 0, 'button', 38)(6, P2e, 3, 0, 'button', 39),
      u()()),
    2 & t)
  ) {
    const e = g(2);
    (m(2),
      O(2, e.isPresenter ? 2 : -1),
      m(),
      O(3, e.appService.globals.chatOnlyMode ? -1 : 3),
      m(2),
      O(5, e.appService.globals.sessData.modAlertFilterList ? 5 : -1),
      m(),
      O(
        6,
        e.appService.globals.sessData.advancedSearchAlerts &&
          '56ba547185ae93560d186ea8' == e.appService.globals.sessData.ownerdID
          ? 6
          : -1
      ));
  }
}
function I2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 50),
      x('click', function () {
        return (D(e), E(g(3).archiveOptions()));
      }),
      T(1, 'i', 51),
      u());
  }
}
function O2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 47),
      x('click', function () {
        return (D(e), g(2), E(It(19).downloadLog('alerts')));
      }),
      T(1, 'i', 48),
      u(),
      H(2, I2e, 2, 0, 'div', 49));
  }
  if (2 & t) {
    const e = g(2);
    (m(2),
      O(2, e.appService.globals.isPresenter && !e.appService.globals.isLimitedPresenter ? 2 : -1));
  }
}
function N2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 18),
      H(1, R2e, 7, 4, 'div', 28),
      d(2, 'form', 29),
      x('change', function () {
        D(e);
        const o = It(7);
        return E(g().searchTermChanged(o.value));
      })('keydown.enter', function (o) {
        D(e);
        const s = It(7),
          r = g();
        return (o.preventDefault(), E(r.onEnterSearchChat(s.value)));
      }),
      d(3, 'div')(4, 'div', 30)(5, 'div', 31),
      T(6, 'input', 32, 1),
      d(8, 'span', 33),
      x('click', function () {
        D(e);
        const o = It(7),
          s = g();
        return ((o.value = ''), E(s.onEnterSearchChat('')));
      }),
      T(9, 'i', 34),
      u(),
      H(10, O2e, 3, 1),
      u()()()()());
  }
  if (2 & t) {
    const e = g();
    (m(),
      O(1, e.showAlertsToolbarExtended ? 1 : -1),
      m(9),
      O(10, e.showAlertsToolbarExtended ? 10 : -1));
  }
}
function L2e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 20)(1, 'div', 52, 2)(3, 'textarea', 53),
      x('keyup', function (o) {
        return (D(e), E(g().onKey(o)));
      })('paste', function (o) {
        return (D(e), E(g().onImagePaste(o)));
      }),
      u()()());
  }
}
B2e = (() => {
  class t {
    constructor(e, i, o, s) {
      ((this.appService = e),
        (this.soundEffectsService = i),
        (this.alertService = o),
        (this.elementRef = s),
        (this.msgs = []),
        (this.isPresenter =
          this.appService.globals.user.isPresenter || this.appService.globals.user.hasAdminChat),
        (this.showImageUpload = !1),
        (this.isChatSearching = !1),
        (this.chatSearchTerm = ''),
        (this.textAreaVal = ''),
        (this.displayMode = 'c'),
        (this.showAlertsToolbar = !1),
        (this.showAlertsToolbarExtended = !1),
        (this.showAlertsEntry = !1),
        (this.pollIsMinimized = !1),
        (this.pollIsActive = !1));
    }
    ngOnInit() {
      this.appService.globals.doFilteredAlerts =
        Object.keys(this.appService.globals.user.alertFilterFor).length > 0;
      const e = this.appService.localstorage.getObject('showAlertsEntry');
      (e && (this.showAlertsEntry = e.showAlertsEntry),
        this.loadAlertsMode(),
        this.appService.appEventBus.subscribe('appDataReady', (i) => {
          this.processSessData();
        }),
        this.appService.appEventBus.emit('sendAppData'),
        this.appService.appEventBus.emit('sendAlertLog'),
        this.appService.guiEventBus.subscribe('pollMinimized', (i) => {
          this.pollIsMinimized = i;
        }),
        this.appService.guiEventBus.subscribe('pollActive', (i) => {
          this.pollIsActive = i;
        }));
    }
    ngAfterViewInit() {
      (P('alerts comp after view init...'),
        this.appService.guiEventBus.subscribe('switchAlertsDisplayMode', (e) => {
          this.setOption(e);
        }),
        this.appService.guiEventBus.emit('scrollAlertLogToBottom', { force: !0 }),
        this.appService.appEventBus.subscribe('alertMsg', (e) => {
          if (
            !this.appService.globals.preferences.doNotDisturbOn &&
            (!e.nonTradeAlert &&
              this.appService.globals.preferences.alertSoundOn &&
              this.soundEffectsService.cash.play(),
            e.nonTradeAlert &&
              this.appService.globals.preferences.nonTradeSound &&
              this.soundEffectsService.nonTradeAlert.play(),
            this.appService.globals.preferences.alertPopup)
          ) {
            const o = `Alert from @${e.n}`;
            (this.alertService.warning(e.txt, o, {
              timeOut: this.appService.globals.preferences?.longerAlertPopup ? 1e4 : 5e3,
              enableHtml: !0
            }),
              window.Notification &&
                Notification.requestPermission()
                  .then((s) => {
                    if ('granted' == s || 'default' == s) {
                      let a = e.pic || 'https://secure.gravatar.com/avatar/' + e.avt + '?d=mm&s=50';
                      new Notification(o, { body: this.decodeHtmlEntities(e.txt), icon: a });
                    } else console.log('User blocked notifications.');
                  })
                  .catch(function (s) {
                    console.error(s);
                  }));
          }
        }),
        this.appService.guiEventBus.emit('scrollAlertLogToBottom', { force: !0 }),
        this.elementRef.nativeElement
          ?.querySelector('#textAreaAlertTxt')
          ?.addEventListener('input', this.onAutoExpand.bind(this)));
    }
    onAutoExpand(e) {
      if ('textareaalerttxt' !== e.target.id.toLowerCase()) return !1;
      this.autoExpand(e.target);
    }
    autoExpand(e) {
      e.style.height = '0';
      const i = window.getComputedStyle(e),
        o = e.scrollHeight + 'px';
      (i.getPropertyValue('height') !== o && (e.style.height = o),
        '' === e.value.trim() && (e.style.height = '23px'));
    }
    processSessData() {
      (P('Alert Component, processing logged in data..'),
        (this.isPresenter = this.appService.globals.user.isPresenter));
    }
    loadAlertsMode() {
      if (this.appService.globals.sessData.altChatRender)
        ((this.displayMode = 'c'), this.appService.setPreference('alertsMode', this.displayMode));
      else {
        const e = this.appService.getPreference('alertsMode');
        (e && (this.displayMode = e),
          this.appService.setPreference('alertsMode', this.displayMode));
      }
    }
    toggleInlineAlertEntry() {
      (this.appService.localstorage.setObject('showAlertsEntry', {
        showAlertsEntry: this.showAlertsEntry
      }),
        this.appService.guiEventBus.emit('scrollAlertLogToBottom'));
    }
    onKey(e) {
      if (13 == e.keyCode) {
        e.preventDefault();
        const i = $('#textAreaAlertTxt');
        if (e.shiftKey) i.val(i.val());
        else {
          if (!e.altKey)
            return (
              i.val().trim() && this.appService.appEventBus.emit('inlineAlertEntry', i.val()),
              i.val(''),
              i.height('23px'),
              !1
            );
          i.val(i.val() + '\n');
        }
      }
    }
    onImagePaste(e) {
      const i = $('#textAreaAlertTxt'),
        o = i.val();
      (this.appService.appEventBus.emit('inlineAlertEntryImage', { event: e, alertTxt: o }),
        i.val(''),
        i.height('23px'));
    }
    toggleAlertsToolbar() {
      (this.showAlertsToolbar && !this.showAlertsToolbarExtended
        ? (this.showAlertsToolbarExtended = !0)
        : ((this.showAlertsToolbar = !this.showAlertsToolbar),
          this.showAlertsToolbar && (this.showAlertsToolbarExtended = !0)),
        this.appService.guiEventBus.emit('scrollAlertLogToBottom'));
    }
    toggleAlertsToolbarSearchOnly() {
      ((this.showAlertsToolbar && this.showAlertsToolbarExtended) ||
        (this.showAlertsToolbar = !this.showAlertsToolbar),
        (this.showAlertsToolbarExtended = !1),
        this.showAlertsToolbar &&
          setTimeout(() => {
            this.searchTermTxtAlerts &&
              this.searchTermTxtAlerts.nativeElement &&
              this.searchTermTxtAlerts.nativeElement.focus();
          }, 100),
        this.appService.guiEventBus.emit('scrollAlertLogToBottom'));
    }
    archiveChatDate(e) {
      this.appService.globals.sessData.deleteAlertPW
        ? bootbox.prompt({
            title: 'Please enter the password to delete this alert:',
            value: '',
            callback: (i) => {
              i &&
                (i.trim() === this.appService.globals.sessData.deleteAlertPW
                  ? this.appService.sendServerAdminCommand('archiveLogs', {
                      type: 'alerts',
                      date: e,
                      channel: ''
                    })
                  : bootbox.alert('Wrong password!'));
            }
          })
        : this.appService.sendServerAdminCommand('archiveLogs', {
            type: 'alerts',
            date: e,
            channel: ''
          });
    }
    archiveOptions() {
      const e = this;
      bootbox.dialog({
        message:
          '\n      <div>\n        <div style="text-align: center;">\n          <label for="date-archive" class="form-label">You can either archive all alerts or select an older than date:</label>\n          <input type="date" id="date-archive-alerts">\n        </div>\n      </div>\n      ',
        title: 'Archive Alerts Messages',
        size: 'large',
        backdrop: !0,
        onEscape: !0,
        buttons: {
          cancel: {
            label: 'Close',
            className: 'btn btn-secondary',
            callback() {
              console.log('close archive alerts messages');
            }
          },
          search: {
            label: 'Delete Searched',
            className: 'btn btn-danger',
            callback() {
              e.chatSearchTerm
                ? bootbox.confirm(
                    'Are you sure you want to DELETE the searched results in chat for everyone?',
                    (o) => {
                      o && e.doSearchSubmit(!0);
                    }
                  )
                : bootbox.alert('Search term empty. abort');
            }
          },
          all: {
            label: 'Archive All',
            className: 'btn btn-warning',
            callback() {
              bootbox.confirm('Are you sure you want to archive the alerts for everyone?', (o) => {
                o && (console.log('success archive all'), e.archiveChatDate(new Date()));
              });
            }
          },
          dateRange: {
            label: 'Archive Older than Selected Date',
            className: 'btn btn-success',
            callback() {
              const o = new Date($('#date-archive-alerts').val());
              if (isNaN(o.getTime())) return (bootbox.alert('Please select a date.'), !1);
              bootbox.confirm(
                'Are you sure you want to archive the alerts older than selected date?',
                (s) => {
                  s && (console.log('archive date: ', o), e.archiveChatDate(o));
                }
              );
            }
          }
        }
      });
    }
    setOption(e) {
      (P(`ChatComp set mode to ${e}`),
        (this.displayMode = e),
        this.appService.setPreference('alertsMode', e));
    }
    onEnterSearchChat(e) {
      return (
        P('do search value:' + e),
        (this.chatSearchTerm = e),
        this.chatSearchTerm ? this.doSearchSubmit() : this.clearSearchTerm(),
        !1
      );
    }
    clearSearchTerm() {
      ((this.chatSearchTerm = ''),
        this.appService.guiEventBus.emit('setSearchTerm', {
          searchTerm: this.chatSearchTerm,
          type: 'alerts'
        }),
        (this.appService.globals.alertsSearchResults = []));
    }
    searchTermChanged(e) {
      e || this.clearSearchTerm();
    }
    doSearchSubmit(e = !1) {
      if (!this.chatSearchTerm) return;
      let i = { searchTerm: this.chatSearchTerm.replace('$', '\\$'), type: 'alerts', del: e };
      (this.appService.guiEventBus.emit('setSearchTerm', i),
        e && this.appService.globals.sessData.deleteAlertPW
          ? bootbox.prompt({
              title: 'Please enter the password to delete this alert:',
              value: '',
              callback: (o) => {
                o &&
                  (o.trim() === this.appService.globals.sessData.deleteAlertPW
                    ? this.appService.sendServerCommand('doChatLogSearch', i)
                    : bootbox.alert('Wrong password!'));
              }
            })
          : this.appService.sendServerCommand('doChatLogSearch', i));
    }
    doPostAlertUI() {
      this.appService.guiEventBus.emit('doAlertsModal');
    }
    doPollUI() {
      this.pollIsMinimized
        ? this.appService.guiEventBus.emit('pollRestore')
        : this.appService.guiEventBus.emit('doPollModal', {
            mode: 'setup',
            senderUID: this.appService.globals.user.userXrefID
          });
    }
    decodeHtmlEntities(e) {
      const i = document.createElement('textarea');
      return ((i.innerHTML = e), i.value);
    }
    openAlertFilterModal() {
      this.appService.guiEventBus.emit('doAlertFilterModal');
    }
    detachAlerts() {
      (this.appService.appEventBus.emit('detachChat'),
        bootbox.alert(
          'Chat/Alerts detached to a new browser window...You can reopen the chat in this window from the side menu.'
        ));
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(Ir), be(fo), be(Yt));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-alerts']],
        viewQuery: function (i, o) {
          if ((1 & i && Xt(w2e, 5), 2 & i)) {
            let s;
            yt((s = Ft())) && (o.searchTermTxtAlerts = s.first);
          }
        },
        decls: 21,
        vars: 9,
        consts: [
          ['roomscroller', ''],
          ['searchTermTxtAlerts', ''],
          ['alertsWidth', ''],
          [1, 'chat', 'd-flex', 'flex-column', 2, 'height', '100%'],
          [1, 'bs-component'],
          [1, 'navbar', 'navbar-expand-lg', 'navbar-light', 'chat-nav', 'p-1', 'alertHeader'],
          [1, 'navbar-brand', 'ml-1'],
          [1, 'fas', 'fa-bell', 'me-1'],
          [
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#alert-filter-modal',
            'title',
            'Alert Filter',
            1,
            'badge',
            'badge-danger',
            'ms-1',
            'filtered-text'
          ],
          [1, 'badge', 'badge-danger', 'ms-2'],
          [1, 'nav', 'ml-auto'],
          [1, 'nav-item', 'mx-2'],
          [1, 'nav-item', 'mx-1', 3, 'click'],
          ['title', 'Search', 1, 'nav-link', 'p-0'],
          [1, 'fas', 'fa-search'],
          [1, 'nav-item', 'dropdown', 'ml-2', 2, 'position', 'static', 3, 'click'],
          [
            'aria-haspopup',
            'true',
            'aria-expanded',
            'false',
            1,
            'nav-link',
            'dropdown-toggle',
            'p-0'
          ],
          ['title', 'Settings', 1, 'fas', 'fa-cog', 'chat-header-gear'],
          [1, 'shadow', 'p-2', 'w-100', 'alertsToolbar', 2, 'margin-top', '0px'],
          [
            'id',
            'chatScrollViewParentAlerts',
            2,
            'overflow-y',
            'scroll',
            'height',
            '100%',
            3,
            'logType',
            'displayMode',
            'isPresenter'
          ],
          [1, 'w-100', 'inline-alert-entry-field'],
          [
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#alert-filter-modal',
            'title',
            'Alert Filter',
            1,
            'badge',
            'badge-danger',
            'ms-1',
            'filtered-text',
            3,
            'click'
          ],
          [1, 'fas', 'fa-bell-slash'],
          [3, 'click'],
          [1, 'fas', 'fa-question-circle'],
          [1, 'nav-item', 'mr-2'],
          [1, 'fas', 'fa-plus-circle'],
          [1, 'poll-active-blink', 2, 'cursor', 'pointer', 3, 'click'],
          [1, 'd-flex', 'align-items-center', 'justify-content-between', 'flex-wrap'],
          ['id', 'alert-settings', 1, 'w-100', 3, 'change', 'keydown.enter'],
          [1, 'form-group', 'm-0'],
          [1, 'input-group'],
          [
            'type',
            'text',
            'placeholder',
            'Type your search term, then press Enter',
            'aria-label',
            'Search',
            'aria-describedby',
            'addon-search',
            'title',
            'Type your search term, then press Enter',
            1,
            'form-control'
          ],
          [
            'id',
            'addon-chat-clear',
            'title',
            'Clear the search',
            1,
            'btn',
            'btn-outline-secondary',
            'pl-2',
            'pr-2',
            'd-inline-flex',
            'clear-alert-input',
            'input-group-text',
            3,
            'click'
          ],
          [1, 'fas', 'fa-times'],
          [1, 'd-flex', 'align-items-center'],
          [1, 'ms-4', 'my-2', 'text-white'],
          ['title', 'Detach Chat', 1, 'btn', 'btn-outline-info', 'btn-sm', 'm-1'],
          [
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#alert-filter-modal',
            1,
            'btn',
            'btn-outline-light',
            'btn-sm',
            'm-1'
          ],
          [
            'type',
            'button',
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#alerts-advanced-search-modal',
            1,
            'btn',
            'btn-outline-light',
            'btn-sm',
            'm-1'
          ],
          [
            'type',
            'checkbox',
            'name',
            'inline-alert-entry',
            'value',
            'Show inline alert entry',
            'id',
            'inline-alert-entry',
            1,
            'form-check-input',
            3,
            'change',
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'inline-alert-entry', 1, 'form-check-label'],
          ['title', 'Detach Chat', 1, 'btn', 'btn-outline-info', 'btn-sm', 'm-1', 3, 'click'],
          [1, 'fas', 'fa-window-restore'],
          [
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#alert-filter-modal',
            1,
            'btn',
            'btn-outline-light',
            'btn-sm',
            'm-1',
            3,
            'click'
          ],
          [1, 'fas', 'fa-filter', 'me-1'],
          [1, 'fas', 'fa-search', 'me-1'],
          [
            'id',
            'addon-chat-save',
            'title',
            'Save alerts messages',
            1,
            'btn',
            'btn-outline-secondary',
            'd-inline-flex',
            'pl-2',
            'pr-2',
            'input-group-text',
            3,
            'click'
          ],
          [1, 'fas', 'fa-save'],
          [
            'id',
            'addon-chat-messages-archive',
            'title',
            'Archive Alerts Messages',
            1,
            'btn',
            'btn-outline-secondary',
            'pl-2',
            'pr-2',
            'd-inline-flex',
            'archive-alert-input',
            'input-group-text'
          ],
          [
            'id',
            'addon-chat-messages-archive',
            'title',
            'Archive Alerts Messages',
            1,
            'btn',
            'btn-outline-secondary',
            'pl-2',
            'pr-2',
            'd-inline-flex',
            'archive-alert-input',
            'input-group-text',
            3,
            'click'
          ],
          [1, 'fas', 'fa-trash'],
          ['id', 'textAreaAlertHolder', 1, 'p-1'],
          [
            'name',
            'txt-area-alert',
            'id',
            'textAreaAlertTxt',
            'rows',
            '1',
            'spellcheck',
            'true',
            'placeholder',
            'Type your alert here..',
            1,
            'txt-area-alert',
            'form-control',
            'border-0',
            3,
            'keyup',
            'paste'
          ]
        ],
        template: function (i, o) {
          if (1 & i) {
            const s = Y();
            (d(0, 'div', 3)(1, 'div', 4)(2, 'nav', 5)(3, 'a', 6),
              T(4, 'i', 7),
              v(5, ' Alerts '),
              H(6, T2e, 2, 0, 'span', 8)(7, D2e, 3, 0, 'span', 9),
              u(),
              d(8, 'ul', 10),
              H(9, E2e, 8, 4)(10, k2e, 4, 0, 'li', 11),
              d(11, 'li', 12),
              x('click', function () {
                return (D(s), E(o.toggleAlertsToolbarSearchOnly()));
              }),
              d(12, 'a', 13),
              T(13, 'i', 14),
              u()(),
              d(14, 'li', 15),
              x('click', function () {
                return (D(s), E(o.toggleAlertsToolbar()));
              }),
              d(15, 'a', 16),
              T(16, 'i', 17),
              u()()()(),
              H(17, N2e, 11, 2, 'div', 18),
              u(),
              T(18, 'app-roomscroller', 19, 0),
              H(20, L2e, 4, 0, 'div', 20),
              u());
          }
          2 & i &&
            (m(6),
            O(
              6,
              o.appService.globals.sessData.modAlertFilterList &&
                o.appService.globals.doFilteredAlerts
                ? 6
                : -1
            ),
            m(),
            O(7, o.appService.globals.preferences.doNotDisturbOn ? 7 : -1),
            m(2),
            O(9, o.isPresenter ? 9 : -1),
            m(),
            O(10, !o.isPresenter && o.pollIsMinimized ? 10 : -1),
            m(7),
            O(17, o.showAlertsToolbar ? 17 : -1),
            m(),
            z('logType', 'alerts')('displayMode', o.displayMode)('isPresenter', o.isPresenter),
            m(2),
            O(20, o.showAlertsEntry ? 20 : -1));
        },
        dependencies: [qs, Ss, ti, Ws, Yn, as, a6],
        styles: [
          '.chat[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]   a[_ngcontent-%COMP%], .chat[_ngcontent-%COMP%]   .clear-alert-input[_ngcontent-%COMP%]{cursor:pointer}.alertsToolbar[_ngcontent-%COMP%], .alertHeader[_ngcontent-%COMP%]{background-color:var(--msgs-header-bg);color:var(--msgs-header-color)}.alertHeader[_ngcontent-%COMP%]   .dropdown-menu[_ngcontent-%COMP%]{background-color:var(--msgs-header-bg);border:none;border-radius:0 0 0 5px}.inline-alert-entry-field[_ngcontent-%COMP%]{background-color:var(--chat-bg)}#textAreaAlertHolder[_ngcontent-%COMP%]{background-color:var(--textarea-bg);border-radius:8px;padding:5px;margin:5px}.txt-area-alert[_ngcontent-%COMP%]{border-radius:0;border:1px solid #ffffff;font-size:14px;resize:none;color:var(--textarea-color)!important;background-color:var(--textarea-bg)!important;outline:none;overflow-y:auto;margin-left:0;margin-right:0;padding-left:5px;padding-right:5px}.txt-area-alert[_ngcontent-%COMP%]:focus{border-color:var(--darker-gray);box-shadow:0 1px 0 var(--darker-gray)}.form-check-label[_ngcontent-%COMP%]:hover{cursor:pointer;opacity:.85}.filtered-text[_ngcontent-%COMP%]{font-size:12px;vertical-align:middle}.filtered-text[_ngcontent-%COMP%]:hover{cursor:pointer;opacity:.85}.poll-active-blink[_ngcontent-%COMP%]{color:#f39c12!important;animation:_ngcontent-%COMP%_poll-pulse 1.5s ease-in-out infinite}.poll-active-indicator[_ngcontent-%COMP%]{color:#f39c12!important}@keyframes _ngcontent-%COMP%_poll-pulse{0%,to{opacity:1}50%{opacity:.5}}'
        ]
      });
    }
  }
  return t;
})();
