# Stage 1 mediasoup deployment assets

These are the reproducible, non-secret assets for the Stage 1 deployment recorded
in `docs/MEDIASOUP-DEPLOYMENT-PLAN.md`. The tracked `services/` workspace is the
current source authority. `media-deployment.patch` is retained only to reproduce
the historical sibling `new-room` image at commit
`f84bae3e92ed266a762b6cab68afc97bf36b4dcc`; never apply it to current source.

## Current-source Stage 1 procedure

1. Start from a clean, reviewed repository revision whose Backend quality workflow
   passed. Record the full revision before building.
2. Build from the workspace root with
   `docker build -f services/media/Dockerfile services`. The Dockerfile and bases
   are digest-pinned and the build is locked; do not replace them with mutable
   tags or an ambient sibling checkout.
3. Record the resulting immutable image digest. Before promotion, produce the
   native/binary and OCI SBOM, vulnerability evidence, signature, and provenance
   required by the deployment plan. The current OpenSSL 3.0.8 native blocker keeps
   every such image test-only.
4. Render `media-image.env`, `media.env`, `caddy-image.env`, `caddy.env`, and the
   Caddyfile from their examples outside Git. Replace every angle-bracket
   placeholder, require the canonical browser Origin, and use a publicly routable
   `MEDIA_ANNOUNCED_ADDRESS`; grant-enforcing current source rejects local,
   private, and special-use addresses whenever the signaling listener is not
   itself loopback-bound. The loopback-bind plus loopback-announcement exception
   exists only so local signed-grant integration remains testable.
5. Back up the active image/environment references before changing them. Keep the
   prior known-good digest available and install an automatic rollback deadline
   before restarting either service.
6. Install rendered runtime files under `/etc/tradingroom-media` and the two units
   under `/etc/systemd/system`; reload systemd, restart one boundary at a time, and
   prove local health before public verification.
7. Run the committed production/media verifier against the deployment-owned HTTPS
   and browser-Origin values. Promotion additionally requires the production
   signer, RTP/TURN, real-device, load/soak, monitoring, and rollback evidence
   listed in the deployment plan.

## Historical-image reproduction only

To reproduce the retired `f84bae3…` image, clone that exact commit into a clean
detached worktree, apply `media-deployment.patch` there, and build with the same
`services/` context. That path is historical forensic evidence, not a current
deployment instruction.

The private grant-signing key does not belong on the SFU. Only its raw public
verification key is configured in `media.env`. Do not commit rendered environment
files, static addresses, grants, SSH credentials, or provider tokens.

The checked-in Caddy template reads the public hostname from `caddy.env`; the
deployed integration host currently uses a temporary DNS name derived from the
attached Lightsail static address. The final product domain can replace it
without changing the SFU image.

The original 2026-08-02 deployment used media image
`sha256:09bd912feeeaefe160ef6491d9d5b7ae73caac13fd08ee389d802915688ba5da`
from the historical source commit above. At `2026-08-02T21:49:05Z`, the test host
was cut over to exact current repository revision
`0a97fb1bb375e84e08591e85e6d932d8b503e9b6` as immutable image
`sha256:688418950d09350b78457382ad7ce4189243a0c1073bd47ae0286723d21438a9`.
The predecessor image and environment were retained on-host for rollback. The
definitive runtime, network, cost, vulnerability, verification, and outstanding
promotion-gate record is `docs/MEDIASOUP-DEPLOYMENT-PLAN.md`.
