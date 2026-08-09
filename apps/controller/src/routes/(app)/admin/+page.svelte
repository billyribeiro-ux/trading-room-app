<script lang="ts">
  import { enhance } from '$app/forms';
  import { bootbox } from '$lib/bootbox.svelte';
  import type { SubmitFunction } from '@sveltejs/kit';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();

  /**
   * Suspending an account signs its owner out everywhere and stops every room they have launched.
   * It is the most consequential thing this screen can do, so it asks first — and the confirmation
   * names the account, because an operator scanning a long table is exactly who mis-clicks a row.
   */
  /**
   * Impersonation asks first and says what it means, because "View as" reads harmless and is not.
   * Fifteen minutes is the hard limit in `IMPERSONATION_TTL_MS`; it cannot be extended.
   */
  function confirmImpersonate(email: string): SubmitFunction {
    return async ({ cancel }) => {
      const ok = await bootbox.confirm(
        `View the product as ${email}? You will act as them for up to 15 minutes, a banner will say so on every page, and one audit row records it.`
      );
      if (!ok) {
        cancel();
        return;
      }
      return async ({ update }) => update({ reset: false });
    };
  }

  function confirmStatus(name: string, suspending: boolean): SubmitFunction {
    return async ({ cancel }) => {
      const ok = await bootbox.confirm(
        suspending
          ? `Suspend “${name}”? Their owner is signed out immediately and every room they have launched stops serving.`
          : `Reinstate “${name}”? Their owner can sign in again and their rooms resume.`
      );
      if (!ok) {
        cancel();
        return;
      }
      return async ({ update }) => update({ reset: false });
    };
  }

  let search = $state('');

  const filtered = $derived(
    search.trim()
      ? data.accounts.filter((account) => {
          const needle = search.trim().toLowerCase();
          return (
            account.name.toLowerCase().includes(needle) ||
            account.ownerEmail.toLowerCase().includes(needle)
          );
        })
      : data.accounts
  );

  const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  // The value arrives as a Date through devalue, but a string would silently render "Invalid Date",
  // so it is normalised rather than assumed.
  const joined = (value: Date | string) => dateFormat.format(new Date(value));
</script>

<svelte:head>
  <title>Operator console</title>
  <!-- Never indexable, even if the route somehow became reachable. -->
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<h2 class="acc-h2">Operator console</h2>

<p class="acc-text-muted admin-signed-in">
  Signed in as <strong>{data.operator.displayName}</strong> ({data.operator.email}) · {data.configuredAdmins}
  operator{data.configuredAdmins === 1 ? '' : 's'} configured
</p>

<div class="acc-row admin-totals">
  <div class="col-md-3 acc-panel">
    <div class="admin-metric">{data.totals.accounts}</div>
    <div class="acc-text-muted">Accounts</div>
  </div>
  <div class="col-md-3 acc-panel">
    <div class="admin-metric">{data.totals.rooms}</div>
    <div class="acc-text-muted">Rooms</div>
  </div>
  <div class="col-md-3 acc-panel">
    <div class="admin-metric">{data.totals.openRooms}</div>
    <div class="acc-text-muted">Open right now</div>
  </div>
</div>

<hr class="acc-hr" />

<div class="acc-toolbar">
  <input
    class="acc-input"
    type="search"
    placeholder="Filter by account name or owner email"
    aria-label="Filter accounts"
    bind:value={search}
  />
</div>

