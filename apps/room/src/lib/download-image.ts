/**
 * Save an image the room is showing — `dta-02`, and the reference's own download callback.
 *
 * ```js
 * callback: () => (fetch(e).then(o => o.blob()).then(o => {
 *   const s = document.createElement("a"); s.href = URL.createObjectURL(o);
 *   let r = e.split("/").pop() || "image.jpg";
 *   r = r.replace(/^[^_]+_/, "").replace(/_[^_]+(\.[^.]+)$/, "$1");
 *   s.download = r, … }))                                          // bundle byte 1,992,730
 * ```
 *
 * ## Why it is a module and not a method on `RoomModals`
 *
 * It WAS one, and it had exactly one caller. `dta-02` needed a second and a third — the day-trade
 * and swing panes' image lightboxes — and neither of those components holds `RoomModals`, nor
 * should: handing a pane the room's whole modal state so it can save a file is the coupling this
 * repository keeps taking back out.
 *
 * And it was never modal state. There is no field, no lifecycle and nothing rendered; it is an
 * anchor click. A method whose class it never touches is a function that has not been extracted
 * yet.
 *
 * ## The filename rules are the reference's and they are not cosmetic
 *
 * `replace(/^[^_]+_/, '')` drops the upload id this room's storage prefixes, and
 * `replace(/_[^_]+(\.[^.]+)$/, '$1')` drops the size suffix before the extension. Without them a
 * presenter saving a screenshot gets `a3f9c1_chart_1024.png` instead of `chart.png`. Transcribed
 * character for character; `image.jpg` is the reference's own fallback for a url that ends in a
 * slash.
 *
 * `XMLHttpRequest` rather than `fetch`, which is the one divergence and it is inherited: this is
 * the code that was already here, and swapping the transport while moving a function is how a move
 * becomes a change nobody reviewed.
 */
export function downloadImage(url: string): void {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.responseType = 'blob';
  xhr.onload = () => {
    const urlCreator = window.URL;
    const imageUrl = urlCreator.createObjectURL(xhr.response as Blob);
    const tag = document.createElement('a');
    let imageName = url.split('/').pop() || 'image.jpg';
    imageName = imageName.replace(/^[^_]+_/, '').replace(/_[^_]+(\.[^.]+)$/, '$1');
    tag.href = imageUrl;
    tag.download = imageName;
    tag.style.display = 'none';
    document.body.appendChild(tag);
    tag.click();
    tag.remove();
    urlCreator.revokeObjectURL(imageUrl);
  };
  xhr.send();
}
