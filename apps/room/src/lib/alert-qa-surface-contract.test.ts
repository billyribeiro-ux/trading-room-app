import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments';

/**
 * `QAM-01` … `QAM-13` — the alert Q&A modal, audited against the pinned v4 bundle on 2026-08-31.
 *
 * ## Every offset is re-read here rather than trusted
 *
 * A cited byte offset in a document has been wrong more than once in this repository, and a wrong
 * one reads exactly like a right one. So each row below SLICES the bundle at the offset it names
 * and compares the bytes. The bundle's own length is asserted first: read the wrong file and every
 * number below is meaningless, which is what that assertion exists to prevent.
 *
 * ## Where the subjects live, and why that is three files
 *
 * `AlertQaModal.svelte` reached its `source-size-contract` ceiling on 2026-08-31 and two seams came
 * out of it — `AlertQaAlertCard.svelte` (the reference's `e3e`, called once) and
 * `AlertQaComposer.svelte` (its footer). This file reads all three, so a region moving between them
 * fails a POSITIVE assertion here rather than quietly turning a `not.toContain` green, which is the
 * trap `source-size-contract.test.ts` records in full.
 */

const read = (name: string) => readFileSync(new URL(name, import.meta.url), 'utf8');

const MODAL = codeOf('components/AlertQaModal.svelte', read('./components/AlertQaModal.svelte'));
const CARD = codeOf(
  'components/AlertQaAlertCard.svelte',
  read('./components/AlertQaAlertCard.svelte')
);
const COMPOSER = codeOf(
  'components/AlertQaComposer.svelte',
  read('./components/AlertQaComposer.svelte')
);
const COMPOSER_RAW = read('./components/AlertQaComposer.svelte');
const CAPTURED_CSS = read('./styles/captured-runtime-components.css');
const BUNDLE = read('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js');

/** Where `QAM-05`'s two handlers are wired, and where the register's wrong prescription would show. */
const OVERLAYS = codeOf('components/RoomOverlays.svelte', read('./components/RoomOverlays.svelte'));

/** See the same helper in `extra-chat-surface-contract.test.ts` for why the length is derived. */
const at = (offset: number, expected: string) => BUNDLE.slice(offset, offset + expected.length);

describe('the bundle these rows were read from', () => {
  it('is the pinned one — the vacuity floor for every offset below', () => {
    expect(BUNDLE.length).toBe(2_891_205);
  });

  it('and the offsets sit inside `app-alert-qa-modal`', () => {
    const selector = BUNDLE.indexOf('selectors:[["app-alert-qa-modal"]]');
    expect(selector, 'the Q&A modal is not in this bundle').toBeGreaterThan(-1);
    /* Its consts table, which several rows below decode by value. */
    expect(BUNDLE.slice(selector, selector + 2_000)).toContain('["qaContainer",""]');
  });
});

describe('QAM-01 — a Q&A thread shows a date separator when it crosses a day', () => {
  it('is `prevD` in the reference, passed by both renderers', () => {
    const prevD = '("prevD",i>0?o.msgs[i-1].t:0)';
    expect(at(2_332_963, prevD)).toBe(prevD);
    expect(at(2_333_284, prevD)).toBe(prevD);
  });

  it('and `app-st-message` turns it into the flag its separator is gated on', () => {
    const isND = 'this.isND=this.msg.t.getDay()!=this.prevD.getDay()';
    expect(at(1_346_064, isND)).toBe(isND);
    const gate = 'O(2,o.isND?2:-1)';
    expect(at(1_361_572, gate)).toBe(gate);
  });

  it('so the modal computes it per entry instead of hardcoding false', () => {
    expect(MODAL).toContain('showDateSeparator={showsDateSeparator(index)}');
    expect(MODAL).not.toContain('showDateSeparator={false}');
    expect(MODAL).toContain('function showsDateSeparator(index: number)');
    /* The first entry has no predecessor, which is the `i > 0 ? … : 0` half. */
    expect(MODAL).toContain('if (index === 0) return false;');
  });

  it('and compares the calendar day rather than reproducing the reference’s weekday bug', () => {
    /*
      `getDay()` is the day of the WEEK, so two entries exactly seven days apart compare equal
      upstream and the separator is skipped. `sameCalendarDay` compares year, month and date, and it
      is the same helper both chat columns already use.
    */
    expect(MODAL).toContain('sameCalendarDay');
    expect(MODAL).not.toContain('getDay()');
  });
});

