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
    allRooms: z.boolean()
  })
});
