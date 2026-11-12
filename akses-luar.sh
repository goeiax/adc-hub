#!/bin/sh
# Jembatan akses-luar (Tailscale) untuk ADC Hub. Aman dijalankan berulang kali.
# Baca RENCANA-AKSES-LUAR-TAILSCALE.md (Tahap 1 harus sudah selesai: akun, MagicDNS, HTTPS Certificates).
# Pakai:  sudo sh akses-luar.sh          (port hub dari config.json, default 3777)
#         sudo sh akses-luar.sh mati     (hentikan akses luar)
cd "$(dirname "$0")" || exit 1
command -v tailscale >/dev/null 2>&1 || { echo "Tailscale belum terpasang:  curl -fsSL https://tailscale.com/install.sh | sh"; exit 1; }
if [ "$1" = "mati" ]; then tailscale serve --https=443 off && echo "Akses luar dimatikan. Alamat lokal klinik tidak terpengaruh."; exit $?; fi
PORT="$(node -e "try{process.stdout.write(String(require('./config.json').port||3777))}catch(e){process.stdout.write('3777')}" 2>/dev/null || echo 3777)"
[ -f hub.pfx ] && echo "PERINGATAN: hub.pfx ada, hub berjalan di https. Di belakang Tailscale hub harus http biasa: pindahkan hub.pfx lalu restart hub."
tailscale status >/dev/null 2>&1 || { echo "Server belum tersambung ke Tailscale. Jalankan:  sudo tailscale up --hostname=adc-hub --advertise-tags=tag:hub"; exit 1; }
echo "Menyalakan jembatan https ke hub (port $PORT)..."
tailscale serve --bg --https=443 "http://127.0.0.1:$PORT" || { echo "Gagal. Pastikan MagicDNS dan HTTPS Certificates aktif di https://login.tailscale.com/admin/dns"; exit 1; }
echo
tailscale serve status
echo
echo "Alamat di atas (https://adc-hub.<tailnet>.ts.net/) berfungsi dari jaringan mana pun untuk perangkat yang sudah login Tailscale."
