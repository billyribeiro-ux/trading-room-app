fxe = (() => {
  class t {
    constructor(e) {
      ((this.appService = e),
        (this.youtubeURL = ''),
        (this.ytVideoList = []),
        (this.ytVideoStartTime = 0));
    }
    ngOnInit() {
      let e = window.localStorage.getItem('ytVideoList');
      e && ((e = JSON.parse(e)), (this.ytVideoList = e));
    }
    ngAfterViewInit() {}
    playYtVideo() {
      (this.appService.sendServerAdminCommand('stopYTForAll', { url: this.youtubeURL }),
        this.appService.sendServerAdminCommand('playYTForAll', { url: this.youtubeURL }));
    }
    playSavedYtUrl(e) {
      ((this.youtubeURL = e), this.playYtVideo());
    }
    removeYtUrl(e) {
      const i = this;
      let o = window.localStorage.getItem('ytVideoList');
      bootbox.confirm('Remove this youtube video url?', (s) => {
        s &&
          o &&
          ((o = JSON.parse(o)),
          o.forEach((r, a) => {
            a === e && o.splice(e, 1);
          }),
          (i.ytVideoList = o),
          window.localStorage.setItem('ytVideoList', JSON.stringify(i.ytVideoList)),
          bootbox.alert('Youtube video url is removed successfully.'));
      });
    }
    saveYtUrl() {
      const e = this,
        i = this.youtubeURL,
        o = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/,
        s = i.match(o) ? i.match(o)[2] : null,
        r = /[?&]list=([^#\&\?]+)/,
        a = i.match(r) ? i.match(r)[1] : null;
      if (s || a) {
        let l = window.localStorage.getItem('ytVideoList');
        bootbox.prompt({
          title: 'Add Title for Youtube video url',
          inputType: 'text',
          callback(c) {
            c
              ? l
                ? ((l = JSON.parse(l)),
                  l.some((f) => f.url === i)
                    ? bootbox.alert('Youtube video url is already saved.')
                    : (l.push({ title: c, url: i }),
                      (e.ytVideoList = l),
                      window.localStorage.setItem('ytVideoList', JSON.stringify(e.ytVideoList)),
                      bootbox.alert('Youtube video url is saved successfully.')))
                : ((e.ytVideoList = [{ title: c, url: i }]),
                  window.localStorage.setItem('ytVideoList', JSON.stringify(e.ytVideoList)),
                  bootbox.alert('Youtube video url is saved successfully.'))
              : bootbox.alert('Error. Title is empty.');
          }
        });
      }
    }
    clearYTURL() {
      this.youtubeURL = '';
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt));
      };
    }
    static {
      this.ɵcmp = ut({
        type: t,
        selectors: [['app-play-youtube-modal']],
        viewQuery: function (i, o) {
          if ((1 & i && Xt(cxe, 5), 2 & i)) {
            let s;
            yt((s = Ft())) && (o.closeModal = s.first);
          }
        },
        decls: 20,
        vars: 3,
        consts: [
          ['closeModal', ''],
          [
            'id',
            'play-youtube-modal',
            'tabIndex',
            '-1',
            'role',
            'dialog',
            'aria-labelledby',
            'play-youtube-modal',
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
          [1, 'input-group', 'mb-3'],
          [
            'type',
            'text',
            'placeholder',
            'Paste YouTube URL',
            'aria-label',
            'Paste YouTube URL',
            'aria-describedby',
            'basic-addonYT',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel'
          ],
          ['id', 'basic-addonClear', 1, 'input-group-text', 'btn'],
          ['id', 'basic-addonSave', 1, 'input-group-text', 'btn', 3, 'click'],
          ['id', 'basic-addonPlay', 1, 'input-group-text', 'btn', 3, 'click'],
          [1, 'text-left'],
          [1, 'modal-footer', 'text-center'],
          ['type', 'button', 'data-bs-dismiss', 'modal', 1, 'btn', 'btn-secondary'],
          ['id', 'basic-addonClear', 1, 'input-group-text', 'btn', 3, 'click'],
          [1, 'btn', 'btn-danger', 'btn-sm', 'remove-yt-url', 3, 'click'],
          [1, 'fas', 'fa-minus'],
          [1, 'yt-url', 3, 'click']
        ],
        template: function (i, o) {
          if (1 & i) {
            const s = Y();
            (d(0, 'div', 1)(1, 'div', 2)(2, 'div', 3)(3, 'div', 4)(4, 'h5'),
              v(5, 'Play YouTube For All'),
              u(),
              T(6, 'button', 5),
              u(),
              d(7, 'div', 6)(8, 'div', 7)(9, 'input', 8),
              Ve('ngModelChange', function (a) {
                return (D(s), He(o.youtubeURL, a) || (o.youtubeURL = a), E(a));
              }),
              u(),
              H(10, uxe, 2, 0, 'span', 9),
              d(11, 'span', 10),
              x('click', function () {
                return (D(s), E(o.saveYtUrl()));
              }),
              v(12, 'Save'),
              u(),
              d(13, 'span', 11),
              x('click', function () {
                return (D(s), E(o.playYtVideo()));
              }),
              v(14, 'Play For All'),
              u()(),
              H(15, pxe, 5, 0, 'div', 12),
              u(),
              d(16, 'div', 13)(17, 'button', 14, 0),
              v(19, ' Close '),
              u()()()()());
          }
          2 & i &&
            (m(9),
            je('ngModel', o.youtubeURL),
            m(),
            O(10, o.youtubeURL ? 10 : -1),
            m(5),
            O(15, o.ytVideoList.length > 0 ? 15 : -1));
        },
        dependencies: [ai, ti, Yn],
        styles: [
          '#play-youtube-modal[_ngcontent-%COMP%]   .modal-dialog[_ngcontent-%COMP%]{max-width:700px}#play-youtube-modal[_ngcontent-%COMP%]   button.close[_ngcontent-%COMP%]{color:#fff}.remove-yt-url[_ngcontent-%COMP%]{padding:1px 4px;margin-right:8px}.yt-url[_ngcontent-%COMP%]:hover{text-decoration:underline;cursor:pointer}'
        ]
      });
    }
  }
  return t;
})();
