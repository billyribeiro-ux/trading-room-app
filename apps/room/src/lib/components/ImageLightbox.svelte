<script lang="ts">
  /*
    THE IMAGE LIGHTBOX — `showImagePreview(e, i = "")`, bundle byte 1,992,730.

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

    ## What is NOT transcribed, and why it cannot be from this checkout

    The download button's CONTAINER and its class list. Upstream passes
    `className: "btn-primary btn-sm m-auto"` inside `buttons`, and it is **bootbox** that decides
    where a `buttons` entry lands and what classes it ends up with — `window.bootbox` is a global in
    the captured page and its source is not in the 2,891,205-byte bundle. So `.modal-footer` versus
    the body, and whether `btn` is prepended, are answerable only from a rendered DOM capture, and
    the capture roots that would hold one are absent here. The `<hr />` and the in-body placement
    below are this room's, are recorded as this room's, and are not evidence of anything.

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
          <img src={url} alt={url} />
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
