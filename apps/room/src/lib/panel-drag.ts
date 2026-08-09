/**
 * Dragging and resizing for the room's floating panels.
 *
 * The captured app gets this from jQuery UI. The private chat is set up as:
 *
 * ```js
 * initPMDrag() {
 *   un("#privaChatCompHolder")
 *     .draggable({ appendTo: "body", containment: ".wrapper", cursor: "move", scroll: !1, snap: !0,
 *                  cancel: ".privChatScroller, .textSendDiv, #pmSearchTermTxt" })
 *     .resizable({ handles: "n, e, s, w, ne, se, sw, nw",
 *                  maxWidth: un(".wrapper").width(), maxHeight: un(".wrapper").height() })
 *     .show()
 * }
 * ```
 *
 * and the poll panel, the two local previews and each webcam holder use the same pair with
 * different options (`handle: "#pollPanelTitlebar"`, `containment: "window"`, and so on).
 *
 * ## What `cancel` buys, and why it is not optional
 *
 * `cancel: ".privChatScroller, .textSendDiv, #pmSearchTermTxt"` excludes the message list, the
 * composer and the search box from starting a drag. Without it, scrolling the conversation or
 * selecting text you typed would pick the whole panel up and move it - the panel would be
 * unusable, not merely awkward.
 *
 * ## Honest note on `snap`
 *
 * jQuery UI's `snap: true` snaps to the edges of every other snappable element within a 20px
 * tolerance. That cross-element behaviour depends on a registry this app does not have, so what is
 * reproduced is the part that is observable and useful: snapping to the containment edges at the
 * same 20px tolerance. A panel dropped near an edge sits flush against it, which is what the
 * option is there for.
 */

/** jQuery UI's default snap tolerance, in pixels. */
export const SNAP_TOLERANCE = 20;

/**
 * Merge-and-store, exactly as the capture persists a webcam holder:
 *
 * ```js
 * saveWebcamPosition(key, patch) {
 *   const existing = JSON.parse(localStorage.getItem(key)) || {};
 *   localStorage.setItem(key, JSON.stringify({ ...existing, ...patch }))
 * }
 * ```
 *
 * The merge is the whole point: dragging writes only `{top,left}` and resizing only
 * `{width,height}`, so a plain overwrite would make each gesture forget the other.
 */
export function savePanelBounds(key: string, patch: Partial<PanelBounds>): void {
  if (typeof localStorage === 'undefined') return;
  let existing: Partial<PanelBounds> = {};
  try {
    existing = JSON.parse(localStorage.getItem(key) ?? '{}') as Partial<PanelBounds>;
  } catch {
    // A corrupted entry is replaced rather than allowed to throw on every drag.
  }
  localStorage.setItem(key, JSON.stringify({ ...existing, ...patch }));
}

export type PanelBounds = { top: number; left: number; width: number; height: number };

/** Reads back what {@link savePanelBounds} wrote, or null when nothing is stored. */
export function readPanelBounds(key: string): Partial<PanelBounds> | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<PanelBounds>;
  } catch {
    return null;
  }
}

export type DragOptions = {
  /**
   * localStorage key for position and size. Note the capture keys a webcam holder by
   * `webcam-<sessionID>-<name>` while the ELEMENT is `webcamsHolder-<producerId>` - the position
   * follows the person, so it survives the producer id changing on a reconnect.
   */
  persistKey?: string;
  /** Selector for the box the panel may not leave. jQuery UI's `containment`. */
  containment?: string;
  /** Selectors a drag must NOT start from. jQuery UI's `cancel`. */
  cancel?: string;
  /** Selector for the only element a drag MAY start from. jQuery UI's `handle`. */
  handle?: string;
  snap?: boolean;
};

export type ResizeOptions = {
  /** Which edges and corners are grabbable, in jQuery UI's `handles` spelling. */
  handles?: string;
  containment?: string;
  minWidth?: number;
  minHeight?: number;
};

function containerRect(node: HTMLElement, selector: string | undefined): DOMRect {
  const container = selector ? node.ownerDocument.querySelector(selector) : null;
  if (container) return container.getBoundingClientRect();
  return new DOMRect(0, 0, window.innerWidth, window.innerHeight);
}

/** Clamps a value, and snaps it to either bound when within {@link SNAP_TOLERANCE}. */
function clampAndSnap(value: number, min: number, max: number, snap: boolean): number {
  const clamped = Math.min(Math.max(value, min), max);
  if (!snap) return clamped;
  if (Math.abs(clamped - min) <= SNAP_TOLERANCE) return min;
  if (Math.abs(clamped - max) <= SNAP_TOLERANCE) return max;
  return clamped;
}

/**
 * Makes a panel draggable by its own body.
 *
 * Positions with `left`/`top` rather than a transform: the captured panels are absolutely
 * positioned and jQuery UI writes the same two properties, so a transform would fight the
 * stylesheet and break `resizable`'s idea of where the panel is.
 */
