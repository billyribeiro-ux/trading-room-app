import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  inlineAlertKeyAction,
  inlineAlertKeyPrevents,
  inlineAlertPosts
} from './inline-alert-key.js';
import { RoomAlerts } from './room/alerts.svelte';
import { RoomAlertsPane } from './room/alerts-pane';
import { RoomDialogs } from './room/dialogs.svelte';

/**
 * The inline alert entry — `acA-01`, a checkbox that controlled nothing.
 *
 * ## What was there
 *
 * `AlertChatArea` has drawn "Show inline alert entry" since it was built, bound to
 * `alerts.inlineEntry`, and `RoomAlerts` has held the flag. **Nothing rendered the field.** The
 * captured CSS for all three of its selectors — `#textAreaAlertHolder`, `.txt-area-alert`,
 * `.inline-alert-entry-field` — was already bridged in `styles/captured-runtime-components.css`, so
 * a stylesheet sat waiting for markup that did not exist.
 *
 * ## The reference, decoded with its own consts
 *
 * `O(20, o.showAlertsEntry ? 20 : -1)` at byte 2,056,748, template `H2e` at 2,044,139:
 *
 * ```
 * 20  [1,"w-100","inline-alert-entry-field"]
 * 52  ["id","textAreaAlertHolder",1,"p-1"]
 * 53  ["name","txt-area-alert","id","textAreaAlertTxt","rows","1","spellcheck","true",
 *      "placeholder","Type your alert here..",1,"txt-area-alert","form-control","border-0",
 *      3,"keyup","paste"]
 * ```
 *
 * ## THE KEY RULES ARE NOT THE CHAT COMPOSER'S, and that is the part worth reading twice
 *
 * ```js
 * onKey(e) {                                                        // byte 2,047,478
 *   if (13 == e.keyCode) {
 *     e.preventDefault();
 *     const i = $("#textAreaAlertTxt");
 *     if (e.shiftKey) i.val(i.val());                               // ← a NO-OP
 *     else {
 *       if (!e.altKey) return i.val().trim() && emit("inlineAlertEntry", i.val()),
 *                             i.val(""), i.height("23px"), !1;
 *       i.val(i.val() + "\n")                                       // ← ALT+Enter
 *     }
 *   }
 * }
 * ```
 *
 * **Enter posts. Alt+Enter inserts a newline. Shift+Enter does NOTHING** — the default is prevented
 * and the value is reassigned to itself, so the newline is swallowed. One column over, in chat,
 * Shift+Enter *is* the newline. Reproduced rather than harmonised: "fixing" it would post an alert
 * where a presenter expected a line break.
 */

const PANE = readFileSync(new URL('./components/AlertChatArea.svelte', import.meta.url), 'utf8');
const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
const COMPOSER = readFileSync(new URL('./room/composer.svelte.ts', import.meta.url), 'utf8');
const CSS = readFileSync(
  new URL('./styles/captured-runtime-components.css', import.meta.url),
  'utf8'
);
/* Comments stripped — this file and the component both quote the handler they are asserting on. */
const strip = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
const paneCode = strip(PANE);
const pageCode = strip(PAGE);
const composerCode = strip(COMPOSER);

describe('the field', () => {
  it('is drawn behind the flag the checkbox has always written', () => {
    expect(paneCode).toContain('{#if isPresenter && alerts.inlineEntry}');
  });

  it('carries the reference s three consts, attribute for attribute', () => {
    expect(paneCode).toContain('<div class="w-100 inline-alert-entry-field">');
    expect(paneCode).toContain('<div id="textAreaAlertHolder" class="p-1">');
    expect(paneCode).toContain('id="textAreaAlertTxt"');
    expect(paneCode).toContain('class="txt-area-alert form-control border-0"');
    expect(paneCode).toContain('placeholder="Type your alert here.."');
    expect(paneCode).toContain('spellcheck="true"');
  });

  it('meets a stylesheet that was already waiting for it', () => {
    /*
      The captured rules were bridged before the markup existed — which is what made this an
      `orphan-style-contract` candidate rather than an invisible gap.
    */
    expect(CSS).toContain('.inline-alert-entry-field');
  });

  it('binds BOTH events the reference binds — `keyup` and `paste`', () => {
    /*
      `onkeydown` rather than `onkeyup`, and that is the one place the binding differs: `keyup` fires
      AFTER the character has been inserted, so a `preventDefault` there cannot stop a newline —
      upstream compensates by reassigning the value, which is why its Shift branch exists at all.
      `onkeydown` prevents it properly and produces the same three outcomes.
    */
    expect(paneCode).toContain('onkeydown={onInlineAlertKey}');
    expect(paneCode).toContain('onpaste={onInlineAlertPaste}');
  });
});

