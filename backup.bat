@echo off
rem Cadangan manual ADC Hub ke backup_dir (config.json). Server tidak perlu dimatikan.
rem Cadangan otomatis juga jalan tiap backup_jam jam selama server hidup.
cd /d "%~dp0"
node server.js --backup
pause
