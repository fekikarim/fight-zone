#!/bin/sh
# Runs the app against the LOCAL Supabase stack (supabase start) — never prod.
# Uses the CLI's well-known local demo keys; e-mail sending is disabled.
set -e
STATUS=$(npx supabase status -o env 2>/dev/null)
eval "$(echo "$STATUS" | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=')"
case "$API_URL" in http://127.0.0.1*|http://localhost*) ;; *) echo "Local Supabase not running"; exit 1;; esac
export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
export NEXT_PUBLIC_SITE_URL="http://localhost:${PORT:-3100}"
export RESEND_API_KEY=""
export AI_MOTIVATION_ENABLED="false"
exec npx next dev -p "${PORT:-3100}"
