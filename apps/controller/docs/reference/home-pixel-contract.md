# Home-page fidelity contract

Status: **superseded, 2026-08-09** — `/` is now the original cinematic surface decided in
[`docs/decisions/0005-cinematic-home.md`](../decisions/0005-cinematic-home.md) and enforced by
`pnpm home:contract` (`scripts/verify-home-contract.mjs`). This document is kept as the historical
record of the reconstruction era; nothing below is normative for the current page.

Status at capture time: normative for `/`  
Captured: 2026-08-01  
Rendered source: `evidence-dumps/home-page/file`

This contract separates facts proved by the original files from facts that
would require a full-page raster comparison. It is enforced by
`pnpm home:fidelity`.

## Evidence inventory

| Evidence | Original URL or file | SHA-256 |
|---|---|---|
| Rendered HTML | `evidence-dumps/home-page/file` | `935562f231a499feff797afe59672f8bdc4b223d61d652c6f102b6deafd594ab` |
| Bootstrap 3.1.1 | `https://protradingroom.com/public/css/bootstrap/bootstrap.min.css` | `e9503448692b738dd260fbd7f7cabf2e11f09b600fa97e6eb3a56eba5b1a7e9b` |
| Public theme | `https://protradingroom.com/public/css/compiled/theme.css` | `497733a044053a64d2ff340192b9542306269bde38a55db30308791ee26470ab` |
| Page CSS | `https://protradingroom.com/public/css/main.css?v1.0` | `a27b150001e49d3cb6b82f954c21c693c1e74e87d4fee6e7bcc4d87cfde10c42` |
| Animation CSS | `https://protradingroom.com/public/css/vendor/animate.css` | `0cb9156494d7c7c70ee5d710c0452b3fd3c1e774ecb5d042385aa5972e869bfa` |
| Font Awesome CSS | `https://netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css` | `3083e8d3b21ddc3f0e6d65ec3580aa6edfaadca5d9737d9caa27e6a233e1ccf3` |
| Hero Roboto, Latin normal 300 | `https://fonts.gstatic.com/s/roboto/v51/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3yUBHMdazQ.woff2` | `0a44e0bb6ba5c8537e8814c148ef7755f1bce12112361231f595ecc584a18d7a` |

`main.css` contains controller/chat rules and no home-page selector. It remains
part of the cascade inventory but contributes no visible home declaration.

The exact Roboto binary is self-hosted at
`static/fonts/roboto/roboto-v51-latin-300.woff2`; its ownership, license,
byte-length contract, preload boundary, and replacement procedure are normative
in `docs/reference/font-contract.md`.

The shared application loads Font Awesome 4.3 for the controller. The home page
uses only `fa-check-circle` (`f058`) and `fa-envelope` (`f0e0`). Their SVG path
data, default/explicit advance widths, units-per-em, ascent and descent are
identical between the captured 4.0.3 font and the installed 4.3 font. Public CSS
also removes 4.3's added `translate(0, 0)` declaration. This is glyph-level
equivalence evidence rather than a version assumption.

## Exact image binaries

The repository copies were compared with fresh responses from the original URLs.
Each pair had the same size and SHA-256 digest.

| Asset | Repository SHA-256 |
|---|---|
| `protradingroom_icon.png` | `f9c8e4a59a690bfb8818819ab0cfef00d0800044ee028d99faf535c3253148a5` |
| `ptr_descrived_perspective.png` | `4419e8ded4a3e4e19a15809fb9c577044629c9345b75843b81b56f49207e699c` |
| `user_comments.png` | `b133877779a920e6e6d36749284dbd1548cf5a2a1fbc59330825a8155445a4ba` |
| `ss3.png` | `bf4fd92aaa5865cd6824852b946a04c2e00b026f28b9b45d032a904e077d8752` |
| `locked.png` | `beab5323195e7c7d351298464c8f0af4484f881039924487d0ed2f5775458b82` |
| `cloud.png` | `5a387d3acfc0b59e024e995d1a677a23833802f263c42fab2bc85ba768b18eff` |
| `browser.png` | `16f5d6e2d032d66b4c5c5a4c720f6d9b5577c09996188fd99809753544478dec` |

### User-supplied hero verification

The hero file supplied on 2026-08-01 was compared against both the repository
asset and the response body from the running development server at
`/public/images/ptr_descrived_perspective.png`.

| Measurement | Supplied file | Repository asset | Live HTTP response |
|---|---:|---:|---:|
| SHA-256 | `4419e8ded4a3e4e19a15809fb9c577044629c9345b75843b81b56f49207e699c` | same | same |
| Byte length | `712178` | `712178` | `712178` |
| PNG dimensions | `1440x956` | `1440x956` | `1440x956` |
| PNG format | 8-bit RGBA, non-interlaced | same | same |

Both binary `cmp` operations returned success. This proves that the supplied
file is already the file in the repository and that the running server returns
those exact bytes; replacing it would be a no-op. The fidelity script parses
the PNG `IHDR` and locks its byte length, dimensions, bit depth, RGBA color type,
interlace method and SHA-256. To repeat the direct external-file comparison:

```sh
pnpm home:fidelity -- /absolute/path/to/ptr_descrived_perspective.png
```

### Hero device-width matrix

There is one `<img>` source on every viewport: no `<picture>`, `srcset`, `sizes`,
CSS image replacement or image service can substitute another binary. The
original breakpoint behavior is preserved exactly:

