pMe = (() => {
  class t {
    constructor(e, i, o, s) {
      ((this.appService = e),
        (this.soundEffectsService = i),
        (this.alertService = o),
        (this.elementRef = s),
        (this.openPrivateChat = new at()),
        (this.msgs = []),
        (this.isPresenter = !1),
        (this.showImageUpload = !1),
        (this.isChatSearching = !1),
        (this.chatSearchTerm = ''),
        (this.channel = 'offTopic'),
        (this.textAreaVal = ''),
        (this.showEmojiChooser = !1),
        (this.displayMode = 'r'),
        (this.canPost = !0),
        (this.canPostImages = !1),
        (this.showTyping = !1),
        (this.usersTyping = ''),
        (this.usersTypingCnt = 0),
        (this.lastTypedTime = new Date(0)),
        (this.typingDelayMillis = 5e3),
        (this.typingTimer = null),
        (this.amITyping = !1),
        (this.isConnected = !0),
        (this.isMediaConnected = !1),
        (this.isPrivateChat = !1),
        (this.chatEnabled = !0),
        (this.webinarMode = !1),
        (this.giphySearchTerm = ''),
        (this.giphyResults = []),
        (this.chatTabs = []),
        (this.unreadMsgs = {}),
        (this.unreadMentions = {}),
        (this.myname = ''),
        (this.showMessageOptions = !1),
        (this.showPMBtn = !1),
        (this.showChatToolbar = !1),
        (this.showChatToolbarExtended = !1),
        (this.imggurUploadTxt = ''),
        (this.extraChatMsg = !0),
        (this.sendingGif = !1),
        (this.appEventBus = this.appService.appEventBus),
        (this.guiEventBus = this.appService.guiEventBus));
    }
    ngOnInit() {
      this.appService.globals.preferences.extraChatColumn &&
        (this.loadChatMode(),
        this.guiEventBus.subscribe('resizeChatView', (e) => {
          this.showMessageOptions = this.chatWidth?.nativeElement?.offsetWidth >= 400;
        }),
        (this.isPresenter = this.appService.globals.isPresenter),
        (this.showPMBtn =
          (this.isPresenter ||
            this.appService.globals.sessData.userPM ||
            this.appService.globals.sessData.userToPresenterPM) &&
          !(
            this.appService.globals.user.isFT && this.appService.globals.sessData.disablePMForTrials
          )),
        this.appEventBus.subscribe('appDataReady', (e) => {
          (this.processSessData(),
            this.appService.sendServerCommand('getChatLog', {
              channel: 'offTopic',
              page: 0,
              extraChat: !0
            }));
        }),
        this.appEventBus.subscribe('socketDisconnected', (e) => {
          this.isConnected = !1;
        }),
        this.appEventBus.subscribe('socketConnected', (e) => {
          this.isConnected = !0;
        }),
        this.appEventBus.subscribe('mediaServerConnected', (e) => {
          ((this.isMediaConnected = !0), this.alertService.success('Connected to Media Server'));
        }),
        this.appEventBus.subscribe('mediaServerDisconnected', (e) => {
          ((this.isMediaConnected = !1),
            this.alertService.error('Disconnected from Media Server... reconnecting...'));
        }),
        this.appEventBus.subscribe('muteChat', (e) => {
          ((this.chatEnabled = !1), bootbox.alert(e));
        }),
        this.appEventBus.subscribe('unmuteChat', () => {
          ((this.chatEnabled = !0), this.alertService.success('Chat enabled'));
        }),
        this.guiEventBus.subscribe('changeChatMode', (e) => {
          ((this.chatEnabled = 'd' != e),
            (this.webinarMode = 'p' == e),
            setTimeout(() => {
              this.guiEventBus.emit('resizeChatView');
            }, 1e3));
        }),
        this.appEventBus.subscribe('chatMsg', (e) => {
          if (
            (e.c == this.channel
              ? this.appEventBus.emit('alwaysScrollToBottom')
              : (this.unreadMsgs[e.c] = this.unreadMsgs[e.c] ? this.unreadMsgs[e.c] + 1 : 1),
            e.isMention &&
              (e.c !== this.channel &&
                this.appService.globals.isPresenter &&
                (this.unreadMentions[e.c] = this.unreadMentions[e.c]
                  ? this.unreadMentions[e.c] + 1
                  : 1),
              this.appService.globals.preferences.doNotDisturbOn ||
                (this.appService.globals.preferences.chatSoundOn &&
                  this.soundEffectsService.pling.play(),
                this.appService.globals.preferences.chatPopup &&
                  (this.alertService.info(e.txt, 'Mention from @' + e.n, { enableHtml: !0 }),
                  window.Notification &&
                    Notification.requestPermission()
                      .then((i) => {
                        if ('granted' == i || 'default' == i) {
                          let s =
                            e.pic || 'https://secure.gravatar.com/avatar/' + e.avt + '?d=mm&s=50';
                          new Notification('Mention from @' + e.n, {
                            body: this.htmlToText(e.txt),
                            icon: s
                          });
                        }
                      })
                      .catch(function (i) {
                        console.error(i);
                      })))),
            !this.appService.globals.preferences.doNotDisturbOn &&
              this.appService.globals.preferences.chatSoundOn)
          ) {
            const { followedUsers: i } = this.appService.globals;
            try {
              i && Object.keys(i).length > 0 && i[e.avt].followChatStyle.playSound
                ? this.soundEffectsService.pling.play()
                : ((this.appService.globals.playChatMessageSoundFor &&
                    this.appService.globals.playChatMessageSoundFor.length > 0 &&
                    this.appService.hashEmail(this.appService.globals.user.email) !== e.avt &&
                    this.appService.globals.playChatMessageSoundFor.includes(e.avt)) ||
                    (this.appService.globals.sessData.dingOnNewMessage &&
                      this.appService.hashEmail(this.appService.globals.user.email) !== e.avt)) &&
                  this.soundEffectsService.followed.play();
            } catch {
              console.log('Error in chat.component for chatSoundOn');
            }
          }
        }),
        this.guiEventBus.subscribe('doMentionExtra', (e) => {
          if (e) {
            let i = ui('#textAreaTxtExtra').val().toString();
            i.length
              ? ui('#textAreaTxtExtra').val(i + ' @' + e + ' ')
              : ui('#textAreaTxtExtra').val('@' + e + ' ');
          }
        }),
        this.guiEventBus.subscribe('doUserInfo', (e) => {
          ui('#textAreaTxtExtra').val('');
        }),
        this.guiEventBus.subscribe('switchChatDisplayMode', (e) => {
          this.setOption(e);
        }),
        this.appEventBus.subscribe('switchChatChannelExtra', (e) => {
          ((this.channel = e),
            this.appService.sendServerCommand('getChatLog', { channel: e, page: 0, extraChat: !0 }),
            (this.canPost = !0),
            this.appService.globals.chatTabs.forEach((i) => {
              i.name != e ||
                'p' != i.type ||
                this.appService.globals.user.isPresenter ||
                this.appService.globals.user.hasAdminChat ||
                (this.canPost = !1);
            }));
        }),
        this.appEventBus.subscribe('typingUpdated', (e) => {
          console.log('typingUpdated: ', e);
          var i = this.channel;
          (i || (i = 'main'), P('chatCtrl typingUpdate.. mychan: ' + this.channel));
          try {
            var o = e[i];
            if (!o)
              return (
                P('typingUpdated nobody typing..'),
                void setTimeout(() => {
                  ((this.usersTyping = ''), (this.usersTypingCnt = 0));
                })
              );
            for (var s = '', r = o.length, a = 0; a < r; a++)
              ((s += o[a].n), a < r - 1 && (s += ','));
            setTimeout(() => {
              ((this.usersTyping = s),
                (this.usersTypingCnt = r),
                1 === r &&
                  this.guiEventBus.emit('scrollChatLogToBottom', { force: !0, repeat: !1 }));
            });
          } catch (c) {
            (console.error(c), (this.usersTyping = ''), (this.usersTypingCnt = 0));
          }
        }),
        this.appService.guiEventBus.subscribe('appHasFocusGetChatLogExtraChatColumn', () => {
          this.chatSearchTerm
            ? this.doSearchSubmit()
            : this.appService.sendServerCommand('getChatLog', {
                channel: this.channel,
                page: 0,
                extraChat: !0
              });
        }),
        this.processSessData());
    }
    ngAfterViewInit() {
      (P('chat comp after view init...'),
        this.guiEventBus.emit('scrollChatLogToBottom', { force: !0 }),
        this.elementRef?.nativeElement
          ?.querySelector('#textAreaTxtExtra')
          ?.addEventListener('input', this.onAutoExpand.bind(this)));
    }
    onAutoExpand(e) {
      if ('textareatxtextra' !== e.target.id.toLowerCase()) return !1;
      this.autoExpand(e.target);
    }
    autoExpand(e) {
      e.style.height = '0';
      const i = window.getComputedStyle(e),
        o = e.scrollHeight + 'px';
      (i.getPropertyValue('height') !== o && (e.style.height = o),
        '' === e.value.trim() && (e.style.height = '23px'));
    }
    toggleMessageOptions() {
      this.showMessageOptions = !0;
    }
    loadChatMode() {
      if (this.appService.globals.sessData.altChatRender)
        ((this.displayMode = 'c'), this.appService.setPreference('chatMode', this.displayMode));
      else {
        const e = this.appService.getPreference('chatMode');
        (e && (this.displayMode = e), this.appService.setPreference('chatMode', this.displayMode));
      }
      (this.guiEventBus.emit('scrollChatLogToBottom', { force: !0, repeat: !1 }),
        setTimeout(() => {
          this.guiEventBus.emit('resizeChatView');
        }, 1e3));
    }
    toggleChatToolbar() {
      (this.showChatToolbar && !this.showChatToolbarExtended
        ? (this.showChatToolbarExtended = !0)
        : ((this.showChatToolbar = !this.showChatToolbar),
          this.showChatToolbar && (this.showChatToolbarExtended = !0)),
        this.guiEventBus.emit('scrollChatLogToBottom', { force: !0 }));
    }
    toggleChatToolbarSearchOnly() {
      ((this.showChatToolbar && this.showChatToolbarExtended) ||
        (this.showChatToolbar = !this.showChatToolbar),
        (this.showChatToolbarExtended = !1),
        this.showChatToolbar &&
          setTimeout(() => {
            this.searchTermTxt &&
              this.searchTermTxt.nativeElement &&
              this.searchTermTxt.nativeElement.focus();
          }, 100),
        this.guiEventBus.emit('scrollChatLogToBottom', { force: !0 }));
    }
    refreshTypingStatus(e = !1) {
      const i = ui('#textAreaTxtExtra');
      if (
        e ||
        '' == i.val() ||
        !i.is(':focus') ||
        new Date().getTime() - this.lastTypedTime.getTime() > this.typingDelayMillis
      ) {
        let o = this.channel;
        (o || (o = 'main'),
          (this.amITyping = !1),
          this.appService.sendServerCommand('notyping', {
            c: o,
            uid: this.appService.globals.user.userXrefID,
            pm: null,
            pu: null
          }));
      }
    }
    updateLastTypedTime() {
      if (
        ((this.lastTypedTime = new Date()),
        this.typingTimer
          ? (clearTimeout(this.typingTimer),
            (this.typingTimer = setTimeout(
              this.refreshTypingStatus.bind(this),
              this.typingDelayMillis
            )))
          : (this.typingTimer = setTimeout(
              this.refreshTypingStatus.bind(this),
              this.typingDelayMillis
            )),
        !this.amITyping)
      ) {
        let e = this.channel;
        (e || (e = 'main'),
          (this.amITyping = !0),
          this.appService.sendServerCommand('typing', {
            c: e,
            n: this.appService.globals.user.nick || this.appService.globals.user.name,
            uid: this.appService.globals.user.userXrefID,
            pm: null,
            pu: null
          }));
      }
    }
    processSessData() {
      (this.appService.globals.sessData.smallerImagePreview &&
        !this.appService.globals.preferences.defaultImagePreview &&
        ((this.appService.globals.preferences.defaultImagePreview =
          this.appService.globals.sessData.smallerImagePreview),
        (this.appService.globals.preferences.smallImagePreview =
          this.appService.globals.sessData.smallerImagePreview),
        this.appService.setPreference(
          'defaultImagePreview',
          this.appService.globals.preferences.defaultImagePreview
        )),
        P('Chat Component, processing logged in data..tabs:', this.appService.globals.chatTabs),
        (this.isPresenter = this.appService.globals.isPresenter),
        (this.showTyping = this.appService.globals.sessData.hasTypingIndicator),
        (this.isPresenter || this.appService.globals.sessData.userUploads) &&
          (this.canPostImages = !0),
        (this.chatTabs = []),
        this.appService.globals.chatTabs.forEach((i) => {
          (('po' == i.type && (this.isPresenter || this.appService.globals.user.hasAdminChat)) ||
            'po' != i.type) &&
            this.chatTabs.push(i);
        }));
      let e = this.appService.globals.sessData.chatMode;
      ((this.chatEnabled = 'd' != e),
        (this.webinarMode = 'p' == e),
        this.appService.globals.decodedSessionToken.chatMuted &&
          ((this.chatEnabled = !1),
          this.appService.globals.decodedSessionToken.chatMutedTill &&
            (this.chatMutedTill = this.appService.globals.decodedSessionToken.chatMutedTill)),
        this.appService.globals.user.isFT &&
          this.appService.globals.sessData.chatDisabledForTrials &&
          (this.chatEnabled = !1),
        this.appService.globals.sessData.openLoginLink &&
          window.open(
            this.appService.globals.sessData.openLoginLink,
            '_blank',
            'resizable=yes,top=0,left=0,width=800,height=400'
          ));
    }
    changeChatMode(e, i) {
      if ((i.stopPropagation(), i.preventDefault(), this.appService.globals.sessData.chatMode == e))
        return;
      let o = '"Group Chat"?';
      ('p' == e ? (o = '"Webinar Mode"?') : 'd' == e && (o = '"Disabled"?'),
        bootbox.confirm('Are you sure you want to change the chat mode to ' + o, (s) => {
          s
            ? (P('changing mode...'),
              this.appService.sendServerAdminCommand('changeChatMode', { mode: e }))
            : P('mode not changed. currently:' + this.appService.globals.sessData.chatMode);
        }));
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
        this.guiEventBus.emit('setSearchTermExtra', {
          searchTerm: this.chatSearchTerm,
          channel: this.channel,
          type: 'chat'
        }),
        (this.appService.globals.chatSearchResultsExtra = []));
    }
    searchTermChanged(e) {
      e || this.clearSearchTerm();
    }
    doSearchSubmit(e = !1) {
      if (!this.chatSearchTerm) return;
      let i = {
        searchTerm: this.chatSearchTerm.replace('$', '\\$'),
        channel: this.channel,
        type: 'chat',
        del: e,
        extraChat: !0
      };
      (this.guiEventBus.emit('setSearchTermExtra', i),
        console.log('searchObj: ', i),
        this.appService.sendServerCommand('doChatLogSearch', i));
    }
    switchTheme(e) {
      this.guiEventBus.emit('switchTheme', e);
    }
    setOption(e) {
      (P(`ChatComp set mode to ${e}`),
        (this.displayMode = e),
        this.appService.setPreference('chatMode', e),
        this.guiEventBus.emit('scrollChatLogToBottom', { force: !0, repeat: !1 }));
    }
    switchChatChannelExtra(e) {
      (P(`ChatComp switch channel to ${e}`),
        (this.appService.globals.chatInputFocus = 'textAreaTxtExtra'),
        this.chatTabs.forEach((i, o) => {
          i.name == e &&
            ((this.channel = e),
            '' == this.channel || 0 == o
              ? ((this.channel = 'main'), this.appEventBus.emit('switchChatChannelExtra', 'main'))
              : this.appEventBus.emit('switchChatChannelExtra', this.channel),
            (this.unreadMsgs[this.channel] = 0),
            (this.unreadMentions[this.channel] = 0),
            this.doSearchSubmit());
        }));
    }
    showPrivateChat() {
      this.openPrivateChat.emit();
    }
    onKey(e) {
      if (13 == e.keyCode) {
        (e.preventDefault(), this.showTyping && this.refreshTypingStatus(!0));
        const i = ui('#textAreaTxtExtra');
        e.shiftKey
          ? (i.val(i.val()), this.autoExpand(e.target))
          : e.altKey
            ? (i.val(i.val() + '\n'), this.autoExpand(e.target))
            : ((this.showEmojiChooser = !1), this.sendMessage(), this.autoExpand(e.target));
      } else
        this.showTyping &&
          (0 === ui('#textAreaTxtExtra').val().trim().length
            ? this.refreshTypingStatus(!0)
            : this.updateLastTypedTime());
    }
    onKeydown(e) {
      e.preventDefault();
    }
    toggleEmojiPanel() {
      ((this.showEmojiChooser = !this.showEmojiChooser),
        this.showEmojiChooser && P('opening pop over'));
    }
    selectEmoji(e) {
      console.log(e);
      let i = ui('#textAreaTxtExtra').val() + e.emoji.native;
      (ui('#textAreaTxtExtra').val(i), (this.selectedEmoji = e.emoji));
    }
    sendMessage() {
      if (!this.canPost) return void bootbox.alert("Sorry, you can't post to this channel");
      let e = ui('#textAreaTxtExtra').val().toString().trim();
      if (!e) return !1;
      (this.appService.sendGrpChat(this.channel, e),
        ui('#textAreaTxtExtra').val(''),
        this.guiEventBus.emit('scrollChatLogToBottom', { force: !0, repeat: !1 }));
    }
    toggleGiphyPanel(e) {
      ((this.giphySearchPopOver = e), e.isOpen() ? e.close() : e.open());
    }
    searchGiphy() {
      const e = b_()({ https: !0, apiKey: this.appService.globals.giphy_api_key }),
        i = this.giphySearchTerm;
      (P('***** searchGiphy search: ' + i),
        e
          .search({ q: i, rating: 'pg' })
          .then((s) => {
            (console.log(s), (this.giphyResults = s.data));
          })
          .catch(console.error));
    }
    clearSearchGiphy() {
      (P('clearSearchGiphy...'), (this.giphySearchTerm = ''), (this.giphyResults = []));
    }
    sendGif(e, i) {
      this.sendingGif ||
        (this.giphySearchPopOver && this.giphySearchPopOver.close(),
        (this.sendingGif = !0),
        bootbox.confirm(
          `You sure you want to post this image:<br/><img src='${i}' style='width: 100%;'>`,
          (o) => {
            ((this.sendingGif = !1), o && this.appService.sendGrpChat(this.channel, i));
          }
        ));
    }
    imgUpload() {
      var e = this;
      ((vc = []),
        (this.imggurUploadTxt = ''),
        bootbox.dialog({
          message:
            "<div>\n      <label class='upload-area' style='width:100%;text-align:center;' for='fupload'>\n      <input id='fupload' name='fupload' type='file' style='display:none;' multiple='true' accept='image/*'>\n      <i class='fas fa-file-upload fa-3x'></i><br />\n      Click to select images to upload\n      </label>\n      <div id=\"filedrag\" class=\"filedrag\">or drop files here</div>\n      <br />\n      <div style='margin-left:5px !important;' id='fileList' class=\"fileList text-center\"></div>\n      </div><div class='clearfix'></div>\n      <div class=\"w-100 my-3\"><textarea class=\"form-control w-100\"  rows=\"2\" id=\"msg-text\" name=\"msg-text\" placeholder=\"Enter your message\"></textarea></div>\n      ",
          title: 'Image Upload',
          backdrop: !0,
          onEscape: !0,
          size: 'xl',
          buttons: {
            success: {
              label: 'Upload',
              className: 'btn-success',
              callback: function () {
                if (vc) {
                  const r = ui('#msg-text').val().trim();
                  e.doImagurFileListUpload(r);
                }
              }
            }
          }
        }));
      let o = document.getElementById('filedrag');
      (o.addEventListener('dragover', I2, !1),
        o.addEventListener('dragleave', I2, !1),
        o.addEventListener('drop', zB, !1),
        (o.style.display = 'block'),
        document.getElementById('fupload').addEventListener('change', zB, !1));
    }
    doImagurFileListUpload() {
      var e = this;
      return I(function* (i = '') {
        let o = vc.length;
        for (const [s, r] of vc.entries())
          (bootbox.hideAll(),
            bootbox.alert(
              `Uploading ${s}/${o}: ${r.name}. Please wait...<br><div style="text-align: center;"><i class="ml-2 fas fa-spinner fa-spin fa-3x"></i></div>`
            ),
            yield e.doImggurUpload(r, i, o - 1 !== s));
        (bootbox.hideAll(), vc.splice(0, o - 1));
      }).apply(this, arguments);
    }
    doImggurUpload(e, i = null, o = !1) {
      var s = this;
      return new Promise(function (r, a) {
        const l = `${s.appService.globals.upload_server}/image/${s.appService.globals.sessionID}`,
          c = s.appService.globals.cdn_upload_key;
        var h = new FormData();
        (h.append('image', e), h.append('name', e.name));
        var f = {
          async: !0,
          crossDomain: !0,
          url: l,
          method: 'POST',
          datatype: 'json',
          headers: { Authorization: 'Client-ID ' + c },
          processData: !1,
          contentType: !1,
          data: h,
          beforeSend: function (_) {
            P('Uploading... ' + e.name);
          },
          success: function (_) {
            (bootbox.hideAll(), P('imge link:' + _.data.link));
            let F = _.data.link;
            ((s.imggurUploadTxt += s.imggurUploadTxt && s.imggurUploadTxt.length > 0 ? ' ' + F : F),
              o ||
                (i && ((s.imggurUploadTxt += ' ' + i), ui('#textAreaTxtExtra').val('')),
                s.appService.sendGrpChat(s.channel, s.imggurUploadTxt),
                (s.imggurUploadTxt = '')),
              r(_));
          },
          error: function (_) {
            (bootbox.hideAll(), bootbox.alert('Upload Failed...'), a(_));
          }
        };
        ui.ajax(f).done(function (_) {
          (r(_), console.log('done resp:', _));
        });
      });
    }
    archiveChatDate(e) {
      this.appService.sendServerAdminCommand('archiveLogs', {
        type: 'chat',
        date: e,
        channel: this.channel
      });
    }
    archiveOptions() {
      const e = this;
      bootbox.dialog({
        message:
          '\n      <div>\n        <div style="text-align: center;">\n          <label for="date-archive" class="form-label">You can either archive all chats or select an older than date:</label>\n          <input type="date" id="date-archive-chat">\n        </div>\n      </div>\n      ',
        title: 'Archive Chat Messages',
        size: 'large',
        backdrop: !0,
        onEscape: !0,
        buttons: {
          cancel: {
            label: 'Close',
            className: 'btn btn-secondary',
            callback() {
              console.log('close archive chat messages');
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
              bootbox.confirm('Are you sure you want to archive the chats for everyone?', (o) => {
                o && (console.log('success archive all'), e.archiveChatDate(new Date()));
              });
            }
          },
          dateRange: {
            label: 'Archive Older than Selected Date',
            className: 'btn btn-success',
            callback() {
              const o = new Date(ui('#date-archive-chat').val());
              if (isNaN(o.getTime())) return (bootbox.alert('Please select a date.'), !1);
              bootbox.confirm(
                'Are you sure you want to archive the chats older than selected date?',
                (s) => {
                  s && (console.log('archive date: ', o), e.archiveChatDate(o));
                }
              );
            }
          }
        }
      });
    }
    setDND() {
      (P('setDND current :' + this.appService.globals.preferences.doNotDisturbOn),
        (this.appService.globals.preferences.doNotDisturbOn =
          !this.appService.globals.preferences.doNotDisturbOn));
    }
    onImagePaste(e) {
      const i = this,
        o = (e.clipboardData || e.originalEvent.clipboardData).items;
      let s = null;
      for (const r of o) 0 === r.type.indexOf('image') && (s = r.getAsFile());
      if (s) {
        if (!this.canPostImages) return !1;
        const r = URL.createObjectURL(s),
          a = ui('#textAreaTxtExtra').val().trim();
        bootbox.confirm({
          message:
            '<div class="text-center"><h4>Upload this image?</h4><img style="max-width:100%; max-height: 50vh;" src="' +
            r +
            '" /><div class="w-100 mt-3"><textarea class="form-control w-100"  rows="2" id="msg-text" name="msg-text" placeholder="Enter your message">' +
            a +
            '</textarea></div></div>',
          callback: (l) =>
            I(function* () {
              if (l) {
                const c = yield ui('#msg-text').val().trim();
                (console.log('msgTxt: ', c),
                  yield i.doImggurUpload(s, c),
                  console.log('ok, uploading...'));
              } else console.log('cancel uploading...');
            })()
        });
      }
    }
    toggleModOnlyFilter() {
      this.appService.sendServerCommand('getChatLog', {
        channel: this.channel,
        page: 0,
        extraChat: !0
      });
    }
    onTextareaFocus(e, i) {
      this.appService.globals.chatInputFocus = i;
    }
    decodeHtmlEntities(e) {
      const i = document.createElement('textarea');
      return ((i.innerHTML = e), i.value);
    }
    openRTEModal() {
      (this.appService.guiEventBus.emit('doRTEModal', {
        channel: this.channel,
        txt: ui('#textAreaTxtExtra')?.val()?.toString()?.trim() || ''
      }),
        ui('#textAreaTxtExtra')?.val(''));
    }
    htmlToText(e) {
      return e
        ? sf(
            this.decodeHtmlEntities(e)
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/<\/(div|p|h[1-6]|li|td|tr)\s*>/gi, '\n')
              .replace(/<img[^>]*>/gi, '[Image]')
          )
            .result.replace(/\n\s*\n/g, '\n')
            .replace(/^\s+|\s+$/g, '')
            .replace(/[ \t]+/g, ' ')
        : '';
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(Ir), be(fo), be(Yt));
      };
    }
    static {
      this.ɵcmp = ut({
        type: t,
        selectors: [['app-extra-chat']],
        viewQuery: function (i, o) {
          if ((1 & i && (Xt(I3e, 5), Xt(O3e, 5)), 2 & i)) {
            let s;
            (yt((s = Ft())) && (o.chatWidth = s.first),
              yt((s = Ft())) && (o.searchTermTxt = s.first));
          }
        },
        outputs: { openPrivateChat: 'openPrivateChat' },
        decls: 25,
        vars: 15,
        consts: [
          ['roomscroller', ''],
          ['emojiPanelDiv', ''],
          ['searchTermTxt', ''],
          ['chatWidthExtra', ''],
          ['giphyPickerPop', 'ngbPopover'],
          ['giphyPicker', ''],
          [1, 'chat', 'd-flex', 'flex-column', 'h-100', 2, 'overflow-y', 'hidden'],
          [1, 'bs-component'],
          [1, 'navbar', 'navbar-expand-lg', 'navbar-light', 'chat-nav', 'p-1', 'chatHeader'],
          [1, 'navbar-brand', 'ml-1', 'mr-1'],
          [1, 'fas', 'fa-comment'],
          [1, 'badge', 'badge-danger', 'ml-2'],
          [
            'role',
            'tablist',
            1,
            'nav',
            'nav-tabs',
            'flex-wrap',
            'flex-grow-1',
            'justify-content-center',
            'chatTabs'
          ],
          [1, 'nav', 'ml-auto', 'align-items-center'],
          [1, 'nav-item'],
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
          [1, 'shadow', 'p-2', 'w-100', 'chatToolbar', 2, 'margin-top', '0px'],
          [
            2,
            'overflow-y',
            'scroll',
            'overflow-x',
            'hidden',
            'height',
            '100%',
            3,
            'logType',
            'displayMode',
            'isPresenter',
            'extraChatMsg',
            'ngClass'
          ],
          [1, 'popoverClass'],
          [1, 'px-1', 'webinarMode'],
          ['id', 'textAreaHolder', 1, 'd-flex', 'align-items-center', 'textSendDiv'],
          [1, 'fas', 'fa-bell-slash'],
          ['data-bs-toggle', 'tab', 'role', 'tab', 1, 'nav-link', 3, 'click', 'ngClass'],
          [1, 'badge', 'badge-pill', 'badge-warning', 'ml-1', 'counterBadge'],
          [1, 'text-danger'],
          ['title', 'Open Private chat', 1, 'nav-link', 3, 'click'],
          [1, 'fas', 'fa-comments'],
          ['id', 'chat-settings', 1, 'w-100', 3, 'change', 'keydown.enter'],
          [1, 'form-group', 'm-0'],
          [1, 'input-group'],
          [
            'type',
            'text',
            'name',
            'chatSearchTermTxt',
            'placeholder',
            'Type your search term, then press Enter',
            'aria-label',
            'Search',
            'aria-describedby',
            'addon-search',
            'title',
            'Type your search term, then press Enter',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel'
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
            'clear-chat-input',
            'input-group-text',
            3,
            'click'
          ],
          [1, 'fas', 'fa-times'],
          [
            'id',
            'addon-chat-save',
            'title',
            'Save chat messages',
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
            'addon-chat-archive',
            'title',
            'Archive Chat Messages',
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
            'addon-chat-archive',
            'title',
            'Archive Chat Messages',
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
          [
            'placement',
            'top',
            'ngbTooltip',
            'Show only Moderators messages',
            1,
            'form-check',
            'text-white',
            'd-inline-block',
            'm-1',
            'mt-2'
          ],
          [
            'type',
            'checkbox',
            'id',
            'mod-only',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'change',
            'ngModel'
          ],
          ['for', 'mod-only', 1, 'form-check-label'],
          [1, 'dropdown', 'd-inline-block', 'm-1', 'group-chat-control'],
          [
            'type',
            'button',
            'data-bs-toggle',
            'dropdown',
            'aria-expanded',
            'false',
            1,
            'btn',
            'btn-secondary',
            'dropdown-toggle',
            'btn-sm'
          ],
          [1, 'dropdown-menu'],
          [3, 'click'],
          [1, 'dropdown-item'],
          [1, 'fas', 'fa-check-square', 'me-1', 3, 'ngClass'],
          [3, 'emojiSelect'],
          [
            'placement',
            'top',
            'ngbTooltip',
            'In webinar mode users only see their own chat messages, while Presenters see everyones messages...',
            1,
            'ml-2'
          ],
          [1, 'fas', 'fa-question-circle'],
          [1, 'd-flex', 'align-items-center', 'typing-indicator-container'],
          [1, 'users-count', 'me-1'],
          [1, 'users-typing'],
          [1, 'mx-1'],
          [1, 'flex-fill', 'd-flex', 'mx-0'],
          [1, 'px-0', 'flex-fill'],
          [
            'name',
            'txt-area',
            'id',
            'textAreaTxtExtra',
            'rows',
            '1',
            'spellcheck',
            'true',
            'placeholder',
            'Type your message here..',
            1,
            'txt-area',
            'form-control',
            'border-0',
            3,
            'keyup',
            'paste',
            'keydown.enter',
            'focus'
          ],
          [
            1,
            'justify-content-center',
            'd-flex',
            'flex-row',
            'align-items-center',
            'justify-content-center',
            'p-0',
            'm-0',
            'text-center',
            'textAreaBtnsCol'
          ],
          [1, 'textAreaBtns'],
          [1, 'textAreaBtns', 3, 'click'],
          ['ngbTooltip', 'Show message options', 'placement', 'left', 1, 'fas', 'fa-plus'],
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
            'textAreaBtns',
            3,
            'click',
            'ngbPopover'
          ],
          ['placement', 'left', 'ngbTooltip', 'Add Emojis', 1, 'far', 'fa-smile'],
          ['data-bs-toggle', 'modal', 'data-bs-target', '#play-youtube-modal', 1, 'textAreaBtns'],
          [
            'ngbTooltip',
            'Search for GIFs',
            'placement',
            'top',
            'placement',
            'auto',
            'container',
            'body',
            'autoClose',
            'outside',
            'popoverClass',
            'popOverDiv',
            'triggers',
            'manual',
            1,
            'textAreaBtns',
            2,
            'font-size',
            '12px',
            3,
            'ngbPopover'
          ],
          ['ngbTooltip', 'Upload an Image', 'placement', 'left', 1, 'fas', 'fa-image'],
          ['ngbTooltip', 'Play YouTube For All', 'placement', 'left', 1, 'fas', 'fa-video'],
          [
            'ngbTooltip',
            'Search for GIFs',
            'placement',
            'top',
            'placement',
            'auto',
            'container',
            'body',
            'autoClose',
            'outside',
            'popoverClass',
            'popOverDiv',
            'triggers',
            'manual',
            1,
            'textAreaBtns',
            2,
            'font-size',
            '12px',
            3,
            'click',
            'ngbPopover'
          ],
          [1, 'giphy-search'],
          [1, 'giphy-header'],
          [1, 'd-flex', 'align-items-center', 'justify-content-between'],
          ['type', 'button', 'aria-label', 'Close', 1, 'btn-close', 'btn-close-white', 3, 'click'],
          [1, 'giphy-hr'],
          [3, 'ngSubmit'],
          [1, 'form-group'],
          [
            'type',
            'text',
            'placeholder',
            'Search for a GIF',
            'name',
            'giphy',
            'aria-label',
            'Sizing example input',
            'aria-describedby',
            'inputGroup-sizing-sm',
            1,
            'form-control',
            'border',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [1, 'input-group-text', 'text-white', 3, 'click'],
          [1, 'fa', 'fa-2x', 'fa-times'],
          [1, 'search-results'],
          [1, 'gif-result'],
          [3, 'dblclick', 'src'],
          ['ngbTooltip', 'Rich Text Editor', 'placement', 'left', 1, 'fas', 'fa-font'],
          [1, 'chatDisabled', 'd-flex', 'align-items-center'],
          [1, 'pl-3'],
          [1, 'fas', 'fa-lock']
        ],
        template: function (i, o) {
          if (1 & i) {
            const s = Y();
            (d(0, 'div', 6)(1, 'div', 7)(2, 'nav', 8)(3, 'a', 9),
              T(4, 'i', 10),
              H(5, j3e, 2, 0, 'span')(6, V3e, 3, 0, 'span', 11),
              u(),
              H(7, G3e, 3, 0, 'ul', 12),
              d(8, 'ul', 13),
              H(9, W3e, 3, 0, 'li', 14),
              d(10, 'li', 15),
              x('click', function () {
                return (D(s), E(o.toggleChatToolbarSearchOnly()));
              }),
              d(11, 'a', 16),
              T(12, 'i', 17),
              u()(),
              d(13, 'li', 18),
              x('click', function () {
                return (D(s), E(o.toggleChatToolbar()));
              }),
              d(14, 'a', 19),
              T(15, 'i', 20),
              u()()()(),
              H(16, X3e, 11, 3, 'div', 21),
              u(),
              T(17, 'app-extra-roomscroller', 22, 0),
              H(19, J3e, 1, 0, 'ng-template', 23, 1, In)(21, Z3e, 5, 0, 'div', 24)(
                22,
                eMe,
                8,
                2,
                'div'
              )(
                23,
                cMe,
                8,
                1,
                'div',
                25
              )(24, uMe, 5, 1),
              u());
          }
          2 & i &&
            (m(5),
            O(5, 0 == o.chatTabs.length ? 5 : -1),
            m(),
            O(6, o.appService.globals.preferences.doNotDisturbOn ? 6 : -1),
            m(),
            O(7, o.chatTabs.length > 0 ? 7 : -1),
            m(2),
            O(9, o.showPMBtn ? 9 : -1),
            m(7),
            O(16, o.showChatToolbar ? 16 : -1),
            m(),
            z('logType', 'chat')('displayMode', o.displayMode)('isPresenter', o.isPresenter)(
              'extraChatMsg',
              o.extraChatMsg
            )(
              'ngClass',
              ct(
                13,
                B3e,
                o.appService.globals.preferences.smallImagePreview &&
                  o.appService.globals.preferences.defaultImagePreview
              )
            ),
            m(4),
            O(21, o.webinarMode ? 21 : -1),
            m(),
            O(22, o.showTyping && o.usersTypingCnt > 0 ? 22 : -1),
            m(),
            O(23, o.isConnected && o.chatEnabled ? 23 : 24));
        },
        dependencies: [Di, qs, ai, Ss, ti, Ws, Yn, as, tc, ha, el, l6, R3e, os],
        styles: [
          '.navbar[_ngcontent-%COMP%]{font-size:12px;padding:2px}.chatToolbar[_ngcontent-%COMP%], .chatHeader[_ngcontent-%COMP%]{background-color:var(--msgs-header-bg);color:var(--msgs-header-color)}.chatHeader[_ngcontent-%COMP%]   .dropdown-menu[_ngcontent-%COMP%]{background-color:var(--msgs-header-bg);border:none;border-radius:0 0 0 5px}.roomLog[_ngcontent-%COMP%]{height:100%;overflow-y:scroll}.chatDisabled[_ngcontent-%COMP%]{height:40px;min-height:40px;width:100%;background-color:#fff;color:#000}.webinarMode[_ngcontent-%COMP%]{background-color:#fff;color:#000;width:100%}.chat-header-nav[_ngcontent-%COMP%]{font-size:12px;min-height:30px}.chatHeader[_ngcontent-%COMP%]   .fas[_ngcontent-%COMP%], .chat-header-nav[_ngcontent-%COMP%]   .navbar-brand[_ngcontent-%COMP%]{font-size:16px}.menu-p-label[_ngcontent-%COMP%]{padding:5px;font-weight:100;font-size:12px}.chat-header-menu-settings[_ngcontent-%COMP%]{padding:0;margin:0;border:none;border-radius:0%;background-color:transparent}.chat-header[_ngcontent-%COMP%]{background-color:var(--chat-header-bg)!important;color:var(--chat-header-color)!important}.chat[_ngcontent-%COMP%]{background-color:var(--chat-bg)}.chat[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]   a[_ngcontent-%COMP%], .chat[_ngcontent-%COMP%]   .clear-chat-input[_ngcontent-%COMP%]{cursor:pointer}.list-of-msgs[_ngcontent-%COMP%]{height:calc(100% - 41px);overflow-y:scroll;background-color:var(--msgs-bg)}.textAreaBtns[_ngcontent-%COMP%]{padding:5px;color:var(--dark-gray)}.custom-file[_ngcontent-%COMP%]{display:none}.input-group-text[_ngcontent-%COMP%]{padding:0;margin:0}.textAreaBtnsCol[_ngcontent-%COMP%]{background-color:var(--textarea-bg)!important;color:var(--dark-gray)!important}.textAreaBtns[_ngcontent-%COMP%]{color:var(--textarea-holder-btns-color)!important}.textAreaBtns[_ngcontent-%COMP%]:hover{color:var(--textarea-holder-btns-hover-color)!important;cursor:pointer}.txt-area[_ngcontent-%COMP%]{border-radius:0;border:1px solid #ffffff;font-size:14px;resize:none;color:var(--textarea-color)!important;background-color:var(--textarea-bg)!important;outline:none;overflow-y:auto;margin-left:0;margin-right:0;padding-left:5px;padding-right:5px}.txt-area[_ngcontent-%COMP%]:focus{border-color:var(--darker-gray);box-shadow:1px 1px 1px var(--darker-gray)}#form-upload-img[_ngcontent-%COMP%]   .input-group-text[_ngcontent-%COMP%], #form-upload-img[_ngcontent-%COMP%]   .form-control[_ngcontent-%COMP%]{border-radius:0}.unreadIndicator[_ngcontent-%COMP%]{text-align:center;position:relative;top:30px;z-index:10;background-color:#9acd32}.white[_ngcontent-%COMP%]{color:#fff}.chat-nav[_ngcontent-%COMP%]{align-items:center;flex-wrap:nowrap;min-height:40px}.chatTabs[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{font-weight:700;font-size:12px;padding-left:5px;padding-right:5px;margin-right:5px;margin-bottom:0;padding-bottom:5px}ul.chatTabs[_ngcontent-%COMP%]{margin-bottom:0}.chatTabs[_ngcontent-%COMP%]{border-color:var(--modal-active-tab-border-color)!important}.chatTabs[_ngcontent-%COMP%]   .nav-link.active[_ngcontent-%COMP%]{border:1px solid var(--modal-active-tab-border-color)!important;border-bottom:none}.chatTabs[_ngcontent-%COMP%]   .nav-link[_ngcontent-%COMP%]:hover{border-color:var(--modal-active-tab-border-color)!important;cursor:pointer}.chatTabs[_ngcontent-%COMP%]   .nav-link.active[_ngcontent-%COMP%], .chatTabs[_ngcontent-%COMP%]   .nav-item.show[_ngcontent-%COMP%]   .nav-link[_ngcontent-%COMP%]{background-color:var(--modal-active-tab-bg-color)!important;color:var(--modal-active-tab-color)!important;cursor:default}.chatTabs[_ngcontent-%COMP%]   .nav-link.active[_ngcontent-%COMP%]:hover{cursor:default}.counterBadge[_ngcontent-%COMP%]{top:-5px;position:relative}.textAreaBtnSelected[_ngcontent-%COMP%]{background-color:#f1f2f3}.bs-popover-top[_ngcontent-%COMP%] > .arrow[_ngcontent-%COMP%]:after, .bs-popover-auto[x-placement^=top][_ngcontent-%COMP%] > .arrow[_ngcontent-%COMP%]:after{border-top-color:var(--modal-content-bg-color)}.giphy-search[_ngcontent-%COMP%]{width:400px;height:700px;border:2px solid var(--modal-content-bg-color);background-color:#fff;overflow:hidden}.giphy-search[_ngcontent-%COMP%]   .input-group-text[_ngcontent-%COMP%]{border:none;background-color:var(--modal-input-group-bg)}.giphy-search[_ngcontent-%COMP%]   .fa-times[_ngcontent-%COMP%]{font-size:16.5px;padding:10px}.giphy-search[_ngcontent-%COMP%]   .fa-times[_ngcontent-%COMP%]:hover{cursor:pointer;opacity:.85}.giphy-header[_ngcontent-%COMP%]{padding:10px;background-color:var(--modal-content-bg-color)}.search-results[_ngcontent-%COMP%]{overflow-y:auto;height:100%;padding:5px}.gif-result[_ngcontent-%COMP%]{text-align:center}.gif-result[_ngcontent-%COMP%]   img[_ngcontent-%COMP%]{cursor:pointer}.giphy-search[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]{padding:10px}.giphy-search[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]:hover{background-color:var(--modal-upload-files-color)}.giphy-search[_ngcontent-%COMP%]   h4[_ngcontent-%COMP%], .giphy-search[_ngcontent-%COMP%]   h6[_ngcontent-%COMP%]{color:var(--modal-content-color)}.giphy-hr[_ngcontent-%COMP%]{color:#fff;padding:0;margin:0 0 10px}#textAreaHolder[_ngcontent-%COMP%]{background-color:var(--textarea-bg);border-radius:8px;padding:5px;margin:5px}.typing-indicator-container[_ngcontent-%COMP%]{margin:0 8px;border-top:1px solid #ccc}.users-count[_ngcontent-%COMP%], .users-typing[_ngcontent-%COMP%]{color:#90949c;font-size:12px}.users-typing[_ngcontent-%COMP%]{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.users-typing[_ngcontent-%COMP%]   em[_ngcontent-%COMP%]{font-weight:700}#textAreaTxt[_ngcontent-%COMP%]{max-height:300px;width:100%}#textAreaTxt[_ngcontent-%COMP%], .textAreaBtnsCol[_ngcontent-%COMP%]{background-color:var(--textarea-bg)}img[_ngcontent-%COMP%]{max-width:100%}'
        ]
      });
    }
  }
  return t;
})();
