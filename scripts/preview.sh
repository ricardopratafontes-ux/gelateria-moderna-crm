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
echo "   Para preview, faça push em branch separada:"
echo "   git push origin develop"
echo "   Vercel gera preview automaticamente para branches não-main."
echo "   Render: apenas main tem auto-deploy (free tier não suporta staging)."

echo "✅ Preview concluído!"
echo "Frontend (preview): verifique URL no dashboard Vercel"
echo "Backend: https://gelateria-moderna-crm.onrender.com"
