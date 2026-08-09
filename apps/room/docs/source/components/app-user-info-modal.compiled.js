DB = (() => {
  class t {
    constructor(e, i) {
      ((this.appService = e),
        (this.soundEffectsService = i),
        (this.badges = ''),
        (this.showPerms = !1),
        (this.allowToManageNotes = !1),
        (this.locHref = ''),
        (this.canPM = !0),
        (this.canEditUsername = !1),
        (this.isFollowed = !1),
        (this.isMuted = !1),
        (this.followChatStyle = null),
        (this.extraChatMsg = !1),
        (this.dataurl = null),
        (this.dataBlob = null));
    }
    ngOnInit() {
      ((this.user = {
        email: 'n/a',
        isOffline: !0,
        data: { locStr: 'n/a' },
        privData: { ip: 'n/a' }
      }),
        (this.locHref = window.location.href),
        this.appService.appEventBus.subscribe('userInfo', (e) => {
          let i = e.user;
          i &&
            ((this.user = i),
            console.log('userInfo user:', i),
            this.user.data || (this.user.data = {}),
            this.user.privData || (this.user.privData = {}),
            this.user.emailHash ||
              (this.user.emailHash = this.user.email && this.appService.hashEmail(this.user.email)),
            this.parseBadges(
              this.user.badges || this.user.privData?.badges || this.user.data?.badges || []
            ),
            i.userXref &&
              ((this.user.hasScreen = i.userXref.hasScreen),
              (this.user.hasMic = i.userXref.hasMic),
              (this.user.hasCam = i.userXref.hasCam),
              (this.user.hasAdminChat = i.userXref.hasAdminChat),
              (this.user.canEditNotes = i.userXref.canEditNotes)),
            (this.canPM =
              (this.appService.globals.isPresenter ||
                this.appService.globals.sessData.userPM ||
                (this.appService.globals.sessData.userToPresenterPM &&
                  ('a' === this.user.perms || this.user.hasAdminChat))) &&
              !(
                this.appService.globals.user.isFT &&
                this.appService.globals.sessData.disablePMForTrials
              )),
            (this.isMuted = !(
              !this.appService.globals.mutedUsers ||
              !this.appService.globals.mutedUsers[this.user.emailHash]
            )),
            (this.isFollowed = !(
              !this.appService.globals.followedUsers ||
              !this.appService.globals.followedUsers[this.user.emailHash]
            )),
            (this.followChatStyle = this.isFollowed
              ? this.appService.globals.followedUsers[this.user.emailHash].followChatStyle
              : this.loadDefaultFollowChatStyle()),
            (this.canEditUsername =
              !this.appService.globals.isPresenter &&
              this.appService.globals.sessData.allowUsersToChangeUsername &&
              this.appService.hashEmail(this.appService.globals.user.email) ===
                this.user.emailHash),
            $('#user-modal').modal('show'));
        }),
        this.user &&
          this.appService.guiEventBus.subscribe('doUserInfoExtra', (e) => {
            (console.log('doUserInfoExtra: ', e), (this.extraChatMsg = e));
          }));
    }
    parseBadges(e) {
      if (((this.badges = ''), this.appService.globals.sessData.enableBadges && e))
        for (let i = 0; i < e.length; i++) {
          let s = this.appService.globals.sessData.badgesH[e[i]];
          (s &&
            s.hasOwnProperty('darkTheme') &&
            s.darkTheme &&
            'darkTheme' === this.appService.globals.preferences.theme &&
            (s = this.appService.globals.sessData.badgesH[s.darkTheme]),
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
    }
    doCloseModal() {
      $('#user-modal').modal('hide');
    }
    loadDefaultFollowChatStyle() {
      return 'lightTheme' === this.appService.globals.preferences.theme
        ? {
            color: '#1a1a1a',
            tickerColor: '#1a1a1a',
            usernameColor: '#365d7d',
            bgColor: '#ffffff',
            fontSize: 14,
            playSound: !0
          }
        : {
            color: '#f7fd37',
            tickerColor: '#f7fd37',
            usernameColor: '#c0d8ed',
            bgColor: '#000000',
            fontSize: 14,
            playSound: !0
          };
    }
    resetFollowChatStyle(e) {
      ((this.followChatStyle = this.loadDefaultFollowChatStyle()),
        this.appService.updateUserInList(
          { emailHash: e, followChatStyle: this.followChatStyle },
          'followedUsers'
        ));
    }
    saveFollowChatStyle(e) {
      this.appService.updateUserInList(
        { emailHash: e, followChatStyle: this.followChatStyle },
        'followedUsers'
      );
    }
    followChatSoundOnChange() {
      this.followChatStyle.playSound = !this.followChatStyle.playSound;
    }
    testFollowChatSound() {
      return (this.followChatStyle.playSound && this.soundEffectsService.pling.play(), !1);
    }
    doFollowUser(e) {
      const i = this,
        o = this.isFollowed ? 'un' : '';
      ((this.followChatStyle =
        '' === o
          ? this.loadDefaultFollowChatStyle()
          : this.appService.globals.followedUsers[e.emailHash].followChatStyle),
        bootbox.confirm({
          message: 'Do you want to ' + o + 'follow ' + e.nick + '?',
          className: 'manage-user-list',
          callback(s) {
            if (s)
              if (((i.isFollowed = !i.isFollowed), i.isFollowed)) {
                const { nick: r, emailHash: a, pic: l, userXrefID: c, _id: h } = e;
                i.appService.addUserToList(
                  {
                    [a]: {
                      userXrefID: c,
                      _id: h,
                      nick: r,
                      emailHash: a,
                      pic: l,
                      followChatStyle: i.followChatStyle
                    }
                  },
                  'followedUsers'
                );
              } else i.appService.removeUserFromList(e.emailHash, 'followedUsers');
          }
        }));
    }
    doMuteUser(e) {
      const i = this;
      bootbox.confirm({
        message: 'Do you want to ' + (this.isMuted ? 'un' : '') + 'mute ' + e.nick + '?',
        className: 'manage-user-list',
        callback(s) {
          if (s)
            if (((i.isMuted = !i.isMuted), i.isMuted)) {
              const { nick: r, emailHash: a, pic: l } = e;
              i.appService.addUserToList({ [a]: { nick: r, emailHash: a, pic: l } }, 'mutedUsers');
            } else i.appService.removeUserFromList(e.emailHash, 'mutedUsers');
        }
      });
    }
    doUserMention(e) {
      ($('#user-modal').modal('hide'),
        this.appService.guiEventBus.emit(
          this.appService.globals.preferences.extraChatColumn &&
            (this.extraChatMsg || 'textAreaTxtExtra' === this.appService.globals.chatInputFocus)
            ? 'doMentionExtra'
            : 'doMention',
          e
        ));
    }
    saveCustomPerms() {
      (console.log(
        `perms now: Mic: ${this.user.hasMic}. Screen: ${this.user.hasScreen}. Cam: ${this.user.hasCam}. adminChat: ${this.user.hasAdminChat}. canEditNotes: ${this.user.canEditNotes}`
      ),
        this.appService.sendServerAdminCommand('changeUserPerms', { user: this.user }),
        this.doCloseModal(),
        bootbox.alert('Permissions applied, user will reload the page now to apply...'),
        this.appService.loadRoster());
    }
    giveMicScreen(e) {
      if (this.user.userXrefID == this.appService.globals.user.userXrefID)
        return (bootbox.alert(`Can't ${e ? 'give' : 'take'} 'Mic/Screenshare' to yourself.`), !1);
      (this.appService.sendServerAdminCommand('giveMicScreen', { user: this.user._id, give: e }),
        bootbox.alert(e ? 'Mic/Screenshare given OK' : 'Mic/Screen taken away OK'));
    }
    startPrivateChat() {
      console.log('startPrivateChat user:', this.user);
      let e = this.user.isOffline ? this.user.uid : this.user.userXrefID;
      if ((e || (e = this.user.uid), this.user.uid == this.appService.globals.user.userXrefID))
        return (this.doCloseModal(), void bootbox.alert('Chatting with yourself again???'));
      (this.appService.guiEventBus.emit('startPrivChat', { uid: e, isInit: !0, user: this.user }),
        this.doCloseModal());
    }
    kickUser(e = !1, i = !1) {
      let o = this,
        s = this.appService.getPreference('kickMsg');
      (s || (s = 'You have been kicked from the room by an administrator'),
        bootbox.prompt({
          value: s,
          title: 'Enter the kick message for this user',
          inputType: 'textarea',
          callback: (r) => {
            r &&
              ((s = r),
              console.log('kicked msg:' + s),
              this.appService.sendServerAdminCommand('kickUser', {
                user: o.user,
                msg: s,
                ban: e,
                kickAllInstances: i
              }),
              o.appService.setPreference('kickMsg', s),
              o.doCloseModal(),
              bootbox.alert('User kicked OK'));
          }
        }));
    }
    kickDuplicates() {
      console.log('kickDuplicates user:', this.user);
      const e = this,
        i = this.user.emailHash,
        o = this.user.nick || this.user.name,
        s = this.user._id;
      if (!i) return;
      let r = this.appService.getPreference('kickMsg');
      (r || (r = 'You have been kicked from the room by an administrator'),
        bootbox.prompt({
          value: r,
          title: 'Kick all other duplicates of ' + o + ' with the following message:',
          inputType: 'textarea',
          callback: (a) => {
            if (!a) return;
            e.appService.setPreference('kickMsg', a);
            let l = 0;
            (e.appService.globals.roster &&
              e.appService.globals.roster.forEach((c) => {
                c &&
                  c.emailHash === i &&
                  c._id !== s &&
                  (console.log('kicking ' + o + '. email:' + i),
                  e.appService.sendServerAdminCommand('kickUser', {
                    user: c,
                    msg: a,
                    ban: !1,
                    kickAllInstances: !1
                  }),
                  l++);
              }),
              e.doCloseModal(),
              l > 0
                ? bootbox.alert('Kicked ' + l + ' duplicate(s) of ' + o)
                : bootbox.alert('No duplicates found for ' + o));
          }
        }));
    }
    addNote() {
      var e = this;
      bootbox.prompt('Enter your note below', (i) => {
        i &&
          I(function* () {
            let o = yield e.appService.invokeServerCommand('addUserNote', {
              user: e.user,
              note: i
            });
            (console.log('added note resp:', o), (e.user.notes = o.notes));
          })();
      });
    }
    deleteNode(e, i) {
      var o = this;
      bootbox.confirm('Are you sure you want to delete this note by ' + e.name + ' ?', (s) => {
        s &&
          I(function* () {
            let r = yield o.appService.invokeServerCommand('delUserNote', {
              user: o.user,
              noteIDX: i
            });
            (console.log('added note resp:', r), (o.user.notes = r.notes));
          })();
      });
    }
    muteChat(e) {
      e >= 0
        ? (this.appService.sendServerAdminCommand('muteChat', { user: this.user, time: e }),
          bootbox.alert('user chat muted'))
        : (this.appService.sendServerAdminCommand('unmuteChat', { user: this.user }),
          bootbox.alert('user chat unmuted'));
    }
    getDebugLog() {
      this.appService.sendServerAdminCommand('getDebugLog', this.user);
    }
    remoteRestartAudio() {
      (this.appService.sendServerAdminCommand('remoteRestartAudio', this.user),
        bootbox.alert('Audio restart request sent OK'));
    }
    forceReload() {
      (this.appService.sendServerAdminCommand('forceReload', this.user),
        bootbox.alert('Reload request sent OK'));
    }
    remotePresCommand(e) {
      this.appService.sendServerAdminCommand('remotePresCommand', { user: this.user, cmd: e });
    }
    editUsername(e) {
      const i = this;
      bootbox.prompt({
        title: `Enter a new username for "${e.nick}":`,
        inputType: 'text',
        callback(o) {
          const s = o?.trim() || '';
          s &&
            s.length > 0 &&
            ((i.user.nick = s),
            i.appService.sendServerCommand('editUsername', {
              userID: i.user._id,
              username: s,
              sessID: i.appService.globals.sessionID
            }));
        }
      });
    }
    editUsernameByUser(e) {
      bootbox.prompt({
        title: 'Enter a new username for yourself:',
        inputType: 'text',
        value: this.user.nick,
        callback: (i) => {
          const o = i?.trim() || '';
          if (0 !== o.length) {
            if (!/^[a-zA-Z0-9]+$/.test(o))
              return void bootbox.alert('Username can only contain letters and numbers');
            if (o.length < 3)
              return void bootbox.alert('Username must be at least 3 characters long');
            if (o.length >= 30)
              return void bootbox.alert('Username must be less than 30 characters long');
            o &&
              o.length > 0 &&
              this.user.nick?.trim() != o &&
              ((this.user.nick = o),
              this.appService.setPreference('savedNick', o),
              this.appService.sendServerCommand('editUsernameByUser', {
                userID: this.user.rosterID || this.user._id,
                username: o,
                sessID: this.appService.globals.sessionID
              }));
          }
        }
      });
    }
    manageAdminNotes() {
      this.appService.globals.sessData.needPasswordForUserNotes && !this.allowToManageNotes
        ? bootbox.prompt({
            title: "Please enter the password to manage user's notes:",
            value: '',
            callback: (e) => {
              e &&
                (e.trim() === this.appService.globals.sessData.needPasswordForUserNotes
                  ? (this.allowToManageNotes = !0)
                  : bootbox.alert('Wrong password!'));
            }
          })
        : (this.allowToManageNotes = !0);
    }
    doReload(e) {
      bootbox.confirm(e, (i) => {
        i && window.location.reload();
      });
    }
    clearProfilePic() {
      bootbox.confirm('Are your sure you want to remove your profile picture?', (e) => {
        e &&
          ((this.appService.globals.preferences.profilePic = ''),
          this.appService.setPreference('profilePic', ''),
          this.doReload(
            'Your profile picture has been successfully removed. Reload the page for the changes to take effect?'
          ));
      });
    }
    setupProfilePic(e) {
      e.preventDefault();
      var i = this,
        s = null;
      (bootbox.dialog({
        message:
          "<div><label class='upload-area' style='width:100%;text-align:center;' for='fuploadPTR'><input id='fuploadPTR' accept='image/*' name='fuploadPTR' type='file' style='display:none;' multiple='false'><i class='fas fa-file-upload fa-3x'></i><br />Click to select images to upload</label><br /><span style='margin-left:5px !important;' id='fileList'></span><img src=\"\" id=\"previewImg\"  ></div><div class='clearfix'></div>",
        title: 'Profile Image Upload',
        buttons: {
          cancel: { label: 'Close', className: 'btn btn-primary', callback: function () {} },
          success: {
            label: 'Upload',
            className: 'btn-success',
            callback: function () {
              s && i.doImggurUpload(s);
            }
          }
        }
      }),
        document.getElementById('fuploadPTR').addEventListener(
          'change',
          function (a) {
            $('#fileList').empty();
            for (var l = 0; l < this.files.length; l++) {
              var c = this.files[l];
              s = c;
              var h = new FileReader();
              return (
                (h.onloadend = function (f) {
                  var _ = document.createElement('img');
                  ((_.src = f.target.result),
                    (_.onload = function () {
                      var F = document.createElement('canvas');
                      F.getContext('2d').drawImage(_, 0, 0);
                      var M = _.width,
                        B = _.height;
                      (M > B
                        ? M > 125 && ((B *= 125 / M), (M = 125))
                        : B > 125 && ((M *= 125 / B), (B = 125)),
                        (F.width = M),
                        (F.height = B),
                        F.getContext('2d').drawImage(_, 0, 0, M, B),
                        (i.dataurl = F.toDataURL('image/png')),
                        F.toBlob(
                          (J) => {
                            i.dataBlob = J;
                          },
                          'image/png',
                          1
                        ),
                        (document.getElementById('previewImg').src = i.dataurl));
                    }));
                }),
                h.readAsDataURL(c),
                !1
              );
            }
          },
          !1
        ));
    }
    doImggurUpload(e) {
      var i = this;
      const o = `${i.appService.globals.upload_server}/image/${i.appService.globals.sessionID}`,
        s = i.appService.globals.cdn_upload_key;
      var r = new FormData();
      (r.append('image', e),
        r.append('name', e.name),
        $.ajax({
          async: !0,
          crossDomain: !0,
          url: o,
          method: 'POST',
          datatype: 'json',
          headers: { Authorization: 'Client-ID ' + s },
          processData: !1,
          contentType: !1,
          data: r,
          beforeSend: function (l) {
            (console.log('Uploading... ' + e.name),
              bootbox.alert(
                `Uploading: ${e.name}... Please wait...<br><div style="text-align: center;"><i class="ml-2 fas fa-spinner fa-spin fa-3x"></i></div>`
              ));
          },
          success: function (l) {
            (bootbox.hideAll(),
              console.log('image link:' + l.data.link),
              (i.appService.globals.preferences.profilePic = l.data.link),
              i.appService.setPreference('profilePic', l.data.link),
              i.doReload(
                'Your profile picture has been successfully uploaded. Reload the page for the changes to take effect?'
              ));
          },
          error: function (l) {
            (console.error(l), bootbox.hideAll(), bootbox.alert('Upload Failed...'));
          }
        }).done(function (l) {
          console.log('done resp:', l);
        }));
    }
    adminUploadProfilePic(e) {
      e.preventDefault();
      var i = this,
        s = null;
      bootbox.dialog({
        message:
          "<div><label class='upload-area' style='width:100%;text-align:center;' for='fuploadPTR'><input id='fuploadPTR' accept='image/*' name='fuploadPTR' type='file' style='display:none;' multiple='false'><i class='fas fa-file-upload fa-3x'></i><br />Click to select images to upload</label><br /><span style='margin-left:5px !important;' id='fileList'></span><img src=\"\" id=\"previewImg\"></div><div class='clearfix'></div>",
        title: `Upload Profile Picture for ${this.user.nick || this.user.name}`,
        buttons: {
          cancel: { label: 'Close', className: 'btn btn-primary', callback: function () {} },
          success: {
            label: 'Upload',
            className: 'btn-success',
            callback: function () {
              s && i.doAdminImgurUpload(s);
            }
          }
        }
      });
      var r = document.getElementById('fuploadPTR');
      r &&
        r.addEventListener(
          'change',
          function (a) {
            $('#fileList').empty();
            for (var l = 0; l < this.files.length; l++) {
              var c = this.files[l];
              s = c;
              var h = new FileReader();
              return (
                (h.onloadend = function (f) {
                  var _ = document.createElement('img');
                  ((_.src = f.target.result),
                    (_.onload = function () {
                      var F = document.createElement('canvas'),
                        S = F.getContext('2d');
                      if (S) {
                        S.drawImage(_, 0, 0);
                        var B = _.width,
                          W = _.height;
                        (B > W
                          ? B > 125 && ((W *= 125 / B), (B = 125))
                          : W > 125 && ((B *= 125 / W), (W = 125)),
                          (F.width = B),
                          (F.height = W));
                        var J = F.getContext('2d');
                        J &&
                          (J.drawImage(_, 0, 0, B, W),
                          (i.dataurl = F.toDataURL('image/png')),
                          F.toBlob(
                            (te) => {
                              i.dataBlob = te;
                            },
                            'image/png',
                            1
                          ),
                          (document.getElementById('previewImg').src = i.dataurl));
                      }
                    }));
                }),
                h.readAsDataURL(c),
                !1
              );
            }
          },
          !1
        );
    }
    doAdminImgurUpload(e) {
      var i = this;
      const o = `${i.appService.globals.upload_server}/image/${i.appService.globals.sessionID}`,
        s = i.appService.globals.cdn_upload_key;
      var r = new FormData();
      (r.append('image', e),
        r.append('name', e.name),
        $.ajax({
          async: !0,
          crossDomain: !0,
          url: o,
          method: 'POST',
          datatype: 'json',
          headers: { Authorization: 'Client-ID ' + s },
          processData: !1,
          contentType: !1,
          data: r,
          beforeSend: function (l) {
            bootbox.alert(
              `Uploading: ${e.name}... Please wait...<br><div style="text-align: center;"><i class="ml-2 fas fa-spinner fa-spin fa-3x"></i></div>`
            );
          },
          success: function (l) {
            (bootbox.hideAll(),
              console.log('admin profile pic upload link:' + l.data.link),
              (i.user.pic = l.data.link),
              i.appService.sendServerAdminCommand('setUserProfilePic', {
                user: i.user,
                profilePic: l.data.link
              }),
              bootbox.alert(
                'Profile picture uploaded successfully for ' + (i.user.nick || i.user.name)
              ));
          },
          error: function (l) {
            (console.error(l), bootbox.hideAll(), bootbox.alert('Upload Failed...'));
          }
        }).done(function (l) {
          console.log('admin upload done resp:', l);
        }));
    }
    showPrivateMessages() {
      var e = this;
      return I(function* () {
        e.appService.guiEventBus.emit('doUserPMModal', {
          peerID: e.user.userXrefID,
          nick: e.user.nick
        });
      })();
    }
    checkIsMe() {
      return this.appService.hashEmail(this.appService.globals.user.email) !== this.user.emailHash;
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(Ir));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-user-info-modal']],
        decls: 22,
        vars: 11,
        consts: [
          [
            'id',
            'user-modal',
            'tabIndex',
            '-1',
            'role',
            'dialog',
            'aria-labelledby',
            'user-details',
            'aria-hidden',
            'true',
            1,
            'modal',
            'fade'
          ],
          ['role', 'document', 1, 'modal-dialog'],
          [1, 'modal-content'],
          [1, 'modal-header'],
          [1, 'edit-user-avatar'],
          [3, 'src', 'alt'],
          [1, 'dropdown', 'edit-user-avatar-options'],
          [1, 'modal-title'],
          ['title', 'Edit username', 1, 'text-primary', 'mx-1', 'edit-username'],
          [1, 'badge', 'badge-danger'],
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
          [1, 'modal-body', 'py-0'],
          [1, 'py-2'],
          [1, 'modal-footer', 'text-center'],
          ['type', 'button', 1, 'btn', 'btn-outline-light'],
          ['type', 'button', 1, 'btn', 'btn-primary', 3, 'click'],
          [
            'type',
            'button',
            'data-bs-toggle',
            'dropdown',
            'aria-expanded',
            'false',
            1,
            'dropdown-toggle'
          ],
          [1, 'fas', 'fa-cog'],
          [1, 'dropdown-menu'],
          [
            'href',
            'https://en.gravatar.com/',
            'target',
            '_blank',
            'rel',
            'noopener noreferrer',
            1,
            'dropdown-item',
            'text-dark'
          ],
          [1, 'fas', 'fa-user'],
          ['href', '', 'rel', 'noopener noreferrer', 1, 'dropdown-item', 'text-dark', 3, 'click'],
          [1, 'fas', 'fa-file-upload'],
          [
            'type',
            'button',
            1,
            'btn',
            'btn-danger',
            'btn-sm',
            'rounded-pill',
            'remove-profile-picture-btn',
            3,
            'click'
          ],
          [1, 'fas', 'fa-times'],
          ['title', 'Edit username', 1, 'text-primary', 'mx-1', 'edit-username', 3, 'click'],
          [1, 'fas', 'fa-edit'],
          ['id', 'nav-tab', 'role', 'tablist', 1, 'nav', 'nav-tabs'],
          [
            'id',
            'nav-tab-info',
            'data-bs-toggle',
            'tab',
            'href',
            '#nav-info',
            'role',
            'tab',
            'aria-controls',
            'nav-info',
            'aria-selected',
            'true',
            1,
            'nav-item',
            'nav-link',
            'active'
          ],
          ['id', 'nav-tabContent', 1, 'tab-content'],
          [
            'id',
            'nav-info',
            'role',
            'tabpanel',
            'aria-labelledby',
            'nav-tab-info',
            1,
            'tab-pane',
            'fade',
            'show',
            'active'
          ],
          [1, 'd-flex', 'flex-wrap', 'align-items-center', 'justify-content-center'],
          [1, 'table-responsive'],
          [1, 'table', 'w-100'],
          ['scope', 'row'],
          [
            'id',
            'nav-system',
            'role',
            'tabpanel',
            'aria-labelledby',
            'nav-tab-system',
            1,
            'tab-pane',
            'fade'
          ],
          ['target', '_blank', 3, 'href'],
          [
            'id',
            'nav-options',
            'role',
            'tabpanel',
            'aria-labelledby',
            'nav-tab-options',
            1,
            'tab-pane',
            'fade'
          ],
          [1, 'row'],
          [1, 'col'],
          ['type', 'button', 1, 'btn', 'btn-block', 'btn-outline-light', 3, 'click'],
          [1, 'icon', 'fa', 'fa-sync'],
          [1, 'icon', 'fa', 'fa-volume-up'],
          [1, 'icon', 'fa', 'fa-bug'],
          [1, 'icon', 'fa', 'fa-user-times'],
          ['ngbDropdown', '', 1, 'd-inline-block', 'btn-block'],
          ['ngbDropdownToggle', '', 1, 'btn', 'btn-block', 'btn-outline-light'],
          ['ngbDropdownMenu', '', 'aria-labelledby', 'dropdownBasic1'],
          ['ngbDropdownItem', '', 3, 'click'],
          ['type', 'button', 1, 'btn', 'btn-block', 'btn-outline-light'],
          [1, 'icon', 'fa', 'fa-comment-slash'],
          [1, 'icon', 'fa', 'fa-user-circle'],
          [
            'type',
            'button',
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#all-user-pm-modal',
            1,
            'btn',
            'btn-block',
            'btn-outline-light'
          ],
          [
            'id',
            'nav-notes',
            'role',
            'tabpanel',
            'aria-labelledby',
            'nav-tab-perms',
            1,
            'tab-pane',
            'fade'
          ],
          [
            'id',
            'nav-tab-system',
            'data-bs-toggle',
            'tab',
            'href',
            '#nav-system',
            'role',
            'tab',
            'aria-controls',
            'nav-system',
            'aria-selected',
            'false',
            1,
            'nav-item',
            'nav-link'
          ],
          [
            'id',
            'nav-tab-options',
            'data-bs-toggle',
            'tab',
            'href',
            '#nav-options',
            'role',
            'tab',
            'aria-controls',
            'nav-options',
            'aria-selected',
            'false',
            1,
            'nav-item',
            'nav-link'
          ],
          [
            'id',
            'nav-tab-notes',
            'data-bs-toggle',
            'tab',
            'href',
            '#nav-notes',
            'role',
            'tab',
            'aria-controls',
            'nav-notes',
            'aria-selected',
            'false',
            1,
            'nav-item',
            'nav-link',
            3,
            'click'
          ],
          [1, 'd-inline-block', 'align-baseline', 'mr-1', 3, 'innerHTML'],
          [1, 'badge', 'bg-danger', 'trial-badge'],
          [1, 'badge', 'bg-warning', 'new-badge'],
          [1, 'stars-container'],
          [1, 'fas', 'fa-star', 'stars-icon'],
          [1, 'stars-num'],
          [1, 'mb-2'],
          [1, 'd-flex', 'justify-content-between', 'align-items-end', 'ms-4'],
          [1, 'form-group', 'mb-0'],
          [
            'type',
            'checkbox',
            'name',
            'hasMic',
            'id',
            'hasMicChk',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'hasMicChk', 1, 'form-check-label'],
          [1, 'icon', 'fa', 'fa-microphone'],
          [
            'type',
            'checkbox',
            'name',
            'hasScreen',
            'id',
            'hasScreenChk',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'hasScreenChk', 1, 'form-check-label'],
          [1, 'icon', 'fa', 'fa-desktop'],
          [
            'type',
            'checkbox',
            'name',
            'hasCam',
            'id',
            'hasCam',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'hasCam', 1, 'form-check-label'],
          [1, 'icon', 'fa', 'fa-video'],
          [
            'type',
            'checkbox',
            'name',
            'hasAdminChat',
            'id',
            'hasAdminChat',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'hasAdminChat', 1, 'form-check-label'],
          [1, 'far', 'fa-comment-alt'],
          [
            'type',
            'checkbox',
            'name',
            'canEditNotes',
            'id',
            'canEditNotes',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'canEditNotes', 1, 'form-check-label'],
          [1, 'btn', 'btn-outline-success', 'mb-1', 3, 'click'],
          [1, 'icon', 'fa', 'fa-disk'],
          [1, 'form-group', 'mb-0', 'ms-4'],
          [
            'type',
            'checkbox',
            'name',
            'temporaryAccessOnly',
            'id',
            'temporaryAccessOnly',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'temporaryAccessOnly', 1, 'form-check-label'],
          [1, 'fas', 'fa-wrench'],
          [1, 'icon', 'fa', 'fa-microphone-slash'],
          [1, 'icon', 'fa', 'fa-video-slash'],
          [1, 'icon', 'fa', 'fa-stop-circle'],
          [1, 'icon', 'fa', 'fa-play-circle'],
          [
            'type',
            'button',
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#all-user-pm-modal',
            1,
            'btn',
            'btn-block',
            'btn-outline-light',
            3,
            'click'
          ],
          [1, 'icon', 'fas', 'fa-comment'],
          [1, 'btn', 'btn-outline-light', 3, 'click'],
          [1, 'col', 2, 'max-height', '300px', 'overflow-y', 'scroll'],
          [1, 'd-flex', 'd-flex', 'justify-content-between', 'd-flex', 'align-items-stretch'],
          [1, 'btn', 'btn-sm', 'btn-outline-light', 'float-right', 3, 'click'],
          [1, 'icon', 'fa', 'fa-plus-circle'],
          [1, 'flex-grow-1', 'flex-fill'],
          [1, 'smallAvatarImg', 3, 'src', 'alt'],
          [1, 'fas', 'fa-minus-circle'],
          [1, 'p-2', 'd-flex', 'align-items-end', 'justify-content-between'],
          [1, 'flex-fill'],
          ['title', 'Chat Color Mode', 1, 'pb-2'],
          [1, 'pl-2'],
          [1, 'ml-5'],
          [
            'type',
            'color',
            'name',
            'follow-chat-text-color',
            'value',
            'followChatStyle.color',
            'id',
            'follow-chat-text-color',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'follow-chat-text-color', 1, 'form-check-label', 'ml-4', 'pl-2'],
          [
            'type',
            'color',
            'name',
            'follow-chat-username-color',
            'value',
            'followChatStyle.usernameColor',
            'id',
            'follow-chat-username-color',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'follow-chat-username-color', 1, 'form-check-label', 'ml-4', 'pl-2'],
          [
            'type',
            'color',
            'name',
            'follow-chat-bg-color',
            'value',
            'followChatStyle.bgColor',
            'id',
            'follow-chat-bg-color',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'follow-chat-bg-color', 1, 'form-check-label', 'ml-4', 'pl-2'],
          [
            'type',
            'color',
            'name',
            'follow-chat-ticker-color',
            'value',
            'followChatStyle.tickerColor',
            'id',
            'follow-chat-ticker-color',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'follow-chat-ticker-color', 1, 'form-check-label', 'ml-4', 'pl-2'],
          [
            'type',
            'number',
            'name',
            'follow-chat-text-size',
            'value',
            'followChatStyle.fontSize',
            'id',
            'follow-chat-text-size',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'follow-chat-text-size', 1, 'form-check-label', 'ml-4', 'pl-2'],
          [1, 'ml-5', 'text-mode-box'],
          [
            'type',
            'checkbox',
            'name',
            'follow-chat-donot-disturb',
            'value',
            'Chat Sound for followed user',
            'id',
            'follow-chat-donot-disturb',
            1,
            'form-check-input',
            3,
            'change',
            'checked'
          ],
          ['for', 'follow-chat-donot-disturb', 1, 'form-check-label'],
          [1, 'follow-user-example', 3, 'ngStyle'],
          [3, 'ngStyle'],
          [1, 'fw-bold'],
          [1, 'stockColor', 3, 'ngStyle'],
          [1, 'btn', 'btn-dark', 'btn-sm', 3, 'click', 'disabled', 'title'],
          [1, 'fa', 3, 'ngClass'],
          [1, 'text-right'],
          ['type', 'button', 1, 'btn', 'btn-outline-danger', 'mx-1', 3, 'click'],
          ['type', 'button', 1, 'btn', 'btn-outline-light', 3, 'click'],
          ['type', 'button', 1, 'btn', 'btn-outline-info', 3, 'click'],
          ['type', 'button', 1, 'btn', 'btn-outline-warning', 3, 'click'],
          [1, 'followingSign'],
          [1, 'fas', 'fa-ban', 'me-1']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 0)(1, 'div', 1)(2, 'div', 2)(3, 'div', 3)(4, 'div', 4),
            T(5, 'img', 5),
            H(6, $2e, 6, 1, 'div', 6),
            u(),
            d(7, 'h3', 7),
            v(8),
            H(9, z2e, 2, 0, 'span', 8)(10, G2e, 2, 0)(11, W2e, 2, 0, 'span', 9),
            u(),
            T(12, 'button', 10),
            u(),
            d(13, 'div', 11),
            H(14, uTe, 106, 17, 'div', 12)(15, fTe, 49, 21, 'div', 12),
            u(),
            d(16, 'div', 13),
            H(17, mTe, 2, 0, 'button', 14)(18, gTe, 2, 0, 'button', 14)(19, FTe, 6, 2),
            d(20, 'button', 15),
            x('click', function () {
              return o.doCloseModal();
            }),
            v(21, ' Close '),
            u()()()()()),
            2 & i &&
              (m(5),
              xn('alt', o.user.nick),
              z(
                'src',
                o.user.pic ||
                  'https://secure.gravatar.com/avatar/' + o.user.emailHash + '?d=mm&s=80',
                Mt
              ),
              m(),
              O(6, o.user.userXrefID === o.appService.globals.user.userXrefID ? 6 : -1),
              m(2),
              Ne(' ', o.user.nick, ' '),
              m(),
              O(
                9,
                o.appService.globals.isPresenter && !o.appService.globals.isLimitedPresenter
                  ? 9
                  : o.canEditUsername
                    ? 10
                    : -1
              ),
              m(2),
              O(11, o.user.isOffline ? 11 : -1),
              m(3),
              O(
                14,
                o.appService.globals.isPresenter && !o.appService.globals.isLimitedPresenter
                  ? 14
                  : -1
              ),
              m(),
              O(15, o.isFollowed ? 15 : -1),
              m(2),
              O(17, o.checkIsMe() ? 17 : -1),
              m(),
              O(18, o.canPM && o.checkIsMe() ? 18 : -1),
              m(),
              O(19, o.checkIsMe() ? 19 : -1)));
        },
        dependencies: [Di, Rl, qs, ai, Dd, Ss, ti, Ws, Yn, as, Op, XC, P_, Ip, QC, os, Rr],
        styles: [
          '@charset "UTF-8";.modal-title[_ngcontent-%COMP%]{vertical-align:middle}a[_ngcontent-%COMP%]{color:var(--modal-content-color)}#user-modal[_ngcontent-%COMP%]   nav[_ngcontent-%COMP%]{margin-bottom:16px}#user-modal[_ngcontent-%COMP%]   img[_ngcontent-%COMP%]{display:block;max-width:80px;min-width:50px;margin-right:10px}#nav-info[_ngcontent-%COMP%]   table[_ngcontent-%COMP%]{margin-bottom:0;width:0;flex-basis:100%}.table[_ngcontent-%COMP%]{color:var(--modal-content-color)}#user-modal[_ngcontent-%COMP%]   thead[_ngcontent-%COMP%]{font-size:20px}#user-modal[_ngcontent-%COMP%]   .nav-tabs[_ngcontent-%COMP%]{border-color:var(--modal-active-tab-border-color)!important}#user-modal[_ngcontent-%COMP%]   th[_ngcontent-%COMP%], #user-modal[_ngcontent-%COMP%]   td[_ngcontent-%COMP%]{border:none!important;background-color:var(--modal-content-bg-color);color:var(--modal-content-color)}#user-modal[_ngcontent-%COMP%]   th[_ngcontent-%COMP%]{width:100px;font-size:15px}#user-modal[_ngcontent-%COMP%]   td[_ngcontent-%COMP%]{font-size:14px}#user-modal[_ngcontent-%COMP%]   .modal-footer[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]{width:23%;margin:4px}#user-modal[_ngcontent-%COMP%]   .modal-dialog[_ngcontent-%COMP%]{max-width:600px}#user-modal[_ngcontent-%COMP%]   .tagline[_ngcontent-%COMP%]{display:block;font-size:14px;font-style:italic}.smallAvatarImg[_ngcontent-%COMP%]{max-width:20px!important;max-height:auto!important;display:inline!important}.edit-username[_ngcontent-%COMP%]{font-size:14px}.edit-username[_ngcontent-%COMP%]:hover{cursor:pointer;opacity:.85}.chat-stars[_ngcontent-%COMP%]{font-size:8px;vertical-align:text-top!important}span.chat-stars[_ngcontent-%COMP%]{margin-top:2px;margin-left:2px;display:inline-block}span.chat-stars[_ngcontent-%COMP%]{color:var(--app-primary-color)}.stars-container[_ngcontent-%COMP%]{position:relative}.stars-container[_ngcontent-%COMP%]   .stars-icon[_ngcontent-%COMP%]{color:var(--msg-color)}.stars-num[_ngcontent-%COMP%]{position:absolute;color:var(--msgs-bg);left:5px;top:3px;font-size:10px;font-weight:700}.followingSign[_ngcontent-%COMP%]:before{content:"\\2713";color:inherit;font-size:12px;margin-right:5px}#follow-chat-ticker-color[_ngcontent-%COMP%], #follow-chat-text-color[_ngcontent-%COMP%], #follow-chat-username-color[_ngcontent-%COMP%], #follow-chat-bg-color[_ngcontent-%COMP%], #follow-chat-text-size[_ngcontent-%COMP%]{width:45px;height:20px}#chat-text-size[_ngcontent-%COMP%]{font-size:13px}.follow-user-example[_ngcontent-%COMP%]{padding:10px;border-radius:5px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between}.text-mode-box[_ngcontent-%COMP%]   .form-check-input[_ngcontent-%COMP%]:checked + label[_ngcontent-%COMP%]{text-transform:uppercase;font-weight:700}.text-mode-box[_ngcontent-%COMP%]   .form-check-input[_ngcontent-%COMP%]{-webkit-appearance:none;-o-appearance:none;appearance:none;height:20px;width:20px;transition:all .15s ease-out 0s;background-color:var(--light-gray);border:none;color:var(--white);cursor:pointer;display:inline-block;margin-right:.5rem;outline:none;position:relative;z-index:1000;border-radius:50%}.text-mode-box[_ngcontent-%COMP%]   .form-check-label[_ngcontent-%COMP%]:hover{cursor:pointer;opacity:.85}.text-mode-box[_ngcontent-%COMP%]   .form-check-input[_ngcontent-%COMP%]:checked{background-color:var(--checkbox-bg-color)}.edit-user-avatar[_ngcontent-%COMP%]{position:relative}.edit-user-avatar-options[_ngcontent-%COMP%]{position:absolute;bottom:-8px;right:2px;padding:3px 4px;background-color:#fff;border-radius:50%;color:#444;line-height:16px;text-align:center;font-size:14px}.edit-user-avatar-options[_ngcontent-%COMP%]:hover{color:#000}.edit-user-avatar-options[_ngcontent-%COMP%]   .dropdown-toggle[_ngcontent-%COMP%]:after{display:none}.remove-profile-picture-btn[_ngcontent-%COMP%]{font-size:12px;margin:0 4px}'
        ]
      });
    }
  }
  return t;
})();
