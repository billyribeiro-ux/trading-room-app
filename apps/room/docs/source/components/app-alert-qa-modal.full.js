const Hxe = ['qaContainer'],
  UB = (t, n) => n._id;
function $xe(t, n) {
  if ((1 & t && (d(0, 'div', 25), T(1, 'img', 31), u()), 2 & t)) {
    const e = g(2);
    (m(),
      z(
        'src',
        e.qaMsg.pic || 'https://secure.gravatar.com/avatar/' + e.qaMsg.avt + '?d=mm&s=50',
        Mt
      ));
  }
}
function zxe(t, n) {
  if ((1 & t && (d(0, 'span', 28), Je(1, 'date'), v(2), Je(3, 'date'), u()), 2 & t)) {
    const e = g(2);
    (xn('ngbTooltip', Ct(1, 2, e.qaMsg.t, 'short')), m(2), Ze(Ct(3, 5, e.qaMsg.t, 'hh:mm a')));
  }
}
function Gxe(t, n) {
  if ((1 & t && (d(0, 'strong', 30), v(1), u()), 2 & t)) {
    const e = g(2);
    (m(), Ne(' ', e.qaMsg.n, ' '));
  }
}
function Wxe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 33),
      Je(1, 'parseSymbols'),
      Je(2, 'parseLinks'),
      x('click', function (o) {
        D(e);
        const s = g(3);
        return E(s.copyTradeOnClick(o, 'id_' + s.qaMsg._id));
      }),
      u());
  }
  if (2 & t) {
    const e = g(3);
    z(
      'innerHTML',
      Tn(
        2,
        6,
        Tn(1, 1, e.qaMsg.txt, 'chat', e.qaMsg.avt, null),
        e.appService.globals.preferences.chatGif,
        e.qaMsg._id,
        !1
      ),
      wn
    );
  }
}
function qxe(t, n) {
  if ((1 & t && (T(0, 'div', 32), Je(1, 'parseSymbols'), Je(2, 'parseLinks')), 2 & t)) {
    const e = g(3);
    z(
      'innerHTML',
      Tn(
        2,
        6,
        Tn(1, 1, e.qaMsg.txt, 'chat', e.qaMsg.avt, null),
        e.appService.globals.preferences.chatGif,
        e.qaMsg._id,
        !1
      ),
      wn
    );
  }
}
function Kxe(t, n) {
  (1 & t && H(0, Wxe, 3, 11, 'div', 32)(1, qxe, 3, 11),
    2 & t && O(0, g(2).appService.globals.sessData.copyTrades ? 0 : 1));
}
function Yxe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 8)(1, 'div', 22)(2, 'div', 23)(3, 'div', 24),
      H(4, $xe, 2, 1, 'div', 25),
      u(),
      d(5, 'div', 26)(6, 'div', 27),
      H(7, zxe, 4, 8, 'span', 28),
      d(8, 'div', 29),
      H(9, Gxe, 2, 1, 'strong', 30),
      u()(),
      H(10, Kxe, 2, 1),
      u()()()()),
    2 & t)
  ) {
    const e = g();
    (m(4),
      O(4, (e.qaMsg && e.qaMsg.hasOwnProperty('avt')) || e.qaMsg.hasOwnProperty('pic') ? 4 : -1),
      m(3),
      O(7, e.qaMsg && e.qaMsg.hasOwnProperty('t') ? 7 : -1),
      m(2),
      O(9, e.qaMsg && e.qaMsg.hasOwnProperty('n') ? 9 : -1),
      m(),
      O(10, e.qaMsg && e.qaMsg.hasOwnProperty('txt') ? 10 : -1));
  }
}
function Qxe(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'emoji-mart', 34),
      x('emojiSelect', function (o) {
        return (D(e), E(g().selectEmoji(o)));
      }),
      u());
  }
}
function Xxe(t, n) {
  1 & t && (d(0, 'div', 12), v(1, 'There are no questions.'), u());
}
function Jxe(t, n) {
  if ((1 & t && T(0, 'app-st-message', 35), 2 & t)) {
    const e = n.$implicit,
      i = n.$index,
      o = g(3);
    z('msg', e)('isP', o.isPresenter)('logType', o.logType)('isQAMsg', o.isQAMsg)(
      'qaMsgID',
      o.qaMsg._id
    )('msgIndex', i)('prevD', i > 0 ? o.msgs[i - 1].t : 0);
  }
}
function Zxe(t, n) {
  (1 & t && ht(0, Jxe, 1, 7, 'app-st-message', 35, UB), 2 & t && pt(g(2).msgs));
}
function e3e(t, n) {
  if ((1 & t && T(0, 'app-st-compactmessage', 35), 2 & t)) {
    const e = n.$implicit,
      i = n.$index,
      o = g(3);
    z('msg', e)('isP', o.isPresenter)('logType', o.logType)('isQAMsg', o.isQAMsg)(
      'qaMsgID',
      o.qaMsg._id
    )('msgIndex', i)('prevD', i > 0 ? o.msgs[i - 1].t : 0);
  }
}
function t3e(t, n) {
  (1 & t && ht(0, e3e, 1, 7, 'app-st-compactmessage', 35, UB), 2 & t && pt(g(2).msgs));
}
function n3e(t, n) {
  (1 & t && H(0, Zxe, 2, 0)(1, t3e, 2, 0), 2 & t && O(0, 'r' == g().displayMode ? 0 : 1));
}
function i3e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'span', 36),
      x('click', function () {
        return (D(e), E(g().imgUpload()));
      }),
      T(1, 'i', 37),
      u());
  }
}
const yi = window.$;
let _c;
function P2(t) {
  (t.stopPropagation(),
    t.preventDefault(),
    (t.target.className = 'dragover' === t.type ? 'hover' : ''));
}
function o3e(t) {
  console.log('FileDropped:', t);
  const n = document.createElement('img'),
    e = new FileReader();
  ((e.onloadend = () => {
    ((n.src = e.result), yi('#fileList').append(n));
  }),
    e.readAsDataURL(t));
}
function jB(t) {
  (yi('#fileList').show(), yi('#filedrag').hide(), P2(t));
  const n = t.target.files || t.dataTransfer.files;
  (yi('#fileList').empty(), (_c = []));
  for (let i, e = 0; (i = n[e]); e++) (_c.push(i), o3e(i));
}
s3e = (() => {
  class t {
    constructor(e, i) {
      ((this.appService = e),
        (this.elementRef = i),
        (this.qaMsg = { txt: '', n: '', t: '', avt: '', pic: '', _id: '' }),
        (this.msgs = []),
        (this.showEmojiChooser = !1),
        (this.canPost = !0),
        (this.canPostImages = !1),
        (this.sendingGif = !1),
        (this.displayMode = 'r'),
        (this.isQAMsg = !0),
        (this.logType = 'alerts'),
        (this.modalId = ''),
        (this.imggurUploadTxt = ''),
        (this.copyTradeAlertVisible = !1),
        (this.appEventBus = this.appService.appEventBus),
        (this.guiEventBus = this.appService.guiEventBus));
    }
    ngOnInit() {
      ((this.isPresenter = this.appService.globals.isPresenter),
        this.loadAlertsMode(),
        (this.isPresenter || this.appService.globals.sessData.userUploads) &&
          (this.canPostImages = !0),
        this.appService.guiEventBus.subscribe('switchAlertsDisplayMode', (e) => {
          this.setOption(e);
        }),
        this.appService.guiEventBus.subscribe('openAlertQAModal', ({ msg: e, openModal: i }) => {
          e &&
            (i &&
              (yi('#alertQAModal').modal('show'),
              (this.modalId = e._id),
              yi('#textAreaQATxt').val('')),
            this.modalId === e._id &&
              (yi(`.${e._id}`).on('hidden.bs.modal', () => {
                e.hasOwnProperty('unreadQA') && delete e.unreadQA;
              }),
              (this.qaMsg = e),
              (this.msgs = e.qa),
              this.scrollToBottomQA()));
        }),
        this.guiEventBus.subscribe('doQAMention', (e) => {
          if (e) {
            let i = yi('#textAreaQATxt').val().toString();
            i.length
              ? yi('#textAreaQATxt').val(i + ' @' + e + ' ')
              : yi('#textAreaQATxt').val('@' + e + ' ');
          }
        }));
    }
    ngAfterViewInit() {
      (this.guiEventBus.emit('scrollChatLogToBottom', { force: !0 }),
        this.elementRef.nativeElement
          .querySelector('#textAreaQATxt')
          .addEventListener('input', this.onAutoExpand.bind(this)),
        this.scrollToBottomQA());
    }
    loadAlertsMode() {
      if (this.appService.globals.sessData.altChatRender)
        ((this.displayMode = 'c'), this.appService.setPreference('alertsMode', this.displayMode));
      else {
        const e = this.appService.getPreference('alertsMode');
        (e && (this.displayMode = e),
          this.appService.setPreference('alertsMode', this.displayMode));
      }
    }
    setOption(e) {
      ((this.displayMode = e), this.appService.setPreference('alertsMode', e));
    }
    scrollToBottomQA() {
      const e = this;
      try {
        setTimeout(() => {
          e.qaContainer.nativeElement.scrollTop = e.qaContainer.nativeElement.scrollHeight;
        }, 500);
      } catch {}
    }
    onAutoExpand(e) {
      if ('textareaqatxt' !== e.target.id.toLowerCase()) return !1;
      this.autoExpand(e.target);
    }
    autoExpand(e) {
      if (e.scrollHeight > 300) return;
      e.style.height = '0';
      const i = window.getComputedStyle(e),
        o = e.scrollHeight + 'px';
      (i.getPropertyValue('height') !== o &&
        ((e.style.height = o),
        (this.elementRef.nativeElement.querySelector('.modal-body').style.maxHeight =
          `calc(70vh - ${o} + 37px)`)),
        '' === e.value.trim() &&
          ((e.style.height = '23px'),
          (this.elementRef.nativeElement.querySelector('.modal-body').style.maxHeight = '70vh')));
    }
    onKey(e) {
      if (13 === e.keyCode) {
        e.preventDefault();
        const i = yi('#textAreaQATxt');
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
    selectEmoji(e) {
      console.log(e);
      const i = yi('#textAreaQATxt').val() + e.emoji.native;
      (yi('#textAreaQATxt').val(i), (this.selectedEmoji = e.emoji));
    }
    sendMessage() {
      if (!this.canPost) return void bootbox.alert('Sorry, you cannot post to this channel');
      const e = yi('#textAreaQATxt').val().toString().trim();
      if (!e) return !1;
      (this.appService.sendAlertQAReply(this.qaMsg._id, e),
        yi('#textAreaQATxt').val(''),
        this.scrollToBottomQA());
    }
    imgUpload() {
      const e = this;
      ((_c = []),
        (this.imggurUploadTxt = ''),
        bootbox.dialog({
          message:
            "<div>\n      <label class='upload-area' style='width:100%;text-align:center;' for='fupload'>\n      <input id='fupload' name='fupload' type='file' style='display:none;' multiple='true' accept='image/*'>\n      <i class='fas fa-file-upload fa-3x'></i><br />\n      Click to select images to upload\n      </label>\n      <div id=\"filedrag\" class=\"filedrag\">or drop files here</div>\n      <br />\n      <div style='margin-left:5px !important;' id='fileList' class=\"fileList text-center\"></div>\n      </div><div class='clearfix'></div>\n      <div class=\"w-100 my-3\"><textarea class=\"form-control w-100\"  rows=\"2\" id=\"msg-text-qa-upload\" name=\"msg-text-qa-upload\" placeholder=\"Enter your message\"></textarea></div>\n      ",
          title: 'Image Upload',
          backdrop: !0,
          onEscape: !0,
          size: 'xl',
          buttons: {
            success: {
              label: 'Upload',
              className: 'btn-success',
              callback() {
                if (_c) {
                  const r = yi('#msg-text-qa-upload').val().trim();
                  e.doImagurFileListUpload(r);
                }
              }
            }
          }
        }));
      const o = document.getElementById('filedrag');
      (o.addEventListener('dragover', P2, !1),
        o.addEventListener('dragleave', P2, !1),
        o.addEventListener('drop', jB, !1),
        (o.style.display = 'block'),
        document.getElementById('fupload').addEventListener('change', jB, !1));
    }
    doImagurFileListUpload() {
      var e = this;
      return I(function* (i = '') {
        let o = _c.length;
        for (const [s, r] of _c.entries())
          (bootbox.hideAll(),
            bootbox.alert(
              `Uploading ${s}/${o}: ${r.name}. Please wait...<br><div style="text-align: center;"><i class="ml-2 fas fa-spinner fa-spin fa-3x"></i></div>`
            ),
            yield e.doImggurUpload(r, i, o - 1 !== s));
        (bootbox.hideAll(), _c.splice(0, o - 1));
      }).apply(this, arguments);
    }
    doImggurUpload(e, i = null, o = !1) {
      const s = this;
      return new Promise((r, a) => {
        const l = `${s.appService.globals.upload_server}/image/${s.appService.globals.sessionID}`,
          c = s.appService.globals.cdn_upload_key,
          h = new FormData();
        (h.append('image', e), h.append('name', e.name));
        const f = {
          async: !0,
          crossDomain: !0,
          url: l,
          method: 'POST',
          datatype: 'json',
          headers: { Authorization: 'Client-ID ' + c },
          processData: !1,
          contentType: !1,
          data: h,
          beforeSend(_) {
            P('Uploading... ' + e.name);
          },
          success(_) {
            (bootbox.hideAll(), P('imge link:' + _.data.link));
            let F = _.data.link;
            ((s.imggurUploadTxt += s.imggurUploadTxt && s.imggurUploadTxt.length > 0 ? ' ' + F : F),
              o ||
                (i && ((s.imggurUploadTxt += ' ' + i), yi('#textAreaQATxt').val('')),
                s.appService.sendAlertQAReply(s.qaMsg._id, s.imggurUploadTxt),
                (s.imggurUploadTxt = ''),
                yi('#alertQAModal').modal('hide')),
              r(_));
          },
          error(_) {
            (bootbox.hideAll(), bootbox.alert('Upload Failed...'), a(_));
          }
        };
        yi.ajax(f).done((_) => {
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
          a = yi('#textAreaQATxt').val().trim();
        bootbox.confirm({
          message:
            '<div class="text-center"><h4>Upload this image?</h4><img style="max-width:100%; max-height: 50vh;" src="' +
            r +
            '" /><div class="w-100 mt-3"><textarea class="form-control w-100"  rows="2" id="msg-text-qa" name="msg-text-qa" placeholder="Enter your message">' +
            a +
            '</textarea></div></div>',
          callback: (l) =>
            I(function* () {
              if (l) {
                const c = yield yi('#msg-text-qa').val().trim();
                (console.log('msgTxt: ', c),
                  yield i.doImggurUpload(s, c),
                  console.log('ok, uploading...'));
              } else console.log('cancel uploading...');
            })()
        });
      }
    }
    copyTradeOnClick(e, i) {
      const o = e.target;
      'SPAN' === o.tagName &&
        o.classList?.contains('tradeColor') &&
        o.id === i &&
        (this.doTradeCopy(i), e.stopPropagation());
    }
    doTradeCopy(e) {
      const i = document.getElementById(e);
      if (i) {
        const o = i.textContent || '';
        navigator.clipboard
          .writeText(o)
          .then(() => {
            (console.log('Text copied to clipboard:', o),
              this.copyTradeAlertVisible ||
                ((this.copyTradeAlertVisible = !0),
                bootbox.alert('Order copied to clipboard.', () => {
                  this.copyTradeAlertVisible = !1;
                })));
          })
          .catch((s) => {
            console.error('Failed to copy text:', s);
          });
      } else console.error('Element not found for id:', e);
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(Yt));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-alert-qa-modal']],
        viewQuery: function (i, o) {
          if ((1 & i && Xt(Hxe, 5), 2 & i)) {
            let s;
            yt((s = Ft())) && (o.qaContainer = s.first);
          }
        },
        decls: 24,
        vars: 8,
        consts: [
          ['qaContainer', ''],
          ['emojiPanelDiv', ''],
          [
            'id',
            'alertQAModal',
            'tabindex',
            '-1',
            'aria-labelledby',
            'alertQALabel',
            'aria-hidden',
            'true',
            'data-keyboard',
            'false',
            'data-backdrop',
            'static'
          ],
          [1, 'modal-dialog'],
          [1, 'modal-content'],
          [1, 'modal-header', 'align-items-start'],
          [1, 'flex-fill'],
          ['id', 'alertQALabel', 1, 'modal-title'],
          [1, 'admin-alert', 'mt-2'],
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
          [1, 'popoverClass'],
          [1, 'my-2'],
          [1, 'modal-footer', 'flex-nowrap'],
          ['id', 'textAreaHolder', 1, 'd-flex', 'align-items-center', 'textSendDiv', 'flex-fill'],
          [1, 'flex-fill', 'd-flex', 'mx-0'],
          [1, 'px-0', 'flex-fill'],
          [
            'name',
            'txt-area',
            'id',
            'textAreaQATxt',
            'rows',
            '1',
            'spellcheck',
            'true',
            1,
            'txt-area',
            'form-control',
            'border-0',
            3,
            'keyup',
            'paste',
            'placeholder'
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
          ['clas', 'd-flex flex-column  align-items-center w-100'],
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
          [1, 'avatar', 'pl-1'],
          [1, 'w-100'],
          [1, 'd-flex', 'justify-content-between', 'align-items-center', 'w-100'],
          ['placement', 'top', 1, 'created-at', 'mr-2', 3, 'ngbTooltip'],
          [1, 'd-flex', 'align-items-center', 'justify-content-between', 'flex-nowrap'],
          [1, 'username', 'mx-1'],
          ['alt', 'qaMsg.avt', 3, 'src'],
          [1, 'msg-left', 'text-formated', 'preText', 'ml-2', 'mr-2', 'p-0', 3, 'innerHTML'],
          [
            1,
            'msg-left',
            'text-formated',
            'preText',
            'ml-2',
            'mr-2',
            'p-0',
            3,
            'click',
            'innerHTML'
          ],
          [3, 'emojiSelect'],
          [3, 'msg', 'isP', 'logType', 'isQAMsg', 'qaMsgID', 'msgIndex', 'prevD'],
          [1, 'textAreaBtns', 3, 'click'],
          ['ngbTooltip', 'Upload an Image', 'placement', 'left', 1, 'fas', 'fa-image']
        ],
        template: function (i, o) {
          if (1 & i) {
            const s = Y();
            (d(0, 'div', 2)(1, 'div', 3)(2, 'div', 4)(3, 'div', 5)(4, 'div', 6)(5, 'h5', 7),
              v(6, 'Q&A for Alert:'),
              u(),
              H(7, Yxe, 11, 4, 'div', 8),
              u(),
              T(8, 'button', 9),
              u(),
              d(9, 'div', 10, 0),
              H(11, Qxe, 1, 0, 'ng-template', 11, 1, Rn)(13, Xxe, 2, 0, 'div', 12)(14, n3e, 2, 1),
              u(),
              d(15, 'div', 13)(16, 'div', 14)(17, 'div', 15)(18, 'div', 16)(19, 'textarea', 17),
              x('keyup', function (a) {
                return (D(s), E(o.onKey(a)));
              })('paste', function (a) {
                return (D(s), E(o.onImagePaste(a)));
              }),
              u()(),
              d(20, 'div', 18)(21, 'span', 19),
              x('click', function () {
                return (D(s), E(o.toggleEmojiPanel()));
              }),
              T(22, 'i', 20),
              u(),
              H(23, i3e, 2, 0, 'span', 21),
              u()()()()()()());
          }
          if (2 & i) {
            const s = It(12);
            (Rh('modal fade ', o.qaMsg._id, ''),
              m(7),
              O(7, o.qaMsg ? 7 : -1),
              m(6),
              O(13, o.msgs && 0 === o.msgs.length ? 13 : 14),
              m(6),
              xn(
                'placeholder',
                o.appService.globals.isPresenter
                  ? 'Type your answer here...'
                  : 'Type your question here...'
              ),
              m(2),
              z('ngbPopover', s),
              m(2),
              O(23, o.canPostImages ? 23 : -1));
          }
        },
        dependencies: [tc, ha, el, pu, uf, os, ww, Tw],
        styles: [
          '#alertQAModal[_ngcontent-%COMP%]   .modal-dialog[_ngcontent-%COMP%]{max-width:600px!important;overflow-y:initial!important}#alertQAModal[_ngcontent-%COMP%]   .modal-body[_ngcontent-%COMP%]{min-height:330px;max-height:70vh;height:100%;overflow-y:auto}.preText[_ngcontent-%COMP%]{white-space:pre-wrap}#textAreaTxt[_ngcontent-%COMP%]{max-height:300px;width:100%}.admin-alert[_ngcontent-%COMP%]{border:1px solid #444;border-radius:5px;padding:5px}.avatar[_ngcontent-%COMP%]{display:inline}.avatar[_ngcontent-%COMP%]   img[_ngcontent-%COMP%]{width:100%;max-width:50px;height:auto}.username[_ngcontent-%COMP%]{font-size:14px;color:#ccc;font-weight:900}.created-at[_ngcontent-%COMP%]{font-size:12px;font-style:italic;color:#ccc;overflow:hidden;font-weight:600}.msg-left[_ngcontent-%COMP%]{text-align:left}.text-formated[_ngcontent-%COMP%]{font-size:16px}.chatNameAvatar[_ngcontent-%COMP%]{display:inline}.textAreaBtns[_ngcontent-%COMP%]{padding:5px;color:var(--dark-gray)}.custom-file[_ngcontent-%COMP%]{display:none}.input-group-text[_ngcontent-%COMP%]{padding:0;margin:0}.textAreaBtnsCol[_ngcontent-%COMP%]{background-color:var(--textarea-bg)!important;color:var(--dark-gray)!important}.textAreaBtns[_ngcontent-%COMP%]{color:var(--textarea-holder-btns-color)!important}.textAreaBtns[_ngcontent-%COMP%]:hover{color:var(--textarea-holder-btns-hover-color)!important;cursor:pointer}.txt-area[_ngcontent-%COMP%]{border-radius:0;border:1px solid #ffffff;font-size:14px;resize:none;color:var(--textarea-color)!important;background-color:var(--textarea-bg)!important;outline:none;overflow-y:auto;margin-left:0;margin-right:0;padding-left:5px;padding-right:5px}.txt-area[_ngcontent-%COMP%]:focus{border-color:var(--darker-gray);box-shadow:1px 1px 1px var(--darker-gray)}#form-upload-img[_ngcontent-%COMP%]   .input-group-text[_ngcontent-%COMP%], #form-upload-img[_ngcontent-%COMP%]   .form-control[_ngcontent-%COMP%]{border-radius:0}.white[_ngcontent-%COMP%]{color:#fff}.textAreaBtnSelected[_ngcontent-%COMP%]{background-color:#f1f2f3}.bs-popover-top[_ngcontent-%COMP%] > .arrow[_ngcontent-%COMP%]:after, .bs-popover-auto[x-placement^=top][_ngcontent-%COMP%] > .arrow[_ngcontent-%COMP%]:after{border-top-color:var(--modal-content-bg-color)}.giphy-search[_ngcontent-%COMP%]{width:400px;height:700px;border:2px solid var(--modal-content-bg-color);background-color:#fff;overflow:hidden}.giphy-search[_ngcontent-%COMP%]   .input-group-text[_ngcontent-%COMP%]{border:none;background-color:var(--modal-input-group-bg)}.giphy-search[_ngcontent-%COMP%]   .fa-times[_ngcontent-%COMP%]{font-size:16.5px;padding:10px}.giphy-search[_ngcontent-%COMP%]   .fa-times[_ngcontent-%COMP%]:hover{cursor:pointer;opacity:.85}.giphy-header[_ngcontent-%COMP%]{padding:10px;background-color:var(--modal-content-bg-color)}.search-results[_ngcontent-%COMP%]{overflow-y:auto;height:100%;padding:5px}.gif-result[_ngcontent-%COMP%]{text-align:center}.gif-result[_ngcontent-%COMP%]   img[_ngcontent-%COMP%]{cursor:pointer}.giphy-search[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]{padding:10px}.giphy-search[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]:hover{background-color:var(--modal-upload-files-color)}.giphy-search[_ngcontent-%COMP%]   h4[_ngcontent-%COMP%]{color:var(--modal-content-color);text-align:center}#textAreaHolder[_ngcontent-%COMP%]{background-color:var(--textarea-bg);border-radius:8px;padding:5px;margin:5px}.typing-indicator-container[_ngcontent-%COMP%]{margin:4px 16px}.users-typing[_ngcontent-%COMP%]{color:#90949c;font-size:12px}.users-typing[_ngcontent-%COMP%]   em[_ngcontent-%COMP%]{font-weight:700}#textAreaQATxt[_ngcontent-%COMP%]{max-height:300px;width:100%}#textAreaQATxt[_ngcontent-%COMP%], .textAreaBtnsCol[_ngcontent-%COMP%]{background-color:var(--textarea-bg)}img[_ngcontent-%COMP%]{max-width:100%}'
        ]
      });
    }
  }
  return t;
})();
