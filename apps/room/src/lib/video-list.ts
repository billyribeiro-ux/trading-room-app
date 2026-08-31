/*
  THE PRESENTER'S SAVED VIDEO LIST — what may go into it, and where it is kept.

  ## Why this is a module

  Extracted from `VideoPlayer.svelte` on 2026-08-31, auditing that surface against the v4 bundle.
  `sendVideoToRoom` is a decision — four refusals, one normalisation, one accepted value — wrapped in
  three lines of state assignment, and the decision was the part nothing could execute. Every one of
  the four sentences is a captured string, and a captured string with no test is a string somebody
  rewords the next time it reads awkwardly.

  Pulled out, `video-list-contract.test.ts` runs the whole ladder including the branch that cannot be
  reached (see `youtubeEmbedUrl`), with no component mounted — and the storage half at the bottom of
  this file with a stub `Storage`, which is the other thing a component cannot be asked about.

  Same shape as `#lib/chat-mode.ts`'s `chatModeConfirmPrompt`, `#lib/reaction-toggle.ts` and
  `#lib/chat-plain-text.ts`: the rule leaves the component, the component keeps the state.

  ## The reference, byte 1,979,646

  ```js
  sendVideoToRoom(){
    let e=this.videoURL?.trim()||"";
    if(e) if(this.validURL(e)){
      if(e.includes("youtube")){ … }
      if(this.videoList&&this.videoList?.length>0&&this.videoList.includes(e))
        return void bootbox.alert("Video already exists.");
      this.videoList.push(e), … , this.videoURL="", bootbox.alert("Video added.")
    } else bootbox.alert('The link seems to be missing "https://" or "http://"');
    else bootbox.alert("Error. URL is empty.")
  }
  ```

  The `if/else` reads inside out because it is minified; the ORDER is empty, then scheme, then
  YouTube, then duplicate, and it is load-bearing — a blank field answers "URL is empty" rather than
  the scheme complaint, and a YouTube link that is already in the list is normalised BEFORE the
  duplicate test, so `watch?v=X` and `youtu.be/X` are the same entry.
*/

/**
 * `validURL(e)`, byte 1,979,590 — and it is `includes`, not a parse.
 *
 * `"http://"` anywhere in the string passes, which means `mailto:x?u=http://y` does. Transcribed
 * rather than tightened, for the reason this repository states about captured behaviour generally:
 * the value is fed to an `<iframe src>` or a `<video src>` that the room's own sanitiser pipe
 * handles, and replacing a captured check with a stricter one of our own invention would change
 * which urls a presenter's saved list still accepts after an upgrade.
 */
const validURL = (value: string): boolean =>
  value.toLowerCase().includes('http://') || value.toLowerCase().includes('https://');

