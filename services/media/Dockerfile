# The SFU, built from source and shipped as a single binary.
#
# ## Why the builder stage is this heavy
#
# The `mediasoup` Rust crate is not pure Rust. `mediasoup-sys`'s build script compiles the C++
# worker from source and links it in as a static library, driving the build through Python
# (`invoke`) and Meson, which fetches its own subprojects with git. So the builder needs a C++
# toolchain, Python, and network access - none of which the runtime image needs, because the result
# is one statically-linked-against-libmediasoup binary. That is the significant difference from the
# Node implementation, which ships a separate `mediasoup-worker` executable that has to be found on
# disk at runtime: there is no such file here and nothing to point an env var at.
#
# ## The Python venv is not incidental
#
# `build.rs` runs `python3 -m pip install --target <dir> invoke`. On Debian bookworm the system
# Python is PEP 668 "externally managed" and pip refuses to install into it, which fails the build
# with an error about the environment rather than about mediasoup. A venv sidesteps it properly;
# `PYTHON` is the variable `build.rs` reads to find the interpreter.

FROM rust:1-bookworm@sha256:82150a52ec202c1b14d7817e14516c392bb7f5cfebd88f1ed531cb37ebd39922 AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
      python3 \
      python3-venv \
      python3-pip \
      pkg-config \
      git \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# `mediasoup-sys` generates Rust from the flatbuffers schema and pipes it through rustfmt. The
# official rust image does not ship the rustfmt component, and its absence surfaces as
# "Unable to write the file to rustfmt: Broken pipe" from a build script - which reads like a
# mediasoup problem rather than a missing toolchain component.
RUN rustup component add rustfmt

RUN python3 -m venv /opt/venv
ENV PYTHON=/opt/venv/bin/python3
ENV PATH="/opt/venv/bin:${PATH}"
# Overridable, because where this builds decides what it can afford. Two jobs is right on a build
# host with room; the Hetzner box this deploys to has 2 cores and 1.9GB of RAM, and the C++ worker
# compile is the heaviest thing in the image — two concurrent jobs there push it into swap and, at
# the wrong moment, into the OOM killer, which surfaces as a mediasoup build error rather than as
# what it is. `docker build --build-arg CARGO_BUILD_JOBS=1` on such a host.
ARG CARGO_BUILD_JOBS=2
ENV CARGO_BUILD_JOBS=${CARGO_BUILD_JOBS}

WORKDIR /build

# NOTE: the build context is `services/`, not `services/media`, because this crate is now a
# member of the `services/` Cargo workspace and the lockfile lives at the workspace root.
# Build with:  docker build -f media/Dockerfile services/
#
# Manifests first, so a source-only change does not rebuild the C++ worker - by far the slowest
# part of this image. The dummy main is what lets `cargo build` resolve and compile dependencies
# without any of this crate's own code.
COPY Cargo.toml Cargo.lock rust-toolchain.toml ./
COPY media/Cargo.toml ./media/
COPY api/Cargo.toml ./api/
# The workspace also lists `api`; use its real manifest so `Cargo.lock` remains authoritative,
# but give it a stub main. Building only the media package does not compile the API binary.
RUN mkdir -p media/src api/src \
    && echo 'fn main() {}' > api/src/main.rs \
    && echo 'fn main() {}' > media/src/main.rs \
    && cargo build --locked --release -p tradingroom-media \
    && rm -rf media/src

COPY media/src ./media/src
# cargo skips a rebuild when mtime looks unchanged; the dummy main above shares this path.
RUN touch media/src/main.rs && cargo build --locked --release -p tradingroom-media

# A dependency-free loopback probe keeps Docker health reporting without shipping curl and its
# TLS/LDAP/SSH dependency tree in the production image.
RUN printf '%s\n' 'use std::{io::{Read,Write},net::{SocketAddr,TcpStream},process,time::Duration}; fn main(){let address:SocketAddr="127.0.0.1:4443".parse().unwrap();let mut stream=TcpStream::connect_timeout(&address,Duration::from_secs(2)).unwrap();stream.set_read_timeout(Some(Duration::from_secs(2))).unwrap();stream.write_all(b"GET /health HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n").unwrap();let mut status=[0_u8;12];stream.read_exact(&mut status).unwrap();if &status!=b"HTTP/1.1 200"{process::exit(1)}}' > /tmp/media-healthcheck.rs \
    && rustc -O -o /usr/local/bin/media-healthcheck /tmp/media-healthcheck.rs


FROM gcr.io/distroless/cc-debian13:nonroot@sha256:c31ff9abcb1910f3ab25c7957bdaf0bfe12a01eb546e8df2282f1c8f682b606c AS runtime

# Distroless has no shell or package manager and its named nonroot identity is uid 65532.
USER 65532:65532

COPY --from=builder /build/target/release/tradingroom-media /usr/local/bin/tradingroom-media
COPY --from=builder /usr/local/bin/media-healthcheck /usr/local/bin/media-healthcheck

# Signalling. The RTC range is UDP+TCP and is far too wide to EXPOSE usefully. The current
# host-network deployment and exact firewall contract are recorded in
# `docs/MEDIASOUP-DEPLOYMENT-PLAN.md`; a future orchestrator needs an equivalent network model.
EXPOSE 4443/tcp

ENV MEDIA_BIND_ADDRESS=0.0.0.0:4443 \
    RUST_LOG=info

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD ["/usr/local/bin/media-healthcheck"]

ENTRYPOINT ["/usr/local/bin/tradingroom-media"]
