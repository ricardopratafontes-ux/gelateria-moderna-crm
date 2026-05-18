#!/bin/bash
cd "$(dirname "$0")"
LOGFILE="./git_push_result.txt"
echo "=== GIT PUSH $(date) ===" > "$LOGFILE"
git add -A >> "$LOGFILE" 2>&1
git commit -m "fix: rate limit TextMeBot - delay 6s entre mensagens WhatsApp" >> "$LOGFILE" 2>&1
git push origin main >> "$LOGFILE" 2>&1
echo "=== DONE ===" >> "$LOGFILE"
