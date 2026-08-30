export const POLL_SEND_CONFIRMATION = 'Are you sure you want to send this poll?';
export const POLL_CLOSE_CONFIRMATION = 'Closing this window, will end the poll. Are you sure?';
export const POLL_SAVED_ALERT = 'Poll Saved to Pre-Canned polls...';

export interface PollAnswerRecord {
  senderNick: string;
  senderXref: string;
  choiceIndex: number;
}

export interface PollSeriesDatum {
  data: number;
  label: string;
}

export function calculatePollPanelPosition(
  wrapperWidth: number,
  wrapperHeight: number,
  panelOuterWidth: number,
  panelOuterHeight: number
) {
  return {
    left: (wrapperWidth - panelOuterWidth) / 2,
    top: (wrapperHeight - panelOuterHeight) / 2
  };
}

export function pollDeleteConfirmation(question: string) {
  return `Are you sure you want to delete poll "${question}" ?`;
}

export function addPollChoice(choices: readonly string[], choice: string) {
  return choice ? [...choices, `${choice}`] : [...choices];
}

export function deletePollChoice(choices: readonly string[], index: number) {
  return choices.filter((_, choiceIndex) => choiceIndex !== index);
}

export function parsePollChoices(value: string): string[] | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || !parsed.every((choice) => typeof choice === 'string')) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function calculatePollTotals(choiceCount: number, answers: readonly PollAnswerRecord[]) {
  const totals = Array.from({ length: choiceCount }, () => 0);
  for (const answer of answers) {
    if (answer.choiceIndex >= 0 && answer.choiceIndex < totals.length) {
      totals[answer.choiceIndex] += 1;
    }
  }
  return totals;
}

export function calculatePollSeries(
  choices: readonly string[],
  totals: readonly number[],
  total: number
): PollSeriesDatum[] {
  return choices.map((label, index) => ({
    data: total > 0 ? ((totals[index] ?? 0) / total) * 100 : 0,
    label
  }));
}

export function formatPollResults(
  question: string,
  choices: readonly string[],
  totals: readonly number[],
  total: number
) {
  let result = `Poll Results\nQuestion: ${question}\n`;
  for (const [index, choice] of choices.entries()) {
    let percentage = ((totals[index] ?? 0) / total) * 100;
    if (!percentage) percentage = 0;
    result += `${choice} - ${Math.round(percentage)}%\n`;
  }
  return result;
}

/**
 * The ON-SCREEN response rows — `#responsesTxt`, the short form without the xref.
 *
 * ```js
 * $("#responsesTxt").append(this.total + ": [" + i.senderNick + "]: " + s + "\n")
 * ```                                                                        // byte 2,106,688
 *
 * The reference APPENDS one row at a time and each row carries its own trailing newline, so the
 * text always ends in one. `poll-11` — this joined instead, which is the same string minus that last
 * character, and the difference shows the moment anything is appended after it or the box is
 * selected and copied. A `map` + `join` cannot express "every row ends with a newline"; a trailing
 * `+ '\n'` on a non-empty list can, and the empty case stays the empty string rather than a lone
 * newline.
 *
 * NOT the archive form. `formatPollResponseArchive` below carries `- ${xref}`, which the reference
 * accumulates into `textResponses` for the download and deliberately does not show. Two functions
 * because they are two audiences.
 */
export function formatVisiblePollResponses(
  choices: readonly string[],
  answers: readonly PollAnswerRecord[]
) {
  if (answers.length === 0) return '';
  return (
    answers
      .map(
        (answer, index) =>
          `${index + 1}: [${answer.senderNick}]: ${choices[answer.choiceIndex] ?? ''}`
      )
      .join('\n') + '\n'
  );
}

export function formatPollResponseArchive(
  choices: readonly string[],
  answers: readonly PollAnswerRecord[]
) {
  return answers
    .map(
      (answer, index) =>
        `${index + 1}: [${answer.senderNick} - ${answer.senderXref} ]: ${
          choices[answer.choiceIndex] ?? ''
        }`
    )
    .join('\n');
}

export function formatPollResultsDownload(
  question: string,
  choices: readonly string[],
  totals: readonly number[],
  total: number,
  answers: readonly PollAnswerRecord[]
) {
  return `${formatPollResults(question, choices, totals, total)}\n\nUser Responses:\n${formatPollResponseArchive(
    choices,
    answers
  )}${answers.length > 0 ? '\n' : ''}`;
}
