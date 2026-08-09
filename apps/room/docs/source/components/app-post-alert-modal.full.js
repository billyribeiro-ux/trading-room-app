const Fa = () => ({ standalone: !0 });
function NTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 35)(1, 'input', 46),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.sendText, o) || (s.sendText = o), E(o));
      }),
      u(),
      d(2, 'label', 47),
      v(3, 'Text this out?'),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(), je('ngModel', e.sendText), z('ngModelOptions', wo(2, Fa)));
  }
}
function LTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 35)(1, 'input', 48),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.dontPush, o) || (s.dontPush = o), E(o));
      }),
      u(),
      d(2, 'label', 49),
      v(3, "Don't send to push notification?"),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(), je('ngModel', e.dontPush), z('ngModelOptions', wo(2, Fa)));
  }
}
function BTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 35)(1, 'input', 50),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.nonTradeAlert, o) || (s.nonTradeAlert = o), E(o));
      }),
      u(),
      d(2, 'label', 51),
      v(3, 'Non-trade alert? (Different Sound)'),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(), je('ngModel', e.nonTradeAlert), z('ngModelOptions', wo(2, Fa)));
  }
}
function UTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 35)(1, 'input', 52),
      Ve('ngModelChange', function (o) {
        const s = D(e).$implicit;
        return (He(s.checked, o) || (s.checked = o), E(o));
      }),
      u(),
      d(2, 'label', 53),
      v(3),
      u()());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = n.$index;
    (m(),
      je('ngModel', e.checked),
      z('ngModelOptions', wo(5, Fa))('id', 'alert-trade-label-' + i),
      m(),
      z('for', 'alert-trade-label-' + i),
      m(),
      Ne('', e.name, '?'));
  }
}
function jTe(t, n) {
  (1 & t && ht(0, UTe, 4, 6, 'div', 35, Yx), 2 & t && pt(g().appService.globals.alertLabels));
}
function VTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 35)(1, 'input', 54),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.dontCrossPost, o) || (s.dontCrossPost = o), E(o));
      }),
      u(),
      d(2, 'label', 55),
      v(3, "Don't cross post to linked alert rooms"),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(), je('ngModel', e.dontCrossPost), z('ngModelOptions', wo(2, Fa)));
  }
}
function HTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 35)(1, 'input', 56),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.legalDisclosure, o) || (s.legalDisclosure = o), E(o));
      }),
      u(),
      d(2, 'label', 57),
      v(3, 'Add Legal Disclosure?'),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(), je('ngModel', e.legalDisclosure), z('ngModelOptions', wo(2, Fa)));
  }
}
function $Te(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 40)(1, 'input', 58),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.legalDisclosureTxt, o) || (s.legalDisclosureTxt = o), E(o));
      }),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(), je('ngModel', e.legalDisclosureTxt));
  }
}
function zTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 69)(1, 'input', 72),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g(2);
        return (He(s.ignoreWeekends, o) || (s.ignoreWeekends = o), E(o));
      }),
      u(),
      d(2, 'label', 73),
      v(3, 'Ignore weekends?'),
      u()());
  }
  if (2 & t) {
    const e = g(2);
    (m(), je('ngModel', e.ignoreWeekends), z('ngModelOptions', wo(2, Fa)));
  }
}
function GTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div'),
      T(1, 'hr'),
      d(2, 'form')(3, 'div', 21)(4, 'label', 59),
      v(5, 'NOTE: All times should be on '),
      d(6, 'span', 60),
      v(7, 'your local time zone'),
      u()(),
      d(8, 'label', 61),
      v(9, 'Send on this date & time:'),
      u(),
      d(10, 'input', 62),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.sendLaterDate, o) || (s.sendLaterDate = o), E(o));
      }),
      u()(),
      d(11, 'div', 63)(12, 'label', 64),
      v(13, 'Repeat:'),
      u(),
      d(14, 'select', 65),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.repeatScheduledAlert, o) || (s.repeatScheduledAlert = o), E(o));
      }),
      d(15, 'option', 66),
      v(16, 'Off'),
      u(),
      d(17, 'option', 67),
      v(18, 'Daily'),
      u(),
      d(19, 'option', 68),
      v(20, 'Weekly'),
      u()()(),
      H(21, zTe, 4, 3, 'div', 69),
      d(22, 'div', 21)(23, 'label', 61),
      v(24, 'Send as email:'),
      u(),
      d(25, 'input', 70),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.sendLaterAsEmail, o) || (s.sendLaterAsEmail = o), E(o));
      }),
      u()(),
      d(26, 'div', 21)(27, 'label', 61),
      v(28, 'Send as Name:'),
      u(),
      d(29, 'input', 71),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.sendLaterAsNick, o) || (s.sendLaterAsNick = o), E(o));
      }),
      u()()()());
  }
  if (2 & t) {
    const e = g();
    (m(10),
      je('ngModel', e.sendLaterDate),
      m(4),
      je('ngModel', e.repeatScheduledAlert),
      m(7),
      O(21, 'daily' === e.repeatScheduledAlert ? 21 : -1),
      m(4),
      je('ngModel', e.sendLaterAsEmail),
      m(4),
      je('ngModel', e.sendLaterAsNick));
  }
}
function WTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 74),
      x('click', function () {
        return (D(e), E(g().manageScheduledAlerts()));
      }),
      T(1, 'i', 75),
      v(2, ' See Scheduled Alerts '),
      u());
  }
}
function qTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 76),
      x('click', function () {
        return (D(e), E((g().showSendLater = !0)));
      }),
      T(1, 'i', 75),
      v(2, ' Send Later? '),
      u());
  }
}
function KTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 77),
      x('click', function () {
        return (D(e), E((g().showSendLater = !1)));
      }),
      v(1, ' Cancel '),
      u());
  }
}
function YTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 78),
      x('click', function () {
        return (D(e), E(g().postAlert()));
      }),
      v(1, ' Post Alert '),
      u());
  }
}
function QTe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 78),
      x('click', function () {
        return (D(e), E(g().postAlertLater()));
      }),
      v(1, ' Send Later '),
      u());
  }
}
const di = window.$;
var fc;
function x2(t) {
  (t.stopPropagation(),
    t.preventDefault(),
    (t.target.className = 'dragover' == t.type ? 'hover' : ''));
}
function XTe(t) {
  console.log('FileDropped:', t);
  var n = document.createElement('img'),
    e = new FileReader();
  ((e.onloadend = function () {
    ((n.src = e.result), di('#fileListAlert').append(n));
  }),
    e.readAsDataURL(t));
}
function MB(t) {
  (di('#fileListAlert').show(), di('#filedragAlert').hide(), x2(t));
  var n = t.target.files || t.dataTransfer.files;
  (di('#fileListAlert').empty(), (fc = []));
  for (var i, e = 0; (i = n[e]); e++) (fc.push(i), XTe(i));
}
JTe = (() => {
  class t {
    constructor(e) {
      ((this.appService = e),
        (this.selectedTab = 'text'),
        (this.postOnX = !1),
        (this.tweetWindow = null),
        (this.keepOpen = !1),
        (this.sendText = !1),
        (this.sendEmail = !1),
        (this.sendTweet = !1),
        (this.showSendLater = !1),
        (this.dontPush = !1),
        (this.nonTradeAlert = !1),
        (this.legalDisclosure = !1),
        (this.dontCrossPost = !1),
        (this.hasTxt = !1),
        (this.hasEmail = !1),
        (this.hasTwitter = !1),
        (this.hasAlertScheduler = !1),
        (this.hasPush = !0),
        (this.hasNonTrade = !0),
        (this.hasLegalDisclosure = !0),
        (this.legalDisclosureTxt = 'FOR EDUCATIONAL PURPOSES ONLY, NOT FINANCIAL ADVICE'),
        (this.inlineAlertEntry = !1),
        (this.repeatScheduledAlert = ''),
        (this.ignoreWeekends = !1));
    }
    ngOnInit() {
      this.appService.guiEventBus.subscribe('doAlertsModal', (i) => {
        ((this.hasTxt = this.appService.globals.sessData.hasAlertTxt),
          (this.hasEmail = this.appService.globals.sessData.hasAlertEmails),
          (this.hasTwitter = this.appService.globals.sessData.hasAlertTwitter),
          (this.hasAlertScheduler = this.appService.globals.sessData.hasAlertScheduler),
          (this.sendLaterAsEmail = this.appService.globals.user.email),
          (this.sendLaterAsNick = this.appService.globals.user.name),
          (this.nonTradeAlert = this.appService.globals.sessData.styckyNonTradeAlert || !1),
          (this.dontCrossPost = !1));
        var o = new Date().toISOString();
        (console.log('doAlertsModal isoDate:' + o),
          (o = o.substring(0, o.lastIndexOf('.'))),
          (this.sendLaterDate = o),
          console.log('doAlertsModal this.sendLaterDate:' + this.sendLaterDate),
          di('#alert-modal').modal('show'),
          this.clearInputFields(),
          di('#fuploadAlert').off(),
          document.getElementById('fuploadAlert').addEventListener('change', MB, !1),
          (this.alertTxt = ''),
          (this.alertUrl = ''),
          (this.imageAlertTxt = ''),
          (this.linkAlertTxt = ''),
          (this.postOnX = !1));
      });
      let e = document.getElementById('filedragAlert');
      (e.addEventListener('dragover', x2, !1),
        e.addEventListener('dragleave', x2, !1),
        e.addEventListener('drop', MB, !1),
        (e.style.display = 'block'),
        this.appService.appEventBus.subscribe('inlineAlertEntry', (i) => {
          ((this.selectedTab = 'text'), (this.alertTxt = i), this.postAlert());
        }),
        this.appService.appEventBus.subscribe('inlineAlertEntryImage', (i) => {
          ((this.selectedTab = 'text'),
            (this.alertTxt = i.alertTxt && i.alertTxt.length > 0 ? i.alertTxt : ''),
            this.onImagePaste(i.event));
        }));
    }
    onImagePaste(e) {
      const i = this,
        o = (e.clipboardData || e.originalEvent.clipboardData).items;
      let s = null;
      for (const r of o) 0 === r.type.indexOf('image') && (s = r.getAsFile());
      if (s) {
        const r = URL.createObjectURL(s);
        bootbox.confirm({
          message:
            '<div class="text-center"><h4>Upload this image?</h4><img style="max-width:100%; max-height: 50vh;" src="' +
            r +
            '" /></div>',
          callback(a) {
            a
              ? (i.doImggurUpload(s, null), console.log('ok, uploading...'))
              : console.log('cancel uploading...');
          }
        });
      }
    }
    doImagurFileListUpload(e) {
      var i = this;
      return I(function* () {
        let o = fc.length;
        for (const [s, r] of fc.entries())
          (i.keepOpen || di('#alert-modal').modal('hide'),
            yield i.doImggurUpload(r, e, o - 1 !== s));
        (i.hideUploadingDialog(),
          i.keepOpen && (i.clearInputFields(), di('#alert-modal').modal('show')),
          fc.splice(0, o));
      })();
    }
    doImggurUpload(e, i, o = !1) {
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
            (P('Uploading... ' + e.name), i || s.keepOpen || di('#alert-modal').modal('hide'));
          },
          success: function (_) {
            P('imge link:' + _.data.link);
            const F = _.data.link;
            if (i)
              ((i.txt += ' ' + F),
                o ||
                  (s.legalDisclosure && (i.txt += ' \n ' + s.legalDisclosureTxt),
                  s.appService.globals.alertLabels.length > 0 && (i = s.processAlertLabels(i)),
                  s.postOnX && s.postOnXAlert(i.txt),
                  s.appService.sendServerCommand('alertMsg', i)));
            else {
              let w = {
                txt: '' !== s.alertTxt && s.alertTxt.length > 0 ? s.alertTxt + '\n' + F : F,
                n: s.appService.globals.user.name,
                sendTxt: s.sendText,
                sendEmail: s.sendEmail,
                sendTweet: s.sendTweet,
                dontPush: s.dontPush,
                nonTradeAlert: s.nonTradeAlert,
                dontCrossPost: s.dontCrossPost
              };
              (s.legalDisclosure && (w.txt += ' \n ' + s.legalDisclosureTxt),
                s.appService.globals.alertLabels.length > 0 && (w = s.processAlertLabels(w)),
                s.postOnX && s.postOnXAlert(w.txt),
                s.appService.sendServerCommand('alertMsg', w));
            }
            r();
          },
          error: function (_) {
            (s.hideUploadingDialog(),
              bootbox.alert('Upload Failed...'),
              s.keepOpen && di('#alert-modal').modal('show'),
              a(_));
          }
        };
        di.ajax(f).done(function (_) {
          (i ||
            (s.hideUploadingDialog(),
            s.keepOpen
              ? (s.clearInputFields(), di('#alert-modal').modal('show'))
              : di('#alert-modal').modal('hide')),
            r(),
            console.log('done resp:', _));
        });
      });
    }
    doCloseModal() {
      (di('#alert-modal').modal('hide'),
        this.appService.globals.alertLabels.length > 0 &&
          this.appService.globals.alertLabels.forEach((e) => {
            e.checked = !1;
          }));
    }
    doSelectedTab(e) {
      ((this.selectedTab = e), P('selected tab now: ' + e));
    }
    hideUploadingDialog() {
      (di('.uploading-dialog-alert').each(function () {
        di(this).modal('hide');
      }),
        di('.uploading-dialog-alert').remove(),
        di('.modal-backdrop').remove(),
        di('body').removeClass('modal-open'),
        di('body').css('padding-right', ''));
    }
    showUploadingDialog(e) {
      (this.hideUploadingDialog(),
        bootbox.dialog({ message: e, closeButton: !0 }).addClass('uploading-dialog-alert'));
    }
    clearInputFields(e = !1) {
      (di('#fileListAlert').empty(),
        di('#fileListAlert').hide(),
        di('#filedragAlert').show(),
        (fc = []));
      const i = document.getElementById('fuploadAlert');
      (i && (i.value = ''),
        (this.alertTxt = ''),
        (this.alertUrl = ''),
        (this.imageAlertTxt = ''),
        (this.linkAlertTxt = ''),
        e && this.hideUploadingDialog(),
        this.appService.globals.alertLabels.length > 0 &&
          this.appService.globals.alertLabels.forEach((o) => {
            o.checked = !1;
          }));
    }
    postAlert() {
      let e = {
        txt: this.alertTxt,
        n: this.appService.globals.user.name,
        sendTxt: this.sendText,
        sendEmail: this.sendEmail,
        sendTweet: this.sendTweet,
        dontPush: this.dontPush,
        nonTradeAlert: this.nonTradeAlert,
        dontCrossPost: this.dontCrossPost
      };
      if ('link' === this.selectedTab) {
        if (!this.alertUrl) return void P('alert empty alertUrl. abort post');
        if (
          !this.alertUrl.toLowerCase().includes('http://') &&
          !this.alertUrl.toLowerCase().includes('https://')
        )
          return (
            P('no url'),
            void bootbox.alert('The link seems to be missing "https://" or "http://"')
          );
        (this.linkAlertTxt && (e.txt = this.linkAlertTxt + '\n'), (e.txt += this.alertUrl + ' '));
      }
      if ('img' === this.selectedTab) {
        if ((this.imageAlertTxt && (e.txt = this.imageAlertTxt + '\n'), !this.alertUrl))
          return fc ? void this.doImagurFileListUpload(e) : void 0;
        e.txt += this.alertUrl + ' ';
      }
      'text' !== this.selectedTab || e.txt
        ? (this.legalDisclosure && (e.txt += ' \n ' + this.legalDisclosureTxt),
          this.appService.globals.alertLabels.length > 0 && (e = this.processAlertLabels(e)),
          this.postOnX && this.postOnXAlert(e.txt),
          this.appService.sendServerCommand('alertMsg', e),
          this.keepOpen ? this.clearInputFields(!0) : this.doCloseModal())
        : P('alert empty img. abort post');
    }
    postOnXAlert(e) {
      if (!e) return;
      const o = `https://twitter.com/intent/tweet?text=${encodeURIComponent(e)}`;
      this.tweetWindow && !this.tweetWindow.closed
        ? (this.tweetWindow.focus(), (this.tweetWindow.location.href = o))
        : (this.tweetWindow = window.open(
            o,
            'TweetWindow',
            'width=800,height=800,scrollbars=yes,resizable=yes'
          ));
    }
    postAlertLater() {
      let e = this;
      var i = new Date(),
        o = new Date(this.sendLaterDate);
      o <= i
        ? bootbox.alert('Please select a date in the future')
        : this.alertTxt || this.alertUrl
          ? bootbox.confirm(
              'Send this alert on: ' +
                o.toString() +
                '. send as: ' +
                this.sendLaterAsNick +
                ' (' +
                this.sendLaterAsEmail +
                ') ?',
              function (s) {
                if (s) {
                  let r = {
                    txt: e.alertTxt,
                    n: e.appService.globals.user.name,
                    sendTxt: e.sendText,
                    sendEmail: e.sendEmail,
                    sendTweet: e.sendTweet,
                    sendLaterDate: e.sendLaterDate,
                    repeatScheduledAlert: e.repeatScheduledAlert,
                    ignoreWeekends: 'daily' === e.repeatScheduledAlert && e.ignoreWeekends,
                    sendLaterAsNick: e.sendLaterAsNick,
                    sendLaterAsEmail: e.sendLaterAsEmail,
                    nonTradeAlert: e.nonTradeAlert,
                    dontCrossPost: e.dontCrossPost
                  };
                  (e.appService.globals.alertLabels.length > 0 && (r = e.processAlertLabels(r)),
                    e.appService.sendServerCommand('alertMsgLater', r),
                    bootbox.alert('Alert scheduled OK.'),
                    e.keepOpen ? e.clearInputFields(!0) : e.doCloseModal());
                }
              }
            )
          : bootbox.alert('Please enter some alert text...');
    }
    manageScheduledAlerts() {
      this.appService.globals.sessData.hasAlertScheduler &&
        this.appService.sendServerCommand('getScheduledAlerts', null);
    }
    processAlertLabels(e) {
      let i = '';
      const o = this.appService.globals.alertLabels.filter((s) => s.checked);
      if (o.length > 0)
        for (let s = 0; s < o.length; s++)
          i += ' #' + o[s].hash + (s === o.length - 1 ? '\n' : ' ');
      return (
        i &&
          i.length > 0 &&
          ((e.txt = i + e.txt),
          this.appService.globals.alertLabels.forEach((s) => {
            s.checked = !1;
          })),
        e
      );
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-post-alert-modal']],
        decls: 73,
        vars: 24,
        consts: [
          [
            'id',
            'alert-modal',
            'tabIndex',
            '-1',
            'role',
            'dialog',
            'aria-labelledby',
            'post-alert',
            'aria-hidden',
            'true',
            1,
            'modal',
            'fade'
          ],
          ['role', 'document', 1, 'modal-dialog'],
          [1, 'modal-content'],
          [1, 'modal-header'],
          ['id', 'post-alert', 1, 'modal-title'],
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
          ['id', 'nav-tab', 'role', 'tablist', 1, 'nav', 'nav-tabs'],
          [
            'id',
            'nav-tab-text',
            'data-bs-toggle',
            'tab',
            'href',
            '#nav-text',
            'role',
            'tab',
            'aria-controls',
            'nav-text',
            'aria-selected',
            'true',
            1,
            'nav-item',
            'nav-link',
            'active',
            3,
            'click'
          ],
          [
            'id',
            'nav-tab-url',
            'data-bs-toggle',
            'tab',
            'href',
            '#nav-url',
            'role',
            'tab',
            'aria-controls',
            'nav-url',
            'aria-selected',
            'true',
            1,
            'nav-item',
            'nav-link',
            3,
            'click'
          ],
          [
            'id',
            'nav-tab-img',
            'data-bs-toggle',
            'tab',
            'href',
            '#nav-img',
            'role',
            'tab',
            'aria-controls',
            'nav-img',
            'aria-selected',
            'false',
            1,
            'nav-item',
            'nav-link',
            3,
            'click'
          ],
          ['id', 'nav-tabContent', 1, 'tab-content'],
          [
            'id',
            'nav-text',
            'role',
            'tabpanel',
            'aria-labelledby',
            'nav-tab-text',
            1,
            'tab-pane',
            'fade',
            'show',
            'active'
          ],
          [1, 'form-group', 'mb-3', 'mt-3'],
          [
            'rows',
            '10',
            'placeholder',
            'Alert Text...',
            'aria-label',
            'Alert Text...',
            1,
            'form-control',
            3,
            'ngModelChange',
            'paste',
            'ngModel'
          ],
          [
            'id',
            'nav-url',
            'role',
            'tabpanel',
            'aria-labelledby',
            'nav-tab-url',
            1,
            'tab-pane',
            'fade'
          ],
          [1, 'input-group', 'mb-3', 'mt-3'],
          [1, 'input-group-prepend'],
          ['id', 'addon-url', 1, 'input-group-text', 'pl-2', 'pr-2'],
          [1, 'fas', 'fa-link'],
          [
            'type',
            'url',
            'placeholder',
            'Link / URL to send to users',
            'aria-label',
            'Link / URL to send to users',
            'aria-describedby',
            'addon-url',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [1, 'form-group'],
          [
            'rows',
            '2',
            'placeholder',
            'Alert Text...',
            'aria-label',
            'Alert Text...',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [
            'id',
            'nav-img',
            'role',
            'tabpanel',
            'aria-labelledby',
            'nav-tab-img',
            1,
            'tab-pane',
            'fade'
          ],
          ['id', 'addon-img', 1, 'input-group-text', 'pl-2', 'pr-2', 'text-light'],
          [
            'type',
            'url',
            'placeholder',
            'Image or Video Link to show',
            'aria-label',
            'Image or Video Link to show',
            'aria-describedby',
            'addon-img',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['for', 'fuploadAlert', 1, 'upload-area', 2, 'width', '100%', 'text-align', 'center'],
          [
            'id',
            'fuploadAlert',
            'name',
            'fuploadAlert',
            'type',
            'file',
            'multiple',
            'true',
            'accept',
            'image/*',
            2,
            'display',
            'none'
          ],
          [1, 'fas', 'fa-file-upload', 'fa-2x'],
          ['id', 'filedragAlert', 1, 'filedragMD'],
          ['id', 'fileListAlert', 1, 'fileList', 'text-center', 2, 'margin-left', '5px !important'],
          [1, 'clearfix'],
          [1, 'modal-footer'],
          [1, 'row', 'w-100'],
          [1, 'col-12'],
          [1, 'form-check'],
          [
            'type',
            'checkbox',
            'id',
            'keepOpenChk',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel',
            'ngModelOptions'
          ],
          ['for', 'keepOpenChk'],
          [
            'type',
            'checkbox',
            'id',
            'postOnXChk',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel',
            'ngModelOptions'
          ],
          ['for', 'postOnXChk'],
          [1, 'mb-1'],
          [1, 'text-right'],
          [
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#scheduledAlertsModal',
            1,
            'btn',
            'btn-outline-success',
            'mx-1'
          ],
          [1, 'btn', 'btn-link'],
          [1, 'btn', 'btn-primary', 'me-1'],
          [1, 'btn', 'btn-success'],
          [
            'type',
            'checkbox',
            'id',
            'alert-text-label',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel',
            'ngModelOptions'
          ],
          ['for', 'alert-text-label'],
          [
            'type',
            'checkbox',
            'id',
            'alert-push-label',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel',
            'ngModelOptions'
          ],
          ['for', 'alert-push-label'],
          [
            'type',
            'checkbox',
            'id',
            'alert-non-trade-label',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel',
            'ngModelOptions'
          ],
          ['for', 'alert-non-trade-label'],
          [
            'type',
            'checkbox',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel',
            'ngModelOptions',
            'id'
          ],
          [3, 'for'],
          [
            'type',
            'checkbox',
            'id',
            'alert-dont-cross-post-label',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel',
            'ngModelOptions'
          ],
          ['for', 'alert-dont-cross-post-label'],
          [
            'type',
            'checkbox',
            'id',
            'alert-legal-disclosure-label',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel',
            'ngModelOptions'
          ],
          ['for', 'alert-legal-disclosure-label'],
          ['type', 'text', 1, 'form-control', 3, 'ngModelChange', 'ngModel'],
          [1, 'mb-3', 'mt-1'],
          [2, 'text-decoration', 'underline'],
          [1, 'me-1'],
          [
            'type',
            'datetime-local',
            'id',
            'alert-send-later-time',
            'name',
            'alert-send-later-time',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [1, 'form-group', 'd-flex', 'align-items-center', 'justify-content-between'],
          [1, 'm-0', 'me-1'],
          [
            'aria-label',
            'Repeat Scheduled Alert',
            1,
            'form-select',
            'form-select-sm',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['selected', '', 'value', ''],
          ['value', 'daily'],
          ['value', 'weekly'],
          [1, 'form-check', 'mb-2'],
          [
            'type',
            'email',
            'name',
            'sendLaterAsEmail',
            'id',
            'sendLaterAsEmail',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [
            'type',
            'text',
            'id',
            'sendLaterAsNick',
            'name',
            'sendLaterAsNick',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [
            'type',
            'checkbox',
            'id',
            'ignoreWeekendsChk',
            1,
            'form-check-input',
            3,
            'ngModelChange',
            'ngModel',
            'ngModelOptions'
          ],
          ['for', 'ignoreWeekendsChk'],
          [
            'data-bs-toggle',
            'modal',
            'data-bs-target',
            '#scheduledAlertsModal',
            1,
            'btn',
            'btn-outline-success',
            'mx-1',
            3,
            'click'
          ],
          [1, 'fas', 'fa-calendar'],
          [1, 'btn', 'btn-link', 3, 'click'],
          [1, 'btn', 'btn-primary', 'me-1', 3, 'click'],
          [1, 'btn', 'btn-success', 3, 'click']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 0)(1, 'div', 1)(2, 'div', 2)(3, 'div', 3)(4, 'h5', 4),
            v(5, 'Post Alert'),
            u(),
            T(6, 'button', 5),
            u(),
            d(7, 'div', 6)(8, 'nav')(9, 'div', 7)(10, 'a', 8),
            x('click', function () {
              return o.doSelectedTab('text');
            }),
            v(11, ' Text Alert '),
            u(),
            d(12, 'a', 9),
            x('click', function () {
              return o.doSelectedTab('link');
            }),
            v(13, ' Text Url '),
            u(),
            d(14, 'a', 10),
            x('click', function () {
              return o.doSelectedTab('img');
            }),
            v(15, ' Image / GIF / Video '),
            u()()(),
            d(16, 'div', 11)(17, 'div', 12)(18, 'div', 13)(19, 'textarea', 14),
            Ve('ngModelChange', function (r) {
              return (He(o.alertTxt, r) || (o.alertTxt = r), r);
            }),
            x('paste', function (r) {
              return o.onImagePaste(r);
            }),
            u()()(),
            d(20, 'div', 15)(21, 'div', 16)(22, 'div', 17)(23, 'span', 18),
            T(24, 'i', 19),
            u()(),
            d(25, 'input', 20),
            Ve('ngModelChange', function (r) {
              return (He(o.alertUrl, r) || (o.alertUrl = r), r);
            }),
            u()(),
            d(26, 'div', 21)(27, 'textarea', 22),
            Ve('ngModelChange', function (r) {
              return (He(o.linkAlertTxt, r) || (o.linkAlertTxt = r), r);
            }),
            u()()(),
            d(28, 'div', 23)(29, 'div', 16)(30, 'div', 17)(31, 'span', 24),
            T(32, 'i', 19),
            u()(),
            d(33, 'input', 25),
            Ve('ngModelChange', function (r) {
              return (He(o.alertUrl, r) || (o.alertUrl = r), r);
            }),
            u()(),
            d(34, 'div'),
            v(35, ' OR... '),
            d(36, 'label', 26),
            T(37, 'input', 27)(38, 'i', 28)(39, 'br'),
            v(40, ' Click to select images to upload '),
            u(),
            d(41, 'div', 29),
            v(42, ' or drop an image here '),
            u(),
            T(43, 'br')(44, 'div', 30),
            u(),
            T(45, 'div', 31),
            d(46, 'div', 21)(47, 'textarea', 22),
            Ve('ngModelChange', function (r) {
              return (He(o.imageAlertTxt, r) || (o.imageAlertTxt = r), r);
            }),
            u()()()()(),
            d(48, 'div', 32)(49, 'div', 33)(50, 'div', 34)(51, 'div', 35)(52, 'input', 36),
            Ve('ngModelChange', function (r) {
              return (He(o.keepOpen, r) || (o.keepOpen = r), r);
            }),
            u(),
            d(53, 'label', 37),
            v(54, 'Keep alert window open?'),
            u()(),
            d(55, 'div', 35)(56, 'input', 38),
            Ve('ngModelChange', function (r) {
              return (He(o.postOnX, r) || (o.postOnX = r), r);
            }),
            u(),
            d(57, 'label', 39),
            v(58, 'Post on X? (tweet)'),
            u()(),
            H(59, NTe, 4, 3, 'div', 35)(60, LTe, 4, 3, 'div', 35)(61, BTe, 4, 3, 'div', 35)(
              62,
              jTe,
              2,
              0
            )(63, VTe, 4, 3, 'div', 35)(64, HTe, 4, 3, 'div', 35)(
              65,
              $Te,
              2,
              1,
              'div',
              40
            )(66, GTe, 30, 5, 'div'),
            u(),
            d(67, 'div', 41),
            H(68, WTe, 3, 0, 'button', 42)(69, qTe, 3, 0, 'button', 43)(
              70,
              KTe,
              2,
              0,
              'button',
              44
            )(71, YTe, 2, 0, 'button', 45)(72, QTe, 2, 0, 'button', 45),
            u()()()()()()),
            2 & i &&
              (m(19),
              je('ngModel', o.alertTxt),
              m(6),
              je('ngModel', o.alertUrl),
              m(2),
              je('ngModel', o.linkAlertTxt),
              m(6),
              je('ngModel', o.alertUrl),
              m(14),
              je('ngModel', o.imageAlertTxt),
              m(5),
              je('ngModel', o.keepOpen),
              z('ngModelOptions', wo(22, Fa)),
              m(4),
              je('ngModel', o.postOnX),
              z('ngModelOptions', wo(23, Fa)),
              m(3),
              O(59, o.appService.globals.sessData.twillioApiSID ? 59 : -1),
              m(),
              O(60, o.hasPush ? 60 : -1),
              m(),
              O(61, o.hasNonTrade ? 61 : -1),
              m(),
              O(
                62,
                o.appService.globals.alertLabels && o.appService.globals.alertLabels.length > 0
                  ? 62
                  : -1
              ),
              m(),
              O(63, o.appService.globals.sessData.linkedRoomAlerts ? 63 : -1),
              m(),
              O(64, o.hasLegalDisclosure ? 64 : -1),
              m(),
              O(65, o.legalDisclosure ? 65 : -1),
              m(),
              O(66, o.showSendLater && o.hasAlertScheduler ? 66 : -1),
              m(2),
              O(
                68,
                o.showSendLater &&
                  o.appService.globals.scheduledAlerts &&
                  o.appService.globals.scheduledAlerts.length > 0 &&
                  o.hasAlertScheduler
                  ? 68
                  : -1
              ),
              m(),
              O(69, !o.showSendLater && o.hasAlertScheduler ? 69 : -1),
              m(),
              O(70, o.showSendLater ? 70 : -1),
              m(),
              O(71, o.showSendLater ? -1 : 71),
              m(),
              O(72, o.showSendLater ? 72 : -1)));
        },
        dependencies: [qs, Vl, Hl, ai, Ss, jl, ti, Ws, Yn, as],
        styles: [
          '.modalClose[_ngcontent-%COMP%]{color:#fff;border:none;background:none;font-size:20px}#addon-img[_ngcontent-%COMP%]{background-color:var(--modal-input-group-bg)}#alert-modal[_ngcontent-%COMP%]   .btn-link[_ngcontent-%COMP%]{color:var(--modal-alert-link-color)}.upload-area[_ngcontent-%COMP%]:hover{cursor:pointer}'
        ]
      });
    }
  }
  return t;
})();
