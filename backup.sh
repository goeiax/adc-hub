#!/bin/sh
# Cadangan manual ADC Hub ke backup_dir (config.json). Server tidak perlu dimatikan.
# Cadangan otomatis juga jalan tiap backup_jam jam selama server hidup.
cd "$(dirname "$0")" || exit 1
exec node server.js --backup
