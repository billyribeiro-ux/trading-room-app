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

describe('the GSAP ScrollTrigger import', () => {
  it('is a default import, which works under both CJS and ESM resolution', () => {
    expect(motion).toMatch(/import\s+ScrollTriggerModule\s+from\s+'gsap\/ScrollTrigger'/);
  });

  it('never uses a named import of the CommonJS subpath', () => {
    expect(motion).not.toMatch(/import\s*\{[^}]*ScrollTrigger[^}]*\}\s*from\s*'gsap\/ScrollTrigger'/);
  });

  it('unwraps the interop shape rather than assuming one', () => {
    // The default is the plugin in the ESM build and `module.exports` in the CJS build.
    expect(motion).toContain('.ScrollTrigger ?? ScrollTriggerModule');
  });
});