/**
 * How far the pointer must travel before a press becomes a drag.
 *
 * jQuery UI draggable has a `distance` option for exactly this, defaulting to 1px, and the captured
 * panels rely on the default. Ours is larger, and deliberately so: jQuery UI tracks the gesture on
 * `document` and leaves the click alone, whereas this implementation takes a POINTER CAPTURE, which
 * is all-or-nothing - once captured, the click never reaches the element under the cursor. At 1px a
 * little hand jitter during an ordinary click would capture the pointer and eat the click.
 *
 * This was not theoretical. Every control in the private-chat header - the X, the gear, "This", the
 * conversation tabs - was dead, because `pointerdown` captured immediately and no click ever
 * arrived. The `cancel` selector is byte-identical to the capture's, so the selector was never the
 * problem; the timing was.
 */
const DRAG_THRESHOLD_PX = 3;

export function makeDraggable(node: HTMLElement, options: DragOptions = {}): () => void {
  /** A press that is allowed to become a drag, but has not moved far enough yet. */
  let armed = false;
  let dragging = false;
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    // Resize handles own their own gesture; a drag must never start on one.
    if (target.closest('[data-resize-handle]')) return;
    if (options.cancel && target.closest(options.cancel)) return;
    if (options.handle && !target.closest(options.handle)) return;

    const rect = node.getBoundingClientRect();
    originLeft = rect.left;
    originTop = rect.top;
    startX = event.clientX;
    startY = event.clientY;
    // Armed, NOT dragging, and deliberately no `setPointerCapture` yet - see DRAG_THRESHOLD_PX.
    armed = true;
    pointerId = event.pointerId;
  }

  function onPointerMove(event: PointerEvent) {
    if (armed && !dragging) {
      const travelled = Math.hypot(event.clientX - startX, event.clientY - startY);
      if (travelled < DRAG_THRESHOLD_PX) return;
      // Now it is a drag. Capture from here, so the gesture survives the pointer leaving the panel.
      dragging = true;
      node.setPointerCapture(event.pointerId);
      node.style.cursor = 'move';
    }
    if (!dragging) return;
    const bounds = containerRect(node, options.containment);
    const rect = node.getBoundingClientRect();
    const left = clampAndSnap(
      originLeft + (event.clientX - startX),
      bounds.left,
      bounds.right - rect.width,
      options.snap !== false
    );
    const top = clampAndSnap(
      originTop + (event.clientY - startY),
      bounds.top,
      bounds.bottom - rect.height,
      options.snap !== false
    );
    node.style.position = 'fixed';
    node.style.left = `${left}px`;
    node.style.top = `${top}px`;
    node.style.right = 'auto';
    node.style.bottom = 'auto';
  }

  function onPointerUp(event: PointerEvent) {
    // A press that never travelled far enough: release it and let the click happen. Returning
    // without clearing `armed` would leave the next move dragging from a stale origin.
    if (armed && !dragging) {
      armed = false;
      pointerId = null;
      return;
    }
    if (!dragging) return;
    armed = false;
    dragging = false;
    node.style.cursor = '';
    // `stop: (e, ui) => saveWebcamPosition(key, {top: ui.position.top, left: ui.position.left})`
    if (options.persistKey) {
      const rect = node.getBoundingClientRect();
      savePanelBounds(options.persistKey, { top: rect.top, left: rect.left });
    }
    if (pointerId !== null && node.hasPointerCapture(pointerId)) {
      node.releasePointerCapture(pointerId);
    }
    pointerId = null;
    event.stopPropagation();
  }

  node.addEventListener('pointerdown', onPointerDown);
  node.addEventListener('pointermove', onPointerMove);
  node.addEventListener('pointerup', onPointerUp);
  node.addEventListener('pointercancel', onPointerUp);

  return () => {
    node.removeEventListener('pointerdown', onPointerDown);
    node.removeEventListener('pointermove', onPointerMove);
    node.removeEventListener('pointerup', onPointerUp);
    node.removeEventListener('pointercancel', onPointerUp);
  };
}

/** The eight jQuery UI handle names, mapped to which axes each one moves. */
const HANDLE_AXES: Record<string, { x: -1 | 0 | 1; y: -1 | 0 | 1 }> = {
  n: { x: 0, y: -1 },
  e: { x: 1, y: 0 },
  s: { x: 0, y: 1 },
  w: { x: -1, y: 0 },
  ne: { x: 1, y: -1 },
  se: { x: 1, y: 1 },
  sw: { x: -1, y: 1 },
  nw: { x: -1, y: -1 }
};

const HANDLE_CURSOR: Record<string, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize'
};

/**
 * Adds resize handles to a panel.
 *
 * `maxWidth`/`maxHeight` are the containment element's size, exactly as the capture computes them
 * (`maxWidth: un(".wrapper").width()`), so they are read at drag time rather than frozen at setup -
 * the room is split-pane and the wrapper changes size.
 */
