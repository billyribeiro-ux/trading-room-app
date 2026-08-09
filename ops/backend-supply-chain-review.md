# Backend supply-chain review

Status: **Rust advisory gate implemented; media native dependency blocks production promotion**

Reviewed: **2026-08-02**

Authority: the resolved Rust graph in `services/Cargo.lock`, the native source
inputs selected by that graph, `services/deny.toml`, and the executable gates
`scripts/verify-rust-advisories.mjs` and `pnpm backend:licenses`.

Scope is the complete RustSec-visible Cargo graph, its Cargo license/source
policy, and the specifically traced mediasoup/OpenSSL native path below. This is
not a complete native-component or binary-composition inventory; Cargo license
metadata does not establish the licenses of every independently downloaded Meson
subproject or generated/native artifact.

## RustSec result and exception boundary

`cargo-audit 0.22.1` refreshed the RustSec database to 1,186 advisories and
scanned all 420 packages resolved by `services/Cargo.lock`. It reported zero
registered vulnerabilities and five informational warnings:

| Kind | Advisory | Exact package | Reviewed path |
|---|---|---|---|
| unmaintained | `RUSTSEC-2024-0375` | `atty 0.2.14` | `planus-translation` build dependency of `mediasoup-sys` |
| unmaintained | `RUSTSEC-2024-0384` | `instant 0.1.13` | legacy event-listener graph used by `mediasoup` |
| unmaintained | `RUSTSEC-2024-0436` | `paste 0.1.18` | media H.264 proc-macro graph |
| unsound | `RUSTSEC-2021-0145` | `atty 0.2.14` | Windows-only condition in the same media build dependency |
| unsound | `RUSTSEC-2026-0097` | `rand 0.7.3` | `planus-codegen` build dependency of `mediasoup-sys` |

