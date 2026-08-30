/*
  ── THE TAB-TITLE FLASHER — G27, reference bytes 2,207,480 / 2,204,266 ───────────────────────

  ```js
  // newMessage(e), at the top:
  this.notificationInterval && clearInterval(this.notificationInterval)
  // …and at the end, for a message that is not mine:
  (!$("#textAreaTxtPM").is(":focus") || !window.onfocus) && !e.isMine && (
    this.notificationInterval = setInterval(() => {
      document.title = this.appService.globals.sessionName === document.title
        ? `${e.n} messaged you - ${this.appService.globals.sessionName}`
        : this.appService.globals.sessionName
    }, 2e3))

  onTextareaFocus() {
    this.notificationInterval && clearInterval(this.notificationInterval),
    document.title !== this.appService.globals.sessionName &&
      (document.title = this.appService.globals.sessionName)
    …
  }

  closePanel() {
    …, this.notificationInterval && (clearInterval(this.notificationInterval),
      document.title = this.appService.globals.sessionName), …
  }
  ```

  ## What was missing, and why the sound was not enough

  A private message arriving while the tab is in the background produced a `pling` and nothing else.
  A muted tab, a member wearing headphones for the presenter's audio, a browser that suppressed the
  sound because nothing had been clicked yet — in every one of those the message simply did not
  arrive as far as the person was concerned. The title is the one signal a background tab can still
  show, and it is why the reference has this at all.

  `moderator-message-contract.test.ts` named this as one of two consumers deliberately left unbuilt,
  with an assertion that fires when either appears — *"this assertion exists so that adding either
  without updating that document fails here."* It fired, which is what it was for.

  ## A module, and no state of its own beyond the timer

  `RoomPrivateChat` is at its ceiling and this is a self-contained concern: it owns one interval and
  the document's title, reads nothing from the panel, and is told when to start and stop. That is the
  same seam `private-chat-scroll.ts` was cut on.
*/

/** `2e3` — how often the title alternates. Exported so the contract reads it rather than restates it. */
export const TITLE_FLASH_MS = 2_000;

let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Start alternating the tab title between the room's name and `<sender> messaged you - <room>`.
 *
 * Restarting replaces any flash already running, which is the reference's own first line in
 * `newMessage` — a second message from somebody else must name THAT sender, not keep flashing the
 * previous one's name.
 *
 * `roomName` is passed rather than read from `document.title`, because the title is the thing being
 * changed: reading it back would capture whichever half of the flash happened to be showing.
 */
export function startTitleFlash(senderName: string, roomName: string): void {
  stopTitleFlash(roomName);
  const flashing = `${senderName} messaged you - ${roomName}`;
  timer = setInterval(() => {
    document.title = document.title === roomName ? flashing : roomName;
  }, TITLE_FLASH_MS);
}

/**
 * Stop the flash and put the room's name back.
 *
 * The restore is conditional in the capture — `document.title !== sessionName && (…)` — and
 * unconditional here, because assigning the same string is free and the condition only exists
 * upstream to avoid a redundant DOM write. What is NOT unconditional is the clear: with no flash
 * running this must leave the title alone, or a component unmounting would overwrite a title
 * something else had set.
 */
export function stopTitleFlash(roomName: string): void {
  if (timer === null) return;
  clearInterval(timer);
  timer = null;
  document.title = roomName;
}
