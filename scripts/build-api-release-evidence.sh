#!/usr/bin/env bash

# Build and inspect the API release image without publishing it, then preserve
# OCI/runtime and compiled-binary supply-chain evidence. This script is Linux
# x86-64 only because every downloaded scanner archive is pinned for that exact
# CI platform.

set -euo pipefail
umask 077

SYFT_VERSION="1.44.0"
SYFT_CHECKSUM_MANIFEST_SHA256="fa24ce6cafe6edbdba166414ce79de8142fbc217f8167e418dfb09e5aedfbf4e"
SYFT_ARCHIVE_SHA256="0e91737aee2b5baf1d255b959630194a302335d848ff97bb07921eb6205b5f5a"
GRYPE_VERSION="0.112.0"
GRYPE_CHECKSUM_MANIFEST_SHA256="6294bee2e41b4af0c6f603b049b836b8dab25e39dac12343c7b69dfa9e7f1399"
GRYPE_ARCHIVE_SHA256="acb14a030010fe9bdb9594b4ae108d9d14ef2f926d936aa0916dc62c89c058ea"
BUILDX_VERSION="0.34.1"
BUILDKIT_VERSION="v0.31.2"
BUILDX_BUILDER="api-release-builder"
BUILDER_IMAGE="rust:1.97.1-alpine3.24@sha256:3c38f3f82c2f3d73da3b38e18d279393a04cb43ddded0e35088a8c3324d40900"
RUNTIME_BASE_IMAGE="gcr.io/distroless/static-debian13:nonroot@sha256:f7f8f729987ad0fdf6b05eeeae94b26e6a0f613bdf46feea7fc40f7bd72953e6"
RUST_SYSROOT="/usr/local/rustup/toolchains/1.97.1-x86_64-unknown-linux-musl"
RUST_LIBUNWIND_SOURCE="${RUST_SYSROOT}/lib/rustlib/x86_64-unknown-linux-musl/lib/self-contained/libunwind.a"
RCRT1_SHA256="5e93abc3f181bdb1b177e8725dbad7c08ddf2dc5d94d47d593a34a7a4cba1df5"
CRTI_SHA256="a0af2446e5bce05119163883c5d522c3c44e3a9d1aa5014f468c1feb8dc2cb54"
CRTBEGIN_SHA256="21cc007ae9682cad220f2bd0c0475e483f6ef12204f65e99c464f6caf7eb0766"
LIBUNWIND_SHA256="eb16569e611a5d6cdda2e7604fd6402a3ad810817dd8d63ed50baa2ce8070aaa"
LIBC_SHA256="ff0d5e7ac47afd296bb8bad4a67d4b0efbc763298a9fe6a4b1ee3e9d0fc6ec68"
CRTEND_SHA256="55b3c5c22ed779fb9a3ffb3cf9e878eceb9c97cfc6e7f58c0273bacae7ccd54e"
CRTN_SHA256="596ea32e1d1782df9f25f8326013832ca5fe391e26f84382c6731c2a37263260"

readonly SYFT_VERSION SYFT_CHECKSUM_MANIFEST_SHA256 SYFT_ARCHIVE_SHA256
readonly GRYPE_VERSION GRYPE_CHECKSUM_MANIFEST_SHA256 GRYPE_ARCHIVE_SHA256
readonly BUILDX_VERSION BUILDKIT_VERSION BUILDX_BUILDER
readonly BUILDER_IMAGE RUNTIME_BASE_IMAGE
readonly RUST_SYSROOT RUST_LIBUNWIND_SOURCE
readonly RCRT1_SHA256 CRTI_SHA256 CRTBEGIN_SHA256 LIBUNWIND_SHA256 LIBC_SHA256 CRTEND_SHA256 CRTN_SHA256

fail() {
	printf '[backend:release-artifact] ERROR: %s\n' "$*" >&2
	exit 1
}

require_command() {
	command -v "$1" >/dev/null 2>&1 || fail "required command is unavailable: $1"
}

for required_command in awk basename curl date docker env find git grep install jq node readelf sha256sum sleep sort tar uname wc xargs; do
	require_command "${required_command}"
done

[[ "$(uname -s)" == "Linux" ]] || fail "scanner archives are pinned for Linux only"
[[ "$(uname -m)" == "x86_64" ]] || fail "scanner archives are pinned for x86_64 only"

repository_root="${GITHUB_WORKSPACE:-$(git rev-parse --show-toplevel)}"
runner_temp="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"
source_revision="${GITHUB_SHA:-$(git -C "${repository_root}" rev-parse HEAD)}"

[[ "${source_revision}" =~ ^[0-9a-f]{40}$ ]] || fail "source revision must be a full lowercase Git SHA"
[[ "$(git -C "${repository_root}" rev-parse HEAD)" == "${source_revision}" ]] ||
	fail "checked-out revision does not match GITHUB_SHA"
[[ -z "$(git -C "${repository_root}" status --porcelain --untracked-files=all)" ]] ||
	fail "release evidence requires a clean checkout"

tool_root="${runner_temp}/api-release-tools"
evidence_root="${repository_root}/release-evidence/api-${source_revision}"
native_root="${evidence_root}/native"
native_link_root="${evidence_root}/native-link"
scanner_config_root="${evidence_root}/scanner-config"
scanner_home="${tool_root}/home"
image_reference="tradingroom-api:${source_revision}"
postgres_attestation="${evidence_root}/postgres-release-attestation.json"

[[ -d "${evidence_root}" && ! -L "${evidence_root}" ]] ||
	fail "the release-evidence directory must already exist as a real directory"
[[ -f "${postgres_attestation}" && ! -L "${postgres_attestation}" ]] ||
	fail "the redacted PostgreSQL release attestation is missing"
unexpected_evidence_entry="$(
	find "${evidence_root}" -mindepth 1 -maxdepth 1 \
		! -name 'postgres-release-attestation.json' -print -quit
)"
[[ -z "${unexpected_evidence_entry}" ]] ||
	fail "release evidence already exists for this revision; refusing to mix stale and current evidence"

install -d -m 0755 "${tool_root}/syft" "${tool_root}/grype" "${native_root}"
install -d -m 0700 "${scanner_home}" "${scanner_config_root}"
for source_config in \
	"${repository_root}/ops/syft-release.yaml" \
	"${repository_root}/ops/grype-release.yaml"; do
	[[ -f "${source_config}" && ! -L "${source_config}" ]] ||
		fail "scanner config must be a regular, versioned file: ${source_config}"
done
install -m 0600 "${repository_root}/ops/syft-release.yaml" "${scanner_config_root}/syft-release.yaml"
install -m 0600 "${repository_root}/ops/grype-release.yaml" "${scanner_config_root}/grype-release.yaml"
syft_config="${scanner_config_root}/syft-release.yaml"
grype_config="${scanner_config_root}/grype-release.yaml"
readonly syft_config grype_config

