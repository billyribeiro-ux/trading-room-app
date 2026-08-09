function X0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 4),
      x('click', function () {
        return (D(e), E(g().stopYTForAll()));
      }),
      v(1, ' Stop For All'),
      u());
  }
}
J0e = (() => {
  class t {
    get ytURL() {
      return this._ytURL;
    }
    set ytURL(e) {
      ((this._ytURL = e),
        e &&
          (console.log('ytplayer playYTForAll startTime:' + this.startTime),
          this.playYTURL(e, this.startTime)));
    }
    constructor(e, i) {
      ((this.appService = e), (this.sanitizer = i), (this.startTime = 0), (this._ytURL = ''));
    }
    ngOnInit() {}
    stopYTForAll() {
      this.appService.sendServerAdminCommand('stopYTForAll');
    }
    closeYTFrame() {
      this.appService.guiEventBus.emit('stopYTForAll');
    }
    playYTURL(e, i = 0) {
      if ((console.log('ytplayer comp url:' + e + '. startTime:' + i), e)) {
        const o = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/,
          s = e.match(o) ? e.match(o)[2] : null,
          r = /[?&]list=([^#\&\?]+)/,
          a = e.match(r) ? e.match(r)[1] : null,
          l = this.appService.globals.preferences.doNotDisturbOn ? '&mute=1' : '';
        this.videoURL = this.sanitizer.bypassSecurityTrustResourceUrl(
          s
            ? `https://www.youtube.com/embed/${s}?autoplay=1${l}&` + (i ? `start=${i}` : '')
            : a
              ? `https://www.youtube.com/embed/videoseries?list=${a}&autoplay=1${l}&loop=1&rel=0` +
                (i ? `start=${i}` : '')
              : ''
        );
      }
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(sa));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-ytplayer']],
        inputs: { startTime: 'startTime', ytURL: 'ytURL' },
        decls: 5,
        vars: 2,
        consts: [
          [1, 'posted-video-container'],
          [
            1,
            'btn',
            'btn-primary',
            'btn-sm',
            'yt-btn',
            2,
            'position',
            'absolute',
            'top',
            '-32px',
            'right',
            '30px'
          ],
          [
            1,
            'btn',
            'btn-danger',
            'btn-sm',
            'yt-btn',
            2,
            'position',
            'absolute',
            'top',
            '-32px',
            'right',
            '0',
            3,
            'click'
          ],
          [
            'width',
            '640',
            'height',
            '320',
            'allow',
            'autoplay; encrypted-media',
            'frameborder',
            '0',
            'allowfullscreen',
            '',
            1,
            'e2e-iframe-trusted-src',
            3,
            'src'
          ],
          [
            1,
            'btn',
            'btn-primary',
            'btn-sm',
            'yt-btn',
            2,
            'position',
            'absolute',
            'top',
            '-32px',
            'right',
            '30px',
            3,
            'click'
          ]
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 0),
            H(1, X0e, 2, 0, 'button', 1),
            d(2, 'button', 2),
            x('click', function () {
              return o.closeYTFrame();
            }),
            v(3, ' \xd7 '),
            u(),
            T(4, 'iframe', 3),
            u()),
            2 & i &&
              (m(),
              O(1, o.appService.globals.isPresenter ? 1 : -1),
              m(3),
              z('src', o.videoURL, Oa)));
        }
      });
    }
  }
  return t;
})();
