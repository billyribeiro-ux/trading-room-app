#!/usr/bin/env bash
#
# Set the controller's production environment on Vercel, from the values already on this machine.
#
# WHY THIS IS A FILE AND NOT A ONE-LINER
#
# The one-liner this replaces defined a helper function inside an `&&` chain. In zsh that function
# never came into existence, so every `$(v NAME FILE)` expanded to nothing and `vercel env add`
# happily accepted an EMPTY STRING for nine variables — reporting "set NAME" each time, because the
# command genuinely succeeded. It set the wrong thing successfully, which is the worst way to fail.
#
# That left CONTROL_PLANE_MODE=postgres beside an empty DATABASE_URL, which is the one combination
# `assertControlPlaneConfiguration` throws on. The site would have failed to boot on the next
# deploy rather than merely staying in marketing mode.
#
# So this script refuses to set an empty value, and says which file it looked in when it cannot
# find one. A variable that is missing is reported and skipped; it is never written blank.

set -uo pipefail

cd "$(dirname "$0")/../apps/controller" || exit 1

PULL="$HOME/Desktop/new-room-control/.env.vercel-pull"
ENVF="$HOME/Desktop/new-room-control/.env"

# THIS REPO's own env, and where every NEW value belongs.
#
# The two paths above are historical: they are the surviving source of values production was
# originally configured from, and they stay only until those are rehomed. Nothing new goes there —
# `new-room-control` is read-only reference, not a config store for this project.
#
# `apps/controller/.env` is deliberately NOT read here any more. It is the LOCAL dev runtime and
# nothing else; the one pair this script used to take from it now has its own file below.
#
# The PRODUCTION mail secrets, deliberately in their own file rather than in `.env`.
#
# `.env` is loaded by Vite, so every value in it configures the local dev server too. While the
# Resend key lived there, running the app locally to test password reset sent LIVE email through
# the production key — to a fake address, which hard-bounces against a new sending domain. The file
# was doing two jobs and the second one was invisible.
#
# Two jobs, two files. Nothing reads `.env.deploy` at runtime, so a local server is honestly
# mail-unconfigured by default, which `mail.ts` is built to handle.
DEPLOYENV=".env.deploy"

for f in "$PULL" "$ENVF"; do
  if [ ! -f "$f" ]; then
    echo "missing source file: $f" >&2
    exit 1
  fi
done

# Read one value from a dotenv file. Everything after the first `=` is the value, quotes stripped.
read_value() {
  grep -m1 "^$1=" "$2" 2>/dev/null | cut -d= -f2- | sed 's/^"//; s/"$//'
}

# Minimum length for anything that is a secret rather than a setting. ROOM_JWT_SECRET was 9
# characters in production, signing 360-day handoff tokens that travel in URLs.
min_length_for() {
  case "$1" in
    ROOM_JWT_SECRET|API_KEY_ENCRYPTION_KEY) echo 32 ;;
    RECAPTCHA_SECRET_KEY|RESEND_API_KEY) echo 20 ;;
    *) echo 0 ;;
  esac
}

set_var() {
  local name="$1" value="$2" source="${3:-literal}"

  if [ -z "$value" ]; then
    printf '  SKIP  %-26s no value in %s — NOT written blank\n' "$name" "$source"
    return
  fi

  # Validate HERE, not after the fact. Vercel marks these sensitive and will not read them back,
  # so this is the only moment the value can be inspected at all. `ROOM_BASE_URL` reached
  # production as `http://localhost:5174` because nothing looked at it on the way through.
  case "$name" in
    *URL|*ORIGIN|*HOST)
      case "$value" in
        *localhost*|*127.0.0.1*|*0.0.0.0*)
          printf '  REFUSED %-24s points at a LOCAL address — not written\n' "$name"
          REFUSED=$((REFUSED + 1))
          return
          ;;
      esac
      ;;
  esac

  # A from-address without an `@` is accepted here and rejected by the provider at send time, which
  # surfaces as a broken registration rather than a bad variable — the same half-configured trap
  # `mailConfigured()` exists to avoid. Caught at write time, where the value can still be seen.
  case "$name" in
    MAIL_FROM)
      case "$value" in
        *@*.*) ;;
        *)
          printf '  REFUSED %-24s not an email address — not written\n' "$name"
          REFUSED=$((REFUSED + 1))
          return
          ;;
      esac
      ;;
  esac

  local min
  min="$(min_length_for "$name")"
  if [ "$min" -gt 0 ] && [ "${#value}" -lt "$min" ]; then
    printf '  REFUSED %-24s %s chars, needs %s — not written\n' "$name" "${#value}" "$min"
    REFUSED=$((REFUSED + 1))
    return
  fi

  if printf '%s' "$value" | npx vercel env add "$name" production --force --yes >/dev/null 2>&1; then
    printf '  set   %-26s %s chars\n' "$name" "${#value}"
  else
    printf '  FAIL  %-26s vercel rejected it\n' "$name"
  fi
}

