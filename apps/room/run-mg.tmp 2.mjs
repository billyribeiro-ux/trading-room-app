import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
const src = readFileSync('/Users/billyribeiro/Desktop/trading-room-app/apps/controller/scripts/collect-manage-gaps.js','utf8');
const dom = new JSDOM(`<!doctype html><html><body>
  <ul class="nav"><li><a data-toggle="tab" href="#users">Users</a></li>
                  <li><a data-toggle="tab" href="#settings">Settings</a></li></ul>
  <div class="tab-pane ng-scope active" id="users"><input type="search" name="title"></div>
  <div class="tab-pane" id="settings">${Array.from({length:264},(_,i)=>`<input name="s${i}">`).join('')}</div>
  <a class="dropdown-toggle" data-toggle="dropdown">Actions With the Email List</a>
  <ul class="dropdown-menu"><li><a>Something</a></li></ul>
  <h4>DON'T TOUCH</h4>
</body></html>`, { url:'https://protradingroom.com/ptrApp#/page/manageSession/abc', runScripts:'outside-only', pretendToBeVisual:true });
const { window } = dom;
// Make the tab links behave like Bootstrap tabs so the pane can actually change.
for (const a of window.document.querySelectorAll('a[data-toggle=tab]')) {
  a.addEventListener('click', () => {
    for (const p of window.document.querySelectorAll('.tab-pane')) p.classList.remove('active');
    window.document.querySelector(a.getAttribute('href')).classList.add('active');
  });
}
window.URL.createObjectURL = () => 'blob:stub';
window.URL.revokeObjectURL = () => {};
let dl=null; const rc = window.document.createElement.bind(window.document);
window.document.createElement = t => { const e = rc(t); if (t==='a') e.click = () => (dl = e.download); return e; };
let cap=null; window.Blob = class { constructor(p){ cap = p[0]; } };
try {
  await window.eval(`(async () => { ${src} })()`);
  await new Promise(r => setTimeout(r, 12000));
  const out = JSON.parse(cap);
  console.log('RAN OK — download:', dl);
  console.log('  settings.paneChanged   :', out.targets.settings?.paneChanged);
  console.log('  settings.fieldCount    :', out.targets.settings?.fieldCount);
  console.log('  settings.settledAfterMs:', out.targets.settings?.settledAfterMs);
  console.log('  refusedClicks          :', JSON.stringify(out.refusedClicks));
  console.log('  openMenus              :', (out.targets.openMenus||[]).length);
} catch (e) { console.log('THREW:', e.message); console.log((e.stack||'').split('\n').slice(0,3).join('\n')); }
