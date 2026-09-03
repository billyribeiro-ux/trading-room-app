ETe = (() => {
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
        selectors: [['app-debug-log-modal']],
        decls: 14,
        vars: 0,
        consts: [
          [
            'id',
            'debug-log-modal',
            'tabIndex',
            '-1',
            'role',
            'dialog',
            'aria-labelledby',
            'user-details',
            'aria-hidden',
            'true',
            1,
            'modal',
            'fade'
          ],
          [
            'role',
            'document',
            1,
            'modal-dialog',
            'modal-lg',
            2,
            'overflow-y',
            'initial !important'
          ],
          [1, 'modal-content'],
          [1, 'modal-header'],
          [1, 'modal-title'],
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
          [1, 'modal-body', 2, 'max-height', '77vh', 'overflow-y', 'scroll'],
          [1, 'row'],
          [
            'id',
            'debugLogModalTxt',
            'rows',
            '1000',
            'readonly',
            'readonly',
            1,
            'form-control',
            2,
            'min-width',
            '100%'
          ],
          [1, 'modal-footer'],
          ['type', 'button', 'data-bs-dismiss', 'modal', 1, 'btn', 'btn-secondary']
        ],
        template: function (i, o) {
          1 & i &&
            (d(0, 'div', 0)(1, 'div', 1)(2, 'div', 2)(3, 'div', 3)(4, 'h3', 4),
            v(5, 'Debug Log'),
            u(),
            T(6, 'button', 5),
            u(),
            d(7, 'div', 6)(8, 'div', 7)(9, 'textarea', 8),
            v(10, '          '),
            u()()()(),
            d(11, 'div', 9)(12, 'button', 10),
            v(13, ' Close '),
            u()()()());
        }
      });
    }
  }
  return t;
})();
