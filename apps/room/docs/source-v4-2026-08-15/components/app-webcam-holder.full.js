oDe = (() => {
  class t {
    constructor() {}
    ngOnInit() {}
    static {
      this.ɵfac = function (i) {
        return new (i || t)();
      };
    }
    static {
      this.ɵcmp = ut({
        type: t,
        selectors: [['app-webcam-holder']],
        decls: 3,
        vars: 0,
        consts: [
          [
            1,
            'webcam-wrapper',
            'd-flex',
            'justify-content-center',
            'flex-wrap',
            'align-items-end',
            'w-100'
          ]
        ],
        template: function (i, o) {
          1 & i && (d(0, 'div', 0), T(1, 'app-presenter-cams')(2, 'app-presenter-cams'), u());
        },
        dependencies: [sL],
        styles: ['.webcam-wrapper[_ngcontent-%COMP%]{position:absolute;bottom:0}']
      });
    }
  }
  return t;
})();
