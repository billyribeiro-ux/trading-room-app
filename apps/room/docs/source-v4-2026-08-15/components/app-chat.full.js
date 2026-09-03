const I_e = ['chatWidth'],
  O_e = ['searchTermTxt'],
  N_e = (t, n) => n.name,
  L_e = (t, n) => n.title,
  B_e = (t) => ({ 'chat-uploaded-img-sm': t }),
  U_e = (t) => ({ active: t }),
  kw = (t) => ({ visible: t });
function j_e(t, n) {
  1 & t && (d(0, 'span'), v(1, '\xa0Chat'), u());
}
function V_e(t, n) {
  1 & t && (d(0, 'span', 11), T(1, 'i', 26), v(2, ' DND'), u());
}
function H_e(t, n) {
  if ((1 & t && (d(0, 'span', 29), v(1), u()), 2 & t)) {
    const e = g(2).$implicit,
      i = g(2);
    (m(), Ne(' (', i.unreadMentions[e.name], ')'));
  }
}
function $_e(t, n) {
  if ((1 & t && (d(0, 'span', 28), v(1), H(2, H_e, 2, 1, 'span', 29), u()), 2 & t)) {
    const e = g().$implicit,
      i = g(2);
    (m(),
      Ne('', i.unreadMsgs[e.name], ' '),
      m(),
      O(2, i.appService.globals.isPresenter && i.unreadMentions[e.name] ? 2 : -1));
  }
}
function z_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 14)(1, 'a', 27),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(2).switchChatChannel(o.name));
      }),
      v(2),
      H(3, $_e, 3, 2, 'span', 28),
      u()());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = g(2);
    (m(),
      z('ngClass', ct(3, U_e, e.name == i.channel)),
      m(),
      Ze(e.displayName),
      m(),
      O(3, i.unreadMsgs[e.name] || i.unreadMentions[e.name] ? 3 : -1));
  }
}
function G_e(t, n) {
  if ((1 & t && (d(0, 'ul', 12), ht(1, z_e, 4, 5, 'li', 14, N_e), u()), 2 & t)) {
    const e = g();
    (m(), pt(e.chatTabs));
  }
}
function W_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 14)(1, 'a', 30),
      x('click', function () {
        return (D(e), E(g().showPrivateChat()));
      }),
      T(2, 'i', 31),
      u()());
  }
}
function q_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 41),
      x('click', function () {
        return (D(e), E(g(3).archiveOptions()));
      }),
      T(1, 'i', 42),
      u());
  }
}
function K_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 38),
      x('click', function () {
        return (D(e), g(2), E(It(18).downloadLog('chat')));
      }),
      T(1, 'i', 39),
      u(),
      H(2, q_e, 2, 0, 'div', 40));
  }
  if (2 & t) {
    const e = g(2);
    (m(2),
      O(2, e.appService.globals.isPresenter && !e.appService.globals.isLimitedPresenter ? 2 : -1));
  }
}
function Y_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 46)(1, 'button', 48),
      v(2, ' Group Chat Control '),
      u(),
      d(3, 'ul', 49)(4, 'li', 50),
      x('click', function (o) {
        return (D(e), E(g(3).changeChatMode('g', o)));
      }),
      d(5, 'a', 51),
      T(6, 'i', 52),
      v(7, 'Regular Group Chat'),
      u()(),
      d(8, 'li', 50),
      x('click', function (o) {
        return (D(e), E(g(3).changeChatMode('p', o)));
      }),
      d(9, 'a', 51),
      T(10, 'i', 52),
      v(11, 'Webinar Mode'),
      u()(),
      d(12, 'li', 50),
      x('click', function (o) {
        return (D(e), E(g(3).changeChatMode('d', o)));
      }),
      d(13, 'a', 51),
      T(14, 'i', 52),
      v(15, 'Disable Group Chat'),
      u()()()());
  }
  if (2 & t) {
    const e = g(3);
    (m(6),
      z('ngClass', ct(3, kw, 'g' == e.appService.globals.sessData.chatMode)),
      m(4),
      z('ngClass', ct(5, kw, 'p' == e.appService.globals.sessData.chatMode)),
      m(4),
      z('ngClass', ct(7, kw, 'd' == e.appService.globals.sessData.chatMode)));
  }
}
function Q_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 53),
      x('click', function () {
        return (D(e), E(g(3).detachChat()));
      }),
      T(1, 'i', 54),
      v(2, ' Detach Chat'),
      u());
  }
}
function X_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 43)(1, 'input', 44),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (
          He(s.appService.globals.filterChatMsgs.modOnly, o) ||
            (s.appService.globals.filterChatMsgs.modOnly = o),
          E(o)
        );
      }),
      x('change', function () {
        return (D(e), E(g(2).toggleModOnlyFilter()));
      }),
      u(),
      d(2, 'label', 45),
      v(3, ' Mod Only '),
      u()(),
      H(4, Y_e, 16, 9, 'div', 46)(5, Q_e, 3, 0, 'button', 47));
  }
  if (2 & t) {
    const e = g(2);
    (m(),
      je('ngModel', e.appService.globals.filterChatMsgs.modOnly),
      m(3),
      O(
        4,
        (!e.appService.globals.isPresenter && !e.appService.globals.user.hasMic) ||
          e.appService.globals.isLimitedPresenter
          ? -1
          : 4
      ),
      m(),
      O(5, e.appService.globals.chatOnlyMode ? -1 : 5));
  }
}
function J_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 21)(1, 'form', 32),
      x('change', function () {
        D(e);
        const o = g();
        return E(o.searchTermChanged(o.chatSearchTerm));
      })('keydown.enter', function (o) {
        D(e);
        const s = It(6),
          r = g();
        return (o.preventDefault(), E(r.onEnterSearchChat(s.value)));
      }),
      d(2, 'div')(3, 'div', 33)(4, 'div', 34)(5, 'input', 35, 2),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.chatSearchTerm, o) || (s.chatSearchTerm = o), E(o));
      }),
      u(),
      d(7, 'span', 36),
      x('click', function () {
        D(e);
        const o = It(6),
          s = g();
        return ((o.value = ''), E(s.onEnterSearchChat('')));
      }),
      T(8, 'i', 37),
      u(),
      H(9, K_e, 3, 1),
      u()()()(),
      H(10, X_e, 6, 3),
      u());
  }
  if (2 & t) {
    const e = g();
    (m(5),
      je('ngModel', e.chatSearchTerm),
      m(4),
      O(9, e.showChatToolbarExtended ? 9 : -1),
      m(),
      O(10, e.showChatToolbarExtended ? 10 : -1));
  }
}
function Z_e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'emoji-mart', 55),
      x('emojiSelect', function (o) {
        return (D(e), E(g().selectEmoji(o)));
      }),
      u());
  }
}
function e0e(t, n) {
  1 & t &&
    (d(0, 'div', 24), v(1, ' Webinar Mode '), d(2, 'span', 56), T(3, 'i', 57), u(), T(4, 'i'), u());
}
function t0e(t, n) {
  if (
    (1 & t &&
      (d(0, 'div')(1, 'div', 58)(2, 'strong', 59),
      v(3),
      u(),
      T(4, 'app-typing-indicator-dots'),
      d(5, 'span', 60)(6, 'em', 61),
      v(7),
      u()()()()),
    2 & t)
  ) {
    const e = g();
    (m(3), Ne('[', e.usersTypingCnt, ']'), m(4), Ze(e.usersTyping));
  }
}
function n0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 67),
      x('click', function () {
        return (D(e), E(g(2).toggleMessageOptions()));
      }),
      T(1, 'i', 68),
      u());
  }
}
function i0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 67),
      x('click', function () {
        return (D(e), E(g(3).imgUpload()));
      }),
      T(1, 'i', 73),
      u());
  }
}
function o0e(t, n) {
  1 & t && (d(0, 'span', 71), T(1, 'i', 74), u());
}
function s0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 87)(1, 'img', 88),
      x('dblclick', function () {
        const o = D(e).$implicit;
        return E(g(5).sendGif(o.title, o.images.original.url));
      }),
      u()());
  }
  if (2 & t) {
    const e = n.$implicit;
    (m(), xn('src', e.images.downsized_large.url, Mt));
  }
}
function r0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 76)(1, 'div', 77)(2, 'div', 78)(3, 'h4'),
      v(4, 'Giphy Search'),
      u(),
      d(5, 'button', 79),
      x('click', function () {
        return (D(e), g(), E(It(1).close()));
      }),
      u()(),
      T(6, 'hr', 80),
      d(7, 'h6'),
      v(8, '*Double click an image to select it'),
      u(),
      d(9, 'form', 81),
      x('ngSubmit', function () {
        return (D(e), E(g(4).searchGiphy()));
      }),
      d(10, 'div', 82)(11, 'div', 34)(12, 'input', 83),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(4);
        return (He(s.giphySearchTerm, o) || (s.giphySearchTerm = o), E(o));
      }),
      u(),
      d(13, 'span', 84),
      x('click', function () {
        return (D(e), E(g(4).clearSearchGiphy()));
      }),
      T(14, 'i', 85),
      u()()()()(),
      d(15, 'ul', 86),
      ht(16, s0e, 2, 1, 'li', 87, L_e),
      u()());
  }
  if (2 & t) {
    const e = g(4);
    (m(12), je('ngModel', e.giphySearchTerm), m(4), pt(e.giphyResults));
  }
}
function a0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 75, 4),
      x('click', function () {
        D(e);
        const o = It(1);
        return E(g(3).toggleGiphyPanel(o));
      }),
      d(2, 'span'),
      v(3, 'GIF'),
      u(),
      H(4, r0e, 18, 1, 'ng-template', null, 5, In),
      u());
  }
  2 & t && z('ngbPopover', It(5));
}
function l0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 67),
      x('click', function () {
        return (D(e), E(g(3).openRTEModal()));
      }),
      T(1, 'i', 89),
      u());
  }
}
function c0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 69),
      x('click', function () {
        return (D(e), E(g(2).toggleEmojiPanel()));
      }),
      T(1, 'i', 70),
      u(),
      H(2, i0e, 2, 0, 'span', 66)(3, o0e, 2, 0, 'span', 71)(4, a0e, 6, 1, 'span', 72)(
        5,
        l0e,
        2,
        0,
        'span',
        66
      ));
  }
  if (2 & t) {
    const e = g(2);
    (z('ngbPopover', It(20)),
      m(2),
      O(2, e.canPostImages ? 2 : -1),
      m(),
      O(3, e.isPresenter ? 3 : -1),
      m(),
      O(4, e.canPostImages ? 4 : -1),
      m(),
      O(
        5,
        e.appService.globals.sessData.enableRTE &&
          e.appService.globals.preferences.enableRTE &&
          e.appService.globals.isPresenter
          ? 5
          : -1
      ));
  }
}
function d0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 25)(1, 'div', 62, 3)(3, 'div', 63)(4, 'textarea', 64),
      x('keyup', function (o) {
        return (D(e), E(g().onKey(o)));
      })('paste', function (o) {
        return (D(e), E(g().onImagePaste(o)));
      })('keydown.enter', function (o) {
        return (D(e), E(g().onKeydown(o)));
      })('focus', function (o) {
        return (D(e), E(g().onTextareaFocus(o, 'textAreaTxt')));
      }),
      u()(),
      d(5, 'div', 65),
      H(6, n0e, 2, 0, 'span', 66)(7, c0e, 6, 5),
      u()()());
  }
  if (2 & t) {
    const e = g();
    (m(6), O(6, e.showMessageOptions ? 7 : 6));
  }
}
function u0e(t, n) {
  if ((1 & t && (d(0, 'span'), v(1), Xe(2, 'date'), u()), 2 & t)) {
    const e = g(2);
    (m(), Ne(' till ', Ct(2, 1, e.chatMutedTill, 'EEE @ h:mm a'), ''));
  }
}
function h0e(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 90)(1, 'h5', 91),
      T(2, 'i', 92),
      v(3, ' Chat Disabled '),
      H(4, u0e, 3, 4, 'span'),
      u()()),
    2 & t)
  ) {
    const e = g();
    (m(4), O(4, e.chatMutedTill ? 4 : -1));
  }
}
const li = window.$;
var lc;
function xw(t) {
  (t.stopPropagation(),
    t.preventDefault(),
    (t.target.className = 'dragover' == t.type ? 'hover' : ''));
}
function p0e(t) {
  console.log('FileDropped:', t);
  var n = document.createElement('img'),
    e = new FileReader();
  ((e.onloadend = function () {
    ((n.src = e.result), li('#fileList').append(n));
  }),
    e.readAsDataURL(t));
}
function c6(t) {
  (li('#fileList').show(), li('#filedrag').hide(), xw(t));
  var n = t.target.files || t.dataTransfer.files;
  (li('#fileList').empty(), (lc = []));
  for (var i, e = 0; (i = n[e]); e++) (lc.push(i), p0e(i));
}
f0e = (() => {
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
        (this.channel = 'main'),
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
        (this.sendingGif = !1),
        (this.appEventBus = this.appService.appEventBus),
        (this.guiEventBus = this.appService.guiEventBus));
    }
    ngOnInit() {
      (this.loadChatMode(),
        this.appService.globals.subbedToChatEvents ||
          ((this.appService.globals.subbedToChatEvents = !0),
          this.guiEventBus.subscribe('resizeChatView', (e) => {
            this.showMessageOptions = this.chatWidth?.nativeElement?.offsetWidth >= 400;
          }),
          (this.isPresenter = this.appService.globals.isPresenter),
          (this.showPMBtn =
            (this.isPresenter ||
              this.appService.globals.sessData.userPM ||
              this.appService.globals.sessData.userToPresenterPM) &&
            !(
              this.appService.globals.user.isFT &&
              this.appService.globals.sessData.disablePMForTrials
            )),
          this.appEventBus.subscribe('appDataReady', (e) => {
            (this.processSessData(), this.appEventBus.emit('switchChatChannel', 'main'));
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
                (this.guiEventBus.emit('resizeChatView'),
                  this.isPresenter || this.guiEventBus.emit('hideChat', 'd' == e));
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
          P(
            '(*********************************************************************************************** subed to doMention '
          ),
          this.guiEventBus.subscribe('doMention', (e) => {
            if (
              (P(
                '(***********************************************************************************************  doMention  caight in chat comp'
              ),
              e)
            ) {
              let i = li('#textAreaTxt').val().toString();
              i.length
                ? li('#textAreaTxt').val(i + ' @' + e + ' ')
                : li('#textAreaTxt').val('@' + e + ' ');
            }
          }),
          this.guiEventBus.subscribe('doUserInfo', (e) => {
            li('#textAreaTxt').val('');
          }),
          this.guiEventBus.subscribe('switchChatDisplayMode', (e) => {
            this.setOption(e);
          }),
          this.appEventBus.subscribe('switchChatChannel', (e) => {
            ((this.channel = e),
              this.appService.sendServerCommand('getChatLog', { channel: e, page: 0 }),
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
          this.appService.guiEventBus.subscribe('appHasFocusGetChatLog', () => {
            this.chatSearchTerm
              ? this.doSearchSubmit()
              : this.appService.sendServerCommand('getChatLog', { channel: this.channel, page: 0 });
          })),
        this.processSessData());
    }
    ngAfterViewInit() {
      (P('chat comp after view init...'),
        this.guiEventBus.emit('scrollChatLogToBottom', { force: !0 }),
        this.elementRef?.nativeElement
          ?.querySelector('#textAreaTxt')
          ?.addEventListener('input', this.onAutoExpand.bind(this)));
    }
    onAutoExpand(e) {
      if ('textareatxt' !== e.target.id.toLowerCase()) return !1;
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
      const i = li('#textAreaTxt');
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
        this.guiEventBus.emit('setSearchTerm', {
          searchTerm: this.chatSearchTerm,
          channel: this.channel,
          type: 'chat'
        }),
        (this.appService.globals.chatSearchResults = []));
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
        del: e
      };
      (this.guiEventBus.emit('setSearchTerm', i),
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
    switchChatChannel(e) {
      (P(`ChatComp switch channel to ${e}`),
        (this.appService.globals.chatInputFocus = 'textAreaTxt'),
        this.chatTabs.forEach((i, o) => {
          i.name == e &&
            ((this.channel = e),
            '' == this.channel || 0 == o
              ? ((this.channel = 'main'), this.appEventBus.emit('switchChatChannel', 'main'))
              : this.appEventBus.emit('switchChatChannel', this.channel),
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
        const i = li('#textAreaTxt');
        e.shiftKey
          ? (i.val(i.val()), this.autoExpand(e.target))
          : e.altKey
            ? (i.val(i.val() + '\n'), this.autoExpand(e.target))
            : ((this.showEmojiChooser = !1), this.sendMessage(), this.autoExpand(e.target));
      } else
        this.showTyping &&
          (0 === li('#textAreaTxt').val().trim().length
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
      let i = li('#textAreaTxt').val() + e.emoji.native;
      (li('#textAreaTxt').val(i), (this.selectedEmoji = e.emoji));
    }
    sendMessage() {
      if (!this.canPost) return void bootbox.alert("Sorry, you can't post to this channel");
      let e = li('#textAreaTxt').val().toString().trim();
      if (!e) return !1;
      (this.appService.sendGrpChat(this.channel, e),
        li('#textAreaTxt').val(''),
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
      ((lc = []),
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
                if (lc) {
                  const r = li('#msg-text').val().trim();
                  e.doImagurFileListUpload(r);
                }
              }
            }
          }
        }));
      let o = document.getElementById('filedrag');
      (o.addEventListener('dragover', xw, !1),
        o.addEventListener('dragleave', xw, !1),
        o.addEventListener('drop', c6, !1),
        (o.style.display = 'block'),
        document.getElementById('fupload').addEventListener('change', c6, !1));
    }
    doImagurFileListUpload() {
      var e = this;
      return I(function* (i = '') {
        let o = lc.length;
        for (const [s, r] of lc.entries())
          (bootbox.hideAll(),
            bootbox.alert(
              `Uploading ${s}/${o}: ${r.name}. Please wait...<br><div style="text-align: center;"><i class="ml-2 fas fa-spinner fa-spin fa-3x"></i></div>`
            ),
            yield e.doImggurUpload(r, i, o - 1 !== s));
        (bootbox.hideAll(), lc.splice(0, o - 1));
      }).apply(this, arguments);
    }
    doImggurUpload(e, i = null, o = !1) {
      var s = this;
      return new Promise(function (r, a) {
        const l = `${s.appService.globals.upload_server}/image/${s.appService.globals.sessionID}`,
          c = s.appService.globals.cdn_upload_key;
        console.log('doImggurUpload apiKey: ', c);
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
                (i && ((s.imggurUploadTxt += ' ' + i), li('#textAreaTxt').val('')),
                s.appService.sendGrpChat(s.channel, s.imggurUploadTxt),
                (s.imggurUploadTxt = '')),
              r(_));
          },
          error: function (_) {
            (bootbox.hideAll(), bootbox.alert('Upload Failed...'), a(_));
          }
        };
        li.ajax(f).done(function (_) {
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
              const o = new Date(li('#date-archive-chat').val());
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
          a = li('#textAreaTxt').val().trim();
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
                const c = yield li('#msg-text').val().trim();
                (console.log('msgTxt: ', c),
                  yield i.doImggurUpload(s, c),
                  console.log('ok, uploading...'));
              } else console.log('cancel uploading...');
            })()
        });
      }
    }
    toggleModOnlyFilter() {
      this.appService.sendServerCommand('getChatLog', { channel: this.channel, page: 0 });
    }
    onTextareaFocus(e, i) {
      this.appService.globals.chatInputFocus = i;
    }
    decodeHtmlEntities(e) {
      const i = document.createElement('textarea');
      return ((i.innerHTML = e), i.value);
    }
    detachChat() {
      (this.appService.appEventBus.emit('detachChat'),
        bootbox.alert(
          'Chat/Alerts detached to a new browser window...You can reopen the chat in this window from the side menu.'
        ));
    }
    openRTEModal() {
      (this.appService.guiEventBus.emit('doRTEModal', {
        channel: this.channel,
        txt: li('#textAreaTxt')?.val()?.toString()?.trim() || ''
      }),
        li('#textAreaTxt')?.val(''));
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
        selectors: [['app-chat']],
        viewQuery: function (i, o) {
          if ((1 & i && (Xt(I_e, 5), Xt(O_e, 5)), 2 & i)) {
            let s;
            (yt((s = Ft())) && (o.chatWidth = s.first),
              yt((s = Ft())) && (o.searchTermTxt = s.first));
          }
        },
        outputs: { openPrivateChat: 'openPrivateChat' },
        decls: 25,
        vars: 14,
        consts: [
          ['roomscroller', ''],
          ['emojiPanelDiv', ''],
          ['searchTermTxt', ''],
          ['chatWidth', ''],
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
          ['title', 'Detach Chat', 1, 'btn', 'btn-outline-info', 'btn-sm', 'mx-1', 'mt-1'],
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
          [
            'title',
            'Detach Chat',
            1,
            'btn',
            'btn-outline-info',
            'btn-sm',
            'mx-1',
            'mt-1',
            3,
            'click'
          ],
          [1, 'fas', 'fa-window-restore'],
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
            'textAreaTxt',
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
              H(5, j_e, 2, 0, 'span')(6, V_e, 3, 0, 'span', 11),
              u(),
              H(7, G_e, 3, 0, 'ul', 12),
              d(8, 'ul', 13),
              H(9, W_e, 3, 0, 'li', 14),
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
              H(16, J_e, 11, 3, 'div', 21),
              u(),
              T(17, 'app-roomscroller', 22, 0),
              H(19, Z_e, 1, 0, 'ng-template', 23, 1, In)(21, e0e, 5, 0, 'div', 24)(
                22,
                t0e,
                8,
                2,
                'div'
              )(
                23,
                d0e,
                8,
                1,
                'div',
                25
              )(24, h0e, 5, 1),
              u());
          }
          2 & i &&
            (m(5),
            O(5, 0 == o.chatTabs.length ? 5 : -1),
            m(),
            O(6, o.appService.globals.preferences.doNotDisturbOn ? 6 : -1),
            m(),
            O(7, o.chatTabs.length ? 7 : -1),
            m(2),
            O(9, o.showPMBtn ? 9 : -1),
            m(7),
            O(16, o.showChatToolbar ? 16 : -1),
            m(),
            z('logType', 'chat')('displayMode', o.displayMode)('isPresenter', o.isPresenter)(
              'ngClass',
              ct(
                12,
                B_e,
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
        dependencies: [Di, qs, ai, Ss, ti, Ws, Yn, as, tc, ha, el, a6, l6, os],
        styles: [
          '.navbar[_ngcontent-%COMP%]{font-size:12px;padding:2px}.chatToolbar[_ngcontent-%COMP%], .chatHeader[_ngcontent-%COMP%]{background-color:var(--msgs-header-bg);color:var(--msgs-header-color)}.chatHeader[_ngcontent-%COMP%]   .dropdown-menu[_ngcontent-%COMP%]{background-color:var(--msgs-header-bg);border:none;border-radius:0 0 0 5px}.roomLog[_ngcontent-%COMP%]{height:100%;overflow-y:scroll}.chatDisabled[_ngcontent-%COMP%]{height:40px;min-height:40px;width:100%;background-color:#fff;color:#000}.webinarMode[_ngcontent-%COMP%]{background-color:#fff;color:#000;width:100%}.chat-header-nav[_ngcontent-%COMP%]{font-size:12px;min-height:30px}.chatHeader[_ngcontent-%COMP%]   .fas[_ngcontent-%COMP%], .chat-header-nav[_ngcontent-%COMP%]   .navbar-brand[_ngcontent-%COMP%]{font-size:16px}.menu-p-label[_ngcontent-%COMP%]{padding:5px;font-weight:100;font-size:12px}.chat-header-menu-settings[_ngcontent-%COMP%]{padding:0;margin:0;border:none;border-radius:0%;background-color:transparent}.chat-header[_ngcontent-%COMP%]{background-color:var(--chat-header-bg)!important;color:var(--chat-header-color)!important}.chat[_ngcontent-%COMP%]{background-color:var(--chat-bg)}.chat[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]   a[_ngcontent-%COMP%], .chat[_ngcontent-%COMP%]   .clear-chat-input[_ngcontent-%COMP%]{cursor:pointer}.list-of-msgs[_ngcontent-%COMP%]{height:calc(100% - 41px);overflow-y:scroll;background-color:var(--msgs-bg)}.textAreaBtns[_ngcontent-%COMP%]{padding:5px;color:var(--dark-gray)}.custom-file[_ngcontent-%COMP%]{display:none}.input-group-text[_ngcontent-%COMP%]{padding:0;margin:0}.textAreaBtnsCol[_ngcontent-%COMP%]{background-color:var(--textarea-bg)!important;color:var(--dark-gray)!important}.textAreaBtns[_ngcontent-%COMP%]{color:var(--textarea-holder-btns-color)!important}.textAreaBtns[_ngcontent-%COMP%]:hover{color:var(--textarea-holder-btns-hover-color)!important;cursor:pointer}.txt-area[_ngcontent-%COMP%]{border-radius:0;border:1px solid #ffffff;font-size:14px;resize:none;color:var(--textarea-color)!important;background-color:var(--textarea-bg)!important;outline:none;overflow-y:auto;margin-left:0;margin-right:0;padding-left:5px;padding-right:5px}.txt-area[_ngcontent-%COMP%]:focus{border-color:var(--darker-gray);box-shadow:1px 1px 1px var(--darker-gray)}#form-upload-img[_ngcontent-%COMP%]   .input-group-text[_ngcontent-%COMP%], #form-upload-img[_ngcontent-%COMP%]   .form-control[_ngcontent-%COMP%]{border-radius:0}.unreadIndicator[_ngcontent-%COMP%]{text-align:center;position:relative;top:30px;z-index:10;background-color:#9acd32}.white[_ngcontent-%COMP%]{color:#fff}.chat-nav[_ngcontent-%COMP%]{align-items:center;flex-wrap:nowrap;min-height:40px}.chatTabs[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{font-weight:700;font-size:12px;padding-left:5px;padding-right:5px;margin-right:5px;margin-bottom:0;padding-bottom:5px}ul.chatTabs[_ngcontent-%COMP%]{margin-bottom:0}.chatTabs[_ngcontent-%COMP%]{border-color:var(--modal-active-tab-border-color)!important}.chatTabs[_ngcontent-%COMP%]   .nav-link.active[_ngcontent-%COMP%]{border:1px solid var(--modal-active-tab-border-color)!important;border-bottom:none}.chatTabs[_ngcontent-%COMP%]   .nav-link[_ngcontent-%COMP%]:hover{border-color:var(--modal-active-tab-border-color)!important;cursor:pointer}.chatTabs[_ngcontent-%COMP%]   .nav-link.active[_ngcontent-%COMP%], .chatTabs[_ngcontent-%COMP%]   .nav-item.show[_ngcontent-%COMP%]   .nav-link[_ngcontent-%COMP%]{background-color:var(--modal-active-tab-bg-color)!important;color:var(--modal-active-tab-color)!important;cursor:default}.chatTabs[_ngcontent-%COMP%]   .nav-link.active[_ngcontent-%COMP%]:hover{cursor:default}.counterBadge[_ngcontent-%COMP%]{top:-5px;position:relative}.textAreaBtnSelected[_ngcontent-%COMP%]{background-color:#f1f2f3}.bs-popover-top[_ngcontent-%COMP%] > .arrow[_ngcontent-%COMP%]:after, .bs-popover-auto[x-placement^=top][_ngcontent-%COMP%] > .arrow[_ngcontent-%COMP%]:after{border-top-color:var(--modal-content-bg-color)}.giphy-search[_ngcontent-%COMP%]{width:400px;height:700px;border:2px solid var(--modal-content-bg-color);background-color:#fff;overflow:hidden}.giphy-search[_ngcontent-%COMP%]   .input-group-text[_ngcontent-%COMP%]{border:none;background-color:var(--modal-input-group-bg)}.giphy-search[_ngcontent-%COMP%]   .fa-times[_ngcontent-%COMP%]{font-size:16.5px;padding:10px}.giphy-search[_ngcontent-%COMP%]   .fa-times[_ngcontent-%COMP%]:hover{cursor:pointer;opacity:.85}.giphy-header[_ngcontent-%COMP%]{padding:10px;background-color:var(--modal-content-bg-color)}.search-results[_ngcontent-%COMP%]{overflow-y:auto;height:100%;padding:5px}.gif-result[_ngcontent-%COMP%]{text-align:center}.gif-result[_ngcontent-%COMP%]   img[_ngcontent-%COMP%]{cursor:pointer}.giphy-search[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]{padding:10px}.giphy-search[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]:hover{background-color:var(--modal-upload-files-color)}.giphy-search[_ngcontent-%COMP%]   h4[_ngcontent-%COMP%], .giphy-search[_ngcontent-%COMP%]   h6[_ngcontent-%COMP%]{color:var(--modal-content-color)}.giphy-hr[_ngcontent-%COMP%]{color:#fff;padding:0;margin:0 0 10px}#textAreaHolder[_ngcontent-%COMP%]{background-color:var(--textarea-bg);border-radius:8px;padding:5px;margin:5px}.typing-indicator-container[_ngcontent-%COMP%]{margin:0 8px;border-top:1px solid #ccc}.users-count[_ngcontent-%COMP%], .users-typing[_ngcontent-%COMP%]{color:#90949c;font-size:12px}.users-typing[_ngcontent-%COMP%]{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.users-typing[_ngcontent-%COMP%]   em[_ngcontent-%COMP%]{font-weight:700}#textAreaTxt[_ngcontent-%COMP%]{max-height:300px;width:100%}#textAreaTxt[_ngcontent-%COMP%], .textAreaBtnsCol[_ngcontent-%COMP%]{background-color:var(--textarea-bg)}img[_ngcontent-%COMP%]{max-width:100%}'
        ]
      });
    }
  }
  return t;
})();
