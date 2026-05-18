#!/bin/bash

# deploy.sh - Backup local + commit + push + publicar em produção
# Uso: bash scripts/deploy.sh

set -e

echo "🔴 DEPLOY - Produção"
echo "===================="

read -p "⚠️  ATENÇÃO: Você está prestes a fazer deploy em PRODUÇÃO. Tem certeza? (s/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
  echo "❌ Cancelado"
  exit 1
fi

read -p "Confirme novamente (s/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
  echo "❌ Cancelado"
  exit 1
fi

echo "💾 Fazendo backup local..."
BACKUP_DIR="backups/backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR
cp -r frontend backend .env* $BACKUP_DIR/
echo "✅ Backup em: $BACKUP_DIR"

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

echo "📝 Fazendo commit..."
read -p "Mensagem do commit: " COMMIT_MSG
git add -A
git commit -m "deploy: $COMMIT_MSG"
if [ $? -ne 0 ]; then
  echo "❌ Commit falhou. Abortando."
  exit 1
fi

echo "📤 Enviando para repositório..."
git push origin main
if [ $? -ne 0 ]; then
  echo "❌ Push falhou. Abortando."
  exit 1
fi

echo "🚀 Deploy em produção..."
echo "   Render: deploy automático via git push (já feito acima)"
echo "   Vercel: deploy automático via git push (já feito acima)"

echo "✅ Deploy concluído!"
echo "Frontend: https://gelateria-moderna.vercel.app"
echo "Backend: https://gelateria-moderna-crm.onrender.com"
echo "Backup: $BACKUP_DIR"
