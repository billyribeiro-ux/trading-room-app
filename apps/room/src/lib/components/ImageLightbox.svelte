<script lang="ts">
  /*
    THE IMAGE LIGHTBOX — `openImageModal(event, url)`, `deployed-index.html` lines 70-124.

    ## IT WAS ATTRIBUTED TO THE WRONG UPSTREAM FUNCTION, and that decided its `alt`

    Corrected 2026-09-02 (ROV-03, OVL-06). There are TWO image viewers upstream and this file was
    read against the other one:

      `showImagePreview(e, i = "")`   bundle byte 1,992,730 — the ALERT PANES' preview
      `openImageModal(event, url)`    deployed-index.html:70 — the CHAT image, and this dialog

    This room's whole image path is the second. `RoomModals.openImage` is its transcription, popped-out
    window and all, and `routes/+page.svelte` assigns that method to `window.openImageModal` — the
    global name the captured page defines for its own inline `onclick` handlers to call. So the
    function whose dialog this is was already built here, from the same capture file this docblock
    used to say was absent.

    ## What that changes, and what it settles

    `alt` is the FILENAME: `var imageName = url.substring(url.lastIndexOf('/') + 1)` at index line
    106, then `'<img src="' + url + '" alt="' + imageName + '" />'`. This component computed exactly
    that until 2026-08-31, when it was changed to the whole URL on the ground that the filename was
    "a preference substituted for a captured value". It was a captured value — of the right function,
    read from the wrong one.

    (The other viewer really does use `alt="${e}"`, the whole URL. Both are the capture's; they
    belong to different dialogs.)

    ## The old `showImagePreview` reading, kept because it is still the other half of the story

    ```js
    showImagePreview(e, i = "") { e && bootbox.dialog({ title: i,
      message: `\n        <div class="text-center">\n          <img src="${e}"\n
        class="img-fluid"\n               alt="${e}" />\n        </div>\n      `,
      size: "large",
      buttons: { download: { label: '<i class="fa fa-download"></i> Download Image',
        className: "btn-primary btn-sm m-auto", callback: () => (fetch(e)…, !1) } } }) }
    ```

    Four call sites, all in `app-presentationarea`: the swing form's preview (1,933,330), the swing
    table's thumbnail (1,936,798) and the day-trade pair (1,939,572 / 1,943,143). `title` is never
    passed by any of them, which is why the header below renders an empty `.modal-title`.

    ## `alt` is the WHOLE URL, and the filename was ours

    `alt="${e}"` — the same value as `src`. This component computed
    `url.substring(url.lastIndexOf('/') + 1)` until 2026-08-31, which is a preference substituted
    for a captured value, and it disagreed with this room's OWN other renderer of the same image:
    `RoomModals.showImage` writes `<img src="${url}" alt="${url}" />` into the popped-out window.
    One image, two `alt` rules, neither of them the reference's. It is the reference's now.

    Neither value is a good description of a picture, and no rule this repository can apply would
    invent one — the image is a member's upload and nothing in the room knows what is in it.

    ## The paragraph that used to stand here was WRONG, and it is the reason this row was blocked

    It read: *"The `<hr />` and the in-body placement below are this room's, are recorded as this
    room's, and are not evidence of anything"*, on the ground that only bootbox decides where a
    `buttons` entry lands, that `window.bootbox`'s source is not in the bundle, and that *"the
    capture roots that would hold one are absent here"*.

    The last clause is false, and it was false while `RoomModals.openImage` was being built from the
    very file. `deployed-index.html` — 159 lines, in the same pinned directory as the bundle, listed
    in its `sha256sums.txt` as `d1f84087…6ae9a220` — writes the markup out by hand rather than
    through `buttons`:

    ```html
    <img src="URL" alt="FILENAME" /><hr>
    <button class="btn btn-primary btn-sm" onclick="downloadImage('URL', 'FILENAME')">
      <i class="fa fa-download"></i> Download Image</button>
    ```

    So all three answers exist: the `<hr />`, the in-body placement, and `btn` IS prepended. **The
    room's guess was right and is now evidence**, and the class list below already matches character
    for character.

    The lesson is the one RTE-05 paid for in the same pass: a sweep of ONE capture file reported as a
    sweep of the evidence. `main.d1d09071be31f1ba.js` is not the capture; the directory is.

    `callback: () => (…, !1)` returns false, which is bootbox's "do not dismiss": saving the image
    leaves the lightbox open. That IS transcribed — the button below closes nothing.

    ## No `width`/`height` on the image

    The repository rule asks every `<img>` for intrinsic dimensions or an aspect ratio. This one
    cannot have them: the source is an arbitrary URL chosen at runtime, and any ratio written here
    would be a guess that distorts every image not matching it. `.imgur-modal img` bounds it instead
    (`max-height: calc(100vh - 150px)`), which is what the capture's own stylesheet does.
  */
  import { downloadImage } from '#lib/download-image.js';

  interface Props {
    /** The image to show. The dialog does not render at all without one — `e &&` upstream. */
    url: string;
    onclose: () => void;
  }

  let { url, onclose }: Props = $props();

  /*
    `var imageName = url.substring(url.lastIndexOf('/') + 1)` — `deployed-index.html` line 106,
    verbatim, and it feeds BOTH the `alt` and the download's filename upstream. `$derived` rather
    than computed in the markup because it is read twice.

    No guard for a URL with no `/`: `lastIndexOf` answers -1, `substring(0)` is the whole string, and
    that is what the reference does with it too.
  */
  const imageName = $derived(url.substring(url.lastIndexOf('/') + 1));
