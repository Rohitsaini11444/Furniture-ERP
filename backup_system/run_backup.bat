@echo off
setlocal
cd /d "C:\Users\User\Desktop\ERP Furniture"
"C:\Users\User\Desktop\ERP Furniture\.venv\Scripts\python.exe" "C:\Users\User\Desktop\ERP Furniture\backup_system\cli.py" --run %*
exit /b %ERRORLEVEL%
