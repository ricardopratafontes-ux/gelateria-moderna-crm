@echo off
cd /d "C:\Users\ricar\OneDrive\Documents\Claude\Projects\CRM Gelateria Moderna"
del /f .git\HEAD.lock 2>nul
del /f .git\index.lock 2>nul
"C:\Program Files\Git\bin\git.exe" add -A
"C:\Program Files\Git\bin\git.exe" commit -m "fix: toFixed error em media_mensal"
"C:\Program Files\Git\bin\git.exe" push origin main
echo DONE > git-result.txt