</script>

<div
  class="bootbox modal fade imgur-modal show"
  tabindex="-1"
  role="dialog"
  aria-hidden="true"
  style="display: block;"
  onclick={(event) => {
    if (event.target === event.currentTarget) onclose();
  }}
>
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header border-0">
        <!-- svelte-ignore a11y_missing_content -->
        <h5 class="modal-title"></h5>
        <button
          type="button"
          class="bootbox-close-button close btn-close"
          aria-hidden="true"
          aria-label="Close"
          onclick={onclose}
        ></button>
      </div>
      <div class="modal-body">
        <div class="bootbox-body">
          <img src={url} alt={imageName} />
          <hr />
          <button class="btn btn-primary btn-sm" onclick={() => downloadImage(url)}
            ><i class="fa fa-download"></i> Download Image</button
          >
        </div>
      </div>
    </div>
  </div>
</div>
<!--
  `ROV-04` — the backdrop, which this dialog opened without for as long as it existed.

  `showImagePreview` (byte 1,992,730) is a plain `bootbox.dialog({…})`, and bootbox emits a backdrop
  with every dialog it opens — which is what `.modal-backdrop`'s `z-index: 1050` in the shipped
  Bootstrap is for, against `.modal`'s 1055. Without it this dialog opened over an UNDIMMED room:
  the one modal in the application whose whole job is to be looked at, and the only one you could see
  the room through.

  A SIBLING after the dialog, not a child, for two reasons that are both load-bearing. It is where
  `BootboxDialog.svelte:145` puts its own, so the two dialogs in this room emit the same shape; and
  `app.css:762` selects `.bootbox.modal.above-note-modal + .modal-backdrop` — an adjacent-sibling
  combinator that a nested backdrop would silently fall out of. This lightbox does not take that
  class today, so the rule does not apply to it now; putting the element anywhere else would mean it
  could never apply.

  No dismiss handler on it, also matching `BootboxDialog`. The backdrop paints BEHIND the dialog
  element, which itself covers the viewport, so a click on the dimmed area lands on the dialog's own
  `event.target === event.currentTarget` check above. A second handler here would be a control that
  never receives an event.
-->
<div class="modal-backdrop fade show"></div>
