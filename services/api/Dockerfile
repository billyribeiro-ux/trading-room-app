# The API, and the migrator, as two binaries in one image.
#
# ## Why both binaries, and why that is not a privilege leak
#
# `migrate` runs as the **owner** (`ptr_clone`); the server runs as `ptr_clone_app`. Before
# binding, the server requires that exact session/current role, LOGIN, no administrative or
# replication attributes, NOINHERIT, NOBYPASSRLS, and zero memberships. Shipping both binaries
# in one image is safe because the split that matters is the *credential*, not the file: the
# deployment runs `migrate` as a one-shot job with `MIGRATE_DATABASE_URL` set, and the
# long-running server is never given that variable. One image keeps the two in lockstep - a
# migrator from a different build than the server it is preparing the database for is its own
# class of outage.
#
# ## Build context
#
# `services/`, not `services/api`, because the lockfile and the workspace manifest live at the
# workspace root:
#
#   docker build -f api/Dockerfile services/

# The official Alpine variant uses musl as Rust's host target. Pinning the
# multi-platform manifest fixes Rust, Alpine, musl, GCC, and Cargo's build
# environment; the release-evidence job records the resolved x86-64 image and
# exact installed toolchain/package identities.
FROM rust:1.97.1-alpine3.24@sha256:3c38f3f82c2f3d73da3b38e18d279393a04cb43ddded0e35088a8c3324d40900 AS builder

# The repository toolchain file also requests developer-only rustfmt, Clippy,
# and rust-analyzer components. The official image already contains the exact
# compiler/Cargo/std toolchain needed by this release build; selecting it
# explicitly prevents a container build from downloading unused components.
ENV RUSTUP_TOOLCHAIN=1.97.1
ARG TARGETARCH

WORKDIR /build

# Embed the resolved runtime crate graph in each production ELF. Syft/Grype can then inspect the
# binaries actually copied into the image rather than inferring composition from a source lockfile.
# `--locked` uses the package's published lock and Cargo verifies the crates.io source checksums;
# the exact top-level crate checksum is recorded in ops/api-release-artifact-evidence.md.
RUN cargo install --locked cargo-auditable --version '=0.7.5'

# Rust's musl target normally supplies its own CRT and libc archive. That would
# make an Alpine package inventory unrelated to the libc bytes shipped in the
# executable. Disable self-contained linking below so the native compiler uses
# Alpine's rcrt1/libc and GCC CRT objects. Rust std still requires LLVM's
# libunwind ABI, so copy only that one archive from the digest-pinned Rust
# toolchain into an isolated search directory; never add the complete
# self-contained directory, which also contains an unscanned libc.a.
RUN case "${TARGETARCH}" in \
      amd64) rust_target='x86_64-unknown-linux-musl' ;; \
      *) echo "unsupported release architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac \
    && rust_sysroot="$(rustc --print sysroot)" \
    && rust_libunwind="${rust_sysroot}/lib/rustlib/${rust_target}/lib/self-contained/libunwind.a" \
    && crtbegin="$(readlink -f "$(cc -print-file-name=crtbeginS.o)")" \
    && crtend="$(readlink -f "$(cc -print-file-name=crtendS.o)")" \
    && test -f "${rust_libunwind}" \
    && test -f "${crtbegin}" \
    && test -f "${crtend}" \
    && mkdir -p /out /rust-native /release-link-evidence \
    && cp "${rust_libunwind}" /rust-native/libunwind.a \
    && chmod 0444 /rust-native/libunwind.a \
    && test ! -L /rust-native/libunwind.a \
    && test "$(find /rust-native -mindepth 1 -maxdepth 1 | wc -l)" -eq 1 \
    && chmod 0555 /rust-native \
    && printf 'rustTarget=%s\nrustSysroot=%s\nrustLibunwindSource=%s\n' \
         "${rust_target}" "${rust_sysroot}" "${rust_libunwind}" \
         > /release-link-evidence/native-toolchain-input.txt \
    && sha256sum "${rust_libunwind}" /rust-native/libunwind.a \
         > /release-link-evidence/rust-libunwind-sha256.txt \
    && sha256sum \
         /usr/lib/rcrt1.o \
         /usr/lib/crti.o \
         "${crtbegin}" \
         /rust-native/libunwind.a \
         /usr/lib/libc.a \
         "${crtend}" \
         /usr/lib/crtn.o \
         > /release-link-evidence/native-link-input-sha256.txt \
    && { \
         apk info --who-owns /usr/lib/rcrt1.o; \
         apk info --who-owns /usr/lib/crti.o; \
         apk info --who-owns "${crtbegin}"; \
         apk info --who-owns /usr/lib/libc.a; \
         apk info --who-owns "${crtend}"; \
         apk info --who-owns /usr/lib/crtn.o; \
       } > /release-link-evidence/native-link-input-ownership.txt

# Manifests first, so a source-only change reuses the dependency layer. sqlx with rustls pulls in
# `ring`, which is the slow part of this image.
COPY Cargo.toml Cargo.lock rust-toolchain.toml ./
COPY api/Cargo.toml ./api/
COPY media/Cargo.toml ./media/
# The workspace also lists `media`, whose mediasoup dependency compiles the C++ worker from
# source. Preserve its real manifest so `Cargo.lock` remains authoritative, but stub its source:
# dragging the worker into the API image would multiply build time for a production dependency
# this binary never links against.
RUN case "${TARGETARCH}" in \
      amd64) rust_target='x86_64-unknown-linux-musl' ;; \
      *) echo "unsupported release architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac \
    && mkdir -p api/src media/src \
    && echo 'fn main() {}' > media/src/main.rs \
    && echo 'fn main() {}' > api/src/main.rs \
    && base_rustflags='-C target-feature=+crt-static -C relocation-model=pic -C link-self-contained=no -L native=/rust-native' \
    && rm -f /out/release.link.map \
    && RUSTFLAGS="${base_rustflags} -C link-arg=-Wl,-Map=/out/release.link.map" \
       cargo auditable build --locked --release --target "${rust_target}" -p tradingroom-api \
    && test -s /out/release.link.map \
    && rm /out/release.link.map \
    && rm -rf api/src

