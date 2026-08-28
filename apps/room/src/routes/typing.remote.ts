import { command, getRequestEvent } from '$app/server';
import { z } from 'zod';
import { requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import { readRoomConfig } from '#lib/server/room-config-client.js';
import { publishTypingToRoom } from '#lib/server/room-events.js';
import { noteNotTyping, noteTyping, typingChannel } from '#lib/server/typing.js';

/*
  `typing` and `notyping` — the two frames a typing burst produces.

  ```js
  sendServerCommand("typing",   { c: channel || "main", n: nick, uid: userXrefID, pm: null, pu: null })
  sendServerCommand("notyping", { c: channel || "main",          uid: userXrefID, pm: null, pu: null })
  ```

  Bytes 1,435,993 and 1,435,666. TWO frames per burst, not one per keystroke — the client sends
  `typing` once when it starts and `notyping` when the box empties, loses focus, or five seconds pass
  without a key. That is what makes broadcasting this affordable.

  ## ONE command, not two

  Upstream sends two named commands with almost the same payload. Here it is one command with a
  boolean, because the two differ only in which of two lines of the registry they call and both then
  publish the same frame — and a second endpoint would be a second place to forget the entitlement
  check below.

  ## `pm` and `pu` are NOT carried

  Both are `null` at both call sites in the capture, on every send. A field that is always null is
  not a field; carrying it would be reproducing the shape of a feature (private-chat typing) that no
  captured code path ever populates. Recorded rather than silently dropped.

  ## The NAME comes from the session, never from the request

  Upstream puts `n: globals.user.nick || globals.user.name` on the wire, so a client chooses the name
  every other member sees under "is typing". This one reads it from the session — the same rule
  `sendPrivateMessage` applies to `recvdNick`, and for the same reason: display data supplied by the
  sender is display data the sender can lie about.
*/
export const setTyping = command(
  z.strictObject({
    /** `c` — the chat channel. Empty becomes `"main"`, which is the reference's own default. */
    chatChannel: z.string().trim().max(64).default(''),
    typing: z.boolean()
  }),
  async ({ chatChannel, typing }) => {
    const { locals } = getRequestEvent();
    const user = requireUser(locals);
    const room = requireRoomShortCode(locals);

    /*
      THE ENTITLEMENT IS CHECKED ON THE SERVER, and it is checked on the SEND rather than only on the
      display. `showTyping = sessData.hasTypingIndicator` (byte 1,437,168) governs whether the
      indicator renders; a room without it must also not have members broadcasting their keystroke
      state to each other, which a display-only gate would leave happening.

      `!== true`, fail-closed: absent means the room never bought it.
    */
    const config = await readRoomConfig(locals, room, user.email);
    if (config.settings?.hasTypingIndicator !== true) return;

    const channel = typingChannel(chatChannel);
    if (typing) noteTyping(room, channel, { id: user.id, name: user.displayName });
    else noteNotTyping(room, channel, user.id);

    publishTypingToRoom(room, channel);
  }
);
