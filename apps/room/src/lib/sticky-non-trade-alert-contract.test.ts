import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * "Sticky non-trade alert?" — the composer's Non-Trade checkbox starts ticked, on EVERY open.
 *
 * ## The transcription
 *
 * `this.nonTradeAlert = this.appService.globals.sessData.styckyNonTradeAlert || !1` — byte
 * 2,124,407, inside `doAlertsModal`, beside that method's other per-open resets. **Where it sits is
 * the whole feature.** Seeding the field once at construction would make it sticky for the first
 * alert of a session and never again; a presenter who unticks the box for one alert must get it back
 * on the next, and that is what "sticky" means here.
 *
 * `styckyNonTradeAlert` is the reference's own spelling and is kept: the name has to match what the
 * controller stores, and correcting it would silently stop reading a setting owners have configured.
 *
 * ## Why a source contract and not a render
 *
 * The seed runs in `beginOpenState`, which an `$effect` calls on every transition to open — and
 * `$effect` never runs during SSR, which is the instrument every other modal test here uses. A mount
 * would work and would cost a jsdom, the whole modal and its twelve collaborators to observe one
 * boolean.
 *
 * What can regress is the CHAIN and the PLACE, and both are exactly what a source assertion sees:
 * the value crossing three components, and the assignment being in the per-open reset rather than in
 * the declaration. Each hop below is a real regression target — the setting reaching `RoomOverlays`
 * and stopping there would look identical from inside `PostAlertModal`.
 */
const overlays = readFileSync(new URL('./components/RoomOverlays.svelte', import.meta.url), 'utf8');
const modalHost = readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8');
const composer = readFileSync(
  new URL('./components/PostAlertModal.svelte', import.meta.url),
  'utf8'
);

describe('the sticky non-trade checkbox', () => {
  it('is read off sessData where the data already is', () => {
    // `RoomOverlays` holds `data`, so this one cost the page nothing to wire.
    expect(overlays).toContain('stickyNonTradeAlert={data.sessData?.styckyNonTradeAlert === true}');
  });

  it('crosses ModalHost rather than stopping there', () => {
    expect(modalHost).toContain('stickyNonTradeAlert?: boolean;');
    expect(modalHost).toContain('{stickyNonTradeAlert}');
  });

  it('arrives at the composer as a prop that fails closed', () => {
    expect(composer).toContain('stickyNonTradeAlert?: boolean;');
    expect(composer).toContain('stickyNonTradeAlert = false');
  });

  /*
    THE PLACE, and it is the feature rather than a detail.

    In the per-open reset, so a presenter who unticks it gets it back next time. NOT in the
    declaration: that would capture the prop's initial value — which is what
    `state_referenced_locally` warns about — and would make the setting apply to the first alert of a
    session only.
  */
  it('is applied on every open, not once at construction', () => {
    const from = composer.indexOf('function beginOpenState()');
    expect(from, 'the per-open reset has been renamed or removed').toBeGreaterThan(-1);
    const closeAt = composer.indexOf('\n  }', from);
    expect(closeAt, 'beginOpenState is unterminated').toBeGreaterThan(-1);
    expect(composer.slice(from, closeAt)).toContain('nonTradeAlert = stickyNonTradeAlert;');

    // …and the declaration stays false, so nothing captures the prop's initial value.
    expect(composer).toContain('let nonTradeAlert = $state(false);');
  });

  /*
    The effect that calls it, asserted because the reset being correct is worth nothing if nobody
    runs it on open. `wasOpen` is what makes it a TRANSITION rather than every render.
  */
  it('runs that reset on the transition to open', () => {
    expect(composer).toContain('if (open && !wasOpen) beginOpenState();');
  });
});
