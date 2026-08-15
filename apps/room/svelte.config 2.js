import vercel from '@sveltejs/adapter-vercel';
import node from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/*
  Two adapters, selected by `ADAPTER`, defaulting to Vercel.

  Vercel is the default because that is where this deploys today.

  `ADAPTER=node` is kept deliberately and is not spare scaffolding — it is the escape hatch for a
  constraint this application actually has. `src/routes/sess/[room]/events/+server.ts` serves a
  long-lived `text/event-stream` with a heartbeat `setInterval`; that is the room's realtime
  channel. A serverless function has a bounded maximum duration, so a trading session lasting hours
  will be cut and the browser will reconnect for as long as the room stays open. `EventSource`
  reconnects by itself, so this degrades rather than breaks — but "degrades on a timer" is a
  property worth naming here rather than discovering under load.

  The SFU already runs on a long-lived host for this same family of reasons. If the reconnection
  proves disruptive, `ADAPTER=node` puts the room beside it with no code change.
*/
const target = process.env.ADAPTER ?? 'vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: target === 'node' ? node() : vercel()
  }
};

export default config;
