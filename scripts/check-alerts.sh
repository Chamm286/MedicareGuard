#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${N8N_ENV_FILE:-$HOME/n8n-safe/n8n.env}"
SEND=0

if [[ "${1:-}" == "--send" ]]; then
  SEND=1
elif [[ -n "${1:-}" ]]; then
  echo "Usage: $0 [--send]" >&2
  exit 2
fi

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  . "$ENV_FILE"
  set +a
fi

fail=0
configured=0

if [[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${TELEGRAM_CHAT_ID:-}" ]]; then
  configured=$((configured + 1))
  body="$(mktemp)"
  code="$(curl -sS -o "$body" -w '%{http_code}' "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe" || true)"
  if [[ "$code" == "200" ]] && python3 -c 'import json,sys; sys.exit(0 if json.load(open(sys.argv[1])).get("ok") else 1)' "$body"; then
    bot="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["result"].get("username",""))' "$body")"
    echo "Telegram: authenticated as @${bot:-unknown}"
    if [[ "$SEND" == "1" ]]; then
      text="MedicareGuard test alert: Telegram delivery is working."
      code="$(curl -sS -o "$body" -w '%{http_code}' \
        --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
        --data-urlencode "text=${text}" \
        "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" || true)"
      if [[ "$code" == "200" ]] && python3 -c 'import json,sys; sys.exit(0 if json.load(open(sys.argv[1])).get("ok") else 1)' "$body"; then
        echo "Telegram: test message sent"
      else
        echo "Telegram: API call failed (HTTP $code)"
        fail=1
      fi
    fi
  else
    echo "Telegram: authentication failed (HTTP $code)"
    fail=1
  fi
  rm -f "$body"
else
  echo "Telegram: skipped (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set)"
fi

if [[ -n "${MG_SMTP_HOST:-}" && -n "${MG_SMTP_USER:-}" && -n "${MG_SMTP_PASSWORD:-}" ]]; then
  configured=$((configured + 1))
  to="${MG_ALERT_EMAIL:-${MG_SMTP_USER}}"
  from="${MG_SMTP_FROM:-${MG_SMTP_USER}}"
  if python3 - "$MG_SMTP_HOST" "${MG_SMTP_PORT:-465}" "${MG_SMTP_SECURE:-true}" "$MG_SMTP_USER" "$MG_SMTP_PASSWORD" "$SEND" "$to" "$from" <<'PY'
import smtplib
import ssl
import sys

host, port, secure, user, password, send, to, sender = sys.argv[1:]
port = int(port)
secure = secure.lower() == "true"

try:
    if secure:
        server = smtplib.SMTP_SSL(host, port, timeout=20, context=ssl.create_default_context())
    else:
        server = smtplib.SMTP(host, port, timeout=20)
        server.starttls(context=ssl.create_default_context())
    server.login(user, password)
    if send == "1":
        message = (
            f"From: {sender}\r\n"
            f"To: {to}\r\n"
            "Subject: MedicareGuard test alert\r\n"
            "MIME-Version: 1.0\r\n"
            "Content-Type: text/plain; charset=utf-8\r\n"
            "\r\n"
            "MedicareGuard test alert: Gmail delivery is working.\r\n"
        )
        server.sendmail(sender, [to], message)
    server.quit()
except Exception as error:
    print(f"Gmail: check failed ({type(error).__name__}: {error})")
    sys.exit(1)

print(f"Gmail: authenticated as {user}" + (f"; test email sent to {to}" if send == "1" else ""))
PY
  then :; else fail=1; fi
else
  echo "Gmail: skipped (MG_SMTP_HOST / MG_SMTP_USER / MG_SMTP_PASSWORD not set)"
fi

if [[ "$configured" == "0" ]]; then
  echo "No alert channels configured. Add credentials to $ENV_FILE." >&2
  exit 1
fi

if [[ "$fail" != "0" ]]; then
  exit 1
fi

echo "Alert channel check passed."