describe('QAM-02 — the composer is emptied when the modal opens on a different alert', () => {
  it('is what the `openModal` half of the subscription does', () => {
    const clear = 'this.modalId=e._id,yi("#textAreaQATxt").val("")';
    expect(at(2_334_927, clear)).toBe(clear);
  });

  it('so the modal clears it on the transition, keyed by the alert', () => {
    expect(MODAL).toContain('let openedAlertId: number | null = null;');
    expect(MODAL).toContain('if (openedAlertId === id) return;');
    expect(MODAL).toContain("qaComposer = '';");
  });

  it('and the marker is a plain field, because nothing renders from it', () => {
    /*
      An effect that reads its own marker reactively re-runs on the write that was meant to end it.
      `$state` on this line would be that shape; the absence is asserted next to the positive above
      so it cannot pass by the whole block having gone.
    */
    expect(MODAL).not.toContain('let openedAlertId = $state');
  });
});

describe('QAM-03 — the thread opens on its newest entry', () => {
  it('is `scrollToBottomQA` in the reference', () => {
    const scroll = 'scrollToBottomQA(){const e=this;try{setTimeout(()=>{';
    expect(at(2_335_916, scroll)).toBe(scroll);
  });

  it('over a `.modal-body` that really does scroll', () => {
    const styles = '#alertQAModal[_ngcontent-%COMP%]   .modal-body[_ngcontent-%COMP%]{min-height';
    expect(at(2_344_478, styles)).toBe(styles);
    /* And the transcription this room already carries, which is why QAM-07 removes the inline copy. */
    expect(CAPTURED_CSS).toContain('app-alert-qa-modal #alertQAModal:not(:root) .modal-body');
    expect(CAPTURED_CSS).toContain('overflow-y: auto;');
  });

  it('so the modal scrolls it, after the DOM has the new rows', () => {
    expect(MODAL).toContain("host?.querySelector('.modal-body')");
    expect(MODAL).toContain('body.scrollTop = body.scrollHeight;');
    expect(MODAL).toContain('void tick().then(');
    /* Reads the count so an ARRIVING question re-runs it, not only the modal opening. */
    expect(MODAL).toContain('const count = qaQuestions.length;');
  });

  it('and reaches the element with `bind:this` rather than a hand-rolled capture', () => {
    expect(MODAL).toContain('<app-alert-qa-modal bind:this={host}>');
    expect(MODAL).toContain('let host = $state<HTMLElement | null>(null);');
  });
});

describe('QAM-04 — the claim that the captured textarea had no handler was false', () => {
  it('const 17 declares three bindings, not zero', () => {
    const const17 =
      '["name","txt-area","id","textAreaQATxt","rows","1","spellcheck","true",1,"txt-area","form-control","border-0",3,"keyup","paste","placeholder"]';
    expect(at(2_342_103, const17)).toBe(const17);
  });

  it('and the template attaches two of them', () => {
    const bind = 'x("keyup",function(a){return D(s),E(o.onKey(a))})';
    expect(at(2_343_759, bind)).toBe(bind);
  });

  it('and `onKey` is the same three-way Enter branch every composer carries', () => {
    const onKey = 'onKey(e){if(13===e.keyCode){e.preventDefault();const i=yi("#textAreaQATxt")';
    expect(at(2_336_560, onKey)).toBe(onKey);
  });

  it('so the composer records the correction rather than deleting the sentence', () => {
    expect(COMPOSER_RAW).toContain('That is false, and it was measured false on 2026-08-31.');
    expect(COMPOSER).toContain("if (composerEnterAction(event) !== 'send') return;");
  });
});

