@echo off
cd /d "C:\Users\ricar\OneDrive\Documents\Claude\Projects\CRM Gelateria Moderna"
del /f .git\HEAD.lock 2>nul
del /f .git\index.lock 2>nul
"C:\Program Files\Git\bin\git.exe" add -A
"C:\Program Files\Git\bin\git.exe" commit -m "feat: botao Importar do OMIE na pagina de clientes + busca por nome"
"C:\Program Files\Git\bin\git.exe" push origin main
echo DONE
