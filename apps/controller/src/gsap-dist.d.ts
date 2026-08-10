/**
 * Types for the gsap `dist/` builds, which the package ships without.
 *
 * `motion.ts` imports `gsap/dist/gsap.js` and `gsap/dist/ScrollTrigger.js` at RUNTIME on purpose:
 * they are real CommonJS, so Node can load them inside the Vercel function. gsap's own `index.js`
 * and `ScrollTrigger.js` are ESM in a package that declares no `"type": "module"`, which is only
 * loadable through a bundler — reading them directly is what answered
 * `Cannot use import statement outside a module` on every request to `/`.
 *
 * The package's `exports` map sends types to `./types/*` for the bare specifiers only, so those
 * dist paths resolve to `any` and the ambient `gsap` namespace other components annotate against
 * (`HeroCinematic.svelte`) disappears with them. Re-exporting the real types here keeps the runtime
 * specifier and the type specifier independent, which is exactly the situation the package's layout
 * forces.
 *
 * This is a declaration file: nothing here exists at runtime, and it cannot affect what is loaded.
 */
declare module 'gsap/dist/gsap.js' {
  import { gsap } from 'gsap';
  export default gsap;
  export { gsap };
}

declare module 'gsap/dist/ScrollTrigger.js' {
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  export default ScrollTrigger;
  export { ScrollTrigger };
}
