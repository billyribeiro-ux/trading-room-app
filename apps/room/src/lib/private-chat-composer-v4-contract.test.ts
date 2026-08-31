import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';

import { composerEnterAction, composerEnterPrevents } from './chat-composer-enter.js';
import PrivateChatComposer from './components/PrivateChatComposer.svelte';

/**
 * `PrivateChatComposer.svelte` against the PINNED v4 bundle, decoded by value.
 *
 * ## Why `render` from `svelte/server` and not a mount
 *
 * Because what is being checked is MARKUP — which element, which parent, which words — and every
 * one of those questions is answered by the string SSR produces. Mounting would add jsdom, a
 * hydration pass and an `{@attach}` that never runs there anyway, all to read back the same
 * attributes.
 *
 * ## Why the bundle is opened rather than quoted
 *
 * The component used to carry its const table as a fenced block in a comment, and a fenced block is
 * a number nothing checks — which is how `65` came to be described as "57's popover attributes plus
 * a font-size" when const 60/65 carry a tooltip 57 has not, a different `placement`, and
 * `triggers: "manual"`. Every const below is asserted against the file.
 */
const BUNDLE = readFileSync(
  new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url),
  'utf8'
);

const COMPOSER = readFileSync(
  new URL('./components/PrivateChatComposer.svelte', import.meta.url),
  'utf8'
);

describe('the const table this composer transcribes, by value', () => {
  /*
    Full entries, not fragments. `toContain('textAreaBtnsCol')` is answered by any string that has
    those letters in it somewhere — including a longer class list in another component — which is
    the substring trap this repository keeps re-learning.
  */
  it.each([
    ['50 — the holder', '["id","textAreaHolderPM",1,"textSendDiv"]'],
    ['52 — the inner row', '[1,"d-flex","mx-0"]'],
    ['53 — the webinar notice', '[1,"px-1","webinarMode"]'],
    ['54 — the textarea wrapper', '[1,"flex-fill","px-0"]'],
    [
      '55 — the textarea',
      '["name","txt-area","id","textAreaTxtPM","rows","1","spellcheck","true","placeholder","Type your message here...",1,"txt-area","form-control",3,"keyup","paste","focus"]'
    ],
    [
      '56 — the button column',
      '[1,"justify-content-center","align-items-center","d-flex","flex-row","p-0","m-0","text-center","textAreaBtnsCol"]'
    ],
    [
      '57 — the emoji span',
      '["placement","auto","container","body","autoClose","outside","popoverClass","popOverDiv",1,"textAreaBtns",3,"click","ngbPopover"]'
    ],
    ['58 — the emoji icon', '["placement","left","ngbTooltip","Add Emojis",1,"far","fa-smile"]'],
    [
      '61 — the webinar tooltip, on its own span',
      '["placement","top","ngbTooltip","In webinar mode users only see their own chat messages, while Presenters see everyones messages...",1,"ml-2"]'
    ],
    ['62 — the webinar icon, which carries no margin', '[1,"fas","fa-question-circle"]'],
    ['63 — the image-upload span', '[1,"textAreaBtns",3,"click"]'],
    [
      '64 — the image-upload icon',
      '["ngbTooltip","Upload an Image","placement","left",1,"fas","fa-image"]'
    ],
    [
      '65 — the GIF span, which is NOT 57 plus a style',
      '["ngbTooltip","Search for GIFs","placement","top-right","container","body","autoClose","outside","popoverClass","popOverDiv","triggers","manual",1,"textAreaBtns",2,"font-size","12px",3,"click","ngbPopover"]'
    ]
  ])('%s', (_name, entry) => {
    expect(BUNDLE).toContain(entry);
  });

  it('pins `lEe`, the webinar notice, whose FIRST child is two words', () => {
    /*
      `v(1," Webinar Mode ")` is the whole reason this row existed: the notice rendered here as a
      bare question mark, and the words are what a member in webinar mode is meant to read.
    */
    expect(BUNDLE).toContain(
      'function lEe(t,n){1&t&&(d(0,"div",53),v(1," Webinar Mode "),d(2,"span",61),T(3,"i",62),u(),T(4,"i"),u())}'
    );
  });

  it('pins where `lEe` sits — before the textarea wrapper, not in the button column', () => {
    expect(BUNDLE).toContain(
      'd(0,"div",50)(1,"div",52),H(2,lEe,5,0,"div",53),d(3,"div",54)(4,"textarea",55)'
    );
  });
});

