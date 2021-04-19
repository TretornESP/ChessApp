@echo off
git add .
echo committing: %1
git commit -m %1
git push origin main
@echo on
