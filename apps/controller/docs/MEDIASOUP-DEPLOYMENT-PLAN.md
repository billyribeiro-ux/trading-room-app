# mediasoup deployment plan

Status: **current-source Stage 1 test core and positive grant path proven; native
OpenSSL, TURN, control-plane signer/client wiring, RTP/media, and real-device proof
block production promotion**

Verified: **2026-08-02**

Selected implementation: **Rust mediasoup SFU in this repository's `services/`
workspace; the live test host runs the exact reviewed source revision identified
below**

Initial user region: **US East / North America**

## Current-source Stage 1 redeployment record — 2026-08-02

The test host was rebuilt and cut over from exact repository revision
`0a97fb1bb375e84e08591e85e6d932d8b503e9b6`, after that revision's hosted
backend workflow passed. The active media image is
`sha256:688418950d09350b78457382ad7ce4189243a0c1073bd47ae0286723d21438a9`.
It replaced historical image
`sha256:09bd912feeeaefe160ef6491d9d5b7ae73caac13fd08ee389d802915688ba5da`
at `2026-08-02T21:49:05Z`. The previous `media-image.env` and `media.env` were
retained on-host for rollback, together with a non-secret post-cutover evidence
record.

The active container was verified healthy, host-networked, read-only, and running
as non-root user `65532:65532`; systemd reported both the media and Caddy services
active. The runtime has exactly one allowed browser Origin,
`https://www.tradingroom.app`, and the public verifier passed the following
current-image boundary over trusted TLS:

- `/health` returned the reviewed bounded JSON allowlist with one or more workers,
  zero worker deaths, and `admission: require-grant`;
- plaintext HTTP returned the exact permanent `308` HTTPS redirect and the HTTPS
  response supplied the reviewed security headers;
- a correctly originated, same-origin, unsigned WebSocket upgrade returned `401`;
- missing, wrong, or duplicate Origin returned `403`;
- cross-site or duplicate `Sec-Fetch-Site` returned `403`; and
- none of the rejection responses set a cookie.

At `2026-08-02T22:02:59Z`, a separate fail-safe probe proved the current image's
positive signature path without reading or exposing the retained signer. The
test first proved zero rooms/peers and that Caddy's effective JSON configuration
contained no request access logger. One local Node process then generated an
ephemeral Ed25519 key entirely in memory and sent only its public half to the test
host. Before the one-line public-key rotation, a root-only byte-for-byte backup
and a 180-second automatic systemd rollback watchdog were installed. Synthetic
v2 claims contained random UUIDs and no real user data.

With the exact current image and canonical Origin, the probe proved:

- a grant expired beyond the implemented 30-second clock-skew allowance returned
  `401`;
- one valid ephemeral grant completed an authenticated `101 Switching Protocols`
  handshake with the exact RFC 6455 accept value and no cookie;
- the same unexpired bearer grant admitted four simultaneous sockets for one
  identity, while the fifth returned `503` under the reviewed per-identity cap;
- masked normal closes drained the synthetic room and all peers; and
- the original environment was restored byte-for-byte, the watchdog and probe
  directory were removed, and the exact image, Origin, zero-room/peer health,
  and six-case public rejection matrix passed again.

No ephemeral private key or grant was serialized, sent to AWS, written to disk,
printed, or retained. This proves the current image's Origin gate, Ed25519
verifier, expiry check, replay ceiling, TLS proxy, and upgrade path. It does not
prove that the retained public key matches the future control-plane signer, that
fresh bearer grants are single-use (they are not), that RTP flows, that TURN
works, or that any real-device/browser cell passes. No private signing key,
grant, SSH credential, or provider credential is stored in this record.

## Historical Stage 1 execution record — 2026-08-02

The first Stage 1 core SFU deployment on the AWS account selected by the user is
preserved below as historical and rollback evidence for immutable `f84bae3…`
source. It is no longer the active image. It contains public operational
identifiers and endpoints and intentionally does not store private signing keys,
grants, SSH material, or provider credentials.

