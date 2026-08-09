# API release-artifact evidence contract

Status: **source contract implemented and proved by protected hosted run
[`30833857437`](https://github.com/billyribeiro-ux/trading-app-main/actions/runs/30833857437)
on exact default-branch revision `dac88f1078f9d2015beb35e8cb4beaf7ecf909a1`,
whose retained bundle
`api-release-evidence-dac88f1078f9d2015beb35e8cb4beaf7ecf909a1-30833857437-1`
expires 2026-09-02T17:21:47Z. Signature and provenance attestation, publishing,
and deployment remain out of scope.**

## Authority and scope

The protected backend workflow builds the exact checked-out
`services/api/Dockerfile` from a clean tree without a registry login or push.
The image must carry the full source revision as its OCI revision label. Only a
successful protected run and its retained evidence bundle can attest a current
revision.

Protected PR run `30780552489` and retained artifact
`api-release-evidence-45f470fa5a11157a451f0b357f86195462e0cd00-30780552489-1`
are authoritative evidence that the former Debian 12 runtime failed policy with
seven Critical findings across `perl-base`, `libc6`, and `libc-bin`. Local
Debian 13 and static-distroless controls informed the replacement design but
were not retained. They are not release evidence and do not attest or promote
the current image; the protected workflow must reproduce every current claim.

## Pinned build boundary

The protected workflow provisions one explicitly named
`api-release-builder` through commit-pinned
`docker/setup-buildx-action@d7f5e7f509e45cec5c76c4d5afdd7de93d0b3df5`
(`v4.1.0`), Buildx `v0.34.1`, and BuildKit
`moby/buildkit:v0.31.2@sha256:2f5adac4ecd194d9f8c10b7b5d7bceb5186853db1b26e5abd3a657af0b7e26ec`.
The evidence script rejects any other reported Buildx or BuildKit version,
retains the selected builder inspection, passes `--builder
api-release-builder` to both builds, and requires both metadata files to report
a build reference under that builder. For the loaded runtime image,
`containerimage.config.digest` in Buildx metadata must equal the Docker image
ID.

The builder and final base are immutable:

- builder:
  `rust:1.97.1-alpine3.24@sha256:3c38f3f82c2f3d73da3b38e18d279393a04cb43ddded0e35088a8c3324d40900`;
- runtime:
  `gcr.io/distroless/static-debian13:nonroot@sha256:f7f8f729987ad0fdf6b05eeeae94b26e6a0f613bdf46feea7fc40f7bd72953e6`;
- platform: `linux/amd64`; and
- runtime user: numeric uid/gid `65532:65532`.

The Dockerfile explicitly selects the builder's installed Rust `1.97.1`
toolchain. Developer-only rustfmt, Clippy, and rust-analyzer component requests
cannot cause release-build downloads. `cargo-auditable 0.7.5` embeds the locked
runtime crate graph in both ELFs; the crates.io package SHA-256 is
`cd121127b91d68074770a620544182345d7db56d03dcbd85316ab11e54a5b1bc`.
The tool is installed with Cargo's locked checksum verification and is not
copied into the runtime.

## Exact system-musl linkage boundary

The release target is `x86_64-unknown-linux-musl`, but the Dockerfile disables
Rust's self-contained native CRT/libc selection with
`-C link-self-contained=no`. It links the Alpine system CRT/libc inputs and an
isolated copy of only the pinned Rust-toolchain `libunwind.a`. Linker maps for
both binaries must name exactly these seven native inputs, with these exact
hashes:

| Native input                                               | Package/source boundary                        | SHA-256                                                            |
| ---------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------ |
| `/usr/lib/rcrt1.o`                                         | `musl-dev 1.2.6-r2`                            | `5e93abc3f181bdb1b177e8725dbad7c08ddf2dc5d94d47d593a34a7a4cba1df5` |
| `/usr/lib/crti.o`                                          | `musl-dev 1.2.6-r2`                            | `a0af2446e5bce05119163883c5d522c3c44e3a9d1aa5014f468c1feb8dc2cb54` |
| `/usr/lib/gcc/x86_64-alpine-linux-musl/15.2.0/crtbeginS.o` | `libgcc-static 15.2.0-r5`                      | `21cc007ae9682cad220f2bd0c0475e483f6ef12204f65e99c464f6caf7eb0766` |
| `/rust-native/libunwind.a`                                 | Rust `1.97.1` toolchain path and isolated copy | `eb16569e611a5d6cdda2e7604fd6402a3ad810817dd8d63ed50baa2ce8070aaa` |
| `/usr/lib/libc.a`                                          | `musl-dev 1.2.6-r2`                            | `ff0d5e7ac47afd296bb8bad4a67d4b0efbc763298a9fe6a4b1ee3e9d0fc6ec68` |
| `/usr/lib/gcc/x86_64-alpine-linux-musl/15.2.0/crtendS.o`   | `libgcc-static 15.2.0-r5`                      | `55b3c5c22ed779fb9a3ffb3cf9e878eceb9c97cfc6e7f58c0273bacae7ccd54e` |
| `/usr/lib/crtn.o`                                          | `musl-dev 1.2.6-r2`                            | `596ea32e1d1782df9f25f8326013832ca5fe391e26f84382c6731c2a37263260` |

The build also records and independently recovers through the builder SBOM the
reviewed package set: `binutils 2.45.1-r1`, `ca-certificates 20260611-r0`,
`gcc 15.2.0-r5`, `libgcc-static 15.2.0-r5`, `musl 1.2.6-r2`, and
`musl-dev 1.2.6-r2`. It rejects any Rust self-contained CRT, libc, or
`libunwind` path in either linker map and rejects any extra file in the isolated
`/rust-native` directory.

The scratch evidence build exports both release-binary hashes. The hashes of
the binaries subsequently extracted from the loaded runtime image must be byte
identical. Each extracted ELF must be x86-64 static PIE (`ET_DYN`) with no
`PT_INTERP`, `DT_NEEDED`, `TEXTREL`, or writable-and-executable `PT_LOAD`; it
must have one non-executable `GNU_STACK`, one `GNU_RELRO`, `BIND_NOW`, and the
PIE dynamic flag.

This is intentionally a bounded claim. The six system inputs are bound to APK
ownership, exact hashes, linker maps, and the builder's full vulnerability
policy input. The Rust-toolchain `libunwind.a` is bound to the digest-pinned
builder, its exact source path, and identical source/copy hashes, but it has no
independent package/version/CVE identity. Therefore
`native-inventory-coverage.json` permanently records
`completeNativeCompositionClaimed: false`; zero binary-catalog findings never
means absence of native risk.

SQLx uses the locked Rustls/WebPKI trust-root path, so no mutable builder CA
bundle is copied into the runtime.

## Runtime identity, contents, and exact-image smoke

Image inspection must prove `linux/amd64`, numeric non-root `65532:65532`, and
the checked-out OCI revision. `runtime-rootfs-files.txt` retains a sorted
inventory of the final filesystem. It must contain both release binaries and
must not contain a shell, package manager, dynamic loader, glibc, libgcc shared
object, Perl path, or Alpine package database. Static-distroless does retain
dpkg status metadata, so the effective-runtime Syft SBOM is not represented as
package-free. It must contain exactly these five reviewed `deb` identities:
`base-files 13.8+deb13u6`, `media-types 13.0.0`, `netbase 6.5`,
`tzdata 2026b-0+deb13u1`, and `tzdata-legacy 2026b-0+deb13u1`, with no `apk` or
`rpm` artifact. These exact allowlist and executable/path denials are enforced
checks, not assumptions inferred from the base image name.

Both entry points first run without secrets under no network, a read-only root
filesystem, no Linux capabilities, and `no-new-privileges`. Each must reach
application code, emit its exact expected fail-closed configuration error, and
exit `1`; loader failures such as `126` or `127` cannot pass.

The same loaded image then runs against the workflow's already attested
PostgreSQL fixture. Distinct `MIGRATE_DATABASE_URL` and `DATABASE_URL` values
are mandatory:

1. the exact image's migrator runs with the owner URL and must exit `0` with
   empty stdout and stderr;
2. the exact image's API runs with the restricted runtime URL, fixed
   non-production signing keys, read-only root filesystem, no capabilities,
   `no-new-privileges`, and a loopback bind;
3. `/readyz` must return HTTP `200` with both `db` and `realtime` equal to
   `ok`; and
4. the API must stop within ten seconds and exit `0`.

Database credentials and signing seeds are not copied into the bundle. The
retained evidence is the redacted machine summary and, on success, the readiness
response. This proves the CI fixture path for the exact image; it is not target
deployment proof.

Before the image work, the workflow runs the read-only PostgreSQL release
attestor against PostgreSQL 17 with separate owner and runtime connections. A
version-1 result with `status: "pass"` is mandatory. Its redacted JSON and
SHA-256 enter the final evidence manifest; connection URLs and raw database
errors do not.

## Scanner identity, isolation, and four direct inputs

The scanner chain is pinned from each official checksum manifest to the
selected Linux x86-64 archive:

| Tool  | Version | Official checksum-manifest SHA-256                                 | Linux x86-64 archive SHA-256                                       |
| ----- | ------: | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Syft  |  1.44.0 | `fa24ce6cafe6edbdba166414ce79de8142fbc217f8167e418dfb09e5aedfbf4e` | `0e91737aee2b5baf1d255b959630194a302335d848ff97bb07921eb6205b5f5a` |
| Grype | 0.112.0 | `6294bee2e41b4af0c6f603b049b836b8dab25e39dac12343c7b69dfa9e7f1399` | `acb14a030010fe9bdb9594b4ae108d9d14ef2f926d936aa0916dc62c89c058ea` |

The script downloads each official manifest over verified HTTPS, verifies the
complete manifest bytes, requires exactly one matching archive entry, verifies
the archive independently, and retains hashes and version output for the
manifests, archives, and extracted executables.

Every scanner process runs through an `env -i` wrapper with a dedicated `HOME`,
an absolute executable path, and an explicit retained YAML configuration. Syft
uses the checked-in empty mapping `{}`. Grype uses `ignore: []` and
`match-upstream-kernel-headers: true`. This prevents user, repository, and
ambient `SYFT_*`/`GRYPE_*` settings from silently changing the scan.

Syft emits native JSON and SPDX for four independent subjects:

1. the exact builder image;
2. the loaded effective runtime image;
3. the extracted `tradingroom-api` ELF; and
4. the extracted `migrate` ELF.

Each binary scan must independently recover the auditable `tradingroom-api`
Rust crate. Grype then scans all four Syft JSON files directly, producing four
complete JSON reports. The builder is a release-policy input, not merely an
informational observation.

Grype updates and hash/age-validates its database once with a maximum accepted
age of 120 hours. All later status and scan commands disable automatic updates
and update checks. Every report's embedded database status must equal the one
retained `grype-db-status.json`, proving one frozen database identity across all
four reports.

The repository does not rely on `--show-suppressed`: Anchore documents that the
flag affects table output only and has no effect on JSON. JSON always places
filtered rows in `ignoredMatches`. The evaluator therefore fails if
`ignoredMatches` is malformed or non-empty and also rejects active ignore/VEX,
fix-state, wont-fix, distro, platform, exclusion, or update-check filtering in
the report descriptor. See Anchore's
[filter-results contract](https://oss.anchore.com/docs/guides/vulnerability/filter-results/).

## Vulnerability policy

`ops/api-release-vulnerability-policy.json` is the machine authority at
`schemaVersion: 2`, `policyId: "api-release-v2"`:

- every Critical finding blocks regardless of fix state;
- a High finding blocks when a fix is available;
- unfixed High and Medium-or-lower findings remain in the complete reports and
  policy result but are not silently represented as production acceptance; and
- missing, contradictory, or unrecognized severity/fix-state data fails closed.

A reviewed exception must exactly match vulnerability ID, package name,
installed version, package type, severity, fix state, and the complete sorted
set of report basenames in `allowedSources`. It must also name an approver and
rationale and carry a valid, non-expired removal date. A finding appearing in a
new or different report source cannot inherit an existing exception. Duplicate,
malformed, expired, non-blocking, or unused exceptions fail closed; unused
exceptions remain visible in the policy result.

There are currently no API release exceptions. The five informational RustSec
warnings reviewed in `ops/backend-supply-chain-review.md` remain governed
independently by `pnpm backend:advisories`; this image policy neither broadens
nor removes them.

## Retention and explicit limits

The backend workflow uploads the PostgreSQL attestation, Buildx/BuildKit
identity and build metadata, base and final image inspection, final-rootfs
inventory, linker evidence, static-ELF evidence, portable binary hashes,
JSON/SPDX inventories, all four Grype reports, frozen database identity,
scanner/config hashes, smoke results, policy result, and a `SHA256SUMS` manifest
for 30 days through commit-pinned `actions/upload-artifact`. Upload still runs
after scanner/policy or exact-image smoke rejection when partial evidence has
reached the upload step. The image itself is neither pushed nor uploaded.

The builder accepts an evidence directory containing only the mandatory
PostgreSQL attestation. Any other pre-existing entry fails before evidence is
written, preventing stale or self-referential content from entering a new
bundle.

A passing protected run proves the source revision's controlled build,
observed runtime posture and contents, exact-image CI fixture path, crate
composition, bounded system-musl linkage, four-subject scanner policy, and
retained evidence described above. It does **not** prove complete native
composition, registry signature, SLSA provenance, published digest, target
deployment, production credentials, production traffic, long-term archive,
risk acceptance, rollback rehearsal, or disaster recovery. Those remain
separate promotion gates.
