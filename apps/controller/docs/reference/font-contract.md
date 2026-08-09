# Evidence-backed font contract

Status: **normative for typography and icon-font ownership**  
Reviewed: **2026-08-02**

This file is the typography authority named by
`docs/ENGINEERING-SSOT.md`. It records which faces are evidence-backed, where
they apply, and which apparent cleanups would change captured rendering. A font
package's convenience does not outrank the original binary, computed style, or
application boundary.

## 1. Text-font ownership

| Surface | Required family and weight | Delivery | Evidence |
|---|---|---|---|
| Public-site body | `'Helvetica Neue', Helvetica, Arial, sans-serif`, inherited weights | system stack; no webfont | `src/public.css` reproduces the Bootstrap/theme baseline; the source and limits are catalogued in `docs/reference/home-pixel-contract.md` |
| Home hero heading only | `Roboto`, normal `300` | exact self-hosted WOFF2 below | the captured theme selects Roboto for `#home4 #hero h1.hero-text`; the current rule is in `src/public.css` |
| Account and manage controller | `'Helvetica Neue', Helvetica, Arial, sans-serif`, captured `400/500/700` usage | system stack; no webfont | `evidence-dumps/NEXT-STEP/gaps/sheet-2.css:326,341,1397` and the 2,156-node typography inventory in `docs/reference/parts/05-css-meta-themes.md` |
| Room entry/login | `Arial, Helvetica, sans-serif`, captured `300/400/500/700` usage | system stack; no webfont | browser-reported computed styles in `docs/reference/room-login-visual.md`, the original `.btn-login { font-weight: 700 }` declaration in `evidence-dumps/room-login/room-login-file:161`, and the implementation contract in `src/auth.css` |
| API-documentation surface | its existing OS UI stack | system stack; no additional webfont | the scoped `.ad-root` declaration in `src/manage.css` |

These boundaries are intentional. Helvetica Neue and Arial are not Font Awesome,
and headings do not generally use Font Awesome. Font Awesome is an icon face;
the captured account navbar is a special legacy case where its `.fa` class also
lands on an anchor, and that exception is preserved by the account contract.

## 2. Canonical Roboto asset

Only the Latin, normal-style, weight-300 face required by the above-the-fold hero
is shipped:

| Property | Contract |
|---|---|
| Repository file | `static/fonts/roboto/roboto-v51-latin-300.woff2` |
| Public URL | `/fonts/roboto/roboto-v51-latin-300.woff2` |
| Original source | `https://fonts.gstatic.com/s/roboto/v51/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3yUBHMdazQ.woff2` |
| SHA-256 | `0a44e0bb6ba5c8537e8814c148ef7755f1bce12112361231f595ecc584a18d7a` |
| Byte length | `37,520` |
| CSS identity | `font-family: 'Roboto'; font-style: normal; font-weight: 300` |
| License | SIL Open Font License 1.1; repository copy at `static/fonts/roboto/OFL.txt` |

The digest was recomputed against both the downloaded Google Fonts response and
the checked-in file on 2026-08-02; the bytes matched. The filename contains the
upstream revision, subset, and weight so a future replacement cannot masquerade
as the same asset. A replacement requires a new digest, an evidence citation,
the font contract update, and the applicable fidelity verifier in one change.

The home route should preload this one critical face and the stylesheet should
declare only this face. Do not restore the twelve-variant remote Google CSS
request: eleven of those variants are unused by the captured home page, and a
third-party request makes rendering and availability depend on external state.

Placement follows SvelteKit's documented boundaries: the content-hashed source
is a stable-name [`static` asset](https://svelte.dev/docs/kit/project-structure#Project-files-static),
the route resolves its URL with
[`$app/paths`](https://svelte.dev/docs/kit/$app-paths), and the home route alone
owns its critical-font preload as described by SvelteKit's
[font-preloading guidance](https://svelte.dev/docs/kit/performance#Optimizing-assets-Preloading-fonts).
This keeps a home-only performance hint out of unrelated routes without turning
an evidence-stable filename into a generated asset URL.

## 3. Why this is not an `@fontsource/roboto` dependency

Fontsource is a good general-purpose delivery mechanism and pnpm is the correct
way to install packages in this repository. It is not the fidelity authority.
The Fontsource 5.3.0 Latin 300 normal file inspected during this review hashed to
`299f10a52fe1423dd5579ff7e83db8dbea312f1e924f3e06e55839286b4d1c1d`, which is
not the digest of the Google-served v51 binary above. Even when outlines appear
equivalent, different bytes can reflect subsetting or metadata differences and
do not prove exact source parity.

For this one evidence-backed asset, copying the exact licensed upstream binary
into `static/` is therefore more reproducible than selecting a package's current
build. Fontsource MAY be considered for a new, non-reference design only after a
separate product decision; it MUST NOT replace this hero asset without stronger
evidence superseding this contract.

## 4. System-stack and Lato boundaries

- Do not package or substitute Helvetica Neue or Arial. The evidence specifies
  fallback stacks, and the resolved installed face remains an OS/browser fact.
  Pixel comparisons that include text must record operating system, browser,
  viewport, DPR, and available fonts; the same CSS can rasterize differently on
  a host without Helvetica Neue.
- Do not add Lato. The room-entry contract's browser-reported family is
  `Arial, Helvetica, sans-serif`; Lato is not the computed face for the rebuilt
  surface. A downloaded-but-overridden face in an original bundle is not evidence
  that the rebuild should ship it.
- Do not replace captured stacks with a contemporary system-UI stack unless a
  surface's own evidence already specifies that stack, as the API-documentation
  surface does.

## 5. Icon-font ownership

Two Font Awesome generations coexist because they belong to separate captured
applications:

| Owner | Package/version | Prefix/family | Rule |
|---|---|---|---|
| Account/controller | `font-awesome` **4.3.0** | `.fa` / `FontAwesome` | Preserve the v4 names, metrics, and glyphs used by the controller. The source explicitly identifies 4.3.0 in `evidence-dumps/NEXT-STEP/gaps/sheet-10.css:1`. |
| Room entry | `@fortawesome/fontawesome-free` **5.8.1** | `.fas` / `Font Awesome 5 Free` | Preserve the FA5 gear/user/envelope geometry measured for the room-entry surface. |

FA5 is loaded before FA4, then FA4 owns `.fa`; FA4 does not define `.fas`.
Import order is therefore part of the contract, not cosmetic organization. Do
not upgrade either major/minor version or collapse them into one library without
glyph-metric evidence and visual regression coverage for both surfaces.

The public home has a narrower historical FA4.0.3 source, but its two used glyphs
were proven glyph-by-glyph equivalent to the installed FA4.3.0 face. That bounded
equivalence is documented in `docs/reference/home-pixel-contract.md`; it is not a
general license to substitute icon versions.

## 6. Verification and change procedure

For any typography or icon-font change:

1. Cite the original CSS, computed-style dump, screenshot environment, or exact
   content-hashed binary that supersedes this file.
2. Verify the Roboto byte length and SHA-256, font declaration, local preload,
   absence of remote Google Fonts CSS, package versions, and FA import order with
   the repository font contract gate.
3. Run the applicable page-specific fidelity contract and `pnpm quality`.
4. Capture text comparisons on the same OS/browser/font environment. Do not call
   a cross-platform raster difference a CSS regression until fallback resolution
   and font rasterization have been controlled.
5. Update this authority in the same change. Roll back by restoring the last
   content-hashed asset, declaration, package versions, and import order—not by
   fetching an unpinned remote font at runtime.
