import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  Four gates that existed, defaulted false, and were never fed.

  `RoomMessage.svelte` has carried `usersPublicReply`, `enableReactions`, `enableEditMessage` and
  `enableEditAlerts` as props since it was written. Each defaults `false`, each feeds
  `sourceMessageBehavior()`, and `+page.svelte` passed none of them — so public reply, reactions and
  both edit entries were dead in every room however the owner configured the Manage page.

  That failure is INVISIBLE. Nothing throws, nothing logs, no test that renders a message with the
  defaults notices, and the Manage page happily stores a value the room will never read. The only
  way it surfaces is somebody asking why a control does nothing, which is how it survived this long.

  So the assertions below are deliberately about the WIRE — the value leaving `sessData` and
  arriving at both call sites — rather than about the behaviour, which was already correct and was
  never the broken half.
*/

const GATES = [
  'usersPublicReply',
  'enableReactions',
  'enableEditMessage',
  'enableEditAlerts'
] as const;

const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
const component = readFileSync(new URL('./components/RoomMessage.svelte', import.meta.url), 'utf8');
const strip = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
const pageCode = strip(page);
const componentCode = strip(component);

describe('the four message gates are read from the room, not decided locally', () => {
  it.each(GATES)('%s comes off sessData and nowhere else', (gate) => {
    expect(pageCode).toContain(`const ${gate} = $derived(data.sessData?.${gate} === true);`);
  });

  it('compares with === true rather than trusting truthiness', () => {
    /*
      `sessData` is JSON off the wire. `=== true` means a string "false", a 0 or a stray object
      cannot switch a capability on, which matters because three of these four unlock an action a
      member can take on somebody else's message.
    */
    for (const gate of GATES) {
      expect(pageCode).not.toContain(`$derived(Boolean(data.sessData?.${gate}))`);
      expect(pageCode).toContain(`data.sessData?.${gate} === true`);
    }
  });
});

describe('both message lists receive all four', () => {
  /*
    Upstream renders ONE component for both logs, so a gate that reaches only one list is a
    divergence that shows as "reactions work in chat but not on alerts" — the shape of bug that gets
    reported as flakiness rather than as a missing prop.
  */
  const alertAt = pageCode.indexOf('kind="alert"');
  const chatAt = pageCode.indexOf('kind="chat"');

  it('has both call sites', () => {
    expect(alertAt).toBeGreaterThan(-1);
    expect(chatAt).toBeGreaterThan(-1);
  });

  it('spreads ONE chrome object at both call sites', () => {
    /*
      RE-POINTED 2026-08-15, and what it guards got stronger.

      Each gate used to be counted as `{gate}` appearing exactly twice in the page — once per call
      site. The sixteen props both lists share are now built once as `messageChrome` and spread, so
      "passed at both call sites" is no longer two spellings to keep in step. It is one object
      reaching two spreads, which is a thing that cannot drift rather than a thing that happens not
      to have.

      Positive first: both spreads are found, before any membership is asserted below.
    */
    expect(pageCode.slice(alertAt, alertAt + 200)).toContain('{...messageChrome}');
    expect(pageCode.slice(chatAt, chatAt + 200)).toContain('{...messageChrome}');
  });

  it.each(GATES)('%s is in the chrome that both call sites spread', (gate) => {
    const from = pageCode.indexOf('const messageChrome');
    expect(from, 'messageChrome is not built in +page.svelte').toBeGreaterThan(-1);
    const chrome = pageCode.slice(from, pageCode.indexOf('\n  });', from));
    expect(chrome, `${gate} is not in messageChrome`).toContain(gate);
  });
});

describe('the component end of the wire', () => {
  it.each(GATES)('%s is still a prop that defaults false', (gate) => {
    expect(componentCode).toContain(`${gate}?: boolean;`);
    expect(componentCode).toContain(`${gate} = false,`);
  });

  it('feeds all four into sourceMessageBehavior rather than reading them ad hoc', () => {
    const call = componentCode.slice(componentCode.indexOf('sourceMessageBehavior({'));
    const args = call.slice(0, call.indexOf('})'));
    for (const gate of GATES) expect(args).toContain(gate);
  });

  it('keeps edit as TWO gates, because upstream gates chat and alerts apart', () => {
    /*
      Collapsing these would let a room that allows editing ALERTS also allow editing CHAT. The
      component already picks between them on `kind`; the contract is that both names survive.
    */
    expect(componentCode).toContain('enableEditMessage');
    expect(componentCode).toContain('enableEditAlerts');
    expect(componentCode).not.toContain('enableEdit = ');
  });
});
