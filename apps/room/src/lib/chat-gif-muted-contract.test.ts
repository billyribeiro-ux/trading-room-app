import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  `preferences.chatGif` — inline gifs play, or show a click-to-reveal placeholder.

  The behaviour is captured in two halves and neither is guessed.

  MARKUP, from the `urlwrapImg` pipe (`main.d6d3c112b59b7d0d.js` byte 1326105):

      urlwrapImg(e, i, o, s) {
        …if (!i && -1 !== r.indexOf('.gif')) {
          const c = s ? `gifExtra_${o}` : `gif_${o}`;
          l = `<div class="chat-gif-muted" id="${c}" onclick=showChatGif('${c}')>gif muted, click to show</div>`
        }
        return `${l}<div class="img-container ${l ? 'd-none' : ''}" …><img class="uploaded-img" …></div>`
      }

  `i` is `chatGif`. Note what it does NOT do: a `.png` is never muted, and the image element is
  still rendered — it is HIDDEN, not omitted, which is why clicking can reveal it without refetching.

  BEHAVIOUR, from `deployed-index.html` — the only place `showChatGif` is defined, and not in any
  bundle:

      function showChatGif(id) {
        const el = $(`#${id}`);
        if (el.next().hasClass('d-none')) { el.text('click to hide'); el.next().toggleClass('d-none') }
        else { el.text('gif muted, click to show').next().toggleClass('d-none') }
      }

  A toggle, with both label strings. Reproduced as component state rather than as a jQuery sibling
  walk: the captured function depends on `el.next()` being the image, which stops being true the
  moment anything is inserted between them.
*/

const BUNDLE = readFileSync(
  new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  'utf8'
);
const INDEX = readFileSync(
  new URL('../../docs/source/deployed-index.html', import.meta.url),
  'utf8'
);
const SHIPPED_CSS = readFileSync(
  new URL('../../docs/source/styles.d622cb9ed2bbc221.css', import.meta.url),
  'utf8'
);
/*
  TWO source constants, because the subject of this block is in TWO files and `MSB-04` prescribed
  moving the whole thing to one.

  `MessageBody.svelte` was extracted out of `RoomMessage.svelte` on 2026-08-30 and the segment
  renderer went with it — the placeholder, both labels, the `.gif` test and the `<img>`. The
  constant did not follow, so five assertions below were reading a file that no longer holds any of
  the strings they name. Invisible on a checkout without the capture symlinks, where
  `gate/evidence-bound-tests.mjs` excludes this whole file; red on one that has them.

  The register's prescribed repair was to re-point the single constant, and **measurement refused
  it**: `grep -cF` over both files, per string, on 2026-08-31 —

      RoomMessage=0 MessageBody=1  class="chat-gif-muted"
      RoomMessage=0 MessageBody=1  'click to hide' : 'gif muted, click to show'
      RoomMessage=0 MessageBody=1  return !chatGif && url.toLowerCase().includes('.gif');
      RoomMessage=0 MessageBody=1  { 'd-none': isMutedGif(segment.url) && !revealedGifs[segment.url] }
      RoomMessage=0 MessageBody=1  <img class="uploaded-img" src={segment.url} />
      RoomMessage=1 MessageBody=1  chatGif = true,

  Five moved; the DEFAULT did not, because a default is a property of the boundary that receives the
  preference and `RoomMessage` is still that boundary. Re-pointing the one constant would have taken
  the last line's assertion off the only file that had ever carried it and quietly onto a file that,
  on that day, declared the OPPOSITE — see `defaults ON` below. Two constants, each pointing at the
  file that owns its subject, which is the same rule the `PREFS_SOURCE` split below already follows.
*/
const MESSAGE = readFileSync(new URL('./components/RoomMessage.svelte', import.meta.url), 'utf8');
const BODY = readFileSync(new URL('./components/MessageBody.svelte', import.meta.url), 'utf8');
const APP_CSS = readFileSync(new URL('../app.css', import.meta.url), 'utf8');
const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
/*
  The preference declarations and the write path moved to `RoomPrefs` in Phase 5 slice 3, so the
  assertions about them read the class that now owns them. The page half is still read above -
  each assertion points at the file that owns its subject.
*/
const PREFS_SOURCE = readFileSync(new URL('./room/prefs.svelte.ts', import.meta.url), 'utf8');

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const messageCode = stripComments(MESSAGE);
const bodyCode = stripComments(BODY);
const pageCode = stripComments(PAGE);
const prefsCode = stripComments(PREFS_SOURCE);

