<script lang="ts">
  /**
   * Privacy policy.
   *
   * ## Why this is written from the code rather than from a template
   *
   * The reference serves its own at `/public/html/ppolicy.html`, which was never captured, so there
   * is nothing to reproduce. A downloaded template would have been quicker and would have been
   * WRONG in the way that matters: a policy is a factual statement about what a system does, and a
   * generic one would not mention the two third parties this app actually hands data to.
   *
   * Every claim below is read out of this repository:
   *
   *   - the account fields are `users` in `db/schema.ts:68-93` — email, display name, password
   *     hash, `email_verified_at`, `created_at`, and nothing else;
   *   - Gravatar is `lib/server/gravatar.ts`, which builds `secure.gravatar.com/avatar/<md5 of the
   *     address>` and whose own comment states the trade-off in full;
   *   - reCAPTCHA is `lib/server/recaptcha.ts`, used on registration and password reset;
   *   - the mail path is `lib/server/mail.ts` — Resend, whose sending is on AWS SES `us-east-1`,
   *     as the `send.mail.tradingroom.app` MX record shows.
   *
   * ## What is deliberately NOT here
   *
   * Retention periods, a governing jurisdiction, and a supervisory-authority route. Those are the
   * owner's decisions and a lawyer's wording, and inventing them would be exactly the fabrication
   * this file otherwise avoids. They are named as missing instead.
   */
  const UPDATED = '9 August 2026';
  const SUPPORT = 'support@tradingroom.app';
</script>

<svelte:head>
  <title>Privacy Policy — TradingRoomApp</title>
  <meta name="description" content="What TradingRoomApp collects, why, and who else processes it." />
</svelte:head>

<div class="pub-container">
  <div class="pub-form-card">
    <h1>Privacy policy</h1>
    <p class="pub-hint">Last updated {UPDATED}.</p>

    <p class="pub-error">
      This document has not been reviewed by a lawyer. It is an accurate description of what the
      system does, written from the source code, and it is not yet a complete legal policy — the
      retention periods and governing law below are marked as outstanding.
    </p>

    <h2>What we collect</h2>
    <p>When you create an account we store only:</p>
    <ul>
      <li>your email address;</li>
      <li>the display name you choose;</li>
      <li>a one-way hash of your password — never the password itself;</li>
      <li>whether and when you confirmed your email address;</li>
      <li>the date the account was created.</li>
    </ul>
    <p>
      If you take part in a room, we also store your membership of it: your role and permissions
      there, any note the room's owner adds about you, and — only if you pair a phone — the push
      notification tokens and pairing code needed to send you alerts.
    </p>
    <p>We do not use advertising trackers and we do not sell anything about you to anybody.</p>

    <h2>Why we hold it</h2>
    <p>
      To let you sign in, to prove the address you signed up with is yours, to show you the rooms you
      belong to, and to send the alerts you have asked a room to send you. Confirming your address
      is required before you can create a room, so that an audience is never invited under an address
      nobody has proved.
    </p>

    <h2>Who else processes it</h2>
    <ul>
      <li><strong>Vercel</strong> — hosts the site and therefore handles every request to it.</li>
      <li><strong>Neon</strong> — the PostgreSQL database where the data above is stored.</li>
      <li><strong>Hetzner</strong> — the server in Ashburn, Virginia running the live rooms and the media server.</li>
      <li>
        <strong>Resend</strong>, which sends through <strong>Amazon SES</strong> in the US
        <code>us-east-1</code> region — every email we send you, including confirmation and password
        reset links.
      </li>
      <li>
        <strong>Google reCAPTCHA</strong> — used on the registration and password reset forms to
        block automated abuse. Google receives data about that interaction directly from your browser.
      </li>
      <li>
        <strong>Gravatar</strong> (Automattic) — account avatars are fetched from Gravatar using an
        MD5 hash of your email address. That request tells Automattic the hash was viewed and from
        which IP address. The hash is not reversible, but it is a stable identifier for that address.
      </li>
      <li><strong>Porkbun</strong> — hosts the mailbox that receives mail sent to {SUPPORT}.</li>
    </ul>

    <h2>Cookies</h2>
    <p>
      One cookie, set when you sign in, which keeps you signed in. There are no analytics or
      advertising cookies. reCAPTCHA sets its own cookies on the pages where it appears.
    </p>

    <h2>Your rights</h2>
    <p>
      You can ask for a copy of what we hold about you, ask for it to be corrected, or ask for your
      account and its data to be deleted. Email {SUPPORT} and we will do it.
    </p>

    <h2>Still outstanding</h2>
    <p class="pub-hint">
      Named rather than guessed at, because a policy that states a retention period nobody has
      decided is worse than one that admits it: <strong>how long data is kept after an account is
      deleted</strong>, the <strong>governing jurisdiction</strong>, and the
      <strong>supervisory authority</strong> a complaint should go to. These will be filled in
      before the service is sold to anyone.
    </p>

    <h2>Contact</h2>
    <p>Questions about any of this: <a href="mailto:{SUPPORT}">{SUPPORT}</a>.</p>
  </div>
</div>
