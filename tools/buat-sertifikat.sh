#!/bin/sh
# ============================================================================
# buat-sertifikat.sh — sertifikat HTTPS self-signed untuk ADC Hub (Linux/macOS, butuh openssl)
# Padanan tools/buat-sertifikat.ps1. Jalankan dari folder adc-hub:
#   sh tools/buat-sertifikat.sh hub-adc 192.168.1.10 [IP-lain ...]
# Hasil: hub.pfx (passphrase kosong) di folder adc-hub -> server.js otomatis jalan di HTTPS;
#        hub.cer (DER) untuk dipasang sebagai sertifikat tepercaya di tablet/PC bila ingin tanpa peringatan.
# Berlaku 5 tahun; ulangi bila IP hub berubah. Hub perlu di-restart setelah ini.
# ============================================================================
set -e
NAMA="${1:-adc-hub}"; shift 2>/dev/null || true
cd "$(dirname "$0")/.." || exit 1
command -v openssl >/dev/null 2>&1 || { echo "openssl belum terpasang (apt install openssl / dnf install openssl)"; exit 1; }

SAN="DNS:$NAMA,DNS:localhost,IP:127.0.0.1"
for ip in "$@"; do SAN="$SAN,IP:$ip"; done

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
openssl req -x509 -newkey rsa:2048 -sha256 -days 1825 -nodes \
  -keyout "$TMP/hub.key" -out "$TMP/hub.crt" \
  -subj "/CN=ADC Hub $NAMA" -addext "subjectAltName=$SAN" \
  -addext "keyUsage=digitalSignature,keyEncipherment" -addext "extendedKeyUsage=serverAuth" >/dev/null 2>&1
# PKCS#12 tanpa passphrase, algoritma yang dibaca Node.js (OpenSSL 3) tanpa modul legacy
openssl pkcs12 -export -out hub.pfx -inkey "$TMP/hub.key" -in "$TMP/hub.crt" \
  -name "ADC Hub $NAMA" -passout pass: \
  -keypbe AES-256-CBC -certpbe AES-256-CBC -macalg sha256
openssl x509 -in "$TMP/hub.crt" -outform der -out hub.cer
chmod 600 hub.pfx
echo "Sertifikat dibuat: $(pwd)/hub.pfx (SAN: $SAN) dan hub.cer untuk tablet/PC."
echo "Restart hub (./start.sh atau: sudo systemctl restart adc-hub)."