| CSS viewport width | Original branch and resulting hero contract |
|---|---|
| `0-767px` | Base block grid; image shrinks to the fluid column; `550px` clipped hero; `27px` heading |
| `768-991px` | Base block grid; image shrinks to the fluid column; `550px` clipped hero; `30px` heading |
| `992-1199px` | `col-md-8/4` activates as `66.66666667%/33.33333333%`; image shrinks to the 8-column content box; `583px` clipped hero; `36px` heading |
| `>=1200px` | Same fluid hero and `col-md` geometry; the image never exceeds its intrinsic `1440px` width |

The supplied markup's inline `height:95%` is retained verbatim. The hero-specific
`max-width:100%` constraint makes the 1440px PNG shrink proportionally when its
Bootstrap column is narrower, without `width:100%` upscaling it on larger
viewports. This is a continuous constraint across all viewport widths, not a
list of device-name assumptions. Below `992px`, its width ceiling is
`min(1440px, 100vw - 30px)`; from `992px`, it is
`min(1440px, 66.66666667vw - 30px)`. The executable contract checks both sides
of every relevant boundary and representative widths through `2205px`, where
the source reaches its intrinsic-width ceiling.

A second, separate rule block on the same element declares
`width: min(100%, 1440px)` and `aspect-ratio: 1440 / 956`. This introduces no new
sizing policy: `min(100%, 1440px)` is the ceiling above restated as CSS, and it
is the same expression `scripts/verify-home-fidelity.mjs` and
`e2e/responsive-contract.spec.ts` independently compute as
`Math.min(1440, columnContentWidth)`. The used width is therefore identical at
every audited viewport. What changes is that the width is *definite before the
712,178-byte PNG decodes*, so `aspect-ratio` can reserve the height. Measured in
Chromium with the image response held: the hero box was `0px` wide before this
rule and is `930px` at a `1440px` viewport with it, and the page's cumulative
layout shift fell from `0.0039` to `0`.

The declarations live in their own block because the `hero image continuous
downscaling` assertion pins the original rule *including its closing brace*, so
nothing may be added inside it. Both blocks target the same selector; the
original remains byte-for-byte intact.

## Cascade facts implemented verbatim

- The public shell carries the original `home4` identity.
- SvelteKit's `paths.relative` is explicitly `false`. The captured site is
  hosted at the domain root, so SSR retains original root-relative URLs such as
  `/contact` instead of rewriting them to `./contact`.
- Bootstrap uses its float grid at `768 / 992 / 1200`; the later theme resets
  the `>=1200` container from `1170px` to `970px`.
- `.navbar.normal` is `70px` minimum height, black, shadowed, and retains
  Bootstrap's `20px` bottom margin. The hero is relatively shifted `-60px`.
- The hero is `583px` tall on desktop and `550px` at `max-width:991px`.
- The hero image retains the supplied inline `height:95%` and receives only a
  hero-scoped `max-width:100%` constraint so it can shrink without upscaling.
  A sibling rule adds `width: min(100%, 1440px)` and `aspect-ratio: 1440 / 956`,
  which restate that same ceiling in a form the layout can honor before decode.
  `height:95%` still resolves against an auto-height column, so it computes to
  `auto` and the ratio governs the height exactly as the intrinsic size did.
- `.button` uses the original blue gradient, `13px 32px` padding, `17px` type,
  shadow and radius. `.button-small` uses `10px 33px`. `button-large` and
  `button-primary` have no declaration in the source and therefore add nothing.
- Feature icons are capped at `40px`; the section begins at `85px` margin on
  desktop and `50px` below `992px`. All three icons are hash-locked at `128x128`,
  so they always meet that cap and always render square. The rule therefore also
  declares `width: 40px` and `aspect-ratio: 1 / 1` — the size they already
  resolve to — so each icon reserves its box instead of snapping from `0x0` on
  load and shifting the three headings beneath it.
- The mobile section, CTA card, and footer use the source backgrounds, borders,
  inset shadows, margins, and padding. In particular, the footer starts after a
  `120px` top margin and uses inline-block links—not a reconstructed flex row.
- The first feature heading inherits left alignment on desktop. Only the second
  and third headings carry the original inline centered alignment.

## Deliberate nonvisual corrections

- The Register/Login trigger is a native button with `aria-expanded` rather than
  an `href="#"` anchor. CSS gives it the same box and typography as the source.
- Keyboard focus remains visibly indicated instead of reproducing the theme's
  global `*:focus { outline:0 }` accessibility defect.
- Images retain intrinsic `width`/`height` metadata only where the attributes do
  not alter captured sizing. The hero and three feature icons deliberately match
  the supplied blocks without dimensions; all images retain accessible `alt`
  attributes. `verify-home-fidelity.mjs` enforces this markup rule: the hero
  `<img>` is pinned as an exact string and `FeatureGrid.svelte` is rejected on
  any `width=`/`height=`. Adding the attributes is *not* the way to fix layout
  shift here — a `width` presentational hint would also override the `40px` cap
  and render the icons `40x128`. Layout stability is owned by CSS instead, as
  described in the hero matrix above, which reserves the same boxes without
  touching a captured attribute.
- Tracking scripts are not injected before consent. This intentionally fixes the
  privacy defects documented in `docs/reference/public-site.md`.

## Honest closure boundary

The saved home evidence contains HTML, linked CSS and original image binaries,
but no full-page screenshot, computed-style dump, element rectangles, browser
version, operating-system font rasterizer, or device-pixel ratio. Therefore the
repository proves identical hero bytes plus source, cascade, asset and
breakpoint parity on every CSS-width branch. It cannot honestly prove a
zero-pixel full-page raster diff on literally every physical device from this
evidence alone.

Final raster closure requires a new reference screenshot and rect/computed-style
capture at the same viewport, DPR, browser and font environment. Until then,
claims must use **evidence-complete source match**, not **zero-pixel screenshot
match**.