describe('the three-way Enter branch, decoded from all six onKey implementations', () => {
  /**
   * Five of the six are this shape. The sixth — the inline alert box at 2,047,549 — differs only in
   * its SEND arm, which is the opposite of what `inline-alert-key.ts` states as the reason that box
   * is different. Its Shift arm is `i.val(i.val())` too.
   */
  const CHAT_SHAPE =
    'e.shiftKey?(i.val(i.val()),this.autoExpand(e.target)):e.altKey?(i.val(i.val()+"\\n"),this.autoExpand(e.target)):(this.showEmojiChooser=!1,this.sendMessage(),this.autoExpand(e.target))';

  it('finds that shape exactly five times', () => {
    expect(BUNDLE.split(CHAT_SHAPE).length - 1).toBe(5);
  });

  it('pins the private composer as one of them', () => {
    expect(BUNDLE).toContain(`const i=Ao("#textAreaTxtPM");${CHAT_SHAPE}`);
  });

  it('pins the alert box as the one that is NOT — and its Shift arm is still a no-op', () => {
    expect(BUNDLE).toContain(
      'const i=$("#textAreaAlertTxt");if(e.shiftKey)i.val(i.val());else{if(!e.altKey)return'
    );
  });

  it.each([
    ['plain Enter sends', { key: 'Enter' }, 'send'],
    ['Alt+Enter is the newline', { key: 'Enter', altKey: true }, 'newline'],
    ['Shift+Enter SWALLOWS', { key: 'Enter', shiftKey: true }, 'swallow'],
    [
      'Shift wins over Alt, as the nested ternary does',
      { key: 'Enter', shiftKey: true, altKey: true },
      'swallow'
    ],
    ['anything else is not ours', { key: 'a' }, 'ignore']
  ])('%s', (_name, event, expected) => {
    expect(composerEnterAction(event)).toBe(expected);
  });

  it('prevents the default on every Enter and on nothing else', () => {
    expect(composerEnterPrevents('send')).toBe(true);
    expect(composerEnterPrevents('newline')).toBe(true);
    expect(composerEnterPrevents('swallow')).toBe(true);
    expect(composerEnterPrevents('ignore')).toBe(false);
  });
});

describe('the rendered composer', () => {
  const props = {
    draft: '',
    canPostImages: true,
    webinarMode: true,
    giphyApiKey: 'k',
    onsend: () => {},
    onfocus: () => {},
    onimageupload: () => {},
    onselectgif: () => {},
    onemoji: () => {}
  };

  const body = render(PrivateChatComposer, { props }).body;

  it('says "Webinar Mode" — the two words the notice is for', () => {
    expect(body).toContain('Webinar Mode');
  });

  it('puts the notice in a DIV with const 53s two classes, not a span', () => {
    expect(body).toMatch(/<div class="px-1 webinarMode"/);
  });

  it('puts the notice BEFORE the textarea, which is where const 52s children put it', () => {
    const notice = body.indexOf('webinarMode');
    const textarea = body.indexOf('id="textAreaTxtPM"');
    const buttons = body.indexOf('textAreaBtnsCol');
    expect(notice).toBeGreaterThan(-1);
    expect(textarea).toBeGreaterThan(-1);
    expect(buttons).toBeGreaterThan(-1);
    expect(notice).toBeLessThan(textarea);
    expect(notice).toBeLessThan(buttons);
  });

  it('gives ml-2 and the tooltip to the wrapping span, and the icon neither', () => {
    expect(body).toContain('class="ml-2"');
    expect(body).toContain('<i class="fas fa-question-circle"></i>');
  });

  it('renders no notice at all when the room is not in webinar mode', () => {
    expect(
      render(PrivateChatComposer, { props: { ...props, webinarMode: false } }).body
    ).not.toContain('webinarMode');
  });

  it('keeps the textarea attributes const 55 states', () => {
    expect(body).toContain('name="txt-area"');
    expect(body).toContain('spellcheck="true"');
    expect(body).toContain('class="txt-area form-control"');
  });

  /**
   * PCC-02 and PCC-08 — which arm closes the emoji panel, and which deliberately does not.
   *
   * ## This block exists because a negative control came back GREEN
   *
   * Deleting `composerPopover = null` from the send arm changed nothing in this suite: the
   * behaviour had been written and never guarded. Neither half is visible to a server render — one
   * is a keystroke, the other a click inside a popover — so both are read off the source, which is
   * the same shape `speech-reco-overlay-v4-contract` uses for its suppression count. The bundle
   * assertions beside them are what say the source is right rather than merely stable.
   */
  it('closes the emoji panel on SEND, as the capture s send arm does first', () => {
    expect(BUNDLE).toContain('this.showEmojiChooser=!1,this.sendMessage()');
    expect(COMPOSER).toContain('composerPopover = null;\n          onsend();');
  });

  it('leaves it OPEN across a selection, because `selectEmoji` never touches the flag', () => {
    expect(BUNDLE).toContain(
      'selectEmoji(e){console.log(e);let i=Ao("#textAreaTxtPM").val()+e.emoji.native;Ao("#textAreaTxtPM").val(i),this.selectedEmoji=e.emoji}'
    );
    expect(COMPOSER).toContain('onselect={(glyph) => onemoji(glyph)}');
    /* The GIF picker is the other way round — `sendGif` closes its popover first (byte 2,214,017). */
    expect(BUNDLE).toContain('this.giphySearchPopOver&&this.giphySearchPopOver.close()');
    expect(COMPOSER).toContain('onselectgif(title, url);\n              composerPopover = null;');
  });

  it('passes the private surfaces own Giphy geometry down', () => {
    /*
      GIF-01 and GIF-02 are per-surface values, and the composer is where this surface states them.
      Read off the source rather than the render, because the picker only mounts once its popover is
      open and a server render has no click.
    */
    expect(COMPOSER).toContain('panelHeight="400px"');
    expect(COMPOSER).toContain('searchButton={false}');
  });
});
