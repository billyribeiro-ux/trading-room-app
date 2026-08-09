<script lang="ts">
  /**
   * Terms of service.
   *
   * ## Not a reproduction, and not a template
   *
   * The reference serves its own at `/public/html/tos.html`, which was never captured. What is
   * below describes THIS service — a hosted trading room with a presenter, members, chat, alerts
   * and screen sharing — rather than a generic SaaS clause set that would describe a product this
   * is not.
   *
   * ## What is deliberately NOT here
   *
   * Payment, refund and cancellation terms; a governing jurisdiction; an arbitration or venue
   * clause; and any uptime commitment. None of those has been decided, and a term invented here
   * would be a promise the owner never made. Each is named as outstanding instead — and the payment
   * section in particular has to exist before anyone is charged.
   */
  const UPDATED = '9 August 2026';
  const SUPPORT = 'support@tradingroom.app';
</script>

<svelte:head>
  <title>Terms of Service — TradingRoomApp</title>
  <meta name="description" content="The terms you agree to when you use TradingRoomApp." />
</svelte:head>

<div class="pub-container">
  <div class="pub-form-card">
    <h1>Terms of service</h1>
    <p class="pub-hint">Last updated {UPDATED}.</p>

    <p class="pub-error">
      This document has not been reviewed by a lawyer. It accurately describes how the service works
      and what is expected of you, and it is not yet complete — payment terms, governing law and any
      uptime commitment are marked as outstanding below.
    </p>

    <h2>What the service is</h2>
    <p>
      TradingRoomApp hosts live rooms. A room's owner can present to its members, share their
      screen, run a chat, and send alerts to members' browsers and paired phones. Each room is
      controlled by the account that created it.
    </p>

    <h2>Your account</h2>
    <ul>
      <li>You must give a real email address and confirm it. Creating a room requires a confirmed address.</li>
      <li>You are responsible for what happens under your account, so keep your password to yourself.</li>
      <li>One person per account. Do not share a login with somebody else.</li>
      <li>You must be old enough to enter a contract where you live.</li>
    </ul>

    <h2>What you agree not to do</h2>
    <ul>
      <li>Break the law with it, or use it to harass, threaten or defraud anybody.</li>
      <li>Upload malware, or try to break, overload or gain unauthorised access to any part of it.</li>
      <li>Record, restream or redistribute a room's content without the room owner's permission.</li>
      <li>Resell access to a room you do not own.</li>
    </ul>

    <h2>Rooms and their content</h2>
    <p>
      What a presenter says or shows in a room belongs to them, not to us, and we do not claim
      ownership of it. We do need permission to transmit and store it in order to run the room for
      you. A room's owner decides who may join and may remove anybody from it.
    </p>
    <p>
      <strong>Nothing in any room is financial advice from us.</strong> Rooms are run by their
      owners. We do not review, endorse or verify anything said in one, and any trading decision you
      make is your own.
    </p>

    <h2>Availability</h2>
    <p>
      We work to keep the service running, but it can go down for maintenance or for reasons outside
      our control. No uptime figure is promised — see the outstanding items below.
    </p>

    <h2>Ending it</h2>
    <p>
      You can stop using the service and ask for your account to be deleted at any time by emailing
      {SUPPORT}. We may suspend or close an account that breaks these terms.
    </p>

    <h2>Liability</h2>
    <p>
      The service is provided as it is. To the extent the law allows, we are not liable for lost
      profits, lost trading opportunities, or loss of data arising from your use of it.
    </p>

    <h2>Changes</h2>
    <p>
      These terms will change as the service grows. The date at the top says when they last did, and
      material changes will be announced before they take effect.
    </p>

    <h2>Still outstanding</h2>
    <p class="pub-hint">
      Named rather than invented, because a term nobody agreed to is worse than an acknowledged gap:
      <strong>payment, refund and cancellation terms</strong> — which must be written before anyone
      is charged — the <strong>governing jurisdiction</strong>, any
      <strong>dispute-resolution route</strong>, and whether any
      <strong>uptime commitment</strong> is offered.
    </p>

    <h2>Contact</h2>
    <p>Questions: <a href="mailto:{SUPPORT}">{SUPPORT}</a>.</p>
  </div>
</div>
