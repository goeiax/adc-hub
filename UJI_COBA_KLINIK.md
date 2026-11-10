# Uji coba ADC Hub di klinik — panduan pemasangan

Panduan ini untuk IT klinik dan penanggung jawab uji coba. Tujuannya: hub berjalan di
satu PC klinik, tablet perawat dan dokter tersambung lewat Wi-Fi klinik, setiap staf
masuk dengan ID + PIN sendiri, dan data pasien tercadangkan otomatis. Perkiraan waktu:
45 menit pemasangan + 15 menit uji serah-terima bersama perawat.

Hub adalah pendukung, bukan pengganti NeoSoft Cube. Rekam medis resmi tetap di NeoSoft;
lembar cetak dan handoff dari hub dilampirkan ke sana seperti biasa.

---

## 0. Yang disiapkan sebelum hari H

| Butuh | Catatan |
|---|---|
| **1 PC hub** (Windows) | Menyala selama jam klinik, di Wi-Fi/LAN yang **sama** dengan tablet (bukan Wi-Fi tamu). Minta IT memberi **IP statis / DHCP reservation**, karena alamat ini disimpan di tiap tablet. |
| **Node.js LTS** | Unduh dari nodejs.org, pasang next-next-finish. Cek di Command Prompt: `node -v`. |
| **Folder `adc-hub`** dari PC pengembangan | Salin **tanpa** `data\`, `config.json`, `users.json`, `hub.pfx` (lihat §1). Isi wajib: `server.js`, `start.bat`, `backup.bat`, folder `www\` (5 HTML + index), folder `tools\`. |
| **Perangkat staf** | Perawat: tablet (Chrome Android / Safari iPad) **atau** PC meja registrasi. Dokter: **PC di tiap ruang konsultasi** (Chrome atau Edge). Semua di jaringan klinik yang sama dengan PC hub. PC hub boleh sekaligus PC meja perawat. |
| **Printer** | Satu printer jaringan di meja perawat (lihat §9). Semua cetakan dari PC dokter dan tablet keluar di situ. |
| **Tempat cadangan** | Folder di drive lain / NAS / folder OneDrive-Drive di PC hub. Diisi ke `backup_dir` (§1). |
| **Daftar staf** | Nama lengkap + peran (dokter / perawat / cs) untuk dibuatkan akun. PIN dokter = tanda tangan elektroniknya, jadi dokter memilih sendiri dan tidak dibagikan. |

---

## 1. Pasang & nyalakan hub (PC hub)

1. Salin folder ke `C:\adc-hub`. **Jangan** ikutkan `data\`, `config.json`, `users.json`
   dari PC pengembangan: itu data uji dan kunci uji. Hub membuat yang baru saat pertama jalan.
2. Klik dua kali **`start.bat`**. Jendela hitam menampilkan:
   - `URL` dan **`Kunci`** → kunci perangkat, dicatat untuk didaftarkan di tiap tablet (§3).
   - Baris `*** PENGGUNA PERTAMA dibuat: id "admin", PIN ...` → **hanya tampil sekali.** Catat.
   - `Backup: BELUM DIATUR` → diatur di langkah 4.
3. **Windows Firewall** bertanya "Allow Node.js…" → centang **Private networks** → Allow.
   Bila terlewat: Windows Defender Firewall → Allow an app → Node.js → Private ✓.
   Tanpa ini tablet tidak akan bisa membuka hub.
4. Tutup jendela hub (Ctrl+C), buka `config.json` dengan Notepad, isi:
   ```json
   "backup_dir": "D:\\ADC-Backup",
   "backup_jam": 6,
   "backup_simpan": 14
   ```
   Cadangan `data\` dibuat saat hub mulai dan tiap 6 jam; 14 salinan terakhir disimpan.
   `backup.bat` = cadangan manual kapan saja. Isi cadangan terenkripsi; **`config.json`
   adalah kuncinya** — simpan salinan `config.json` di tempat terpisah yang aman
   (USB di laci terkunci / password manager pimpinan). Hilang `config.json` = data tidak
   bisa dibaca lagi.
5. Ganti PIN admin:
   ```
   node tools\pengguna.js pin admin <pin-baru-6-digit>
   ```
6. (Dianjurkan, 10 menit) **HTTPS** supaya PIN tidak lewat jaringan polos. PowerShell
   **sebagai Administrator** di `C:\adc-hub`:
   ```
   powershell -ExecutionPolicy Bypass -File tools\buat-sertifikat.ps1 -Nama hub-adc -IP 192.168.1.10
   ```
   (ganti IP dengan IP PC hub, lihat `ipconfig` → IPv4 Address). Hasil `hub.pfx` →
   hub otomatis jalan di `https://`. Di tiap tablet, buka `https://IP:3777` sekali dan
   terima peringatan sertifikat, atau pasang `hub.cer` sebagai sertifikat tepercaya.
   Ulangi bila IP hub berubah. Tanpa HTTPS hub tetap jalan di `http://` dalam LAN.
