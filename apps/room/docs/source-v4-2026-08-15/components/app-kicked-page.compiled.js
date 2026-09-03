sRe = (() => {
  class t {
    constructor() {
      this.msg = 'kicked';
    }
    ngOnInit() {}
    static {
      this.ɵfac = function (i) {
        return new (i || t)();
      };
    }
    static {
      this.ɵcmp = ut({
        type: t,
        selectors: [['app-kicked-page']],
        inputs: { msg: 'msg' },
        decls: 4,
        vars: 1,
        consts: [
          [1, 'container', 'h-100'],
          [1, 'd-flex', 'd-flex-column', 'h-100', 'w-100'],
          [1, 'align-self-center', 'w-100']
        ],
        template: function (i, o) {
          (1 & i && (d(0, 'div', 0)(1, 'div', 1)(2, 'h2', 2), v(3), u()()()),
            2 & i && (m(3), Ze(o.msg)));
        },
        styles: ['h2[_ngcontent-%COMP%]{color:#000;vertical-align:middle;text-align:center}']
      });
    }
  }
  return t;
})();