jq --exit-status \
	'.attestation_version == 1 and .status == "pass"' \
	"${postgres_attestation}" >/dev/null ||
	fail "the PostgreSQL release attestation is malformed or did not pass"

[[ -n "${MIGRATE_DATABASE_URL:-}" ]] ||
	fail "MIGRATE_DATABASE_URL is required for the exact-image migrator smoke"
[[ -n "${DATABASE_URL:-}" ]] ||
	fail "DATABASE_URL is required for the exact-image API readiness smoke"
[[ "${MIGRATE_DATABASE_URL}" != "${DATABASE_URL}" ]] ||
	fail "migration-owner and runtime-role connection URLs must remain distinct"

download_and_verify() {
	local url="$1"
	local output="$2"
	local expected_sha256="$3"

	curl --fail --silent --show-error --location \
		--retry 3 --retry-all-errors --proto '=https' --tlsv1.2 \
		--output "${output}" "${url}"
	printf '%s  %s\n' "${expected_sha256}" "${output}" | sha256sum --check --strict
}

verify_manifest_archive_entry() {
	local manifest="$1"
	local archive_name="$2"
	local expected_sha256="$3"
	local manifest_sha256

	manifest_sha256="$(
		awk -v target="${archive_name}" \
			'$2 == target { matches += 1; checksum = $1 } END { if (matches == 1) print checksum; else exit 1 }' \
			"${manifest}"
	)" || fail "official checksum manifest must contain exactly one entry for ${archive_name}"
	[[ "${manifest_sha256}" =~ ^[0-9a-f]{64}$ ]] ||
		fail "official checksum manifest contains an invalid SHA-256 for ${archive_name}"
	[[ "${manifest_sha256}" == "${expected_sha256}" ]] ||
		fail "official checksum manifest disagrees with the pinned SHA-256 for ${archive_name}"
}

syft_manifest="${tool_root}/syft_${SYFT_VERSION}_checksums.txt"
syft_archive="${tool_root}/syft_${SYFT_VERSION}_linux_amd64.tar.gz"
grype_manifest="${tool_root}/grype_${GRYPE_VERSION}_checksums.txt"
grype_archive="${tool_root}/grype_${GRYPE_VERSION}_linux_amd64.tar.gz"

download_and_verify \
	"https://github.com/anchore/syft/releases/download/v${SYFT_VERSION}/syft_${SYFT_VERSION}_checksums.txt" \
	"${syft_manifest}" \
	"${SYFT_CHECKSUM_MANIFEST_SHA256}"
verify_manifest_archive_entry \
	"${syft_manifest}" \
	"$(basename "${syft_archive}")" \
	"${SYFT_ARCHIVE_SHA256}"
download_and_verify \
	"https://github.com/anchore/syft/releases/download/v${SYFT_VERSION}/syft_${SYFT_VERSION}_linux_amd64.tar.gz" \
	"${syft_archive}" \
	"${SYFT_ARCHIVE_SHA256}"
download_and_verify \
	"https://github.com/anchore/grype/releases/download/v${GRYPE_VERSION}/grype_${GRYPE_VERSION}_checksums.txt" \
	"${grype_manifest}" \
	"${GRYPE_CHECKSUM_MANIFEST_SHA256}"
verify_manifest_archive_entry \
	"${grype_manifest}" \
	"$(basename "${grype_archive}")" \
	"${GRYPE_ARCHIVE_SHA256}"
download_and_verify \
	"https://github.com/anchore/grype/releases/download/v${GRYPE_VERSION}/grype_${GRYPE_VERSION}_linux_amd64.tar.gz" \
	"${grype_archive}" \
	"${GRYPE_ARCHIVE_SHA256}"

tar --extract --gzip --file "${syft_archive}" --directory "${tool_root}/syft" syft
tar --extract --gzip --file "${grype_archive}" --directory "${tool_root}/grype" grype
chmod 0755 "${tool_root}/syft/syft" "${tool_root}/grype/grype"

# Every scanner process starts from an empty environment. Explicit config files
# outrank auto-discovered user/repository files; env -i also prevents higher-
# precedence SYFT_*/GRYPE_* variables from silently suppressing catalogers or
# vulnerability matches.
run_syft() {
	env -i \
		HOME="${scanner_home}" \
		PATH=/usr/bin:/bin \
		TMPDIR="${runner_temp}" \
		SYFT_CHECK_FOR_APP_UPDATE=false \
		SYFT_FILE_METADATA_SELECTION=all \
		"${tool_root}/syft/syft" --config "${syft_config}" "$@"
}

run_grype_update() {
	env -i \
		HOME="${scanner_home}" \
		PATH=/usr/bin:/bin \
		TMPDIR="${runner_temp}" \
		GRYPE_CHECK_FOR_APP_UPDATE=false \
		GRYPE_DB_AUTO_UPDATE=true \
		GRYPE_DB_REQUIRE_UPDATE_CHECK=true \
		GRYPE_DB_VALIDATE_BY_HASH_ON_START=true \
		GRYPE_DB_MAX_ALLOWED_BUILT_AGE=120h \
		"${tool_root}/grype/grype" --config "${grype_config}" "$@"
}

run_grype() {
	env -i \
		HOME="${scanner_home}" \
		PATH=/usr/bin:/bin \
		TMPDIR="${runner_temp}" \
		GRYPE_CHECK_FOR_APP_UPDATE=false \
		GRYPE_DB_AUTO_UPDATE=false \
		GRYPE_DB_REQUIRE_UPDATE_CHECK=false \
		GRYPE_DB_VALIDATE_BY_HASH_ON_START=true \
		GRYPE_DB_MAX_ALLOWED_BUILT_AGE=120h \
		"${tool_root}/grype/grype" --config "${grype_config}" "$@"
}

(
	cd "${tool_root}"
	sha256sum \
		"syft_${SYFT_VERSION}_checksums.txt" \
		"syft_${SYFT_VERSION}_linux_amd64.tar.gz" \
		"grype_${GRYPE_VERSION}_checksums.txt" \
		"grype_${GRYPE_VERSION}_linux_amd64.tar.gz" \
		syft/syft \
		grype/grype >"${evidence_root}/scanner-sha256.txt"
)
(
	cd "${evidence_root}"
	sha256sum \
		scanner-config/syft-release.yaml \
		scanner-config/grype-release.yaml \
		>scanner-config-sha256.txt
)

run_syft version | tee "${evidence_root}/syft-version.txt"
run_grype version | tee "${evidence_root}/grype-version.txt"
[[ "$(awk '$1 == "Version:" { print $2; exit }' "${evidence_root}/syft-version.txt")" == "${SYFT_VERSION}" ]] ||
	fail "unexpected Syft version"
[[ "$(awk '$1 == "Version:" { print $2; exit }' "${evidence_root}/grype-version.txt")" == "${GRYPE_VERSION}" ]] ||
	fail "unexpected Grype version"