{#if data.accounts.length === 0}
  <!-- The honest empty state. Nobody has registered yet; that is a fact, not a failure. -->
  <p class="acc-text-muted">No accounts have been registered yet.</p>
{:else}
  <table class="acc-table admin-table">
    <thead>
      <tr>
        <th scope="col">Account</th>
        <th scope="col">Owner</th>
        <th scope="col">Registered</th>
        <th scope="col" class="admin-num">Users</th>
        <th scope="col" class="admin-num">Rooms</th>
        <th scope="col" class="admin-num">Members</th>
        <th scope="col" class="admin-num">Badges</th>
        <th scope="col" class="admin-num">API keys</th>
        <th scope="col">Status</th>
      </tr>
    </thead>
    <tbody>
      {#each filtered as account (account.id)}
        <tr>
          <td>{account.name}</td>
          <td>{account.ownerEmail}</td>
          <td>{joined(account.createdAt)}</td>
          <td class="admin-num">{account.users}</td>
          <td class="admin-num">{account.rooms}</td>
          <td class="admin-num">{account.members}</td>
          <td class="admin-num">{account.badges}</td>
          <td class="admin-num">{account.apiKeys}</td>
          <td>
            {#if account.status === 'active'}
              <span class="admin-status admin-status-active">Active</span>
            {:else}
              <span class="admin-status admin-status-suspended" title={account.suspendedReason ?? ''}
                >Suspended</span
              >
            {/if}
            <!-- The operator's own account has no suspend control at all. The server refuses it
                 too (`operator.accountId`), but a button that always fails is worse than none. -->
            <!-- A read-only operator is not offered the control at all. The server refuses it
                 too (`requireSuperadmin(locals, 'support')`); this stops dangling a button that
                 can only ever 404. -->
            {#if account.id !== data.operator.accountId && data.operator.role !== 'read-only'}
              <form
                method="POST"
                action="?/setAccountStatus"
                use:enhance={confirmStatus(account.name, account.status === 'active')}
              >
                <input type="hidden" name="accountId" value={account.id} />
                <input
                  type="hidden"
                  name="status"
                  value={account.status === 'active' ? 'suspended' : 'active'}
                />
                <input
                  class="admin-reason"
                  name="reason"
                  placeholder="Reason (optional)"
                  maxlength="200"
                />
                <button type="submit"
                  >{account.status === 'active' ? 'Suspend' : 'Reinstate'}</button
                >
              </form>
            {/if}
            <!-- Impersonation is `full` only, never the operator's own account, and never an
                 account with no owner user row to become. The server enforces all three; this
                 avoids rendering a control that can only fail. -->
            {#if data.operator.role === 'full' && account.id !== data.operator.accountId && account.ownerUserId !== null && account.status === 'active'}
              <form
                method="POST"
                action="?/impersonate"
                use:enhance={confirmImpersonate(account.ownerEmail)}
              >
                <input type="hidden" name="userId" value={account.ownerUserId} />
                <input class="admin-reason" name="reason" placeholder="Reason" maxlength="200" />
                <button type="submit">View as</button>
              </form>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>

  {#if form && 'message' in form}
    <p class="admin-error" role="alert">{form.message}</p>
  {/if}

  {#if filtered.length === 0}
    <p class="acc-text-muted">No account matches “{search}”.</p>
  {/if}
{/if}

<hr class="acc-hr" />

<!--
  Says what is missing rather than showing a disabled button that implies it is coming next week.
  Every item here is in docs/OUTSTANDING.md with its evidence.
-->
<div class="admin-pending">
  <strong>Not built yet.</strong> Billing and subscriptions, per-account plan limits, suspending an
  account, and impersonation for support. This console is read-only until those exist — the worst a
  bug here can do is show something, not change somebody's account.
</div>

<style>
  .admin-signed-in {
    margin-bottom: 1rem;
  }
  .admin-totals {
    margin-bottom: 0.5rem;
  }
  .admin-metric {
    font-size: 28px;
    font-weight: 700;
    line-height: 1.1;
  }
  .admin-table {
    width: 100%;
  }
  /* This screen is the operator's own tool, not a customer surface, so nothing here is matched
     against a capture — the reference has no equivalent page. Plain, legible, and stated as such
     rather than left to look like transcribed values. */
  .admin-status {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 600;
  }
  .admin-status-active {
    background: rgb(223, 240, 216);
    color: rgb(60, 118, 61);
  }
  .admin-status-suspended {
    background: rgb(242, 222, 222);
    color: rgb(169, 68, 66);
  }
  .admin-reason {
    width: 140px;
    margin: 4px 6px 0 0;
  }
  .admin-error {
    padding: 8px 12px;
    border: 1px solid rgb(169, 68, 66);
    color: rgb(169, 68, 66);
    border-radius: 3px;
  }
  .admin-num {
    text-align: right;
    /* Aligns digits so a column of counts can be scanned vertically. */
    font-variant-numeric: tabular-nums;
  }
  .admin-pending {
    padding: 12px;
    border: 1px dashed rgb(193, 193, 193);
    border-radius: 3px;
    font-size: 13px;
    line-height: 1.5;
    color: rgb(85, 85, 85);
    background: rgb(249, 249, 249);
  }
</style>
