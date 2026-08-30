// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PresenterMuteRows from './PresenterMuteRows.svelte';

/*
  THE PRESENTER MUTE ROWS, MOUNTED — three properties that only exist once the DOM is real.

  ## Why this component rather than `RoomNavbar`

  The defect this guards shipped through `RoomNavbar`: `idPrefix="NEGATIVE_CONTROL"` sat in `HEAD`
  for three commits, emitting DOM ids prefixed `NEGATIVE_CONTROL`, while
  `screen-volume-contract.test.ts:492` asserted its absence against a slice that had gone empty. But
  `RoomNavbar` takes 49 props and only FORWARDS the prefix. This component OWNS the ids, takes 7
  props, and is where the behaviour can actually be asserted. Testing the forwarder would have been
  testing the wrong file at four times the cost.

  ## What source text cannot reach, and why each one matters

  **1. `id` and `for` are a PAIR.** The markup writes `id={rowId}` and `for={rowId}` from one
  declaration tag, so a `toContain` proves both strings exist. It cannot prove they RESOLVE to each
  other — that is `label.control`, computed by the DOM from the document. `screen-volume.ts:111`
  states the stakes exactly: *"a duplicated form-control id makes the overlay's own checkboxes
  unclickable by their labels"*. A member clicks "Mute" and nothing happens.

  **2. `idPrefix` exists to keep TWO instances apart.** The navbar dropdown and the viewer-only
  overlay are both in the document at once, and the reference gives both the same ids — so upstream
  the overlay's labels point at the navbar's checkboxes. This app diverges deliberately. That
  divergence is only observable with both mounted, which is what the second block does.

  **3. `checked` is written by an ATTACHMENT, not `bind:`.** The component's own note records why:
  the reference binds to `audioMutedFor[userID]` and a two-way binding would let the element's
  default win before the preference is read back. The consequence is that `checked` never appears in
  the markup as an attribute — so no source assertion can tell a working attachment from a deleted
  one. Only `input.checked` can.

  ## The gap is MEASURED, as it was for `FilesPane`

  `screen-volume-contract.test.ts` already covers this component in 33 source-text assertions, so the
  fair objection is that this adds nothing. Tested, not argued — gutting the attachment body to
  `void checked;`, which leaves every string in the markup untouched:

      screen-volume-contract.test.ts ..... 33 passed   (blind)
      PresenterMuteRows.test.ts .......... 1 failed    (caught)

  Every checkbox renders unchecked, a muted presenter looks unmuted to the member who muted them,
  and the source-text contract is entirely green. Removing the label's `for=` is the same story: four
  assertions here go red and nothing else notices.

  ## What jsdom is NOT asked to do

  Nothing here depends on layout. `label.control` and `input.checked` are DOM properties, and
  `click()` dispatches a real event. The slider's rendered width, the dropdown's position and the
  captured colours remain outside what this instrument can see, and are not asserted.
*/

const presenter = (userID: number, name: string) => ({
  userID,
  mediaValue: { name }
});

const mountRows = (
  props: Partial<{
    talkingUsers: ReturnType<typeof presenter>[];
    preferences: { audioMutedFor: Record<number, unknown>; audioVolumeFor: Record<number, number> };
    individualVolumeControls: boolean;
    idPrefix: string;
    trailingRule: boolean;
  }> = {},
  target = document.body.appendChild(document.createElement('div'))
) => {
  const component = mount(PresenterMuteRows, {
    target,
    props: {
      talkingUsers: [presenter(1, 'Allison')],
      preferences: { audioMutedFor: {}, audioVolumeFor: {} },
      individualVolumeControls: false,
      ontogglepresenter: vi.fn(),
      onpresentervolume: vi.fn(),
      ...props
    } as never
  });
  flushSync();
  return { component, target };
};

/*
  Mounted components are tracked so `afterEach` can unmount them. GENERIC on purpose: an earlier
  draft typed the parameter as `{ component }` and TypeScript then erased `target` from every
  return, producing thirteen `Property 'target' does not exist` errors that `as never` would have
  silenced instead of fixed.
*/
const open: { component: ReturnType<typeof mount> }[] = [];
const track = <T extends { component: ReturnType<typeof mount> }>(mounted: T): T => {
  open.push(mounted);
  return mounted;
};

afterEach(() => {
  while (open.length) unmount(open.pop()!.component);
  document.body.innerHTML = '';
});

describe('the label and its checkbox resolve to each other', () => {
  it('every label CONTROLS its own checkbox, which is what makes "Mute" clickable', () => {
    /*
      `label.control` is the DOM's own answer to "which field does this label operate", resolved from
      `for` against the document. It is the property a member depends on and the one a duplicated id
      destroys — and it is unavailable to any assertion over source text.
    */
    const { target } = track(
      mountRows({ talkingUsers: [presenter(1, 'Allison'), presenter(2, 'Bruno')] })
    );

    const labels = [...target.querySelectorAll('label')];
    const inputs = [...target.querySelectorAll('input[type="checkbox"]')];
    expect(labels).toHaveLength(2);
    expect(inputs).toHaveLength(2);

    labels.forEach((label, index) => {
      expect(label.control, `label ${index} controls nothing`).toBe(inputs[index]);
    });
  });

  it('clicking the LABEL toggles the checkbox and reports the right presenter', () => {
    // The end-to-end consequence of the pairing above, exercised the way a member does it.
    const ontogglepresenter = vi.fn();
    const { target } = track(
      mountRows({
        talkingUsers: [presenter(1, 'Allison'), presenter(2, 'Bruno')],
        ontogglepresenter
      } as never)
    );

    (target.querySelectorAll('label')[1] as HTMLLabelElement).click();

    expect(ontogglepresenter).toHaveBeenCalledTimes(1);
    expect(ontogglepresenter.mock.calls[0][0]).toMatchObject({ userID: 2 });
  });

  it('gives every row a DISTINCT id, so two rows cannot share one checkbox', () => {
    const { target } = track(
      mountRows({
        talkingUsers: [presenter(1, 'Allison'), presenter(2, 'Bruno'), presenter(3, 'Cara')]
      })
    );
    const ids = [...target.querySelectorAll('input[type="checkbox"]')].map((n) => n.id);
    expect(new Set(ids).size, `ids collided: ${ids.join(', ')}`).toBe(3);
    expect(ids[0]).toBe('talkingPresenter0-donot-disturb');
  });
});

