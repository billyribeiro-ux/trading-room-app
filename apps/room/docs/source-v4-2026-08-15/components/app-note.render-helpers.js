const m0e = ['giphySearchPopOver'],
  g0e = ['carouselModal'],
  _0e = ['fileBrowserModal'],
  b0e = (t, n) => n.timestamp,
  v0e = (t, n) => n._id,
  y0e = (t, n) => n.title;
function F0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 14),
      x('click', function () {
        return (D(e), E(g(2).editCarousel()));
      }),
      T(1, 'i', 15),
      v(2, ' Edit Carousel '),
      u());
  }
}
function C0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'button', 16),
      x('click', function () {
        return (D(e), E(g(2).toggleVersionHistory()));
      }),
      T(1, 'i', 17),
      v(2),
      u());
  }
  if (2 & t) {
    const e = g(2);
    (Tt('active', e.showVersionHistory),
      m(2),
      Ne(' Version History (', e.prevVersions.length, ') '));
  }
}
function S0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 21)(1, 'div')(2, 'span', 22),
      v(3),
      u(),
      T(4, 'div', 23),
      Xe(5, 'noSanitize'),
      u(),
      d(6, 'button', 24),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(3).revertToVersion(o));
      }),
      T(7, 'i', 25),
      v(8, ' Revert '),
      u()());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = g(3);
    (m(3), Ze(e.date), m(), z('innerHTML', Ct(5, 2, i.getVersionPreview(e.content), 'html'), wn));
  }
}
function w0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 13)(1, 'div', 18)(2, 'strong'),
      T(3, 'i', 17),
      v(4, ' Previous Versions'),
      u(),
      d(5, 'button', 19),
      x('click', function () {
        return (D(e), E((g(2).showVersionHistory = !1)));
      }),
      d(6, 'span'),
      v(7, '\xd7'),
      u()()(),
      d(8, 'ul', 20),
      ht(9, S0e, 9, 5, 'li', 21, b0e),
      u()());
  }
  if (2 & t) {
    const e = g(2);
    (m(9), pt(e.prevVersions));
  }
}
function T0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 4)(1, 'button', 5),
      x('click', function () {
        return (D(e), E(g().setAsWelcomeTab(!1)));
      }),
      T(2, 'i', 6),
      v(3, ' Set as Welcome Mat '),
      u(),
      d(4, 'button', 5),
      x('click', function () {
        return (D(e), E(g().setAsWelcomeTab(!0)));
      }),
      T(5, 'i', 6),
      v(6, ' Apply as Welcome Mat to all rooms '),
      u(),
      d(7, 'button', 7),
      x('click', function () {
        return (D(e), E(g().bringFocusToTab()));
      }),
      T(8, 'i', 8),
      v(9, ' Bring Everyone here '),
      u(),
      H(10, F0e, 3, 0, 'button', 9)(11, C0e, 3, 3, 'button', 10),
      d(12, 'button', 11),
      x('click', function () {
        return (D(e), E(g().doneNote()));
      }),
      T(13, 'i', 12),
      v(14, ' Done '),
      u()(),
      H(15, w0e, 11, 0, 'div', 13));
  }
  if (2 & t) {
    const e = g();
    (m(10),
      O(10, e.carouselInNote ? 10 : -1),
      m(),
      O(11, e.prevVersions.length > 0 ? 11 : -1),
      m(4),
      O(15, e.showVersionHistory ? 15 : -1));
  }
}
function D0e(t, n) {
  1 & t && (d(0, 'div', 47), T(1, 'i', 52), d(2, 'div', 53), v(3, 'Uploading...'), u()());
}
function E0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 54)(1, 'label', 55),
      v(2, 'Image '),
      d(3, 'span', 56),
      v(4, '*'),
      u()(),
      d(5, 'div', 57)(6, 'input', 58),
      x('change', function (o) {
        D(e);
        const s = g().$index;
        return E(g(2).uploadCarouselImage(o, s));
      }),
      u(),
      d(7, 'label', 59),
      T(8, 'i', 60),
      v(9, ' Upload '),
      u(),
      d(10, 'button', 61),
      x('click', function () {
        D(e);
        const o = g().$index;
        return E(g(2).openFileBrowser(o));
      }),
      T(11, 'i', 62),
      v(12, ' Browse '),
      u(),
      d(13, 'span', 63),
      v(14, 'or paste a URL:'),
      u()(),
      d(15, 'div', 64)(16, 'input', 65),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g().$implicit;
        return (He(s.pendingUrl, o) || (s.pendingUrl = o), E(o));
      }),
      x('keyup.enter', function () {
        D(e);
        const o = g().$index;
        return E(g(2).confirmCarouselImageUrl(o));
      })('paste', function (o) {
        D(e);
        const s = g().$index;
        return E(g(2).onCarouselUrlPaste(o, s));
      }),
      u(),
      d(17, 'div', 66)(18, 'button', 67),
      x('click', function () {
        D(e);
        const o = g().$index;
        return E(g(2).confirmCarouselImageUrl(o));
      }),
      T(19, 'i', 12),
      u()()()());
  }
  if (2 & t) {
    const e = g(),
      i = e.$implicit,
      o = e.$index;
    (m(6),
      z('id', 'cfi_' + o),
      m(),
      Et('for', 'cfi_' + o),
      m(9),
      je('ngModel', i.pendingUrl),
      m(2),
      z('disabled', !i.pendingUrl.trim()));
  }
}
function k0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 68),
      T(1, 'img', 69),
      d(2, 'button', 70),
      x('click', function () {
        D(e);
        const o = g().$index;
        return E(g(2).clearCarouselImage(o));
      }),
      T(3, 'i', 71),
      v(4, ' Change image '),
      u()());
  }
  if (2 & t) {
    const e = g().$implicit;
    (m(), z('src', e.url, Mt));
  }
}
function x0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 37)(1, 'div', 43)(2, 'span', 44),
      v(3),
      u(),
      d(4, 'button', 45),
      x('click', function () {
        const o = D(e).$index;
        return E(g(2).removeCarouselImage(o));
      }),
      T(5, 'i', 46),
      u()(),
      H(6, D0e, 4, 0, 'div', 47)(7, E0e, 20, 4)(8, k0e, 5, 1),
      d(9, 'div', 48)(10, 'label', 49),
      v(11, 'Link URL '),
      d(12, 'span', 50),
      v(13, '(optional \u2014 clicking the image opens this)'),
      u()(),
      d(14, 'input', 51),
      Ve('ngModelChange', function (o) {
        const s = D(e).$implicit;
        return (He(s.link, o) || (s.link = o), E(o));
      }),
      u()()());
  }
  if (2 & t) {
    const e = n.$implicit,
      i = n.$index,
      o = g(2);
    (m(3),
      Ne('#', i + 1, ''),
      m(),
      z('disabled', 1 === o.carouselImages.length),
      m(2),
      O(6, e.uploading ? 6 : e.url ? 8 : 7),
      m(8),
      je('ngModel', e.link));
  }
}
function M0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 26)(1, 'h4', 27),
      T(2, 'i', 15),
      v(3),
      u(),
      d(4, 'button', 28),
      x('click', function () {
        return E(D(e).$implicit.dismiss());
      }),
      T(5, 'span', 29),
      u()(),
      d(6, 'div', 30)(7, 'div', 31)(8, 'div', 32)(9, 'label', 33),
      v(10, 'Rotation interval (seconds)'),
      u(),
      d(11, 'input', 34),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.carouselInterval, o) || (s.carouselInterval = o), E(o));
      }),
      u()(),
      d(12, 'div', 32)(13, 'label', 33),
      v(14, 'Height (%)'),
      u(),
      d(15, 'input', 35),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.carouselHeight, o) || (s.carouselHeight = o), E(o));
      }),
      u()()(),
      d(16, 'label', 33),
      v(17, 'Slides'),
      u(),
      d(18, 'div', 36),
      ht(19, x0e, 15, 4, 'div', 37, Li),
      u(),
      d(21, 'button', 38),
      x('click', function () {
        return (D(e), E(g().addCarouselImage()));
      }),
      T(22, 'i', 39),
      v(23, ' Add slide '),
      u()(),
      d(24, 'div', 40)(25, 'button', 41),
      x('click', function () {
        return E(D(e).$implicit.dismiss());
      }),
      v(26, ' Cancel '),
      u(),
      d(27, 'button', 42),
      x('click', function () {
        return (D(e), E(g().insertCarousel()));
      }),
      T(28, 'i', 12),
      v(29),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(3),
      Ne(' ', e.isEditingCarousel ? 'Edit' : 'Insert', ' Image Carousel '),
      m(8),
      je('ngModel', e.carouselInterval),
      m(4),
      je('ngModel', e.carouselHeight),
      m(4),
      pt(e.carouselImages),
      m(10),
      Ne(' ', e.isEditingCarousel ? 'Save Changes' : 'Insert Carousel', ' '));
  }
}
function A0e(t, n) {
  1 & t && (d(0, 'div', 73), T(1, 'i', 52), d(2, 'div', 74), v(3, 'Loading images...'), u()());
}
function P0e(t, n) {
  1 & t &&
    (d(0, 'div', 75),
    T(1, 'i', 76),
    d(2, 'div'),
    v(3, 'No images found. Upload images via Files first.'),
    u()());
}
function R0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 79),
      x('click', function () {
        const o = D(e).$implicit;
        return E(g(3).selectFileForSlide(o));
      }),
      T(1, 'img', 80),
      d(2, 'div', 81),
      v(3),
      u()());
  }
  if (2 & t) {
    const e = n.$implicit;
    (xn('title', e.name), m(), z('src', e.vidPath, Mt)('alt', e.name), m(2), Ze(e.name));
  }
}
function I0e(t, n) {
  if ((1 & t && (d(0, 'div', 77), ht(1, R0e, 4, 4, 'div', 78, v0e), u()), 2 & t)) {
    const e = g(2);
    (m(), pt(e.fileBrowserImages));
  }
}
function O0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 26)(1, 'h4', 72),
      T(2, 'i', 62),
      v(3, ' Select Image '),
      u(),
      d(4, 'button', 28),
      x('click', function () {
        return E(D(e).$implicit.dismiss());
      }),
      T(5, 'span', 29),
      u()(),
      d(6, 'div', 30),
      H(7, A0e, 4, 0, 'div', 73)(8, P0e, 4, 0)(9, I0e, 3, 0),
      u(),
      d(10, 'div', 40)(11, 'button', 41),
      x('click', function () {
        return E(D(e).$implicit.dismiss());
      }),
      v(12, ' Cancel '),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(7), O(7, e.fileBrowserLoading ? 7 : 0 === e.fileBrowserImages.length ? 8 : 9));
  }
}
function N0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'li', 92)(1, 'img', 93),
      x('dblclick', function () {
        const o = D(e).$implicit;
        return E(g(2).sendGif(o.title, o.images.original.url));
      }),
      u()());
  }
  if (2 & t) {
    const e = n.$implicit;
    (m(), xn('src', e.images.downsized_large.url, Mt));
  }
}
function L0e(t, n) {
  if (1 & t) {
    const e = Y();
    (d(0, 'div', 26)(1, 'h4', 82),
      v(2, 'Giphy Search'),
      u(),
      d(3, 'button', 28),
      x('click', function () {
        return E(D(e).$implicit.dismiss('Cross click'));
      }),
      T(4, 'span', 29),
      u()(),
      d(5, 'div', 83)(6, 'h6'),
      v(7, '*Double click an image to insert it'),
      u(),
      d(8, 'form', 84),
      x('ngSubmit', function () {
        return (D(e), E(g().searchGiphy()));
      }),
      d(9, 'div', 85)(10, 'div', 86)(11, 'input', 87),
      Ve('ngModelChange', function (o) {
        D(e);
        const s = g();
        return (He(s.giphySearchTerm, o) || (s.giphySearchTerm = o), E(o));
      }),
      u(),
      d(12, 'span', 88),
      x('click', function () {
        return (D(e), E(g().searchGiphy()));
      }),
      T(13, 'i', 89),
      u(),
      d(14, 'span', 88),
      x('click', function () {
        return (D(e), E(g().clearSearchGiphy()));
      }),
      T(15, 'i', 90),
      u()()()(),
      d(16, 'ul', 91),
      ht(17, N0e, 2, 1, 'li', 92, y0e),
      u()(),
      d(19, 'div', 40)(20, 'button', 41),
      x('click', function () {
        return E(D(e).$implicit.close('Save click'));
      }),
      v(21, ' Close '),
      u()());
  }
  if (2 & t) {
    const e = g();
    (m(11), je('ngModel', e.giphySearchTerm), m(6), pt(e.giphyResults));
  }
}
