jxe = (() => {
  class t {
    constructor(e, i, o, s) {
      ((this.appService = e),
        (this.soundEffectsService = i),
        (this.alertService = o),
        (this.elementRef = s),
        (this.msg = { c: '', txt: '', n: '', _id: '' }),
        (this.isPresenter = !1),
        (this.showEmojiChooser = !1),
        (this.canPost = !0),
        (this.canPostImages = !1),
        (this.sendingGif = !1),
        (this.imggurUploadTxt = ''),
        (this.appEventBus = this.appService.appEventBus),
        (this.guiEventBus = this.appService.guiEventBus));
    }
    ngOnInit() {
      ((this.isPresenter = this.appService.globals.isPresenter),
        (this.isPresenter || this.appService.globals.sessData.userUploads) &&
          (this.canPostImages = !0),
        this.appService.guiEventBus.subscribe('doPublicReply', (e) => {
          (console.log('doPublicReply data: ', e),
            (this.msg = { c: e.c, txt: e.txt, n: e.n, _id: e._id }));
        }));
    }
    ngAfterViewInit() {
      (this.guiEventBus.emit('scrollChatLogToBottom', { force: !0 }),
        this.elementRef.nativeElement
          .querySelector('#textAreaReplyTxt')
          .addEventListener('input', this.onAutoExpand.bind(this)));
    }
    onAutoExpand(e) {
      if ('textareareplytxt' !== e.target.id.toLowerCase()) return !1;
      this.autoExpand(e.target);
    }
    autoExpand(e) {
      e.style.height = '0';
      const i = window.getComputedStyle(e),
        o = e.scrollHeight + 'px';
      (i.getPropertyValue('height') !== o && (e.style.height = o),
        '' === e.value.trim() && (e.style.height = '23px'));
    }
    onKey(e) {
      if (13 === e.keyCode) {
        e.preventDefault();
        const i = mo('#textAreaReplyTxt');
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
      const i = mo('#textAreaReplyTxt').val() + e.emoji.native;
      (mo('#textAreaReplyTxt').val(i), (this.selectedEmoji = e.emoji));
    }
    sendMessage() {
      if (!this.canPost) return void bootbox.alert('Sorry, you cannot post to this channel');
      const e = mo('#textAreaReplyTxt').val().toString().trim();
      if (!e) return !1;
      (this.appService.sendChatReply(this.msg.c, e, this.msg.txt, this.msg.n, this.msg._id, null),
        mo('#replyModal').modal('hide'),
        mo('#textAreaReplyTxt').val(''),
        this.guiEventBus.emit('scrollChatLogToBottom', { force: !0, repeat: !1 }));
    }
    imgUpload() {
      const e = this;
      ((gc = []),
        (this.imggurUploadTxt = ''),
        bootbox.dialog({
          message:
            "<div>\n      <label class='upload-area' style='width:100%;text-align:center;' for='fupload'>\n      <input id='fupload' name='fupload' type='file' style='display:none;' multiple='true' accept='image/*'>\n      <i class='fas fa-file-upload fa-3x'></i><br />\n      Click to select images to upload\n      </label>\n      <div id=\"filedrag\" class=\"filedrag\">or drop files here</div>\n      <br />\n      <div style='margin-left:5px !important;' id='fileList' class=\"fileList text-center\"></div>\n      </div><div class='clearfix'></div>\n      <div class=\"w-100 my-3\"><textarea class=\"form-control w-100\"  rows=\"2\" id=\"msg-text-reply-upload\" name=\"msg-text-reply-upload\" placeholder=\"Enter your message\"></textarea></div>\n      ",
          title: 'Image Upload',
          backdrop: !0,
          onEscape: !0,
          size: 'xl',
          buttons: {
            success: {
              label: 'Upload',
              className: 'btn-success',
              callback() {
                if (gc) {
                  const r = mo('#msg-text-reply-upload').val().trim();
                  e.doImagurFileListUpload(r);
                }
              }
            }
          }
        }));
      const o = document.getElementById('filedrag');
      (o.addEventListener('dragover', A2, !1),
        o.addEventListener('dragleave', A2, !1),
        o.addEventListener('drop', BB, !1),
        (o.style.display = 'block'),
        document.getElementById('fupload').addEventListener('change', BB, !1));
    }
    doImagurFileListUpload() {
      var e = this;
      return I(function* (i = '') {
        let o = gc.length;
        for (const [s, r] of gc.entries())
          (bootbox.hideAll(),
            bootbox.alert(
              `Uploading ${s}/${o}: ${r.name}. Please wait...<br><div style="text-align: center;"><i class="ml-2 fas fa-spinner fa-spin fa-3x"></i></div>`
            ),
            yield e.doImggurUpload(r, i, o - 1 !== s));
        (bootbox.hideAll(), gc.splice(0, o - 1));
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
            (bootbox.hideAll(), P('imge link:' + _.data.link), console.log('res:', _));
            const F = _.data.link;
            ((s.imggurUploadTxt += s.imggurUploadTxt && s.imggurUploadTxt.length > 0 ? ' ' + F : F),
              o ||
                (i && ((s.imggurUploadTxt += ' ' + i), mo('#textAreaReplyTxt').val('')),
                s.appService.sendChatReply(
                  s.msg.c,
                  s.imggurUploadTxt,
                  s.msg.txt,
                  s.msg.n,
                  s.msg._id,
                  null
                ),
                (s.imggurUploadTxt = ''),
                mo('#replyModal').modal('hide')),
              r(_));
          },
          error(_) {
            (bootbox.hideAll(), bootbox.alert('Upload Failed...'), a(_));
          }
        };
        mo.ajax(f).done((_) => {
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
          a = mo('#textAreaReplyTxt').val().trim();
        bootbox.confirm({
          message:
            '<div class="text-center"><h4>Upload this image?</h4><img style="max-width:100%; max-height: 50vh;" src="' +
            r +
            '" /><div class="w-100 mt-3"><textarea class="form-control w-100"  rows="2" id="msg-text-reply" name="msg-text-reply" placeholder="Enter your message">' +
            a +
            '</textarea></div></div>',
          callback: (l) =>
            I(function* () {
              if (l) {
                const c = yield mo('#msg-text-reply').val().trim();
                (console.log('msgTxt: ', c),
                  yield i.doImggurUpload(s, c),
                  console.log('ok, uploading...'));
              } else console.log('cancel uploading...');
            })()
        });
      }
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(Ir), be(fo), be(Yt));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-reply-modal']],
        decls: 23,
        vars: 4,
        consts: [
          ['emojiPanelDiv', ''],
          [
            'id',
            'replyModal',
            'tabindex',
            '-1',
            'aria-labelledby',
            'replyLabel',
            'aria-hidden',
            'true',
            1,
            'modal',
            'fade'
          ],
          [1, 'modal-dialog'],
          [1, 'modal-content'],
          [1, 'modal-header'],
          ['id', 'replyLabel', 1, 'modal-title'],
          [1, 'do-private-reply'],
          [3, 'innerHTML'],
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
          [1, 'flex-fill', 'd-flex', 'mx-0'],
          [1, 'px-0', 'flex-fill'],
          [
            'name',
            'txt-area',
            'id',
            'textAreaReplyTxt',
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
            'paste'
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
          [1, 'modal-footer'],
          ['type', 'button', 'data-bs-dismiss', 'modal', 1, 'btn', 'btn-secondary'],
          [3, 'emojiSelect'],
          [1, 'textAreaBtns', 3, 'click'],
          ['ngbTooltip', 'Upload an Image', 'placement', 'left', 1, 'fas', 'fa-image']
        ],
        template: function (i, o) {
          if (1 & i) {
            const s = Y();
            (d(0, 'div', 1)(1, 'div', 2)(2, 'div', 3)(3, 'div', 4)(4, 'h5', 5)(5, 'span', 6)(
              6,
              'strong'
            ),
              v(7),
              u(),
              T(8, 'div', 7),
              u()(),
              T(9, 'button', 8),
              u(),
              d(10, 'div', 9),
              H(11, Lxe, 1, 0, 'ng-template', 10, 0, Rn),
              d(13, 'div', 11)(14, 'div', 12)(15, 'textarea', 13),
              x('keyup', function (a) {
                return (D(s), E(o.onKey(a)));
              })('paste', function (a) {
                return (D(s), E(o.onImagePaste(a)));
              }),
              u()(),
              d(16, 'div', 14)(17, 'span', 15),
              x('click', function () {
                return (D(s), E(o.toggleEmojiPanel()));
              }),
              T(18, 'i', 16),
              u(),
              H(19, Bxe, 2, 0, 'span', 17),
              u()()(),
              d(20, 'div', 18)(21, 'button', 19),
              v(22, ' Close '),
              u()()()()());
          }
          if (2 & i) {
            const s = It(12);
            (m(7),
              Ne('', o.msg.n, ':'),
              m(),
              z('innerHTML', o.msg.txt, wn),
              m(9),
              z('ngbPopover', s),
              m(2),
              O(19, o.canPostImages ? 19 : -1));
          }
        },
        dependencies: [tc, ha, el],
        styles: [
          '.textAreaBtns[_ngcontent-%COMP%]{padding:5px;color:var(--dark-gray)}.custom-file[_ngcontent-%COMP%]{display:none}.input-group-text[_ngcontent-%COMP%]{padding:0;margin:0}.textAreaBtnsCol[_ngcontent-%COMP%]{background-color:var(--textarea-bg)!important;color:var(--dark-gray)!important}.textAreaBtns[_ngcontent-%COMP%]{color:var(--textarea-holder-btns-color)!important}.textAreaBtns[_ngcontent-%COMP%]:hover{color:var(--textarea-holder-btns-hover-color)!important;cursor:pointer}.txt-area[_ngcontent-%COMP%]{border-radius:0;border:1px solid #ffffff;font-size:14px;resize:none;color:var(--textarea-color)!important;background-color:var(--textarea-bg)!important;outline:none;overflow-y:auto;margin-left:0;margin-right:0;padding-left:5px;padding-right:5px}.txt-area[_ngcontent-%COMP%]:focus{border-color:var(--darker-gray);box-shadow:1px 1px 1px var(--darker-gray)}#form-upload-img[_ngcontent-%COMP%]   .input-group-text[_ngcontent-%COMP%], #form-upload-img[_ngcontent-%COMP%]   .form-control[_ngcontent-%COMP%]{border-radius:0}.white[_ngcontent-%COMP%]{color:#fff}.textAreaBtnSelected[_ngcontent-%COMP%]{background-color:#f1f2f3}.bs-popover-top[_ngcontent-%COMP%] > .arrow[_ngcontent-%COMP%]:after, .bs-popover-auto[x-placement^=top][_ngcontent-%COMP%] > .arrow[_ngcontent-%COMP%]:after{border-top-color:var(--modal-content-bg-color)}.giphy-search[_ngcontent-%COMP%]{width:400px;height:700px;border:2px solid var(--modal-content-bg-color);background-color:#fff;overflow:hidden}.giphy-search[_ngcontent-%COMP%]   .input-group-text[_ngcontent-%COMP%]{border:none;background-color:var(--modal-input-group-bg)}.giphy-search[_ngcontent-%COMP%]   .fa-times[_ngcontent-%COMP%]{font-size:16.5px;padding:10px}.giphy-search[_ngcontent-%COMP%]   .fa-times[_ngcontent-%COMP%]:hover{cursor:pointer;opacity:.85}.giphy-header[_ngcontent-%COMP%]{padding:10px;background-color:var(--modal-content-bg-color)}.search-results[_ngcontent-%COMP%]{overflow-y:auto;height:100%;padding:5px}.gif-result[_ngcontent-%COMP%]{text-align:center}.gif-result[_ngcontent-%COMP%]   img[_ngcontent-%COMP%]{cursor:pointer}.giphy-search[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]{padding:10px}.giphy-search[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]:hover{background-color:var(--modal-upload-files-color)}.giphy-search[_ngcontent-%COMP%]   h4[_ngcontent-%COMP%]{color:var(--modal-content-color);text-align:center}#textAreaHolder[_ngcontent-%COMP%]{background-color:var(--textarea-bg);border-radius:8px;padding:5px;margin:5px}.typing-indicator-container[_ngcontent-%COMP%]{margin:4px 16px}.users-typing[_ngcontent-%COMP%]{color:#90949c;font-size:12px}.users-typing[_ngcontent-%COMP%]   em[_ngcontent-%COMP%]{font-weight:700}#textAreaReplyTxt[_ngcontent-%COMP%]{max-height:300px;width:100%}#textAreaReplyTxt[_ngcontent-%COMP%], .textAreaBtnsCol[_ngcontent-%COMP%]{background-color:var(--textarea-bg)}img[_ngcontent-%COMP%]{max-width:100%}'
        ]
      });
    }
  }
  return t;
})();