| Item                  | Deployed fact                                                                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AWS resource          | Lightsail instance `mediasoup-test-01`, static address resource `mediasoup-test-ip`, `us-east-1a`                                                          |
| Test bundle           | `small_3_0`: 2 vCPU, 2 GB RAM, 60 GB disk, 3 TB transfer, $12/month base-bundle list price; transfer overage can add cost                                  |
| Cost guardrail        | `$15` monthly Lightsail budget with actual 50/80/100% and forecast 100% email alerts; alerts are not a spending cap                                        |
| Source                | clean detached checkout of `new-room` commit `f84bae3e92ed266a762b6cab68afc97bf36b4dcc`                                                                    |
| Media image           | immutable local image `sha256:09bd912feeeaefe160ef6491d9d5b7ae73caac13fd08ee389d802915688ba5da`, 18,196,559 bytes, distroless, non-root `65532:65532` user |
| TLS image             | `caddy@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648`                                                                            |
| Runtime               | Ubuntu 24.04 LTS, kernel `7.0.0-1009-aws`, Docker 29.1.3, 4 GB swap                                                                                        |
| Signalling            | Caddy TLS on TCP 443; HTTP redirects to HTTPS; upstream is loopback-only `127.0.0.1:4443`                                                                  |
| Media                 | one worker, announced static IPv4, inclusive RTC range `40000-40199` on UDP and TCP                                                                        |
| Admission             | `MEDIA_ALLOW_ANONYMOUS` absent; health reports `admission: require-grant`                                                                                  |
| Persistence           | systemd enables and restarts both containers; certificate state persists outside the read-only Caddy container                                             |
| Backups               | no automatic Lightsail snapshots are configured; the retained image/configuration record is not a host backup                                              |
| Public smoke endpoint | `https://media.34-195-170-147.sslip.io/health`; authenticated signalling is `wss://media.34-195-170-147.sslip.io/ws`                                       |
| Rollback image        | immediately previous healthy image `sha256:cc96a00ef6fd7e40ac2afb6780a78f4726f303da334549ef336df0a96579a83f` retained and recorded on-host                 |

Historical-image verification passed:

- the local and public health endpoints returned HTTP 200 with one live worker,
  zero worker deaths, and signed-grant admission;
- HTTPS negotiated a publicly trusted certificate, HTTP redirected with 308,
  and an unhandled root request returned 404;
- an unsigned HTTP/1.1 WebSocket upgrade returned 401 while a one-minute v2
  Ed25519 grant completed a TLS-authorized `101 Switching Protocols` handshake;
- pre-redeployment probes with missing Origin and with a wrong Origin each
  returned 401. That historical image predates exact-origin enforcement, so
  those responses proved only its grant-admission refusal;
- the media container was healthy, read-only, non-root, host-networked, and
  bound signalling only to loopback;
- the raw public port 4443 timed out externally;
- a controlled restart left both services enabled, active, and healthy; and
- the Lightsail edge firewall was atomically reconciled to TCP 80/443,
  UDP+TCP 40000-40199, and TCP 22 restricted to the administrator address plus
  the Lightsail browser-console alias.

The historical Stage 1 image was scanned on-host with pinned Syft 1.44.0 and
Grype 0.112.0 images. The retained historical artifacts are
`/opt/trading-room/evidence/media-sbom-distroless.spdx.json` (SHA-256
`c11ed5b5a1b176a765c5d1ff6a03587f3a2acd8feb5d45258d8fa7f1bcfbb389`)
and `/opt/trading-room/evidence/media-vulnerabilities-distroless.json`
(SHA-256
`ba42a29653aad26815152c5ca9e0d667a4691e53c2218966a58f4c28f4a997bb`).
The scan reported 12 findings: 1 critical, 2 high, 2 medium, and 7 negligible.
All critical/high findings are in Debian 13 `libc6` version `2.41-12+deb13u3`
and had no fixed version in the scanner database on 2026-08-02:
`CVE-2026-5450`, `CVE-2026-5928`, and `CVE-2026-5435`. This known base-image
risk is accepted only for the test host and must be rescanned before promotion.
That OCI/base-image evidence did not identify the statically linked OpenSSL 3.0.8
component and does not attest the current source; the native blocker is recorded
in `ops/backend-supply-chain-review.md`.

Lightsail monitoring now has two no-additional-AWS-charge alarms on the test
instance: `mediasoup-status-check-failed` (two consecutive five-minute failed
status checks; missing data is breaching) and `mediasoup-cpu-high` (three
consecutive five-minute periods at or above 85%; missing data is not breaching).
Both notify on `ALARM` and recovery to `OK`; both were `OK` on 2026-08-02. The
email contact remains `PendingVerification`, so notification delivery is not yet
claimed. The test bundle's base list price is $12/month and the monthly budget is
$15. The Budgets API reported the budget healthy and $0 actual spend at exactly
`2026-08-02T20:46:59Z`; this dated observation is neither a spending cap nor a
promise of future zero cost. Cost Explorer had not yet produced data for this
new account.