describe('QAM-05 and QAM-06 — the image button acts, and the box takes a paste', () => {
  it('the reference wires the button to `imgUpload`', () => {
    const l3e =
      'function l3e(t,n){if(1&t){const e=Y();d(0,"span",36),x("click",function(){return D(e),E(g().imgUpload())})';
    expect(at(2_333_483, l3e)).toBe(l3e);
  });

  it('and gates it on `canPostImages`, which is wider than `isPresenter`', () => {
    const gate = 'O(23,o.canPostImages?23:-1)';
    expect(at(2_344_277, gate)).toBe(gate);
    const init = '(this.isPresenter||this.appService.globals.sessData.userUploads)';
    expect(at(2_334_626, init)).toBe(init);
  });

  it('and ours now acts, on the WIDER gate, with the paste bound beside it', () => {
    /*
      RE-DISPOSITIONED 2026-08-31. This used to assert `{#if isPresenter}` and
      `not.toContain('onpaste')` — a pair of tripwires holding the row open so it could not be
      closed silently. Both fired the moment it was built, which is this change's negative control
      already written.

      The gate is the half worth restating. `canPostImages` is `(isPresenter || userUploads)`, so
      `isPresenter` was NARROWER: a room with member uploads on offers this button to members
      upstream and offered it to nobody but presenters here. Asserting the absence of `isPresenter`
      around this node is what stops the narrow gate coming back — the prop still exists on the
      component and still drives the placeholder, which is a different question.
    */
    expect(COMPOSER).toContain("ngbtooltip: 'Upload an Image'");
    expect(COMPOSER_RAW).toContain('QAM-05');
    expect(COMPOSER_RAW).toContain('QAM-06');

    expect(COMPOSER).toContain('{#if canPostImages}');
    expect(COMPOSER).toContain('onclick={onimageupload}');
    expect(COMPOSER).toContain('onpaste={handleQaPaste}');

    /*
      The placeholder still asks the OTHER question, and it is the ONLY thing in the template that
      asks it. Counted over the template rather than the whole file, because the prop's declaration
      and its destructure are two more occurrences that say nothing about gating — a whole-file
      count would have to be edited every time the props list moves, which is how a number stops
      meaning anything.
    */
    const templateAt = COMPOSER.indexOf('</script>');
    expect(templateAt, 'the component must have a script block').toBeGreaterThan(0);
    const template = COMPOSER.slice(templateAt);
    expect(template).toContain(
      "placeholder={isPresenter ? 'Type your answer here...' : 'Type your question here...'}"
    );
    expect(template.split('isPresenter').length - 1).toBe(1);
  });

  it('routes BOTH to the Q&A reply path, not to the chat composer — the register said otherwise', () => {
    /*
      THE ROW'S PRESCRIBED ONE-LINE FIX WAS WRONG, AND THIS IS WHERE THAT IS PINNED.

      `QAM-05` proposed `onimageupload={() => composer.openImageUpload()}` — "the same path both
      chat composers already use". That path posts to CHAT. `doImggurUpload` on `app-alert-qa` ends
      in `sendAlertQAReply` against `qaMsg._id` and then hides the modal, so taking the prescription
      literally would have put a presenter's answer to one member's question into the room's public
      chat — the same failure `RoomOverlays` records for the swing form, with a worse blast radius.

      Asserted on the bundle AND on the wiring, because either alone is weak: the bundle half proves
      what upstream does, and the `RoomOverlays` half proves ours does not reach `composer`.
    */
    const tail =
      's.appService.sendAlertQAReply(s.qaMsg._id,s.imggurUploadTxt),s.imggurUploadTxt="",yi("#alertQAModal").modal("hide")';
    expect(BUNDLE).toContain(tail);

    /* A TEXT reply hides nothing — the asymmetry is upstream's and is reproduced. */
    const textReply =
      'this.appService.sendAlertQAReply(this.qaMsg._id,e),yi("#textAreaQATxt").val(""),this.scrollToBottomQA()';
    expect(BUNDLE).toContain(textReply);
    expect(textReply).not.toContain('modal("hide")');

    /*
      RE-POINTED 2026-08-31. The Q&A image path became a `PendingImagePost` instance when `RPL-03`
      needed the identical lifecycle for the reply modal and the ratchet refused the second copy —
      `beginQaImageUpload()` is `qaImage.beginUpload()` now. The GUARANTEE is unchanged and is the
      two `not.toContain`s below: whatever the method is called, it must not be the chat composer's.
    */
    expect(OVERLAYS).toContain('onQaImageUpload={() => messageActions.qaImage.beginUpload()}');
    expect(OVERLAYS).toContain(
      'onQaImagePaste={(file, draft) => messageActions.qaImage.begin(file, draft)}'
    );
    /* Neither reaches the chat composer's upload. */
    expect(OVERLAYS).not.toContain('onQaImageUpload={() => composer.');
    expect(OVERLAYS).not.toContain('onQaImagePaste={() => composer.');
  });
});

