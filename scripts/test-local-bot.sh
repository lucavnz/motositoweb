#!/bin/bash
# ══════════════════════════════════════════════════════════
#  🧪 Test locale del bot Telegram con ngrok
#  Esegui: ./scripts/test-local-bot.sh
# ══════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ File .env.local non trovato"
  exit 1
fi

TELEGRAM_TOKEN=$(grep TELEGRAM_BOT_TOKEN "$ENV_FILE" | cut -d '=' -f2)

if [ -z "$TELEGRAM_TOKEN" ]; then
  echo "❌ TELEGRAM_BOT_TOKEN non trovato in .env.local"
  exit 1
fi

echo ""
echo "🏍️  Avanzi Moto Bot — Test Locale"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Verifica che il dev server sia in esecuzione
echo "1️⃣  Verifico che il dev server sia attivo su :3000..."
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "   ⚠️  Dev server non trovato. Avvialo con: npm run dev"
  echo "   Poi riesegui questo script."
  exit 1
fi
echo "   ✅ Dev server attivo!"
echo ""

# Step 2: Avvia ngrok
echo "2️⃣  Avvio ngrok tunnel su porta 3000..."
ngrok http 3000 --log=stdout > /tmp/ngrok-bot.log 2>&1 &
NGROK_PID=$!
sleep 3

# Ottieni l'URL pubblico di ngrok
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$NGROK_URL" ]; then
  echo "   ❌ Impossibile ottenere l'URL ngrok. Verifica che ngrok sia configurato."
  kill $NGROK_PID 2>/dev/null
  exit 1
fi

WEBHOOK_URL="${NGROK_URL}/api/telegram"
echo "   ✅ Tunnel attivo: $NGROK_URL"
echo ""

# Step 3: Imposta il webhook
echo "3️⃣  Imposto webhook Telegram..."
echo "   URL: $WEBHOOK_URL"
RESPONSE=$(curl -s "https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook?url=${WEBHOOK_URL}")
echo "   📡 Risposta: $RESPONSE"
echo ""

# Step 4: Info
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Bot pronto per il test!"
echo ""
echo "🔗 Webhook:  $WEBHOOK_URL"
echo "🌐 Tunnel:   $NGROK_URL"
echo "📊 Dashboard: http://localhost:4040"
echo ""
echo "💬 Apri Telegram e scrivi al bot per testare."
echo ""
echo "⚠️  Premi Ctrl+C per fermare ngrok e ripristinare il webhook di produzione."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Cleanup: quando l'utente preme Ctrl+C, ripristina il webhook di produzione
cleanup() {
  echo ""
  echo ""
  echo "🔄 Ripristino webhook di produzione..."
  PROD_URL="https://www.avanzimoto.it/api/telegram"
  curl -s "https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook?url=${PROD_URL}" > /dev/null
  echo "   ✅ Webhook ripristinato: $PROD_URL"
  kill $NGROK_PID 2>/dev/null
  echo "   ✅ ngrok fermato."
  echo ""
  exit 0
}

trap cleanup SIGINT SIGTERM

# Tieni il processo vivo e mostra i log ngrok
wait $NGROK_PID
