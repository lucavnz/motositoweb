#!/bin/bash
# Setup Telegram Webhook per Avanzi Moto Valutatore Bot
# Esegui questo script UNA VOLTA dopo il deploy su Vercel
#
# Usa la variabile d'ambiente TELEGRAM_BOT_TOKEN dal file .env.local

# Carica il token dal .env.local
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ File .env.local non trovato in $ENV_FILE"
  exit 1
fi

TELEGRAM_TOKEN=$(grep TELEGRAM_BOT_TOKEN "$ENV_FILE" | cut -d '=' -f2)

if [ -z "$TELEGRAM_TOKEN" ]; then
  echo "❌ TELEGRAM_BOT_TOKEN non trovato in .env.local"
  exit 1
fi

WEBHOOK_URL="https://www.avanzimoto.it/api/telegram"

echo "🔗 Impostazione webhook Telegram..."
echo "   URL: $WEBHOOK_URL"
echo ""

RESPONSE=$(curl -s "https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook?url=${WEBHOOK_URL}")

echo "📡 Risposta Telegram:"
echo "$RESPONSE"
echo ""

# Verifica lo stato del webhook
echo "📋 Stato webhook attuale:"
curl -s "https://api.telegram.org/bot${TELEGRAM_TOKEN}/getWebhookInfo" | python3 -m json.tool 2>/dev/null || curl -s "https://api.telegram.org/bot${TELEGRAM_TOKEN}/getWebhookInfo"
echo ""

echo "✅ Fatto! Ora il bot è attivo su Telegram."
