#!/bin/bash
# Setup Telegram Webhook per Avanzi Moto Valutatore Bot
# Esegui questo script UNA VOLTA dopo il deploy su Vercel

TELEGRAM_TOKEN="7998240836:AAGDj08ArL8l8yx0xzpOVfzmwKTJ0N9MY2s"
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
echo "   Cerca @[nome_bot] su Telegram e scrivi /start"
