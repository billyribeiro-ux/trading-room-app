import { readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const componentPaths = process.argv.slice(2).map((path) => resolve(path));
const stylesheetPath = resolve('src/app.css');

if (componentPaths.length === 0) {
  process.stderr.write(
    'Usage: node scripts/globalize-component-styles.mjs <component.svelte> [...components]\n'
  );
  process.exitCode = 1;
} else {
  let stylesheet = await readFile(stylesheetPath, 'utf8');

  for (const componentPath of componentPaths) {
    const component = await readFile(componentPath, 'utf8');
    const match = component.match(/\n<style>\s*([\s\S]*?)\s*<\/style>\s*$/);

    if (!match) {
      process.stderr.write(`${componentPath}: no terminal <style> block found\n`);
      process.exitCode = 1;
      continue;
    }

    const marker = `/* Dump-owned global styles: ${basename(componentPath)} */`;
    if (stylesheet.includes(marker)) {
      process.stderr.write(`${componentPath}: ${marker} already exists\n`);
      process.exitCode = 1;
      continue;
    }

    let css = match[1].trim();
    const globalBlock = css.match(/^:global\s*\{([\s\S]*)\}$/);
    if (globalBlock) css = globalBlock[1].trim();

    stylesheet = `${stylesheet.trimEnd()}\n\n${marker}\n${css}\n`;
    await writeFile(componentPath, component.replace(match[0], '\n'), 'utf8');
  }

  await writeFile(stylesheetPath, stylesheet, 'utf8');
}
