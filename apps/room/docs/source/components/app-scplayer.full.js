function Z0e(t, n) {
  if ((1 & t && (d(0, 'div', 0), T(1, 'iframe', 1), u()), 2 & t)) {
    const e = g();
    (m(), z('src', e.url, Oa));
  }
}
ebe = (() => {
  class t {
    constructor(e) {
      this.sanitizer = e;
    }
    ngOnInit() {
      ((this.url = this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://w.soundcloud.com/player/?url=${this.scUrl}&amp;auto_play=true`
      )),
        console.log('soundcloud scUrl', this.url));
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(sa));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-scplayer']],
        inputs: { scUrl: 'scUrl' },
        decls: 1,
        vars: 1,
        consts: [
          [
            'id',
            'soundCloudDiv',
            2,
            'visibility',
            'hidden',
            'position',
            'absolute',
            'bottom',
            'calc(-100vh + 100px)',
            'right',
            '10px'
          ],
          [
            'id',
            'soundCloudIFrame',
            'width',
            '100%',
            'height',
            '150',
            'scrolling',
            'no',
            'frameborder',
            'no',
            'allow',
            'autoplay; encrypted-media',
            3,
            'src'
          ]
        ],
        template: function (i, o) {
          (1 & i && H(0, Z0e, 2, 1, 'div', 0), 2 & i && O(0, o.url ? 0 : -1));
        }
      });
    }
  }
  return t;
})();
