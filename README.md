# ADC Hub — companion server Skin Quality Program

Server kecil di **satu PC klinik** yang (1) menyajikan Form 1, Form 2 & Panduan
ke semua tablet lewat satu alamat, dan (2) menyimpan intake & handoff pasien
dengan **No. RM** sebagai kunci — bukan lagi lewat unduh/unggah berkas manual.
Unduhan berkas di form tetap jalan sebagai cadangan; hub mati = form tetap bisa
dipakai dengan berkas.

Tanpa dependensi: **Node.js LTS + folder ini** = seluruh instalasi. Tidak ada
`npm install` (kecuali modul NeoSoft opsional di bawah).

---

> **Uji coba di klinik:** ikuti **[UJI_COBA_KLINIK.md](UJI_COBA_KLINIK.md)** — versi terbaru dari langkah di bawah, sudah termasuk akun staf (ID + PIN), cadangan otomatis, HTTPS dan uji serah-terima.

## A. Instalasi (checklist untuk IT) — ±20 menit

1. **Pilih PC hub**: PC yang menyala selama jam klinik, di LAN yang sama dengan
   tablet. Beri **IP statis / DHCP reservation** — alamat ini akan disimpan di
   tiap tablet, jangan sampai berubah.
2. Instal **Node.js LTS** (nodejs.org, next-next-finish). Cek: buka Command
   Prompt → `node -v` menampilkan versi.
3. Salin folder `adc-hub` ke PC itu (mis. `C:\adc-hub`). Isi wajib:
   `server.js`, `start.bat`, folder `www\` (berisi 3 file HTML + index.html).
4. Klik dua kali **`start.bat`**. Jendela hitam menampilkan **URL** dan
   **Kunci** (kunci juga tersimpan di `config.json`).
5. **Windows Firewall** akan bertanya saat pertama kali — centang **Private
   networks** → Allow. Bila terlewat: Windows Defender Firewall → Allow an app →
   Node.js → Private ✓. (Tanpa ini tablet tidak bisa mengakses.)
6. Verifikasi di PC hub: buka `http://localhost:3777/` → halaman "Pilih form",
   status "tersambung ✓".
7. Verifikasi dari **tablet**: buka `http://<IP-PC-hub>:3777/` → halaman yang
   sama. Bookmark / tambahkan ke layar utama di tiap tablet.
8. Buka Form 2 dari tablet, klik chip **HUB** di bilah atas → alamat sudah terisi
   otomatis (origin halaman); isi **Kunci** dari jendela server → chip hijau.
   Ulangi sekali per perangkat (tersimpan di browser perangkat itu).
9. **Auto-start**: taruh shortcut `start.bat` di folder Startup
   (`Win+R` → `shell:startup`), atau Task Scheduler "At log on".
10. **Backup**: jadwalkan salin folder `data\` (mis. tiap malam ke NAS/drive).
    Isinya JSON polos, satu subfolder per RM. Itu rekam medis — perlakukan
    seperti rekam medis.

### Uji serah-terima (5 menit, bersama perawat)
Form 1 dari tablet → isi RM uji `RM-TEST-001` + nama → Simpan Data Pasien →
di PC hub muncul folder `data\RM-TEST-001\intake.json`. Lalu Form 2 → Muat Form 1
→ ketik `RM-TEST-001` → identitas terisi. Hapus folder uji setelahnya.

### Memperbarui form
Form yang disajikan adalah salinan di `www\`. Saat ada versi form baru, jalankan
**`update-forms.bat`** (menyalin dari folder induk) — server tidak perlu
di-restart; tablet cukup refresh.

---

## B. Cara kerja singkat (untuk staf)
- Alamat hub = alamat halaman form; chip **HUB** hijau = tersambung.
- **Simpan Data Pasien** (Form 1) dan **Terbitkan Handoff** (Form 2) otomatis
  ikut ke hub. Berkas unduhan **tetap dibuat** — cadangan resmi, tetap
  dilampirkan ke rekam medis.
- **Muat Form 1 / Muat Handoff**: ketik No. RM. Tidak ketemu → form menawarkan
  pemilih berkas seperti biasa.

## C. Keamanan
- **LAN saja.** Jangan pernah port-forward 3777 ke internet.
- Kunci di `config.json`; ganti bila bocor → restart → perbarui di tiap tablet.
- Data pasien = data pribadi (UU PDP). Batasi login PC hub; enkripsi disk
  (BitLocker) dianjurkan.
- Hub tidak menulis apa pun ke NeoSoft.

## D. NeoSoft Cube — pembacaan database (opsional, Tahap 2)
NeoSoft tetap sumber kebenaran untuk identitas, jadwal, kasir, dan RM resmi.
Dengan akses **baca** ke database NeoSoft, hub bisa mengambil identitas pasien
by RM (perawat tidak mengetik ulang). **Baca-saja — tidak pernah menulis.**

Di PC hub (koneksi DB hanya jalan dari jaringan yang diizinkan NeoSoft):
1. `npm install mysql2` di folder ini (satu-satunya dependensi, opsional).
2. Salin `neosoft.json.example` → **`neosoft.json`**, isi `password`.
   **Jangan** commit / sinkron / kirim `neosoft.json` — itu kredensial DB.
3. `node neosoft-explore.js > neosoft-skema.txt` — memetakan tabel & kolom
   pasien (baca-saja). Kirim isi `neosoft-skema.txt` untuk memetakan query.
   Boleh sensor nilai contoh (nama/nomor pasien); yang dibutuhkan struktur.
4. Setelah query dipetakan, endpoint `GET /api/neosoft/:rm` aktif dan form
   pre-isi identitas by RM.

Minta NeoSoft membatasi user DB ke **SELECT saja** dan ke IP klinik.

## E. API (untuk programer)
- `GET  /api/ping` — tanpa kunci (deteksi).
- Header wajib rute lain: `X-ADC-Key: <kunci>`.
- `GET  /api/pasien` — daftar ringkas.
- `GET  /api/pasien/:rm` — `{intake, handoff_terakhir, jumlah_handoff}`.
- `POST /api/intake` — body JSON `ADC-INTAKE` (keluaran Form 1).
- `POST /api/handoff` — body JSON `ADC-HANDOFF` (keluaran Form 2); semua
  versi disimpan `handoff_<waktu>.json` + penunjuk `handoff_terakhir.json`.
- Selain `/api/*` → berkas statis dari `www\` (HTML/CSS/JS/gambar saja).
- Log akses satu baris per permintaan tampil di jendela server.

## F. Pemecahan masalah
| Gejala | Penyebab umum |
|---|---|
| Tablet tidak bisa buka `http://IP:3777/` | Firewall Node belum diizinkan (Private), atau tablet di Wi-Fi berbeda/guest, atau IP hub berubah |
| Chip HUB merah "kunci salah" | Kunci di tablet ≠ `config.json` |
| Simpan berhasil tapi tidak ada di hub | RM kosong di panel staf (hub menolak tanpa RM — lihat log server) |
| Halaman lama setelah update form | Refresh paksa (Ctrl+F5) di tablet; pastikan `update-forms.bat` sudah dijalankan |