git -C "${repository_root}" show -s --format='commit=%H%ntree=%T%ncommitted_at=%cI' "${source_revision}" \
	>"${evidence_root}/source-revision.txt"

docker buildx version | tee "${evidence_root}/docker-buildx-version.txt"
[[ "$(awk '$1 == "github.com/docker/buildx" { print $2; exit }' "${evidence_root}/docker-buildx-version.txt")" == "v${BUILDX_VERSION}" ]] ||
	fail "unexpected Docker Buildx version"
docker buildx inspect --bootstrap "${BUILDX_BUILDER}" | tee "${evidence_root}/docker-buildx-builder.txt"
awk -v expected_buildkit="${BUILDKIT_VERSION}" '
	$1 == "Driver:" && $2 == "docker-container" { driver = 1 }
	$1 == "Status:" && $2 == "running" { running = 1 }
	$1 == "BuildKit" && $2 == "version:" && $3 == expected_buildkit { buildkit = 1 }
	$1 == "Platforms:" && $0 ~ /(^|[[:space:],])linux\/amd64(\*|[[:space:],\/]|$)/ { amd64 = 1 }
	END { exit !(driver && running && buildkit && amd64) }
' "${evidence_root}/docker-buildx-builder.txt" ||
	fail "Buildx builder must use the running docker-container driver, ${BUILDKIT_VERSION}, and linux/amd64"

# Pull and retain the two immutable base manifests independently of BuildKit's
# cache. The builder probe is read-only and networkless; it records the native
# libc/toolchain that becomes embedded in the static ELFs, a boundary an
# effective-runtime-filesystem scan cannot reconstruct by itself.
docker pull --platform linux/amd64 "${BUILDER_IMAGE}" >/dev/null
docker pull --platform linux/amd64 "${RUNTIME_BASE_IMAGE}" >/dev/null
docker image inspect "${BUILDER_IMAGE}" >"${evidence_root}/builder-image-inspect.json"
docker image inspect "${RUNTIME_BASE_IMAGE}" >"${evidence_root}/runtime-base-image-inspect.json"

docker run --rm --platform linux/amd64 --network none --read-only --cap-drop ALL \
	--security-opt no-new-privileges --entrypoint /bin/sh "${BUILDER_IMAGE}" -ec '
		rustc --version --verbose
		cargo --version --verbose
		cc --version
		apk info --version
	' >"${evidence_root}/builder-toolchain.txt"

docker run --rm --platform linux/amd64 --network none --read-only --cap-drop ALL \
	--security-opt no-new-privileges --entrypoint /sbin/apk "${BUILDER_IMAGE}" \
	info --from installed --format json --fields name,version \
	musl musl-dev gcc libgcc-static binutils ca-certificates \
	>"${evidence_root}/builder-packages.json"

grep --fixed-strings --line-regexp 'release: 1.97.1' "${evidence_root}/builder-toolchain.txt" >/dev/null ||
	fail "builder evidence does not report Rust 1.97.1"
grep --fixed-strings --line-regexp 'host: x86_64-unknown-linux-musl' "${evidence_root}/builder-toolchain.txt" >/dev/null ||
	fail "builder evidence does not report the x86-64 musl host"
jq --exit-status '
	sort_by(.name) == [
		{ "name": "binutils", "version": "2.45.1-r1" },
		{ "name": "ca-certificates", "version": "20260611-r0" },
		{ "name": "gcc", "version": "15.2.0-r5" },
		{ "name": "libgcc-static", "version": "15.2.0-r5" },
		{ "name": "musl", "version": "1.2.6-r2" },
		{ "name": "musl-dev", "version": "1.2.6-r2" }
	]
' "${evidence_root}/builder-packages.json" >/dev/null ||
	fail "builder evidence does not report the exact reviewed native toolchain package set"

# Export the builder-generated native linkage ledger without putting maps,
# package ownership data, or toolchain paths into the runtime filesystem. The
# subsequent runtime build reuses this exact immutable builder result.
docker buildx build --builder "${BUILDX_BUILDER}" --pull --platform linux/amd64 \
	--file "${repository_root}/services/api/Dockerfile" \
	--target release-link-evidence \
	--metadata-file "${evidence_root}/native-link-build-metadata.json" \
	--output "type=local,dest=${native_link_root}" \
	"${repository_root}/services"

jq --exit-status --arg prefix "${BUILDX_BUILDER}/" \
	'.["buildx.build.ref"] | type == "string" and startswith($prefix)' \
	"${evidence_root}/native-link-build-metadata.json" >/dev/null ||
	fail "native-link evidence was not built by the inspected Buildx builder"

for required_link_evidence in \
	api-native-link-inputs.txt \
	builder-native-binary-sha256.txt \
	migrator-native-link-inputs.txt \
	native-link-input-ownership.txt \
	native-link-input-sha256.txt \
	native-toolchain-input.txt \
	rust-libunwind-sha256.txt; do
	[[ -f "${native_link_root}/${required_link_evidence}" && ! -L "${native_link_root}/${required_link_evidence}" ]] ||
		fail "builder did not export ${required_link_evidence}"
done

expected_link_evidence="$(
	printf '%s\n' \
		api-native-link-inputs.txt \
		builder-native-binary-sha256.txt \
		migrator-native-link-inputs.txt \
		native-link-input-ownership.txt \
		native-link-input-sha256.txt \
		native-toolchain-input.txt \
		rust-libunwind-sha256.txt
)"
actual_link_evidence="$(find "${native_link_root}" -mindepth 1 -maxdepth 1 -printf '%f\n' | sort)"
[[ "${actual_link_evidence}" == "${expected_link_evidence}" ]] ||
	fail "scratch target exported an unexpected native-link evidence set"

for link_inputs in api-native-link-inputs.txt migrator-native-link-inputs.txt; do
	[[ "$(wc -l <"${native_link_root}/${link_inputs}")" -eq 7 ]] ||
		fail "${link_inputs} must contain exactly seven native inputs"
	for required_input in \
		/usr/lib/rcrt1.o \
		/usr/lib/crti.o \
		/usr/lib/gcc/x86_64-alpine-linux-musl/15.2.0/crtbeginS.o \
		/rust-native/libunwind.a \
		/usr/lib/libc.a \
		/usr/lib/gcc/x86_64-alpine-linux-musl/15.2.0/crtendS.o \
		/usr/lib/crtn.o; do
		grep --fixed-strings --line-regexp "${required_input}" "${native_link_root}/${link_inputs}" >/dev/null ||
			fail "${link_inputs} does not prove exact linkage of ${required_input}"
	done
done

[[ "$(wc -l <"${native_link_root}/native-link-input-ownership.txt")" -eq 6 ]] ||
	fail "native ownership evidence must contain exactly six package-owned inputs"
