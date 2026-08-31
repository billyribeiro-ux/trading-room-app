<script lang="ts">
  /*
    "Upload this image?" — the confirmation that stands between a stray Ctrl-V and the upload server.

    ## The reference has ONE of these and this room had three copies of it

    `onImagePaste` exists twice upstream and builds the same `bootbox.confirm` body both times:

    ```js
    // app-presentationarea, for the swing and day-trade forms — byte 1,992,250
    bootbox.confirm({ message: '<div class="text-center"><h4>Upload this image?</h4>' +
      '<img style="max-width:100%; max-height: 50vh;" src="' + a + '" /> </div>', … })

    // app-chat, for the room composer — byte 1,445,719
    bootbox.confirm({ message: '<div class="text-center"><h4>Upload this image?</h4>' +
      '<img style="max-width:100%; max-height: 50vh;" src="' + r + '" />' +
      '<div class="w-100 mt-3"><textarea class="form-control w-100"  rows="2" id="msg-text" ' +
      'name="msg-text" placeholder="Enter your message">' + a + '</textarea></div></div>', … })
    ```

    Identical apart from what the chat one appends — the message that travels with the image, seeded
    from whatever was already in the composer. So the shape is one control with an optional tail,
    and that is what this file is: the tail arrives as `children`.

    It was three transcriptions in `RoomOverlays.svelte` — chat, swing, day-trade — and two of them
    carried the SAME sixteen-line citation, word for word. Three copies of one dialog is three places
    for the heading to go missing, which is not hypothetical: `dta-04` was raised because the swing
    and day-trade copies had shipped WITHOUT `<h4>Upload this image?</h4>`, leaving an unlabelled
    OK/Cancel over a picture, while the chat copy had carried it since it was written.

    ## Why the heading is the load-bearing part

    Without the question this dialog is an OK button over an image and nothing on it says what OK
    does. The presenter pasted; something appeared. Confirming an upload is the entire purpose of
    the control, so the sentence that states it is not decoration.

    ## `max-height: 50vh` stays INLINE

    Upstream writes it inline and so does this, rather than folding it into `.img-fluid` — that rule
    is `max-height: 70vh` (bundle byte 2,026,977, `app-presentationarea`'s own styles) and it is
    shared with the alert lightbox, which WANTS the extra height. `max-width: 100%` is inline
    upstream too and comes from `.img-fluid` here; the two agree, and the narrower inline
    `max-height` wins over the class either way.

    ## What it deliberately does NOT own

    WHICH uploader runs. `imgUpload`/`doImggurUpload` dispatch on a feature name deny-by-default —
    `"swing" === i ? swingAlert.image = F : "dayTrade" === i && (dayTradeAlert.image = F)`, byte
    1,992,037 — so each caller keeps its own `onconfirm`. Sharing one handler between them is how an
    image meant for a form ends up posted into chat.
  */
  import type { Snippet } from 'svelte';

  import BootboxDialog from '#lib/components/BootboxDialog.svelte';

  interface Props {
    /** The `URL.createObjectURL(file)` the caller made when it took the paste. */
    previewUrl: string;
    /** Dismissal. Each caller clears its own pending paste; see the note above on why. */
    onclose: () => void;
    /** Confirmation. Each caller runs its own uploader, for the same reason. */
    onconfirm: () => void;
    /** The chat composer's message textarea. Absent for the two alert forms, which have none. */
    children?: Snippet;
  }

  let { previewUrl, onclose, onconfirm, children }: Props = $props();
</script>

<BootboxDialog mode="confirm" message="" {onclose} {onconfirm}>
  <div class="text-center">
    <h4>Upload this image?</h4>
    <img src={previewUrl} class="img-fluid" style="max-height: 50vh;" alt="Pasted screenshot" />
    {@render children?.()}
  </div>
</BootboxDialog>
