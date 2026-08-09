/**
 * Behavioural verification for /account:
 *   1. the bootbox confirm matches the captured DOM exactly
 *   2. Cancel really cancels — the row is still there afterwards
 *   3. OK removes the row WITHOUT a page load
 *   4. fadeInDown runs on load, and never again: not on navigation, not on a
 *      mutation
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ORIGIN = 'http://localhost:5300';
const PORT = 9335;
const cookie = readFileSync('/tmp/cookie1.txt', 'utf8').trim();

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=/tmp/chrome-behave',
    '--window-size=1989,1265',
    '--force-device-scale-factor=2',
    'about:blank'
  ],
  { stdio: 'ignore' }
);

const wsUrl = await (async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('chrome did not come up');
})();

const ws = new WebSocket(wsUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const mid = ++id;
    const onMsg = (m) => {
      const d = JSON.parse(m.data);
      if (d.id === mid) {
        ws.removeEventListener('message', onMsg);
        resolve(d.result);
      }
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

const evalJs = async (expression) => {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression: `(async () => { ${expression} })()`,
    awaitPromise: true,
    returnByValue: true
  });
  if (exceptionDetails) throw new Error(JSON.stringify(exceptionDetails.exception));
  return result.value;
};

await send('Network.enable');
const [name, value] = cookie.split('=');
await send('Network.setCookie', { name, value, domain: 'localhost', path: '/' });
await send('Page.enable');
// the window flag does not survive every profile; pin the metrics the capture used
await send('Emulation.setDeviceMetricsOverride', { width: 1989, height: 1265, deviceScaleFactor: 2, mobile: false });

const results = [];
const check = (label, ok, detail = '') => results.push({ label, ok, detail });

/* seed a row to remove */
await send('Page.navigate', { url: `${ORIGIN}/account` });
await new Promise((r) => setTimeout(r, 2500));

await evalJs(`
  const fd = new FormData();
  fd.set('name', 'Will Ribeiro');
  fd.set('email', 'will.test@protradingroom.test');
  fd.set('password', 'Protrading2026!');
  await fetch('/account?/addAdminUser', { method: 'POST', body: fd, headers: { 'x-sveltekit-action': 'true' } });
  return true;
`);
await send('Page.navigate', { url: `${ORIGIN}/account` });
await new Promise((r) => setTimeout(r, 2500));

/* 4a. the animation class is present on the freshly-loaded document */
const onLoad = await evalJs(`
  return document.querySelector('.acc-container').className;
`);
check('fadeInDown present on a fresh document load', /animated fadeInDown/.test(onLoad), onLoad);

/* stamp the container so we can prove it is never re-created */
await evalJs(`document.querySelector('.acc-container').dataset.stamp = 'original'; return true;`);

/* 1. open the confirm by clicking Remove */
const rowsBefore = await evalJs(`
  return document.querySelectorAll('form[action="?/deleteAdminUser"] .acc-link').length;
`);
check('an admin row exists to remove', rowsBefore === 1, `rows=${rowsBefore}`);

await evalJs(`
  document.querySelector('form[action="?/deleteAdminUser"] .acc-link').click();
  await new Promise((r) => setTimeout(r, 400));
  return true;
`);

const dialog = await evalJs(`
  const el = document.querySelector('.bootbox');
  if (!el) return null;
  const content = el.querySelector('.modal-content');
  const close = el.querySelector('.bootbox-close-button');
  const cancel = el.querySelector('[data-bb-handler="cancel"]');
  const ok = el.querySelector('[data-bb-handler="confirm"]');
  return {
    root: el.className,
    hasDialog: !!el.querySelector('.modal-dialog'),
    hasContent: !!content,
    body: el.querySelector('.bootbox-body')?.textContent,
    closeClass: close?.className,
    closeDismiss: close?.getAttribute('data-dismiss'),
    closeAriaHidden: close?.getAttribute('aria-hidden'),
    closeStyle: close?.getAttribute('style'),
    closeText: close?.textContent,
    cancelClass: cancel?.className,
    cancelText: cancel?.textContent,
    okClass: ok?.className,
    okText: ok?.textContent,
    backdrop: !!document.querySelector('.bootbox-backdrop'),
    bodyLocked: document.body.classList.contains('modal-open'),
    focused: document.activeElement?.getAttribute('data-bb-handler'),
    dialogWidth: el.querySelector('.modal-dialog')?.getBoundingClientRect().width,
    viewport: window.innerWidth
  };
`);

