Fue = (() => {
  class t {
    constructor(e, i) {
      ((this.appService = e),
        (this.formBuilder = i),
        (this.loginReady = !1),
        (this.browserOK = !0),
        (this.browserOKDismissed = !1),
        (this.disableLoginForm = !1),
        (this.rememberMe = !0),
        (this.forgetMe = !1),
        (this.nick = ''),
        (this.email = ''),
        (this.emailHash = ''),
        (this.pw = ''),
        (this.token = ''),
        (this.phoneNumber = ''),
        (this.showPresenter = !1),
        (this.hasRequiredPhoneInLogin = !1),
        (this.authMode = 'reg'),
        (this.showPW = !1),
        (this.readOnlyEmail = !1),
        (this.hasSTHelpLink = !0),
        (this.strictBrowserMode = !1),
        (this.disclosureDone = !1),
        (this.avatarOptions = !1),
        (this.customEnterDisclosure = ''),
        (this.dataurl = null),
        (this.dataBlob = null),
        (this.disableEditingUsername = !1),
        (this.usernameInstructions = ''),
        (this.forgotPassword = !1),
        (this.forgotPasswordStatus = null),
        (this.changePasswordStatus = null),
        (this.roomLoginURL = ''));
    }
    ngOnInit() {
      if (
        ((this.roomLoginURL = ''),
        this.appService.appEventBus.subscribe('loginFailed', (e) => {
          ((this.appService.globals.logginIn = !1),
            bootbox.alert(this.appService.globals.sessData.loginErrorMsg || e.message, () => {
              try {
                (this.appService.globals.sessData.loginErrorURL &&
                  (window.location.href = this.appService.globals.sessData.loginErrorURL),
                  e.reload && window.location.reload());
              } catch {}
            }));
        }),
        this.appService.appEventBus.subscribe('globalsLoaded', () => {
          if (
            ((this.showPresenter = this.appService.globals.sessData.showPasswordField),
            (this.usernameInstructions = this.appService.globals.sessData.usernameInstructions),
            (this.hasRequiredPhoneInLogin =
              this.appService.globals.sessData.hasRequiredPhoneInLogin),
            (this.customEnterDisclosure = this.appService.globals.sessData.customEnterDisclosure),
            (this.authMode = this.appService.globals.sessData.authMode),
            P('login form authMode: ' + this.authMode),
            this.appService.globals.loginPW &&
              ((this.pw = this.appService.globals.loginPW), P('Using passed pw: ' + this.pw)),
            this.appService.globals.loginNick &&
              ((this.nick = this.appService.globals.loginNick),
              this.appService.setPreference('savedNick', this.nick),
              P('Using passed nick: ' + this.nick)),
            this.appService.globals.loginEmail &&
              ((this.email = this.appService.globals.loginEmail),
              this.appService.setPreference('savedEmail', this.email),
              P('Using passed email: ' + this.email)),
            ('jwt' != this.authMode && !this.appService.globals.passedToken) || this.pw)
          )
            this.appService.globals.preferences &&
              ((this.rememberMe = !0),
              this.appService.globals.preferences.savedNick &&
                ((this.nick = this.appService.globals.preferences.savedNick), (this.forgetMe = !0)),
              this.appService.globals.preferences.savedEmail &&
                ((this.email = this.appService.globals.preferences.savedEmail),
                this.calculateAvatar()),
              this.appService.globals.preferences.phoneNumber &&
                (this.phoneNumber = this.appService.globals.preferences.phoneNumber));
          else if (('jwt' == this.authMode || this.appService.globals.passedToken) && !this.pw) {
            let e = '';
            if (
              (this.appService.globals.passedToken
                ? ((e = this.appService.globals.passedToken),
                  (this.appService.globals.decodedPassedToken = this.appService.getDecodedToken(e)))
                : ((e = this.appService.localstorage.get(
                    `token-${this.appService.globals.sessionID}`,
                    ''
                  )),
                  e && (this.appService.globals.passedToken = e)),
              !e)
            )
              return (
                (this.appService.globals.logginIn = !1),
                void bootbox.alert(
                  this.appService.globals.sessData.loginErrorMsg ||
                    'There was an error login in, please try again or contact support',
                  () => {
                    this.appService.globals.sessData.loginErrorURL &&
                      (window.location.href = this.appService.globals.sessData.loginErrorURL);
                  }
                )
              );
            {
              ((this.appService.globals.decodedPassedToken = this.appService.getDecodedToken(e)),
                P(
                  'Using tok:' +
                    e +
                    '. decoded:' +
                    JSON.stringify(this.appService.globals.decodedPassedToken)
                ),
                (this.appService.globals.isPlayer =
                  this.appService.globals.decodedPassedToken.isPTRPlayer));
              let i = !0;
              ((i = window.top === window.self),
                i && (P('removing tok from url'), this.appService.removeUrlParam('tok')),
                console.log('prefs: ' + JSON.stringify(this.appService.globals.preferences)),
                (this.nick = this.appService.globals.preferences.savedNick),
                this.nick || (this.nick = this.appService.globals.decodedPassedToken.name),
                this.email || (this.email = this.appService.globals.decodedPassedToken.email),
                this.hasRequiredPhoneInLogin &&
                  this.appService.globals.preferences.phoneNumber &&
                  (this.phoneNumber = this.appService.globals.preferences.phoneNumber),
                (this.disableEditingUsername =
                  'a' !== this.appService.globals.decodedPassedToken.perms &&
                  this.appService.globals.sessData.disableEditingUsername),
                this.email && e && (this.readOnlyEmail = !0),
                this.calculateAvatar(),
                this.appService.globals.disableLoginForm && (this.disableLoginForm = !0),
                this.appService.globals.isPlayer &&
                  'a' == this.appService.globals.decodedPassedToken.perms &&
                  ((this.readOnlyEmail = !0),
                  (this.disableLoginForm = !0),
                  (this.pw = ''),
                  (this.usernameInstructions =
                    'You can adjust your name here, it would be used to show the stream name'),
                  (this.appService.globals.sessData.hideNotes = !0),
                  (this.appService.globals.sessData.hideFiles = !0),
                  (this.appService.globals.sessData.hideStreams = !0),
                  (this.appService.globals.sessData.hideChatAlerts = !0),
                  (this.appService.globals.sessData.hideRoster = !0),
                  (this.appService.globals.sessData.hideVideoPlayer = !0)));
            }
          }
        }),
        this.appService.globals.sessData &&
          this.appService.globals.sessData.authMode &&
          ((this.authMode = this.appService.globals.sessData.authMode),
          P('login form done authMode: ' + this.authMode)),
        this.forgotPassword && ((this.forgotPasswordStatus = ''), this.addRecaptchScript()),
        this.appService.globals.changePasswordUID.length > 0)
      ) {
        ((this.changePasswordStatus = ''), this.addRecaptchScript());
        const e = window.location.href;
        ((this.roomLoginURL = e.substring(0, e.indexOf('&changePasswordUID='))),
          (this.changePasswordFormGroup = this.formBuilder.group({
            'change-password': ['', [aa.required, aa.minLength(6)]],
            'repeat-password': ['', [aa.required, aa.minLength(6)]],
            recaptcha: ['', aa.required]
          })));
      }
      (this.appService.appEventBus.subscribe('doRoomForgotPassword', (e) => {
        ((this.forgotPasswordStatus = e),
          console.log('forgotPasswordStatus: ', this.forgotPasswordStatus));
      }),
        this.appService.appEventBus.subscribe('doRoomChangePassword', (e) => {
          ((this.changePasswordStatus = e),
            console.log('changePasswordStatus: ', this.changePasswordStatus));
        }));
    }
    ngAfterViewInit() {
      this.forgotPasswordFormGroup = this.formBuilder.group({
        'forgot-email': [
          '',
          [aa.required, aa.email, aa.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')]
        ],
        recaptcha: ['', aa.required]
      });
    }
    doLoginCheck() {
      var e = this;
      return I(function* () {
        try {
          if (
            (yield e.appService.loadMyInfo(),
            e.appService.globals.sessData.banIPList.includes(e.appService.globals.userIP))
          )
            return !1;
        } catch {}
        var o;
        e.email && e.nick
          ? !e.hasRequiredPhoneInLogin ||
            (e.phoneNumber && /^[+]*[(]{0,1}[0-9]{1,3}[)]{0,1}[-\s\./0-9]*$/g.test(e.phoneNumber))
            ? e.pw || 'pw' != e.authMode || e.appService.globals.passedToken
              ? e.customEnterDisclosure && !e.disclosureDone
                ? bootbox.dialog({
                    title: 'Room Disclosure &amp; Compliance',
                    message: e.customEnterDisclosure,
                    className: 'custom-disclosure-modal',
                    buttons: {
                      cancel: {
                        label: 'Disagree',
                        className: 'btn-danger',
                        callback: () => {
                          ((e.disclosureDone = !1), bootbox.hideAll());
                        }
                      },
                      ok: {
                        label: 'I Agree',
                        className: 'btn-info',
                        callback:
                          ((o = I(function* () {
                            ((e.disclosureDone = !0), yield e.loginToRoom(), bootbox.hideAll());
                          })),
                          function () {
                            return o.apply(this, arguments);
                          })
                      }
                    }
                  })
                : e.loginToRoom()
              : bootbox.alert('Please enter your password')
            : bootbox.alert('Please enter a valid phone number...')
          : bootbox.alert('Please fill in your name and email...');
      })();
    }
    loginToRoom() {
      var e = this;
      return I(function* () {
        let i = { cver: e.appService.globals.clientVersion, nick: e.nick, email: e.email };
        if (
          (e.pw &&
            ((i.pw = e.pw),
            e.appService.globals.loginPW || e.appService.setPreference('savedPW', e.pw)),
          e.phoneNumber &&
            ((i.phone = e.phoneNumber), e.appService.setPreference('phoneNumber', e.phoneNumber)),
          e.appService.globals.preferences.profilePic &&
            (i.profilePic = e.appService.globals.preferences.profilePic),
          e.nick && e.appService.setPreference('savedNick', e.nick),
          e.email && e.appService.setPreference('savedEmail', e.email),
          ('jwt' == e.authMode || e.appService.globals.passedToken) && !e.pw)
        ) {
          e.appService.globals.sesionToken = e.appService.globals.passedToken;
          let o = (e.appService.globals.decodedSessionToken = e.appService.getDecodedToken(
            e.appService.globals.sesionToken
          ));
          if (!o)
            return void e.appService.appEventBus.emit('loginFailed', {
              message:
                'There was an error logging in. Your session might be expired. Please launch the room again from the main site.'
            });
          let s = null;
          try {
            s = e.appService.globals.user.id;
          } catch {}
          return (
            (e.appService.globals.user = {
              name: e.nick || o.name,
              email: o.email,
              perms: o.perms,
              isPresenter: 'a' === o.perms,
              userXrefID: o.xrefID
            }),
            s && (e.appService.globals.user.id = s),
            e.appService.globals.preferences.profilePic &&
              (e.appService.globals.user.profilePic = e.appService.globals.preferences.profilePic),
            P('User: ' + JSON.stringify(e.appService.globals.user)),
            void e.appService.connectToSocketServer()
          );
        }
        ((e.appService.globals.logginIn = !0),
          e.rememberMe &&
            ('sso' != e.authMode || e.pw) &&
            ((e.appService.globals.preferences.savedEmail = e.email),
            (e.appService.globals.preferences.savedNick = e.nick),
            e.appService.globals.loginPW || (e.appService.globals.preferences.savedPW = e.pw),
            (e.appService.globals.preferences.phoneNumber = e.phoneNumber),
            e.appService.savePreferences()));
        try {
          (yield e.appService.loadGlobals(e.appService.globals.sessionID),
            e.appService.doSessionLogin(i));
        } catch (o) {
          ((e.appService.globals.logginIn = !1),
            console.error(o),
            P('doSessionLogin Error:', o),
            bootbox.alert('There was an error login in, please try again or contact support'));
        }
      })();
    }
    showAvatarOptions() {
      this.avatarOptions = !this.avatarOptions;
    }
    calculateAvatar() {
      ((this.disableLoginForm = this.appService.globals.disableLoginForm),
        P('******** calculateAvatar disableLoginForm: ' + this.disableLoginForm),
        this.appService.globals.preferences.profilePic
          ? (this.avatarURL = this.appService.globals.preferences.profilePic)
          : this.email &&
            this.email.indexOf('@') > 0 &&
            (P('calc avatar. email:' + this.email),
            (this.avatarURL =
              'https://www.gravatar.com/avatar/' +
              this.appService.hashEmail(this.email) +
              '?d=mm')));
    }
    doForgetMe() {
      (P('forget me clicked...'),
        (this.appService.globals.preferences.savedEmail = ''),
        (this.appService.globals.preferences.savedNick = ''),
        (this.appService.globals.preferences.savedPW = ''),
        (this.appService.globals.preferences.phoneNumber = ''),
        (this.appService.globals.preferences.profilePic = ''),
        this.appService.savePreferences());
    }
    clearProfilePic() {
      bootbox.confirm('Are your sure you want to remove your profile picture?', (e) => {
        e &&
          ((this.appService.globals.preferences.profilePic = ''),
          (this.avatarURL = ''),
          this.appService.setPreference('profilePic', ''),
          this.calculateAvatar());
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
    doLoginFormClear() {
      ('jwt' == this.authMode && (this.readOnlyEmail = !1),
        this.appService.clearSavedToken(this.appService.globals.sessionID),
        (this.nick = ''),
        (this.email = ''),
        (this.pw = ''),
        (this.phoneNumber = ''),
        (this.appService.globals.preferences.savedPW = ''),
        (this.appService.globals.preferences.phoneNumber = ''),
        (this.appService.globals.preferences.savedNick = ''),
        (this.appService.globals.preferences.savedEmail = ''),
        this.appService.savePreferences(),
        window.location.reload());
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
            (P('Uploading... ' + e.name),
              bootbox.alert(
                `Uploading: ${e.name}... Please wait...<br><div style="text-align: center;"><i class="ml-2 fas fa-spinner fa-spin fa-3x"></i></div>`
              ));
          },
          success: function (l) {
            (bootbox.hideAll(),
              P('image link:' + l.data.link),
              (i.appService.globals.preferences.profilePic = l.data.link),
              (i.avatarURL = l.data.link),
              i.appService.setPreference('profilePic', l.data.link));
          },
          error: function (l) {
            (console.error(l), bootbox.hideAll(), bootbox.alert('Upload Failed...'));
          }
        }).done(function (l) {
          console.log('done resp:', l);
        }));
    }
    resolved(e) {
      console.log(`Resolved response token: ${e}`);
    }
    toggleRoomForgotPassword(e = null) {
      ((this.forgotPassword = !this.forgotPassword), 'success' == e && window.location.reload());
    }
    doRoomForgotPassword() {
      const e = this.forgotPasswordFormGroup.value['forgot-email'];
      this.validateEmail(e)
        ? this.appService.doRoomForgotPassword(
            e,
            window.location.href,
            this.forgotPasswordFormGroup.value.recaptcha
          )
        : bootbox.alert('Error: please enter a valid email');
    }
    doRoomChangePassword() {
      const e = this.changePasswordFormGroup.value['change-password'],
        i = this.changePasswordFormGroup.value['repeat-password'];
      e == i
        ? e.length < 6 || i.length < 6
          ? bootbox.alert("Error:your passwords can't be less than 6 characters")
          : this.appService.doRoomChangePassword(
              e,
              this.appService.globals.changePasswordUID,
              this.changePasswordFormGroup.value.recaptcha
            )
        : bootbox.alert("Error: your passwords don't match");
    }
    addRecaptchScript() {
      const e = document.createElement('script');
      ((e.src = 'https://www.google.com/recaptcha/api.js'),
        (e.async = !0),
        (e.defer = !0),
        document.body.appendChild(e));
    }
    validateEmail(e) {
      return (
        !(!e || e.indexOf('@example.com') >= 0) &&
        /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
          e
        )
      );
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(pJ));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-session-login']],
        inputs: { loginReady: 'loginReady' },
        decls: 2,
        vars: 1,
        consts: [
          [1, 'position-relative', 'w-100', 'h-100'],
          [1, 'position-absolute', 'top-50', 'start-50', 'translate-middle'],
          [1, 'fas', 'fa-spinner', 'fa-spin', 'fa-2x'],
          [1, 'ms-3', 'loading-message'],
          [1, 'login-wrapper'],
          [1, 'container-fluid'],
          [
            1,
            'col-md-2',
            'col-sm-10',
            'login-form',
            2,
            'border-left',
            'solid 1px #0a0a0a',
            'height',
            '100%'
          ],
          [1, 'row', 'login-row'],
          [
            'id',
            'avatar-from-gmail-modal',
            'tabIndex',
            '-1',
            'role',
            'dialog',
            'aria-labelledby',
            'avatar-from-gmail-modal',
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
          [1, 'form-group'],
          ['for', 'gmail-avatar'],
          [
            'type',
            'text',
            'id',
            'gmail-avatar',
            'name',
            'gmail-avatar',
            'placeholder',
            'johndoe@gmail.com',
            1,
            'form-control'
          ],
          [1, 'modal-footer', 'text-center'],
          [
            'type',
            'button',
            'data-bs-dismiss',
            'modal',
            'aria-label',
            'Close',
            1,
            'btn',
            'btn-primary'
          ],
          ['type', 'button', 1, 'btn', 'btn-success'],
          [
            'id',
            'avatar-from-facebook-modal',
            'tabIndex',
            '-1',
            'role',
            'dialog',
            'aria-labelledby',
            'avatar-from-facebook-modal',
            'aria-hidden',
            'true',
            1,
            'modal',
            'fade'
          ],
          ['for', 'facebook-avatar'],
          [
            'type',
            'text',
            'id',
            'facebook-avatar',
            'name',
            'facebook-avatar',
            'placeholder',
            'johndoe',
            1,
            'form-control'
          ],
          [1, 'animated', 'flash', 2, 'color', 'red', 'font-size', '20px'],
          [2, 'text-align', 'center', 'width', '100%'],
          [
            'src',
            '/public/images/supported_browsers.jpeg',
            2,
            'width',
            '50%',
            'text-align',
            'center'
          ],
          [1, 'center'],
          [2, 'text-decoration', 'underline'],
          ['href', 'https://www.google.com/chrome', 'target', '_blank'],
          ['href', 'https://www.mozilla.org/firefox/', 'target', '_blank'],
          ['href', 'https://opera.com', 'target', '_blank'],
          [1, 'btn', 'btn-danger', 'btn-link', 'mb'],
          [1, 'btn', 'btn-danger', 'btn-link', 'mb', 3, 'click'],
          [
            1,
            'col-md-6',
            'col-sm-6',
            'd-xs-none',
            'animated',
            'fadeInLeft',
            'faster',
            'room-message'
          ],
          [1, 'room-title'],
          [1, 'room-description', 2, 'height', '100%', 'overflow-x', 'hidden', 3, 'innerHtml'],
          [
            1,
            'col-md-6',
            'col-sm-12',
            'col-xs-12',
            'login-form-container',
            'animated',
            'fadeInRight',
            'faster'
          ],
          [1, 'login-form', 'mb-3'],
          [1, 'login-footer'],
          [1, 'text-center'],
          ['href', 'https://protradingroom.com', 'target', '_blank'],
          [1, 'w-100', 3, 'formGroup'],
          [1, 'p-2'],
          [
            'type',
            'button',
            1,
            'btn',
            'btn-secondary',
            'buttonload',
            'text-center',
            'pl-2',
            'pr-2',
            3,
            'click'
          ],
          [1, 'fas', 'fa-arrow-left', 'me-1'],
          ['for', 'forgot-email'],
          [1, 'input-group', 'mb-3'],
          [
            'type',
            'email',
            'id',
            'forgot-email',
            'formControlName',
            'forgot-email',
            'placeholder',
            'Email',
            'aria-label',
            'email',
            'aria-describedby',
            'addon-email',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel',
            'disabled'
          ],
          ['id', 'addon-email', 1, 'input-group-text', 'pl-2', 'pr-2'],
          [1, 'fas', 'fa-envelope'],
          ['formControlName', 'recaptcha'],
          [1, 'd-flex', 'align-items-center', 'justify-content-between'],
          [
            'type',
            'submit',
            1,
            'btn',
            'btn-primary',
            'buttonload',
            'text-center',
            'pl-2',
            'pr-2',
            3,
            'click',
            'disabled'
          ],
          [1, 'fas', 'fa-paper-plane', 'me-1'],
          [3, 'href'],
          ['for', 'change-password'],
          [
            'type',
            'password',
            'id',
            'change-password',
            'formControlName',
            'change-password',
            'placeholder',
            'Your new password',
            'aria-label',
            'Your new password',
            'aria-describedby',
            'addon-change-password',
            'autocomplete',
            'off',
            1,
            'form-control'
          ],
          ['id', 'addon-change-password', 1, 'input-group-text', 'pl-2', 'pr-2'],
          [1, 'fas', 'fa-lock'],
          ['for', 'repeat-password'],
          [
            'type',
            'password',
            'id',
            'repeat-password',
            'formControlName',
            'repeat-password',
            'placeholder',
            'Type your new password again',
            'aria-label',
            'Type your new password again',
            'aria-describedby',
            'addon-repeat-password',
            'autocomplete',
            'off',
            1,
            'form-control'
          ],
          ['id', 'addon-repeat-password', 1, 'input-group-text', 'pl-2', 'pr-2'],
          [1, 'd-flex', 'align-items-center', 'justify-content-end'],
          [1, 'text-center', 'authenticate-info'],
          [1, 'mb-3', 'login-form', 3, 'submit'],
          [1, 'loginGravatar'],
          [1, 'text-center', 'user-avatar'],
          ['src', 'https://www.gravatar.com/avatar/your_email_address?d=mm'],
          ['title', 'Setup Avatar', 1, 'setup-avatar', 3, 'click'],
          [1, 'fas', 'fa-cog'],
          [1, 'user-nick'],
          [1, 'avatar-options'],
          ['for', 'login-nickname-new'],
          [
            'type',
            'text',
            'id',
            'login-nickname-new',
            'name',
            'login-nickname-new',
            'placeholder',
            'Name or Nickname',
            'aria-label',
            'Name',
            'aria-describedby',
            'nickHelpBlock',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel',
            'disabled'
          ],
          ['id', 'addon-admin', 1, 'input-group-text', 'pl-2', 'pr-2'],
          [1, 'fas', 'fa-user'],
          ['id', 'nickHelpBlock', 1, 'form-text'],
          [1, 'error', 'text-danger', 'small'],
          [1, 'mb-3'],
          [1, 'text-center', 'muted'],
          [1, 'd-flex', 'p-2', 'justify-content-between', 'mt-3', 'align-items-center'],
          [1, 'form-check'],
          [
            'type',
            'submit',
            1,
            'btn-login',
            'btn',
            'btn-primary',
            'buttonload',
            'text-center',
            'pl-2',
            'pr-2',
            3,
            'disabled'
          ],
          [1, 'mt-1', 'text-right'],
          [1, 'session-login-link', 3, 'click'],
          [3, 'src'],
          ['href', 'https://en.gravatar.com/', 'target', '_blank', 'rel', 'noopener noreferrer'],
          ['href', '', 'rel', 'noopener noreferrer', 3, 'click'],
          [1, 'fas', 'fa-file-upload'],
          ['type', 'button', 1, 'btn', 'btn-danger', 'btn-sm', 'rounded-pill', 3, 'click'],
          [1, 'fas', 'fa-times'],
          [1, 'fas', 'fa-exclamation-triangle', 'me-1'],
          ['for', 'login-email'],
          [
            'type',
            'email',
            'id',
            'login-email',
            'name',
            'login-email',
            'placeholder',
            'Email',
            'aria-label',
            'email',
            'aria-describedby',
            'addon-email',
            1,
            'form-control',
            3,
            'ngModelChange',
            'input',
            'ngModel',
            'disabled'
          ],
          ['for', 'login-user-phone-number'],
          [
            'type',
            'tel',
            'id',
            'login-user-phone-number',
            'name',
            'login-user-phone-number',
            'placeholder',
            '123456789',
            'aria-label',
            'Phone Number',
            'aria-describedby',
            'addon-phone-number',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [1, 'input-group-append'],
          ['id', 'addon-phone-number', 1, 'input-group-text', 'pl-2', 'pr-2'],
          [1, 'fas', 'fa-phone'],
          ['for', 'login-password'],
          [1, 'input-group', 'mb-', '3'],
          [
            'type',
            'password',
            'id',
            'login-password',
            'name',
            'login-password',
            'placeholder',
            'password',
            'aria-label',
            'password',
            'aria-describedby',
            'addon-password',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['id', 'addon-password', 1, 'input-group-text', 'pl-2', 'pr-2'],
          [1, 'text-right', 'mt-1'],
          [1, 'ml-2'],
          ['href', '#', 1, 'session-login-link'],
          [1, 'fas', 'fa-cog', 'fa-spin'],
          [
            'type',
            'checkbox',
            'id',
            'remember-me',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel',
            'ngModelOptions'
          ],
          ['for', 'remember-me', 1, 'form-check-label'],
          [3, 'click'],
          [1, 'ml-2', 'fas', 'fa-spinner', 'fa-spin'],
          [1, 'mt-3', 't', 'text-center'],
          [1, 'mt-3', 't', 'text-center', 3, 'click'],
          [1, 'session-login-link'],
          [2, 'text-decoration', 'underline', 'font-size', 'larger'],
          ['type', 'checkbox', 'id', 'non-presenter', 1, 'form-check-input'],
          ['for', 'non-presenter', 1, 'form-check-label'],
          [
            1,
            'col-md-6',
            'offset-md-3',
            'col-sm-6',
            'offset-sm-3',
            'col-xs-12',
            'login-form-container',
            'animated',
            'fadeInRight',
            'faster'
          ],
          [
            'type',
            'email',
            'id',
            'forgot-email',
            'formControlName',
            'forgot-email',
            'placeholder',
            'Email',
            'aria-label',
            'email',
            'aria-describedby',
            'addon-forgot-email',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel',
            'disabled'
          ],
          ['id', 'addon-forgot-email', 1, 'input-group-text', 'pl-2', 'pr-2']
        ],
        template: function (i, o) {
          (1 & i && H(0, gde, 5, 0, 'div', 0)(1, yue, 39, 2),
            2 & i && O(0, o.appService.globals.logginIn ? 0 : 1));
        },
        dependencies: [qs, ai, Ss, ti, Ws, Yn, as, Zg, HF, nL, fde, Rr],
        styles: [
          '[_nghost-%COMP%]{background-color:#fff}.navLogo[_ngcontent-%COMP%]{max-height:35px;max-width:100%}.navbar[_ngcontent-%COMP%]{padding:20px}.nav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{color:#fff}.roomNameHeader[_ngcontent-%COMP%]{text-align:left;padding-left:70px;text-overflow:ellipsis;width:100%;font-size:2em;color:#fff}.login-wrapper[_ngcontent-%COMP%]{font-size:16px;color:var(--dark-black);background-color:var(--lighter-gray);height:100vh;padding-bottom:20px;overflow-y:auto;overflow-x:none}.login-wrapper[_ngcontent-%COMP%]   .login-form-container[_ngcontent-%COMP%]{padding-top:15px}.login-wrapper[_ngcontent-%COMP%]   form[_ngcontent-%COMP%]{max-width:360px;margin:auto}.login-wrapper[_ngcontent-%COMP%]   .input-group[_ngcontent-%COMP%] > .input-group-append[_ngcontent-%COMP%] > .input-group-text[_ngcontent-%COMP%]{background-color:var(--white)}.login-wrapper[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]{color:#28a1b5}.login-wrapper[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{color:#375a7f}.login-wrapper[_ngcontent-%COMP%]   .room-message[_ngcontent-%COMP%]{padding-top:30px}.login-wrapper[_ngcontent-%COMP%]   h1.room-title[_ngcontent-%COMP%]{font-size:24px;padding:0 0 15px;border-bottom:1px solid var(--light-gray);text-align:center;max-width:360px;margin:auto}.login-wrapper[_ngcontent-%COMP%]   div.room-description[_ngcontent-%COMP%]{max-width:80%;margin:5% auto;font-size:20px!important}.login-wrapper[_ngcontent-%COMP%]   .room-description[_ngcontent-%COMP%]   img[_ngcontent-%COMP%]{width:100%;height:auto}.login-wrapper[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]{margin:auto;max-width:360px}.login-wrapper[_ngcontent-%COMP%]   div.login-footer[_ngcontent-%COMP%]{font-size:12px}.login-wrapper[_ngcontent-%COMP%]   p.authenticate-info[_ngcontent-%COMP%]{padding:15px 0}.login-wrapper[_ngcontent-%COMP%]   .form-control[_ngcontent-%COMP%]{border:1px solid var(--lighter-gray);border-right:none}.login-wrapper[_ngcontent-%COMP%]   .input-group-append[_ngcontent-%COMP%]{border:1px solid var(--lighter-gray);border-left:none}.login-wrapper[_ngcontent-%COMP%]   .form-control[_ngcontent-%COMP%]:focus{border:1px solid var(--lighter-gray);border-right:none;box-shadow:1px 1px 3px var(--lighter-gray)}.login-wrapper[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]{font-size:16px}.login-options[_ngcontent-%COMP%]{height:56px;background-color:var(--dark-black);color:var(--white)}.login-form[_ngcontent-%COMP%]{background-color:var(--white);padding:15px 25px;box-shadow:2px 2px 5px var(--light-gray);border-radius:7px}.login-form[_ngcontent-%COMP%]   label[_ngcontent-%COMP%]{font-size:14px;margin-bottom:2px}.login-form[_ngcontent-%COMP%]   .form-check-label[_ngcontent-%COMP%]{font-size:12px}.user-avatar[_ngcontent-%COMP%]{position:relative}.user-avatar[_ngcontent-%COMP%]   .setup-avatar[_ngcontent-%COMP%]{cursor:pointer;position:relative;top:25px;left:-20px;padding:var(--avatar-gear-icon-padding);background-color:var(--white);border-radius:50%}.avatar-options[_ngcontent-%COMP%]{margin:3px auto;width:155px}.avatar-options[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{text-decoration:none}.avatar-options[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover{color:var(--dark-black)}.user-nick[_ngcontent-%COMP%]{font-style:italic;font-size:15px;margin-left:0}.btn-login[_ngcontent-%COMP%]{min-width:130px;border-radius:50px;border:none;font-weight:700;font-size:14px;line-height:14px;height:30px}.btn-login[_ngcontent-%COMP%]:focus, .btn-login[_ngcontent-%COMP%]:active{outline:none!important;box-shadow:none!important;border:none}.loginGravatar[_ngcontent-%COMP%]{min-height:106px}.loginGravatar[_ngcontent-%COMP%]   img[_ngcontent-%COMP%]{width:80px;height:80px;object-fit:cover;border-radius:50%;border:1px solid var(--lighter-gray);margin-left:27px}.login-row[_ngcontent-%COMP%]{padding-top:20px}.login-form[_ngcontent-%COMP%]   .form-check[_ngcontent-%COMP%]:hover{cursor:pointer}.loading-message[_ngcontent-%COMP%]{font-size:24px}.session-login-link[_ngcontent-%COMP%]{font-size:14px}.session-login-link[_ngcontent-%COMP%]:hover{text-decoration:underline!important;cursor:pointer}@media only screen and (max-width: 767px){span.roomNameHeader[_ngcontent-%COMP%], .login-row[_ngcontent-%COMP%]   div.fadeInLeft[_ngcontent-%COMP%]{display:none}.login-form-container[_ngcontent-%COMP%]{border:none}.navLogo[_ngcontent-%COMP%]{max-width:200px}}@media only screen and (max-width: 320px){.navLogo[_ngcontent-%COMP%]{max-width:150px}}'
        ]
      });
    }
  }
  return t;
})();
