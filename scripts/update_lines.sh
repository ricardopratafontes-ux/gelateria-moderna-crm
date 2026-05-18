#!/bin/bash

# update_lines.sh - Imprime linhas de funções principais para manter CLAUDE.md sincronizado
# Uso: bash scripts/update_lines.sh

echo "📍 LINHAS DE FUNÇÕES PRINCIPAIS"
echo "================================"
echo ""

if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  GREP_CMD="findstr"
else
  GREP_CMD="grep"
fi

echo "🔍 Funções em backend/src/services/comissaoService.ts:"
echo "---"
$GREP_CMD -n "export function\|export const" backend/src/services/comissaoService.ts || echo "Arquivo não encontrado"
echo ""

echo "🔍 Funções em backend/src/services/rotaService.ts:"
echo "---"
$GREP_CMD -n "export function\|export const" backend/src/services/rotaService.ts || echo "Arquivo não encontrado"
echo ""

echo "🔍 Funções em frontend/src/hooks/useRota.ts:"
echo "---"
$GREP_CMD -n "export function\|export const" frontend/src/hooks/useRota.ts || echo "Arquivo não encontrado"
echo ""

echo "🔍 Jobs em backend/src/jobs/:"
echo "---"
ls -la backend/src/jobs/*.ts 2>/dev/null | awk '{print $NF}' || echo "Pasta não encontrada"
echo ""

echo "✅ Atualize CLAUDE.md com as linhas acima"
