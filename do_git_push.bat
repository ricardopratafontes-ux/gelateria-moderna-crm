@echo off
"C:\Program Files\Git\bin\bash.exe" -c "cd '/c/App da Moderna/CRM de Vendas' && rm -f .git/index.lock && git add -A && git status --short > git_status_temp.txt 2>&1 && git commit -m 'feat: GPS tracking, mapa Leaflet, fotos comprimidas' >> git_status_temp.txt 2>&1 && git push origin main >> git_status_temp.txt 2>&1"