REFUSED=0
echo "Setting production environment for trading-room-app"
echo

set_var CONTROL_PLANE_MODE       "postgres"
set_var PROFILE_AUTHORITY_MODE   "$(read_value PROFILE_AUTHORITY_MODE "$DEPLOYENV")" "apps/controller/.env.deploy"
set_var ROOM_AUTHORITY_MODE      "$(read_value ROOM_AUTHORITY_MODE "$DEPLOYENV")"    "apps/controller/.env.deploy"
set_var PUBLIC_SITE_ORIGIN       "https://www.tradingroom.app"
set_var DATABASE_URL             "$(read_value DATABASE_URL "$PULL")"              ".env.vercel-pull"
set_var TRADINGROOM_API_URL      "$(read_value TRADINGROOM_API_URL "$DEPLOYENV")"   "apps/controller/.env.deploy"
set_var ROOM_JWT_SECRET          "$(read_value ROOM_JWT_SECRET "$ENVF")"           ".env"
set_var ROOM_BASE_URL            "$(read_value ROOM_BASE_URL "$ENVF")"             ".env"
set_var RECAPTCHA_SECRET_KEY     "$(read_value RECAPTCHA_SECRET_KEY "$ENVF")"      ".env"
set_var PUBLIC_RECAPTCHA_SITE_KEY "$(read_value PUBLIC_RECAPTCHA_SITE_KEY "$ENVF")" ".env"
set_var SUPERADMIN_EMAILS        "$(read_value SUPERADMIN_EMAILS "$ENVF")"         ".env"

# Mail. BOTH or neither — `mailConfigured()` requires the pair (`mail.ts:71-73`), and setting one
# alone is the half-configured state it exists to refuse. Absent from `.env`, each is reported and
# skipped, which leaves the deployment honestly unconfigured rather than half on.
#
# Setting these flips `verificationEnforced()` to true. Re-run the check in `docs/EMAIL.md` §5
# first: any account with a NULL `email_verified_at` is gated out of creating rooms until it
# confirms. Measured 2026-08-09 there were none, and that expires with the next registration.
set_var RESEND_API_KEY           "$(read_value RESEND_API_KEY "$DEPLOYENV")"       "apps/controller/.env.deploy"
set_var MAIL_FROM                "$(read_value MAIL_FROM "$DEPLOYENV")"            "apps/controller/.env.deploy"

# API_KEY_ENCRYPTION_KEY is NOT set here any more, and generating a fresh one is exactly what
# broke the account page.
#
# This key decrypts the API-key secrets already stored in the database. A new key cannot read an
# envelope written under the old one, so "rotating" it is not a rotation — it makes every existing
# row permanently unreadable, and an uncaught throw in the loader turned that into a 500 on the
# whole page.
#
# If it must change, the sequence is: set the new key, then regenerate every API key through the
# UI so each row is rewritten under it. Ordering matters and it is not something a helper script
# should do behind an operator's back.
#
#   openssl rand -hex 16 | npx vercel env add API_KEY_ENCRYPTION_KEY production --force --yes

echo
if [ "$REFUSED" -gt 0 ]; then
  echo
  echo "$REFUSED value(s) REFUSED — fix them and re-run; nothing bad was written."
fi

echo "Verifying nothing was left blank:"
npx vercel env ls production 2>/dev/null | tail -n +2