describe('QAM-07 — the inline body height duplicated a rule this room already carries', () => {
  it('is gone from the modal, and the rule it duplicated is not', () => {
    expect(MODAL).toContain('<Modal');
    expect(MODAL).not.toContain('bodyStyle=');
    expect(CAPTURED_CSS).toContain('max-height: 70vh;');
  });
});

describe('QAM-08 — the alert card is drawn only when there is an alert', () => {
  it('is the reference’s own gate', () => {
    const gate = 'O(7,o.qaMsg?7:-1)';
    expect(at(2_344_076, gate)).toBe(gate);
  });

  it('and `e3e` is the sub-template it gates, which is why the card is its own component', () => {
    const e3e = 'function e3e(t,n){if(1&t&&(d(0,"div",8)(1,"div",22)(2,"div",23)(3,"div",24)';
    expect(at(2_332_074, e3e)).toBe(e3e);
    expect(MODAL).toContain('alert={targetMessage}');
    expect(CARD).toContain('{#if alert}');
  });
});

describe('QAM-09 — the username keeps the reference’s two spaces', () => {
  it('is `Ne(" ", …, " ")` at the offset', () => {
    const name = 'Ne(" ",e.qaMsg.n," ")';
    expect(at(2_331_372, name)).toBe(name);
  });

  it('and the card renders them through the repository’s standing idiom', () => {
    expect(CARD).toContain("<strong class=\"username mx-1\">{' '}{alert.senderName}{' '}</strong>");
  });
});

