# Rencana akses ADC Hub dari luar klinik dengan Tailscale — untuk IT

**Status:** Tahap 0 (kode hub) selesai 12 Nov 2026; Tahap 1–4 belum dijalankan. Server harus
memakai versi hub terbaru sebelum Tahap 2.

## 1. Tujuan dan batasan

- **Tujuan:** 3 PC dan 3 iPad milik klinik bisa membuka ADC Hub dari jaringan mana pun
  (Wi-Fi lain, rumah, data seluler) lewat **satu alamat https tetap**, tanpa membuka hub ke
  internet publik.
- **Cara:** Tailscale (VPN pribadi). Hanya perangkat yang didaftarkan pemilik yang bisa
  menjangkau server hub.
- **Tidak berubah:** perangkat di dalam klinik tetap bisa memakai alamat lokal
  `http://adc-hub.lan:3777/` (lihat `JARINGAN-KLINIK.md`). Hub tetap **tidak** di-port-forward.
- **Biaya:** paket gratis Tailscale dihitung per **pengguna**, bukan per perangkat. Satu akun
  (pemilik klinik) untuk server + 3 PC + 3 iPad = 1 pengguna, 7 perangkat.
  *Catatan:* paket gratis disebut untuk pemakaian pribadi; bila klinik ingin sepenuhnya sesuai
  ketentuan, paket berbayar ±US$8 per pengguna per bulan. Periksa halaman harga resmi
  Tailscale sebelum memutuskan.

## 2. Gambaran

```
PC / iPad (Tailscale aktif)  ──terenkripsi──►  Server hub Linux (Tailscale)
        https://adc-hub.<tailnet>.ts.net/            │ tailscale serve :443
                                                     ▼
                                          ADC Hub  http://127.0.0.1:3777
```

