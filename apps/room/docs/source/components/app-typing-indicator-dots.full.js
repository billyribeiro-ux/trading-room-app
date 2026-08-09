l6 = (() => {
  class t {
    constructor() {}
    ngOnInit() {}
    static {
      this.ɵfac = function (i) {
        return new (i || t)();
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-typing-indicator-dots']],
        decls: 4,
        vars: 0,
        consts: [[1, 'typing-indicator']],
        template: function (i, o) {
          1 & i && (d(0, 'div', 0), T(1, 'span')(2, 'span')(3, 'span'), u());
        },
        styles: [
          '.typing-indicator[_ngcontent-%COMP%]{display:flex!important}.typing-indicator[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]{height:3px;width:3px;float:left;margin:0 1px;background-color:#9e9ea1;display:block;border-radius:50%;opacity:.4}.typing-indicator[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]:nth-of-type(1){animation:1.5s _ngcontent-%COMP%_blink infinite .3333s}.typing-indicator[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]:nth-of-type(2){animation:1.5s _ngcontent-%COMP%_blink infinite .6666s}.typing-indicator[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]:nth-of-type(3){animation:1.5s _ngcontent-%COMP%_blink infinite .9999s}@keyframes _ngcontent-%COMP%_blink{50%{opacity:1}}'
        ]
      });
    }
  }
  return t;
})();
