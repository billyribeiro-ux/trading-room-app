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

set_var() {
  local name="$1" value="$2" source="${3:-literal}"

  if [ -z "$value" ]; then
    printf '  SKIP  %-26s no value in %s — NOT written blank\n' "$name" "$source"
    return
  fi

  if printf '%s' "$value" | npx vercel env add "$name" production --force --yes >/dev/null 2>&1; then
    printf '  set   %-26s %s chars\n' "$name" "${#value}"
  else
    printf '  FAIL  %-26s vercel rejected it\n' "$name"
  fi
}

echo "Setting production environment for trading-room-app"
echo

set_var CONTROL_PLANE_MODE       "postgres"
set_var PUBLIC_SITE_ORIGIN       "https://www.tradingroom.app"
set_var DATABASE_URL             "$(read_value DATABASE_URL "$PULL")"              ".env.vercel-pull"
set_var ROOM_JWT_SECRET          "$(read_value ROOM_JWT_SECRET "$ENVF")"           ".env"
set_var ROOM_BASE_URL            "$(read_value ROOM_BASE_URL "$ENVF")"             ".env"
set_var RECAPTCHA_SECRET_KEY     "$(read_value RECAPTCHA_SECRET_KEY "$ENVF")"      ".env"
set_var PUBLIC_RECAPTCHA_SITE_KEY "$(read_value PUBLIC_RECAPTCHA_SITE_KEY "$ENVF")" ".env"
set_var SUPERADMIN_EMAILS        "$(read_value SUPERADMIN_EMAILS "$ENVF")"         ".env"

# Generated fresh rather than copied: this key encrypts stored API secrets, and reusing another
# deployment's key would make one deployment able to decrypt the other's data.
set_var API_KEY_ENCRYPTION_KEY   "$(openssl rand -hex 16)"

echo
echo "Verifying nothing was left blank:"
npx vercel env ls production 2>/dev/null | tail -n +2