for expected_native_owner in \
	'/usr/lib/rcrt1.o is owned by musl-dev-1.2.6-r2' \
	'/usr/lib/crti.o is owned by musl-dev-1.2.6-r2' \
	'/usr/lib/gcc/x86_64-alpine-linux-musl/15.2.0/crtbeginS.o is owned by libgcc-static-15.2.0-r5' \
	'/usr/lib/libc.a is owned by musl-dev-1.2.6-r2' \
	'/usr/lib/gcc/x86_64-alpine-linux-musl/15.2.0/crtendS.o is owned by libgcc-static-15.2.0-r5' \
	'/usr/lib/crtn.o is owned by musl-dev-1.2.6-r2'; do
	grep --fixed-strings --line-regexp "${expected_native_owner}" \
		"${native_link_root}/native-link-input-ownership.txt" >/dev/null ||
		fail "native ownership evidence does not contain ${expected_native_owner}"
done
[[ "$(wc -l <"${native_link_root}/native-toolchain-input.txt")" -eq 3 ]] ||
	fail "native toolchain evidence must contain exactly three source facts"
for expected_toolchain_fact in \
	'rustTarget=x86_64-unknown-linux-musl' \
	"rustSysroot=${RUST_SYSROOT}" \
	"rustLibunwindSource=${RUST_LIBUNWIND_SOURCE}"; do
	grep --fixed-strings --line-regexp "${expected_toolchain_fact}" \
		"${native_link_root}/native-toolchain-input.txt" >/dev/null ||
		fail "native toolchain evidence does not contain ${expected_toolchain_fact}"
done
[[ "$(wc -l <"${native_link_root}/rust-libunwind-sha256.txt")" -eq 2 ]] ||
	fail "Rust libunwind evidence must contain exactly source and isolated-copy hashes"
for expected_libunwind_hash in \
	"${LIBUNWIND_SHA256}  ${RUST_LIBUNWIND_SOURCE}" \
	"${LIBUNWIND_SHA256}  /rust-native/libunwind.a"; do
	grep --fixed-strings --line-regexp "${expected_libunwind_hash}" \
		"${native_link_root}/rust-libunwind-sha256.txt" >/dev/null ||
		fail "Rust libunwind evidence does not contain ${expected_libunwind_hash}"
done
[[ "$(wc -l <"${native_link_root}/native-link-input-sha256.txt")" -eq 7 ]] ||
	fail "native linkage hash evidence must contain exactly seven inputs"
for expected_native_input in \
	"${RCRT1_SHA256}  /usr/lib/rcrt1.o" \
	"${CRTI_SHA256}  /usr/lib/crti.o" \
	"${CRTBEGIN_SHA256}  /usr/lib/gcc/x86_64-alpine-linux-musl/15.2.0/crtbeginS.o" \
	"${LIBUNWIND_SHA256}  /rust-native/libunwind.a" \
	"${LIBC_SHA256}  /usr/lib/libc.a" \
	"${CRTEND_SHA256}  /usr/lib/gcc/x86_64-alpine-linux-musl/15.2.0/crtendS.o" \
	"${CRTN_SHA256}  /usr/lib/crtn.o"; do
	grep --fixed-strings --line-regexp "${expected_native_input}" \
		"${native_link_root}/native-link-input-sha256.txt" >/dev/null ||
		fail "native linkage evidence does not contain exact reviewed input ${expected_native_input}"
done

docker buildx build --builder "${BUILDX_BUILDER}" --pull --platform linux/amd64 --load \
	--file "${repository_root}/services/api/Dockerfile" \
	--target runtime \
	--metadata-file "${evidence_root}/runtime-build-metadata.json" \
	--label org.opencontainers.image.revision="${source_revision}" \
	--label org.opencontainers.image.source="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-local/trading-app-main}" \
	--tag "${image_reference}" \
	"${repository_root}/services"

docker image inspect "${image_reference}" >"${evidence_root}/image-inspect.json"
docker image history --no-trunc "${image_reference}" >"${evidence_root}/image-history.txt"

jq --exit-status --arg prefix "${BUILDX_BUILDER}/" \
	'.["buildx.build.ref"] | type == "string" and startswith($prefix)' \
	"${evidence_root}/runtime-build-metadata.json" >/dev/null ||
	fail "runtime image was not built by the inspected Buildx builder"
image_id="$(docker image inspect --format '{{.Id}}' "${image_reference}")"
runtime_config_digest="$(jq --raw-output '.["containerimage.config.digest"] // empty' "${evidence_root}/runtime-build-metadata.json")"
[[ "${runtime_config_digest}" == "${image_id}" ]] ||
	fail "loaded runtime image config digest differs from Buildx metadata"
image_platform="$(docker image inspect --format '{{.Os}}/{{.Architecture}}' "${image_reference}")"
[[ "${image_platform}" == "linux/amd64" ]] ||
	fail "runtime image platform must be linux/amd64, got ${image_platform:-<empty>}"

configured_user="$(docker image inspect --format '{{.Config.User}}' "${image_reference}")"
[[ "${configured_user}" == "65532:65532" ]] ||
	fail "runtime image user must be 65532:65532, got ${configured_user:-<empty>}"
image_revision="$(docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "${image_reference}")"
[[ "${image_revision}" == "${source_revision}" ]] || fail "image source revision label does not match checkout"

runtime_uid="${configured_user%%:*}"
runtime_gid="${configured_user##*:}"
[[ "${runtime_uid}" =~ ^[0-9]+$ ]] || fail "runtime UID is not numeric"
[[ "${runtime_gid}" =~ ^[0-9]+$ ]] || fail "runtime GID is not numeric"
[[ "${runtime_uid}" != "0" ]] || fail "runtime image executes as root"
[[ "${runtime_gid}" != "0" ]] || fail "runtime image executes with root as its primary group"

container_id=""
smoke_container_id=""
runtime_rootfs_tar=""
cleanup() {
	if [[ -n "${container_id:-}" ]]; then
		docker rm --force "${container_id}" >/dev/null 2>&1 || true
	fi
	if [[ -n "${smoke_container_id:-}" ]]; then
		docker rm --force "${smoke_container_id}" >/dev/null 2>&1 || true
	fi
	if [[ -n "${runtime_rootfs_tar:-}" ]]; then
		rm -f "${runtime_rootfs_tar}"
	fi
	for ephemeral_smoke_file in \
		"${smoke_migrator_stdout:-}" \
		"${smoke_migrator_stderr:-}" \
		"${smoke_api_stderr:-}" \
		"${smoke_ready_body:-}"; do
		if [[ -n "${ephemeral_smoke_file}" ]]; then
			rm -f "${ephemeral_smoke_file}"
		fi
	done
	if [[ -n "${smoke_api_stderr:-}" ]]; then
		rm -f "${smoke_api_stderr}.curl" "${smoke_api_stderr}.stop"
	fi
}
trap cleanup EXIT

