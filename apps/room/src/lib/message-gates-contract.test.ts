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
  { prop: 'usersPublicReply', setting: 'usersPublicReply', via: 'behavior' },
  { prop: 'enableReactions', setting: 'enableReactions', via: 'behavior' },
  { prop: 'enableEditMessage', setting: 'enableEditMessage', via: 'behavior' },
  { prop: 'enableEditAlerts', setting: 'enableEditAlerts', via: 'behavior' },
  { prop: 'hasQaOnAlerts', setting: 'hasQAOnAlerts', via: 'template' },
  /*
    The five that joined on 2026-08-28, found by asking which of `RoomMessage`'s thirty-five props no
    call site supplies. Every one already had its value crossing the boundary; nothing passed it.
  */
  { prop: 'userPrivateMessaging', setting: 'userPM', via: 'behavior' },
  { prop: 'userToPresenterPrivateMessaging', setting: 'userToPresenterPM', via: 'behavior' },
  { prop: 'disablePrivateMessagingForTrials', setting: 'disablePMForTrials', via: 'behavior' },
  { prop: 'hideAvatars', setting: 'hideAvatars', via: 'template' }
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
const chrome = readFileSync(new URL('./room-message-chrome.ts', import.meta.url), 'utf8');
const pageCode = strip(page);
const chromeCode = strip(chrome);
const paneCode = strip(pane);
const componentCode = strip(component);

describe('the nine message gates are read from the room, not decided locally', () => {
  /*
    ANCHORED TO THE MODULE THAT DECIDES, and re-pointed twice in one day for reasons worth keeping.

    First it required the literal line `const <gate> = $derived(data.sessData?.<gate> === true);` in
    the page. That went red when those consts were inlined into the object that was their only
    reader — a correct change to code the assertion had pinned by spelling.

    Then the whole construction moved into `buildMessageChrome`, which is where it belongs: "which
    settings does a message read" is that module's question, not the page's. So the reads are
    asserted THERE now, and what is asserted of the page is only that it calls the builder and hands
    the result on. Each assertion sits in the file that owns the thing it checks, which is the shape
    that stops the next legitimate refactor from failing it for the wrong reason.

    **This split is also what the change being guarded was about.** Six props sat on `RoomMessage`
    with their values already on the wire and nothing passing them, precisely because the type and
    the construction lived in different files and nothing compared them.
  */
  it.each(GATES)('$setting is read off sessData in the chrome builder', ({ setting }) => {
    expect(chromeCode).toContain(`settings?.${setting} === true`);
  });

  it.each(GATES)('$prop is a field of RoomMessageChrome', ({ prop }) => {
    expect(chromeCode).toContain(`readonly ${prop}: boolean;`);
  });

  it('compares with === true rather than trusting truthiness', () => {
    /*
      `sessData` is JSON off the wire. `=== true` means a string "false", a 0 or a stray object
      cannot switch a capability on, which matters because five of these nine unlock an action a
      member can take on somebody else's message.
    */
    for (const { setting } of GATES) {
      expect(chromeCode).not.toContain(`Boolean(settings?.${setting})`);
      expect(chromeCode).toContain(`settings?.${setting} === true`);
    }
  });

  it('the page builds the chrome through that module and hands it on', () => {
    expect(pageCode).toContain('buildMessageChrome({');
    expect(pageCode).toContain('sessData: data.sessData');
    expect(pageCode).toContain('{messageChrome}');
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

  it.each(GATES)('$prop is set by the builder both call sites spread', ({ prop, setting }) => {
    const from = chromeCode.indexOf('export function buildMessageChrome');
    expect(from, 'buildMessageChrome is not exported').toBeGreaterThan(-1);
    const body = chromeCode.slice(from);
    // The field and its source, on one line — so a field wired to the wrong setting fails here.
    expect(body, `${prop} is not built from ${setting}`).toContain(
      `${prop}: settings?.${setting} === true`
    );
  });
});

/*
  THE TWO VIEWER FACTS, which are not settings and so are not in `GATES`.

  They were unfed alongside the four settings above and each broke a different rule, so they get
  their own assertions rather than being left to the settings table's shape:

    viewerIsLimitedPresenter   `showToAll` is `viewerIsPresenter && !viewerIsLimitedPresenter`. With
                               it absent, a member handed mic and screen by `giveMicScreen` kept the
                               Show To All entry that gate exists to take away. It comes from
                               `media.limitedPresenter`, NEVER from the role — `media-elevation.ts`
                               is the module that argues why those two must not be collapsed.

    currentUserIsTrial         the trial half of the private-message rule. With it absent the
                               `disablePMForTrials` term could never fire, so wiring that setting
                               without this one would have looked complete and done nothing.
*/
describe('the two viewer facts a message needs', () => {
  it('takes the limited-presenter elevation from media, not from the role', () => {
    expect(chromeCode).toContain('viewerIsLimitedPresenter: sources.viewerIsLimitedPresenter');
    expect(pageCode).toContain('viewerIsLimitedPresenter: media.limitedPresenter');
    // The role is still the role. If these two ever became one expression the gate would be gone.
    expect(chromeCode).toContain(
      "viewerIsPresenter: sources.user.role === 'staff' || sources.user.role === 'admin'"
    );
  });

  it('takes the trial flag from the loaded user, fail-closed', () => {
    expect(chromeCode).toContain('currentUserIsTrial: sources.user.isFT === true');
  });

  it('hands the component both, through the same chrome the settings ride on', () => {
    expect(chromeCode).toContain('readonly viewerIsLimitedPresenter: boolean;');
    expect(chromeCode).toContain('readonly currentUserIsTrial: boolean;');
    expect(componentCode).toContain('viewerIsLimitedPresenter?: boolean;');
    expect(componentCode).toContain('currentUserIsTrial?: boolean;');
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

  it('feeds the menu gates into sourceMessageBehavior rather than reading them ad hoc', () => {
    /*
      `via` says which of the two mechanisms each gate uses, and the split is real rather than
      bookkeeping. Seven decide MENU ENTRIES and go through `sourceMessageBehavior`, the pure rule
      module with its own tests. Two — `hasQaOnAlerts` and `hideAvatars` — gate ELEMENTS in the
      message's own markup and are read in the template, so pretending they pass through the
      behaviour function would make this test lie about where their rule lives. Each `via: template`
      gate has its own assertion below naming the line it guards.
    */
    const call = componentCode.slice(componentCode.indexOf('sourceMessageBehavior({'));
    const args = call.slice(0, call.indexOf('})'));
    for (const { prop, via } of GATES) {
      if (via !== 'behavior') continue;
      expect(args).toContain(prop);
    }
  });

  it('gates the two template props at the elements they belong to', () => {
    // `O(1, !e.isQAMsg && sessData.hasQAOnAlerts ? 1 : -1)` — bundle byte 1,339,784, both terms.
    expect(componentCode).toContain('{#if !isQaMessage && hasQaOnAlerts}');
    /*
      `(sessData.altChatRender && ("chat" === logType || isQAMsg) || sessData.hideAvatars) &&
      (this.hideAvatar = !0)` — byte 1,349,126. Only the second term is implemented here, and the
      first is a recorded gap: `altChatRender` is its own unbuilt feature in the settings triage.
    */
    expect(componentCode).toContain('{#if !hideAvatars}');
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