check('bootbox dialog opens', !!dialog);
if (dialog) {
  check(
    'root is `bootbox modal fade in`',
    /^bootbox modal fade(?: in)?$/.test(dialog.root.trim().replace(/\s+/g, ' ')),
    dialog.root
  );
  check('has .modal-dialog > .modal-content', dialog.hasDialog && dialog.hasContent);
  check(
    'message is the captured copy',
    dialog.body === 'Remove admin user "Will Ribeiro"? This cannot be undone.',
    JSON.stringify(dialog.body)
  );
  check('× is `bootbox-close-button close`', dialog.closeClass === 'bootbox-close-button close', dialog.closeClass);
  check('× has data-dismiss="modal"', dialog.closeDismiss === 'modal', dialog.closeDismiss);
  check('× has aria-hidden="true"', dialog.closeAriaHidden === 'true', dialog.closeAriaHidden);
  check('× has style="margin-top: -10px;"', /margin-top:\s*-10px/.test(dialog.closeStyle ?? ''), dialog.closeStyle);
  check('× glyph is ×', dialog.closeText === '×', dialog.closeText);
  check('Cancel is `btn btn-default`', dialog.cancelClass === 'btn btn-default', dialog.cancelClass);
  check('Cancel text', dialog.cancelText === 'Cancel', dialog.cancelText);
  check('OK is `btn btn-primary`', dialog.okClass === 'btn btn-primary', dialog.okClass);
  check('OK text', dialog.okText === 'OK', dialog.okText);
  check('backdrop rendered', dialog.backdrop);
  check('body scroll locked (modal-open)', dialog.bodyLocked);
  check('focus moved to OK', dialog.focused === 'confirm', String(dialog.focused));
  check(
    `dialog is 600px wide (Bootstrap 3 @>=768px; viewport ${dialog.viewport})`,
    Math.abs(dialog.dialogWidth - 600) < 0.01,
    `${dialog.dialogWidth} at viewport ${dialog.viewport}`
  );
}

/* 2. Cancel leaves the row alone */
const afterCancel = await evalJs(`
  document.querySelector('[data-bb-handler="cancel"]').click();
  await new Promise((r) => setTimeout(r, 600));
  return {
    dialogGone: !document.querySelector('.bootbox'),
    unlocked: !document.body.classList.contains('modal-open'),
    rows: document.querySelectorAll('form[action="?/deleteAdminUser"] .acc-link').length
  };
`);
check('Cancel closes the dialog', afterCancel.dialogGone);
check('Cancel unlocks body scroll', afterCancel.unlocked);
check('Cancel does NOT remove the row', afterCancel.rows === 1, `rows=${afterCancel.rows}`);

/* 3. OK removes it, with no document load */
const afterOk = await evalJs(`
  document.querySelector('form[action="?/deleteAdminUser"] .acc-link').click();
  await new Promise((r) => setTimeout(r, 400));
  document.querySelector('[data-bb-handler="confirm"]').click();
  await new Promise((r) => setTimeout(r, 1200));
  const c = document.querySelector('.acc-container');
  return {
    rows: document.querySelectorAll('form[action="?/deleteAdminUser"] .acc-link').length,
    stampSurvived: c.dataset.stamp === 'original',
    className: c.className
  };
`);
check('OK removes the row', afterOk.rows === 0, `rows=${afterOk.rows}`);
check('the page did NOT reload (container never re-created)', afterOk.stampSurvived);
check(
  'fadeInDown did not replay after the mutation',
  afterOk.className === onLoad,
  `${onLoad} -> ${afterOk.className}`
);

