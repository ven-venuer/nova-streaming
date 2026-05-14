@echo off
cd /d "%~dp0"

git add .
git commit -m "Updated files"
git push

pause