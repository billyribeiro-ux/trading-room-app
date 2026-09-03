lxe = (() => {
  class t {
    constructor(e, i) {
      ((this.mediaService = e), (this.appService = i));
    }
    ngOnInit() {}
    ngAfterViewInit() {}
    setNewDevices() {
      const e = $('#audio-deviceList').val(),
        i = $('#video-deviceList').val();
      (console.log('soundID: ' + e),
        console.log('videoI: ' + i),
        this.appService.globals.audioDeviceID !== e &&
          this.appService.localstorage.set('audioDeviceID', e),
        this.appService.globals.videoDeviceID !== i &&
          this.appService.localstorage.set('videoDeviceID', i));
    }
    loadDevices() {
      var e = this;
      try {
        I(function* () {
          if (e.appService.globals.chatOnlyMode)
            return void P('av settings ListDevices chatOnlyMode. returning...');
          let i = yield navigator.mediaDevices.getUserMedia({ audio: !0, video: !0 });
          (navigator.mediaDevices.enumerateDevices().then((o) => {
            P('av settings ListDevices devices:', JSON.stringify(o));
            const s = e.appService.globals.audioDeviceID,
              r = e.appService.globals.videoDeviceID;
            ($('#audio-deviceList, #video-deviceList').find('option').remove(),
              o.forEach((a) => {
                let l = a.label;
                (null == l || '' === l) && (l = a.deviceId);
                const c = $('<option value="' + a.deviceId + '">' + l + '</option>');
                'audioinput' == a.kind
                  ? $('#audio-deviceList').append(c)
                  : 'videoinput' == a.kind &&
                    (console.error('((((((( adding video :' + l), $('#video-deviceList').append(c));
              }),
              $('#audio-deviceList').val(s),
              $('#video-deviceList').val(r));
          }),
            i.getTracks().forEach(function (o) {
              o.stop();
            }));
        })();
      } catch (i) {
        P('Error:', i);
      }
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(ma), be(Nt));
      };
    }
    static {
      this.ɵcmp = ut({
        type: t,
        selectors: [['app-av-settings-modal']],
        decls: 53,
        vars: 2,
        consts: [
          [
            'id',
            'av-settings-modal',
            'tabIndex',
            '-1',
            'role',
            'dialog',
            'aria-labelledby',
            'av-settings-modal',
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
          ['id', 'userSettingsTab', 'role', 'tablist', 1, 'nav', 'nav-tabs'],
          [1, 'nav-item'],
          [
            'id',
            'user-audio-video-settings-tab',
            'data-bs-toggle',
            'tab',
            'href',
            '#user-audio-video-settings',
            'role',
            'tab',
            'aria-controls',
            'user-audio-video-settings',
            'aria-selected',
            'true',
            1,
            'nav-link',
            'active'
          ],
          ['id', 'userSettingsTabContent', 1, 'tab-content'],
          [
            'id',
            'user-audio-video-settings',
            'role',
            'tabpanel',
            'aria-labelledby',
            'user-audio-video-settings-tab',
            1,
            'tab-pane',
            'fade',
            'show',
            'active'
          ],
          [1, 'navbar', 'w-100', 'h-100'],
          [1, 'navbar-nav', 'small', 'w-100', 'h-100'],
          ['title', 'Disable Video', 1, 'nav-link', 3, 'click'],
          [1, 'fas', 'fa-desktop'],
          [1, 'pl-2'],
          ['title', 'Choose Speakers', 1, 'nav-link'],
          [1, 'form-group', 'd-flex', 'justify-content-between', 'align-items-end'],
          [1, 'w-75', 'mr-2'],
          ['for', 'speakers-device'],
          ['id', 'speakers-device', 1, 'form-control'],
          [1, 'w-25'],
          ['type', 'button', 1, 'btn', 'btn-outline-light'],
          [1, 'fas', 'fa-volume-up', 'mr-2'],
          [
            'id',
            'presenter-audio-video-settings',
            'role',
            'tabpanel',
            'aria-labelledby',
            'presenter-audio-video-settings-tab',
            1,
            'tab-pane',
            'fade'
          ],
          [1, 'form-group'],
          ['for', 'audio-deviceList'],
          ['id', 'audio-deviceList', 'aria-label', 'Audio device (input)', 1, 'form-select'],
          ['for', 'video-deviceList'],
          ['id', 'video-deviceList', 'aria-label', 'Video device (input)', 1, 'form-select'],
          ['type', 'button', 1, 'btn', 'btn-primary', 3, 'click'],
          [1, 'modal-footer', 'text-center'],
          ['type', 'submit', 1, 'btn', 'btn-success'],
          ['type', 'button', 'data-bs-dismiss', 'modal', 1, 'btn', 'btn-secondary'],
          [
            'id',
            'presenter-audio-video-settings-tab',
            'data-bs-toggle',
            'tab',
            'href',
            '#presenter-audio-video-settings',
            'role',
            'tab',
            'aria-controls',
            'presenter-audio-video-settings',
            'aria-selected',
            'false',
            1,
            'nav-link'
          ],
          [1, 'saves-bandwidth']
        ],
        template: function (i, o) {
          (1 & i &&
            (d(0, 'div', 0)(1, 'div', 1)(2, 'div', 2)(3, 'div', 3)(4, 'h5'),
            v(5, 'Audio/Video Settings'),
            u(),
            T(6, 'button', 4),
            u(),
            d(7, 'div', 5)(8, 'ul', 6)(9, 'li', 7)(10, 'a', 8),
            v(11, 'User Settings'),
            u()(),
            H(12, sxe, 3, 0, 'li', 7),
            u(),
            d(13, 'div', 9)(14, 'div', 10)(15, 'nav', 11)(16, 'ul', 12)(17, 'li', 7)(18, 'a', 13),
            x('click', function () {
              return o.mediaService.toggleDisableVideo();
            }),
            T(19, 'i', 14),
            H(20, rxe, 4, 0, 'span', 15)(21, axe, 2, 0),
            u()(),
            d(22, 'li', 7)(23, 'a', 16)(24, 'div', 17)(25, 'div', 18)(26, 'label', 19),
            v(27, 'Speakers:'),
            u(),
            d(28, 'select', 20)(29, 'option'),
            v(30, 'Default - External Headphones'),
            u(),
            d(31, 'option'),
            v(32, 'Default - External Headphones 2'),
            u()()(),
            d(33, 'div', 21)(34, 'button', 22),
            T(35, 'i', 23),
            v(36, 'Test '),
            u()()()()()()()(),
            d(37, 'div', 24)(38, 'div', 25)(39, 'label', 26),
            v(40, 'Audio device (input):'),
            u(),
            T(41, 'select', 27),
            u(),
            d(42, 'div', 25)(43, 'label', 28),
            v(44, 'Video device (input):'),
            u(),
            T(45, 'select', 29),
            u(),
            d(46, 'button', 30),
            x('click', function () {
              return o.setNewDevices();
            }),
            v(47, ' Change Devices '),
            u()()()(),
            d(48, 'div', 31)(49, 'button', 32),
            v(50, 'Save'),
            u(),
            d(51, 'button', 33),
            v(52, ' Close '),
            u()()()()()),
            2 & i &&
              (m(12),
              O(
                12,
                o.appService.globals.isPresenter && !o.appService.globals.isLimitedPresenter
                  ? 12
                  : -1
              ),
              m(8),
              O(20, o.mediaService.saveData ? 21 : 20)));
        },
        dependencies: [Vl, Hl],
        styles: [
          '#av-settings-modal[_ngcontent-%COMP%]   video[_ngcontent-%COMP%]{max-width:100%;max-height:66.5px}#av-settings-modal[_ngcontent-%COMP%]   .video-container[_ngcontent-%COMP%]{margin-bottom:-8px}'
        ]
      });
    }
  }
  return t;
})();