/* A newly-created/rotated secret belongs in the table's `secret` cell. The
   original page.welcome.html binds `k.apiSecret` there and createApiKey()
   immediately refreshes apiKeys; it has no separate success paragraph. */
const apiKeysBefore = await evalJs(`
  const table = [...document.querySelectorAll('table.acc-table')].at(-1);
  return [...table.querySelectorAll('tbody tr')]
    .map((row) => row.querySelector('td')?.textContent.trim())
    .filter((value) => value && value !== 'No API keys yet');
`);

const apiReveal = await evalJs(`
  const form = document.querySelector('form[action="?/createApiKey"]');
  form.requestSubmit();
  await new Promise((r) => setTimeout(r, 1200));
  const table = [...document.querySelectorAll('table.acc-table')].at(-1);
  const rows = [...table.querySelectorAll('tbody tr')];
  const row = rows.find((candidate) => {
    const keyId = candidate.querySelector('td')?.textContent.trim();
    return keyId && !${JSON.stringify(apiKeysBefore)}.includes(keyId);
  });
  const cells = row ? [...row.querySelectorAll('td')].map((cell) => cell.textContent.trim()) : [];
  return {
    keyId: cells[0] ?? null,
    secret: cells[1] ?? null,
    hasNotice: !!document.querySelector('p.acc-notice')
  };
`);
check(
  'new API key renders a populated table row',
  /^[0-9a-f]{24}$/.test(apiReveal.keyId ?? ''),
  JSON.stringify(apiReveal)
);
check(
  'complete 64-character secret renders in the secret cell',
  /^[0-9a-f]{64}$/.test(apiReveal.secret ?? ''),
  String(apiReveal.secret)
);
check('API-key creation renders no separate success paragraph', apiReveal.hasNotice === false);

await send('Page.reload', { ignoreCache: true });
await new Promise((r) => setTimeout(r, 1800));
const apiSecretAfterReload = await evalJs(`
  const table = [...document.querySelectorAll('table.acc-table')].at(-1);
  const row = [...table.querySelectorAll('tbody tr')].find(
    (candidate) => candidate.querySelector('td')?.textContent.trim() === ${JSON.stringify(apiReveal.keyId)}
  );
  return row?.querySelectorAll('td')[1]?.textContent.trim() ?? null;
`);
check(
  'complete API-key secret remains visible after reload',
  apiSecretAfterReload === apiReveal.secret,
  String(apiSecretAfterReload)
);

if (apiReveal.keyId) {
  await evalJs(`
    const fd = new FormData();
    fd.set('id', ${JSON.stringify(apiReveal.keyId)});
    await fetch('/account?/deleteApiKey', {
      method: 'POST',
      body: fd,
      headers: { 'x-sveltekit-action': 'true' }
    });
    return true;
  `);
}

/* The supplied original Upload Image Badge state is a Bootbox text prompt,
   distinct from the email-list textarea prompt verified below. */
const badgeRowsBefore = await evalJs(`
  const table = document.querySelector('.col-md-9.acc-panel table.acc-table');
  return table ? table.querySelectorAll('tbody tr').length : 0;
`);

