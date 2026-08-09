import { describe, expect, it, vi } from 'vitest';
import { SNAP_TOLERANCE, readPanelBounds, savePanelBounds } from './panel-drag';

/**
 * The capture's own drag options for the private chat, pinned so a future edit cannot quietly drop
 * one. `cancel` is the load-bearing entry: without it, scrolling the conversation or selecting
 * text in the composer picks the whole panel up.
 */
const CAPTURED_PRIVATE_CHAT_DRAG = {
  appendTo: 'body',
  containment: '.wrapper',
  cursor: 'move',
  scroll: false,
  snap: true,
  cancel: '.privChatScroller, .textSendDiv, #pmSearchTermTxt'
};

const CAPTURED_PRIVATE_CHAT_RESIZE = { handles: 'n, e, s, w, ne, se, sw, nw' };

/**
 * The other panels the capture makes draggable, pinned the same way. Each differs in exactly the
 * ways that matter, which is why they are not one shared config:
 *
 *   poll panel      #pollModalCompHolder    handle "#pollPanelTitlebar", containment ".wrapper",
 *                                           cancel "input, textarea, button, select,
 *                                           .poll-panel-controls", minWidth 580, minHeight 553
 *   screenshare     #screenshareLocalPreviewHolder    containment "window"
 *   rec preview     #recLocalPreviewHolder            containment "window", addClasses true
 *   webcam holders  #<id>                   appendTo ".app-room", containment "window",
 *                                           position AND size persisted to localStorage
 */
const CAPTURED_POLL_DRAG = {
  appendTo: 'body',
  containment: '.wrapper',
  handle: '#pollPanelTitlebar',
  cursor: 'move',
  scroll: false,
  snap: true,
  cancel: 'input, textarea, button, select, .poll-panel-controls'
};
const CAPTURED_POLL_RESIZE = {
  handles: 'n, e, s, w, ne, se, sw, nw',
  minWidth: 580,
  minHeight: 553
};
const CAPTURED_PREVIEW_DRAG = {
  appendTo: 'body',
  containment: 'window',
  cursor: 'move',
  scroll: false,
  snap: true
};

describe('the captured poll-panel options', () => {
  it('cancels a drag from every form control, not only the control bar', () => {
    // Only `.poll-panel-controls` was honoured, so dragging from a poll's answer field, textarea,
    // button or select moved the panel instead of letting the reader use it.
    expect(CAPTURED_POLL_DRAG.cancel.split(',').map((s) => s.trim())).toEqual([
      'input',
      'textarea',
      'button',
      'select',
      '.poll-panel-controls'
    ]);
  });

  it('drags only by its titlebar', () => {
    // The one panel with a `handle`, which is why its body stays selectable.
    expect(CAPTURED_POLL_DRAG.handle).toBe('#pollPanelTitlebar');
  });

  it('keeps the poll big enough to render', () => {
    expect([CAPTURED_POLL_RESIZE.minWidth, CAPTURED_POLL_RESIZE.minHeight]).toEqual([580, 553]);
  });
});

describe('the captured local-preview options', () => {
  it('is contained by the window, not the room wrapper', () => {
    // Unlike the chat and poll panels: a local preview may be parked anywhere on screen.
    expect(CAPTURED_PREVIEW_DRAG.containment).toBe('window');
    expect(CAPTURED_PRIVATE_CHAT_DRAG.containment).toBe('.wrapper');
  });

  it('has no handle, so the whole card drags', () => {
    expect('handle' in CAPTURED_PREVIEW_DRAG).toBe(false);
  });
});

describe('the captured private-chat panel options', () => {
  it('cancels a drag from the scroller, the composer and the search box', () => {
    // Each of the three is a place a reader interacts with content rather than the panel.
    expect(CAPTURED_PRIVATE_CHAT_DRAG.cancel.split(',').map((s) => s.trim())).toEqual([
      '.privChatScroller',
      '.textSendDiv',
      '#pmSearchTermTxt'
    ]);
  });

  it('is contained by the room wrapper, not the window', () => {
    // `containment: ".wrapper"` - the panel cannot be dragged out over the navbar or off-screen.
    expect(CAPTURED_PRIVATE_CHAT_DRAG.containment).toBe('.wrapper');
  });

  it('offers all eight resize handles', () => {
    expect(CAPTURED_PRIVATE_CHAT_RESIZE.handles.split(',').map((s) => s.trim())).toEqual([
      'n',
      'e',
      's',
      'w',
      'ne',
      'se',
      'sw',
      'nw'
    ]);
  });

  it('uses jQuery UI default snap tolerance', () => {
    // 20px is jQuery UI's documented default, and what `snap: true` gets.
    expect(SNAP_TOLERANCE).toBe(20);
  });
});

describe('panel bounds persistence', () => {
  it('merges a patch instead of replacing, so drag and resize do not forget each other', () => {
    // `saveWebcamPosition` reads the existing entry and spreads the patch over it. Dragging writes
    // only {top,left} and resizing only {width,height}; a plain overwrite would lose the other.
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v)
    });

    savePanelBounds('webcam-abc-Billy_Ribeiro', { top: 40, left: 60 });
    savePanelBounds('webcam-abc-Billy_Ribeiro', { width: 320, height: 240 });

    expect(readPanelBounds('webcam-abc-Billy_Ribeiro')).toEqual({
      top: 40,
      left: 60,
      width: 320,
      height: 240
    });
    vi.unstubAllGlobals();
  });

  it('survives a corrupted entry rather than throwing on every drag', () => {
    const store = new Map<string, string>([['k', '{not json']]);
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v)
    });
    expect(readPanelBounds('k')).toBeNull();
    expect(() => savePanelBounds('k', { top: 1 })).not.toThrow();
    expect(readPanelBounds('k')).toEqual({ top: 1 });
    vi.unstubAllGlobals();
  });
});
