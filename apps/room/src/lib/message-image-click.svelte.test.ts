// @vitest-environment jsdom
import { mount, unmount, flushSync } from 'svelte';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';

import MessageBody from './components/MessageBody.svelte';
import { parseBodySegments } from './message-body-segments';
import type { MessageAction, MessageActionEvent } from './types';

/**
 * `MSB-03` — the CALL SITES, which is the half a dispatcher test cannot reach.
 *
 * `room/message-actions.svelte.test.ts` proves what the dispatcher does with an image-open payload.
 * It cannot prove that anything sends one: both components used to raise `onaction('image', event)`
 * with no URL at all, and every assertion in that file would still pass with the components left
 * exactly as they were. This file clicks the element.
 *
 * The reference is `onclick="openImageModal(event,'${a}')"` at bundle byte 1,326,195, inside
 * `urlwrapImg` — `a` is THAT image's own sanitised URL, written into each container's handler as
 * the pipe builds it, so upstream every inline image already knows its own address.
 */

const mounted: { host: HTMLElement; component: Record<string, unknown> }[] = [];

afterEach(() => {
  for (const entry of mounted.splice(0)) {
    void unmount(entry.component);
    entry.host.remove();
  }
});

/** One body, rendered, with every `onaction` call recorded in order. */
function body(text: string) {
  const host = document.createElement('div');
  document.body.append(host);
  const raised: { action: MessageAction; payload?: MessageActionEvent }[] = [];
  const component = mount(MessageBody, {
    target: host,
    props: {
      segments: parseBodySegments(text, {
        kind: 'chat',
        messageId: 7,
        alertLabels: [],
        copyTrades: false
      }),
      messageId: 7,
      onaction: (action: MessageAction, payload?: MessageActionEvent) =>
        raised.push({ action, payload })
    } as never
  });
  flushSync();
  mounted.push({ host, component: component as Record<string, unknown> });
  return { host, raised };
}

describe('MSB-03 — an inline image names itself when it is clicked', () => {
  it('raises the image action with THAT segment s url', () => {
    const { host, raised } = body('look https://cdn.example/one.png');
    const container = host.querySelector<HTMLElement>('.img-container');
    expect(container, 'the body did not render an image container').not.toBeNull();

    container!.click();
    flushSync();

    expect(raised).toHaveLength(1);
    expect(raised[0]?.action).toBe('image');
    const payload = raised[0]?.payload as { url: string; event: MouseEvent };
    expect(payload.url).toBe('https://cdn.example/one.png');
    expect(payload.event, 'the click must travel with the url').toBeInstanceOf(MouseEvent);
  });

  it('and TWO images in one body name themselves separately', () => {
    /*
      The assertion a single-image case cannot make, and the one that matters: upstream builds a
      handler per container, so two pictures in one message are two addresses. Anything that
      resolves the URL from the MESSAGE rather than the element gives both clicks the same answer —
      which is precisely the class of bug this row is about, one level down from the alert
      attachment.
    */
    const { host, raised } = body('a https://cdn.example/one.png b https://cdn.example/two.png');
    const containers = host.querySelectorAll<HTMLElement>('.img-container');
    expect(containers).toHaveLength(2);

    containers[1]!.click();
    containers[0]!.click();
    flushSync();

    expect(raised.map((entry) => (entry.payload as { url: string }).url)).toEqual([
      'https://cdn.example/two.png',
      'https://cdn.example/one.png'
    ]);
  });

  it('and the modifier keys survive the trip, because the popped-out window reads them', () => {
    const { host, raised } = body('https://cdn.example/one.png');
    host
      .querySelector<HTMLElement>('.img-container')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
    flushSync();

    const payload = raised[0]?.payload as { event: MouseEvent };
    expect(payload.event.shiftKey).toBe(true);
  });
});

describe('MSB-03 — the alert attachment names itself too', () => {
  it('passes item.targetUrl by name rather than leaving the dispatcher to find it', () => {
    /*
      TEXT rather than a click, and the reason is worth stating rather than hiding: `RoomMessage`
      takes upwards of forty props and a mount here would be a fixture larger than the assertion,
      maintained by this file, for one attribute. The BEHAVIOUR either side of it is executed —
      `MessageBody` is clicked above, and the dispatcher's four cases run in
      `room/message-actions.svelte.test.ts` — so what is left to guard is that this one call site
      still spells the URL.

      Anchored on locals, because `slice-anchor-contract` refuses the inlined form and because a
      `-1` from `indexOf` would make a slice assertion pass on the wrong region of the file.
    */
    /*
      CWD-RELATIVE, not `new URL(…, import.meta.url)`. This file runs through the Svelte plugin, and
      there `import.meta.url` is not a `file:` URL — `fileURLToPath` throws `The URL must be of
      scheme file`, which is the same trap `main-tab-strip-gates.svelte.test.ts` records hitting.
    */
    const source = readFileSync('src/lib/components/RoomMessage.svelte', 'utf8');
    const at = source.indexOf("runAction('image'");
    expect(at, 'the alert attachment no longer raises the image action').toBeGreaterThan(-1);
    expect(source.slice(at, at + 60)).toContain(
      "runAction('image', { url: item.targetUrl!, event })"
    );

    /* And exactly one such call site, so a second cannot be added without this line moving. */
    expect(source.match(/runAction\('image'/g)).toHaveLength(1);
  });
});