These are not silently ignored. `pnpm backend:advisories` parses cargo-audit's
JSON, fails on any vulnerability, fails on any added/removed/changed warning,
and proves each excepted package remains transitive through the mediasoup graph.
The hosted backend workflow definition installs the exact scanner version and
runs that gate against a freshly updated advisory database. Hosted run
[`30767258722`](https://github.com/billyribeiro-ux/trading-app-main/actions/runs/30767258722)
passed for exact default-branch revision
`0a97fb1bb375e84e08591e85e6d932d8b503e9b6`; that execution, rather than the
workflow definition alone, is the hosted evidence.

The warnings remain upgrade debt. A new release that removes one must delete its
exception in the same change; a new warning fails CI.

### Registered vulnerability exception — 2026-08-05

The RustSec database update of 2026-08-04 (1,189 advisories) turned the zero
above into one registered vulnerability. No source, lockfile or dependency in
this repository changed; the advisory set moved underneath a static lock.

| Advisory | Exact package | Severity | Patched | Reviewed path |
|---|---|---|---|---|
| `RUSTSEC-2026-0235` | `rkyv 0.7.46` | out-of-bounds read (memory-exposure) | `>=0.8.17` | optional, unenabled feature of `rust_decimal 1.42.1` |

It is excepted only because the crate is **locked but never compiled**, which is
proved rather than asserted:

- `rust_decimal 1.42.1` declares `rkyv ^0.7.46` as an *optional* normal
  dependency. `Cargo.lock` records the resolution of optional dependencies even
  when no enabled feature selects them, and cargo-audit reads the lock, not the
  build graph.
- No manifest in this workspace requests that feature: `rkyv` appears in no
  `services/**/Cargo.toml`.
- `cargo tree --invert rkyv@0.7.46 --edges all --target all` prints nothing —
  the crate is unreachable by every edge kind on every target, including dev and
  build edges.
- `services/target/debug/deps` contains zero `rkyv` artifacts.

It is also not remediable here. `rust_decimal 1.42.1` is already the newest
release, and its `^0.7.46` range is `>=0.7.46, <0.8.0`, which cannot reach the
`>=0.8.17` patch. The fix belongs upstream in `rust_decimal`; until it lands
there is no version of anything this repository controls that removes the entry.

`scripts/verify-rust-advisories.mjs` was extended rather than relaxed. It now
compares the vulnerability set against an exact `advisory:package@version` tuple
in both directions, requires every excepted tuple to carry a matching
unbuilt-crate proof, and re-runs the `cargo tree` reachability check on each one.
The three guards were mutation-proved on 2026-08-05: removing the exception
fails with set drift, removing the proof fails the consistency check, and naming
a genuinely reachable crate (`atty 0.2.14`) fails the reachability check. The
wrapper also now tolerates cargo-audit's exit code 1, which is its normal status
whenever any advisory matches; a run that does not emit parsable JSON still
fails as a tool error.

Two GitHub Dependabot alerts were open on the default branch at the same time,
both low and both already covered by the informational table above:
`GHSA-g98v-hv3f-hcfr` (`atty`, = `RUSTSEC-2021-0145`) and `GHSA-cq8v-f236-94qc`
(`rand 0.7.3`, = `RUSTSEC-2026-0097`). Neither is fixable. `atty`'s newest
published release *is* the affected `0.2.14`, from 2020, and Dependabot reports
no patched version. `rand 0.7.3` is patched at `0.8.6`, but `random_color 0.6.1`
requires `rand ^0.7.3` and `planus-codegen 0.4.0` requires `random_color ^0.6.1`,
so neither can move within semver. Upgrading the SFU does not help either:
`mediasoup 0.25.0`, the newest release, resolves `mediasoup-sys ^0.15.0`, which
pins the identical `planus-codegen ^0.4.0` and `planus-translation ^0.4.0` build
dependencies as the `0.14.2` in use. Both crates are build-time FlatBuffers
codegen tooling that never links into the shipped media binary.

## Resolved Cargo license and source policy

`cargo-deny 0.19.4` passes the complete locked, all-features workspace graph for
licenses, bans, and sources. `services/deny.toml`:

- admits only the explicitly reviewed permissive/license set;
- treats the two unpublished private workspace binaries as product code whose
  distribution license requires a separate legal/product decision;
- denies wildcard dependency versions, which forced the local media contract
  dependency to bind exact workspace version `=0.1.0`;
- denies unknown registries and all Git sources, allowing only crates.io; and
- reports parallel dependency majors as visible upgrade debt rather than
  pretending the legacy mediasoup graph can be collapsed independently.

The backend workflow installs the exact scanner version and runs
`pnpm backend:licenses`. Passing this policy is resolved-Cargo evidence only; it
does not close the native-license and binary-composition gates below.

## Known native production blocker not represented by RustSec

`mediasoup-sys 0.14.2` unconditionally builds and statically links the Meson
subproject declared by its published `subprojects/openssl.wrap`:

- directory/source: OpenSSL `3.0.8`;
- source SHA-256:
  `6c13d2bf38fdf31eac3ce2a347073673f5d63263398f1f69d0df4a41253e4b3e`;
- highest OpenSSL patch available in WrapDB's official release index: `3.0.8-3`.

OpenSSL's official current 3.0 source on 2026-08-02 is `3.0.21`, whose published
tarball SHA-256 is
`617e29af8e421f46649484a4937e48c685e47f46488167c982f88bc4ec1d522f`.
Official 3.0 release notes record security fixes after 3.0.8. The current latest
crates.io releases remain `mediasoup 0.24.3` and `mediasoup-sys 0.14.2`; the
upstream `v3` wrap also remains on 3.0.8. There is therefore no reviewed upstream
upgrade to select, and changing only a tarball beneath a version-specific Meson
patch would be an unaudited fork—not a safe remediation.

Because the library is static, a base-image-only scanner can miss it. The Stage 1
host remains a grant-required, test-only integration environment with no customer
traffic. It runs exact deployed revision `0a97fb1…` as immutable image
`sha256:688418950d09350b78457382ad7ce4189243a0c1073bd47ae0286723d21438a9`.
The historical image's Syft/Grype OCI SBOM and base-image scan did not establish
the version or vulnerability state of statically linked OpenSSL and do not attest
this current image. **The active test image and current source are not eligible
for production promotion.** Gate 5 requires an upstream-supported
mediasoup/native update (preferably onto a currently supported OpenSSL LTS line),
a clean rebuild, binary/native SBOM evidence, and a new vulnerability scan before
any launch claim.

Primary evidence:

- <https://www.openssl.org/source/>
- <https://www.openssl.org/news/openssl-3.0-notes/>
- <https://wrapdb.mesonbuild.com/v2/releases.json>
- <https://crates.io/crates/mediasoup>
- <https://crates.io/crates/mediasoup-sys>

## Commands

```sh
cargo install --locked cargo-audit --version 0.22.1
cargo install --locked cargo-deny --version 0.19.4
pnpm backend:advisories
pnpm backend:licenses
cargo tree --locked --manifest-path services/Cargo.toml \
  --invert mediasoup-sys@0.14.2 --edges normal,build
```

`pnpm backend:advisories` is intentionally separate from both
`pnpm backend:check` and `pnpm quality`. The backend workflow composes the
applicable gates; no single local command above silently proves all of them.

## Open supply-chain promotion gates

- Inventory the complete Meson/native build graph, including transitive source
  archives, patches, generated configuration, and linked-library versions.
- Complete native-license/compliance review and retain reproducible native-source
  provenance.
- Remove the OpenSSL 3.0.8 blocker through a reviewed upstream-supported build.
- Generate a current binary/native SBOM that can observe statically linked
  components; scan both native composition and container OS packages.
- Build the immutable current-source API image and migration artifact. For media,
  the current test image is deployed by digest with rollback retained, but it must
  be rebuilt after native remediation, signed, attached to complete SBOM and
  provenance attestations, deployed by the production path, and rollback-rehearsed.
- Preserve successful hosted/default-branch advisory and backend evidence for
  every promoted revision; initial passing run
  [`30767258722`](https://github.com/billyribeiro-ux/trading-app-main/actions/runs/30767258722)
  covers `0a97fb1…`.

The current local RustSec result is 420 resolved packages, five pinned
informational warnings, and one pinned registered vulnerability that is proved
absent from the build graph, as recorded in the 2026-08-05 subsection above.
The 2026-08-02 zero-vulnerability figure earlier in this document is retained as
the dated result of that run, not as the present state. This gate covers
the Rust lock and RustSec only. It does not replace container OS scanning, native
binary analysis, JavaScript dependency review, image signing, license review, or
provenance attestation, and it cannot override the OpenSSL production block.