Sertifikat https diterbitkan otomatis oleh Tailscale (Let's Encrypt). Tidak ada sertifikat
yang perlu dipasang di perangkat.

## 3. Pembagian tugas

| Siapa | Tugas |
|---|---|
| Pemilik klinik | Membuat akun Tailscale, mengaktifkan verifikasi 2 langkah, menyetujui tiap perangkat, mencabut perangkat yang hilang |
| IT | Tahap 1–4 di bawah, dokumentasi alamat, uji |
| Pengembang | Tahap 0 (perubahan kode hub), skrip `akses-luar` |
| Penanggung jawab klinik | Menyetujui bahwa rekam medis dapat diakses dari luar gedung lewat VPN |

## 4. Tahapan

### Tahap 0 — Persiapan hub (pengembang) — **selesai 12 Nov 2026**

Sudah ada di kode hub. **Syarat sebelum Tahap 2:** server memakai versi hub terbaru
(`git pull` cabang `main` setelah perubahan ini digabung, lalu `sudo systemctl restart adc-hub`).

- [x] Log audit mencatat alamat perangkat yang sebenarnya saat permintaan datang lewat
      `tailscale serve` (`X-Forwarded-For` dipercaya hanya dari proxy di mesin yang sama).
- [x] Pembatasan percobaan PIN: 8 kali salah dalam 15 menit → terkunci 15 menit
      (login dan tanda tangan dokter); admin membuka kunci dengan mengatur ulang PIN.
      Bisa diubah di `config.json`: `login_maks`, `login_menit`.
- [x] Cross-origin diperketat: hanya halaman dari hub sendiri, form berkas lokal, dan
      localhost. Asal tambahan: `"cors_asal": ["https://…"]` di `config.json`.
- [x] Skrip `akses-luar.sh` (Linux) dan `akses-luar.bat` (Windows) — menjalankan langkah 2.5–2.6.

### Tahap 1 — Akun dan kebijakan (pemilik + IT, ±20 menit)

- [ ] **1.1** Pemilik membuat akun di https://login.tailscale.com dengan email pemilik.
      Aktifkan **verifikasi 2 langkah** pada akun email itu.
- [ ] **1.2** Admin console ▸ **DNS**: aktifkan **MagicDNS** dan **HTTPS Certificates**.
- [ ] **1.3** Admin console ▸ **Settings ▸ Device management**: aktifkan
      **Device approval** (perangkat baru harus disetujui pemilik).
- [ ] **1.4** Admin console ▸ **Access controls**: batasi supaya perangkat hanya bisa
      menjangkau hub di port 443, dan tidak bisa saling menjangkau. Contoh kebijakan
      (sesuaikan lalu simpan; konsol akan menolak bila ada salah tulis):

  ```json
  {
    "tagOwners": { "tag:hub": ["autogroup:admin"] },
    "acls": [
      { "action": "accept", "src": ["autogroup:member"], "dst": ["tag:hub:443"] }
    ]
  }
  ```

### Tahap 2 — Server hub Linux (IT, ±20 menit)

- [ ] **2.1** Pasang Tailscale:
      `curl -fsSL https://tailscale.com/install.sh | sh`
- [ ] **2.2** Sambungkan dan beri nama serta tag:
      `sudo tailscale up --hostname=adc-hub --advertise-tags=tag:hub`
      → buka tautan yang muncul, login dengan akun pemilik, setujui perangkat.
- [ ] **2.3** Di admin console ▸ Machines ▸ `adc-hub` ▸ **Disable key expiry**
      (server tidak boleh putus tiap 180 hari).
- [ ] **2.4** Pastikan hub berjalan **http biasa** di port 3777 (tidak ada `hub.pfx` di
      folder hub). Https ditangani Tailscale.
- [ ] **2.5** Nyalakan jembatan https (permanen, bertahan setelah reboot):
      `sudo tailscale serve --bg --https=443 http://127.0.0.1:3777`
- [ ] **2.6** Catat alamatnya: `tailscale serve status`
      → `https://adc-hub.<nama-tailnet>.ts.net/` Alamat: `______________________________`
- [ ] **2.7** Firewall server tidak perlu membuka port tambahan ke internet.
      Port 3777 tetap hanya untuk jaringan lokal klinik.

### Tahap 3 — Perangkat (IT, ±5 menit per perangkat)

Ulangi untuk 3 PC dan 3 iPad.

- [ ] **3.1** Pasang Tailscale (Windows: tailscale.com/download · iPad: App Store).
- [ ] **3.2** Login dengan **akun pemilik** → pemilik menyetujui perangkat di admin console.
- [ ] **3.3** Beri nama perangkat yang jelas (mis. `pc-dr-ani`, `ipad-perawat-1`).
- [ ] **3.4** Buka alamat `https://adc-hub.<tailnet>.ts.net/` → halaman "Pilih form".
- [ ] **3.5** Masukkan **kunci hub** dan **masuk** dengan ID + PIN staf (alamat baru dianggap
      situs baru oleh browser).
- [ ] **3.6** PC dokter: izinkan **pop-up** untuk alamat ini (cetak consent).
- [ ] **3.7** Buat pintasan: iPad ▸ Bagikan ▸ *Add to Home Screen*; PC ▸ bookmark.

| Perangkat | Nama di Tailscale | Pemakai | Disetujui ✓ | Kunci hub ✓ | Uji ✓ |
|---|---|---|---|---|---|
| PC 1 | | | | | |
| PC 2 | | | | | |
| PC 3 | | | | | |
| iPad 1 | | | | | |
| iPad 2 | | | | | |
| iPad 3 | | | | | |

### Tahap 4 — Uji (IT + satu dokter, ±20 menit)

- [ ] **4.1** Dari iPad dengan **data seluler** (Wi-Fi mati): hub terbuka, chip HUB hijau.
- [ ] **4.2** Form 1: simpan pasien uji `RM-UJI-TS` → "✓ tersimpan di hub".
- [ ] **4.3** Form 2: Muat Form 1 `RM-UJI-TS`, tanda tangan PIN, Terbitkan → tersimpan.
- [ ] **4.4** Dari perangkat **tanpa** Tailscale: alamat `ts.net` **tidak** terbuka.
- [ ] **4.5** Matikan Tailscale di satu iPad: hub tidak terbuka; nyalakan lagi: terbuka.
- [ ] **4.6** Reboot server: `tailscale serve status` masih aktif, hub terbuka dari luar.
- [ ] **4.7** Periksa log audit hub (admin): alamat perangkat tercatat berbeda-beda,
      bukan `127.0.0.1` semua.
- [ ] **4.8** Hapus folder data pasien uji `RM-UJI-TS` di server.

## 5. Aturan keamanan setelah berjalan

- Perangkat **hilang / dipindahtangankan / staf keluar** → pemilik menghapus perangkatnya di
  admin console ▸ Machines **hari itu juga**, dan admin hub menonaktifkan akun stafnya.
- Hanya perangkat **milik klinik** yang didaftarkan. Jangan login akun Tailscale klinik di
  HP pribadi staf.
- Tiap perangkat memakai kunci layar (PIN / Face ID). iPad tidak ditinggal tanpa terkunci.
- PIN hub tetap pribadi; PIN dokter adalah tanda tangan elektroniknya.
- Berkas unduhan `Intake_…` dan `Asesmen_…` di perangkat berisi data pasien: pindahkan ke
  rekam medis lalu hapus dari folder Unduhan secara berkala.
- Bila internet klinik mati, alamat `ts.net` ikut mati. Perangkat di dalam klinik beralih ke
  alamat lokal `http://adc-hub.lan:3777/`.

## 6. Mematikan / mundur

- Hentikan akses luar seketika: `sudo tailscale serve --https=443 off`
- Putuskan server dari Tailscale: `sudo tailscale down`
- Hub dan alamat lokal klinik tidak terpengaruh oleh kedua perintah ini.

## 7. Yang perlu diputuskan pemilik sebelum mulai

- [ ] Email akun Tailscale yang dipakai: `______________________`
- [ ] Paket: gratis / berbayar 1 pengguna
- [ ] Daftar 3 PC dan 3 iPad beserta pemakainya (tabel Tahap 3)
- [ ] Persetujuan penanggung jawab klinik atas akses rekam medis dari luar gedung
- [ ] Tanggal pelaksanaan (di luar jam praktik): `______________`

---

Disusun: 12 November 2026 · Acuan: `AKSES-LUAR.md` pada aplikasi Produksi Warna Aseli,
`JARINGAN-KLINIK.md`, `UJI_COBA_KLINIK.md`.