probe_runtime_binary() {
	local binary_name="$1"
	local evidence_name="$2"
	local expected_stderr="$3"
	local stdout_path="${evidence_root}/${evidence_name}.stdout.txt"
	local stderr_path="${evidence_root}/${evidence_name}.stderr.txt"
	local status

	set +e
	docker run --rm --platform linux/amd64 --network none --read-only --cap-drop ALL \
		--security-opt no-new-privileges --env RUST_LOG=off \
		--entrypoint "/usr/local/bin/${binary_name}" "${image_reference}" \
		>"${stdout_path}" 2>"${stderr_path}"
	status=$?
	set -e

	[[ "${status}" -eq 1 ]] ||
		fail "${binary_name} controlled probe must reach application code and exit 1, got ${status}"
	[[ ! -s "${stdout_path}" ]] || fail "${binary_name} controlled probe wrote unexpected stdout"
	[[ "$(<"${stderr_path}")" == "${expected_stderr}" ]] ||
		fail "${binary_name} controlled probe returned unexpected stderr"
}

probe_runtime_binary \
	"tradingroom-api" \
	"runtime-api-probe" \
	"startup failed: missing required environment variable(s): DATABASE_URL, AUTH_TOKEN_PRIVATE_KEY, MEDIA_GRANT_PRIVATE_KEY, TRUSTED_WEB_ORIGIN"
probe_runtime_binary \
	"migrate" \
	"runtime-migrator-probe" \
	"migrate failed: set MIGRATE_DATABASE_URL (preferred) or DATABASE_URL to the owner's connection string"

jq --null-input \
	--arg imageReference "${image_reference}" \
	'{
		schemaVersion: 1,
		constraints: {
			network: "none",
			rootFilesystem: "read-only",
			linuxCapabilities: "none",
			noNewPrivileges: true,
			secretsSupplied: false
		},
		probes: [
			{ binary: "tradingroom-api", expectedExitCode: 1, result: "pass" },
			{ binary: "migrate", expectedExitCode: 1, result: "pass" }
		],
		imageReference: $imageReference
	}' >"${evidence_root}/runtime-probes.json"

# The controlled probes above prove that both entry points load and fail closed.
# This positive smoke uses the workflow's already attested PostgreSQL fixture to
# prove the exact image can also run the migrator, assert the restricted runtime
# role, establish LISTEN, bind, serve /readyz, and shut down cleanly. Credentials
# and signing seeds are never written to the evidence bundle.
smoke_migrator_stdout="${runner_temp}/api-release-migrator-${source_revision}.stdout"
smoke_migrator_stderr="${runner_temp}/api-release-migrator-${source_revision}.stderr"
smoke_api_stderr="${runner_temp}/api-release-api-${source_revision}.stderr"
smoke_ready_body="${runner_temp}/api-release-readyz-${source_revision}.json"

set +e
docker run --rm --platform linux/amd64 --network host --read-only --cap-drop ALL \
	--security-opt no-new-privileges --pids-limit 128 \
	--env MIGRATE_DATABASE_URL --env RUST_LOG=off \
	--entrypoint /usr/local/bin/migrate "${image_reference}" \
	>"${smoke_migrator_stdout}" 2>"${smoke_migrator_stderr}"
migrator_smoke_exit=$?
set -e

migrator_output_clean=false
if [[ ! -s "${smoke_migrator_stdout}" && ! -s "${smoke_migrator_stderr}" ]]; then
	migrator_output_clean=true
fi

smoke_port="$(
	node --input-type=module --eval '
		import { createServer } from "node:net";
		const server = createServer();
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			if (address === null || typeof address === "string") process.exit(1);
			process.stdout.write(`${address.port}\n`);
			server.close();
		});
	'
)"
[[ "${smoke_port}" =~ ^[0-9]+$ ]] || fail "could not allocate a loopback smoke-test port"

smoke_container_name="api-release-smoke-${source_revision:0:12}-$$"
api_start_exit=1
api_stop_exit=1
api_process_exit=-1
api_ready=false
ready_http_code="000"

set +e
smoke_container_id="$(
	docker run --detach --platform linux/amd64 --name "${smoke_container_name}" \
		--network host --read-only --cap-drop ALL --security-opt no-new-privileges \
		--pids-limit 256 \
		--env DATABASE_URL \
		--env AUTH_TOKEN_PRIVATE_KEY=AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE= \
		--env MEDIA_GRANT_PRIVATE_KEY=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= \
		--env TRUSTED_WEB_ORIGIN=https://release-smoke.invalid \
		--env BIND_ADDRESS="127.0.0.1:${smoke_port}" \
		--env DB_POOL_MAX=2 \
		--env TRUSTED_PROXY_HOPS=0 \
		--env RUST_LOG=off \
		"${image_reference}" 2>"${smoke_api_stderr}"
)"
api_start_exit=$?
set -e

if [[ "${api_start_exit}" -eq 0 ]]; then
	for ((attempt = 1; attempt <= 30; attempt += 1)); do
		set +e
		ready_http_code="$(
			curl --silent --show-error --max-time 2 --noproxy '*' \
				--output "${smoke_ready_body}" --write-out '%{http_code}' \
				"http://127.0.0.1:${smoke_port}/readyz" 2>"${smoke_api_stderr}.curl"
		)"
		curl_exit=$?
		set -e
		if [[ "${curl_exit}" -eq 0 && "${ready_http_code}" == "200" ]] &&
			jq --exit-status '.db == "ok" and .realtime == "ok"' "${smoke_ready_body}" >/dev/null; then
			api_ready=true
			break
		fi
		if [[ "$(docker inspect --format '{{.State.Running}}' "${smoke_container_id}")" != "true" ]]; then
			break
		fi
		sleep 1
	done

	set +e
	docker stop --time 10 "${smoke_container_id}" >"${smoke_api_stderr}.stop" 2>&1
	api_stop_exit=$?
	set -e
	if [[ "${api_stop_exit}" -eq 0 ]]; then
		api_process_exit="$(docker inspect --format '{{.State.ExitCode}}' "${smoke_container_id}")"
	fi
	docker rm --force "${smoke_container_id}" >/dev/null 2>&1 || true
	smoke_container_id=""
fi

if [[ "${api_ready}" == "true" ]]; then
	install -m 0600 "${smoke_ready_body}" "${evidence_root}/runtime-readyz-response.json"
else
	jq --null-input '{ observed: false }' >"${evidence_root}/runtime-readyz-response.json"
fi

operational_smoke_status=0
if [[ "${migrator_smoke_exit}" -ne 0 || "${migrator_output_clean}" != "true" ||
	"${api_start_exit}" -ne 0 || "${api_ready}" != "true" ||
	"${api_stop_exit}" -ne 0 || "${api_process_exit}" -ne 0 ]]; then
	operational_smoke_status=1
fi

