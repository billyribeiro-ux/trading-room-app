import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const [
  reference,
  imageBadgePrompt,
  page,
  pageServer,
  managePage,
  manageServer,
  features,
  entitlementPolicy,
  navbar,
  tooltipModule,
  bootboxComponent,
  bootboxState,
  css,
  schema,
  ddl
] = await Promise.all([
  readFile(new URL('../evidence-dumps/login-page/logged-in-page', import.meta.url), 'utf8'),
  readFile(new URL('../evidence-dumps/account-page/upload-image-badge-prompt.html', import.meta.url), 'utf8'),
  readFile(new URL('../src/routes/(app)/account/+page.svelte', import.meta.url), 'utf8'),
  readFile(new URL('../src/routes/(app)/account/+page.server.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/routes/(app)/account/rooms/[id]/+page.svelte', import.meta.url), 'utf8'),
  readFile(new URL('../src/routes/(app)/account/rooms/[id]/+page.server.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/features.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/server/account-entitlements.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/components/AppNavbar.svelte', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/bootstrap-tooltip.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/components/Bootbox.svelte', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/bootbox.svelte.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/account.css', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/server/db/schema.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/server/db/ddl.js', import.meta.url), 'utf8')
]);

assert.equal(
  createHash('sha256').update(reference).digest('hex'),
  '4e1cfd1e9f84fc420066cc0d9eb23bb3a6ebdef52d4b551f707113dc1a444e34',
  'the saved authenticated account reference changed; recapture and re-audit before accepting it'
);
assert.equal(
  createHash('sha256').update(imageBadgePrompt).digest('hex'),
  'fb4e934f761f15fb2eac26882ce6ebac9b6628f6f3b8ab48b20ad521a6c7c43f',
  'the supplied original image-badge prompt changed; re-audit before accepting it'
);

assert.match(reference, /var __disableMarketplace = 'true'/);
assert.match(reference, /ng-hide="disableMarketplace"[^>]*>\s*<i[^>]*><\/i> Marketplace/);
assert.match(page, /\{#if data\.entitlements\.marketplace\}[\s\S]*?fa-credit-card[\s\S]*?Marketplace[\s\S]*?\{\/if\}/);
assert.match(pageServer, /entitlements:\s*resolveAccountEntitlements\(\{ accountId \}\)/);
assert.match(entitlementPolicy, /const FULL_PRODUCT_ENTITLEMENTS[\s\S]*?marketplace:\s*true/);
assert.match(entitlementPolicy, /'text-list':\s*true[\s\S]*?sso:\s*true[\s\S]*?mobile:\s*true/);
assert.match(entitlementPolicy, /'clone-room':\s*true[\s\S]*?'delete-room':\s*true/);
assert.match(features, /function resolveFeatureReadiness/);
assert.match(manageServer, /const entitlements = resolveAccountEntitlements/);
assert.match(manageServer, /canClone:\s*entitlements\['clone-room'\]/);
assert.match(manageServer, /canDelete:\s*entitlements\['delete-room'\]/);
assert.match(manageServer, /const featureReadiness = resolveFeatureReadiness\(settings\)/);
assert.doesNotMatch(managePage, /disabled=\{!data\.features/);

assert.doesNotMatch(page, /<p class="acc-notice">[\s\S]*?secret/);
assert.doesNotMatch(page, /••••|lastFour/);
assert.match(page, /\{#if key\.secret\}[\s\S]*?\{key\.secret\}[\s\S]*?Secret unavailable — regen secret/);
assert.doesNotMatch(pageServer, /lastFour:\s*apiKeys\.lastFour/);
assert.match(pageServer, /secretCiphertext:\s*encryptApiKeySecret/);
assert.match(pageServer, /secret:\s*k\.secretCiphertext[\s\S]*?decryptApiKeySecret/);
assert.doesNotMatch(pageServer, /return \{ keyId: id, secret \}/);
assert.match(schema, /secretCiphertext:\s*text\('secret_ciphertext'\)/);
assert.match(ddl, /secret_ciphertext TEXT/);
assert.match(page, /href=\{resolve\('\/account\/api-docs'\)\}[\s\S]*?target="_blank"[\s\S]*?API Docs/);
assert.match(page, /&nbsp; \| &nbsp;/);
assert.match(page, /<th>_id<\/th><th>secret<\/th><th class="acc-th-center">Actions<\/th>/);
/*
  The three API-key cells IN ORDER: the id, then the secret, then the actions.

  This used to require the first cell to be exactly `<td>{key.id}</td>`, and broke the moment that
  cell gained the reference's `fa-lock` "Restricted" padlock beside the id. What it is actually for
  is the column ORDER — that the secret is not rendered before the id, and that the actions cell
  stays last — so it now pins the order and lets each cell hold what it needs to. Asserting a cell
  is empty of everything but its binding is a rule the reference itself does not follow.
*/
assert.match(page, /<td>[\s\S]{0,600}?\{key\.id\}[\s\S]*?\{key\.secret\}[\s\S]*?<td class="acc-td-center">/);
assert.match(css, /\.acc-table \.acc-th-center,[\s\S]*?\.acc-table \.acc-td-center\s*\{\s*text-align:\s*center/);
assert.match(css, /\.acc-table-responsive\s*\{\s*overflow:\s*auto/);

assert.match(page, /bootbox\.prompt\('Enter the badge name \(\*optional\):', 'OK', 'text'\)/);
assert.match(page, /action="\?\/uploadImageBadge"[\s\S]*?use:enhance=\{saveImageBadge\}/);
assert.match(page, /saveImageBadge:[\s\S]*?formData\.set\('label', imageLabel\)/);
assert.doesNotMatch(pageServer, /uploadImageBadge:[\s\S]*?if \(!label\)/);
assert.match(bootboxState, /inputType:\s*'text' \| 'textarea'/);
assert.match(
  bootboxComponent,
  /class="bootbox-input bootbox-input-text form-control"[\s\S]*?autocomplete="off"[\s\S]*?type="text"/
);

assert.match(reference, /brand-logo ng-hide/);
assert.match(reference, /class="icon fa\s+fa-cog" tooltip-placement="bottom" tooltip="Account Settings"/);
assert.match(reference, /class="icon fa fa-2x fa-power-off" tooltip-placement="bottom" tooltip="Logout"/);
assert.match(navbar, /class="acc-navbar-header navbar-header"/);
assert.match(navbar, /class="acc-brand navbar-brand"/);
assert.match(navbar, /class="acc-brand-logo brand-logo ng-hide" hidden/);
assert.match(navbar, /class="acc-nav-wrapper nav-wrapper collapse navbar-collapse in"/);
assert.match(navbar, /class="acc-nav-right nav navbar-nav navbar-right hidden-material"/);
assert.match(navbar, /class="acc-nav-account icon fa fa-cog"/);
assert.match(navbar, /class="acc-nav-logout icon fa fa-2x fa-power-off"/);
assert.doesNotMatch(navbar, /title="(?:Account Settings|Logout)"/);
assert.match(
  navbar,
  /bottomTooltip\(\{[\s\S]*?content:\s*'Account Settings'[\s\S]*?id:\s*'account-settings-tooltip'[\s\S]*?\}\)/
);
assert.match(navbar, /bottomTooltip\(\{\s*content:\s*'Logout',\s*id:\s*'logout-tooltip'\s*\}\)/);
assert.match(navbar, /\{@attach accountSettingsTooltip\}/);
assert.match(navbar, /\{@attach logoutTooltip\}/);
assert.match(tooltipModule, /element\.className = 'acc-tooltip tooltip bottom fade'/);
assert.match(tooltipModule, /element\.setAttribute\('role', 'tooltip'\)/);
assert.match(tooltipModule, /let offsetParent = node\.offsetParent/);
assert.match(tooltipModule, /node\.after\(element\)/);
assert.doesNotMatch(tooltipModule, /document\.body\.append\(element\)/);
assert.match(tooltipModule, /popup\.offsetWidth \/ 2/);
assert.match(tooltipModule, /triggerTop \+ \(trigger\.height \|\| node\.offsetHeight\)/);
assert.match(tooltipModule, /inner\.textContent = content/);
assert.match(tooltipModule, /element\.classList\.add\('in'\)/);
assert.match(tooltipModule, /popup\.classList\.remove\('in'\)/);
assert.match(tooltipModule, /window\.setTimeout\(removePopup, 500\)/);
assert.match(tooltipModule, /trigger\.top \+ window\.scrollY - parentTop/);
assert.match(tooltipModule, /node\.addEventListener\('mouseenter', show\)/);
assert.match(tooltipModule, /node\.addEventListener\('focus', show\)/);
assert.match(tooltipModule, /node\.addEventListener\('keydown', onkeydown\)/);
assert.match(css, /\.acc-tooltip\.tooltip\.bottom\s*\{[^}]*padding:\s*5px 0[^}]*margin-top:\s*3px/s);
assert.match(
  css,
  /\.acc-tooltip \.tooltip-inner\s*\{[^}]*padding:\s*3px 8px[^}]*background-color:\s*rgb\(0, 0, 0\)[^}]*border-radius:\s*4px/s
);
assert.match(
  css,
  /\.acc-tooltip\.tooltip\.bottom \.tooltip-arrow\s*\{[^}]*border-width:\s*0 5px 5px[^}]*border-bottom-color:\s*rgb\(0, 0, 0\)/s
);

function controlsWithoutBrowserIdentity(source) {
  return [...source.matchAll(/<(input|select|textarea)\b[\s\S]*?>/g)]
    .map((match) => match[0])
    .filter((control) => !/(?:^|\s)(?:id|name)\s*=|\{name\}/.test(control));
}

assert.deepEqual(controlsWithoutBrowserIdentity(page), []);
assert.deepEqual(controlsWithoutBrowserIdentity(bootboxComponent), []);

assert.match(page, /class="col-md-4 acc-col-4 acc-panel"/);
assert.match(css, /\.acc-search\s*\{[^}]*width:\s*100%/s);
assert.match(css, /@media \(min-width:\s*992px\)[\s\S]*?\.acc-body \.col-md-4[\s\S]*?width:\s*33\.33333333%/);

assert.match(
  css,
  /@media screen and \(max-width:\s*767px\)[\s\S]*?\.acc-table-responsive\s*\{[\s\S]*?margin-bottom:\s*15px[\s\S]*?overflow-x:\s*auto[\s\S]*?overflow-y:\s*auto[\s\S]*?border:\s*1px solid var\(--acc-cell-rule\)/
);
assert.match(css, /\.acc-table-responsive > \.acc-table > thead > tr > th\s*\{\s*white-space:\s*nowrap/);

console.log('Authenticated account source contract verified');
