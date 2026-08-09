export interface MessageMenuRect {
  left: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

interface MessageMenuViewport {
  width: number;
  height: number;
  devicePixelRatio?: number;
}

export function calculateMessageMenuPosition(
  trigger: MessageMenuRect,
  menu: MessageMenuRect,
  viewport: MessageMenuViewport
) {
  const edge = 4;
  const gap = 2;
  const devicePixelRatio = viewport.devicePixelRatio || 1;
  const round = (value: number) => Math.round(value * devicePixelRatio) / devicePixelRatio;
  let left = trigger.left;
  let top = trigger.bottom + gap;
  let placement: 'bottom-start' | 'top-start' = 'bottom-start';

  if (top + menu.height > viewport.height - edge) {
    top = trigger.top - menu.height - gap;
    placement = 'top-start';
  }

  left = Math.max(edge, Math.min(left, viewport.width - menu.width - edge));
  top = Math.max(edge, Math.min(top, viewport.height - menu.height - edge));

  return {
    left: round(left),
    top: round(top),
    placement
  };
}
