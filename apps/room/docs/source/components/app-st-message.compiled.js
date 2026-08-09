pu = (() => {
  class t {
    constructor(e, i) {
      ((this.appService = e),
        (this.alertsService = i),
        (this.badges = ''),
        (this.styleB = {}),
        (this.styleF = {}),
        (this.userChatB = {}),
        (this.userAlertB = {}),
        (this.userChatF = {}),
        (this.userAlertF = {}),
        (this.isND = !1),
        (this.canPM = !0),
        (this.canDeleteOwnMsg = !1),
        (this.invertTxtColor = {}),
        (this.hideAvatar = !1),
        (this.canDoPublicReply = !1),
        (this.showEmojiChooser = !1),
        (this.selectedEmoji = {}),
        (this.hashEmail = ''),
        (this.canEditMessage = !1),
        (this.hasCustomFollowedUserColors = !1),
        (this.pieData = []));
    }
    ngOnInit() {
      if (!this.msg) return;
      if (
        ((this.hashEmail = this.appService.hashEmail(this.appService.globals.user.email)),
        this.msg.bkgColor &&
          ((this.invertTxtColor = { color: this.msg.bkgColor, filter: 'invert(1)' }),
          (this.styleB = { 'background-color': this.msg.bkgColor })),
        this.msg.fontColor && (this.styleF.color = this.msg.fontColor),
        this.msg.txt.includes(`@${this.appService.globals.user.name}`) && (this.msg.isMention = !0),
        this.prevD &&
          ((this.prevD = new Date(this.prevD)),
          (this.msg.t = new Date(this.msg.t)),
          (this.isND = this.msg.t.getDay() != this.prevD.getDay())),
        this.appService.globals.preferences.chatBadges &&
          !this.appService.globals.sessData.presenterMsgsOnTheRight &&
          this.appService.globals.sessData.enableBadges &&
          this.msg.b &&
          this.msg.b.length &&
          (!this.appService.globals.sessData.showBadgesToPresentersOnly ||
            this.appService.globals.isPresenter))
      )
        for (let o = 0; o < this.msg.b.length; o++) {
          let r = this.appService.globals.sessData.badgesH[this.msg.b[o]];
          (r &&
            r.hasOwnProperty('darkTheme') &&
            r.darkTheme &&
            'darkTheme' === this.appService.globals.preferences.theme &&
            (r = this.appService.globals.sessData.badgesH[r.darkTheme]),
            r &&
              (this.badges +=
                r.hasOwnProperty('imgURL') && r.imgURL
                  ? '<img class="user-badge-img" src="' + r.imgURL + '" alt="' + r.imgURL + '"/>'
                  : '<span class="badge px-1 mx-1 user-badge" style="background-color: ' +
                    r.bkcolor +
                    '; color: ' +
                    r.color +
                    '" >' +
                    r.text +
                    '</span>'));
        }
      if (this.appService.globals.sessData.presenterSettings) {
        const o = this.appService.globals.sessData.presenterSettings[this.msg.avt];
        (o && o.color && o.bkgColor && (this.presenterColors = o),
          this.presenterColors &&
            ((this.invertTxtColor = { color: this.presenterColors.bkgColor, filter: 'invert(1)' }),
            (this.styleB = { 'background-color': this.presenterColors.bkgColor }),
            (this.styleF.color = this.presenterColors.color)));
      }
      const e = window.localStorage.getItem('chatStyle');
      if (e) {
        const o = JSON.parse(e);
        this.presenterColors
          ? ((this.invertTxtColor = {
              color: this.presenterColors.bkgColor,
              filter: 'invert(1)',
              fontSize: o.fontSize
            }),
            (this.styleF['font-size'] = o.fontSize + 'px'),
            (this.styleB = { 'background-color': this.presenterColors.bkgColor }),
            (this.styleF.color = this.presenterColors.color))
          : ((this.invertTxtColor = { color: o.usernameColor, fontSize: o.fontSize }),
            (this.styleF['font-size'] = o.fontSize + 'px'),
            (this.styleF.color = o.color),
            (this.styleB = { 'background-color': o.bgColor }));
      }
      const { followedUsers: i } = this.appService.globals;
      if (i && Object.keys(i).length > 0 && i[this.msg.avt]) {
        const o = i[this.msg.avt];
        o &&
          ((this.styleF['font-size'] = o.followChatStyle.fontSize + 'px'),
          (this.styleB = { 'background-color': o.followChatStyle.bgColor }),
          (this.styleF.color = o.followChatStyle.color),
          (this.invertTxtColor = {
            color: o.followChatStyle.usernameColor,
            fontSize: o.followChatStyle.fontSize
          }),
          (this.hasCustomFollowedUserColors = !0));
      }
      ((this.canPM =
        (this.appService.globals.isPresenter ||
          this.appService.globals.sessData.userPM ||
          (this.appService.globals.sessData.userToPresenterPM && this.msg.isA)) &&
        !(
          this.appService.globals.user.isFT && this.appService.globals.sessData.disablePMForTrials
        )),
        (this.canDeleteOwnMsg = this.appService.canDeleteOwnMessage(this.msg)),
        (this.canDoPublicReply =
          'chat' === this.logType &&
          this.appService.hashEmail(this.appService.globals.user.email) !== this.msg.avt &&
          (this.appService.globals.isPresenter ||
            this.appService.globals.sessData.usersPublicReply)),
        this.appService.globals.sessData.enableEditMessage &&
          'chat' === this.logType &&
          (this.canEditMessage =
            this.appService.hashEmail(this.appService.globals.user.email) === this.msg.avt ||
            (this.appService.globals.isPresenter && !this.msg.isA)),
        this.appService.globals.sessData.enableEditAlerts &&
          'alerts' === this.logType &&
          (this.canEditMessage = this.appService.globals.isPresenter),
        ((this.appService.globals.sessData.altChatRender &&
          ('chat' === this.logType || this.isQAMsg)) ||
          this.appService.globals.sessData.hideAvatars) &&
          (this.hideAvatar = !0));
    }
    ngAfterViewInit() {
      $('.msgMenu').on('hide.bs.dropdown', (e) => {
        (console.log('this.showEmojiChooser: ', this.showEmojiChooser),
          this.showEmojiChooser && e.preventDefault());
      });
    }
    invertTxtColorToggler(e, i) {
      const o = e.hasOwnProperty('fontSize') && '' !== e.fontSize;
      if (
        (o &&
          e.fontSize ===
            this.appService.globals.chatStyle[this.appService.globals.preferences.theme].color) ||
        (o &&
          e.fontSize ===
            this.appService.globals.presenterStyle[this.appService.globals.preferences.theme].color)
      )
        return {};
      if (o) {
        const s = Number(e.fontSize);
        e['font-size'] = 'name' === i ? s + 1 + 'px' : s - 2 + 'px';
      }
      return e;
    }
    openAlertSendReport(e) {
      e
        ? this.appService.guiEventBus.emit('doAlertSendReportModal', e)
        : bootbox.alert('No reports found.');
    }
    doMention(e) {
      this.appService.guiEventBus.emit(
        this.isQAMsg
          ? 'doQAMention'
          : this.appService.globals.preferences.extraChatColumn &&
              (this.extraChatMsg || 'textAreaTxtExtra' === this.appService.globals.chatInputFocus)
            ? 'doMentionExtra'
            : 'doMention',
        e
      );
    }
    doReply(e) {
      const i = this,
        o = bootbox.dialog({
          title: `<span class="do-private-reply"><strong>${e.n}:</strong> ${e.txt}</span>`,
          message: '<p>Choose between private or public reply.</p>',
          buttons: {
            cancel: {
              label: 'Cancel',
              className: 'btn-danger',
              callback() {
                console.log('Cancel button clicked');
              }
            },
            noclose: {
              label: 'Private Reply',
              className: 'btn-warning',
              callback: () => (
                i.doPrivateReply(e),
                o.modal('hide'),
                console.log('Private Reply button clicked'),
                !1
              )
            },
            ok: {
              label: 'Public Reply',
              className: 'btn-info',
              callback() {
                (i.doPublicReply(e), o.modal('hide'), console.log('Public Reply button clicked'));
              }
            }
          }
        });
    }
    doPrivateReply(e) {
      let i = this;
      bootbox.prompt({
        title: `<span class="do-private-reply"><strong>${e.n}:</strong> ${e.txt}</span>`,
        inputType: 'textarea',
        callback(o) {
          o &&
            (console.log('doPrivateReply msg: ', e),
            console.log('doPrivateReply reply: ', o),
            i.appService.sendChatReply(e.c, o, e.txt, e.n, e._id, e.uid));
        }
      });
    }
    markAsAnswered(e) {
      this.appService.markChatAnswered(e._id);
    }
    editMessage() {
      if ('chat' === this.logType) {
        if (
          this.appService.globals.sessData.enableRTE &&
          this.appService.globals.preferences.enableRTE &&
          this.appService.containsHtml(this.msg.txt)
        )
          return void this.appService.guiEventBus.emit('doRTEModalEdit', { msg: this.msg });
        bootbox.prompt({
          title: 'Edit chat message:',
          inputType: 'textarea',
          value: this.msg.txt,
          callback: (e) => {
            if (e) {
              const i = e.trim();
              this.appService.sendServerCommand('editChatMessage', {
                msgID: this.msg._id,
                newMsg: i
              });
            }
          }
        });
      } else
        bootbox.prompt({
          title: `Edit ${this.isQAMsg ? 'qa message' : 'alert'} by <strong>${this.msg.n}:</strong>`,
          inputType: 'textarea',
          value: this.msg.txt,
          callback: (i) => {
            if (i) {
              const o = i.trim();
              this.isQAMsg
                ? this.appService.sendServerCommand('editQAMessage', {
                    qaMsgID: this.qaMsgID,
                    msgIndex: this.msgIndex,
                    newAlertMsg: o
                  })
                : this.appService.sendServerCommand('editAlertMessage', {
                    alertID: this.msg._id,
                    newAlertMsg: o
                  });
            }
          }
        });
    }
    doPublicReply(e) {
      this.appService.guiEventBus.emit('doPublicReply', e);
    }
    doUserInfo(e, i) {
      (this.appService.getUserInfo(e, i),
        this.appService.guiEventBus.emit('doUserInfo', e),
        this.appService.globals.preferences.extraChatColumn &&
          (this.extraChatMsg || 'textAreaTxtExtra' === this.appService.globals.chatInputFocus) &&
          this.appService.guiEventBus.emit('doUserInfoExtra', this.extraChatMsg));
    }
    doMsgDelete(e, i) {
      (P('doMsgDelete: msgID:' + JSON.stringify(e)),
        i.shiftKey && (e.shiftDelete = !0),
        'chat' == this.logType
          ? this.appService.appEventBus.emit('doMsgDelete', e)
          : 'alerts' == this.logType
            ? this.isQAMsg
              ? this.appService.appEventBus.emit('doQAAlertDelete', {
                  msg: e,
                  qaMsgID: this.qaMsgID,
                  msgIndex: this.msgIndex
                })
              : this.appService.appEventBus.emit('doAlertDelete', e)
            : 'pc' == this.logType && this.appService.appEventBus.emit('doPCDelete', e));
    }
    usersDoMsgDelete(e, i) {
      (i?.shiftKey && (e.shiftDelete = !0),
        this.appService.appEventBus.emit('usersDoMsgDelete', e));
    }
    openAlertQAModal(e) {
      e &&
        (e.hasOwnProperty('unreadQA') && delete e.unreadQA,
        this.appService.guiEventBus.emit('openAlertQAModal', { msg: e, openModal: !0 }));
    }
    startPC(e) {
      this.appService.guiEventBus.emit('startPrivChat', {
        uid: e,
        isInit: !0,
        user: {
          uid: e,
          nick: this.msg.n,
          emailHash: this.msg.avt,
          pic: this.msg.pic,
          perms: this.msg.isA ? 'a' : 'r'
        }
      });
    }
    doShowMsgToAll(e) {
      this.appService.sendServerCommand('showMsgToAll', { msg: e });
    }
    addReaction() {
      ((this.showEmojiChooser = !0),
        console.log('this.popover: ', this.popover.isOpen()),
        $('.users-dropdown-options').on('click', (e) => {
          (console.log('event: ', e), e.stopPropagation());
        }));
    }
    addRemoveReaction(e) {
      (console.log('reaction key: ', e), (this.selectedEmoji = this.msg.r));
      let i = null;
      (this.selectedEmoji[e].clickedBy.length > 0 &&
      this.selectedEmoji[e].clickedBy.includes(this.hashEmail)
        ? ((i = {
            n: this.appService.globals.user.nick || this.appService.globals.user.name,
            emoji: this.selectedEmoji[e].emoji,
            remove: !0
          }),
          this.selectedEmoji[e].clickedBy.splice(
            this.selectedEmoji[e].clickedBy.indexOf(this.hashEmail),
            1
          ),
          0 === this.selectedEmoji[e].clickedBy.length && delete this.selectedEmoji[e])
        : (this.selectedEmoji[e].clickedBy.push(this.hashEmail),
          (i = {
            n: this.appService.globals.user.nick || this.appService.globals.user.name,
            emoji: this.selectedEmoji[e].emoji,
            remove: !1
          })),
        this.appService.manageChatReactions(
          this.isQAMsg ? this.qaMsgID : this.msg._id,
          this.selectedEmoji,
          i,
          this.logType,
          this.msgIndex
        ),
        (this.selectedEmoji = {}),
        setTimeout(() => {
          this.showEmojiChooser = !1;
        }, 500));
    }
    selectEmoji(e) {
      console.log('selectEmoji: ', e);
      let i = null;
      (this.msg.hasOwnProperty('r')
        ? ((this.selectedEmoji = this.msg.r),
          this.selectedEmoji[e.emoji.id]
            ? this.selectedEmoji[e.emoji.id].clickedBy.length > 0 &&
              this.selectedEmoji[e.emoji.id].clickedBy.includes(this.hashEmail)
              ? ((i = {
                  n: this.appService.globals.user.nick || this.appService.globals.user.name,
                  emoji: e.emoji.native,
                  remove: !0
                }),
                this.selectedEmoji[e.emoji.id].clickedBy.splice(
                  this.selectedEmoji[e.emoji.id].clickedBy.indexOf(this.hashEmail),
                  1
                ),
                0 === this.selectedEmoji[e.emoji.id].clickedBy.length &&
                  delete this.selectedEmoji[e.emoji.id])
              : (this.selectedEmoji[e.emoji.id].clickedBy.push(this.hashEmail),
                (i = {
                  n: this.appService.globals.user.nick || this.appService.globals.user.name,
                  emoji: e.emoji.native,
                  remove: !1
                }))
            : ((this.selectedEmoji[e.emoji.id] = {
                emoji: e.emoji.native,
                clickedBy: [this.hashEmail]
              }),
              (i = {
                n: this.appService.globals.user.nick || this.appService.globals.user.name,
                emoji: e.emoji.native,
                remove: !1
              })))
        : ((this.selectedEmoji[e.emoji.id] = {
            emoji: e.emoji.native,
            clickedBy: [this.hashEmail]
          }),
          (i = {
            n: this.appService.globals.user.nick || this.appService.globals.user.name,
            emoji: e.emoji.native,
            remove: !1
          })),
        this.appService.manageChatReactions(
          this.isQAMsg ? this.qaMsgID : this.msg._id,
          this.selectedEmoji,
          i,
          this.logType,
          this.msgIndex
        ),
        (this.selectedEmoji = {}),
        setTimeout(() => {
          this.showEmojiChooser = !1;
        }, 500));
    }
    checkMsgReactions(e) {
      return !!e.hasOwnProperty('r') && Object.keys(e.r).length > 0;
    }
    onPopoverOpen() {
      ((this.showEmojiChooser = !0),
        console.log('onPopoverOpen this.showEmojiChooser: ', this.showEmojiChooser));
    }
    onPopoverClose() {
      (setTimeout(() => {
        this.showEmojiChooser = !1;
      }, 500),
        console.log('onPopoverClose this.showEmojiChooser: ', this.showEmojiChooser));
    }
    copyMessage() {
      ((this.msg.txt = sf(this.msg.txt).result),
        console.log('copyMessage: ', this.msg.txt),
        navigator.clipboard.writeText(this.msg.txt),
        this.alertsService.info('Copied to clipboard.'));
    }
    kickUser() {
      var e = this;
      return I(function* (i = !1) {
        let o = e.appService.getPreference('kickMsg');
        o || (o = 'You have been kicked from the room by an administrator');
        const s = yield e.appService.invokeServerCommand('userInfoDB', {
          uid: e.msg.uid,
          rid: e.msg.rid
        });
        let r = s.user;
        (s.userXref &&
          ((r = s.userXref), (r.nick = s.userXref.userName), (r.userXrefID = s.userXref._id)),
          r
            ? bootbox.prompt({
                value: o,
                title: 'Enter the kick message for this user',
                inputType: 'textarea',
                callback: (a) => {
                  a &&
                    ((o = a),
                    e.appService.sendServerAdminCommand('kickUser', {
                      user: r,
                      msg: o,
                      ban: i,
                      kickAllInstances: !1
                    }),
                    e.appService.setPreference('kickMsg', o),
                    bootbox.alert('User kicked OK'));
                }
              })
            : bootbox.alert('Could not retrieve user info.'));
      }).apply(this, arguments);
    }
    muteChat(e) {
      var i = this;
      return I(function* () {
        const o = yield i.appService.invokeServerCommand('userInfoDB', {
          uid: i.msg.uid,
          rid: i.msg.rid
        });
        let s = o.user;
        (o.userXref &&
          ((s = o.userXref), (s.nick = o.userXref.userName), (s.userXrefID = o.userXref._id)),
          s
            ? bootbox.confirm({
                message: 'Are you sure you want to mute this user for 24 hours?',
                callback: (r) => {
                  r &&
                    (i.appService.sendServerAdminCommand('muteChat', { user: s, time: e }),
                    bootbox.alert('User chat muted.'));
                }
              })
            : bootbox.alert('Could not retrieve user info.'));
      })();
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(fo));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-st-message']],
        viewQuery: function (i, o) {
          if ((1 & i && Xt(cge, 5), 2 & i)) {
            let s;
            yt((s = Ft())) && (o.popover = s.first);
          }
        },
        inputs: {
          msg: 'msg',
          isP: 'isP',
          logType: 'logType',
          prevD: 'prevD',
          isQAMsg: 'isQAMsg',
          msgIndex: 'msgIndex',
          qaMsgID: 'qaMsgID',
          extraChatMsg: 'extraChatMsg',
          sessName: 'sessName'
        },
        decls: 5,
        vars: 2,
        consts: [
          ['emojiPanelDiv', ''],
          ['popover', 'ngbPopover'],
          [1, 'popoverClass'],
          [1, 'separator'],
          [1, 'msg-box', 'pb-1', 3, 'ngClass', 'ngStyle'],
          [3, 'emojiSelect'],
          [3, 'ngStyle'],
          ['clas', 'd-flex flex-column  align-items-center w-100 '],
          [1, 'mr-1', 'd-flex', 'flex-row-reverse'],
          [
            1,
            'd-flex',
            'flex-row-reverse',
            'justify-content-center',
            'align-items-start',
            'flex-nowrap',
            'mt-1'
          ],
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
            'pt-1',
            3,
            'ngStyle'
          ],
          ['aria-labelledby', 'dropdownMenuLink', 1, 'dropdown-menu', 'users-dropdown-options'],
          [1, 'dropdown-item', 3, 'click'],
          [1, 'fas', 'fa-user'],
          [1, 'fas', 'fa-reply'],
          [1, 'dropdown-item'],
          [
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#alert-send-report-modal',
            1,
            'dropdown-item'
          ],
          ['data-bs-toggle', 'modal', 'data-bs-target', '#replyModal', 1, 'dropdown-item'],
          [
            'container',
            'body',
            'autoClose',
            'outside',
            'popoverClass',
            'popOverDiv',
            1,
            'dropdown-item',
            3,
            'ngbPopover'
          ],
          [1, 'avatar', 'pl-1'],
          [1, 'w-100'],
          [1, 'd-flex', 'justify-content-between', 'align-items-center', 'w-100'],
          ['placement', 'top', 1, 'created-at', 'mx-2', 3, 'ngbTooltip', 'ngStyle'],
          [1, 'd-flex', 'align-items-center', 'justify-content-between', 'flex-nowrap'],
          [1, 'username', 'mx-1', 3, 'click', 'dblclick', 'ngStyle'],
          [
            1,
            'd-inline-block',
            'flex-shrink-1',
            2,
            'overflow',
            'hidden',
            3,
            'innerHTML',
            'ngStyle'
          ],
          [1, 'd-flex', 3, 'ngClass'],
          [1, 'ms-1', 'private-reply'],
          [
            1,
            'msg-left',
            'text-formated',
            'preText',
            'ml-2',
            'mr-2',
            'p-0',
            3,
            'ngStyle',
            'ngClass',
            'innerHTML'
          ],
          [1, 'ms-1', 3, 'ngClass', 'ngStyle'],
          [1, 'fas', 'fa-trash'],
          [1, 'dropdown-divider'],
          [1, 'fa', 'fa-comment-slash'],
          [1, 'fas', 'fa-envelope-open'],
          [
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#alert-send-report-modal',
            1,
            'dropdown-item',
            3,
            'click'
          ],
          [1, 'fas', 'fa-chart-pie'],
          [
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#replyModal',
            1,
            'dropdown-item',
            3,
            'click'
          ],
          [1, 'fas', 'fa-comment'],
          [1, 'fas', 'fa-check'],
          [
            'container',
            'body',
            'autoClose',
            'outside',
            'popoverClass',
            'popOverDiv',
            1,
            'dropdown-item',
            3,
            'click',
            'shown',
            'hidden',
            'ngbPopover'
          ],
          ['placement', 'left', 'ngbTooltip', 'Add Reaction', 1, 'far', 'fa-smile'],
          [1, 'fas', 'fa-edit'],
          [1, 'fas', 'fa-copy'],
          [1, 'fas', 'fa-comments'],
          [1, 'avatar', 'pl-1', 3, 'click'],
          ['alt', 'msg.avt', 3, 'src'],
          [
            1,
            'msg-left',
            'text-formated',
            'preText',
            'ml-2',
            'mr-2',
            'p-0',
            'pe-3',
            'w-100',
            3,
            'ngClass',
            'ngStyle'
          ],
          [1, 'private-reply-message', 'w-100', 3, 'ngClass'],
          [1, 'd-block', 'username', 3, 'ngStyle'],
          [3, 'ngStyle', 'ngClass', 'innerHTML'],
          [3, 'innerHTML'],
          [4, 'ngFor', 'ngForOf'],
          [
            'placement',
            'auto',
            'container',
            'body',
            'autoClose',
            'outside',
            'popoverClass',
            'popOverDiv',
            1,
            'badge',
            'chat-reaction',
            3,
            'ngbPopover'
          ],
          [1, 'badge', 'chat-reaction', 3, 'ngClass'],
          [1, 'badge', 'chat-reaction', 3, 'click', 'ngClass'],
          [
            'placement',
            'auto',
            'container',
            'body',
            'autoClose',
            'outside',
            'popoverClass',
            'popOverDiv',
            1,
            'badge',
            'chat-reaction',
            3,
            'click',
            'ngbPopover'
          ],
          [1, 'mr-1', 'd-flex', 'flex-row'],
          [1, 'd-flex', 'justify-content-center', 'align-items-start', 'flex-nowrap', 'mt-1'],
          [
            1,
            'd-flex',
            'align-items-center',
            'justify-content-between',
            'flex-nowrap',
            3,
            'ngStyle'
          ],
          [1, 'username', 'mx-1', 3, 'click', 'dblclick', 'ngClass', 'ngStyle'],
          [1, 'd-inline-block', 'flex-shrink-1', 2, 'overflow', 'hidden', 3, 'innerHTML'],
          [1, 'badge', 'bg-danger', 'trial-badge'],
          [1, 'badge', 'bg-warning', 'new-badge'],
          [1, 'stars-container', 3, 'ngStyle'],
          [1, 'ms-1', 'badge', 'text-bg-secondary'],
          [1, 'd-flex'],
          [1, 'fas', 'fa-star', 'stars-icon'],
          [1, 'stars-num'],
          [
            'title',
            'Ask a question',
            1,
            'btn',
            'btn-sm',
            'btn-secondary',
            'me-1',
            'alert-qa',
            3,
            'ngClass',
            'ngStyle'
          ],
          [1, 'created-at', 'mr-2', 3, 'ngStyle'],
          [
            'title',
            'Ask a question',
            1,
            'btn',
            'btn-sm',
            'btn-secondary',
            'me-1',
            'alert-qa',
            3,
            'click',
            'ngClass',
            'ngStyle'
          ],
          [1, 'me-1'],
          [1, 'fas', 'fa-question-circle'],
          [
            1,
            'msg-left',
            'text-formated',
            'preText',
            'ml-2',
            'mr-2',
            'p-0',
            'pe-3',
            'w-100',
            3,
            'ngStyle'
          ]
        ],
        template: function (i, o) {
          (1 & i &&
            H(0, gge, 1, 0, 'ng-template', 2, 0, Rn)(2, _ge, 4, 5, 'div', 3)(
              3,
              Bge,
              39,
              34,
              'div',
              4
            )(4, f_e, 41, 31),
            2 & i &&
              (m(2), O(2, o.isND ? 2 : -1), m(), O(3, o.msg.isA && 'alert' != o.logType ? 3 : 4)));
        },
        dependencies: [Di, Cr, Rl, tc, ha, el, os, Cd, Rr, ww, Tw],
        styles: [
          '@charset "UTF-8";.msg-box[_ngcontent-%COMP%]{font-weight:100;font-size:16px;word-wrap:normal;text-align:inherit;width:100%;background-color:var(--msgs-bg);border-top:1px solid var(--msg-border-color)}.msg-box-adm[_ngcontent-%COMP%]{background-color:var(--msgs-bg-adm);border-bottom:2px;padding-top:2px}.private-reply[_ngcontent-%COMP%]{font-size:12px}.private-reply-message[_ngcontent-%COMP%]{border-left:2px solid #00bc8c;margin-left:10px;margin-bottom:3px;padding:3px 3px 3px 5px}.private-reply-bg-light[_ngcontent-%COMP%]{background-color:#f4f4f4}.private-reply-bg-dark[_ngcontent-%COMP%]{background-color:#161515}@keyframes _ngcontent-%COMP%_slideInRight{0%,40%{transform:scale(0);transform-origin:bottom right}40%,to{transform:scale(1);transform-origin:bottom right}}.avatar[_ngcontent-%COMP%]{display:inline}.avatar[_ngcontent-%COMP%]   img[_ngcontent-%COMP%]{width:35px;height:35px;object-fit:cover}.username[_ngcontent-%COMP%]{cursor:pointer;font-size:14px;color:var(--username-color);font-weight:900}.msg-left[_ngcontent-%COMP%], .msg-right[_ngcontent-%COMP%]{color:var(--msg-color);word-break:break-word}.msg-right[_ngcontent-%COMP%]{text-align:right;margin-right:5px;padding-left:10px}.presenter-msg-right[_ngcontent-%COMP%]{text-align:right!important;margin-right:5px;padding-left:10px}.presenter-reactions-right[_ngcontent-%COMP%]{text-align:right!important;margin-right:50px;display:inline-block;width:100%}.alert-qa[_ngcontent-%COMP%]{font-size:10px;padding:1px 3px}.msg-left[_ngcontent-%COMP%]{text-align:left;margin-left:5px;padding-right:10px}.created-at[_ngcontent-%COMP%]{font-size:12px;color:var(--date-color);overflow:hidden;font-weight:600}.options-left[_ngcontent-%COMP%]{right:0}.options-right[_ngcontent-%COMP%]{left:0}.options[_ngcontent-%COMP%]{display:none;opacity:0;position:absolute;top:0}.options[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]{color:var(--dark-brown);border:1px solid var(--border-color);padding:2px 8px;min-width:30px;min-height:20px;cursor:pointer}.options[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:first-child{border-top-left-radius:5px;border-bottom-left-radius:5px}.options[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:last-child{border-top-right-radius:5px;border-bottom-right-radius:5px}.options[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:hover{color:var(--dark-black)}.options[_ngcontent-%COMP%]   i[_ngcontent-%COMP%]{font-size:16px}.bubble-box-left[_ngcontent-%COMP%]:hover   .options[_ngcontent-%COMP%], .bubble-box-right[_ngcontent-%COMP%]:hover   .options[_ngcontent-%COMP%]{display:block;z-index:1000;opacity:1}.smallChatLog[_ngcontent-%COMP%]{font-size:16px;font-weight:200}.smallChatLogBkg[_ngcontent-%COMP%]{background-color:var(--light-black)}.smallChatLog[_ngcontent-%COMP%]   img[_ngcontent-%COMP%]{max-width:16px;max-height:16px}.img-container[_ngcontent-%COMP%]{text-align:left;cursor:pointer;display:inline-flex;padding:3px}.uploaded-img[_ngcontent-%COMP%]{max-width:300px;max-height:300px}.msg-left[_ngcontent-%COMP%], .msg-right[_ngcontent-%COMP%]{float:inherit!important}.imgur-modal[_ngcontent-%COMP%]{text-align:center}.imgur-modal[_ngcontent-%COMP%]   .modal-dialog[_ngcontent-%COMP%]{max-width:90%;max-height:90%}.imgur-modal[_ngcontent-%COMP%]   img[_ngcontent-%COMP%]{width:inherit;height:inherit;max-width:100%;max-height:calc(100vh - 150px)}.preText[_ngcontent-%COMP%]{white-space:pre-wrap}.text-formated[_ngcontent-%COMP%]{font-size:13px}.chatNameAvatar[_ngcontent-%COMP%]{display:inline}.menuTrigger[_ngcontent-%COMP%]{margin-top:15px}.menuTriger[_ngcontent-%COMP%]:after{content:"\\2807";font-size:20px;color:var(--username-color);vertical-align:middle;border:none;padding-left:5px}.msgMenu[_ngcontent-%COMP%]{padding-left:5px;font-size:20px;font-weight:600;color:var(--username-color)!important}.msgMenu[_ngcontent-%COMP%]:hover{color:var(--light-brown)!important;font-weight:900;cursor:pointer}.chatDPMenu[_ngcontent-%COMP%]{font-size:12px;text-align:left}.chat-stars[_ngcontent-%COMP%]{font-size:8px;vertical-align:text-top!important}span.chat-stars[_ngcontent-%COMP%]{margin-top:2px;margin-left:2px;display:inline-block}span.chat-stars[_ngcontent-%COMP%]{color:var(--username-color)}.stars-container[_ngcontent-%COMP%]{position:relative}.stars-container[_ngcontent-%COMP%]   .stars-icon[_ngcontent-%COMP%]{color:var(--msg-color)}.stars-num[_ngcontent-%COMP%]{position:absolute;color:var(--msgs-bg);left:6px;top:5px;font-size:10px;font-weight:700}a[_ngcontent-%COMP%]{color:var(--light-black)}.separator[_ngcontent-%COMP%]{display:flex;align-items:center;text-align:center;background-color:var(--msgs-separator-bg)!important}.separator[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{color:var(--msgs-separator-color)!important;margin:0 auto;font-size:13px}.msg-box[_ngcontent-%COMP%]:hover   .chat-reaction-hover[_ngcontent-%COMP%]{display:inline-block}.chat-reaction-hover[_ngcontent-%COMP%]{display:none}'
        ]
      });
    }
  }
  return t;
})();
