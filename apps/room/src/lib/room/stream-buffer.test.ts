import { describe, expect, it } from 'vitest';

import {
  STREAM_BUFFER_DEFAULT,
  STREAM_BUFFER_NAMES,
  streamBufferLevel,
  streamBufferName
} from './stream-buffer.js';

/**
 * The buffer preference, and the control that could not change it.
 *
 * `StreamingView.svelte` has drawn a Buffer: Normal / Increased / Maximum dropdown since it was
 * written. Clicking an entry called `onBufferSizeChange?.(level)` — a prop `PresentationArea` never
 * passed — so the call was `undefined?.()`, the label stayed on Maximum, and the hls.js config
 * always used 3. **A live control whose only possible effect was nothing at all**, which is the
 * class `INERT_ACTIONS` exists for and which it could not catch, because this one is a component
 * prop rather than a user-action string.
 *
 * Found on 2026-08-28 by asking which component props no call site supplies.
 */
describe('the buffer level a settings blob can produce', () => {
  it('takes the three the control can produce', () => {
    expect(streamBufferLevel(1)).toBe(1);
    expect(streamBufferLevel(2)).toBe(2);
    expect(streamBufferLevel(3)).toBe(3);
  });

  /*
    The reference's own `|| 3` catches these, and so does this.
  */
  it('falls back for every falsy reading, as the reference does', () => {
    expect(streamBufferLevel(0)).toBe(STREAM_BUFFER_DEFAULT);
    expect(streamBufferLevel(null)).toBe(STREAM_BUFFER_DEFAULT);
    expect(streamBufferLevel(undefined)).toBe(STREAM_BUFFER_DEFAULT);
  });

  /*
    STRICTER THAN `|| 3`, in exactly one direction and deliberately.

    The blob is JSON a member's row carries and the value reaches hls.js as a buffer length. `"2"`
    and `7` both survive `|| 3` upstream; here they are refused, because a buffer of seven is not a
    preference any control can produce and honouring it would invent a fourth level. Asserted rather
    than described, so the divergence cannot be quietly removed.
  */
  it('refuses a value no control can produce', () => {
    expect(streamBufferLevel(7)).toBe(STREAM_BUFFER_DEFAULT);
    expect(streamBufferLevel(-1)).toBe(STREAM_BUFFER_DEFAULT);
    expect(streamBufferLevel(2.5)).toBe(STREAM_BUFFER_DEFAULT);
    expect(streamBufferLevel('2')).toBe(STREAM_BUFFER_DEFAULT);
    expect(streamBufferLevel({})).toBe(STREAM_BUFFER_DEFAULT);
    expect(streamBufferLevel(true)).toBe(STREAM_BUFFER_DEFAULT);
  });

  it('names each level exactly as the captured switch does', () => {
    expect(streamBufferName(1)).toBe('Normal');
    expect(streamBufferName(2)).toBe('Increased');
    expect(streamBufferName(3)).toBe('Maximum');
    // The table and the function are one source; a name added to one without the other fails here.
    expect(Object.keys(STREAM_BUFFER_NAMES)).toEqual(['1', '2', '3']);
  });

  it('defaults to the reference default, not to the lowest level', () => {
    // Upstream defaults to MAXIMUM. A room that has never chosen buffers the most, not the least.
    expect(STREAM_BUFFER_DEFAULT).toBe(3);
    expect(streamBufferName(STREAM_BUFFER_DEFAULT)).toBe('Maximum');
  });
});
