fEe = (() => {
  class t {
    constructor(e, i, o, s) {
      ((this.appService = e),
        (this.soundEffectsService = i),
        (this.alertService = o),
        (this.elementRef = s),
        (this.msgs = []),
        (this.isPresenter = !1),
        (this.showImageUpload = !1),
        (this.isChatSearching = !1),
        (this.pmSearchTerm = ''),
        (this.currUser = ''),
        (this.textAreaVal = ''),
        (this.showEmojiChooser = !1),
        (this.displayMode = 'r'),
        (this.canPost = !0),
        (this.canPostImages = !1),
        (this.isConnected = !0),
        (this.isPrivateChat = !1),
        (this.chatEnabled = !0),
        (this.webinarMode = !1),
        (this.giphySearchTerm = ''),
        (this.giphyResults = []),
        (this.sendingGif = !1),
        (this.chatTabs = []),
        (this.unreadMsgs = {}),
        (this.notificationInterval = null),
        (this.myname = ''),
        (this.user = null),
        (this.showPMToolbar = !1),
        (this.privChatVisible = !1),
        (this.getAllPCLogsLoading = !1),
        (this.getAllPCLogsLoaded = !1),
        (this.recvdUser = null),
        (this.imggurUploadTxt = ''));
    }
    ngOnInit() {
      ((this.isPresenter = this.appService.globals.isPresenter),
        (this.isPresenter || this.appService.globals.sessData.userUploads) &&
          (this.canPostImages = !0),
        this.appService.appEventBus.subscribe('getAllPCLogsLoading', (e) => {
          this.getAllPCLogsLoading = !0;
        }),
        this.appService.guiEventBus.subscribe('privChatVisible', (e) => {
          (this.pcLogsLoaded(), (this.privChatVisible = e));
        }),
        this.appService.appEventBus.subscribe('getAllPCLogs', (e) => {
          ((this.chatTabs = e),
            (this.getAllPCLogsLoading = !1),
            this.appService.loadRoster(),
            console.log('getAllPCLogs this.chatTabs: ', this.chatTabs));
        }),
        this.appService.appEventBus.subscribe('getRoster', () => {
          this.checkUserOnlineStatus();
        }),
        this.appService.appEventBus.subscribe('onUserJoin', (e) => {
          if (this.privChatVisible && this.chatTabs && this.chatTabs.length > 0)
            for (const i of this.chatTabs) i.uid === e.userXrefID && (i.online = !0);
        }),
        this.appService.appEventBus.subscribe('onUserLeave', (e) => {
          if (this.privChatVisible && this.chatTabs && this.chatTabs.length > 0)
            for (const i of this.chatTabs) i.uid === e.userXrefID && (i.online = !1);
        }),
        this.appService.guiEventBus.subscribe('PCfocusOnUser', (e) => {
          (this.pcLogsLoaded(), this.focusOnUser(e.uid, e.isInit, e.user));
        }),
        this.appService.guiEventBus.subscribe('PCnewMessage', (e) => {
          (this.pcLogsLoaded(), this.newMessage(e));
        }),
        this.appService.guiEventBus.subscribe('PCLoadMore', (e) => {
          this.loadPClogForUID(e.uid || this.currUser, e.page);
        }),
        this.appService.appEventBus.subscribe('getPCLog', (e) => {
          e.peerID == this.currUser &&
            ((this.msgs = this.appService.globals.privChatLog[e.peerID]),
            0 == e.page &&
              this.appService.appEventBus.emit('scrollPCLogToBottom', { force: !0, repeat: !0 }));
        }),
        this.appService.appEventBus.subscribe('doPCLogSearch', (e) => {
          ((this.msgs = this.appService.globals.privChatSearchResults),
            this.appService.appEventBus.emit('scrollPCLogToBottom', { force: !0, repeat: !0 }));
        }));
    }
    ngAfterViewInit() {}
    pcLogsLoaded() {
      this.getAllPCLogsLoaded ||
        (this.appService.sendServerCommand('getAllPCLogs', null), (this.getAllPCLogsLoaded = !0));
    }
    deleteThisPM() {
      bootbox.confirm('Are you sure you want to delete all messages in this chat?', (e) => {
        if (e) {
          this.appService.sendServerCommand('deletePeerPCLog', { peerID: this.currUser });
          let i = this.getTabForUID(this.currUser);
          (i && this.chatTabs.splice(this.chatTabs.indexOf(i), 1),
            (this.user = null),
            (this.recvdUser = null),
            (this.currUser = ''),
            this.appService.loadRoster());
        }
      });
    }
    deleteAllPM() {}
    onAutoExpand(e) {
      if ('textareatxtpm' !== e.target.id.toLowerCase()) return !1;
      this.autoExpand(e.target);
    }
    autoExpand(e) {
      (P('autoExpand:'), (e.style.height = '0'));
      const i = window.getComputedStyle(e),
        o = e.scrollHeight + 2 + 'px';
      (i.getPropertyValue('height') !== o &&
        ((e.style.height = o),
        (this.elementRef.nativeElement.querySelector('.pc-messages').style.height =
          `calc(100% - ${o} - 15px)`)),
        '' === e.value.trim() &&
          ((e.style.height = '23px'),
          (this.elementRef.nativeElement.querySelector('.pc-messages').style.height =
            'calc(100% - 50px)')));
    }
    checkUserOnlineStatus() {
      if (this.privChatVisible && this.appService.globals.roster && this.chatTabs)
        for (const e of this.appService.globals.roster)
          for (const i of this.chatTabs) i.uid === e.userXrefID && (i.online = !0);
    }
    focusOnUser(e, i, o) {
      P('privchat comp focus on uid:' + e + '. user:', o);
      let s = !1;
      for (let r of this.chatTabs)
        if (r.uid == e) {
          ((r.online = !0),
            this.switchChatToUser(r.uid, o),
            (s = !0),
            (this.msgs = this.appService.globals.privChatLog[e]),
            this.appService.appEventBus.emit('scrollPCLogToBottom', { force: !0, repeat: !0 }));
          break;
        }
      s ||
        (this.chatTabs.push({
          name: o.nick,
          uid: e,
          avt: o.emailHash,
          pic: o.pic,
          unread: 0,
          isA: 'a' == o.perms,
          online: !0
        }),
        i && this.switchChatToUser(e, o));
    }
    closePanel() {
      (this.appService.guiEventBus.emit('PCClosePanel'),
        this.notificationInterval &&
          (clearInterval(this.notificationInterval),
          (document.title = this.appService.globals.sessionName)),
        (this.user = null),
        (this.recvdUser = null),
        (this.currUser = ''));
    }
    switchChatToUser(e, i) {
      (this.loadPClogForUID(e),
        this.appService.guiEventBus.emit('PCswitchChatToUser', e),
        (this.currUser = e));
      let o = this.appService.globals.privChatLog[e];
      (o || (this.appService.globals.privChatLog[e] = []), (this.msgs = o));
      let s = this.getTabForUID(e);
      (s &&
        ((s.unread = 0),
        this.notificationInterval && clearInterval(this.notificationInterval),
        s.unread || (document.title = this.appService.globals.sessionName)),
        (this.user = s),
        (this.recvdUser = { ...i, ...this.user }),
        this.appService.appEventBus.emit('scrollPCLogToBottom', { force: !0, repeat: !0 }));
    }
    closeTab(e) {
      ((this.user = null),
        (this.recvdUser = null),
        (this.currUser = ''),
        console.log('closeTab with uid: ', e));
    }
    loadPClogForUID(e, i = 0) {
      this.appService.sendServerCommand('getPCLog', { page: i, peerID: e });
    }
    setDND() {
      (P('setDND current :' + this.appService.globals.preferences.doNotDisturbOn),
        (this.appService.globals.preferences.doNotDisturbOn =
          !this.appService.globals.preferences.doNotDisturbOn));
    }
    getTabForUID(e) {
      for (let i of this.chatTabs) if (i.uid == e) return i;
      return null;
    }
    newMessage(e) {
      this.notificationInterval && clearInterval(this.notificationInterval);
      let i = e.isMine ? e.recvdID : e.uid,
        o = this.getTabForUID(i),
        s = 0;
      if (o)
        if (this.currUser != i) {
          if (this.chatTabs.length > 0 && !e.isMine) {
            for (let [a, l] of this.chatTabs.entries())
              l.uid == o.uid && (o = this.chatTabs.splice(a, 1)[0]);
            (this.chatTabs.push(o),
              (this.recvdUser = this.recvdUser ? this.recvdUser : o),
              this.appService.loadRoster());
          }
          (o.unread++,
            P('privChatComp newMessage. tab already there. inc unread:' + o.unread),
            !this.appService.globals.preferences.doNotDisturbOn &&
              this.appService.globals.preferences.chatPopup &&
              (this.alertService.info(e.txt, 'Message from ' + e.n, { enableHtml: !0 }),
              window.Notification) &&
              new Notification('Message from ' + e.n, {
                body: e.txt,
                icon: e.pic || 'https://secure.gravatar.com/avatar/' + e.avt + '?d=mm&s=50'
              }));
        } else
          ((!this.msgs || 0 == this.msgs.length) &&
            (P('privChatComp msg on currTab, but, no msgs, rewiring... '),
            (this.msgs = this.appService.globals.privChatLog[i]),
            (this.currUser = i)),
            P('privChatComp msg on currTab...' + JSON.stringify(o)),
            this.appService.appEventBus.emit('scrollPCLogToBottom', { force: !0, repeat: !0 }));
      else
        (this.loadPClogForUID(i, 0),
          this.chatTabs.length > 0 && this.currUser != i && (s = 1),
          (o = { name: e.n, uid: i, avt: e.avt, pic: e.pic, unread: s, isA: e.isA, online: !0 }),
          this.chatTabs.push(o),
          (this.user = o),
          (this.recvdUser = this.recvdUser ? this.recvdUser : o),
          1 == this.chatTabs.length &&
            ((this.msgs = this.appService.globals.privChatLog[i]), (this.currUser = i)),
          !this.appService.globals.preferences.doNotDisturbOn &&
            this.appService.globals.preferences.chatPopup &&
            (this.alertService.info(e.txt, 'Message from ' + e.n, { enableHtml: !0 }),
            Notification.requestPermission()
              .then((a) => {
                if ('granted' == a || 'default' == a) {
                  let c = e.pic || 'https://secure.gravatar.com/avatar/' + e.avt + '?d=mm&s=50';
                  new Notification('Message from ' + e.n, {
                    body: this.decodeHtmlEntities(e.txt),
                    icon: c
                  });
                }
              })
              .catch(function (a) {
                console.error(a);
              })));
      this.appService.globals.preferences.doNotDisturbOn ||
        (!e.isMine &&
          this.appService.globals.preferences.chatSoundOn &&
          this.soundEffectsService.pling.play(),
        (!Mo('#textAreaTxtPM').is(':focus') || !window.onfocus) &&
          !e.isMine &&
          (this.notificationInterval = setInterval(() => {
            document.title =
              this.appService.globals.sessionName === document.title
                ? `${e.n} messaged you - ${this.appService.globals.sessionName}`
                : this.appService.globals.sessionName;
          }, 2e3)));
    }
    onTextareaFocus() {
      (this.notificationInterval && clearInterval(this.notificationInterval),
        document.title !== this.appService.globals.sessionName &&
          (document.title = this.appService.globals.sessionName),
        this.currUser &&
          this.elementRef.nativeElement
            .querySelector('#textAreaTxtPM')
            .addEventListener('input', this.onAutoExpand.bind(this)));
    }
    sendMessage() {
      if (!this.canPost) return void bootbox.alert("Sorry, you can't post to this channel");
      let e = Mo('#textAreaTxtPM').val().toString().trim();
      e &&
        (this.appService.sendPrivChat(this.currUser, e, this.recvdUser),
        Mo('#textAreaTxtPM').val(''),
        this.appService.guiEventBus.emit('scrollChatLogToBottomPM', { force: !0, repeat: !1 }));
    }
    onKey(e) {
      if (13 == e.keyCode) {
        e.preventDefault();
        const i = Mo('#textAreaTxtPM');
        e.shiftKey
          ? (i.val(i.val()), this.autoExpand(e.target))
          : e.altKey
            ? (i.val(i.val() + '\n'), this.autoExpand(e.target))
            : ((this.showEmojiChooser = !1), this.sendMessage(), this.autoExpand(e.target));
      }
    }
    toggleEmojiPanel() {
      ((this.showEmojiChooser = !this.showEmojiChooser),
        this.showEmojiChooser && P('opening pop over'));
    }
    togglePMToolbar() {
      ((this.showPMToolbar = !this.showPMToolbar),
        this.appService.guiEventBus.emit('scrollPCLogToBottom'));
    }
    selectEmoji(e) {
      console.log(e);
      let i = Mo('#textAreaTxtPM').val() + e.emoji.native;
      (Mo('#textAreaTxtPM').val(i), (this.selectedEmoji = e.emoji));
    }
    onEnterSearchChat(e) {
      return (
        P('do search value:' + e),
        (this.pmSearchTerm = e),
        this.pmSearchTerm ? this.doSearchSubmit(e) : this.clearSearchTerm(),
        !1
      );
    }
    clearSearchTerm() {
      ((this.pmSearchTerm = ''),
        this.appService.guiEventBus.emit('setSearchTermPC', {
          searchTerm: this.pmSearchTerm,
          uid: this.currUser
        }),
        (this.appService.globals.privChatSearchResults = []),
        (this.msgs = this.appService.globals.privChatLog[this.currUser]),
        this.appService.appEventBus.emit('scrollPCLogToBottom', { force: !0, repeat: !0 }));
    }
    doSearchSubmit(e) {
      if (!this.pmSearchTerm) return;
      let i = { searchTerm: this.pmSearchTerm, peerID: this.currUser };
      (this.appService.guiEventBus.emit('setSearchTermPC', i),
        this.appService.sendServerCommand('doPCLogSearch', i));
    }
    imgUpload() {
      var e = this;
      ((mc = []),
        (this.imggurUploadTxt = ''),
        bootbox.dialog({
          message:
            "<div>\n      <label class='upload-area' style='width:100%;text-align:center;' for='fupload'>\n      <input id='fupload' name='fupload' type='file' style='display:none;' multiple='true' accept='image/*'>\n      <i class='fas fa-file-upload fa-3x'></i><br />\n      Click to select images to upload\n      </label>\n      <div id=\"filedrag\" class=\"filedrag\">or drop files here</div>\n      <br />\n      <div style='margin-left:5px !important;' id='fileList' class=\"fileList text-center\"></div>\n      </div><div class='clearfix'></div>\n      <div class=\"w-100 my-3\"><textarea class=\"form-control w-100\"  rows=\"2\" id=\"msg-text-pc-upload\" name=\"msg-text-pc-upload\" placeholder=\"Enter your message\"></textarea></div>\n      ",
          title: 'Image Upload',
          backdrop: !0,
          onEscape: !0,
          size: 'xl',
          buttons: {
            success: {
              label: 'Upload',
              className: 'btn-success',
              callback: function () {
                if (mc) {
                  const r = Mo('#msg-text-pc-upload').val().trim();
                  e.doImagurFileListUpload(r);
                }
              }
            }
          }
        }));
      let o = document.getElementById('filedrag');
      (o.addEventListener('dragover', M2, !1),
        o.addEventListener('dragleave', M2, !1),
        o.addEventListener('drop', PB, !1),
        (o.style.display = 'block'),
        document.getElementById('fupload').addEventListener('change', PB, !1));
    }
    doImagurFileListUpload() {
      var e = this;
      return I(function* (i = '') {
        let o = mc.length;
        for (const [s, r] of mc.entries())
          (bootbox.hideAll(),
            bootbox.alert(
              `Uploading ${s}/${o}: ${r.name}. Please wait...<br><div style="text-align: center;"><i class="ml-2 fas fa-spinner fa-spin fa-3x"></i></div>`
            ),
            yield e.doImggurUpload(r, i, o - 1 !== s));
        (bootbox.hideAll(), mc.splice(0, o - 1));
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
            (bootbox.hideAll(), P('imge link:' + _.data.link), console.log('res:', _));
            const F = _.data.link;
            ((s.imggurUploadTxt += s.imggurUploadTxt && s.imggurUploadTxt.length > 0 ? ' ' + F : F),
              o ||
                (i && ((s.imggurUploadTxt += ' ' + i), Mo('#textAreaTxtPM').val('')),
                s.appService.sendPrivChat(s.currUser, s.imggurUploadTxt, s.recvdUser),
                (s.imggurUploadTxt = '')),
              r(_));
          },
          error: function (_) {
            (bootbox.hideAll(), bootbox.alert('Upload Failed...'), a(_));
          }
        };
        Mo.ajax(f).done(function (_) {
          (r(_), console.log('done resp:', _));
        });
      });
    }
    onImagePaste(e) {
      const i = this,
        o = (e.clipboardData || e.originalEvent.clipboardData).items;
      let s = null;
      for (const r of o) 0 === r.type.indexOf('image') && (s = r.getAsFile());
      if (s) {
        const r = URL.createObjectURL(s),
          a = Mo('#textAreaTxtPM').val().trim();
        bootbox.confirm({
          message:
            '<div class="text-center"><h4>Upload this image?</h4><img style="max-width:100%; max-height: 50vh;" src="' +
            r +
            '" /><div class="w-100 mt-3"><textarea class="form-control w-100"  rows="2" id="msg-text-pc" name="msg-text-pc" placeholder="Enter your message">' +
            a +
            '</textarea></div></div>',
          callback: (l) =>
            I(function* () {
              if (l) {
                const c = yield Mo('#msg-text-pc').val().trim();
                (console.log('msgTxt: ', c),
                  yield i.doImggurUpload(s, c),
                  console.log('ok, uploading...'));
              } else console.log('cancel uploading...');
            })()
        });
      }
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
        for (const F of s) {
          const S =
            new Date(F.t).toLocaleTimeString('en-us', o) + ' [' + F.n + ']: ' + F.txt + '\r\n';
          i.push(S);
        }
        const r = new Blob(i, { type: 'text/plain;charset=utf-8' }),
          a = window.URL.createObjectURL(r),
          l = document.createElement('a');
        l.href = a;
        const c = e.user.name.replace(' ', '_'),
          h = new Date(),
          f = h.toLocaleDateString(),
          _ = h.toLocaleTimeString();
        ((l.download = `${c}_${f}_${_}.txt`),
          (l.style.display = 'none'),
          document.body.appendChild(l),
          l.click(),
          document.body.removeChild(l));
      })();
    }
    toggleGiphyPanel(e) {
      ((this.giphySearchPopOver = e), e.isOpen() ? e.close() : e.open());
    }
    searchGiphy() {
      const e = _1()({ https: !0, apiKey: this.appService.globals.giphy_api_key }),
        i = this.giphySearchTerm;
      (P('searchGiphy search: ' + i),
        e
          .search(i)
          .then((o) => {
            (console.log(o), (this.giphyResults = o.data));
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
            ((this.sendingGif = !1),
              o && this.appService.sendPrivChat(this.currUser, i, this.recvdUser));
          }
        ));
    }
    decodeHtmlEntities(e) {
      const i = document.createElement('textarea');
      return ((i.innerHTML = e), i.value);
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(Ir), be(fo), be(Yt));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-privchat']],
        decls: 19,
        vars: 9,
        consts: [
          ['searchTermTxtPM', ''],
          ['emojiPanelDiv', ''],
          ['giphyPickerPop', 'ngbPopover'],
          ['giphyPicker', ''],
          [1, 'chat', 'd-flex', 'flex-column', 'h-100', 2, 'overflow-y', 'hidden'],
          [1, 'bs-component'],
          [
            1,
            'navbar',
            'navbar-expand-lg',
            'navbar-light',
            'bg-light',
            'chat-nav-pm',
            'p-1',
            'text-white'
          ],
          [1, 'navbar-brand', 'ml-1', 'mr-1'],
          [1, 'fas', 'fa-comments'],
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
          [1, 'nav', 'ml-auto', 'flex-nowrap', 'align-items-center'],
          [1, 'nav-item', 'mr-2'],
          [1, 'nav-item', 'dropdown', 2, 'position', 'static', 3, 'click'],
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
          [1, 'nav-item', 'ml-2', 'mr-2', 3, 'click'],
          [1, 'fas', 'fa-times'],
          [
            1,
            'shadow',
            'p-2',
            'w-100',
            'border-top',
            'border-secondary',
            'pmToolbar',
            2,
            'margin-top',
            '0px'
          ],
          [1, 'd-flex', 'h-100', 'pc-body', 3, 'ngClass'],
          [1, 'list-group', 'pc-list'],
          [1, 'pc-logs'],
          [1, 'fas', 'fa-bell-slash'],
          [1, 'nav-item'],
          ['data-bs-toggle', 'tab', 'role', 'tab', 1, 'nav-link', 3, 'ngClass'],
          ['alt', 'user.name', 1, 'avatarImg', 'avatarImg-active', 3, 'src'],
          [1, 'close-tab', 3, 'click'],
          [1, 'mx-1', 'fas', 'fa-times'],
          [1, 'btn', 'btn-outline-secondary', 'btn-sm', 'text-light', 'border-0', 3, 'click'],
          [1, 'fas', 'fa-trash'],
          ['id', 'chat-settings', 1, 'w-100', 3, 'keydown.enter'],
          [1, 'form-group'],
          [1, 'input-group'],
          [
            'type',
            'text',
            'name',
            'pmSearchTermTxt',
            'id',
            'pmSearchTermTxt',
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
            'input-group-text',
            3,
            'click'
          ],
          [1, 'd-inline', 'mr-2'],
          [1, 'btn', 'btn-outline-light', 'btn-sm', 'text-light', 3, 'click'],
          [1, 'btn', 'btn-outline-info', 'btn-sm', 'text-light', 'mx-1', 3, 'click'],
          [1, 'fas', 'fa-download'],
          [
            'type',
            'button',
            'aria-current',
            'true',
            1,
            'list-group-item',
            'list-group-item-light',
            'd-flex',
            'align-items-center',
            'justify-content-between',
            'px-1',
            3,
            'ngClass'
          ],
          [1, 'p-2', 'text-center'],
          [
            'type',
            'button',
            'aria-current',
            'true',
            1,
            'list-group-item',
            'list-group-item-light',
            'd-flex',
            'align-items-center',
            'justify-content-between',
            'px-1',
            3,
            'click',
            'ngClass'
          ],
          [1, 'user-status-container'],
          [1, 'badge', 'user-status-type', 3, 'ngClass'],
          ['alt', 't.avt', 1, 'avatarImg', 3, 'src'],
          [1, 'pc-username', 'ms-1'],
          [1, 'badge', 'bg-light', 'privchatUnread'],
          [1, 'my-1'],
          [1, 'privChatScroller', 3, 'msgs', 'searchTerm'],
          [1, 'popoverClass'],
          ['id', 'textAreaHolderPM', 1, 'textSendDiv'],
          [3, 'emojiSelect'],
          [1, 'd-flex', 'mx-0'],
          [1, 'px-1', 'webinarMode'],
          [1, 'flex-fill', 'px-0'],
          [
            'name',
            'txt-area',
            'id',
            'textAreaTxtPM',
            'rows',
            '1',
            'spellcheck',
            'true',
            'placeholder',
            'Type your message here...',
            1,
            'txt-area',
            'form-control',
            3,
            'keyup',
            'paste',
            'focus'
          ],
          [
            1,
            'justify-content-center',
            'align-items-center',
            'd-flex',
            'flex-row',
            'p-0',
            'm-0',
            'text-center',
            'textAreaBtnsCol'
          ],
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
          [1, 'textAreaBtns'],
          [
            'ngbTooltip',
            'Search for GIFs',
            'placement',
            'top-right',
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
          [
            'placement',
            'top',
            'ngbTooltip',
            'In webinar mode users only see their own chat messages, while Presenters see everyones messages...',
            1,
            'ml-2'
          ],
          [1, 'fas', 'fa-question-circle'],
          [1, 'textAreaBtns', 3, 'click'],
          ['ngbTooltip', 'Upload an Image', 'placement', 'left', 1, 'fas', 'fa-image'],
          [
            'ngbTooltip',
            'Search for GIFs',
            'placement',
            'top-right',
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
          [1, 'flex-fill', 'p-3', 'text-center']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 4)(1, 'div', 5)(2, 'nav', 6)(3, 'a', 7),
            T(4, 'i', 8),
            H(5, KDe, 3, 0, 'span', 9),
            u(),
            H(6, YDe, 7, 5, 'ul', 10),
            d(7, 'ul', 11),
            H(8, QDe, 4, 0, 'li', 12),
            d(9, 'li', 13),
            x('click', function () {
              return o.togglePMToolbar();
            }),
            d(10, 'a', 14),
            T(11, 'i', 15),
            u()(),
            d(12, 'li', 16),
            x('click', function () {
              return o.closePanel();
            }),
            T(13, 'i', 17),
            u()()(),
            H(14, XDe, 16, 1, 'div', 18),
            u(),
            d(15, 'div', 19),
            H(16, tEe, 4, 1, 'div', 20)(17, cEe, 5, 3, 'div', 21)(18, hEe, 3, 1),
            u()()),
            2 & i &&
              (m(5),
              O(5, o.appService.globals.preferences.doNotDisturbOn ? 5 : -1),
              m(),
              O(6, '' !== o.currUser ? 6 : -1),
              m(2),
              O(8, '' !== o.currUser && o.appService.globals.isPresenter ? 8 : -1),
              m(6),
              O(14, o.showPMToolbar ? 14 : -1),
              m(),
              z('ngClass', ut(7, zDe, o.appService.globals.preferences.pmLogsOnRight)),
              m(),
              O(16, o.chatTabs && o.chatTabs.length > 0 ? 16 : -1),
              m(),
              O(17, '' !== o.currUser ? 17 : 18)));
        },
        dependencies: [Di, qs, ai, ti, Ws, Yn, as, tc, ha, el, VDe],
        styles: [
          '.navbar[_ngcontent-%COMP%]{font-size:12px;padding:2px}.roomLog[_ngcontent-%COMP%]{height:100%;overflow-y:scroll}.chatDisabled[_ngcontent-%COMP%]{height:40px;min-height:40px;width:100%;background-color:#aaa;color:#000}.webinarMode[_ngcontent-%COMP%]{background-color:#aaa;color:#000;width:100%}.chat-header-nav[_ngcontent-%COMP%]{font-size:12px;min-height:30px}.chat-header-nav[_ngcontent-%COMP%]   .navbar-brand[_ngcontent-%COMP%], .chat-header-gear[_ngcontent-%COMP%]{font-size:16px}.menu-p-label[_ngcontent-%COMP%]{padding:5px;font-weight:100;font-size:12px}.chat-header-menu-settings[_ngcontent-%COMP%]{padding:0;margin:0;border:none;border-radius:0%;background-color:transparent}.chat-header[_ngcontent-%COMP%]{background-color:var(--chat-header-bg)!important;color:var(--chat-header-color)!important}.list-of-msgs[_ngcontent-%COMP%]{height:calc(100% - 41px);overflow-y:scroll;background-color:var(--msgs-bg)}.textAreaBtns[_ngcontent-%COMP%]{padding:5px;color:var(--textarea-holder-btns-color)!important}.textAreaBtns[_ngcontent-%COMP%]:hover{color:var(--textarea-holder-btns-hover-color)!important;cursor:pointer}.custom-file[_ngcontent-%COMP%]{display:none}.input-group-text[_ngcontent-%COMP%]{padding:0;margin:0}.textAreaBtnsCol[_ngcontent-%COMP%]{background-color:var(--textarea-bg)!important;color:var(--dark-gray)!important}.txt-area[_ngcontent-%COMP%]{border-radius:0;border:1px solid #ffffff;font-size:14px;resize:none;color:var(--textarea-color)!important;background-color:var(--textarea-bg)!important;outline:none;overflow-y:auto;margin-left:0;margin-right:0;padding-left:5px;padding-right:5px;word-wrap:break-word}.txt-area[_ngcontent-%COMP%]:focus{box-shadow:1px 1px 1px var(--darker-gray)}#form-upload-img[_ngcontent-%COMP%]   .input-group-text[_ngcontent-%COMP%], #form-upload-img[_ngcontent-%COMP%]   .form-control[_ngcontent-%COMP%]{border-radius:0}.unreadIndicator[_ngcontent-%COMP%]{text-align:center;position:relative;top:30px;z-index:10;background-color:#9acd32}.white[_ngcontent-%COMP%]{color:#fff}.chat-nav-pm[_ngcontent-%COMP%]{align-items:center;flex-wrap:nowrap;min-height:40px;background-color:var(--msgs-header-bg)!important}.chat-nav-pm[_ngcontent-%COMP%]   .dropdown-menu[_ngcontent-%COMP%]{background-color:var(--msgs-header-bg);border:none;border-radius:0 0 0 5px}.chat-nav-pm[_ngcontent-%COMP%]   .nav-item[_ngcontent-%COMP%], .chat-nav-pm[_ngcontent-%COMP%]   .btn[_ngcontent-%COMP%], .chat-nav-pm[_ngcontent-%COMP%]   .input-group-append[_ngcontent-%COMP%]{cursor:pointer}.pc-body[_ngcontent-%COMP%]{background-color:#f1f1f1;overflow:hidden}.pc-list[_ngcontent-%COMP%]{flex-basis:220px;height:100%;overflow:hidden auto;padding:0 1px}.pc-active[_ngcontent-%COMP%]{background-color:#f9f9f9}.list-group-item[_ngcontent-%COMP%]{padding:10px 3px;border-bottom:1px solid #eee;text-align:left;margin-top:1px}.pc-logs[_ngcontent-%COMP%]{flex:1;height:100%}.chatSearchTerm[_ngcontent-%COMP%]{height:inherit}.pc-username[_ngcontent-%COMP%]{white-space:nowrap;max-width:135px;overflow:hidden;text-overflow:ellipsis;display:inline-block;vertical-align:middle}.close-tab[_ngcontent-%COMP%]{cursor:pointer;padding:2px 5px}.user-status-container[_ngcontent-%COMP%]{position:relative}.user-status-type[_ngcontent-%COMP%]{padding:.5px 4px!important;border-radius:50%;position:absolute;bottom:-5px;left:26px;background-color:#dc3545}#textAreaHolderPM[_ngcontent-%COMP%]{background-color:var(--textarea-bg);border-radius:8px;padding:5px;margin:0 5px}.privchatUnread[_ngcontent-%COMP%]{background-color:red!important}.chatTabs[_ngcontent-%COMP%]   .nav-item[_ngcontent-%COMP%]   .active[_ngcontent-%COMP%]{color:var(--tabs-color);background-color:var(--tab-active-bg);border-color:var(--tabs-border-color)}.chatTabs[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{font-weight:700;font-size:12px;padding-left:5px;padding-right:5px;margin-right:5px;color:#d3d3d3;margin-bottom:0;padding-bottom:5px}ul.chatTabs[_ngcontent-%COMP%]{margin-bottom:0;border-color:var(--tabs-border-color)}.chatTabs[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover{border-color:var(--tab-active-bg);border-radius:3px}.counterBadge[_ngcontent-%COMP%]{top:-5px;position:relative}.textAreaBtnSelected[_ngcontent-%COMP%]{background-color:#f1f2f3}.bs-popover-top[_ngcontent-%COMP%] > .arrow[_ngcontent-%COMP%]:after, .bs-popover-auto[x-placement^=top][_ngcontent-%COMP%] > .arrow[_ngcontent-%COMP%]:after{border-top-color:var(--modal-content-bg-color)}.giphy-search[_ngcontent-%COMP%]{width:400px;height:400px;border:2px solid var(--modal-content-bg-color);background-color:#fff;overflow:hidden}.giphy-search[_ngcontent-%COMP%]   .input-group-text[_ngcontent-%COMP%]{border:none;background-color:var(--modal-input-group-bg)}.giphy-search[_ngcontent-%COMP%]   .fa-times[_ngcontent-%COMP%]{font-size:16.5px;padding:10px}.giphy-search[_ngcontent-%COMP%]   .fa-times[_ngcontent-%COMP%]:hover{cursor:pointer;opacity:.85}.giphy-header[_ngcontent-%COMP%]{padding:10px;background-color:var(--modal-content-bg-color)}.search-results[_ngcontent-%COMP%]{overflow-y:auto;height:100%;padding:5px}.gif-result[_ngcontent-%COMP%]{text-align:center}.gif-result[_ngcontent-%COMP%]   img[_ngcontent-%COMP%]{cursor:pointer}.giphy-search[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]{padding:10px}.giphy-search[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]:hover{background-color:var(--modal-upload-files-color)}.giphy-search[_ngcontent-%COMP%]   h4[_ngcontent-%COMP%], .giphy-search[_ngcontent-%COMP%]   h6[_ngcontent-%COMP%]{color:var(--modal-content-color)}.giphy-hr[_ngcontent-%COMP%]{color:#fff;padding:0;margin:0 0 10px}img[_ngcontent-%COMP%]{max-width:100%}.avatarImg[_ngcontent-%COMP%]{width:32px;height:32px;margin-right:5px;object-fit:cover}.avatarImg-active[_ngcontent-%COMP%]{width:25px;height:25px}.privChatScroller[_ngcontent-%COMP%]{background-color:var(--msgs-bg)}.pmToolbar[_ngcontent-%COMP%]{background-color:var(--msgs-header-bg);color:var(--msgs-header-color)}'
        ]
      });
    }
  }
  return t;
})();
