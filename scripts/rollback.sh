#!/bin/bash

# rollback.sh - Reverter produção (backup local ou commit git)
# Uso: bash scripts/rollback.sh

set -e

echo "🔙 ROLLBACK - Reverter Produção"
echo "================================"

read -p "⚠️  ATENÇÃO: Você está prestes a fazer ROLLBACK em PRODUÇÃO. Tem certeza? (s/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
  echo "❌ Cancelado"
  exit 1
fi

echo "Escolha a opção:"
echo "1) Restaurar backup local (mais rápido)"
echo "2) Reverter para commit anterior do git (mais seguro)"
read -p "Opção (1 ou 2): " OPCAO

if [ "$OPCAO" == "1" ]; then
  echo "📂 Backups disponíveis:"
  ls -lt backups/ | head -5
  read -p "Nome do backup a restaurar: " BACKUP_NAME

  if [ ! -d "backups/$BACKUP_NAME" ]; then
    echo "❌ Backup não encontrado"
    exit 1
  fi

  echo "♻️  Restaurando backup..."
  cp -r backups/$BACKUP_NAME/* .
  echo "✅ Backup restaurado"

  echo "🚀 Redeployando..."
  git add -A
  git commit -m "rollback: restaurar backup $BACKUP_NAME"
  git push origin main
  echo "   Render + Vercel redeployam automaticamente via git push."

elif [ "$OPCAO" == "2" ]; then
  echo "📜 Últimos commits:"
  git log --oneline -10
  read -p "Hash do commit para reverter: " COMMIT_HASH

  echo "♻️  Revertendo para commit $COMMIT_HASH..."
  git revert --no-commit $COMMIT_HASH..HEAD
  git commit -m "rollback: reverter para $COMMIT_HASH"
  git push origin main
  echo "   Render + Vercel redeployam automaticamente via git push."

else
  echo "❌ Opção inválida"
  exit 1
fi

echo "✅ Rollback concluído!"
