// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';

import { viewerAlertPrefsFrom, type ViewerAlertPrefs } from './viewer-alert-prefs';
import ViewerAlertPrefsPane from './components/ViewerAlertPrefsPane.svelte';

/*
  FIVE CONTROLS THE REFERENCE HAS, THAT THIS ROOM DID NOT, EVERY ONE OVER A LIVE CONSUMER.

  Measured 2026-08-30 by grepping every `.svelte` in the room for each preference name:

  | preference | consumer, all along | writer, before this |
  | --- | --- | --- |
  | `beepOnUserJoin` | `arrival-announcement.ts` | NONE |
  | `popupOnUserJoin` | `arrival-announcement.ts` | NONE |
  | `beepOnUserLeave` | `arrival-announcement.ts` | NONE |
  | `popupOnUserLeave` | `arrival-announcement.ts` | NONE |
  | `updatePositionsIframe` | `PositionsContainer` | NONE |

  The four arrival preferences seed to ON in `RoomPrefs` (`!== false`), so a presenter was popped at
  and beeped at on every arrival and every departure with nothing anywhere to stop it. That is the
  inverse of the shape this repository usually catches — not a control with no consumer, but a
  consumer with no control — and it is worse, because the feature is ON and unreachable rather than
  off and harmless.

  The fifth had a third defect on top: `+page.svelte` read `prefs.loaded.updatePositionsIframe ===
  true` off the decoded settings blob, and an absent key is not `true`, so the positions panel's
  thirty-second refresh was off for everybody — against a reference that defaults it ON
  (`updatePositionsIframe:!0`, byte 980,052).
*/

const VIEWER = {
  beepOnUserJoin: true,
  popupOnUserJoin: false,
  beepOnUserLeave: true,
  popupOnUserLeave: false,
  updatePositionsIframe: true
};

describe('resolving the room half', () => {
  it('reads an absent room setting as OFF, never as on', () => {
    /*
      A room setting arrives from the controller as `boolean | undefined`; absent means the owner
      never enabled the feature. `=== true` is the deny-by-default reading, and it is the one that
      keeps a pane of switches from appearing over a feature the room does not have.
    */
    const resolved = viewerAlertPrefsFrom(undefined, VIEWER);
    expect(resolved.roomBeepOnUserJoin).toBe(false);
    expect(resolved.roomJoinLeavePopup).toBe(false);
    expect(resolved.positionsIframe).toBe(false);
  });

  it('needs the positions URL as well as the flag', () => {
    // `O(119, sessData.positionsIframe && sessData.positionsIframeUrl ? 119 : -1)`, byte 2,285,255.
    expect(viewerAlertPrefsFrom({ positionsIframe: true }, VIEWER).positionsIframe).toBe(false);
    expect(
      viewerAlertPrefsFrom({ positionsIframe: true, positionsIframeUrl: '' }, VIEWER)
        .positionsIframe,
      'an empty address is no address'
    ).toBe(false);
    expect(
      viewerAlertPrefsFrom(
        { positionsIframe: true, positionsIframeUrl: 'https://example.test/p' },
        VIEWER
      ).positionsIframe
    ).toBe(true);
  });

  it('passes the viewer’s own five through untouched', () => {
    /* Their defaults are decided in `RoomPrefs`, where `!== false` makes them on-unless-set. */
    expect(viewerAlertPrefsFrom({}, VIEWER)).toMatchObject(VIEWER);
  });
});

let target: HTMLElement | undefined;
let component: Record<string, unknown> | undefined;

afterEach(() => {
  if (component) unmount(component);
  target?.remove();
  component = undefined;
  target = undefined;
});

/** The room with both arrival halves on, which is the state the group is meant to appear in. */
const ROOM = { beepOnUserJoin: true, userJoinAndLeavePopup: true };

const render = (over: Partial<ViewerAlertPrefs> = {}, isPresenter = true) => {
  const written: [string, unknown][] = [];
  target = document.createElement('div');
  document.body.append(target);
  component = mount(ViewerAlertPrefsPane, {
    target,
    props: {
      viewerAlerts: { ...viewerAlertPrefsFrom(ROOM, VIEWER), ...over },
      isPresenter,
      onPreferenceChange: (key: string, value: unknown) => written.push([key, value])
    }
  }) as Record<string, unknown>;
  flushSync();
  return { written, root: target as HTMLElement };
};

describe('the arrival group', () => {
  it('renders all four switches when the room has the feature and the viewer presents', () => {
    const { root } = render();
    for (const id of [
      'beep-on-user-join',
      'popup-on-user-join',
      'beep-on-user-leave',
      'popup-on-user-leave'
    ]) {
      expect(
        root.querySelector(`#${id}`),
        `${id} must exist — nothing could write it before`
      ).not.toBeNull();
    }
  });

  it('shows each switch in the state the preference is actually in', () => {
    const { root } = render();
    expect(root.querySelector<HTMLInputElement>('#beep-on-user-join')?.checked).toBe(true);
    expect(root.querySelector<HTMLInputElement>('#popup-on-user-join')?.checked).toBe(false);
    expect(root.textContent).toContain('Beep on user join');
    expect(root.textContent).toContain('Popup on user leave');
  });

  it('writes the reference’s own preference name when one is clicked', () => {
    /*
      `beepOnUserJoinChange() { preferences.beepOnUserJoin = !…, setPreference("beepOnUserJoin", …) }`
      at byte 2,252,100. The NAME is what matters: `arrival-announcement.ts` reads these keys, and a
      control writing `beep-on-user-join` instead would persist a key nothing reads — the defect the
      id-to-preference mapping in `ModalHost` exists to prevent.
    */
    const { root, written } = render();
    root.querySelector<HTMLInputElement>('#popup-on-user-join')?.click();
    flushSync();
    expect(written).toEqual([['popupOnUserJoin', true]]);
  });

  it('disappears when the room has turned both halves off', () => {
    /*
      `(sessData.beepOnUserJoin || sessData.userJoinAndLeavePopup) && isPresenter`, byte 2,285,369.
      Switches over a feature that cannot fire are worse than no switches.
    */
    const { root } = render({ roomBeepOnUserJoin: false, roomJoinLeavePopup: false });
    expect(root.querySelector('#beep-on-user-join')).toBeNull();
  });

  it('is presenter-only, because a member is never told who came and went', () => {
    const { root } = render({}, false);
    expect(root.querySelector('#beep-on-user-join')).toBeNull();
  });
});

describe('the positions refresh switch', () => {
  it('appears only when the room actually has a positions panel', () => {
    expect(
      render({ positionsIframe: false }).root.querySelector('#app-positions-update')
    ).toBeNull();
    expect(
      render({ positionsIframe: true }).root.querySelector('#app-positions-update')
    ).not.toBeNull();
  });

  it('is offered to a MEMBER too, unlike the arrival group', () => {
    /* Its gate carries no `isPresenter` — byte 2,285,255 — and the panel is not presenter-only. */
    const { root } = render({ positionsIframe: true }, false);
    expect(root.querySelector('#app-positions-update')).not.toBeNull();
  });

  it('writes `updatePositionsIframe`, which is what the container reads', () => {
    const { root, written } = render({ positionsIframe: true, updatePositionsIframe: true });
    root.querySelector<HTMLInputElement>('#app-positions-update')?.click();
    flushSync();
    expect(written).toEqual([['updatePositionsIframe', false]]);
  });
});
