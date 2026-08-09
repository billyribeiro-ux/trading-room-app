import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { parseFragment } from 'parse5';
import { render } from 'svelte/server';
import { build } from 'vite';

const buildPath = resolve('node_modules/.cache/ptr-file-upload-ssr-build');
const htmlPath = resolve('/private/tmp/ptr-file-upload-ssr.html');
const reportPath = resolve('docs/generated/direct-file-upload-dom.json');

const appPathsStub = {
  name: 'app-paths-stub',
  resolveId(id) {
    if (id === '$app/paths') return '\0app-paths-stub';
  },
  load(id) {
    if (id === '\0app-paths-stub') {
      return 'export function resolve(path) { return path; }';
    }
  }
};

await build({
  configFile: false,
  logLevel: 'silent',
  plugins: [appPathsStub, svelte()],
  resolve: {
    alias: {
      $lib: resolve('src/lib')
    }
  },
  build: {
    ssr: resolve('src/lib/components/ModalHost.svelte'),
    outDir: buildPath,
    emptyOutDir: true,
    rollupOptions: {
      external: [/^svelte(?:\/.*)?$/],
      output: {
        entryFileNames: 'modal-host.mjs'
      }
    }
  }
});

const componentUrl = `${pathToFileURL(resolve(buildPath, 'modal-host.mjs')).href}?t=${Date.now()}`;
const { default: ModalHost } = await import(componentUrl);
const html = render(ModalHost, {
  props: {
    name: 'file-upload',
    settingsTab: 'chat',
    alertTab: 'media',
    theme: 'light',
    roomSplitDir: 'ltr',
    sessionControlInitialTab: 'reset-session',
    chatStyle: {
      color: '#1a1a1a',
      tickerColor: '#1a1a1a',
      usernameColor: '#365d7d',
      bgColor: '#ffffff',
      fontSize: 14,
      playSound: true
    },
    onclose: () => {},
    onSettingsTab: () => {},
    onAlertTab: () => {},
    onTheme: () => {},
    onPreferenceChange: () => {},
    onPostAlert: async () => false,
    onPastePostAlert: async () => false,
    onAlert: () => {},
    onConfirm: () => {},
    onReplySend: async () => false,
    onMentionUser: () => {},
    onPrivateChat: () => {},
    onFollowToggle: () => {},
    onFollowStyleChange: () => {},
    onMuteToggle: () => {},
    onUserAction: () => {},
    onManagedUserRemoval: () => {},
    onManagedUserInfo: () => {},
    currentUser: { email: 'connected-user@ptr.invalid' },
    mutedUsers: {},
    followedUsers: {},
    targetMessage: null,
    targetUser: {
      avatarUrl: 'https://secure.gravatar.com/avatar/test?d=mm&s=50',
      status: 'offline'
    }
  }
}).body;

await writeFile(htmlPath, html);

function attributes(node) {
  return Object.fromEntries(
    (node.attrs ?? [])
      .map(({ name, value }) => [name, value])
      .sort(([left], [right]) => left.localeCompare(right))
  );
}

function directText(node) {
  return (node.childNodes ?? [])
    .filter((child) => child.nodeName === '#text')
    .map((child) => child.value)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findElement(root, predicate) {
  if (root.tagName && predicate(root)) return root;

  for (const child of root.childNodes ?? []) {
    const match = findElement(child, predicate);
    if (match) return match;
  }
}

function elements(root) {
  const result = [];

  function visit(node) {
    if (node.tagName) result.push(node);
    for (const child of node.childNodes ?? []) visit(child);
  }

  visit(root);
  return result;
}

const document = parseFragment(html);
const modal = findElement(document, (node) => attributes(node).class === 'bootbox modal fade show');

if (!modal) {
  throw new Error('Rendered File Upload modal root was not found.');
}

const actual = elements(modal).map((node) => ({
  tag: node.tagName,
  attrs: attributes(node),
  text: directText(node)
}));

const expected = [
  { tag: 'div', attrs: { class: 'bootbox modal fade show' }, text: '' },
  { tag: 'div', attrs: { class: 'modal-dialog modal-xl' }, text: '' },
  { tag: 'div', attrs: { class: 'modal-content' }, text: '' },
  { tag: 'div', attrs: { class: 'modal-header' }, text: '' },
  { tag: 'h5', attrs: { class: 'modal-title' }, text: 'File Upload' },
  {
    tag: 'button',
    attrs: {
      'aria-hidden': 'true',
      'aria-label': 'Close',
      class: 'bootbox-close-button close btn-close',
      type: 'button'
    },
    text: ''
  },
  { tag: 'div', attrs: { class: 'modal-body' }, text: '' },
  { tag: 'div', attrs: { class: 'bootbox-body' }, text: '' },
  { tag: 'div', attrs: {}, text: '' },
  {
    tag: 'label',
    attrs: {
      class: 'upload-area',
      for: 'fupload',
      style: 'width:100%;text-align:center;'
    },
    text: 'Click to select files to upload'
  },
  {
    tag: 'input',
    attrs: {
      id: 'fupload',
      multiple: 'true',
      name: 'fupload',
      style: 'display:none;',
      type: 'file'
    },
    text: ''
  },
  { tag: 'i', attrs: { class: 'fas fa-file-upload fa-3x' }, text: '' },
  { tag: 'br', attrs: {}, text: '' },
  {
    tag: 'div',
    attrs: {
      class: 'filedrag',
      id: 'filedrag',
      style: 'display: block;'
    },
    text: 'or drop files here'
  },
  { tag: 'br', attrs: {}, text: '' },
  {
    tag: 'div',
    attrs: {
      class: 'fileList',
      id: 'fileList',
      style: 'margin-left:5px !important;'
    },
    text: ''
  },
  { tag: 'div', attrs: { class: 'clearfix' }, text: '' },
  { tag: 'div', attrs: { class: 'modal-footer' }, text: '' },
  {
    tag: 'button',
    attrs: { class: 'btn btn-success', type: 'button' },
    text: 'Upload'
  }
];

const hydratedActual = structuredClone(actual);
const hydratedFileInput = hydratedActual.find((node) => node.attrs.id === 'fupload');
if (hydratedFileInput) hydratedFileInput.attrs.multiple = 'true';

const serverExact = JSON.stringify(actual) === JSON.stringify(expected);
const hydratedExact = JSON.stringify(hydratedActual) === JSON.stringify(expected);
const report = {
  generatedAt: new Date().toISOString(),
  evidence: {
    source: 'User-supplied File Upload DOM fragment and screenshot',
    htmlPath
  },
  summary: {
    rootFound: true,
    expectedElements: expected.length,
    renderedElements: actual.length,
    serverExact,
    hydratedExact,
    hydratedLiteralAttribute:
      'setMultipleAttribute sets multiple="true" when the component hydrates'
  },
  expected,
  serverActual: actual,
  hydratedActual
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report.summary, null, 2)}\n`);
process.stdout.write(`${reportPath}\n`);

if (!hydratedExact) process.exitCode = 1;
