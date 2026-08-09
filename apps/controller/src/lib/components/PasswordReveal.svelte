<script lang="ts">
  /**
   * A password field with a show/hide toggle.
   *
   * ## Where it sits
   *
   * The reference decorates every password field with a static lock:
   * `<span class="acc-feedback"><i class="fa fa-lock"></i></span>`, absolutely positioned in the
   * input's right-hand 34px, `pointer-events: none`. This replaces that decoration with a control
   * in the same box — same position, same size, same muted colour — so the layout is unchanged and
   * the space stops being purely ornamental.
   *
   * A deliberate divergence from the reference, asked for directly: a person typing a password they
   * cannot see, into a field with a 12-character minimum, has no way to tell a typo from a rejected
   * password.
   *
   * ## Why `type` is toggled rather than a `text` input swapped in
   *
   * Changing the `type` attribute keeps the SAME element, so the value, cursor position, selection
   * and any password-manager binding all survive the toggle. Swapping elements loses the caret and
   * can make a manager re-offer autofill mid-typing.
   *
   * ## Why the button is `type="button"`
   *
   * Inside a form, a button with no type is a SUBMIT button. Without this, revealing your password
   * would submit the login form — which is exactly the class of bug this codebase already hit with
   * the row Actions menu, where the wrong default silently did the wrong thing.
   *
   * ## Accessibility
   *
   * `aria-pressed` states whether the password is currently visible, so a screen reader announces
   * the toggle's state rather than just its name. `tabindex={-1}` is deliberately NOT set — unlike
   * the editor toolbar, this control has no other route to it, so it must be reachable by keyboard.
   */
  interface Props {
    id: string;
    name: string;
    placeholder?: string;
    /** The class the surrounding page uses for inputs — `acc-input` here, `form-control` on manage. */
    inputClass?: string;
    /**
     * The class the surrounding page uses for the slot to the right of the input.
     *
     * Three layouts exist and they do not share a name: `.acc-feedback` on the account pages,
     * `.auth-addon` in the room login, and nothing at all on the manage page's inline forms. Passing
     * it in keeps this component out of the business of knowing which page it is on.
     */
    toggleClass?: string;
    autocomplete?: 'current-password' | 'new-password' | 'off';
    minlength?: number;
    required?: boolean;
    ariaLabel?: string;
  }

  let {
    id,
    name,
    placeholder = 'Password',
    inputClass = 'acc-input',
    autocomplete = 'current-password',
    minlength,
    required = false,
    ariaLabel,
    toggleClass = 'acc-feedback'
  }: Props = $props();

  let revealed = $state(false);
</script>

<input
  class={inputClass}
  {id}
  {name}
  type={revealed ? 'text' : 'password'}
  {placeholder}
  {autocomplete}
  {minlength}
  {required}
  aria-label={ariaLabel ?? placeholder}
/>
<button
  class="{toggleClass} pw-reveal"
  type="button"
  onclick={() => (revealed = !revealed)}
  aria-pressed={revealed}
  aria-label={revealed ? 'Hide password' : 'Show password'}
  title={revealed ? 'Hide password' : 'Show password'}
>
  <i class={revealed ? 'fa fa-eye-slash' : 'fa fa-eye'} aria-hidden="true"></i>
</button>

<style>
  /*
    `.acc-feedback` sets `pointer-events: none` — correct for the decoration it was, fatal for a
    control. Re-enabled here, along with resetting the browser's own button chrome so it occupies
    exactly the box the span did.
  */
  .pw-reveal {
    pointer-events: auto;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    font-size: inherit;
  }

  .pw-reveal:hover,
  .pw-reveal:focus-visible {
    color: rgb(51, 51, 51);
  }
</style>
