#!/bin/bash
cd "$(dirname "$0")"
git add -A
git commit -m "fix: endpoint teste whatsapp aceita telefone via query param"
git push origin main 2>&1
echo "DONE"
