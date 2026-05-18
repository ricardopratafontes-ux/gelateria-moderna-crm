#!/bin/bash
cd "$(dirname "$0")"
LOGFILE="./git_push_result.txt"
echo "=== GIT PUSH $(date) ===" > "$LOGFILE"
git add -A >> "$LOGFILE" 2>&1
git commit -m "fix: endpoint teste whatsapp aceita telefone via query param" >> "$LOGFILE" 2>&1
git push origin main >> "$LOGFILE" 2>&1
echo "=== DONE ===" >> "$LOGFILE"
