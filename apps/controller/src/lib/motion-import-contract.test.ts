import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  How GSAP is imported, pinned — because getting it wrong takes the home page down and nothing in
  the local toolchain notices.

  `import { ScrollTrigger } from 'gsap/ScrollTrigger'` threw `SyntaxError: Named export
  'ScrollTrigger' not found` at module instantiation inside the Vercel function, so every request
  to `/` answered 500. It passed svelte-check, the whole unit suite, `vite build`, and a production
  build served locally from `vite preview`, because Node resolves gsap's ESM file here and the
  deployed function resolves its CommonJS one. The only place it failed was production.

  So this asserts the shape of the import rather than any behaviour: a named import of that CJS
  subpath must never come back.
*/
const motion = readFileSync(new URL('./motion.ts', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ''
);

describe('the GSAP imports', () => {
  it('are default imports, which work under both CJS and ESM resolution', () => {
    expect(motion).toMatch(/import\s+ScrollTriggerModule\s+from\s+'gsap\/dist\/ScrollTrigger\.js'/);
    /*
      BOTH specifiers, because the first fix repaired only the subpath and simply moved the crash
      one line up to `Named export 'gsap' not found`. A runtime that resolves a package as CommonJS
      does so for every specifier into it; the stack only names where instantiation stopped first.
    */
    expect(motion).toMatch(/import\s+gsapModule\s+from\s+'gsap\/dist\/gsap\.js'/);
  });

  it('never uses a named import of the package root either', () => {
    expect(motion).not.toMatch(/import\s*\{[^}]*gsap[^}]*\}\s*from\s*'gsap'/);
  });

  it('imports the dist CommonJS builds, never the bundler-only ESM entry points', () => {
    /*
      gsap 3.15's `index.js` and `ScrollTrigger.js` are written in ESM while the package declares no
      `"type": "module"`, so Node loads them as CommonJS and dies on their first line:
      `Cannot use import statement outside a module`. They are usable only through a bundler. This
      machine bundles them; the deployed function leaves gsap external and Node reads the file.
      The `dist/` builds are real CommonJS and are explicitly exported by the package.
    */
    expect(motion).not.toMatch(/from\s+'gsap'\s*;/);
    expect(motion).not.toMatch(/from\s+'gsap\/ScrollTrigger'/);
  });

  it('never uses a named import of the CommonJS subpath', () => {
    expect(motion).not.toMatch(/import\s*\{[^}]*ScrollTrigger[^}]*\}\s*from\s*'gsap\/ScrollTrigger'/);
  });

  it('unwraps the interop shape rather than assuming one', () => {
    // The default is the plugin in the ESM build and `module.exports` in the CJS build.
    expect(motion).toContain('.ScrollTrigger ?? ScrollTriggerModule');
  });
});
