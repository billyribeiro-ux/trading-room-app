<script lang="ts">
  import { page } from '$app/state';

  /*
    THE PAGE EVERY REFUSAL IN THIS APPLICATION LANDED ON, AND UNTIL 2026-09-01 THERE WAS NONE.

    `src/routes` held no `+error.svelte` and `src` held no error shell, so every `error(...)` this
    app raises rendered SvelteKit's built-in fallback: an unstyled white page with the status and the
    message and no font, no colour and no name on it. Measured rather than assumed —
    `find src/routes -name '+error.svelte'` returned nothing, against **126** `error(<status>, …)`
    call sites (44 × 403, 41 × 404, 31 × 400, 4 × 502, 3 × 409, 2 × 429, 1 × 500).

    124 → 126 on 2026-09-02: the transcript's two new doors, both 403 and both in
    `session-transcript.remote.ts` — a config the controller could not answer, and a caller the
    archives gate refuses. Restated rather than left, because the sentence beside it argues that
    this number is measured and not recalled.

    That count EXCLUDES comments, and the first draft of this sentence said 162 because it did not.
    This repository quotes its own code in its docblocks more than most, so a raw grep over `.ts`
    sources over-counts every construct it looks for by a third. `error-page-contract.test.ts`
    re-derives the number on every run rather than trusting this paragraph.

    One of those doors matters more than the rest and is the reason this got built now.
    `session/+page.server.ts:257` answers a closed room with `error(403, closedRoomMessage(shortCode))`
    — the presenter's OWN sentence, written in `CloseSessionPane`'s editor and stored per room. A
    presenter who writes "Back Monday at 9, futures only" was having it delivered on a page that
    looked like the site had broken.

    ## What the reference does here, and which half of it this is

    Upstream has a whole page for this: `app-closed-session-page`, selector at bundle byte
    **2,571,301**, running to `app-detached-screen` at **2,593,043**. It is the room shell repeated —
    navbar, sidebar, Connectivity Check, General Settings, Muted Users, Followed Users, Session
    Control, the mobile-app button — wrapped around ONE content const:

    ```js
    [1,"m-2","w-100","closed-container",3,"innerHTML"]     // byte 2,573,542
    ```

    ## THIS PAGE IS ONLY HALF THE DOOR, AND THE OTHER HALF IS A DIFFERENT FILE

    Measured in a browser rather than reasoned about, and it changed the work.

    A `+error.svelte` renders for errors raised inside a ROUTE — a `load`, a form action, a remote
    function. An error thrown in `hooks.server.ts`'s `handle` is raised before a route is resolved, so
    SvelteKit cannot render a route component for it and falls back to the error SHELL instead.

    That distinction decides which file covers the app's single most common refusal.
    `hooks.server.ts:89` is the authentication choke point — *"every route except PUBLIC_PATHS is
    behind it"* — and it answers `error(403, 'Open this room from your account page.')` from inside
    `handle`. Measured in a browser on 2026-09-01: with this page in place and no shell,
    `GET /no-such-route` still rendered SvelteKit's built-in fallback. So `src/error.html` was written
    the same day, carrying the same captured `h2` rule inline, because it must render when the
    application itself could not run.

    ## Why this is not upstream's page

    Neither half tries to be, and for two measured reasons.

    **`closed-container` styles nothing.** The captured stylesheet is 444,793 bytes and contains no
    rule for it; the only `closed` in the whole sheet is `.ui-icon-mail-closed`, a jQuery UI sprite
    offset. It is an `innerHTML` host hook and nothing else, and this repository's standard forbids
    carrying a class no rule reads.

    **`innerHTML` is the part that must not be reproduced.** Upstream's closed message is Summernote
    rich text written by a presenter and injected as markup. `CloseSessionPane.svelte` already records
    the divergence at the WRITE end — a textarea, not a rich-text editor, *"because the message is
    delivered inside an HTTP error body by `closedRoomMessage`, and sending presenter-authored HTML
    down that path would be an injection surface bought for italics"*. This is the READ end of the
    same decision, and it is why the message below is interpolated as TEXT. `{@html}` here would hand
    every presenter a stored-XSS primitive against every member who ever arrives at a closed room.

    ## The shape is the reference's own, from the page arm next to it

    `app-kicked-page` (class head byte **2,561,780**) is upstream's other whole-page message and its
    entire template is three consts:

    ```js
    consts:[ [1,"container","h-100"], [1,"d-flex","d-flex-column","h-100","w-100"],
             [1,"align-self-center","w-100"] ]
    styles:['h2[_ngcontent-%COMP%]{color:#000;vertical-align:middle;text-align:center}']
    ```

    `KickedPage.svelte` transcribes those verbatim, including `d-flex-column` — which is not a
    Bootstrap class and matches no rule, so the flex runs in the default ROW direction. The same three
    are used here, deliberately: this page and the kicked page are the same thing to a member — the
    room, replaced by a sentence explaining why — and giving them two different layouts would be
    inventing a design where the capture already answers.
  */

  /*
    Read once into locals rather than through `page.` at three sites in the markup. `page` is a
    reactive proxy; the status is read twice below and the message twice, and this is a leaf that
    renders once per navigation — `$derived` would be a subscription bought for nothing.

    Not `$derived` for a second reason worth the line: an error page must render even when the thing
    that failed is state. These are two plain reads with a literal fallback each.
  */
  const status = page.status;

  /*
    SvelteKit's default `handleError` returns `{ message: 'Internal Error' }` for anything it did not
    expect, so an uncaught exception cannot put an internal detail on this page. Every message that
    DOES reach here came from an explicit `error(status, message)` and was written to be read by the
    person it refuses — `'This room is closed.'`, `'No such channel.'`. There is no `handleError` hook
    in `hooks.server.ts`; that default is the one in force, and it is the one this relies on.
  */
  const message = page.error?.message ?? 'Something went wrong.';

  /*
    THE STATUS NUMBER IS SHOWN ONLY AT 500 AND ABOVE, and the threshold is the argument.

    Below 500 the message is one this application wrote on purpose for this exact refusal, and it is
    complete on its own: a member told "This room is closed." learns nothing from a 403 beside it, and
    a support conversation that starts with a number instead of the sentence starts worse.

    At 500 and above the message is generic by construction — SvelteKit's own "Internal Error" — so
    the status is the only thing on the page anyone can act on. `<title>` carries it either way, so a
    screenshot of the tab is enough for whoever is asked to look.
  */
  const showStatus = status >= 500;
</script>

<svelte:head>
  <title>{status} — {message}</title>
</svelte:head>

<div class="container h-100">
  <div class="d-flex d-flex-column h-100 w-100">
    <div class="align-self-center w-100">
      <h2>{message}</h2>
      {#if showStatus}
        <p class="status">Error {status}</p>
      {/if}
    </div>
  </div>
</div>

<style>
  /*
    `h2[_ngcontent-%COMP%]{color:#000;vertical-align:middle;text-align:center}`, verbatim from
    `app-kicked-page`'s own `styles:` array — `vertical-align` included, which does nothing on a
    block box and does nothing upstream either. Transcribed rather than corrected, for the reason
    `KickedPage.svelte` records: a captured value is reproduced unless reproducing it locks a real
    person out.
  */
  h2 {
    color: #000;
    vertical-align: middle;
    text-align: center;
  }

  /*
    Not from the capture — upstream has no counterpart, because upstream's closed page never shows a
    status. Muted and small so that it reads as the footnote it is rather than competing with the
    sentence above it.
  */
  .status {
    color: #6c757d;
    font-size: 0.875rem;
    text-align: center;
  }
</style>
