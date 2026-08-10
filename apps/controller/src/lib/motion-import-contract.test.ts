import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  GSAP must be BUNDLED into the server output, never resolved at runtime.

  This pins the fix for a total outage of `/`. gsap 3.15 ships ESM in `index.js` and
  `ScrollTrigger.js` while declaring no `"type": "module"`, so those entry points only work inside a
  bundler. Left external, the Vercel function failed three different ways in sequence:

    1. Named export 'ScrollTrigger' not found …is a CommonJS module
    2. Named export 'gsap' not found …is a CommonJS module
    3. Cannot use import statement outside a module   (gsap/index.js:1)

  and pointing at the CommonJS `dist/` builds instead produced a fourth,
  `Cannot find package 'gsap'`, because the dependency tracer then left it out of the function.

  `ssr.noExternal` removes the whole class of failure: nothing to resolve, nothing to trace, no
  CJS/ESM ambiguity. The assertion is on the CONFIG rather than on behaviour because no local run
  can reproduce the external case — `vite dev`, `vite build` and `vite preview` all bundle it, which
  is exactly why this reached production green.
*/
const viteConfig = readFileSync(new URL('../../vite.config.ts', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ''
);
const motion = readFileSync(new URL('./motion.ts', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ''
);

describe('the GSAP server bundling contract', () => {
  it('marks gsap noExternal, so the server chunk carries it', () => {
    expect(viteConfig).toMatch(/ssr:\s*\{\s*noExternal:\s*\[[^\]]*'gsap'/);
  });

  it('imports it the ordinary documented way, which only works once bundled', () => {
    expect(motion).toMatch(/import\s*\{\s*gsap\s*\}\s*from\s*'gsap'/);
    expect(motion).toMatch(/import\s*\{\s*ScrollTrigger\s*\}\s*from\s*'gsap\/ScrollTrigger'/);
  });
});
