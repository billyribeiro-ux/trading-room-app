import type { Attachment } from 'svelte/attachments';

interface BottomTooltipOptions {
  content: string;
  id: string;
}

/**
 * Reproduces the account navbar's Angular UI Bootstrap `tooltip-placement="bottom"`
 * contract with the captured Bootstrap 3 DOM shape. Keeping the browser work in
 * an attachment makes the module safe during SSR and gives each mounted trigger
 * an explicit setup/teardown lifetime.
 */
export function bottomTooltip({ content, id }: BottomTooltipOptions): Attachment<HTMLElement> {
  return (node) => {
    let popup: HTMLDivElement | null = null;
    let enterFrame: number | null = null;
    let exitTimer: number | null = null;

    function updateDescription(add: boolean) {
      const ids = new Set((node.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean));
      if (add) ids.add(id);
      else ids.delete(id);

      if (ids.size > 0) node.setAttribute('aria-describedby', [...ids].join(' '));
      else node.removeAttribute('aria-describedby');
    }

    function position() {
      if (!popup) return;
      const trigger = node.getBoundingClientRect();
      let offsetParent = node.offsetParent as HTMLElement | null;

      while (
        offsetParent &&
        offsetParent !== document.documentElement &&
        getComputedStyle(offsetParent).position === 'static'
      ) {
        offsetParent = offsetParent.offsetParent as HTMLElement | null;
      }

      const parent = offsetParent ?? document.documentElement;
      const parentRect = parent.getBoundingClientRect();
      const parentTop =
        parent === document.documentElement ? 0 : parentRect.top + window.scrollY + parent.clientTop - parent.scrollTop;
      const parentLeft =
        parent === document.documentElement
          ? 0
          : parentRect.left + window.scrollX + parent.clientLeft - parent.scrollLeft;
      const triggerTop = trigger.top + window.scrollY - parentTop;
      const triggerLeft = trigger.left + window.scrollX - parentLeft;

      // This is Angular UI Bootstrap 0.12.1 `$position.positionElements()` for
      // `placement="bottom"` and `appendToBody=false`: the popup is an actual
      // sibling of the trigger, its intrinsic integer offsetWidth is measured,
      // and that measured box is centred in the positioned ancestor.
      popup.style.top = `${triggerTop + (trigger.height || node.offsetHeight)}px`;
      popup.style.left = `${triggerLeft + (trigger.width || node.offsetWidth) / 2 - popup.offsetWidth / 2}px`;
    }

    function removePopup() {
      if (!popup) return;
      if (enterFrame !== null) cancelAnimationFrame(enterFrame);
      enterFrame = null;
      if (exitTimer !== null) clearTimeout(exitTimer);
      exitTimer = null;
      popup.remove();
      popup = null;
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    }

    function hide() {
      if (!popup) return;
      if (enterFrame !== null) cancelAnimationFrame(enterFrame);
      enterFrame = null;
      popup.classList.remove('in');
      updateDescription(false);
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      // Angular UI Bootstrap removes the fading popup after 500ms. Keeping the
      // node for that interval lets Bootstrap's 150ms opacity transition render.
      exitTimer = window.setTimeout(removePopup, 500);
    }

    function show() {
      if (popup) {
        if (exitTimer !== null) clearTimeout(exitTimer);
        exitTimer = null;
        popup.classList.add('in');
        updateDescription(true);
        position();
        window.addEventListener('resize', position);
        window.addEventListener('scroll', position, true);
        return;
      }

      const element = document.createElement('div');
      element.id = id;
      element.className = 'acc-tooltip tooltip bottom fade';
      element.setAttribute('role', 'tooltip');

      const arrow = document.createElement('div');
      arrow.className = 'tooltip-arrow';
      const inner = document.createElement('div');
      inner.className = 'tooltip-inner';
      inner.textContent = content;
      element.append(arrow, inner);

      element.style.top = '0px';
      element.style.left = '0px';
      element.style.display = 'block';
      node.after(element);
      popup = element;
      updateDescription(true);
      position();
      window.addEventListener('resize', position);
      window.addEventListener('scroll', position, true);
      enterFrame = requestAnimationFrame(() => {
        element.classList.add('in');
        enterFrame = null;
      });
    }

    function onkeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') hide();
    }

    node.addEventListener('mouseenter', show);
    node.addEventListener('mouseleave', hide);
    node.addEventListener('focus', show);
    node.addEventListener('blur', hide);
    node.addEventListener('keydown', onkeydown);

    return () => {
      updateDescription(false);
      removePopup();
      node.removeEventListener('mouseenter', show);
      node.removeEventListener('mouseleave', hide);
      node.removeEventListener('focus', show);
      node.removeEventListener('blur', hide);
      node.removeEventListener('keydown', onkeydown);
    };
  };
}
