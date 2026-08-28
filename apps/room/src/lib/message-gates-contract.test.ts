import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  FIVE gates that existed on the component and were never fed.

  `RoomMessage.svelte` has carried `usersPublicReply`, `enableReactions`, `enableEditMessage`,
  `enableEditAlerts` and `hasQaOnAlerts` as props since each was written. Every one feeds
  `sourceMessageBehavior()` or a template gate, and `+page.svelte` passed none of them.

  **The fifth failed the OTHER way, and that is why it is worth naming separately.** The first four
  default `false`, so public reply, reactions and both edit entries were dead in every room however
  the owner configured the Manage page. `hasQaOnAlerts` defaulted **`true`**, so the ask-a-question
  button appeared on every alert in every room whether or not Q&A had been bought, and pressing it
  opened the modal. A gate that defaults open is not a gate; it was corrected to `false` on
  2026-08-28 when the setting finally crossed the boundary.

  That failure is INVISIBLE in both directions. Nothing throws, nothing logs, no test that renders a
  message with the defaults notices, and the Manage page happily stores a value the room will never
  read. The only way it surfaces is somebody asking why a control does nothing — or, for the fifth,
  nobody asking at all, because a control that works looks correct.

  So the assertions below are deliberately about the WIRE — the value leaving `sessData` and
  arriving at both call sites — rather than about the behaviour, which was already correct and was
  never the broken half.
*/

/**
 * Each gate as a PAIR: the prop name on the component, and the setting name on the wire.
 *
 * They were the same string for the first four, so the list used to be four bare names. `sessData`
 * spells the fifth `hasQAOnAlerts` and this room spells the prop `hasQaOnAlerts` — the reference's
 * own capitalisation of an acronym, kept rather than normalised, because the wire name has to match
 * what the controller sends and the prop name has to match this repository's own convention.
 * Writing them as one string would have hidden which of the two a future assertion is checking.
 */
const GATES = [
  { prop: 'usersPublicReply', setting: 'usersPublicReply' },
  { prop: 'enableReactions', setting: 'enableReactions' },
  { prop: 'enableEditMessage', setting: 'enableEditMessage' },
  { prop: 'enableEditAlerts', setting: 'enableEditAlerts' },
  { prop: 'hasQaOnAlerts', setting: 'hasQAOnAlerts' }
] as const;

const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
/*
  The two message lists moved to `AlertChatArea.svelte` on 2026-08-15. The four gates are still
  DERIVED on the page and still collected into `messageChrome` there — only the two spreads moved,
  so the call-site assertions read the pane and everything else stays where it was.
*/
const pane = readFileSync(new URL('./components/AlertChatArea.svelte', import.meta.url), 'utf8');
const component = readFileSync(new URL('./components/RoomMessage.svelte', import.meta.url), 'utf8');
const strip = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
const pageCode = strip(page);
const paneCode = strip(pane);
const componentCode = strip(component);

describe('the five message gates are read from the room, not decided locally', () => {
  /*
    ASSERTED AS THE READ, not as the declaration — rewritten 2026-08-28 and stronger for it.

    This used to require the literal line `const <gate> = $derived(data.sessData?.<gate> === true);`
    and went red when those five consts were inlined into the `messageChrome` object that was their
    only reader. The spelling was never the contract: what matters is that the value comes off
    `sessData`, compares with `=== true`, and reaches the chrome. A page that satisfies all three
    through a const, an inline field or anything else is correct, and a page that satisfies none of
    them is broken whichever way it is written.
  */
  it.each(GATES)('$setting comes off sessData and nowhere else', ({ setting }) => {
    expect(pageCode).toContain(`data.sessData?.${setting} === true`);
  });

  it('compares with === true rather than trusting truthiness', () => {
    /*
      `sessData` is JSON off the wire. `=== true` means a string "false", a 0 or a stray object
      cannot switch a capability on, which matters because four of these five unlock an action a
      member can take on somebody else's message.
    */
    for (const { setting } of GATES) {
      expect(pageCode).not.toContain(`Boolean(data.sessData?.${setting})`);
      expect(pageCode).toContain(`data.sessData?.${setting} === true`);
    }
  });
});

describe('both message lists receive all four', () => {
  /*
    Upstream renders ONE component for both logs, so a gate that reaches only one list is a
    divergence that shows as "reactions work in chat but not on alerts" — the shape of bug that gets
    reported as flakiness rather than as a missing prop.
  */
  const alertAt = paneCode.indexOf('kind="alert"');
  const chatAt = paneCode.indexOf('kind="chat"');

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
    expect(paneCode.slice(alertAt, alertAt + 200)).toContain('{...messageChrome}');
    expect(paneCode.slice(chatAt, chatAt + 200)).toContain('{...messageChrome}');
    // …and the object they spread is the one the page built and handed over.
    expect(pageCode).toContain('{messageChrome}');
  });

  it.each(GATES)('$prop is in the chrome that both call sites spread', ({ prop, setting }) => {
    const from = pageCode.indexOf('const messageChrome');
    expect(from, 'messageChrome is not built in +page.svelte').toBeGreaterThan(-1);
    const chrome = pageCode.slice(from, pageCode.indexOf('\n  });', from));
    expect(chrome, `${prop} is not in messageChrome`).toContain(prop);
    // …and it is the ROOM's value there, not a local decision that happens to share the name.
    expect(chrome, `${prop} is not read off sessData in messageChrome`).toContain(
      `data.sessData?.${setting} === true`
    );
  });
});

describe('the component end of the wire', () => {
  /*
    DEFAULTS FALSE, all five, and the fifth is the reason this assertion earns its place.

    `hasQaOnAlerts` defaulted `true` until 2026-08-28 and nothing passed it, so the ask-a-question
    button was on in every room. `ModalHost`'s Q&A thread still renders `RoomMessage` without the
    chrome, so the default is not decorative — it is what a call site gets when it forgets.
  */
  it.each(GATES)('$prop is still a prop that defaults false', ({ prop }) => {
    expect(componentCode).toContain(`${prop}?: boolean;`);
    expect(componentCode).toContain(`${prop} = false,`);
  });

  it('feeds the four menu gates into sourceMessageBehavior rather than reading them ad hoc', () => {
    /*
      FOUR, not five. `hasQaOnAlerts` is not a menu entry — it gates a button in the alert's own
      header (`RoomMessage.svelte:774`), so it is read in the template rather than passed to the
      behaviour function. Asserted as its own case below rather than folded in here, because
      pretending it goes through `sourceMessageBehavior` would make this test lie about where the
      rule lives.
    */
    const call = componentCode.slice(componentCode.indexOf('sourceMessageBehavior({'));
    const args = call.slice(0, call.indexOf('})'));
    for (const { prop } of GATES) {
      if (prop === 'hasQaOnAlerts') continue;
      expect(args).toContain(prop);
    }
  });

  it('gates the ask-a-question button on hasQaOnAlerts in the template', () => {
    // `O(1, !e.isQAMsg && sessData.hasQAOnAlerts ? 1 : -1)` — bundle byte 1,339,784, both terms.
    expect(componentCode).toContain('{#if !isQaMessage && hasQaOnAlerts}');
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
