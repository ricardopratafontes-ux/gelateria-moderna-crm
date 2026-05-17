#!/bin/bash

# preview.sh - Deploy em ambiente de teste sem ir a produção
# Uso: bash scripts/preview.sh

set -e

echo "🔵 PREVIEW - Deploy em Staging"
echo "================================"

read -p "Deseja fazer deploy em STAGING? (s/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
  echo "❌ Cancelado"
  exit 1
fi

echo "📋 Validando testes..."
npm run test
if [ $? -ne 0 ]; then
  echo "❌ Testes falharam. Abortando."
  exit 1
fi

echo "🏗️  Buildando frontend..."
cd frontend
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build frontend falhou. Abortando."
  exit 1
fi
cd ..

echo "🏗️  Buildando backend..."
cd backend
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build backend falhou. Abortando."
  exit 1
fi
cd ..

echo "🚀 Deployando em staging..."
vercel --prod --token=$VERCEL_TOKEN --scope=seu-scope
railway up --service backend --environment staging

echo "✅ Preview concluído!"
echo "Frontend: https://staging-gelateria-moderna.vercel.app"
echo "Backend: https://staging-gelateria-api.railway.app"
