import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { render } from 'svelte/server';
import { build } from 'vite';

const outputPath = resolve(process.argv[2] ?? '/private/tmp/ptr-emoji-ssr.html');
const buildPath = resolve('/private/tmp/ptr-emoji-ssr-build');

await build({
  configFile: false,
  logLevel: 'silent',
  plugins: [svelte()],
  resolve: {
    alias: {
      $lib: resolve('src/lib')
    }
  },
  build: {
    ssr: resolve('src/lib/components/EmojiPicker.svelte'),
    outDir: buildPath,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'emoji.mjs'
      }
    }
  }
});

const componentUrl = `${pathToFileURL(resolve(buildPath, 'emoji.mjs')).href}?t=${Date.now()}`;
const { default: EmojiPicker } = await import(componentUrl);
const html = render(EmojiPicker, { props: { onselect: () => {} } }).body;

await writeFile(outputPath, html);
process.stdout.write(`${outputPath}\n`);
