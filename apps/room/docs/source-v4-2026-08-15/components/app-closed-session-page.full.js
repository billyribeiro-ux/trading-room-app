const rRe = (t, n) => ({ 'push-wrapper': t, 'mt-0': n }),
  aRe = (t) => ({ 'btn-dark': t });
function lRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 40),
      x('click', function () {
        return (D(e), E(g().toggleSideBar()));
      }),
      T(1, 'i', 41),
      u());
  }
}
function cRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 42),
      x('click', function () {
        return (D(e), E(g().toggleSideBar()));
      }),
      T(1, 'i', 43),
      u());
  }
}
function dRe(t, n) {
  if ((1 & t && (d(0, 'span'), v(1), u()), 2 & t)) {
    const e = g();
    (m(), Ne(' ', e.appService.globals.rosterCount + e.simUserCount, ' '));
  }
}
function uRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 44),
      x('click', function () {
        return (D(e), E(g().doSessionControl()));
      }),
      d(1, 'a', 45),
      T(2, 'i', 46),
      u()());
  }
}
function hRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li')(1, 'a', 47),
      x('click', function () {
        return (D(e), E(g().openSession()));
      }),
      v(2, 'Open Session'),
      u()());
  }
}
function pRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 49),
      x('click', function () {
        return (D(e), E(g(2).getMyPinAndDoInfo()));
      }),
      v(1, ' Mobile App Info'),
      u());
  }
  if (2 & t) {
    const e = g(2);
    z('ngClass', ct(1, aRe, 'darkTheme' == e.appService.globals.preferences.theme));
  }
}
function fRe(t, n) {
  if ((1 & t && (d(0, 'p'), H(1, pRe, 2, 3, 'button', 48), u()), 2 & t)) {
    const e = g();
    (m(),
      O(
        1,
        (!e.appService.globals.sessData.ptrMobileAppEnabled &&
          !e.appService.globals.sessData.customMobileAppEnabled) ||
          (e.appService.globals.user.isFT && !e.appService.globals.sessData.freeTrialsGetApp)
          ? -1
          : 1
      ));
  }
}
function mRe(t, n) {
  (1 & t && T(0, 'img', 51),
    2 & t && z('src', g(2).appService.globals.sessData.altBenzingaLogoURL, Mt));
}
function gRe(t, n) {
  1 & t && (T(0, 'i', 52), d(1, 'span', 29), v(2, 'Benzinga News'), u());
}
function _Re(t, n) {
  if (
    (1 & t && (d(0, 'li', 32)(1, 'a', 50), H(2, mRe, 1, 1, 'img', 51)(3, gRe, 3, 0), u()()), 2 & t)
  ) {
    const e = g();
    (m(),
      Et('href', e.benzingaUrl, Mt),
      m(),
      O(2, e.appService.globals.sessData.altBenzingaLogoURL ? 2 : 3));
  }
}
function bRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 60),
      x('click', function () {
        return (D(e), E(g(2).launchRecordings()));
      }),
      T(1, 'i', 61),
      d(2, 'span', 29),
      v(3, 'Recording'),
      u()());
  }
}
function vRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'a', 62),
      x('click', function () {
        return (D(e), E(g(2).doChatLogsModal()));
      }),
      T(1, 'i', 63),
      d(2, 'span', 29),
      v(3, 'Chat Logs'),
      u()());
  }
}
function yRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 33)(1, 'a', 53),
      T(2, 'i', 54),
      d(3, 'span', 29),
      v(4, 'Archives'),
      u()(),
      d(5, 'div', 55),
      H(6, bRe, 4, 0, 'a', 56),
      d(7, 'a', 57),
      x('click', function () {
        return (D(e), E(g().doAlertsLogsModal()));
      }),
      T(8, 'i', 58),
      d(9, 'span', 29),
      v(10, 'Alert Logs'),
      u()(),
      H(11, vRe, 4, 0, 'a', 59),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(6),
      O(6, e.appService.globals.isPresenter || !e.appService.globals.sessData.hideRecs ? 6 : -1),
      m(5),
      O(
        11,
        !e.appService.globals.sessData.hideChatLog || e.appService.globals.isPresenter ? 11 : -1
      ));
  }
}
function FRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 32)(1, 'a', 64),
      x('click', function () {
        return (D(e), E(g().getRandomUser()));
      }),
      T(2, 'i', 6),
      d(3, 'span', 29),
      v(4, 'Get Random User'),
      u()()());
  }
}
function CRe(t, n) {
  if ((1 & t && (d(0, 'span', 67), v(1), u()), 2 & t)) {
    const e = g(2);
    (m(), Ne(' ', e.appService.globals.rosterCount + e.simUserCount, ' '));
  }
}
function SRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'input', 76),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.userSearchTermTxt, o) || (s.userSearchTermTxt = o), E(o));
      }),
      x('search', function () {
        return (D(e), E(g(2).searchUsers()));
      }),
      u());
  }
  2 & t && je('ngModel', g(2).userSearchTermTxt);
}
function wRe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 38)(1, 'a', 65)(2, 'div', 66),
      T(3, 'i', 6),
      d(4, 'span', 29),
      v(5, 'Users: '),
      u(),
      H(6, CRe, 2, 1, 'span', 67),
      u(),
      d(7, 'div', 68)(8, 'button', 69),
      x('click', function () {
        return (D(e), E(g().reloadUsers()));
      }),
      T(9, 'i', 70),
      u(),
      d(10, 'button', 71),
      x('click', function () {
        return (D(e), E(g().toggleUserSearch()));
      }),
      T(11, 'i', 72),
      u()()(),
      H(12, SRe, 1, 1, 'input', 73),
      d(13, 'div', 74, 1),
      T(15, 'app-room-roster', 75),
      u()());
  }
  if (2 & t) {
    const e = g(),
      i = It(23);
    (m(6),
      O(
        6,
        e.appService.globals.sessData.rosterCountVisibleToViewers ||
          e.appService.globals.isPresenter
          ? 6
          : -1
      ),
      m(6),
      O(12, e.showUserSearch ? 12 : -1),
      m(3),
      z('roster', e.visibleRoster)('parent', i));
  }
}
TRe = (() => {
  class t {
    constructor(e, i, o) {
      ((this.appService = e),
        (this.mediaService = i),
        (this.sanitizer = o),
        (this.simUserCount = 0),
        (this.showSidebar = !1),
        (this.alwaysShowRoster = !1),
        (this.isSortUsers = !1),
        (this.isSortFTUsers = !1),
        (this.showUserSearch = !1),
        (this.benzingaUrl = null),
        (this.roomV4Link = ''),
        (this.userSearchTermTxt = ''));
    }
    ngOnInit() {
      ((this.roomV4Link = window.location.href.replace('.com/', '.com/v4/')),
        (this.benzingaUrl = this.sanitizer.bypassSecurityTrustUrl(
          `https://ptrv3.protradingroom.com/public/bz/index.html?sessID=${this.appService.globals.sessionID}&id=${this.appService.globals.sessData.uuid}&tok=${this.appService.globals.sesionToken}`
        )),
        '' != this.appService.globals.sessData.altBenzingaLinkURL &&
          (this.benzingaUrl = this.sanitizer.bypassSecurityTrustUrl(
            this.appService.globals.sessData.altBenzingaLinkURL
          )));
      const e = this.appService.globals.sessData.simUserCount;
      (e &&
        ((this.simUserCount = Number(e)),
        this.simUserCount > 5e3 && (this.simUserCount = 5e3),
        this.simUserCount <= 0 && (this.simUserCount = 0)),
        this.appService.globals.sessData.alwaysShowRoster &&
          ((this.showSidebar = !0),
          (this.alwaysShowRoster = !0),
          setTimeout(() => {
            this.appService.loadRoster();
          }, 500)),
        this.appService.appEventBus.subscribe('getRoster', (i) => {
          ((this.visibleRoster = this.appService.globals.roster), (this.userSearchTermTxt = ''));
        }));
    }
    doreload() {
      window.location.reload();
    }
    doSessionControl() {
      this.appService.guiEventBus.emit('doSessionControlModal');
    }
    openSession() {
      this.appService.sendServerAdminCommand('openSession', {});
    }
    toggleSideBar() {
      ((this.showSidebar = !this.showSidebar),
        this.showSidebar ? this.appService.loadRoster() : this.appService.unloadRoster());
    }
    toggleSideBarUsersCount() {
      this.alwaysShowRoster &&
        ((this.showSidebar = !this.showSidebar), this.showSidebar && this.appService.loadRoster());
    }
    getMyPinAndDoInfo() {
      var e = this;
      return I(function* () {
        (e.appService.globals.sessData.ptrMobileAppEnabled ||
          e.appService.globals.sessData.customMobileAppEnabled) &&
          (!e.appService.globals.user.isFT || e.appService.globals.sessData.freeTrialsGetApp) &&
          e.appService.sendServerCommand('getMyMobilePin', null);
      })();
    }
    archivesAvailableTo() {
      return this.appService.globals.isPresenter && !this.appService.globals.isLimitedPresenter
        ? !(
            this.appService.globals.sessData.showArchivesToSpecificPresenters &&
            !this.appService.globals.sessData.showArchivesToSpecificPresenters.includes(
              this.appService.globals.user.email
            )
          )
        : !(
            !this.appService.globals.sessData.showArchivesToUsers ||
            this.appService.globals.user.denyArchivesAccess
          );
    }
    launchRecordings() {
      window.open(
        `${this.appService.globals.apiROOT}/sessions/v2/archives/recordings/${this.appService.globals.sessionID}/${this.appService.globals.sesionToken}`,
        '_blank'
      );
    }
    reloadUsers() {
      this.appService.loadRoster();
    }
    doAlertsLogsModal() {
      this.appService.guiEventBus.emit('doAlertsLogsModal');
    }
    doChatLogsModal() {
      this.appService.guiEventBus.emit('doChatLogsModal');
    }
    toggleUserSearch() {
      ((this.showUserSearch = !this.showUserSearch),
        this.showUserSearch &&
          setTimeout(() => {
            document.getElementById('userSearchTermInput').focus();
          }, 300));
    }
    uniqueRoster(e) {
      let i = e.length,
        o = [],
        s = [],
        r = [],
        a = 0;
      for (let l = 0; l < i; l++) {
        const c = e[l];
        o.includes(c.emailHash) ? r.push(c) : (o.push(c.emailHash), s.push(c), a++);
      }
      return { uniqueUsers: s, totalUsers: i, unique: a };
    }
    calculateDuplicates() {
      var i = this.uniqueRoster(this.appService.globals.roster);
      return (
        bootbox.alert('Unique Users: ' + i.unique + '. Duplicate: ' + (i.totalUsers - i.unique)),
        !1
      );
    }
    randomUser(e) {
      const i = this;
      var o = e.length;
      if (o >= 2) {
        var r = e[Math.floor(Math.random() * o)],
          a = bootbox.dialog({
            title: 'Random User',
            message:
              '<p class="text-center"><img src="https://media.giphy.com/media/dyXPQavQUyeSK4nlpt/giphy.gif" alt=""></p>',
            className: 'random-user-modal',
            buttons: {
              noclose: {
                label: 'User Info',
                className: 'btn-warning btn-random-user',
                callback: () => (
                  i.appService.getUserInfo(r.userXrefID, r._id, null, null, !0),
                  i.appService.guiEventBus.emit('doUserInfo', r.userXrefID),
                  !1
                )
              },
              cancel: { label: 'Close', className: 'btn-danger', callback() {} }
            }
          });
        a.init(() => {
          setTimeout(() => {
            (a
              .find('.bootbox-body')
              .html('<h2 class="text-center flash animated">' + r.nick + '</h2>'),
              $('.btn-random-user').css('display', 'inline-block'));
          }, 3e3);
        });
      }
    }
    getRandomUser() {
      const e = this;
      bootbox.confirm({
        message: 'Only select from Trials?',
        buttons: {
          confirm: { label: 'Yes', className: 'btn-success' },
          cancel: { label: 'No', className: 'btn-danger' }
        },
        callback(i) {
          let o = e.appService.globals.roster.filter((r) => !r.isP),
            { uniqueUsers: s } = e.uniqueRoster(o);
          (console.log('unique users for random', s),
            i && (s = s.filter((r) => r.isFT)),
            e.randomUser(s));
        }
      });
    }
    manageFollowedUsers() {
      this.appService.appEventBus.emit('manageFollowedUsers');
    }
    manageMutedUsers() {
      this.appService.appEventBus.emit('manageMutedUsers');
    }
    sortUsers() {
      ((this.isSortUsers = !this.isSortUsers),
        this.appService.guiEventBus.emit('sortUsers', this.isSortUsers));
    }
    sortFTUsers() {
      ((this.isSortFTUsers = !this.isSortFTUsers),
        this.appService.guiEventBus.emit('sortFTUsers', this.isSortFTUsers));
    }
    doUserSearch(e) {
      13 == e.keyCode && (this.userSearchTermTxt ? this.searchUsers() : this.clearUserSearch());
    }
    searchUsers() {
      let e = this.userSearchTermTxt.toLocaleLowerCase();
      (console.log('Searching for: ' + e),
        (this.visibleRoster = this.appService.globals.roster.filter(
          (i) =>
            !!(
              i.nick.toLowerCase().indexOf(e) >= 0 ||
              (i.emailHash && i.emailHash === this.appService.hashEmail(e))
            )
        )));
    }
    clearUserSearch() {
      (console.log('Clear search...'), (this.visibleRoster = this.appService.globals.roster));
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(ma), be(sa));
      };
    }
    static {
      this.ɵcmp = ut({
        type: t,
        selectors: [['app-closed-session-page']],
        decls: 71,
        vars: 21,
        consts: [
          ['rosterScrollerParent', ''],
          ['rosterHolder', ''],
          [1, 'navbar', 'navbar-expand-md', 'navbar-dark', 'bg-dark', 'fixed-top'],
          ['title', 'Close Sidebar', 1, 'sidebar-menu', 'active-icon'],
          ['title', 'Open Sidebar', 1, 'sidebar-menu'],
          ['title', 'Users Connected', 1, 'users', 3, 'click'],
          [1, 'fas', 'fa-user'],
          ['href', '#', 1, 'navbar-brand'],
          [
            'id',
            'cssLogo',
            'alt',
            'App Logo',
            1,
            'brand-logo',
            2,
            'max-width',
            '200px',
            'height',
            'auto',
            'max-height',
            '40px',
            3,
            'src'
          ],
          [
            'type',
            'button',
            'data-bs-toggle',
            'collapse',
            'data-bs-target',
            '#navbarsExampleDefault',
            'aria-controls',
            'navbarsExampleDefault',
            'aria-expanded',
            'false',
            'aria-label',
            'Toggle navigation',
            1,
            'navbar-toggler'
          ],
          [1, 'navbar-toggler-icon'],
          ['id', 'navbarsExampleDefault', 1, 'collapse', 'navbar-collapse'],
          [1, 'navbar-nav', 'align-items-center', 'ml-auto'],
          [
            'title',
            'Session Control',
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#session-control-modal',
            1,
            'nav-item'
          ],
          ['title', 'Reload', 1, 'nav-item'],
          [1, 'nav-link', 3, 'click'],
          [1, 'fas', 'fa-2x', 'fa-sync'],
          [1, 'container-fluid', 'h-100', 'w-100', 'wrapper', 3, 'ngClass'],
          [1, 'd-flex', 'flex-column-reverse', 'flex-sm-row', 'room-container'],
          [1, 'room-sidebar'],
          [1, 'sidebar-wrapper'],
          [1, 'navbar', 'w-100', 'h-100'],
          [1, 'navbar-nav', 'small', 'w-100', 'h-100'],
          [1, 'nav-item', 'text-center'],
          [
            'href',
            'https://protradingroom.com',
            'target',
            '_blank',
            'rel',
            'noopener noreferrer',
            1,
            'ptr-website-link'
          ],
          ['target', '_blank', 'rel', 'noopener noreferrer', 1, 'ptr-website-link', 3, 'href'],
          [1, 'nav-item'],
          [
            'title',
            'Connectivity Check',
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#webrtc-troubleshooter-modal',
            1,
            'nav-link',
            'sidebar-item'
          ],
          [1, 'fas', 'fa-network-wired'],
          [1, 'pl-2'],
          [
            'title',
            'General Settings',
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#user-settings-modal',
            1,
            'nav-link',
            'sidebar-item'
          ],
          [1, 'fas', 'fa-cogs'],
          [1, 'nav-item', 'py-0'],
          [1, 'nav-item', 'dropdown'],
          [
            'title',
            'Manage Muted Users',
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#mutedUsersModal',
            1,
            'nav-link',
            'sidebar-item',
            'ps-1',
            3,
            'click'
          ],
          [1, 'fas', 'fa-comments'],
          [
            'title',
            'Manage Followed Users',
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#followedUsersModal',
            1,
            'nav-link',
            'sidebar-item',
            'ps-1',
            3,
            'click'
          ],
          [1, 'fas', 'fa-users'],
          [1, 'nav-item', 'd-flex', 'flex-column', 'h-100'],
          [1, 'm-2', 'w-100', 'closed-container', 3, 'innerHTML'],
          ['title', 'Close Sidebar', 1, 'sidebar-menu', 'active-icon', 3, 'click'],
          [1, 'fas', 'fa-arrow-left'],
          ['title', 'Open Sidebar', 1, 'sidebar-menu', 3, 'click'],
          [1, 'fas', 'fa-bars'],
          [
            'title',
            'Session Control',
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#session-control-modal',
            1,
            'nav-item',
            3,
            'click'
          ],
          [1, 'nav-link'],
          [1, 'fas', 'fa-2x', 'fa-cog'],
          [1, 'btn', 'btn-warning', 'nav-link', 'ml-2', 3, 'click'],
          [
            'type',
            'button',
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#mobileAppInfoModal',
            1,
            'btn',
            'btn-sm',
            'btn-secondary',
            3,
            'ngClass'
          ],
          [
            'type',
            'button',
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#mobileAppInfoModal',
            1,
            'btn',
            'btn-sm',
            'btn-secondary',
            3,
            'click',
            'ngClass'
          ],
          ['target', '_blank', 'title', 'Benzinga News', 1, 'nav-link', 'sidebar-item', 'ps-1'],
          [1, 'benzinga-logo-alt', 3, 'src'],
          [1, 'fas', 'fa-newspaper'],
          [
            'id',
            'archivesDropdown',
            'title',
            'Archives',
            'data-bs-toggle',
            'dropdown',
            'aria-haspopup',
            'true',
            'aria-expanded',
            'false',
            1,
            'nav-link',
            'sidebar-item',
            'dropdown-toggle'
          ],
          [1, 'fas', 'fa-archive'],
          ['aria-labelledby', 'archivesDropdown', 1, 'dropdown-menu', 'users-dropdown-options'],
          [1, 'dropdown-item', 'small'],
          [
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#alerts-logs-modal',
            1,
            'dropdown-item',
            'small',
            3,
            'click'
          ],
          [1, 'fas', 'fa-bell'],
          [
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#chat-logs-modal',
            1,
            'dropdown-item',
            'small'
          ],
          [1, 'dropdown-item', 'small', 3, 'click'],
          [1, 'fas', 'fa-circle'],
          [
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#chat-logs-modal',
            1,
            'dropdown-item',
            'small',
            3,
            'click'
          ],
          [1, 'fas', 'fa-comment'],
          ['title', 'Get Random User', 1, 'nav-link', 'sidebar-item', 'ps-1', 3, 'click'],
          [
            1,
            'nav-link',
            'active-room-users',
            'd-flex',
            'align-items-center',
            'justify-content-between',
            'pt-0'
          ],
          ['title', 'Users'],
          [1, 'badge', 'badge-primary', 'd-inline-block', 'ml-1'],
          [1, 'flex-fill', 'users-btns'],
          [
            'title',
            'Reload Users',
            1,
            'btn',
            'btn-sm',
            'btn-default',
            'ml-1',
            'float-right',
            'reload-room-users',
            'border-0',
            3,
            'click'
          ],
          [1, 'fas', 'fa', 'fa-sync'],
          [
            'title',
            'Search Users',
            1,
            'btn',
            'btn-sm',
            'btn-default',
            'float-right',
            'search-room-users',
            'border-0',
            3,
            'click'
          ],
          [1, 'fas', 'fa', 'fa-search'],
          [
            'type',
            'search',
            'id',
            'userSearchTermInput',
            'placeholder',
            'Search by nick or email,enter to search',
            'aria-label',
            'Search',
            'aria-describedby',
            'addon-search',
            1,
            'form-control',
            3,
            'ngModel'
          ],
          [1, 'flex-grow-1'],
          [3, 'roster', 'parent'],
          [
            'type',
            'search',
            'id',
            'userSearchTermInput',
            'placeholder',
            'Search by nick or email,enter to search',
            'aria-label',
            'Search',
            'aria-describedby',
            'addon-search',
            1,
            'form-control',
            3,
            'ngModelChange',
            'search',
            'ngModel'
          ]
        ],
        template: function (i, o) {
          if (1 & i) {
            const s = Y();
            (d(0, 'nav', 2),
              H(1, lRe, 2, 0, 'span', 3)(2, cRe, 2, 0, 'span', 4),
              d(3, 'span', 5),
              x('click', function () {
                return (D(s), E(o.toggleSideBarUsersCount()));
              }),
              T(4, 'i', 6),
              H(5, dRe, 2, 1, 'span'),
              u(),
              d(6, 'a', 7),
              T(7, 'img', 8),
              u(),
              d(8, 'button', 9),
              T(9, 'span', 10),
              u(),
              d(10, 'div', 11)(11, 'ul', 12),
              H(12, uRe, 3, 0, 'li', 13),
              d(13, 'li', 14)(14, 'a', 15),
              x('click', function () {
                return (D(s), E(o.doreload()));
              }),
              T(15, 'i', 16),
              u()(),
              H(16, hRe, 3, 0, 'li'),
              u()()(),
              d(17, 'div', 17)(18, 'div', 18)(19, 'div', 19)(20, 'div', 20)(21, 'nav', 21)(
                22,
                'ul',
                22,
                0
              )(
                24,
                'li',
                23
              )(25, 'p'),
              v(26, ' Powered by:\xa0 '),
              d(27, 'a', 24),
              v(28, ' ProTradingRoom.com '),
              u()(),
              d(29, 'p'),
              v(30),
              u(),
              H(31, fRe, 2, 1, 'p'),
              T(32, 'hr'),
              d(33, 'a', 25),
              v(34, ' Try v3 '),
              u(),
              T(35, 'hr'),
              u(),
              d(36, 'li', 26)(37, 'a', 27),
              T(38, 'i', 28),
              d(39, 'span', 29),
              v(40, 'Connectivity/Mic Check'),
              u()()(),
              d(41, 'li', 26)(42, 'a', 30),
              T(43, 'i', 31),
              d(44, 'span', 29),
              v(45, 'General Settings'),
              u()()(),
              H(46, _Re, 4, 2, 'li', 32)(47, yRe, 12, 2, 'li', 33),
              d(48, 'li', 32)(49, 'a', 34),
              x('click', function () {
                return (D(s), E(o.manageMutedUsers()));
              }),
              T(50, 'i', 35),
              d(51, 'span', 29),
              v(52, 'Manage Muted Users'),
              u()()(),
              d(53, 'li', 32)(54, 'a', 36),
              x('click', function () {
                return (D(s), E(o.manageFollowedUsers()));
              }),
              T(55, 'i', 37),
              d(56, 'span', 29),
              v(57, 'Manage Followed Users'),
              u()()(),
              H(58, FRe, 5, 0, 'li', 32)(59, wRe, 16, 4, 'li', 38),
              u()()()(),
              T(60, 'div', 39),
              Xe(61, 'noSanitize'),
              u()(),
              T(62, 'app-session-control-modal')(63, 'app-user-info-modal')(
                64,
                'app-user-settings-modal'
              )(65, 'app-chat-logs-modal')(66, 'app-alert-logs-modal')(
                67,
                'app-mobile-app-info-modal'
              )(68, 'app-muted-users-modal')(69, 'app-followed-users-modal')(
                70,
                'app-webrtc-troubleshooter'
              ));
          }
          2 & i &&
            (m(),
            O(1, o.showSidebar && !o.alwaysShowRoster ? 1 : -1),
            m(),
            O(2, o.showSidebar || o.alwaysShowRoster ? -1 : 2),
            m(3),
            O(
              5,
              o.appService.globals.sessData.rosterCountVisibleToViewers ||
                o.appService.globals.isPresenter
                ? 5
                : -1
            ),
            m(2),
            z('src', o.appService.globals.logoURL, Mt),
            m(5),
            O(12, o.appService.globals.isPresenter ? 12 : -1),
            m(4),
            O(16, o.appService.globals.isPresenter ? 16 : -1),
            m(),
            z(
              'ngClass',
              Kn(
                18,
                rRe,
                o.showSidebar,
                o.appService.globals.videoOnlyMode ||
                  o.appService.globals.chatOnlyMode ||
                  o.appService.globals.viewerOnlyMode
              )
            ),
            m(13),
            Ne('Version: ', o.appService.globals.appVersion, ''),
            m(),
            O(31, o.appService.globals.sessData.hideAppInfo ? -1 : 31),
            m(2),
            xn('href', o.roomV4Link, Mt),
            m(13),
            O(46, o.appService.globals.sessData.hasBenzingaNews ? 46 : -1),
            m(),
            O(47, o.archivesAvailableTo() ? 47 : -1),
            m(11),
            O(58, o.appService.globals.isPresenter ? 58 : -1),
            m(),
            O(
              59,
              o.appService.globals.sessData.onlyPresentersVisibleToViewers ||
                o.appService.globals.sessData.rosterVisibleToViewers ||
                o.appService.globals.isPresenter ||
                o.appService.globals.user.hasAdminChat
                ? 59
                : -1
            ),
            m(),
            z('innerHTML', Ct(61, 15, o.appService.globals.sessData.closedTxt, 'html'), wn));
        },
        dependencies: [Di, ai, ti, Yn, wB, DB, AB, RB, OB, NB, LB, VB, HB, GB, Rr],
        styles: [
          '@charset "UTF-8";body[_ngcontent-%COMP%]{width:100vw;height:100%}.container-fluid[_ngcontent-%COMP%]{padding:0}.sidebar-menu[_ngcontent-%COMP%], .users[_ngcontent-%COMP%], .helpLink[_ngcontent-%COMP%], .navbar-nav[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{cursor:pointer;margin:0 5px}.mobile-info-app-btn[_ngcontent-%COMP%]:hover{cursor:pointer}.sidebar-menu[_ngcontent-%COMP%], .users[_ngcontent-%COMP%], .helpLink[_ngcontent-%COMP%]{font-size:18px}.sidebar-menu[_ngcontent-%COMP%]{padding:1px 5px;border:1px solid transparent}.sidebar-menu[_ngcontent-%COMP%]:hover{color:var(--lighter-gray);border:1px solid transparent}.users[_ngcontent-%COMP%]{color:var(--users-color);border:1px solid var(--users-border-color);font-size:14px;padding:1px 5px}.sidebar-menu[_ngcontent-%COMP%]{background-color:var(--sidebar-menu-bg);color:var(--sidebar-menu-color)}.active-icon[_ngcontent-%COMP%]{color:var(--sidebar-menu-active-color);border:1px solid var(--sidebar-menu-active-color);border-radius:5px;transition:all .5s}.room-sound-options[_ngcontent-%COMP%]{text-align:left;padding-left:30px}.room-sound-options[_ngcontent-%COMP%]   .form-check-label[_ngcontent-%COMP%]:hover{opacity:.85;cursor:pointer}.soundcloud-options[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]:hover, .screen-options-start-screen[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]:hover, .screen-options[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]:hover{cursor:pointer;color:var(--light-black)}.volumeControl[_ngcontent-%COMP%]{text-align:center;color:var(--light-gray);background-color:var(--darker-black)}.notConnectedOverlay[_ngcontent-%COMP%]{display:block;position:absolute;bottom:5px;right:5px;z-index:10000;background-color:#000;color:var(--presenter-noRecording-color);opacity:.7}.positionBtn[_ngcontent-%COMP%]{display:block;position:absolute;bottom:18px;right:5px;z-index:11;border-color:#00bc8c;color:#00bc8c}.positionBtn[_ngcontent-%COMP%]:hover{color:#000;background-color:#00bc8c}.recIndicatorStart[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{line-height:41px;color:#ff0}.talkingIndicator[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{color:var(--presenter-noRecording-color)}.recIndicator[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{color:var(--presenter-recording-color)}.wrapper[_ngcontent-%COMP%]{position:relative;display:inline-block;margin-top:49px;color:var(--light-gray);background-color:var(--darker-black)}.push-wrapper[_ngcontent-%COMP%]{left:250px;width:calc(100% - 250px)!important}.closed-container[_ngcontent-%COMP%]{height:calc(100vh - 68px);width:100vw;overflow-y:auto}.gutter[_ngcontent-%COMP%]{background-color:var(--split-gutter-bg);background-repeat:no-repeat;background-position:50%}.gutter-horizontal[_ngcontent-%COMP%]{background-image:url(/static/img/grips/vertical.png);cursor:ew-resize;height:calc(100vh - 60px);z-index:5}.gutter-vertical[_ngcontent-%COMP%]{background-image:url(/static/img/grips/horizontal.png);cursor:ns-resize;z-index:5}.box-left[_ngcontent-%COMP%], .box-right[_ngcontent-%COMP%]{height:calc(100vh - 60px)}.brand-logo[_ngcontent-%COMP%]{max-width:200px;height:auto;max-height:40px}#mainAreaSplit[_ngcontent-%COMP%]{height:calc(100vh - 49px);width:100vw}#connectedMsg[_ngcontent-%COMP%]{display:none}.room-sidebar[_ngcontent-%COMP%]   .navbar-nav[_ngcontent-%COMP%]{overflow:hidden auto}.room-sidebar[_ngcontent-%COMP%]   .navbar-nav[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]{font-size:14px;font-weight:700;border-bottom:1px solid var(--sidebar-navItem-border-color);padding:5px 2px}.room-sidebar[_ngcontent-%COMP%]   .navbar-nav[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]:first-child{font-size:14px;font-weight:400}.room-sidebar[_ngcontent-%COMP%]   .navbar-nav[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]{margin-bottom:8px}.room-sidebar[_ngcontent-%COMP%]   .navbar-nav[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]   hr[_ngcontent-%COMP%]{margin:5px 0}.room-sidebar[_ngcontent-%COMP%]   .navbar-nav[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]   .saves-bandwidth[_ngcontent-%COMP%]{font-size:11px}.room-sidebar[_ngcontent-%COMP%]   .navbar-nav[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]   .dropdown-toggle[_ngcontent-%COMP%]:after{float:right;margin:10px 10px 15px}.hidden[_ngcontent-%COMP%]{display:none}.privChatHolder[_ngcontent-%COMP%]{display:none;position:fixed;left:50%;bottom:0;margin:0 auto;z-index:500;border:1px solid rgb(133,133,133);background-color:#000;width:600px;height:400px;max-width:calc(100vw - 100px)!important;max-height:calc(100vh - 50px)!important;font-size:14px}.sidebar-wrapper[_ngcontent-%COMP%]{position:absolute!important;margin-left:-250px;top:0;height:calc(100vh - 49px);width:250px;background-color:#000!important;color:#868686!important;z-index:3}.themes[_ngcontent-%COMP%]   .form-check-input[_ngcontent-%COMP%]:checked + label[_ngcontent-%COMP%]{text-transform:uppercase;font-weight:700}.themes[_ngcontent-%COMP%]   .form-check-input[_ngcontent-%COMP%]{-webkit-appearance:none;-o-appearance:none;appearance:none;inset:5px 0 0;height:20px;width:20px;transition:all .15s ease-out 0s;background-color:var(--light-gray);border:none;color:var(--white);cursor:pointer;display:inline-block;margin-right:.5rem;outline:none;position:relative;z-index:1000;border-radius:50%}.themes[_ngcontent-%COMP%]   .form-check[_ngcontent-%COMP%]:hover{cursor:pointer}.themes[_ngcontent-%COMP%]   .form-check-input[_ngcontent-%COMP%]:checked{background-color:var(--checkbox-bg-color)}.themes[_ngcontent-%COMP%]   .form-check-input[_ngcontent-%COMP%]:checked:before{height:20px;width:20px;position:absolute;content:"\\2714";display:inline-block;font-size:20px;text-align:center;line-height:20px}.themes[_ngcontent-%COMP%]   .form-check-input[_ngcontent-%COMP%]:checked:after{animation:_ngcontent-%COMP%_click-wave .65s;background-color:var(--checkbox-bg-color);content:"";display:block;position:relative;z-index:100;border-radius:50%}@keyframes _ngcontent-%COMP%_click-wave{0%{height:40px;width:40px;opacity:.35;position:relative}to{height:200px;width:200px;margin-left:-80px;margin-top:-80px;opacity:0}}.navbar[_ngcontent-%COMP%]{padding:0;height:49px}.btnNavToggler[_ngcontent-%COMP%]{height:49px}.navbar-nav[_ngcontent-%COMP%]   .fa-1x[_ngcontent-%COMP%]{font-size:25px!important}#dropdownVolume[_ngcontent-%COMP%]{width:40px}#dropdownVolume[_ngcontent-%COMP%]:after{display:none}.screen-options[_ngcontent-%COMP%]{background-color:var(--white);font-size:16px;color:var(--darker-black);width:300px;padding:5px}.soundcloud-options[_ngcontent-%COMP%], .screen-options-start-screen[_ngcontent-%COMP%]{background-color:var(--white);font-size:16px;width:350px;color:var(--darker-black);padding:5px}.screen-options[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{text-decoration:none}.screen-options[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]:hover{color:var(--brown);background-color:var(--lighter-gray)}.screen-presenters[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]{font-size:14px}.screen-presenters[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]{padding-top:4px;padding-bottom:4px}.screen-presenters[_ngcontent-%COMP%]   i[_ngcontent-%COMP%]{vertical-align:middle;padding-right:5px}.screen-presenters-cmb[_ngcontent-%COMP%]{color:#fff!important;background-color:#363f45;border-color:#363f45;border-radius:3px}.presenter-img[_ngcontent-%COMP%]{max-width:28px}.volumeControl[_ngcontent-%COMP%]{text-align:center;color:var(--light-gray);background-color:var(--darker-black);border:1px solid #fafafa}.audioVolSlider[_ngcontent-%COMP%]{background-color:#fafafa}.volCtrl[_ngcontent-%COMP%]{background-color:var(--darker-black);height:32px;width:129px}.volumeControl[_ngcontent-%COMP%]   input[type=range][_ngcontent-%COMP%]::-moz-range-progress{background-color:#0d6efd;border-color:#0d6efd;height:8px;border-radius:3px}.volumeControl[_ngcontent-%COMP%]   input[type=range][_ngcontent-%COMP%]::-moz-range-thumb{background-color:#0d6efd;border-color:#0d6efd;height:13px;width:13px}.talkingIndicator[_ngcontent-%COMP%]{max-width:400px;white-space:nowrap;text-overflow:ellipsis}.talkingIndicator[_ngcontent-%COMP%]   a[_ngcontent-%COMP%], .recIndicator[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{line-height:41px;color:var(--presenter-noRecording-color)}.talkingIndicator[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{color:var(--presenter-noRecording-color);width:inherit;display:inline-flex;align-items:center;max-height:47px}.talkingIndicator[_ngcontent-%COMP%]   .talking-string[_ngcontent-%COMP%]{white-space:nowrap;overflow:auto hidden;width:100%;font-size:14px;margin:0 5px;height:100%;max-height:47px;max-width:300px}.recIndicator[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{color:var(--presenter-recording-color);width:52px;display:inline-block}.talkingWaveform[_ngcontent-%COMP%]{max-height:25px;max-width:30px}.muted[_ngcontent-%COMP%]{color:#abb0b5}.mainNavItem[_ngcontent-%COMP%]{display:none;color:var(--light-gray)}#navbarsRoom[_ngcontent-%COMP%]{color:var(--navbar-color);background-color:var(--navbar-bg)}.btnNavToggler[_ngcontent-%COMP%]{color:var(--navbar-color)}.mainAppNav[_ngcontent-%COMP%]{color:var(--navbar-color);background-color:var(--navbar-bg)}.reload-room-users[_ngcontent-%COMP%]{background-color:var(--reload-icon-bg-color);color:var(--reload-icon-color)}.search-room-users[_ngcontent-%COMP%]{background-color:var(--search-icon-bg-color);color:var(--search-icon-color)}.active-room-users[_ngcontent-%COMP%]   .badge[_ngcontent-%COMP%]{background-color:var(--users-badge-bg-color);color:var(--users-badge-color)}.ptr-website-link[_ngcontent-%COMP%]{color:var(--ptr-website-link-color)}.mobile-app-info[_ngcontent-%COMP%]{background-color:var(--mobileApp-info-bg-color);color:var(--mobileApp-info-color)}.mobile-app-info[_ngcontent-%COMP%]:hover{opacity:.9}.benzinga-logo[_ngcontent-%COMP%]{max-height:25px!important}.sidebar-item[_ngcontent-%COMP%]{color:inherit!important}.sidebar-item[_ngcontent-%COMP%]:hover{background-color:#e9ecef}.room-split-dir[_ngcontent-%COMP%]{flex-direction:row-reverse!important;direction:ltr!important}.user-options[_ngcontent-%COMP%]   .dropdown-menu[_ngcontent-%COMP%]{position:absolute!important;z-index:1000!important;top:30px!important;left:-106px!important;width:228px;font-size:13px;padding:2px}.user-options[_ngcontent-%COMP%]   .dropdown-toggle[_ngcontent-%COMP%]:after{display:none!important}.users-btns[_ngcontent-%COMP%]   .btn[_ngcontent-%COMP%]{padding:3px 6px}.recording-reminder[_ngcontent-%COMP%]{position:absolute;top:50px;left:-50px;background-color:#fff;color:#000;width:160px;padding:5px 5px 5px 10px;font-size:12px;display:flex;align-items:center;justify-content:space-between}.recording-reminder-arrow[_ngcontent-%COMP%]{width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:5px solid #fff;position:absolute;top:-5px;left:75px}.benzinga-logo-alt[_ngcontent-%COMP%]{background-color:#000;width:100%!important;max-height:25px!important;max-width:230px!important}.blinking-rec[_ngcontent-%COMP%]{animation:_ngcontent-%COMP%_blinking 1s step-start infinite}@keyframes _ngcontent-%COMP%_blinking{50%{opacity:0}}.breathing-rec[_ngcontent-%COMP%]{color:red!important;animation:_ngcontent-%COMP%_breathing 5s ease-out infinite normal}@keyframes _ngcontent-%COMP%_breathing{0%{transform:scale(.9)}25%{transform:scale(1.1)}60%{transform:scale(.9)}to{transform:scale(.9)}}@media only screen and (min-width: 768px) and (max-width: 930px){#navbarsRoom[_ngcontent-%COMP%], #navbarsRoom[_ngcontent-%COMP%]   .fa-2x[_ngcontent-%COMP%]{font-size:15px}#navbarsRoom[_ngcontent-%COMP%]   .talkingIndicator[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{font-size:12px}.brand-logo[_ngcontent-%COMP%]{max-width:150px}}@media only screen and (max-width: 768px){.mainNavItem[_ngcontent-%COMP%]{display:block}}@media only screen and (max-width: 600px){.soundcloud-options[_ngcontent-%COMP%], .screen-options-start-screen[_ngcontent-%COMP%]{width:inherit!important}.brand-logo[_ngcontent-%COMP%]{max-width:120px}#textAreaHolder[_ngcontent-%COMP%]{min-height:150px!important}}'
        ]
      });
    }
  }
  return t;
})();
