import { invalidateAll } from '$app/navigation';
import { setRestreamUrl } from '../../routes/session-commands.remote';

/**
 * *" Set Restream URL "* and *" Clear Restream URL "* — SC-13's write path.
 *
 * ## What these two buttons did before
 *
 * `onPreferenceChange('restreamToURL', restreamLink)` and the same with `''`. That is `prefs.save`,
 * which stores a PER-VIEWER preference; those two calls were the only occurrences of the name in
 * `apps/room/src`, and nothing anywhere read it. So a presenter typed a destination, pressed Set,
 * and the room republished to nowhere — while the pane went on showing the value back to them,
 * which is exactly why it could survive. `restreamToURL` is a ROOM setting and it lives on the
 * controller.
 *
 * `startRestream` at bundle byte 2,174,659 sends the admin command `setRestreamURL` with
 * `{restreamToURL}`, and `{restreamToURL: ""}` to clear.
 *
 * ## Failure is LOUD, and it has to be here specifically
 *
 * The pane clears its own textarea before this is awaited (the reference does too: `startRestream`
 * assigns `this.restreamLink = ""` in the same statement as the clear command). So a refused write
 * leaves an empty box next to a room that is still restreaming to the old destination — the exact
 * shape of "a control whose only effect is changing its own label". The alert is what makes the two
 * disagree visibly, and `invalidateAll()` afterwards puts the page data back in step.
 *
 * ## Why a module and not a page function
 *
 * `close-message.ts` beside it records the reason and it is unchanged: the page is the composition
 * root, `source-size-contract.test.ts` prices every feature wired directly into it, and `dialogs` is
 * the PAGE's one alert surface rather than this feature's.
 */
export async function saveRestreamUrlThen(
  url: string,
  deps: { dialogs: { alert: string | null } }
): Promise<void> {
  try {
    await setRestreamUrl({ url });
  } catch (error) {
    console.error('setRestreamUrl', error);
    deps.dialogs.alert = 'Command failed.';
    return;
  }
  await invalidateAll();
}