describe('the three Enter outcomes', () => {
  /*
    EXECUTED against the real rule. It was transcribed into this file first — four branches copied
    out of the component so they could be run — and that is the copy this repository refuses: two
    implementations of one rule, joined by nothing. `#lib/inline-alert-key.ts` is the extraction, and
    the component now calls it, so these cases drive the shipped code.
  */
  it('Enter POSTS', () => {
    expect(inlineAlertKeyAction({ key: 'Enter' })).toBe('post');
  });

  it('ALT+Enter inserts a newline', () => {
    expect(inlineAlertKeyAction({ key: 'Enter', altKey: true })).toBe('newline');
  });

  it('SHIFT+Enter SWALLOWS — no newline, no post', () => {
    /*
      The branch that reads as a bug. `i.val(i.val())` after `preventDefault` is a no-op, so the
      newline is swallowed — the OPPOSITE of the chat composer one column over. This case exists
      because the obvious "fix" is to make it a newline, and that would post an alert where a
      presenter expected a line break.
    */
    expect(inlineAlertKeyAction({ key: 'Enter', shiftKey: true })).toBe('swallow');
  });

  it('SHIFT wins over ALT, because the reference tests it first', () => {
    expect(inlineAlertKeyAction({ key: 'Enter', shiftKey: true, altKey: true })).toBe('swallow');
  });

  it('any other key is ignored', () => {
    for (const key of ['a', 'Escape', 'Tab', 'Shift']) {
      expect(inlineAlertKeyAction({ key }), key).toBe('ignore');
    }
  });

  it('every Enter prevents the default, and nothing else does', () => {
    /*
      `swallow` and `ignore` are different answers even though neither changes the text: the first
      prevents the browser's default and the second must not. Collapsing them puts a newline back on
      Shift+Enter, which is the one behaviour this module exists to pin.
    */
    expect(inlineAlertKeyPrevents('post')).toBe(true);
    expect(inlineAlertKeyPrevents('newline')).toBe(true);
    expect(inlineAlertKeyPrevents('swallow')).toBe(true);
    expect(inlineAlertKeyPrevents('ignore')).toBe(false);
  });

  it('a box of whitespace posts NOTHING — and the caller still clears it', () => {
    /*
      `i.val().trim() && emit(...)` is inside the guard; `i.val("")` is outside it. Two behaviours in
      one line, and only the pair is the reference — which is why the module answers "does this
      post?" separately from what the component then does.
    */
    expect(inlineAlertPosts('   ')).toBe(false);
    expect(inlineAlertPosts('')).toBe(false);
    expect(inlineAlertPosts(' AAPL ')).toBe(true);
  });

  it('and the component clears unconditionally while posting only when it should', () => {
    const at = paneCode.indexOf('function onInlineAlertKey');
    expect(at, 'the handler must exist').toBeGreaterThan(-1);
    const closes = paneCode.indexOf('\n  }', at);
    expect(closes, 'the handler must be closed').toBeGreaterThan(at);
    const body = paneCode.slice(at, closes);

    expect(body).toContain('if (inlineAlertKeyPrevents(action)) event.preventDefault();');
    /* The clear comes BEFORE the post test, which is what makes a whitespace box empty silently. */
    expect(body.indexOf("inlineAlertText = ''")).toBeLessThan(
      body.indexOf('if (inlineAlertPosts(body))')
    );
    /* The RAW value travels, not the trimmed one — the trim is only the test. */
    expect(body).toContain('oninlinealert(body);');
  });
});

describe('the paste', () => {
  it('clears the box BEFORE the confirmation, which is upstream s order', () => {
    /*
      `emit("inlineAlertEntryImage", {event, alertTxt: o}); i.val("")` — the text travels WITH the
      event, so it is the only copy by the time anything asks for it.
    */
    const at = paneCode.indexOf('function onInlineAlertPaste');
    expect(at, 'the handler must exist').toBeGreaterThan(-1);
    const closes = paneCode.indexOf('\n  }', at);
    expect(closes, 'the handler must be closed').toBeGreaterThan(at);
    const body = paneCode.slice(at, closes);

    expect(body).toContain('pastedImageFrom(event.clipboardData?.items)');
    expect(body.indexOf("inlineAlertText = ''")).toBeLessThan(body.indexOf('oninlinealertimage('));
  });

  it('becomes an ALERT and not a chat message', () => {
    /*
      The subscriber upstream is the post-alert MODAL (byte 2,125,263), so the pasted image goes
      down the alert path. One pending paste and one dialog serve both, because upstream has exactly
      one of each — `target` is what carries the difference.
    */
    expect(composerCode).toContain('beginAlertImagePaste(file: File, alertText: string)');
    expect(composerCode).toContain("this.beginImagePaste(file, 'alert')");
    expect(composerCode).toContain("if (pending.target === 'alert')");
    expect(composerCode).toContain('await this.postPastedImage({');
  });

  it('seeds the dialog from the ALERT box, never from the chat composer', () => {
    expect(composerCode).toContain(
      "this.#pastedImageMessage = target === 'chat' ? this.#chat.composer.trim() : '';"
    );
  });
});

