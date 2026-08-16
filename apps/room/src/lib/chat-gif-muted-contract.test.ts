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
const MESSAGE = readFileSync(new URL('./components/RoomMessage.svelte', import.meta.url), 'utf8');
const APP_CSS = readFileSync(new URL('../app.css', import.meta.url), 'utf8');
const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const messageCode = stripComments(MESSAGE);
const pageCode = stripComments(PAGE);

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
    expect(messageCode).toContain('class="chat-gif-muted"');
    expect(messageCode).toContain("'click to hide' : 'gif muted, click to show'");
  });

  it('mutes gifs ONLY — a png is never hidden', () => {
    /*
      The one term that must not be loosened. Dropping `.gif` from the test would mute every inline
      image the moment a viewer unticks a box labelled "gif".
    */
    expect(messageCode).toContain("return !chatGif && url.toLowerCase().includes('.gif');");
  });

  it('hides the image rather than dropping it, so revealing needs no refetch', () => {
    expect(messageCode).toContain(
      'class:d-none={isMutedGif(segment.url) && !revealedGifs[segment.url]}'
    );
    // The <img> stays in the markup unconditionally.
    expect(messageCode).toContain('<img class="uploaded-img" src={segment.url} />');
  });

  it('defaults ON, matching the reference blob', () => {
    expect(messageCode).toContain('chatGif = true,');
    expect(pageCode).toContain('let chatGif = $state(loadedSettings.chatGif !== false);');
    // `=== true` here would mute gifs for every viewer who has never touched the checkbox.
    expect(pageCode).not.toContain('let chatGif = $state(loadedSettings.chatGif === true);');
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