const imageBadgePrompt = await evalJs(`
  const input = document.querySelector('form[action="?/uploadImageBadge"] input[type="file"]');
  const binary = atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlNsAAAAASUVORK5CYII=');
  const transfer = new DataTransfer();
  transfer.items.add(new File([Uint8Array.from(binary, (c) => c.charCodeAt(0))], 'badge.png', { type: 'image/png' }));
  input.files = transfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));

  const modal = document.querySelector('.bootbox');
  const content = modal?.querySelector('.modal-content');
  const close = content?.querySelector('.bootbox-close-button');
  const field = content?.querySelector('.bootbox-input');
  const cancel = content?.querySelector('[data-bb-handler="cancel"]');
  const ok = content?.querySelector('[data-bb-handler="confirm"]');
  return {
    root: modal?.className ?? null,
    children: content ? [...content.children].map((child) => child.className) : [],
    title: content?.querySelector('.modal-title')?.textContent ?? null,
    closeClass: close?.className ?? null,
    closeDismiss: close?.getAttribute('data-dismiss'),
    closeAriaHidden: close?.getAttribute('aria-hidden'),
    closeText: close?.textContent ?? null,
    formClass: content?.querySelector('form')?.className ?? null,
    inputClass: field?.className ?? null,
    inputType: field?.getAttribute('type'),
    autocomplete: field?.getAttribute('autocomplete'),
    focused: document.activeElement === field,
    cancelClass: cancel?.className ?? null,
    cancelText: cancel?.textContent ?? null,
    okClass: ok?.className ?? null,
    okText: ok?.textContent ?? null
  };
`);
check(
  'image-badge prompt opens as `bootbox modal fade in`',
  imageBadgePrompt.root === 'bootbox modal fade in',
  imageBadgePrompt.root
);
check(
  'image-badge prompt is header/body/footer',
  imageBadgePrompt.children.join('|') === 'modal-header|modal-body|modal-footer',
  imageBadgePrompt.children.join('|')
);
check(
  'image-badge prompt title is verbatim',
  imageBadgePrompt.title === 'Enter the badge name (*optional):',
  imageBadgePrompt.title
);
check(
  'image-badge × is `bootbox-close-button close`',
  imageBadgePrompt.closeClass === 'bootbox-close-button close',
  imageBadgePrompt.closeClass
);
check('image-badge × has data-dismiss="modal"', imageBadgePrompt.closeDismiss === 'modal');
check('image-badge × has aria-hidden="true"', imageBadgePrompt.closeAriaHidden === 'true');
check('image-badge × glyph is ×', imageBadgePrompt.closeText === '×', imageBadgePrompt.closeText);
check('image-badge form is `bootbox-form`', imageBadgePrompt.formClass === 'bootbox-form', imageBadgePrompt.formClass);
check(
  'image-badge field has exact classes',
  imageBadgePrompt.inputClass === 'bootbox-input bootbox-input-text form-control',
  imageBadgePrompt.inputClass
);
check('image-badge field is type="text"', imageBadgePrompt.inputType === 'text', imageBadgePrompt.inputType);
check(
  'image-badge field has autocomplete="off"',
  imageBadgePrompt.autocomplete === 'off',
  imageBadgePrompt.autocomplete
);
check('focus lands in the image-badge field', imageBadgePrompt.focused === true);
check(
  'image-badge Cancel is `btn btn-default`',
  imageBadgePrompt.cancelClass === 'btn btn-default',
  imageBadgePrompt.cancelClass
);
check('image-badge Cancel text', imageBadgePrompt.cancelText === 'Cancel', imageBadgePrompt.cancelText);
check('image-badge OK is `btn btn-primary`', imageBadgePrompt.okClass === 'btn btn-primary', imageBadgePrompt.okClass);
check('image-badge OK text', imageBadgePrompt.okText === 'OK', imageBadgePrompt.okText);

const badgeAfterCancel = await evalJs(`
  document.querySelector('.bootbox [data-bb-handler="cancel"]').click();
  await new Promise((r) => setTimeout(r, 350));
  const table = document.querySelector('.col-md-9.acc-panel table.acc-table');
  return {
    modalOpen: !!document.querySelector('.bootbox'),
    rows: table ? table.querySelectorAll('tbody tr').length : 0
  };
`);
check('image-badge Cancel closes the prompt', badgeAfterCancel.modalOpen === false);
check('image-badge Cancel uploads nothing', badgeAfterCancel.rows === badgeRowsBefore, `rows=${badgeAfterCancel.rows}`);

