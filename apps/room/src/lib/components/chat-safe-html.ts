import type { Attachment } from 'svelte/attachments';

/**
 * The browser half of the chat rich-text sanitiser.
 *
 * ## Why a second pass at all
 *
 * `sanitizeChatHtml` on the server is the CONTROL — it is what a crafted request cannot bypass, and
 * it is what decides what gets stored. This pass exists for the rows that were stored **before**
 * the allow-list said what it says today. `notes-repository` already learned this: it re-sanitises
 * historical rows on read, and its tests are named for it. A stored value is only as safe as the
 * rules that were in force the day it was written.
 *
 * ## Why not `sanitizeNoteHtmlForBrowser`
 *
 * That walker reads module-level `ALLOWED_TAGS` and `ALLOWED_ATTRIBUTES` for NOTES — tables,
 * headings, iframes, links, images, six style properties. It is not parameterised, and
 * parameterising a security-critical, well-tested file to reuse forty lines is a worse trade than
 * writing the forty lines. The chat policy is small enough to read in one sitting, which is the
 * property that matters most in a sanitiser.
 *
 * ## The policy
 *
 * Exactly what the captured toolbar can produce — `[['font', ['bold', 'italic', 'underline',
 * 'clear']], ['color', ['forecolor']]]` — and nothing else. It mirrors the server list on purpose;
 * the two are asserted against each other in `chat-rich-text-contract.test.ts`, because two
 * allow-lists that are supposed to agree are exactly the pair that drifts.
 */

const ALLOWED_TAGS = new Set(['b', 'strong', 'i', 'em', 'u', 'span', 'p', 'br']);

/**
 * Tags whose CONTENT goes with them.
 *
 * For everything else an unknown tag is unwrapped — its children survive, so a stray `<div>` costs
 * a wrapper and not the sentence inside it. For these, the text IS the payload: unwrapping
 * `<script>alert(1)</script>` would paste `alert(1)` into the message as visible text, which is
 * confusing rather than dangerous, and unwrapping `<style>` would leak CSS source into the log.
 */
const DISCARDED_CONTENT_TAGS = new Set(['script', 'style', 'template', 'noscript', 'iframe']);

/** Hex, or rgb/rgba. The same shape the server enforces, and the only style value chat allows. */
const COLOR_VALUE =
  /^(?:#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\))$/i;

/**
 * Rebuilds `color` from the parsed CSSOM rather than copying the attribute through.
 *
 * Copying `style` verbatim would carry whatever else was in it. Reading one property and writing
 * one property means anything unlisted cannot survive by riding along in the same string.
 */
function safeColor(source: Element): string | null {
  if (!(source instanceof HTMLElement)) return null;
  const color = source.style.getPropertyValue('color').trim();
  return color && COLOR_VALUE.test(color) ? color : null;
}

function sanitizeNode(source: Node, owner: Document, depth: number): readonly Node[] {
  /* Bounded, because a hand-crafted body can nest arbitrarily deep and this walker is recursive.
     50 is the notes walker's own limit; the same reasoning applies and the same number keeps them
     comparable. */
  if (depth > 50) return [];
  if (source.nodeType === Node.TEXT_NODE) return [owner.createTextNode(source.textContent ?? '')];
  if (!(source instanceof Element)) return [];

  const tag = source.localName.toLowerCase();
  if (DISCARDED_CONTENT_TAGS.has(tag)) return [];

  const children = [...source.childNodes].flatMap((child) => sanitizeNode(child, owner, depth + 1));
  /* Unknown tag: keep the words, drop the wrapper. */
  if (!ALLOWED_TAGS.has(tag)) return children;

  const element = owner.createElement(tag);
  /* No attribute is copied. `color` is the only one that can exist, and it is REBUILT above from
     the parsed value — so `onclick`, `href`, `srcdoc` and everything else cannot be carried by
     omission. */
  const color = safeColor(source);
  if (color) element.style.color = color;
  element.append(...children);
  return [element];
}

/** Renders only allow-listed chat DOM into the host element. */
export function safeChatHtml(html: string | null | undefined): Attachment<HTMLElement> {
  return (node) => {
    if (!html) {
      node.replaceChildren();
      return;
    }
    const owner = node.ownerDocument;
    /* `<template>` parses without executing: its content is inert, so scripts do not run and
       `<img onerror>` never fires while we are deciding whether to keep it. */
    const template = owner.createElement('template');
    template.innerHTML = html;
    const fragment = owner.createDocumentFragment();
    fragment.append(
      ...[...template.content.childNodes].flatMap((child) => sanitizeNode(child, owner, 0))
    );
    node.replaceChildren(fragment);
  };
}
