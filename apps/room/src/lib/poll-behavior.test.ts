import { describe, expect, it } from 'vitest';
import {
  POLL_CLOSE_CONFIRMATION,
  POLL_SAVED_ALERT,
  POLL_SEND_CONFIRMATION,
  addPollChoice,
  calculatePollPanelPosition,
  calculatePollSeries,
  calculatePollTotals,
  deletePollChoice,
  formatPollResults,
  formatPollResultsDownload,
  formatVisiblePollResponses,
  parsePollChoices,
  pollDeleteConfirmation
} from './poll-behavior';

const answers = [
  { senderNick: 'Billy', senderXref: 'billy@example.com', choiceIndex: 0 },
  { senderNick: 'Welber', senderXref: 'welber@example.com', choiceIndex: 1 },
  { senderNick: 'Guest', senderXref: 'guest@example.com', choiceIndex: 0 }
];

describe('decoded Poll behavior', () => {
  it('uses the compiled showPanel centering equation and reproduces the captured open bounds', () => {
    expect(calculatePollPanelPosition(1915, 894, 580, 553)).toEqual({
      left: 667.5,
      top: 170.5
    });
  });

  it('preserves every captured Bootbox string exactly', () => {
    expect(POLL_SEND_CONFIRMATION).toBe('Are you sure you want to send this poll?');
    expect(POLL_CLOSE_CONFIRMATION).toBe('Closing this window, will end the poll. Are you sure?');
    expect(POLL_SAVED_ALERT).toBe('Poll Saved to Pre-Canned polls...');
    expect(pollDeleteConfirmation('Market direction?')).toBe(
      'Are you sure you want to delete poll "Market direction?" ?'
    );
  });

  it('matches the source’s truthy, non-trimming Add Choice behavior', () => {
    expect(addPollChoice([], '')).toEqual([]);
    expect(addPollChoice([], '  ')).toEqual(['  ']);
    expect(addPollChoice(['Up'], 'Down')).toEqual(['Up', 'Down']);
    expect(deletePollChoice(['Up', 'Down', 'Sideways'], 1)).toEqual(['Up', 'Sideways']);
  });

  it('accepts only the source payload shape for choices', () => {
    expect(parsePollChoices('["Up","Down"]')).toEqual(['Up', 'Down']);
    expect(parsePollChoices('{"Up":1}')).toBeNull();
    expect(parsePollChoices('["Up",1]')).toBeNull();
    expect(parsePollChoices('not-json')).toBeNull();
  });

  it('calculates the same totals, percentages, and rounded result text as the source', () => {
    const totals = calculatePollTotals(3, answers);
    expect(totals).toEqual([2, 1, 0]);
    expect(calculatePollSeries(['Up', 'Down', 'Sideways'], totals, answers.length)).toEqual([
      { data: (2 / 3) * 100, label: 'Up' },
      { data: (1 / 3) * 100, label: 'Down' },
      { data: 0, label: 'Sideways' }
    ]);
    expect(
      formatPollResults('Market direction?', ['Up', 'Down', 'Sideways'], totals, answers.length)
    ).toBe('Poll Results\nQuestion: Market direction?\nUp - 67%\nDown - 33%\nSideways - 0%\n');
  });

  it('keeps visible responses and the downloaded sender reference format distinct', () => {
    const choices = ['Up', 'Down'];
    const totals = calculatePollTotals(choices.length, answers);
    expect(formatVisiblePollResponses(choices, answers)).toBe(
      '1: [Billy]: Up\n2: [Welber]: Down\n3: [Guest]: Up'
    );
    expect(
      formatPollResultsDownload('Market direction?', choices, totals, answers.length, answers)
    ).toContain(
      '\n\nUser Responses:\n1: [Billy - billy@example.com ]: Up\n2: [Welber - welber@example.com ]: Down\n3: [Guest - guest@example.com ]: Up\n'
    );
  });
});