Repository checks now exercise public health, TLS, redirect, security-header, and
the six-case WebSocket admission matrix recorded above. The checked-in script
requires deployment-owned `MEDIA_SMOKE_ORIGIN` and
`MEDIA_SMOKE_BROWSER_ORIGIN`; the GitHub workflow receives both same-named
repository Actions variables. The scheduled workflow is a best-effort synthetic
check, not an availability SLA. Hosted run
[`30768966585`](https://github.com/billyribeiro-ux/trading-app-main/actions/runs/30768966585)
passed the production containment and current Stage 1 media contracts on exact
default-branch revision `cc99267a3dea445e35e052b8b1db171ccef4fe73`.
After the protected release merge, manually dispatched run
[`30776842719`](https://github.com/billyribeiro-ux/trading-app-main/actions/runs/30776842719)
passed the same production and media steps in 19 seconds on exact merged-main
revision `9968bd6b035656d503711504564651559c17e868`. This is synthetic boundary
evidence, not RTP, TURN, valid production-signer, real-device, or capacity proof.

The temporary public TLS hostname is derived from the static address and is an
integration endpoint, not the final product domain. The execution record above may
retain that public, non-secret endpoint as current test and historical deployment
evidence. Runtime checks resolve it through deployment configuration
(`MEDIA_SMOKE_ORIGIN`) rather than embedding an address in application or
verification code.

## 1. Scope freeze

This plan covers only the mediasoup media service and the TURN capability required
to prove that service over real public networks.

The following work is deliberately deferred:

- signup, subscription selection, checkout, payment, invoicing, and billing;
- transactional/control-plane SvelteKit deployment and its Rust API connection,
  PostgreSQL, object storage, email, or analytics. The marketing-only SvelteKit
  frontend is already deployed on Vercel and remains fail closed;
- final RBAC/ABAC and subscription entitlements;
- recording/transcoding workers and recording storage;
- the multi-node room-placement service; and
- global/multi-region production rollout.

The frontend and imported Rust services remain surfaces of one future SaaS
product. This media deployment must not create another user, tenant, room, role,
subscription, or billing database. The Rust API will remain the authority for
those domains and will issue short-lived grants to the SFU. Redis is not present
in the current service architecture and must not be represented as a current
correctness dependency.

## 2. Decision

Deploy mediasoup as a separate, always-on Linux service with a stable public IPv4
address and direct UDP/TCP reachability. Do not deploy the SFU inside Vercel,
Cloudflare Workers, a scale-to-zero container, or an HTTP-only platform.

For the first public test, use an **Amazon Lightsail Small-2GB Linux instance with
public IPv4 in US East (N. Virginia)**:

- 2 vCPUs;
- 2 GB RAM;
- 60 GB SSD;
- 3 TB bundled transfer;
- $12 USD/month when billed; and
- $0 for the first three months when the account is eligible for the current
  Lightsail free-tier offer.

This is a smoke/integration host, not a production capacity claim. The $5 and $7
bundles are cheaper, but their 0.5 GB and 1 GB memory allocations leave too little
operational margin for the Rust service, reverse proxy, OS, metrics, and safe
upgrades. Choosing the $12 bundle is an engineering safety decision, not a claim
that the repository contains a measured 2 GB minimum.

The selected path stays on x86-64 and AWS from the first public test through the
initial launch. It avoids an ARM-only test branch and avoids a provider migration
before the media contract is proven.

## 3. Hard-evidence hosting constraints

The original Stage 1 image was built from clean sibling-repository snapshot
`f84bae3e92ed266a762b6cab68afc97bf36b4dcc`; that remains immutable historical
provenance. The active test image was rebuilt from exact deployed repository
revision `0a97fb1bb375e84e08591e85e6d932d8b503e9b6`. The tracked `services/`
workspace on the reviewed repository HEAD is the current source authority.
`ops/backend-import-provenance.md` records the
exact import checkpoint, categorized reviewed post-import delta ledger, and
executable 98-file current-tree path/content seal. Agents must not edit or audit
an ambient sibling checkout as if it were current source.

| Fact                                                                                                                                                | Repository evidence                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signalling defaults to `0.0.0.0:4443`.                                                                                                              | `Config::from_env` in `services/media/src/config.rs:66-91`                                                                                               |
| An externally bound grant-enforcing service must announce a public address; only an entirely loopback-bound local grant test may announce loopback. | `validate_announced_address_policy` and its focused tests in `services/media/src/main.rs`, plus the Stage 1 environment/verification record in this plan |
| The default RTC range is inclusive `40000-49999`.                                                                                                   | `services/media/src/config.rs:76-77`                                                                                                                     |
| Each WebRTC transport creates UDP and TCP listen sockets.                                                                                           | `services/media/src/session.rs:858-890`                                                                                                                  |
| The deployment must open the RTC range on both UDP and TCP.                                                                                         | `services/media/src/session.rs:858-890` plus the reconciled Stage 1 firewall record in this plan                                                         |
| The current container topology requires Linux host networking.                                                                                      | `services/media/Dockerfile:81-83` plus the verified Stage 1 runtime record in this plan                                                                  |
| At least 100 RTC ports per worker are required at startup.                                                                                          | `Config::validate` in `services/media/src/config.rs:94-111`                                                                                              |
| A peer is budgeted four transports at two ports per transport.                                                                                      | `services/media/src/session.rs:139-153`; `Config::max_peers` in `services/media/src/config.rs:121-145`                                                   |
| One room owns one router; that router is assigned to one worker.                                                                                    | `RouterRegistry::join` and its `Room` state in `services/media/src/router_registry.rs:85-120,152-177`                                                    |
| Routers, peers, producers, and consumers are process-local state.                                                                                   | `services/media/src/router_registry.rs:85-120`; `AppState` in `services/media/src/server.rs:377-410`                                                     |
| One verified identity is limited to four concurrent signalling sockets, independently of the global port ceiling.                                   | `services/media/src/server.rs:256-263,628-695`                                                                                                           |
| Grant-enforcing current source requires one exact configured browser Origin before grant admission.                                                 | `services/media/src/main.rs:124-143`; `services/media/src/server.rs:827-841,960-995`                                                                     |
| Current source handles SIGTERM/ctrl-c and performs a bounded process shutdown; room-aware placement drain remains separate work.                    | `shutdown_signal` in `services/media/src/main.rs:234-273`; `services/media/src/server.rs:571-595,770-805`                                                |
| The media image has no persistent application volume requirement.                                                                                   | `services/media/Dockerfile:67-92`                                                                                                                        |

Official mediasoup documentation independently confirms that a worker runs on one
CPU core, a room/router belongs to one worker, and higher capacity is achieved by
distributing rooms over workers and hosts. Its approximate consumer examples are
not a substitute for an application-specific load test:
[mediasoup scalability](https://mediasoup.org/documentation/v3/scalability/).

## 4. Staged deployment ladder

Prices below are public list prices verified on 2026-08-02. Taxes, optional
snapshots, DNS, logs, and transfer overages are excluded.

| Stage            | Selected host                                    | Media configuration            |                                        Base media-host cost | Purpose                                                      |
| ---------------- | ------------------------------------------------ | ------------------------------ | ----------------------------------------------------------: | ------------------------------------------------------------ |
| 0 — local        | Developer machine                                | 1 worker; local-only address   |                                                          $0 | Unit, protocol, and same-machine browser work                |
| 1 — public smoke | Lightsail Small-2GB, public IPv4                 | 1 worker; `40000-40199`        | $12/month base; conditional credits/free-tier may offset it | Cross-network and TURN proof with a small invited test group |
| 2 — private beta | Lightsail Compute-optimized Large-4GB            | 1 worker; `40000-40999`        |                                                   $42/month | Sustained test traffic on dedicated CPU                      |
| 3 — paid launch  | Two Lightsail Compute-optimized Xlarge-8GB nodes | 3 workers/node; `40000-41999`  |                                            $168/month total | Minimum two-node reconnectable launch topology               |
| 4 — growth       | Add Xlarge-8GB nodes to regional pools           | 3 workers/node; measured range |                                         +$84/month per node | Horizontal scale by assigning new rooms to healthy nodes     |

AWS currently lists the compute-optimized Large as 2 vCPU/4 GB/160 GB/5 TB for
$42/month, and Xlarge as 4 vCPU/8 GB/320 GB/6 TB for $84/month. AWS describes
these instances as providing consistent, dedicated CPU performance, which is the
relevant property for mediasoup workers:
[Lightsail bundle table](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html),
[compute-optimized announcement](https://aws.amazon.com/about-aws/whats-new/2026/04/lightsail-compute-optimized-instances/).

AWS currently makes the $5, $7, and $12 public-IPv4 Linux bundles free for three
months on one eligible bundle per account. Eligibility must be confirmed in the
actual AWS account before provisioning:
[Lightsail pricing and free-tier terms](https://aws.amazon.com/lightsail/pricing/).

### Why Stage 3 uses two smaller nodes

One node is acceptable for smoke testing and a deliberately limited beta, but it
is not highly available. A worker or host failure drops the live in-memory media
sessions on that worker. Two nodes provide another placement target and a
reconnection target; they do not make active sessions magically stateful.

Adding an 8-vCPU monolith does not remove the one-room/one-router/one-worker
constraint. The default growth action is therefore another 4-vCPU node, not an
automatic vertical resize. A larger bundle remains available only when measured
multi-room density, not guesswork, proves it is the better tradeoff.

Stage 3 is blocked until room-aware placement exists. Do not put two SFUs behind
ordinary round-robin DNS or an HTTP load balancer: participants in one room could
land on isolated in-memory routers and be unable to exchange media.

## 5. Zero-cost alternatives considered

Local execution is the only unconditional $0 option.

Oracle currently offers an Always Free Ampere A1 allowance totaling 2 OCPUs and
12 GB RAM plus 10 TB/month outbound transfer. It is not selected as the default
remote test host because it is ARM64, free capacity may be unavailable, and idle
instances may be reclaimed. It may be used only as a disposable lab after the
container passes an ARM64 build and end-to-end WebRTC test:
[Oracle Always Free resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm).

New AWS customers may instead apply up to $200 in AWS Free Tier credits during a
six-month free-plan period. Credits are conditional, expire, and must never be
treated as a permanent infrastructure price:
[AWS Free Tier](https://aws.amazon.com/free/free-tier-faqs/).

## 6. Stage 1 network contract

Use one Ubuntu LTS x86-64 instance in US East (N. Virginia) with an attached
Lightsail static IPv4. AWS documents that an attached static address remains stable
across stop/start and currently has no charge while attached:
[Lightsail static IP addresses](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-static-ip-addresses-in-amazon-lightsail.html).

Provision these boundaries:

| Exposure                       | Rule                                                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Certificate bootstrap/redirect | `80/tcp` to the TLS reverse proxy for ACME HTTP validation and HTTP-to-HTTPS redirect                                   |
| Public signalling              | `443/tcp` to the TLS reverse proxy for `wss://media-test.<domain>/ws`                                                   |
| Internal signalling            | `127.0.0.1:4443` from the reverse proxy to the Rust SFU; do not expose raw `4443` publicly when the proxy is co-located |
| WebRTC media                   | `40000-40199/udp` and `40000-40199/tcp` from the internet                                                               |
| Administration                 | `22/tcp` only from an explicit administrator IP, or use an authenticated management path                                |
| All other inbound ports        | Closed                                                                                                                  |

Lightsail firewalls support UDP and TCP rules across port ranges from 0 through
65535:
[Lightsail firewall documentation](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-firewall-and-port-mappings-in-amazon-lightsail.html).

Use a DNS-only `A` record for the media hostname. The reverse proxy terminates TLS
and forwards WebSocket upgrade headers to `4443`. The WebRTC traffic goes directly
to the announced static IPv4; it does not traverse a normal HTTP CDN or proxy.
Caddy's automatic HTTPS uses the standard HTTP-01 and TLS-ALPN-01 validation paths
on ports 80 and 443 and maintains certificate renewal:
[Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https).

Run the media container with host networking. Do not publish thousands of Docker
ports individually. The source deployment guide records that per-port userland
proxies add file descriptors and packet-path overhead.

Initial environment contract:

```text
MEDIA_BIND_ADDRESS=127.0.0.1:4443
MEDIA_ANNOUNCED_ADDRESS=<attached-static-public-ipv4>
MEDIA_RTC_PORT_MIN=40000
MEDIA_RTC_PORT_MAX=40199
MEDIA_WORKERS=1
MEDIA_GRANT_PUBLIC_KEY=<runtime-compatible-public-key>
MEDIA_ALLOWED_ORIGIN=https://www.tradingroom.app
```

`MEDIA_ALLOW_ANONYMOUS` absent or blank means signed-grant admission remains
required. Exact `1` or `true` deliberately enables anonymous development access
only with loopback signaling and announced addresses.
Any other nonblank value—including `false`—is a startup error
(`admission_from_env` in `services/media/src/main.rs:221-232`). In grant-enforcing current source,
`MEDIA_ALLOWED_ORIGIN` is also mandatory. The explicit value above is the
canonical browser origin selected for the current product deployment; a staging
environment must use its own exact canonical origin rather than a wildcard.

Do not place actual keys, tokens, or provider credentials in this document or source
control. Public addresses may appear in the execution record as non-secret evidence,
but runtime code receives them through deployment configuration so replacement does
not require a source change.

The Stage 1 range contains 200 ports. The repository's conservative socket budget
is eight ports per peer, so its **port ceiling** is `floor(200 / 8) = 25` peers.
That is not a CPU, network, room-size, or commercial capacity promise.

## 7. TURN is part of the media proof

TURN is not a replacement for mediasoup. It is the fallback path for a browser
whose NAT or firewall cannot reach the SFU candidates directly. A public test is
not complete until both a direct candidate and a forced relay candidate have been
proven.

Use **Cloudflare Realtime TURN** for the test phase rather than deploying and
operating coturn now. As of 2026-08-02, Cloudflare documents:

- free and unlimited STUN;
- a 1,000 GB TURN free tier;
- $0.05/GB after that tier;
- UDP, TCP, TLS/5349, and TLS/443 endpoints; and
- server-generated short-lived credentials.

Sources:
[TURN pricing and free tier](https://developers.cloudflare.com/realtime/turn/faq/),
[credential generation](https://developers.cloudflare.com/realtime/turn/generate-credentials/).

The Cloudflare TURN key stays on the server. The browser receives only expiring
ICE credentials. Production credentials should be tenant/user tagged for abuse
analysis and use the shortest TTL that safely exceeds the intended room session.

This selection requires a small Rust control-API integration and is currently a
known blocker: the selected Rust endpoint returns only `grant` and `expiresIn`,
whereas the browser needs the selected media-node WSS URL and `iceServers`.
Evidence: `GrantResponse` in `services/api/src/http/v1/media.rs:15-22,58-61`.
The historical sibling checkout contained a prototype media client, but the
current repository has no wired browser client for this Rust contract; an ambient
sibling file is not current implementation evidence.

## 8. Required fixes before customer or production promotion

These items are media-boundary work. They do not authorize signup, billing, or the
rest of the SaaS deployment.

- [x] Add `services/.dockerignore`. Before this correction, the ignore file lived
      below the `services/` build-context root and approximately 34 GB of local
      `target/` output was eligible for transfer.
- [ ] Extend the Rust media-session response to return the selected WSS endpoint,
      short-lived grant, expiry, and short-lived `iceServers`.
- [ ] Import and approve the live-room browser client in its owning application,
      then wire it to the selected Rust media-session contract. This SvelteKit
      controller contains no `/api/media/grant` call or `RTCPeerConnection` client
      to "replace"; its joined route explicitly hands off to a separate room app.
- [ ] Migrate the browser media identity contract from legacy numeric IDs to the
      UUID/string IDs carried by Rust v2 grants before wiring that endpoint.
- [ ] Add server-side Cloudflare TURN credential generation; never expose the
      long-lived TURN key or Cloudflare API token to a browser.
- [x] Resolve signing-key documentation drift around the runtime's raw 32-byte,
      padded-standard-base64 Ed25519 seed/public-key contract.
- [ ] Bind grants to the selected media node or audience so a grant cannot be
      replayed indiscriminately across future nodes.
- [ ] Add a true readiness check that fails when no worker can accept a room. The
      existing `/health` response reports status and `workerDeaths`, but does not
      prove transport creation.
- [x] Reject loopback, private, special-use, and otherwise non-public announced
      addresses whenever signed-grant admission is enforced on a non-loopback
      listener. A loopback listener may announce loopback so the real signed-grant
      API-to-SFU path remains testable locally; explicitly anonymous development
      must keep both its listener and announced address on loopback. Focused
      binary tests cover the narrow
      local exception, public IPv4/IPv6 acceptance, and the externally bound
      non-public rejection matrix on the pinned Rust toolchain. The conservative range policy
      is tied to the authoritative IANA
      [IPv4](https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml)
      and
      [IPv6](https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml)
      special-purpose registries; a special parent block is rejected even when it
      contains a narrow globally reachable exception.
- [x] Add bounded process shutdown: SIGTERM/ctrl-c stop admission, signal peers,
      wait up to ten seconds, then close workers.
- [ ] Add room-aware placement drain so a node stops receiving new rooms before
      an orchestrated rollout and exits only after its final room closes.
- [x] Remove the grant-bearing query string from application request spans and
      keep application rejection logs on bounded reason classes.
- [x] Prove the Stage 1 Caddy effective configuration contains no request access
      logger before sending a synthetic grant-bearing WebSocket URI. Any future
      production access logger must independently prove query redaction.
- [ ] Set and test explicit screen-share/camera bitrate and encoding ceilings. The
      current screen-share path provides a start bitrate but no evidenced maximum.
- [ ] Emit media-specific metrics without user content or raw credentials.
- [x] Produce an immutable x86-64 image, OCI SBOM/base-image vulnerability scan,
      and rollback digest for the historical Stage 1 snapshot.
- [x] Build and deploy the current-source Stage 1 test image by immutable digest,
      retain the prior image/configuration for rollback, and verify its non-root,
      read-only, host-networked, healthy runtime posture.
- [ ] Rebuild the current source after removing the statically linked OpenSSL
      3.0.8 blocker; produce a binary/native SBOM, current vulnerability evidence,
      signatures/provenance, and a tested rollback for that exact image.
- [x] Add `--locked` to release builds, pin/review base-image inputs, and deploy
      the historical Stage 1 image by digest rather than a mutable tag.
- [x] Build the release from a reviewed commit/worktree, not the currently dirty
      ambient `new-room` working tree.
- [ ] Document OS patching, firewall reconciliation, secret delivery, certificate
      renewal, NTP monitoring, and backup/recovery for configuration.

Key rotation with overlapping public keys and a `kid` claim is deferred but is a
paid-launch gate; the current verifier supports only one public key.

## 9. Deployment checklist — Stage 1 only

Checked items are backed by the dated current or historical execution record
identified in their text. Unchecked items remain explicit promotion gates; a
live signalling endpoint does not silently close them.

### Account and cost controls

- [ ] Record whether account credits/free-tier terms cover each future billing
      period and the exact expiry; `$0` actual at one timestamp is not eligibility
      or future-cost proof.
- [x] Create an AWS Budget before the instance.
- [x] Alert at 50%, 80%, and 100% actual spend and 100% forecast spend.
- [ ] Verify the Lightsail alarm notification contact; it is currently
      `PendingVerification`, so the two `OK` alarms cannot yet claim delivered
      email. The AWS Budget has four separately configured email subscribers;
      budget alerts remain delayed notifications rather than a spending cap.
      AWS documents that unverified Lightsail contacts receive no alarm email:
      [notification contacts](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-adding-editing-notification-contacts.html).
- [ ] Select US East (N. Virginia) only after confirming it is closest to the first
      test cohort.
- [x] Record the exact bundle, region, availability zone, $12/month base price,
      $15 budget, and the exact $0-actual observation timestamp in the deployment
      record.
- [ ] Decide and implement a host backup/rebuild policy. No automatic Lightsail
      snapshots are currently configured.

### Host and network

- [x] Create one Small-2GB Linux instance with public IPv4.
- [x] Attach a static IPv4 before publishing DNS.
- [x] Apply the exact firewall contract from section 6 for both IPv4 and IPv6, or
      disable unused IPv6 exposure at the host firewall.
- [x] Harden SSH; disable password and root login.
- [x] Install automatic security updates with an explicit maintenance policy.
- [x] Create the DNS-only media hostname and a valid TLS certificate.
- [x] Confirm `80/tcp` serves only certificate validation and an HTTPS redirect;
      the media grant must never be accepted over plaintext HTTP/WebSocket.
- [x] Configure WebSocket proxying without a response timeout and preserve upgrade
      handling.

### Service

- [x] Deploy the immutable SFU image with host networking and a non-root process.
- [x] Keep the private signing key off the SFU; inject only its public verification
      key through the root-readable runtime environment.
- [x] Ensure `MEDIA_ALLOW_ANONYMOUS` is absent from the environment and verify
      health reports `require-grant`.
- [x] Verify configured workers, announced IP, and RTC range at startup without
      logging credentials.
- [x] Configure automatic process restart with a bounded backoff.
- [x] Keep the immediately previous known-good image available for rollback.

### Network proof

- [ ] Connect two clients from different physical networks; two devices on one LAN
      are not sufficient evidence.
- [ ] Test current Chrome, Safari, Firefox, iOS Safari, and Android Chrome.
- [ ] Test home broadband, mobile data, and at least one restrictive/VPN network.
- [ ] Prove direct UDP, direct TCP fallback, TURN/UDP, and TURN/TLS/443 separately.
- [ ] Inspect WebRTC statistics and confirm received frames increase; a connected
      signalling socket alone is not proof of media.
- [x] Prove the current image rejects a grant expired beyond its 30-second clock
      allowance. Grants are intentionally reusable bearer tokens until expiry;
      one grant admitted four concurrent sockets and the fifth was rejected with
      `503` by the per-identity cap.
- [ ] Expire TURN/ICE credentials and prove their reuse is rejected.
- [ ] Implement and prove emergency signing-key/TURN-key rotation and revocation;
      short expiry alone is not an immediate revocation mechanism.
- [x] Deploy the current exact-Origin implementation and prove that correct
      Origin plus no grant returns `401`, while missing, wrong, and duplicate
      Origin and cross-site/duplicate Fetch Metadata return `403` without
      setting cookies.
- [x] Prove on the current image that correct Origin plus a valid ephemeral grant
      reaches `101`, an expired grant returns `401`, and the documented
      four-socket replay ceiling rejects the fifth concurrent socket with `503`.
- [ ] Deploy the control-plane signer with secret-safe runtime injection and prove
      its public key, claims, endpoint, and client agree with the retained SFU
      configuration. The ephemeral probe is not signer-deployment evidence.
- [ ] Restart the SFU and prove the client presents an honest disconnect and can
      rejoin rather than remaining silently stale.

### Load and soak proof

- [ ] Run the actual room topology: screen share, audio, camera, multi-presenter,
      and the intended viewer mix.
- [ ] Record producer bitrate, selected consumer layers, CPU per worker, memory,
      egress, ports, RTT, jitter, loss, NACK, PLI, ICE failures, TURN share, and
      worker deaths.
- [ ] Hold the highest Stage 1 test load long enough to cover reconnects, publisher
      changes, network transitions, and certificate/proxy idle behavior.
- [ ] Intentionally cross the configured 25-peer port ceiling and prove admission
      fails explicitly rather than corrupting existing sessions.

## 10. Promotion gates

The repository contains no workload benchmark and does not enforce a maximum
screen-share bitrate. Consequently, no exact production audience number is proven
today. Promotions are evidence gates, not date gates.

Before applying performance thresholds, promotion evidence must prove the exact
artifact and boundary under test:

- the reviewed current source is built, signed/attested, and deployed by recorded
  digest; the current unsigned test image proves deployment identity but not the
  required production signing or provenance attestation;
- OpenSSL 3.0.8 is absent from the rebuilt native/binary SBOM and the current
  native plus container scans satisfy the reviewed policy;
- the complete correct/missing/wrong/duplicate Origin, Fetch Metadata, and
  control-plane-signed valid/invalid/expired grant matrix produces the expected
  distinct current-source behavior. The current six-case rejection matrix and
  ephemeral positive/expiry/replay proof validate the SFU, but not the future
  control-plane signer/key delivery;
- neither application nor reverse-proxy logs retain the grant-bearing request
  URI;
- the current browser client consumes the Rust media-session response, WSS node,
  UUID/string identity contract, and expiring `iceServers`; and
- rollback restores the prior current-line image and reconnects real browser
  clients after the expected session loss.

The following thresholds are initial engineering policy and must be revised from
observed test data; they are not claims extracted from the original application:

- zero unexplained worker deaths during the promotion test;
- zero authorization bypasses and zero anonymous production admissions;
- successful direct and TURN connections on every supported browser/network cell;
- sustained CPU below 65% on the busiest media worker at the target load;
- sustained network throughput below 60% of the measured usable host throughput;
- RTC port consumption below 70% of the configured range;
- no increasing memory/file-descriptor trend during the soak period; and
- documented recovery from process restart, host loss, and expired credentials.

Promote Stage 1 to Stage 2 only after those gates pass under the intended private
beta topology. Promote to Stage 3 only after the room-placement, drain, reconnect,
and node-specific grant contracts are implemented and tested.

## 11. Capacity and cost arithmetic

The source default range of 10,000 ports yields a 1,250-peer **socket budget**. It
does not prove that one node can carry 1,250 real users.

mediasoup forwards rather than transcodes, so egress is approximately the sum of
the selected producer bitrate sent to every consumer, plus protocol overhead and
retransmissions. For planning only:

```text
SFU egress ~= selected stream bitrate x consuming viewers + overhead
6 Mbit/s x 75 viewers = 450 Mbit/s before audio, overhead, and retransmission
6 Mbit/s for one viewer-hour = 2.7 GB before overhead
```

Those are arithmetic scenarios, not measured application bitrates. Actual
simulcast/SVC layer selection and captured telemetry must replace them.

AWS states that both inbound and outbound data count against the Lightsail bundle
allowance, while only excess outbound transfer is charged. Transfer alarms and a
hard operational response are mandatory because media egress can dominate the
entire platform bill:
[Lightsail pricing](https://aws.amazon.com/lightsail/pricing/).

## 12. Multi-node rule for the future launch

The room scheduler must eventually:

1. register each node's region, health, capacity, software version, and drain state;
2. atomically pin a room to one healthy node;
3. return that node's WSS endpoint, audience-bound grant, and ICE servers;
4. send every participant in that room to the same node;
5. stop placing new rooms on a draining node;
6. remove the node only after its final room closes; and
7. reconnect and republish after worker/node loss.

Seamless recovery of process-local media state is not currently possible. The
client must reconnect and publishers must republish.

Large one-to-many rooms need separate investigation. mediasoup warns that a single
router may be exceeded around 400–600 consumers / roughly 200–300 viewers with two
tracks, depending on the host and workload. Cross-router `pipeToRouter()` fan-out
is not implemented in this repository and remains deferred until measured demand
requires it.

## 13. Observability required before further remote/customer promotion

The current remote test host proves only its two host alarms, both `OK` at the
recorded observation, with notification delivery still unproven because the email
contact is `PendingVerification`. The application/media metric contract below and
an owner-verified delivery path remain open.

Record, without message content or credentials:

- node CPU, memory, disk, network ingress/egress, packet drops, and file descriptors;
- configured/live workers and cumulative worker deaths;
- rooms, peers, transports, producers, consumers, and RTC ports in use;
- producer/consumer bitrate and selected spatial/temporal layer;
- ICE success/failure, candidate protocol, TURN fallback share, join duration, and
  reconnect attempts;
- RTT, jitter, packet loss, NACK, PLI, and FIR rates; and
- grant rejection reason classes without logging the grant.

The final metrics/logs vendor is deferred. The metric contract is not.

## 14. Rollback and failure handling

- Deploy a new image to a new test node or drain the existing node before replacing
  it; do not terminate a node with an active room as a normal rollout method.
- Retain the previous immutable image tag and deployment configuration.
- Use a short DNS TTL for signalling, but do not claim DNS changes migrate active
  WebRTC transports.
- On a failed Stage 1 release, restore the previous image, verify current health,
  mint a new short-lived grant, and reconnect the test clients. The current
  `/health` endpoint is not a true readiness probe.
- On suspicious credential exposure, rotate the affected TURN key and media
  signing key, stop accepting the old public key, wait for already issued grants
  and ICE credentials to expire, redact logs, and document the incident. Immediate
  per-grant revocation is not implemented.
- Delete temporary hosts only after resolving the exact instance/static-IP targets
  and exporting the required evidence. Lightsail continues billing stopped
  instances until they are deleted.

## 15. Deferred whole-product boundary

The marketing-only SvelteKit frontend is selected and deployed on Vercel, but its
transactional/control-plane mode remains fail closed. This draft does not deploy
or connect the Rust control API, select a compatible managed PostgreSQL plan,
wire object storage, or select payment, email, and analytics providers. Redis is
not present in the current backend and is not a current correctness dependency.
When that work resumes:

- Postgres remains authoritative for tenants, users, subscriptions, rooms,
  memberships, capabilities, chat/history, and billing data;
- Redis, if adopted, is coordination/cache infrastructure rather than the source
  of truth;
- the SFU stores only ephemeral live media state and never queries payment data;
- recording runs on separate FFmpeg/GStreamer workers, not production SFU cores;
- usage metering covers participant-minutes, SFU egress, TURN GB, recording
  minutes, and storage; and
- account, marketplace, API-key, control, and room pages consume the same Rust
  authorization and subscription decisions.

These are boundary constraints for later planning, not authorization to implement
the deferred systems now.

## 16. Revalidation rule

Before any additional provider purchase or production promotion:

1. re-open the linked official pricing and service-limit pages;
2. record the verification date and exact region;
3. confirm public IPv4, UDP/TCP ranges, transfer allowance, overage rate, CPU class,
   and cancellation/deletion behavior;
4. compare the forecast from measured viewer-hours and bitrates against at least
   one dedicated-CPU alternative; and
5. amend this draft and obtain explicit implementation approval.

No price or free-tier offer in this document is permanent.
