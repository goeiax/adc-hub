#!/bin/sh
# Jalankan ADC Hub di Linux/macOS (padanan start.bat). Biarkan jendela terbuka selama klinik buka,
# atau pasang sebagai layanan systemd dengan linux/pasang-service.sh supaya hidup sendiri saat boot.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js belum terpasang. Pasang Node.js LTS (nodejs.org atau paket distro), lalu jalankan lagi."
  exit 1
fi
exec node server.js