describe('the reference', () => {
  it('mutes gifs only, and hides the image rather than omitting it', () => {
    expect(BUNDLE).toContain('chat-gif-muted');
    expect(BUNDLE).toContain('gif muted, click to show');
    // `!i && -1 !== r.indexOf('.gif')` — the gif test, and nothing about png/jpg/jfif.
    expect(BUNDLE.replace(/\s+/g, '')).toContain('if(!i&&-1!==r.indexOf(".gif")');
    // `d-none` on the container, so the <img> is still there to reveal.
    expect(BUNDLE).toContain('class="img-container ${l?"d-none":""}"');
  });

  it('the reveal is a TOGGLE with two labels', () => {
    expect(INDEX).toContain('function showChatGif(id)');
    expect(INDEX).toContain("el.text('click to hide')");
    expect(INDEX).toContain("el.text('gif muted, click to show')");
  });

  it('and the preference ships ON', () => {
    expect(BUNDLE).toContain('chatGif:!0');
  });
});

describe('ours', () => {
  it('renders the captured placeholder, with both labels', () => {
    expect(bodyCode).toContain('class="chat-gif-muted"');
    expect(bodyCode).toContain("'click to hide' : 'gif muted, click to show'");
  });

  it('mutes gifs ONLY — a png is never hidden', () => {
    /*
      The one term that must not be loosened. Dropping `.gif` from the test would mute every inline
      image the moment a viewer unticks a box labelled "gif".
    */
    expect(bodyCode).toContain("return !chatGif && url.toLowerCase().includes('.gif');");
  });

  it('hides the image rather than dropping it, so revealing needs no refetch', () => {
    // Phase 4 converted the `class:` directive to the clsx attribute form. The guarantee is
    // unchanged - `d-none` is applied CONDITIONALLY and the <img> stays in the markup either way.
    expect(bodyCode).toContain(
      "{ 'd-none': isMutedGif(segment.url) && !revealedGifs[segment.url] }"
    );
    // The <img> stays in the markup unconditionally.
    expect(bodyCode).toContain('<img class="uploaded-img" src={segment.url} />');
  });

  it('defaults ON in BOTH declarations, matching the reference blob', () => {
    /*
      `MSB-04` found the two disagreeing. `RoomMessage.svelte` declared `chatGif = true,` and
      `MessageBody.svelte`, which the renderer moved into, declared `chatGif = false,` — the
      opposite of each other and the opposite of `chatGif:!0` above.

      It was unreachable on the day, and that is why it survived: all eight `<MessageBody …>` call
      sites pass the value, so no render has ever taken the fallback. Unreachable is not harmless.
      Svelte's `$props` contract is that a fallback applies when the parent does not set the prop
      **or sets it to `undefined`**, so one call site handing over an optional value reaches it —
      and reached with `false`, every gif in the room hides behind a placeholder nobody asked for.

      BOTH are asserted rather than only the boundary's, because asserting one is what let the other
      drift: the file this block used to read was the only one checked, and the file it should have
      been reading was wrong for a day without anything going red.
    */
    expect(messageCode).toContain('chatGif = true,');
    expect(bodyCode).toContain('chatGif = true,');
    expect(bodyCode).not.toContain('chatGif = false,');
    expect(prefsCode).toContain('this.#chatGif = $state(loadedSettings.chatGif !== false);');
    // `=== true` here would mute gifs for every viewer who has never touched the checkbox.
    expect(prefsCode).not.toContain('this.#chatGif = $state(loadedSettings.chatGif === true);');
  });

  it('reaches BOTH message lists — the pipe is shared upstream', () => {
    /*
      RE-POINTED 2026-08-15. `chatGif` used to be spelled at each call site; it is now one of the
      sixteen in `messageChrome`, which both lists spread. Same guarantee by a shorter route — one
      value reaching two spreads instead of two spellings that have to agree.
    */
    /*
      RE-POINTED AGAIN 2026-08-15: both lists moved to `AlertChatArea.svelte`, so the two call sites
      are read there while the chrome that feeds them is still built on the page.
    */
    const paneCode = readFileSync(
      new URL('./components/AlertChatArea.svelte', import.meta.url),
      'utf8'
    );
    const chat = paneCode.indexOf('kind="chat"');
    const alert = paneCode.indexOf('kind="alert"');
    expect(alert, 'the alert call site is not in AlertChatArea.svelte').toBeGreaterThan(-1);
    expect(chat, 'the chat call site is not in AlertChatArea.svelte').toBeGreaterThan(-1);
    expect(paneCode.slice(alert, alert + 200)).toContain('{...messageChrome}');
    expect(paneCode.slice(chat, chat + 200)).toContain('{...messageChrome}');

    const from = pageCode.indexOf('const messageChrome');
    expect(
      from,
      'messageChrome must exist on the page for this guard to test anything'
    ).toBeGreaterThan(-1);
    expect(pageCode.slice(from, pageCode.indexOf('\n  });', from))).toContain('chatGif');
  });

  it('carries the captured CSS verbatim, including the hover that makes it look clickable', () => {
    expect(SHIPPED_CSS).toContain(
      '.chat-gif-muted{text-align:center;width:100%;font-style:italic}'
    );
    expect(APP_CSS).toContain('.chat-gif-muted {');
    expect(APP_CSS).toContain('font-style: italic;');
    expect(APP_CSS).toContain('.chat-gif-muted:hover {');
    expect(APP_CSS).toContain('cursor: pointer;');
  });
});
