<script lang="ts">
  /*
    `gde` — `app-session-login`'s LOADING VIEW, the whole page while a sign-in is in flight.

    ## Why it is its own component, and the seam is upstream's

    The reference's login component is a two-way swap at its root, and the two arms are two separate
    template functions:

    ```js
    template:function(i,o){ 1&i && H(0,gde,5,0,"div",0)(1,yue,39,2),
                            2&i && O(0, o.appService.globals.logginIn ? 0 : 1) }
    ```
    (byte 1,209,498.) `yue` is the login form, 39 declarations and 2 variables. `gde` is this — five
    declarations, no variables, at byte **1,170,863**:

    ```js
    function gde(t,n){ 1&t && (d(0,"div",0)(1,"div",1), T(2,"i",2), d(3,"span",3), v(4,"Loading..."), u()()()) }
    0  [1,"position-relative","w-100","h-100"]
    1  [1,"position-absolute","top-50","start-50","translate-middle"]
    2  [1,"fas","fa-spinner","fa-spin","fa-2x"]
    3  [1,"ms-3","loading-message"]
    ```

    So splitting here follows the reference rather than cutting across it, which is what
    `source-size-contract` asks of a split when it refuses a file — and it refused
    `session/+page.svelte` at 771 against 702 the moment this arrived. No props: `gde` has no
    variables either, and a component with a `busy` prop would be inventing state the reference's own
    arm does not have. The gate stays at the call site, where the root swap keeps it.

    ## The branch this replaces, which we had built backwards

    The login button used to swap its own label to " Connecting " with a spinner — `mue`, const 110
    `[1,"ml-2","fas","fa-spinner","fa-spin"]`. That markup is real and it is UNREACHABLE: `mue` lives
    inside `yue`, whose gate on the same flag is at byte 1,187,265

    ```js
    z("disabled",e.appService.globals.logginIn||!e.loginReady),m(),
    O(30,e.appService.globals.logginIn?31:30)
    ```

    and the root swap above reads that flag first. By the time " Connecting " would be chosen, `yue`
    is not on the page. A member of the original application sees THIS, centred, and never that.

    Same shape as `SP2-04` and `G08`, mirrored: those were reachable branches recorded as
    unreachable; this was an unreachable branch built as if it were the visible one. All three were
    found the same way — by reading every occurrence of the flag rather than the one nearest the
    markup. `session-login-loading-contract.test.ts` re-reads both gates against the pinned bundle.
  */
</script>

<div class="position-relative w-100 h-100">
  <div class="position-absolute top-50 start-50 translate-middle">
    <i class="fas fa-spinner fa-spin fa-2x"></i><span class="ms-3 loading-message">Loading...</span>
  </div>
</div>

<style>
  /*
    `.loading-message[_ngcontent-%COMP%]{font-size:24px}` — `app-session-login`'s own scoped rule,
    verbatim, and the reason the class is carried at all: this repository does not ship a class no
    rule reads. The five Bootstrap utilities beside it — `position-absolute`, `top-50`, `start-50`,
    `translate-middle`, `ms-3` — all resolve in `css/complete-app-styles.css`, so they are not
    written out here; the contract asserts that rather than trusting it.
  */
  .loading-message {
    font-size: 24px;
  }
</style>