describe('idPrefix keeps TWO instances apart, which is the whole reason it exists', () => {
  it("the overlay copy does not steal the navbar copy's checkboxes", () => {
    /*
      THE DIVERGENCE THIS APP TAKES DELIBERATELY. Upstream gives both dropdowns the same ids, so the
      overlay's labels operate the navbar's checkboxes — `screen-volume.ts:109-114` records the
      decision to diverge and why this one case earns it.

      Both are mounted into ONE document here, because that is the only condition under which the
      collision can happen and the only way `label.control` can be wrong.
    */
    const navbar = track(mountRows({ talkingUsers: [presenter(1, 'Allison')] }));
    const overlay = track(
      mountRows({ talkingUsers: [presenter(1, 'Allison')], idPrefix: 'overlayPresenter' })
    );

    const navbarInput = navbar.target.querySelector('input[type="checkbox"]')!;
    const overlayInput = overlay.target.querySelector('input[type="checkbox"]')!;
    const overlayLabel = overlay.target.querySelector('label')!;

    expect(navbarInput.id).not.toBe(overlayInput.id);
    // The assertion that matters: the overlay's label resolves to the OVERLAY's checkbox.
    expect(overlayLabel.control, 'the overlay label reached across to the navbar').toBe(
      overlayInput
    );
  });

  it('and a shared prefix DOES collide, which is what the divergence buys', () => {
    /*
      The other half, and the reason the first is not vacuous. Give both copies the same prefix —
      what the reference does — and the DOM resolves BOTH labels to the FIRST checkbox, because
      `getElementById` returns the first match in document order. This asserts the failure is real
      rather than theoretical.
    */
    const navbar = track(mountRows({ talkingUsers: [presenter(1, 'Allison')] }));
    const overlay = track(mountRows({ talkingUsers: [presenter(1, 'Allison')] }));

    const navbarInput = navbar.target.querySelector('input[type="checkbox"]')!;
    const overlayLabel = overlay.target.querySelector('label')!;

    expect(overlayLabel.control).toBe(navbarInput);
  });
});

describe('checked is written by an attachment, so only the DOM can confirm it', () => {
  it('reflects a muted presenter as a CHECKED box', () => {
    /*
      `checked` never appears in the markup — `{@attach setChecked(muted)}` assigns the property. A
      source assertion sees the attachment and stops there; deleting its body would leave every
      string in place and every box unchecked.
    */
    const { target } = track(
      mountRows({
        talkingUsers: [presenter(1, 'Allison'), presenter(2, 'Bruno')],
        preferences: { audioMutedFor: { 2: true }, audioVolumeFor: {} }
      })
    );

    const inputs = [...target.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
    expect(inputs[0].checked, 'Allison is not muted and must be unchecked').toBe(false);
    expect(inputs[1].checked, 'Bruno is muted and must be checked').toBe(true);
  });

  it('labels a muted presenter "Muted" and an unmuted one "Mute"', () => {
    // The visible half of the same state, and the capture's own wording.
    const { target } = track(
      mountRows({
        talkingUsers: [presenter(1, 'Allison'), presenter(2, 'Bruno')],
        preferences: { audioMutedFor: { 2: true }, audioVolumeFor: {} }
      })
    );

    const labels = [...target.querySelectorAll('label')];
    expect(labels[0].textContent).toContain('Mute');
    expect(labels[0].textContent).not.toContain('Muted');
    expect(labels[1].textContent).toContain('Muted');
    expect(labels[1].className).toContain('muted');
  });
});

describe('the trailing rule is a SIBLING of the repeater, not part of it', () => {
  it('renders exactly one <hr> for many rows, and only when asked', () => {
    /*
      `b4e` is `ht(0, _4e, …), T(2, 'hr')` — one `hr` after the repeater, so it appears once per open
      dropdown rather than once per row. Counting it is a DOM question; the source shows one `<hr>`
      either way because the repeater is a block, not a copy.
    */
    const withRule = track(
      mountRows({
        talkingUsers: [presenter(1, 'A'), presenter(2, 'B'), presenter(3, 'C')],
        trailingRule: true
      })
    );
    expect(withRule.target.querySelectorAll('hr')).toHaveLength(1);

    const without = track(mountRows({ talkingUsers: [presenter(1, 'A'), presenter(2, 'B')] }));
    expect(without.target.querySelectorAll('hr')).toHaveLength(0);
  });

  it('renders nothing at all when nobody is talking', () => {
    // `talkingUsers && talkingUsers.length > 0` gates the WHOLE block upstream, rule included.
    const { target } = track(mountRows({ talkingUsers: [], trailingRule: true }));
    expect(target.querySelectorAll('input')).toHaveLength(0);
    expect(target.querySelectorAll('hr')).toHaveLength(0);
  });
});
