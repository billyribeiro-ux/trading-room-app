<script lang="ts">
  import type { SanitizedHtml } from '#lib/sanitized-html.js';
  import type { Attachment } from 'svelte/attachments';
  import { createRawSnippet } from 'svelte';

  type InputHandler = (event: InputEvent) => void;
  type KeyboardHandler = (event: KeyboardEvent) => void;
  type MouseHandler = (event: MouseEvent) => void;

  interface Props {
    content: SanitizedHtml;
    capture?: Attachment<HTMLDivElement>;
    class?: string;
    id?: string;
    contenteditable?: boolean | 'true' | 'false' | 'plaintext-only';
    role?: string;
    tabindex?: number;
    'aria-multiline'?: boolean | 'true' | 'false';
    'aria-label'?: string;
    oninput?: InputHandler;
    onkeyup?: KeyboardHandler;
    onmouseup?: MouseHandler;
  }

  interface RenderOptions extends Omit<Props, 'content'> {
    className?: string;
    ariaMultiline?: boolean | 'true' | 'false';
    ariaLabel?: string;
  }

  let {
    content,
    capture,
    class: className,
    id,
    contenteditable,
    role,
    tabindex,
    'aria-multiline': ariaMultiline,
    'aria-label': ariaLabel,
    oninput,
    onkeyup,
    onmouseup
  }: Props = $props();

  let sink = $state<HTMLDivElement | null>(null);
  let hydrationPreservedFor: HTMLDivElement | null = null;

  const options: RenderOptions = $derived({
    capture,
    className,
    id,
    contenteditable,
    role,
    tabindex,
    ariaMultiline,
    ariaLabel,
    oninput,
    onkeyup,
    onmouseup
  });

  function attribute(name: string, value: string | number | boolean | undefined) {
    if (value === undefined || value === false) return '';
    if (value === true) return ` ${name}="true"`;
    const escaped = String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
    return ` ${name}="${escaped}"`;
  }

  /**
   * `createRawSnippet` establishes its root once. Synchronize later branded
   * content changes explicitly, while leaving the first hydrated DOM untouched
   * so input made before Svelte starts remains authoritative.
   */
  $effect(() => {
    const element = sink;
    const sanitized = content;
    if (!element) return;

    if (hydrationPreservedFor !== element) {
      hydrationPreservedFor = element;
      return;
    }

    if (element.innerHTML !== sanitized) element.innerHTML = sanitized;
  });

  /**
   * The repository's only reviewed raw-HTML sink. `content` can only be produced
   * by the shared allowlist, which the server reapplies before persistence.
   * Rendering the actual root keeps Svelte's snippet hydration markers outside
   * a contenteditable consumer, so a pre-hydration edit cannot delete them.
   */
  const renderSanitized = createRawSnippet<[SanitizedHtml, RenderOptions]>((getContent, getOptions) => ({
    render: () => {
      const current = getOptions();
      return `<div${attribute('class', current.className)}${attribute('id', current.id)}${attribute('contenteditable', current.contenteditable)}${attribute('role', current.role)}${attribute('tabindex', current.tabindex)}${attribute('aria-multiline', current.ariaMultiline)}${attribute('aria-label', current.ariaLabel)}>${getContent()}</div>`;
    },
    setup: (element) => {
      if (!(element instanceof HTMLDivElement)) {
        throw new TypeError('SanitizedHtml requires a div root.');
      }

      sink = element;

      const input = (event: InputEvent) => getOptions().oninput?.(event);
      const keyup = (event: KeyboardEvent) => getOptions().onkeyup?.(event);
      const mouseup = (event: MouseEvent) => getOptions().onmouseup?.(event);
      element.addEventListener('input', input);
      element.addEventListener('keyup', keyup);
      element.addEventListener('mouseup', mouseup);
      const detach = getOptions().capture?.(element);

      return () => {
        element.removeEventListener('input', input);
        element.removeEventListener('keyup', keyup);
        element.removeEventListener('mouseup', mouseup);
        if (typeof detach === 'function') detach();
        if (sink === element) sink = null;
      };
    }
  }));
</script>

{@render renderSanitized(content, options)}