export function makeResizable(
  node: HTMLElement,
  options: ResizeOptions & { persistKey?: string } = {}
): () => void {
  const names = (options.handles ?? 'n, e, s, w, ne, se, sw, nw')
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name in HANDLE_AXES);

  const minWidth = options.minWidth ?? 240;
  const minHeight = options.minHeight ?? 160;
  const created: HTMLElement[] = [];
  let active: { name: string; startX: number; startY: number; rect: DOMRect } | null = null;

  for (const name of names) {
    const handle = node.ownerDocument.createElement('div');
    handle.dataset.resizeHandle = name;
    handle.style.cssText = [
      'position:absolute',
      'z-index:10',
      `cursor:${HANDLE_CURSOR[name]}`,
      name.includes('n') ? 'top:-4px' : '',
      name.includes('s') ? 'bottom:-4px' : '',
      name.includes('w') ? 'left:-4px' : '',
      name.includes('e') ? 'right:-4px' : '',
      // Edges span their side; corners are small squares laid over the ends of those edges.
      name === 'n' || name === 's' ? 'left:8px;right:8px;height:8px' : '',
      name === 'e' || name === 'w' ? 'top:8px;bottom:8px;width:8px' : '',
      name.length === 2 ? 'width:12px;height:12px' : ''
    ]
      .filter(Boolean)
      .join(';');

    handle.addEventListener('pointerdown', (event: PointerEvent) => {
      if (event.button !== 0) return;
      // Without this the panel's own drag listener also fires and the panel moves while resizing.
      event.stopPropagation();
      event.preventDefault();
      active = {
        name,
        startX: event.clientX,
        startY: event.clientY,
        rect: node.getBoundingClientRect()
      };
      handle.setPointerCapture(event.pointerId);
    });

    handle.addEventListener('pointermove', (event: PointerEvent) => {
      if (!active || active.name !== name) return;
      const axes = HANDLE_AXES[name];
      const bounds = containerRect(node, options.containment);
      const dx = event.clientX - active.startX;
      const dy = event.clientY - active.startY;

      let { left, top, width, height } = {
        left: active.rect.left,
        top: active.rect.top,
        width: active.rect.width,
        height: active.rect.height
      };

      if (axes.x === 1) width = Math.min(active.rect.width + dx, bounds.right - active.rect.left);
      if (axes.x === -1) {
        const next = Math.min(active.rect.width - dx, active.rect.right - bounds.left);
        left = active.rect.right - Math.max(next, minWidth);
        width = next;
      }
      if (axes.y === 1) height = Math.min(active.rect.height + dy, bounds.bottom - active.rect.top);
      if (axes.y === -1) {
        const next = Math.min(active.rect.height - dy, active.rect.bottom - bounds.top);
        top = active.rect.bottom - Math.max(next, minHeight);
        height = next;
      }

      node.style.position = 'fixed';
      node.style.left = `${left}px`;
      node.style.top = `${top}px`;
      node.style.right = 'auto';
      node.style.bottom = 'auto';
      node.style.width = `${Math.max(width, minWidth)}px`;
      node.style.height = `${Math.max(height, minHeight)}px`;
    });

    const end = (event: PointerEvent) => {
      if (!active) return;
      active = null;
      // `stop: (e, ui) => saveWebcamPosition(key, {width: ui.size.width, height: ui.size.height})`
      if (options.persistKey) {
        const rect = node.getBoundingClientRect();
        savePanelBounds(options.persistKey, { width: rect.width, height: rect.height });
      }
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);

    node.appendChild(handle);
    created.push(handle);
  }

  return () => {
    for (const handle of created) handle.remove();
  };
}

/**
 * Both behaviours together, as the capture applies them - `.draggable(...).resizable(...)`.
 *
 * Written as a Svelte attachment so a panel gets it with `{@attach panelDragResize({...})}`.
 */
export function panelDragResize(options: DragOptions & ResizeOptions = {}) {
  return (node: HTMLElement) => {
    // Restore before either gesture is attached, the way the capture does - it reads localStorage
    // and applies top/left/width/height before calling .draggable().
    if (options.persistKey) {
      const stored = readPanelBounds(options.persistKey);
      if (stored) {
        node.style.position = 'fixed';
        if (stored.top !== undefined) node.style.top = `${stored.top}px`;
        if (stored.left !== undefined) node.style.left = `${stored.left}px`;
        if (stored.width !== undefined) node.style.width = `${stored.width}px`;
        if (stored.height !== undefined) node.style.height = `${stored.height}px`;
        node.style.right = 'auto';
        node.style.bottom = 'auto';
      }
    }
    const stopDrag = makeDraggable(node, options);
    const stopResize = makeResizable(node, options);
    return () => {
      stopDrag();
      stopResize();
    };
  };
}