7. Jalankan `start.bat` lagi. Di PC hub buka `http://localhost:3777/` (atau https) →
   halaman "Pilih form", baris bawah **"Hub: tersambung ✓"**.
8. **Auto-start**: `Win+R` → `shell:startup` → taruh shortcut `start.bat` di situ.
   Hub hidup tiap PC dinyalakan. Biarkan jendelanya terbuka (boleh di-minimize).

Keamanan dasar PC hub: BitLocker aktif, akun Windows berkata sandi, layar terkunci
otomatis, **jangan pernah** port-forward 3777 ke internet.

---

## 2. Buat akun staf (PC hub, Command Prompt di `C:\adc-hub`)

```
node tools\pengguna.js tambah dr.sari  "dr. Sari Dewi, Sp.DVE"  dokter  482913
node tools\pengguna.js tambah dr.budi  "dr. Budi, Sp.GK"        dokter  715204
node tools\pengguna.js tambah ns.rina  "Ns. Rina"               perawat 309861
node tools\pengguna.js tambah cs.dina  "Dina (CS)"              cs      558012
node tools\pengguna.js daftar
```

- Peran: `admin` (kelola pengguna, audit, koreksi >2×24 jam), `dokter` (asesmen, PIN
  tanda tangan), `perawat` (Form 1, jadwal, terbitkan handoff), `cs` (lihat & cetak saja).
- PIN 4–8 digit; dianjurkan 6. PIN dokter dipilih dokter sendiri; biarkan dokter mengetik
  PIN-nya saat akun dibuat, atau buat PIN sementara lalu dokter mengganti lewat admin.
- Ganti PIN: `pin <id> <baru>`. Staf keluar: `nonaktif <id>` (riwayat tanda tangan tetap).
- Nama pada akun dokter muncul otomatis sebagai "Dokter pemeriksa" dan pada stempel
  tanda tangan, jadi tulis gelar lengkap sesuai yang ingin tercetak.

---

## 3. Daftarkan tiap perangkat — tablet maupun PC (sekali per perangkat, ±3 menit)