# `sqlx::migrate!` embeds these at compile time, so they are a build input, not a runtime asset -
# the runtime image below carries no SQL files at all.
COPY api/migrations ./api/migrations
COPY api/src ./api/src
# cargo skips a rebuild when mtime looks unchanged; the dummy main above shares this path.
RUN case "${TARGETARCH}" in \
      amd64) rust_target='x86_64-unknown-linux-musl' ;; \
      *) echo "unsupported release architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac \
    && touch api/src/main.rs \
    && mkdir -p /out \
    && base_rustflags='-C target-feature=+crt-static -C relocation-model=pic -C link-self-contained=no -L native=/rust-native' \
    && canonicalize_native_inputs() { \
         awk '{ \
           for (field = 1; field <= NF; field += 1) { \
             if ($field ~ /^\/.*\/(rcrt1\.o|crti\.o|crtbeginS\.o|libunwind\.a|libc\.a|crtendS\.o|crtn\.o)(\(|$)/) { \
               sub(/\(.*/, "", $field); \
               print $field; \
             } \
           } \
         }' "$1" | while IFS= read -r native_input; do readlink -f "${native_input}"; done | sort -u; \
       } \
    && assert_native_inputs() { \
         test "$(wc -l < "$1")" -eq 7; \
         for exact_input in \
           /usr/lib/rcrt1.o \
           /usr/lib/crti.o \
           /usr/lib/gcc/x86_64-alpine-linux-musl/15.2.0/crtbeginS.o \
           /rust-native/libunwind.a \
           /usr/lib/libc.a \
           /usr/lib/gcc/x86_64-alpine-linux-musl/15.2.0/crtendS.o \
           /usr/lib/crtn.o; do \
           grep -F -x "${exact_input}" "$1" > /dev/null || return 1; \
         done; \
       } \
    && rm -f /out/release.link.map \
    && RUSTFLAGS="${base_rustflags} -C link-arg=-Wl,-Map=/out/release.link.map" \
       cargo auditable build --locked --release --target "${rust_target}" \
         -p tradingroom-api --bin tradingroom-api \
    && cp "target/${rust_target}/release/tradingroom-api" /out/tradingroom-api \
    && test -s /out/release.link.map \
    && ! grep -F '/self-contained/' /out/release.link.map > /dev/null \
    && canonicalize_native_inputs /out/release.link.map \
         > /release-link-evidence/api-native-link-inputs.txt \
    && assert_native_inputs /release-link-evidence/api-native-link-inputs.txt \
    && rm -f /out/release.link.map \
    && RUSTFLAGS="${base_rustflags} -C link-arg=-Wl,-Map=/out/release.link.map" \
       cargo auditable build --locked --release --target "${rust_target}" \
         -p tradingroom-api --bin migrate \
    && cp "target/${rust_target}/release/migrate" /out/migrate \
    && test -s /out/release.link.map \
    && ! grep -F '/self-contained/' /out/release.link.map > /dev/null \
    && canonicalize_native_inputs /out/release.link.map \
         > /release-link-evidence/migrator-native-link-inputs.txt \
    && assert_native_inputs /release-link-evidence/migrator-native-link-inputs.txt \
    && rm /out/release.link.map \
    && test -f /rust-native/libunwind.a \
    && test ! -L /rust-native/libunwind.a \
    && test "$(find /rust-native -mindepth 1 -maxdepth 1 | wc -l)" -eq 1 \
    && test "$(sha256sum /rust-native/libunwind.a | awk '{ print $1 }')" = \
         'eb16569e611a5d6cdda2e7604fd6402a3ad810817dd8d63ed50baa2ce8070aaa' \
    && cd /out \
    && sha256sum tradingroom-api migrate \
         > /release-link-evidence/builder-native-binary-sha256.txt


# Export linker/native-input evidence through an explicit non-runtime target.
# The release job builds this target and the runtime from the same cached builder
# result, then compares the exported and extracted executable hashes.
FROM scratch AS release-link-evidence

COPY --from=builder /release-link-evidence/ /

# Both release binaries are static musl ELFs. The pinned static-distroless
# runtime therefore needs no dynamic loader, glibc, libgcc, Perl, shell, or
# package manager. The release job proves the static boundary with readelf and
# controlled execution before scanning the effective image and each binary.
# SQLx uses the lockfile-pinned rustls/webpki root store, so no builder-owned CA
# file is copied into this stage.
FROM gcr.io/distroless/static-debian13:nonroot@sha256:f7f8f729987ad0fdf6b05eeeae94b26e6a0f613bdf46feea7fc40f7bd72953e6 AS runtime

# Distroless's nonroot identity is uid/gid 65532. Keep it numeric so the
# runtime contract does not depend on passwd/group name resolution.
USER 65532:65532

COPY --from=builder /out/tradingroom-api /usr/local/bin/tradingroom-api
COPY --from=builder /out/migrate /usr/local/bin/migrate

EXPOSE 8080/tcp

ENV BIND_ADDRESS=0.0.0.0:8080 \
    RUST_LOG=info,sqlx=warn

ENTRYPOINT ["/usr/local/bin/tradingroom-api"]
