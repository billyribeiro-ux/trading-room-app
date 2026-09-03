function Vxe(t, n) {
  if (
    (1 & t &&
      (d(0, 'div', 11),
      T(1, 'hr'),
      d(2, 'h5', 14),
      v(3, ' To login to the app use the following credentials: '),
      u(),
      d(4, 'div', 11)(5, 'strong'),
      v(6, 'Email: '),
      u(),
      d(7, 'span'),
      v(8),
      u()(),
      d(9, 'div', 11)(10, 'strong'),
      v(11, 'Pin Code: '),
      u(),
      d(12, 'span'),
      v(13),
      u()()()),
    2 & t)
  ) {
    const e = g();
    (m(8), Ze(e.appService.globals.user.email), m(5), Ze(e.mobilePin));
  }
}
LB = (() => {
  class t {
    constructor(e) {
      ((this.appService = e),
        (this.androidLink =
          'https://play.google.com/store/apps/details?id=com.bellesoft.protradingroomv3'),
        (this.iosLink = 'https://apps.apple.com/us/app/pro-trading-room-v3/id1587924329'),
        (this.mobilePin = 'N/A'));
    }
    ngOnInit() {
      (this.appService.appEventBus.subscribe('getMyMobilePin', (e) => {
        this.mobilePin = e.pin;
      }),
        this.appService.globals.sessData.customMobileAppEnabled &&
          ((this.androidLink = this.appService.globals.sessData.customMobileAppAndroidUrl),
          (this.iosLink = this.appService.globals.sessData.customMobileAppIOSUrl)));
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt));
      };
    }
    static {
      this.ɵcmp = ut({
        type: t,
        selectors: [['app-mobile-app-info-modal']],
        decls: 17,
        vars: 3,
        consts: [
          [
            'id',
            'mobileAppInfoModal',
            'tabindex',
            '-1',
            'aria-labelledby',
            'mobileAppInfoLabel',
            'aria-hidden',
            'true',
            1,
            'modal',
            'fade'
          ],
          [1, 'modal-dialog'],
          [1, 'modal-content'],
          [1, 'modal-header'],
          ['id', 'mobileAppInfoLabel', 1, 'modal-title'],
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
          [1, 'd-flex', 'align-items-center', 'justify-content-evenly', 'm-3', 'mb-4'],
          ['target', '_blank', 'type', 'button', 3, 'href'],
          [
            'src',
            '/assets/images/google-play-badge.png',
            'alt',
            'Google Play Badge',
            1,
            'google-badge'
          ],
          ['src', '/assets/images/iosAppStore.svg', 'alt', 'App Store Badge'],
          [1, 'mt-2'],
          [1, 'modal-footer'],
          ['type', 'button', 'data-bs-dismiss', 'modal', 1, 'btn', 'btn-secondary'],
          [1, 'my-4']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 0)(1, 'div', 1)(2, 'div', 2)(3, 'div', 3)(4, 'h5', 4),
            v(5, ' Download our mobile apps '),
            u(),
            T(6, 'button', 5),
            u(),
            d(7, 'div', 6)(8, 'div', 7)(9, 'a', 8),
            T(10, 'img', 9),
            u(),
            d(11, 'a', 8),
            T(12, 'img', 10),
            u()(),
            H(13, Vxe, 14, 2, 'div', 11),
            u(),
            d(14, 'div', 12)(15, 'button', 13),
            v(16, ' Close '),
            u()()()()()),
            2 & i &&
              (m(9),
              xn('href', o.androidLink, Mt),
              m(2),
              xn('href', o.iosLink, Mt),
              m(2),
              O(13, o.appService.globals.sessData.hideMobileCredentials ? -1 : 13)));
        },
        styles: ['.google-badge[_ngcontent-%COMP%]{width:auto;height:100%;max-height:60px}']
      });
    }
  }
  return t;
})();