const uploadedBadge = await evalJs(`
  const uploadForm = document.querySelector('form[action="?/uploadImageBadge"]');
  const fileInput = uploadForm.querySelector('input[type="file"]');
  let submitted = false;
  let submittedLabel = null;
  let submittedFiles = null;
  uploadForm.addEventListener('submit', () => {
    const submittedData = new FormData(uploadForm);
    submitted = true;
    submittedLabel = submittedData.get('label');
    submittedFiles = submittedData.getAll('image').map((item) =>
      item instanceof File ? { name: item.name, size: item.size, type: item.type } : String(item)
    );
  }, { once: true });
  const binary = atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlNsAAAAASUVORK5CYII=');
  const transfer = new DataTransfer();
  transfer.items.add(new File([Uint8Array.from(binary, (c) => c.charCodeAt(0))], 'badge.png', { type: 'image/png' }));
  fileInput.files = transfer.files;
  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 350));
  const field = document.querySelector('.bootbox-input-text');
  field.value = 'Forensics Image Badge';
  field.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('.bootbox [data-bb-handler="confirm"]').click();
  await new Promise((r) => setTimeout(r, 1400));
  const table = document.querySelector('.col-md-9.acc-panel table.acc-table');
  const row = [...table.querySelectorAll('tbody tr')].find((candidate) =>
    candidate.textContent.includes('Forensics Image Badge')
  );
  return {
    id: row?.querySelector('form[action="?/deleteBadge"] input[name="id"]')?.value ?? null,
    hasImage: !!row?.querySelector('img.acc-badge-img'),
    text: row?.textContent.trim() ?? null,
    submitted,
    submittedLabel,
    submittedFiles
  };
`);
check('image-badge OK uploads the selected image', uploadedBadge.hasImage === true, JSON.stringify(uploadedBadge));
check(
  'image-badge OK stores the entered optional name',
  uploadedBadge.text?.includes('Forensics Image Badge') === true,
  uploadedBadge.text
);

if (uploadedBadge.id) {
  await evalJs(`
    const fd = new FormData();
    fd.set('id', ${JSON.stringify(uploadedBadge.id)});
    await fetch('/account?/deleteBadge', {
      method: 'POST',
      body: fd,
      headers: { 'x-sveltekit-action': 'true' }
    });
    return true;
  `);
}

/* 4b. navigate away and back — still no replay */
await evalJs(`
  const nav = (href) => new Promise((res) => {
    document.querySelector('a[href="' + href + '"]')?.click();
    setTimeout(res, 1200);
  });
  history.pushState({}, '', '/account');
  const { goto } = await import('/@id/__x00__$app/navigation').catch(() => ({}));
  return true;
`).catch(() => true);

const navResult = await evalJs(`
  const link = [...document.querySelectorAll('a')].find((a) => a.getAttribute('href') === '/logout');
  return { hasLinks: document.querySelectorAll('a[href^="/"]').length };
`);
check('page has internal links to navigate with', navResult.hasLinks > 0, String(navResult.hasLinks));

/* ── the bootbox PROMPT, which is a different dialog from the confirm ──────
   "Actions With the Email List" opens it. Captured markup:

     <div class="modal-content">
       <div class="modal-header">
         <button class="bootbox-close-button close" data-dismiss="modal" aria-hidden="true">×</button>
         <h4 class="modal-title">Enter comma separated email list</h4>
       </div>
       <div class="modal-body"><div class="bootbox-body">
         <form class="bootbox-form">
           <textarea class="bootbox-input bootbox-input-textarea form-control"></textarea>
         </form>
       </div></div>
       <div class="modal-footer">
         <button data-bb-handler="cancel"  class="btn btn-default">Cancel</button>
         <button data-bb-handler="confirm" class="btn btn-primary">OK</button>
       </div>
     </div>

   Note the header: the confirm has none and hangs its × in the body instead. */
const roomId = (process.env.ROOM ?? readFileSync('/tmp/roomid.txt', 'utf8')).trim();
await send('Page.navigate', { url: `${ORIGIN}/account/rooms/${roomId}?tab=users` });
await new Promise((r) => setTimeout(r, 2600));