describe('QAM-10 and QAM-11 — the body is piped and the avatar knows its sender', () => {
  it('the body pipe and its copy-trade branch are real', () => {
    const pipe = 'Tn(1,1,e.qaMsg.txt,"chat",e.qaMsg.avt,null)';
    expect(at(2_331_625, pipe)).toBe(pipe);
    const branch = 'O(0,g(2).appService.globals.sessData.copyTrades?0:1)';
    expect(at(2_332_021, branch)).toBe(branch);
  });

  it('and so is the avatar fallback that needs the sender’s hash', () => {
    const avatar = 'e.qaMsg.pic||"https://secure.gravatar.com/avatar/"+e.qaMsg.avt+"?d=mm&s=50"';
    expect(at(2_331_038, avatar)).toBe(avatar);
  });

  it('and the field that blocked both is now declared for this modal', () => {
    /*
      RE-DISPOSITIONED 2026-08-31. This asserted the ABSENCE of `targetUrl` and `senderEmailHash`
      from the host's `targetMessage` shape — the measurement the two rows rested on, pinned so it
      could not rot into prose. Both fired the moment the shape was widened, which is this change's
      negative control already written.

      Neither field was a new dependency, and that is the finding rather than the fix: `RoomOverlays`
      passes `messageActions.selected`, a full `MessageActionItem`, on which both are declared. The
      narrow shape was a declaration lagging its own data for as long as the rows were open.

      The slice is still bound to locals and asserted before use, which `slice-anchor-contract.test.ts`
      is the file about: a moved marker makes `indexOf` return -1 and `slice(-1)` yields one
      character, against which any `toContain` proves nothing either way.
    */
    const host = readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8');
    const shapeAt = host.indexOf('    targetMessage: {');
    expect(shapeAt, 'the targetMessage shape moved out of ModalHost').toBeGreaterThan(-1);
    const shape = host.slice(shapeAt);

    const shapeEnd = shape.indexOf('} | null;');
    expect(shapeEnd, 'the targetMessage shape is no longer a nullable object').toBeGreaterThan(-1);
    const declared = shape.slice(0, shapeEnd);

    expect(declared, 'the targetMessage shape was not found').toContain(
      'senderAvatarUrl?: string;'
    );
    expect(declared).toContain('targetUrl?: string | null;');
    expect(declared).toContain('senderEmailHash?: string;');

    /*
      And the RENDERER it exists for still reads exactly that field.

      RE-POINTED 2026-08-31 by `MSB-03`. This used to assert the DISPATCHER's guard —
      `if (action === 'image' && item.targetUrl)` — which was the wrong place to make this row's
      point and is now the wrong code besides. That guard resolved the url to open from the ROW, so a
      click on an inline image inside a chat message hit a false guard and did nothing, and a click
      inside an alert carrying an attachment opened the ATTACHMENT rather than the picture clicked.
      The url travels with the click now, from whichever element was pressed.

      What `QAM-10`/`QAM-11` actually need is unchanged and is what is asserted instead: the field is
      declared on the modal's `targetMessage` shape (above), and the component that draws the
      attachment reads it. If `targetUrl` ever stopped reaching the modal, this is still what fails —
      by way of the renderer, which is the thing that was blocked, rather than by way of a dispatcher
      branch that no longer decides anything.
    */
    const message = readFileSync(
      new URL('./components/RoomMessage.svelte', import.meta.url),
      'utf8'
    );
    expect(message).toContain("{#if kind === 'alert' && item.targetUrl}");
    expect(message).toContain("runAction('image', { url: item.targetUrl!, event })");
  });

  it('QAM-10 — the card renders the body through MessageBody, parsed as "chat"', () => {
    /*
      `"chat"`, not `"alerts"`, is the surprising half and the one worth pinning.
      `parseBodySegments` gates trade-order splitting on `copyTrades && kind === 'alert'` — the
      reference's own `"alerts" === i` — and the Q&A header is passed `"chat"`. So a `[{( … )}]`
      order that renders as a copyable trade in the log beneath the modal stays LITERAL text here.
      Asserted, because it is exactly the kind of detail a later reader "fixes".
    */
    expect(CARD).toContain('<MessageBody');
    expect(CARD).toContain("kind: 'chat',");
    expect(CARD).not.toContain("kind: 'alert'");
    /* Not the raw string any more. */
    expect(CARD).not.toContain('preText ml-2 mr-2 p-0">{alert.body}');
  });

  it('QAM-11 — the avatar falls back to THAT senders gravatar, not the shared mystery-man', () => {
    /*
      `||` and not `??`, matching `e.qaMsg.pic || "…"`: an empty-string `pic` must fall through to
      the gravatar, and `??` would keep the empty string and render a broken image.
    */
    expect(CARD).toContain('alert.senderAvatarUrl ||');
    expect(CARD).toContain("${alert.senderEmailHash ?? ''}?d=mm&s=50");
    expect(CARD).not.toContain("'https://secure.gravatar.com/avatar/?d=mm&s=50'");
  });
});

describe('QAM-13 — the compact renderer is already built one level down', () => {
  it('is a display-mode branch in the reference', () => {
    const branch = 'O(0,"r"==g().displayMode?0:1)';
    expect(at(2_333_453, branch)).toBe(branch);
  });

  it('and `RoomMessage` draws it, so the modal passes the mode and nothing else', () => {
    const message = readFileSync(
      new URL('./components/RoomMessage.svelte', import.meta.url),
      'utf8'
    );
    expect(message).toContain('<app-st-compactmessage>');
    expect(MODAL).toContain('{displayMode}');
  });
});