jq --null-input \
	--arg imageReference "${image_reference}" \
	--arg bindAddress "127.0.0.1:${smoke_port}" \
	--arg readyHttpCode "${ready_http_code}" \
	--argjson migratorExitCode "${migrator_smoke_exit}" \
	--argjson migratorOutputClean "${migrator_output_clean}" \
	--argjson apiStartExitCode "${api_start_exit}" \
	--argjson apiReady "${api_ready}" \
	--argjson apiStopExitCode "${api_stop_exit}" \
	--argjson apiProcessExitCode "${api_process_exit}" \
	'{
		schemaVersion: 1,
		imageReference: $imageReference,
		constraints: {
			network: "host network for PostgreSQL; API bind and readiness probe use loopback",
			rootFilesystem: "read-only",
			linuxCapabilities: "none",
			noNewPrivileges: true,
			credentialsRetained: false,
			nonProductionSigningKeys: true
		},
		migrator: {
			exitCode: $migratorExitCode,
			outputEmpty: $migratorOutputClean,
			result: (if $migratorExitCode == 0 and $migratorOutputClean then "pass" else "fail" end)
		},
		api: {
			startExitCode: $apiStartExitCode,
			bindAddress: $bindAddress,
			readyzHttpCode: $readyHttpCode,
			ready: $apiReady,
			stopExitCode: $apiStopExitCode,
			processExitCode: $apiProcessExitCode,
			result: (if $apiStartExitCode == 0 and $apiReady and $apiStopExitCode == 0 and $apiProcessExitCode == 0 then "pass" else "fail" end)
		}
	}' >"${evidence_root}/runtime-operational-smoke.json"

container_id="$(docker create --platform linux/amd64 --entrypoint /usr/local/bin/tradingroom-api "${image_reference}")"

docker cp "${container_id}:/usr/local/bin/tradingroom-api" "${native_root}/tradingroom-api"
docker cp "${container_id}:/usr/local/bin/migrate" "${native_root}/migrate"
runtime_rootfs_tar="${runner_temp}/api-release-rootfs-${source_revision}.tar"
docker export "${container_id}" >"${runtime_rootfs_tar}"
tar --list --file "${runtime_rootfs_tar}" | LC_ALL=C sort >"${evidence_root}/runtime-rootfs-files.txt"
for required_runtime_path in \
	usr/local/bin/tradingroom-api \
	usr/local/bin/migrate; do
	grep --fixed-strings --line-regexp "${required_runtime_path}" \
		"${evidence_root}/runtime-rootfs-files.txt" >/dev/null ||
		fail "runtime filesystem is missing ${required_runtime_path}"
done
if grep --extended-regexp \
	'(^|/)(bin/(sh|bash|dash)|usr/bin/(sh|bash|dash|perl|apt[^/]*|dpkg[^/]*)|sbin/apk|bin/apk)$|(^|/)(ld-(linux|musl)[^/]*\.so[^/]*|libc\.so[^/]*|libgcc_s\.so[^/]*)$|(^|/)perl[^/]*(/|$)|(^|/)lib/apk(/|$)' \
	"${evidence_root}/runtime-rootfs-files.txt" >/dev/null; then
	fail "runtime filesystem contains a forbidden shell, package manager, loader, glibc, libgcc, or Perl path"
fi
rm -f "${runtime_rootfs_tar}"
runtime_rootfs_tar=""
docker rm "${container_id}" >/dev/null
container_id=""

[[ -x "${native_root}/tradingroom-api" ]] || fail "extracted API binary is not executable"
[[ -x "${native_root}/migrate" ]] || fail "extracted migrator binary is not executable"

assert_static_elf() {
	local binary_path="$1"
	local evidence_name="$2"
	local header_path="${evidence_root}/${evidence_name}-elf-header.txt"
	local program_headers_path="${evidence_root}/${evidence_name}-elf-program-headers.txt"
	local dynamic_path="${evidence_root}/${evidence_name}-elf-dynamic.txt"

	readelf --wide --file-header "${binary_path}" >"${header_path}"
	readelf --wide --program-headers "${binary_path}" >"${program_headers_path}"
	readelf --wide --dynamic "${binary_path}" >"${dynamic_path}"
	grep --fixed-strings 'Machine:' "${header_path}" | grep --fixed-strings 'Advanced Micro Devices X86-64' >/dev/null ||
		fail "${evidence_name} is not an x86-64 ELF"
	awk '$1 == "Type:" && $2 == "DYN" { found = 1 } END { exit !found }' "${header_path}" ||
		fail "${evidence_name} is not an ET_DYN position-independent executable"
	if grep --fixed-strings 'INTERP' "${program_headers_path}" >/dev/null; then
		fail "${evidence_name} contains a PT_INTERP dynamic-loader request"
	fi
	if grep --fixed-strings '(NEEDED)' "${dynamic_path}" >/dev/null; then
		fail "${evidence_name} contains a DT_NEEDED shared-library dependency"
	fi
	if grep --fixed-strings 'TEXTREL' "${dynamic_path}" >/dev/null; then
		fail "${evidence_name} contains text relocations"
	fi
	awk '
		$1 == "GNU_STACK" {
			count += 1
			for (field = 1; field <= NF; field += 1) {
				if ($field == "E" || $field ~ /^[RWE]+$/ && $field ~ /E/) executable += 1
			}
		}
		END { exit !(count == 1 && executable == 0) }
	' "${program_headers_path}" || fail "${evidence_name} does not have exactly one non-executable GNU_STACK"
	awk '$1 == "GNU_RELRO" { count += 1 } END { exit !(count == 1) }' "${program_headers_path}" ||
		fail "${evidence_name} does not have exactly one GNU_RELRO segment"
	awk '
		$1 == "LOAD" {
			loads += 1
			writable = 0
			executable = 0
			for (field = 1; field <= NF; field += 1) {
				if ($field ~ /W/) writable = 1
				if ($field ~ /E/) executable = 1
			}
			if (writable && executable) writable_executable += 1
		}
		END { exit !(loads > 0 && writable_executable == 0) }
	' "${program_headers_path}" || fail "${evidence_name} contains a writable and executable PT_LOAD segment"
	grep --fixed-strings 'BIND_NOW' "${dynamic_path}" >/dev/null ||
		fail "${evidence_name} does not require immediate relocation binding"
	grep --fixed-strings 'PIE' "${dynamic_path}" >/dev/null ||
		fail "${evidence_name} dynamic flags do not identify a PIE"
}

assert_static_elf "${native_root}/tradingroom-api" "api"
assert_static_elf "${native_root}/migrate" "migrator"
(
	cd "${native_root}"
	sha256sum tradingroom-api migrate >"${evidence_root}/native-binary-sha256.txt"
)
[[ "$(<"${native_link_root}/builder-native-binary-sha256.txt")" == "$(<"${evidence_root}/native-binary-sha256.txt")" ]] ||
	fail "runtime image binaries differ from the builder result that produced the linker evidence"

