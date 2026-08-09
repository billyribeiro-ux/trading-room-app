function FRe(t, n) {
  (1 & t && T(0, 'app-room', 1), 2 & t && z('ngClass', g(2).activeTheme));
}
function CRe(t, n) {
  1 & t && T(0, 'app-closed-session-page');
}
function SRe(t, n) {
  (1 & t && T(0, 'app-kicked-page', 2), 2 & t && z('msg', g(2).kickedMsg));
}
function wRe(t, n) {
  1 & t && T(0, 'app-detached-screen');
}
function TRe(t, n) {
  (1 & t && T(0, 'app-session-login', 3), 2 & t && z('loginReady', g(2).loginReady));
}
function DRe(t, n) {
  if ((1 & t && H(0, FRe, 1, 1)(1, CRe, 1, 0)(2, SRe, 1, 1)(3, wRe, 1, 0)(4, TRe, 1, 1), 2 & t)) {
    let e;
    O(
      0,
      'chat' === (e = g().currPage)
        ? 0
        : 'closed' === e
          ? 1
          : 'kicked' === e
            ? 2
            : 'detachedScreen' === e
              ? 3
              : 4
    );
  }
}
ERe = (() => {
  class t {
    constructor(e, i, o) {
      ((this.appService = e),
        (this.titleService = i),
        (this.router = o),
        (this.title = 'PTRChat'),
        (this.activeTheme = 'lightTheme'),
        (this.currPage = 'login'),
        (this.loginReady = !1),
        (this.kickedMsg = 'Kicked'),
        (this.isTranscriptRoute = !1),
        this.router.events.pipe(vi((s) => s instanceof xr)).subscribe((s) => {
          this.isTranscriptRoute = s.urlAfterRedirects.includes('/session-transcript');
        }),
        (this.isTranscriptRoute =
          this.router.url.includes('/session-transcript') ||
          (typeof window < 'u' && window.location.hash.includes('/session-transcript'))));
    }
    ngOnInit() {
      var e = this;
      if (
        (this.isTranscriptRoute ||
          (this.isTranscriptRoute =
            this.router.url.includes('/session-transcript') ||
            (typeof window < 'u' && window.location.hash.includes('/session-transcript'))),
        typeof window < 'u' && window.location.hash.startsWith('#/session-transcript'))
      ) {
        const oe = window.location.hash.substring(1);
        this.router.navigateByUrl(oe).catch((se) => {
          console.error('Error navigating to transcript route:', se);
        });
      }
      (this.appService.appEventBus.subscribe('globalsLoaded', (oe) => {
        if (
          (this.titleService.setTitle(this.appService.globals.sessionName),
          this.appService.globals.sessData.customFaviconURL &&
            this.changeFavicon(this.appService.globals.sessData.customFaviconURL),
          this.appService.globals.sessData.customCSS &&
            this.addCustomCSS(this.appService.globals.sessData.customCSS),
          this.appService.globals.sessData.playChatMessageSoundFor &&
            this.appService.globals.sessData.playChatMessageSoundFor.length > 0)
        ) {
          const se = this.appService.globals.sessData.playChatMessageSoundFor
            .replace(' ', '')
            .split(',');
          for (const _e of se) {
            const Te = this.appService.hashEmail(_e);
            this.appService.globals.playChatMessageSoundFor.includes(Te) ||
              this.appService.globals.playChatMessageSoundFor.push(Te);
          }
        }
      }),
        P('********* started version ' + JSON.stringify(DO)),
        (this.appService.globals.appVersion += '-' + DO.hash),
        this.appService.appEventBus.subscribe('getSessionState', (oe) => {
          if ('closed' == this.appService.globals.sessData.currentState)
            return ((this.currPage = 'closed'), void P('closedPage'));
          'open' == this.appService.globals.sessData.currentState &&
            'login' == this.currPage &&
            ((this.currPage = 'chat'),
            this.appService.appEventBus.emit('appDataReady'),
            this.appService.loadSessionLogs());
        }));
      let o = !1;
      (this.appService.appEventBus.subscribe('doSessionAuthFail', (oe) => {
        if (!o) {
          o = !0;
          const se =
            this.appService.globals.sessData.loginErrorMsg ||
            'Sorry, your session has expired or is invalid, please log in again';
          ((this.appService.globals.loggedIn = !1),
            bootbox.alert(se, () => {
              this.appService.globals.sessData.loginErrorURL &&
                (window.location.href = this.appService.globals.sessData.loginErrorURL);
            }));
        }
        (this.appService.disconnectAll(), (this.appService.globals.loggedIn = !1));
      }),
        this.appService.appEventBus.subscribe('hardReset', () => {
          (this.appService.disconnectAll(),
            bootbox.alert(
              'The room is being reset by an administrator. Click OK to continue...',
              () => {
                window.location.reload();
              }
            ));
        }),
        this.appService.appEventBus.subscribe('kickPage', (oe) => {
          ((this.kickedMsg = oe), (this.currPage = 'kicked'));
        }),
        this.appService.appEventBus.subscribe('closedPage', (oe) => {
          this.currPage = 'closed';
        }),
        this.appService.appEventBus.subscribe('openSession', () => {
          bootbox.alert('The session is now open, click here to reload the page and enter', () => {
            window.location.reload();
          });
        }),
        this.appService.appEventBus.subscribe('forceReload', (oe) => {
          bootbox.alert('You need to reload this page to continue', () => {
            window.location.reload();
          });
        }),
        this.appService.appEventBus.subscribe('permsChangeReload', (oe) => {
          bootbox.alert(
            'An admin has changed your room permissions, you need to reload this page to continue',
            () => {
              window.location.href = `${this.appService.globals.apiROOT}/sessions/v2/reAuthSessionTok?sessionID=${this.appService.globals.sessionID}&tok=${this.appService.globals.sesionToken}&r=1`;
            }
          );
        }),
        this.appService.guiEventBus.subscribe('switchTheme', (oe) => {
          ((this.activeTheme = oe),
            P('ap new theeme: ' + oe),
            P('Curr app theme: ' + this.activeTheme),
            this.appService.setPreference('theme', oe));
        }),
        this.appService.appEventBus.subscribe('doMsgDelete', (oe) => {
          oe.shiftDelete
            ? this.appService.deleteMessage(oe)
            : bootbox.confirm(
                'Are you sure you want to delete this message by ' + oe.n + '. text: ' + oe.txt,
                (se) => {
                  se && this.appService.deleteMessage(oe);
                }
              );
        }),
        this.appService.appEventBus.subscribe('usersDoMsgDelete', (oe) => {
          oe.shiftDelete
            ? this.appService.userDeleteMessage(oe)
            : bootbox.confirm('Are you sure you want to delete your message: ' + oe.txt, (se) => {
                se && this.appService.userDeleteMessage(oe);
              });
        }),
        this.appService.appEventBus.subscribe('doAlertDelete', (oe) => {
          (console.log('delete this alert', oe),
            oe.shiftDelete
              ? this.deleteAlertMessage(oe)
              : bootbox.confirm(
                  'Are you sure you want to delete this alert by ' + oe.n + '. text: ' + oe.txt,
                  (se) => {
                    se && this.deleteAlertMessage(oe);
                  }
                ));
        }),
        this.appService.appEventBus.subscribe(
          'doQAAlertDelete',
          ({ msg: oe, qaMsgID: se, msgIndex: _e }) => {
            (console.log('delete this qa alert', oe),
              oe.shiftDelete
                ? this.appService.deleteQAAlert({ qaMsgID: se, msgIndex: _e })
                : bootbox.confirm(
                    'Are you sure you want to delete this alert by ' + oe.n + '. text: ' + oe.txt,
                    (Te) => {
                      Te && this.appService.deleteQAAlert({ qaMsgID: se, msgIndex: _e });
                    }
                  ));
          }
        ),
        this.appService.appEventBus.subscribe('debugLogResp', (oe) => {
          ($('#debug-log-modal').modal('show'), $('#debugLogModalTxt').text(oe.join('\n')));
        }));
      const s = new URLSearchParams(window.location.search),
        r = s.get('id');
      var a = s.get('tok');
      const l = s.get('sl'),
        c = s.get('forcedStream'),
        h = s.get('dscreen'),
        f = s.get('r'),
        _ = s.get('vo'),
        F = s.get('co'),
        S = s.get('pw'),
        w = s.get('email'),
        M = s.get('name'),
        B = s.get('dlf'),
        W = s.get('kt'),
        J = window.location.href;
      (console.log('**** hash', J),
        J.includes('/session-transcript') && (this.isTranscriptRoute = !0),
        W && '1' === W && ((this.appService.globals.kt = !0), P('kt enabled...')));
      const te = s.get('changePasswordUID');
      if (
        (P('app.comp path:' + window.location.pathname + ' detachedScreen: ' + h + '. tok:' + a),
        !f)
      ) {
        if (
          (a
            ? (P('storing passed token: ' + a), this.appService.storePassedToken(r, a))
            : (a = this.appService.getPassedToken(r)) &&
              P('got passed token from local storage: ' + a),
          te &&
            (console.log('changePasswordUID: ', te),
            (this.appService.globals.changePasswordUID = te)),
          S && (this.appService.globals.loginPW = S),
          w && (this.appService.globals.loginEmail = w),
          M && (this.appService.globals.loginNick = M),
          f && '1' === f && (this.appService.globals.videoOnlyMode = !0),
          _ && '1' === _ && (this.appService.globals.viewerOnlyMode = !0),
          _ &&
            '2' === _ &&
            ((this.appService.globals.viewerOnlyMode = !0),
            (this.appService.globals.viewerOnlyModeLimited = !0)),
          F && '1' === F && (this.appService.globals.chatOnlyMode = !0),
          h && ((this.appService.globals.isDetached = !0), (this.currPage = 'detachedScreen')),
          B &&
            '1' === B &&
            ((this.appService.globals.disableLoginForm = !0),
            P(
              '******** app.component disableLoginForm: ' + this.appService.globals.disableLoginForm
            )),
          !r && !this.isTranscriptRoute)
        )
          return void bootbox.alert('Something is not right...');
        I(function* () {
          if (
            (a && (e.appService.globals.passedToken = a),
            yield Promise.all([e.appService.loadGlobals(r), e.appService.loadMyInfo()]),
            (e.loginReady = !0),
            c && (e.appService.globals.forcedStreamServer = c),
            a)
          ) {
            let _e = e.appService.decodeToken(a);
            if (_e && 'a' == _e.perms)
              try {
                window.location !== window.parent.location &&
                  (P('admin and on an iframe, opening up in new window...'),
                  bootbox.confirm(
                    'You seem to be a presenter and be running inside an iframe, click OK to load the page in regular mode so that you can present',
                    function (Te) {
                      Te && (window.parent.location = window.location + '&kt=1');
                    }
                  ));
              } catch {}
            if ('1' == l) {
              if (
                (P('Autologin..'),
                (e.appService.globals.skeepLogin = !0),
                (e.appService.globals.logginIn = !0),
                !a)
              )
                return void e.appService.appEventBus.emit(
                  'loginFailed',
                  'There was an error login in, please try again or contact support'
                );
              e.appService.doSessionLoginWithToken(a);
            }
          }
        })();
        let oe = this;
        window.addEventListener('beforeunload', function (se) {
          oe.appService.appEventBus.emit('disconectSocket');
        });
      }
    }
    ngAfterViewInit() {
      this.appService.loadPreferences();
      let e = this.appService.getPreference('theme');
      (console.log('savedTheme', e),
        e &&
          (this.appService.globals.chatStyle.hasOwnProperty(e)
            ? (this.activeTheme = e)
            : (console.warn(`Invalid theme "${e}" found, falling back to lightTheme`),
              (this.activeTheme = 'lightTheme'),
              this.appService.setPreference('theme', 'lightTheme'))));
    }
    deleteAlertMessage(e) {
      this.appService.globals.sessData.deleteAlertPW
        ? bootbox.prompt({
            title: 'Please enter the password to delete this alert:',
            value: '',
            callback: (i) => {
              i &&
                (i.trim() === this.appService.globals.sessData.deleteAlertPW
                  ? this.appService.deleteAlert(e)
                  : bootbox.alert('Wrong password!'));
            }
          })
        : this.appService.deleteAlert(e);
    }
    changeFavicon(e) {
      (P('changeFavicon to ' + e), (e = e + '?=' + Math.random()));
      var i = document.createElement('link'),
        o = document.getElementById('dynamic-favicon'),
        s = document.querySelector('link[type="image/x-icon"]');
      ((i.id = 'dynamic-favicon'),
        (i.rel = 'icon'),
        (i.href = e),
        s && document.head.removeChild(s),
        o && document.head.removeChild(o),
        document.head.appendChild(i));
    }
    addCustomCSS(e) {
      if (e && e.indexOf('https') >= 0) {
        const i = document.createElement('link');
        ((i.rel = 'stylesheet'), (i.type = 'text/css'), (i.href = e), document.head.appendChild(i));
      } else {
        const i = document.createElement('style');
        (i.appendChild(document.createTextNode(e)), document.head.appendChild(i));
      }
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(mF), be(Es));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-root']],
        decls: 3,
        vars: 1,
        consts: [
          ['autoplay', 'autoplay', 'hidden', 'true', 'id', 'webcam'],
          ['id', 'topRoomDiv', 3, 'ngClass'],
          [3, 'msg'],
          [3, 'loginReady']
        ],
        template: function (i, o) {
          (1 & i && (T(0, 'router-outlet'), H(1, DRe, 5, 1), T(2, 'audio', 0)),
            2 & i && (m(), O(1, o.isTranscriptRoute ? -1 : 1)));
        },
        dependencies: [Di, CS, Fue, Q4e, X4e, _Re, yRe],
        styles: [
          '.container-fluid[_ngcontent-%COMP%]{height:100%;width:100%}.popOverDiv[_ngcontent-%COMP%]{padding:0!important}'
        ]
      });
    }
  }
  return t;
})();
