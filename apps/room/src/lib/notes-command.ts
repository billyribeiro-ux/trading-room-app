import { z } from 'zod';

export const NOTE_HTML_MAX_LENGTH = 1_000_000;

export const newSessionNoteTabSchema = z.strictObject({
  cmd: z.literal('newSessionNoteTab'),
  data: z.strictObject({
    name: z.string().trim().min(1).max(120)
  })
});

export const saveSessionNoteSchema = z.strictObject({
  cmd: z.literal('saveSessionNote'),
  data: z.strictObject({
    noteId: z.number().int().positive(),
    contentHtml: z.string().max(NOTE_HTML_MAX_LENGTH)
  })
});

export const restoreNoteVersionSchema = z.strictObject({
  cmd: z.literal('restoreNoteVersion'),
  data: z.strictObject({
    noteId: z.number().int().positive(),
    versionId: z.number().int().positive()
  })
});

export const renameSessionNoteTabSchema = z.strictObject({
  cmd: z.literal('renameSessionNoteTab'),
  data: z.strictObject({
    noteId: z.number().int().positive(),
    newName: z.string().trim().min(1).max(120)
  })
});

export const deleteSessionNoteTabSchema = z.strictObject({
  cmd: z.literal('deleteSessionNoteTab'),
  data: z.strictObject({
    noteId: z.number().int().positive()
  })
});

export const setWelcomeMatNoteTabSchema = z.strictObject({
  cmd: z.literal('setWelcomeMatNoteTab'),
  data: z.strictObject({
    noteId: z.number().int().positive(),
    allRooms: z.boolean(),
    /**
     * The all-rooms password a presenter typed, forwarded to the CONTROLLER for comparison.
     *
     * `pw` in the captured command (byte 1,474,217), and it carries the same name here so the two
     * can be read against each other. What differs is who compares it: upstream does so in the
     * browser against a value `sessData` holds, which means a member who can read `sessData` can
     * also send this command with any `pw` at all. The check that mattered never ran on a server.
     *
     * Optional and defaulting to empty, because `allRooms: false` never asks for one and because a
     * room with no `allRoomsWelcomeMatPW` configured is confirmed rather than prompted — the
     * controller answers `required:false` for that case and the empty candidate is what asks it.
     */
    pw: z.string().default('')
  })
});