describe('the toggle', () => {
  it('persists the flag and pulls the log back, which are upstream s two halves', () => {
    const alerts = new RoomAlerts({ alertFilterFor: {}, showAlertsFrom: false, archivedAt: null });
    const saved: [string, unknown][] = [];
    const scroller = { id: 'alerts' } as unknown as HTMLElement;
    const pulled: HTMLElement[] = [];

    const pane = new RoomAlertsPane({
      alerts,
      dialogs: new RoomDialogs(),
      prefs: { save: (key: string, value: unknown) => saved.push([key, value]) } as never,
      feeds: { visibleAlerts: [], searchableAlerts: [] },
      alertsScroller: () => scroller,
      forceAlertsToBottom: (node) => pulled.push(node),
      sessionHandle: () => 'room-1',
      setChatAlertsDetached: () => {}
    });

    pane.toggleInlineEntry(true);

    expect(alerts.inlineEntry).toBe(true);
    expect(saved).toEqual([['showAlertsEntry', true]]);
    // The field shortens the scroller, so the newest alert would otherwise be left off screen.
    expect(pulled).toEqual([scroller]);

    pane.toggleInlineEntry(false);
    expect(alerts.inlineEntry).toBe(false);
    expect(saved.at(-1)).toEqual(['showAlertsEntry', false]);
  });

  it('is seeded from the stored preference, so the box survives a reload', () => {
    /*
      It was ephemeral `$state`: a presenter who opened the box got it closed again on the next
      load. Upstream reads it back in `ngOnInit` (byte 2,044,987).
    */
    expect(
      new RoomAlerts({
        alertFilterFor: {},
        showAlertsFrom: false,
        archivedAt: null,
        inlineEntry: true
      }).inlineEntry
    ).toBe(true);
    expect(
      new RoomAlerts({ alertFilterFor: {}, showAlertsFrom: false, archivedAt: null }).inlineEntry
    ).toBe(false);
    expect(
      readFileSync(new URL('./room/create-room.svelte.ts', import.meta.url), 'utf8')
    ).toContain('inlineEntry: prefs.loaded.showAlertsEntry === true');
  });

  it('is a callback and not a `bind:`, because a bind could do neither half', () => {
    expect(paneCode).toContain(
      'onchange={(event) => oninlineentrytoggle(event.currentTarget.checked)}'
    );
    expect(paneCode).not.toContain('bind:checked={alerts.inlineEntry}');
    expect(pageCode).toContain(
      'oninlineentrytoggle={(open) => alertsPane.toggleInlineEntry(open)}'
    );
  });
});

describe('what the posted alert carries', () => {
  it('is a plain TEXT alert with the composer s defaults, and that divergence is recorded', () => {
    /*
      Upstream's subscriber is `selectedTab = "text", alertTxt = i, this.postAlert()` — the MODAL's
      own method, so the inline box inherits whatever that modal was last left holding. A presenter
      who ticked "Don't send to push" an hour ago silently gets it again from a box in a different
      column, with nothing on screen saying so. This room posts a plain alert; the modal is where
      those five decisions are made and where they are visible.
    */
    const at = composerCode.indexOf('async postInlineAlert(');
    expect(at, 'postInlineAlert must exist').toBeGreaterThan(-1);
    const closes = composerCode.indexOf('\n  }', at);
    expect(closes, 'postInlineAlert must be closed').toBeGreaterThan(at);
    const body = composerCode.slice(at, closes);

    expect(body).toContain("tab: 'text'");
    expect(body).toContain('dontPush: false');
    expect(body).toContain('nonTradeAlert: false');
    expect(body).toContain('postOnX: false');
    expect(body).toContain('legalDisclosure: false');
    /* Everything goes down `postAlert`, the one path that owns the refusal and the toast. */
    expect(body).toContain('return this.postAlert({');
  });
});
