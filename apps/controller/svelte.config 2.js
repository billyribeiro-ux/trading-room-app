import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    experimental: {
      // SvelteKit 2.63+ opt-in. This is the documented Kit 3 environment API,
      // so new code cannot accidentally add another implicit `$env/*` import.
      explicitEnvironmentVariables: true
    },
    paths: {
      // The captured application is hosted at the domain root and emits
      // root-relative URLs. Keep SvelteKit route resolution without rewriting
      // SSR output to page-relative forms such as `./contact`.
      relative: false
    }
  }
};