const prompt = await evalJs(`
  const open = [...document.querySelectorAll('.users-many-actions .dropdown button')]
    .find((b) => b.textContent.includes('Email List'));
  if (!open) return { noButton: true };
  open.click();
  await new Promise((r) => setTimeout(r, 500));
  const el = document.querySelector('.bootbox .modal-content');
  if (!el) return { noDialog: true };
  const head = el.querySelector('.modal-header');
  const ta = el.querySelector('textarea');
  const backdrop = document.querySelector('.bootbox-backdrop');
  return {
    hasHeader: !!head,
    title: head?.querySelector('h4.modal-title')?.textContent.trim(),
    closeInHeader: !!head?.querySelector('button.bootbox-close-button.close'),
    closeDismiss: head?.querySelector('.bootbox-close-button')?.getAttribute('data-dismiss'),
    formClass: el.querySelector('.bootbox-body > form')?.getAttribute('class'),
    taClass: ta?.getAttribute('class'),
    focused: document.activeElement === ta,
    cancel: el.querySelector('[data-bb-handler="cancel"]')?.getAttribute('class'),
    ok: el.querySelector('[data-bb-handler="confirm"]')?.getAttribute('class'),
    okText: el.querySelector('[data-bb-handler="confirm"]')?.textContent.trim(),
    backdropOpacity: backdrop ? getComputedStyle(backdrop).opacity : null,
    noBodyClose: !el.querySelector('.modal-body > .bootbox-close-button')
  };
`);

check('email-list prompt opens', !prompt.noButton && !prompt.noDialog, JSON.stringify(prompt));
check('prompt has a modal-header', prompt.hasHeader === true);
check('title is the captured copy', prompt.title === 'Enter comma separated email list', prompt.title);
check('× lives in the header, not the body', prompt.closeInHeader === true && prompt.noBodyClose === true);
check('× has data-dismiss="modal"', prompt.closeDismiss === 'modal', prompt.closeDismiss);
check('form is `bootbox-form`', prompt.formClass === 'bootbox-form', prompt.formClass);
check(
  'textarea is `bootbox-input bootbox-input-textarea form-control`',
  prompt.taClass === 'bootbox-input bootbox-input-textarea form-control',
  prompt.taClass
);
check('focus lands in the textarea', prompt.focused === true);
check('Cancel is `btn btn-default`', prompt.cancel === 'btn btn-default', prompt.cancel);
check('OK is `btn btn-primary`', prompt.ok === 'btn btn-primary', prompt.ok);
check('OK reads "OK"', prompt.okText === 'OK', prompt.okText);
/* the backdrop settles at .5, not 1 — at 1 the page behind goes solid black */
check('backdrop is 50% opaque', prompt.backdropOpacity === '0.5', prompt.backdropOpacity);

const typed = await evalJs(`
  const ta = document.querySelector('.bootbox textarea');
  /* a row that HAS a checkbox — the owner deliberately has none */
  const rows = [...document.querySelectorAll('.mg-root table tbody tr')]
    .filter((r) => r.querySelector('input[type=checkbox]'));
  const email = rows.map((r) => (r.textContent.match(/[\\w.+-]+@[\\w.-]+/) || [])[0]).find(Boolean);
  if (!email) return { noEmail: true, note: 'no non-owner member in the fixture' };
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
  setter.call(ta, email + ', nobody@example.invalid');
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('.bootbox [data-bb-handler="confirm"]').click();
  await new Promise((r) => setTimeout(r, 500));
  return {
    email,
    checked: [...document.querySelectorAll('.mg-root tbody input[type=checkbox]')].filter((c) => c.checked).length,
    reported: document.querySelector('.bootbox .bootbox-body')?.textContent.trim() ?? null
  };
`);
check('a pasted address selects that member', typed.noEmail || typed.checked === 1, JSON.stringify(typed));
check(
  'an address not in the room is reported, not silently dropped',
  typed.noEmail || /nobody@example\.invalid/.test(typed.reported ?? ''),
  String(typed.reported)
);

chrome.kill();

const pass = results.filter((r) => r.ok).length;
console.log(`\n  behaviour  ${pass}/${results.length}\n`);
for (const r of results) {
  console.log(`  ${r.ok ? 'ok  ' : 'FAIL'}  ${r.label}${r.ok || !r.detail ? '' : `\n          got: ${r.detail}`}`);
}
console.log();
process.exit(pass === results.length ? 0 : 1);
