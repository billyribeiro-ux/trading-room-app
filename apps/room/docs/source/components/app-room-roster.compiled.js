wB = (() => {
  class t {
    constructor(e) {
      ((this.appService = e),
        (this.canPM = !0),
        (this.isSortUsers = !1),
        (this.isSortFTUsers = !1),
        (this.badges = ''));
    }
    ngOnInit() {
      ((this.canPM =
        (this.appService.globals.isPresenter || this.appService.globals.sessData.userPM) &&
        !(
          this.appService.globals.user.isFT && this.appService.globals.sessData.disablePMForTrials
        )),
        this.appService.guiEventBus.subscribe('sortUsers', (e) => {
          this.isSortUsers = e;
        }),
        this.appService.guiEventBus.subscribe('sortFTUsers', (e) => {
          this.isSortFTUsers = e;
        }));
    }
    ngAfterContentInit() {}
    showUserAvatar(e) {
      return !this.appService.globals.sessData.hideAvatars || !!e;
    }
    parseBadges(e) {
      if (
        ((this.badges = ''),
        this.appService.globals.sessData.enableBadges &&
          e &&
          (!this.appService.globals.sessData.showBadgesToPresentersOnly ||
            this.appService.globals.isPresenter))
      )
        for (let i = 0; i < e.length; i++) {
          let s = this.appService.globals.sessData.badgesH[e[i]];
          (s &&
            s.hasOwnProperty('darkTheme') &&
            s.darkTheme &&
            'darkTheme' === this.appService.globals.preferences.theme &&
            ((s = this.appService.globals.sessData.badgesH[s.darkTheme]),
            console.log('parseBadges DARK b: ', s)),
            s &&
              (this.badges +=
                s.hasOwnProperty('imgURL') && s.imgURL
                  ? '<img class="user-badge-img" src="' + s.imgURL + '" alt="' + s.imgURL + '"/>'
                  : '<span class="badge px-1 mx-1 user-badge" style="background-color: ' +
                    s.bkcolor +
                    '; color: ' +
                    s.color +
                    '" >' +
                    s.text +
                    '</span>'));
        }
      return this.badges;
    }
    doUserInfo(e, i, o = null, s = null) {
      (this.appService.getUserInfo(e, i, o, s, !0),
        this.appService.guiEventBus.emit('doUserInfo', e));
    }
    doMention(e) {
      this.appService.guiEventBus.emit(
        this.appService.globals.preferences.extraChatColumn &&
          'textAreaTxtExtra' === this.appService.globals.chatInputFocus
          ? 'doMentionExtra'
          : 'doMention',
        e
      );
    }
    startPC(e) {
      e.userXrefID !== this.appService.globals.user.userXrefID
        ? (!this.appService.globals.isPresenter &&
            !this.appService.globals.sessData.userPM &&
            !this.appService.globals.sessData.userToPresenterPM) ||
          this.appService.guiEventBus.emit('startPrivChat', {
            uid: e.userXrefID,
            isInit: !0,
            user: e
          })
        : bootbox.alert('Chatting with yourself again???');
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-room-roster']],
        inputs: { roster: 'roster', parent: 'parent' },
        decls: 6,
        vars: 7,
        consts: [
          [1, 'room-roster-list'],
          [1, 'room-roster-container'],
          [3, 'ngClass'],
          [1, 'media'],
          [1, 'rosterImg', 'mr-3', 3, 'src', 'alt'],
          [1, 'media-body'],
          [1, 'mt-0', 'mb-0', 'nickName', 'd-inline'],
          [3, 'click', 'dblclick'],
          [1, 'd-inline-block', 'align-baseline', 'mr-1', 3, 'innerHTML'],
          [1, 'badge', 'bg-danger', 'trial-badge'],
          [1, 'badge', 'bg-warning', 'new-badge'],
          [1, 'stars-container'],
          [
            'role',
            'button',
            'id',
            'dropdownMenuLink',
            'data-bs-toggle',
            'dropdown',
            'aria-haspopup',
            'true',
            'aria-expanded',
            'false',
            1,
            'msgMenu',
            'dropright',
            'd-inline-block',
            'float-right'
          ],
          ['aria-labelledby', 'dropdownMenuLink', 1, 'dropdown-menu', 'users-dropdown-options'],
          [1, 'dropdown-item', 3, 'click'],
          [1, 'fas', 'fa-user'],
          [1, 'fas', 'fa-reply'],
          [1, 'dropdown-item'],
          [1, 'userLocation'],
          [1, 'rosterImg', 'mr-3', 3, 'click', 'src', 'alt'],
          [1, 'fas', 'fa-star', 'stars-icon'],
          [1, 'stars-num'],
          [1, 'fas', 'fa-comments'],
          [1, 'fas', 'fa-user', 'm-1']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 0),
            ht(1, C2e, 2, 1, 'div', 1, d2e, !1, S2e, 0, 0),
            Je(4, 'sortUsers'),
            Je(5, 'sortFTUsers'),
            u()),
            2 & i && (m(), pt(Ct(5, 4, Ct(4, 1, o.roster, o.isSortUsers), o.isSortFTUsers))));
        },
        dependencies: [Di, Rr, l2e, c2e],
        styles: [
          '.rosterImg[_ngcontent-%COMP%]{width:45px;height:45px;object-fit:cover;border-radius:var(--rosterImg-border-radius)}.presUser[_ngcontent-%COMP%], .regUser[_ngcontent-%COMP%]{font-size:14px}.presUser[_ngcontent-%COMP%]:hover, .regUser[_ngcontent-%COMP%]:hover{cursor:pointer;transition:all .2s}.nickName[_ngcontent-%COMP%]{font-weight:bolder;font-size:16px;color:var(--nickname-color);position:relative}.nickName[_ngcontent-%COMP%]   .dropdown-menu[_ngcontent-%COMP%]{position:absolute;left:-12px}.presUser[_ngcontent-%COMP%]{background-color:var(--roster-bg-adm)!important;border-bottom:1px solid var(--dark-gray)!important}.regUser[_ngcontent-%COMP%]{background-color:var(--roster-bg);border-bottom:1px solid var(--dark-gray)}.userLocation[_ngcontent-%COMP%]{font-weight:200;font-size:12px;margin-bottom:0;color:var(--user-location-color)}.msgMenu[_ngcontent-%COMP%]{padding-left:5px;font-size:20px;font-weight:600;color:var(--username-color)!important}.msgMenu[_ngcontent-%COMP%]:hover{color:var(--light-brown)!important;font-weight:900;cursor:pointer}.room-roster-list[_ngcontent-%COMP%]{width:100%;height:100%;overflow-y:inherit!important}.chat-stars[_ngcontent-%COMP%]{font-size:8px;vertical-align:text-top!important}span.chat-stars[_ngcontent-%COMP%]{margin-top:2px;margin-left:2px;display:inline-block}span.chat-stars[_ngcontent-%COMP%]{color:var(--app-primary-color)}.stars-container[_ngcontent-%COMP%]{position:relative}.stars-container[_ngcontent-%COMP%]   .stars-icon[_ngcontent-%COMP%]{color:var(--msg-color)}.stars-num[_ngcontent-%COMP%]{position:absolute;color:var(--msgs-bg);left:6px;top:4px;font-size:10px;font-weight:700}.room-roster-container[_ngcontent-%COMP%]{display:block;width:100%;min-height:42px}virtual-scroller[_ngcontent-%COMP%]{width:100%;height:100vh}'
        ]
      });
    }
  }
  return t;
})();
