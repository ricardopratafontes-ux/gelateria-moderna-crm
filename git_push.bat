@echo off
cd /d "C:\Users\ricar\OneDrive\Documents\Claude\Projects\CRM Gelateria Moderna"
del /f /q ".git\index.lock" 2>nul
del /f /q ".git\HEAD.lock" 2>nul
"C:\Program Files\Git\bin\git.exe" add -A
"C:\Program Files\Git\bin\git.exe" commit -m "feat: webhooks OMIE, comissoes via contas a receber, troca de etapa de pedido"
"C:\Program Files\Git\bin\git.exe" push origin main
echo DONE
pause
