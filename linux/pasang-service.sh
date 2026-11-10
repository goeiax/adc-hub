#!/bin/sh
# ============================================================================
# pasang-service.sh — pasang ADC Hub sebagai layanan systemd (hidup sendiri saat boot, restart bila jatuh).
# Padanan "shortcut start.bat di folder Startup" pada Windows. Jalankan dari folder adc-hub:
#   sudo sh linux/pasang-service.sh            # layanan jalan sebagai pengguna yang memanggil sudo
#   sudo sh linux/pasang-service.sh adc        # ...atau sebagai pengguna "adc" (harus sudah ada & pemilik folder)
# Sesudahnya:  sudo systemctl status adc-hub   |  sudo journalctl -u adc-hub -f  (lihat URL, Kunci, PIN admin pertama)
# Hapus:       sudo systemctl disable --now adc-hub && sudo rm /etc/systemd/system/adc-hub.service
# ============================================================================
set -e
[ "$(id -u)" = 0 ] || { echo "jalankan dengan sudo"; exit 1; }
cd "$(dirname "$0")/.." || exit 1
DIR="$(pwd)"
USR="${1:-${SUDO_USER:-root}}"
id "$USR" >/dev/null 2>&1 || { echo "pengguna $USR tidak ada"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js belum terpasang (node tidak ditemukan di PATH)"; exit 1; }
command -v systemctl >/dev/null 2>&1 || { echo "systemd tidak ada di sistem ini — jalankan ./start.sh lewat cara lain (cron @reboot, supervisor)"; exit 1; }

# backup_dir dari config.json (bila sudah diisi) ikut diizinkan untuk ditulis
BK="$(node -e "try{const c=require('$DIR/config.json');process.stdout.write(c.backup_dir||'')}catch(e){}" 2>/dev/null || true)"
[ -n "$BK" ] && mkdir -p "$BK" && chown "$USR" "$BK"

# folder hub harus bisa ditulis layanan (data/, config.json, users.json, _sesi)
chown -R "$USR" "$DIR"

sed -e "s#__DIR__#$DIR#g" -e "s#__USER__#$USR#g" -e "s#__BACKUP__#$BK#g" linux/adc-hub.service > /etc/systemd/system/adc-hub.service
systemctl daemon-reload
systemctl enable --now adc-hub
sleep 2
systemctl --no-pager --lines=0 status adc-hub || true
echo
echo "Layanan terpasang. Log (URL, Kunci, PIN admin pertama): sudo journalctl -u adc-hub -n 40"
echo "Firewall: ufw allow 3777/tcp  (atau firewall-cmd --add-port=3777/tcp --permanent && firewall-cmd --reload)"