/*
  The YouTube normalisation — and the second branch is UNREACHABLE, upstream and here.

  The two patterns below are the capture's own, byte 1,979,760, character for character including the
  escapes that are redundant to a regex engine. They are NOT re-quoted in this comment: the video-id
  pattern ends `.*` immediately before its closing delimiter, and those two characters inside a block
  comment close the comment. A quotation that truncates the file it documents is worse than a
  pointer, so this is the pointer and the code below is the quotation.

  What the comment does have to carry is the control flow around them, byte 1,979,830:

  ```
  if (!o || !r) return void bootbox.alert("The youtube link seems wrong.");
  o ? e = `https://www.youtube.com/embed/${o}?autoplay=1`
    : r && (e = `https://www.youtube.com/embed/videoseries?list=${r}&autoplay=1&loop=1&rel=0`)
  ```

  **The guard demands BOTH ids**, and the ternary on the next line branches on the video id alone.
  Anything reaching the ternary therefore has both, so the playlist arm is dead code in the capture: a
  YouTube url carrying a `list=` and no video id is refused by the guard above it, and one carrying
  both is rendered as the single video. A presenter pasting a pure playlist link gets "The youtube
  link seems wrong."

  The dead arm is reproduced by NOT being written — building the playlist url would answer a question
  the reference has not answered — and `video-list-contract.test.ts` asserts the arm is unreachable
  rather than asserting what it returns, so the day somebody relaxes the guard the test says which
  decision they have just made.
*/
// eslint-disable-next-line no-useless-escape
const VIDEO_ID = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
// eslint-disable-next-line no-useless-escape
const PLAYLIST_ID = /[?&]list=([^#\&\?]+)/;

function youtubeEmbedUrl(value: string): string | null {
  const videoId = VIDEO_ID.exec(value)?.[2] ?? null;
  const playlistId = PLAYLIST_ID.exec(value)?.[1] ?? null;
  if (!videoId || !playlistId) return null;
  return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
}

/**
 * What the presenter's `+` button decided: a url to append, or a sentence to show them.
 *
 * A discriminated union rather than a thrown error or a null, because FOUR of the six outcomes are
 * refusals with different words in them and the caller has to render whichever one it got. A `null`
 * return would collapse them into "something was wrong".
 */
export type VideoEntry =
  { readonly ok: true; readonly url: string } | { readonly ok: false; readonly alert: string };

/**
 * The ladder, in the reference's own order.
 *
 * `existing` is read and never written: the caller owns the list and its persistence, which is what
 * keeps this pure. The duplicate test runs on the NORMALISED value for the reason above.
 *
 * `"Video added."` is the caller's to raise, not this function's — it is the success message, and a
 * function that returns a success value and a success sentence is two answers to one question.
 */
export function videoListEntry(input: string, existing: readonly string[]): VideoEntry {
  const trimmed = input?.trim() || '';
  if (!trimmed) return { ok: false, alert: 'Error. URL is empty.' };
  if (!validURL(trimmed)) {
    return { ok: false, alert: 'The link seems to be missing "https://" or "http://"' };
  }

  let url = trimmed;
  if (url.includes('youtube')) {
    const embed = youtubeEmbedUrl(url);
    if (embed === null) return { ok: false, alert: 'The youtube link seems wrong.' };
    url = embed;
  }

  if (existing.length > 0 && existing.includes(url)) {
    return { ok: false, alert: 'Video already exists.' };
  }
  return { ok: true, url };
}

/*
  ── WHERE THE LIST IS KEPT ───────────────────────────────────────────────────────────────────────

  `this.appService.localstorage.set(`videos-${this.appService.globals.sessionID}`, JSON.stringify(…))`
  at byte 1,980,404, and the read at byte 1,967,675:

  ```js
  loadVideos(){ if(this.appService.globals.isPresenter){
    const e=this.appService.localstorage.get(`videos-${this.appService.globals.sessionID}`,"");
    e&&(this.videoList=JSON.parse(e)) } }
  ```

  PER SESSION, not per user and not per browser: the key carries the room's session id, so a
  presenter running two rooms keeps two lists. That is the reference's own key and it is the reason
  the id is a parameter rather than read from anywhere.
*/

/** `videos-${sessionID}` — the reference's key, built in one place so it cannot drift between the
 * read and the write. */
export const videoListStorageKey = (sessionId: string): string => `videos-${sessionId}`;

/**
 * The saved list, or an empty one — and the shape guard is the point.
 *
 * The reference is `e && (this.videoList = JSON.parse(e))`, which trusts whatever is under the key:
 * a corrupted or hand-edited value makes `videoList` a number, an object, or an array of objects,
 * and the `{#each}` that renders it then puts `[object Object]` in a list of urls with a working
 * Play For All button beside it.
 *
 * Reading it back is the one place this room can afford not to trust the capture, because the value
 * is not a wire message — it is whatever is in THIS browser's storage, which nothing validated on the
 * way in either. Anything that is not an array of strings is discarded whole rather than filtered:
 * half of a corrupted list is not a list a presenter recognises.
 *
 * `catch` returns the empty list rather than rethrowing, because a `SyntaxError` here has exactly one
 * sensible answer and the presenter can rebuild the list. That is a deliberate exception to this
 * repository's no-silent-fallback rule and it is narrow: one key, one parse, one browser.
 */
export function readVideoList(storage: Storage, key: string): string[] {
  const stored = storage.getItem(key);
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
  } catch {
    return [];
  }
}

/** `localstorage.set(key, JSON.stringify(videoList))` — the write, byte 1,980,404. */
export function writeVideoList(storage: Storage, key: string, videoList: readonly string[]): void {
  storage.setItem(key, JSON.stringify(videoList));
}
