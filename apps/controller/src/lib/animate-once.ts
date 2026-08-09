import { browser } from '$app/env';

/**
 * `animated fadeInDown` — but only on the first paint of a document.
 *
 * A CSS animation restarts every time its element is created, so on a SvelteKit
 * client-side navigation the container re-mounts and the whole page drops in from
 * the top again. The reference is an Angular SPA whose container animates once;
 * ours was replaying it on every link click.
 *
 * On the server this always returns the classes, so the first paint animates.
 * In the browser it returns them once — during hydration of that first page —
 * and nothing thereafter, so navigating between /account, /login and /register
 * is still.
 *
 * The flag is deliberately NOT mutated during SSR: module state on the server is
 * shared across every request, and flipping it there would mean the second
 * visitor to hit the process got no animation at all.
 */
let played = false;

export function animateOnce(): string {
  if (!browser) return 'animated fadeInDown';
  if (played) return '';
  played = true;
  return 'animated fadeInDown';
}
