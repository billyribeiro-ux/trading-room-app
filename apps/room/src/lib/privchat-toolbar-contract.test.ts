import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  The private-chat toolbar, and where DND can actually be reached from.

  The reported symptom was "DND is not showing for members". Measured in the running room, it was:
  both roles get `#app-donot-disturb`, and ticking it raises all three badges with the captured
  classes. The badges were never the problem.

  What was missing is the toolbar the capture hangs off the private-chat gear. `app-privchat`'s
  template binds the gear to `togglePMToolbar()` and renders, gated on `O(14, o.showPMToolbar ? 14
  : -1)`, a `pmToolbar` holding a search input and TWO buttons - "Don't Disturb" (`setDND()`) and
  "Download Log" (`downloadLog()`). That is the only place in the whole capture where `setDND` is
  bound to anything: `app-chat` defines the identical method and never references it from a
  template.

  Also pinned here: DND is deliberately NOT persisted. `doNotDisturbOnChange()` flips the flag and
  returns, while the method immediately before it ends in `savePreference(...)`. There is no
  `Preference("doNotDisturbOn"` anywhere in the bundle. An early `return` before the save looks like
  a bug and is the captured behaviour.
*/

const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
const main = readFileSync(
  new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  'utf8'
);
const privchat = readFileSync(
  new URL('../../docs/source/components/app-privchat.full.js', import.meta.url),
  'utf8'
);
const chat = readFileSync(
  new URL('../../docs/source/components/app-chat.full.js', import.meta.url),
  'utf8'
);

describe('DND is session-only, by capture', () => {
  it('is never handed to the preference saver', () => {
    expect(main).not.toContain('Preference("doNotDisturbOn');
    expect(main).toContain(
      'doNotDisturbOnChange(){this.appService.globals.preferences.doNotDisturbOn=!this.appService.globals.preferences.doNotDisturbOn}'
    );
  });

  it('keeps the early return that skips savePreference', () => {
    const at = page.indexOf("if (input.id === 'app-donot-disturb')");
    expect(at).toBeGreaterThan(-1);
    // The branch assigns and returns; it must not reach the savePreference below it.
    const branch = page.slice(at, page.indexOf('}', at));
    expect(branch).toContain('doNotDisturbOn = input.checked');
    expect(branch).toContain('return');
    expect(branch).not.toContain('savePreference');
  });
});

describe('setDND is bound in privchat only', () => {
  it('is wired to a template there and nowhere in app-chat', () => {
    expect(privchat).toContain('E(g().setDND())');
    expect(chat).toContain('setDND() {');
    expect(chat).not.toContain('E(g().setDND())');
  });
});

describe('the private-chat toolbar', () => {
  it('renders behind the gear, with the captured container classes', () => {
    expect(privchat).toContain('O(14, o.showPMToolbar ? 14 : -1)');
    expect(privchat).toContain('o.togglePMToolbar()');
    expect(page).toContain('showPMToolbar = !showPMToolbar');
    expect(page).toContain('shadow p-2 w-100 border-top border-secondary pmToolbar');
  });

  it('carries the search field with its captured attributes', () => {
    expect(page).toContain('id="pmSearchTermTxt"');
    expect(page).toContain('name="pmSearchTermTxt"');
    expect(page).toContain('placeholder="Type your search term, then press Enter"');
    expect(page).toContain('id="addon-chat-clear"');
  });

  it("carries Don't Disturb and Download Log with their captured classes", () => {
    expect(page).toContain('btn btn-outline-light btn-sm text-light');
    expect(page).toContain("Don't Disturb");
    expect(page).toContain('btn btn-outline-info btn-sm text-light mx-1');
    expect(page).toContain('Download Log');
    expect(page).toContain('fas fa-download');
  });
});

describe('all three DND badges', () => {
  it('keep the classes their own components declare', () => {
    // app-chat const 11 and app-privchat const 9 are both `badge badge-danger ml-2`; alerts is ms-2.
    expect(page).toContain('class="badge badge-danger ms-2"');
    expect(page).toContain('class="badge badge-danger ml-2"');
    expect(page).toContain('<i class="fas fa-bell-slash"></i> DND');
  });
});
