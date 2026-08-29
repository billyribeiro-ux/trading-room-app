/**
 * The 125px box a profile picture is downscaled into before it is uploaded.
 *
 * ## Transcribed, not designed
 *
 * `adminUploadProfilePic` at bundle byte 2,084,700 reads the chosen file with a `FileReader`, draws
 * it into a canvas, and resizes before anything leaves the browser:
 *
 * ```js
 * var B = _.width, W = _.height;
 * B > W ? B > 125 && (W *= 125 / B, B = 125)
 *       : W > 125 && (B *= 125 / W, W = 125);
 * F.width = B; F.height = W;
 * J.drawImage(_, 0, 0, B, W);
 * i.dataurl = F.toDataURL("image/png");
 * F.toBlob(te => { i.dataBlob = te }, "image/png", 1);
 * ```
 *
 * So: **the longest edge becomes 125 and the other is scaled to match; an image already inside the
 * box is left alone.** The ternary is on `B > W`, which means a SQUARE image takes the `else`
 * branch and is measured against its height — the same answer either way, and reproduced rather
 * than normalised because it costs nothing to be exact.
 *
 * ## Why this is a separate, pure module
 *
 * The arithmetic is three lines and the canvas around it needs a browser. Split, the sizing can be
 * tested against every shape that matters — wide, tall, square, already-small, exactly-125 — without
 * a DOM, and the component keeps only the part that genuinely needs one.
 *
 * ## Why the downscale matters here more than it did upstream
 *
 * This room stores the uploaded bytes itself (`storeUpload`), where the reference POSTed to a CDN.
 * A presenter picking a 4,000px photo would otherwise put four megabytes on disk and serve them into
 * a **45px roster row** and an **80px modal avatar** — the only two places an avatar is ever drawn.
 * The reference's 125px is comfortably above both, so nothing is lost that anything can display.
 *
 * ## The correction this file records
 *
 * `upload-profile-picture` was built on 2026-08-29 WITHOUT this step, because the evidence row that
 * names it — `docs/decoded/missing-commands-triage.md:93`, *"canvas-downscales the image to a 125px
 * longest edge"* — was not read until after the feature shipped. The row is truncated in that
 * document, so the arithmetic above comes from the bundle itself rather than from the summary.
 */

/** The longest edge, after the reference's own resize. */
export const MAX_EDGE = 125;

/**
 * The box `drawImage` is given, from the image's natural size.
 *
 * Returns integers, because a canvas dimension is an integer and `W *= 125 / B` does not produce
 * one. The reference assigns the float straight to `canvas.width`, which the platform truncates —
 * so `Math.round` here would be a divergence of up to half a pixel. `Math.floor` is what the
 * platform does, and it is what this does.
 */
export function downscaledSize(width: number, height: number): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    /*
      A zero or non-finite dimension means the browser could not decode the image. Returning the
      input unchanged lets the caller carry on and fail at the upload, where the error message names
      the real problem, rather than throwing here with a size complaint about a file that is not an
      image at all.
    */
    return { width, height };
  }

  let w = width;
  let h = height;

  // The reference's own ternary, including its treatment of a square as `height`-led.
  if (w > h) {
    if (w > MAX_EDGE) {
      h *= MAX_EDGE / w;
      w = MAX_EDGE;
    }
  } else if (h > MAX_EDGE) {
    w *= MAX_EDGE / h;
    h = MAX_EDGE;
  }

  return { width: Math.floor(w), height: Math.floor(h) };
}

/** Whether an image of this size would be changed at all. Lets a caller skip the canvas entirely. */
export function needsDownscale(width: number, height: number): boolean {
  const scaled = downscaledSize(width, height);
  return scaled.width !== width || scaled.height !== height;
}
