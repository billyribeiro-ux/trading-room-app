# 0005 — The home page becomes an original cinematic surface

**Status:** accepted, 2026-08-09
**Context:** owner directive — replace the pixel-fidelity reconstruction of the legacy marketing
page with an original, state-of-the-art product surface: every stock image gone, cinematic motion
in their place, copy that tells the engineering story, and a real footer.

---

## The situation before

`/` was a byte-faithful reconstruction of the captured protradingroom.com marketing page:
Bootstrap 3.1.1 transcription, three stock screenshots (`ptr_descrived_perspective.png`,
`user_comments.png`, `ss3.png`), three clip-art circle icons, and copy from 2015. It was guarded by
`verify-home-fidelity.mjs`, which hashed the evidence dump and the image binaries — a gate that
could only run on the owner's machine, because the captures are deliberately never committed.

That reconstruction was the right first step: it proved the rebuild could hit a pixel target. It
was never the product's face. The owner has now directed the product to have its own.

## The decision

`/` is an original composition, built from the technologies the product itself is proudest of, and
**it renders no raster imagery at all**:

| Layer         | Technology                             | What it does                                                                                                                                    |
| ------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero scene    | Threlte 8 / three.js                   | 2,700 instanced candlesticks as a breathing market skyline; one draw call; pauses offscreen; loads only after a WebGL probe, via dynamic import |
| Choreography  | GSAP 3 + ScrollTrigger                 | split-character headline rise, scroll reveals, stat decode, magnetic CTAs                                                                       |
| Live tape     | D3 (scale/shape/array)                 | a seeded simulated feed streamed through a real reactive pipeline, labeled **Simulated feed** wherever it appears                               |
| Product mocks | pure CSS/SVG                           | the desk and the phone drawn in markup — illustrations that cannot rot out of sync with the product                                             |
| Type          | self-hosted Roboto 300 + system stacks | the exact binary pinned by the font contract; zero new font bytes                                                                               |

Structural rules, each enforced by `scripts/verify-home-contract.mjs`:

1. **No `<img>`, no bitmap references** anywhere on the home surface.
2. **Honesty label**: every simulated data surface renders the `Simulated feed` chip. No fake
   uptime claims, no fabricated ratings, no invented customers. The seven testimonial quotes are
   carried **verbatim** from the capture — they are real member comments, and they are the one
   piece of the legacy page that survives word for word.
3. **SSR-complete**: the server renders the finished composition (deterministic seeded charts
   included). JavaScript only re-performs it. No-JS, no-WebGL, and `prefers-reduced-motion`
   visitors all get a complete, still page — never a blank or half-hidden one.
4. **Own chrome, own cascade**: the home renders inside `.home-cine` with its own nav, consent
   banner, and footer — never inside `.pub-root`. Tokens live in `src/home.css`; everything
   component-specific lives in component `<style>` blocks (ADR 0004 tier 3). `public.css` is
   untouched and remains normative for `/contact`, `/privacy`, and `/terms`.
5. **Consent behavior is unchanged**: same `gdprConsent` key, same values, same client-only
   `{@attach}` read — only the styling moved to the new surface.

## Consequences

- `verify-home-fidelity.mjs` is retired and replaced by `verify-home-contract.mjs`
  (`pnpm home:contract`). The new gate is **self-contained** — no evidence dumps, no owner-local
  symlinks — so it runs on any clone, which the old gate never could.
- The home half of `e2e/responsive-contract.spec.ts` now asserts the new structural contract
  (headline, no `<img>` in main, simulated-feed labels, real footer links, burger breakpoint, no
  horizontal overflow) at the same viewport matrix.
- `docs/reference/home-pixel-contract.md` is superseded as a normative document and kept as the
  historical record of the reconstruction era.
- The hero headline still sets in the pinned Roboto 300 and the page still preloads that exact
  binary, so `docs/reference/font-contract.md` and `pnpm fonts:verify` hold without modification.
- SSOT §9 (evidence-backed UI fidelity) no longer applies to `/`; this record is the §13 exception
  documenting that carve-out, by owner direction, for this one surface. The capture precedence
  rules still govern every other reconstructed page.
- New exact-pinned dependencies: `gsap`, `three`, `@threlte/core`, `d3-array`, `d3-scale`,
  `d3-shape` (+ type packages). All are client-bundled; none run on the server.

## Verification

`pnpm home:contract`, `pnpm breakpoints:verify`, `pnpm fonts:verify` (unchanged), `pnpm check`,
`pnpm lint`, the responsive Playwright spec, `pnpm build`, and rendered-browser screenshots at
mobile and desktop widths.
