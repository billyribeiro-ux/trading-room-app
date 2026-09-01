<script lang="ts">
  /*
    `app-kicked-page` — the whole page a kicked member is left looking at.

    Decoded by value from the pinned v4 bundle, class head at byte **2,561,780**:

    ```js
    constructor(){this.msg="kicked"}
    ɵcmp = ut({ type:t, selectors:[["app-kicked-page"]], inputs:{msg:"msg"},
      decls:4, vars:1,
      consts:[ [1,"container","h-100"],
               [1,"d-flex","d-flex-column","h-100","w-100"],
               [1,"align-self-center","w-100"] ],
      template:function(i,o){ 1&i&&(d(0,"div",0)(1,"div",1)(2,"h2",2),v(3),u()()()),
                              2&i&&(m(3),Ze(o.msg)) },
      styles:['h2[_ngcontent-%COMP%]{color:#000;vertical-align:middle;text-align:center}'] })
    ```

    Four declarations, one variable, three consts, one rule. That is the entire component.

    ## The page switch it is an arm of, decoded whole

    `app-root` renders three declarations and the middle one is a five-way conditional. `IRe`, byte
    **2,593,723**:

    ```js
    function IRe(t,n){ if(1&t && H(0,xRe,1,1)(1,MRe,1,0)(2,ARe,1,1)(3,PRe,1,0)(4,RRe,1,1),
      2&t){ let e; O(0, "chat"===(e=g().currPage) ? 0
                     : "closed"===e ? 1 : "kicked"===e ? 2 : "detachedScreen"===e ? 3 : 4) } }
    ```

    `xRe` is `app-room`, `MRe` is `app-closed-session-page`, `ARe` is THIS component bound as
    `z("msg", g(2).kickedMsg)`, `PRe` is `app-detached-screen`, and the fallthrough — where a fresh
    page starts, since `this.currPage="login"` in the constructor at byte 2,594,096 — is `RRe`,
    `app-session-login`.

    **Only two of those five are modelled in this room**, which is why the page holds one nullable
    field rather than a five-way enum: the other three states are not reachable here, and an enum
    whose members nobody can get to invites somebody to try. The detached screen is a popped-out
    window rather than a page, and login is a separate SvelteKit route.

    CORRECTED 2026-09-01: this paragraph used to name the closed-session arm's counterpart as
    *"`CloseSessionPane` inside the modal host"*, and that conflated two different surfaces.
    `CloseSessionPane` is where a PRESENTER writes the close message; a member never sees it. The
    member's side is `session/+page.server.ts:257` — `error(403, closedRoomMessage(shortCode))` — so
    the closed room is an HTTP refusal here rather than a page state, and until the same day it landed
    on SvelteKit's unstyled fallback because this app had no `+error.svelte` at all. It has one now,
    and it borrows THIS component's three captured consts, because upstream's answer to "the room,
    replaced by a sentence saying why" is the same shape for both arms.

    ## Why this exists at all — `TODO.md` row 6's one residual

    `private-commands.ts` recorded the gap in those words: *"NOT DONE, a gap rather than a decision:
    upstream sets `currPage="kicked"` and renders `app-kicked-page`. This room has none, so the
    member is told why and left disconnected."*

    A DIALOG was standing in for it, and a dialog is the wrong shape for this: it is dismissible, and
    what is behind it is a room whose stream has just been closed. The member reads the message,
    presses OK, and is left staring at a frozen room with nothing on screen saying why — which is
    strictly worse than no message at all, because the room now looks broken rather than closed to
    them. The reference replaces the page, and the page stays replaced.

    ## `d-flex-column` is NOT a Bootstrap class, and it is transcribed anyway

    Bootstrap's is `flex-column`. `d-flex-column` matches no rule in the shipped stylesheet, so the
    inner div is `display:flex` in the default ROW direction and the `h2` is centred horizontally by
    `align-self-center` rather than vertically. That is what the reference paints.

    Reproduced rather than corrected, and the reason is the rule this repository already applies
    everywhere else: a captured value is reproduced unless reproducing it locks a real person out.
    A heading that sits at the top of the viewport instead of its middle costs nobody anything, and
    "fixing" it would mean this page no longer matches the capture it was decoded from — with no
    capture of the corrected version to check the result against.

    ## `vertical-align: middle` on a block element does nothing either

    Also transcribed. `vertical-align` applies to inline and table-cell boxes; an `h2` is neither.
    It is in the reference's own `styles:` array and it is inert there too.
  */
  let {
    /**
     * The presenter's message.
     *
     * The reference's default is the lowercase string `"kicked"` — the component's own
     * `constructor(){this.msg="kicked"}` — while the HOST that renders it initialises `kickedMsg`
     * to `"Kicked"` (byte 2,594,096) and overwrites it from the frame:
     * `subscribe("kickPage", oe => { this.kickedMsg = oe, this.currPage = "kicked" })`
     * (byte 2,596,772).
     *
     * So two different defaults exist upstream and neither is normally reached: the presenter's
     * side supplies a message every time, from `getPreference("kickMsg")` or, absent that, the
     * literal `"You have been kicked from the room by an administrator"` (bytes 2,078,396 and
     * 2,078,996). Both defaults are kept here — this one, and the caller's — because collapsing
     * them would mean choosing which of the reference's two is "the" default with no evidence for
     * the choice.
     */
    msg = 'kicked'
  }: { msg?: string } = $props();
</script>

<div class="container h-100">
  <div class="d-flex d-flex-column h-100 w-100">
    <h2 class="align-self-center w-100">{msg}</h2>
  </div>
</div>

<style>
  /* `h2[_ngcontent-%COMP%]{color:#000;vertical-align:middle;text-align:center}`, verbatim. */
  h2 {
    color: #000;
    vertical-align: middle;
    text-align: center;
  }
</style>