run_syft scan "docker:${BUILDER_IMAGE}" --scope squashed \
	--output "syft-json=${evidence_root}/builder-image.syft.json" \
	--output "spdx-json=${evidence_root}/builder-image.spdx.json"
run_syft scan "docker:${image_reference}" --scope squashed \
	--output "syft-json=${evidence_root}/api-image.syft.json" \
	--output "spdx-json=${evidence_root}/api-image.spdx.json"
run_syft scan "file:${native_root}/tradingroom-api" \
	--override-default-catalogers cargo-auditable-binary-cataloger,elf-binary-package-cataloger \
	--output "syft-json=${evidence_root}/api-binary.syft.json" \
	--output "spdx-json=${evidence_root}/api-binary.spdx.json"
run_syft scan "file:${native_root}/migrate" \
	--override-default-catalogers cargo-auditable-binary-cataloger,elf-binary-package-cataloger \
	--output "syft-json=${evidence_root}/migrator-binary.syft.json" \
	--output "spdx-json=${evidence_root}/migrator-binary.spdx.json"

assert_builder_apk() {
	local package_name="$1"
	local package_version="$2"

	jq --exit-status --arg name "${package_name}" --arg version "${package_version}" \
		'[.artifacts[] | select(.type == "apk" and .name == $name and .version == $version)] | length == 1' \
		"${evidence_root}/builder-image.syft.json" >/dev/null ||
		fail "builder SBOM did not recover exact package ${package_name} ${package_version}"
}

assert_builder_apk "binutils" "2.45.1-r1"
assert_builder_apk "ca-certificates" "20260611-r0"
assert_builder_apk "gcc" "15.2.0-r5"
assert_builder_apk "libgcc-static" "15.2.0-r5"
assert_builder_apk "musl" "1.2.6-r2"
assert_builder_apk "musl-dev" "1.2.6-r2"
jq --exit-status \
	'[.artifacts[] | select(.type == "rust-crate" and .name == "tradingroom-api" and .foundBy == "cargo-auditable-binary-cataloger")] | length >= 1' \
	"${evidence_root}/api-image.syft.json" >/dev/null ||
	fail "OCI SBOM did not recover cargo-auditable metadata"
jq --exit-status '
	([.artifacts[] | select(.type == "deb") | { name, version }] | unique | sort_by(.name)) == [
		{ "name": "base-files", "version": "13.8+deb13u6" },
		{ "name": "media-types", "version": "13.0.0" },
		{ "name": "netbase", "version": "6.5" },
		{ "name": "tzdata", "version": "2026b-0+deb13u1" },
		{ "name": "tzdata-legacy", "version": "2026b-0+deb13u1" }
	]
	and ([.artifacts[] | select(.type == "apk" or .type == "rpm")] | length == 0)
' \
	"${evidence_root}/api-image.syft.json" >/dev/null ||
	fail "runtime OCI SBOM differs from the exact reviewed static-distroless package inventory"
jq --exit-status \
	'[.artifacts[] | select(.type == "rust-crate" and .name == "tradingroom-api" and .foundBy == "cargo-auditable-binary-cataloger")] | length >= 1' \
	"${evidence_root}/api-binary.syft.json" >/dev/null ||
	fail "API binary SBOM did not recover cargo-auditable metadata"
jq --exit-status \
	'[.artifacts[] | select(.type == "rust-crate" and .name == "tradingroom-api" and .foundBy == "cargo-auditable-binary-cataloger")] | length >= 1' \
	"${evidence_root}/migrator-binary.syft.json" >/dev/null ||
	fail "migrator binary SBOM did not recover cargo-auditable metadata"

api_embedded_native_count="$(
	jq '[.artifacts[] | select((.name | ascii_downcase) as $name | $name == "musl" or $name == "libgcc-static")] | length' \
		"${evidence_root}/api-binary.syft.json"
)"
migrator_embedded_native_count="$(
	jq '[.artifacts[] | select((.name | ascii_downcase) as $name | $name == "musl" or $name == "libgcc-static")] | length' \
		"${evidence_root}/migrator-binary.syft.json"
)"
jq --null-input \
	--arg builderImage "${BUILDER_IMAGE}" \
	--arg libcSha256 "${LIBC_SHA256}" \
	--arg libunwindSha256 "${LIBUNWIND_SHA256}" \
	--argjson apiEmbeddedNativeArtifacts "${api_embedded_native_count}" \
	--argjson migratorEmbeddedNativeArtifacts "${migrator_embedded_native_count}" \
	'{
		schemaVersion: 1,
		builder: {
			image: $builderImage,
			systemNativePackages: {
				musl: "1.2.6-r2",
				muslDev: "1.2.6-r2",
				libgccStatic: "15.2.0-r5"
			},
			libcArchiveSha256: $libcSha256,
			pinnedToolchainLibunwindSha256: $libunwindSha256,
			evidence: [
				"builder-image.syft.json",
				"builder-packages.json",
				"builder-toolchain.txt",
				"native-link/native-link-input-ownership.txt",
				"native-link/native-link-input-sha256.txt",
				"native-link/rust-libunwind-sha256.txt"
			]
		},
		staticLinkEvidence: {
			api: [
				"api-elf-header.txt",
				"api-elf-program-headers.txt",
				"api-elf-dynamic.txt",
				"native-link/api-native-link-inputs.txt"
			],
			migrator: [
				"migrator-elf-header.txt",
				"migrator-elf-program-headers.txt",
				"migrator-elf-dynamic.txt",
				"native-link/migrator-native-link-inputs.txt"
			],
			builderRuntimeBinaryHashesEqual: true
		},
		nativeCatalogerVisibility: {
			apiEmbeddedNativePackageArtifacts: $apiEmbeddedNativeArtifacts,
			migratorEmbeddedNativePackageArtifacts: $migratorEmbeddedNativeArtifacts,
			completeNativeCompositionClaimed: false,
			limitation: "Binary catalogers do not independently identify every static native input. System musl/GCC inputs are bound to exact APK ownership, hashes, linker maps, and the full builder policy input. The Rust toolchain libunwind archive is bound to the pinned builder and an exact hash but has no independent package/version/CVE identity; zero binary-catalog findings is not an absence claim."
		}
	}' >"${evidence_root}/native-inventory-coverage.json"

run_grype_update db update
run_grype db status --output json >"${evidence_root}/grype-db-status.json"
run_grype "sbom:${evidence_root}/builder-image.syft.json" --output json \
	>"${evidence_root}/builder-image-vulnerabilities.grype.json"
run_grype "sbom:${evidence_root}/api-image.syft.json" --output json \
	>"${evidence_root}/api-image-vulnerabilities.grype.json"
run_grype "sbom:${evidence_root}/api-binary.syft.json" --output json \
	>"${evidence_root}/api-binary-vulnerabilities.grype.json"
