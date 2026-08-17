import { fail } from '@sveltejs/kit';
import { controlPlaneMode } from '#lib/server/control-plane-runtime.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
  contactSubmissionEnabled: controlPlaneMode === 'postgres'
});

export const actions: Actions = {
  default: async ({ request }) => {
    if (controlPlaneMode !== 'postgres') {
      return fail(503, { unavailable: true });
    }

    const form = await request.formData();
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const message = String(form.get('message') ?? '').trim();
    if (!name || !email || !message) {
      return fail(400, { name, email, message, error: 'Every field is required.' });
    }

    // NOT SENT. There is no mail transport configured, and pretending a message was
    // delivered would be worse than saying so. Wire a real transport (and record the
    // enquiry) before removing this.
    console.info('[contact] enquiry received but NOT delivered — no transport configured', {
      messageLength: message.length
    });
    return { notDelivered: true };
  }
};
