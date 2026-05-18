@echo off
cd /d "C:\Users\ricar\OneDrive\Documents\Claude\Projects\CRM Gelateria Moderna"
"C:\Program Files\Git\bin\git.exe" add -A
"C:\Program Files\Git\bin\git.exe" commit -m "feat: integrar vendedores e vendas com OMIE"
"C:\Program Files\Git\bin\git.exe" push origin main
echo DONE
