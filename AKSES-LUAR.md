# Akses ADC Hub dari luar klinik — ringkasan pemakaian

ADC Hub **tidak dibuka ke internet publik**. Dari luar klinik hub dijangkau lewat **Tailscale**
(VPN pribadi): hanya perangkat klinik yang didaftarkan pemilik yang bisa tersambung.
Pemasangan lengkap untuk IT: [RENCANA-AKSES-LUAR-TAILSCALE.md](RENCANA-AKSES-LUAR-TAILSCALE.md).

## Untuk staf

1. Pastikan aplikasi **Tailscale** di PC / iPad dalam keadaan **menyala** (Connected).
2. Buka alamat hub: `https://adc-hub.<tailnet>.ts.net/` (pintasan di layar utama).
3. Masuk dengan **ID dan PIN** Anda seperti biasa.

Di dalam klinik, alamat lokal `http://adc-hub.lan:3777/` tetap bisa dipakai dan tidak
bergantung pada internet.

## Yang perlu diingat

- **PIN salah 8 kali dalam 15 menit → terkunci 15 menit.** Admin bisa membuka kunci dengan
  mengatur ulang PIN di halaman *Pengguna & peran*.
- Alamat `ts.net` dan alamat lokal dianggap dua situs berbeda oleh browser: kunci hub dan
  login diisi sekali untuk masing-masing.
- Internet klinik mati → alamat `ts.net` ikut mati; pakai alamat lokal di dalam klinik.
- Perangkat hilang atau berpindah tangan → **lapor pemilik hari itu juga**; perangkat dicabut
  dari Tailscale dan akun hub dinonaktifkan.
- Jangan login akun Tailscale klinik di perangkat pribadi.

## Untuk IT / pemilik

| Keperluan | Perintah (di server hub) |
|---|---|
| Menyalakan akses luar | `sudo sh akses-luar.sh` (Windows: `akses-luar.bat`) |
| Melihat alamat & status | `tailscale serve status` |
| Mematikan akses luar | `sudo sh akses-luar.sh mati` |
| Mencabut satu perangkat | https://login.tailscale.com/admin/machines |
| Mengubah batas percobaan PIN | `config.json`: `"login_maks": 8, "login_menit": 15`, lalu restart hub |

Di belakang Tailscale, hub harus berjalan **http biasa** (tanpa `hub.pfx`); https ditangani
Tailscale dengan sertifikat resmi.