Langkah di bawah sama untuk PC dokter: buka alamat hub di Chrome/Edge, buat **shortcut
di desktop** (Chrome: ⋮ → *Simpan dan bagikan* → *Buat pintasan*, centang "Buka sebagai
jendela"), lalu daftarkan kunci dan Masuk lewat chip HUB. Di PC dokter sekalian
**izinkan pop-up** untuk alamat hub (§9), karena lembar consent dan lembar program dibuka
di jendela baru untuk dicetak.

1. Tablet di Wi-Fi klinik. Buka `http://<IP-PC-hub>:3777/` (contoh `http://192.168.1.10:3777/`).
   Halaman "Pilih form" tampil → **tambahkan ke layar utama**
   (Chrome: ⋮ → *Tambahkan ke Layar Utama*; Safari: Bagikan → *Add to Home Screen*).
2. Buka **Form 2**. Chip **HUB** di bilah atas berwarna kuning bertuliskan *belum terdaftar*
   → ketuk → dialog *Atur hub*: alamat sudah terisi, masukkan **Kunci** dari jendela hub
   → Simpan. Chip berganti *belum masuk*.
3. Ketuk chip lagi → **Masuk**: ID + PIN staf yang biasa memakai tablet itu
   (tablet registrasi: perawat; tablet konsultasi: dokter ruangan itu). Chip hijau
   menampilkan nama. Sesi bertahan walau tablet atau hub dimatikan; ID terakhir diingat.
4. Buka **Form 1** dari layar utama → chip HUB hijau juga (kunci dan sesi dipakai bersama
   oleh semua form di tablet itu).
5. Dokter yang berpindah ruangan cukup ketuk chip → Masuk dengan ID-nya; sesi lama di tablet
   itu tergantikan.

Bila hub memakai HTTPS, pakai `https://` pada langkah 1 dan terima peringatan sertifikat
sekali.

---

## 4. Uji serah-terima sebelum pasien pertama (15 menit, bersama perawat & 1 dokter)

Pakai RM uji **RM-UJI-01** dan nama "Pasien Uji".

1. **Tablet registrasi, Form 1** (perawat masuk): panel staf (RM, NIK 16 digit, dokter,
   foto baseline ✓ + izin, BB/TB, alergi) → serahkan ke "pasien": keluhan, program, detail
   P4, gaya hidup, 7 persetujuan, tanda tangan di layar → **Simpan Data Pasien** →
   pesan **"✓ tersimpan di hub klinik (RM RM-UJI-01)"**.
2. **Tablet konsultasi, Form 2** (dokter masuk): **Muat Form 1** → ketik `RM-UJI-01` →
   identitas, alergi dan Ringkasan Anamnesis terisi; nama dokter dari login.
   Isi ICD-10, IGA, buka form program (mis. Acne stage 2 → *Pakai* resep), ritme kontrol,
   centang **Sign-off dokter** → dialog PIN → status "PIN diverifikasi hub".
   **Cetak lembar pasien & informed consent** dari menu Lainnya (uji printer di sini).
3. Serahkan ke perawat (langkah 6 di Form 2): **Buat jadwal kontrol → Simpan jadwal →
   Kirim reminder** (bila SleekFlow/Make belum disambung, lewati tombol 3) →
   **Terbitkan Handoff** → dialog menyebut **"siap — handoff disimpan ke hub"**.
4. **Journey & Outcome Tracker** → Muat dengan `RM-UJI-01` → IGA baseline dan resep tampil.
5. **Kunjungan kontrol**: Form 2 → mode Kontrol → **Muat Handoff** `RM-UJI-01` → data
   kunjungan 1 terbawa.
6. Selesai: di PC hub hapus folder `C:\adc-hub\data\RM-UJI-01` (hub boleh tetap hidup).
   Jejak di log audit tetap ada dan tidak apa-apa.

Bila ada langkah yang gagal, lihat §7 dulu; kalau belum terjawab, foto layarnya dan
kirim beserta baris yang muncul di jendela hub saat itu.

---

## 5. Cara kerja harian selama uji coba

| Siapa | Kapan | Yang dilakukan |
|---|---|---|
| Perawat | Pasien **baru** datang | Form 1 di tablet registrasi → Simpan Data Pasien. Pasien kontrol **tidak** lewat Form 1. |
| Dokter | Konsultasi | Form 2 → Muat Form 1 (baru) / Muat Handoff (kontrol) dengan No. RM → asesmen → form program → sign-off PIN → cetak lembar pasien + consent. |
| Perawat | Setelah dokter | Langkah 6 Form 2: jadwal → simpan → reminder → **Terbitkan Handoff**. Berkas unduhan yang dibuat form adalah cadangan; lampirkan ke NeoSoft bersama cetakan. |
| CS / admin | Kapan saja | Index hub → cari RM → cetak ulang; admin membaca audit dan mengoreksi >2×24 jam. |
| Sp.GK | Program slimming | Asesmen Slimming → Muat Form 1 → terbitkan; handoff tersimpan di hub yang sama. |

Status chip **HUB** yang perlu dikenali staf:

- **Hijau + nama** → semuanya ikut ke hub.
- **Kuning "belum masuk"** → ketuk, Masuk. Simpan/terbitkan juga akan menawarkan Masuk.
- **Merah "kunci salah"** → kunci di tablet ≠ `config.json` (biasanya setelah kunci diganti) → ketuk chip → Atur hub → kunci baru.
- **Abu-abu "hub mati"** → PC hub mati / Wi-Fi putus. **Form tetap bisa dipakai**: Simpan dan Terbitkan membuat berkas JSON di tablet; setelah hub hidup, Form 2 → Muat Form 1 / Muat Handoff → *pilih berkas* → lalu simpan/terbitkan lagi supaya masuk hub.

Lembar yang dicetak dokter dan handoff dari hub dilampirkan ke NeoSoft; pelaporan
SATUSEHAT tetap dari NeoSoft.

---

## 6. Memperbarui form selama uji coba

Form yang dipakai tablet adalah salinan di `C:\adc-hub\www\`. Saat ada versi baru:

1. Dari PC pengembangan, jalankan `update-forms.bat` (menyalin form terbaru ke `www\`),
   lalu salin isi folder `www\` ke `C:\adc-hub\www\` di PC hub (USB / Drive).
2. Hub **tidak perlu** di-restart. Di tablet: tutup tab form dan buka lagi dari layar
   utama (atau refresh paksa). Data pasien tidak tersentuh.

Bila `server.js` yang berubah: salin, lalu tutup jendela hub dan jalankan `start.bat` lagi.
Sesi staf tidak hilang.

---

## 7. Pemecahan masalah

| Gejala | Penyebab & tindakan |
|---|---|
| Tablet tidak bisa membuka `http://IP:3777/` | Firewall Node belum diizinkan untuk *Private*; tablet di Wi-Fi tamu / lain; IP hub berubah (minta reservation). Cek dari PC hub `http://localhost:3777/` dulu. |
| Chip HUB kuning "belum terdaftar" | Kunci belum dimasukkan di tablet itu (§3 langkah 2). |
| Chip "belum masuk" terus padahal sudah Masuk | PIN salah / akun dinonaktifkan → `node tools\pengguna.js daftar` (tanda `X` = nonaktif). |
| Chip merah "kunci salah" | Kunci di `config.json` berbeda → masukkan ulang lewat chip → Atur hub. |
| Simpan berhasil tapi hub menolak | RM kosong di panel staf (hub menolak tanpa RM); atau intake disimpan ulang >2×24 jam oleh bukan-admin (403) → minta admin. |
| Sign-off berbunyi "sign-off dicatat tanpa tanda tangan PIN" | Tablet belum terdaftar / hub tak terjangkau saat itu. Tombol *Daftarkan tablet…* → masukkan kunci → centang ulang untuk PIN. |
| Peringatan sertifikat di tablet (HTTPS) | Normal untuk sertifikat buatan sendiri; terima sekali, atau pasang `hub.cer` sebagai tepercaya. |
| Halaman lama setelah form diperbarui | Tutup tab & buka lagi dari layar utama; pastikan `www\` di PC hub sudah ditimpa. |
| Lupa PIN admin | `node tools\pengguna.js pin admin <baru>` di PC hub (butuh akses PC hub). |
| Printer tidak muncul di PC dokter | Printer jaringan: cek IP printer & tambahkan manual by IP (§8A). Printer bagi-pakai: PC perawat mati / profil jaringan *Public* / sharing belum aktif (§8B). |
| "Pop-up masih diblokir browser" saat cetak consent / program | Izinkan pop-up untuk alamat hub di Chrome/Edge (§8), lalu klik lagi. |
| Cetakan terpotong / tanpa warna pita | Kertas bukan A4, atau *Background graphics* tidak dicentang di dialog cetak. |

---

## 8. Printer: satu printer di meja perawat untuk semua

Hub **tidak** mencetak. Tombol *Cetak* di form memakai dialog cetak browser perangkat
yang menekannya, jadi printer harus terlihat oleh **tiap PC dokter** dan (bila perlu)
oleh tablet. Cara paling mudah: satu printer **jaringan** di meja perawat.

**A. Printer jaringan (dianjurkan)** — printer punya port LAN/Wi-Fi (hampir semua printer
kantor; cari logo *Mopria* / *AirPrint* di spesifikasi).

1. Sambungkan printer ke jaringan klinik; minta IT memberi **IP statis** (sama seperti PC hub).
2. **Setiap PC dokter & PC perawat**: Settings → Bluetooth & devices → Printers & scanners →
   *Add device*. Bila tidak muncul otomatis: *Add manually* → *Add a printer using an IP
   address* → isi IP printer → Next (Windows mengunduh driver). Jadikan **default**,
   lalu *Printing preferences* → ukuran kertas **A4** (lembar form memakai A4).
3. **Tablet Android**: Settings → Connected devices → Printing → *Default Print Service*
   aktif → printer muncul sendiri. **iPad**: AirPrint otomatis; tombol Cetak di Safari
   langsung menampilkan printer itu.
4. Uji dari tiap perangkat: Form 2 → Lainnya → *Cetak / Simpan PDF* → pilih printer → cetak
   satu halaman. Lembar keluar di meja perawat.

**B. Printer USB ke PC meja perawat (bila printer tidak punya jaringan)**

1. Colok printer ke PC meja perawat (boleh PC hub). Pasang driver, cetak uji.
2. Bagikan: Settings → Printers & scanners → pilih printer → *Printer properties* → tab
   **Sharing** → centang *Share this printer*, beri nama pendek, mis. `ADC-Perawat`.
   Pastikan PC itu di profil jaringan **Private** dan *Network discovery* + *File and printer
   sharing* aktif (Settings → Network → Advanced sharing settings).
3. **Setiap PC dokter**: Printers & scanners → *Add device* → *Add manually* →
   *Select a shared printer by name* → `\\NAMA-PC-PERAWAT\ADC-Perawat` → Next.
   Bila diminta kredensial, pakai akun Windows PC perawat (atau aktifkan *Turn off
   password protected sharing* di PC perawat).
4. **Tablet** tidak bisa memakai printer bagi-pakai Windows. Untuk tablet, cetakan dilakukan
   dari PC perawat: buka RM yang sama di PC perawat → cetak. Dalam praktik tablet jarang
   perlu mencetak (Form 1 ditandatangani di layar).
5. PC perawat harus **menyala** agar PC dokter bisa mencetak.

**Pengaturan browser di PC dokter (sekali)**

- Chrome/Edge: Settings → Privacy and security → Site settings → **Pop-ups and redirects**
  → *Allowed to send pop-ups* → *Add* → alamat hub (mis. `http://192.168.1.10:3777`).
  Tanpa ini lembar consent / lembar program tidak terbuka dan form menampilkan
  "Pop-up masih diblokir browser".
- Dialog cetak: *Destination* = printer meja perawat, kertas A4, *Margins* default,
  centang *Background graphics* supaya pita judul dan kotak tanda tangan ikut tercetak.
- **Simpan PDF**: pilih *Save as PDF* / *Microsoft Print to PDF* di dialog yang sama — untuk
  melampirkan lembar ke NeoSoft tanpa kertas.

**Lembar yang dicetak & siapa yang mencetak**

| Lembar | Dari | Siapa |
|---|---|---|
| Lembar pasien (rencana program, resep, jadwal) | Form 2 → Lainnya → Cetak | Dokter (PC ruang) atau perawat setelah Terbitkan |
| Lembar informed consent (ditandatangani di kertas) | Form 2 langkah 5 → *Lembar consent* (jendela baru) | Dokter, sebelum tindakan |
| Lembar program (Acne/Melasma/Hair) | Di dalam form program → *Cetak program ini* | Dokter, bila perlu |
| Ringkasan untuk pasien / tren IGA | Journey & Outcome Tracker → Cetak | CS / dokter |
| Form 1 registrasi | Form 1 → Cetak | Perawat, hanya bila klinik ingin arsip kertas |

## 9. Yang dicatat selama uji coba (untuk evaluasi)

Satu lembar per hari di meja registrasi:

- Berapa pasien baru lewat Form 1, berapa kontrol lewat Muat Handoff.
- Durasi Form 1 (pasien) dan Form 2 (dokter) — cukup perkiraan menit.
- Di langkah mana staf ragu / salah tekan; istilah yang membingungkan.
- Tiap kali chip HUB tidak hijau: jam, tablet, apa yang terjadi.
- Cetakan: apakah lembar pasien & consent langsung dipakai, atau masih ada yang ditulis tangan.
- Permintaan perubahan dari dokter (urutan isian, pilihan yang kurang, resep yang tidak ada di daftar).

Catatan ini yang menentukan perubahan versi berikutnya.
