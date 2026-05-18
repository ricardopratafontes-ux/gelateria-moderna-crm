#!/bin/bash
cd "$(dirname "$0")"
LOGFILE="./git_push_result.txt"
# Remove lock file if exists
rm -f .git/index.lock
echo "=== GIT PUSH $(date) ===" > "$LOGFILE"
git add -A >> "$LOGFILE" 2>&1
git commit -m "feat: GPS tracking, mapa Leaflet, fotos comprimidas e registro avulso com GPS" >> "$LOGFILE" 2>&1
git push origin main >> "$LOGFILE" 2>&1
echo "=== DONE ===" >> "$LOGFILE"
