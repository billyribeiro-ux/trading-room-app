Aue = (() => {
  class t {
    constructor(e) {
      ((this.appService = e),
        (this.channel = 'main'),
        (this.rteConfig = {
          placeholder: 'Type your message here...',
          minHeight: 200,
          toolbar: [
            ['font', ['bold', 'italic', 'underline', 'clear']],
            ['color', ['forecolor']]
          ],
          popover: { air: [] },
          dialogsInBody: !0,
          disableResizeEditor: !0
        }),
        (this.msg = null),
        (this.isEditing = !1));
    }
    ngOnInit() {
      (this.appService.guiEventBus.subscribe('doRTEModal', (e) => {
        (ga('#rteModal').modal('show'),
          (this.channel = e.channel),
          (this.isEditing = !1),
          this.loadRTE(),
          ga('#msgTxtContainer')?.summernote('code', e.txt || ''));
      }),
        this.appService.guiEventBus.subscribe('doRTEModalEdit', (e) => {
          (ga('#rteModal').modal('show'),
            (this.msg = e.msg),
            (this.isEditing = !0),
            this.loadRTE(),
            ga('#msgTxtContainer')?.summernote('code', e.msg.txt));
        }));
    }
    ngAfterViewInit() {}
    sendMessage() {
      let e = this.retriveRTEContent();
      if (!e || '' === e.trim()) return (P('Empty message. Please type a message...'), !1);
      (this.isEditing
        ? (this.appService.sendServerCommand('editChatMessage', { msgID: this.msg._id, newMsg: e }),
          (this.isEditing = !1),
          (this.msg = null))
        : (this.appService.sendGrpChat(this.channel, e),
          this.appService.guiEventBus.emit('scrollChatLogToBottom', { force: !0, repeat: !1 })),
        this.destroyRTE(),
        ga('#rteModal').modal('hide'));
    }
    loadRTE() {
      this.appService.globals.sessData.enableRTE &&
        this.appService.globals.preferences.enableRTE &&
        this.appService.globals.isPresenter &&
        (this.destroyRTE(),
        ga('#msgTxtContainer')?.summernote({ ...this.rteConfig }),
        ga('#msgTxtContainer')?.summernote('code', ''));
    }
    destroyRTE() {
      const e = ga('#msgTxtContainer');
      if (e.length) {
        try {
          e.summernote('destroy');
        } catch {}
        e.replaceWith('<div id="msgTxtContainer"></div>');
      }
    }
    retriveRTEContent() {
      if (
        !this.appService.globals.sessData.enableRTE ||
        !this.appService.globals.preferences.enableRTE ||
        !this.appService.globals.isPresenter
      )
        return '';
      let e = '';
      try {
        e = ga('#msgTxtContainer')?.summernote('code')?.toString().trim() || '';
      } catch {
        return '';
      }
      return (('' === e || '<p><br></p>' === e || '<br>' === e || '<p></p>' === e) && (e = ''), e);
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-rich-text-editor']],
        standalone: !0,
        features: [qn],
        decls: 16,
        vars: 1,
        consts: [
          [
            'id',
            'rteModal',
            'tabindex',
            '-1',
            'aria-labelledby',
            'rteLabel',
            'aria-hidden',
            'true',
            1,
            'modal',
            'fade'
          ],
          [1, 'modal-dialog'],
          [1, 'modal-content'],
          [1, 'modal-header'],
          ['id', 'rteLabel', 1, 'modal-title'],
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
          ['id', 'msgTxtContainer'],
          [1, 'modal-footer'],
          [1, 'd-flex', 'justify-content-between', 'w-100', 'align-items-center'],
          ['type', 'button', 'data-bs-dismiss', 'modal', 1, 'btn', 'btn-secondary', 3, 'click'],
          ['type', 'button', 1, 'btn', 'btn-primary', 3, 'click']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 0)(1, 'div', 1)(2, 'div', 2)(3, 'div', 3)(4, 'h5', 4),
            v(5, 'Rich Text Editor'),
            u(),
            T(6, 'button', 5),
            u(),
            d(7, 'div', 6),
            T(8, 'div', 7),
            u(),
            d(9, 'div', 8)(10, 'div', 9)(11, 'button', 10),
            x('click', function () {
              return o.destroyRTE();
            }),
            v(12, ' Close '),
            u(),
            d(13, 'button', 11),
            x('click', function () {
              return o.sendMessage();
            }),
            H(14, xue, 2, 0, 'span')(15, Mue, 2, 0),
            u()()()()()()),
            2 & i && (m(14), O(14, o.isEditing ? 14 : 15)));
        }
      });
    }
  }
  return t;
})();
