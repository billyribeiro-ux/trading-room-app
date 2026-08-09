U0e = (() => {
  class t {
    constructor(e, i, o) {
      ((this.appService = e),
        (this.modalService = i),
        (this.httpClient = o),
        (this.giphySearchTerm = ''),
        (this.giphyResults = []),
        (this.carouselImages = [{ url: '', link: '', pendingUrl: '', uploading: !1 }]),
        (this.carouselInterval = 5),
        (this.carouselHeight = 90),
        (this.carouselInNote = !1),
        (this.isEditingCarousel = !1),
        (this.carouselDestroyFns = []),
        (this.fileBrowserImages = []),
        (this.fileBrowserLoading = !1),
        (this.fileBrowserTargetIndex = -1),
        (this.fileBrowserModalRef = null),
        (this.prevVersions = []),
        (this.showVersionHistory = !1),
        (this.maxVersions = 3),
        (this.editorDirtyContents = null),
        (this.editorDirty = !1),
        (this.isEditing = !1),
        (this.isSimplifiedEditor = this.appService.globals.sessData.simplifiedEditor
          ? 'forecolor'
          : 'color'),
        (this.config = {
          placeholder: 'Type your note here and press save',
          height: '100%',
          toolbar: [
            ['style', ['style']],
            ['view', ['fullscreen', 'codeview']],
            ['misc', ['undo', 'redo']],
            ['font', ['bold', 'italic', 'underline', 'clear']],
            ['fontname', ['fontname']],
            ['fontsize', ['fontsize']],
            ['color', [this.isSimplifiedEditor]],
            ['para', ['ul', 'ol', 'paragraph']],
            ['height', ['height']],
            ['table', ['table']],
            ['insert', ['link', 'picture', 'video', 'emoji']],
            ['customButtons', ['gifBtn', 'carouselBtn']]
          ],
          buttons: { gifBtn: this.gifButton(), carouselBtn: this.carouselButton() },
          popover: {
            image: [
              ['custom', ['imageAttributes']],
              ['image', ['resizeFull', 'resizeHalf', 'resizeQuarter', 'resizeNone']],
              ['float', ['floatLeft', 'floatRight', 'floatNone']],
              ['remove', ['removeMedia']]
            ]
          },
          codeviewIframeWhitelistSrcBase: [
            'docs.google.com',
            '.protradingroom.com',
            'protradingroom.com'
          ],
          codeviewFilter: !1,
          codeviewIframeFilter: !1
        }),
        (this.editorTimer = null),
        (this.sendingGif = !1));
    }
    ngOnInit() {
      this.loadVersionsFromStorage();
    }
    getVersionStorageKey() {
      return `note_versions_${this.tab._id}`;
    }
    loadVersionsFromStorage() {
      try {
        const e = localStorage.getItem(this.getVersionStorageKey());
        e && (this.prevVersions = JSON.parse(e));
      } catch (e) {
        (P('Error loading note versions: ' + e), (this.prevVersions = []));
      }
    }
    saveVersionsToStorage() {
      try {
        localStorage.setItem(this.getVersionStorageKey(), JSON.stringify(this.prevVersions));
      } catch (e) {
        P('Error saving note versions: ' + e);
      }
    }
    saveCurrentVersion() {
      const e = this.tab.noteContent;
      if (
        !e ||
        '' === e.trim() ||
        (this.prevVersions.length > 0 && this.prevVersions[0].content === e)
      )
        return;
      const i = { content: e, date: new Date().toLocaleString(), timestamp: Date.now() };
      (this.prevVersions.unshift(i),
        this.prevVersions.length > this.maxVersions &&
          (this.prevVersions = this.prevVersions.slice(0, this.maxVersions)),
        this.saveVersionsToStorage(),
        P('Saved note version. Total versions: ' + this.prevVersions.length));
    }
    revertToVersion(e) {
      bootbox.confirm(
        `Are you sure you want to revert to the version from ${e.date}? Your current content will be replaced.`,
        (i) => {
          i &&
            (this.saveCurrentVersion(),
            (this.tab.noteContent = e.content),
            (this.showVersionHistory = !1),
            this.isEditing && $('#summernoteEdit-' + this.tab._id).summernote('code', e.content),
            this.appService.sendServerAdminCommand('saveSessionNote', { tab: this.tab }),
            P('Reverted to version from: ' + e.date));
        }
      );
    }
    toggleVersionHistory() {
      this.showVersionHistory = !this.showVersionHistory;
    }
    getVersionPreview(e) {
      const i = e
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return i.length > 100 ? i.substring(0, 100) + '...' : i;
    }
    ngAfterViewInit() {
      this.appService.guiEventBus.subscribe('editNoteTab', (i) => {
        this.tab._id == i &&
          (P('Editing tabID:' + i + ', caught on tab:' + this.tab.name), this.editNote());
      });
      const e = Array.from(document.querySelectorAll('#notes .dropdown-toggle'));
      for (let i = 0; i < e.length; i++) {
        const o = e[i];
        (o.addEventListener('shown.bs.dropdown', () => {
          ($('.note-editor').addClass('note-dropdown-open'),
            $('.note-toolbar').addClass('note-dropdown-open'),
            $('.note-btn-group').addClass('note-dropdown-open'));
        }),
          o.addEventListener('hidden.bs.dropdown', () => {
            ($('.note-editor').removeClass('note-dropdown-open'),
              $('.note-toolbar').removeClass('note-dropdown-open'),
              $('.note-btn-group').removeClass('note-dropdown-open'));
          }));
      }
      this.isEditing || setTimeout(() => this.initCarousels(), 0);
    }
    ngOnDestroy() {
      this.carouselDestroyFns.forEach((e) => e());
    }
    startEditorTimer() {
      (P('startEditorTimer called on tab:' + this.tab.name),
        this.editorTimer ||
          (P('startEditorTimer starting...'),
          (this.editorTimer = setInterval(() => {
            (P('editr dirty:' + this.editorDirty),
              this.editorDirty &&
                ((this.editorDirty = !1),
                P('EditorTimer sending changes on tab:' + this.tab.name),
                (this.tab.noteContent = this.editorDirtyContents),
                this.appService.sendServerAdminCommand('saveSessionNote', { tab: this.tab })));
          }, 3e3))));
    }
    stopEditorTimer() {
      this.editorTimer &&
        (P('stopping editor timer on tab: ' + this.tab.name),
        clearInterval(this.editorTimer),
        (this.editorTimer = null));
    }
    editNote() {
      ((this.isEditing = !0),
        this.carouselDestroyFns.forEach((o) => o()),
        (this.carouselDestroyFns = []),
        (this.carouselInNote = (this.tab.noteContent || '').includes('data-ptr-carousel')));
      const e = document.getElementById('summernoteEdit-' + this.tab._id);
      e && (e.innerHTML = this.tab.noteContent || '');
      const i = this;
      $('#summernoteEdit-' + this.tab._id).summernote({
        ...this.config,
        callbacks: {
          onChange(o, s) {
            (console.log('onChange...tab:' + i.tab.name),
              (i.editorDirtyContents = o),
              (i.editorDirty = !0),
              i.startEditorTimer());
          },
          onImageUpload(o) {
            (console.log('onUpload...tab:' + i.tab.name), console.log('onUpload...files:' + o));
            const s = $(this);
            !(function B0e(t, n, e, i) {
              var o = new FormData();
              (o.append('image', t),
                o.append('name', t.name),
                $.ajax({
                  async: !0,
                  crossDomain: !0,
                  url: e,
                  method: 'POST',
                  datatype: 'json',
                  headers: { Authorization: 'Client-ID ' + i },
                  processData: !1,
                  contentType: !1,
                  data: o,
                  beforeSend: function (r) {
                    (P('Uploading... ' + t.name),
                      bootbox.alert(
                        `Uploading: ${t.name}... Please wait...<br><div style="text-align: center;"><i class="ml-2 fas fa-spinner fa-spin fa-3x"></i></div>`
                      ));
                  },
                  success: function (r) {
                    (P('image link:' + r.data.link),
                      n.summernote('insertImage', r.data.link, t.name),
                      setTimeout(() => {
                        bootbox.hideAll();
                      }, 100));
                  },
                  error: function (r) {
                    (console.error(r), bootbox.hideAll(), bootbox.alert('Upload Failed...'));
                  }
                }).done(function (r) {
                  console.log('done resp:', r);
                }));
            })(
              o[0],
              s,
              `${i.appService.globals.upload_server}/image/${i.appService.globals.sessionID}`,
              i.appService.globals.cdn_upload_key
            );
          }
        }
      });
    }
    doneNote() {
      ((this.isEditing = !1),
        this.stopEditorTimer(),
        this.saveCurrentVersion(),
        (this.tab.noteContent = $('#summernoteEdit-' + this.tab._id).summernote('code')),
        this.appService.sendServerAdminCommand('saveSessionNote', { tab: this.tab }),
        $('#summernoteEdit-' + this.tab._id).summernote('destroy'),
        setTimeout(() => this.initCarousels(), 50));
    }
    bringFocusToTab() {
      this.appService.sendServerAdminCommand('focusOnSessionNote', { id: this.tab._id });
    }
    setAsWelcomeTab(e) {
      e
        ? this.appService.globals.sessData.allRoomsWelcomeMatPW
          ? bootbox.prompt({
              title: 'Please enter the password to replace all the rooms Welcome Mats:',
              value: '',
              callback: (i) => {
                if (i) {
                  const o = i.trim();
                  o === this.appService.globals.sessData.allRoomsWelcomeMatPW
                    ? this.appService.sendServerAdminCommand('setWelcomeMatNoteTab', {
                        id: this.tab._id,
                        allRooms: e,
                        pw: o
                      })
                    : bootbox.alert('Wrong password!');
                }
              }
            })
          : bootbox.confirm(
              'Are you sure you want to replace all the rooms Welcome Mats with this note?',
              (i) => {
                i &&
                  this.appService.sendServerAdminCommand('setWelcomeMatNoteTab', {
                    id: this.tab._id,
                    allRooms: e,
                    pw: ''
                  });
              }
            )
        : bootbox.confirm('Are you sure you want to apply this note as Welcome Mat', (i) => {
            i &&
              this.appService.sendServerAdminCommand('setWelcomeMatNoteTab', {
                id: this.tab._id,
                allRooms: e
              });
          });
    }
    carouselButton() {
      let e = this;
      return (i) =>
        $.summernote.ui
          .button({
            contents: '<i class="fas fa-images"></i> Carousel',
            tooltip: 'Insert an image carousel',
            click: function () {
              e.openCarouselModal();
            }
          })
          .render();
    }
    openCarouselModal() {
      ((this.carouselImages = [{ url: '', link: '', pendingUrl: '', uploading: !1 }]),
        (this.carouselInterval = 5),
        (this.carouselHeight = 90),
        this.modalService
          .open(this.carouselModal, { ariaLabelledBy: 'carousel-modal-title', size: 'lg' })
          .result.then(
            () => {},
            () => {}
          ));
    }
    addCarouselImage() {
      (this.carouselImages.push({ url: '', link: '', pendingUrl: '', uploading: !1 }),
        setTimeout(() => {
          const e = document.querySelectorAll('.carousel-slide-row');
          e[e.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }));
    }
    removeCarouselImage(e) {
      window.bootbox.confirm({
        message: 'Delete this slide?',
        buttons: {
          confirm: { label: 'Delete', className: 'btn-danger' },
          cancel: { label: 'Cancel', className: 'btn-default' }
        },
        callback: (i) => {
          i && this.carouselImages.splice(e, 1);
        }
      });
    }
    confirmCarouselImageUrl(e) {
      const i = this.carouselImages[e];
      i.pendingUrl.trim() && (i.url = i.pendingUrl.trim());
    }
    onCarouselUrlPaste(e, i) {
      const o = e.clipboardData?.getData('text')?.trim();
      o &&
        /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|jfif|svg)(\?.*)?$/i.test(o) &&
        (e.preventDefault(),
        (this.carouselImages[i].pendingUrl = o),
        this.confirmCarouselImageUrl(i));
    }
    clearCarouselImage(e) {
      window.bootbox.confirm({
        message: 'Change this image?',
        buttons: {
          confirm: { label: 'Change', className: 'btn-warning' },
          cancel: { label: 'Cancel', className: 'btn-default' }
        },
        callback: (i) => {
          if (i) {
            const o = this.carouselImages[e];
            ((o.pendingUrl = o.url), (o.url = ''));
          }
        }
      });
    }
    uploadCarouselImage(e, i) {
      const o = e.target,
        s = o.files?.[0];
      if (!s) return;
      const r = this.carouselImages[i];
      r.uploading = !0;
      const a = new FormData();
      (a.append('image', s),
        a.append('name', s.name),
        $.ajax({
          async: !0,
          crossDomain: !0,
          url: `${this.appService.globals.upload_server}/image/${this.appService.globals.sessionID}`,
          method: 'POST',
          datatype: 'json',
          headers: { Authorization: 'Client-ID ' + this.appService.globals.cdn_upload_key },
          processData: !1,
          contentType: !1,
          data: a,
          success: (h) => {
            ((r.url = h.data.link), (r.uploading = !1));
          },
          error: (h) => {
            (console.error(h), (r.uploading = !1), window.bootbox.alert('Image upload failed.'));
          }
        }),
        (o.value = ''));
    }
    openFileBrowser(e) {
      ((this.fileBrowserTargetIndex = e),
        (this.fileBrowserImages = []),
        (this.fileBrowserLoading = !0),
        (this.fileBrowserModalRef = this.modalService.open(this.fileBrowserModal, {
          ariaLabelledBy: 'file-browser-modal-title',
          size: 'lg'
        })),
        this.httpClient
          .post(`${this.appService.globals.apiROOT}/sessions/v2/cmd`, {
            tok: this.appService.globals.sesionToken,
            sessionID: this.appService.globals.sessionID,
            cmd: 'getSessionFiles',
            uploadType: 'files'
          })
          .subscribe({
            next: (o) => {
              ((this.fileBrowserLoading = !1),
                o?.success &&
                  o.files &&
                  (this.fileBrowserImages = o.files.filter((s) =>
                    s.contentType?.includes('image/')
                  )));
            },
            error: () => {
              this.fileBrowserLoading = !1;
            }
          }));
    }
    selectFileForSlide(e) {
      (this.fileBrowserTargetIndex >= 0 &&
        ((this.carouselImages[this.fileBrowserTargetIndex].url = e.vidPath),
        (this.carouselImages[this.fileBrowserTargetIndex].pendingUrl = e.vidPath)),
        this.fileBrowserModalRef &&
          (this.fileBrowserModalRef.dismiss(), (this.fileBrowserModalRef = null)));
    }
    insertCarousel() {
      const e = this.generateCarouselHtml();
      e
        ? (this.modalService.dismissAll(),
          this.isEditingCarousel
            ? (this.replaceCarouselInEditor(e), (this.isEditingCarousel = !1))
            : ($('#summernoteEdit-' + this.tab._id).summernote('pasteHTML', e),
              (this.carouselInNote = !0)))
        : window.bootbox.alert('Please add at least one image URL.');
    }
    editCarousel() {
      const e = $('#summernoteEdit-' + this.tab._id).summernote('code'),
        s = new DOMParser().parseFromString(e, 'text/html').querySelector('[data-ptr-carousel]');
      if (!s) return;
      let r = 5,
        a = 90;
      try {
        const f = JSON.parse(s.getAttribute('data-ptr-carousel') || '{}');
        ((r = f.interval || 5), (a = f.height || 90));
      } catch {}
      const l = s.querySelector('.ptr-carousel-track'),
        h = (l ? Array.from(l.children) : [])
          .map((f) => {
            const F = f.querySelector('img')?.getAttribute('src') || '';
            return {
              url: F,
              link: ('A' === f.tagName && f.getAttribute('href')) || '',
              pendingUrl: F,
              uploading: !1
            };
          })
          .filter((f) => f.url.trim());
      (0 === h.length && h.push({ url: '', link: '', pendingUrl: '', uploading: !1 }),
        (this.carouselImages = h),
        (this.carouselInterval = r),
        (this.carouselHeight = a),
        (this.isEditingCarousel = !0),
        this.modalService
          .open(this.carouselModal, { ariaLabelledBy: 'carousel-modal-title', size: 'lg' })
          .result.then(
            () => {},
            () => {
              this.isEditingCarousel = !1;
            }
          ));
    }
    replaceCarouselInEditor(e) {
      const i = $('#summernoteEdit-' + this.tab._id).summernote('code'),
        s = new DOMParser().parseFromString(i, 'text/html'),
        r = s.querySelector('[data-ptr-carousel]');
      if (r) {
        const a = s.createElement('div');
        ((a.innerHTML = e), r.replaceWith(...Array.from(a.childNodes)));
      }
      $('#summernoteEdit-' + this.tab._id).summernote('code', s.body.innerHTML);
    }
    initCarousels() {
      const e = document.getElementById('summernoteEdit-' + this.tab._id);
      !e ||
        this.isEditing ||
        e.querySelectorAll('[data-ptr-carousel]').forEach((i) => {
          const o = i;
          o.dataset.ptrCarouselInit || ((o.dataset.ptrCarouselInit = '1'), this.setupCarousel(o));
        });
    }
    setupCarousel(e) {
      const o = 1e3 * (JSON.parse(e.getAttribute('data-ptr-carousel') || '{}').interval || 5),
        s = e.querySelector('.ptr-carousel-track');
      if (!s) return;
      const r = s.children.length;
      if (r <= 1) return;
      let a = 0,
        l = null;
      const c = (w) => {
          ((a = ((w % r) + r) % r),
            (s.style.transform = `translateX(-${a * (100 / r)}%)`),
            S.forEach((M, B) => {
              M.style.background = B === a ? '#fff' : 'rgba(255,255,255,0.45)';
            }));
        },
        h = () => {
          (l && clearInterval(l), (l = setInterval(() => c(a + 1), o)));
        },
        _ = (w, M, B) => {
          const W = document.createElement('button');
          return (
            (W.innerHTML = w),
            W.setAttribute(
              'style',
              'position:absolute;top:50%;transform:translateY(-50%);z-index:10;background:rgba(0,0,0,0.45);color:#fff;border:none;border-radius:50%;width:40px;height:40px;font-size:26px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:background 0.2s;' +
                M
            ),
            (W.onmouseenter = () => (W.style.background = 'rgba(0,0,0,0.75)')),
            (W.onmouseleave = () => (W.style.background = 'rgba(0,0,0,0.45)')),
            (W.onclick = (J) => {
              (J.preventDefault(), J.stopPropagation(), B(), h());
            }),
            e.appendChild(W),
            W
          );
        };
      (_('&#8249;', 'left:10px;', () => c(a - 1)), _('&#8250;', 'right:10px;', () => c(a + 1)));
      const F = document.createElement('div');
      F.setAttribute(
        'style',
        'position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:10;'
      );
      const S = [];
      for (let w = 0; w < r; w++) {
        const M = document.createElement('span');
        (M.setAttribute(
          'style',
          `width:8px;height:8px;border-radius:50%;cursor:pointer;transition:background 0.2s;background:${0 === w ? '#fff' : 'rgba(255,255,255,0.45)'};`
        ),
          (M.onclick = () => {
            (c(w), h());
          }),
          F.appendChild(M),
          S.push(M));
      }
      (e.appendChild(F),
        h(),
        this.carouselDestroyFns.push(() => {
          l && clearInterval(l);
        }));
    }
    generateCarouselHtml() {
      const e = this.carouselImages.filter((h) => h.url.trim());
      if (0 === e.length) return '';
      const i = this.carouselInterval || 5,
        o = this.carouselHeight || 90,
        s = e.length,
        r = (100 / s).toFixed(6),
        a = e
          .map((h) => {
            const _ = `<img src="${this.escapeAttr(h.url)}" style="width:100%;height:100%;object-fit:contain;display:block;">`,
              F = `width:${r}%;height:100%;flex-shrink:0;display:block;overflow:hidden;`;
            return h.link && h.link.trim()
              ? `<a href="${this.escapeAttr(h.link)}" target="_blank" style="${F}">${_}</a>`
              : `<div style="${F}">${_}</div>`;
          })
          .join(''),
        l = `display:flex;width:${100 * s}%;height:100%;transition:transform 0.5s ease;will-change:transform;`;
      return `<div data-ptr-carousel='${JSON.stringify({ interval: i, height: o })}' style="position:relative;width:100%;height:${o}%;overflow:hidden;background:#111;user-select:none;"><div class="ptr-carousel-track" style="${l}">${a}</div></div>`;
    }
    escapeAttr(e) {
      return e
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
    gifButton() {
      let e = this;
      return (i) =>
        $.summernote.ui
          .button({
            contents: 'GIFs',
            tooltip: 'Insert a gif',
            click: function () {
              e.opengifSerachModal();
            }
          })
          .render();
    }
    opengifSerachModal() {
      this.modalService
        .open(this.giphySearchPopOver, { ariaLabelledBy: 'modal-basic-title' })
        .result.then(
          (e) => {},
          (e) => {}
        );
    }
    searchGiphy() {
      const e = _1()({ https: !0, apiKey: this.appService.globals.giphy_api_key }),
        i = this.giphySearchTerm;
      (P('searchGiphy search: ' + i),
        e
          .search(i)
          .then((o) => {
            (console.log(o), (this.giphyResults = o.data));
          })
          .catch(console.error));
    }
    clearSearchGiphy() {
      (P('clearSearchGiphy...'), (this.giphySearchTerm = ''), (this.giphyResults = []));
    }
    sendGif(e, i) {
      this.sendingGif ||
        (this.modalService.dismissAll(),
        (this.sendingGif = !0),
        bootbox.confirm(
          `You sure you want to insert this image:<br/><img src='${i}' style='width: 100%;'>`,
          (o) => {
            ((this.sendingGif = !1),
              o && $('#summernoteEdit-' + this.tab._id).summernote('insertImage', i, e));
          }
        ));
    }
    static {
      this.ɵfac = function (i) {
        return new (i || t)(be(Nt), be(ZC), be(Ug));
      };
    }
    static {
      this.ɵcmp = dt({
        type: t,
        selectors: [['app-note']],
        viewQuery: function (i, o) {
          if ((1 & i && (Xt(m0e, 5), Xt(g0e, 5), Xt(_0e, 5)), 2 & i)) {
            let s;
            (yt((s = Ft())) && (o.giphySearchPopOver = s.first),
              yt((s = Ft())) && (o.carouselModal = s.first),
              yt((s = Ft())) && (o.fileBrowserModal = s.first));
          }
        },
        inputs: { tab: 'tab' },
        decls: 9,
        vars: 7,
        consts: [
          ['carouselModal', ''],
          ['fileBrowserModal', ''],
          ['giphySearchPopOver', ''],
          [1, 'note-view', 3, 'innerHTML', 'id'],
          [1, 'd-flex', 'justify-content-end', 'align-items-center', 'flex-wrap'],
          [1, 'btn', 'btn-light', 'text-center', 'm-1', 3, 'click'],
          [1, 'fas', 'fa-home'],
          [1, 'btn', 'btn-success', 'text-center', 'm-1', 3, 'click'],
          [1, 'fas', 'fa-eye'],
          [1, 'btn', 'btn-secondary', 'text-center', 'm-1'],
          [1, 'btn', 'btn-warning', 'text-center', 'm-1', 3, 'active'],
          [1, 'btn', 'btn-primary', 'text-center', 'm-1', 3, 'click'],
          [1, 'fas', 'fa-check'],
          [1, 'version-history-panel', 'card', 'mt-2', 'mb-2'],
          [1, 'btn', 'btn-secondary', 'text-center', 'm-1', 3, 'click'],
          [1, 'fas', 'fa-images'],
          [1, 'btn', 'btn-warning', 'text-center', 'm-1', 3, 'click'],
          [1, 'fas', 'fa-history'],
          [1, 'card-header'],
          ['type', 'button', 1, 'close', 'float-right', 3, 'click'],
          [1, 'list-group', 'list-group-flush'],
          [1, 'list-group-item', 'd-flex', 'justify-content-between', 'align-items-center'],
          [1, 'badge', 'bg-secondary', 'text-light'],
          [1, 'version-preview', 3, 'innerHTML'],
          [1, 'btn', 'btn-sm', 'btn-outline-primary', 3, 'click'],
          [1, 'fas', 'fa-undo'],
          [1, 'modal-header'],
          ['id', 'carousel-modal-title', 1, 'modal-title'],
          ['type', 'button', 'aria-label', 'Close', 1, 'close', 3, 'click'],
          ['aria-hidden', 'true'],
          [1, 'modal-body'],
          [1, 'form-row', 'mb-3'],
          [1, 'col-md-6'],
          [1, 'font-weight-bold'],
          [
            'type',
            'number',
            'min',
            '1',
            'max',
            '60',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [
            'type',
            'number',
            'min',
            '10',
            'max',
            '100',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [1, 'carousel-slides-list'],
          [1, 'carousel-slide-row', 'card', 'mb-2', 'p-2'],
          [1, 'btn', 'btn-outline-secondary', 'btn-sm', 'mt-1', 3, 'click'],
          [1, 'fas', 'fa-plus'],
          [1, 'modal-footer'],
          ['type', 'button', 1, 'btn', 'btn-outline-dark', 3, 'click'],
          ['type', 'button', 1, 'btn', 'btn-primary', 3, 'click'],
          [1, 'd-flex', 'align-items-center', 'mb-1'],
          [1, 'badge', 'badge-secondary', 'mr-2'],
          [1, 'btn', 'btn-sm', 'btn-outline-danger', 'ml-auto', 3, 'click', 'disabled'],
          [1, 'fas', 'fa-trash'],
          [1, 'text-center', 'py-2'],
          [1, 'form-group', 'mb-0'],
          [1, 'small'],
          [1, 'text-muted'],
          [
            'type',
            'url',
            'placeholder',
            'https://example.com',
            1,
            'form-control',
            'form-control-sm',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [1, 'fas', 'fa-spinner', 'fa-spin', 'fa-2x', 'text-primary'],
          [1, 'small', 'mt-1'],
          [1, 'form-group', 'mb-2'],
          [1, 'small', 'font-weight-bold'],
          [1, 'text-danger'],
          [1, 'd-flex', 'align-items-center', 'mb-2'],
          ['type', 'file', 'accept', 'image/*', 2, 'display', 'none', 3, 'change', 'id'],
          [1, 'btn', 'btn-sm', 'btn-outline-secondary', 'mb-0'],
          [1, 'fas', 'fa-upload'],
          ['type', 'button', 1, 'btn', 'btn-sm', 'btn-outline-info', 'mb-0', 'ml-1', 3, 'click'],
          [1, 'fas', 'fa-folder-open'],
          [1, 'text-muted', 'small', 'mx-2'],
          [1, 'input-group', 'input-group-sm'],
          [
            'type',
            'url',
            'placeholder',
            'https://example.com/image.jpg',
            1,
            'form-control',
            3,
            'ngModelChange',
            'keyup.enter',
            'paste',
            'ngModel'
          ],
          [1, 'input-group-append'],
          ['type', 'button', 1, 'btn', 'btn-outline-primary', 3, 'click', 'disabled'],
          [1, 'carousel-img-preview', 'mb-2'],
          [1, 'carousel-preview-img', 3, 'src'],
          ['type', 'button', 1, 'btn', 'btn-sm', 'btn-outline-secondary', 'mt-1', 3, 'click'],
          [1, 'fas', 'fa-times'],
          ['id', 'file-browser-modal-title', 1, 'modal-title'],
          [1, 'text-center', 'py-4'],
          [1, 'mt-2'],
          [1, 'text-center', 'py-4', 'text-muted'],
          [1, 'fas', 'fa-images', 'fa-2x', 'mb-2'],
          [1, 'file-browser-grid'],
          [1, 'file-browser-item', 3, 'title'],
          [1, 'file-browser-item', 3, 'click', 'title'],
          [1, 'file-browser-thumb', 3, 'src', 'alt'],
          [1, 'file-browser-name'],
          ['id', 'modal-basic-title', 1, 'modal-title'],
          [1, 'modal-body', 'modal-lg', 2, 'max-height', '77vh', 'overflow-y', 'auto'],
          [3, 'ngSubmit'],
          [1, 'form-group'],
          [1, 'input-group'],
          [
            'type',
            'text',
            'placeholder',
            'Search for a GIF',
            'name',
            'giphy',
            'aria-label',
            'Sizing example input',
            'aria-describedby',
            'inputGroup-sizing-sm',
            1,
            'form-control',
            3,
            'ngModelChange',
            'ngModel'
          ],
          [1, 'input-group-text', 'text-dark', 3, 'click'],
          [1, 'fa', 'fa-search'],
          [1, 'fa', 'fa-times'],
          [1, 'search-results'],
          [1, 'gif-result'],
          [3, 'dblclick', 'src']
        ],
        template: function (i, o) {
          (1 & i &&
            (H(0, T0e, 16, 3),
            T(1, 'div', 3),
            Je(2, 'noSanitize'),
            H(3, M0e, 30, 4, 'ng-template', null, 0, Rn)(5, O0e, 13, 1, 'ng-template', null, 1, Rn)(
              7,
              L0e,
              22,
              1,
              'ng-template',
              null,
              2,
              Rn
            )),
            2 & i &&
              (O(0, o.isEditing ? 0 : -1),
              m(),
              ei('id', 'summernoteEdit-', o.tab._id, ''),
              z('innerHTML', Ct(2, 4, o.tab.noteContent, 'html'), wn)));
        },
        dependencies: [qs, ai, Dd, ti, Ws, e_, zF, Yn, as, Rr],
        styles: [
          '[_nghost-%COMP%]{display:block;height:100%}.note-view[_ngcontent-%COMP%]{height:100%}.giphy-search[_ngcontent-%COMP%]{padding:5px;width:400px;height:700px;overflow-y:auto;border:2px solid #0a0a0a;background-color:#fff}.gif-result[_ngcontent-%COMP%]{text-align:center}.gif-result[_ngcontent-%COMP%]   img[_ngcontent-%COMP%]{cursor:pointer}.giphy-search[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]:hover{background-color:#ff0;border:2px solid var(--yellow)}.giphy-search[_ngcontent-%COMP%]   h6[_ngcontent-%COMP%]{color:#0a0a0a;text-align:center}img[_ngcontent-%COMP%]{max-width:100%}.carousel-slides-list[_ngcontent-%COMP%]{max-height:50vh;overflow-y:auto}.carousel-slide-row[_ngcontent-%COMP%]{border:1px solid #dee2e6;background-color:#fafafa}.carousel-img-preview[_ngcontent-%COMP%]{display:flex;flex-direction:column;align-items:flex-start}.carousel-img-preview[_ngcontent-%COMP%]   .carousel-preview-img[_ngcontent-%COMP%]{max-height:140px;max-width:100%;object-fit:contain;border:1px solid #dee2e6;border-radius:4px;background:#111}.file-browser-grid[_ngcontent-%COMP%]{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;max-height:60vh;overflow-y:auto}.file-browser-item[_ngcontent-%COMP%]{cursor:pointer;border:2px solid transparent;border-radius:6px;overflow:hidden;text-align:center;padding:4px;transition:border-color .15s,background .15s}.file-browser-item[_ngcontent-%COMP%]:hover{border-color:#0d6efd;background:#f0f6ff}.file-browser-thumb[_ngcontent-%COMP%]{width:100%;height:100px;object-fit:cover;border-radius:4px;display:block}.file-browser-name[_ngcontent-%COMP%]{font-size:.72rem;color:#555;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.version-history-panel[_ngcontent-%COMP%]{max-height:300px;overflow-y:auto;border:1px solid #ddd}.version-history-panel[_ngcontent-%COMP%]   .card-header[_ngcontent-%COMP%]{background-color:#f8f9fa;padding:.5rem 1rem}.version-history-panel[_ngcontent-%COMP%]   .version-preview[_ngcontent-%COMP%]{font-size:.85em;color:#666;max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.version-history-panel[_ngcontent-%COMP%]   .list-group-item[_ngcontent-%COMP%]{padding:.5rem 1rem}.version-history-panel[_ngcontent-%COMP%]   .list-group-item[_ngcontent-%COMP%]:hover{background-color:#f8f9fa}'
        ]
      });
    }
  }
  return t;
})();
