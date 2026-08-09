import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  The alerts panel and an alert card are two different colours, and they must stay two.

  Owner-specified 2026-08-04:
      alerts panel  #F1F1F1   (rgb(241, 241, 241))
      alert card    #E8E8E8   (rgb(232, 232, 232))

  This file exists because they had collapsed into one. Measured in the running room before the
  fix, `#chatScrollViewParentAlerts` and its `.msg-box` children BOTH computed
  `rgb(241, 241, 241)`, so an alert had no edge against the surface behind it.

  The collapse was not a typo, which is why prose alone would not have held it: the capture routes
  `.msg-box` through `--msgs-bg`, and `--lightTheme-msgs-bg` IS `#f1f1f1` - the very token the
  panel uses. Anyone "restoring the captured value" would put them back on top of each other.
  So the panel is pinned to the captured token AND the card is pinned to the owner's override,
  and the last assertion pins the thing that actually matters: that they differ.
*/

const appCssRaw = readFileSync(new URL('../app.css', import.meta.url), 'utf8');
// Comments stripped first - this file's own explanation names both colours.
const appCss = appCssRaw.replace(/\/\*[\s\S]*?\*\//g, '');
const captured = readFileSync(
  new URL('../../css/complete-app-styles.css', import.meta.url),
  'utf8'
);

const PANEL = '#f1f1f1';
const CARD = '#e8e8e8';

/** The declaration block for a selector, comments already stripped. */
function ruleFor(selector: string) {
  const at = appCss.indexOf(selector);
  if (at === -1) return null;
  const open = appCss.indexOf('{', at);
  const close = appCss.indexOf('}', open);
  return open === -1 || close === -1 ? null : appCss.slice(open + 1, close);
}

describe('alerts background contract', () => {
  it('keeps the panel on the captured token', () => {
    // Source of truth for the panel. If the capture ever says something else, this notices.
    expect(captured).toContain(`--lightTheme-msgs-bg: ${PANEL} !important`);
  });

  it('gives an alert card its own, darker background', () => {
    const rule = ruleFor('.lightTheme #chatScrollViewParentAlerts .msg-box');
    expect(rule, 'the alert card rule must exist').toBeTruthy();
    expect(rule).toContain(CARD);
  });

  it('proves the two are not the same colour', () => {
    // The whole point. A single value for both is the defect this file was written for.
    expect(CARD).not.toBe(PANEL);
  });

  it('records why the captured tokens could not supply this on their own', () => {
    // `.msg-box` -> `--msgs-bg` -> #f1f1f1, i.e. identical to the panel.
    expect(captured).toContain('.msg-box[_ngcontent-ng-c1254915701]');
    expect(captured).toContain('background-color: var(--msgs-bg)');

    // The only darker message token is the admin one, and it is #e1e1e1 - not #e8e8e8.
    expect(captured).toContain('--lightTheme-msgs-bg-adm: #e1e1e1 !important');

    // #e8e8e8 exists in the capture only as the day-separator background.
    expect(captured).toContain(`--lightTheme-msgs-separator-bg: ${CARD} !important`);
  });

  it('leaves the dark theme on the captured variables', () => {
    // The instruction covered the light theme only; the dark panel is #111 and stays untouched.
    expect(captured).toContain('--darkTheme-msgs-bg: #111 !important');
    const rule = ruleFor('.lightTheme #chatScrollViewParentAlerts .msg-box');
    expect(rule, 'the override must be light-theme scoped').toBeTruthy();
    expect(appCss).not.toContain('.darkTheme #chatScrollViewParentAlerts .msg-box');
  });
});

/*
  The chat message box, and the two captured defaults that were being confused for each other.

  Chat sat white while alerts sat on #e8e8e8. The chain of causes ran:

    .msg-box pb-1 msg-box-adm  ->  var(--msgs-bg-adm)  ->  undefined, because tokens.css had no
    `.lightTheme` / `.darkTheme` mapping blocks at all (18 of the 72 variables the generated sheet
    references resolved to nothing). Adding both blocks verbatim dropped that to 5.

  It was still white after that, because the winning declaration was not a stylesheet rule at all -
  `CSS.getMatchedStylesForNode` showed an INLINE `background-color: #ffffff`, written by
  RoomMessage from the global chat style. And the global chat style was being produced by the
  capture's FOLLOW-A-USER default:

    "lightTheme" === preferences.theme
      ? {..., bgColor:"#ffffff", fontSize:14, playSound:!0}     <- follow a specific user
      : {..., bgColor:"#000000", fontSize:14, playSound:!0}

  when the room's own style is a different object entirely:

    this.chatStyle  = {lightTheme:{..., bgColor:"#e8e8e8", fontSize:"13"}, darkTheme:{..., "#000"}}
    this.alertStyle = {lightTheme:{..., bgColor:"#e8e8e8", fontSize:"13"}, ...}

  `alertStyle` carrying the same #e8e8e8 is why an alert and a chat message share a background in
  the capture. One function was serving both roles and returning the follow default for both.
*/
describe('chat message background', () => {
  const main = readFileSync(
    new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
    'utf8'
  );
  const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');

  it('reads both captured defaults, so neither can be quietly dropped', () => {
    expect(main).toContain(
      'chatStyle={lightTheme:{color:"#1a1a1a",tickerColor:"#1a1a1a",usernameColor:"#365d7d",bgColor:"#e8e8e8",fontSize:"13"}'
    );
    expect(main).toContain('bgColor:"#ffffff",fontSize:14,playSound:!0');
  });

  it('gives the room style the room bgColor', () => {
    const at = page.indexOf('function defaultChatStyleForTheme');
    expect(at).toBeGreaterThan(-1);
    const body = page.slice(at, page.indexOf('\n  }', at));
    expect(body).toContain(`bgColor: '${CARD}'`);
    expect(body).toContain('fontSize: 13');
    expect(body).not.toContain("bgColor: '#ffffff'");
  });

  it('keeps the follow style separate, on the follow bgColor', () => {
    const at = page.indexOf('function defaultFollowChatStyle');
    expect(at).toBeGreaterThan(-1);
    const body = page.slice(at, page.indexOf('\n  }', at));
    expect(body).toContain("bgColor: '#ffffff'");
    expect(body).toContain('fontSize: 14');
    // The bug was this function delegating to the other one.
    expect(body).not.toContain('defaultChatStyleForTheme');
  });

  it('defines the theme mapping blocks the generated sheet needs', () => {
    const tokens = readFileSync(new URL('../lib/styles/tokens.css', import.meta.url), 'utf8');
    expect(tokens).toContain('.lightTheme');
    expect(tokens).toContain('.darkTheme');
    expect(tokens).toContain('--msgs-bg-adm');
  });
});