run_grype "sbom:${evidence_root}/migrator-binary.syft.json" --output json \
	>"${evidence_root}/migrator-binary-vulnerabilities.grype.json"

for grype_report in \
	builder-image-vulnerabilities.grype.json \
	api-image-vulnerabilities.grype.json \
	api-binary-vulnerabilities.grype.json \
	migrator-binary-vulnerabilities.grype.json; do
	jq --exit-status --slurpfile expected_db "${evidence_root}/grype-db-status.json" \
		'.descriptor.db.status == $expected_db[0]' \
		"${evidence_root}/${grype_report}" >/dev/null ||
		fail "${grype_report} was not evaluated against the retained frozen Grype database"
done

builder_critical_findings="$(
	jq '[.matches[] | select(.vulnerability.severity == "Critical")] | length' \
		"${evidence_root}/builder-image-vulnerabilities.grype.json"
)"
builder_fixed_high_findings="$(
	jq '[.matches[] | select(.vulnerability.severity == "High" and .vulnerability.fix.state == "fixed")] | length' \
		"${evidence_root}/builder-image-vulnerabilities.grype.json"
)"
jq --null-input \
	--argjson criticalFindings "${builder_critical_findings}" \
	--argjson fixedHighFindings "${builder_fixed_high_findings}" \
	'{
		schemaVersion: 1,
		scope: "build-environment",
		releasePolicyInput: true,
		criticalFindingRule: "block regardless of fix state",
		fixedHighFindingRule: "block",
		criticalFindings: $criticalFindings,
		fixedHighFindings: $fixedHighFindings,
		completeReport: "builder-image-vulnerabilities.grype.json"
	}' >"${evidence_root}/builder-vulnerability-observation.json"

# `apps/controller/scripts/`, NOT `scripts/`.
#
# This read `${repository_root}/scripts/verify-api-release-artifact.mjs` and that file has never
# existed at that path here. It came from the sibling repository, where `scripts/` sits at the root;
# moving it under `apps/controller/` invalidated the path without changing the name. The workflow's
# own earlier step already invokes it correctly, which is why the contract check passed and this one
# could not.
#
# It survived because no run ever reached this line — the gate died earlier every time. It first
# executed on 2026-08-15, and then reported `MODULE_NOT_FOUND` as a vulnerability finding (see the
# guard below).
verifier="${repository_root}/apps/controller/scripts/verify-api-release-artifact.mjs"
[[ -f "${verifier}" ]] || fail "release-artifact verifier is missing at ${verifier}"

set +e
node "${verifier}" --evaluate \
	--policy "${repository_root}/ops/api-release-vulnerability-policy.json" \
	--output "${evidence_root}/vulnerability-policy-result.json" \
	"${evidence_root}/builder-image-vulnerabilities.grype.json" \
	"${evidence_root}/api-image-vulnerabilities.grype.json" \
	"${evidence_root}/api-binary-vulnerabilities.grype.json" \
	"${evidence_root}/migrator-binary-vulnerabilities.grype.json"
policy_status=$?
set -e

operational_smoke_result="pass"
if [[ "${operational_smoke_status}" -ne 0 ]]; then
	operational_smoke_result="fail"
fi

jq --null-input \
	--arg sourceRevision "${source_revision}" \
	--arg sourceTree "$(git -C "${repository_root}" show -s --format='%T' "${source_revision}")" \
	--arg imageReference "${image_reference}" \
	--arg imageId "${image_id}" \
	--arg builderImage "${BUILDER_IMAGE}" \
	--arg runtimeBaseImage "${RUNTIME_BASE_IMAGE}" \
	--arg configuredUser "${configured_user}" \
	--arg runtimeUid "${runtime_uid}" \
	--arg runtimeGid "${runtime_gid}" \
	--arg syftVersion "${SYFT_VERSION}" \
	--arg grypeVersion "${GRYPE_VERSION}" \
	--arg buildxVersion "${BUILDX_VERSION}" \
	--arg buildkitVersion "${BUILDKIT_VERSION}" \
	--arg imagePlatform "${image_platform}" \
	--arg operationalSmokeResult "${operational_smoke_result}" \
	--arg operationalSmokeSha256 "$(sha256sum "${evidence_root}/runtime-operational-smoke.json" | awk '{print $1}')" \
	--arg postgresAttestationSha256 "$(sha256sum "${postgres_attestation}" | awk '{print $1}')" \
	--arg generatedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
	'{
		schemaVersion: 1,
		sourceRevision: $sourceRevision,
		sourceTree: $sourceTree,
		imageReference: $imageReference,
		imageId: $imageId,
		builderImage: $builderImage,
		runtimeBaseImage: $runtimeBaseImage,
		configuredUser: $configuredUser,
		runtimeUid: ($runtimeUid | tonumber),
		runtimeGid: ($runtimeGid | tonumber),
		tools: {
			syft: $syftVersion,
			grype: $grypeVersion,
			buildx: $buildxVersion,
			buildkit: $buildkitVersion
		},
		architecture: $imagePlatform,
		operationalSmoke: {
			path: "runtime-operational-smoke.json",
			sha256: $operationalSmokeSha256,
			status: $operationalSmokeResult
		},
		postgresAttestation: {
			path: "postgres-release-attestation.json",
			sha256: $postgresAttestationSha256,
			status: "pass"
		},
		generatedAt: $generatedAt,
		published: false
	}' >"${evidence_root}/evidence-metadata.json"

manifest_tmp="${evidence_root}.SHA256SUMS.tmp"
(
	cd "${evidence_root}"
	find . -type f -print0 | sort --zero-terminated | xargs -0 sha256sum >"${manifest_tmp}"
)
mv "${manifest_tmp}" "${evidence_root}/SHA256SUMS"

release_failures=()
if [[ "${operational_smoke_status}" -ne 0 ]]; then
	release_failures+=("exact-image migrator/API operational smoke failed")
fi
# A non-zero status here means the verifier RAN and rejected — the `[[ -f ]]` guard above proves it
# is present, and the JSON result it is asked to write is required below. Without that guard this
# branch reported a missing file as `vulnerability policy rejected the builder or release artifact`:
# a message that reads like a security finding and sends the reader to look at CVEs instead of a
# stale path. Never report a failure without first ruling out your own tooling.
if [[ "${policy_status}" -ne 0 ]]; then
	if [[ ! -s "${evidence_root}/vulnerability-policy-result.json" ]]; then
		fail "the release-artifact verifier exited ${policy_status} without writing a policy result; this is a verifier failure, NOT a vulnerability finding"
	fi
	release_failures+=("vulnerability policy rejected the builder or release artifact")
fi
if [[ "${#release_failures[@]}" -ne 0 ]]; then
	fail "${release_failures[*]}; inspect the retained, hashed evidence"
fi

printf '[backend:release-artifact] PASS image=%s id=%s evidence=%s\n' \
	"${image_reference}" "${image_id}" "${evidence_root}"
