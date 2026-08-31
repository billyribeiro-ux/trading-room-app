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
    onimagepaste: () => {},
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

describe('PCC-06 — the composer binds `paste`, and what the bundle actually says about it', () => {
  /*
    The row was BLOCKED on scope alone: the component could not take an `onimagepaste` prop that
    nothing passed — that is the scaffolding DPE rule 3 refuses — and the file that would pass it,
    `PrivateChatPanel.svelte`, belonged to another batch. One session owning both closes it.

    Everything below is read out of the pinned bundle at run time rather than quoted in a comment,
    for the reason this file's own header gives: a fenced block is a number nothing checks.
  */

  it('has `paste` in the composer const s binding section at all', () => {
    expect(BUNDLE).toContain(
      '["name","txt-area","id","textAreaTxtPM","rows","1","spellcheck","true","placeholder","Type your message here...",1,"txt-area","form-control",3,"keyup","paste","focus"]'
    );
  });

  it('binds it to `onImagePaste`, which is the whole reason the const entry matters', () => {
    expect(BUNDLE).toContain('("paste",function(o){return D(e),E(g(2).onImagePaste(o))})');
  });

  it('keeps assigning through the loop, so the LAST image wins — NOT the first', () => {
    /*
      THE ROW THAT FILED THIS SAID "takes the first `image/*`" AND THE BUNDLE SAYS OTHERWISE.

      `s=r.getAsFile()` is a plain assignment inside a `for…of` with no `break`, so every image item
      overwrites the previous one. That is identical to the chat composer's copy, which is why
      `pasted-image.ts` is one shared rule and not two loops — and it is the difference between a
      paste carrying a screenshot AND its text URL resolving to the picture or to the link.

      Asserted here rather than left as a corrected sentence in the register, because a sentence is
      what was wrong the first time.
    */
    expect(BUNDLE).toContain(
      'let s=null;for(const r of o)0===r.type.indexOf("image")&&(s=r.getAsFile());'
    );
    expect(BUNDLE).not.toContain('0===r.type.indexOf("image")&&(s=r.getAsFile(),break)');
  });

  it('seeds the dialog from THIS composer s trimmed text, into a textarea id of its own', () => {
    expect(BUNDLE).toContain('a=Ao("#textAreaTxtPM").val().trim()');
    /* `msg-text-pc`, where the chat copy is `msg-text`. One character of difference, two dialogs. */
    expect(BUNDLE).toContain(
      'id="msg-text-pc" name="msg-text-pc" placeholder="Enter your message"'
    );
    expect(BUNDLE).toContain('c=yield Ao("#msg-text-pc").val().trim()');
  });

  it('sends the URL FIRST and appends the message, clearing the box only when one travels', () => {
    /*
      The order is not the obvious one — every other messenger puts the message first — and the
      clear is conditional on `i`. Both are pinned because both are easy to write backwards.
    */
    expect(BUNDLE).toContain(
      'o||(i&&(s.imggurUploadTxt+=" "+i,Ao("#textAreaTxtPM").val("")),s.appService.sendPrivChat(s.currUser,s.imggurUploadTxt,s.recvdUser),s.imggurUploadTxt="")'
    );
  });

  it('and ours binds it, through the shared rule rather than a second loop', () => {
    expect(COMPOSER).toContain('onpaste={handlePaste}');
    expect(COMPOSER).toContain("import { pastedImageFrom } from '#lib/pasted-image.js';");
    expect(COMPOSER).toContain('const image = pastedImageFrom(event.clipboardData?.items);');
  });

  it('gates on `canPostImages`, which upstream does NOT — the divergence, asserted both ways', () => {
    /*
      The chat composer's copy opens with the guard and this one has no guard at all. Both halves
      are asserted: the ABSENCE upstream is what makes ours a divergence rather than a
      transcription, and a future capture that adds the guard should make this row re-read rather
      than leave the comment quietly describing a difference that stopped existing.
    */
    const pmHandlerAt = BUNDLE.indexOf('onImagePaste(e){const i=this,o=(e.clipboardData');
    /*
      The anchor is bound and checked before it is sliced with, which `slice-anchor-contract.test.ts`
      ratchets down for a reason this assertion would walk straight into: `indexOf` answers -1 when
      it fails, -1 is a valid `slice` argument, and the resulting "from the end" slice is a short
      tail of the bundle that contains no `canPostImages` either — a GREEN `not.toContain` proving
      nothing at all.
    */
    expect(pmHandlerAt).toBeGreaterThan(0);
    expect(BUNDLE.slice(pmHandlerAt, pmHandlerAt + 120)).not.toContain('canPostImages');
    /* And the chat copy, 764,000 bytes earlier, does have it. */
    expect(BUNDLE).toContain('if(!this.canPostImages)return!1');
    expect(COMPOSER).toContain('if (!canPostImages) return;');
  });
});
