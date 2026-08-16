import { describe, expect, it } from 'vitest';
import { RoomArrivals } from './arrivals';

/**
 * The three effects this class replaced each toasted, beeped or pinged on arrival, so every
 * assertion here is about something a member hears or sees. The shape of the fixture matters: the
 * production input is SvelteKit load data, re-serialised in full by every `invalidate`, so the same
 * message is a DIFFERENT OBJECT on every pass. Rows are rebuilt rather than reused for that reason.
 */
type Row = { readonly id: number; readonly body: string };

function rows(...ids: number[]): Row[] {
  return ids.map((id) => ({ id, body: `message ${id}` }));
}

describe('RoomArrivals', () => {
  it('announces nothing on the first pass, however much is already there', () => {
    const arrivals = new RoomArrivals<Row>();

    // Fifty unread alerts in a room you have just opened is history, not fifty toasts.
    expect(arrivals.fresh(rows(1, 2, 3, 4, 5))).toEqual([]);
  });

  it('returns only what was not there before', () => {
    const arrivals = new RoomArrivals<Row>();
    arrivals.fresh(rows(1, 2, 3));

    expect(arrivals.fresh(rows(1, 2, 3, 4, 5)).map((row) => row.id)).toEqual([4, 5]);
  });

  it('matches on the id and not on the object, which is the production condition', () => {
    const arrivals = new RoomArrivals<Row>();
    arrivals.fresh(rows(1, 2));

    /*
      `invalidateAll()` rebuilds every row, so nothing that arrived before is ever the same object
      on the next pass. A set keyed on the row rather than on `row.id` would pass every other test
      in this file and re-announce the entire log on every SSE event in a real room.
    */
    expect(arrivals.fresh(rows(1, 2))).toEqual([]);
  });

  it('never announces the same row twice, across any number of passes', () => {
    const arrivals = new RoomArrivals<Row>();
    arrivals.fresh(rows(1));
    arrivals.fresh(rows(1, 2));

    expect(arrivals.fresh(rows(1, 2)).map((row) => row.id)).toEqual([]);
    expect(arrivals.fresh(rows(1, 2, 3)).map((row) => row.id)).toEqual([3]);
  });

  it('primes on an EMPTY first pass, so the first message ever posted is news', () => {
    const arrivals = new RoomArrivals<Row>();

    // An empty room. The set is empty after this, which is why "have I seen anything?" cannot
    // stand in for "have I run before?" — the two answers differ only here, and only here matters.
    expect(arrivals.fresh([])).toEqual([]);

    expect(arrivals.fresh(rows(1)).map((row) => row.id)).toEqual([1]);
  });

  it('keeps the server ordering, because the sites iterate it to toast', () => {
    const arrivals = new RoomArrivals<Row>();
    arrivals.fresh(rows(10));

    // Two alerts landing between one load and the next produce two toasts, oldest first.
    expect(arrivals.fresh(rows(10, 11, 12)).map((row) => row.id)).toEqual([11, 12]);
  });

  it('is silent when the list is replaced with an identical one', () => {
    const arrivals = new RoomArrivals<Row>();
    arrivals.fresh(rows(1, 2, 3));

    // The five-second poll re-reads a quiet room every five seconds, forever.
    expect(arrivals.fresh(rows(1, 2, 3))).toEqual([]);
    expect(arrivals.fresh(rows(1, 2, 3))).toEqual([]);
  });

  it('announces a row that reappears after being trimmed away, and that is correct', () => {
    const arrivals = new RoomArrivals<Row>();
    arrivals.fresh(rows(1, 2, 3));

    /*
      Recorded as behaviour rather than asserted as desirable. Nothing evicts from `#seen`, so a row
      that leaves the server's newest page and comes back is still remembered and stays silent. This
      test is what would go red the moment a bound is added to the marker set — which is exactly the
      question the class comment says has to be answered on the SERVER read first.
    */
    expect(arrivals.fresh(rows(3, 2, 1))).toEqual([]);
  });

  it('keeps two lists apart, so an alert does not silence a message with the same id', () => {
    const alerts = new RoomArrivals<Row>();
    const messages = new RoomArrivals<Row>();
    alerts.fresh(rows(1));
    messages.fresh(rows(1));

    // Ids are per-table. One shared set would make alert 7 swallow message 7.
    expect(alerts.fresh(rows(1, 7)).map((row) => row.id)).toEqual([7]);
    expect(messages.fresh(rows(1, 7)).map((row) => row.id)).toEqual([7]);
  });
});
